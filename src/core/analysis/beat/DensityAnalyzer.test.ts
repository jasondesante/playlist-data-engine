/**
 * Unit tests for DensityAnalyzer
 *
 * Tests density calculation (notes/second), categorization, and natural
 * difficulty detection for procedural rhythm generation - Phase 2.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    DensityAnalyzer,
    type DensityCategory,
    type NaturalDifficulty,
    type BeatDensityMetrics,
    type SectionDensityMetrics,
    type BandDensityMetrics,
    type DensityAnalysisResult,
    type DensityAnalyzerConfig,
} from './DensityAnalyzer.js';
import type {
    GeneratedBeat,
    GeneratedRhythmMap,
    QuantizedBandStreams,
} from './RhythmQuantizer.js';

// ============================================================================
// Test Utilities
// ============================================================================

/** Standard BPM used across all tests (120 BPM → bpmPerSecond = 2.0) */
const TEST_BPM = 120;

/**
 * Create a mock GeneratedBeat for testing
 */
function createGeneratedBeat(
    options: {
        timestamp?: number;
        beatIndex?: number;
        gridPosition?: number;
        gridType?: 'straight_16th' | 'triplet_8th';
        intensity?: number;
        band?: 'low' | 'mid' | 'high';
    } = {}
): GeneratedBeat {
    return {
        timestamp: options.timestamp ?? 0,
        beatIndex: options.beatIndex ?? 0,
        gridPosition: options.gridPosition ?? 0,
        gridType: options.gridType ?? 'straight_16th',
        intensity: options.intensity ?? 0.5,
        band: options.band ?? 'low',
    };
}

/**
 * Create a mock GeneratedRhythmMap for testing
 */
function createMockRhythmMap(beats: GeneratedBeat[]): GeneratedRhythmMap {
    const maxBeatIndex = beats.length > 0 ? Math.max(...beats.map(b => b.beatIndex)) : 0;
    return {
        audioId: 'test-audio-id',
        duration: (maxBeatIndex + 1) * 0.5, // Assume 0.5s per beat (120 BPM)
        beats,
        gridDecisions: [],
        quarterNoteInterval: 0.5,
    };
}

/**
 * Create an empty GeneratedRhythmMap for testing
 */
function createEmptyRhythmMap(): GeneratedRhythmMap {
    return {
        audioId: 'test-audio-id',
        duration: 10.0,
        beats: [],
        gridDecisions: [],
        quarterNoteInterval: 0.5,
    };
}

/**
 * Create a mock QuantizedBandStreams for testing
 */
function createMockStreams(
    lowBeats: GeneratedBeat[],
    midBeats: GeneratedBeat[],
    highBeats: GeneratedBeat[]
): QuantizedBandStreams {
    return {
        streams: {
            low: createMockRhythmMap(lowBeats),
            mid: createMockRhythmMap(midBeats),
            high: createMockRhythmMap(highBeats),
        },
        metadata: {
            densityValidation: {
                isValid: true,
                bands: {
                    low: { band: 'low', isValid: true, minIntervalDetected: 0.125, requiredMinInterval: 0.125, retryCount: 0, sensitivityReduction: 0, finalIntensityThreshold: 0.3, transientsRemaining: 0 },
                    mid: { band: 'mid', isValid: true, minIntervalDetected: 0.125, requiredMinInterval: 0.125, retryCount: 0, sensitivityReduction: 0, finalIntensityThreshold: 0.3, transientsRemaining: 0 },
                    high: { band: 'high', isValid: true, minIntervalDetected: 0.125, requiredMinInterval: 0.125, retryCount: 0, sensitivityReduction: 0, finalIntensityThreshold: 0.3, transientsRemaining: 0 },
                },
                maxRetryCount: 0,
                maxSensitivityReduction: 0,
            },
            transientsFilteredByIntensity: 0,
            transientsFilteredByBand: { low: 0, mid: 0, high: 0 },
        },
    };
}

// ============================================================================
// DensityAnalyzer Tests
// ============================================================================

describe('DensityAnalyzer', () => {
    let analyzer: DensityAnalyzer;

    describe('constructor', () => {
        it('should create an analyzer with default configuration', () => {
            analyzer = new DensityAnalyzer();
            expect(analyzer).toBeDefined();

            const config = analyzer.getConfig();
            expect(config.beatsPerSection).toBe(8);
            expect(config.sparseThreshold).toBe(0.9);
            expect(config.denseThreshold).toBe(1.2);
        });

        it('should accept custom configuration', () => {
            const config: Partial<DensityAnalyzerConfig> = {
                beatsPerSection: 4,
                sparseThreshold: 1.0,
                denseThreshold: 6.0,
            };

            analyzer = new DensityAnalyzer(config);
            expect(analyzer).toBeDefined();

            const actualConfig = analyzer.getConfig();
            expect(actualConfig.beatsPerSection).toBe(4);
            expect(actualConfig.sparseThreshold).toBe(1.0);
            expect(actualConfig.denseThreshold).toBe(6.0);
        });
    });

    describe('analyze - basic functionality', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should return DensityAnalysisResult with all required properties', () => {
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            expect(result.bandMetrics).toBeDefined();
            expect(result.combinedMetrics).toBeDefined();
            expect(result.sections).toBeDefined();
            expect(result.perBeatDensity).toBeDefined();
        });

        it('should handle empty streams gracefully', () => {
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // All metrics should be zero for empty streams
            expect(result.combinedMetrics.totalTransients).toBe(0);
            expect(result.combinedMetrics.notesPerSecond).toBe(0);
            expect(result.bandMetrics.low.totalTransients).toBe(0);
            expect(result.bandMetrics.mid.totalTransients).toBe(0);
            expect(result.bandMetrics.high.totalTransients).toBe(0);
        });

        it('should return bandAnalysis for all three bands', () => {
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            expect(result.bandMetrics.low).toBeDefined();
            expect(result.bandMetrics.mid).toBeDefined();
            expect(result.bandMetrics.high).toBeDefined();
            expect(result.bandMetrics.low.band).toBe('low');
            expect(result.bandMetrics.mid.band).toBe('mid');
            expect(result.bandMetrics.high.band).toBe('high');
        });
    });

    describe('density calculation', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should calculate correct notes per second for sparse patterns', () => {
            // Create sparse pattern: 1 transient per beat
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 3, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 4 beats, 4 transients = 1.0 transients per beat
            // At 120 BPM: 1.0 * (120/60) = 2.0 notes/sec
            expect(result.bandMetrics.low.notesPerSecond).toBe(2.0);
            expect(result.combinedMetrics.notesPerSecond).toBe(2.0);
        });

        it('should calculate correct notes per second for moderate patterns', () => {
            // Create moderate pattern: 2 transients per beat
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 0, gridPosition: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 3, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 3, gridPosition: 2, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 4 beats, 8 transients = 2.0 transients per beat
            // At 120 BPM: 2.0 * (120/60) = 4.0 notes/sec
            expect(result.bandMetrics.low.notesPerSecond).toBe(4.0);
        });

        it('should calculate correct notes per second for dense patterns', () => {
            // Create dense pattern: 4 transients per beat (16th notes)
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                for (let gridPosition = 0; gridPosition < 4; gridPosition++) {
                    beats.push(createGeneratedBeat({
                        beatIndex,
                        gridPosition,
                        band: 'low'
                    }));
                }
            }

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 4 beats, 16 transients = 4.0 transients per beat
            // At 120 BPM: 4.0 * (120/60) = 8.0 notes/sec
            expect(result.bandMetrics.low.notesPerSecond).toBe(8.0);
        });

        it('should combine transients from all bands', () => {
            const lowBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
            ];
            const midBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'mid' }),
            ];
            const highBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'high' }),
            ];

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Combined: 1 beat, 3 transients = 3.0 per beat
            // At 120 BPM: 3.0 * (120/60) = 6.0 notes/sec
            expect(result.combinedMetrics.totalTransients).toBe(3);
            expect(result.combinedMetrics.notesPerSecond).toBe(6.0);
        });

        it('should calculate min and max notes per second', () => {
            // Variable density: beat 0 has 1, beat 1 has 3, beat 2 has 2
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 1, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 2, band: 'high' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 2, band: 'mid' }),
            ];

            const streams = createMockStreams(
                beats.filter(b => b.band === 'low'),
                beats.filter(b => b.band === 'mid'),
                beats.filter(b => b.band === 'high')
            );

            const result = analyzer.analyze(streams, TEST_BPM);

            // Per beat: 1, 3, 2 transients
            expect(result.combinedMetrics.totalTransients).toBe(6);
            // Average: 6 / 3 = 2.0 t/b → 4.0 n/s at 120 BPM
            expect(result.combinedMetrics.notesPerSecond).toBeCloseTo(4.0, 0.01);
        });

        it('should scale notes per second with BPM', () => {
            // Same pattern at different BPMs should give different notes/sec
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, band: 'low' }),
            ];
            const streams = createMockStreams(beats, [], []);

            // 2 beats, 2 transients = 1.0 t/b
            const result120 = analyzer.analyze(streams, 120);
            // 1.0 * (120/60) = 2.0 n/s
            expect(result120.bandMetrics.low.notesPerSecond).toBe(2.0);

            const result180 = analyzer.analyze(streams, 180);
            // 1.0 * (180/60) = 3.0 n/s
            expect(result180.bandMetrics.low.notesPerSecond).toBe(3.0);

            const result60 = analyzer.analyze(streams, 60);
            // 1.0 * (60/60) = 1.0 n/s
            expect(result60.bandMetrics.low.notesPerSecond).toBe(1.0);
        });
    });

    describe('density categorization', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should categorize sparse density correctly (notesPerSecond < 0.9)', () => {
            // Sparse: 2 transients across 5 beats = 0.4 per beat → 0.8 n/s at 120 BPM
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 4, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 5 beats, 2 transients = 0.4 per beat → 0.8 n/s (< 0.9 = sparse)
            expect(result.combinedMetrics.densityCategory).toBe('sparse');
        });

        it('should categorize moderate density correctly (0.9 <= notesPerSecond <= 1.2)', () => {
            // Moderate: 3 transients across 6 beats = 0.5 per beat → 1.0 n/s at 120 BPM
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 5, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 6 beats, 3 transients = 0.5 per beat → 1.0 n/s (moderate)
            expect(result.combinedMetrics.densityCategory).toBe('moderate');
        });

        it('should categorize dense density correctly (notesPerSecond > 1.2)', () => {
            // Dense: 3 transients per beat = 3.0 per beat → 6.0 n/s at 120 BPM
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 0, band: 'low' }));
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low' }));
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 2, band: 'low' }));
            }

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 4 beats, 12 transients = 3.0 per beat → 6.0 n/s (> 1.2 = dense)
            expect(result.combinedMetrics.densityCategory).toBe('dense');
        });

        it('should use custom thresholds when configured', () => {
            analyzer = new DensityAnalyzer({
                sparseThreshold: 1.0,
                denseThreshold: 6.0,
            });

            // 1.0 transients per beat → 2.0 n/s at 120 BPM
            // Would be dense with defaults (2.0 > 1.2), but moderate with custom (1.0 < 2.0 < 6.0)
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 3, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 2.0 n/s: > 1.0 (sparse threshold), < 6.0 (dense threshold) = moderate
            expect(result.combinedMetrics.densityCategory).toBe('moderate');
        });
    });

    describe('natural difficulty detection', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should map sparse density to easy difficulty', () => {
            const result = analyzer.determineNaturalDifficulty('sparse');
            expect(result).toBe('easy');
        });

        it('should map moderate density to medium difficulty', () => {
            const result = analyzer.determineNaturalDifficulty('moderate');
            expect(result).toBe('medium');
        });

        it('should map dense density to hard difficulty', () => {
            const result = analyzer.determineNaturalDifficulty('dense');
            expect(result).toBe('hard');
        });

        it('should determine natural difficulty from density in analysis', () => {
            // Sparse pattern: 5 beats, 2 transients = 0.4 t/b → 0.8 n/s
            const sparseBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 4, band: 'low' }),
            ];
            const sparseStreams = createMockStreams(sparseBeats, [], []);
            const sparseResult = analyzer.analyze(sparseStreams, TEST_BPM);
            expect(sparseResult.combinedMetrics.naturalDifficulty).toBe('easy');

            // Moderate pattern: 0.5 t/b → 1.0 n/s (3 transients over 6 beats)
            const moderateBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 5, band: 'low' }),
            ];
            const moderateStreams = createMockStreams(moderateBeats, [], []);
            const moderateResult = analyzer.analyze(moderateStreams, TEST_BPM);
            expect(moderateResult.combinedMetrics.naturalDifficulty).toBe('medium');

            // Dense pattern: 4 t/b → 8.0 n/s (16 transients over 4 beats)
            const denseBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 4; i++) {
                for (let pos = 0; pos < 4; pos++) {
                    denseBeats.push(createGeneratedBeat({ beatIndex: i, gridPosition: pos, band: 'low' }));
                }
            }
            const denseStreams = createMockStreams(denseBeats, [], []);
            const denseResult = analyzer.analyze(denseStreams, TEST_BPM);
            expect(denseResult.combinedMetrics.naturalDifficulty).toBe('hard');
        });
    });

    describe('per-beat density tracking', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should track per-beat density for all beats', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 0, gridPosition: 2, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 1, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'high' }),
            ];

            const streams = createMockStreams(
                beats.filter(b => b.band === 'low'),
                beats.filter(b => b.band === 'mid'),
                beats.filter(b => b.band === 'high')
            );

            const result = analyzer.analyze(streams, TEST_BPM);

            // Should have per-beat density for beats 0, 1, 2
            expect(result.perBeatDensity.length).toBe(3);

            // Beat 0: 2 transients
            const beat0 = result.perBeatDensity.find(b => b.beatIndex === 0);
            expect(beat0?.transientCount).toBe(2);
            expect(beat0?.bands).toContain('low');
            expect(beat0?.bands).toContain('mid');

            // Beat 1: 1 transient
            const beat1 = result.perBeatDensity.find(b => b.beatIndex === 1);
            expect(beat1?.transientCount).toBe(1);
            expect(beat1?.bands).toContain('low');

            // Beat 2: 1 transient
            const beat2 = result.perBeatDensity.find(b => b.beatIndex === 2);
            expect(beat2?.transientCount).toBe(1);
            expect(beat2?.bands).toContain('high');
        });

        it('should calculate average intensity per beat', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, intensity: 0.5, band: 'low' }),
                createGeneratedBeat({ beatIndex: 0, gridPosition: 2, intensity: 0.7, band: 'mid' }),
            ];

            const streams = createMockStreams(
                beats.filter(b => b.band === 'low'),
                beats.filter(b => b.band === 'mid'),
                []
            );

            const result = analyzer.analyze(streams, TEST_BPM);

            const beat0 = result.perBeatDensity.find(b => b.beatIndex === 0);
            expect(beat0?.averageIntensity).toBeCloseTo(0.6, 0.01);
        });

        it('should handle beats with no transients', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'low' }), // Skip beat 1
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Beat 1 should have 0 transients
            const beat1 = result.perBeatDensity.find(b => b.beatIndex === 1);
            expect(beat1?.transientCount).toBe(0);
            expect(beat1?.bands.length).toBe(0);
        });
    });

    describe('section-based analysis', () => {
        it('should divide track into sections based on beatsPerSection config', () => {
            analyzer = new DensityAnalyzer({ beatsPerSection: 4 });

            // Create 12 beats worth of data
            const beats: GeneratedBeat[] = [];
            for (let i = 0; i < 12; i++) {
                beats.push(createGeneratedBeat({ beatIndex: i, band: 'low' }));
            }

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 12 beats / 4 beats per section = 3 sections
            expect(result.sections.length).toBe(3);

            // Each section should have correct beat range
            expect(result.sections[0].startBeat).toBe(0);
            expect(result.sections[0].endBeat).toBe(3);
            expect(result.sections[1].startBeat).toBe(4);
            expect(result.sections[1].endBeat).toBe(7);
            expect(result.sections[2].startBeat).toBe(8);
            expect(result.sections[2].endBeat).toBe(11);
        });

        it('should calculate section-level density metrics in notes per second', () => {
            analyzer = new DensityAnalyzer({ beatsPerSection: 4 });

            // Section 0 (beats 0-3): sparse (1 transient = 0.25 t/b → 0.5 n/s)
            // Section 1 (beats 4-7): dense (4 transients per beat = 4.0 t/b → 8.0 n/s)
            const beats: GeneratedBeat[] = [];

            // Section 0: 1 transient across 4 beats = 0.25 t/b
            beats.push(createGeneratedBeat({ beatIndex: 0, band: 'low' }));

            // Section 1: 4 transients per beat
            for (let i = 4; i < 8; i++) {
                for (let pos = 0; pos < 4; pos++) {
                    beats.push(createGeneratedBeat({ beatIndex: i, gridPosition: pos, band: 'low' }));
                }
            }

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Section 0 should be sparse/easy (0.25 t/b → 0.5 n/s < 0.9)
            expect(result.sections[0].densityCategory).toBe('sparse');
            expect(result.sections[0].naturalDifficulty).toBe('easy');
            expect(result.sections[0].notesPerSecond).toBe(0.5);

            // Section 1 should be dense/hard (4.0 t/b → 8.0 n/s > 1.2)
            expect(result.sections[1].densityCategory).toBe('dense');
            expect(result.sections[1].naturalDifficulty).toBe('hard');
            expect(result.sections[1].notesPerSecond).toBe(8.0);
        });

        it('should track min and max notes per second in each section', () => {
            analyzer = new DensityAnalyzer({ beatsPerSection: 4 });

            const beats: GeneratedBeat[] = [
                // Beat 0: 1 transient
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                // Beat 1: 2 transients
                createGeneratedBeat({ beatIndex: 1, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 2, band: 'mid' }),
                // Beat 2: 3 transients
                createGeneratedBeat({ beatIndex: 2, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 1, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 2, band: 'high' }),
                // Beat 3: 0 transients (not created - will be 0 in combined analysis)
                // Beat 4: 1 transient (to extend total beats to 5, making beat 3 exist with 0)
                createGeneratedBeat({ beatIndex: 4, band: 'low' }),
            ];

            const streams = createMockStreams(
                beats.filter(b => b.band === 'low'),
                beats.filter(b => b.band === 'mid'),
                beats.filter(b => b.band === 'high')
            );

            const result = analyzer.analyze(streams, TEST_BPM);

            // Section 0 (beats 0-3) min/max in notes per second
            // Beat 0: 1 t/b → 2.0 n/s, Beat 1: 2 t/b → 4.0 n/s, Beat 2: 3 t/b → 6.0 n/s, Beat 3: 0 → 0 n/s
            expect(result.sections[0].minNotesPerSecond).toBe(0);
            expect(result.sections[0].maxNotesPerSecond).toBe(6.0);
        });

        it('should handle partial final sections', () => {
            analyzer = new DensityAnalyzer({ beatsPerSection: 8 });

            // Create 10 beats (partial final section)
            const beats: GeneratedBeat[] = [];
            for (let i = 0; i < 10; i++) {
                beats.push(createGeneratedBeat({ beatIndex: i, band: 'low' }));
            }

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 10 beats / 8 beats per section = 2 sections (8 + 2)
            expect(result.sections.length).toBe(2);

            // Second section should have only 2 beats
            expect(result.sections[1].beatCount).toBe(2);
            expect(result.sections[1].startBeat).toBe(8);
            expect(result.sections[1].endBeat).toBe(9);
        });
    });

    describe('band-specific metrics', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should calculate separate metrics for each band in notes per second', () => {
            // Low band: 2 beats, 3 transients = 1.5 t/b → 3.0 n/s (moderate)
            const lowBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 2, band: 'low' }),
            ];
            // Mid band: 2 beats, 6 transients = 3.0 t/b → 6.0 n/s (dense)
            const midBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 0, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 0, gridPosition: 1, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 0, gridPosition: 2, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 0, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 1, band: 'mid' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 2, band: 'mid' }),
            ];
            const highBeats: GeneratedBeat[] = [];

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Low band: 2 beats, 3 transients = 1.5 t/b → 3.0 n/s (hard, > 1.2)
            expect(result.bandMetrics.low.notesPerSecond).toBe(3.0);
            expect(result.bandMetrics.low.naturalDifficulty).toBe('hard');

            // Mid band: 2 beats, 6 transients = 3.0 t/b → 6.0 n/s (dense, > 1.2)
            expect(result.bandMetrics.mid.notesPerSecond).toBe(6.0);
            expect(result.bandMetrics.mid.naturalDifficulty).toBe('hard');

            // High band: empty
            expect(result.bandMetrics.high.totalTransients).toBe(0);
            expect(result.bandMetrics.high.naturalDifficulty).toBe('easy');
        });

        it('should calculate variance for each band', () => {
            // Create variable density pattern
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 0, gridPosition: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 2, band: 'low' }),
                createGeneratedBeat({ beatIndex: 3, band: 'low' }), // Different: 1 transient
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Variance should be > 0 because beat 3 has different count
            expect(result.bandMetrics.low.variance).toBeGreaterThan(0);
        });

        it('should include per-beat density for each band', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 1, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Low band should have per-beat density
            expect(result.bandMetrics.low.perBeatDensity.length).toBeGreaterThan(0);
            expect(result.bandMetrics.low.perBeatDensity[0].transientCount).toBe(1);
        });
    });

    describe('categorizeDensity public method', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should return sparse for values below sparseThreshold', () => {
            expect(analyzer.categorizeDensity(0.0)).toBe('sparse');
            expect(analyzer.categorizeDensity(0.5)).toBe('sparse');
            expect(analyzer.categorizeDensity(0.89)).toBe('sparse');
        });

        it('should return moderate for values between thresholds', () => {
            expect(analyzer.categorizeDensity(0.9)).toBe('moderate');
            expect(analyzer.categorizeDensity(1.0)).toBe('moderate');
            expect(analyzer.categorizeDensity(1.1)).toBe('moderate');
            expect(analyzer.categorizeDensity(1.2)).toBe('moderate');
        });

        it('should return dense for values above denseThreshold', () => {
            expect(analyzer.categorizeDensity(1.21)).toBe('dense');
            expect(analyzer.categorizeDensity(6.0)).toBe('dense');
            expect(analyzer.categorizeDensity(10.0)).toBe('dense');
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            analyzer = new DensityAnalyzer();
        });

        it('should handle single beat', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            expect(result.combinedMetrics.totalTransients).toBe(1);
            expect(result.perBeatDensity.length).toBe(1);
            expect(result.sections.length).toBe(1);
        });

        it('should handle very high density (maximum subdivision)', () => {
            const beats: GeneratedBeat[] = [];
            // 4 transients per beat across 4 beats
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                for (let pos = 0; pos < 4; pos++) {
                    beats.push(createGeneratedBeat({ beatIndex, gridPosition: pos, band: 'low' }));
                }
            }

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // 4.0 t/b → 8.0 n/s
            expect(result.bandMetrics.low.notesPerSecond).toBe(8.0);
            expect(result.bandMetrics.low.maxNotesPerSecond).toBe(8.0);
            expect(result.combinedMetrics.densityCategory).toBe('dense');
        });

        it('should handle beats with gaps', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, band: 'low' }),
                createGeneratedBeat({ beatIndex: 5, band: 'low' }), // Gap of 4 beats
                createGeneratedBeat({ beatIndex: 10, band: 'low' }), // Gap of 4 beats
            ];

            const streams = createMockStreams(beats, [], []);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Should have per-beat density for all beats (including gaps)
            expect(result.perBeatDensity.length).toBe(11); // 0 to 10 inclusive
            expect(result.combinedMetrics.totalTransients).toBe(3);
        });

        it('should handle multiple bands with same beat index', () => {
            const lowBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 0, band: 'low' }),
            ];
            const midBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 1, band: 'mid' }),
            ];
            const highBeats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 2, band: 'high' }),
            ];

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            const result = analyzer.analyze(streams, TEST_BPM);

            // Beat 0 should have 3 transients from all bands
            const beat0 = result.perBeatDensity.find(b => b.beatIndex === 0);
            expect(beat0?.transientCount).toBe(3);
            expect(beat0?.bands).toContain('low');
            expect(beat0?.bands).toContain('mid');
            expect(beat0?.bands).toContain('high');
        });
    });
});
