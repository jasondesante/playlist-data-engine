/**
 * Level Export Types
 *
 * Types for exporting and importing rhythm game levels in a format compatible
 * with the playlist-data-showcase app's import/export functionality.
 *
 * This format supports both:
 * - Procedurally generated levels (from LevelGenerator)
 * - Manually charted levels (from showcase app chart editor)
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 4.2
 */

import type { SubdivisionType, BeatSource } from './BeatMap.js';
import type { Band } from '../generation/RhythmGenerator.js';

// ============================================================================
// Chart Style Types
// ============================================================================

/**
 * Chart style determining key layout
 * - 'ddr': 4-key dance pad style (up, down, left, right)
 * - 'guitar': 5-fret guitar hero style (1, 2, 3, 4, 5)
 */
export type ChartStyle = 'ddr' | 'guitar' | 'tap';

// ============================================================================
// Detected Beat Types (for export)
// ============================================================================

/**
 * A detected beat in the full beat map export format
 */
export interface FullExportDetectedBeat {
    /** Timestamp in seconds */
    timestamp: number;

    /** Position within the measure */
    beatInMeasure: number;

    /** Whether this is a downbeat */
    isDownbeat: boolean;

    /** Measure number */
    measureNumber: number;

    /** Onset intensity (0-1) */
    intensity: number;

    /** Detection confidence (0-1) */
    confidence: number;

    /** Optional required key for rhythm game */
    requiredKey?: string;
}

// ============================================================================
// Merged Beat Types (for export)
// ============================================================================

/**
 * A merged beat (detected or interpolated) in the full beat map export format
 */
export interface FullExportMergedBeat {
    /** Timestamp in seconds */
    timestamp: number;

    /** Position within the measure */
    beatInMeasure: number;

    /** Whether this is a downbeat */
    isDownbeat: boolean;

    /** Measure number */
    measureNumber: number;

    /** Onset intensity (0-1) */
    intensity: number;

    /** Detection confidence (0-1) */
    confidence: number;

    /** Optional required key for rhythm game */
    requiredKey?: string;

    /** Whether this beat was detected or interpolated */
    source: BeatSource;

    /** Distance to nearest detected beat (for interpolated beats) */
    distanceToAnchor?: number;

    /** Timestamp of nearest detected beat (for interpolated beats) */
    nearestAnchorTimestamp?: number;
}

// ============================================================================
// Interpolated Metadata Types (for export)
// ============================================================================

/**
 * Metadata about the interpolation process
 */
export interface InterpolatedMetadataJSON {
    /** Quarter note interval in seconds */
    quarterNoteInterval: number;

    /** Quarter note BPM (60 / quarterNoteInterval) */
    quarterNoteBpm: number;

    /** Confidence of quarter note detection */
    quarterNoteConfidence: number;

    /** Total detected beats count */
    detectedBeatCount: number;

    /** Total merged beats count (detected + interpolated) */
    mergedBeatCount: number;
}

// ============================================================================
// Subdivision Types (for export)
// ============================================================================

/**
 * Subdivision configuration in JSON-serializable format
 */
export interface SubdivisionConfigJSON {
    /** Subdivision assignments as array of [beatIndex, subdivisionType] tuples */
    beatSubdivisions: [number, SubdivisionType][];

    /** Default subdivision for beats not in the array */
    defaultSubdivision: SubdivisionType;
}

/**
 * Metadata about the subdivision process
 */
export interface SubdivisionMetadataJSON {
    /** Original beat count before subdivision */
    originalBeatCount: number;

    /** Beat count after subdivision */
    subdividedBeatCount: number;

    /** Average density multiplier */
    averageDensityMultiplier: number;

    /** Number of explicitly subdivided beats */
    explicitBeatCount: number;
}

/**
 * A subdivided beat in the full beat map export format
 * Includes procedural extensions for procedurally generated levels
 */
export interface FullExportSubdividedBeat {
    /** Timestamp in seconds */
    timestamp: number;

    /** Position within the measure (decimal for subdivisions) */
    beatInMeasure: number;

    /** Whether this is a downbeat */
    isDownbeat: boolean;

    /** Measure number */
    measureNumber: number;

    /** Onset intensity (0-1) */
    intensity: number;

    /** Detection confidence (0-1) */
    confidence: number;

    /** Required key for this beat */
    requiredKey?: string;

    /** Whether this beat was originally detected */
    isDetected: boolean;

    /** Index of original beat in UnifiedBeatMap */
    originalBeatIndex?: number;

    /** The subdivision type that created this beat */
    subdivisionType: SubdivisionType;

    // === Procedural extensions (optional, only for procedurally generated levels) ===

    /** Index into the original quarter note (procedural only) */
    quarterNoteIndex?: number;

    /** Position within the quarter note (procedural only) */
    subdivisionPosition?: number;

    /** Which frequency band this beat originated from (procedural only) */
    sourceBand?: Band;

    /** Quantization error in milliseconds (procedural only) */
    quantizationError?: number;
}

/**
 * Complete subdivision data for export
 */
export interface SubdivisionExportData {
    /** Subdivision configuration */
    config: SubdivisionConfigJSON;

    /** Subdivided beats with keys assigned */
    beats: FullExportSubdividedBeat[];

    /** Subdivision metadata */
    metadata: SubdivisionMetadataJSON;
}

// ============================================================================
// Chart Types (for export)
// ============================================================================

/**
 * Chart metadata for export
 */
export interface ChartExportData {
    /** Chart style (ddr or guitar) */
    style: ChartStyle;

    /** Number of keys/frets used */
    keyCount: number;

    /** Array of keys used in this chart */
    usedKeys: string[];
}

// ============================================================================
// Procedural Generation Metadata
// ============================================================================

/**
 * Metadata specific to procedurally generated levels
 * Only present when generationSource is 'procedural'
 */
export interface ProceduralGenerationMetadata {
    /** Difficulty preset used */
    difficulty: string;

    /** Weight given to pitch analysis (0-1) */
    pitchInfluenceWeight: number;

    /** Button patterns used in generation */
    patternsUsed: string[];

    /** Controller mode used */
    controllerMode: 'ddr' | 'guitar_hero' | 'tap';

    /** Seed used for reproducibility */
    seed?: string;

    /** Generation timestamp */
    generatedAt: string;

    /** Direction statistics from melody contour analysis */
    directionStats?: {
        up: number;
        down: number;
        stable: number;
        none: number;
    };

    /** Interval statistics from melody contour analysis */
    intervalStats?: {
        unison: number;
        small: number;
        medium: number;
        large: number;
        very_large: number;
    };

    /** Rhythm metadata summary */
    rhythmMetadata?: {
        difficulty: string;
        bandsAnalyzed: Band[];
        transientsDetected: number;
        averageDensity: number;
    };
}

// ============================================================================
// Full Beat Map Export Data (Main Export Format)
// ============================================================================

/**
 * Complete beat map data for export/import
 *
 * This is the unified format that supports both:
 * - Procedurally generated levels (from LevelGenerator)
 * - Manually charted levels (from showcase app chart editor)
 *
 * The showcase app ignores extra fields, so procedural-specific fields
 * can be safely added without breaking compatibility.
 *
 * @example
 * ```typescript
 * // Export a generated level
 * const exportData = LevelSerializer.toExportData(generatedLevel);
 * const json = JSON.stringify(exportData);
 *
 * // Import a level
 * const data = JSON.parse(json) as FullBeatMapExportData;
 * const level = LevelSerializer.fromExportData(data);
 * ```
 */
export interface FullBeatMapExportData {
    // === Format identification ===

    /** Format version (always 1) */
    version: 1;

    /** Format identifier (always 'full-beatmap') */
    format: 'full-beatmap';

    // === Audio identification ===

    /** Unique identifier for the audio source */
    audioId: string;

    /** Optional audio title for display purposes */
    audioTitle?: string;

    // === Export metadata ===

    /** Unix timestamp when this level was exported */
    exportedAt: number;

    /** Duration of the audio in seconds */
    duration: number;

    // === Tempo information ===

    /** Quarter note BPM (60 / quarterNoteInterval) */
    quarterNoteBpm: number;

    /** Confidence of quarter note detection (0-1) */
    quarterNoteConfidence: number;

    // === Beat data ===

    /** Original detected beats from audio analysis */
    detectedBeats: FullExportDetectedBeat[];

    /** Merged beats (detected + interpolated) */
    mergedBeats: FullExportMergedBeat[];

    /** Metadata about the interpolation process */
    interpolatedMetadata: InterpolatedMetadataJSON;

    // === Subdivision with chart keys ===

    /** Subdivision data (null if no subdivision applied) */
    subdivision: SubdivisionExportData | null;

    // === Chart metadata ===

    /** Chart style and key information (null if no chart) */
    chart: ChartExportData | null;

    // === Track reference (optional, for song validation on import) ===

    /**
     * Identifies the song this level was created for.
     * Absent in v1 exports for backward compatibility.
     */
    trackReference?: TrackReference;

    // === Procedural extensions (optional, ignored by showcase app) ===

    /** Source of this level (manual or procedural) */
    generationSource?: 'manual' | 'procedural';

    /** Additional metadata for procedurally generated levels */
    generationMetadata?: ProceduralGenerationMetadata;
}

// ============================================================================
// Import Result Types
// ============================================================================

/**
 * Result of attempting to import a beat map
 */
export interface FullBeatMapImportResult {
    /** Whether the import was successful */
    success: boolean;

    /** The imported data if successful */
    data?: FullBeatMapExportData;

    /** Error message if import failed */
    error?: string;

    /** Validation warnings (non-fatal issues) */
    warnings?: string[];
}

// ============================================================================
// Track Reference Types
// ============================================================================

/**
 * Identifies the song that a level was created for.
 * Embedded in exported level files so the UI can validate the correct song
 * is selected on import and tell the user which playlist/track to switch to.
 */
export interface TrackReference {
    /** Arweave transaction ID of the playlist that contains this track */
    playlistTxId?: string;

    /** Display name of the playlist */
    playlistName?: string;

    /** Track ID (e.g. "ethereum-0xContract-1" or "AR-{tx_id}") */
    trackId: string;

    /** Unique instance ID for the game engine */
    trackUuid: string;

    /** 0-based index of the track within the playlist */
    trackIndex: number;

    /** Arweave transaction ID for the track's audio (only for AR tracks) */
    txId?: string;

    /** Track title */
    title: string;

    /** Track artist */
    artist: string;

    /** URL to the audio file */
    audioUrl: string;

    /** URL to the track's cover image (optional) */
    imageUrl?: string;

    /** Duration of the audio in seconds */
    duration: number;
}

/**
 * Result of validating whether the currently selected track matches the
 * track referenced in an imported level file.
 */
export interface TrackMatchResult {
    /** True when the current track is the one the level was built for */
    matches: boolean;

    /** Human-readable details about any mismatch (empty when matches is true) */
    mismatchDetails: string[];

    /** When mismatched, describes the track the user needs to switch to */
    requiredTrack?: {
        title: string;
        artist: string;
        playlistName?: string;
        trackIndex: number;
    };
}

/**
 * Validate whether the currently selected track matches the track reference
 * embedded in a level file.
 *
 * Matching strategy:
 * 1. Compare by `trackId` (exact)
 * 2. Fall back to `title + artist` (case-insensitive)
 *
 * @param levelTrackRef - The track reference from the imported level file
 * @param currentTrack - The track currently selected in the showcase app
 * @returns Match result with details about any mismatch
 */
export function validateTrackMatch(
    levelTrackRef: TrackReference,
    currentTrack: { id: string; title: string; artist: string; playlist_index: number; tx_id?: string },
): TrackMatchResult {
    const mismatchDetails: string[] = [];

    // Strategy 1: exact track ID match
    const idMatches = levelTrackRef.trackId === currentTrack.id;

    // Strategy 2: title + artist fuzzy match (case-insensitive, trimmed)
    const titleMatches = levelTrackRef.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase();
    const artistMatches = levelTrackRef.artist.trim().toLowerCase() === currentTrack.artist.trim().toLowerCase();

    if (idMatches || (titleMatches && artistMatches)) {
        return { matches: true, mismatchDetails: [] };
    }

    // Mismatch — build helpful details
    if (!idMatches) {
        mismatchDetails.push(`Track ID: expected "${levelTrackRef.trackId}", got "${currentTrack.id}"`);
    }
    if (!titleMatches) {
        mismatchDetails.push(`Title: expected "${levelTrackRef.title}", got "${currentTrack.title}"`);
    }
    if (!artistMatches) {
        mismatchDetails.push(`Artist: expected "${levelTrackRef.artist}", got "${currentTrack.artist}"`);
    }

    return {
        matches: false,
        mismatchDetails,
        requiredTrack: {
            title: levelTrackRef.title,
            artist: levelTrackRef.artist,
            playlistName: levelTrackRef.playlistName,
            trackIndex: levelTrackRef.trackIndex,
        },
    };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an unknown value is a valid FullBeatMapExportData
 */
export function isFullBeatMapExportData(value: unknown): value is FullBeatMapExportData {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;

    // Check required fields
    return (
        data.version === 1 &&
        data.format === 'full-beatmap' &&
        typeof data.audioId === 'string' &&
        typeof data.exportedAt === 'number' &&
        typeof data.duration === 'number' &&
        typeof data.quarterNoteBpm === 'number' &&
        typeof data.quarterNoteConfidence === 'number' &&
        Array.isArray(data.detectedBeats) &&
        Array.isArray(data.mergedBeats) &&
        typeof data.interpolatedMetadata === 'object'
    );
}

// ============================================================================
// Level Pack Export (Multi-Difficulty)
// ============================================================================

/**
 * A collection of difficulty levels for the same song, exported as a single file.
 *
 * Each difficulty is a full FullBeatMapExportData so it can be independently
 * deserialized. The pack-level trackReference applies to all difficulties.
 */
export interface LevelPackExport {
    /** Format version (always 1) */
    version: 1;

    /** Format identifier (always 'level-pack') */
    format: 'level-pack';

    /** Unix timestamp when this pack was exported */
    exportedAt: number;

    /** Track reference identifying the song (shared across all difficulties) */
    trackReference?: TrackReference;

    /** Per-difficulty level data. Keys that exist have generated levels. */
    difficulties: {
        natural?: FullBeatMapExportData;
        easy?: FullBeatMapExportData;
        medium?: FullBeatMapExportData;
        hard?: FullBeatMapExportData;
        custom?: FullBeatMapExportData;
    };
}

/**
 * Check if an unknown value is a valid LevelPackExport.
 */
export function isLevelPackExport(value: unknown): value is LevelPackExport {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const data = value as Record<string, unknown>;

    return (
        data.version === 1 &&
        data.format === 'level-pack' &&
        typeof data.exportedAt === 'number' &&
        data.difficulties !== null &&
        typeof data.difficulties === 'object' &&
        Object.keys(data.difficulties).some((key) => {
            const entry = (data.difficulties as Record<string, unknown>)[key];
            return entry !== null && entry !== undefined;
        })
    );
}
