/**
 * Default Enchantments Library
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
 * @module constants/DefaultEnchantments
 */

import type { EquipmentModification } from '../core/types/Equipment.js';

// ============================================================================
// ENCHANTMENT_LIBRARY
// ============================================================================

/**
 * Enchantment Library
 *
 * Comprehensive collection of predefined enchantments and curses that can be
 * applied to equipment at runtime using EquipmentModifier.
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
