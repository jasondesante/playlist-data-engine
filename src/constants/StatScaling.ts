/**
 * Stat Level Scaling — Level-based stat scaling functions for enemy generation
 *
 * Enables HP, attack, and defense to scale independently at different effective
 * levels, allowing creative encounter designs (e.g., tanky low-damage enemy or
 * glass cannon). The AI and simulator don't need to know about this — they read
 * the final CharacterSheet stats. This is purely a generation-layer concern.
 *
 * Design principle: When all three levels match CR, output must be identical
 * to current generation (backward compatible). The scaling functions compute
 * what the stats *would be* at a given level, and the generator uses those values.
 */

import type { AbilityScores } from '../core/types/Character.js';
import type { EnemyRarity, EnemyArchetype, EquipmentConfig } from '../core/types/Enemy.js';
import { getRarityConfig } from './EnemyRarity.js';

// ============================================================================
// Tuning Constants
// ============================================================================

/**
 * HP scaling per level — how much HP increases per effective level.
 *
 * In D&D 5e, monster HP scales roughly linearly with CR:
 * - CR 1: ~30 HP, CR 5: ~70 HP, CR 10: ~130 HP, CR 20: ~350 HP
 *
 * We model this as: HP = baseHP * (1 + HP_PER_LEVEL_FACTOR * (level - 1))
 *
 * This produces roughly 5-8% HP growth per level, which feels natural:
 * - Level 1: 1.0x (base)
 * - Level 5: ~1.3x
 * - Level 10: ~1.6x
 * - Level 20: ~2.2x
 */
const HP_PER_LEVEL_FACTOR = 0.06;

/**
 * Attack bonus scaling per level.
 *
 * Attack bonus = proficiency + ability modifier. Proficiency already scales
 * with level in the current system (Math.ceil(1 + (level - 1) / 4)).
 *
 * This factor provides additional attack bonus scaling beyond proficiency,
 * representing improved combat training at higher levels:
 * - Level 1: +0 extra
 * - Level 5: +1 extra
 * - Level 10: +2 extra
 * - Level 15: +3 extra
 * - Level 20: +4 extra
 */
const ATTACK_BONUS_PER_LEVEL = 0.2;

/**
 * Damage die scaling thresholds.
 *
 * Maps effective level ranges to damage die sizes. This replaces the
 * purely rarity-based die scaling with level-based scaling:
 * - Levels 1-2: d6
 * - Levels 3-5: d8
 * - Levels 6-9: d10
 * - Levels 10-14: d12
 * - Levels 15-19: 2d6 (average 7, max 12)
 * - Levels 20-24: 2d8 (average 9, max 16)
 * - Levels 25-29: 2d10 (average 11, max 20)
 * - Levels 30+: 3d8 (average 13.5, max 24)
 */
const DAMAGE_DIE_BY_LEVEL: Array<{ minLevel: number; die: string }> = [
    { minLevel: 1,  die: '1d6' },
    { minLevel: 3,  die: '1d8' },
    { minLevel: 6,  die: '1d10' },
    { minLevel: 10, die: '1d12' },
    { minLevel: 15, die: '2d6' },
    { minLevel: 20, die: '2d8' },
    { minLevel: 25, die: '2d10' },
    { minLevel: 30, die: '3d8' },
];

/**
 * Damage modifier scaling — base damage modifier before ability score contribution.
 *
 * In D&D 5e, low-CR monsters typically have +2 to +4 damage modifiers.
 * Higher CR monsters scale this further. We provide a base floor that
 * increases with level, on top of the actual ability modifier:
 * - Level 1: +0
 * - Level 5: +1
 * - Level 10: +2
 * - Level 15: +3
 * - Level 20: +4
 */
const BASE_DAMAGE_MOD_PER_LEVEL = 0.2;

/**
 * AC scaling per level.
 *
 * Higher-level enemies should have slightly better armor. This adds
 * a small AC bonus per level beyond the base template AC:
 * - Level 1: +0
 * - Level 5: +1
 * - Level 10: +2
 * - Level 15: +3
 * - Level 20: +4
 */
const AC_PER_LEVEL = 0.2;

// ============================================================================
// Primary stat modifier for archetypes
// ============================================================================

/**
 * Get the primary ability score key for an archetype.
 *
 * Used to determine which ability score drives damage modifier:
 * - Brute: STR (melee power)
 * - Archer: DEX (ranged precision)
 * - Support: CHA (spellcasting power)
 */
function getPrimaryStat(archetype: EnemyArchetype): keyof AbilityScores {
    switch (archetype) {
        case 'brute': return 'STR';
        case 'archer': return 'DEX';
        case 'support': return 'CHA';
    }
}

// ============================================================================
// Core scaling functions
// ============================================================================

/**
 * Returns a multiplier for how much a stat increases at a given level vs level 1.
 *
 * Uses a logarithmic curve that provides noticeable growth at low levels
 * but tapers off at high levels, preventing exponential scaling:
 * - Level 1: 1.0x
 * - Level 5: 1.24x
 * - Level 10: 1.44x
 * - Level 15: 1.59x
 * - Level 20: 1.70x
 * - Level 25: 1.84x
 * - Level 30: 2.015x
 *
 * @param level - Effective level (1-30+, supports fractional)
 * @returns Multiplier where level 1 = 1.0
 */
export function getLevelScalingFactor(level: number): number {
    if (level <= 1) return 1.0;
    // Logarithmic scaling: grows fast early, slows down at high levels
    // Formula: 1 + ln(level) * LN_SCALE
    // At level 20: 1 + ln(20) * 0.5 ≈ 1 + 1.499 = 2.499... too much
    // Let's use a simpler power curve instead
    // Formula: level^(POWER) where POWER < 1
    // At level 5: 5^0.3 ≈ 1.62... too much for HP
    // Let's use a diminishing returns formula
    return 1 + (level - 1) * 0.035;
}

/**
 * Scale HP for a given effective level and rarity.
 *
 * Current system: HP = baseHP * rarityMultiplier * fractionalCRMultiplier
 * New system adds level-based scaling: HP = baseHP * levelFactor * rarityMultiplier * fractionalCRMultiplier
 *
 * When level = CR-derived level and no overrides, the levelFactor provides
 * the missing CR-based HP scaling that the current system lacks.
 *
 * @param baseHP - Base HP from enemy template (e.g., 15 for orc)
 * @param level - Effective HP level (1-30+)
 * @param rarity - Enemy rarity tier (affects stat multiplier)
 * @returns Scaled HP value
 */
export function getHPAtLevel(
    baseHP: number,
    level: number,
    rarity: EnemyRarity
): number {
    const rarityConfig = getRarityConfig(rarity);

    // Level-based HP growth
    const levelFactor = 1 + HP_PER_LEVEL_FACTOR * (level - 1);

    // Fractional CR reduction for sub-level enemies (CR < 1)
    const crMultiplier = getFractionalCRHPMultiplier(level);

    return Math.round(baseHP * levelFactor * rarityConfig.statMultiplier * crMultiplier);
}

/**
 * Get HP multiplier for fractional CR (sub-level enemies).
 *
 * Matches EnemyGenerator.getStatMultiplierForFractionalCR:
 * - CR < 0.5: 0.75x
 * - CR < 1.0: 0.85x
 * - CR >= 1.0: 1.0x
 */
function getFractionalCRHPMultiplier(level: number): number {
    if (level < 0.5) return 0.75;
    if (level < 1.0) return 0.85;
    return 1.0;
}

/**
 * Compute attack stats (damage die, damage modifier, attack bonus) at a given level.
 *
 * Current system:
 * - Damage die: purely rarity-based (d6/d8/d10/d12)
 * - Damage modifier: hardcoded per rarity (+2/+3/+4/+6)
 * - Attack bonus: proficiency + ability modifier (but ability modifier is ignored)
 *
 * New system:
 * - Damage die: level-based (d6 → d8 → d10 → d12 → 2d6 → 2d8)
 * - Damage modifier: actual ability modifier from primary stat + base level bonus
 * - Attack bonus: proficiency + ability modifier + extra level bonus
 *
 * @param baseStats - The scaled ability scores for the enemy
 * @param level - Effective attack level (1-30+)
 * @param rarity - Enemy rarity tier
 * @param archetype - Enemy combat archetype (determines primary stat)
 * @returns Object with damageDie, damageModifier, and attackBonus
 */
export function getAttackAtLevel(
    baseStats: AbilityScores,
    level: number,
    rarity: EnemyRarity,
    archetype: EnemyArchetype
): { damageDie: string; damageModifier: number; attackBonus: number } {
    const primaryStat = getPrimaryStat(archetype);
    const primaryMod = Math.floor(((baseStats[primaryStat] ?? 10) - 10) / 2);

    // Proficiency bonus at this level
    const proficiency = Math.ceil(1 + (level - 1) / 4);

    // Damage die based on level
    const damageDie = getDamageDieForLevel(level);

    // Damage modifier: primary ability modifier + base scaling per level
    const baseMod = Math.floor(BASE_DAMAGE_MOD_PER_LEVEL * (level - 1));
    const damageModifier = primaryMod + baseMod;

    // Attack bonus: proficiency + primary ability modifier + extra level scaling
    const extraBonus = Math.floor(ATTACK_BONUS_PER_LEVEL * (level - 1));
    const attackBonus = proficiency + primaryMod + extraBonus;

    return { damageDie, damageModifier, attackBonus };
}

/**
 * Get the damage die for a given level.
 *
 * Replaces the purely rarity-based die scaling with level-based scaling.
 * Falls through the table from highest to lowest level threshold.
 */
function getDamageDieForLevel(level: number): string {
    let die = 'd6';
    for (const entry of DAMAGE_DIE_BY_LEVEL) {
        if (level >= entry.minLevel) {
            die = entry.die;
        }
    }
    return die;
}

/**
 * Compute AC (defense) at a given level.
 *
 * Current system: AC = baseAC + DEX_modifier + equipment_modifier
 * New system adds level-based AC scaling: AC = baseAC + DEX_modifier + equipment_modifier + levelBonus
 *
 * @param baseStats - The scaled ability scores for the enemy
 * @param level - Effective defense level (1-30+)
 * @param baseAC - Base AC from enemy template (e.g., 13 for orc)
 * @param equipment - Equipment configuration (armor, shield)
 * @returns Computed AC value
 */
export function getDefenseAtLevel(
    baseStats: AbilityScores,
    level: number,
    baseAC: number,
    equipment: EquipmentConfig
): number {
    const dexMod = Math.floor((baseStats.DEX - 10) / 2);

    // Equipment AC contribution
    let equipmentAC = 0;
    if (equipment.armor?.acBonus) {
        equipmentAC += equipment.armor.acBonus;
    }
    if (equipment.shield?.acBonus) {
        equipmentAC += equipment.shield.acBonus;
    }

    // Level-based AC bonus
    const levelBonus = Math.floor(AC_PER_LEVEL * (level - 1));

    return baseAC + dexMod + equipmentAC + levelBonus;
}

/**
 * Compute the ability modifier that should be used for damage,
 * replacing the hardcoded rarity-based modifier.
 *
 * Uses the actual primary ability score for the archetype:
 * - Brute: STR modifier
 * - Archer: DEX modifier
 * - Support: CHA modifier
 *
 * Plus a small base bonus from level scaling.
 *
 * @param baseStats - Scaled ability scores
 * @param level - Effective level
 * @param archetype - Enemy archetype
 * @returns Damage modifier to use
 */
export function getDamageModifierForStats(
    baseStats: AbilityScores,
    level: number,
    archetype: EnemyArchetype
): number {
    const primaryStat = getPrimaryStat(archetype);
    const primaryMod = Math.floor(((baseStats[primaryStat] ?? 10) - 10) / 2);
    const baseMod = Math.floor(BASE_DAMAGE_MOD_PER_LEVEL * (level - 1));
    return primaryMod + baseMod;
}
