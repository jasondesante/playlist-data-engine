/**
 * Extensions module - Runtime customization system
 *
 * Provides extensibility for all procedural generation lists.
 */

export { ExtensionManager } from './ExtensionManager.js';
export type { ExtensionCategory, ExtensionOptions, ValidationResult } from './ExtensionManager.js';

export { WeightedSelector } from './WeightedSelector.js';
export type { SelectionMode } from './WeightedSelector.js';

export { initializeAppearanceDefaults, areAppearanceDefaultsInitialized, ensureAppearanceDefaultsInitialized } from './initializeDefaults.js';
