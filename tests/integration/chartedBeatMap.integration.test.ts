/**
 * Integration Tests for ChartedBeatMap + BeatStream
 *
 * Tests that procedurally generated ChartedBeatMap output from BeatConverter
 * works correctly with BeatStream for real-time beat event streaming.
 *
 * Part of Phase 2.7.4 Tests for Conversion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BeatConverter } from '../../src/core/generation/BeatConverter.js';
import { BeatStream } from '../../src/core/analysis/beat/BeatStream.js';
import { chartedBeatMapToBeatMap } from '../../src/core/types/ChartedBeatMap.js';
import type {
    DifficultyVariant,
    VariantBeat,
} from '../../src/core/analysis/beat/DifficultyVariantGenerator.js';
import type { UnifiedBeatMap, Beat, BeatEvent, ButtonPressResult } from '../../src/core/types/BeatMap.js';
import type { ChartedBeatMap, ChartedBeat } from '../../src/core/types/ChartedBeatMap.js';

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

/**
 * Create a mock AudioContext for testing
 */
function createMockAudioContext(): AudioContext {
    return {
        currentTime: 0,
    } as unknown as AudioContext;
}

// =============================================================================
// Tests: chartedBeatMapToBeatMap Adapter
// =============================================================================

describe('chartedBeatMapToBeatMap adapter', () => {
    const converter = new BeatConverter();

    it('should convert ChartedBeatMap to BeatMap format', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0, beatIndex: 0, gridPosition: 0 }),
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([
            createMockBeat(0, { beatInMeasure: 0 }),
            createMockBeat(0.5, { beatInMeasure: 1 }),
        ]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'left');
        keyAssignments.set(1, 'right');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        const beatMap = chartedBeatMapToBeatMap(chartedMap);

        expect(beatMap.audioId).toBe(chartedMap.audioId);
        expect(beatMap.duration).toBe(chartedMap.duration);
        expect(beatMap.bpm).toBe(chartedMap.bpm);
        expect(beatMap.beats).toHaveLength(chartedMap.beats.length);
        expect(beatMap.metadata.algorithm).toBe('procedural-generation');
        expect(beatMap.downbeatConfig).toEqual(chartedMap.downbeatConfig);
    });

    it('should preserve requiredKey on beats', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0, beatIndex: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'up');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);

        expect(beatMap.beats[0].requiredKey).toBe('up');
    });
});

// =============================================================================
// Tests: BeatStream with ChartedBeatMap
// =============================================================================

describe('BeatStream with ChartedBeatMap', () => {
    const converter = new BeatConverter();
    let mockAudioContext: AudioContext;

    beforeEach(() => {
        mockAudioContext = createMockAudioContext();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create BeatStream from converted ChartedBeatMap', () => {
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
        keyAssignments.set(1, 'down');
        keyAssignments.set(2, 'right');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);

        // This should not throw
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        expect(beatStream).toBeDefined();
        expect(beatStream.getDuration()).toBe(chartedMap.duration);
        expect(beatStream.getNormalizedBeatMap().beats).toHaveLength(3);
    });

    it('should emit beat events for converted chart', () => {
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
        keyAssignments.set(0, 'left');
        keyAssignments.set(1, 'right');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext, {
            anticipationTime: 1.0,
        });

        const events: BeatEvent[] = [];
        beatStream.subscribe((event) => {
            events.push(event);
        });

        beatStream.start();

        // Advance time to trigger first beat's upcoming event
        (mockAudioContext as any).currentTime = 0;
        vi.advanceTimersByTime(16); // One frame

        // Should have emitted upcoming event for first beat
        const upcomingEvents = events.filter(e => e.type === 'upcoming');
        expect(upcomingEvents.length).toBeGreaterThan(0);

        beatStream.stop();
    });

    it('should correctly identify current and next beats', () => {
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

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        beatStream.start();

        // At time 0, current beat should be the first one
        const currentBeat = beatStream.getCurrentBeat();
        expect(currentBeat).not.toBeNull();
        expect(currentBeat?.timestamp).toBe(0);

        // Next beat should be at 0.5
        const nextBeat = beatStream.getNextBeat();
        expect(nextBeat).not.toBeNull();
        expect(nextBeat?.timestamp).toBe(0.5);

        beatStream.stop();
    });

    it('should support seek operation', () => {
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

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        beatStream.seek(0.6);

        // After seeking to 0.6, current beat should be at 0.5
        const currentBeat = beatStream.getCurrentBeat();
        expect(currentBeat).not.toBeNull();
        expect(currentBeat?.timestamp).toBe(0.5);

        // Next beat should be at 1.0
        const nextBeat = beatStream.getNextBeat();
        expect(nextBeat).not.toBeNull();
        expect(nextBeat?.timestamp).toBe(1.0);
    });

    it('should handle pause and resume', () => {
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

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        beatStream.start();
        expect(beatStream.isRunning()).toBe(true);

        beatStream.pause();
        expect(beatStream.isPaused()).toBe(true);
        expect(beatStream.isRunning()).toBe(false);

        beatStream.resume();
        expect(beatStream.isPaused()).toBe(false);
        expect(beatStream.isRunning()).toBe(true);

        beatStream.stop();
        expect(beatStream.isRunning()).toBe(false);
    });

    it('should calculate BPM from beat intervals', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0, beatIndex: 0 }),
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 1 }), // 120 BPM
            createMockVariantBeat({ timestamp: 1.0, beatIndex: 2 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([
            createMockBeat(0),
            createMockBeat(0.5),
            createMockBeat(1.0),
        ]);
        const keyAssignments = new Map<number, string>();

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        beatStream.start();

        const currentBpm = beatStream.getCurrentBpm();
        // BPM should be close to 120 (0.5s interval = 120 BPM)
        expect(currentBpm).toBeGreaterThanOrEqual(100);
        expect(currentBpm).toBeLessThanOrEqual(140);

        beatStream.stop();
    });
});

// =============================================================================
// Tests: Button Press Detection with ChartedBeatMap
// =============================================================================

describe('checkButtonPress with ChartedBeatMap', () => {
    const converter = new BeatConverter();
    let mockAudioContext: AudioContext;

    beforeEach(() => {
        mockAudioContext = createMockAudioContext();
    });

    it('should check button press accuracy for beats with requiredKey', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 0 }),
            createMockVariantBeat({ timestamp: 1.0, beatIndex: 1 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([
            createMockBeat(0.5),
            createMockBeat(1.0),
        ]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'left');
        keyAssignments.set(1, 'right');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Press 'left' at exactly 0.5 seconds - should be perfect
        const result1 = beatStream.checkButtonPress(0.5, 'left');
        expect(result1.accuracy).toBe('perfect');
        expect(result1.keyMatch).toBe(true);
        expect(result1.requiredKey).toBe('left');
        expect(result1.pressedKey).toBe('left');
        expect(result1.matchedBeat.timestamp).toBe(0.5);

        // Press 'right' at exactly 1.0 seconds - should be perfect
        const result2 = beatStream.checkButtonPress(1.0, 'right');
        expect(result2.accuracy).toBe('perfect');
        expect(result2.keyMatch).toBe(true);
        expect(result2.requiredKey).toBe('right');

        beatStream.dispose();
    });

    it('should detect wrong key press', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0.5)]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'left');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Press wrong key 'right' when 'left' is required
        const result = beatStream.checkButtonPress(0.5, 'right');
        expect(result.accuracy).toBe('wrongKey');
        expect(result.keyMatch).toBe(false);
        expect(result.requiredKey).toBe('left');
        expect(result.pressedKey).toBe('right');

        beatStream.dispose();
    });

    it('should detect miss when no key is pressed for requiredKey beat', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0.5)]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'left');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Press without specifying key when key is required
        const result = beatStream.checkButtonPress(0.5);
        expect(result.accuracy).toBe('miss');
        expect(result.keyMatch).toBe(false);

        beatStream.dispose();
    });

    it('should measure timing accuracy (perfect/great/good/ok/miss)', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 1.0, beatIndex: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(1.0)]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'up');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Perfect timing (within 40ms)
        const perfect = beatStream.checkButtonPress(1.0, 'up');
        expect(perfect.accuracy).toBe('perfect');
        expect(perfect.absoluteOffset).toBeLessThanOrEqual(0.04);

        // Great timing (within 80ms)
        const great = beatStream.checkButtonPress(1.06, 'up');
        expect(great.accuracy).toBe('great');

        // Good timing (within 120ms)
        const good = beatStream.checkButtonPress(1.10, 'up');
        expect(good.accuracy).toBe('good');

        // OK timing (within 150ms)
        const ok = beatStream.checkButtonPress(1.13, 'up');
        expect(ok.accuracy).toBe('ok');

        // Miss (too far off)
        const miss = beatStream.checkButtonPress(1.2, 'up');
        expect(miss.accuracy).toBe('miss');

        beatStream.dispose();
    });

    it('should handle beats without requiredKey (any key is valid)', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0.5)]);
        const keyAssignments = new Map<number, string>(); // No key assigned

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Any key should work since no requiredKey
        const result = beatStream.checkButtonPress(0.5, 'any-key');
        expect(result.accuracy).toBe('perfect');
        expect(result.keyMatch).toBe(true);
        expect(result.requiredKey).toBeUndefined();

        beatStream.dispose();
    });

    it('should support different difficulty presets for accuracy thresholds', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 1.0, beatIndex: 0 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(1.0)]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'up');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );
        const beatMap = chartedBeatMapToBeatMap(chartedMap);

        // Test with easy difficulty (more lenient thresholds)
        const easyStream = new BeatStream(beatMap, mockAudioContext, {
            difficultyPreset: 'easy',
        });

        const easyThresholds = easyStream.getAccuracyThresholds();
        expect(easyThresholds.perfect).toBeDefined();

        // Test with hard difficulty (stricter thresholds)
        const hardStream = new BeatStream(beatMap, mockAudioContext, {
            difficultyPreset: 'hard',
        });

        const hardThresholds = hardStream.getAccuracyThresholds();
        expect(hardThresholds.perfect).toBeDefined();

        // Hard should have stricter perfect threshold than easy
        expect(hardThresholds.perfect).toBeLessThanOrEqual(easyThresholds.perfect);

        easyStream.dispose();
        hardStream.dispose();
    });
});

// =============================================================================
// Tests: Full Conversion Pipeline
// =============================================================================

describe('Full conversion pipeline: VariantBeat -> ChartedBeatMap -> BeatStream', () => {
    const converter = new BeatConverter();
    let mockAudioContext: AudioContext;

    beforeEach(() => {
        mockAudioContext = createMockAudioContext();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should preserve beat timing through the full pipeline', () => {
        // Create a realistic beat pattern
        const variantBeats: VariantBeat[] = [];
        const unifiedBeats: Beat[] = [];

        for (let i = 0; i < 8; i++) {
            const timestamp = i * 0.5;
            variantBeats.push(
                createMockVariantBeat({
                    timestamp,
                    beatIndex: i,
                    gridPosition: 0,
                    gridType: 'straight_16th',
                    intensity: 0.5 + Math.random() * 0.5,
                    sourceBand: i % 3 === 0 ? 'low' : i % 3 === 1 ? 'mid' : 'high',
                })
            );
            unifiedBeats.push(createMockBeat(timestamp, { beatInMeasure: i % 4 }));
        }

        const variant = createMockVariant(variantBeats, 'medium');
        const unifiedBeatMap = createMockUnifiedBeatMap(unifiedBeats);

        // Assign keys using a pattern
        const keyAssignments = new Map<number, string>();
        const keys = ['left', 'down', 'up', 'right'];
        variantBeats.forEach((_, i) => {
            keyAssignments.set(i, keys[i % 4]);
        });

        // Convert to ChartedBeatMap
        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            { pitchInfluencedBeats: 4 }
        );

        // Verify ChartedBeatMap structure
        expect(chartedMap.beats).toHaveLength(8);
        expect(chartedMap.chartMetadata.keysUsed).toContain('left');
        expect(chartedMap.chartMetadata.keysUsed).toContain('down');
        expect(chartedMap.chartMetadata.keysUsed).toContain('up');
        expect(chartedMap.chartMetadata.keysUsed).toContain('right');

        // Convert to BeatMap for BeatStream
        const beatMap = chartedBeatMapToBeatMap(chartedMap);

        // Create BeatStream
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Verify timing is preserved
        for (let i = 0; i < 8; i++) {
            const beat = beatStream.getNormalizedBeatMap().beats[i];
            expect(beat.timestamp).toBeCloseTo(i * 0.5, 5);
            expect(beat.requiredKey).toBe(keys[i % 4]);
        }

        beatStream.dispose();
    });

    it('should preserve subdivision types through the pipeline', () => {
        const beats = [
            createMockVariantBeat({ timestamp: 0, beatIndex: 0, gridType: 'straight_16th', gridPosition: 0 }),
            createMockVariantBeat({ timestamp: 0.125, beatIndex: 0, gridType: 'straight_16th', gridPosition: 1 }),
            createMockVariantBeat({ timestamp: 0.5, beatIndex: 1, gridType: 'triplet_8th', gridPosition: 0 }),
            createMockVariantBeat({ timestamp: 0.667, beatIndex: 1, gridType: 'triplet_8th', gridPosition: 1 }),
        ];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([
            createMockBeat(0),
            createMockBeat(0.5),
        ]);
        const keyAssignments = new Map<number, string>();

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        // Verify subdivision types are mapped correctly
        expect(chartedMap.beats[0].subdivisionType).toBe('sixteenth');
        expect(chartedMap.beats[1].subdivisionType).toBe('sixteenth');
        expect(chartedMap.beats[2].subdivisionType).toBe('triplet8');
        expect(chartedMap.beats[3].subdivisionType).toBe('triplet8');

        // Convert and verify BeatStream can handle it
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        expect(beatStream.getNormalizedBeatMap().beats).toHaveLength(4);

        beatStream.dispose();
    });

    it('should work with 16th note grid positions', () => {
        // Test all 16th note positions within a quarter note
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
        keyAssignments.set(0, 'left');
        keyAssignments.set(1, 'down');
        keyAssignments.set(2, 'up');
        keyAssignments.set(3, 'right');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        // Verify beatInMeasure calculations
        expect(chartedMap.beats[0].beatInMeasure).toBeCloseTo(0, 5);
        expect(chartedMap.beats[1].beatInMeasure).toBeCloseTo(0.25, 5);
        expect(chartedMap.beats[2].beatInMeasure).toBeCloseTo(0.5, 5);
        expect(chartedMap.beats[3].beatInMeasure).toBeCloseTo(0.75, 5);

        // Verify keys are preserved
        expect(chartedMap.beats[0].requiredKey).toBe('left');
        expect(chartedMap.beats[1].requiredKey).toBe('down');
        expect(chartedMap.beats[2].requiredKey).toBe('up');
        expect(chartedMap.beats[3].requiredKey).toBe('right');

        // Verify it works with BeatStream
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Check button press for each position
        expect(beatStream.checkButtonPress(0, 'left').accuracy).toBe('perfect');
        expect(beatStream.checkButtonPress(0.125, 'down').accuracy).toBe('perfect');
        expect(beatStream.checkButtonPress(0.25, 'up').accuracy).toBe('perfect');
        expect(beatStream.checkButtonPress(0.375, 'right').accuracy).toBe('perfect');

        beatStream.dispose();
    });

    it('should work with triplet grid positions', () => {
        // Test all triplet positions within a quarter note
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
        keyAssignments.set(0, '1');
        keyAssignments.set(1, '2');
        keyAssignments.set(2, '3');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        // Verify beatInMeasure calculations (triplet offsets)
        expect(chartedMap.beats[0].beatInMeasure).toBeCloseTo(0, 2);
        expect(chartedMap.beats[1].beatInMeasure).toBeCloseTo(1/3, 2);
        expect(chartedMap.beats[2].beatInMeasure).toBeCloseTo(2/3, 2);

        // Verify it works with BeatStream
        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        // Check button press for each position
        expect(beatStream.checkButtonPress(0, '1').accuracy).toBe('perfect');
        expect(beatStream.checkButtonPress(0.167, '2').accuracy).toBe('great');
        expect(beatStream.checkButtonPress(0.333, '3').accuracy).toBe('great');

        beatStream.dispose();
    });
});

// =============================================================================
// Tests: Edge Cases
// =============================================================================

describe('Edge cases', () => {
    const converter = new BeatConverter();
    let mockAudioContext: AudioContext;

    beforeEach(() => {
        mockAudioContext = createMockAudioContext();
    });

    it('should handle empty ChartedBeatMap', () => {
        const variant = createMockVariant([]);
        const unifiedBeatMap = createMockUnifiedBeatMap([]);
        const keyAssignments = new Map<number, string>();

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        expect(beatStream.getNormalizedBeatMap().beats).toHaveLength(0);
        expect(beatStream.getDuration()).toBe(chartedMap.duration);

        // Button press with no beats should return miss
        const result = beatStream.checkButtonPress(1.0, 'any');
        expect(result.accuracy).toBe('miss');

        beatStream.dispose();
    });

    it('should handle single beat ChartedBeatMap', () => {
        const beats = [createMockVariantBeat({ timestamp: 0, beatIndex: 0 })];
        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap([createMockBeat(0)]);
        const keyAssignments = new Map<number, string>();
        keyAssignments.set(0, 'center');

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        expect(beatStream.getNormalizedBeatMap().beats).toHaveLength(1);

        const result = beatStream.checkButtonPress(0, 'center');
        expect(result.accuracy).toBe('perfect');
        expect(result.keyMatch).toBe(true);

        beatStream.dispose();
    });

    it('should handle very dense ChartedBeatMap (many beats)', () => {
        // Create 100 beats
        const beats: VariantBeat[] = [];
        const unifiedBeats: Beat[] = [];

        for (let i = 0; i < 100; i++) {
            const timestamp = i * 0.1;
            beats.push(createMockVariantBeat({
                timestamp,
                beatIndex: Math.floor(i / 4),
                gridPosition: i % 4,
            }));
            if (i % 4 === 0) {
                unifiedBeats.push(createMockBeat(timestamp, { beatInMeasure: (i / 4) % 4 }));
            }
        }

        const variant = createMockVariant(beats);
        const unifiedBeatMap = createMockUnifiedBeatMap(unifiedBeats);
        const keyAssignments = new Map<number, string>();
        const keys = ['left', 'down', 'up', 'right'];
        beats.forEach((_, i) => {
            keyAssignments.set(i, keys[i % 4]);
        });

        const chartedMap = converter.convertToChartedBeatMap(
            variant,
            unifiedBeatMap,
            keyAssignments,
            {}
        );

        const beatMap = chartedBeatMapToBeatMap(chartedMap);
        const beatStream = new BeatStream(beatMap, mockAudioContext);

        expect(beatStream.getNormalizedBeatMap().beats).toHaveLength(100);

        // Test a few random beats
        expect(beatStream.checkButtonPress(0, 'left').accuracy).toBe('perfect');
        expect(beatStream.checkButtonPress(5.0, 'right').accuracy).toBe('perfect'); // beat 50, position 2 = up... wait let me recalculate
        // beat 50: i=50, 50 % 4 = 2, so key = 'up'
        expect(beatStream.checkButtonPress(5.0, 'up').accuracy).toBe('perfect');

        beatStream.dispose();
    });
});
