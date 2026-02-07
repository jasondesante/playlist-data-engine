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
10. [Enchantment Library](#enchantment-library)
11. [Magic Item Examples](#magic-item-examples)
12. [Custom Equipment](#custom-equipment)
13. [API Reference](#api-reference)
14. [Examples](#examples)

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

// Add to character
character = EquipmentSpawnHelper.addToCharacter(character, loot, false);
```

### 3. Apply Equipment Effects

```typescript
import { EquipmentEffectApplier } from 'playlist-data-engine';

// Equip item and apply effects
const result = EquipmentEffectApplier.equipItem(character, equipment);

// Unequip and remove effects
EquipmentEffectApplier.unequipItem(character, 'Flaming Sword');
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
- **Feature-Aligned**: Follows existing FeatureEffect
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

**Location:** [src/core/types/Equipment.ts](../src/core/types/Equipment.ts) (lines 63-70)

| Property | Type | Description |
|----------|------|-------------|
| type | EquipmentPropertyType | The property type (stat_bonus, skill_proficiency, etc.) |
| target | string | What the property affects (ability name, skill ID, etc.) |
| value | number \| string \| boolean | The property's effect value |
| condition | EquipmentCondition | Optional condition for when property applies |
| description | string | Human-readable description |
| stackable | boolean | Whether effects stack (default: true) |

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

**Location:** [CharacterSheet.equipment_effects](../src/core/types/Character.ts)

Equipment effects are tracked separately on the character for proper removal when unequipping.

| Property | Type | Description |
|----------|------|-------------|
| source | string | Equipment name |
| instanceId | string | Per-instance tracking ID |
| effects | EquipmentProperty[] | Properties from this item |
| features | EquipmentFeature[] | Features granted by this item |
| skills | EquipmentSkill[] | Skills granted by this item |
| spells | Array<{spellId, level?, uses?, recharge?}> | Spells granted by this item |

---

## Enhanced Equipment

The `EnhancedEquipment` interface extends the base equipment with advanced capabilities.

### EnhancedEquipment Interface

**Location:** [src/utils/constants.ts](../src/utils/constants.ts) (lines 1368-1414)
**Type alias:** [src/core/types/Equipment.ts](../src/core/types/Equipment.ts) (line 94)

Complete equipment data structure with advanced properties support.

| Property | Type | Description |
|----------|------|-------------|
| name | string | Equipment name |
| type | 'weapon' \| 'armor' \| 'item' | Equipment category |
| rarity | 'common' \| 'uncommon' \| 'rare' \| 'very_rare' \| 'legendary' | Item rarity |
| weight | number | Weight in pounds |
| properties | EquipmentProperty[] | Optional advanced properties |
| grantsFeatures | Array<string \| EquipmentMiniFeature> | Features granted when equipped |
| grantsSkills | Array<{skillId, level}> | Skills granted when equipped |
| grantsSpells | Array<{spellId, level?, uses?, recharge?}> | Spells granted when equipped |
| damage | {dice, damageType, versatile?} | D&D 5e damage info |
| acBonus | number | Armor class bonus |
| weaponProperties | string[] | D&D 5e weapon properties |
| spawnWeight | number | Spawn weight (0 = game-only) |
| templateId | string | Template ID if created from template |
| source | 'default' \| 'custom' | Source tracking |
| tags | string[] | Search/filter tags |

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

String references to features in the FeatureQuery:

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

**Location:** [src/core/types/Equipment.ts](../src/core/types/Equipment.ts) (lines 76-82)

Inline equipment-specific feature definition.

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique feature ID |
| name | string | Feature name |
| description | string | Feature description |
| effects | EquipmentProperty[] | What this feature does |
| source | 'equipment_inline' | Marks as equipment-specific |

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

**Location:** [src/core/types/Equipment.ts](../src/core/types/Equipment.ts) (lines 99-116)

Runtime modification to equipment (enchanting, cursing, upgrading).

| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique modification ID |
| name | string | Display name |
| properties | EquipmentProperty[] | Properties added by modification |
| addsFeatures | Array<string \| EquipmentMiniFeature> | Features granted |
| addsSkills | Array<{skillId, level}> | Skills granted |
| addsSpells | Array<{spellId, level?, uses?, recharge?}> | Spells granted |
| appliedAt | string | ISO timestamp of application |
| source | string | Source type ('enchantment', 'curse', 'upgrade', 'template') |

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

## Enchantment Library

The Enchantment Library provides a comprehensive collection of predefined enchantments and curses that can be applied to equipment at runtime. All enchantments are `EquipmentModification` objects designed to work with `EquipmentModifier`.

**For complete API documentation, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#enchantment-library)**

### Using Predefined Enchantments

```typescript
import { EquipmentModifier, WEAPON_ENCHANTMENTS, ARMOR_ENCHANTMENTS, RESISTANCE_ENCHANTMENTS } from 'playlist-data-engine';

// Apply a +1 enhancement to a weapon
const plusOne = WEAPON_ENCHANTMENTS.plusOne;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    plusOne,
    character
);

// Add elemental damage
const flaming = WEAPON_ENCHANTMENTS.flaming;  // +1d6 fire damage
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    flaming,
    character
);

// Improve armor
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Plate Armor',
    ARMOR_ENCHANTMENTS.plusTwo,  // +2 AC
    character
);

// Add resistance
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Cloak of Protection',
    RESISTANCE_ENCHANTMENTS.fire,  // Fire resistance
    character
);
```

### Creating Stat-Boosting Enchantments

The `create*Enchantment` functions create stat bonuses with configurable levels (1-4):

```typescript
import {
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment
} from 'playlist-data-engine';

// Create +2 Strength belt
const beltOfStrength = createStrengthEnchantment(2);  // Bonus: 1-4
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Belt of Giant Strength',
    beltOfStrength,
    character
);

// Create +4 Intelligence circlet
const circletOfIntellect = createIntelligenceEnchantment(4);
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Circlet of Intellect',
    circletOfIntellect,
    character
);
```

### Applying Curses

```typescript
import { EquipmentModifier, CURSES } from 'playlist-data-engine';

// Apply a cursed item
const cursedItem = EquipmentModifier.curse(
    character.equipment,
    'Ring of Weakness',
    CURSES.weakness,  // -4 Strength
    character
);

// Apply attunement lock (cannot remove without remove curse)
const lockedItem = EquipmentModifier.curse(
    character.equipment,
    'Cursed Helmet',
    CURSES.attunement,
    character
);
```

### Combo Enchantments

Special multi-effect enchantments for powerful items:

```typescript
import { ALL_ENCHANTMENTS } from 'playlist-data-engine';

// Holy Avenger: +3 enhancement, radiant damage vs fiends/undead, +5 saves vs spells
const holyAvenger = ALL_ENCHANTMENTS.holyAvenger;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Holy Avenger',
    holyAvenger,
    character
);

// Dragon Slayer: +2 enhancement, extra damage vs dragons, fire resistance
const dragonSlayer = ALL_ENCHANTMENTS.dragonSlayer;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Dragon Slayer Sword',
    dragonSlayer,
    character
);
```

### Querying Enchantments

```typescript
import { getEnchantment, getCurse, getAllEnchantments, getAllCurses, getEnchantmentsByType } from 'playlist-data-engine';

// Get specific enchantment by ID
const ench = getEnchantment('flaming');
if (ench) {
    console.log(ench.name);  // 'Flaming'
}

// Get all curses
const allCurses = getAllCurses();
console.log(`Available curses: ${allCurses.length}`);  // 17 curses

// Get enchantments by type
const weaponEnchants = getEnchantmentsByType('weapon');
console.log(`Weapon enchantments: ${weaponEnchants.length}`);  // 16 enchantments
```

**Available Exports:**

- **Collections**: `WEAPON_ENCHANTMENTS`, `ARMOR_ENCHANTMENTS`, `RESISTANCE_ENCHANTMENTS`, `CURSES`, `ALL_ENCHANTMENTS`
- **Stat Boost Functions**: `createStrengthEnchantment`, `createDexterityEnchantment`, `createConstitutionEnchantment`, `createIntelligenceEnchantment`, `createWisdomEnchantment`, `createCharismaEnchantment` (each takes `bonus: 1 | 2 | 3 | 4`)
- **Query Functions**: `getEnchantment`, `getCurse`, `getAllEnchantments`, `getAllCurses`, `getEnchantmentsByType`

---

## Magic Item Examples

The Magic Item Examples library provides 38 pre-built magic items that demonstrate all capabilities of the Advanced Equipment System. These include weapons, armor, wondrous items, cursed items, conditional items, and template-based items. They serve as reference implementations and test fixtures.

**For complete API documentation, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#magic-item-examples)**

### Getting Magic Items by Name

```typescript
import { getMagicItem } from 'playlist-data-engine';

// Get a specific magic item
const flameTongue = getMagicItem('Flame Tongue');
if (flameTongue) {
    console.log(flameTongue.properties);
    // Output: Array of equipment properties including damage_bonus and special_property
}
```

### Querying Magic Items

```typescript
import {
    getMagicItemsByType,
    getMagicItemsByRarity,
    getCursedItems,
    getItemsWithProperty
} from 'playlist-data-engine';

// Get all weapons
const weapons = getMagicItemsByType('weapon');
console.log(`Magic weapons: ${weapons.length}`);  // 4 weapons

// Get all rare items
const rareItems = getMagicItemsByRarity('rare');
console.log(`Rare items: ${rareItems.length}`);  // ~15 rare items

// Get cursed items
const cursedItems = getCursedItems();
cursedItems.forEach(item => {
    console.log(`Cursed: ${item.name}`);
    // Output: -1 Cursed Sword, Belt of Strength Drain, Helmet of Opposite Alignment
});

// Get all items with a specific property
const statBonusItems = getItemsWithProperty('stat_bonus');
console.log(`Items with stat bonuses: ${statBonusItems.length}`);
```

### Applying Magic Equipment Templates

Templates can be applied to base equipment to create magic variants:

```typescript
import { applyTemplate, EnhancedEquipment } from 'playlist-data-engine';

// Define base equipment
const baseLongsword: EnhancedEquipment = {
    name: 'Longsword',
    type: 'weapon',
    rarity: 'common',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
    weaponProperties: ['finesse', 'versatile'],
    source: 'base',
    tags: ['martial', 'melee']
};

// Apply flaming template
const flamingSword = applyTemplate(baseLongsword, 'flaming_weapon_template');
if (flamingSword) {
    console.log(flamingSword.name);  // "Longsword (flaming weapon template)"
    console.log(flamingSword.properties);  // Combined properties from base + template
}

// Apply +1 enhancement
const plusOneSword = applyTemplate(baseLongsword, 'plus_one_weapon');
if (plusOneSword) {
    console.log(plusOneSword.properties);  // Includes +1 attack/damage bonus
}
```

### Registering Magic Items with ExtensionManager

Magic item examples can be registered as custom equipment for procedural generation:

```typescript
import { ExtensionManager, MAGIC_ITEMS } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register all magic items as custom equipment
manager.register('equipment', MAGIC_ITEMS, {
    mode: 'append',
    weights: MAGIC_ITEMS.reduce((acc, item) => {
        acc[item.name] = item.spawnWeight ?? 0;
        return acc;
    }, {} as Record<string, number>)
});

// Now items will appear in random generation (respecting spawnWeight)
// Note: Vorpal Sword and other legendary items have spawnWeight: 0,
// so they won't appear randomly but can still be spawned by name
```

### Direct Access to Magic Item Collections

```typescript
import { MAGIC_ITEMS, ITEM_CREATION_TEMPLATES } from 'playlist-data-engine';

// Iterate through all magic items
MAGIC_ITEMS.forEach(item => {
    console.log(`${item.name} (${item.rarity}) - ${item.type}`);
});

// Access specific template
const viciousTemplate = ITEM_CREATION_TEMPLATES.vicious_weapon_template;
console.log(viciousTemplate.properties);
```

**Available Exports:**

- **Collections**: `MAGIC_ITEMS` (34 magic items), `ITEM_CREATION_TEMPLATES` (9 templates)
- **Query Functions**: `getMagicItem`, `getMagicItemsByType`, `getMagicItemsByRarity`, `getCursedItems`, `getItemsWithProperty`
- **Template Function**: `applyTemplate` - Apply a template to base equipment

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
manager.register('equipment', [customSword], { weights: { 'Blade of the Ages': 0.5 }});
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

**Location:** [src/core/equipment/EquipmentEffectApplier.ts](../src/core/equipment/EquipmentEffectApplier.ts)

| Method | Description |
|--------|-------------|
| equipItem(character, equipment, instanceId?) | Apply all effects from equipping an item |
| unequipItem(character, equipmentName, instanceId?) | Remove all effects from unequipping an item |
| reapplyEquipmentEffects(character) | Re-apply all equipment effects (for updates/level-ups) |
| getActiveEffects(character) | Get all active equipment effects |

### EquipmentValidator

**Location:** [src/core/equipment/EquipmentValidator.ts](../src/core/equipment/EquipmentValidator.ts)

**Core Validation:**
| Method | Description |
|--------|-------------|
| validateEquipment(equipment) | Validate complete equipment object |
| validateProperty(property) | Validate single equipment property |
| validateCondition(condition) | Validate equipment condition |
| validateModification(modification) | Validate equipment modification |

**Reference Validation:**
| Method | Description |
|--------|-------------|
| validateEquipmentFeatureReference(featureId) | Check if feature ID exists in FeatureQuery |
| validateEquipmentSkillReference(skillId) | Check if skill ID exists in SkillQuery |

**Field Validation:**
| Method | Description |
|--------|-------------|
| validateDamageInfo(damage) | Validate damage information |
| validateSpawnWeight(weight) | Validate spawn weight (0-1, inclusive) |
| validateACBonus(acBonus) | Validate AC bonus value |
| validateWeaponProperties(weaponProperties) | Validate weapon properties array |

### EquipmentModifier

**Location:** [src/core/equipment/EquipmentModifier.ts](../src/core/equipment/EquipmentModifier.ts)

**Modification Operations:**
| Method | Description |
|--------|-------------|
| enchant(equipment, itemName, enchantment, character?) | Enchant equipment with new properties |
| curse(equipment, itemName, curse, character?) | Curse equipment with negative effects |
| upgrade(equipment, itemName, upgrade, character?) | Upgrade equipment (improve properties) |
| applyTemplate(equipment, itemName, templateId, character?) | Apply a template modification |
| removeModification(equipment, itemName, modificationId, character?) | Remove a specific modification |
| disenchant(equipment, itemName, character?) | Remove enchantments, keep curses |
| liftCurse(equipment, itemName, character?) | Remove curses, keep enchantments |
| removeAllModifications(equipment, itemName, character?) | Remove all modifications |

**Query Methods:**
| Method | Description |
|--------|-------------|
| getModificationHistory(equipment, itemName) | Get modification history for an item |
| getCombinedEffects(equipment, itemName, instanceId?) | Get all active effects (base + mods) |
| isEnchanted(equipment, itemName) | Check if item has any enchantments |
| isCursed(equipment, itemName) | Check if item has any curses |
| hasTemplate(equipment, itemName, templateId) | Check if item has a specific template |
| getAppliedTemplates(equipment, itemName) | Get all templates applied to an item |
| getItemSummary(equipment, itemName) | Get comprehensive item summary |

**Factory Methods:**
| Method | Description |
|--------|-------------|
| createModification(id, name, properties, source) | Create base modification |
| createFeatureModification(id, name, properties, addsFeatures, source) | Create feature-granting modification |
| createSkillModification(id, name, properties, addsSkills, source) | Create skill-granting modification |
| createSpellModification(id, name, properties, addsSpells, source) | Create spell-granting modification |
| generateModificationId(prefix?) | Generate a unique modification ID |

### EquipmentSpawnHelper

**Location:** [src/core/equipment/EquipmentSpawnHelper.ts](../src/core/equipment/EquipmentSpawnHelper.ts)

**Spawn Methods:**
| Method | Description |
|--------|-------------|
| spawnFromList(itemNames, rng?) | Spawn items from list of names |
| spawnByRarity(rarity, count, rng?) | Spawn items by rarity level |
| spawnByTags(tags, count, rng?, options?) | Spawn items matching tags |
| spawnRandom(count, rng, options?) | Spawn random equipment (respects weights) |
| spawnFromTemplate(templateId, baseItemName?) | Spawn equipment from template |
| spawnTreasureHoard(cr, rng) | Spawn treasure hoard by CR |
| addToCharacter(character, items, equip?) | Add spawned items to character |

---

### FeatureQuery (Equipment-Related)

**Location:** [src/core/features/FeatureQuery.ts](../src/core/features/FeatureQuery.ts)

Convenience methods for equipment-granted features.

| Method | Description |
|--------|-------------|
| getEquipmentFeatures(equipmentName) | Get features grantable by equipment |
| isValidEquipmentFeature(featureId) | Check if feature ID exists (spawnWeight: 0 is valid) |
| registerEquipmentFeature(feature) | Register feature for equipment use (adds 'equipment' tag) |

---

## Examples

### Example 1: Basic Equipment Types

**Item That Grants Stats**

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

**Item That Grants AC**

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

**Item That Grants Skills**

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

### Example 2: Enchanting Equipment

```typescript
import { EquipmentModifier } from './src/core/equipment/EquipmentModifier.js';

// Create enchantment
const enchantment = EquipmentModifier.createModification(
    'plus_one_001',
    '+1 Longsword',
    [{
        type: 'passive_modifier',
        target: 'attack_roll',
        value: 1,
        description: '+1 to attack rolls'
    }],
    'enchantment'
);

// Apply to equipment
const updatedEquipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    enchantment,
    character
);

// Check if enchanted
if (EquipmentModifier.isEnchanted(character.equipment, 'Longsword')) {
    console.log('Item is enchanted!');
}

// Get item summary
const summary = EquipmentModifier.getItemSummary(character.equipment, 'Longsword');
console.log(summary);
// { name: 'Longsword', modifications: [...], isCursed: false, isEnchanted: true }
```

### Example 3: Batch Spawning

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

### Example 4: Template-Based Items

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

**Note**: For property type reference, see the [Property Types](#property-types) table in the Equipment Properties section. For equipment-granted features, see [Equipment-Granted Features](#equipment-granted-features).

### Example 5: Items That Grant Spells

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

### Example 6: Fire Damage (Two Methods)

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

### Example 7: Conditional Effects

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

### Example 8: Progressive Enchantment Through Gameplay

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

### Example 9: Removing Debuffs from Cursed Items

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

### Example 10: Multiple Effects Stacking

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

### Example 11: Game-Only Items (spawnWeight: 0)

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

### Example 12: Complete Custom Magic Item System

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
const character = CharacterGenerator.generate(seed, audio, track);
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
- [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md) - Custom content registration and spawn rates
- [XP_AND_STATS.md](XP_AND_STATS.md) - Progression, stat increases, and level-ups
- [PREREQUISITES.md](PREREQUISITES.md) - Level, ability, and skill requirements
- [specs/001-core-engine/SPEC.md](../specs/001-core-engine/SPEC.md) - Core engine specification

