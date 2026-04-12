# Arweave Gateway Manager Fix Plan

## Overview
The gateway manager blindly trusts the active gateway, has no cancellation support, and cannot distinguish between user-initiated cancels and real failures. This causes 60+ second hangs on bad gateways and poisons gateway state when users switch tracks.

## Phase 1: Smart Active Gateway (HIGH — solves the core problem)

### Task 1.1: Add response-time tracking for the active gateway
- [x] 1.1.1 Add a `lastFetchTiming` field to `ArweaveGatewayManager` that records the time of the most recent successful resolve/fetch for the active gateway
- [x] 1.1.2 Add a `consecutiveSlowResponses` counter — increment when a fetch takes longer than a configurable threshold (e.g., 8s), reset on fast responses
- [x] 1.1.3 Add a `reportFetchSuccess(timingMs: number)` public method — callers invoke this after a successful fetch to feed timing data back to the manager
- [x] 1.1.4 In `resolveUrl()`, if `consecutiveSlowResponses >= 3`, skip the active gateway and run `findAndSetGateway()` instead (proactive rotation before it fully dies)

### Task 1.2: Add AbortSignal support to `resolveUrl()` and `reportGatewayFailure()`
- [x] 1.2.1 Add optional `signal?: AbortSignal` parameter to `resolveUrl()`
- [x] 1.2.2 Pass the signal through to `findAndSetGateway()` → `checkGateway()` (wire into the existing `AbortController`)
- [x] 1.2.3 If the signal is already aborted when `resolveUrl()` is called, return the original URL immediately
- [x] 1.2.4 Add `signal?: AbortSignal` to `reportGatewayFailure()` as well, pass through
- [x] 1.2.5 Update `index.ts` exports — the public API signature changes are backward-compatible (optional param)

### Task 1.3: Parallel gateway checking in `findAndSetGateway()`
- [x] 1.3.1 Replace the sequential `for` loop over static gateways with `Promise.any()` — fire all HEAD checks concurrently, use the first that succeeds
- [x] 1.3.2 Each individual HEAD check still uses its own `AbortController` with the 5s timeout
- [x] 1.3.3 When one succeeds via `Promise.any()`, abort all the others to avoid wasted connections
- [x] 1.3.4 Keep Wayfinder as a parallel contender — race it against the static gateways in the same `Promise.any()`
- [x] 1.3.5 Worst case is now 5 seconds (one timeout) instead of ~25 seconds (sequential)

### Task 1.4: Track real fetch performance, not just HEAD
- [x] 1.4.1 Export a new `reportFetchTiming(host: string, timingMs: number, success: boolean)` method — feeds real data-transfer timing into `healthData`
- [x] 1.4.2 In `findAndSetGateway()`, when multiple gateways respond to HEAD, prefer the one with the best historical fetch-time average from `healthData` (tie-break by priority)
- [x] 1.4.3 `recordGatewayResponse()` already exists — reuse it. `reportFetchTiming` just calls `recordGatewayResponse()` with the real timing data

## Phase 2: Smart Cancellation (HIGH — prevents state poisoning)

### Task 2.1: Add `reportGatewayFailure` reason parameter
- [x] 2.1.1 Add an options parameter to `reportGatewayFailure`: `reportGatewayFailure(url: string, options?: { signal?: AbortSignal; reason?: 'load-error' | 'user-cancel-slow' | 'user-cancel-fast' })`
- [x] 2.1.2 When `reason === 'user-cancel-fast'`, do NOT clear the active gateway or cache — just return the original URL (user intentionally cancelled, gateway is probably fine)
- [x] 2.1.3 When `reason === 'user-cancel-slow'` (user cancelled after 5+ seconds), treat as implicit failure — clear active gateway, find new one (same as current behavior)
- [x] 2.1.4 When `reason === 'load-error'` or omitted, keep current behavior (full failure cycle)
- [x] 2.1.5 Backward compatible — `options` is optional, defaults to current behavior

### Task 2.2: Update audioPlayerStore.ts to distinguish cancellation from failure
- [x] 2.2.1 Track `loadStartTime` when audio loading begins (set in `play()`, `togglePlay()`, `load()` when `audio.src` is set)
- [x] 2.2.2 In the `error` event handler, check if the error happened because user switched tracks or stopped:
  - If `store.playbackState` was just changed to `'loading'` for a **different** URL, the error is from the old track — treat as `user-cancel-fast` if <5s elapsed since `loadStartTime`, or `user-cancel-slow` if >=5s
  - If `store.playbackState === 'idle'` (user called `stop()`), treat as `user-cancel-fast` if <5s
  - Otherwise it's a real `load-error`
- [x] 2.2.3 Pass the appropriate reason to `reportGatewayFailure()`
- [x] 2.2.4 Create a shared `AbortController` in the audio player store — abort it on track switch/stop so `resolveUrl()` can be cancelled

### Task 2.3: Update other callers of `reportGatewayFailure()`
- [x] 2.3.1 `usePlaylistParser.ts:84` — this is a real network error, pass `reason: 'load-error'` (explicit but same behavior)
- [x] 2.3.2 `ArweaveImage.tsx:170` — this is an image load failure, pass `reason: 'load-error'`
- [x] 2.3.3 `CombatSimulatorTab.tsx:1015` — network error on import, pass `reason: 'load-error'`

## Phase 3: Persisted Gateway TTL & Health-Aware Resolution (MEDIUM)

### Task 3.1: Add TTL to persisted gateway in localStorage
- [x] 3.1.1 When persisting gateway, include a `timestamp` field: `{ host, protocol, priority, timestamp: Date.now() }`
- [x] 3.1.2 In `loadPersistedGateway()`, check if the stored gateway is older than 30 minutes — if so, ignore it and return null (forces fresh discovery)
- [x] 3.1.3 This prevents a dead gateway from being reused across sessions

### Task 3.2: Use health data during normal resolution to skip bad gateways
- [x] 3.2.1 In `findAndSetGateway()`, filter out gateways whose `healthData` shows >70% failure rate AND at least 3 checks (don't skip gateways with insufficient data)
- [x] 3.2.2 Log when a gateway is skipped: "Skipping gateway X due to poor health (Y% failure rate)"
- [x] 3.2.3 Don't skip the last remaining gateway — always keep at least one candidate

## Phase 4: Update Tests

### Task 4.1: Update existing tests
- [x] 4.1.1 Update `arweaveGatewayManager.test.ts` — existing tests should still pass (backward-compatible changes)
- [x] 4.1.2 Add test: `resolveUrl` with pre-aborted signal returns original URL
- [x] 4.1.3 Add test: `resolveUrl` aborts in-flight checks when signal fires
- [x] 4.1.4 Add test: `reportGatewayFailure` with `user-cancel-fast` does NOT clear active gateway
- [x] 4.1.5 Add test: `reportGatewayFailure` with `user-cancel-slow` DOES clear active gateway
- [x] 4.1.6 Add test: persisted gateway older than 30 minutes is ignored
- [x] 4.1.7 Add test: parallel gateway checking returns first responding gateway
- [x] 4.1.8 Add test: gateways with >70% failure rate are skipped during resolution

### Task 4.2: Update demo app tests
- [x] 4.2.1 Update `ArweaveImage.test.tsx` if mock signatures change (they shouldn't — backward compatible)

## Dependencies
- Phase 1 tasks are independent of each other and can be done in any order
- Phase 2 depends on Phase 1.2 (AbortSignal support)
- Phase 3 is independent
- Phase 4 depends on all other phases

## Files Changed
- `playlist-data-engine/src/utils/arweaveGatewayManager.ts` — main changes (Phases 1, 2.1, 3)
- `playlist-data-engine/src/index.ts` — export any new types if needed
- `playlist-data-showcase/src/store/audioPlayerStore.ts` — cancellation logic (Phase 2.2)
- `playlist-data-showcase/src/hooks/usePlaylistParser.ts` — explicit reason (Phase 2.3)
- `playlist-data-showcase/src/components/shared/ArweaveImage.tsx` — explicit reason (Phase 2.3)
- `playlist-data-showcase/src/components/Tabs/CombatSimulatorTab.tsx` — explicit reason (Phase 2.3)
- `playlist-data-engine/tests/unit/arweaveGatewayManager.test.ts` — new tests (Phase 4)
