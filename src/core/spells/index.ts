/**
 * Spells Module
 *
 * Provides spell validation and prerequisite checking functionality.
 *
 * Part of Phase 4: Spell Prerequisites System.
 */

export { SpellValidator, validateSpell, validateSpells, validateSpellPrerequisitesSchema, validateSpellPrerequisites } from './SpellValidator.js';

// Re-export types from utils/constants.ts for convenience
export type { SpellPrerequisite, Spell } from '../../utils/constants.js';
