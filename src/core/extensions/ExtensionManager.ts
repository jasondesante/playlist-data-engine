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
import { DEFAULT_CLASSES, DEFAULT_RACES } from '../types/Character.js';
import { FeatureValidator, type ValidationOptions } from '../features/FeatureValidator.js';
import { SkillValidator } from '../skills/SkillValidator.js';
import { SpellValidator } from '../spells/SpellValidator.js';
import { EquipmentValidator } from '../equipment/EquipmentValidator.js';
import { SpellQuery } from '../spells/SpellQuery.js';
import { SkillQuery } from '../skills/SkillQuery.js';
import { FeatureQuery } from '../features/FeatureQuery.js';
import { validateImageFields, isValidImageUrl } from '../utils/ImageValidator.js';

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
    // Equipment System
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
    // Class Features
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
    // Racial Traits
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
    | `racialTraits.${string}` // For custom race racial traits
    // Skills
    | 'skills'
    | 'skills.STR'
    | 'skills.DEX'
    | 'skills.CON'
    | 'skills.INT'
    | 'skills.WIS'
    | 'skills.CHA'
    // Skill Lists
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
    // Class Spell Lists
    | 'classSpellLists'
    | `classSpellLists.${string}`
    // Class Spell Slots
    | 'classSpellSlots'
    // Class Starting Equipment
    | 'classStartingEquipment'
    | `classStartingEquipment.${string}`;

/**
 * Categories that support icon and image fields
 * These entity types have optional icon and image URL properties
 */
export type ImageSupportedCategory =
    | 'spells'
    | 'skills'
    | 'classFeatures'
    | 'racialTraits'
    | 'equipment'
    | 'races.data'
    | 'classes.data';

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
        // Invalidate cache so fresh data is picked up
        this.invalidateRegistryCache(category);
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

        // Special validation for spell lists (spells.${ClassName})
        // Validates that all spell IDs exist in the spells registry
        // Note: items can be either string[] (old format) or ClassSpellListData[] (new format)
        if (category.startsWith('spells.') && category !== 'spells') {
            const allSpells = this.get('spells');
            const spellIdSet = new Set(allSpells.map((s: any) => s.id));
            const invalidIds: string[] = [];

            // Check if items are ClassSpellListData objects (have spells_by_level property)
            const isClassSpellListData = items.length > 0 && items[0] && typeof items[0] === 'object' && 'spells_by_level' in items[0];

            if (isClassSpellListData) {
                // Validate spell IDs inside each ClassSpellListData object
                for (const spellList of items) {
                    const list = spellList as any;
                    // Validate cantrips
                    if (list.cantrips && Array.isArray(list.cantrips)) {
                        for (const cantripId of list.cantrips) {
                            if (!spellIdSet.has(cantripId)) {
                                invalidIds.push(cantripId);
                            }
                        }
                    }
                    // Validate spells_by_level
                    if (list.spells_by_level) {
                        for (const spells of Object.values(list.spells_by_level)) {
                            if (Array.isArray(spells)) {
                                for (const spellId of spells) {
                                    if (!spellIdSet.has(spellId)) {
                                        invalidIds.push(spellId);
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Old format: string array of spell IDs
                const spellIds = items as string[];
                for (const spellId of spellIds) {
                    if (!spellIdSet.has(spellId)) {
                        invalidIds.push(spellId);
                    }
                }
            }

            if (invalidIds.length > 0) {
                throw new Error(
                    `Invalid spell IDs for ${category}: ${invalidIds.join(', ')}`
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

        // Automatically invalidate the appropriate registry cache
        // This ensures query methods return fresh data after registration
        this.invalidateRegistryCache(category);
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
     * @returns Combined default and custom weights (all items have weights)
     */
    getWeights(category: ExtensionCategory): Record<string, number> {
        const defaults = this.getDefaultWeights(category);
        const custom = this.customWeights.get(category) || {};

        // Also include default weights for custom items that don't have explicit weights
        const customItems = this.getCustom(category);
        const customItemDefaultWeights: Record<string, number> = {};

        for (const item of customItems) {
            const name = typeof item === 'string' ? item : item.name;
            // Use 'in' operator to check for key existence (handles weight 0 correctly)
            if (name && !(name in defaults) && !(name in custom)) {
                customItemDefaultWeights[name] = 1.0;
            }
        }

        return { ...defaults, ...customItemDefaultWeights, ...custom };
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
            // Use EquipmentValidator for comprehensive equipment validation
            const result = EquipmentValidator.validateEquipment(item);
            if (!result.valid) {
                errors.push(...(result.errors || []).map(e => `${prefix} ${e}`));
            }
        } else if (category === 'spells' || category.startsWith('spells.')) {
            // Spells validation - use SpellValidator
            // Special case: spells.${ClassName} categories contain ClassSpellListData objects, not Spell objects
            // Skip validation for ClassSpellListData objects (they have spells_by_level property)
            const isClassSpellListData = item && typeof item === 'object' && 'spells_by_level' in item;
            if (!isClassSpellListData) {
                const result = SpellValidator.validateSpell(item);
                if (!result.valid) {
                    errors.push(...result.errors.map(e => `${prefix} ${e}`));
                }
            }
            // For ClassSpellListData objects, validation is handled separately in register() method
        } else if (category === 'races') {
            // Races must be a valid Race type OR a registered custom race
            const validRaces: readonly Race[] = DEFAULT_RACES;

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
            // Validate icon and image fields
            const imageErrors = validateImageFields({ icon: item.icon, image: item.image });
            errors.push(...imageErrors.map(e => `${prefix} Race ${e}`));
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
            if (item.baseClass !== undefined) {
                if (typeof item.baseClass !== 'string') {
                    errors.push(`${prefix} Class 'baseClass' must be a string (if provided)`);
                } else {
                    // Validate that baseClass is either a default class or a registered custom class
                    const isDefaultClass = DEFAULT_CLASSES.includes(item.baseClass as Class);

                    // Check if it's a registered custom class (has data in classes.data)
                    const classDataList = this.get('classes.data') as Array<{ name: string }> | undefined;
                    const isRegisteredCustomClass = classDataList?.some(d => d.name === item.baseClass);

                    if (!isDefaultClass && !isRegisteredCustomClass) {
                        errors.push(`${prefix} Class 'baseClass' must be a valid default class (one of: ${DEFAULT_CLASSES.join(', ')}) or a registered custom class`);
                    }
                }
            }
            // Optional audio_preferences
            if (item.audio_preferences !== undefined && typeof item.audio_preferences !== 'object') {
                errors.push(`${prefix} Class 'audio_preferences' must be an object (if provided)`);
            }
            // Validate icon and image fields
            const imageErrors = validateImageFields({ icon: item.icon, image: item.image });
            errors.push(...imageErrors.map(e => `${prefix} Class ${e}`));
        } else if (category.startsWith('appearance.')) {
            // Appearance items must be strings
            if (typeof item !== 'string') {
                errors.push(`${prefix} Appearance options must be strings`);
            }
        }
        // Class Features validation - use FeatureValidator
        else if (category === 'classFeatures' || category.startsWith('classFeatures.')) {
            // Get custom classes for validation
            const customClasses = (this.get('classes') as string[] | undefined) ?? [];
            const result = FeatureValidator.validateClassFeature(item, { customClasses });
            if (!result.valid) {
                errors.push(...result.errors.map(e => `${prefix} ${e}`));
            }
        }
        // Racial Traits validation - use FeatureValidator
        else if (category === 'racialTraits' || category.startsWith('racialTraits.')) {
            // Get custom races for validation
            const customRaces = (this.get('races') as string[] | undefined) ?? [];
            // Also get races from races.data category
            const customRaceData = this.get('races.data' as ExtensionCategory) as Array<{ race: string }> | undefined;
            const customRaceNames = customRaceData?.map(d => d.race).filter(Boolean) ?? [];
            // Combine both sources of custom races
            const allCustomRaces = [...customRaces, ...customRaceNames];
            const result = FeatureValidator.validateRacialTrait(item, { customRaces: allCustomRaces });
            if (!result.valid) {
                errors.push(...result.errors.map(e => `${prefix} ${e}`));
            }
        }
        // Skills validation - use SkillValidator
        else if (category === 'skills' || category.startsWith('skills.')) {
            const result = SkillValidator.validateSkill(item);
            if (!result.valid) {
                errors.push(...result.errors.map(e => `${prefix} ${e}`));
            }
        }
        // Skill Lists validation
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

        // Automatically invalidate the appropriate registry cache
        this.invalidateRegistryCache(category);
    }

    /**
     * Reset all categories to defaults
     */
    resetAll(): void {
        this.extensions.clear();
        this.customWeights.clear();

        // Invalidate all registry caches to ensure fresh data
        SpellQuery.getInstance().invalidateCache();
        SkillQuery.getInstance().invalidateCache();
        FeatureQuery.getInstance().invalidateCache();
    }

    /**
     * Get the registry type for a given category
     *
     * Maps extension categories to their corresponding registries for automatic cache invalidation.
     *
     * @param category - The extension category
     * @returns Registry type ('spell', 'skill', 'feature') or null if no registry caching
     * @private
     */
    private getRegistryForCategory(category: ExtensionCategory): 'spell' | 'skill' | 'feature' | null {
        // Spells and class spell lists map to SpellQuery
        if (category === 'spells' || category.startsWith('spells.') || category === 'classSpellLists' || category.startsWith('classSpellLists.')) {
            return 'spell';
        }

        // Skills and skill lists map to SkillQuery
        if (category === 'skills' || category.startsWith('skills.') || category === 'skillLists' || category.startsWith('skillLists.')) {
            return 'skill';
        }

        // Class features and racial traits map to FeatureQuery
        if (category === 'classFeatures' || category.startsWith('classFeatures.') || category === 'racialTraits' || category.startsWith('racialTraits.')) {
            return 'feature';
        }

        // All other categories don't have registry caching
        return null;
    }

    /**
     * Invalidate the appropriate registry cache for a category
     *
     * Automatically invalidates the registry cache based on the category being registered.
     * This ensures that query methods return fresh data after registration.
     *
     * @param category - The extension category to invalidate cache for
     * @private
     */
    private invalidateRegistryCache(category: ExtensionCategory): void {
        const registryType = this.getRegistryForCategory(category);

        if (registryType === 'spell') {
            SpellQuery.getInstance().invalidateCache();
        } else if (registryType === 'skill') {
            SkillQuery.getInstance().invalidateCache();
        } else if (registryType === 'feature') {
            FeatureQuery.getInstance().invalidateCache();
        }
        // If registryType is null, no cache invalidation is needed
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

    /**
     * Get all data from categories matching a prefix pattern
     *
     * Aggregates data from all categories that start with the given prefix.
     * Useful for getting all items from race-specific or class-specific categories.
     *
     * For example, prefix 'racialTraits' will match:
     * - 'racialTraits' (general category)
     * - 'racialTraits.Elf' (race-specific category)
     * - 'racialTraits.Dragonkin' (custom race-specific category)
     *
     * @param prefix - Category prefix to match (e.g., 'racialTraits', 'classFeatures')
     * @returns Array of all items from matching categories
     */
    getAllFromPrefix(prefix: string): any[] {
        const allItems: any[] = [];
        const seenIds = new Set<string>();

        // Helper to add items while avoiding duplicates (by id if present)
        const addItems = (items: any[]) => {
            for (const item of items) {
                const itemId = item.id || JSON.stringify(item);
                if (!seenIds.has(itemId)) {
                    seenIds.add(itemId);
                    allItems.push(item);
                }
            }
        };

        // Collect all unique categories that match the prefix
        const matchingCategories = new Set<string>();

        for (const category of this.defaultData.keys()) {
            if (category === prefix || category.startsWith(prefix + '.')) {
                matchingCategories.add(category);
            }
        }

        for (const category of this.extensions.keys()) {
            if (category === prefix || category.startsWith(prefix + '.')) {
                matchingCategories.add(category);
            }
        }

        // Get items from each matching category (this properly merges defaults + extensions)
        for (const category of matchingCategories) {
            addItems(this.get(category as ExtensionCategory));
        }

        return allItems;
    }

    // ============================================================
    // BATCH IMAGE METHODS
    // ============================================================

    /**
     * Batch add icons to items in a category
     *
     * Updates the `icon` field for multiple items identified by name or custom key.
     * Validates all URLs before applying any changes.
     *
     * @param category - The category to update (must support image fields)
     * @param iconMap - Map of item identifier to icon URL
     * @param identifierKey - Property to match items by (default: 'name' or 'id' for spells)
     * @returns Number of items updated
     * @throws Error if any URL is invalid or category doesn't support images
     *
     * @example
     * // Add icons to specific spells
     * manager.batchAddIcons('spells', {
     *     'fireball': '/assets/spells/fireball.png',
     *     'magic_missile': '/assets/spells/magic-missile.png'
     * });
     *
     * // Add icons to equipment
     * manager.batchAddIcons('equipment', {
     *     'Longsword': '/assets/equipment/longsword.png'
     * });
     */
    batchAddIcons(
        category: ImageSupportedCategory,
        iconMap: Record<string, string>,
        identifierKey?: string
    ): number {
        // Determine the identifier key based on category
        const idKey = identifierKey ?? this.getDefaultIdentifierKey(category);

        // Validate all URLs first using private helper
        const validations: Array<[string, string]> = Object.entries(iconMap).map(
            ([identifier, url]) => [url, identifier]
        );
        const errors = this.validateImageFields(validations);
        if (errors.length > 0) {
            throw new Error(
                `Invalid icon URLs for category '${category}':\n${errors.map(e => `  - ${e}`).join('\n')}`
            );
        }

        // Get current items and update icons
        const items = this.get(category);
        const updatedItems: any[] = [];
        let updateCount = 0;

        for (const item of items) {
            const identifier = item[idKey];
            const iconUrl = iconMap[identifier];

            if (iconUrl) {
                // Create a copy with updated icon
                updatedItems.push({ ...item, icon: iconUrl });
                updateCount++;
            } else {
                // Keep original item
                updatedItems.push(item);
            }
        }

        // Store updated items in extensions
        this.extensions.set(category, {
            items: updatedItems,
            options: { mode: 'replace' },
            registeredAt: Date.now()
        });

        // Invalidate cache
        this.invalidateRegistryCache(category);

        return updateCount;
    }

    /**
     * Batch add images to items in a category by identifier
     *
     * Adds or updates the `image` field on items that match the provided identifiers.
     * All items not in the imageMap are preserved unchanged.
     *
     * @param category - The category to update (must support images)
     * @param imageMap - Object mapping item identifiers to image URLs
     * @param identifierKey - Optional property to use as identifier (defaults to 'id' for spells, 'name' for others)
     * @returns Number of items updated
     * @throws Error if any image URL is invalid
     *
     * @example
     * // Add images to specific spells
     * manager.batchAddImages('spells', {
     *     'fireball': '/assets/spells/fireball-full.png',
     *     'magic_missile': '/assets/spells/magic-missile-full.png'
     * });
     *
     * // Add images to equipment
     * manager.batchAddImages('equipment', {
     *     'Longsword': '/assets/equipment/longsword-full.png'
     * });
     */
    batchAddImages(
        category: ImageSupportedCategory,
        imageMap: Record<string, string>,
        identifierKey?: string
    ): number {
        // Determine the identifier key based on category
        const idKey = identifierKey ?? this.getDefaultIdentifierKey(category);

        // Validate all URLs first using private helper
        const validations: Array<[string, string]> = Object.entries(imageMap).map(
            ([identifier, url]) => [url, identifier]
        );
        const errors = this.validateImageFields(validations);
        if (errors.length > 0) {
            throw new Error(
                `Invalid image URLs for category '${category}':\n${errors.map(e => `  - ${e}`).join('\n')}`
            );
        }

        // Get current items and update images
        const items = this.get(category);
        const updatedItems: any[] = [];
        let updateCount = 0;

        for (const item of items) {
            const identifier = item[idKey];
            const imageUrl = imageMap[identifier];

            if (imageUrl) {
                // Create a copy with updated image
                updatedItems.push({ ...item, image: imageUrl });
                updateCount++;
            } else {
                // Keep original item
                updatedItems.push(item);
            }
        }

        // Store updated items in extensions
        this.extensions.set(category, {
            items: updatedItems,
            options: { mode: 'replace' },
            registeredAt: Date.now()
        });

        // Invalidate cache
        this.invalidateRegistryCache(category);

        return updateCount;
    }

    /**
     * Batch update icons and/or images for items matching a predicate
     *
     * Updates all items in a category that match the given predicate function
     * with the specified icon and/or image URLs. Useful for bulk operations
     * based on item properties (e.g., all cantrips, all rare equipment).
     *
     * @param category - The category to update (must support images)
     * @param predicate - Function that returns true for items to update
     * @param updates - Object containing icon and/or image URLs to apply
     * @returns Number of items updated
     * @throws Error if any URL is invalid
     *
     * @example
     * // Add same icon to all cantrips
     * manager.batchUpdateImages('spells',
     *     spell => spell.level === 0,
     *     { icon: '/assets/spells/cantrip-icon.png' }
     * );
     *
     * // Add images to all rare equipment
     * manager.batchUpdateImages('equipment',
     *     item => item.rarity === 'rare',
     *     { icon: '/assets/icons/rare.png', image: '/assets/images/rare-bg.png' }
     * );
     *
     * // Update all evocation spells
     * manager.batchUpdateImages('spells',
     *     spell => spell.school === 'Evocation',
     *     { icon: '/assets/icons/fire.png' }
     * );
     */
    batchUpdateImages<T = any>(
        category: ImageSupportedCategory,
        predicate: (item: T) => boolean,
        updates: { icon?: string; image?: string }
    ): number {
        // Validate URLs if provided using private helper
        const validations: Array<[string, string]> = [];
        if (updates.icon !== undefined) {
            validations.push([updates.icon, 'icon']);
        }
        if (updates.image !== undefined) {
            validations.push([updates.image, 'image']);
        }
        const errors = this.validateImageFields(validations);
        if (errors.length > 0) {
            throw new Error(
                `Invalid URLs in updates:\n${errors.map(e => `  - ${e}`).join('\n')}`
            );
        }

        // Get current items and update matching items
        const items = this.get(category);
        const updatedItems: any[] = [];
        let updateCount = 0;

        for (const item of items) {
            if (predicate(item as T)) {
                // Create a copy with updated image fields
                const updatedItem = { ...item };
                if (updates.icon !== undefined) {
                    updatedItem.icon = updates.icon;
                }
                if (updates.image !== undefined) {
                    updatedItem.image = updates.image;
                }
                updatedItems.push(updatedItem);
                updateCount++;
            } else {
                // Keep original item
                updatedItems.push(item);
            }
        }

        // Store updated items in extensions
        this.extensions.set(category, {
            items: updatedItems,
            options: { mode: 'replace' },
            registeredAt: Date.now()
        });

        // Invalidate cache
        this.invalidateRegistryCache(category);

        return updateCount;
    }

    /**
     * Batch update icons/images for items based on a property value mapping
     *
     * Updates items in a category where the specified property matches a key in the valueMap.
     * Useful for bulk operations based on categories like spell school, equipment rarity, etc.
     *
     * @param category - The category to update (must support images)
     * @param property - The property name to match against (e.g., 'school', 'rarity')
     * @param valueMap - Map of property values to icon/image URLs. Values can be:
     *                   - A string URL (will be applied as the icon)
     *                   - An object with icon and/or image properties
     * @returns Number of items updated
     * @throws Error if any URL is invalid
     *
     * @example
     * // Add icons by spell school
     * manager.batchByCategory('spells', 'school', {
     *     'Evocation': '/assets/icons/fire.png',
     *     'Necromancy': '/assets/icons/skull.png',
     *     'Abjuration': '/assets/icons/shield.png'
     * });
     *
     * // Add icons by equipment rarity
     * manager.batchByCategory('equipment', 'rarity', {
     *     'legendary': '/assets/icons/star-gold.png',
     *     'very_rare': '/assets/icons/star-purple.png',
     *     'rare': '/assets/icons/star-blue.png'
     * });
     *
     * // Add both icon and image by rarity
     * manager.batchByCategory('equipment', 'rarity', {
     *     'legendary': { icon: '/assets/icons/legendary.png', image: '/assets/images/legendary-bg.png' }
     * });
     */
    batchByCategory<T = any>(
        category: ImageSupportedCategory,
        property: keyof T,
        valueMap: Record<string, string | { icon?: string; image?: string }>
    ): number {
        // Validate all URLs first using private helper
        const validations: Array<[string, string]> = [];
        for (const [propertyValue, updates] of Object.entries(valueMap)) {
            if (typeof updates === 'string') {
                validations.push([updates, propertyValue]);
            } else {
                if (updates.icon !== undefined) {
                    validations.push([updates.icon, `${propertyValue}.icon`]);
                }
                if (updates.image !== undefined) {
                    validations.push([updates.image, `${propertyValue}.image`]);
                }
            }
        }
        const errors = this.validateImageFields(validations);
        if (errors.length > 0) {
            throw new Error(
                `Invalid URLs in valueMap for category '${category}':\n${errors.map(e => `  - ${e}`).join('\n')}`
            );
        }

        // Get current items and update matching items
        const items = this.get(category);
        const updatedItems: any[] = [];
        let updateCount = 0;

        for (const item of items) {
            const propertyValue = String(item[property as string] ?? '');
            const updates = valueMap[propertyValue];

            if (updates !== undefined) {
                // Create a copy with updated image fields
                const updatedItem = { ...item };
                if (typeof updates === 'string') {
                    // String is applied as icon
                    updatedItem.icon = updates;
                } else {
                    // Object can have both icon and image
                    if (updates.icon !== undefined) {
                        updatedItem.icon = updates.icon;
                    }
                    if (updates.image !== undefined) {
                        updatedItem.image = updates.image;
                    }
                }
                updatedItems.push(updatedItem);
                updateCount++;
            } else {
                // Keep original item
                updatedItems.push(item);
            }
        }

        // Store updated items in extensions
        this.extensions.set(category, {
            items: updatedItems,
            options: { mode: 'replace' },
            registeredAt: Date.now()
        });

        // Invalidate cache
        this.invalidateRegistryCache(category);

        return updateCount;
    }

    /**
     * Get the default identifier key for a category
     *
     * Different categories use different identifier properties:
     * - Spells use 'id' (e.g., 'fireball', 'magic_missile')
     * - Most other categories use 'name'
     *
     * @param category - The category to get the identifier key for
     * @returns The default identifier property name
     * @private
     */
    private getDefaultIdentifierKey(category: ImageSupportedCategory): string {
        // Spells and class spell lists use 'id' as their identifier
        if (category === 'spells' || category.startsWith('spells.')) {
            return 'id';
        }
        // All other categories use 'name'
        return 'name';
    }

    /**
     * Validate an image URL field
     *
     * Checks if a URL is valid for use as an icon or image field.
     * Returns null if valid, or an error message string if invalid.
     *
     * @param url - The URL string to validate
     * @param fieldName - Descriptive name for error messages (e.g., 'icon', 'image', 'Fireball.icon')
     * @returns Error message if invalid, null if valid
     * @private
     */
    private validateImageField(url: string, fieldName: string): string | null {
        if (!isValidImageUrl(url)) {
            return `${fieldName}: ${url} (URLs must start with: http://, https://, /, or assets/)`;
        }
        return null;
    }

    /**
     * Validate multiple image URLs and collect errors
     *
     * Convenience method that validates multiple URLs and returns
     * all validation errors as an array.
     *
     * @param validations - Array of [url, fieldName] tuples to validate
     * @returns Array of error messages (empty if all valid)
     * @private
     */
    private validateImageFields(validations: Array<[url: string, fieldName: string]>): string[] {
        const errors: string[] = [];
        for (const [url, fieldName] of validations) {
            const error = this.validateImageField(url, fieldName);
            if (error !== null) {
                errors.push(error);
            }
        }
        return errors;
    }
}