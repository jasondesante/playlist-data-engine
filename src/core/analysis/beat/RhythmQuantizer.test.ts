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
import { MultiBandAnalyzer } from '../MultiBandAnalyzer.js';
import { TransientDetector } from './TransientDetector.js';

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
                beatInMeasure: index % 4,
                measureNumber: Math.floor(index / 4),
                confidence: 0.8,
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
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        originalMetadata: {
            algorithm: 'ellis',
            version: '1.0.0',
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            filter: 0.0,
            noiseFloorThreshold: 0,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 80,
            gaussianSmoothMs: 50,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
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
            expect(config.densityValidation.maxRetries).toBe(5);
            expect(config.densityValidation.baseSensitivityReduction).toBe(0.1);
            expect(config.densityValidation.maxCumulativeReduction).toBe(0.5);
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
            // With per-band structure, check bands.low for minIntervalDetected
            expect(result.metadata.densityValidation.bands.low.minIntervalDetected).toBe(Infinity);
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
            // Use maxRetryCount for aggregate result
            expect(result.metadata.densityValidation.maxRetryCount).toBe(0);
            expect(result.metadata.densityValidation.maxSensitivityReduction).toBe(0);
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

            // Should have triggered retry - check low band since all transients are in low band
            expect(result.metadata.densityValidation.maxRetryCount).toBeGreaterThanOrEqual(1);
            expect(result.metadata.densityValidation.maxSensitivityReduction).toBeGreaterThan(0);

            warnSpy.mockRestore();
        });
    });

    describe('density validation retry logic with linear increments', () => {
        it('should apply linear increments: 0.1, 0.2, 0.3, 0.4, 0.5', () => {
            // Suppress console.warn for this test
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            quantizer = new RhythmQuantizer({
                densityValidation: {
                    maxRetries: 3,
                    baseSensitivityReduction: 0.1,
                    maxCumulativeReduction: 0.5,
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
            // Use maxRetryCount for aggregate result
            expect(result.metadata.densityValidation.maxRetryCount).toBe(3);
            // Linear cumulative: 0.1 + 0.1 + 0.1 = 0.3
            expect(result.metadata.densityValidation.maxSensitivityReduction).toBeCloseTo(0.3, 2);

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
            expect(result.metadata.densityValidation.maxRetryCount).toBe(2);

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
            // Check aggregate properties
            expect(typeof dv.maxRetryCount).toBe('number');
            expect(typeof dv.maxSensitivityReduction).toBe('number');
            // Check per-band structure
            expect(dv.bands.low).toBeDefined();
            expect(dv.bands.mid).toBeDefined();
            expect(dv.bands.high).toBeDefined();
            // Check band-level properties
            expect(typeof dv.bands.low.minIntervalDetected).toBe('number');
            expect(typeof dv.bands.low.requiredMinInterval).toBe('number');
            expect(typeof dv.bands.low.retryCount).toBe('number');
            expect(typeof dv.bands.low.sensitivityReduction).toBe('number');
        });
    });
});

// ============================================================================
// Integration Tests - Full Pipeline
// ============================================================================

/**
 * Create a mock AudioBuffer simulating a drum track with known patterns
 *
 * Creates transients at specific intervals to simulate a basic drum pattern.
 * At 120 BPM, quarter note = 0.5s, 16th note = 0.125s
 */
function createDrumTrackAudioBuffer(
    options: {
        durationSeconds?: number;
        bpm?: number;
        sampleRate?: number;
        transientPositions?: number[]; // Specific times in seconds for transients
    } = {}
): AudioBuffer {
    const {
        durationSeconds = 4.0,
        bpm = 120,
        sampleRate = 44100,
        transientPositions,
    } = options;

    const length = Math.floor(durationSeconds * sampleRate);
    const data = new Float32Array(length);
    const quarterNoteInterval = 60 / bpm;

    // Generate transients at specific positions or create a basic pattern
    const transients = transientPositions ?? [
        // Basic 4/4 drum pattern with 16th notes
        0.0,                    // Beat 1
        quarterNoteInterval * 0.25,  // 16th after beat 1
        quarterNoteInterval * 0.5,   // 8th after beat 1
        quarterNoteInterval,         // Beat 2
        quarterNoteInterval * 1.5,   // 8th after beat 2
        quarterNoteInterval * 2,     // Beat 3
        quarterNoteInterval * 2.25,  // 16th after beat 3
        quarterNoteInterval * 2.75,  // 16th before beat 4
        quarterNoteInterval * 3,     // Beat 4
    ];

    // Create sharp transients (impulse-like) at each position
    for (const transientTime of transients) {
        if (transientTime >= durationSeconds) continue;

        const sampleIndex = Math.floor(transientTime * sampleRate);
        const transientWidth = Math.floor(0.005 * sampleRate); // 5ms transient width

        // Create a short burst of energy
        for (let i = 0; i < transientWidth && sampleIndex + i < length; i++) {
            // Gaussian-like envelope for the transient
            const envelope = Math.exp(-Math.pow((i - transientWidth / 2) / (transientWidth / 4), 2));
            data[sampleIndex + i] += envelope * 0.9;
        }
    }

    // Add low-level background noise
    for (let i = 0; i < length; i++) {
        data[i] += (Math.random() - 0.5) * 0.02;
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

describe('Integration Tests - Full Pipeline', () => {
    let multiBandAnalyzer: MultiBandAnalyzer;
    let transientDetector: TransientDetector;
    let rhythmQuantizer: RhythmQuantizer;

    beforeEach(() => {
        multiBandAnalyzer = new MultiBandAnalyzer({ peakThreshold: 0.2 });
        transientDetector = new TransientDetector({ baseThreshold: 0.2 });
        rhythmQuantizer = new RhythmQuantizer();
    });

    describe('detect transients on known drum track', () => {
        it('should detect transients in a drum track and produce quantized output', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const duration = 4.0;

            // Create drum track with known transient positions
            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions: [
                    0.0,                    // Beat 1
                    quarterNoteInterval,    // Beat 2
                    quarterNoteInterval * 2, // Beat 3
                    quarterNoteInterval * 3, // Beat 4
                ],
            });

            // Run full pipeline
            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // Verify we detected some transients
            expect(transientAnalysis.transients.length).toBeGreaterThan(0);

            // Verify we have quantized output in at least one band
            const totalBeats =
                result.streams.low.beats.length +
                result.streams.mid.beats.length +
                result.streams.high.beats.length;
            expect(totalBeats).toBeGreaterThan(0);

            // Verify structure of quantized output
            expect(result.streams.low.audioId).toBe(beatMap.audioId);
            expect(result.streams.mid.audioId).toBe(beatMap.audioId);
            expect(result.streams.high.audioId).toBe(beatMap.audioId);
        });

        it('should handle 16th note patterns correctly', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;
            const duration = 2.0;

            // Create a pattern with 16th notes
            const transientPositions: number[] = [];
            for (let beat = 0; beat < 4; beat++) {
                for (let sixteenth = 0; sixteenth < 4; sixteenth++) {
                    transientPositions.push((beat * quarterNoteInterval) + (sixteenth * sixteenthNoteInterval));
                }
            }

            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions,
            });

            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // Verify quantization produced output
            const totalBeats =
                result.streams.low.beats.length +
                result.streams.mid.beats.length +
                result.streams.high.beats.length;
            expect(totalBeats).toBeGreaterThan(0);

            // All quantized beats should have valid grid positions
            for (const stream of [result.streams.low, result.streams.mid, result.streams.high]) {
                for (const beat of stream.beats) {
                    expect(beat.beatIndex).toBeGreaterThanOrEqual(0);
                    expect(beat.gridPosition).toBeGreaterThanOrEqual(0);
                    if (beat.gridType === 'straight_16th') {
                        expect(beat.gridPosition).toBeLessThanOrEqual(3);
                    } else {
                        expect(beat.gridPosition).toBeLessThanOrEqual(2);
                    }
                }
            }
        });

        it('should produce grid decisions for beats with detected transients', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const duration = 2.0;

            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions: [
                    0.0,
                    quarterNoteInterval,
                    quarterNoteInterval * 2,
                ],
            });

            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // Check that grid decisions have correct structure
            for (const stream of [result.streams.low, result.streams.mid, result.streams.high]) {
                for (const decision of stream.gridDecisions) {
                    expect(['straight_16th', 'triplet_8th']).toContain(decision.selectedGrid);
                    expect(typeof decision.straightAvgOffset).toBe('number');
                    expect(typeof decision.tripletAvgOffset).toBe('number');
                    expect(typeof decision.confidence).toBe('number');
                }
            }
        });
    });

    describe('verify quantization aligns with beat map grid', () => {
        it('should quantize transients to exact grid positions', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;
            const duration = 2.0;

            // Create transients exactly on 16th note grid positions
            const exactGridPositions = [
                0.0,                              // Beat 0, position 0
                sixteenthNoteInterval,            // Beat 0, position 1
                sixteenthNoteInterval * 2,        // Beat 0, position 2
                quarterNoteInterval,              // Beat 1, position 0
                quarterNoteInterval + sixteenthNoteInterval * 2, // Beat 1, position 2
            ];

            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions: exactGridPositions,
            });

            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // Collect all quantized beats
            const allBeats = [
                ...result.streams.low.beats,
                ...result.streams.mid.beats,
                ...result.streams.high.beats,
            ];

            // Verify each beat's timestamp matches its theoretical grid position
            for (const beat of allBeats) {
                const beatStart = beatMap.beats[beat.beatIndex]?.timestamp ?? 0;
                let expectedTimestamp: number;

                if (beat.gridType === 'straight_16th') {
                    expectedTimestamp = beatStart + (beat.gridPosition * sixteenthNoteInterval);
                } else {
                    // Triplet grid: quarter note divided into 3 equal parts
                    const tripletInterval = quarterNoteInterval / 3;
                    expectedTimestamp = beatStart + (beat.gridPosition * tripletInterval);
                }

                // Quantized timestamp should be very close to expected (within 1ms for exact matches)
                expect(Math.abs(beat.timestamp - expectedTimestamp)).toBeLessThan(0.001);
            }
        });

        it('should handle transients slightly off-grid by snapping to nearest grid point', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const sixteenthNoteInterval = quarterNoteInterval / 4;
            const duration = 2.0;

            // Create transients slightly off-grid (by ~10ms)
            const offGridPositions = [
                0.0 + 0.010,                              // 10ms late
                sixteenthNoteInterval - 0.008,            // 8ms early
                quarterNoteInterval + 0.012,              // 12ms late
            ];

            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions: offGridPositions,
            });

            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // Collect all quantized beats
            const allBeats = [
                ...result.streams.low.beats,
                ...result.streams.mid.beats,
                ...result.streams.high.beats,
            ];

            // Verify quantization error is tracked
            for (const beat of allBeats) {
                // Quantization error should be recorded
                expect(beat.quantizationError).toBeDefined();
                expect(beat.quantizationError).toBeGreaterThanOrEqual(0);

                // After quantization, the beat should be on a valid grid position
                const beatStart = beatMap.beats[beat.beatIndex]?.timestamp ?? 0;
                let gridInterval: number;

                if (beat.gridType === 'straight_16th') {
                    gridInterval = sixteenthNoteInterval;
                } else {
                    gridInterval = quarterNoteInterval / 3;
                }

                // Verify the timestamp is at a valid grid position
                const offsetFromBeatStart = beat.timestamp - beatStart;
                const expectedGridPosition = Math.round(offsetFromBeatStart / gridInterval);
                expect(expectedGridPosition).toBe(beat.gridPosition);
            }
        });

        it('should preserve beat index assignment for quantized beats', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const duration = 4.0;

            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions: [
                    0.0,
                    quarterNoteInterval * 0.5,
                    quarterNoteInterval,
                    quarterNoteInterval * 1.5,
                    quarterNoteInterval * 2,
                    quarterNoteInterval * 2.5,
                    quarterNoteInterval * 3,
                ],
            });

            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // Collect all quantized beats
            const allBeats = [
                ...result.streams.low.beats,
                ...result.streams.mid.beats,
                ...result.streams.high.beats,
            ];

            // Each beat should be assigned to the correct beat index
            for (const beat of allBeats) {
                // The beat's timestamp should fall within the beat's time range
                const beatStartTime = beatMap.beats[beat.beatIndex]?.timestamp ?? 0;
                const beatEndTime = beatMap.beats[beat.beatIndex + 1]?.timestamp ?? (beatStartTime + quarterNoteInterval);

                expect(beat.timestamp).toBeGreaterThanOrEqual(beatStartTime - 0.001); // Allow 1ms tolerance
                expect(beat.timestamp).toBeLessThan(beatEndTime + 0.001);
            }
        });

        it('should select correct grid type based on transient pattern', () => {
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;
            const tripletInterval = quarterNoteInterval / 3;
            const duration = 2.0;

            // Create transients that fit a triplet pattern better
            const tripletPattern = [
                0.0,
                tripletInterval,
                tripletInterval * 2,
                quarterNoteInterval,
                quarterNoteInterval + tripletInterval,
                quarterNoteInterval + tripletInterval * 2,
            ];

            const audioBuffer = createDrumTrackAudioBuffer({
                durationSeconds: duration,
                bpm,
                transientPositions: tripletPattern,
            });

            const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
            const transientAnalysis = transientDetector.detect(multiBandResult);
            const beatMap = createMockUnifiedBeatMap({ bpm, duration });

            const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

            // At least some beats should have triplet grid
            const allDecisions = [
                ...result.streams.low.gridDecisions,
                ...result.streams.mid.gridDecisions,
                ...result.streams.high.gridDecisions,
            ];

            // If we detected transients and made grid decisions, verify structure
            if (allDecisions.length > 0) {
                // Grid decisions should show the reasoning
                for (const decision of allDecisions) {
                    // The grid with smaller average offset should be selected
                    if (decision.selectedGrid === 'triplet_8th') {
                        expect(decision.tripletAvgOffset).toBeLessThanOrEqual(decision.straightAvgOffset + 1);
                    } else {
                        expect(decision.straightAvgOffset).toBeLessThanOrEqual(decision.tripletAvgOffset + 1);
                    }
                }
            }
        });

        it('should handle different tempos correctly', () => {
            const testTempos = [60, 90, 120, 140, 180];

            for (const bpm of testTempos) {
                const quarterNoteInterval = 60 / bpm;
                const requiredMinInterval = quarterNoteInterval / 6; // Updated: between 16th and 32nd note
                const duration = 2.0;

                const audioBuffer = createDrumTrackAudioBuffer({
                    durationSeconds: duration,
                    bpm,
                    transientPositions: [
                        0.0,
                        quarterNoteInterval,
                        quarterNoteInterval * 2,
                        quarterNoteInterval * 3,
                    ],
                });

                const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
                const transientAnalysis = transientDetector.detect(multiBandResult);
                const beatMap = createMockUnifiedBeatMap({ bpm, duration });

                const result = rhythmQuantizer.quantize(transientAnalysis, beatMap);

                // Verify the quarterNoteInterval in beatMap is correct
                expect(beatMap.quarterNoteInterval).toBeCloseTo(quarterNoteInterval, 5);

                // Verify minimum interval calculation (between 16th and 32nd note: /6) - same for all bands
                expect(result.metadata.densityValidation.bands.low.requiredMinInterval).toBeCloseTo(requiredMinInterval, 5);
            }
        });
    });
});
