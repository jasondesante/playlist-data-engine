/**
 * Beat Map Unification Utility
 *
 * Converts an InterpolatedBeatMap into a UnifiedBeatMap by flattening
 * detected + interpolated beats into a single unified list of quarter notes.
 * This is the foundation for the subdivision system.
 *
 * @example
 * ```typescript
 * const interpolator = new BeatInterpolator();
 * const interpolatedMap = interpolator.interpolate(beatMap);
 * const unifiedMap = unifyBeatMap(interpolatedMap);
 *
 * // All beats are now in a single array
 * console.log(unifiedMap.beats.length);
 *
 * // Detected beat indices for accent patterns
 * console.log(unifiedMap.detectedBeatIndices);
 * ```
 */

import type {
    InterpolatedBeatMap,
    UnifiedBeatMap,
    Beat,
    DownbeatConfig,
} from '../../../types/BeatMap.js';
import { DEFAULT_DOWNBEAT_CONFIG } from '../../../types/BeatMap.js';

/**
 * Convert an InterpolatedBeatMap to a UnifiedBeatMap
 *
 * This function flattens the merged beats (detected + interpolated) into a
 * single unified list, removing the source distinction while preserving
 * detected beat indices for accent pattern use.
 *
 * @param interpolatedBeatMap - The interpolated beat map to unify
 * @returns A unified beat map ready for subdivision
 */
export function unifyBeatMap(interpolatedBeatMap: InterpolatedBeatMap): UnifiedBeatMap {
    const { mergedBeats, interpolationMetadata, downbeatConfig } = interpolatedBeatMap;

    // Flatten mergedBeats to Beat[] and track detected indices
    const beats: Beat[] = [];
    const detectedBeatIndices: number[] = [];

    for (let i = 0; i < mergedBeats.length; i++) {
        const beatWithSource = mergedBeats[i];

        // Create a plain Beat (without source field)
        const beat: Beat = {
            timestamp: beatWithSource.timestamp,
            beatInMeasure: beatWithSource.beatInMeasure,
            isDownbeat: beatWithSource.isDownbeat,
            measureNumber: beatWithSource.measureNumber,
            intensity: beatWithSource.intensity,
            confidence: beatWithSource.confidence,
        };

        beats.push(beat);

        // Track detected beats
        if (beatWithSource.source === 'detected') {
            detectedBeatIndices.push(i);
        }
    }

    // Build the UnifiedBeatMap
    const unifiedBeatMap: UnifiedBeatMap = {
        audioId: interpolatedBeatMap.audioId,
        duration: interpolatedBeatMap.duration,
        beats,
        detectedBeatIndices,
        quarterNoteInterval: interpolatedBeatMap.quarterNoteInterval,
        quarterNoteBpm: interpolatedBeatMap.quarterNoteBpm,
        // Use the downbeatConfig from InterpolatedBeatMap, or default if not present
        downbeatConfig: downbeatConfig ?? DEFAULT_DOWNBEAT_CONFIG,
        // Extract tempoSections from InterpolationMetadata if available
        tempoSections: interpolationMetadata.tempoSections,
        originalMetadata: interpolatedBeatMap.originalMetadata,
    };

    return unifiedBeatMap;
}
