/**
 * Initialize default data for ExtensionManager
 *
 * This module provides default data for all extensible categories.
 * The ExtensionManager must be initialized with these defaults before
 * any character generation occurs.
 */

import { ExtensionManager } from './ExtensionManager.js';
import type { ExtensionCategory } from './ExtensionManager.js';
import { SPELL_DATABASE, CLASS_SPELL_LISTS, EQUIPMENT_DATABASE, ALL_RACES, ALL_CLASSES } from '../../utils/constants.js';
import type { Class } from '../types/Character.js';
import { FeatureRegistry } from '../features/FeatureRegistry.js';
import { DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS } from '../features/DefaultFeatures.js';
import type { ClassFeature, RacialTrait } from '../features/FeatureTypes.js';
import { SkillRegistry } from '../skills/SkillRegistry.js';
import { DEFAULT_SKILLS } from '../skills/DefaultSkills.js';
import type { CustomSkill } from '../skills/SkillTypes.js';

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
 * Convert EQUIPMENT_DATABASE to EnhancedEquipment format for ExtensionManager
 * Phase 5.3: Update default initialization to include source field and spawnWeight
 */
const DEFAULT_EQUIPMENT_DATA = Object.values(EQUIPMENT_DATABASE).map(eq => ({
    ...eq,
    source: 'default' as const,
    spawnWeight: (eq as any).spawnWeight ?? 1.0,  // Default to normal spawn rate
    tags: (eq as any).tags ?? []
}));

/**
 * Initialize ExtensionManager with default equipment data
 *
 * This should be called once during application initialization.
 * Phase 5.3: Equipment is converted to EnhancedEquipment format with source field.
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
    ensureSkillDefaultsInitialized();
}

/**
 * Initialize FeatureRegistry with default features and traits
 *
 * This should be called once during application initialization.
 * Phase 13.1: Also initializes ExtensionManager with feature default data for spawn rate management.
 */
export function initializeFeatureDefaults(): void {
    const registry = FeatureRegistry.getInstance();
    const manager = ExtensionManager.getInstance();

    // Initialize FeatureRegistry with default class features and racial traits
    registry.initializeDefaults(DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS);

    // Phase 13.1: Initialize ExtensionManager with default features for spawn rate management
    // Group features by class for ExtensionManager storage
    const featuresByClass: Record<string, ClassFeature[]> = {};
    for (const feature of DEFAULT_CLASS_FEATURES) {
        if (!featuresByClass[feature.class]) {
            featuresByClass[feature.class] = [];
        }
        featuresByClass[feature.class].push(feature);
    }

    // Initialize general classFeatures category with all features
    manager.initializeDefaults('classFeatures', [...DEFAULT_CLASS_FEATURES]);

    // Initialize class-specific feature categories
    for (const [className, features] of Object.entries(featuresByClass)) {
        const category = `classFeatures.${className}` as ExtensionCategory;
        manager.initializeDefaults(category, features);
    }

    // Group traits by race for ExtensionManager storage
    const traitsByRace: Record<string, RacialTrait[]> = {};
    for (const trait of DEFAULT_RACIAL_TRAITS) {
        if (!traitsByRace[trait.race]) {
            traitsByRace[trait.race] = [];
        }
        traitsByRace[trait.race].push(trait);
    }

    // Initialize general racialTraits category with all traits
    manager.initializeDefaults('racialTraits', [...DEFAULT_RACIAL_TRAITS]);

    // Initialize race-specific trait categories
    for (const [raceName, traits] of Object.entries(traitsByRace)) {
        const category = `racialTraits.${raceName}` as ExtensionCategory;
        manager.initializeDefaults(category, traits);
    }
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

/**
 * Initialize SkillRegistry and ExtensionManager with default skills
 *
 * This should be called once during application initialization.
 * Part of Phase 12.4: Update SkillAssigner to use SkillRegistry.
 * Phase 13.1: Also initializes ExtensionManager with skill default data for spawn rate management.
 */
export function initializeSkillDefaults(): void {
    const registry = SkillRegistry.getInstance();
    const manager = ExtensionManager.getInstance();

    // Initialize SkillRegistry with default D&D 5e skills
    registry.initializeDefaults(DEFAULT_SKILLS);

    // Phase 13.1: Initialize ExtensionManager with default skills for spawn rate management
    // Group skills by ability for ExtensionManager storage
    const skillsByAbility: Record<string, CustomSkill[]> = {
        STR: [],
        DEX: [],
        CON: [],
        INT: [],
        WIS: [],
        CHA: []
    };

    for (const skill of DEFAULT_SKILLS) {
        skillsByAbility[skill.ability].push(skill);
    }

    // Initialize general skills category with all skills
    manager.initializeDefaults('skills', [...DEFAULT_SKILLS]);

    // Initialize ability-specific skill categories
    for (const [ability, skills] of Object.entries(skillsByAbility)) {
        const category = `skills.${ability}` as ExtensionCategory;
        manager.initializeDefaults(category, skills);
    }
}

/**
 * Check if skill defaults are initialized
 */
export function areSkillDefaultsInitialized(): boolean {
    const registry = SkillRegistry.getInstance();
    return registry.isInitialized();
}

/**
 * Ensure skill defaults are initialized
 *
 * Initializes defaults if they haven't been already.
 * Safe to call multiple times.
 */
export function ensureSkillDefaultsInitialized(): void {
    if (!areSkillDefaultsInitialized()) {
        initializeSkillDefaults();
    }
}
