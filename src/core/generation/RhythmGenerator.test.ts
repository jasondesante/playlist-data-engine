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

    // ============================================================================
    // Variant Verification Tests (Phase 3.7)
    // ============================================================================

    describe('variant verification', () => {
        /**
         * Helper function to assert that a variant has valid structure
         */
        function assertValidVariantStructure(
            variant: { difficulty: string; beats: unknown[]; isUnedited: boolean; editType: string; editAmount: number },
            expectedDifficulty: 'easy' | 'medium' | 'hard'
        ): void {
            expect(variant).toBeDefined();
            expect(variant.difficulty).toBe(expectedDifficulty);
            expect(Array.isArray(variant.beats)).toBe(true);
            expect(typeof variant.isUnedited).toBe('boolean');
            expect(['none', 'simplified', 'interpolated', 'pattern_inserted']).toContain(variant.editType);
            expect(typeof variant.editAmount).toBe('number');
            expect(variant.editAmount).toBeGreaterThanOrEqual(0);
            expect(variant.editAmount).toBeLessThanOrEqual(1);
        }

        it('should verify all 3 difficulty variants are valid', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);

            // Verify all 3 variants have valid structure
            assertValidVariantStructure(result.difficultyVariants.easy, 'easy');
            assertValidVariantStructure(result.difficultyVariants.medium, 'medium');
            assertValidVariantStructure(result.difficultyVariants.hard, 'hard');

            // Verify each beat in each variant has required properties
            const validBands = ['low', 'mid', 'high'];
            const validGridTypes = ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'];

            for (const [difficulty, variant] of Object.entries(result.difficultyVariants)) {
                for (const beat of variant.beats) {
                    expect(beat).toHaveProperty('timestamp');
                    expect(beat).toHaveProperty('beatIndex');
                    expect(beat).toHaveProperty('gridPosition');
                    expect(beat).toHaveProperty('gridType');
                    expect(beat).toHaveProperty('intensity');
                    expect(beat).toHaveProperty('band');
                    expect(beat).toHaveProperty('sourceBand');
                    expect(typeof beat.timestamp).toBe('number');
                    expect(typeof beat.beatIndex).toBe('number');
                    expect(typeof beat.gridPosition).toBe('number');
                    expect(typeof beat.intensity).toBe('number');
                    expect(validGridTypes).toContain(beat.gridType);
                    expect(validBands).toContain(beat.band);
                    expect(validBands).toContain(beat.sourceBand);
                }
            }
        });

        it('should verify isUnedited flag is correct for natural difficulty variant', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);
            const naturalDifficulty = result.composite.naturalDifficulty;
            const variants = result.difficultyVariants;

            // The variant matching the natural difficulty should have isUnedited = true
            // Other variants should have isUnedited = false
            expect(variants.easy.isUnedited).toBe(naturalDifficulty === 'easy');
            expect(variants.medium.isUnedited).toBe(naturalDifficulty === 'medium');
            expect(variants.hard.isUnedited).toBe(naturalDifficulty === 'hard');

            // Verify that exactly one variant is unedited
            const uneditedCount = [variants.easy, variants.medium, variants.hard]
                .filter(v => v.isUnedited).length;
            expect(uneditedCount).toBe(1);

            // The unedited variant should have editType = 'none' and editAmount = 0
            const uneditedVariant = [variants.easy, variants.medium, variants.hard]
                .find(v => v.isUnedited);
            expect(uneditedVariant).toBeDefined();
            expect(uneditedVariant!.editType).toBe('none');
            expect(uneditedVariant!.editAmount).toBe(0);
        });

        it('should verify composite sections reference correct source bands', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);
            const composite = result.composite;

            // Verify sections array exists
            expect(Array.isArray(composite.sections)).toBe(true);

            // If there are sections, verify each has correct properties
            const validBands = ['low', 'mid', 'high'];

            for (const section of composite.sections) {
                // Each section must have beatRange
                expect(section).toHaveProperty('beatRange');
                expect(section.beatRange).toHaveProperty('start');
                expect(section.beatRange).toHaveProperty('end');
                expect(typeof section.beatRange.start).toBe('number');
                expect(typeof section.beatRange.end).toBe('number');
                expect(section.beatRange.start).toBeLessThanOrEqual(section.beatRange.end);

                // Each section must have valid sourceBand
                expect(section).toHaveProperty('sourceBand');
                expect(validBands).toContain(section.sourceBand);

                // Each section must have score and margin
                expect(section).toHaveProperty('score');
                expect(section).toHaveProperty('margin');
                expect(typeof section.score).toBe('number');
                expect(typeof section.margin).toBe('number');
                expect(section.score).toBeGreaterThanOrEqual(0);
                expect(section.margin).toBeGreaterThanOrEqual(0);
            }

            // Verify all composite beats have valid sourceBand
            for (const beat of composite.beats) {
                expect(beat).toHaveProperty('sourceBand');
                expect(validBands).toContain(beat.sourceBand);
            }

            // Verify metadata
            expect(composite.metadata).toBeDefined();
            expect(composite.metadata.totalBeats).toBe(composite.beats.length);
            expect(composite.metadata.sectionCount).toBe(composite.sections.length);
        });

        it('should verify Easy variant contains only allowed grid types', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);
            const easyVariant = result.difficultyVariants.easy;

            // Easy difficulty only allows: straight_8th, quarter_triplet
            // It must NOT contain: straight_16th, triplet_8th
            const allowedGridTypes = ['straight_8th', 'quarter_triplet'];
            const disallowedGridTypes = ['straight_16th', 'triplet_8th'];

            // Verify all beats in easy variant have allowed grid types
            for (const beat of easyVariant.beats) {
                expect(allowedGridTypes).toContain(beat.gridType);
                expect(disallowedGridTypes).not.toContain(beat.gridType);
            }

            // Additional verification: if there are beats, they should all be valid
            if (easyVariant.beats.length > 0) {
                const allGridTypesValid = easyVariant.beats.every(
                    beat => allowedGridTypes.includes(beat.gridType)
                );
                expect(allGridTypesValid).toBe(true);
            }
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

    // ============================================================================
    // Serialization Tests (Phase 4.2)
    // ============================================================================

    describe('Serialization', () => {
        it('should serialize GeneratedRhythm to JSON', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const result = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(result);

            expect(typeof jsonString).toBe('string');
            expect(jsonString.length).toBeGreaterThan(0);

            // Verify it's valid JSON
            const parsed = JSON.parse(jsonString);
            expect(parsed).toHaveProperty('difficultyVariants');
            expect(parsed).toHaveProperty('bandStreams');
            expect(parsed).toHaveProperty('composite');
            expect(parsed).toHaveProperty('analysis');
            expect(parsed).toHaveProperty('metadata');
        });

        it('should deserialize JSON to GeneratedRhythm', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            expect(deserialized).toBeDefined();
            expect(deserialized.difficultyVariants).toBeDefined();
            expect(deserialized.bandStreams).toBeDefined();
            expect(deserialized.composite).toBeDefined();
            expect(deserialized.analysis).toBeDefined();
            expect(deserialized.metadata).toBeDefined();
        });

        it('should preserve all difficulty variants through round-trip', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Verify all variants are preserved
            expect(deserialized.difficultyVariants.easy.difficulty).toBe('easy');
            expect(deserialized.difficultyVariants.medium.difficulty).toBe('medium');
            expect(deserialized.difficultyVariants.hard.difficulty).toBe('hard');

            // Verify beat counts match
            expect(deserialized.difficultyVariants.easy.beats.length).toBe(original.difficultyVariants.easy.beats.length);
            expect(deserialized.difficultyVariants.medium.beats.length).toBe(original.difficultyVariants.medium.beats.length);
            expect(deserialized.difficultyVariants.hard.beats.length).toBe(original.difficultyVariants.hard.beats.length);
        });

        it('should preserve band streams through round-trip', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Verify all band streams are preserved
            expect(deserialized.bandStreams.low.beats.length).toBe(original.bandStreams.low.beats.length);
            expect(deserialized.bandStreams.mid.beats.length).toBe(original.bandStreams.mid.beats.length);
            expect(deserialized.bandStreams.high.beats.length).toBe(original.bandStreams.high.beats.length);
        });

        it('should preserve metadata through round-trip', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Verify metadata is preserved
            expect(deserialized.metadata.difficulty).toBe(original.metadata.difficulty);
            expect(deserialized.metadata.bandsAnalyzed).toEqual(original.metadata.bandsAnalyzed);
            expect(deserialized.metadata.transientsDetected).toBe(original.metadata.transientsDetected);
            expect(deserialized.metadata.phrasesDetected).toBe(original.metadata.phrasesDetected);
            expect(deserialized.metadata.naturalDifficulty).toBe(original.metadata.naturalDifficulty);
            expect(deserialized.metadata.duration).toBe(original.metadata.duration);
            expect(deserialized.metadata.totalBeats).toBe(original.metadata.totalBeats);
        });

        it('should preserve beat data integrity through round-trip', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Compare first beat of each variant
            const variants = ['easy', 'medium', 'hard'] as const;
            for (const variant of variants) {
                const originalBeats = original.difficultyVariants[variant].beats;
                const deserializedBeats = deserialized.difficultyVariants[variant].beats;

                if (originalBeats.length > 0) {
                    expect(deserializedBeats[0].timestamp).toBeCloseTo(originalBeats[0].timestamp, 0e-10);
                    expect(deserializedBeats[0].beatIndex).toBe(originalBeats[0].beatIndex);
                    expect(deserializedBeats[0].gridPosition).toBe(originalBeats[0].gridPosition);
                    expect(deserializedBeats[0].intensity).toBeCloseTo(originalBeats[0].intensity, 1e-10);
                }
            }
        });

        it('should preserve phrase analysis through round-trip', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Verify phrase analysis is preserved
            expect(deserialized.analysis.phraseAnalysis.phrases.length).toBe(original.analysis.phraseAnalysis.phrases.length);
            expect(deserialized.analysis.phraseAnalysis.patternLibrary.length).toBe(original.analysis.phraseAnalysis.patternLibrary.length);
        });

        it('should preserve density analysis through round-trip', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Verify density analysis is preserved
            expect(deserialized.analysis.densityAnalysis.combinedMetrics.transientsPerBeat).toBeCloseTo(
                original.analysis.densityAnalysis.combinedMetrics.transientsPerBeat, 1e-10
            );
            expect(deserialized.analysis.densityAnalysis.combinedMetrics.densityCategory).toBe(
                original.analysis.densityAnalysis.combinedMetrics.densityCategory
            );
        });

        it('should handle empty beats arrays', async () => {
            generator = new RhythmGenerator();
            const audioBuffer = createMockAudioBuffer(0.1); // Very short audio
            const unifiedBeatMap = createMockUnifiedBeatMap(0.1);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const jsonString = RhythmGenerator.toJSON(original);
            const deserialized = RhythmGenerator.fromJSON(jsonString);

            // Should not throw and should have valid structure
            expect(deserialized).toBeDefined();
            expect(deserialized.difficultyVariants).toBeDefined();
        });
    });

});
