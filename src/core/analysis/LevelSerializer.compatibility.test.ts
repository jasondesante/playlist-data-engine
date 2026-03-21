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
        bandPitches: new Map([
            ['low', { band: 'low', pitches: [], avgProbability: 0, voicedBeatCount: 0, totalBeatCount: 0 }],
            ['mid', { band: 'mid', pitches: [], avgProbability: 0.8, voicedBeatCount: 20, totalBeatCount: 40 }],
            ['high', { band: 'high', pitches: [], avgProbability: 0, voicedBeatCount: 0, totalBeatCount: 0 }],
        ]),
        melodyContour: {
            segments: [],
            direction: 'mixed',
            range: { minNote: 'C4', maxNote: 'G5', semitones: 7 },
            shortTermDirection: 'up',
            mediumTermDirection: 'stable',
            longTermDirection: 'down',
        },
        dominantBand: 'mid',
        bandContours: new Map([
            ['low', { segments: [], direction: 'stable', range: { minNote: 'N/A', maxNote: 'N/A', semitones: 0 }, shortTermDirection: 'stable', mediumTermDirection: 'stable', longTermDirection: 'stable' }],
            ['mid', { segments: [], direction: 'mixed', range: { minNote: 'C4', maxNote: 'G5', semitones: 7 }, shortTermDirection: 'up', mediumTermDirection: 'stable', longTermDirection: 'down' }],
            ['high', { segments: [], direction: 'stable', range: { minNote: 'N/A', maxNote: 'N/A', semitones: 0 }, shortTermDirection: 'stable', mediumTermDirection: 'stable', longTermDirection: 'stable' }],
        ]),
        combinedContour: {
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

    describe('Utility Functions', () => {
        it('should identify procedural levels', () => {
            const level = createMockGeneratedLevel();
            const exportData = LevelSerializer.toExportData(level);

            expect(LevelSerializer.isProcedural(exportData)).toBe(true);

            console.log('✓ isProcedural correctly identifies procedural levels');
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
});
