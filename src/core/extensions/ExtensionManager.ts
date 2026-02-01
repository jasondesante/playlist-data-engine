/**
 * ExtensionManager - Core extensibility system for the Playlist Data Engine
 *
 * Provides runtime customization of ALL procedural generation lists with spawn rate control.
 *
 * Design Principles:
 * - Hybrid spawn rates: Support both relative weights (added to pool) and absolute weights (replace distribution)
 * - Runtime only: Custom data provided each session; characters save with custom items already included
 * - Strict validation: Reject invalid data with clear errors
 * - Consistent API: Same function pattern across all categories
 * - Per-category spawn rates: Each expansion pack includes its own spawn rate weights for its content
 *
 * @module extensions/ExtensionManager
 */

import type { Race, Class, Ability } from '../types/Character.js';
import { DEFAULT_CLASSES, isValidClass } from '../types/Character.js';
import type { ClassFeature, RacialTrait } from '../features/FeatureTypes.js';
import { FeatureRegistry } from '../features/FeatureRegistry.js';
import { FeatureValidator, validateClassFeature, validateRacialTrait } from '../features/FeatureValidator.js';
import type { CustomSkill } from '../skills/SkillTypes.js';
import { SkillRegistry } from '../skills/SkillRegistry.js';
import { SkillValidator, validateSkill } from '../skills/SkillValidator.js';
import { EquipmentValidator } from '../equipment/EquipmentValidator.js';
import type { CustomRaceDataEntry } from '../../utils/constants.js';

/**
 * Spawn modes for custom content
 * - 'relative': Add custom weights to default weights (default)
 * - 'absolute': Replace default weights entirely
 * - 'default': Use default weights (1.0 for all items)
 * - 'replace': Replace default items with custom items only
 */
export type SpawnMode = 'relative' | 'absolute' | 'default' | 'replace';

/**
 * All extensible categories in the system
 */
export type ExtensionCategory =
    | 'equipment'
    // Equipment System - Phase 5
    | 'equipment.properties'      // For custom equipment property templates
    | 'equipment.modifications'   // For custom modification templates
    | 'equipment.templates'       // For equipment templates (Flaming Sword, etc.)
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | 'races'
    | 'races.data'                // For custom race data (ability bonuses, speed, traits, subraces)
    | 'classes'
    | 'classes.data'              // For custom class data (primary ability, hit die, saving throws, spellcasting, skills, expertise, audio preferences)
    | `spells.${string}`
    // Class Features - Phase 11
    | 'classFeatures'
    | 'classFeatures.Barbarian'
    | 'classFeatures.Bard'
    | 'classFeatures.Cleric'
    | 'classFeatures.Druid'
    | 'classFeatures.Fighter'
    | 'classFeatures.Monk'
    | 'classFeatures.Paladin'
    | 'classFeatures.Ranger'
    | 'classFeatures.Rogue'
    | 'classFeatures.Sorcerer'
    | 'classFeatures.Warlock'
    | 'classFeatures.Wizard'
    | `classFeatures.${string}` // For custom class features (Part 4)
    // Racial Traits - Phase 11
    | 'racialTraits'
    | 'racialTraits.Human'
    | 'racialTraits.Elf'
    | 'racialTraits.Dwarf'
    | 'racialTraits.Halfling'
    | 'racialTraits.Dragonborn'
    | 'racialTraits.Gnome'
    | 'racialTraits.Half-Elf'
    | 'racialTraits.Half-Orc'
    | 'racialTraits.Tiefling'
    // Skills - Phase 12
    | 'skills'
    | 'skills.STR'
    | 'skills.DEX'
    | 'skills.CON'
    | 'skills.INT'
    | 'skills.WIS'
    | 'skills.CHA'
    // Skill Lists - Phase 12
    | 'skillLists'
    | 'skillLists.Barbarian'
    | 'skillLists.Bard'
    | 'skillLists.Cleric'
    | 'skillLists.Druid'
    | 'skillLists.Fighter'
    | 'skillLists.Monk'
    | 'skillLists.Paladin'
    | 'skillLists.Ranger'
    | 'skillLists.Rogue'
    | 'skillLists.Sorcerer'
    | 'skillLists.Warlock'
    | 'skillLists.Wizard'
    | `skillLists.${string}` // For custom class skill lists (Part 4)
    // Class Spell Lists - Phase 13 (Part 4)
    | 'classSpellLists'
    | `classSpellLists.${string}`
    // Class Spell Slots - Phase 3.2 (Part 4)
    | 'classSpellSlots'
    // Class Starting Equipment - Phase 3.3 (Part 4)
    | 'classStartingEquipment'
    | `classStartingEquipment.${string}`;

/**
 * Options for registering custom data
 */
export interface ExtensionOptions {
    /**
     * Spawn mode for this extension
     * - 'relative': Add custom weights to default weights (default)
     * - 'absolute': Replace default weights entirely
     * - 'default': Use default weights (1.0 for all items)
     * - 'replace': Replace default items with custom items only
     */
    mode?: SpawnMode;

    /**
     * Custom spawn weights for individual items
     * Item name -> weight multiplier (1.0 = default, 2.0 = twice as likely, 0 = never spawns)
     */
    weights?: Record<string, number>;

    /**
     * Whether to validate items before registration
     * @default true
     */
    validate?: boolean;
}

/**
 * Entry for registering multiple extensions at once
 */
export interface RegistrationEntry {
    /**
     * The category to register items for
     */
    category: ExtensionCategory;

    /**
     * Custom items to add
     */
    items: any[];

    /**
     * Registration options
     */
    options?: ExtensionOptions;
}

/**
 * Stored extension data for a category
 */
interface ExtensionData {
    items: any[];
    options: ExtensionOptions;
    registeredAt: number;
}

/**
 * Result of validation
 */
export interface ValidationResult {
    /**
     * Whether validation passed
     */
    valid: boolean;

    /**
     * Error messages (undefined if valid)
     */
    errors?: string[];

    /**
     * Warning messages for non-critical issues
     */
    warnings?: string[];
}

/**
 * Content pack data exported from ExtensionManager
 *
 * This type represents the structure of data returned by `exportCustomData()`.
 * It can be used to save, load, and share custom content packs.
 */
export interface ContentPackData {
    /**
     * All registered extensions by category
     * Each category contains items, options, and registration timestamp
     */
    extensions: Record<string, {
        items: any[];
        options: ExtensionOptions;
        registeredAt: number;
    }>;

    /**
     * Custom spawn weights for each category
     * Item name -> weight multiplier
     */
    weights: Record<string, Record<string, number>>;
}

/**
 * ExtensionManager - Singleton class for managing runtime extensions
 *
 * Manages custom data for all procedural generation categories with:
 * - Default data initialization
 * - Custom data registration
 * - Weight management
 * - Merged data retrieval
 * - Reset functionality
 */
export class ExtensionManager {
    private static instance: ExtensionManager;
    private defaultData: Map<ExtensionCategory, any[]>;
    private extensions: Map<ExtensionCategory, ExtensionData>;
    private customWeights: Map<string, Record<string, number>>;

    private constructor() {
        this.defaultData = new Map();
        this.extensions = new Map();
        this.customWeights = new Map();
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): ExtensionManager {
        if (!ExtensionManager.instance) {
            ExtensionManager.instance = new ExtensionManager();
        }
        return ExtensionManager.instance;
    }

    /**
     * Initialize default data for a category
     * @param category - The category to initialize
     * @param data - The default data array
     */
    initializeDefaults(category: ExtensionCategory, data: any[]): void {
        this.defaultData.set(category, [...data]);
    }

    /**
     * Initialize all default data from constants
     */
    initializeAllDefaults(data: Record<string, any[]>): void {
        for (const [category, items] of Object.entries(data)) {
            this.initializeDefaults(category as ExtensionCategory, items);
        }
    }

    /**
     * Register custom data for a category
     * @param category - The category to extend
     * @param items - Custom items to add
     * @param options - Registration options
     */
    register(
        category: ExtensionCategory,
        items: any[],
        options: ExtensionOptions = {}
    ): void {
        const {
            mode = 'relative',
            weights = {},
            validate = true
        } = options;

        // Validate items if validation is enabled
        if (validate) {
            const validation = this.validate(category, items);
            if (!validation.valid) {
                throw new Error(
                    `Invalid items for category '${category}':\n${validation.errors?.join('\n')}`
                );
            }
        }

        // Store the extension data
        // For relative mode, merge with existing items; for other modes, replace
        const existingExtension = this.extensions.get(category);
        const finalItems = (mode === 'relative' && existingExtension)
            ? [...existingExtension.items, ...items]
            : [...items];

        this.extensions.set(category, {
            items: finalItems,
            options: { mode, weights, validate },
            registeredAt: Date.now()
        });

        // Merge custom weights if provided (don't replace existing weights)
        if (Object.keys(weights).length > 0) {
            const existingWeights = this.customWeights.get(category) || {};
            this.customWeights.set(category, { ...existingWeights, ...weights });
        }

        // Phase 13.1: Integrate with FeatureRegistry for class features
        if (category === 'classFeatures') {
            // Only register with FeatureRegistry if validation is enabled
            if (validate) {
                const registry = FeatureRegistry.getInstance();
                registry.registerClassFeatures(items as ClassFeature[]);
            }
        }

        // Phase 13.1: Integrate with FeatureRegistry for racial traits
        if (category === 'racialTraits') {
            // Only register with FeatureRegistry if validation is enabled
            if (validate) {
                const registry = FeatureRegistry.getInstance();
                registry.registerRacialTraits(items as RacialTrait[]);
            }
        }

        // Phase 13.1: Handle class-specific features
        if (category.startsWith('classFeatures.')) {
            // className is extracted for future use in validation/logging
            void category.replace('classFeatures.', '') as unknown as Class;
            // Only register with FeatureRegistry if validation is enabled
            if (validate) {
                const registry = FeatureRegistry.getInstance();
                registry.registerClassFeatures(items as ClassFeature[]);
            }
        }

        // Phase 13.1: Handle race-specific traits
        if (category.startsWith('racialTraits.')) {
            // raceName is extracted for future use in validation/logging
            void category.replace('racialTraits.', '') as unknown as Race;
            // Only register with FeatureRegistry if validation is enabled
            if (validate) {
                const registry = FeatureRegistry.getInstance();
                registry.registerRacialTraits(items as RacialTrait[]);
            }
        }

        // Phase 13.1: Integrate with SkillRegistry for skills
        if (category === 'skills') {
            // Only register with SkillRegistry if validation is enabled
            if (validate) {
                const registry = SkillRegistry.getInstance();
                registry.registerSkills(items as CustomSkill[]);
            }
        }

        // Phase 13.1: Handle ability-specific skills
        if (category.startsWith('skills.')) {
            // abilityName is extracted for future use in validation/logging
            void category.replace('skills.', '') as unknown as Ability;
            // Only register with SkillRegistry if validation is enabled
            if (validate) {
                const registry = SkillRegistry.getInstance();
                registry.registerSkills(items as CustomSkill[]);
            }
        }

        // Phase 13.1: Handle skill lists (class-specific skill lists)
        // Skill lists are stored directly in ExtensionManager without registry integration
        // They are used by SkillAssigner to determine available skills per class
        if (category.startsWith('skillLists.') || category === 'skillLists') {
            // Skill lists are stored directly - no registry integration needed
            // They will be retrieved by SkillAssigner via manager.get()
        }
    }

    /**
     * Register multiple categories in a single call
     * @param registrations - Array of registration entries
     */
    registerMultiple(registrations: RegistrationEntry[]): void {
        for (const registration of registrations) {
            this.register(registration.category, registration.items, registration.options);
        }
    }

    /**
     * Get merged data (defaults + custom) for a category
     * @param category - The category to get data for
     * @returns Merged array of default and custom items
     */
    get(category: ExtensionCategory): any[] {
        const defaults = this.defaultData.get(category) || [];
        const extension = this.extensions.get(category);

        if (!extension) {
            return [...defaults];
        }

        const mode = extension.options.mode || 'relative';

        // Replace mode: return only custom items
        if (mode === 'replace') {
            return [...extension.items];
        }

        // Default and relative modes: merge defaults with custom items
        return [...defaults, ...extension.items];
    }

    /**
     * Get default data only (no custom items)
     * @param category - The category to get defaults for
     * @returns Default items only
     */
    getDefaults(category: ExtensionCategory): any[] {
        return [...(this.defaultData.get(category) || [])];
    }

    /**
     * Get custom items only (no defaults)
     * @param category - The category to get custom items for
     * @returns Custom items only
     */
    getCustom(category: ExtensionCategory): any[] {
        const extension = this.extensions.get(category);
        return extension ? [...extension.items] : [];
    }

    /**
     * Set spawn weights for a category
     * @param category - The category to set weights for
     * @param weights - Record of item name to weight multiplier
     */
    setWeights(category: ExtensionCategory, weights: Record<string, number>): void {
        this.customWeights.set(category, { ...weights });
    }

    /**
     * Get spawn weights for a category
     * @param category - The category to get weights for
     * @returns Combined default and custom weights
     */
    getWeights(category: ExtensionCategory): Record<string, number> {
        const defaults = this.getDefaultWeights(category);
        const custom = this.customWeights.get(category) || {};

        return { ...defaults, ...custom };
    }

    /**
     * Get default weights for a category (all 1.0)
     * @param category - The category to get default weights for
     * @returns Default weights (all items have weight 1.0)
     */
    getDefaultWeights(category: ExtensionCategory): Record<string, number> {
        const items = this.defaultData.get(category) || [];
        const weights: Record<string, number> = {};

        for (const item of items) {
            const name = typeof item === 'string' ? item : item.name;
            if (name) {
                weights[name] = 1.0;
            }
        }

        return weights;
    }

    /**
     * Check if a category has custom data registered
     * @param category - The category to check
     * @returns true if custom data is registered
     */
    hasCustomData(category: ExtensionCategory): boolean {
        return this.extensions.has(category);
    }

    /**
     * Set the registration mode for a category
     * @param category - The category to set mode for
     * @param mode - The spawn mode to set
     */
    setMode(category: ExtensionCategory, mode: SpawnMode): void {
        const extension = this.extensions.get(category);
        if (extension) {
            extension.options.mode = mode;
        } else {
            // If no custom data exists, create an empty extension with the specified mode
            this.extensions.set(category, {
                items: [],
                options: { mode },
                registeredAt: Date.now()
            });
        }
    }

    /**
     * Get the registration mode for a category
     * @param category - The category to check
     * @returns The mode ('relative', 'absolute', 'default', 'replace', or undefined if no custom data)
     */
    getMode(category: ExtensionCategory): 'relative' | 'absolute' | 'default' | 'replace' | undefined {
        const extension = this.extensions.get(category);
        return extension?.options.mode;
    }

    /**
     * Get the registration options for a category
     * @param category - The category to get options for
     * @returns The options object or undefined if no custom data
     */
    getCurrentOptions(category: ExtensionCategory): ExtensionOptions | undefined {
        const extension = this.extensions.get(category);
        return extension?.options;
    }

    /**
     * Validate items for a category
     * @param category - The category to validate against
     * @param items - Items to validate
     * @returns Validation result with any errors
     */
    validate(category: ExtensionCategory, items: any[]): ValidationResult {
        const errors: string[] = [];

        // Basic validation: ensure items is an array
        if (!Array.isArray(items)) {
            errors.push('Items must be an array');
            return { valid: false, errors };
        }

        // Category-specific validation
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemErrors = this.validateItem(category, item, i);
            errors.push(...itemErrors);
        }

        return errors.length > 0
            ? { valid: false, errors }
            : { valid: true };
    }

    /**
     * Validate a single item
     * @param category - The category to validate against
     * @param item - The item to validate
     * @param index - Index of the item in the array (for error messages)
     * @returns Array of error messages (empty if valid)
     */
    private validateItem(category: ExtensionCategory, item: any, index: number): string[] {
        const errors: string[] = [];
        const prefix = `Item ${index}:`;

        // Ensure item exists
        if (item === null || item === undefined) {
            errors.push(`${prefix} Item is null or undefined`);
            return errors;
        }

        // Category-specific validation
        if (category === 'equipment') {
            // Phase 5.2: Use EquipmentValidator for comprehensive equipment validation
            const result = EquipmentValidator.validateEquipment(item);
            if (!result.valid) {
                errors.push(...(result.errors || []).map(e => `${prefix} ${e}`));
            }
        } else if (category === 'spells') {
            // Spells must have name, level, school
            if (!item.name || typeof item.name !== 'string') {
                errors.push(`${prefix} Missing or invalid 'name' property`);
            }
            if (typeof item.level !== 'number' || item.level < 0 || item.level > 9) {
                errors.push(`${prefix} Invalid 'level' (must be 0-9)`);
            }
            const validSchools = ['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'];
            if (!validSchools.includes(item.school)) {
                errors.push(`${prefix} Invalid 'school'`);
            }
        } else if (category === 'races') {
            // Races must be a valid Race type OR a registered custom race
            const validRaces: Race[] = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];

            // Check if it's a default race
            if (validRaces.includes(item)) {
                return errors; // Valid default race
            }

            // Check if it's a previously registered custom race (via 'races' category)
            const registeredRaces = this.get('races');
            if (Array.isArray(registeredRaces) && registeredRaces.includes(item)) {
                return errors; // Valid custom race
            }

            // Check if it's a custom race with data registered via 'races.data' category
            const customRaceData = this.get('races.data' as ExtensionCategory);
            if (Array.isArray(customRaceData)) {
                const raceNames: string[] = customRaceData.map((d: any) => d.race).filter(Boolean);
                if (raceNames.includes(item)) {
                    return errors; // Valid custom race (has data registered)
                }
            }

            // Not a valid race
            errors.push(`${prefix} Invalid race "${item}". Must be one of: ${validRaces.join(', ')} or register custom race via 'races.data' first.`);
        } else if (category === 'races.data') {
            // Validate custom race data objects (CustomRaceDataEntry type)
            // Each item should have: race (string), ability_bonuses (record), speed (number), traits (array), optional subraces
            if (!item.race || typeof item.race !== 'string') {
                errors.push(`${prefix} Race data must have a valid 'race' property (string)`);
            }
            if (typeof item.speed !== 'number' || item.speed <= 0) {
                errors.push(`${prefix} Race data must have a valid 'speed' property (positive number)`);
            }
            if (!Array.isArray(item.traits)) {
                errors.push(`${prefix} Race data must have a 'traits' property (array of strings)`);
            }
            if (item.ability_bonuses) {
                if (typeof item.ability_bonuses !== 'object' || Array.isArray(item.ability_bonuses)) {
                    errors.push(`${prefix} Race 'ability_bonuses' must be a record of ability -> number`);
                } else {
                    const validAbilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
                    for (const [ability, bonus] of Object.entries(item.ability_bonuses)) {
                        if (!validAbilities.includes(ability as Ability)) {
                            errors.push(`${prefix} Invalid ability "${ability}" in ability_bonuses`);
                        }
                        if (typeof bonus !== 'number') {
                            errors.push(`${prefix} Ability bonus for "${ability}" must be a number`);
                        }
                    }
                }
            }
            // Optional subraces array
            if (item.subraces !== undefined && !Array.isArray(item.subraces)) {
                errors.push(`${prefix} Race 'subraces' must be an array of strings (if provided)`);
            }
        } else if (category === 'classes') {
            // Classes must be a valid Class type (default or custom)
            const itemStr = item as string;

            // Check if it's a default class
            const isDefaultClass = DEFAULT_CLASSES.includes(itemStr as Class);

            // Check if it's already registered in the classes category
            const registeredClasses = this.get('classes') as string[] | undefined;
            const isAlreadyRegistered = registeredClasses?.includes(itemStr);

            // Check if it has data registered in classes.data (allows new custom class registration)
            const classDataList = this.get('classes.data') as Array<{ name: string }> | undefined;
            const hasClassData = classDataList?.some(d => d.name === itemStr);

            // Valid if: default class OR already registered OR has data registered
            if (!isDefaultClass && !isAlreadyRegistered && !hasClassData) {
                errors.push(`${prefix} Invalid class (must be one of: ${DEFAULT_CLASSES.join(', ')} or a custom class registered via 'classes.data')`);
            }
        } else if (category === 'classes.data') {
            // Validate custom class data objects
            // Each item should have: name (string), primary_ability (Ability), hit_die (number), saving_throws (Ability[]), is_spellcaster (boolean), skill_count (number), available_skills (string[]), has_expertise (boolean)
            if (!item.name || typeof item.name !== 'string') {
                errors.push(`${prefix} Class data must have a valid 'name' property (string)`);
            }
            const validAbilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
            if (!item.primary_ability || !validAbilities.includes(item.primary_ability)) {
                errors.push(`${prefix} Class data must have a valid 'primary_ability' (one of: STR, DEX, CON, INT, WIS, CHA)`);
            }
            if (typeof item.hit_die !== 'number' || item.hit_die <= 0) {
                errors.push(`${prefix} Class data must have a valid 'hit_die' property (positive number)`);
            }
            if (!Array.isArray(item.saving_throws)) {
                errors.push(`${prefix} Class data must have a 'saving_throws' property (array of abilities)`);
            } else {
                for (const save of item.saving_throws) {
                    if (!validAbilities.includes(save)) {
                        errors.push(`${prefix} Invalid saving throw "${save}" in class data`);
                    }
                }
            }
            if (typeof item.is_spellcaster !== 'boolean') {
                errors.push(`${prefix} Class data must have an 'is_spellcaster' property (boolean)`);
            }
            if (typeof item.skill_count !== 'number' || item.skill_count < 0) {
                errors.push(`${prefix} Class data must have a valid 'skill_count' property (non-negative number)`);
            }
            if (!Array.isArray(item.available_skills)) {
                errors.push(`${prefix} Class data must have an 'available_skills' property (array of skill IDs)`);
            }
            if (typeof item.has_expertise !== 'boolean') {
                errors.push(`${prefix} Class data must have a 'has_expertise' property (boolean)`);
            }
            // Optional expertise_count
            if (item.expertise_count !== undefined && (typeof item.expertise_count !== 'number' || item.expertise_count < 0)) {
                errors.push(`${prefix} Class 'expertise_count' must be a non-negative number (if provided)`);
            }
            // Optional baseClass (for template-based custom classes)
            if (item.baseClass !== undefined && typeof item.baseClass !== 'string') {
                errors.push(`${prefix} Class 'baseClass' must be a string (if provided)`);
            }
            // Optional audio_preferences
            if (item.audio_preferences !== undefined && typeof item.audio_preferences !== 'object') {
                errors.push(`${prefix} Class 'audio_preferences' must be an object (if provided)`);
            }
        } else if (category.startsWith('appearance.')) {
            // Appearance items must be strings
            if (typeof item !== 'string') {
                errors.push(`${prefix} Appearance options must be strings`);
            }
        }
        // Phase 13.2: Class Features validation - use FeatureValidator
        else if (category === 'classFeatures' || category.startsWith('classFeatures.')) {
            const result = FeatureValidator.validateClassFeature(item);
            if (!result.valid) {
                errors.push(...result.errors.map(e => `${prefix} ${e}`));
            }
        }
        // Phase 13.2: Racial Traits validation - use FeatureValidator
        else if (category === 'racialTraits' || category.startsWith('racialTraits.')) {
            const result = FeatureValidator.validateRacialTrait(item);
            if (!result.valid) {
                errors.push(...result.errors.map(e => `${prefix} ${e}`));
            }
        }
        // Phase 13.2: Skills validation - use SkillValidator
        else if (category === 'skills' || category.startsWith('skills.')) {
            const result = SkillValidator.validateSkill(item);
            if (!result.valid) {
                errors.push(...result.errors.map(e => `${prefix} ${e}`));
            }
        }
        // Phase 13.1: Skill Lists validation
        else if (category === 'skillLists' || category.startsWith('skillLists.')) {
            // Skill list items are objects with { class, skillCount, availableSkills, selectionWeights?, hasExpertise?, expertiseCount? }
            if (!item.class || typeof item.class !== 'string') {
                errors.push(`${prefix} Skill list must have a valid 'class'`);
            }
            if (typeof item.skillCount !== 'number' || item.skillCount < 0) {
                errors.push(`${prefix} Invalid 'skillCount' (must be non-negative number)`);
            }
            if (!Array.isArray(item.availableSkills)) {
                errors.push(`${prefix} Invalid 'availableSkills' (must be an array of skill IDs)`);
            }
            // Validate expertise count if provided
            if (item.expertiseCount !== undefined && (typeof item.expertiseCount !== 'number' || item.expertiseCount < 0)) {
                errors.push(`${prefix} Invalid 'expertiseCount' (must be non-negative number)`);
            }
        }

        return errors;
    }

    /**
     * Reset a category to defaults (removes all custom data)
     * @param category - The category to reset
     */
    reset(category: ExtensionCategory): void {
        this.extensions.delete(category);
        this.customWeights.delete(category);

        // Phase 13.1: Reset FeatureRegistry when feature categories are reset
        if (category === 'classFeatures' || category.startsWith('classFeatures.') ||
            category === 'racialTraits' || category.startsWith('racialTraits.')) {
            void FeatureRegistry.getInstance();
            // Note: We don't fully reset the registry as it would remove default features
            // Custom features can be distinguished by source: 'custom' property
            // Full reset would require tracking which custom features were registered via ExtensionManager
        }

        // Phase 13.1: Reset SkillRegistry when skill categories are reset
        if (category === 'skills' || category.startsWith('skills.')) {
            void SkillRegistry.getInstance();
            // Note: We don't fully reset the registry as it would remove default skills
            // Custom skills can be distinguished by source: 'custom' property
            // Full reset would require tracking which custom skills were registered via ExtensionManager
        }

        // Skill lists are stored directly in ExtensionManager - no registry reset needed
    }

    /**
     * Reset all categories to defaults
     */
    resetAll(): void {
        this.extensions.clear();
        this.customWeights.clear();
    }

    /**
     * Get information about registered extensions
     * @param category - Optional category to get info for (if omitted, returns all)
     * @returns Object with extension information
     */
    getInfo(category?: ExtensionCategory): Record<string, any> {
        if (category) {
            const extension = this.extensions.get(category);
            const defaults = this.defaultData.get(category) || [];

            return {
                hasCustomData: this.hasCustomData(category),
                defaultCount: defaults.length,
                customCount: extension?.items.length || 0,
                totalCount: this.get(category).length,
                mode: this.getMode(category),
                weights: this.getWeights(category),
                registeredAt: extension?.registeredAt
            };
        }

        // Return info for all categories
        const allInfo: Record<string, any> = {};
        for (const cat of this.defaultData.keys()) {
            allInfo[cat] = this.getInfo(cat as ExtensionCategory);
        }
        return allInfo;
    }

    /**
     * Export all custom data (for debugging/saving)
     * @returns Object with all custom extensions
     */
    exportCustomData(): Record<string, any> {
        const exported: Record<string, any> = {};

        for (const [category, data] of this.extensions.entries()) {
            exported[category] = {
                items: data.items,
                options: data.options,
                registeredAt: data.registeredAt
            };
        }

        // Also export custom weights
        const weightData: Record<string, any> = {};
        for (const [category, weights] of this.customWeights.entries()) {
            weightData[category] = weights;
        }

        return {
            extensions: exported,
            weights: weightData
        };
    }

    /**
     * Export custom data for a single category
     * @param category - The category to export
     * @returns Array of custom items, or empty array if no custom data
     */
    exportCustomDataForCategory(category: ExtensionCategory): any[] {
        const extension = this.extensions.get(category);
        return extension ? [...extension.items] : [];
    }

    /**
     * Get all registered categories
     * @returns Array of all categories with default data
     */
    getRegisteredCategories(): ExtensionCategory[] {
        return Array.from(this.defaultData.keys());
    }
}
