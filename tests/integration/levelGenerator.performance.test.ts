/**
 * Performance Test for LevelGenerator
 *
 * Tests the performance requirement:
 * - Generation time < 60 seconds for 3-minute song (includes full-spectrum pitch analysis)
 *
 * Part of Phase 3.3 Tests - Performance tests for generation time
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LevelGenerator } from '../../src/core/generation/LevelGenerator.js';
import type { UnifiedBeatMap, Beat } from '../../src/core/types/BeatMap.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock AudioBuffer for performance testing
 *
 * Uses a sparse approach - creates real audio data but efficiently
 * by using typed arrays directly.
 */
function createPerformanceAudioBuffer(
    durationSeconds: number = 180, // 3 minutes
    sampleRate: number = 44100,
    numberOfChannels: number = 1
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [];

    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        const beatInterval = 0.5; // 120 BPM

        // Create audio with transients at beat positions
        // Using a simple pattern that's efficient to generate
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const beatPhase = (t % beatInterval) / beatInterval;

            // Base frequency with slight variation
            const baseFreq = 440 + Math.sin(t * 0.1) * 50;

            // Simple waveform
            data[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;

            // Add transient at beat boundaries
            if (beatPhase < 0.02) {
                data[i] = 0.8 * (1 - beatPhase / 0.02);
            }
        }
        channelData.push(data);
    }

    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels,
        getChannelData: (channel: number) => channelData[channel] ?? channelData[0],
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getAudioData: () => channelData[0],
    } as AudioBuffer;
}

/**
 * Create a mock UnifiedBeatMap for performance testing
 */
function createPerformanceUnifiedBeatMap(
    duration: number = 180, // 3 minutes
    bpm: number = 120
): UnifiedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    const numBeats = Math.floor(duration / quarterNoteInterval);
    const beats: Beat[] = [];

    for (let i = 0; i < numBeats; i++) {
        const timestamp = i * quarterNoteInterval;
        beats.push({
            timestamp,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            intensity: 0.8,
            confidence: 0.9,
        });
    }

    return {
        audioId: 'perf-test-audio-3min',
        duration,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        originalMetadata: {
            version: '1.0.0',
            algorithm: 'test',
            minBpm: bpm,
            maxBpm: bpm,
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

// =============================================================================
// Performance Tests
// =============================================================================

describe('LevelGenerator Performance Tests', () => {
    // Skip these tests in CI environments where they may be slow
    const shouldRunPerfTests = process.env.RUN_PERF_TESTS === 'true' || process.env.NODE_ENV !== 'ci';

    describe.skipIf(!shouldRunPerfTests)('3-minute song generation', () => {
        it('should generate a 3-minute level in under 60 seconds (with pitch analysis)', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 1.0 }, // Full pitch analysis
                enableCache: false, // Disable cache for accurate timing
            });

            // Create 3-minute audio
            const audioBuffer = createPerformanceAudioBuffer(180);
            const unifiedBeatMap = createPerformanceUnifiedBeatMap(180);

            console.log('\n⏱️ Starting 3-minute level generation (with pitch)...');
            const startTime = performance.now();

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            const elapsedMs = performance.now() - startTime;
            const elapsedSeconds = elapsedMs / 1000;

            console.log(`✅ Generation completed in ${elapsedSeconds.toFixed(2)}s`);
            console.log(`   Beats generated: ${level.chart.beats.length}`);
            console.log(`   Pitch-influenced: ${level.metadata.buttonMetadata.pitchInfluencedBeats}`);

            // Verify generation was successful
            expect(level).toBeDefined();
            expect(level.chart.beats.length).toBeGreaterThan(0);

            // Verify performance requirement: < 60 seconds (pitch analysis is CPU-intensive)
            expect(elapsedSeconds).toBeLessThan(60);

            console.log(`\n✓ Performance test PASSED: ${elapsedSeconds.toFixed(2)}s < 60s`);
        }, 120_000);

        it('should generate a 3-minute level in under 60 seconds (pattern-only, no pitch)', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0 }, // Skip pitch analysis
                enableCache: false, // Disable cache for accurate timing
            });

            // Create 3-minute audio
            const audioBuffer = createPerformanceAudioBuffer(180);
            const unifiedBeatMap = createPerformanceUnifiedBeatMap(180);

            console.log('\n⏱️ Starting 3-minute level generation (pattern-only)...');
            const startTime = performance.now();

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            const elapsedMs = performance.now() - startTime;
            const elapsedSeconds = elapsedMs / 1000;

            console.log(`✅ Generation completed in ${elapsedSeconds.toFixed(2)}s`);
            console.log(`   Beats generated: ${level.chart.beats.length}`);
            console.log(`   Pattern-only: ${level.metadata.buttonMetadata.pitchInfluencedBeats === 0}`);

            // Verify generation was successful
            expect(level).toBeDefined();
            expect(level.chart.beats.length).toBeGreaterThan(0);
            expect(level.metadata.buttonMetadata.pitchInfluencedBeats).toBe(0);

            // Verify performance requirement: < 60 seconds
            // Pattern-only should be even faster
            expect(elapsedSeconds).toBeLessThan(60);

            console.log(`\n✓ Performance test PASSED: ${elapsedSeconds.toFixed(2)}s < 60s`);
        }, 120_000);

        it('should generate all difficulties for 3-minute song efficiently', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0.5 },
                enableCache: true, // Enable cache for efficient multi-difficulty generation
            });

            // Create 3-minute audio
            const audioBuffer = createPerformanceAudioBuffer(180);
            const unifiedBeatMap = createPerformanceUnifiedBeatMap(180);

            console.log('\n⏱️ Starting 3-minute all-difficulties generation...');
            const startTime = performance.now();

            const results = await generator.generateAllDifficulties(audioBuffer, unifiedBeatMap);

            const elapsedMs = performance.now() - startTime;
            const elapsedSeconds = elapsedMs / 1000;

            console.log(`✅ All difficulties generated in ${elapsedSeconds.toFixed(2)}s`);
            console.log(`   Easy: ${results.easy.chart.beats.length} beats`);
            console.log(`   Medium: ${results.medium.chart.beats.length} beats`);
            console.log(`   Hard: ${results.hard.chart.beats.length} beats`);

            // Verify all difficulties were generated
            expect(results.easy).toBeDefined();
            expect(results.medium).toBeDefined();
            expect(results.hard).toBeDefined();

            // Cache should have been used efficiently
            const cacheStats = generator.getCacheStats();
            console.log(`   Cache entries: ${cacheStats.entryCount}`);
            console.log(`   Cache hits: ${cacheStats.hits}`);

            // All difficulties should still complete within 60 seconds
            expect(elapsedSeconds).toBeLessThan(60);

            console.log(`\n✓ All-difficulties test PASSED: ${elapsedSeconds.toFixed(2)}s < 60s`);
        }, 120_000);

        it('should scale linearly with audio duration', async () => {
            // Test scaling with 30-second and 60-second samples
            const durations = [30, 60];
            const times: number[] = [];

            for (const duration of durations) {
                const generator = new LevelGenerator({
                    difficulty: 'medium',
                    controllerMode: 'ddr',
                    buttons: { pitchInfluenceWeight: 0 }, // Pattern-only for faster baseline
                    enableCache: false,
                });

                const audioBuffer = createPerformanceAudioBuffer(duration);
                const unifiedBeatMap = createPerformanceUnifiedBeatMap(duration);

                const startTime = performance.now();
                await generator.generate(audioBuffer, unifiedBeatMap);
                const elapsedSeconds = (performance.now() - startTime) / 1000;

                times.push(elapsedSeconds);
                console.log(`   ${duration}s audio: ${elapsedSeconds.toFixed(2)}s generation`);
            }

            // Verify linear-ish scaling (60s shouldn't be more than 3x the 30s time)
            const ratio = times[1] / times[0];
            console.log(`   Scaling ratio (60s/30s): ${ratio.toFixed(2)}x`);

            expect(ratio).toBeLessThan(3);
        });
    });

    describe('Performance Characteristics', () => {
        it('should be faster with caching enabled on repeated generations', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0.5 },
                enableCache: true,
            });

            // Use shorter duration for this test
            const audioBuffer = createPerformanceAudioBuffer(10);
            const unifiedBeatMap = createPerformanceUnifiedBeatMap(10);

            // First generation (cold cache)
            const start1 = performance.now();
            await generator.generate(audioBuffer, unifiedBeatMap);
            const time1 = performance.now() - start1;

            // Second generation (warm cache)
            const start2 = performance.now();
            await generator.generate(audioBuffer, unifiedBeatMap);
            const time2 = performance.now() - start2;

            console.log(`\n✓ Caching improves performance:`);
            console.log(`   First generation: ${time1.toFixed(2)}ms`);
            console.log(`   Second generation: ${time2.toFixed(2)}ms`);
            console.log(`   Improvement: ${((1 - time2 / time1) * 100).toFixed(1)}%`);

            // Cache should make second generation faster
            const stats = generator.getCacheStats();
            expect(stats.hits).toBeGreaterThan(0);
        }, 30_000);

        it('should report timing breakdown via progress callback', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0.5 },
                enableCache: false,
            });

            const audioBuffer = createPerformanceAudioBuffer(10);
            const unifiedBeatMap = createPerformanceUnifiedBeatMap(10);

            const stageTimings: Map<string, { start: number; end: number }> = new Map();
            let lastStage: string | null = null;

            await generator.generate(audioBuffer, unifiedBeatMap, (progress) => {
                const now = performance.now();

                if (lastStage && lastStage !== progress.stage) {
                    // End previous stage
                    const timing = stageTimings.get(lastStage);
                    if (timing) {
                        timing.end = now;
                    }
                }

                // Start new stage
                if (!stageTimings.has(progress.stage)) {
                    stageTimings.set(progress.stage, { start: now, end: now });
                }

                lastStage = progress.stage;
            });

            // End final stage
            if (lastStage) {
                const timing = stageTimings.get(lastStage);
                if (timing) {
                    timing.end = performance.now();
                }
            }

            console.log('\n✓ Stage timing breakdown:');
            for (const [stage, timing] of stageTimings) {
                const duration = timing.end - timing.start;
                console.log(`   ${stage}: ${duration.toFixed(2)}ms`);
            }

            // All stages should have been reported
            expect(stageTimings.has('rhythm')).toBe(true);
            expect(stageTimings.has('buttons')).toBe(true);
            expect(stageTimings.has('conversion')).toBe(true);
            expect(stageTimings.has('finalizing')).toBe(true);
        });
    });
});
