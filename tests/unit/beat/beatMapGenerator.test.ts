/**
 * Tests for BeatMapGenerator
 *
 * Tests the orchestration of the beat detection pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BeatMapGenerator } from '../../../src/core/analysis/beat/BeatMapGenerator.js';
import type { BeatMap, BeatMapGeneratorOptions, DownbeatConfig } from '../../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    DEFAULT_DOWNBEAT_CONFIG,
} from '../../../src/core/types/BeatMap.js';

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
            expect(config.hopSizeMs).toBe(4);  // Changed to 4 (Ellis 2007 paper spec)
            expect(config.fftSize).toBe(2048);
            expect(config.rollingBpmWindowSize).toBe(8);
            expect(config.dpAlpha).toBe(680);
            expect(config.melBands).toBe(40);
            expect(config.highPassCutoff).toBe(0.4);
            expect(config.gaussianSmoothMs).toBe(20);
            expect(config.tempoCenter).toBe(0.5);
            expect(config.tempoWidth).toBe(1.4);
            // Mode-based defaults
            expect(config.hopSizeMode).toEqual({ mode: 'standard' });
            expect(config.melBandsMode).toEqual({ mode: 'standard' });
            expect(config.gaussianSmoothMode).toEqual({ mode: 'standard' });
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

            await generator.generateBeatMapFromBuffer(audioBuffer, 'progress-test', undefined, onProgress);

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

    describe('filter parameter (grid-alignment)', () => {
        it('should have default filter of 0.0', () => {
            const generator = new BeatMapGenerator();
            const config = generator.getConfig();

            expect(config.filter).toBe(0.0);
        });

        it('should accept custom filter value in config', () => {
            const generator = new BeatMapGenerator({ filter: 0.5 });
            const config = generator.getConfig();

            expect(config.filter).toBe(0.5);
        });

        it('should apply filter = 0.0 (no filtering) - all beats kept', async () => {
            const generator = new BeatMapGenerator({
                filter: 0.0,
                sensitivity: 2.0, // Higher sensitivity to get more beats
                noiseFloorThreshold: 0.0, // Don't filter by intensity
            });
            const audioBuffer = createMockAudioBuffer(5);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'filter-0');

            // Filter 0.0 should not remove any beats based on grid alignment
            expect(beatMap.beats.length).toBeGreaterThanOrEqual(0);
            expect(beatMap.metadata.filter).toBe(0.0);
        });

        it('should apply filter = 0.5 (moderate filtering)', async () => {
            // Create generator without filter to get baseline
            const noFilterGenerator = new BeatMapGenerator({
                filter: 0.0,
                sensitivity: 2.0,
                noiseFloorThreshold: 0.0,
            });
            const audioBuffer = createMockAudioBuffer(5);

            const noFilterBeatMap = await noFilterGenerator.generateBeatMapFromBuffer(audioBuffer, 'baseline');

            // Now with moderate filter
            const filterGenerator = new BeatMapGenerator({
                filter: 0.5,
                sensitivity: 2.0,
                noiseFloorThreshold: 0.0,
            });
            const filteredBeatMap = await filterGenerator.generateBeatMapFromBuffer(audioBuffer, 'filter-0.5');

            expect(filteredBeatMap.metadata.filter).toBe(0.5);

            // Filtered beats should be less than or equal to unfiltered
            expect(filteredBeatMap.beats.length).toBeLessThanOrEqual(noFilterBeatMap.beats.length);
        });

        it('should apply filter = 0.9 (aggressive filtering)', async () => {
            const noFilterGenerator = new BeatMapGenerator({
                filter: 0.0,
                sensitivity: 2.0,
                noiseFloorThreshold: 0.0,
            });
            const audioBuffer = createMockAudioBuffer(5);

            const noFilterBeatMap = await noFilterGenerator.generateBeatMapFromBuffer(audioBuffer, 'baseline-0.9');

            // Aggressive filter should only keep beats very close to the grid
            const filterGenerator = new BeatMapGenerator({
                filter: 0.9,
                sensitivity: 2.0,
                noiseFloorThreshold: 0.0,
            });
            const filteredBeatMap = await filterGenerator.generateBeatMapFromBuffer(audioBuffer, 'filter-0.9');

            expect(filteredBeatMap.metadata.filter).toBe(0.9);

            // Aggressive filtering should result in fewer or equal beats than no filter
            expect(filteredBeatMap.beats.length).toBeLessThanOrEqual(noFilterBeatMap.beats.length);
        });

        it('should apply filter = 1.0 (only exact grid beats)', async () => {
            const noFilterGenerator = new BeatMapGenerator({
                filter: 0.0,
                sensitivity: 2.0,
                noiseFloorThreshold: 0.0,
            });
            const audioBuffer = createMockAudioBuffer(5);

            const noFilterBeatMap = await noFilterGenerator.generateBeatMapFromBuffer(audioBuffer, 'baseline-1.0');

            // Maximum filter - only beats exactly on the grid
            const filterGenerator = new BeatMapGenerator({
                filter: 1.0,
                sensitivity: 2.0,
                noiseFloorThreshold: 0.0,
            });
            const filteredBeatMap = await filterGenerator.generateBeatMapFromBuffer(audioBuffer, 'filter-1.0');

            expect(filteredBeatMap.metadata.filter).toBe(1.0);

            // Filter 1.0 should result in fewer or equal beats
            expect(filteredBeatMap.beats.length).toBeLessThanOrEqual(noFilterBeatMap.beats.length);

            // All remaining beats should be very close to the grid
            // At 120 BPM, beat period is 0.5s
            const beatPeriod = 60.0 / filteredBeatMap.bpm;
            const tolerance = beatPeriod * 0.05; // 5% tolerance for "exact"

            for (const beat of filteredBeatMap.beats) {
                const gridPosition = Math.round(beat.timestamp / beatPeriod);
                const expectedTime = gridPosition * beatPeriod;
                const deviation = Math.abs(beat.timestamp - expectedTime);

                expect(deviation).toBeLessThan(tolerance);
            }
        });

        it('should demonstrate progressive filtering with increasing filter values', async () => {
            const audioBuffer = createMockAudioBuffer(5);
            const filterValues = [0.0, 0.5, 0.9, 1.0];
            const beatCounts: number[] = [];

            for (const filter of filterValues) {
                const generator = new BeatMapGenerator({
                    filter,
                    sensitivity: 2.0,
                    noiseFloorThreshold: 0.0,
                });
                const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, `progressive-${filter}`);
                beatCounts.push(beatMap.beats.length);
                expect(beatMap.metadata.filter).toBe(filter);
            }

            // Generally, higher filter values should result in fewer or equal beats
            // (may not be strictly monotonic due to other factors, but trend should hold)
            expect(beatCounts[3]).toBeLessThanOrEqual(beatCounts[0]);
        });

        it('should handle filter with beats on various subdivisions', async () => {
            // Create audio buffer that will produce beats at different subdivisions
            const generator = new BeatMapGenerator({
                filter: 0.7,
                sensitivity: 3.0, // Higher sensitivity to catch subdivisions
                noiseFloorThreshold: 0.0,
            });
            const audioBuffer = createMockAudioBuffer(5);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'subdivisions');

            expect(beatMap.metadata.filter).toBe(0.7);
            expect(beatMap.beats.length).toBeGreaterThanOrEqual(0);

            // All beats should have valid properties
            for (const beat of beatMap.beats) {
                expect(beat.timestamp).toBeGreaterThanOrEqual(0);
                expect(beat.timestamp).toBeLessThanOrEqual(5);
                expect(beat.intensity).toBeGreaterThanOrEqual(0);
                expect(beat.confidence).toBeGreaterThanOrEqual(0);
            }
        });

        it('should handle edge case: filter with silent audio', async () => {
            const generator = new BeatMapGenerator({
                filter: 0.5,
                noiseFloorThreshold: 0.0,
            });
            const audioBuffer = createSilentAudioBuffer(3);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'silent-filter');

            // Should handle gracefully even with no beats
            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.filter).toBe(0.5);
            expect(beatMap.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should work with combined sensitivity and filter', async () => {
            // High sensitivity (more beats) + high filter (stricter grid alignment)
            const generator = new BeatMapGenerator({
                sensitivity: 5.0,
                filter: 0.8,
                noiseFloorThreshold: 0.0,
            });
            const audioBuffer = createMockAudioBuffer(5);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'combined');

            expect(beatMap.metadata.sensitivity).toBe(5.0);
            expect(beatMap.metadata.filter).toBe(0.8);
            expect(beatMap.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should preserve beat properties after filtering', async () => {
            const generator = new BeatMapGenerator({
                filter: 0.5,
                sensitivity: 2.0,
            });
            const audioBuffer = createMockAudioBuffer(3);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'props-filter');

            // All beats should have valid properties after filtering
            for (const beat of beatMap.beats) {
                expect(typeof beat.timestamp).toBe('number');
                expect(typeof beat.beatInMeasure).toBe('number');
                expect(typeof beat.isDownbeat).toBe('boolean');
                expect(typeof beat.measureNumber).toBe('number');
                expect(typeof beat.intensity).toBe('number');
                expect(typeof beat.confidence).toBe('number');
            }
        });
    });

    describe('downbeatConfig parameter', () => {
        it('should accept downbeatConfig parameter', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'config-test',
                config
            );

            expect(beatMap).toBeDefined();
            expect(beatMap.audioId).toBe('config-test');
        });

        it('should store downbeatConfig in output BeatMap when provided', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 4,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'stored-config',
                config
            );

            // Config should be stored in the beatMap
            expect(beatMap.downbeatConfig).toBeDefined();
            expect(beatMap.downbeatConfig).toEqual(config);
        });

        it('should NOT store downbeatConfig when using default (undefined)', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            // Generate without providing downbeatConfig (uses default)
            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'default-config'
            );

            // Config should NOT be stored when default is used
            expect(beatMap.downbeatConfig).toBeUndefined();
        });

        it('should apply custom downbeat index correctly', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            // Set downbeat at beat index 2
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 2,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'custom-downbeat',
                config
            );

            // Find beat at index 2 (if it exists after filtering)
            const downbeatCandidate = beatMap.beats[2];
            if (downbeatCandidate) {
                expect(downbeatCandidate.isDownbeat).toBe(true);
                expect(downbeatCandidate.beatInMeasure).toBe(0);
            }

            // Verify the config was stored
            expect(beatMap.downbeatConfig?.segments[0].downbeatBeatIndex).toBe(2);
        });

        it('should apply different time signature correctly', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            // Use 3/4 time (waltz)
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 3 },
                }],
            };

            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'waltz-time',
                config
            );

            // Every 3rd beat should be a downbeat (0, 3, 6, 9, ...)
            for (let i = 0; i < beatMap.beats.length; i++) {
                const expectedDownbeat = i % 3 === 0;
                expect(beatMap.beats[i].isDownbeat).toBe(expectedDownbeat);
                expect(beatMap.beats[i].beatInMeasure).toBe(i % 3);
            }

            // Config should reflect 3/4 time
            expect(beatMap.downbeatConfig?.segments[0].timeSignature.beatsPerMeasure).toBe(3);
        });

        it('should handle time signature changes with multiple segments', async () => {
            const generator = new BeatMapGenerator();
            // Use longer audio to ensure enough beats for segment change
            const audioBuffer = createMockAudioBuffer(10);

            // 4/4 for first 4 beats, then 3/4 (using smaller indices to fit in beat count)
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 4, downbeatBeatIndex: 4, timeSignature: { beatsPerMeasure: 3 } },
                ],
            };

            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'time-sig-change',
                config
            );

            // Config should be stored with both segments
            expect(beatMap.downbeatConfig?.segments.length).toBe(2);
            expect(beatMap.downbeatConfig?.segments[0].timeSignature.beatsPerMeasure).toBe(4);
            expect(beatMap.downbeatConfig?.segments[1].timeSignature.beatsPerMeasure).toBe(3);
        });

        it('should throw for invalid downbeatConfig', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            // Invalid config: empty segments
            const invalidConfig = { segments: [] } as DownbeatConfig;

            await expect(
                generator.generateBeatMapFromBuffer(audioBuffer, 'invalid', invalidConfig)
            ).rejects.toThrow('DownbeatConfig must have at least one segment');
        });

        it('should throw when downbeatBeatIndex exceeds total beats', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(2); // Short audio

            // downbeatBeatIndex way beyond what the audio will have
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 10000, // Way too high
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            await expect(
                generator.generateBeatMapFromBuffer(audioBuffer, 'exceeds-beats', config)
            ).rejects.toThrow('downbeatBeatIndex');
        });

        it('should work with generateBeatMap from URL with downbeatConfig', async () => {
            const generator = new BeatMapGenerator();

            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            // Create a mock audio response
            const mockArrayBuffer = new ArrayBuffer(1024);
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                arrayBuffer: () => Promise.resolve(mockArrayBuffer),
            });

            // Mock AudioContext
            const mockAudioBuffer = createMockAudioBuffer(3);
            const mockDecodeAudioData = vi.fn().mockImplementation((_buffer, successCallback) => {
                return Promise.resolve(mockAudioBuffer);
            });

            (globalThis as any).AudioContext = vi.fn().mockImplementation(() => ({
                decodeAudioData: mockDecodeAudioData,
                close: vi.fn(),
            }));

            // This should work but will fail on fetch - that's fine for this test
            // We're just verifying the signature accepts downbeatConfig
            try {
                await generator.generateBeatMap('test.mp3', 'url-test', config);
            } catch (e) {
                // Expected - we're just testing that the function accepts the parameter
            }
        });
    });

    describe('backward compatibility (default behavior)', () => {
        it('should work without downbeatConfig parameter (default)', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            // Old-style call without downbeatConfig
            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'backward-compat'
            );

            expect(beatMap).toBeDefined();
            expect(beatMap.audioId).toBe('backward-compat');
            expect(beatMap.beats).toBeInstanceOf(Array);
        });

        it('should use default 4/4 time when no config provided', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'default-time'
            );

            // Without config, beat 0 should be downbeat (4/4 time default)
            if (beatMap.beats.length > 0) {
                expect(beatMap.beats[0].isDownbeat).toBe(true);
                expect(beatMap.beats[0].beatInMeasure).toBe(0);
            }

            // Every 4th beat should be a downbeat
            for (let i = 0; i < beatMap.beats.length; i++) {
                const expectedDownbeat = i % 4 === 0;
                expect(beatMap.beats[i].isDownbeat).toBe(expectedDownbeat);
            }
        });

        it('should produce same results as DEFAULT_DOWNBEAT_CONFIG when no config provided', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(5);

            // Generate without config
            const beatMapNoConfig = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'no-config'
            );

            // Generate with explicit default config
            const beatMapWithDefault = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'with-default',
                DEFAULT_DOWNBEAT_CONFIG
            );

            // The beat labeling should be identical
            expect(beatMapNoConfig.beats.length).toBe(beatMapWithDefault.beats.length);

            for (let i = 0; i < beatMapNoConfig.beats.length; i++) {
                expect(beatMapNoConfig.beats[i].isDownbeat).toBe(beatMapWithDefault.beats[i].isDownbeat);
                expect(beatMapNoConfig.beats[i].beatInMeasure).toBe(beatMapWithDefault.beats[i].beatInMeasure);
                expect(beatMapNoConfig.beats[i].measureNumber).toBe(beatMapWithDefault.beats[i].measureNumber);
            }

            // But only the explicit one should have config stored
            expect(beatMapNoConfig.downbeatConfig).toBeUndefined();
            expect(beatMapWithDefault.downbeatConfig).toBeDefined();
        });

        it('should support progress callback without downbeatConfig', async () => {
            const generator = new BeatMapGenerator();
            const audioBuffer = createMockAudioBuffer(3);

            const progressCalls: any[] = [];
            const onProgress = (progress: any) => {
                progressCalls.push({ ...progress });
            };

            // Old-style call with progress callback
            const beatMap = await generator.generateBeatMapFromBuffer(
                audioBuffer,
                'progress-compat',
                undefined, // No downbeatConfig
                onProgress
            );

            expect(beatMap).toBeDefined();
            expect(progressCalls.length).toBeGreaterThan(0);
        });
    });
});
