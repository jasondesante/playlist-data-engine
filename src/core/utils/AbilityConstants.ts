/**
 * Shared Ability Constants
 *
 * Central location for ability-related constants and utility functions.
 * Eliminates duplicate code across SkillValidator, SpellValidator, and FeatureValidator.
 */

import type { Ability } from '../types/Character.js';

/**
 * Valid D&D 5e abilities
 *
 * This constant is shared across:
 * - SkillValidator (src/core/skills/SkillValidator.ts)
 * - SpellValidator (src/core/spells/SpellValidator.ts)
 * - FeatureValidator (src/core/features/FeatureValidator.ts)
 */
export const VALID_ABILITIES: ReadonlyArray<string> = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

/**
 * Check if a string is a valid ability score
 *
 * This utility function is shared across validators to provide
 * consistent ability validation throughout the codebase.
 *
 * @param ability - The ability string to check
 * @returns True if it's a valid ability score
 */
export function isValidAbility(ability: string): ability is Ability {
    return VALID_ABILITIES.includes(ability);
}

/**
 * Alias for isValidAbility - both names are equivalent and supported
 */
export { isValidAbility as isAbility };
