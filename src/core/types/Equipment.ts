/**
 * Enhanced Equipment Type Definitions
 *
 * Defines interfaces for the Advanced Equipment System.
 * Part of Phase 2: Interface Design for Equipment Upgrade Plan Part 2.
 *
 * These interfaces provide:
 * - Equipment properties affecting gameplay
 * - Equipment-granted features and skills
 * - D&D 5e standard stats (damage dice, AC, properties)
 * - Runtime equipment modification (templates + per-instance)
 * - Spawn weight system for generation control
 */

import type { ProficiencyLevel } from './Character.js';

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
    | 'spell_grant';         // Grants specific spells

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

/**
 * Equipment-granted spell tracking
 */
export interface EquipmentSpell {
    spellId: string;
    level?: number;
    uses?: number;
    recharge?: string;
    source: 'equipment';
    equipmentName: string;
    instanceId?: string;
    sourceType: 'default' | 'custom';
}
