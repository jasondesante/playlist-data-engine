/**
 * Tests for Beat Key Helper Functions
 *
 * Tests utility functions for assigning and managing required keys on beat maps.
 * Used for rhythm game chart creation where specific keys must be pressed
 * for specific beats.
 */

import { describe, it, expect } from 'vitest';
import {
    assignKeyToBeat,
    assignKeysToBeats,
    extractKeyMap,
    clearAllKeys,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
} from '../../../src/core/analysis/beat/beatKeyHelpers.js';
import type {
    Beat,
    BeatMap,
    InterpolatedBeatMap,
    UnifiedBeatMap,
    SubdividedBeat,
    SubdividedBeatMap,
    BeatWithSource,
} from '../../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
} from '../../../src/core/types/BeatMap.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock Beat for testing
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
 * Create a mock BeatMap for testing
 */
function createMockBeatMap(beats: Beat[] = []): BeatMap {
    return {
        audioId: 'test-audio',
        duration: 10,
        beats,
        bpm: 120,
        metadata: {
            version: BEAT_DETECTION_VERSION,
            algorithm: BEAT_DETECTION_ALGORITHM,
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            noiseFloorThreshold: 0.1,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Create a mock InterpolatedBeatMap for testing
 */
function createMockInterpolatedBeatMap(beats: BeatWithSource[] = []): InterpolatedBeatMap {
    return {
        audioId: 'test-audio',
        duration: 10,
        detectedBeats: [],
        mergedBeats: beats,
        quarterNoteInterval: 0.5,
        quarterNoteBpm: 120,
        quarterNoteConfidence: 0.9,
        originalMetadata: {
            version: BEAT_DETECTION_VERSION,
            algorithm: BEAT_DETECTION_ALGORITHM,
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            noiseFloorThreshold: 0.1,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            generatedAt: new Date().toISOString(),
        },
        interpolationMetadata: {
            detectedBeatCount: 0,
            interpolatedBeatCount: beats.length,
            anchorPoints: [],
            averageConfidence: 0.9,
            gridSnapTolerance: 0.05,
        },
    };
}

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(beats: Beat[] = []): UnifiedBeatMap {
    return {
        audioId: 'test-audio',
        duration: 10,
        beats,
        detectedBeatIndices: [],
        quarterNoteInterval: 0.5,
        quarterNoteBpm: 120,
        downbeatConfig: {
            segments: [{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }],
        },
        originalMetadata: {
            version: BEAT_DETECTION_VERSION,
            algorithm: BEAT_DETECTION_ALGORITHM,
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            noiseFloorThreshold: 0.1,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Create a mock SubdividedBeat for testing
 */
function createMockSubdividedBeat(timestamp: number, options: Partial<SubdividedBeat> = {}): SubdividedBeat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.5,
        confidence: 0.8,
        isDetected: false,
        subdivisionType: 'quarter',
        ...options,
    };
}

/**
 * Create a mock SubdividedBeatMap for testing
 */
function createMockSubdividedBeatMap(beats: SubdividedBeat[] = []): SubdividedBeatMap {
    return {
        audioId: 'test-audio',
        duration: 10,
        beats,
        detectedBeatIndices: [],
        subdivisionConfig: {
            segments: [{ startBeat: 0, subdivision: 'quarter' }],
        },
        downbeatConfig: {
            segments: [{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }],
        },
        subdivisionMetadata: {
            originalBeatCount: 10,
            subdividedBeatCount: beats.length,
            averageDensityMultiplier: 1.0,
            segmentCount: 1,
            subdivisionsUsed: ['quarter'],
            hasMultipleTempos: false,
            maxDensity: 1,
        },
    };
}

// =============================================================================
// Tests: assignKeyToBeat
// =============================================================================

describe('assignKeyToBeat', () => {
    describe('with BeatMap', () => {
        it('should assign a valid key to a beat', () => {
            const beats = [
                createMockBeat(0),
                createMockBeat(0.5),
                createMockBeat(1.0),
            ];
            const beatMap = createMockBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 1, 'left');

            expect(result.beats[0].requiredKey).toBeUndefined();
            expect(result.beats[1].requiredKey).toBe('left');
            expect(result.beats[2].requiredKey).toBeUndefined();
        });

        it('should return a new beat map (immutable)', () => {
            const beats = [createMockBeat(0), createMockBeat(0.5)];
            const beatMap = createMockBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 0, 'up');

            // Original should be unchanged
            expect(beatMap.beats[0].requiredKey).toBeUndefined();
            // New map should have the key
            expect(result.beats[0].requiredKey).toBe('up');
            expect(result).not.toBe(beatMap);
        });

        it('should preserve other beat properties', () => {
            const beats = [
                createMockBeat(0, { intensity: 0.9, confidence: 0.95, isDownbeat: true }),
            ];
            const beatMap = createMockBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 0, 'down');

            expect(result.beats[0].intensity).toBe(0.9);
            expect(result.beats[0].confidence).toBe(0.95);
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[0].requiredKey).toBe('down');
        });

        it('should throw error for out of bounds index', () => {
            const beats = [createMockBeat(0), createMockBeat(0.5)];
            const beatMap = createMockBeatMap(beats);

            expect(() => assignKeyToBeat(beatMap, 5, 'up')).toThrow('out of bounds');
            expect(() => assignKeyToBeat(beatMap, -1, 'up')).toThrow('out of bounds');
        });
    });

    describe('with null key (removal)', () => {
        it('should remove an existing key when null is passed', () => {
            const beats = [
                createMockBeat(0, { requiredKey: 'up' }),
                createMockBeat(0.5, { requiredKey: 'down' }),
            ];
            const beatMap = createMockBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 0, null);

            expect(result.beats[0].requiredKey).toBeUndefined();
            expect(result.beats[1].requiredKey).toBe('down');
        });

        it('should handle removing key from beat that has no key', () => {
            const beats = [createMockBeat(0), createMockBeat(0.5)];
            const beatMap = createMockBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 0, null);

            expect(result.beats[0].requiredKey).toBeUndefined();
        });
    });

    describe('with InterpolatedBeatMap', () => {
        it('should assign key to mergedBeats', () => {
            const beats: BeatWithSource[] = [
                { ...createMockBeat(0), source: 'detected' },
                { ...createMockBeat(0.5), source: 'interpolated' },
            ];
            const beatMap = createMockInterpolatedBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 1, 'right');

            expect(result.mergedBeats[0].requiredKey).toBeUndefined();
            expect(result.mergedBeats[1].requiredKey).toBe('right');
        });

        it('should preserve other InterpolatedBeatMap properties', () => {
            const beats: BeatWithSource[] = [
                { ...createMockBeat(0), source: 'detected' },
            ];
            const beatMap = createMockInterpolatedBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 0, 'up');

            expect(result.audioId).toBe('test-audio');
            expect(result.quarterNoteBpm).toBe(120);
            expect(result.detectedBeats).toEqual([]);
        });
    });

    describe('with UnifiedBeatMap', () => {
        it('should assign key to beats', () => {
            const beats = [createMockBeat(0), createMockBeat(0.5)];
            const beatMap = createMockUnifiedBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 0, 'a');

            expect(result.beats[0].requiredKey).toBe('a');
            expect(result.beats[1].requiredKey).toBeUndefined();
        });
    });

    describe('with SubdividedBeatMap', () => {
        it('should assign key to subdivided beats', () => {
            const beats = [
                createMockSubdividedBeat(0, { isDetected: true, originalBeatIndex: 0 }),
                createMockSubdividedBeat(0.25, { isDetected: false, subdivisionType: 'sixteenth' }),
            ];
            const beatMap = createMockSubdividedBeatMap(beats);

            const result = assignKeyToBeat(beatMap, 1, 'x');

            expect(result.beats[0].requiredKey).toBeUndefined();
            expect(result.beats[1].requiredKey).toBe('x');
            // Verify SubdividedBeat properties are preserved
            expect(result.beats[1].isDetected).toBe(false);
            expect(result.beats[1].subdivisionType).toBe('sixteenth');
        });
    });
});

// =============================================================================
// Tests: assignKeysToBeats
// =============================================================================

describe('assignKeysToBeats', () => {
    it('should assign multiple keys in a single operation', () => {
        const beats = [
            createMockBeat(0),
            createMockBeat(0.5),
            createMockBeat(1.0),
            createMockBeat(1.5),
        ];
        const beatMap = createMockBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'left' },
            { beatIndex: 1, key: 'down' },
            { beatIndex: 2, key: 'up' },
            { beatIndex: 3, key: 'right' },
        ]);

        expect(result.beats[0].requiredKey).toBe('left');
        expect(result.beats[1].requiredKey).toBe('down');
        expect(result.beats[2].requiredKey).toBe('up');
        expect(result.beats[3].requiredKey).toBe('right');
    });

    it('should be immutable', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'a' },
        ]);

        expect(beatMap.beats[0].requiredKey).toBeUndefined();
        expect(result.beats[0].requiredKey).toBe('a');
        expect(result).not.toBe(beatMap);
    });

    it('should handle mixed key assignments and removals', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'old' }),
            createMockBeat(0.5),
            createMockBeat(1.0, { requiredKey: 'remove-me' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'new' },
            { beatIndex: 1, key: 'added' },
            { beatIndex: 2, key: null },
        ]);

        expect(result.beats[0].requiredKey).toBe('new');
        expect(result.beats[1].requiredKey).toBe('added');
        expect(result.beats[2].requiredKey).toBeUndefined();
    });

    it('should handle duplicate beatIndex in assignments (last wins)', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'first' },
            { beatIndex: 0, key: 'second' },
        ]);

        // Last assignment wins
        expect(result.beats[0].requiredKey).toBe('second');
    });

    it('should only modify beats with assignments', () => {
        const beats = [
            createMockBeat(0),
            createMockBeat(0.5),
            createMockBeat(1.0),
        ];
        const beatMap = createMockBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 1, key: 'only-this' },
        ]);

        expect(result.beats[0].requiredKey).toBeUndefined();
        expect(result.beats[1].requiredKey).toBe('only-this');
        expect(result.beats[2].requiredKey).toBeUndefined();
    });

    it('should throw error if any beatIndex is out of bounds', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        expect(() =>
            assignKeysToBeats(beatMap, [
                { beatIndex: 0, key: 'ok' },
                { beatIndex: 5, key: 'bad' },
            ])
        ).toThrow('out of bounds');
    });

    it('should work with InterpolatedBeatMap', () => {
        const beats: BeatWithSource[] = [
            { ...createMockBeat(0), source: 'detected' },
            { ...createMockBeat(0.5), source: 'interpolated' },
        ];
        const beatMap = createMockInterpolatedBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'a' },
            { beatIndex: 1, key: 'b' },
        ]);

        expect(result.mergedBeats[0].requiredKey).toBe('a');
        expect(result.mergedBeats[1].requiredKey).toBe('b');
    });

    it('should work with SubdividedBeatMap', () => {
        const beats = [
            createMockSubdividedBeat(0),
            createMockSubdividedBeat(0.25),
        ];
        const beatMap = createMockSubdividedBeatMap(beats);

        const result = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'x' },
            { beatIndex: 1, key: 'y' },
        ]);

        expect(result.beats[0].requiredKey).toBe('x');
        expect(result.beats[1].requiredKey).toBe('y');
    });

    it('should handle empty assignments array', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        const result = assignKeysToBeats(beatMap, []);

        expect(result.beats[0].requiredKey).toBeUndefined();
        expect(result.beats[1].requiredKey).toBeUndefined();
    });
});

// =============================================================================
// Tests: extractKeyMap
// =============================================================================

describe('extractKeyMap', () => {
    it('should return map of beatIndex to requiredKey', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'left' }),
            createMockBeat(0.5),
            createMockBeat(1.0, { requiredKey: 'right' }),
            createMockBeat(1.5),
            createMockBeat(2.0, { requiredKey: 'up' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const keyMap = extractKeyMap(beatMap);

        expect(keyMap.size).toBe(3);
        expect(keyMap.get(0)).toBe('left');
        expect(keyMap.get(2)).toBe('right');
        expect(keyMap.get(4)).toBe('up');
        expect(keyMap.has(1)).toBe(false);
        expect(keyMap.has(3)).toBe(false);
    });

    it('should return empty map when no keys assigned', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        const keyMap = extractKeyMap(beatMap);

        expect(keyMap.size).toBe(0);
    });

    it('should work with InterpolatedBeatMap', () => {
        const beats: BeatWithSource[] = [
            { ...createMockBeat(0, { requiredKey: 'a' }), source: 'detected' },
            { ...createMockBeat(0.5, { requiredKey: 'b' }), source: 'interpolated' },
        ];
        const beatMap = createMockInterpolatedBeatMap(beats);

        const keyMap = extractKeyMap(beatMap);

        expect(keyMap.size).toBe(2);
        expect(keyMap.get(0)).toBe('a');
        expect(keyMap.get(1)).toBe('b');
    });

    it('should work with SubdividedBeatMap', () => {
        const beats = [
            createMockSubdividedBeat(0, { requiredKey: 'x' }),
            createMockSubdividedBeat(0.25),
            createMockSubdividedBeat(0.5, { requiredKey: 'y' }),
        ];
        const beatMap = createMockSubdividedBeatMap(beats);

        const keyMap = extractKeyMap(beatMap);

        expect(keyMap.size).toBe(2);
        expect(keyMap.get(0)).toBe('x');
        expect(keyMap.get(2)).toBe('y');
    });

    it('should be iterable', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'a' }),
            createMockBeat(0.5, { requiredKey: 'b' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const keyMap = extractKeyMap(beatMap);
        const entries = Array.from(keyMap.entries());

        expect(entries).toEqual([[0, 'a'], [1, 'b']]);
    });

    it('should convert to plain object for JSON', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'left' }),
            createMockBeat(0.5, { requiredKey: 'right' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const keyMap = extractKeyMap(beatMap);
        const obj = Object.fromEntries(keyMap);

        expect(obj).toEqual({ '0': 'left', '1': 'right' });
    });
});

// =============================================================================
// Tests: clearAllKeys
// =============================================================================

describe('clearAllKeys', () => {
    it('should remove all required keys from beat map', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'left' }),
            createMockBeat(0.5, { requiredKey: 'down' }),
            createMockBeat(1.0, { requiredKey: 'up' }),
            createMockBeat(1.5, { requiredKey: 'right' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const result = clearAllKeys(beatMap);

        expect(result.beats[0].requiredKey).toBeUndefined();
        expect(result.beats[1].requiredKey).toBeUndefined();
        expect(result.beats[2].requiredKey).toBeUndefined();
        expect(result.beats[3].requiredKey).toBeUndefined();
    });

    it('should be immutable', () => {
        const beats = [createMockBeat(0, { requiredKey: 'x' })];
        const beatMap = createMockBeatMap(beats);

        const result = clearAllKeys(beatMap);

        expect(beatMap.beats[0].requiredKey).toBe('x');
        expect(result.beats[0].requiredKey).toBeUndefined();
        expect(result).not.toBe(beatMap);
    });

    it('should preserve beats without keys unchanged', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'a', intensity: 0.9 }),
            createMockBeat(0.5, { intensity: 0.7 }),
            createMockBeat(1.0, { requiredKey: 'b', isDownbeat: true }),
        ];
        const beatMap = createMockBeatMap(beats);

        const result = clearAllKeys(beatMap);

        expect(result.beats[0].intensity).toBe(0.9);
        expect(result.beats[1].intensity).toBe(0.7);
        expect(result.beats[2].isDownbeat).toBe(true);
        // All keys should be gone
        expect(result.beats.every(b => b.requiredKey === undefined)).toBe(true);
    });

    it('should handle beat map with no keys', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        const result = clearAllKeys(beatMap);

        expect(result.beats[0].requiredKey).toBeUndefined();
        expect(result.beats[1].requiredKey).toBeUndefined();
    });

    it('should work with InterpolatedBeatMap', () => {
        const beats: BeatWithSource[] = [
            { ...createMockBeat(0, { requiredKey: 'a' }), source: 'detected' },
            { ...createMockBeat(0.5, { requiredKey: 'b' }), source: 'interpolated' },
        ];
        const beatMap = createMockInterpolatedBeatMap(beats);

        const result = clearAllKeys(beatMap);

        expect(result.mergedBeats[0].requiredKey).toBeUndefined();
        expect(result.mergedBeats[1].requiredKey).toBeUndefined();
    });

    it('should work with SubdividedBeatMap', () => {
        const beats = [
            createMockSubdividedBeat(0, { requiredKey: 'x', isDetected: true }),
            createMockSubdividedBeat(0.25, { requiredKey: 'y', isDetected: false }),
        ];
        const beatMap = createMockSubdividedBeatMap(beats);

        const result = clearAllKeys(beatMap);

        expect(result.beats[0].requiredKey).toBeUndefined();
        expect(result.beats[1].requiredKey).toBeUndefined();
        // SubdividedBeat properties should be preserved
        expect(result.beats[0].isDetected).toBe(true);
        expect(result.beats[1].isDetected).toBe(false);
    });
});

// =============================================================================
// Tests: hasRequiredKeys
// =============================================================================

describe('hasRequiredKeys', () => {
    it('should return true when keys are assigned', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'left' }),
            createMockBeat(0.5),
        ];
        const beatMap = createMockBeatMap(beats);

        expect(hasRequiredKeys(beatMap)).toBe(true);
    });

    it('should return false when no keys are assigned', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        expect(hasRequiredKeys(beatMap)).toBe(false);
    });

    it('should return false for empty beat map', () => {
        const beatMap = createMockBeatMap([]);

        expect(hasRequiredKeys(beatMap)).toBe(false);
    });

    it('should work with all beat map types', () => {
        const beatMap = createMockBeatMap([createMockBeat(0, { requiredKey: 'x' })]);
        const interpolated = createMockInterpolatedBeatMap([
            { ...createMockBeat(0, { requiredKey: 'x' }), source: 'detected' },
        ]);
        const unified = createMockUnifiedBeatMap([createMockBeat(0, { requiredKey: 'x' })]);
        const subdivided = createMockSubdividedBeatMap([
            createMockSubdividedBeat(0, { requiredKey: 'x' }),
        ]);

        expect(hasRequiredKeys(beatMap)).toBe(true);
        expect(hasRequiredKeys(interpolated)).toBe(true);
        expect(hasRequiredKeys(unified)).toBe(true);
        expect(hasRequiredKeys(subdivided)).toBe(true);
    });
});

// =============================================================================
// Tests: getKeyCount
// =============================================================================

describe('getKeyCount', () => {
    it('should count beats with required keys', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'a' }),
            createMockBeat(0.5),
            createMockBeat(1.0, { requiredKey: 'b' }),
            createMockBeat(1.5, { requiredKey: 'c' }),
        ];
        const beatMap = createMockBeatMap(beats);

        expect(getKeyCount(beatMap)).toBe(3);
    });

    it('should return 0 when no keys assigned', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        expect(getKeyCount(beatMap)).toBe(0);
    });

    it('should return 0 for empty beat map', () => {
        const beatMap = createMockBeatMap([]);

        expect(getKeyCount(beatMap)).toBe(0);
    });

    it('should count all keys even if duplicate', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'a' }),
            createMockBeat(0.5, { requiredKey: 'a' }),
            createMockBeat(1.0, { requiredKey: 'a' }),
        ];
        const beatMap = createMockBeatMap(beats);

        // All 3 beats have keys, even though they're the same key
        expect(getKeyCount(beatMap)).toBe(3);
    });
});

// =============================================================================
// Tests: getUsedKeys
// =============================================================================

describe('getUsedKeys', () => {
    it('should return unique keys sorted alphabetically', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'right' }),
            createMockBeat(0.5, { requiredKey: 'left' }),
            createMockBeat(1.0, { requiredKey: 'up' }),
            createMockBeat(1.5, { requiredKey: 'down' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const keys = getUsedKeys(beatMap);

        expect(keys).toEqual(['down', 'left', 'right', 'up']);
    });

    it('should return empty array when no keys assigned', () => {
        const beats = [createMockBeat(0), createMockBeat(0.5)];
        const beatMap = createMockBeatMap(beats);

        expect(getUsedKeys(beatMap)).toEqual([]);
    });

    it('should deduplicate keys', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'a' }),
            createMockBeat(0.5, { requiredKey: 'a' }),
            createMockBeat(1.0, { requiredKey: 'b' }),
            createMockBeat(1.5, { requiredKey: 'a' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const keys = getUsedKeys(beatMap);

        expect(keys).toEqual(['a', 'b']);
    });

    it('should work with various key formats', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'x' }),
            createMockBeat(0.5, { requiredKey: 'y' }),
            createMockBeat(1.0, { requiredKey: 'a' }),
            createMockBeat(1.5, { requiredKey: 'b' }),
        ];
        const beatMap = createMockBeatMap(beats);

        const keys = getUsedKeys(beatMap);

        expect(keys).toEqual(['a', 'b', 'x', 'y']);
    });

    it('should work with all beat map types', () => {
        const beatMap = createMockBeatMap([
            createMockBeat(0, { requiredKey: 'z' }),
            createMockBeat(0.5, { requiredKey: 'a' }),
        ]);
        const interpolated = createMockInterpolatedBeatMap([
            { ...createMockBeat(0, { requiredKey: 'z' }), source: 'detected' },
            { ...createMockBeat(0.5, { requiredKey: 'a' }), source: 'interpolated' },
        ]);

        expect(getUsedKeys(beatMap)).toEqual(['a', 'z']);
        expect(getUsedKeys(interpolated)).toEqual(['a', 'z']);
    });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration: Workflow Tests', () => {
    it('should support typical chart creation workflow', () => {
        // 1. Start with a beat map
        const beats = [
            createMockBeat(0),
            createMockBeat(0.5),
            createMockBeat(1.0),
            createMockBeat(1.5),
        ];
        let beatMap = createMockBeatMap(beats);

        // 2. Check no keys initially
        expect(hasRequiredKeys(beatMap)).toBe(false);
        expect(getKeyCount(beatMap)).toBe(0);

        // 3. Assign keys to create a chart
        beatMap = assignKeysToBeats(beatMap, [
            { beatIndex: 0, key: 'left' },
            { beatIndex: 1, key: 'down' },
            { beatIndex: 2, key: 'up' },
            { beatIndex: 3, key: 'right' },
        ]);

        // 4. Verify chart was created
        expect(hasRequiredKeys(beatMap)).toBe(true);
        expect(getKeyCount(beatMap)).toBe(4);
        expect(getUsedKeys(beatMap)).toEqual(['down', 'left', 'right', 'up']);

        // 5. Extract key map for serialization
        const keyMap = extractKeyMap(beatMap);
        expect(keyMap.size).toBe(4);

        // 6. Clear all keys to reset
        beatMap = clearAllKeys(beatMap);
        expect(hasRequiredKeys(beatMap)).toBe(false);
        expect(getKeyCount(beatMap)).toBe(0);
    });

    it('should support partial chart updates', () => {
        const beats = [
            createMockBeat(0, { requiredKey: 'a' }),
            createMockBeat(0.5, { requiredKey: 'b' }),
            createMockBeat(1.0, { requiredKey: 'c' }),
        ];
        let beatMap = createMockBeatMap(beats);

        // Update specific beats
        beatMap = assignKeyToBeat(beatMap, 1, 'x');

        expect(beatMap.beats[0].requiredKey).toBe('a');
        expect(beatMap.beats[1].requiredKey).toBe('x');
        expect(beatMap.beats[2].requiredKey).toBe('c');
        expect(getUsedKeys(beatMap)).toEqual(['a', 'c', 'x']);
    });
});
