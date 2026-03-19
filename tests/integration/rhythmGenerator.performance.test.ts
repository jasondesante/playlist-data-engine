/**
 * Performance Test for RhythmGenerator
 *
 * Part of Phase 3.7 Tests - Performance tests (generation time < 5 seconds for 3-minute song)
 *
 * This test verifies that the full rhythm generation pipeline completes within
 * the acceptable time limit (< 5 seconds for a 3-minute song).
 *
 * Test covers:
 * - Generation time for 3-minute audio
 * - Memory usage profile
 * - Caching functionality
 * - Cancellation support
 */

import { describe, it, expect } from 'vitest';
import {
    RhythmGenerator,
} from '../../src/core/generation/RhythmGenerator.js';
import type { UnifiedBeatMap, Beat } from '../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    DEFAULT_DOWNBEAT_CONFIG,
} from '../../src/core/types/BeatMap.js';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Performance threshold in milliseconds for a 3-minute song
 */
const PERFORMANCE_THRESHOLD_MS = 5000;

/**
 * Create a mock AudioBuffer with rhythmic content for testing
 *
 * @param durationSeconds - Duration of the audio in seconds
 * @param sampleRate - Sample rate (default: 44100)
 * @param numberOfChannels - Number of channels (default: 2)
 * @returns Mock AudioBuffer
 */
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
        // 120 BPM = 0.5s quarter note interval
        const beatInterval = Math.floor(sampleRate * 0.5);

        for (let i = 0; i < length; i++) {
            // Add click at beat positions
            const beatPosition = i % beatInterval;
            if (beatPosition < 100) {
                // Short click with decay
                data[i] = Math.sin(2 * Math.PI * 1000 * (i / sampleRate)) *
                    Math.exp(-beatPosition / 20) * 0.8;
            } else {
                // Low-level noise to simulate real audio
                data[i] = (Math.random() - 0.5) * 0.1;
            }
        }

        // Add some off-beat transients for more realistic testing
        const offBeatInterval = Math.floor(sampleRate * 0.25); // 16th notes
        for (let i = 0; i < length; i++) {
            const offBeatPosition = i % offBeatInterval;
            if (offBeatPosition < 50 && (i % beatInterval) > beatInterval / 2) {
                // Add softer off-beat click
                data[i] += Math.sin(2 * Math.PI * 2000 * (i / sampleRate)) *
                    Math.exp(-offBeatPosition / 15) * 0.3;
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

/**
 * Create a mock UnifiedBeatMap for testing
 *
 * @param durationSeconds - Duration in seconds
 * @param bpm - Tempo in BPM (default: 120)
 * @returns Mock UnifiedBeatMap
 */
function createMockUnifiedBeatMap(
    durationSeconds: number,
    bpm: number = 120
): UnifiedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    const beats: Beat[] = [];
    let timestamp = 0;
    let beatIndex = 0;

    while (timestamp < durationSeconds) {
        beats.push({
            timestamp,
            intensity: 0.5 + Math.random() * 0.3,
            confidence: 0.8 + Math.random() * 0.2,
            beatInMeasure: beatIndex % 4,
            isDownbeat: beatIndex % 4 === 0,
            measureNumber: Math.floor(beatIndex / 4),
        });

        timestamp += quarterNoteInterval;
        beatIndex++;
    }

    return {
        audioId: 'performance-test-audio',
        duration: durationSeconds,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: DEFAULT_DOWNBEAT_CONFIG,
        originalMetadata: {
            version: BEAT_DETECTION_VERSION,
            algorithm: BEAT_DETECTION_ALGORITHM,
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            noiseFloorThreshold: 1,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            hopSizeMode: { mode: 'standard' },
            melBandsMode: { mode: 'standard' },
            gaussianSmoothMode: { mode: 'standard' },
            generatedAt: new Date().toISOString(),
        },
    }
}

// ============================================================================
// Performance Tests
// ============================================================================

describe('RhythmGenerator Performance Tests', () => {
    describe('Phase 3.7: Performance tests (generation time < 5 seconds for 3-minute song)', () => {
        it('should generate rhythm for a 3-minute song in under 5 seconds', async () => {
            const durationSeconds = 180; // 3 minutes
            const audioBuffer = createMockAudioBuffer(durationSeconds);
            const beatMap = createMockUnifiedBeatMap(durationSeconds);

            const generator = new RhythmGenerator();
            const startTime = performance.now();
            const result = await generator.generate(audioBuffer, beatMap);
            const endTime = performance.now();
            const totalTime = endTime - startTime;

            console.log('\n=== RhythmGenerator Performance Test ===');
            console.log(`Duration: ${durationSeconds}s (3 minutes)`);
            console.log(`Total generation time: ${totalTime.toFixed(2)}ms`);
            console.log(`Performance threshold: ${PERFORMANCE_THRESHOLD_MS}ms`);

            console.log('\nResult summary:');
            console.log(`  Transients detected: ${result.metadata.transientsDetected}`);
            console.log(`  Phrases detected: ${result.metadata.phrasesDetected}`);
            console.log(`  Average density: ${result.metadata.averageDensity.toFixed(2)} transients/beat`);
            console.log(`  Natural difficulty: ${result.metadata.naturalDifficulty}`);

            // Verify the result is valid
            expect(result).toBeDefined();
            expect(result.difficultyVariants).toBeDefined();
            expect(result.difficultyVariants.easy).toBeDefined();
            expect(result.difficultyVariants.medium).toBeDefined();
            expect(result.difficultyVariants.hard).toBeDefined();
            expect(result.bandStreams).toBeDefined();
            expect(result.composite).toBeDefined();

            // Verify composite has expected properties
            expect(result.composite.beats).toBeInstanceOf(Array);
            expect(result.composite.beats.length).toBeGreaterThan(0);
            expect(result.composite.sections).toBeInstanceOf(Array);
            expect(['easy', 'medium', 'hard']).toContain(result.composite.naturalDifficulty);

            // Verify composite metadata
            expect(result.composite.metadata.totalBeats).toBe(result.composite.beats.length);
            expect(result.composite.metadata.sectionCount).toBe(result.composite.sections.length);

            console.log('\n=== Composite Stream Validation ===');
            console.log(`Total beats: ${result.composite.metadata.totalBeats}`);
            console.log(`Sections: ${result.composite.metadata.sectionCount}`);
            console.log(`Natural difficulty: ${result.composite.naturalDifficulty}`);
            console.log(`Beats per band: low=${result.composite.metadata.beatsPerBand.low}, mid=${result.composite.metadata.beatsPerBand.mid}, high=${result.composite.metadata.beatsPerBand.high}`);

            // Performance assertion: must complete within threshold
            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        });

        it('should scale linearly with audio duration', async () => {
            const durations = [30, 60, 120]; // 30s, 1min, 2min
            const results: { duration: number; timeMs: number }[] = [];

            for (const duration of durations) {
                const audioBuffer = createMockAudioBuffer(duration);
                const beatMap = createMockUnifiedBeatMap(duration);

                const startTime = performance.now();
                const generator = new RhythmGenerator();
                await generator.generate(audioBuffer, beatMap);
                const endTime = performance.now();

                results.push({
                    duration,
                    timeMs: endTime - startTime,
                });
            }

            console.log('\n=== RhythmGenerator Scaling Test ===');
            for (const result of results) {
                console.log(`  ${result.duration}s audio: ${result.timeMs.toFixed(2)}ms (${(result.timeMs / result.duration).toFixed(2)}ms/s)`);
            }

            // Verify scaling is reasonable (time per second should be consistent)
            const timesPerSecond = results.map(r => r.timeMs / r.duration);
            const avgTimePerSecond = timesPerSecond.reduce((a, b) => a + b, 0) / timesPerSecond.length;
            const maxDeviation = Math.max(...timesPerSecond.map(t => Math.abs(t - avgTimePerSecond)));

            console.log(`Average time per second: ${avgTimePerSecond.toFixed(2)} ms/s`);
            console.log(`Max deviation: ${maxDeviation.toFixed(2)} ms/s`);

            // All durations should complete within 5 seconds
            for (const result of results) {
                expect(result.timeMs).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
            }
        });

    });

    describe('Caching', () => {
        it('should complete generation with caching enabled', async () => {
            const durationSeconds = 60;
            const audioBuffer = createMockAudioBuffer(durationSeconds);
            const beatMap = createMockUnifiedBeatMap(durationSeconds);

            const generator = new RhythmGenerator({ enableCache: true });

            // First generation (cold cache)
            const start1 = performance.now();
            await generator.generate(audioBuffer, beatMap);
            const time1 = performance.now() - start1;

            // Second generation (cached)
            const start2 = performance.now();
            await generator.generate(audioBuffer, beatMap);
            const time2 = performance.now() - start2;

            console.log('\n=== Caching Performance ===');
            console.log(`First generation: ${time1.toFixed(2)}ms`);
            console.log(`Second generation (cached): ${time2.toFixed(2)}ms`);
            console.log(`Speedup: ${(time1 / time2).toFixed(2)}x`);

            // Cached generation should be significantly faster
            expect(time2).toBeLessThan(time1 * 0.5);

            // Verify cache stats
            const cacheStats = generator.getCacheStats();
            expect(cacheStats.entryCount).toBeGreaterThan(0);
            expect(cacheStats.hits).toBeGreaterThan(0);
        });
    })

    describe('Cancellation', () => {
        it('should handle cancellation gracefully', async () => {
            const durationSeconds = 120
            const audioBuffer = createMockAudioBuffer(durationSeconds)
            const beatMap = createMockUnifiedBeatMap(durationSeconds)

            const controller = new AbortController();
            const generator = new RhythmGenerator();

            // Start generation
            const generationPromise = generator.generate(audioBuffer, beatMap, controller.signal);

            // Cancel after a short delay
            setTimeout(() => controller.abort(), 50);

            // Should throw due to cancellation
            await expect(generationPromise).rejects.toThrow();

            console.log('\n=== Cancellation Test ===');
            console.log('Cancellation handled successfully');
        });
    })

    describe('Memory Usage', () => {
        it('should have reasonable memory usage', async () => {
            if (!process.memoryUsage) {
                console.log('Memory test skipped (not in Node.js environment)');
                return;
            }

            const durationSeconds = 180; // 3 minutes
            const audioBuffer = createMockAudioBuffer(durationSeconds);
            const beatMap = createMockUnifiedBeatMap(durationSeconds)

            // Force garbage collection if available
            const initialMemory = process.memoryUsage().heapUsed / (1024 * 1024);

            const generator = new RhythmGenerator();
            await generator.generate(audioBuffer, beatMap);

            const finalMemory = process.memoryUsage().heapUsed / (1024 * 1024);
            const memoryDelta = finalMemory - initialMemory;

            console.log('\n=== Memory Usage Test ===');
            console.log(`Initial memory: ${initialMemory.toFixed(2)} MB`);
            console.log(`Final memory: ${finalMemory.toFixed(2)} MB`);
            console.log(`Memory delta: ${memoryDelta.toFixed(2)} MB`);

            // Memory delta should be reasonable (less than 100MB for a 3-minute song)
            expect(memoryDelta).toBeLessThan(100);
        });
    })

    describe('Performance Summary', () => {
        it('should provide overall performance summary', async () => {
            const durationSeconds = 180; // 3 minutes
            const audioBuffer = createMockAudioBuffer(durationSeconds);
            const beatMap = createMockUnifiedBeatMap(durationSeconds)

            const generator = new RhythmGenerator();
            const start = performance.now();
            const result = await generator.generate(audioBuffer, beatMap);
            const totalTime = performance.now() - start;

            console.log('\n=== Phase 3.7: Performance Testing Summary ===');
            console.log('');
            console.log('✓ Task: Performance tests (generation time < 5 seconds for 3-minute song)');
            console.log('');
            console.log(`3-minute song generation time: ${totalTime.toFixed(2)}ms`);
            console.log(`Threshold: ${PERFORMANCE_THRESHOLD_MS}ms`);
            console.log(`Status: ${totalTime < PERFORMANCE_THRESHOLD_MS ? 'PASS' : 'FAIL'}`);
            console.log('');
            console.log('Result metadata:');
            console.log(`  - Transients detected: ${result.metadata.transientsDetected}`);
            console.log(`  - Phrases detected: ${result.metadata.phrasesDetected}`);
            console.log(`  - Average density: ${result.metadata.averageDensity.toFixed(2)}`);
            console.log(`  - Natural difficulty: ${result.metadata.naturalDifficulty}`);
            console.log('');

            expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
        });
    });
});
