/**
 * SpellRegistry
 *
 * Central registry for all spells (default D&D 5e and custom).
 * Manages spell registration, lookup, and categorization by level, school, and class.
 *
 * **Design:** This is a **convenience wrapper** around ExtensionManager.
 * All spells are stored in ExtensionManager; SpellRegistry provides:
 * - Convenient registration methods that delegate to ExtensionManager
 * - Query methods with caching for performance
 * - Spell-related helper methods
 *
 * No duplicate storage - all data lives in ExtensionManager.
 */

import type { Spell } from './SpellTypes.js';
import type { Class, CharacterSheet } from '../types/Character.js';
import { SpellValidator, type SpellValidationResult } from './SpellValidator.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { getSpellSlotsForClass as getSpellSlotsForClassFromConstants } from '../../utils/constants.js';

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
 * SpellRegistry - Singleton class for managing spells
 *
 * The registry is a **convenience wrapper** around ExtensionManager.
 * All spells are stored in ExtensionManager; SpellRegistry provides:
 * - Convenient registration methods that delegate to ExtensionManager
 * - Query methods with caching for performance
 * - Spell-related helper methods
 *
 * Design principle: No duplicate storage. All data lives in ExtensionManager.
 */
export class SpellRegistry {
    private static instance: SpellRegistry;
    private manager: ExtensionManager;
    private allSpellsCache: RegisteredSpell[] | null = null;
    private levelCache: Map<number, RegisteredSpell[]> | null = null;
    private schoolCache: Map<SpellSchool, RegisteredSpell[]> | null = null;

    private constructor() {
        this.manager = ExtensionManager.getInstance();
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
     * Invalidate all caches
     * Called when spells are registered to ensure fresh data
     */
    private invalidateCache(): void {
        this.allSpellsCache = null;
        this.levelCache = null;
        this.schoolCache = null;
    }

    /**
     * Register a single spell
     *
     * Delegates to ExtensionManager.register('spells', [...])
     *
     * @param spell - Spell to register
     * @throws Error if validation fails
     */
    registerSpell(spell: RegisteredSpell): void {
        // Validate spell before registering
        const validation = SpellValidator.validateSpell(spell);
        if (!validation.valid) {
            throw new Error(`Invalid spell "${spell.id || spell.name}":\n${validation.errors.join('\n')}`);
        }

        // Ensure spell has ID
        const spellToRegister = {
            ...spell,
            id: spell.id || spell.name,
            source: spell.source || 'custom'
        };

        // Delegate to ExtensionManager
        this.manager.register('spells', [spellToRegister]);

        // Invalidate cache
        this.invalidateCache();
    }

    /**
     * Register multiple spells at once
     *
     * Delegates to ExtensionManager.register('spells', [...])
     *
     * @param spells - Array of spells to register
     */
    registerSpells(spells: RegisteredSpell[]): void {
        // Validate all spells first
        for (const spell of spells) {
            const validation = SpellValidator.validateSpell(spell);
            if (!validation.valid) {
                throw new Error(`Invalid spell "${spell.id || spell.name}":\n${validation.errors.join('\n')}`);
            }
        }

        // Ensure all spells have IDs
        const spellsToRegister = spells.map(spell => ({
            ...spell,
            id: spell.id || spell.name,
            source: spell.source || 'custom'
        }));

        // Delegate to ExtensionManager
        this.manager.register('spells', spellsToRegister);

        // Invalidate cache
        this.invalidateCache();
    }

    /**
     * Register a spell list for a class
     *
     * Delegates to ExtensionManager.register('spells.${class}', [...])
     *
     * @param characterClass - Class to register spell list for
     * @param spellIds - Array of spell IDs for this class
     */
    registerClassSpellList(characterClass: Class, spellIds: string[]): void {
        // Get all spells to validate spell IDs exist
        const allSpells = this.getSpells();
        const spellIdSet = new Set(allSpells.map(s => s.id));

        // Validate all spell IDs exist
        const invalidIds: string[] = [];
        for (const spellId of spellIds) {
            if (!spellIdSet.has(spellId)) {
                invalidIds.push(spellId);
            }
        }

        if (invalidIds.length > 0) {
            throw new Error(
                `Invalid spell IDs for class ${characterClass}: ${invalidIds.join(', ')}`
            );
        }

        // Delegate to ExtensionManager
        const category = `spells.${characterClass}` as const;
        this.manager.register(category, spellIds);
    }

    /**
     * Get a spell by ID
     *
     * @param spellId - Spell ID to look up
     * @returns Spell or undefined if not found
     */
    getSpell(spellId: string): RegisteredSpell | undefined {
        const allSpells = this.getSpells();
        return allSpells.find(spell => spell.id === spellId);
    }

    /**
     * Get all registered spells
     *
     * Reads from ExtensionManager with caching.
     *
     * @returns Array of all spells
     */
    getSpells(): RegisteredSpell[] {
        if (!this.allSpellsCache) {
            const spells = this.manager.get('spells');
            this.allSpellsCache = spells as RegisteredSpell[];
        }
        return this.allSpellsCache;
    }

    /**
     * Get spells by level
     *
     * Builds index from ExtensionManager data with caching.
     *
     * @param level - Spell level (0-9)
     * @returns Array of spells at this level
     */
    getSpellsByLevel(level: number): RegisteredSpell[] {
        if (!this.levelCache) {
            this.levelCache = new Map();
            const allSpells = this.getSpells();
            for (const spell of allSpells) {
                if (!this.levelCache.has(spell.level)) {
                    this.levelCache.set(spell.level, []);
                }
                this.levelCache.get(spell.level)!.push(spell);
            }
        }
        return this.levelCache.get(level) || [];
    }

    /**
     * Get spells by school
     *
     * Builds index from ExtensionManager data with caching.
     *
     * @param school - Spell school to filter by
     * @returns Array of spells from this school
     */
    getSpellsBySchool(school: SpellSchool): RegisteredSpell[] {
        if (!this.schoolCache) {
            this.schoolCache = new Map();
            const allSpells = this.getSpells();
            for (const spell of allSpells) {
                if (!this.schoolCache.has(spell.school)) {
                    this.schoolCache.set(spell.school, []);
                }
                this.schoolCache.get(spell.school)!.push(spell);
            }
        }
        return this.schoolCache.get(school) || [];
    }

    /**
     * Get spells available to a specific class
     *
     * Filters spells by their classes property.
     *
     * @param characterClass - Class to get spells for
     * @returns Array of spells available to this class
     */
    getSpellsForClass(characterClass: Class): RegisteredSpell[] {
        const allSpells = this.getSpells();
        return allSpells.filter(spell =>
            spell.classes && spell.classes.includes(characterClass)
        );
    }

    /**
     * Get spells available to a character (prerequisites met)
     *
     * Filters all spells by character prerequisites.
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
     * Reads from ExtensionManager.
     *
     * @param characterClass - Class to get spell list for
     * @returns Array of spell IDs for this class
     */
    getClassSpellList(characterClass: Class): string[] {
        const category = `spells.${characterClass}` as const;
        const spellList = this.manager.get(category);
        return spellList as string[] || [];
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
        const slots = getSpellSlotsForClassFromConstants(characterClass, level);

        // Return total number of spell slots across all levels
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
    ): SpellValidationResult {
        return SpellValidator.validateSpellPrerequisites(
            spell.prerequisites,
            character
        );
    }

    /**
     * Validate spell data structure
     *
     * @param spell - Spell object to validate
     * @returns Validation result with any errors
     */
    validateSpell(spell: RegisteredSpell): SpellValidationResult {
        return SpellValidator.validateSpell(spell);
    }

    /**
     * Check if a spell exists in the registry
     *
     * @param spellId - Spell ID to check
     * @returns True if spell exists
     */
    hasSpell(spellId: string): boolean {
        return this.getSpell(spellId) !== undefined;
    }

    /**
     * Get total spell count
     *
     * @returns Total number of registered spells
     */
    getSpellCount(): number {
        return this.getSpells().length;
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
            spellsByLevel[level] = this.getSpellsByLevel(level).length;
        }

        // Count spells per school
        const spellsBySchool: Record<SpellSchool, number> = {
            Abjuration: this.getSpellsBySchool('Abjuration').length,
            Conjuration: this.getSpellsBySchool('Conjuration').length,
            Divination: this.getSpellsBySchool('Divination').length,
            Enchantment: this.getSpellsBySchool('Enchantment').length,
            Evocation: this.getSpellsBySchool('Evocation').length,
            Illusion: this.getSpellsBySchool('Illusion').length,
            Necromancy: this.getSpellsBySchool('Necromancy').length,
            Transmutation: this.getSpellsBySchool('Transmutation').length
        };

        // Count classes with spells
        const classesWithSpells = new Set<Class>();
        for (const spell of allSpells) {
            if (spell.classes) {
                for (const cls of spell.classes) {
                    classesWithSpells.add(cls);
                }
            }
        }

        return {
            totalSpells: allSpells.length,
            defaultSpells: defaultSpells.length,
            customSpells: customSpells.length,
            spellsByLevel,
            spellsBySchool,
            classesWithSpells: classesWithSpells.size
        };
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
