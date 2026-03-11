/**
 * Rhythm Game XP System Types
 *
 * This module defines types for the rhythm game XP reward system, which integrates
 * with the existing beat detection and progression systems.
 *
 * The system separates "score points" (for in-game display/leaderboards) from
 * "character XP" (for progression/leveling) via the `xpRatio` parameter.
 *
 * @example
 * ```typescript
 * // Default: 10 score points = 1 character XP
 * const config: RhythmXPConfig = {
 *   xpRatio: 0.1,
 *   baseXP: { perfect: 10, great: 7, good: 5, ok: 2, miss: 0, wrongKey: 0 }
 * };
 * ```
 */

import type { BeatAccuracy } from './BeatMap.js';

// ============================================================================
// Core Configuration Types
// ============================================================================

/**
 * Base XP values for each accuracy level
 *
 * These are "score points" - raw values before the xpRatio is applied.
 * Negative values for miss/wrongKey affect displayed score only;
 * character XP is always floored at 0.
 */
export interface RhythmBaseXPConfig {
    /** XP for perfect timing (default: 10) */
    perfect: number;

    /** XP for great timing (default: 7) */
    great: number;

    /** XP for good timing (default: 5) */
    good: number;

    /** XP for ok timing (default: 2) */
    ok: number;

    /** XP for missed beats (default: 0, can be negative for score penalty) */
    miss: number;

    /** XP for wrong key press (default: 0, can be negative for score penalty) */
    wrongKey: number;
}

/**
 * Combo end bonus configuration
 *
 * Awarded when a combo breaks, providing a satisfying "completion bonus"
 * for the streak achieved.
 */
export interface ComboEndBonusConfig {
    /** Whether combo end bonuses are enabled (default: true) */
    enabled: boolean;

    /**
     * Custom formula for calculating bonus score from combo length.
     * Default: (comboLength) => comboLength * 2
     *
     * @param comboLength - The combo length that just ended
     * @returns Bonus score points (before xpRatio)
     *
     * @example
     * ```typescript
     * // Exponential bonus
     * formula: (combo) => Math.floor(combo * 1.5)
     *
     * // Step-based (every 10 hits = bigger bonus)
     * formula: (combo) => Math.floor(combo / 10) * 15
     * ```
     */
    formula?: (comboLength: number) => number;
}

/**
 * Combo multiplier configuration
 *
 * The combo multiplier increases with each successful hit and applies
 * to the current hit only (not retroactively).
 */
export interface RhythmComboConfig {
    /** Whether combo multipliers are enabled (default: true) */
    enabled: boolean;

    /** Maximum multiplier cap (default: 5.0, meaning 5x max) */
    cap: number;

    /**
     * Custom formula for calculating multiplier from combo length.
     * Default: (comboLength) => Math.min(1 + (comboLength / 50), cap)
     *
     * At 50 combo = 2x, at 100 combo = 3x, at 200 combo = 5x (cap)
     *
     * @param comboLength - Current combo count
     * @returns Multiplier value (will be capped at `cap`)
     *
     * @example
     * ```typescript
     * // Uncapped exponential growth
     * formula: (combo) => 1 + Math.log10(combo + 1)
     *
     * // Step-based (every 10 hits = +0.1x)
     * formula: (combo) => 1 + Math.floor(combo / 10) * 0.1
     * ```
     */
    formula?: (comboLength: number) => number;

    /**
     * Whether "ok" accuracy breaks the combo streak (default: true)
     *
     * When true: "ok" accuracy resets combo to 0 (stricter gameplay)
     * When false: "ok" accuracy keeps the combo going (more forgiving)
     *
     * Note: This only affects combo streaks - the groove meter is NOT affected.
     * "ok" accuracy still contributes positively to groove hotness.
     *
     * @example
     * ```typescript
     * // Default behavior - ok breaks combo
     * okBreaksCombo: true
     *
     * // Forgiving mode - ok keeps combo alive
     * okBreaksCombo: false
     * ```
     */
    okBreaksCombo: boolean;

    /** Combo end bonus configuration */
    endBonus: ComboEndBonusConfig;
}

/**
 * Groove end bonus configuration
 *
 * Awarded when a groove ends (hotness drops to 0 or session ends).
 * The bonus is calculated using weighted values for different groove statistics.
 */
export interface GrooveEndBonusConfig {
    /** Whether groove end bonuses are enabled (default: true) */
    enabled: boolean;

    /** Weight for max streak in bonus calculation (default: 0.4) */
    maxStreakWeight: number;

    /** Weight for average hotness in bonus calculation (default: 0.4) */
    avgHotnessWeight: number;

    /** Weight for groove duration in bonus calculation (default: 0.2) */
    durationWeight: number;
}

/**
 * Groove XP configuration
 *
 * Supports two modes:
 * 1. Per-hit groove multiplier: Each hit gets bonus based on current hotness
 * 2. End bonus: Large bonus awarded when groove ends (default)
 */
export interface RhythmGrooveConfig {
    /**
     * Whether to apply groove multiplier to each hit (default: false)
     * When true: multiplier += (hotness / 100) * perHitScale
     * At 100% hotness with scale 1.0 = +1.0x to multiplier
     */
    perHitMultiplier: boolean;

    /**
     * Scale factor for per-hit groove bonus (default: 1.0)
     * Only used when perHitMultiplier is true
     */
    perHitScale: number;

    /** End-of-groove bonus configuration */
    endBonus: GrooveEndBonusConfig;
}

/**
 * Complete rhythm XP configuration
 *
 * Controls how XP is calculated for rhythm game button presses.
 * The system separates "score points" (for display) from "character XP" (for progression).
 */
export interface RhythmXPConfig {
    /**
     * Base XP values for each accuracy level.
     * These are "score points" - raw values before xpRatio is applied.
     */
    baseXP: RhythmBaseXPConfig;

    /**
     * Score-to-XP conversion ratio.
     * finalCharacterXP = scorePoints * xpRatio
     *
     * Examples:
     * - xpRatio: 1.0  → 10 score = 10 XP (unchanged)
     * - xpRatio: 0.1  → 10 score = 1 XP (default, tuned for D&D 5e progression)
     * - xpRatio: 0.5  → 10 score = 5 XP (half)
     *
     * This allows tuning the rhythm game independently from character progression.
     */
    xpRatio: number;

    /** Combo multiplier configuration */
    combo: RhythmComboConfig;

    /** Groove XP configuration */
    groove: RhythmGrooveConfig;

    /**
     * Maximum total multiplier cap (default: 5.0)
     * Applied after combining combo and groove multipliers
     */
    maxMultiplier: number;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of calculating XP for a single button press
 *
 * Contains both score (for display/leaderboards) and XP (for character progression).
 */
export interface RhythmXPResult {
    /** Raw score from accuracy (before ratio and multipliers) */
    scorePoints: number;

    /** Score converted to XP base (scorePoints * xpRatio) */
    baseXP: number;

    /** Current combo multiplier applied */
    comboMultiplier: number;

    /** Groove bonus multiplier (0 if not enabled) */
    grooveMultiplier: number;

    /** Combined multiplier (capped at maxMultiplier) */
    totalMultiplier: number;

    /** Final score for display/leaderboards (scorePoints * totalMultiplier) */
    finalScore: number;

    /** Final character XP to add (baseXP * totalMultiplier, floored at 0) */
    finalXP: number;

    /** Breakdown of calculation inputs */
    breakdown: {
        /** Accuracy level of the hit */
        accuracy: BeatAccuracy;

        /** Combo length at time of hit */
        comboLength: number;

        /** Groove hotness at time of hit (0-100), if groove is active */
        grooveHotness?: number;
    };
}

/**
 * Result of calculating combo end bonus
 *
 * Awarded when a combo breaks (miss or wrongKey after a streak).
 */
export interface ComboEndBonusResult {
    /** The combo length that just ended */
    comboLength: number;

    /** Raw bonus score (before ratio) */
    bonusScore: number;

    /** Actual XP to add (bonusScore * xpRatio) */
    bonusXP: number;
}

/**
 * Statistics for groove end bonus calculation
 *
 * Retrieved from GrooveAnalyzer.getGrooveStats() when a groove ends.
 */
export interface GrooveStats {
    /** Peak streak during groove */
    maxStreak: number;

    /** Peak hotness reached during groove */
    maxHotness: number;

    /** Average hotness over groove lifetime */
    avgHotness: number;

    /** How long groove lasted in seconds */
    duration: number;

    /** Total hits in groove */
    totalHits: number;

    /** When groove started (audio time) */
    startTime: number;

    /** When groove ended (audio time) */
    endTime: number;
}

/**
 * Statistics for groove end bonus calculation (simplified input)
 *
 * Used when calling calculateGrooveEndBonus() directly.
 */
export interface GrooveEndStats {
    /** Peak streak during groove */
    maxStreak: number;

    /** Average hotness over groove lifetime */
    avgHotness: number;

    /** How long groove lasted in seconds */
    duration: number;

    /** Total hits in groove */
    totalHits: number;
}

/**
 * Result of calculating groove end bonus
 *
 * Awarded when a groove ends (hotness drops to 0 or session ends).
 */
export interface GrooveEndBonusResult {
    /** Raw bonus score (before ratio) */
    bonusScore: number;

    /** Actual XP to add (bonusScore * xpRatio) */
    bonusXP: number;
}

// ============================================================================
// Session Tracking Types
// ============================================================================

/**
 * Cumulative session statistics for UI display
 *
 * Tracks totals over a rhythm game session for displaying
 * session summaries without requiring frontend tracking.
 */
export interface RhythmSessionTotals {
    /** Total raw score accumulated */
    totalScore: number;

    /** Total character XP earned */
    totalXP: number;

    /** Peak combo achieved */
    maxCombo: number;

    /** Count of each accuracy type */
    accuracyDistribution: {
        perfect: number;
        great: number;
        good: number;
        ok: number;
        miss: number;
        wrongKey: number;
    };

    /** Overall accuracy percentage (perfect+great+good+ok / total hits) */
    accuracyPercentage: number;

    /** Session duration in seconds */
    duration: number;
}

// ============================================================================
// Listening Session XP Boost Types
// ============================================================================

/**
 * Rhythm game context for listening session XP boost
 *
 * When active, boosts the background listening XP while playing rhythm game.
 * This is separate from the per-button-press XP (RhythmXPCalculator).
 */
export interface RhythmGameContext {
    /** Is rhythm game mode currently active? */
    isActive: boolean;

    /** Current combo length */
    currentCombo: number;

    /** Max combo for scaling (default: 100) */
    maxComboCap: number;

    /** Current groove hotness (0-100) */
    grooveHotness: number;

    /** Average hotness over session (optional) */
    avgGrooveHotness?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default combo end bonus formula: comboLength * 5
 *
 * Examples:
 * - 10 combo → 50 bonus score → 5 XP (with 0.1 ratio)
 * - 50 combo → 250 bonus score → 25 XP
 * - 100 combo → 500 bonus score → 50 XP
 */
const DEFAULT_COMBO_END_BONUS_FORMULA = (comboLength: number): number => comboLength * 5;

/**
 * Default rhythm XP configuration
 *
 * Tuned for D&D 5e progression with xpRatio: 0.1 (10 score points = 1 character XP).
 *
 * Note: The default combo multiplier formula (1 + comboLength/50, capped at 5.0) is
 * implemented in RhythmXPCalculator. The config.combo.formula is only for custom formulas.
 */
export const DEFAULT_RHYTHM_XP_CONFIG: RhythmXPConfig = {
    baseXP: {
        perfect: 10,
        great: 7,
        good: 5,
        ok: 2,
        miss: 0,
        wrongKey: 0,
    },
    xpRatio: 0.1,  // 10 score points = 1 character XP
    combo: {
        enabled: true,
        cap: 5.0,
        okBreaksCombo: true,  // Default: "ok" accuracy breaks combo (stricter gameplay)
        endBonus: {
            enabled: true,
            formula: DEFAULT_COMBO_END_BONUS_FORMULA,
        },
    },
    groove: {
        perHitMultiplier: false,
        perHitScale: 1.0,
        endBonus: {
            enabled: true,
            maxStreakWeight: 0.5,
            avgHotnessWeight: 0.5,
            durationWeight: 0.25,
        },
    },
    maxMultiplier: 5.0,
};

// ============================================================================
// Configuration Helpers
// ============================================================================

/**
 * Merge user config with defaults for combo settings
 */
function mergeComboConfig(
    userCombo?: Partial<RhythmComboConfig>
): RhythmComboConfig {
    const defaults = DEFAULT_RHYTHM_XP_CONFIG.combo;

    if (!userCombo) return defaults;

    return {
        enabled: userCombo.enabled ?? defaults.enabled,
        cap: userCombo.cap ?? defaults.cap,
        formula: userCombo.formula ?? defaults.formula,
        okBreaksCombo: userCombo.okBreaksCombo ?? defaults.okBreaksCombo,
        endBonus: {
            ...defaults.endBonus,
            ...userCombo.endBonus,
        },
    };
}

/**
 * Merge user config with defaults for groove settings
 */
function mergeGrooveConfig(
    userGroove?: Partial<RhythmGrooveConfig>
): RhythmGrooveConfig {
    const defaults = DEFAULT_RHYTHM_XP_CONFIG.groove;

    if (!userGroove) return defaults;

    return {
        perHitMultiplier: userGroove.perHitMultiplier ?? defaults.perHitMultiplier,
        perHitScale: userGroove.perHitScale ?? defaults.perHitScale,
        endBonus: {
            ...defaults.endBonus,
            ...userGroove.endBonus,
        },
    };
}

/**
 * Merge user config with defaults
 *
 * Creates a complete RhythmXPConfig by merging user-provided partial
 * configuration with sensible defaults.
 *
 * @param userConfig - Partial configuration to override defaults
 * @returns Complete configuration
 *
 * @example
 * ```typescript
 * // Use all defaults
 * const config = mergeRhythmXPConfig();
 *
 * // Customize XP ratio only
 * const config = mergeRhythmXPConfig({ xpRatio: 0.2 });
 *
 * // Customize combo settings
 * const config = mergeRhythmXPConfig({
 *   combo: {
 *     cap: 10.0,
 *     formula: (combo) => 1 + Math.log10(combo + 1)
 *   }
 * });
 * ```
 */
export function mergeRhythmXPConfig(
    userConfig?: Partial<RhythmXPConfig>
): RhythmXPConfig {
    if (!userConfig) return DEFAULT_RHYTHM_XP_CONFIG;

    return {
        baseXP: {
            ...DEFAULT_RHYTHM_XP_CONFIG.baseXP,
            ...userConfig.baseXP,
        },
        xpRatio: userConfig.xpRatio ?? DEFAULT_RHYTHM_XP_CONFIG.xpRatio,
        combo: mergeComboConfig(userConfig.combo),
        groove: mergeGrooveConfig(userConfig.groove),
        maxMultiplier: userConfig.maxMultiplier ?? DEFAULT_RHYTHM_XP_CONFIG.maxMultiplier,
    };
}

// ============================================================================
// Combo Breaking Helper
// ============================================================================

/**
 * Determine if an accuracy level should break the combo streak.
 *
 * This helper function centralizes the combo-breaking logic so frontends
 * don't have to duplicate it. It considers both the accuracy level and
 * the `okBreaksCombo` configuration option.
 *
 * @param accuracy - The accuracy level of the hit
 * @param okBreaksCombo - Whether "ok" accuracy breaks combo (default: true from config)
 * @returns true if the accuracy should break the combo, false otherwise
 *
 * @example
 * ```typescript
 * import { shouldAccuracyBreakCombo, RhythmXPCalculator } from 'playlist-data-engine';
 *
 * const rhythmXP = new RhythmXPCalculator();
 * const config = rhythmXP.getConfig();
 *
 * // Check if accuracy breaks combo
 * if (shouldAccuracyBreakCombo(buttonResult.accuracy, config.combo.okBreaksCombo)) {
 *   // Combo breaks - award end bonus before resetting
 *   const bonus = rhythmXP.calculateComboEndBonus(currentCombo);
 *   updater.addXP(character, bonus.bonusXP, 'combo_bonus');
 *   currentCombo = 0;
 * } else {
 *   currentCombo++;
 * }
 *
 * // Using with custom okBreaksCombo setting
 * const customConfig = { combo: { okBreaksCombo: false } };
 * const rhythmXP = new RhythmXPCalculator(customConfig);
 * // Now "ok" accuracy will NOT break combo
 * ```
 */
export function shouldAccuracyBreakCombo(
    accuracy: BeatAccuracy,
    okBreaksCombo: boolean = DEFAULT_RHYTHM_XP_CONFIG.combo.okBreaksCombo
): boolean {
    // miss and wrongKey always break combo
    if (accuracy === 'miss' || accuracy === 'wrongKey') {
        return true;
    }

    // ok breaks combo only if okBreaksCombo is true
    if (accuracy === 'ok') {
        return okBreaksCombo;
    }

    // perfect, great, good never break combo
    return false;
}
