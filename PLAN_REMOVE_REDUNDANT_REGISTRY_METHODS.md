# Plan: Remove Redundant Registry Registration Methods

## Goal

Eliminate redundant registration methods from SpellRegistry, SkillRegistry, and FeatureRegistry in favor of using ExtensionManager.register() directly. This will:

1. **Simplify the API** - One canonical way to register content
2. **Clean up documentation** - Docs will emphasize ExtensionManager as the single source of truth
3. **Reduce code duplication** - No more convenience wrapper methods that just delegate
4. **Improve clarity** - Users go directly to ExtensionManager for all registration needs

## Decisions Made

- ✅ **Removal approach:** Remove methods outright (no deprecation period)
- ✅ **Test pattern:** Create helper functions in `tests/helpers/registrationHelpers.ts`
- ✅ **registerClassSpellList():** Move validation logic to ExtensionManager

---

## Current State

### Redundant Methods to Remove

| Registry | Methods | Approx. Usage Count |
|----------|---------|---------------------|
| **SpellRegistry** | `registerSpell()`, `registerSpells()` | ~6 test calls |
| **SpellRegistry** | `registerClassSpellList()` | ~0 test calls (validation moves to EM) |
| **SkillRegistry** | `registerSkill()`, `registerSkills()` | ~86 test calls |
| **FeatureRegistry** | `registerClassFeature()`, `registerClassFeatures()`, `registerRacialTrait()`, `registerRacialTraits()` | ~215 test calls |

**Note:** `registerClassSpellList()` will be removed, but its validation logic will be moved to ExtensionManager before removal.

### Documentation Files to Update

- `docs/DATA_ENGINE_REFERENCE.md`
- `docs/EXTENSIBILITY_GUIDE.md`
- `docs/PREREQUISITES.md`
- `docs/CUSTOM_CONTENT.md`
- `USAGE_IN_OTHER_PROJECTS.md`

---

# Implementation Plan

## Phase 1: Research and Discovery

### Task 1.1: Complete Method Usage Inventory

**Goal:** Create comprehensive list of all usage locations

**Sub-tasks:**
- [ ] Verify all `registerSpell()` usage locations from grep results
- [ ] Verify all `registerSpells()` usage locations from grep results
- [ ] Verify all `registerClassSpellList()` usage locations from grep results
- [ ] Verify all `registerSkill()` usage locations from grep results
- [ ] Verify all `registerSkills()` usage locations from grep results
- [ ] Verify all `registerClassFeature()` usage locations from grep results
- [ ] Verify all `registerClassFeatures()` usage locations from grep results
- [ ] Verify all `registerRacialTrait()` usage locations from grep results
- [ ] Verify all `registerRacialTraits()` usage locations from grep results
- [ ] Categorize usages by: test files, documentation, production code
- [ ] Create detailed inventory spreadsheet/table

**Expected Output:** Complete inventory file with file paths and line numbers

---

### Task 1.2: Validate ExtensionManager.register() Capabilities

**Goal:** Confirm ExtensionManager can handle all current registry use cases

**Sub-tasks:**
- [ ] Read `ExtensionManager.register()` method signature
- [ ] Verify validation is handled by ExtensionManager or validators
- [ ] Confirm duplicate detection works in ExtensionManager
- [ ] Verify spawn rate weights work with ExtensionManager
- [ ] Check if any special logic in registry methods needs to be preserved

**Files to Review:**
- [ ] `src/core/extensions/ExtensionManager.ts` - register() method
- [ ] `src/core/spells/SpellValidator.ts`
- [ ] `src/core/skills/SkillValidator.ts`
- [ ] `src/core/features/FeatureValidator.ts`

---

### Task 1.3: Identify Breaking Changes and Migration Path

**Goal:** Understand impact of removing convenience methods

**Sub-tasks:**
- [ ] Check if registry methods are exported in public API
- [ ] Check if any external projects might be using these methods
- [ ] Identify any deprecation notices needed
- [ ] Determine if migration helper is needed

**Files to Review:**
- [ ] `src/core/spells/index.ts` - exports
- [ ] `src/core/skills/index.ts` - exports
- [ ] `src/core/features/index.ts` - exports
- [ ] `USAGE_IN_OTHER_PROJECTS.md` - external usage examples

---

## Phase 2: Code Changes - SpellRegistry

### Task 2.0: Move registerClassSpellList() Validation to ExtensionManager

**File:** `src/core/extensions/ExtensionManager.ts`

**Goal:** Preserve the spell ID validation logic before removing the wrapper method

**Sub-tasks:**
- [ ] Read current `registerClassSpellList()` implementation in SpellRegistry.ts
- [ ] Add validation logic to `ExtensionManager.register()` for `spells.${ClassName}` categories
- [ ] Validation should: Get all spells from EM, check each spell ID exists, throw if not
- [ ] Test the validation works by trying to register invalid spell IDs
- [ ] TypeScript compilation check

**Implementation sketch:**
```typescript
// In ExtensionManager.register(), after line ~295
if (category.startsWith('spells.') && category !== 'spells') {
    const allSpells = this.get('spells') as RegisteredSpell[];
    const spellIds = data as string[];
    const spellIdSet = new Set(allSpells.map(s => s.id));
    const invalidIds = spellIds.filter(id => !spellIdSet.has(id));
    if (invalidIds.length > 0) {
        throw new Error(`Invalid spell IDs for ${category}: ${invalidIds.join(', ')}`);
    }
}
```

---

### Task 2.1: Remove SpellRegistry Registration Methods

**File:** `src/core/spells/SpellRegistry.ts`

**Sub-tasks:**
- [ ] Remove `registerSpell()` method (lines 88-107)
- [ ] Remove `registerSpells()` method (lines 116-137)
- [ ] Remove `registerClassSpellList()` method (lines 147-169) - validation now in EM
- [ ] Verify `invalidateCache()` is still used by query methods only
- [ ] TypeScript compilation check

**Methods to Keep (Query/Validation):**
- `getSpell()`
- `getSpells()`
- `getSpellsByLevel()`
- `getSpellsBySchool()`
- `getSpellsForClass()`
- `getAvailableSpells()`
- `getClassSpellList()`
- `getSpellSlotsForClass()`
- `validatePrerequisites()`
- `validateSpell()`
- `hasSpell()`
- `getSpellCount()`
- `getSpellsBySource()`
- `getRegistryStats()`

---

### Task 2.2: Update Test Files for SpellRegistry

**Test Files Identified:**
- `tests/documentation/examples-compilation.test.ts`

**Sub-tasks:**
- [ ] Replace `spellRegistry.registerSpell()` with `ExtensionManager.register('spells', [...])`
  - [ ] Line ~1381: `registerSpell()` call in test
  - [ ] Line ~1400: `registerSpell()` call in test
  - [ ] Line ~1541: `registerSpell()` call in test
- [ ] Replace `spellRegistry.registerSpells()` with `ExtensionManager.register('spells', [...])`
  - [ ] Line ~1467: `registerSpells()` call
  - [ ] Line ~1509: `registerSpells()` call
- [ ] Verify tests pass after changes
- [ ] Add cache invalidation calls where needed: `spellRegistry.invalidateCache()` (make public first)

**Note:** Need to make `invalidateCache()` public in SpellRegistry or handle cache invalidation differently

---

## Phase 3: Code Changes - SkillRegistry

### Task 3.1: Remove SkillRegistry Registration Methods

**File:** `src/core/skills/SkillRegistry.ts`

**Sub-tasks:**
- [ ] Remove `registerSkill()` method (lines 80-104)
- [ ] Remove `registerSkills()` method (lines 114-149)
- [ ] Verify `invalidateCache()` is public (already is)
- [ ] TypeScript compilation check

**Methods to Keep (Query/Validation):**
- `getSkill()`
- `getAllSkills()`
- `getSkillsByAbility()`
- `getSkillsByCategory()`
- `getCategories()`
- `getSkillsBySource()`
- `isValidSkill()`
- `validateSkill()`
- `validatePrerequisites()`
- `getRegistryStats()`
- `getSkillCount()`
- `getAvailableSkills()`
- `invalidateCache()`

---

### Task 3.2: Update Test Files for SkillRegistry

**Test Files Identified:**
- `tests/unit/skillRegistry.test.ts` (~6 calls)
- `tests/unit/skills.test.ts` (~20 calls)
- `tests/unit/skillPrerequisites.test.ts` (~12 calls)
- `tests/documentation/examples-compilation.test.ts` (~4 calls)
- `tests/documentation/prerequisitesExamples.test.ts` (~6 calls)
- `tests/integration/prerequisitesAndRaces.integration.test.ts` (~12 calls)
- `tests/integration/customFeaturesSkills.integration.test.ts` (~10 calls)
- `tests/integration/phase15.fullCustomContent.integration.test.ts` (~8 calls)

**Sub-tasks:**
- [ ] Create helper function for test setup: `registerTestSkill(skill)` that calls EM + invalidates cache
- [ ] Replace all `skillRegistry.registerSkill()` calls with helper
- [ ] Replace all `skillRegistry.registerSkills()` calls with helper
- [ ] Verify tests pass after changes
- [ ] Search for any missed usages

---

## Phase 4: Code Changes - FeatureRegistry

### Task 4.1: Remove FeatureRegistry Registration Methods

**File:** `src/core/features/FeatureRegistry.ts`

**Sub-tasks:**
- [ ] Remove `registerClassFeature()` method (lines 91-123)
- [ ] Remove `registerClassFeatures()` method (lines 125-168)
- [ ] Remove `registerRacialTrait()` method (lines 170-202)
- [ ] Remove `registerRacialTraits()` method (lines 204-247)
- [ ] Verify `invalidateCache()` is public (already is)
- [ ] TypeScript compilation check

**Methods to Keep (Query/Validation):**
- Class Features:
  - `getClassFeatures()`
  - `getFeaturesForLevel()`
  - `getClassFeatureById()`
  - `getAllClassFeatures()`
  - `validatePrerequisites()` (for class features)
- Racial Traits:
  - `getRacialTraits()`
  - `getBaseRacialTraits()`
  - `getRacialTraitsForSubrace()`
  - `getSubraceTraits()`
  - `getRacialTraitById()`
  - `getAllRacialTraits()`
  - `getAvailableSubraces()`
  - `getRaceForSubrace()`
- Shared:
  - `validateClassFeature()`
  - `validateRacialTrait()`
  - `getRegistryStats()`
  - `isInitialized()`
  - `invalidateCache()`

---

### Task 4.2: Update Test Files for FeatureRegistry

**Test Files Identified:**
- `tests/unit/featureRegistry.test.ts` (~25 calls)
- `tests/unit/levelUpProcessor.test.ts` (~30 calls)
- `tests/unit/subraces.test.ts` (~35 calls)
- `tests/unit/customRaces.test.ts` (~10 calls)
- `tests/documentation/examples-compilation.test.ts` (~5 calls)
- `tests/documentation/prerequisitesExamples.test.ts` (~6 calls)
- `tests/integration/featureIntegration.test.ts` (~8 calls)
- `tests/integration/racialTraitIntegration.test.ts` (~4 calls)
- `tests/integration/prerequisitesAndRaces.integration.test.ts` (~12 calls)
- `tests/integration/customFeaturesSkills.integration.test.ts` (~20 calls)
- `tests/integration/phase15.fullCustomContent.integration.test.ts` (~15 calls)
- `tests/integration/subraceStatBonus.integration.test.ts` (~10 calls)

**Sub-tasks:**
- [ ] Create helper function for test setup: `registerTestClassFeature(feature)` that calls EM + invalidates cache
- [ ] Create helper function for test setup: `registerTestRacialTrait(trait)` that calls EM + invalidates cache
- [ ] Replace all `featureRegistry.registerClassFeature()` calls with helper
- [ ] Replace all `featureRegistry.registerClassFeatures()` calls with helper
- [ ] Replace all `featureRegistry.registerRacialTrait()` calls with helper
- [ ] Replace all `featureRegistry.registerRacialTraits()` calls with helper
- [ ] Verify tests pass after changes
- [ ] Search for any missed usages

---

## Phase 5: Documentation Updates

### Task 5.1: Update DATA_ENGINE_REFERENCE.md

**Sections to Update:**
- SpellRegistry section (~line 4908)
- SkillRegistry section (~line 4639)
- FeatureRegistry section (~line 4312)

**Sub-tasks:**
- [ ] Remove registration method documentation from all three registries
  - [ ] SpellRegistry: `registerSpell()`, `registerSpells()`, `registerClassSpellList()`
  - [ ] SkillRegistry: `registerSkill()`, `registerSkills()`
  - [ ] FeatureRegistry: `registerClassFeature()`, `registerClassFeatures()`, `registerRacialTrait()`, `registerRacialTraits()`
- [ ] Add prominent note: "Registration is done via ExtensionManager.register()"
- [ ] Update Quick Reference tables to remove registration methods
- [ ] Add cross-reference links to ExtensionManager documentation
- [ ] Update example code blocks to use ExtensionManager

---

### Task 5.2: Update EXTENSIBILITY_GUIDE.md

**Sections to Update:**
- "Spells" section (~line 490)
- "Skills" section (~line 973)
- "Class Features" section (~line 697)
- "Racial Traits" section (~line 890)
- "Arctic Expansion Pack" example (~line 1543)

**Sub-tasks:**
- [ ] Replace all `SpellRegistry.registerSpell()` examples with `ExtensionManager.register('spells', [...])`
- [ ] Replace all `SkillRegistry.registerSkill()` examples with `ExtensionManager.register('skills', [...])`
- [ ] Replace all `FeatureRegistry.registerClassFeature()` examples with `ExtensionManager.register('classFeatures', [...])`
- [ ] Replace all `FeatureRegistry.registerRacialTrait()` examples with `ExtensionManager.register('racialTraits', [...])`
- [ ] Remove "convenience wrapper" notes (no longer accurate)
- [ ] Update registration pattern sections
- [ ] Verify all code examples compile

---

### Task 5.3: Update PREREQUISITES.md

**Sections to Update:**
- Examples using `SkillRegistry.registerSkill()` (~line 128)
- Examples using `FeatureRegistry.registerClassFeature()` (~line 298)
- Examples using `FeatureRegistry.registerRacialTrait()` (~line 461)

**Sub-tasks:**
- [ ] Find all `SkillRegistry.registerSkill()` usage and replace
- [ ] Find all `FeatureRegistry.registerClassFeature()` usage and replace
- [ ] Find all `FeatureRegistry.registerRacialTrait()` usage and replace
- [ ] Update examples to use ExtensionManager directly
- [ ] Verify examples still demonstrate prerequisite concepts correctly

---

### Task 5.4: Update CUSTOM_CONTENT.md

**Sections to Update:**
- Examples using `FeatureRegistry.registerRacialTrait()` (~line 240)

**Sub-tasks:**
- [ ] Replace `FeatureRegistry.registerRacialTrait()` with `ExtensionManager.register('racialTraits', [...])`
- [ ] Update custom content examples to use ExtensionManager pattern
- [ ] Ensure examples still demonstrate custom content concepts

---

### Task 5.5: Update USAGE_IN_OTHER_PROJECTS.md

**Sections to Update:**
- "Extensibility" section (~line 1756)
- "Dragon-Themed Content" example (~line 1107)

**Sub-tasks:**
- [ ] Update SkillRegistry description (remove "convenience wrapper" language)
- [ ] Update FeatureRegistry description (remove "convenience wrapper" language)
- [ ] Update SpellRegistry description if needed
- [ ] Replace example code using registry methods with ExtensionManager
- [ ] Update integration instructions

---

### Task 5.6: Create Migration Guide Section

**Location:** Add to `EXTENSIBILITY_GUIDE.md` or create new `MIGRATION.md`

**Sub-tasks:**
- [ ] Document old registration methods being removed
- [ ] Provide before/after code examples
- [ ] Explain ExtensionManager.register() pattern
- [ ] Document test helper functions for migration
- [ ] Add timeline/deprecation info if applicable

---

## Phase 6: Test Helper Infrastructure

### Task 6.1: Create Test Utility Functions

**New File:** `tests/helpers/registrationHelpers.ts`

**Sub-tasks:**
- [ ] Create `registerTestSpell(spell: Spell): void` function
  - Calls `ExtensionManager.register('spells', [...])`
  - Calls `SpellRegistry.getInstance().invalidateCache()` (need to make public first)
- [ ] Create `registerTestSkill(skill: CustomSkill): void` function
  - Calls `ExtensionManager.register('skills', [...])`
  - Calls `SkillRegistry.getInstance().invalidateCache()`
- [ ] Create `registerTestClassFeature(feature: ClassFeature): void` function
  - Calls `ExtensionManager.register('classFeatures', [...])`
  - Calls `FeatureRegistry.getInstance().invalidateCache()`
- [ ] Create `registerTestRacialTrait(trait: RacialTrait): void` function
  - Calls `ExtensionManager.register('racialTraits', [...])`
  - Calls `FeatureRegistry.getInstance().invalidateCache()`
- [ ] Export all helper functions
- [ ] Add JSDoc comments

---

### Task 6.2: Make SpellRegistry.invalidateCache() Public

**File:** `src/core/spells/SpellRegistry.ts`

**Sub-tasks:**
- [ ] Change `private invalidateCache()` to `public invalidateCache()`
- [ ] Update JSDoc comment to explain public API for manual invalidation after direct EM registration
- [ ] Verify consistency with SkillRegistry and FeatureRegistry (already public)

---

### Task 6.3: Update Test Imports

**Sub-tasks:**
- [ ] Add import for test helpers in affected test files
- [ ] Remove unused imports after migration
- [ ] Verify all imports are correct

---

## Phase 7: Verification

### Task 7.1: Compile-Time Verification

**Sub-tasks:**
- [ ] Run `npm run build` - verify no TypeScript errors
- [ ] Run `tsc --noEmit` - verify type checking passes
- [ ] Check for any implicit any types
- [ ] Verify no unused imports

---

### Task 7.2: Test Execution

**Sub-tasks:**
- [ ] Run `npm test` - verify all tests pass
- [ ] Run SpellRegistry-specific tests
- [ ] Run SkillRegistry-specific tests
- [ ] Run FeatureRegistry-specific tests
- [ ] Run integration tests
- [ ] Run documentation compilation tests
- [ ] Check test coverage is maintained

**Expected Test Counts:**
- SpellRegistry tests: Should pass
- SkillRegistry tests: ~153 tests
- FeatureRegistry tests: ~98 tests
- Documentation tests: Should compile

---

### Task 7.3: Documentation Verification

**Sub-tasks:**
- [ ] Read through all updated documentation sections
- [ ] Verify no references to removed methods remain
- [ ] Check code examples compile
- [ ] Verify consistency across all docs
- [ ] Check cross-references are correct
- [ ] Verify migration guide is complete

---

### Task 7.4: Runtime Verification (Manual)

**Sub-tasks:**
- [ ] Create test script registering spell via ExtensionManager
- [ ] Create test script registering skill via ExtensionManager
- [ ] Create test script registering feature via ExtensionManager
- [ ] Create test script registering trait via ExtensionManager
- [ ] Verify query methods work after registration
- [ ] Verify cache invalidation works
- [ ] Verify getRegistryStats() counts correctly

---

### Task 7.5: Search for Remaining References

**Sub-tasks:**
- [ ] Grep for `registerSpell` in entire codebase
- [ ] Grep for `registerSpells` in entire codebase
- [ ] Grep for `registerClassSpellList` in entire codebase
- [ ] Grep for `registerSkill` in entire codebase
- [ ] Grep for `registerSkills` in entire codebase
- [ ] Grep for `registerClassFeature` in entire codebase
- [ ] Grep for `registerClassFeatures` in entire codebase
- [ ] Grep for `registerRacialTrait` in entire codebase
- [ ] Grep for `registerRacialTraits` in entire codebase
- [ ] Verify any remaining references are intentional (e.g., in this plan file)

---

## Phase 8: Clean-up and Final Polish

### Task 8.1: Remove Dead Code

**Sub-tasks:**
- [ ] Check for unused imports in registry files
- [ ] Check for unused private methods in registry files
- [ ] Verify no commented-out code remains
- [ ] Remove any TODO comments related to removed methods

---

### Task 8.2: Update Comments and JSDoc

**Sub-tasks:**
- [ ] Update SpellRegistry class header comment
- [ ] Update SkillRegistry class header comment
- [ ] Update FeatureRegistry class header comment
- [ ] Remove JSDoc for removed methods
- [ ] Update JSDoc for query methods to clarify they read from EM

---

### Task 8.3: Final Documentation Review

**Sub-tasks:**
- [ ] Review DATA_ENGINE_REFERENCE.md for clarity
- [ ] Review EXTENSIBILITY_GUIDE.md for clarity
- [ ] Review PREREQUISITES.md for clarity
- [ ] Review CUSTOM_CONTENT.md for clarity
- [ ] Review USAGE_IN_OTHER_PROJECTS.md for clarity
- [ ] Ensure consistent terminology throughout

---

## Phase 9: Regression Prevention

### Task 9.1: Add Linting Rule (Optional)

**Sub-tasks:**
- [ ] Consider adding ESLint rule to prevent registry method usage
- [ ] Document pattern for code reviews

---

### Task 9.2: Update PLAN_REGISTRY_CONSOLIDATION.md

**Sub-tasks:**
- [ ] Add note about this follow-up work
- [ ] Link to this plan file
- [ ] Update success criteria if needed

---

## Phase 10: Issue Discovery and Re-iteration

### Task 10.1: Monitor for Issues

**Sub-tasks:**
- [ ] Watch for test failures after merge
- [ ] Watch for documentation issues
- [ ] Check for external project breakage
- [ ] Gather feedback

---

### Task 10.2: Create Follow-up Tasks if Needed

**Sub-tasks:**
- [ ] Document any discovered issues
- [ ] Create new plan tasks for fixes
- [ ] Update this plan with lessons learned
- [ ] Consider additional cleanup phases

---

## Success Criteria

1. [ ] All registration methods removed from SpellRegistry, SkillRegistry, FeatureRegistry
2. [ ] All tests updated to use ExtensionManager.register() or test helpers
3. [ ] All documentation updated to emphasize ExtensionManager
4. [ ] No remaining references to removed methods in code or docs
5. [ ] All tests pass
6. [ ] TypeScript compilation succeeds
7. [ ] Documentation examples compile
8. [ ] Query methods still work correctly via ExtensionManager data
9. [ ] Cache invalidation works after direct EM registration
10. [ ] Code is cleaner and more maintainable

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking external projects | High | Review USAGE_IN_OTHER_PROJECTS.md, check exports |
| Test breakage | Medium | Comprehensive test file inventory, helper functions |
| Documentation drift | Medium | Systematic doc review, cross-reference check |
| Cache invalidation issues | Low | Make invalidateCache() public, test helpers call it |
| Missed usages | Low | Comprehensive grep search, Phase 7.5 |

---

## File Change Summary

| File | Type | Changes |
|------|------|---------|
| `src/core/spells/SpellRegistry.ts` | Modify | Remove 3 registration methods, make invalidateCache() public |
| `src/core/skills/SkillRegistry.ts` | Modify | Remove 2 registration methods |
| `src/core/features/FeatureRegistry.ts` | Modify | Remove 4 registration methods |
| `tests/helpers/registrationHelpers.ts` | Create | New test helper functions |
| `tests/documentation/examples-compilation.test.ts` | Modify | Update spell/skill/feature registration calls |
| `tests/unit/*.test.ts` | Modify | Update registration calls (~10 files) |
| `tests/integration/*.test.ts` | Modify | Update registration calls (~8 files) |
| `docs/DATA_ENGINE_REFERENCE.md` | Modify | Remove registration method docs |
| `docs/EXTENSIBILITY_GUIDE.md` | Modify | Update examples, remove wrapper notes |
| `docs/PREREQUISITES.md` | Modify | Update examples |
| `docs/CUSTOM_CONTENT.md` | Modify | Update examples |
| `USAGE_IN_OTHER_PROJECTS.md` | Modify | Update examples, remove wrapper language |

---

## Timeline Estimate

- **Phase 1 (Research):** ~1 hour
- **Phase 2-4 (Code Changes):** ~2-3 hours
- **Phase 5 (Documentation):** ~1-2 hours
- **Phase 6 (Test Infrastructure):** ~30 minutes
- **Phase 7 (Verification):** ~1 hour
- **Phase 8 (Clean-up):** ~30 minutes
- **Total:** ~6-8 hours

---

## Notes

- Keep query/registration methods separate in mind
- Query methods are NOT being removed - they're useful
- Only registration methods that delegate to ExtensionManager are being removed
- Tests will use helper functions to reduce verbosity
- Documentation will have one clear path: ExtensionManager.register()
