/**
 * Spell Validator
 *
 * Validates spells against strict schemas.
 * Provides comprehensive validation for all spell properties including:
 * - Required fields (name, level, school, casting_time, range, components, duration)
 * - Valid enum values (school)
 * - Level validation (0-9)
 * - Optional fields (id, description, prerequisites)
 *
 * Part of Phase 4: Spell Prerequisites System.
 * Part of Phase 13: Code Deduplication - Uses shared AbilityConstants.
 */

import type { SpellPrerequisite, Spell } from './SpellTypes.js';
import type { Ability, CharacterSheet } from '../types/Character.js';
import { isValidAbility } from '../utils/AbilityConstants.js';
import { validatePrerequisiteSchema, validatePrerequisites } from '../utils/PrerequisiteValidator.js';

/**
 * Valid D&D 5e spell schools
 */
const VALID_SCHOOLS: ReadonlyArray<string> = [
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Necromancy',
    'Transmutation'
] as const;

/**
 * Valid spell levels (cantrips are 0)
 */
const VALID_SPELL_LEVELS: ReadonlyArray<number> = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Valid components
 */
const VALID_COMPONENTS: ReadonlyArray<string> = ['V', 'S', 'M'] as const;

/**
 * Validation result type
 */
export interface SpellValidationResult {
    /** Whether the spell/prerequisite is valid */
    valid: boolean;
    /** Array of error messages (empty if valid) */
    errors: string[];
}

/**
 * SpellValidator - Validates spells and their prerequisites
 *
 * Provides strict validation to ensure spells
 * meet all requirements and can validate prerequisites
 * against a character sheet.
 */
export class SpellValidator {
    /**
     * Validate a spell
     *
     * Checks all required fields, enum values, and data constraints.
     *
     * @param spell - The spell to validate
     * @returns Validation result with errors if any
     */
    static validateSpell(spell: unknown): SpellValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!spell || typeof spell !== 'object' || Array.isArray(spell)) {
            return {
                valid: false,
                errors: ['Spell must be an object']
            };
        }

        const s = spell as Record<string, unknown>;

        // Validate required fields: name, level, school, casting_time, range, components, duration
        if (!s.name || typeof s.name !== 'string') {
            errors.push('Spell must have a valid name (string)');
        }

        if (typeof s.level !== 'number') {
            errors.push('Spell must have a level (number)');
        } else if (!VALID_SPELL_LEVELS.includes(s.level)) {
            errors.push(`Invalid spell level: "${s.level}". Must be one of: ${VALID_SPELL_LEVELS.join(', ')}`);
        }

        if (!s.school || typeof s.school !== 'string') {
            errors.push('Spell must have a school (string)');
        } else if (!VALID_SCHOOLS.includes(s.school)) {
            errors.push(`Invalid school: "${s.school}". Must be one of: ${VALID_SCHOOLS.join(', ')}`);
        }

        if (!s.casting_time || typeof s.casting_time !== 'string') {
            errors.push('Spell must have a casting_time (string)');
        }

        if (!s.range || typeof s.range !== 'string') {
            errors.push('Spell must have a range (string)');
        }

        if (!Array.isArray(s.components)) {
            errors.push('Spell must have components (array)');
        } else {
            for (const component of s.components) {
                if (typeof component !== 'string') {
                    errors.push(`Spell component must be a string (got: ${typeof component})`);
                } else if (!VALID_COMPONENTS.includes(component)) {
                    errors.push(`Invalid spell component: "${component}". Must be one of: ${VALID_COMPONENTS.join(', ')}`);
                }
            }
        }

        if (!s.duration || typeof s.duration !== 'string') {
            errors.push('Spell must have a duration (string)');
        }

        // Validate optional fields
        if (s.id !== undefined && typeof s.id !== 'string') {
            errors.push('Spell id must be a string');
        }

        if (s.description !== undefined && typeof s.description !== 'string') {
            errors.push('Spell description must be a string');
        }

        // Validate prerequisites if present
        if (s.prerequisites !== undefined) {
            const prereqResult = this.validatePrerequisites(s.prerequisites);
            if (!prereqResult.valid) {
                errors.push(...prereqResult.errors.map(e => `Prerequisites: ${e}`));
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an array of spells
     *
     * @param spells - Array of spells to validate
     * @returns Validation result with combined errors
     */
    static validateSpells(spells: unknown[]): SpellValidationResult {
        const errors: string[] = [];

        if (!Array.isArray(spells)) {
            return {
                valid: false,
                errors: ['Input must be an array of spells']
            };
        }

        spells.forEach((spell, index) => {
            const result = this.validateSpell(spell);
            if (!result.valid) {
                errors.push(`Spell at index ${index}: ${result.errors.join('; ')}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate spell prerequisites schema
     *
     * Validates that the prerequisites object has valid structure.
     * Uses the shared PrerequisiteValidator for consistency.
     *
     * @param prerequisites - The prerequisites to validate
     * @returns Validation result with errors if any
     */
    static validatePrerequisites(prerequisites: unknown): SpellValidationResult {
        return validatePrerequisiteSchema(prerequisites);
    }

    /**
     * Validate spell prerequisites against a character
     *
     * Checks if a character meets all prerequisite requirements for a spell.
     * Uses the shared PrerequisiteValidator for consistency across all systems.
     *
     * @param prerequisites - The spell prerequisites to validate
     * @param character - The character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    static validateSpellPrerequisites(
        prerequisites: SpellPrerequisite | undefined,
        character: CharacterSheet
    ): SpellValidationResult {
        return validatePrerequisites(prerequisites, character);
    }

    /**
     * Check if a string is a valid ability score
     *
     * Re-exports the shared isValidAbility function for convenience.
     *
     * @param ability - The ability string to check
     * @returns True if it's a valid ability
     */
    static isValidAbility(ability: string): ability is Ability {
        return isValidAbility(ability);
    }

    /**
     * Check if a string is a valid spell school
     *
     * @param school - The school string to check
     * @returns True if it's a valid school
     */
    static isValidSchool(school: string): school is Spell['school'] {
        return VALID_SCHOOLS.includes(school);
    }

    /**
     * Check if a number is a valid spell level
     *
     * @param level - The level to check
     * @returns True if it's a valid spell level
     */
    static isValidSpellLevel(level: number): boolean {
        return VALID_SPELL_LEVELS.includes(level);
    }
}

/**
 * Helper function to validate a single spell
 *
 * Convenience function for quick validation.
 *
 * @param spell - The spell to validate
 * @returns Validation result with errors if any
 */
export function validateSpell(spell: unknown): SpellValidationResult {
    return SpellValidator.validateSpell(spell);
}

/**
 * Helper function to validate an array of spells
 *
 * Convenience function for batch validation.
 *
 * @param spells - Array of spells to validate
 * @returns Validation result with combined errors
 */
export function validateSpells(spells: unknown[]): SpellValidationResult {
    return SpellValidator.validateSpells(spells);
}

/**
 * Helper function to validate spell prerequisites schema
 *
 * Convenience function for quick validation.
 *
 * @param prerequisites - The prerequisites to validate
 * @returns Validation result with errors if any
 */
export function validateSpellPrerequisitesSchema(prerequisites: unknown): SpellValidationResult {
    return SpellValidator.validatePrerequisites(prerequisites);
}

/**
 * Helper function to validate spell prerequisites against a character
 *
 * Convenience function for quick validation.
 *
 * @param prerequisites - The spell prerequisites to validate
 * @param character - The character sheet to validate against
 * @returns Validation result with unmet prerequisites if any
 */
export function validateSpellPrerequisites(
    prerequisites: SpellPrerequisite | undefined,
    character: CharacterSheet
): SpellValidationResult {
    return SpellValidator.validateSpellPrerequisites(prerequisites, character);
}
