/**
 * Beat Map Subdivision Convenience Function
 *
 * A one-step function that takes an InterpolatedBeatMap and SubdivisionConfig,
 * unifies the beat map, and returns a SubdividedBeatMap.
 *
 * This is a convenience wrapper around `unifyBeatMap()` + `BeatSubdivider.subdivide()`.
 *
 * @example
 * ```typescript
 * const interpolator = new BeatInterpolator();
 * const interpolatedMap = interpolator.interpolate(beatMap);
 *
 * // One-step subdivision
 * const subdividedMap = subdivideBeatMap(interpolatedMap, {
 *   segments: [
 *     { startBeat: 0, subdivision: 'quarter' },
 *     { startBeat: 32, subdivision: 'eighth' },
 *   ],
 * });
 * ```
 */

import type {
    InterpolatedBeatMap,
    SubdividedBeatMap,
    SubdivisionConfig,
} from '../../../types/BeatMap.js';
import { DEFAULT_SUBDIVISION_CONFIG } from '../../../types/BeatMap.js';
import { BeatSubdivider, type BeatSubdividerOptions } from '../BeatSubdivider.js';
import { unifyBeatMap } from './unifyBeatMap.js';

/**
 * Subdivide an interpolated beat map with a single function call
 *
 * This convenience function combines the unification and subdivision steps:
 * 1. Converts InterpolatedBeatMap to UnifiedBeatMap
 * 2. Applies the subdivision configuration
 * 3. Returns the final SubdividedBeatMap
 *
 * @param interpolatedBeatMap - The interpolated beat map to subdivide
 * @param config - Optional subdivision configuration (defaults to quarter notes)
 * @param options - Optional BeatSubdivider options
 * @returns A subdivided beat map
 *
 * @example
 * ```typescript
 * // Basic usage with default config (quarter notes)
 * const subdividedMap = subdivideBeatMap(interpolatedMap);
 *
 * // With custom subdivision config
 * const subdividedMap = subdivideBeatMap(interpolatedMap, {
 *   segments: [
 *     { startBeat: 0, subdivision: 'quarter' },
 *     { startBeat: 32, subdivision: 'eighth' },
 *   ],
 * });
 *
 * // With subdivider options
 * const subdividedMap = subdivideBeatMap(interpolatedMap, config, {
 *   tolerance: 0.03,
 *   defaultIntensity: 0.6,
 * });
 * ```
 */
export function subdivideBeatMap(
    interpolatedBeatMap: InterpolatedBeatMap,
    config: SubdivisionConfig = DEFAULT_SUBDIVISION_CONFIG,
    options?: BeatSubdividerOptions
): SubdividedBeatMap {
    // Step 1: Unify the interpolated beat map
    const unifiedMap = unifyBeatMap(interpolatedBeatMap);

    // Step 2: Create a subdivider and apply subdivision
    const subdivider = new BeatSubdivider(options);
    const subdividedMap = subdivider.subdivide(unifiedMap, config);

    return subdividedMap;
}
