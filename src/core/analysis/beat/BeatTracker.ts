/**
 * Beat Tracker using Dynamic Programming
 *
 * Implements the Ellis 2007 beat tracking algorithm using dynamic programming
 * to find the globally optimal beat sequence.
 *
 * Reference: "Beat Tracking by Dynamic Programming" (Ellis, 2007)
 * https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf
 *
 * The algorithm finds beat times {t₁, t₂, ..., tₙ} that maximize:
 *   C({ti}) = Σ O(ti) + α Σ F(ti - ti-1, τp)
 *
 * Where:
 *   O(t) = Onset Strength Envelope (high at moments that make good beats)
 *   F(Δt, τ) = Transition cost function (penalizes tempo deviation)
 *   α = Balance factor (paper found optimal: 680)
 *   τp = Target inter-beat interval (from tempo estimation)
 */

import type { Beat, BeatTrackerConfig, TempoEstimate } from '../../types/BeatMap.js';
import { Logger } from '../../../utils/logger.js';

const logger = Logger.for('BeatTracker');

/**
 * Default configuration for beat tracking
 */
const DEFAULT_BEAT_TRACKER_CONFIG: Required<BeatTrackerConfig> = {
    dpAlpha: 680,           // Ellis optimal balance factor
    sensitivity: 1.0,       // Sensitivity multiplier (1.0 = default behavior)
    minPredecessorRatio: 0.5,   // τp/2 - minimum predecessor interval
    maxPredecessorRatio: 2.0,   // 2τp - maximum predecessor interval
};

/**
 * Internal result of beat tracking
 */
export interface BeatTrackingResult {
    /** Detected beats */
    beats: Beat[];
    /** Frame indices of beats */
    beatFrames: number[];
    /** Cumulative scores (for debugging) */
    cumulativeScores: Float32Array;
}

/**
 * Beat Tracker using Ellis Dynamic Programming Algorithm
 *
 * Finds the globally optimal beat sequence by:
 * 1. Precomputing transition costs for different inter-beat intervals
 * 2. Forward pass: calculating best cumulative scores with backlinks
 * 3. Backward pass: extracting the optimal beat sequence
 *
 * @example
 * ```typescript
 * const tracker = new BeatTracker({
 *   dpAlpha: 680,
 * });
 *
 * const result = tracker.trackBeats(onsetEnvelope, tempoEstimate, hopSizeSeconds);
 * // result.beats contains detected Beat objects
 * ```
 */
export class BeatTracker {
    private config: Required<BeatTrackerConfig>;

    /**
     * Create a new Beat Tracker
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: BeatTrackerConfig = {}) {
        this.config = { ...DEFAULT_BEAT_TRACKER_CONFIG, ...config };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<BeatTrackerConfig> {
        return { ...this.config };
    }

    /**
     * Track beats in an onset strength envelope
     *
     * Implements the Ellis DP algorithm:
     * 1. Precompute transition costs for all possible intervals
     * 2. Forward pass: find best predecessor for each frame
     * 3. Backward pass: extract optimal beat sequence
     * 4. Convert frame indices to Beat objects
     *
     * @param onsetEnvelope - Onset strength envelope from OSE calculation
     * @param tempoEstimate - Tempo estimate from TempoDetector
     * @param hopSizeSeconds - Hop size in seconds (time between envelope frames)
     * @returns Beat tracking result with detected beats
     */
    trackBeats(
        onsetEnvelope: Float32Array,
        tempoEstimate: TempoEstimate,
        hopSizeSeconds: number
    ): BeatTrackingResult {
        const length = onsetEnvelope.length;

        // Handle edge cases
        if (length < 10) {
            return {
                beats: [],
                beatFrames: [],
                cumulativeScores: new Float32Array(length),
            };
        }

        // Target period in frames
        const period = Math.round(tempoEstimate.targetIntervalSeconds / hopSizeSeconds);

        logger.info('BeatTracker: Beat tracking parameters', {
            targetIntervalSeconds: tempoEstimate.targetIntervalSeconds,
            hopSizeSeconds,
            periodFrames: period,
            envelopeLength: length,
        });

        // Need at least a few periods of data
        if (period < 2 || length < period * 2) {
            return {
                beats: [],
                beatFrames: [],
                cumulativeScores: new Float32Array(length),
            };
        }

        // Calculate effective dpAlpha based on sensitivity
        // Higher sensitivity = lower effective dpAlpha = more flexible = more beats
        // Lower sensitivity = higher effective dpAlpha = stricter tempo = fewer beats
        const sensitivity = this.config.sensitivity;
        const effectiveDpAlpha = Math.round(this.config.dpAlpha / sensitivity);

        // Clamp to reasonable bounds (prevent extreme values)
        const clampedDpAlpha = Math.max(10, Math.min(10000, effectiveDpAlpha));

        logger.info('Beat tracking parameters', {
            sensitivity,
            dpAlpha: this.config.dpAlpha,
            effectiveDpAlpha: clampedDpAlpha,
        });

        // Step 1: Precompute transition costs
        // Search range: from τp/2 to 2τp (as per Ellis)
        const minPredecessor = Math.max(1, Math.round(period * this.config.minPredecessorRatio));
        const maxPredecessor = Math.round(period * this.config.maxPredecessorRatio);

        // Transition cost for each interval
        // F(Δt, τ) = -α × (log(Δt/τ))²
        const transitionCosts = new Float32Array(maxPredecessor - minPredecessor + 1);

        for (let i = 0; i < transitionCosts.length; i++) {
            const deltaT = minPredecessor + i;
            // Transition cost: -(log(deltaT/period))² scaled by alpha
            // Using log2 for consistency with paper's notation
            const logRatio = Math.log(deltaT / period);
            transitionCosts[i] = -clampedDpAlpha * logRatio * logRatio;
        }

        // Step 2: Forward pass - calculate best scores with backlinks
        // Using Typed Arrays for performance
        const backlink = new Int32Array(length);
        backlink.fill(-1);

        // Cumulative scores start with the onset envelope values
        const cumscore = new Float32Array(onsetEnvelope);

        // Forward pass starting from maxPredecessor + 1
        for (let i = maxPredecessor + 1; i < length; i++) {
            let bestScore = -Infinity;
            let bestPredecessor = -1;

            // Search over all possible predecessors
            for (let j = 0; j < transitionCosts.length; j++) {
                const predecessorIdx = i - (minPredecessor + j);

                if (predecessorIdx >= 0 && predecessorIdx < length) {
                    const score = transitionCosts[j] + cumscore[predecessorIdx];

                    if (score > bestScore) {
                        bestScore = score;
                        bestPredecessor = predecessorIdx;
                    }
                }
            }

            // Add local onset score
            cumscore[i] = bestScore + onsetEnvelope[i];
            backlink[i] = bestPredecessor;
        }

        // Step 3: Backward pass - extract beat sequence
        // Start from frame with highest cumulative score (typically near end)
        logger.info('BeatTracker: Starting backward pass', {
            maxCumulativeScore: Math.max(...cumscore),
            envelopeLength: length,
        });
        let bestEndFrame = 0;
        let bestEndScore = cumscore[0];

        for (let i = 1; i < length; i++) {
            if (cumscore[i] > bestEndScore) {
                bestEndScore = cumscore[i];
                bestEndFrame = i;
            }
        }

        // Backtrace through backlinks
        const beatFrames: number[] = [];
        let currentFrame = bestEndFrame;

        while (currentFrame >= 0 && backlink[currentFrame] >= 0) {
            beatFrames.unshift(currentFrame);
            currentFrame = backlink[currentFrame];
        }

        // Add the first beat if it's valid
        if (currentFrame >= 0 && onsetEnvelope[currentFrame] > 0) {
            beatFrames.unshift(currentFrame);
        }

        logger.info('BeatTracker: Backward pass complete', {
            beatsFound: beatFrames.length,
            bestEndFrame,
            firstBeatFrame: beatFrames[0],
            lastBeatFrame: beatFrames[beatFrames.length - 1],
        });

        // Step 4: Convert to Beat objects
        const beats = this.convertToBeats(
            beatFrames,
            onsetEnvelope,
            cumscore,
            hopSizeSeconds,
            period
        );

        return {
            beats,
            beatFrames,
            cumulativeScores: cumscore,
        };
    }

    /**
     * Convert beat frame indices to Beat objects
     *
     * @param beatFrames - Array of frame indices where beats occur
     * @param onsetEnvelope - Original onset strength envelope
     * @param cumscore - Cumulative scores from DP
     * @param hopSizeSeconds - Hop size in seconds
     * @param period - Target period in frames
     * @returns Array of Beat objects
     */
    private convertToBeats(
        beatFrames: number[],
        onsetEnvelope: Float32Array,
        cumscore: Float32Array,
        hopSizeSeconds: number,
        period: number
    ): Beat[] {
        if (beatFrames.length === 0) {
            return [];
        }

        const beats: Beat[] = [];

        // Calculate intensity and confidence for each beat
        // First, find the max onset value for normalization
        let maxOnset = 0;
        for (let i = 0; i < onsetEnvelope.length; i++) {
            if (onsetEnvelope[i] > maxOnset) {
                maxOnset = onsetEnvelope[i];
            }
        }

        // Avoid division by zero
        if (maxOnset <= 0) {
            maxOnset = 1;
        }

        // Calculate average score contribution for confidence normalization
        let totalScoreContribution = 0;
        for (let i = 0; i < beatFrames.length; i++) {
            totalScoreContribution += onsetEnvelope[beatFrames[i]];
        }
        const avgScoreContribution = totalScoreContribution / beatFrames.length;

        for (let i = 0; i < beatFrames.length; i++) {
            const frame = beatFrames[i];
            const timestamp = frame * hopSizeSeconds;

            // Intensity: normalized onset strength (0-1)
            const intensity = Math.max(0, Math.min(1, onsetEnvelope[frame] / maxOnset));

            // Confidence: based on how much this beat contributes to the total score
            // relative to the average contribution
            const localContribution = onsetEnvelope[frame];
            const confidenceRatio = avgScoreContribution > 0
                ? localContribution / avgScoreContribution
                : 0.5;
            // Map to 0-1 range with sigmoid-like transformation
            const confidence = Math.max(0, Math.min(1, 0.5 + 0.3 * (confidenceRatio - 1)));

            // Note: beatInMeasure, isDownbeat, and measureNumber will be set
            // by the DownbeatDetector in Phase 5. For now, set defaults.
            beats.push({
                timestamp,
                beatInMeasure: 0,
                isDownbeat: false,
                measureNumber: 0,
                intensity,
                confidence,
            });
        }

        return beats;
    }

    /**
     * Track beats with additional options for fine-tuning
     *
     * This method provides more control over the tracking process,
     * useful for debugging or special cases.
     *
     * @param onsetEnvelope - Onset strength envelope
     * @param tempoEstimate - Tempo estimate
     * @param hopSizeSeconds - Hop size in seconds
     * @param options - Additional options
     * @returns Beat tracking result
     */
    trackBeatsWithOptions(
        onsetEnvelope: Float32Array,
        tempoEstimate: TempoEstimate,
        hopSizeSeconds: number,
        options: {
            /** Minimum score threshold for beat acceptance */
            minScoreThreshold?: number;
            /** Apply discounted score trimming for start/end beats */
            applyTrimming?: boolean;
        } = {}
    ): BeatTrackingResult {
        const result = this.trackBeats(onsetEnvelope, tempoEstimate, hopSizeSeconds);

        // Apply optional post-processing
        if (options.applyTrimming && result.beatFrames.length > 0) {
            this.applyDiscountedScoreTrimming(
                result,
                onsetEnvelope.length,
                Math.round(tempoEstimate.targetIntervalSeconds / hopSizeSeconds)
            );
        }

        // Filter by minimum score if specified
        if (options.minScoreThreshold !== undefined) {
            const filteredBeats = result.beats.filter((_, idx) => {
                const frame = result.beatFrames[idx];
                return result.cumulativeScores[frame] >= options.minScoreThreshold!;
            });

            result.beats = filteredBeats;
            result.beatFrames = result.beatFrames.filter((_, idx) => {
                const frame = result.beatFrames[idx];
                return result.cumulativeScores[frame] >= options.minScoreThreshold!;
            });
        }

        return result;
    }

    /**
     * Apply discounted score trimming to find valid beat boundaries
     *
     * Ellis notes that the cumulative score grows steadily, but we can
     * find the first and last valid beats by looking at the difference
     * from a straight line connecting origin to final value.
     *
     * C*(t) - (t/length) * C*(length-1)
     *
     * @param result - Beat tracking result to modify in place
     * @param length - Total number of frames
     * @param period - Target period in frames
     */
    private applyDiscountedScoreTrimming(
        result: BeatTrackingResult,
        length: number,
        period: number
    ): void {
        if (result.beatFrames.length < 3) {
            return;
        }

        const cumscore = result.cumulativeScores;
        const finalScore = cumscore[length - 1];

        // Calculate discounted scores
        const discountedScores = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            discountedScores[i] = cumscore[i] - (i / length) * finalScore;
        }

        // Find the frame range where discounted scores are positive
        // This indicates where beats are "contributing positively"
        let firstValidFrame = 0;
        let lastValidFrame = length - 1;

        // Find first frame with positive discounted score
        for (let i = 0; i < length; i++) {
            if (discountedScores[i] > 0) {
                firstValidFrame = i;
                break;
            }
        }

        // Find last frame with positive discounted score
        for (let i = length - 1; i >= 0; i--) {
            if (discountedScores[i] > 0) {
                lastValidFrame = i;
                break;
            }
        }

        // Trim beats outside this range (with some tolerance)
        const tolerance = Math.floor(period / 2);

        const filteredBeats: Beat[] = [];
        const filteredFrames: number[] = [];

        for (let i = 0; i < result.beatFrames.length; i++) {
            const frame = result.beatFrames[i];
            if (frame >= firstValidFrame - tolerance && frame <= lastValidFrame + tolerance) {
                filteredBeats.push(result.beats[i]);
                filteredFrames.push(frame);
            }
        }

        result.beats = filteredBeats;
        result.beatFrames = filteredFrames;
    }

    /**
     * Get beat tracking statistics for debugging
     *
     * @param result - Beat tracking result
     * @param hopSizeSeconds - Hop size in seconds
     * @returns Statistics about the detected beats
     */
    getTrackingStats(
        result: BeatTrackingResult,
        hopSizeSeconds: number
    ): {
        numBeats: number;
        avgInterval: number;
        stdInterval: number;
        avgIntensity: number;
        avgConfidence: number;
        estimatedBpm: number;
    } {
        const { beats, beatFrames } = result;

        if (beats.length === 0) {
            return {
                numBeats: 0,
                avgInterval: 0,
                stdInterval: 0,
                avgIntensity: 0,
                avgConfidence: 0,
                estimatedBpm: 0,
            };
        }

        // Calculate intervals between beats
        const intervals: number[] = [];
        for (let i = 1; i < beatFrames.length; i++) {
            intervals.push((beatFrames[i] - beatFrames[i - 1]) * hopSizeSeconds);
        }

        // Average interval
        const avgInterval = intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;

        // Standard deviation of intervals
        const stdInterval = intervals.length > 0
            ? Math.sqrt(
                intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length
            )
            : 0;

        // Average intensity and confidence
        const avgIntensity = beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length;
        const avgConfidence = beats.reduce((sum, b) => sum + b.confidence, 0) / beats.length;

        // Estimated BPM from intervals
        const estimatedBpm = avgInterval > 0 ? 60 / avgInterval : 0;

        return {
            numBeats: beats.length,
            avgInterval,
            stdInterval,
            avgIntensity,
            avgConfidence,
            estimatedBpm,
        };
    }
}
