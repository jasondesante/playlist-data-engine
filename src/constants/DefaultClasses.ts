/**
 * D&D 5e Default Classes Data
 *
 * This file contains the default class data for all D&D 5e classes.
 * Moved from src/utils/constants.ts for better organization.
 */

import type { Class } from '../core/types/Character.js';
import type { ClassDataEntry } from '../utils/constants.js';

/**
 * Default D&D 5e class data
 *
 * Contains all the core information needed for character generation:
 * - Primary ability score
 * - Hit die size
 * - Saving throw proficiencies
 * - Spellcasting capability
 * - Number of skills to choose
 * - Available skills
 * - Expertise availability
 */
export const CLASS_DATA: Record<string, ClassDataEntry> = {
    'Barbarian': {
        primary_ability: 'STR',
        hit_die: 12,
        saving_throws: ['STR', 'CON'],
        is_spellcaster: false,
        skill_count: 2,
        available_skills: ['athletics', 'animal_handling', 'intimidation', 'nature', 'perception', 'survival'],
        has_expertise: false,
        description: 'A fierce warrior of primitive background who can enter a battle rage. Barbarians draw on primal fury to unleash devastating attacks, shrug off wounds that would fell others, and channel their totem spirits\' power. They thrive on the front lines, where their rage makes them unstoppable forces of nature.',
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
        description: 'An inspiring magician whose power echoes the music of creation. Bards weave magic through music, poetry, and performance, inspiring allies, demoralizing enemies, and wielding versatile spells. They are jack-of-all-trades who can fill any role, from frontline support to devastating spellcaster.',
    },
    'Cleric': {
        primary_ability: 'WIS',
        hit_die: 8,
        saving_throws: ['WIS', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
        has_expertise: false,
        description: 'A priestly champion who wields divine magic in service of a higher power. Clerics serve as intermediaries between the mortal world and the divine, wielding healing and destructive magic granted by their deities. They can wear heavy armor, wield powerful weapons, and specialize in different domains of divine influence.',
    },
    'Druid': {
        primary_ability: 'WIS',
        hit_die: 8,
        saving_throws: ['INT', 'WIS'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'animal_handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
        has_expertise: false,
        description: 'A priest of the Old Faith, wielding the powers of nature and adopting animal forms. Druids revere nature and gain their magic from the natural world, commanding the elements, transforming into beasts, and calling upon the forces of life and growth. They serve as guardians of the wild places and mediators between civilization and nature.',
    },
    'Fighter': {
        primary_ability: 'STR',
        hit_die: 10,
        saving_throws: ['STR', 'CON'],
        is_spellcaster: false,
        skill_count: 2,
        available_skills: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
        has_expertise: false,
        description: 'A master of martial combat, skilled with a variety of weapons and armor. Fighters learn countless fighting techniques, specializing in certain styles of combat. They are the backbone of any adventuring party, capable of withstanding tremendous punishment while dishing out devastating damage through martial prowess alone.',
    },
    'Monk': {
        primary_ability: 'DEX',
        hit_die: 8,
        saving_throws: ['STR', 'DEX'],
        is_spellcaster: false,
        skill_count: 2,
        available_skills: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
        has_expertise: false,
        description: 'A master of martial arts, harnessing the power of the body in pursuit of physical and spiritual perfection. Monks use their bodies as weapons, channeling ki energy to perform extraordinary feats. They are agile warriors who can strike with deadly precision, evade attacks with supernatural grace, and harness mystical abilities.',
    },
    'Paladin': {
        primary_ability: 'STR',
        hit_die: 10,
        saving_throws: ['WIS', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
        has_expertise: false,
        description: 'A holy warrior bound to a sacred oath. Paladins combine martial prowess with divine magic, smiting foes with holy fire and healing allies with sacred power. They are paragons of their beliefs, radiating auras that protect allies and punish enemies. Their strength comes from their unwavering devotion to their oath.',
    },
    'Ranger': {
        primary_ability: 'DEX',
        hit_die: 10,
        saving_throws: ['STR', 'DEX'],
        is_spellcaster: true,
        skill_count: 3,
        available_skills: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
        has_expertise: false,
        description: 'A warrior who combats threats on the edges of civilization. Rangers are hunters and trackers who know the wilderness intimately, moving swiftly through natural terrain and striking from a distance. They develop supernatural connections to their chosen enemies and environments, gaining deadly precision against favored foes.',
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
        description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies. Rogues excel at skills, finding traps, and striking devastating blows from hiding. Whether as thieves, assassins, or spies, they are versatile problem-solvers who can disable threats before allies even know they exist.',
    },
    'Sorcerer': {
        primary_ability: 'CHA',
        hit_die: 6,
        saving_throws: ['CON', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
        has_expertise: false,
        description: 'A spellcaster who draws on inherent magic from a supernatural bloodline or cosmic source. Sorcerers have no need for spellbooks—their power comes from within, born of draconic heritage, wild magic, or other supernatural origins. They can manipulate and metamagic their spells in ways other casters cannot.',
    },
    'Warlock': {
        primary_ability: 'CHA',
        hit_die: 8,
        saving_throws: ['WIS', 'CHA'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
        has_expertise: false,
        description: 'A wielder of magic that is derived from a bargain with an extraplanar entity. Warlocks gain their powers through pacts with powerful beings—fiends, fey, Great Old Ones, or other eldritch entities. In exchange for service, they receive mystical abilities and can cast eldritch invocations that blur the line between spell and supernatural ability.',
    },
    'Wizard': {
        primary_ability: 'INT',
        hit_die: 6,
        saving_throws: ['INT', 'WIS'],
        is_spellcaster: true,
        skill_count: 2,
        available_skills: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
        has_expertise: false,
        description: 'A scholarly magic-user capable of manipulating the structures of reality. Wizards are masters of arcane magic, studying spellbooks to unlock the secrets of the universe. They specialize in specific schools of magic, from evocation to illusion, and have access to the widest variety of spells of any class.',
    },
};

/**
 * All classes in order for character generation
 */
export const ALL_CLASSES: Class[] = [
    'Barbarian' as Class,
    'Bard' as Class,
    'Cleric' as Class,
    'Druid' as Class,
    'Fighter' as Class,
    'Monk' as Class,
    'Paladin' as Class,
    'Ranger' as Class,
    'Rogue' as Class,
    'Sorcerer' as Class,
    'Warlock' as Class,
    'Wizard' as Class,
];

/**
 * Audio preference data for class affinity calculation
 *
 * Each class has preferred audio traits that determine affinity:
 * - primary: The most important audio characteristic
 * - secondary: Optional secondary characteristic
 * - tertiary: Optional tertiary characteristic
 * - weights: Multipliers for each frequency band (0-1 range)
 *
 * Used by ClassSuggester for affinity-based class selection.
 */
export const CLASS_AUDIO_PREFERENCES: Record<string, {
    primary: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
    secondary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
    tertiary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
    bass?: number;
    treble?: number;
    mid?: number;
    amplitude?: number;
}> = {
    'Barbarian': {
        primary: 'bass',
        secondary: 'amplitude',
        bass: 1.0,
        amplitude: 0.7
    },
    'Fighter': {
        primary: 'bass',
        secondary: 'amplitude',
        bass: 0.9,
        amplitude: 0.8
    },
    'Paladin': {
        primary: 'bass',
        secondary: 'mid',
        bass: 0.8,
        mid: 0.5
    },
    'Rogue': {
        primary: 'treble',
        treble: 1.0
    },
    'Ranger': {
        primary: 'treble',
        secondary: 'bass',
        treble: 0.8,
        bass: 0.5
    },
    'Monk': {
        primary: 'treble',
        secondary: 'mid',
        treble: 0.7,
        mid: 0.6
    },
    'Wizard': {
        primary: 'mid',
        mid: 1.0
    },
    'Cleric': {
        primary: 'mid',
        secondary: 'amplitude',
        mid: 0.8,
        amplitude: 0.6
    },
    'Druid': {
        primary: 'mid',
        secondary: 'bass',
        mid: 0.7,
        bass: 0.6
    },
    'Bard': {
        primary: 'amplitude',
        secondary: 'mid',
        tertiary: 'treble',
        amplitude: 0.8,
        mid: 0.6,
        treble: 0.3
    },
    'Sorcerer': {
        primary: 'amplitude',
        secondary: 'chaos',
        amplitude: 0.9
    },
    'Warlock': {
        primary: 'amplitude',
        secondary: 'treble',
        amplitude: 0.7,
        treble: 0.5
    },
};
