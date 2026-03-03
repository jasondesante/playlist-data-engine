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
} from '../../types/BeatMap.js';
import { DEFAULT_GROOVE_OPTIONS } from '../../types/BeatMap.js';

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

    /**
     * Create a new GrooveAnalyzer instance
     *
     * @param options - Optional configuration to customize groove analysis behavior
     */
    constructor(options?: Partial<GrooveAnalyzerOptions>) {
        this.options = { ...DEFAULT_GROOVE_OPTIONS, ...options };
    }

    /**
     * Record a button press hit and get groove analysis
     *
     * This is the main method called after each button press during gameplay.
     * It updates the pocket tracking, calculates consistency, and adjusts hotness.
     *
     * @param offset - Timing offset in seconds (negative = early/push, positive = late/pull)
     * @param bpm - Current BPM of the song (used for BPM-aware window calculation)
     * @returns GrooveResult with current groove state and hit analysis
     */
    recordHit(offset: number, bpm: number): GrooveResult {
        this.hitCount++;
        this.lastBpm = bpm;

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
                this.hotness = Math.min(100, this.hotness + this.options.hotnessGainPerHit);
                this.streakLength++;
            } else {
                this.hotness = Math.max(0, this.hotness - this.options.hotnessLossOnBreak);
                // Streak continues even on pocket break per design decision
            }
        }

        // 9. Return result
        return {
            pocketDirection: this.pocketDirection,
            establishedOffset: this.establishedOffset,
            consistency,
            hotness: this.hotness,
            streakLength: this.streakLength,
            inPocket,
            pocketWindow,
        };
    }

    /**
     * Record a missed beat (user didn't press)
     *
     * Reduces hotness by configured miss penalty (default: 10).
     * Resets streak but does NOT clear the established pocket.
     *
     * @returns GrooveResult representing current state after miss
     */
    recordMiss(): GrooveResult {
        this.hotness = Math.max(0, this.hotness - this.options.hotnessLossOnMiss);
        this.streakLength = 0;

        const pocketWindow = this.calculatePocketWindow(this.lastBpm);

        return {
            pocketDirection: this.pocketDirection,
            establishedOffset: this.establishedOffset,
            consistency: 0, // No hit, so no consistency
            hotness: this.hotness,
            streakLength: this.streakLength,
            inPocket: false, // Miss is never in pocket
            pocketWindow,
        };
    }

    /**
     * Get current groove analyzer state snapshot
     *
     * @returns GrooveState with all current values
     */
    getState(): GrooveState {
        return {
            pocketDirection: this.pocketDirection,
            establishedOffset: this.establishedOffset,
            hotness: this.hotness,
            streakLength: this.streakLength,
            hitCount: this.hitCount,
            pocketWindow: this.calculatePocketWindow(this.lastBpm),
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
     * Uses BPM-aware calculation (1/32 note at current BPM) with
     * progressive tightening at higher hotness levels.
     *
     * @param bpm - Current BPM
     * @returns Pocket window size in seconds
     */
    private calculatePocketWindow(bpm: number): number {
        // Step 1: Calculate beat duration at current BPM
        const beatDuration = 60 / bpm; // in seconds

        // Step 2: Calculate 1/32 note duration (1/32 note = 1/8 of a quarter note)
        const thirtySecondNote = beatDuration / 8;

        // Step 3: Calculate base pocket window (the fraction of 1/32 note)
        const baseWindow = thirtySecondNote * this.options.basePocketWindowFraction * 8;

        // Step 4: Apply progressive tightening based on hotness
        // At 0% hotness: full base window
        // At 100% hotness: minimum window
        const minWindow = this.options.minPocketWindowSeconds;
        const tighteningFactor = this.hotness / 100;
        const pocketWindow = baseWindow - (baseWindow - minWindow) * tighteningFactor;

        return pocketWindow;
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
