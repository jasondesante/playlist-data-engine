/**
 * Magic Items Database
 *
 * Example Magic Items demonstrating all equipment system capabilities.
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
 *
 * Previously located in src/utils/equipmentConstants.ts.
 *
 * @module constants/MagicItems
 */

import type { EnhancedEquipment } from '../core/types/Equipment.js';

/**
 * Example Magic Items demonstrating all equipment system capabilities
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
        description: 'A magic sword that can burst into flame, dealing extra fire damage and shedding light. The wielder can ignite or extinguish the flames as a bonus action.',
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
        description: 'A legendary weapon that decapitates creatures on a natural 20. One of the most powerful weapons in existence, capable of instantly slaying even the mightiest foes.',
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
        description: 'A freezing cold sword that deals extra cold damage and grants its wielder resistance to fire. Can extinguish non-magical flames with a mere thought.',
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
        description: 'A magical longsword enchanted against dragonkind. Deals devastating extra damage to dragons and glows in the presence of these ancient creatures.',
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

    /**
     * Lightning Lance - Lightning damage reach weapon
     * Demonstrates: damage_bonus with lightning type, reach property
     */
    {
        name: 'Lightning Lance',
        type: 'weapon',
        rarity: 'rare',
        weight: 6,
        damage: { dice: '1d6', damageType: 'piercing' },
        weaponProperties: ['reach', 'two-handed'],
        description: 'A spear crackling with electrical energy that extends your reach. Deals extra lightning damage on hits and can arc to nearby enemies.',
        properties: [
            {
                type: 'damage_bonus',
                target: 'lightning_damage',
                value: '1d6',
                description: '+1d6 lightning damage on hit'
            },
            {
                type: 'special_property',
                target: 'lightning_arc',
                value: 'half_damage',
                description: 'On critical hit, lightning arcs to another creature within 10ft for half damage'
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'weapon', 'lightning', 'reach']
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
        description: 'Finely crafted armor made of mithral, a light and incredibly strong metal. Counts as light armor for all class features and imposes no disadvantage on Stealth.',
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
     * +1 Chain Shirt - Light armor with enhancement
     * Demonstrates: stacking AC bonuses for light armor
     */
    {
        name: '+1 Chain Shirt',
        type: 'armor',
        rarity: 'rare',
        weight: 20,
        acBonus: 14,  // Base 13 + 1 enhancement
        description: 'Magically reinforced chain armor that provides improved protection without adding extra weight. The enchanted metal links deflect blows more effectively than ordinary chain.',
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 14,
                description: 'Fixed AC: 14 (13 base + 1 enhancement)'
            }
        ],
        spawnWeight: 0.15,
        source: 'custom',
        tags: ['magic', 'armor', 'light', 'enhanced']
    },

    /**
     * +2 Chain Shirt - Light armor with greater enhancement
     * Demonstrates: higher stacking AC bonuses
     */
    {
        name: '+2 Chain Shirt',
        type: 'armor',
        rarity: 'very_rare',
        weight: 20,
        acBonus: 15,  // Base 13 + 2 enhancement
        description: 'Superiorly enchanted chain armor with powerful protective magic. The links are magically hardened to provide exceptional defense while remaining flexible.',
        properties: [
            {
                type: 'passive_modifier',
                target: 'ac',
                value: 15,
                description: 'Fixed AC: 15 (13 base + 2 enhancement)'
            }
        ],
        spawnWeight: 0.1,
        source: 'custom',
        tags: ['magic', 'armor', 'light', 'enhanced']
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
        description: 'Magically enhanced plate armor that provides superior protection. The enchantment improves the armor\'s protective qualities while maintaining its strength requirement.',
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
        description: 'Exquisitely crafted elven armor that functions as light armor for all purposes. Can be worn even by those without armor proficiency and makes no sound when moved.',
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
        description: 'A belt woven from giant hair that grants the strength of a hill giant. While worn, your Strength score becomes 21, regardless of your actual strength.',
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
        description: 'A protective amulet that hides you from divination magic. Makes you difficult to detect through magical means and grants some protection against spells.',
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
        description: 'A forehead band embroidered with intellectual symbols. While worn, your Intelligence score becomes 19, making you brilliant regardless of your natural intellect.',
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
        description: 'Silent magical boots that make you an expert at stealth. Your steps make no sound, and you gain advantage or bonuses to Stealth checks.',
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
     * Demonstrates: granting proficiency with tools and skills
     */
    {
        name: 'Gloves of Thievery',
        type: 'item',
        rarity: 'uncommon',
        weight: 0.1,
        description: 'Magical gloves that make you a master of larceny. Grants expertise with thieves\' tools and proficiency in sleight of hand.',
        grantsSkills: [
            { skillId: 'sleight_of_hand', level: 'proficient' }
        ],
        properties: [
            {
                type: 'passive_modifier',
                target: 'sleight_of_hand',
                value: 2,
                description: '+2 to Sleight of Hand checks'
            },
            {
                type: 'special_property',
                target: 'thieves_tools_expertise',
                value: true,
                description: 'Advantage on checks using thieves\' tools'
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
     * Demonstrates: granting features via inline mini-features
     */
    {
        name: 'Boots of Speed',
        type: 'item',
        rarity: 'rare',
        weight: 1,
        description: 'Magical boots that dramatically increase your speed and grant freedom of movement. You can dash as a bonus action and leave no trace when you walk.',
        properties: [
            {
                type: 'passive_modifier',
                target: 'speed',
                value: 10,
                description: '+10 walking speed'
            }
        ],
        grantsFeatures: [
            {
                id: 'boots_of_speed_dash',
                name: 'Speed Burst',
                description: 'You can take the Dash action as a bonus action, and moving leaves no trace.',
                effects: [
                    {
                        type: 'special_property',
                        target: 'bonus_action_dash',
                        value: true,
                        description: 'Dash as bonus action'
                    }
                ],
                source: 'equipment_inline'
            },
            {
                id: 'boots_of_speed_freedom',
                name: 'Unfettered Movement',
                description: 'Your movement is unimpeded by difficult terrain, and spells and effects can neither reduce your speed nor cause you to be restrained.',
                effects: [
                    {
                        type: 'special_property',
                        target: 'ignore_difficult_terrain',
                        value: true,
                        description: 'Ignore difficult terrain'
                    },
                    {
                        type: 'special_property',
                        target: 'freedom_of_movement',
                        value: true,
                        description: 'Immunity to speed reduction and restraint'
                    }
                ],
                source: 'equipment_inline'
            }
        ],
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
        description: 'Magical boots that enhance your mobility. Move faster, jump farther, and require less running start for long and high jumps.',
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
        description: 'Magical boots that grant the power of flight. You can fly at will as a bonus action, though overuse temporarily exhausts their magic.',
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
        description: 'A protective ring that enhances your defense. Grants a bonus to Armor Class and all saving throws, stacking with other protective items.',
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
        description: 'A protective amulet that grants complete immunity to poison. Protects against both poison damage and the poisoned condition.',
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
        description: 'A magical cloak that wraps you in protective energy. Grants bonuses to Armor Class and saving throws that stack with rings of protection.',
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
        description: 'Magical lenses that grant darkvision. You can see in darkness as if it were dim light, out to a range of 60 feet.',
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
        description: 'A magical lantern that reveals invisible creatures and objects. Sheds light in a 60-foot radius and exposes anything hidden by illusion magic.',
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
        description: 'A magical ring that can store spells for later use. The caster places spells into the ring, and any creature can cast them regardless of class.',
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
        description: 'A small pearl that glitters with magical energy. Once per day, you can use it to recover a spent 3rd level spell slot.',
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
        description: 'A wand that fires unerring magic missiles. Contains 7 charges that refresh each dawn at sunrise.',
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
        description: 'A maliciously enchanted sword that appears magical but impairs your combat abilities. Once attuned, it cannot be removed without breaking the curse.',
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
        description: 'A cursed belt that appears beneficial but actually drains your strength. Once donned, it cannot be removed until the curse is broken.',
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
        description: 'A cursed helmet that slowly corrupts your alignment, turning you toward your moral opposite. Only detectable when it\'s too late.',
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
        description: 'A druidic sickle blessed by moonlight. Deals extra radiant damage at night and gleams with silvery light when the moon is visible.',
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
        description: 'A brilliant blade that thrives in sunlight but weakens in darkness. Deals devastating radiant damage during the day but becomes clumsy at night.',
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
        description: 'Magically crafted dwarven armor that only works properly for dwarf characters. Grants additional protection and saving throw bonuses to its intended users.',
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
        description: 'An arcane staff that enhances magical abilities for wizards. Grants bonuses to spell attacks and save DC, but only functions for wizards.',
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
        description: 'A longsword enchanted with fiery magic. Burns with magical flame and sheds light when its power is activated.',
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
        description: 'A longsword enchanted with icy magic. Freezes with cold power and can extinguish flames when wielded.',
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
