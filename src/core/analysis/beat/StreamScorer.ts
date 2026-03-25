/**
 * Stream Scorer for Procedural Rhythm Generation
 *
 * Evaluates the "interest" level of each band stream per section.
 * Used to determine which band has the most interesting rhythm for composite generation.
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 3.1
 *
 * @example
 * ```typescript
 * // Basic usage - score band streams for interest level
 * const scorer = new StreamScorer();
 * const result = scorer.score(quantizedBandStreams, phraseAnalysis, densityAnalysis);
 *
 * // Check which band won each section
 * for (const winner of result.sectionWinners) {
 *   console.log(`Beats ${winner.beatRange.start}-${winner.beatRange.end}: ${winner.band} won`);
 * }
 *
 * // Compare overall band performance
 * console.log('Band totals:', result.bandTotals);
 * console.log('Band averages:', result.bandAverages);
 *
 * // Inspect individual scoring factors
 * for (const score of result.sectionScores) {
 *   console.log(`${score.band} @ ${score.beatRange.start}: ${score.score.toFixed(2)}`);
 *   console.log(`  IOI variance: ${score.factors.ioiVariance.toFixed(2)}`);
 *   console.log(`  Syncopation: ${score.factors.syncopationLevel.toFixed(2)}`);
 * }
 * ```
 */

import type { GeneratedBeat, GeneratedRhythmMap, QuantizedBandStreams } from './RhythmQuantizer.js';
import type { PhraseAnalysisResult, RhythmicPhrase } from './PhraseAnalyzer.js';
import type { DensityAnalysisResult } from './DensityAnalyzer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Band identifier
 */
export type Band = 'low' | 'mid' | 'high';

/**
 * Scoring factors that contribute to the overall interest score
 */
export interface ScoringFactors {
    /** Inter-Onset Interval variance (rhythmic variety) */
    ioiVariance: number;

    /** Syncopation level (offbeat emphasis) */
    syncopationLevel: number;

    /** Phrase significance from detected patterns */
    phraseSignificance: number;

    /** Density contribution (more notes = more interesting, to a point) */
    densityFactor: number;
}

/**
 * Score for a single section of a single band
 */
export interface SectionScore {
    /** Beat range for this section */
    beatRange: {
        start: number;
        end: number;
    };

    /** Which band this score is for */
    band: Band;

    /** Overall interest score (0.0 - 1.0, higher = more interesting) */
    score: number;

    /** Individual scoring factors */
    factors: ScoringFactors;
}

/**
 * Complete scoring result for all bands across all sections
 */
export interface StreamScoringResult {
    /** All section scores */
    sectionScores: SectionScore[];

    /** Per-band total scores (sum of all section scores) */
    bandTotals: {
        low: number;
        mid: number;
        high: number;
    };

    /** Per-band average scores */
    bandAverages: {
        low: number;
        mid: number;
        high: number;
    };

    /** For each section, which band won (highest score) */
    sectionWinners: SectionWinner[];

    /** Configuration used for scoring */
    config: StreamScorerConfig;
}

/**
 * Winner for a section
 */
export interface SectionWinner {
    /** Beat range for this section */
    beatRange: {
        start: number;
        end: number;
    };

    /** Which band won this section */
    winner: Band;

    /** The winning score */
    score: number;

    /** Margin of victory over second place */
    margin: number;
}

/**
 * Band bias weights for controlling which frequency bands are favored
 * in composite stream selection.
 *
 * Values are applied as multipliers to the final score:
 * - 1.0 = no bias (neutral)
 * - > 1.0 = favor this band
 * - < 1.0 = disfavor this band
 *
 * Example: To reduce bass dominance, set { low: 0.5, mid: 1.0, high: 1.0 }
 */
export interface BandBiasWeights {
    low: number;
    mid: number;
    high: number;
}

/**
 * Configuration for stream scoring
 */
export interface StreamScorerConfig {
    /** Number of beats per section for scoring. Default: 8 (2 measures in 4/4 time) */
    beatsPerSection: number;

    /** Weight for IOI variance in scoring. Default: 0.3 */
    ioiVarianceWeight: number;

    /** Weight for syncopation in scoring. Default: 0.3 */
    syncopationWeight: number;

    /** Weight for phrase significance in scoring. Default: 0.25 */
    phraseSignificanceWeight: number;

    /** Weight for density factor in scoring. Default: 0.15 */
    densityWeight: number;

    /** Grid positions considered "offbeats" for syncopation scoring.
     *  For straight_16th: 1 and 3 are offbeats (16th note subdivisions)
     *  For triplet_8th: 1 and 2 are offbeats (after the downbeat)
     *  For straight_8th: 1 is offbeat (the "and" in "1-and")
     */
    offbeatGridPositions: {
        straight_16th: number[];
        triplet_8th: number[];
        straight_8th: number[];
    };

    /** Band bias multipliers applied to final section scores.
     *  undefined = no bias (default)
     *  Range: 0.0 - 2.0 (0 = never win, 1 = neutral, 2 = strongly favored)
     */
    bandBiasWeights?: BandBiasWeights;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_STREAM_SCORER_CONFIG: StreamScorerConfig = {
    beatsPerSection: 8, // 2 measures in 4/4 time
    ioiVarianceWeight: 0.3,
    syncopationWeight: 0.3,
    phraseSignificanceWeight: 0.25,
    densityWeight: 0.15,
    offbeatGridPositions: {
        straight_16th: [1, 3], // 16th note offbeats (the "e" and "a" in "1-e-and-a")
        triplet_8th: [1, 2], // Triplet offbeats (after the downbeat)
        straight_8th: [1], // 8th note offbeat (the "and" in "1-and")
    },
    bandBiasWeights: {
        low: 0.8,
        mid: 0.95,
        high: 1.0,
    },
};

// ============================================================================
// StreamScorer Class
// ============================================================================

/**
 * Evaluates the "interest" level of each band stream per section.
 *
 * ## Scoring Algorithm
 *
 * The scoring system evaluates rhythmic interest based on four factors:
 *
 * 1. **IOI Variance** (Inter-Onset Interval): Measures rhythmic variety.
 *    - Higher variance = more interesting rhythms (not just straight notes)
 *    - Low variance = monotonous patterns
 *
 * 2. **Syncopation Level**: Measures offbeat emphasis.
 *    - Notes on grid positions 1 or 3 (16th notes) are syncopated
 *    - Syncopated rhythms are generally more interesting
 *
 * 3. **Phrase Significance**: Incorporates detected phrase patterns.
 *    - Sections containing significant detected phrases score higher
 *    - Encourages using sections with meaningful musical content
 *
 * 4. **Density Factor**: Considers note density.
 *    - Moderate density is ideal (not too sparse, not too dense)
 *    - Uses a bell curve centered around 2 notes per beat
 *
 * ## Usage
 *
 * ```typescript
 * const scorer = new StreamScorer();
 * const result = scorer.score(quantizedStreams, phraseAnalysis, densityAnalysis);
 *
 * // Get section winners for composite generation
 * for (const winner of result.sectionWinners) {
 *   console.log(`Beats ${winner.beatRange.start}-${winner.beatRange.end}: ${winner.winner} wins`);
 * }
 *
 * // Get average scores per band
 * console.log('Low band avg:', result.bandAverages.low);
 * console.log('Mid band avg:', result.bandAverages.mid);
 * console.log('High band avg:', result.bandAverages.high);
 * ```
 */
export class StreamScorer {
    private config: StreamScorerConfig;

    constructor(config: Partial<StreamScorerConfig> = {}) {
        this.config = { ...DEFAULT_STREAM_SCORER_CONFIG, ...config };
    }

    /**
     * Score all band streams across all sections
     *
     * @param streams - Quantized band streams from RhythmQuantizer
     * @param phraseAnalysis - Phrase analysis from PhraseAnalyzer
     * @param densityAnalysis - Density analysis from DensityAnalyzer
     * @returns Complete scoring result
     */
    score(
        streams: QuantizedBandStreams,
        phraseAnalysis: PhraseAnalysisResult,
        densityAnalysis: DensityAnalysisResult
    ): StreamScoringResult {
        const sectionScores: SectionScore[] = [];
        const bandScores: { low: number[]; mid: number[]; high: number[] } = {
            low: [],
            mid: [],
            high: [],
        };

        // Find the maximum beat index to determine sections
        const allBeats = [
            ...streams.streams.low.beats,
            ...streams.streams.mid.beats,
            ...streams.streams.high.beats,
        ];
        const maxBeatIndex = allBeats.length > 0
            ? Math.max(...allBeats.map(b => b.beatIndex))
            : 0;
        const totalBeats = maxBeatIndex + 1;

        // Score each section for each band
        const bands: Band[] = ['low', 'mid', 'high'];

        for (let sectionStart = 0; sectionStart < totalBeats; sectionStart += this.config.beatsPerSection) {
            const sectionEnd = Math.min(sectionStart + this.config.beatsPerSection - 1, maxBeatIndex);
            const beatRange = { start: sectionStart, end: sectionEnd };

            for (const band of bands) {
                const sectionScore = this.scoreSection(
                    streams.streams[band],
                    band,
                    beatRange,
                    phraseAnalysis,
                    densityAnalysis
                );

                sectionScores.push(sectionScore);
                bandScores[band].push(sectionScore.score);
            }
        }

        // Calculate totals and averages
        const bandTotals = {
            low: bandScores.low.reduce((a, b) => a + b, 0),
            mid: bandScores.mid.reduce((a, b) => a + b, 0),
            high: bandScores.high.reduce((a, b) => a + b, 0),
        };

        const bandAverages = {
            low: bandScores.low.length > 0 ? bandTotals.low / bandScores.low.length : 0,
            mid: bandScores.mid.length > 0 ? bandTotals.mid / bandScores.mid.length : 0,
            high: bandScores.high.length > 0 ? bandTotals.high / bandScores.high.length : 0,
        };

        // Determine section winners
        const sectionWinners = this.determineSectionWinners(sectionScores);

        return {
            sectionScores,
            bandTotals,
            bandAverages,
            sectionWinners,
            config: { ...this.config },
        };
    }

    /**
     * Score a single section of a single band
     */
    private scoreSection(
        rhythmMap: GeneratedRhythmMap,
        band: Band,
        beatRange: { start: number; end: number },
        phraseAnalysis: PhraseAnalysisResult,
        densityAnalysis: DensityAnalysisResult
    ): SectionScore {
        // Get beats in this section
        const sectionBeats = rhythmMap.beats.filter(
            b => b.beatIndex >= beatRange.start && b.beatIndex <= beatRange.end
        );

        // Calculate scoring factors
        const ioiVariance = this.calculateIOIVariance(sectionBeats);
        const syncopationLevel = this.calculateSyncopationLevel(sectionBeats);
        const phraseSignificance = this.calculatePhraseSignificance(
            phraseAnalysis,
            band,
            beatRange
        );
        const densityFactor = this.calculateDensityFactor(
            densityAnalysis,
            band,
            beatRange
        );

        // Combine factors with weights
        let score =
            ioiVariance * this.config.ioiVarianceWeight +
            syncopationLevel * this.config.syncopationWeight +
            phraseSignificance * this.config.phraseSignificanceWeight +
            densityFactor * this.config.densityWeight;

        // Apply band bias if configured
        if (this.config.bandBiasWeights) {
            const bias = this.config.bandBiasWeights[band] ?? 1.0;
            score *= bias;
        }

        return {
            beatRange,
            band,
            score,
            factors: {
                ioiVariance,
                syncopationLevel,
                phraseSignificance,
                densityFactor,
            },
        };
    }

    /**
     * Calculate Inter-Onset Interval variance
     *
     * Higher variance indicates more rhythmic variety (more interesting).
     * Normalized to 0-1 range.
     */
    private calculateIOIVariance(beats: GeneratedBeat[]): number {
        if (beats.length < 2) {
            return 0;
        }

        // Sort by timestamp
        const sorted = [...beats].sort((a, b) => a.timestamp - b.timestamp);

        // Calculate IOIs (intervals between consecutive notes)
        const iois: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
            iois.push(sorted[i].timestamp - sorted[i - 1].timestamp);
        }

        if (iois.length === 0) {
            return 0;
        }

        // Calculate variance
        const mean = iois.reduce((a, b) => a + b, 0) / iois.length;
        const variance = iois.reduce((sum, ioi) => sum + Math.pow(ioi - mean, 2), 0) / iois.length;

        // Normalize variance to 0-1 range
        // Use coefficient of variation (CV = stdDev / mean) for scale-invariant measure
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 0;

        // CV is typically 0-1 for rhythmic patterns, cap at 1
        return Math.min(cv, 1);
    }

    /**
     * Calculate syncopation level
     *
     * Measures emphasis on offbeats. Higher syncopation = more interesting.
     * Normalized to 0-1 range.
     */
    private calculateSyncopationLevel(beats: GeneratedBeat[]): number {
        if (beats.length === 0) {
            return 0;
        }

        let syncopatedCount = 0;
        let totalWeight = 0;

        for (const beat of beats) {
            const offbeatPositions = this.config.offbeatGridPositions[beat.gridType];
            const isOffbeat = offbeatPositions.includes(beat.gridPosition);

            // Weight by intensity - stronger notes on offbeats are more syncopated
            const weight = beat.intensity;

            if (isOffbeat) {
                syncopatedCount += weight;
            }
            totalWeight += weight;
        }

        if (totalWeight === 0) {
            return 0;
        }

        // Ratio of syncopated weight to total weight
        return syncopatedCount / totalWeight;
    }

    /**
     * Calculate phrase significance for a section
     *
     * Higher if significant phrases overlap with this section.
     * Normalized to 0-1 range.
     */
    private calculatePhraseSignificance(
        phraseAnalysis: PhraseAnalysisResult,
        band: Band,
        beatRange: { start: number; end: number }
    ): number {
        const bandPhrases = phraseAnalysis.phrasesByBand.get(band) ?? [];

        if (bandPhrases.length === 0) {
            return 0;
        }

        // Find phrases that overlap with this section
        let totalSignificance = 0;
        let maxPossibleSignificance = 0;

        for (const phrase of bandPhrases) {
            // Get max significance for normalization
            maxPossibleSignificance = Math.max(maxPossibleSignificance, phrase.significance);

            // Check if any occurrence overlaps with this section
            for (const occurrence of phrase.occurrences) {
                const occurrenceEnd = occurrence.beatIndex + phrase.sizeInBeats - 1;

                // Check for overlap
                if (occurrence.beatIndex <= beatRange.end && occurrenceEnd >= beatRange.start) {
                    // Add weighted significance (partial overlap gets partial weight)
                    const overlapStart = Math.max(occurrence.beatIndex, beatRange.start);
                    const overlapEnd = Math.min(occurrenceEnd, beatRange.end);
                    const overlapBeats = overlapEnd - overlapStart + 1;
                    const overlapRatio = overlapBeats / phrase.sizeInBeats;

                    totalSignificance += phrase.significance * overlapRatio;
                    break; // Only count each phrase once per section
                }
            }
        }

        // Normalize to 0-1 range
        if (maxPossibleSignificance === 0) {
            return 0;
        }

        // Use logarithmic scaling to prevent very high significance from dominating
        const normalized = totalSignificance / maxPossibleSignificance;
        return Math.min(normalized, 1);
    }

    /**
     * Calculate density factor
     *
     * Uses a bell curve - moderate density is ideal.
     * Optimal density is around 2 notes per beat.
     * Normalized to 0-1 range.
     */
    private calculateDensityFactor(
        densityAnalysis: DensityAnalysisResult,
        band: Band,
        beatRange: { start: number; end: number }
    ): number {
        const bandMetrics = densityAnalysis.bandMetrics[band];
        const perBeatDensity = bandMetrics.perBeatDensity;

        // Get density for beats in this section
        const sectionDensities = perBeatDensity.filter(
            d => d.beatIndex >= beatRange.start && d.beatIndex <= beatRange.end
        );

        if (sectionDensities.length === 0) {
            return 0;
        }

        // Calculate average transients per beat for this section
        const avgDensity = sectionDensities.reduce((sum, d) => sum + d.transientCount, 0) / sectionDensities.length;

        // Bell curve centered at 2 notes per beat
        // Formula: e^(-(x - 2)^2 / 2)
        // - At 0 notes/beat: ~0.13
        // - At 1 note/beat: ~0.61
        // - At 2 notes/beat: 1.0 (optimal)
        // - At 3 notes/beat: ~0.61
        // - At 4 notes/beat: ~0.13
        const optimalDensity = 2.0;
        const bellCurveWidth = 1.5; // Controls how quickly the curve drops off

        const factor = Math.exp(-Math.pow(avgDensity - optimalDensity, 2) / (2 * Math.pow(bellCurveWidth, 2)));

        return factor;
    }

    /**
     * Determine the winner for each section
     */
    private determineSectionWinners(sectionScores: SectionScore[]): SectionWinner[] {
        // Group scores by beat range
        const scoresBySection = new Map<string, SectionScore[]>();

        for (const score of sectionScores) {
            const key = `${score.beatRange.start}-${score.beatRange.end}`;
            const existing = scoresBySection.get(key);
            if (existing) {
                existing.push(score);
            } else {
                scoresBySection.set(key, [score]);
            }
        }

        const winners: SectionWinner[] = [];

        for (const [, scores] of scoresBySection) {
            if (scores.length === 0) continue;

            // Sort by score descending
            const sorted = [...scores].sort((a, b) => b.score - a.score);

            const winner = sorted[0];
            const runnerUp = sorted[1];
            const margin = runnerUp ? winner.score - runnerUp.score : winner.score;

            winners.push({
                beatRange: winner.beatRange,
                winner: winner.band,
                score: winner.score,
                margin,
            });
        }

        // Sort winners by beat range start
        winners.sort((a, b) => a.beatRange.start - b.beatRange.start);

        return winners;
    }

    /**
     * Get the current configuration
     */
    getConfig(): StreamScorerConfig {
        return { ...this.config };
    }
}
