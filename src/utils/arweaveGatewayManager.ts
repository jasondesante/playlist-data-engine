/**
 * Arweave Gateway Manager
 *
 * Manages gateway fallback for Arweave URLs. When a file fails to load on one gateway,
 * automatically tries alternate gateways. Uses in-memory caching to remember working
 * gateways for each transaction ID.
 *
 * Design decisions:
 * - Parallel gateway checking (race all gateways + Wayfinder, first to respond wins)
 * - localStorage persistence for active gateway across sessions
 * - 5 second timeout per gateway check
 * - 2 hour cache TTL
 * - Active gateway is reused without HEAD checks; only real fetch failures trigger fallback
 *
 * @module utils/arweaveGatewayManager
 */

import type { GatewayConfig } from './arweaveUtils.js';
import {
    DEFAULT_GATEWAYS,
    isArweaveUrl,
    parseArweaveUrl,
    constructGatewayUrl,
} from './arweaveUtils.js';
import { Logger } from './logger.js';

/**
 * Dynamically import Wayfinder to avoid bundling Node.js `crypto` polyfills
 * into the main build. Only used by resolveUrlWayfinder().
 */
type Wayfinder = Awaited<ReturnType<typeof import('@ar.io/wayfinder-core')['createWayfinderClient']>> & { resolveUrl: (opts: { originalUrl: string }) => Promise<{ hostname: string; protocol: string }> };

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

/**
 * Options for resolveUrl()
 */
export interface ResolveUrlOptions {
    /** Optional AbortSignal to cancel in-flight gateway checks */
    signal?: AbortSignal;
    /** Skip arweave.net in the resolution chain — go persisted → fallbacks → Wayfinder */
    bypassArweaveNet?: boolean;
    /** Skip Wayfinder in the resolution chain — only use static gateways */
    bypassWayfinder?: boolean;
}

/**
 * Configuration for the gateway cache entry
 */
export interface GatewayCache {
    /** The 43-character Arweave transaction ID */
    txId: string;
    /** The gateway that was found to work for this txId */
    workingGateway: GatewayConfig;
    /** Timestamp when this cache entry was created (ms since epoch) */
    timestamp: number;
    /** Time-to-live in milliseconds */
    ttl: number;
}

/**
 * Result of a gateway URL resolution
 */
export interface GatewayCheckResult {
    /** The working URL that can be used to fetch the resource */
    workingUrl: string;
    /** The gateway that provided the working URL */
    gateway: GatewayConfig;
    /** Whether this result came from cache */
    cached: boolean;
}

/**
 * Configuration options for ArweaveGatewayManager
 */
export interface ArweaveGatewayManagerConfig {
    /** List of gateways to try in priority order */
    gateways?: GatewayConfig[];
    /** Timeout for each gateway check in milliseconds (default: 5000) */
    timeout?: number;
    /** Cache TTL in milliseconds (default: 7200000 = 2 hours) */
    cacheTTL?: number;
    /** Threshold in ms above which a fetch is considered "slow" (default: 8000) */
    slowResponseThreshold?: number;
    /** Number of consecutive slow responses before proactive gateway rotation (default: 3) */
    maxSlowResponses?: number;
    /**
     * Solana RPC URL used by the ar.io SDK to fetch the gateway registry for Wayfinder.
     * Defaults to `https://solana-rpc.publicnode.com` — a public CORS-enabled endpoint
     * that works without signup. For production / heavy use, pass a dedicated RPC
     * (Helius, QuickNode, Triton, Alchemy, etc.) to avoid rate limits.
     *
     * Note: `https://api.mainnet-beta.solana.com` does NOT work in browsers — it returns
     * 403 on browser-origin requests.
     */
    solanaRpcUrl?: string;
    /**
     * How AR.IO ranks gateways before building the Wayfinder candidate pool.
     * Defaults to `'weights.compositeWeight'` — AR.IO's protocol-level composite of
     * performance, tenure, stake, and observer behavior. See the `sortBy` table in
     * docs/features/GATEWAY_RESOLUTION.md for the full list of options.
     */
    wayfinderSortBy?: WayfinderSortBy;
    /**
     * Number of top-ranked gateways in the primary pool (used by `FastestPingRoutingStrategy`).
     * All N are pinged in parallel within the 3s timeout; the fastest wins. Default: 50.
     * Keep small enough that ping rounds stay responsive.
     */
    wayfinderPrimaryLimit?: number;
    /**
     * Number of top-ranked gateways in the fallback pool (used by `RandomRoutingStrategy`).
     * One is picked uniformly at random without pinging, so wider pools cost nothing and
     * add variety across sessions. Default: 100.
     */
    wayfinderFallbackLimit?: number;
    /**
     * Wayfinder routing strategy preset.
     *
     * - `'composite-ping-random'` (default): try `FastestPing` over the primary pool,
     *   fall back to `Random` over the fallback pool. Best balance of speed + resilience.
     * - `'random-only'`: pick uniformly at random from the fallback pool. Spreads load,
     *   maximizes variety across sessions, no ping overhead.
     * - `'ping-only'`: ping all of the primary pool, pick fastest. No random fallback —
     *   if all pings fail, Wayfinder returns nothing and the static fallback chain takes over.
     * - `'round-robin'`: cycle through the primary pool in order. Predictable distribution,
     *   no health awareness.
     */
    wayfinderStrategy?: WayfinderStrategy;
}

/**
 * Valid `sortBy` values accepted by `NetworkGatewaysProvider` for ranking gateways.
 * See docs/features/GATEWAY_RESOLUTION.md for guidance on which to pick.
 */
export type WayfinderSortBy =
    | 'weights.compositeWeight'
    | 'weights.normalizedCompositeWeight'
    | 'weights.gatewayPerformanceRatio'
    | 'weights.tenureWeight'
    | 'weights.stakeWeight'
    | 'stats.passedConsecutiveEpochs'
    | 'totalDelegatedStake'
    | 'startTimestamp'
    | 'operatorStake';

/**
 * Routing strategy presets for Wayfinder. Maps to combinations of `@ar.io/wayfinder-core`
 * strategy classes — exposed as presets (not raw strategy objects) so consumers don't
 * have to import the SDK themselves.
 */
export type WayfinderStrategy =
    | 'composite-ping-random'
    | 'random-only'
    | 'ping-only'
    | 'round-robin';

/**
 * Default Solana RPC URL used by the ar.io SDK to read the gateway registry.
 * Public, CORS-enabled, no signup required. Rate-limited — override via
 * `solanaRpcUrl` config option for production.
 */
const DEFAULT_SOLANA_RPC_URL = 'https://solana-rpc.publicnode.com';

/**
 * Options for prefetching URLs
 */
export interface PrefetchOptions {
    /** Maximum number of concurrent gateway checks (default: 5) */
    concurrency?: number;
    /** Whether to continue on errors (default: true) */
    continueOnError?: boolean;
}

/**
 * Result of prefetching a single URL
 */
export interface PrefetchResultEntry {
    /** The original URL that was prefetched */
    url: string;
    /** The transaction ID extracted from the URL */
    txId: string;
    /** Whether the prefetch succeeded */
    success: boolean;
    /** The working gateway (if successful) */
    gateway?: GatewayConfig;
    /** Error message (if failed) */
    error?: string;
}

/**
 * Result of prefetching multiple URLs
 */
export interface PrefetchResult {
    /** Total number of URLs processed */
    total: number;
    /** Number of successful prefetches */
    succeeded: number;
    /** Number of failed prefetches */
    failed: number;
    /** Number of URLs skipped (not Arweave URLs) */
    skipped: number;
    /** Detailed results for each URL */
    entries: PrefetchResultEntry[];
}

/**
 * Statistics about the gateway cache
 */
export interface CacheStats {
    /** Number of entries in the cache */
    size: number;
    /** List of cached transaction IDs */
    txIds: string[];
    /** Cache hit count (since last clear) */
    hitCount: number;
    /** Cache miss count (since last clear) */
    missCount: number;
    /** Cache TTL in milliseconds */
    ttl: number;
}

/**
 * Health statistics for a single gateway
 */
export interface GatewayHealthStats {
    /** Gateway hostname */
    host: string;
    /** Current priority (lower = higher priority) */
    priority: number;
    /** Original priority from configuration */
    originalPriority: number;
    /** Number of successful checks */
    successCount: number;
    /** Number of failed checks */
    failureCount: number;
    /** Total number of checks */
    totalChecks: number;
    /** Success rate (0-1) */
    successRate: number;
    /** Average response time in milliseconds */
    averageResponseTime: number;
    /** Last successful check timestamp (ms since epoch) */
    lastSuccess: number | null;
    /** Last failure timestamp (ms since epoch) */
    lastFailure: number | null;
    /** Whether the gateway is currently considered healthy */
    isHealthy: boolean;
}

/**
 * Result of running a health check on all gateways
 */
export interface HealthCheckResult {
    /** Timestamp when the health check was performed */
    timestamp: number;
    /** Health stats for each gateway */
    gateways: GatewayHealthStats[];
    /** List of healthy gateway hosts */
    healthyGateways: string[];
    /** List of unhealthy gateway hosts */
    unhealthyGateways: string[];
    /** Gateway with the best response time (if any) */
    fastestGateway: string | null;
    /** Total time taken for the health check in ms */
    totalTime: number;
}

/**
 * Options for running a health check
 */
export interface HealthCheckOptions {
    /** Transaction ID to use for health check (default: a well-known stable txId) */
    txId?: string;
    /** Whether to adjust priorities based on results (default: false) */
    adjustPriorities?: boolean;
    /** Minimum number of checks before considering adjusting priorities (default: 3) */
    minChecksForAdjustment?: number;
    /** Threshold for considering a gateway healthy (success rate, default: 0.5) */
    healthyThreshold?: number;
    /** Maximum response time to consider a gateway "fast" in ms (default: 2000) */
    fastThreshold?: number;
}

/**
 * Diagnostic snapshot of the gateway manager's current state
 */
export interface GatewayDiagnostics {
    /** Currently active gateway host, or null */
    activeGateway: string | null;
    /** Milliseconds since the active gateway was set, or null */
    activeGatewayAge: number | null;
    /** Available gateway hosts in priority order */
    availableGateways: string[];
    /** Timing of the most recent real fetch (ms) */
    lastFetchTiming: number;
    /** Number of consecutive slow responses from the active gateway */
    consecutiveSlowResponses: number;
    /** Per-gateway health summary */
    healthSummary: { host: string; avgMs: number; successRate: number; checks: number }[];
}

/**
 * Response time record for tracking gateway performance
 */
interface ResponseTimeRecord {
    /** Response time in milliseconds */
    responseTime: number;
    /** Whether the check was successful */
    success: boolean;
    /** Timestamp of the check */
    timestamp: number;
}

/**
 * Default timeout for gateway checks (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Default cache TTL (24 hours)
 */
const DEFAULT_CACHE_TTL = 86400000;

/**
 * localStorage key for persisting the active gateway across sessions
 */
const ACTIVE_GATEWAY_STORAGE_KEY = 'arweave_active_gateway';

/**
 * ArweaveGatewayManager class
 *
 * Manages gateway fallback for Arweave URLs with caching support.
 *
 * @example
 * ```ts
 * import { arweaveGatewayManager } from 'playlist-data-engine';
 *
 * // Resolve an Arweave URL to a working gateway
 * const workingUrl = await arweaveGatewayManager.resolveUrl('https://arweave.net/abc123...');
 * // Returns working URL from first responding gateway
 * ```
 */
export class ArweaveGatewayManager {
    private gateways: GatewayConfig[];
    private timeout: number;
    private cacheTTL: number;
    private cache: Map<string, GatewayCache> = new Map();
    private logger = Logger.for('ArweaveGateway');
    /** Cache hit counter for statistics */
    private hitCount: number = 0;
    /** Cache miss counter for statistics */
    private missCount: number = 0;
    /** Health tracking data for each gateway (keyed by host) */
    private healthData: Map<string, ResponseTimeRecord[]> = new Map();
    /** Original gateway priorities (for potential reset) */
    private originalPriorities: Map<string, number> = new Map();
    /** Maximum number of response time records to keep per gateway */
    private readonly MAX_HEALTH_RECORDS = 50;
    /** In-flight resolveUrl requests keyed by txId, for request deduplication */
    private inflightResolves: Map<string, Promise<string>> = new Map();
    /** AbortControllers for in-flight resolves, so stale chains can be cancelled */
    private inflightControllers: Map<string, AbortController> = new Map();
    /** AR.IO Wayfinder client for dynamic routing */
    private wayfinder: Wayfinder | null = null;
    /**
     * Reference to the primary gateways provider so we can fetch the ranked list
     * directly after Wayfinder's first pick fails — lets us walk the list instead
     * of re-running the full ping race for each retry.
     */
    private wayfinderGatewaysProvider: { getGateways(): Promise<URL[]> } | null = null;
    /**
     * In-memory cache of the ranked gateway list from the provider. Avoids hitting
     * the Solana RPC every time we need to walk gateways. Refreshed when stale.
     */
    private rankedGatewaysCache: URL[] | null = null;
    /** Timestamp (ms since epoch) when the ranked gateway list was last refreshed. */
    private rankedGatewaysCacheTimestamp: number = 0;
    /** TTL for the ranked gateway list cache (30 minutes). */
    private readonly RANKED_GATEWAYS_TTL_MS = 30 * 60 * 1000;
    /** The currently active dynamic gateway. Used globally to prevent constant switching. */
    private activeGateway: GatewayConfig | null = null;
    /** Time of the most recent successful resolve/fetch for the active gateway (ms) */
    private lastFetchTiming: number = 0;
    /** Number of consecutive slow fetch responses from the active gateway */
    private consecutiveSlowResponses: number = 0;
    /** Threshold in ms above which a fetch is considered "slow" (default: 8000) */
    private readonly slowResponseThreshold: number;
    /** Number of consecutive slow responses before proactive gateway rotation (default: 3) */
    private readonly maxSlowResponses: number;
    /** Solana RPC URL used by ar.io SDK for the gateway registry */
    private readonly solanaRpcUrl: string;
    /** Sort field used by NetworkGatewaysProvider when ranking gateways */
    private readonly wayfinderSortBy: WayfinderSortBy;
    /** Pool size for the primary (FastestPing) provider */
    private readonly wayfinderPrimaryLimit: number;
    /** Pool size for the fallback (Random) provider */
    private readonly wayfinderFallbackLimit: number;
    /** Routing strategy preset */
    private readonly wayfinderStrategy: WayfinderStrategy;

    constructor(config?: ArweaveGatewayManagerConfig) {
        // Deep-clone gateways to avoid mutating the original config objects
        this.gateways = (config?.gateways ?? DEFAULT_GATEWAYS).map(g => ({ ...g }));
        this.timeout = config?.timeout ?? DEFAULT_TIMEOUT;
        this.cacheTTL = config?.cacheTTL ?? DEFAULT_CACHE_TTL;
        this.slowResponseThreshold = config?.slowResponseThreshold ?? 8000;
        this.maxSlowResponses = config?.maxSlowResponses ?? 3;
        this.solanaRpcUrl = config?.solanaRpcUrl ?? DEFAULT_SOLANA_RPC_URL;
        this.wayfinderSortBy = config?.wayfinderSortBy ?? 'weights.compositeWeight';
        this.wayfinderPrimaryLimit = config?.wayfinderPrimaryLimit ?? 50;
        this.wayfinderFallbackLimit = config?.wayfinderFallbackLimit ?? 100;
        this.wayfinderStrategy = config?.wayfinderStrategy ?? 'composite-ping-random';

        // Sort gateways by priority
        this.gateways.sort((a, b) => a.priority - b.priority);

        // Store original priorities
        this.gateways.forEach(g => {
            this.originalPriorities.set(g.host, g.priority);
        });

        // Restore active gateway from localStorage (persists across sessions)
        this.activeGateway = this.loadPersistedGateway();

        // Initialize Wayfinder lazily. The routing strategy and gateway pool are driven
        // by config: `wayfinderSortBy` controls how AR.IO ranks gateways, `wayfinderPrimaryLimit`
        // and `wayfinderFallbackLimit` size the candidate pools, and `wayfinderStrategy`
        // picks the routing preset. Defaults are tuned for good variety + speed.
        Promise.all([loadWayfinder(), loadArioSdk(), import('@solana/kit')]).then(([wfMod, sdkMod, solanaKit]) => {
            if (wfMod && sdkMod) {
                try {
                    const {
                        FastestPingRoutingStrategy,
                        RandomRoutingStrategy,
                        CompositeRoutingStrategy,
                        RoundRobinRoutingStrategy,
                        NetworkGatewaysProvider,
                    } = wfMod;
                    const ARIO = sdkMod.ARIO;
                    const rpc = solanaKit.createSolanaRpc(this.solanaRpcUrl);
                    const arioClient = ARIO.init({ rpc });

                    const primaryProvider = new NetworkGatewaysProvider({
                        ario: arioClient,
                        sortBy: this.wayfinderSortBy,
                        limit: this.wayfinderPrimaryLimit,
                    });

                    const fallbackProvider = new NetworkGatewaysProvider({
                        ario: arioClient,
                        sortBy: this.wayfinderSortBy,
                        limit: this.wayfinderFallbackLimit,
                    });

                    // Hold a reference so tryWayfinder() can fetch the ranked list directly
                    // and walk it on retries, instead of re-running Wayfinder's full ping race.
                    this.wayfinderGatewaysProvider = primaryProvider;

                    const routingStrategy = (() => {
                        switch (this.wayfinderStrategy) {
                            case 'random-only':
                                return new RandomRoutingStrategy({ gatewaysProvider: fallbackProvider });
                            case 'ping-only':
                                return new FastestPingRoutingStrategy({ timeoutMs: 3000, gatewaysProvider: primaryProvider });
                            case 'round-robin':
                                return new RoundRobinRoutingStrategy({ gateways: [], gatewaysProvider: primaryProvider });
                            case 'composite-ping-random':
                            default:
                                return new CompositeRoutingStrategy({
                                    strategies: [
                                        new FastestPingRoutingStrategy({ timeoutMs: 3000, gatewaysProvider: primaryProvider }),
                                        new RandomRoutingStrategy({ gatewaysProvider: fallbackProvider }),
                                    ],
                                });
                        }
                    })();

                    this.wayfinder = wfMod.createWayfinderClient({ routingStrategy }) as Wayfinder;
                    this.logger.info('Wayfinder client initialized', {
                        strategy: this.wayfinderStrategy,
                        sortBy: this.wayfinderSortBy,
                        primaryLimit: this.wayfinderPrimaryLimit,
                        fallbackLimit: this.wayfinderFallbackLimit,
                    });
                } catch (err) {
                    this.logger.warn('Failed to configure Wayfinder routing strategy, using defaults', { error: err });
                    this.wayfinder = wfMod.createWayfinderClient() as Wayfinder;
                    this.logger.info('Wayfinder client initialized with default routing');
                }
            } else if (wfMod) {
                this.wayfinder = wfMod.createWayfinderClient() as Wayfinder;
                this.logger.info('Wayfinder client initialized with default routing (SDK unavailable)');
            }
        }).catch(() => {
            this.logger.debug('Wayfinder client initialization failed, using static gateways');
        });

        this.logger.info('Gateway manager initialized', {
            gateways: this.gateways.map(g => g.host),
            timeout: this.timeout,
            cacheTTL: this.cacheTTL,
            activeGateway: this.activeGateway?.host ?? null,
        });
    }

    /**
     * Wrap a promise with a timeout to prevent hanging indefinitely.
     * Useful for third-party calls (e.g., Wayfinder) that have no built-in timeout.
     */
    private withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(message)), ms);
            promise.then(
                (value) => { clearTimeout(timer); resolve(value); },
                (error) => { clearTimeout(timer); reject(error); },
            );
        });
    }

    /**
     * Resolve an Arweave URL to a gateway URL using the active gateway, with no network checks.
     *
     * This is the fast path — it returns instantly by reusing the current active gateway
     * (or arweave.net if none is set). Use this for the hot path where latency matters.
     * When real fetches fail, call {@link reportGatewayFailure} to trigger gateway rotation.
     *
     * @param url - The URL to resolve
     * @returns A gateway URL constructed from the active gateway, or the original URL if not Arweave
     */
    resolveUrlSimple(url: string): string {
        if (!isArweaveUrl(url)) return url;
        const parsed = parseArweaveUrl(url);
        if (!parsed) return url;
        const gateway = this.activeGateway ?? this.gateways[0];
        this.logger.debug('[gateway] resolveUrlSimple', {
            txId: parsed.txId,
            gateway: gateway.host,
            pathSuffix: parsed.pathSuffix || undefined,
        });
        return constructGatewayUrl(parsed.txId, gateway, parsed.pathSuffix);
    }

    /**
     * Set a preferred gateway by host name.
     *
     * If the host is in the known gateways list, it becomes the active gateway
     * and is persisted to localStorage. Returns true on success.
     *
     * @param host - Gateway hostname (e.g. 'ardrive.net')
     * @returns True if the gateway was found and set, false otherwise
     */
    setPreferredGateway(host: string): boolean {
        const gateway = this.gateways.find(g => g.host === host);
        if (!gateway) {
            this.logger.warn('Cannot set preferred gateway — not in gateway list', {
                host,
                available: this.gateways.map(g => g.host),
            });
            return false;
        }
        this.activeGateway = gateway;
        this.lastFetchTiming = 0;
        this.consecutiveSlowResponses = 0;
        this.persistGateway(gateway);
        this.logger.info('Preferred gateway set', { host });
        return true;
    }

    /**
     * Clear the preferred/active gateway.
     *
     * Removes the active gateway, clears the persisted gateway from localStorage,
     * and clears the cache. The next resolveUrl() call will re-discover the best gateway.
     */
    clearPreferredGateway(): void {
        this.activeGateway = null;
        this.lastFetchTiming = 0;
        this.consecutiveSlowResponses = 0;
        this.clearPersistedGateway();
        this.cache.clear();
        this.logger.info('Preferred gateway cleared, will re-discover on next resolve');
    }

    /**
     * Get a diagnostic snapshot of the gateway manager's current state.
     *
     * Useful for debugging and console inspection.
     *
     * @returns Current gateway manager diagnostics
     */
    getDiagnostics(): GatewayDiagnostics {
        const healthSummary = this.gateways.map(g => {
            const records = this.healthData.get(g.host) ?? [];
            const checks = records.length;
            const avgMs = checks > 0 ? Math.round(records.reduce((s, r) => s + r.responseTime, 0) / checks) : 0;
            const successRate = checks > 0 ? records.filter(r => r.success).length / checks : 1;
            return { host: g.host, avgMs, successRate: Math.round(successRate * 100) / 100, checks };
        });

        return {
            activeGateway: this.activeGateway?.host ?? null,
            activeGatewayAge: null, // not tracked currently — could add timestamp later
            availableGateways: this.gateways.map(g => g.host),
            lastFetchTiming: this.lastFetchTiming,
            consecutiveSlowResponses: this.consecutiveSlowResponses,
            healthSummary,
        };
    }

    /**
     * Resolve an Arweave URL to a working gateway URL.
     *
     * Strategy: try static gateways first with real fetch checks (not HEAD),
     * fall back to Wayfinder only if all static gateways fail.
     *
     * @param url - The URL to resolve
     * @param options - Optional resolve options (signal, bypassArweaveNet, bypassWayfinder)
     * @returns A working URL (or original URL if all gateways fail or signal is aborted)
     */
    async resolveUrl(url: string, options?: ResolveUrlOptions): Promise<string> {
        const signal = options?.signal;

        // If already aborted, return original URL immediately
        if (signal?.aborted) {
            this.logger.debug('resolveUrl called with already-aborted signal, returning original URL');
            return url;
        }

        // Not an Arweave URL, return as-is
        if (!isArweaveUrl(url)) {
            return url;
        }

        // Parse the URL to get txId and pathSuffix
        const parsed = parseArweaveUrl(url);
        if (!parsed) {
            this.logger.warn('Failed to parse Arweave URL, returning original', { url });
            return url;
        }

        const { txId, pathSuffix } = parsed;

        // Check per-txId cache first
        const cachedGateway = this.getCachedGateway(txId);
        if (cachedGateway) {
            this.hitCount++;
            const workingUrl = constructGatewayUrl(txId, cachedGateway, pathSuffix);
            this.logger.debug('Cache hit for txId', { txId, gateway: cachedGateway.host, pathSuffix });
            return workingUrl;
        }

        // Capture before any narrowing clears it
        const activeGatewayHost = this.activeGateway?.host ?? 'none';

        // Proactive rotation: if active gateway is degrading, force a new selection
        if (this.consecutiveSlowResponses >= this.maxSlowResponses) {
            this.logger.warn('Proactive gateway rotation triggered', {
                slowCount: this.consecutiveSlowResponses,
                threshold: this.maxSlowResponses,
                previousGateway: activeGatewayHost,
            });
            this.activeGateway = null;
            this.consecutiveSlowResponses = 0;
            this.clearPersistedGateway();
            this.cache.clear();
        }

        // Deduplicate: if a resolve is already in-flight for this txId, reuse it
        // But cancel the old one first if a new external signal is provided
        const inflight = this.inflightResolves.get(txId);
        if (inflight) {
            // Reuse the in-flight resolve — don't cancel it.
            // Cancelling a working resolve just because a second caller
            // asked for the same txId causes false failures.
            this.logger.debug('Reusing in-flight resolve for txId', { txId });
            return inflight;
        }

        // Create a chain-level AbortController so the entire resolution chain
        // can be cancelled if a newer resolve supersedes this one
        const chainController = new AbortController();
        if (signal) {
            // If external signal aborts, also abort the chain
            signal.addEventListener('abort', () => chainController.abort(), { once: true });
        }

        const resolvePromise = this.resolveGatewayChain(url, txId, pathSuffix, chainController.signal, options)
            .finally(() => {
                this.inflightResolves.delete(txId);
                this.inflightControllers.delete(txId);
            });

        this.inflightResolves.set(txId, resolvePromise);
        this.inflightControllers.set(txId, chainController);
        return resolvePromise;
    }

    /**
     * The actual gateway fallback chain. Extracted from resolveUrl() for
     * request deduplication — concurrent callers for the same txId share
     * one instance of this chain.
     */
    private async resolveGatewayChain(url: string, txId: string, pathSuffix: string, signal?: AbortSignal, options?: ResolveUrlOptions): Promise<string> {
        const chainStart = Date.now();
        const bypassArweaveNet = options?.bypassArweaveNet ?? false;
        let excludeHost: string | null = null;

        // Step 0: Try the gateway already in the URL itself — if it's an HTTPS Arweave URL,
        // the gateway in the URL might just work. No sense skipping it.
        if (url.startsWith('https://') || url.startsWith('http://')) {
            try {
                const parsed = new URL(url);
                const originalGateway: GatewayConfig = {
                    host: parsed.host, // includes port if present
                    protocol: parsed.protocol.replace(':', '') as 'http' | 'https',
                    priority: 0,
                };
                const stepStart = Date.now();
                const result = await this.checkAndSetGateway(url, txId, pathSuffix, originalGateway, signal);
                const stepMs = Date.now() - stepStart;
                if (result) {
                    this.logger.info('[gateway] Step 0 (original): success', { host: originalGateway.host, ms: stepMs, totalMs: Date.now() - chainStart });
                    return result;
                }
                this.logger.info('[gateway] Step 0 (original): failed', { host: originalGateway.host, ms: stepMs });
                excludeHost = originalGateway.host;
            } catch {
                // URL parsing failed — skip this step
            }
        }

        // Step 1: Try persisted gateway first (user's known-working gateway from previous session)
        if (this.activeGateway && this.activeGateway.host !== excludeHost) {
            const stepStart = Date.now();
            const result = await this.checkAndSetGateway(url, txId, pathSuffix, this.activeGateway, signal);
            const stepMs = Date.now() - stepStart;
            if (result) {
                this.logger.info('[gateway] Step 1 (persisted): success', { host: this.activeGateway.host, ms: stepMs, totalMs: Date.now() - chainStart });
                return result;
            }
            this.logger.info('[gateway] Step 1 (persisted): failed, clearing', { ms: stepMs });
            this.activeGateway = null;
            this.clearPersistedGateway();
        }

        // Step 2: Try arweave.net (the official gateway — reliable fallback)
        // When bypassArweaveNet is true, skip arweave.net in the chain entirely.
        // Also skip if it was already tried and failed in Step 0.
        if (!bypassArweaveNet && excludeHost !== 'arweave.net') {
            const arweaveNet = this.gateways.find(g => g.host === 'arweave.net');
            if (arweaveNet) {
                const stepStart = Date.now();
                const result = await this.checkAndSetGateway(url, txId, pathSuffix, arweaveNet, signal);
                const stepMs = Date.now() - stepStart;
                if (result) {
                    this.logger.info('[gateway] Step 2 (arweave.net): success', { ms: stepMs, totalMs: Date.now() - chainStart });
                    return result;
                }
                this.logger.info('[gateway] Step 2 (arweave.net): failed', { ms: stepMs });
            }
        }

        // Step 3: Try remaining static fallback gateways in parallel (exclude any already-tried host)
        const stepStart = Date.now();
        const fallbackResult = await this.tryFallbackGateways(url, txId, pathSuffix, signal, excludeHost);
        const stepMs = Date.now() - stepStart;
        if (fallbackResult) {
            this.logger.info('[gateway] Step 3 (fallbacks): success', { ms: stepMs, totalMs: Date.now() - chainStart });
            return fallbackResult;
        }
        this.logger.info('[gateway] Step 3 (fallbacks): failed', { ms: stepMs });

        // Step 4: Try Wayfinder as last resort (wider pool, but slower)
        // When bypassWayfinder is true, skip Wayfinder entirely.
        if (this.wayfinder && !options?.bypassWayfinder) {
            const stepStart = Date.now();
            this.logger.info('[gateway] Step 4 (wayfinder): trying');
            const wayfinderResult = await this.tryWayfinder(url, txId, pathSuffix, signal, excludeHost);
            const stepMs = Date.now() - stepStart;
            if (wayfinderResult) {
                this.logger.info('[gateway] Step 4 (wayfinder): success', { ms: stepMs, totalMs: Date.now() - chainStart });
                return wayfinderResult;
            }
            this.logger.info('[gateway] Step 4 (wayfinder): failed', { ms: stepMs });
        }

        // Everything failed
        this.logger.warn('All gateways (arweave.net + Wayfinder + fallbacks) failed, returning original URL', { txId, pathSuffix, originalUrl: url });
        return url;
    }

    /**
     * Report that the active gateway failed a real fetch.
     *
     * Call this when the URL returned by resolveUrl() actually fails to load
     * (e.g. fetch() returns a 4xx/5xx or throws). This clears the active gateway
     * and finds a new one, persisting the result to localStorage.
     *
     * When reason is 'user-cancel-fast', the active gateway is preserved since
     * the user intentionally cancelled and the gateway is likely fine.
     *
     * @param url - The URL that failed
     * @param options - Optional signal for cancellation and reason to distinguish failure types
     * @returns A new working URL (or original if all gateways fail or user cancelled quickly)
     */
    async reportGatewayFailure(
        url: string,
        options?: { signal?: AbortSignal; reason?: 'load-error' | 'user-cancel-slow' | 'user-cancel-fast'; excludeHost?: string },
    ): Promise<string> {
        const { signal, reason, excludeHost } = options ?? {};

        // If already aborted, return original URL immediately
        if (signal?.aborted) {
            this.logger.debug('reportGatewayFailure called with already-aborted signal, returning original URL');
            return url;
        }

        // User cancelled quickly — gateway is probably fine, just return original URL
        if (reason === 'user-cancel-fast') {
            this.logger.debug('User cancelled quickly, keeping current gateway');
            return url;
        }

        const parsed = parseArweaveUrl(url);
        if (!parsed) return url;
        const { txId, pathSuffix } = parsed;

        this.logger.warn('Gateway failure reported, finding new gateway', {
            failedHost: this.activeGateway?.host,
            txId,
            reason: reason ?? 'load-error',
        });

        // Capture failed host before clearing active gateway
        const failedHost = this.activeGateway?.host ?? excludeHost;

        this.activeGateway = null;
        this.cache.delete(txId);
        this.clearPersistedGateway();

        // Retry with same order: arweave.net → Wayfinder → fallbacks
        const arweaveNet = this.gateways.find(g => g.host === 'arweave.net' && g.host !== failedHost);
        if (arweaveNet) {
            const result = await this.checkAndSetGateway(url, txId, pathSuffix, arweaveNet, signal);
            if (result) return result;
        }

        if (this.wayfinder) {
            const wayfinderResult = await this.tryWayfinder(url, txId, pathSuffix, signal);
            if (wayfinderResult) return wayfinderResult;
        }

        // Temporarily exclude the failed gateway from fallbacks
        const origGateways = this.gateways;
        if (failedHost) {
            this.gateways = this.gateways.filter(g => g.host !== failedHost);
        }
        const fallbackResult = await this.tryFallbackGateways(url, txId, pathSuffix, signal);
        this.gateways = origGateways;
        if (fallbackResult) return fallbackResult;

        return url;
    }

    /**
     * Report that a fetch succeeded with timing data.
     *
     * Callers invoke this after a successful fetch to feed timing data back to the manager.
     * If the fetch was fast, the consecutive slow counter resets. If slow, it increments
     * and may trigger proactive gateway rotation on the next resolveUrl() call.
     *
     * @param timingMs - The time the fetch took in milliseconds
     */
    reportFetchSuccess(timingMs: number): void {
        this.lastFetchTiming = timingMs;

        if (timingMs >= this.slowResponseThreshold) {
            this.consecutiveSlowResponses++;
            this.logger.warn('Slow fetch response recorded', {
                timingMs,
                threshold: this.slowResponseThreshold,
                consecutiveSlow: this.consecutiveSlowResponses,
                maxAllowed: this.maxSlowResponses,
                gateway: this.activeGateway?.host ?? 'none',
            });
        } else {
            if (this.consecutiveSlowResponses > 0) {
                this.logger.info('Fetch timing recovered, resetting slow counter', {
                    timingMs,
                    previousSlowCount: this.consecutiveSlowResponses,
                });
            }
            this.consecutiveSlowResponses = 0;
        }
    }

    /**
     * Check a single gateway and set it as active if it works.
     * Returns the working URL, or null if the check failed.
     */
    private async checkAndSetGateway(url: string, txId: string, pathSuffix: string, gateway: GatewayConfig, signal?: AbortSignal): Promise<string | null> {
        if (signal?.aborted) return null;

        const result = await this.checkGateway(txId, gateway, pathSuffix, signal);
        if (result === true) {
            this.setActiveGateway(gateway, txId);
            const workingUrl = constructGatewayUrl(txId, gateway, pathSuffix);
            this.logger.info('Gateway resolved', {
                txId,
                gateway: gateway.host,
                pathSuffix,
                workingUrl,
            });
            return workingUrl;
        }
        if (result === 'maybe') {
            // no-cors says server responded but we can't confirm — return URL without caching
            const workingUrl = constructGatewayUrl(txId, gateway, pathSuffix);
            this.logger.info('Gateway maybe resolved (no-cors)', {
                txId,
                gateway: gateway.host,
                pathSuffix,
                workingUrl,
            });
            return workingUrl;
        }

        return null;
    }

    /**
     * Try remaining fallback gateways (everything except arweave.net) in parallel.
     * Returns the URL of the first gateway that responds, or null if all fail.
     */
    private async tryFallbackGateways(url: string, txId: string, pathSuffix: string, signal?: AbortSignal, excludeHost?: string | null): Promise<string | null> {
        this.missCount++;

        const HEALTHY_FAILURE_THRESHOLD = 0.70;
        const MIN_CHECKS_FOR_FILTER = 3;

        const fallbackGateways = this.gateways.filter(g => g.host !== 'arweave.net' && g.host !== excludeHost);
        const healthyGateways = fallbackGateways.filter(gateway => {
            const { rate, totalChecks } = this.getFailureRate(gateway.host);
            if (totalChecks >= MIN_CHECKS_FOR_FILTER && rate > HEALTHY_FAILURE_THRESHOLD) return false;
            return true;
        });

        // Try healthy gateways first; if they all fail but some were excluded by health
        // filtering, retry with the full set — a previously "unhealthy" gateway may have recovered.
        const gatewaysToTry = healthyGateways.length > 0 ? healthyGateways : fallbackGateways;

        if (signal?.aborted) return null;
        if (gatewaysToTry.length === 0) return null;

        const tryGateways = async (gateways: GatewayConfig[]): Promise<string | null> => {
            if (signal?.aborted || gateways.length === 0) return null;

            const controller = new AbortController();
            const onExternalAbort = () => controller.abort();
            signal?.addEventListener('abort', onExternalAbort, { once: true });

            let resolved = false;

            try {
                const result = await Promise.any(
                    gateways.map(async (gateway): Promise<string> => {
                        const checkResult = await this.checkGateway(txId, gateway, pathSuffix, controller.signal);
                        if (checkResult) {
                            const workingUrl = constructGatewayUrl(txId, gateway, pathSuffix);
                            if (!resolved) {
                                resolved = true;
                                // Only cache confirmed successes, not no-cors 'maybe' results
                                if (checkResult === true) {
                                    this.setActiveGateway(gateway, txId);
                                    this.logger.info('Gateway resolved via fallback', {
                                        txId,
                                        gateway: gateway.host,
                                        pathSuffix,
                                        workingUrl,
                                    });
                                } else {
                                    this.logger.info('Gateway maybe resolved via fallback (no-cors)', {
                                        txId,
                                        gateway: gateway.host,
                                        pathSuffix,
                                        workingUrl,
                                    });
                                }
                            }
                            return workingUrl;
                        }
                        throw new Error(`Gateway ${gateway.host} failed check`);
                    }),
                );

                return result;
            } catch {
                // Promise.any throws AggregateError when all reject
                return null;
            } finally {
                signal?.removeEventListener('abort', onExternalAbort);
            }
        };

        // Try healthy subset first
        const result = await tryGateways(gatewaysToTry);
        if (result) return result;

        // If health filtering excluded some gateways, try the full set as a second pass
        if (healthyGateways.length < fallbackGateways.length && !signal?.aborted) {
            const excludedHosts = fallbackGateways
                .filter(g => !healthyGateways.some(h => h.host === g.host))
                .map(g => g.host);
            this.logger.debug('Healthy gateways exhausted, retrying with previously unhealthy', { excludedHosts });
            const fullResult = await tryGateways(fallbackGateways);
            if (fullResult) return fullResult;
        }

        return null;
    }

    /**
     * Try Wayfinder as a last resort when all static gateways fail.
     * Returns the URL of a working Wayfinder-selected gateway, or null if it fails.
     */
    /**
     * Return the ranked gateway list from the primary `NetworkGatewaysProvider`,
     * using an in-memory cache to avoid hitting Solana on every walk. Returns null
     * if the provider is unavailable or the fetch fails.
     */
    private async getRankedGatewaysCached(signal?: AbortSignal): Promise<URL[] | null> {
        if (!this.wayfinderGatewaysProvider) return null;

        const now = Date.now();
        const cacheAge = now - this.rankedGatewaysCacheTimestamp;
        if (this.rankedGatewaysCache && cacheAge < this.RANKED_GATEWAYS_TTL_MS) {
            this.logger.debug('Reusing cached ranked gateway list', {
                size: this.rankedGatewaysCache.length,
                ageMs: cacheAge,
            });
            return this.rankedGatewaysCache;
        }

        try {
            const fresh = await this.withTimeout(
                this.wayfinderGatewaysProvider.getGateways(),
                this.timeout + 2000,
                'Wayfinder provider getGateways timed out'
            );
            if (signal?.aborted) return null;
            this.rankedGatewaysCache = fresh;
            this.rankedGatewaysCacheTimestamp = now;
            this.logger.info('Refreshed ranked gateway list cache', { size: fresh.length });
            return fresh;
        } catch (err) {
            this.logger.debug('Failed to fetch ranked gateway list from provider', { error: err });
            // If we have a stale cache, prefer that over returning nothing
            if (this.rankedGatewaysCache) {
                this.logger.debug('Falling back to stale ranked gateway cache', {
                    size: this.rankedGatewaysCache.length,
                    ageMs: cacheAge,
                });
                return this.rankedGatewaysCache;
            }
            return null;
        }
    }

    private async tryWayfinder(url: string, txId: string, pathSuffix: string, signal?: AbortSignal, excludeHost?: string | null): Promise<string | null> {
        if (!this.wayfinder) return null;

        // Maximum number of gateways we'll HEAD-check from the walk list after Wayfinder's
        // first pick. Caps worst-case latency — most files resolve in the first few tries.
        const MAX_WALK_DEPTH = 10;

        // Track hosts we've already verified-and-failed so we don't re-check them when
        // walking the list (Wayfinder's #1 pick is almost always in the ranked list too).
        const failedHosts = new Set<string>();
        if (excludeHost) failedHosts.add(excludeHost);

        // Step A: Let Wayfinder's strategy make the smart first pick (e.g. FastestPing).
        // This benefits from Wayfinder's ping race + caching across calls.
        try {
            this.logger.debug('Resolving via Wayfinder (first pick)', { txId });
            const wayfinderUrlObj = await this.withTimeout(
                this.wayfinder.resolveUrl({ originalUrl: url }),
                this.timeout + 2000,
                'Wayfinder resolution timed out'
            );

            if (signal?.aborted) return null;

            const wayfinderHost = wayfinderUrlObj.hostname;

            if (!failedHosts.has(wayfinderHost)) {
                const wayfinderProtocol = wayfinderUrlObj.protocol.replace(':', '') as 'http' | 'https';
                const wayfinderGateway: GatewayConfig = {
                    host: wayfinderHost,
                    protocol: wayfinderProtocol,
                    priority: 0,
                };

                const checkResult = await this.checkGateway(txId, wayfinderGateway, pathSuffix, signal);
                if (checkResult) {
                    const workingUrl = constructGatewayUrl(txId, wayfinderGateway, pathSuffix);
                    if (checkResult === true) {
                        this.setActiveGateway(wayfinderGateway, txId);
                        this.logger.info('Gateway resolved via Wayfinder (first pick)', {
                            txId, gateway: wayfinderHost, pathSuffix, workingUrl,
                        });
                    } else {
                        this.logger.info('Gateway maybe resolved via Wayfinder (first pick, no-cors)', {
                            txId, gateway: wayfinderHost, pathSuffix, workingUrl,
                        });
                    }
                    return workingUrl;
                }
                this.logger.debug('Wayfinder first pick failed verify, will walk ranked list', { host: wayfinderHost });
                failedHosts.add(wayfinderHost);
            } else {
                this.logger.debug('Wayfinder first pick was already excluded, skipping to walk', { host: wayfinderHost });
            }
        } catch (err) {
            this.logger.debug('Wayfinder first pick threw, will walk ranked list', { error: err });
        }

        if (signal?.aborted) return null;

        // Step B: Walk the ranked gateway list ourselves. No second ping race, no second
        // Solana RPC call — we cache the ranked list in memory and reuse it across requests
        // until the TTL expires.
        const rankedGateways = await this.getRankedGatewaysCached(signal);
        if (!rankedGateways || rankedGateways.length === 0) return null;

        if (signal?.aborted) return null;

        // Filter out hosts we've already tried/excluded, then walk in rank order
        const toWalk = rankedGateways
            .filter(g => !failedHosts.has(g.hostname))
            .slice(0, MAX_WALK_DEPTH);

        this.logger.debug('Walking Wayfinder ranked list', {
            txId,
            poolSize: rankedGateways.length,
            walkSize: toWalk.length,
        });

        for (const gatewayUrl of toWalk) {
            if (signal?.aborted) return null;

            const candidate: GatewayConfig = {
                host: gatewayUrl.hostname,
                protocol: gatewayUrl.protocol.replace(':', '') as 'http' | 'https',
                priority: 0,
            };

            const checkResult = await this.checkGateway(txId, candidate, pathSuffix, signal);
            if (checkResult) {
                const workingUrl = constructGatewayUrl(txId, candidate, pathSuffix);
                if (checkResult === true) {
                    this.setActiveGateway(candidate, txId);
                    this.logger.info('Gateway resolved via Wayfinder ranked walk', {
                        txId, gateway: candidate.host, pathSuffix, workingUrl,
                    });
                } else {
                    this.logger.info('Gateway maybe resolved via Wayfinder ranked walk (no-cors)', {
                        txId, gateway: candidate.host, pathSuffix, workingUrl,
                    });
                }
                return workingUrl;
            }
            failedHosts.add(candidate.host);
        }

        this.logger.debug('Wayfinder ranked walk exhausted with no match', {
            txId,
            checkedHosts: Array.from(failedHosts),
        });
        return null;
    }

    /**
     * Set the active gateway, cache it for the txId, and persist to localStorage.
     */
    private setActiveGateway(gateway: GatewayConfig, txId: string): void {
        this.activeGateway = gateway;
        this.lastFetchTiming = 0;
        this.consecutiveSlowResponses = 0;
        this.setCache(txId, gateway);
        this.persistGateway(gateway);
    }

    /**
     * Load the persisted active gateway from localStorage.
     */
    private loadPersistedGateway(): GatewayConfig | null {
        try {
            if (typeof localStorage === 'undefined') return null;
            const stored = localStorage.getItem(ACTIVE_GATEWAY_STORAGE_KEY);
            if (!stored) return null;
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed.host === 'string' && typeof parsed.protocol === 'string') {
                const PERSISTED_GATEWAY_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
                if (typeof parsed.timestamp === 'number' && Date.now() - parsed.timestamp > PERSISTED_GATEWAY_TTL_MS) {
                    this.logger.info('Ignoring persisted gateway — expired (older than 2 hours)', { host: parsed.host });
                    this.clearPersistedGateway();
                    return null;
                }
                this.logger.info('Restored active gateway from localStorage', { host: parsed.host });
                const { timestamp: _timestamp, ...gateway } = parsed;
                return gateway as GatewayConfig;
            }
        } catch {
            // localStorage unavailable or corrupted — ignore
        }
        return null;
    }

    /**
     * Persist the active gateway to localStorage.
     */
    private persistGateway(gateway: GatewayConfig): void {
        try {
            if (typeof localStorage === 'undefined') return;
            const data = { ...gateway, timestamp: Date.now() };
            localStorage.setItem(ACTIVE_GATEWAY_STORAGE_KEY, JSON.stringify(data));
        } catch {
            // localStorage unavailable — ignore
        }
    }

    /**
     * Clear the persisted gateway from localStorage.
     */
    private clearPersistedGateway(): void {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.removeItem(ACTIVE_GATEWAY_STORAGE_KEY);
        } catch {
            // localStorage unavailable — ignore
        }
    }

    /**
     * Check if a gateway can serve a transaction
     *
     * Uses a HEAD request with timeout to check if the gateway responds.
     * Handles CORS errors gracefully (treats as failure, not exception).
     *
     * @param txId - The transaction ID to check
     * @param gateway - The gateway to check
     * @param pathSuffix - Optional path suffix to append after txId
     * @param signal - Optional external AbortSignal to cancel the check
     * @returns true if the gateway can serve the transaction
     */
    async checkGateway(txId: string, gateway: GatewayConfig, pathSuffix: string = '', signal?: AbortSignal): Promise<boolean | 'maybe'> {
        const url = constructGatewayUrl(txId, gateway, pathSuffix);
        const startTime = Date.now();

        // Create AbortController for timeout, combined with external signal if provided
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        // If an external signal is provided, abort our controller when it fires
        const onExternalAbort = () => controller.abort();
        signal?.addEventListener('abort', onExternalAbort, { once: true });

        try {
            // Use HEAD request to check availability without downloading content
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            signal?.removeEventListener('abort', onExternalAbort);
            const responseTime = Date.now() - startTime;

            // Consider 2xx and 3xx responses as success
            const success = response.ok || (response.status >= 200 && response.status < 400);

            // Record response for health tracking
            this.recordGatewayResponse(gateway.host, responseTime, success);

            return success;
        } catch (error) {
            clearTimeout(timeoutId);
            signal?.removeEventListener('abort', onExternalAbort);
            const responseTime = Date.now() - startTime;

            // Record failed response for health tracking
            this.recordGatewayResponse(gateway.host, responseTime, false);

            // Handle timeout or external abort
            if (error instanceof Error && error.name === 'AbortError') {
                const wasExternal = signal?.aborted;
                this.logger.debug(wasExternal ? 'Gateway check aborted by external signal' : 'Gateway check timed out', {
                    txId,
                    gateway: gateway.host,
                    timeout: this.timeout,
                });
                return false;
            }

            // TypeError from fetch = network failure, CORS block, or DNS failure.
            // A CORS error on HEAD doesn't mean the file isn't there — the gateway
            // may not support CORS on HEAD but still serves the file fine.
            // Try a no-cors GET as a fallback: if it doesn't throw, the server responded.
            // We can't read the status, so we return 'maybe' instead of true — the caller
            // decides whether to cache (no) or return the URL for external verification (yes).
            if (error instanceof TypeError) {
                this.logger.debug('HEAD failed (likely CORS), retrying with no-cors', {
                    txId,
                    gateway: gateway.host,
                    error: error.message,
                });
                try {
                    await fetch(url, {
                        method: 'GET',
                        mode: 'no-cors',
                        signal: controller.signal,
                    });
                    // Didn't throw — server responded (but we can't read status)
                    const responseTime = Date.now() - startTime;
                    this.recordGatewayResponse(gateway.host, responseTime, true);
                    return 'maybe';
                } catch {
                    const responseTime = Date.now() - startTime;
                    this.recordGatewayResponse(gateway.host, responseTime, false);
                    return false;
                }
            }

            this.logger.debug('Gateway HEAD failed', {
                txId,
                gateway: gateway.host,
                error: error instanceof Error ? error.message : String(error),
            });

            return false;
        }
    }

    /**
     * Get the cached working gateway for a transaction ID
     *
     * @param txId - The transaction ID to look up
     * @returns The cached gateway config, or null if not cached or expired
     */
    getCachedGateway(txId: string): GatewayConfig | null {
        const cached = this.cache.get(txId);
        if (!cached) {
            return null;
        }

        // Check if cache entry is still valid
        if (!this.isCacheValid(cached)) {
            this.cache.delete(txId);
            return null;
        }

        return cached.workingGateway;
    }

    /**
     * Cache a working gateway for a transaction ID
     *
     * @param txId - The transaction ID
     * @param gateway - The working gateway to cache
     */
    setCache(txId: string, gateway: GatewayConfig): void {
        const cacheEntry: GatewayCache = {
            txId,
            workingGateway: gateway,
            timestamp: Date.now(),
            ttl: this.cacheTTL,
        };
        this.cache.set(txId, cacheEntry);
        this.logger.debug('Cached working gateway', { txId, gateway: gateway.host });
    }

    /**
     * Clear all cached gateway entries
     */
    clearCache(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        this.logger.info('Cache cleared', { entriesRemoved: size });
    }

    /**
     * Invalidate the cached gateway for a specific URL's transaction ID.
     * Also clears the active gateway and persisted gateway so that resolveUrl()
     * runs the full fallback chain instead of short-circuiting.
     */
    invalidateCacheForUrl(url: string): void {
        if (!isArweaveUrl(url)) return;
        const parsed = parseArweaveUrl(url);
        if (!parsed) return;
        this.cache.delete(parsed.txId);
        this.activeGateway = null;
        this.clearPersistedGateway();
    }

    /**
     * Prefetch and cache gateways for multiple URLs in parallel
     *
     * This is useful for warming up the cache at app startup with known model URLs.
     * URLs are resolved in parallel with configurable concurrency.
     *
     * @param urls - Array of URLs to prefetch (non-Arweave URLs are skipped)
     * @param options - Prefetch options
     * @returns Result summary with success/failure counts and details
     *
     * @example
     * ```ts
     * const result = await arweaveGatewayManager.prefetchUrls([
     *     'https://arweave.net/abc123.../model.json',
     *     'https://arweave.net/def456.../model.json',
     * ]);
     * console.log(`Prefetched ${result.succeeded}/${result.total} URLs`);
     * ```
     */
    async prefetchUrls(urls: string[], options?: PrefetchOptions): Promise<PrefetchResult> {
        const concurrency = options?.concurrency ?? 5;
        const continueOnError = options?.continueOnError ?? true;

        const entries: PrefetchResultEntry[] = [];
        let succeeded = 0;
        let failed = 0;
        let skipped = 0;

        // Process URLs in batches for controlled concurrency
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);

            const batchResults = await Promise.allSettled(
                batch.map(async (url): Promise<PrefetchResultEntry> => {
                    // Skip non-Arweave URLs
                    if (!isArweaveUrl(url)) {
                        return {
                            url,
                            txId: '',
                            success: false,
                            error: 'Not an Arweave URL',
                        };
                    }

                    // Parse URL to get txId
                    const parsed = parseArweaveUrl(url);
                    if (!parsed) {
                        return {
                            url,
                            txId: '',
                            success: false,
                            error: 'Failed to parse Arweave URL',
                        };
                    }

                    // Check if already cached
                    const cached = this.getCachedGateway(parsed.txId);
                    if (cached) {
                        return {
                            url,
                            txId: parsed.txId,
                            success: true,
                            gateway: cached,
                        };
                    }

                    // Resolve URL (this will check gateways and cache the result)
                    await this.resolveUrl(url);
                    const resolvedGateway = this.getCachedGateway(parsed.txId);

                    if (resolvedGateway) {
                        return {
                            url,
                            txId: parsed.txId,
                            success: true,
                            gateway: resolvedGateway,
                        };
                    } else {
                        return {
                            url,
                            txId: parsed.txId,
                            success: false,
                            error: 'All gateways failed',
                        };
                    }
                })
            );

            // Collect results
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    const entry = result.value;
                    entries.push(entry);

                    if (entry.error === 'Not an Arweave URL') {
                        skipped++;
                    } else if (entry.success) {
                        succeeded++;
                    } else {
                        failed++;
                    }
                } else {
                    // Promise rejected (shouldn't happen with our implementation)
                    failed++;
                    entries.push({
                        url: 'unknown',
                        txId: '',
                        success: false,
                        error: result.reason?.message ?? 'Unknown error',
                    });
                }
            }

            // Stop processing if continueOnError is false and we have failures
            if (!continueOnError && failed > 0) {
                this.logger.warn('Prefetch stopped due to failures', { failed, processed: entries.length });
                break;
            }
        }

        this.logger.info('Prefetch complete', {
            total: urls.length,
            succeeded,
            failed,
            skipped,
        });

        return {
            total: urls.length,
            succeeded,
            failed,
            skipped,
            entries,
        };
    }

    /**
     * Get statistics about the gateway cache
     *
     * @returns Cache statistics including size, entries, and hit/miss counts
     *
     * @example
     * ```ts
     * const stats = arweaveGatewayManager.getCacheStats();
     * console.log(`Cache has ${stats.size} entries, hit rate: ${stats.hitCount / (stats.hitCount + stats.missCount)}`);
     * ```
     */
    getCacheStats(): CacheStats {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();

        // Filter to only valid (non-expired) entries
        const validTxIds = entries
            .filter(([, cache]) => now - cache.timestamp < cache.ttl)
            .map(([txId]) => txId);

        return {
            size: validTxIds.length,
            txIds: validTxIds,
            hitCount: this.hitCount,
            missCount: this.missCount,
            ttl: this.cacheTTL,
        };
    }

    /**
     * Get all cached gateway entries (for debugging)
     *
     * @returns Array of all cache entries (including expired ones)
     */
    getCacheEntries(): GatewayCache[] {
        return Array.from(this.cache.values());
    }

    /**
     * Check if a cache entry is still valid
     *
     * @param cache - The cache entry to check
     * @returns true if the entry is still within its TTL
     */
    private isCacheValid(cache: GatewayCache): boolean {
        const now = Date.now();
        const age = now - cache.timestamp;
        return age < cache.ttl;
    }

    /**
     * Get the average response time for a gateway from health data.
     * Returns 0 if no records exist (indicates no history).
     *
     * @param host - Gateway hostname
     * @returns Average response time in ms, or 0 if no data
     */
    /**
     * Get the failure rate for a gateway based on health data.
     *
     * @param host - Gateway hostname
     * @returns Object with failure rate (0-1) and total check count
     */
    private getFailureRate(host: string): { rate: number; totalChecks: number } {
        const records = this.healthData.get(host);
        if (!records || records.length === 0) return { rate: 0, totalChecks: 0 };
        const failures = records.filter(r => !r.success).length;
        return { rate: failures / records.length, totalChecks: records.length };
    }

    private getAverageResponseTime(host: string): number {
        const records = this.healthData.get(host);
        if (!records || records.length === 0) return 0;
        return records.reduce((sum, r) => sum + r.responseTime, 0) / records.length;
    }

    /**
     * Record a gateway response for health tracking
     *
     * @param host - Gateway hostname
     * @param responseTime - Response time in milliseconds
     * @param success - Whether the check was successful
     */
    private recordGatewayResponse(host: string, responseTime: number, success: boolean): void {
        if (!this.healthData.has(host)) {
            this.healthData.set(host, []);
        }

        const records = this.healthData.get(host)!;
        records.push({
            responseTime,
            success,
            timestamp: Date.now(),
        });

        // Keep only the most recent records
        if (records.length > this.MAX_HEALTH_RECORDS) {
            records.shift();
        }
    }

    /**
     * Report real fetch timing data for a gateway.
     *
     * Callers invoke this after an actual data-transfer fetch (not just a HEAD check)
     * to feed real performance data into health tracking. This is separate from the
     * HEAD-based timing recorded by checkGateway(), and gives a more accurate picture
     * of actual download performance.
     *
     * @param host - Gateway hostname that served the fetch
     * @param timingMs - Time the full fetch took in milliseconds
     * @param success - Whether the fetch succeeded
     */
    reportFetchTiming(host: string, timingMs: number, success: boolean): void {
        this.recordGatewayResponse(host, timingMs, success);
        this.logger.debug('Fetch timing reported', { host, timingMs, success });
    }

    /**
     * Get health statistics for a specific gateway
     *
     * @param host - Gateway hostname
     * @returns Health statistics for the gateway, or undefined if not tracked
     */
    getGatewayHealth(host: string): GatewayHealthStats | undefined {
        const gateway = this.gateways.find(g => g.host === host);
        if (!gateway) {
            return undefined;
        }

        const records = this.healthData.get(host) || [];
        const originalPriority = this.originalPriorities.get(host) ?? gateway.priority;

        if (records.length === 0) {
            return {
                host,
                priority: gateway.priority,
                originalPriority,
                successCount: 0,
                failureCount: 0,
                totalChecks: 0,
                successRate: 0,
                averageResponseTime: 0,
                lastSuccess: null,
                lastFailure: null,
                isHealthy: true, // Assume healthy until we have data
            };
        }

        const successCount = records.filter(r => r.success).length;
        const failureCount = records.filter(r => !r.success).length;
        const successRate = successCount / records.length;
        const averageResponseTime = Math.round(
            records.reduce((sum, r) => sum + r.responseTime, 0) / records.length
        );
        const lastSuccess = records.filter(r => r.success).pop()?.timestamp ?? null;
        const lastFailure = records.filter(r => !r.success).pop()?.timestamp ?? null;

        // Consider healthy if success rate is >= 50% or no failures yet
        const isHealthy = successRate >= 0.5;

        return {
            host,
            priority: gateway.priority,
            originalPriority,
            successCount,
            failureCount,
            totalChecks: records.length,
            successRate,
            averageResponseTime,
            lastSuccess,
            lastFailure,
            isHealthy,
        };
    }

    /**
     * Get health statistics for all gateways
     *
     * @returns Array of health statistics for each gateway
     */
    getAllGatewayHealth(): GatewayHealthStats[] {
        return this.gateways.map(g => this.getGatewayHealth(g.host)!);
    }

    /**
     * Adjust gateway priorities based on health data
     *
     * This method reorders gateways based on:
     * 1. Health status (healthy gateways first)
     * 2. Average response time (faster gateways first among healthy)
     * 3. Success rate (higher success rate first)
     *
     * @param options - Options for priority adjustment
     * @returns The new gateway order after adjustment
     */
    adjustGatewayPriorities(options?: {
        /** Minimum number of checks required before adjusting (default: 3) */
        minChecks?: number;
        /** Threshold for considering a gateway healthy (default: 0.5) */
        healthyThreshold?: number;
    }): GatewayConfig[] {
        const minChecks = options?.minChecks ?? 3;
        const healthyThreshold = options?.healthyThreshold ?? 0.5;

        // Get health stats for all gateways
        const healthStats = this.getAllGatewayHealth();

        // Check if we have enough data to make adjustments
        const totalChecks = healthStats.reduce((sum, h) => sum + h.totalChecks, 0);
        if (totalChecks < minChecks) {
            this.logger.debug('Not enough health data to adjust priorities', {
                totalChecks,
                required: minChecks,
            });
            return [...this.gateways];
        }

        // Sort gateways based on health metrics (with stable sort using original index)
        const indexedGateways = this.gateways.map((g, index) => ({ gateway: g, originalIndex: index }));

        indexedGateways.sort((a, b) => {
            const healthA = this.getGatewayHealth(a.gateway.host)!;
            const healthB = this.getGatewayHealth(b.gateway.host)!;

            // First: unhealthy gateways go to the end
            const aHealthy = healthA.successRate >= healthyThreshold || healthA.totalChecks === 0;
            const bHealthy = healthB.successRate >= healthyThreshold || healthB.totalChecks === 0;

            if (aHealthy && !bHealthy) return -1;
            if (!aHealthy && bHealthy) return 1;

            // Second: faster response time wins (among healthy or equally unhealthy)
            if (healthA.totalChecks > 0 && healthB.totalChecks > 0) {
                const timeDiff = healthA.averageResponseTime - healthB.averageResponseTime;
                if (Math.abs(timeDiff) > 100) { // Only consider significant differences (>100ms)
                    return timeDiff;
                }
            }

            // Third: higher success rate wins
            if (healthA.totalChecks > 0 && healthB.totalChecks > 0) {
                const rateDiff = healthB.successRate - healthA.successRate;
                if (Math.abs(rateDiff) > 0.1) { // Only consider significant differences (>10%)
                    return rateDiff;
                }
            }

            // Keep original order if no significant difference (stable sort)
            return a.originalIndex - b.originalIndex;
        });

        const sortedGateways = indexedGateways.map(item => item.gateway);

        // Update priorities based on new order (preserve original priority range)
        const minPriority = Math.min(...Array.from(this.originalPriorities.values()));
        sortedGateways.forEach((gateway, index) => {
            gateway.priority = minPriority + index;
        });

        // Re-sort the main gateways array
        this.gateways = sortedGateways;

        this.logger.info('Gateway priorities adjusted', {
            newOrder: this.gateways.map(g => ({
                host: g.host,
                priority: g.priority,
                health: this.getGatewayHealth(g.host),
            })),
        });

        return [...this.gateways];
    }

    /**
     * Run a health check on all gateways
     *
     * Tests each gateway by making a HEAD request to a known transaction.
     * Optionally adjusts priorities based on results.
     *
     * @param options - Health check options
     * @returns Health check results
     *
     * @example
     * ```ts
     * const result = await arweaveGatewayManager.runHealthCheck({
     *     adjustPriorities: true,
     * });
     * console.log(`Fastest gateway: ${result.fastestGateway}`);
     * console.log(`Healthy gateways: ${result.healthyGateways.join(', ')}`);
     * ```
     */
    async runHealthCheck(options?: HealthCheckOptions): Promise<HealthCheckResult> {
        const startTime = Date.now();
        const txId = options?.txId ?? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk012345'; // Default test txId
        const healthyThreshold = options?.healthyThreshold ?? 0.5;
        const fastThreshold = options?.fastThreshold ?? 2000;

        this.logger.info('Starting gateway health check', {
            txId,
            gateways: this.gateways.map(g => g.host),
        });

        // Check each gateway in parallel
        const checkPromises = this.gateways.map(async (gateway) => {
            const checkStart = Date.now();
            let success = false;
            let responseTime = this.timeout; // Default to timeout on failure

            try {
                const url = constructGatewayUrl(txId, gateway);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    method: 'HEAD',
                    mode: 'cors',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                responseTime = Date.now() - checkStart;
                success = response.ok || (response.status >= 200 && response.status < 400);
            } catch (error) {
                responseTime = Date.now() - checkStart;
                success = false;
            }

            // Record the result
            this.recordGatewayResponse(gateway.host, responseTime, success);

            return {
                host: gateway.host,
                success,
                responseTime,
            };
        });

        const results = await Promise.all(checkPromises);

        // Build health stats
        const gatewayStats = this.getAllGatewayHealth();

        // Determine healthy/unhealthy gateways
        const healthyGateways: string[] = [];
        const unhealthyGateways: string[] = [];
        let fastestGateway: string | null = null;
        let fastestTime = Infinity;

        for (const result of results) {
            const stats = gatewayStats.find(s => s.host === result.host)!;

            if (result.success && result.responseTime < fastestTime) {
                fastestTime = result.responseTime;
                fastestGateway = result.host;
            }

            if (stats.successRate >= healthyThreshold || stats.totalChecks === 1) {
                // First check or healthy threshold met
                if (result.success) {
                    healthyGateways.push(result.host);
                } else {
                    unhealthyGateways.push(result.host);
                }
            } else {
                unhealthyGateways.push(result.host);
            }
        }

        const totalTime = Date.now() - startTime;

        // Optionally adjust priorities
        if (options?.adjustPriorities) {
            this.adjustGatewayPriorities({
                minChecks: options.minChecksForAdjustment ?? 1,
                healthyThreshold,
            });
        }

        const healthCheckResult: HealthCheckResult = {
            timestamp: startTime,
            gateways: gatewayStats,
            healthyGateways,
            unhealthyGateways,
            fastestGateway,
            totalTime,
        };

        this.logger.info('Health check complete', {
            healthyGateways,
            unhealthyGateways,
            fastestGateway,
            totalTime,
        });

        return healthCheckResult;
    }

    /**
     * Reset gateway priorities to their original values
     */
    resetGatewayPriorities(): void {
        // Reset each gateway's priority to its original value
        this.gateways.forEach(gateway => {
            const original = this.originalPriorities.get(gateway.host);
            if (original !== undefined) {
                gateway.priority = original;
            }
        });

        // Re-sort by original priorities
        this.gateways.sort((a, b) => {
            const aOriginal = this.originalPriorities.get(a.host) ?? a.priority;
            const bOriginal = this.originalPriorities.get(b.host) ?? b.priority;
            return aOriginal - bOriginal;
        });

        this.logger.info('Gateway priorities reset to original values', {
            gateways: this.gateways.map(g => ({ host: g.host, priority: g.priority })),
        });
    }

    /**
     * Clear all health tracking data
     */
    clearHealthData(): void {
        this.healthData.clear();
        this.logger.info('Health data cleared');
    }
}

/**
 * Singleton instance of ArweaveGatewayManager
 *
 * Uses default configuration. For custom configuration, create a new instance.
 *
 * @example
 * ```ts
 * import { arweaveGatewayManager } from 'playlist-data-engine';
 *
 * // Use the singleton
 * const url = await arweaveGatewayManager.resolveUrl('https://arweave.net/abc...');
 * ```
 */
export const arweaveGatewayManager = new ArweaveGatewayManager();
