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
 *     maxRetries: 5,  // Per-band retry limit (opt-in, default: 0)
 *     baseSensitivityReduction: 0.1,  // Linear increment per retry
 *     maxCumulativeReduction: 0.5,  // Max threshold increase (default: 0.5)
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
    /** Maximum number of retries for sensitivity adjustment (default: 0, opt-in) */
    maxRetries: number;

    /** Base sensitivity reduction amount per retry (default: 0.1) */
    baseSensitivityReduction: number;

    /** Maximum cumulative sensitivity reduction (default: 0.5) */
    maxCumulativeReduction: number;
}

/**
 * Band type for per-band processing
 */
type BandType = 'low' | 'mid' | 'high';

/**
 * Internal state for tracking retries during quantization (per-band)
 */
interface BandRetryState {
    /** Band being processed */
    band: BandType;

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
        /** Per-band density validation results */
        densityValidation: DensityValidationResult;
        /** Total transients filtered by intensity across all bands */
        transientsFilteredByIntensity: number;
        /** Per-band filtered counts */
        transientsFilteredByBand: {
            low: number;
            mid: number;
            high: number;
        };
    };
}

// ============================================================================
// Density Validation Result
// ============================================================================

/**
 * Result of density validation for a single band
 */
export interface BandDensityValidationResult {
    /** Band that was validated */
    band: BandType;

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

    /** Final intensity threshold used */
    finalIntensityThreshold: number;

    /** Number of transients after filtering */
    transientsRemaining: number;
}

/**
 * Combined density validation result for all bands
 */
export interface DensityValidationResult {
    /** Whether all bands have valid density */
    isValid: boolean;

    /** Per-band density validation results */
    bands: {
        low: BandDensityValidationResult;
        mid: BandDensityValidationResult;
        high: BandDensityValidationResult;
    };

    /** Maximum retry count across all bands */
    maxRetryCount: number;

    /** Maximum sensitivity reduction across all bands */
    maxSensitivityReduction: number;
}

// ============================================================================
// Grid Types
// ============================================================================

/**
 * Grid type for a beat
 */
export type GridType = 'straight_16th' | 'triplet_8th' | 'straight_8th';

/**
 * Grid decision metadata (produced during grid detection)
 */
export interface GridDecision {
    /** Index into UnifiedBeatMap.beats[] */
    beatIndex: number;

    /** Selected grid type for this beat */
    selectedGrid: GridType;

    /** Average ms offset from straight 16th grid (undefined when grid is forced) */
    straightAvgOffset?: number;

    /** Average ms offset from triplet grid (undefined when grid is forced) */
    tripletAvgOffset?: number;

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

    /** Position within that beat (0-3 for 16th, 0-2 for triplet, 0-1 for 8th) */
    gridPosition: number;

    /** Grid type for this beat */
    gridType: GridType;

    /** Transient strength (0.0 - 1.0) */
    intensity: number;

    /** Frequency band */
    band: 'low' | 'mid' | 'high';

    /** Original transient detection timestamp in seconds (before quantization) */
    detectedTimestamp?: number;

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

    /** Duration of a quarter note in seconds (from UnifiedBeatMap - the ground truth) */
    quarterNoteInterval: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_QUANTIZATION_CONFIG: Required<QuantizationConfig> = {
    densityValidation: {
        maxRetries: 0, // Opt-in: density validation retries disabled by default
        baseSensitivityReduction: 0.1,
        maxCumulativeReduction: 0.5,
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
     * Implements per-band density validation with linear retry increments:
     * - Each band (low/mid/high) is validated independently
     * - Retry increments are linear: 0.1, 0.2, 0.3, 0.4, 0.5
     * - If one band is too dense, only that band's threshold is increased
     *
     * @param transientAnalysis - Transient analysis from TransientDetector
     * @param unifiedBeatMap - Unified beat map to quantize against
     * @returns Quantized band streams
     */
    quantize(
        transientAnalysis: TransientAnalysis,
        unifiedBeatMap: UnifiedBeatMap
    ): QuantizedBandStreams {
        // Split transients by band first
        const transientsByBand = this.splitTransientsByBand(transientAnalysis.transients);

        // Calculate required minimum interval (between 16th and 32nd note: /6 instead of /4)
        // This allows denser patterns before triggering retry logic
        const requiredMinInterval = unifiedBeatMap.quarterNoteInterval / 6;

        // Process each band independently with per-band density validation
        const lowResult = this.processBand(
            transientsByBand.low,
            'low',
            requiredMinInterval
        );
        const midResult = this.processBand(
            transientsByBand.mid,
            'mid',
            requiredMinInterval
        );
        const highResult = this.processBand(
            transientsByBand.high,
            'high',
            requiredMinInterval
        );

        // Quantize each band with its filtered transients
        const streams = {
            low: this.quantizeBand(lowResult.filteredTransients, unifiedBeatMap, 'low'),
            mid: this.quantizeBand(midResult.filteredTransients, unifiedBeatMap, 'mid'),
            high: this.quantizeBand(highResult.filteredTransients, unifiedBeatMap, 'high'),
        };

        // Calculate total filtered across all bands
        const totalFiltered = lowResult.filteredCount + midResult.filteredCount + highResult.filteredCount;

        // Aggregate density validation result (overall status)
        const aggregateDensityResult = this.aggregateDensityResults(
            [lowResult.densityResult, midResult.densityResult, highResult.densityResult],
            requiredMinInterval
        );

        return {
            streams,
            metadata: {
                densityValidation: aggregateDensityResult,
                transientsFilteredByIntensity: totalFiltered,
                transientsFilteredByBand: {
                    low: lowResult.filteredCount,
                    mid: midResult.filteredCount,
                    high: highResult.filteredCount,
                },
            },
        };
    }

    /**
     * Split transients by frequency band
     */
    private splitTransientsByBand(transients: TransientResult[]): {
        low: TransientResult[];
        mid: TransientResult[];
        high: TransientResult[];
    } {
        return {
            low: transients.filter(t => t.band === 'low'),
            mid: transients.filter(t => t.band === 'mid'),
            high: transients.filter(t => t.band === 'high'),
        };
    }

    /**
     * Process a single band with per-band density validation and retry logic
     *
     * Uses linear increments instead of exponential:
     * - Retry 1: +0.1
     * - Retry 2: +0.2
     * - Retry 3: +0.3
     * - Retry 4: +0.4
     * - Retry 5: +0.5
     */
    private processBand(
        transients: TransientResult[],
        band: BandType,
        requiredMinInterval: number
    ): {
        filteredTransients: TransientResult[];
        filteredCount: number;
        densityResult: BandDensityValidationResult;
    } {
        const maxRetries = this.config.densityValidation.maxRetries;
        const baseReduction = this.config.densityValidation.baseSensitivityReduction;
        const maxCumulative = this.config.densityValidation.maxCumulativeReduction;

        // Step 1: Apply initial intensity filtering for this band
        let filteredCount = 0;
        let currentTransients = transients;

        if (this.config.minimumTransientIntensity > 0) {
            const beforeCount = currentTransients.length;
            currentTransients = currentTransients.filter(
                t => t.intensity >= this.config.minimumTransientIntensity
            );
            filteredCount = beforeCount - currentTransients.length;
        }

        // Initialize per-band retry state
        let currentThreshold = this.config.minimumTransientIntensity;
        let sensitivityReduction = 0;
        let retryCount = 0;

        // Retry loop with LINEAR increments (not exponential)
        while (retryCount <= maxRetries) {
            // Validate density of current transients for this band
            const densityResult = this.validateBandDensity(
                currentTransients,
                band,
                requiredMinInterval,
                retryCount,
                sensitivityReduction
            );

            if (densityResult.isValid) {
                // Density is valid for this band
                return {
                    filteredTransients: currentTransients,
                    filteredCount,
                    densityResult,
                };
            }

            // Check if we've exhausted retries
            if (retryCount >= maxRetries) {
                // Max retries reached for this band, proceed with warning
                console.warn(
                    `[${band}] Density validation: Max retries (${maxRetries}) reached. ` +
                    `Proceeding with ${currentTransients.length} transients. ` +
                    `Min interval: ${(densityResult.minIntervalDetected * 1000).toFixed(1)}ms ` +
                    `(required: ${(requiredMinInterval * 1000).toFixed(1)}ms)`
                );

                return {
                    filteredTransients: currentTransients,
                    filteredCount,
                    densityResult,
                };
            }

            // Increment retry count
            retryCount++;

            // LINEAR increment: baseReduction * retryCount (not exponential)
            // Retry 1: 0.1, Retry 2: 0.2, Retry 3: 0.3, Retry 4: 0.4, Retry 5: 0.5
            const reductionStep = Math.min(
                baseReduction, // Linear: same amount each time
                maxCumulative - sensitivityReduction
            );

            sensitivityReduction += reductionStep;
            currentThreshold = Math.min(
                this.config.minimumTransientIntensity + sensitivityReduction,
                1.0 // Cap at 1.0 (maximum threshold)
            );

            // Filter transients with new threshold for this band only
            const beforeCount = currentTransients.length;
            currentTransients = currentTransients.filter(
                t => t.intensity >= currentThreshold
            );
            const filteredThisRound = beforeCount - currentTransients.length;
            filteredCount += filteredThisRound;

            console.warn(
                `[${band}] Density validation retry ${retryCount}: ` +
                `Threshold increased to ${(currentThreshold * 100).toFixed(1)}%, ` +
                `Filtered ${filteredThisRound} transients, ` +
                `${currentTransients.length} remaining`
            );
        }

        // Should not reach here, but TypeScript needs a return
        const finalDensityResult = this.validateBandDensity(
            currentTransients,
            band,
            requiredMinInterval,
            retryCount,
            sensitivityReduction
        );
        return {
            filteredTransients: currentTransients,
            filteredCount,
            densityResult: finalDensityResult,
        };
    }

    /**
     * Validate density for a single band
     */
    private validateBandDensity(
        transients: TransientResult[],
        band: BandType,
        requiredMinInterval: number,
        retryCount: number,
        sensitivityReduction: number,
        currentThreshold: number = this.config.minimumTransientIntensity
    ): BandDensityValidationResult {
        const transientsRemaining = transients.length;
        const finalIntensityThreshold = Math.min(
            this.config.minimumTransientIntensity + sensitivityReduction,
            1.0
        );

        // Handle edge case: no transients
        if (transients.length === 0) {
            return {
                band,
                isValid: true,
                minIntervalDetected: Infinity,
                requiredMinInterval,
                retryCount,
                sensitivityReduction,
                finalIntensityThreshold,
                transientsRemaining,
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
            band,
            isValid,
            minIntervalDetected,
            requiredMinInterval,
            retryCount,
            sensitivityReduction,
            finalIntensityThreshold,
            transientsRemaining,
        };
    }

    /**
     * Aggregate density results from all bands into a single result
     */
    private aggregateDensityResults(
        bandResults: BandDensityValidationResult[],
        requiredMinInterval: number
    ): DensityValidationResult {
        // Find the worst case across all bands
        let maxRetryCount = 0;
        let maxSensitivityReduction = 0;
        let minIntervalDetected = Infinity;
        let allValid = true;

        for (const result of bandResults) {
            if (result.retryCount > maxRetryCount) {
                maxRetryCount = result.retryCount;
            }
            if (result.sensitivityReduction > maxSensitivityReduction) {
                maxSensitivityReduction = result.sensitivityReduction;
            }
            if (result.minIntervalDetected < minIntervalDetected) {
                minIntervalDetected = result.minIntervalDetected;
            }
            if (!result.isValid) {
                allValid = false;
            }
        }

        return {
            isValid: allValid,
            bands: {
                low: bandResults.find(r => r.band === 'low')!,
                mid: bandResults.find(r => r.band === 'mid')!,
                high: bandResults.find(r => r.band === 'high')!,
            },
            maxRetryCount,
            maxSensitivityReduction,
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
            low: this.quantizeBand(lowTransients, unifiedBeatMap, 'low'),
            mid: this.quantizeBand(midTransients, unifiedBeatMap, 'mid'),
            high: this.quantizeBand(highTransients, unifiedBeatMap, 'high'),
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
        const rawBeats: GeneratedBeat[] = [];
        const gridDecisions: GridDecision[] = [];
        const quarterNoteInterval = unifiedBeatMap.quarterNoteInterval;
        const forcedGrid = this.getBandGridType(band);

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

            // Determine grid type: use forced grid for this band, or auto-detect
            let gridDecision: GridDecision;
            if (forcedGrid) {
                gridDecision = {
                    beatIndex,
                    selectedGrid: forcedGrid,
                    transientCount: beatTransients.length,
                    confidence: 1.0,
                };
            } else {
                gridDecision = this.detectGrid(beatTransients, beat, beatIndex, quarterNoteInterval);
            }
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
            quarterNoteInterval: unifiedBeatMap.quarterNoteInterval,
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
     *
     * ## Algorithm: Per-Beat Grid Detection (16th vs Triplet)
     *
     * This method determines whether transients within a beat fit better on:
     * - **Straight 16th note grid**: 4 equally-spaced positions (0, 1, 2, 3)
     * - **8th note triplet grid**: 3 equally-spaced positions (0, 1, 2)
     *
     * ### Decision Logic:
     *
     * 1. Calculate both grid positions for the beat
     * 2. For each transient, measure distance to nearest point on each grid
     * 3. Calculate average offset per transient for each grid
     * 4. Select grid with **smaller average offset** (transients are closer to grid points)
     * 5. Confidence = |straightAvgOffset - tripletAvgOffset| (how much better the winner fits)
     *
     * ### Example:
     * - If transients are at 0ms, 250ms, 500ms in a 500ms beat:
     *   - Straight 16th grid (0, 125, 250, 375, 500ms) → offsets: 0, 0, 0 → avg 0ms
     *   - Triplet grid (0, 167, 333, 500ms) → offsets: 0, 83, 167 → avg 83ms
     *   - Winner: Straight 16th (smaller offset)
     *
     * ### Why Per-Beat Detection?
     *
     * Music often mixes straight and triplet feels within the same song.
     * By detecting the grid per-beat, we can handle:
     * - Songs with tempo changes
     * - Songs with mixed time signatures
     * - Songs with swing feel in some sections but not others
     */

    /**
     * Get the forced grid type for a band, if any.
     *
     * Returns null for bands that should auto-detect their grid.
     */
    private getBandGridType(band: 'low' | 'mid' | 'high'): GridType | null {
        switch (band) {
            case 'low': return 'straight_8th';
            case 'mid':
            case 'high': return null;
        }
    }

    private detectGrid(
        transients: TransientResult[],
        beat: Beat,
        beatIndex: number,
        quarterNoteInterval: number
    ): GridDecision {
        // Step 1: Calculate grid positions for both grid types
        // Straight 16th: 4 positions at 0, 1/4, 2/4, 3/4 of the beat
        const straightGrid = this.calculateStraightGrid(beat.timestamp, quarterNoteInterval);
        // Triplet 8th: 3 positions at 0, 1/3, 2/3 of the beat
        const tripletGrid = this.calculateTripletGrid(beat.timestamp, quarterNoteInterval);

        // Step 2: Calculate total offset from each grid for all transients
        let straightTotalOffset = 0;
        let tripletTotalOffset = 0;
        let validTransients = 0;

        for (const transient of transients) {
            // Find minimum distance from this transient to any point on each grid
            const straightOffset = this.calculateOffsetFromGrid(transient, straightGrid);
            const tripletOffset = this.calculateOffsetFromGrid(transient, tripletGrid);
            straightTotalOffset += straightOffset;
            tripletTotalOffset += tripletOffset;
            validTransients++;
        }

        // Step 3: Calculate average offset per transient
        const straightAvgOffset = validTransients > 0 ? straightTotalOffset / validTransients : 0;
        const tripletAvgOffset = validTransients > 0 ? tripletTotalOffset / validTransients : 0;

        // Step 4: Select grid with smaller average offset (better fit)
        // Use <= to prefer straight grid when tied (more common in Western music)
        const selectedGrid: GridType = straightAvgOffset <= tripletAvgOffset ? 'straight_16th' : 'triplet_8th';

        // Step 5: Calculate confidence (how much better the winner fits)
        // Higher confidence = clearer decision (one grid fits much better)
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
     * Calculate straight 8th note grid for a beat
     *
     * @param beatStart - Start time of the beat in seconds
     * @param quarterNoteInterval - Duration of a quarter note in seconds
     * @returns Array of grid positions in seconds
     */
    private calculate8thGrid(beatStart: number, quarterNoteInterval: number): number[] {
        const grid: number[] = [];
        const interval = quarterNoteInterval / 2; // 8th note interval

        for (let i = 0; i < 2; i++) {
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
        let maxGridPosition: number;
        let interval: number;

        switch (gridType) {
            case 'straight_8th':
                maxGridPosition = 1;
                interval = quarterNoteInterval / 2;
                break;
            case 'straight_16th':
                maxGridPosition = 3;
                interval = quarterNoteInterval / 4;
                break;
            case 'triplet_8th':
                maxGridPosition = 2;
                interval = quarterNoteInterval / 3;
                break;
        }

        const gridPosition = Math.round((transient.timestamp - beat.timestamp) / interval);

        // Check if within valid range
        if (gridPosition < 0 || gridPosition > maxGridPosition) {
            return null; // Outside valid grid range
        }

        const gridTime = beat.timestamp + (gridPosition * interval);
        const quantizationError = Math.abs(transient.timestamp - gridTime) * 1000;

        return {
            timestamp: gridTime,
            detectedTimestamp: transient.timestamp,
            beatIndex,
            gridPosition,
            gridType,
            intensity: transient.intensity,
            band: transient.band,
            quantizationError,
        };
    }
}
