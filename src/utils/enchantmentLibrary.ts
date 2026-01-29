/**
 * Enchantment and Curse Library
 *
 * This file provides a comprehensive collection of predefined enchantments and
 * curses that can be applied to equipment at runtime using EquipmentModifier.
 *
 * These are EquipmentModification objects designed to be applied to existing
 * equipment via:
 * - EquipmentModifier.enchant() - for positive enchantments
 * - EquipmentModifier.curse() - for negative curses
 * - EquipmentModifier.upgrade() - for improvements
 *
 * Part of Phase 7.2: Define common enchantments and curses.
 *
 * @module utils/enchantmentLibrary
 */

import type { EquipmentModification, EquipmentMiniFeature } from '../core/types/Equipment.js';

// ============================================================================
// COMMON ENCHANTMENTS
// ============================================================================

/**
 * +1 Enhancement Enchantment
 * Adds +1 to attack and damage rolls (weapons) or +1 AC (armor)
 */
export const ENCHANTMENT_PLUS_ONE: EquipmentModification = {
    id: 'enchantment_plus_one',
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
};

/**
 * +1 Armor Enhancement Enchantment
 * Adds +1 AC
 */
export const ENCHANTMENT_PLUS_ONE_ARMOR: EquipmentModification = {
    id: 'enchantment_plus_one_armor',
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
};

/**
 * +2 Enhancement Enchantment
 * Adds +2 to attack and damage rolls (weapons) or +2 AC (armor)
 */
export const ENCHANTMENT_PLUS_TWO: EquipmentModification = {
    id: 'enchantment_plus_two',
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
};

/**
 * +2 Armor Enhancement Enchantment
 */
export const ENCHANTMENT_PLUS_TWO_ARMOR: EquipmentModification = {
    id: 'enchantment_plus_two_armor',
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
};

/**
 * +3 Enhancement Enchantment
 * Adds +3 to attack and damage rolls
 */
export const ENCHANTMENT_PLUS_THREE: EquipmentModification = {
    id: 'enchantment_plus_three',
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
};

/**
 * Flaming Enchantment
 * Adds +1d6 fire damage on hit
 */
export const ENCHANTMENT_FLAMING: EquipmentModification = {
    id: 'enchantment_flaming',
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
};

/**
 * Frost Enchantment
 * Adds +1d6 cold damage on hit
 */
export const ENCHANTMENT_FROST: EquipmentModification = {
    id: 'enchantment_frost',
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
};

/**
 * Shocking Enchantment
 * Adds +1d6 lightning damage on hit
 */
export const ENCHANTMENT_SHOCKING: EquipmentModification = {
    id: 'enchantment_shocking',
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
};

/**
 * Thundering Enchantment
 * Adds +1d6 thunder damage on hit
 */
export const ENCHANTMENT_THUNDERING: EquipmentModification = {
    id: 'enchantment_thundering',
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
};

/**
 * Acidic Enchantment
 * Adds +1d6 acid damage on hit
 */
export const ENCHANTMENT_ACIDIC: EquipmentModification = {
    id: 'enchantment_acidic',
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
};

/**
 * Poison Enchantment
 * Adds +1d6 poison damage on hit
 */
export const ENCHANTMENT_POISON: EquipmentModification = {
    id: 'enchantment_poison',
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
};

/**
 * Holy Enchantment
 * Adds +1d6 radiant damage on hit
 */
export const ENCHANTMENT_HOLY: EquipmentModification = {
    id: 'enchantment_holy',
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
};

/**
 * Vampiric Enchantment
 * Heals wielder for damage dealt
 */
export const ENCHANTMENT_VAMPIRIC: EquipmentModification = {
    id: 'enchantment_vampiric',
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
};

/**
 * Vorpal Edge Enchantment
 * Increases critical threat range
 */
export const ENCHANTMENT_VORPAL_EDGE: EquipmentModification = {
    id: 'enchantment_vorpal_edge',
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
};

/**
 * Keen Edge Enchantment
 * Expands critical range to 18-20
 */
export const ENCHANTMENT_KEEN_EDGE: EquipmentModification = {
    id: 'enchantment_keen_edge',
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
};

/**
 * Mighty Enchantment
 * Increases weapon damage die by one step
 */
export const ENCHANTMENT_MIGHTY: EquipmentModification = {
    id: 'enchantment_mighty',
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
};

/**
 * Returning Enchantment
 * Weapon returns to hand after thrown
 */
export const ENCHANTMENT_RETURNING: EquipmentModification = {
    id: 'enchantment_returning',
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
};

/**
 * Lifestealing Enchantment
 * Greater life steal effect
 */
export const ENCHANTMENT_LIFESTEALING: EquipmentModification = {
    id: 'enchantment_lifestealing',
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
};

// ============================================================================
// STAT BOOSTING ENCHANTMENTS
// ============================================================================

/**
 * Strength Boost Enchantment
 * +1, +2, +3, or +4 to Strength
 */
export function createStrengthEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification {
    return {
        id: `enchantment_strength_${bonus}`,
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
        id: `enchantment_dexterity_${bonus}`,
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
        id: `enchantment_constitution_${bonus}`,
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
        id: `enchantment_intelligence_${bonus}`,
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
        id: `enchantment_wisdom_${bonus}`,
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
        id: `enchantment_charisma_${bonus}`,
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

// ============================================================================
// RESISTANCE ENCHANTMENTS
// ============================================================================

/**
 * Fire Resistance Enchantment
 */
export const ENCHANTMENT_FIRE_RESISTANCE: EquipmentModification = {
    id: 'enchantment_fire_resistance',
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
};

/**
 * Cold Resistance Enchantment
 */
export const ENCHANTMENT_COLD_RESISTANCE: EquipmentModification = {
    id: 'enchantment_cold_resistance',
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
};

/**
 * Lightning Resistance Enchantment
 */
export const ENCHANTMENT_LIGHTNING_RESISTANCE: EquipmentModification = {
    id: 'enchantment_lightning_resistance',
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
};

/**
 * Acid Resistance Enchantment
 */
export const ENCHANTMENT_ACID_RESISTANCE: EquipmentModification = {
    id: 'enchantment_acid_resistance',
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
};

/**
 * Poison Resistance Enchantment
 */
export const ENCHANTMENT_POISON_RESISTANCE: EquipmentModification = {
    id: 'enchantment_poison_resistance',
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
};

/**
 * Necrotic Resistance Enchantment
 */
export const ENCHANTMENT_NECROTIC_RESISTANCE: EquipmentModification = {
    id: 'enchantment_necrotic_resistance',
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
};

/**
 * Radiant Resistance Enchantment
 */
export const ENCHANTMENT_RADIANT_RESISTANCE: EquipmentModification = {
    id: 'enchantment_radiant_resistance',
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
};

/**
 * Thunder Resistance Enchantment
 */
export const ENCHANTMENT_THUNDER_RESISTANCE: EquipmentModification = {
    id: 'enchantment_thunder_resistance',
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
};

/**
 * All-Resistance Enchantment
 * Resistance to all damage types
 */
export const ENCHANTMENT_ALL_RESISTANCE: EquipmentModification = {
    id: 'enchantment_all_resistance',
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
};

// ============================================================================
// CURSES
// ============================================================================

/**
 * -1 Penalty Curse
 * -1 to attack and damage rolls
 */
export const CURSE_MINUS_ONE: EquipmentModification = {
    id: 'curse_minus_one',
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
};

/**
 * -2 Penalty Curse
 * -2 to attack and damage rolls
 */
export const CURSE_MINUS_TWO: EquipmentModification = {
    id: 'curse_minus_two',
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
};

/**
 * Weakness Curse
 * -4 Strength
 */
export const CURSE_WEAKNESS: EquipmentModification = {
    id: 'curse_weakness',
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
};

/**
 * Feeblemind Curse
 * -4 Intelligence
 */
export const CURSE_FEEBLEMIND: EquipmentModification = {
    id: 'curse_feeblemind',
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
};

/**
 * Clumsiness Curse
 * -4 Dexterity
 */
export const CURSE_CLUMSINESS: EquipmentModification = {
    id: 'curse_clumsiness',
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
};

/**
 * Frailty Curse
 * -4 Constitution
 */
export const CURSE_FRAILTY: EquipmentModification = {
    id: 'curse_frailty',
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
};

/**
 * Foolishness Curse
 * -4 Wisdom
 */
export const CURSE_FOOLISHNESS: EquipmentModification = {
    id: 'curse_foolishness',
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
};

/**
 * Repulsiveness Curse
 * -4 Charisma
 */
export const CURSE_REPULSIVENESS: EquipmentModification = {
    id: 'curse_repulsiveness',
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
};

/**
 * Vulnerability to Fire Curse
 */
export const CURSE_FIRE_VULNERABILITY: EquipmentModification = {
    id: 'curse_fire_vulnerability',
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
};

/**
 * Vulnerability to Cold Curse
 */
export const CURSE_COLD_VULNERABILITY: EquipmentModification = {
    id: 'curse_cold_vulnerability',
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
};

/**
 * Lifesteal Curse
 * Damages wielder on hit
 */
export const CURSE_LIFESTEAL: EquipmentModification = {
    id: 'curse_lifesteal',
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
};

/**
 * Attunement Curse
 * Cannot remove equipment once donned
 */
export const CURSE_ATTUNEMENT: EquipmentModification = {
    id: 'curse_attunement',
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
};

/**
 * Berserker Curse
 * Must attack each round or take penalty
 */
export const CURSE_BERSERKER: EquipmentModification = {
    id: 'curse_berserker',
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
};

/**
 * Heavy Burden Curse
 * Equipment weight is doubled
 */
export const CURSE_HEAVY_BURDEN: EquipmentModification = {
    id: 'curse_heavy_burden',
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
};

/**
 * Light Sensitivity Curse
 * Disadvantage in bright light
 */
export const CURSE_LIGHT_SENSITIVITY: EquipmentModification = {
    id: 'curse_light_sensitivity',
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
};

/**
 * Invisibility Curse
 * Wearer becomes invisible but also impaired
 */
export const CURSE_INVISIBILITY: EquipmentModification = {
    id: 'curse_invisibility',
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
};

/**
 * Hallucinations Curse
 * Random chance of confusion
 */
export const CURSE_HALLUCINATIONS: EquipmentModification = {
    id: 'curse_hallucinations',
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
};

/**
 * Blood Money Curse
 * Takes HP when dealing damage
 */
export const CURSE_BLOOD_MONEY: EquipmentModification = {
    id: 'curse_blood_money',
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
};

// ============================================================================
// COMBO ENCHANTMENTS (Multiple Effects)
// ============================================================================

/**
 * Holy Avenger Enchantment
 * +3 enhancement, radiant damage, +5 saves vs spells
 */
export const ENCHANTMENT_HOLY_AVENGER: EquipmentModification = {
    id: 'enchantment_holy_avenger',
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
};

/**
 * Dragon Slayer Enchantment
 * +2 enhancement, extra damage vs dragons
 */
export const ENCHANTMENT_DRAGON_SLAYER: EquipmentModification = {
    id: 'enchantment_dragon_slayer',
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
};

/**
 * Demon Hunter Enchantment
 * Extra damage vs demons and devils
 */
export const ENCHANTMENT_DEMON_HUNTER: EquipmentModification = {
    id: 'enchantment_demon_hunter',
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
};

/**
 * Undead Bane Enchantment
 * Extra damage vs undead
 */
export const ENCHANTMENT_UNDEAD_BANE: EquipmentModification = {
    id: 'enchantment_undead_bane',
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
};

// ============================================================================
// COLLECTION EXPORTS
// ============================================================================

/**
 * All weapon enhancement enchantments
 */
export const WEAPON_ENCHANTMENTS = {
    plusOne: ENCHANTMENT_PLUS_ONE,
    plusTwo: ENCHANTMENT_PLUS_TWO,
    plusThree: ENCHANTMENT_PLUS_THREE,
    flaming: ENCHANTMENT_FLAMING,
    frost: ENCHANTMENT_FROST,
    shocking: ENCHANTMENT_SHOCKING,
    thundering: ENCHANTMENT_THUNDERING,
    acidic: ENCHANTMENT_ACIDIC,
    poison: ENCHANTMENT_POISON,
    holy: ENCHANTMENT_HOLY,
    vampiric: ENCHANTMENT_VAMPIRIC,
    vorpalEdge: ENCHANTMENT_VORPAL_EDGE,
    keenEdge: ENCHANTMENT_KEEN_EDGE,
    mighty: ENCHANTMENT_MIGHTY,
    returning: ENCHANTMENT_RETURNING,
    lifestealing: ENCHANTMENT_LIFESTEALING
} as const;

/**
 * All armor enhancement enchantments
 */
export const ARMOR_ENCHANTMENTS = {
    plusOne: ENCHANTMENT_PLUS_ONE_ARMOR,
    plusTwo: ENCHANTMENT_PLUS_TWO_ARMOR
} as const;

/**
 * All resistance enchantments
 */
export const RESISTANCE_ENCHANTMENTS = {
    fire: ENCHANTMENT_FIRE_RESISTANCE,
    cold: ENCHANTMENT_COLD_RESISTANCE,
    lightning: ENCHANTMENT_LIGHTNING_RESISTANCE,
    acid: ENCHANTMENT_ACID_RESISTANCE,
    poison: ENCHANTMENT_POISON_RESISTANCE,
    necrotic: ENCHANTMENT_NECROTIC_RESISTANCE,
    radiant: ENCHANTMENT_RADIANT_RESISTANCE,
    thunder: ENCHANTMENT_THUNDER_RESISTANCE,
    all: ENCHANTMENT_ALL_RESISTANCE
} as const;

/**
 * All curses
 */
export const CURSES = {
    minusOne: CURSE_MINUS_ONE,
    minusTwo: CURSE_MINUS_TWO,
    weakness: CURSE_WEAKNESS,
    feeblemind: CURSE_FEEBLEMIND,
    clumsiness: CURSE_CLUMSINESS,
    frailty: CURSE_FRAILTY,
    foolishness: CURSE_FOOLISHNESS,
    repulsiveness: CURSE_REPULSIVENESS,
    fireVulnerability: CURSE_FIRE_VULNERABILITY,
    coldVulnerability: CURSE_COLD_VULNERABILITY,
    lifesteal: CURSE_LIFESTEAL,
    attunement: CURSE_ATTUNEMENT,
    berserker: CURSE_BERSERKER,
    heavyBurden: CURSE_HEAVY_BURDEN,
    lightSensitivity: CURSE_LIGHT_SENSITIVITY,
    invisibility: CURSE_INVISIBILITY,
    hallucinations: CURSE_HALLUCINATIONS,
    bloodMoney: CURSE_BLOOD_MONEY
} as const;

/**
 * All enchantments combined
 */
export const ALL_ENCHANTMENTS = {
    ...WEAPON_ENCHANTMENTS,
    ...ARMOR_ENCHANTMENTS,
    ...RESISTANCE_ENCHANTMENTS,
    holyAvenger: ENCHANTMENT_HOLY_AVENGER,
    dragonSlayer: ENCHANTMENT_DRAGON_SLAYER,
    demonHunter: ENCHANTMENT_DEMON_HUNTER,
    undeadBane: ENCHANTMENT_UNDEAD_BANE
} as const;

/**
 * Get enchantment by ID
 */
export function getEnchantment(id: string): EquipmentModification | undefined {
    return Object.values(ALL_ENCHANTMENTS).find(e => e.id === id);
}

/**
 * Get curse by ID
 */
export function getCurse(id: string): EquipmentModification | undefined {
    return Object.values(CURSES).find(c => c.id === id);
}

/**
 * Get all enchantments
 */
export function getAllEnchantments(): EquipmentModification[] {
    return Object.values(ALL_ENCHANTMENTS);
}

/**
 * Get all curses
 */
export function getAllCurses(): EquipmentModification[] {
    return Object.values(CURSES);
}

/**
 * Get enchantments by type
 */
export function getEnchantmentsByType(type: 'weapon' | 'armor' | 'resistance' | 'combo'): EquipmentModification[] {
    switch (type) {
        case 'weapon':
            return Object.values(WEAPON_ENCHANTMENTS);
        case 'armor':
            return Object.values(ARMOR_ENCHANTMENTS);
        case 'resistance':
            return Object.values(RESISTANCE_ENCHANTMENTS);
        case 'combo':
            return [
                ENCHANTMENT_HOLY_AVENGER,
                ENCHANTMENT_DRAGON_SLAYER,
                ENCHANTMENT_DEMON_HUNTER,
                ENCHANTMENT_UNDEAD_BANE
            ];
        default:
            return [];
    }
}

export default {
    WEAPON_ENCHANTMENTS,
    ARMOR_ENCHANTMENTS,
    RESISTANCE_ENCHANTMENTS,
    CURSES,
    ALL_ENCHANTMENTS,
    getEnchantment,
    getCurse,
    getAllEnchantments,
    getAllCurses,
    getEnchantmentsByType
};
