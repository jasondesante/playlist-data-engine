# Plan: Rename Registries to Queries

## Overview

Rename `SpellRegistry`, `SkillRegistry`, and `FeatureRegistry` to `SpellQuery`, `SkillQuery`, and `FeatureQuery` to better reflect their actual purpose as read-only query interfaces rather than CRUD-style registries.

**Motivation:** Code clarity - "Registry" implies CRUD operations, but these classes are pure query layers over ExtensionManager.

---

## Phase 1: Preparation & Research

### 1.1 Review Registry Implementations
- [ ] Read `/Users/jasondesante/playlist-data-engine/src/core/spells/SpellRegistry.ts`
  - Note: Singleton pattern with getInstance()
  - Methods: getSpell(), getSpells(), getSpellsByLevel(), getSpellsBySchool(), getSpellsForClass(), getAvailableSpells(), getClassSpellList(), getSpellSlotsForClass(), validatePrerequisites(), hasSpell(), getSpellCount(), getSpellsBySource(), getRegistryStats(), invalidateCache()
- [ ] Read `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillRegistry.ts`
  - Note: Singleton pattern with getInstance()
  - Methods: getSkill(), getAllSkills(), getSkillsByAbility(), getSkillsByCategory(), getCategories(), getSkillsBySource(), isValidSkill(), validateSkill(), validatePrerequisites(), getAvailableSkills(), getRegistryStats(), getSkillCount(), invalidateCache()
- [ ] Read `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureRegistry.ts`
  - Note: Singleton pattern with getInstance(), has reset() method
  - Methods: getClassFeatures(), getFeaturesForLevel(), getClassFeatureById(), getAllClassFeatures(), getRacialTraits(), getBaseRacialTraits(), getRacialTraitsForSubrace(), getSubraceTraits(), getAvailableSubraces(), getRaceForSubrace(), getRacialTraitById(), getAllRacialTraits(), validatePrerequisites(), validateFeaturePrerequisites(), validateTraitPrerequisites(), canGainFeature(), meetsPrerequisites(), getRegisteredClasses(), getRegisteredRaces(), getRegistryStats(), reset(), isInitialized(), getEquipmentFeatures(), isValidEquipmentFeature(), invalidateCache()

### 1.2 Identify All Files to Modify
- [ ] Source files: 3 class files + 4 index files
- [ ] Type definitions: SkillTypes.ts (SkillRegistryStats type)
- [ ] Source files that import: 6 files
- [ ] Test files: 21 files
- [ ] Helper/test utilities: 3 files
- [ ] Documentation: 7 files
- [ ] ESLint plugin: 1 file
- [ ] **Total: 47 files**

### 1.3 Baseline Testing
- [ ] Run `npm test` - establish baseline
- [ ] Run `npm run type-check` - verify no existing errors
- [ ] Run `npm run build` - verify clean build
- [ ] Document any pre-existing failures

---

## Phase 2: Core Implementation (Class Files)

### 2.1 Rename and Update SpellRegistry → SpellQuery
- [ ] Rename file: `src/core/spells/SpellRegistry.ts` → `src/core/spells/SpellQuery.ts`
- [ ] Update class declaration: `class SpellRegistry` → `class SpellQuery`
- [ ] Update JSDoc comments referencing "registry" → "query"
- [ ] Rename method: `getRegistryStats()` → `getQueryStats()`
- [ ] Update return type in `getInstance()`

### 2.2 Rename and Update SkillRegistry → SkillQuery
- [ ] Rename file: `src/core/skills/SkillRegistry.ts` → `src/core/skills/SkillQuery.ts`
- [ ] Update class declaration: `class SkillRegistry` → `class SkillQuery`
- [ ] Update JSDoc comments referencing "registry" → "query"
- [ ] Rename method: `getRegistryStats()` → `getQueryStats()`
- [ ] Update return type in `getInstance()`

### 2.3 Rename and Update FeatureRegistry → FeatureQuery
- [ ] Rename file: `src/core/features/FeatureRegistry.ts` → `src/core/features/FeatureQuery.ts`
- [ ] Update class declaration: `class FeatureRegistry` → `class FeatureQuery`
- [ ] Update JSDoc comments referencing "registry" → "query"
- [ ] Rename method: `getRegistryStats()` → `getQueryStats()`
- [ ] Rename method: `reset()` → `clearQueryCache()` (more explicit)
- [ ] Update return type in `getInstance()`

### 2.4 Update Type Definitions
- [ ] Edit `src/core/skills/SkillTypes.ts`
  - Rename: `SkillRegistryStats` → `SkillQueryStats`
  - Update all references to this type

### 2.5 Update Module Index Files
- [ ] Edit `src/core/spells/index.ts`
  - Update: `export { SpellRegistry }` → `export { SpellQuery }`
- [ ] Edit `src/core/skills/index.ts`
  - Update: `export { SkillRegistry }` → `export { SkillQuery }`
- [ ] Edit `src/core/features/index.ts`
  - Update: `export { FeatureRegistry }` → `export { FeatureQuery }`

### 2.6 Update Main Export File
- [ ] Edit `src/index.ts`
  - Update exports for all three classes

### 2.7 Update ExtensionManager (Critical - Circular Dependency)
- [ ] Edit `src/core/extensions/ExtensionManager.ts`
  - Update imports: SpellRegistry → SpellQuery, etc.
  - Update all references to class names
  - Verify cache invalidation still works

---

## Phase 3: Update Source Code Imports

### 3.1 Core Generation Files
- [ ] Edit `src/core/generation/CharacterGenerator.ts`
  - Update: `import { FeatureRegistry }` → `import { FeatureQuery }`
  - Update: `FeatureRegistry.getInstance()` → `FeatureQuery.getInstance()`
- [ ] Edit `src/core/generation/SkillAssigner.ts`
  - Update: `import { SkillRegistry }` → `import { SkillQuery }`
  - Update: `SkillRegistry.getInstance()` → `SkillQuery.getInstance()`

### 3.2 Core Equipment Files
- [ ] Edit `src/core/equipment/EquipmentEffectApplier.ts`
  - Update: `import { FeatureRegistry }` → `import { FeatureQuery }`
  - Update: `FeatureRegistry.getInstance()` → `FeatureQuery.getInstance()`
- [ ] Edit `src/core/equipment/EquipmentValidator.ts`
  - Update: `import { SkillRegistry, FeatureRegistry }` → `import { SkillQuery, FeatureQuery }`
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
- [ ] Rename: `tests/unit/featureRegistry.test.ts` → `tests/unit/featureQuery.test.ts`
- [ ] Rename: `tests/unit/skillRegistry.test.ts` → `tests/unit/skillQuery.test.ts`

### 4.2 Update Unit Tests
- [ ] Edit `tests/unit/featureQuery.test.ts` (renamed from featureRegistry.test.ts)
  - Update all imports
  - Update class references
  - Update `getRegistryStats()` → `getQueryStats()`
  - Update `reset()` → `clearQueryCache()`
- [ ] Edit `tests/unit/skillQuery.test.ts` (renamed from skillRegistry.test.ts)
  - Update all imports
  - Update class references
  - Update `getRegistryStats()` → `getQueryStats()`
- [ ] Edit `tests/unit/equipmentEffectApplier.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/equipmentModifier.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/equipmentValidator.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/levelUpProcessor.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/progression.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/skillPrerequisites.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/skills.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/subraces.test.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/unit/customRaces.test.ts`
  - Update registry imports to query imports

### 4.3 Update Integration Tests
- [ ] Edit `tests/integration/featureIntegration.test.ts`
  - Update all registry references to query references
- [ ] Edit `tests/integration/skillIntegration.test.ts`
  - Update all registry references to query references
- [ ] Edit `tests/integration/autoCacheInvalidation.test.ts`
  - Update all registry references to query references
  - Verify cache invalidation tests still pass
- [ ] Edit `tests/integration/customClasses.integration.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/integration/customFeaturesSkills.integration.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/integration/part4.templateClassSystem.integration.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/integration/phase15.fullCustomContent.integration.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/integration/prerequisitesAndRaces.integration.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/integration/racialTraitIntegration.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/integration/subraceStatBonus.integration.test.ts`
  - Update registry references to query references

### 4.4 Update Test Helpers
- [ ] Edit `tests/helpers/registrationHelpers.ts`
  - Update registry imports to query imports
- [ ] Edit `tests/runtime-verification/verify-registrations.ts`
  - Update registry imports to query imports
  - Note: "registrations" refers to ExtensionManager.register(), not the registries themselves
- [ ] Edit `tests/verification/dragon-skill-example.compile.test.ts`
  - Update registry imports to query imports

### 4.5 Update Documentation Tests
- [ ] Edit `tests/documentation/prerequisitesExamples.test.ts`
  - Update registry references to query references
- [ ] Edit `tests/documentation/examples-compilation.test.ts`
  - Update registry references to query references

---

## Phase 5: Update Documentation

### 5.1 Main Documentation Files
- [ ] Edit `DATA_ENGINE_REFERENCE.md`
  - Find/replace: `SpellRegistry` → `SpellQuery`
  - Find/replace: `SkillRegistry` → `SkillQuery`
  - Find/replace: `FeatureRegistry` → `FeatureQuery`
  - Update: `getRegistryStats()` → `getQueryStats()`
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
- [ ] Run: `grep -r "SpellRegistry\|SkillRegistry\|FeatureRegistry" --include="*.ts" --include="*.md" .`
- [ ] Verify NO references remain (all should be converted to Query)
- [ ] Run: `grep -r "getRegistryStats" --include="*.ts" .` - should return nothing
- [ ] Run: `grep -r "\.reset()" --include="*.ts" tests/ | grep -i feature` - verify clearQueryCache usage

---

## Summary of Changes

### Class Names
| Old Name | New Name |
|----------|----------|
| `SpellRegistry` | `SpellQuery` |
| `SkillRegistry` | `SkillQuery` |
| `FeatureRegistry` | `FeatureQuery` |

### Method Names
| Old Method | New Method | Location |
|------------|------------|----------|
| `getRegistryStats()` | `getQueryStats()` | All three classes |
| `reset()` | `clearQueryCache()` | FeatureQuery only |

### Type Names
| Old Type | New Type |
|----------|----------|
| `SkillRegistryStats` | `SkillQueryStats` |

### File Names
| Old File | New File |
|----------|----------|
| `SpellRegistry.ts` | `SpellQuery.ts` |
| `SkillRegistry.ts` | `SkillQuery.ts` |
| `FeatureRegistry.ts` | `FeatureQuery.ts` |
| `skillRegistry.test.ts` | `skillQuery.test.ts` |
| `featureRegistry.test.ts` | `featureQuery.test.ts` |

---

## Critical Files Reference

**Primary Implementation Files:**
- `/Users/jasondesante/playlist-data-engine/src/core/spells/SpellRegistry.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/skills/SkillRegistry.ts`
- `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureRegistry.ts`

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
