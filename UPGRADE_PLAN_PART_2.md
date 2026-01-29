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
    | 'spell_grant'          // Grants specific spells

/**
 * Structured condition types for equipment properties
 * Properties only apply when their condition is met
 */
export type EquipmentCondition =
    | { type: 'vs_creature_type'; value: string }           // e.g., {type: 'vs_creature_type', value: 'dragon'}
    | { type: 'at_time_of_day'; value: 'day' | 'night' | 'dawn' | 'dusk' }
    | { type: 'wielder_race'; value: string }               // e.g., {type: 'wielder_race', value: 'Elf'}
    | { type: 'wielder_class'; value: string }              // e.g., {type: 'wielder_class', value: 'Wizard'}
    | { type: 'while_equipped'; value: boolean }            // Always true when equipped (default)
    | { type: 'on_hit'; value: boolean }                    // Triggers when weapon hits
    | { type: 'on_damage_taken'; value: boolean }           // Triggers when wearer takes damage
    | { type: 'custom'; value: string; description: string }; // Game-defined condition

/**
 * Equipment property that provides mechanical benefits
 */
export interface EquipmentProperty {
    type: EquipmentPropertyType;
    target: string;
    value: number | string | boolean;
    condition?: EquipmentCondition;  // Structured condition (not freeform string)
    description?: string;
    stackable?: boolean;  // Default: true - effects always stack
}

/**
 * Inline mini-feature definition for equipment-specific abilities
 * These don't go in the main FeatureRegistry but are treated like features for this item
 */
export interface EquipmentMiniFeature {
    id: string;                  // Unique ID for this equipment-specific feature
    name: string;
    description: string;
    effects: EquipmentProperty[];  // What this mini-feature does
    source: 'equipment_inline';    // Marks this as equipment-specific (not in main registry)
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

    // NEW: Features granted when equipped
    // Can reference existing FeatureRegistry features OR define inline mini-features
    grantsFeatures?: Array<string | EquipmentMiniFeature>;

    // NEW: Skills granted when equipped
    grantsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;

    // NEW: Spells granted when equipped
    grantsSpells?: Array<{
        spellId: string;
        level?: number;  // If item grants at specific spell level
        uses?: number;   // For limited-use spell items (e.g., 1/day)
        recharge?: string;  // How it recharges (e.g., 'dawn', 'short_rest')
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
    addsFeatures?: Array<string | EquipmentMiniFeature>;  // Can reference registry OR define inline
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
 *
 * STACKING: All equipment effects stack (e.g., two +1 STR items = +2 STR total)
 */
equipment_effects?: {
    /** Equipment name providing the effect */
    source: string;

    /** Instance ID for per-instance tracking */
    instanceId?: string;

    /** Effects from this equipment */
    effects: EquipmentProperty[];

    /** Features granted by this equipment (registry features or inline mini-features) */
    features: EquipmentFeature[];

    /** Skills granted by this equipment */
    skills: EquipmentSkill[];

    /** Spells granted by this equipment */
    spells?: Array<{
        spellId: string;
        level?: number;
        uses?: number;
        recharge?: string;
    }>;
}[];
```

**Import Required:**
```typescript
import type { EquipmentProperty, EquipmentFeature, EquipmentSkill, EquipmentCondition, EquipmentMiniFeature } from './Equipment.js';
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
        condition?: { type: string; value: string | boolean };  // Structured conditions
        description?: string;
        stackable?: boolean;  // Default: true
    }>;

    // NEW: Features granted when equipped (can reference registry features or define inline mini-features)
    grantsFeatures?: Array<string | {
        id: string;
        name: string;
        description: string;
        effects: any[];
        source: 'equipment_inline';
    }>;

    // NEW: Skills granted when equipped
    grantsSkills?: Array<{
        skillId: string;
        level: 'proficient' | 'expertise';
    }>;

    // NEW: Spells granted when equipped
    grantsSpells?: Array<{
        spellId: string;
        level?: number;
        uses?: number;
        recharge?: string;
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

**Deliverable:** ~~Updated Equipment interface~~ **COMPLETE**

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

## Phase 10: Testing

### 10.1 Unit Tests

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentEffectApplier.test.ts` (NEW)

**Test Coverage:**
- [x] Apply equipment effects when equipping
- [x] Remove equipment effects when unequipping
- [x] Apply equipment-granted features
- [x] Remove equipment-granted features
- [x] Apply equipment-granted skills
- [x] Remove equipment-granted skills
- [x] Handle stat bonuses from equipment
- [x] Handle ability unlocks from equipment
- [x] Handle passive modifiers from equipment
- [x] Track equipment effect sources correctly
- [x] Re-apply all equipment effects
- [x] Handle multiple equipment with same effects
- [x] Handle equipment with no effects
- [x] Handle instance ID tracking
- [x] Handle template-based equipment

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentValidator.test.ts` (NEW)

**Test Coverage:**
- [x] Validate valid equipment
- [x] Reject equipment with invalid properties
- [x] Reject equipment with invalid feature references
- [x] Reject equipment with invalid skill references
- [x] Validate property types
- [x] Validate property values
- [x] Validate damage information
- [x] Validate AC bonuses
- [x] Validate spawn weights (including 0)
- [x] Validate template IDs
- [x] Validate modification structures

**File:** `/Users/jasondesante/playlist-data-engine/tests/unit/equipmentModifier.test.ts` (NEW)

**Test Coverage:**
- [x] Enchant equipment with properties
- [x] Curse equipment with negative effects
- [x] Upgrade equipment properties
- [x] Apply template modifications
- [x] Remove modifications
- [x] Track modification history
- [x] Apply multiple modifications
- [x] Handle conflicting modifications
- [x] Get combined effects
- [x] Check for templates

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
- [x] Test equipment effect integration
- [x] Test equipment modification methods
- [x] Test getActiveEffects method
- [x] Test enhanced inventory items
- [x] Test instance ID handling

**Deliverable:** ~~Complete unit test coverage~~ **COMPLETE** (60 tests passing in equipmentGenerator.test.ts)

---

### 10.2 Integration Tests

**File:** `/Users/jasondesante/playlist-data-engine/tests/integration/equipmentSystem.integration.test.ts` (NEW)

**Test Scenarios:**
- [x] Generate character with starting equipment
- [x] Verify equipment effects applied
- [x] Equip item and verify effects
- [x] Unequip item and verify effects removed
- [x] Enchant equipment and verify new effects
- [x] Apply template modification
- [x] Level up character and verify equipment effects persist
- [x] Save and load character with equipment effects
- [x] Register custom equipment with properties
- [x] Use custom equipment in character generation
- [x] Test equipment-granted features
- [x] Test equipment-granted skills
- [x] Test multiple equipment with stacking effects
- [x] Test zero spawn weight items (game logic only)
- [x] Test instance-specific modifications

**Deliverable:** ~~Complete integration test coverage~~ **COMPLETE** (40 tests passing)

---

## Phase 11: Documentation

### 11.1 Reference Documentation

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

**Deliverable:** Complete reference documentation

---

### 11.2 Update DATA_ENGINE_REFERENCE.md

**File:** `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md`

**Add Comprehensive Equipment Section:**

This is a MAJOR documentation update. The file needs:

1. **Complete Equipment System Reference** including:
   - Overview of all equipment capabilities
   - Full Equipment interface with all properties
   - All EquipmentProperty types with examples
   - EquipmentGenerator API reference
   - EquipmentModifier API reference
   - EquipmentSpawnHelper API reference
   - Character sheet integration

2. **Cross-reference existing features** - verify all features from original upgrade plan are documented

3. **Code examples** for every property type and API method

(Detailed content to be written during implementation - see full spec in plan file above)

**Deliverable:** Comprehensive equipment documentation in DATA_ENGINE_REFERENCE.md

---

### 11.3 Update USAGE_IN_OTHER_PROJECTS.md

**File:** `/Users/jasondesante/playlist-data-engine/USAGE_IN_OTHER_PROJECTS.md`

**Add Comprehensive Equipment Usage Section with MANY Examples:**

This needs extensive practical examples including:
- **Registering custom equipment**
- **Items that increase basic stats** (Belt of Giant Strength, Amulet of Constitution)
- **Items that increase HP** (Periapt of Wound Closure, Amulet of Health)
- **Items that increase AC** (Ring of Protection, +1 Armor)
- **Giving a sword fire damage** (2 methods: property vs feature)
- **Removing debuffs from cursed items** (disenchanting)
- **Items that grant skills** (Boots of Elvenkind - Stealth expertise)
- **Items that grant features** (Boots of Speed - freedom of movement)
- **Items that grant spells** (Ring of Spell Storing, Spell Scrolls)
- **Conditional effects** (Weapon that does extra damage vs dragons)
- **Item templates** (Flaming Sword template)
- **Multiple effects stacking** (wearing two +1 STR items = +2 STR)
- **Batch spawning examples** (treasure hoards)
- **Game-only items** (spawnWeight: 0 for unique artifacts)
- **Progressive enchantment** (enchanting an item through gameplay)
- **Complete custom magic item system** example

(Detailed content to be written during implementation - see full spec in plan file above)

**Deliverable:** Comprehensive usage documentation with many practical examples

---

## Phase 12: Examples & Demos

### 12.1 Create Example Custom Equipment

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

### 12.2 Create Stat & HP Increase Examples

**File:** `/Users/jasondesante/playlist-data-engine/examples/statIncreaseExamples.ts` (NEW)

**Examples:**

```typescript
import { ExtensionManager } from './src/core/extensions/ExtensionManager.js';
import type { EnhancedEquipment } from './src/core/types/Equipment.js';

// Example 1: Belt of Giant Strength (+2 STR)
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
            description: '+2 Strength (max 22)',
            condition: { type: 'while_equipped', value: true }
        }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'wondrous', 'strength']
};

// Example 2: Amulet of Health (+5 max HP)
const amuletOfHealth: EnhancedEquipment = {
    name: 'Amulet of Health',
    type: 'item',
    rarity: 'uncommon',
    weight: 0.1,
    properties: [
        {
            type: 'passive_modifier',
            target: 'max_hp',
            value: 5,
            description: '+5 maximum hit points',
            stackable: true  // Multiple items stack
        }
    ],
    spawnWeight: 0.3,
    source: 'custom',
    tags: ['magic', 'wondrous', 'health']
};

// Example 3: Ring of Protection (+1 AC, +1 saves)
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

// Example 4: Belt of Dwarvenkind (+2 CON, advantage on poison saves)
const beltOfDwarvenkind: EnhancedEquipment = {
    name: 'Belt of Dwarvenkind',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    properties: [
        {
            type: 'stat_bonus',
            target: 'CON',
            value: 2,
            description: '+2 Constitution'
        },
        {
            type: 'special_property',
            target: 'save_advantage',
            value: 'poison',
            description: 'Advantage on saving throws against poison'
        }
    ],
    grantsFeatures: ['poison_resistance'],
    spawnWeight: 0.15,
    source: 'custom',
    tags: ['magic', 'dwarven', 'constitution']
};

// Register all items
const manager = ExtensionManager.getInstance();
manager.register('equipment', [
    beltOfGiantStrength,
    amuletOfHealth,
    ringOfProtection,
    beltOfDwarvenkind
]);
```

**Deliverable:** Complete stat and HP increase examples

---

### 12.3 Create Equipment Enchantment Demo

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

### 12.3 Create Batch Spawning Demo

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

4. **Documentation**
   - `/Users/jasondesante/playlist-data-engine/docs/EQUIPMENT_SYSTEM.md` - Reference documentation

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

5. **Main Documentation**
   - `/Users/jasondesante/playlist-data-engine/DATA_ENGINE_REFERENCE.md` - Add comprehensive equipment system section
   - `/Users/jasondesante/playlist-data-engine/USAGE_IN_OTHER_PROJECTS.md` - Add equipment usage examples with many practical cases

---

## Complete Phase Checklist

### Phase 1: Research & Analysis
- [x] Document current equipment architecture
- [x] Analyze existing effect systems
- [x] Review ExtensionManager patterns
- [x] Define enhancement requirements

### Phase 2: Interface Design
- [x] Create Equipment.ts with all type definitions
- [x] Update Character.ts with equipment_effects
- [x] Define all interfaces clearly

### Phase 3: EquipmentEffect System
- [x] Create EquipmentEffectApplier
- [x] Create EquipmentValidator
- [x] Integrate with FeatureEffectApplier

### Phase 4: Update EquipmentGenerator
- [x] Update getEquipmentData for EnhancedEquipment
- [x] Add effect application to equipItem
- [x] Add effect removal to unequipItem
- [x] Add modification methods

### Phase 5: ExtensionManager Integration
- [x] Add equipment categories
- [x] Add equipment validation
- [x] Update default initialization

### Phase 6: Default Equipment Updates
- [x] Update Equipment interface in constants.ts
- [x] Populate EQUIPMENT_DATABASE with D&D 5e stats
- [x] Create example magic items

### Phase 7: Equipment Modification System
- [x] Create EquipmentModifier class
- [x] Define common enchantments and curses
- [x] Support templates and per-instance modifications

### Phase 8: Helper Functions
- [x] Create EquipmentSpawnHelper
- [x] Implement batch spawning methods
- [x] Implement treasure hoard generation

### Phase 9: Integration with Existing Systems
- [x] Update CharacterGenerator
- [x] Update LevelUpProcessor
- [x] Update FeatureRegistry

### Phase 10: Testing
- [x] Write unit tests for EquipmentEffectApplier
- [x] Write unit tests for EquipmentValidator
- [x] Write unit tests for EquipmentModifier
- [x] Write unit tests for EquipmentSpawnHelper
- [ ] Update existing tests
- [x] Write integration tests (equipmentSystem.integration.test.ts - 40 tests passing)

### Phase 11: Documentation
- [x] Write EQUIPMENT_SYSTEM.md (comprehensive reference)
- [ ] Update DATA_ENGINE_REFERENCE.md:
  - [ ] Add complete equipment system reference section
  - [ ] Document all EquipmentProperty types with examples
  - [ ] Document EquipmentGenerator, EquipmentModifier, EquipmentSpawnHelper APIs
  - [ ] Cross-check that all features from original upgrade plan are documented
  - [ ] Add code examples for every property type and API method
- [ ] Update USAGE_IN_OTHER_PROJECTS.md with extensive examples:
  - [ ] Registering custom equipment
  - [ ] Giving a sword fire damage (2 methods)
  - [ ] Removing debuffs from cursed items
  - [ ] Items that grant skills
  - [ ] Items that grant features
  - [ ] Items that upgrade stats
  - [ ] Conditional effects
  - [ ] Item templates
  - [ ] Spell-like effects
  - [ ] Multiple effects stacking
  - [ ] Batch spawning examples
  - [ ] Game-only items (spawnWeight: 0)
  - [ ] Progressive enchantment through game
  - [ ] Complete custom magic item system example

### Phase 12: Examples & Demos
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

1. **Feature Spawn Weights**: Remember that 0 spawn weight means "never random" but "still available to game logic"

2. **Template vs Instance**: Support both approaches - templates for common enchantments, instances for unique modifications

3. **Effect Tracking**: Keep equipment effects separate from feature effects for proper removal when unequipping

4. **Instance IDs**: Generate unique instance IDs for per-instance tracking

5. **D&D 5e Alignment**: Default equipment should use standard 5e stats for compatibility

---

## Style Note

This plan follows consistent upgrade plan documentation:
- Detailed phases with specific tasks
- Checkboxes [ ] for pending items, [x] for completed items
- File paths and line numbers where changes are needed
- Code examples for clarity
- Clear deliverables for each phase
- Implementation summary with file lists
- Complete phase checklist at the end
