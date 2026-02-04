/**
 * SkillRegistry
 *
 * Central registry for all skills (default D&D 5e and custom).
 * Manages skill registration, lookup, and categorization.
 *
 * **Design:** This is a **convenience wrapper** around ExtensionManager.
 * All skills are stored in ExtensionManager; SkillRegistry provides:
 * - Convenient registration methods that delegate to ExtensionManager
 * - Query methods with caching for performance
 * - Skill-related helper methods
 *
 * No duplicate storage - all data lives in ExtensionManager.
 */

import type {
    CustomSkill,
    SkillRegistryStats,
    SkillValidationResult
} from './SkillTypes.js';
import type { Ability, CharacterSheet } from '../types/Character.js';
import { SkillValidator } from './SkillValidator.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';

/**
 * SkillRegistry - Singleton class for managing skills
 *
 * The registry is a **convenience wrapper** around ExtensionManager.
 * All skills are stored in ExtensionManager; SkillRegistry provides:
 * - Convenient registration methods that delegate to ExtensionManager
 * - Query methods with caching for performance
 * - Skill-related helper methods
 *
 * Design principle: No duplicate storage. All data lives in ExtensionManager.
 */
export class SkillRegistry {
    private static instance: SkillRegistry;
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
    static getInstance(): SkillRegistry {
        if (!SkillRegistry.instance) {
            SkillRegistry.instance = new SkillRegistry();
        }
        return SkillRegistry.instance;
    }

    /**
     * Invalidate all caches
     * Called when skills are registered to ensure fresh data
     */
    private invalidateCache(): void {
        this.allSkillsCache = null;
        this.abilityCache = null;
        this.categoryCache = null;
    }

    /**
     * Register a single skill
     *
     * Delegates to ExtensionManager.register('skills', [...])
     *
     * @param skill - Skill to register
     * @throws Error if validation fails
     */
    registerSkill(skill: CustomSkill): void {
        // Validate skill before registering
        const validation = SkillValidator.validateSkill(skill);
        if (!validation.valid) {
            throw new Error(`Invalid skill "${skill.id}":\n${validation.errors.join('\n')}`);
        }

        // Ensure skill has source
        const skillToRegister = {
            ...skill,
            source: skill.source || 'custom'
        };

        // Delegate to ExtensionManager
        this.manager.register('skills', [skillToRegister]);

        // Invalidate cache
        this.invalidateCache();
    }

    /**
     * Register multiple skills at once
     *
     * Delegates to ExtensionManager.register('skills', [...])
     *
     * @param skills - Array of skills to register
     */
    registerSkills(skills: CustomSkill[]): void {
        // Validate all skills first
        for (const skill of skills) {
            const validation = SkillValidator.validateSkill(skill);
            if (!validation.valid) {
                throw new Error(`Invalid skill "${skill.id}":\n${validation.errors.join('\n')}`);
            }
        }

        // Ensure all skills have source
        const skillsToRegister = skills.map(skill => ({
            ...skill,
            source: skill.source || 'custom'
        }));

        // Delegate to ExtensionManager
        this.manager.register('skills', skillsToRegister);

        // Invalidate cache
        this.invalidateCache();
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
     * Validate if a skill ID exists in the registry
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
     * Get registry statistics
     *
     * @returns Statistics about registered skills
     */
    getRegistryStats(): SkillRegistryStats {
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
 * Get the global SkillRegistry instance
 *
 * Convenience function for accessing the singleton.
 *
 * @returns SkillRegistry instance
 */
export function getSkillRegistry(): SkillRegistry {
    return SkillRegistry.getInstance();
}
