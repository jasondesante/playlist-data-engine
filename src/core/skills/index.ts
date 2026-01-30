/**
 * Skills Module Index
 *
 * Exports all skill-related types and utilities.
 * Part of Phase 12: Custom Skills System.
 */

// Type definitions
export type {
    CustomSkill,
    SkillPrerequisite,
    SkillProficiency,
    SkillSelectionWeights,
    SkillListDefinition,
    SkillValidationResult,
    SkillRegistryStats,
} from './SkillTypes.js';

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
