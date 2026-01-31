/**
 * Spells Module
 *
 * Provides spell validation, registry, and prerequisite checking functionality.
 *
 * Part of Phase 4: Spell Prerequisites System.
 * Part of Phase 12.3: Create SpellRegistry for consistency with SkillRegistry and FeatureRegistry.
 */

export { SpellValidator, validateSpell, validateSpells, validateSpellPrerequisitesSchema, validateSpellPrerequisites } from './SpellValidator.js';
export { SpellRegistry, getSpellRegistry } from './SpellRegistry.js';

// Re-export types from utils/constants.ts for convenience
export type { SpellPrerequisite, Spell } from '../../utils/constants.js';
export type { RegisteredSpell, SpellSchool, ValidationResult } from './SpellRegistry.js';
