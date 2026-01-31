/**
 * SpellRegistry
 *
 * Central registry for all spells (default D&D 5e and custom).
 * Manages spell registration, lookup, and categorization by level, school, and class.
 *
 * Part of Phase 4: Spell Prerequisites System.
 * Part of Phase 12.3: Create SpellRegistry for consistency with SkillRegistry and FeatureRegistry.
 */

import type { Spell, SpellPrerequisite } from '../../utils/constants.js';
import type { Class, CharacterSheet } from '../types/Character.js';
import { SPELL_DATABASE } from '../../utils/constants.js';
import { SpellValidator, type SpellValidationResult } from './SpellValidator.js';

/**
 * Valid D&D 5e spell schools
 */
export type SpellSchool =
    | 'Abjuration'
    | 'Conjuration'
    | 'Divination'
    | 'Enchantment'
    | 'Evocation'
    | 'Illusion'
    | 'Necromancy'
    | 'Transmutation';

/**
 * Extended Spell interface with optional registry fields
 */
export interface RegisteredSpell extends Spell {
    /** Unique identifier (uses name as ID if not provided) */
    id: string;
    /** Classes that can learn this spell */
    classes?: Class[];
    /** Source of the spell (default or custom) */
    source?: 'default' | 'custom';
}

/**
 * Validation result with warnings support
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
}

/**
 * SpellRegistry - Singleton class for managing spells
 *
 * The registry handles:
 * - Spell registration and lookup
 * - Spell queries by level, school, or class
 * - Prerequisite validation for characters
 * - Class spell list management
 * - Spell slot queries
 */
export class SpellRegistry {
    private static instance: SpellRegistry;
    private spells: Map<string, RegisteredSpell>;
    private spellsByLevel: Map<number, Set<string>>;
    private spellsBySchool: Map<SpellSchool, Set<string>>;
    private spellsByClass: Map<Class, Set<string>>;
    private classSpellLists: Map<Class, string[]>;
    private initialized: boolean = false;

    private constructor() {
        this.spells = new Map();
        this.spellsByLevel = new Map();
        this.spellsBySchool = new Map();
        this.spellsByClass = new Map();
        this.classSpellLists = new Map();

        // Initialize level maps (0-9)
        for (let level = 0; level <= 9; level++) {
            this.spellsByLevel.set(level, new Set());
        }

        // Initialize school maps
        const schools: SpellSchool[] = [
            'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
            'Evocation', 'Illusion', 'Necromancy', 'Transmutation'
        ];
        for (const school of schools) {
            this.spellsBySchool.set(school, new Set());
        }
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): SpellRegistry {
        if (!SpellRegistry.instance) {
            SpellRegistry.instance = new SpellRegistry();
        }
        return SpellRegistry.instance;
    }

    /**
     * Initialize the registry with default spells
     * This should be called once during package initialization
     *
     * @param defaultSpells - Default spells to load (uses SPELL_DATABASE if not provided)
     */
    initializeDefaults(defaultSpells?: Record<string, Spell>): void {
        if (this.initialized) {
            return; // Already initialized
        }

        // Clear any existing data
        this.reset();

        // Use SPELL_DATABASE if no custom spells provided
        const spellsToLoad = defaultSpells || SPELL_DATABASE;

        // Register default spells
        for (const [name, spell] of Object.entries(spellsToLoad)) {
            const registeredSpell: RegisteredSpell = {
                ...spell,
                id: spell.id || name,
                source: 'default'
            };
            this.registerSpell(registeredSpell);
        }

        this.initialized = true;
    }

    /**
     * Register a single spell
     *
     * @param spell - Spell to register
     * @throws Error if spell ID already exists or validation fails
     */
    registerSpell(spell: RegisteredSpell): void {
        // Validate spell before registering
        const validation = SpellValidator.validateSpell(spell);
        if (!validation.valid) {
            throw new Error(`Invalid spell "${spell.id || spell.name}":\n${validation.errors.join('\n')}`);
        }

        // Use spell name as ID if not provided
        const spellId = spell.id || spell.name;

        if (this.spells.has(spellId)) {
            throw new Error(`Spell with ID "${spellId}" already exists`);
        }

        // Ensure the spell has an ID
        const spellToStore: RegisteredSpell = {
            ...spell,
            id: spellId,
            source: spell.source || 'custom'
        };

        // Add to main spells map
        this.spells.set(spellId, spellToStore);

        // Index by level
        const levelSpells = this.spellsByLevel.get(spell.level);
        if (levelSpells) {
            levelSpells.add(spellId);
        }

        // Index by school
        const schoolSpells = this.spellsBySchool.get(spell.school);
        if (schoolSpells) {
            schoolSpells.add(spellId);
        }

        // Index by class (if classes specified)
        if (spell.classes && spell.classes.length > 0) {
            for (const characterClass of spell.classes) {
                if (!this.spellsByClass.has(characterClass)) {
                    this.spellsByClass.set(characterClass, new Set());
                }
                this.spellsByClass.get(characterClass)!.add(spellId);
            }
        }
    }

    /**
     * Register multiple spells at once
     *
     * @param spells - Array of spells to register
     */
    registerSpells(spells: RegisteredSpell[]): void {
        for (const spell of spells) {
            this.registerSpell(spell);
        }
    }

    /**
     * Get a spell by ID
     *
     * @param spellId - Spell ID to look up
     * @returns Spell or undefined if not found
     */
    getSpell(spellId: string): RegisteredSpell | undefined {
        return this.spells.get(spellId);
    }

    /**
     * Get all registered spells
     *
     * @returns Array of all spells
     */
    getSpells(): RegisteredSpell[] {
        return Array.from(this.spells.values());
    }

    /**
     * Get spells by level
     *
     * @param level - Spell level (0-9)
     * @returns Array of spells at this level
     */
    getSpellsByLevel(level: number): RegisteredSpell[] {
        const spellIds = this.spellsByLevel.get(level);
        if (!spellIds) {
            return [];
        }

        return Array.from(spellIds)
            .map(id => this.spells.get(id))
            .filter((spell): spell is RegisteredSpell => spell !== undefined);
    }

    /**
     * Get spells by school
     *
     * @param school - Spell school to filter by
     * @returns Array of spells from this school
     */
    getSpellsBySchool(school: SpellSchool): RegisteredSpell[] {
        const spellIds = this.spellsBySchool.get(school);
        if (!spellIds) {
            return [];
        }

        return Array.from(spellIds)
            .map(id => this.spells.get(id))
            .filter((spell): spell is RegisteredSpell => spell !== undefined);
    }

    /**
     * Get spells available to a specific class
     *
     * @param characterClass - Class to get spells for
     * @returns Array of spells available to this class
     */
    getSpellsForClass(characterClass: Class): RegisteredSpell[] {
        const spellIds = this.spellsByClass.get(characterClass);
        if (!spellIds) {
            return [];
        }

        return Array.from(spellIds)
            .map(id => this.spells.get(id))
            .filter((spell): spell is RegisteredSpell => spell !== undefined);
    }

    /**
     * Get spells available to a character (prerequisites met)
     *
     * @param character - Character sheet to validate against
     * @returns Array of spells the character can learn
     */
    getAvailableSpells(character: CharacterSheet): RegisteredSpell[] {
        const allSpells = this.getSpells();
        const availableSpells: RegisteredSpell[] = [];

        for (const spell of allSpells) {
            const result = this.validatePrerequisites(spell, character);
            if (result.valid) {
                availableSpells.push(spell);
            }
        }

        return availableSpells;
    }

    /**
     * Get the spell list for a class (spell IDs)
     *
     * @param characterClass - Class to get spell list for
     * @returns Array of spell IDs for this class
     */
    getClassSpellList(characterClass: Class): string[] {
        return this.classSpellLists.get(characterClass) || [];
    }

    /**
     * Register a spell list for a class
     *
     * @param characterClass - Class to register spell list for
     * @param spellIds - Array of spell IDs for this class
     */
    registerClassSpellList(characterClass: Class, spellIds: string[]): void {
        // Validate all spell IDs exist
        const invalidIds: string[] = [];
        for (const spellId of spellIds) {
            if (!this.spells.has(spellId)) {
                invalidIds.push(spellId);
            }
        }

        if (invalidIds.length > 0) {
            throw new Error(
                `Invalid spell IDs for class ${characterClass}: ${invalidIds.join(', ')}`
            );
        }

        this.classSpellLists.set(characterClass, [...spellIds]);

        // Also update the spellsByClass index
        for (const spellId of spellIds) {
            if (!this.spellsByClass.has(characterClass)) {
                this.spellsByClass.set(characterClass, new Set());
            }
            this.spellsByClass.get(characterClass)!.add(spellId);
        }
    }

    /**
     * Get spell slots for a class at a specific level
     *
     * Note: This delegates to the getSpellSlotsForClass helper from constants.ts
     * which handles both default and custom class spell slot progressions.
     *
     * @param characterClass - Class to get spell slots for
     * @param level - Character level (1-20)
     * @returns Number of spell slots at this level, or 0 if not a spellcaster
     */
    getSpellSlotsForClass(characterClass: Class, level: number): number {
        // Import the helper function dynamically to avoid circular dependencies
        const { getSpellSlotsForClass } = require('../../utils/constants.js');
        const slots = getSpellSlotsForClass(characterClass, level);

        // Return slots for the given spell level (level parameter here is character level)
        // This is a simplified implementation - the full version would need spell level parameter
        if (!slots) {
            return 0;
        }
        const slotValues = Object.values(slots) as number[];
        return slotValues.reduce((sum, count) => sum + count, 0);
    }

    /**
     * Validate spell prerequisites against a character
     *
     * Checks if a character meets all prerequisite requirements for a spell.
     * This is a convenience method that delegates to SpellValidator.
     *
     * @param spell - The spell whose prerequisites to validate
     * @param character - The character sheet to validate against
     * @returns Validation result with unmet prerequisites if any
     */
    validatePrerequisites(
        spell: RegisteredSpell,
        character: CharacterSheet
    ): ValidationResult {
        const result = SpellValidator.validateSpellPrerequisites(
            spell.prerequisites,
            character
        );

        return {
            valid: result.valid,
            errors: result.errors,
            warnings: result.errors.length === 0 ? undefined : result.errors
        };
    }

    /**
     * Validate spell data structure
     *
     * @param spell - Spell object to validate
     * @returns Validation result with any errors
     */
    validateSpell(spell: RegisteredSpell): ValidationResult {
        const result = SpellValidator.validateSpell(spell);

        return {
            valid: result.valid,
            errors: result.errors,
            warnings: undefined
        };
    }

    /**
     * Check if a spell exists in the registry
     *
     * @param spellId - Spell ID to check
     * @returns True if spell exists
     */
    hasSpell(spellId: string): boolean {
        return this.spells.has(spellId);
    }

    /**
     * Get total spell count
     *
     * @returns Total number of registered spells
     */
    getSpellCount(): number {
        return this.spells.size;
    }

    /**
     * Get spells by source
     *
     * @param source - 'default' or 'custom'
     * @returns Array of spells from this source
     */
    getSpellsBySource(source: 'default' | 'custom'): RegisteredSpell[] {
        return this.getSpells().filter(spell => spell.source === source);
    }

    /**
     * Get registry statistics
     *
     * @returns Statistics about registered spells
     */
    getRegistryStats(): {
        totalSpells: number;
        defaultSpells: number;
        customSpells: number;
        spellsByLevel: Record<number, number>;
        spellsBySchool: Record<SpellSchool, number>;
        classesWithSpells: number;
    } {
        const allSpells = this.getSpells();
        const defaultSpells = allSpells.filter(s => s.source === 'default');
        const customSpells = allSpells.filter(s => s.source === 'custom');

        // Count spells per level
        const spellsByLevel: Record<number, number> = {} as any;
        for (let level = 0; level <= 9; level++) {
            spellsByLevel[level] = this.spellsByLevel.get(level)?.size || 0;
        }

        // Count spells per school
        const spellsBySchool: Record<SpellSchool, number> = {
            Abjuration: this.spellsBySchool.get('Abjuration')?.size || 0,
            Conjuration: this.spellsBySchool.get('Conjuration')?.size || 0,
            Divination: this.spellsBySchool.get('Divination')?.size || 0,
            Enchantment: this.spellsBySchool.get('Enchantment')?.size || 0,
            Evocation: this.spellsBySchool.get('Evocation')?.size || 0,
            Illusion: this.spellsBySchool.get('Illusion')?.size || 0,
            Necromancy: this.spellsBySchool.get('Necromancy')?.size || 0,
            Transmutation: this.spellsBySchool.get('Transmutation')?.size || 0
        };

        return {
            totalSpells: allSpells.length,
            defaultSpells: defaultSpells.length,
            customSpells: customSpells.length,
            spellsByLevel,
            spellsBySchool,
            classesWithSpells: this.spellsByClass.size
        };
    }

    /**
     * Reset the registry to initial state
     *
     * Clears all registered spells and indexes.
     * Useful for testing or reinitialization.
     */
    reset(): void {
        this.spells.clear();
        this.spellsByLevel.clear();
        this.spellsBySchool.clear();
        this.spellsByClass.clear();
        this.classSpellLists.clear();

        // Reinitialize level maps (0-9)
        for (let level = 0; level <= 9; level++) {
            this.spellsByLevel.set(level, new Set());
        }

        // Reinitialize school maps
        const schools: SpellSchool[] = [
            'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
            'Evocation', 'Illusion', 'Necromancy', 'Transmutation'
        ];
        for (const school of schools) {
            this.spellsBySchool.set(school, new Set());
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
     * Export all registered spells as JSON
     *
     * Useful for debugging or serialization.
     *
     * @returns Array of all spells
     */
    exportRegistry(): RegisteredSpell[] {
        return this.getSpells();
    }

    /**
     * Unregister a spell by ID
     *
     * Warning: This is primarily for testing.
     * Removing spells that are in use may cause issues.
     *
     * @param spellId - Spell ID to unregister
     * @returns True if spell was found and removed
     */
    unregisterSpell(spellId: string): boolean {
        const spell = this.spells.get(spellId);
        if (!spell) {
            return false;
        }

        // Remove from main map
        this.spells.delete(spellId);

        // Remove from level index
        const levelSpells = this.spellsByLevel.get(spell.level);
        if (levelSpells) {
            levelSpells.delete(spellId);
        }

        // Remove from school index
        const schoolSpells = this.spellsBySchool.get(spell.school);
        if (schoolSpells) {
            schoolSpells.delete(spellId);
        }

        // Remove from class indexes
        if (spell.classes) {
            for (const characterClass of spell.classes) {
                const classSpells = this.spellsByClass.get(characterClass);
                if (classSpells) {
                    classSpells.delete(spellId);
                }
            }
        }

        // Remove from class spell lists
        for (const [characterClass, spellList] of this.classSpellLists.entries()) {
            const index = spellList.indexOf(spellId);
            if (index !== -1) {
                spellList.splice(index, 1);
            }
        }

        return true;
    }
}

/**
 * Get the global SpellRegistry instance
 *
 * Convenience function for accessing the singleton.
 *
 * @returns SpellRegistry instance
 */
export function getSpellRegistry(): SpellRegistry {
    return SpellRegistry.getInstance();
}
