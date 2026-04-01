/**
 * Density Analyzer for Procedural Rhythm Generation
 *
 * Analyzes quantized rhythm streams to measure density (in notes per second)
 * and determine natural difficulty.
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 2.2
 *
 * @example
 * ```typescript
 * // Basic usage - analyze density of quantized streams
 * const analyzer = new DensityAnalyzer();
 * const result = analyzer.analyze(quantizedBandStreams, 120);
 *
 * // Check combined metrics for overall density
 * console.log(`Combined density: ${result.combinedMetrics.notesPerSecond.toFixed(2)} notes/sec`);
 * console.log(`Natural difficulty: ${result.combinedMetrics.naturalDifficulty}`);
 *
 * // Access per-band metrics
 * for (const [band, metrics] of Object.entries(result.bandMetrics)) {
 *   console.log(`${band}: ${metrics.densityCategory} (${metrics.notesPerSecond.toFixed(2)} n/s)`);
 * }
 *
 * // Check section-level density for dynamic difficulty
 * for (const section of result.sections) {
 *   console.log(`Beats ${section.startBeat}-${section.endBeat}: ${section.densityCategory}`);
 * }
 * ```
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

    /** Average notes per second in this section */
    notesPerSecond: number;

    /** Minimum notes per second in any single beat of this section */
    minNotesPerSecond: number;

    /** Maximum notes per second in any single beat of this section */
    maxNotesPerSecond: number;

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

    /** Average notes per second */
    notesPerSecond: number;

    /** Minimum notes per second in any single beat */
    minNotesPerSecond: number;

    /** Maximum notes per second in any single beat */
    maxNotesPerSecond: number;

    /** Variance in notes per second */
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

        /** Average notes per second (across all bands) */
        notesPerSecond: number;

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

    /** Threshold for sparse density (notes per second below this = sparse). Default: 1.0 */
    sparseThreshold: number;

    /** Threshold for dense density (notes per second above this = dense). Default: 1.5 */
    denseThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DENSITY_ANALYZER_CONFIG: DensityAnalyzerConfig = {
    beatsPerSection: 8, // 2 measures in 4/4 time
    sparseThreshold: 1.0,
    denseThreshold: 1.5,
};

// ============================================================================
// Density Threshold Constants
// ============================================================================

/**
 * Notes per second thresholds for density categorization
 *
 * Sparse: < 1.0 notes/sec (mostly quarter notes at moderate tempo)
 * Moderate: 1.0 - 1.5 notes/sec (eighth notes, some sixteenths)
 * Dense: > 1.5 notes/sec (heavy sixteenth notes, triplets)
 */

// ============================================================================
// DensityAnalyzer Class
// ============================================================================

/**
 * Analyzes quantized rhythm streams for density and natural difficulty.
 *
 * Density is measured in notes per second (n/s), which accounts for BPM.
 * A 120 BPM track with 2 notes/beat = 4 notes/sec feels much easier than
 * a 180 BPM track with 2 notes/beat = 6 notes/sec.
 *
 * ## Algorithm Overview
 *
 * 1. **Per-Beat Density Calculation**:
 *    - Count transients in each beat across all bands
 *    - Track which bands contribute to each beat
 *
 * 2. **Notes/Second Conversion**:
 *    - Convert per-beat transient counts to notes/sec: `transientsPerBeat * (bpm / 60)`
 *
 * 3. **Density Categorization**:
 *    - Sparse: < 1.0 notes/sec (mostly quarter notes at moderate tempo)
 *    - Moderate: 1.0 - 1.5 notes/sec (eighth notes, some sixteenths)
 *    - Dense: > 1.5 notes/sec (heavy sixteenth notes, triplets)
 *
 * 4. **Natural Difficulty Determination**:
 *    - High density (dense) → Hard
 *    - Medium density (moderate) → Medium
 *    - Low density (sparse) → Easy
 *
 * 5. **Section Analysis**:
 *    - Divide track into sections (default: 8 beats = 2 measures)
 *    - Calculate density per section for granular analysis
 *
 * ## Usage
 *
 * ```typescript
 * const analyzer = new DensityAnalyzer();
 * const result = analyzer.analyze(quantizedStreams, 150);
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
     * @param bpm - Tempo in beats per minute, used to convert to notes/second
     * @returns Complete density analysis result
     */
    analyze(streams: QuantizedBandStreams, bpm: number, trackDurationSeconds?: number): DensityAnalysisResult {
        const bpmPerSecond = bpm / 60;

        // Analyze each band
        const bandMetrics = {
            low: this.analyzeBand(streams.streams.low, 'low', bpmPerSecond, trackDurationSeconds),
            mid: this.analyzeBand(streams.streams.mid, 'mid', bpmPerSecond, trackDurationSeconds),
            high: this.analyzeBand(streams.streams.high, 'high', bpmPerSecond, trackDurationSeconds),
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
        const combinedMetrics = this.calculateCombinedMetrics(perBeatDensity, bpmPerSecond, trackDurationSeconds);

        // Calculate section-based metrics
        const sections = this.calculateSectionMetrics(perBeatDensity, bpmPerSecond, trackDurationSeconds);

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
    private analyzeBand(rhythmMap: GeneratedRhythmMap, band: 'low' | 'mid' | 'high', bpmPerSecond: number, trackDurationSeconds?: number): BandDensityMetrics {
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

        // Calculate statistics in notes per second
        const countsArray = perBeatDensity.map(b => b.transientCount);
        let notesPerSecond: number;
        if (trackDurationSeconds && trackDurationSeconds > 0) {
            notesPerSecond = totalTransients / trackDurationSeconds;
        } else {
            notesPerSecond = totalBeats > 0 ? (totalTransients / totalBeats) * bpmPerSecond : 0;
        }
        const minNotesPerSecond = countsArray.length > 0 ? Math.min(...countsArray) * bpmPerSecond : 0;
        const maxNotesPerSecond = countsArray.length > 0 ? Math.max(...countsArray) * bpmPerSecond : 0;

        // Calculate variance (on notes/second scale)
        const variance = this.calculateVariance(countsArray, notesPerSecond / bpmPerSecond) * bpmPerSecond * bpmPerSecond;

        // Determine density category and natural difficulty
        const densityCategory = this.categorizeDensity(notesPerSecond);
        const naturalDifficulty = this.determineNaturalDifficulty(densityCategory);

        return {
            band,
            totalBeats,
            totalTransients,
            notesPerSecond,
            minNotesPerSecond,
            maxNotesPerSecond,
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
    private calculateCombinedMetrics(perBeatDensity: BeatDensityMetrics[], bpmPerSecond: number, trackDurationSeconds?: number): {
        totalTransients: number;
        notesPerSecond: number;
        densityCategory: DensityCategory;
        naturalDifficulty: NaturalDifficulty;
    } {
        const totalTransients = perBeatDensity.reduce((sum, b) => sum + b.transientCount, 0);
        let notesPerSecond: number;
        if (trackDurationSeconds && trackDurationSeconds > 0) {
            notesPerSecond = totalTransients / trackDurationSeconds;
        } else {
            const totalBeats = perBeatDensity.length;
            notesPerSecond = totalBeats > 0 ? (totalTransients / totalBeats) * bpmPerSecond : 0;
        }

        const densityCategory = this.categorizeDensity(notesPerSecond);
        const naturalDifficulty = this.determineNaturalDifficulty(densityCategory);

        return {
            totalTransients,
            notesPerSecond,
            densityCategory,
            naturalDifficulty,
        };
    }

    /**
     * Calculate section-based metrics
     */
    private calculateSectionMetrics(perBeatDensity: BeatDensityMetrics[], bpmPerSecond: number, _trackDurationSeconds?: number): SectionDensityMetrics[] {
        const sections: SectionDensityMetrics[] = [];
        const beatsPerSection = this.config.beatsPerSection;
        const totalBeats = perBeatDensity.length;

        for (let startBeat = 0; startBeat < totalBeats; startBeat += beatsPerSection) {
            const endBeat = Math.min(startBeat + beatsPerSection - 1, totalBeats - 1);
            const sectionBeats = perBeatDensity.slice(startBeat, endBeat + 1);

            const totalTransients = sectionBeats.reduce((sum, b) => sum + b.transientCount, 0);
            const beatCount = sectionBeats.length;
            const notesPerSecond = beatCount > 0 ? (totalTransients / beatCount) * bpmPerSecond : 0;

            const transientCounts = sectionBeats.map(b => b.transientCount);
            const minNotesPerSecond = transientCounts.length > 0 ? Math.min(...transientCounts) * bpmPerSecond : 0;
            const maxNotesPerSecond = transientCounts.length > 0 ? Math.max(...transientCounts) * bpmPerSecond : 0;

            const densityCategory = this.categorizeDensity(notesPerSecond);
            const naturalDifficulty = this.determineNaturalDifficulty(densityCategory);

            sections.push({
                startBeat,
                endBeat,
                beatCount,
                totalTransients,
                notesPerSecond,
                minNotesPerSecond,
                maxNotesPerSecond,
                densityCategory,
                naturalDifficulty,
            });
        }

        return sections;
    }

    /**
     * Categorize density based on notes per second
     *
     * Sparse: < sparseThreshold (mostly quarter notes at moderate tempo)
     * Moderate: sparseThreshold - denseThreshold (eighth notes, some sixteenths)
     * Dense: > denseThreshold (heavy sixteenth notes, triplets)
     */
    categorizeDensity(notesPerSecond: number): DensityCategory {
        if (notesPerSecond < this.config.sparseThreshold) {
            return 'sparse';
        } else if (notesPerSecond > this.config.denseThreshold) {
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
