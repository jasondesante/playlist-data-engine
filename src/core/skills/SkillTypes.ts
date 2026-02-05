/**
 * Skill Types
 *
 * Type definitions for the extensible skill system.
 * Supports default D&D 5e skills plus custom skills with metadata.
 */

import type { Ability, Class, Race } from '../types/Character.js';

/**
 * Prerequisites for learning or using a skill
 *
 * Follows the same pattern as FeaturePrerequisite for consistency.
 * Skills can require:
 * - A minimum character level
 * - Other skills to be proficient first
 * - Features to be learned first
 * - Spells to be known first
 * - Minimum ability scores
 * - Specific class or race
 * - Custom conditions
 */
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description */
    custom?: string;
}

/**
 * Custom Skill Interface
 *
 * Defines a skill that can be used by characters. Includes all 18 default D&D 5e skills
 * plus any custom skills added by users or expansion packs.
 */
export interface CustomSkill {
    /**
     * Unique identifier for the skill (e.g., 'athletics', 'survival_cold')
     * - Must be lowercase_with_underscores format
     * - Must be unique across all skills (default + custom)
     */
    id: string;

    /**
     * Display name for the skill (e.g., 'Athletics', 'Survival (Cold Environments)')
     */
    name: string;

    /**
     * Optional description of what the skill covers
     */
    description?: string;

    /**
     * The ability score used for this skill (STR, DEX, CON, INT, WIS, CHA)
     */
    ability: Ability;

    /**
     * Whether this skill is affected by armor disadvantage
     * - true: Skills like Athletics, Acrobatics, Sleight of Hand, Stealth have armor penalty
     * - false: Most knowledge and social skills don't have armor penalty
     */
    armorPenalty?: boolean;

    /**
     * Optional custom properties for advanced skill mechanics
     * - Can contain any game-specific data
     * - Examples: { toolType: 'musical', requiresTraining: true, synergy: ['nature'] }
     */
    customProperties?: Record<string, string | number | boolean | string[]>;

    /**
     * Optional categories for grouping and filtering skills
     * - Examples: 'exploration', 'social', 'knowledge', 'combat', 'environmental'
     * - Used for background skill preferences and skill list filtering
     */
    categories?: string[];

    /**
     * Where this skill comes from
     * - 'default': One of the 18 core D&D 5e skills
     * - 'custom': Added by user or expansion pack
     */
    source: 'default' | 'custom';

    /**
     * Optional tags for additional categorization
     * - Examples: ['secret', 'advanced', 'requires_tool']
     * - Can be used for filtering or prerequisites
     */
    tags?: string[];

    /**
     * Optional flavor text or lore about the skill
     */
    lore?: string;

    /**
     * Prerequisites for learning this skill
     *
     * If specified, the skill can only be gained by characters who meet
     * all the prerequisite requirements. This allows for:
     * - Advanced skills that require base skills
     * - Class-specific or race-specific skills
     * - Skills that require certain features (e.g., Draconic Bloodline)
     * - Skills that require certain spells (e.g., must know fireball)
     */
    prerequisites?: SkillPrerequisite;
}

/**
 * Skill Proficiency Interface
 *
 * Represents a character's proficiency level in a specific skill.
 * Used for tracking proficiencies from various sources.
 */
export interface SkillProficiency {
    /**
     * The skill ID (references CustomSkill.id)
     */
    skillId: string;

    /**
     * Proficiency level
     * - 'none': No proficiency (ability modifier only)
     * - 'proficient': Proficiency bonus added
     * - 'expertise': Double proficiency bonus
     */
    level: 'none' | 'proficient' | 'expertise';

    /**
     * Where this proficiency came from
     * - 'class': Gained from class at level 1
     * - 'background': Gained from background
     * - 'feat': Gained from a feat
     * - 'custom': Gained from custom feature or homebrew
     * - 'racial': Gained from racial trait
     * - 'other': Any other source
     */
    source: 'class' | 'background' | 'feat' | 'custom' | 'racial' | 'other';

    /**
     * Optional feature ID that granted this proficiency
     * - Links back to the feature in FeatureQuery
     * - Example: 'rogue_expertise', 'bard_jack_of_all_trades'
     */
    grantedBy?: string;
}

/**
 * Skill Selection Weights
 *
 * Used for controlling spawn rates when selecting skills for a character.
 * Allows custom skills to be more or less likely to be selected.
 */
export interface SkillSelectionWeights {
    /**
     * Map of skill IDs to their selection weights
     * - Higher weight = more likely to be selected
     * - Weight of 0 = never selected
     * - Unspecified skills use default weight of 1.0
     */
    weights: Record<string, number>;

    /**
     * Selection mode for applying weights
     * - 'relative': Custom weights added to pool, normalized (default)
     * - 'absolute': Custom weights replace distribution entirely
     * - 'default': Equal weights for all skills (ignore weights)
     */
    mode?: 'relative' | 'absolute' | 'default';
}

/**
 * Skill List Definition
 *
 * Defines available skills and selection parameters for a class.
 */
export interface SkillListDefinition {
    /**
     * The class this skill list belongs to
     */
    class: string;

    /**
     * Number of skills to select from the list
     */
    skillCount: number;

    /**
     * Array of skill IDs available for this class
     * - Can include default skills or custom skills
     */
    availableSkills: string[];

    /**
     * Optional weights for skill selection
     * - Controls which skills are more likely to be selected
     */
    selectionWeights?: SkillSelectionWeights;

    /**
     * Whether this class grants expertise
     * - Classes like Bard and Rogue grant expertise at level 1
     */
    hasExpertise?: boolean;

    /**
     * Number of expertise selections if hasExpertise is true
     */
    expertiseCount?: number;
}

/**
 * Validation Result
 *
 * Standard result type for skill validation operations.
 */
export interface SkillValidationResult {
    /** Whether the skill is valid */
    valid: boolean;
    /** Array of error messages (empty if valid) */
    errors: string[];
}

/**
 * Skill Query Statistics
 *
 * Statistical information about registered skills.
 */
export interface SkillQueryStats {
    /** Total number of registered skills */
    totalSkills: number;
    /** Number of default skills */
    defaultSkills: number;
    /** Number of custom skills */
    customSkills: number;
    /** Skills per ability */
    skillsByAbility: Record<Ability, number>;
    /** All categories in use */
    categories: string[];
}
