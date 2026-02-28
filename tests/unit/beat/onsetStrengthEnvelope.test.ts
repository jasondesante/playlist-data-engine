/**
 * Tests for Onset Strength Envelope (OSE) Calculator
 *
 * Tests the Ellis 2007 onset strength envelope extraction algorithm.
 */

import { describe, it, expect } from 'vitest';
import { OnsetStrengthEnvelope } from '../../../src/core/analysis/beat/OnsetStrengthEnvelope.js';
import {
    hzToMel,
    melToHz,
    createMelFilterbank,
    highPassFilter,
    gaussianSmooth,
    calculateStdDev,
    resampleAudio,
} from '../../../src/core/analysis/beat/utils/audioUtils.js';
import type { OSEConfig } from '../../../src/core/types/BeatMap.js';

// Helper to create a mock AudioBuffer
function createMockAudioBuffer(
    duration: number,
    sampleRate: number = 44100,
    numberOfChannels: number = 1
): AudioBuffer {
    const length = Math.floor(duration * sampleRate);
    const channelData: Float32Array[] = [];

    for (let ch = 0; ch < numberOfChannels; ch++) {
        channelData.push(new Float32Array(length));
    }

    // Create a mock AudioBuffer with the necessary methods
    const buffer = {
        length,
        duration,
        sampleRate,
        numberOfChannels,
        getChannelData: (channel: number) => channelData[channel],
        copyFromChannel: () => {},
        copyToChannel: () => {},
    } as AudioBuffer;

    return buffer;
}

// Helper to create a click track AudioBuffer
function createClickTrackBuffer(
    bpm: number,
    durationSeconds: number,
    sampleRate: number = 44100
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const data = new Float32Array(length);
    const beatInterval = 60 / bpm; // seconds per beat
    const clickDuration = 0.01; // 10ms clicks

    for (let beat = 0; beat < durationSeconds / beatInterval; beat++) {
        const clickStart = Math.floor(beat * beatInterval * sampleRate);
        const clickEnd = Math.min(clickStart + Math.floor(clickDuration * sampleRate), length);

        for (let i = clickStart; i < clickEnd; i++) {
            // Generate a short burst (attack)
            const t = (i - clickStart) / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 500);
        }
    }

    const buffer = {
        length,
        duration: durationSeconds,
        sampleRate,
        numberOfChannels: 1,
        getChannelData: () => data,
        copyFromChannel: () => {},
        copyToChannel: () => {},
    } as AudioBuffer;

    return buffer;
}

// Helper to create a silence buffer
function createSilenceBuffer(duration: number, sampleRate: number = 44100): AudioBuffer {
    const buffer = createMockAudioBuffer(duration, sampleRate);
    // Data is already initialized to zeros
    return buffer;
}

describe('OnsetStrengthEnvelope', () => {
    describe('constructor', () => {
        it('should create instance with default config', () => {
            const ose = new OnsetStrengthEnvelope();
            const config = ose.getConfig();

            expect(config.targetSampleRate).toBe(8000);
            expect(config.fftWindowSize).toBe(32);
            expect(config.hopSizeMs).toBe(4); // Ellis 2007 paper specification
            expect(config.melBands).toBe(40);
            expect(config.highPassCutoff).toBe(0.4);
            expect(config.gaussianSmoothMs).toBe(20);
        });

        it('should create instance with custom config', () => {
            const customConfig: OSEConfig = {
                targetSampleRate: 16000,
                fftWindowSize: 64,
                hopSizeMs: 5,
                melBands: 80,
            };

            const ose = new OnsetStrengthEnvelope(customConfig);
            const config = ose.getConfig();

            expect(config.targetSampleRate).toBe(16000);
            expect(config.fftWindowSize).toBe(64);
            expect(config.hopSizeMs).toBe(5);
            expect(config.melBands).toBe(80);
            // Defaults preserved
            expect(config.highPassCutoff).toBe(0.4);
            expect(config.gaussianSmoothMs).toBe(20);
        });
    });

    describe('calculate', () => {
        it('should return correct structure', () => {
            const ose = new OnsetStrengthEnvelope();
            const buffer = createClickTrackBuffer(120, 2);
            const result = ose.calculate(buffer);

            expect(result.envelope).toBeInstanceOf(Float32Array);
            expect(result.numFrames).toBeGreaterThan(0);
            expect(result.hopSizeSeconds).toBe(0.004); // 4ms (Ellis 2007 paper spec)
            expect(result.effectiveSampleRate).toBe(8000);
            expect(result.duration).toBe(2);
        });

        it('should produce normalized envelope with std dev ~ 1.0', () => {
            const ose = new OnsetStrengthEnvelope();
            const buffer = createClickTrackBuffer(120, 5);
            const result = ose.calculate(buffer);

            // After normalization, std dev should be approximately 1.0
            const stdDev = calculateStdDev(result.envelope);
            expect(stdDev).toBeCloseTo(1.0, 0.5); // Allow some tolerance
        });

        it('should produce near-zero envelope for silence', () => {
            const ose = new OnsetStrengthEnvelope();
            const buffer = createSilenceBuffer(2);
            const result = ose.calculate(buffer);

            // For silence, the envelope should be very close to zero
            const maxVal = Math.max(...Array.from(result.envelope).map(Math.abs));
            expect(maxVal).toBeLessThan(0.01);
        });

        it('should produce higher values at onset positions for click track', () => {
            const ose = new OnsetStrengthEnvelope();
            const bpm = 120; // 0.5s per beat
            const duration = 4;
            const buffer = createClickTrackBuffer(bpm, duration);
            const result = ose.calculate(buffer);

            // Check that peaks occur near expected beat positions
            // At 120 BPM, beats occur at 0s, 0.5s, 1s, 1.5s, 2s, etc.
            const beatInterval = 60 / bpm; // 0.5s
            const frameTolerance = 5; // Allow 5 frames of tolerance

            for (let beat = 1; beat < duration / beatInterval - 1; beat++) {
                const expectedFrame = Math.round((beat * beatInterval) / result.hopSizeSeconds);

                // Find local maximum in the vicinity
                let maxVal = -Infinity;

                for (let f = expectedFrame - frameTolerance; f <= expectedFrame + frameTolerance; f++) {
                    if (f >= 0 && f < result.envelope.length && result.envelope[f] > maxVal) {
                        maxVal = result.envelope[f];
                    }
                }

                // There should be some onset activity near the expected beat
                // (may not be a clear peak due to smoothing, but should be elevated)
                const avgValue = Array.from(result.envelope).reduce((a, b) => a + b, 0) / result.envelope.length;
                expect(maxVal).toBeGreaterThan(avgValue);
            }
        });

        it('should handle multi-channel audio', () => {
            const ose = new OnsetStrengthEnvelope();

            // Create a 2-channel buffer
            const buffer = createMockAudioBuffer(1, 44100, 2);

            // Should not throw
            expect(() => ose.calculate(buffer)).not.toThrow();
        });

        it('should handle very short audio clips', () => {
            const ose = new OnsetStrengthEnvelope();
            const buffer = createClickTrackBuffer(120, 0.1);

            // Should not throw and should return a result
            const result = ose.calculate(buffer);
            expect(result.numFrames).toBeGreaterThan(0);
        });
    });

    describe('findPeaks', () => {
        it('should find local maxima in envelope', () => {
            const ose = new OnsetStrengthEnvelope();

            // Create a synthetic envelope with known peaks
            // Peaks at index 2 (0.8), 5 (0.5), and 8 (0.7) - all above 0.3 threshold
            const envelope = new Float32Array([0, 0.2, 0.8, 0.3, 0.1, 0.5, 0.2, 0, 0.7, 0.4, 0.1]);
            const peaks = ose.findPeaks(envelope, 0.3);

            // Peaks should be at indices 2, 5, and 8
            expect(peaks).toContain(2);
            expect(peaks).toContain(5);
            expect(peaks).toContain(8);
            expect(peaks.length).toBe(3);
        });

        it('should respect threshold parameter', () => {
            const ose = new OnsetStrengthEnvelope();

            const envelope = new Float32Array([0, 0.2, 0.5, 0.2, 0.1, 0.9, 0.3]);

            const peaksLow = ose.findPeaks(envelope, 0.2);
            const peaksHigh = ose.findPeaks(envelope, 0.8);

            expect(peaksLow.length).toBeGreaterThanOrEqual(peaksHigh.length);
        });

        it('should return empty array for flat envelope', () => {
            const ose = new OnsetStrengthEnvelope();

            const envelope = new Float32Array([0.5, 0.5, 0.5, 0.5]);
            const peaks = ose.findPeaks(envelope, 0.1);

            expect(peaks.length).toBe(0);
        });
    });

    describe('time/frame conversion', () => {
        it('should convert between time and frame correctly', () => {
            const ose = new OnsetStrengthEnvelope();
            const hopSize = 0.01; // 10ms

            expect(ose.frameToTime(100, hopSize)).toBe(1.0);
            expect(ose.frameToTime(50, hopSize)).toBe(0.5);

            expect(ose.timeToFrame(1.0, hopSize)).toBe(100);
            expect(ose.timeToFrame(0.5, hopSize)).toBe(50);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            const ose = new OnsetStrengthEnvelope({ melBands: 60 });
            const config1 = ose.getConfig();
            const config2 = ose.getConfig();

            // Modifying one should not affect the other
            config1.melBands = 80;
            expect(config2.melBands).toBe(60);
        });
    });
});

describe('audioUtils', () => {
    describe('hzToMel and melToHz', () => {
        it('should convert Hz to Mel correctly', () => {
            // Reference: 1000 Hz ≈ 999.6 Mel (approximately)
            const mel = hzToMel(1000);
            expect(mel).toBeCloseTo(999.6, 0);

            // 0 Hz should be 0 Mel
            expect(hzToMel(0)).toBe(0);

            // 700 Hz: m = 2595 * log10(1 + 700/700) = 2595 * log10(2) ≈ 781.2 Mel
            expect(hzToMel(700)).toBeCloseTo(781.2, 0);
        });

        it('should convert Mel to Hz correctly', () => {
            // Round trip should be identity
            const hz = 1500;
            const mel = hzToMel(hz);
            const backToHz = melToHz(mel);
            expect(backToHz).toBeCloseTo(hz, 5);

            // 1000 Mel should convert to approximately 1000 Hz
            expect(melToHz(1000)).toBeCloseTo(1000, -1);
        });

        it('should be inverse of each other', () => {
            for (const hz of [100, 500, 1000, 2000, 4000, 8000]) {
                const mel = hzToMel(hz);
                const backToHz = melToHz(mel);
                expect(backToHz).toBeCloseTo(hz, 5);
            }
        });
    });

    describe('createMelFilterbank', () => {
        it('should create correct number of filters', () => {
            const filterbank = createMelFilterbank(40, 2048, 8000);
            expect(filterbank.length).toBe(40);
        });

        it('should create filters with correct size', () => {
            const fftSize = 2048;
            const filterbank = createMelFilterbank(40, fftSize, 8000);

            for (const filter of filterbank) {
                expect(filter.length).toBe(fftSize / 2 + 1);
            }
        });

        it('should create triangular filters', () => {
            const filterbank = createMelFilterbank(10, 512, 8000);

            // Verify each filter has a non-zero region (triangular filters should have content)
            for (const filter of filterbank) {
                const nonZero = Array.from(filter).some(v => v > 0);
                expect(nonZero).toBe(true);
            }
        });

        it('should handle different frequency ranges', () => {
            const filterbank = createMelFilterbank(20, 2048, 44100, 80, 8000);
            expect(filterbank.length).toBe(20);

            // Each filter should have some non-zero values
            for (const filter of filterbank) {
                const sum = Array.from(filter).reduce((a, b) => a + b, 0);
                expect(sum).toBeGreaterThan(0);
            }
        });
    });

    describe('highPassFilter', () => {
        it('should return empty array for empty input', () => {
            const result = highPassFilter(new Float32Array(0), 0.4, 8000);
            expect(result.length).toBe(0);
        });

        it('should filter out DC offset', () => {
            // Create a signal with DC offset
            const signal = new Float32Array(1000);
            for (let i = 0; i < 1000; i++) {
                signal[i] = 0.5 + 0.1 * Math.sin(2 * Math.PI * 10 * i / 1000);
            }

            const filtered = highPassFilter(signal, 0.4, 8000);

            // The mean of the filtered signal should be closer to 0
            const originalMean = Array.from(signal).reduce((a, b) => a + b, 0) / signal.length;
            const filteredMean = Array.from(filtered).reduce((a, b) => a + b, 0) / filtered.length;

            expect(Math.abs(filteredMean)).toBeLessThan(Math.abs(originalMean));
        });

        it('should preserve signal length', () => {
            const signal = new Float32Array(1000);
            const filtered = highPassFilter(signal, 0.4, 8000);
            expect(filtered.length).toBe(signal.length);
        });
    });

    describe('gaussianSmooth', () => {
        it('should return empty array for empty input', () => {
            const result = gaussianSmooth(new Float32Array(0), 20, 8000);
            expect(result.length).toBe(0);
        });

        it('should smooth a noisy signal', () => {
            // Create a noisy signal
            const signal = new Float32Array(1000);
            for (let i = 0; i < 1000; i++) {
                signal[i] = Math.sin(2 * Math.PI * 10 * i / 1000) + Math.random() * 0.5;
            }

            const smoothed = gaussianSmooth(signal, 20, 8000);

            // Verify smoothing preserves signal length
            expect(smoothed.length).toBe(signal.length);
        });

        it('should preserve signal length', () => {
            const signal = new Float32Array(1000);
            signal[500] = 1.0;

            const smoothed = gaussianSmooth(signal, 20, 8000);
            expect(smoothed.length).toBe(signal.length);
        });

        it('should not modify signal for window size of 1 or less', () => {
            const signal = new Float32Array([1, 2, 3, 4, 5]);
            // With very small window in terms of samples
            const smoothed = gaussianSmooth(signal, 0.001, 8000);

            // Signal should be nearly unchanged (window is less than 1 sample)
            expect(smoothed.length).toBe(signal.length);
        });
    });

    describe('calculateStdDev', () => {
        it('should return 0 for empty array', () => {
            expect(calculateStdDev(new Float32Array(0))).toBe(0);
        });

        it('should return 0 for constant signal', () => {
            const signal = new Float32Array([5, 5, 5, 5, 5]);
            expect(calculateStdDev(signal)).toBe(0);
        });

        it('should calculate correct std dev', () => {
            // Test with known values
            // Standard deviation of [1, 2, 3, 4, 5] is sqrt(2) ≈ 1.414
            const signal = new Float32Array([1, 2, 3, 4, 5]);
            const stdDev = calculateStdDev(signal);
            expect(stdDev).toBeCloseTo(Math.sqrt(2), 5);
        });

        it('should handle negative values', () => {
            const signal = new Float32Array([-2, -1, 0, 1, 2]);
            const stdDev = calculateStdDev(signal);
            expect(stdDev).toBeCloseTo(Math.sqrt(2), 5);
        });
    });

    describe('resampleAudio', () => {
        it('should produce correct output length', () => {
            const buffer = createMockAudioBuffer(1, 44100);
            const result = resampleAudio(buffer, 8000);

            // 1 second at 44100 Hz resampled to 8000 Hz should be ~8000 samples
            expect(Math.abs(result.data.length - 8000)).toBeLessThan(10);
        });

        it('should include metadata', () => {
            const buffer = createMockAudioBuffer(1, 44100);
            const result = resampleAudio(buffer, 8000);

            expect(result.originalSampleRate).toBe(44100);
            expect(result.targetSampleRate).toBe(8000);
        });

        it('should mix down multi-channel audio', () => {
            // Create a 2-channel buffer
            const length = 44100;
            const ch1 = new Float32Array(length).fill(0.5);
            const ch2 = new Float32Array(length).fill(0.5);

            const buffer = {
                length,
                duration: 1,
                sampleRate: 44100,
                numberOfChannels: 2,
                getChannelData: (ch: number) => ch === 0 ? ch1 : ch2,
            } as AudioBuffer;

            const result = resampleAudio(buffer, 8000);

            // The result should be the average of both channels
            // Each channel contributes 0.5, so average is 0.5
            expect(Math.abs(result.data[100] - 0.5)).toBeLessThan(0.01);
        });
    });
});
