/**
 * Integration Test for Procedural Rhythm Generation API
 *
 * Tests the complete rhythm generation pipeline through AudioAnalyzer's
 * convenience methods:
 * - generateRhythm() - from URL
 * - generateRhythmFromBuffer() - from decoded AudioBuffer
 *
 * These tests verify the integration between:
 * - AudioAnalyzer
 * - BeatMapGenerator
 * - BeatInterpolator
 * - RhythmGenerator
 * - All supporting classes (MultiBandAnalyzer, TransientDetector, etc.)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AudioAnalyzer } from '../../src/core/analysis/AudioAnalyzer.js';
import {
    RhythmGenerator,
    RHYTHM_PRESETS,
    getRhythmPreset,
    type RhythmGenerationOptions,
    type GeneratedRhythm,
} from '../../src/core/generation/RhythmGenerator.js';
import type { UnifiedBeatMap, Beat, BeatMapMetadata } from '../../src/core/types/BeatMap.js';
import { BEAT_DETECTION_VERSION, BEAT_DETECTION_ALGORITHM } from '../../src/core/types/BeatMap.js';
import { TEST_AUDIO_URLS } from '../fixtures/testAudioUrls.js';

// Skip integration tests if running in CI without network access
const shouldRunNetworkTests = !process.env.CI || process.env.RUN_NETWORK_TESTS === 'true';

// Test configuration
const TEST_CONFIG = {
    networkTimeout: 120000, // 2 minutes for full pipeline
    shortAudioTimeout: 30000, // 30 seconds for short tests
};

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock AudioBuffer with synthesized audio
 */
function createMockAudioBuffer(
    durationSeconds: number = 2.0,
    sampleRate: number = 44100,
    numberOfChannels: number = 1
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [];

    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        // Generate a simple sine wave with transients at beat intervals
        const beatInterval = 0.5; // 120 BPM
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            // 440 Hz sine wave
            data[i] = Math.sin(2 * Math.PI * 440 * t) * 0.3;
            // Add "transients" at beat intervals
            if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
                data[i] = 1.0; // Sharp transient at each beat
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
    duration: number = 2.0,
    bpm: number = 120,
    audioId: string = 'test-audio-id'
): UnifiedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    const numBeats = Math.floor(duration / quarterNoteInterval);
    const beats: Beat[] = [];

    for (let i = 0; i < numBeats; i++) {
        beats.push({
            timestamp: i * quarterNoteInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            intensity: 0.5,
            confidence: 0.9,
        });
    }

    return {
        audioId,
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
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        },
    };
}

// ============================================================================
// API Integration Tests
// ============================================================================

describe('Procedural Rhythm Generation API Integration Tests', () => {
    let analyzer: AudioAnalyzer;
    let audioContext: AudioContext | null = null;

    beforeAll(async () => {
        analyzer = new AudioAnalyzer();

        // Try to create AudioContext for tests that need it
        try {
            const AudioContextClass = (globalThis as any).AudioContext ||
                (globalThis as any).webkitAudioContext;
            if (AudioContextClass) {
                audioContext = new AudioContextClass();
            }
        } catch (e) {
            console.log('AudioContext not available in test environment');
        }
    });

    afterAll(async () => {
        // Clean up AudioContext
        if (audioContext && audioContext.state !== 'closed' && typeof audioContext.close === 'function') {
            await audioContext.close();
        }
    });

    // ==================== generateRhythmFromBuffer Tests ====================

    describe('generateRhythmFromBuffer', () => {
        it('should generate rhythm from a mock AudioBuffer', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-001'
            );

            // Verify structure
            expect(result).toBeDefined();
            expect(result.difficultyVariants).toBeDefined();
            expect(result.difficultyVariants.easy).toBeDefined();
            expect(result.difficultyVariants.medium).toBeDefined();
            expect(result.difficultyVariants.hard).toBeDefined();
            expect(result.bandStreams).toBeDefined();
            expect(result.composite).toBeDefined();
            expect(result.analysis).toBeDefined();
            expect(result.metadata).toBeDefined();

            console.log(`\n✓ generateRhythmFromBuffer completed successfully`);
            console.log(`  Duration: ${result.metadata.duration.toFixed(2)}s`);
            console.log(`  Natural difficulty: ${result.metadata.naturalDifficulty}`);
            console.log(`  Easy beats: ${result.difficultyVariants.easy.beats.length}`);
            console.log(`  Medium beats: ${result.difficultyVariants.medium.beats.length}`);
            console.log(`  Hard beats: ${result.difficultyVariants.hard.beats.length}`);
        });

        it('should accept custom rhythm generation options', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);
            const options: RhythmGenerationOptions = {
                difficulty: 'hard',
                outputMode: 'composite',
                minimumTransientIntensity: 0.3,
                measureStartOffset: 0,
            };

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-002',
                options
            );

            expect(result).toBeDefined();
            expect(result.metadata.generationConfig.difficulty).toBe('hard');
            expect(result.metadata.generationConfig.minimumTransientIntensity).toBe(0.3);
            expect(result.metadata.generationConfig.outputMode).toBe('composite');

            console.log(`\n✓ Custom options applied correctly`);
            console.log(`  Difficulty: ${result.metadata.generationConfig.difficulty}`);
            console.log(`  Min transient intensity: ${result.metadata.generationConfig.minimumTransientIntensity}`);
        });

        it('should call progress callback during generation', async () => {
            const audioBuffer = createMockAudioBuffer(1.0);

            const progressCalls: Array<{ phase: string; progress: number; message: string }> = [];
            const onProgress = (phase: string, progress: number, message: string) => {
                progressCalls.push({ phase, progress, message });
            };

            await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-003',
                undefined,
                undefined,
                undefined,
                onProgress
            );

            // Should have progress calls for phases
            expect(progressCalls.length).toBeGreaterThan(0);

            const phase1Calls = progressCalls.filter(c => c.phase === 'Phase 1');
            const phase2Calls = progressCalls.filter(c => c.phase === 'Phase 2');
            const phase3Calls = progressCalls.filter(c => c.phase === 'Phase 3');

            expect(phase1Calls.length).toBeGreaterThan(0);
            expect(phase2Calls.length).toBeGreaterThan(0);
            expect(phase3Calls.length).toBeGreaterThan(0);

            console.log(`\n✓ Progress callback called for all phases`);
            console.log(`  Total progress calls: ${progressCalls.length}`);
            console.log(`  Phase 1 calls: ${phase1Calls.length}`);
            console.log(`  Phase 2 calls: ${phase2Calls.length}`);
            console.log(`  Phase 3 calls: ${phase3Calls.length}`);
        });

        it('should handle very short audio', async () => {
            const audioBuffer = createMockAudioBuffer(0.5);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-short'
            );

            expect(result).toBeDefined();
            expect(result.metadata.duration).toBe(0.5);

            console.log(`\n✓ Short audio handled correctly`);
            console.log(`  Duration: ${result.metadata.duration}s`);
        });

        it('should handle silent audio', async () => {
            // Create silent audio buffer
            const length = 44100;
            const silentData = new Float32Array(length); // All zeros = silence
            const audioBuffer: AudioBuffer = {
                duration: 1.0,
                length,
                sampleRate: 44100,
                numberOfChannels: 1,
                getChannelData: () => silentData,
                copyFromChannel: () => {},
                copyToChannel: () => {},
                getAudioData: () => silentData,
            } as AudioBuffer;

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-silent'
            );

            expect(result).toBeDefined();
            expect(result.bandStreams.low.beats.length).toBe(0);
            expect(result.bandStreams.mid.beats.length).toBe(0);
            expect(result.bandStreams.high.beats.length).toBe(0);

            console.log(`\n✓ Silent audio handled correctly`);
            console.log(`  Low beats: ${result.bandStreams.low.beats.length}`);
            console.log(`  Mid beats: ${result.bandStreams.mid.beats.length}`);
            console.log(`  High beats: ${result.bandStreams.high.beats.length}`);
        });

        it('should work with different output modes', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            // Test all output modes
            const outputModes: Array<'composite' | 'low' | 'mid' | 'high'> = ['composite', 'low', 'mid', 'high'];

            for (const outputMode of outputModes) {
                const result = await analyzer.generateRhythmFromBuffer(
                    audioBuffer,
                    `test-track-${outputMode}`,
                    { difficulty: 'medium', outputMode }
                );

                expect(result).toBeDefined();
                expect(result.metadata.generationConfig.outputMode).toBe(outputMode);

                console.log(`\n✓ Output mode '${outputMode}' works correctly`);
            }
        });

        it('should work with all difficulty levels', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);
            const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

            for (const difficulty of difficulties) {
                const result = await analyzer.generateRhythmFromBuffer(
                    audioBuffer,
                    `test-track-${difficulty}`,
                    { difficulty, outputMode: 'composite' }
                );

                expect(result).toBeDefined();
                expect(result.difficultyVariants[difficulty]).toBeDefined();
                expect(result.difficultyVariants[difficulty].difficulty).toBe(difficulty);

                console.log(`\n✓ Difficulty '${difficulty}' works correctly`);
                console.log(`  ${difficulty} beats: ${result.difficultyVariants[difficulty].beats.length}`);
            }
        });

        it('should work with rhythm presets', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            // Test with casual preset
            const casualPreset = getRhythmPreset('casual');
            expect(casualPreset).toBeDefined();

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-casual',
                {
                    difficulty: casualPreset!.difficulty,
                    outputMode: casualPreset!.outputMode,
                }
            );

            expect(result).toBeDefined();
            expect(result.metadata.generationConfig.difficulty).toBe('easy');

            console.log(`\n✓ Preset 'casual' works correctly`);
            console.log(`  Difficulty: ${result.metadata.generationConfig.difficulty}`);
            console.log(`  Output mode: ${result.metadata.generationConfig.outputMode}`);
        });
    });

    // ==================== Variant Verification Tests ====================

    describe('variant verification', () => {
        it('should verify all 3 difficulty variants have valid structure', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-variants'
            );

            const validBands = ['low', 'mid', 'high'];
            const validGridTypes = ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'];

            for (const [difficulty, variant] of Object.entries(result.difficultyVariants)) {
                expect(variant.difficulty).toBe(difficulty);
                expect(Array.isArray(variant.beats)).toBe(true);
                expect(typeof variant.isUnedited).toBe('boolean');
                expect(['none', 'simplified', 'interpolated', 'pattern_inserted']).toContain(variant.editType);
                expect(typeof variant.editAmount).toBe('number');
                expect(variant.editAmount).toBeGreaterThanOrEqual(0);
                expect(variant.editAmount).toBeLessThanOrEqual(1);

                for (const beat of variant.beats) {
                    expect(beat).toHaveProperty('timestamp');
                    expect(beat).toHaveProperty('beatIndex');
                    expect(beat).toHaveProperty('gridPosition');
                    expect(beat).toHaveProperty('gridType');
                    expect(beat).toHaveProperty('intensity');
                    expect(beat).toHaveProperty('band');
                    expect(beat).toHaveProperty('sourceBand');
                    expect(validGridTypes).toContain(beat.gridType);
                    expect(validBands).toContain(beat.band);
                    expect(validBands).toContain(beat.sourceBand);
                }
            }

            console.log(`\n✓ All 3 difficulty variants have valid structure`);
        });

        it('should verify isUnedited flag is correct for natural difficulty variant', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-unedited'
            );

            const naturalDifficulty = result.composite.naturalDifficulty;
            const variants = result.difficultyVariants;

            // The variant matching the natural difficulty should have isUnedited = true
            expect(variants.easy.isUnedited).toBe(naturalDifficulty === 'easy');
            expect(variants.medium.isUnedited).toBe(naturalDifficulty === 'medium');
            expect(variants.hard.isUnedited).toBe(naturalDifficulty === 'hard');

            // Verify that exactly one variant is unedited
            const uneditedCount = [variants.easy, variants.medium, variants.hard]
                .filter(v => v.isUnedited).length;
            expect(uneditedCount).toBe(1);

            console.log(`\n✓ isUnedited flag is correct`);
            console.log(`  Natural difficulty: ${naturalDifficulty}`);
            console.log(`  Easy isUnedited: ${variants.easy.isUnedited}`);
            console.log(`  Medium isUnedited: ${variants.medium.isUnedited}`);
            console.log(`  Hard isUnedited: ${variants.hard.isUnedited}`);
        });

        it('should verify Easy variant contains only allowed grid types', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-easy-grid'
            );

            const easyVariant = result.difficultyVariants.easy;

            // Easy difficulty only allows: straight_8th, quarter_triplet
            const allowedGridTypes = ['straight_8th', 'quarter_triplet'];
            const disallowedGridTypes = ['straight_16th', 'triplet_8th'];

            for (const beat of easyVariant.beats) {
                expect(allowedGridTypes).toContain(beat.gridType);
                expect(disallowedGridTypes).not.toContain(beat.gridType);
            }

            console.log(`\n✓ Easy variant contains only allowed grid types`);
            console.log(`  Total easy beats: ${easyVariant.beats.length}`);
        });

        it('should verify composite sections reference correct source bands', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-composite'
            );

            const composite = result.composite;
            const validBands = ['low', 'mid', 'high'];

            // Verify sections array exists
            expect(Array.isArray(composite.sections)).toBe(true);

            // Verify each section
            for (const section of composite.sections) {
                expect(section).toHaveProperty('beatRange');
                expect(section.beatRange).toHaveProperty('start');
                expect(section.beatRange).toHaveProperty('end');
                expect(section.beatRange.start).toBeLessThanOrEqual(section.beatRange.end);
                expect(validBands).toContain(section.sourceBand);
                expect(typeof section.score).toBe('number');
                expect(typeof section.margin).toBe('number');
            }

            // Verify all composite beats have valid sourceBand
            for (const beat of composite.beats) {
                expect(validBands).toContain(beat.sourceBand);
            }

            console.log(`\n✓ Composite sections are valid`);
            console.log(`  Total sections: ${composite.sections.length}`);
            console.log(`  Total beats: ${composite.beats.length}`);
        });
    });

    // ==================== Band Streams Tests ====================

    describe('band streams', () => {
        it('should return all 3 band streams', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-bands'
            );

            expect(result.bandStreams.low).toBeDefined();
            expect(result.bandStreams.mid).toBeDefined();
            expect(result.bandStreams.high).toBeDefined();

            expect(result.bandStreams.low.audioId).toBe('test-track-bands');
            expect(result.bandStreams.mid.audioId).toBe('test-track-bands');
            expect(result.bandStreams.high.audioId).toBe('test-track-bands');

            console.log(`\n✓ All 3 band streams returned`);
            console.log(`  Low beats: ${result.bandStreams.low.beats.length}`);
            console.log(`  Mid beats: ${result.bandStreams.mid.beats.length}`);
            console.log(`  High beats: ${result.bandStreams.high.beats.length}`);
        });

        it('should have grid decisions for each band', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-grid-decisions'
            );

            // Each band stream should have gridDecisions
            expect(result.bandStreams.low.gridDecisions).toBeDefined();
            expect(result.bandStreams.mid.gridDecisions).toBeDefined();
            expect(result.bandStreams.high.gridDecisions).toBeDefined();

            console.log(`\n✓ Grid decisions available for all bands`);
            console.log(`  Low decisions: ${result.bandStreams.low.gridDecisions.length}`);
            console.log(`  Mid decisions: ${result.bandStreams.mid.gridDecisions.length}`);
            console.log(`  High decisions: ${result.bandStreams.high.gridDecisions.length}`);
        });
    });

    // ==================== Analysis Results Tests ====================

    describe('analysis results', () => {
        it('should include transient analysis', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-transients'
            );

            expect(result.analysis.transientAnalysis).toBeDefined();
            expect(result.analysis.transientAnalysis.transients).toBeDefined();
            expect(result.analysis.transientAnalysis.bandTransients).toBeDefined();
            expect(result.analysis.transientAnalysis.metadata).toBeDefined();
            expect(result.analysis.transientAnalysis.metadata.totalTransients).toBeGreaterThanOrEqual(0);

            console.log(`\n✓ Transient analysis included`);
            console.log(`  Total transients: ${result.analysis.transientAnalysis.metadata.totalTransients}`);
        });

        it('should include phrase analysis', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-phrases'
            );

            expect(result.analysis.phraseAnalysis).toBeDefined();
            expect(result.analysis.phraseAnalysis.phrases).toBeDefined();
            expect(result.analysis.phraseAnalysis.patternLibrary).toBeDefined();
            expect(result.analysis.phraseAnalysis.phrasesByBand).toBeDefined();

            console.log(`\n✓ Phrase analysis included`);
            console.log(`  Phrases detected: ${result.analysis.phraseAnalysis.phrases.length}`);
            console.log(`  Pattern library size: ${result.analysis.phraseAnalysis.patternLibrary.length}`);
        });

        it('should include density analysis', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-density'
            );

            expect(result.analysis.densityAnalysis).toBeDefined();
            expect(result.analysis.densityAnalysis.bandMetrics).toBeDefined();
            expect(result.analysis.densityAnalysis.combinedMetrics).toBeDefined();
            expect(result.analysis.densityAnalysis.combinedMetrics.densityCategory).toBeDefined();
            expect(result.analysis.densityAnalysis.combinedMetrics.naturalDifficulty).toBeDefined();

            console.log(`\n✓ Density analysis included`);
            console.log(`  Density category: ${result.analysis.densityAnalysis.combinedMetrics.densityCategory}`);
            console.log(`  Natural difficulty: ${result.analysis.densityAnalysis.combinedMetrics.naturalDifficulty}`);
        });
    });

    // ==================== Metadata Tests ====================

    describe('metadata', () => {
        it('should include complete metadata', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);
            const options: RhythmGenerationOptions = {
                difficulty: 'hard',
                outputMode: 'low',
                minimumTransientIntensity: 0.25,
                measureStartOffset: 0,
            };

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-metadata',
                options
            );

            const metadata = result.metadata;

            expect(metadata.difficulty).toBe('hard');
            expect(metadata.bandsAnalyzed).toEqual(['low', 'mid', 'high']);
            expect(metadata.duration).toBe(2.0);
            expect(metadata.naturalDifficulty).toBeDefined();
            expect(metadata.transientsDetected).toBeGreaterThanOrEqual(0);
            expect(metadata.phrasesDetected).toBeGreaterThanOrEqual(0);
            expect(metadata.totalBeats).toBeGreaterThanOrEqual(0);
            expect(metadata.generationConfig).toBeDefined();
            expect(metadata.generationConfig.difficulty).toBe('hard');
            expect(metadata.generationConfig.outputMode).toBe('low');
            expect(metadata.generationConfig.minimumTransientIntensity).toBe(0.25);

            console.log(`\n✓ Complete metadata included`);
            console.log(`  Difficulty: ${metadata.difficulty}`);
            console.log(`  Duration: ${metadata.duration}`);
            console.log(`  Natural difficulty: ${metadata.naturalDifficulty}`);
            console.log(`  Transients detected: ${metadata.transientsDetected}`);
            console.log(`  Phrases detected: ${metadata.phrasesDetected}`);
            console.log(`  Total beats: ${metadata.totalBeats}`);
        });
    });

    // ==================== Integration with Beat Map Generation ====================

    describe('beat map integration', () => {
        it('should use custom beat map options', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-beat-options',
                { difficulty: 'medium' },
                { minBpm: 60, maxBpm: 180, dpAlpha: 680 }
            );

            expect(result).toBeDefined();

            console.log(`\n✓ Custom beat map options work`);
        });

        it('should use custom downbeat config', async () => {
            const audioBuffer = createMockAudioBuffer(2.0);

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-downbeat',
                { difficulty: 'medium' },
                undefined,
                {
                    segments: [{
                        startBeat: 0,
                        downbeatBeatIndex: 0,
                        timeSignature: { beatsPerMeasure: 4 },
                    }],
                }
            );

            expect(result).toBeDefined();

            console.log(`\n✓ Custom downbeat config works`);
        });
    });

    // ==================== Real Audio Tests (Network) ====================

    describe.skipIf(!shouldRunNetworkTests)('real audio tests', () => {
        it('should generate rhythm from real audio URL', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;

            try {
                const result = await analyzer.generateRhythm(
                    audioUrl,
                    'arweave-test-track',
                    { difficulty: 'medium' }
                );

                expect(result).toBeDefined();
                expect(result.difficultyVariants).toBeDefined();
                expect(result.metadata.duration).toBeGreaterThan(0);

                console.log(`\n✓ Real audio rhythm generation completed`);
                console.log(`  Duration: ${result.metadata.duration.toFixed(2)}s`);
                console.log(`  Natural difficulty: ${result.metadata.naturalDifficulty}`);
                console.log(`  Easy beats: ${result.difficultyVariants.easy.beats.length}`);
                console.log(`  Medium beats: ${result.difficultyVariants.medium.beats.length}`);
                console.log(`  Hard beats: ${result.difficultyVariants.hard.beats.length}`);
            } catch (error) {
                // If AudioContext is not available, skip
                if ((error as Error).message.includes('AudioContext')) {
                    console.log('\n⚠ AudioContext not available, skipping real audio test');
                    return;
                }
                throw error;
            }
        }, TEST_CONFIG.networkTimeout);

        it('should fetch and decode audio using fetchAndDecodeAudio', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;

            try {
                const audioBuffer = await analyzer.fetchAndDecodeAudio(audioUrl);

                expect(audioBuffer).toBeDefined();
                expect(audioBuffer.duration).toBeGreaterThan(0);
                expect(audioBuffer.sampleRate).toBeGreaterThan(0);

                console.log(`\n✓ fetchAndDecodeAudio works with real audio`);
                console.log(`  Duration: ${audioBuffer.duration.toFixed(2)}s`);
                console.log(`  Sample rate: ${audioBuffer.sampleRate} Hz`);
                console.log(`  Channels: ${audioBuffer.numberOfChannels}`);
            } catch (error) {
                if ((error as Error).message.includes('AudioContext')) {
                    console.log('\n⚠ AudioContext not available, skipping fetch test');
                    return;
                }
                throw error;
            }
        }, TEST_CONFIG.networkTimeout);
    });

    // ==================== Error Handling Tests ====================

    describe('error handling', () => {
        it('should handle invalid audio URL gracefully', async () => {
            await expect(
                analyzer.generateRhythm(
                    'https://invalid-url-that-does-not-exist.com/audio.mp3',
                    'invalid-track'
                )
            ).rejects.toThrow();

            console.log(`\n✓ Invalid URL handled gracefully`);
        });

        it('should handle null/undefined buffer gracefully', async () => {
            await expect(
                analyzer.generateRhythmFromBuffer(null as any, 'null-track')
            ).rejects.toThrow();

            console.log(`\n✓ Null buffer handled gracefully`);
        });
    });

    // ==================== Performance Tests ====================

    describe('performance', () => {
        it('should generate rhythm within reasonable time', async () => {
            const audioBuffer = createMockAudioBuffer(5.0);

            const startTime = Date.now();

            const result = await analyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-performance'
            );

            const endTime = Date.now();
            const durationMs = endTime - startTime;

            expect(result).toBeDefined();
            // Should complete in less than 10 seconds for 5 second audio
            expect(durationMs).toBeLessThan(10000);

            console.log(`\n✓ Performance test passed`);
            console.log(`  Audio duration: 5.0s`);
            console.log(`  Generation time: ${durationMs}ms`);
            console.log(`  Ratio: ${(durationMs / 5000).toFixed(2)}x realtime`);
        });
    });

    // ==================== Reusability Tests ====================

    describe('reusability', () => {
        it('should allow reusing AudioAnalyzer for multiple generations', async () => {
            const audioBuffer1 = createMockAudioBuffer(2.0);
            const audioBuffer2 = createMockAudioBuffer(3.0);

            const result1 = await analyzer.generateRhythmFromBuffer(
                audioBuffer1,
                'test-track-reuse-1'
            );

            const result2 = await analyzer.generateRhythmFromBuffer(
                audioBuffer2,
                'test-track-reuse-2'
            );

            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            expect(result1.metadata.duration).toBe(2.0);
            expect(result2.metadata.duration).toBe(3.0);

            console.log(`\n✓ AudioAnalyzer can be reused`);
            console.log(`  First generation: ${result1.metadata.duration}s`);
            console.log(`  Second generation: ${result2.metadata.duration}s`);
        });
    });
});

// ============================================================================
// Static Method Tests
// ============================================================================

describe('AudioAnalyzer Static Methods for Rhythm', () => {
    it('should have fetchAndDecodeAudio available', () => {
        const testAnalyzer = new AudioAnalyzer();
        expect(typeof testAnalyzer.fetchAndDecodeAudio).toBe('function');

        console.log(`\n✓ fetchAndDecodeAudio method available`);
    });
});

// ============================================================================
// Convenience Method Signature Tests
// ============================================================================

describe('Convenience Method Signatures', () => {
    let analyzer: AudioAnalyzer;

    beforeAll(() => {
        analyzer = new AudioAnalyzer();
    });

    it('should have generateRhythm method with correct signature', () => {
        expect(typeof analyzer.generateRhythm).toBe('function');
        // Signature: (audioUrl, audioId, options?, beatMapOptions?, downbeatConfig?, onProgress?)
    });

    it('should have generateRhythmFromBuffer method with correct signature', () => {
        expect(typeof analyzer.generateRhythmFromBuffer).toBe('function');
        // Signature: (audioBuffer, audioId, options?, beatMapOptions?, downbeatConfig?, onProgress?)
    });

    it('should have fetchAndDecodeAudio method with correct signature', () => {
        expect(typeof analyzer.fetchAndDecodeAudio).toBe('function');
        // Signature: (audioUrl)
    });
});
