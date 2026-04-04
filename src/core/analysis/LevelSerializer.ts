/**
 * Level Serializer - Converts GeneratedLevel to/from export formats
 *
 * This class provides serialization and deserialization for procedurally
 * generated rhythm game levels. It converts between the engine's internal
 * GeneratedLevel format and the FullBeatMapExportData format that is
 * compatible with the playlist-data-showcase app.
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 4.2.2
 *
 * @example
 * ```typescript
 * // Export a generated level
 * const exportData = LevelSerializer.toExportData(generatedLevel);
 * const json = LevelSerializer.toJSON(generatedLevel);
 *
 * // Import a level
 * const level = LevelSerializer.fromJSON(json);
 * const level2 = LevelSerializer.fromExportData(exportData);
 *
 * // Validate before import
 * const result = LevelSerializer.validate(unknownData);
 * if (result.success) {
 *   const level = LevelSerializer.fromExportData(result.data!);
 * }
 * ```
 */

import type { GeneratedLevel, LevelMetadata } from '../generation/LevelGenerator.js';
import type { ChartedBeatMap, ChartedBeat } from '../types/ChartedBeatMap.js';
import type {
    FullBeatMapExportData,
    FullExportDetectedBeat,
    FullExportMergedBeat,
    FullExportSubdividedBeat,
    InterpolatedMetadataJSON,
    SubdivisionConfigJSON,
    SubdivisionMetadataJSON,
    SubdivisionExportData,
    ChartExportData,
    ProceduralGenerationMetadata,
    FullBeatMapImportResult,
} from '../types/LevelExport.js';
import { isFullBeatMapExportData } from '../types/LevelExport.js';
import type { SubdivisionType, DownbeatConfig, DownbeatSegment, TimeSignatureConfig } from '../types/BeatMap.js';
import type { DifficultyLevel, DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';
import type { NaturalDifficulty } from '../analysis/beat/DensityAnalyzer.js';
import type { GeneratedBeat, GridType, GeneratedRhythmMap } from '../analysis/beat/RhythmQuantizer.js';
import type { GeneratedRhythm, RhythmMetadata, Band } from '../generation/RhythmGenerator.js';
import type { MelodyContourAnalysisResult, DirectionStats, IntervalStats, MelodyContour } from './MelodyContourAnalyzer.js';
import type { ControllerMode } from '../types/ButtonMapping.js';
import type { DifficultyPreset } from '../types/BeatMap.js';
import type { CompositeStream, CompositeBeat } from '../analysis/beat/CompositeStreamGenerator.js';


// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for serialization
 */
export interface LevelSerializerOptions {
    /** Include audio title in export (default: false) */
    includeAudioTitle?: boolean;
    /** Audio title to include */
    audioTitle?: string;
}

// ============================================================================
// LevelSerializer Class
// ============================================================================

/**
 * Serializer for rhythm game levels
 *
 * Converts between GeneratedLevel (engine internal) and FullBeatMapExportData
 * (export format compatible with playlist-data-showcase app).
 *
 * All methods are static - this is a utility class without state.
 */
export class LevelSerializer {
    // ============================================================================
    // Export: GeneratedLevel → FullBeatMapExportData
    // ============================================================================

    /**
     * Convert a GeneratedLevel to FullBeatMapExportData format
     *
     * @param level - The generated level to export
     * @param options - Optional serialization options
     * @returns The export data ready for JSON serialization
     */
    static toExportData(level: GeneratedLevel, options: LevelSerializerOptions = {}): FullBeatMapExportData {
        const { chart, metadata, pitchAnalysis } = level;

        // Build detected beats from chart
        const detectedBeats = this.buildDetectedBeats(chart);

        // Build merged beats from chart
        const mergedBeats = this.buildMergedBeats(chart);

        // Build interpolated metadata
        const interpolatedMetadata = this.buildInterpolatedMetadata(chart);

        // Build subdivision data
        const subdivision = this.buildSubdivisionData(chart);

        // Build chart export data
        const chartExportData = this.buildChartExportData(chart, metadata);

        // Build procedural generation metadata
        const generationMetadata = this.buildGenerationMetadata(metadata, pitchAnalysis);

        return {
            version: 1,
            format: 'full-beatmap',
            audioId: chart.audioId,
            audioTitle: options.includeAudioTitle ? options.audioTitle : undefined,
            exportedAt: Date.now(),
            duration: chart.duration,
            quarterNoteBpm: chart.bpm,
            quarterNoteConfidence: chart.chartMetadata.rhythmMetadata.averageDensity,
            detectedBeats,
            mergedBeats,
            interpolatedMetadata,
            subdivision,
            chart: chartExportData,
            generationSource: 'procedural',
            generationMetadata,
        };
    }

    /**
     * Build detected beats array from chart
     */
    private static buildDetectedBeats(chart: ChartedBeatMap): FullExportDetectedBeat[] {
        const detectedBeats: FullExportDetectedBeat[] = [];
        const detectedIndices = new Set(chart.detectedBeatIndices);

        for (let i = 0; i < chart.beats.length; i++) {
            const beat = chart.beats[i];
            if (detectedIndices.has(i)) {
                detectedBeats.push({
                    timestamp: beat.timestamp,
                    beatInMeasure: beat.beatInMeasure,
                    isDownbeat: beat.isDownbeat,
                    measureNumber: beat.measureNumber,
                    intensity: beat.intensity,
                    confidence: beat.confidence,
                    requiredKey: beat.requiredKey,
                });
            }
        }

        return detectedBeats;
    }

    /**
     * Build merged beats array from chart
     */
    private static buildMergedBeats(chart: ChartedBeatMap): FullExportMergedBeat[] {
        const detectedIndices = new Set(chart.detectedBeatIndices);

        return chart.beats.map((beat, index) => ({
            timestamp: beat.timestamp,
            beatInMeasure: beat.beatInMeasure,
            isDownbeat: beat.isDownbeat,
            measureNumber: beat.measureNumber,
            intensity: beat.intensity,
            confidence: beat.confidence,
            requiredKey: beat.requiredKey,
            source: detectedIndices.has(index) ? 'detected' : 'interpolated' as const,
            distanceToAnchor: beat.quantizationError,
        }));
    }

    /**
     * Build interpolated metadata from chart
     */
    private static buildInterpolatedMetadata(chart: ChartedBeatMap): InterpolatedMetadataJSON {
        const detectedCount = chart.detectedBeatIndices.length;
        const totalCount = chart.beats.length;

        return {
            quarterNoteInterval: chart.quarterNoteInterval,
            quarterNoteBpm: chart.bpm,
            quarterNoteConfidence: 0.9, // High confidence for generated levels
            detectedBeatCount: detectedCount,
            mergedBeatCount: totalCount,
        };
    }

    /**
     * Build subdivision data from chart
     */
    private static buildSubdivisionData(chart: ChartedBeatMap): SubdivisionExportData {
        const beats = chart.beats.map((beat, index) => this.chartedBeatToExportBeat(beat, index, chart.detectedBeatIndices));

        // Build subdivision config from beats
        const subdivisionTypes = new Set<SubdivisionType>();
        const beatSubdivisions: [number, SubdivisionType][] = [];

        beats.forEach((beat, index) => {
            subdivisionTypes.add(beat.subdivisionType);
            beatSubdivisions.push([index, beat.subdivisionType]);
        });

        const config: SubdivisionConfigJSON = {
            beatSubdivisions,
            defaultSubdivision: 'sixteenth',
        };

        const subdivisionMetadata: SubdivisionMetadataJSON = {
            originalBeatCount: chart.beats.length - chart.detectedBeatIndices.length,
            subdividedBeatCount: chart.beats.length,
            averageDensityMultiplier: 1.0,
            explicitBeatCount: chart.detectedBeatIndices.length,
        };

        return {
            config,
            beats,
            metadata: subdivisionMetadata,
        };
    }

    /**
     * Convert a ChartedBeat to export format
     */
    private static chartedBeatToExportBeat(
        beat: ChartedBeat,
        index: number,
        detectedIndices: number[]
    ): FullExportSubdividedBeat {
        const isDetected = detectedIndices.includes(index);

        return {
            timestamp: beat.timestamp,
            beatInMeasure: beat.beatInMeasure,
            isDownbeat: beat.isDownbeat,
            measureNumber: beat.measureNumber,
            intensity: beat.intensity,
            confidence: beat.confidence,
            requiredKey: beat.requiredKey,
            isDetected,
            originalBeatIndex: isDetected ? index : undefined,
            subdivisionType: beat.subdivisionType,
            // Procedural extensions
            quarterNoteIndex: beat.quarterNoteIndex,
            subdivisionPosition: beat.subdivisionPosition,
            sourceBand: beat.sourceBand,
            quantizationError: beat.quantizationError,
        };
    }

    /**
     * Build chart export data from metadata
     *
     * Returns null if there are no key assignments (chart is null case)
     */
    private static buildChartExportData(
        chart: ChartedBeatMap,
        metadata: LevelMetadata
    ): ChartExportData | null {
        const keysUsed = chart.beats
            .map(b => b.requiredKey)
            .filter((k): k is string => k !== undefined);

        const uniqueKeys = [...new Set(keysUsed)];

        // Edge case: No key assignments - return null for chart
        if (uniqueKeys.length === 0) {
            return null;
        }

        return {
            style: metadata.controllerMode === 'ddr' ? 'ddr' : metadata.controllerMode === 'guitar_hero' ? 'guitar' : 'tap',
            keyCount: uniqueKeys.length,
            usedKeys: uniqueKeys,
        };
    }

    /**
     * Build procedural generation metadata
     */
    private static buildGenerationMetadata(
        metadata: LevelMetadata,
        pitchAnalysis: MelodyContourAnalysisResult | null
    ): ProceduralGenerationMetadata {
        const rhythmMeta = metadata.rhythmMetadata;

        return {
            difficulty: metadata.difficulty,
            pitchInfluenceWeight: metadata.generationConfig.buttons?.pitchInfluenceWeight ?? 1.0,
            patternsUsed: metadata.buttonMetadata.patternsUsed,
            controllerMode: metadata.controllerMode,
            seed: metadata.generationConfig.seed,
            generatedAt: new Date().toISOString(),
            directionStats: pitchAnalysis?.directionStats ?? undefined,
            intervalStats: pitchAnalysis?.intervalStats ?? undefined,
            rhythmMetadata: {
                difficulty: rhythmMeta.difficulty,
                bandsAnalyzed: rhythmMeta.bandsAnalyzed,
                transientsDetected: rhythmMeta.transientsDetected,
                averageDensity: rhythmMeta.averageDensity,
            },
        };
    }

    // ============================================================================
    // Import: FullBeatMapExportData → GeneratedLevel
    // ============================================================================

    /**
     * Convert FullBeatMapExportData to GeneratedLevel
     *
     * Note: The import creates a minimal but functional GeneratedLevel.
     * Some data (like original rhythm analysis) cannot be fully reconstructed
     * from the export format.
     *
     * @param data - The export data to import
     * @returns The reconstructed GeneratedLevel
     */
    static fromExportData(data: FullBeatMapExportData): GeneratedLevel {
        // Validate input
        const result = this.validate(data);
        if (!result.success || !result.data) {
            throw new Error(`Invalid export data: ${result.error ?? 'Unknown error'}`);
        }

        const validatedData = result.data;

        // Reconstruct chart
        const chart = this.reconstructChart(validatedData);

        // Reconstruct variant
        const variant = this.reconstructVariant(validatedData, chart);

        // Reconstruct rhythm (minimal)
        const rhythm = this.reconstructRhythm(validatedData, chart);

        // Reconstruct pitch analysis (if available)
        const pitchAnalysis = this.reconstructPitchAnalysis(validatedData);

        // Reconstruct metadata
        const metadata = this.reconstructMetadata(validatedData, chart);

        return {
            chart,
            variant,
            rhythm,
            pitchAnalysis,
            metadata,
        };
    }

    /**
     * Reconstruct ChartedBeatMap from export data
     *
     * Handles two cases:
     * 1. Normal case: subdivision data exists, use it for beats
     * 2. Edge case: subdivision is null, create beats from mergedBeats (interpolated only)
     */
    private static reconstructChart(data: FullBeatMapExportData): ChartedBeatMap {
        // Edge case: No subdivision data - create beats from mergedBeats
        if (!data.subdivision) {
            return this.reconstructChartFromMergedBeats(data);
        }

        const beats: ChartedBeat[] = data.subdivision.beats.map((beat, index) => ({
            timestamp: beat.timestamp,
            beatInMeasure: beat.beatInMeasure,
            isDownbeat: beat.isDownbeat,
            measureNumber: beat.measureNumber,
            intensity: beat.intensity,
            confidence: beat.confidence,
            requiredKey: beat.requiredKey,
            // Procedural generation fields
            quarterNoteIndex: beat.quarterNoteIndex ?? 0,
            subdivisionPosition: beat.subdivisionPosition ?? 0,
            isDetected: beat.isDetected,
            subdivisionType: beat.subdivisionType,
            sourceBand: beat.sourceBand ?? 'mid',
            quantizationError: beat.quantizationError,
        }));

        const detectedBeatIndices = data.subdivision.beats
            .map((beat, index) => (beat.isDetected ? index : -1))
            .filter(i => i >= 0);

        // Reconstruct downbeat config from beats (using segments format)
        const downbeatConfig: DownbeatConfig = this.reconstructDownbeatConfig(beats);

        // Reconstruct chart metadata
        const chartMetadata = this.reconstructChartMetadata(data);

        return {
            audioId: data.audioId,
            duration: data.duration,
            beats,
            detectedBeatIndices,
            downbeatConfig,
            quarterNoteInterval: data.interpolatedMetadata.quarterNoteInterval,
            bpm: data.quarterNoteBpm,
            chartMetadata,
        };
    }

    /**
     * Reconstruct ChartedBeatMap from mergedBeats when subdivision is null
     *
     * This handles the edge case where a level has only interpolated beats
     * without any subdivision applied. We create ChartedBeats from mergedBeats.
     */
    private static reconstructChartFromMergedBeats(data: FullBeatMapExportData): ChartedBeatMap {
        const beats: ChartedBeat[] = data.mergedBeats.map((beat, index) => ({
            timestamp: beat.timestamp,
            beatInMeasure: beat.beatInMeasure,
            isDownbeat: beat.isDownbeat,
            measureNumber: beat.measureNumber,
            intensity: beat.intensity,
            confidence: beat.confidence,
            requiredKey: beat.requiredKey,
            // Default procedural generation fields for interpolated-only beats
            quarterNoteIndex: index,
            subdivisionPosition: 0,
            isDetected: beat.source === 'detected',
            subdivisionType: 'quarter' as SubdivisionType,
            sourceBand: 'mid' as Band,
            quantizationError: beat.distanceToAnchor,
        }));

        const detectedBeatIndices = data.mergedBeats
            .map((beat, index) => (beat.source === 'detected' ? index : -1))
            .filter(i => i >= 0);

        const downbeatConfig: DownbeatConfig = this.reconstructDownbeatConfig(beats);
        const chartMetadata = this.reconstructChartMetadata(data);

        return {
            audioId: data.audioId,
            duration: data.duration,
            beats,
            detectedBeatIndices,
            downbeatConfig,
            quarterNoteInterval: data.interpolatedMetadata.quarterNoteInterval,
            bpm: data.quarterNoteBpm,
            chartMetadata,
        };
    }

    /**
     * Reconstruct downbeat config from beats (using segments format)
     */
    private static reconstructDownbeatConfig(beats: ChartedBeat[]): DownbeatConfig {
        const downbeats = beats.filter(b => b.isDownbeat);

        if (downbeats.length === 0) {
            // Default config if no downbeats found
            const defaultTimeSignature: TimeSignatureConfig = { beatsPerMeasure: 4 };
            return {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: defaultTimeSignature,
                }],
            };
        }

        // Create a single segment with the first downbeat
        const timeSignature: TimeSignatureConfig = { beatsPerMeasure: 4 };
        const segment: DownbeatSegment = {
            startBeat: 0,
            downbeatBeatIndex: downbeats[0]?.measureNumber ?? 0,
            timeSignature,
        };

        return {
            segments: [segment],
        };
    }

    /**
     * Reconstruct chart metadata from export data
     */
    private static reconstructChartMetadata(data: FullBeatMapExportData): ChartedBeatMap['chartMetadata'] {
        const genMeta = data.generationMetadata;

        return {
            difficulty: this.parseDifficultyLevel(genMeta?.difficulty),
            keysUsed: data.chart?.usedKeys ?? [],
            pitchInfluencedBeats: genMeta?.pitchInfluenceWeight && genMeta.pitchInfluenceWeight > 0
                ? data.subdivision?.beats.filter(b => b.requiredKey).length ?? 0
                : 0,
            patternsUsed: genMeta?.patternsUsed ?? [],
            rhythmMetadata: {
                difficulty: genMeta?.rhythmMetadata?.difficulty ?? 'medium',
                bandsAnalyzed: genMeta?.rhythmMetadata?.bandsAnalyzed ?? ['low', 'mid', 'high'],
                transientsDetected: genMeta?.rhythmMetadata?.transientsDetected ?? data.detectedBeats.length,
                averageDensity: genMeta?.rhythmMetadata?.averageDensity ?? 0.5,
                naturalDifficulty: this.parseDifficultyLevel(genMeta?.difficulty),
            },
            pitchMetadata: genMeta?.directionStats || genMeta?.intervalStats
                ? {
                    melodyRange: null,
                    directionStats: genMeta.directionStats ?? null,
                    intervalStats: genMeta.intervalStats ?? null,
                }
                : null,
            generatedAt: genMeta?.generatedAt ?? new Date().toISOString(),
            seed: genMeta?.seed,
        };
    }

    /**
     * Parse difficulty level from string
     */
    private static parseDifficultyLevel(value: string | undefined): DifficultyLevel {
        if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'natural' || value === 'custom') {
            return value;
        }
        return 'medium';
    }

    /**
     * Parse difficulty preset from string
     */
    private static parseDifficultyPreset(value: string | undefined): DifficultyPreset {
        if (value === 'easy' || value === 'medium' || value === 'hard' || value === 'natural' || value === 'custom') {
            return value;
        }
        return 'medium';
    }

    /**
     * Reconstruct difficulty variant from export data
     */
    private static reconstructVariant(
        data: FullBeatMapExportData,
        chart: ChartedBeatMap
    ): DifficultyVariant {
        const genMeta = data.generationMetadata;
        const difficulty = this.parseDifficultyLevel(genMeta?.difficulty);

        // Convert chart beats to variant beats (VariantBeat[])
        const beats = chart.beats.map((beat) => ({
            timestamp: beat.timestamp,
            beatIndex: beat.quarterNoteIndex,
            gridPosition: beat.subdivisionPosition,
            gridType: this.subdivisionTypeToGridType(beat.subdivisionType),
            intensity: beat.intensity,
            band: beat.sourceBand,
            quantizationError: beat.quantizationError,
            sourceBand: beat.sourceBand,
        }));

        return {
            difficulty,
            beats,
            isUnedited: true,
            editType: 'none',
            editAmount: 0,
            patternsInserted: genMeta?.patternsUsed,
        };
    }

    /**
     * Convert SubdivisionType to GridType
     */
    private static subdivisionTypeToGridType(subdivisionType: SubdivisionType): GridType {
        switch (subdivisionType) {
            case 'sixteenth':
            case 'eighth':
            case 'quarter':
                return 'straight_16th';
            case 'triplet8':
            case 'triplet4':
                return 'triplet_8th';
            default:
                return 'straight_16th';
        }
    }

    /**
     * Reconstruct minimal GeneratedRhythm from export data
     */
    private static reconstructRhythm(
        data: FullBeatMapExportData,
        chart: ChartedBeatMap
    ): GeneratedRhythm {
        const genMeta = data.generationMetadata;
        const difficulty = this.parseDifficultyLevel(genMeta?.difficulty);

        // Create minimal band streams from chart
        const createBandStream = (band: Band): GeneratedRhythmMap => ({
            audioId: data.audioId,
            duration: data.duration,
            beats: chart.beats
                .filter(b => b.sourceBand === band)
                .map(beat => ({
                    timestamp: beat.timestamp,
                    beatIndex: beat.quarterNoteIndex,
                    gridPosition: beat.subdivisionPosition,
                    gridType: this.subdivisionTypeToGridType(beat.subdivisionType),
                    intensity: beat.intensity,
                    band,
                    quantizationError: beat.quantizationError,
                })),
            gridDecisions: [],
            quarterNoteInterval: data.interpolatedMetadata.quarterNoteInterval,
        });

        const bandStreams = {
            low: createBandStream('low'),
            mid: createBandStream('mid'),
            high: createBandStream('high'),
        };

        const variant = this.reconstructVariant(data, chart);

        // Create composite stream
        const compositeBeats: CompositeBeat[] = chart.beats.map(beat => ({
            timestamp: beat.timestamp,
            beatIndex: beat.quarterNoteIndex,
            gridPosition: beat.subdivisionPosition,
            gridType: this.subdivisionTypeToGridType(beat.subdivisionType),
            intensity: beat.intensity,
            band: beat.sourceBand,
            quantizationError: beat.quantizationError,
            sourceBand: beat.sourceBand,
        }));

        // Count beats per band
        const beatsPerBand = { low: 0, mid: 0, high: 0 };
        for (const beat of compositeBeats) {
            beatsPerBand[beat.sourceBand]++;
        }

        const composite: CompositeStream = {
            beats: compositeBeats,
            sections: [],
            naturalDifficulty: difficulty as NaturalDifficulty,
            quarterNoteInterval: data.interpolatedMetadata.quarterNoteInterval,
            metadata: {
                totalBeats: compositeBeats.length,
                sectionCount: 0,
                beatsPerBand,
                sectionsPerBand: { low: 0, mid: 0, high: 0 },
            },
        };

        return {
            difficultyVariants: {
                easy: { ...variant, difficulty: 'easy' },
                medium: { ...variant, difficulty: 'medium' },
                hard: { ...variant, difficulty: 'hard' },
                natural: { ...variant, difficulty: 'natural' },
            },
            bandStreams,
            composite,
            analysis: {
                transientAnalysis: {
                    transients: data.detectedBeats.map(b => ({
                        timestamp: b.timestamp,
                        intensity: b.intensity,
                        band: 'mid' as Band,
                        detectionMethod: 'energy' as const,
                    })),
                    bandTransients: new Map([
                        ['low', []],
                        ['mid', data.detectedBeats.map(b => ({
                            timestamp: b.timestamp,
                            intensity: b.intensity,
                            band: 'mid' as Band,
                            detectionMethod: 'energy' as const,
                        }))],
                        ['high', []],
                    ]),
                    metadata: {
                        totalTransients: data.detectedBeats.length,
                        transientsPerBand: new Map([['low', 0], ['mid', data.detectedBeats.length], ['high', 0]]),
                        duration: data.duration,
                        averageIntensity: 0.5,
                        detectionMethodsUsed: ['energy'],
                    },
                },
                quantizationResult: {
                    streams: bandStreams,
                    metadata: {
                        densityValidation: {
                            isValid: true,
                            bands: {
                                low: {
                                    band: 'low',
                                    isValid: true,
                                    minIntervalDetected: Infinity,
                                    requiredMinInterval: 0.1,
                                    retryCount: 0,
                                    sensitivityReduction: 0,
                                    finalIntensityThreshold: 0,
                                    transientsRemaining: 0,
                                },
                                mid: {
                                    band: 'mid',
                                    isValid: true,
                                    minIntervalDetected: 0.1,
                                    requiredMinInterval: 0.1,
                                    retryCount: 0,
                                    sensitivityReduction: 0,
                                    finalIntensityThreshold: 0,
                                    transientsRemaining: data.detectedBeats.length,
                                },
                                high: {
                                    band: 'high',
                                    isValid: true,
                                    minIntervalDetected: Infinity,
                                    requiredMinInterval: 0.1,
                                    retryCount: 0,
                                    sensitivityReduction: 0,
                                    finalIntensityThreshold: 0,
                                    transientsRemaining: 0,
                                },
                            },
                            maxRetryCount: 0,
                            maxSensitivityReduction: 0,
                        },
                        transientsFilteredByIntensity: 0,
                        transientsFilteredByBand: {
                            low: 0,
                            mid: 0,
                            high: 0,
                        },
                    },
                },
                phraseAnalysis: {
                    phrases: [],
                    phrasesByBand: new Map([
                        ['low', []],
                        ['mid', []],
                        ['high', []],
                    ]),
                    mostSignificantPhrases: [],
                    phrasesBySize: new Map(),
                    patternLibrary: [],
                    bandAnalysis: {
                        low: { band: 'low', phrases: [], phrasesBySize: new Map(), phrasesWithVariation: [] },
                        mid: { band: 'mid', phrases: [], phrasesBySize: new Map(), phrasesWithVariation: [] },
                        high: { band: 'high', phrases: [], phrasesBySize: new Map(), phrasesWithVariation: [] },
                    },
                },
                densityAnalysis: {
                    sections: [],
                    perBeatDensity: [],
                    bandMetrics: {
                        low: {
                            band: 'low',
                            totalBeats: 0,
                            totalTransients: 0,
                            notesPerSecond: 1.0,
                            minNotesPerSecond: 0,
                            maxNotesPerSecond: 2.0,
                            variance: 0,
                            densityCategory: 'moderate',
                            naturalDifficulty: 'medium',
                            perBeatDensity: [],
                        },
                        mid: {
                            band: 'mid',
                            totalBeats: data.mergedBeats.length,
                            totalTransients: data.detectedBeats.length,
                            notesPerSecond: 1.0,
                            minNotesPerSecond: 0,
                            maxNotesPerSecond: 2.0,
                            variance: 0,
                            densityCategory: 'moderate',
                            naturalDifficulty: difficulty as NaturalDifficulty,
                            perBeatDensity: [],
                        },
                        high: {
                            band: 'high',
                            totalBeats: 0,
                            totalTransients: 0,
                            notesPerSecond: 1.0,
                            minNotesPerSecond: 0,
                            maxNotesPerSecond: 2.0,
                            variance: 0,
                            densityCategory: 'moderate',
                            naturalDifficulty: 'medium',
                            perBeatDensity: [],
                        },
                    },
                    combinedMetrics: {
                        totalTransients: data.detectedBeats.length,
                        notesPerSecond: 1.0,
                        densityCategory: 'moderate',
                        naturalDifficulty: difficulty as NaturalDifficulty,
                    },
                },
                scoringResult: {
                    sectionScores: [],
                    bandTotals: { low: 0, mid: 0, high: 0 },
                    bandAverages: { low: 0, mid: 0, high: 0 },
                    sectionWinners: [],
                    config: {
                        beatsPerSection: 8,
                        ioiVarianceWeight: 0.25,
                        syncopationWeight: 0.25,
                        phraseSignificanceWeight: 0.25,
                        densityWeight: 0.25,
                        offbeatGridPositions: {
                            straight_16th: [1, 3],
                            triplet_8th: [1, 2],
                            straight_8th: [1],
                        },
                    },
                },
            },
            metadata: this.buildFullRhythmMetadata(data, difficulty),
        };
    }

    /**
     * Build full RhythmMetadata for reconstructed rhythm
     */
    private static buildFullRhythmMetadata(data: FullBeatMapExportData, difficulty: DifficultyLevel): RhythmMetadata {
        const genMeta = data.generationMetadata;

        return {
            difficulty: this.parseDifficultyPreset(genMeta?.difficulty),
            bandsAnalyzed: ['low', 'mid', 'high'],
            transientsDetected: data.detectedBeats.length,
            transientsFilteredByIntensity: 0,
            densityValidationRetries: 0,
            phrasesDetected: 0,
            averageDensity: genMeta?.rhythmMetadata?.averageDensity ?? 0.5,
            naturalDifficulty: difficulty,
            generationConfig: {
                difficulty: this.parseDifficultyPreset(genMeta?.difficulty),
                outputMode: 'composite',
                measureStartOffset: 0,
                minimumTransientIntensity: 0.1,
                transientConfig: undefined,
                rhythmicBalanceConfig: {
                    strongBeatEmphasis: 'natural',
                    downbeatProximityRange: 2,
                    fillEmptyMeasures: true,
                    addedBeatIntensity: 0.45,
                    marginSeconds: 0.5,
                },
                seed: genMeta?.seed,
                verbose: false,
                enableCache: true,
                cacheMaxAge: 30 * 60 * 1000,
                skipDifficultyVariants: false,
            },
            duration: data.duration,
            totalBeats: data.mergedBeats.length,
        };
    }

    /**
     * Build minimal MelodyContour
     */
    private static buildMinimalMelodyContour(): MelodyContour {
        return {
            segments: [],
            direction: 'stable',
            range: {
                minNote: 'N/A',
                maxNote: 'N/A',
                semitones: 0,
            },
            shortTermDirection: 'stable',
            mediumTermDirection: 'stable',
            longTermDirection: 'stable',
        };
    }

    /**
     * Reconstruct pitch analysis from export data
     */
    private static reconstructPitchAnalysis(
        data: FullBeatMapExportData
    ): MelodyContourAnalysisResult | null {
        const genMeta = data.generationMetadata;

        if (!genMeta || (!genMeta.directionStats && !genMeta.intervalStats)) {
            return null;
        }

        // Create minimal pitch analysis result (composite contour only)
        return {
            pitchByBeat: [],
            melodyContour: this.buildMinimalMelodyContour(),
            directionStats: genMeta.directionStats ?? {
                up: 0,
                down: 0,
                stable: 0,
                none: 0,
            },
            intervalStats: genMeta.intervalStats ?? {
                unison: 0,
                small: 0,
                medium: 0,
                large: 0,
                very_large: 0,
            },
            metadata: {
                totalBeats: 0,
                voicedBeats: 0,
                directionCalculatedBeats: 0,
            },
        };
    }

    /**
     * Reconstruct level metadata from export data
     */
    private static reconstructMetadata(
        data: FullBeatMapExportData,
        chart: ChartedBeatMap
    ): LevelMetadata {
        const genMeta = data.generationMetadata;
        const difficulty = this.parseDifficultyPreset(genMeta?.difficulty);
        const controllerMode: ControllerMode = genMeta?.controllerMode ?? 'ddr';

        return {
            difficulty,
            controllerMode,
            rhythmMetadata: this.buildFullRhythmMetadata(data, this.parseDifficultyLevel(genMeta?.difficulty)),
            buttonMetadata: {
                controllerMode,
                keysUsed: data.chart?.usedKeys ?? [],
                pitchInfluencedBeats: genMeta?.pitchInfluenceWeight && genMeta.pitchInfluenceWeight > 0
                    ? chart.beats.filter(b => b.requiredKey).length
                    : 0,
                patternInfluencedBeats: chart.beats.filter(b => b.requiredKey).length -
                    (genMeta?.pitchInfluenceWeight && genMeta.pitchInfluenceWeight > 0
                        ? chart.beats.filter(b => b.requiredKey).length
                        : 0),
                patternsUsed: genMeta?.patternsUsed ?? [],
                buttonDistribution: new Map<string, number>(),
            },
            pitchMetadata: genMeta?.directionStats || genMeta?.intervalStats
                ? {
                    melodyRange: null,
                    directionStats: genMeta.directionStats ?? null,
                    intervalStats: genMeta.intervalStats ?? null,
                }
                : null,
            chartMetadata: {
                totalBeats: chart.beats.length,
                detectedBeats: chart.detectedBeatIndices.length,
                generatedBeats: chart.beats.length - chart.detectedBeatIndices.length,
            },
            generationConfig: {
                difficulty,
                controllerMode,
                rhythm: {},
                buttons: {
                    pitchInfluenceWeight: genMeta?.pitchInfluenceWeight ?? 1.0,
                },
                seed: genMeta?.seed,
            },
        };
    }

    // ============================================================================
    // JSON Serialization
    // ============================================================================

    /**
     * Serialize a GeneratedLevel to JSON string
     *
     * @param level - The level to serialize
     * @param options - Optional serialization options
     * @returns JSON string
     */
    static toJSON(level: GeneratedLevel, options: LevelSerializerOptions = {}): string {
        const exportData = this.toExportData(level, options);
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Deserialize a GeneratedLevel from JSON string
     *
     * @param json - The JSON string to parse
     * @returns The deserialized GeneratedLevel
     * @throws {Error} If the JSON is invalid or doesn't match expected format
     */
    static fromJSON(json: string): GeneratedLevel {
        let data: unknown;
        try {
            data = JSON.parse(json);
        } catch (e) {
            throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }

        const result = this.validate(data);
        if (!result.success || !result.data) {
            throw new Error(`Invalid level data: ${result.error ?? 'Unknown error'}`);
        }

        return this.fromExportData(result.data);
    }

    // ============================================================================
    // File I/O (Node.js only)
    // ============================================================================

    /**
     * Save a GeneratedLevel to a file (Node.js only)
     *
     * @param level - The level to save
     * @param filePath - Path to save the file
     * @param options - Optional serialization options
     * @throws {Error} If file cannot be written
     */
    static async saveToFile(
        level: GeneratedLevel,
        filePath: string,
        options: LevelSerializerOptions = {}
    ): Promise<void> {
        // Dynamic import for Node.js fs module
        const fs = await import('fs/promises');
        const json = this.toJSON(level, options);
        await fs.writeFile(filePath, json, 'utf-8');
    }

    /**
     * Load a GeneratedLevel from a file (Node.js only)
     *
     * @param filePath - Path to load the file from
     * @returns The loaded GeneratedLevel
     * @throws {Error} If file cannot be read or parsed
     */
    static async loadFromFile(filePath: string): Promise<GeneratedLevel> {
        // Dynamic import for Node.js fs module
        const fs = await import('fs/promises');
        const json = await fs.readFile(filePath, 'utf-8');
        return this.fromJSON(json);
    }

    // ============================================================================
    // Validation
    // ============================================================================

    /**
     * Validate unknown data as FullBeatMapExportData
     *
     * @param data - Unknown data to validate
     * @returns Validation result with data if successful
     */
    static validate(data: unknown): FullBeatMapImportResult {
        const warnings: string[] = [];

        // Basic type check
        if (typeof data !== 'object' || data === null) {
            return {
                success: false,
                error: 'Data must be a non-null object',
            };
        }

        const obj = data as Record<string, unknown>;

        // Check version
        if (obj.version !== 1) {
            return {
                success: false,
                error: `Unsupported version: ${obj.version}. Expected 1.`,
            };
        }

        // Check format
        if (obj.format !== 'full-beatmap') {
            return {
                success: false,
                error: `Invalid format: ${obj.format}. Expected 'full-beatmap'.`,
            };
        }

        // Check required fields
        const requiredFields = ['audioId', 'duration', 'quarterNoteBpm', 'detectedBeats', 'mergedBeats'];
        for (const field of requiredFields) {
            if (!(field in obj)) {
                return {
                    success: false,
                    error: `Missing required field: ${field}`,
                };
            }
        }

        // Validate arrays
        if (!Array.isArray(obj.detectedBeats)) {
            return {
                success: false,
                error: 'detectedBeats must be an array',
            };
        }

        if (!Array.isArray(obj.mergedBeats)) {
            return {
                success: false,
                error: 'mergedBeats must be an array',
            };
        }

        // Check subdivision exists (required for procedural levels)
        if (!obj.subdivision || typeof obj.subdivision !== 'object') {
            warnings.push('No subdivision data - level may not be playable');
        } else {
            const subdiv = obj.subdivision as Record<string, unknown>;
            if (!Array.isArray(subdiv.beats)) {
                return {
                    success: false,
                    error: 'subdivision.beats must be an array',
                };
            }
        }

        // Check chart exists (may be null if no key assignments)
        if (obj.chart === null) {
            warnings.push('No chart data - level has no key assignments');
        } else if (obj.chart !== undefined && typeof obj.chart !== 'object') {
            return {
                success: false,
                error: 'chart must be an object or null',
            };
        }

        // Validate interpolatedMetadata
        if (typeof obj.interpolatedMetadata !== 'object' || obj.interpolatedMetadata === null) {
            return {
                success: false,
                error: 'interpolatedMetadata must be an object',
            };
        }

        // Use the type guard for final validation
        if (!isFullBeatMapExportData(data)) {
            return {
                success: false,
                error: 'Data does not match FullBeatMapExportData format',
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        }

        return {
            success: true,
            data,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }

    // ============================================================================
    // Utility Methods
    // ============================================================================

    /**
     * Check if data represents a procedurally generated level
     *
     * @param data - Export data to check
     * @returns True if the level was procedurally generated
     */
    static isProcedural(data: FullBeatMapExportData): boolean {
        return data.generationSource === 'procedural';
    }

    /**
     * Get a summary of the level for display purposes
     *
     * @param data - Export data to summarize
     * @returns Human-readable summary
     */
    static getSummary(data: FullBeatMapExportData): string {
        const lines: string[] = [
            `Audio: ${data.audioId}`,
            `Duration: ${data.duration.toFixed(1)}s`,
            `BPM: ${data.quarterNoteBpm.toFixed(1)}`,
            `Beats: ${data.mergedBeats.length} (${data.detectedBeats.length} detected)`,
        ];

        if (data.chart) {
            lines.push(`Keys: ${data.chart.keyCount} (${data.chart.style})`);
            lines.push(`Keys used: ${data.chart.usedKeys.join(', ')}`);
        }

        if (data.generationMetadata) {
            lines.push(`Difficulty: ${data.generationMetadata.difficulty}`);
            lines.push(`Controller: ${data.generationMetadata.controllerMode}`);
            lines.push(`Pitch influence: ${(data.generationMetadata.pitchInfluenceWeight * 100).toFixed(0)}%`);
        }

        return lines.join('\n');
    }
}
