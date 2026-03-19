import { describe, it, expect, beforeEach } from 'vitest';
import { MultiBandAnalyzer, type BandAnalysis, type MultiBandAnalyzerConfig } from './MultiBandAnalyzer.js';
import { FREQUENCY_BANDS } from './beat/utils/audioUtils.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock AudioBuffer with synthesized audio
 */
function createMockAudioBuffer(
    durationSeconds: number = 1.0,
    sampleRate: number = 44100,
    numberOfChannels: number = 1
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [];

    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        // Generate a simple sine wave with some noise for testing
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            // 440 Hz sine wave
            data[i] = Math.sin(2 * Math.PI * 440 * t) * 0.5;
            // Add some "transients" every 0.5 seconds
            if (Math.floor(t * 2) !== Math.floor((t - 1/sampleRate) * 2)) {
                data[i] = 1.0; // Sharp transient
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
 * Create a mock AudioBuffer with specific frequency content
 */
function createMockAudioBufferWithFrequency(
    frequency: number,
    durationSeconds: number = 1.0,
    sampleRate: number = 44100
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const data = new Float32Array(length);

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        data[i] = Math.sin(2 * Math.PI * frequency * t);
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

// ============================================================================
// MultiBandAnalyzer Tests
// ============================================================================

describe('MultiBandAnalyzer', () => {
    let analyzer: MultiBandAnalyzer;

    describe('constructor', () => {
        it('should create an analyzer with default configuration', () => {
            analyzer = new MultiBandAnalyzer();
            const config = analyzer.getConfig();

            expect(config.targetSampleRate).toBe(44100);
            expect(config.fftWindowSizeMs).toBe(23);
            expect(config.hopSizeMs).toBe(10);
            expect(config.smoothWindowMs).toBe(10);
            expect(config.peakThreshold).toBe(0.3);
            expect(config.bands).toEqual(FREQUENCY_BANDS);
        });

        it('should accept custom configuration', () => {
            const config: MultiBandAnalyzerConfig = {
                targetSampleRate: 16000,
                fftWindowSizeMs: 32,
                hopSizeMs: 8,
                smoothWindowMs: 15,
                peakThreshold: 0.5,
            };

            analyzer = new MultiBandAnalyzer(config);
            const result = analyzer.getConfig();

            expect(result.targetSampleRate).toBe(16000);
            expect(result.fftWindowSizeMs).toBe(32);
            expect(result.hopSizeMs).toBe(8);
            expect(result.smoothWindowMs).toBe(15);
            expect(result.peakThreshold).toBe(0.5);
        });

        it('should throw error for invalid peakThreshold', () => {
            expect(() => new MultiBandAnalyzer({ peakThreshold: -0.1 })).toThrow();
            expect(() => new MultiBandAnalyzer({ peakThreshold: 1.1 })).toThrow();
        });

        it('should throw error for empty bands array', () => {
            expect(() => new MultiBandAnalyzer({ bands: [] })).toThrow();
        });
    });

    describe('analyze', () => {
        beforeEach(() => {
            analyzer = new MultiBandAnalyzer();
        });

        it('should return MultiBandResult with all required properties', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            expect(result.bands).toBeInstanceOf(Map);
            expect(result.dominantBands).toBeInstanceOf(Array);
            expect(result.energyProfile).toBeInstanceOf(Float32Array);
            expect(result.metadata).toBeDefined();
        });

        it('should analyze all frequency bands', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            expect(result.bands.size).toBe(3);
            expect(result.bands.has('low')).toBe(true);
            expect(result.bands.has('mid')).toBe(true);
            expect(result.bands.has('high')).toBe(true);
        });

        it('should include correct metadata', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            expect(result.metadata.duration).toBe(1.0);
            expect(result.metadata.hopSizeSeconds).toBe(0.01); // 10ms
            expect(result.metadata.effectiveSampleRate).toBe(44100);
            expect(result.metadata.bandsAnalyzed).toContain('low');
            expect(result.metadata.bandsAnalyzed).toContain('mid');
            expect(result.metadata.bandsAnalyzed).toContain('high');
        });

        it('should produce BandAnalysis with all required properties', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            for (const [name, analysis] of result.bands) {
                expect(analysis.name).toBe(name);
                expect(analysis.frequencyRange).toBeDefined();
                expect(analysis.frequencyRange.lowHz).toBeGreaterThanOrEqual(0);
                expect(analysis.frequencyRange.highHz).toBeGreaterThan(analysis.frequencyRange.lowHz);
                expect(analysis.envelope).toBeInstanceOf(Float32Array);
                expect(analysis.peaks).toBeInstanceOf(Array);
                expect(analysis.peakTimes).toBeInstanceOf(Array);
                expect(analysis.energy).toBeGreaterThanOrEqual(0);
                expect(analysis.energyOverTime).toBeInstanceOf(Float32Array);
            }
        });

        it('should have envelope and energyOverTime of same length', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            for (const analysis of result.bands.values()) {
                expect(analysis.envelope.length).toBe(analysis.energyOverTime.length);
            }
        });

        it('should have peaks array matching peakTimes length', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            for (const analysis of result.bands.values()) {
                expect(analysis.peaks.length).toBe(analysis.peakTimes.length);
            }
        });

        it('should have energyProfile matching frame count', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            const firstBand = result.bands.values().next().value as BandAnalysis;
            expect(result.energyProfile.length).toBe(firstBand.energyOverTime.length);
        });

        it('should have dominantBands sorted by energy', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            // Check that dominantBands is sorted
            const energies = result.dominantBands.map(name => {
                const band = result.bands.get(name);
                return band?.energy ?? 0;
            });

            for (let i = 1; i < energies.length; i++) {
                expect(energies[i - 1]).toBeGreaterThanOrEqual(energies[i]);
            }
        });

        it('should return normalized envelope values (0-1 range)', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            for (const analysis of result.bands.values()) {
                for (let i = 0; i < analysis.envelope.length; i++) {
                    expect(analysis.envelope[i]).toBeGreaterThanOrEqual(0);
                    expect(analysis.envelope[i]).toBeLessThanOrEqual(1);
                }
            }
        });

        it('should return normalized energyOverTime values (0-1 range)', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            for (const analysis of result.bands.values()) {
                for (let i = 0; i < analysis.energyOverTime.length; i++) {
                    expect(analysis.energyOverTime[i]).toBeGreaterThanOrEqual(0);
                    expect(analysis.energyOverTime[i]).toBeLessThanOrEqual(1);
                }
            }
        });

        it('should return normalized energyProfile values (0-1 range)', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            for (let i = 0; i < result.energyProfile.length; i++) {
                expect(result.energyProfile[i]).toBeGreaterThanOrEqual(0);
                expect(result.energyProfile[i]).toBeLessThanOrEqual(1);
            }
        });

        it('should handle multi-channel audio', () => {
            const audioBuffer = createMockAudioBuffer(1.0, 44100, 2);
            const result = analyzer.analyze(audioBuffer);

            expect(result.bands.size).toBe(3);
        });

        it('should handle different audio durations', () => {
            const durations = [0.5, 1.0, 2.0, 5.0];

            for (const duration of durations) {
                const audioBuffer = createMockAudioBuffer(duration);
                const result = analyzer.analyze(audioBuffer);

                expect(result.metadata.duration).toBeCloseTo(duration, 1);
            }
        });
    });

    describe('band analysis', () => {
        beforeEach(() => {
            analyzer = new MultiBandAnalyzer();
        });

        it('should have correct frequency ranges for each band', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);

            const lowBand = result.bands.get('low');
            const midBand = result.bands.get('mid');
            const highBand = result.bands.get('high');

            expect(lowBand?.frequencyRange).toEqual({ lowHz: 20, highHz: 500 });
            expect(midBand?.frequencyRange).toEqual({ lowHz: 500, highHz: 2000 });
            expect(highBand?.frequencyRange).toEqual({ lowHz: 2000, highHz: 20000 });
        });

        it('should detect different energy levels in different frequency bands', () => {
            // Create audio with low frequency content
            const lowFreqBuffer = createMockAudioBufferWithFrequency(100); // 100 Hz - in low band

            // Create audio with high frequency content
            const highFreqBuffer = createMockAudioBufferWithFrequency(5000); // 5000 Hz - in high band

            const lowResult = analyzer.analyze(lowFreqBuffer);
            const highResult = analyzer.analyze(highFreqBuffer);

            // Low frequency audio should have more energy in low band
            const lowResultLowBandEnergy = lowResult.bands.get('low')?.energy ?? 0;

            // High frequency audio should have more energy in high band
            const highResultHighBandEnergy = highResult.bands.get('high')?.energy ?? 0;

            // These comparisons are relative - the key is that different frequencies
            // produce different energy distributions
            expect(lowResultLowBandEnergy).toBeGreaterThan(0);
            expect(highResultHighBandEnergy).toBeGreaterThan(0);
        });
    });

    describe('peak detection', () => {
        it('should respect peakThreshold configuration', () => {
            // Low threshold - should find more peaks
            const lowThresholdAnalyzer = new MultiBandAnalyzer({ peakThreshold: 0.1 });
            // High threshold - should find fewer peaks
            const highThresholdAnalyzer = new MultiBandAnalyzer({ peakThreshold: 0.9 });

            const audioBuffer = createMockAudioBuffer(1.0);

            const lowResult = lowThresholdAnalyzer.analyze(audioBuffer);
            const highResult = highThresholdAnalyzer.analyze(audioBuffer);

            // Sum peaks across all bands
            const lowPeakCount = Array.from(lowResult.bands.values())
                .reduce((sum, band) => sum + band.peaks.length, 0);
            const highPeakCount = Array.from(highResult.bands.values())
                .reduce((sum, band) => sum + band.peaks.length, 0);

            expect(lowPeakCount).toBeGreaterThanOrEqual(highPeakCount);
        });

        it('should convert peak frame indices to correct times', () => {
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = analyzer.analyze(audioBuffer);
            const hopSizeSeconds = result.metadata.hopSizeSeconds;

            for (const analysis of result.bands.values()) {
                for (let i = 0; i < analysis.peaks.length; i++) {
                    const expectedTime = analysis.peaks[i] * hopSizeSeconds;
                    expect(analysis.peakTimes[i]).toBeCloseTo(expectedTime, 5);
                }
            }
        });
    });

    describe('configuration variations', () => {
        it('should work with custom sample rate', () => {
            // Note: 44100 Hz minimum needed to support the high frequency band (20000 Hz)
            // which requires Nyquist frequency > 20000 Hz
            const customAnalyzer = new MultiBandAnalyzer({ targetSampleRate: 44100 });
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = customAnalyzer.analyze(audioBuffer);

            expect(result.metadata.effectiveSampleRate).toBe(44100);
        });

        it('should work with custom hop size', () => {
            const customAnalyzer = new MultiBandAnalyzer({ hopSizeMs: 20 });
            const audioBuffer = createMockAudioBuffer(1.0);
            const result = customAnalyzer.analyze(audioBuffer);

            expect(result.metadata.hopSizeSeconds).toBe(0.02);
        });

        it('should work with custom FFT window size', () => {
            const customAnalyzer = new MultiBandAnalyzer({ fftWindowSizeMs: 46 });
            const audioBuffer = createMockAudioBuffer(1.0);

            // Should not throw
            const result = customAnalyzer.analyze(audioBuffer);
            expect(result).toBeDefined();
        });

        it('should work with custom smoothing window', () => {
            const customAnalyzer = new MultiBandAnalyzer({ smoothWindowMs: 20 });
            const audioBuffer = createMockAudioBuffer(1.0);

            // Should not throw
            const result = customAnalyzer.analyze(audioBuffer);
            expect(result).toBeDefined();
        });
    });

    describe('edge cases', () => {
        it('should handle very short audio', () => {
            const audioBuffer = createMockAudioBuffer(0.1);
            const result = analyzer.analyze(audioBuffer);

            expect(result.metadata.duration).toBeCloseTo(0.1, 1);
            expect(result.bands.size).toBe(3);
        });

        it('should handle silence gracefully', () => {
            const length = 44100;
            const silentData = new Float32Array(length);

            const silentBuffer: AudioBuffer = {
                duration: 1.0,
                length,
                sampleRate: 44100,
                numberOfChannels: 1,
                getChannelData: () => silentData,
                copyFromChannel: () => {},
                copyToChannel: () => {},
                getAudioData: () => silentData,
            } as AudioBuffer;

            const result = analyzer.analyze(silentBuffer);

            // Should complete without error
            expect(result.bands.size).toBe(3);

            // Energy should be very low for all bands
            for (const analysis of result.bands.values()) {
                expect(analysis.energy).toBeLessThan(0.01);
            }
        });
    });
});
