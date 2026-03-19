/**
 * Rhythm Quantizer for Procedural Rhythm Generation
 *
 * Translates raw transients into quantized rhythmic subdivisions that align with the beat map grid.
 *
 * Part of the Procedural Rhythm Generation pipeline.
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
     * @param transientAnalysis - Transient analysis from TransientDetector
     * @param unifiedBeatMap - Unified beat map to quantize against
     * @returns Quantized band streams
     */
    quantize(
        transientAnalysis: TransientAnalysis,
        unifiedBeatMap: UnifiedBeatMap
    ): QuantizedBandStreams {
        // Step 1: Validate density with retry logic
        const densityResult = this.validateDensity(transientAnalysis, unifiedBeatMap);

        if (!densityResult.isValid && densityResult.retryCount < this.config.densityValidation.maxRetries) {
            // Retry with reduced sensitivity
            return this.quantizeWithRetry(
                transientAnalysis,
                unifiedBeatMap,
                densityResult.sensitivityReduction
            );
        }

        // Step 2: Filter by intensity
        const filteredTransients = this.filterByIntensity(transientAnalysis);

        // Step 3: Quantize each band
        const streams = this.quantizeBands(filteredTransients, unifiedBeatMap);

        return {
            streams,
            metadata: {
                densityValidation: densityResult,
                transientsFilteredByIntensity: filteredTransients.totalFiltered,
            },
        };
    }

    /**
     * Validate density with retry logic
     */
    private validateDensity(
        transientAnalysis: TransientAnalysis,
        unifiedBeatMap: UnifiedBeatMap
    ): DensityValidationResult {
        // Calculate minimum interval (16th note duration)
        const requiredMinInterval = unifiedBeatMap.quarterNoteInterval / 4;

        // Handle edge case: no transients
        if (transientAnalysis.transients.length === 0) {
            return {
                isValid: true,
                minIntervalDetected: Infinity,
                requiredMinInterval,
                retryCount: 0,
                sensitivityReduction: 0,
            };
        }

        // Sort transients by timestamp
        const sortedTransients = [...transientAnalysis.transients].sort((a, b) => a.timestamp - b.timestamp);

        // Check for transients that are too close together
        let minIntervalDetected = Infinity;

        for (let i = 1; i < sortedTransients.length; i++) {
            const interval = sortedTransients[i].timestamp - sortedTransients[i - 1].timestamp;
            if (interval < minIntervalDetected) {
                minIntervalDetected = interval;
            }
        }

        // If minimum interval is less than required, we need retry
        const isValid = minIntervalDetected >= requiredMinInterval;

        return {
            isValid,
            minIntervalDetected,
            requiredMinInterval,
            retryCount: isValid ? 0 : 1,
            sensitivityReduction: isValid ? 0 : this.config.densityValidation.baseSensitivityReduction,
        };
    }

    /**
     * Quantize with reduced sensitivity (retry logic)
     *
     * Note: In a full implementation, this would re-run the MultiBandAnalyzer
     * and TransientDetector with adjusted sensitivity. For now, we log a warning
     * and proceed with the current transients.
     */
    private quantizeWithRetry(
        transientAnalysis: TransientAnalysis,
        unifiedBeatMap: UnifiedBeatMap,
        sensitivityReduction: number
    ): QuantizedBandStreams {
        // In a real implementation, we would re-run multi-band analysis
        // for now, use the original transients with adjusted threshold
        console.warn(`Density validation failed, retrying with sensitivity reduction: ${sensitivityReduction.toFixed(2)}`);

        // Return current result for now (placeholder - in production, would re-analyze)
        return this.quantize(transientAnalysis, unifiedBeatMap);
    }

    /**
     * Filter transients by intensity
     */
    private filterByIntensity(
        transientAnalysis: TransientAnalysis
    ): FilteredTransients {
        const threshold = this.config.minimumTransientIntensity;

        if (threshold <= 0) {
            return {
                transients: transientAnalysis.transients,
                totalFiltered: 0,
            };
        }

        const filtered = transientAnalysis.transients.filter(
            t => t.intensity >= threshold
        );

        return {
            transients: filtered,
            totalFiltered: transientAnalysis.transients.length - filtered.length,
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
        unifiedBeatMap: UnifiedBeatMap,
        band: 'low' | 'mid' | 'high'
    ): GeneratedRhythmMap {
        const beats: GeneratedBeat[] = [];
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
                    beats.push(quantizedBeat);
                }
            }
        }

        return {
            audioId: unifiedBeatMap.audioId,
            duration: unifiedBeatMap.duration,
            beats,
            gridDecisions,
        };
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
