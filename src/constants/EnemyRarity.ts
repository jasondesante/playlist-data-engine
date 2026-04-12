/**
 * Enemy Rarity Configuration
 *
 * Defines scaling factors and properties for each enemy rarity tier.
 * Rarity controls **complexity**, not power. CR handles power scaling.
 *
 * Design Principle: Any CR can combine with any rarity:
 * - CR 0.25 + Boss = Goblin chieftain (weak but complex)
 * - CR 20 + Common = Ancient beast (powerful but simple)
 *
 * Rarity progression (complexity-based, minimal stat impact):
 * - Common: Base enemy with standard stats
 * - Uncommon: Minor stat adjustment, stronger signature ability, 1 extra ability
 * - Elite: Small stat adjustment, stronger signature ability, 2 extra abilities, gains resistances
 * - Boss: Moderate stat adjustment, strongest signature ability, 3 extra abilities, legendary actions
 */

import type { EnemyRarity, RarityConfig } from '../core/types/Enemy.js';

/**
 * Rarity configuration for each enemy tier
 *
 * These values define how enemies scale across rarity tiers:
 * - statMultiplier: Multiplier applied to base ability scores
 * - hpMultiplier: Separate HP multiplier for dramatic health differences between rarities
 * - signatureDieSize: Number of sides on signature ability damage die (d6/d8/d10/d12)
 * - extraAbilityCount: Number of additional abilities from FeatureQuery pool
 * - hasResistances: Whether this rarity gains template resistances/immunities
 *
 * Common is the baseline. Higher rarities have meaningfully more HP and
 * stronger ability scores, making them feel distinctly more powerful.
 */
export const RARITY_CONFIGS: Record<EnemyRarity, RarityConfig> = {
    common: {
        statMultiplier: 1.0,
        hpMultiplier: 1.0,
        signatureDieSize: 6,
        extraAbilityCount: 0,
        hasResistances: false
    },
    uncommon: {
        statMultiplier: 1.08,
        hpMultiplier: 1.3,
        signatureDieSize: 8,
        extraAbilityCount: 1,
        hasResistances: false
    },
    elite: {
        statMultiplier: 1.15,
        hpMultiplier: 1.7,
        signatureDieSize: 10,
        extraAbilityCount: 2,
        hasResistances: true
    },
    boss: {
        statMultiplier: 1.25,
        hpMultiplier: 2.2,
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
    return `1d${RARITY_CONFIGS[rarity].signatureDieSize}`;
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
