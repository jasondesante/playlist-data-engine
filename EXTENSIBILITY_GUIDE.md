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
| `equipment` | Weapons, armor, items | Custom weapons, magic items |
| `spells` | Arcane and divine magic | Custom spells for spellcasting classes |
| `races` | Character races | Custom races (uses Race enum) |
| `classes` | Character classes | Custom classes (uses Class enum) |
| `appearance.bodyTypes` | Character body shapes | 'giant', 'diminutive', etc. |
| `appearance.skinTones` | Skin color options | Hex colors for skin tones |
| `appearance.hairColors` | Hair color options | Hex colors for hair |
| `appearance.hairStyles` | Hair style options | 'braided', 'mohawk', etc. |
| `appearance.eyeColors` | Eye color options | Hex colors for eyes |
| `appearance.facialFeatures` | Facial features | 'scar', 'tattoo', etc. |

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

### Weight Values

| Value | Effect |
|-------|--------|
| `0` | Never spawns |
| `0.5` | Half as common as default |
| `1.0` | Default spawn rate |
| `2.0` | Twice as common as default |
| `10.0` | Very common |

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

### Classes

Add custom classes:

```typescript
const manager = ExtensionManager.getInstance();

// Register custom class names
manager.register('classes', ['Necromancer', 'Battlemage', 'Shadowdancer']);

// Set spawn rates
manager.setWeights('classes', {
    'Necromancer': 0.2,    // Very rare
    'Battlemage': 0.5,     // Uncommon
    'Fighter': 1.5         // Common
});

const character = CharacterGenerator.generate(
    'my-seed',
    audioProfile,
    'Hero Name'
);
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

## Reference

### Type Definitions

```typescript
// Extension options
interface ExtensionOptions {
    mode?: 'relative' | 'absolute' | 'default';
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
}
```

### All Categories

```typescript
type ExtensionCategory =
    | 'equipment'
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | 'races'
    | 'classes'
    | `spells.${string}`;  // Class-specific spells
```

---

## Support

For more information, see:
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Migration guide for breaking changes
- [tests/integration/customGeneration.integration.test.ts](tests/integration/customGeneration.integration.test.ts) - Integration test examples
