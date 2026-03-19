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
            description: 'A magical enhancement that improves the weapon\'s accuracy and striking power. The weapon becomes supernaturally sharp and well-balanced, striking true more often and cutting deeper.',
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
            description: 'A potent magical enhancement that significantly improves the weapon\'s combat effectiveness. The weapon hums with arcane energy, seeking its target with unerring precision and delivering devastating blows.',
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
            description: 'An exceptionally powerful magical enhancement that transforms the weapon into an instrument of legend. The weapon pulses with visible arcane energy, striking with supernatural force and nearly flawless accuracy.',
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
            description: 'The weapon bursts into flame upon command, dealing additional fire damage and illuminating the surrounding area. The flames do not harm the wielder but sear foes with each strike. Ancient runes of fire glow along the blade when activated.',
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
            description: 'The weapon is sheathed in supernatural cold, freezing whatever it touches. A pale white aura surrounds the blade, and each strike leaves frost on the target\'s wound, slowing them with supernatural chill.',
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
            description: 'Crackling arcs of lightning dance across this weapon, delivering painful electrical shocks to anyone it strikes. The air around the weapon hums with ozone, and blue sparks fly with each impact.',
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
            description: 'Each strike from this weapon is accompanied by a deafening thunderclap that can be heard for hundreds of feet. The concussion from impacts can knock foes back and leave them disoriented from the deafening noise.',
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
            description: 'The weapon drips with corrosive acid that continues to eat away at armor and flesh after each strike. Dark green ichor coats the blade, hissing as it melts through defenses and continues burning the wound.',
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
            description: 'A sinister coating of supernatural poison coats this weapon, weakening foes with every wound. The poison is distilled from venomous creatures and dark alchemy, causing progressive weakness in those struck.',
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
            description: 'Consecrated by divine rites, this weapon glows with holy light that burns the unholy. Radiant energy swirls around the blade, dealing extra damage to creatures of darkness and evil while leaving the wielder untouched.',
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
            description: 'This cursed weapon draws vitality from those it strikes, transferring their life force to the wielder. Dark red veins pulse along the blade as it feeds, and the wielder feels a rush of healing energy with each killing blow.',
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
            description: 'The edge of this weapon is supernaturally sharp, capable of striking致命 wounds with remarkable frequency. The blade seems to seek vital points on its own, turning glancing blows into devastating critical hits.',
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
            description: 'This weapon has been honed to perfection by magical means, its edge so impossibly sharp that it can slip through the smallest gaps in armor. Every swing has a chance to strike a致命 point, making even near-misses into devastating hits.',
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
            description: 'Enchanted to strike with exceptional force, this weapon deals more damage with each blow. The weapon feels unnaturally heavy and solid in the hand, transferring more kinetic energy into each impact for crushing wounds.',
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
            description: 'This thrown weapon magically returns to the wielder\'s hand immediately after each attack. An invisible tether connects weapon to wielder, pulling it back through the air regardless of obstacles or distance.',
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
            description: 'A powerful variant of vampiric enchantment that drains significantly more vitality from victims. The weapon pulses with dark crimson energy that gushes forth with each strike, healing the wielder for substantial amounts.',
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
            description: 'A magical enhancement that makes the armor supernaturally resistant to blows without adding weight. The material seems to harden when struck, turning aside attacks that would have found purchase in mundane armor.',
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
            description: 'A potent magical enhancement that significantly improves the armor\'s protective qualities. The armor gleams with protective enchantments, and blows that connect seem to strike an invisible barrier just beneath the surface.',
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
            description: 'The wearer is protected from fire and heat, as if continually under the effects of a protection spell. Flames lick harmlessly at the armor, and the wearer can walk through infernos that would incinerate ordinary mortals.',
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
            description: 'Magical warmth protects the wearer from the bitterest cold. Frost cannot form on the armor, and the wearer remains comfortable in temperatures that would freeze others solid, protected by an unseen aura of heat.',
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
            description: 'The armor conducts electricity harmlessly away from the wearer, dispersing lightning strikes across its surface. Lightning bolts crackle harmlessly across the enchanted metal, leaving the wearer untouched.',
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
            description: 'The armor is protected from corrosion by potent magical wards. Acid sizzles harmlessly on the surface without eating through the metal, and the wearer is protected from splashes of corrosive substances.',
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
            description: 'Magical cleansing properties protect the wearer from toxins and venoms. Poisonous fumes and coated weapons cannot harm the wearer, as the enchantment neutralizes poisons before they can take effect.',
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
            description: 'Dark protective wards shield the wearer from the draining touch of undeath and necrotic energies. The armor glimmers faintly with opposing light that pushes back against death magic and life-draining attacks.',
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
            description: 'The armor can absorb and disperse divine and radiant energy without harm. Holy fire and celestial beams wash over the wearer like water, their blinding intensity reduced to manageable levels.',
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
            description: 'The wearer is protected from sonic damage and concussive force. Thunderous impacts and deafening blasts are dampened by the armor, which absorbs and disperses the energy harmlessly.',
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
            description: 'An incredibly powerful enchantment that provides resistance to all forms of damage. The armor seems to exist partially out of phase with reality, causing attacks of all types to glance off or pass harmlessly through.',
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
            description: 'The ultimate weapon of a paladin, consecrated to destroy evil. This blade glows with blinding holy light when wielded by a righteous warrior, dealing devastating damage to fiends and undead while protecting the wielder from dark magic.',
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
            description: 'Forged specifically to hunt the greatest of beasts, this weapon pulses with dragon-slaying magic. Runes of ancient dragon hunters glow when chromatic or metallic dragons are near, and the blade strikes true against their armored scales.',
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
            description: 'Blessed by celestial powers for the specific purpose of hunting fiends. The weapon bears holy symbols that burn with cold fire when in the presence of demons, causing extra pain to creatures of the lower planes.',
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
            description: 'Consecrated to disrupt the unnatural forces that animate the dead. The weapon glows with positive energy that burns the undead, and its touch can momentarily restore peace to tormented spirits even as it destroys their forms.',
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
            description: 'A malevolent enchantment that subtly sabotages the wielder\'s combat ability. The weapon feels slightly off-balance or slippery, causing blows to miss their mark or strike with reduced force despite the wielder\'s best efforts.',
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
            description: 'A stronger version of the penalty curse that significantly impairs the wielder\'s fighting ability. The weapon actively fights against being used effectively, as if it has a will of its own that opposes its owner.',
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
            description: 'The armor or weapon saps the wearer\'s physical strength, leaving them feeling constantly exhausted and feeble. Muscles seem to wither under its influence, and once-trivial feats of strength become impossibly difficult.',
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
            description: 'A maddening curse that clouds the mind and disrupts logical thought. The wearer struggles with memory, reasoning, and mental clarity, as if a thick fog has settled over their intellect.',
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
            description: 'The cursed item disrupts the wearer\'s coordination and reflexes. Simple tasks become fumbling ordeals, and the wearer constantly drops things, trips over nothing, and fails at feats of agility they once performed effortlessly.',
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
            description: 'The item drains vitality from the wearer, leaving them weak and sickly. Wounds heal slowly, diseases take hold more easily, and the wearer feels constantly exhausted as if recovering from a terrible illness.',
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
            description: 'The curse clouds judgment and perception, making the wearer dangerously gullible and unaware. They fail to notice obvious threats, misjudge situations completely, and lose touch with their intuitive and perceptive abilities.',
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
            description: 'The wearer becomes unnaturally off-putting and difficult to be around. People feel instinctively uncomfortable or repulsed in their presence, and attempts at persuasion or leadership almost always fail despite the wearer\'s best efforts.',
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
            description: 'The cursed item makes the wearer supernaturally susceptible to fire. Even small flames cause agonizing burns, and the wearer takes double damage from any fire-based attack as if their very skin were coated in oil.',
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
            description: 'The curse robs the wearer of all natural resistance to cold. Chilly temperatures become painfully freezing, and the wearer takes double damage from cold attacks as if they have no protection against the bitter chill.',
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
            description: 'A malevolent curse that causes the weapon to feed on its wielder\'s vitality. Each time the weapon strikes a foe, it also tears life force from the one who wields it, draining blood and energy in exchange for the power it grants.',
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
            description: 'Once donned, this equipment refuses to be removed by any means short of powerful magic. The item fuses to the wearer\'s body, becoming like a second skin that cannot be stripped away no matter how desperately they wish to be free of it.',
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
            description: 'The cursed weapon fills the wielder with uncontrollable battle fury. They must attack every round without pause or be overwhelmed by the curse\'s wrath, leaving them disadvantaged as the weapon punishes their hesitation.',
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
            description: 'The cursed equipment becomes impossibly heavy, as if made of solid lead. Every movement becomes a struggle, and the wearer moves with painful slowness under the crushing weight that only they can feel.',
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
            description: 'The cursed armor or weapon makes the wearer painfully sensitive to light. Bright daylight or magical illumination causes agonizing pain and impairs vision, leaving the wearer disadvantaged in any well-lit environment.',
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
            description: 'A twisted version of invisibility that hides the wearer from sight but impairs their ability to interact with the world. The wearer cannot see themselves, and their own movements become uncertain and clumsy while invisible.',
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
            description: 'The cursed item causes terrifying hallucinations that distort reality. Allies appear as enemies, enemies as trusted friends, and the wearer cannot trust their own senses as the line between nightmare and reality blurs.',
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
            description: 'A cruel curse that converts violence into pain for the wielder. Every successful strike causes wounds to mysteriously appear on the wielder\'s body, as if the weapon siphons blood in exchange for the damage it deals.',
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
        description: `A magical enhancement that boosts the wearer's physical power by +${bonus}. The item channels divine or arcane energy to strengthen muscles, increase carrying capacity, and improve all abilities dependent on raw physical force.`,
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
        description: `A magical enhancement that heightens the wearer's agility and reflexes by +${bonus}. The item grants supernatural grace, improving balance, reaction time, and all skills that depend on quick movements and precise control.`,
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
        description: `A magical enhancement that hardens the wearer's vitality and endurance by +${bonus}. The item grants supernatural health, allowing the wearer to resist disease, endure hardship, and recover more quickly from injuries.`,
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
        description: `A magical enhancement that sharpens the mind and intellect by +${bonus}. The item enhances memory, reasoning, and analytical ability, making the wearer more capable in academic pursuits, arcane studies, and logical problem-solving.`,
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
        description: `A magical enhancement that attunes the wearer to the world around them by +${bonus}. The item heightens perception, intuition, and understanding of people and nature, granting insight that transcends ordinary senses.`,
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
        description: `A magical enhancement that magnifies the wearer's personal presence by +${bonus}. The item makes the wearer more imposing, persuasive, and commanding, improving leadership abilities and social influence through supernatural force of personality.`,
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
