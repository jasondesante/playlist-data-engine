/**
 * RhythmXPCalculator - Calculates XP for rhythm game button presses
 *
 * This calculator handles two parallel systems:
 * 1. Per-button-press XP (this class) - rewards timing accuracy, combos, groove
 * 2. Listening session XP boost (XPCalculator) - boosts background listening XP
 *
 * The system separates "score points" (for display/leaderboards) from
 * "character XP" (for progression) via the `xpRatio` parameter.
 */

import type { BeatAccuracy } from '../types/BeatMap.js';
import type {
    RhythmXPConfig,
    RhythmXPResult,
    ComboEndBonusResult,
    GrooveEndStats,
    GrooveEndBonusResult,
    RhythmSessionTotals,
} from '../types/RhythmXP.js';
import {
    DEFAULT_RHYTHM_XP_CONFIG,
    mergeRhythmXPConfig,
} from '../types/RhythmXP.js';

/**
 * Calculates XP rewards for rhythm game button presses
 *
 * The RhythmXPCalculator can be used in two modes:
 * 1. **Stateless**: Call `calculateButtonPressXP()` directly, frontend tracks combo/session
 * 2. **Stateful**: Use `startSession()`, `recordHit()`, `getSessionTotals()`, `endSession()`
 *
 * @example Stateless usage
 * ```typescript
 * const calculator = new RhythmXPCalculator({ xpRatio: 0.1 });
 * const result = calculator.calculateButtonPressXP(buttonResult, { comboLength: 50 });
 * console.log(`Score: ${result.finalScore}, XP: ${result.finalXP}`);
 * ```
 *
 * @example Stateful session tracking
 * ```typescript
 * const calculator = new RhythmXPCalculator();
 * calculator.startSession();
 *
 * // On each hit
 * const result = calculator.recordHit(buttonResult, { comboLength, grooveHotness });
 *
 * // Get running totals for UI
 * const totals = calculator.getSessionTotals();
 *
 * // End session
 * const finalTotals = calculator.endSession();
 * ```
 */
export class RhythmXPCalculator {
    private config: RhythmXPConfig;

    // Session tracking state
    private sessionTotals: RhythmSessionTotals | null = null;
    private sessionStartTime: number | null = null;

    /**
     * Create a new RhythmXPCalculator instance
     *
     * @param config - Optional partial configuration to override defaults
     */
    constructor(config?: Partial<RhythmXPConfig>) {
        this.config = mergeRhythmXPConfig(config);
    }

    // ========================================
    // Core XP Calculation (stateless)
    // ========================================

    /**
     * Calculate XP for a single button press
     *
     * This is the main method for calculating XP rewards. It considers:
     * - Base XP from accuracy level (via xpRatio conversion)
     * - Combo multiplier (if enabled)
     * - Groove multiplier (if per-hit groove is enabled)
     *
     * @param accuracy - The accuracy level of the hit
     * @param options - Optional combo length and groove hotness
     * @returns RhythmXPResult with score and XP values
     */
    calculateButtonPressXP(
        accuracy: BeatAccuracy,
        options?: {
            comboLength?: number;
            grooveHotness?: number;
        }
    ): RhythmXPResult {
        const comboLength = options?.comboLength ?? 0;
        const grooveHotness = options?.grooveHotness;

        // 1. Get base score points from accuracy
        const scorePoints = this.getBaseXP(accuracy);

        // 2. Convert to base XP (score * xpRatio)
        const baseXP = scorePoints * this.config.xpRatio;

        // 3. Calculate combo multiplier
        const comboMultiplier = this.config.combo.enabled
            ? this.getComboMultiplier(comboLength)
            : 1;

        // 4. Calculate groove multiplier (per-hit mode)
        let grooveMultiplier = 0;
        if (this.config.groove.perHitMultiplier && grooveHotness !== undefined && grooveHotness > 0) {
            grooveMultiplier = (grooveHotness / 100) * this.config.groove.perHitScale;
        }

        // 5. Calculate total multiplier (capped)
        const totalMultiplier = Math.min(
            comboMultiplier + grooveMultiplier,
            this.config.maxMultiplier
        );

        // 6. Calculate final score and XP
        const finalScore = scorePoints * totalMultiplier;
        const rawFinalXP = baseXP * totalMultiplier;

        // Floor XP at 0 (negative baseXP affects score only, not character progression)
        const finalXP = Math.max(0, rawFinalXP);

        return {
            scorePoints,
            baseXP,
            comboMultiplier,
            grooveMultiplier,
            totalMultiplier,
            finalScore,
            finalXP,
            breakdown: {
                accuracy,
                comboLength,
                grooveHotness,
            },
        };
    }

    /**
     * Calculate combo end bonus
     *
     * Call this when a combo breaks (miss or wrongKey) to award a bonus
     * based on the combo length achieved.
     *
     * @param comboLength - The combo length that just ended (before reset)
     * @returns ComboEndBonusResult with bonus score and XP
     */
    calculateComboEndBonus(comboLength: number): ComboEndBonusResult {
        if (!this.config.combo.endBonus.enabled || comboLength <= 0) {
            return {
                comboLength,
                bonusScore: 0,
                bonusXP: 0,
            };
        }

        // Use custom formula or default
        const bonusScore = this.config.combo.endBonus.formula
            ? this.config.combo.endBonus.formula(comboLength)
            : comboLength * 2; // Default: comboLength * 2

        const bonusXP = bonusScore * this.config.xpRatio;

        return {
            comboLength,
            bonusScore,
            bonusXP,
        };
    }

    /**
     * Calculate groove end bonus
     *
     * Call this when a groove ends (hotness drops to 0 or session ends).
     * Uses weighted calculation based on groove statistics.
     *
     * @param stats - Groove statistics from GrooveAnalyzer.getGrooveStats()
     * @returns GrooveEndBonusResult with bonus score and XP
     */
    calculateGrooveEndBonus(stats: GrooveEndStats): GrooveEndBonusResult {
        if (!this.config.groove.endBonus.enabled) {
            return {
                bonusScore: 0,
                bonusXP: 0,
            };
        }

        const { maxStreakWeight, avgHotnessWeight, durationWeight } =
            this.config.groove.endBonus;

        // Weighted calculation
        // Each component contributes to the bonus based on its weight
        const streakBonus = stats.maxStreak * maxStreakWeight;
        const hotnessBonus = stats.avgHotness * avgHotnessWeight;
        const durationBonus = stats.duration * durationWeight;

        const bonusScore = streakBonus + hotnessBonus + durationBonus;
        const bonusXP = bonusScore * this.config.xpRatio;

        return {
            bonusScore,
            bonusXP,
        };
    }

    /**
     * Get base score points for an accuracy level
     *
     * These are "score points" - raw values before xpRatio is applied.
     *
     * @param accuracy - The accuracy level
     * @returns Base score points for this accuracy
     */
    getBaseXP(accuracy: BeatAccuracy): number {
        return this.config.baseXP[accuracy];
    }

    /**
     * Calculate combo multiplier from combo length
     *
     * Default formula: 1 + (comboLength / 50), capped at config.combo.cap
     * At 50 combo = 2x, at 100 combo = 3x, at 200 combo = 5x (with default cap)
     *
     * @param comboLength - Current combo count
     * @returns Multiplier value (capped at config.combo.cap)
     */
    getComboMultiplier(comboLength: number): number {
        if (!this.config.combo.enabled) {
            return 1;
        }

        // Use custom formula or default
        const multiplier = this.config.combo.formula
            ? this.config.combo.formula(comboLength)
            : this.defaultComboFormula(comboLength);

        // Cap the multiplier
        return Math.min(multiplier, this.config.combo.cap);
    }

    /**
     * Default combo multiplier formula
     *
     * 1 + (comboLength / 25), capped at config.combo.cap
     * - At 0 combo = 1x (no bonus)
     * - At 25 combo = 2x
     * - At 50 combo = 3x
     * - At 100 combo = 5x (cap with default config)
     */
    private defaultComboFormula(comboLength: number): number {
        return 1 + comboLength / 25;
    }

    // ========================================
    // Session Tracking (stateful convenience)
    // ========================================

    /**
     * Start a new session
     *
     * Resets all totals and records the start time.
     * Call this at the beginning of a rhythm game session.
     */
    startSession(): void {
        this.sessionTotals = this.createEmptyTotals();
        this.sessionStartTime = Date.now();
    }

    /**
     * Record a hit and update session totals
     *
     * Calculates XP for the hit AND updates internal session totals.
     * This is a convenience method for stateful session tracking.
     *
     * @param accuracy - The accuracy level of the hit
     * @param options - Optional combo length and groove hotness
     * @returns RhythmXPResult with score and XP values
     */
    recordHit(
        accuracy: BeatAccuracy,
        options?: {
            comboLength?: number;
            grooveHotness?: number;
        }
    ): RhythmXPResult {
        if (!this.sessionTotals) {
            // Auto-start session if not started
            this.startSession();
        }

        const result = this.calculateButtonPressXP(accuracy, options);

        // Update session totals
        this.sessionTotals!.totalScore += result.finalScore;
        this.sessionTotals!.totalXP += result.finalXP;

        // Track max combo
        const comboLength = options?.comboLength ?? 0;
        if (comboLength > this.sessionTotals!.maxCombo) {
            this.sessionTotals!.maxCombo = comboLength;
        }

        // Update accuracy distribution
        this.sessionTotals!.accuracyDistribution[accuracy]++;

        // Recalculate accuracy percentage
        this.recalculateAccuracyPercentage();

        return result;
    }

    /**
     * Get current session totals for UI display
     *
     * Returns a snapshot of the current session statistics.
     *
     * @returns RhythmSessionTotals or null if no session is active
     */
    getSessionTotals(): RhythmSessionTotals | null {
        if (!this.sessionTotals || !this.sessionStartTime) {
            return null;
        }

        // Update duration before returning
        return {
            ...this.sessionTotals,
            duration: (Date.now() - this.sessionStartTime) / 1000,
        };
    }

    /**
     * End session and get final totals
     *
     * Returns final session statistics and clears session state.
     *
     * @returns RhythmSessionTotals or null if no session was active
     */
    endSession(): RhythmSessionTotals | null {
        const totals = this.getSessionTotals();

        // Clear session state
        this.sessionTotals = null;
        this.sessionStartTime = null;

        return totals;
    }

    /**
     * Create empty session totals object
     */
    private createEmptyTotals(): RhythmSessionTotals {
        return {
            totalScore: 0,
            totalXP: 0,
            maxCombo: 0,
            accuracyDistribution: {
                perfect: 0,
                great: 0,
                good: 0,
                ok: 0,
                miss: 0,
                wrongKey: 0,
            },
            accuracyPercentage: 0,
            duration: 0,
        };
    }

    /**
     * Recalculate accuracy percentage
     *
     * Accuracy = (perfect + great + good + ok) / total hits
     */
    private recalculateAccuracyPercentage(): void {
        if (!this.sessionTotals) return;

        const { perfect, great, good, ok, miss, wrongKey } =
            this.sessionTotals.accuracyDistribution;
        const totalHits = perfect + great + good + ok + miss + wrongKey;

        if (totalHits === 0) {
            this.sessionTotals.accuracyPercentage = 0;
            return;
        }

        const successfulHits = perfect + great + good + ok;
        this.sessionTotals.accuracyPercentage = (successfulHits / totalHits) * 100;
    }

    // ========================================
    // Configuration
    // ========================================

    /**
     * Get current configuration
     *
     * @returns Current RhythmXPConfig
     */
    getConfig(): RhythmXPConfig {
        return this.config;
    }

    /**
     * Update configuration
     *
     * Merges provided partial config with current configuration.
     *
     * @param config - Partial configuration to merge
     */
    updateConfig(config: Partial<RhythmXPConfig>): void {
        this.config = mergeRhythmXPConfig({
            ...this.config,
            ...config,
        });
    }
}
