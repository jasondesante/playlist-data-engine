/**
 * RhythmicBalancer - Enforces metric structure and downbeat anchoring
 *
 * A post-processing step that transforms the composite stream to ensure
 * rhythmic playability. Operates between CompositeStreamGenerator and
 * DifficultyVariantGenerator in the pipeline.
 *
 * Key operations:
 * - Shifts lone subdivision notes to downbeats
 * - Fills empty measures with a beat on beat 1
 * - Enforces downbeat proximity for upbeat notes
 *
 * Part of the Procedural Rhythm Generation pipeline - Rhythmic Balance
 */

import type { CompositeBeat, CompositeStream } from './CompositeStreamGenerator.js';
import type { UnifiedBeatMap, DownbeatSegment } from '../../types/BeatMap.js';
import type { ControllerMode } from '../../types/ButtonMapping.js';

// ============================================================================
// Balancer Action Type
// ============================================================================

/**
 * Describes what action the RhythmicBalancer took on a beat (if any).
 *
 * Used to tag beats in the balanced composite so the UI can visually
 * distinguish balancer-modified beats from naturally detected ones.
 */
export type BalancerAction =
    | 'none'               // Beat was not modified by the balancer
    | 'shifted_to_downbeat' // Lone offbeat note moved to the downbeat position
    | 'empty_measure_fill' // Beat added to fill an otherwise empty measure
    | 'proximity_shift';   // Upbeat note shifted to downbeat (no nearby downbeat)

/**
 * Summary statistics from the rhythmic balancing step.
 */
export interface BalanceStats {
    /** Number of lone offbeat notes shifted to downbeats */
    shiftedToDownbeat: number;
    /** Number of empty measures filled with a downbeat */
    emptyMeasuresFilled: number;
    /** Number of upbeat notes shifted due to missing nearby downbeat */
    proximityShifts: number;
    /** Total beats added by the balancer (filled measures only) */
    beatsAdded: number;
    /** Total beats modified by the balancer (shifts) */
    beatsShifted: number;
}

/**
 * Result of the balance() operation, including the balanced stream and stats.
 */
export interface BalanceResult {
    /** The balanced composite stream with tagged beats */
    composite: CompositeStream;
    /** Statistics about what the balancer did */
    stats: BalanceStats;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Strong beat emphasis mode for density reduction priority
 *
 * Determines which beats within a measure are considered "strong" for the
 * purpose of density reduction (which beats to keep vs remove).
 */
export type StrongBeatEmphasis = 'natural' | 'backbeat' | 'neutral';

/**
 * Configuration for rhythmic balancing
 *
 * Controls how the RhythmicBalancer enforces metric structure on the
 * composite stream before difficulty variants are generated.
 */
export interface RhythmicBalanceConfig {
    /**
     * Which beats are "strong" for density reduction priority.
     * Derives grouping from time signature automatically.
     *
     * - 'natural': Emphasize natural metric accents (e.g., 4/4 → beats 1, 3; 9/8 → beats 1, 4, 7)
     * - 'backbeat': Emphasize weak positions (e.g., 4/4 → beats 2, 4; 9/8 → beats 2, 3, 5, 6, 8, 9)
     * - 'neutral': No positional preference
     *
     * @default 'natural'
     */
    strongBeatEmphasis: StrongBeatEmphasis;

    /**
     * Max distance in quarter-note beats from an upbeat note to the nearest downbeat note.
     * 0 = same beat only, 1 = one beat, 1.5 = one beat (half-beat increments supported),
     * 4 = same measure.
     *
     * Supports whole beats and 0.5 increments. Intermediate fractional values are
     * rounded down to the nearest supported step (e.g., 1.7 behaves like 1.5).
     *
     * If an upbeat note has no downbeat within this range, it gets shifted to the
     * downbeat of its beat index.
     *
     * @default 2
     */
    downbeatProximityRange: number;

    /**
     * Whether to fill empty measures with a beat on beat 1 downbeat.
     *
     * Ensures every measure has at least one beat for rhythmic foundation.
     *
     * @default true
     */
    fillEmptyMeasures: boolean;

    /**
     * Intensity for beats added by the balancer.
     *
     * Lower than detected beats (typically 0.6-0.8) so they're removable
     * during density reduction if needed.
     *
     * @default 0.45
     */
    addedBeatIntensity: number;
}

/**
 * Default configuration for rhythmic balancing
 */
export const DEFAULT_RHYTHMIC_BALANCE_CONFIG: RhythmicBalanceConfig = {
    strongBeatEmphasis: 'natural',
    downbeatProximityRange: 2,
    fillEmptyMeasures: true,
    addedBeatIntensity: 0.45,
};

// ============================================================================
// Controller Mode Defaults
// ============================================================================

/**
 * Rhythmic balance defaults per controller mode.
 *
 * - **DDR**: Dancing-oriented — tight downbeat proximity, natural emphasis on 1 and 3.
 * - **Guitar Hero**: Fret-based — standard proximity, natural emphasis.
 * - **Tap**: Simple taps — tightest proximity, natural emphasis.
 */
const CONTROLLER_MODE_BALANCE_DEFAULTS: Record<ControllerMode, RhythmicBalanceConfig> = {
    ddr: {
        strongBeatEmphasis: 'natural',
        downbeatProximityRange: 1,
        fillEmptyMeasures: true,
        addedBeatIntensity: 0.45,
    },
    guitar_hero: {
        strongBeatEmphasis: 'natural',
        downbeatProximityRange: 2,
        fillEmptyMeasures: true,
        addedBeatIntensity: 0.45,
    },
    tap: {
        strongBeatEmphasis: 'natural',
        downbeatProximityRange: 1.5,
        fillEmptyMeasures: true,
        addedBeatIntensity: 0.45,
    },
};

/**
 * Get the default rhythmic balance config for a controller mode.
 *
 * @param controllerMode - The controller mode to get defaults for
 * @returns RhythmicBalanceConfig with mode-specific values
 */
export function getControllerModeBalanceDefaults(controllerMode: ControllerMode): RhythmicBalanceConfig {
    return { ...CONTROLLER_MODE_BALANCE_DEFAULTS[controllerMode] };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the metric group size based on time signature
 *
 * Simple meter (beatsPerMeasure not divisible by 3): groups of 2
 * Compound meter (beatsPerMeasure divisible by 3): groups of 3
 *
 * @param beatsPerMeasure - Number of beats per measure
 * @returns Group size (2 for simple, 3 for compound)
 */
export function getMetricGroupSize(beatsPerMeasure: number): number {
    return beatsPerMeasure % 3 === 0 ? 3 : 2;
}

/**
 * Check if a beat position is a metric strong beat within its group
 *
 * In simple meter (groups of 2): positions 0, 2, 4, ... are strong
 * In compound meter (groups of 3): positions 0, 3, 6, ... are strong
 *
 * @param beatInMeasure - Position within the measure (0-indexed)
 * @param groupSize - Metric group size (2 or 3)
 * @returns True if this is a strong beat position
 */
export function isMetricStrongBeat(beatInMeasure: number, groupSize: number): boolean {
    return beatInMeasure % groupSize === 0;
}

/**
 * Check if a beat position is a metric weak beat within its group
 *
 * In simple meter (groups of 2): positions 1, 3, 5, ... are weak
 * In compound meter (groups of 3): positions 1, 2, 4, 5, 7, 8, ... are weak
 *
 * @param beatInMeasure - Position within the measure (0-indexed)
 * @param groupSize - Metric group size (2 or 3)
 * @returns True if this is a weak beat position
 */
export function isMetricWeakBeat(beatInMeasure: number, groupSize: number): boolean {
    return beatInMeasure % groupSize !== 0;
}

/**
 * Find the active downbeat segment for a given beat index
 *
 * @param segments - Array of downbeat segments (must be ordered by startBeat)
 * @param beatIndex - The beat index to find the segment for
 * @returns The active segment for the given beat index
 */
export function findActiveSegment(
    segments: DownbeatSegment[],
    beatIndex: number
): DownbeatSegment {
    let activeSegment = segments[0];
    for (const segment of segments) {
        if (segment.startBeat <= beatIndex) {
            activeSegment = segment;
        } else {
            break;
        }
    }
    return activeSegment;
}

/**
 * Check if a beat should be considered "strong" based on the emphasis mode
 *
 * @param beatInMeasure - Position within the measure (0-indexed)
 * @param beatsPerMeasure - Number of beats per measure in this segment
 * @param emphasis - Strong beat emphasis mode
 * @returns True if this beat should be treated as strong
 */
export function isStrongBeatForEmphasis(
    beatInMeasure: number,
    beatsPerMeasure: number,
    emphasis: StrongBeatEmphasis
): boolean {
    if (emphasis === 'neutral') {
        return false;
    }

    const groupSize = getMetricGroupSize(beatsPerMeasure);

    if (emphasis === 'natural') {
        return isMetricStrongBeat(beatInMeasure, groupSize);
    } else {
        // backbeat
        return isMetricWeakBeat(beatInMeasure, groupSize);
    }
}

// ============================================================================
// RhythmicBalancer Class
// ============================================================================

/**
 * Balances a composite stream to enforce metric structure and downbeat anchoring
 *
 * Takes a CompositeStream and returns a new CompositeStream with improved
 * rhythmic foundation for players who can't read rhythm well.
 *
 * @example
 * ```typescript
 * const balancer = new RhythmicBalancer();
 * const balanced = balancer.balance(composite, unifiedBeatMap);
 *
 * // Every measure now has at least 1 beat
 * // Lone subdivision notes are shifted to downbeats
 * // Upbeat notes have a downbeat nearby
 * ```
 */
export class RhythmicBalancer {
    private config: RhythmicBalanceConfig;

    constructor(config: Partial<RhythmicBalanceConfig> = {}) {
        this.config = { ...DEFAULT_RHYTHMIC_BALANCE_CONFIG, ...config };
    }

    /**
     * Get the current configuration
     */
    getConfig(): RhythmicBalanceConfig {
        return { ...this.config };
    }

    /**
     * Balance a composite stream to enforce metric structure
     *
     * Processing order:
     * 1. shiftLoneSubdivisionNotes() - Move lone offbeat notes to downbeats
     * 2. fillEmptyMeasures() - Ensure every measure has a beat
     * 3. enforceDownbeatProximity() - Ensure upbeats have nearby downbeats
     *
     * Each modified beat is tagged with a `balancerAction` field so the UI
     * can visually distinguish balancer-modified beats from detected ones.
     *
     * @param composite - The composite stream to balance
     * @param unifiedBeatMap - The unified beat map with measure/position info
     * @returns A BalanceResult with the balanced composite and statistics
     */
    balance(
        composite: CompositeStream,
        unifiedBeatMap: UnifiedBeatMap
    ): BalanceResult {
        const stats: BalanceStats = {
            shiftedToDownbeat: 0,
            emptyMeasuresFilled: 0,
            proximityShifts: 0,
            beatsAdded: 0,
            beatsShifted: 0,
        };

        // Start with the original beats
        let beats = [...composite.beats];

        // Phase 1: Shift lone subdivision notes to downbeats
        beats = this.shiftLoneSubdivisionNotes(beats, unifiedBeatMap, stats);

        // Phase 2: Fill empty measures
        beats = this.fillEmptyMeasures(beats, unifiedBeatMap, stats);

        // Phase 3: Enforce downbeat proximity
        beats = this.enforceDownbeatProximity(beats, unifiedBeatMap, stats);

        // Sort by timestamp to ensure correct order
        beats.sort((a, b) => a.timestamp - b.timestamp);

        return {
            composite: {
                ...composite,
                beats,
                metadata: {
                    ...composite.metadata,
                    totalBeats: beats.length,
                },
            },
            stats,
        };
    }

    /**
     * Shift lone subdivision notes to downbeats
     *
     * For measures with exactly 1 beat where that beat is not on a downbeat,
     * move it to the downbeat position.
     *
     * @param beats - Current beats array
     * @param unifiedBeatMap - Unified beat map with measure info
     * @returns Updated beats array
     */
    private shiftLoneSubdivisionNotes(
        beats: CompositeBeat[],
        unifiedBeatMap: UnifiedBeatMap,
        stats: BalanceStats
    ): CompositeBeat[] {
        if (!unifiedBeatMap.downbeatConfig?.segments) {
            return beats;
        }

        // Group beats by measure
        const beatsByMeasure = new Map<number, CompositeBeat[]>();
        for (const beat of beats) {
            const beatInfo = unifiedBeatMap.beats[beat.beatIndex];
            if (beatInfo) {
                const measure = beatInfo.measureNumber;
                if (!beatsByMeasure.has(measure)) {
                    beatsByMeasure.set(measure, []);
                }
                beatsByMeasure.get(measure)!.push(beat);
            }
        }

        // Process measures with exactly 1 beat
        const shiftedBeats: CompositeBeat[] = [];

        for (const beat of beats) {
            const beatInfo = unifiedBeatMap.beats[beat.beatIndex];
            if (!beatInfo) {
                shiftedBeats.push(beat);
                continue;
            }

            const measure = beatInfo.measureNumber;
            const measureBeats = beatsByMeasure.get(measure) || [];

            // If this is the only beat in the measure and it's not on a downbeat
            if (measureBeats.length === 1 && beat.gridPosition !== 0) {
                const shiftedBeat: CompositeBeat = {
                    ...beat,
                    gridPosition: 0,
                    timestamp: unifiedBeatMap.beats[beat.beatIndex].timestamp,
                    balancerAction: 'shifted_to_downbeat',
                };
                shiftedBeats.push(shiftedBeat);
                stats.shiftedToDownbeat++;
                stats.beatsShifted++;
            } else {
                shiftedBeats.push(beat);
            }
        }

        return shiftedBeats;
    }

    /**
     * Fill empty measures with a beat on beat 1 downbeat
     *
     * @param beats - Current beats array
     * @param unifiedBeatMap - Unified beat map with measure info
     * @returns Updated beats array with added beats
     */
    private fillEmptyMeasures(
        beats: CompositeBeat[],
        unifiedBeatMap: UnifiedBeatMap,
        stats: BalanceStats
    ): CompositeBeat[] {
        if (!this.config.fillEmptyMeasures) {
            return beats;
        }

        if (!unifiedBeatMap.downbeatConfig?.segments) {
            return beats;
        }

        // Find measure range
        let minMeasure = Infinity;
        let maxMeasure = -Infinity;

        for (const beatInfo of unifiedBeatMap.beats) {
            minMeasure = Math.min(minMeasure, beatInfo.measureNumber);
            maxMeasure = Math.max(maxMeasure, beatInfo.measureNumber);
        }

        if (minMeasure === Infinity) {
            return beats;
        }

        // Group beats by measure
        const beatsByMeasure = new Map<number, CompositeBeat[]>();
        for (const beat of beats) {
            const beatInfo = unifiedBeatMap.beats[beat.beatIndex];
            if (beatInfo) {
                const measure = beatInfo.measureNumber;
                if (!beatsByMeasure.has(measure)) {
                    beatsByMeasure.set(measure, []);
                }
                beatsByMeasure.get(measure)!.push(beat);
            }
        }

        // Find existing beats' grid types for neighbor context
        const gridTypeByBeatIndex = new Map<number, typeof beats[0]['gridType']>();
        for (const beat of beats) {
            gridTypeByBeatIndex.set(beat.beatIndex, beat.gridType);
        }

        // Add beats for empty measures
        const addedBeats: CompositeBeat[] = [];

        for (let measure = minMeasure; measure <= maxMeasure; measure++) {
            const measureBeats = beatsByMeasure.get(measure) || [];

            if (measureBeats.length === 0) {
                // Find the downbeat beatIndex for this measure
                const downbeatBeatIndex = unifiedBeatMap.beats.findIndex(
                    b => b.measureNumber === measure && b.isDownbeat
                );

                if (downbeatBeatIndex >= 0) {
                    // Determine grid type from neighbor context
                    let gridType: typeof beats[0]['gridType'] = 'straight_8th';

                    // Look for nearby beats to inherit grid type
                    const searchRange = 8; // Look within 8 beat indices
                    for (let offset = 1; offset <= searchRange; offset++) {
                        const beforeIndex = downbeatBeatIndex - offset;
                        const afterIndex = downbeatBeatIndex + offset;

                        if (gridTypeByBeatIndex.has(beforeIndex)) {
                            gridType = gridTypeByBeatIndex.get(beforeIndex)!;
                            break;
                        }
                        if (gridTypeByBeatIndex.has(afterIndex)) {
                            gridType = gridTypeByBeatIndex.get(afterIndex)!;
                            break;
                        }
                    }

                    const newBeat: CompositeBeat = {
                        timestamp: unifiedBeatMap.beats[downbeatBeatIndex].timestamp,
                        beatIndex: downbeatBeatIndex,
                        gridPosition: 0,
                        gridType,
                        intensity: this.config.addedBeatIntensity,
                        band: 'mid',
                        sourceBand: 'mid',
                        balancerAction: 'empty_measure_fill',
                    };

                    addedBeats.push(newBeat);
                    stats.emptyMeasuresFilled++;
                    stats.beatsAdded++;
                }
            }
        }

        return [...beats, ...addedBeats];
    }

    /**
     * Enforce downbeat proximity for upbeat notes
     *
     * If an upbeat note has no downbeat within the configured range,
     * shift it to the downbeat of its beat index.
     *
     * @param beats - Current beats array
     * @param unifiedBeatMap - Unified beat map with measure info
     * @returns Updated beats array
     */
    private enforceDownbeatProximity(
        beats: CompositeBeat[],
        unifiedBeatMap: UnifiedBeatMap,
        stats: BalanceStats
    ): CompositeBeat[] {
        const range = this.config.downbeatProximityRange;

        if (range < 0) {
            return beats;
        }

        // Build a set of beat indices that have at least one downbeat
        const downbeatIndices = new Set<number>();
        for (const beat of beats) {
            if (beat.gridPosition === 0) {
                downbeatIndices.add(beat.beatIndex);
            }
        }

        // Process upbeat notes
        const result: CompositeBeat[] = [];

        for (const beat of beats) {
            // Downbeats are never shifted
            if (beat.gridPosition === 0) {
                result.push(beat);
                continue;
            }

            // Search for a downbeat in range.
            // Supports half-beat increments: range 1.5 checks offsets 0 and 1
            // (since ±2 would be distance 2, outside the 1.5 range).
            let hasDownbeatNearby = false;
            const maxOffset = Math.ceil(range);
            for (let offset = 0; offset <= maxOffset; offset++) {
                if (offset > range) break; // half-beat boundary
                if (offset === 0) {
                    if (downbeatIndices.has(beat.beatIndex)) {
                        hasDownbeatNearby = true;
                        break;
                    }
                } else {
                    if (
                        downbeatIndices.has(beat.beatIndex - offset) ||
                        downbeatIndices.has(beat.beatIndex + offset)
                    ) {
                        hasDownbeatNearby = true;
                        break;
                    }
                }
            }

            if (hasDownbeatNearby) {
                result.push(beat);
            } else {
                const shiftedBeat: CompositeBeat = {
                    ...beat,
                    gridPosition: 0,
                    timestamp: unifiedBeatMap.beats[beat.beatIndex]?.timestamp ?? beat.timestamp,
                    balancerAction: 'proximity_shift',
                };
                result.push(shiftedBeat);
                downbeatIndices.add(beat.beatIndex);
                stats.proximityShifts++;
                stats.beatsShifted++;
            }
        }

        return result;
    }
}
