/**
 * Spell Types
 *
 * Type definitions for spell-related structures.
 * Moved from src/utils/constants.ts for better module organization.
 */

import type { Class, Race } from '../types/Character.js';

/**
 * D&D 5e Schools of Magic
 *
 * The eight schools of magic categorize spells by their effects and methods.
 * Used by the Spell interface and validation systems.
 */
export type SpellSchool = 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';

/**
 * Prerequisites for learning a spell
 *
 * Spells can require:
 * - Level thresholds
 * - Caster level thresholds
 * - Ability score minimums
 * - Specific class
 * - Specific race
 * - Specific features (by feature ID)
 * - Specific spells (must be known first)
 * - Specific skills (by proficiency)
 * - Custom conditions
 */
export interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Custom condition */
    custom?: string;
}

/**
 * Spell data structure
 */
export interface Spell {
    /** Unique identifier (optional for backward compatibility) */
    id?: string;

    name: string;
    level: number;
    school: SpellSchool;
    casting_time: string;
    range: string;
    components: string[];
    duration: string;

    /** Optional description of what the spell does */
    description?: string;

    /** Optional icon URL for small UI display */
    icon?: string;

    /** Optional image URL for larger display */
    image?: string;

    /** Prerequisites for learning this spell */
    prerequisites?: SpellPrerequisite;
}
