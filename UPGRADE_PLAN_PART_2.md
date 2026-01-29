# Playlist Data Engine Upgrade Plan Part 2: Advanced Equipment System

## Overview

Upgrade the Playlist Data Engine's equipment system to support:
1. **Equipment Properties**: Stat bonuses, skill proficiencies, ability unlocks, passive modifiers, special properties
2. **Equipment-Granted Features**: Equipment can provide unique features or reference existing registry features
3. **D&D 5e Standard Stats**: All existing equipment populated with default damage dice, AC, and properties
4. **Custom Equipment Support**: ExtensionManager integration for custom equipment with full property support
5. **Runtime Equipment Modification**: Template-based items (Flaming Sword) + per-instance enchanting/upgrading
6. **Helper Functions**: Batch equipment spawning utilities (no full loot system)

**Design Principles:**
- **Backward Compatible**: Existing characters and equipment continue to work
- **Weight-Based Spawning**: Features have spawn weights (0 = never random, still available to game logic)
- **Template + Instance**: Support both equipment templates AND per-item unique modifications
- **D&D 5e Aligned**: Default equipment uses standard 5e stats
- **Feature-Aligned**: Follow existing FeatureEffect pattern from Phase 11
- **Data Structure Focus**: Provide structures, not full gameplay systems

---

## Phase 1: Research & Analysis

### 1.1 Analyze Current Equipment Architecture

**Research Tasks:**
- [x] Map current equipment data flow
- [x] Identify existing effect systems (FeatureEffectApplier, feature_effects array)
- [x] Analyze ExtensionManager patterns
- [x] Review storage patterns on CharacterSheet

**Files Analyzed:**
- `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts:751-891` - Equipment interface and database
- `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts` - Equipment operations
- `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts:167-174` - Character equipment storage
- `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureEffectApplier.ts` - Effect application system
- `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts` - Extensibility patterns

**Deliverable:** ~~Document complete equipment signal flow~~ **COMPLETE**

---

### 1.2 Define Equipment Enhancement Requirements

**Functional Requirements:**
1. Equipment supports optional properties affecting gameplay
2. Properties validated during registration
3. Equipment effects apply/remove on equip/unequip
4. Equipment can grant features (weight-based: 0 = never random, still usable by game logic)
5. Equipment can be modified at runtime (templates + per-instance)
6. Custom equipment defines properties via ExtensionManager
7. All existing equipment gets D&D 5e standard stats

**Technical Requirements:**
1. New interfaces for enhanced equipment
2. Validation system for equipment properties
3. Effect application integrated with FeatureEffectApplier
4. Storage for equipment-granted effects on characters
5. Migration path for existing equipment
6. Helper functions for batch spawning
7. Test coverage for all new functionality

**Deliverable:** ~~Complete requirements specification~~ **COMPLETE**

---

## Phase 2: Interface Design

### 2.1 Design Enhanced Equipment Interfaces

**File:** `/Users/jasondesante/playlist-data-engine/src/core/types/Equipment.ts` (NEW)

**Interfaces to Create:**

```typescript
/**
 * Equipment property types that affect gameplay
 */
export type EquipmentPropertyType =
    | 'stat_bonus'           // +1 STR, +2 DEX, etc.
    | 'skill_proficiency'    // Proficiency or expertise in skills
    | 'ability_unlock'       // Darkvision, flight, etc.
    | 'passive_modifier'     // Damage resistance, speed bonus, AC bonus
    | 'special_property'     // Finesse, versatile, two-handed, etc.
    | 'damage_bonus'         // +1d6 fire damage, etc.

/**
 * Equipment property that provides mechanical benefits
 */
export interface EquipmentProperty {
    type: EquipmentPropertyType;
    target: string;
    value: number | string | boolean;
    condition?: string;
    description?: string;
}

/**
 * Enhanced equipment interface with optional advanced properties
 * Extends base Equipment for backward compatibility
 */
export interface EnhancedEquipment {
    // Base properties (existing)
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;

    // NEW: Advanced properties
    properties?: EquipmentProperty[];

    // NEW: Features granted when equipped (feature IDs from FeatureRegistry)
    grantsFeatures?: string[];

    // NEW: Skills granted when equipped
    grantsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;

    // NEW: D&D 5e stats
    damage?: {
        dice: string;          // e.g., "1d8", "2d6"
        damageType: string;    // e.g., "slashing", "fire"
        versatile?: string;    // e.g., "1d10" if used two-handed
    };

    acBonus?: number;
    weaponProperties?: string[];  // e.g., ["finesse", "versatile", "two-handed"]

    // NEW: Spawn weight (0 = never randomly generated, still available to game logic)
    spawnWeight?: number;

    // NEW: Template support (for items like "Flaming Sword")
    templateId?: string;

    // NEW: Source tracking
    source: 'default' | 'custom';

    tags?: string[];
}

/**
 * Runtime modification to equipment (enchanting, curses, upgrades)
 */
export interface EquipmentModification {
    id: string;
    name: string;
    properties: EquipmentProperty[];
    addsFeatures?: string[];
    addsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;
    appliedAt: string;
    source: string;
}

/**
 * Enhanced inventory item with per-instance modifications
 */
export interface EnhancedInventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;

    // NEW: Per-instance modifications
    modifications?: EquipmentModification[];

    // NEW: Template ID (if created from a template)
    templateId?: string;

    // NEW: Unique instance ID (for tracking individual items)
    instanceId?: string;
}

/**
 * Equipment-granted feature tracking
 */
export interface EquipmentFeature {
    featureId: string;
    source: 'equipment';
    equipmentName: string;
    instanceId?: string;
    sourceType: 'default' | 'custom';
}

/**
 * Equipment-granted skill tracking
 */
export interface EquipmentSkill {
    skillId: string;
    level: 'proficient' | 'expertise';
    source: 'equipment';
    equipmentName: string;
    instanceId?: string;
    sourceType: 'default' | 'custom';
}
```

**Deliverable:** Complete type definitions file

---

### 2.2 Update Character Interface for Equipment Effects

**File:** `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts`

**Changes Required (after line 222):**

```typescript
// Add after feature_effects field

/**
 * Equipment-granted effects
 * Tracks effects currently active from equipped items
 * Separate from feature_effects to allow proper removal when unequipping
 */
equipment_effects?: {
    /** Equipment name providing the effect */
    source: string;

    /** Instance ID for per-instance tracking */
    instanceId?: string;

    /** Effects from this equipment */
    effects: EquipmentProperty[];

    /** Features granted by this equipment */
    features: EquipmentFeature[];

    /** Skills granted by this equipment */
    skills: EquipmentSkill[];
}[];
```

**Import Required:**
```typescript
import type { EquipmentProperty, EquipmentFeature, EquipmentSkill } from './Equipment.js';
```

**Deliverable:** Updated Character interface

---

## Phase 3: EquipmentEffect System

### 3.1 Create EquipmentEffectApplier

**File:** `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentEffectApplier.ts` (NEW)

**Key Methods:**

```typescript
export class EquipmentEffectApplier {
    /**
     * Apply all effects from equipping an item
     */
    static equipItem(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId?: string
    ): EffectApplicationResult;

    /**
     * Remove all effects from unequipping an item
     */
    static unequipItem(
        character: CharacterSheet,
        equipmentName: string,
        instanceId?: string
    ): EffectApplicationResult;

    /**
     * Re-apply all equipment effects (for updates/level-ups)
     */
    static reapplyEquipmentEffects(
        character: CharacterSheet
    ): EffectApplicationResult;

    /**
     * Apply equipment-granted features
     */
    private static applyEquipmentFeatures(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId?: string
    ): void;

    /**
     * Apply equipment-granted skills
     */
    private static applyEquipmentSkills(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId?: string
    ): void;

    /**
     * Remove equipment-granted features
     */
    private static removeEquipmentFeatures(
        character: CharacterSheet,
        equipmentName: string,
        instanceId?: string
    ): void;

    /**
     * Remove equipment-granted skills
     */
    private static removeEquipmentSkills(
        character: CharacterSheet,
        equipmentName: string,
        instanceId?: string
    ): void;

    /**
     * Get all active equipment effects
     */
    static getActiveEffects(
        character: CharacterSheet
    ): EquipmentProperty[];
}
```

**Integration with FeatureEffectApplier:**
- Use FeatureEffectApplier for equipment properties that match FeatureEffect types
- Store equipment-specific effects in equipment_effects array
- Track source equipment name and instance ID for removal

**Deliverable:** Complete EquipmentEffectApplier class

---

### 3.2 Create EquipmentValidator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentValidator.ts` (NEW)

**Key Methods:**

```typescript
export interface EquipmentValidationResult {
    valid: boolean;
    errors?: string[];
}

export function validateEquipment(
    equipment: EnhancedEquipment
): EquipmentValidationResult;

export function validateProperty(
    property: EquipmentProperty
): EquipmentValidationResult;

export function validateEquipmentFeatureReference(
    featureId: string
): boolean;

export function validateEquipmentSkillReference(
    skillId: string
): boolean;

export function validateDamageInfo(
    damage: EnhancedEquipment['damage']
): EquipmentValidationResult;

export function validateSpawnWeight(
    weight: number
): EquipmentValidationResult;
```

**Validation Checks:**
- Required fields present and valid types
- Feature IDs exist in FeatureRegistry
- Skill IDs exist in SkillRegistry
- Damage dice format valid (e.g., "1d8", "2d6")
- Spawn weight is non-negative number
- Property values match expected types

**Deliverable:** Complete EquipmentValidator

---

## Phase 4: Update EquipmentGenerator

### 4.1 Enhance EquipmentGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts`

**Changes Required:**

1. **Update Interface Imports:**
```typescript
import type {
    Equipment,
    InventoryItem,
    EnhancedEquipment,
    EnhancedInventoryItem,
    EquipmentProperty,
    EquipmentModification
} from '../types/Equipment.js';
import { EquipmentEffectApplier } from '../equipment/EquipmentEffectApplier.js';
```

2. **Update getEquipmentData to return EnhancedEquipment:**

```typescript
private static getEquipmentData(itemName: string): EnhancedEquipment | undefined {
    const manager = ExtensionManager.getInstance();
    const allEquipment = manager.get('equipment');
    return allEquipment.find((eq: EnhancedEquipment) => eq.name === itemName);
}
```

3. **Add Equipment Effect Integration to equipItem:**

```typescript
/**
 * Equip an item and apply its effects
 */
static equipItem(
    equipment: CharacterEquipment,
    itemName: string,
    character?: CharacterSheet
): CharacterEquipment {
    // ... existing equip logic ...

    // Apply equipment effects if character provided
    if (character && item.equipped) {
        const equipData = this.getEquipmentData(itemName);
        if (equipData) {
            const instanceId = (item as EnhancedInventoryItem).instanceId;
            EquipmentEffectApplier.equipItem(character, equipData, instanceId);
        }
    }

    return updated;
}
```

4. **Add Equipment Effect Removal to unequipItem:**

```typescript
/**
 * Unequip an item and remove its effects
 */
static unequipItem(
    equipment: CharacterEquipment,
    itemName: string,
    character?: CharacterSheet
): CharacterEquipment {
    // ... existing unequip logic ...

    // Remove equipment effects if character provided
    if (character) {
        const instanceId = (item as EnhancedInventoryItem).instanceId;
        EquipmentEffectApplier.unequipItem(character, itemName, instanceId);
    }

    return updated;
}
```

5. **Add Equipment Modification Methods:**

```typescript
/**
 * Add a modification to an equipment item (per-instance)
 */
static addModification(
    equipment: CharacterEquipment,
    itemName: string,
    modification: EquipmentModification,
    instanceId?: string,
    character?: CharacterSheet
): CharacterEquipment;

/**
 * Remove a modification from an equipment item
 */
static removeModification(
    equipment: CharacterEquipment,
    itemName: string,
    modificationId: string,
    character?: CharacterSheet
): CharacterEquipment;

/**
 * Get all active effects from an equipment item
 */
static getActiveEffects(
    equipment: CharacterEquipment,
    itemName: string,
    instanceId?: string
): EquipmentProperty[];
```

**Deliverable:** Updated EquipmentGenerator with effect support

---

### 4.2 Update InventoryItem Interface in Character

**File:** `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts`

**Update equipment structure (lines 167-174):**

```typescript
/** Equipment */
equipment?: {
    weapons: EnhancedInventoryItem[];
    armor: EnhancedInventoryItem[];
    items: EnhancedInventoryItem[];
    totalWeight: number;
    equippedWeight: number;
};
```

**Deliverable:** Updated character equipment structure

---

## Phase 5: ExtensionManager Integration

### 5.1 Update ExtensionManager Categories

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Add Equipment Categories (around line 27-85):**

```typescript
export type ExtensionCategory =
    | 'equipment'
    | 'equipment.properties'      // NEW: For custom equipment property templates
    | 'equipment.modifications'   // NEW: For custom modification templates
    | 'equipment.templates'       // NEW: For equipment templates (Flaming Sword, etc.)
    // ... existing categories ...
```

**Deliverable:** Updated ExtensionManager categories

---

### 5.2 Add Equipment Validation to ExtensionManager

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts`

**Add Validation (in register() method):**

```typescript
import { validateEquipment, EquipmentValidationResult } from '../equipment/EquipmentValidator.js';

// In register() method, add equipment validation:
if (category === 'equipment') {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const validation = validateEquipment(item);
        if (!validation.valid) {
            const prefix = item.name ? `Item "${item.name}"` : `Item at index ${i}`;
            throw new Error(
                `Equipment validation failed for ${prefix}:\n${validation.errors?.join('\n')}`
            );
        }
    }
}
```

**Deliverable:** Equipment validation in ExtensionManager

---

### 5.3 Update Default Equipment Initialization

**File:** `/Users/jasondesante/playlist-data-engine/src/core/extensions/initializeDefaults.ts`

**Update initializeEquipmentDefaults():**

```typescript
export function initializeEquipmentDefaults(): void {
    const manager = ExtensionManager.getInstance();

    // Convert EQUIPMENT_DATABASE to EnhancedEquipment format
    const enhancedEquipment: EnhancedEquipment[] = Object.values(EQUIPMENT_DATABASE).map(eq => ({
        ...eq,
        source: 'default' as const,
        spawnWeight: eq.spawnWeight ?? 1.0,  // Default to normal spawn rate
        tags: eq.tags ?? []
    }));

    manager.initializeDefaults('equipment', enhancedEquipment);
}
```

**Deliverable:** Updated default equipment initialization

---

## Phase 6: Default Equipment Updates (D&D 5e Stats)

### 6.1 Update Equipment Interface in constants.ts

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Update Equipment Interface (lines 751-756):**

```typescript
export interface Equipment {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;

    // NEW: Optional advanced properties
    properties?: Array<{
        type: string;
        target: string;
        value: number | string | boolean;
        condition?: string;
        description?: string;
    }>;

    // NEW: Features granted when equipped
    grantsFeatures?: string[];

    // NEW: Skills granted when equipped
    grantsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;

    // NEW: D&D 5e stats
    damage?: {
        dice: string;
        damageType: string;
        versatile?: string;
    };

    acBonus?: number;
    weaponProperties?: string[];

    // NEW: Spawn weight (0 = never random, still available to game logic)
    spawnWeight?: number;

    // NEW: Template ID
    templateId?: string;

    tags?: string[];
}
```

**Deliverable:** Updated Equipment interface

---

### 6.2 Populate EQUIPMENT_DATABASE with D&D 5e Stats

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`

**Update EQUIPMENT_DATABASE (lines 831-891) with full D&D 5e stats:**

```typescript
export const EQUIPMENT_DATABASE: Record<string, Equipment> = {
    // ===== WEAPONS =====

    // Martial Melee Weapons
    'Greataxe': {
        name: 'Greataxe',
        type: 'weapon',
        rarity: 'common',
        weight: 7,
        damage: { dice: '1d12', damageType: 'slashing' },
        weaponProperties: ['two-handed'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'two-handed']
    },
    'Longsword': {
        name: 'Longsword',
        type: 'weapon',
        rarity: 'common',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['versatile'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'versatile']
    },
    'Shortsword': {
        name: 'Shortsword',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'piercing', versatile: '1d8' },
        weaponProperties: ['finesse', 'light', 'versatile'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'finesse', 'light']
    },
    'Rapier': {
        name: 'Rapier',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['finesse'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'finesse']
    },
    'Quarterstaff': {
        name: 'Quarterstaff',
        type: 'weapon',
        rarity: 'common',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile', 'two-handed'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'versatile']
    },
    'Mace': {
        name: 'Mace',
        type: 'weapon',
        rarity: 'common',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'versatile']
    },
    'Handaxe': {
        name: 'Handaxe',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'slashing' },
        weaponProperties: ['light', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'thrown', 'light']
    },
    'Dagger': {
        name: 'Dagger',
        type: 'weapon',
        rarity: 'common',
        weight: 1,
        damage: { dice: '1d4', damageType: 'piercing', versatile: '1d6' },
        weaponProperties: ['finesse', 'light', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'finesse', 'light', 'thrown']
    },
    'Dart': {
        name: 'Dart',
        type: 'weapon',
        rarity: 'common',
        weight: 0.25,
        damage: { dice: '1d4', damageType: 'piercing' },
        weaponProperties: ['finesse', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'ranged', 'thrown', 'finesse']
    },
    'Javelin': {
        name: 'Javelin',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['thrown', 'range_30_120'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'thrown']
    },
    'Light Crossbow': {
        name: 'Light Crossbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 5,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_80_320', 'two-handed', 'loading'],
        spawnWeight: 1.0,
        tags: ['simple', 'ranged', 'two-handed', 'ammunition']
    },
    'Hand Crossbow': {
        name: 'Hand Crossbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 3,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_30_120', 'light', 'loading'],
        spawnWeight: 1.0,
        tags: ['martial', 'ranged', 'light', 'ammunition']
    },
    'Longbow': {
        name: 'Longbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 2,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_150_600', 'two-handed', 'heavy'],
        spawnWeight: 1.0,
        tags: ['martial', 'ranged', 'two-handed', 'ammunition', 'heavy']
    },
    'Martial Melee Weapon': {
        name: 'Martial Melee Weapon',
        type: 'weapon',
        rarity: 'common',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing' },
        weaponProperties: ['versatile'],
        spawnWeight: 0.5,  // Less common (generic weapon)
        tags: ['martial', 'melee', 'versatile', 'generic']
    },

    // ===== ARMOR =====

    'No Armor': {
        name: 'No Armor',
        type: 'armor',
        rarity: 'common',
        weight: 0,
        acBonus: 10,  // Base AC from DEX alone
        spawnWeight: 1.0,
        tags: ['armor', 'light', 'no_armor']
    },
    'Leather Armor': {
        name: 'Leather Armor',
        type: 'armor',
        rarity: 'common',
        weight: 10,
        acBonus: 11,  // 11 + DEX (no max)
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 11, description: 'Base AC: 11 + DEX' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'light']
    },
    'Scale Mail': {
        name: 'Scale Mail',
        type: 'armor',
        rarity: 'common',
        weight: 45,
        acBonus: 14,  // 14 + DEX (max 2)
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 14, description: 'Base AC: 14 + DEX (max 2)' },
            { type: 'special_property', target: 'stealth_disadvantage', value: true, description: 'Stealth disadvantage' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'medium']
    },
    'Chain Mail': {
        name: 'Chain Mail',
        type: 'armor',
        rarity: 'common',
        weight: 55,
        acBonus: 16,  // Fixed AC, no DEX
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 16, description: 'Fixed AC: 16' },
            { type: 'special_property', target: 'stealth_disadvantage', value: true, description: 'Stealth disadvantage' },
            { type: 'stat_requirement', target: 'STR', value: 13, description: 'Requires STR 13' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'heavy']
    },
    'Plate Armor': {
        name: 'Plate Armor',
        type: 'armor',
        rarity: 'rare',
        weight: 65,
        acBonus: 18,  // Fixed AC, no DEX
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 18, description: 'Fixed AC: 18' },
            { type: 'special_property', target: 'stealth_disadvantage', value: true, description: 'Stealth disadvantage' },
            { type: 'stat_requirement', target: 'STR', value: 15, description: 'Requires STR 15' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'heavy', 'rare']
    },
    'Shield': {
        name: 'Shield',
        type: 'armor',
        rarity: 'common',
        weight: 6,
        acBonus: 2,
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 2, description: '+2 AC bonus' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'shield']
    },

    // ===== ITEMS & GEAR =====

    'Spellbook': {
        name: 'Spellbook',
        type: 'item',
        rarity: 'uncommon',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'arcane', 'spellbook']
    },
    'Holy Symbol': {
        name: 'Holy Symbol',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'divine', 'focus']
    },
    'Arcane Focus': {
        name: 'Arcane Focus',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'arcane', 'focus']
    },
    'Druidic Focus': {
        name: 'Druidic Focus',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'druid', 'focus']
    },
    'Component Pouch': {
        name: 'Component Pouch',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'components']
    },
    'Lute': {
        name: 'Lute',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'instrument', 'bard']
    },
    'Thieves\' Tools': {
        name: 'Thieves\' Tools',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        grantsSkills: [{ skillId: 'thieves_tools', level: 'proficient' }],
        spawnWeight: 1.0,
        tags: ['gear', 'tools', 'dexterity']
    },
    'Healer\'s Kit': {
        name: 'Healer\'s Kit',
        type: 'item',
        rarity: 'common',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'healing', 'consumable']
    },
    'Bedroll': {
        name: 'Bedroll',
        type: 'item',
        rarity: 'common',
        weight: 10,
        spawnWeight: 1.0,
        tags: ['gear', 'camp', 'comfort']
    },
    'Rope': {
        name: 'Rope',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'utility', 'climbing']
    },
    'Backpack': {
        name: 'Backpack',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'container', 'storage']
    },
    'Torch': {
        name: 'Torch',
        type: 'item',
        rarity: 'common',
        weight: 1,
        properties: [
            { type: 'special_property', target: 'light', value: 'bright_light_20ft', description: 'Sheds bright light 20ft, dim 20ft' }
        ],
        spawnWeight: 1.0,
        tags: ['gear', 'light', 'consumable']
    },
    'Waterskin': {
        name: 'Waterskin',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'container', 'water']
    },
    'Ink & Quill': {
        name: 'Ink & Quill',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'writing', 'consumable']
    },

    // ===== ADVENTURE PACKS =====

    'Burglar\'s Pack': {
        name: 'Burglar\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 44,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'rogue']
    },
    'Explorer\'s Pack': {
        name: 'Explorer\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 59,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'general']
    },
    'Entertainer\'s Pack': {
        name: 'Entertainer\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 58,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'bard']
    },
    'Priest\'s Pack': {
        name: 'Priest\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 33,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'cleric']
    },
    'Dungeon Delver\'s Pack': {
        name: 'Dungeon Delver\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 48,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'dungeon']
    },
    'Dungeoneer\'s Pack': {
        name: 'Dungeoneer\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 48,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'dungeon']
    },
    'Scholar\'s Pack': {
        name: 'Scholar\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 49,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'wizard']
    },
    'Traveler\'s Pack': {
        name: 'Traveler\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 64,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'general']
    },

    // ===== AMMUNITION =====

    'Arrow': {
        name: 'Arrow',
        type: 'item',
        rarity: 'common',
        weight: 0.05,
        spawnWeight: 1.0,
        tags: ['ammunition', 'bow']
    },
    'Bolt': {
        name: 'Bolt',
        type: 'item',
        rarity: 'common',
        weight: 0.075,
        spawnWeight: 1.0,
        tags: ['ammunition', 'crossbow']
    },

    // ===== SPECIAL ITEMS =====

    'Insignia': {
        name: 'Insignia',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'roleplay', 'insignia']
    },
    'Martial Arts': {
        name: 'Martial Arts',
        type: 'weapon',
        rarity: 'common',
        weight: 0,
        damage: { dice: '1d4', damageType: 'bludgeoning', versatile: '1d6' },
        weaponProperties: ['finesse', 'unarmed'],
        spawnWeight: 1.0,
        tags: ['monk', 'unarmed', 'natural']
    },
};
```

**Deliverable:** Complete D&D 5e equipment database

---

### 6.3 Create Example Magic Items

**File:** `/Users/jasondesante/playlist-data-engine/src/utils/magicItemExamples.ts` (NEW)

**Examples demonstrating all capabilities:** (See full examples in plan - includes Flame Tongue, Vorpal Sword, Mithral Shirt, Boots of Speed, cursed items, etc.)

**Deliverable:** Complete magic item examples with all capabilities demonstrated

---

## Phase 7: Equipment Modification System

### 7.1 Create EquipmentModifier

**File:** `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentModifier.ts` (NEW)

**Key Methods:**

```typescript
export class EquipmentModifier {
    /**
     * Enchant equipment with new properties (creates per-instance modification)
     */
    static enchant(
        equipment: CharacterEquipment,
        itemName: string,
        enchantment: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    /**
     * Apply a template modification to equipment
     * Template-based: Creates new item based on template
     */
    static applyTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    /**
     * Curse equipment with negative effects
     */
    static curse(
        equipment: CharacterEquipment,
        itemName: string,
        curse: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    /**
     * Upgrade equipment (improve existing properties)
     */
    static upgrade(
        equipment: CharacterEquipment,
        itemName: string,
        upgrade: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    /**
     * Remove a modification
     */
    static removeModification(
        equipment: CharacterEquipment,
        itemName: string,
        modificationId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    /**
     * Get modification history for an item
     */
    static getModificationHistory(
        equipment: CharacterEquipment,
        itemName: string
    ): EquipmentModification[];

    /**
     * Get all active effects from an item (base + modifications)
     */
    static getCombinedEffects(
        equipment: CharacterEquipment,
        itemName: string,
        instanceId?: string
    ): EquipmentProperty[];

    /**
     * Check if item has a specific template
     */
    static hasTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string
    ): boolean;
}
```

**Modification Logic:**
- Template modifications create new equipment with template properties
- Per-instance modifications stored in `modifications` array
- Each modification gets unique ID
- Combined effects calculated from base + all modifications
- Modifications can be removed individually

**Deliverable:** Complete EquipmentModifier class

---

## Phase 8: Helper Functions (Batch Spawning)

### 8.1 Create EquipmentSpawnHelper

**File:** `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentSpawnHelper.ts` (NEW)

**Purpose:** Helper functions for spawning multiple equipment items at once (not a full loot system)

```typescript
export class EquipmentSpawnHelper {
    /**
     * Spawn multiple items from an array of equipment names
     */
    static spawnFromList(
        itemNames: string[],
        rng?: SeededRNG
    ): EnhancedEquipment[];

    /**
     * Spawn items by rarity
     */
    static spawnByRarity(
        rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
        count: number,
        rng?: SeededRNG
    ): EnhancedEquipment[];

    /**
     * Spawn items by tags
     */
    static spawnByTags(
        tags: string[],
        count: number,
        rng?: SeededRNG
    ): EnhancedEquipment[];

    /**
     * Spawn random equipment (respects spawn weights)
     */
    static spawnRandom(
        count: number,
        rng: SeededRNG,
        options?: {
            excludeZeroWeight?: boolean;  // Exclude items with spawnWeight: 0
            includeTypes?: ('weapon' | 'armor' | 'item')[];
            minRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
        }
    ): EnhancedEquipment[];

    /**
     * Spawn equipment from a template
     */
    static spawnFromTemplate(
        templateId: string,
        baseItemName?: string
    ): EnhancedEquipment | null;

    /**
     * Spawn treasure hoard (simplified, not full D&D 5e table)
     */
    static spawnTreasureHoard(
        cr: number,  // Challenge rating for scaling
        rng: SeededRNG
    ): EnhancedEquipment[];

    /**
     * Add spawned equipment to character
     */
    static addToCharacter(
        character: CharacterSheet,
        items: EnhancedEquipment[],
        equip?: boolean
    ): CharacterSheet;
}
```

**Deliverable:** Complete equipment spawn helper functions

---

## Phase 9: Integration with Existing Systems

### 9.1 Update CharacterGenerator

**File:** `/Users/jasondesante/playlist-data-engine/src/core/generation/CharacterGenerator.ts`

**Changes Required:**

1. **Import EquipmentEffectApplier:**
```typescript
import { EquipmentEffectApplier } from '../equipment/EquipmentEffectApplier.js';
```

2. **Apply Equipment Effects After Initialization (around line 305-310):**

```typescript
// After equipment initialization, apply equipment effects
if (equipment) {
    const equippedItems = [
        ...equipment.weapons.filter(item => item.equipped),
        ...equipment.armor.filter(item => item.equipped),
        ...equipment.items.filter(item => item.equipped)
    ];

    for (const item of equippedItems) {
        const equipData = EquipmentGenerator.getEquipmentData(item.name);
        if (equipData) {
            const instanceId = (item as EnhancedInventoryItem).instanceId;
            EquipmentEffectApplier.equipItem(character, equipData, instanceId);
        }
    }
}
```

**Deliverable:** Updated CharacterGenerator with equipment effects

---

### 9.2 Update LevelUpProcessor

**File:** `/Users/jasondesante/playlist-data-engine/src/core/progression/LevelUpProcessor.ts`

**Add Equipment Effect Reapplication:**

```typescript
import { EquipmentEffectApplier } from '../equipment/EquipmentEffectApplier.js';

// Add new private method
private static reapplyEquipmentEffects(character: CharacterSheet): void {
    if (!character.equipment) return;

    // Re-apply all equipped item effects
    const allEquipped = [
        ...character.equipment.weapons.filter(item => item.equipped),
        ...character.equipment.armor.filter(item => item.equipped),
        ...character.equipment.items.filter(item => item.equipped)
    ];

    for (const item of allEquipped) {
        const equipData = EquipmentGenerator.getEquipmentData(item.name);
        if (equipData) {
            const instanceId = (item as EnhancedInventoryItem).instanceId;
            EquipmentEffectApplier.equipItem(character, equipData, instanceId);
        }
    }
}

// Call after level-up effects (in processLevelUp method)
this.reapplyEquipmentEffects(character);
```

**Deliverable:** Updated LevelUpProcessor with equipment effect reapplication

---

### 9.3 Update FeatureRegistry Integration

**File:** `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureRegistry.ts`

**Add Equipment Feature Support:**

```typescript
/**
 * Get features granted by equipment
 * Equipment features have source: 'equipment'
 */
static getEquipmentFeatures(
    equipmentName: string
): ClassFeature[];

/**
 * Check if a feature can be granted by equipment
 * Features with spawnWeight: 0 are still valid for equipment
 */
static isValidEquipmentFeature(
    featureId: string
): boolean;

/**
 * Register an equipment-granted feature
 * These features have special handling (only active when equipped)
 */
static registerEquipmentFeature(
    feature: ClassFeature
): void;
```

**Deliverable:** Updated FeatureRegistry with equipment support

---

## Phase 10: Migration & Backward Compatibility

### 10.1 Create EquipmentMigration

**File:** `/Users/jasondesante/playlist-data-engine/src/core/migration/EquipmentMigration.ts` (NEW)

**Key Methods:**

```typescript
export class EquipmentMigration {
    /**
     * Migrate character's equipment to enhanced format
     */
    static migrateEquipment(character: CharacterSheet): MigrationResult;

    /**
     * Add default properties to legacy equipment items
     */
    private static addDefaultProperties(
        item: InventoryItem
    ): EnhancedInventoryItem;

    /**
     * Initialize equipment_effects array if missing
     */
    private static initializeEquipmentEffects(
        character: CharacterSheet
    ): void;

    /**
     * Apply default D&D 5e stats to legacy equipment
     * Looks up in EQUIPMENT_DATABASE and adds damage/AC/properties
     */
    private static applyDefaultStats(
        itemName: string
    ): Partial<EnhancedEquipment>;

    /**
     * Generate instance IDs for inventory items
     */
    private static generateInstanceIds(
        equipment: CharacterEquipment
    ): CharacterEquipment;
}

interface MigrationResult {
    success: boolean;
    changes: string[];
    errors?: string[];
}
```

**Deliverable:** Complete equipment migration system

---

### 10.2 Update CharacterMigration

**File:** `/Users/jasondesante/playlist-data-engine/src/core/migration/CharacterMigration.ts`

**Add Equipment Migration:**

```typescript
import { EquipmentMigration } from './EquipmentMigration.js';

// In migrateToCurrent() method:
// Migrate equipment system
if (character.equipment) {
    const equipmentResult = EquipmentMigration.migrateEquipment(character);
    if (equipmentResult.changes.length > 0) {
        result.changes.push(...equipmentResult.changes);
    }
    if (equipmentResult.errors && equipmentResult.errors.length > 0) {
        result.errors.push(...equipmentResult.errors);
    }
}

// Initialize equipment_effects if missing
if (!character.equipment_effects) {
    character.equipment_effects = [];
    result.changes.push('Initialized equipment_effects array');
}
```

**Deliverable:** Updated CharacterMigration with equipment support

---

## Phase 11: Testing

### 11.1 Unit Tests

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentEffectApplier.test.ts` (NEW)

**Test Coverage:**
- [ ] Apply equipment effects when equipping
- [ ] Remove equipment effects when unequipping
- [ ] Apply equipment-granted features
- [ ] Remove equipment-granted features
- [ ] Apply equipment-granted skills
- [ ] Remove equipment-granted skills
- [ ] Handle stat bonuses from equipment
- [ ] Handle ability unlocks from equipment
- [ ] Handle passive modifiers from equipment
- [ ] Track equipment effect sources correctly
- [ ] Re-apply all equipment effects
- [ ] Handle multiple equipment with same effects
- [ ] Handle equipment with no effects
- [ ] Handle instance ID tracking
- [ ] Handle template-based equipment

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentValidator.test.ts` (NEW)

**Test Coverage:**
- [ ] Validate valid equipment
- [ ] Reject equipment with invalid properties
- [ ] Reject equipment with invalid feature references
- [ ] Reject equipment with invalid skill references
- [ ] Validate property types
- [ ] Validate property values
- [ ] Validate damage information
- [ ] Validate AC bonuses
- [ ] Validate spawn weights (including 0)
- [ ] Validate template IDs
- [ ] Validate modification structures

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentModifier.test.ts` (NEW)

**Test Coverage:**
- [ ] Enchant equipment with properties
- [ ] Curse equipment with negative effects
- [ ] Upgrade equipment properties
- [ ] Apply template modifications
- [ ] Remove modifications
- [ ] Track modification history
- [ ] Apply multiple modifications
- [ ] Handle conflicting modifications
- [ ] Get combined effects
- [ ] Check for templates

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentMigration.test.ts` (NEW)

**Test Coverage:**
- [ ] Migrate old format equipment
- [ ] Add default properties to legacy items
- [ ] Initialize equipment_effects array
- [ ] Preserve existing equipment during migration
- [ ] Handle equipment without properties
- [ ] Generate instance IDs
- [ ] Apply default D&D 5e stats

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentSpawnHelper.test.ts` (NEW)

**Test Coverage:**
- [ ] Spawn from list of names
- [ ] Spawn by rarity
- [ ] Spawn by tags
- [ ] Spawn random with weights
- [ ] Spawn from template
- [ ] Spawn treasure hoard
- [ ] Add to character
- [ ] Respect spawn weights
- [ ] Exclude zero-weight items
- [ ] Handle invalid template IDs

**Update:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentGenerator.test.ts`

**Additional Tests:**
- [ ] Test equipment effect integration
- [ ] Test equipment modification methods
- [ ] Test getActiveEffects method
- [ ] Test enhanced inventory items
- [ ] Test instance ID handling

**Deliverable:** Complete unit test coverage

---

### 11.2 Integration Tests

**File:** `/Users/jasondesante/playlist-data-engine/tests/integration/equipmentSystem.integration.test.ts` (NEW)

**Test Scenarios:**
- [ ] Generate character with starting equipment
- [ ] Verify equipment effects applied
- [ ] Equip item and verify effects
- [ ] Unequip item and verify effects removed
- [ ] Enchant equipment and verify new effects
- [ ] Apply template modification
- [ ] Level up character and verify equipment effects persist
- [ ] Save and load character with equipment effects
- [ ] Register custom equipment with properties
- [ ] Use custom equipment in character generation
- [ ] Test equipment-granted features
- [ ] Test equipment-granted skills
- [ ] Test multiple equipment with stacking effects
- [ ] Test zero spawn weight items (game logic only)
- [ ] Test instance-specific modifications

**File:** `/Users/jasondesante/playlist-data-engine/tests/integration/customEquipment.integration.test.ts` (NEW)

**Test Scenarios:**
- [ ] Register custom equipment via ExtensionManager
- [ ] Validate custom equipment properties
- [ ] Generate character with custom equipment
- [ ] Apply custom equipment effects
- [ ] Test custom equipment with features
- [ ] Test custom equipment with skills
- [ ] Test spawn rate control for custom equipment
- [ ] Test custom equipment templates
- [ ] Test custom equipment modifications
- [ ] Test zero spawn weight custom equipment

**File:** `/Users/jasondesante/playlist-data-engine/tests/integration/equipmentMigration.integration.test.ts` (NEW)

**Test Scenarios:**
- [ ] Migrate character from old format
- [ ] Verify equipment effects after migration
- [ ] Test migration of equipped items
- [ ] Test migration of unequipped items
- [ ] Verify instance IDs generated
- [ ] Verify default stats applied
- [ ] Test migration with custom equipment
- [ ] Test migration with modifications

**Deliverable:** Complete integration test coverage

---

## Phase 12: Documentation

### 12.1 Reference Documentation

**File:** `/Users/jasondesante/playlist-data-engine/docs/EQUIPMENT_SYSTEM.md` (NEW)

**Sections:**
1. **Overview**: Equipment system architecture and capabilities
2. **Equipment Properties**: Available property types and usage
3. **Equipment Effects**: How effects are applied and removed
4. **Enhanced Equipment**: Creating equipment with properties
5. **Equipment-Granted Features**: How equipment grants features
6. **Equipment-Granted Skills**: How equipment grants skills
7. **Equipment Modification**: Enchanting, cursing, upgrading
8. **Templates vs Instances**: Template-based and per-instance modifications
9. **Spawn Weights**: Weight-based spawning (0 = never random)
10. **Custom Equipment**: Registering custom equipment
11. **API Reference**: Complete API documentation
12. **Examples**: Code examples for common use cases
13. **Migration Guide**: Migrating from old equipment system

**Deliverable:** Complete reference documentation

---

### 12.2 Migration Guide

**File:** `/Users/jasondesante/playlist-data-engine/docs/EQUIPMENT_MIGRATION.md` (NEW)

**Sections:**
1. **Breaking Changes**: What changed in equipment system
2. **Migration Steps**: How to update existing characters
3. **Code Updates**: How to update code using equipment
4. **Testing**: How to test migrated characters
5. **Rollback**: How to rollback if needed
6. **Common Issues**: Solutions to common migration problems

**Deliverable:** Complete migration guide

---

### 12.3 Update Main Documentation

**File:** `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md`

**Add Section:**
```markdown
## Equipment System (Enhanced)

### Equipment Properties
Equipment can now have advanced properties that affect gameplay:
- **stat_bonus**: +1 STR, +2 DEX, etc.
- **skill_proficiency**: Proficiency or expertise in skills
- **ability_unlock**: Darkvision, flight, etc.
- **passive_modifier**: Damage resistance, speed bonus, AC bonus
- **special_property**: Finesse, versatile, two-handed, etc.
- **damage_bonus**: +1d6 fire damage, etc.

### Equipment-Granted Features
Equipment can grant features that are only active when the item is equipped.
Features are tracked separately from class features and removed when unequipped.

### Equipment-Granted Skills
Equipment can grant skill proficiencies or expertise.
Skills are active only while the item is equipped.

### D&D 5e Standard Stats
All default equipment now includes D&D 5e standard stats:
- Weapons: Damage dice, damage type, weapon properties
- Armor: AC bonus, special properties (stealth disadvantage, etc.)

### Spawn Weights
Equipment can have spawn weights:
- 0 = Never randomly spawned (still available to game logic)
- 1+ = Can appear randomly (higher = more common)

### Equipment Modification
Equipment can be modified:
- **Templates**: Pre-defined enchantments (Flaming Sword, +1 Weapon, etc.)
- **Per-Instance**: Unique modifications to individual items
- **Curses**: Negative effects that can be applied

### Custom Equipment
Custom equipment can be registered via ExtensionManager with full property support.

### Helper Functions
`EquipmentSpawnHelper` provides utilities for batch equipment spawning.
```

**File:** `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_UPGRADE_PLAN.md`

**Add Section (at end):**
```markdown
---

## Phase 16: Advanced Equipment System (NEW)

### Overview
Add advanced equipment properties, effects, and modification capabilities.

### Key Features:
- Equipment properties (stat bonuses, skills, abilities, modifiers)
- Equipment-granted features and skills
- D&D 5e standard stats for all equipment
- Template-based and per-instance modifications
- Weight-based spawning (0 = never random)
- Helper functions for batch spawning
- Full ExtensionManager integration

### Documentation:
- UPGRADE_PLAN_PART_2.md - Detailed upgrade plan
- docs/EQUIPMENT_SYSTEM.md - Reference documentation
- docs/EQUIPMENT_MIGRATION.md - Migration guide

### Status: PLANNED
```

**Deliverable:** Updated main documentation

---

### 12.4 Update Usage Documentation

**File:** `/Users/jasondesante/playlist-data-engine/USAGE_IN_OTHER_PROJECTS.md`

**Add Section:**
```markdown
## Equipment System Usage

### Using Enhanced Equipment

The enhanced equipment system provides several new capabilities:

#### Registering Custom Equipment with Properties

\`\`\`typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register a magic sword with fire damage
manager.register('equipment', [{
    name: 'Flame Tongue',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'fire_damage',
            value: 6,
            description: '+1d6 fire damage'
        }
    ],
    grantsFeatures: ['fire_resistance'],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'fire']
}]);
\`\`\`

#### Equipment Modification (Enchanting)

\`\`\`typescript
import { EquipmentModifier } from 'playlist-data-engine';

// Enchant an item with +1
const enchantment = {
    id: 'plus_one_001',
    name: '+1 Weapon',
    properties: [
        { type: 'passive_modifier', target: 'attack_roll', value: 1 },
        { type: 'passive_modifier', target: 'damage_roll', value: 1 }
    ],
    appliedAt: new Date().toISOString(),
    source: 'enchantment'
};

EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    enchantment,
    character
);
\`\`\`

#### Batch Spawning Equipment

\`\`\`typescript
import { EquipmentSpawnHelper } from 'playlist-data-engine';
import { SeededRNG } from 'playlist-data-engine';

const rng = new SeededRNG('loot_seed');

// Spawn 3 random uncommon items
const items = EquipmentSpawnHelper.spawnByRarity('uncommon', 3, rng);

// Spawn treasure hoard for CR 5
const treasure = EquipmentSpawnHelper.spawnTreasureHoard(5, rng);

// Add to character
EquipmentSpawnHelper.addToCharacter(character, items, false);
\`\`\`

### Breaking Changes from Equipment Upgrade

1. **Equipment Interface Extended**: The `Equipment` interface now has optional properties:
   - `damage?: { dice: string; damageType: string; versatile?: string }`
   - `acBonus?: number`
   - `weaponProperties?: string[]`
   - `properties?: EquipmentProperty[]`
   - `grantsFeatures?: string[]`
   - `grantsSkills?: Array<{skillId: string; level: 'proficient' | 'expertise'}>`
   - `spawnWeight?: number`

2. **Character.equipment_effects Added**: Characters now track equipment-granted effects separately from feature effects

3. **InventoryItem Enhanced**: Inventory items now support per-instance modifications

### Migration Notes

If using this engine in another project:
1. Update any custom equipment definitions to include new optional properties
2. Re-run character migrations if using saved characters
3. Update any code that directly accesses equipment to handle new structure
```

**Deliverable:** Updated usage documentation with equipment examples

---

## Phase 13: Examples & Demos

### 13.1 Create Example Custom Equipment

**File:** `/Users/jasondesante/playlist-data-engine/examples/customEquipmentExamples.ts` (NEW)

**Examples:**

```typescript
import { ExtensionManager } from './src/core/extensions/ExtensionManager.js';
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// Example 1: Magic weapon with fire damage
const flameTongue: EnhancedEquipment = {
    name: 'Flame Tongue',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'fire_damage',
            value: 6,
            description: '+1d6 fire damage on hit'
        }
    ],
    grantsFeatures: ['fire_resistance'],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'fire', 'weapon']
};

// Register custom equipment
const manager = ExtensionManager.getInstance();
manager.register('equipment', [flameTongue], {
    mode: 'relative',
    weights: { 'Flame Tongue': 0.5 },
    validate: true
});
```

**Deliverable:** Complete example custom equipment

---

### 13.2 Create Equipment Enchantment Demo

**File:** `/Users/jasondesante/playlist-data-engine/examples/equipmentEnchantmentDemo.ts` (NEW)

**Example:**

```typescript
import { EquipmentModifier } from './src/core/equipment/EquipmentModifier.js';
import type { EquipmentModification } from './src/core/types/Equipment.js';

// Enchant a weapon with +1
const plusOneEnchantment: EquipmentModification = {
    id: 'plus_one_sword_001',
    name: '+1 Longsword',
    properties: [
        {
            type: 'passive_modifier',
            target: 'attack_roll',
            value: 1,
            description: '+1 to attack rolls'
        }
    ],
    appliedAt: new Date().toISOString(),
    source: 'enchantment'
};

// Apply enchantment
function enchantWeapon(character: CharacterSheet, weaponName: string): void {
    EquipmentModifier.enchant(
        character.equipment!,
        weaponName,
        plusOneEnchantment,
        character
    );
}
```

**Deliverable:** Complete enchantment demo

---

### 13.3 Create Batch Spawning Demo

**File:** `/Users/jasondesante/playlist-data-engine/examples/batchSpawningDemo.ts` (NEW)

**Example:**

```typescript
import { EquipmentSpawnHelper } from './src/core/equipment/EquipmentSpawnHelper.js';
import { SeededRNG } from './src/core/randomness/SeededRNG.js';

// Spawn random treasure
const rng = new SeededRNG('treasure_seed');
const treasure = EquipmentSpawnHelper.spawnTreasureHoard(5, rng);
```

**Deliverable:** Complete batch spawning demo

---

## Implementation Summary

### Key Files to Create

1. **Type Definitions**
   - `/Users/jasondesante/playlist-data-engine/src/core/types/Equipment.ts` - All equipment type definitions

2. **Core Equipment System**
   - `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentEffectApplier.ts` - Effect application/removal
   - `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentValidator.ts` - Equipment validation
   - `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentModifier.ts` - Equipment modification
   - `/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentSpawnHelper.ts` - Batch spawning helpers

3. **Examples & Data**
   - `/Users/jasondesante/playlist-data-engine/src/utils/magicItemExamples.ts` - Example magic items and templates
   - `/Users/jasondesante/playlist-data-engine/examples/customEquipmentExamples.ts` - Custom equipment examples
   - `/Users/jasondesante/playlist-data-engine/examples/equipmentEnchantmentDemo.ts` - Enchantment demo
   - `/Users/jasondesante/playlist-data-engine/examples/batchSpawningDemo.ts` - Batch spawning demo

4. **Migration**
   - `/Users/jasondesante/playlist-data-engine/src/core/migration/EquipmentMigration.ts` - Equipment migration

5. **Documentation**
   - `/Users/jasondesante/playlist-data-engine/docs/EQUIPMENT_SYSTEM.md` - Reference documentation
   - `/Users/jasondesante/playlist-data-engine/docs/EQUIPMENT_MIGRATION.md` - Migration guide

### Key Files to Modify

1. **Type Definitions**
   - `/Users/jasondesante/playlist-data-engine/src/core/types/Character.ts` - Add equipment_effects field

2. **Equipment System**
   - `/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts` - Add effect support and modification methods
   - `/Users/jasondesante/playlist-data-engine/src/utils/constants.ts` - Update Equipment interface and populate EQUIPMENT_DATABASE with D&D 5e stats

3. **Character Generation**
   - `/Users/jasondesante/playlist-data-engine/src/core/generation/CharacterGenerator.ts` - Apply equipment effects during generation
   - `/Users/jasondesante/playlist-data-engine/src/core/progression/LevelUpProcessor.ts` - Reapply equipment effects on level-up

4. **Extensibility**
   - `/Users/jasondesante/playlist-data-engine/src/core/extensions/ExtensionManager.ts` - Add equipment categories and validation
   - `/Users/jasondesante/playlist-data-engine/src/core/extensions/initializeDefaults.ts` - Update default initialization
   - `/Users/jasondesante/playlist-data-engine/src/core/features/FeatureRegistry.ts` - Add equipment feature support

5. **Migration**
   - `/Users/jasondesante/playlist-data-engine/src/core/migration/CharacterMigration.ts` - Add equipment migration

6. **Main Documentation**
   - `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md` - Add equipment system section
   - `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_UPGRADE_PLAN.md` - Add Phase 16 reference

---

## Complete Phase Checklist

### Phase 1: Research & Analysis
- [x] Document current equipment architecture
- [x] Analyze existing effect systems
- [x] Review ExtensionManager patterns
- [x] Define enhancement requirements

### Phase 2: Interface Design
- [ ] Create Equipment.ts with all type definitions
- [ ] Update Character.ts with equipment_effects
- [ ] Define all interfaces clearly

### Phase 3: EquipmentEffect System
- [ ] Create EquipmentEffectApplier
- [ ] Create EquipmentValidator
- [ ] Integrate with FeatureEffectApplier

### Phase 4: Update EquipmentGenerator
- [ ] Update getEquipmentData for EnhancedEquipment
- [ ] Add effect application to equipItem
- [ ] Add effect removal to unequipItem
- [ ] Add modification methods

### Phase 5: ExtensionManager Integration
- [ ] Add equipment categories
- [ ] Add equipment validation
- [ ] Update default initialization

### Phase 6: Default Equipment Updates
- [ ] Update Equipment interface in constants.ts
- [ ] Populate EQUIPMENT_DATABASE with D&D 5e stats
- [ ] Create example magic items

### Phase 7: Equipment Modification System
- [ ] Create EquipmentModifier class
- [ ] Define common enchantments and curses
- [ ] Support templates and per-instance modifications

### Phase 8: Helper Functions
- [ ] Create EquipmentSpawnHelper
- [ ] Implement batch spawning methods
- [ ] Implement treasure hoard generation

### Phase 9: Integration with Existing Systems
- [ ] Update CharacterGenerator
- [ ] Update LevelUpProcessor
- [ ] Update FeatureRegistry

### Phase 10: Migration & Backward Compatibility
- [ ] Create EquipmentMigration
- [ ] Update CharacterMigration
- [ ] Test backward compatibility

### Phase 11: Testing
- [ ] Write unit tests for EquipmentEffectApplier
- [ ] Write unit tests for EquipmentValidator
- [ ] Write unit tests for EquipmentModifier
- [ ] Write unit tests for EquipmentMigration
- [ ] Write unit tests for EquipmentSpawnHelper
- [ ] Update existing tests
- [ ] Write integration tests
- [ ] Test migration paths

### Phase 12: Documentation
- [ ] Write EQUIPMENT_SYSTEM.md
- [ ] Write EQUIPMENT_MIGRATION.md
- [ ] Update DATA_ENGINE_REFERENCE.md
- [ ] Update DATA_ENGINE_UPGRADE_PLAN.md
- [ ] Update USAGE_IN_OTHER_PROJECTS.md with equipment usage examples

### Phase 13: Examples & Demos
- [ ] Create customEquipmentExamples.ts
- [ ] Create equipmentEnchantmentDemo.ts
- [ ] Create batchSpawningDemo.ts
- [ ] Create comprehensive usage examples

---

## Critical Files for Implementation (Top 5)

Based on this plan, the 5 most critical files for implementing the equipment upgrade are:

1. **`/Users/jasondesante/playlist-data-engine/src/core/types/Equipment.ts`** - Core type definitions; all other files depend on these interfaces

2. **`/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentEffectApplier.ts`** - Handles applying/removing equipment effects; central to the entire enhancement system

3. **`/Users/jasondesante/playlist-data-engine/src/core/generation/EquipmentGenerator.ts`** - Main equipment management class; needs integration with effect system

4. **`/Users/jasondesante/playlist-data-engine/src/utils/constants.ts`** - Contains EQUIPMENT_DATABASE that needs updating with D&D 5e stats

5. **`/Users/jasondesante/playlist-data-engine/src/core/equipment/EquipmentModifier.ts`** - Handles equipment modification; enables enchanting and customization

---

## Notes for Implementation

1. **Backward Compatibility Priority**: Ensure all old character files can be migrated without data loss

2. **Feature Spawn Weights**: Remember that 0 spawn weight means "never random" but "still available to game logic"

3. **Template vs Instance**: Support both approaches - templates for common enchantments, instances for unique modifications

4. **Effect Tracking**: Keep equipment effects separate from feature effects for proper removal when unequipping

5. **Instance IDs**: Generate unique instance IDs for per-instance tracking

6. **D&D 5e Alignment**: Default equipment should use standard 5e stats for compatibility

---

## Style Note

This plan follows the same style and format as `DATA_ENGINE_UPGRADE_PLAN.md`:
- Detailed phases with specific tasks
- Checkboxes [ ] for pending items, [x] for completed items
- File paths and line numbers where changes are needed
- Code examples for clarity
- Clear deliverables for each phase
- Implementation summary with file lists
- Complete phase checklist at the end
