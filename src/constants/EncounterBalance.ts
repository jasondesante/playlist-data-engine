/**
 * Encounter Balance Constants
 *
 * D&D 5e official encounter building tables for calculating balanced encounters.
 * Based on Dungeon Master's Guide (2014) Chapter 13: Building Combat Encounters.
 *
 * These tables provide:
 * - XP thresholds per character level for each difficulty (easy/medium/hard/deadly)
 * - CR to XP conversion for calculating monster strength
 * - Encounter multipliers for adjusting XP budgets based on number of enemies
 * - Tuning factors for fine-tuning encounter difficulty
 */

import type { EncounterDifficulty } from '../core/types/Enemy.js';

/**
 * XP Budget Per Character Level
 *
 * For each character level and difficulty, defines the XP budget for a SINGLE character.
 * Multiply by party size to get the total encounter XP budget.
 *
 * From D&D 5e Dungeon Master's Guide, page 82, "XP Thresholds by Character Level"
 *
 * Usage:
 * - Calculate party's average level
 * - Look up threshold per character for desired difficulty
 * - Multiply by number of party members
 * - Result is the total XP budget for the encounter
 */
export const XP_BUDGET_PER_LEVEL: Record<
    number,
    Record<EncounterDifficulty, number>
> = {
    1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
    2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
    3: { easy: 75, medium: 150, hard: 225, deadly: 300 },
    4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
    5: { easy: 250, medium: 500, hard: 750, deadly: 1000 },
    6: { easy: 300, medium: 600, hard: 900, deadly: 1200 },
    7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
    8: { easy: 400, medium: 800, hard: 1200, deadly: 1900 },
    9: { easy: 500, medium: 1000, hard: 1500, deadly: 2300 },
    10: { easy: 600, medium: 1200, hard: 1800, deadly: 2400 },
    11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
    12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
    13: { easy: 1200, medium: 2400, hard: 3600, deadly: 5400 },
    14: { easy: 1400, medium: 2800, hard: 4200, deadly: 5700 },
    15: { easy: 1600, medium: 3200, hard: 4800, deadly: 6400 },
    16: { easy: 2000, medium: 4000, hard: 6000, deadly: 8000 },
    17: { easy: 2400, medium: 4800, hard: 7200, deadly: 9600 },
    18: { easy: 3000, medium: 6000, hard: 9000, deadly: 12000 },
    19: { easy: 4000, medium: 8000, hard: 12000, deadly: 16000 },
    20: { easy: 5000, medium: 10000, hard: 15000, deadly: 20000 },
};

/**
 * CR to XP Mapping
 *
 * Maps Challenge Rating (CR) to Experience Point (XP) values.
 * Used to determine the strength of monsters and calculate encounter budgets.
 *
 * From D&D 5e Monster Manual, "Monsters by Challenge Rating"
 *
 * Fractional CRs are supported as decimal values.
 * Note: CR 0 creatures (commoners) are worth 0 or 10 XP depending on context.
 * CR 25 does not exist in standard 5e (jumps from 24 to 26).
 */
export const CR_TO_XP: Record<number, number> = {
    0: 10, // CR 0 creatures (commoners, some weak beasts)
    0.125: 25, // CR 1/8
    0.25: 50, // CR 1/4
    0.5: 100, // CR 1/2
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    // CR 25 does not exist in standard 5e
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000,
};

/**
 * Enemy Count Multiplier (Encounter Multipliers)
 *
 * Adjusts XP budget for encounters with multiple enemies.
 * Accounts for action economy advantage and tactical complexity.
 *
 * From D&D 5e Dungeon Master's Guide, page 82, "Encounter Multipliers"
 *
 * IMPORTANT: These multipliers are applied to the ADJUSTED XP total, not base XP.
 * Formula: (sum of monster XP) × (encounter multiplier) = adjusted XP
 *
 * Special rule: If the party has 6+ members, use the next lowest multiplier.
 *
 * The multiplier curve reflects:
 * - 1 enemy: Full XP worth (×1), but some sources suggest ×1.5 for solo monsters
 * - 2 enemies: Significantly harder due to action economy (×2)
 * - 3-6 enemies: Peak action economy advantage (×2.5)
 * - 7-10 enemies: Diminishing returns due to crowd control (×2)
 * - 11-14 enemies: More manageable due to AOE effectiveness (×1.5)
 * - 15+ enemies: Easy to manage with AOE and crowd control (×1)
 */
export const ENEMY_COUNT_MULTIPLIER: Record<number, number> = {
    1: 1.0,
    2: 1.5,
    3: 2.0,
    4: 2.0,
    5: 2.0,
    6: 2.0,
    7: 1.5,
    8: 1.5,
    9: 1.5,
    10: 1.5,
    11: 1.0,
    12: 1.0,
    13: 1.0,
    14: 1.0,
    15: 1.0,
};

/**
 * Tuning Factors for encounter difficulty adjustment
 *
 * Allows fine-tuning of encounter difficulty beyond the standard D&D 5e calculations.
 * These can be adjusted based on party composition, desired pacing, or game balance needs.
 */
export const TUNING_FACTORS = {
    /** Default tuning factor (no adjustment) */
    DEFAULT: 1.0,

    /** 10% easier encounters */
    EASIER: 0.9,

    /** 20% easier encounters */
    MUCH_EASIER: 0.8,

    /** 10% harder encounters */
    HARDER: 1.1,

    /** 20% harder encounters */
    MUCH_HARDER: 1.2,

    /** 50% harder encounters (for veteran players) */
    BRUTAL: 1.5,
} as const;

/**
 * Get the XP budget for a single character at a given level and difficulty
 *
 * @param level - Character level (1-20)
 * @param difficulty - Encounter difficulty (easy/medium/hard/deadly)
 * @returns XP budget for a single character, or 0 if level out of range
 *
 * @example
 * ```typescript
 * const level5Medium = getXPBudgetPerLevel(5, 'medium'); // 500
 * const level10Hard = getXPBudgetPerLevel(10, 'hard'); // 1800
 * ```
 */
export function getXPBudgetPerLevel(
    level: number,
    difficulty: EncounterDifficulty
): number {
    const levelData = XP_BUDGET_PER_LEVEL[level];
    if (!levelData) {
        return 0;
    }
    return levelData[difficulty] || 0;
}

/**
 * Get the total XP budget for a party based on levels and difficulty
 *
 * @param levels - Array of character levels in the party
 * @param difficulty - Encounter difficulty (easy/medium/hard/deadly)
 * @returns Total XP budget for the entire party
 *
 * @example
 * ```typescript
 * const party = [3, 3, 4, 5]; // Mixed levels
 * const budget = getXPBudgetForParty(party, 'medium'); // Sum of individual budgets
 * ```
 */
export function getXPBudgetForParty(
    levels: number[],
    difficulty: EncounterDifficulty
): number {
    return levels.reduce((total, level) => {
        return total + getXPBudgetPerLevel(level, difficulty);
    }, 0);
}

/**
 * Get the XP value for a given Challenge Rating
 *
 * @param cr - Challenge Rating (supports decimals like 0.125, 0.25, 0.5)
 * @returns XP value for that CR, or 0 if CR not found
 *
 * @example
 * ```typescript
 * getXPForCR(1); // 200
 * getXPForCR(0.25); // 50
 * getXPForCR(5); // 1800
 * ```
 */
export function getXPForCR(cr: number): number {
    return CR_TO_XP[cr] || 0;
}

/**
 * Get the approximate Challenge Rating from an XP value
 *
 * Uses binary search to find the CR with closest XP value without exceeding.
 *
 * @param xp - Experience point value
 * @returns CR value, or 0 if no match found
 *
 * @example
 * ```typescript
 * getCRFromXP(200); // 1
 * getCRFromXP(1800); // 5
 * getCRFromXP(3500); // ~7 (returns closest CR without exceeding)
 * ```
 */
export function getCRFromXP(xp: number): number {
    // Handle edge cases
    if (xp <= 0) return 0;

    const crValues = Object.keys(CR_TO_XP)
        .map(Number)
        .sort((a, b) => a - b);

    // Binary search for the highest CR with XP <= target XP
    let left = 0;
    let right = crValues.length - 1;
    let result = 0;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const crValue = crValues[mid];
        const crXP = CR_TO_XP[crValue];

        if (crXP <= xp) {
            result = crValue;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    return result;
}

/**
 * Apply a tuning factor to an XP budget
 *
 * @param xpBudget - Base XP budget
 * @param tuningFactor - Multiplier to apply (default: 1.0)
 * @returns Adjusted XP budget
 *
 * @example
 * ```typescript
 * applyTuning(1000, 1.2); // 1200 (20% harder)
 * applyTuning(1000, TUNING_FACTORS.EASIER); // 900
 * ```
 */
export function applyTuning(xpBudget: number, tuningFactor: number = 1.0): number {
    return Math.round(xpBudget * tuningFactor);
}

/**
 * Get the encounter multiplier for a given number of enemies
 *
 * @param enemyCount - Number of enemies in the encounter
 * @returns Encounter multiplier value
 *
 * @example
 * ```typescript
 * getEncounterMultiplier(1); // 1.0
 * getEncounterMultiplier(5); // 2.0
 * getEncounterMultiplier(15); // 1.0
 * ```
 */
export function getEncounterMultiplier(enemyCount: number): number {
    if (enemyCount <= 0) return 1.0;
    if (enemyCount >= 15) return ENEMY_COUNT_MULTIPLIER[15];
    return ENEMY_COUNT_MULTIPLIER[enemyCount] || 1.0;
}

/**
 * Calculate adjusted XP for a group of enemies
 *
 * Applies encounter multiplier to account for action economy.
 *
 * @param enemyCRs - Array of enemy Challenge Ratings
 * @param enemyCountMultiplier - Optional override for enemy count multiplier
 * @returns Adjusted XP value for encounter building
 *
 * @example
 * ```typescript
 * // Five CR 1/2 goblins
 * calculateAdjustedXP([0.5, 0.5, 0.5, 0.5, 0.5]); // 500 (250 base × 2.0)
 *
 * // One CR 5 boss
 * calculateAdjustedXP([5]); // 1800 (1800 base × 1.0)
 * ```
 */
export function calculateAdjustedXP(
    enemyCRs: number[],
    enemyCountMultiplier?: number
): number {
    const baseXP = enemyCRs.reduce((sum, cr) => sum + getXPForCR(cr), 0);
    const multiplier =
        enemyCountMultiplier !== undefined
            ? enemyCountMultiplier
            : getEncounterMultiplier(enemyCRs.length);

    return Math.round(baseXP * multiplier);
}

/**
 * Get average party level
 *
 * @param levels - Array of character levels
 * @returns Average level (rounded down to integer)
 *
 * @example
 * ```typescript
 * getAveragePartyLevel([1, 2, 3, 5]); // 2 (11 / 4 = 2.75, rounded down)
 * ```
 */
export function getAveragePartyLevel(levels: number[]): number {
    if (levels.length === 0) return 1;
    const sum = levels.reduce((a, b) => a + b, 0);
    return Math.floor(sum / levels.length);
}

/**
 * Type guard to validate a difficulty level
 *
 * @param value - Value to check
 * @returns True if valid EncounterDifficulty
 */
export function isValidEncounterDifficulty(value: unknown): value is EncounterDifficulty {
    return typeof value === 'string' &&
        ['easy', 'medium', 'hard', 'deadly'].includes(value);
}
