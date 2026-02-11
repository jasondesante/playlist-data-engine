/**
 * Enemy Rarity Configuration
 *
 * Defines scaling factors and properties for each enemy rarity tier.
 * Rarities scale enemies from Common (base stats) to Boss (significantly enhanced).
 *
 * Rarity progression:
 * - Common: Base enemy with standard stats
 * - Uncommon: +10% stats, stronger signature ability, 1 extra ability
 * - Elite: +25% stats, stronger signature ability, 2 extra abilities, gains resistances
 * - Boss: +50% stats, strongest signature ability, 3 extra abilities, full resistances
 */

import type { EnemyRarity, RarityConfig } from '../core/types/Enemy.js';

/**
 * Rarity configuration for each enemy tier
 *
 * These values define how enemies scale across rarity tiers:
 * - statMultiplier: Applied to base ability scores from template
 * - signatureDieSize: Number of sides on signature ability damage die (d6/d8/d10/d12)
 * - extraAbilityCount: Number of additional abilities from FeatureQuery pool
 * - hasResistances: Whether this rarity gains template resistances/immunities
 */
export const RARITY_CONFIGS: Record<EnemyRarity, RarityConfig> = {
    common: {
        statMultiplier: 1.0,
        signatureDieSize: 6,
        extraAbilityCount: 0,
        hasResistances: false
    },
    uncommon: {
        statMultiplier: 1.1,
        signatureDieSize: 8,
        extraAbilityCount: 1,
        hasResistances: false
    },
    elite: {
        statMultiplier: 1.25,
        signatureDieSize: 10,
        extraAbilityCount: 2,
        hasResistances: true
    },
    boss: {
        statMultiplier: 1.5,
        signatureDieSize: 12,
        extraAbilityCount: 3,
        hasResistances: true
    }
};

/**
 * Get the rarity configuration for a given rarity tier
 *
 * @param rarity - The enemy rarity tier
 * @returns The configuration for that rarity, or undefined if invalid rarity
 *
 * @example
 * ```typescript
 * const eliteConfig = getRarityConfig('elite');
 * console.log(eliteConfig.statMultiplier); // 1.25
 * console.log(eliteConfig.signatureDieSize); // 10
 * ```
 */
export function getRarityConfig(rarity: EnemyRarity): RarityConfig {
    return RARITY_CONFIGS[rarity];
}

/**
 * Get the die notation string for a given rarity's signature ability
 *
 * @param rarity - The enemy rarity tier
 * @returns Die notation string (e.g., 'd6', 'd8', 'd10', 'd12')
 *
 * @example
 * ```typescript
 * const bossDie = getSignatureDie('boss'); // 'd12'
 * const commonDie = getSignatureDie('common'); // 'd6'
 * ```
 */
export function getSignatureDie(rarity: EnemyRarity): string {
    return `d${RARITY_CONFIGS[rarity].signatureDieSize}`;
}

/**
 * Get all available rarity tiers
 *
 * @returns Array of all rarity tiers in ascending order of power
 */
export function getAllRarities(): EnemyRarity[] {
    return ['common', 'uncommon', 'elite', 'boss'];
}

/**
 * Get the next higher rarity tier
 *
 * @param currentRarity - The current rarity tier
 * @returns The next higher rarity, or undefined if already at boss
 *
 * @example
 * ```typescript
 * getHigherRarity('common'); // 'uncommon'
 * getHigherRarity('elite'); // 'boss'
 * getHigherRarity('boss'); // undefined
 * ```
 */
export function getHigherRarity(currentRarity: EnemyRarity): EnemyRarity | undefined {
    const rarities = getAllRarities();
    const currentIndex = rarities.indexOf(currentRarity);
    if (currentIndex === -1 || currentIndex === rarities.length - 1) {
        return undefined;
    }
    return rarities[currentIndex + 1];
}
