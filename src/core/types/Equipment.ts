/**
 * Enhanced Equipment Type Definitions
 *
 * Defines interfaces for the Advanced Equipment System.
 *
 * These interfaces provide:
 * - Equipment properties affecting gameplay
 * - Equipment-granted features and skills
 * - D&D 5e standard stats (damage dice, AC, properties)
 * - Runtime equipment modification (templates + per-instance)
 * - Spawn weight system for generation control
 */

import type { Equipment as BaseEquipment } from '../../utils/constants.ts';

/**
 * Equipment rarity levels following D&D 5e conventions
 */
export type EquipmentRarity =
    | 'common'
    | 'uncommon'
    | 'rare'
    | 'very_rare'
    | 'legendary';

/**
 * Equipment type categories
 */
export type EquipmentType =
    | 'weapon'
    | 'armor'
    | 'item'
    | 'box';

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
    | 'stat_requirement';    // Minimum stat required to use (e.g., STR 13 for heavy armor)

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
 * These don't go in the main FeatureQuery but are treated like features for this item
 */
export interface EquipmentMiniFeature {
    id: string;                  // Unique ID for this equipment-specific feature
    name: string;
    description: string;
    effects: EquipmentProperty[];  // What this mini-feature does
    source: 'equipment_inline';    // Marks this as equipment-specific (not in main registry)
}

// ============================================================================
// BOX ITEM TYPE INTERFACES
// ============================================================================

/**
 * Pool entry for a single item that can drop from a box
 *
 * Each entry in a drop pool represents a possible item that could be
 * generated when a box is opened. The weight determines the probability
 * relative to other entries in the same pool.
 */
export interface BoxDropPool {
    /** Probability weight (weights in pool should sum to 100) */
    weight: number;
    /** Item name to spawn (must exist in equipment registry) */
    itemName?: string;
    /** Quantity if selected (e.g., 10 torches, 20 arrows) */
    quantity?: number;
    /** Gold amount instead of item (mutually exclusive with itemName) */
    gold?: number;
}

/**
 * A single "drop" - one item generated from a pool
 *
 * When a box is opened, each drop generates one item by selecting
 * from its pool using weighted random selection.
 */
export interface BoxDrop {
    /** Pool of possible items. Weights should sum to 100. */
    pool: BoxDropPool[];
}

/**
 * Box contents configuration
 *
 * Defines what a box item contains when opened. Supports both
 * guaranteed containers (like Explorer's Pack) and probability-based
 * loot boxes.
 */
export interface BoxContents {
    /** Number of drops to generate when box is opened */
    drops: BoxDrop[];
    /** Whether box is consumed on open (default: true) */
    consumeOnOpen?: boolean;
    /** Optional requirements to open this box (all must be satisfied) */
    openRequirements?: BoxOpenRequirement[];
}

/**
 * Result of opening a box
 *
 * Contains all items and gold generated from opening a box,
 * along with metadata about whether the box should be consumed.
 */
export interface BoxOpenResult {
    /** Whether the box was successfully opened */
    success: boolean;
    /** Items generated from the box (empty if not opened) */
    items: BaseEquipment[];
    /** Gold generated from the box */
    gold: number;
    /** Whether the box should be consumed */
    consumeBox: boolean;
    /** Error if box could not be opened */
    error?: BoxOpenError;
    /** Items consumed to open the box */
    consumedItems?: { name: string; quantity: number }[];
}

/**
 * A single requirement that must be met to open a box
 *
 * Represents an item (and quantity) that must be consumed from inventory.
 * Gold requirements use a "Gold Coin" item with quantity.
 */
export interface BoxOpenRequirement {
    /** Item name that must be consumed (must exist in character inventory) */
    itemName: string;
    /** Quantity of item required (default: 1) */
    quantity?: number;
}

/**
 * Error returned when box cannot be opened due to unmet requirements
 */
export interface BoxOpenError {
    /** Error code for programmatic handling */
    code: 'MISSING_ITEM' | 'INSUFFICIENT_QUANTITY' | 'NO_BOX_CONTENTS';
    /** Human-readable error message */
    message: string;
    /** The requirement that was not met */
    requirement?: BoxOpenRequirement;
}

// ============================================================================
// END BOX ITEM TYPE INTERFACES
// ============================================================================

/**
 * Enhanced equipment interface with optional advanced properties
 *
 * NOTE: This is now an alias to the Equipment type from constants.ts.
 * The Equipment interface has been updated to include all the same properties
 * as the original EnhancedEquipment interface.
 *
 * This alias is kept for backward compatibility with existing code.
 * New code should use the Equipment type directly from constants.ts.
 */
export type EnhancedEquipment = BaseEquipment;

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

    /** Optional: User-facing description of this modification */
    description?: string;
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

    // Combat stats — populated at runtime for weapons and armor.
    // These mirror the corresponding fields on the Equipment interface
    // and are set by EnemyGenerator / EquipmentGenerator when building
    // the character's inventory.
    damage?: {
        dice: string;
        damageType: string;
        versatile?: string;
    };
    weaponProperties?: string[];
    type?: EquipmentType;
    acBonus?: number;
}

/**
 * Character equipment state
 * Contains all inventory items organized by category with weight tracking
 */
export interface CharacterEquipment {
    weapons: EnhancedInventoryItem[];
    armor: EnhancedInventoryItem[];
    items: EnhancedInventoryItem[];
    totalWeight: number;
    equippedWeight: number;
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

/**
 * Equipment-granted spell tracking
 */
export interface EquipmentSpell {
    spellId: string;
    level?: number;
    uses?: number;
    recharge?: string;
    source?: 'equipment';
    equipmentName?: string;
    instanceId?: string;
    sourceType?: 'default' | 'custom';
}

/**
 * Result type for equipment effect application/removal operations
 */
export interface EffectApplicationResult {
    /** Whether any effects were applied or removed */
    applied: boolean;
    /** Number of effects affected */
    count: number;
    /** Errors encountered during application */
    errors: string[];
}

/**
 * Result type for equipment validation operations
 */
export interface EquipmentValidationResult {
    /** Whether the validation passed */
    valid: boolean;
    /** Array of error messages (undefined if valid) */
    errors?: string[];
}

/**
 * Options for random equipment spawning
 */
export interface SpawnRandomOptions {
    /** Exclude items with spawnWeight: 0 (game-only items) */
    excludeZeroWeight?: boolean;
    /** Only include specific equipment types */
    includeTypes?: ('weapon' | 'armor' | 'item' | 'box')[];
    /** Minimum rarity level (inclusive) */
    minRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    /** Maximum rarity level (inclusive) */
    maxRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
}

/**
 * Treasure hoard result with additional metadata
 */
export interface TreasureHoardResult {
    /** Generated equipment items */
    items: EnhancedEquipment[];
    /** Total gold piece value (estimated) */
    totalValue: number;
    /** Challenge rating used for generation */
    cr: number;
}
