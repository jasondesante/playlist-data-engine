/**
 * Compatibility Tests for LevelSerializer
 *
 * Verifies that procedurally generated levels can be exported in a format
 * compatible with the playlist-data-showcase app's importFullBeatMap() function.
 *
 * These tests verify:
 * - Procedural level → Showcase import: Generate level in engine, save, load in showcase app
 * - All fields used by importFullBeatMap() are populated correctly
 * - Round-trip preservation of data
 *
 * Part of Phase 4.2.3 - Compatibility Verification
 */

import { describe, it, expect } from 'vitest';
import { LevelSerializer } from './LevelSerializer.js';
import type { GeneratedLevel, LevelMetadata } from '../generation/LevelGenerator.js';
import type { ChartedBeatMap, ChartedBeat } from '../types/ChartedBeatMap.js';
import type { GeneratedRhythm, RhythmMetadata, Band } from '../generation/RhythmGenerator.js';
import type { DifficultyVariant } from './beat/DifficultyVariantGenerator.js';
import type { MelodyContourAnalysisResult } from './MelodyContourAnalyzer.js';
import type { CompositeStream } from './beat/CompositeStreamGenerator.js';
import type {
    FullBeatMapExportData,
    FullExportDetectedBeat,
    FullExportMergedBeat,
    FullExportSubdividedBeat,
} from '../types/LevelExport.js';
import type { SubdivisionType, DownbeatConfig } from '../types/BeatMap.js';
import type { ControllerMode } from '../types/ButtonMapping.js';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock ChartedBeat for testing
 */
function createMockChartedBeat(
    index: number,
    timestamp: number,
    options: {
        quarterNoteIndex?: number;
        subdivisionPosition?: number;
        requiredKey?: string;
        isDetected?: boolean;
        subdivisionType?: SubdivisionType;
        sourceBand?: Band;
    } = {}
): ChartedBeat {
    const {
        quarterNoteIndex = Math.floor(index / 4),
        subdivisionPosition = index % 4,
        requiredKey = ['up', 'down', 'left', 'right'][index % 4],
        isDetected = index % 2 === 0,
        subdivisionType = 'sixteenth',
        sourceBand = 'mid',
    } = options;

    return {
        timestamp,
        beatInMeasure: (quarterNoteIndex % 4) + subdivisionPosition * 0.25,
        isDownbeat: quarterNoteIndex % 4 === 0 && subdivisionPosition === 0,
        measureNumber: Math.floor(quarterNoteIndex / 4),
        intensity: 0.8,
        confidence: isDetected ? 0.9 : 0.8,
        requiredKey,
        quarterNoteIndex,
        subdivisionPosition,
        isDetected,
        subdivisionType,
        sourceBand,
        quantizationError: isDetected ? undefined : 5,
    };
}

/**
 * Create a mock ChartedBeatMap for testing
 */
function createMockChartedBeatMap(
    duration: number = 10.0,
    bpm: number = 120,
    beatCount: number = 40
): ChartedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    const beats: ChartedBeat[] = [];
    const detectedBeatIndices: number[] = [];

    for (let i = 0; i < beatCount; i++) {
        const timestamp = (i / 4) * quarterNoteInterval; // 16th notes
        const isDetected = i % 2 === 0;

        beats.push(createMockChartedBeat(i, timestamp, {
            quarterNoteIndex: Math.floor(i / 4),
            subdivisionPosition: i % 4,
            isDetected,
        }));

        if (isDetected) {
            detectedBeatIndices.push(i);
        }
    }

    const downbeatConfig: DownbeatConfig = {
        segments: [{
            startBeat: 0,
            timeSignature: { beatsPerMeasure: 4, beatUnit: 4 },
        }],
    };

    return {
        audioId: 'test-audio-id-123',
        duration,
        beats,
        detectedBeatIndices,
        downbeatConfig,
        quarterNoteInterval,
        bpm,
        chartMetadata: {
            difficulty: 'medium',
            keysUsed: ['up', 'down', 'left', 'right'],
            pitchInfluencedBeats: 20,
            patternsUsed: ['alternating', 'roll'],
            rhythmMetadata: {
                difficulty: 'medium',
                bandsAnalyzed: ['low', 'mid', 'high'] as Band[],
                transientsDetected: detectedBeatIndices.length,
                averageDensity: 0.5,
                naturalDifficulty: 'medium',
            },
            pitchMetadata: {
                bandUsed: 'mid',
                melodyRange: { min: 'C4', max: 'G5' },
                directionStats: { up: 10, down: 8, stable: 5, none: 17 },
                intervalStats: { unison: 5, small: 12, medium: 8, large: 3, very_large: 2 },
            },
            generatedAt: new Date().toISOString(),
            seed: 'test-seed-123',
        },
    };
}

/**
 * Create a mock DifficultyVariant for testing
 */
function createMockDifficultyVariant(): DifficultyVariant {
    const beats = [];
    for (let i = 0; i < 40; i++) {
        beats.push({
            timestamp: (i / 4) * 0.5,
            beatIndex: Math.floor(i / 4),
            gridPosition: i % 4,
            gridType: 'straight_16th' as const,
            intensity: 0.8,
            band: 'mid' as Band,
            sourceBand: 'mid' as Band,
        });
    }

    return {
        difficulty: 'medium',
        beats,
        isUnedited: true,
        editType: 'none',
        editAmount: 0,
        patternsInserted: ['alternating'],
    };
}

/**
 * Create a mock GeneratedRhythm for testing
 */
function createMockGeneratedRhythm(chart: ChartedBeatMap): GeneratedRhythm {
    const variant = createMockDifficultyVariant();

    return {
        difficultyVariants: {
            easy: { ...variant, difficulty: 'easy' },
            medium: variant,
            hard: { ...variant, difficulty: 'hard' },
        },
        bandStreams: {
            low: { audioId: chart.audioId, duration: chart.duration, beats: [], gridDecisions: [] },
            mid: { audioId: chart.audioId, duration: chart.duration, beats: [], gridDecisions: [] },
            high: { audioId: chart.audioId, duration: chart.duration, beats: [], gridDecisions: [] },
        },
        composite: {
            beats: [],
            sections: [],
            naturalDifficulty: 'medium',
            quarterNoteInterval: chart.quarterNoteInterval,
            metadata: {
                totalBeats: chart.beats.length,
                sectionCount: 0,
                beatsPerBand: { low: 0, mid: chart.beats.length, high: 0 },
                sectionsPerBand: { low: 0, mid: 0, high: 0 },
            },
        },
        analysis: {
            transientAnalysis: {
                transients: chart.beats.filter((_, i) => chart.detectedBeatIndices.includes(i)).map(b => ({
                    timestamp: b.timestamp,
                    intensity: b.intensity,
                    band: 'mid' as Band,
                    detectionMethod: 'energy' as const,
                })),
                bandTransients: new Map([
                    ['low', []],
                    ['mid', chart.beats.filter((_, i) => chart.detectedBeatIndices.includes(i)).map(b => ({
                        timestamp: b.timestamp,
                        intensity: b.intensity,
                        band: 'mid' as Band,
                        detectionMethod: 'energy' as const,
                    }))],
                    ['high', []],
                ]),
                metadata: {
                    totalTransients: chart.detectedBeatIndices.length,
                    transientsPerBand: new Map([['low', 0], ['mid', chart.detectedBeatIndices.length], ['high', 0]]),
                    duration: chart.duration,
                    averageIntensity: 0.5,
                    detectionMethodsUsed: ['energy'],
                },
            },
            quantizationResult: {
                streams: {
                    low: { audioId: chart.audioId, duration: chart.duration, beats: [], gridDecisions: [] },
                    mid: { audioId: chart.audioId, duration: chart.duration, beats: [], gridDecisions: [] },
                    high: { audioId: chart.audioId, duration: chart.duration, beats: [], gridDecisions: [] },
                },
                metadata: {
                    densityValidation: {
                        isValid: true,
                        minIntervalDetected: 0.1,
                        requiredMinInterval: 0.1,
                        retryCount: 0,
                        sensitivityReduction: 0,
                    },
                    transientsFilteredByIntensity: 0,
                },
            },
            phraseAnalysis: {
                phrases: [],
                phrasesByBand: new Map([['low', []], ['mid', []], ['high', []]]),
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
                        band: 'low', totalBeats: 0, totalTransients: 0, transientsPerBeat: 0.5,
                        minTransientsPerBeat: 0, maxTransientsPerBeat: 1, variance: 0,
                        densityCategory: 'moderate', naturalDifficulty: 'medium', perBeatDensity: [],
                    },
                    mid: {
                        band: 'mid', totalBeats: chart.beats.length, totalTransients: chart.detectedBeatIndices.length,
                        transientsPerBeat: 0.5, minTransientsPerBeat: 0, maxTransientsPerBeat: 1, variance: 0,
                        densityCategory: 'moderate', naturalDifficulty: 'medium', perBeatDensity: [],
                    },
                    high: {
                        band: 'high', totalBeats: 0, totalTransients: 0, transientsPerBeat: 0.5,
                        minTransientsPerBeat: 0, maxTransientsPerBeat: 1, variance: 0,
                        densityCategory: 'moderate', naturalDifficulty: 'medium', perBeatDensity: [],
                    },
                },
                combinedMetrics: {
                    totalTransients: chart.detectedBeatIndices.length,
                    transientsPerBeat: 0.5,
                    densityCategory: 'moderate',
                    naturalDifficulty: 'medium',
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
                    offbeatGridPositions: { straight_16th: [1, 3], triplet_8th: [1, 2] },
                },
            },
        },
        metadata: {
            difficulty: 'medium',
            bandsAnalyzed: ['low', 'mid', 'high'] as Band[],
            transientsDetected: chart.detectedBeatIndices.length,
            transientsFilteredByIntensity: 0,
            densityValidationRetries: 0,
            phrasesDetected: 0,
            averageDensity: 0.5,
            naturalDifficulty: 'medium',
            generationConfig: {
                difficulty: 'medium',
                outputMode: 'composite',
                measureStartOffset: 0,
                minimumTransientIntensity: 0.1,
                seed: 'test-seed-123',
                verbose: false,
                enableCache: true,
                cacheMaxAge: 30 * 60 * 1000,
            },
            duration: chart.duration,
            totalBeats: chart.beats.length,
        },
    };
}

/**
 * Create a mock MelodyContourAnalysisResult for testing
 */
function createMockPitchAnalysis(): MelodyContourAnalysisResult {
    return {
        pitchByBeat: [],
        melodyContour: {
            segments: [],
            direction: 'mixed',
            range: { minNote: 'C4', maxNote: 'G5', semitones: 7 },
            shortTermDirection: 'up',
            mediumTermDirection: 'stable',
            longTermDirection: 'down',
        },
        directionStats: { up: 10, down: 8, stable: 5, none: 17 },
        intervalStats: { unison: 5, small: 12, medium: 8, large: 3, very_large: 2 },
        metadata: {
            totalBeats: 40,
            voicedBeats: 20,
            directionCalculatedBeats: 23,
        },
    };
}

/**
 * Create a mock LevelMetadata for testing
 */
function createMockLevelMetadata(chart: ChartedBeatMap): LevelMetadata {
    return {
        difficulty: 'medium',
        controllerMode: 'ddr' as ControllerMode,
        rhythmMetadata: {
            difficulty: 'medium',
            bandsAnalyzed: ['low', 'mid', 'high'] as Band[],
            transientsDetected: chart.detectedBeatIndices.length,
            transientsFilteredByIntensity: 0,
            densityValidationRetries: 0,
            phrasesDetected: 0,
            averageDensity: 0.5,
            naturalDifficulty: 'medium',
            generationConfig: {
                difficulty: 'medium',
                outputMode: 'composite',
                measureStartOffset: 0,
                minimumTransientIntensity: 0.1,
                seed: 'test-seed-123',
                verbose: false,
                enableCache: true,
                cacheMaxAge: 30 * 60 * 1000,
            },
            duration: chart.duration,
            totalBeats: chart.beats.length,
        },
        buttonMetadata: {
            keysUsed: ['up', 'down', 'left', 'right'],
            pitchInfluencedBeats: 20,
            patternsUsed: ['alternating', 'roll'],
        },
        pitchMetadata: {
            bandUsed: 'mid',
            melodyRange: { min: 'C4', max: 'G5' },
            directionStats: { up: 10, down: 8, stable: 5, none: 17 },
            intervalStats: { unison: 5, small: 12, medium: 8, large: 3, very_large: 2 },
        },
        chartMetadata: {
            totalBeats: chart.beats.length,
            detectedBeats: chart.detectedBeatIndices.length,
            generatedBeats: chart.beats.length - chart.detectedBeatIndices.length,
        },
        generationConfig: {
            difficulty: 'medium',
            controllerMode: 'ddr' as ControllerMode,
            rhythm: {},
            buttons: { pitchInfluenceWeight: 0.8 },
            seed: 'test-seed-123',
        },
    };
}

/**
 * Create a complete mock GeneratedLevel for testing
 */
function createMockGeneratedLevel(): GeneratedLevel {
    const chart = createMockChartedBeatMap();
    const variant = createMockDifficultyVariant();
    const rhythm = createMockGeneratedRhythm(chart);
    const pitchAnalysis = createMockPitchAnalysis();
    const metadata = createMockLevelMetadata(chart);

    return {
        chart,
        variant,
        rhythm,
        pitchAnalysis,
        metadata,
    };
}

/**
 * Create a mock GeneratedLevel with pitchInfluenceWeight: 0 (no pitch analysis)
 * This simulates a level generated with pattern-only mode
 */
function createMockGeneratedLevelWithoutPitch(): GeneratedLevel {
    const chart = createMockChartedBeatMap();
    const variant = createMockDifficultyVariant();
    const rhythm = createMockGeneratedRhythm(chart);

    // No pitch analysis when pitchInfluenceWeight is 0
    const pitchAnalysis = null;

    // Create metadata with pitchInfluenceWeight: 0 and no pitch metadata
    const metadata: LevelMetadata = {
        difficulty: 'medium',
        controllerMode: 'ddr' as ControllerMode,
        rhythmMetadata: {
            difficulty: 'medium',
            bandsAnalyzed: ['low', 'mid', 'high'] as Band[],
            transientsDetected: chart.detectedBeatIndices.length,
            transientsFilteredByIntensity: 0,
            densityValidationRetries: 0,
            phrasesDetected: 0,
            averageDensity: 0.5,
            naturalDifficulty: 'medium',
            generationConfig: {
                difficulty: 'medium',
                outputMode: 'composite',
                measureStartOffset: 0,
                minimumTransientIntensity: 0.1,
                seed: 'test-seed-pattern-only',
                verbose: false,
                enableCache: true,
                cacheMaxAge: 30 * 60 * 1000,
            },
            duration: chart.duration,
            totalBeats: chart.beats.length,
        },
        buttonMetadata: {
            keysUsed: ['up', 'down', 'left', 'right'],
            pitchInfluencedBeats: 0, // No pitch-influenced beats when pitchInfluenceWeight is 0
            patternsUsed: ['alternating', 'roll', 'stream'],
        },
        pitchMetadata: null, // No pitch metadata when pitchInfluenceWeight is 0
        chartMetadata: {
            totalBeats: chart.beats.length,
            detectedBeats: chart.detectedBeatIndices.length,
            generatedBeats: chart.beats.length - chart.detectedBeatIndices.length,
        },
        generationConfig: {
            difficulty: 'medium',
            controllerMode: 'ddr' as ControllerMode,
            rhythm: {},
            buttons: { pitchInfluenceWeight: 0 }, // Pattern-only mode
            seed: 'test-seed-pattern-only',
        },
    };

    return {
        chart,
        variant,
        rhythm,
        pitchAnalysis,
        metadata,
    };
}

// =============================================================================
// Compatibility Tests
// =============================================================================

describe('LevelSerializer Compatibility with Showcase App', () => {
    describe('Phase 4.2.3: Procedural level → Showcase import', () => {
        it('should export level with all required root-level fields', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            // Required root fields for showcase app
            expect(exportData.version).toBe(1);
            expect(exportData.format).toBe('full-beatmap');
            expect(exportData.audioId).toBeDefined();
            expect(typeof exportData.audioId).toBe('string');
            expect(exportData.duration).toBeGreaterThan(0);
            expect(exportData.quarterNoteBpm).toBeGreaterThan(0);
            expect(exportData.quarterNoteConfidence).toBeGreaterThanOrEqual(0);
            expect(exportData.exportedAt).toBeGreaterThan(0);

            console.log('✓ Root-level fields verified');
            console.log(`  version: ${exportData.version}`);
            console.log(`  format: ${exportData.format}`);
            console.log(`  audioId: ${exportData.audioId}`);
            console.log(`  duration: ${exportData.duration}s`);
            console.log(`  BPM: ${exportData.quarterNoteBpm}`);
        });

        it('should export detectedBeats array in correct format', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            // detectedBeats must be an array
            expect(Array.isArray(exportData.detectedBeats)).toBe(true);
            expect(exportData.detectedBeats.length).toBeGreaterThan(0);

            // Check structure of first detected beat
            const beat = exportData.detectedBeats[0] as FullExportDetectedBeat;
            expect(beat.timestamp).toBeDefined();
            expect(typeof beat.timestamp).toBe('number');
            expect(beat.beatInMeasure).toBeDefined();
            expect(typeof beat.beatInMeasure).toBe('number');
            expect(beat.isDownbeat).toBeDefined();
            expect(typeof beat.isDownbeat).toBe('boolean');
            expect(beat.measureNumber).toBeDefined();
            expect(typeof beat.measureNumber).toBe('number');
            expect(beat.intensity).toBeDefined();
            expect(typeof beat.intensity).toBe('number');
            expect(beat.confidence).toBeDefined();
            expect(typeof beat.confidence).toBe('number');

            console.log('✓ detectedBeats format verified');
            console.log(`  Count: ${exportData.detectedBeats.length}`);
            console.log(`  First beat: timestamp=${beat.timestamp}, beatInMeasure=${beat.beatInMeasure}`);
        });

        it('should export mergedBeats array in correct format', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            // mergedBeats must be an array
            expect(Array.isArray(exportData.mergedBeats)).toBe(true);
            expect(exportData.mergedBeats.length).toBeGreaterThan(0);

            // Check structure of merged beats
            const beat = exportData.mergedBeats[0] as FullExportMergedBeat;
            expect(beat.timestamp).toBeDefined();
            expect(beat.beatInMeasure).toBeDefined();
            expect(beat.isDownbeat).toBeDefined();
            expect(beat.measureNumber).toBeDefined();
            expect(beat.intensity).toBeDefined();
            expect(beat.confidence).toBeDefined();
            expect(beat.source).toBeDefined();
            expect(['detected', 'interpolated']).toContain(beat.source);

            console.log('✓ mergedBeats format verified');
            console.log(`  Count: ${exportData.mergedBeats.length}`);
            console.log(`  Sources: detected=${exportData.mergedBeats.filter(b => b.source === 'detected').length}, interpolated=${exportData.mergedBeats.filter(b => b.source === 'interpolated').length}`);
        });

        it('should export interpolatedMetadata in correct format', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            const meta = exportData.interpolatedMetadata;
            expect(meta).toBeDefined();
            expect(meta.quarterNoteInterval).toBeGreaterThan(0);
            expect(meta.quarterNoteBpm).toBeGreaterThan(0);
            expect(meta.quarterNoteConfidence).toBeGreaterThanOrEqual(0);
            expect(meta.detectedBeatCount).toBeGreaterThanOrEqual(0);
            expect(meta.mergedBeatCount).toBeGreaterThan(0);

            console.log('✓ interpolatedMetadata format verified');
            console.log(`  quarterNoteInterval: ${meta.quarterNoteInterval}`);
            console.log(`  detectedBeatCount: ${meta.detectedBeatCount}`);
            console.log(`  mergedBeatCount: ${meta.mergedBeatCount}`);
        });

        it('should export subdivision data in correct format', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            // subdivision must exist and have correct structure
            expect(exportData.subdivision).toBeDefined();
            expect(exportData.subdivision).not.toBeNull();

            if (exportData.subdivision) {
                // Check config
                expect(exportData.subdivision.config).toBeDefined();
                expect(Array.isArray(exportData.subdivision.config.beatSubdivisions)).toBe(true);
                expect(exportData.subdivision.config.defaultSubdivision).toBeDefined();

                // Check beats array
                expect(Array.isArray(exportData.subdivision.beats)).toBe(true);
                expect(exportData.subdivision.beats.length).toBeGreaterThan(0);

                // Check metadata
                expect(exportData.subdivision.metadata).toBeDefined();
                expect(exportData.subdivision.metadata.originalBeatCount).toBeGreaterThanOrEqual(0);
                expect(exportData.subdivision.metadata.subdividedBeatCount).toBeGreaterThan(0);

                console.log('✓ subdivision format verified');
                console.log(`  beats count: ${exportData.subdivision.beats.length}`);
                console.log(`  defaultSubdivision: ${exportData.subdivision.config.defaultSubdivision}`);
            }
        });

        it('should export subdivision beats with all required fields', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            if (!exportData.subdivision) {
                expect.fail('subdivision should exist');
            }

            const beat = exportData.subdivision.beats[0] as FullExportSubdividedBeat;

            // Required fields for showcase app
            expect(beat.timestamp).toBeDefined();
            expect(beat.beatInMeasure).toBeDefined();
            expect(beat.isDownbeat).toBeDefined();
            expect(beat.measureNumber).toBeDefined();
            expect(beat.intensity).toBeDefined();
            expect(beat.confidence).toBeDefined();
            expect(beat.isDetected).toBeDefined();
            expect(beat.subdivisionType).toBeDefined();

            // requiredKey should be present for charted levels
            expect(beat.requiredKey).toBeDefined();

            console.log('✓ subdivision beats fields verified');
            console.log(`  First beat: timestamp=${beat.timestamp}, requiredKey=${beat.requiredKey}`);
        });

        it('should export chart data in correct format', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            // chart should exist for charted levels
            expect(exportData.chart).toBeDefined();
            expect(exportData.chart).not.toBeNull();

            if (exportData.chart) {
                expect(exportData.chart.style).toBeDefined();
                expect(['ddr', 'guitar']).toContain(exportData.chart.style);
                expect(exportData.chart.keyCount).toBeGreaterThan(0);
                expect(Array.isArray(exportData.chart.usedKeys)).toBe(true);
                expect(exportData.chart.usedKeys.length).toBeGreaterThan(0);

                console.log('✓ chart format verified');
                console.log(`  style: ${exportData.chart.style}`);
                console.log(`  keyCount: ${exportData.chart.keyCount}`);
                console.log(`  usedKeys: ${exportData.chart.usedKeys.join(', ')}`);
            }
        });

        it('should include procedural generation metadata', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            // Should mark as procedural
            expect(exportData.generationSource).toBe('procedural');

            // Should include generation metadata
            expect(exportData.generationMetadata).toBeDefined();

            if (exportData.generationMetadata) {
                expect(exportData.generationMetadata.difficulty).toBeDefined();
                expect(exportData.generationMetadata.pitchInfluenceWeight).toBeDefined();
                expect(exportData.generationMetadata.controllerMode).toBeDefined();
                expect(exportData.generationMetadata.generatedAt).toBeDefined();

                console.log('✓ Procedural metadata verified');
                console.log(`  generationSource: ${exportData.generationSource}`);
                console.log(`  difficulty: ${exportData.generationMetadata.difficulty}`);
                console.log(`  controllerMode: ${exportData.generationMetadata.controllerMode}`);
            }
        });

        it('should include procedural extensions on subdivision beats', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            if (!exportData.subdivision) {
                expect.fail('subdivision should exist');
            }

            // Check that procedural extensions are present
            const beatsWithProceduralExtensions = exportData.subdivision.beats.filter(
                beat => beat.quarterNoteIndex !== undefined ||
                        beat.subdivisionPosition !== undefined ||
                        beat.sourceBand !== undefined
            );

            expect(beatsWithProceduralExtensions.length).toBeGreaterThan(0);

            const beat = beatsWithProceduralExtensions[0] as FullExportSubdividedBeat;
            console.log('✓ Procedural extensions on beats verified');
            console.log(`  Beats with extensions: ${beatsWithProceduralExtensions.length}`);
            console.log(`  Sample: quarterNoteIndex=${beat.quarterNoteIndex}, subdivisionPosition=${beat.subdivisionPosition}, sourceBand=${beat.sourceBand}`);
        });

        it('should produce valid JSON for serialization', () => {
            const level = createMockGeneratedLevel();
            const json = LevelSerializer.toJSON(level);

            expect(typeof json).toBe('string');
            expect(json.length).toBeGreaterThan(0);

            // Should be parseable
            const parsed = JSON.parse(json);
            expect(parsed.version).toBe(1);
            expect(parsed.format).toBe('full-beatmap');

            console.log('✓ JSON serialization verified');
            console.log(`  JSON length: ${json.length} characters`);
        });
    });

    describe('Round-trip: Save → Load → Save', () => {
        it('should preserve all essential data through round-trip', () => {
            const originalLevel = createMockGeneratedLevel();

            // Export to JSON
            const json1 = LevelSerializer.toJSON(originalLevel);

            // Import back
            const importedLevel = LevelSerializer.fromJSON(json1);

            // Export again
            const json2 = LevelSerializer.toJSON(importedLevel);

            // Parse both for comparison
            const data1 = JSON.parse(json1) as FullBeatMapExportData;
            const data2 = JSON.parse(json2) as FullBeatMapExportData;

            // Compare key fields
            expect(data2.audioId).toBe(data1.audioId);
            expect(data2.duration).toBe(data1.duration);
            expect(data2.quarterNoteBpm).toBe(data1.quarterNoteBpm);
            expect(data2.detectedBeats.length).toBe(data1.detectedBeats.length);
            expect(data2.mergedBeats.length).toBe(data1.mergedBeats.length);

            if (data1.subdivision && data2.subdivision) {
                expect(data2.subdivision.beats.length).toBe(data1.subdivision.beats.length);
            }

            console.log('✓ Round-trip preservation verified');
            console.log(`  audioId preserved: ${data1.audioId} → ${data2.audioId}`);
            console.log(`  beats preserved: ${data1.mergedBeats.length} → ${data2.mergedBeats.length}`);
        });

        it('should preserve required keys through round-trip', () => {
            const originalLevel = createMockGeneratedLevel();

            // Export
            const exportData = LevelSerializer.toExportData(originalLevel);

            // Import
            const importedLevel = LevelSerializer.fromExportData(exportData);

            // Check that beats still have keys
            const originalKeys = originalLevel.chart.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined);

            const importedKeys = importedLevel.chart.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined);

            expect(importedKeys.length).toBe(originalKeys.length);

            console.log('✓ Keys preserved through round-trip');
            console.log(`  Original keys: ${originalKeys.length}`);
            console.log(`  Imported keys: ${importedKeys.length}`);
        });

        it('should preserve procedural metadata through round-trip', () => {
            const originalLevel = createMockGeneratedLevel();

            // Export
            const exportData = LevelSerializer.toExportData(originalLevel);

            // Import
            const importedLevel = LevelSerializer.fromExportData(exportData);

            // Check procedural metadata
            expect(exportData.generationSource).toBe('procedural');
            expect(exportData.generationMetadata).toBeDefined();

            if (exportData.generationMetadata) {
                expect(exportData.generationMetadata.difficulty).toBe('medium');
                expect(exportData.generationMetadata.controllerMode).toBe('ddr');
            }

            console.log('✓ Procedural metadata preserved');
            console.log(`  generationSource: ${exportData.generationSource}`);
            console.log(`  difficulty: ${exportData.generationMetadata?.difficulty}`);
        });
    });

    describe('Validation', () => {
        it('should validate export data format', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            const result = LevelSerializer.validate(exportData);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();

            console.log('✓ Validation passed for valid export data');
        });

        it('should reject invalid version', () => {
            const invalidData = {
                version: 2,
                format: 'full-beatmap',
                audioId: 'test',
                duration: 10,
                quarterNoteBpm: 120,
                quarterNoteConfidence: 0.9,
                detectedBeats: [],
                mergedBeats: [],
                interpolatedMetadata: { quarterNoteInterval: 0.5, quarterNoteBpm: 120, quarterNoteConfidence: 0.9, detectedBeatCount: 0, mergedBeatCount: 0 },
            };

            const result = LevelSerializer.validate(invalidData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('version');

            console.log('✓ Correctly rejected invalid version');
        });

        it('should reject invalid format', () => {
            const invalidData = {
                version: 1,
                format: 'wrong-format',
                audioId: 'test',
                duration: 10,
                quarterNoteBpm: 120,
                quarterNoteConfidence: 0.9,
                detectedBeats: [],
                mergedBeats: [],
                interpolatedMetadata: { quarterNoteInterval: 0.5, quarterNoteBpm: 120, quarterNoteConfidence: 0.9, detectedBeatCount: 0, mergedBeatCount: 0 },
            };

            const result = LevelSerializer.validate(invalidData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('format');

            console.log('✓ Correctly rejected invalid format');
        });

        it('should reject missing required fields', () => {
            const invalidData = {
                version: 1,
                format: 'full-beatmap',
                // missing audioId
                duration: 10,
                quarterNoteBpm: 120,
                quarterNoteConfidence: 0.9,
                detectedBeats: [],
                mergedBeats: [],
                interpolatedMetadata: { quarterNoteInterval: 0.5, quarterNoteBpm: 120, quarterNoteConfidence: 0.9, detectedBeatCount: 0, mergedBeatCount: 0 },
            };

            const result = LevelSerializer.validate(invalidData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('audioId');

            console.log('✓ Correctly rejected missing audioId');
        });
    });

    describe('Phase 4.2.3: Manual chart → Engine import', () => {
        /**
         * Create mock manual chart export data (like what the showcase app exports)
         * This simulates data from the playlist-data-showcase app's exportFullBeatMap()
         */
        function createMockManualChartExportData(): FullBeatMapExportData {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const duration = 10.0;
            const beatCount = 40; // 16th notes for 10 seconds at 120 BPM

            // Create detected beats (quarter notes)
            const detectedBeats: FullExportDetectedBeat[] = [];
            for (let i = 0; i < Math.floor(duration / quarterNoteInterval); i++) {
                detectedBeats.push({
                    timestamp: i * quarterNoteInterval,
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                    intensity: 0.8,
                    confidence: 0.9,
                });
            }

            // Create merged beats (includes interpolated)
            const mergedBeats: FullExportMergedBeat[] = [];
            for (let i = 0; i < beatCount; i++) {
                const quarterIndex = Math.floor(i / 4);
                const subPosition = i % 4;
                mergedBeats.push({
                    timestamp: (quarterIndex + subPosition * 0.25) * quarterNoteInterval,
                    beatInMeasure: (quarterIndex % 4) + subPosition * 0.25,
                    isDownbeat: quarterIndex % 4 === 0 && subPosition === 0,
                    measureNumber: Math.floor(quarterIndex / 4),
                    intensity: 0.7,
                    confidence: 0.8,
                    requiredKey: ['up', 'down', 'left', 'right'][i % 4],
                    source: i % 4 === 0 ? 'detected' : 'interpolated',
                });
            }

            // Create subdivision beats (no procedural extensions)
            const subdivisionBeats: FullExportSubdividedBeat[] = mergedBeats.map((beat, index) => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
                requiredKey: beat.requiredKey,
                isDetected: beat.source === 'detected',
                originalBeatIndex: beat.source === 'detected' ? index : undefined,
                subdivisionType: 'sixteenth' as SubdivisionType,
                // NO procedural extensions (quarterNoteIndex, subdivisionPosition, sourceBand, quantizationError)
            }));

            return {
                version: 1,
                format: 'full-beatmap',
                audioId: 'manual-chart-audio-123',
                audioTitle: 'Manual Chart Test Song',
                exportedAt: Date.now(),
                duration,
                quarterNoteBpm: bpm,
                quarterNoteConfidence: 0.85,
                detectedBeats,
                mergedBeats,
                interpolatedMetadata: {
                    quarterNoteInterval,
                    quarterNoteBpm: bpm,
                    quarterNoteConfidence: 0.85,
                    detectedBeatCount: detectedBeats.length,
                    mergedBeatCount: mergedBeats.length,
                },
                subdivision: {
                    config: {
                        beatSubdivisions: subdivisionBeats.map((_, i) => [i, 'sixteenth' as SubdivisionType]),
                        defaultSubdivision: 'sixteenth',
                    },
                    beats: subdivisionBeats,
                    metadata: {
                        originalBeatCount: detectedBeats.length,
                        subdividedBeatCount: subdivisionBeats.length,
                        averageDensityMultiplier: 1.0,
                        explicitBeatCount: detectedBeats.length,
                    },
                },
                chart: {
                    style: 'ddr',
                    keyCount: 4,
                    usedKeys: ['up', 'down', 'left', 'right'],
                },
                // NO generationSource or generationMetadata for manual charts
            };
        }

        it('should import manual chart without generation metadata', () => {
            const exportData = createMockManualChartExportData();

            // Validate first
            const result = LevelSerializer.validate(exportData);
            expect(result.success).toBe(true);

            // Import
            const level = LevelSerializer.fromExportData(exportData);

            expect(level).toBeDefined();
            expect(level.chart).toBeDefined();
            expect(level.chart.audioId).toBe('manual-chart-audio-123');

            console.log('✓ Manual chart imported successfully');
            console.log(`  audioId: ${level.chart.audioId}`);
            console.log(`  beats: ${level.chart.beats.length}`);
        });

        it('should reconstruct chart beats from manual chart', () => {
            const exportData = createMockManualChartExportData();
            const level = LevelSerializer.fromExportData(exportData);

            // Check chart beats
            expect(level.chart.beats.length).toBe(40);

            // Check that beats have required keys
            const keysUsed = level.chart.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined);
            expect(keysUsed.length).toBe(40);

            // Check unique keys
            const uniqueKeys = [...new Set(keysUsed)];
            expect(uniqueKeys).toContain('up');
            expect(uniqueKeys).toContain('down');
            expect(uniqueKeys).toContain('left');
            expect(uniqueKeys).toContain('right');

            console.log('✓ Manual chart beats reconstructed');
            console.log(`  Total beats: ${level.chart.beats.length}`);
            console.log(`  Keys: ${uniqueKeys.join(', ')}`);
        });

        it('should use default values for missing procedural fields', () => {
            const exportData = createMockManualChartExportData();
            const level = LevelSerializer.fromExportData(exportData);

            // Check that chart beats have default values for procedural fields
            const beat = level.chart.beats[0];

            // These should have defaults since manual chart doesn't have them
            expect(beat.quarterNoteIndex).toBeDefined(); // defaults to 0
            expect(beat.subdivisionPosition).toBeDefined(); // defaults to 0
            expect(beat.sourceBand).toBeDefined(); // defaults to 'mid'
            expect(beat.isDetected).toBeDefined();

            console.log('✓ Default values applied for procedural fields');
            console.log(`  quarterNoteIndex: ${beat.quarterNoteIndex}`);
            console.log(`  subdivisionPosition: ${beat.subdivisionPosition}`);
            console.log(`  sourceBand: ${beat.sourceBand}`);
        });

        it('should not identify manual chart as procedural', () => {
            const exportData = createMockManualChartExportData();

            expect(LevelSerializer.isProcedural(exportData)).toBe(false);

            console.log('✓ Manual chart not identified as procedural');
        });

        it('should reconstruct metadata for manual chart', () => {
            const exportData = createMockManualChartExportData();
            const level = LevelSerializer.fromExportData(exportData);

            // Check metadata exists
            expect(level.metadata).toBeDefined();

            // Should have default difficulty (medium) since manual chart doesn't specify
            expect(level.metadata.difficulty).toBe('medium');

            // Should have default controller mode
            expect(level.metadata.controllerMode).toBeDefined();

            // rhythmMetadata should exist with defaults
            expect(level.metadata.rhythmMetadata).toBeDefined();
            expect(level.metadata.rhythmMetadata.bandsAnalyzed).toEqual(['low', 'mid', 'high']);

            console.log('✓ Metadata reconstructed for manual chart');
            console.log(`  difficulty: ${level.metadata.difficulty}`);
            console.log(`  controllerMode: ${level.metadata.controllerMode}`);
        });

        it('should reconstruct variant for manual chart', () => {
            const exportData = createMockManualChartExportData();
            const level = LevelSerializer.fromExportData(exportData);

            // Check variant exists
            expect(level.variant).toBeDefined();
            expect(level.variant.difficulty).toBe('medium');
            expect(level.variant.beats.length).toBe(40);

            console.log('✓ Variant reconstructed for manual chart');
            console.log(`  difficulty: ${level.variant.difficulty}`);
            console.log(`  beats: ${level.variant.beats.length}`);
        });

        it('should reconstruct rhythm for manual chart', () => {
            const exportData = createMockManualChartExportData();
            const level = LevelSerializer.fromExportData(exportData);

            // Check rhythm exists
            expect(level.rhythm).toBeDefined();
            expect(level.rhythm.bandStreams).toBeDefined();
            expect(level.rhythm.composite).toBeDefined();

            // Should have all three band streams
            expect(level.rhythm.bandStreams.low).toBeDefined();
            expect(level.rhythm.bandStreams.mid).toBeDefined();
            expect(level.rhythm.bandStreams.high).toBeDefined();

            console.log('✓ Rhythm reconstructed for manual chart');
            console.log(`  composite beats: ${level.rhythm.composite.beats.length}`);
        });

        it('should have null pitch analysis for manual chart', () => {
            const exportData = createMockManualChartExportData();
            const level = LevelSerializer.fromExportData(exportData);

            // Manual charts without generationMetadata.pitchBand should have null pitch analysis
            expect(level.pitchAnalysis).toBeNull();

            console.log('✓ Pitch analysis is null for manual chart without pitch metadata');
        });

        it('should preserve keys through manual chart round-trip', () => {
            const exportData = createMockManualChartExportData();

            // Import
            const level = LevelSerializer.fromExportData(exportData);

            // Export again
            const reexportData = LevelSerializer.toExportData(level);

            // Check keys preserved
            expect(reexportData.chart).toBeDefined();
            expect(reexportData.chart?.usedKeys).toContain('up');
            expect(reexportData.chart?.usedKeys).toContain('down');
            expect(reexportData.chart?.usedKeys).toContain('left');
            expect(reexportData.chart?.usedKeys).toContain('right');

            // Check beats have keys
            const originalKeys = exportData.subdivision?.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined) ?? [];

            const reimportedKeys = reexportData.subdivision?.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined) ?? [];

            expect(reimportedKeys.length).toBe(originalKeys.length);

            console.log('✓ Keys preserved through manual chart round-trip');
            console.log(`  Original keys: ${originalKeys.length}`);
            console.log(`  Re-imported keys: ${reimportedKeys.length}`);
        });

        it('should handle manual chart with explicit generationSource: manual', () => {
            const exportData = createMockManualChartExportData();
            exportData.generationSource = 'manual';

            // Should still validate and import
            const result = LevelSerializer.validate(exportData);
            expect(result.success).toBe(true);

            const level = LevelSerializer.fromExportData(exportData);
            expect(level).toBeDefined();

            // Should NOT be identified as procedural
            expect(LevelSerializer.isProcedural(exportData)).toBe(false);

            console.log('✓ Manual chart with explicit generationSource handled');
        });

        it('should import manual chart with guitar hero style', () => {
            const exportData = createMockManualChartExportData();
            exportData.chart = {
                style: 'guitar',
                keyCount: 5,
                usedKeys: ['1', '2', '3', '4', '5'],
            };

            // Update beat keys to match guitar hero style
            if (exportData.subdivision) {
                exportData.subdivision.beats = exportData.subdivision.beats.map((beat, i) => ({
                    ...beat,
                    requiredKey: String((i % 5) + 1),
                }));
            }

            const level = LevelSerializer.fromExportData(exportData);

            // Should have guitar hero keys
            const uniqueKeys = [...new Set(level.chart.beats.map(b => b.requiredKey).filter((k): k is string => k !== undefined))];
            expect(uniqueKeys.length).toBe(5);

            console.log('✓ Guitar Hero style manual chart imported');
            console.log(`  Keys: ${uniqueKeys.join(', ')}`);
        });
    });

    describe('Utility Functions', () => {
        it('should identify procedural levels', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            expect(LevelSerializer.isProcedural(exportData)).toBe(true);

            console.log('✓ isProcedural correctly identifies procedural levels');
        });

        it('should identify manual levels', () => {
            // Create manual chart export data
            const manualExportData: FullBeatMapExportData = {
                version: 1,
                format: 'full-beatmap',
                audioId: 'manual-test',
                duration: 10,
                quarterNoteBpm: 120,
                quarterNoteConfidence: 0.9,
                detectedBeats: [],
                mergedBeats: [],
                interpolatedMetadata: {
                    quarterNoteInterval: 0.5,
                    quarterNoteBpm: 120,
                    quarterNoteConfidence: 0.9,
                    detectedBeatCount: 0,
                    mergedBeatCount: 0,
                },
                subdivision: null,
                chart: null,
                // No generationSource = manual
            };

            expect(LevelSerializer.isProcedural(manualExportData)).toBe(false);

            console.log('✓ isProcedural correctly identifies manual levels');
        });

        it('should generate readable summary', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            const summary = LevelSerializer.getSummary(exportData);

            expect(typeof summary).toBe('string');
            expect(summary).toContain('test-audio-id-123');
            expect(summary).toContain('BPM:');

            console.log('✓ Summary generated:');
            console.log(summary.split('\n').map(line => `  ${line}`).join('\n'));
        });
    });

    describe('Phase 4.2.4: Edge Cases - pitchInfluenceWeight = 0', () => {
        it('should export level with pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);

            // Check that pitchInfluenceWeight is preserved as 0
            expect(exportData.generationSource).toBe('procedural');
            expect(exportData.generationMetadata).toBeDefined();
            expect(exportData.generationMetadata?.pitchInfluenceWeight).toBe(0);

            console.log('✓ Level with pitchInfluenceWeight = 0 exported correctly');
            console.log(`  pitchInfluenceWeight: ${exportData.generationMetadata?.pitchInfluenceWeight}`);
        });

        it('should not include pitch metadata when pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);

            // pitchBand, directionStats, intervalStats should be undefined
            expect(exportData.generationMetadata?.pitchBand).toBeUndefined();
            expect(exportData.generationMetadata?.directionStats).toBeUndefined();
            expect(exportData.generationMetadata?.intervalStats).toBeUndefined();

            console.log('✓ Pitch metadata correctly omitted when pitchInfluenceWeight = 0');
        });

        it('should import level with pitchInfluenceWeight = 0 and null pitchAnalysis', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);

            // Import back
            const importedLevel = LevelSerializer.fromExportData(exportData);

            // pitchAnalysis should be null
            expect(importedLevel.pitchAnalysis).toBeNull();

            console.log('✓ Imported level has null pitchAnalysis when pitchInfluenceWeight = 0');
        });

        it('should have pitchMetadata = null when pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);
            const importedLevel = LevelSerializer.fromExportData(exportData);

            // pitchMetadata should be null
            expect(importedLevel.metadata.pitchMetadata).toBeNull();

            console.log('✓ pitchMetadata is null when pitchInfluenceWeight = 0');
        });

        it('should have pitchInfluencedBeats = 0 when pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);
            const importedLevel = LevelSerializer.fromExportData(exportData);

            // pitchInfluencedBeats should be 0
            expect(importedLevel.metadata.buttonMetadata.pitchInfluencedBeats).toBe(0);

            console.log('✓ pitchInfluencedBeats is 0 when pitchInfluenceWeight = 0');
        });

        it('should preserve pitchInfluenceWeight = 0 through round-trip', () => {
            const level = createMockGeneratedLevelWithoutPitch();

            // Export
            const exportData = LevelSerializer.toExportData(level);

            // Import
            const importedLevel = LevelSerializer.fromExportData(exportData);

            // Re-export
            const reexportData = LevelSerializer.toExportData(importedLevel);

            // pitchInfluenceWeight should still be 0
            expect(reexportData.generationMetadata?.pitchInfluenceWeight).toBe(0);

            // generationConfig.buttons.pitchInfluenceWeight should be preserved
            expect(importedLevel.metadata.generationConfig.buttons?.pitchInfluenceWeight).toBe(0);

            console.log('✓ pitchInfluenceWeight = 0 preserved through round-trip');
        });

        it('should still have valid chart data when pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);

            // Chart should still be valid
            expect(exportData.chart).toBeDefined();
            expect(exportData.chart).not.toBeNull();
            expect(exportData.chart?.style).toBe('ddr');
            expect(exportData.chart?.keyCount).toBeGreaterThan(0);
            expect(exportData.chart?.usedKeys.length).toBeGreaterThan(0);

            // Subdivision should still be valid
            expect(exportData.subdivision).toBeDefined();
            expect(exportData.subdivision).not.toBeNull();
            expect(exportData.subdivision?.beats.length).toBeGreaterThan(0);

            console.log('✓ Chart data still valid when pitchInfluenceWeight = 0');
            console.log(`  chart style: ${exportData.chart?.style}`);
            console.log(`  subdivision beats: ${exportData.subdivision?.beats.length}`);
        });

        it('should include pattern metadata even when pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);

            // Patterns should still be recorded
            expect(exportData.generationMetadata?.patternsUsed).toBeDefined();
            expect(Array.isArray(exportData.generationMetadata?.patternsUsed)).toBe(true);
            expect(exportData.generationMetadata?.patternsUsed?.length).toBeGreaterThan(0);

            console.log('✓ Pattern metadata included when pitchInfluenceWeight = 0');
            console.log(`  patternsUsed: ${exportData.generationMetadata?.patternsUsed?.join(', ')}`);
        });

        it('should be identified as procedural even when pitchInfluenceWeight = 0', () => {
            const level = createMockGeneratedLevelWithoutPitch();
            const exportData = LevelSerializer.toExportData(level);

            // Should still be identified as procedural
            expect(LevelSerializer.isProcedural(exportData)).toBe(true);

            console.log('✓ Level correctly identified as procedural when pitchInfluenceWeight = 0');
        });
    });

    describe('Phase 4.2.4: Edge Cases - No subdivision (only interpolated beats)', () => {
        /**
         * Create mock export data with no subdivision (subdivision: null)
         * This simulates a level that only has interpolated beats without subdivision
         */
        function createMockExportDataNoSubdivision(): FullBeatMapExportData {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const duration = 10.0;

            // Create detected beats (quarter notes only)
            const detectedBeats: FullExportDetectedBeat[] = [];
            for (let i = 0; i < Math.floor(duration / quarterNoteInterval); i++) {
                detectedBeats.push({
                    timestamp: i * quarterNoteInterval,
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                    intensity: 0.8,
                    confidence: 0.9,
                });
            }

            // Create merged beats (only quarter notes, no subdivisions)
            const mergedBeats: FullExportMergedBeat[] = detectedBeats.map((beat, index) => ({
                ...beat,
                requiredKey: ['up', 'down', 'left', 'right'][index % 4],
                source: 'detected' as const,
            }));

            return {
                version: 1,
                format: 'full-beatmap',
                audioId: 'no-subdivision-audio-123',
                exportedAt: Date.now(),
                duration,
                quarterNoteBpm: bpm,
                quarterNoteConfidence: 0.85,
                detectedBeats,
                mergedBeats,
                interpolatedMetadata: {
                    quarterNoteInterval,
                    quarterNoteBpm: bpm,
                    quarterNoteConfidence: 0.85,
                    detectedBeatCount: detectedBeats.length,
                    mergedBeatCount: mergedBeats.length,
                },
                subdivision: null, // No subdivision!
                chart: {
                    style: 'ddr',
                    keyCount: 4,
                    usedKeys: ['up', 'down', 'left', 'right'],
                },
                generationSource: 'manual',
            };
        }

        it('should validate export data with no subdivision (warning only)', () => {
            const exportData = createMockExportDataNoSubdivision();

            const result = LevelSerializer.validate(exportData);

            // Should succeed with a warning
            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings?.some(w => w.includes('subdivision'))).toBe(true);

            console.log('✓ Validation passes for no subdivision with warning');
            console.log(`  warnings: ${result.warnings?.join(', ')}`);
        });

        it('should import level with no subdivision by using mergedBeats', () => {
            const exportData = createMockExportDataNoSubdivision();

            // Import should not throw
            const level = LevelSerializer.fromExportData(exportData);

            expect(level).toBeDefined();
            expect(level.chart).toBeDefined();
            expect(level.chart.beats.length).toBeGreaterThan(0);

            console.log('✓ Level with no subdivision imported successfully');
            console.log(`  beats count: ${level.chart.beats.length}`);
        });

        it('should reconstruct chart beats from mergedBeats when subdivision is null', () => {
            const exportData = createMockExportDataNoSubdivision();
            const level = LevelSerializer.fromExportData(exportData);

            // Check that beats were created from mergedBeats
            expect(level.chart.beats.length).toBe(exportData.mergedBeats.length);

            // Check that beat timestamps match
            for (let i = 0; i < level.chart.beats.length; i++) {
                expect(level.chart.beats[i].timestamp).toBe(exportData.mergedBeats[i].timestamp);
            }

            console.log('✓ Chart beats correctly reconstructed from mergedBeats');
        });

        it('should preserve required keys when importing level with no subdivision', () => {
            const exportData = createMockExportDataNoSubdivision();
            const level = LevelSerializer.fromExportData(exportData);

            // Check that keys are preserved
            const keys = level.chart.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined);

            expect(keys.length).toBe(exportData.mergedBeats.length);
            expect(keys).toContain('up');
            expect(keys).toContain('down');
            expect(keys).toContain('left');
            expect(keys).toContain('right');

            console.log('✓ Keys preserved when importing level with no subdivision');
            console.log(`  keys count: ${keys.length}`);
        });

        it('should use default values for procedural fields when subdivision is null', () => {
            const exportData = createMockExportDataNoSubdivision();
            const level = LevelSerializer.fromExportData(exportData);

            // Check default values
            const beat = level.chart.beats[0];
            expect(beat.subdivisionType).toBe('quarter');
            expect(beat.sourceBand).toBe('mid');

            console.log('✓ Default values used for procedural fields');
            console.log(`  subdivisionType: ${beat.subdivisionType}`);
            console.log(`  sourceBand: ${beat.sourceBand}`);
        });
    });

    describe('Phase 4.2.4: Edge Cases - No key assignments (chart is null)', () => {
        /**
         * Create mock export data with no key assignments (chart: null)
         * This simulates a level that has beats but no required keys assigned
         */
        function createMockExportDataNoKeys(): FullBeatMapExportData {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const duration = 10.0;
            const beatCount = 40;

            // Create detected beats
            const detectedBeats: FullExportDetectedBeat[] = [];
            for (let i = 0; i < Math.floor(duration / quarterNoteInterval); i++) {
                detectedBeats.push({
                    timestamp: i * quarterNoteInterval,
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                    intensity: 0.8,
                    confidence: 0.9,
                    // No requiredKey!
                });
            }

            // Create merged beats without keys
            const mergedBeats: FullExportMergedBeat[] = [];
            for (let i = 0; i < beatCount; i++) {
                const quarterIndex = Math.floor(i / 4);
                const subPosition = i % 4;
                mergedBeats.push({
                    timestamp: (quarterIndex + subPosition * 0.25) * quarterNoteInterval,
                    beatInMeasure: (quarterIndex % 4) + subPosition * 0.25,
                    isDownbeat: quarterIndex % 4 === 0 && subPosition === 0,
                    measureNumber: Math.floor(quarterIndex / 4),
                    intensity: 0.7,
                    confidence: 0.8,
                    // No requiredKey!
                    source: i % 4 === 0 ? 'detected' : 'interpolated',
                });
            }

            // Create subdivision beats without keys
            const subdivisionBeats: FullExportSubdividedBeat[] = mergedBeats.map((beat, index) => ({
                ...beat,
                isDetected: beat.source === 'detected',
                originalBeatIndex: beat.source === 'detected' ? index : undefined,
                subdivisionType: 'sixteenth' as SubdivisionType,
                // No requiredKey!
            }));

            return {
                version: 1,
                format: 'full-beatmap',
                audioId: 'no-keys-audio-123',
                exportedAt: Date.now(),
                duration,
                quarterNoteBpm: bpm,
                quarterNoteConfidence: 0.85,
                detectedBeats,
                mergedBeats,
                interpolatedMetadata: {
                    quarterNoteInterval,
                    quarterNoteBpm: bpm,
                    quarterNoteConfidence: 0.85,
                    detectedBeatCount: detectedBeats.length,
                    mergedBeatCount: mergedBeats.length,
                },
                subdivision: {
                    config: {
                        beatSubdivisions: subdivisionBeats.map((_, i) => [i, 'sixteenth' as SubdivisionType]),
                        defaultSubdivision: 'sixteenth',
                    },
                    beats: subdivisionBeats,
                    metadata: {
                        originalBeatCount: detectedBeats.length,
                        subdividedBeatCount: subdivisionBeats.length,
                        averageDensityMultiplier: 1.0,
                        explicitBeatCount: detectedBeats.length,
                    },
                },
                chart: null, // No chart!
                generationSource: 'manual',
            };
        }

        it('should validate export data with no chart (warning only)', () => {
            const exportData = createMockExportDataNoKeys();

            const result = LevelSerializer.validate(exportData);

            // Should succeed with a warning
            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings?.some(w => w.includes('chart') || w.includes('key'))).toBe(true);

            console.log('✓ Validation passes for no chart with warning');
            console.log(`  warnings: ${result.warnings?.join(', ')}`);
        });

        it('should import level with no key assignments', () => {
            const exportData = createMockExportDataNoKeys();

            // Import should not throw
            const level = LevelSerializer.fromExportData(exportData);

            expect(level).toBeDefined();
            expect(level.chart).toBeDefined();
            expect(level.chart.beats.length).toBeGreaterThan(0);

            console.log('✓ Level with no keys imported successfully');
            console.log(`  beats count: ${level.chart.beats.length}`);
        });

        it('should have undefined requiredKey on beats when chart is null', () => {
            const exportData = createMockExportDataNoKeys();
            const level = LevelSerializer.fromExportData(exportData);

            // All beats should have undefined requiredKey
            const keys = level.chart.beats
                .map(b => b.requiredKey)
                .filter((k): k is string => k !== undefined);

            expect(keys.length).toBe(0);

            console.log('✓ Beats have undefined requiredKey when chart is null');
        });

        it('should have empty keysUsed in metadata when chart is null', () => {
            const exportData = createMockExportDataNoKeys();
            const level = LevelSerializer.fromExportData(exportData);

            // keysUsed should be empty
            expect(level.metadata.buttonMetadata.keysUsed).toEqual([]);
            expect(level.chart.chartMetadata.keysUsed).toEqual([]);

            console.log('✓ keysUsed is empty in metadata when chart is null');
        });

        it('should still have valid rhythm data when chart is null', () => {
            const exportData = createMockExportDataNoKeys();
            const level = LevelSerializer.fromExportData(exportData);

            // Rhythm should still be valid
            expect(level.rhythm).toBeDefined();
            expect(level.rhythm.bandStreams).toBeDefined();
            expect(level.rhythm.composite).toBeDefined();
            expect(level.rhythm.metadata).toBeDefined();

            console.log('✓ Rhythm data still valid when chart is null');
        });
    });
});
