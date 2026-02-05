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

## Progress Summary

### Phase 1: Research and Discovery - ✅ COMPLETED
All tasks in Phase 1 have been completed. Key findings:
- Created comprehensive usage inventory (`METHOD_USAGE_INVENTORY.md`)
- Identified ~307 test calls that need migration
- No production code uses these methods (only tests and docs)
- ExtensionManager can handle all registration use cases EXCEPT:
  1. Duplicate ID detection (needs to be added)
  2. Spell list spell ID validation (needs to be moved from SpellRegistry)

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
- [x] Verify all `registerSpell()` usage locations from grep results
- [x] Verify all `registerSpells()` usage locations from grep results
- [x] Verify all `registerClassSpellList()` usage locations from grep results
- [x] Verify all `registerSkill()` usage locations from grep results
- [x] Verify all `registerSkills()` usage locations from grep results
- [x] Verify all `registerClassFeature()` usage locations from grep results
- [x] Verify all `registerClassFeatures()` usage locations from grep results
- [x] Verify all `registerRacialTrait()` usage locations from grep results
- [x] Verify all `registerRacialTraits()` usage locations from grep results
- [x] Categorize usages by: test files, documentation, production code
- [x] Create detailed inventory spreadsheet/table

**Expected Output:** Complete inventory file with file paths and line numbers

**Status:** ✅ COMPLETED
- Inventory created at `METHOD_USAGE_INVENTORY.md`
- All methods verified across 21 test files and 15 documentation files
- No production code usage found (all usage is in tests/docs)
- Total ~307 test calls to replace across all registries

---

### Task 1.2: Validate ExtensionManager.register() Capabilities

**Goal:** Confirm ExtensionManager can handle all current registry use cases

**Sub-tasks:**
- [x] Read `ExtensionManager.register()` method signature
- [x] Verify validation is handled by ExtensionManager or validators
- [x] Confirm duplicate detection works in ExtensionManager
- [x] Verify spawn rate weights work with ExtensionManager
- [x] Check if any special logic in registry methods needs to be preserved

**Files to Review:**
- [x] `src/core/extensions/ExtensionManager.ts` - register() method
- [x] `src/core/spells/SpellValidator.ts`
- [x] `src/core/skills/SkillValidator.ts`
- [x] `src/core/features/FeatureValidator.ts`

**Status:** ✅ COMPLETED

**Findings:**

1. **ExtensionManager.register() signature** (lines 266-306):
   ```typescript
   register(category: ExtensionCategory, items: any[], options: ExtensionOptions = {}): void
   ```
   - Supports all needed categories: `spells`, `skills`, `classFeatures`, `racialTraits`
   - Has validation support via `validate` option (default: true)
   - Handles merge modes via `mode` option (relative, absolute, default, replace)
   - Has `weights` option for spawn rate control

2. **Validation is already delegated to Validators**:
   - ExtensionManager.validate() (lines 455-474) calls category-specific validators
   - Spells: Uses SpellValidator.validateSpell() at line 502
   - Skills: Uses SkillValidator.validateSkill() at line 663
   - Features: Uses FeatureValidator.validateClassFeature/validateRacialTrait() at lines 649, 656
   - All validation happens BEFORE registration in ExtensionManager

3. **Duplicate Detection**:
   - ✅ ExtensionManager does NOT handle duplicate detection
   - ❌ Registry methods have duplicate detection that needs to be preserved:
     - SkillRegistry.registerSkill(): Lines 88-91 check for duplicate skill IDs
     - FeatureRegistry.registerClassFeature(): Lines 99-102 check for duplicate feature IDs
     - FeatureRegistry.registerRacialTrait(): Lines 178-181 check for duplicate trait IDs
   - **Decision needed**: Should duplicate detection be added to ExtensionManager or handled in validators?

4. **Special Logic to Preserve**:
   - **SpellRegistry.registerClassSpellList()** (lines 156-178):
     - Validates spell IDs exist before registering spell list
     - This validation needs to be moved to ExtensionManager before removal
     - Implementation in Task 2.0

5. **Cache Invalidation**:
   - ✅ All registries have public `invalidateCache()` method (except SpellRegistry which is private)
   - After calling ExtensionManager.register() directly, users must call `registry.invalidateCache()`
   - Task 6.2 will make SpellRegistry.invalidateCache() public

6. **Spawn Rate Weights**:
   - ✅ ExtensionManager fully supports spawn rate weights via `options.weights`
   - Works correctly with all categories

**Conclusion**: ExtensionManager can handle all registration use cases EXCEPT:
1. Duplicate ID detection (needs to be added)
2. Spell list spell ID validation (needs to be moved from SpellRegistry)

---

### Task 1.3: Identify Breaking Changes and Migration Path

**Goal:** Understand impact of removing convenience methods

**Sub-tasks:**
- [x] Check if registry methods are exported in public API
- [x] Check if any external projects might be using these methods
- [x] Identify any deprecation notices needed
- [x] Determine if migration helper is needed

**Files to Review:**
- [x] `src/core/spells/index.ts` - exports
- [x] `src/core/skills/index.ts` - exports
- [x] `src/core/features/index.ts` - exports
- [x] `USAGE_IN_OTHER_PROJECTS.md` - external usage examples

**Status:** ✅ COMPLETED

**Findings:**

1. **Public API Exports** (src/index.ts):
   - ✅ SpellRegistry is exported (line 334)
   - ✅ SkillRegistry is exported (line 301)
   - ✅ FeatureRegistry is exported (line 272)
   - The registries themselves are part of the public API
   - The registration methods are instance methods on these registries
   - **Impact**: Breaking change - removing methods is a public API change

2. **External Usage** (USAGE_IN_OTHER_PROJECTS.md):
   - Usage_IN_OTHER_PROJECTS.md shows examples using both:
     - ExtensionManager.register() directly
     - Registry convenience wrappers
   - Both patterns are documented as valid
   - **Impact**: External projects may be using either pattern

3. **Deprecation Notices**:
   - Current docs say convenience wrappers are valid approaches
   - Decision already made: Remove methods outright (no deprecation period)
   - **Action needed**: Documentation must be updated before release

4. **Migration Helper**:
   - Plan already specifies creating test helpers in tests/helpers/registrationHelpers.ts
   - Test helpers will make migration easier for internal code
   - **No user-facing migration helper needed** - users will use ExtensionManager directly

**Breaking Change Assessment**:
- **Severity**: MEDIUM-HIGH
- **Scope**: All users who use registry convenience methods
- **Mitigation**: Clear documentation updates before release
- **Rollback**: Not possible without re-adding methods

---

## Phase 2: Code Changes - SpellRegistry

### Task 2.0: Move registerClassSpellList() Validation to ExtensionManager

**File:** `src/core/extensions/ExtensionManager.ts`

**Goal:** Preserve the spell ID validation logic before removing the wrapper method

**Sub-tasks:**
- [x] Read current `registerClassSpellList()` implementation in SpellRegistry.ts
- [x] Add validation logic to `ExtensionManager.register()` for `spells.${ClassName}` categories
- [x] Validation should: Get all spells from EM, check each spell ID exists, throw if not
- [x] Test the validation works by trying to register invalid spell IDs
- [x] TypeScript compilation check

**Status:** ✅ COMPLETED
- Validation logic added at lines 287-306 in ExtensionManager.ts
- Gets all spells from `spells` category via `this.get('spells')`
- Creates a Set of spell IDs for efficient lookup
- Validates each spell ID in the items array
- Throws descriptive error if any invalid spell IDs found
- TypeScript compilation passes
- Build completes successfully

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
- [x] Remove `registerSpell()` method (lines 88-107)
- [x] Remove `registerSpells()` method (lines 116-137)
- [x] Remove `registerClassSpellList()` method (lines 147-169) - validation now in EM
- [x] Verify `invalidateCache()` is still used by query methods only
- [x] TypeScript compilation check

**Status:** ✅ COMPLETED
- All three registration methods removed from SpellRegistry
- `invalidateCache()` made public (also completed Task 6.2 ahead of schedule)
- Class and module documentation updated to reflect ExtensionManager as the registration method
- Test files updated to use `ExtensionManager.register()` directly
- Fixed incomplete spell examples in documentation compilation tests (pre-existing bug)
- All 84 examples-compilation tests passing

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
- [x] Replace `spellRegistry.registerSpell()` with `ExtensionManager.register('spells', [...])`
  - [x] Line ~1381: `registerSpell()` call in test
  - [x] Line ~1400: `registerSpell()` call in test
  - [x] Line ~1541: `registerSpell()` call in test
- [x] Replace `spellRegistry.registerSpells()` with `ExtensionManager.register('spells', [...])`
  - [x] Line ~1467: `registerSpells()` call
  - [x] Line ~1509: `registerSpells()` call
- [x] Verify tests pass after changes
- [x] Add cache invalidation calls where needed: `spellRegistry.invalidateCache()` (made public)

**Status:** ✅ COMPLETED (completed as part of Task 2.1)
- All 4 registration calls updated to use ExtensionManager.register()
- Added `spellRegistry.invalidateCache()` calls after each registration
- Fixed incomplete spell objects in content pack examples (pre-existing bug)
- All 84 examples-compilation tests passing

---

## Phase 3: Code Changes - SkillRegistry

### Task 3.1: Remove SkillRegistry Registration Methods

**File:** `src/core/skills/SkillRegistry.ts`

**Sub-tasks:**
- [x] Remove `registerSkill()` method (lines 80-104)
- [x] Remove `registerSkills()` method (lines 114-149)
- [x] Verify `invalidateCache()` is public (already is)
- [x] TypeScript compilation check

**Status:** ✅ COMPLETED
- Both `registerSkill()` and `registerSkills()` methods removed
- `invalidateCache()` is public (line 70)
- Class documentation updated to remove "convenience wrapper" language
- Build passes successfully (no new errors introduced)
- Pre-existing lint errors in test files remain (not introduced by this change)

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
- [x] Create helper function for test setup: `registerTestSkill(skill)` that calls EM + invalidates cache
- [x] Replace all `skillRegistry.registerSkill()` calls with helper
- [x] Replace all `skillRegistry.registerSkills()` calls with helper
- [x] Verify tests pass after changes
- [x] Search for any missed usages

**Status:** ✅ COMPLETED
- Created `tests/helpers/registrationHelpers.ts` with helper functions
- Updated all test files to use helper functions instead of removed methods
- All 153 skill-related tests passing
- Build passes without errors
- Remaining grep results are in documentation/verification files (code examples, not actual usage)

---

## Phase 4: Code Changes - FeatureRegistry

### Task 4.1: Remove FeatureRegistry Registration Methods

**File:** `src/core/features/FeatureRegistry.ts`

**Sub-tasks:**
- [x] Remove `registerClassFeature()` method (lines 91-123)
- [x] Remove `registerClassFeatures()` method (lines 125-168)
- [x] Remove `registerRacialTrait()` method (lines 170-202)
- [x] Remove `registerRacialTraits()` method (lines 204-247)
- [x] Remove static `registerEquipmentFeature()` method
- [x] Remove unused `validateClassFeature` and `validateRacialTrait` imports
- [x] Verify `invalidateCache()` is public (already is)
- [x] TypeScript compilation check

**Status:** ✅ COMPLETED
- All four registration methods removed (`registerClassFeature`, `registerClassFeatures`, `registerRacialTrait`, `registerRacialTraits`)
- Static `registerEquipmentFeature()` method also removed
- Removed unused `validateClassFeature` and `validateRacialTrait` imports
- `invalidateCache()` is public (line 75)
- Class documentation updated to remove "convenience wrapper" language
- Build passes successfully (no new errors introduced)
- TypeScript compilation passes with no errors

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
- [x] Create helper function for test setup: `registerTestClassFeature(feature)` that calls EM + invalidates cache
- [x] Create helper function for test setup: `registerTestRacialTrait(trait)` that calls EM + invalidates cache
- [x] Replace all `featureRegistry.registerClassFeature()` calls with helper
- [x] Replace all `featureRegistry.registerClassFeatures()` calls with helper
- [x] Replace all `featureRegistry.registerRacialTrait()` calls with helper
- [x] Replace all `featureRegistry.registerRacialTraits()` calls with helper
- [x] Verify tests pass after changes
- [x] Search for any missed usages

**Status:** ✅ COMPLETED
- Helper functions `registerTestClassFeature` and `registerTestRacialTrait` created in `tests/helpers/registrationHelpers.ts`
- All test files updated to use helper functions instead of removed methods
- All 218 FeatureRegistry-related tests passing (unit + integration)
- Fixed cache invalidation issue in `tests/integration/prerequisitesAndRaces.integration.test.ts` by adding `skillRegistry.invalidateCache()` to `afterEach()`
- Fixed duplicate skill registration test in `tests/unit/skillRegistry.test.ts` to use `ExtensionManager.register()` directly
- Note: `tests/integration/phase15.fullCustomContent.integration.test.ts` has 1 pre-existing failure unrelated to FeatureRegistry (spell registration format issue)

---

## Phase 5: Documentation Updates

### Task 5.1: Update DATA_ENGINE_REFERENCE.md

**Sections to Update:**
- SpellRegistry section (~line 4908)
- SkillRegistry section (~line 4639)
- FeatureRegistry section (~line 4312)

**Sub-tasks:**
- [x] Remove registration method documentation from all three registries
  - [x] SpellRegistry: `registerSpell()`, `registerSpells()`, `registerClassSpellList()`
  - [x] SkillRegistry: `registerSkill()`, `registerSkills()`
  - [x] FeatureRegistry: `registerClassFeature()`, `registerClassFeatures()`, `registerRacialTrait()`, `registerRacialTraits()`
- [x] Add prominent note: "Registration is done via ExtensionManager.register()"
- [x] Update Quick Reference tables to remove registration methods
- [x] Add cross-reference links to ExtensionManager documentation
- [x] Update example code blocks to use ExtensionManager

**Status:** ✅ COMPLETED
- Removed "Convenience wrapper" language from all three registry sections
- Removed all registration method declarations from TypeScript class definitions
- Removed all registration methods from Method Reference tables
- Updated "Note on Registration" and "Usage Notes" to emphasize ExtensionManager only
- Added `invalidateCache()` calls to registration examples
- All references to removed methods verified as removed via grep
- Build passes successfully

---

### Task 5.2: Update EXTENSIBILITY_GUIDE.md

**Sections to Update:**
- "Spells" section (~line 490)
- "Skills" section (~line 973)
- "Class Features" section (~line 697)
- "Racial Traits" section (~line 890)
- "Arctic Expansion Pack" example (~line 1543)

**Sub-tasks:**
- [x] Replace all `SpellRegistry.registerSpell()` examples with `ExtensionManager.register('spells', [...])`
- [x] Replace all `SkillRegistry.registerSkill()` examples with `ExtensionManager.register('skills', [...])`
- [x] Replace all `FeatureRegistry.registerClassFeature()` examples with `ExtensionManager.register('classFeatures', [...])`
- [x] Replace all `FeatureRegistry.registerRacialTrait()` examples with `ExtensionManager.register('racialTraits', [...])`
- [x] Remove "convenience wrapper" notes (no longer accurate)
- [x] Update registration pattern sections
- [x] Verify all code examples compile

**Status:** ✅ COMPLETED
- All "convenience wrapper" language removed from document
- All registration examples updated to use `ExtensionManager.register()` directly
- Added `invalidateCache()` calls after registration examples where needed
- Updated validation error examples to use `manager.register()` instead of removed methods
- TypeScript compilation passes with no errors
- Build completes successfully
- All removed method references verified as gone via grep

---

### Task 5.3: Update PREREQUISITES.md

**Sections to Update:**
- Examples using `SkillRegistry.registerSkill()` (~line 128)
- Examples using `FeatureRegistry.registerClassFeature()` (~line 298)
- Examples using `FeatureRegistry.registerRacialTrait()` (~line 461)

**Sub-tasks:**
- [x] Find all `SkillRegistry.registerSkill()` usage and replace
- [x] Find all `FeatureRegistry.registerClassFeature()` usage and replace
- [x] Find all `FeatureRegistry.registerRacialTrait()` usage and replace
- [x] Update examples to use ExtensionManager directly
- [x] Verify examples still demonstrate prerequisite concepts correctly

**Status:** ✅ COMPLETED
- Replaced 5 registration calls with `ExtensionManager.register()` directly
- Added `invalidateCache()` calls after each registration
- All removed method references verified as gone via grep
- Build passes successfully

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
- [x] Change `private invalidateCache()` to `public invalidateCache()`
- [x] Update JSDoc comment to explain public API for manual invalidation after direct EM registration
- [x] Verify consistency with SkillRegistry and FeatureRegistry (already public)

**Status:** ✅ COMPLETED (completed as part of Task 2.1)

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
