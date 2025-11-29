/**
 * D&D 5e data constants
 */

import type { Race, Class, Ability, Skill } from '../core/types/Character.js';

// Race data with ability score bonuses
export const RACE_DATA: Record<Race, {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
}> = {
    'Human': {
        ability_bonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
        speed: 30,
        traits: ['Versatile', 'Extra Language'],
    },
    'Elf': {
        ability_bonuses: { DEX: 2 },
        speed: 30,
        traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
    },
    'Dwarf': {
        ability_bonuses: { CON: 2 },
        speed: 25,
        traits: ['Darkvision', 'Dwarven Resilience', 'Stonecunning'],
    },
    'Halfling': {
        ability_bonuses: { DEX: 2 },
        speed: 25,
        traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
    },
    'Dragonborn': {
        ability_bonuses: { STR: 2, CHA: 1 },
        speed: 30,
        traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
    },
    'Gnome': {
        ability_bonuses: { INT: 2 },
        speed: 25,
        traits: ['Darkvision', 'Gnome Cunning'],
    },
    'Half-Elf': {
        ability_bonuses: { CHA: 2 },
        speed: 30,
        traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
    },
    'Half-Orc': {
        ability_bonuses: { STR: 2, CON: 1 },
        speed: 30,
        traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
    },
    'Tiefling': {
        ability_bonuses: { CHA: 2, INT: 1 },
        speed: 30,
        traits: ['Darkvision', 'Hellish Resistance', 'Infernal Legacy'],
    },
};

// Class data with primary abilities and hit dice
export const CLASS_DATA: Record<Class, {
    primary_ability: Ability;
    hit_die: number;
    saving_throws: Ability[];
    is_spellcaster: boolean;
    skill_count: number;
    available_skills: Skill[];
    has_expertise: boolean;
    expertise_count?: number;
}> = {
    'Barbarian': {
        primary_ability: 'STR',
        hit_die: 12,
        saving_throws: ['STR', 'CON'],
        is_spellcaster: false,
        skill_count: 2,
        available_skills: ['athletics', 'animal_handling', 'intimidation', 'nature', 'perception', 'survival'],
        has_expertise: false,
    },
    'Bard': {
        primary_ability: 'CHA',
        hit_die: 8,
        saving_throws: ['DEX', 'CHA'],
        is_spellcaster: true,
        skill_count: 3,
        available_skills: [
            'athletics', 'acrobatics', 'sleight_of_hand', 'stealth',
            'arcana', 'history', 'investigation', 'nature', 'religion',
            'animal_handling', 'insight', 'medicine', 'perception', 'survival',
            'deception', 'intimidation', 'performance', 'persuasion'
        ],
        has_expertise: true,
        expertise_count: 2,
    },
    'Cleric': {
        primary_ability: 'WIS',
        hit_die: 8,
        saving_throws: ['WIS', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
        has_expertise: false,
    },
    'Druid': {
        primary_ability: 'WIS',
        hit_die: 8,
        saving_throws: ['INT', 'WIS'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'animal_handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
        has_expertise: false,
    },
    'Fighter': {
        primary_ability: 'STR',
        hit_die: 10,
        saving_throws: ['STR', 'CON'],
        is_spellcaster: false,
        skill_count: 2,
        available_skills: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
        has_expertise: false,
    },
    'Monk': {
        primary_ability: 'DEX',
        hit_die: 8,
        saving_throws: ['STR', 'DEX'],
        is_spellcaster: false,
        skill_count: 2,
        available_skills: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
        has_expertise: false,
    },
    'Paladin': {
        primary_ability: 'STR',
        hit_die: 10,
        saving_throws: ['WIS', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
        has_expertise: false,
    },
    'Ranger': {
        primary_ability: 'DEX',
        hit_die: 10,
        saving_throws: ['STR', 'DEX'],
        is_spellcaster: true,
        skill_count: 3,
        available_skills: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
        has_expertise: false,
    },
    'Rogue': {
        primary_ability: 'DEX',
        hit_die: 8,
        saving_throws: ['DEX', 'INT'],
        is_spellcaster: false,
        skill_count: 4,
        available_skills: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth'],
        has_expertise: true,
        expertise_count: 2,
    },
    'Sorcerer': {
        primary_ability: 'CHA',
        hit_die: 6,
        saving_throws: ['CON', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
        has_expertise: false,
    },
    'Warlock': {
        primary_ability: 'CHA',
        hit_die: 8,
        saving_throws: ['WIS', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
        has_expertise: false,
    },
    'Wizard': {
        primary_ability: 'INT',
        hit_die: 6,
        saving_throws: ['INT', 'WIS'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
        has_expertise: false,
    },
};

// XP thresholds for levels 1-20
export const XP_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 300,
    3: 900,
    4: 2700,
    5: 6500,
    6: 14000,
    7: 23000,
    8: 34000,
    9: 48000,
    10: 64000,
    11: 85000,
    12: 100000,
    13: 120000,
    14: 140000,
    15: 165000,
    16: 195000,
    17: 225000,
    18: 265000,
    19: 305000,
    20: 355000,
};

// Proficiency bonus by level
export const PROFICIENCY_BONUS: Record<number, number> = {
    1: 2, 2: 2, 3: 2, 4: 2,
    5: 3, 6: 3, 7: 3, 8: 3,
    9: 4, 10: 4, 11: 4, 12: 4,
    13: 5, 14: 5, 15: 5, 16: 5,
    17: 6, 18: 6, 19: 6, 20: 6,
};

// All races in order
export const ALL_RACES: Race[] = [
    'Human',
    'Elf',
    'Dwarf',
    'Halfling',
    'Dragonborn',
    'Gnome',
    'Half-Elf',
    'Half-Orc',
    'Tiefling',
];

// All classes in order
export const ALL_CLASSES: Class[] = [
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
    'Wizard',
];

// Adjective mapping for NamingEngine
export const ADJECTIVE_DATA: Record<string, {
    bass: string;
    treble: string;
    mid: string;
    quiet: string;
    loud: string;
}> = {
    'techno': { bass: 'Thumping', treble: 'Piercing', mid: 'Driving', quiet: 'Minimal', loud: 'Pounding' },
    'rock': { bass: 'Heavy', treble: 'Screaming', mid: 'Crunchy', quiet: 'Acoustic', loud: 'Thunderous' },
    'metal': { bass: 'Brutal', treble: 'Shredding', mid: 'Chugging', quiet: 'Doomed', loud: 'Deafening' },
    'ambient': { bass: 'Deep', treble: 'Ethereal', mid: 'Whispering', quiet: 'Silent', loud: 'Swelling' },
    'classical': { bass: 'Grand', treble: 'Soaring', mid: 'Noble', quiet: 'Gentle', loud: 'Majestic' },
    'jazz': { bass: 'Smooth', treble: 'Bright', mid: 'Swinging', quiet: 'Cool', loud: 'Big' },
    'hip hop': { bass: 'Bumping', treble: 'Sharp', mid: 'Flowing', quiet: 'Chill', loud: 'Hype' },
    'pop': { bass: 'Bouncy', treble: 'Sparkling', mid: 'Catchy', quiet: 'Soft', loud: 'Anthemic' },
    'electronic': { bass: 'Pulsing', treble: 'Glitchy', mid: 'Synthetic', quiet: 'Atmospheric', loud: 'Massive' },
    'default': { bass: 'Booming', treble: 'Sharp', mid: 'Resonant', quiet: 'Quiet', loud: 'Loud' },
};

// Skill to ability score mapping (D&D 5e)
export const SKILL_ABILITY_MAP: Record<Skill, Ability> = {
    // STR-based
    athletics: 'STR',

    // DEX-based
    acrobatics: 'DEX',
    sleight_of_hand: 'DEX',
    stealth: 'DEX',

    // INT-based
    arcana: 'INT',
    history: 'INT',
    investigation: 'INT',
    nature: 'INT',
    religion: 'INT',

    // WIS-based
    animal_handling: 'WIS',
    insight: 'WIS',
    medicine: 'WIS',
    perception: 'WIS',
    survival: 'WIS',

    // CHA-based
    deception: 'CHA',
    intimidation: 'CHA',
    performance: 'CHA',
    persuasion: 'CHA',
};

