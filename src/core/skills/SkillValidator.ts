/**
 * Skill Validator
 *
 * Validates custom skills against strict schemas.
 * Provides comprehensive validation for all skill properties including:
 * - Required fields (id, name, ability, source)
 * - Valid enum values (ability, source)
 * - ID format validation (lowercase_with_underscores)
 * - Optional fields (description, categories, tags, customProperties)
 * Uses shared AbilityConstants for code deduplication.
 */

import type { SkillValidationResult, SkillPrerequisite } from './SkillTypes.js';
import type { CharacterSheet, Ability } from '../types/Character.js';
import { VALID_ABILITIES, isValidAbility as isValidAbilityCheck } from '../utils/AbilityConstants.js';
import { validatePrerequisites } from '../utils/PrerequisiteValidator.js';

/**
 * Valid skill sources
 */
const VALID_SKILL_SOURCES: ReadonlyArray<string> = ['default', 'custom'] as const;

/**
 * Valid proficiency levels (for skill proficiency validation)
 */
const VALID_PROFICIENCY_LEVELS: ReadonlyArray<string> = ['none', 'proficient', 'expertise'] as const;

/**
 * Valid proficiency sources (for skill proficiency validation)
 */
const VALID_PROFICIENCY_SOURCES: ReadonlyArray<string> = ['class', 'background', 'feat', 'custom', 'racial', 'other'] as const;

/**
 * SkillValidator - Validates custom skills
 *
 * Provides strict validation to ensure custom skills
 * meet all requirements before being registered with SkillRegistry.
 */
export class SkillValidator {
    /**
     * Validate a custom skill
     *
     * Checks all required fields, enum values, and data constraints.
     *
     * @param skill - The custom skill to validate
     * @returns Validation result with errors if any
     */
    static validateSkill(skill: unknown): SkillValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
            return {
                valid: false,
                errors: ['Skill must be an object']
            };
        }

        const s = skill as Record<string, unknown>;

        // Validate required fields: id, name, ability, source
        if (!s.id || typeof s.id !== 'string') {
            errors.push('Skill must have a valid id (string)');
        } else if (!this.isValidSkillId(s.id)) {
            errors.push(`Skill id must use lowercase_with_underscores format: "${s.id}"`);
        }

        if (!s.name || typeof s.name !== 'string') {
            errors.push('Skill must have a valid name (string)');
        }

        if (!s.ability || typeof s.ability !== 'string') {
            errors.push('Skill must have an ability (string)');
        } else if (!VALID_ABILITIES.includes(s.ability)) {
            errors.push(`Invalid ability: "${s.ability}". Must be one of: ${VALID_ABILITIES.join(', ')}`);
        }

        if (!s.source || typeof s.source !== 'string') {
            errors.push('Skill must have a source (string)');
        } else if (!VALID_SKILL_SOURCES.includes(s.source)) {
            errors.push(`Invalid source: "${s.source}". Must be one of: ${VALID_SKILL_SOURCES.join(', ')}`);
        }

        // Validate optional fields
        if (s.description !== undefined && typeof s.description !== 'string') {
            errors.push('Skill description must be a string');
        }

        if (s.armorPenalty !== undefined && typeof s.armorPenalty !== 'boolean') {
            errors.push('Skill armorPenalty must be a boolean');
        }

        if (s.customProperties !== undefined) {
            if (typeof s.customProperties !== 'object' || Array.isArray(s.customProperties) || s.customProperties === null) {
                errors.push('Skill customProperties must be a record');
            } else {
                // Validate that customProperties values are valid types
                for (const [key, value] of Object.entries(s.customProperties)) {
                    const valueType = typeof value;
                    if (
!['string', 'number', 'boolean'].includes(valueType) &&
                        !Array.isArray(value)
                    ) {
                        errors.push(`customProperties.${key} has invalid type: ${valueType}. Must be string, number, boolean, or string array`);
                    }
                    if (Array.isArray(value)) {
                        for (let i = 0; i < value.length; i++) {
                            if (typeof value[i] !== 'string') {
                                errors.push(`customProperties.${key}[${i}] must be a string`);
                            }
                        }
                    }
                }
            }
        }

        if (s.categories !== undefined) {
            if (!Array.isArray(s.categories)) {
                errors.push('Skill categories must be an array');
            } else {
                for (const category of s.categories) {
                    if (typeof category !== 'string') {
                        errors.push(`Skill category must be a string (got: ${typeof category})`);
                    }
                }
            }
        }

        if (s.tags !== undefined) {
            if (!Array.isArray(s.tags)) {
                errors.push('Skill tags must be an array');
            } else {
                for (const tag of s.tags) {
                    if (typeof tag !== 'string') {
                        errors.push(`Skill tag must be a string (got: ${typeof tag})`);
                    }
                }
            }
        }

        if (s.lore !== undefined && typeof s.lore !== 'string') {
            errors.push('Skill lore must be a string');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an array of custom skills
     *
     * @param skills - Array of custom skills to validate
     * @returns Validation result with combined errors
     */
    static validateSkills(skills: unknown[]): SkillValidationResult {
        const errors: string[] = [];

        if (!Array.isArray(skills)) {
            return {
                valid: false,
                errors: ['Input must be an array of skills']
            };
        }

        skills.forEach((skill, index) => {
            const result = this.validateSkill(skill);
            if (!result.valid) {
                errors.push(`Skill at index ${index}: ${result.errors.join('; ')}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a skill proficiency
     *
     * @param proficiency - The skill proficiency to validate
     * @returns Validation result with errors if any
     */
    static validateSkillProficiency(proficiency: unknown): SkillValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!proficiency || typeof proficiency !== 'object' || Array.isArray(proficiency)) {
            return {
                valid: false,
                errors: ['Skill proficiency must be an object']
            };
        }

        const p = proficiency as Record<string, unknown>;

        // Validate required fields: skillId, level, source
        if (!p.skillId || typeof p.skillId !== 'string') {
            errors.push('Skill proficiency must have a valid skillId (string)');
        } else if (!this.isValidSkillId(p.skillId)) {
            errors.push(`Skill proficiency skillId must use lowercase_with_underscores format: "${p.skillId}"`);
        }

        if (!p.level || typeof p.level !== 'string') {
            errors.push('Skill proficiency must have a level (string)');
        } else if (!VALID_PROFICIENCY_LEVELS.includes(p.level)) {
            errors.push(`Invalid proficiency level: "${p.level}". Must be one of: ${VALID_PROFICIENCY_LEVELS.join(', ')}`);
        }

        if (!p.source || typeof p.source !== 'string') {
            errors.push('Skill proficiency must have a source (string)');
        } else if (!VALID_PROFICIENCY_SOURCES.includes(p.source)) {
            errors.push(`Invalid proficiency source: "${p.source}". Must be one of: ${VALID_PROFICIENCY_SOURCES.join(', ')}`);
        }

        // Validate optional grantedBy field
        if (p.grantedBy !== undefined && typeof p.grantedBy !== 'string') {
            errors.push('Skill proficiency grantedBy must be a string');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an array of skill proficiencies
     *
     * @param proficiencies - Array of skill proficiencies to validate
     * @returns Validation result with combined errors
     */
    static validateSkillProficiencies(proficiencies: unknown[]): SkillValidationResult {
        const errors: string[] = [];

        if (!Array.isArray(proficiencies)) {
            return {
                valid: false,
                errors: ['Input must be an array of skill proficiencies']
            };
        }

        proficiencies.forEach((proficiency, index) => {
            const result = this.validateSkillProficiency(proficiency);
            if (!result.valid) {
                errors.push(`Proficiency at index ${index}: ${result.errors.join('; ')}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a skill list definition
     *
     * @param skillList - The skill list definition to validate
     * @returns Validation result with errors if any
     */
    static validateSkillListDefinition(skillList: unknown): SkillValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!skillList || typeof skillList !== 'object' || Array.isArray(skillList)) {
            return {
                valid: false,
                errors: ['Skill list definition must be an object']
            };
        }

        const sl = skillList as Record<string, unknown>;

        // Validate required fields: class, skillCount, availableSkills
        if (!sl.class || typeof sl.class !== 'string') {
            errors.push('Skill list definition must have a class (string)');
        }

        if (typeof sl.skillCount !== 'number') {
            errors.push('Skill list definition must have a skillCount (number)');
        } else if (sl.skillCount < 0 || !Number.isInteger(sl.skillCount)) {
            errors.push(`Skill list skillCount must be a non-negative integer (got: ${sl.skillCount})`);
        }

        if (!Array.isArray(sl.availableSkills)) {
            errors.push('Skill list definition must have availableSkills (array)');
        } else {
            for (const skillId of sl.availableSkills) {
                if (typeof skillId !== 'string') {
                    errors.push(`availableSkills must contain only strings (got: ${typeof skillId})`);
                } else if (!this.isValidSkillId(skillId)) {
                    errors.push(`availableSkills contains invalid skill ID format: "${skillId}"`);
                }
            }

            // Validate skillCount doesn't exceed availableSkills
            if (typeof sl.skillCount === 'number' && sl.skillCount > sl.availableSkills.length) {
                errors.push(`skillCount (${sl.skillCount}) cannot exceed availableSkills length (${sl.availableSkills.length})`);
            }
        }

        // Validate optional hasExpertise field
        if (sl.hasExpertise !== undefined && typeof sl.hasExpertise !== 'boolean') {
            errors.push('Skill list hasExpertise must be a boolean');
        }

        // Validate optional expertiseCount field
        if (sl.expertiseCount !== undefined) {
            if (typeof sl.expertiseCount !== 'number') {
                errors.push('Skill list expertiseCount must be a number');
            } else if (sl.expertiseCount < 0 || !Number.isInteger(sl.expertiseCount)) {
                errors.push(`expertiseCount must be a non-negative integer (got: ${sl.expertiseCount})`);
            } else if (Array.isArray(sl.availableSkills) && sl.expertiseCount > sl.availableSkills.length) {
                errors.push(`expertiseCount (${sl.expertiseCount}) cannot exceed availableSkills length (${sl.availableSkills.length})`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if a skill ID follows the correct naming convention
     *
     * Skill IDs should use lowercase_with_underscores format.
     * Examples: 'athletics', 'survival_cold', 'arcana_planar'
     *
     * @param id - The skill ID to check
     * @returns True if the ID format is valid
     */
    static isValidSkillId(id: string): boolean {
        // Must be lowercase, alphanumeric, with underscores allowed
        // Must start with a letter
        // Examples: 'athletics', 'survival_cold', 'arcana_planar'
        return /^[a-z][a-z0-9_]*$/.test(id);
    }

    /**
     * Check if a value is a valid ability score
     *
     * Re-exports the shared isValidAbility function for convenience.
     * Uses the same validation as all other systems for consistency.
     *
     * @param ability - The ability value to check
     * @returns True if the value is a valid ability (STR, DEX, CON, INT, WIS, CHA)
     */
    static isValidAbility(ability: string): ability is Ability {
        return isValidAbilityCheck(ability);
    }

    /**
     * Validate skill prerequisites against a character
     *
     * Checks if a character meets all prerequisite requirements for a skill.
     * Uses the shared PrerequisiteValidator for consistency across all systems.
     *
     * @param prerequisites - The skill prerequisites to validate
     * @param character - The character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    static validateSkillPrerequisites(
        prerequisites: SkillPrerequisite | undefined,
        character: CharacterSheet
    ): SkillValidationResult {
        return validatePrerequisites(prerequisites, character);
    }
}

/**
 * Helper function to validate a single skill
 *
 * Convenience function for quick validation.
 *
 * @param skill - The custom skill to validate
 * @returns Validation result with errors if any
 */
export function validateSkill(skill: unknown): SkillValidationResult {
    return SkillValidator.validateSkill(skill);
}

/**
 * Helper function to validate an array of skills
 *
 * Convenience function for batch validation.
 *
 * @param skills - Array of custom skills to validate
 * @returns Validation result with combined errors
 */
export function validateSkills(skills: unknown[]): SkillValidationResult {
    return SkillValidator.validateSkills(skills);
}

/**
 * Helper function to validate a skill proficiency
 *
 * Convenience function for quick validation.
 *
 * @param proficiency - The skill proficiency to validate
 * @returns Validation result with errors if any
 */
export function validateSkillProficiency(proficiency: unknown): SkillValidationResult {
    return SkillValidator.validateSkillProficiency(proficiency);
}

/**
 * Helper function to validate an array of skill proficiencies
 *
 * Convenience function for batch validation.
 *
 * @param proficiencies - Array of skill proficiencies to validate
 * @returns Validation result with combined errors
 */
export function validateSkillProficiencies(proficiencies: unknown[]): SkillValidationResult {
    return SkillValidator.validateSkillProficiencies(proficiencies);
}

/**
 * Helper function to validate a skill list definition
 *
 * Convenience function for quick validation.
 *
 * @param skillList - The skill list definition to validate
 * @returns Validation result with errors if any
 */
export function validateSkillListDefinition(skillList: unknown): SkillValidationResult {
    return SkillValidator.validateSkillListDefinition(skillList);
}

/**
 * Helper function to validate skill prerequisites against a character
 *
 * Convenience function for quick validation.
 *
 * @param prerequisites - The skill prerequisites to validate
 * @param character - The character sheet to validate against
 * @returns Validation result with unmet prerequisites if any
 */
export function validateSkillPrerequisites(
    prerequisites: SkillPrerequisite | undefined,
    character: CharacterSheet
): SkillValidationResult {
    return SkillValidator.validateSkillPrerequisites(prerequisites, character);
}
