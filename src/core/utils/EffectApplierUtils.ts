/**
 * Effect Applier Utilities
 *
 * Shared utility functions for applying effects to characters.
 * Used by both FeatureEffectApplier and EquipmentEffectApplier to eliminate
 * code duplication and ensure consistent behavior across the codebase.
 *
 * Part of code consolidation effort for duplicate effect application methods.
 */

import type { CharacterSheet, Ability, ProficiencyLevel } from '../types/Character.js';

/**
 * Check if a string is a valid ability score
 *
 * @param ability - The ability string to check
 * @returns True if it's a valid ability
 *
 * @example
 * isAbility('STR') // true
 * isAbility('strength') // false
 * isAbility('INVALID') // false
 */
export function isAbility(ability: string): ability is Ability {
    return ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].includes(ability);
}

/**
 * Apply an ability score bonus to a character
 *
 * Handles ability score increases and automatically recalculates the
 * corresponding ability modifier. This is the standard way to modify
 * ability scores throughout the codebase.
 *
 * @param character - The character to modify
 * @param ability - The ability score to modify (must be valid Ability)
 * @param value - The amount to add (can be negative for removal)
 *
 * @example
 * // Apply +2 STR from a feature
 * applyAbilityScoreBonus(character, 'STR', 2);
 *
 * // Remove +1 DEX when unequipping an item
 * applyAbilityScoreBonus(character, 'DEX', -1);
 */
export function applyAbilityScoreBonus(
    character: CharacterSheet,
    ability: Ability,
    value: number
): void {
    character.ability_scores[ability] += value;
    // Recalculate modifier for the affected ability
    const newScore = character.ability_scores[ability];
    character.ability_modifiers[ability] = Math.floor((newScore - 10) / 2);
}

/**
 * Apply a skill proficiency with proper hierarchy handling
 *
 * Implements a proficiency hierarchy that prevents downgrading:
 * none < proficient < expertise
 *
 * - If character has no proficiency or 'none', apply the new proficiency
 * - If character is 'proficient' and new is 'expertise', upgrade to expertise
 * - If character is 'expertise', keep expertise (never downgrade)
 * - If both are 'proficient', no change needed
 *
 * This is the more robust version from EquipmentEffectApplier,
 * preferred over FeatureEffectApplier's simpler logic.
 *
 * @param character - The character to modify
 * @param skillId - The skill ID (lowercase, e.g., 'athletics', 'arcana')
 * @param proficiency - The proficiency level to apply
 *
 * @example
 * // Grant proficiency in Perception
 * applySkillProficiencyWithHierarchy(character, 'perception', 'proficient');
 *
 * // Upgrade to expertise (from none or proficient)
 * applySkillProficiencyWithHierarchy(character, 'stealth', 'expertise');
 */
export function applySkillProficiencyWithHierarchy(
    character: CharacterSheet,
    skillId: string,
    proficiency: ProficiencyLevel
): void {
    // Get current proficiency level
    const currentLevel = character.skills[skillId];

    // Always apply if no current level or current is 'none'
    if (!currentLevel || currentLevel === 'none') {
        character.skills[skillId] = proficiency;
        return;
    }

    // Apply expertise regardless of current level (upgrade from none/proficient)
    if (proficiency === 'expertise') {
        character.skills[skillId] = proficiency;
    }
    // Note: If current is 'proficient' and new is 'proficient', no change needed
    // If current is 'expertise' and new is 'proficient', keep expertise (higher level)
}
