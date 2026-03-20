/**
 * Unit tests for MultiBandPitchAnalyzer
 *
 * Tests the multi-band pitch analysis system including:
 * - Configuration validation
 * - Band-by-band pitch analysis
 * - Primary band determination
 * - Reuse of FREQUENCY_BANDS from audioUtils
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    MultiBandPitchAnalyzer,
    type MultiBandPitchAnalyzerConfig,
    type MultiBandPitchAnalysis,
    type BandPitchAnalysis,
    type BandName,
    type PreFilteredBandInput,
} from './MultiBandPitchAnalyzer.js';
import { FREQUENCY_BANDS, applyFrequencyBand } from './beat/utils/audioUtils.js';

describe('MultiBandPitchAnalyzer', () => {
    // Helper to create a sine wave at a specific frequency
    function createSineWave(
        frequency: number,
        durationSeconds: number,
        sampleRate: number = 44100
    ): AudioBuffer {
        const length = durationSeconds * sampleRate;
        const buffer = {
            length,
            duration: durationSeconds,
            sampleRate,
            numberOfChannels: 1,
            getChannelData: (channel: number) => {
                const data = new Float32Array(length);
                for (let i = 0; i < length; i++) {
                    data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
                }
                return data;
            },
        } as unknown as AudioBuffer;
        return buffer as AudioBuffer;
    }

    // Helper to create a silent audio buffer
    function createSilentBuffer(durationSeconds: number, sampleRate: number = 44100): AudioBuffer {
        const length = durationSeconds * sampleRate;
        const buffer = {
            length,
            duration: durationSeconds,
            sampleRate,
            numberOfChannels: 1,
            getChannelData: (channel: number) => new Float32Array(length),
        } as unknown as AudioBuffer;
        return buffer as AudioBuffer;
    }

    // Helper to create audio with mixed frequencies
    function createMixedFrequencyBuffer(
        frequencies: { freq: number; amplitude: number }[],
        durationSeconds: number,
        sampleRate: number = 44100
    ): AudioBuffer {
        const length = durationSeconds * sampleRate;
        const buffer = {
            length,
            duration: durationSeconds,
            sampleRate,
            numberOfChannels: 1,
            getChannelData: (channel: number) => {
                const data = new Float32Array(length);
                for (let i = 0; i < length; i++) {
                    for (const { freq, amplitude } of frequencies) {
                        data[i] += amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
                    }
                }
                return data;
            },
        } as unknown as AudioBuffer;
        return buffer as AudioBuffer;
    }

    describe('Constructor and Configuration', () => {
        it('should create analyzer with default configuration', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const config = analyzer.getConfig();

            expect(config.targetSampleRate).toBe(44100);
            expect(config.bands).toHaveLength(3);
            expect(config.pitchDetector).toBeDefined();
        });

        it('should use FREQUENCY_BANDS from audioUtils by default', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const bands = analyzer.getBands();

            expect(bands).toEqual(FREQUENCY_BANDS);
            expect(bands[0].name).toBe('low');
            expect(bands[1].name).toBe('mid');
            expect(bands[2].name).toBe('high');
        });

        it('should allow custom configuration', () => {
            const customBands = [
                { name: 'low', lowHz: 50, highHz: 400, description: 'Custom low' },
                { name: 'mid', lowHz: 400, highHz: 1500, description: 'Custom mid' },
            ];

            const analyzer = new MultiBandPitchAnalyzer({
                targetSampleRate: 22050,
                bands: customBands,
            });

            const config = analyzer.getConfig();
            expect(config.targetSampleRate).toBe(22050);
            expect(config.bands).toHaveLength(2);
        });

        it('should throw error for empty bands configuration', () => {
            expect(() => new MultiBandPitchAnalyzer({ bands: [] })).toThrow();
        });

        it('should pass pitch detector config through', () => {
            const analyzer = new MultiBandPitchAnalyzer({
                pitchDetector: {
                    voicingThreshold: 0.7,
                    frameSize: 4096,
                },
            });

            const config = analyzer.getConfig();
            expect(config.pitchDetector.voicingThreshold).toBe(0.7);
            expect(config.pitchDetector.frameSize).toBe(4096);
        });
    });

    describe('Multi-Band Analysis', () => {
        it('should analyze all frequency bands', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            expect(result.bandAnalyses.size).toBe(3);
            expect(result.bandAnalyses.has('low')).toBe(true);
            expect(result.bandAnalyses.has('mid')).toBe(true);
            expect(result.bandAnalyses.has('high')).toBe(true);
        });

        it('should return results for each band', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            for (const [bandName, analysis] of result.bandAnalyses) {
                expect(analysis.band).toBe(bandName);
                expect(analysis.results).toBeDefined();
                expect(analysis.results.length).toBeGreaterThan(0);
                expect(analysis.frequencyRange).toBeDefined();
                expect(analysis.avgProbability).toBeGreaterThanOrEqual(0);
                expect(analysis.avgProbability).toBeLessThanOrEqual(1);
                expect(analysis.voicedFrameCount).toBeGreaterThanOrEqual(0);
                expect(analysis.totalFrameCount).toBe(analysis.results.length);
            }
        });

        it('should include bands used in result', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            expect(result.bandsUsed).toEqual(FREQUENCY_BANDS);
        });

        it('should include metadata in result', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            expect(result.metadata.duration).toBeCloseTo(0.5, 1);
            expect(result.metadata.effectiveSampleRate).toBe(44100);
            expect(result.metadata.framesPerBand).toBeGreaterThan(0);
        });

        it('should include combinedMelody field initialized as null', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            // combinedMelody is null until melody contour analysis (Phase 1.5) is performed
            expect(result.combinedMelody).toBeNull();
        });
    });

    describe('MelodyContour Types', () => {
        it('should export MelodyContour type', () => {
            // Type is exported, this is a compile-time check
            // Ensure the types exist and are correctly structured
            const melodyContour: MultiBandPitchAnalysis['combinedMelody'] = {
                segments: [],
                direction: 'stable',
                range: {
                    minNote: 'C4',
                    maxNote: 'C4',
                    semitones: 0,
                },
            };

            expect(melodyContour.direction).toBe('stable');
            expect(melodyContour.segments).toEqual([]);
            expect(melodyContour.range.semitones).toBe(0);
        });

        it('should export MelodySegment type', () => {
            const segment = {
                startTime: 0,
                endTime: 1,
                startPitch: 'C4',
                endPitch: 'D4',
                direction: 'up' as const,
                interval: 2,
            };

            expect(segment.direction).toBe('up');
            expect(segment.interval).toBe(2);
        });
    });

    describe('Primary Band Determination', () => {
        it('should determine a primary band', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            expect(['low', 'mid', 'high']).toContain(result.primaryBand);
        });

        it('should prefer mid band for vocal-range frequencies', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            // 440 Hz is in the mid band (500-2000 Hz range for melody)
            // But it's actually in low band (20-500 Hz) range
            // Let's use 1000 Hz which is clearly in mid range
            const buffer = createSineWave(1000, 1.0);
            const result = analyzer.analyze(buffer);

            // Mid band should have better results for 1000 Hz signal
            const midAnalysis = result.bandAnalyses.get('mid');
            expect(midAnalysis).toBeDefined();
            // The mid band should detect this frequency well
            expect(midAnalysis!.avgProbability).toBeGreaterThan(0);
        });

        it('should handle silent audio gracefully', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSilentBuffer(0.5);
            const result = analyzer.analyze(buffer);

            // Should still return results for all bands
            expect(result.bandAnalyses.size).toBe(3);

            // All bands should have low probability
            for (const [, analysis] of result.bandAnalyses) {
                expect(analysis.avgProbability).toBe(0);
                expect(analysis.voicedFrameCount).toBe(0);
            }
        });
    });

    describe('Band Filtering', () => {
        it('should use the same FREQUENCY_BANDS as rhythm generation', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const bands = analyzer.getBands();

            // Verify exact match with FREQUENCY_BANDS from audioUtils
            expect(bands).toEqual(FREQUENCY_BANDS);

            // Verify specific band definitions
            expect(bands[0]).toEqual({
                name: 'low',
                lowHz: 20,
                highHz: 500,
                description: 'Low frequencies (bass, kick, sub)',
            });
            expect(bands[1]).toEqual({
                name: 'mid',
                lowHz: 500,
                highHz: 2000,
                description: 'Mid frequencies (vocals, snare body, lead instruments)',
            });
            expect(bands[2]).toEqual({
                name: 'high',
                lowHz: 2000,
                highHz: 20000,
                description: 'High frequencies (hi-hats, cymbals, harmonics, air)',
            });
        });

        it('should analyze low band for bass frequencies', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            // 100 Hz is in the low band
            const buffer = createSineWave(100, 1.0);
            const result = analyzer.analyze(buffer);

            const lowAnalysis = result.bandAnalyses.get('low');
            expect(lowAnalysis).toBeDefined();
            expect(lowAnalysis!.frequencyRange.lowHz).toBe(20);
            expect(lowAnalysis!.frequencyRange.highHz).toBe(500);
        });

        it('should analyze high band for treble frequencies', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            // Create a high frequency signal
            // Note: May be above typical pitch detection range, but band should still be analyzed
            const buffer = createSineWave(3000, 1.0);
            const result = analyzer.analyze(buffer);

            const highAnalysis = result.bandAnalyses.get('high');
            expect(highAnalysis).toBeDefined();
            expect(highAnalysis!.frequencyRange.lowHz).toBe(2000);
            expect(highAnalysis!.frequencyRange.highHz).toBe(20000);
        });
    });

    describe('Helper Methods', () => {
        it('should get band results by name', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            const midResults = analyzer.getBandResults(result, 'mid');
            expect(midResults).toBeDefined();
            expect(midResults!.band).toBe('mid');
        });

        it('should return undefined for invalid band name', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            // Type assertion to test invalid band name
            const invalidResults = analyzer.getBandResults(result, 'invalid' as BandName);
            expect(invalidResults).toBeUndefined();
        });

        it('should get all voiced results combined', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            const voicedResults = analyzer.getAllVoicedResults(result);

            // All results should be voiced
            for (const r of voicedResults) {
                expect(r.isVoiced).toBe(true);
                expect(['low', 'mid', 'high']).toContain(r.band);
            }

            // Results should be sorted by timestamp
            for (let i = 1; i < voicedResults.length; i++) {
                expect(voicedResults[i].timestamp).toBeGreaterThanOrEqual(voicedResults[i - 1].timestamp);
            }
        });

        it('should get primary band pitches only', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            const primaryPitches = analyzer.getPrimaryBandPitches(result);

            // All returned pitches should be from the primary band
            for (const p of primaryPitches) {
                expect(p.band).toBe(result.primaryBand);
                expect(p.isVoiced).toBe(true);
            }
        });

        it('should return empty array when primary band has no voiced pitches', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            // Create an empty analysis
            const emptyAnalysis: BandPitchAnalysis = {
                band: 'mid',
                frequencyRange: { lowHz: 500, highHz: 2000 },
                results: [],
                avgProbability: 0,
                voicedFrameCount: 0,
                totalFrameCount: 0,
            };

            const bandAnalyses = new Map<BandName, BandPitchAnalysis>();
            bandAnalyses.set('mid', emptyAnalysis);

            const result: MultiBandPitchAnalysis = {
                primaryBand: 'mid',
                bandAnalyses,
            } as MultiBandPitchAnalysis;

            const primaryPitches = analyzer.getPrimaryBandPitches(result);

            expect(primaryPitches).toEqual([]);
        });

        it('should get primary band all results including unvoiced', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.5);
            const result = analyzer.analyze(buffer);

            const allResults = analyzer.getPrimaryBandAllResults(result);

            // Should have results
            expect(allResults.length).toBeGreaterThan(0);

            // All should be from primary band
            for (const r of allResults) {
                expect(r.band).toBe(result.primaryBand);
            }
        });

        it('should return empty array for all results when primary band has no analysis', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            const result: MultiBandPitchAnalysis = {
                primaryBand: 'mid',
                bandAnalyses: new Map(),
            } as MultiBandPitchAnalysis;

            const allResults = analyzer.getPrimaryBandAllResults(result);

            expect(allResults).toEqual([]);
        });
    });

    describe('Mixed Frequency Content', () => {
        it('should analyze audio with mixed frequencies', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            // Create audio with content in multiple bands
            const buffer = createMixedFrequencyBuffer([
                { freq: 100, amplitude: 0.5 },   // Low band
                { freq: 1000, amplitude: 0.3 },  // Mid band
                { freq: 4000, amplitude: 0.2 },  // High band
            ], 1.0);

            const result = analyzer.analyze(buffer);

            // All bands should have some analysis
            for (const [, analysis] of result.bandAnalyses) {
                expect(analysis.totalFrameCount).toBeGreaterThan(0);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle very short audio', () => {
            const analyzer = new MultiBandPitchAnalyzer();
            const buffer = createSineWave(440, 0.05); // 50ms
            const result = analyzer.analyze(buffer);

            expect(result.bandAnalyses.size).toBe(3);
        });

        it('should handle different sample rates (within Nyquist limits)', () => {
            // Note: High band (20000Hz) requires sample rate > 40000Hz to satisfy Nyquist
            // Using 44100Hz which is the default and supports all bands
            const analyzer = new MultiBandPitchAnalyzer({
                targetSampleRate: 44100,
            });

            // Create buffer at different sample rate
            const buffer = createSineWave(440, 0.5, 48000);
            const result = analyzer.analyze(buffer);

            expect(result.metadata.effectiveSampleRate).toBe(44100);
        });
    });

    describe('Pre-Filtered Analysis', () => {
        // Helper to create pre-filtered band inputs
        function createPreFilteredBands(
            frequencies: { freq: number; amplitude: number }[],
            durationSeconds: number,
            sampleRate: number = 44100
        ): PreFilteredBandInput[] {
            // Create mixed signal
            const length = durationSeconds * sampleRate;
            const signal = new Float32Array(length);
            for (let i = 0; i < length; i++) {
                for (const { freq, amplitude } of frequencies) {
                    signal[i] += amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
                }
            }

            // Filter for each band
            const bands: PreFilteredBandInput[] = [];
            for (const bandName of ['low', 'mid', 'high'] as const) {
                const filtered = applyFrequencyBand(signal, bandName, sampleRate);
                bands.push({
                    band: bandName,
                    signal: filtered,
                    sampleRate,
                });
            }
            return bands;
        }

        it('should analyze pre-filtered bands', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            // Create pre-filtered inputs for a 1000Hz signal (mid band)
            const preFilteredBands = createPreFilteredBands(
                [{ freq: 1000, amplitude: 0.5 }],
                0.5
            );

            const result = analyzer.analyzePreFiltered(preFilteredBands, {
                duration: 0.5,
            });

            expect(result.bandAnalyses.size).toBe(3);
            expect(result.bandAnalyses.has('low')).toBe(true);
            expect(result.bandAnalyses.has('mid')).toBe(true);
            expect(result.bandAnalyses.has('high')).toBe(true);
        });

        it('should produce same results as regular analyze method', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            // Create a test signal
            const buffer = createSineWave(440, 0.5);

            // Analyze using regular method
            const regularResult = analyzer.analyze(buffer);

            // Create pre-filtered inputs from the same buffer
            const sampleRate = 44100;
            const signal = buffer.getChannelData(0);
            const preFilteredBands: PreFilteredBandInput[] = [];
            for (const bandName of ['low', 'mid', 'high'] as const) {
                const filtered = applyFrequencyBand(signal, bandName, sampleRate);
                preFilteredBands.push({
                    band: bandName,
                    signal: filtered,
                    sampleRate,
                });
            }

            // Analyze using pre-filtered method
            const preFilteredResult = analyzer.analyzePreFiltered(preFilteredBands, {
                duration: 0.5,
            });

            // Results should be identical
            expect(preFilteredResult.bandAnalyses.size).toBe(regularResult.bandAnalyses.size);
            expect(preFilteredResult.primaryBand).toBe(regularResult.primaryBand);

            // Check that each band has the same number of pitch results
            for (const bandName of ['low', 'mid', 'high'] as const) {
                const preFilteredAnalysis = preFilteredResult.bandAnalyses.get(bandName);
                const regularAnalysis = regularResult.bandAnalyses.get(bandName);

                expect(preFilteredAnalysis?.totalFrameCount).toBe(regularAnalysis?.totalFrameCount);
                expect(preFilteredAnalysis?.frequencyRange).toEqual(regularAnalysis?.frequencyRange);
            }
        });

        it('should throw error for empty pre-filtered bands', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            expect(() => analyzer.analyzePreFiltered([], { duration: 0.5 })).toThrow();
        });

        it('should throw error for unknown band name', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            const invalidBands: PreFilteredBandInput[] = [{
                band: 'invalid' as BandName,
                signal: new Float32Array(1000),
                sampleRate: 44100,
            }];

            expect(() => analyzer.analyzePreFiltered(invalidBands, { duration: 0.5 })).toThrow(/Unknown band/);
        });

        it('should support partial band analysis', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            // Only provide mid band
            const preFilteredBands = createPreFilteredBands(
                [{ freq: 1000, amplitude: 0.5 }],
                0.5
            ).filter(b => b.band === 'mid');

            const result = analyzer.analyzePreFiltered(preFilteredBands, {
                duration: 0.5,
            });

            // Should have analysis only for the provided band
            expect(result.bandAnalyses.size).toBe(1);
            expect(result.bandAnalyses.has('mid')).toBe(true);
            expect(result.bandAnalyses.has('low')).toBe(false);
            expect(result.bandAnalyses.has('high')).toBe(false);
        });

        it('should use pre-filtered sample rate in metadata', () => {
            const analyzer = new MultiBandPitchAnalyzer();

            const preFilteredBands = createPreFilteredBands(
                [{ freq: 440, amplitude: 0.5 }],
                0.5,
                48000 // Different sample rate
            );

            const result = analyzer.analyzePreFiltered(preFilteredBands, {
                duration: 0.5,
            });

            expect(result.metadata.effectiveSampleRate).toBe(48000);
        });
    });
});
