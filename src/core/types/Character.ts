/**
 * D&D 5e Character type definitions
 */

import type { FeatureEffect } from '../features/FeatureTypes.js';
import type {
    EquipmentProperty,
    EquipmentFeature,
    EquipmentSkill,
    EquipmentCondition,
    EquipmentMiniFeature,
    EnhancedInventoryItem
} from './Equipment.js';

export type Race =
    | 'Human'
    | 'Elf'
    | 'Dwarf'
    | 'Halfling'
    | 'Dragonborn'
    | 'Gnome'
    | 'Half-Elf'
    | 'Half-Orc'
    | 'Tiefling';

export type Class =
    | 'Barbarian'
    | 'Bard'
    | 'Cleric'
    | 'Druid'
    | 'Fighter'
    | 'Monk'
    | 'Paladin'
    | 'Ranger'
    | 'Rogue'
    | 'Sorcerer'
    | 'Warlock'
    | 'Wizard';

export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type Skill =
    | 'athletics'
    | 'acrobatics'
    | 'sleight_of_hand'
    | 'stealth'
    | 'arcana'
    | 'history'
    | 'investigation'
    | 'nature'
    | 'religion'
    | 'animal_handling'
    | 'insight'
    | 'medicine'
    | 'perception'
    | 'survival'
    | 'deception'
    | 'intimidation'
    | 'performance'
    | 'persuasion';

export type ProficiencyLevel = 'none' | 'proficient' | 'expertise';

/**
 * Game mode for stat progression
 * - standard: D&D 5e rules (stats capped at 20, increases at levels 4, 8, 12, 16, 19, max level 20)
 * - uncapped: No stat limits, stat increases EVERY level (unlimited progression)
 */
export type GameMode = 'standard' | 'uncapped';

/**
 * Attack type for combat actions
 */
export interface Attack {
    name: string;
    bonus?: number;
    attack_bonus?: number;
    damage?: string;
    damage_dice?: string;
    damage_type?: string;
    type?: 'melee' | 'ranged' | 'spell';
    range?: number;
    /** Weapon properties (e.g., 'finesse', 'versatile', 'thrown', 'reach') */
    properties?: string[];
}

/**
 * Spell type for casting
 */
export interface Spell {
    name: string;
    level?: number;
    school?: string;
    casting_time?: string;
    range?: string;
    duration?: string;
    components?: string[];
    description?: string;
    damage_dice?: string;
    damage_type?: string;
    attack_roll?: boolean;
    saving_throw?: string;
}

export interface AbilityScores {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
    // Aliases for compatibility
    dexterity?: number;
    strength?: number;
    constitution?: number;
}

export interface CharacterSheet {
    /** Character name */
    name: string;

    /** Race */
    race: Race;

    /** Class */
    class: Class;

    /** Current level (1-20) */
    level: number;

    /** Ability scores */
    ability_scores: AbilityScores;

    /** Ability modifiers (calculated from scores) */
    ability_modifiers: AbilityScores;

    /** Proficiency bonus (based on level) */
    proficiency_bonus: number;

    /** Hit points */
    hp: {
        current: number;
        max: number;
        temp: number;
    };

    /** Armor class */
    armor_class: number;

    /** Initiative bonus */
    initiative: number;

    /** Speed in feet */
    speed: number;

    /** Skill proficiencies */
    skills: Record<string, ProficiencyLevel>;

    /** Saving throw proficiencies */
    saving_throws: Record<Ability, boolean>;

    /** Racial traits */
    racial_traits: string[];

    /** Class features */
    class_features: string[];

    /** Spells (for spellcasters) */
    spells?: {
        spell_slots: Record<number, { total: number; used: number }>;
        known_spells: string[];
        cantrips: string[];
    };

    /** Equipment */
    equipment?: {
        weapons: EnhancedInventoryItem[];
        armor: EnhancedInventoryItem[];
        items: EnhancedInventoryItem[];
        totalWeight: number;
        equippedWeight: number;
    };

    /** Character appearance */
    appearance?: {
        /** Deterministic features from seed */
        body_type: string;
        skin_tone: string;
        hair_style: string;
        hair_color: string;
        eye_color: string;
        facial_features: string[];

        /** Dynamic features from audio/visual */
        primary_color?: string;
        secondary_color?: string;
        aura_color?: string;
    };

    /** Experience points */
    xp: {
        current: number;
        next_level: number;
    };

    /** Track seed this character was generated from */
    seed: string;

    /** Generation timestamp */
    generated_at: string;

    /** Game mode for stat progression (standard = capped at 20, uncapped = no limits) */
    gameMode?: GameMode;

    /** Number of pending stat increases awaiting manual selection (counter) */
    pendingStatIncreases?: number;

    /**
     * Feature effects applied to this character
     * Stores effects from features and traits that modify character stats
     *
     * Effects include:
     * - stat_bonus: Add to ability scores (e.g., +1 STR)
     * - skill_proficiency: Grant proficiency or expertise in a skill
     * - ability_unlock: Unlock new abilities (e.g., darkvision, flight)
     * - passive_modifier: Add constant bonuses (e.g., +10 speed)
     * - resource_grant: Grant resource pools (e.g., rage counts, ki points)
     * - spell_slot_bonus: Grant additional spell slots
     */
    feature_effects?: FeatureEffect[];

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

}
