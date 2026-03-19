import { describe, it, expect, beforeEach } from 'vitest';
import { TransientDetector, type TransientDetectorConfig, type TransientAnalysis, type TransientResult } from './TransientDetector.js';
import type { MultiBandResult, BandAnalysis } from '../MultiBandAnalyzer.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock MultiBandResult for testing
 */
function createMockMultiBandResult(
    options: {
        duration?: number;
        lowTransients?: { time: number; intensity: number }[];
        midTransients?: { time: number; intensity: number }[];
        highTransients?: { time: number; intensity: number }[];
    } = {}
): MultiBandResult {
    const hopSizeSeconds = 0.01; // 10ms
    const duration = options.duration ?? 1.0;
    const frameCount = Math.ceil(duration / hopSizeSeconds);

    const createBandAnalysis = (
        transients: { time: number; intensity: number }[] | undefined,
        bandName: string
    ): BandAnalysis => {
        const envelope = new Float32Array(frameCount);
        const energyOverTime = new Float32Array(frameCount);

        if (transients) {
            for (const t of transients) {
                const frame = Math.floor(t.time / hopSizeSeconds);
                if (frame >= 1 && frame < frameCount - 1) {
                    // Create a proper local maximum (peak) by setting the transient frame
                    // to the intensity and neighboring frames to lower values
                    envelope[frame] = t.intensity;
                    envelope[frame - 1] = t.intensity * 0.5;
                    envelope[frame + 1] = t.intensity * 0.5;
                    energyOverTime[frame] = t.intensity;
                    energyOverTime[frame - 1] = t.intensity * 0.5;
                    energyOverTime[frame + 1] = t.intensity * 0.5;
                }
            }
        }

        return {
            name: bandName,
            frequencyRange: { lowHz: 0, highHz: 0 },
            envelope,
            peaks: [],
            peakTimes: [],
            energy: 0.5,
            energyOverTime,
        };
    };

    const bands = new Map<string, BandAnalysis>();
    bands.set('low', createBandAnalysis(options.lowTransients, 'low'));
    bands.set('mid', createBandAnalysis(options.midTransients, 'mid'));
    bands.set('high', createBandAnalysis(options.highTransients, 'high'));

    return {
        bands,
        dominantBands: ['low', 'mid', 'high'],
        energyProfile: new Float32Array(frameCount).fill(0.5),
        metadata: {
            duration,
            hopSizeSeconds,
            effectiveSampleRate: 44100,
            bandsAnalyzed: ['low', 'mid', 'high'],
        },
    };
}

// ============================================================================
// TransientDetector Tests
// ============================================================================

describe('TransientDetector', () => {
    let detector: TransientDetector;

    describe('constructor', () => {
        it('should create a detector with default configuration', () => {
            detector = new TransientDetector();
            const config = detector.getConfig();

            expect(config.baseThreshold).toBe(0.3);
            expect(config.adaptiveThresholding).toBe(true);
            expect(config.adaptiveWindowSize).toBe(50);
            expect(config.minTransientInterval).toBe(0.02);
        });

        it('should accept custom configuration', () => {
            const config: TransientDetectorConfig = {
                baseThreshold: 0.5,
                adaptiveThresholding: false,
                adaptiveWindowSize: 100,
                minTransientInterval: 0.05,
            };

            detector = new TransientDetector(config);
            const result = detector.getConfig();

            expect(result.baseThreshold).toBe(0.5);
            expect(result.adaptiveThresholding).toBe(false);
            expect(result.adaptiveWindowSize).toBe(100);
            expect(result.minTransientInterval).toBe(0.05);
        });

        it('should throw error for invalid baseThreshold', () => {
            expect(() => new TransientDetector({ baseThreshold: -0.1 })).toThrow();
            expect(() => new TransientDetector({ baseThreshold: 1.1 })).toThrow();
        });

        it('should throw error for invalid adaptiveWindowSize', () => {
            expect(() => new TransientDetector({ adaptiveWindowSize: 0 })).toThrow();
        });

        it('should throw error for invalid minTransientInterval', () => {
            expect(() => new TransientDetector({ minTransientInterval: -0.01 })).toThrow();
        });
    });

    describe('detect', () => {
        beforeEach(() => {
            detector = new TransientDetector();
        });

        it('should return TransientAnalysis with all required properties', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
            });
            const result = detector.detect(multiBandResult);

            expect(result.transients).toBeInstanceOf(Array);
            expect(result.bandTransients).toBeInstanceOf(Map);
            expect(result.metadata).toBeDefined();
        });

        it('should detect transients in each band', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [
                    { time: 0.1, intensity: 0.8 },
                    { time: 0.3, intensity: 0.6 },
                ],
                midTransients: [
                    { time: 0.2, intensity: 0.7 },
                ],
                highTransients: [
                    { time: 0.15, intensity: 0.5 },
                ],
            });
            const result = detector.detect(multiBandResult);

            expect(result.bandTransients.has('low')).toBe(true);
            expect(result.bandTransients.has('mid')).toBe(true);
            expect(result.bandTransients.has('high')).toBe(true);
        });

        it('should include correct metadata', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 2.0,
                lowTransients: [{ time: 0.5, intensity: 0.9 }],
            });
            const result = detector.detect(multiBandResult);

            expect(result.metadata.duration).toBe(2.0);
            expect(result.metadata.totalTransients).toBeGreaterThanOrEqual(0);
            expect(result.metadata.transientsPerBand).toBeInstanceOf(Map);
            expect(result.metadata.detectionMethodsUsed).toBeInstanceOf(Array);
        });

        it('should assign correct detection methods per band', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [{ time: 0.1, intensity: 0.8 }],
                midTransients: [{ time: 0.2, intensity: 0.7 }],
                highTransients: [{ time: 0.15, intensity: 0.5 }],
            });
            const result = detector.detect(multiBandResult);

            // Check detection methods
            const lowTransients = result.bandTransients.get('low') ?? [];
            const midTransients = result.bandTransients.get('mid') ?? [];
            const highTransients = result.bandTransients.get('high') ?? [];

            for (const t of lowTransients) {
                expect(t.detectionMethod).toBe('energy');
            }
            for (const t of midTransients) {
                expect(t.detectionMethod).toBe('spectral_flux');
            }
            for (const t of highTransients) {
                expect(t.detectionMethod).toBe('hfc');
            }
        });

        it('should sort transients by timestamp', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [
                    { time: 0.5, intensity: 0.8 },
                    { time: 0.1, intensity: 0.9 },
                    { time: 0.3, intensity: 0.7 },
                ],
            });
            const result = detector.detect(multiBandResult);

            // Check that transients are sorted by timestamp
            for (let i = 1; i < result.transients.length; i++) {
                expect(result.transients[i].timestamp).toBeGreaterThanOrEqual(
                    result.transients[i - 1].timestamp
                );
            }
        });

        it('should handle empty multi-band result', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
            });
            const result = detector.detect(multiBandResult);

            expect(result.transients.length).toBe(0);
            expect(result.metadata.totalTransients).toBe(0);
            expect(result.metadata.averageIntensity).toBe(0);
        });

        it('should calculate average intensity correctly', () => {
            // Use non-adaptive thresholding for predictable behavior with sparse mock data
            const testDetector = new TransientDetector({
                adaptiveThresholding: false,
                baseThreshold: 0.3,
            });
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [
                    { time: 0.1, intensity: 0.8 },
                    { time: 0.3, intensity: 0.6 },
                ],
            });
            const result = testDetector.detect(multiBandResult);

            // Average intensity should be approximately (0.8 + 0.6) / 2 = 0.7
            expect(result.metadata.averageIntensity).toBeCloseTo(0.7, 0.1);
        });
    });

    describe('minimum transient interval', () => {
        it('should respect minTransientInterval configuration', () => {
            const customDetector = new TransientDetector({
                minTransientInterval: 0.1, // 100ms minimum
            });

            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [
                    { time: 0.1, intensity: 0.9 },
                    { time: 0.12, intensity: 0.8 }, // Too close to previous
                    { time: 0.25, intensity: 0.7 }, // Far enough
                ],
            });
            const result = customDetector.detect(multiBandResult);

            // The second transient at 0.12s should be skipped (too close to 0.1s)
            const timestamps = result.transients.map(t => t.timestamp);
            expect(timestamps).not.toContain(0.12);
        });
    });

    describe('adaptive thresholding', () => {
        it('should use adaptive threshold when enabled', () => {
            detector = new TransientDetector({
                adaptiveThresholding: true,
                baseThreshold: 0.3,
            });

            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [{ time: 0.5, intensity: 0.8 }],
            });

            // Should not throw
            const result = detector.detect(multiBandResult);
            expect(result).toBeDefined();
        });

        it('should use base threshold when adaptive is disabled', () => {
            detector = new TransientDetector({
                adaptiveThresholding: false,
                baseThreshold: 0.5,
            });

            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [{ time: 0.5, intensity: 0.8 }],
            });

            const result = detector.detect(multiBandResult);
            expect(result).toBeDefined();
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            detector = new TransientDetector();
        });

        it('should handle very short audio', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 0.1,
            });
            const result = detector.detect(multiBandResult);

            expect(result.metadata.duration).toBeCloseTo(0.1, 2);
        });

        it('should handle silence gracefully', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                // No transients
            });
            const result = detector.detect(multiBandResult);

            expect(result.transients.length).toBe(0);
            expect(result.metadata.totalTransients).toBe(0);
        });

        it('should handle single transient', () => {
            // Use non-adaptive thresholding for predictable behavior with sparse mock data
            const testDetector = new TransientDetector({
                adaptiveThresholding: false,
                baseThreshold: 0.3,
            });
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [{ time: 0.5, intensity: 0.9 }],
            });
            const result = testDetector.detect(multiBandResult);

            expect(result.transients.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('TransientResult structure', () => {
        it('should include all required fields', () => {
            const multiBandResult = createMockMultiBandResult({
                duration: 1.0,
                lowTransients: [{ time: 0.5, intensity: 0.8 }],
            });
            const result = detector.detect(multiBandResult);

            for (const transient of result.transients) {
                expect(transient.timestamp).toBeGreaterThanOrEqual(0);
                expect(transient.intensity).toBeGreaterThanOrEqual(0);
                expect(transient.intensity).toBeLessThanOrEqual(1);
                expect(['low', 'mid', 'high']).toContain(transient.band);
                expect(['energy', 'spectral_flux', 'hfc']).toContain(transient.detectionMethod);
            }
        });
    });
});
