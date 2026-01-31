/**
 * Spells Module
 *
 * Provides spell validation, registry, and prerequisite checking functionality.
 *
 * Part of Phase 4: Spell Prerequisites System.
 * Part of Phase 12.3: Create SpellRegistry for consistency with SkillRegistry and FeatureRegistry.
 * Part of Phase 6: Discrepancies Resolution - Task 6.3 (moved types to SpellTypes.ts)
 */

export { SpellValidator, validateSpell, validateSpells, validateSpellPrerequisitesSchema, validateSpellPrerequisites } from './SpellValidator.js';
export { SpellRegistry, getSpellRegistry } from './SpellRegistry.js';

// Export spell types from SpellTypes.ts
export type { SpellPrerequisite, Spell } from './SpellTypes.js';
export type { RegisteredSpell, SpellSchool, ValidationResult } from './SpellRegistry.js';
