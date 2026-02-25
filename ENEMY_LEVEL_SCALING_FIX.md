# Enemy Level Scaling Fix - Implementation Plan

## Overview

Fix the enemy generation system to properly scale enemy levels based on target Challenge Rating (CR) and completely decouple CR from Rarity. These are **two independent axes**:

| Concept | Determines | Examples |
|---------|------------|----------|
| **CR** | Power level (stats, HP, level, proficiency) | Weak beast vs. ancient dragon |
| **Rarity** | Complexity (abilities, resistances, legendary actions) | Simple guard vs. complex spellcaster |

**Key Design Principle:** Any CR can combine with any rarity:
- CR 0.25 + Boss = Goblin chieftain (weak but complex)
- CR 20 + Common = Ancient beast (powerful but simple)

**Root Cause:** Level is derived from rarity (1-4) instead of from target CR, and rarity is incorrectly derived from CR.

**Solution:**
1. Integrate existing `CRLevelConverter` for CR → level mapping
2. Remove `getRarityFromCR()` coupling - make rarity an independent parameter
3. Handle fractional CRs (0.25, 0.5) as "sub-level" enemies with reduced stats

---

## Phase 1: Core Fix - CRLevelConverter Integration

### Task 1.1: Import CRLevelConverter
- [x] Verify `CRLevelConverter.ts` exists and has `crToLevel()` function
- [x] Add import for `crToLevel` from `./CRLevelConverter` in EnemyGenerator.ts
- [x] Verify the import works with existing test suite

### Task 1.2: Add getLevelFromCR() Method
- [x] Create new private static method `getLevelFromCR(cr: number): number`
- [x] Use `crToLevel(cr)` for the conversion
- [x] Handle fractional CRs specially:
  - CR 0.25 → level 0.25 (sub-level enemy, reduced base stats)
  - CR 0.5 → level 0.5 (sub-level enemy, reduced base stats)
  - CR 1+ → level = CR (standard mapping)
- [x] Add JSDoc explaining CR ≈ level in D&D 5e
- [x] Deprecate `getLevelForRarity()` - level comes from CR, not rarity

### Task 1.3: Add getStatMultiplierForFractionalCR() Method
- [x] Create method to reduce stats for sub-level enemies:
  ```typescript
  private static getStatMultiplierForFractionalCR(cr: number): number {
      if (cr < 0.5) return 0.75;  // CR 0.25 = 75% stats
      if (cr < 1.0) return 0.85;  // CR 0.5 = 85% stats
      return 1.0;                  // CR 1+ = full stats
  }
  ```
- [x] Apply this multiplier BEFORE rarity's statMultiplier
  - Updated `scaleStatsForRarity()` to accept optional `cr` parameter
  - When CR is provided, applies fractional CR multiplier before rarity multiplier
  - Maintains backward compatibility when CR is not provided

### Task 1.4: Update generate() Method
- [x] Modify `generate()` signature:
  - Accept optional `level?: number` parameter (overrides CR-based level)
  - Accept **required** `cr: number` parameter (for stat scaling)
  - Rarity remains a parameter but does NOT affect level
- [x] Update level calculation:
  ```typescript
  const level = options.level ?? EnemyGenerator.getLevelFromCR(cr);
  ```
- [x] Apply fractional CR stat reduction before rarity multiplier

### Task 1.5: Update generateEncounterByCR() Method
- [x] Calculate level from targetCR using `getLevelFromCR()` (already handled in generate() via Task 1.4)
- [x] **Remove** `getRarityFromCR()` call - rarity should be explicit or default
- [x] Pass both `cr` and `rarity` separately to `generate()`
- [x] Add default rarity (e.g., 'common') if not specified (baseRarity already defaults to 'common')

**Files Modified:**
- `src/core/generation/EnemyGenerator.ts`

---

## Phase 2: Decouple Rarity from CR

### Task 2.1: Remove getRarityFromCR() Usage
- [x] Find all usages of `getRarityFromCR()` in the codebase
- [x] Replace with explicit rarity parameter or default value
- [x] Keep `getRarityFromCR()` as deprecated but don't remove (backward compat)

### Task 2.2: Update EncounterGenerationOptions
- [x] Add optional `defaultRarity?: EnemyRarity` parameter (note: `baseRarity` already exists with this purpose)
- [x] Default to 'common' if not specified (already implemented)
- [x] Add optional `scaleRarityWithCR?: boolean` parameter (default: **false** - opt-in)
- [x] Document that rarity is independent of CR by default

### Task 2.3: Implement CR-Based Gradual Rarity Scaling (Opt-In Feature)
- [x] When `scaleRarityWithCR: true` (opt-in) and generating multiple enemies:
  - Rarity scales **gradually with CR**
  - Start with all commons, upgrade one at a time as CR increases
  - **Boss**: Always single enemy (enforced - boss is always alone)
- [x] CR Tier definitions:
  ```typescript
  // CR Tiers and their upgrade points
  const CR_TIERS = {
      LOW:         { min: 0,    max: 2,   upgrades: 0 },  // CR 0-2
      LOW_MEDIUM:  { min: 3,    max: 5,   upgrades: 1 },  // CR 3-5
      MEDIUM:      { min: 6,    max: 10,  upgrades: 2 },  // CR 6-10
      MEDIUM_HIGH: { min: 11,   max: 15,  upgrades: 3 },  // CR 11-15
      HIGH:        { min: 16,   max: 20,  upgrades: 4 },  // CR 16-20
      VERY_HIGH:   { min: 21,   max: 30,  upgrades: 5 },  // CR 21-30
      EPIC:        { min: 31,   max: Infinity, upgrades: 6 }, // CR 30+
  };
  ```
- [x] Implementation approach:
  ```typescript
  function calculateUpgradePoints(cr: number): number {
      if (cr >= 31) return 6;  // Epic: CR 30+
      if (cr >= 21) return 5;  // Very High: CR 20-30
      if (cr >= 16) return 4;  // High: CR 16-20
      if (cr >= 11) return 3;  // Medium-High: CR 11-15
      if (cr >= 6)  return 2;  // Medium: CR 6-10
      if (cr >= 3)  return 1;  // Low-Medium: CR 3-5
      return 0;                // Low: CR 0-2
  }

  function getRarityDistribution(enemyCount: number, cr: number): EnemyRarity[] {
      const upgradePoints = calculateUpgradePoints(cr);
      const rarities: EnemyRarity[] = Array(enemyCount).fill('common');

      for (let i = 0; i < upgradePoints; i++) {
          const enemyIndex = i % enemyCount;
          rarities[enemyIndex] = upgradeRarity(rarities[enemyIndex]);
      }

      return rarities;
  }
  ```
- [x] When `scaleRarityWithCR: false` (default):
  - Use explicit `defaultRarity` for all enemies
  - No automatic scaling

### Task 2.4: Boss Always Single Rule
- [x] Add validation: if rarity is 'boss', enforce single enemy
- [x] Add error/warning if user requests boss + count > 1
- [x] Document that boss encounters are always 1vparty

### Task 2.5: Ensure Rarity Only Controls Complexity
- [x] Verify rarity controls ONLY:
  - `statMultiplier` (minor stat boost for complexity)
  - `signatureDieSize` (dice for signature abilities)
  - `extraAbilityCount` (additional special abilities)
  - `hasResistances` (damage resistances)
- [x] Rarity should NOT control level or base stats
- [x] Consider reducing `statMultiplier` values (currently 1.0-1.5x) since CR handles power
  - **DONE**: Reduced to 1.0/1.03/1.07/1.12 (max 12% instead of 50%)
  - Updated JSDoc in EnemyGenerator.ts to document the design principle
  - Updated EnemyRarity.ts header comments to clarify CR vs Rarity distinction

**Files Modified:**
- `src/core/generation/EnemyGenerator.ts`
- `src/core/types/Enemy.ts`
- `src/constants/EnemyRarity.ts`

---

## Phase 3: Update Type Definitions

### Task 3.1: Update EnemyGenerationOptions Interface
- [x] Add optional `level?: number` parameter (overrides CR-based level) - Already existed
- [x] Add **required** `cr: number` parameter (for power scaling) - Kept optional with strong recommendation for backward compat
- [x] Ensure `rarity` is independent (default to 'common') - Already existed
- [x] Add JSDoc explaining CR vs Rarity distinction - Enhanced with table and examples

### Task 3.2: Update EncounterGenerationOptions Interface
- [x] Add optional `defaultRarity?: EnemyRarity` parameter - Already existed as `baseRarity`
- [x] Add optional `scaleRarityWithCR?: boolean` parameter (default: **false**) - Already existed
- [x] Document that rarity is independent of targetCR by default - Already documented
- [x] Default to 'common' if not specified - Already documented

**Files Modified:**
- `src/core/types/Enemy.ts`

---

## Phase 4: Update Documentation

### Task 4.1: Fix ENEMY_GENERATION.md Discrepancies
- [x] Document the **CR vs Rarity** independence model
- [x] Add examples of combined CR + Rarity:
  - CR 0.25 + Boss = Goblin chieftain (weak but complex)
  - CR 20 + Common = Ancient beast (powerful but simple)
- [x] Document fractional CR stat reduction (75-85% base stats)
- [x] Update level scaling table to show CR → level mapping
- [x] Document that CRLevelConverter is now used

### Task 4.2: Update USAGE_IN_OTHER_PROJECTS.md
- [ ] Document the new `cr` parameter requirement
- [ ] Document the decoupled `rarity` parameter
- [ ] Provide examples of CR + Rarity combinations

**Files Modified:**
- `docs/ENEMY_GENERATION.md`
- `docs/USAGE_IN_OTHER_PROJECTS.md`

---

## Phase 5: Add Tests

### Task 5.1: Unit Tests for getLevelFromCR()
- [ ] Test CR 0.25 → level with reduced stats (75% multiplier)
- [ ] Test CR 0.5 → level with reduced stats (85% multiplier)
- [ ] Test CR 1 → level 1, full stats
- [ ] Test CR 5 → level 5
- [ ] Test CR 10 → level 10
- [ ] Test CR 20 → level 20

### Task 5.2: Integration Tests for CR + Rarity Independence
- [ ] Test CR 0.25 + common → weak simple enemy
- [ ] Test CR 0.25 + boss → weak complex enemy (goblin chieftain)
- [ ] Test CR 10 + common → strong simple enemy (ancient beast)
- [ ] Test CR 10 + boss → strong complex enemy (dragon)
- [ ] Verify rarity affects ability count, not level
- [ ] Verify CR affects level and base stats, not ability count

### Task 5.3: CR-Based Gradual Rarity Scaling Tests (Opt-In)
- [ ] Test `scaleRarityWithCR: false` (default) → uses explicit defaultRarity
- [ ] Test `scaleRarityWithCR: true` with various CR tiers:
  - [ ] CR 1 (Low) → [common, common, common]
  - [ ] CR 4 (Low-Medium) → [uncommon, common, common]
  - [ ] CR 8 (Medium) → [uncommon, uncommon, common]
  - [ ] CR 13 (Medium-High) → [uncommon, uncommon, uncommon]
  - [ ] CR 18 (High) → [elite, uncommon, uncommon]
  - [ ] CR 25 (Very High) → [elite, elite, uncommon]
  - [ ] CR 35 (Epic) → [elite, elite, elite]
- [ ] Test party of 5 with various CRs
- [ ] Test boss + count > 1 → error or auto-reduce to count=1
- [ ] Test CR applies correctly to each enemy regardless of scaled rarity

### Task 5.4: Fractional CR Tests
- [ ] Test CR 0.25 enemy has ~75% base stats
- [ ] Test CR 0.5 enemy has ~85% base stats
- [ ] Test CR 1+ enemy has 100% base stats
- [ ] Verify fractional CR + boss rarity works correctly

### Task 5.5: Backward Compatibility Tests
- [ ] Test existing code paths without explicit rarity default to 'common'
- [ ] Test existing `generate()` calls still work (with deprecation warnings)

**Files Modified:**
- `tests/unit/enemy-generation.test.ts`
- `tests/integration/enemy-encounter.test.ts`

---

## Phase 6: Verification

### Task 6.1: Run Full Test Suite
- [ ] Run `npm test` - all tests must pass
- [ ] Run integration tests
- [ ] Run linting (`npm run lint`)

### Task 6.2: Manual Verification - CR-Based Gradual Rarity (Opt-In)
- [ ] Generate party with `scaleRarityWithCR: false` → verify uses defaultRarity
- [ ] Generate party with `scaleRarityWithCR: true`:
  - [ ] CR 1 → verify all common
  - [ ] CR 8 → verify 2 uncommon + 1 common
  - [ ] CR 18 → verify 1 elite + 2 uncommon
  - [ ] CR 35 → verify all elite
- [ ] Generate boss encounter → verify count enforced to 1

### Task 6.3: Manual Verification - CR + Rarity Combinations
- [ ] Generate CR 0.25 + common → verify weak, simple enemy
- [ ] Generate CR 0.25 + boss → verify weak, complex enemy
- [ ] Generate CR 5 + common → verify level 5, simple enemy
- [ ] Generate CR 5 + boss → verify level 5, complex enemy
- [ ] Generate CR 20 + common → verify level 20, simple enemy
- [ ] Generate CR 20 + boss → verify level 20, complex enemy

### Task 6.4: Frontend Validation
- [ ] Use frontend export tools to capture generation data:
  - `generationConfig.targetCR` - What CR was requested
  - `generatedEnemies[].level` - What level enemies actually got
- [ ] Prove the fix works:
  - Before: `targetCR: 8, level: 4` (bug)
  - After: `targetCR: 8, level: 8` (fixed)
- [ ] Verify rarity is independent of CR in exports
- [ ] Test multiple CR values (1, 5, 10, 15, 20) to confirm proper scaling

---

## Key Files Summary

| File | Changes |
|------|---------|
| `src/core/generation/EnemyGenerator.ts` | Add getLevelFromCR(), getStatMultiplierForFractionalCR(), decouple rarity from CR |
| `src/core/generation/CRLevelConverter.ts` | Already exists, just needs to be imported |
| `src/core/types/Enemy.ts` | Add `cr` parameter, update `rarity` to be independent |
| `src/constants/EnemyRarity.ts` | May reduce statMultiplier values (since CR handles power) |
| `docs/ENEMY_GENERATION.md` | Document CR vs Rarity independence model |
| `tests/unit/enemy-generation.test.ts` | Add CR + Rarity combination tests |
| `tests/integration/enemy-encounter.test.ts` | Add verification tests |

---

## Dependencies

- No external dependencies
- `CRLevelConverter.ts` already exists and is well-tested
- **Breaking change:** `cr` parameter may become required (evaluate backward compatibility)

---

## Deferred for Later

| Question | Status | Notes |
|----------|--------|-------|
| Should `difficultyMultiplier` affect level? | **Deferred** | Currently only affects HP. Could add level scaling option in future. |

---

## Bug Location Reference (EnemyGenerator.ts)

| Method | Lines | Issue |
|--------|-------|-------|
| `getRarityFromCR()` | ~1232-1237 | Maps CR 2+ to 'boss', no differentiation |
| `getLevelForRarity()` | ~1181-1189 | Caps level at 4 (boss), ignores targetCR |
| `generate()` | ~939-941 | Uses rarity for level instead of CR |

**Existing Utility:** `CRLevelConverter.ts` has `crToLevel()` - use this instead of hardcoded mapping

---

## Resolved Design Decisions

| Question | Decision |
|----------|----------|
| Should fractional CRs be weaker? | **Yes** - CR 0.25 = 75% stats, CR 0.5 = 85% stats |
| Should CR affect rarity? | **No** - They are completely independent (per enemy) |
| Can you have CR 0.25 + boss? | **Yes** - Weak but complex enemy (goblin chieftain) |
| Can you have CR 20 + common? | **Yes** - Strong but simple enemy (ancient beast) |
| How does rarity work in multi-enemy encounters? | **Default: explicit rarity** - or opt-in to CR-based gradual scaling |
| Can bosses be in groups? | **No** - Bosses are always single enemies |
| Can users enable CR-based rarity scaling? | **Yes** - Set `scaleRarityWithCR: true` (opt-in) |
| Should difficultyMultiplier affect level? | **Deferred** - Currently only affects HP. Can revisit later. |

### CR-Based Gradual Rarity Scaling (Opt-In)

Set `scaleRarityWithCR: true` to enable automatic rarity scaling based on CR:

**CR Tier Definitions**

| CR Tier | CR Range | Upgrade Points | Party of 3 Result |
|---------|----------|----------------|-------------------|
| Low | 0-2 | 0 | [common, common, common] |
| Low-Medium | 3-5 | 1 | [uncommon, common, common] |
| Medium | 6-10 | 2 | [uncommon, uncommon, common] |
| Medium-High | 11-15 | 3 | [uncommon, uncommon, uncommon] |
| High | 16-20 | 4 | [elite, uncommon, uncommon] |
| Very High | 21-30 | 5 | [elite, elite, uncommon] |
| Epic | 30+ | 6 | [elite, elite, elite] |

**Upgrade Path:** common → uncommon → elite (per enemy)

**Default Behavior:** `scaleRarityWithCR: false` - use explicit `defaultRarity` for all enemies

**Note:** Boss rarity forces count = 1 (enforced)

---

## Expected Behavior After Fix

### CR → Level Mapping
| CR | Level | Stat Multiplier |
|----|-------|-----------------|
| 0.25 | 0.25 | 75% (sub-level) |
| 0.5 | 0.5 | 85% (sub-level) |
| 1 | 1 | 100% |
| 5 | 5 | 100% |
| 10 | 10 | 100% |
| 20 | 20 | 100% |

### CR + Rarity Combinations (Examples)
| CR | Rarity | Result | Example |
|----|--------|--------|---------|
| 0.25 | common | Weak, simple | Goblin grunt |
| 0.25 | boss | Weak, complex | Goblin chieftain |
| 5 | common | Strong, simple | Dire wolf |
| 5 | boss | Strong, complex | Werewolf alpha |
| 20 | common | Epic, simple | Ancient purple worm |
| 20 | boss | Epic, complex | Ancient red dragon |

**Key Insight:** CR determines power (level, stats), Rarity determines complexity (abilities, resistances). Any combination is valid.
