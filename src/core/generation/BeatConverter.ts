/**
 * Beat Converter - Converts procedural generation output to ChartedBeatMap
 *
 * This class converts DifficultyVariant output (GeneratedBeat[]) to ChartedBeatMap
 * format for compatibility with BeatStream and the existing beat map infrastructure.
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 2.7
 *
 * @example
 * ```typescript
 * const converter = new BeatConverter();
 *
 * const chartedBeatMap = converter.convertToChartedBeatMap(
 *   variant,
 *   unifiedBeatMap,
 *   keyAssignments,
 *   metadata
 * );
 * ```
 */

import type { Beat, DownbeatConfig, SubdivisionType, BeatMapMetadata } from '../types/BeatMap.js';
import type { UnifiedBeatMap } from '../types/BeatMap.js';
import type {
    ChartedBeat,
    ChartedBeatMap,
    ChartConversionOptions,
    ChartMetadata,
    RhythmMetadataSummary,
} from '../types/ChartedBeatMap.js';
import {
    mapGridToSubdivision,
    calculateBeatInMeasure,
} from '../types/ChartedBeatMap.js';
import type {
    DifficultyVariant,
    VariantBeat,
    DifficultyLevel,
} from '../analysis/beat/DifficultyVariantGenerator.js';
import type { Band } from './RhythmGenerator.js';
import type { ButtonMappingMetadata } from './ButtonMapper.js';
import type { RhythmMetadata } from './RhythmGenerator.js';

// ============================================================================
// BeatConverter Class
// ============================================================================

/**
 * Converts procedural generation output (GeneratedBeat[]) to ChartedBeatMap
 * for compatibility with BeatStream and the existing beat map infrastructure.
 */
export class BeatConverter {
    // ============================================================================
    // Main Public API
    // ============================================================================

    /**
     * Convert a DifficultyVariant to a ChartedBeatMap
     *
     * @param variant - The difficulty variant with VariantBeat[]
     * @param unifiedBeatMap - The source UnifiedBeatMap for measure/beat info
     * @param keyAssignments - Map of beat index to required key
     * @param partialMetadata - Partial chart metadata
     * @returns A ChartedBeatMap ready for BeatStream
     */
    convertToChartedBeatMap(
        variant: DifficultyVariant,
        unifiedBeatMap: UnifiedBeatMap,
        keyAssignments: Map<number, string>,
        partialMetadata: Partial<ChartMetadata>
    ): ChartedBeatMap {
        // Convert all beats
        const beats: ChartedBeat[] = [];
        const detectedBeatIndices: number[] = [];

        for (let i = 0; i < variant.beats.length; i++) {
            const variantBeat = variant.beats[i];
            const chartedBeat = this.convertBeat(
                variantBeat,
                unifiedBeatMap,
                keyAssignments.get(i),
                i
            );

            beats.push(chartedBeat);

            // Track detected beats (those with low quantization error or no quantization)
            if (chartedBeat.isDetected) {
                detectedBeatIndices.push(i);
            }
        }

        // Build complete metadata
        const chartMetadata = this.buildChartMetadata(
            variant,
            partialMetadata,
            beats,
            keyAssignments
        );

        return {
            audioId: unifiedBeatMap.audioId,
            duration: unifiedBeatMap.duration,
            beats,
            detectedBeatIndices,
            downbeatConfig: unifiedBeatMap.downbeatConfig,
            quarterNoteInterval: unifiedBeatMap.quarterNoteInterval,
            bpm: unifiedBeatMap.quarterNoteBpm,
            chartMetadata,
        };
    }

    /**
     * Convert with full options object
     *
     * @param options - Conversion options
     * @returns A ChartedBeatMap ready for BeatStream
     */
    convertWithOptions(
        variant: DifficultyVariant,
        options: ChartConversionOptions
    ): ChartedBeatMap {
        // Create default metadata for the minimal beat map
        const defaultMetadata: BeatMapMetadata = {
            version: '1.0.0',
            algorithm: 'procedural-generation',
            minBpm: 60,
            maxBpm: 200,
            sensitivity: 1.0,
            filter: 0.5,
            noiseFloorThreshold: 0.01,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 0.5,
            melBands: 40,
            highPassCutoff: 80,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 0.5,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        };

        // Create a minimal unified beat map from options
        const unifiedBeatMap: UnifiedBeatMap = {
            audioId: options.audioId,
            duration: options.duration,
            beats: [],
            detectedBeatIndices: [],
            quarterNoteInterval: options.quarterNoteInterval,
            quarterNoteBpm: 60 / options.quarterNoteInterval,
            downbeatConfig: options.downbeatConfig,
            originalMetadata: defaultMetadata,
        };

        return this.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            options.keyAssignments,
            options.metadata
        );
    }

    // ============================================================================
    // Beat Conversion
    // ============================================================================

    /**
     * Convert a single VariantBeat to ChartedBeat
     *
     * @param beat - The VariantBeat to convert
     * @param unifiedBeatMap - Source for measure/beat info
     * @param key - The required key (if assigned)
     * @param beatIndex - Index of this beat in the variant
     * @returns A ChartedBeat
     */
    private convertBeat(
        beat: VariantBeat,
        unifiedBeatMap: UnifiedBeatMap,
        key: string | undefined,
        beatIndex: number
    ): ChartedBeat {
        // Get the parent quarter note info
        const quarterNoteIndex = beat.beatIndex;
        const parentBeat = this.getParentBeat(unifiedBeatMap, quarterNoteIndex);

        // Calculate beatInMeasure
        const beatInMeasure = this.calculateBeatInMeasure(
            parentBeat,
            beat.gridPosition,
            beat.gridType
        );

        // Determine if this beat was detected (vs generated/interpolated)
        const isDetected = this.isBeatDetected(beat);

        // Map grid type to subdivision type
        const subdivisionType = this.mapGridToSubdivision(beat.gridType);

        // Calculate confidence
        const confidence = this.calculateConfidence(beat, isDetected);

        return {
            // Base Beat fields
            timestamp: beat.timestamp,
            beatInMeasure,
            isDownbeat: (parentBeat?.isDownbeat ?? false) && beat.gridPosition === 0,
            measureNumber: parentBeat?.measureNumber ?? 0,
            intensity: beat.intensity,
            confidence,
            requiredKey: key,

            // ChartedBeat extensions
            quarterNoteIndex,
            subdivisionPosition: beat.gridPosition,
            isDetected,
            subdivisionType,
            sourceBand: beat.sourceBand,
            quantizationError: beat.quantizationError,
        };
    }

    /**
     * Get the parent quarter note beat from UnifiedBeatMap
     */
    private getParentBeat(unifiedBeatMap: UnifiedBeatMap, quarterNoteIndex: number): Beat | null {
        if (quarterNoteIndex < 0 || quarterNoteIndex >= unifiedBeatMap.beats.length) {
            return null;
        }
        return unifiedBeatMap.beats[quarterNoteIndex];
    }

    /**
     * Calculate beatInMeasure for a variant beat
     *
     * @param parentBeat - The parent quarter note beat
     * @param gridPosition - Position within that quarter (0-3 for 16th, 0-2 for triplet)
     * @param gridType - The grid type
     * @returns Decimal beatInMeasure value
     */
    private calculateBeatInMeasure(
        parentBeat: Beat | null,
        gridPosition: number,
        gridType: string
    ): number {
        const parentBeatInMeasure = parentBeat?.beatInMeasure ?? 0;
        return calculateBeatInMeasure(parentBeatInMeasure, gridPosition, gridType);
    }

    /**
     * Determine if a beat was originally detected (vs generated)
     *
     * A beat is considered detected if:
     * - It has no quantization error (wasn't moved), OR
     * - It has a very small quantization error (< 10ms)
     */
    private isBeatDetected(beat: VariantBeat): boolean {
        // If no quantization error recorded, assume detected
        if (beat.quantizationError === undefined) {
            return true;
        }
        // Small quantization error means it was detected and barely moved
        return beat.quantizationError < 10;
    }

    /**
     * Map grid type to subdivision type
     */
    private mapGridToSubdivision(gridType: string): SubdivisionType {
        return mapGridToSubdivision(gridType);
    }

    /**
     * Calculate confidence for a beat
     *
     * @param beat - The beat
     * @param isDetected - Whether the beat was detected
     * @returns Confidence value (0-1)
     */
    private calculateConfidence(beat: VariantBeat, isDetected: boolean): number {
        // High confidence for detected beats
        if (isDetected) {
            // Scale by intensity for detected beats
            return Math.min(1.0, 0.8 + beat.intensity * 0.2);
        }
        // Lower confidence for generated beats
        return 0.8;
    }

    // ============================================================================
    // Metadata Building
    // ============================================================================

    /**
     * Build complete chart metadata
     */
    private buildChartMetadata(
        variant: DifficultyVariant,
        partialMetadata: Partial<ChartMetadata>,
        beats: ChartedBeat[],
        keyAssignments: Map<number, string>
    ): ChartMetadata {
        // Count pitch-influenced beats (those with keys assigned from pitch)
        const pitchInfluencedBeats = partialMetadata.pitchInfluencedBeats ?? 0;

        // Get unique keys used
        const keysUsed = this.getUniqueKeys(beats);

        // Get subdivision types used
        const subdivisionTypesUsed = this.getSubdivisionTypesUsed(beats);

        return {
            difficulty: variant.difficulty,
            keysUsed,
            pitchInfluencedBeats,
            patternsUsed: partialMetadata.patternsUsed ?? [],
            rhythmMetadata: partialMetadata.rhythmMetadata ?? this.createDefaultRhythmMetadata(variant),
            pitchMetadata: partialMetadata.pitchMetadata ?? null,
            generatedAt: partialMetadata.generatedAt ?? new Date().toISOString(),
            seed: partialMetadata.seed,
        };
    }

    /**
     * Get unique keys used in the chart
     */
    private getUniqueKeys(beats: ChartedBeat[]): string[] {
        const keys = new Set<string>();
        for (const beat of beats) {
            if (beat.requiredKey !== undefined) {
                keys.add(beat.requiredKey);
            }
        }
        return Array.from(keys).sort();
    }

    /**
     * Get subdivision types used in the chart
     */
    private getSubdivisionTypesUsed(beats: ChartedBeat[]): SubdivisionType[] {
        const types = new Set<SubdivisionType>();
        for (const beat of beats) {
            types.add(beat.subdivisionType);
        }
        return Array.from(types);
    }

    /**
     * Create default rhythm metadata summary
     */
    private createDefaultRhythmMetadata(variant: DifficultyVariant): RhythmMetadataSummary {
        return {
            difficulty: variant.difficulty,
            bandsAnalyzed: ['low', 'mid', 'high'] as Band[],
            transientsDetected: variant.beats.length,
            averageDensity: variant.beats.length / 180, // Approximate
            naturalDifficulty: variant.difficulty,
        };
    }

    // ============================================================================
    // Static Utility Methods
    // ============================================================================

    /**
     * Create a ChartedBeatMap from mapped level result
     *
     * Convenience method that combines variant, beat map, and button mapping
     *
     * @param variant - The difficulty variant
     * @param unifiedBeatMap - The unified beat map
     * @param buttonMetadata - Button mapping metadata
     * @param rhythmMetadata - Rhythm generation metadata
     * @returns A ChartedBeatMap ready for BeatStream
     */
    static fromMappedResult(
        variant: DifficultyVariant,
        unifiedBeatMap: UnifiedBeatMap,
        buttonMetadata: ButtonMappingMetadata,
        rhythmMetadata: RhythmMetadata
    ): ChartedBeatMap {
        // Build key assignments from variant beats
        const keyAssignments = new Map<number, string>();
        for (let i = 0; i < variant.beats.length; i++) {
            // Key assignments come from button mapping results
            // For now, we'll use the button metadata keysUsed
            if (buttonMetadata.keysUsed.length > 0) {
                keyAssignments.set(i, buttonMetadata.keysUsed[i % buttonMetadata.keysUsed.length]);
            }
        }

        const converter = new BeatConverter();

        // Build rhythm metadata summary
        const rhythmSummary: RhythmMetadataSummary = {
            difficulty: rhythmMetadata.difficulty,
            bandsAnalyzed: rhythmMetadata.bandsAnalyzed,
            transientsDetected: rhythmMetadata.transientsDetected,
            averageDensity: rhythmMetadata.averageDensity,
            naturalDifficulty: rhythmMetadata.naturalDifficulty,
        };

        // Build pitch metadata from button metadata
        const pitchMetadata = buttonMetadata.directionStats ? {
            melodyRange: null,
            directionStats: buttonMetadata.directionStats,
            intervalStats: buttonMetadata.intervalStats ?? null,
        } : null;

        const partialMetadata: Partial<ChartMetadata> = {
            difficulty: variant.difficulty,
            keysUsed: buttonMetadata.keysUsed,
            pitchInfluencedBeats: buttonMetadata.pitchInfluencedBeats,
            patternsUsed: buttonMetadata.patternsUsed,
            rhythmMetadata: rhythmSummary,
            pitchMetadata,
            generatedAt: new Date().toISOString(),
        };

        return converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            partialMetadata
        );
    }
}
