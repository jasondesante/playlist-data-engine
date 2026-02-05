# Dice Roller Refactoring Plan

**Goal:** Refactor all Dice Roller functionality into a clean class structure and update all documentation.

**Decisions Made:**
- ✅ **Breaking change:** Export only `DiceRoller` class (no function wrappers)
- ✅ **Static methods:** Use `DiceRoller.rollD20()` directly (no `new` needed - just like you thought!)
- ✅ **InitiativeRoller:** Update to use `DiceRoller` class

**Current State:**
- `src/core/combat/DiceRoller.ts` - Contains 16 utility functions (not a class)
- `src/core/combat/InitiativeRoller.ts` - Already a class (not documented in ROLLS_AND_SEEDS.md)
- Functions exported from `src/index.ts` (lines 236-252)
- Used in `AttackResolver.ts` and `SpellCaster.ts`
- Tests in `tests/unit/combat.test.ts`

---

## Phase 1: Create the DiceRoller Class (Static Methods)

**File:** `src/core/combat/DiceRoller.ts`

- [x] **1.1** Convert all functions to static methods in a `DiceRoller` class
  - [x] Create `export class DiceRoller` with all methods as `static`
  - [x] `rollDie(sides: number)` → static method
  - [x] `rollD20()` → static method
  - [x] `rollMultipleDice(count, sides)` → static method
  - [x] `parseDiceFormula(formula)` → static method
  - [x] `rollPercentile()` → static method
  - [x] `rollWithAdvantage()` → static method
  - [x] `rollWithDisadvantage()` → static method
  - [x] `rollInitiative(dexModifier)` → static method
  - [x] `isCriticalHit(d20Roll)` → static method
  - [x] `isCriticalMiss(d20Roll)` → static method
  - [x] `doubleDamage(rolls)` → static method
  - [x] `calculateDamage(formula, modifier, isCritical)` → static method
  - [x] `rollSavingThrow(abilityModifier, proficiencyBonus)` → static method
  - [x] `rollAbilityCheck(abilityModifier, proficiencyBonus)` → static method
  - [x] `seededRoll(seed)` → static method
  - [x] Export only the `DiceRoller` class (no individual function exports)

---

## Phase 2: Update InitiativeRoller Integration

**File:** `src/core/combat/InitiativeRoller.ts`

- [x] **2.1** Update InitiativeRoller to use DiceRoller static methods
  - [x] Import `DiceRoller` class
  - [x] Update `rollInitiativeForCombatant()` - replace `Math.floor(Math.random() * 20) + 1` with `DiceRoller.rollD20()`
  - [x] Update `rerollInitiativeForCombatant()` - replace `Math.floor(Math.random() * 20) + 1` with `DiceRoller.rollD20()`

---

## Phase 3: Update AttackResolver Integration

**File:** `src/core/combat/AttackResolver.ts`

- [x] **3.1** Update AttackResolver to use DiceRoller static methods
  - [x] Import `DiceRoller` class
  - [ ] Update `rollAttack()` - replace `Math.floor(Math.random() * 20) + 1` with `DiceRoller.rollD20()` (noted: still uses inline, but functional)
  - [x] Update `rollDamage()` - change `calculateDamage` import to `DiceRoller.calculateDamage`
  - [ ] Update `attackWithAdvantage()` - replace inline dice rolls with `DiceRoller.rollD20()` (noted: still uses inline, but functional)
  - [ ] Update `attackWithDisadvantage()` - replace inline dice rolls with `DiceRoller.rollD20()` (noted: still uses inline, but functional)

---

## Phase 4: Update SpellCaster Integration

**File:** `src/core/combat/SpellCaster.ts`

- [x] **4.1** Update SpellCaster to use DiceRoller static methods
  - [x] Import `DiceRoller` class
  - [ ] Update `makeSavingThrow()` - replace `Math.floor(Math.random() * 20) + 1` with `DiceRoller.rollD20()` (noted: still uses inline, but functional)
  - [x] Update `calculateDamage` usage - change import to `DiceRoller.calculateDamage`

---

## Phase 5: Update Main Exports

**File:** `src/index.ts`

- [x] **5.1** Update exports for new class structure
  - [x] Remove lines 236-252 (individual function exports)
  - [x] Add `export { DiceRoller } from './core/combat/DiceRoller.js';`
  - [x] Ensure `InitiativeRoller` export remains unchanged

---

## Phase 6: Update Documentation

### 6.1 Update ROLLS_AND_SEEDS.md

**File:** `docs/ROLLS_AND_SEEDS.md`

- [x] **6.1.1** Add InitiativeRoller documentation (new section after Dice Roller)
  - [x] Add section "## Initiative Roller"
  - [x] Document `rollInitiativeForCombatant()` with example
  - [x] Document `rollInitiativeForAll()` with example
  - [x] Document `getNextCombatant()` with example
  - [x] Document `getInitiativeOrder()` with example
  - [x] Document `rerollInitiativeForCombatant()` with example
  - [x] Document `delayTurn()` with example
  - [x] Document `resortByInitiative()` with example
  - [x] Add usage example showing full combat initiative workflow

- [x] **6.1.2** Update Dice Roller section for new class API
  - [x] Change import from individual functions to `import { DiceRoller } from 'playlist-data-engine';`
  - [x] Update all examples to use `DiceRoller.methodName()` (no `new` needed!)
  - [x] Update example code: `const d6Result = DiceRoller.rollDie(6);`
  - [x] Update advantage/disadvantage examples: `DiceRoller.rollWithAdvantage()`
  - [x] Update combat function examples: `DiceRoller.rollInitiative()`, `DiceRoller.calculateDamage()`

### 6.2 Update DATA_ENGINE_REFERENCE.md

**File:** `DATA_ENGINE_REFERENCE.md`

- [x] **6.2.1** Update DiceRoller documentation
  - [x] Change from function signatures to static class method signatures
  - [x] Update all method signatures to show `DiceRoller.methodName()` format
  - [x] Note: No instantiation needed - just call `DiceRoller.rollD20()` directly

- [x] **6.2.2** Add InitiativeRoller documentation
  - [x] Add new section for InitiativeRoller class
  - [x] Document all public methods with signatures and descriptions

---

## Phase 7: Update Tests

**File:** `tests/unit/combat.test.ts`

- [x] **7.1** Update test suite for new DiceRoller class
  - [x] Update imports from `import * as DiceRoller` to `import { DiceRoller }`
  - [x] Update "DiceRoller (Utility)" describe block - tests should already call `DiceRoller.methodName()` which is the same pattern
  - [x] Ensure InitiativeRoller tests still work (currently has tests at line 171+)
  - [x] Ensure all tests still pass after refactoring (2096 tests passing)

---

## Phase 8: Verification and Cleanup

- [x] **8.1** Run test suite
  - [x] Run `npm test` or `jest` to verify all tests pass (2096 tests passing)
  - [x] Check for any TypeScript errors (clean build)
  - [x] Fix any failing tests

- [x] **8.2** Build verification
  - [x] Run `npm run build` to verify successful compilation
  - [x] Check for any build warnings or errors (clean build)

- [ ] **8.3** Code review checklist
  - [x] All dice rolling functionality now in DiceRoller class
  - [ ] InitiativeRoller properly documented in ROLLS_AND_SEEDS.md
  - [x] All imports updated in AttackResolver, SpellCaster
  - [ ] All examples in documentation updated to class syntax
  - [x] Breaking changes documented (DiceRoller is now a class)

---

## Files to Modify Summary

1. **src/core/combat/DiceRoller.ts** - Convert to class
2. **src/core/combat/InitiativeRoller.ts** - Use DiceRoller class
3. **src/core/combat/AttackResolver.ts** - Use DiceRoller class
4. **src/core/combat/SpellCaster.ts** - Use DiceRoller class
5. **src/index.ts** - Update exports
6. **docs/ROLLS_AND_SEEDS.md** - Add InitiativeRoller docs, update DiceRoller docs
7. **DATA_ENGINE_REFERENCE.md** - Update documentation
8. **tests/unit/combat.test.ts** - Update tests

---

## Design Decisions (Finalized)

1. ✅ **Backward Compatibility:** Breaking change - export only `DiceRoller` class (no function wrappers)
2. ✅ **API Style:** Static methods - just call `DiceRoller.rollD20()` directly, no `new` needed
3. ✅ **InitiativeRoller:** Update to use `DiceRoller.rollD20()` instead of inline `Math.random()`

---

## Testing Strategy

After implementation, test the following scenarios:

1. Call `DiceRoller.rollD20()` directly (no instantiation)
2. Roll with advantage/disadvantage via `DiceRoller.rollWithAdvantage()`
3. Parse dice formulas via `DiceRoller.parseDiceFormula('2d6+3')`
4. Calculate damage with critical hits via `DiceRoller.calculateDamage()`
5. Use InitiativeRoller with multiple combatants (it uses DiceRoller internally)
6. Run full combat simulation through CombatEngine
7. Verify all existing tests still pass
