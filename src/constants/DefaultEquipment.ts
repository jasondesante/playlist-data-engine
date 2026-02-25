/**
 * Default Equipment Database
 *
 * Base equipment data with 40+ items covering all standard D&D 5e equipment.
 * Includes weapons, armor, gear, adventure packs, ammunition, and special items.
 *
 * This is the single source of truth for all base equipment in the engine.
 * Previously located in src/utils/equipmentConstants.ts.
 *
 * @module constants/DefaultEquipment
 */

// Import Equipment interface from utils/constants.ts
import type { Equipment } from '../utils/constants.js';

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
        tags: ['martial', 'melee', 'two-handed'],
        description: 'A massive two-handed axe favored by barbarians for its devastating damage potential. Requires great strength to wield effectively.'
    },
    'Longsword': {
        name: 'Longsword',
        type: 'weapon',
        rarity: 'common',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
        weaponProperties: ['versatile'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'versatile'],
        description: 'A versatile sword usable with one or two hands. The classic weapon of knights and warriors throughout history.'
    },
    'Shortsword': {
        name: 'Shortsword',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'piercing', versatile: '1d8' },
        weaponProperties: ['finesse', 'light', 'versatile'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'finesse', 'light'],
        description: 'A light, agile sword effective in close quarters. Can be used with Dexterity instead of Strength when wielded alone.'
    },
    'Rapier': {
        name: 'Rapier',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['finesse'],
        spawnWeight: 1.0,
        tags: ['martial', 'melee', 'finesse'],
        description: 'A slender, thrusting sword designed for speed and precision. Favored by duelists and rogues for its finesse property.'
    },
    'Quarterstaff': {
        name: 'Quarterstaff',
        type: 'weapon',
        rarity: 'common',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile', 'two-handed'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'versatile'],
        description: 'A simple wooden staff, often the first weapon of monks and spellcasters. Effective when used with two hands.'
    },
    'Mace': {
        name: 'Mace',
        type: 'weapon',
        rarity: 'common',
        weight: 4,
        damage: { dice: '1d6', damageType: 'bludgeoning', versatile: '1d8' },
        weaponProperties: ['versatile'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'versatile'],
        description: 'A simple blunt weapon effective against armored foes. Common among clerics and those favoring divine righteousness.'
    },
    'Handaxe': {
        name: 'Handaxe',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'slashing' },
        weaponProperties: ['light', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'thrown', 'light'],
        description: 'A small axe versatile in melee or as a thrown weapon. Popular among dwarves and rangers.'
    },
    'Dagger': {
        name: 'Dagger',
        type: 'weapon',
        rarity: 'common',
        weight: 1,
        damage: { dice: '1d4', damageType: 'piercing', versatile: '1d6' },
        weaponProperties: ['finesse', 'light', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'finesse', 'light', 'thrown'],
        description: 'A lightweight weapon useful for melee and ranged attacks. Essential for rogues and as a backup weapon for all adventurers.'
    },
    'Dart': {
        name: 'Dart',
        type: 'weapon',
        rarity: 'common',
        weight: 0.25,
        damage: { dice: '1d4', damageType: 'piercing' },
        weaponProperties: ['finesse', 'thrown', 'range_20_60'],
        spawnWeight: 1.0,
        tags: ['simple', 'ranged', 'thrown', 'finesse'],
        description: 'A small throwing weapon, often carried in bulk. Lightweight but deals minimal damage.'
    },
    'Javelin': {
        name: 'Javelin',
        type: 'weapon',
        rarity: 'common',
        weight: 2,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['thrown', 'range_30_120'],
        spawnWeight: 1.0,
        tags: ['simple', 'melee', 'thrown'],
        description: 'A light spear designed for throwing. Effective at both melee and range.'
    },
    'Light Crossbow': {
        name: 'Light Crossbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 5,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_80_320', 'two-handed', 'loading'],
        spawnWeight: 1.0,
        tags: ['simple', 'ranged', 'two-handed', 'ammunition'],
        description: 'A compact crossbow requiring minimal training to use. Devastating at range but requires a reload action between shots.'
    },
    'Hand Crossbow': {
        name: 'Hand Crossbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 3,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_30_120', 'light', 'loading'],
        spawnWeight: 1.0,
        tags: ['martial', 'ranged', 'light', 'ammunition'],
        description: 'A small crossbow usable in one hand. Popular among rogues and those who need a ranged sidearm.'
    },
    'Longbow': {
        name: 'Longbow',
        type: 'weapon',
        rarity: 'uncommon',
        weight: 2,
        damage: { dice: '1d8', damageType: 'piercing' },
        weaponProperties: ['ammunition', 'range_150_600', 'two-handed', 'heavy'],
        spawnWeight: 1.0,
        tags: ['martial', 'ranged', 'two-handed', 'ammunition', 'heavy'],
        description: 'A tall bow with impressive range and power. Requires significant strength to draw and training to use effectively.'
    },
    'Martial Melee Weapon': {
        name: 'Martial Melee Weapon',
        type: 'weapon',
        rarity: 'common',
        weight: 3,
        damage: { dice: '1d8', damageType: 'slashing' },
        weaponProperties: ['versatile'],
        spawnWeight: 0.5,  // Less common (generic weapon)
        tags: ['martial', 'melee', 'versatile', 'generic'],
        description: 'A generic martial melee weapon. Used as a fallback when no specific weapon is specified.'
    },

    // ===== ARMOR =====

    'No Armor': {
        name: 'No Armor',
        type: 'armor',
        rarity: 'common',
        weight: 0,
        acBonus: 10,  // Base AC from DEX alone
        spawnWeight: 1.0,
        tags: ['armor', 'light', 'no_armor'],
        description: 'No armor worn. Relies entirely on Dexterity for defense. Maximum mobility but minimal protection.'
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
        tags: ['armor', 'light'],
        description: 'Light armor made from cured animal hides. Offers basic protection without restricting movement. Adds full Dexterity bonus to AC.'
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
        tags: ['armor', 'medium'],
        description: 'Armor consisting of many overlapping metal scales. Solid protection but imposes disadvantage on Stealth checks.'
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
        tags: ['armor', 'heavy'],
        description: 'Interlocking metal rings provide excellent protection. Requires Strength 13 to wear and imposes disadvantage on Stealth.'
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
        tags: ['armor', 'heavy', 'rare'],
        description: 'The finest armor available, consisting of shaped and fitted metal plates. Provides maximum protection but is expensive, heavy, and requires Strength 15.'
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
        tags: ['armor', 'shield'],
        description: 'A portable defensive barrier carried in one hand. Grants +2 to Armor Class. Cannot be used with two-handed weapons.'
    },

    // ===== ITEMS & GEAR =====

    'Spellbook': {
        name: 'Spellbook',
        type: 'item',
        rarity: 'uncommon',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'arcane', 'spellbook'],
        description: 'A blank tome used by wizards to record their spells. Essential for preparing and casting wizard spells.'
    },
    'Holy Symbol': {
        name: 'Holy Symbol',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'divine', 'focus'],
        description: 'An emblem of a deity used by clerics and paladins as a divine focus for spellcasting.'
    },
    'Arcane Focus': {
        name: 'Arcane Focus',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'arcane', 'focus'],
        description: 'An object such as a crystal, orb, or wand used to channel arcane magic. Replaces material components for most spells.'
    },
    'Druidic Focus': {
        name: 'Druidic Focus',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'druid', 'focus'],
        description: 'A natural object such as a staff, wand, or totem used by druids to channel primal magic.'
    },
    'Component Pouch': {
        name: 'Component Pouch',
        type: 'box',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'components', 'spellcasting'],
        boxContents: {
            drops: [],
            consumeOnOpen: false
        },
        description: 'A pouch containing small compartments for storing material components needed for spells. A practical alternative to an arcane focus. Assumes to contain all material components without specific gold costs.'
    },
    'Lute': {
        name: 'Lute',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'instrument', 'bard'],
        description: 'A stringed musical instrument used by bards to perform and channel magical inspiration.'
    },
    'Thieves\' Tools': {
        name: 'Thieves\' Tools',
        type: 'item',
        rarity: 'uncommon',
        weight: 1,
        grantsSkills: [{ skillId: 'thieves_tools', level: 'proficient' }],
        spawnWeight: 1.0,
        tags: ['gear', 'tools', 'dexterity'],
        description: 'A small collection of tools including picks, files, and crowbar. Essential for picking locks and disarming traps.'
    },
    'Healer\'s Kit': {
        name: 'Healer\'s Kit',
        type: 'box',
        rarity: 'common',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'healing', 'consumable'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Medical Supply', quantity: 10 }] }
            ],
            consumeOnOpen: false
        },
        description: 'A collection of bandages, salves, and tools for treating wounds. Contains 10 medical supplies. Essential for stabilizing dying creatures and providing medical aid.'
    },
    'Bedroll': {
        name: 'Bedroll',
        type: 'item',
        rarity: 'common',
        weight: 7,
        spawnWeight: 1.0,
        tags: ['gear', 'camp', 'comfort'],
        description: 'A padded blanket roll used for sleeping outdoors. Essential comfort for adventurers on the road.'
    },
    'Rope': {
        name: 'Rope',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'utility', 'climbing'],
        description: '50 feet of hempen rope. Essential for climbing, securing prisoners, and countless other utility purposes.'
    },
    'Backpack': {
        name: 'Backpack',
        type: 'box',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'container', 'storage'],
        boxContents: {
            drops: [],
            consumeOnOpen: false
        },
        description: 'A leather backpack for carrying adventuring gear. Essential storage for any traveling adventurer.'
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
        tags: ['gear', 'light', 'consumable'],
        description: 'A wooden rod topped with flammable material. Burns for about an hour, shedding light in a 20-foot radius.'
    },
    'Waterskin': {
        name: 'Waterskin',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'container', 'water'],
        description: 'A leather container for holding water. Essential for surviving in wilderness and dungeon environments.'
    },
    'Ink & Quill': {
        name: 'Ink & Quill',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'writing', 'consumable'],
        description: 'Ink and a quill pen for writing. Useful for recording maps, copying spells, and documenting adventures.'
    },

    // ===== UTILITY ITEMS =====

    'Ball Bearings': {
        name: 'Ball Bearings',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'utility', 'rogue'],
        description: 'A bag containing 1,000 tiny metal balls. Scattered on the ground, they create a treacherous surface that can cause creatures to fall prone.'
    },
    'String': {
        name: 'String',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'utility'],
        description: '10 feet of sturdy string. Useful for tripwires, tying items together, or countless other creative purposes.'
    },
    'Bell': {
        name: 'Bell',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'utility', 'alarm'],
        description: 'A small brass bell that rings when disturbed. Perfect for creating warning systems or signaling.'
    },
    'Crowbar': {
        name: 'Crowbar',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'tool', 'utility'],
        description: 'A heavy iron bar used for prying open doors, chests, and other stuck objects. Grants advantage on Strength checks to force objects open.'
    },
    'Hammer': {
        name: 'Hammer',
        type: 'item',
        rarity: 'common',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'tool', 'utility'],
        description: 'A sturdy hammer designed for driving pitons into walls and other heavy work. Essential for dungeon exploration.'
    },
    'Piton': {
        name: 'Piton',
        type: 'item',
        rarity: 'common',
        weight: 0.25,
        spawnWeight: 1.0,
        tags: ['gear', 'climbing', 'utility'],
        description: 'A metal spike with a ring at one end. Driven into cracks to create climbing anchors or secure rope lines.'
    },
    'Small Knife': {
        name: 'Small Knife',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'tool', 'utility'],
        description: 'A small utility knife useful for cutting rope, skinning game, and other everyday tasks. Not designed for combat.'
    },

    // ===== KEYS =====

    'Iron Key': {
        name: 'Iron Key',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 0.5,
        tags: ['key', 'utility', 'consumable'],
        description: 'A simple iron key that can unlock certain containers. Consumed when used to open a locked box.'
    },
    'Golden Key': {
        name: 'Golden Key',
        type: 'item',
        rarity: 'uncommon',
        weight: 0,
        spawnWeight: 0.2,
        tags: ['key', 'utility', 'consumable', 'valuable'],
        description: 'An ornate golden key for unlocking valuable chests. Consumed when used to open a locked box.'
    },
    'Skeleton Key': {
        name: 'Skeleton Key',
        type: 'item',
        rarity: 'rare',
        weight: 0,
        spawnWeight: 0.1,
        tags: ['key', 'utility', 'consumable', 'universal'],
        description: 'A master key that can open many different locks. Consumed when used to open a locked box.'
    },

    // ===== CURRENCY =====

    'Gold Coin': {
        name: 'Gold Coin',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 0,  // Not randomly spawned - earned through gameplay
        tags: ['currency', 'gold', 'money'],
        description: 'A standard gold coin used as currency throughout the realm. Can be consumed to open certain magical locks.'
    },

    // ===== LOCKED BOXES =====

    'Locked Chest': {
        name: 'Locked Chest',
        type: 'box',
        rarity: 'uncommon',
        weight: 10,
        spawnWeight: 0.5,
        tags: ['loot', 'treasure', 'locked'],
        boxContents: {
            openRequirements: [
                { itemName: 'Iron Key' }
            ],
            drops: [
                { pool: [{ weight: 100, gold: 50 }] },
                { pool: [
                    { weight: 50, itemName: 'Shortsword' },
                    { weight: 30, itemName: 'Leather Armor' },
                    { weight: 20, itemName: 'Medical Supply', quantity: 3 }
                ]}
            ]
        },
        description: 'A sturdy locked chest. Requires an Iron Key to open.'
    },
    'Gilded Strongbox': {
        name: 'Gilded Strongbox',
        type: 'box',
        rarity: 'rare',
        weight: 15,
        spawnWeight: 0.3,
        tags: ['loot', 'treasure', 'gold-locked'],
        boxContents: {
            openRequirements: [
                { itemName: 'Gold Coin', quantity: 100 }
            ],
            drops: [
                { pool: [{ weight: 100, gold: 250 }] },
                { pool: [
                    { weight: 40, itemName: 'Longsword' },
                    { weight: 30, itemName: 'Chain Mail' },
                    { weight: 20, itemName: 'Scale Mail' },
                    { weight: 10, itemName: 'Medical Supply', quantity: 5 }
                ]}
            ]
        },
        description: 'A gilded strongbox with a magical lock. Consumes 100 Gold Coins to unlock.'
    },

    // ===== LIGHT SOURCES =====

    'Candle': {
        name: 'Candle',
        type: 'item',
        rarity: 'common',
        weight: 0,
        properties: [
            { type: 'special_property', target: 'light', value: 'dim_light_5ft', description: 'Sheds dim light 5ft, bright 2ft' }
        ],
        spawnWeight: 1.0,
        tags: ['gear', 'light', 'consumable'],
        description: 'A simple wax candle that burns for about an hour. Provides dim light in a 5-foot radius, bright light in a 2-foot radius.'
    },
    'Hooded Lantern': {
        name: 'Hooded Lantern',
        type: 'item',
        rarity: 'common',
        weight: 2,
        properties: [
            { type: 'special_property', target: 'light', value: 'bright_light_30ft', description: 'Sheds bright light 30ft, dim 30ft when unhooded' }
        ],
        spawnWeight: 1.0,
        tags: ['gear', 'light'],
        description: 'A metal lantern with a hood that can be raised or lowered to control the light. Burns for 6 hours on a flask of oil. Sheds bright light in a 30-foot cone and dim light for an additional 30 feet when unhooded.'
    },
    'Oil Flask': {
        name: 'Oil Flask',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'light', 'consumable'],
        description: 'A flask of oil suitable for fueling lanterns. Can also be used as a weapon when thrown and ignited, dealing fire damage. Burns for 6 hours in a lantern.'
    },

    // ===== SURVIVAL ITEMS =====

    'Rations': {
        name: 'Rations',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'food', 'consumable'],
        description: 'One day\'s worth of dried meat, hard bread, and other preserved food. Essential for surviving long journeys without access to fresh food.'
    },
    'Water': {
        name: 'Water',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'drink', 'consumable'],
        description: 'Clean drinking water essential for survival. Typically stored in a waterskin and consumed during rest periods.'
    },
    'Medical Supply': {
        name: 'Medical Supply',
        type: 'item',
        rarity: 'common',
        weight: 0.3,
        spawnWeight: 1.0,
        tags: ['gear', 'healing', 'consumable'],
        description: 'A single-use bandage, salve, or medical tool for treating wounds. Used to stabilize dying creatures or provide basic first aid.'
    },
    'Tinderbox': {
        name: 'Tinderbox',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'fire', 'utility'],
        description: 'A small container with flint, steel, and tinder for starting fires. Essential for lighting torches, campfires, and lanterns.'
    },
    'Mess Kit': {
        name: 'Mess Kit',
        type: 'item',
        rarity: 'common',
        weight: 1,
        spawnWeight: 1.0,
        tags: ['gear', 'camp', 'dining'],
        description: 'A tin box containing a cup, bowl, and simple eating utensils. Collapses flat for easy packing and storage.'
    },
    'Blanket': {
        name: 'Blanket',
        type: 'item',
        rarity: 'common',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'camp', 'comfort'],
        description: 'A warm woolen blanket for sleeping. Provides basic warmth and comfort during rest in cold environments.'
    },

    // ===== CLOTHING ITEMS =====

    'Costume': {
        name: 'Costume',
        type: 'item',
        rarity: 'common',
        weight: 4,
        spawnWeight: 1.0,
        tags: ['gear', 'clothing', 'performance'],
        description: 'A set of performer\'s clothing suitable for stage appearances and entertaining. Includes colorful fabrics and decorative elements.'
    },
    'Traveler\'s Clothes': {
        name: 'Traveler\'s Clothes',
        type: 'item',
        rarity: 'common',
        weight: 4,
        spawnWeight: 1.0,
        tags: ['gear', 'clothing'],
        description: 'Sturdy, practical clothing designed for long journeys. Includes boots, a cloak, and weather-appropriate garb for the road.'
    },
    'Vestments': {
        name: 'Vestments',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'clothing', 'religious'],
        description: 'Ceremonial robes worn by priests and other religious figures. Often adorned with symbols of faith and made of fine materials.'
    },

    // ===== RELIGIOUS ITEMS =====

    'Alms Box': {
        name: 'Alms Box',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'religious', 'container'],
        description: 'A small wooden box with a slot for collecting alms and donations. Used by priests and mendicants to gather charitable offerings.'
    },
    'Incense': {
        name: 'Incense',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'religious', 'consumable'],
        description: 'A block of aromatic incense used in religious ceremonies and rituals. Burns slowly to produce fragrant smoke during prayers and worship.'
    },
    'Censer': {
        name: 'Censer',
        type: 'item',
        rarity: 'common',
        weight: 2,
        spawnWeight: 1.0,
        tags: ['gear', 'religious'],
        description: 'A metal container suspended on chains, used for burning incense during religious ceremonies. Often made of silver or brass and adorned with religious symbols.'
    },

    // ===== WRITING ITEMS =====

    'Book of Lore': {
        name: 'Book of Lore',
        type: 'item',
        rarity: 'common',
        weight: 5,
        spawnWeight: 1.0,
        tags: ['gear', 'book', 'knowledge'],
        description: 'A scholarly tome containing accumulated knowledge on various subjects. Scholars and wizards often carry these to reference arcane theories, historical accounts, or arcane formulas.'
    },
    'Bottle of Ink': {
        name: 'Bottle of Ink',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'writing', 'consumable'],
        description: 'A small glass bottle containing black ink, sealed with a stopper. Used with an ink pen for writing on parchment or paper.'
    },
    'Ink Pen': {
        name: 'Ink Pen',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'writing'],
        description: 'A wooden pen with a metal nib, designed to be dipped in ink for writing. Essential for scribes, scholars, and anyone needing to keep written records.'
    },
    'Parchment': {
        name: 'Parchment',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'writing', 'consumable'],
        description: 'A single sheet of parchment made from animal skin, used for writing important documents, letters, or arcane inscriptions. More durable than paper but also more expensive.'
    },
    'Bag of Sand': {
        name: 'Bag of Sand',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'writing', 'utility'],
        description: 'A small cloth bag filled with fine sand. Sprinkled over freshly written text to absorb excess ink and speed drying, preventing smudges and blots.'
    },

    // ===== TOOLS =====

    'Disguise Kit': {
        name: 'Disguise Kit',
        type: 'item',
        rarity: 'common',
        weight: 3,
        spawnWeight: 1.0,
        tags: ['gear', 'deception', 'rogue'],
        description: 'A kit containing cosmetics, hair dye, and small props to create disguises. Includes makeup, false facial hair, and other materials needed to change one\'s appearance. Essential for spies, actors, and rogues who need to assume different identities.'
    },

    // ===== ADVENTURE PACKS =====

    'Burglar\'s Pack': {
        name: 'Burglar\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 44,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'rogue'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Ball Bearings', quantity: 1000 }] },
                { pool: [{ weight: 100, itemName: 'String' }] },
                { pool: [{ weight: 100, itemName: 'Bell' }] },
                { pool: [{ weight: 100, itemName: 'Candle', quantity: 5 }] },
                { pool: [{ weight: 100, itemName: 'Crowbar' }] },
                { pool: [{ weight: 100, itemName: 'Hammer' }] },
                { pool: [{ weight: 100, itemName: 'Piton', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Hooded Lantern' }] },
                { pool: [{ weight: 100, itemName: 'Oil Flask', quantity: 2 }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 5 }] },
                { pool: [{ weight: 100, itemName: 'Tinderbox' }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] },
                { pool: [{ weight: 100, itemName: 'Rope' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack containing gear for a rogue: a backpack, a bag of 1,000 ball bearings, 10 feet of string, a bell, 5 candles, a crowbar, a hammer, 10 pitons, a hooded lantern, 2 flasks of oil, 5 days\' rations, a tinderbox, and a waterskin. Includes a pack with 50 feet of hempen rope strapped to the side.'
    },
    'Explorer\'s Pack': {
        name: 'Explorer\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 59,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'general'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Bedroll' }] },
                { pool: [{ weight: 100, itemName: 'Mess Kit' }] },
                { pool: [{ weight: 100, itemName: 'Tinderbox' }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] },
                { pool: [{ weight: 100, itemName: 'Rope' }] },
                { pool: [{ weight: 100, itemName: 'Torch', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 10 }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack containing gear for wilderness exploration: a backpack, a bedroll, mess kit, tinderbox, 10 torches, and 10 days\' rations. Includes a waterskin and 50 feet of hempen rope.'
    },
    'Entertainer\'s Pack': {
        name: 'Entertainer\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 58,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'bard'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Bedroll' }] },
                { pool: [{ weight: 100, itemName: 'Costume', quantity: 2 }] },
                { pool: [{ weight: 100, itemName: 'Candle', quantity: 5 }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 5 }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] },
                { pool: [{ weight: 100, itemName: 'Disguise Kit' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack containing a bard\'s performance gear: a backpack, a bedroll, 2 costumes, 5 candles, 5 days\' rations, a waterskin, and a disguise kit.'
    },
    'Priest\'s Pack': {
        name: 'Priest\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 33,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'cleric'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Blanket' }] },
                { pool: [{ weight: 100, itemName: 'Candle', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Tinderbox' }] },
                { pool: [{ weight: 100, itemName: 'Alms Box' }] },
                { pool: [{ weight: 100, itemName: 'Incense', quantity: 2 }] },
                { pool: [{ weight: 100, itemName: 'Censer' }] },
                { pool: [{ weight: 100, itemName: 'Vestments' }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 2 }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack containing a priest\'s supplies: a backpack, a blanket, 10 candles, a tinderbox, an alms box, 2 blocks of incense, a censer, vestments, 2 days\' rations, and a waterskin.'
    },
    'Dungeon Delver\'s Pack': {
        name: 'Dungeon Delver\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 48,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'dungeon'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Crowbar' }] },
                { pool: [{ weight: 100, itemName: 'Hammer' }] },
                { pool: [{ weight: 100, itemName: 'Piton', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Torch', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Tinderbox' }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] },
                { pool: [{ weight: 100, itemName: 'Rope' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack optimized for dungeon exploration. Contains a backpack, crowbar, hammer, 10 pitons, 10 torches, a tinderbox, 10 days\' rations, and a waterskin. Includes 50 feet of hempen rope.'
    },
    'Dungeoneer\'s Pack': {
        name: 'Dungeoneer\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 48,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'dungeon'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Crowbar' }] },
                { pool: [{ weight: 100, itemName: 'Hammer' }] },
                { pool: [{ weight: 100, itemName: 'Piton', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Torch', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Tinderbox' }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] },
                { pool: [{ weight: 100, itemName: 'Rope' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack optimized for underground exploration. Contains a backpack, crowbar, hammer, 10 pitons, 10 torches, a tinderbox, 10 days\' rations, and a waterskin. Includes 50 feet of hempen rope.'
    },
    'Scholar\'s Pack': {
        name: 'Scholar\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 49,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'wizard'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Book of Lore' }] },
                { pool: [{ weight: 100, itemName: 'Bottle of Ink' }] },
                { pool: [{ weight: 100, itemName: 'Ink Pen' }] },
                { pool: [{ weight: 100, itemName: 'Parchment', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Bag of Sand' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack containing a scholar\'s supplies: a backpack, a book of lore, a bottle of ink, an ink pen, 10 sheets of parchment, and a little bag of sand.'
    },
    'Traveler\'s Pack': {
        name: 'Traveler\'s Pack',
        type: 'box',
        rarity: 'common',
        weight: 43,
        spawnWeight: 1.0,
        tags: ['gear', 'pack', 'general'],
        boxContents: {
            drops: [
                { pool: [{ weight: 100, itemName: 'Backpack' }] },
                { pool: [{ weight: 100, itemName: 'Bedroll' }] },
                { pool: [{ weight: 100, itemName: 'Mess Kit' }] },
                { pool: [{ weight: 100, itemName: 'Rations', quantity: 10 }] },
                { pool: [{ weight: 100, itemName: 'Waterskin' }] },
                { pool: [{ weight: 100, itemName: 'Traveler\'s Clothes' }] },
                { pool: [{ weight: 100, itemName: 'Rope' }] }
            ],
            consumeOnOpen: true
        },
        description: 'A backpack for long-distance travel: a backpack, a bedroll, a mess kit, 10 days\' rations, a waterskin, traveler\'s clothes, and 50 feet of hempen rope.'
    },

    // ===== AMMUNITION =====

    'Arrow': {
        name: 'Arrow',
        type: 'item',
        rarity: 'common',
        weight: 0.05,
        spawnWeight: 1.0,
        tags: ['ammunition', 'bow'],
        description: 'Ammunition for a bow. Typically carried in quivers of 20 arrows. Essential for archers.'
    },
    'Bolt': {
        name: 'Bolt',
        type: 'item',
        rarity: 'common',
        weight: 0.075,
        spawnWeight: 1.0,
        tags: ['ammunition', 'crossbow'],
        description: 'Ammunition for a crossbow. Shorter and heavier than arrows, designed for crossbow use.'
    },

    // ===== SPECIAL ITEMS =====

    'Insignia': {
        name: 'Insignia',
        type: 'item',
        rarity: 'common',
        weight: 0,
        spawnWeight: 1.0,
        tags: ['gear', 'roleplay', 'insignia'],
        description: 'A badge, banner, or token representing rank, membership, or authority. Useful for roleplaying and establishing credentials.'
    },
    'Martial Arts': {
        name: 'Martial Arts',
        type: 'weapon',
        rarity: 'common',
        weight: 0,
        damage: { dice: '1d4', damageType: 'bludgeoning', versatile: '1d6' },
        weaponProperties: ['finesse', 'unarmed'],
        spawnWeight: 1.0,
        tags: ['monk', 'unarmed', 'natural'],
        description: 'The monk\'s unarmed strike. Uses Dexterity instead of Strength and deals increased damage at higher levels.'
    },
};
