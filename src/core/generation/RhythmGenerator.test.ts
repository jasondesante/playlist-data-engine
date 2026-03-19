import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    RhythmGenerator,
    RHYTHM_PRESETS,
    getRhythmPreset,
    getRhythmPresetNames,
    type RhythmGenerationOptions,
} from './RhythmGenerator.js';
import type { UnifiedBeatMap, Beat } from '../types/BeatMap.js';

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
            detectedTempo: bpm,
            tempoConfidence: 0.9,
            trackDuration: duration,
            analysisDate: new Date().toISOString(),
            algorithmVersion: '1.0.0',
        },
    };
}

// ============================================================================
// RhythmGenerator Tests
// ============================================================================

describe('RhythmGenerator', () => {
    let generator: RhythmGenerator;

    describe('constructor', () => {
        it('should create a generator with default options', () => {
            generator = new RhythmGenerator();
            const options = generator.getOptions();

            expect(options.difficulty).toBe('medium');
            expect(options.outputMode).toBe('composite');
            expect(options.measureStartOffset).toBe(0);
            expect(options.minimumTransientIntensity).toBe(0.0);
            expect(options.verbose).toBe(false);
            expect(options.seed).toBeUndefined();
        });

        it('should accept custom options', () => {
            const options: RhythmGenerationOptions = {
                difficulty: 'hard',
                outputMode: 'low',
                measureStartOffset: 2,
                minimumTransientIntensity: 0.3,
                verbose: true,
                seed: 'test-seed',
            };

            generator = new RhythmGenerator(options);
            const actualOptions = generator.getOptions();

            expect(actualOptions.difficulty).toBe('hard');
            expect(actualOptions.outputMode).toBe('low');
            expect(actualOptions.measureStartOffset).toBe(2);
            expect(actualOptions.minimumTransientIntensity).toBe(0.3);
            expect(actualOptions.verbose).toBe(true);
            expect(actualOptions.seed).toBe('test-seed');
        });
    });

    describe('pipeline steps', () => {
        beforeEach(() => {
            generator = new RhythmGenerator();
        });

        describe('analyzeMultiBand', () => {
            it('should analyze audio into frequency bands', () => {
                const audioBuffer = createMockAudioBuffer();
                const result = generator.analyzeMultiBand(audioBuffer);

                expect(result.bands).toBeDefined();
                expect(result.bands.size).toBe(3); // low, mid, high
                expect(result.bands.has('low')).toBe(true);
                expect(result.bands.has('mid')).toBe(true);
                expect(result.bands.has('high')).toBe(true);
                expect(result.metadata.duration).toBe(audioBuffer.duration);
            });

            it('should return dominant bands sorted by energy', () => {
                const audioBuffer = createMockAudioBuffer();
                const result = generator.analyzeMultiBand(audioBuffer);

                expect(result.dominantBands).toBeDefined();
                expect(result.dominantBands.length).toBe(3);
            });
        });

        describe('detectTransients', () => {
            it('should detect transients in multi-band analysis', () => {
                const audioBuffer = createMockAudioBuffer();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const result = generator.detectTransients(multiBandResult);

                expect(result.transients).toBeDefined();
                expect(result.bandTransients).toBeDefined();
                expect(result.bandTransients.has('low')).toBe(true);
                expect(result.bandTransients.has('mid')).toBe(true);
                expect(result.bandTransients.has('high')).toBe(true);
                expect(result.metadata.totalTransients).toBeGreaterThanOrEqual(0);
            });
        });

        describe('quantizeTransients', () => {
            it('should quantize transients to beat grid', () => {
                const audioBuffer = createMockAudioBuffer();
                const unifiedBeatMap = createMockUnifiedBeatMap();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const transientAnalysis = generator.detectTransients(multiBandResult);
                const result = generator.quantizeTransients(transientAnalysis, unifiedBeatMap);

                expect(result.streams).toBeDefined();
                expect(result.streams.low).toBeDefined();
                expect(result.streams.mid).toBeDefined();
                expect(result.streams.high).toBeDefined();
                expect(result.metadata.densityValidation).toBeDefined();
            });
        });

        describe('analyzePhrases', () => {
            it('should analyze phrases in quantized streams', () => {
                const audioBuffer = createMockAudioBuffer();
                const unifiedBeatMap = createMockUnifiedBeatMap();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const transientAnalysis = generator.detectTransients(multiBandResult);
                const quantizationResult = generator.quantizeTransients(transientAnalysis, unifiedBeatMap);
                const result = generator.analyzePhrases(quantizationResult.streams);

                expect(result.phrases).toBeDefined();
                expect(result.phrasesByBand).toBeDefined();
                expect(result.patternLibrary).toBeDefined();
            });
        });

        describe('analyzeDensity', () => {
            it('should analyze density of quantized streams', () => {
                const audioBuffer = createMockAudioBuffer();
                const unifiedBeatMap = createMockUnifiedBeatMap();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const transientAnalysis = generator.detectTransients(multiBandResult);
                const quantizationResult = generator.quantizeTransients(transientAnalysis, unifiedBeatMap);
                const result = generator.analyzeDensity(quantizationResult);

                expect(result.bandMetrics).toBeDefined();
                expect(result.combinedMetrics).toBeDefined();
                expect(result.combinedMetrics.densityCategory).toBeDefined();
                expect(result.combinedMetrics.naturalDifficulty).toBeDefined();
            });
        });

        describe('scoreStreams', () => {
            it('should score band streams for rhythmic interest', () => {
                const audioBuffer = createMockAudioBuffer();
                const unifiedBeatMap = createMockUnifiedBeatMap();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const transientAnalysis = generator.detectTransients(multiBandResult);
                const quantizationResult = generator.quantizeTransients(transientAnalysis, unifiedBeatMap);
                const phraseAnalysis = generator.analyzePhrases(quantizationResult.streams);
                const densityAnalysis = generator.analyzeDensity(quantizationResult);
                const result = generator.scoreStreams(quantizationResult, phraseAnalysis, densityAnalysis);

                expect(result.sectionScores).toBeDefined();
                expect(result.sectionWinners).toBeDefined();
                expect(result.bandTotals).toBeDefined();
                expect(result.bandAverages).toBeDefined();
            });
        });

        describe('generateComposite', () => {
            it('should generate composite stream from winning sections', () => {
                const audioBuffer = createMockAudioBuffer();
                const unifiedBeatMap = createMockUnifiedBeatMap();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const transientAnalysis = generator.detectTransients(multiBandResult);
                const quantizationResult = generator.quantizeTransients(transientAnalysis, unifiedBeatMap);
                const phraseAnalysis = generator.analyzePhrases(quantizationResult.streams);
                const densityAnalysis = generator.analyzeDensity(quantizationResult);
                const scoringResult = generator.scoreStreams(quantizationResult, phraseAnalysis, densityAnalysis);
                const result = generator.generateComposite(quantizationResult, scoringResult, densityAnalysis);

                expect(result.beats).toBeDefined();
                expect(result.sections).toBeDefined();
                expect(result.naturalDifficulty).toBeDefined();
                expect(result.metadata).toBeDefined();
            });
        });

        describe('generateDifficultyVariants', () => {
            it('should generate easy/medium/hard variants', () => {
                const audioBuffer = createMockAudioBuffer();
                const unifiedBeatMap = createMockUnifiedBeatMap();
                const multiBandResult = generator.analyzeMultiBand(audioBuffer);
                const transientAnalysis = generator.detectTransients(multiBandResult);
                const quantizationResult = generator.quantizeTransients(transientAnalysis, unifiedBeatMap);
                const phraseAnalysis = generator.analyzePhrases(quantizationResult.streams);
                const densityAnalysis = generator.analyzeDensity(quantizationResult);
                const scoringResult = generator.scoreStreams(quantizationResult, phraseAnalysis, densityAnalysis);
                const composite = generator.generateComposite(quantizationResult, scoringResult, densityAnalysis);
                const result = generator.generateDifficultyVariants(composite, phraseAnalysis, quantizationResult);

                expect(result.easy).toBeDefined();
                expect(result.medium).toBeDefined();
                expect(result.hard).toBeDefined();
                expect(result.easy.difficulty).toBe('easy');
                expect(result.medium.difficulty).toBe('medium');
                expect(result.hard.difficulty).toBe('hard');
            });
        });
    });

    describe('generate', () => {
        it('should generate complete rhythm result', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);

            // Check structure
            expect(result.difficultyVariants).toBeDefined();
            expect(result.difficultyVariants.easy).toBeDefined();
            expect(result.difficultyVariants.medium).toBeDefined();
            expect(result.difficultyVariants.hard).toBeDefined();

            expect(result.bandStreams).toBeDefined();
            expect(result.bandStreams.low).toBeDefined();
            expect(result.bandStreams.mid).toBeDefined();
            expect(result.bandStreams.high).toBeDefined();

            expect(result.composite).toBeDefined();
            expect(result.analysis).toBeDefined();
            expect(result.metadata).toBeDefined();
        });

        it('should call progress callback during generation', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            const progressCalls: Array<{ phase: string; progress: number; message: string }> = [];
            const onProgress = (phase: string, progress: number, message: string) => {
                progressCalls.push({ phase, progress, message });
            };

            await generator.generate(audioBuffer, unifiedBeatMap, undefined, onProgress);

            // Should have progress calls for all 3 phases
            expect(progressCalls.length).toBeGreaterThan(0);

            const phase1Calls = progressCalls.filter(c => c.phase === 'Phase 1');
            const phase2Calls = progressCalls.filter(c => c.phase === 'Phase 2');
            const phase3Calls = progressCalls.filter(c => c.phase === 'Phase 3');

            expect(phase1Calls.length).toBeGreaterThan(0);
            expect(phase2Calls.length).toBeGreaterThan(0);
            expect(phase3Calls.length).toBeGreaterThan(0);
        });

        it('should log progress when verbose is enabled', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            generator = new RhythmGenerator({ verbose: true });
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            await generator.generate(audioBuffer, unifiedBeatMap);

            // Should have logged progress messages
            expect(consoleSpy).toHaveBeenCalled();
            const logCalls = consoleSpy.mock.calls;
            const hasRhythmGeneratorLogs = logCalls.some(call =>
                call[0]?.includes?.('[RhythmGenerator]')
            );
            expect(hasRhythmGeneratorLogs).toBe(true);

            consoleSpy.mockRestore();
        });

        it('should include correct metadata', async () => {
            generator = new RhythmGenerator({
                difficulty: 'hard',
                minimumTransientIntensity: 0.2,
            });
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);
            const metadata = result.metadata;

            expect(metadata.difficulty).toBe('hard');
            expect(metadata.bandsAnalyzed).toEqual(['low', 'mid', 'high']);
            expect(metadata.duration).toBe(audioBuffer.duration);
            expect(metadata.generationConfig.minimumTransientIntensity).toBe(0.2);
            expect(metadata.naturalDifficulty).toBeDefined();
        });
    });

    describe('static methods', () => {
        describe('quickGenerate', () => {
            it('should generate with default options', async () => {
                const audioBuffer = createMockAudioBuffer(1.0);
                const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

                const result = await RhythmGenerator.quickGenerate(audioBuffer, unifiedBeatMap);

                expect(result).toBeDefined();
                expect(result.difficultyVariants).toBeDefined();
                expect(result.metadata.generationConfig.difficulty).toBe('medium');
            });
        });

        describe('generateForDifficulty', () => {
            it('should generate variant for specific difficulty', async () => {
                const audioBuffer = createMockAudioBuffer(1.0);
                const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

                const easyVariant = await RhythmGenerator.generateForDifficulty(
                    audioBuffer,
                    unifiedBeatMap,
                    'easy'
                );

                expect(easyVariant).toBeDefined();
                expect(easyVariant.difficulty).toBe('easy');
            });

            it('should generate hard variant', async () => {
                const audioBuffer = createMockAudioBuffer(1.0);
                const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

                const hardVariant = await RhythmGenerator.generateForDifficulty(
                    audioBuffer,
                    unifiedBeatMap,
                    'hard'
                );

                expect(hardVariant).toBeDefined();
                expect(hardVariant.difficulty).toBe('hard');
            });
        });
    });

    describe('edge cases', () => {
        it('should handle audio with no transients gracefully', async () => {
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

            generator = new RhythmGenerator();
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);

            // Should still return a valid result
            expect(result).toBeDefined();
            expect(result.difficultyVariants).toBeDefined();
            expect(result.bandStreams.low.beats.length).toBe(0);
            expect(result.bandStreams.mid.beats.length).toBe(0);
            expect(result.bandStreams.high.beats.length).toBe(0);
        });

        it('should handle very short audio', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(0.5);
            const unifiedBeatMap = createMockUnifiedBeatMap(0.5);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);

            expect(result).toBeDefined();
            expect(result.metadata.duration).toBe(0.5);
        });
    });

    describe('caching', () => {
        it('should cache results and return cached result on second call', async () => {
            generator = new RhythmGenerator({ enableCache: true });
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            // First call - should compute
            const result1 = await generator.generate(audioBuffer, unifiedBeatMap);

            // Check cache stats
            const statsAfterFirst = generator.getCacheStats();
            expect(statsAfterFirst.entryCount).toBe(1);
            expect(statsAfterFirst.hits).toBe(0);
            expect(statsAfterFirst.misses).toBe(1);

            // Second call - should return cached result
            const result2 = await generator.generate(audioBuffer, unifiedBeatMap);

            // Verify cache hit
            const statsAfterSecond = generator.getCacheStats();
            expect(statsAfterSecond.hits).toBe(1);
            expect(statsAfterSecond.misses).toBe(1);

            // Results should be equivalent
            expect(result2.metadata.transientsDetected).toBe(result1.metadata.transientsDetected);
            expect(result2.metadata.phrasesDetected).toBe(result1.metadata.phrasesDetected);
        });

        it('should not cache when caching is disabled', async () => {
            generator = new RhythmGenerator({ enableCache: false });
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            await generator.generate(audioBuffer, unifiedBeatMap);

            const stats = generator.getCacheStats();
            expect(stats.entryCount).toBe(0);
        });

        it('should clear cache', async () => {
            generator = new RhythmGenerator({ enableCache: true });
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            await generator.generate(audioBuffer, unifiedBeatMap);

            expect(generator.getCacheStats().entryCount).toBe(1);

            generator.clearCache();

            expect(generator.getCacheStats().entryCount).toBe(0);
        });

        it('should use different cache entries for different audio IDs', async () => {
            generator = new RhythmGenerator({ enableCache: true });
            const audioBuffer = createMockAudioBuffer(1.0);

            // First audio
            const beatMap1 = createMockUnifiedBeatMap(1.0, 120, 'audio-1');
            await generator.generate(audioBuffer, beatMap1);

            // Second audio - different ID
            const beatMap2 = createMockUnifiedBeatMap(1.0, 120, 'audio-2');
            await generator.generate(audioBuffer, beatMap2);

            // Should have 2 cache entries, no hits (both misses)
            const stats = generator.getCacheStats();
            expect(stats.entryCount).toBe(2);
            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(2);
        });

        it('should invalidate cache when config changes', async () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            // First generator with one config
            generator = new RhythmGenerator({ enableCache: true, minimumTransientIntensity: 0.0 });
            await generator.generate(audioBuffer, unifiedBeatMap);

            expect(generator.getCacheStats().entryCount).toBe(1);

            // Same generator with different config should create new cache entry
            generator = new RhythmGenerator({ enableCache: true, minimumTransientIntensity: 0.5 });
            await generator.generate(audioBuffer, unifiedBeatMap);

            expect(generator.getCacheStats().entryCount).toBe(1);
            expect(generator.getCacheStats().misses).toBe(1);
        });

        it('should check if phase is cached', async () => {
            generator = new RhythmGenerator({ enableCache: true });
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0, 120, 'test-audio');

            expect(generator.isCached('test-audio', 'variants')).toBe(false);

            await generator.generate(audioBuffer, unifiedBeatMap);

            expect(generator.isCached('test-audio', 'variants')).toBe(true);
        });
    });

    describe('cancellation', () => {
        it('should support cancellation via AbortSignal', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            const controller = new AbortController();
            controller.abort(); // Abort immediately

            await expect(
                generator.generate(audioBuffer, unifiedBeatMap, controller.signal)
            ).rejects.toThrow('aborted');
        });

        it('should not throw if signal is not aborted', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(1.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(1.0);

            const controller = new AbortController();
            // Don't abort

            const result = await generator.generate(audioBuffer, unifiedBeatMap, controller.signal);
            expect(result).toBeDefined();
        });

    });

    // ============================================================================
    // Preset Tests
    // ============================================================================

    describe('presets', () => {
        describe('RHYTHM_PRESETS', () => {
            it('should have all expected preset names', () => {
                expect(RHYTHM_PRESETS).toHaveProperty('casual');
                expect(RHYTHM_PRESETS).toHaveProperty('standard');
                expect(RHYTHM_PRESETS).toHaveProperty('challenge');
                expect(RHYTHM_PRESETS).toHaveProperty('bass');
            });

            it('should have correct casual preset configuration', () => {
                expect(RHYTHM_PRESETS.casual).toEqual({
                    difficulty: 'easy',
                    outputMode: 'composite',
                    description: 'Easy difficulty for relaxed gameplay',
                });
            });

            it('should have correct standard preset configuration', () => {
                expect(RHYTHM_PRESETS.standard).toEqual({
                    difficulty: 'medium',
                    outputMode: 'composite',
                    description: 'Balanced experience for most players',
                });
            });

            it('should have correct challenge preset configuration', () => {
                expect(RHYTHM_PRESETS.challenge).toEqual({
                    difficulty: 'hard',
                    outputMode: 'composite',
                    description: 'Hard difficulty for skilled players',
                });
            });

            it('should have correct bass preset configuration', () => {
                expect(RHYTHM_PRESETS.bass).toEqual({
                    difficulty: 'medium',
                    outputMode: 'low',
                    description: 'Focus on bass/low-frequency rhythms',
                });
            });

            it('should have all presets with required properties', () => {
                const presets = Object.values(RHYTHM_PRESETS);
                for (const preset of presets) {
                    expect(preset).toHaveProperty('difficulty');
                    expect(preset).toHaveProperty('outputMode');
                    expect(['easy', 'medium', 'hard']).toContain(preset.difficulty);
                    expect(['composite', 'low', 'mid', 'high']).toContain(preset.outputMode);
                }
            });
        });

        describe('getRhythmPreset', () => {
            it('should return casual preset by name', () => {
                const preset = getRhythmPreset('casual');
                expect(preset).toBeDefined();
                expect(preset?.difficulty).toBe('easy');
                expect(preset?.outputMode).toBe('composite');
            });

            it('should return standard preset by name', () => {
                const preset = getRhythmPreset('standard');
                expect(preset).toBeDefined();
                expect(preset?.difficulty).toBe('medium');
                expect(preset?.outputMode).toBe('composite');
            });

            it('should return challenge preset by name', () => {
                const preset = getRhythmPreset('challenge');
                expect(preset).toBeDefined();
                expect(preset?.difficulty).toBe('hard');
                expect(preset?.outputMode).toBe('composite');
            });

            it('should return bass preset by name', () => {
                const preset = getRhythmPreset('bass');
                expect(preset).toBeDefined();
                expect(preset?.difficulty).toBe('medium');
                expect(preset?.outputMode).toBe('low');
            });
        });

        describe('getRhythmPresetNames', () => {
            it('should return all preset names', () => {
                const names = getRhythmPresetNames();
                expect(names).toContain('casual');
                expect(names).toContain('standard');
                expect(names).toContain('challenge');
                expect(names).toContain('bass');
                expect(names.length).toBe(4);
            });

            it('should return names in consistent order', () => {
                const names1 = getRhythmPresetNames();
                const names2 = getRhythmPresetNames();
                expect(names1).toEqual(names2);
            });
        });

        describe('using presets with RhythmGenerator', () => {
            it('should create generator with casual preset options', () => {
                const preset = getRhythmPreset('casual');
                expect(preset).toBeDefined();

                generator = new RhythmGenerator({
                    difficulty: preset!.difficulty,
                    outputMode: preset!.outputMode,
                });

                const options = generator.getOptions();
                expect(options.difficulty).toBe('easy');
                expect(options.outputMode).toBe('composite');
            });

            it('should create generator with bass preset options', () => {
                const preset = getRhythmPreset('bass');
                expect(preset).toBeDefined();

                generator = new RhythmGenerator({
                    difficulty: preset!.difficulty,
                    outputMode: preset!.outputMode,
                });

                const options = generator.getOptions();
                expect(options.difficulty).toBe('medium');
                expect(options.outputMode).toBe('low');
            });
        });
    });

});
