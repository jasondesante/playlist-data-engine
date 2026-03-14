# ResolveUrl Cleanup Plan

## Overview

Remove the optional `resolveUrl` parameter from all options interfaces since Arweave gateway resolution is now automatic by default. The `arweaveGatewayManager.resolveUrl` is used internally without requiring user configuration.

**Problem Statement:**
- `resolveUrl?:` is still exposed as an optional parameter in `MusicClassifierOptions`, `ColorExtractorOptions`, and `PlaylistParserOptions`
- Users shouldn't need to know about or configure gateway resolution - it should "just work"
- Documentation and migration plans reference the manual `resolveUrl` configuration

**Solution:**
Remove `resolveUrl` from all public options interfaces. Gateway resolution is now an implementation detail, not a user-configurable option.

---

## Phase 1: Remove resolveUrl from MusicClassifierOptions

- [x] **1.1 Update MusicClassifierOptions interface**
  - [x] Remove `resolveUrl?: (url: string) => Promise<string>` from the interface
  - [x] Update JSDoc to remove the "optional override" documentation
  - [x] The internal code (`loadModelWithRetry`) now uses `arweaveGatewayManager.resolveUrl` directly (no optional override)

- [x] **1.2 Update DEFAULT_ARWEAVE_MODELS JSDoc**
  - [x] Remove references to "pass resolveUrl..." in the documentation
  - [x] Clarify that gateway fallback is automatic

- [x] **1.3 Update MusicClassifier tests**
  - [x] Remove the `resolveUrl` option test from `MusicClassifier.test.ts` (removed the entire describe block)
  - [x] ~~Consider removing `tests/integration/musicClassifier.resolveUrl.integration.test.ts`~~ - Removed on 2026-03-14 (file tested deprecated functionality)

---

## Phase 2: Remove resolveUrl from ColorExtractorOptions

- [x] **2.1 Update ColorExtractorOptions interface**
  - [x] Remove `resolveUrl?: (url: string) => Promise<string>` from `src/core/analysis/ColorExtractor.ts`
  - [x] Update JSDoc to reflect automatic resolution

- [x] **2.2 Update ColorExtractor tests**
  - [x] Remove tests for `resolveUrl` in `colorExtractor.test.ts` (removed entire describe block with 4 tests)

---

## Phase 3: Remove resolveUrl from PlaylistParserOptions
- [x] **3.1 Update PlaylistParserOptions interface**
  - [x] Remove `resolveUrl?: (url: string) => Promise<string>` from `src/core/parser/PlaylistParser.ts`
  - [x] Update JSDoc to reflect automatic resolution

- [x] **3.2 Update PlaylistParser tests**
  - [x] Remove tests for `resolveUrl` in `parser.test.ts` (removed entire describe block with 7 tests)

---

## Phase 4: Update Showcase (playlist-data-showcase)

- [ ] **4.1 Remove resolveUrl from useMusicClassifier.ts**
  - [ ] Remove `resolveUrl: arweaveGatewayManager.resolveUrl.bind(arweaveGatewayManager)` from MusicClassifier instantiation
  - [ ] Gateway resolution is now automatic - no manual passing needed

- [ ] **4.2 Remove resolveUrl from ArweaveImage.tsx** (if present)
  - [ ] Check if ArweaveImage component passes resolveUrl
  - [ ] Remove if found

- [ ] **4.3 Update any other showcase files**
  - [ ] Search for any other `resolveUrl` usage in showcase
  - [ ] Remove or update as needed

---

## Phase 5: Update Documentation

- [ ] **5.1 Update ARWEAVE_GATEWAY_MANAGER_MIGRATION.md**
  - [ ] Update Phase 4 description to reflect automatic resolution (no manual passing)
  - [ ] Update "Questions/Unknowns" section - resolve question #1 is now resolved
  - [ ] Mark Phase 4 tasks as updated
  - [ ] Write update at the bottom of the plan explaining what was done wrong in ARWEAVE_GATEWAY_MANAGER_MIGRATION regarding resolveUrl

- [ ] **5.2 Update AUDIO_ANALYSIS.md**
  - [ ] Add section about automatic gateway resolution
  - [ ] Document that Arweave model URLs are automatically resolved with fallback
  - [ ] No user configuration needed for gateway resolution

- [ ] **5.3 Update engine's index.ts exports** (if needed)
  - [ ] Verify `MusicClassifierOptions` is still correctly exported
  - [ ] Ensure no breaking changes for consumers

---

## Phase 6: Final Verification

- [ ] **6.1 Run all unit tests**
  - [ ] `npm test` in playlist-data-engine
  - [ ] Verify no TypeScript compilation errors

- [ ] **6.2 Run all integration tests**
  - [ ] Verify resolveUrl integration tests still pass (or update/remove)

- [ ] **6.3 Build both packages**
  - [ ] `npm run build` in playlist-data-engine
  - [ ] `npm run build` in playlist-data-showcase

- [ ] **6.4 Verify showcase works**
  - [ ] Manual test that models load correctly
  - [ ] Verify gateway fallback works in development

---

## Dependencies

- Phase 4 (Showcase) depends on Phases 1-3 (Engine) being complete
- Phase 5 (Documentation) should be done last after code changes

---

## Files Changed

### playlist-data-engine

| File | Action |
|------|--------|
| `src/core/analysis/MusicClassifier.ts` | Modify - remove resolveUrl from options |
| `src/core/analysis/ColorExtractor.ts` | Modify - remove resolveUrl from options |
| `src/core/parser/PlaylistParser.ts` | Modify - remove resolveUrl from options |
| `src/index.ts` | Verify - no changes needed (types auto-updated) |
| `docs/plans/ARWEAVE_GATEWAY_MANAGER_MIGRATION.md` | Update documentation |
| `docs/AUDIO_ANALYSIS.md` | Add gateway resolution section |

### playlist-data-showcase

| File | Action |
|------|--------|
| `src/hooks/useMusicClassifier.ts` | Modify - remove resolveUrl option |
| `src/components/shared/ArweaveImage.tsx` | Check - may need updates |
| `src/components/shared/__tests__/ArweaveImage.test.tsx` | Check - may need updates |

---

## Questions/Unknowns

1. **Should we keep the resolveUrl parameter for advanced users?**
   - Pro: Power users might want custom resolution logic
   - Con: Adds complexity, YAGNI principle
   - **Recommendation:** Remove it completely. The default behavior covers 99% of use cases. If someone needs custom resolution, they can fork the code.

2. **What about the integration tests in `musicClassifier.resolveUrl.integration.test.ts`?**
   - These tests specifically test the resolveUrl callback behavior
   - Should be removed or significantly updated
   - **Recommendation:** Remove tests that are no longer relevant

---

## Success Criteria

- [ ] `resolveUrl` parameter removed from all options interfaces
- [ ] Gateway resolution works automatically without user configuration
- [ ] All tests pass in both engine and showcase
- [ ] Documentation updated to reflect automatic behavior
- [ ] No breaking changes for end users (options are just ignored if passed)
