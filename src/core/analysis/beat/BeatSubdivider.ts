/**
 * Beat Subdivider
 *
 * Transforms a UnifiedBeatMap into a SubdividedBeatMap by applying rhythmic
 * subdivision patterns. Supports half notes, eighth notes, sixteenth notes,
 * triplets, and dotted patterns.
 *
 * Subdivision can change over time via segment-based configuration, allowing
 * dynamic rhythm patterns for level creation.
 *
 * @example
 * ```typescript
 * const subdivider = new BeatSubdivider();
 *
 * // Subdivide with default config (quarter notes)
 * const subdividedMap = subdivider.subdivide(unifiedMap);
 *
 * // Subdivide with custom config
 * const customConfig: SubdivisionConfig = {
 *   segments: [
 *     { startBeat: 0, subdivision: 'quarter' },
 *     { startBeat: 32, subdivision: 'eighth' },
 *   ],
 * };
 * const customMap = subdivider.subdivide(unifiedMap, customConfig);
 * ```
 */

import type {
    Beat,
    UnifiedBeatMap,
    SubdividedBeat,
    SubdividedBeatMap,
    SubdivisionConfig,
    SubdivisionSegment,
    SubdivisionMetadata,
    SubdivisionType,
    TempoSection,
} from '../../types/BeatMap.js';
import {
    DEFAULT_SUBDIVISION_CONFIG,
    validateSubdivisionConfig,
    validateSubdivisionConfigAgainstBeats,
    getSubdivisionDensity,
} from '../../types/BeatMap.js';
import { Logger } from '../../../utils/logger.js';

const logger = Logger.for('BeatSubdivider');

/**
 * Options for the BeatSubdivider
 */
export interface BeatSubdividerOptions {
    /**
     * Tolerance in seconds for aligning beats to detected beats
     * When generating new beats, if a beat falls within this tolerance
     * of a detected beat, it will be marked as detected.
     * @default 0.02 (20ms)
     */
    tolerance?: number;

    /**
     * Default intensity for newly generated beats (0.0 - 1.0)
     * Used when intensity cannot be interpolated from neighbors.
     * @default 0.5
     */
    defaultIntensity?: number;

    /**
     * Default confidence for newly generated beats (0.0 - 1.0)
     * Used when confidence cannot be interpolated from neighbors.
     * @default 0.7
     */
    defaultConfidence?: number;
}

/**
 * Default options for BeatSubdivider
 */
const DEFAULT_BEAT_SUBDIVIDER_OPTIONS: Required<BeatSubdividerOptions> = {
    tolerance: 0.02,           // 20ms tolerance
    defaultIntensity: 0.5,     // Medium intensity
    defaultConfidence: 0.7,    // Good confidence for generated beats
};

/**
 * Internal structure for tracking subdivision context during processing
 */
interface SubdivisionContext {
    /** The unified beat map being processed */
    unifiedMap: UnifiedBeatMap;

    /** Options for subdivision */
    options: Required<BeatSubdividerOptions>;

    /** The subdivision configuration */
    config: SubdivisionConfig;

    /** Set of subdivision types used (for metadata) */
    subdivisionsUsed: Set<SubdivisionType>;

    /** Maximum density encountered (for metadata) */
    maxDensity: number;
}

/**
 * Beat Subdivider
 *
 * Transforms quarter-note beat grids into various rhythmic subdivisions.
 * Supports segment-based configuration for dynamic rhythm patterns.
 */
export class BeatSubdivider {
    private options: Required<BeatSubdividerOptions>;

    /**
     * Create a new BeatSubdivider
     *
     * @param options - Optional configuration options
     */
    constructor(options?: BeatSubdividerOptions) {
        this.options = {
            ...DEFAULT_BEAT_SUBDIVIDER_OPTIONS,
            ...options,
        };

        logger.debug('BeatSubdivider initialized', { options: this.options });
    }

    /**
     * Subdivide a unified beat map according to the given configuration
     *
     * @param unifiedMap - The unified beat map to subdivide
     * @param config - Optional subdivision configuration (defaults to quarter notes)
     * @returns The subdivided beat map
     * @throws Error if configuration is invalid
     */
    subdivide(
        unifiedMap: UnifiedBeatMap,
        config: SubdivisionConfig = DEFAULT_SUBDIVISION_CONFIG
    ): SubdividedBeatMap {
        logger.debug('Starting subdivision', {
            audioId: unifiedMap.audioId,
            beatCount: unifiedMap.beats.length,
            segmentCount: config.segments.length,
        });

        // Validate configuration
        validateSubdivisionConfig(config);
        validateSubdivisionConfigAgainstBeats(config, unifiedMap.beats.length);

        // Handle empty beat map
        if (unifiedMap.beats.length === 0) {
            return this.createEmptySubdividedBeatMap(unifiedMap, config);
        }

        // Create context for processing
        const context: SubdivisionContext = {
            unifiedMap,
            options: this.options,
            config,
            subdivisionsUsed: new Set(),
            maxDensity: 1,
        };

        // Process all segments
        const subdividedBeats = this.processSegments(context);

        // Build detected beat indices for the result
        const detectedBeatIndices = this.buildDetectedBeatIndices(subdividedBeats);

        // Build metadata
        const metadata = this.buildMetadata(context, subdividedBeats.length);

        const result: SubdividedBeatMap = {
            audioId: unifiedMap.audioId,
            duration: unifiedMap.duration,
            beats: subdividedBeats,
            detectedBeatIndices,
            subdivisionConfig: config,
            downbeatConfig: unifiedMap.downbeatConfig,
            tempoSections: unifiedMap.tempoSections,
            subdivisionMetadata: metadata,
        };

        logger.debug('Subdivision complete', {
            originalBeats: unifiedMap.beats.length,
            subdividedBeats: subdividedBeats.length,
            densityMultiplier: metadata.averageDensityMultiplier,
        });

        return result;
    }

    /**
     * Create an empty subdivided beat map
     */
    private createEmptySubdividedBeatMap(
        unifiedMap: UnifiedBeatMap,
        config: SubdivisionConfig
    ): SubdividedBeatMap {
        return {
            audioId: unifiedMap.audioId,
            duration: unifiedMap.duration,
            beats: [],
            detectedBeatIndices: [],
            subdivisionConfig: config,
            downbeatConfig: unifiedMap.downbeatConfig,
            tempoSections: unifiedMap.tempoSections,
            subdivisionMetadata: {
                originalBeatCount: 0,
                subdividedBeatCount: 0,
                averageDensityMultiplier: 1,
                segmentCount: config.segments.length,
                subdivisionsUsed: ['quarter'],
                hasMultipleTempos: !!unifiedMap.tempoSections && unifiedMap.tempoSections.length > 1,
                maxDensity: 1,
            },
        };
    }

    /**
     * Process all segments in the configuration
     */
    private processSegments(context: SubdivisionContext): SubdividedBeat[] {
        const { unifiedMap, config } = context;
        const result: SubdividedBeat[] = [];

        // Process each segment
        for (let i = 0; i < config.segments.length; i++) {
            const segment = config.segments[i];
            const nextSegment = config.segments[i + 1];

            // Determine the beat range for this segment
            const startBeat = segment.startBeat;
            const endBeat = nextSegment ? nextSegment.startBeat : unifiedMap.beats.length;

            // Track subdivision type used
            context.subdivisionsUsed.add(segment.subdivision);

            // Track max density
            const density = getSubdivisionDensity(segment.subdivision);
            context.maxDensity = Math.max(context.maxDensity, density);

            // Get the beats that fall within this segment
            const segmentBeats = unifiedMap.beats.slice(startBeat, endBeat);

            if (segmentBeats.length === 0) {
                continue;
            }

            // Apply subdivision to this segment
            const subdividedSegment = this.subdivideSegment(
                segment,
                segmentBeats,
                startBeat,
                context
            );

            result.push(...subdividedSegment);
        }

        return result;
    }

    /**
     * Subdivide a single segment
     *
     * @param segment - The segment configuration
     * @param beats - The beats in this segment
     * @param globalStartIndex - The global beat index where this segment starts
     * @param context - The subdivision context
     * @returns Array of subdivided beats
     */
    private subdivideSegment(
        segment: SubdivisionSegment,
        beats: Beat[],
        globalStartIndex: number,
        context: SubdivisionContext
    ): SubdividedBeat[] {
        const { subdivision } = segment;
        const { unifiedMap, options } = context;

        // Get the quarter note interval (may be overridden by tempo sections)
        const quarterNoteInterval = unifiedMap.quarterNoteInterval;

        switch (subdivision) {
            case 'quarter':
                return this.subdivideQuarter(beats, globalStartIndex, unifiedMap);

            case 'half':
                return this.subdivideHalf(beats, globalStartIndex, unifiedMap);

            case 'eighth':
                return this.subdivideEighth(beats, globalStartIndex, unifiedMap, quarterNoteInterval, options);

            case 'sixteenth':
                return this.subdivideSixteenth(beats, globalStartIndex, unifiedMap, quarterNoteInterval, options);

            case 'triplet8':
                return this.subdivideTriplet8(beats, globalStartIndex, unifiedMap, quarterNoteInterval, options);

            case 'triplet4':
                return this.subdivideTriplet4(beats, globalStartIndex, unifiedMap, quarterNoteInterval, options);

            case 'dotted4':
                return this.subdivideDotted4(beats, globalStartIndex, unifiedMap, quarterNoteInterval, options);

            case 'dotted8':
                return this.subdivideDotted8(beats, globalStartIndex, unifiedMap, quarterNoteInterval, options);

            default:
                // TypeScript exhaustive check
                const _exhaustive: never = subdivision;
                throw new Error(`Unknown subdivision type: ${_exhaustive}`);
        }
    }

    /**
     * Subdivide as quarter notes (no-op, pass through unchanged)
     *
     * Quarter notes are the default subdivision - beats pass through
     * unchanged, just converted to SubdividedBeat format.
     */
    private subdivideQuarter(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap
    ): SubdividedBeat[] {
        return beats.map((beat, localIndex) => {
            const globalIndex = globalStartIndex + localIndex;
            const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

            return {
                ...beat,
                isDetected,
                originalBeatIndex: globalIndex,
                subdivisionType: 'quarter' as SubdivisionType,
            };
        });
    }

    /**
     * Subdivide as half notes (0.5x density)
     *
     * Keeps beats on positions 0 and 2 (downbeats and beat 3s).
     * Measure numbers are preserved from the original grid.
     */
    private subdivideHalf(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            const globalIndex = globalStartIndex + i;

            // Keep beats at positions 0 and 2 (downbeats and beat 3s)
            if (beat.beatInMeasure % 2 === 0) {
                const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

                result.push({
                    ...beat,
                    isDetected,
                    originalBeatIndex: globalIndex,
                    subdivisionType: 'half' as SubdivisionType,
                });
            }
        }

        return result;
    }

    /**
     * Subdivide as eighth notes (2x density)
     *
     * Inserts a new beat midway between each quarter note.
     * New beat has beatInMeasure = original + 0.5.
     */
    private subdivideEighth(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            const globalIndex = globalStartIndex + i;
            const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

            // Add the original beat
            result.push({
                ...beat,
                isDetected,
                originalBeatIndex: globalIndex,
                subdivisionType: 'eighth' as SubdivisionType,
            });

            // Add interpolated eighth note between this and next beat
            if (i < beats.length - 1) {
                const nextBeat = beats[i + 1];
                const interpolatedBeat = this.createInterpolatedBeat(
                    beat,
                    nextBeat,
                    0.5,
                    'eighth',
                    quarterNoteInterval,
                    options
                );
                result.push(interpolatedBeat);
            }
        }

        return result;
    }

    /**
     * Subdivide as sixteenth notes (4x density)
     *
     * Inserts 3 beats evenly spaced between each quarter note.
     * Labels: original, +0.25, +0.5, +0.75
     */
    private subdivideSixteenth(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            const globalIndex = globalStartIndex + i;
            const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

            // Add the original beat
            result.push({
                ...beat,
                isDetected,
                originalBeatIndex: globalIndex,
                subdivisionType: 'sixteenth' as SubdivisionType,
            });

            // Add 3 interpolated sixteenth notes between this and next beat
            if (i < beats.length - 1) {
                const nextBeat = beats[i + 1];

                // Add beats at 0.25, 0.5, 0.75
                for (let offset = 0.25; offset < 1; offset += 0.25) {
                    const interpolatedBeat = this.createInterpolatedBeat(
                        beat,
                        nextBeat,
                        offset,
                        'sixteenth',
                        quarterNoteInterval,
                        options
                    );
                    result.push(interpolatedBeat);
                }
            }
        }

        return result;
    }

    /**
     * Subdivide as eighth triplets (3 beats per quarter note)
     *
     * Interval = quarterNoteInterval / 3
     * Labels: 0, 0.33, 0.66, 1, 1.33, 1.66...
     */
    private subdivideTriplet8(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            const globalIndex = globalStartIndex + i;
            const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

            // Add the original beat (at position 0 of triplet group)
            result.push({
                ...beat,
                isDetected,
                originalBeatIndex: globalIndex,
                subdivisionType: 'triplet8' as SubdivisionType,
            });

            // Add 2 triplet beats between this and next quarter
            if (i < beats.length - 1) {
                const nextBeat = beats[i + 1];

                // Triplet offsets: 1/3 and 2/3
                const tripletOffsets = [1/3, 2/3];

                for (const offset of tripletOffsets) {
                    const interpolatedBeat = this.createInterpolatedBeat(
                        beat,
                        nextBeat,
                        offset,
                        'triplet8',
                        quarterNoteInterval,
                        options
                    );
                    result.push(interpolatedBeat);
                }
            }
        }

        return result;
    }

    /**
     * Subdivide as quarter triplets (3 beats per half note)
     *
     * Interval = quarterNoteInterval * 2 / 3
     * Labels: 0, 0.66, 1.33, 2, 2.66, 3.33...
     */
    private subdivideTriplet4(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];
        const tripletInterval = (quarterNoteInterval * 2) / 3;

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            const globalIndex = globalStartIndex + i;
            const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

            // For quarter triplets, we only add beats on certain positions
            // The pattern is: 0, 0.66, 1.33, 2, 2.66, 3.33...
            // This means we add beats at beatInMeasure positions that are
            // multiples of 2/3 (0.666...)

            const beatPosition = beat.beatInMeasure;
            const tripletPosition = beatPosition * (2/3);

            // Check if this quarter note aligns with a triplet position
            // We keep quarter notes at positions 0, 2, 4... (even positions)
            // and add interpolated beats for the triplet feel

            // Add the original beat if it's at a triplet position
            // (Every quarter note is potentially at a triplet position)
            result.push({
                ...beat,
                isDetected,
                originalBeatIndex: globalIndex,
                subdivisionType: 'triplet4' as SubdivisionType,
            });

            // Add interpolated triplet beat if there's room before the next beat
            if (i < beats.length - 1) {
                const nextBeat = beats[i + 1];

                // For triplet4, we add one beat at 2/3 between quarters
                // (not 1/3, as that would be too dense)
                const interpolatedBeat = this.createInterpolatedBeat(
                    beat,
                    nextBeat,
                    2/3,
                    'triplet4',
                    quarterNoteInterval,
                    options
                );
                result.push(interpolatedBeat);
            }
        }

        return result;
    }

    /**
     * Subdivide as dotted quarter notes (1.5x interval)
     *
     * Phase-independent: Doesn't care about measure boundaries.
     * Pattern: 0, 1.5, 3, 4.5, 6...
     * Creates 3-beat groups in 4/4 time (cross-rhythm).
     */
    private subdivideDotted4(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];
        const dottedInterval = quarterNoteInterval * 1.5;

        if (beats.length === 0) {
            return result;
        }

        // Get the first beat as the anchor
        const firstBeat = beats[0];
        const startTime = firstBeat.timestamp;
        const endTime = beats[beats.length - 1].timestamp;

        // Generate beats at dotted quarter intervals
        let currentTime = startTime;
        let beatIndex = 0;

        while (currentTime <= endTime) {
            // Find the closest original beat for intensity/confidence interpolation
            const closestBeat = this.findClosestBeat(beats, currentTime);

            const dottedBeat: SubdividedBeat = {
                timestamp: currentTime,
                beatInMeasure: this.calculateBeatInMeasure(currentTime, firstBeat.timestamp, quarterNoteInterval),
                isDownbeat: false, // Dotted pattern doesn't align with downbeats
                measureNumber: this.calculateMeasureNumber(currentTime, firstBeat.timestamp, quarterNoteInterval, unifiedMap.downbeatConfig),
                intensity: closestBeat.intensity,
                confidence: closestBeat.confidence * 0.9, // Slightly lower confidence for generated
                isDetected: false,
                subdivisionType: 'dotted4' as SubdivisionType,
            };

            result.push(dottedBeat);

            currentTime += dottedInterval;
            beatIndex++;
        }

        return result;
    }

    /**
     * Subdivide as dotted eighth (swing long-short pattern)
     *
     * Long: 2/3 of quarter (≈0.667), Short: 1/3 of quarter (≈0.333)
     * Labels: 0, 0.667, 1, 1.667, 2, 2.667...
     * Classic swing feel.
     */
    private subdivideDotted8(
        beats: Beat[],
        globalStartIndex: number,
        unifiedMap: UnifiedBeatMap,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];
            const globalIndex = globalStartIndex + i;
            const isDetected = unifiedMap.detectedBeatIndices.includes(globalIndex);

            // Add the original beat (start of swing pair)
            result.push({
                ...beat,
                isDetected,
                originalBeatIndex: globalIndex,
                subdivisionType: 'dotted8' as SubdivisionType,
            });

            // Add the swing beat at 2/3 between quarters
            if (i < beats.length - 1) {
                const nextBeat = beats[i + 1];

                // Swing: long note is 2/3, short note is 1/3
                const interpolatedBeat = this.createInterpolatedBeat(
                    beat,
                    nextBeat,
                    2/3,
                    'dotted8',
                    quarterNoteInterval,
                    options
                );
                result.push(interpolatedBeat);
            }
        }

        return result;
    }

    /**
     * Create an interpolated beat between two beats
     */
    private createInterpolatedBeat(
        beat1: Beat,
        beat2: Beat,
        offset: number,
        subdivisionType: SubdivisionType,
        quarterNoteInterval: number,
        options: Required<BeatSubdividerOptions>
    ): SubdividedBeat {
        // Calculate timestamp based on offset (0 = at beat1, 1 = at beat2)
        const timeDiff = beat2.timestamp - beat1.timestamp;
        const timestamp = beat1.timestamp + timeDiff * offset;

        // Calculate beatInMeasure (decimal)
        const beatInMeasure = beat1.beatInMeasure + offset;

        // Interpolate intensity and confidence (linear average)
        const intensity = (beat1.intensity + beat2.intensity) / 2;
        const confidence = (beat1.confidence + beat2.confidence) / 2;

        return {
            timestamp,
            beatInMeasure,
            isDownbeat: false, // Interpolated beats are never downbeats
            measureNumber: beat1.measureNumber, // Same measure as the starting beat
            intensity,
            confidence,
            isDetected: false,
            subdivisionType: subdivisionType as SubdivisionType,
        };
    }

    /**
     * Find the closest beat to a given timestamp
     */
    private findClosestBeat(beats: Beat[], timestamp: number): Beat {
        let closest = beats[0];
        let minDiff = Math.abs(beats[0].timestamp - timestamp);

        for (const beat of beats) {
            const diff = Math.abs(beat.timestamp - timestamp);
            if (diff < minDiff) {
                minDiff = diff;
                closest = beat;
            }
        }

        return closest;
    }

    /**
     * Calculate beatInMeasure for a timestamp
     */
    private calculateBeatInMeasure(
        timestamp: number,
        startTime: number,
        quarterNoteInterval: number
    ): number {
        const elapsed = timestamp - startTime;
        const beatsFromStart = elapsed / quarterNoteInterval;
        // In 4/4 time, beatInMeasure cycles 0, 1, 2, 3, 0, 1, 2, 3...
        return beatsFromStart % 4;
    }

    /**
     * Calculate measure number for a timestamp
     */
    private calculateMeasureNumber(
        timestamp: number,
        startTime: number,
        quarterNoteInterval: number,
        downbeatConfig: { segments: Array<{ startBeat: number; timeSignature: { beatsPerMeasure: number } }> }
    ): number {
        const elapsed = timestamp - startTime;
        const beatsFromStart = elapsed / quarterNoteInterval;
        // Get beats per measure from config (default 4)
        const beatsPerMeasure = downbeatConfig.segments[0]?.timeSignature?.beatsPerMeasure ?? 4;
        return Math.floor(beatsFromStart / beatsPerMeasure);
    }

    /**
     * Build the detected beat indices array for the result
     */
    private buildDetectedBeatIndices(beats: SubdividedBeat[]): number[] {
        const indices: number[] = [];

        for (let i = 0; i < beats.length; i++) {
            if (beats[i].isDetected) {
                indices.push(i);
            }
        }

        return indices;
    }

    /**
     * Build subdivision metadata
     */
    private buildMetadata(
        context: SubdivisionContext,
        subdividedBeatCount: number
    ): SubdivisionMetadata {
        const { unifiedMap, config } = context;
        const originalBeatCount = unifiedMap.beats.length;

        const averageDensityMultiplier = originalBeatCount > 0
            ? subdividedBeatCount / originalBeatCount
            : 1;

        return {
            originalBeatCount,
            subdividedBeatCount,
            averageDensityMultiplier,
            segmentCount: config.segments.length,
            subdivisionsUsed: Array.from(context.subdivisionsUsed),
            hasMultipleTempos: !!unifiedMap.tempoSections && unifiedMap.tempoSections.length > 1,
            maxDensity: context.maxDensity,
        };
    }
}
