# Arweave Gateway Resolution & the AR.IO Wayfinder

## Overview

The playlist-data-engine loads ML models, playlist metadata, artwork, and WASM modules from the Arweave permaweb. Since any single gateway can be slow, down, or return errors, the engine uses a custom **`ArweaveGatewayManager`** combined with **@ar.io/wayfinder-core** (v1.9.1) to provide resilient, multi-tier gateway routing.

Playlists, ML models, audio, and images are all stored on Arweave. Every Arweave URL that the engine encounters passes through this resolution pipeline.

---

## Architecture

```
resolveUrl(arweaveUrl)
│
├─ 0. Cache hit? ─────────────────────────────────── return immediately
│
├─ 1. arweave.net (official gateway — highest priority)
│
├─ 2. Persisted gateway (from localStorage, if different from arweave.net)
│
├─ 3. AR.IO Wayfinder (wider pool via composite routing)
│      ├─ FastestPingRoutingStrategy (top 10 by operator stake, 3s timeout)
│      └─ RandomRoutingStrategy (top 20 by operator stake, fallback)
│
└─ 4. Static fallback gateways (ar.io, ardrive.net, turbo-gateway.com)
    └─ Filtered by health data (>70% failure rate skipped after 3+ checks)
```

Resolution is **sequential between tiers** but **parallel within the fallback tier** — each tier is tried in order, and within the static fallback tier (step 4), all gateways are checked in parallel via `Promise.any()`. The first gateway that passes a real HEAD check wins; remaining in-flight checks are aborted. Non-Arweave URLs pass through unchanged.

If the URL returned by `resolveUrl()` actually fails during data transfer, call [`reportGatewayFailure()`](#reportgatewayfailureurl-options) to trigger a fresh resolution that **excludes the failed gateway**:

```
reportGatewayFailure() retry order:
1. arweave.net (if not the failed host)
2. Wayfinder
3. Remaining fallback gateways (excluding the failed host)
```

---

## The Resolution Pipeline

When [`resolveUrl()`](#resolveurlurl-signal) is called with an Arweave URL, the manager follows this fallback chain:

```
0. Cache lookup (per-txId, 2-hour TTL) — return immediately if hit
1. arweave.net (official gateway — highest priority static)
2. Persisted gateway from localStorage (if different from arweave.net)
3. AR.IO Wayfinder (dynamic routing via NetworkGatewaysProvider)
4. Remaining static fallback gateways (ar.io → ardrive.net → turbo-gateway.com)
```

Each step runs a real `HEAD` request to verify the gateway can serve the specific transaction before returning it. If the signal is already aborted when called, the method returns immediately without doing any work.

**Request deduplication**: If multiple callers request the same uncached `txId` concurrently, only one runs the full fallback chain — others share its result via an in-flight promise map. The promise is cleaned up once it resolves or rejects.

---

## AR.IO Wayfinder Integration

### What Wayfinder Is

AR.IO Wayfinder is a dynamic gateway routing system for Arweave. Instead of relying on a hardcoded list of gateways, it selects the best gateway from a network of community-operated Arweave gateways ranked by operator stake.

The engine uses `@ar.io/wayfinder-core` (v1.9.1+) and `@ar.io/sdk` as peer dependencies. Both are **externalized** in the Vite build — they are not bundled into the library and must be provided by the consuming application.

### Lazy Dynamic Import

Wayfinder and the AR.IO SDK are loaded asynchronously via separate dynamic `import()` calls to avoid pulling Node.js `crypto` polyfills into the main bundle:

```typescript
// src/utils/arweaveGatewayManager.ts:38-49
async function loadWayfinder(): Promise<typeof import('@ar.io/wayfinder-core') | null> {
    try {
        return await import('@ar.io/wayfinder-core');
    } catch {
        return null;
    }
}

async function loadArioSdk(): Promise<typeof import('@ar.io/sdk') | null> {
    try {
        return await import('@ar.io/sdk');
    } catch {
        return null;
    }
}
```

If either package fails to load (missing dependency, browser environment without support, etc.), the manager degrades gracefully — static gateway fallback continues to work.

### Three Initialization Tiers

Both packages must load successfully for the full composite routing strategy. The manager handles three initialization tiers:

1. **Full mode**: Both `@ar.io/wayfinder-core` and `@ar.io/sdk` available → custom CompositeRoutingStrategy (FastestPing + Random)
2. **Basic mode**: Only `@ar.io/wayfinder-core` available → default Wayfinder routing (no custom strategy)
3. **Offline mode**: Neither available → static gateways only

### Composite Routing Strategy

When both packages load, the Wayfinder client is initialized with a two-layer routing strategy in [arweaveGatewayManager.ts:304-348](../../src/utils/arweaveGatewayManager.ts#L304-L348):

```typescript
const primaryProvider = new NetworkGatewaysProvider({
    ario: ARIO.mainnet(),
    sortBy: 'operatorStake',
    limit: 10,
});

const fallbackProvider = new NetworkGatewaysProvider({
    ario: ARIO.mainnet(),
    sortBy: 'operatorStake',
    limit: 20,
});

this.wayfinder = wfMod.createWayfinderClient({
    routingStrategy: new CompositeRoutingStrategy({
        strategies: [
            new FastestPingRoutingStrategy({ timeoutMs: 3000, gatewaysProvider: primaryProvider }),
            new RandomRoutingStrategy({ gatewaysProvider: fallbackProvider }),
        ],
    }),
});
```

| Strategy | Gateway Pool | Timeout | Purpose |
|----------|-------------|---------|---------|
| `FastestPingRoutingStrategy` | Top 10 by operator stake | 3000ms | Primary: ping all 10, pick the fastest |
| `RandomRoutingStrategy` | Top 20 by operator stake | — | Fallback: if all pings fail, pick randomly from wider pool |

If either `@ar.io/sdk` is unavailable or the custom strategy throws, it falls back to `createWayfinderClient()` with no arguments (default routing).

### How Wayfinder Is Used

Wayfinder is **not the primary resolution path**. It sits between the persisted gateway and static fallbacks as a middle ground in [arweaveGatewayManager.ts:498-503](../../src/utils/arweaveGatewayManager.ts#L498-L503):

```typescript
// Step 3: Try Wayfinder as middle ground (wider pool, but slower)
if (this.wayfinder) {
    this.logger.debug('Primary gateways failed, trying Wayfinder', { txId });
    const wayfinderResult = await this.tryWayfinder(url, txId, pathSuffix, signal);
    if (wayfinderResult) return wayfinderResult;
}
```

The [`tryWayfinder()`](../../src/utils/arweaveGatewayManager.ts#L683-L728) method:

1. Calls `this.wayfinder.resolveUrl({ originalUrl: url })` with a **7-second timeout** (`this.timeout + 2000`)
2. Extracts the hostname and protocol from the resolved URL
3. Wraps it into a `GatewayConfig` and **verifies it with a real HEAD check**
4. If the HEAD check passes, sets it as the active gateway and caches it
5. If the HEAD check fails or Wayfinder throws, returns `null` and falls through to static gateways

Key design choice: Wayfinder-selected gateways are **not trusted blindly**. Even though Wayfinder has its own health checks, the engine still verifies the gateway can actually serve the specific transaction. This prevents false positives where Wayfinder returns a gateway that works for the network but doesn't have the specific file.

---

## Custom Extensions (Beyond Stock Wayfinder)

### Persisted Gateway State

The active gateway is persisted to `localStorage` under the key `arweave_active_gateway` with a **30-minute TTL**. On the next session or page load, the persisted gateway is restored and tried before Wayfinder and fallback gateways. If it's expired or fails, it's cleared immediately.

This is a custom addition — Wayfinder itself has no persistence. It means the engine remembers which gateway was working across sessions, avoiding the latency of Wayfinder's ping-based routing on every startup.

### Slow Gateway Detection & Tracking

The engine tracks real fetch timing (not just HEAD checks) to detect degrading gateways *before* they fail completely:

- **[`reportFetchSuccess(timingMs)`](#reportfetchsuccesstimingms)**: Call after a successful fetch. If the timing exceeds `slowResponseThreshold` (default: 8000ms), a `consecutiveSlowResponses` counter increments. Fast responses reset it.
- **[`reportFetchTiming(host, timingMs, success)`](#reportfetchtiminghost-timingms-success)**: Lower-level method that records timing data for any gateway (not just the active one), feeding into health tracking.

When `consecutiveSlowResponses` reaches `maxSlowResponses` (default: 3), the **next** `resolveUrl()` call proactively rotates away from the active gateway: it clears the active gateway, the persisted gateway, and the per-txId cache, then re-runs the full fallback chain to find a faster gateway.

### Health-Aware Fallback Filtering

When trying fallback gateways (step 4), the engine filters out gateways with a **>70% failure rate** (and at least 3 recorded checks). This prevents repeatedly trying known-dead gateways. If all gateways would be filtered, it uses the unfiltered list instead (graceful degradation).

This is a custom health tracking system built on top of `ResponseTimeRecord[]` — not a Wayfinder feature. It tracks per gateway:
- Success/failure counts
- Average response times
- Last success/failure timestamps
- Success rate (healthy = >= 50%)

### AbortSignal Propagation

Every resolution path supports `AbortSignal` for cancellation:
- `resolveUrl(url, signal?)` — cancel in-flight gateway checks
- `reportGatewayFailure(url, { signal? })` — cancel retry resolution

If the signal is already aborted when called, the method returns the original URL immediately without doing any work.

### Failure Reason Differentiation

[`reportGatewayFailure()`](#reportgatewayfailureurl-options) accepts a `reason` parameter to distinguish failure types:

| Reason | Behavior |
|--------|----------|
| `'load-error'` | Gateway failed — clear active gateway, find new one |
| `'user-cancel-slow'` | User cancelled after waiting — gateway is suspect, rotate |
| `'user-cancel-fast'` | User cancelled quickly — gateway is probably fine, **keep it** |
| _(omitted)_ | Same as `'load-error'` |

The `excludeHost` option lets callers skip a specific gateway during retry without affecting the active gateway state.

### Gateway Prefetching

[`prefetchUrls(urls, options?)`](#prefetchurlsurls-options) resolves multiple Arweave URLs in parallel with configurable concurrency (default: 5). Useful for warming the cache at startup with known model URLs or playlist images.

---

## Public API

### Exports

Everything is exported from `'playlist-data-engine'`:

| Export | Type | Description |
|--------|------|-------------|
| `arweaveGatewayManager` | `ArweaveGatewayManager` | Pre-configured singleton instance |
| `ArweaveGatewayManager` | Class | Create custom instances |
| `GatewayConfig` | Interface | `{ host, protocol, priority }` |
| `ArweaveGatewayManagerConfig` | Interface | Constructor options |
| `GatewayCache` | Interface | Cache entry shape |
| `GatewayCheckResult` | Interface | Resolution result with gateway info |
| `PrefetchOptions` | Interface | Prefetch concurrency/behavior |
| `PrefetchResult` | Interface | Prefetch outcome summary |
| `PrefetchResultEntry` | Interface | Per-URL prefetch result |
| `CacheStats` | Interface | Cache statistics |
| `GatewayHealthStats` | Interface | Per-gateway health data |
| `HealthCheckResult` | Interface | Health check outcome |
| `HealthCheckOptions` | Interface | Health check configuration |
| `isArweaveUrl` | Function | Check if a URL is an Arweave transaction |
| `parseArweaveUrl` | Function | Extract txId and pathSuffix |
| `constructGatewayUrl` | Function | Build gateway URL from components |
| `getAllGatewayUrls` | Function | Get all gateway URLs for a txId in priority order |
| `DEFAULT_GATEWAYS` | `GatewayConfig[]` | Default gateway list |
| `KNOWN_GATEWAY_HOSTS` | `string[]` | Known gateway hostnames |
| `ArweaveUrlInfo` | Type | Return type of `parseArweaveUrl()` |

### Constructor: `ArweaveGatewayManagerConfig`

```typescript
import { ArweaveGatewayManager } from 'playlist-data-engine';

const manager = new ArweaveGatewayManager({
    gateways: [
        { host: 'arweave.net', protocol: 'https', priority: 1 },
        { host: 'ardrive.net', protocol: 'https', priority: 2 },
    ],
    timeout: 5000,
    cacheTTL: 7200000,
    slowResponseThreshold: 8000,
    maxSlowResponses: 3,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gateways` | `GatewayConfig[]` | 4 defaults | Custom gateway list (deep-cloned, sorted by priority) |
| `timeout` | `number` | `5000` | Per-gateway HEAD check timeout (ms) |
| `cacheTTL` | `number` | `7200000` | Per-txId cache TTL (2 hours) |
| `slowResponseThreshold` | `number` | `8000` | Threshold above which a fetch is "slow" (ms) |
| `maxSlowResponses` | `number` | `3` | Consecutive slow fetches before proactive gateway rotation |

### Methods

#### `resolveUrl(url, signal?)`

Main entry point. Resolves an Arweave URL to a working gateway URL using the 4-tier sequential fallback system. Non-Arweave URLs pass through unchanged.

```typescript
const workingUrl = await arweaveGatewayManager.resolveUrl(
    'https://arweave.net/abc123.../model.json',
    abortController.signal
);
// → 'https://ar-io.net/abc123.../model.json' (or whatever gateway is working)
```

#### `reportGatewayFailure(url, options?)`

Reports that a real data fetch failed on the gateway that was returned by `resolveUrl()`. Clears the active gateway, persists the clearing to localStorage, and resolves a new gateway.

```typescript
const start = performance.now();
try {
    const response = await fetch(workingUrl, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
} catch (err) {
    const elapsed = performance.now() - start;
    const reason = err.name === 'AbortError'
        ? (elapsed < 5000 ? 'user-cancel-fast' : 'user-cancel-slow')
        : 'load-error';
    newUrl = await arweaveGatewayManager.reportGatewayFailure(workingUrl, {
        signal: abortController.signal,
        reason,
    });
}
```

#### `reportFetchSuccess(timingMs)`

Feeds timing data back from a successful fetch. If the fetch was above `slowResponseThreshold`, the consecutive slow counter increments. If fast, the counter resets.

```typescript
const start = performance.now();
const response = await fetch(workingUrl);
arweaveGatewayManager.reportFetchSuccess(performance.now() - start);
```

#### `reportFetchTiming(host, timingMs, success)`

Records real data-transfer timing for a specific gateway host. This feeds into the health tracking system and affects priority adjustment and health-aware filtering.

```typescript
arweaveGatewayManager.reportFetchTiming('ar-io.net', 1250, true);
```

#### `prefetchUrls(urls, options?)`

Warms up the gateway cache by resolving multiple URLs in parallel.

```typescript
const result = await arweaveGatewayManager.prefetchUrls([
    'https://arweave.net/abc.../model.json',
    'https://arweave.net/def.../model.json',
], {
    concurrency: 5,
    continueOnError: true,
});
// result.succeeded, result.failed, result.skipped, result.entries
```

#### `getCacheStats()` / `clearCache()` / `getCachedGateway(txId)` / `setCache(txId, gateway)`

Cache management. `getCacheStats()` returns size, hit/miss counts, and cached txIds.

#### `getGatewayHealth(host)` / `getAllGatewayHealth()`

Returns health statistics for one or all gateways based on recorded HEAD-check and fetch timing data.

#### `adjustGatewayPriorities(options?)` / `resetGatewayPriorities()`

Reorders gateways by health data (healthy first, then by speed) or resets to original configured priorities.

#### `runHealthCheck(options?)`

Runs a parallel HEAD check against all static gateways using a known transaction ID. Optionally adjusts gateway priorities based on results.

#### `checkGateway(txId, gateway, pathSuffix?, signal?)`

Verifies a single gateway can serve a transaction. Returns `true`/`false`.

---

## Internal Consumers

These engine components use the gateway manager automatically — no configuration needed:

| Component | What It Resolves | How |
|-----------|-----------------|-----|
| `PlaylistParser` | Playlist image URLs (`image_url`, `image_thumb_url`) | `arweaveGatewayManager.resolveUrl()` when `resolveImageUrls: true` |
| `MusicClassifier` | TensorFlow model URLs | `arweaveGatewayManager.resolveUrl` as default `resolveUrl` option |
| `EssentiaPitchDetector` | CREPE model URLs | `arweaveGatewayManager.resolveUrl` as default `resolveUrl` option |
| `PitchAnalyzer` | CREPE model URLs | `arweaveGatewayManager.resolveUrl` as default `resolveUrl` option |
| `ColorExtractor` | Track artwork image URLs | `arweaveGatewayManager.resolveUrl` directly |

Each component also accepts an optional `resolveUrl` callback override if a consumer wants to provide custom resolution logic.

---

## Caching Layers

The manager uses three separate caching mechanisms:

1. **Per-txId in-memory cache** — Maps a 43-character transaction ID to a working `GatewayConfig`. TTL is configurable (default 2 hours). Checked first on every `resolveUrl()` call.
2. **Active gateway persistence (localStorage)** — The single active gateway is persisted under key `arweave_active_gateway` with a 30-minute TTL. On page reload, the manager restores this gateway and tries it before falling back.
3. **Wayfinder internal caching** — The `NetworkGatewaysProvider` caches the AR.IO gateway list internally. The `FastestPingRoutingStrategy` caches ping results. These are managed by the wayfinder library itself.

---

## Default Static Gateways

| Priority | Host | Protocol |
|----------|------|----------|
| 1 | `arweave.net` | https |
| 2 | `ar.io` | https |
| 3 | `ardrive.net` | https |
| 4 | `turbo-gateway.com` | https |

These are tried in priority order. `arweave.net` is always tried first (the official gateway). Wayfinder sits between the persisted gateway and the remaining fallbacks.

---

## Peer Dependencies

The gateway manager requires `@ar.io/wayfinder-core` and `@ar.io/sdk` for Wayfinder functionality. Both are listed as dependencies in `package.json` and externalized in the [vite.config.ts](../../vite.config.ts) rollup config:

```typescript
// vite.config.ts:19-20
external: [
    // ...
    '@ar.io/wayfinder-core',
    '@ar.io/sdk',
],
```

The engine degrades gracefully if these packages are not available — static gateway fallback continues to work.

---

## Architecture Decisions

**Why Wayfinder isn't the primary path** — Wayfinder requires pinging multiple gateways (up to 10), which takes 1-3 seconds. The engine tries `arweave.net` and any persisted gateway first because they're instant (single HEAD check, or cached hit). Wayfinder is only consulted when faster options fail.

**Why Wayfinder results are verified** — Wayfinder's `resolveUrl()` returns a gateway that should work, but it can't guarantee the specific transaction is available on that gateway. The engine runs its own HEAD check against the resolved gateway to confirm the file exists before returning it. This prevents false positives.

**Why dynamic imports** — `@ar.io/wayfinder-core` depends on Node.js `crypto` APIs. In browser environments, bundling it directly would require polyfills. The dynamic `import()` means it's loaded separately at runtime — if it fails, the manager falls back to static gateways.

**Why localStorage persistence** — Without persistence, every page load would start from scratch: try arweave.net, fail, try Wayfinder (slow), etc. By remembering the last working gateway, subsequent page loads skip directly to a known-good gateway.

**Why sequential fallback, not parallel** — Each step in the pipeline has different cost. A cache hit is free, arweave.net is usually fast, and Wayfinder is slow (1-3s of pinging). Running all in parallel would waste bandwidth and hit rate limits on gateways that will never be needed. Sequential fallback stops at the first success.

**Why real HEAD checks, not pings** — The manager verifies each gateway can serve the *specific transaction*, not just that the gateway is up. A gateway that is healthy but doesn't have the data is correctly identified and skipped.

---

## Source Files

| File | Purpose |
|------|---------|
| [src/utils/arweaveGatewayManager.ts](../../src/utils/arweaveGatewayManager.ts) | Gateway manager class with Wayfinder integration |
| [src/utils/arweaveUtils.ts](../../src/utils/arweaveUtils.ts) | `GatewayConfig` interface, URL parsing, `DEFAULT_GATEWAYS`, utility functions |
| [src/index.ts](../../src/index.ts) | Public API exports |
| [vite.config.ts](../../vite.config.ts) | Externalizes `@ar.io/wayfinder-core` and `@ar.io/sdk` from bundle |
| [tests/unit/arweaveGatewayManager.test.ts](../../tests/unit/arweaveGatewayManager.test.ts) | Unit tests with mocked Wayfinder |

---

## URL Utilities

The companion [arweaveUtils.ts](../../src/utils/arweaveUtils.ts) provides lower-level URL handling:

| Export | Description |
|--------|-------------|
| `isArweaveUrl(url)` | Returns `true` for `ar://` protocol URLs or URLs containing known gateway hosts |
| `parseArweaveUrl(url)` | Extracts txId and path suffix from `ar://` and `https://` Arweave URLs |
| `constructGatewayUrl(txId, gateway, pathSuffix?)` | Builds a gateway URL from components |
| `getAllGatewayUrls(txId, gateways?, pathSuffix?)` | Returns all gateway URLs for a txId in priority order |
| `DEFAULT_GATEWAYS` | The four default gateway configs |
| `KNOWN_GATEWAY_HOSTS` | Array of known gateway hostnames |

---

## Known Shortcomings & Future Improvements

These are issues and improvement opportunities identified in the current implementation. None are bugs — the system works correctly as-is — but each represents an area where the implementation could be improved in a future iteration.

### Hardcoded Health Filtering Thresholds

The health filtering thresholds `HEALTHY_FAILURE_THRESHOLD` (0.70) and `MIN_CHECKS_FOR_FILTER` (3) are magic numbers inside `tryFallbackGateways()` ([arweaveGatewayManager.ts:650-651](../../src/utils/arweaveGatewayManager.ts#L650-L651)). These are not exposed in the constructor config. Making them configurable would allow consumers to tune the trade-off between resilience and gateway pool size.

### No Circuit Breaker Pattern

There is no mechanism to fully disable a failing gateway for a cooldown period. The health-aware filtering helps avoid known-dead gateways, but it only activates after 3+ checks and doesn't implement a time-based cooldown. A proper circuit breaker (e.g., open for 60s after N failures) would prevent repeatedly hitting a gateway that's temporarily down.

### Tight Coupling to Browser APIs

`localStorage` is accessed directly in `persistGateway()` and `loadPersistedGateway()`. This prevents the manager from being used in non-browser environments (Node.js, workers) without modification. Dependency injection for the persistence layer would improve testability and portability.

### Unbounded Health Data Per Gateway

`MAX_HEALTH_RECORDS` caps at 50 records per gateway, but there is no bound on the number of unique gateways that can accumulate health data. If `reportFetchTiming()` is called for arbitrary hosts (e.g., Wayfinder-returned gateways), the `healthData` map grows without bound over a long session.
