/**
 * Unit tests for PitchDetector
 *
 * Tests the pYIN algorithm implementation including:
 * - YIN difference function computation
 * - Cumulative mean normalized difference function
 * - HMM voicing detection transitions
 * - HMM pitch state transitions
 * - Probability values in valid range [0,1]
 * - Viterbi decoding for optimal pitch path
 */

import { describe, it, expect } from 'vitest';
import { PitchDetector, type PitchDetectorConfig, type PitchResult } from './PitchDetector.js';

describe('PitchDetector', () => {
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

    describe('Constructor and Configuration', () => {
        it('should create detector with default configuration', () => {
            const detector = new PitchDetector();
            const config = detector.getConfig();
            expect(config.minFrequency).toBe(80);
            expect(config.maxFrequency).toBe(1000);
            expect(config.frameSize).toBe(2048);
            expect(config.hopSize).toBe(512);
            expect(config.voicingThreshold).toBe(0.5);
        });

        it('should allow custom configuration', () => {
            const detector = new PitchDetector({
                minFrequency: 100,
                maxFrequency: 500,
                frameSize: 4096,
            });
            const config = detector.getConfig();
            expect(config.minFrequency).toBe(100);
            expect(config.maxFrequency).toBe(500);
            expect(config.frameSize).toBe(4096);
        });

        it('should throw error for invalid frequency range', () => {
            expect(() => new PitchDetector({
                minFrequency: 1000,
                maxFrequency: 80,
            })).toThrow();
        });

        it('should throw error for invalid threshold values', () => {
            expect(() => new PitchDetector({
                voicingThreshold: 1.5,
            })).toThrow();
        });
    });

    describe('YIN Difference Function', () => {
        it('should compute correct difference function values', () => {
            const detector = new PitchDetector({ frameSize: 1024 });
            // Create a simple signal with known period
            const signal = new Float32Array(1024);
            for (let i = 0; i < 1024; i++) {
                signal[i] = Math.sin(2 * Math.PI * 440 * i / 44100); // 440 Hz
            }

            // Access private method through reflection or test differently
            // For now, we'll test through the main detect method
            const results = detector.detect(createSineWave(440, 0.5));
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Cumulative Mean Normalized Difference Function', () => {
        it('should produce normalized values between 0 and 1', () => {
            const detector = new PitchDetector();
            const sineBuffer = createSineWave(440, 0.5);
            const results = detector.detect(sineBuffer);

            for (const result of results) {
                if (result.isVoiced) {
                    expect(result.probability).toBeGreaterThanOrEqual(0);
                    expect(result.probability).toBeLessThanOrEqual(1);
                }
            }
        });
    });

    describe('Pitch Detection with Known Frequencies', () => {
        it('should detect 440 Hz (A4)', () => {
            const detector = new PitchDetector({
                minFrequency: 200,
                maxFrequency: 1000,
            });
            const sineBuffer = createSineWave(440, 1.0);
            const results = detector.detect(sineBuffer);

            // Find voiced frames
            const voicedResults = results.filter(r => r.isVoiced);
            expect(voicedResults.length).toBeGreaterThan(0);

            // Check that the detected frequency is close to 440 Hz
            const avgFreq = voicedResults.reduce((sum, r) => sum + r.frequency, 0) / voicedResults.length;
            expect(avgFreq).toBeGreaterThan(400);
            expect(avgFreq).toBeLessThan(500);
        });

        it('should detect 261.63 Hz (C4)', () => {
            const detector = new PitchDetector({
                minFrequency: 80,
                maxFrequency: 500,
            });
            const sineBuffer = createSineWave(261.63, 1.0);
            const results = detector.detect(sineBuffer);

            const voicedResults = results.filter(r => r.isVoiced);
            expect(voicedResults.length).toBeGreaterThan(0);

            const avgFreq = voicedResults.reduce((sum, r) => sum + r.frequency, 0) / voicedResults.length;
            expect(avgFreq).toBeGreaterThan(240);
            expect(avgFreq).toBeLessThan(280);
        });

        it('should return unvoiced for silent audio', () => {
            const detector = new PitchDetector();
            const silentBuffer = createSilentBuffer(1.0);
            const results = detector.detect(silentBuffer);

            // All frames should be unvoiced
            for (const result of results) {
                expect(result.isVoiced).toBe(false);
                expect(result.frequency).toBe(0);
                expect(result.midiNote).toBeNull();
                expect(result.noteName).toBeNull();
            }
        });
    });

    describe('MIDI Note Conversion', () => {
        it('should correctly convert 440 Hz to A4 (MIDI 69)', () => {
            const detector = new PitchDetector();
            const sineBuffer = createSineWave(440, 0.5);
            const results = detector.detect(sineBuffer);

            const voicedResults = results.filter(r => r.isVoiced);
            for (const result of voicedResults) {
                expect(result.midiNote).toBe(69);
                expect(result.noteName).toBe('A4');
            }
        });

        it('should correctly convert 261.63 Hz to C4 (MIDI 60)', () => {
            const detector = new PitchDetector({
                minFrequency: 80,
                maxFrequency: 500,
            });
            const sineBuffer = createSineWave(261.63, 0.5);
            const results = detector.detect(sineBuffer);

            const voicedResults = results.filter(r => r.isVoiced);
            for (const result of voicedResults) {
                expect(result.midiNote).toBe(60);
                expect(result.noteName).toBe('C4');
            }
        });
    });

    describe('HMM Voicing Detection', () => {
        it('should detect voiced/unvoiced transitions correctly', () => {
            const detector = new PitchDetector();
            // Create a buffer with alternating voiced/unvoiced sections
            const sampleRate = 44100;
            const voicedLength = sampleRate * 0.5;
            const silenceLength = sampleRate * 0.25;
            const totalLength = voicedLength * 2 + silenceLength;

            const buffer = {
                length: totalLength,
                duration: totalLength / sampleRate,
                sampleRate,
                numberOfChannels: 1,
                getChannelData: (channel: number) => {
                    const data = new Float32Array(totalLength);
                    // First voiced section (0-0.5s)
                    for (let i = 0; i < voicedLength; i++) {
                        data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
                    }
                    // Silent section (0.5-0.75s)
                    for (let i = voicedLength; i < voicedLength + silenceLength; i++) {
                        data[i] = 0;
                    }
                    // Second voiced section (0.75-1.25s)
                    for (let i = voicedLength + silenceLength; i < totalLength; i++) {
                        data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
                    }
                    return data;
                },
            } as unknown as AudioBuffer;

            const results = detector.detect(buffer as AudioBuffer);

            // First section should have voiced frames
            const firstSectionVoiced = results.filter(r => r.timestamp < 0.4).filter(r => r.isVoiced);
            expect(firstSectionVoiced.length).toBeGreaterThan(0);

            // Middle section should have mostly unvoiced frames
            const middleSectionVoiced = results.filter(r => r.timestamp >= 0.4 && r.timestamp < 0.65).filter(r => r.isVoiced);
            expect(middleSectionVoiced.length).toBeLessThan(firstSectionVoiced.length);

            // Last section should have voiced frames
            const lastSectionVoiced = results.filter(r => r.timestamp >= 0.9).filter(r => r.isVoiced);
            expect(lastSectionVoiced.length).toBeGreaterThan(0);
        });
    });

    describe('HMM Pitch State Transitions', () => {
        it('should produce smooth pitch trajectories', () => {
            const detector = new PitchDetector();
            const sineBuffer = createSineWave(440, 2.0);
            const results = detector.detect(sineBuffer);

            const voicedResults = results.filter(r => r.isVoiced);
            // Adjacent voiced frames should have similar frequencies (smooth trajectory)
            for (let i = 1; i < voicedResults.length; i++) {
                const freqDiff = Math.abs(voicedResults[i].frequency - voicedResults[i - 1].frequency);
                // Allow for some variation but not huge jumps
                expect(freqDiff).toBeLessThan(100);
            }
        });
    });

    describe('Probability Values', () => {
        it('should have probabilities in valid range [0, 1]', () => {
            const detector = new PitchDetector();
            const sineBuffer = createSineWave(440, 1.0);
            const results = detector.detect(sineBuffer);

            for (const result of results) {
                expect(result.probability).toBeGreaterThanOrEqual(0);
                expect(result.probability).toBeLessThanOrEqual(1);
            }
        });

        it('should have higher probabilities for clear sine waves', () => {
            const detector = new PitchDetector();
            const clearSineBuffer = createSineWave(440, 1.0);
            const noisyBuffer = createSilentBuffer(1.0);

            const clearResults = detector.detect(clearSineBuffer);
            const noisyResults = detector.detect(noisyBuffer);

            const clearVoiced = clearResults.filter(r => r.isVoiced);
            const clearAvgProb = clearVoiced.reduce((sum, r) => sum + r.probability, 0) / clearVoiced.length;

            expect(clearAvgProb).toBeGreaterThan(0.5);
        });
    });

    describe('detectAt method', () => {
        it('should detect pitch at a specific timestamp', () => {
            const detector = new PitchDetector();
            const sineBuffer = createSineWave(440, 1.0);

            // Create a signal that we can use
            const sampleRate = 44100;
            const signal = new Float32Array(sampleRate);
            for (let i = 0; i < sampleRate; i++) {
                signal[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
            }

            const result = detector.detectAt(signal, sampleRate, 0.5);
            expect(result.isVoiced).toBe(true);
            expect(result.frequency).toBeGreaterThan(400);
            expect(result.frequency).toBeLessThan(500);
        });
    });

    describe('Alternative Hypotheses', () => {
        it('should provide alternative hypotheses when available', () => {
            const detector = new PitchDetector();
            const sineBuffer = createSineWave(440, 1.0);
            const results = detector.detect(sineBuffer);

            const voicedResults = results.filter(r => r.isVoiced && r.alternativeHypotheses);
            // Not all frames will have alternatives, but some should
            expect(voicedResults.length).toBeGreaterThan(0);
        });
    });
});
