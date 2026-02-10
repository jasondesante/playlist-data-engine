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
