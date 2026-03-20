/**
 * Melody Contour Analyzer
 *
 * Analyzes pitch data to extract melodic contour information for button mapping.
 * This is Phase 1.5 of the Pitch Detection & Button Mapping pipeline.
 *
 * ## What it does
 *
 * 1. **Pitch-to-Pitch Comparison**: Iterates through consecutive beats and compares
 *    their pitches to determine direction (up/down/stable/none) and interval distance.
 *
 * 2. **Interval Categorization**: Groups intervals into categories useful for button mapping:
 *    - unison: 0 semitones (same note)
 *    - small: 1-2 semitones (minor/major 2nd)
 *    - medium: 3-4 semitones (minor/major 3rd)
 *    - large: 5-7 semitones (4th, tritone, 5th)
 *    - very_large: 8+ semitones (6th, 7th, octave+)
 *
 * 3. **Melody Segment Detection**: Groups consecutive beats with the same direction
 *    into melody segments (e.g., ascending phrase, descending phrase).
 *
 * 4. **Contour Aggregation**: Calculates overall melody direction and range.
 *
 * @example
 * ```typescript
 * // After running PitchBeatLinker
 * const linker = new PitchBeatLinker();
 * const linkedAnalysis = linker.link(bandStreams, audioBuffer);
 *
 * // Analyze melody contour
 * const contourAnalyzer = new MelodyContourAnalyzer();
 * const contourResult = contourAnalyzer.analyze(linkedAnalysis);
 *
 * // Access direction and interval for each beat
 * for (const pitchAtBeat of contourResult.pitchByBeat) {
 *   console.log(`Beat ${pitchAtBeat.beatIndex}: direction=${pitchAtBeat.direction}, interval=${pitchAtBeat.intervalFromPrevious}`);
 * }
 *
 * // Access overall contour
 * console.log('Overall direction:', contourResult.melodyContour.direction);
 * console.log('Range:', contourResult.melodyContour.range);
 * ```
 */

import type {
    LinkedPitchAnalysis,
    PitchAtBeat,
    BandPitchAtBeat,
    PitchBandName,
} from '../generation/PitchBeatLinker.js';
import type {
    MelodyContour,
    MelodySegment,
    MelodyContourDirection,
} from './MultiBandPitchAnalyzer.js';

// Re-export types needed by button mapping
export type { MelodyContour, MelodySegment, MelodyContourDirection };

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Interval category for button mapping
 *
 * Used to determine button jump distances based on musical intervals.
 */
export type IntervalCategory = 'unison' | 'small' | 'medium' | 'large' | 'very_large';

/**
 * Direction of pitch change from previous beat
 */
export type PitchDirection = 'up' | 'down' | 'stable' | 'none';

/**
 * Direction statistics for melody contour metadata
 */
export interface DirectionStats {
    /** Count of ascending pitches */
    up: number;
    /** Count of descending pitches */
    down: number;
    /** Count of repeated pitches */
    stable: number;
    /** Count with no pitch detected or no previous pitch */
    none: number;
}

/**
 * Interval statistics for melody contour metadata
 */
export interface IntervalStats {
    /** 0 semitones */
    unison: number;
    /** 1-2 semitones (minor/major 2nd) */
    small: number;
    /** 3-4 semitones (minor/major 3rd) */
    medium: number;
    /** 5-7 semitones (4th, tritone, 5th) */
    large: number;
    /** 8+ semitones (6th, 7th, octave+) */
    very_large: number;
}

/**
 * Result of melody contour analysis
 */
export interface MelodyContourAnalysisResult {
    /** Updated pitch-by-beat with direction and interval populated */
    pitchByBeat: PitchAtBeat[];

    /** Band pitch analyses with updated direction/interval info */
    bandPitches: Map<PitchBandName, BandPitchAtBeat>;

    /** Melody contour from the dominant band */
    melodyContour: MelodyContour;

    /** Band with the best pitch results */
    dominantBand: PitchBandName;

    /** Direction statistics */
    directionStats: DirectionStats;

    /** Interval statistics */
    intervalStats: IntervalStats;

    /** Analysis metadata */
    metadata: {
        /** Total beats analyzed */
        totalBeats: number;
        /** Beats with voiced pitch */
        voicedBeats: number;
        /** Beats with direction calculated */
        directionCalculatedBeats: number;
    };
}

/**
 * Configuration for MelodyContourAnalyzer
 */
export interface MelodyContourAnalyzerConfig {
    /** Maximum time gap (in seconds) between beats to consider them consecutive (default: 0.5) */
    maxTimeGapForConsecutive?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default configuration for MelodyContourAnalyzer */
const DEFAULT_CONFIG: Required<MelodyContourAnalyzerConfig> = {
    maxTimeGapForConsecutive: 0.5,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Categorize an interval in semitones
 *
 * @param semitones - Number of semitones (absolute value)
 * @returns Interval category
 */
export function categorizeInterval(semitones: number): IntervalCategory {
    if (semitones === 0) return 'unison';
    if (semitones <= 2) return 'small';
    if (semitones <= 4) return 'medium';
    if (semitones <= 7) return 'large';
    return 'very_large';
}

/**
 * Calculate the number of semitones between two MIDI notes
 *
 * @param midi1 - First MIDI note number
 * @param midi2 - Second MIDI note number
 * @returns Absolute difference in semitones
 */
export function calculateIntervalSemitones(midi1: number, midi2: number): number {
    return Math.abs(midi1 - midi2);
}

/**
 * Determine the direction between two MIDI notes
 *
 * @param currentMidi - Current MIDI note
 * @param previousMidi - Previous MIDI note
 * @returns Direction (up, down, stable, or none if invalid)
 */
export function determineDirection(currentMidi: number | null, previousMidi: number | null): PitchDirection {
    if (currentMidi === null || previousMidi === null) {
        return 'none';
    }

    if (currentMidi > previousMidi) {
        return 'up';
    } else if (currentMidi < previousMidi) {
        return 'down';
    } else {
        return 'stable';
    }
}

/**
 * Determine overall contour direction from segments
 *
 * @param segments - Melody segments
 * @returns Overall contour direction
 */
export function determineOverallDirection(segments: MelodySegment[]): MelodyContourDirection {
    if (segments.length === 0) {
        return 'stable';
    }

    let upCount = 0;
    let downCount = 0;
    let stableCount = 0;

    for (const segment of segments) {
        if (segment.direction === 'up') upCount++;
        else if (segment.direction === 'down') downCount++;
        else stableCount++;
    }

    // Calculate net direction
    const netDirection = upCount - downCount;

    // Threshold for "mixed" - if up and down are within 20% of each other
    const total = upCount + downCount + stableCount;
    const threshold = total * 0.2;

    if (Math.abs(netDirection) <= threshold) {
        return 'mixed';
    }

    if (upCount > downCount) {
        return 'ascending';
    } else if (downCount > upCount) {
        return 'descending';
    } else {
        return 'stable';
    }
}

/**
 * Convert MIDI note number to note name
 *
 * @param midi - MIDI note number
 * @returns Note name (e.g., "C4", "F#5")
 */
export function midiToNoteName(midi: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${noteNames[noteIndex]}${octave}`;
}

// ============================================================================
// MelodyContourAnalyzer Class
// ============================================================================

/**
 * Melody Contour Analyzer
 *
 * Analyzes pitch data to extract melodic contour information for button mapping.
 *
 * This class performs Phase 1.5 of the pitch detection pipeline:
 * - Pitch-to-pitch comparison to calculate direction and interval
 * - Segment detection for melody phrases
 * - Contour aggregation for overall melody shape
 */
export class MelodyContourAnalyzer {
    private config: Required<MelodyContourAnalyzerConfig>;

    /**
     * Create a new MelodyContourAnalyzer
     *
     * @param config - Configuration options
     */
    constructor(config: MelodyContourAnalyzerConfig = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    /**
     * Get the current configuration
     */
    getConfig(): Required<MelodyContourAnalyzerConfig> {
        return { ...this.config };
    }

    /**
     * Analyze linked pitch data to extract melody contour
     *
     * This method:
     * 1. Iterates through each band stream's pitches
     * 2. Compares consecutive pitches to calculate direction and interval
     * 3. Creates melody segments for phrases
     * 4. Calculates overall contour direction and range
     *
     * @param linkedAnalysis - The linked pitch analysis from PitchBeatLinker
     * @returns Melody contour analysis result with populated direction/interval
     */
    analyze(linkedAnalysis: LinkedPitchAnalysis): MelodyContourAnalysisResult {
        // Process each band stream
        const updatedBandPitches = new Map<PitchBandName, BandPitchAtBeat>();
        const allPitchByBeat: PitchAtBeat[] = [];

        for (const [bandName, bandResult] of linkedAnalysis.bandPitches) {
            const updatedPitches = this.analyzeBandPitches(bandResult.pitches);
            updatedBandPitches.set(bandName, {
                ...bandResult,
                pitches: updatedPitches,
            });
            allPitchByBeat.push(...updatedPitches);
        }

        // Sort all pitches by timestamp
        allPitchByBeat.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate statistics
        const { directionStats, intervalStats, metadata } = this.calculateStatistics(allPitchByBeat);

        // Build melody contour from dominant band
        const dominantBandPitches = updatedBandPitches.get(linkedAnalysis.dominantBand);
        const melodyContour = this.buildMelodyContour(
            dominantBandPitches?.pitches ?? []
        );

        return {
            pitchByBeat: allPitchByBeat,
            bandPitches: updatedBandPitches,
            melodyContour,
            dominantBand: linkedAnalysis.dominantBand,
            directionStats,
            intervalStats,
            metadata,
        };
    }

    /**
     * Analyze pitch-to-pitch comparison for a single band's pitches
     *
     * @param pitches - Array of pitch-at-beat for this band
     * @returns Updated array with direction and interval populated
     */
    private analyzeBandPitches(pitches: PitchAtBeat[]): PitchAtBeat[] {
        if (pitches.length === 0) {
            return [];
        }

        const result: PitchAtBeat[] = [];

        for (let i = 0; i < pitches.length; i++) {
            const current = pitches[i];
            const previous = i > 0 ? pitches[i - 1] : null;

            // Check if beats are consecutive (within time gap threshold)
            const isConsecutive = previous !== null &&
                (current.timestamp - previous.timestamp) <= this.config.maxTimeGapForConsecutive;

            let direction: PitchDirection;
            let intervalFromPrevious: number;
            let intervalCategory: IntervalCategory;

            if (!isConsecutive || !previous || !previous.pitch || !current.pitch) {
                // No previous pitch or not consecutive
                direction = 'none';
                intervalFromPrevious = 0;
                intervalCategory = 'unison';
            } else {
                // Both have pitch - calculate direction and interval
                const currentMidi = current.pitch.midiNote;
                const previousMidi = previous.pitch.midiNote;

                if (currentMidi === null || previousMidi === null) {
                    direction = 'none';
                    intervalFromPrevious = 0;
                    intervalCategory = 'unison';
                } else {
                    direction = determineDirection(currentMidi, previousMidi);
                    intervalFromPrevious = calculateIntervalSemitones(currentMidi, previousMidi);
                    intervalCategory = categorizeInterval(intervalFromPrevious);
                }
            }

            result.push({
                ...current,
                direction,
                intervalFromPrevious,
                intervalCategory,
            });
        }

        return result;
    }

    /**
     * Build melody contour from a band's pitches
     *
     * @param pitches - Array of pitch-at-beat with direction populated
     * @returns Melody contour with segments and overall direction
     */
    private buildMelodyContour(pitches: PitchAtBeat[]): MelodyContour {
        // Get voiced pitches only
        const voicedPitches = pitches.filter(p => p.pitch?.isVoiced);

        if (voicedPitches.length === 0) {
            return {
                segments: [],
                direction: 'stable',
                range: {
                    minNote: 'N/A',
                    maxNote: 'N/A',
                    semitones: 0,
                },
            };
        }

        // Calculate range
        const midiNotes = voicedPitches
            .map(p => p.pitch?.midiNote)
            .filter((m): m is number => m !== null);

        if (midiNotes.length === 0) {
            return {
                segments: [],
                direction: 'stable',
                range: {
                    minNote: 'N/A',
                    maxNote: 'N/A',
                    semitones: 0,
                },
            };
        }

        const minMidi = Math.min(...midiNotes);
        const maxMidi = Math.max(...midiNotes);

        const minNote = midiToNoteName(minMidi);
        const maxNote = midiToNoteName(maxMidi);

        // Build segments
        const segments = this.buildSegments(voicedPitches);

        // Determine overall direction
        const overallDirection = determineOverallDirection(segments);

        return {
            segments,
            direction: overallDirection,
            range: {
                minNote,
                maxNote,
                semitones: maxMidi - minMidi,
            },
        };
    }

    /**
     * Build melody segments from voiced pitches
     *
     * Groups consecutive beats with the same direction into segments.
     *
     * @param pitches - Voiced pitches with direction populated
     * @returns Array of melody segments
     */
    private buildSegments(pitches: PitchAtBeat[]): MelodySegment[] {
        if (pitches.length === 0) {
            return [];
        }

        const segments: MelodySegment[] = [];
        let currentSegment: {
            startTime: number;
            endTime: number;
            startPitch: string;
            endPitch: string;
            direction: 'up' | 'down' | 'stable';
            startMidi: number;
            endMidi: number;
        } | null = null;

        for (const pitch of pitches) {
            const direction = pitch.direction;

            // Skip 'none' direction (no previous pitch)
            if (direction === 'none') {
                // Finalize current segment if exists
                if (currentSegment) {
                    segments.push({
                        startTime: currentSegment.startTime,
                        endTime: currentSegment.endTime,
                        startPitch: currentSegment.startPitch,
                        endPitch: currentSegment.endPitch,
                        direction: currentSegment.direction,
                        interval: Math.abs(currentSegment.endMidi - currentSegment.startMidi),
                    });
                    currentSegment = null;
                }
                continue;
            }

            // Start new segment if direction changed or no current segment
            if (!currentSegment || currentSegment.direction !== direction) {
                // Finalize previous segment
                if (currentSegment) {
                    segments.push({
                        startTime: currentSegment.startTime,
                        endTime: currentSegment.endTime,
                        startPitch: currentSegment.startPitch,
                        endPitch: currentSegment.endPitch,
                        direction: currentSegment.direction,
                        interval: Math.abs(currentSegment.endMidi - currentSegment.startMidi),
                    });
                }

                // Start new segment
                const startPitch = pitch.pitch?.noteName ?? 'N/A';
                const startMidi = pitch.pitch?.midiNote ?? 60;

                currentSegment = {
                    startTime: pitch.timestamp,
                    endTime: pitch.timestamp,
                    startPitch,
                    endPitch: startPitch,
                    direction,
                    startMidi,
                    endMidi: startMidi,
                };
            } else {
                // Continue current segment
                const endMidi = pitch.pitch?.midiNote ?? currentSegment.endMidi;
                const endPitch = pitch.pitch?.noteName ?? currentSegment.endPitch;

                currentSegment.endTime = pitch.timestamp;
                currentSegment.endPitch = endPitch;
                currentSegment.endMidi = endMidi;
            }
        }

        // Finalize last segment
        if (currentSegment) {
            segments.push({
                startTime: currentSegment.startTime,
                endTime: currentSegment.endTime,
                startPitch: currentSegment.startPitch,
                endPitch: currentSegment.endPitch,
                direction: currentSegment.direction,
                interval: Math.abs(currentSegment.endMidi - currentSegment.startMidi),
            });
        }

        return segments;
    }

    /**
     * Calculate direction and interval statistics
     *
     * @param pitches - All pitches with direction and interval populated
     * @returns Statistics and metadata
     */
    private calculateStatistics(pitches: PitchAtBeat[]): {
        directionStats: DirectionStats;
        intervalStats: IntervalStats;
        metadata: MelodyContourAnalysisResult['metadata'];
    } {
        const directionStats: DirectionStats = {
            up: 0,
            down: 0,
            stable: 0,
            none: 0,
        };

        const intervalStats: IntervalStats = {
            unison: 0,
            small: 0,
            medium: 0,
            large: 0,
            very_large: 0,
        };

        let voicedBeats = 0;
        let directionCalculatedBeats = 0;

        for (const pitch of pitches) {
            // Count voiced beats
            if (pitch.pitch?.isVoiced) {
                voicedBeats++;
            }

            // Count directions
            directionStats[pitch.direction]++;

            // Count direction-calculated beats (not 'none')
            if (pitch.direction !== 'none') {
                directionCalculatedBeats++;
            }

            // Count intervals
            if (pitch.intervalCategory) {
                intervalStats[pitch.intervalCategory]++;
            }
        }

        return {
            directionStats,
            intervalStats,
            metadata: {
                totalBeats: pitches.length,
                voicedBeats,
                directionCalculatedBeats,
            },
        };
    }
}
