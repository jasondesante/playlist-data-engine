/**
 * D&D 5e Character type definitions
 */

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
    skills: Record<Skill, ProficiencyLevel>;

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
        weapons: Array<{ name: string; quantity: number; equipped: boolean }>;
        armor: Array<{ name: string; quantity: number; equipped: boolean }>;
        items: Array<{ name: string; quantity: number; equipped: boolean }>;
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

}
