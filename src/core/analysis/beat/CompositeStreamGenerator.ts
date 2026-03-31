/**
 * Composite Stream Generator for Procedural Rhythm Generation
 *
 * Creates a single composite stream by slicing together the highest-scoring sections
 * from each band stream.
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 3.2
 *
 * @example
 * ```typescript
 * // Basic usage - generate composite from scored streams
 * const generator = new CompositeStreamGenerator();
 * const composite = generator.generate(quantizedBandStreams, scoringResult, densityAnalysis);
 *
 * // Access the composite beats
 * console.log(`Total beats: ${composite.beats.length}`);
 * console.log(`Natural difficulty: ${composite.naturalDifficulty}`);
 *
 * // Check which band contributed to each section
 * for (const section of composite.sections) {
 *   console.log(`Beats ${section.beatRange.start}-${section.beatRange.end}: ${section.sourceBand}`);
 *   console.log(`  Score: ${section.score.toFixed(2)}, margin: ${section.margin.toFixed(2)}`);
 * }
 *
 * // Check band contribution statistics
 * console.log('Beats per band:', composite.metadata.beatsPerBand);
 * console.log('Sections per band:', composite.metadata.sectionsPerBand);
 * ```
 */

import type { GeneratedBeat, GeneratedRhythmMap, QuantizedBandStreams } from './RhythmQuantizer.js';
import type { StreamScoringResult, SectionWinner, Band } from './StreamScorer.js';
import type { DensityAnalysisResult, NaturalDifficulty } from './DensityAnalyzer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A section of the composite stream contributed by a single band
 */
export interface CompositeSection {
    /** Beat range for this section */
    beatRange: {
        start: number;
        end: number;
    };

    /** Which band contributed this section */
    sourceBand: Band;

    /** The winning score for this section */
    score: number;

    /** Margin of victory over the runner-up band */
    margin: number;
}

/**
 * A beat in the composite stream with additional metadata about its source
 */
export interface CompositeBeat extends GeneratedBeat {
    /** Which band this beat originated from */
    sourceBand: Band;
}

/**
 * Complete composite stream result
 */
export interface CompositeStream {
    /** The composite beat stream (all beats combined from winning sections) */
    beats: CompositeBeat[];

    /** Sections showing which band contributed to each part */
    sections: CompositeSection[];

    /** Natural difficulty determined by density analysis of the composite */
    naturalDifficulty: NaturalDifficulty;

    /** Duration of a quarter note in seconds (derived from beat map) */
    quarterNoteInterval: number;

    /** Metadata about the composite generation */
    metadata: {
        /** Total number of beats in the composite */
        totalBeats: number;

        /** Number of sections */
        sectionCount: number;

        /** Count of beats contributed by each band */
        beatsPerBand: {
            low: number;
            mid: number;
            high: number;
        };

        /** Percentage of sections won by each band */
        sectionsPerBand: {
            low: number;
            mid: number;
            high: number;
        };
    };
}

/**
 * Configuration for composite stream generation
 */
export interface CompositeStreamConfig {
    /** Number of beats to overlap at section boundaries for smooth transitions.
     *  Default: 0 (no overlap, immediate transition) */
    transitionOverlapBeats: number;

    /** Whether to preserve the original grid decisions at section boundaries.
     *  If true, maintains the grid type from the winning band's stream.
     *  Default: true */
    preserveGridDecisions: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_COMPOSITE_STREAM_CONFIG: CompositeStreamConfig = {
    transitionOverlapBeats: 0, // No overlap by default - clean section boundaries
    preserveGridDecisions: true,
};

/**
 * Density thresholds for determining natural difficulty from composite stream.
 * These match the defaults in DensityAnalyzer.
 *
 * Sparse: < SPARSE_THRESHOLD notes/sec → Easy
 * Moderate: SPARSE_THRESHOLD - DENSE_THRESHOLD notes/sec → Medium
 * Dense: > DENSE_THRESHOLD notes/sec → Hard
 */
const SPARSE_THRESHOLD = 0.9;
const DENSE_THRESHOLD = 1.2;

// ============================================================================
// CompositeStreamGenerator Class
// ============================================================================

/**
 * Creates a composite rhythm stream by combining the highest-scoring sections
 * from each frequency band.
 *
 * ## Algorithm Overview
 *
 * 1. **Section Selection**: For each section, select the band with the highest
 *    interest score (determined by StreamScorer).
 *
 * 2. **Beat Extraction**: Extract all beats from the winning band's stream
 *    for each section's beat range.
 *
 * 3. **Stream Assembly**: Combine all extracted beats into a single composite
 *    stream, maintaining temporal order.
 *
 * 4. **Natural Difficulty**: Determine the composite's natural difficulty based
 *    on the density of the combined stream.
 *
 * ## Usage
 *
 * ```typescript
 * const generator = new CompositeStreamGenerator();
 * const composite = generator.generate(quantizedStreams, scoringResult, densityAnalysis);
 *
 * // Access the composite beat stream
 * const beats = composite.beats;
 *
 * // See which band contributed each section
 * for (const section of composite.sections) {
 *   console.log(`Beats ${section.beatRange.start}-${section.beatRange.end}: ${section.sourceBand}`);
 * }
 *
 * // Get the natural difficulty
 * console.log('Natural difficulty:', composite.naturalDifficulty);
 * ```
 */
export class CompositeStreamGenerator {
    private config: CompositeStreamConfig;

    constructor(config: Partial<CompositeStreamConfig> = {}) {
        this.config = { ...DEFAULT_COMPOSITE_STREAM_CONFIG, ...config };
    }

    /**
     * Generate a composite stream from quantized band streams and scoring results
     *
     * @param streams - Quantized band streams from RhythmQuantizer
     * @param scoringResult - Scoring result from StreamScorer
     * @param densityAnalysis - Density analysis from DensityAnalyzer
     * @returns Composite stream with sections and metadata
     */
    generate(
        streams: QuantizedBandStreams,
        scoringResult: StreamScoringResult,
        densityAnalysis: DensityAnalysisResult
    ): CompositeStream {
        const sectionWinners = scoringResult.sectionWinners;
        const beatsPerBand = { low: 0, mid: 0, high: 0 };
        const sectionsPerBand = { low: 0, mid: 0, high: 0 };

        // Filter out sections where no band has any beats
        const validSectionWinners = sectionWinners.filter(winner => {
            const bands: Band[] = ['low', 'mid', 'high'];
            let hasAnyBeats = false;
            for (const band of bands) {
                const bandStream = streams.streams[band];
                const beatsInSection = bandStream.beats.filter(
                    b => b.beatIndex >= winner.beatRange.start && b.beatIndex <= winner.beatRange.end
                );
                if (beatsInSection.length > 0) {
                    hasAnyBeats = true;
                    break;
                }
            }
            return hasAnyBeats;
        });

        // Build composite sections (only for sections with actual beats)
        const sections: CompositeSection[] = validSectionWinners.map(winner => ({
            beatRange: winner.beatRange,
            sourceBand: winner.winner,
            score: winner.score,
            margin: winner.margin,
        }));

        // Count sections per band
        for (const section of sections) {
            sectionsPerBand[section.sourceBand]++;
        }

        // Extract beats for each section from the winning band
        const allCompositeBeats: CompositeBeat[] = [];

        for (const section of sections) {
            const bandStream = streams.streams[section.sourceBand];
            const sectionBeats = this.extractSectionBeats(
                bandStream,
                section.beatRange,
                section.sourceBand
            );

            allCompositeBeats.push(...sectionBeats);
            beatsPerBand[section.sourceBand] += sectionBeats.length;
        }

        // Sort beats by timestamp to ensure correct order
        allCompositeBeats.sort((a, b) => a.timestamp - b.timestamp);

        // Remove duplicates (in case of overlapping sections)
        const deduplicatedBeats = this.deduplicateBeats(allCompositeBeats);

        // Determine natural difficulty based on composite density
        // Derive BPM from quarter note interval (60 / quarterNoteInterval)
        const quarterNoteInterval = streams.streams.low.quarterNoteInterval;
        const bpm = 60 / quarterNoteInterval;
        const naturalDifficulty = this.determineNaturalDifficulty(
            deduplicatedBeats,
            densityAnalysis,
            bpm
        );

        // Build metadata
        const totalSections = sections.length;
        const metadata = {
            totalBeats: deduplicatedBeats.length,
            sectionCount: totalSections,
            beatsPerBand,
            sectionsPerBand: {
                low: totalSections > 0 ? sectionsPerBand.low / totalSections : 0,
                mid: totalSections > 0 ? sectionsPerBand.mid / totalSections : 0,
                high: totalSections > 0 ? sectionsPerBand.high / totalSections : 0,
            },
        };

        return {
            beats: deduplicatedBeats,
            sections,
            naturalDifficulty,
            quarterNoteInterval,
            metadata,
        };
    }

    /**
     * Extract beats from a band stream for a specific beat range
     */
    private extractSectionBeats(
        stream: GeneratedRhythmMap,
        beatRange: { start: number; end: number },
        sourceBand: Band
    ): CompositeBeat[] {
        return stream.beats
            .filter(beat => beat.beatIndex >= beatRange.start && beat.beatIndex <= beatRange.end)
            .map(beat => ({
                ...beat,
                sourceBand,
            }));
    }

    /**
     * Remove duplicate beats (same timestamp) keeping the one with highest intensity
     */
    private deduplicateBeats(beats: CompositeBeat[]): CompositeBeat[] {
        const beatMap = new Map<number, CompositeBeat>();

        for (const beat of beats) {
            // Round timestamp to nearest millisecond for comparison
            const key = Math.round(beat.timestamp * 1000);
            const existing = beatMap.get(key);

            if (!existing || beat.intensity > existing.intensity) {
                beatMap.set(key, beat);
            }
        }

        return Array.from(beatMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Determine the natural difficulty of the composite stream
     *
     * Calculates density based on the merged composite beats (what the player actually hits)
     * rather than the multi-band density (which counts overlapping beats multiple times).
     *
     * Density is measured in notes per second, which accounts for tempo.
     * A 120 BPM track with 2 notes/beat = 4 notes/sec feels much easier than
     * a 180 BPM track with 2 notes/beat = 6 notes/sec.
     *
     * This gives a more accurate representation of gameplay difficulty.
     */
    private determineNaturalDifficulty(
        beats: CompositeBeat[],
        densityAnalysis: DensityAnalysisResult,
        bpm: number
    ): NaturalDifficulty {
        // Calculate density from the composite (merged) beats
        // This represents what the player actually hits
        if (beats.length === 0) {
            return 'easy';
        }

        // Find the total number of quarter note beats (max beatIndex + 1)
        const maxBeatIndex = Math.max(...beats.map(b => b.beatIndex));
        const totalQuarterNotes = maxBeatIndex + 1;

        // Calculate notes per second: notes/beat * beats/second
        const notesPerSecond = (beats.length / totalQuarterNotes) * (bpm / 60);

        // Determine natural difficulty based on density thresholds
        if (notesPerSecond < SPARSE_THRESHOLD) {
            return 'easy';
        } else if (notesPerSecond > DENSE_THRESHOLD) {
            return 'hard';
        } else {
            return 'medium';
        }
    }

    /**
     * Get the current configuration
     */
    getConfig(): CompositeStreamConfig {
        return { ...this.config };
    }
}
