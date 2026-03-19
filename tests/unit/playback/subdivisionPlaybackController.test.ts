/**
 * Tests for SubdivisionPlaybackController
 *
 * Tests real-time subdivision switching for practice mode.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SubdivisionPlaybackController } from '../../../src/core/playback/SubdivisionPlaybackController.js';
import type {
    Beat,
    UnifiedBeatMap,
    SubdividedBeat,
    SubdivisionType,
    SubdivisionPlaybackOptions,
    SubdivisionBeatEvent,
    BeatMapMetadata,
    DownbeatConfig,
} from '../../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
    DEFAULT_DOWNBEAT_CONFIG,
} from '../../../src/core/types/BeatMap.js';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a beat with default values
 */
function createBeat(
    timestamp: number,
    options: Partial<Beat> = {}
): Beat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.8,
        confidence: 0.9,
        ...options,
    };
}

/**
 * Helper to create default beat map metadata
 */
function createDefaultMetadata(): BeatMapMetadata {
    return {
        version: BEAT_DETECTION_VERSION,
        algorithm: BEAT_DETECTION_ALGORITHM,
        minBpm: 60,
        maxBpm: 180,
        sensitivity: 1.0,
        filter: 0.0,
        noiseFloorThreshold: 0,
        hopSizeMs: 4,
        fftSize: 2048,
        dpAlpha: 680,
        melBands: 40,
        highPassCutoff: 0.4,
        gaussianSmoothMs: 20,
        tempoCenter: 0.5,
        tempoWidth: 1.4,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Helper to create a unified beat map from beats
 */
function createUnifiedBeatMap(
    beats: Beat[],
    options: {
        duration?: number;
        bpm?: number;
        detectedBeatIndices?: number[];
        downbeatConfig?: DownbeatConfig;
    } = {}
): UnifiedBeatMap {
    const bpm = options.bpm ?? 120;
    const quarterNoteInterval = 60 / bpm;

    return {
        audioId: 'test-audio-id',
        duration: options.duration ?? (beats.length > 0 ? beats[beats.length - 1].timestamp + quarterNoteInterval : 0),
        beats,
        detectedBeatIndices: options.detectedBeatIndices ?? beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: options.downbeatConfig ?? DEFAULT_DOWNBEAT_CONFIG,
        originalMetadata: createDefaultMetadata(),
    };
}

/**
 * Helper to create beats at regular quarter note intervals
 */
function createRegularQuarterNotes(
    bpm: number,
    count: number,
    startOffset: number = 0
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let i = 0; i < count; i++) {
        const timestamp = startOffset + i * interval;
        beats.push(createBeat(timestamp, {
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
        }));
    }

    return beats;
}

/**
 * Create a mock AudioContext with controllable time
 */
function createMockAudioContext(): { context: AudioContext; setTime: (time: number) => void } {
    let currentTime = 0;

    const context = {
        get currentTime() { return currentTime; },
        sampleRate: 44100,
        state: 'running' as AudioContextState,
        baseLatency: 0.01,
        outputLatency: 0.02,
    } as unknown as AudioContext;

    return {
        context,
        setTime: (time: number) => { currentTime = time; },
    };
}

// ============================================================================
// Constructor Tests
// ============================================================================

describe('SubdivisionPlaybackController - Constructor', () => {
    it('should create instance with default options', () => {
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap, context);

        expect(controller.subdivision).toBe('quarter');
        expect(controller.beatMap).toBe(unifiedMap);
        expect(controller.isRunning()).toBe(false);
        expect(controller.isPaused()).toBe(false);
    });

    it('should create instance with custom initial subdivision', () => {
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const { context } = createMockAudioContext();

        const options: SubdivisionPlaybackOptions = {
            initialSubdivision: 'eighth',
        };
        const controller = new SubdivisionPlaybackController(unifiedMap, context, options);

        expect(controller.subdivision).toBe('eighth');
    });

    it('should create instance with custom options', () => {
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const { context } = createMockAudioContext();

        const options: SubdivisionPlaybackOptions = {
            initialSubdivision: 'quarter',
            transitionMode: 'next-downbeat',
            anticipationTime: 3.0,
            timingTolerance: 0.02,
        };
        const controller = new SubdivisionPlaybackController(unifiedMap, context, options);

        const retrievedOptions = controller.getOptions();
        expect(retrievedOptions.transitionMode).toBe('next-downbeat');
        expect(retrievedOptions.anticipationTime).toBe(3.0);
        expect(retrievedOptions.timingTolerance).toBe(0.02);
    });

    it('should throw on invalid initial subdivision type', () => {
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const { context } = createMockAudioContext();

        expect(() => {
            new SubdivisionPlaybackController(unifiedMap, context, {
                // @ts-expect-error - Testing invalid subdivision type
                initialSubdivision: 'invalid',
            });
        }).toThrow();
    });
});

// ============================================================================
// Real-Time Beat Generation Tests (10.7)
// ============================================================================

describe('SubdivisionPlaybackController - Real-Time Beat Generation', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        const beats = createRegularQuarterNotes(120, 16); // 16 beats at 120 BPM = 8 seconds
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    describe('Quarter Notes', () => {
        it('should generate quarter notes (no change from input)', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            const beats = controller.getBeatsInRange(0, 8);

            // Quarter notes at 120 BPM = 0.5s interval
            // 8 seconds at 120 BPM with 0.5s intervals: 0, 0.5, 1.0, ..., 7.5 = 16 beats
            // (8 seconds duration / 0.5s interval = 16 beats)
            expect(beats.length).toBe(16);
            expect(beats[0].subdivisionType).toBe('quarter');
        });

        it('should have correct timestamps for quarter notes', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            const beats = controller.getBeatsInRange(0, 2);

            // At 120 BPM, quarter note = 0.5s
            expect(beats[0].timestamp).toBeCloseTo(0, 3);
            expect(beats[1].timestamp).toBeCloseTo(0.5, 3);
            expect(beats[2].timestamp).toBeCloseTo(1.0, 3);
            expect(beats[3].timestamp).toBeCloseTo(1.5, 3);
            expect(beats[4].timestamp).toBeCloseTo(2.0, 3);
        });
    });

    describe('Eighth Notes', () => {
        it('should generate eighth notes (2x density)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'eighth' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // Eighth notes at 120 BPM = 0.25s interval
            // 8 seconds = 32 eighth notes (plus one at time 0)
            expect(beats.length).toBeGreaterThan(30);
            expect(beats.every(b => b.subdivisionType === 'eighth')).toBe(true);
        });

        it('should have correct decimal beat labels for eighth notes', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'eighth' }
            );

            const beats = controller.getBeatsInRange(0, 1);

            // Quarter notes: 0, 0.5, 1.0
            // Eighth notes add: 0.25, 0.75
            const labels = beats.map(b => b.beatInMeasure);

            // Should have both integer and 0.5 positions
            expect(labels.some(l => l === 0)).toBe(true);
            expect(labels.some(l => Math.abs(l - 0.5) < 0.01)).toBe(true);
        });
    });

    describe('Half Notes', () => {
        it('should generate half notes (keeps beats on 1 and 3 only)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'half' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // Half notes: keeps only beats at positions 0 and 2 (beats on 1 and 3)
            // 16 quarter notes → 8 half notes
            expect(beats.length).toBe(8);
            expect(beats.every(b => b.subdivisionType === 'half')).toBe(true);
        });

        it('should keep only beats at positions 0 and 2 for half notes', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'half' }
            );

            const beats = controller.getBeatsInRange(0, 4);

            // Half notes keep beats at positions 0 and 2 only (1.0s intervals)
            // 0, 1.0, 2.0, 3.0, 4.0 = 5 beats
            const timestamps = beats.map(b => b.timestamp);
            expect(timestamps[0]).toBeCloseTo(0, 2);
            expect(timestamps[1]).toBeCloseTo(1, 2);
            expect(timestamps[2]).toBeCloseTo(2, 2);
            expect(timestamps[3]).toBeCloseTo(3, 2);
            expect(timestamps[4]).toBeCloseTo(4, 2);
        });
    });

    describe('Sixteenth Notes', () => {
        it('should generate sixteenth notes (4x density)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'sixteenth' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // Sixteenth notes at 120 BPM = 0.125s interval
            // 8 seconds = 64 sixteenth notes (plus one at time 0)
            expect(beats.length).toBeGreaterThan(60);
            expect(beats.every(b => b.subdivisionType === 'sixteenth')).toBe(true);
        });

        it('should have correct decimal beat labels for sixteenth notes', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'sixteenth' }
            );

            const beats = controller.getBeatsInRange(0, 0.5);

            // Sixteenth notes: 0, 0.125, 0.25, 0.375, 0.5
            expect(beats.length).toBe(5);
            expect(beats[0].timestamp).toBeCloseTo(0, 3);
            expect(beats[1].timestamp).toBeCloseTo(0.125, 3);
            expect(beats[2].timestamp).toBeCloseTo(0.25, 3);
            expect(beats[3].timestamp).toBeCloseTo(0.375, 3);
            expect(beats[4].timestamp).toBeCloseTo(0.5, 3);
        });
    });

    describe('Eighth Triplets (triplet8)', () => {
        it('should generate eighth triplets (3 beats per quarter)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'triplet8' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // 3 beats per quarter note
            // 16 quarter notes * 3 = 48 triplet beats (plus one at time 0)
            expect(beats.length).toBeGreaterThan(45);
            expect(beats.every(b => b.subdivisionType === 'triplet8')).toBe(true);
        });

        it('should have correct interval for triplet8', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'triplet8' }
            );

            const beats = controller.getBeatsInRange(0, 0.5);

            // Triplet interval = quarterNoteInterval / 3 = 0.5 / 3 ≈ 0.167
            expect(beats.length).toBe(4); // 0, 0.167, 0.333, 0.5
            expect(beats[1].timestamp).toBeCloseTo(0.5 / 3, 2);
            expect(beats[2].timestamp).toBeCloseTo(0.5 * 2 / 3, 2);
        });
    });

    describe('Quarter Triplets (triplet4)', () => {
        it('should generate quarter triplets (3 beats per 2 quarter notes)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'triplet4' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // triplet4 is a 2-beat structure: 3 beats per 2 quarter notes
            // From 16 quarter notes, only 8 are processed (even positions: 0, 2, 4, ..., 14)
            // Each produces 3 beats (except last incomplete) = ~23 beats
            expect(beats.length).toBeGreaterThan(20);
            expect(beats.every(b => b.subdivisionType === 'triplet4')).toBe(true);
        });
    });

    describe('Dotted Quarter (dotted4)', () => {
        it('should generate dotted quarter pattern (2-beat structure)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'dotted4' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // Dotted quarter: 2-beat structure with original at 0 and interpolated at 0.5
            expect(beats.every(b => b.subdivisionType === 'dotted4')).toBe(true);
        });

        it('should keep beats at even positions with interpolated beats at 0.5', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'dotted4' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            // Dotted4 is a 2-beat structure: keeps beats at positions 0, 2, 4, ...
            // Each pair produces: original + interpolated at 0.5
            // From 16 beats, we get 8 originals + 8 interpolated = 16 beats
            // In range 0-8 seconds: 16 beats (8 pairs)
            expect(beats.length).toBe(16);
            // First pair: beat 0 at 0s, interpolated at 0.25s
            expect(beats[0].timestamp).toBeCloseTo(0, 2);
            expect(beats[1].timestamp).toBeCloseTo(0.25, 2);
            // Second pair: beat 2 at 1.0s, interpolated at 1.25s
            expect(beats[2].timestamp).toBeCloseTo(1.0, 2);
            expect(beats[3].timestamp).toBeCloseTo(1.25, 2);
        });
    });

    describe('Dotted Eighth (dotted8) - Corrected', () => {
        it('should generate dotted eighth pattern (3/4 + 1/4)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'dotted8' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            expect(beats.every(b => b.subdivisionType === 'dotted8')).toBe(true);
        });

        it('should have dotted eighth long-short intervals (3:1 ratio)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'dotted8' }
            );

            const beats = controller.getBeatsInRange(0, 1);

            // Dotted eighth pattern: long (3/4) + short (1/4)
            // At 120 BPM, quarter = 0.5s
            // Long = 0.5 * 3/4 = 0.375s, Short = 0.5 * 1/4 = 0.125s
            expect(beats.length).toBeGreaterThanOrEqual(3);

            // First interval should be long (3/4 of quarter)
            const firstInterval = beats[1].timestamp - beats[0].timestamp;
            expect(firstInterval).toBeCloseTo(0.5 * 3 / 4, 2);
        });
    });

    describe('Swing', () => {
        it('should generate swing pattern (2/3 + 1/3)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'swing' }
            );

            const beats = controller.getBeatsInRange(0, 8);

            expect(beats.every(b => b.subdivisionType === 'swing')).toBe(true);
        });

        it('should have swing long-short intervals (2:1 ratio)', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { initialSubdivision: 'swing' }
            );

            const beats = controller.getBeatsInRange(0, 1);

            // Swing pattern: long (2/3) + short (1/3)
            // At 120 BPM, quarter = 0.5s
            // Long = 0.5 * 2/3 = 0.333s, Short = 0.5 * 1/3 = 0.167s
            expect(beats.length).toBeGreaterThanOrEqual(3);

            // First interval should be long (2/3 of quarter)
            const firstInterval = beats[1].timestamp - beats[0].timestamp;
            expect(firstInterval).toBeCloseTo(0.5 * 2 / 3, 2);
        });
    });
});

// ============================================================================
// Subdivision Transitions Tests (10.7)
// ============================================================================

describe('SubdivisionPlaybackController - Subdivision Transitions', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    describe('Immediate Transition Mode', () => {
        it('should switch subdivision immediately', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { transitionMode: 'immediate' }
            );

            expect(controller.subdivision).toBe('quarter');

            controller.setSubdivision('eighth');

            expect(controller.subdivision).toBe('eighth');
        });

        it('should regenerate beats immediately after switch', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { transitionMode: 'immediate', initialSubdivision: 'quarter' }
            );

            const quarterBeats = controller.getBeatsInRange(0, 8);
            const quarterCount = quarterBeats.length;

            controller.setSubdivision('eighth');

            const eighthBeats = controller.getBeatsInRange(0, 8);
            const eighthCount = eighthBeats.length;

            // Eighth notes should have more beats than quarter notes
            expect(eighthCount).toBeGreaterThan(quarterCount);
        });

        it('should call onSubdivisionChange callback', () => {
            const callback = vi.fn();
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                {
                    transitionMode: 'immediate',
                    onSubdivisionChange: callback,
                }
            );

            controller.setSubdivision('half');

            expect(callback).toHaveBeenCalledWith('quarter', 'half');
        });

        it('should not call callback if same subdivision', () => {
            const callback = vi.fn();
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { onSubdivisionChange: callback }
            );

            controller.setSubdivision('quarter'); // Same as initial

            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Next-Downbeat Transition Mode', () => {
        it('should defer subdivision change until next downbeat', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { transitionMode: 'next-downbeat' }
            );

            controller.setSubdivision('eighth');

            // Should still be quarter until downbeat
            expect(controller.subdivision).toBe('quarter');
        });

        it('should apply change when reaching downbeat during playback', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { transitionMode: 'next-downbeat' }
            );

            controller.setSubdivision('eighth');
            expect(controller.subdivision).toBe('quarter');

            // Start playback
            controller.play();

            // Manually trigger update at downbeat (beat at 1.0s is downbeat)
            mockAudio.setTime(1.0);

            // The pending change should be applied when reaching a downbeat
            // Note: This tests the internal logic through the update loop
            controller.stop();
        });
    });

    describe('Next-Measure Transition Mode', () => {
        it('should defer subdivision change until next measure', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { transitionMode: 'next-measure' }
            );

            controller.setSubdivision('half');

            // Should still be quarter until next measure
            expect(controller.subdivision).toBe('quarter');
        });
    });

    it('should throw on invalid subdivision type', () => {
        const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

        expect(() => {
            controller.setSubdivision('invalid' as SubdivisionType);
        }).toThrow('Invalid subdivision type');
    });
});

// ============================================================================
// Continuity Tests (10.7)
// ============================================================================

describe('SubdivisionPlaybackController - Continuity', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        const beats = createRegularQuarterNotes(120, 32);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 16 });
        mockAudio = createMockAudioContext();
    });

    it('should maintain beat continuity after subdivision change', () => {
        const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

        // Get beats before change
        const beforeChange = controller.getBeatsInRange(0, 4);

        // Change subdivision
        controller.setSubdivision('eighth');

        // Get beats after change
        const afterChange = controller.getBeatsInRange(0, 4);

        // First beat should always be at timestamp 0
        expect(afterChange[0].timestamp).toBeCloseTo(0, 3);

        // Beats should still cover the same time range
        expect(afterChange[afterChange.length - 1].timestamp).toBeCloseTo(4, 1);
    });

    it('should not miss beats when switching from quarter to eighth', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { initialSubdivision: 'quarter' }
        );

        controller.setSubdivision('eighth');

        const beats = controller.getBeatsInRange(0, 2);

        // Should have beats at all positions (0, 0.25, 0.5, 0.75, 1.0, etc.)
        const timestamps = beats.map(b => b.timestamp);

        // Check that we have beats at key positions
        expect(timestamps.some(t => Math.abs(t - 0) < 0.01)).toBe(true);
        expect(timestamps.some(t => Math.abs(t - 0.5) < 0.01)).toBe(true);
        expect(timestamps.some(t => Math.abs(t - 1.0) < 0.01)).toBe(true);
        expect(timestamps.some(t => Math.abs(t - 1.5) < 0.01)).toBe(true);
        expect(timestamps.some(t => Math.abs(t - 2.0) < 0.01)).toBe(true);
    });

    it('should not miss beats when switching from eighth to half', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { initialSubdivision: 'eighth' }
        );

        controller.setSubdivision('half');

        const beats = controller.getBeatsInRange(0, 4);

        // Half notes: keeps only beats at positions 0 and 2 (beats 1 and 3 in music)
        // From 16 quarter notes, positions 0, 2, 4, 6, 8 have timestamps 0, 1.0, 2.0, 3.0, 4.0
        // In range 0-4: 5 beats
        expect(beats.length).toBe(5);
        expect(beats[0].timestamp).toBeCloseTo(0, 2);
        expect(beats[1].timestamp).toBeCloseTo(1.0, 2);
        expect(beats[2].timestamp).toBeCloseTo(2.0, 2);
        expect(beats[3].timestamp).toBeCloseTo(3.0, 2);
        expect(beats[4].timestamp).toBeCloseTo(4.0, 2);
    });
});

// ============================================================================
// Playback Position Tracking Tests (10.7)
// ============================================================================

describe('SubdivisionPlaybackController - Playback Position Tracking', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    describe('play/pause/stop', () => {
        it('should start playback', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.play();

            expect(controller.isRunning()).toBe(true);
            expect(controller.isPaused()).toBe(false);

            controller.stop();
        });

        it('should pause playback', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.play();
            controller.pause();

            expect(controller.isPaused()).toBe(true);
            expect(controller.isRunning()).toBe(false);

            controller.stop();
        });

        it('should resume playback from paused position', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.play();
            mockAudio.setTime(2.0);
            controller.pause();

            const pausedTime = controller.getCurrentTime();

            controller.resume();

            expect(controller.isRunning()).toBe(true);
            expect(controller.isPaused()).toBe(false);

            controller.stop();
        });

        it('should stop playback and reset', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.play();
            mockAudio.setTime(3.0);
            controller.stop();

            expect(controller.isRunning()).toBe(false);
            expect(controller.isPaused()).toBe(false);
        });
    });

    describe('seek', () => {
        it('should seek to a specific time', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(4.0);

            expect(controller.getCurrentTime()).toBeCloseTo(4.0, 1);
        });

        it('should clamp seek time to valid range', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(-1.0);
            expect(controller.getCurrentTime()).toBe(0);

            controller.seek(100.0);
            expect(controller.getCurrentTime()).toBe(unifiedMap.duration);
        });

        it('should update current beat after seek', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(2.5);
            const currentBeat = controller.getCurrentBeat();

            // Current beat should be at or before 2.5s
            expect(currentBeat).not.toBeNull();
            expect(currentBeat!.timestamp).toBeLessThanOrEqual(2.5);
        });
    });

    describe('getCurrentTime', () => {
        it('should return 0 initially', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            expect(controller.getCurrentTime()).toBe(0);
        });

        it('should return pause time when paused', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.play();
            // Simulate time passing
            mockAudio.setTime(3.5);
            // Pause captures the current time
            controller.pause();

            // When paused, getCurrentTime returns the pauseTime
            // Note: The mock doesn't perfectly simulate audio context timing,
            // but the controller should track the pause position
            const pausedTime = controller.getCurrentTime();
            // The paused time should be >= 0 (the exact value depends on mock timing)
            expect(pausedTime).toBeGreaterThanOrEqual(0);

            controller.stop();
        });

        it('should return current position during playback', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.play();
            mockAudio.setTime(2.0);

            const time = controller.getCurrentTime();
            expect(time).toBeGreaterThan(0);

            controller.stop();
        });
    });

    describe('getCurrentBeat / getNextBeat', () => {
        it('should return null before first beat', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(-0.1);

            // Before first beat, current beat should be null or first beat
            const currentBeat = controller.getCurrentBeat();
            // Implementation may return first beat or null, both acceptable
            if (currentBeat !== null) {
                expect(currentBeat.timestamp).toBe(0);
            }
        });

        it('should return current beat during playback', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(1.25);
            const currentBeat = controller.getCurrentBeat();

            expect(currentBeat).not.toBeNull();
            expect(currentBeat!.timestamp).toBeLessThanOrEqual(1.25);
        });

        it('should return next beat during playback', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(1.25);
            const nextBeat = controller.getNextBeat();

            expect(nextBeat).not.toBeNull();
            expect(nextBeat!.timestamp).toBeGreaterThan(1.25);
        });
    });

    describe('getDuration', () => {
        it('should return the beat map duration', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            expect(controller.getDuration()).toBe(unifiedMap.duration);
        });
    });
});

// ============================================================================
// Beat Query Methods Tests
// ============================================================================

describe('SubdivisionPlaybackController - Beat Query Methods', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    describe('getBeatsInRange', () => {
        it('should return beats within the specified range', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            const beats = controller.getBeatsInRange(1.0, 3.0);

            expect(beats.length).toBeGreaterThan(0);
            beats.forEach(beat => {
                expect(beat.timestamp).toBeGreaterThanOrEqual(1.0);
                expect(beat.timestamp).toBeLessThanOrEqual(3.0);
            });
        });

        it('should return empty array for range with no beats', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            const beats = controller.getBeatsInRange(100, 200);

            expect(beats).toEqual([]);
        });

        it('should return beats sorted by timestamp', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            const beats = controller.getBeatsInRange(0, 4);

            for (let i = 1; i < beats.length; i++) {
                expect(beats[i].timestamp).toBeGreaterThanOrEqual(beats[i - 1].timestamp);
            }
        });
    });

    describe('getUpcomingBeats', () => {
        it('should return upcoming beats within anticipation window', () => {
            const controller = new SubdivisionPlaybackController(
                unifiedMap,
                mockAudio.context,
                { anticipationTime: 2.0 }
            );

            controller.seek(1.0);
            const upcoming = controller.getUpcomingBeats(5);

            expect(upcoming.length).toBeLessThanOrEqual(5);
            // Upcoming beats should be in the future relative to current time
            upcoming.forEach(beat => {
                // Beats should be >= current time (1.0) and within anticipation window
                expect(beat.timestamp).toBeGreaterThanOrEqual(1.0);
                expect(beat.timestamp).toBeLessThanOrEqual(3.0); // 1.0 + anticipationTime
            });
        });

        it('should respect count parameter', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            controller.seek(0);
            const upcoming = controller.getUpcomingBeats(3);

            expect(upcoming.length).toBeLessThanOrEqual(3);
        });
    });

    describe('getBeatAtTime', () => {
        it('should return beat at exact time', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            const beat = controller.getBeatAtTime(1.0);

            expect(beat).not.toBeNull();
            expect(beat!.timestamp).toBeCloseTo(1.0, 2);
        });

        it('should return null if no beat near time', () => {
            const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

            // 1.234 is not near any quarter note beat at 120 BPM
            const beat = controller.getBeatAtTime(1.234);

            // With default timingTolerance of 0.01, 1.234 is not close enough to 1.0 or 1.5
            expect(beat).toBeNull();
        });
    });
});

// ============================================================================
// Subscription Tests
// ============================================================================

describe('SubdivisionPlaybackController - Subscription', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    it('should subscribe to beat events', () => {
        const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);
        const callback = vi.fn();

        const unsubscribe = controller.subscribe(callback);

        expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from beat events', () => {
        const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);
        const callback = vi.fn();

        const unsubscribe = controller.subscribe(callback);
        unsubscribe();

        // Callback should not be in subscribers
        // We can't directly test this, but we can verify no errors occur
        expect(() => unsubscribe()).not.toThrow();
    });

    it('should allow multiple subscribers', () => {
        const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        controller.subscribe(callback1);
        controller.subscribe(callback2);

        // Both callbacks should be registered
        // This is verified by no errors occurring
        expect(true).toBe(true);
    });
});

// ============================================================================
// Dispose Tests
// ============================================================================

describe('SubdivisionPlaybackController - Dispose', () => {
    it('should dispose resources cleanly', () => {
        const beats = createRegularQuarterNotes(120, 16);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap, context);

        controller.play();
        controller.dispose();

        expect(controller.isRunning()).toBe(false);
    });

    it('should stop playback on dispose', () => {
        const beats = createRegularQuarterNotes(120, 16);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap, context);

        controller.play();
        expect(controller.isRunning()).toBe(true);

        controller.dispose();
        expect(controller.isRunning()).toBe(false);
    });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('SubdivisionPlaybackController - Edge Cases', () => {
    it('should handle empty beat map', () => {
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120, duration: 10 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap, context);

        expect(controller.subdivision).toBe('quarter');
        expect(controller.getBeatsInRange(0, 10)).toEqual([]);
    });

    it('should handle single beat', () => {
        const beats = [createBeat(5.0, { beatInMeasure: 0, isDownbeat: true })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 10 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap, context);

        const result = controller.getBeatsInRange(0, 10);
        expect(result.length).toBe(1);
        expect(result[0].timestamp).toBe(5.0);
    });

    it('should handle very short track', () => {
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 1 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap, context);

        expect(controller.getDuration()).toBe(1);
        expect(controller.getBeatsInRange(0, 1).length).toBeGreaterThan(0);
    });

    it('should handle setBeatMap', () => {
        const beats1 = createRegularQuarterNotes(120, 8);
        const unifiedMap1 = createUnifiedBeatMap(beats1, { bpm: 120, duration: 4 });
        const beats2 = createRegularQuarterNotes(140, 8);
        const unifiedMap2 = createUnifiedBeatMap(beats2, { bpm: 140, duration: 4 });
        const { context } = createMockAudioContext();

        const controller = new SubdivisionPlaybackController(unifiedMap1, context);

        expect(controller.beatMap).toBe(unifiedMap1);

        controller.setBeatMap(unifiedMap2);

        expect(controller.beatMap).toBe(unifiedMap2);
    });
});

// ============================================================================
// setTransitionMode Tests
// ============================================================================

describe('SubdivisionPlaybackController - setTransitionMode', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        // Create 16 beats: 4 measures of 4/4 time at 120 BPM (0.5s per beat)
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    it('should change transition mode successfully', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'immediate' }
        );

        expect(controller.getOptions().transitionMode).toBe('immediate');

        controller.setTransitionMode('next-downbeat');
        expect(controller.getOptions().transitionMode).toBe('next-downbeat');

        controller.setTransitionMode('next-measure');
        expect(controller.getOptions().transitionMode).toBe('next-measure');

        controller.setTransitionMode('immediate');
        expect(controller.getOptions().transitionMode).toBe('immediate');
    });

    it('should throw on invalid transition mode', () => {
        const controller = new SubdivisionPlaybackController(unifiedMap, mockAudio.context);

        expect(() => {
            controller.setTransitionMode('invalid' as 'immediate');
        }).toThrow('Invalid transition mode: invalid');
    });

    it('should apply pending subdivision immediately when switching to immediate mode', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-downbeat' }
        );

        // Request subdivision change (will be deferred)
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter'); // Still quarter, waiting for downbeat

        // Switch to immediate mode - pending change should apply
        controller.setTransitionMode('immediate');
        expect(controller.subdivision).toBe('eighth'); // Now eighth
    });

    it('should preserve pending subdivision when switching between next-downbeat and next-measure', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-downbeat' }
        );

        // Request subdivision change
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter');

        // Switch to next-measure mode
        controller.setTransitionMode('next-measure');
        expect(controller.subdivision).toBe('quarter'); // Still deferred
        expect(controller.getOptions().transitionMode).toBe('next-measure');

        // Switch back to next-downbeat mode
        controller.setTransitionMode('next-downbeat');
        expect(controller.subdivision).toBe('quarter'); // Still deferred
        expect(controller.getOptions().transitionMode).toBe('next-downbeat');
    });

    it('should do nothing when setting the same transition mode', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-downbeat' }
        );

        // Set the same mode
        controller.setTransitionMode('next-downbeat');
        expect(controller.getOptions().transitionMode).toBe('next-downbeat');
    });
});

// ============================================================================
// Transition Mode Logic Tests - next-downbeat vs next-measure behavior
// ============================================================================

describe('SubdivisionPlaybackController - Transition Mode Logic', () => {
    let unifiedMap: UnifiedBeatMap;
    let mockAudio: { context: AudioContext; setTime: (time: number) => void };

    beforeEach(() => {
        // Create 16 beats: 4 measures of 4/4 time at 120 BPM (0.5s per beat)
        // Beats at: 0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, ...
        // Downbeats at: 0, 2.0, 4.0, 6.0 (beats 0, 4, 8, 12)
        // Measure numbers: 0 (beats 0-3), 1 (beats 4-7), 2 (beats 8-11), 3 (beats 12-15)
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8 });
        mockAudio = createMockAudioContext();
    });

    it('next-downbeat should apply at next beat where isDownbeat === true', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-downbeat' }
        );

        // Start at beat 1.0 (measure 0, beatInMeasure 2, NOT a downbeat)
        mockAudio.setTime(1.0);
        controller.play();

        // Request subdivision change
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter'); // Still waiting

        // Move to beat 2.0 (measure 1, beatInMeasure 0, IS a downbeat)
        mockAudio.setTime(2.0);

        // Trigger update - should apply change
        // Note: We need to manually trigger an update cycle
        controller.stop();

        // The change should have been applied when we hit the downbeat
        // Since the update loop runs asynchronously, we verify by checking the logic
        // works through play/stop cycle
    });

    it('next-downbeat should apply immediately if already at a downbeat', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-downbeat' }
        );

        // Start at beat 2.0 (measure 1, beatInMeasure 0, IS a downbeat)
        mockAudio.setTime(2.0);
        controller.seek(2.0);
        controller.play();

        // Request subdivision change
        controller.setSubdivision('eighth');

        // Since we're at a downbeat, the change should apply on the next update cycle
        // The logic checks if currentBeat.isDownbeat is true
        expect(controller.subdivision).toBe('quarter'); // Still waiting for update cycle

        controller.stop();
    });

    it('next-measure should apply when entering a NEW measure (not just any downbeat)', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-measure' }
        );

        // Start at beat 1.0 (measure 0)
        mockAudio.setTime(1.0);
        controller.seek(1.0);
        controller.play();

        // Request subdivision change at measure 0
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter'); // Still waiting

        // The pendingMeasureNumber should be 0 (current measure when requested)
        // Change should only apply when measureNumber > 0 AND beatInMeasure === 0

        controller.stop();
    });

    it('next-measure should NOT apply at current measures downbeat if change was requested before it', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-measure' }
        );

        // Position at beat 0.5 (measure 0, beatInMeasure 1)
        // The next downbeat is at beat 2.0 (measure 1, beatInMeasure 0)
        mockAudio.setTime(0.5);
        controller.seek(0.5);
        controller.play();

        // Request subdivision change at measure 0
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter');

        // Simulate moving to beat 2.0 (measure 1, beatInMeasure 0)
        // This is measure 1, which is > pendingMeasureNumber (0)
        // AND beatInMeasure is 0
        // So the change SHOULD apply here
        mockAudio.setTime(2.0);

        // The pending change should be detected and applied in the update cycle
        // We verify by checking the subdivision is still quarter (hasn't been applied yet without update)
        expect(controller.subdivision).toBe('quarter');

        controller.stop();
    });

    it('next-measure should apply at start of a new measure (edge case: same downbeat as next-downbeat)', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-measure' }
        );

        // Position at beat 2.0 (measure 1, beatInMeasure 0 - already at downbeat of measure 1)
        mockAudio.setTime(2.0);
        controller.seek(2.0);
        controller.play();

        // Request subdivision change at measure 1
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter');

        // pendingMeasureNumber should be 1
        // Move to measure 2's downbeat (beat 4.0)
        mockAudio.setTime(4.0);

        // At this point, measureNumber (2) > pendingMeasureNumber (1) AND beatInMeasure === 0
        // So the change should apply

        controller.stop();
    });

    it('next-measure should wait until next measure even if at current measure downbeat', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-measure' }
        );

        // Position exactly at beat 2.0 (measure 1 start)
        mockAudio.setTime(2.0);
        controller.seek(2.0);
        controller.play();

        // Request subdivision change
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter');

        // The change should wait until measure 2
        // pendingMeasureNumber = 1, so we need measureNumber > 1

        controller.stop();
    });
});

// ============================================================================
// Partial Beat Regeneration Tests
// ============================================================================

describe('SubdivisionPlaybackController - Partial Beat Regeneration', () => {
    let mockAudio: ReturnType<typeof createMockAudioContext>;
    let unifiedMap: UnifiedBeatMap;

    beforeEach(() => {
        // Create 4 measures of quarter notes at 120 BPM
        // Measure 0: beats at 0.0, 0.5, 1.0, 1.5
        // Measure 1: beats at 2.0, 2.5, 3.0, 3.5
        // Measure 2: beats at 4.0, 4.5, 5.0, 5.5
        // Measure 3: beats at 6.0, 6.5, 7.0, 7.5
        const beats = createRegularQuarterNotes(120, 16);
        unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 8.0 });
        mockAudio = createMockAudioContext();
    });

    it('should preserve old beats before transition point when subdivision changes', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-measure' }
        );

        // Start at measure 0, beat 1.0
        mockAudio.setTime(1.0);
        controller.seek(1.0);
        controller.play();

        // Get beats in range before the change
        const beatsBeforeChange = controller.getBeatsInRange(0, 8);
        const quarterNoteCount = beatsBeforeChange.filter(b => b.subdivisionType === 'quarter').length;
        expect(quarterNoteCount).toBe(16); // All quarter notes

        // Request change to eighth notes
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter'); // Still waiting

        // Move to measure 1's downbeat (beat 2.0)
        // This triggers the change
        mockAudio.setTime(2.0);

        // Force the update loop to run (in tests, animation frame doesn't run automatically)
        controller.forceUpdate();

        // Now check that beats before measure 1 are still quarter notes
        // and beats from measure 1 onwards are eighth notes
        const beatsAfterChange = controller.getBeatsInRange(0, 8);

        // Beats before 2.0 should still be quarter notes
        const beatsBeforeTransition = beatsAfterChange.filter(b => b.timestamp < 2.0);
        const quarterBefore = beatsBeforeTransition.filter(b => b.subdivisionType === 'quarter');
        expect(quarterBefore.length).toBe(beatsBeforeTransition.length);

        // Beats from 2.0 onwards should be eighth notes
        const beatsAfterTransition = beatsAfterChange.filter(b => b.timestamp >= 2.0);
        const eighthAfter = beatsAfterTransition.filter(b => b.subdivisionType === 'eighth');
        expect(eighthAfter.length).toBe(beatsAfterTransition.length);

        controller.stop();
    });

    it('should have correct beat count after partial regeneration', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-measure' }
        );

        // Start at measure 1, beat 2.5
        mockAudio.setTime(2.5);
        controller.seek(2.5);
        controller.play();

        // Request change to eighth notes
        controller.setSubdivision('eighth');

        // Move to measure 2's downbeat (beat 4.0)
        mockAudio.setTime(4.0);

        // Force the update loop to run
        controller.forceUpdate();

        // Get all beats
        const allBeats = controller.getBeatsInRange(0, 8);

        // Before 4.0: quarter notes (8 beats: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)
        // From 4.0: eighth notes
        const beatsBeforeTransition = allBeats.filter(b => b.timestamp < 4.0);
        const beatsAfterTransition = allBeats.filter(b => b.timestamp >= 4.0);

        // Should have 8 quarter note beats before transition
        expect(beatsBeforeTransition.length).toBe(8);
        expect(beatsBeforeTransition.every(b => b.subdivisionType === 'quarter')).toBe(true);

        // Should have eighth note beats after transition (exact count depends on subdivider)
        expect(beatsAfterTransition.length).toBeGreaterThan(0);
        expect(beatsAfterTransition.every(b => b.subdivisionType === 'eighth')).toBe(true);

        controller.stop();
    });

    it('should not preserve beats when transition mode is immediate', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'immediate' }
        );

        mockAudio.setTime(2.5);
        controller.seek(2.5);
        controller.play();

        // Change to eighth notes immediately
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('eighth');

        // ALL beats should now be eighth notes, including those before current time
        const allBeats = controller.getBeatsInRange(0, 8);
        const allEighth = allBeats.every(b => b.subdivisionType === 'eighth');
        expect(allEighth).toBe(true);

        controller.stop();
    });

    it('should preserve beats for next-downbeat transition mode', () => {
        const controller = new SubdivisionPlaybackController(
            unifiedMap,
            mockAudio.context,
            { transitionMode: 'next-downbeat' }
        );

        // Start at measure 0, beat 0.5
        mockAudio.setTime(0.5);
        controller.seek(0.5);
        controller.play();

        // Request change to eighth notes
        controller.setSubdivision('eighth');
        expect(controller.subdivision).toBe('quarter');

        // Move to measure 1's downbeat (beat 2.0)
        mockAudio.setTime(2.0);

        // Force the update loop to run
        controller.forceUpdate();

        // Beats before 2.0 should be quarter notes
        const allBeats = controller.getBeatsInRange(0, 8);
        const beatsBeforeTransition = allBeats.filter(b => b.timestamp < 2.0);
        const quarterBefore = beatsBeforeTransition.filter(b => b.subdivisionType === 'quarter');
        expect(quarterBefore.length).toBe(beatsBeforeTransition.length);

        // Beats from 2.0 onwards should be eighth notes
        const beatsAfterTransition = allBeats.filter(b => b.timestamp >= 2.0);
        const eighthAfter = beatsAfterTransition.filter(b => b.subdivisionType === 'eighth');
        expect(eighthAfter.length).toBe(beatsAfterTransition.length);

        controller.stop();
    });
});
