/**
 * Feature Validator
 *
 * Validates class features and racial traits against strict schemas.
 * Provides comprehensive validation for all feature properties including:
 * - Required fields (id, name, description, etc.)
 * - Valid enum values (class, race, type, source)
 * - Value ranges (level 1-20)
 * - Effects and prerequisites
 *
 * Part of Phase 11.7: Create FeatureValidator.
 */

import type { ClassFeature, RacialTrait, FeatureEffect, FeaturePrerequisite } from './FeatureTypes.js';
import type { Class, Race, Ability } from '../types/Character.js';

/**
 * Validation result interface
 *
 * Provides detailed feedback about validation failures.
 */
export interface ValidationResult {
    /** Whether the item is valid */
    valid: boolean;
    /** Array of error messages (empty if valid) */
    errors: string[];
}

/**
 * Valid feature types
 */
const VALID_FEATURE_TYPES: ReadonlyArray<string> = ['passive', 'active', 'resource', 'trigger'] as const;

/**
 * Valid feature sources
 */
const VALID_FEATURE_SOURCES: ReadonlyArray<string> = ['default', 'custom'] as const;

/**
 * Valid effect types
 */
const VALID_EFFECT_TYPES: ReadonlyArray<string> = [
    'stat_bonus',
    'skill_proficiency',
    'ability_unlock',
    'passive_modifier',
    'resource_grant',
    'spell_slot_bonus'
] as const;

/**
 * Valid D&D 5e classes
 */
const VALID_CLASSES: ReadonlyArray<string> = [
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
    'Wizard'
] as const;

/**
 * Valid D&D 5e races
 */
const VALID_RACES: ReadonlyArray<string> = [
    'Human',
    'Elf',
    'Dwarf',
    'Halfling',
    'Dragonborn',
    'Gnome',
    'Half-Elf',
    'Half-Orc',
    'Tiefling'
] as const;

/**
 * Valid D&D 5e abilities
 */
const VALID_ABILITIES: ReadonlyArray<string> = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

/**
 * Valid D&D 5e skills (for skill_proficiency effects)
 */
const VALID_SKILLS: ReadonlyArray<string> = [
    'athletics',
    'acrobatics',
    'sleight_of_hand',
    'stealth',
    'arcana',
    'history',
    'investigation',
    'nature',
    'religion',
    'animal_handling',
    'insight',
    'medicine',
    'perception',
    'survival',
    'deception',
    'intimidation',
    'performance',
    'persuasion'
] as const;

/**
 * Valid proficiency levels
 */
const VALID_PROFICIENCY_LEVELS: ReadonlyArray<string> = ['none', 'proficient', 'expertise'] as const;

/**
 * FeatureValidator - Validates class features and racial traits
 *
 * Provides strict validation to ensure custom features and traits
 * meet all requirements before being registered with FeatureRegistry.
 */
export class FeatureValidator {
    /**
     * Validate a class feature
     *
     * Checks all required fields, enum values, and data constraints.
     *
     * @param feature - The class feature to validate
     * @returns Validation result with errors if any
     */
    static validateClassFeature(feature: unknown): ValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
            return {
                valid: false,
                errors: ['Class feature must be an object']
            };
        }

        const f = feature as Record<string, unknown>;

        // Validate required fields: id, name, description, type, class, level, source
        if (!f.id || typeof f.id !== 'string') {
            errors.push('Feature must have a valid id (string)');
        } else if (!this.isValidFeatureId(f.id)) {
            errors.push(`Feature id must use lowercase_with_underscores format: "${f.id}"`);
        }

        if (!f.name || typeof f.name !== 'string') {
            errors.push('Feature must have a valid name (string)');
        }

        if (!f.description || typeof f.description !== 'string') {
            errors.push('Feature must have a description (string)');
        }

        if (!f.type || typeof f.type !== 'string') {
            errors.push('Feature must have a type (string)');
        } else if (!VALID_FEATURE_TYPES.includes(f.type)) {
            errors.push(`Invalid type: "${f.type}". Must be one of: ${VALID_FEATURE_TYPES.join(', ')}`);
        }

        if (!f.class || typeof f.class !== 'string') {
            errors.push('Feature must have a class (string)');
        } else if (!VALID_CLASSES.includes(f.class)) {
            errors.push(`Invalid class: "${f.class}". Must be one of: ${VALID_CLASSES.join(', ')}`);
        }

        if (typeof f.level !== 'number') {
            errors.push('Feature must have a level (number)');
        } else if (f.level < 1 || f.level > 20) {
            errors.push(`Feature level must be between 1 and 20 (got: ${f.level})`);
        }

        if (!f.source || typeof f.source !== 'string') {
            errors.push('Feature must have a source (string)');
        } else if (!VALID_FEATURE_SOURCES.includes(f.source)) {
            errors.push(`Invalid source: "${f.source}". Must be one of: ${VALID_FEATURE_SOURCES.join(', ')}`);
        }

        // Validate optional fields
        if (f.tags !== undefined) {
            if (!Array.isArray(f.tags)) {
                errors.push('Feature tags must be an array');
            } else {
                for (const tag of f.tags) {
                    if (typeof tag !== 'string') {
                        errors.push(`Feature tag must be a string (got: ${typeof tag})`);
                    }
                }
            }
        }

        if (f.lore !== undefined && typeof f.lore !== 'string') {
            errors.push('Feature lore must be a string');
        }

        if (f.subrace !== undefined && typeof f.subrace !== 'string') {
            errors.push('Feature subrace must be a string');
        }

        // Validate prerequisites if present
        if (f.prerequisites !== undefined) {
            const prereqResult = this.validatePrerequisites(f.prerequisites as FeaturePrerequisite);
            if (!prereqResult.valid) {
                errors.push(...prereqResult.errors.map(e => `Prerequisites: ${e}`));
            }
        }

        // Validate effects if present
        if (f.effects !== undefined) {
            if (!Array.isArray(f.effects)) {
                errors.push('Feature effects must be an array');
            } else {
                for (let i = 0; i < f.effects.length; i++) {
                    const effectResult = this.validateEffect(f.effects[i]);
                    if (!effectResult.valid) {
                        errors.push(...effectResult.errors.map(e => `Effect ${i}: ${e}`));
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a racial trait
     *
     * Checks all required fields, enum values, and data constraints.
     *
     * @param trait - The racial trait to validate
     * @returns Validation result with errors if any
     */
    static validateRacialTrait(trait: unknown): ValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!trait || typeof trait !== 'object' || Array.isArray(trait)) {
            return {
                valid: false,
                errors: ['Racial trait must be an object']
            };
        }

        const t = trait as Record<string, unknown>;

        // Validate required fields: id, name, description, race, source
        if (!t.id || typeof t.id !== 'string') {
            errors.push('Trait must have a valid id (string)');
        } else if (!this.isValidFeatureId(t.id)) {
            errors.push(`Trait id must use lowercase_with_underscores format: "${t.id}"`);
        }

        if (!t.name || typeof t.name !== 'string') {
            errors.push('Trait must have a valid name (string)');
        }

        if (!t.description || typeof t.description !== 'string') {
            errors.push('Trait must have a description (string)');
        }

        if (!t.race || typeof t.race !== 'string') {
            errors.push('Trait must have a race (string)');
        } else if (!VALID_RACES.includes(t.race)) {
            errors.push(`Invalid race: "${t.race}". Must be one of: ${VALID_RACES.join(', ')}`);
        }

        if (!t.source || typeof t.source !== 'string') {
            errors.push('Trait must have a source (string)');
        } else if (!VALID_FEATURE_SOURCES.includes(t.source)) {
            errors.push(`Invalid source: "${t.source}". Must be one of: ${VALID_FEATURE_SOURCES.join(', ')}`);
        }

        // Validate optional fields
        if (t.tags !== undefined) {
            if (!Array.isArray(t.tags)) {
                errors.push('Trait tags must be an array');
            } else {
                for (const tag of t.tags) {
                    if (typeof tag !== 'string') {
                        errors.push(`Trait tag must be a string (got: ${typeof tag})`);
                    }
                }
            }
        }

        if (t.lore !== undefined && typeof t.lore !== 'string') {
            errors.push('Trait lore must be a string');
        }

        if (t.subrace !== undefined && typeof t.subrace !== 'string') {
            errors.push('Trait subrace must be a string');
        }

        // Validate prerequisites if present
        if (t.prerequisites !== undefined) {
            const prereqResult = this.validatePrerequisites(t.prerequisites as FeaturePrerequisite);
            if (!prereqResult.valid) {
                errors.push(...prereqResult.errors.map(e => `Prerequisites: ${e}`));
            }
        }

        // Validate effects if present
        if (t.effects !== undefined) {
            if (!Array.isArray(t.effects)) {
                errors.push('Trait effects must be an array');
            } else {
                for (let i = 0; i < t.effects.length; i++) {
                    const effectResult = this.validateEffect(t.effects[i]);
                    if (!effectResult.valid) {
                        errors.push(...effectResult.errors.map(e => `Effect ${i}: ${e}`));
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate a feature effect
     *
     * @param effect - The effect to validate
     * @returns Validation result with errors if any
     */
    static validateEffect(effect: unknown): ValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!effect || typeof effect !== 'object' || Array.isArray(effect)) {
            return {
                valid: false,
                errors: ['Effect must be an object']
            };
        }

        const e = effect as Record<string, unknown>;

        // Validate required fields
        if (!e.type || typeof e.type !== 'string') {
            errors.push('Effect must have a type (string)');
        } else if (!VALID_EFFECT_TYPES.includes(e.type)) {
            errors.push(`Invalid effect type: "${e.type}". Must be one of: ${VALID_EFFECT_TYPES.join(', ')}`);
        }

        if (!e.target || typeof e.target !== 'string') {
            errors.push('Effect must have a target (string)');
        } else {
            // Validate target based on effect type
            const effectType = e.type;
            const target = e.target;

            if (effectType === 'stat_bonus' && this.isAbility(target)) {
                // Valid ability target for stat_bonus
            } else if (effectType === 'skill_proficiency' && !VALID_SKILLS.includes(target)) {
                errors.push(`Invalid skill target: "${target}". Must be one of: ${VALID_SKILLS.join(', ')}`);
            } else if (effectType === 'skill_proficiency') {
                const value = e.value;
                if (typeof value === 'string' && !VALID_PROFICIENCY_LEVELS.includes(value)) {
                    errors.push(`Invalid proficiency level: "${value}". Must be one of: ${VALID_PROFICIENCY_LEVELS.join(', ')}`);
                }
            }
        }

        if (e.value === undefined) {
            errors.push('Effect must have a value');
        }

        // Validate optional condition field
        if (e.condition !== undefined && typeof e.condition !== 'string') {
            errors.push('Effect condition must be a string');
        }

        // Validate optional description field
        if (e.description !== undefined && typeof e.description !== 'string') {
            errors.push('Effect description must be a string');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate feature prerequisites
     *
     * @param prerequisites - The prerequisites to validate
     * @returns Validation result with errors if any
     */
    static validatePrerequisites(prerequisites: unknown): ValidationResult {
        const errors: string[] = [];

        // Must be an object
        if (!prerequisites || typeof prerequisites !== 'object' || Array.isArray(prerequisites)) {
            return {
                valid: false,
                errors: ['Prerequisites must be an object']
            };
        }

        const p = prerequisites as Record<string, unknown>;

        // Validate level requirement
        if (p.level !== undefined) {
            if (typeof p.level !== 'number') {
                errors.push('Prerequisite level must be a number');
            } else if (p.level < 1 || p.level > 20) {
                errors.push(`Prerequisite level must be between 1 and 20 (got: ${p.level})`);
            }
        }

        // Validate abilities requirement
        if (p.abilities !== undefined) {
            if (typeof p.abilities !== 'object' || Array.isArray(p.abilities) || p.abilities === null) {
                errors.push('Prerequisite abilities must be a record');
            } else {
                for (const [ability, minScore] of Object.entries(p.abilities)) {
                    if (!VALID_ABILITIES.includes(ability)) {
                        errors.push(`Invalid ability in prerequisites: "${ability}". Must be one of: ${VALID_ABILITIES.join(', ')}`);
                    }
                    if (typeof minScore !== 'number' || minScore < 1 || minScore > 20) {
                        errors.push(`Ability score requirement for ${ability} must be a number between 1 and 20`);
                    }
                }
            }
        }

        // Validate class requirement
        if (p.class !== undefined) {
            if (typeof p.class !== 'string') {
                errors.push('Prerequisite class must be a string');
            } else if (!VALID_CLASSES.includes(p.class)) {
                errors.push(`Invalid prerequisite class: "${p.class}". Must be one of: ${VALID_CLASSES.join(', ')}`);
            }
        }

        // Validate race requirement
        if (p.race !== undefined) {
            if (typeof p.race !== 'string') {
                errors.push('Prerequisite race must be a string');
            } else if (!VALID_RACES.includes(p.race)) {
                errors.push(`Invalid prerequisite race: "${p.race}". Must be one of: ${VALID_RACES.join(', ')}`);
            }
        }

        // Validate features requirement
        if (p.features !== undefined) {
            if (!Array.isArray(p.features)) {
                errors.push('Prerequisite features must be an array');
            } else {
                for (const featureId of p.features) {
                    if (typeof featureId !== 'string') {
                        errors.push('Prerequisite feature IDs must be strings');
                    } else if (!this.isValidFeatureId(featureId)) {
                        errors.push(`Invalid prerequisite feature ID format: "${featureId}"`);
                    }
                }
            }
        }

        // Validate custom condition
        if (p.custom !== undefined && typeof p.custom !== 'string') {
            errors.push('Prerequisite custom condition must be a string');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an array of class features
     *
     * @param features - Array of class features to validate
     * @returns Validation result with combined errors
     */
    static validateClassFeatures(features: unknown[]): ValidationResult {
        const errors: string[] = [];

        if (!Array.isArray(features)) {
            return {
                valid: false,
                errors: ['Input must be an array of class features']
            };
        }

        features.forEach((feature, index) => {
            const result = this.validateClassFeature(feature);
            if (!result.valid) {
                errors.push(`Feature at index ${index}: ${result.errors.join('; ')}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate an array of racial traits
     *
     * @param traits - Array of racial traits to validate
     * @returns Validation result with combined errors
     */
    static validateRacialTraits(traits: unknown[]): ValidationResult {
        const errors: string[] = [];

        if (!Array.isArray(traits)) {
            return {
                valid: false,
                errors: ['Input must be an array of racial traits']
            };
        }

        traits.forEach((trait, index) => {
            const result = this.validateRacialTrait(trait);
            if (!result.valid) {
                errors.push(`Trait at index ${index}: ${result.errors.join('; ')}`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if a string is a valid ability score
     *
     * @param ability - The ability string to check
     * @returns True if it's a valid ability
     */
    private static isAbility(ability: string): ability is Ability {
        return VALID_ABILITIES.includes(ability);
    }

    /**
     * Check if a feature ID follows the correct naming convention
     *
     * Feature IDs should use lowercase_with_underscores format.
     * Examples: 'barbarian_rage', 'elf_darkvision', 'fighter_action_surge'
     *
     * @param id - The feature ID to check
     * @returns True if the ID format is valid
     */
    private static isValidFeatureId(id: string): boolean {
        // Must be lowercase, alphanumeric, with underscores allowed
        // Must start with a letter
        // Examples: 'rage', 'barbarian_rage', 'elf_darkvision'
        return /^[a-z][a-z0-9_]*$/.test(id);
    }
}

/**
 * Helper function to validate a single class feature
 *
 * Convenience function for quick validation.
 *
 * @param feature - The class feature to validate
 * @returns Validation result with errors if any
 */
export function validateClassFeature(feature: unknown): ValidationResult {
    return FeatureValidator.validateClassFeature(feature);
}

/**
 * Helper function to validate a single racial trait
 *
 * Convenience function for quick validation.
 *
 * @param trait - The racial trait to validate
 * @returns Validation result with errors if any
 */
export function validateRacialTrait(trait: unknown): ValidationResult {
    return FeatureValidator.validateRacialTrait(trait);
}

/**
 * Helper function to validate an array of class features
 *
 * Convenience function for batch validation.
 *
 * @param features - Array of class features to validate
 * @returns Validation result with combined errors
 */
export function validateClassFeatures(features: unknown[]): ValidationResult {
    return FeatureValidator.validateClassFeatures(features);
}

/**
 * Helper function to validate an array of racial traits
 *
 * Convenience function for batch validation.
 *
 * @param traits - Array of racial traits to validate
 * @returns Validation result with combined errors
 */
export function validateRacialTraits(traits: unknown[]): ValidationResult {
    return FeatureValidator.validateRacialTraits(traits);
}
