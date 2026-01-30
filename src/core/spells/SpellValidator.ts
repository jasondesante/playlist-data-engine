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
 */

import type { SpellPrerequisite } from '../../utils/constants.js';
import type { Ability, CharacterSheet } from '../types/Character.js';

/**
 * Valid D&D 5e abilities
 */
const VALID_ABILITIES: ReadonlyArray<string> = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

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
 * Spell type from constants.ts
 */
export interface Spell {
    /** Unique identifier (optional for backward compatibility) */
    id?: string;

    name: string;
    level: number;
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    casting_time: string;
    range: string;
    components: string[];
    duration: string;

    /** Optional description of what the spell does */
    description?: string;

    /** Prerequisites for learning this spell */
    prerequisites?: SpellPrerequisite;
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
     *
     * @param prerequisites - The prerequisites to validate
     * @returns Validation result with errors if any
     */
    static validatePrerequisites(prerequisites: unknown): SpellValidationResult {
        const errors: string[] = [];

        // Prerequisites can be undefined (no prerequisites)
        if (prerequisites === undefined || prerequisites === null) {
            return { valid: true, errors: [] };
        }

        // Must be an object
        if (typeof prerequisites !== 'object' || Array.isArray(prerequisites)) {
            return {
                valid: false,
                errors: ['Prerequisites must be an object']
            };
        }

        const p = prerequisites as Record<string, unknown>;

        // Validate level (must be positive number)
        if (p.level !== undefined) {
            if (typeof p.level !== 'number') {
                errors.push('Prerequisite level must be a number');
            } else if (p.level < 1) {
                errors.push(`Prerequisite level must be at least 1 (got: ${p.level})`);
            }
        }

        // Validate casterLevel (must be positive number)
        if (p.casterLevel !== undefined) {
            if (typeof p.casterLevel !== 'number') {
                errors.push('Prerequisite casterLevel must be a number');
            } else if (p.casterLevel < 1) {
                errors.push(`Prerequisite casterLevel must be at least 1 (got: ${p.casterLevel})`);
            }
        }

        // Validate abilities (must be record of ability -> number)
        if (p.abilities !== undefined) {
            if (typeof p.abilities !== 'object' || Array.isArray(p.abilities) || p.abilities === null) {
                errors.push('Prerequisite abilities must be a record');
            } else {
                for (const [ability, minScore] of Object.entries(p.abilities)) {
                    if (!VALID_ABILITIES.includes(ability)) {
                        errors.push(`Invalid ability in prerequisites: "${ability}". Must be one of: ${VALID_ABILITIES.join(', ')}`);
                    }
                    if (typeof minScore !== 'number') {
                        errors.push(`Ability score for ${ability} must be a number (got: ${typeof minScore})`);
                    } else if (minScore < 1 || minScore > 20) {
                        errors.push(`Ability score for ${ability} must be between 1 and 20 (got: ${minScore})`);
                    }
                }
            }
        }

        // Validate class (must be string)
        if (p.class !== undefined && typeof p.class !== 'string') {
            errors.push('Prerequisite class must be a string');
        }

        // Validate race (must be string)
        if (p.race !== undefined && typeof p.race !== 'string') {
            errors.push('Prerequisite race must be a string');
        }

        // Validate features (must be array of strings)
        if (p.features !== undefined) {
            if (!Array.isArray(p.features)) {
                errors.push('Prerequisite features must be an array');
            } else {
                for (const feature of p.features) {
                    if (typeof feature !== 'string') {
                        errors.push(`Prerequisite feature must be a string (got: ${typeof feature})`);
                    }
                }
            }
        }

        // Validate spells (must be array of strings)
        if (p.spells !== undefined) {
            if (!Array.isArray(p.spells)) {
                errors.push('Prerequisite spells must be an array');
            } else {
                for (const spell of p.spells) {
                    if (typeof spell !== 'string') {
                        errors.push(`Prerequisite spell must be a string (got: ${typeof spell})`);
                    }
                }
            }
        }

        // Validate skills (must be array of strings)
        if (p.skills !== undefined) {
            if (!Array.isArray(p.skills)) {
                errors.push('Prerequisite skills must be an array');
            } else {
                for (const skill of p.skills) {
                    if (typeof skill !== 'string') {
                        errors.push(`Prerequisite skill must be a string (got: ${typeof skill})`);
                    }
                }
            }
        }

        // Validate custom (must be string)
        if (p.custom !== undefined && typeof p.custom !== 'string') {
            errors.push('Prerequisite custom must be a string');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate spell prerequisites against a character
     *
     * Checks if a character meets all prerequisite requirements for a spell.
     * Follows the same pattern as SkillPrerequisite validation for consistency.
     *
     * @param prerequisites - The spell prerequisites to validate
     * @param character - The character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    static validateSpellPrerequisites(
        prerequisites: SpellPrerequisite | undefined,
        character: CharacterSheet
    ): SpellValidationResult {
        const unmet: string[] = [];

        // If no prerequisites, spell is available
        if (!prerequisites) {
            return { valid: true, errors: [] };
        }

        // Check level requirement
        if (prerequisites.level !== undefined && character.level < prerequisites.level) {
            unmet.push(`Requires level ${prerequisites.level} (current: ${character.level})`);
        }

        // Check caster level requirement
        if (prerequisites.casterLevel !== undefined && character.level < prerequisites.casterLevel) {
            unmet.push(`Requires caster level ${prerequisites.casterLevel} (current: ${character.level})`);
        }

        // Check ability score requirements
        if (prerequisites.abilities) {
            for (const [ability, minScore] of Object.entries(prerequisites.abilities)) {
                const score = character.ability_scores[ability as Ability];
                if (score === undefined || score < minScore) {
                    unmet.push(`Requires ${ability} ${minScore}+ (current: ${score ?? 0})`);
                }
            }
        }

        // Check class requirement
        if (prerequisites.class !== undefined && character.class !== prerequisites.class) {
            unmet.push(`Requires ${prerequisites.class} class (current: ${character.class})`);
        }

        // Check race requirement
        if (prerequisites.race !== undefined && character.race !== prerequisites.race) {
            unmet.push(`Requires ${prerequisites.race} race (current: ${character.race})`);
        }

        // Check feature prerequisites (features that must be learned first)
        if (prerequisites.features && prerequisites.features.length > 0) {
            const hasFeatures = character.class_features || [];
            for (const requiredFeatureId of prerequisites.features) {
                if (!hasFeatures.includes(requiredFeatureId)) {
                    unmet.push(`Requires feature: ${requiredFeatureId}`);
                }
            }
        }

        // Check spell prerequisites (spells that must be known first)
        if (prerequisites.spells && prerequisites.spells.length > 0) {
            const knownSpells = character.spells?.known_spells || [];
            const cantrips = character.spells?.cantrips || [];
            const allKnownSpells = [...knownSpells, ...cantrips];

            for (const requiredSpell of prerequisites.spells) {
                if (!allKnownSpells.includes(requiredSpell)) {
                    unmet.push(`Requires spell: ${requiredSpell}`);
                }
            }
        }

        // Check skill prerequisites (skills that must be proficient first)
        if (prerequisites.skills && prerequisites.skills.length > 0) {
            for (const requiredSkillId of prerequisites.skills) {
                const proficiency = character.skills[requiredSkillId];
                if (proficiency !== 'proficient' && proficiency !== 'expertise') {
                    unmet.push(`Requires proficiency in ${requiredSkillId} (current: ${proficiency ?? 'none'})`);
                }
            }
        }

        // Note: Custom conditions cannot be automatically validated
        // They must be checked by the calling code
        if (prerequisites.custom) {
            // Add a note about custom condition but don't fail validation
            // The calling code is responsible for validating custom conditions
        }

        return {
            valid: unmet.length === 0,
            errors: unmet
        };
    }

    /**
     * Check if a string is a valid ability score
     *
     * @param ability - The ability string to check
     * @returns True if it's a valid ability
     */
    static isValidAbility(ability: string): ability is Ability {
        return VALID_ABILITIES.includes(ability);
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
