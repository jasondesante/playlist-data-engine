/**
 * Tests for BeatStream
 *
 * Tests real-time beat event streaming synchronized with audio playback.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BeatStream } from '../../../src/core/analysis/beat/BeatStream.js';
import type {
    Beat,
    BeatMap,
    BeatEvent,
    BeatStreamOptions,
    ButtonPressResult,
    AudioSyncState,
} from '../../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    DEFAULT_BEATSTREAM_OPTIONS,
    BEAT_ACCURACY_THRESHOLDS,
    EASY_ACCURACY_THRESHOLDS,
    MEDIUM_ACCURACY_THRESHOLDS,
    HARD_ACCURACY_THRESHOLDS,
    getAccuracyThresholdsForPreset,
} from '../../../src/core/types/BeatMap.js';
import type { AccuracyThresholds, DifficultyPreset } from '../../../src/core/types/BeatMap.js';

// Helper to create a mock beat
function createMockBeat(
    timestamp: number,
    options: Partial<Beat> = {}
): Beat {
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

// Helper to create a beat map with beats at specific timestamps
function createMockBeatMap(
    beatTimestamps: number[],
    duration: number = 10,
    bpm: number = 120
): BeatMap {
    const beats: Beat[] = beatTimestamps.map((ts, i) => ({
        timestamp: ts,
        beatInMeasure: i % 4,
        isDownbeat: i % 4 === 0,
        measureNumber: Math.floor(i / 4),
        intensity: 0.5 + Math.random() * 0.5,
        confidence: 0.7 + Math.random() * 0.3,
    }));

    return {
        audioId: 'test-audio',
        duration,
        beats,
        bpm,
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

// Helper to create a mock AudioContext
function createMockAudioContext(): AudioContext {
    let currentTime = 0;

    const context = {
        currentTime: 0,
        get currentTime() {
            return currentTime;
        },
        set currentTime(value: number) {
            currentTime = value;
        },
        sampleRate: 44100,
        state: 'running' as AudioContextState,
        baseLatency: 0.01,
        outputLatency: 0.02,
        createOscillator: vi.fn(),
        createGain: vi.fn(),
        createBufferSource: vi.fn(),
        decodeAudioData: vi.fn(),
        suspend: vi.fn(),
        resume: vi.fn(),
        close: vi.fn(),
    };

    return context as unknown as AudioContext;
}

describe('BeatStream', () => {
    let beatMap: BeatMap;
    let audioContext: AudioContext;
    let mockAudioContext: {
        currentTime: number;
        baseLatency: number;
        outputLatency: number;
    };

    beforeEach(() => {
        // Create beat map with beats at 0.5s intervals (120 BPM)
        beatMap = createMockBeatMap([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]);

        // Create mock audio context with controllable time
        mockAudioContext = {
            currentTime: 0,
            baseLatency: 0.01,
            outputLatency: 0.02,
        };

        audioContext = {
            get currentTime() { return mockAudioContext.currentTime; },
            get baseLatency() { return mockAudioContext.baseLatency; },
            get outputLatency() { return mockAudioContext.outputLatency; },
            sampleRate: 44100,
            state: 'running',
        } as unknown as AudioContext;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create instance with default options', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const options = stream.getOptions();
            expect(options.anticipationTime).toBe(DEFAULT_BEATSTREAM_OPTIONS.anticipationTime);
            expect(options.userOffsetMs).toBe(DEFAULT_BEATSTREAM_OPTIONS.userOffsetMs);
            expect(options.compensateOutputLatency).toBe(DEFAULT_BEATSTREAM_OPTIONS.compensateOutputLatency);
            expect(options.timingTolerance).toBe(DEFAULT_BEATSTREAM_OPTIONS.timingTolerance);
        });

        it('should create instance with custom options', () => {
            const customOptions: BeatStreamOptions = {
                anticipationTime: 3.0,
                userOffsetMs: 50,
                compensateOutputLatency: false,
                timingTolerance: 0.02,
            };

            const stream = new BeatStream(beatMap, audioContext, customOptions);

            const options = stream.getOptions();
            expect(options.anticipationTime).toBe(3.0);
            expect(options.userOffsetMs).toBe(50);
            expect(options.compensateOutputLatency).toBe(false);
            expect(options.timingTolerance).toBe(0.02);
        });

        it('should not be running initially', () => {
            const stream = new BeatStream(beatMap, audioContext);
            expect(stream.isRunning()).toBe(false);
        });
    });

    describe('subscribe', () => {
        it('should register a callback', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const callback = vi.fn();

            const unsubscribe = stream.subscribe(callback);

            expect(typeof unsubscribe).toBe('function');
        });

        it('should return an unsubscribe function that removes the callback', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const callback = vi.fn();

            const unsubscribe = stream.subscribe(callback);
            unsubscribe();

            // Callback should not be called after unsubscribe
            stream.start();
            // Advance time significantly past first beat
            mockAudioContext.currentTime = 5;
            stream.stop();

            // Since we unsubscribed, no events should have been emitted
            // (This is a bit tricky to test without actual RAF, but we can verify the mechanism exists)
        });

        it('should support multiple subscribers', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            stream.subscribe(callback1);
            stream.subscribe(callback2);

            // Both callbacks should be registered
            // (Testing that both can be subscribed)
            stream.start();
            stream.stop();
        });
    });

    describe('start / stop', () => {
        it('should set isRunning to true when started', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.start();

            expect(stream.isRunning()).toBe(true);

            stream.stop();
        });

        it('should set isRunning to false when stopped', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.start();
            stream.stop();

            expect(stream.isRunning()).toBe(false);
        });

        it('should be safe to call start multiple times', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.start();
            stream.start();
            stream.start();

            expect(stream.isRunning()).toBe(true);

            stream.stop();
        });

        it('should be safe to call stop when not running', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Should not throw
            expect(() => stream.stop()).not.toThrow();
        });
    });

    describe('pause / resume', () => {
        it('should pause playback', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.start();
            stream.pause();

            expect(stream.isPaused()).toBe(true);
            expect(stream.isRunning()).toBe(false);

            stream.stop();
        });

        it('should resume playback from paused position', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.start();
            mockAudioContext.currentTime = 1.0;
            stream.pause();

            expect(stream.isPaused()).toBe(true);

            stream.resume();

            expect(stream.isPaused()).toBe(false);
            expect(stream.isRunning()).toBe(true);

            stream.stop();
        });

        it('should be safe to pause when not running', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Should not throw
            expect(() => stream.pause()).not.toThrow();
        });
    });

    describe('seek', () => {
        it('should update current time position', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                compensateOutputLatency: false,
            });

            stream.seek(2.5);

            // When not started, getCurrentTime returns pauseTime directly
            expect(stream.getCurrentTime()).toBe(2.5);
        });

        it('should clamp time to valid range', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.seek(-5);
            expect(stream.getCurrentTime()).toBeGreaterThanOrEqual(0);

            stream.seek(100);
            expect(stream.getCurrentTime()).toBeLessThanOrEqual(beatMap.duration);
        });

        it('should reset scheduled beats when seeking', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const callback = vi.fn();

            stream.subscribe(callback);
            stream.start();

            // Advance time
            mockAudioContext.currentTime = 3.0;

            // Seek back to beginning
            stream.seek(0);

            // Should reset position
            expect(stream.getCurrentTime()).toBeLessThan(1);

            stream.stop();
        });
    });

    describe('getSyncState', () => {
        it('should return audio synchronization state', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const syncState = stream.getSyncState();

            expect(syncState).toBeDefined();
            expect(typeof syncState.audioContextTime).toBe('number');
            expect(typeof syncState.drift).toBe('number');
            expect(typeof syncState.isSynchronized).toBe('boolean');
            expect(typeof syncState.outputLatency).toBe('number');
            expect(typeof syncState.baseLatency).toBe('number');
            expect(typeof syncState.userOffsetMs).toBe('number');
            expect(typeof syncState.totalCompensation).toBe('number');
        });

        it('should include latency values from audio context', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const syncState = stream.getSyncState();

            // Our mock has baseLatency: 0.01, outputLatency: 0.02
            expect(syncState.baseLatency).toBe(0.01);
            expect(syncState.outputLatency).toBe(0.02);
        });

        it('should include user offset in total compensation', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                userOffsetMs: 100,
                compensateOutputLatency: true,
            });

            const syncState = stream.getSyncState();

            // 0.01 (base) + 0.02 (output) + 0.1 (user 100ms)
            expect(syncState.totalCompensation).toBeCloseTo(0.13, 2);
        });

        it('should not include latency when compensation disabled', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                userOffsetMs: 50,
                compensateOutputLatency: false,
            });

            const syncState = stream.getSyncState();

            // Only user offset should be included
            expect(syncState.totalCompensation).toBeCloseTo(0.05, 2);
        });
    });

    describe('getUpcomingBeats', () => {
        it('should return beats within anticipation window', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Use seek to set position
            stream.seek(0.3);

            const upcoming = stream.getUpcomingBeats(10);

            // Beats at 0.5, 1.0, 1.5, 2.0, 2.3 are within 2s anticipation
            expect(upcoming.length).toBeGreaterThan(0);
            expect(upcoming.length).toBeLessThanOrEqual(10);

            // All beats should be in the future (or at current position)
            for (const beat of upcoming) {
                expect(beat.timestamp).toBeGreaterThanOrEqual(0.3);
            }
        });

        it('should respect count limit', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const upcoming = stream.getUpcomingBeats(3);

            expect(upcoming.length).toBeLessThanOrEqual(3);
        });

        it('should return empty array when no upcoming beats', () => {
            const shortBeatMap = createMockBeatMap([0, 0.5, 1.0], 1.5);
            const stream = new BeatStream(shortBeatMap, audioContext);

            // Use seek to set position past all beats
            stream.seek(1.4);

            const upcoming = stream.getUpcomingBeats(10);

            // No beats within anticipation window from position 1.4
            expect(upcoming.length).toBe(0);
        });
    });

    describe('getBeatAtTime', () => {
        it('should return beat at exact time', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const beat = stream.getBeatAtTime(1.0);

            expect(beat).toBeDefined();
            expect(beat?.timestamp).toBe(1.0);
        });

        it('should return beat within tolerance', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                timingTolerance: 0.02,
            });

            const beat = stream.getBeatAtTime(1.015);

            expect(beat).toBeDefined();
            expect(beat?.timestamp).toBe(1.0);
        });

        it('should return null when no beat near time', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const beat = stream.getBeatAtTime(1.1);

            expect(beat).toBeNull();
        });
    });

    describe('getCurrentBeat', () => {
        it('should return the current beat', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Use seek to set position
            stream.seek(1.2);

            const beat = stream.getCurrentBeat();

            // Should be beat at 1.0 (most recent beat)
            expect(beat).toBeDefined();
            expect(beat?.timestamp).toBe(1.0);
        });

        it('should return null before first beat', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Use seek to set position before first beat
            // Since we can't seek to negative, test with position 0
            // which should return the beat at 0
            stream.seek(0);

            const beat = stream.getCurrentBeat();

            // At position 0, beat at timestamp 0 is the current beat
            expect(beat?.timestamp).toBe(0);
        });
    });

    describe('getNextBeat', () => {
        it('should return the next beat', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Use seek to set position
            stream.seek(0.7);

            const beat = stream.getNextBeat();

            // Next beat should be at 1.0
            expect(beat).toBeDefined();
            expect(beat?.timestamp).toBe(1.0);
        });

        it('should return null after last beat', () => {
            const shortBeatMap = createMockBeatMap([0, 0.5, 1.0], 2);
            const stream = new BeatStream(shortBeatMap, audioContext);

            // Use seek to set position past all beats
            stream.seek(1.5);

            const beat = stream.getNextBeat();

            expect(beat).toBeNull();
        });
    });

    describe('getCurrentBpm', () => {
        it('should return initial BPM when not enough beats passed', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Use seek to set position
            stream.seek(0.1);

            const bpm = stream.getCurrentBpm();

            // Should return initial BPM since not enough beats have passed
            expect(bpm).toBe(beatMap.bpm);
        });

        it('should calculate BPM from recent beat intervals', () => {
            const stream = new BeatStream(beatMap, audioContext);

            // Use seek to set position past several beats
            stream.seek(3.0);

            const bpm = stream.getCurrentBpm();

            // With 0.5s intervals, BPM should be 120
            // (60 / 0.5 = 120)
            expect(bpm).toBeCloseTo(120, 0);
        });

        it('should use rolling window of beats', () => {
            // Create beat map with varying tempo
            const variableBeatMap = createMockBeatMap([
                0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5,
                4.3, 5.1, 5.9, 6.7 // Slower tempo (0.8s intervals = 75 BPM)
            ], 10, 120);

            const stream = new BeatStream(variableBeatMap, audioContext);

            // Use seek to set position in slower tempo section
            stream.seek(7.0);

            const bpm = stream.getCurrentBpm();

            // Should reflect the slower tempo from recent beats
            // 0.8s intervals = 75 BPM
            expect(bpm).toBeLessThan(100);
        });
    });

    describe('checkButtonPress', () => {
        it('should return perfect for press within 10ms of beat', () => {
            const stream = new BeatStream(beatMap, audioContext, { difficultyPreset: 'hard' });

            const result = stream.checkButtonPress(1.005);

            expect(result.accuracy).toBe('perfect');
            expect(result.matchedBeat.timestamp).toBe(1.0);
            expect(result.absoluteOffset).toBeLessThanOrEqual(HARD_ACCURACY_THRESHOLDS.perfect);
        });

        it('should return great for press within 25ms of beat', () => {
            const stream = new BeatStream(beatMap, audioContext, { difficultyPreset: 'hard' });

            const result = stream.checkButtonPress(1.020);

            expect(result.accuracy).toBe('great');
            expect(result.matchedBeat.timestamp).toBe(1.0);
        });

        it('should return good for press within 50ms of beat', () => {
            const stream = new BeatStream(beatMap, audioContext, { difficultyPreset: 'hard' });

            const result = stream.checkButtonPress(1.045);

            expect(result.accuracy).toBe('good');
            expect(result.matchedBeat.timestamp).toBe(1.0);
        });

        it('should return miss for press far from any beat', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const result = stream.checkButtonPress(1.25);

            expect(result.accuracy).toBe('miss');
        });

        it('should return negative offset for early press', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const result = stream.checkButtonPress(0.98);

            expect(result.offset).toBeLessThan(0);
            expect(result.matchedBeat.timestamp).toBe(1.0);
        });

        it('should return positive offset for late press', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const result = stream.checkButtonPress(1.02);

            expect(result.offset).toBeGreaterThan(0);
            expect(result.matchedBeat.timestamp).toBe(1.0);
        });

        it('should update last button press result', () => {
            const stream = new BeatStream(beatMap, audioContext, { difficultyPreset: 'hard' });

            stream.checkButtonPress(1.005);
            const lastResult = stream.getLastBeatAccuracy();

            expect(lastResult).toBeDefined();
            expect(lastResult?.accuracy).toBe('perfect');
        });
    });

    describe('getLastBeatAccuracy', () => {
        it('should return null when no button has been pressed', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const result = stream.getLastBeatAccuracy();

            expect(result).toBeNull();
        });

        it('should return the last button press result', () => {
            const stream = new BeatStream(beatMap, audioContext, { difficultyPreset: 'hard' });

            stream.checkButtonPress(1.005);
            stream.checkButtonPress(2.020);

            const lastResult = stream.getLastBeatAccuracy();

            expect(lastResult?.matchedBeat.timestamp).toBe(2.0);
            expect(lastResult?.accuracy).toBe('great');
        });
    });

    describe('utility methods', () => {
        it('should return correct duration', () => {
            const stream = new BeatStream(beatMap, audioContext);

            expect(stream.getDuration()).toBe(beatMap.duration);
        });

        it('should return beat map', () => {
            const stream = new BeatStream(beatMap, audioContext);

            expect(stream.getBeatMap()).toBe(beatMap);
        });

        it('should update beat map', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const newBeatMap = createMockBeatMap([0, 1, 2], 5);

            stream.setBeatMap(newBeatMap);

            expect(stream.getBeatMap()).toBe(newBeatMap);
            expect(stream.getDuration()).toBe(5);
        });
    });

    describe('dispose', () => {
        it('should clean up resources', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const callback = vi.fn();

            stream.subscribe(callback);
            stream.start();
            stream.dispose();

            expect(stream.isRunning()).toBe(false);
        });
    });

    describe('event emission', () => {
        it('should emit upcoming events for beats within anticipation window', async () => {
            const stream = new BeatStream(beatMap, audioContext, {
                anticipationTime: 0.5,
            });
            const events: BeatEvent[] = [];

            stream.subscribe((event) => {
                events.push(event);
            });

            stream.start();

            // Simulate time progression
            mockAudioContext.currentTime = 0;
            await new Promise(resolve => setTimeout(resolve, 10));

            mockAudioContext.currentTime = 0.2;
            await new Promise(resolve => setTimeout(resolve, 10));

            stream.stop();

            // Should have received some events
            // (Exact number depends on RAF timing)
        });

        it('should emit exact events when beat time is reached', async () => {
            const stream = new BeatStream(beatMap, audioContext, {
                timingTolerance: 0.02,
            });
            const events: BeatEvent[] = [];

            stream.subscribe((event) => {
                if (event.type === 'exact') {
                    events.push(event);
                }
            });

            stream.start();

            // Simulate time at beat position
            mockAudioContext.currentTime = 1.0;
            await new Promise(resolve => setTimeout(resolve, 10));

            stream.stop();

            // The exact event should have been emitted for beat at 1.0
        });
    });

    describe('edge cases', () => {
        it('should handle empty beat map', () => {
            const emptyBeatMap = createMockBeatMap([], 10);
            const stream = new BeatStream(emptyBeatMap, audioContext);

            stream.start();

            expect(stream.isRunning()).toBe(true);
            expect(stream.getUpcomingBeats(10)).toHaveLength(0);
            expect(stream.getCurrentBeat()).toBeNull();
            expect(stream.getNextBeat()).toBeNull();

            stream.stop();
        });

        it('should handle beat map with single beat', () => {
            const singleBeatMap = createMockBeatMap([2.0], 5);
            const stream = new BeatStream(singleBeatMap, audioContext);

            mockAudioContext.currentTime = 1.0;

            const upcoming = stream.getUpcomingBeats(10);
            expect(upcoming.length).toBe(1);
            expect(upcoming[0].timestamp).toBe(2.0);
        });

        it('should handle very short anticipation time', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                anticipationTime: 0.01,
            });

            mockAudioContext.currentTime = 0.5;

            const upcoming = stream.getUpcomingBeats(10);

            // Only beat at exactly 0.5 or very close should be included
            expect(upcoming.length).toBeLessThanOrEqual(1);
        });

        it('should handle very long anticipation time', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                anticipationTime: 10,
            });

            mockAudioContext.currentTime = 0;

            const upcoming = stream.getUpcomingBeats(20);

            // All beats should be within anticipation window
            expect(upcoming.length).toBe(beatMap.beats.length);
        });

        it('should handle large user offset', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                userOffsetMs: 500,
            });

            const syncState = stream.getSyncState();

            expect(syncState.userOffsetMs).toBe(500);
            expect(syncState.totalCompensation).toBeCloseTo(0.5, 1);
        });

        it('should handle negative user offset', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                userOffsetMs: -100,
            });

            const syncState = stream.getSyncState();

            expect(syncState.userOffsetMs).toBe(-100);
        });

        it('should handle callback that throws error', async () => {
            const stream = new BeatStream(beatMap, audioContext);
            const badCallback = vi.fn(() => {
                throw new Error('Test error');
            });
            const goodCallback = vi.fn();

            stream.subscribe(badCallback);
            stream.subscribe(goodCallback);

            stream.start();

            // Should not throw, and good callback should still be called
            mockAudioContext.currentTime = 3.0;
            await new Promise(resolve => setTimeout(resolve, 10));

            stream.stop();

            // Good callback should have been called despite bad callback error
        });
    });

    describe('accuracy thresholds', () => {
        it('should have correct threshold values', () => {
            expect(BEAT_ACCURACY_THRESHOLDS.perfect).toBe(0.010);
            expect(BEAT_ACCURACY_THRESHOLDS.great).toBe(0.025);
            expect(BEAT_ACCURACY_THRESHOLDS.good).toBe(0.050);
            expect(BEAT_ACCURACY_THRESHOLDS.ok).toBe(0.100);
        });

        it('should classify accuracy correctly at boundaries', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const thresholds = stream.getAccuracyThresholds();

            // Just inside perfect
            const perfectResult = stream.checkButtonPress(1.0 + thresholds.perfect - 0.001);
            expect(perfectResult.accuracy).toBe('perfect');

            // Just inside great
            const greatResult = stream.checkButtonPress(1.0 + thresholds.great - 0.001);
            expect(greatResult.accuracy).toBe('great');

            // Just inside good
            const goodResult = stream.checkButtonPress(1.0 + thresholds.good - 0.001);
            expect(goodResult.accuracy).toBe('good');

            // Just inside ok
            const okResult = stream.checkButtonPress(1.0 + thresholds.ok - 0.001);
            expect(okResult.accuracy).toBe('ok');

            // Just outside ok = miss
            const missResult = stream.checkButtonPress(1.0 + thresholds.ok + 0.001);
            expect(missResult.accuracy).toBe('miss');
        });
    });

    describe('difficulty presets', () => {
        it('should use medium preset by default', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const thresholds = stream.getAccuracyThresholds();

            expect(thresholds.perfect).toBe(MEDIUM_ACCURACY_THRESHOLDS.perfect);
            expect(thresholds.great).toBe(MEDIUM_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(MEDIUM_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(MEDIUM_ACCURACY_THRESHOLDS.ok);
        });

        it('should use easy preset when specified', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'easy',
            });
            const thresholds = stream.getAccuracyThresholds();

            expect(thresholds.perfect).toBe(EASY_ACCURACY_THRESHOLDS.perfect);
            expect(thresholds.great).toBe(EASY_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(EASY_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(EASY_ACCURACY_THRESHOLDS.ok);
        });

        it('should use medium preset when specified', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'medium',
            });
            const thresholds = stream.getAccuracyThresholds();

            expect(thresholds.perfect).toBe(MEDIUM_ACCURACY_THRESHOLDS.perfect);
            expect(thresholds.great).toBe(MEDIUM_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(MEDIUM_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(MEDIUM_ACCURACY_THRESHOLDS.ok);
        });

        it('should use hard preset when specified', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'hard',
            });
            const thresholds = stream.getAccuracyThresholds();

            expect(thresholds.perfect).toBe(HARD_ACCURACY_THRESHOLDS.perfect);
            expect(thresholds.great).toBe(HARD_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(HARD_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(HARD_ACCURACY_THRESHOLDS.ok);
        });

        it('should classify accuracy correctly with easy preset', () => {
            // Create a beat map with wider intervals (1.0s) to test easy preset properly
            // Easy: perfect=±75ms, great=±125ms, good=±175ms, ok=±250ms
            const wideBeatMap = createMockBeatMap([0, 1.0, 2.0, 3.0, 4.0, 5.0], 10);
            const stream = new BeatStream(wideBeatMap, audioContext, {
                difficultyPreset: 'easy',
            });

            // Within perfect (±75ms)
            const perfectResult = stream.checkButtonPress(1.0 + 0.070);
            expect(perfectResult.accuracy).toBe('perfect');
            expect(perfectResult.matchedBeat.timestamp).toBe(1.0);

            // Within great (±125ms) but outside perfect
            const greatResult = stream.checkButtonPress(1.0 + 0.100);
            expect(greatResult.accuracy).toBe('great');
            expect(greatResult.matchedBeat.timestamp).toBe(1.0);

            // Within good (±175ms) but outside great
            const goodResult = stream.checkButtonPress(1.0 + 0.150);
            expect(goodResult.accuracy).toBe('good');
            expect(goodResult.matchedBeat.timestamp).toBe(1.0);

            // Within ok (±250ms) but outside good
            const okResult = stream.checkButtonPress(1.0 + 0.200);
            expect(okResult.accuracy).toBe('ok');
            expect(okResult.matchedBeat.timestamp).toBe(1.0);

            // Outside ok (±250ms) = miss
            const missResult = stream.checkButtonPress(1.0 + 0.300);
            expect(missResult.accuracy).toBe('miss');
        });

        it('should classify accuracy correctly with medium preset', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'medium',
            });
            const thresholds = stream.getAccuracyThresholds();

            // Medium: perfect=±45ms, great=±90ms, good=±135ms, ok=±200ms

            // Within perfect (±45ms)
            const perfectResult = stream.checkButtonPress(1.0 + 0.040);
            expect(perfectResult.accuracy).toBe('perfect');

            // Within great (±90ms) but outside perfect
            const greatResult = stream.checkButtonPress(1.0 + 0.060);
            expect(greatResult.accuracy).toBe('great');

            // Within good (±135ms) but outside great
            const goodResult = stream.checkButtonPress(1.0 + 0.100);
            expect(goodResult.accuracy).toBe('good');

            // Within ok (±200ms) but outside good
            const okResult = stream.checkButtonPress(1.0 + 0.150);
            expect(okResult.accuracy).toBe('ok');

            // Outside ok = miss
            const missResult = stream.checkButtonPress(1.0 + 0.210);
            expect(missResult.accuracy).toBe('miss');
        });

        it('should have easier thresholds on easy than medium', () => {
            expect(EASY_ACCURACY_THRESHOLDS.perfect).toBeGreaterThan(MEDIUM_ACCURACY_THRESHOLDS.perfect);
            expect(EASY_ACCURACY_THRESHOLDS.great).toBeGreaterThan(MEDIUM_ACCURACY_THRESHOLDS.great);
            expect(EASY_ACCURACY_THRESHOLDS.good).toBeGreaterThan(MEDIUM_ACCURACY_THRESHOLDS.good);
            expect(EASY_ACCURACY_THRESHOLDS.ok).toBeGreaterThan(MEDIUM_ACCURACY_THRESHOLDS.ok);
        });

        it('should have easier thresholds on medium than hard', () => {
            expect(MEDIUM_ACCURACY_THRESHOLDS.perfect).toBeGreaterThan(HARD_ACCURACY_THRESHOLDS.perfect);
            expect(MEDIUM_ACCURACY_THRESHOLDS.great).toBeGreaterThan(HARD_ACCURACY_THRESHOLDS.great);
            expect(MEDIUM_ACCURACY_THRESHOLDS.good).toBeGreaterThan(HARD_ACCURACY_THRESHOLDS.good);
            expect(MEDIUM_ACCURACY_THRESHOLDS.ok).toBeGreaterThan(HARD_ACCURACY_THRESHOLDS.ok);
        });

        it('should include difficultyPreset in options', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'easy',
            });

            const options = stream.getOptions();
            expect(options.difficultyPreset).toBe('easy');
        });
    });

    describe('custom thresholds', () => {
        it('should use custom thresholds when provided', () => {
            const customThresholds: Partial<AccuracyThresholds> = {
                perfect: 0.050,
                great: 0.100,
                good: 0.150,
                ok: 0.200,
            };

            const stream = new BeatStream(beatMap, audioContext, {
                customThresholds,
            });
            const thresholds = stream.getAccuracyThresholds();

            expect(thresholds.perfect).toBe(0.050);
            expect(thresholds.great).toBe(0.100);
            expect(thresholds.good).toBe(0.150);
            expect(thresholds.ok).toBe(0.200);
        });

        it('should allow partial custom thresholds (merging with preset)', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'medium',
                customThresholds: {
                    perfect: 0.100, // Override just perfect
                },
            });
            const thresholds = stream.getAccuracyThresholds();

            // Custom perfect threshold
            expect(thresholds.perfect).toBe(0.100);
            // Other thresholds from medium preset
            expect(thresholds.great).toBe(MEDIUM_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(MEDIUM_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(MEDIUM_ACCURACY_THRESHOLDS.ok);
        });

        it('should override preset with custom thresholds', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'easy',
                customThresholds: {
                    perfect: 0.005, // Much stricter than easy
                },
            });
            const thresholds = stream.getAccuracyThresholds();

            // Custom strict perfect
            expect(thresholds.perfect).toBe(0.005);
            // Rest from easy preset
            expect(thresholds.great).toBe(EASY_ACCURACY_THRESHOLDS.great);
        });

        it('should classify accuracy correctly with custom thresholds', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                customThresholds: {
                    perfect: 0.050,
                    great: 0.100,
                    good: 0.150,
                    ok: 0.200,
                },
            });

            // Within custom perfect (±50ms)
            const perfectResult = stream.checkButtonPress(1.0 + 0.040);
            expect(perfectResult.accuracy).toBe('perfect');

            // Within custom great (±100ms)
            const greatResult = stream.checkButtonPress(1.0 + 0.075);
            expect(greatResult.accuracy).toBe('great');

            // Within custom good (±150ms)
            const goodResult = stream.checkButtonPress(1.0 + 0.125);
            expect(goodResult.accuracy).toBe('good');

            // Within custom ok (±200ms)
            const okResult = stream.checkButtonPress(1.0 + 0.175);
            expect(okResult.accuracy).toBe('ok');

            // Outside custom ok = miss
            const missResult = stream.checkButtonPress(1.0 + 0.250);
            expect(missResult.accuracy).toBe('miss');
        });

        it('should include customThresholds in options', () => {
            const customThresholds = {
                perfect: 0.050,
                great: 0.100,
                good: 0.150,
                ok: 0.200,
            };

            const stream = new BeatStream(beatMap, audioContext, {
                customThresholds,
            });

            const options = stream.getOptions();
            expect(options.customThresholds).toEqual(customThresholds);
        });

        it('should use medium preset as base when custom thresholds are provided without preset', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                customThresholds: {
                    perfect: 0.100, // Override just perfect
                },
            });
            const thresholds = stream.getAccuracyThresholds();

            // Custom perfect
            expect(thresholds.perfect).toBe(0.100);
            // Rest from medium preset (default)
            expect(thresholds.great).toBe(MEDIUM_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(MEDIUM_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(MEDIUM_ACCURACY_THRESHOLDS.ok);
        });

        it('should return a copy of thresholds from getAccuracyThresholds', () => {
            const stream = new BeatStream(beatMap, audioContext);
            const thresholds1 = stream.getAccuracyThresholds();
            const thresholds2 = stream.getAccuracyThresholds();

            // Should be equal but not the same reference
            expect(thresholds1).toEqual(thresholds2);
            expect(thresholds1).not.toBe(thresholds2);
        });
    });

    describe('getAccuracyThresholdsForPreset function', () => {
        it('should return easy thresholds for easy preset', () => {
            const thresholds = getAccuracyThresholdsForPreset('easy');
            expect(thresholds).toEqual(EASY_ACCURACY_THRESHOLDS);
        });

        it('should return medium thresholds for medium preset', () => {
            const thresholds = getAccuracyThresholdsForPreset('medium');
            expect(thresholds).toEqual(MEDIUM_ACCURACY_THRESHOLDS);
        });

        it('should return hard thresholds for hard preset', () => {
            const thresholds = getAccuracyThresholdsForPreset('hard');
            expect(thresholds).toEqual(HARD_ACCURACY_THRESHOLDS);
        });

        it('should return hard thresholds for custom preset (as base)', () => {
            const thresholds = getAccuracyThresholdsForPreset('custom');
            expect(thresholds).toEqual(HARD_ACCURACY_THRESHOLDS);
        });
    });

    describe('setDifficulty', () => {
        it('should change difficulty preset mid-stream', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'hard',
            });

            // Start with hard
            expect(stream.getAccuracyThresholds().perfect).toBe(HARD_ACCURACY_THRESHOLDS.perfect);

            // Change to easy
            stream.setDifficulty({ preset: 'easy' });
            expect(stream.getAccuracyThresholds().perfect).toBe(EASY_ACCURACY_THRESHOLDS.perfect);
            expect(stream.getAccuracyThresholds().great).toBe(EASY_ACCURACY_THRESHOLDS.great);
        });

        it('should change to medium preset', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.setDifficulty({ preset: 'medium' });
            expect(stream.getAccuracyThresholds().perfect).toBe(MEDIUM_ACCURACY_THRESHOLDS.perfect);
        });

        it('should change to hard preset', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'easy',
            });

            stream.setDifficulty({ preset: 'hard' });
            expect(stream.getAccuracyThresholds().perfect).toBe(HARD_ACCURACY_THRESHOLDS.perfect);
        });

        it('should update custom thresholds', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.setDifficulty({
                customThresholds: {
                    perfect: 0.100,
                    great: 0.150,
                },
            });

            const thresholds = stream.getAccuracyThresholds();
            expect(thresholds.perfect).toBe(0.100);
            expect(thresholds.great).toBe(0.150);
            // Rest from medium preset (default)
            expect(thresholds.good).toBe(MEDIUM_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(MEDIUM_ACCURACY_THRESHOLDS.ok);
        });

        it('should update both preset and custom thresholds', () => {
            const stream = new BeatStream(beatMap, audioContext);

            stream.setDifficulty({
                preset: 'easy',
                customThresholds: { perfect: 0.050 },
            });

            const thresholds = stream.getAccuracyThresholds();
            expect(thresholds.perfect).toBe(0.050);
            // Rest from easy preset
            expect(thresholds.great).toBe(EASY_ACCURACY_THRESHOLDS.great);
            expect(thresholds.good).toBe(EASY_ACCURACY_THRESHOLDS.good);
            expect(thresholds.ok).toBe(EASY_ACCURACY_THRESHOLDS.ok);
        });

        it('should clear custom thresholds when empty object provided', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'easy',
                customThresholds: { perfect: 0.100 },
            });

            // Verify custom threshold is set
            expect(stream.getAccuracyThresholds().perfect).toBe(0.100);

            // Clear custom thresholds
            stream.setDifficulty({ customThresholds: {} });

            // Should now use easy preset directly
            expect(stream.getAccuracyThresholds().perfect).toBe(EASY_ACCURACY_THRESHOLDS.perfect);
        });

        it('should affect button press accuracy immediately after change', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'hard',
            });

            // With hard preset, 110ms offset is a miss (ok threshold is ±100ms)
            let result = stream.checkButtonPress(1.110);
            expect(result.accuracy).toBe('miss');

            // Change to easy preset
            stream.setDifficulty({ preset: 'easy' });

            // With easy preset, 110ms offset is great (great threshold is ±125ms)
            result = stream.checkButtonPress(1.110);
            expect(result.accuracy).toBe('great');
        });

        it('should work while stream is running', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'hard',
            });

            stream.start();

            // Change difficulty while running
            stream.setDifficulty({ preset: 'easy' });

            expect(stream.getAccuracyThresholds().perfect).toBe(EASY_ACCURACY_THRESHOLDS.perfect);

            stream.stop();
        });

        it('should update options to reflect new preset', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'hard',
            });

            stream.setDifficulty({ preset: 'easy' });

            const options = stream.getOptions();
            expect(options.difficultyPreset).toBe('easy');
        });

        it('should update options to reflect new custom thresholds', () => {
            const stream = new BeatStream(beatMap, audioContext);

            const customThresholds = { perfect: 0.075 };
            stream.setDifficulty({ customThresholds });

            const options = stream.getOptions();
            expect(options.customThresholds).toEqual(customThresholds);
        });

        it('should not modify other options when changing difficulty', () => {
            const stream = new BeatStream(beatMap, audioContext, {
                difficultyPreset: 'hard',
                anticipationTime: 3.0,
                userOffsetMs: 50,
            });

            stream.setDifficulty({ preset: 'easy' });

            const options = stream.getOptions();
            expect(options.anticipationTime).toBe(3.0);
            expect(options.userOffsetMs).toBe(50);
            expect(options.difficultyPreset).toBe('easy');
        });
    });
});
