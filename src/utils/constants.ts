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

/**
 * Spell data structure
 */
export interface Spell {
    name: string;
    level: number;
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
}

/**
 * D&D 5e spell database - comprehensive list of spells organized by level and school
 */
export const SPELL_DATABASE: Record<string, Spell> = {
    // Cantrips (Level 0)
    'Acid Splash': { name: 'Acid Splash', level: 0, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Fire Bolt': { name: 'Fire Bolt', level: 0, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Light': { name: 'Light', level: 0, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'M'], duration: '1 hour' },
    'Mage Hand': { name: 'Mage Hand', level: 0, school: 'Conjuration', casting_time: '1 action', range: '30 feet', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Mending': { name: 'Mending', level: 0, school: 'Transmutation', casting_time: '1 minute', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Message': { name: 'Message', level: 0, school: 'Transmutation', casting_time: '1 action', range: '120 feet', components: ['V', 'S', 'M'], duration: '1 round' },
    'Prestidigitation': { name: 'Prestidigitation', level: 0, school: 'Transmutation', casting_time: '1 action', range: '10 feet', components: ['V', 'S'], duration: 'Up to 1 hour' },
    'Sacred Flame': { name: 'Sacred Flame', level: 0, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shocking Grasp': { name: 'Shocking Grasp', level: 0, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous' },
    'Vicious Mockery': { name: 'Vicious Mockery', level: 0, school: 'Enchantment', casting_time: '1 action', range: '60 feet', components: ['V'], duration: 'Instantaneous' },

    // 1st Level
    'Burning Hands': { name: 'Burning Hands', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Self (15-foot cone)', components: ['V', 'S'], duration: 'Instantaneous' },
    'Charm Person': { name: 'Charm Person', level: 1, school: 'Enchantment', casting_time: '1 action', range: '30 feet', components: ['V', 'S'], duration: '1 hour' },
    'Cure Wounds': { name: 'Cure Wounds', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Instantaneous' },
    'Detect Magic': { name: 'Detect Magic', level: 1, school: 'Divination', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 10 minutes' },
    'Disguise Self': { name: 'Disguise Self', level: 1, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: '1 hour' },
    'Expeditious Retreat': { name: 'Expeditious Retreat', level: 1, school: 'Transmutation', casting_time: '1 bonus action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 10 minutes' },
    'False Life': { name: 'False Life', level: 1, school: 'Necromancy', casting_time: '1 action', range: 'Self', components: ['V', 'S', 'M'], duration: '1 hour' },
    'Feather Fall': { name: 'Feather Fall', level: 1, school: 'Transmutation', casting_time: '1 reaction', range: '60 feet', components: ['V', 'M'], duration: '1 minute' },
    'Grease': { name: 'Grease', level: 1, school: 'Conjuration', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: '1 minute' },
    'Healing Word': { name: 'Healing Word', level: 1, school: 'Evocation', casting_time: '1 bonus action', range: '60 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Identify': { name: 'Identify', level: 1, school: 'Divination', casting_time: '1 minute', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Mage Armor': { name: 'Mage Armor', level: 1, school: 'Abjuration', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: '8 hours' },
    'Magic Missile': { name: 'Magic Missile', level: 1, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shield': { name: 'Shield', level: 1, school: 'Abjuration', casting_time: '1 reaction', range: 'Self', components: ['V', 'S'], duration: '1 round' },
    'Sleep': { name: 'Sleep', level: 1, school: 'Enchantment', casting_time: '1 action', range: '90 feet', components: ['V', 'S', 'M'], duration: '1 minute' },
    'Thunderwave': { name: 'Thunderwave', level: 1, school: 'Evocation', casting_time: '1 action', range: 'Self (15-foot cube)', components: ['V', 'S'], duration: 'Instantaneous' },

    // 2nd Level
    'Acid Arrow': { name: 'Acid Arrow', level: 2, school: 'Evocation', casting_time: '1 action', range: '90 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Aganazzar\'s Scorcher': { name: 'Aganazzar\'s Scorcher', level: 2, school: 'Evocation', casting_time: '1 action', range: '30 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Blur': { name: 'Blur', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V'], duration: 'Concentration, up to 1 minute' },
    'Detect Thoughts': { name: 'Detect Thoughts', level: 2, school: 'Divination', casting_time: '1 action', range: 'Self', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Fireball': { name: 'Fireball', level: 3, school: 'Evocation', casting_time: '1 action', range: '150 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Hold Person': { name: 'Hold Person', level: 2, school: 'Enchantment', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Invisibility': { name: 'Invisibility', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },
    'Knock': { name: 'Knock', level: 2, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V'], duration: 'Instantaneous' },
    'Misty Step': { name: 'Misty Step', level: 2, school: 'Conjuration', casting_time: '1 bonus action', range: 'Self', components: ['V'], duration: 'Instantaneous' },
    'Mirror Image': { name: 'Mirror Image', level: 2, school: 'Illusion', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Scorching Ray': { name: 'Scorching Ray', level: 2, school: 'Evocation', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Shatter': { name: 'Shatter', level: 2, school: 'Evocation', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Suggestion': { name: 'Suggestion', level: 2, school: 'Enchantment', casting_time: '1 action', range: '30 feet', components: ['V', 'M'], duration: 'Concentration, up to 1 minute' },

    // 3rd Level
    'Animate Dead': { name: 'Animate Dead', level: 3, school: 'Necromancy', casting_time: '1 minute', range: '10 feet', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Blink': { name: 'Blink', level: 3, school: 'Transmutation', casting_time: '1 action', range: 'Self', components: ['V', 'S'], duration: '1 minute' },
    'Counterspell': { name: 'Counterspell', level: 3, school: 'Abjuration', casting_time: '1 reaction', range: '60 feet', components: ['S'], duration: 'Instantaneous' },
    'Dispel Magic': { name: 'Dispel Magic', level: 3, school: 'Abjuration', casting_time: '1 action', range: '120 feet', components: ['V', 'S'], duration: 'Instantaneous' },
    'Lightning Bolt': { name: 'Lightning Bolt', level: 3, school: 'Evocation', casting_time: '1 action', range: 'Self (100-foot line)', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Major Image': { name: 'Major Image', level: 3, school: 'Illusion', casting_time: '1 action', range: '120 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 10 minutes' },
    'Sleet Storm': { name: 'Sleet Storm', level: 3, school: 'Evocation', casting_time: '1 action', range: '150 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 minute' },
    'Telekinesis': { name: 'Telekinesis', level: 3, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },

    // 4th Level
    'Dimension Door': { name: 'Dimension Door', level: 4, school: 'Conjuration', casting_time: '1 action', range: '500 feet', components: ['V'], duration: 'Instantaneous' },
    'Greater Invisibility': { name: 'Greater Invisibility', level: 4, school: 'Illusion', casting_time: '1 action', range: 'Touch', components: ['V', 'S'], duration: 'Concentration, up to 1 minute' },
    'Polymorph': { name: 'Polymorph', level: 4, school: 'Transmutation', casting_time: '1 action', range: '60 feet', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },
    'Stoneskin': { name: 'Stoneskin', level: 4, school: 'Abjuration', casting_time: '1 action', range: 'Touch', components: ['V', 'S', 'M'], duration: 'Concentration, up to 1 hour' },

    // 5th Level
    'Cone of Cold': { name: 'Cone of Cold', level: 5, school: 'Evocation', casting_time: '1 action', range: 'Self (60-foot cone)', components: ['V', 'S', 'M'], duration: 'Instantaneous' },
    'Teleportation Circle': { name: 'Teleportation Circle', level: 5, school: 'Conjuration', casting_time: '1 minute', range: '10 feet', components: ['V', 'M'], duration: '1 round' },
};

/**
 * Spell lists by class - defines which spells each spellcasting class has access to
 */
export const CLASS_SPELL_LISTS: Record<string, {
    cantrips: string[];
    spells_by_level: Record<number, string[]>;
}> = {
    'Wizard': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Light', 'Mage Hand', 'Mending', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Grease', 'Identify', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Shatter', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image', 'Sleet Storm', 'Telekinesis'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph', 'Stoneskin'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Sorcerer': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Light', 'Mage Hand', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Feather Fall', 'Grease', 'Mage Armor', 'Magic Missile', 'Shield', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Shatter', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image', 'Sleet Storm'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph', 'Stoneskin'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Bard': {
        cantrips: ['Light', 'Mage Hand', 'Mending', 'Message', 'Prestidigitation', 'Vicious Mockery'],
        spells_by_level: {
            1: ['Charm Person', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Healing Word', 'Identify', 'Magic Missile', 'Sleep', 'Thunderwave'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Knock', 'Misty Step', 'Mirror Image', 'Scorching Ray', 'Suggestion'],
            3: ['Animate Dead', 'Blink', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Major Image'],
            4: ['Dimension Door', 'Greater Invisibility', 'Polymorph'],
            5: ['Teleportation Circle'],
        },
    },
    'Cleric': {
        cantrips: ['Light', 'Mending', 'Message', 'Sacred Flame'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Identify', 'Healing Word', 'Magic Missile', 'Shield', 'Sleep'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Scorching Ray'],
            3: ['Animate Dead', 'Counterspell', 'Dispel Magic', 'Lightning Bolt'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold'],
        },
    },
    'Druid': {
        cantrips: ['Light', 'Mending', 'Prestidigitation'],
        spells_by_level: {
            1: ['Burning Hands', 'Cure Wounds', 'Detect Magic', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Healing Word', 'Identify'],
            2: ['Acid Arrow', 'Blur', 'Detect Thoughts', 'Hold Person', 'Invisibility', 'Scorching Ray', 'Shatter'],
            3: ['Animate Dead', 'Counterspell', 'Dispel Magic', 'Lightning Bolt', 'Sleet Storm'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold', 'Teleportation Circle'],
        },
    },
    'Paladin': {
        cantrips: [],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Cure Wounds', 'Detect Magic', 'Feather Fall', 'Healing Word', 'Protection', 'Shield'],
            2: ['Acid Arrow', 'Hold Person', 'Scorching Ray'],
            3: ['Counterspell', 'Dispel Magic', 'Lightning Bolt'],
            4: ['Dimension Door', 'Polymorph'],
            5: ['Cone of Cold'],
        },
    },
    'Ranger': {
        cantrips: [],
        spells_by_level: {
            1: ['Detect Magic', 'Expeditious Retreat', 'Feather Fall', 'Grease', 'Identify'],
            2: ['Blur', 'Hold Person', 'Invisibility', 'Misty Step'],
            3: ['Blink', 'Counterspell', 'Dispel Magic'],
            4: ['Dimension Door', 'Polymorph'],
            5: [],
        },
    },
    'Warlock': {
        cantrips: ['Acid Splash', 'Fire Bolt', 'Mage Hand', 'Message', 'Prestidigitation', 'Shocking Grasp'],
        spells_by_level: {
            1: ['Burning Hands', 'Charm Person', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'False Life', 'Grease', 'Hex', 'Magic Missile'],
            2: ['Acid Arrow', 'Darkness', 'Hold Person', 'Invisibility', 'Scorching Ray', 'Shatter'],
            3: ['Counterspell', 'Dispel Magic', 'Fireball', 'Lightning Bolt'],
            4: ['Dimension Door', 'Greater Invisibility'],
            5: ['Cone of Cold'],
        },
    },
};

/**
 * Spell slots by class and level - D&D 5e standard progression
 * Key: "ClassName", Value: Record mapping character level (1-20) to spell slots per level (1-9)
 */
export const SPELL_SLOTS_BY_CLASS: Record<string, Record<number, Record<number, number>>> = {
    'Wizard': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Sorcerer': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Bard': {
        1: { 1: 2 },
        2: { 1: 2, 2: 0 },
        3: { 1: 3, 2: 0 },
        4: { 1: 3, 2: 2 },
        5: { 1: 4, 2: 2, 3: 0 },
        6: { 1: 4, 2: 2, 3: 0 },
        7: { 1: 4, 2: 2, 3: 2 },
        8: { 1: 4, 2: 2, 3: 2, 4: 0 },
        9: { 1: 4, 2: 3, 3: 2, 4: 0 },
        10: { 1: 4, 2: 3, 3: 2, 4: 1 },
        11: { 1: 4, 2: 3, 3: 3, 4: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
        14: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0 },
        15: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1, 6: 0 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
    },
    'Cleric': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 3, 2: 2 },
        4: { 1: 4, 2: 2 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Druid': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 3, 2: 2 },
        4: { 1: 4, 2: 2 },
        5: { 1: 4, 2: 3, 3: 2 },
        6: { 1: 4, 2: 3, 3: 3 },
        7: { 1: 4, 2: 3, 3: 3, 4: 1 },
        8: { 1: 4, 2: 3, 3: 3, 4: 2 },
        9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
        13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 },
    },
    'Paladin': {
        1: { 1: 0 },
        2: { 1: 2 },
        3: { 1: 3 },
        4: { 1: 3 },
        5: { 1: 4, 2: 2 },
        6: { 1: 4, 2: 2 },
        7: { 1: 4, 2: 3 },
        8: { 1: 4, 2: 3 },
        9: { 1: 4, 2: 3, 3: 2 },
        10: { 1: 4, 2: 3, 3: 2 },
        11: { 1: 4, 2: 3, 3: 3 },
        12: { 1: 4, 2: 3, 3: 3 },
        13: { 1: 4, 2: 3, 3: 3, 4: 1 },
        14: { 1: 4, 2: 3, 3: 3, 4: 1 },
        15: { 1: 4, 2: 3, 3: 3, 4: 2 },
        16: { 1: 4, 2: 3, 3: 3, 4: 2 },
        17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
        20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
    },
    'Ranger': {
        1: { 1: 0 },
        2: { 1: 2 },
        3: { 1: 2, 2: 0 },
        4: { 1: 3, 2: 0 },
        5: { 1: 3, 2: 2 },
        6: { 1: 3, 2: 2 },
        7: { 1: 3, 2: 2, 3: 0 },
        8: { 1: 3, 2: 2, 3: 0 },
        9: { 1: 3, 2: 3, 3: 0 },
        10: { 1: 4, 2: 3, 3: 0 },
        11: { 1: 4, 2: 3, 3: 2 },
        12: { 1: 4, 2: 3, 3: 2 },
        13: { 1: 4, 2: 3, 3: 2, 4: 0 },
        14: { 1: 4, 2: 3, 3: 2, 4: 0 },
        15: { 1: 4, 2: 3, 3: 2, 4: 1 },
        16: { 1: 4, 2: 3, 3: 2, 4: 1 },
        17: { 1: 4, 2: 3, 3: 3, 4: 1 },
        18: { 1: 4, 2: 3, 3: 3, 4: 1 },
        19: { 1: 4, 2: 3, 3: 3, 4: 2 },
        20: { 1: 4, 2: 3, 3: 3, 4: 2 },
    },
    'Warlock': {
        1: { 1: 1 },
        2: { 1: 2 },
        3: { 1: 2, 2: 2 },
        4: { 1: 2, 2: 2 },
        5: { 1: 2, 2: 2, 3: 2 },
        6: { 1: 2, 2: 2, 3: 2 },
        7: { 1: 2, 2: 2, 3: 2, 4: 1 },
        8: { 1: 2, 2: 2, 3: 2, 4: 1 },
        9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 },
        10: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1 },
        11: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 1 },
        12: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        13: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        14: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 2 },
        15: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
        16: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3 },
        17: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        18: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        19: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
        20: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4 },
    },
};

/**
 * Equipment data structure
 */
export interface Equipment {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number; // pounds
}

/**
 * Starting equipment by class - D&D 5e standard
 */
export const CLASS_STARTING_EQUIPMENT: Record<Class, {
    weapons: string[];
    armor: string[];
    items: string[];
}> = {
    'Barbarian': {
        weapons: ['Greataxe', 'Handaxe'],
        armor: ['No Armor'],
        items: ['Explorer\'s Pack', 'Javelin'],
    },
    'Bard': {
        weapons: ['Rapier', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Lute', 'Entertainer\'s Pack', 'Dagger'],
    },
    'Cleric': {
        weapons: ['Mace', 'Light Crossbow'],
        armor: ['Scale Mail', 'Shield'],
        items: ['Holy Symbol', 'Priest\'s Pack', 'Healer\'s Kit'],
    },
    'Druid': {
        weapons: ['Quarterstaff', 'Dagger'],
        armor: ['Leather Armor', 'Shield'],
        items: ['Druidic Focus', 'Explorer\'s Pack'],
    },
    'Fighter': {
        weapons: ['Longsword', 'Shield'],
        armor: ['Chain Mail'],
        items: ['Martial Melee Weapon', 'Bedroll', 'Rope'],
    },
    'Monk': {
        weapons: ['Shortsword', 'Martial Arts'],
        armor: ['No Armor'],
        items: ['Insignia', 'Traveler\'s Pack', 'Dart'],
    },
    'Paladin': {
        weapons: ['Longsword', 'Shield'],
        armor: ['Chain Mail'],
        items: ['Holy Symbol', 'Priest\'s Pack'],
    },
    'Ranger': {
        weapons: ['Longsword', 'Shortsword', 'Longbow'],
        armor: ['Leather Armor', 'Dagger'],
        items: ['Arrows (20)', 'Explorer\'s Pack'],
    },
    'Rogue': {
        weapons: ['Rapier', 'Hand Crossbow'],
        armor: ['Leather Armor'],
        items: ['Burglar\'s Pack', 'Thieves\' Tools', 'Dagger'],
    },
    'Sorcerer': {
        weapons: ['Light Crossbow', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Arcane Focus', 'Dungeoneer\'s Pack'],
    },
    'Warlock': {
        weapons: ['Light Crossbow', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Arcane Focus', 'Scholar\'s Pack'],
    },
    'Wizard': {
        weapons: ['Quarterstaff', 'Dagger'],
        armor: ['No Armor'],
        items: ['Spellbook', 'Component Pouch', 'Scholar\'s Pack', 'Ink & Quill'],
    },
};

/**
 * Comprehensive equipment database
 */
export const EQUIPMENT_DATABASE: Record<string, Equipment> = {
    // Weapons
    'Greataxe': { name: 'Greataxe', type: 'weapon', rarity: 'common', weight: 7 },
    'Longsword': { name: 'Longsword', type: 'weapon', rarity: 'common', weight: 3 },
    'Shortsword': { name: 'Shortsword', type: 'weapon', rarity: 'common', weight: 2 },
    'Rapier': { name: 'Rapier', type: 'weapon', rarity: 'common', weight: 2 },
    'Quarterstaff': { name: 'Quarterstaff', type: 'weapon', rarity: 'common', weight: 4 },
    'Mace': { name: 'Mace', type: 'weapon', rarity: 'common', weight: 4 },
    'Handaxe': { name: 'Handaxe', type: 'weapon', rarity: 'common', weight: 2 },
    'Dagger': { name: 'Dagger', type: 'weapon', rarity: 'common', weight: 1 },
    'Dart': { name: 'Dart', type: 'weapon', rarity: 'common', weight: 0.25 },
    'Javelin': { name: 'Javelin', type: 'weapon', rarity: 'common', weight: 2 },
    'Light Crossbow': { name: 'Light Crossbow', type: 'weapon', rarity: 'uncommon', weight: 5 },
    'Hand Crossbow': { name: 'Hand Crossbow', type: 'weapon', rarity: 'uncommon', weight: 3 },
    'Longbow': { name: 'Longbow', type: 'weapon', rarity: 'uncommon', weight: 2 },
    'Martial Melee Weapon': { name: 'Martial Melee Weapon', type: 'weapon', rarity: 'common', weight: 3 },

    // Armor
    'No Armor': { name: 'No Armor', type: 'armor', rarity: 'common', weight: 0 },
    'Leather Armor': { name: 'Leather Armor', type: 'armor', rarity: 'common', weight: 10 },
    'Scale Mail': { name: 'Scale Mail', type: 'armor', rarity: 'common', weight: 45 },
    'Chain Mail': { name: 'Chain Mail', type: 'armor', rarity: 'common', weight: 55 },
    'Plate Armor': { name: 'Plate Armor', type: 'armor', rarity: 'rare', weight: 65 },
    'Shield': { name: 'Shield', type: 'armor', rarity: 'common', weight: 6 },

    // Items and gear
    'Spellbook': { name: 'Spellbook', type: 'item', rarity: 'uncommon', weight: 3 },
    'Holy Symbol': { name: 'Holy Symbol', type: 'item', rarity: 'common', weight: 1 },
    'Arcane Focus': { name: 'Arcane Focus', type: 'item', rarity: 'common', weight: 1 },
    'Druidic Focus': { name: 'Druidic Focus', type: 'item', rarity: 'common', weight: 1 },
    'Component Pouch': { name: 'Component Pouch', type: 'item', rarity: 'common', weight: 2 },
    'Lute': { name: 'Lute', type: 'item', rarity: 'common', weight: 2 },
    'Thieves\' Tools': { name: 'Thieves\' Tools', type: 'item', rarity: 'uncommon', weight: 1 },
    'Healer\'s Kit': { name: 'Healer\'s Kit', type: 'item', rarity: 'common', weight: 3 },
    'Bedroll': { name: 'Bedroll', type: 'item', rarity: 'common', weight: 10 },
    'Rope': { name: 'Rope', type: 'item', rarity: 'common', weight: 1 },
    'Backpack': { name: 'Backpack', type: 'item', rarity: 'common', weight: 5 },
    'Torch': { name: 'Torch', type: 'item', rarity: 'common', weight: 1 },
    'Waterskin': { name: 'Waterskin', type: 'item', rarity: 'common', weight: 5 },
    'Ink & Quill': { name: 'Ink & Quill', type: 'item', rarity: 'common', weight: 1 },

    // Adventure packs
    'Burglar\'s Pack': { name: 'Burglar\'s Pack', type: 'item', rarity: 'common', weight: 44 },
    'Explorer\'s Pack': { name: 'Explorer\'s Pack', type: 'item', rarity: 'common', weight: 59 },
    'Entertainer\'s Pack': { name: 'Entertainer\'s Pack', type: 'item', rarity: 'common', weight: 58 },
    'Priest\'s Pack': { name: 'Priest\'s Pack', type: 'item', rarity: 'common', weight: 33 },
    'Dungeon Delver\'s Pack': { name: 'Dungeon Delver\'s Pack', type: 'item', rarity: 'common', weight: 48 },
    'Dungeoneer\'s Pack': { name: 'Dungeoneer\'s Pack', type: 'item', rarity: 'common', weight: 48 },
    'Scholar\'s Pack': { name: 'Scholar\'s Pack', type: 'item', rarity: 'common', weight: 49 },
    'Traveler\'s Pack': { name: 'Traveler\'s Pack', type: 'item', rarity: 'common', weight: 64 },

    // Ammunition
    'Arrows (20)': { name: 'Arrows (20)', type: 'item', rarity: 'common', weight: 1 },
    'Bolts (20)': { name: 'Bolts (20)', type: 'item', rarity: 'common', weight: 1.5 },

    // Insignia
    'Insignia': { name: 'Insignia', type: 'item', rarity: 'common', weight: 0 },

    // Martial Arts
    'Martial Arts': { name: 'Martial Arts', type: 'weapon', rarity: 'common', weight: 0 },
};

// Mastery System Constants
export const MASTERY_THRESHOLD = 10; // Number of listens to master a track
export const MASTERY_BONUS_XP = 500; // Bonus XP for mastering a track

