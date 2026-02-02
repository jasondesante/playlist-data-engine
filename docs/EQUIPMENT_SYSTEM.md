# Equipment System Documentation

Complete reference for the Playlist Data Engine's Advanced Equipment System.

## Table of Contents

1. [Overview](#overview)
2. [Equipment Properties](#equipment-properties)
3. [Equipment Effects](#equipment-effects)
4. [Enhanced Equipment](#enhanced-equipment)
5. [Equipment-Granted Features](#equipment-granted-features)
6. [Equipment-Granted Skills](#equipment-granted-skills)
7. [Equipment Modification](#equipment-modification)
8. [Templates vs Instances](#templates-vs-instances)
9. [Spawn Weights](#spawn-weights)
10. [Custom Equipment](#custom-equipment)
11. [API Reference](#api-reference)
12. [Examples](#examples)

---

## Quick Start

Get up and running with the equipment system in 5 minutes.

### 1. Register Custom Equipment

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const flamingSword = {
    name: 'Flaming Sword',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    properties: [{
        type: 'damage_bonus',
        target: 'fire',
        value: '1d6',
        description: '+1d6 fire damage'
    }]
};

const manager = ExtensionManager.getInstance();
manager.register('equipment', [flamingSword]);
```

### 2. Spawn Equipment

```typescript
import { EquipmentSpawnHelper, SeededRNG } from 'playlist-data-engine';

const rng = new SeededRNG('loot_seed');

// Spawn by name
const item = EquipmentSpawnHelper.spawnFromList(['Flaming Sword']);

// Spawn by rarity
const rareItems = EquipmentSpawnHelper.spawnByRarity('rare', 3, rng);

// Spawn random (respects spawn weights)
const loot = EquipmentSpawnHelper.spawnRandom(5, rng, { excludeZeroWeight: true });
```

### 3. Apply Equipment Effects

```typescript
import { EquipmentEffectApplier } from 'playlist-data-engine';

// Equip item and apply effects
const result = EquipmentEffectApplier.equipItem(character, equipment, 'instance_123');

// Unequip and remove effects
EquipmentEffectApplier.unequipItem(character, 'Flaming Sword', 'instance_123');
```

**Next Steps**: See [Equipment Properties](#equipment-properties) for all property types, [API Reference](#api-reference) for complete class documentation.

---

## Overview

The Advanced Equipment System transforms the basic equipment database into a comprehensive item system supporting:

- **Equipment Properties**: Stat bonuses, skill proficiencies, ability unlocks, passive modifiers, special properties, damage bonuses, spell grants
- **Equipment-Granted Features**: Items can provide unique features or reference existing registry features
- **D&D 5e Standard Stats**: All existing equipment populated with default damage dice, AC, and properties
- **Custom Equipment Support**: ExtensionManager integration for custom equipment with full property support
- **Runtime Equipment Modification**: Template-based items (Flaming Sword) + per-instance enchanting/upgrading
- **Helper Functions**: Batch equipment spawning utilities

### Design Principles

- **Backward Compatible**: Existing characters and equipment continue to work
- **Weight-Based Spawning**: Features have spawn weights (0 = never random, still available to game logic)
- **Template + Instance**: Support both equipment templates AND per-item unique modifications
- **D&D 5e Aligned**: Default equipment uses standard 5e stats
- **Feature-Aligned**: Follows existing FeatureEffect pattern from Phase 11
- **Data Structure Focus**: Provides structures, not full gameplay systems

### System Architecture

```
ExtensionManager
    | equipment (default + custom items)
    | equipment.templates (template definitions)
    |
    v
EquipmentValidator
    | Validates all equipment data
    |
    v
EquipmentEffectApplier
    | Applies/removes equipment effects
    |
    v
CharacterSheet
    | equipment_effects[] (tracks active effects)
```

---

## Equipment Properties

Equipment properties define how items affect gameplay. Each property has a type, target, value, optional condition, and optional description.

### Property Types

| Type | Description | Target Examples | Value Type |
|------|-------------|-----------------|------------|
| `stat_bonus` | Increases ability score | `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA` | number |
| `skill_proficiency` | Grants skill proficiency/expertise | `stealth`, `perception`, etc. | `proficient` / `expertise` |
| `ability_unlock` | Unlocks special abilities | `darkvision`, `flight`, etc. | boolean/number |
| `passive_modifier` | Modifies passive values | `ac`, `speed`, `max_hp`, `saving_throws`, etc. | number |
| `special_property` | Game-specific properties | `finesse`, `versatile`, `stealth_disadvantage` | boolean/string/number |
| `damage_bonus` | Adds extra damage | `fire`, `cold`, `lightning` | dice string / number |
| `stat_requirement` | Minimum stat required to use | `STR`, `DEX` | number |

### Property Conditions

Conditions control when properties apply:

| Condition Type | Value Format | Description |
|----------------|--------------|-------------|
| `vs_creature_type` | string | Property applies vs specific creature (e.g., `dragon`) |
| `at_time_of_day` | `day`/`night`/`dawn`/`dusk` | Property applies at specific time |
| `wielder_race` | string | Property applies only to specific race |
| `wielder_class` | string | Property applies only to specific class |
| `while_equipped` | boolean | Always true when equipped (default) |
| `on_hit` | boolean | Triggers when weapon hits |
| `on_damage_taken` | boolean | Triggers when wearer takes damage |
| `custom` | string + description | Game-defined condition |

### Property Interface

```typescript
interface EquipmentProperty {
    type: EquipmentPropertyType;
    target: string;
    value: number | string | boolean;
    condition?: EquipmentCondition;
    description?: string;
    stackable?: boolean;  // Default: true
}
```

### Property Examples

```typescript
// Stat Bonus
{
    type: 'stat_bonus',
    target: 'STR',
    value: 2,
    description: '+2 Strength'
}

// Skill Proficiency
{
    type: 'skill_proficiency',
    target: 'stealth',
    value: 'expertise',
    description: 'Stealth expertise'
}

// Conditional Damage
{
    type: 'damage_bonus',
    target: 'fire',
    value: '2d6',
    description: '+2d6 fire damage',
    condition: { type: 'vs_creature_type', value: 'troll' }
}

// Passive Modifier
{
    type: 'passive_modifier',
    target: 'ac',
    value: 2,
    description: '+2 AC',
    stackable: true
}
```

---

## Equipment Effects

Equipment effects are applied when items are equipped and removed when unequipped. The `EquipmentEffectApplier` class handles all effect management.

### Stacking Behavior

**All equipment effects stack by default.** Multiple items with the same effect will combine:
- Two +1 STR items = +2 STR total
- Two +1 AC items = +2 AC total
- Stackable can be set to false for non-stacking effects

### Effect Application Flow

```
Equip Item
    |
    v
EquipmentEffectApplier.equipItem()
    |
    +--> Apply properties (stat bonuses, skills, etc.)
    +--> Apply granted features
    +--> Apply granted skills
    +--> Apply granted spells
    |
    v
Store in character.equipment_effects[]
```

### Effect Removal Flow

```
Unequip Item
    |
    v
EquipmentEffectApplier.unequipItem()
    |
    +--> Remove properties (reverse stat changes, etc.)
    +--> Remove granted features
    +--> Remove granted skills
    +--> Remove granted spells
    |
    v
Remove from character.equipment_effects[]
```

### Character Equipment Effects Structure

```typescript
interface CharacterSheet {
    equipment_effects?: {
        source: string;              // Equipment name
        instanceId?: string;         // For per-instance tracking
        effects: EquipmentProperty[]; // Properties from this item
        features: EquipmentFeature[]; // Features granted by this item
        skills: EquipmentSkill[];    // Skills granted by this item
        spells?: Array<{             // Spells granted by this item
            spellId: string;
            level?: number;
            uses?: number;
            recharge?: string;
        }>;
    }[];
}
```

---

## Enhanced Equipment

The `EnhancedEquipment` interface extends the base equipment with advanced capabilities.

### EnhancedEquipment Interface

```typescript
interface EnhancedEquipment {
    // Base Properties
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;

    // Advanced Properties
    properties?: EquipmentProperty[];

    // Features granted when equipped
    // Can reference existing FeatureRegistry features OR define inline mini-features
    grantsFeatures?: Array<string | EquipmentMiniFeature>;

    // Skills granted when equipped
    grantsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;

    // Spells granted when equipped
    grantsSpells?: Array<{
        spellId: string;
        level?: number;
        uses?: number;
        recharge?: string;
    }>;

    // D&D 5e Stats
    damage?: {
        dice: string;          // e.g., "1d8", "2d6"
        damageType: string;    // e.g., "slashing", "fire"
        versatile?: string;    // e.g., "1d10" if used two-handed
    };
    acBonus?: number;
    weaponProperties?: string[];  // e.g., ["finesse", "versatile", "two-handed"]

    // Spawn weight (0 = never random, still available to game logic)
    spawnWeight?: number;

    // Template support (for items like "Flaming Sword")
    templateId?: string;

    // Source tracking
    source?: 'default' | 'custom';

    tags?: string[];
}
```

### Rarity Levels

| Rarity | Spawn Weight (Typical) | Examples |
|--------|----------------------|----------|
| common | 1.0 | Longsword, Leather Armor |
| uncommon | 0.5 | Light Crossbow, Hand Crossbow |
| rare | 0.2 | Flame Tongue, Frost Brand |
| very_rare | 0.1 | Dragonslayer Weapon |
| legendary | 0.0 | Vorpal Sword (game-only) |

---

## Equipment-Granted Features

Equipment can grant features in two ways:

### 1. Registry Feature References

String references to features in the FeatureRegistry:

```typescript
{
    name: 'Ring of Free Action',
    type: 'item',
    rarity: 'rare',
    weight: 0.1,
    grantsFeatures: ['freedom_of_movement'],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'ring', 'movement']
}
```

### 2. Inline Mini-Features

Equipment-specific features defined inline:

```typescript
interface EquipmentMiniFeature {
    id: string;                  // Unique ID for this feature
    name: string;
    description: string;
    effects: EquipmentProperty[]; // What this feature does
    source: 'equipment_inline';   // Marks as equipment-specific
}
```

Example:

```typescript
{
    name: 'Boots of Speed',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    grantsFeatures: [
        {
            id: 'boots_of_speed_haste',
            name: 'Haste',
            description: 'While wearing these boots, you can use a bonus action to click them together. On your turn, you can increase your speed by 20 feet until the end of your turn.',
            effects: [
                {
                    type: 'passive_modifier',
                    target: 'speed',
                    value: 20,
                    description: '+20 speed'
                }
            ],
            source: 'equipment_inline'
        }
    ],
    spawnWeight: 0.15,
    source: 'custom',
    tags: ['magic', 'boots', 'speed']
}
```

---

## Equipment-Granted Skills

Equipment can grant skill proficiencies or expertise:

```typescript
{
    name: 'Thieves\' Tools',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    grantsSkills: [
        { skillId: 'thieves_tools', level: 'proficient' }
    ],
    spawnWeight: 1.0,
    source: 'default',
    tags: ['gear', 'tools', 'dexterity']
}
```

### Skill Proficiency Hierarchy

When equipment grants a skill proficiency:
- `none` < `proficient` < `expertise`
- Equipment always upgrades to at least the granted level
- Expertise overrides any lower level
- Multiple sources are tracked separately

---

## Equipment Modification

The `EquipmentModifier` class handles runtime equipment modifications including enchanting, cursing, and upgrading.

### Modification Types

| Type | Description | Source |
|------|-------------|--------|
| Enchantment | Adds positive properties | `enchantment` |
| Curse | Adds negative properties | `curse` |
| Upgrade | Improves existing properties | `upgrade` |
| Template | Applies template definition | `template` |

### EquipmentModification Interface

```typescript
interface EquipmentModification {
    id: string;
    name: string;
    properties: EquipmentProperty[];
    addsFeatures?: Array<string | EquipmentMiniFeature>;
    addsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;
    addsSpells?: Array<{
        spellId: string;
        level?: number;
        uses?: number;
        recharge?: string;
    }>;
    appliedAt: string;
    source: string;
}
```

### Modification Methods

```typescript
// Enchant equipment (adds positive effects)
EquipmentModifier.enchant(
    equipment,
    'Longsword',
    enchantment,
    character
);

// Apply template
EquipmentModifier.applyTemplate(
    equipment,
    'Longsword',
    'flaming_weapon_template',
    character
);

// Curse equipment (adds negative effects)
EquipmentModifier.curse(
    equipment,
    'Ring',
    curse,
    character
);

// Upgrade equipment (improve properties)
EquipmentModifier.upgrade(
    equipment,
    'Armor',
    upgrade,
    character
);

// Remove specific modification
EquipmentModifier.removeModification(
    equipment,
    'Sword',
    'mod_12345',
    character
);

// Remove all enchantments (keep curses)
EquipmentModifier.disenchant(equipment, 'Sword', character);

// Remove all curses (keep enchantments)
EquipmentModifier.liftCurse(equipment, 'Ring', character);
```

---

## Templates vs Instances

The system supports both template-based and per-instance modifications.

### Template-Based Items

Templates define reusable enchantment patterns:

```typescript
// Define template
const flamingWeaponTemplate = {
    id: 'flaming_weapon_template',
    name: 'Flaming Weapon',
    properties: [
        {
            type: 'damage_bonus',
            target: 'fire',
            value: '1d6',
            description: '+1d6 fire damage'
        }
    ]
};

// Apply template to any weapon
const flamingSword = EquipmentModifier.applyTemplate(
    equipment,
    'Longsword',
    'flaming_weapon_template',
    character
);
```

### Per-Instance Modifications

Each item can have unique modifications:

```typescript
// Enchant a specific sword instance
const swordInstance = {
    name: 'Longsword',
    instanceId: 'sword_12345',
    modifications: []
};

const enchantment: EquipmentModification = {
    id: 'enchant_001',
    name: '+1 Longsword',
    properties: [
        { type: 'passive_modifier', target: 'attack_roll', value: 1 }
    ],
    appliedAt: new Date().toISOString(),
    source: 'enchantment'
};

EquipmentModifier.enchant(equipment, 'Longsword', enchantment, character);
```

### Combined Effects

Final effects are the combination of:
1. Base equipment properties
2. Template properties
3. Per-instance modifications

```typescript
// Get all effects from an item
const allEffects = EquipmentModifier.getCombinedEffects(
    equipment,
    'Longsword',
    'sword_12345'
);
```

---

## Spawn Weights

Spawn weights control item generation in random loot.

### Weight System

- **Weight > 0**: Item can spawn randomly (higher = more common)
- **Weight = 0**: Item never spawns randomly, but can be used by game logic
- **Default weight**: 1.0 for most items

### Examples

```typescript
// Common item - spawns frequently
{
    name: 'Longsword',
    spawnWeight: 1.0,
    // ...
}

// Rare item - spawns occasionally
{
    name: 'Flame Tongue',
    spawnWeight: 0.1,
    // ...
}

// Unique artifact - never spawns randomly
{
    name: 'Vorpal Sword',
    spawnWeight: 0,
    // ...
}
```

### Spawning with Weights

```typescript
// Spawn random items (respects weights)
const items = EquipmentSpawnHelper.spawnRandom(
    3,
    rng,
    { excludeZeroWeight: true }
);

// Spawn by rarity
const rareItems = EquipmentSpawnHelper.spawnByRarity('rare', 2, rng);
```

---

## Custom Equipment

Custom equipment is registered through the ExtensionManager.

### Registration Example

```typescript
import { ExtensionManager } from './src/core/extensions/ExtensionManager.js';
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// Define custom item
const customSword: EnhancedEquipment = {
    name: 'Blade of the Ages',
    type: 'weapon',
    rarity: 'very_rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    properties: [
        {
            type: 'stat_bonus',
            target: 'WIS',
            value: 2,
            description: '+2 Wisdom'
        },
        {
            type: 'damage_bonus',
            target: 'radiant',
            value: '2d6',
            description: '+2d6 radiant damage'
        }
    ],
    grantsFeatures: ['sunlight_sensitivity'],
    spawnWeight: 0.05,
    source: 'custom',
    tags: ['magic', 'radiant', 'wisdom']
};

// Register with ExtensionManager
const manager = ExtensionManager.getInstance();
manager.register('equipment', [customSword], {
    mode: 'relative',
    weights: { 'Blade of the Ages': 0.5 },
    validate: true
});
```

### Validation

All custom equipment is automatically validated:

```typescript
import { EquipmentValidator } from './src/core/equipment/EquipmentValidator.js';

const validation = EquipmentValidator.validateEquipment(customSword);
if (!validation.valid) {
    console.error('Invalid equipment:', validation.errors);
}
```

---

## API Reference

### EquipmentEffectApplier

Applies and removes equipment effects.

```typescript
class EquipmentEffectApplier {
    // Apply all effects from equipping an item
    static equipItem(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId?: string
    ): EffectApplicationResult;

    // Remove all effects from unequipping an item
    static unequipItem(
        character: CharacterSheet,
        equipmentName: string,
        instanceId?: string
    ): EffectApplicationResult;

    // Re-apply all equipment effects (for updates/level-ups)
    static reapplyEquipmentEffects(
        character: CharacterSheet
    ): EffectApplicationResult;

    // Get all active equipment effects
    static getActiveEffects(
        character: CharacterSheet
    ): EquipmentProperty[];
}
```

### EquipmentValidator

Validates equipment data structures.

```typescript
class EquipmentValidator {
    // Validate a complete equipment object
    static validateEquipment(
        equipment: EnhancedEquipment
    ): EquipmentValidationResult;

    // Validate a single equipment property
    static validateProperty(
        property: EquipmentProperty
    ): EquipmentValidationResult;

    // Validate feature reference
    static validateEquipmentFeatureReference(
        featureId: string
    ): boolean;

    // Validate skill reference
    static validateEquipmentSkillReference(
        skillId: string
    ): boolean;

    // Validate damage info
    static validateDamageInfo(
        damage: EnhancedEquipment['damage']
    ): EquipmentValidationResult;

    // Validate spawn weight
    static validateSpawnWeight(
        weight: number
    ): EquipmentValidationResult;

    // Validate modification
    static validateModification(
        modification: EquipmentModification
    ): EquipmentValidationResult;
}
```

### EquipmentModifier

Handles equipment modification operations.

```typescript
class EquipmentModifier {
    // Enchant equipment with new properties
    static enchant(
        equipment: CharacterEquipment,
        itemName: string,
        enchantment: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Apply a template modification
    static applyTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Curse equipment with negative effects
    static curse(
        equipment: CharacterEquipment,
        itemName: string,
        curse: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Upgrade equipment
    static upgrade(
        equipment: CharacterEquipment,
        itemName: string,
        upgrade: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Remove a modification
    static removeModification(
        equipment: CharacterEquipment,
        itemName: string,
        modificationId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Get modification history
    static getModificationHistory(
        equipment: CharacterEquipment,
        itemName: string
    ): EquipmentModification[];

    // Get combined effects
    static getCombinedEffects(
        equipment: CharacterEquipment,
        itemName: string,
        instanceId?: string
    ): EquipmentProperty[];

    // Check for template
    static hasTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string
    ): boolean;

    // Check if item has any enchantments
    static isEnchanted(
        equipment: CharacterEquipment,
        itemName: string
    ): boolean;

    // Check if item has any curses
    static isCursed(
        equipment: CharacterEquipment,
        itemName: string
    ): boolean;

    // Get all templates applied to an item
    static getAppliedTemplates(
        equipment: CharacterEquipment,
        itemName: string
    ): string[];

    // Get all modification sources
    static getModificationSources(
        equipment: CharacterEquipment,
        itemName: string
    ): string[];

    // Count modifications by source
    static countModificationsBySource(
        equipment: CharacterEquipment,
        itemName: string
    ): Record<string, number>;

    // Get comprehensive item summary
    static getItemSummary(
        equipment: CharacterEquipment,
        itemName: string
    ): { name: string; modifications: EquipmentModification[]; isCursed: boolean; isEnchanted: boolean };

    // Remove all modifications
    static removeAllModifications(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Disenchant (remove enchantments, keep curses)
    static disenchant(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Lift curse (remove curses, keep enchantments)
    static liftCurse(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Factory methods
    static createModification(
        id: string,
        name: string,
        properties: EquipmentProperty[],
        source: string
    ): EquipmentModification;

    static generateModificationId(prefix?: string): string;
}
```

### EquipmentSpawnHelper

Batch spawning utilities for equipment.

```typescript
class EquipmentSpawnHelper {
    // Spawn items from list of names
    static spawnFromList(
        itemNames: string[],
        rng?: SeededRNG
    ): (EnhancedEquipment | undefined)[];

    // Spawn items by rarity
    static spawnByRarity(
        rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
        count: number,
        rng?: SeededRNG
    ): EnhancedEquipment[];

    // Spawn items by tags
    static spawnByTags(
        tags: string[],
        count: number,
        rng?: SeededRNG,
        options?: SpawnRandomOptions
    ): EnhancedEquipment[];

    // Spawn random equipment (respects weights)
    static spawnRandom(
        count: number,
        rng: SeededRNG,
        options?: SpawnRandomOptions
    ): EnhancedEquipment[];

    // Spawn from template
    static spawnFromTemplate(
        templateId: string,
        baseItemName?: string
    ): EnhancedEquipment | null;

    // Spawn treasure hoard
    static spawnTreasureHoard(
        cr: number,
        rng: SeededRNG
    ): TreasureHoardResult;

    // Add to character
    static addToCharacter(
        character: CharacterSheet,
        items: EnhancedEquipment[],
        equip?: boolean
    ): CharacterSheet;
}
```

### FeatureRegistry (Equipment-Related Methods)

The FeatureRegistry provides static methods for working with equipment-granted features.

```typescript
class FeatureRegistry {
    // Get features that can be granted by equipment
    // Returns features tagged with 'equipment' or 'item', or custom features
    static getEquipmentFeatures(equipmentName: string): ClassFeature[];

    // Check if a feature ID exists and can be granted by equipment
    // Features with spawnWeight: 0 are still valid for equipment use
    static isValidEquipmentFeature(featureId: string): boolean;

    // Register a feature specifically for equipment use
    // Automatically adds 'equipment' tag to the feature
    static registerEquipmentFeature(feature: ClassFeature): void;
}
```

**Note**: These methods are useful when creating custom equipment that grants features. Use `isValidEquipmentFeature()` to validate feature references in equipment definitions, and `registerEquipmentFeature()` to register features specifically designed for equipment items.

---

## Examples

### Example 1: Magic Weapon with Fire Damage

```typescript
import { ExtensionManager } from './src/core/extensions/ExtensionManager.js';
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

const flameTongue: EnhancedEquipment = {
    name: 'Flame Tongue',
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
        }
    ],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'fire', 'weapon']
};

const manager = ExtensionManager.getInstance();
manager.register('equipment', [flameTongue]);
```

### Example 2: Item That Grants Stats

```typescript
const beltOfGiantStrength: EnhancedEquipment = {
    name: 'Belt of Giant Strength',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    properties: [
        {
            type: 'stat_bonus',
            target: 'STR',
            value: 2,
            description: '+2 Strength (max 22)'
        }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'wondrous', 'strength']
};
```

### Example 3: Item That Grants AC

```typescript
const ringOfProtection: EnhancedEquipment = {
    name: 'Ring of Protection',
    type: 'item',
    rarity: 'rare',
    weight: 0.1,
    properties: [
        {
            type: 'passive_modifier',
            target: 'ac',
            value: 1,
            description: '+1 Armor Class',
            stackable: true
        },
        {
            type: 'passive_modifier',
            target: 'saving_throws',
            value: 1,
            description: '+1 to all saving throws',
            stackable: true
        }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'ring', 'defense']
};
```

### Example 4: Item That Grants Skills

```typescript
const bootsOfElvenkind: EnhancedEquipment = {
    name: 'Boots of Elvenkind',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    grantsSkills: [
        { skillId: 'stealth', level: 'expertise' }
    ],
    properties: [
        {
            type: 'passive_modifier',
            target: 'stealth_check',
            value: 1,
            description: '+1 to Stealth checks'
        }
    ],
    spawnWeight: 0.3,
    source: 'custom',
    tags: ['magic', 'boots', 'stealth']
};
```

### Example 5: Conditional Effects

```typescript
const dragonSlayingSword: EnhancedEquipment = {
    name: 'Dragonslayer Longsword',
    type: 'weapon',
    rarity: 'very_rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    properties: [
        {
            type: 'damage_bonus',
            target: 'dragon',
            value: '3d6',
            description: '+3d6 damage vs dragons',
            condition: { type: 'vs_creature_type', value: 'dragon' }
        }
    ],
    spawnWeight: 0.05,
    source: 'custom',
    tags: ['magic', 'weapon', 'dragon_slaying']
};
```

### Example 6: Enchanting Equipment

```typescript
import { EquipmentModifier } from './src/core/equipment/EquipmentModifier.js';

// Create enchantment
const enchantment = EquipmentModifier.createModification(
    'plus_one_001',
    '+1 Longsword',
    [
        {
            type: 'passive_modifier',
            target: 'attack_roll',
            value: 1,
            description: '+1 to attack rolls'
        }
    ],
    'enchantment'
);

// Apply to equipment
const updatedEquipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    enchantment,
    character
);
```

### Example 7: Batch Spawning

```typescript
import { EquipmentSpawnHelper } from './src/core/equipment/EquipmentSpawnHelper.js';
import { SeededRNG } from './src/utils/random.js';

// Spawn treasure hoard
const rng = new SeededRNG('dragon_hoard_123');
const hoard = EquipmentSpawnHelper.spawnTreasureHoard(15, rng);

console.log(`Generated ${hoard.items.length} items worth ~${hoard.totalValue} gp`);

// Add to character
character = EquipmentSpawnHelper.addToCharacter(character, hoard.items, false);
```

### Example 8: Template-Based Items

```typescript
// Register template
const flamingTemplate = {
    id: 'flaming_weapon',
    name: 'Flaming Weapon',
    properties: [
        {
            type: 'damage_bonus',
            target: 'fire',
            value: '1d6',
            description: '+1d6 fire damage'
        }
    ]
};

const manager = ExtensionManager.getInstance();
manager.register('equipment.templates', [flamingTemplate]);

// Apply to create Flaming Longsword
const flamingSword = EquipmentSpawnHelper.spawnFromTemplate(
    'flaming_weapon',
    'Longsword'
);
```

### Example 9: Equipment Properties (All Types)

```typescript
import type { EquipmentProperty } from './src/core/types/Equipment.js';

// ===== STAT BONUS =====
const beltOfStrength: EquipmentProperty = {
    type: 'stat_bonus',
    target: 'STR',
    value: 2,
    description: '+2 Strength (max 22)',
    stackable: true
};

// ===== SKILL PROFICIENCY =====
const bootsOfElvenkind: EquipmentProperty = {
    type: 'skill_proficiency',
    target: 'stealth',
    value: 'expertise',  // Can be 'proficient' or 'expertise'
    description: 'Stealth expertise'
};

// ===== ABILITY UNLOCK =====
const bootsOfFlying: EquipmentProperty = {
    type: 'ability_unlock',
    target: 'flight',
    value: true,
    description: 'Can fly at will'
};

// ===== PASSIVE MODIFIER =====
const ringOfProtection: EquipmentProperty = {
    type: 'passive_modifier',
    target: 'ac',
    value: 1,
    description: '+1 Armor Class',
    stackable: true  // Multiple rings stack
};

// ===== DAMAGE BONUS (CONDITIONAL) =====
const dragonSlayingSword: EquipmentProperty = {
    type: 'damage_bonus',
    target: 'dragon',
    value: '3d6',
    condition: { type: 'vs_creature_type', value: 'dragon' },
    description: '+3d6 damage vs dragons'
};

// ===== TIME-BASED CONDITION =====
const moonBlade: EquipmentProperty = {
    type: 'damage_bonus',
    target: 'radiant',
    value: '2d6',
    condition: { type: 'at_time_of_day', value: 'night' },
    description: '+2d6 radiant damage at night'
};

// ===== CLASS-SPECIFIC CONDITION =====
const holyAvenger: EquipmentProperty = {
    type: 'passive_modifier',
    target: 'saving_throws',
    value: 3,
    condition: { type: 'wielder_class', value: 'Paladin' },
    description: '+3 to saving throws (Paladin only)'
};
```

### Example 10: Items That Grant Features

```typescript
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// ===== Boots of Speed (Freedom of Movement) =====
const bootsOfSpeed: EnhancedEquipment = {
    name: 'Boots of Speed',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    properties: [
        {
            type: 'passive_modifier',
            target: 'speed',
            value: 10,
            description: '+10 walking speed'
        },
        {
            type: 'special_property',
            target: 'freedom_of_movement',
            value: true,
            description: 'Cannot be restrained or grappled'
        }
    ],
    grantsFeatures: ['freedom_of_movement'],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'wondrous', 'speed', 'mobility']
};

// ===== Amulet of the Planes (Plane Shift) =====
const amuletOfPlanes: EnhancedEquipment = {
    name: 'Amulet of the Planes',
    type: 'item',
    rarity: 'very_rare',
    weight: 0.1,
    grantsFeatures: ['plane_shift'],
    spawnWeight: 0.05,
    source: 'custom',
    tags: ['magic', 'wondrous', 'planar', 'teleportation']
};

// ===== Ring of Darkvision =====
const ringOfDarkvision: EnhancedEquipment = {
    name: 'Ring of Darkvision',
    type: 'item',
    rarity: 'uncommon',
    weight: 0.1,
    properties: [
        {
            type: 'ability_unlock',
            target: 'darkvision',
            value: 60,
            description: 'Darkvision 60 feet'
        }
    ],
    source: 'custom',
    tags: ['magic', 'ring', 'vision']
};
```

### Example 11: Items That Grant Spells

```typescript
// ===== Ring of Spell Storing - Store and cast spells =====
const ringOfSpellStoring: EnhancedEquipment = {
    name: 'Ring of Spell Storing',
    type: 'item',
    rarity: 'rare',
    weight: 0.1,
    properties: [
        {
            type: 'special_property',
            target: 'spell_storing',
            value: 5,
            description: 'Can store up to 5 levels of spells'
        }
    ],
    grantsSpells: [
        { spellId: 'fireball', level: 3, uses: 1, recharge: 'dawn' },
        { spellId: 'shield', level: 1, uses: 1, recharge: 'dawn' }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'ring', 'spell']
};

// ===== Scroll of Fireball - One-time use spell =====
const scrollOfFireball: EnhancedEquipment = {
    name: 'Scroll of Fireball',
    type: 'item',
    rarity: 'uncommon',
    weight: 0.1,
    grantsSpells: [
        { spellId: 'fireball', level: 3, uses: 1 }
        // No recharge means one-time use
    ],
    source: 'custom',
    tags: ['magic', 'scroll', 'consumable', 'fire']
};

// ===== Wand of Magic Missiles - Cast at will (unlimited) =====
const wandOfMagicMissiles: EnhancedEquipment = {
    name: 'Wand of Magic Missiles',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    grantsSpells: [
        { spellId: 'magic_missile', level: 1, uses: null }
        // uses: null means unlimited uses
    ],
    source: 'custom',
    tags: ['magic', 'wand', 'evocation']
};

// ===== Understanding grantsSpells Properties =====
/*
| Property | Type | Description |
|----------|------|-------------|
| spellId   | string | The spell identifier (must exist in spell database) |
| level     | number | Spell level (0 for cantrips, 1-9 for spell levels) |
| uses      | number or null | Number of uses, or null for unlimited |
| recharge  | string | When uses reset: 'dawn', 'short_rest', 'long_rest', or undefined (one-time) |

Recharge Options:
- undefined or omitted - One-time use (consumable like scrolls)
- 'dawn' - Uses reset at dawn (daily items like most magic items)
- 'short_rest' - Uses reset on short rest (powerful items)
- 'long_rest' - Uses reset on long rest (very powerful items)
- uses: null - Unlimited uses (cantrips, wands, at-will items)
*/
```

### Example 12: Fire Damage (Two Methods)

**Method 1: Using Properties**

```typescript
const flameTongueWeapon: EnhancedEquipment = {
    name: 'Flame Tongue',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'fire',
            value: '2d6',
            description: '+2d6 fire damage on hit'
        }
    ],
    source: 'custom',
    tags: ['magic', 'fire', 'weapon']
};
```

**Method 2: Using a Feature Reference**

```typescript
// Reference an existing feature from the registry
const flameTongueWithFeature: EnhancedEquipment = {
    name: 'Flame Tongue',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    grantsFeatures: ['flame_weapon'],
    source: 'custom',
    tags: ['magic', 'fire', 'weapon']
};

// Or define an inline mini-feature for this item only
const flameTongueInlineFeature: EnhancedEquipment = {
    name: 'Flame Tongue',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    grantsFeatures: [
        {
            id: 'flame_tongue_fire',
            name: 'Flame Tongue Fire',
            description: 'This weapon deals extra fire damage.',
            source: 'equipment_inline',
            effects: [
                {
                    type: 'damage_bonus',
                    target: 'fire',
                    value: '2d6',
                    description: '+2d6 fire damage on hit'
                },
                {
                    type: 'ability_unlock',
                    target: 'light',
                    value: 'bright_light_20ft',
                    description: 'Sheds bright light in a 20ft radius'
                }
            ]
        }
    ],
    source: 'custom',
    tags: ['magic', 'fire', 'weapon']
};
```

### Example 13: Conditional Effects

```typescript
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// ===== VS CREATURE TYPE =====
const dragonSlayerAxe: EnhancedEquipment = {
    name: 'Dragon Slayer Axe',
    type: 'weapon',
    rarity: 'very_rare',
    weight: 5,
    damage: { dice: '1d12', damageType: 'slashing' },
    weaponProperties: ['two-handed'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'dragon',
            value: '3d6',
            condition: { type: 'vs_creature_type', value: 'dragon' },
            description: '+3d6 damage vs dragons'
        }
    ],
    spawnWeight: 0.05,
    source: 'custom',
    tags: ['magic', 'weapon', 'dragon', 'slayer']
};

// ===== TIME OF DAY =====
const moonBlade: EnhancedEquipment = {
    name: 'Moon Blade',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    properties: [
        {
            type: 'damage_bonus',
            target: 'radiant',
            value: '2d6',
            condition: { type: 'at_time_of_day', value: 'night' },
            description: '+2d6 radiant damage at night'
        },
        {
            type: 'damage_bonus',
            target: 'radiant',
            value: '1d6',
            condition: { type: 'at_time_of_day', value: 'dawn' },
            description: '+1d6 radiant damage at dawn'
        }
    ],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'weapon', 'moon', 'radiant']
};

// ===== WIELDER RACE =====
const elvenChain: EnhancedEquipment = {
    name: 'Elven Chain',
    type: 'armor',
    rarity: 'rare',
    weight: 20,
    acBonus: 16,
    properties: [
        {
            type: 'special_property',
            target: 'sleep_immunity',
            value: true,
            condition: { type: 'wielder_race', value: 'Elf' },
            description: 'Immunity to magic that puts you to sleep (Elf only)'
        },
        {
            type: 'passive_modifier',
            target: 'stealth_disadvantage',
            value: false,
            condition: { type: 'wielder_race', value: 'Elf' },
            description: 'No stealth disadvantage (Elf only)'
        }
    ],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'armor', 'elf', 'stealth']
};

// ===== WIELDER CLASS =====
const holyAvenger: EnhancedEquipment = {
    name: 'Holy Avenger',
    type: 'weapon',
    rarity: 'legendary',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['versatile'],
    properties: [
        {
            type: 'passive_modifier',
            target: 'saving_throws',
            value: 3,
            condition: { type: 'wielder_class', value: 'Paladin' },
            description: '+3 to saving throws (Paladin only)'
        },
        {
            type: 'damage_bonus',
            target: 'radiant',
            value: '2d6',
            condition: { type: 'wielder_class', value: 'Paladin' },
            description: '+2d6 radiant damage vs fiends/undead (Paladin only)'
        }
    ],
    spawnWeight: 0.0,  // Legendary - never spawns randomly
    source: 'custom',
    tags: ['magic', 'weapon', 'paladin', 'holy', 'legendary']
};
```

### Example 14: Progressive Enchantment Through Gameplay

Track equipment upgrades as players progress:

```typescript
import { EquipmentModifier } from './src/core/equipment/EquipmentModifier.js';
import type { EquipmentModification } from './src/core/types/Equipment.js';

// Game loop: Player earns upgrade points
let enchantmentLevel = 0;

function upgradeWeapon(character: CharacterSheet, weaponName: string) {
    enchantmentLevel++;

    const modification: EquipmentModification = {
        id: `upgrade_${Date.now()}`,
        name: `+${enchantmentLevel} ${weaponName}`,
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: enchantmentLevel,
                description: `+${enchantmentLevel} to attack rolls`
            },
            {
                type: 'passive_modifier',
                target: 'damage_roll',
                value: enchantmentLevel,
                description: `+${enchantmentLevel} to damage rolls`
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'gameplay'
    };

    // Remove previous upgrade if exists
    if (enchantmentLevel > 1) {
        const oldModId = `upgrade_${Date.now() - 10000}`;
        EquipmentModifier.removeModification(
            character.equipment!,
            weaponName,
            oldModId,
            character
        );
    }

    // Apply new upgrade
    character.equipment = EquipmentModifier.enchant(
        character.equipment!,
        weaponName,
        modification,
        character
    );

    console.log(`Weapon upgraded to +${enchantmentLevel}!`);
}

// Usage:
upgradeWeapon(character, 'Longsword');  // +1 Longsword
// ... later in game ...
upgradeWeapon(character, 'Longsword');  // +2 Longsword
// ... even later ...
upgradeWeapon(character, 'Longsword');  // +3 Longsword
```

### Example 15: Removing Debuffs from Cursed Items

```typescript
import { EquipmentModifier } from './src/core/equipment/EquipmentModifier.js';

// ===== DISenCHANT (Remove beneficial enchantments, keep curses) =====
const result = EquipmentModifier.disenchant(
    character.equipment!,
    'Cursed Sword of Pain',
    character
);
// Removes +1 bonuses but keeps the curse

// ===== LIFT CURSE (Remove curses, keep enchantments) =====
const result = EquipmentModifier.liftCurse(
    character.equipment!,
    'Cursed Sword of Pain',
    character
);
// Removes curse effects but keeps the +1 enchantment

// ===== REMOVE SPECIFIC MODIFICATION =====
const result = EquipmentModifier.removeModification(
    character.equipment!,
    'Cursed Sword',
    'curse_mod_001',  // Modification ID to remove
    character
);
// Removes only that specific modification
```

### Example 16: Multiple Effects Stacking

```typescript
import { ExtensionManager } from './src/core/extensions/ExtensionManager.js';
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// Register two items that both give +1 STR
const beltOfStrength1: EnhancedEquipment = {
    name: 'Belt of Strength I',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    properties: [
        { type: 'stat_bonus', target: 'STR', value: 1, description: '+1 STR' }
    ],
    source: 'custom',
    tags: ['magic', 'strength']
};

const beltOfStrength2: EnhancedEquipment = {
    name: 'Belt of Strength II',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    properties: [
        { type: 'stat_bonus', target: 'STR', value: 1, description: '+1 STR' }
    ],
    source: 'custom',
    tags: ['magic', 'strength']
};

// If a character equips BOTH items, they get +2 STR total
// stackable: true is the default behavior
```

### Example 17: Game-Only Items (spawnWeight: 0)

Items that never spawn randomly but are available to game logic:

```typescript
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// This item will NEVER appear in random loot tables
const artifactOfDoom: EnhancedEquipment = {
    name: 'Artifact of Doom',
    type: 'item',
    rarity: 'legendary',
    weight: 5,
    properties: [
        { type: 'stat_bonus', target: 'STR', value: 5, description: '+5 STR' },
        { type: 'special_property', target: 'curse', value: true, description: 'Cursed!' }
    ],
    spawnWeight: 0,  // NEVER spawns randomly
    source: 'custom',
    tags: ['artifact', 'unique', 'cursed', 'quest']
};

// Can ONLY be obtained through specific game logic:
function awardArtifact(character: CharacterSheet) {
    // Directly add to character's inventory
    character.equipment = character.equipment || {
        weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0
    };

    character.equipment.items.push({
        name: 'Artifact of Doom',
        quantity: 1,
        equipped: false
    });

    // Manually apply the effects
    EquipmentEffectApplier.equipItem(character, artifactOfDoom);
}
```

### Example 18: Complete Custom Magic Item System

```typescript
import {
    ExtensionManager,
    EquipmentSpawnHelper,
    EquipmentModifier,
    EquipmentEffectApplier
} from './src/core/index.js';
import type { EnhancedEquipment, EquipmentModification } from './src/core/types/Equipment.js';
import { SeededRNG } from './src/utils/random.js';

// ===== STEP 1: Define Custom Equipment =====
const customItems: EnhancedEquipment[] = [
    {
        name: 'Frostbrand',
        type: 'weapon',
        rarity: 'very_rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing' },
        weaponProperties: ['finesse'],
        properties: [
            { type: 'damage_bonus', target: 'cold', value: '1d8', description: '+1d8 cold damage' },
            { type: 'ability_unlock', target: 'fire_resistance', value: true, description: 'Fire resistance' }
        ],
        grantsFeatures: ['protection_from_fire'],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'ice', 'weapon']
    },
    {
        name: 'Boots of Striding and Springing',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        properties: [
            { type: 'passive_modifier', target: 'speed', value: 10, description: '+10 speed' },
            { type: 'ability_unlock', target: 'long_jump', value: true, description: 'Stand up from prone as bonus action' }
        ],
        grantsSkills: [{ skillId: 'athletics', level: 'proficient' }],
        spawnWeight: 0.5,
        source: 'custom',
        tags: ['magic', 'boots', 'movement']
    },
    {
        name: 'Ring of Spell Storing',
        type: 'item',
        rarity: 'rare',
        weight: 0.1,
        grantsSpells: [
            { spellId: 'fireball', level: 3, uses: 1, recharge: 'dawn' },
            { spellId: 'shield', level: 1, uses: 1, recharge: 'dawn' }
        ],
        spawnWeight: 0.3,
        source: 'custom',
        tags: ['magic', 'ring', 'spell']
    }
];

// ===== STEP 2: Register Equipment =====
const manager = ExtensionManager.getInstance();
manager.register('equipment', customItems, {
    mode: 'relative',
    validate: true
});

// ===== STEP 3: Spawn Custom Items =====
const rng = new SeededRNG('custom_loot');
const customLoot = EquipmentSpawnHelper.spawnByTags(['custom', 'magic'], 3, rng);

// ===== STEP 4: Add to Character =====
const character = CharacterGenerator.generate(seed, audio, 'Adventurer');
character = EquipmentSpawnHelper.addToCharacter(character, customLoot, true);

// ===== STEP 5: Enchant Items During Gameplay =====
function enchantItem(character: CharacterSheet, itemName: string, enchantmentLevel: number) {
    const enchantment: EquipmentModification = {
        id: `enchant_${itemName}_${Date.now()}`,
        name: `+${enchantmentLevel} Enhancement`,
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: enchantmentLevel,
                description: `+${enchantmentLevel} to attack rolls`
            }
        ],
        appliedAt: new Date().toISOString(),
        source: 'enchanting'
    };

    character.equipment = EquipmentModifier.enchant(
        character.equipment!,
        itemName,
        enchantment,
        character
    );

    console.log(`${itemName} is now +${enchantmentLevel}!`);
}

// ===== STEP 6: Quest Rewards =====
function awardQuestReward(character: CharacterSheet) {
    // Spawn a rare item as quest reward
    const reward = EquipmentSpawnHelper.spawnByRarity('rare', 1, new SeededRNG('quest'));
    if (reward.length > 0) {
        character = EquipmentSpawnHelper.addToCharacter(character, reward, false);
        console.log(`Quest complete! You received: ${reward[0].name}`);
    }
}

// ===== STEP 7: Boss Drops =====
function bossLoot(character: CharacterSheet, bossCR: number) {
    const hoard = EquipmentSpawnHelper.spawnTreasureHoard(
        bossCR,
        new SeededRNG(`boss_${Date.now()}`)
    );

    character = EquipmentSpawnHelper.addToCharacter(character, hoard.items, false);
    console.log(`Boss defeated! Found ${hoard.items.length} items worth ~${hoard.totalValue} gp`);
}
```

---

## Related Documentation

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [specs/001-core-engine/SPEC.md](../specs/001-core-engine/SPEC.md) - Core engine specification
