# MIGRATION_GUIDE.md Verification Plan

## Important: Dynamic Plan Expansion

**If any problems are discovered during verification where the documentation and code don't match:**
1. **Add a new phase** to this plan for the discrepancy
2. **Research the tasks** required to investigate and document the mismatch
3. **Write the tasks** into the new phase with checkboxes like existing phases
4. **Fix the problem with the code** when you reach that phase in execution

This plan is a living document. Discrepancies should be captured as new phases rather than fixed immediately, to maintain systematic verification flow.

---

## Executive Summary

**Goal:** Systematically verify that every feature, interface, function, and breaking change documented in [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) is correctly implemented in the codebase.

**Scope:** This plan validates:
- Breaking changes from version 1.x to 2.0.0+
- Prerequisite systems for skills and spells
- Custom race and subrace support
- Template-based custom class system

**What Gets Verified:**
1. File existence at expected locations
2. Interface definitions match documentation (properties, types, signatures)
3. Functions are exported correctly with matching signatures
4. Documentation comments are accurate
5. Tests exist and cover documented features
6. Cross-file references are valid

**Success Criteria:**
- [ ] All 100% of items verified as matching documentation
- [ ] Any discrepancies documented and resolved
- [ ] No undocumented breaking changes found

---

## Quick Reference: Verification Status

| Phase | Description | Tasks | Status |
|-------|-------------|-------|--------|
| Phase 1 | Breaking Changes (Part 2) | 8 tasks | `██████████` 100% |
| Phase 2 | Skill Prerequisites | 12 tasks | `██████████` 100% |
| Phase 3 | Spell Prerequisites | 10 tasks | `██████████` 100% |
| Phase 4 | Custom Race Support | 9 items | `██████████` 100% |
| Phase 5 | Subrace Support | 12 tasks | `█░░░░░░░░░` 8% |
| Phase 6 | Template-Based Classes | 22 tasks | `░░░░░░░░░░` 0% |
| Phase 7 | Tests & Documentation | 11 tasks | `░░░░░░░░░░` 0% |

---

# Phase 1: Breaking Changes (Part 2)

**Documentation Reference:** MIGRATION_GUIDE.md → Phase 1-11 Summary → Breaking Changes

## Task 1.1: Ammunition Format Change
- [x] Verify `Arrow` in EQUIPMENT_DATABASE has weight 0.05 → [constants.ts:1945](src/utils/constants.ts#L1945)
- [x] Verify `Bolt` in EQUIPMENT_DATABASE has weight 0.075 → [constants.ts:1953](src/utils/constants.ts#L1953)
- [x] Verify ammunition tracked as individual items (not "Arrows (20)")
- [x] Verify EquipmentGenerator adds ammunition programmatically for Rangers

## Task 1.2: Feature ID Format Change
- [x] Verify CharacterSheet.class_features stores feature IDs (not display strings) → [Character.ts:280](src/core/types/Character.ts#L280)
- [x] Verify CharacterSheet.racial_traits stores trait IDs (not display strings) → [Character.ts:277](src/core/types/Character.ts#L277)
- [x] Verify FeatureEffect type exists with correct fields → [FeatureTypes.ts:39](src/core/features/FeatureTypes.ts#L39)
- [x] Verify CharacterSheet.feature_effects property exists → [Character.ts:344](src/core/types/Character.ts#L344)

---

# Phase 2: Skill Prerequisites (Part 3)

**Documentation Reference:** MIGRATION_GUIDE.md → Part 3: Prerequisites & Custom Races → Skill Prerequisites

## Task 2.1: Verify SkillPrerequisite Interface
File: [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts)
- [x] Interface is exported as `export interface SkillPrerequisite` → line 25
- [x] Property `level?: number` exists → line 27
- [x] Property `abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>` exists → line 30
- [x] Property `class?: Class` exists → line 33
- [x] Property `race?: Race` exists → line 36
- [x] Property `skills?: string[]` exists → line 39
- [x] Property `features?: string[]` exists → line 42
- [x] Property `spells?: string[]` exists → line 45
- [x] Property `custom?: string` exists → line 48

## Task 2.2: Verify SpellValidator File (NEW FILE)
- [x] File exists: src/core/spells/SpellValidator.ts
- [x] File exports SpellValidator class
- [x] File exports helper functions

## Task 2.3: Verify SkillValidator Method
File: [src/core/skills/SkillValidator.ts](src/core/skills/SkillValidator.ts)
- [x] Method `validateSkillPrerequisites(prerequisites, character)` exists → line 368
- [x] Method returns SkillValidationResult → line 371 (uses compatible ValidationResult from PrerequisiteValidator)
- [x] Method validates all prerequisite types → delegates to validatePrerequisites() from PrerequisiteValidator

## Task 2.4: Verify Modified Files
- [x] SkillAssigner.ts filters skills by prerequisites → Verified at [SkillAssigner.ts:136-160](src/core/generation/SkillAssigner.ts#L136)
- [x] SkillRegistry.ts has `validatePrerequisites()` method → Verified at [SkillRegistry.ts:256-271](src/core/skills/SkillRegistry.ts#L256)

---

# Phase 3: Spell Prerequisites (Part 3)

**Documentation Reference:** MIGRATION_GUIDE.md → Part 3: Prerequisites & Custom Races → Spell Prerequisites

**DISCREPANCY FOUND:** Interface is in `src/core/spells/SpellTypes.ts` NOT `src/utils/constants.ts` as documented. This was noted in the file comments as part of Phase 6 discrepancy resolution (Task 6.3/6.4).

## Task 3.1: Verify SpellPrerequisite Interface
File: [src/core/spells/SpellTypes.ts](src/core/spells/SpellTypes.ts)
- [x] Interface is exported as `export interface SpellPrerequisite` → line 27
- [x] Property `level?: number` exists → line 29
- [x] Property `casterLevel?: number` exists → line 32
- [x] Property `abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>` exists → line 35
- [x] Property `class?: Class` exists → line 38 (uses `Class` branded type, not `string`)
- [x] Property `race?: string` exists → line 41 (NOT documented in plan, but present in code)
- [x] Property `features?: string[]` exists → line 44
- [x] Property `spells?: string[]` exists → line 47
- [x] Property `skills?: string[]` exists → line 50
- [x] Property `custom?: string` exists → line 53

## Task 3.2: Verify SpellManager Integration
- [x] getKnownSpells() filters by prerequisites → Verified at [SpellManager.ts:217-220](src/core/generation/SpellManager.ts#L217)
- [x] CharacterGenerator passes character to SpellManager.initializeSpells() → Fixed and verified at [CharacterGenerator.ts:430](src/core/generation/CharacterGenerator.ts#L430)

---

# Phase 4: Custom Race Support (Part 3)

**Documentation Reference:** MIGRATION_GUIDE.md → Part 3: Prerequisites & Custom Races → Custom Race Support

## Task 4.1: Verify RaceDataEntry Interface
File: [src/utils/constants.ts](src/utils/constants.ts)
- [x] Interface is exported as `export interface RaceDataEntry` → line 19
- [x] Property `ability_bonuses: Partial<Record<Ability, number>>` exists → line 21
- [x] Property `speed: number` exists → line 24
- [x] Property `traits: string[]` exists → line 27
- [x] Property `subraces?: string[]` exists → line 30

## Task 4.2: Verify Helper Functions
- [x] `getRaceData(race: string): RaceDataEntry | undefined` exported → [constants.ts:172](src/utils/constants.ts#L172) (also re-exported from index.ts)
- [x] `getRaceDataAsync(race: string): Promise<RaceDataEntry | undefined>` exported → [constants.ts:127](src/utils/constants.ts#L127) (FIXED: added re-export from index.ts)

## Task 4.3: Verify ExtensionManager Integration
- [x] Category `'races.data'` is supported → [ExtensionManager.ts:52](src/core/extensions/ExtensionManager.ts#L52)
- [x] ExtensionManager validates custom races → [ExtensionManager.ts:608-638](src/core/extensions/ExtensionManager.ts#L608) (validates: race, speed, traits, ability_bonuses, subraces)

**FINDING**: Added `CustomRaceDataEntry` interface to properly type custom race data (includes `race` property)

---

# Phase 5: Subrace Support (Part 3)

**Documentation Reference:** MIGRATION_GUIDE.md → Part 3: Prerequisites & Custom Races → Subrace Support

## Task 5.1: Verify CharacterSheet Updates
File: [src/core/types/Character.ts](src/core/types/Character.ts)
- [x] Property `subrace?: string` exists on CharacterSheet → line 236
- [x] Property has correct documentation comment → **Verified: `/** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */`**

## Task 5.2: Verify FeaturePrerequisite Updates
File: [src/core/features/FeatureTypes.ts](src/core/features/FeatureTypes.ts)
- [ ] Property `subrace?: string` exists
- [ ] Property has comment "Specific subrace required (e.g., 'High Elf', 'Hill Dwarf')"
- [ ] Property `skills?: string[]` exists
- [ ] Property has comment "Skills that must be proficient first (by skill ID)"
- [ ] Property `spells?: string[]` exists
- [ ] Property has comment "Spells that must be known first (by spell name)"

## Task 5.3: Verify Integration Points
- [ ] FeatureRegistry.validatePrerequisites() checks subrace
- [ ] FeatureRegistry.validatePrerequisites() checks skills
- [ ] FeatureRegistry.validatePrerequisites() checks spells
- [ ] CharacterGenerator filters racial traits by subrace
- [ ] RacialTrait interface supports subrace property

---

# Phase 6: Template-Based Custom Classes (Part 4)

**Documentation Reference:** MIGRATION_GUIDE.md → Part 4: Template-Based Custom Classes

## Task 6.1: Verify Class Type Extensibility
File: [src/core/types/Character.ts](src/core/types/Character.ts)
- [ ] `Class` is a branded type → line 48
- [ ] `asClass(value: string): Class` function exists → line 65
- [ ] `isValidClass(value: unknown): value is Class` function exists → line 113
- [ ] `DEFAULT_CLASSES` constant exists

## Task 6.2: Verify ExtensionManager Categories
- [ ] Category `'classes.data'` is supported
- [ ] Category `classSpellLists.${ClassName}` is supported
- [ ] Category `classSpellSlots` is supported
- [ ] Category `classStartingEquipment.${ClassName}` is supported

## Task 6.3: Verify ClassDataEntry Interface
File: [src/utils/constants.ts](src/utils/constants.ts)
- [ ] Interface is exported → line 266
- [ ] Property `baseClass?: Class` exists with proper JSDoc
- [ ] Property `name: string` exists
- [ ] Property `primary_ability: Ability` exists
- [ ] Property `hit_die: number` exists
- [ ] Property `saving_throws: Ability[]` exists
- [ ] Property `is_spellcaster: boolean` exists
- [ ] Property `skill_count: number` exists
- [ ] Property `available_skills: string[]` exists
- [ ] Property `has_expertise: boolean` exists
- [ ] Property `expertise_count?: number` exists
- [ ] Property `audio_preferences?: {...}` exists with full nested structure

## Task 6.4: Verify Helper Functions
- [ ] `getClassData(className: string)` exists → line 491
- [ ] `getClassDataAsync(className: string)` exists → line 395
- [ ] `getClassSpellList(className: string)` exists → line 1425
- [ ] `getSpellSlotsForClass(className: string, level: number)` exists → line 1485
- [ ] `getClassStartingEquipment(className: string)` exists → line 1551

## Task 6.5: Verify Merge Logic Implementation
- [ ] getClassData performs shallow merge with baseClass
- [ ] `available_skills` is replaced (not merged)
- [ ] Other properties are inherited unless specified
- [ ] JSDoc documents merge behavior correctly

## Task 6.6: Verify Consuming Files
- [ ] SkillAssigner.ts uses getClassData()
- [ ] SpellManager.ts uses getClassSpellList()
- [ ] SpellManager.ts uses getSpellSlotsForClass()
- [ ] EquipmentGenerator.ts uses getClassStartingEquipment()
- [ ] AbilityScoreCalculator.ts uses getClassData()
- [ ] ExtensionManager validates custom classes

---

# Phase 7: Tests & Documentation

**Documentation Reference:** MIGRATION_GUIDE.md → Tests Added / Documentation Updated

## Task 7.1: Verify Test Files Exist (Part 3)
- [ ] tests/unit/skillPrerequisites.test.ts
- [ ] tests/unit/spellPrerequisites.test.ts
- [ ] tests/unit/customRaces.test.ts (29 tests documented)
- [ ] tests/unit/subraces.test.ts (28 tests documented)
- [ ] tests/integration/prerequisitesAndRaces.integration.test.ts (33 tests documented)

## Task 7.2: Verify Test Files Exist (Part 4)
- [ ] tests/unit/customClasses.test.ts
- [ ] tests/integration/customClasses.integration.test.ts

## Task 7.3: Verify Documentation Updates
- [ ] DATA_ENGINE_REFERENCE.md has prerequisites section
- [ ] DATA_ENGINE_REFERENCE.md has custom races section
- [ ] DATA_ENGINE_REFERENCE.md has custom classes section
- [ ] USAGE_IN_OTHER_PROJECTS.md has dragon-themed examples
- [ ] USAGE_IN_OTHER_PROJECTS.md has Necromancer class example
- [ ] docs/PREREQUISITES.md exists
- [ ] docs/CUSTOM_CONTENT.md exists

## Task 7.4: Verify Example Code Works
- [ ] Dragon-themed skill example compiles
- [ ] Custom race registration example compiles
- [ ] Subrace-specific trait example compiles
- [ ] Necromancer class example compiles

---

# Summary Table: All Documented Changes

| # | Change | Part | Type | File References | Verified |
|---|--------|------|------|-----------------|----------|
| 1 | Ammunition format | 2 | Breaking | constants.ts:1997, 2005 | [ ] |
| 2 | Feature ID format | 2 | Breaking | Character.ts:279, 343 | [ ] |
| 3 | Skill prerequisites | 3 | Feature | SkillTypes.ts:25 | [ ] |
| 4 | Spell prerequisites | 3 | Feature | SpellTypes.ts:27 (discrepancy: not in constants.ts) | [x] |
| 5 | Custom races | 3 | Feature | constants.ts:14, 167 | [ ] |
| 6 | Subrace support | 3 | Feature | Character.ts:236, FeatureTypes.ts:68 | [ ] |
| 7 | Template classes | 4 | Feature | constants.ts:266, Character.ts:48 | [ ] |
| 8 | Class data helpers | 4 | Feature | constants.ts:491, 1425, 1485, 1551 | [ ] |

---

# Notes: Items Requiring Follow-up

## Redundancy / Potential Duplicates
- [ ] SkillPrerequisite and SpellPrerequisite have nearly identical structures - evaluate if consolidation is possible
- [ ] getRaceData() and getRaceDataAsync() both exist - determine if both are needed

## Discrepancies Found During Verification
- [x] **SpellPrerequisite location**: Interface is in `src/core/spells/SpellTypes.ts` NOT `src/utils/constants.ts` as documented (file comments indicate this was moved in Phase 6 Task 6.3/6.4)
- [x] **SpellPrerequisite.class type**: Uses `Class` branded type instead of `string` (better type safety)
- [x] **SpellPrerequisite.race property**: Code has `race?: string` property not documented in the plan
- [ ] _Document any additional items found in code but not documented_
- [ ] _Document any items documented but not found in code_
- [ ] _Document any signature/type mismatches_

## Investigation Needed
- [ ] Verify merge logic in getClassData handles edge cases (missing baseClass, invalid baseClass)
- [ ] Confirm available_skills replacement is consistent across all code paths
- [ ] Verify subrace propagation through entire character generation pipeline
- [ ] Check if tests actually pass (run test suite)

---

# Standard Verification Checklist

Use this checklist for EACH item verified above:

### Code Existence
- [ ] File exists at expected location
- [ ] Item (interface/function/class/property) is defined

### Naming & Signature
- [ ] Name matches documentation exactly (case-sensitive)
- [ ] Parameters match documentation (names, types, optional status)
- [ ] Return type matches documentation

### Export Status
- [ ] Public items are exported (export / export default)
- [ ] Internal items are NOT documented as public
- [ ] Re-exports are correct

### Type Accuracy
- [ ] Type annotations are accurate
- [ ] Generics/constraints match documentation
- [ ] Optional properties are correctly marked

### Documentation Quality
- [ ] JSDoc comments exist for public APIs
- [ ] Comments describe behavior accurately
- [ ] Examples in documentation compile and run

---

# How to Use This Plan

1. **Start with Phase 1** and work through each phase sequentially
2. **Check off each task** as you complete verification
3. **Document discrepancies** in the "Items Requiring Follow-up" section
4. **Update the status bar** at the top as you progress
5. **Run tests** to verify test counts match documentation

## Verification Commands

```bash
# Quick file existence checks
find src -name "SpellValidator.ts"
find src -name "SkillValidator.ts"
find tests -name "*Prerequisite*.test.ts"
find tests -name "*custom*.test.ts"

# Run all tests
npm test

# Run specific test files
npm test -- skillPrerequisites
npm test -- spellPrerequisites
npm test -- customRaces
npm test -- customClasses
```

---

*Generated from MIGRATION_GUIDE.md for playlist-data-engine*
*Version: 2.0.0+ (Extensibility Upgrade)*
