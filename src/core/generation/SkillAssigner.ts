/**
 * SkillAssigner - Assigns D&D 5e skill proficiencies based on character class
 *
 * Part of Phase 12.4: Update SkillAssigner to use SkillRegistry and support custom skills.
 * Part of Phase 3.2: Update SkillAssigner for prerequisite filtering.
 */

import type { Class, ProficiencyLevel, CharacterSheet } from '../types/Character.js';
import type { SeededRNG } from '../../utils/random.js';
import { CLASS_DATA } from '../../utils/constants.js';
import { SkillRegistry } from '../skills/SkillRegistry.js';
import { SkillValidator } from '../skills/SkillValidator.js';

/**
 * Initialize skill registry if not already initialized
 * This ensures the SkillRegistry has default skills loaded before use.
 */
function ensureSkillRegistryInitialized(): void {
    const registry = SkillRegistry.getInstance();
    if (!registry.isInitialized()) {
        registry.initializeDefaults();
    }
}

export class SkillAssigner {
    /**
     * Assign skill proficiencies based on character class
     *
     * Now uses SkillRegistry to support custom skills and validates all skill IDs.
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
        // Ensure SkillRegistry is initialized
        ensureSkillRegistryInitialized();

        const registry = SkillRegistry.getInstance();
        const allSkills = registry.getAllSkills();

        // Initialize all skills to 'none'
        const skills: Record<string, ProficiencyLevel> = {};
        for (const skill of allSkills) {
            skills[skill.id] = 'none';
        }

        // Get class data
        const classData = CLASS_DATA[characterClass];

        // Validate all available skills against registry
        const validAvailableSkills = this.validateSkills(classData.available_skills, registry);

        // Filter skills by prerequisites if character provided
        const availableSkills = character
            ? this.filterSkillsByPrerequisites(validAvailableSkills, registry, character)
            : validAvailableSkills;

        // Select skills (currently uses equal weights)
        // Future: Add spawn rate weights via ExtensionManager
        const selectedSkills = this.selectSkills(
            availableSkills,
            classData.skill_count,
            rng
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
     * Validate skills against the SkillRegistry
     *
     * Filters out any skill IDs that are not registered in the SkillRegistry.
     * This prevents invalid skill IDs from being assigned.
     *
     * @param skillIds - Array of skill IDs to validate
     * @param registry - SkillRegistry instance
     * @returns Array of valid skill IDs
     */
    private static validateSkills(skillIds: string[], registry: SkillRegistry): string[] {
        const validSkills: string[] = [];

        for (const skillId of skillIds) {
            if (registry.isValidSkill(skillId)) {
                validSkills.push(skillId);
            } else {
                console.warn(`SkillAssigner: Invalid skill ID "${skillId}" not found in SkillRegistry. Skipping.`);
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
     * @param registry - SkillRegistry instance
     * @param character - Character sheet to validate prerequisites against
     * @returns Array of skill IDs whose prerequisites are met
     */
    private static filterSkillsByPrerequisites(
        skillIds: string[],
        registry: SkillRegistry,
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
     * Future enhancement: Add spawn rate weights via ExtensionManager.
     *
     * @param availableSkills - Array of skill IDs to choose from
     * @param count - Number of skills to select
     * @param rng - Seeded random number generator
     * @returns Array of selected skill IDs
     */
    private static selectSkills(
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
