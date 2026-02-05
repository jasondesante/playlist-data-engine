# Plan: Rename Registries to Queries

## Overview

Rename `SpellQuery`, `SkillQuery`, and `FeatureQuery` to `SpellQuery`, `SkillQuery`, and `FeatureQuery` to better reflect their actual purpose as read-only query interfaces rather than CRUD-style registries.

**Motivation:** Code clarity - "Registry" implies CRUD operations, but these classes are pure query layers over ExtensionManager.

---

## Phase 1: Preparation & Research

### 1.1 Review Registry Implementations
- [x] Read `/workspace/src/core/spells/SpellQuery.ts`
  - Note: Singleton pattern with getInstance()
  - Methods: getSpell(), getSpells(), getSpellsByLevel(), getSpellsBySchool(), getSpellsForClass(), getAvailableSpells(), getClassSpellList(), getSpellSlotsForClass(), validatePrerequisites(), hasSpell(), getSpellCount(), getSpellsBySource(), getQueryStats(), invalidateCache()
- [x] Read `/workspace/src/core/skills/SkillQuery.ts`
  - Note: Singleton pattern with getInstance()
  - Methods: getSkill(), getAllSkills(), getSkillsByAbility(), getSkillsByCategory(), getCategories(), getSkillsBySource(), isValidSkill(), validateSkill(), validatePrerequisites(), getAvailableSkills(), getQueryStats(), getSkillCount(), invalidateCache()
- [x] Read `/workspace/src/core/features/FeatureQuery.ts`
  - Note: Singleton pattern with getInstance(), has reset() method
  - Methods: getClassFeatures(), getFeaturesForLevel(), getClassFeatureById(), getAllClassFeatures(), getRacialTraits(), getBaseRacialTraits(), getRacialTraitsForSubrace(), getSubraceTraits(), getAvailableSubraces(), getRaceForSubrace(), getRacialTraitById(), getAllRacialTraits(), validatePrerequisites(), validateFeaturePrerequisites(), validateTraitPrerequisites(), canGainFeature(), meetsPrerequisites(), getRegisteredClasses(), getRegisteredRaces(), getQueryStats(), reset(), isInitialized(), getEquipmentFeatures(), isValidEquipmentFeature(), invalidateCache()

### 1.2 Identify All Files to Modify
- [x] Source files: 3 class files + 4 index files
- [x] Type definitions: SkillTypes.ts (SkillQueryStats type)
- [x] Source files that import: 6 files
- [x] Test files: 21 files
- [x] Helper/test utilities: 3 files
- [x] Documentation: 7 files
- [x] ESLint plugin: 1 file
- [x] **Total: 47+ files** (verified with grep - 58 files found)

### 1.3 Baseline Testing
- [x] Run `npm test` - establish baseline (2096 tests passed)
- [x] Run `npm run type-check` - verify no existing errors (clean)
- [x] Run `npm run build` - verify clean build (successful)
- [x] Document any pre-existing failures (none - all tests passing)

---

## Phase 2: Core Implementation (Class Files)

### 2.1 Rename and Update SpellQuery → SpellQuery
- [x] Rename file: `src/core/spells/SpellQuery.ts` → `src/core/spells/SpellQuery.ts`
- [x] Update class declaration: `class SpellQuery` → `class SpellQuery`
- [x] Update JSDoc comments referencing "registry" → "query"
- [x] Rename method: `getQueryStats()` → `getQueryStats()`
- [x] Update return type in `getInstance()`

### 2.2 Rename and Update SkillQuery → SkillQuery
- [x] Rename file: `src/core/skills/SkillQuery.ts` → `src/core/skills/SkillQuery.ts`
- [x] Update class declaration: `class SkillQuery` → `class SkillQuery`
- [x] Update JSDoc comments referencing "registry" → "query"
- [x] Rename method: `getQueryStats()` → `getQueryStats()`
- [x] Update return type in `getInstance()`

### 2.3 Rename and Update FeatureQuery → FeatureQuery
- [x] Rename file: `src/core/features/FeatureQuery.ts` → `src/core/features/FeatureQuery.ts`
- [x] Update class declaration: `class FeatureQuery` → `class FeatureQuery`
- [x] Update JSDoc comments referencing "registry" → "query"
- [x] Rename method: `getQueryStats()` → `getQueryStats()`
- [x] Rename method: `reset()` → `clearQueryCache()` (more explicit)
- [x] Update return type in `getInstance()`

### 2.4 Update Type Definitions
- [x] Edit `src/core/skills/SkillTypes.ts`
  - Rename: `SkillQueryStats` → `SkillQueryStats`
  - Update all references to this type

### 2.5 Update Module Index Files
- [x] Edit `src/core/spells/index.ts`
  - Update: `export { SpellQuery }` → `export { SpellQuery }`
- [x] Edit `src/core/skills/index.ts`
  - Update: `export { SkillQuery }` → `export { SkillQuery }`
- [x] Edit `src/core/features/index.ts`
  - Update: `export { FeatureQuery }` → `export { FeatureQuery }`

### 2.6 Update Main Export File
- [x] Edit `src/index.ts`
  - Update exports for all three classes

### 2.7 Update ExtensionManager (Critical - Circular Dependency)
- [x] Edit `src/core/extensions/ExtensionManager.ts`
  - Update imports: SpellQuery → SpellQuery, etc.
  - Update all references to class names
  - Verify cache invalidation still works

---

## Phase 3: Update Source Code Imports

### 3.1 Core Generation Files
- [ ] Edit `src/core/generation/CharacterGenerator.ts`
  - Update: `import { FeatureQuery }` → `import { FeatureQuery }`
  - Update: `FeatureQuery.getInstance()` → `FeatureQuery.getInstance()`
- [ ] Edit `src/core/generation/SkillAssigner.ts`
  - Update: `import { SkillQuery }` → `import { SkillQuery }`
  - Update: `SkillQuery.getInstance()` → `SkillQuery.getInstance()`

### 3.2 Core Equipment Files
- [ ] Edit `src/core/equipment/EquipmentEffectApplier.ts`
  - Update: `import { FeatureQuery }` → `import { FeatureQuery }`
  - Update: `FeatureQuery.getInstance()` → `FeatureQuery.getInstance()`
- [ ] Edit `src/core/equipment/EquipmentValidator.ts`
  - Update: `import { SkillQuery, FeatureQuery }` → `import { SkillQuery, FeatureQuery }`
  - Update all `getInstance()` calls

### 3.3 Core Progression Files
- [ ] Edit `src/core/progression/LevelUpProcessor.ts`
  - Update any registry references to query references

### 3.4 Update ESLint Plugin
- [ ] Rename file: `eslint-plugins/no-removed-registry-methods.js` → `eslint-plugins/no-removed-query-methods.js`
- [ ] Update class name references
- [ ] Update plugin name in any config files that reference it

---

## Phase 4: Update Tests

### 4.1 Rename Test Files
- [x] Rename: `tests/unit/featureRegistry.test.ts` → `tests/unit/featureQuery.test.ts`
- [x] Rename: `tests/unit/skillRegistry.test.ts` → `tests/unit/skillQuery.test.ts`

### 4.2 Update Unit Tests
- [x] Edit `tests/unit/featureQuery.test.ts` (renamed from featureRegistry.test.ts)
  - Update all imports
  - Update class references
  - Update `getQueryStats()` → `getQueryStats()`
  - Update `reset()` → `clearQueryCache()`
- [x] Edit `tests/unit/skillQuery.test.ts` (renamed from skillRegistry.test.ts)
  - Update all imports
  - Update class references
  - Update `getQueryStats()` → `getQueryStats()`
- [x] Edit `tests/unit/equipmentEffectApplier.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/equipmentModifier.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/equipmentValidator.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/levelUpProcessor.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/progression.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/skillPrerequisites.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/skills.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/subraces.test.ts`
  - Update registry imports to query imports
- [x] Edit `tests/unit/customRaces.test.ts`
  - Update registry imports to query imports

### 4.3 Update Integration Tests
- [x] Edit `tests/integration/featureIntegration.test.ts`
  - Update all registry references to query references
- [x] Edit `tests/integration/skillIntegration.test.ts`
  - Update all registry references to query references
- [x] Edit `tests/integration/autoCacheInvalidation.test.ts`
  - Update all registry references to query references
  - Verify cache invalidation tests still pass
- [x] Edit `tests/integration/customClasses.integration.test.ts`
  - Update registry references to query references
- [x] Edit `tests/integration/customFeaturesSkills.integration.test.ts`
  - Update registry references to query references
- [x] Edit `tests/integration/part4.templateClassSystem.integration.test.ts`
  - Update registry references to query references
- [x] Edit `tests/integration/phase15.fullCustomContent.integration.test.ts`
  - Update registry references to query references
- [x] Edit `tests/integration/prerequisitesAndRaces.integration.test.ts`
  - Update registry references to query references
- [x] Edit `tests/integration/racialTraitIntegration.test.ts`
  - Update registry references to query references
- [x] Edit `tests/integration/subraceStatBonus.integration.test.ts`
  - Update registry references to query references

### 4.4 Update Test Helpers
- [x] Edit `tests/helpers/registrationHelpers.ts`
  - Update registry imports to query imports
- [x] Edit `tests/runtime-verification/verify-registrations.ts`
  - Update registry imports to query imports
  - Note: "registrations" refers to ExtensionManager.register(), not the registries themselves
- [x] Edit `tests/verification/dragon-skill-example.compile.test.ts`
  - Update registry imports to query imports

### 4.5 Update Documentation Tests
- [x] Edit `tests/documentation/prerequisitesExamples.test.ts`
  - Update registry references to query references
- [x] Edit `tests/documentation/examples-compilation.test.ts`
  - Update registry references to query references

---

## Phase 5: Update Documentation

### 5.1 Main Documentation Files
- [ ] Edit `DATA_ENGINE_REFERENCE.md`
  - Find/replace: `SpellQuery` → `SpellQuery`
  - Find/replace: `SkillQuery` → `SkillQuery`
  - Find/replace: `FeatureQuery` → `FeatureQuery`
  - Update: `getQueryStats()` → `getQueryStats()`
  - Update: `reset()` → `clearQueryCache()` (for features)
  - Review all code examples

- [ ] Edit `docs/EXTENSIBILITY_GUIDE.md`
  - Update all registry references to query references
  - Update all code examples
  - Review for any "register to registry" language that should be clarified

- [ ] Edit `docs/PREREQUISITES.md`
  - Update all registry references to query references
  - Update all code examples

- [ ] Edit `docs/CUSTOM_CONTENT.md`
  - Update all registry references to query references
  - Clarify that registration goes through ExtensionManager, queries go through Query classes

- [ ] Edit `docs/EQUIPMENT_SYSTEM.md`
  - Update all registry references to query references
  - Update equipment feature examples

### 5.2 Additional Documentation
- [ ] Edit `USAGE_IN_OTHER_PROJECTS.md`
  - Update registry references to query references
  - Add migration note for external consumers

---

## Phase 6: Verification & Testing

### 6.1 Build Verification
- [ ] Run `npm run build` - verify clean compilation
- [ ] Run `npm run type-check` - verify no type errors
- [ ] Check `dist/` directory for correct file names:
  - `dist/core/features/FeatureQuery.d.ts`
  - `dist/core/skills/SkillQuery.d.ts`
  - `dist/core/spells/SpellQuery.d.ts`

### 6.2 Test Suite Verification
- [ ] Run full test suite: `npm test`
- [ ] Run coverage: `npm run test:coverage`
- [ ] Verify all tests pass
- [ ] Check for any skipped or pending tests

### 6.3 Linting
- [ ] Run `npm run lint`
- [ ] Fix any linting issues

### 6.4 Manual Verification Checklist
- [ ] All imports resolve correctly
- [ ] All exports work as expected
- [ ] Singleton pattern still functions (getInstance())
- [ ] Caching behavior unchanged
- [ ] Query methods return correct data
- [ ] Validation methods work correctly
- [ ] ExtensionManager integration intact
- [ ] Auto cache invalidation still works
- [ ] getQueryStats() returns correct data
- [ ] clearQueryCache() works correctly (FeatureQuery)

### 6.5 Search for Remaining References
- [ ] Run: `grep -r "SpellQuery\|SkillQuery\|FeatureQuery" --include="*.ts" --include="*.md" .`
- [ ] Verify NO references remain (all should be converted to Query)
- [ ] Run: `grep -r "getQueryStats" --include="*.ts" .` - should return nothing
- [ ] Run: `grep -r "\.reset()" --include="*.ts" tests/ | grep -i feature` - verify clearQueryCache usage

---

## Summary of Changes

### Class Names
| Old Name | New Name |
|----------|----------|
| `SpellQuery` | `SpellQuery` |
| `SkillQuery` | `SkillQuery` |
| `FeatureQuery` | `FeatureQuery` |

### Method Names
| Old Method | New Method | Location |
|------------|------------|----------|
| `getQueryStats()` | `getQueryStats()` | All three classes |
| `reset()` | `clearQueryCache()` | FeatureQuery only |

### Type Names
| Old Type | New Type |
|----------|----------|
| `SkillQueryStats` | `SkillQueryStats` |

### File Names
| Old File | New File |
|----------|----------|
| `SpellQuery.ts` | `SpellQuery.ts` |
| `SkillQuery.ts` | `SkillQuery.ts` |
| `FeatureQuery.ts` | `FeatureQuery.ts` |
| `skillRegistry.test.ts` | `skillQuery.test.ts` |
| `featureRegistry.test.ts` | `featureQuery.test.ts` |

---

## Critical Files Reference

**Primary Implementation Files:**
- `/Users/jasondesante/playlist-data-engine/src/core/spells/SpellQuery.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillQuery.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureQuery.ts`

**Type Definitions:**
- `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillTypes.ts`

**Integration Point:**
- `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Main Exports:**
- `/Users/jasondesante/playlist-data-engine/src/index.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/spells/index.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/skills/index.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/features/index.ts`

**Documentation:**
- `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md`
- `/Users/jasondesante/playlist-data-engine/docs/EXTENSIBILITY_GUIDE.md`
- `/Users/jasondesante/playlist-data-engine/docs/PREREQUISITES.md`
