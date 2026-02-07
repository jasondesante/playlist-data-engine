/**
 * Equipment Constants Library
 *
 * This file consolidates all equipment-related constants into a single location,
 * providing a single source of truth for equipment data throughout the Playlist Data Engine.
 *
 * Contents:
 * - DEFAULT_EQUIPMENT: Base equipment database with 201 items (weapons, armor, items)
 * - CLASS_STARTING_EQUIPMENT: Starting equipment by class (D&D 5e standard)
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
 * Default Equipment Database
 *
 * Base equipment data with 201 items covering all standard D&D 5e equipment.
 * Includes weapons, armor, gear, adventure packs, ammunition, and special items.
 *
 * Renamed from EQUIPMENT_DATABASE to DEFAULT_EQUIPMENT during consolidation.
 * This is the single source of truth for all base equipment in the engine.
 */
export const DEFAULT_EQUIPMENT: Record<string, Equipment> = {
    // ===== WEAPONS =====

    // Martial Melee Weapons
    'Greataxe': {
        name: 'Greataxe',
        type: 'weapon',
        rarity: 'common',
        weight: 7,
        damage: { dice: '1d12', damageType: 'slashing' },
        weaponProperties: ['two-handed'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'two-handed']
    },
    'Longsword': {
        name: 'Longsword',
        type: 'weapon',
        rarity: 'common',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['versatile'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'versatile']
    },
    'Shortsword': {
        name: 'Shortsword',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'piercing', versatile: '1d8' },
        weaponProperties: ['finesse', 'light', 'versatile'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'finesse', 'light']
    },
    'Rapier': {
        name: 'Rapier',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['finesse'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'finesse']
    },
    'Quarterstaff': {
        name: 'Quarterstaff',
        type: 'weapon',
        rarity: 'common',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile', 'two-handed'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'versatile']
    },
    'Mace': {
        name: 'Mace',
        type: 'weapon',
        rarity: 'common',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'versatile']
    },
    'Handaxe': {
        name: 'Handaxe',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'slashing' },
        weaponProperties: ['light', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'thrown', 'light']
    },
    'Dagger': {
        name: 'Dagger',
        type: 'weapon',
        rarity: 'common',
        weight: 1,
        damage: { dice: '1d4', damageType: 'piercing', versatile: '1d6' },
        weaponProperties: ['finesse', 'light', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'finesse', 'light', 'thrown']
    },
    'Dart': {
        name: 'Dart',
        type: 'weapon',
        rarity: 'common',
        weight: 0.25,
        damage: { dice: '1d4', damageType: 'piercing' },
        weaponProperties: ['finesse', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'ranged', 'thrown', 'finesse']
    },
    'Javelin': {
        name: 'Javelin',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['thrown', 'range_30_120'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'thrown']
    },
    'Light Crossbow': {
        name: 'Light Crossbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 5,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_80_320', 'two-handed', 'loading'],
        spawnWeight: 1.0,
        tags: ['simple', 'ranged', 'two-handed', 'ammunition']
    },
    'Hand Crossbow': {
        name: 'Hand Crossbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 3,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_30_120', 'light', 'loading'],
        spawnWeight: 1.0,
        tags: ['martial', 'ranged', 'light', 'ammunition']
    },
    'Longbow': {
        name: 'Longbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 2,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_150_600', 'two-handed', 'heavy'],
        spawnWeight: 1.0,
        tags: ['martial', 'ranged', 'two-handed', 'ammunition', 'heavy']
    },
    'Martial Melee Weapon': {
        name: 'Martial Melee Weapon',
        type: 'weapon',
        rarity: 'common',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing' },
        weaponProperties: ['versatile'],
        spawnWeight: 0.5,  // Less common (generic weapon)
        tags: ['martial', 'melee', 'versatile', 'generic']
    },

    // ===== ARMOR =====

    'No Armor': {
        name: 'No Armor',
        type: 'armor',
        rarity: 'common',
        weight: 0,
        acBonus: 10,  // Base AC from DEX alone
        spawnWeight: 1.0,
        tags: ['armor', 'light', 'no_armor']
    },
    'Leather Armor': {
        name: 'Leather Armor',
        type: 'armor',
        rarity: 'common',
        weight: 10,
        acBonus: 11,  // 11 + DEX (no max)
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 11, description: 'Base AC: 11 + DEX' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'light']
    },
    'Scale Mail': {
        name: 'Scale Mail',
        type: 'armor',
        rarity: 'common',
        weight: 45,
        acBonus: 14,  // 14 + DEX (max 2)
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 14, description: 'Base AC: 14 + DEX (max 2)' },
            { type: 'special_property', target: 'stealth_disadvantage', value: true, description: 'Stealth disadvantage' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'medium']
    },
    'Chain Mail': {
        name: 'Chain Mail',
        type: 'armor',
        rarity: 'common',
        weight: 55,
        acBonus: 16,  // Fixed AC, no DEX
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 16, description: 'Fixed AC: 16' },
            { type: 'special_property', target: 'stealth_disadvantage', value: true, description: 'Stealth disadvantage' },
            { type: 'stat_requirement', target: 'STR', value: 13, description: 'Requires STR 13' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'heavy']
    },
    'Plate Armor': {
        name: 'Plate Armor',
        type: 'armor',
        rarity: 'rare',
        weight: 65,
        acBonus: 18,  // Fixed AC, no DEX
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 18, description: 'Fixed AC: 18' },
            { type: 'special_property', target: 'stealth_disadvantage', value: true, description: 'Stealth disadvantage' },
            { type: 'stat_requirement', target: 'STR', value: 15, description: 'Requires STR 15' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'heavy', 'rare']
    },
    'Shield': {
        name: 'Shield',
        type: 'armor',
        rarity: 'common',
        weight: 6,
        acBonus: 2,
        properties: [
            { type: 'passive_modifier', target: 'ac', value: 2, description: '+2 AC bonus' }
        ],
        spawnWeight: 1.0,
        tags: ['armor', 'shield']
    },

    // ===== ITEMS & GEAR =====

    'Spellbook': {
        name: 'Spellbook',
        type: 'item',
        rarity: 'uncommon',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'arcane', 'spellbook']
    },
    'Holy Symbol': {
        name: 'Holy Symbol',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'divine', 'focus']
    },
    'Arcane Focus': {
        name: 'Arcane Focus',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'arcane', 'focus']
    },
    'Druidic Focus': {
        name: 'Druidic Focus',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'druid', 'focus']
    },
    'Component Pouch': {
        name: 'Component Pouch',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'components']
    },
    'Lute': {
        name: 'Lute',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'instrument', 'bard']
    },
    'Thieves\' Tools': {
        name: 'Thieves\' Tools',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        grantsSkills: [{ skillId: 'thieves_tools', level: 'proficient' }],
        spawnWeight: 1.0,
        tags: ['gear', 'tools', 'dexterity']
    },
    'Healer\'s Kit': {
        name: 'Healer\'s Kit',
        type: 'item',
        rarity: 'common',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'healing', 'consumable']
    },
    'Bedroll': {
        name: 'Bedroll',
        type: 'item',
        rarity: 'common',
        weight: 10,
        spawnWeight: 1.0,
        tags: ['gear', 'camp', 'comfort']
    },
    'Rope': {
        name: 'Rope',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'utility', 'climbing']
    },
    'Backpack': {
        name: 'Backpack',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'container', 'storage']
    },
    'Torch': {
        name: 'Torch',
        type: 'item',
        rarity: 'common',
        weight: 1,
        properties: [
            { type: 'special_property', target: 'light', value: 'bright_light_20ft', description: 'Sheds bright light 20ft, dim 20ft' }
        ],
        spawnWeight: 1.0,
        tags: ['gear', 'light', 'consumable']
    },
    'Waterskin': {
        name: 'Waterskin',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'container', 'water']
    },
    'Ink & Quill': {
        name: 'Ink & Quill',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'writing', 'consumable']
    },

    // ===== ADVENTURE PACKS =====

    'Burglar\'s Pack': {
        name: 'Burglar\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 44,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'rogue']
    },
    'Explorer\'s Pack': {
        name: 'Explorer\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 59,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'general']
    },
    'Entertainer\'s Pack': {
        name: 'Entertainer\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 58,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'bard']
    },
    'Priest\'s Pack': {
        name: 'Priest\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 33,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'cleric']
    },
    'Dungeon Delver\'s Pack': {
        name: 'Dungeon Delver\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 48,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'dungeon']
    },
    'Dungeoneer\'s Pack': {
        name: 'Dungeoneer\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 48,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'dungeon']
    },
    'Scholar\'s Pack': {
        name: 'Scholar\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 49,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'wizard']
    },
    'Traveler\'s Pack': {
        name: 'Traveler\'s Pack',
        type: 'item',
        rarity: 'common',
        weight: 64,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'general']
    },

    // ===== AMMUNITION =====

    'Arrow': {
        name: 'Arrow',
        type: 'item',
        rarity: 'common',
        weight: 0.05,
        spawnWeight: 1.0,
        tags: ['ammunition', 'bow']
    },
    'Bolt': {
        name: 'Bolt',
        type: 'item',
        rarity: 'common',
        weight: 0.075,
        spawnWeight: 1.0,
        tags: ['ammunition', 'crossbow']
    },

    // ===== SPECIAL ITEMS =====

    'Insignia': {
        name: 'Insignia',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'roleplay', 'insignia']
    },
    'Martial Arts': {
        name: 'Martial Arts',
        type: 'weapon',
        rarity: 'common',
        weight: 0,
        damage: { dice: '1d4', damageType: 'bludgeoning', versatile: '1d6' },
        weaponProperties: ['finesse', 'unarmed'],
        spawnWeight: 1.0,
        tags: ['monk', 'unarmed', 'natural']
    },
};

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
