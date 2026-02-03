/**
 * Custom Equipment Examples
 *
 * This file demonstrates how to create and register custom equipment
 * with various properties, effects, and features.
 *
 */

import { ExtensionManager } from '../src/core/extensions/ExtensionManager.js';
import type { EnhancedEquipment } from '../src/core/types/Equipment.js';

// ============================================================
// Example 1: Magic Weapon with Fire Damage
// ============================================================

/**
 * Flame Tongue - A rare sword that deals extra fire damage
 * and sheds bright light.
 */
export const flameTongue: EnhancedEquipment = {
    name: 'Flame Tongue',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'fire',
            value: '2d6',
            description: '+2d6 fire damage on hit'
        },
        {
            type: 'special_property',
            target: 'light',
            value: 'bright_light_40ft',
            description: 'Sheds bright light in a 40ft radius and dim light for 40ft beyond'
        }
    ],
    grantsFeatures: ['fire_resistance'],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'fire', 'weapon', 'flame']
};

// ============================================================
// Example 2: Stat-Increasing Items
// ============================================================

/**
 * Belt of Giant Strength - Sets STR to 19 if lower
 */
export const beltOfGiantStrength: EnhancedEquipment = {
    name: 'Belt of Giant Strength',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    properties: [
        {
            type: 'stat_bonus',
            target: 'STR',
            value: 19,
            description: 'Strength becomes 19 if lower',
            condition: { type: 'while_equipped', value: true }
        }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'wondrous', 'strength']
};

/**
 * Amulet of Health - Increases max HP
 */
export const amuletOfHealth: EnhancedEquipment = {
    name: 'Amulet of Health',
    type: 'item',
    rarity: 'rare',
    weight: 0.1,
    properties: [
        {
            type: 'passive_modifier',
            target: 'max_hp',
            value: 20,
            description: '+20 maximum hit points',
            stackable: true
        }
    ],
    spawnWeight: 0.3,
    source: 'custom',
    tags: ['magic', 'wondrous', 'health']
};

/**
 * Headband of Intellect - Sets INT to 19 and grants skills
 */
export const headbandOfIntellect: EnhancedEquipment = {
    name: 'Headband of Intellect',
    type: 'item',
    rarity: 'rare',
    weight: 0.1,
    properties: [
        {
            type: 'stat_bonus',
            target: 'INT',
            value: 19,
            description: 'Intelligence becomes 19 if lower'
        }
    ],
    grantsSkills: [
        { skillId: 'arcana', level: 'proficient' },
        { skillId: 'history', level: 'proficient' }
    ],
    spawnWeight: 0.3,
    source: 'custom',
    tags: ['magic', 'wondrous', 'intelligence']
};

// ============================================================
// Example 3: AC-Boosting Items
// ============================================================

/**
 * Ring of Protection - +1 AC and +1 saves
 */
export const ringOfProtection: EnhancedEquipment = {
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
    tags: ['magic', 'ring', 'defense']
};

/**
 * +1 Chain Mail - Magic armor with +1 AC bonus
 */
export const plusOneChainMail: EnhancedEquipment = {
    name: '+1 Chain Mail',
    type: 'armor',
    rarity: 'rare',
    weight: 55,
    acBonus: 17, // 16 base + 1 magic
    properties: [
        {
            type: 'passive_modifier',
            target: 'ac',
            value: 17,
            description: 'Base AC: 17 (16 + 1 magic)'
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
            value: 13,
            description: 'Requires STR 13'
        }
    ],
    spawnWeight: 0.3,
    source: 'custom',
    tags: ['magic', 'armor', 'heavy', 'plus_one']
};

// ============================================================
// Example 4: Skill-Granting Items
// ============================================================

/**
 * Boots of Elvenkind - Stealth expertise
 */
export const bootsOfElvenkind: EnhancedEquipment = {
    name: 'Boots of Elvenkind',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    properties: [
        {
            type: 'passive_modifier',
            target: 'stealth_check',
            value: 2,
            description: '+2 to Stealth checks'
        },
        {
            type: 'special_property',
            target: 'silent_walking',
            value: true,
            description: 'Walk silently with no penalty'
        }
    ],
    grantsSkills: [
        {
            skillId: 'stealth',
            level: 'expertise'
        }
    ],
    spawnWeight: 0.5,
    source: 'custom',
    tags: ['magic', 'wondrous', 'stealth', 'boots']
};

/**
 * Cloak of Billowing - Performance proficiency
 */
export const cloakOfBillowing: EnhancedEquipment = {
    name: 'Cloak of Billowing',
    type: 'item',
    rarity: 'common',
    weight: 1,
    properties: [
        {
            type: 'special_property',
            target: 'billowing',
            value: true,
            description: 'Dramatically billows on command'
        }
    ],
    grantsSkills: [
        {
            skillId: 'performance',
            level: 'proficient'
        }
    ],
    spawnWeight: 0.7,
    source: 'custom',
    tags: ['magic', 'clothing', 'performance']
};

/**
 * Gloves of Thievery - Thieves' Tools expertise
 */
export const glovesOfThievery: EnhancedEquipment = {
    name: 'Gloves of Thievery',
    type: 'item',
    rarity: 'uncommon',
    weight: 0.1,
    properties: [
        {
            type: 'passive_modifier',
            target: 'thieves_tools_check',
            value: 2,
            description: '+2 to checks with thieves tools'
        }
    ],
    grantsSkills: [
        {
            skillId: 'thieves_tools',
            level: 'expertise'
        }
    ],
    spawnWeight: 0.4,
    source: 'custom',
    tags: ['magic', 'wondrous', 'thieves', 'dexterity']
};

// ============================================================
// Example 5: Feature-Granting Items
// ============================================================

/**
 * Boots of Speed - Freedom of movement and speed bonus
 */
export const bootsOfSpeed: EnhancedEquipment = {
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
        },
        {
            type: 'special_property',
            target: 'freedom_of_movement',
            value: true,
            description: 'Cannot be restrained, grappled, or paralyzed'
        },
        {
            type: 'special_property',
            target: 'action_economy',
            value: 'haste_action',
            description: 'Can use Haste as an action'
        }
    ],
    grantsFeatures: ['freedom_of_movement'],
    spawnWeight: 0.15,
    source: 'custom',
    tags: ['magic', 'wondrous', 'speed', 'mobility']
};

/**
 * Amulet of the Planes - Plane Shift ability
 */
export const amuletOfThePlanes: EnhancedEquipment = {
    name: 'Amulet of the Planes',
    type: 'item',
    rarity: 'very_rare',
    weight: 0.1,
    properties: [
        {
            type: 'special_property',
            target: 'plane_shift',
            value: 'daily',
            description: 'Cast Plane Shift once per day'
        }
    ],
    grantsFeatures: ['plane_shift'],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'wondrous', 'planar', 'teleportation']
};

/**
 * Ring of Darkvision - Darkvision ability
 */
export const ringOfDarkvision: EnhancedEquipment = {
    name: 'Ring of Darkvision',
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
    spawnWeight: 0.4,
    source: 'custom',
    tags: ['magic', 'ring', 'vision']
};

/**
 * Cloak of the Bat - Flight and echolocation
 */
export const cloakOfTheBat: EnhancedEquipment = {
    name: 'Cloak of the Bat',
    type: 'item',
    rarity: 'rare',
    weight: 1,
    properties: [
        {
            type: 'ability_unlock',
            target: 'flight',
            value: true,
            description: 'Can fly as a bat'
        },
        {
            type: 'special_property',
            target: 'echolocation',
            value: true,
            description: 'Blindsight 60ft when in darkness'
        }
    ],
    grantsFeatures: ['darkvision'],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'clothing', 'flight', 'darkness']
};

// ============================================================
// Example 6: Conditional Effects
// ============================================================

/**
 * Dragon Slayer Axe - Extra damage vs dragons
 */
export const dragonSlayerAxe: EnhancedEquipment = {
    name: 'Dragon Slayer Axe',
    type: 'weapon',
    rarity: 'very_rare',
    weight: 5,
    damage: { dice: '1d12', damageType: 'slashing' },
    weaponProperties: ['two-handed'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'dragon',
            value: '3d6',
            condition: { type: 'vs_creature_type', value: 'dragon' },
            description: '+3d6 damage vs dragons'
        }
    ],
    spawnWeight: 0.05,
    source: 'custom',
    tags: ['magic', 'weapon', 'dragon', 'slayer']
};

/**
 * Moon Blade - Extra damage at night
 */
export const moonBlade: EnhancedEquipment = {
    name: 'Moon Blade',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    properties: [
        {
            type: 'damage_bonus',
            target: 'radiant',
            value: '2d6',
            condition: { type: 'at_time_of_day', value: 'night' },
            description: '+2d6 radiant damage at night'
        },
        {
            type: 'damage_bonus',
            target: 'radiant',
            value: '1d6',
            condition: { type: 'at_time_of_day', value: 'dawn' },
            description: '+1d6 radiant damage at dawn'
        }
    ],
    spawnWeight: 0.15,
    source: 'custom',
    tags: ['magic', 'weapon', 'moon', 'radiant']
};

/**
 * Elven Chain - Sleep immunity for Elves only
 */
export const elvenChain: EnhancedEquipment = {
    name: 'Elven Chain',
    type: 'armor',
    rarity: 'rare',
    weight: 20,
    acBonus: 16,
    properties: [
        {
            type: 'special_property',
            target: 'sleep_immunity',
            value: true,
            condition: { type: 'wielder_race', value: 'Elf' },
            description: 'Immunity to magic that puts you to sleep (Elf only)'
        },
        {
            type: 'passive_modifier',
            target: 'stealth_disadvantage',
            value: false,
            condition: { type: 'wielder_race', value: 'Elf' },
            description: 'No stealth disadvantage (Elf only)'
        }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'armor', 'elf', 'stealth']
};

/**
 * Holy Avenger - Paladin-specific bonuses
 */
export const holyAvenger: EnhancedEquipment = {
    name: 'Holy Avenger',
    type: 'weapon',
    rarity: 'legendary',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['versatile'],
    properties: [
        {
            type: 'passive_modifier',
            target: 'saving_throws',
            value: 3,
            condition: { type: 'wielder_class', value: 'Paladin' },
            description: '+3 to saving throws (Paladin only)'
        },
        {
            type: 'damage_bonus',
            target: 'fiend',
            value: '2d6',
            condition: { type: 'wielder_class', value: 'Paladin' },
            description: '+2d6 radiant damage vs fiends and undead (Paladin only)'
        },
        {
            type: 'special_property',
            target: 'aura',
            value: 'anti-magic_30ft',
            condition: { type: 'wielder_class', value: 'Paladin' },
            description: 'Anti-magic aura 30ft radius (Paladin only)'
        }
    ],
    grantsFeatures: ['divine_smite'],
    spawnWeight: 0,
    source: 'custom',
    tags: ['magic', 'weapon', 'paladin', 'holy', 'legendary']
};

// ============================================================
// Example 7: Spell-Granting Items
// ============================================================

/**
 * Ring of Spell Storing - Store and cast spells
 */
export const ringOfSpellStoring: EnhancedEquipment = {
    name: 'Ring of Spell Storing',
    type: 'item',
    rarity: 'rare',
    weight: 0.1,
    properties: [
        {
            type: 'special_property',
            target: 'spell_storing',
            value: 5,
            description: 'Can store up to 5 levels of spells'
        }
    ],
    grantsSpells: [
        { spellId: 'fireball', level: 3, uses: 1, recharge: 'dawn' },
        { spellId: 'shield', level: 1, uses: 1, recharge: 'dawn' }
    ],
    spawnWeight: 0.2,
    source: 'custom',
    tags: ['magic', 'ring', 'spell']
};

/**
 * Scroll of Fireball - One-time use spell
 */
export const scrollOfFireball: EnhancedEquipment = {
    name: 'Scroll of Fireball',
    type: 'item',
    rarity: 'uncommon',
    weight: 0.1,
    grantsSpells: [
        { spellId: 'fireball', level: 3, uses: 1 }
    ],
    spawnWeight: 0.4,
    source: 'custom',
    tags: ['magic', 'scroll', 'consumable', 'fire']
};

/**
 * Wand of Magic Missiles - Cast Magic Missile at will
 */
export const wandOfMagicMissiles: EnhancedEquipment = {
    name: 'Wand of Magic Missiles',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    grantsSpells: [
        { spellId: 'magic_missile', level: 1, uses: null }
        // uses: null means unlimited uses
    ],
    spawnWeight: 0.3,
    source: 'custom',
    tags: ['magic', 'wand', 'evocation']
};

// ============================================================
// Example 8: Cursed Items
// ============================================================

/**
 * Cursed Sword of Pain - Good stats, but with a curse
 */
export const cursedSwordOfPain: EnhancedEquipment = {
    name: 'Cursed Sword of Pain',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    weaponProperties: ['finesse'],
    properties: [
        {
            type: 'passive_modifier',
            target: 'attack_roll',
            value: 1,
            description: '+1 to attack rolls'
        },
        {
            type: 'damage_bonus',
            target: 'necrotic',
            value: '1d6',
            description: '+1d6 necrotic damage'
        },
        {
            type: 'special_property',
            target: 'curse',
            value: true,
            description: 'Cannot be unequipped once donned; deals 1 damage on hit'
        }
    ],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'weapon', 'cursed', 'necrotic']
};

/**
 * Belt of Feebleness - Looks good, but actually hurts
 */
export const beltOfFeebleness: EnhancedEquipment = {
    name: 'Belt of Feebleness',
    type: 'item',
    rarity: 'uncommon',
    weight: 1,
    // Looks like Belt of Giant Strength but is cursed
    properties: [
        {
            type: 'stat_bonus',
            target: 'STR',
            value: -4,
            description: '-4 Strength (cursed!)',
            condition: { type: 'while_equipped', value: true }
        },
        {
            type: 'special_property',
            target: 'curse',
            value: true,
            description: 'Attuner believes it gives +4 STR until removed'
        }
    ],
    spawnWeight: 0.05,
    source: 'custom',
    tags: ['magic', 'wondrous', 'cursed', 'trap']
};

// ============================================================
// Registration Function
// ============================================================

/**
 * Register all custom equipment examples with ExtensionManager
 *
 * Call this function to add all example equipment to the game:
 *
 * @example
 * ```typescript
 * import { registerCustomEquipment } from './examples/customEquipmentExamples.js';
 * registerCustomEquipment();
 * ```
 */
export function registerCustomEquipment(): void {
    const manager = ExtensionManager.getInstance();

    const allCustomEquipment: EnhancedEquipment[] = [
        // Magic weapons
        flameTongue,
        dragonSlayerAxe,
        moonBlade,
        holyAvenger,
        cursedSwordOfPain,

        // Stat-boosting items
        beltOfGiantStrength,
        amuletOfHealth,
        headbandOfIntellect,
        beltOfFeebleness,

        // AC-boosting items
        ringOfProtection,
        plusOneChainMail,

        // Skill-granting items
        bootsOfElvenkind,
        cloakOfBillowing,
        glovesOfThievery,

        // Feature-granting items
        bootsOfSpeed,
        amuletOfThePlanes,
        ringOfDarkvision,
        cloakOfTheBat,

        // Spell-granting items
        ringOfSpellStoring,
        scrollOfFireball,
        wandOfMagicMissiles,

        // Conditional armor
        elvenChain
    ];

    manager.register('equipment', allCustomEquipment, {
        mode: 'relative',
        validate: true
    });

    console.log(`Registered ${allCustomEquipment.length} custom equipment items`);
}

// ============================================================
// Individual Category Registration Functions
// ============================================================

/**
 * Register only magic weapons
 */
export function registerMagicWeapons(): void {
    const manager = ExtensionManager.getInstance();
    const weapons = [flameTongue, dragonSlayerAxe, moonBlade, holyAvenger, cursedSwordOfPain];
    manager.register('equipment', weapons, { mode: 'relative', validate: true });
}

/**
 * Register only wondrous items
 */
export function registerWondrousItems(): void {
    const manager = ExtensionManager.getInstance();
    const items = [
        beltOfGiantStrength,
        amuletOfHealth,
        headbandOfIntellect,
        ringOfProtection,
        bootsOfElvenkind,
        cloakOfBillowing,
        glovesOfThievery,
        bootsOfSpeed,
        amuletOfThePlanes,
        ringOfDarkvision,
        cloakOfTheBat,
        beltOfFeebleness
    ];
    manager.register('equipment', items, { mode: 'relative', validate: true });
}

/**
 * Register only magic armor
 */
export function registerMagicArmor(): void {
    const manager = ExtensionManager.getInstance();
    const armor = [plusOneChainMail, elvenChain];
    manager.register('equipment', armor, { mode: 'relative', validate: true });
}

/**
 * Register only spell-casting items
 */
export function registerSpellItems(): void {
    const manager = ExtensionManager.getInstance();
    const items = [ringOfSpellStoring, scrollOfFireball, wandOfMagicMissiles];
    manager.register('equipment', items, { mode: 'relative', validate: true });
}

// Export all equipment individually for direct access
export const customEquipment = {
    // Weapons
    flameTongue,
    dragonSlayerAxe,
    moonBlade,
    holyAvenger,
    cursedSwordOfPain,

    // Wondrous items
    beltOfGiantStrength,
    amuletOfHealth,
    headbandOfIntellect,
    beltOfFeebleness,
    ringOfProtection,
    bootsOfElvenkind,
    cloakOfBillowing,
    glovesOfThievery,
    bootsOfSpeed,
    amuletOfThePlanes,
    ringOfDarkvision,
    cloakOfTheBat,

    // Armor
    plusOneChainMail,
    elvenChain,

    // Spell items
    ringOfSpellStoring,
    scrollOfFireball,
    wandOfMagicMissiles
};
