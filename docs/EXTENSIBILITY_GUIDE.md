# Playlist Data Engine - Extensibility Guide

This guide explains how to extend the Playlist Data Engine with custom content. The extensibility system allows you to add custom spells, equipment, races, classes, and appearance options at runtime, with full control over spawn rates and validation.

---

## Table of Contents

1. [Overview](#overview)
2. [ExtensionManager API](#extensionmanager-api)
3. [Spawn Rate System](#spawn-rate-system)
4. [Category-Specific Examples](#category-specific-examples)
5. [Creating Content Packs](#creating-content-packs)
6. [Validation](#validation)
7. [Best Practices](#best-practices)
8. [Export/Import System](#exportimport-system)
9. [Equipment Subcategories](#equipment-subcategories)

---

## Overview

The extensibility system allows you to:

- **Add custom content** to any procedural generation category
- **Control spawn rates** with relative or absolute weighting
- **Validate content** automatically with clear error messages
- **Create content packs** that can be loaded at runtime

### Supported Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Equipment** | | |
| `equipment` | Weapons, armor, items | Custom weapons, magic items |
| `equipment.properties` | Equipment property templates | Enchantments, curses, special abilities |
| `equipment.modifications` | Modification templates | Curses, upgrades, enchantments |
| `equipment.templates` | Complete equipment templates | Pre-built items with properties |
| **Appearance** | | |
| `appearance.bodyTypes` | Character body shapes | 'giant', 'diminutive', etc. |
| `appearance.skinTones` | Skin color options | Hex colors for skin tones |
| `appearance.hairColors` | Hair color options | Hex colors for hair |
| `appearance.hairStyles` | Hair style options | 'braided', 'mohawk', etc. |
| `appearance.eyeColors` | Eye color options | Hex colors for eyes |
| `appearance.facialFeatures` | Facial features | 'scar', 'tattoo', etc. |
| **Spells** | | |
| `spells` | Arcane and divine magic | Custom spells for spellcasting classes |
| `spells.{className}` | Class-specific spells | 'spells.Wizard' for custom wizard spells |
| **Races** | | |
| `races` | Race names | Custom races (uses Race enum) |
| `races.data` | Race data | Ability bonuses, speed, traits, subraces |
| **Classes** | | |
| `classes` | Class names | Custom classes (uses Class enum) |
| `classes.data` | Class data | Hit die, saves, skills, spellcasting, etc. |
| **Features** | | |
| `classFeatures` | All class features | Custom rage, metamagic, etc. |
| `classFeatures.{className}` | Class-specific features | 'classFeatures.Barbarian', 'classFeatures.Wizard' |
| `racialTraits` | All racial traits | Custom darkvision, stonecunning, etc. |
| `racialTraits.{raceName}` | Race-specific traits | 'racialTraits.Elf', 'racialTraits.Dwarf' |
| **Skills** | | |
| `skills` | All skills (default + custom) | Custom survival, knowledge skills |
| `skills.{ability}` | Ability-specific skills | 'skills.STR', 'skills.DEX', etc. |
| `skillLists` | All skill lists | Per-class skill selections |
| `skillLists.{className}` | Class-specific skill lists | 'skillLists.Barbarian', 'skillLists.Wizard' |
| **Class Magic** | | |
| `classSpellLists` | All class spell lists | Class-specific spell selections |
| `classSpellLists.{className}` | Class-specific spell list | Custom spell lists for classes |
| `classSpellSlots` | Spell slot progressions | Custom slot progressions by level |
| **Class Gear** | | |
| `classStartingEquipment` | All class starting equipment | Default gear for each class |
| `classStartingEquipment.{className}` | Class-specific equipment | Custom starting equipment for classes |

---

## ExtensionManager API

The `ExtensionManager` is a singleton that manages all custom content. Get the instance:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();
```

### Core Methods

#### `register(category, items, options)`

Register custom content for a category.

```typescript
manager.register(
    'equipment',
    [
        { name: 'Dragon Sword', type: 'weapon', rarity: 'legendary', weight: 5 }
    ],
    {
        mode: 'relative',  // Add to defaults (default)
        weights: { 'Dragon Sword': 0.5 },  // Half as common
        validate: true  // Validate before registering (default)
    }
);
```

#### `get(category)`

Get all items for a category (defaults + custom).

```typescript
const allEquipment = manager.get('equipment');
// Returns: default equipment + custom equipment
```

#### `setWeights(category, weights)`

Set spawn weights for a category.

```typescript
manager.setWeights('equipment', {
    'Longsword': 2,      // Twice as common
    'Dagger': 0.5,       // Half as common
    'Excalibur': 0.1     // Very rare
});
```

#### `getWeights(category)`

Get current weights for a category.

```typescript
const weights = manager.getWeights('equipment');
// Returns: { 'Longsword': 2, 'Dagger': 0.5, ... }
```

#### `reset(category)`

Reset a category to defaults (removes all custom data).

```typescript
manager.reset('equipment');
```

#### `resetAll()`

Reset all categories to defaults.

```typescript
manager.resetAll();
```

#### `getDefaults(category)`

Get default data only (no custom items).

```typescript
const defaultEquipment = manager.getDefaults('equipment');
// Returns: default equipment only
```

#### `getCustom(category)`

Get custom items only (no defaults).

```typescript
const customEquipment = manager.getCustom('equipment');
// Returns: custom equipment only
```

#### `getDefaultWeights(category)`

Get default weights only (all items have weight 1.0).

```typescript
const defaultWeights = manager.getDefaultWeights('equipment');
// Returns: { 'Longsword': 1.0, 'Dagger': 1.0, ... }
```

#### `hasCustomData(category)`

Check if a category has custom data registered.

```typescript
if (manager.hasCustomData('equipment')) {
    console.log('Custom equipment registered');
}
```

#### `getMode(category)`

Get the registration mode for a category.

```typescript
const mode = manager.getMode('equipment');
// Returns: 'relative' | 'absolute' | 'default' | undefined
```

#### `getInfo(category)`

Get information about registered extensions.

```typescript
const info = manager.getInfo('spells');
console.log(info);
// {
//     hasCustomData: true,
//     defaultCount: 53,
//     customCount: 5,
//     totalCount: 58,
//     mode: 'relative',
//     weights: { ... },
//     registeredAt: 1234567890
// }
```

#### `exportCustomData()`

Export all custom data (for debugging/saving).

```typescript
const customData = manager.exportCustomData();
console.log(customData);
// {
//     extensions: {
//         'spells': { items: [...], options: {...}, registeredAt: ... },
//         'equipment': { items: [...], options: {...}, registeredAt: ... }
//     },
//     weights: {
//         'spells': { 'Phoenix Fire': 0.5 },
//         'equipment': { 'Sword': 2.0 }
//     }
// }
```

#### `getRegisteredCategories()`

Get all categories with default data.

```typescript
const categories = manager.getRegisteredCategories();
// Returns: ['equipment', 'spells', 'races', ...]
```

---

## Spawn Rate System

The spawn rate system supports three modes:

### Relative Mode (Default)

Custom weights are added to default weights. This is the most common mode.

```typescript
manager.register('equipment', customItems, { mode: 'relative' });

// With relative mode:
// - Default items get weight 1.0
// - Custom items can have custom weights
// - Result: Mixed pool of default + custom items
```

### Absolute Mode

Custom weights replace default weights. Only custom items can spawn.

```typescript
manager.register('equipment', customItems, { mode: 'absolute' });

// With absolute mode:
// - Only custom items in this category can spawn
// - Default items are excluded
// - Useful for themed content packs
```

### Default Mode

All items (default + custom) have equal weight.

```typescript
manager.register('equipment', customItems, { mode: 'default' });

// With default mode:
// - All items have weight 1.0
// - Equal probability for all items
```

### Replace Mode

Replace mode clears existing custom data for the category before registering new items. This is useful for hot-reloading content packs.

```typescript
manager.register('equipment', customItems, { mode: 'replace' });

// With replace mode:
// - Any previously registered custom equipment is cleared
// - New custom items are registered
// - Default items remain untouched
// - Useful for development and content pack reloading
```

**Use cases for replace mode:**
- Hot-reloading content packs during development
- Completely swapping out themed content
- Testing different content packs without resetting

### Weight Values

| Value | Effect |
|-------|--------|
| `0` | Never spawns |
| `0.5` | Half as common as default |
| `1.0` | Default spawn rate |
| `2.0` | Twice as common as default |
| `10.0` | Very common |

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

Add custom weapons, armor, and items:

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

const customEquipment = [
    {
        name: 'Frost Brand',
        type: 'weapon',
        rarity: 'very_rare',
        weight: 3
    },
    {
        name: 'Mithral Chain Shirt',
        type: 'armor',
        rarity: 'rare',
        weight: 10
    },
    {
        name: 'Potion of Giant Strength',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.5
    }
];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Hero Name',
    {
        extensions: {
            equipment: customEquipment
        }
    }
);
```

**Set spawn weights:**

```typescript
const manager = ExtensionManager.getInstance();

// Make Frost Brand very rare
manager.setWeights('equipment', {
    'Frost Brand': 0.1,
    'Potion of Giant Strength': 2.0  // Common
});
```

### Spells

Add custom spells:

```typescript
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

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Wizard Name',
    {
        forceClass: 'Wizard',
        extensions: {
            spells: customSpells
        }
    }
);
```

**Make certain spells more common:**

```typescript
const manager = ExtensionManager.getInstance();

manager.setWeights('spells', {
    'Phoenix Fire': 0.5,   // Rare
    'Mind Shield': 2.0     // Common
});
```

#### Spells with Prerequisites

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

```typescript
import { SpellValidator, SpellManager, ExtensionManager } from 'playlist-data-engine';

// ===== SPELL WITH FEATURE PREREQUISITES =====
// Dragon Breath: Requires Draconic Bloodline feature
const dragonBreath = {
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
};

// ===== SPELL WITH LEVEL AND CLASS PREREQUISITES =====
// Meteor Swarm: High-level evocation spell
const limitedMeteorSwarm = {
    id: 'limited_meteor_swarm',
    name: 'Meteor Swarm',
    level: 9,
    school: 'Evocation',
    casting_time: '1 action',
    range: '1 mile',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'Blazing orbs rain down',
    prerequisites: {
        level: 17,  // Character must be level 17+
        class: 'Wizard',
        spells: ['Fireball']  // Must know Fireball first
    }
};

// ===== SPELL WITH SKILL PREREQUISITES =====
// Arcane Sword: Requires Arcana proficiency
const arcaneSwordSpell = {
    id: 'arcane_sword',
    name: 'Arcane Sword',
    level: 5,
    school: 'Evocation',
    casting_time: '1 bonus action',
    range: '60 ft',
    components: ['V', 'S', 'M'],
    duration: 'Concentration, 1 minute',
    description: 'Summon a sword of pure magic',
    prerequisites: {
        skills: ['arcana']  // Requires Arcana proficiency
    }
};

// ===== REGISTER CUSTOM SPELLS =====
const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath, limitedMeteorSwarm, arcaneSwordSpell]);

// ===== VALIDATE SPELL PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Sorcerer');
const spell = SPELL_DATABASE['dragon_breath'];

if (spell.prerequisites) {
    const result = SpellValidator.validateSpellPrerequisites(spell.prerequisites, character);

    if (!result.valid) {
        console.log('Cannot learn this spell:', result.unmet);
    }
}

// During character generation, SpellManager automatically filters
// out spells that have unmet prerequisites
const knownSpells = SpellManager.getKnownSpells(
    character.class,
    character.level,
    character  // Pass character for prerequisite filtering
);
// Only includes spells whose prerequisites are met
```

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
    'Hero Name'
);
// Now Dragonkin and Fairy can be selected!
```

#### Races with Subraces

The engine supports custom races with optional subrace variants. Register custom race data with subraces and the engine will validate and use it during character generation.

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== REGISTER CUSTOM RACE WITH SUBRACES =====
// Step 1: Register the race name
manager.register('races', ['Dragonkin'], { validate: true });

// Step 2: Register the race data (ability bonuses, speed, traits, subraces)
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// ===== REGISTER SUBRACE-SPECIFIC TRAITS =====
// Fire Dragonkin only
manager.register('racialTraits', [{
    id: 'fire_dragonkin_resistance',
    name: 'Fire Resistance',
    description: 'Resistance to fire damage',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for this subrace
    effects: [
        { type: 'passive_modifier', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);

// Ice Dragonkin only
manager.register('racialTraits', [{
    id: 'ice_dragonkin_resistance',
    name: 'Cold Resistance',
    description: 'Resistance to cold damage',
    race: 'Dragonkin',
    subrace: 'Ice Dragonkin',
    effects: [
        { type: 'passive_modifier', target: 'cold_resistance', value: true }
    ],
    source: 'custom'
}]);

// ===== GENERATE CHARACTER WITH SUBRACE =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Pyro');
// After generation, set the subrace
character.subrace = 'Fire Dragonkin';

// Character will have:
// - Base Dragonkin traits (Draconic Ancestry, Darkvision)
// - Subrace-specific traits (Fire Resistance)
// - Correct ability bonuses (STR+2, CON+1, CHA+1)

// ===== FEATURE WITH SUBRACE PREREQUISITE =====
// Trait that requires a specific subrace
manager.register('racialTraits', [{
    id: 'inferno_breath',
    name: 'Inferno Breath',
    description: 'Breathe fire like a true red dragon',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: {
        subrace: 'Fire Dragonkin',  // Must be Fire Dragonkin
        level: 5
    },
    effects: [
        { type: 'active_ability', target: 'fire_breath', value: '6d6' }
    ],
    source: 'custom'
}]);
```

**Type Augmentation for Custom Races:**

Since `Race` is a closed union, extend it in your project:

```typescript
// In your project's global types file
import 'playlist-data-engine';

declare module 'playlist-data-engine' {
    type Race =
        | 'Human' | 'Elf' | 'Dwarf'
        | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome'
        | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
        | 'Dragonkin';  // Custom race
}

// Now TypeScript accepts 'Dragonkin' as a valid Race
const dragonkinCharacter: CharacterSheet = {
    // ...
    race: 'Dragonkin'  // No TypeScript error!
};
```

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
    'Hero Name'
);
```

#### Creating Custom Classes

**NEW:** You CAN create entirely new custom classes using the `classes.data` category! Custom classes can extend (inherit from) existing D&D 5e base classes or be defined completely from scratch.

**Template-Based Custom Class** (extends existing class):

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register custom class data (inherits from Wizard)
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits all properties from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
}]);

// Step 2: Register the class name for validation
manager.register('classes', [asClass('Necromancer')]);

// Now Necromancer can be generated!
const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Hero Name'
);
```

**Complete Custom Class** (from scratch):

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register complete custom class data
manager.register('classes.data', [{
    name: 'Runecaster',
    // No baseClass - must specify everything
    primary_ability: 'WIS',
    hit_die: 8,
    saving_throws: ['WIS', 'CON'],
    is_spellcaster: true,
    skill_count: 3,
    available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
    has_expertise: false
}]);

// Step 2: Register the class name
manager.register('classes', [asClass('Runecaster')]);

// Step 3: (Optional) Set custom spell list
manager.register('classSpellLists.Runecaster', [{
    cantrips: ['druidcraft', 'guidance', 'resistance'],
    spells_by_level: {
        1: ['detect magic', 'magic stone', 'faerie fire']
    }
}]);

// Step 4: (Optional) Set custom spell slot progression
manager.register('classSpellSlots', [{
    class: 'Runecaster',
    slots: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 }
        // ... define for all levels 1-20
    }
}]);

// Step 5: (Optional) Set custom starting equipment
manager.register('classStartingEquipment.Runecaster', [{
    weapons: ['Quarterstaff', 'Dagger'],
    armor: [],
    items: ['Component pouch', 'Spellbook']
}]);

// Now generate a Runecaster character!
const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Hero Name'
);
```

**Class Data Properties:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Unique class name |
| `baseClass` | Class | No | If specified, inherits properties from this class |
| `primary_ability` | Ability | Yes* | Primary ability score (STR, DEX, CON, INT, WIS, CHA) - required if no baseClass |
| `hit_die` | number | Yes* | Hit die size (6, 8, 10, 12) - required if no baseClass |
| `saving_throws` | Ability[] | Yes* | Two saving throw abilities - required if no baseClass |
| `is_spellcaster` | boolean | Yes* | Can this class cast spells - required if no baseClass |
| `skill_count` | number | Yes* | Number of skill proficiencies - required if no baseClass |
| `available_skills` | string[] | Yes* | Array of skill IDs - required if no baseClass |
| `has_expertise` | boolean | Yes* | Has expertise feature - required if no baseClass |
| `expertise_count` | number | No | Number of expertise choices (if has_expertise is true) |
| `audio_preferences` | object | No | Audio affinity for class suggestion |

**Default Classes:**

The 12 default D&D 5e classes are always available:
`Barbarian`, `Bard`, `Cleric`, `Druid`, `Fighter`, `Monk`, `Paladin`, `Ranger`, `Rogue`, `Sorcerer`, `Warlock`, `Wizard`

#### Common Patterns

Here are some common patterns for creating custom classes using the template system:

**Archetype Variant** - Same class, different flavor:

```typescript
{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}
```

**Multiclass-Inspired** - Two classes combined:

```typescript
{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}
```

**Specialist** - Narrow focus:

```typescript
{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}
```

**For more examples and advanced usage, see [CUSTOM_CONTENT.md](CUSTOM_CONTENT.md).**

### Class Features

Add custom class features with the FeatureRegistry:

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Register custom class features
registry.registerClassFeatures([
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
const manager = ExtensionManager.getInstance();
manager.setWeights('classFeatures.Barbarian', {
    'dragon_fury': 0.5,  // Half as likely to spawn
    'rage': 1.0          // Default spawn rate
});
```

**Note:** FeatureRegistry supports both single and bulk registration:

```typescript
// Register a single feature
registry.registerClassFeature({
    id: 'single_feature',
    name: 'Single Feature',
    // ... rest of feature definition
});

// Register multiple features at once
registry.registerClassFeatures([
    feature1,
    feature2,
    feature3
]);
```

The same pattern applies to `registerRacialTrait()` / `registerRacialTraits()` and `registerSkill()` / `registerSkills()`.

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
import { FeatureRegistry, FeatureValidator } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

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

registry.registerClassFeature(arcaneSmith);

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

registry.registerClassFeature(spellblade);

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

registry.registerRacialTrait(elvenBattleTraining);

// ===== VALIDATE FEATURE PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Elf Warrior');
const features = registry.getClassFeatures('Wizard', character.level);
const feature = features.find(f => f.id === 'arcane_smith');

if (feature) {
    const result = registry.validatePrerequisites(feature, character);

    if (!result.valid) {
        console.log('Cannot learn feature:', result.errors);
    }
}

// Features with unmet prerequisites are automatically
// excluded during character generation
```

### Racial Traits

Add custom racial traits with the FeatureRegistry:

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Register custom racial traits
registry.registerRacialTraits([
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
const manager = ExtensionManager.getInstance();
manager.setWeights('racialTraits', {
    'dragon_born_fire_resistance': 1.0,
    'fairy_flight': 0.3,  // Rare trait
    'elemental_affinity': 0.5
});
```

**Get traits for a race:**

```typescript
const registry = FeatureRegistry.getInstance();

// Get all traits for a race
const dragonbornTraits = registry.getRacialTraits('Dragonborn');

// Get traits for a subrace
const hillDwarfTraits = registry.getRacialTraitsForSubrace('Dwarf', 'Hill Dwarf');

// Get a specific trait
const fireResistance = registry.getRacialTraitById('dragon_born_fire_resistance');
```

### Skills

Add custom skills with the SkillRegistry:

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();

// Register custom skills
registry.registerSkills([
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
const manager = ExtensionManager.getInstance();
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
const registry = SkillRegistry.getInstance();

// Get skill by ID
const survival = registry.getSkill('survival_cold');

// Get all skills for an ability
const strSkills = registry.getSkillsByAbility('STR');

// Get skills by category
const explorationSkills = registry.getSkillsByCategory('exploration');

// Get custom skills only
const customSkills = registry.getSkillsBySource('custom');

// Check if skill exists
const isValid = registry.isValidSkill('survival_cold');  // true
```

#### Skills with Prerequisites

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

```typescript
import { SkillRegistry, SkillValidator, CharacterGenerator } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();

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

registry.registerSkill(dragonSmithing);

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

registry.registerSkill(advancedArcana);

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

registry.registerSkill(spellMasterySkill);

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

registry.registerSkill(dwarvenCombat);

// ===== VALIDATING SKILL PREREQUISITES =====
// Check if a character meets the requirements
const character = CharacterGenerator.generate(seed, audioProfile, 'Hero');
const skill = registry.getSkill('dragon_smithing');

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

#### Querying Registries

You can query the FeatureRegistry and SkillRegistry to get information about registered features, skills, and registry statistics:

```typescript
import { FeatureRegistry, SkillRegistry } from 'playlist-data-engine';

const featureRegistry = FeatureRegistry.getInstance();
const skillRegistry = SkillRegistry.getInstance();

// ===== FEATURE QUERIES =====

// Get all features for a class at a specific level
const barbarianLevel3Features = featureRegistry.getClassFeatures('Barbarian', 3);
console.log(`Barbarian level 3 features:`, barbarianLevel3Features.map(f => f.name));

// Get all racial traits for a race
const elfTraits = featureRegistry.getRacialTraits('Elf');
console.log(`Elf traits:`, elfTraits.map(t => t.name));

// ===== SKILL QUERIES =====

// Get skills by ability
const wisdomSkills = skillRegistry.getSkillsByAbility('WIS');
console.log(`WIS skills:`, wisdomSkills.map(s => s.id));

// Get skills by category
const explorationSkills = skillRegistry.getSkillsByCategory('exploration');
console.log(`Exploration skills:`, explorationSkills.map(s => s.name));

// ===== REGISTRY STATISTICS =====

// Get registry statistics
const featureStats = featureRegistry.getRegistryStats();
console.log(`Features: ${featureStats.totalFeatures} (${featureStats.customFeatures} custom)`);

const skillStats = skillRegistry.getRegistryStats();
console.log(`Skills: ${skillStats.totalSkills} (${skillStats.customSkills} custom)`);
```

### Appearance

#### Body Types

```typescript
const customBodyTypes = ['giant', 'diminutive', 'elongated'];

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Hero Name',
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
    'Hero Name',
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
    'Hero Name',
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
    'Hero Name',
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
    'Hero Name',
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
    'Hero Name',
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
    'Hero Name'
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
import { ExtensionManager, FeatureRegistry, SkillRegistry, CharacterGenerator } from 'playlist-data-engine';

// Create an expansion pack with custom features, skills, and spawn rates
function registerArcticExpansionPack() {
    const manager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();
    const skillRegistry = SkillRegistry.getInstance();

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
    featureRegistry.registerClassFeatures([frostRage, snowWalker]);
    manager.register('classFeatures.Barbarian', [frostRage], {
        weights: { 'frost_rage': 0.5 }  // Rare feature
    });
    manager.register('classFeatures.Ranger', [snowWalker], {
        weights: { 'snow_walker': 0.7 }
    });

    // Skills
    skillRegistry.registerSkills([coldSurvival, iceFishing]);
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
const character = CharacterGenerator.generate(seed, audio, 'Arctic Hero');
// Character may now have frost_rage, snow_walker, or survival_cold skill!
```

---

## Validation

The extensibility system includes automatic validation. Invalid content is rejected with clear error messages.

### Validation Rules

#### Equipment

```typescript
{
    name: string;        // Required, non-empty string
    type: 'weapon' | 'armor' | 'item';  // Required, valid type
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';  // Required
    weight: number;      // Required, non-negative
}
```

**Invalid examples:**

```typescript
// Missing required field
{ name: 'Broken Sword', type: 'weapon' }  // Error: Missing rarity

// Invalid type
{ name: 'Item', type: 'potion', rarity: 'common', weight: 1 }  // Error: Invalid type

// Invalid rarity
{ name: 'Item', type: 'item', rarity: 'mythic', weight: 1 }  // Error: Invalid rarity

// Negative weight
{ name: 'Item', type: 'item', rarity: 'common', weight: -1 }  // Error: Invalid weight
```

#### Spells

```typescript
{
    name: string;        // Required, non-empty string
    level: number;       // Required, 0-9
    school: string;      // Required, valid school name
    // Optional: casting_time, range, duration, components, description
}
```

**Valid schools:**

`'Abjuration'`, `'Conjuration'`, `'Divination'`, `'Enchantment'`, `'Evocation'`, `'Illusion'`, `'Necromancy'`, `'Transmutation'`

**Invalid examples:**

```typescript
// Level out of range
{ name: 'Spell', level: 10, school: 'Evocation' }  // Error: Level must be 0-9

// Invalid school
{ name: 'Spell', level: 1, school: 'Dark Magic' }  // Error: Invalid school
```

#### Races

Must be a valid race name from the `Race` enum:

`'Human'`, `'Elf'`, `'Dwarf'`, `'Halfling'`, `'Dragonborn'`, `'Gnome'`, `'Half-Elf'`, `'Half-Orc'`, `'Tiefling'`

**Invalid example:**

```typescript
manager.register('races', ['Orc', 'Goblin']);  // Error: Invalid race
```

#### Classes

Must be a valid class name from the `Class` enum:

`'Barbarian'`, `'Bard'`, `'Cleric'`, `'Druid'`, `'Fighter'`, `'Monk'`, `'Paladin'`, `'Ranger'`, `'Rogue'`, `'Sorcerer'`, `'Warlock'`, `'Wizard'`

**Invalid example:**

```typescript
manager.register('classes', ['Necromancer', 'Battlemage']);  // Error: Invalid class
```

#### Appearance

All appearance options must be strings.

**Invalid example:**

```typescript
manager.register('appearance.bodyTypes', [{ name: 'giant' }]);  // Error: Must be strings
```

#### Class Features

```typescript
{
    id: string;              // Required, unique feature ID (lowercase_with_underscores)
    name: string;            // Required, display name
    description: string;     // Required, feature description
    type: 'passive' | 'active' | 'resource' | 'trigger';  // Required
    class: Class;            // Required, valid class name
    level: number;           // Required, 1-20
    prerequisites?: {        // Optional
        level?: number;
        features?: string[];
        abilities?: Record<Ability, number>;
        class?: Class;
        race?: Race;
        custom?: string;
    };
    effects?: Array<{        // Optional
        type: 'stat_bonus' | 'skill_proficiency' | 'ability_unlock' | 'passive_modifier' | 'resource_grant' | 'spell_slot_bonus';
        target: string;
        value: number | string | boolean;
        condition?: string;
        description?: string;
    }>;
    source: 'default' | 'custom';  // Required
    tags?: string[];          // Optional
    lore?: string;           // Optional
}
```

**Invalid examples:**

```typescript
// Missing required fields
{ id: 'test' }  // Error: Missing name, description, type, class, level, source

// Invalid ID format
{ id: 'Test-Feature', name: 'Test', ... }  // Error: ID must be lowercase_with_underscores

// Invalid type
{ id: 'test', name: 'Test', type: 'invalid', ... }  // Error: Invalid feature type

// Duplicate ID
registry.registerClassFeature({ id: 'rage', ... });  // Error: Feature ID 'rage' already exists
```

#### Racial Traits

```typescript
{
    id: string;              // Required, unique trait ID (lowercase_with_underscores)
    name: string;            // Required, display name
    description: string;     // Required, trait description
    race: Race;              // Required, valid race name
    subrace?: string;        // Optional, for subrace-specific traits
    prerequisites?: {        // Optional (same format as class features)
        level?: number;
        features?: string[];
        abilities?: Record<Ability, number>;
        class?: Class;
        race?: Race;
        custom?: string;
    };
    effects?: Array<{        // Optional (same format as class features)
        type: 'stat_bonus' | 'skill_proficiency' | 'ability_unlock' | 'passive_modifier' | 'resource_grant' | 'spell_slot_bonus';
        target: string;
        value: number | string | boolean;
        condition?: string;
        description?: string;
    }>;
    source: 'default' | 'custom';  // Required
    tags?: string[];          // Optional
    lore?: string;           // Optional
}
```

**Invalid examples:**

```typescript
// Missing required fields
{ id: 'test' }  // Error: Missing name, description, race, source

// Invalid race
{ id: 'test', name: 'Test', race: 'Orc', ... }  // Error: Invalid race

// Duplicate ID
registry.registerRacialTrait({ id: 'darkvision', ... });  // Error: Trait ID 'darkvision' already exists
```

#### Skills

```typescript
{
    id: string;              // Required, unique skill ID (lowercase_with_underscores)
    name: string;            // Required, display name
    ability: Ability;        // Required, one of: STR, DEX, CON, INT, WIS, CHA
    description?: string;    // Optional
    armorPenalty?: boolean;  // Optional
    customProperties?: Record<string, string | number | boolean | string[]>;  // Optional
    categories?: string[];   // Optional, for grouping
    source: 'default' | 'custom';  // Required
    tags?: string[];         // Optional
    lore?: string;           // Optional
}
```

**Invalid examples:**

```typescript
// Missing required fields
{ id: 'test' }  // Error: Missing name, ability, source

// Invalid ID format
{ id: 'Test-Skill', name: 'Test', ability: 'STR', source: 'custom' }  // Error: ID must be lowercase_with_underscores

// Invalid ability
{ id: 'test', name: 'Test', ability: 'INVALID', source: 'custom' }  // Error: Invalid ability

// Duplicate ID
registry.registerSkill({ id: 'athletics', ... });  // Error: Skill ID 'athletics' already exists
```

#### Skill Lists

```typescript
{
    class: string;           // Required, class name
    skillCount: number;      // Required, non-negative
    availableSkills: string[];  // Required, array of skill IDs
    selectionWeights?: {     // Optional
        weights: Record<string, number>;
        mode?: 'relative' | 'absolute' | 'default';
    };
    hasExpertise?: boolean;  // Optional
    expertiseCount?: number; // Optional, non-negative
}
```

**Invalid examples:**

```typescript
// Missing required fields
{ class: 'Barbarian' }  // Error: Missing skillCount, availableSkills

// Negative skill count
{ class: 'Barbarian', skillCount: -1, availableSkills: [] }  // Error: skillCount must be non-negative

// Invalid skill ID
{
    class: 'Barbarian',
    skillCount: 2,
    availableSkills: ['invalid_skill_id']
}  // Error: Invalid skill ID 'invalid_skill_id'
```

### Disabling Validation

You can disable validation for advanced use cases:

```typescript
manager.register('equipment', customItems, { validate: false });
```

**Warning:** Disabling validation can cause runtime errors. Only use this if you're certain your data is valid.

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

## Advanced Examples

### Seasonal Content Packs

```typescript
// winter-pack.ts
export function loadWinterPack() {
    const manager = ExtensionManager.getInstance();

    manager.register('equipment', [
        { name: 'Frostbrand Sword', type: 'weapon', rarity: 'rare', weight: 3 },
        { name: 'Ice Armor', type: 'armor', rarity: 'very_rare', weight: 20 },
        { name: 'Potion of Warmth', type: 'item', rarity: 'uncommon', weight: 0.5 }
    ]);

    manager.register('spells', [
        { name: 'Ice Storm', level: 4, school: 'Evocation' },
        { name: 'Frost Ray', level: 2, school: 'Evocation' }
    ]);

    manager.register('appearance.skinTones', [
        '#E0FFFF',  // Light cyan
        '#B0E0E6',  // Powder blue
        '#AFEEEE'   // Pale turquoise
    ]);
}

// Usage in December
loadWinterPack();
```

### Difficulty Modifiers

```typescript
// hard-mode-pack.ts
export function loadHardModePack() {
    const manager = ExtensionManager.getInstance();

    // Reduce good equipment spawns
    manager.setWeights('equipment', {
        'Longsword': 0.5,
        'Chain Mail': 0.3,
        'Healing Potion': 0.2
    });

    // Increase dangerous item spawns
    manager.register('equipment', [
        { name: 'Cursed Blade', type: 'weapon', rarity: 'uncommon', weight: 3 },
        { name: 'Trap Kit', type: 'item', rarity: 'common', weight: 2 }
    ], {
        weights: {
            'Cursed Blade': 2.0,
            'Trap Kit': 3.0
        }
    });
}
```

### Genre-Specific Packs

```typescript
// horror-pack.ts
export function loadHorrorPack() {
    const manager = ExtensionManager.getInstance();

    manager.register('equipment', [
        { name: 'Vampire Fang', type: 'weapon', rarity: 'rare', weight: 1 },
        { name: 'Holy Symbol', type: 'item', rarity: 'uncommon', weight: 0.5 }
    ]);

    manager.register('spells', [
        { name: 'Turn Undead', level: 1, school: 'Evocation' },
        { name: 'Detect Evil', level: 1, school: 'Divination' }
    ]);

    manager.register('appearance.facialFeatures', [
        'bite marks',
        'haunted eyes',
        'deathly pallor'
    ]);
}
```

---

## Troubleshooting

### Content Not Appearing

**Problem:** Custom content doesn't appear in generated characters.

**Solution:** Check that:
1. Content is registered before character generation
2. Validation is not failing (check console for errors)
3. Spawn weights are not set to 0
4. You're using the correct category name

```typescript
// Debug: Check registered content
const manager = ExtensionManager.getInstance();
const info = manager.getInfo('equipment');
console.log(info);
// { hasCustomData: true, customCount: 5, totalCount: 42, ... }
```

### Validation Errors

**Problem:** Validation fails with unclear error.

**Solution:** Read the error message carefully. It includes:
- The category that failed
- The item index
- The specific validation error

```typescript
try {
    manager.register('equipment', invalidItems);
} catch (error) {
    // Error: Invalid items for category 'equipment':
    // Item 0: Missing or invalid 'name' property
    // Item 1: Invalid 'type' (must be 'weapon', 'armor', or 'item')
    console.error(error.message);
}
```

### Content Not Persisting

**Problem:** Custom content disappears between sessions.

**Solution:** The extensibility system is **runtime only**. You must re-register content each session:

```typescript
// On app startup
import { loadMyContentPack } from './my-content-pack';

loadMyContentPack();
```

### Spawn Rates Not Working

**Problem:** Custom spawn rates don't seem to affect generation.

**Solution:** Check the spawn mode:

```typescript
// Relative: Custom weights added to defaults
manager.register('equipment', items, { mode: 'relative' });

// Absolute: Only custom items spawn
manager.register('equipment', items, { mode: 'absolute' });

// Default: All items equal weight
manager.register('equipment', items, { mode: 'default' });
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

## Equipment Subcategories

The equipment system supports three subcategories for advanced customization: **properties**, **modifications**, and **templates**.

**For complete equipment system documentation, see [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md)**

### Equipment Properties

Register custom equipment property templates (enchantments, curses, special abilities):

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom property templates
manager.register('equipment.properties', [
    {
        type: 'damage_bonus',
        target: 'lightning',
        value: '1d6',
        description: '+1d6 lightning damage',
        requirements: {
            abilities: { DEX: 13 }
        }
    },
    {
        type: 'spell_grant',
        target: 'mage_armor',
        value: 1,
        description: 'Cast Mage Armor once per day',
        requiresAttunement: true
    },
    {
        type: 'passive_modifier',
        target: 'AC',
        value: 2,
        description: '+2 Armor Class',
        condition: 'while wearing light armor'
    }
], {
    weights: {
        'lightning_damage': 0.5,
        'mage_armor_grant': 0.3
    }
});
```

**Property Types:**
- `damage_bonus` - Bonus damage of a specific type
- `spell_grant` - Grants spell usage
- `passive_modifier` - Constant bonus to stats/rolls
- `ability_unlock` - Unlocks new abilities (flight, darkvision)
- `skill_proficiency` - Grants skill proficiency
- `stat_bonus` - Increases ability scores
- `resource_grant` - Grants resource pools (rage, ki)

### Equipment Modifications

Register custom modification templates (curses, upgrades, enchantments):

```typescript
// Register modification templates
manager.register('equipment.modifications', [
    {
        name: 'Flaming Enchantment',
        type: 'enchantment',
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire',
                value: '1d6',
                description: '+1d6 fire damage'
            }
        ],
        requirements: {
            rarity: 'rare',
            type: 'weapon'
        },
        cost: { gold: 500, gems: 2 }
    },
    {
        name: 'Cursed Binding',
        type: 'curse',
        properties: [
            {
                type: 'passive_modifier',
                target: 'AC',
                value: -2,
                description: '-2 Armor Class'
            },
            {
                type: 'skill_proficiency',
                target: 'stealth',
                value: 'disadvantage',
                description: 'Disadvantage on Stealth checks'
            }
        ],
        requirements: {
            rarity: 'uncommon'
        },
        removable: false
    }
]);
```

### Equipment Templates

Register pre-built equipment templates (complete items with properties):

```typescript
// Register equipment templates
manager.register('equipment.templates', [
    {
        name: 'Flaming Sword',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing' },
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire',
                value: '1d6',
                description: '+1d6 fire damage'
            },
            {
                type: 'spell_grant',
                target: 'burning_hands',
                value: 1,
                description: 'Cast Burning Hands once per day'
            }
        ],
        spawnWeight: 0.5,
        source: 'custom',
        tags: ['magic', 'fire', 'weapon']
    },
    {
        name: 'Shadow Cloak',
        type: 'armor',
        rarity: 'very_rare',
        weight: 5,
        armorClass: 12,
        properties: [
            {
                type: 'passive_modifier',
                target: 'stealth',
                value: 'advantage',
                description: 'Advantage on Stealth checks'
            },
            {
                type: 'spell_grant',
                target: 'invisibility',
                value: 1,
                description: 'Cast Invisibility once per day'
            }
        ],
        requiresAttunement: true,
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'shadow', 'armor']
    }
]);
```

**Using Templates in Character Generation:**

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Templates are automatically used when generating characters
const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Hero Name'
);

// Character may have Flaming Sword or Shadow Cloak based on spawn weights
```

### Template Modifiers

Apply modification templates to equipment:

```typescript
import { EquipmentModifier } from 'playlist-data-engine';

// EquipmentModifier uses static methods (not a singleton)

// Apply an enchantment template to equipment
const enchantedSword = EquipmentModifier.applyTemplate(
    baseWeapon,
    'Flaming Enchantment'
);

// Apply a curse (if not removable)
const cursedItem = EquipmentModifier.applyTemplate(
    baseItem,
    'Cursed Binding'
);
```

### Combining Subcategories

Create powerful combinations using all three subcategories:

```typescript
// 1. Define property templates
manager.register('equipment.properties', [
    { type: 'damage_bonus', target: 'poison', value: '1d4', ... }
]);

// 2. Define modification templates that use properties
manager.register('equipment.modifications', [
    {
        name: 'Poison Coating',
        type: 'enchantment',
        properties: [{ type: 'damage_bonus', target: 'poison', value: '1d4', ... }]
    }
]);

// 3. Define complete equipment templates
manager.register('equipment.templates', [
    {
        name: 'Assassin's Dagger',
        type: 'weapon',
        rarity: 'very_rare',
        properties: [
            { type: 'damage_bonus', target: 'poison', value: '1d6', ... },
            { type: 'passive_modifier', target: 'initiative', value: 2, ... }
        ]
    }
]);
```

---

## Reference

### Type Definitions

**Note:** The extension interfaces below (`ClassFeatureExtension`, `RacialTraitExtension`, `SkillExtension`) match the actual exported types from the package (`ClassFeature`, `RacialTrait`, `CustomSkill`). You can import and use the actual types directly:

```typescript
import type { ClassFeature, RacialTrait, CustomSkill } from 'playlist-data-engine';
```

```typescript
// Extension options
interface ExtensionOptions {
    mode?: 'relative' | 'absolute' | 'default' | 'replace';
    weights?: Record<string, number>;
    validate?: boolean;
}

// Spell extension
interface SpellExtension {
    name: string;
    level: number;  // 0-9
    school: string;  // Valid school name
    casting_time?: string;
    range?: string;
    duration?: string;
    components?: string[];
    description?: string;
}

// Equipment extension
interface EquipmentExtension {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;  // Non-negative
}

// Class feature extension (same as ClassFeature type)
interface ClassFeatureExtension {
    id: string;              // Unique feature ID (lowercase_with_underscores)
    name: string;            // Display name
    description: string;     // Feature description
    type: 'passive' | 'active' | 'resource' | 'trigger';
    class: Class;            // Class this feature belongs to
    level: number;           // Level gained (1-20)
    prerequisites?: {        // Optional prerequisites
        level?: number;
        features?: string[];
        abilities?: Record<Ability, number>;
        class?: Class;
        race?: Race;
        subrace?: string;
        skills?: string[];
        spells?: string[];
        custom?: string;
    };
    effects?: Array<{        // Optional effects
        type: 'stat_bonus' | 'skill_proficiency' | 'ability_unlock' | 'passive_modifier' | 'resource_grant' | 'spell_slot_bonus';
        target: string;
        value: number | string | boolean;
        condition?: string;
        description?: string;
    }>;
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;
}

// Racial trait extension (same as RacialTrait type)
interface RacialTraitExtension {
    id: string;              // Unique trait ID (lowercase_with_underscores)
    name: string;            // Display name
    description: string;     // Trait description
    race: Race;              // Race this trait belongs to
    subrace?: string;        // Optional subrace
    prerequisites?: {        // Optional prerequisites (same format as features)
        level?: number;
        features?: string[];
        abilities?: Record<Ability, number>;
        class?: Class;
        race?: Race;
        subrace?: string;
        skills?: string[];
        spells?: string[];
        custom?: string;
    };
    effects?: Array<{        // Optional effects (same format as features)
        type: 'stat_bonus' | 'skill_proficiency' | 'ability_unlock' | 'passive_modifier' | 'resource_grant' | 'spell_slot_bonus';
        target: string;
        value: number | string | boolean;
        condition?: string;
        description?: string;
    }>;
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;
}

// Skill extension (same as CustomSkill type)
interface SkillExtension {
    id: string;              // Unique skill ID (lowercase_with_underscores)
    name: string;            // Display name
    ability: Ability;        // STR, DEX, CON, INT, WIS, or CHA
    description?: string;
    armorPenalty?: boolean;
    customProperties?: Record<string, string | number | boolean | string[]>;
    categories?: string[];
    prerequisites?: {        // Optional prerequisites
        level?: number;
        abilities?: Record<Ability, number>;
        class?: Class;
        race?: Race;
        subrace?: string;
        features?: string[];
        skills?: string[];
        spells?: string[];
        custom?: string;
    };
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;
}

// Skill list extension
interface SkillListExtension {
    class: string;           // Class name
    skillCount: number;      // Number of skills to select
    availableSkills: string[];  // Array of skill IDs
    selectionWeights?: {     // Optional selection weights
        weights: Record<string, number>;
        mode?: 'relative' | 'absolute' | 'default';
    };
    hasExpertise?: boolean;
    expertiseCount?: number;
}

// Character generator extensions
interface CharacterGeneratorExtensions {
    spells?: SpellExtension[];
    equipment?: EquipmentExtension[];
    races?: string[];
    classes?: string[];
    appearance?: {
        bodyTypes?: string[];
        skinTones?: string[];
        hairColors?: string[];
        hairStyles?: string[];
        eyeColors?: string[];
        facialFeatures?: string[];
    };
    classFeatures?: ClassFeatureExtension[];
    racialTraits?: RacialTraitExtension[];
    skills?: SkillExtension[];
    skillLists?: SkillListExtension[];
}
```

### All Categories

The complete list of extensible categories in the system:

```typescript
type ExtensionCategory =
    // Equipment System
    | 'equipment'                      // Weapons, armor, items
    | 'equipment.properties'           // Equipment property templates (enchantments, curses)
    | 'equipment.modifications'        // Modification templates (upgrades, enchantments)
    | 'equipment.templates'            // Complete equipment templates

    // Appearance Options
    | 'appearance.bodyTypes'           // Character body shapes
    | 'appearance.skinTones'           // Skin color options
    | 'appearance.hairColors'          // Hair color options
    | 'appearance.hairStyles'          // Hair style options
    | 'appearance.eyeColors'           // Eye color options
    | 'appearance.facialFeatures'      // Facial features

    // Spells
    | 'spells'                         // All spells (default + custom)
    | `spells.${string}`               // Class-specific spells

    // Races
    | 'races'                          // Race names (uses Race enum)
    | 'races.data'                     // Race data (ability bonuses, speed, traits, subraces)

    // Classes
    | 'classes'                        // Class names (uses Class enum)
    | 'classes.data'                   // Class data (hit die, saves, skills, etc.)

    // Class Features
    | 'classFeatures'                  // All class features
    | 'classFeatures.Barbarian'
    | 'classFeatures.Bard'
    | 'classFeatures.Cleric'
    | 'classFeatures.Druid'
    | 'classFeatures.Fighter'
    | 'classFeatures.Monk'
    | 'classFeatures.Paladin'
    | 'classFeatures.Ranger'
    | 'classFeatures.Rogue'
    | 'classFeatures.Sorcerer'
    | 'classFeatures.Warlock'
    | 'classFeatures.Wizard'
    | `classFeatures.${string}`        // For custom class features

    // Racial Traits
    | 'racialTraits'                   // All racial traits
    | 'racialTraits.Human'
    | 'racialTraits.Elf'
    | 'racialTraits.Dwarf'
    | 'racialTraits.Halfling'
    | 'racialTraits.Dragonborn'
    | 'racialTraits.Gnome'
    | 'racialTraits.Half-Elf'
    | 'racialTraits.Half-Orc'
    | 'racialTraits.Tiefling'

    // Skills
    | 'skills'                         // All skills (default + custom)
    | 'skills.STR'                     // Strength-based skills
    | 'skills.DEX'                     // Dexterity-based skills
    | 'skills.CON'                     // Constitution-based skills
    | 'skills.INT'                     // Intelligence-based skills
    | 'skills.WIS'                     // Wisdom-based skills
    | 'skills.CHA'                     // Charisma-based skills

    // Skill Lists
    | 'skillLists'                     // All skill lists
    | 'skillLists.Barbarian'
    | 'skillLists.Bard'
    | 'skillLists.Cleric'
    | 'skillLists.Druid'
    | 'skillLists.Fighter'
    | 'skillLists.Monk'
    | 'skillLists.Paladin'
    | 'skillLists.Ranger'
    | 'skillLists.Rogue'
    | 'skillLists.Sorcerer'
    | 'skillLists.Warlock'
    | 'skillLists.Wizard'
    | `skillLists.${string}`           // For custom class skill lists

    // Class Spell Lists
    | 'classSpellLists'                // All class spell lists
    | `classSpellLists.${string}`      // Class-specific spell lists

    // Class Spell Slots
    | 'classSpellSlots'                // Spell slot progressions

    // Class Starting Equipment
    | 'classStartingEquipment'         // All class starting equipment
    | `classStartingEquipment.${string}`;  // Class-specific starting equipment
```

**Quick Reference by Category:**

| Category | Description |
|----------|-------------|
| **Equipment** | `equipment`, `equipment.properties`, `equipment.modifications`, `equipment.templates` |
| **Appearance** | `appearance.bodyTypes`, `appearance.skinTones`, `appearance.hairColors`, `appearance.hairStyles`, `appearance.eyeColors`, `appearance.facialFeatures` |
| **Spells** | `spells`, `spells.${className}` |
| **Races** | `races`, `races.data` |
| **Classes** | `classes`, `classes.data` |
| **Features** | `classFeatures`, `classFeatures.${className}`, `racialTraits`, `racialTraits.${raceName}` |
| **Skills** | `skills`, `skills.${ability}`, `skillLists`, `skillLists.${className}` |
| **Class Magic** | `classSpellLists`, `classSpellLists.${className}`, `classSpellSlots` |
| **Class Gear** | `classStartingEquipment`, `classStartingEquipment.${className}` |

### Helper Functions

The engine provides several helper functions for working with custom content:

#### `getClassData(className)`

Get class data for default or custom classes:

```typescript
import { getClassData } from 'playlist-data-engine';

// Get default class data
const wizardData = getClassData('Wizard');
console.log(wizardData.hit_die); // 6

// Get custom class data (if registered via ExtensionManager)
const necromancerData = getClassData('Necromancer');
if (necromancerData) {
    console.log(necromancerData.baseClass); // 'Wizard'
    console.log(necromancerData.primary_ability); // 'INT'
}
```

For template-based custom classes (those with a `baseClass` property), the system merges properties:
- Base class properties are spread first
- Custom properties override base properties
- `available_skills` is completely replaced (not merged)

#### `getRaceData(raceName)`

Get race data for default or custom races:

```typescript
import { getRaceData } from 'playlist-data-engine';

// Get default race data
const elfData = getRaceData('Elf');
console.log(elfData.speed); // 30

// Get custom race data (if registered via ExtensionManager)
const dragonkinData = getRaceData('Dragonkin');
if (dragonkinData) {
    console.log(dragonkinData.ability_bonuses);
    // { STR: 2, CON: 1, CHA: 1 }
}
```

#### `getClassSpellList(className)`

Get spell list for a class (default or custom):

```typescript
import { getClassSpellList } from 'playlist-data-engine';

const spellList = getClassSpellList('Necromancer');
// Returns: { cantrips: [...], spells_by_level: { 1: [...], 2: [...] } }
```

#### `getSpellSlotsForClass(className, characterLevel)`

Get spell slots for a class at a specific level:

```typescript
import { getSpellSlotsForClass } from 'playlist-data-engine';

const slots = getSpellSlotsForClass('Necromancer', 5);
// Returns: { 1: 4, 2: 3, 3: 2 }
```

#### `getClassStartingEquipment(className)`

Get starting equipment for a class:

```typescript
import { getClassStartingEquipment } from 'playlist-data-engine';

const equipment = getClassStartingEquipment('Necromancer');
// Returns: { weapons: [...], armor: [...], items: [...] }
```

---

## Support

For more information, see:
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migration guide for breaking changes
- [tests/integration/customGeneration.integration.test.ts](tests/integration/customGeneration.integration.test.ts) - Integration test examples



