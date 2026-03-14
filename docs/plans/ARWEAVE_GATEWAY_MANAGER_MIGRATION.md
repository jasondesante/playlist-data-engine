# ArweaveGatewayManager Migration Plan

## Overview

Migrate the `ArweaveGatewayManager` from `playlist-data-showcase` to `playlist-data-engine` to provide centralized gateway fallback functionality for all Arweave resources (model URLs, images, audio files, etc.).

**Problem Statement:**
- The `turbo-gateway.com` gateway returns 499 errors, causing model loading failures
- `playlist-data-engine` provides `DEFAULT_ARWEAVE_MODELS` with hardcoded gateway URLs but has no fallback mechanism
- Gateway resolution logic only exists in the showcase, creating code duplication and missed resolution opportunities

**Solution:**
Move the complete gateway management system to the engine where it belongs, since the engine is the source of Arweave URLs for models, spells, items, and other RPG mechanics.

---

## Phase 1: Enhance Engine's arweaveUtils.ts

Update the engine's utility file to match the showcase's enhanced version.

- [x] **1.1 Update ArweaveUrlInfo interface**
  - [x] Add `pathSuffix: string` property to support URLs like `{txId}/model.json`
  - [x] Update JSDoc examples to show path suffix usage

- [x] **1.2 Update parseArweaveUrl function**
  - [x] Add logic to extract path suffix after txId (e.g., `/model.json`)
  - [x] Handle query strings and fragments correctly
  - [x] Return `pathSuffix` in the result object

- [x] **1.3 Update constructGatewayUrl function**
  - [x] Add optional `pathSuffix` parameter
  - [x] Append pathSuffix to constructed URL

- [x] **1.4 Add getAllGatewayUrls function**
  - [x] Create function that returns all gateway URLs for a txId in priority order
  - [x] Accept optional gateways array (default to DEFAULT_GATEWAYS)
  - [x] Accept optional pathSuffix parameter

- [x] **1.5 Add KNOWN_GATEWAY_HOSTS constant**
  - [x] Export as `const` array for external use

- [x] **1.6 Add unit tests**
  - [x] Create `src/utils/__tests__/arweaveUtils.test.ts` (59 tests, all passing)
  - [x] Test pathSuffix extraction for various URL formats
  - [x] Test constructGatewayUrl with pathSuffix
  - [x] Test getAllGatewayUrls ordering

---

## Phase 2: Create ArweaveGatewayManager in Engine

Port the showcase's gateway manager to the engine with engine-compatible logging.

- [x] **2.1 Create src/utils/arweaveGatewayManager.ts**
  - [x] Copy core class structure from showcase
  - [x] Replace showcase logger import with engine's logger
  - [x] Import utilities from `./arweaveUtils.js`

- [x] **2.2 Port GatewayCache interface**
  - [x] Include txId, workingGateway, timestamp, ttl

- [x] **2.3 Port GatewayCheckResult interface**
  - [x] Include workingUrl, gateway, cached boolean

- [x] **2.4 Port ArweaveGatewayManagerConfig interface**
  - [x] Include optional gateways, timeout, cacheTTL

- [x] **2.5 Port ArweaveGatewayManager class**
  - [x] `resolveUrl(url: string): Promise<string>` - Main resolution method
  - [x] `checkGateway(txId, gateway, pathSuffix): Promise<boolean>` - HEAD request check
  - [x] `getCachedGateway(txId): GatewayConfig | null` - Cache lookup
  - [x] `setCache(txId, gateway): void` - Cache storage
  - [x] `clearCache(): void` - Cache clearing
  - [x] `isCacheValid(cache): boolean` - TTL validation

- [x] **2.6 Export singleton instance**
  - [x] `export const arweaveGatewayManager = new ArweaveGatewayManager()`

- [x] **2.7 Port unit tests**
  - [x] Create `tests/unit/arweaveGatewayManager.test.ts` (40 tests, all passing)
  - [x] Port all test cases from showcase (expanded from 33 to 40)
  - [x] Test gateway priority ordering
  - [x] Test cache hit/miss scenarios
  - [x] Test timeout behavior
  - [x] Test fallback to alternate gateways
  - [x] Test pathSuffix handling

---

## Phase 3: Export from Engine's Public API

Make the gateway manager available to consumers.

- [x] **3.1 Update src/index.ts exports**
  - [x] Add `ArweaveGatewayManager` class export
  - [x] Add `arweaveGatewayManager` singleton export
  - [x] Add `ArweaveGatewayManagerConfig` type export
  - [x] Add `GatewayCache` type export
  - [x] Add `GatewayCheckResult` type export
  - [x] Add `getAllGatewayUrls` function export (already exported)

- [x] **3.2 Update existing arweaveUtils exports**
  - [x] Ensure `pathSuffix` is in ArweaveUrlInfo type
  - [x] Export updated `constructGatewayUrl` signature
  - [x] Export `KNOWN_GATEWAY_HOSTS`

- [x] **3.3 Verify build succeeds**
  - [x] Run `npm run build` in engine
  - [x] Check for TypeScript errors
  - [x] Verify exports are accessible

---

## Phase 4: Add Gateway Resolution to MusicClassifier

Enable the engine to resolve model URLs before loading.

- [x] **4.1 Add resolveUrl option to MusicClassifierOptions**
  - [x] Add optional `resolveUrl?: (url: string) => Promise<string>` callback
  - [x] Document that this is used for Arweave URL resolution

- [x] **4.2 Update loadModelWithRetry method**
  - [x] Call `resolveUrl` on modelUrl before loading (if provided)
  - [x] Log when URL is resolved to different gateway

- [x] **4.3 Update loadModels method** ✓
    - **Note:** The `loadModels` method doesn't exist as the single class - models are loaded lazily through `getEmbeddingModel`, `loadModelWithRetry`, `predictWithModel`, and and other model loading paths.
    - **Implementation details:**
    - Added `resolvedUrlCache: Map<string, string>` property to cache resolved URLs
    - Created `resolveUrlWithCache(url: string): Promise<string>` helper method for URL resolution with caching
    - Updated `getEmbeddingModel(modelUrl: string, explicitType?: ModelArchitecture): Promise<any>` to resolve URLs before creating Essentia models (musicnn, tempocnn)
    - Updated `loadModelWithRetry` to use the cached resolution
    - Updated `predictWithModel` to resolve URLs for Essentia models
    - Updated `clearAllCaches()` to include the resolved URL cache

    - **Known pre-existing issue:** The "Backward Compatibility" tests in `MusicClassifier.test.ts` that passing strings directly as model URLs was removed in a previous refactor (`1ddd574`). - see commit `1ddd574` on GitHub. These tests should be updated to use objects instead of strings. or deleted entirely.
- Build passes with no new TypeScript errors
- Pre-existing "Backward Compatibility" tests failing due to legacy string model support being removed in commit `1ddd574`
"
   - Verified build passes with no new TypeScript errors

- [x] **4.4 Add integration tests**
  - [x] Test MusicClassifier with mock resolveUrl callback
  - [x] Test that resolved URLs are used for model loading
  - [x] Created `tests/integration/musicClassifier.resolveUrl.integration.test.ts` (20 tests)
  - Tests verify:
    - resolveUrl callback is accepted in MusicClassifierOptions
    - Callback works with different URL types (ar://, https://, path suffixes)
    - Integration with arweaveUtils (parseArweaveUrl, constructGatewayUrl, getAllGatewayUrls)
    - Gateway fallback logic behavior
  - Build passes with no new TypeScript errors
  - **Note:** Pre-existing "Backward Compatibility" test failure in `MusicClassifier.test.ts` is a known issue from commit `1ddd574` (string model URL support was removed)

---

## Phase 5: Update Showcase to Use Engine Exports

Remove duplicated code and import from engine.

- [x] **5.1 Update useMusicClassifier.ts**
  - [x] Import `arweaveGatewayManager` from `playlist-data-engine`
  - [x] Pass `resolveUrl: arweaveGatewayManager.resolveUrl.bind(arweaveGatewayManager)` to MusicClassifier options
  - [x] This enables automatic gateway resolution for model URLs

- [x] **5.2 Update audioPlayerStore.ts**
  - [x] Change import from `@/utils/arweaveGatewayManager` to `playlist-data-engine`
  - [x] Change import from `@/utils/arweaveUtils` to `playlist-data-engine`

- [x] **5.3 Update ArweaveImage.tsx**
  - [x] Change import from `../../utils/arweaveGatewayManager` to `playlist-data-engine`
  - [x] Change import from `../../utils/arweaveUtils` to `playlist-data-engine`

- [x] **5.4 Update test mocks**
  - [x] Update `ArweaveImage.test.tsx` mock path to `playlist-data-engine`
  - [x] Delete `arweaveGatewayManager.test.ts` (tests already moved to engine)

- [x] **5.5 Remove duplicate files from showcase**
  - [x] Delete `src/utils/arweaveGatewayManager.ts`
  - [x] Delete `src/utils/arweaveUtils.ts`
  - [x] Delete `src/utils/__tests__/arweaveGatewayManager.test.ts` (already deleted in task 5.4)
  - [x] Delete `src/utils/__tests__/arweaveUtils.test.ts`

- [x] **5.6 Update any remaining imports**
  - [x] Search for any other files importing from local arweaveUtils
  - [x] Update to import from engine (none found - all imports already updated)

---

## Phase 6: Fix MODEL_PRESETS Gateway URLs

Ensure default models use reliable gateways.

- [x] **6.1 Review MODEL_PRESETS in useMusicClassifier.ts**
  - [x] Replace `turbo-gateway.com` URLs with `arweave.net` equivalents
  - [x] The same txId can be accessed via any gateway

- [x] **6.2 Review DEFAULT_ARWEAVE_MODELS in MusicClassifier.ts**
  - [x] Update danceability model URL from turbo-gateway to arweave.net
  - [x] All other models already use arweave.net

- [x] **6.3 Document gateway independence**
  - [x] Add comment explaining that any gateway can serve any txId
  - [x] The resolveUrl mechanism will handle fallback automatically
  - [x] Added documentation to DEFAULT_ARWEAVE_MODELS in engine's MusicClassifier.ts
  - [x] Added documentation to MODEL_PRESETS in showcase's useMusicClassifier.ts

---

## Phase 7: Optional Enhancements

Future improvements that could be added.

- [x] **7.1 Add gateway resolution for images in engine**
  - [x] ColorExtractor could resolve image URLs before loading
    - Added `ColorExtractorOptions` interface with optional `resolveUrl` callback
    - ColorExtractor now resolves image URLs before loading using arweaveGatewayManager by default
    - Added 4 new tests for resolveUrl functionality in colorExtractor.test.ts
  - [x] PlaylistParser could resolve track images
    - Added `resolveUrl` and `resolveImageUrls` options to `PlaylistParserOptions`
    - When `resolveImageUrls: true`, playlist and track image URLs are resolved during parsing
    - Audio URLs are NOT resolved (only images) to maintain backward compatibility
    - Added 6 new tests for resolveUrl functionality in parser.test.ts
  - [x] Export new types from engine's index.ts
    - `ColorExtractorOptions` type exported
    - `PlaylistParserOptions` type exported

- [x] **7.2 Add prefetch/warmup capability**
  - [x] Method to pre-check and cache gateways for known txIds
    - Added `prefetchUrls(urls, options)` method for parallel URL resolution
    - Supports configurable concurrency (default: 5)
    - Returns detailed results with success/failure counts
  - [x] Useful for preloading model URLs on app startup
    - Types exported: `PrefetchOptions`, `PrefetchResult`, `PrefetchResultEntry`
    - Tests: 6 test cases covering parallel prefetch, caching, error handling
    - Fixed test bug: invalid txId lengths (39/35 chars instead of 43)

## Phase 7: Optional Enhancements

- [x] **7.3 Add gateway health monitoring**
  - [x] Track gateway response times
    - Added `GatewayHealthStats` interface for tracking health metrics per gateway
    - Added `recordGatewayResponse` private method to record response times
    - Added `getGatewayHealth` method to retrieve health stats for a specific gateway
    - Added `getAllGatewayHealth` method to retrieve health stats for all gateways
    - Updated `checkGateway` method to record response times for health tracking
  - [x] Dynamically adjust priorities based on performance
    - Added `adjustGatewayPriorities` method to reorder gateways based on health data
    - Uses stable sort to preserve original order when metrics are similar
    - Reassigns priorities based on new order
    - Logs priority adjustments
  - [x] Added `runHealthCheck` method
    - Tests each gateway by making a HEAD request
    - Records response time and health data
    - Returns `HealthCheckResult` with stats for each gateway
    - Can optionally adjust priorities after the check
  - [x] Added `resetGatewayPriorities` method to restore original priority order
    - Resets each gateway's priority to their original value
    - Re-sorts the array by original priority
  - [x] Added `clearHealthData` method to clear all health tracking data
  - [x] Document gateway independence (any gateway can serve any txId)
  - [x] The `runHealthCheck` method should be used for preloading model URLs on app startup

---

## Dependencies

- **Engine must be updated first** - Showcase depends on engine exports
- **Tests must pass in both packages** after each phase
- **TypeScript compilation** must succeed after each phase

---

## Questions/Unknowns

1. **Should the engine have a default resolveUrl in MusicClassifier?**
   - Option A: Require explicit `resolveUrl` callback (current plan)
   - Option B: Auto-import singleton and use by default
   - **Recommendation:** Option A for explicit dependency injection, easier testing

2. **Should gateway priority order be configurable?**
   - Currently hardcoded as: arweave.net, ar.io, ardrive.net, turbo-gateway.com
   - Could expose as configuration option
   - **Recommendation:** Keep hardcoded for now, add config if needed

3. **How to handle engine's Logger vs showcase's logger?**
   - Engine has `Logger` class with static methods
   - Showcase has `logger` singleton instance
   - **Recommendation:** Use engine's Logger in the migrated code

---

## File Changes Summary

### playlist-data-engine

| File | Action |
|------|--------|
| `src/utils/arweaveUtils.ts` | Modify - add pathSuffix support, getAllGatewayUrls |
| `src/utils/arweaveGatewayManager.ts` | Create - port from showcase |
| `src/core/analysis/MusicClassifier.ts` | Modify - add resolveUrl option |
| `src/index.ts` | Modify - add exports |
| `tests/unit/arweaveUtils.test.ts` | Create |
| `tests/unit/arweaveGatewayManager.test.ts` | Create - port from showcase |

### playlist-data-showcase

| File | Action |
|------|--------|
| `src/utils/arweaveUtils.ts` | Delete |
| `src/utils/arweaveGatewayManager.ts` | Delete |
| `src/utils/__tests__/arweaveUtils.test.ts` | Delete |
| `src/utils/__tests__/arweaveGatewayManager.test.ts` | Delete |
| `src/hooks/useMusicClassifier.ts` | Modify - use engine exports, pass resolveUrl |
| `src/store/audioPlayerStore.ts` | Modify - import from engine |
| `src/components/shared/ArweaveImage.tsx` | Modify - import from engine |
| `src/components/shared/__tests__/ArweaveImage.test.tsx` | Modify - update mock path |

---

## Success Criteria

- [ ] `turbo-gateway.com` failures automatically fall back to working gateways
- [ ] Model loading in MusicClassifier uses resolved URLs
- [ ] No duplicate code between engine and showcase
- [ ] All existing tests pass
- [ ] New tests in engine cover gateway manager functionality
- [ ] TypeScript compilation succeeds in both packages
