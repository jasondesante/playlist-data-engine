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
- [x] `Ability` type exists
- [x] Contains expected values (STR, DEX, CON, INT, WIS, CHA)

### Task 1.4: asClass Function
- [x] `asClass(value: string): Class` function exists
- [x] Located at: src/core/types/Character.ts
- [x] Properly exported

### Task 1.5: isValidClass Type Guard
- [x] `isValidClass(value: string): value is Class` function exists
- [x] Located at: src/core/types/Character.ts
- [x] Properly exported

---

# Phase 2: Interfaces

**Focus:** Verify all interface definitions with their properties.

### Task 2.1: Race-Related Interfaces

**RaceDataEntry interface:**
- [x] Find location (src/utils/constants.ts lines 14-26)
- [x] Properties: `ability_bonuses: Partial<Record<Ability, number>>`
- [x] Properties: `speed: number`
- [x] Properties: `traits: string[]`
- [x] Properties: `subraces?: string[]`

**RacialTrait interface:**
- [x] Find location (src/core/features/FeatureTypes.ts lines 162-192)
- [x] Properties: `id: string`
- [x] Properties: `name: string`
- [x] Properties: `race: Race`
- [x] Properties: `subrace?: string`
- [x] Properties: `prerequisites?: FeaturePrerequisite`
- [x] Properties: `effects?: FeatureEffect[]`
- [x] Properties: `source: 'default' | 'custom'` (implemented as FeatureSource type)

### Task 2.2: Character Interfaces

**CharacterSheet interface:**
- [x] Find location (src/core/types/Character.ts lines 228-376)
- [x] Properties: `race: Race`
- [x] Properties: `subrace?: string`

### Task 2.3: Class-Related Interface

**ClassDataEntry interface:**
- [x] Located at: src/utils/constants.ts (lines 266-317)
- [x] `primary_ability: Ability`
- [x] `hit_die: number`
- [x] `saving_throws: Ability[]`
- [x] `is_spellcaster: boolean`
- [x] `skill_count: number`
- [x] `available_skills: string[]`
- [x] `has_expertise: boolean`
- [x] `expertise_count?: number`
- [x] `baseClass?: Class`
- [x] `audio_preferences?: object` with proper shape (primary, secondary?, tertiary?, bass?, treble?, mid?, amplitude?)

### Task 2.4: Feature/Effect Interfaces

**FeaturePrerequisite interface:**
- [x] Find location (src/core/features/FeatureTypes.ts lines 68-95)
- [x] Has `subrace?: string` property

**FeatureEffect interface:**
- [x] Find location (src/core/features/FeatureTypes.ts lines 39-54)
- [x] Supports `{ type: 'ability_unlock', target, value }` shape (type includes 'ability_unlock')

### Task 2.5: Audio/RNG Interfaces

**AudioProfile interface:**
- [x] Find location (src/core/types/AudioProfile.ts lines 5-40)

**SeededRNG interface/class:**
- [x] Find location (src/utils/random.ts line 7 - implemented as class)

---

# Phase 3: Helper Functions

**Focus:** Verify utility functions for retrieving data.

### Task 3.1: Race Helper
**getRaceData function:**
- [x] Find location (src/utils/constants.ts lines 167-190)
- [x] Signature: `getRaceData(race: string): RaceDataEntry | undefined`
- [x] Returns race data from default or custom races
- [x] Exported from 'playlist-data-engine'

### Task 3.2: Class Helpers (src/utils/constants.ts)
**getClassData function:**
- [x] Located at: src/utils/constants.ts (lines 491-525)
- [x] Signature: `getClassData(className: string): ClassDataEntry | undefined`
- [x] Implements template merge logic for `baseClass`
- [x] Exported from 'playlist-data-engine'

**getClassSpellList function:**
- [x] Located at: src/utils/constants.ts (lines 1425-1447)
- [x] Returns: `{ cantrips: string[], spells_by_level: Record<number, string[]> } | undefined`
- [x] Exported from 'playlist-data-engine'

**getSpellSlotsForClass function:**
- [x] Located at: src/utils/constants.ts (lines 1485-1516)
- [x] Signature: `getSpellSlotsForClass(className: string, characterLevel: number): Record<number, number> | undefined`
- [x] Exported from 'playlist-data-engine'

**getClassStartingEquipment function:**
- [x] Located at: src/utils/constants.ts (lines 1551-1582)
- [x] Returns: `{ weapons: string[], armor: string[], items: string[] } | undefined`
- [x] Exported from 'playlist-data-engine'

---

# Phase 4: ExtensionManager

**Focus:** Verify the ExtensionManager class and all its methods.

**Location:** src/core/extensions/ExtensionManager.ts

### Task 4.1: Class Structure
- [x] `ExtensionManager` class exists (line 158)
- [x] Singleton pattern implemented (line 159, getInstance at lines 173-178)
- [ ] Exported from 'playlist-data-engine' (to verify in Phase 8)

### Task 4.2: Core Methods
- [x] `getInstance()` static method - returns singleton instance (lines 173-178)
- [x] `register(category: string, items: any, options?: object)` method (lines 204-311)
- [x] `setWeights(category: string, weights: Record<string, number>)` method (lines 361-363)
- [x] `getWeights(category: string): Record<string, number>` method (lines 370-375)
- [x] `getDefaultWeights(category: string): Record<string, number>` method (lines 382-394)
- [x] `hasCustomData(category: string): boolean` method (lines 401-403)
- [x] `getInfo(category: string): ExtensionInfo` method (lines 699-721)
- [x] `reset(category: string)` method (lines 662-684)
- [x] `resetAll()` method (lines 689-692)

---

# Phase 5: FeatureRegistry

**Focus:** Verify the FeatureRegistry class and methods.

### Task 5.1: Class Structure
- [x] `FeatureRegistry` class exists (src/core/features/FeatureRegistry.ts line 31)
- [x] Singleton pattern implemented (line 32, getInstance at lines 49-54)
- [ ] Exported from 'playlist-data-engine' (to verify in Phase 8)

### Task 5.2: Methods
- [x] `getInstance()` static method (lines 49-54)
- [x] `registerRacialTrait(trait: RacialTrait)` method (lines 132-152)
- [x] `getRacialTraitsForSubrace(race: string, subrace: string)` method (lines 221-224)

---

# Phase 6: ClassSuggester

**Focus:** Verify the ClassSuggester class.

**Location:** src/core/generation/ClassSuggester.ts

### Task 6.1: Class Structure
- [x] `ClassSuggester` class exists (src/core/generation/ClassSuggester.ts line 41)
- [ ] Exported from 'playlist-data-engine' (to verify in Phase 8)

### Task 6.2: Methods
- [x] `suggest(audioProfile: AudioProfile, rng: SeededRNG): string` static method (lines 100-122)
- [x] Includes custom classes with audio_preferences in matching (line 105 gets all classes, line 171 checks CLASS_AUDIO_PREFERENCES)

---

# Phase 7: Constants

**Focus:** Verify all documented constants.

### Task 7.1: Default Values
- [x] Default classes: 'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard' (lines 794-807)
- [x] Default races: 'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling' (lines 781-791)

### Task 7.2: Class Data Constants (src/utils/constants.ts)
- [x] `CLASS_DATA` constant exists at src/utils/constants.ts (lines 528-653)
- [x] `CLASS_SPELL_LISTS` constant (lines 997-1081)
- [x] `SPELL_SLOTS_BY_CLASS` constant (lines 1102-1279)
- [x] `CLASS_STARTING_EQUIPMENT` constant (lines 1345-1410)

---

# Phase 8: Package Exports

**Focus:** Verify all items are properly exported from the package.

**Location:** src/index.ts (or main entry point)

### Task 8.1: Class Exports
- [x] `ExtensionManager` exported (line 342)
- [x] `FeatureRegistry` exported (line 266)
- [x] `ClassSuggester` exported (line 183)

### Task 8.2: Function Exports
- [x] `getRaceData` exported - ADDED to src/index.ts (line 426)
- [x] `asClass` exported (line 175)
- [x] `isValidClass` exported - ADDED to src/index.ts (line 175)
- [x] `getClassData` exported - ADDED to src/index.ts (line 431)
- [x] `getClassSpellList` exported - ADDED to src/index.ts (line 432)
- [x] `getSpellSlotsForClass` exported - ADDED to src/index.ts (line 433)
- [x] `getClassStartingEquipment` exported - ADDED to src/index.ts (line 434)

### Task 8.3: Type Exports
- [x] `Race` type exported (line 28)
- [x] `Class` type exported (line 29)
- [x] `RaceDataEntry` type exported - ADDED to src/index.ts (line 114)
- [x] `ClassDataEntry` type exported - ADDED to src/index.ts (line 114)
- [x] `ClassSpellListData` type exported - ADDED to src/index.ts (line 114)
- [ ] Type augmentation supported via `declare module 'playlist-data-engine'` (not applicable - using branded types instead)

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
| 1 | [x] Complete | 2026-01-31 | Core Types verified |
| 2 | [x] Complete | 2026-01-31 | Interfaces verified |
| 3 | [x] Complete | 2026-01-31 | Helper Functions verified |
| 4 | [x] Complete | 2026-01-31 | ExtensionManager verified |
| 5 | [x] Complete | 2026-01-31 | FeatureRegistry verified |
| 6 | [x] Complete | 2026-01-31 | ClassSuggester verified |
| 7 | [x] Complete | 2026-01-31 | Constants verified |
| 8 | [x] Complete | 2026-01-31 | Package Exports verified & fixed missing exports |
| 9 | [ ] Pending | | Advanced Features |
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
