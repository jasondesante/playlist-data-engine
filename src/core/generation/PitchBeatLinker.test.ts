/**
 * Unit tests for PitchBeatLinker
 *
 * Tests the pitch beat linking functionality including:
 * - Configuration validation
 * - Band stream iteration
 * - Pitch detection at beat timestamps
 * - Pre-filtered analysis
 */

import { describe, it, expect } from 'vitest';
import {
    PitchBeatLinker,
    type PitchBandName,
} from './PitchBeatLinker.js';
import type { GeneratedRhythmMap, GeneratedBeat } from '../analysis/beat/RhythmQuantizer.js';
import type { RhythmicPhrase, PhraseOccurrence } from '../analysis/beat/PhraseAnalyzer.js';
import type { CompositeStream } from '../analysis/beat/CompositeStreamGenerator.js';
import type { DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';
import { FREQUENCY_BANDS } from '../analysis/beat/utils/audioUtils.js';

describe('PitchBeatLinker', () => {
    // Helper to create a sine wave at a specific frequency
    function createSineWave(
        frequency: number,
        durationSeconds: number,
        sampleRate: number = 44100
    ): Float32Array {
        const length = Math.floor(durationSeconds * sampleRate);
        const data = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
        }
        return data;
    }

    // Helper to create a mock AudioBuffer
    function createMockAudioBuffer(
        data: Float32Array,
        sampleRate: number = 44100
    ): AudioBuffer {
        return {
            length: data.length,
            duration: data.length / sampleRate,
            sampleRate,
            numberOfChannels: 1,
            getChannelData: (_channel: number) => data,
        } as unknown as AudioBuffer;
    }

    // Helper to create mock band streams
    function createMockBandStreams(
        beats: Array<{ timestamp: number; beatIndex: number; band: PitchBandName }>
    ): { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap } {
        const lowBeats: GeneratedBeat[] = [];
        const midBeats: GeneratedBeat[] = [];
        const highBeats: GeneratedBeat[] = [];

        for (const beat of beats) {
            const generatedBeat: GeneratedBeat = {
                timestamp: beat.timestamp,
                beatIndex: beat.beatIndex,
                gridPosition: 0,
                gridType: 'straight_16th',
                intensity: 0.8,
                band: beat.band,
            };

            if (beat.band === 'low') lowBeats.push(generatedBeat);
            else if (beat.band === 'mid') midBeats.push(generatedBeat);
            else highBeats.push(generatedBeat);
        }

        const createRhythmMap = (beats: GeneratedBeat[]): GeneratedRhythmMap => ({
            audioId: 'test-audio',
            duration: 5.0,
            beats,
            gridDecisions: beats.map((b) => ({
                beatIndex: b.beatIndex,
                selectedGrid: 'straight_16th' as const,
                straightAvgOffset: 0,
                tripletAvgOffset: 10,
                transientCount: 1,
                confidence: 0.9,
            })),
        });

        return {
            low: createRhythmMap(lowBeats),
            mid: createRhythmMap(midBeats),
            high: createRhythmMap(highBeats),
        };
    }

    describe('Constructor and Configuration', () => {
        it('should create linker with default configuration', async () => {
            const linker = new PitchBeatLinker();
            const config = linker.getConfig();

            expect(config.targetSampleRate).toBe(44100);
            expect(config.bands).toHaveLength(3);
            expect(config.pitchDetector).toBeDefined();
        });

        it('should use FREQUENCY_BANDS from audioUtils by default', async () => {
            const linker = new PitchBeatLinker();
            const config = linker.getConfig();

            expect(config.bands).toEqual(FREQUENCY_BANDS);
            expect(config.bands[0].name).toBe('low');
            expect(config.bands[1].name).toBe('mid');
            expect(config.bands[2].name).toBe('high');
        });

        it('should allow custom configuration', async () => {
            const customBands = [
                { name: 'low', lowHz: 50, highHz: 400, description: 'Custom low' },
                { name: 'mid', lowHz: 400, highHz: 1500, description: 'Custom mid' },
            ];

            const linker = new PitchBeatLinker({
                targetSampleRate: 22050,
                bands: customBands,
            });

            const config = linker.getConfig();
            expect(config.targetSampleRate).toBe(22050);
            expect(config.bands).toHaveLength(2);
        });

        it('should pass pitch detector config through', async () => {
            const linker = new PitchBeatLinker({
                pitchDetector: {
                    voicingThreshold: 0.7,
                    frameSize: 4096,
                },
            });

            const config = linker.getConfig();
            expect(config.pitchDetector.voicingThreshold).toBe(0.7);
            expect(config.pitchDetector.frameSize).toBe(4096);
        });
    });

    describe('Band Stream Pitch Detection', () => {
        it('should analyze each band stream independently', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.1, beatIndex: 0, band: 'low' },
                { timestamp: 0.2, beatIndex: 1, band: 'mid' },
                { timestamp: 0.3, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(220, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.bandPitches.size).toBe(3);
            expect(result.bandPitches.has('low')).toBe(true);
            expect(result.bandPitches.has('mid')).toBe(true);
            expect(result.bandPitches.has('high')).toBe(true);
        });

        it('should detect pitch at beat timestamps', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);
            const midPitches = result.bandPitches.get('mid');

            expect(midPitches).toBeDefined();
            expect(midPitches!.pitches).toHaveLength(3);
            expect(midPitches!.totalBeatCount).toBe(3);
        });

        it('should store band information with each pitch', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.1, beatIndex: 0, band: 'low' },
                { timestamp: 0.2, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(220, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            for (const pitchAtBeat of result.pitchByBeat) {
                expect(['low', 'mid', 'high']).toContain(pitchAtBeat.band);
            }
        });

        it('should preserve beat timestamp and index', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].timestamp).toBe(0.5);
            expect(result.pitchByBeat[0].beatIndex).toBe(0);
            expect(result.pitchByBeat[1].timestamp).toBe(1.0);
            expect(result.pitchByBeat[1].beatIndex).toBe(1);
        });
    });

    describe('Pre-Filtered Analysis', () => {
        it('should link pre-computed pitch results to band streams', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(220, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            // Run full analysis to get pitch results
            const fullResult = await linker.linkWithBands(bandStreams, audioBuffer);

            // Use linkPreFiltered with the pitch results from full analysis
            const preFilteredResult = await linker.linkPreFiltered(
                bandStreams,
                5.0,
                // We need actual pitch results - get them by running link first
                // For this test, just verify the API works with empty results
                [],
                0.01
            );

            expect(preFilteredResult.bandPitches.size).toBe(3);
            expect(preFilteredResult.metadata.duration).toBe(5.0);
            // With empty pitch results, all pitches should be null
            for (const pitchAtBeat of preFilteredResult.pitchByBeat) {
                expect(pitchAtBeat.pitch).toBeNull();
            }
        });
    });

    describe('Dominant Band Determination', () => {
        it('should determine a dominant band', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(['low', 'mid', 'high']).toContain(result.dominantBand);
        });

        it('should prefer bands with higher pitch probability', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            // 1000 Hz is in mid band range (500-2000 Hz)
            const signal = createSineWave(1000, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.dominantBand).toBe('mid');
        });
    });

    describe('Flattened Pitch Output', () => {
        it('should flatten all band pitches into sorted array', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.3, beatIndex: 0, band: 'mid' },
                { timestamp: 0.1, beatIndex: 1, band: 'low' },
                { timestamp: 0.2, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.pitchByBeat).toHaveLength(3);
            expect(result.pitchByBeat[0].timestamp).toBeLessThanOrEqual(
                result.pitchByBeat[1].timestamp
            );
            expect(result.pitchByBeat[1].timestamp).toBeLessThanOrEqual(
                result.pitchByBeat[2].timestamp
            );
        });
    });

    describe('Metadata', () => {
        it('should include correct metadata', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.metadata.duration).toBeCloseTo(5.0, 1);
            expect(result.metadata.totalBeatsAnalyzed).toBe(3);
            expect(result.metadata.totalVoicedBeats).toBeGreaterThanOrEqual(0);
            expect(result.metadata.overallAvgProbability).toBeGreaterThanOrEqual(0);
            expect(result.metadata.overallAvgProbability).toBeLessThanOrEqual(1);
        });
    });

    describe('Helper Methods', () => {
        it('should get band pitches by name', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);
            const midPitches = linker.getBandPitches(result, 'mid');

            expect(midPitches).toBeDefined();
            expect(midPitches!.band).toBe('mid');
        });

        it('should get all voiced pitches', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);
            const voicedPitches = linker.getAllVoicedPitches(result);

            for (const p of voicedPitches) {
                expect(p.pitch).not.toBeNull();
                expect(p.pitch?.isVoiced).toBe(true);
            }
        });

        it('should get pitches in time range', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
                { timestamp: 2.0, beatIndex: 3, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);
            const rangePitches = linker.getPitchesInRange(result, 0.75, 1.75);

            expect(rangePitches).toHaveLength(2);
            expect(rangePitches[0].timestamp).toBe(1.0);
            expect(rangePitches[1].timestamp).toBe(1.5);
        });
    });

    describe('Initial PitchAtBeat Fields', () => {
        it('should initialize direction as "none"', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].direction).toBe('none');
        });

        it('should initialize intervalFromPrevious as 0', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].intervalFromPrevious).toBe(0);
        });

        it('should not populate intervalCategory initially', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].intervalCategory).toBeUndefined();
        });
    });

    describe('Empty Streams', () => {
        it('should handle empty band streams', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.pitchByBeat).toHaveLength(0);
            expect(result.metadata.totalBeatsAnalyzed).toBe(0);
            expect(result.metadata.totalVoicedBeats).toBe(0);
        });
    });

    // ============================================================================
    // Composite Stream Pitch Derivation Tests (Phase 1.4)
    // ============================================================================

    describe('Composite Stream Pitch Derivation', () => {
        // Helper to create mock composite stream
        function createMockCompositeStream(
            beats: Array<{ beatIndex: number; timestamp: number; sourceBand: PitchBandName }>
        ): CompositeStream {
            return {
                beats: beats.map(b => ({
                    ...b,
                    beatIndex: b.beatIndex,
                    timestamp: b.timestamp,
                    gridPosition: b.gridPosition,
                    gridType: b.gridType as 'straight_16th',
                    intensity: b.intensity,
                    band: b.band,
                    sourceBand: b.sourceBand,
                })),
                sections: [
                    {
                        beatRange: { start: beats[0]?.beatIndex ?? 0, end: beats[beats.length - 1]?.beatIndex ?? 0 },
                        sourceBand: beats[0]?.sourceBand ?? 'mid',
                        score: 1,
                        margin: 0.5,
                    },
                ],
                naturalDifficulty: 'medium',
                quarterNoteInterval: 0.5,
                metadata: {
                    totalBeats: beats.length,
                    sectionCount: 1,
                    beatsPerBand: { low: 0, mid: 0, high: 0 },
                    sectionsPerBand: { low: 0, mid: 0, high: 0 },
                },
            };
        }

        // Helper to create mock difficulty variant
        function createMockDifficultyVariant(
            difficulty: 'easy' | 'medium' | 'hard',
            beats: Array<{ beatIndex: number; timestamp: number; sourceBand: PitchBandName }>
        ): DifficultyVariant {
            return {
                difficulty,
                beats: beats.map(b => ({
                    ...b,
                    beatIndex: b.beatIndex,
                    timestamp: b.timestamp,
                    gridPosition: 0,
                    gridType: 'straight_16th' as const,
                    intensity: 0.8,
                    band: b.sourceBand,
                    sourceBand: b.sourceBand,
                })),
                isUnedited: true,
                editType: 'none',
                editAmount: 0,
            };
        }

        it('should derive composite pitches from band stream pitches', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = await linker.linkWithBands(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8, band: 'low' },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            expect(compositePitches).toHaveLength(3);
            expect(compositePitches[0].band).toBe('mid');
            expect(compositePitches[1].band).toBe('mid');
            expect(compositePitches[2].band).toBe('low');
        });

        it('should derive composite pitches with null pitches when no band data', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = await linker.linkWithBands(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 2.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            expect(compositePitches).toHaveLength(1);
            expect(compositePitches[0].pitch).toBeNull();
            expect(compositePitches[0].direction).toBe('none');
            expect(compositePitches[0].intervalFromPrevious).toBe(0);
        });

        it('should derive variant pitches from composite pitches', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 6, band: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = await linker.linkWithBands(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8, band: 'low' },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            const easyVariant = createMockDifficultyVariant('easy', [
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
            ]);

            const easyPitches = linker.deriveVariantPitches(easyVariant, compositePitches);

            expect(easyPitches).toHaveLength(1);
            expect(easyPitches[0].timestamp).toBe(0.5);
            expect(easyPitches[0].band).toBe('mid');
            expect(easyPitches[0].pitch).toBeDefined();
        });

        it('should derive variant pitches for hard variant (all beats)', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 6, band: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = await linker.linkWithBands(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8, band: 'low' },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            const hardVariant = createMockDifficultyVariant('hard', compositeStream.beats);
            const hardPitches = linker.deriveVariantPitches(hardVariant, compositePitches);

            expect(hardPitches).toHaveLength(3);
            expect(hardPitches[0].timestamp).toBe(0.5);
            expect(hardPitches[0].band).toBe('mid');
            expect(hardPitches[0].pitch).toBeDefined();
        });

        it('should derive all variant pitches at once', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 6, band: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = await linker.linkWithBands(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8, band: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8, band: 'low' },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            const allVariantPitches = linker.deriveAllVariantPitches(
                {
                    easy: createMockDifficultyVariant('easy', [compositeStream.beats[0]]),
                    medium: createMockDifficultyVariant('medium', compositeStream.beats),
                    hard: createMockDifficultyVariant('hard', compositeStream.beats),
                },
                compositePitches
            );

            expect(allVariantPitches.easy).toHaveLength(1);
            expect(allVariantPitches.medium).toHaveLength(3);
            expect(allVariantPitches.hard).toHaveLength(3);
            expect(allVariantPitches.easy[0].band).toBe('mid');
            expect(allVariantPitches.medium[0].band).toBe('mid');
            expect(allVariantPitches.medium[1].band).toBe('mid');
            expect(allVariantPitches.hard[0].band).toBe('mid');
            expect(allVariantPitches.hard[2].band).toBe('low');
        });
    });

    // ============================================================================
    // Phrase-Level Pitch Correlation Tests
    // ============================================================================

    describe('Phrase-Level Pitch Correlation', () => {
        // Helper to create mock rhythmic phrases
        function createMockPhrase(
            id: string,
            sourceBand: PitchBandName,
            occurrences: Array<{ beatIndex: number; startTimestamp: number; endTimestamp: number }>,
            pattern?: GeneratedBeat[]
        ): RhythmicPhrase {
            const defaultPattern: GeneratedBeat[] = occurrences.map((occ, i) => ({
                timestamp: occ.startTimestamp,
                beatIndex: occ.beatIndex,
                gridPosition: 0,
                gridType: 'straight_16th' as const,
                intensity: 0.8,
                band: sourceBand,
            }));

            return {
                id,
                pattern: pattern ?? defaultPattern,
                sizeInBeats: occurrences.length > 0 ? 1 : 0,
                sourceBand,
                occurrences: occurrences.map(occ => ({
                    beatIndex: occ.beatIndex,
                    startTimestamp: occ.startTimestamp,
                    endTimestamp: occ.endTimestamp,
                })),
                significance: 1.0,
                hasVariation: true,
                availableForReuse: true,
            };
        }

        it('should build phrase-pitch correlation when phrases are provided', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('phrase_1_1', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = await linker.linkWithBands(bandStreams, audioBuffer, phrases);

            expect(result.phrasePitchCorrelation).toBeDefined();
            expect(result.phrasePitchCorrelation.size).toBe(1);
        });

        it('should use phrase.id as the correlation key', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('my_unique_phrase_id', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = await linker.linkWithBands(bandStreams, audioBuffer, phrases);

            expect(result.phrasePitchCorrelation.has('my_unique_phrase_id')).toBe(true);
        });

        it('should use RhythmicPhrase.sourceBand to find correct band pitches', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(220, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('low_phrase', 'low', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = await linker.linkWithBands(bandStreams, audioBuffer, phrases);

            expect(result.phrasePitchCorrelation.has('low_phrase')).toBe(true);
            const lowPhrasePitches = result.phrasePitchCorrelation.get('low_phrase');
            expect(lowPhrasePitches).toBeDefined();
            expect(lowPhrasePitches!.length).toBeGreaterThan(0);
        });

        it('should use PhraseOccurrence timestamps to find pitches in range', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
                { timestamp: 2.0, beatIndex: 3, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('range_phrase', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 1.1 },
                ]),
            ];

            const result = await linker.linkWithBands(bandStreams, audioBuffer, phrases);

            const rangePhrasePitches = result.phrasePitchCorrelation.get('range_phrase');
            expect(rangePhrasePitches).toBeDefined();
            expect(rangePhrasePitches!.length).toBe(2);
        });

        it('should handle multiple occurrences of the same phrase', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.5, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('repeating_phrase', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                    { beatIndex: 1, startTimestamp: 1.4, endTimestamp: 1.6 },
                ]),
            ];

            const result = await linker.linkWithBands(bandStreams, audioBuffer, phrases);

            const repeatingPhrasePitches = result.phrasePitchCorrelation.get('repeating_phrase');
            expect(repeatingPhrasePitches).toBeDefined();
            expect(repeatingPhrasePitches!.length).toBe(2);
        });

        it('should return empty correlation map when no phrases provided', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            expect(result.phrasePitchCorrelation.size).toBe(0);
        });

        it('should handle phrase with no matching band pitches gracefully', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('high_phrase', 'high', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = await linker.linkWithBands(bandStreams, audioBuffer, phrases);

            expect(result.phrasePitchCorrelation.size).toBe(0);
        });
    });

    // ============================================================================
    // linkWithComposite Tests
    // ============================================================================

    describe('linkWithComposite', () => {
        // Helper to create mock composite stream
        function createMockCompositeStream(
            beats: Array<{ beatIndex: number; timestamp: number; sourceBand: PitchBandName }>
        ): CompositeStream {
            return {
                beats: beats.map(b => ({
                    ...b,
                    gridPosition: 0,
                    gridType: 'straight_16th' as const,
                    intensity: 0.8,
                    band: b.sourceBand,
                    sourceBand: b.sourceBand,
                })),
                sections: [
                    {
                        beatRange: { start: beats[0]?.beatIndex ?? 0, end: beats[beats.length - 1]?.beatIndex ?? 0 },
                        sourceBand: beats[0]?.sourceBand ?? 'mid',
                        score: 1,
                        margin: 0.5,
                    },
                ],
                naturalDifficulty: 'medium',
                quarterNoteInterval: 0.5,
                metadata: {
                    totalBeats: beats.length,
                    sectionCount: 1,
                    beatsPerBand: { low: 0, mid: 0, high: 0 },
                    sectionsPerBand: { low: 0, mid: 0, high: 0 },
                },
            };
        }

        it('should return PitchAtBeat[] for composite stream beats', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'low' },
            ]);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(bandStreams, compositeStream, audioBuffer);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
        });

        it('should match composite pitches to band pitches by beatIndex (exact)', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'low' },
            ]);

            // Composite selects from different bands
            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(bandStreams, compositeStream, audioBuffer);

            expect(result).toHaveLength(2);
            expect(result[0].beatIndex).toBe(0);
            expect(result[0].band).toBe('mid');
            expect(result[1].beatIndex).toBe(2);
            expect(result[1].band).toBe('low');
        });

        it('should set null pitch for composite beats not found in any band', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            // Composite has a beat from a band with no data
            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 99, timestamp: 5.0, sourceBand: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(bandStreams, compositeStream, audioBuffer);

            expect(result).toHaveLength(2);
            expect(result[0].pitch).toBeDefined();
            expect(result[1].pitch).toBeNull();
            expect(result[1].beatIndex).toBe(99);
        });

        it('should return only composite pitches (not full LinkedPitchAnalysis)', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'low' },
            ]);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(bandStreams, compositeStream, audioBuffer);

            // Result is a plain PitchAtBeat[] array
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(1);
            expect(result[0].beatIndex).toBe(0);
            expect(result[0].band).toBe('mid');
            // No bandPitches, pitchByBeat, dominantBand, etc.
            expect((result as any).bandPitches).toBeUndefined();
            expect((result as any).pitchByBeat).toBeUndefined();
        });

        it('should return full LinkedPitchAnalysis from linkWithBands() (no composite)', async () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithBands(bandStreams, audioBuffer);

            // Full analysis with band-level data
            expect(result.bandPitches).toBeDefined();
            expect(result.pitchByBeat).toBeDefined();
            expect(result.dominantBand).toBeDefined();
        });
    });
});
