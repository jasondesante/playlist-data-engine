/**
 * Tests for BeatConverter and ChartedBeatMap helper functions
 *
 * Tests the conversion of procedural generation output (GeneratedBeat[]) to
 * ChartedBeatMap format for compatibility with BeatStream.
 *
 * Part of Phase 2.7.4 Tests for Conversion
 */

import { describe, it, expect } from 'vitest';
import {
    mapGridToSubdivision,
    calculateBeatInMeasure,
} from '../../../src/core/types/ChartedBeatMap.js';
import { BeatConverter } from '../../../src/core/generation/BeatConverter.js';
import type {
    DifficultyVariant,
    VariantBeat,
} from '../../../src/core/analysis/beat/DifficultyVariantGenerator.js';
import type { UnifiedBeatMap, Beat } from '../../../src/core/types/BeatMap.js';
import type { ChartedBeat, ChartedBeatMap } from '../../../src/core/types/ChartedBeatMap.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock VariantBeat for testing
 */
function createMockVariantBeat(options: Partial<VariantBeat> = {}): VariantBeat {
    return {
        timestamp: 0,
        beatIndex: 0,
        gridPosition: 0,
        gridType: 'straight_16th',
        intensity: 0.5,
        sourceBand: 'mid',
        ...options,
    };
}

/**
 * Create a mock Beat for UnifiedBeatMap
 */
function createMockBeat(timestamp: number, options: Partial<Beat> = {}): Beat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.5,
        confidence: 0.8,
        ...options,
    };
}

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(beats: Beat[] = []): UnifiedBeatMap {
    return {
        audioId: 'test-audio',
        duration: 60,
        beats,
        detectedBeatIndices: [],
        quarterNoteInterval: 0.5,
        quarterNoteBpm: 120,
        downbeatConfig: {
            segments: [{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }],
        },
        originalMetadata: {
            version: '1.0.0',
            algorithm: 'test',
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
        },
    };
}

/**
 * Create a mock DifficultyVariant for testing
 */
function createMockVariant(beats: VariantBeat[] = [], difficulty: 'easy' | 'medium' | 'hard' = 'medium'): DifficultyVariant {
    return {
        difficulty,
        beats,
        isUnedited: true,
        editType: 'none',
        editAmount: 0,
    };
}

// =============================================================================
// Tests: calculateBeatInMeasure
// =============================================================================

describe('calculateBeatInMeasure', () => {
    describe('straight_16th grid type', () => {
        it('should return parent value for position 0', () => {
            const result = calculateBeatInMeasure(2.0, 0, 'straight_16th');
            expect(result).toBe(2.0);
        });

        it('should add 0.25 for position 1', () => {
            const result = calculateBeatInMeasure(2.0, 1, 'straight_16th');
            expect(result).toBeCloseTo(2.25, 5);
        });

        it('should add 0.5 for position 2', () => {
            const result = calculateBeatInMeasure(2.0, 2, 'straight_16th');
            expect(result).toBeCloseTo(2.5, 5);
        });

        it('should add 0.75 for position 3', () => {
            const result = calculateBeatInMeasure(2.0, 3, 'straight_16th');
            expect(result).toBeCloseTo(2.75, 5);
        });

        it('should work with parent beat at 0', () => {
            expect(calculateBeatInMeasure(0, 0, 'straight_16th')).toBe(0);
            expect(calculateBeatInMeasure(0, 1, 'straight_16th')).toBeCloseTo(0.25, 5);
            expect(calculateBeatInMeasure(0, 2, 'straight_16th')).toBeCloseTo(0.5, 5);
            expect(calculateBeatInMeasure(0, 3, 'straight_16th')).toBeCloseTo(0.75, 5);
        });

        it('should work with fractional parent beats', () => {
            expect(calculateBeatInMeasure(1.5, 0, 'straight_16th')).toBe(1.5);
            expect(calculateBeatInMeasure(1.5, 1, 'straight_16th')).toBeCloseTo(1.75, 5);
            expect(calculateBeatInMeasure(1.5, 2, 'straight_16th')).toBeCloseTo(2.0, 5);
            expect(calculateBeatInMeasure(1.5, 3, 'straight_16th')).toBeCloseTo(2.25, 5);
        });
    });

    describe('triplet_8th grid type', () => {
        it('should return parent value for position 0', () => {
            const result = calculateBeatInMeasure(2.0, 0, 'triplet_8th');
            expect(result).toBe(2.0);
        });

        it('should add ~0.333 for position 1', () => {
            const result = calculateBeatInMeasure(2.0, 1, 'triplet_8th');
            expect(result).toBeCloseTo(2.333, 2);
        });

        it('should add ~0.667 for position 2', () => {
            const result = calculateBeatInMeasure(2.0, 2, 'triplet_8th');
            expect(result).toBeCloseTo(2.667, 2);
        });

        it('should correctly calculate triplet positions from 0', () => {
            expect(calculateBeatInMeasure(0, 0, 'triplet_8th')).toBe(0);
            expect(calculateBeatInMeasure(0, 1, 'triplet_8th')).toBeCloseTo(1/3, 5);
            expect(calculateBeatInMeasure(0, 2, 'triplet_8th')).toBeCloseTo(2/3, 5);
        });
    });

    describe('straight_8th grid type', () => {
        it('should return parent value for position 0', () => {
            const result = calculateBeatInMeasure(2.0, 0, 'straight_8th');
            expect(result).toBe(2.0);
        });

        it('should add 0.5 for position 1', () => {
            const result = calculateBeatInMeasure(2.0, 1, 'straight_8th');
            expect(result).toBeCloseTo(2.5, 5);
        });

        it('should correctly calculate eighth positions from 0', () => {
            expect(calculateBeatInMeasure(0, 0, 'straight_8th')).toBe(0);
            expect(calculateBeatInMeasure(0, 1, 'straight_8th')).toBeCloseTo(0.5, 5);
        });
    });

    describe('quarter grid type', () => {
        it('should return parent value regardless of position', () => {
            expect(calculateBeatInMeasure(2.0, 0, 'quarter')).toBe(2.0);
            expect(calculateBeatInMeasure(2.0, 1, 'quarter')).toBe(2.0);
            expect(calculateBeatInMeasure(2.0, 2, 'quarter')).toBe(2.0);
        });
    });

    describe('quarter_triplet grid type', () => {
        it('should use triplet offsets like triplet_8th', () => {
            expect(calculateBeatInMeasure(2.0, 0, 'quarter_triplet')).toBe(2.0);
            expect(calculateBeatInMeasure(2.0, 1, 'quarter_triplet')).toBeCloseTo(2.333, 2);
            expect(calculateBeatInMeasure(2.0, 2, 'quarter_triplet')).toBeCloseTo(2.667, 2);
        });
    });

    describe('unknown grid type', () => {
        it('should default to no offset for unknown types', () => {
            const result = calculateBeatInMeasure(2.0, 2, 'unknown_type');
            expect(result).toBe(2.0);
        });
    });
});

// =============================================================================
// Tests: mapGridToSubdivision
// =============================================================================

describe('mapGridToSubdivision', () => {
    it('should map straight_16th to sixteenth', () => {
        expect(mapGridToSubdivision('straight_16th')).toBe('sixteenth');
    });

    it('should map triplet_8th to triplet8', () => {
        expect(mapGridToSubdivision('triplet_8th')).toBe('triplet8');
    });

    it('should map straight_8th to eighth', () => {
        expect(mapGridToSubdivision('straight_8th')).toBe('eighth');
    });

    it('should map quarter to quarter', () => {
        expect(mapGridToSubdivision('quarter')).toBe('quarter');
    });

    it('should map quarter_triplet to triplet8', () => {
        expect(mapGridToSubdivision('quarter_triplet')).toBe('triplet8');
    });

    it('should default to sixteenth for unknown grid types', () => {
        expect(mapGridToSubdivision('unknown')).toBe('sixteenth');
        expect(mapGridToSubdivision('')).toBe('sixteenth');
    });
});

// =============================================================================
// Tests: BeatConverter.convertToChartedBeatMap
// =============================================================================

describe('BeatConverter.convertToChartedBeatMap', () => {
    const converter = new BeatConverter();

    describe('basic conversion', () => {
        it('should convert an empty variant', () => {
            const variant = createMockVariant([]);
            const unifiedBeatMap = createMockUnifiedBeatMap([]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats).toHaveLength(0);
            expect(result.detectedBeatIndices).toHaveLength(0);
        });

        it('should convert a single beat', () => {
            const beats = [createMockVariantBeat({ timestamp: 0, beatIndex: 0 })];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 1 }),
            ]);
            const keyAssignments = new Map<number, string>();
            keyAssignments.set(0, 'left');

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats).toHaveLength(1);
            expect(result.beats[0].timestamp).toBe(0);
            expect(result.beats[0].requiredKey).toBe('left');
        });

        it('should preserve beat properties', () => {
            const beats = [
                createMockVariantBeat({
                    timestamp: 0.5,
                    beatIndex: 1,
                    gridPosition: 2,
                    intensity: 0.8,
                    sourceBand: 'low',
                    quantizationError: 5,
                }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0, { beatInMeasure: 0 }),
                createMockBeat(0.5, { beatInMeasure: 1 }),
            ]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            const chartedBeat = result.beats[0];
            expect(chartedBeat.timestamp).toBe(0.5);
            expect(chartedBeat.intensity).toBe(0.8);
            expect(chartedBeat.sourceBand).toBe('low');
            expect(chartedBeat.quantizationError).toBe(5);
            expect(chartedBeat.quarterNoteIndex).toBe(1);
            expect(chartedBeat.subdivisionPosition).toBe(2);
        });
    });

    describe('beatInMeasure calculation', () => {
        it('should correctly calculate beatInMeasure for 16th notes', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, gridPosition: 0, gridType: 'straight_16th' }),
                createMockVariantBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1, gridType: 'straight_16th' }),
                createMockVariantBeat({ timestamp: 0.25, beatIndex: 0, gridPosition: 2, gridType: 'straight_16th' }),
                createMockVariantBeat({ timestamp: 0.375, beatIndex: 0, gridPosition: 3, gridType: 'straight_16th' }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0, { beatInMeasure: 0 }),
            ]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].beatInMeasure).toBeCloseTo(0, 5);
            expect(result.beats[1].beatInMeasure).toBeCloseTo(0.25, 5);
            expect(result.beats[2].beatInMeasure).toBeCloseTo(0.5, 5);
            expect(result.beats[3].beatInMeasure).toBeCloseTo(0.75, 5);
        });

        it('should correctly calculate beatInMeasure for triplet notes', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, gridPosition: 0, gridType: 'triplet_8th' }),
                createMockVariantBeat({ timestamp: 0.167, beatIndex: 0, gridPosition: 1, gridType: 'triplet_8th' }),
                createMockVariantBeat({ timestamp: 0.333, beatIndex: 0, gridPosition: 2, gridType: 'triplet_8th' }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0, { beatInMeasure: 0 }),
            ]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].beatInMeasure).toBeCloseTo(0, 5);
            expect(result.beats[1].beatInMeasure).toBeCloseTo(1/3, 2);
            expect(result.beats[2].beatInMeasure).toBeCloseTo(2/3, 2);
        });
    });

    describe('isDownbeat handling', () => {
        it('should mark beat as downbeat only at gridPosition 0 of a downbeat quarter note', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, gridPosition: 0 }),
                createMockVariantBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 1 }),
            ]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            // Only position 0 of a downbeat quarter is a downbeat
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[1].isDownbeat).toBe(false);
        });

        it('should not mark non-downbeat quarters as downbeats', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0, { beatInMeasure: 0, isDownbeat: true }),
                createMockBeat(0.5, { beatInMeasure: 1, isDownbeat: false }),
            ]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].isDownbeat).toBe(false);
        });
    });

    describe('requiredKey assignment', () => {
        it('should assign requiredKey from keyAssignments map', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0 }),
                createMockVariantBeat({ timestamp: 0.5, beatIndex: 1 }),
                createMockVariantBeat({ timestamp: 1.0, beatIndex: 2 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0),
                createMockBeat(0.5),
                createMockBeat(1.0),
            ]);
            const keyAssignments = new Map<number, string>();
            keyAssignments.set(0, 'left');
            keyAssignments.set(2, 'right');

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].requiredKey).toBe('left');
            expect(result.beats[1].requiredKey).toBeUndefined();
            expect(result.beats[2].requiredKey).toBe('right');
        });

        it('should track keysUsed in metadata', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0 }),
                createMockVariantBeat({ timestamp: 0.5, beatIndex: 1 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0),
                createMockBeat(0.5),
            ]);
            const keyAssignments = new Map<number, string>();
            keyAssignments.set(0, 'up');
            keyAssignments.set(1, 'down');

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.chartMetadata.keysUsed).toContain('up');
            expect(result.chartMetadata.keysUsed).toContain('down');
        });
    });

    describe('isDetected flag', () => {
        it('should mark beats with no quantization error as detected', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, quantizationError: undefined }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].isDetected).toBe(true);
            expect(result.detectedBeatIndices).toContain(0);
        });

        it('should mark beats with small quantization error as detected', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, quantizationError: 5 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].isDetected).toBe(true);
        });

        it('should mark beats with large quantization error as not detected', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, quantizationError: 50 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].isDetected).toBe(false);
            expect(result.detectedBeatIndices).not.toContain(0);
        });
    });

    describe('confidence calculation', () => {
        it('should assign high confidence for detected beats', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, intensity: 0.5, quantizationError: undefined }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].confidence).toBeGreaterThanOrEqual(0.8);
        });

        it('should assign lower confidence for generated beats', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, intensity: 0.5, quantizationError: 50 }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].confidence).toBe(0.8);
        });
    });

    describe('subdivisionType mapping', () => {
        it('should map gridType to subdivisionType', () => {
            const beats = [
                createMockVariantBeat({ timestamp: 0, beatIndex: 0, gridType: 'straight_16th' }),
                createMockVariantBeat({ timestamp: 0.5, beatIndex: 1, gridType: 'triplet_8th' }),
            ];
            const variant = createMockVariant(beats);
            const unifiedBeatMap = createMockUnifiedBeatMap([
                createMockBeat(0),
                createMockBeat(0.5),
            ]);
            const keyAssignments = new Map<number, string>();

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                keyAssignments,
                {}
            );

            expect(result.beats[0].subdivisionType).toBe('sixteenth');
            expect(result.beats[1].subdivisionType).toBe('triplet8');
        });
    });

    describe('metadata preservation', () => {
        it('should preserve unifiedBeatMap properties', () => {
            const variant = createMockVariant([]);
            const unifiedBeatMap = createMockUnifiedBeatMap([]);
            unifiedBeatMap.audioId = 'test-audio-123';
            unifiedBeatMap.duration = 180;
            unifiedBeatMap.quarterNoteInterval = 0.4;
            unifiedBeatMap.quarterNoteBpm = 150;

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                new Map(),
                {}
            );

            expect(result.audioId).toBe('test-audio-123');
            expect(result.duration).toBe(180);
            expect(result.quarterNoteInterval).toBe(0.4);
            expect(result.bpm).toBe(150);
        });

        it('should use variant difficulty (not metadata difficulty)', () => {
            // Note: BeatConverter uses variant.difficulty, not partialMetadata.difficulty
            const variant = createMockVariant([], 'medium');
            const unifiedBeatMap = createMockUnifiedBeatMap([]);

            const result = converter.convertToChartedBeatMap(
                variant,
                unifiedBeatMap,
                new Map(),
                {
                    difficulty: 'hard',  // This is ignored - variant.difficulty takes precedence
                    pitchInfluencedBeats: 10,
                    patternsUsed: ['pattern1', 'pattern2'],
                }
            );

            // Difficulty comes from variant, not partialMetadata
            expect(result.chartMetadata.difficulty).toBe('medium');
            // These are preserved from partialMetadata
            expect(result.chartMetadata.pitchInfluencedBeats).toBe(10);
            expect(result.chartMetadata.patternsUsed).toEqual(['pattern1', 'pattern2']);
        });
    });
});

// =============================================================================
// Tests: BeatConverter.convertWithOptions
// =============================================================================

describe('BeatConverter.convertWithOptions', () => {
    const converter = new BeatConverter();

    it('should convert with minimal options', () => {
        const beats = [createMockVariantBeat({ timestamp: 0, beatIndex: 0 })];
        const variant = createMockVariant(beats);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'up');

        const result = converter.convertWithOptions(variant, {
            audioId: 'test-audio',
            duration: 60,
            quarterNoteInterval: 0.5,
            downbeatConfig: {
                segments: [{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }],
            },
            keyAssignments,
            metadata: { difficulty: 'medium' },
        });

        expect(result.audioId).toBe('test-audio');
        expect(result.duration).toBe(60);
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].requiredKey).toBe('up');
    });
});

// =============================================================================
// Tests: BeatConverter.fromMappedResult (static)
// =============================================================================

describe('BeatConverter.fromMappedResult', () => {
    it('should create ChartedBeatMap from mapped result', () => {
        const beats = [createMockVariantBeat({ timestamp: 0, beatIndex: 0 })];
        const variant = createMockVariant(beats, 'hard');
        const unifiedBeatMap = createMockUnifiedBeatMap([
            createMockBeat(0, { beatInMeasure: 0, isDownbeat: true }),
        ]);

        const buttonMetadata = {
            controllerMode: 'ddr' as const,
            keysUsed: ['up', 'down', 'left', 'right'],
            pitchInfluencedBeats: 5,
            patternInfluencedBeats: 3,
            patternsUsed: ['alternating'],
            buttonDistribution: new Map([['up', 2], ['down', 2]]),
            directionStats: { up: 2, down: 2, stable: 1, none: 0 },
            intervalStats: { unison: 1, small: 2, medium: 1, large: 1, very_large: 0 },
        };

        const rhythmMetadata = {
            difficulty: 'hard' as const,
            bandsAnalyzed: ['low', 'mid', 'high'] as const,
            transientsDetected: 100,
            averageDensity: 1.5,
            naturalDifficulty: 'hard' as const,
        };

        const result = BeatConverter.fromMappedResult(
            variant,
            unifiedBeatMap,
            buttonMetadata,
            rhythmMetadata
        );

        expect(result.beats.length).toBeGreaterThan(0);
        expect(result.chartMetadata.difficulty).toBe('hard');
        expect(result.chartMetadata.rhythmMetadata.transientsDetected).toBe(100);
    });
});
