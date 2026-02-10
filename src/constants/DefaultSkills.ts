/**
 * Default Skills
 *
 * Default D&D 5e skills with complete metadata.
 * These skills are loaded into the SkillQuery on initialization.
 */

import type { CustomSkill } from '../core/skills/SkillTypes.js';
import type { Ability } from '../core/types/Character.js';

/**
 * Default 18 D&D 5e skills
 *
 * Each skill includes:
 * - id: Unique identifier (lowercase_with_underscores)
 * - name: Display name
 * - ability: Associated ability score
 * - armorPenalty: Whether armor disadvantage applies
 * - categories: Optional groupings for filtering
 * - source: 'default' for core D&D 5e skills
 */
export const DEFAULT_SKILLS: CustomSkill[] = [
    // STR-based skills
    {
        id: 'athletics',
        name: 'Athletics',
        ability: 'STR' as Ability,
        armorPenalty: true,
        categories: ['physical', 'exploration', 'combat'],
        source: 'default'
    },

    // DEX-based skills
    {
        id: 'acrobatics',
        name: 'Acrobatics',
        ability: 'DEX' as Ability,
        armorPenalty: true,
        categories: ['physical', 'exploration'],
        source: 'default'
    },
    {
        id: 'sleight_of_hand',
        name: 'Sleight of Hand',
        ability: 'DEX' as Ability,
        armorPenalty: true,
        categories: ['physical', 'criminal', 'subterfuge'],
        source: 'default'
    },
    {
        id: 'stealth',
        name: 'Stealth',
        ability: 'DEX' as Ability,
        armorPenalty: true,
        categories: ['physical', 'subterfuge', 'exploration'],
        source: 'default'
    },

    // INT-based skills
    {
        id: 'arcana',
        name: 'Arcana',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'magic'],
        source: 'default'
    },
    {
        id: 'history',
        name: 'History',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge'],
        source: 'default'
    },
    {
        id: 'investigation',
        name: 'Investigation',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'exploration'],
        source: 'default'
    },
    {
        id: 'nature',
        name: 'Nature',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'environmental'],
        source: 'default'
    },
    {
        id: 'religion',
        name: 'Religion',
        ability: 'INT' as Ability,
        armorPenalty: false,
        categories: ['knowledge'],
        source: 'default'
    },

    // WIS-based skills
    {
        id: 'animal_handling',
        name: 'Animal Handling',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['environmental', 'social'],
        source: 'default'
    },
    {
        id: 'insight',
        name: 'Insight',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['social', 'perception'],
        source: 'default'
    },
    {
        id: 'medicine',
        name: 'Medicine',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['knowledge', 'practical'],
        source: 'default'
    },
    {
        id: 'perception',
        name: 'Perception',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['perception', 'exploration'],
        source: 'default'
    },
    {
        id: 'survival',
        name: 'Survival',
        ability: 'WIS' as Ability,
        armorPenalty: false,
        categories: ['environmental', 'exploration'],
        source: 'default'
    },

    // CHA-based skills
    {
        id: 'deception',
        name: 'Deception',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social', 'subterfuge'],
        source: 'default'
    },
    {
        id: 'intimidation',
        name: 'Intimidation',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social', 'combat'],
        source: 'default'
    },
    {
        id: 'performance',
        name: 'Performance',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social', 'entertainment'],
        source: 'default'
    },
    {
        id: 'persuasion',
        name: 'Persuasion',
        ability: 'CHA' as Ability,
        armorPenalty: false,
        categories: ['social'],
        source: 'default'
    }
];

/**
 * All categories used by default skills
 * Useful for filtering and UI display
 */
export const DEFAULT_SKILL_CATEGORIES = [
    'physical',
    'exploration',
    'combat',
    'criminal',
    'subterfuge',
    'knowledge',
    'magic',
    'environmental',
    'social',
    'perception',
    'practical',
    'entertainment'
];
