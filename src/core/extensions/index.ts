/**
 * Extensions module - Runtime customization system
 *
 * Provides extensibility for all procedural generation lists.
 */

export { ExtensionManager } from './ExtensionManager.js';
export type { ExtensionCategory, ExtensionOptions, ValidationResult } from './ExtensionManager.js';

export { WeightedSelector } from './WeightedSelector.js';
export type { SelectionMode } from './WeightedSelector.js';

export {
    initializeAppearanceDefaults,
    areAppearanceDefaultsInitialized,
    ensureAppearanceDefaultsInitialized,
    initializeSpellDefaults,
    areSpellDefaultsInitialized,
    ensureSpellDefaultsInitialized,
    initializeEquipmentDefaults,
    areEquipmentDefaultsInitialized,
    ensureEquipmentDefaultsInitialized,
    initializeRaceDefaults,
    areRaceDefaultsInitialized,
    ensureRaceDefaultsInitialized,
    initializeClassDefaults,
    areClassDefaultsInitialized,
    ensureClassDefaultsInitialized,
    initializeFeatureDefaults,
    areFeatureDefaultsInitialized,
    ensureFeatureDefaultsInitialized,
    initializeSkillDefaults,
    areSkillDefaultsInitialized,
    ensureSkillDefaultsInitialized,
    initializeAllDefaults,
    ensureAllDefaultsInitialized,
} from './initializeDefaults.js';
