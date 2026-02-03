/**
 * Prerequisite Validator Utility
 *
 * Generalized prerequisite validation for skills, spells, and features.
 * Eliminates duplicate prerequisite validation logic across:
 * - SkillValidator.validateSkillPrerequisites()
 * - SpellValidator.validateSpellPrerequisites()
 * - FeatureValidator.validatePrerequisites()
 *
 * Supports all prerequisite options from across the three systems:
 * - level: Minimum character level
 * - casterLevel: Minimum spellcaster level (spells only)
 * - abilities: Minimum ability scores
 * - class: Specific class required
 * - race: Specific race required
 * - subrace: Specific subrace required (features only)
 * - skills: Skills that must be proficient first
 * - features: Features that must be learned first
 * - spells: Spells that must be known first
 * - custom: Custom condition (note only - caller must validate)
 */

import type { Ability, CharacterSheet } from '../types/Character.js';
import { isValidAbility } from './AbilityConstants.js';

/**
 * Prerequisite Schema
 *
 * Union of all prerequisite fields from SkillPrerequisite, SpellPrerequisite,
 * and FeaturePrerequisite. This allows a single validator to handle all cases.
 *
 * Fields with comments indicating their scope are only used by specific systems:
 * - casterLevel: spells only
 * - subrace: features only
 */
export interface PrerequisiteSchema {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (spells only) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<Ability, number>>;

    /** Specific class required */
    class?: string;

    /** Specific race required */
    race?: string;

    /** Specific subrace required (features only) */
    subrace?: string;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition (note only - caller must validate) */
    custom?: string;
}

/**
 * Validation result for prerequisite checking
 *
 * Provides detailed feedback about which prerequisites are not met.
 */
export interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of unmet prerequisite descriptions */
    errors: string[];
}

/**
 * Validate a prerequisite object's schema
 *
 * Checks that the prerequisite object has valid structure and values.
 * This is useful for validating prerequisite schemas during registration.
 *
 * @param prerequisites - The prerequisites to validate
 * @returns Validation result with errors if any
 */
export function validatePrerequisiteSchema(prerequisites: unknown): ValidationResult {
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
                if (!isValidAbility(ability)) {
                    errors.push(`Invalid ability in prerequisites: "${ability}". Must be one of: STR, DEX, CON, INT, WIS, CHA`);
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

    // Validate subrace (must be non-empty string)
    if (p.subrace !== undefined) {
        if (typeof p.subrace !== 'string') {
            errors.push('Prerequisite subrace must be a string');
        } else if (p.subrace.trim() === '') {
            errors.push('Prerequisite subrace cannot be empty');
        }
    }

    // Validate features (must be array of strings)
    if (p.features !== undefined) {
        if (!Array.isArray(p.features)) {
            errors.push('Prerequisite features must be an array');
        } else {
            for (const featureId of p.features) {
                if (typeof featureId !== 'string') {
                    errors.push('Prerequisite feature IDs must be strings');
                }
            }
        }
    }

    // Validate skills (must be array of strings)
    if (p.skills !== undefined) {
        if (!Array.isArray(p.skills)) {
            errors.push('Prerequisite skills must be an array');
        } else {
            for (const skillId of p.skills) {
                if (typeof skillId !== 'string') {
                    errors.push('Prerequisite skill IDs must be strings');
                }
            }
        }
    }

    // Validate spells (must be array of strings)
    if (p.spells !== undefined) {
        if (!Array.isArray(p.spells)) {
            errors.push('Prerequisite spells must be an array');
        } else {
            for (const spellName of p.spells) {
                if (typeof spellName !== 'string') {
                    errors.push('Prerequisite spell names must be strings');
                } else if (spellName.trim() === '') {
                    errors.push('Prerequisite spell name cannot be empty');
                }
            }
        }
    }

    // Validate custom (must be string)
    if (p.custom !== undefined && typeof p.custom !== 'string') {
        errors.push('Prerequisite custom condition must be a string');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate prerequisites against a character sheet
 *
 * Checks if a character meets all prerequisite requirements.
 * This is the main function used to determine if a character can learn
 * a skill, spell, or feature.
 *
 * @param prerequisites - The prerequisites to validate
 * @param character - The character sheet to validate against
 * @returns Validation result with unmet prerequisites if any
 */
export function validatePrerequisites(
    prerequisites: PrerequisiteSchema | undefined,
    character: CharacterSheet
): ValidationResult {
    const unmet: string[] = [];

    // If no prerequisites, the item is available
    if (!prerequisites) {
        return { valid: true, errors: [] };
    }

    // Check level requirement
    if (prerequisites.level !== undefined && character.level < prerequisites.level) {
        unmet.push(`Requires level ${prerequisites.level} (current: ${character.level})`);
    }

    // Check caster level requirement (spells only)
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

    // Check subrace requirement (features only)
    if (prerequisites.subrace !== undefined) {
        const charSubrace = character.subrace || '';
        if (charSubrace !== prerequisites.subrace) {
            unmet.push(`Requires ${prerequisites.subrace} subrace (current: ${charSubrace || 'none'})`);
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
