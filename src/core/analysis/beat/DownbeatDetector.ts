/**
 * Downbeat Detector
 *
 * Identifies measure boundaries by analyzing intensity patterns in detected beats.
 * Uses two complementary approaches:
 * 1. Intensity Pattern Analysis - finds the grouping with most consistent pattern
 * 2. Autocorrelation of Intensity Sequence - finds periodicity in intensity
 *
 * Based on music theory principles:
 * - Downbeats (beat 1) typically have higher intensity
 * - Measures commonly have 2, 3, 4, or 6 beats
 * - Strong-weak patterns repeat consistently
 */

import type { Beat, TempoEstimate, DownbeatDetectorConfig, DownbeatDetectionResult } from '../../types/BeatMap.js';

/**
 * Default configuration for downbeat detection
 */
const DEFAULT_DOWNBEAT_DETECTOR_CONFIG: Required<DownbeatDetectorConfig> = {
    measureLengths: [2, 3, 4, 6],
    minIntensityDifference: 0.1,
    patternWeight: 0.5,
};

/**
 * Downbeat Detector
 *
 * Analyzes beat intensity patterns to identify measure boundaries and downbeats.
 *
 * @example
 * ```typescript
 * const detector = new DownbeatDetector();
 * const result = detector.detectDownbeats(beats, tempoEstimate);
 *
 * console.log(`Beats per measure: ${result.beatsPerMeasure}`);
 * console.log(`Confidence: ${result.confidence}`);
 * ```
 */
export class DownbeatDetector {
    private config: Required<DownbeatDetectorConfig>;

    /**
     * Create a new Downbeat Detector
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: DownbeatDetectorConfig = {}) {
        this.config = { ...DEFAULT_DOWNBEAT_DETECTOR_CONFIG, ...config };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<DownbeatDetectorConfig> {
        return { ...this.config };
    }

    /**
     * Detect downbeats in a sequence of beats
     *
     * Uses two approaches and combines their results:
     * 1. Intensity Pattern Analysis - consistency of position-relative intensities
     * 2. Autocorrelation - periodicity in intensity sequence
     *
     * @param beats - Array of beats from BeatTracker
     * @param tempoEstimate - Tempo estimate (used for meter hint)
     * @returns Downbeat detection result with updated beats
     */
    detectDownbeats(beats: Beat[], tempoEstimate: TempoEstimate): DownbeatDetectionResult {
        // Handle edge cases
        if (beats.length < 4) {
            return this.createDefaultResult(beats);
        }

        // Extract intensity sequence
        const intensities = beats.map(b => b.intensity);

        // Run both detection methods
        const patternResult = this.analyzeIntensityPattern(intensities);
        const autocorrResult = this.analyzeIntensityAutocorrelation(intensities);

        // Combine results
        const combinedResult = this.combineResults(patternResult, autocorrResult, tempoEstimate);

        // Determine the best measure length
        const beatsPerMeasure = combinedResult.bestMeasureLength;

        // Determine the phase offset (which beat is the downbeat)
        const phaseOffset = this.findPhaseOffset(intensities, beatsPerMeasure);

        // Apply downbeat labels to beats
        const labeledBeats = this.applyDownbeatLabels(
            beats,
            beatsPerMeasure,
            phaseOffset,
            combinedResult.confidence
        );

        return {
            beats: labeledBeats,
            beatsPerMeasure,
            confidence: combinedResult.confidence,
            method: combinedResult.method,
            measureLengthScores: combinedResult.scores,
            phaseOffset,
        };
    }

    /**
     * Analyze intensity patterns for different measure lengths
     *
     * For each candidate measure length, calculates how consistently
     * beats at the same position have similar relative intensities.
     *
     * @param intensities - Array of beat intensities
     * @returns Pattern analysis result
     */
    private analyzeIntensityPattern(intensities: number[]): {
        scores: Map<number, number>;
        bestMeasureLength: number;
    } {
        const scores = new Map<number, number>();

        for (const measureLength of this.config.measureLengths) {
            if (measureLength <= 0 || intensities.length < measureLength * 2) {
                continue;
            }

            // Calculate position-relative intensity variance
            const score = this.calculatePatternScore(intensities, measureLength);
            scores.set(measureLength, score);
        }

        // Find the best measure length
        let bestLength = 4; // Default to 4/4
        let bestScore = 0;

        for (const [length, score] of scores) {
            if (score > bestScore) {
                bestScore = score;
                bestLength = length;
            }
        }

        return { scores, bestMeasureLength: bestLength };
    }

    /**
     * Calculate pattern consistency score for a given measure length
     *
     * Groups beats by their position in the measure and calculates
     * the variance of intensities at each position. Lower variance = better.
     *
     * @param intensities - Array of beat intensities
     * @param measureLength - Number of beats per measure
     * @returns Pattern consistency score (0-1, higher is better)
     */
    private calculatePatternScore(intensities: number[], measureLength: number): number {
        // Group intensities by position in measure
        const positionIntensities: number[][] = [];
        for (let i = 0; i < measureLength; i++) {
            positionIntensities.push([]);
        }

        for (let i = 0; i < intensities.length; i++) {
            const position = i % measureLength;
            positionIntensities[position].push(intensities[i]);
        }

        // Calculate average intensity at each position
        const positionMeans = positionIntensities.map(
            intensities => intensities.length > 0
                ? intensities.reduce((a, b) => a + b, 0) / intensities.length
                : 0
        );

        // Calculate variance within each position (lower is better)
        let totalVariance = 0;
        let totalBeats = 0;

        for (let pos = 0; pos < measureLength; pos++) {
            const intensitiesAtPos = positionIntensities[pos];
            if (intensitiesAtPos.length < 2) {
                continue;
            }

            const mean = positionMeans[pos];
            const variance = intensitiesAtPos.reduce(
                (sum, i) => sum + Math.pow(i - mean, 2),
                0
            ) / intensitiesAtPos.length;

            totalVariance += variance * intensitiesAtPos.length;
            totalBeats += intensitiesAtPos.length;
        }

        const avgVariance = totalBeats > 0 ? totalVariance / totalBeats : 0;

        // Calculate how well position 0 stands out as the strongest
        const maxMean = Math.max(...positionMeans);
        const minMean = Math.min(...positionMeans);
        const meanRange = maxMean - minMean;

        // Bonus if position 0 is strongest (common for downbeats)
        const downbeatBonus = positionMeans[0] === maxMean ? 0.2 : 0;

        // Score: low variance is good, high mean range is good
        // Variance is typically 0-1 for normalized intensities
        const varianceScore = 1 - Math.min(avgVariance * 4, 1); // Scale variance
        const rangeScore = meanRange;

        return varianceScore * 0.5 + rangeScore * 0.3 + downbeatBonus;
    }

    /**
     * Analyze intensity sequence using autocorrelation
     *
     * Finds the lag (measure length) with strongest autocorrelation,
     * indicating periodic repetition of intensity patterns.
     *
     * @param intensities - Array of beat intensities
     * @returns Autocorrelation analysis result
     */
    private analyzeIntensityAutocorrelation(intensities: number[]): {
        scores: Map<number, number>;
        bestMeasureLength: number;
    } {
        const scores = new Map<number, number>();

        // Normalize intensities
        const mean = intensities.reduce((a, b) => a + b, 0) / intensities.length;
        const normalized = intensities.map(i => i - mean);

        const variance = normalized.reduce((sum, i) => sum + i * i, 0);

        if (variance < 0.001) {
            // All intensities are the same, can't determine pattern
            for (const length of this.config.measureLengths) {
                scores.set(length, 0.5);
            }
            return { scores, bestMeasureLength: 4 };
        }

        // Calculate autocorrelation for each measure length
        for (const measureLength of this.config.measureLengths) {
            if (measureLength <= 0 || intensities.length < measureLength * 2) {
                continue;
            }

            const autocorr = this.calculateAutocorrelation(normalized, measureLength, variance);
            scores.set(measureLength, autocorr);
        }

        // Find the best measure length
        let bestLength = 4; // Default to 4/4
        let bestScore = -Infinity;

        for (const [length, score] of scores) {
            if (score > bestScore) {
                bestScore = score;
                bestLength = length;
            }
        }

        return { scores, bestMeasureLength: bestLength };
    }

    /**
     * Calculate autocorrelation at a specific lag
     *
     * @param normalized - Mean-centered intensity values
     * @param lag - Lag (measure length) to calculate
     * @param variance - Variance of the signal (for normalization)
     * @returns Autocorrelation value (-1 to 1)
     */
    private calculateAutocorrelation(
        normalized: number[],
        lag: number,
        variance: number
    ): number {
        if (normalized.length <= lag) {
            return 0;
        }

        let sum = 0;
        let count = 0;

        for (let i = lag; i < normalized.length; i++) {
            sum += normalized[i] * normalized[i - lag];
            count++;
        }

        const autocorr = count > 0 ? sum / (variance) : 0;

        // Clamp to -1 to 1
        return Math.max(-1, Math.min(1, autocorr));
    }

    /**
     * Combine results from pattern analysis and autocorrelation
     *
     * @param patternResult - Result from intensity pattern analysis
     * @param autocorrResult - Result from autocorrelation analysis
     * @param tempoEstimate - Tempo estimate for meter hint
     * @returns Combined result
     */
    private combineResults(
        patternResult: { scores: Map<number, number>; bestMeasureLength: number },
        autocorrResult: { scores: Map<number, number>; bestMeasureLength: number },
        tempoEstimate: TempoEstimate
    ): {
        bestMeasureLength: number;
        confidence: number;
        method: 'pattern' | 'autocorrelation' | 'combined';
        scores: Map<number, number>;
    } {
        const patternWeight = this.config.patternWeight;
        const autocorrWeight = 1 - patternWeight;

        // Combine scores
        const combinedScores = new Map<number, number>();

        for (const length of this.config.measureLengths) {
            const patternScore = patternResult.scores.get(length) || 0;
            const autocorrScore = autocorrResult.scores.get(length) || 0;

            // Normalize autocorrelation score to 0-1 range
            const normalizedAutocorr = (autocorrScore + 1) / 2;

            combinedScores.set(
                length,
                patternWeight * patternScore + autocorrWeight * normalizedAutocorr
            );
        }

        // Use tempo meter hint if available
        // Triple meter (isDuple = false) suggests 3 or 6 beats
        // Duple meter suggests 2 or 4 beats
        let bestLength = 4;
        let bestScore = 0;

        for (const [length, score] of combinedScores) {
            let adjustedScore = score;

            // Apply meter hint bonus
            if (!tempoEstimate.isDuple) {
                // Triple meter - prefer 3 or 6
                if (length === 3 || length === 6) {
                    adjustedScore += 0.1;
                }
            } else {
                // Duple meter - prefer 2 or 4
                if (length === 2 || length === 4) {
                    adjustedScore += 0.1;
                }
            }

            if (adjustedScore > bestScore) {
                bestScore = adjustedScore;
                bestLength = length;
            }
        }

        // Determine which method was more influential
        let method: 'pattern' | 'autocorrelation' | 'combined';
        if (patternWeight > 0.7) {
            method = 'pattern';
        } else if (patternWeight < 0.3) {
            method = 'autocorrelation';
        } else {
            method = 'combined';
        }

        // Calculate confidence based on how clearly the winner stands out
        const sortedScores = Array.from(combinedScores.values()).sort((a, b) => b - a);
        const topScore = sortedScores[0] || 0;
        const secondScore = sortedScores[1] || 0;
        const margin = topScore - secondScore;

        // Confidence: high margin + high absolute score = high confidence
        const confidence = Math.min(topScore * (0.5 + margin), 1);

        return {
            bestMeasureLength: bestLength,
            confidence,
            method,
            scores: combinedScores,
        };
    }

    /**
     * Find the phase offset (which beat is the downbeat)
     *
     * Tests each possible starting position and finds the one where
     * beat 0 has the highest average intensity.
     *
     * @param intensities - Array of beat intensities
     * @param measureLength - Number of beats per measure
     * @returns Phase offset (0 to measureLength-1)
     */
    private findPhaseOffset(intensities: number[], measureLength: number): number {
        let bestOffset = 0;
        let bestScore = -Infinity;

        for (let offset = 0; offset < measureLength; offset++) {
            // Calculate average intensity of beats at position 0
            // when starting from this offset
            let sum = 0;
            let count = 0;

            for (let i = offset; i < intensities.length; i += measureLength) {
                sum += intensities[i];
                count++;
            }

            const avgIntensity = count > 0 ? sum / count : 0;

            if (avgIntensity > bestScore) {
                bestScore = avgIntensity;
                bestOffset = offset;
            }
        }

        return bestOffset;
    }

    /**
     * Apply downbeat labels to beats
     *
     * @param beats - Original beats
     * @param beatsPerMeasure - Number of beats per measure
     * @param phaseOffset - Phase offset of first downbeat
     * @param confidence - Detection confidence
     * @returns Updated beats with downbeat information
     */
    private applyDownbeatLabels(
        beats: Beat[],
        beatsPerMeasure: number,
        phaseOffset: number,
        confidence: number
    ): Beat[] {
        return beats.map((beat, index) => {
            // Calculate position in measure with phase offset
            const positionWithOffset = (index - phaseOffset + beatsPerMeasure * 1000) % beatsPerMeasure;

            // The beat at position 0 (after offset) is the downbeat
            const isDownbeat = positionWithOffset === 0;
            const beatInMeasure = positionWithOffset;

            // Calculate measure number
            // Measures start from the first downbeat
            const measureNumber = Math.max(0, Math.floor((index - phaseOffset) / beatsPerMeasure));

            return {
                ...beat,
                beatInMeasure,
                isDownbeat,
                measureNumber,
                // Adjust confidence based on detection confidence
                confidence: beat.confidence * (0.5 + 0.5 * confidence),
            };
        });
    }

    /**
     * Create a default result for edge cases
     *
     * @param beats - Original beats
     * @returns Default result with 4/4 meter assumption
     */
    private createDefaultResult(beats: Beat[]): DownbeatDetectionResult {
        const scores = new Map<number, number>();
        scores.set(4, 0.5);

        return {
            beats: beats.map((beat, index) => ({
                ...beat,
                beatInMeasure: index % 4,
                isDownbeat: index % 4 === 0,
                measureNumber: Math.floor(index / 4),
            })),
            beatsPerMeasure: 4,
            confidence: 0.5,
            method: 'combined',
            measureLengthScores: scores,
            phaseOffset: 0,
        };
    }

    /**
     * Get statistics about the detected downbeat pattern
     *
     * @param result - Downbeat detection result
     * @returns Statistics about the pattern
     */
    getPatternStats(result: DownbeatDetectionResult): {
        numDownbeats: number;
        numMeasures: number;
        avgDownbeatIntensity: number;
        avgNonDownbeatIntensity: number;
        intensityRatio: number;
    } {
        const downbeats = result.beats.filter(b => b.isDownbeat);
        const nonDownbeats = result.beats.filter(b => !b.isDownbeat);

        const avgDownbeatIntensity = downbeats.length > 0
            ? downbeats.reduce((sum, b) => sum + b.intensity, 0) / downbeats.length
            : 0;

        const avgNonDownbeatIntensity = nonDownbeats.length > 0
            ? nonDownbeats.reduce((sum, b) => sum + b.intensity, 0) / nonDownbeats.length
            : 0;

        const intensityRatio = avgNonDownbeatIntensity > 0
            ? avgDownbeatIntensity / avgNonDownbeatIntensity
            : 1;

        const numMeasures = result.beats.length > 0
            ? Math.max(...result.beats.map(b => b.measureNumber)) + 1
            : 0;

        return {
            numDownbeats: downbeats.length,
            numMeasures,
            avgDownbeatIntensity,
            avgNonDownbeatIntensity,
            intensityRatio,
        };
    }
}
