/**
 * Equipment Constants Library
 *
 * This file consolidates all equipment-related constants into a single location,
 * providing a single source of truth for equipment data throughout the Playlist Data Engine.
 *
 * Contents:
 * - CLASS_STARTING_EQUIPMENT: Starting equipment by class (D&D 5e standard)
 * - DEFAULT_EQUIPMENT: Base equipment database with 201 items (weapons, armor, items) - TODO: Move from constants.ts
 * - MAGIC_ITEMS: Example magic items demonstrating all equipment system capabilities - TODO: Move from magicItemExamples.ts
 * - ITEM_CREATION_TEMPLATES: Templates for enchanting base equipment - TODO: Move from magicItemExamples.ts
 * - ENCHANTMENT_LIBRARY: All enchantments and curses organized by category - TODO: Move from enchantmentLibrary.ts
 *
 * Access Patterns:
 * - Direct access: Import specific constants (e.g., `DEFAULT_EQUIPMENT`, `CLASS_STARTING_EQUIPMENT`)
 * - Enchantment categories: `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne`
 * - Flat enchantments: `ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS.plusOne`
 * - Helper function: `getClassStartingEquipment('Fighter')` - checks both default and custom
 *
 * @module utils/equipmentConstants
 */

// Import Equipment interface from constants.ts (it's defined there)
import type { Equipment } from './constants.js';

// Import equipment-related types from core types
import type {
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentType,
    EquipmentRarity,
    EquipmentProperty,
    EquipmentPropertyType,
    EquipmentCondition
} from '../core/types/Equipment.js';

// Re-export types for convenience
export type {
    Equipment,
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentType,
    EquipmentRarity,
    EquipmentProperty,
    EquipmentPropertyType,
    EquipmentCondition
};

// ============================================================================
// DEFAULT_EQUIPMENT
// ============================================================================

/**
 * Starting equipment by class - D&D 5e standard
 */
export const CLASS_STARTING_EQUIPMENT: Record<string, {
    weapons: string[];
    armor: string[];
    items: string[];
}> = {
    'Barbarian': {
        weapons: ['Greataxe', 'Handaxe'],
        armor: ['No Armor'],
        items: ['Explorer\'s Pack', 'Javelin'],
    },
    'Bard': {
        weapons: ['Rapier', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Lute', 'Entertainer\'s Pack', 'Dagger'],
    },
    'Cleric': {
        weapons: ['Mace', 'Light Crossbow'],
        armor: ['Scale Mail', 'Shield'],
        items: ['Holy Symbol', 'Priest\'s Pack', 'Healer\'s Kit'],
    },
    'Druid': {
        weapons: ['Quarterstaff', 'Dagger'],
        armor: ['Leather Armor', 'Shield'],
        items: ['Druidic Focus', 'Explorer\'s Pack'],
    },
    'Fighter': {
        weapons: ['Longsword', 'Shield'],
        armor: ['Chain Mail'],
        items: ['Martial Melee Weapon', 'Bedroll', 'Rope'],
    },
    'Monk': {
        weapons: ['Shortsword', 'Martial Arts'],
        armor: ['No Armor'],
        items: ['Insignia', 'Traveler\'s Pack', 'Dart'],
    },
    'Paladin': {
        weapons: ['Longsword', 'Shield'],
        armor: ['Chain Mail'],
        items: ['Holy Symbol', 'Priest\'s Pack'],
    },
    'Ranger': {
        weapons: ['Longsword', 'Shortsword', 'Longbow'],
        armor: ['Leather Armor', 'Dagger'],
        items: ['Explorer\'s Pack'],  // Arrows added programmatically in EquipmentGenerator
    },
    'Rogue': {
        weapons: ['Rapier', 'Hand Crossbow'],
        armor: ['Leather Armor'],
        items: ['Burglar\'s Pack', 'Thieves\' Tools', 'Dagger'],
    },
    'Sorcerer': {
        weapons: ['Light Crossbow', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Arcane Focus', 'Dungeoneer\'s Pack'],
    },
    'Warlock': {
        weapons: ['Light Crossbow', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Arcane Focus', 'Scholar\'s Pack'],
    },
    'Wizard': {
        weapons: ['Quarterstaff', 'Dagger'],
        armor: ['No Armor'],
        items: ['Spellbook', 'Component Pouch', 'Scholar\'s Pack', 'Ink & Quill'],
    },
};

// ============================================================================
// HELPER FUNCTIONS FOR CUSTOM CLASS DATA
// ============================================================================

/**
 * Internal interface for custom class equipment registration
 */
interface ClassStartingEquipmentData {
    class: string;
    weapons: string[];
    armor: string[];
    items: string[];
}

/**
 * Get starting equipment for a class (default or custom)
 *
 * First checks the default CLASS_STARTING_EQUIPMENT constant, then checks
 * the ExtensionManager for custom equipment registered via 'classStartingEquipment.${ClassName}'.
 *
 * This function is used by EquipmentGenerator during character creation.
 *
 * @param className - The class name to get starting equipment for
 * @returns The starting equipment with weapons, armor, and items arrays, or undefined if not found
 */
export function getClassStartingEquipment(className: string): {
    weapons: string[];
    armor: string[];
    items: string[];
} | undefined {
    // Check default classes
    if (className in CLASS_STARTING_EQUIPMENT) {
        return CLASS_STARTING_EQUIPMENT[className];
    }

    // Check ExtensionManager for custom equipment
    try {
        // Use a lazy import pattern to avoid circular dependency issues
        // This requires the ExtensionManager to be initialized before this function is called
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ExtensionManager } = require('../core/extensions/ExtensionManager.js');
        const manager = ExtensionManager.getInstance();
        const category = `classStartingEquipment.${className}` as const;
        const customEquipment = manager.get(category as any);

        if (customEquipment) {
            return customEquipment;
        }
    } catch (error) {
        // ExtensionManager may not be available in all contexts
        // This is expected in some test scenarios
    }

    return undefined;
}
