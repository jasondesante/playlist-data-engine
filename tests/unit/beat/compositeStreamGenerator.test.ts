/**
 * Unit Tests for CompositeStreamGenerator
 *
 * Tests the composite stream generation by combining highest-scoring sections
 * from each frequency band.
 *
 * Reference: docs/plans/procedural-rhythm-generation.md Phase 3.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeStreamGenerator } from '../../../src/core/analysis/beat/CompositeStreamGenerator.js';
import { StreamScorer } from '../../../src/core/analysis/beat/StreamScorer.js';
import { PhraseAnalyzer } from '../../../src/core/analysis/beat/PhraseAnalyzer.js';
import { DensityAnalyzer } from '../../../src/core/analysis/beat/DensityAnalyzer.js';
import type {
    GeneratedBeat,
    GeneratedRhythmMap,
    QuantizedBandStreams,
    GridDecision,
} from '../../../src/core/analysis/beat/RhythmQuantizer.js';
import type { GridType } from '../../../src/core/analysis/beat/RhythmQuantizer.js';
import type { Band } from '../../../src/core/analysis/beat/StreamScorer.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock GeneratedBeat for testing
 */
function createGeneratedBeat(
    options: {
        timestamp?: number;
        beatIndex?: number;
        gridPosition?: number;
        gridType?: GridType;
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
function createMockRhythmMap(
    beats: GeneratedBeat[],
    audioId: string = 'test-audio-id',
    duration: number = 10.0,
    quarterNoteInterval: number = 0.5
): GeneratedRhythmMap {
    const maxBeatIndex = beats.length > 0 ? Math.max(...beats.map(b => b.beatIndex)) : 0;
    const gridDecisions: GridDecision[] = [];

    // Create grid decisions for each beat
    for (let i = 0; i <= maxBeatIndex; i++) {
        const beatsInBeat = beats.filter(b => b.beatIndex === i);
        gridDecisions.push({
            beatIndex: i,
            selectedGrid: beatsInBeat.some(b => b.gridType === 'triplet_8th')
                ? 'triplet_8th'
                : 'straight_16th',
            straightAvgOffset: 10,
            tripletAvgOffset: 20,
            transientCount: beatsInBeat.length,
            confidence: 0.8,
        });
    }

    return {
        audioId,
        duration,
        beats,
        gridDecisions,
        quarterNoteInterval,
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
    const maxBeatIndex = Math.max(
        ...lowBeats.map(b => b.beatIndex),
        ...midBeats.map(b => b.beatIndex),
        ...highBeats.map(b => b.beatIndex),
        0
    );

    const duration = (maxBeatIndex + 1) * 0.5; // Assume 0.5s per beat (120 BPM)

    return {
        streams: {
            low: createMockRhythmMap(lowBeats, 'test-audio-id', duration),
            mid: createMockRhythmMap(midBeats, 'test-audio-id', duration),
            high: createMockRhythmMap(highBeats, 'test-audio-id', duration),
        },
        metadata: {
            densityValidation: {
                isValid: true,
                minIntervalDetected: 0.125,
                requiredMinInterval: 0.125,
                retryCount: 0,
                sensitivityReduction: 0,
            },
            transientsFilteredByIntensity: 0,
        },
    };
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('CompositeStreamGenerator', () => {
    let generator: CompositeStreamGenerator;
    let scorer: StreamScorer;
    let phraseAnalyzer: PhraseAnalyzer;
    let densityAnalyzer: DensityAnalyzer;

    describe('Constructor and Configuration', () => {
        it('should create a generator with default configuration', () => {
            generator = new CompositeStreamGenerator();
            const config = generator.getConfig();

            expect(config.transitionOverlapBeats).toBe(0);
            expect(config.preserveGridDecisions).toBe(true);
        });

        it('should accept custom configuration', () => {
            generator = new CompositeStreamGenerator({
                transitionOverlapBeats: 2,
                preserveGridDecisions: false,
            });
            const config = generator.getConfig();

            expect(config.transitionOverlapBeats).toBe(2);
            expect(config.preserveGridDecisions).toBe(false);
        });
    });

    describe('Composite Stream Generation', () => {
        beforeEach(() => {
            generator = new CompositeStreamGenerator();
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should generate a composite stream with beats from winning sections', async () => {
            // Create patterns where mid band wins (syncopated)
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Low: sparse (boring)
            for (let i = 0; i < 16; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.5,
                    band: 'low',
                }));
            }

            // Mid: syncopated with optimal density (interesting)
            for (let i = 0; i < 16; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1, // Syncopated
                    intensity: 0.8,
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.8,
                    band: 'mid',
                }));
            }

            // High: also sparse
            for (let i = 0; i < 16; i++) {
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.5,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Composite should have beats
            expect(composite.beats.length).toBeGreaterThan(0);

            // All beats should have a sourceBand
            for (const beat of composite.beats) {
                expect(beat.sourceBand).toBeDefined();
                expect(['low', 'mid', 'high']).toContain(beat.sourceBand);
            }
        });

        it('should generate composite sections matching section winners', async () => {
            // Create patterns where different bands win different sections
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Section 1 (beats 0-7): Mid wins (syncopated)
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.9,
                    band: 'mid',
                }));
            }

            // Section 2 (beats 8-15): High wins (varied pattern)
            for (let i = 8; i < 16; i++) {
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + (i % 2 === 0 ? 0.125 : 0.25),
                    beatIndex: i,
                    gridPosition: i % 2 === 0 ? 1 : 2,
                    intensity: 0.9,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should have sections
            expect(composite.sections.length).toBeGreaterThan(0);

            // Each section should have a sourceBand and score
            for (const section of composite.sections) {
                expect(section.sourceBand).toBeDefined();
                expect(['low', 'mid', 'high']).toContain(section.sourceBand);
                expect(section.score).toBeGreaterThanOrEqual(0);
                expect(section.beatRange.start).toBeLessThanOrEqual(section.beatRange.end);
            }
        });

        it('should determine natural difficulty from density analysis', async () => {
            // Create a dense pattern (should be 'hard')
            const highBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                for (let pos = 0; pos < 4; pos++) {
                    highBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + pos * 0.125,
                        beatIndex: i,
                        gridPosition: pos,
                        intensity: 0.7,
                        band: 'high',
                    }));
                }
            }

            const streams = createMockStreams([], [], highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Dense pattern should be 'hard'
            expect(composite.naturalDifficulty).toBe('hard');
        });

        it('should set natural difficulty to easy for sparse patterns', async () => {
            // Create a sparse pattern (should be 'easy')
            // 4 beats across 13 quarter notes = 0.31 t/b → 0.62 n/s at 120 BPM (sparse < 0.9)
            const lowBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 4; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 2.0,
                    beatIndex: i * 4,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Sparse pattern should be 'easy'
            expect(composite.naturalDifficulty).toBe('easy');
        });

        it('should set natural difficulty to medium for moderate patterns', async () => {
            // Create a moderate pattern (should be 'medium')
            // Moderate range: 0.9 - 1.2 notes/sec
            // 8 beats across 15 quarter notes = 0.53 t/b → 1.07 n/s at 120 BPM (solidly in moderate range)
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 1.0,
                    beatIndex: i * 2,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Moderate pattern (8 beats / 15 quarter notes ≈ 1.07 notes/sec at 120 BPM) should be 'medium'
            expect(composite.naturalDifficulty).toBe('medium');
        });
    });

    describe('Metadata', () => {
        beforeEach(() => {
            generator = new CompositeStreamGenerator();
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should include accurate beat counts per band', async () => {
            // Create pattern where mid band wins section 1, high band wins section 2
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Section 1: Mid wins
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.9,
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.9,
                    band: 'mid',
                }));
            }

            // Section 2: High wins
            for (let i = 8; i < 16; i++) {
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + (i % 2 === 0 ? 0.125 : 0.375),
                    beatIndex: i,
                    gridPosition: i % 2 === 0 ? 1 : 3,
                    intensity: 0.9,
                    band: 'high',
                }));
            }

            const streams = createMockStreams([], midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should track beats per band
            expect(composite.metadata.beatsPerBand).toBeDefined();
            expect(typeof composite.metadata.beatsPerBand.low).toBe('number');
            expect(typeof composite.metadata.beatsPerBand.mid).toBe('number');
            expect(typeof composite.metadata.beatsPerBand.high).toBe('number');

            // Total should match
            const totalBeatsFromBands =
                composite.metadata.beatsPerBand.low +
                composite.metadata.beatsPerBand.mid +
                composite.metadata.beatsPerBand.high;
            expect(totalBeatsFromBands).toBe(composite.metadata.totalBeats);
        });

        it('should include section count', async () => {
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            expect(composite.metadata.sectionCount).toBe(composite.sections.length);
        });

        it('should calculate sections per band percentages', async () => {
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.9,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should have percentages
            expect(composite.metadata.sectionsPerBand).toBeDefined();
            expect(typeof composite.metadata.sectionsPerBand.low).toBe('number');
            expect(typeof composite.metadata.sectionsPerBand.mid).toBe('number');
            expect(typeof composite.metadata.sectionsPerBand.high).toBe('number');

            // Percentages should sum to 1 (or close due to floating point)
            const total = composite.metadata.sectionsPerBand.low +
                composite.metadata.sectionsPerBand.mid +
                composite.metadata.sectionsPerBand.high;
            expect(total).toBeCloseTo(1, 5);
        });
    });

    describe('Deduplication', () => {
        beforeEach(() => {
            generator = new CompositeStreamGenerator();
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should deduplicate beats at the same timestamp', async () => {
            // Create overlapping patterns where multiple bands have same timestamps
            // Set up so mid clearly wins section 0 with syncopated, optimal density pattern
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];

            // Low: sparse, no syncopation (boring)
            for (let i = 0; i < 8; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,  // All onbeats
                    intensity: 0.5,
                    band: 'low',
                }));
            }

            // Mid: syncopated with optimal density (2 notes/beat) - clearly more interesting
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,           // Onbeat
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.8,  // Higher intensity at same timestamp
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,    // Offbeat (syncopated)
                    beatIndex: i,
                    gridPosition: 2,  // Offbeat position
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Verify mid won section 0 (beats 0-7)
            const section0 = composite.sections.find(s => s.beatRange.start === 0);
            expect(section0).toBeDefined();
            expect(section0!.sourceBand).toBe('mid');

            // Should only have one beat at timestamp 0 (from mid band)
            const beatsAtZero = composite.beats.filter(b => Math.abs(b.timestamp) < 0.001);
            expect(beatsAtZero.length).toBe(1);

            // Should keep the mid band beat with higher intensity (0.8)
            expect(beatsAtZero[0].intensity).toBe(0.8);
            expect(beatsAtZero[0].sourceBand).toBe('mid');
        });

        it('should keep beats sorted by timestamp', async () => {
            const midBeats: GeneratedBeat[] = [];

            // Add beats out of order
            midBeats.push(createGeneratedBeat({
                timestamp: 1.0,
                beatIndex: 2,
                gridPosition: 0,
                intensity: 0.7,
                band: 'mid',
            }));
            midBeats.push(createGeneratedBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
                intensity: 0.7,
                band: 'mid',
            }));
            midBeats.push(createGeneratedBeat({
                timestamp: 0.5,
                beatIndex: 1,
                gridPosition: 0,
                intensity: 0.7,
                band: 'mid',
            }));

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should be sorted by timestamp
            for (let i = 1; i < composite.beats.length; i++) {
                expect(composite.beats[i].timestamp).toBeGreaterThanOrEqual(
                    composite.beats[i - 1].timestamp
                );
            }
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            generator = new CompositeStreamGenerator();
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should handle empty streams gracefully', async () => {
            const streams = createMockStreams([], [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should not crash
            expect(composite.beats).toEqual([]);
            expect(composite.sections).toEqual([]);
            expect(composite.metadata.totalBeats).toBe(0);
            expect(composite.metadata.sectionCount).toBe(0);
        });

        it('should handle single beat streams', async () => {
            const lowBeats = [
                createGeneratedBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }),
            ];

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should have the single beat
            expect(composite.beats.length).toBe(1);
            expect(composite.beats[0].timestamp).toBe(0);
        });

        it('should handle partial final sections', async () => {
            // Create 10 beats (1 full section + 1 partial section)
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 10; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);
            const composite = generator.generate(streams, scoreResult, densityResult);

            // Should have 2 sections
            expect(composite.sections.length).toBe(2);

            // Second section should be partial (beats 8-9)
            const secondSection = composite.sections[1];
            expect(secondSection.beatRange.start).toBe(8);
            expect(secondSection.beatRange.end).toBe(9);
        });

        it('should produce consistent results for the same input', async () => {
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Generate twice
            const composite1 = generator.generate(streams, scoreResult, densityResult);
            const composite2 = generator.generate(streams, scoreResult, densityResult);

            // Should be identical
            expect(composite1.beats.length).toBe(composite2.beats.length);
            expect(composite1.sections).toEqual(composite2.sections);
            expect(composite1.naturalDifficulty).toBe(composite2.naturalDifficulty);
        });
    });
});
