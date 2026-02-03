/**
 * D&D 5e Character type definitions
 */

import type { FeatureEffect } from '../features/FeatureTypes.js';
import type {
    EquipmentProperty,
    EquipmentFeature,
    EquipmentSkill,
    EquipmentSpell,
    EquipmentCondition,
    EquipmentMiniFeature,
    EnhancedInventoryItem
} from './Equipment.js';

/**
 * Branded type for extensible Race names
 *
 * This allows custom races to be registered via ExtensionManager while maintaining
 * type safety. Use asRace() to convert a string to the Race type, and isValidRace()
 * to validate at runtime.
 *
 * @example
 * // Default D&D 5e races
 * const defaultRace: Race = asRace('Human');
 *
 * // Custom race (must be registered via ExtensionManager first)
 * const customRace: Race = asRace('Dragonkin');
 * if (isValidRace(customRace)) {
 *   // Safe to use
 * }
 *
 * // Type augmentation alternative (for user projects):
 * // declare module 'playlist-data-engine' {
 * //   type Race = 'Human' | 'Elf' | ... | 'Tiefling' | 'Dragonkin';
 * // }
 */
export type Race = string & { readonly __RaceBrand: unique symbol };

/**
 * Cast a string to the Race type
 *
 * This function performs a type assertion to convert any string to the Race type.
 * Use isValidRace() first if you need runtime validation.
 *
 * @param value - The race name string
 * @returns The value cast to Race type
 *
 * @example
 * const raceName = 'Dragonkin';
 * if (isValidRace(raceName)) {
 *   const race: Race = asRace(raceName);
 * }
 */
export function asRace(value: string): Race {
    return value as Race;
}

/**
 * Valid D&D 5e race names (for runtime validation)
 *
 * These are the string values of the default D&D 5e races. Use isValidRace()
 * to validate at runtime, and use the DEFAULT_RACES array for iteration.
 */
const DEFAULT_RACE_NAMES = [
    'Human',
    'Elf',
    'Dwarf',
    'Halfling',
    'Dragonborn',
    'Gnome',
    'Half-Elf',
    'Half-Orc',
    'Tiefling'
] as const;

/**
 * Default D&D 5e races (pre-branded Race type values)
 *
 * These are the core races that are always available without needing ExtensionManager.
 * Custom races can be added via ExtensionManager.register('races.data', [...]).
 */
export const DEFAULT_RACES: readonly Race[] = DEFAULT_RACE_NAMES.map(asRace);

/**
 * Type guard to check if a string is a valid Race (default or custom)
 *
 * This checks against both default D&D 5e races and any custom races
 * registered via ExtensionManager's 'races.data' category.
 *
 * @param value - The value to check
 * @returns True if the value is a valid race name
 *
 * @example
 * if (isValidRace('Dragonkin')) {
 *   // Safe to use as Race type
 *   const race: Race = asRace('Dragonkin');
 * }
 */
export function isValidRace(value: unknown): value is Race {
    if (typeof value !== 'string') {
        return false;
    }

    // Check default races
    if (DEFAULT_RACES.includes(value as Race)) {
        return true;
    }

    // Check ExtensionManager for custom races (lazy-loaded to avoid circular dependency)
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extensionModule = require('../extensions/ExtensionManager.js');
        const manager = extensionModule.ExtensionManager.getInstance();

        // Check custom race data registration
        const customRaceData = manager.get('races.data' as any);
        if (customRaceData && Array.isArray(customRaceData)) {
            const raceNames = customRaceData.map((d: any) => d.race);
            if (raceNames.includes(value)) {
                return true;
            }
        }
    } catch {
        // ExtensionManager not available - only allow default races
    }

    return false;
}

/**
 * Branded type for extensible Class names
 *
 * This allows custom classes to be registered via ExtensionManager while maintaining
 * type safety. Use asClass() to convert a string to the Class type, and isValidClass()
 * to validate at runtime.
 *
 * @example
 * // Default D&D 5e classes
 * const defaultClass: Class = 'Wizard' as Class;
 *
 * // Custom class (must be registered via ExtensionManager first)
 * const customClass: Class = asClass('Necromancer');
 * if (isValidClass(customClass)) {
 *   // Safe to use
 * }
 *
 * // Type augmentation alternative (for user projects):
 * // declare module 'playlist-data-engine' {
 * //   type Class = 'Barbarian' | ... | 'Wizard' | 'Necromancer';
 * // }
 */
export type Class = string & { readonly __ClassBrand: unique symbol };

/**
 * Cast a string to the Class type
 *
 * This function performs a type assertion to convert any string to the Class type.
 * Use isValidClass() first if you need runtime validation.
 *
 * @param value - The class name string
 * @returns The value cast to Class type
 *
 * @example
 * const className = 'Necromancer';
 * if (isValidClass(className)) {
 *   const cls: Class = asClass(className);
 * }
 */
export function asClass(value: string): Class {
    return value as Class;
}

/**
 * Valid D&D 5e class names (for runtime validation)
 *
 * These are the string values of the default D&D 5e classes. Use isValidClass()
 * to validate at runtime, and use the DEFAULT_CLASS_VALUES array for iteration.
 */
const DEFAULT_CLASS_NAMES = [
    'Barbarian',
    'Bard',
    'Cleric',
    'Druid',
    'Fighter',
    'Monk',
    'Paladin',
    'Ranger',
    'Rogue',
    'Sorcerer',
    'Warlock',
    'Wizard'
] as const;

/**
 * Default D&D 5e classes (pre-branded Class type values)
 *
 * These are the core classes that are always available without needing ExtensionManager.
 * Custom classes can be added via ExtensionManager.register('classes.data', [...]).
 */
export const DEFAULT_CLASSES: readonly Class[] = DEFAULT_CLASS_NAMES.map(asClass);

/**
 * Type guard to check if a string is a valid Class (default or custom)
 *
 * This checks against both default D&D 5e classes and any custom classes
 * registered via ExtensionManager's 'classes.data' category.
 *
 * @param value - The value to check
 * @returns True if the value is a valid class name
 *
 * @example
 * if (isValidClass('Necromancer')) {
 *   // Safe to use as Class type
 *   const cls: Class = 'Necromancer';
 * }
 */
export function isValidClass(value: unknown): value is Class {
    if (typeof value !== 'string') {
        return false;
    }

    // Check default classes
    if (DEFAULT_CLASSES.includes(value as Class)) {
        return true;
    }

    // Check ExtensionManager for custom classes (lazy-loaded to avoid circular dependency)
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extensionModule = require('../extensions/ExtensionManager.js');
        const manager = extensionModule.ExtensionManager.getInstance();

        // Check if registered as a class
        const registeredClasses = manager.get('classes') as string[] | undefined;
        if (registeredClasses?.includes(value)) {
            return true;
        }

        // Check custom class data registration
        const customClassData = manager.get('classes.data' as any);
        if (customClassData && Array.isArray(customClassData)) {
            const classNames = customClassData.map((d: any) => d.name);
            if (classNames.includes(value)) {
                return true;
            }
        }
    } catch {
        // ExtensionManager not available - only allow default classes
    }

    return false;
}

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

    /** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
    subrace?: string;

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
        accent_color?: string;
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
        spells?: EquipmentSpell[];
    }[];

}
