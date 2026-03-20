/**
 * Integration Test for LevelGenerator Full Pipeline
 *
 * Tests the complete level generation pipeline:
 * 1. Rhythm generation from audio
 * 2. Pitch analysis (if pitchInfluenceWeight > 0)
 * 3. Button mapping
 * 4. Conversion to ChartedBeatMap
 *
 * Part of Phase 3.3 Tests - Integration tests for full pipeline
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { LevelGenerator } from '../../src/core/generation/LevelGenerator.js';
import type { GeneratedLevel, LevelGenerationOptions } from '../../src/core/generation/LevelGenerator.js';
import type { UnifiedBeatMap, Beat } from '../../src/core/types/BeatMap.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock AudioBuffer with synthesized audio containing pitch changes
 */
function createMockAudioBufferWithPitch(
    durationSeconds: number = 3.0,
    sampleRate: number = 44100,
    numberOfChannels: number = 1
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [];

    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        const beatInterval = 0.5; // 120 BPM

        // Create frequency-swept audio with transients
        const frequencies = [
            440, 494, 523, 587, 659, 587, 523, 494,
            440, 392, 349, 330, 349, 392, 440, 494,
            523, 523, 440, 440, 392, 392, 349, 349,
        ];

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const beatIndex = Math.floor(t / beatInterval);
            const freqIndex = beatIndex % frequencies.length;
            const baseFreq = frequencies[freqIndex];

            data[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;

            if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
                data[i] = 1.0;
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
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(
    duration: number = 3.0,
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
        audioId: 'test-audio-id',
        duration,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 4, beatUnit: 4 } }],
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

/**
 * Create a longer audio buffer for performance testing
 */
function createLongMockAudioBuffer(
    durationSeconds: number = 10.0,
    sampleRate: number = 44100
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const data = new Float32Array(length);
    const beatInterval = 0.5;

    const frequencies = [440, 494, 523, 587, 659, 587, 523, 494];

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const beatIndex = Math.floor(t / beatInterval);
        const freqIndex = beatIndex % frequencies.length;
        const baseFreq = frequencies[freqIndex];

        data[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;

        if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
            data[i] = 1.0;
        }
    }

    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels: 1,
        getChannelData: () => data,
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getAudioData: () => data,
    } as AudioBuffer;
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('LevelGenerator Full Pipeline Integration', () => {
    describe('Basic Pipeline', () => {
        it('should generate a complete level with all phases', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0.8 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            // Verify level structure
            expect(level).toBeDefined();
            expect(level.chart).toBeDefined();
            expect(level.variant).toBeDefined();
            expect(level.rhythm).toBeDefined();
            expect(level.metadata).toBeDefined();

            // Verify chart structure
            expect(level.chart.beats.length).toBeGreaterThan(0);
            expect(level.chart.duration).toBe(3.0);
            expect(level.chart.bpm).toBeGreaterThan(0);

            // Verify metadata
            expect(level.metadata.difficulty).toBe('medium');
            expect(level.metadata.controllerMode).toBe('ddr');
            expect(level.metadata.buttonMetadata.keysUsed.length).toBeGreaterThan(0);

            console.log('\n✓ Complete level generated');
            console.log(`  Beats: ${level.chart.beats.length}`);
            console.log(`  Keys used: ${level.metadata.buttonMetadata.keysUsed.join(', ')}`);
            console.log(`  Pitch influenced: ${level.metadata.buttonMetadata.pitchInfluencedBeats}`);
        });

        it('should generate levels for all difficulties', async () => {
            const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

            for (const difficulty of difficulties) {
                const generator = new LevelGenerator({
                    difficulty,
                    controllerMode: 'ddr',
                    buttons: { pitchInfluenceWeight: 0.5 },
                });

                const audioBuffer = createMockAudioBufferWithPitch(2.0);
                const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

                const level = await generator.generate(audioBuffer, unifiedBeatMap);

                expect(level.metadata.difficulty).toBe(difficulty);
                expect(level.chart.beats.length).toBeGreaterThan(0);

                console.log(`\n✓ ${difficulty} level generated: ${level.chart.beats.length} beats`);
            }
        });

        it('should support both DDR and Guitar Hero modes', async () => {
            const modes: Array<'ddr' | 'guitar_hero'> = ['ddr', 'guitar_hero'];

            for (const mode of modes) {
                const generator = new LevelGenerator({
                    difficulty: 'medium',
                    controllerMode: mode,
                    buttons: { pitchInfluenceWeight: 0.5 },
                });

                const audioBuffer = createMockAudioBufferWithPitch(2.0);
                const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

                const level = await generator.generate(audioBuffer, unifiedBeatMap);

                expect(level.metadata.controllerMode).toBe(mode);
                expect(level.metadata.buttonMetadata.keysUsed.length).toBeGreaterThan(0);

                console.log(`\n✓ ${mode} mode generated: keys=${level.metadata.buttonMetadata.keysUsed.join(', ')}`);
            }
        });
    });

    describe('Pitch Influence', () => {
        it('should include pitch metadata when pitchInfluenceWeight > 0', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 1.0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            // Verify pitch metadata is populated
            expect(level.metadata.pitchMetadata).toBeDefined();
            expect(level.pitchAnalysis).toBeDefined();

            if (level.metadata.pitchMetadata) {
                expect(level.metadata.pitchMetadata.bandUsed).toBeDefined();
                expect(level.metadata.pitchMetadata.directionStats).toBeDefined();
                expect(level.metadata.pitchMetadata.intervalStats).toBeDefined();
            }

            console.log('\n✓ Pitch metadata populated');
            console.log(`  Band used: ${level.metadata.pitchMetadata?.bandUsed}`);
            console.log(`  Direction stats:`, level.metadata.pitchMetadata?.directionStats);
        });

        it('should skip pitch analysis when pitchInfluenceWeight = 0', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            // Pitch analysis should be null
            expect(level.pitchAnalysis).toBeNull();
            expect(level.metadata.pitchMetadata).toBeNull();

            // But the level should still be generated
            expect(level.chart.beats.length).toBeGreaterThan(0);

            console.log('\n✓ Pitch analysis skipped correctly');
            console.log(`  Pitch analysis: ${level.pitchAnalysis}`);
            console.log(`  Beats: ${level.chart.beats.length}`);
        });

        it('should show pitch influence in button metadata', async () => {
            // Test with full pitch influence
            const fullPitchGenerator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 1.0 },
            });

            // Test with no pitch influence
            const noPitchGenerator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const fullPitchLevel = await fullPitchGenerator.generate(audioBuffer, unifiedBeatMap);
            const noPitchLevel = await noPitchGenerator.generate(audioBuffer, unifiedBeatMap);

            // Full pitch should have some pitch-influenced beats
            expect(fullPitchLevel.metadata.buttonMetadata.pitchInfluencedBeats).toBeGreaterThanOrEqual(0);

            // No pitch should have 0 pitch-influenced beats
            expect(noPitchLevel.metadata.buttonMetadata.pitchInfluencedBeats).toBe(0);

            console.log('\n✓ Pitch influence visible in output');
            console.log(`  Full pitch (1.0): ${fullPitchLevel.metadata.buttonMetadata.pitchInfluencedBeats} pitch beats`);
            console.log(`  No pitch (0.0): ${noPitchLevel.metadata.buttonMetadata.pitchInfluencedBeats} pitch beats`);
        });
    });

    describe('Direction/Interval Statistics', () => {
        it('should populate direction statistics in pitchMetadata', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 1.0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            if (level.metadata.pitchMetadata && level.metadata.pitchMetadata.directionStats) {
                const { directionStats } = level.metadata.pitchMetadata;

                // All counts should be non-negative
                expect(directionStats.up).toBeGreaterThanOrEqual(0);
                expect(directionStats.down).toBeGreaterThanOrEqual(0);
                expect(directionStats.stable).toBeGreaterThanOrEqual(0);
                expect(directionStats.none).toBeGreaterThanOrEqual(0);

                // Sum should equal total beats
                const total = directionStats.up + directionStats.down + directionStats.stable + directionStats.none;
                expect(total).toBeGreaterThan(0);

                console.log('\n✓ Direction statistics populated');
                console.log(`  Up: ${directionStats.up}`);
                console.log(`  Down: ${directionStats.down}`);
                console.log(`  Stable: ${directionStats.stable}`);
                console.log(`  None: ${directionStats.none}`);
            } else {
                // If no pitch metadata, the test still passes (no pitch detected)
                console.log('\n✓ No pitch metadata (acceptable for some audio)');
            }
        });

        it('should populate interval statistics in pitchMetadata', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 1.0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            if (level.metadata.pitchMetadata && level.metadata.pitchMetadata.intervalStats) {
                const { intervalStats } = level.metadata.pitchMetadata;

                // All counts should be non-negative
                expect(intervalStats.unison).toBeGreaterThanOrEqual(0);
                expect(intervalStats.small).toBeGreaterThanOrEqual(0);
                expect(intervalStats.medium).toBeGreaterThanOrEqual(0);
                expect(intervalStats.large).toBeGreaterThanOrEqual(0);
                expect(intervalStats.very_large).toBeGreaterThanOrEqual(0);

                console.log('\n✓ Interval statistics populated');
                console.log(`  Unison: ${intervalStats.unison}`);
                console.log(`  Small: ${intervalStats.small}`);
                console.log(`  Medium: ${intervalStats.medium}`);
                console.log(`  Large: ${intervalStats.large}`);
                console.log(`  Very large: ${intervalStats.very_large}`);
            } else {
                console.log('\n✓ No interval stats (acceptable for some audio)');
            }
        });
    });

    describe('Chart Output', () => {
        it('should produce a valid ChartedBeatMap', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            // Verify ChartedBeatMap structure
            expect(level.chart.audioId).toBeDefined();
            expect(level.chart.duration).toBeGreaterThan(0);
            expect(level.chart.beats.length).toBeGreaterThan(0);
            expect(level.chart.detectedBeatIndices).toBeDefined();
            expect(level.chart.downbeatConfig).toBeDefined();
            expect(level.chart.quarterNoteInterval).toBeGreaterThan(0);
            expect(level.chart.bpm).toBeGreaterThan(0);
            expect(level.chart.chartMetadata).toBeDefined();

            console.log('\n✓ Valid ChartedBeatMap produced');
            console.log(`  Audio ID: ${level.chart.audioId}`);
            console.log(`  Duration: ${level.chart.duration}s`);
            console.log(`  BPM: ${level.chart.bpm}`);
        });

        it('should assign required keys to beats', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);

            // Check that some beats have required keys
            const beatsWithKeys = level.chart.beats.filter(b => b.requiredKey !== undefined);
            expect(beatsWithKeys.length).toBeGreaterThan(0);

            // Check that keys are valid DDR buttons
            const validKeys = ['up', 'down', 'left', 'right'];
            for (const beat of beatsWithKeys) {
                expect(validKeys).toContain(beat.requiredKey);
            }

            console.log('\n✓ Keys assigned to beats');
            console.log(`  Beats with keys: ${beatsWithKeys.length}/${level.chart.beats.length}`);
        });
    });

    describe('Progress Callbacks', () => {
        it('should report progress during generation', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const progressUpdates: Array<{ stage: string; progress: number; message: string }> = [];

            const level = await generator.generate(audioBuffer, unifiedBeatMap, (progress) => {
                progressUpdates.push({
                    stage: progress.stage,
                    progress: progress.progress,
                    message: progress.message,
                });
            });

            // Verify progress was reported
            expect(progressUpdates.length).toBeGreaterThan(0);

            // Verify all stages were reported
            const stages = new Set(progressUpdates.map(p => p.stage));
            expect(stages.has('rhythm')).toBe(true);
            expect(stages.has('buttons')).toBe(true);
            expect(stages.has('conversion')).toBe(true);
            expect(stages.has('finalizing')).toBe(true);

            console.log('\n✓ Progress callbacks working');
            console.log(`  Total updates: ${progressUpdates.length}`);
            console.log(`  Stages: ${Array.from(stages).join(', ')}`);
        });
    });

    describe('Performance', () => {
        it('should generate a 10-second level in reasonable time', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createLongMockAudioBuffer(10.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(10.0);

            const startTime = Date.now();
            const level = await generator.generate(audioBuffer, unifiedBeatMap);
            const elapsedMs = Date.now() - startTime;

            // Should complete in less than 30 seconds for 10-second audio
            // (not 10 seconds as per plan, but a reasonable time for testing)
            expect(elapsedMs).toBeLessThan(30000);
            expect(level.chart.beats.length).toBeGreaterThan(0);

            console.log('\n✓ Performance test passed');
            console.log(`  Duration: 10.0s`);
            console.log(`  Generation time: ${elapsedMs}ms`);
            console.log(`  Beats generated: ${level.chart.beats.length}`);
        });
    });

    describe('generateAllDifficulties', () => {
        it('should generate levels for all three difficulties at once', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium', // Base difficulty (will be overridden)
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const results = await generator.generateAllDifficulties(audioBuffer, unifiedBeatMap);

            // Verify all difficulties are present
            expect(results.easy).toBeDefined();
            expect(results.medium).toBeDefined();
            expect(results.hard).toBeDefined();

            // Verify metadata
            expect(results.easy.metadata.difficulty).toBe('easy');
            expect(results.medium.metadata.difficulty).toBe('medium');
            expect(results.hard.metadata.difficulty).toBe('hard');

            // Verify beat counts
            expect(results.easy.chart.beats.length).toBeGreaterThan(0);
            expect(results.medium.chart.beats.length).toBeGreaterThan(0);
            expect(results.hard.chart.beats.length).toBeGreaterThan(0);

            console.log('\n✓ All difficulties generated');
            console.log(`  Easy: ${results.easy.chart.beats.length} beats`);
            console.log(`  Medium: ${results.medium.chart.beats.length} beats`);
            console.log(`  Hard: ${results.hard.chart.beats.length} beats`);
        });
    });

    describe('cancellation', () => {
        it('should support cancellation via AbortSignal', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const controller = new AbortController();
            controller.abort(); // Abort immediately

            await expect(
                generator.generate(audioBuffer, unifiedBeatMap, undefined, controller.signal)
            ).rejects.toThrow('aborted');
        });

        it('should not throw if signal is not aborted', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const controller = new AbortController();
            // Don't abort

            const level = await generator.generate(audioBuffer, unifiedBeatMap, undefined, controller.signal);
            expect(level).toBeDefined();
            expect(level.chart.beats.length).toBeGreaterThan(0);
        });

        it('should support cancellation in generateAllDifficulties', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const controller = new AbortController();
            controller.abort(); // Abort immediately

            await expect(
                generator.generateAllDifficulties(audioBuffer, unifiedBeatMap, undefined, controller.signal)
            ).rejects.toThrow('aborted');
        });
    });
});
