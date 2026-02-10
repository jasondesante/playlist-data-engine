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
    SkillQueryStats,
} from './SkillTypes.js';

// Validation result type - exported from SkillValidator for consistency with other query classes
export type { SkillValidationResult } from './SkillValidator.js';

// SkillQuery - Main query interface for skills
export { SkillQuery, getSkillQuery } from './SkillQuery.js';

// Default skills
export { DEFAULT_SKILLS, DEFAULT_SKILL_CATEGORIES } from '../../constants/DefaultSkills.js';

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
