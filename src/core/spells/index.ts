/**
 * Spells Module
 *
 * Provides spell validation, registry, and prerequisite checking functionality.
 */

export { SpellValidator, validateSpell, validateSpells, validateSpellPrerequisitesSchema, validateSpellPrerequisites } from './SpellValidator.js';
export { SpellRegistry, getSpellRegistry } from './SpellRegistry.js';

// Export spell types from SpellTypes.ts
export type { SpellPrerequisite, Spell } from './SpellTypes.js';
export type { RegisteredSpell, SpellSchool, ValidationResult } from './SpellRegistry.js';
