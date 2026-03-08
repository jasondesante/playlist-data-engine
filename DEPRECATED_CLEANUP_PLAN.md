# Deprecated Items Cleanup Implementation Plan

## Overview
Clean up deprecated items in the playlist-data-engine project. This includes:
- Removing incorrect `@deprecated` tags from items that are actively used
- Removing truly deprecated items that have zero references
- Updating tests and documentation as needed

---

## Phase 1: Fix Incorrectly Marked Deprecated Items

These items are marked `@deprecated` but are actively used throughout the codebase. The deprecation tags should be removed.

### Task 1.1: Remove `@deprecated` from `isAbility`
- [x] Edit `src/core/utils/AbilityConstants.ts`
  - Removed the `@deprecated` JSDoc comment from the `isAbility` export
  - Updated comment to explain it's a valid alias (both names are equivalent and supported)
- [x] Verified no other changes needed (10 active references across 5 files)

**Current code (lines 33-37):**
```typescript
/**
 * Alias for isValidAbility for backwards compatibility
 * @deprecated Use isValidAbility instead
 */
export { isValidAbility as isAbility };
```

**Should become:**
```typescript
/**
 * Alias for isValidAbility - both names are equivalent and supported
 */
export { isValidAbility as isAbility };
```

### Task 1.2: Remove `@deprecated` from `BEAT_ACCURACY_THRESHOLDS`
- [x] Edit `src/core/types/BeatMap.ts`
  - Removed the `@deprecated` JSDoc comment
  - Updated comment to clarify it's the standard hard preset constant
- [x] Verified no other changes needed (8 files reference it including public API exports)

**Original code (lines 1300-1304):**
```typescript
/**
 * Default accuracy thresholds (Hard difficulty)
 * @deprecated Use HARD_ACCURACY_THRESHOLDS or getAccuracyThresholdsForPreset() instead
 */
export const BEAT_ACCURACY_THRESHOLDS: AccuracyThresholds = HARD_ACCURACY_THRESHOLDS;
```

**Updated to:**
```typescript
/**
 * Default accuracy thresholds (Hard difficulty preset)
 * Equivalent to HARD_ACCURACY_THRESHOLDS - use either constant
 */
export const BEAT_ACCURACY_THRESHOLDS: AccuracyThresholds = HARD_ACCURACY_THRESHOLDS;
```

---

## Phase 2: Remove Unused Deprecated Items

These items are marked `@deprecated` and have zero references outside their definition. Safe to remove.

### Task 2.1: Remove `getLevelForRarity()` from EnemyGenerator
- [x] Triple-check for any references (verified: 0 references outside definition)
- [x] Delete the method from `src/core/generation/EnemyGenerator.ts` (lines 1281-1301 including JSDoc)
- [x] Verify build passes
- [x] Verify tests pass (4386 tests passing)

**Method to remove:**
```typescript
private static getLevelForRarity(rarity: EnemyRarity): number { ... }
```

### Task 2.2: Remove `ADJECTIVE_DATA` from constants
- [ ] Triple-check for any references (already verified: 0 references, only definition exists)
- [ ] Delete the export from `src/utils/constants.ts` (lines 541-545)
- [ ] Verify build passes
- [ ] Verify tests pass

**Export to remove:**
```typescript
/**
 * Backward compatibility export
 * @deprecated Use NAMING_DATA.adjectives instead
 */
export const ADJECTIVE_DATA = NAMING_DATA.adjectives;
```

---

## Phase 3: Handle `getRarityFromCR()` (Used Only in Tests)

This method is marked deprecated and only referenced in:
- Its own definition in EnemyGenerator.ts
- A backward compatibility test in enemy-generation.test.ts
- Old plan documentation (can ignore)

### Task 3.1: Evaluate `getRarityFromCR()` removal
- [ ] Review if the backward compat test provides value
  - Test at `tests/unit/enemy-generation.test.ts:2495-2510` tests deprecated behavior
  - The test doesn't actually call `getRarityFromCR()` directly - it tests via `generateEncounterByCR`
- [ ] Decision: Remove both the method AND the backward compat test section

### Task 3.2: Remove `getRarityFromCR()` method
- [ ] Delete the method from `src/core/generation/EnemyGenerator.ts` (lines ~1348-1362)
- [ ] Delete the "Deprecated Methods Still Work" test section from `tests/unit/enemy-generation.test.ts` (lines ~2495-2510)

**Method to remove:**
```typescript
private static getRarityFromCR(cr: number): EnemyRarity { ... }
```

**Test section to remove:**
```typescript
describe('Deprecated Methods Still Work', () => {
    it('should support getRarityFromCR() for backward compatibility', () => {
        // ... entire test
    });
});
```

---

## Phase 4: Update Migration Comments

### Task 4.1: Update EnemyGenerator migration comment
- [ ] Review the migration comment at line 943
- [ ] Update or remove the "gradual migration" comment since deprecated fallbacks are being removed

**Current comment (lines 942-944):**
```typescript
// Calculate CR: use explicit CR or fall back to rarity-based CR (backward compat)
// This allows gradual migration to the new CR-based system
const cr = explicitCR ?? EnemyGenerator.getCRForRarity(rarity);
```

**After removing `getCRForRarity`, this logic needs updating:**
- If `getCRForRarity` is also being removed, the fallback needs to change to a default CR value
- OR keep `getCRForRarity` (it's NOT deprecated) and just update the comment

**Note:** `getCRForRarity()` is NOT deprecated and is used for the fallback. Only `getRarityFromCR()` is deprecated.

---

## Phase 5: Final Verification

### Task 5.1: Build and Test
- [ ] Run `npm run build` - verify no compilation errors
- [ ] Run `npm test` - verify all tests pass
- [ ] Run `npm run lint` (if available) - verify no new warnings

### Task 5.2: Search for any remaining `@deprecated` tags
- [ ] Search codebase for remaining `@deprecated` occurrences
- [ ] Verify all are intentional and correctly used

---

## Summary of Changes

| Item | Action | File |
|------|--------|------|
| `isAbility` | Remove `@deprecated` tag | AbilityConstants.ts |
| `BEAT_ACCURACY_THRESHOLDS` | Remove `@deprecated` tag | BeatMap.ts |
| `getLevelForRarity()` | Delete method | EnemyGenerator.ts |
| `ADJECTIVE_DATA` | Delete export | constants.ts |
| `getRarityFromCR()` | Delete method | EnemyGenerator.ts |
| Backward compat test | Delete test section | enemy-generation.test.ts |

---

## Dependencies
- None - all tasks are independent cleanup operations

## Questions/Unknowns
- None - research phase confirmed all usages
