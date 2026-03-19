/**
 * Beat Key Helper Functions
 *
 * Utility functions for assigning and managing required keys on beat maps.
 * Used for rhythm game chart creation where specific keys must be pressed
 * for specific beats.
 *
 * @module beatKeyHelpers
 */

import type {
    Beat,
    BeatMap,
    InterpolatedBeatMap,
    UnifiedBeatMap,
    SubdividedBeat,
    SubdividedBeatMap,
} from '../../types/BeatMap.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Union type of all beat map types that support key assignment
 */
export type KeyAssignableBeatMap = BeatMap | InterpolatedBeatMap | UnifiedBeatMap | SubdividedBeatMap;

/**
 * Assignment for bulk key operations
 */
export interface KeyAssignment {
    /** Index of the beat to assign the key to */
    beatIndex: number;
    /** Key to assign (string to set, null to remove) */
    key: string | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the beats array from a beat map
 * Handles different beat map types that store beats in different properties
 *
 * @internal
 */
function getBeatsArray(beatMap: KeyAssignableBeatMap): Beat[] | SubdividedBeat[] {
    if ('mergedBeats' in beatMap) {
        // InterpolatedBeatMap uses mergedBeats for the combined array
        return beatMap.mergedBeats;
    }
    // BeatMap, UnifiedBeatMap, SubdividedBeatMap all use beats
    return beatMap.beats;
}

/**
 * Update the beats array in a beat map (immutable)
 *
 * @internal
 */
function updateBeatsArray<T extends KeyAssignableBeatMap>(
    beatMap: T,
    newBeats: Beat[] | SubdividedBeat[]
): T {
    if ('mergedBeats' in beatMap) {
        // InterpolatedBeatMap - update mergedBeats
        return {
            ...beatMap,
            mergedBeats: newBeats as Beat[],
        } as T;
    }
    // BeatMap, UnifiedBeatMap, SubdividedBeatMap - update beats
    return {
        ...beatMap,
        beats: newBeats,
    } as T;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Assign a required key to a single beat in a beat map
 *
 * Returns a new beat map with the updated beat (immutable operation).
 * Pass `null` as the key to remove an existing required key assignment.
 *
 * @param beatMap - The beat map to modify (BeatMap, InterpolatedBeatMap, UnifiedBeatMap, or SubdividedBeatMap)
 * @param beatIndex - Index of the beat to update
 * @param key - Key to assign (e.g., 'up', 'down', 'left', 'right') or null to remove
 * @returns New beat map with the updated beat
 * @throws Error if beatIndex is out of bounds
 *
 * @example
 * ```typescript
 * import { assignKeyToBeat } from 'playlist-data-engine';
 *
 * // Assign a key to a beat
 * const updatedMap = assignKeyToBeat(subdividedMap, 0, 'left');
 *
 * // Remove a key from a beat
 * const clearedMap = assignKeyToBeat(updatedMap, 0, null);
 * ```
 */
export function assignKeyToBeat<T extends KeyAssignableBeatMap>(
    beatMap: T,
    beatIndex: number,
    key: string | null
): T {
    const beats = getBeatsArray(beatMap);

    if (beatIndex < 0 || beatIndex >= beats.length) {
        throw new Error(
            `beatIndex ${beatIndex} is out of bounds (beats array length: ${beats.length})`
        );
    }

    const newBeats = beats.map((beat, index) => {
        if (index !== beatIndex) {
            return beat;
        }

        if (key === null) {
            // Remove the requiredKey property
            const { requiredKey: _, ...beatWithoutKey } = beat;
            return beatWithoutKey as typeof beat;
        }

        // Set the required key
        return {
            ...beat,
            requiredKey: key,
        };
    });

    return updateBeatsArray(beatMap, newBeats);
}

/**
 * Assign required keys to multiple beats in a single operation
 *
 * More efficient than calling assignKeyToBeat multiple times for bulk updates.
 * Useful for chart creation UI with "paint/brush" mode.
 *
 * @param beatMap - The beat map to modify
 * @param assignments - Array of key assignments to apply
 * @returns New beat map with all updates applied
 * @throws Error if any beatIndex is out of bounds
 *
 * @example
 * ```typescript
 * import { assignKeysToBeats } from 'playlist-data-engine';
 *
 * const chartMap = assignKeysToBeats(subdividedMap, [
 *     { beatIndex: 0, key: 'left' },
 *     { beatIndex: 1, key: 'down' },
 *     { beatIndex: 2, key: 'up' },
 *     { beatIndex: 3, key: 'right' },
 * ]);
 * ```
 */
export function assignKeysToBeats<T extends KeyAssignableBeatMap>(
    beatMap: T,
    assignments: KeyAssignment[]
): T {
    const beats = getBeatsArray(beatMap);
    const beatsLength = beats.length;

    // Validate all indices first
    for (const assignment of assignments) {
        if (assignment.beatIndex < 0 || assignment.beatIndex >= beatsLength) {
            throw new Error(
                `beatIndex ${assignment.beatIndex} is out of bounds (beats array length: ${beatsLength})`
            );
        }
    }

    // Create a map for quick lookup
    const assignmentMap = new Map<number, string | null>();
    for (const { beatIndex, key } of assignments) {
        assignmentMap.set(beatIndex, key);
    }

    // Update all beats in a single pass
    const newBeats = beats.map((beat, index) => {
        const key = assignmentMap.get(index);
        if (key === undefined) {
            // No assignment for this beat
            return beat;
        }

        if (key === null) {
            // Remove the requiredKey property
            const { requiredKey: _, ...beatWithoutKey } = beat;
            return beatWithoutKey as typeof beat;
        }

        // Set the required key
        return {
            ...beat,
            requiredKey: key,
        };
    });

    return updateBeatsArray(beatMap, newBeats);
}

/**
 * Extract a map of beat indices to required keys
 *
 * Returns a Map containing only the beats that have required keys assigned.
 * Useful for serialization, UI display, and debugging.
 *
 * @param beatMap - The beat map to extract keys from
 * @returns Map of beatIndex → requiredKey for beats with keys assigned
 *
 * @example
 * ```typescript
 * import { extractKeyMap } from 'playlist-data-engine';
 *
 * const keyMap = extractKeyMap(chartMap);
 *
 * // Iterate over assigned keys
 * for (const [beatIndex, key] of keyMap) {
 *     console.log(`Beat ${beatIndex}: ${key}`);
 * }
 *
 * // Check if any keys are assigned
 * if (keyMap.size === 0) {
 *     console.log('No keys assigned - not a chart');
 * }
 *
 * // Convert to plain object for JSON
 * const keyObject = Object.fromEntries(keyMap);
 * // { "0": "left", "1": "down", "2": "up" }
 * ```
 */
export function extractKeyMap(beatMap: KeyAssignableBeatMap): Map<number, string> {
    const beats = getBeatsArray(beatMap);
    const keyMap = new Map<number, string>();

    for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        if (beat.requiredKey !== undefined) {
            keyMap.set(i, beat.requiredKey);
        }
    }

    return keyMap;
}

/**
 * Remove all required key assignments from a beat map
 *
 * Returns a new beat map with all requiredKey properties removed.
 * Useful for resetting a chart back to a plain beat map.
 *
 * @param beatMap - The beat map to clear keys from
 * @returns New beat map with all keys removed
 *
 * @example
 * ```typescript
 * import { clearAllKeys } from 'playlist-data-engine';
 *
 * // Reset a chart to a plain beat map
 * const plainMap = clearAllKeys(chartMap);
 *
 * // Verify no keys remain
 * const keyMap = extractKeyMap(plainMap);
 * console.log(keyMap.size); // 0
 * ```
 */
export function clearAllKeys<T extends KeyAssignableBeatMap>(beatMap: T): T {
    const beats = getBeatsArray(beatMap);

    const newBeats = beats.map((beat) => {
        if (beat.requiredKey === undefined) {
            return beat;
        }

        const { requiredKey: _, ...beatWithoutKey } = beat;
        return beatWithoutKey as typeof beat;
    });

    return updateBeatsArray(beatMap, newBeats);
}

/**
 * Check if a beat map has any required keys assigned
 *
 * @param beatMap - The beat map to check
 * @returns true if any beat has a required key assigned
 *
 * @example
 * ```typescript
 * import { hasRequiredKeys } from 'playlist-data-engine';
 *
 * if (hasRequiredKeys(beatMap)) {
 *     console.log('This is a chart with key requirements');
 * } else {
 *     console.log('This is a plain beat map');
 * }
 * ```
 */
export function hasRequiredKeys(beatMap: KeyAssignableBeatMap): boolean {
    const beats = getBeatsArray(beatMap);
    return beats.some((beat) => beat.requiredKey !== undefined);
}

/**
 * Get the count of beats with required keys assigned
 *
 * @param beatMap - The beat map to count keys from
 * @returns Number of beats with required keys
 *
 * @example
 * ```typescript
 * import { getKeyCount } from 'playlist-data-engine';
 *
 * const keyCount = getKeyCount(chartMap);
 * console.log(`${keyCount} beats have key requirements`);
 * ```
 */
export function getKeyCount(beatMap: KeyAssignableBeatMap): number {
    const beats = getBeatsArray(beatMap);
    return beats.filter((beat) => beat.requiredKey !== undefined).length;
}

/**
 * Get all unique keys used in a beat map
 *
 * Useful for determining which input buttons are needed for gameplay.
 *
 * @param beatMap - The beat map to get keys from
 * @returns Array of unique key strings (sorted alphabetically)
 *
 * @example
 * ```typescript
 * import { getUsedKeys } from 'playlist-data-engine';
 *
 * const usedKeys = getUsedKeys(chartMap);
 * // ['down', 'left', 'right', 'up']
 *
 * // Set up game controls for only the needed keys
 * for (const key of usedKeys) {
 *     setupKeyHandler(key);
 * }
 * ```
 */
export function getUsedKeys(beatMap: KeyAssignableBeatMap): string[] {
    const beats = getBeatsArray(beatMap);
    const keySet = new Set<string>();

    for (const beat of beats) {
        if (beat.requiredKey !== undefined) {
            keySet.add(beat.requiredKey);
        }
    }

    return Array.from(keySet).sort();
}
