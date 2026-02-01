/**
 * SkillRegistry
 *
 * Central registry for all skills (default D&D 5e and custom).
 * Manages skill registration, lookup, and categorization.
 *
 * Part of Phase 12.2: Create SkillRegistry.
 * Part of Phase 3.3: Update SkillRegistry for prerequisite validation.
 */

import type {
    CustomSkill,
    SkillRegistryStats,
    SkillValidationResult
} from './SkillTypes.js';
import type { Ability, CharacterSheet } from '../types/Character.js';
import { DEFAULT_SKILLS } from './DefaultSkills.js';
import { SkillValidator } from './SkillValidator.js';

/**
 * SkillRegistry - Singleton class for managing skills
 *
 * The registry handles:
 * - Skill registration and lookup
 * - Skill queries by ability, category, or source
 * - Validation of skill IDs
 * - Registry statistics
 */
export class SkillRegistry {
    private static instance: SkillRegistry;
    private skills: Map<string, CustomSkill>;
    private skillsByAbility: Map<Ability, Set<string>>;
    private skillsByCategory: Map<string, Set<string>>;
    private initialized: boolean = false;

    private constructor() {
        this.skills = new Map();
        this.skillsByAbility = new Map();
        this.skillsByCategory = new Map();

        // Initialize ability maps
        const abilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        for (const ability of abilities) {
            this.skillsByAbility.set(ability, new Set());
        }
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
     * Initialize the registry with default skills
     * This should be called once during package initialization
     *
     * @param defaultSkills - Default skills to load (uses DEFAULT_SKILLS if not provided)
     */
    initializeDefaults(defaultSkills: CustomSkill[] = DEFAULT_SKILLS): void {
        if (this.initialized) {
            return; // Already initialized
        }

        // Clear any existing data
        this.reset();

        // Register default skills
        for (const skill of defaultSkills) {
            this.registerSkill(skill);
        }

        this.initialized = true;
    }

    /**
     * Register a single skill
     *
     * @param skill - Skill to register
     * @throws Error if skill ID already exists
     */
    registerSkill(skill: CustomSkill): void {
        if (this.skills.has(skill.id)) {
            throw new Error(`Skill with ID "${skill.id}" already exists`);
        }

        // Validate skill ID format (lowercase_with_underscores)
        if (!/^[a-z][a-z0-9_]*$/.test(skill.id)) {
            throw new Error(
                `Invalid skill ID "${skill.id}". ` +
                `Skill IDs must be lowercase_with_underscores format.`
            );
        }

        // Add to main skills map
        this.skills.set(skill.id, skill);

        // Index by ability
        const abilitySkills = this.skillsByAbility.get(skill.ability);
        if (abilitySkills) {
            abilitySkills.add(skill.id);
        }

        // Index by category (if categories provided)
        if (skill.categories && skill.categories.length > 0) {
            for (const category of skill.categories) {
                if (!this.skillsByCategory.has(category)) {
                    this.skillsByCategory.set(category, new Set());
                }
                this.skillsByCategory.get(category)!.add(skill.id);
            }
        }
    }

    /**
     * Register multiple skills at once
     *
     * @param skills - Array of skills to register
     */
    registerSkills(skills: CustomSkill[]): void {
        for (const skill of skills) {
            this.registerSkill(skill);
        }
    }

    /**
     * Get a skill by ID
     *
     * @param id - Skill ID to look up
     * @returns Skill or undefined if not found
     */
    getSkill(id: string): CustomSkill | undefined {
        return this.skills.get(id);
    }

    /**
     * Get all registered skills
     *
     * @returns Array of all skills
     */
    getAllSkills(): CustomSkill[] {
        return Array.from(this.skills.values());
    }

    /**
     * Get skills by ability score
     *
     * @param ability - Ability score to filter by
     * @returns Array of skills that use this ability
     */
    getSkillsByAbility(ability: Ability): CustomSkill[] {
        const skillIds = this.skillsByAbility.get(ability);
        if (!skillIds) {
            return [];
        }

        return Array.from(skillIds)
            .map(id => this.skills.get(id))
            .filter((skill): skill is CustomSkill => skill !== undefined);
    }

    /**
     * Get skills by category
     *
     * @param category - Category to filter by
     * @returns Array of skills in this category
     */
    getSkillsByCategory(category: string): CustomSkill[] {
        const skillIds = this.skillsByCategory.get(category);
        if (!skillIds) {
            return [];
        }

        return Array.from(skillIds)
            .map(id => this.skills.get(id))
            .filter((skill): skill is CustomSkill => skill !== undefined);
    }

    /**
     * Get all categories in use
     *
     * @returns Array of category names
     */
    getCategories(): string[] {
        return Array.from(this.skillsByCategory.keys());
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
        return this.skills.has(id);
    }

    /**
     * Validate skill data structure
     *
     * @param skill - Skill object to validate
     * @returns Validation result with any errors
     */
    validateSkill(skill: CustomSkill): SkillValidationResult {
        const errors: string[] = [];

        // Check required fields
        if (!skill.id || typeof skill.id !== 'string') {
            errors.push('Skill must have a valid id');
        }

        if (!skill.name || typeof skill.name !== 'string') {
            errors.push('Skill must have a valid name');
        }

        if (!skill.ability || typeof skill.ability !== 'string') {
            errors.push('Skill must have a valid ability');
        }

        // Validate ability is one of the 6 abilities
        const validAbilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        if (skill.ability && !validAbilities.includes(skill.ability as Ability)) {
            errors.push(`Invalid ability: ${skill.ability}. Must be one of: ${validAbilities.join(', ')}`);
        }

        // Validate source
        if (skill.source && !['default', 'custom'].includes(skill.source)) {
            errors.push(`Invalid source: ${skill.source}. Must be 'default' or 'custom'`);
        }

        // Validate ID format
        if (skill.id && !/^[a-z][a-z0-9_]*$/.test(skill.id)) {
            errors.push(`Invalid skill ID "${skill.id}". Must be lowercase_with_underscores format.`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
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
     * Reset the registry to initial state
     *
     * Clears all registered skills.
     * Useful for testing or reinitialization.
     */
    reset(): void {
        this.skills.clear();
        this.skillsByAbility.clear();
        this.skillsByCategory.clear();

        // Reinitialize ability maps
        const abilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        for (const ability of abilities) {
            this.skillsByAbility.set(ability, new Set());
        }

        this.initialized = false;
    }

    /**
     * Check if the registry has been initialized
     *
     * @returns True if initialized with defaults
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Export all registered skills as JSON
     *
     * Useful for debugging or serialization.
     *
     * @returns Array of all skills
     */
    exportRegistry(): CustomSkill[] {
        return this.getAllSkills();
    }

    /**
     * Unregister a skill by ID
     *
     * Warning: This is primarily for testing.
     * Removing skills that are in use may cause issues.
     *
     * @param id - Skill ID to unregister
     * @returns True if skill was found and removed
     */
    unregisterSkill(id: string): boolean {
        const skill = this.skills.get(id);
        if (!skill) {
            return false;
        }

        // Remove from main map
        this.skills.delete(id);

        // Remove from ability index
        const abilitySkills = this.skillsByAbility.get(skill.ability);
        if (abilitySkills) {
            abilitySkills.delete(id);
        }

        // Remove from category indexes
        if (skill.categories) {
            for (const category of skill.categories) {
                const categorySkills = this.skillsByCategory.get(category);
                if (categorySkills) {
                    categorySkills.delete(id);

                    // Clean up empty category maps
                    if (categorySkills.size === 0) {
                        this.skillsByCategory.delete(category);
                    }
                }
            }
        }

        return true;
    }

    /**
     * Get the total count of registered skills
     *
     * Returns the total number of skills in the registry.
     *
     * @returns Total skill count
     */
    getSkillCount(): number {
        return this.skills.size;
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
