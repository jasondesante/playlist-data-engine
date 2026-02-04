/**
 * Skills Module Index
 *
 * Exports all skill-related types and utilities.
 */

// Type definitions
export type {
    CustomSkill,
    SkillPrerequisite,
    SkillProficiency,
    SkillSelectionWeights,
    SkillListDefinition,
    SkillRegistryStats,
} from './SkillTypes.js';

// Validation result type - exported from SkillValidator for consistency with other registries
export type { SkillValidationResult } from './SkillValidator.js';

// SkillRegistry - Main registry for skills
export { SkillRegistry, getSkillRegistry } from './SkillRegistry.js';

// Default skills
export { DEFAULT_SKILLS, DEFAULT_SKILL_CATEGORIES } from './DefaultSkills.js';

// SkillValidator - Validation for skills
export {
    SkillValidator,
    validateSkill,
    validateSkills,
    validateSkillProficiency,
    validateSkillProficiencies,
    validateSkillListDefinition,
    validateSkillPrerequisites
} from './SkillValidator.js';
