# Playlist Data Engine - Extensibility Guide

This guide explains how to extend the Playlist Data Engine with custom content. The extensibility system allows you to add custom spells, equipment, races, classes, and appearance options at runtime, with full control over spawn rates and validation.

---

## Table of Contents

1. [Overview](#overview)
2. [ExtensionManager API](#extensionmanager-api)
3. [Helper Functions](#helper-functions)
4. [Spawn Rate System](#spawn-rate-system)
5. [Category-Specific Examples](#category-specific-examples)
6. [Creating Content Packs](#creating-content-packs)
7. [Validation](#validation)
8. [Best Practices](#best-practices)
9. [Export/Import System](#exportimport-system)
10. [Equipment Subcategories](#equipment-subcategories)
11. [Reference](#reference)

---

## Overview

The extensibility system allows you to:

- **Add custom content** to any procedural generation category
- **Control spawn rates** with relative or absolute weighting
- **Validate content** automatically with clear error messages
- **Create content packs** that can be loaded at runtime

**Location:** [src/core/extensions/ExtensionManager.ts](../src/core/extensions/ExtensionManager.ts)

### Supported Categories

| Category | Description | Example |
|----------|-------------|---------|
| `equipment` | Weapons, armor, items | Custom weapons, magic items |
| `equipment.templates` | Complete equipment templates | Pre-built items with properties |
| `appearance.bodyTypes` | Character body shapes | 'giant', 'diminutive', etc. |
| `appearance.skinTones` | Skin color options | Hex colors |
| `appearance.hairColors` | Hair color options | Hex colors |
| `appearance.hairStyles` | Hair style options | 'braided', 'mohawk', etc. |
| `appearance.eyeColors` | Eye color options | Hex colors |
| `appearance.facialFeatures` | Facial features | 'scar', 'tattoo', etc. |
| `spells` | Arcane and divine magic | Custom spells |
| `spells.{className}` | Class-specific spells | 'spells.Wizard' |
| `races` | Race names | Custom races |
| `races.data` | Race data | Ability bonuses, speed, traits, subraces |
| `classes` | Class names | Custom classes |
| `classes.data` | Class data | Hit die, saves, skills, spellcasting |
| `classFeatures` | All class features | Custom rage, metamagic, etc. |
| `classFeatures.{className}` | Class-specific features | 'classFeatures.Barbarian' |
| `racialTraits` | All racial traits | Custom darkvision, stonecunning |
| `racialTraits.{raceName}` | Race-specific traits | 'racialTraits.Elf' |
| `skills` | All skills (default + custom) | Custom survival, knowledge |
| `skills.{ability}` | Ability-specific skills | 'skills.STR', 'skills.DEX' |
| `skillLists` | All skill lists | Per-class skill selections |
| `skillLists.{className}` | Class-specific skill lists | 'skillLists.Barbarian' |
| `classSpellLists` | All class spell lists | Class-specific spell selections |
| `classSpellLists.{className}` | Class-specific spell list | Custom spell lists |
| `classSpellSlots` | Spell slot progressions | Custom slot progressions by level |
| `classStartingEquipment` | All class starting equipment | Default gear per class |
| `classStartingEquipment.{className}` | Class-specific equipment | Custom starting equipment |

---

## ExtensionManager API

The `ExtensionManager` is a singleton that manages all custom content.

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();
```

**Location:** [src/core/extensions/ExtensionManager.ts](../src/core/extensions/ExtensionManager.ts)

### Core Methods

| Method | Parameters | Return | Description |
|--------|------------|--------|-------------|
| `register()` | `category`, `items`, `options?` | `void` | Register custom content for a category |
| `registerMultiple()` | `registrations[]` | `void` | Register multiple categories at once |
| `get()` | `category` | `any[]` | Get all items (defaults + custom) |
| `getDefaults()` | `category` | `any[]` | Get default items only |
| `getCustom()` | `category` | `any[]` | Get custom items only |
| `setWeights()` | `category`, `weights` | `void` | Set spawn weights for items |
| `getWeights()` | `category` | `Record` | Get current weights (defaults + custom) |
| `getDefaultWeights()` | `category` | `Record` | Get default weights (all 1.0) |
| `setMode()` | `category`, `mode` | `void` | Change spawn mode after registration |
| `getMode()` | `category` | `SpawnMode \| undefined` | Get current spawn mode |
| `hasCustomData()` | `category` | `boolean` | Check if category has custom data |
| `validate()` | `category`, `items` | `ValidationResult` | Validate items without registering |
| `reset()` | `category` | `void` | Reset category to defaults |
| `resetAll()` | | `void` | Reset all categories to defaults |
| `getInfo()` | `category?` | `Record` | Get info about registered extensions |
| `getCurrentOptions()` | `category` | `ExtensionOptions \| undefined` | Get current registration options |
| `exportCustomData()` | | `Record` | Export all custom data |
| `exportCustomDataForCategory()` | `category` | `any[]` | Export custom data for single category |
| `getRegisteredCategories()` | | `ExtensionCategory[]` | Get all categories with defaults |

### Registration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'relative' \| 'absolute' \| 'default' \| 'replace'` | `'relative'` | Spawn mode for this extension |
| `weights` | `Record<string, number>` | `{}` | Custom spawn weights for items |
| `validate` | `boolean` | `true` | Whether to validate items before registering |

**Note:** Setting `mode` or `weights` during registration affects the entire category, not just the items being registered. This is a convenience equivalent to calling `setMode()` or `setWeights()` separately.

### Spawn Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `relative` | Custom items added to default pool with custom weights | Add custom items to existing pool |
| `absolute` | Only custom items can spawn (defaults excluded) | Themed content packs, complete replacement |
| `default` | All items have equal weight (1.0) | Disable custom spawn weights |
| `replace` | Clear previous custom data before registering | Hot-reload content packs during development |

### Weight Values

| Value | Effect |
|-------|--------|
| `0` | Never spawns |
| `0.5` | Half as common as default |
| `1.0` | Default spawn rate |
| `2.0` | Twice as common as default |
| `10.0` | Very common |

### Usage Example

```typescript
// Register custom equipment
manager.register('equipment', [
    { name: 'Dragon Sword', type: 'weapon', rarity: 'legendary', weight: 5 }
], { mode: 'relative', weights: { 'Dragon Sword': 0.5 } });

// Adjust weights
manager.setWeights('equipment', {
    'Longsword': 2,
    'Dagger': 0.5,
    'Excalibur': 0.1
});
const weights = manager.getWeights('equipment');

// Inspect registered data
if (manager.hasCustomData('equipment')) {
    const info = manager.getInfo('equipment');
    const customItems = manager.getCustom('equipment');
}
```

---

## Helper Functions

The engine provides several helper functions for querying custom content. These complement `ExtensionManager` by providing read access to registered data.

### Quick Reference

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getClassData` | `className: string` | `ClassDataEntry \| undefined` | Class data with hit die, abilities, features |
| `getRaceData` | `raceName: string` | `RaceDataEntry \| undefined` | Race data with speed, ability bonuses, traits |
| `getClassSpellList` | `className: string` | Spell list object \| undefined | `{ cantrips: string[], spells_by_level: Record<number, string[]> }` |
| `getSpellSlotsForClass` | `className, characterLevel` | Slot object \| undefined | `{ [level: number]: slots }` |
| `getClassStartingEquipment` | `className: string` | Equipment object \| undefined | `{ weapons: [...], armor: [...], items: [...] }` |

### Usage Examples

```typescript
import {
    getClassData,
    getRaceData,
    getClassSpellList,
    getSpellSlotsForClass,
    getClassStartingEquipment
} from 'playlist-data-engine';

// Class data (default or custom)
const wizardData = getClassData('Wizard');
console.log(wizardData.hit_die); // 6

const necromancerData = getClassData('Necromancer');
if (necromancerData) {
    console.log(necromancerData.baseClass); // 'Wizard'
    console.log(necromancerData.primary_ability); // 'INT'
}

// Race data (default or custom)
const elfData = getRaceData('Elf');
console.log(elfData.speed); // 30

const dragonkinData = getRaceData('Dragonkin');
if (dragonkinData) {
    console.log(dragonkinData.ability_bonuses);
    // { STR: 2, CON: 1, CHA: 1 }
}

// Additional class queries
const spellList = getClassSpellList('Necromancer');
const slots = getSpellSlotsForClass('Necromancer', 5);
const equipment = getClassStartingEquipment('Necromancer');
```

---

## Spawn Rate System

The spawn rate system controls how custom content is mixed with default content during procedural generation. See the [Spawn Modes table](#extensionmanager-api) for mode descriptions.

### Advanced Weight Configuration

You can use hierarchical weight configuration for fine-grained control:

```typescript
const manager = ExtensionManager.getInstance();

// Hierarchical weight system
// Category defaults with individual overrides

// Set default for all skills
manager.setWeights('skills', {
    default: 1.0  // All skills have equal weight by default
});

// Override specific skills
manager.setWeights('skills', {
    'athletics': 2.0,      // Override: athletics is now 2x
    'acrobatics': 0.5,     // Override: acrobatics is now 0.5x
    // All other skills remain at 1.0 (the default)
});

// Per-class skill spawn rates
manager.setWeights('skillLists.Barbarian', {
    'athletics': 2.0,      // Barbarians favor athletics
    'survival': 1.5,       // And survival
    'arcana': 0.2          // But rarely get arcana
});

manager.setWeights('skillLists.Wizard', {
    'arcana': 2.0,         // Wizards favor arcana
    'history': 1.5,        // And history
    'athletics': 0.2       // But rarely get athletics
});

// Zero weight = never spawn
manager.setWeights('classFeatures.Barbarian', {
    'useless_feature': 0.0  // This feature will never spawn
});

// Reset to defaults
manager.reset('classFeatures.Barbarian');
// Now all Barbarian features are back to equal probability

// Reset all categories
manager.resetAll();
```

---

## Category-Specific Examples

### Equipment

Register custom equipment through ExtensionManager or via the `CharacterGenerator.generate()` convenience parameter. For complete examples including registration, spawn rates, and the CharacterGenerator convenience method, see [Custom Equipment](EQUIPMENT_SYSTEM.md#custom-equipment).

### Spells

Register custom spells through ExtensionManager:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

const customSpells = [
    {
        name: 'Phoenix Fire',
        level: 5,
        school: 'Evocation',
        casting_time: '1 action',
        range: '60 feet',
        duration: 'Instantaneous',
        components: ['V', 'S'],
        description: 'A burst of flame engulfs the target...'
    },
    {
        name: 'Mind Shield',
        level: 2,
        school: 'Abjuration',
        casting_time: '1 reaction',
        range: 'Self',
        duration: '1 minute',
        components: ['S'],
        description: 'You gain resistance to psychic damage...'
    }
];

// Register custom spells with spawn weights
manager.register('spells', customSpells, {
    weights: {
        'Phoenix Fire': 0.5,   // Rare
        'Mind Shield': 2.0     // Common
    }
});
```


#### Spell Query

Query spells and check prerequisites using SpellQuery:

```typescript
import { SpellQuery } from 'playlist-data-engine';

const spellQuery = SpellQuery.getInstance();

// Query spells by level, school, or class
const fifthLevelSpells = spellQuery.getSpellsByLevel(5);
const evocationSpells = spellQuery.getSpellsBySchool('Evocation');
const sorcererSpells = spellQuery.getSpellsForClass('Sorcerer');

// Get spells available to a character (prerequisites met)
const availableSpells = spellQuery.getAvailableSpells(character);
console.log(`Available spells: ${availableSpells.map(s => s.name).join(', ')}`);

// Get a specific spell
const phoenixFire = spellQuery.getSpell('phoenix_fire');

// Validate spell prerequisites
if (phoenixFire) {
    const validation = spellQuery.validatePrerequisites(phoenixFire, character);
    if (!validation.valid) {
        console.log(`Prerequisites not met: ${validation.errors.join(', ')}`);
    }
}

// Query statistics
const stats = spellQuery.getQueryStats();
console.log(`Total spells: ${stats.totalSpells} (${stats.customSpells} custom)`);
```



#### Spells with Prerequisites

Spells can have prerequisites that must be met before a spellcaster can learn them (features, abilities, spells, skills, level, or class). For full examples and usage, see [Spells with Prerequisites](PREREQUISITES.md#spells-with-prerequisites).

### Races

Add custom races:

```typescript
const manager = ExtensionManager.getInstance();

// Register custom race names
manager.register('races', ['Dragonkin', 'Fairy', 'Elemental']);

// Set spawn rates
manager.setWeights('races', {
    'Dragonkin': 0.3,  // Rare
    'Fairy': 0.5,      // Uncommon
    'Human': 2.0       // Common
});

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track
);
// Now Dragonkin and Fairy can be selected!
```

#### Races with Subraces

The engine supports custom races with optional subrace variants. Register custom race data with subraces and the engine will validate and use it during character generation.

**See [CUSTOM_CONTENT.md](CUSTOM_CONTENT.md) for more information.**

### Classes

You can both adjust spawn rates for existing classes AND create entirely new custom classes.

#### Adjust Spawn Rates for Existing Classes

```typescript
const manager = ExtensionManager.getInstance();

// Make certain classes more or less common in character generation
manager.setWeights('classes', {
    'Sorcerer': 2.0,    // 2x as common
    'Warlock': 1.5,     // 1.5x as common
    'Paladin': 0.3      // Rare
});

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track
);
```

#### Creating Custom Classes

**See [CUSTOM_CONTENT.md](CUSTOM_CONTENT.md) for more information.**

**Example: Custom Necromancer Class**

This example demonstrates creating a custom "Necromancer" class that extends the Wizard base class:

```typescript
import { ExtensionManager, CharacterGenerator, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// 1. Register custom skill
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control',
    prerequisites: { class: 'Necromancer' },
    source: 'custom'
}]);

// 2. Register custom class data (inherits from Wizard)
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// 3. Register the class name
manager.register('classes', [asClass('Necromancer')]);

// 4. Register custom features
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

// 5. Register custom spell list
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death']
    }
}]);

// 6. Generate a Necromancer character
const track = { title: 'Dark Ritual', artist: 'Necromancer', genre: 'Dark Ambient', ...otherTrackFields };
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    track,
    { forceClass: 'Necromancer' }
);
```



### Class Features

Register custom class features through ExtensionManager:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom class features (recommended approach)
manager.register('classFeatures', [
    {
        id: 'dragon_fury',
        name: 'Dragon Fury',
        description: 'Channel your draconic heritage to unleash devastating attacks',
        type: 'active',
        class: 'Barbarian',
        level: 3,
        prerequisites: {
            level: 3
        },
        effects: [
            {
                type: 'passive_modifier',
                target: 'damage',
                value: 2,
                condition: 'while raging'
            }
        ],
        source: 'custom'
    },
    {
        id: 'arcane_shield',
        name: 'Arcane Shield',
        description: 'Create a protective barrier of magical energy',
        type: 'active',
        class: 'Wizard',
        level: 2,
        prerequisites: {
            level: 2,
            abilities: { INT: 14 }
        },
        effects: [
            {
                type: 'ability_unlock',
                target: 'mage_armor',
                value: true
            }
        ],
        source: 'custom'
    }
]);

// Set spawn rates for features
manager.setWeights('classFeatures.Barbarian', {
    'dragon_fury': 0.5,  // Half as likely to spawn
    'rage': 1.0          // Default spawn rate
});
```

**Feature Effect Types:**

| Type | Description | Example |
|------|-------------|---------|
| `stat_bonus` | Add to an ability score | +1 STR at level 4 |
| `skill_proficiency` | Grant proficiency or expertise | Expertise in Perception |
| `ability_unlock` | Unlock new abilities | Darkvision, flight |
| `passive_modifier` | Constant bonus to rolls | +2 damage while raging |
| `resource_grant` | Grant resource pools | Rage counts, ki points |
| `spell_slot_bonus` | Additional spell slots | +1 level 1 slot |

**Feature Prerequisites:**

```typescript
{
    level: 5,                    // Minimum level
    abilities: { STR: 13 },      // Ability score requirements
    features: ['rage'],          // Required features
    class: 'Barbarian',          // Required class
    race: 'Dwarf',               // Required race
    custom: 'Must have seen dragon'  // Custom condition
}
```

#### Features with Skill/Spell Prerequisites

Class features and racial traits can require skills or spells as prerequisites, in addition to features, abilities, level, class, and race.

```typescript
import { ExtensionManager, FeatureQuery, FeatureValidator, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();
const query = FeatureQuery.getInstance();  // Convenience wrapper

// ===== FEATURE REQUIRING SKILL PROFICIENCY =====
// Arcane Smith: Requires Arcana skill proficiency
const arcaneSmith = {
    id: 'arcane_smith',
    name: 'Arcane Smith',
    description: 'Can enchant magical items',
    type: 'passive',
    level: 7,
    class: 'Wizard',
    prerequisites: {
        skills: ['arcana'],  // Requires Arcana proficiency
        level: 7
    },
    effects: [
        { type: 'ability_unlock', target: 'item_enchantment', value: true }
    ],
    source: 'custom'
};

// Option 1: Register via ExtensionManager (recommended)
manager.register('classFeatures', [arcaneSmith]);

// Cache is automatically invalidated after registration

// ===== FEATURE REQUIRING SPELL KNOWLEDGE =====
// Spellblade: Requires knowing specific spells
const spellblade = {
    id: 'spellblade',
    name: 'Spellblade',
    description: 'Channel spells through your weapon',
    type: 'active',
    level: 10,
    class: 'Eldritch Knight',
    prerequisites: {
        spells: ['Green-Flame Blade', 'Booming Blade'],
        features: ['weapon_bond']
    },
    effects: [
        { type: 'passive_modifier', target: 'spell_strike_damage', value: 4 }
    ],
    source: 'custom'
};

manager.register('classFeatures', [spellblade]);

// ===== RACIAL TRAIT WITH SKILL PREREQUISITES =====
// Elven Battle Training: Requires proficiency in a combat skill
const elvenBattleTraining = {
    id: 'elven_battle_training',
    name: 'Elven Battle Training',
    description: 'Advanced elven combat techniques',
    type: 'active',
    race: 'Elf',
    prerequisites: {
        skills: ['athletics', 'perception'],  // Must have both skills
        level: 3
    },
    effects: [
        { type: 'passive_modifier', target: 'initiative', value: 2 }
    ],
    source: 'custom'
};

manager.register('racialTraits', [elvenBattleTraining]);

// ===== VALIDATE FEATURE PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, track, {forceName: 'Elf Warrior'});
const features = query.getClassFeatures('Wizard', character.level);
const feature = features.find(f => f.id === 'arcane_smith');

if (feature) {
    const result = query.validatePrerequisites(feature, character);

    if (!result.valid) {
        console.log('Cannot learn feature:', result.errors);
    }
}

// Features with unmet prerequisites are automatically
// excluded during character generation
```

### Racial Traits

Register custom racial traits through ExtensionManager:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom racial traits (recommended approach)
manager.register('racialTraits', [
    {
        id: 'dragon_born_fire_resistance',
        name: 'Fire Resistance',
        description: 'You have resistance to fire damage',
        race: 'Dragonborn',
        effects: [
            {
                type: 'ability_unlock',
                target: 'damage_resistance',
                value: 'fire'
            }
        ],
        source: 'default'
    },
    {
        id: 'fairy_flight',
        name: 'Fey Wings',
        description: 'You can fly using your magical wings',
        race: 'Fairy',
        prerequisites: {
            level: 5
        },
        effects: [
            {
                type: 'ability_unlock',
                target: 'flight',
                value: true,
                condition: 'level 5+'
            }
        ],
        source: 'custom'
    },
    {
        id: 'elemental_affinity',
        name: 'Elemental Affinity',
        description: 'You are attuned to a specific element',
        race: 'Genasi',
        effects: [
            {
                type: 'ability_unlock',
                target: 'elemental_magic',
                value: true
            }
        ],
        source: 'custom'
    }
]);

// Set spawn rates for traits
manager.setWeights('racialTraits', {
    'dragon_born_fire_resistance': 1.0,
    'fairy_flight': 0.3,  // Rare trait
    'elemental_affinity': 0.5
});
```


**Get traits for a race:**

```typescript
const query = FeatureQuery.getInstance();

// Get all traits for a race
const dragonbornTraits = query.getRacialTraits('Dragonborn');

// Get traits for a subrace
const hillDwarfTraits = query.getRacialTraitsForSubrace('Dwarf', 'Hill Dwarf');

// Get a specific trait
const fireResistance = query.getRacialTraitById('dragon_born_fire_resistance');

const featureStats = query.getQueryStats();
console.log(`Features: ${featureStats.totalFeatures} (${featureStats.customFeatures} custom)`);
```

### Skills

Register custom skills through ExtensionManager:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom skills (recommended approach)
manager.register('skills', [
    {
        id: 'survival_cold',
        name: 'Survival (Cold Environments)',
        description: 'Expertise in surviving freezing conditions',
        ability: 'WIS',
        armorPenalty: false,
        categories: ['exploration', 'environmental'],
        source: 'custom'
    },
    {
        id: 'arcana_crystal',
        name: 'Arcana (Crystals)',
        description: 'Knowledge of magical crystals and their uses',
        ability: 'INT',
        armorPenalty: false,
        categories: ['knowledge', 'magical'],
        source: 'custom'
    },
    {
        id: 'intimidation_war',
        name: 'Intimidation (War Cry)',
        description: 'Terrifying shouts on the battlefield',
        ability: 'CHA',
        armorPenalty: false,
        categories: ['combat', 'social'],
        source: 'custom'
    }
]);

// Set spawn rates for skills
manager.setWeights('skills', {
    'survival_cold': 0.5,     // Half as likely
    'athletics': 2.0,         // Twice as likely
    'intimidation_war': 1.0   // Default rate
});
```

**Register ability-specific skills:**

```typescript
const manager = ExtensionManager.getInstance();

// Register skills for specific abilities
manager.register('skills.STR', [
    {
        id: 'climbing',
        name: 'Climbing',
        ability: 'STR',
        armorPenalty: true,
        categories: ['athletic'],
        source: 'custom'
    }
]);

manager.register('skills.DEX', [
    {
        id: 'balancing',
        name: 'Balancing',
        ability: 'DEX',
        armorPenalty: true,
        categories: ['athletic'],
        source: 'custom'
    }
]);
```

**Query skills:**

```typescript
const query = SkillQuery.getInstance();

// Get skill by ID
const survival = query.getSkill('survival_cold');

// Get all skills for an ability
const strSkills = query.getSkillsByAbility('STR');

// Get skills by category
const explorationSkills = query.getSkillsByCategory('exploration');

// Get custom skills only
const customSkills = query.getSkillsBySource('custom');

// Check if skill exists
const isValid = query.isValidSkill('survival_cold');  // true

// Get registry statistics
const skillStats = query.getQueryStats();
console.log(`Skills: ${skillStats.totalSkills} (${skillStats.customSkills} custom)`);
```

#### Skills with Prerequisites

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

```typescript
import { ExtensionManager, SkillQuery, SkillValidator, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();
const query = SkillQuery.getInstance();

// ===== SKILL WITH FEATURE PREREQUISITES =====
// Dragon Smithing: Requires Draconic Bloodline feature
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

// Option 1: Register via ExtensionManager (recommended)
manager.register('skills', [dragonSmithing]);

// Cache is automatically invalidated after registration

// ===== SKILL WITH ABILITY SCORE AND SKILL PREREQUISITES =====
// Advanced Arcana: Requires INT 16 and proficiency in Arcana
const advancedArcana: CustomSkill = {
    id: 'advanced_arcana',
    name: 'Advanced Arcana',
    description: 'Cast complex spells and understand magical theory',
    ability: 'INT',
    prerequisites: {
        abilities: { INT: 16 },  // Requires INT 16 or higher
        skills: ['arcana'],       // Must already know Arcana
        level: 7
    },
    source: 'custom'
};

manager.register('skills', [advancedArcana]);

// ===== SKILL WITH SPELL PREREQUISITES =====
// Spell Mastery: Requires knowing specific spells first
const spellMasterySkill: CustomSkill = {
    id: 'spell_mastery',
    name: 'Spell Mastery',
    description: 'Improved control over known spells',
    ability: 'INT',
    prerequisites: {
        spells: ['Fireball', 'Lightning Bolt'],  // Must know these spells
        class: 'Wizard',
        level: 10
    },
    source: 'custom'
};

manager.register('skills', [spellMasterySkill]);

// ===== SKILL WITH RACE PREREQUISITES =====
// Dwarven Combat Training: Dwarf only
const dwarvenCombat: CustomSkill = {
    id: 'dwarven_warfare',
    name: 'Dwarven Warfare',
    description: 'Advanced dwarven combat techniques',
    ability: 'STR',
    prerequisites: {
        race: 'Dwarf'
    },
    source: 'custom'
};

manager.register('skills', [dwarvenCombat]);

// ===== VALIDATING SKILL PREREQUISITES =====
// Check if a character meets the requirements
const character = CharacterGenerator.generate(seed, audioProfile, track);
const skill = query.getSkill('dragon_smithing');

if (skill && skill.prerequisites) {
    const result = SkillValidator.validateSkillPrerequisites(skill.prerequisites, character);

    if (!result.valid) {
        console.log('Unmet prerequisites:', result.unmet);
        // Output example: ["Requires feature: draconic_bloodline", "Requires level 5 (current: 1)"]
    }
}

// Skills with unmet prerequisites are automatically
// filtered out during character generation
```

### Skill Lists

Define custom skill lists for classes:

```typescript
const manager = ExtensionManager.getInstance();

// Register custom skill list for a class
manager.register('skillLists', [
    {
        class: 'Barbarian',
        skillCount: 2,
        availableSkills: [
            'athletics',
            'survival',
            'survival_cold',  // Custom skill
            'intimidation',
            'intimidation_war',  // Custom skill
            'nature',
            'perception'
        ],
        selectionWeights: {
            weights: {
                'athletics': 2.0,
                'survival_cold': 0.5
            },
            mode: 'relative'
        },
        hasExpertise: false,
        expertiseCount: 0
    },
    {
        class: 'Necromancer',  // Custom class
        skillCount: 3,
        availableSkills: [
            'arcana',
            'arcana_crystal',  // Custom skill
            'history',
            'religion',
            'medicine',
            'investigation'
        ],
        hasExpertise: true,
        expertiseCount: 1
    }
]);

// Set spawn rates for skill lists
manager.setWeights('skillLists', {
    'Barbarian': 1.0,
    'Necromancer': 0.3  // Rare class
});
```

**Create class-specific skill preferences:**

```typescript
// Favor exploration skills for Ranger
manager.register('skillLists', [
    {
        class: 'Ranger',
        skillCount: 3,
        availableSkills: [
            'athletics',
            'survival',
            'survival_cold',
            'nature',
            'stealth',
            'perception',
            'investigation'
        ],
        selectionWeights: {
            weights: {
                'survival': 2.0,
                'survival_cold': 1.5,
                'nature': 1.5,
                'stealth': 1.0,
                'perception': 1.0
            },
            mode: 'relative'
        }
    }
]);
```


### Appearance

#### Body Types

```typescript
const customBodyTypes = ['giant', 'diminutive', 'elongated'];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track,
    {
        extensions: {
            appearance: {
                bodyTypes: customBodyTypes
            }
        }
    }
);

// Set weights
const manager = ExtensionManager.getInstance();
manager.setWeights('appearance.bodyTypes', {
    'giant': 0.2,
    'diminutive': 0.3,
    'athletic': 1.5  // More common
});
```

#### Skin Tones

```typescript
const customSkinTones = [
    '#8B7355',  // Deep bronze
    '#F5DEB3',  // Wheat
    '#FFE4C4'   // Bisque
];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track,
    {
        extensions: {
            appearance: {
                skinTones: customSkinTones
            }
        }
    }
);
```

#### Hair Colors

```typescript
const customHairColors = [
    '#FF69B4',  // Hot pink
    '#00CED1',  // Dark turquoise
    '#9400D3'   // Dark violet
];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track,
    {
        extensions: {
            appearance: {
                hairColors: customHairColors
            }
        }
    }
);
```

#### Hair Styles

```typescript
const customHairStyles = ['mohawk', 'braided', 'pompadour', 'mullet'];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track,
    {
        extensions: {
            appearance: {
                hairStyles: customHairStyles
            }
        }
    }
);
```

#### Eye Colors

```typescript
const customEyeColors = [
    '#FF0000',  // Red
    '#800080',  // Purple
    '#C0C0C0'   // Silver
];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track,
    {
        extensions: {
            appearance: {
                eyeColors: customEyeColors
            }
        }
    }
);
```

#### Facial Features

```typescript
const customFacialFeatures = [
    'crystal tattoo',
    'runes on cheek',
    'glowing eyes',
    'fangs'
];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track,
    {
        extensions: {
            appearance: {
                facialFeatures: customFacialFeatures
            }
        }
    }
);

// Weight features
const manager = ExtensionManager.getInstance();
manager.setWeights('appearance.facialFeatures', {
    'crystal tattoo': 0.2,  // Very rare
    'scar': 1.5             // Common
});
```

---

## Creating Content Packs

A content pack is a collection of custom content for multiple categories. Create a reusable content pack:

```typescript
// my-content-pack.ts
import { ExtensionManager } from 'playlist-data-engine';

export function loadContentPack() {
    const manager = ExtensionManager.getInstance();

    // Custom equipment
    manager.register('equipment', [
        { name: 'Dragon Scale Armor', type: 'armor', rarity: 'very_rare', weight: 15 },
        { name: 'Flame Tongue', type: 'weapon', rarity: 'rare', weight: 3 }
    ], {
        weights: {
            'Dragon Scale Armor': 0.3,
            'Flame Tongue': 0.5
        }
    });

    // Custom spells
    manager.register('spells', [
        { name: 'Dragon Breath', level: 3, school: 'Evocation' },
        { name: 'Scale Hardening', level: 2, school: 'Transmutation' }
    ]);

    // Custom races
    manager.register('races', ['Dragonborn', 'Dracophile']);

    // Custom appearance
    manager.register('appearance.skinTones', [
        '#8B0000',  // Dark red
        '#DC143C',  // Crimson
        '#B22222'   // Fire brick
    ]);

    manager.register('appearance.facialFeatures', [
        'scale patches',
        'reptilian eyes',
        'horn nubs'
    ]);
}

// Usage:
import { loadContentPack } from './my-content-pack';

loadContentPack();

// Now generate characters with the content pack loaded
const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    track
);
```

### Themed Content Pack Example

```typescript
// dark-fantasy-pack.ts
export function loadDarkFantasyPack() {
    const manager = ExtensionManager.getInstance();

    // Dark fantasy equipment
    manager.register('equipment', [
        { name: 'Soul Reaver', type: 'weapon', rarity: 'legendary', weight: 4 },
        { name: 'Shadow Cloak', type: 'armor', rarity: 'very_rare', weight: 5 },
        { name: 'Blood Chalice', type: 'item', rarity: 'rare', weight: 2 }
    ], {
        mode: 'absolute',  // Only dark fantasy items spawn
        weights: {
            'Soul Reaver': 0.2,
            'Shadow Cloak': 0.5,
            'Blood Chalice': 1.0
        }
    });

    // Dark fantasy spells
    manager.register('spells', [
        { name: 'Soul Drain', level: 4, school: 'Necromancy' },
        { name: 'Shadow Step', level: 2, school: 'Conjuration' },
        { name: 'Death Coil', level: 3, school: 'Necromancy' }
    ]);

    // Dark fantasy appearance
    manager.register('appearance.skinTones', [
        '#2F4F4F',  // Dark slate gray
        '#4B0082',  // Indigo
        '#696969'   // Dim gray
    ]);

    manager.register('appearance.facialFeatures', [
        'undead eyes',
        'necrotic scars',
        'pale complexion'
    ]);
}
```

### Complete Content Pack Example

This example demonstrates a comprehensive "Arctic Expansion Pack" with custom features, skills, and spawn rates:

```typescript
import { ExtensionManager, FeatureQuery, SkillQuery, CharacterGenerator } from 'playlist-data-engine';

// Create an expansion pack with custom features, skills, and spawn rates
function registerArcticExpansionPack() {
    const manager = ExtensionManager.getInstance();
    const featureQuery = FeatureQuery.getInstance();
    const skillQuery = SkillQuery.getInstance();

    // ===== CUSTOM FEATURES =====
    const frostRage = {
        id: 'frost_rage',
        name: 'Frost Rage',
        description: 'Your rage radiates cold, dealing extra cold damage.',
        type: 'active',
        level: 3,
        class: 'Barbarian',
        effects: [
            {
                type: 'resource_grant',
                target: 'cold_damage_bonus',
                value: 3,
                description: '+3 cold damage while raging'
            }
        ],
        source: 'custom'
    };

    const snowWalker = {
        id: 'snow_walker',
        name: 'Snow Walker',
        description: 'You move through snow and ice without penalty.',
        type: 'passive',
        level: 1,
        class: 'Ranger',
        race: 'Human',
        effects: [
            {
                type: 'ability_unlock',
                target: 'snow_movement',
                value: true,
                description: 'No movement penalty in snow/ice'
            },
            {
                type: 'passive_modifier',
                target: 'survival_cold_bonus',
                value: 5,
                description: '+5 Survival in cold environments'
            }
        ],
        source: 'custom'
    };

    // ===== CUSTOM SKILLS =====
    const coldSurvival = {
        id: 'survival_cold',
        name: 'Survival (Cold Environments)',
        description: 'Expertise in cold weather survival.',
        ability: 'WIS',
        armorPenalty: true,
        categories: ['exploration', 'environmental'],
        source: 'custom'
    };

    const iceFishing = {
        id: 'ice_fishing',
        name: 'Ice Fishing',
        description: 'Ability to catch fish in frozen waters.',
        ability: 'WIS',
        armorPenalty: false,
        categories: ['exploration', 'survival'],
        source: 'custom'
    };

    // ===== REGISTER EVERYTHING =====
    // Features
    manager.register('classFeatures', [frostRage, snowWalker]);
    manager.register('classFeatures.Barbarian', [frostRage], {
        weights: { 'frost_rage': 0.5 }  // Rare feature
    });
    manager.register('classFeatures.Ranger', [snowWalker], {
        weights: { 'snow_walker': 0.7 }
    });

    // Skills (register via ExtensionManager)
    manager.register('skills', [coldSurvival, iceFishing]);
    manager.register('skills.WIS', [coldSurvival, iceFishing], {
        weights: {
            'survival_cold': 0.5,  // Less common than default skills
            'ice_fishing': 0.3      // Quite rare
        }
    });

    // ===== SPAWN RATE CONFIGURATION =====
    // Make cold-themed content more likely for certain classes
    manager.setWeights('skillLists.Ranger', {
        'survival_cold': 2.0,  // Rangers love this skill
        'ice_fishing': 1.5
    });

    manager.setWeights('skillLists.Barbarian', {
        'survival_cold': 1.5,  // Barbarians also get this
        'ice_fishing': 0.5
    });

    console.log('Arctic Expansion Pack registered!');
}

// Register the expansion pack
registerArcticExpansionPack();

// Generate characters with the new content
const character = CharacterGenerator.generate(seed, audio, track, {forceName: 'Arctic Hero' });
// Character may now have frost_rage, snow_walker, or survival_cold skill!
```


### Example: Dragon-Themed Content

This example demonstrates registering a complete dragon-themed content pack with custom race, subraces, skills, and spells:

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// 1. Register a custom race with subraces
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

manager.register('races', ['Dragonkin']);

// 2. Register subrace-specific racial traits
manager.register('racialTraits', [{
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: { subrace: 'Fire Dragonkin' },
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);

// Cache is automatically invalidated after registration

// 3. Register a skill with prerequisites (feature + level + class)
manager.register('skills.INT', [{
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],
        level: 5,
        class: asClass('Sorcerer')
    },
    source: 'custom'
}]);

// Cache is automatically invalidated after registration

// 4. Register a spell with prerequisites
manager.register('spells', [{
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy',
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
}]);
```

---

## Export/Import System

The `ExtensionManager` provides methods to export and import custom data, allowing you to save and restore content packs.

### Exporting Custom Data

Export all custom extensions and weights for saving or debugging:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register some custom content
manager.register('equipment', [
    { name: 'Dragon Sword', type: 'weapon', rarity: 'rare', weight: 5 }
], {
    weights: { 'Dragon Sword': 0.5 }
});

// Export all custom data
const customData = manager.exportCustomData();

console.log(customData);
// {
//   extensions: {
//     equipment: {
//       items: [{ name: 'Dragon Sword', ... }],
//       options: { mode: 'relative', weights: {...} },
//       registeredAt: '2024-01-15T10:30:00.000Z'
//     }
//   },
//   weights: {
//     equipment: { 'Dragon Sword': 0.5 }
//   }
// }
```

### Saving Content Packs

Save exported data to a file for later use:

```typescript
import { writeFileSync } from 'fs';
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Export and save to file
const customData = manager.exportCustomData();
writeFileSync('./my-content-pack.json', JSON.stringify(customData, null, 2));
```

### Loading Content Packs

Load and re-register a saved content pack:

```typescript
import { readFileSync } from 'fs';
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Load from file
const savedData = JSON.parse(readFileSync('./my-content-pack.json', 'utf-8'));

// Re-register each category
for (const [category, data] of Object.entries(savedData.extensions)) {
    manager.register(category, data.items, {
        ...data.options,
        validate: true  // Always validate when loading
    });
}

// Restore weights
for (const [category, weights] of Object.entries(savedData.weights)) {
    manager.setWeights(category, weights);
}
```

### Creating Reusable Content Packs

Combine export/import with a clean loader function:

```typescript
// content-packs/dragon-pack.ts
import { ExtensionManager, type ContentPackData } from 'playlist-data-engine';

export function loadDragonPack() {
    const manager = ExtensionManager.getInstance();

    // Use replace mode to clear any previous dragon content
    manager.register('equipment', [
        { name: 'Dragon Scale Armor', type: 'armor', rarity: 'very_rare', weight: 15 },
        { name: 'Flame Tongue', type: 'weapon', rarity: 'rare', weight: 3 }
    ], {
        mode: 'relative',
        weights: {
            'Dragon Scale Armor': 0.3,
            'Flame Tongue': 0.5
        }
    });

    manager.register('spells', [
        { name: 'Dragon Breath', level: 3, school: 'Evocation' }
    ]);
}

// Export for saving
export function saveDragonPack(): ContentPackData {
    loadDragonPack();
    const manager = ExtensionManager.getInstance();
    return manager.exportCustomData();
}
```

### Debugging with Export

Use export to inspect registered content:

```typescript
const manager = ExtensionManager.getInstance();

// Debug: Check what's registered
const data = manager.exportCustomData();

console.log('Registered categories:', Object.keys(data.extensions));
console.log('Equipment items:', data.extensions.equipment?.items.length);
console.log('Custom weights:', data.weights);
```

---

## Best Practices

### 1. Use Descriptive Names

```typescript
// Good
{ name: 'Sword of the Dawn', type: 'weapon', rarity: 'rare', weight: 3 }

// Bad
{ name: 'sword1', type: 'weapon', rarity: 'rare', weight: 3 }
```

### 2. Set Appropriate Spawn Rates

```typescript
// Good balance
manager.setWeights('equipment', {
    'Common Sword': 1.0,     // Default
    'Rare Sword': 0.5,       // Half as common
    'Legendary Sword': 0.1   // Very rare
});

// Bad - everything is legendary
manager.setWeights('equipment', {
    'Legendary Sword': 1.0,
    'Legendary Armor': 1.0
});
```

### 3. Use Themed Content Packs

```typescript
// Good - organized by theme
loadDarkFantasyPack();
loadHighFantasyPack();
loadSciFiPack();

// Bad - random mix of content
register('equipment', [...darkFantasyItems, ...highFantasyItems, ...sciFiItems]);
```

### 4. Reset When Needed

```typescript
// Reset before loading new content
const manager = ExtensionManager.getInstance();
manager.resetAll();

// Load fresh content
loadMyContentPack();
```

### 5. Handle Validation Errors

```typescript
try {
    manager.register('equipment', customItems);
} catch (error) {
    console.error('Failed to register equipment:', error.message);
    // Handle error gracefully
}
```

### 6. Use Absolute Mode for Themed Content

```typescript
// Good - absolute mode for themed content
manager.register('equipment', darkFantasyItems, { mode: 'absolute' });

// Bad - relative mode for themed content (default items will also spawn)
manager.register('equipment', darkFantasyItems, { mode: 'relative' });
```

### 7. Document Your Content Packs

```typescript
/**
 * Dark Fantasy Content Pack
 *
 * Adds dark fantasy themed equipment, spells, and appearance options.
 *
 * Equipment: Soul Reaper (legendary), Shadow Cloak (very rare), etc.
 * Spells: Soul Drain, Shadow Step, Death Coil
 * Appearance: Dark skin tones, undead features
 *
 * @author Your Name
 * @version 1.0.0
 */
export function loadDarkFantasyPack() {
    // ...
}
```

---

## Validation

The extensibility system includes automatic validation. Invalid content is rejected with clear error messages.

**For complete type definitions, see [Reference](#reference).**

### Key Validation Rules

| Category | Required Fields | Validation Rules |
|----------|-----------------|------------------|
| **Equipment** | `name`, `type`, `rarity`, `weight` | Type: `weapon`/`armor`/`item`; valid rarity; weight ≥ 0 |
| **Spells** | `name`, `level`, `school` | Level 0-9; valid school (see `SpellSchool` type) |
| **Races/Classes** | String values | Must be valid name (default or registered custom) |
| **Appearance** | String values | Must be strings (not objects) |
| **Features** | `id`, `name`, `description`, `type`, `class`, `level`, `source` | ID: `lowercase_with_underscores`; must be unique |
| **Skills** | `id`, `name`, `ability`, `source` | ID: `lowercase_with_underscores`; valid ability |
| **Skill Lists** | `class`, `skillCount`, `availableSkills` | skillCount ≥ 0; skill IDs must exist |

### ID Format

All custom content IDs must use `lowercase_with_underscores` format.

| Valid | Invalid |
|-------|---------|
| `frost_rage` | `FrostRage` (use lowercase) |
| `necromancer_raise_dead` | `frost-rage` (use underscores) |
| `dragon_smithing` | `frost.rage` (use underscores) |

### Notes

- **Duplicate IDs:** Automatically detected. Use `getCustom(category)` to check existing IDs before registering.
- **Disable validation:** Use `{ validate: false }` to bypass (advanced use only—may cause runtime errors).

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Content not appearing** | 1. Register before `CharacterGenerator.generate()` 2. Check console for validation errors 3. Verify weights ≠ 0 4. Use correct category name (see [Supported Categories](#supported-categories)) |
| **Validation errors** | Error messages include category, item index, and specific issue. Use `validate: false` to bypass (not recommended). |
| **Content not persisting** | System is **runtime only**. Re-register on app startup. See [Export/Import System](#exportimport-system) for persistence patterns. |
| **Spawn rates not working** | Check spawn mode. See [Spawn Modes](#extensionmanager-api). Use `getMode()` to verify current mode. |
| **Duplicate ID errors** | Custom IDs must be unique. Use `getCustom(category)` to check existing IDs. |

### Debugging

```typescript
const manager = ExtensionManager.getInstance();

// Check registered content
manager.getInfo('equipment');  // { hasCustomData, customCount, totalCount, mode, ... }

// Verify weights
manager.getWeights('equipment');  // Current weights

// Check current mode
manager.getMode('equipment');  // 'relative' | 'absolute' | 'default' | undefined

// Validate without registering
manager.validate('equipment', items);  // { valid: boolean, errors: string[] }
```

---

## Reference

### Type Definitions

**Location:** [src/core/extensions/ExtensionManager.ts](../src/core/extensions/ExtensionManager.ts)

**Import types from the package:**

```typescript
import type {
    ClassFeature,
    RacialTrait,
    CustomSkill,
    ExtensionOptions,
    ExtensionCategory,
    SpellSchool
} from 'playlist-data-engine';
```

| Type | Source | Description |
|------|--------|-------------|
| `ExtensionOptions` | [src/core/extensions/ExtensionManager.ts](../src/core/extensions/ExtensionManager.ts) | Registration options: mode, weights, validate |
| `ClassFeature` | [src/core/features/FeatureTypes.ts](../src/core/features/FeatureTypes.ts) | Class features with prerequisites and effects |
| `RacialTrait` | [src/core/features/FeatureTypes.ts](../src/core/features/FeatureTypes.ts) | Racial traits with prerequisites and effects |
| `CustomSkill` | [src/core/skills/SkillTypes.ts](../src/core/skills/SkillTypes.ts) | Skills with prerequisites, categories, armor penalty |
| `SkillListDefinition` | [src/core/skills/SkillTypes.ts](../src/core/skills/SkillTypes.ts) | Skill lists for class character generation |
| `SpellSchool` | [src/core/spells/SpellTypes.ts](../src/core/spells/SpellTypes.ts) | D&D 5e schools of magic: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation |
| `ExtensionCategory` | [src/core/extensions/ExtensionManager.ts](../src/core/extensions/ExtensionManager.ts) | All extensible category names |

### Character Generator Extensions

The `CharacterGenerator.generate()` `extensions` option supports a limited set of categories.

| Property | Type | Description |
|----------|------|-------------|
| `spells` | `SpellExtension[]` | Custom spells to add |
| `equipment` | `EquipmentExtension[]` | Custom equipment to add |
| `races` | `string[]` | Custom race names (uses Race enum) |
| `classes` | `string[]` | Custom class names (uses Class enum) |
| `appearance` | `AppearanceExtension` | Custom appearance options |

**Important:** For `classFeatures`, `racialTraits`, `skills`, and `skillLists`, use `ExtensionManager.register()` directly instead of the `extensions` option.

For the complete list of supported categories, see [Supported Categories](#supported-categories) in the Overview.

---

## Support

For more information, see:
- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Equipment properties and enchanting
- [XP_AND_STATS.md](XP_AND_STATS.md) - Progression and stat strategies
- [PREREQUISITES.md](PREREQUISITES.md) - Feature and skill requirements
- [tests/integration/customGeneration.integration.test.ts](../tests/integration/customGeneration.integration.test.ts) - Integration test examples
