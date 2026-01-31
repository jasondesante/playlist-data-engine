# Custom Content Reference - Verification Plan

## Dynamic Plan Updates

**If any discrepancies are discovered between the documentation and code during execution:**

1. **Add a new Phase** to the end of this plan
2. **Research the tasks** required to investigate and resolve the discrepancy
3. **Write the tasks** into the new phase with checkboxes
4. **Fix the problem** when execution reaches that new phase

This ensures the plan remains a living document that adapts to findings, rather than being disrupted by unexpected issues.

---

## Overview

**Goal:** Verify that every documented item in [CUSTOM_CONTENT.md](CUSTOM_CONTENT.md) actually exists in the codebase and is correctly described.

This plan organizes verification into **phases** and **tasks** to systematically validate:
1. All exported types, interfaces, classes, and functions exist at their documented locations
2. Names match exactly (case-sensitive)
3. Signatures and parameters match documentation
4. Items are exported correctly (export / export default / internal)
5. Type annotations are accurate
6. Generics and constraints are documented correctly

---

## Quick Reference

| Phase | Focus | Estimated Items |
|-------|-------|-----------------|
| 1 | Core Types | 5 |
| 2 | Interfaces | 12 |
| 3 | Helper Functions | 5 |
| 4 | ExtensionManager | 10 |
| 5 | FeatureRegistry | 3 |
| 6 | ClassSuggester | 1 |
| 7 | Constants | 7 |
| 8 | Package Exports | 11 |
| 9 | Advanced Features | 14 |

---

# Phase 1: Core Types (src/core/types/Character.ts)

**Focus:** Verify fundamental type definitions and their helper functions.

### Task 1.1: Race Type
- [x] `Race` type exists as closed union
- [x] Contains all default races: 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
- [x] Type is exported from 'playlist-data-engine'

### Task 1.2: Class Type
- [x] `Class` type exists as branded type (`string & { readonly __ClassBrand: unique symbol }`)
- [x] Type is exported from 'playlist-data-engine'

### Task 1.3: Ability Type
- [ ] `Ability` type exists
- [ ] Contains expected values (STR, DEX, CON, INT, WIS, CHA)

### Task 1.4: asClass Function
- [ ] `asClass(value: string): Class` function exists
- [ ] Located at: src/core/types/Character.ts
- [ ] Properly exported

### Task 1.5: isValidClass Type Guard
- [ ] `isValidClass(value: string): value is Class` function exists
- [ ] Located at: src/core/types/Character.ts
- [ ] Properly exported

---

# Phase 2: Interfaces

**Focus:** Verify all interface definitions with their properties.

### Task 2.1: Race-Related Interfaces

**RaceDataEntry interface:**
- [ ] Find location (search required)
- [ ] Properties: `ability_bonuses: Partial<Record<Ability, number>>`
- [ ] Properties: `speed: number`
- [ ] Properties: `traits: string[]`
- [ ] Properties: `subraces?: string[]`

**RacialTrait interface:**
- [ ] Find location (search required)
- [ ] Properties: `id: string`
- [ ] Properties: `name: string`
- [ ] Properties: `race: Race`
- [ ] Properties: `subrace?: string`
- [ ] Properties: `prerequisites?: FeaturePrerequisite`
- [ ] Properties: `effects?: FeatureEffect[]`
- [ ] Properties: `source: 'default' | 'custom'`

### Task 2.2: Character Interfaces

**CharacterSheet interface:**
- [ ] Find location (search required)
- [ ] Properties: `race: Race`
- [ ] Properties: `subrace?: string`

### Task 2.3: Class-Related Interface

**ClassDataEntry interface:**
- [ ] Located at: src/utils/constants.ts
- [ ] `primary_ability: Ability`
- [ ] `hit_die: number`
- [ ] `saving_throws: Ability[]`
- [ ] `is_spellcaster: boolean`
- [ ] `skill_count: number`
- [ ] `available_skills: string[]`
- [ ] `has_expertise: boolean`
- [ ] `expertise_count?: number`
- [ ] `baseClass?: Class`
- [ ] `audio_preferences?: object` with proper shape

### Task 2.4: Feature/Effect Interfaces

**FeaturePrerequisite interface:**
- [ ] Find location (search required)
- [ ] Has `subrace?: string` property

**FeatureEffect interface:**
- [ ] Find location (search required)
- [ ] Supports `{ type: 'ability_unlock', target, value }` shape

### Task 2.5: Audio/RNG Interfaces

**AudioProfile interface:**
- [ ] Find location (search required)

**SeededRNG interface/class:**
- [ ] Find location (search required)

---

# Phase 3: Helper Functions

**Focus:** Verify utility functions for retrieving data.

### Task 3.1: Race Helper
**getRaceData function:**
- [ ] Find location (search required)
- [ ] Signature: `getRaceData(race: string)`
- [ ] Returns race data from default or custom races
- [ ] Exported from 'playlist-data-engine'

### Task 3.2: Class Helpers (src/utils/constants.ts)
**getClassData function:**
- [ ] Located at: src/utils/constants.ts
- [ ] Signature: `getClassData(className: string): ClassDataEntry | undefined`
- [ ] Implements template merge logic for `baseClass`
- [ ] Exported from 'playlist-data-engine'

**getClassSpellList function:**
- [ ] Located at: src/utils/constants.ts
- [ ] Returns: `{ cantrips: string[], spells_by_level: Record<number, string[]> } | undefined`
- [ ] Exported from 'playlist-data-engine'

**getSpellSlotsForClass function:**
- [ ] Located at: src/utils/constants.ts
- [ ] Signature: `getSpellSlotsForClass(className: string, characterLevel: number): Record<number, number> | undefined`
- [ ] Exported from 'playlist-data-engine'

**getClassStartingEquipment function:**
- [ ] Located at: src/utils/constants.ts
- [ ] Returns: `{ weapons: string[], armor: string[], items: string[] } | undefined`
- [ ] Exported from 'playlist-data-engine'

---

# Phase 4: ExtensionManager

**Focus:** Verify the ExtensionManager class and all its methods.

**Location:** src/core/extensions/ExtensionManager.ts

### Task 4.1: Class Structure
- [ ] `ExtensionManager` class exists
- [ ] Singleton pattern implemented
- [ ] Exported from 'playlist-data-engine'

### Task 4.2: Core Methods
- [ ] `getInstance()` static method - returns singleton instance
- [ ] `register(category: string, items: any, options?: object)` method
- [ ] `setWeights(category: string, weights: Record<string, number>)` method
- [ ] `getWeights(category: string): Record<string, number>` method
- [ ] `getDefaultWeights(category: string): Record<string, number>` method
- [ ] `hasCustomData(category: string): boolean` method
- [ ] `getInfo(category: string): ExtensionInfo` method
- [ ] `reset(category: string)` method
- [ ] `resetAll()` method

---

# Phase 5: FeatureRegistry

**Focus:** Verify the FeatureRegistry class and methods.

### Task 5.1: Class Structure
- [ ] `FeatureRegistry` class exists (find location - search required)
- [ ] Singleton pattern implemented
- [ ] Exported from 'playlist-data-engine'

### Task 5.2: Methods
- [ ] `getInstance()` static method
- [ ] `registerRacialTrait(trait: RacialTrait)` method
- [ ] `getRacialTraitsForSubrace(race: string, subrace: string)` method

---

# Phase 6: ClassSuggester

**Focus:** Verify the ClassSuggester class.

**Location:** src/core/generation/ClassSuggester.ts

### Task 6.1: Class Structure
- [ ] `ClassSuggester` class exists
- [ ] Exported from 'playlist-data-engine'

### Task 6.2: Methods
- [ ] `suggest(audioProfile: AudioProfile, rng: SeededRNG): string` static method
- [ ] Includes custom classes with audio_preferences in matching

---

# Phase 7: Constants

**Focus:** Verify all documented constants.

### Task 7.1: Default Values
- [ ] Default races: 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard'
- [ ] Default classes: 12 D&D 5e classes

### Task 7.2: Class Data Constants (src/utils/constants.ts)
- [ ] `CLASS_DATA` constant exists at src/utils/constants.ts
- [ ] `CLASS_SPELL_LISTS` constant (find location - search required)
- [ ] `SPELL_SLOTS_BY_CLASS` constant (find location - search required)
- [ ] `CLASS_STARTING_EQUIPMENT` constant (find location - search required)

---

# Phase 8: Package Exports

**Focus:** Verify all items are properly exported from the package.

**Location:** src/index.ts (or main entry point)

### Task 8.1: Class Exports
- [ ] `ExtensionManager` exported
- [ ] `FeatureRegistry` exported
- [ ] `ClassSuggester` exported

### Task 8.2: Function Exports
- [ ] `getRaceData` exported
- [ ] `asClass` exported
- [ ] `isValidClass` exported
- [ ] `getClassData` exported
- [ ] `getClassSpellList` exported
- [ ] `getSpellSlotsForClass` exported
- [ ] `getClassStartingEquipment` exported

### Task 8.3: Type Exports
- [ ] `Race` type exported
- [ ] `Class` type exported
- [ ] Type augmentation supported via `declare module 'playlist-data-engine'`

---

# Phase 9: Advanced Features

**Focus:** Verify complex behaviors and configurations.

### Task 9.1: ExtensionManager Registration Categories

**Race-related:**
- [ ] 'races.data' category accepts RaceDataEntry[]
- [ ] 'races' category accepts race name strings
- [ ] 'racialTraits' category accepts RacialTrait[]
- [ ] 'racialTraits.${RaceName}' pattern works for per-race weights

**Class-related:**
- [ ] 'classes.data' category accepts ClassDataEntry[]
- [ ] 'classes' category accepts Class type names
- [ ] 'classFeatures.${ClassName}' pattern works
- [ ] 'classSpellLists.${ClassName}' pattern works
- [ ] 'classSpellSlots' category works
- [ ] 'classStartingEquipment.${ClassName}' pattern works
- [ ] 'skillLists.${ClassName}' pattern works

**General:**
- [ ] 'skills' category works
- [ ] 'spells' category works
- [ ] 'equipment' category works

### Task 9.2: Registration Options
- [ ] `mode: 'relative'` option works
- [ ] `mode: 'absolute'` option works
- [ ] `mode: 'default'` option works
- [ ] `weights: Record<string, number>` option works

### Task 9.3: Template Class Merge Behavior
- [ ] `primary_ability` inherited unless specified
- [ ] `hit_die` inherited unless specified
- [ ] `saving_throws` inherited unless specified
- [ ] `is_spellcaster` inherited unless specified
- [ ] `skill_count` inherited unless specified
- [ ] `available_skills` **replaced** (not merged) - verify in getClassData()
- [ ] `has_expertise` inherited unless specified
- [ ] `audio_preferences` inherited unless specified

### Task 9.4: Audio Preferences Shape
- [ ] `primary: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos'`
- [ ] `secondary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos'`
- [ ] `tertiary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos'`
- [ ] `bass?: number`
- [ ] `treble?: number`
- [ ] `mid?: number`
- [ ] `amplitude?: number`

### Task 9.5: Validation Behavior
**Race validation order:**
- [ ] 1. Check if default race
- [ ] 2. Check if registered as custom race name
- [ ] 3. Check if has data via 'races.data'
- [ ] 4. `{ validate: false }` option bypasses validation

**Class validation:**
- [ ] Class names must be default or registered via 'classes.data'
- [ ] Validation error message matches documented format

### Task 9.6: ExtensionInfo Return Type
- [ ] `hasCustomData: boolean`
- [ ] `defaultCount: number`
- [ ] `customCount: number`
- [ ] `totalCount: number`
- [ ] `mode: string`
- [ ] `weights: Record<string, number>`
- [ ] `registeredAt: number`

---

# Progress Tracking

## Phase Completion Status

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| 1 | [ ] Pending | | Core Types |
| 2 | [ ] Pending | | Interfaces |
| 3 | [ ] Pending | | Helper Functions |
| 4 | [ ] Pending | | ExtensionManager |
| 5 | [ ] Pending | | FeatureRegistry |
| 6 | [ ] Pending | | ClassSuggester |
| 7 | [ ] Pending | | Constants |
| 8 | [ ] Pending | | Package Exports |
| 9 | [ ] Pending | | Advanced Features |

---

# Items Requiring Location Search

The following items have unknown locations and must be searched for during verification:

| Item | Type | Category |
|------|------|----------|
| `Ability` | Type | Phase 1 |
| `RaceDataEntry` | Interface | Phase 2 |
| `RacialTrait` | Interface | Phase 2 |
| `CharacterSheet` | Interface | Phase 2 |
| `FeaturePrerequisite` | Interface | Phase 2 |
| `FeatureEffect` | Interface | Phase 2 |
| `AudioProfile` | Interface | Phase 2 |
| `SeededRNG` | Interface/Class | Phase 2 |
| `getRaceData` | Function | Phase 3 |
| `FeatureRegistry` | Class | Phase 5 |
| `CLASS_SPELL_LISTS` | Constant | Phase 7 |
| `SPELL_SLOTS_BY_CLASS` | Constant | Phase 7 |
| `CLASS_STARTING_EQUIPMENT` | Constant | Phase 7 |

---

# Potential Discrepancies to Investigate

1. **available_skills merge behavior:** Documented as "replaced not merged" - verify actual implementation in `getClassData()`

2. **getRacialTraitsForSubrace():** Documented in FeatureRegistry - verify this method exists and works

3. **Weight modes:** Verify 'relative', 'absolute', 'default' behavior matches documentation

4. **{ validate: false } option:** Documented for race validation - find where this is implemented

5. **ClassSuggester custom class integration:** Verify custom classes with audio_preferences are actually matched in suggest()

6. **Subrace property in CharacterSheet:** Verify `subrace?: string` exists

7. **FeatureEffect ability_unlock shape:** Verify `{ type: 'ability_unlock', target, value }` is supported

8. **RacialTrait source property:** Verify `source: 'default' | 'custom'` exists

---

# Verification Criteria Checklist

For each item verified, confirm:

- [ ] Exists in codebase at expected location
- [ ] Name matches exactly (case-sensitive)
- [ ] Signature/parameters match documentation
- [ ] Exported correctly (export / export default / internal)
- [ ] Type annotations are accurate
- [ ] Any generics or constraints are documented correctly
