/**
 * Equipment Constants Library
 *
 * This file consolidates all equipment-related constants into a single location,
 * providing a single source of truth for equipment data throughout the Playlist Data Engine.
 *
 * Contents:
 * - DEFAULT_EQUIPMENT: Base equipment database (re-exported from src/constants/DefaultEquipment.ts)
 * - CLASS_STARTING_EQUIPMENT: Starting equipment by class (D&D 5e standard)
 * - ITEM_CREATION_TEMPLATES: Templates for enchanting base equipment (9 templates)
 * - ENCHANTMENT_LIBRARY: All enchantments and curses organized by category
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

// Import ExtensionManager for custom class equipment lookup
import { ExtensionManager } from '../core/extensions/ExtensionManager.js';

// Import equipment-related types from core types
import type {
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentType,
    EquipmentRarity,
    EquipmentProperty,
    EquipmentPropertyType,
    EquipmentCondition,
    EnhancedEquipment
} from '../core/types/Equipment.js';

// NOTE: DEFAULT_EQUIPMENT has been moved to src/constants/DefaultEquipment.ts
// Please import DEFAULT_EQUIPMENT directly from '../constants/DefaultEquipment.js' instead

// Re-export types for convenience
export type {
    Equipment,
    EquipmentModification,
    EquipmentMiniFeature,
    EquipmentType,
    EquipmentRarity,
    EquipmentProperty,
    EquipmentPropertyType,
    EquipmentCondition,
    EnhancedEquipment
};

// ============================================================================
// DEFAULT_EQUIPMENT
// ============================================================================
// NOTE: DEFAULT_EQUIPMENT has been moved to src/constants/DefaultEquipment.ts
// Please import DEFAULT_EQUIPMENT directly from '../constants/DefaultEquipment.js' instead

// ============================================================================
// CLASS_STARTING_EQUIPMENT
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
        weapons: ['Rapier', 'Dagger', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Lute', 'Entertainer\'s Pack'],
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
        weapons: ['Longsword'],
        armor: ['Chain Mail', 'Shield'],
        items: ['Martial Melee Weapon', 'Bedroll', 'Rope'],
    },
    'Monk': {
        weapons: ['Shortsword', 'Martial Arts'],
        armor: ['No Armor'],
        items: ['Insignia', 'Traveler\'s Pack', 'Dart'],
    },
    'Paladin': {
        weapons: ['Longsword'],
        armor: ['Chain Mail', 'Shield'],
        items: ['Holy Symbol', 'Priest\'s Pack'],
    },
    'Ranger': {
        weapons: ['Longsword', 'Shortsword', 'Longbow', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Explorer\'s Pack'],  // Arrows added programmatically in EquipmentGenerator
    },
    'Rogue': {
        weapons: ['Rapier', 'Hand Crossbow', 'Dagger'],
        armor: ['Leather Armor'],
        items: ['Burglar\'s Pack', 'Thieves\' Tools'],
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
 * The 'classStartingEquipment.${ClassName}' category expects an array of ClassStartingEquipmentData objects,
 * each containing a class name and the equipment (weapons, armor, items).
 *
 * This function is used by EquipmentGenerator during character creation.
 *
 * @param className - The class name to get starting equipment for
 * @returns Object with weapons, armor, and items arrays, or undefined if not found
 *
 * @example
 * // Register custom starting equipment for a "Necromancer" class
 * manager.register('classStartingEquipment.Necromancer', [{
 *     class: 'Necromancer',
 *     weapons: ['Bone Staff', 'Dagger'],
 *     armor: ['No Armor'],
 *     items: ['Arcane Focus', 'Skeleton Key', 'Dark Robes']
 * }]);
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
        const manager = ExtensionManager.getInstance();
        const category = `classStartingEquipment.${className}` as const;
        const customEquipment = manager.get(category as any);

        if (customEquipment && Array.isArray(customEquipment) && customEquipment.length > 0) {
            // Return the first custom starting equipment for this class
            const equipmentData = customEquipment[0] as ClassStartingEquipmentData;
            return {
                weapons: equipmentData.weapons,
                armor: equipmentData.armor,
                items: equipmentData.items
            };
        }
    } catch (error) {
        // ExtensionManager not available (may be during initialization)
        // Return undefined to fall back to default behavior
    }

    return undefined;
}

// ============================================================================
// MAGIC_ITEMS
// ============================================================================
// NOTE: MAGIC_ITEMS has been moved to src/constants/MagicItems.ts
// Please import MAGIC_ITEMS directly from '../constants/MagicItems.js' instead

// ============================================================================
// ITEM_CREATION_TEMPLATES
// ============================================================================
// NOTE: ITEM_CREATION_TEMPLATES has been moved to src/constants/ItemTemplates.ts
// Please import ITEM_CREATION_TEMPLATES directly from '../constants/ItemTemplates.js' instead

// ============================================================================
// ENCHANTMENT_LIBRARY
// ============================================================================
// NOTE: ENCHANTMENT_LIBRARY has been moved to src/constants/DefaultEnchantments.ts
// Please import ENCHANTMENT_LIBRARY directly from '../constants/DefaultEnchantments.js' instead
