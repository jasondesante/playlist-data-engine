/**
 * SkillAssigner - Assigns D&D 5e skill proficiencies based on character class
 */

import type { Class, ProficiencyLevel, CharacterSheet } from '../types/Character.js';
import type { SeededRNG } from '../../utils/random.js';
import { getClassData } from '../../utils/constants.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { SkillQuery } from '../skills/SkillQuery.js';
import type { SkillSelectionWeights, SkillListDefinition } from '../skills/SkillTypes.js';
import { SkillValidator } from '../skills/SkillValidator.js';

/**
 * Initialize skill query interface if not already initialized
 * This ensures the SkillQuery has default skills loaded before use.
 *
 * Note: Since SkillQuery now reads from ExtensionManager, we initialize
 * ExtensionManager instead. The defaults should already be loaded during
 * package initialization, so this is a safeguard.
 */
function ensureSkillQueryInitialized(): void {
    // The ExtensionManager should be initialized during package initialization
    // via initializeSkillDefaults() in initializeDefaults.ts
    // SkillQuery reads from ExtensionManager, so no action needed here
}

export class SkillAssigner {
    /**
     * Get skill list definition for a class from ExtensionManager
     *
     * Checks the 'skillLists' category for a matching class entry.
     * Returns undefined if no custom skill list is registered.
     *
     * @param characterClass - The class to get skill list data for
     * @returns SkillListDefinition or undefined
     */
    private static getSkillListDefinition(characterClass: Class): SkillListDefinition | undefined {
        try {
            const manager = ExtensionManager.getInstance();
            const skillLists = manager.get('skillLists' as const) as SkillListDefinition[];

            if (!Array.isArray(skillLists)) {
                return undefined;
            }

            return skillLists.find(list => list.class === characterClass);
        } catch {
            return undefined;
        }
    }

    /**
     * Assign skill proficiencies based on character class
     *
     * Now uses SkillQuery to support custom skills and validates all skill IDs.
     * Supports weighted skill selection via ExtensionManager integration.
     * Filters skills by prerequisites when a character is provided.
     *
     * @param characterClass - The character's class
     * @param rng - Seeded random number generator for deterministic selection
     * @param character - Optional character sheet for prerequisite validation
     * @returns Record of all skills with their proficiency levels (supports custom skills)
     */
    static assignSkills(
        characterClass: Class,
        rng: SeededRNG,
        character?: CharacterSheet
    ): Record<string, ProficiencyLevel> {
        // Ensure SkillQuery is initialized
        ensureSkillQueryInitialized();

        const registry = SkillQuery.getInstance();
        const allSkills = registry.getAllSkills();

        // Initialize all skills to 'none'
        const skills: Record<string, ProficiencyLevel> = {};
        for (const skill of allSkills) {
            skills[skill.id] = 'none';
        }

        // Get class data (supports default and custom classes via ExtensionManager)
        const classData = getClassData(characterClass);

        if (!classData) {
            console.warn(`SkillAssigner: Unknown class "${characterClass}", using default skill assignment`);
            // Return all skills with 'none' proficiency if class data not found
            return skills;
        }

        // Validate all available skills against registry
        const validAvailableSkills = this.validateSkills(classData.available_skills, registry);

        // Filter skills by prerequisites if character provided
        const availableSkills = character
            ? this.filterSkillsByPrerequisites(validAvailableSkills, registry, character)
            : validAvailableSkills;

        // Get skill list definition with selection weights (if registered)
        const skillListDef = this.getSkillListDefinition(characterClass);

        // Select skills using weights if provided, otherwise equal weights
        const selectedSkills = this.selectSkills(
            availableSkills,
            classData.skill_count,
            rng,
            skillListDef?.selectionWeights
        );

        // Assign proficiency to selected skills
        for (const skill of selectedSkills) {
            skills[skill] = 'proficient';
        }

        // Handle expertise for Bard and Rogue
        if (classData.has_expertise && classData.expertise_count) {
            const expertiseSkills = this.selectSkills(
                selectedSkills,
                classData.expertise_count!,
                rng
            );

            for (const skill of expertiseSkills) {
                skills[skill] = 'expertise';
            }
        }

        return skills;
    }

    /**
     * Validate skills against the SkillQuery
     *
     * Filters out any skill IDs that are not registered in the SkillQuery.
     * This prevents invalid skill IDs from being assigned.
     *
     * @param skillIds - Array of skill IDs to validate
     * @param registry - SkillQuery instance
     * @returns Array of valid skill IDs
     */
    private static validateSkills(skillIds: string[], registry: SkillQuery): string[] {
        const validSkills: string[] = [];

        for (const skillId of skillIds) {
            if (registry.isValidSkill(skillId)) {
                validSkills.push(skillId);
            } else {
                console.warn(`SkillAssigner: Invalid skill ID "${skillId}" not found in SkillQuery. Skipping.`);
            }
        }

        return validSkills;
    }

    /**
     * Filter skills by prerequisites
     *
     * Removes skills that have unmet prerequisites for the given character.
     * Skills without prerequisites are always included.
     *
     * @param skillIds - Array of skill IDs to filter
     * @param registry - SkillQuery instance
     * @param character - Character sheet to validate prerequisites against
     * @returns Array of skill IDs whose prerequisites are met
     */
    private static filterSkillsByPrerequisites(
        skillIds: string[],
        registry: SkillQuery,
        character: CharacterSheet
    ): string[] {
        const validSkills: string[] = [];

        for (const skillId of skillIds) {
            const skill = registry.getSkill(skillId);
            if (!skill) continue;

            // Skip skills with unmet prerequisites
            if (skill.prerequisites) {
                const result = SkillValidator.validateSkillPrerequisites(skill.prerequisites, character);
                if (!result.valid) {
                    // Skill has prerequisites that are not met - skip it
                    continue;
                }
            }

            validSkills.push(skillId);
        }

        return validSkills;
    }

    /**
     * Deterministically select N random skills from a list
     *
     * Uses Fisher-Yates shuffle with seeded RNG for deterministic selection.
     * Supports weighted selection via selectionWeights parameter.
     *
     * @param availableSkills - Array of skill IDs to choose from
     * @param count - Number of skills to select
     * @param rng - Seeded random number generator
     * @param selectionWeights - Optional weights for skill selection
     * @returns Array of selected skill IDs
     */
    private static selectSkills(
        availableSkills: string[],
        count: number,
        rng: SeededRNG,
        selectionWeights?: SkillSelectionWeights
    ): string[] {
        // If no weights provided, use equal-weight random selection
        if (!selectionWeights || selectionWeights.mode === 'default') {
            return this.selectSkillsEqualWeight(availableSkills, count, rng);
        }

        const { weights, mode } = selectionWeights;

        // Build weighted skill pool
        const weightedPool: string[] = [];

        for (const skill of availableSkills) {
            const skillWeight = weights[skill];

            // Skip skills with weight of 0
            if (skillWeight === 0) {
                continue;
            }

            if (mode === 'absolute') {
                // Absolute mode: only include skills with explicit weights
                if (skillWeight !== undefined) {
                    // Add skill multiple times based on weight (e.g., weight 2.0 = 2 entries)
                    const entries = Math.round(skillWeight * 10);
                    for (let i = 0; i < entries; i++) {
                        weightedPool.push(skill);
                    }
                }
            } else {
                // Relative mode (default): all skills included, weights modify probability
                const multiplier = skillWeight ?? 1.0;
                // Add skill multiple times based on weight multiplier
                const entries = Math.round(multiplier * 10);
                for (let i = 0; i < entries; i++) {
                    weightedPool.push(skill);
                }
            }
        }

        // If weighted pool is empty, fall back to equal weights
        if (weightedPool.length === 0) {
            return this.selectSkillsEqualWeight(availableSkills, count, rng);
        }

        // Shuffle and select from weighted pool
        for (let i = weightedPool.length - 1; i > 0; i--) {
            const j = Math.floor(rng.random() * (i + 1));
            [weightedPool[i], weightedPool[j]] = [weightedPool[j], weightedPool[i]];
        }

        // Take unique skills from weighted pool (up to count)
        const selected: string[] = [];
        const seen = new Set<string>();

        for (const skill of weightedPool) {
            if (!seen.has(skill)) {
                selected.push(skill);
                seen.add(skill);
                if (selected.length >= count) {
                    break;
                }
            }
        }

        return selected;
    }

    /**
     * Select N random skills using equal weights
     *
     * Uses Fisher-Yates shuffle with seeded RNG for deterministic selection.
     *
     * @param availableSkills - Array of skill IDs to choose from
     * @param count - Number of skills to select
     * @param rng - Seeded random number generator
     * @returns Array of selected skill IDs
     */
    private static selectSkillsEqualWeight(
        availableSkills: string[],
        count: number,
        rng: SeededRNG
    ): string[] {
        // Create a copy to avoid mutating the original
        const skillPool = [...availableSkills];

        // Fisher-Yates shuffle with seeded RNG, then take first N
        for (let i = skillPool.length - 1; i > 0; i--) {
            const j = Math.floor(rng.random() * (i + 1));
            [skillPool[i], skillPool[j]] = [skillPool[j], skillPool[i]];
        }

        // Take the first 'count' skills
        return skillPool.slice(0, count);
    }
}
