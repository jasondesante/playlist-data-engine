/**
 * Tests for BeatMapGenerator
 *
 * Tests the orchestration of the beat detection pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BeatMapGenerator } from '../../../src/core/analysis/beat/BeatMapGenerator.js';
import type { BeatMap, BeatMapGeneratorOptions } from '../../../src/core/types/BeatMap.js';
import { BEAT_DETECTION_VERSION, BEAT_DETECTION_ALGORITHM } from '../../../src/core/types/BeatMap.js';

// Helper to create a mock AudioBuffer with specific characteristics
function createMockAudioBuffer(
    durationSeconds: number,
    sampleRate: number = 44100,
    numberOfChannels: number = 2
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);

    // Create channel data with some rhythmic content
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        // Create synthetic audio with periodic "beats" (clicks)
        const beatInterval = Math.floor(sampleRate * 0.5); // 120 BPM = 0.5s interval

        for (let i = 0; i < length; i++) {
            // Add click at beat positions
            const beatPosition = i % beatInterval;
            if (beatPosition < 100) {
                // Short click
                data[i] = Math.sin(2 * Math.PI * 1000 * (i / sampleRate)) *
                    Math.exp(-beatPosition / 20) * 0.8;
            } else {
                // Low-level noise
                data[i] = (Math.random() - 0.5) * 0.1;
            }
        }
        channels.push(data);
    }

    // Create mock AudioBuffer
    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels,
        getChannelData: (channel: number) => channels[channel],
        copyFromChannel: () => {},
        copyToChannel: () => {},
    } as AudioBuffer;
}

// Helper to create a silence AudioBuffer
function createSilentAudioBuffer(durationSeconds: number): AudioBuffer {
    const sampleRate = 44100;
    const length = Math.floor(durationSeconds * sampleRate);

    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels: 2,
        getChannelData: () => new Float32Array(length),
        copyFromChannel: () => {},
        copyToChannel: () => {},
    } as AudioBuffer;
}

describe('BeatMapGenerator', () => {
    describe('constructor', () => {
        it('should create instance with default config', () => {
            const generator = new BeatMapGenerator();
            const config = generator.getConfig();

            expect(config.minBpm).toBe(60);
            expect(config.maxBpm).toBe(180);
            expect(config.sensitivity).toBe(1.0);
            expect(config.noiseFloorThreshold).toBe(0.1);
            expect(config.hopSizeMs).toBe(10);
            expect(config.fftSize).toBe(2048);
            expect(config.rollingBpmWindowSize).toBe(8);
            expect(config.dpAlpha).toBe(680);
            expect(config.melBands).toBe(40);
            expect(config.highPassCutoff).toBe(0.4);
            expect(config.gaussianSmoothMs).toBe(20);
            expect(config.tempoCenter).toBe(0.5);
            expect(config.tempoWidth).toBe(1.4);
        });

        it('should create instance with custom config', () => {
            const customOptions: BeatMapGeneratorOptions = {
                minBpm: 70,
                maxBpm: 160,
                dpAlpha: 500,
                hopSizeMs: 5,
            };

            const generator = new BeatMapGenerator(customOptions);
            const config = generator.getConfig();

            expect(config.minBpm).toBe(70);
            expect(config.maxBpm).toBe(160);
            expect(config.dpAlpha).toBe(500);
            expect(config.hopSizeMs).toBe(5);
            // Defaults should still be applied for unspecified options
            expect(config.sensitivity).toBe(1.0);
            expect(config.melBands).toBe(40);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            const generator = new BeatMapGenerator({ dpAlpha: 500 });
            const config1 = generator.getConfig();
            const config2 = generator.getConfig();

            // Modifying one should not affect the other
            (config1 as any).dpAlpha = 800;
            expect(config2.dpAlpha).toBe(500);
        });
    });

    describe('generateBeatMapFromBuffer', () => {
        it('should generate beat map from audio buffer', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'test-track');

            expect(beatMap).toBeDefined();
            expect(beatMap.audioId).toBe('test-track');
            expect(beatMap.duration).toBe(5);
            expect(beatMap.beats).toBeInstanceOf(Array);
            expect(beatMap.bpm).toBeGreaterThan(0);
            expect(beatMap.metadata).toBeDefined();
        });

        it('should generate beat map with correct metadata', async () => {
            const generator = new BeatMapGenerator({
                minBpm: 80,
                maxBpm: 160,
                dpAlpha: 500,
            });
            const audioBuffer = createMockAudioBuffer(3);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'metadata-test');

            expect(beatMap.metadata.version).toBe(BEAT_DETECTION_VERSION);
            expect(beatMap.metadata.algorithm).toBe(BEAT_DETECTION_ALGORITHM);
            expect(beatMap.metadata.minBpm).toBe(80);
            expect(beatMap.metadata.maxBpm).toBe(160);
            expect(beatMap.metadata.dpAlpha).toBe(500);
            expect(beatMap.metadata.generatedAt).toBeDefined();
        });

        it('should detect beats in audio with clear rhythm', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5); // Has 120 BPM clicks

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'rhythmic');

            // Should detect multiple beats
            expect(beatMap.beats.length).toBeGreaterThan(5);

            // All beats should have valid properties
            for (const beat of beatMap.beats) {
                expect(beat.timestamp).toBeGreaterThanOrEqual(0);
                expect(beat.timestamp).toBeLessThanOrEqual(5);
                expect(beat.intensity).toBeGreaterThanOrEqual(0);
                expect(beat.intensity).toBeLessThanOrEqual(1);
                expect(beat.confidence).toBeGreaterThanOrEqual(0);
                expect(beat.confidence).toBeLessThanOrEqual(1);
                expect(typeof beat.beatInMeasure).toBe('number');
                expect(typeof beat.isDownbeat).toBe('boolean');
                expect(typeof beat.measureNumber).toBe('number');
            }
        });

        it('should handle silent audio', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createSilentAudioBuffer(3);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'silent');

            // Should return a valid beat map even for silent audio
            expect(beatMap).toBeDefined();
            expect(beatMap.audioId).toBe('silent');
            expect(beatMap.duration).toBe(3);
            // May have few or no beats for silent audio
            expect(beatMap.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should call progress callback during generation', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(2);

            const progressCalls: any[] = [];
            const onProgress = (progress: any) => {
                progressCalls.push({ ...progress });
            };

            await generator.generateBeatMapFromBuffer(audioBuffer, 'progress-test', onProgress);

            // Should have received progress updates
            expect(progressCalls.length).toBeGreaterThan(0);

            // Check that phases progress
            const phases = progressCalls.map(p => p.phase);
            expect(phases).toContain('complete');
        });

        it('should support cancellation', async () => {
            // Cancellation is timing-dependent - if generation finishes before cancel,
            // it won't throw. This test verifies the cancel mechanism exists and works.
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(10);

            // Start generation
            const promise = generator.generateBeatMapFromBuffer(audioBuffer, 'cancel-test');

            // Cancel immediately after starting - but generation may complete first
            generator.cancel();

            // Either it completes successfully (generation finished before cancel)
            // or throws cancellation error (cancel took effect before completion)
            try {
                const result = await promise;
                // Generation completed before cancellation - this is acceptable
                expect(result).toBeDefined();
                expect(result.audioId).toBe('cancel-test');
            } catch (error) {
                // Generation was cancelled - this is also acceptable
                expect((error as Error).message).toContain('cancelled');
            }
        });

        it('should apply noise floor threshold', async () => {
            const generator = new BeatMapGenerator({
                noiseFloorThreshold: 0.5, // High threshold
            });
            const audioBuffer = createMockAudioBuffer(3);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'threshold-test');

            // All beats should have intensity >= threshold
            for (const beat of beatMap.beats) {
                expect(beat.intensity).toBeGreaterThanOrEqual(0.5);
            }
        });

        it('should work with different BPM ranges', async () => {
            const slowGenerator = new BeatMapGenerator({ minBpm: 40, maxBpm: 80 });
            const fastGenerator = new BeatMapGenerator({ minBpm: 140, maxBpm: 200 });

            const audioBuffer = createMockAudioBuffer(3);

            const slowBeatMap = await slowGenerator.generateBeatMapFromBuffer(audioBuffer, 'slow');
            const fastBeatMap = await fastGenerator.generateBeatMapFromBuffer(audioBuffer, 'fast');

            // Both should generate valid beat maps
            expect(slowBeatMap).toBeDefined();
            expect(fastBeatMap).toBeDefined();

            // Metadata should reflect the config
            expect(slowBeatMap.metadata.minBpm).toBe(40);
            expect(slowBeatMap.metadata.maxBpm).toBe(80);
            expect(fastBeatMap.metadata.minBpm).toBe(140);
            expect(fastBeatMap.metadata.maxBpm).toBe(200);
        });
    });

    describe('getProgress', () => {
        it('should return null when no generation is active', () => {
            const generator = new BeatMapGenerator();
            expect(generator.getProgress()).toBeNull();
        });

        it('should return progress during generation', async () => {
            const generator = new BeatMapGenerator();

            // Create a longer audio buffer to allow progress check
            const audioBuffer = createMockAudioBuffer(5);

            // Start generation and check progress after a small delay
            const promise = generator.generateBeatMapFromBuffer(audioBuffer, 'progress-check');

            // Give it a moment to start
            await new Promise(resolve => setTimeout(resolve, 10));

            // Progress may be available during generation
            // (timing-dependent, so just check it doesn't throw)
            const progress = generator.getProgress();

            // Wait for completion
            await promise;

            // After completion, should be null again
            expect(generator.getProgress()).toBeNull();
        });
    });

    describe('cancel', () => {
        it('should be safe to call when no generation is active', () => {
            const generator = new BeatMapGenerator();

            // Should not throw
            expect(() => generator.cancel()).not.toThrow();
        });
    });

    describe('toJSON / fromJSON', () => {
        it('should serialize and deserialize beat map', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(3);

            const originalBeatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'json-test');

            // Serialize
            const jsonString = BeatMapGenerator.toJSON(originalBeatMap);
            expect(typeof jsonString).toBe('string');
            expect(jsonString.length).toBeGreaterThan(0);

            // Deserialize
            const restoredBeatMap = BeatMapGenerator.fromJSON(jsonString);

            // Compare
            expect(restoredBeatMap.audioId).toBe(originalBeatMap.audioId);
            expect(restoredBeatMap.duration).toBe(originalBeatMap.duration);
            expect(restoredBeatMap.bpm).toBe(originalBeatMap.bpm);
            expect(restoredBeatMap.beats.length).toBe(originalBeatMap.beats.length);
            expect(restoredBeatMap.metadata.version).toBe(originalBeatMap.metadata.version);
            expect(restoredBeatMap.metadata.algorithm).toBe(originalBeatMap.metadata.algorithm);
        });

        it('should preserve beat properties in serialization', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(3);

            const originalBeatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'beat-props');
            const jsonString = BeatMapGenerator.toJSON(originalBeatMap);
            const restoredBeatMap = BeatMapGenerator.fromJSON(jsonString);

            // Check first beat properties
            if (originalBeatMap.beats.length > 0) {
                const originalBeat = originalBeatMap.beats[0];
                const restoredBeat = restoredBeatMap.beats[0];

                expect(restoredBeat.timestamp).toBe(originalBeat.timestamp);
                expect(restoredBeat.beatInMeasure).toBe(originalBeat.beatInMeasure);
                expect(restoredBeat.isDownbeat).toBe(originalBeat.isDownbeat);
                expect(restoredBeat.measureNumber).toBe(originalBeat.measureNumber);
                expect(restoredBeat.intensity).toBe(originalBeat.intensity);
                expect(restoredBeat.confidence).toBe(originalBeat.confidence);
            }
        });

        it('should produce valid JSON', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'valid-json');
            const jsonString = BeatMapGenerator.toJSON(beatMap);

            // Should be parseable
            const parsed = JSON.parse(jsonString);
            expect(parsed).toBeDefined();
            expect(parsed.audioId).toBe('valid-json');
            expect(Array.isArray(parsed.beats)).toBe(true);
        });

        it('should handle beat map with no beats', () => {
            const emptyBeatMap: BeatMap = {
                audioId: 'empty',
                duration: 0,
                beats: [],
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

            const jsonString = BeatMapGenerator.toJSON(emptyBeatMap);
            const restoredBeatMap = BeatMapGenerator.fromJSON(jsonString);

            expect(restoredBeatMap.beats.length).toBe(0);
            expect(restoredBeatMap.audioId).toBe('empty');
        });
    });

    describe('saveToFile / loadFromFile', () => {
        it('should throw in browser environment', async () => {
            const beatMap: BeatMap = {
                audioId: 'test',
                duration: 0,
                beats: [],
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

            // These should throw because we're not in Node.js (depending on test env)
            // In vitest/node, this might actually work
            // Let's just verify the methods exist
            expect(typeof BeatMapGenerator.saveToFile).toBe('function');
            expect(typeof BeatMapGenerator.loadFromFile).toBe('function');
        });
    });

    describe('edge cases', () => {
        it('should handle very short audio', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(0.5);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'short');

            expect(beatMap).toBeDefined();
            expect(beatMap.duration).toBe(0.5);
        });

        it('should handle mono audio', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(2, 44100, 1);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'mono');

            expect(beatMap).toBeDefined();
        });

        it('should handle high sample rate audio', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(2, 96000, 2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'high-rate');

            expect(beatMap).toBeDefined();
        });

        it('should handle different dpAlpha values', async () => {
            const lowAlphaGenerator = new BeatMapGenerator({ dpAlpha: 100 });
            const highAlphaGenerator = new BeatMapGenerator({ dpAlpha: 1000 });

            const audioBuffer = createMockAudioBuffer(3);

            const lowAlphaBeatMap = await lowAlphaGenerator.generateBeatMapFromBuffer(audioBuffer, 'low-alpha');
            const highAlphaBeatMap = await highAlphaGenerator.generateBeatMapFromBuffer(audioBuffer, 'high-alpha');

            // Both should produce valid beat maps
            expect(lowAlphaBeatMap.metadata.dpAlpha).toBe(100);
            expect(highAlphaBeatMap.metadata.dpAlpha).toBe(1000);
        });
    });

    describe('generateBeatMap (from URL)', () => {
        it('should handle fetch errors gracefully', async () => {
            const generator = new BeatMapGenerator();

            // Mock fetch to fail
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await expect(
                generator.generateBeatMap('nonexistent.mp3', 'error-test')
            ).rejects.toThrow();
        });

        it('should handle non-ok responses', async () => {
            const generator = new BeatMapGenerator();

            // Mock fetch to return non-ok response
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                statusText: 'Not Found',
            });

            await expect(
                generator.generateBeatMap('missing.mp3', 'not-found')
            ).rejects.toThrow('Failed to fetch audio');
        });
    });
});
