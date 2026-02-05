/**
 * SkillQuery
 *
 * Central query interface for all skills (default D&D 5e and custom).
 * Provides skill lookup, validation, and categorization.
 *
 * **Design:** This is a query layer on top of ExtensionManager.
 * All skills are stored in ExtensionManager; SkillQuery provides:
 * - Query methods with caching for performance
 * - Skill-related helper methods and validation
 *
 * **Registration:** Use ExtensionManager.register('skills', [...]) to add custom skills.
 * Cache invalidation is automatic after registration.
 *
 * No duplicate storage - all data lives in ExtensionManager.
 */

import type {
    CustomSkill,
    SkillQueryStats,
    SkillValidationResult
} from './SkillTypes.js';
import type { Ability, CharacterSheet } from '../types/Character.js';
import { SkillValidator } from './SkillValidator.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';

/**
 * SkillQuery - Singleton class for querying skills
 *
 * This is a query layer on top of ExtensionManager.
 * All skills are stored in ExtensionManager; SkillQuery provides:
 * - Query methods with caching for performance
 * - Skill-related helper methods and validation
 *
 * **Registration:** Use ExtensionManager.register('skills', [...]) to add custom skills.
 * Cache invalidation is automatic after registration.
 *
 * Design principle: No duplicate storage. All data lives in ExtensionManager.
 */
export class SkillQuery {
    private static instance: SkillQuery;
    private manager: ExtensionManager;
    private allSkillsCache: CustomSkill[] | null = null;
    private abilityCache: Map<Ability, CustomSkill[]> | null = null;
    private categoryCache: Map<string, CustomSkill[]> | null = null;

    private constructor() {
        this.manager = ExtensionManager.getInstance();
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): SkillQuery {
        if (!SkillQuery.instance) {
            SkillQuery.instance = new SkillQuery();
        }
        return SkillQuery.instance;
    }

    /**
     * Invalidate all caches
     *
     * **Note:** Cache invalidation is automatic after ExtensionManager.register().
     * This method is primarily for internal use and advanced scenarios.
     *
     * Call this method after directly manipulating ExtensionManager's skill data
     * (e.g., after calling ExtensionManager.resetAll()).
     *
     * This ensures that SkillQuery's cached data is refreshed to reflect
     * the current state of ExtensionManager.
     */
    invalidateCache(): void {
        this.allSkillsCache = null;
        this.abilityCache = null;
        this.categoryCache = null;
    }

    /**
     * Get a skill by ID
     *
     * @param id - Skill ID to look up
     * @returns Skill or undefined if not found
     */
    getSkill(id: string): CustomSkill | undefined {
        const allSkills = this.getAllSkills();
        return allSkills.find(skill => skill.id === id);
    }

    /**
     * Get all registered skills
     *
     * Reads from ExtensionManager with caching.
     *
     * @returns Array of all skills
     */
    getAllSkills(): CustomSkill[] {
        if (!this.allSkillsCache) {
            const skills = this.manager.get('skills');
            this.allSkillsCache = skills as CustomSkill[];
        }
        return this.allSkillsCache;
    }

    /**
     * Get skills by ability score
     *
     * Builds index from ExtensionManager data with caching.
     *
     * @param ability - Ability score to filter by
     * @returns Array of skills that use this ability
     */
    getSkillsByAbility(ability: Ability): CustomSkill[] {
        if (!this.abilityCache) {
            this.abilityCache = new Map();
            const allSkills = this.getAllSkills();
            for (const skill of allSkills) {
                if (!this.abilityCache.has(skill.ability)) {
                    this.abilityCache.set(skill.ability, []);
                }
                this.abilityCache.get(skill.ability)!.push(skill);
            }
        }
        return this.abilityCache.get(ability) || [];
    }

    /**
     * Get skills by category
     *
     * Builds index from ExtensionManager data with caching.
     *
     * @param category - Category to filter by
     * @returns Array of skills in this category
     */
    getSkillsByCategory(category: string): CustomSkill[] {
        if (!this.categoryCache) {
            this.categoryCache = new Map();
            const allSkills = this.getAllSkills();
            for (const skill of allSkills) {
                if (skill.categories && skill.categories.length > 0) {
                    for (const skillCategory of skill.categories) {
                        if (!this.categoryCache.has(skillCategory)) {
                            this.categoryCache.set(skillCategory, []);
                        }
                        this.categoryCache.get(skillCategory)!.push(skill);
                    }
                }
            }
        }
        return this.categoryCache.get(category) || [];
    }

    /**
     * Get all categories in use
     *
     * @returns Array of category names
     */
    getCategories(): string[] {
        const allSkills = this.getAllSkills();
        const categories = new Set<string>();
        for (const skill of allSkills) {
            if (skill.categories) {
                for (const category of skill.categories) {
                    categories.add(category);
                }
            }
        }
        return Array.from(categories);
    }

    /**
     * Get skills by source
     *
     * @param source - 'default' or 'custom'
     * @returns Array of skills from this source
     */
    getSkillsBySource(source: 'default' | 'custom'): CustomSkill[] {
        return this.getAllSkills().filter(skill => skill.source === source);
    }

    /**
     * Validate if a skill ID exists
     *
     * @param id - Skill ID to validate
     * @returns True if skill exists
     */
    isValidSkill(id: string): boolean {
        return this.getSkill(id) !== undefined;
    }

    /**
     * Validate skill data structure
     *
     * Delegates to SkillValidator.
     *
     * @param skill - Skill object to validate
     * @returns Validation result with any errors
     */
    validateSkill(skill: CustomSkill): SkillValidationResult {
        return SkillValidator.validateSkill(skill);
    }

    /**
     * Validate skill prerequisites against a character
     *
     * Checks if a character meets all prerequisite requirements for a skill.
     * This is a convenience method that delegates to SkillValidator.
     *
     * @param skill - The skill whose prerequisites to validate
     * @param character - The character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    validatePrerequisites(
        skill: CustomSkill,
        character: CharacterSheet
    ): SkillValidationResult {
        return SkillValidator.validateSkillPrerequisites(skill.prerequisites, character);
    }

    /**
     * Get query statistics
     *
     * @returns Statistics about registered skills
     */
    getQueryStats(): SkillQueryStats {
        const allSkills = this.getAllSkills();
        const defaultSkills = allSkills.filter(s => s.source === 'default');
        const customSkills = allSkills.filter(s => s.source === 'custom');

        // Count skills per ability
        const skillsByAbility: Record<Ability, number> = {
            STR: 0,
            DEX: 0,
            CON: 0,
            INT: 0,
            WIS: 0,
            CHA: 0
        };

        for (const skill of allSkills) {
            skillsByAbility[skill.ability]++;
        }

        // Get all categories
        const categories = this.getCategories();

        return {
            totalSkills: allSkills.length,
            defaultSkills: defaultSkills.length,
            customSkills: customSkills.length,
            skillsByAbility,
            categories
        };
    }

    /**
     * Get the total count of registered skills
     *
     * Returns the total number of skills in the registry.
     *
     * @returns Total skill count
     */
    getSkillCount(): number {
        return this.getAllSkills().length;
    }

    /**
     * Get skills available to a character based on prerequisites
     *
     * Returns all skills whose prerequisites are met by the character.
     * Skills without prerequisites are always available.
     *
     * @param character - The character sheet to validate prerequisites against
     * @returns Array of skills the character can learn
     */
    getAvailableSkills(character: CharacterSheet): CustomSkill[] {
        return this.getAllSkills().filter(skill => {
            // If skill has no prerequisites, it's available
            if (!skill.prerequisites) {
                return true;
            }

            // Check if character meets the prerequisites
            const validation = this.validatePrerequisites(skill, character);
            return validation.valid;
        });
    }
}

/**
 * Get the global SkillQuery instance
 *
 * Convenience function for accessing the singleton.
 *
 * @returns SkillQuery instance
 */
export function getSkillQuery(): SkillQuery {
    return SkillQuery.getInstance();
}
