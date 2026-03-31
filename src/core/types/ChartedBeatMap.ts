/**
 * Charted Beat Map Types
 *
 * Types for procedurally generated rhythm game charts that are compatible
 * with BeatStream and the existing beat map infrastructure.
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 2.7
 */

import type { Beat, DownbeatConfig, SubdivisionType } from './BeatMap.js';
import type { DifficultyLevel } from '../analysis/beat/DifficultyVariantGenerator.js';
import type { Band } from '../generation/RhythmGenerator.js';

// ============================================================================
// Charted Beat Types
// ============================================================================

/**
 * A beat in a procedurally generated chart.
 * Extends the base Beat interface with procedural-generation-specific fields.
 */
export interface ChartedBeat extends Beat {
    // === Inherited from Beat ===
    // timestamp: number;
    // beatInMeasure: number;  // Decimal position (0, 0.25, 0.5, 0.75 for 16th notes)
    // isDownbeat: boolean;
    // measureNumber: number;
    // intensity: number;
    // confidence: number;
    // requiredKey?: string;  // Assigned by ButtonMapper

    // === Procedural generation fields ===

    /** Index into the original UnifiedBeatMap.beats[] - which quarter note this belongs to */
    quarterNoteIndex: number;

    /** Position within that quarter note (0-3 for 16th, 0-2 for triplet) */
    subdivisionPosition: number;

    /** Whether this was detected from audio (true) or interpolated/generated (false) */
    isDetected: boolean;

    /** The subdivision type used for this beat */
    subdivisionType: SubdivisionType;

    /** Which frequency band this beat originated from */
    sourceBand: Band;

    /** Quantization error in milliseconds (how far from original transient) */
    quantizationError?: number;

    /** Whether this beat's button was derived from pitch detection or pattern library */
    mappingSource?: 'pitch' | 'pattern';

    /** ID of the pattern used for this beat (if mappingSource is 'pattern') */
    patternId?: string;
}

/**
 * Metadata about a procedurally generated chart
 */
export interface ChartMetadata {
    /** Which difficulty this chart represents */
    difficulty: DifficultyLevel;

    /** Keys used in this chart (e.g., ['up', 'down', 'left', 'right'] or ['1', '2', '3', '4', '5']) */
    keysUsed: string[];

    /** Number of beats with pitch-influenced keys */
    pitchInfluencedBeats: number;

    /** Button patterns used */
    patternsUsed: string[];

    /** Source rhythm metadata */
    rhythmMetadata: RhythmMetadataSummary;

    /** Pitch analysis metadata (if pitch detection was used) */
    pitchMetadata: PitchMetadata | null;

    /** Generation timestamp */
    generatedAt: string;

    /** Seed used for reproducibility */
    seed?: string;
}

/**
 * Summary of rhythm metadata for chart output
 */
export interface RhythmMetadataSummary {
    /** Difficulty preset used */
    difficulty: string;

    /** Bands that were analyzed */
    bandsAnalyzed: Band[];

    /** Total transients detected */
    transientsDetected: number;

    /** Average density across all bands */
    averageDensity: number;

    /** Natural difficulty of the composite */
    naturalDifficulty: DifficultyLevel;
}

/**
 * Metadata about pitch analysis used for chart generation
 */
export interface PitchMetadata {
    /** Melody range detected (min and max note names) */
    melodyRange: { min: string; max: string } | null;

    /** Direction statistics from melody contour analysis */
    directionStats: {
        up: number;      // Count of ascending pitches
        down: number;    // Count of descending pitches
        stable: number;  // Count of repeated pitches
        none: number;    // Count with no pitch detected
    } | null;

    /** Interval statistics from melody contour analysis */
    intervalStats: {
        unison: number;
        small: number;
        medium: number;
        large: number;
        very_large: number;
    } | null;
}

// ============================================================================
// Charted Beat Map Types
// ============================================================================

/**
 * A complete procedurally-generated chart ready for gameplay.
 * Compatible with BeatStream and the existing beat map infrastructure.
 */
export interface ChartedBeatMap {
    /** Unique identifier for the audio source */
    audioId: string;

    /** Duration of the audio in seconds */
    duration: number;

    /** All beats with required keys assigned */
    beats: ChartedBeat[];

    /** Indices of beats that were originally detected from audio */
    detectedBeatIndices: number[];

    /** The downbeat configuration inherited from UnifiedBeatMap */
    downbeatConfig: DownbeatConfig;

    /** Quarter note interval in seconds (from UnifiedBeatMap) */
    quarterNoteInterval: number;

    /** Equivalent BPM (60 / quarterNoteInterval) */
    bpm: number;

    /** Chart metadata */
    chartMetadata: ChartMetadata;
}

// ============================================================================
// Conversion Options
// ============================================================================

/**
 * Options for converting a DifficultyVariant to ChartedBeatMap
 */
export interface ChartConversionOptions {
    /** The audio ID for the chart */
    audioId: string;

    /** Duration of the audio in seconds */
    duration: number;

    /** Quarter note interval in seconds */
    quarterNoteInterval: number;

    /** Downbeat configuration */
    downbeatConfig: DownbeatConfig;

    /** Map of beat index to required key (from ButtonMapper) */
    keyAssignments: Map<number, string>;

    /** Chart metadata */
    metadata: Partial<ChartMetadata>;
}

// ============================================================================
// Grid Type Mapping
// ============================================================================

/**
 * Maps procedural grid types to SubdivisionType
 *
 * @param gridType - The procedural grid type
 * @returns The corresponding SubdivisionType
 */
export function mapGridToSubdivision(gridType: string): SubdivisionType {
    const GRID_TO_SUBDIVISION: Record<string, SubdivisionType> = {
        'straight_16th': 'sixteenth',
        'triplet_8th': 'triplet8',
        'straight_8th': 'eighth',
        'quarter_triplet': 'triplet8',  // Quarter triplets treated same as eighth triplets
        'straight_4th': 'quarter',
        'quarter': 'quarter',
    };

    return GRID_TO_SUBDIVISION[gridType] ?? 'sixteenth';
}

/**
 * Calculate beatInMeasure from grid position
 *
 * @param parentBeatInMeasure - The parent quarter note's beatInMeasure value
 * @param gridPosition - Position within that quarter (0-3 for 16th, 0-2 for triplet)
 * @param gridType - The grid type
 * @returns Decimal beatInMeasure value
 */
export function calculateBeatInMeasure(
    parentBeatInMeasure: number,
    gridPosition: number,
    gridType: string
): number {
    // For straight 16th: Add 0.25 per position (0, 0.25, 0.5, 0.75)
    // For triplet 8th: Add 0.33 per position (0, 0.33, 0.67)
    // For straight 8th: Add 0.5 per position (0, 0.5)
    // For quarter triplet: Add 0.33 per position
    // For quarter: No offset

    let offset: number;

    switch (gridType) {
        case 'straight_16th':
            offset = gridPosition * 0.25;
            break;
        case 'triplet_8th':
        case 'quarter_triplet':
            offset = gridPosition * (1 / 3);
            break;
        case 'straight_8th':
            offset = gridPosition * 0.5;
            break;
        case 'quarter':
        default:
            offset = 0;
            break;
    }

    return parentBeatInMeasure + offset;
}

// ============================================================================
// BeatStream Compatibility
// ============================================================================

import type { BeatMap, BeatMapMetadata } from './BeatMap.js';

/**
 * Convert a ChartedBeatMap to a BeatMap for use with BeatStream
 *
 * This adapter function creates a BeatMap-compatible object from a ChartedBeatMap,
 * allowing procedurally generated charts to be used with the existing BeatStream
 * infrastructure.
 *
 * @param chartedBeatMap - The ChartedBeatMap to convert
 * @returns A BeatMap compatible with BeatStream
 *
 * @example
 * ```typescript
 * const chartedMap = beatConverter.convertToChartedBeatMap(variant, unifiedMap, keys, metadata);
 * const beatMap = chartedBeatMapToBeatMap(chartedMap);
 * const beatStream = new BeatStream(beatMap, audioContext);
 * ```
 */
export function chartedBeatMapToBeatMap(chartedBeatMap: ChartedBeatMap): BeatMap {
    // Create BeatMapMetadata from ChartMetadata
    const metadata: BeatMapMetadata = {
        version: chartedBeatMap.chartMetadata.seed ?? '1.0.0',
        algorithm: 'procedural-generation',
        minBpm: chartedBeatMap.bpm,
        maxBpm: chartedBeatMap.bpm,
        sensitivity: 1.0,
        filter: 0.0,
        noiseFloorThreshold: 0,
        hopSizeMs: 4,
        fftSize: 2048,
        dpAlpha: 680,
        melBands: 40,
        highPassCutoff: 0.4,
        gaussianSmoothMs: 20,
        tempoCenter: 0.5,
        tempoWidth: 1.4,
        useOctaveResolution: false,
        useTripleMeter: false,
        generatedAt: chartedBeatMap.chartMetadata.generatedAt,
    };

    return {
        audioId: chartedBeatMap.audioId,
        duration: chartedBeatMap.duration,
        beats: chartedBeatMap.beats, // ChartedBeat extends Beat, so this is compatible
        bpm: chartedBeatMap.bpm,
        metadata,
        downbeatConfig: chartedBeatMap.downbeatConfig,
    };
}
