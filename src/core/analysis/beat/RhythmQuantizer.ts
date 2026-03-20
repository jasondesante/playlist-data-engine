/**
 * Rhythm Quantizer for Procedural Rhythm Generation
 *
 * Translates raw transients into quantized rhythmic subdivisions that align with the beat map grid.
 *
 * Part of the Procedural Rhythm Generation pipeline.
 *
 * @example
 * ```typescript
 * // Basic usage - quantize transients to beat grid
 * const quantizer = new RhythmQuantizer();
 * const result = quantizer.quantize(transientAnalysis, unifiedBeatMap);
 *
 * // Access quantized streams for each band
 * const lowBandBeats = result.streams.low.beats;
 * const midBandBeats = result.streams.mid.beats;
 * const highBandBeats = result.streams.high.beats;
 *
 * // Check grid decisions (16th vs triplet) for each beat
 * for (const decision of result.streams.low.gridDecisions) {
 *   console.log(`Beat ${decision.beatIndex}: ${decision.selectedGrid} (confidence: ${decision.confidence.toFixed(2)})`);
 * }
 *
 * // Custom configuration with intensity filtering
 * const customQuantizer = new RhythmQuantizer({
 *   minimumTransientIntensity: 0.3, // Filter weak transients
 *   densityValidation: {
 *     maxRetries: 3,
 *     baseSensitivityReduction: 0.1,
 *   },
 * });
 * ```
 */

import type { TransientResult, TransientAnalysis } from './TransientDetector.js';
import type { UnifiedBeatMap, Beat } from '../../types/BeatMap.js';
import type { FrequencyBand } from './utils/audioUtils.js';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for density validation
 */
export interface DensityValidationConfig {
    /** Maximum number of retries for sensitivity adjustment (default: 3) */
    maxRetries: number;

    /** Base sensitivity reduction amount per retry (default: 0.1) */
    baseSensitivityReduction: number;

    /** Maximum cumulative sensitivity reduction (default: 0.7) */
    maxCumulativeReduction: number;
}

/**
 * Internal state for tracking retries during quantization
 */
interface RetryState {
    /** Current retry count (0 = first attempt) */
    retryCount: number;

    /** Cumulative sensitivity reduction applied */
    sensitivityReduction: number;

    /** Current intensity threshold (base + sensitivity reduction) */
    currentIntensityThreshold: number;

    /** Transients filtered out by intensity filtering */
    transientsFilteredByIntensity: number;
}

/**
 * Configuration for the RhythmQuantizer
 */
export interface QuantizationConfig {
    /** Density validation configuration */
    densityValidation?: DensityValidationConfig;

    /** Minimum transient intensity to include (0.0 = catch all, default: 0.0) */
    minimumTransientIntensity: number;

    /** Custom frequency bands (default: FREQUENCY_BANDS from audioUtils) */
    bands?: FrequencyBand[];
}

/**
 * Filtered transients result
 */
interface FilteredTransients {
    /** Transients that passed the intensity filter */
    transients: TransientResult[];
    /** Number of transients filtered out */
    totalFiltered: number;
}

/**
 * Complete Phase 1 output - all 3 band streams plus metadata
 */
export interface QuantizedBandStreams {
    streams: {
        low: GeneratedRhythmMap;
        mid: GeneratedRhythmMap;
        high: GeneratedRhythmMap;
    };
    metadata: {
        densityValidation: DensityValidationResult;
        transientsFilteredByIntensity: number;
    };
}

// ============================================================================
// Density Validation Result
// ============================================================================

/**
 * Result of density validation
 */
export interface DensityValidationResult {
    /** Whether the density is valid */
    isValid: boolean;

    /** Smallest gap between transients (seconds) */
    minIntervalDetected: number;

    /** Required minimum interval (16th note duration at current tempo) */
    requiredMinInterval: number;

    /** Number of retries attempted */
    retryCount: number;

    /** Cumulative sensitivity reduction applied */
    sensitivityReduction: number;
}

// ============================================================================
// Grid Types
// ============================================================================

/**
 * Grid type for a beat
 */
export type GridType = 'straight_16th' | 'triplet_8th';

/**
 * Grid decision metadata (produced during grid detection)
 */
export interface GridDecision {
    /** Index into UnifiedBeatMap.beats[] */
    beatIndex: number;

    /** Selected grid type for this beat */
    selectedGrid: GridType;

    /** Average ms offset from straight 16th grid */
    straightAvgOffset: number;

    /** Average ms offset from triplet grid */
    tripletAvgOffset: number;

    /** Number of transients in this beat */
    transientCount: number;

    /** How much better the chosen grid fits */
    confidence: number;
}

// ============================================================================
// Quantized Beat types
// ============================================================================

/**
 * A single quantized note
 */
export interface GeneratedBeat {
    /** Quantized time in seconds */
    timestamp: number;

    /** Index into UnifiedBeatMap.beats[] - which quarter note this belongs to */
    beatIndex: number;

    /** Position within that beat (0-3 for 16th, 0-2 for triplet) */
    gridPosition: number;

    /** Grid type for this beat */
    gridType: GridType;

    /** Transient strength (0.0 - 1.0) */
    intensity: number;

    /** Frequency band */
    band: 'low' | 'mid' | 'high';

    /** How far it was moved from original (ms), for debugging */
    quantizationError?: number;
}

 // ============================================================================
// Rhythm Map types
// ============================================================================

/**
 * Per-band rhythm map - a complete rhythm chart for one frequency band
 */
export interface GeneratedRhythmMap {
    /** Unique identifier for the audio source */
    audioId: string;

    /** Duration in seconds */
    duration: number;

    /** All quantized beats for this band */
    beats: GeneratedBeat[];

    /** Per-beat grid choices (16th vs triplet) */
    gridDecisions: GridDecision[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_QUANTIZATION_CONFIG: Required<QuantizationConfig> = {
    densityValidation: {
        maxRetries: 3,
        baseSensitivityReduction: 0.1,
        maxCumulativeReduction: 0.7,
    },
    minimumTransientIntensity: 0.0,
    bands: [] as FrequencyBand[], // Will use FREQUENCY_BANDS from audioUtils
};

// ============================================================================
// RhythmQuantizer Class
// ============================================================================

/**
 * Multi-Band Rhythm Quantizer
 *
 * Translates raw transients into quantized rhythmic subdivisions that align with the beat map grid.
 *
 * ## Overview
 *
 * The quantization process consists of three main phases:
 *
 * 1. **Density Validation**: Checks if transients are too dense (closer than 16th note interval)
 *    - If too dense, triggers sensitivity adjustment with retry logic
 *    - Uses exponential backoff for sensitivity reduction
 *
 * 2. **Intensity Filtering**: Removes transients below the minimum intensity threshold
 *
 * 3. **Grid Detection & Quantization**: For each beat, determines whether transients fit better
 *    on a straight 16th note grid or an 8th note triplet grid, then quantizes to the chosen grid.
 *
 * ## Usage
 *
 * ```typescript
 * const quantizer = new RhythmQuantizer({
 *   minimumTransientIntensity: 0.3
 * });
 * const result = quantizer.quantize(transientAnalysis, unifiedBeatMap);
 *
 * // Access per-band streams
 * const lowStream = result.streams.low;
 * const midStream = result.streams.mid;
 * const highStream = result.streams.high;
 * ```
 */
export class RhythmQuantizer {
    private config: Required<QuantizationConfig>;

    /**
     * Create a new RhythmQuantizer
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: Partial<QuantizationConfig> = {}) {
        this.config = {
            densityValidation: {
                maxRetries: config.densityValidation?.maxRetries ?? DEFAULT_QUANTIZATION_CONFIG.densityValidation.maxRetries,
                baseSensitivityReduction: config.densityValidation?.baseSensitivityReduction ?? DEFAULT_QUANTIZATION_CONFIG.densityValidation.baseSensitivityReduction,
                maxCumulativeReduction: config.densityValidation?.maxCumulativeReduction ?? DEFAULT_QUANTIZATION_CONFIG.densityValidation.maxCumulativeReduction,
            },
            minimumTransientIntensity: config.minimumTransientIntensity ?? DEFAULT_QUANTIZATION_CONFIG.minimumTransientIntensity,
            bands: config.bands ?? DEFAULT_QUANTIZATION_CONFIG.bands,
        };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<QuantizationConfig> {
        return { ...this.config };
    }

    /**
     * Quantize transients into rhythm streams
     *
     * Implements retry logic with exponential backoff for density validation:
     * - Retry 1: Sensitivity reduction = base (0.1)
     * - Retry 2: Sensitivity reduction = 2x base (0.2)
     * - Retry 3: Sensitivity reduction = 4x base (0.4)
     * - After max retries, proceeds with warning
     *
     * @param transientAnalysis - Transient analysis from TransientDetector
     * @param unifiedBeatMap - Unified beat map to quantize against
     * @returns Quantized band streams
     */
    quantize(
        transientAnalysis: TransientAnalysis,
        unifiedBeatMap: UnifiedBeatMap
    ): QuantizedBandStreams {
        const maxRetries = this.config.densityValidation.maxRetries;
        const baseReduction = this.config.densityValidation.baseSensitivityReduction;
        const maxCumulative = this.config.densityValidation.maxCumulativeReduction;

        // Step 1: Apply initial intensity filtering if configured
        let initialFilteredCount = 0;
        let currentTransients = transientAnalysis.transients;

        if (this.config.minimumTransientIntensity > 0) {
            const beforeCount = currentTransients.length;
            currentTransients = currentTransients.filter(
                t => t.intensity >= this.config.minimumTransientIntensity
            );
            initialFilteredCount = beforeCount - currentTransients.length;
        }

        // Initialize retry state
        const retryState: RetryState = {
            retryCount: 0,
            sensitivityReduction: 0,
            currentIntensityThreshold: this.config.minimumTransientIntensity,
            transientsFilteredByIntensity: initialFilteredCount,
        };

        // Calculate required minimum interval (16th note duration)
        const requiredMinInterval = unifiedBeatMap.quarterNoteInterval / 4;

        // Retry loop with exponential backoff
        while (retryState.retryCount <= maxRetries) {
            // Step 2: Validate density of current transients
            const densityResult = this.validateDensityWithState(
                currentTransients,
                requiredMinInterval,
                retryState
            );

            if (densityResult.isValid) {
                // Density is valid, proceed with quantization
                return this.finalizeQuantization(
                    currentTransients,
                    unifiedBeatMap,
                    densityResult,
                    retryState.transientsFilteredByIntensity
                );
            }

            // Check if we've exhausted retries
            if (retryState.retryCount >= maxRetries) {
                // Max retries reached, proceed with warning
                console.warn(
                    `Density validation: Max retries (${maxRetries}) reached. ` +
                    `Proceeding with ${currentTransients.length} transients. ` +
                    `Min interval: ${(densityResult.minIntervalDetected * 1000).toFixed(1)}ms ` +
                    `(required: ${(requiredMinInterval * 1000).toFixed(1)}ms)`
                );

                return this.finalizeQuantization(
                    currentTransients,
                    unifiedBeatMap,
                    densityResult,
                    retryState.transientsFilteredByIntensity
                );
            }

            // Increment retry count
            retryState.retryCount++;

            // Calculate exponential backoff: base * 2^(retry-1)
            // Retry 1: 0.1, Retry 2: 0.2, Retry 3: 0.4
            const backoffMultiplier = Math.pow(2, retryState.retryCount - 1);
            const reductionStep = Math.min(
                baseReduction * backoffMultiplier,
                maxCumulative - retryState.sensitivityReduction
            );

            retryState.sensitivityReduction += reductionStep;
            retryState.currentIntensityThreshold = Math.min(
                this.config.minimumTransientIntensity + retryState.sensitivityReduction,
                1.0 // Cap at 1.0 (maximum threshold)
            );

            // Filter transients with new threshold
            const beforeCount = currentTransients.length;
            currentTransients = currentTransients.filter(
                t => t.intensity >= retryState.currentIntensityThreshold
            );
            const filteredThisRound = beforeCount - currentTransients.length;
            retryState.transientsFilteredByIntensity += filteredThisRound;

            console.warn(
                `Density validation retry ${retryState.retryCount}: ` +
                `Sensitivity reduction += ${(reductionStep * 100).toFixed(1)}% ` +
                `(cumulative: ${(retryState.sensitivityReduction * 100).toFixed(1)}%), ` +
                `Intensity threshold: ${(retryState.currentIntensityThreshold * 100).toFixed(1)}%, ` +
                `Filtered ${filteredThisRound} transients, ` +
                `${currentTransients.length} remaining`
            );
        }

        // This should never be reached due to the while loop logic,
        // but TypeScript needs a return statement
        const finalDensityResult = this.validateDensityWithState(
            currentTransients,
            requiredMinInterval,
            retryState
        );
        return this.finalizeQuantization(
            currentTransients,
            unifiedBeatMap,
            finalDensityResult,
            retryState.transientsFilteredByIntensity
        );
    }

    /**
     * Validate density with current retry state
     */
    private validateDensityWithState(
        transients: TransientResult[],
        requiredMinInterval: number,
        retryState: RetryState
    ): DensityValidationResult {
        // Handle edge case: no transients
        if (transients.length === 0) {
            return {
                isValid: true,
                minIntervalDetected: Infinity,
                requiredMinInterval,
                retryCount: retryState.retryCount,
                sensitivityReduction: retryState.sensitivityReduction,
            };
        }

        // Sort transients by timestamp
        const sortedTransients = [...transients].sort((a, b) => a.timestamp - b.timestamp);

        // Check for transients that are too close together
        let minIntervalDetected = Infinity;

        for (let i = 1; i < sortedTransients.length; i++) {
            const interval = sortedTransients[i].timestamp - sortedTransients[i - 1].timestamp;
            if (interval < minIntervalDetected) {
                minIntervalDetected = interval;
            }
        }

        // If minimum interval is less than required, density is invalid
        const isValid = minIntervalDetected >= requiredMinInterval;

        return {
            isValid,
            minIntervalDetected,
            requiredMinInterval,
            retryCount: retryState.retryCount,
            sensitivityReduction: retryState.sensitivityReduction,
        };
    }

    /**
     * Finalize quantization after density validation
     */
    private finalizeQuantization(
        transients: TransientResult[],
        unifiedBeatMap: UnifiedBeatMap,
        densityResult: DensityValidationResult,
        transientsFilteredByIntensity: number
    ): QuantizedBandStreams {
        // Create filtered transients structure
        const filteredTransients: FilteredTransients = {
            transients,
            totalFiltered: transientsFilteredByIntensity,
        };

        // Quantize each band
        const streams = this.quantizeBands(filteredTransients, unifiedBeatMap);

        return {
            streams,
            metadata: {
                densityValidation: densityResult,
                transientsFilteredByIntensity,
            },
        };
    }

    /**
     * Quantize all bands
     */
    private quantizeBands(
        filteredTransients: FilteredTransients,
        unifiedBeatMap: UnifiedBeatMap
    ): { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap } {
        const lowTransients = filteredTransients.transients.filter(t => t.band === 'low');
        const midTransients = filteredTransients.transients.filter(t => t.band === 'mid');
        const highTransients = filteredTransients.transients.filter(t => t.band === 'high');

        return {
            low: this.quantizeBand(lowTransients, unifiedBeatMap),
            mid: this.quantizeBand(midTransients, unifiedBeatMap),
            high: this.quantizeBand(highTransients, unifiedBeatMap),
        };
    }

    /**
     * Quantize a single band
     */
    private quantizeBand(
        transients: TransientResult[],
        unifiedBeatMap: UnifiedBeatMap
    ): GeneratedRhythmMap {
        const rawBeats: GeneratedBeat[] = [];
        const gridDecisions: GridDecision[] = [];
        const quarterNoteInterval = unifiedBeatMap.quarterNoteInterval;

        // Sort transients by timestamp
        const sortedTransients = [...transients].sort((a, b) => a.timestamp - b.timestamp);

        // Process each beat in the unified beat map
        for (let beatIndex = 0; beatIndex < unifiedBeatMap.beats.length; beatIndex++) {
            const beat = unifiedBeatMap.beats[beatIndex];
            const beatStart = beat.timestamp;
            const beatEnd = beatIndex < unifiedBeatMap.beats.length - 1
                ? unifiedBeatMap.beats[beatIndex + 1].timestamp
                : beat.timestamp + quarterNoteInterval;

            // Find transients in this beat's time range
            const beatTransients = sortedTransients.filter(
                t => t.timestamp >= beatStart && t.timestamp < beatEnd
            );

            if (beatTransients.length === 0) {
                continue;
            }

            // Determine grid type for this beat
            const gridDecision = this.detectGrid(beatTransients, beat, beatIndex, quarterNoteInterval);
            gridDecisions.push(gridDecision);

            // Quantize each transient
            for (const transient of beatTransients) {
                const quantizedBeat = this.quantizeTransient(
                    transient,
                    beat,
                    beatIndex,
                    gridDecision.selectedGrid,
                    quarterNoteInterval
                );
                if (quantizedBeat) {
                    rawBeats.push(quantizedBeat);
                }
            }
        }

        // Deduplicate beats that snap to the same grid point (keep strongest)
        const beats = this.deduplicateBeats(rawBeats);

        return {
            audioId: unifiedBeatMap.audioId,
            duration: unifiedBeatMap.duration,
            beats,
            gridDecisions,
        };
    }

    /**
     * Deduplicate beats that snap to the same grid point
     *
     * When multiple transients quantize to the same (beatIndex, gridPosition, gridType),
     * keep only the one with the highest intensity.
     *
     * @param beats - Array of quantized beats (may have duplicates)
     * @returns Deduplicated array with only the strongest beat at each grid point
     */
    private deduplicateBeats(beats: GeneratedBeat[]): GeneratedBeat[] {
        // Create a map keyed by (beatIndex, gridPosition, gridType)
        const beatMap = new Map<string, GeneratedBeat>();

        for (const beat of beats) {
            // Create a unique key for this grid position
            const key = `${beat.beatIndex}:${beat.gridPosition}:${beat.gridType}`;

            const existing = beatMap.get(key);
            if (!existing || beat.intensity > existing.intensity) {
                // Either no beat at this position, or this one is stronger
                beatMap.set(key, beat);
            }
        }

        // Convert map back to array and sort by timestamp
        return Array.from(beatMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Detect grid type for a beat
     */
    private detectGrid(
        transients: TransientResult[],
        beat: Beat,
        beatIndex: number,
        quarterNoteInterval: number
    ): GridDecision {
        // Calculate grid positions
        const straightGrid = this.calculateStraightGrid(beat.timestamp, quarterNoteInterval);
        const tripletGrid = this.calculateTripletGrid(beat.timestamp, quarterNoteInterval);

        // Calculate average offset from each grid
        let straightTotalOffset = 0;
        let tripletTotalOffset = 0;
        let validTransients = 0;

        for (const transient of transients) {
            const straightOffset = this.calculateOffsetFromGrid(transient, straightGrid);
            const tripletOffset = this.calculateOffsetFromGrid(transient, tripletGrid);
            straightTotalOffset += straightOffset;
            tripletTotalOffset += tripletOffset;
            validTransients++;
        }

        // Calculate averages
        const straightAvgOffset = validTransients > 0 ? straightTotalOffset / validTransients : 0;
        const tripletAvgOffset = validTransients > 0 ? tripletTotalOffset / validTransients : 0;

        // Select grid with smaller average offset
        const selectedGrid: GridType = straightAvgOffset <= tripletAvgOffset ? 'straight_16th' : 'triplet_8th';
        const confidence = Math.abs(straightAvgOffset - tripletAvgOffset);

        return {
            beatIndex,
            selectedGrid,
            straightAvgOffset,
            tripletAvgOffset,
            transientCount: validTransients,
            confidence,
        };
    }

    /**
     * Calculate straight 16th note grid for a beat
     *
     * @param beatStart - Start time of the beat in seconds
     * @param quarterNoteInterval - Duration of a quarter note in seconds
     * @returns Array of grid positions in seconds
     */
    private calculateStraightGrid(beatStart: number, quarterNoteInterval: number): number[] {
        const grid: number[] = [];
        const interval = quarterNoteInterval / 4; // 16th note interval

        for (let i = 0; i < 4; i++) {
            grid.push(beatStart + (i * interval));
        }
        return grid;
    }

    /**
     * Calculate 8th note triplet grid for a beat
     *
     * @param beatStart - Start time of the beat in seconds
     * @param quarterNoteInterval - Duration of a quarter note in seconds
     * @returns Array of grid positions in seconds
     */
    private calculateTripletGrid(beatStart: number, quarterNoteInterval: number): number[] {
        const grid: number[] = [];
        const interval = quarterNoteInterval / 3; // Triplet interval

        for (let i = 0; i < 3; i++) {
            grid.push(beatStart + (i * interval));
        }
        return grid;
    }

    /**
     * Calculate offset from grid (in milliseconds)
     */
    private calculateOffsetFromGrid(transient: TransientResult, grid: number[]): number {
        let minOffset = Infinity;

        for (const gridTime of grid) {
            const offset = Math.abs(transient.timestamp - gridTime);
            if (offset < minOffset) {
                minOffset = offset;
            }
        }
        return minOffset * 1000; // Convert to ms
    }

    /**
     * Quantize a transient to chosen grid
     */
    private quantizeTransient(
        transient: TransientResult,
        beat: Beat,
        beatIndex: number,
        gridType: GridType,
        quarterNoteInterval: number
    ): GeneratedBeat | null {
        const grid = gridType === 'straight_16th'
            ? this.calculateStraightGrid(beat.timestamp, quarterNoteInterval)
            : this.calculateTripletGrid(beat.timestamp, quarterNoteInterval);
        const maxGridPosition = gridType === 'straight_16th' ? 3 : 2;

        const interval = gridType === 'straight_16th'
            ? quarterNoteInterval / 4
            : quarterNoteInterval / 3;

        const gridPosition = Math.round((transient.timestamp - beat.timestamp) / interval);

        // Check if within valid range
        if (gridPosition < 0 || gridPosition > maxGridPosition) {
            return null; // Outside valid grid range
        }

        const gridTime = beat.timestamp + (gridPosition * interval);
        const quantizationError = Math.abs(transient.timestamp - gridTime) * 1000;

        return {
            timestamp: gridTime,
            beatIndex,
            gridPosition,
            gridType,
            intensity: transient.intensity,
            band: transient.band,
            quantizationError,
        };
    }
}
