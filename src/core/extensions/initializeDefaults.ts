/**
 * Initialize default data for ExtensionManager
 *
 * This module provides default data for all extensible categories.
 * The ExtensionManager must be initialized with these defaults before
 * any character generation occurs.
 */

import { ExtensionManager } from './ExtensionManager.js';
import { SPELL_DATABASE, CLASS_SPELL_LISTS, EQUIPMENT_DATABASE, ALL_RACES, ALL_CLASSES } from '../../utils/constants.js';
import type { Class } from '../types/Character.js';
import { FeatureRegistry } from '../features/FeatureRegistry.js';
import { DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS } from '../features/DefaultFeatures.js';

/**
 * Default appearance data
 */
const DEFAULT_APPEARANCE_DATA = {
    'appearance.bodyTypes': ['slender', 'athletic', 'muscular', 'stocky'] as const,
    'appearance.skinTones': [
        '#F5E6D3', // Fair
        '#E8C4A0', // Light
        '#D4A574', // Medium
        '#C68642', // Tan
        '#8D5524', // Brown
        '#5C3317', // Dark
    ] as const,
    'appearance.hairColors': [
        '#1C1C1C', // Black
        '#3B2414', // Dark Brown
        '#6A4E23', // Brown
        '#A67B5B', // Light Brown
        '#D4AF37', // Blonde
        '#E9C2A6', // Light Blonde
        '#B55239', // Auburn
        '#DC143C', // Red
        '#C0C0C0', // Gray
        '#FFFFFF', // White
    ] as const,
    'appearance.hairStyles': [
        'short',
        'long',
        'bald',
        'braided',
        'curly',
        'wavy',
        'straight',
        'ponytail',
        'mohawk',
        'dreadlocks',
    ] as const,
    'appearance.eyeColors': [
        '#3B2414', // Brown
        '#6F4E37', // Hazel
        '#228B22', // Green
        '#4169E1', // Blue
        '#708090', // Gray
        '#000000', // Black
    ] as const,
    'appearance.facialFeatures': [
        'scar on cheek',
        'tattoo on forehead',
        'piercing',
        'freckles',
        'beard',
        'mustache',
        'clean-shaven',
        'birthmark',
        'sharp jawline',
        'soft features',
    ] as const,
};

/**
 * Initialize ExtensionManager with default appearance data
 *
 * This should be called once during application initialization.
 */
export function initializeAppearanceDefaults(): void {
    const manager = ExtensionManager.getInstance();

    // Initialize each appearance category
    for (const [category, data] of Object.entries(DEFAULT_APPEARANCE_DATA)) {
        manager.initializeDefaults(category as 'appearance.bodyTypes', [...data]);
    }
}

/**
 * Check if appearance defaults are initialized
 */
export function areAppearanceDefaultsInitialized(): boolean {
    const manager = ExtensionManager.getInstance();
    const categories = manager.getRegisteredCategories();

    // Check if at least one appearance category is registered
    return categories.some(cat => String(cat).startsWith('appearance.'));
}

/**
 * Ensure appearance defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureAppearanceDefaultsInitialized(): void {
    if (!areAppearanceDefaultsInitialized()) {
        initializeAppearanceDefaults();
    }
}

/**
 * Default spell data
 * Convert SPELL_DATABASE to array format for ExtensionManager
 */
const DEFAULT_SPELL_DATA = Object.values(SPELL_DATABASE);

/**
 * Default class spell lists data
 * Format: Array of { class: Class, cantrips: string[], spells_by_level: Record<number, string[]> }
 */
const DEFAULT_CLASS_SPELL_LISTS_DATA = Object.entries(CLASS_SPELL_LISTS).map(([className, spellList]) => ({
    class: className as Class,
    cantrips: spellList.cantrips,
    spells_by_level: spellList.spells_by_level,
}));

/**
 * Initialize ExtensionManager with default spell data
 *
 * This should be called once during application initialization.
 */
export function initializeSpellDefaults(): void {
    const manager = ExtensionManager.getInstance();

    // Initialize spells database (all spells)
    manager.initializeDefaults('spells', DEFAULT_SPELL_DATA);

    // Initialize class-specific spell lists
    for (const classSpellData of DEFAULT_CLASS_SPELL_LISTS_DATA) {
        const category = `spells.${classSpellData.class}` as const;
        // Store the full spell list object for this class
        manager.initializeDefaults(category, [classSpellData]);
    }
}

/**
 * Check if spell defaults are initialized
 */
export function areSpellDefaultsInitialized(): boolean {
    const manager = ExtensionManager.getInstance();
    const categories = manager.getRegisteredCategories();

    // Check if spells category is registered
    return categories.some(cat => String(cat).startsWith('spells'));
}

/**
 * Ensure spell defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureSpellDefaultsInitialized(): void {
    if (!areSpellDefaultsInitialized()) {
        initializeSpellDefaults();
    }
}

/**
 * Default equipment data
 * Convert EQUIPMENT_DATABASE to array format for ExtensionManager
 */
const DEFAULT_EQUIPMENT_DATA = Object.values(EQUIPMENT_DATABASE);

/**
 * Initialize ExtensionManager with default equipment data
 *
 * This should be called once during application initialization.
 */
export function initializeEquipmentDefaults(): void {
    const manager = ExtensionManager.getInstance();

    // Initialize equipment database (all equipment)
    manager.initializeDefaults('equipment', DEFAULT_EQUIPMENT_DATA);
}

/**
 * Check if equipment defaults are initialized
 */
export function areEquipmentDefaultsInitialized(): boolean {
    const manager = ExtensionManager.getInstance();
    const categories = manager.getRegisteredCategories();

    // Check if equipment category is registered
    return categories.some(cat => cat === 'equipment');
}

/**
 * Ensure equipment defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureEquipmentDefaultsInitialized(): void {
    if (!areEquipmentDefaultsInitialized()) {
        initializeEquipmentDefaults();
    }
}

/**
 * Initialize ExtensionManager with default race data
 *
 * This should be called once during application initialization.
 */
export function initializeRaceDefaults(): void {
    const manager = ExtensionManager.getInstance();

    // Initialize races with default data
    manager.initializeDefaults('races', [...ALL_RACES]);
}

/**
 * Check if race defaults are initialized
 */
export function areRaceDefaultsInitialized(): boolean {
    const manager = ExtensionManager.getInstance();
    const categories = manager.getRegisteredCategories();

    // Check if races category is registered
    return categories.some(cat => cat === 'races');
}

/**
 * Ensure race defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureRaceDefaultsInitialized(): void {
    if (!areRaceDefaultsInitialized()) {
        initializeRaceDefaults();
    }
}

/**
 * Initialize ExtensionManager with default class data
 *
 * This should be called once during application initialization.
 */
export function initializeClassDefaults(): void {
    const manager = ExtensionManager.getInstance();

    // Initialize classes with default data
    manager.initializeDefaults('classes', [...ALL_CLASSES]);
}

/**
 * Check if class defaults are initialized
 */
export function areClassDefaultsInitialized(): boolean {
    const manager = ExtensionManager.getInstance();
    const categories = manager.getRegisteredCategories();

    // Check if classes category is registered
    return categories.some(cat => cat === 'classes');
}

/**
 * Ensure class defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureClassDefaultsInitialized(): void {
    if (!areClassDefaultsInitialized()) {
        initializeClassDefaults();
    }
}

/**
 * Initialize ALL ExtensionManager defaults at once
 *
 * This is the recommended way to initialize the extensibility system.
 * Call this once during application initialization.
 */
export function initializeAllDefaults(): void {
    initializeAppearanceDefaults();
    initializeSpellDefaults();
    initializeEquipmentDefaults();
    initializeRaceDefaults();
    initializeClassDefaults();
}

/**
 * Ensure ALL ExtensionManager defaults are initialized
 *
 * Initializes any defaults that haven't been initialized yet.
 * Safe to call multiple times.
 */
export function ensureAllDefaultsInitialized(): void {
    ensureAppearanceDefaultsInitialized();
    ensureSpellDefaultsInitialized();
    ensureEquipmentDefaultsInitialized();
    ensureRaceDefaultsInitialized();
    ensureClassDefaultsInitialized();
    ensureFeatureDefaultsInitialized();
}

/**
 * Initialize FeatureRegistry with default features and traits
 *
 * This should be called once during application initialization.
 */
export function initializeFeatureDefaults(): void {
    const registry = FeatureRegistry.getInstance();

    // Initialize with default class features and racial traits
    registry.initializeDefaults(DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS);
}

/**
 * Check if feature defaults are initialized
 */
export function areFeatureDefaultsInitialized(): boolean {
    const registry = FeatureRegistry.getInstance();
    return registry.isInitialized();
}

/**
 * Ensure feature defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureFeatureDefaultsInitialized(): void {
    if (!areFeatureDefaultsInitialized()) {
        initializeFeatureDefaults();
    }
}
