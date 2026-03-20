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
});
