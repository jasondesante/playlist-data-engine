# PLAN: Automatic Cache Invalidation in ExtensionManager.register()

## Executive Summary

Implement automatic cache invalidation in `ExtensionManager.register()` to eliminate the need for manual `invalidateCache()` calls throughout the codebase.

**Problem:** After calling `ExtensionManager.register()`, users must manually call the appropriate registry's `invalidateCache()` method. This pattern is repeated in ~100+ locations (tests, documentation, examples).

**Solution:** Modify `ExtensionManager.register()` to automatically invalidate the appropriate registry cache based on the category being registered.

**User Decisions:**
- ExtensionManager should invalidate cache based on the category being registered
- Targeted invalidation only (only the relevant registry)
- Direct dependency approach (ExtensionManager imports registries directly)
- No changes needed for content packs functionality

**Category to Registry Mapping:**
| Category Pattern | Registry |
|-----------------|----------|
| `spells`, `spells.*`, `classSpellLists`, `classSpellLists.*` | SpellRegistry |
| `skills`, `skills.*`, `skillLists`, `skillLists.*` | SkillRegistry |
| `classFeatures`, `classFeatures.*`, `racialTraits`, `racialTraits.*` | FeatureRegistry |
| All other categories | No registry caching |

---

## Phase 1: Research and Analysis

### Task 1: Identify all invalidateCache() usage in codebase
- [ ] Search for all `invalidateCache()` calls in test files
- [ ] Search for all `invalidateCache()` calls in documentation
- [ ] Search for all `invalidateCache()` calls in source code
- [ ] Categorize findings by file type (tests, docs, source)
- [ ] Create inventory of all files requiring changes

### Task 2: Analyze ExtensionManager.register() implementation
- [ ] Read current `register()` method implementation
- [ ] Read current `reset()` method implementation
- [ ] Read current `resetAll()` method implementation
- [ ] Identify where cache invalidation should be added
- [ ] Verify no existing cache invalidation logic exists

### Task 3: Analyze Registry invalidateCache() implementations
- [ ] Read `SpellRegistry.invalidateCache()` implementation
- [ ] Read `SkillRegistry.invalidateCache()` implementation
- [ ] Read `FeatureRegistry.invalidateCache()` implementation
- [ ] Verify all are idempotent (safe to call multiple times)
- [ ] Document what each cache stores

### Task 4: Document sensor registry cache handling
- [ ] Identify sensor registries that have caches (WeatherAPIClient, GeolocationProvider)
- [ ] Verify these are NOT affected by ExtensionManager.register()
- [ ] Document that sensor tests should keep their invalidateCache() calls

---

## Phase 2: Core Implementation

### Task 5: Add registry imports to ExtensionManager
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Add import for `SpellRegistry` from `../spells/SpellRegistry.js`
- [ ] Add import for `SkillRegistry` from `../skills/SkillRegistry.js`
- [ ] Add import for `FeatureRegistry` from `../features/FeatureRegistry.js`
- [ ] Verify imports resolve correctly
- [ ] Run linter to ensure no import issues

### Task 6: Implement category-to-registry mapping helper
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Create private method `getRegistryForCategory(category: ExtensionCategory)`
- [ ] Add logic to map `spells*` and `classSpellLists*` to 'spell'
- [ ] Add logic to map `skills*` and `skillLists*` to 'skill'
- [ ] Add logic to map `classFeatures*` and `racialTraits*` to 'feature'
- [ ] Return `null` for categories without registry caching
- [ ] Add JSDoc comment explaining the mapping

### Task 7: Implement cache invalidation helper method
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Create private method `invalidateRegistryCache(category: ExtensionCategory)`
- [ ] Call `getRegistryForCategory()` to determine registry type
- [ ] Add switch statement to handle 'spell', 'skill', 'feature' cases
- [ ] Call `SpellRegistry.getInstance().invalidateCache()` for spell categories
- [ ] Call `SkillRegistry.getInstance().invalidateCache()` for skill categories
- [ ] Call `FeatureRegistry.getInstance().invalidateCache()` for feature categories
- [ ] Return early if no registry for category
- [ ] Add JSDoc comment

### Task 8: Modify register() to auto-invalidate cache
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Locate end of `register()` method (after weights merging, line ~357)
- [ ] Add call to `this.invalidateRegistryCache(category)` at end of method
- [ ] Verify invalidation happens AFTER successful registration
- [ ] Verify invalidation happens AFTER validation passes
- [ ] Add comment explaining automatic cache invalidation
- [ ] Test compilation with TypeScript

### Task 9: Modify reset() to auto-invalidate cache
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Locate `reset()` method (line 752)
- [ ] Remove outdated comment about manual cache invalidation
- [ ] Add call to `this.invalidateRegistryCache(category)`
- [ ] Add updated comment about automatic invalidation
- [ ] Test compilation

### Task 10: Modify resetAll() to invalidate all registry caches
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Locate `resetAll()` method (line 762)
- [ ] Add call to `SpellRegistry.getInstance().invalidateCache()`
- [ ] Add call to `SkillRegistry.getInstance().invalidateCache()`
- [ ] Add call to `FeatureRegistry.getInstance().invalidateCache()`
- [ ] Add comment explaining all caches are being cleared
- [ ] Test compilation

### Task 11: Verify registerMultiple() inherits behavior
**File:** `src/core/extensions/ExtensionManager.ts`

- [ ] Verify `registerMultiple()` calls `register()` in a loop
- [ ] Confirm no changes needed (inherits automatic invalidation)
- [ ] Document that each category's cache is invalidated separately

---

## Phase 3: Test Helper Cleanup

### Task 12: Clean up registerTestSkill()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestSkill()` function
- [ ] Remove `const skillRegistry = SkillRegistry.getInstance()` declaration
- [ ] Remove `skillRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing skill ID (useful validation)
- [ ] Add comment noting cache invalidation is automatic

### Task 13: Clean up registerTestSkills()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestSkills()` function
- [ ] Remove `const skillRegistry = SkillRegistry.getInstance()` declaration
- [ ] Remove `skillRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing skill IDs
- [ ] Add comment noting cache invalidation is automatic

### Task 14: Clean up registerTestSpell()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestSpell()` function
- [ ] Remove `const spellRegistry = SpellRegistry.getInstance()` declaration
- [ ] Remove `spellRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing spell ID
- [ ] Add comment noting cache invalidation is automatic

### Task 15: Clean up registerTestSpells()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestSpells()` function
- [ ] Remove `const spellRegistry = SpellRegistry.getInstance()` declaration
- [ ] Remove `spellRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing spell IDs
- [ ] Add comment noting cache invalidation is automatic

### Task 16: Clean up registerTestClassFeature()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestClassFeature()` function
- [ ] Remove `const featureRegistry = FeatureRegistry.getInstance()` declaration
- [ ] Remove `featureRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing feature ID
- [ ] Add comment noting cache invalidation is automatic

### Task 17: Clean up registerTestClassFeatures()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestClassFeatures()` function
- [ ] Remove `const featureRegistry = FeatureRegistry.getInstance()` declaration
- [ ] Remove `featureRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing feature IDs
- [ ] Add comment noting cache invalidation is automatic

### Task 18: Clean up registerTestRacialTrait()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestRacialTrait()` function
- [ ] Remove `const featureRegistry = FeatureRegistry.getInstance()` declaration
- [ ] Remove `featureRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing trait ID
- [ ] Add comment noting cache invalidation is automatic

### Task 19: Clean up registerTestRacialTraits()
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Locate `registerTestRacialTraits()` function
- [ ] Remove `const featureRegistry = FeatureRegistry.getInstance()` declaration
- [ ] Remove `featureRegistry.invalidateCache()` call at end
- [ ] Keep duplicate check for existing trait IDs
- [ ] Add comment noting cache invalidation is automatic

### Task 20: Remove unused imports from registrationHelpers.ts
**File:** `tests/helpers/registrationHelpers.ts`

- [ ] Check if `SkillRegistry` import is now unused
- [ ] Check if `SpellRegistry` import is now unused
- [ ] Check if `FeatureRegistry` import is now unused
- [ ] Remove any unused registry imports
- [ ] Run linter to verify no unused imports

---

## Phase 4: Integration Test Cleanup

### Task 21: Clean up skillIntegration.test.ts
**File:** `tests/integration/skillIntegration.test.ts`

- [ ] Remove `SkillRegistry.getInstance().invalidateCache()` from `beforeEach()` (line 22)
- [ ] Remove `invalidateCache()` call after registration (line 308)
- [ ] Remove `invalidateCache()` call after registration (line 709)
- [ ] Remove `SkillRegistry` import if no longer used
- [ ] Run tests to verify they pass

### Task 22: Clean up featureIntegration.test.ts
**File:** `tests/integration/featureIntegration.test.ts`

- [ ] Remove `invalidateCache()` call from `beforeEach()` (line 30)
- [ ] Remove `invalidateCache()` call (line 291)
- [ ] Remove `invalidateCache()` call (line 356)
- [ ] Remove `invalidateCache()` call (line 384)
- [ ] Remove `invalidateCache()` call (line 412)
- [ ] Remove `invalidateCache()` call (line 473)
- [ ] Remove `invalidateCache()` call (line 493)
- [ ] Remove `invalidateCache()` call (line 498)
- [ ] Remove `invalidateCache()` call (line 503)
- [ ] Remove `invalidateCache()` call (line 533)
- [ ] Remove comment about "Need to invalidate after re-registration"
- [ ] Remove `FeatureRegistry` import if no longer used
- [ ] Run tests to verify they pass

### Task 23: Clean up racialTraitIntegration.test.ts
**File:** `tests/integration/racialTraitIntegration.test.ts`

- [ ] Remove `invalidateCache()` call from `beforeEach()` (line 30)
- [ ] Remove all remaining `invalidateCache()` calls (~20 occurrences)
- [ ] Search file for `invalidateCache` to ensure none remain
- [ ] Remove `FeatureRegistry` import if no longer used
- [ ] Run tests to verify they pass

### Task 24: Clean up spellIntegration.test.ts
**File:** `tests/integration/spellIntegration.test.ts`

- [ ] Remove `invalidateCache()` call from `beforeEach()` (line 19)
- [ ] Remove `invalidateCache()` call (line 243)
- [ ] Remove `invalidateCache()` call (line 288)
- [ ] Search file for `invalidateCache` to ensure none remain
- [ ] Remove `SpellRegistry` import if no longer used
- [ ] Run tests to verify they pass

### Task 25: Clean up phase15.fullCustomContent.integration.test.ts
**File:** `tests/integration/phase15.fullCustomContent.integration.test.ts`

- [ ] Remove `invalidateCache()` calls from `afterEach()` (lines 72-73)
- [ ] Remove `invalidateCache()` call (line 220)
- [ ] Remove `invalidateCache()` call (line 680)
- [ ] Remove `invalidateCache()` call (line 722)
- [ ] Remove `invalidateCache()` call (line 823)
- [ ] Search file for `invalidateCache` to ensure none remain (except sensors)
- [ ] Remove unused registry imports
- [ ] Run tests to verify they pass

### Task 26: Clean up prerequisitesAndRaces.integration.test.ts
**File:** `tests/integration/prerequisitesAndRaces.integration.test.ts`

- [ ] Remove `invalidateCache()` call (line 147)
- [ ] Search file for `invalidateCache` to ensure none remain
- [ ] Remove unused registry imports
- [ ] Run tests to verify they pass

---

## Phase 5: Unit Test Cleanup

### Task 27: Clean up skillRegistry.test.ts
**File:** `tests/unit/skillRegistry.test.ts`

- [ ] Search for all `invalidateCache()` calls
- [ ] Remove unnecessary `invalidateCache()` calls after registration
- [ ] Keep `invalidateCache()` calls that are specifically testing the cache behavior
- [ ] Run tests to verify they pass

### Task 28: Clean up subraces.test.ts
**File:** `tests/unit/subraces.test.ts`

- [ ] Search for `invalidateCache()` calls
- [ ] Remove `invalidateCache()` calls after registration
- [ ] Remove unused registry imports if present
- [ ] Run tests to verify they pass

### Task 29: Clean up skills.test.ts
**File:** `tests/unit/skills.test.ts`

- [ ] Search for `invalidateCache()` calls
- [ ] Remove `invalidateCache()` calls after registration
- [ ] Remove unused registry imports if present
- [ ] Run tests to verify they pass

### Task 30: Verify sensors.test.ts is unchanged
**File:** `tests/unit/sensors.test.ts`

- [ ] Verify `WeatherAPIClient.invalidateCache()` calls remain (unrelated to ExtensionManager)
- [ ] Verify `GeolocationProvider.invalidateCache()` calls remain (unrelated to ExtensionManager)
- [ ] Confirm no changes needed for this file

---

## Phase 6: Documentation Test Cleanup

### Task 31: Clean up examples-compilation.test.ts
**File:** `tests/documentation/examples-compilation.test.ts`

- [ ] Search for `invalidateCache()` in code examples
- [ ] Remove `invalidateCache()` calls from examples
- [ ] Run tests to verify examples compile correctly

### Task 32: Clean up prerequisitesExamples.test.ts
**File:** `tests/documentation/prerequisitesExamples.test.ts`

- [ ] Search for `invalidateCache()` in examples
- [ ] Remove `invalidateCache()` calls from examples
- [ ] Run tests to verify examples compile correctly

### Task 33: Clean up verify-registrations.ts
**File:** `tests/runtime-verification/verify-registrations.ts`

- [ ] Search for `invalidateCache()` calls
- [ ] Remove unnecessary `invalidateCache()` calls
- [ ] Run verification script to ensure it works

---

## Phase 7: Documentation Updates

### Task 34: Update PREREQUISITES.md
**File:** `docs/PREREQUISITES.md`

- [ ] Find and remove `SkillRegistry.getInstance().invalidateCache()` (line 129)
- [ ] Find and remove `FeatureRegistry.getInstance().invalidateCache()` (line 300)
- [ ] Find and remove `FeatureRegistry.getInstance().invalidateCache()` (line 475)
- [ ] Find and remove `SkillRegistry.getInstance().invalidateCache()` (line 490)
- [ ] Find and remove `FeatureRegistry.getInstance().invalidateCache()` (line 525)
- [ ] Search file for any remaining `invalidateCache` references
- [ ] Update code examples to note automatic invalidation

### Task 35: Update EXTENSIBILITY_GUIDE.md
**File:** `docs/EXTENSIBILITY_GUIDE.md`

- [ ] Update spell registration section (~line 479): Remove note about manual invalidation
- [ ] Remove `spellRegistry.invalidateCache()` from example (line 524)
- [ ] Update feature registration section (~line 759): Remove note about manual invalidation
- [ ] Remove `registry.invalidateCache()` from example (line 818)
- [ ] Remove `featureRegistry.invalidateCache()` from example (line 822)
- [ ] Update racial traits section (~line 949): Remove note about manual invalidation
- [ ] Update skills section (~line 1014): Remove note about manual invalidation
- [ ] Remove `registry.invalidateCache()` from example (line 1095)
- [ ] Search file for any remaining `invalidateCache` references
- [ ] Update section introductions to note automatic invalidation

### Task 36: Update DATA_ENGINE_REFERENCE.md
**File:** `DATA_ENGINE_REFERENCE.md`

- [ ] Update FeatureRegistry section (~line 4323): Note automatic invalidation
- [ ] Remove manual `invalidateCache()` from example (line 4483)
- [ ] Remove manual `invalidateCache()` from example (line 4489)
- [ ] Update FeatureRegistry.invalidateCache() method description (~line 4455)
- [ ] Update SkillRegistry section (~line 4667): Note automatic invalidation
- [ ] Remove manual `invalidateCache()` from example (line 4787)
- [ ] Update SkillRegistry.invalidateCache() method description (~line 4768)
- [ ] Update SpellRegistry section (~line 4923): Note automatic invalidation
- [ ] Remove manual `invalidateCache()` from example (line 5028)
- [ ] Remove manual `invalidateCache()` from example (line 5030)
- [ ] Update SpellRegistry.invalidateCache() method description
- [ ] Search file for any remaining `invalidateCache` examples to remove

### Task 37: Update USAGE_IN_OTHER_PROJECTS.md
**File:** `USAGE_IN_OTHER_PROJECTS.md`

- [ ] Find and remove `FeatureRegistry.getInstance().invalidateCache()` (line 1140)
- [ ] Find and remove `SkillRegistry.getInstance().invalidateCache()` (line 1157)
- [ ] Search file for any remaining `invalidateCache` references
- [ ] Update examples to note automatic invalidation

### Task 38: Update Registry JSDoc Comments
**Files:** `src/core/skills/SkillRegistry.ts`, `src/core/spells/SpellRegistry.ts`, `src/core/features/FeatureRegistry.ts`

- [ ] Update `SkillRegistry.ts` JSDoc: Note automatic invalidation after registration
- [ ] Update `SkillRegistry.invalidateCache()` JSDoc: Note primarily for internal use
- [ ] Update `SpellRegistry.ts` JSDoc: Note automatic invalidation after registration
- [ ] Update `SpellRegistry.invalidateCache()` JSDoc: Note primarily for internal use
- [ ] Update `FeatureRegistry.ts` JSDoc: Note automatic invalidation after registration
- [ ] Update `FeatureRegistry.invalidateCache()` JSDoc: Note primarily for internal use

---

## Phase 8: Verification and Testing

### Task 39: Create integration test for automatic cache invalidation
**File:** `tests/integration/autoCacheInvalidation.test.ts` (new file)

- [ ] Create test file for automatic cache invalidation verification
- [ ] Add test for SkillRegistry auto-invalidation after `register('skills', ...)`
- [ ] Add test for SpellRegistry auto-invalidation after `register('spells', ...)`
- [ ] Add test for FeatureRegistry auto-invalidation after `register('classFeatures', ...)`
- [ ] Add test for FeatureRegistry auto-invalidation after `register('racialTraits', ...)`
- [ ] Add test verifying no invalidation for non-registry categories (e.g., 'equipment')
- [ ] Add test for `reset()` auto-invalidation
- [ ] Add test for `resetAll()` invalidating all registries
- [ ] Run new test file to verify all tests pass

### Task 40: Verify backward compatibility
- [ ] Create test showing manual `invalidateCache()` still works (idempotent)
- [ ] Verify calling `invalidateCache()` multiple times is safe
- [ ] Run test to confirm backward compatibility

### Task 41: Run full test suite
- [ ] Run `npm test` to execute full test suite
- [ ] Verify all tests pass
- [ ] Fix any failing tests
- [ ] Re-run until all tests pass

### Task 42: Run linter
- [ ] Run `npm run lint`
- [ ] Fix any linting errors
- [ ] Re-run until no errors

### Task 43: Code quality checks
- [ ] Check for any remaining unused imports
- [ ] Check for any remaining TODO comments from this work
- [ ] Verify all code follows project patterns
- [ ] Run formatter if needed

---

## Phase 9: Edge Case Verification

### Task 44: Test validation failure doesn't invalidate cache
- [ ] Create test registering invalid data
- [ ] Verify cache is NOT invalidated when validation fails
- [ ] Verify original data is still accessible

### Task 45: Test empty items array
- [ ] Test `register('skills', [])` with empty array
- [ ] Verify cache is still invalidated
- [ ] Verify no errors occur

### Task 46: Test relative mode merging
- [ ] Test `register()` with `mode: 'relative'`
- [ ] Verify cache is invalidated after merge
- [ ] Verify new items are accessible

### Task 47: Test replace mode
- [ ] Test `register()` with `mode: 'replace'`
- [ ] Verify cache is invalidated after replace
- [ ] Verify only new items are accessible

### Task 48: Test class-specific categories
- [ ] Test `register('spells.Wizard', ...)` invalidates SpellRegistry
- [ ] Test `register('skills.STR', ...)` invalidates SkillRegistry
- [ ] Test `register('classFeatures.Fighter', ...)` invalidates FeatureRegistry
- [ ] Test `register('racialTraits.Elf', ...)` invalidates FeatureRegistry

### Task 49: Test registerMultiple with mixed categories
- [ ] Test `registerMultiple()` with skills and spells
- [ ] Verify both SkillRegistry and SpellRegistry caches are invalidated
- [ ] Test `registerMultiple()` with features and traits
- [ ] Verify FeatureRegistry cache is only invalidated once

---

## Phase 10: Final Documentation and Changelog

### Task 50: Update or create CHANGELOG entry
- [ ] Document automatic cache invalidation feature
- [ ] Add migration notes for existing code
- [ ] Note backward compatibility (manual calls still work)

### Task 51: Final verification of documentation
- [ ] Search all `.md` files for `invalidateCache` to ensure examples are updated
- [ ] Verify no documentation still shows manual invalidation pattern
- [ ] Verify all documentation examples compile successfully

### Task 52: Create summary of changes
- [ ] Count total files modified
- [ ] Count lines of code removed
- [ ] Document test coverage improvements

---

## Success Criteria

- [ ] All tests pass without manual `invalidateCache()` calls (except sensors)
- [ ] No manual `invalidateCache()` calls remain in test files (except sensors)
- [ ] No manual `invalidateCache()` calls remain in documentation
- [ ] JSDoc comments updated in all registry classes
- [ ] Integration test added to verify automatic invalidation
- [ ] Full test suite passes (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] All edge cases verified and passing
- [ ] Backward compatibility confirmed

---

## Critical Files Summary

| File | Phase | Change Type |
|------|-------|-------------|
| `src/core/extensions/ExtensionManager.ts` | 2 | Core implementation |
| `tests/helpers/registrationHelpers.ts` | 3 | Test helper cleanup |
| `tests/integration/featureIntegration.test.ts` | 4 | Test cleanup (~10 calls) |
| `tests/integration/racialTraitIntegration.test.ts` | 4 | Test cleanup (~20 calls) |
| `docs/EXTENSIBILITY_GUIDE.md` | 7 | Documentation update |
| `docs/PREREQUISITES.md` | 7 | Documentation update |
| `DATA_ENGINE_REFERENCE.md` | 7 | Documentation update |
| `USAGE_IN_OTHER_PROJECTS.md` | 7 | Documentation update |
