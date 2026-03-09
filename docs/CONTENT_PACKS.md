# Content Packs Guide

This guide explains how to create and manage content packs for the Playlist Data Engine. A content pack is a collection of custom content for multiple categories that can be loaded at runtime, saved to files, and restored later.

---

## Table of Contents

1. [Examples](#examples)
   - [Basic Content Pack](#basic-content-pack)
   - [Themed Content Pack](#themed-content-pack)
   - [Complete Expansion Pack](#complete-expansion-pack)
   - [Advanced: Prerequisites and Subraces](#advanced-prerequisites-and-subraces)
2. [Saving and Loading Content Packs](#saving-and-loading-content-packs)
   - [Save & Load Workflow](#save--load-workflow)
   - [Debugging with Export](#debugging-with-export)
   - [Batch Image Methods](#batch-image-methods)

---

## Examples

### Basic Content Pack

A simple content pack with equipment, spells, races, and appearance options:

```typescript
// my-content-pack.ts
import { ExtensionManager } from 'playlist-data-engine';

export function loadContentPack() {
    const manager = ExtensionManager.getInstance();

    // Custom equipment with spawn weights
    manager.register('equipment', [
        { name: 'Dragon Scale Armor', type: 'armor', rarity: 'very_rare', weight: 15, icon: '/icons/armor/dragon-scale.png' },
        { name: 'Flame Tongue', type: 'weapon', rarity: 'rare', weight: 3, icon: '/icons/weapons/flame-tongue.png' }
    ], {
        weights: {
            'Dragon Scale Armor': 0.3,
            'Flame Tongue': 0.5
        }
    });

    // Custom spells
    manager.register('spells', [
        { name: 'Dragon Breath', level: 3, school: 'Evocation', icon: '/icons/spells/dragon-breath.png' },
        { name: 'Scale Hardening', level: 2, school: 'Transmutation', icon: '/icons/spells/scale-hardening.png' }
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

---

### Themed Content Pack

A dark fantasy themed pack using `absolute` mode to exclude default items:

```typescript
// dark-fantasy-pack.ts
export function loadDarkFantasyPack() {
    const manager = ExtensionManager.getInstance();

    // Dark fantasy equipment - ONLY these items spawn
    manager.register('equipment', [
        { name: 'Soul Reaver', type: 'weapon', rarity: 'legendary', weight: 4, icon: '/icons/weapons/soul-reaver.png' },
        { name: 'Shadow Cloak', type: 'armor', rarity: 'very_rare', weight: 5, icon: '/icons/armor/shadow-cloak.png' },
        { name: 'Blood Chalice', type: 'item', rarity: 'rare', weight: 2, icon: '/icons/items/blood-chalice.png' }
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
        { name: 'Soul Drain', level: 4, school: 'Necromancy', icon: '/icons/spells/soul-drain.png' },
        { name: 'Shadow Step', level: 2, school: 'Conjuration', icon: '/icons/spells/shadow-step.png' },
        { name: 'Death Coil', level: 3, school: 'Necromancy', icon: '/icons/spells/death-coil.png' }
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

### Complete Expansion Pack

A comprehensive "Arctic Expansion Pack" with custom features, skills, and spawn rates:

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
        source: 'custom',
        icon: '/icons/features/frost-rage.png'
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
        source: 'custom',
        icon: '/icons/features/snow-walker.png'
    };

    // ===== CUSTOM SKILLS =====
    const coldSurvival = {
        id: 'survival_cold',
        name: 'Survival (Cold Environments)',
        description: 'Expertise in cold weather survival.',
        ability: 'WIS',
        armorPenalty: true,
        categories: ['exploration', 'environmental'],
        source: 'custom',
        icon: '/icons/skills/cold-survival.png'
    };

    const iceFishing = {
        id: 'ice_fishing',
        name: 'Ice Fishing',
        description: 'Ability to catch fish in frozen waters.',
        ability: 'WIS',
        armorPenalty: false,
        categories: ['exploration', 'survival'],
        source: 'custom',
        icon: '/icons/skills/ice-fishing.png'
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

    // Skills
    manager.register('skills', [coldSurvival, iceFishing]);
    manager.register('skills.WIS', [coldSurvival, iceFishing], {
        weights: {
            'survival_cold': 0.5,
            'ice_fishing': 0.3      // Quite rare
        }
    });

    // ===== SPAWN RATE CONFIGURATION =====
    manager.setWeights('skillLists.Ranger', {
        'survival_cold': 2.0,  // Rangers love this skill
        'ice_fishing': 1.5
    });

    manager.setWeights('skillLists.Barbarian', {
        'survival_cold': 1.5,
        'ice_fishing': 0.5
    });

    console.log('Arctic Expansion Pack registered!');
}

// Register the expansion pack
registerArcticExpansionPack();

// Generate characters with the new content
const character = CharacterGenerator.generate(seed, audio, track, {forceName: 'Arctic Hero'});
// Character may now have frost_rage, snow_walker, or survival_cold skill!
```

---

### Advanced: Prerequisites and Subraces

A complete content pack demonstrating advanced patterns: custom races with subraces, racial traits, and prerequisites for skills/spells:

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// 1. Register a custom race with subraces
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin'],
    icon: '/icons/races/dragonkin.png'
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
    source: 'custom',
    icon: '/icons/traits/fire-resistance.png'
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
    source: 'custom',
    icon: '/icons/skills/dragon-smithing.png'
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
    },
    icon: '/icons/spells/dragon-breath.png'
}]);
```

---

## Saving and Loading Content Packs

The `ExtensionManager` provides methods to export and import custom data, allowing you to save and restore content packs.

### Save & Load Workflow

Complete workflow for saving content packs to file and loading them later:

```typescript
import { readFileSync, writeFileSync } from 'fs';
import { ExtensionManager, type ContentPackData } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== SAVING =====
// Register some custom content
manager.register('equipment', [
    { name: 'Dragon Sword', type: 'weapon', rarity: 'rare', weight: 5, icon: '/icons/weapons/dragon-sword.png' }
], {
    weights: { 'Dragon Sword': 0.5 }
});

// Export all custom data
const customData: ContentPackData = manager.exportCustomData();

// Output structure:
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

// Save to file
writeFileSync('./my-content-pack.json', JSON.stringify(customData, null, 2));


// ===== LOADING =====
// Load from file
const savedData: ContentPackData = JSON.parse(readFileSync('./my-content-pack.json', 'utf-8'));

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

---

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

### Batch Image Methods

Use batch methods to efficiently add icons and images to all items in a content pack:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register content first (without icons)
manager.register('equipment', [
    { name: 'Dragon Scale Armor', type: 'armor', rarity: 'very_rare', weight: 15 },
    { name: 'Flame Tongue', type: 'weapon', rarity: 'rare', weight: 3 },
    { name: 'Dragon Shield', type: 'shield', rarity: 'rare', weight: 5 }
]);

// Add icons to specific items by name
manager.batchAddIcons('equipment', {
    'Dragon Scale Armor': '/icons/armor/dragon-scale.png',
    'Flame Tongue': '/icons/weapons/flame-tongue.png',
    'Dragon Shield': '/icons/shields/dragon-shield.png'
});

// Add larger images (portraits, cards, etc.)
manager.batchAddImages('equipment', {
    'Dragon Scale Armor': '/images/equipment/dragon-scale-armor.png'
});

// Add same icon to items matching a predicate
manager.batchUpdateImages('spells',
    spell => spell.level === 0,  // All cantrips
    { icon: '/icons/spells/cantrip-icon.png' }
);

// Add icons based on a property value (by category)
manager.batchByCategory('spells', 'school', {
    'Evocation': '/icons/schools/fire.png',
    'Necromancy': '/icons/schools/skull.png',
    'Abjuration': '/icons/schools/shield.png'
    // Also supports: Conjuration, Divination, Enchantment, Illusion, Transmutation
});

// Also works for equipment rarity
manager.batchByCategory('equipment', 'rarity', {
    'legendary': '/icons/rarity/star-gold.png',
    'very_rare': '/icons/rarity/star-purple.png',
    'rare': '/icons/rarity/star-blue.png'
    // Also supports: uncommon, common
});
```

---

For more information on extensibility, see [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md).
