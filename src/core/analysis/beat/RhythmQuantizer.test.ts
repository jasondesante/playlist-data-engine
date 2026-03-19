import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    RhythmQuantizer,
    type QuantizationConfig,
    type QuantizedBandStreams,
    type DensityValidationResult,
    type GridDecision,
    type GeneratedBeat,
    type GeneratedRhythmMap,
} from './RhythmQuantizer.js';
import type { TransientAnalysis, TransientResult } from './TransientDetector.js';
import type { UnifiedBeatMap, Beat } from '../../types/BeatMap.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock TransientAnalysis for testing
 */
function createMockTransientAnalysis(
    transients: TransientResult[]
): TransientAnalysis {
    const bandTransients = new Map<'low' | 'mid' | 'high', TransientResult[]>();
    bandTransients.set('low', transients.filter(t => t.band === 'low'));
    bandTransients.set('mid', transients.filter(t => t.band === 'mid'));
    bandTransients.set('high', transients.filter(t => t.band === 'high'));

    return {
        transients,
        bandTransients,
        metadata: {
            totalTransients: transients.length,
            transientsPerBand: new Map([
                ['low', bandTransients.get('low')?.length ?? 0],
                ['mid', bandTransients.get('mid')?.length ?? 0],
                ['high', bandTransients.get('high')?.length ?? 0],
            ]),
            duration: 10.0,
            averageIntensity: transients.length > 0
                ? transients.reduce((sum, t) => sum + t.intensity, 0) / transients.length
                : 0,
            detectionMethodsUsed: ['energy', 'spectral_flux', 'hfc'],
        },
    };
}

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(
    options: {
        duration?: number;
        bpm?: number;
        beats?: Beat[];
    } = {}
): UnifiedBeatMap {
    const duration = options.duration ?? 10.0;
    const bpm = options.bpm ?? 120;
    const quarterNoteInterval = 60 / bpm;

    // Generate beats at quarter note intervals
    const beats: Beat[] = options.beats ?? [];
    if (beats.length === 0) {
        let timestamp = 0;
        let index = 0;
        while (timestamp < duration) {
            beats.push({
                timestamp,
                intensity: 0.5,
                isDownbeat: index % 4 === 0,
            });
            timestamp += quarterNoteInterval;
            index++;
        }
    }

    return {
        audioId: 'test-audio-id',
        duration,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: {
            measureBeats: 4,
            startOffset: 0,
        },
        originalMetadata: {
            algorithm: 'ellis',
            version: '1.0.0',
            generatedAt: Date.now(),
        },
    };
}

/**
 * Create a mock transient
 */
function createTransient(
    timestamp: number,
    intensity: number,
    band: 'low' | 'mid' | 'high' = 'low'
): TransientResult {
    return {
        timestamp,
        intensity,
        band,
        detectionMethod: 'energy',
    };
}

// ============================================================================
// RhythmQuantizer Tests
// ============================================================================

describe('RhythmQuantizer', () => {
    let quantizer: RhythmQuantizer;

    describe('constructor', () => {
        it('should create a quantizer with default configuration', () => {
            quantizer = new RhythmQuantizer();
            const config = quantizer.getConfig();

            expect(config.minimumTransientIntensity).toBe(0.0);
            expect(config.densityValidation.maxRetries).toBe(3);
            expect(config.densityValidation.baseSensitivityReduction).toBe(0.1);
            expect(config.densityValidation.maxCumulativeReduction).toBe(0.7);
        });

        it('should accept custom configuration', () => {
            const config: Partial<QuantizationConfig> = {
                minimumTransientIntensity: 0.3,
                densityValidation: {
                    maxRetries: 5,
                    baseSensitivityReduction: 0.2,
                    maxCumulativeReduction: 0.9,
                },
            };

            quantizer = new RhythmQuantizer(config);
            const result = quantizer.getConfig();

            expect(result.minimumTransientIntensity).toBe(0.3);
            expect(result.densityValidation.maxRetries).toBe(5);
            expect(result.densityValidation.baseSensitivityReduction).toBe(0.2);
            expect(result.densityValidation.maxCumulativeReduction).toBe(0.9);
        });
    });

    describe('quantize - basic functionality', () => {
        beforeEach(() => {
            quantizer = new RhythmQuantizer();
        });

        it('should return QuantizedBandStreams with all required properties', () => {
            const transientAnalysis = createMockTransientAnalysis([]);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result.streams).toBeDefined();
            expect(result.streams.low).toBeDefined();
            expect(result.streams.mid).toBeDefined();
            expect(result.streams.high).toBeDefined();
            expect(result.metadata).toBeDefined();
            expect(result.metadata.densityValidation).toBeDefined();
        });

        it('should handle empty transients gracefully', () => {
            const transientAnalysis = createMockTransientAnalysis([]);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result.streams.low.beats).toHaveLength(0);
            expect(result.streams.mid.beats).toHaveLength(0);
            expect(result.streams.high.beats).toHaveLength(0);
            expect(result.metadata.densityValidation.isValid).toBe(true);
            expect(result.metadata.densityValidation.minIntervalDetected).toBe(Infinity);
        });

        it('should separate transients into correct bands', () => {
            const transients = [
                createTransient(0.5, 0.8, 'low'),
                createTransient(1.0, 0.7, 'mid'),
                createTransient(1.5, 0.6, 'high'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // Each band should have its transient quantized
            expect(result.streams.low.beats.length).toBeGreaterThanOrEqual(1);
            expect(result.streams.mid.beats.length).toBeGreaterThanOrEqual(1);
            expect(result.streams.high.beats.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('density validation', () => {
        it('should pass validation when transients are spaced at 16th note intervals or more', () => {
            quantizer = new RhythmQuantizer();
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4; // 125ms at 120 BPM

            // Transients at exactly 16th note intervals (valid)
            const transients = [
                createTransient(0.0, 0.9, 'low'),
                createTransient(sixteenthNoteInterval, 0.8, 'low'),
                createTransient(sixteenthNoteInterval * 2, 0.7, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result.metadata.densityValidation.isValid).toBe(true);
            expect(result.metadata.densityValidation.retryCount).toBe(0);
            expect(result.metadata.densityValidation.sensitivityReduction).toBe(0);
        });

        it('should trigger retry when transients are too close together', () => {
            // Suppress console.warn for this test
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            quantizer = new RhythmQuantizer();
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4; // 125ms at 120 BPM

            // Transients closer than 16th note interval (too dense)
            const transients = [
                createTransient(0.0, 0.9, 'low'),
                createTransient(sixteenthNoteInterval * 0.5, 0.2, 'low'), // 62.5ms apart - too close, low intensity
                createTransient(sixteenthNoteInterval * 2, 0.8, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // Should have triggered retry
            expect(result.metadata.densityValidation.retryCount).toBeGreaterThanOrEqual(1);
            expect(result.metadata.densityValidation.sensitivityReduction).toBeGreaterThan(0);

            warnSpy.mockRestore();
        });
    });

    describe('density validation retry logic with exponential backoff', () => {
        it('should apply exponential backoff: 0.1, 0.2, 0.4', () => {
            // Suppress console.warn for this test
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            quantizer = new RhythmQuantizer({
                densityValidation: {
                    maxRetries: 3,
                    baseSensitivityReduction: 0.1,
                    maxCumulativeReduction: 0.7,
                },
            });

            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;

            // Create transients that are too close together AND all have high intensity
            // This will force max retries since filtering won't help
            const transients: TransientResult[] = [];
            for (let i = 0; i < 10; i++) {
                transients.push(createTransient(i * 0.01, 0.9, 'low')); // 10ms apart, all high intensity
            }
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // After 3 retries, should proceed with warning
            expect(result.metadata.densityValidation.retryCount).toBe(3);
            // Cumulative should be 0.1 + 0.2 + 0.4 = 0.7
            expect(result.metadata.densityValidation.sensitivityReduction).toBeCloseTo(0.7, 2);

            warnSpy.mockRestore();
        });

        it('should filter low-intensity transients during retry', () => {
            // Suppress console.warn for this test
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            quantizer = new RhythmQuantizer();

            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;

            // Create transients where filtering by intensity would help
            const transients = [
                createTransient(0.0, 0.9, 'low'),
                createTransient(sixteenthNoteInterval * 0.3, 0.1, 'low'), // Too close, low intensity
                createTransient(sixteenthNoteInterval * 2, 0.8, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // Should have filtered some transients
            expect(result.metadata.transientsFilteredByIntensity).toBeGreaterThan(0);

            warnSpy.mockRestore();
        });

        it('should proceed after max retries even if still invalid', () => {
            // Suppress console.warn for this test
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            quantizer = new RhythmQuantizer({
                densityValidation: {
                    maxRetries: 2,
                    baseSensitivityReduction: 0.1,
                    maxCumulativeReduction: 0.3,
                },
            });

            const bpm = 120;

            // All transients very close together with high intensity
            const transients = [
                createTransient(0.0, 0.95, 'low'),
                createTransient(0.005, 0.95, 'low'), // 5ms apart
                createTransient(0.010, 0.95, 'low'), // 5ms apart
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            // Should not throw, should proceed with warning
            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result).toBeDefined();
            expect(result.metadata.densityValidation.retryCount).toBe(2);

            warnSpy.mockRestore();
        });
    });

    describe('intensity filtering', () => {
        it('should filter transients below minimum intensity threshold', () => {
            quantizer = new RhythmQuantizer({
                minimumTransientIntensity: 0.5,
            });

            const transients = [
                createTransient(0.0, 0.8, 'low'), // Above threshold
                createTransient(0.5, 0.3, 'low'), // Below threshold
                createTransient(1.0, 0.6, 'low'), // Above threshold
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // Low intensity transient should be filtered
            expect(result.metadata.transientsFilteredByIntensity).toBeGreaterThanOrEqual(1);
        });

        it('should include all transients when minimum intensity is 0', () => {
            quantizer = new RhythmQuantizer({
                minimumTransientIntensity: 0.0,
            });

            const transients = [
                createTransient(0.0, 0.1, 'low'),
                createTransient(0.5, 0.2, 'low'),
                createTransient(1.0, 0.3, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // No filtering should occur
            expect(result.metadata.transientsFilteredByIntensity).toBe(0);
        });
    });

    describe('grid detection', () => {
        beforeEach(() => {
            quantizer = new RhythmQuantizer();
        });

        it('should generate grid decisions for beats with transients', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const transients = [
                createTransient(0.0, 0.8, 'low'),
                createTransient(quarterNoteInterval, 0.7, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // Grid decisions should be made for beats with transients
            expect(result.streams.low.gridDecisions.length).toBeGreaterThanOrEqual(1);
        });

        it('should select straight_16th or triplet_8th grid type', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const transients = [
                createTransient(0.0, 0.8, 'low'),
                createTransient(quarterNoteInterval / 4, 0.7, 'low'), // 16th note
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            for (const decision of result.streams.low.gridDecisions) {
                expect(['straight_16th', 'triplet_8th']).toContain(decision.selectedGrid);
            }
        });
    });

    describe('quantization', () => {
        beforeEach(() => {
            quantizer = new RhythmQuantizer();
        });

        it('should assign correct beat index to quantized beats', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const transients = [
                createTransient(0.0, 0.8, 'low'), // Beat 0
                createTransient(quarterNoteInterval, 0.7, 'low'), // Beat 1
                createTransient(quarterNoteInterval * 2, 0.6, 'low'), // Beat 2
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            // Each transient should be assigned to its corresponding beat
            const beatIndices = result.streams.low.beats.map(b => b.beatIndex);
            expect(beatIndices).toContain(0);
            expect(beatIndices).toContain(1);
            expect(beatIndices).toContain(2);
        });

        it('should quantize timestamps to grid positions', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const transients = [
                createTransient(quarterNoteInterval * 0.24, 0.8, 'low'), // Near 16th note position 1
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            if (result.streams.low.beats.length > 0) {
                const beat = result.streams.low.beats[0];
                expect(beat.gridPosition).toBeGreaterThanOrEqual(0);
                expect(beat.gridPosition).toBeLessThanOrEqual(3);
            }
        });

        it('should include quantization error in metadata', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const transients = [
                createTransient(quarterNoteInterval * 0.24, 0.8, 'low'), // Not exactly on grid
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            if (result.streams.low.beats.length > 0) {
                const beat = result.streams.low.beats[0];
                expect(beat.quantizationError).toBeDefined();
                expect(beat.quantizationError).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            quantizer = new RhythmQuantizer();
        });

        it('should handle single transient', () => {
            const transients = [createTransient(0.5, 0.8, 'low')];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result).toBeDefined();
            expect(result.metadata.densityValidation.isValid).toBe(true);
        });

        it('should handle transients at exact beat boundaries', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const transients = [
                createTransient(0.0, 0.8, 'low'),
                createTransient(quarterNoteInterval - 0.001, 0.7, 'low'), // Just before beat boundary
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result).toBeDefined();
        });

        it('should handle very high BPM correctly', () => {
            const bpm = 200;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;

            const transients = [
                createTransient(0.0, 0.8, 'low'),
                createTransient(sixteenthNoteInterval, 0.7, 'low'),
                createTransient(sixteenthNoteInterval * 2, 0.6, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result.metadata.densityValidation.isValid).toBe(true);
        });

        it('should handle very low BPM correctly', () => {
            const bpm = 60;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;

            const transients = [
                createTransient(0.0, 0.8, 'low'),
                createTransient(sixteenthNoteInterval, 0.7, 'low'),
                createTransient(sixteenthNoteInterval * 2, 0.6, 'low'),
            ];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap({ bpm });

            const result = quantizer.quantize(transientAnalysis, beatMap);

            expect(result.metadata.densityValidation.isValid).toBe(true);
        });
    });

    describe('GeneratedBeat structure', () => {
        beforeEach(() => {
            quantizer = new RhythmQuantizer();
        });

        it('should include all required fields in quantized beats', () => {
            const transients = [createTransient(0.5, 0.8, 'low')];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            if (result.streams.low.beats.length > 0) {
                const beat = result.streams.low.beats[0];
                expect(beat.timestamp).toBeGreaterThanOrEqual(0);
                expect(beat.beatIndex).toBeGreaterThanOrEqual(0);
                expect(beat.gridPosition).toBeGreaterThanOrEqual(0);
                expect(['straight_16th', 'triplet_8th']).toContain(beat.gridType);
                expect(beat.intensity).toBeGreaterThanOrEqual(0);
                expect(beat.intensity).toBeLessThanOrEqual(1);
                expect(['low', 'mid', 'high']).toContain(beat.band);
            }
        });
    });

    describe('DensityValidationResult structure', () => {
        beforeEach(() => {
            quantizer = new RhythmQuantizer();
        });

        it('should include all required fields in density validation result', () => {
            const transients = [createTransient(0.5, 0.8, 'low')];
            const transientAnalysis = createMockTransientAnalysis(transients);
            const beatMap = createMockUnifiedBeatMap();

            const result = quantizer.quantize(transientAnalysis, beatMap);

            const dv = result.metadata.densityValidation;
            expect(typeof dv.isValid).toBe('boolean');
            expect(typeof dv.minIntervalDetected).toBe('number');
            expect(typeof dv.requiredMinInterval).toBe('number');
            expect(typeof dv.retryCount).toBe('number');
            expect(typeof dv.sensitivityReduction).toBe('number');
        });
    });
});
