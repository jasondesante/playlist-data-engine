/**
 * Density Analyzer for Procedural Rhythm Generation
 *
 * Analyzes quantized rhythm streams to measure density and determine natural difficulty.
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 2.2
 */

import type { GeneratedBeat, GeneratedRhythmMap, QuantizedBandStreams } from './RhythmQuantizer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Density category for a stream
 */
export type DensityCategory = 'sparse' | 'moderate' | 'dense';

/**
 * Natural difficulty based on density
 */
export type NaturalDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Density metrics for a single beat
 */
export interface BeatDensityMetrics {
    /** Beat index in the UnifiedBeatMap */
    beatIndex: number;

    /** Number of transients in this beat */
    transientCount: number;

    /** Which band(s) contributed to this beat */
    bands: ('low' | 'mid' | 'high')[];

    /** Average intensity of transients in this beat */
    averageIntensity: number;
}

/**
 * Density metrics for a section (multiple beats)
 */
export interface SectionDensityMetrics {
    /** Starting beat index (inclusive) */
    startBeat: number;

    /** Ending beat index (inclusive) */
    endBeat: number;

    /** Number of beats in this section */
    beatCount: number;

    /** Total transients in this section */
    totalTransients: number;

    /** Average transients per beat */
    transientsPerBeat: number;

    /** Minimum transients per beat in this section */
    minTransientsPerBeat: number;

    /** Maximum transients per beat in this section */
    maxTransientsPerBeat: number;

    /** Density category for this section */
    densityCategory: DensityCategory;

    /** Natural difficulty for this section */
    naturalDifficulty: NaturalDifficulty;
}

/**
 * Density metrics for a single band stream
 */
export interface BandDensityMetrics {
    /** Band name */
    band: 'low' | 'mid' | 'high';

    /** Total number of beats in the stream */
    totalBeats: number;

    /** Total transients across all beats */
    totalTransients: number;

    /** Average transients per beat */
    transientsPerBeat: number;

    /** Minimum transients in any single beat */
    minTransientsPerBeat: number;

    /** Maximum transients in any single beat */
    maxTransientsPerBeat: number;

    /** Variance in transients per beat */
    variance: number;

    /** Density category */
    densityCategory: DensityCategory;

    /** Natural difficulty */
    naturalDifficulty: NaturalDifficulty;

    /** Per-beat density breakdown */
    perBeatDensity: BeatDensityMetrics[];
}

/**
 * Complete density analysis result for all bands
 */
export interface DensityAnalysisResult {
    /** Per-band density metrics */
    bandMetrics: {
        low: BandDensityMetrics;
        mid: BandDensityMetrics;
        high: BandDensityMetrics;
    };

    /** Combined density across all bands */
    combinedMetrics: {
        /** Total transients across all bands */
        totalTransients: number;

        /** Average transients per beat (across all bands) */
        transientsPerBeat: number;

        /** Overall density category */
        densityCategory: DensityCategory;

        /** Overall natural difficulty */
        naturalDifficulty: NaturalDifficulty;
    };

    /** Section-based density analysis (2-measure sections = 8 beats) */
    sections: SectionDensityMetrics[];

    /** Per-beat density for all bands combined */
    perBeatDensity: BeatDensityMetrics[];
}

/**
 * Configuration for density analysis
 */
export interface DensityAnalyzerConfig {
    /** Number of beats per section for section analysis. Default: 8 (2 measures in 4/4 time) */
    beatsPerSection: number;

    /** Threshold for sparse density (transients per beat below this = sparse). Default: 1.0 */
    sparseThreshold: number;

    /** Threshold for dense density (transients per beat above this = dense). Default: 2.5 */
    denseThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DENSITY_ANALYZER_CONFIG: DensityAnalyzerConfig = {
    beatsPerSection: 8, // 2 measures in 4/4 time
    sparseThreshold: 1.0,
    denseThreshold: 2.5,
};

// ============================================================================
// Density Threshold Constants
// ============================================================================

/**
 * Transients per beat thresholds for density categorization
 *
 * Sparse: < 1.0 transients/beat (mostly quarter notes)
 * Moderate: 1.0 - 2.5 transients/beat (eighth notes, some sixteenths)
 * Dense: > 2.5 transients/beat (heavy sixteenth notes, triplets)
 */

// ============================================================================
// DensityAnalyzer Class
// ============================================================================

/**
 * Analyzes quantized rhythm streams for density and natural difficulty.
 *
 * ## Algorithm Overview
 *
 * 1. **Per-Beat Density Calculation**:
 *    - Count transients in each beat across all bands
 *    - Track which bands contribute to each beat
 *
 * 2. **Density Categorization**:
 *    - Sparse: < 1.0 transients/beat (mostly quarter notes)
 *    - Moderate: 1.0 - 2.5 transients/beat (eighth notes, some sixteenths)
 *    - Dense: > 2.5 transients/beat (heavy sixteenth notes, triplets)
 *
 * 3. **Natural Difficulty Determination**:
 *    - High density (dense) → Hard
 *    - Medium density (moderate) → Medium
 *    - Low density (sparse) → Easy
 *
 * 4. **Section Analysis**:
 *    - Divide track into sections (default: 8 beats = 2 measures)
 *    - Calculate density per section for granular analysis
 *
 * ## Usage
 *
 * ```typescript
 * const analyzer = new DensityAnalyzer();
 * const result = analyzer.analyze(quantizedStreams);
 *
 * // Access per-band metrics
 * const lowDensity = result.bandMetrics.low;
 *
 * // Get overall natural difficulty
 * const difficulty = result.combinedMetrics.naturalDifficulty;
 *
 * // Access section-based analysis
 * const sections = result.sections;
 * ```
 */
export class DensityAnalyzer {
    private config: DensityAnalyzerConfig;

    constructor(config: Partial<DensityAnalyzerConfig> = {}) {
        this.config = { ...DEFAULT_DENSITY_ANALYZER_CONFIG, ...config };
    }

    /**
     * Analyze quantized band streams for density
     *
     * @param streams - Quantized band streams from RhythmQuantizer
     * @returns Complete density analysis result
     */
    analyze(streams: QuantizedBandStreams): DensityAnalysisResult {
        // Analyze each band
        const bandMetrics = {
            low: this.analyzeBand(streams.streams.low, 'low'),
            mid: this.analyzeBand(streams.streams.mid, 'mid'),
            high: this.analyzeBand(streams.streams.high, 'high'),
        };

        // Combine all beats for combined analysis
        const allBeats = [
            ...streams.streams.low.beats,
            ...streams.streams.mid.beats,
            ...streams.streams.high.beats,
        ];

        // Calculate combined per-beat density
        const perBeatDensity = this.calculateCombinedPerBeatDensity(
            streams.streams.low,
            streams.streams.mid,
            streams.streams.high
        );

        // Calculate combined metrics
        const combinedMetrics = this.calculateCombinedMetrics(perBeatDensity);

        // Calculate section-based metrics
        const sections = this.calculateSectionMetrics(perBeatDensity);

        return {
            bandMetrics,
            combinedMetrics,
            sections,
            perBeatDensity,
        };
    }

    /**
     * Analyze a single band for density metrics
     */
    private analyzeBand(rhythmMap: GeneratedRhythmMap, band: 'low' | 'mid' | 'high'): BandDensityMetrics {
        const beats = rhythmMap.beats;

        // Find the maximum beat index to determine total beats
        const maxBeatIndex = beats.length > 0 ? Math.max(...beats.map(b => b.beatIndex)) : 0;
        const totalBeats = maxBeatIndex + 1;

        // Count transients per beat
        const transientCounts = new Map<number, { count: number; intensities: number[] }>();

        for (const beat of beats) {
            const existing = transientCounts.get(beat.beatIndex);
            if (existing) {
                existing.count++;
                existing.intensities.push(beat.intensity);
            } else {
                transientCounts.set(beat.beatIndex, {
                    count: 1,
                    intensities: [beat.intensity],
                });
            }
        }

        // Calculate per-beat density
        const perBeatDensity: BeatDensityMetrics[] = [];
        let totalTransients = 0;

        for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
            const data = transientCounts.get(beatIndex);
            const count = data?.count ?? 0;
            const avgIntensity = data
                ? data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length
                : 0;

            perBeatDensity.push({
                beatIndex,
                transientCount: count,
                bands: count > 0 ? [band] : [],
                averageIntensity: avgIntensity,
            });

            totalTransients += count;
        }

        // Calculate statistics
        const countsArray = perBeatDensity.map(b => b.transientCount);
        const transientsPerBeat = totalBeats > 0 ? totalTransients / totalBeats : 0;
        const minTransientsPerBeat = countsArray.length > 0 ? Math.min(...countsArray) : 0;
        const maxTransientsPerBeat = countsArray.length > 0 ? Math.max(...countsArray) : 0;

        // Calculate variance
        const variance = this.calculateVariance(countsArray, transientsPerBeat);

        // Determine density category and natural difficulty
        const densityCategory = this.categorizeDensity(transientsPerBeat);
        const naturalDifficulty = this.determineNaturalDifficulty(densityCategory);

        return {
            band,
            totalBeats,
            totalTransients,
            transientsPerBeat,
            minTransientsPerBeat,
            maxTransientsPerBeat,
            variance,
            densityCategory,
            naturalDifficulty,
            perBeatDensity,
        };
    }

    /**
     * Calculate combined per-beat density across all bands
     */
    private calculateCombinedPerBeatDensity(
        lowMap: GeneratedRhythmMap,
        midMap: GeneratedRhythmMap,
        highMap: GeneratedRhythmMap
    ): BeatDensityMetrics[] {
        // Find maximum beat index across all bands
        const allBeats = [...lowMap.beats, ...midMap.beats, ...highMap.beats];
        const maxBeatIndex = allBeats.length > 0 ? Math.max(...allBeats.map(b => b.beatIndex)) : 0;
        const totalBeats = maxBeatIndex + 1;

        // Aggregate per beat
        const beatData = new Map<number, {
            count: number;
            bands: Set<'low' | 'mid' | 'high'>;
            intensities: number[];
        }>();

        // Process each band
        for (const beat of lowMap.beats) {
            this.addToBeatData(beatData, beat, 'low');
        }
        for (const beat of midMap.beats) {
            this.addToBeatData(beatData, beat, 'mid');
        }
        for (const beat of highMap.beats) {
            this.addToBeatData(beatData, beat, 'high');
        }

        // Build result
        const result: BeatDensityMetrics[] = [];

        for (let beatIndex = 0; beatIndex < totalBeats; beatIndex++) {
            const data = beatData.get(beatIndex);
            if (data) {
                const avgIntensity = data.intensities.length > 0
                    ? data.intensities.reduce((a, b) => a + b, 0) / data.intensities.length
                    : 0;

                result.push({
                    beatIndex,
                    transientCount: data.count,
                    bands: Array.from(data.bands),
                    averageIntensity: avgIntensity,
                });
            } else {
                result.push({
                    beatIndex,
                    transientCount: 0,
                    bands: [],
                    averageIntensity: 0,
                });
            }
        }

        return result;
    }

    /**
     * Helper to add beat data to the aggregation map
     */
    private addToBeatData(
        beatData: Map<number, {
            count: number;
            bands: Set<'low' | 'mid' | 'high'>;
            intensities: number[];
        }>,
        beat: GeneratedBeat,
        band: 'low' | 'mid' | 'high'
    ): void {
        const existing = beatData.get(beat.beatIndex);
        if (existing) {
            existing.count++;
            existing.bands.add(band);
            existing.intensities.push(beat.intensity);
        } else {
            const bandSet = new Set<'low' | 'mid' | 'high'>();
            bandSet.add(band);
            beatData.set(beat.beatIndex, {
                count: 1,
                bands: bandSet,
                intensities: [beat.intensity],
            });
        }
    }

    /**
     * Calculate combined metrics from per-beat density
     */
    private calculateCombinedMetrics(perBeatDensity: BeatDensityMetrics[]): {
        totalTransients: number;
        transientsPerBeat: number;
        densityCategory: DensityCategory;
        naturalDifficulty: NaturalDifficulty;
    } {
        const totalTransients = perBeatDensity.reduce((sum, b) => sum + b.transientCount, 0);
        const totalBeats = perBeatDensity.length;
        const transientsPerBeat = totalBeats > 0 ? totalTransients / totalBeats : 0;

        const densityCategory = this.categorizeDensity(transientsPerBeat);
        const naturalDifficulty = this.determineNaturalDifficulty(densityCategory);

        return {
            totalTransients,
            transientsPerBeat,
            densityCategory,
            naturalDifficulty,
        };
    }

    /**
     * Calculate section-based metrics
     */
    private calculateSectionMetrics(perBeatDensity: BeatDensityMetrics[]): SectionDensityMetrics[] {
        const sections: SectionDensityMetrics[] = [];
        const beatsPerSection = this.config.beatsPerSection;
        const totalBeats = perBeatDensity.length;

        for (let startBeat = 0; startBeat < totalBeats; startBeat += beatsPerSection) {
            const endBeat = Math.min(startBeat + beatsPerSection - 1, totalBeats - 1);
            const sectionBeats = perBeatDensity.slice(startBeat, endBeat + 1);

            const totalTransients = sectionBeats.reduce((sum, b) => sum + b.transientCount, 0);
            const beatCount = sectionBeats.length;
            const transientsPerBeat = beatCount > 0 ? totalTransients / beatCount : 0;

            const transientCounts = sectionBeats.map(b => b.transientCount);
            const minTransientsPerBeat = transientCounts.length > 0 ? Math.min(...transientCounts) : 0;
            const maxTransientsPerBeat = transientCounts.length > 0 ? Math.max(...transientCounts) : 0;

            const densityCategory = this.categorizeDensity(transientsPerBeat);
            const naturalDifficulty = this.determineNaturalDifficulty(densityCategory);

            sections.push({
                startBeat,
                endBeat,
                beatCount,
                totalTransients,
                transientsPerBeat,
                minTransientsPerBeat,
                maxTransientsPerBeat,
                densityCategory,
                naturalDifficulty,
            });
        }

        return sections;
    }

    /**
     * Categorize density based on transients per beat
     *
     * Sparse: < sparseThreshold (mostly quarter notes)
     * Moderate: sparseThreshold - denseThreshold (eighth notes, some sixteenths)
     * Dense: > denseThreshold (heavy sixteenth notes, triplets)
     */
    categorizeDensity(transientsPerBeat: number): DensityCategory {
        if (transientsPerBeat < this.config.sparseThreshold) {
            return 'sparse';
        } else if (transientsPerBeat > this.config.denseThreshold) {
            return 'dense';
        } else {
            return 'moderate';
        }
    }

    /**
     * Determine natural difficulty from density category
     *
     * High density (dense) → Hard
     * Medium density (moderate) → Medium
     * Low density (sparse) → Easy
     */
    determineNaturalDifficulty(densityCategory: DensityCategory): NaturalDifficulty {
        switch (densityCategory) {
            case 'sparse':
                return 'easy';
            case 'moderate':
                return 'medium';
            case 'dense':
                return 'hard';
        }
    }

    /**
     * Calculate variance of an array of numbers
     */
    private calculateVariance(values: number[], mean: number): number {
        if (values.length === 0) {
            return 0;
        }

        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    }

    /**
     * Get the current configuration
     */
    getConfig(): DensityAnalyzerConfig {
        return { ...this.config };
    }
}
