# Playlist Data Engine Update Guide

## Overview

This guide summarizes the major changes and new features introduced across the extensibility upgrade phases.

**Version:** 2.0.0+ (Extensibility Upgrade)
**Affected Versions:** All versions prior to 2.0.0

---

## Phase 1-11 Summary (Part 2)

### Breaking Changes

#### 1. Ammunition Format Change

**Impact:** High - Affects stored character data and equipment lookups

**Before (Old Format):**
```typescript
// Old equipment entry
'Arrows (20)': { name: 'Arrows (20)', type: 'item', rarity: 'common', weight: 1 }

// Old character equipment
equipment: [
    { name: 'Arrows (20)', quantity: 1, equipped: false }
]
```

**After (New Format):**
```typescript
// New equipment entry
'Arrow': { name: 'Arrow', type: 'item', rarity: 'common', weight: 0.05 }

// New character equipment (20 individual arrows)
equipment: [
    { name: 'Arrow', quantity: 20, equipped: false }
]
```

**What Changed:**
- Ammunition is now tracked as **individual items** with quantity
- `Arrow` weight changed from 1 lb (for 20) to 0.05 lb (each)
- `Bolt` weight changed from 1.5 lb (for 20) to 0.075 lb (each)
- Rangers and Fighters now receive ammunition programmatically

#### 2. Feature ID Format Change

**Impact:** High - Affects stored character data

**Before (Old Format):**
```typescript
// Old character features (display strings)
class_features: ['Barbarian Level 1', 'Barbarian Level 2', 'Barbarian Level 5']
racial_traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry']
```

**After (New Format):**
```typescript
// New character features (feature IDs from registry)
class_features: ['barbarian_rage', 'barbarian_unarmored_defense', 'barbarian_extra_attack']
racial_traits: ['elf_darkvision', 'elf_keen_senses', 'elf_fey_ancestry']
```

**What Changed:**
- Features are now stored as **feature IDs** (e.g., `'barbarian_rage'`) instead of display strings (e.g., `'Barbarian Level 1'`)
- A new **FeatureRegistry** manages all class features and racial traits
- A new **FeatureEffect** system has been added to track mechanical effects from features
- The `feature_effects` property has been added to `CharacterSheet` to store applied effects

### New Features

- **Extensibility System**: ExtensionManager for custom content registration
- **Feature Registry**: FeatureRegistry for class features and racial traits
- **Custom Spawn Weights**: Control spawn rates for any category

---

## Part 3: Prerequisites & Custom Races

### Overview

Part 3 introduced prerequisite validation systems for skills and spells, along with full custom race and subrace support.

### New Features

#### 1. Skill Prerequisites

Skills can now require:
- Features, abilities, other skills, or spells
- Level, class, or race requirements
- Custom conditions

**Interface:**
```typescript
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description */
    custom?: string;
}
```

**Files Added/Modified:**
- `src/core/spells/SpellValidator.ts` - **NEW FILE**
- `src/core/skills/SkillValidator.ts` - Added `validateSkillPrerequisites()`
- `src/core/generation/SkillAssigner.ts` - Added prerequisite filtering
- `src/core/skills/SkillRegistry.ts` - Added `validatePrerequisites()`

#### 2. Spell Prerequisites

Spells can now require:
- Features, other spells, or skills
- Caster level, abilities
- Class requirements

**Interface:**
```typescript
export interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Custom condition */
    custom?: string;
}
```

**Files Modified:**
- `src/core/generation/SpellManager.ts` - Added prerequisite filtering to `getKnownSpells()`
- `src/core/generation/CharacterGenerator.ts` - Pass character to `SpellManager.initializeSpells()`

#### 3. Custom Race Support

Custom races can now be registered via ExtensionManager:

```typescript
const manager = ExtensionManager.getInstance();

// Register custom race data
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// Register the race name
manager.register('races', ['Dragonkin']);
```

**Files Modified:**
- `src/core/extensions/ExtensionManager.ts` - Added custom race validation
- `src/utils/constants.ts` - Added `getRaceData()` helper function and `RaceDataEntry` interface

#### 4. Subrace Support

Characters can now have a `subrace` property:

**Interface Updates:**
```typescript
// CharacterSheet
export interface CharacterSheet {
    // ... existing fields
    race: Race;
    /** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
    subrace?: string;
}

// FeaturePrerequisite
export interface FeaturePrerequisite {
    // ... existing fields
    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;
    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];
    /** Spells that must be known first (by spell name) */
    spells?: string[];
}

// RaceDataEntry
export interface RaceDataEntry {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
    /** Available subraces for this race */
    subraces?: string[];
}
```

**Files Modified:**
- `src/core/types/Character.ts` - Added `subrace?: string` property
- `src/core/features/FeatureTypes.ts` - Added `subrace`, `skills`, `spells` to FeaturePrerequisite
- `src/core/features/FeatureRegistry.ts` - Added subrace/skills/spells validation in `validatePrerequisites()`
- `src/core/generation/CharacterGenerator.ts` - Added subrace filtering for racial traits

### Tests Added

- `tests/unit/skillPrerequisites.test.ts` - All passing
- `tests/unit/spellPrerequisites.test.ts` - All passing
- `tests/unit/customRaces.test.ts` - 29 tests passing
- `tests/unit/subraces.test.ts` - 28 tests passing
- `tests/integration/prerequisitesAndRaces.integration.test.ts` - 33 tests passing

### Documentation Updated

- `DATA_ENGINE_REFERENCE.md` - Added prerequisites and custom races sections
- `USAGE_IN_OTHER_PROJECTS.md` - Added dragon-themed examples
- Created `docs/PREREQUISITES.md` - Prerequisites system guide (now split into separate docs)
- Created `docs/CUSTOM_CONTENT.md` - Custom races, classes, and spawn rate control (now split into separate docs)

### Example: Dragon-Themed Content

```typescript
// Skill with prerequisites
const dragonSmithing: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer feature
        level: 5,
        class: 'Sorcerer'
    },
    source: 'custom'
};

// Custom race with subraces
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// Subrace-specific racial trait
manager.register('racialTraits', [{
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for this subrace
    prerequisites: {
        subrace: 'Fire Dragonkin'
    },
    effects: [
        { type: 'passive_modifier', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);
```

---

## Part 4: Template-Based Custom Classes

### Overview

Part 4 introduced template-based custom classes that can extend existing D&D 5e classes via inheritance.

### New Features

#### 1. Class Type Extensibility

Class type now supports custom classes via validation at runtime.

#### 2. Class Data Registration

New categories for custom class data:
- `'classes.data'` - Class definitions with `baseClass` inheritance
- `classSpellLists.${ClassName}` - Custom spell lists
- `classSpellSlots` - Spell slot progressions
- `classStartingEquipment.${ClassName}` - Starting equipment

**Helper Functions Added:**
```typescript
export function getClassData(className: string): ClassDataEntry | undefined;
export function getClassSpellList(className: string): SpellListEntry | undefined;
export function getSpellSlotsForClass(className: string, level: number): SpellSlotsEntry | undefined;
export function getClassStartingEquipment(className: string): StartingEquipmentEntry | undefined;
```

#### 3. Template Class Pattern

Custom classes can extend base classes via `baseClass` property:

```typescript
const manager = ExtensionManager.getInstance();

// Register a custom "Necromancer" class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Register the class name
manager.register('classes', ['Necromancer']);
```

**Merge Logic:**
- Shallow merge: Base properties are spread first, custom properties override
- `available_skills` array is **completely replaced** (not merged)
- All other properties inherited unless specified

**Interface:**
```typescript
export interface ClassDataEntry {
    /** For template-based classes: extends this base class */
    baseClass?: Class;
    name: string;
    primary_ability: Ability;
    hit_die: number;
    saving_throws: Ability[];
    is_spellcaster: boolean;
    skill_count: number;
    available_skills: string[];
    has_expertise: boolean;
    expertise_count?: number;
    audio_preferences?: {
        primary: string;
        secondary?: string;
        tertiary?: string;
        bass?: number;
        treble?: number;
        mid?: number;
        amplitude?: number;
    };
}
```

**Property Override Behavior:**

| Property | Behavior | Example |
|----------|----------|---------|
| `primary_ability` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `INT` |
| `hit_die` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `8` |
| `saving_throws` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `['INT', 'WIS']` |
| `is_spellcaster` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `true` |
| `skill_count` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `2` |
| `available_skills` | **Replaced** (not merged) | Custom list replaces base entirely |

### Common Patterns

#### 1. Archetype Variant (Same class, different flavor)
```typescript
{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}
```

#### 2. Multiclass-Inspired (Two classes combined)
```typescript
{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}
```

#### 3. Specialist (Narrow focus)
```typescript
{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}
```

### Files Modified

- `src/utils/constants.ts` - Added `ClassDataEntry`, `getClassData()`, `getClassSpellList()`, `getSpellSlotsForClass()`, `getClassStartingEquipment()`
- `src/core/generation/SkillAssigner.ts` - Use `getClassData()` instead of `CLASS_DATA`
- `src/core/generation/SpellManager.ts` - Use `getClassSpellList()` and `getSpellSlotsForClass()`
- `src/core/generation/EquipmentGenerator.ts` - Use `getClassStartingEquipment()`
- `src/core/generation/AbilityScoreCalculator.ts` - Use `getClassData()`
- `src/core/extensions/ExtensionManager.ts` - Class validation for custom classes

### Tests Added

- `tests/unit/customClasses.test.ts` - Custom class registration tests
- `tests/integration/customClasses.integration.test.ts` - Character generation with custom classes

### Documentation Updated

- `DATA_ENGINE_REFERENCE.md` - Added custom classes section
- `USAGE_IN_OTHER_PROJECTS.md` - Added Necromancer class example

### Example: Complete Custom Class

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom skill
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control',
    prerequisites: { class: 'Necromancer' },
    source: 'custom'
}]);

// Register custom class data
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
}]);

// Register the class name
manager.register('classes', ['Necromancer']);

// Register custom features
manager.register('classFeatures.Necromancer', [
    {
        id: 'necromancer_raise_dead',
        name: 'Raise Undead',
        description: 'Can raise undead creatures',
        type: 'active',
        level: 1,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            abilities: { INT: 13 }
        },
        effects: [
            { type: 'ability_unlock', target: 'raise_undead', value: true }
        ],
        source: 'custom'
    }
], { mode: 'replace' });

// Register custom spell list
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death']
    }
}]);

// Generate a Necromancer character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: 'Necromancer' }
);
```

---

## Summary Table

| Change | Part | Type | Description |
|--------|------|------|-------------|
| Ammunition format | Part 2 | Breaking | `'Arrows (20)'` → `'Arrow'` with quantity 20 |
| Feature ID format | Part 2 | Breaking | Display strings → feature IDs |
| Skill prerequisites | Part 3 | Feature | Skills can require features, abilities, level, class, race, spells |
| Spell prerequisites | Part 3 | Feature | Spells can require features, skills, abilities, level |
| Custom races | Part 3 | Feature | Register custom races via ExtensionManager |
| Subrace support | Part 3 | Feature | Characters have subrace property, traits can require subrace |
| Template classes | Part 4 | Feature | Custom classes extend base classes via `baseClass` |
| Class data helpers | Part 4 | Feature | `getClassData()`, spell/slot/equipment helpers |

---

## Key Files by Part

### Part 3 (Prerequisites & Races)
- `src/core/skills/SkillTypes.ts` - SkillPrerequisite interface
- `src/core/spells/SpellValidator.ts` - **NEW FILE**
- `src/core/generation/SkillAssigner.ts` - Prerequisite filtering
- `src/core/generation/SpellManager.ts` - Prerequisite filtering
- `src/core/extensions/ExtensionManager.ts` - Custom race validation
- `src/utils/constants.ts` - SpellPrerequisite, getRaceData()
- `src/core/types/Character.ts` - subrace property
- `src/core/features/FeatureTypes.ts` - FeaturePrerequisite updates (skills, spells, subrace)

### Part 4 (Template Classes)
- `src/utils/constants.ts` - ClassDataEntry, helper functions
- `src/core/generation/SkillAssigner.ts` - Use getClassData()
- `src/core/generation/SpellManager.ts` - Use helper functions
- `src/core/generation/EquipmentGenerator.ts` - Use helper functions
- `src/core/generation/AbilityScoreCalculator.ts` - Use getClassData()
- `src/core/extensions/ExtensionManager.ts` - Custom class validation

---

## Need Help?

- **Documentation:** See `DATA_ENGINE_REFERENCE.md` for complete API docs
- **Examples:** See `USAGE_IN_OTHER_PROJECTS.md` for usage examples
- **Issues:** Report bugs at the project repository
