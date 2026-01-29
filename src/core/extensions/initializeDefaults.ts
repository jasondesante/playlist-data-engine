/**
 * Initialize default data for ExtensionManager
 *
 * This module provides default data for all extensible categories.
 * The ExtensionManager must be initialized with these defaults before
 * any character generation occurs.
 */

import { ExtensionManager } from './ExtensionManager.js';

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
