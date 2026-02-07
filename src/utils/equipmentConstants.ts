/**
 * Equipment Constants Library
 *
 * This file consolidates all equipment-related constants into a single location,
 * providing a single source of truth for equipment data throughout the Playlist Data Engine.
 *
 * Contents:
 * - DEFAULT_EQUIPMENT: Base equipment database with 201 items (weapons, armor, items)
 * - CLASS_STARTING_EQUIPMENT: Starting equipment by class (D&D 5e standard)
 * - MAGIC_ITEMS: Example magic items demonstrating all equipment system capabilities (34 items)
 * - ITEM_CREATION_TEMPLATES: Templates for enchanting base equipment (9 templates)
 * - ENCHANTMENT_LIBRARY: All enchantments and curses organized by category - TODO: Move from enchantmentLibrary.ts
 *
 * Access Patterns:
 * - Direct access: Import specific constants (e.g., `DEFAULT_EQUIPMENT`, `CLASS_STARTING_EQUIPMENT`, `MAGIC_ITEMS`)
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
    EquipmentCondition,
    EnhancedEquipment
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
    EquipmentCondition,
    EnhancedEquipment
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

// ============================================================================
// MAGIC_ITEMS
// ============================================================================

/**
 * Example Magic Items demonstrating all equipment system capabilities
 *
 * This collection demonstrates all capabilities of the Advanced Equipment System:
 * - Equipment properties (stat bonuses, skill proficiencies, ability unlocks, etc.)
 * - Equipment-granted features (registry features and inline mini-features)
 * - Equipment-granted skills and spells
 * - D&D 5e standard stats (damage dice, AC, properties)
 * - Runtime equipment modification (templates + per-instance)
 * - Spawn weight system for generation control
 * - Cursed items with negative effects
 * - Conditional effects
 *
 * These examples can be used as:
 * 1. Reference for creating custom magic items
 * 2. Test fixtures for the equipment system
 * 3. Starting point for ExtensionManager registration
 */
export const MAGIC_ITEMS: EnhancedEquipment[] = [
    // ========================================================================
    // WEAPONS
    // ========================================================================

    /**
     * Flame Tongue - Magic sword with fire damage
     * Demonstrates: damage_bonus property, ability_unlock property
     */
    {
        name: 'Flame Tongue',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['finesse'],
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire_damage',
                value: '1d6',
                description: '+1d6 fire damage on hit',
                condition: { type: 'on_hit', value: true }
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_20ft',
                description: 'Sheds bright light in a 20ft radius and dim light for 20ft beyond'
            }
        ],
        grantsFeatures: [
            {
                id: 'flame_tongue_ignition',
                name: 'Ignition',
                description: 'As a bonus action, you can speak the command word to cause the sword to burst into flame. The flames last until you speak the command word again or until you drop or sheathe the sword.',
                effects: [
                    {
                        type: 'special_property',
                        target: 'fire_illumination',
                        value: true,
                        description: 'Sword bursts into flame'
                    }
                ],
                source: 'equipment_inline'
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'fire', 'weapon', 'versatile']
    },

    /**
     * Vorpal Sword - Decapitation on natural 20
     * Demonstrates: special_property with on_hit condition, legendary rarity
     */
    {
        name: 'Vorpal Sword',
        type: 'weapon',
        rarity: 'legendary',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 3,
                description: '+3 to attack and damage rolls'
            },
            {
                type: 'special_property',
                target: 'decapitation',
                value: 'natural_20',
                description: 'On a roll of 20, decapitate creatures with heads',
                condition: { type: 'on_hit', value: true }
            }
        ],
        spawnWeight: 0,
        source: 'custom',
        tags: ['magic', 'weapon', 'legendary', 'versatile', 'artifact']
    },

    /**
     * Frost Brand - Cold damage with fire resistance
     * Demonstrates: passive_modifier for resistance
     */
    {
        name: 'Frost Brand',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'cold', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        properties: [
            {
                type: 'damage_bonus',
                target: 'cold_damage',
                value: '1d6',
                description: '+1d6 cold damage on hit'
            },
            {
                type: 'passive_modifier',
                target: 'resistance_fire',
                value: true,
                description: 'Resistance to fire damage'
            },
            {
                type: 'special_property',
                target: 'extinguish_flames',
                value: true,
                description: 'Extinguish all non-magical flames within 30ft'
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'cold', 'weapon', 'fire_resistance']
    },

    /**
     * Dragonslayer Weapon - Bonus damage vs dragons
     * Demonstrates: conditional damage bonus vs creature type
     */
    {
        name: 'Dragonslayer Longsword',
        type: 'weapon',
        rarity: 'very_rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack and damage rolls'
            },
            {
                type: 'damage_bonus',
                target: 'dragon_damage',
                value: '2d6',
                description: '+2d6 damage against dragons',
                condition: { type: 'vs_creature_type', value: 'dragon' }
            }
        ],
        spawnWeight: 0.05,
        source: 'custom',
        tags: ['magic', 'weapon', 'versatile', 'dragon_slaying']
    },

    // ========================================================================
    // ARMOR
    // ========================================================================

    /**
     * Mithral Shirt - Light armor that counts as light
     * Demonstrates: special_property for armor classification
     */
    {
        name: 'Mithral Shirt',
        type: 'armor',
        rarity: 'uncommon',
        weight: 10,
        acBonus: 12,  // 12 + DEX (max 2)
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 12,
                description: 'Base AC: 12 + DEX (max 2)'
            },
            {
                type: 'special_property',
                target: 'armor_classification',
                value: 'light',
                description: 'Counts as light armor for class features'
            },
            {
                type: 'special_property',
                target: 'stealth_normal',
                value: true,
                description: 'No stealth disadvantage'
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'armor', 'light', 'mithral']
    },

    /**
     * +1 Plate Armor - Enhanced AC
     * Demonstrates: stacking AC bonuses
     */
    {
        name: '+1 Plate Armor',
        type: 'armor',
        rarity: 'rare',
        weight: 65,
        acBonus: 19,  // Base 18 + 1 enhancement
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 19,
                description: 'Fixed AC: 19 (18 base + 1 enhancement)'
            },
            {
                type: 'special_property',
                target: 'stealth_disadvantage',
                value: true,
                description: 'Stealth disadvantage'
            },
            {
                type: 'stat_requirement',
                target: 'STR',
                value: 15,
                description: 'Requires STR 15'
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'armor', 'heavy', 'enhanced']
    },

    /**
     * Elven Chain - Lightweight magic armor
     * Demonstrates: removing normal armor restrictions
     */
    {
        name: 'Elven Chain',
        type: 'armor',
        rarity: 'rare',
        weight: 20,
        acBonus: 16,
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 16,
                description: 'Fixed AC: 16'
            },
            {
                type: 'special_property',
                target: 'armor_classification',
                value: 'light',
                description: 'Counts as light armor for all features'
            },
            {
                type: 'special_property',
                target: 'stealth_normal',
                value: true,
                description: 'No stealth disadvantage'
            },
            {
                type: 'special_property',
                target: 'no_proficiency_required',
                value: true,
                description: 'Can be worn without armor proficiency'
            }
        ],
        spawnWeight: 0.05,
        source: 'custom',
        tags: ['magic', 'armor', 'elven', 'versatile']
    },

    // ========================================================================
    // WONDROUS ITEMS (STAT BONUSES)
    // ========================================================================

    /**
     * Belt of Giant Strength - Sets STR score
     * Demonstrates: stat_bonus property
     */
    {
        name: 'Belt of Giant Strength (Hill Giant)',
        type: 'item',
        rarity: 'rare',
        weight: 1,
        properties: [
            {
                type: 'stat_bonus',
                target: 'STR',
                value: 21,
                description: 'Strength score becomes 21 while worn',
                condition: { type: 'while_equipped', value: true },
                stackable: false  // Override, don't stack
            }
        ],
        spawnWeight: 0.15,
        source: 'custom',
        tags: ['magic', 'wondrous', 'strength']
    },

    /**
     * Amulet of Proof Against Detection - Protection from scrying
     * Demonstrates: ability_unlock property
     */
    {
        name: 'Amulet of Proof Against Detection',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        properties: [
            {
                type: 'ability_unlock',
                target: 'anti_magic_detection',
                value: true,
                description: 'Hidden from divination magic'
            },
            {
                type: 'passive_modifier',
                target: 'saving_throws',
                value: 1,
                description: '+1 to saving throws against spells'
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'wondrous', 'anti_detection']
    },

    /**
     * Headband of Intellect - Sets INT score
     * Demonstrates: stat_bonus that overrides base score
     */
    {
        name: 'Headband of Intellect',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        properties: [
            {
                type: 'stat_bonus',
                target: 'INT',
                value: 19,
                description: 'Intelligence score becomes 19 while worn',
                stackable: false
            }
        ],
        spawnWeight: 0.25,
        source: 'custom',
        tags: ['magic', 'wondrous', 'intelligence']
    },

    // ========================================================================
    // WONDROUS ITEMS (SKILL PROFICIENCIES)
    // ========================================================================

    /**
     * Boots of Elvenkind - Stealth expertise
     * Demonstrates: skill_proficiency property with expertise level
     */
    {
        name: 'Boots of Elvenkind',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        grantsSkills: [
            { skillId: 'stealth', level: 'expertise' }
        ],
        properties: [
            {
                type: 'special_property',
                target: 'silent_steps',
                value: true,
                description: 'Make no noise when walking'
            },
            {
                type: 'passive_modifier',
                target: 'stealth_check',
                value: 1,
                description: '+1 to Stealth checks'
            }
        ],
        spawnWeight: 0.3,
        source: 'custom',
        tags: ['magic', 'wondrous', 'boots', 'stealth', 'elven']
    },

    /**
     * Gloves of Thievery - Thieves' tools expertise
     * Demonstrates: granting proficiency with tools
     */
    {
        name: 'Gloves of Thievery',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        grantsSkills: [
            { skillId: 'thieves_tools', level: 'expertise' },
            { skillId: 'sleight_of_hand', level: 'proficient' }
        ],
        properties: [
            {
                type: 'passive_modifier',
                target: 'thieves_tools_check',
                value: 2,
                description: '+2 to checks with thieves\' tools'
            }
        ],
        spawnWeight: 0.25,
        source: 'custom',
        tags: ['magic', 'wondrous', 'thieves_tools']
    },

    // ========================================================================
    // WONDROUS ITEMS (MOVEMENT & SPEED)
    // ========================================================================

    /**
     * Boots of Speed - Haste effect
     * Demonstrates: granting features (referencing registry feature)
     */
    {
        name: 'Boots of Speed',
        type: 'item',
        rarity: 'rare',
        weight: 1,
        properties: [
            {
                type: 'passive_modifier',
                target: 'speed',
                value: 10,
                description: '+10 walking speed'
            }
        ],
        grantsFeatures: ['freedom_of_movement', 'haste'],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'wondrous', 'boots', 'speed']
    },

    /**
     * Boots of Striding and Springing - Jump distance bonus
     * Demonstrates: passive_modifier for jump distance
     */
    {
        name: 'Boots of Striding and Springing',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        properties: [
            {
                type: 'passive_modifier',
                target: 'walking_speed',
                value: 10,
                description: '+10 walking speed'
            },
            {
                type: 'passive_modifier',
                target: 'jump_distance',
                value: 3,
                description: 'Triple jump distance'
            },
            {
                type: 'ability_unlock',
                target: 'standing_long_jump',
                value: true,
                description: 'Can run, long jump, and high jump with only 10 feet of running start'
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'wondrous', 'boots', 'movement', 'jumping']
    },

    /**
     * Boots of Flying - Flight ability
     * Demonstrates: ability_unlock for flight
     */
    {
        name: 'Boots of Flying',
        type: 'item',
        rarity: 'rare',
        weight: 1,
        properties: [
            {
                type: 'ability_unlock',
                target: 'fly_speed',
                value: 60,
                description: 'Fly at 60 feet per round'
            }
        ],
        grantsFeatures: [
            {
                id: 'boots_of_flying_power',
                name: 'Flight',
                description: 'You can fly as a bonus action. The boots lose this power for 12 hours if you use it for more than 4 hours in a 24 hour period.',
                effects: [
                    {
                        type: 'ability_unlock',
                        target: 'fly_speed',
                        value: 60,
                        description: 'Fly at 60 feet'
                    }
                ],
                source: 'equipment_inline'
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'wondrous', 'boots', 'flight']
    },

    // ========================================================================
    // WONDROUS ITEMS (DEFENSE)
    // ========================================================================

    /**
     * Ring of Protection - AC and saves bonus
     * Demonstrates: multiple passive_modifiers, stacking
     */
    {
        name: 'Ring of Protection',
        type: 'item',
        rarity: 'rare',
        weight: 0.1,
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 1,
                description: '+1 Armor Class',
                stackable: true
            },
            {
                type: 'passive_modifier',
                target: 'saving_throws',
                value: 1,
                description: '+1 to all saving throws',
                stackable: true
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'ring', 'defense', 'ac', 'saves']
    },

    /**
     * Amulet of Proof Against Poison - Poison immunity
     * Demonstrates: passive_modifier for immunity
     */
    {
        name: 'Amulet of Proof Against Poison',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        properties: [
            {
                type: 'passive_modifier',
                target: 'immunity_poison',
                value: true,
                description: 'Immunity to poison damage'
            },
            {
                type: 'special_property',
                target: 'condition_immunity',
                value: 'poisoned',
                description: 'Immune to poisoned condition'
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'wondrous', 'poison_immunity', 'defense']
    },

    /**
     * Cloak of Protection - AC and saves bonus (same as ring, different slot)
     * Demonstrates: effects stacking from multiple items
     */
    {
        name: 'Cloak of Protection',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 1,
                description: '+1 Armor Class',
                stackable: true
            },
            {
                type: 'passive_modifier',
                target: 'saving_throws',
                value: 1,
                description: '+1 to all saving throws',
                stackable: true
            }
        ],
        spawnWeight: 0.25,
        source: 'custom',
        tags: ['magic', 'wondrous', 'cloak', 'defense', 'ac', 'saves']
    },

    // ========================================================================
    // WONDROUS ITEMS (VISION)
    // ========================================================================

    /**
     * Goggles of Night - Darkvision
     * Demonstrates: ability_unlock for darkvision
     */
    {
        name: 'Goggles of Night',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        properties: [
            {
                type: 'ability_unlock',
                target: 'darkvision',
                value: 60,
                description: 'Darkvision 60 feet'
            }
        ],
        spawnWeight: 0.3,
        source: 'custom',
        tags: ['magic', 'wondrous', 'vision', 'darkvision']
    },

    /**
     * Lantern of Revealing - Invisibility detection
     * Demonstrates: special_property for detection
     */
    {
        name: 'Lantern of Revealing',
        type: 'item',
        rarity: 'uncommon',
        weight: 2,
        properties: [
            {
                type: 'special_property',
                target: 'reveal_invisible',
                value: 30,
                description: 'Reveal invisible creatures and objects within 30ft'
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_30ft_dim_30ft',
                description: 'Sheds bright light 30ft, dim light 30ft beyond'
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'wondrous', 'light', 'detection']
    },

    // ========================================================================
    // SPELL-GRANTING ITEMS
    // ========================================================================

    /**
     * Ring of Spell Storing - Store and cast spells
     * Demonstrates: grantsSpells array with uses and recharge
     */
    {
        name: 'Ring of Spell Storing',
        type: 'item',
        rarity: 'rare',
        weight: 0.1,
        properties: [
            {
                type: 'special_property',
                target: 'spell_storage',
                value: 5,
                description: 'Store up to 5 levels of spells'
            }
        ],
        grantsSpells: [
            { spellId: 'stored_spell', level: 1, uses: 1, recharge: 'short_rest' }
        ],
        spawnWeight: 0.15,
        source: 'custom',
        tags: ['magic', 'ring', 'spell_storage']
    },

    /**
     * Pearl of Power - Recover spell slots
     * Demonstrates: special_property for spell recovery
     */
    {
        name: 'Pearl of Power (3rd Level)',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        properties: [
            {
                type: 'special_property',
                target: 'spell_slot_recovery',
                value: 3,
                description: 'Recover one expended 3rd level spell slot',
                condition: { type: 'custom', value: 'once_per_day', description: 'Once per day at dawn' }
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'wondrous', 'spell_recovery', 'pearl']
    },

    /**
     * Wand of Magic Missiles - Cast magic missile
     * Demonstrates: grantsSpells array with limited uses and recharge
     */
    {
        name: 'Wand of Magic Missiles',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        properties: [
            {
                type: 'special_property',
                target: 'spell_charges',
                value: 7,
                description: '7 charges, expends 1 per use'
            }
        ],
        grantsSpells: [
            { spellId: 'magic_missile', level: 1, uses: 7, recharge: 'dawn' }
        ],
        damage: { dice: '1d4+1', damageType: 'force' },
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'wand', 'evocation', 'force']
    },

    // ========================================================================
    // CURSED ITEMS
    // ========================================================================

    /**
     * -1 Cursed Sword - Penalty with attunement curse
     * Demonstrates: negative stat bonuses, cursed items
     */
    {
        name: '-1 Cursed Sword',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: -1,
                description: '-1 penalty to attack and damage rolls'
            },
            {
                type: 'special_property',
                target: 'curse_attunement',
                value: true,
                description: 'Cursed: Once attuned, cannot remove unless targeted by remove curse'
            }
        ],
        spawnWeight: 0.05,
        source: 'custom',
        tags: ['magic', 'weapon', 'cursed', 'curse', 'negative']
    },

    /**
     * Belt of Strength Drain - Weakens the wearer
     * Demonstrates: stat_bonus with negative value
     */
    {
        name: 'Belt of Strength Drain (Cursed)',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        properties: [
            {
                type: 'stat_bonus',
                target: 'STR',
                value: -4,
                description: '-4 Strength while worn',
                stackable: true
            },
            {
                type: 'special_property',
                target: 'curse_attunement',
                value: true,
                description: 'Cursed: Appears as Belt of Giant Strength until donned'
            }
        ],
        spawnWeight: 0,
        source: 'custom',
        tags: ['magic', 'cursed', 'curse', 'debuff']
    },

    /**
     * Helmet of Opposite Alignment - Changes alignment
     * Demonstrates: special_property for alignment change
     */
    {
        name: 'Helmet of Opposite Alignment (Cursed)',
        type: 'item',
        rarity: 'rare',
        weight: 3,
        properties: [
            {
                type: 'special_property',
                target: 'alignment_change',
                value: 'opposite',
                description: 'Changes character alignment to opposite',
                condition: { type: 'on_damage_taken', value: true }
            },
            {
                type: 'special_property',
                target: 'curse_attunement',
                value: true,
                description: 'Cursed: Must be attuned to remove, changes alignment'
            }
        ],
        spawnWeight: 0,
        source: 'custom',
        tags: ['magic', 'cursed', 'curse', 'alignment', 'helmet']
    },

    // ========================================================================
    // CONDITIONAL ITEMS
    // ========================================================================

    /**
     * Moon Sickle - Bonus damage at night
     * Demonstrates: at_time_of_day condition
     */
    {
        name: 'Moon Sickle',
        type: 'weapon',
        rarity: 'rare',
        weight: 2,
        damage: { dice: '1d4', damageType: 'slashing', versatile: '1d6' },
        weaponProperties: ['finesse', 'light', 'thrown'],
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack and damage rolls'
            },
            {
                type: 'damage_bonus',
                target: 'radiant_damage',
                value: '1d6',
                description: '+1d6 radiant damage at night',
                condition: { type: 'at_time_of_day', value: 'night' }
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'weapon', 'finesse', 'light', 'moon', 'radiant']
    },

    /**
     * Sun Blade - Bonus damage in daylight, penalized at night
     * Demonstrates: multiple conditions with different effects
     */
    {
        name: 'Sun Blade',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'radiant', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 2,
                description: '+2 to attack and damage rolls'
            },
            {
                type: 'damage_bonus',
                target: 'radiant_damage',
                value: '1d8',
                description: '+1d8 radiant damage in daylight',
                condition: { type: 'at_time_of_day', value: 'day' }
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_20ft_dim_20ft',
                description: 'Sheds bright light 20ft, dim 20ft'
            },
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: -1,
                description: '-1 to attack rolls at night',
                condition: { type: 'at_time_of_day', value: 'night' }
            }
        ],
        spawnWeight: 0.05,
        source: 'custom',
        tags: ['magic', 'weapon', 'sun', 'radiant', 'light']
    },

    /**
     * Dwarf-Forged Armor - Bonus only for dwarves
     * Demonstrates: wielder_race condition
     */
    {
        name: 'Dwarf-Forged Armor',
        type: 'armor',
        rarity: 'rare',
        weight: 40,
        acBonus: 15,
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 15,
                description: 'Base AC: 15 + DEX (max 2)'
            },
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 2,
                description: '+2 AC for dwarves only',
                condition: { type: 'wielder_race', value: 'Dwarf' }
            },
            {
                type: 'passive_modifier',
                target: 'saving_throws',
                value: 1,
                description: '+1 to saving throws for dwarves',
                condition: { type: 'wielder_race', value: 'Dwarf' }
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'armor', 'medium', 'dwarven']
    },

    /**
     * Wizard's Staff - Bonus only for wizards
     * Demonstrates: wielder_class condition
     */
    {
        name: 'Wizard\'s Staff',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile', 'two-handed'],
        properties: [
            {
                type: 'passive_modifier',
                target: 'spell_attack',
                value: 1,
                description: '+1 to spell attack rolls for wizards',
                condition: { type: 'wielder_class', value: 'Wizard' }
            },
            {
                type: 'passive_modifier',
                target: 'spell_save_dc',
                value: 1,
                description: '+1 to spell save DC for wizards',
                condition: { type: 'wielder_class', value: 'Wizard' }
            }
        ],
        spawnWeight: 0.2,
        source: 'custom',
        tags: ['magic', 'weapon', 'staff', 'wizard']
    },

    // ========================================================================
    // TEMPLATE-BASED ITEMS
    // ========================================================================

    /**
     * Flaming Longsword - Template-based magic weapon
     * Demonstrates: template_id for enchantment templates
     */
    {
        name: 'Flaming Longsword',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        templateId: 'flaming_weapon_template',
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire_damage',
                value: '1d6',
                description: '+1d6 fire damage',
                condition: { type: 'on_hit', value: true }
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_20ft',
                description: 'Sheds bright light 20ft'
            }
        ],
        spawnWeight: 0.15,
        source: 'custom',
        tags: ['magic', 'weapon', 'fire', 'flaming', 'template']
    },

    /**
     * Frost Longsword - Frost variant of template
     */
    {
        name: 'Frost Longsword',
        type: 'weapon',
        rarity: 'rare',
        weight: 3,
        damage: { dice: '1d8', damageType: 'cold', versatile: '1d10' },
        weaponProperties: ['finesse', 'versatile'],
        templateId: 'frost_weapon_template',
        properties: [
            {
                type: 'damage_bonus',
                target: 'cold_damage',
                value: '1d6',
                description: '+1d6 cold damage',
                condition: { type: 'on_hit', value: true }
            }
        ],
        spawnWeight: 0.15,
        source: 'custom',
        tags: ['magic', 'weapon', 'cold', 'frost', 'template']
    },
];

// ============================================================================
// ITEM_CREATION_TEMPLATES
// ============================================================================

/**
 * Item Creation Templates for enchantment
 *
 * These templates can be applied to base equipment to create magic variants.
 * Templates define reusable enchantment patterns that add properties, tags,
 * and effects to base items.
 *
 * Usage: Import `ITEM_CREPMENT_TEMPLATES` and use template IDs to enchant items.
 * Templates are applied by the EquipmentModifier and can be extended via ExtensionManager.
 *
 * Template types:
 * - Enhancement bonuses: +1, +2, +3 to weapons and armor
 * - Elemental weapons: Flaming, Frost, Shocking
 * - Special effects: Vicious, and other combat enhancements
 *
 * @example
 * ```typescript
 * import { applyTemplate } from './utils/magicItemExamples.js';
 * import { DEFAULT_EQUIPMENT, ITEM_CREATION_TEMPLATES } from './utils/equipmentConstants.js';
 *
 * const baseSword = DEFAULT_EQUIPMENT['Longsword'];
 * const flamingSword = applyTemplate(baseSword, 'flaming_weapon_template');
 * ```
 */
export const ITEM_CREATION_TEMPLATES: Record<string, Partial<EnhancedEquipment>> = {
    /**
     * +1 Weapon Enhancement
     * Adds +1 to attack and damage rolls
     */
    'plus_one_weapon': {
        rarity: 'uncommon',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack and damage rolls',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+1']
    },

    /**
     * +2 Weapon Enhancement
     * Adds +2 to attack and damage rolls
     */
    'plus_two_weapon': {
        rarity: 'rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 2,
                description: '+2 to attack and damage rolls',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+2']
    },

    /**
     * +3 Weapon Enhancement
     * Adds +3 to attack and damage rolls
     */
    'plus_three_weapon': {
        rarity: 'very_rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 3,
                description: '+3 to attack and damage rolls',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+3']
    },

    /**
     * Flaming Weapon Template
     * Adds fire damage and light emission
     */
    'flaming_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'damage_bonus',
                target: 'fire_damage',
                value: '1d6',
                description: '+1d6 fire damage',
                condition: { type: 'on_hit', value: true }
            },
            {
                type: 'special_property',
                target: 'light',
                value: 'bright_light_20ft',
                description: 'Sheds bright light 20ft, dim 20ft'
            }
        ],
        tags: ['magic', 'fire', 'flaming']
    },

    /**
     * Frost Weapon Template
     * Adds cold damage
     */
    'frost_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'damage_bonus',
                target: 'cold_damage',
                value: '1d6',
                description: '+1d6 cold damage',
                condition: { type: 'on_hit', value: true }
            }
        ],
        tags: ['magic', 'cold', 'frost']
    },

    /**
     * Shocking Weapon Template
     * Adds lightning damage
     */
    'shocking_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'damage_bonus',
                target: 'lightning_damage',
                value: '1d6',
                description: '+1d6 lightning damage',
                condition: { type: 'on_hit', value: true }
            }
        ],
        tags: ['magic', 'lightning', 'shocking']
    },

    /**
     * Vicious Weapon Template
     * Deals extra damage but hurts wielder
     */
    'vicious_weapon_template': {
        rarity: 'rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'attack_roll',
                value: 1,
                description: '+1 to attack and damage rolls'
            },
            {
                type: 'damage_bonus',
                target: 'extra_damage_on_hit',
                value: '1d8',
                description: 'Deals 1d8 extra damage, but wielder takes 1d8 necrotic',
                condition: { type: 'on_hit', value: true }
            }
        ],
        tags: ['magic', 'vicious', 'necrotic']
    },

    /**
     * +1 Armor Enhancement
     * Adds +1 AC bonus
     */
    'plus_one_armor': {
        rarity: 'rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 1,
                description: '+1 AC bonus',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+1', 'armor']
    },

    /**
     * +2 Armor Enhancement
     * Adds +2 AC bonus
     */
    'plus_two_armor': {
        rarity: 'very_rare',
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 2,
                description: '+2 AC bonus',
                stackable: true
            }
        ],
        tags: ['magic', 'enhanced', '+2', 'armor']
    },
};

// ============================================================================
// ENCHANTMENT_LIBRARY
// ============================================================================

/**
 * Enchantment Library
 *
 * Comprehensive collection of predefined enchantments and curses that can be
 * applied to equipment at runtime using EquipmentModifier.
 *
 * These are EquipmentModification objects designed to be applied to existing
 * equipment via:
 * - EquipmentModifier.enchant() - for positive enchantments
 * - EquipmentModifier.curse() - for negative curses
 * - EquipmentModifier.upgrade() - for improvements
 *
 * Structure:
 * - WEAPON_ENCHANTMENTS: Individual weapon enchantments (+1, flaming, frost, etc.)
 * - ARMOR_ENCHANTMENTS: Individual armor enchantments (+1, +2)
 * - RESISTANCE_ENCHANTMENTS: Individual resistance enchantments (fire, cold, etc.)
 * - COMBO_ENCHANTMENTS: Special multi-effect enchantments (Holy Avenger, Dragon Slayer, etc.)
 * - CURSES: All curses (penalties, stat curses, vulnerabilities, special curses)
 * - ALL_ENCHANTMENTS: Flattened combination of WEAPON + ARMOR + RESISTANCE + COMBO
 *
 * Access patterns:
 * - Structured: `ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne`
 * - Flat: `ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS.plusOne`
 * - Lookup: `EnchantmentLibrary.getEnchantment('plus_one')` - searches ALL_ENCHANTMENTS
 *
 * ID naming: Simplified IDs without `enchantment_` or `curse_` prefixes:
 * - Old: `'enchantment_plus_one'` → New: `'plus_one'`
 * - Old: `'curse_berserker'` → New: `'berserker'`
 *
 * @module utils/equipmentConstants
 */
export const ENCHANTMENT_LIBRARY = {
    // ========================================================================
    // WEAPON_ENCHANTMENTS
    // ========================================================================

    /**
     * Individual weapon enchantments
     * Enhancement bonuses, elemental damage, and special weapon properties
     */
    WEAPON_ENCHANTMENTS: {
        /**
         * +1 Enhancement Enchantment
         * Adds +1 to attack and damage rolls
         */
        plusOne: {
            id: 'plus_one',
            name: '+1 Enhancement',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 1,
                    description: '+1 to attack and damage rolls',
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * +2 Enhancement Enchantment
         * Adds +2 to attack and damage rolls
         */
        plusTwo: {
            id: 'plus_two',
            name: '+2 Enhancement',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 2,
                    description: '+2 to attack and damage rolls',
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * +3 Enhancement Enchantment
         * Adds +3 to attack and damage rolls
         */
        plusThree: {
            id: 'plus_three',
            name: '+3 Enhancement',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 3,
                    description: '+3 to attack and damage rolls',
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Flaming Enchantment
         * Adds +1d6 fire damage on hit
         */
        flaming: {
            id: 'flaming',
            name: 'Flaming',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'fire_damage',
                    value: '1d6',
                    description: '+1d6 fire damage on hit',
                    condition: { type: 'on_hit', value: true }
                },
                {
                    type: 'special_property',
                    target: 'light',
                    value: 'bright_light_20ft',
                    description: 'Sheds bright light in a 20ft radius and dim light for 20ft beyond'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Frost Enchantment
         * Adds +1d6 cold damage on hit
         */
        frost: {
            id: 'frost',
            name: 'Frost',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'cold_damage',
                    value: '1d6',
                    description: '+1d6 cold damage on hit',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Shocking Enchantment
         * Adds +1d6 lightning damage on hit
         */
        shocking: {
            id: 'shocking',
            name: 'Shocking',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'lightning_damage',
                    value: '1d6',
                    description: '+1d6 lightning damage on hit',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Thundering Enchantment
         * Adds +1d6 thunder damage on hit
         */
        thundering: {
            id: 'thundering',
            name: 'Thundering',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'thunder_damage',
                    value: '1d6',
                    description: '+1d6 thunder damage on hit',
                    condition: { type: 'on_hit', value: true }
                },
                {
                    type: 'special_property',
                    target: 'thunderous_strike',
                    value: true,
                    description: 'Creates a thunderous clap on hit'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Acidic Enchantment
         * Adds +1d6 acid damage on hit
         */
        acidic: {
            id: 'acidic',
            name: 'Acidic',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'acid_damage',
                    value: '1d6',
                    description: '+1d6 acid damage on hit',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Poison Enchantment
         * Adds +1d6 poison damage on hit
         */
        poison: {
            id: 'poison',
            name: 'Poisoned',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'poison_damage',
                    value: '1d6',
                    description: '+1d6 poison damage on hit',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Holy Enchantment
         * Adds +1d6 radiant damage on hit
         */
        holy: {
            id: 'holy',
            name: 'Holy',
            properties: [
                {
                    type: 'damage_bonus',
                    target: 'radiant_damage',
                    value: '1d6',
                    description: '+1d6 radiant damage on hit',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Vampiric Enchantment
         * Heals wielder for damage dealt
         */
        vampiric: {
            id: 'vampiric',
            name: 'Vampiric',
            properties: [
                {
                    type: 'special_property',
                    target: 'life_steal',
                    value: '1d6',
                    description: 'Regain 1d6 HP when dealing damage',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Vorpal Edge Enchantment
         * Increases critical threat range
         */
        vorpalEdge: {
            id: 'vorpal_edge',
            name: 'Vorpal Edge',
            properties: [
                {
                    type: 'special_property',
                    target: 'expanded_crit_range',
                    value: 19,
                    description: 'Critical hits on 19-20'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Keen Edge Enchantment
         * Expands critical range to 18-20
         */
        keenEdge: {
            id: 'keen_edge',
            name: 'Keen Edge',
            properties: [
                {
                    type: 'special_property',
                    target: 'expanded_crit_range',
                    value: 18,
                    description: 'Critical hits on 18-20'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Mighty Enchantment
         * Increases weapon damage die by one step
         */
        mighty: {
            id: 'mighty',
            name: 'Mighty',
            properties: [
                {
                    type: 'special_property',
                    target: 'damage_die_increase',
                    value: 1,
                    description: 'Weapon damage dice increased by one step'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Returning Enchantment
         * Weapon returns to hand after thrown
         */
        returning: {
            id: 'returning',
            name: 'Returning',
            properties: [
                {
                    type: 'special_property',
                    target: 'returns_to_hand',
                    value: true,
                    description: 'Weapon returns to wielder\'s hand immediately after being thrown'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Lifestealing Enchantment
         * Greater life steal effect
         */
        lifestealing: {
            id: 'lifestealing',
            name: 'Lifestealing',
            properties: [
                {
                    type: 'special_property',
                    target: 'life_steal',
                    value: '2d6',
                    description: 'Regain 2d6 HP when dealing damage',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification
    },

    // ========================================================================
    // ARMOR_ENCHANTMENTS
    // ========================================================================

    /**
     * Individual armor enchantments
     * Enhancement bonuses for armor
     */
    ARMOR_ENCHANTMENTS: {
        /**
         * +1 Armor Enhancement Enchantment
         * Adds +1 AC
         */
        plusOne: {
            id: 'plus_one_armor',
            name: '+1 Armor Enhancement',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'ac',
                    value: 1,
                    description: '+1 Armor Class',
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * +2 Armor Enhancement Enchantment
         */
        plusTwo: {
            id: 'plus_two_armor',
            name: '+2 Armor Enhancement',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'ac',
                    value: 2,
                    description: '+2 Armor Class',
                    stackable: true
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification
    },

    // ========================================================================
    // RESISTANCE_ENCHANTMENTS
    // ========================================================================

    /**
     * Individual resistance enchantments
     * Resistance to various damage types
     */
    RESISTANCE_ENCHANTMENTS: {
        /**
         * Fire Resistance Enchantment
         */
        fire: {
            id: 'fire_resistance',
            name: 'Fire Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_fire',
                    value: true,
                    description: 'Resistance to fire damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Cold Resistance Enchantment
         */
        cold: {
            id: 'cold_resistance',
            name: 'Cold Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_cold',
                    value: true,
                    description: 'Resistance to cold damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Lightning Resistance Enchantment
         */
        lightning: {
            id: 'lightning_resistance',
            name: 'Lightning Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_lightning',
                    value: true,
                    description: 'Resistance to lightning damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Acid Resistance Enchantment
         */
        acid: {
            id: 'acid_resistance',
            name: 'Acid Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_acid',
                    value: true,
                    description: 'Resistance to acid damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Poison Resistance Enchantment
         */
        poison: {
            id: 'poison_resistance',
            name: 'Poison Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_poison',
                    value: true,
                    description: 'Resistance to poison damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Necrotic Resistance Enchantment
         */
        necrotic: {
            id: 'necrotic_resistance',
            name: 'Necrotic Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_necrotic',
                    value: true,
                    description: 'Resistance to necrotic damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Radiant Resistance Enchantment
         */
        radiant: {
            id: 'radiant_resistance',
            name: 'Radiant Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_radiant',
                    value: true,
                    description: 'Resistance to radiant damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Thunder Resistance Enchantment
         */
        thunder: {
            id: 'thunder_resistance',
            name: 'Thunder Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_thunder',
                    value: true,
                    description: 'Resistance to thunder damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * All-Resistance Enchantment
         * Resistance to all damage types
         */
        all: {
            id: 'all_resistance',
            name: 'Universal Resistance',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'resistance_all',
                    value: true,
                    description: 'Resistance to all damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification
    },

    // ========================================================================
    // COMBO_ENCHANTMENTS
    // ========================================================================

    /**
     * Special multi-effect enchantments
     * Enchantments with multiple combined effects
     */
    COMBO_ENCHANTMENTS: {
        /**
         * Holy Avenger Enchantment
         * +3 enhancement, radiant damage, +5 saves vs spells
         */
        holyAvenger: {
            id: 'holy_avenger',
            name: 'Holy Avenger',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 3,
                    description: '+3 to attack and damage rolls'
                },
                {
                    type: 'damage_bonus',
                    target: 'radiant_damage',
                    value: '2d6',
                    description: '+2d6 radiant damage vs fiends and undead',
                    condition: { type: 'vs_creature_type', value: 'fiend' }
                },
                {
                    type: 'damage_bonus',
                    target: 'radiant_damage',
                    value: '2d6',
                    description: '+2d6 radiant damage vs fiends and undead',
                    condition: { type: 'vs_creature_type', value: 'undead' }
                },
                {
                    type: 'passive_modifier',
                    target: 'saving_throws',
                    value: 5,
                    description: '+5 to saving throws vs spells'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Dragon Slayer Enchantment
         * +2 enhancement, extra damage vs dragons
         */
        dragonSlayer: {
            id: 'dragon_slayer',
            name: 'Dragon Slayer',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 2,
                    description: '+2 to attack and damage rolls'
                },
                {
                    type: 'damage_bonus',
                    target: 'dragon_damage',
                    value: '3d6',
                    description: '+3d6 damage against dragons',
                    condition: { type: 'vs_creature_type', value: 'dragon' }
                },
                {
                    type: 'passive_modifier',
                    target: 'resistance_fire',
                    value: true,
                    description: 'Resistance to fire damage'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Demon Hunter Enchantment
         * Extra damage vs demons and devils
         */
        demonHunter: {
            id: 'demon_hunter',
            name: 'Demon Hunter',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 1,
                    description: '+1 to attack and damage rolls'
                },
                {
                    type: 'damage_bonus',
                    target: 'fiend_damage',
                    value: '2d6',
                    description: '+2d6 damage against fiends',
                    condition: { type: 'vs_creature_type', value: 'fiend' }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification,

        /**
         * Undead Bane Enchantment
         * Extra damage vs undead
         */
        undeadBane: {
            id: 'undead_bane',
            name: 'Undead Bane',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 1,
                    description: '+1 to attack and damage rolls'
                },
                {
                    type: 'damage_bonus',
                    target: 'radiant_damage',
                    value: '2d6',
                    description: '+2d6 radiant damage against undead',
                    condition: { type: 'vs_creature_type', value: 'undead' }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'enchantment'
        } as EquipmentModification
    },

    // ========================================================================
    // CURSES
    // ========================================================================

    /**
     * All curses
     * Penalty curses, stat curses, vulnerability curses, and special curses
     */
    CURSES: {
        // Penalty curses
        /**
         * -1 Penalty Curse
         * -1 to attack and damage rolls
         */
        minusOne: {
            id: 'minus_one',
            name: 'Cursed: -1 Penalty',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: -1,
                    description: '-1 penalty to attack and damage rolls'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * -2 Penalty Curse
         * -2 to attack and damage rolls
         */
        minusTwo: {
            id: 'minus_two',
            name: 'Cursed: -2 Penalty',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: -2,
                    description: '-2 penalty to attack and damage rolls'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        // Stat curses
        /**
         * Weakness Curse
         * -4 Strength
         */
        weakness: {
            id: 'weakness',
            name: 'Cursed: Weakness',
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'STR',
                    value: -4,
                    description: '-4 Strength while equipped'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Feeblemind Curse
         * -4 Intelligence
         */
        feeblemind: {
            id: 'feeblemind',
            name: 'Cursed: Feeblemind',
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'INT',
                    value: -4,
                    description: '-4 Intelligence while equipped'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Clumsiness Curse
         * -4 Dexterity
         */
        clumsiness: {
            id: 'clumsiness',
            name: 'Cursed: Clumsiness',
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'DEX',
                    value: -4,
                    description: '-4 Dexterity while equipped'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Frailty Curse
         * -4 Constitution
         */
        frailty: {
            id: 'frailty',
            name: 'Cursed: Frailty',
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'CON',
                    value: -4,
                    description: '-4 Constitution while equipped'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Foolishness Curse
         * -4 Wisdom
         */
        foolishness: {
            id: 'foolishness',
            name: 'Cursed: Foolishness',
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'WIS',
                    value: -4,
                    description: '-4 Wisdom while equipped'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Repulsiveness Curse
         * -4 Charisma
         */
        repulsiveness: {
            id: 'repulsiveness',
            name: 'Cursed: Repulsiveness',
            properties: [
                {
                    type: 'stat_bonus',
                    target: 'CHA',
                    value: -4,
                    description: '-4 Charisma while equipped'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        // Vulnerability curses
        /**
         * Vulnerability to Fire Curse
         */
        fireVulnerability: {
            id: 'fire_vulnerability',
            name: 'Cursed: Fire Vulnerability',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'vulnerability_fire',
                    value: true,
                    description: 'Vulnerability to fire damage (double damage)'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Vulnerability to Cold Curse
         */
        coldVulnerability: {
            id: 'cold_vulnerability',
            name: 'Cursed: Cold Vulnerability',
            properties: [
                {
                    type: 'passive_modifier',
                    target: 'vulnerability_cold',
                    value: true,
                    description: 'Vulnerability to cold damage (double damage)'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        // Special curses
        /**
         * Lifesteal Curse
         * Damages wielder on hit
         */
        lifesteal: {
            id: 'lifesteal',
            name: 'Cursed: Bloodthirst',
            properties: [
                {
                    type: 'special_property',
                    target: 'life_drain',
                    value: '1d4',
                    description: 'Wielder takes 1d4 necrotic damage when dealing damage',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Attunement Curse
         * Cannot remove equipment once donned
         */
        attunement: {
            id: 'attunement',
            name: 'Cursed: Attunement Lock',
            properties: [
                {
                    type: 'special_property',
                    target: 'curse_attunement',
                    value: true,
                    description: 'Once equipped, cannot be removed unless targeted by remove curse'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Berserker Curse
         * Must attack each round or take penalty
         */
        berserker: {
            id: 'berserker',
            name: 'Cursed: Berserker Rage',
            properties: [
                {
                    type: 'special_property',
                    target: 'berserker_rage',
                    value: true,
                    description: 'Must attack each round or take disadvantage on all attacks'
                },
                {
                    type: 'passive_modifier',
                    target: 'attack_roll',
                    value: 1,
                    description: '+1 to attack and damage rolls (while berserking)'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Heavy Burden Curse
         * Equipment weight is doubled
         */
        heavyBurden: {
            id: 'heavy_burden',
            name: 'Cursed: Heavy Burden',
            properties: [
                {
                    type: 'special_property',
                    target: 'weight_multiplier',
                    value: 2,
                    description: 'Equipment weight is doubled'
                },
                {
                    type: 'passive_modifier',
                    target: 'speed',
                    value: -5,
                    description: '-5 walking speed'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Light Sensitivity Curse
         * Disadvantage in bright light
         */
        lightSensitivity: {
            id: 'light_sensitivity',
            name: 'Cursed: Light Sensitivity',
            properties: [
                {
                    type: 'special_property',
                    target: 'light_sensitivity',
                    value: true,
                    description: 'Disadvantage on attacks and perception in bright light'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Invisibility Curse
         * Wearer becomes invisible but also impaired
         */
        invisibility: {
            id: 'invisibility',
            name: 'Cursed: Invisibility',
            addsFeatures: [
                {
                    id: 'curse_invisibility_feature',
                    name: 'Cursed Invisibility',
                    description: 'You are invisible while equipped. However, you have disadvantage on attack rolls and enemies have advantage on attacks against you before you are revealed.',
                    effects: [
                        {
                            type: 'ability_unlock',
                            target: 'invisibility',
                            value: true,
                            description: 'Invisible'
                        },
                        {
                            type: 'passive_modifier',
                            target: 'attack_roll',
                            value: -5,
                            description: 'Disadvantage on attacks while invisible'
                        }
                    ],
                    source: 'equipment_inline'
                }
            ],
            properties: [],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Hallucinations Curse
         * Random chance of confusion
         */
        hallucinations: {
            id: 'hallucinations',
            name: 'Cursed: Hallucinations',
            properties: [
                {
                    type: 'special_property',
                    target: 'hallucinations',
                    value: '25_percent',
                    description: '25% chance each round to see enemies as allies and vice versa'
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification,

        /**
         * Blood Money Curse
         * Takes HP when dealing damage
         */
        bloodMoney: {
            id: 'blood_money',
            name: 'Cursed: Blood Money',
            properties: [
                {
                    type: 'special_property',
                    target: 'hp_on_damage',
                    value: '1d4',
                    description: 'Wielder takes 1d4 damage when dealing damage to enemies',
                    condition: { type: 'on_hit', value: true }
                }
            ],
            appliedAt: new Date().toISOString(),
            source: 'curse'
        } as EquipmentModification
    },

    // ========================================================================
    // ALL_ENCHANTMENTS (Flattened)
    // ========================================================================

    /**
     * All enchantments combined (flattened)
     * Provides a flat object when you don't care about categories
     * Combines WEAPON + ARMOR + RESISTANCE + COMBO enchantments
     * Note: Does not include CURSES
     */
    ALL_ENCHANTMENTS: {} as Record<string, EquipmentModification>
} as const;

// Populate ALL_ENCHANTMENTS as flattened combination
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).plusOne = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusOne;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).plusTwo = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusTwo;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).plusThree = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.plusThree;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).flaming = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.flaming;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).frost = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.frost;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).shocking = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.shocking;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).thundering = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.thundering;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).acidic = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.acidic;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).poison = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.poison;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).holy = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.holy;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).vampiric = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.vampiric;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).vorpalEdge = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.vorpalEdge;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).keenEdge = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.keenEdge;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).mighty = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.mighty;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).returning = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.returning;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).lifestealing = ENCHANTMENT_LIBRARY.WEAPON_ENCHANTMENTS.lifestealing;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).plusOneArmor = ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS.plusOne;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).plusTwoArmor = ENCHANTMENT_LIBRARY.ARMOR_ENCHANTMENTS.plusTwo;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).fire = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.fire;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).cold = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.cold;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).lightning = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.lightning;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).acid = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.acid;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).poisonResistance = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.poison;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).necrotic = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.necrotic;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).radiant = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.radiant;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).thunder = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.thunder;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).allResistance = ENCHANTMENT_LIBRARY.RESISTANCE_ENCHANTMENTS.all;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).holyAvenger = ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.holyAvenger;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).dragonSlayer = ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.dragonSlayer;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).demonHunter = ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.demonHunter;
(ENCHANTMENT_LIBRARY.ALL_ENCHANTMENTS as Record<string, EquipmentModification>).undeadBane = ENCHANTMENT_LIBRARY.COMBO_ENCHANTMENTS.undeadBane;

// ============================================================================
// STAT BOOSTING ENCHANTMENT FACTORY FUNCTIONS
// ============================================================================

/**
 * Strength Boost Enchantment
 * +1, +2, +3, or +4 to Strength
 */
export function createStrengthEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
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
 * Dexterity Boost Enchantment
 */
export function createDexterityEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
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
 * Constitution Boost Enchantment
 */
export function createConstitutionEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
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
 * Intelligence Boost Enchantment
 */
export function createIntelligenceEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
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
 * Wisdom Boost Enchantment
 */
export function createWisdomEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
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
 * Charisma Boost Enchantment
 */
export function createCharismaEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
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
