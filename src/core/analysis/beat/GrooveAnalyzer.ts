/**
 * GrooveAnalyzer - A "groove meter" system for rhythm games
 *
 * Rewards consistency in timing feel rather than proximity to perfect center.
 * Inspired by Devil May Cry's style meter - it's not about being mechanically
 * perfect, it's about establishing and maintaining a consistent "pocket."
 *
 * Core Philosophy:
 * - Hitting consistently 30ms behind the beat = GOOD (you're in a pocket)
 * - Hitting perfectly on beat after establishing a behind-beat pocket = BAD (you broke the feel)
 * - The meter charges when you maintain consistency to YOUR established pocket,
 *   not to absolute perfection
 */

import type {
    GrooveDirection,
    GrooveResult,
    GrooveState,
    GrooveAnalyzerOptions,
    BeatAccuracy,
    DifficultyPreset,
    GroovePenaltyConfig,
    GrooveTier,
} from '../../types/BeatMap.js';
import type { GrooveStats } from '../../types/RhythmXP.js';
import {
    DEFAULT_GROOVE_OPTIONS,
    getGroovePenaltiesForPreset,
    getGrooveTier,
    getGrooveWindowMs,
} from '../../types/BeatMap.js';

/**
 * Analyzes groove/feel consistency in rhythm game play
 *
 * The GrooveAnalyzer tracks timing patterns and rewards players for maintaining
 * a consistent "pocket" - whether that's ahead of the beat (push), behind (pull),
 * or centered (neutral).
 *
 * @example
 * ```typescript
 * const grooveAnalyzer = new GrooveAnalyzer();
 *
 * // On each button press during gameplay
 * const buttonResult = beatStream.checkButtonPress(timestamp);
 * const grooveResult = grooveAnalyzer.recordHit(buttonResult.offset, beatStream.getCurrentBpm());
 *
 * // When user misses a beat (doesn't press)
 * grooveAnalyzer.recordMiss();
 *
 * // Read the groove state for UI display
 * if (grooveResult.pocketDirection !== 'neutral') {
 *   console.log(`${grooveResult.pocketDirection} groove: ${grooveResult.hotness}%`);
 * }
 * ```
 */
export class GrooveAnalyzer {
    private options: Required<GrooveAnalyzerOptions>;
    private recentOffsets: number[] = [];
    private establishedOffset: number = 0;
    private pocketDirection: GrooveDirection = 'neutral';
    private hotness: number = 0;
    private streakLength: number = 0;
    private hitCount: number = 0;
    private lastBpm: number = 120; // Default BPM for pocket window calculation

    // Groove lifetime tracking fields (for groove end bonus calculation)
    private grooveStartTime: number | null = null;      // When current groove started (audio time)
    private maxHotness: number = 0;                     // Peak hotness during groove
    private hotnessSamples: number[] = [];              // All hotness values for averaging
    private grooveHitCount: number = 0;                 // Total hits in current groove
    private previousDirection: GrooveDirection = 'neutral';  // Track direction for change detection

    /**
     * Create a new GrooveAnalyzer instance
     *
     * @param options - Optional configuration to customize groove analysis behavior
     */
    constructor(options?: Partial<GrooveAnalyzerOptions>) {
        this.options = { ...DEFAULT_GROOVE_OPTIONS, ...options };
    }

    /**
     * Set difficulty level for groove penalties.
     *
     * Updates the penalty values (hotnessLossOnMiss, hotnessLossOnBreak) based on
     * a difficulty preset. This allows dynamic difficulty changes during gameplay.
     *
     * @param options - Difficulty configuration
     * @param options.preset - The difficulty preset ('easy', 'medium', 'hard', or 'custom')
     * @param options.customPenalties - Custom penalties to use when preset is 'custom'
     *
     * @example
     * ```typescript
     * // Set to hard difficulty
     * grooveAnalyzer.setDifficulty({ preset: 'hard' });
     *
     * // Set to custom difficulty with specific penalty values
     * grooveAnalyzer.setDifficulty({
     *     preset: 'custom',
     *     customPenalties: { hotnessLossOnMiss: 30, hotnessLossOnBreak: 25 }
     * });
     * ```
     */
    setDifficulty(options: {
        preset: DifficultyPreset;
        customPenalties?: Partial<GroovePenaltyConfig>;
    }): void {
        const penalties = getGroovePenaltiesForPreset(options.preset, options.customPenalties);
        this.options.hotnessLossOnMiss = penalties.hotnessLossOnMiss;
        this.options.hotnessLossOnBreak = penalties.hotnessLossOnBreak;
    }

    /**
     * Record a button press hit and get groove analysis
     *
     * This is the main method called after each button press during gameplay.
     * It updates the pocket tracking, calculates consistency, and adjusts hotness.
     *
     * IMPORTANT: When accuracy is 'miss' or 'wrongKey', this method will:
     * - NOT update the pocket tracking (the offset is not valid for groove)
     * - Decrease hotness by hotnessLossOnMiss
     * - Reset the streak
     * - Return inPocket: false
     *
     * This ensures that missed beats and wrong key presses hurt the groove score
     * rather than contributing to it.
     *
     * @param offset - Timing offset in seconds (negative = early/push, positive = late/pull)
     * @param bpm - Current BPM of the song (used for BPM-aware window calculation)
     * @param currentTime - Current audio time for groove duration tracking (use buttonResult.matchedBeat.time)
     * @param accuracy - Accuracy level from BeatStream.checkButtonPress(). When 'miss' or 'wrongKey', treats as a miss.
     * @returns GrooveResult with current groove state and hit analysis
     */
    recordHit(offset: number, bpm: number, currentTime: number = 0, accuracy: BeatAccuracy = 'perfect'): GrooveResult {
        this.hitCount++;
        this.lastBpm = bpm;

        // If accuracy is 'miss' or 'wrongKey', treat as a miss instead of a valid hit
        // This ensures missed beats and wrong key presses hurt the groove score
        if (accuracy === 'miss' || accuracy === 'wrongKey') {
            return this.recordMiss(currentTime);
        }

        // Store previous direction before updating (for direction change detection)
        const previousDirection = this.pocketDirection;

        // 1. Add to recent offsets (rolling window)
        this.recentOffsets.push(offset);
        if (this.recentOffsets.length > this.options.averagingWindowSize) {
            this.recentOffsets.shift();
        }

        // 2. Update running average (simple moving average)
        this.updateRunningAverage();

        // 3. Determine pocket direction from average
        this.pocketDirection = this.determineDirection(this.establishedOffset);

        // 4. Calculate pocket window (BPM-aware + progressive)
        const pocketWindow = this.calculatePocketWindow(bpm);

        // 5. Calculate distance from current hit to established pocket center
        const distanceFromPocket = Math.abs(offset - this.establishedOffset);

        // 6. Calculate consistency (quadratic falloff)
        const consistency = this.calculateConsistency(distanceFromPocket, pocketWindow);

        // 7. Check if hit is in pocket
        const inPocket = this.hasPocket() && distanceFromPocket <= pocketWindow;

        // 8. Update hotness and streak
        if (this.hasPocket()) {
            if (inPocket) {
                // Uncapped hotness - can exceed 100 for higher tiers (A, S, SS)
                this.hotness = this.hotness + this.options.hotnessGainPerHit;
                this.streakLength++;
            } else {
                this.hotness = Math.max(0, this.hotness - this.options.hotnessLossOnBreak);
                // Streak continues even on pocket break per design decision
            }
        }

        // 9. Track groove lifetime statistics and detect groove ending
        let endedGrooveStats: GrooveStats | undefined;

        // Check for any direction change between push, neutral, and pull
        // All transitions trigger end of groove bonus and reset groove strength
        const directionChanged = previousDirection !== this.pocketDirection;

        // Determine if groove is ending this hit
        const grooveEnding = directionChanged || this.hotness === 0;

        if (this.hotness > 0 && !grooveEnding) {
            // Groove is active - track lifetime statistics
            if (this.grooveStartTime === null) {
                this.grooveStartTime = currentTime ?? (this.hitCount * (60 / bpm));
            }
            this.maxHotness = Math.max(this.maxHotness, this.hotness);
            this.hotnessSamples.push(this.hotness);
            this.grooveHitCount++;
        } else if (grooveEnding && this.grooveStartTime !== null && this.grooveHitCount > 0) {
            // Groove is ending - capture final stats BEFORE resetting
            const endTime = currentTime ?? (this.hitCount * (60 / bpm));
            const avgHotness = this.hotnessSamples.length > 0
                ? this.hotnessSamples.reduce((a, b) => a + b, 0) / this.hotnessSamples.length
                : 0;

            endedGrooveStats = {
                maxStreak: this.streakLength,
                maxHotness: this.maxHotness,
                avgHotness,
                duration: endTime - this.grooveStartTime,
                totalHits: this.grooveHitCount,
                startTime: this.grooveStartTime,
                endTime,
            };

            // Reset groove state - streak ends when groove ends
            this.streakLength = 0;
            this.hotness = 0; // Reset groove strength when direction changes
            this.resetGrooveStats();
        }

        // CRITICAL: When direction changes, ALWAYS reset groove state
        // This ensures reset happens even if the else-if block didn't run
        // (e.g., when grooveStartTime is null or grooveHitCount is 0)
        // This handles cases like:
        // - First hit after previous groove ended causes direction change
        // - Direction changes without an active groove session
        // - Direct push↔pull transitions that skip neutral
        if (directionChanged) {
            this.streakLength = 0;
            this.hotness = 0;
            this.resetGrooveStats();
        }

        // Update previous direction for next call
        this.previousDirection = this.pocketDirection;

        // 10. Return result
        return {
            pocketDirection: this.pocketDirection,
            establishedOffset: this.establishedOffset,
            consistency,
            hotness: this.hotness,
            tier: getGrooveTier(this.hotness),
            streakLength: this.streakLength,
            inPocket,
            pocketWindow,
            endedGrooveStats,
        };
    }

    /**
     * Record a missed beat (user didn't press)
     *
     * Reduces hotness by configured miss penalty (default: 10).
     * Resets streak but does NOT clear the established pocket.
     * Captures endedGrooveStats if the miss ends the groove (hotness drops to 0).
     *
     * @param currentTime - Current audio time for groove duration tracking (optional)
     * @returns GrooveResult representing current state after miss
     */
    recordMiss(currentTime?: number): GrooveResult {
        // Track values BEFORE modifying them (for groove end stats)
        const previousHotness = this.hotness;
        const previousStreak = this.streakLength;
        const wasGrooveActive = previousHotness > 0 && this.grooveStartTime !== null && this.grooveHitCount > 0;

        // Reduce hotness
        this.hotness = Math.max(0, this.hotness - this.options.hotnessLossOnMiss);
        this.streakLength = 0;

        const pocketWindow = this.calculatePocketWindow(this.lastBpm);

        // Check if this miss ended the groove
        let endedGrooveStats: GrooveStats | undefined;

        if (wasGrooveActive && this.hotness === 0) {
            // Groove is ending due to this miss - capture stats BEFORE resetting
            const endTime = currentTime ?? (this.hitCount * (60 / this.lastBpm));
            const avgHotness = this.hotnessSamples.length > 0
                ? this.hotnessSamples.reduce((a, b) => a + b, 0) / this.hotnessSamples.length
                : 0;

            endedGrooveStats = {
                maxStreak: previousStreak,
                maxHotness: this.maxHotness,
                avgHotness,
                duration: endTime - this.grooveStartTime!,
                totalHits: this.grooveHitCount,
                startTime: this.grooveStartTime!,
                endTime,
            };

            // Reset groove state
            this.resetGrooveStats();
        }

        return {
            pocketDirection: this.pocketDirection,
            establishedOffset: this.establishedOffset,
            consistency: 0, // No hit, so no consistency
            hotness: this.hotness,
            tier: getGrooveTier(this.hotness),
            streakLength: this.streakLength,
            inPocket: false, // Miss is never in pocket
            pocketWindow,
            endedGrooveStats,
        };
    }

    /**
     * Get current groove analyzer state snapshot
     *
     * @returns GrooveState with all current values including lifetime statistics
     */
    getState(): GrooveState {
        // Calculate average hotness from samples
        const avgHotness = this.hotnessSamples.length > 0
            ? this.hotnessSamples.reduce((a, b) => a + b, 0) / this.hotnessSamples.length
            : 0;

        return {
            pocketDirection: this.pocketDirection,
            establishedOffset: this.establishedOffset,
            hotness: this.hotness,
            tier: getGrooveTier(this.hotness),
            streakLength: this.streakLength,
            hitCount: this.hitCount,
            pocketWindow: this.calculatePocketWindow(this.lastBpm),
            // Groove lifetime statistics
            grooveStartTime: this.grooveStartTime,
            grooveDuration: this.grooveStartTime !== null ? this.grooveHitCount * (60 / this.lastBpm) : 0,
            maxHotness: this.maxHotness,
            avgHotness,
            grooveHitCount: this.grooveHitCount,
        };
    }

    /**
     * Reset the analyzer to initial state
     *
     * Clears all tracking data including established pocket,
     * hotness, streak, and hit count.
     */
    reset(): void {
        this.recentOffsets = [];
        this.establishedOffset = 0;
        this.pocketDirection = 'neutral';
        this.hotness = 0;
        this.streakLength = 0;
        this.hitCount = 0;
        this.lastBpm = 120;
        this.resetGrooveStats();
    }

    /**
     * Get groove statistics for end bonus calculation.
     * Call this when hotness drops to 0 or at session end.
     *
     * @param currentAudioTime - Current audio time for duration calculation (defaults to hitCount-based estimation)
     * @returns GrooveStats or null if no groove was active
     */
    getGrooveStats(currentAudioTime?: number): GrooveStats | null {
        if (this.grooveStartTime === null || this.grooveHitCount === 0) {
            return null;
        }

        const endTime = currentAudioTime ?? (this.hitCount * (60 / this.lastBpm));
        const avgHotness = this.hotnessSamples.length > 0
            ? this.hotnessSamples.reduce((a, b) => a + b, 0) / this.hotnessSamples.length
            : 0;

        return {
            maxStreak: this.streakLength,  // Current streak is max when groove ends
            maxHotness: this.maxHotness,
            avgHotness,
            duration: endTime - this.grooveStartTime,
            totalHits: this.grooveHitCount,
            startTime: this.grooveStartTime,
            endTime,
        };
    }

    /**
     * Reset groove lifetime tracking.
     * Called internally when hotness drops to 0 or direction changes.
     * Can also be called externally to force a reset (e.g., at session end).
     */
    resetGrooveStats(): void {
        this.grooveStartTime = null;
        this.maxHotness = 0;
        this.hotnessSamples = [];
        this.grooveHitCount = 0;
    }

    /**
     * Check if a pocket has been established
     *
     * A pocket is established after minHitsForPocket consistent hits.
     *
     * @returns true if pocket is established
     */
    private hasPocket(): boolean {
        return this.hitCount >= this.options.minHitsForPocket;
    }

    /**
     * Calculate the current pocket window size
     *
     * Uses tier-based window sizes with BPM scaling.
     * Window shrinks as you climb tiers (D → C → B → A → S → SS).
     *
     * @param bpm - Current BPM
     * @returns Pocket window size in seconds
     */
    private calculatePocketWindow(bpm: number): number {
        // Get tier-based window size in milliseconds
        const windowMs = getGrooveWindowMs(this.hotness);

        // Convert to seconds
        const windowSeconds = windowMs / 1000;

        // Apply BPM scaling: faster songs = proportionally smaller windows
        // At 120 BPM, use the base window size
        // At 90 BPM, window is 4/3 larger (slower song, more time between beats)
        // At 180 BPM, window is 2/3 smaller (faster song, less time between beats)
        const bpmScaleFactor = 120 / bpm;

        return windowSeconds * bpmScaleFactor;
    }

    /**
     * Update the running average of recent offsets
     *
     * Uses simple moving average of recent hits within the averaging window.
     */
    private updateRunningAverage(): void {
        if (this.recentOffsets.length === 0) return;
        this.establishedOffset = this.recentOffsets.reduce((a, b) => a + b, 0) / this.recentOffsets.length;
    }

    /**
     * Calculate consistency score using quadratic falloff
     *
     * Returns 1.0 at pocket center, 0.0 at or beyond window edge.
     * Uses quadratic falloff for more forgiving feel near center.
     *
     * @param distanceFromPocket - Absolute distance from pocket center in seconds
     * @param pocketWindow - Current pocket window size in seconds
     * @returns Consistency score (0.0 - 1.0)
     */
    private calculateConsistency(distanceFromPocket: number, pocketWindow: number): number {
        // Before pocket is established, return 0 consistency
        if (!this.hasPocket()) {
            return 0;
        }

        const normalizedDistance = distanceFromPocket / pocketWindow;
        if (normalizedDistance >= 1) return 0;

        // Quadratic falloff: 1.0 at center, 0.0 at edge
        return 1 - (normalizedDistance * normalizedDistance);
    }

    /**
     * Determine groove direction from offset
     *
     * Uses configurable dead zone (±10ms by default = 20ms total) for neutral classification.
     *
     * @param offset - Timing offset in seconds
     * @returns GrooveDirection ('push', 'pull', or 'neutral')
     */
    private determineDirection(offset: number): GrooveDirection {
        if (Math.abs(offset) < this.options.neutralDeadZone) return 'neutral';
        return offset < 0 ? 'push' : 'pull';
    }
}
