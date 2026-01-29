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
| `spell_grant` | Grants spellcasting ability | spell ID | boolean |
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
    source: 'default' | 'custom';

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
import { SeededRNG } from './src/core/randomness/SeededRNG.js';

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

---

## Related Documentation

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [specs/001-core-engine/SPEC.md](../specs/001-core-engine/SPEC.md) - Core engine specification
- [UPGRADE_PLAN_PART_2.md](../UPGRADE_PLAN_PART_2.md) - Equipment system upgrade plan
