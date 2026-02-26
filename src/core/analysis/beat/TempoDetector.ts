/**
 * Tempo Detector
 *
 * Implements global tempo estimation using autocorrelation with perceptual weighting
 * as described in Ellis, D.P.W. (2007) "Beat Tracking by Dynamic Programming"
 *
 * Reference: https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf
 * Section 3.2: Tempo Estimation
 */

import type { TempoDetectorConfig, TempoEstimate } from '../../types/BeatMap.js';

/**
 * Default configuration for tempo detection
 */
const DEFAULT_TEMPO_DETECTOR_CONFIG: Required<TempoDetectorConfig> = {
    tempoCenter: 0.5,       // 0.5 seconds (120 BPM) - center of human tempo perception
    tempoWidth: 1.4,        // 1.4 octaves - width of tempo perception bias
    minBpm: 60,             // Minimum BPM to detect
    maxBpm: 180,            // Maximum BPM to detect
};

/**
 * Internal result of autocorrelation calculation
 */
interface AutocorrelationResult {
    /** Autocorrelation values indexed by lag in frames */
    values: Float32Array;
    /** Minimum lag considered (in frames) */
    minLag: number;
    /** Maximum lag considered (in frames) */
    maxLag: number;
}

/**
 * Tempo Detector
 *
 * Estimates the global tempo of an audio track using autocorrelation
 * of the onset strength envelope with perceptual weighting.
 *
 * The algorithm follows Ellis 2007 Section 3.2:
 * 1. Compute autocorrelation of the onset strength envelope
 * 2. Apply perceptual weighting that biases toward 120 BPM
 * 3. Find the peak that maximizes the weighted autocorrelation
 * 4. Use TPS2/TPS3 to determine duple vs triple meter
 *
 * @example
 * ```typescript
 * const detector = new TempoDetector({
 *   tempoCenter: 0.5,  // 120 BPM
 *   tempoWidth: 1.4,   // octaves
 * });
 *
 * const estimate = detector.estimateTempo(onsetEnvelope, hopSize);
 * console.log(`Estimated BPM: ${estimate.primaryBpm}`);
 * ```
 */
export class TempoDetector {
    private config: Required<TempoDetectorConfig>;

    /**
     * Create a new Tempo Detector
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: TempoDetectorConfig = {}) {
        this.config = { ...DEFAULT_TEMPO_DETECTOR_CONFIG, ...config };
    }

    /**
     * Estimate the tempo from an onset strength envelope
     *
     * Implements Ellis Section 3.2:
     * - Autocorrelation with perceptual weighting
     * - TPS2/TPS3 for duple/triple meter detection
     *
     * @param onsetEnvelope - Onset strength envelope from OSE calculation
     * @param hopSizeSeconds - Hop size in seconds (time between envelope frames)
     * @returns Tempo estimate with primary/secondary BPM and meter info
     */
    estimateTempo(onsetEnvelope: Float32Array, hopSizeSeconds: number): TempoEstimate {
        // Handle edge cases
        if (onsetEnvelope.length < 10) {
            // Very short envelope - return default tempo
            return this.getDefaultEstimate();
        }

        // Calculate lag range from BPM constraints
        // τ = 60/BPM * (1/hopSize) in frames
        // For BPM = 60: τ = 60/60 * (1/hopSize) = 1/hopSize frames
        // For BPM = 180: τ = 60/180 * (1/hopSize) = 0.333/hopSize frames
        const maxLag = Math.round((60 / this.config.minBpm) / hopSizeSeconds);
        const minLag = Math.round((60 / this.config.maxBpm) / hopSizeSeconds);

        // Ensure we have valid lag range
        const safeMinLag = Math.max(minLag, 2);
        const safeMaxLag = Math.min(maxLag, Math.floor(onsetEnvelope.length / 2));

        if (safeMaxLag <= safeMinLag) {
            return this.getDefaultEstimate();
        }

        // Step 1: Compute autocorrelation
        const autocorr = this.computeAutocorrelation(onsetEnvelope, safeMinLag, safeMaxLag);

        // Step 2: Apply perceptual weighting (Ellis Equation 6)
        const weightedAutocorr = this.applyPerceptualWeighting(
            autocorr.values,
            autocorr.minLag,
            hopSizeSeconds
        );

        // Step 3: Find primary tempo (peak in weighted autocorrelation)
        const primaryLag = this.findPeak(weightedAutocorr, 0, weightedAutocorr.length);
        const primaryBpm = this.lagToBpm(primaryLag + autocorr.minLag, hopSizeSeconds);

        // Step 4: Calculate TPS2 and TPS3 for meter detection (Ellis Equations 7 & 8)
        const tps2 = this.calculateTPS2(autocorr.values, primaryLag);
        const tps3 = this.calculateTPS3(autocorr.values, primaryLag);

        // Determine meter: larger value indicates correct metrical level
        const isDuple = tps2 >= tps3;

        // Secondary tempo is at double or half the primary period
        // If we're in duple meter (TPS2 won), secondary is at half tempo (2x lag)
        // If we're in triple meter (TPS3 won), we have a more complex relationship
        let secondaryBpm: number;
        let primaryWeight: number;
        let secondaryWeight: number;

        if (isDuple) {
            // Duple meter: secondary is half-tempo (or we could look at double-time)
            secondaryBpm = primaryBpm / 2;
            // Get the relative strengths
            const primaryStrength = weightedAutocorr[primaryLag] || 0;
            const doubleLagIdx = Math.min(primaryLag * 2, weightedAutocorr.length - 1);
            const doubleStrength = weightedAutocorr[doubleLagIdx] || 0;
            const halfLagIdx = Math.max(Math.floor(primaryLag / 2), 0);
            const halfStrength = weightedAutocorr[halfLagIdx] || 0;

            // Secondary weight based on relative strength
            primaryWeight = 1.0;
            secondaryWeight = Math.max(doubleStrength, halfStrength) / (primaryStrength + 0.001);
        } else {
            // Triple meter: secondary is at 1/3 tempo
            secondaryBpm = primaryBpm / 3;
            const primaryStrength = weightedAutocorr[primaryLag] || 0;
            const tripleLagIdx = Math.min(primaryLag * 3, weightedAutocorr.length - 1);
            const tripleStrength = weightedAutocorr[tripleLagIdx] || 0;

            primaryWeight = 1.0;
            secondaryWeight = tripleStrength / (primaryStrength + 0.001);
        }

        // Clamp secondary weight
        secondaryWeight = Math.min(Math.max(secondaryWeight, 0), 1);

        // Target interval for DP tracker
        const targetIntervalSeconds = 60 / primaryBpm;

        return {
            primaryBpm,
            secondaryBpm,
            primaryWeight,
            secondaryWeight,
            isDuple,
            targetIntervalSeconds,
        };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<TempoDetectorConfig> {
        return { ...this.config };
    }

    /**
     * Compute autocorrelation of the onset strength envelope
     *
     * TPS(τ) = Σ O(t) × O(t-τ)
     *
     * @param envelope - Onset strength envelope
     * @param minLag - Minimum lag to compute
     * @param maxLag - Maximum lag to compute
     * @returns Autocorrelation values and lag range
     */
    private computeAutocorrelation(
        envelope: Float32Array,
        minLag: number,
        maxLag: number
    ): AutocorrelationResult {
        const length = maxLag - minLag + 1;
        const values = new Float32Array(length);

        // Compute mean for normalization
        let mean = 0;
        for (let i = 0; i < envelope.length; i++) {
            mean += envelope[i];
        }
        mean /= envelope.length;

        // Compute autocorrelation for each lag
        for (let lag = minLag; lag <= maxLag; lag++) {
            let sum = 0;
            let count = 0;

            for (let t = lag; t < envelope.length; t++) {
                sum += (envelope[t] - mean) * (envelope[t - lag] - mean);
                count++;
            }

            // Normalize by count
            values[lag - minLag] = count > 0 ? sum / count : 0;
        }

        return {
            values,
            minLag,
            maxLag,
        };
    }

    /**
     * Apply perceptual weighting to autocorrelation values
     *
     * W(τ) = exp(-0.5 × (log₂(τ/τ₀) / στ)²)
     *
     * Where:
     * - τ₀ = tempoCenter (default 0.5s = 120 BPM)
     * - στ = tempoWidth (default 1.4 octaves)
     *
     * This biases toward human tempo perception centered at 120 BPM.
     *
     * @param autocorr - Autocorrelation values
     * @param minLag - Minimum lag in the array
     * @param hopSizeSeconds - Hop size in seconds
     * @returns Weighted autocorrelation values
     */
    private applyPerceptualWeighting(
        autocorr: Float32Array,
        minLag: number,
        hopSizeSeconds: number
    ): Float32Array {
        const weighted = new Float32Array(autocorr.length);
        const tau0 = this.config.tempoCenter / hopSizeSeconds; // Center lag in frames
        const sigmaTau = this.config.tempoWidth;

        for (let i = 0; i < autocorr.length; i++) {
            const lag = minLag + i;

            // Avoid log(0) or negative values
            if (lag <= 0 || tau0 <= 0) {
                weighted[i] = 0;
                continue;
            }

            // Perceptual weighting: W(τ) = exp(-0.5 × (log₂(τ/τ₀) / στ)²)
            const logRatio = Math.log2(lag / tau0);
            const weight = Math.exp(-0.5 * Math.pow(logRatio / sigmaTau, 2));

            weighted[i] = autocorr[i] * weight;
        }

        return weighted;
    }

    /**
     * Find the index of the maximum value in an array
     *
     * @param array - Input array
     * @param start - Start index (inclusive)
     * @param end - End index (exclusive)
     * @returns Index of maximum value
     */
    private findPeak(array: Float32Array, start: number, end: number): number {
        let maxIdx = start;
        let maxVal = array[start];

        for (let i = start + 1; i < end && i < array.length; i++) {
            if (array[i] > maxVal) {
                maxVal = array[i];
                maxIdx = i;
            }
        }

        return maxIdx;
    }

    /**
     * Convert lag in frames to BPM
     *
     * BPM = 60 / (lag × hopSize)
     *
     * @param lag - Lag in frames
     * @param hopSizeSeconds - Hop size in seconds
     * @returns BPM
     */
    private lagToBpm(lag: number, hopSizeSeconds: number): number {
        if (lag <= 0 || hopSizeSeconds <= 0) {
            return 120; // Default fallback
        }
        return 60 / (lag * hopSizeSeconds);
    }

    /**
     * Calculate TPS2 - Tempo Period Strength for duple meter
     *
     * TPS2(τ) = TPS(τ) + 0.5×TPS(2τ) + 0.25×TPS(2τ-1) + 0.25×TPS(2τ+1)
     *
     * This combines the main tempo with its half-time equivalent,
     * improving accuracy from 77% to 84% per Ellis paper.
     *
     * @param autocorr - Autocorrelation values (indexed from minLag)
     * @param primaryIdx - Index of primary tempo in autocorr array
     * @returns TPS2 value
     */
    private calculateTPS2(autocorr: Float32Array, primaryIdx: number): number {
        const mainValue = autocorr[primaryIdx] || 0;

        // Indices for double-time (2τ, 2τ-1, 2τ+1)
        const doubleIdx = primaryIdx * 2;
        const doubleMinusIdx = doubleIdx - 1;
        const doublePlusIdx = doubleIdx + 1;

        const doubleValue = autocorr[doubleIdx] || 0;
        const doubleMinusValue = (doubleMinusIdx >= 0) ? (autocorr[doubleMinusIdx] || 0) : 0;
        const doublePlusValue = (doublePlusIdx < autocorr.length) ? (autocorr[doublePlusIdx] || 0) : 0;

        return mainValue + 0.5 * doubleValue + 0.25 * doubleMinusValue + 0.25 * doublePlusValue;
    }

    /**
     * Calculate TPS3 - Tempo Period Strength for triple meter
     *
     * TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)
     *
     * This combines the main tempo with its third-time equivalent,
     * useful for detecting triple meter (3/4, 6/8).
     *
     * @param autocorr - Autocorrelation values
     * @param primaryIdx - Index of primary tempo in autocorr array
     * @returns TPS3 value
     */
    private calculateTPS3(autocorr: Float32Array, primaryIdx: number): number {
        const mainValue = autocorr[primaryIdx] || 0;

        // Indices for triple-time (3τ, 3τ-1, 3τ+1)
        const tripleIdx = primaryIdx * 3;
        const tripleMinusIdx = tripleIdx - 1;
        const triplePlusIdx = tripleIdx + 1;

        const tripleValue = autocorr[tripleIdx] || 0;
        const tripleMinusValue = (tripleMinusIdx >= 0) ? (autocorr[tripleMinusIdx] || 0) : 0;
        const triplePlusValue = (triplePlusIdx < autocorr.length) ? (autocorr[triplePlusIdx] || 0) : 0;

        return mainValue + 0.33 * tripleValue + 0.33 * tripleMinusValue + 0.33 * triplePlusValue;
    }

    /**
     * Get a default tempo estimate for edge cases
     *
     * @returns Default tempo estimate (120 BPM)
     */
    private getDefaultEstimate(): TempoEstimate {
        return {
            primaryBpm: 120,
            secondaryBpm: 60,
            primaryWeight: 1.0,
            secondaryWeight: 0.5,
            isDuple: true,
            targetIntervalSeconds: 0.5,
        };
    }

    /**
     * Get tempo candidates (for debugging/visualization)
     *
     * Returns the top N tempo candidates with their strengths.
     *
     * @param onsetEnvelope - Onset strength envelope
     * @param hopSizeSeconds - Hop size in seconds
     * @param count - Number of candidates to return
     * @returns Array of BPM candidates with strengths
     */
    getTempoCandidates(
        onsetEnvelope: Float32Array,
        hopSizeSeconds: number,
        count: number = 5
    ): Array<{ bpm: number; strength: number }> {
        if (onsetEnvelope.length < 10) {
            return [{ bpm: 120, strength: 1.0 }];
        }

        // Calculate lag range
        const maxLag = Math.round((60 / this.config.minBpm) / hopSizeSeconds);
        const minLag = Math.round((60 / this.config.maxBpm) / hopSizeSeconds);
        const safeMinLag = Math.max(minLag, 2);
        const safeMaxLag = Math.min(maxLag, Math.floor(onsetEnvelope.length / 2));

        if (safeMaxLag <= safeMinLag) {
            return [{ bpm: 120, strength: 1.0 }];
        }

        // Compute and weight autocorrelation
        const autocorr = this.computeAutocorrelation(onsetEnvelope, safeMinLag, safeMaxLag);
        const weighted = this.applyPerceptualWeighting(autocorr.values, autocorr.minLag, hopSizeSeconds);

        // Find all local maxima
        const candidates: Array<{ bpm: number; strength: number }> = [];

        for (let i = 1; i < weighted.length - 1; i++) {
            // Local maximum check
            if (weighted[i] > weighted[i - 1] && weighted[i] > weighted[i + 1]) {
                const bpm = this.lagToBpm(i + autocorr.minLag, hopSizeSeconds);
                candidates.push({
                    bpm,
                    strength: weighted[i],
                });
            }
        }

        // Sort by strength descending
        candidates.sort((a, b) => b.strength - a.strength);

        // Return top N
        return candidates.slice(0, count);
    }
}
