/**
 * Unit tests for PitchBeatLinker
 *
 * Tests the pitch beat linking functionality including:
 * - Configuration validation
 * - Band stream iteration
 * - Pitch detection at beat timestamps
 * - Pre-filtered analysis
 * - Phrase-level pitch correlation
 */

import { describe, it, expect } from 'vitest';
import {
    PitchBeatLinker,
    type PitchBandName,
    type PreFilteredBandAudio,
} from './PitchBeatLinker.js';
import type { GeneratedRhythmMap, GeneratedBeat } from '../analysis/beat/RhythmQuantizer.js';
import type { RhythmicPhrase, PhraseOccurrence } from '../analysis/beat/PhraseAnalyzer.js';
import { FREQUENCY_BANDS, applyFrequencyBand } from '../analysis/beat/utils/audioUtils.js';

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

    // Helper to create pre-filtered band audio
    function createPreFilteredBands(
        signal: Float32Array,
        sampleRate: number = 44100
    ): PreFilteredBandAudio[] {
        const bands: PreFilteredBandAudio[] = [];
        for (const band of FREQUENCY_BANDS) {
            const bandName = band.name as PitchBandName;
            const filtered = applyFrequencyBand(signal, bandName, sampleRate);
            bands.push({
                band: bandName,
                signal: filtered,
                sampleRate,
            });
        }
        return bands;
    }

    describe('Constructor and Configuration', () => {
        it('should create linker with default configuration', () => {
            const linker = new PitchBeatLinker();
            const config = linker.getConfig();

            expect(config.targetSampleRate).toBe(44100);
            expect(config.bands).toHaveLength(3);
            expect(config.pitchDetector).toBeDefined();
        });

        it('should use FREQUENCY_BANDS from audioUtils by default', () => {
            const linker = new PitchBeatLinker();
            const config = linker.getConfig();

            expect(config.bands).toEqual(FREQUENCY_BANDS);
            expect(config.bands[0].name).toBe('low');
            expect(config.bands[1].name).toBe('mid');
            expect(config.bands[2].name).toBe('high');
        });

        it('should allow custom configuration', () => {
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

        it('should throw error for empty bands configuration', () => {
            expect(() => new PitchBeatLinker({ bands: [] })).toThrow();
        });

        it('should pass pitch detector config through', () => {
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
        it('should analyze each band stream independently', () => {
            const linker = new PitchBeatLinker();

            // Create beats for each band at different timestamps
            const bandStreams = createMockBandStreams([
                { timestamp: 0.1, beatIndex: 0, band: 'low' },
                { timestamp: 0.2, beatIndex: 1, band: 'mid' },
                { timestamp: 0.3, beatIndex: 2, band: 'high' },
            ]);

            // Create a sine wave at 220 Hz (in low band)
            const signal = createSineWave(220, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(result.bandPitches.size).toBe(3);
            expect(result.bandPitches.has('low')).toBe(true);
            expect(result.bandPitches.has('mid')).toBe(true);
            expect(result.bandPitches.has('high')).toBe(true);
        });

        it('should detect pitch at beat timestamps', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            // Create a sine wave at 440 Hz
            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);
            const midPitches = result.bandPitches.get('mid');

            expect(midPitches).toBeDefined();
            expect(midPitches!.pitches).toHaveLength(3);
            expect(midPitches!.totalBeatCount).toBe(3);
        });

        it('should store band information with each pitch', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.1, beatIndex: 0, band: 'low' },
                { timestamp: 0.2, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(220, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            for (const pitchAtBeat of result.pitchByBeat) {
                expect(['low', 'mid', 'high']).toContain(pitchAtBeat.band);
            }
        });

        it('should preserve beat timestamp and index', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].timestamp).toBe(0.5);
            expect(result.pitchByBeat[0].beatIndex).toBe(0);
            expect(result.pitchByBeat[1].timestamp).toBe(1.0);
            expect(result.pitchByBeat[1].beatIndex).toBe(1);
        });
    });

    describe('Pre-Filtered Analysis', () => {
        it('should analyze pre-filtered audio without redundant filtering', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(220, 5.0);
            const preFilteredBands = createPreFilteredBands(signal);

            const result = linker.linkPreFiltered(bandStreams, preFilteredBands, {
                duration: 5.0,
            });

            expect(result.bandPitches.size).toBe(3);
            expect(result.metadata.duration).toBe(5.0);
        });

        it('should handle missing pre-filtered bands gracefully', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
            ]);

            // Only provide low band
            const signal = createSineWave(220, 5.0);
            const lowFiltered = applyFrequencyBand(signal, 'low', 44100);
            const preFilteredBands: PreFilteredBandAudio[] = [
                { band: 'low', signal: lowFiltered, sampleRate: 44100 },
            ];

            const result = linker.linkPreFiltered(bandStreams, preFilteredBands, {
                duration: 5.0,
            });

            // Should still have all bands, but mid/high will be empty
            expect(result.bandPitches.has('mid')).toBe(true);
            expect(result.bandPitches.has('high')).toBe(true);
            expect(result.bandPitches.get('mid')!.pitches).toHaveLength(0);
            expect(result.bandPitches.get('high')!.pitches).toHaveLength(0);
        });
    });

    describe('Dominant Band Determination', () => {
        it('should determine a dominant band', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(['low', 'mid', 'high']).toContain(result.dominantBand);
        });

        it('should prefer bands with higher pitch probability', () => {
            const linker = new PitchBeatLinker();

            // Create beats only in mid band with clear pitch content
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            // 1000 Hz is in mid band range (500-2000 Hz)
            const signal = createSineWave(1000, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            // Mid band should be dominant since it has the most voiced content
            expect(result.dominantBand).toBe('mid');
        });
    });

    describe('Flattened Pitch Output', () => {
        it('should flatten all band pitches into sorted array', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.3, beatIndex: 0, band: 'mid' },
                { timestamp: 0.1, beatIndex: 1, band: 'low' },
                { timestamp: 0.2, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            // Should be sorted by timestamp
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
        it('should include correct metadata', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'high' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(result.metadata.duration).toBeCloseTo(5.0, 1);
            expect(result.metadata.totalBeatsAnalyzed).toBe(3);
            expect(result.metadata.totalVoicedBeats).toBeGreaterThanOrEqual(0);
            expect(result.metadata.overallAvgProbability).toBeGreaterThanOrEqual(0);
            expect(result.metadata.overallAvgProbability).toBeLessThanOrEqual(1);
        });
    });

    describe('Helper Methods', () => {
        it('should get band pitches by name', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);
            const midPitches = linker.getBandPitches(result, 'mid');

            expect(midPitches).toBeDefined();
            expect(midPitches!.band).toBe('mid');
        });

        it('should get all voiced pitches', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);
            const voicedPitches = linker.getAllVoicedPitches(result);

            // All voiced pitches should have non-null pitch
            for (const p of voicedPitches) {
                expect(p.pitch).not.toBeNull();
                expect(p.pitch?.isVoiced).toBe(true);
            }
        });

        it('should get pitches in time range', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
                { timestamp: 2.0, beatIndex: 3, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);
            const rangePitches = linker.getPitchesInRange(result, 0.75, 1.75);

            expect(rangePitches).toHaveLength(2);
            expect(rangePitches[0].timestamp).toBe(1.0);
            expect(rangePitches[1].timestamp).toBe(1.5);
        });
    });

    describe('Initial PitchAtBeat Fields', () => {
        it('should initialize direction as "none"', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].direction).toBe('none');
        });

        it('should initialize intervalFromPrevious as 0', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].intervalFromPrevious).toBe(0);
        });

        it('should not populate intervalCategory initially', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

            expect(result.pitchByBeat[0].intervalCategory).toBeUndefined();
        });
    });

    describe('Empty Streams', () => {
        it('should handle empty band streams', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = linker.link(bandStreams, audioBuffer);

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

        it('should derive composite pitches from band stream pitches', () => {
            const linker = new PitchBeatLinker();

            // Create band streams with mid band beats
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            // Create audio and link
            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = linker.link(bandStreams, audioBuffer);

            // Create composite stream
            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8 },
            ]);

            // Derive composite pitches
            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            expect(compositePitches).toHaveLength(3);

            // Verify each composite pitch has the correct source band
            expect(compositePitches[0].band).toBe('mid');
            expect(compositePitches[1].band).toBe('mid');
            expect(compositePitches[2].band).toBe('low');
        });

        it('should derive composite pitches with null pitches when no band data', () => {
            const linker = new PitchBeatLinker();

            // Create band streams with beats at specific timestamps
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = linker.link(bandStreams, audioBuffer);

            // Create composite stream with a beat that doesn't exist in any band stream
            // (using timestamp 2.0 which is not in the band streams)
            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 2.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
            ]);

            // Derive composite pitches
            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            expect(compositePitches).toHaveLength(1);
            expect(compositePitches[0].pitch).toBeNull();
            expect(compositePitches[0].direction).toBe('none');
            expect(compositePitches[0].intervalFromPrevious).toBe(0);
        });

        it('should derive variant pitches from composite pitches', () => {
            const linker = new PitchBeatLinker();

            // First, create composite pitches from a mock linked analysis
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 6, band: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = linker.link(bandStreams, audioBuffer);

            // Create composite stream
            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8 },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            // Create easy variant (fewer beats - only mid band)
            const easyVariant = createMockDifficultyVariant('easy', [
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                // beat at 1.5 is removed
            ]);

            // Derive variant pitches
            const easyPitches = linker.deriveVariantPitches(easyVariant, compositePitches);

            expect(easyPitches).toHaveLength(1);
            expect(easyPitches[0].timestamp).toBe(0.5);
            expect(easyPitches[0].band).toBe('mid');
            expect(easyPitches[0].pitch).toBeDefined();
        });

        it('should derive variant pitches for hard variant (all beats)', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 6, band: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = linker.link(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8 },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            // Create hard variant (same beats as composite)
            const hardVariant = createMockDifficultyVariant('hard', compositeStream.beats);

            // Derive variant pitches
            const hardPitches = linker.deriveVariantPitches(hardVariant, compositePitches);

            expect(hardPitches).toHaveLength(3);
            expect(hardPitches[0].timestamp).toBe(0.5);
            expect(hardPitches[0].band).toBe('mid');
            expect(hardPitches[0].pitch).toBeDefined();
        });

        it('should derive all variant pitches at once', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 6, band: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const linkedAnalysis = linker.link(bandStreams, audioBuffer);

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid', gridPosition: 0, intensity: 0.8 },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low', gridPosition: 0, intensity: 0.8 },
            ]);

            const compositePitches = linker.deriveCompositePitches(compositeStream, linkedAnalysis);

            // Derive all variant pitches
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
    // Phrase-Level Pitch Correlation Tests (Phase 1.3.2)
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

        it('should build phrase-pitch correlation when phrases are provided', () => {
            const linker = new PitchBeatLinker();

            // Create beats in mid band
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            // Create mock phrases
            const phrases: RhythmicPhrase[] = [
                createMockPhrase('phrase_1_1', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = linker.link(bandStreams, audioBuffer, phrases);

            // Should have phrase correlation map
            expect(result.phrasePitchCorrelation).toBeDefined();
            expect(result.phrasePitchCorrelation.size).toBe(1);
        });

        it('should use phrase.id as the correlation key', () => {
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

            const result = linker.link(bandStreams, audioBuffer, phrases);

            // Should use phrase.id as the key
            expect(result.phrasePitchCorrelation.has('my_unique_phrase_id')).toBe(true);
        });

        it('should use RhythmicPhrase.sourceBand to find correct band pitches', () => {
            const linker = new PitchBeatLinker();

            // Create beats in both low and mid bands
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'low' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(220, 5.0); // Low frequency for low band
            const audioBuffer = createMockAudioBuffer(signal);

            // Create phrase in LOW band
            const phrases: RhythmicPhrase[] = [
                createMockPhrase('low_phrase', 'low', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = linker.link(bandStreams, audioBuffer, phrases);

            // Should correlate with low band pitches
            expect(result.phrasePitchCorrelation.has('low_phrase')).toBe(true);
            const lowPhrasePitches = result.phrasePitchCorrelation.get('low_phrase');
            expect(lowPhrasePitches).toBeDefined();
            expect(lowPhrasePitches!.length).toBeGreaterThan(0);
        });

        it('should use PhraseOccurrence timestamps to find pitches in range', () => {
            const linker = new PitchBeatLinker();

            // Create beats at 0.5, 1.0, 1.5, 2.0
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
                { timestamp: 1.5, beatIndex: 2, band: 'mid' },
                { timestamp: 2.0, beatIndex: 3, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            // Create phrase with occurrence spanning 0.4-1.1 (should catch 0.5 and 1.0)
            const phrases: RhythmicPhrase[] = [
                createMockPhrase('range_phrase', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 1.1 },
                ]),
            ];

            const result = linker.link(bandStreams, audioBuffer, phrases);

            const rangePhrasePitches = result.phrasePitchCorrelation.get('range_phrase');
            expect(rangePhrasePitches).toBeDefined();
            // Should include pitches from 0.5 and 1.0 (within 0.4-1.1 range)
            expect(rangePhrasePitches!.length).toBe(2);
        });

        it('should handle multiple occurrences of the same phrase', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.5, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            // Create phrase with TWO occurrences
            const phrases: RhythmicPhrase[] = [
                createMockPhrase('repeating_phrase', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                    { beatIndex: 1, startTimestamp: 1.4, endTimestamp: 1.6 },
                ]),
            ];

            const result = linker.link(bandStreams, audioBuffer, phrases);

            const repeatingPhrasePitches = result.phrasePitchCorrelation.get('repeating_phrase');
            expect(repeatingPhrasePitches).toBeDefined();
            // Should include pitches from both occurrences
            expect(repeatingPhrasePitches!.length).toBe(2);
        });

        it('should return empty correlation map when no phrases provided', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            // No phrases provided
            const result = linker.link(bandStreams, audioBuffer);

            expect(result.phrasePitchCorrelation.size).toBe(0);
        });

        it('should handle phrase with no matching band pitches gracefully', () => {
            const linker = new PitchBeatLinker();

            // Create beats only in mid band
            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            // Create phrase for HIGH band (which has no beats)
            const phrases: RhythmicPhrase[] = [
                createMockPhrase('high_phrase', 'high', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                ]),
            ];

            const result = linker.link(bandStreams, audioBuffer, phrases);

            // High band has no beats, so no correlation
            expect(result.phrasePitchCorrelation.size).toBe(0);
        });

        it('should work with pre-filtered analysis and phrases', () => {
            const linker = new PitchBeatLinker();

            const bandStreams = createMockBandStreams([
                { timestamp: 0.5, beatIndex: 0, band: 'mid' },
                { timestamp: 1.0, beatIndex: 1, band: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const preFilteredBands = createPreFilteredBands(signal);

            const phrases: RhythmicPhrase[] = [
                createMockPhrase('prefiltered_phrase', 'mid', [
                    { beatIndex: 0, startTimestamp: 0.4, endTimestamp: 0.6 },
                    { beatIndex: 1, startTimestamp: 0.9, endTimestamp: 1.1 },
                ]),
            ];

            const result = linker.linkPreFiltered(bandStreams, preFilteredBands, {
                duration: 5.0,
            }, phrases);

            expect(result.phrasePitchCorrelation.size).toBe(1);
            expect(result.phrasePitchCorrelation.has('prefiltered_phrase')).toBe(true);
        });
    });
});
