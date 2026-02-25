# Playlist Data Engine - Extensibility Guide

This guide explains how to extend the Playlist Data Engine with custom content. The extensibility system allows you to add custom spells, equipment, races, classes, and appearance options at runtime, with full control over spawn rates and validation.

---

## Table of Contents

1. [Overview](#overview)
2. [ExtensionManager API](#extensionmanager-api)
3. [Helper Functions](#helper-functions)
4. [Spawn Rate System](#spawn-rate-system)
5. [Category-Specific Examples](#category-specific-examples)
6. [Batch Image Methods](#batch-image-methods)
7. [Content Packs](#content-packs)
8. [Best Practices](#best-practices)
9. [Validation](#validation)
10. [Troubleshooting](#troubleshooting)
11. [Reference](#reference)
12. [Support](#support)

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
| `batchAddIcons()` | `category`, `iconMap`, `identifierKey?` | `number` | Add icons to items by name/ID. Returns count updated. |
| `batchAddImages()` | `category`, `imageMap`, `identifierKey?` | `number` | Add images to items by name/ID. Returns count updated. |
| `batchUpdateImages()` | `category`, `predicate`, `updates` | `number` | Update icon/image on items matching predicate. Returns count. |
| `batchByCategory()` | `category`, `property`, `valueMap` | `number` | Add icons/images by property value (e.g., school). Returns count. |

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
// Register custom equipment with icon/image
manager.register('equipment', [
    {
        name: 'Dragon Sword',
        type: 'weapon',
        rarity: 'legendary',
        weight: 5,
        icon: '/icons/weapons/dragon-sword.png',
        image: '/images/equipment/dragon-sword.png'
    }
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
        description: 'A burst of flame engulfs the target...',
        icon: '/icons/spells/phoenix-fire.png',
        image: '/images/spells/phoenix-fire.png'
    },
    {
        name: 'Mind Shield',
        level: 2,
        school: 'Abjuration',
        casting_time: '1 reaction',
        range: 'Self',
        duration: '1 minute',
        components: ['S'],
        description: 'You gain resistance to psychic damage...',
        icon: '/icons/spells/mind-shield.png',
        image: '/images/spells/mind-shield.png'
    }
];

// Register custom spells
manager.register('spells', customSpells);
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


#### Spell Prerequisites

Spells can have prerequisites that must be met before a spellcaster can learn them (features, abilities, spells, skills, level, or class). For full examples and usage, see [Spells with Prerequisites](PREREQUISITES.md#spells-with-prerequisites).


### Races / Subraces

Add custom races and subraces, and control their spawn rates. For complete examples including type augmentation, race data registration, validation, subrace support, and spawn rate control, see [Custom Races](CUSTOM_CONTENT.md#custom-races).

### Classes

Adjust spawn rates for existing classes or create entirely new custom classes. For complete examples including template inheritance, audio preferences, spawn rate control, and full class registration, see [Custom Classes](CUSTOM_CONTENT.md#custom-classes).


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
        source: 'custom',
        icon: '/icons/features/dragon-fury.png',
        image: '/images/features/dragon-fury.png'
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
        source: 'custom',
        icon: '/icons/features/arcane-shield.png',
        image: '/images/features/arcane-shield.png'
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

Features can require levels, abilities, skills, spells, features, class, race, subrace, or custom conditions. For complete examples including skill prerequisites, spell prerequisites, racial traits with prerequisites, and validation, see [Feature Prerequisites](PREREQUISITES.md#feature-prerequisites).

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
        source: 'default',
        icon: '/icons/traits/fire-resistance.png',
        image: '/images/traits/fire-resistance.png'
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
        source: 'custom',
        icon: '/icons/traits/fey-wings.png',
        image: '/images/traits/fey-wings.png'
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
        source: 'custom',
        icon: '/icons/traits/elemental-affinity.png',
        image: '/images/traits/elemental-affinity.png'
    }
]);
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
        source: 'custom',
        icon: '/icons/skills/survival-cold.png',
        image: '/images/skills/survival-cold.png'
    },
    {
        id: 'arcana_crystal',
        name: 'Arcana (Crystals)',
        description: 'Knowledge of magical crystals and their uses',
        ability: 'INT',
        armorPenalty: false,
        categories: ['knowledge', 'magical'],
        source: 'custom',
        icon: '/icons/skills/arcana-crystal.png',
        image: '/images/skills/arcana-crystal.png'
    },
    {
        id: 'intimidation_war',
        name: 'Intimidation (War Cry)',
        description: 'Terrifying shouts on the battlefield',
        ability: 'CHA',
        armorPenalty: false,
        categories: ['combat', 'social'],
        source: 'custom',
        icon: '/icons/skills/intimidation-war.png',
        image: '/images/skills/intimidation-war.png'
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

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race. For complete examples including skill chains, ability prerequisites, spell prerequisites, race prerequisites, and validation, see [Skill Prerequisites](PREREQUISITES.md#skill-prerequisites).

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
```


### Appearance

Customize physical appearance options using ExtensionManager. **Tip:** Set mode to `'absolute'` to use only your custom options:

```typescript
const manager = ExtensionManager.getInstance();

// Register custom appearance options
manager.register('appearance.bodyTypes', ['giant', 'diminutive', 'elongated']);
manager.register('appearance.hairStyles', ['mohawk', 'braided', 'pompadour', 'mullet']);
manager.register('appearance.facialFeatures', ['crystal tattoo', 'runes on cheek', 'glowing eyes', 'fangs']);

// Register custom colors (hex format)
manager.register('appearance.skinTones', ['#8B7355', '#F5DEB3', '#FFE4C4']);
manager.register('appearance.hairColors', ['#FF69B4', '#00CED1', '#9400D3']);
manager.register('appearance.eyeColors', ['#FF0000', '#800080', '#C0C0C0']);

// Use only custom options (exclude defaults)
manager.setMode('appearance.bodyTypes', 'absolute');
manager.setMode('appearance.hairStyles', 'absolute');
manager.setMode('appearance.facialFeatures', 'absolute');
manager.setMode('appearance.skinTones', 'absolute');
manager.setMode('appearance.hairColors', 'absolute');
manager.setMode('appearance.eyeColors', 'absolute');

// Optional: Weight specific options
manager.setWeights('appearance.bodyTypes', {
    'giant': 0.2,       // Very rare
    'diminutive': 0.3,  // Rare
    'athletic': 1.5     // Common
});
```

**All appearance properties:** `bodyTypes`, `hairStyles`, `facialFeatures`, `skinTones`, `hairColors`, `eyeColors`

### Batch Image Methods

Use batch methods to add icons and images to multiple items at once. All methods validate URLs before applying changes.

**Supported categories:** `spells`, `skills`, `classFeatures`, `racialTraits`, `equipment`, `races.data`, `classes.data`

**Valid URL prefixes:** `http://`, `https://`, `/`, `assets/`

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// --- Add icons to specific items by name ---
manager.batchAddIcons('spells', {
    'Fireball': '/assets/spells/fireball.png',
    'Magic Missile': '/assets/spells/magic-missile.png'
});

manager.batchAddIcons('equipment', {
    'Longsword': '/assets/equipment/longsword.png'
});

// --- Add images to specific items ---
manager.batchAddImages('spells', {
    'Fireball': '/assets/spells/fireball-full.png'
});

// --- Update by predicate (matches items and applies updates) ---
// Add same icon to all cantrips
manager.batchUpdateImages('spells',
    spell => spell.level === 0,
    { icon: '/assets/spells/cantrip-icon.png' }
);

// Add images to all rare equipment
manager.batchUpdateImages('equipment',
    item => item.rarity === 'rare',
    { icon: '/assets/icons/rare.png', image: '/assets/images/rare-bg.png' }
);

// --- Update by category property ---
// Add icons by spell school
manager.batchByCategory('spells', 'school', {
    'Evocation': '/assets/icons/fire.png',
    'Necromancy': '/assets/icons/skull.png',
    'Abjuration': '/assets/icons/shield.png'
});

// Add icons by equipment rarity
manager.batchByCategory('equipment', 'rarity', {
    'legendary': '/assets/icons/star-gold.png',
    'very_rare': '/assets/icons/star-purple.png',
    'rare': '/assets/icons/star-blue.png'
});

// Add both icon and image by rarity
manager.batchByCategory('equipment', 'rarity', {
    'legendary': {
        icon: '/assets/icons/legendary.png',
        image: '/assets/images/legendary-bg.png'
    }
});
```

**Error handling:**
```typescript
try {
    manager.batchAddIcons('spells', { 'Fireball': 'ftp://invalid.com/icon.png' });
} catch (error) {
    console.error('Invalid URL format:', error.message);
    // URLs must start with http://, https://, /, or assets/
}
```

---

## Content Packs

Content packs are reusable collections of custom content for multiple categories that can be saved to files and loaded at runtime. For complete examples including basic packs, themed packs, expansion packs with custom features and skills, prerequisite-based content, and saving/loading functionality, see [Content Packs](CONTENT_PACKS.md).

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
- [CONTENT_PACKS.md](CONTENT_PACKS.md) - Content pack creation and examples
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Equipment properties and enchanting
- [XP_AND_STATS.md](XP_AND_STATS.md) - Progression and stat strategies
- [PREREQUISITES.md](PREREQUISITES.md) - Feature and skill requirements
- [tests/integration/customGeneration.integration.test.ts](../tests/integration/customGeneration.integration.test.ts) - Integration test examples
