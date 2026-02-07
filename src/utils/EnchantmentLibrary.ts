/**
 * Enchantment Library Class
 *
 * A utility class for accessing enchantments and curses that can be applied to equipment.
 * This class provides static methods for looking up enchantments by ID, retrieving all
 * enchantments of a specific type, and creating stat-boosting enchantments.
 *
 * The actual enchantment data is stored in `ENCHANTMENT_LIBRARY` in equipmentConstants.ts,
 * organized by category:
 * - WEAPON_ENCHANTMENTS: Individual weapon enchantments (+1, flaming, frost, etc.)
 * - ARMOR_ENCHANTMENTS: Individual armor enchantments (+1, +2)
 * - RESISTANCE_ENCHANTMENTS: Individual resistance enchantments (fire, cold, etc.)
 * - COMBO_ENCHANTMENTS: Special multi-effect enchantments (Holy Avenger, Dragon Slayer, etc.)
 * - CURSES: All curses (penalties, stat curses, vulnerabilities, special curses)
 * - ALL_ENCHANTMENTS: Flattened combination of WEAPON + ARMOR + RESISTANCE + COMBO
 *
 * Usage:
 * ```typescript
 * import { EnchantmentLibrary } from './utils/EnchantmentLibrary.js';
 * import { ENCHANTMENT_LIBRARY } from './utils/equipmentConstants.js';
 *
 * // Lookup by ID (searches ALL_ENCHANTMENTS)
 * const plusOne = EnchantmentLibrary.getEnchantment('plus_one');
 * const curse = EnchantmentLibrary.getCurse('berserker');
 *
 * // Get by type
 * const weapons = EnchantmentLibrary.getEnchantmentsByType('weapon');
 *
 * // Get all as arrays
 * const allEnchantments = EnchantmentLibrary.getAllEnchantments();
 * const allCurses = EnchantmentLibrary.getAllCurses();
 *
 * // Create stat-boosting enchantments
 * const strEnchant = EnchantmentLibrary.createStrengthEnchantment(2);
 *
 * // Direct access (import ENCHANTMENT_LIBRARY from equipmentConstants)
 * const direct = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne;
 * ```
 *
 * @module utils/EnchantmentLibrary
 */

import type { EquipmentModification } from '../core/types/Equipment.js';
import { ENCHANTMENT_LIBRARY } from './equipmentConstants.js';

/**
 * Enchantment Library Class
 *
 * Provides static methods for accessing enchantments and curses from the centralized
 * ENCHANTMENT_LIBRARY in equipmentConstants.ts.
 */
export class EnchantmentLibrary {
    // ========================================================================
    // PRIVATE CONSTRUCTOR - Utility class with only static methods
    // ========================================================================

    /**
     * Private constructor to prevent instantiation.
     * This is a utility class with only static methods.
     *
     * @throws {Error} Always - instantiation is not allowed
     */
    private constructor() {
        throw new Error('EnchantmentLibrary is a utility class and cannot be instantiated');
    }

    // ========================================================================
    // LOOKUP METHODS
    // ========================================================================

    /**
     * Get enchantment by ID
     *
     * Searches ALL_ENCHANTMENTS for an enchantment matching the given ID.
     * The ALL_ENCHANTMENTS collection includes WEAPON, ARMOR, RESISTANCE, and COMBO enchantments.
     *
     * @param id - The enchantment ID to look up (e.g., 'plus_one', 'flaming', 'berserker')
     * @returns The enchantment if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const plusOne = EnchantmentLibrary.getEnchantment('plus_one');
     * const flaming = EnchantmentLibrary.getEnchantment('flaming');
     * const holyAvenger = EnchantmentLibrary.getEnchantment('holy_avenger');
     * ```
     */
    static getEnchantment(id: string): EquipmentModification | undefined {
        return Object.values(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS).find(e => e.id === id);
    }

    /**
     * Get curse by ID
     *
     * Searches the CURSES collection for a curse matching the given ID.
     *
     * @param id - The curse ID to look up (e.g., 'minus_one', 'berserker', 'weakness')
     * @returns The curse if found, undefined otherwise
     *
     * @example
     * ```typescript
     * const curse = EnchantmentLibrary.getCurse('berserker');
     * const weakness = EnchantmentLibrary.getCurse('weakness');
     * ```
     */
    static getCurse(id: string): EquipmentModification | undefined {
        return Object.values(ENCHANTMENT_LIBRARY.CURSES).find(c => c.id === id);
    }

    // ========================================================================
    // COLLECTION METHODS
    // ========================================================================

    /**
     * Get all enchantments
     *
     * Returns all enchantments as an array, excluding curses.
     * Includes WEAPON, ARMOR, RESISTANCE, and COMBO enchantments.
     *
     * @returns Array of all enchantments
     *
     * @example
     * ```typescript
     * const allEnchantments = EnchantmentLibrary.getAllEnchantments();
     * console.log(`Total enchantments: ${allEnchantments.length}`);
     * ```
     */
    static getAllEnchantments(): EquipmentModification[] {
        return Object.values(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS);
    }

    /**
     * Get all curses
     *
     * Returns all curses as an array.
     *
     * @returns Array of all curses
     *
     * @example
     * ```typescript
     * const allCurses = EnchantmentLibrary.getAllCurses();
     * console.log(`Total curses: ${allCurses.length}`);
     * ```
     */
    static getAllCurses(): EquipmentModification[] {
        return Object.values(ENCHANTMENT_LIBRARY.CURSES);
    }

    /**
     * Get enchantments by type
     *
     * Returns all enchantments of a specific type as an array.
     *
     * @param type - The type of enchantments to retrieve
     * @returns Array of enchantments of the specified type, or empty array if type is invalid
     *
     * @example
     * ```typescript
     * const weaponEnchantments = EnchantmentLibrary.getEnchantmentsByType('weapon');
     * const armorEnchantments = EnchantmentLibrary.getEnchantmentsByType('armor');
     * const resistanceEnchantments = EnchantmentLibrary.getEnchantmentsByType('resistance');
     * const comboEnchantments = EnchantmentLibrary.getEnchantmentsByType('combo');
     * ```
     */
    static getEnchantmentsByType(type: 'weapon' | 'armor' | 'resistance' | 'combo'): EquipmentModification[] {
        switch (type) {
            case 'weapon':
                return Object.values(ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS);
            case 'armor':
                return Object.values(ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS);
            case 'resistance':
                return Object.values(ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS);
            case 'combo':
                return Object.values(ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS);
            default:
                return [];
        }
    }

    // ========================================================================
    // STAT BOOSTING ENCHANTMENT FACTORY METHODS
    // ========================================================================

    /**
     * Create a Strength boosting enchantment
     *
     * Creates an enchantment that adds a bonus to the Strength ability score.
     *
     * @param bonus - The bonus amount (1-4)
     * @returns A new EquipmentModification for the Strength boost
     *
     * @example
     * ```typescript
     * const strPlus2 = EnchantmentLibrary.createStrengthEnchantment(2);
     * // Returns: { id: 'strength_2', name: 'Strength +2', ... }
     * ```
     */
    static createStrengthEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
        return {
            id: `strength_${bonus}`,
            name: `Strength +${bonus}`,
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'STR',
                    value: bonus,
                    description: `+${bonus} Strength`,
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        };
    }

    /**
     * Create a Dexterity boosting enchantment
     *
     * Creates an enchantment that adds a bonus to the Dexterity ability score.
     *
     * @param bonus - The bonus amount (1-4)
     * @returns A new EquipmentModification for the Dexterity boost
     *
     * @example
     * ```typescript
     * const dexPlus2 = EnchantmentLibrary.createDexterityEnchantment(2);
     * // Returns: { id: 'dexterity_2', name: 'Dexterity +2', ... }
     * ```
     */
    static createDexterityEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
        return {
            id: `dexterity_${bonus}`,
            name: `Dexterity +${bonus}`,
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'DEX',
                    value: bonus,
                    description: `+${bonus} Dexterity`,
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        };
    }

    /**
     * Create a Constitution boosting enchantment
     *
     * Creates an enchantment that adds a bonus to the Constitution ability score.
     *
     * @param bonus - The bonus amount (1-4)
     * @returns A new EquipmentModification for the Constitution boost
     *
     * @example
     * ```typescript
     * const conPlus2 = EnchantmentLibrary.createConstitutionEnchantment(2);
     * // Returns: { id: 'constitution_2', name: 'Constitution +2', ... }
     * ```
     */
    static createConstitutionEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
        return {
            id: `constitution_${bonus}`,
            name: `Constitution +${bonus}`,
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'CON',
                    value: bonus,
                    description: `+${bonus} Constitution`,
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        };
    }

    /**
     * Create an Intelligence boosting enchantment
     *
     * Creates an enchantment that adds a bonus to the Intelligence ability score.
     *
     * @param bonus - The bonus amount (1-4)
     * @returns A new EquipmentModification for the Intelligence boost
     *
     * @example
     * ```typescript
     * const intPlus2 = EnchantmentLibrary.createIntelligenceEnchantment(2);
     * // Returns: { id: 'intelligence_2', name: 'Intelligence +2', ... }
     * ```
     */
    static createIntelligenceEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
        return {
            id: `intelligence_${bonus}`,
            name: `Intelligence +${bonus}`,
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'INT',
                    value: bonus,
                    description: `+${bonus} Intelligence`,
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        };
    }

    /**
     * Create a Wisdom boosting enchantment
     *
     * Creates an enchantment that adds a bonus to the Wisdom ability score.
     *
     * @param bonus - The bonus amount (1-4)
     * @returns A new EquipmentModification for the Wisdom boost
     *
     * @example
     * ```typescript
     * const wisPlus2 = EnchantmentLibrary.createWisdomEnchantment(2);
     * // Returns: { id: 'wisdom_2', name: 'Wisdom +2', ... }
     * ```
     */
    static createWisdomEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
        return {
            id: `wisdom_${bonus}`,
            name: `Wisdom +${bonus}`,
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'WIS',
                    value: bonus,
                    description: `+${bonus} Wisdom`,
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        };
    }

    /**
     * Create a Charisma boosting enchantment
     *
     * Creates an enchantment that adds a bonus to the Charisma ability score.
     *
     * @param bonus - The bonus amount (1-4)
     * @returns A new EquipmentModification for the Charisma boost
     *
     * @example
     * ```typescript
     * const chaPlus2 = EnchantmentLibrary.createCharismaEnchantment(2);
     * // Returns: { id: 'charisma_2', name: 'Charisma +2', ... }
     * ```
     */
    static createCharismaEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
        return {
            id: `charisma_${bonus}`,
            name: `Charisma +${bonus}`,
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'CHA',
                    value: bonus,
                    description: `+${bonus} Charisma`,
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        };
    }
}

// ============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================================================

/**
 * Re-export individual enchantment collections for backward compatibility.
 *
 * These are re-exported from ENCHANTMENT_LIBRARY in equipmentConstants.ts.
 * Direct import from equipmentConstants.ts is recommended for new code.
 */
export const WEAPON_ENCHANTMENTS = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS;
export const ARMOR_ENCHANTMENTS = ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS;
export const RESISTANCE_ENCHANTMENTS = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS;
export const CURSES = ENCHANTMENT_LIBRARY.CURSES;
export const ALL_ENCHANTMENTS = ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS;

/**
 * Re-export utility functions as standalone functions for backward compatibility.
 *
 * New code should use the class methods: `EnchantmentLibrary.getEnchantment(...)`
 * Legacy code can continue using: `getEnchantment(...)`
 */
export const getEnchantment = (id: string) => EnchantmentLibrary.getEnchantment(id);
export const getCurse = (id: string) => EnchantmentLibrary.getCurse(id);
export const getAllEnchantments = () => EnchantmentLibrary.getAllEnchantments();
export const getAllCurses = () => EnchantmentLibrary.getAllCurses();
export const getEnchantmentsByType = (type: 'weapon' | 'armor' | 'resistance' | 'combo') =>
    EnchantmentLibrary.getEnchantmentsByType(type);

/**
 * Re-export stat boosting factory functions for backward compatibility.
 *
 * New code should use the class methods: `EnchantmentLibrary.createStrengthEnchantment(...)`
 * Legacy code can continue using: `createStrengthEnchantment(...)`
 */
export const createStrengthEnchantment = (bonus: 1 | 2 | 3 | 4) =>
    EnchantmentLibrary.createStrengthEnchantment(bonus);
export const createDexterityEnchantment = (bonus: 1 | 2 | 3 | 4) =>
    EnchantmentLibrary.createDexterityEnchantment(bonus);
export const createConstitutionEnchantment = (bonus: 1 | 2 | 3 | 4) =>
    EnchantmentLibrary.createConstitutionEnchantment(bonus);
export const createIntelligenceEnchantment = (bonus: 1 | 2 | 3 | 4) =>
    EnchantmentLibrary.createIntelligenceEnchantment(bonus);
export const createWisdomEnchantment = (bonus: 1 | 2 | 3 | 4) =>
    EnchantmentLibrary.createWisdomEnchantment(bonus);
export const createCharismaEnchantment = (bonus: 1 | 2 | 3 | 4) =>
    EnchantmentLibrary.createCharismaEnchantment(bonus);

export default {
    EnchantmentLibrary,
    WEAPON_ENCHANTMENTS,
    ARMOR_ENCHANTMENTS,
    RESISTANCE_ENCHANTMENTS,
    CURSES,
    ALL_ENCHANTMENTS,
    getEnchantment,
    getCurse,
    getAllEnchantments,
    getAllCurses,
    getEnchantmentsByType,
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment
};
