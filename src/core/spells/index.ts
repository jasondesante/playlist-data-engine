/**
 * Spells Module
 *
 * Provides spell validation, query, and prerequisite checking functionality.
 */

export { SpellValidator, validateSpell, validateSpells, validateSpellPrerequisitesSchema, validateSpellPrerequisites } from './SpellValidator.js';
export { SpellQuery, getSpellQuery } from './SpellQuery.js';

// Export spell types from SpellTypes.ts
export type { SpellPrerequisite, Spell } from './SpellTypes.js';
export type { RegisteredSpell, SpellSchool } from './SpellQuery.js';
export type { SpellValidationResult } from './SpellValidator.js';
