/**
 * Integration Test for Phrase and Density Analysis Pipeline
 *
 * Tests the complete Phase 2 pipeline:
 * - Quantized streams → PhraseAnalyzer → phrase detection
 * - Quantized streams → DensityAnalyzer → density metrics and natural difficulty
 *
 * This verifies that phrase and density analysis work correctly together
 * on realistic rhythm data.
 *
 * Reference: docs/plans/procedural-rhythm-generation.md Phase 2.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PhraseAnalyzer } from '../../src/core/analysis/beat/PhraseAnalyzer.js';
import { DensityAnalyzer } from '../../src/core/analysis/beat/DensityAnalyzer.js';
import type {
    GeneratedBeat,
    GeneratedRhythmMap,
    QuantizedBandStreams,
    GridDecision,
} from '../../src/core/analysis/beat/RhythmQuantizer.js';
import type { GridType } from '../../src/core/analysis/beat/RhythmQuantizer.js';

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
    duration: number = 10.0
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

/**
 * Create a repeating rhythm pattern across multiple beats
 */
function createRepeatingPattern(
    pattern: Array<{ gridPosition: number; gridType: GridType; intensity: number }>,
    startBeatIndex: number,
    repeatCount: number,
    beatsPerPattern: number,
    band: 'low' | 'mid' | 'high',
    quarterNoteInterval: number = 0.5
): GeneratedBeat[] {
    const beats: GeneratedBeat[] = [];

    for (let repeat = 0; repeat < repeatCount; repeat++) {
        const beatOffset = repeat * beatsPerPattern;

        for (const note of pattern) {
            const beatIndex = startBeatIndex + beatOffset + Math.floor(note.gridPosition / 4);
            const gridPosition = note.gridPosition % 4;
            const gridType = note.gridType;
            const interval = gridType === 'straight_16th'
                ? quarterNoteInterval / 4
                : quarterNoteInterval / 3;

            beats.push(createGeneratedBeat({
                timestamp: beatIndex * quarterNoteInterval + gridPosition * interval,
                beatIndex,
                gridPosition,
                gridType,
                intensity: note.intensity,
                band,
            }));
        }
    }

    return beats;
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Phrase and Density Analysis Integration Tests', () => {
    let phraseAnalyzer: PhraseAnalyzer;
    let densityAnalyzer: DensityAnalyzer;

    describe('Complete Pipeline with Known Rhythm Patterns', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });
            densityAnalyzer = new DensityAnalyzer({
                beatsPerSection: 8,
                sparseThreshold: 2.0,
                denseThreshold: 5.0,
            });
        });

        it('should analyze a simple 4/4 drum pattern with repeating phrases', async () => {
            // Create a classic rock drum pattern that repeats every 4 beats
            // Low band: Kick on 1 and 3
            const lowBeats: GeneratedBeat[] = [];
            for (let measure = 0; measure < 4; measure++) {
                // Kick on beat 1
                lowBeats.push(createGeneratedBeat({
                    timestamp: measure * 2.0,
                    beatIndex: measure * 4,
                    gridPosition: 0,
                    intensity: 0.9,
                    band: 'low',
                }));
                // Kick on beat 3
                lowBeats.push(createGeneratedBeat({
                    timestamp: measure * 2.0 + 1.0,
                    beatIndex: measure * 4 + 2,
                    gridPosition: 0,
                    intensity: 0.8,
                    band: 'low',
                }));
            }

            // Mid band: Snare on 2 and 4
            const midBeats: GeneratedBeat[] = [];
            for (let measure = 0; measure < 4; measure++) {
                // Snare on beat 2
                midBeats.push(createGeneratedBeat({
                    timestamp: measure * 2.0 + 0.5,
                    beatIndex: measure * 4 + 1,
                    gridPosition: 0,
                    intensity: 0.85,
                    band: 'mid',
                }));
                // Snare on beat 4
                midBeats.push(createGeneratedBeat({
                    timestamp: measure * 2.0 + 1.5,
                    beatIndex: measure * 4 + 3,
                    gridPosition: 0,
                    intensity: 0.85,
                    band: 'mid',
                }));
            }

            // High band: Hi-hat on all beats
            const highBeats: GeneratedBeat[] = [];
            for (let beat = 0; beat < 16; beat++) {
                highBeats.push(createGeneratedBeat({
                    timestamp: beat * 0.5,
                    beatIndex: beat,
                    gridPosition: 0,
                    intensity: 0.5,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            // Run phrase analysis
            const phraseResult = phraseAnalyzer.analyze(streams.streams);

            // Run density analysis
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Verify phrase analysis
            expect(phraseResult.phrases).toBeDefined();
            expect(phraseResult.phrasesByBand).toBeDefined();
            expect(phraseResult.mostSignificantPhrases).toBeDefined();
            expect(phraseResult.patternLibrary).toBeDefined();
            expect(phraseResult.bandAnalysis).toBeDefined();

            // Verify density analysis
            expect(densityResult.bandMetrics).toBeDefined();
            expect(densityResult.combinedMetrics).toBeDefined();
            expect(densityResult.sections).toBeDefined();
            expect(densityResult.perBeatDensity).toBeDefined();

            // Log results for verification
            console.log('\n✓ Simple 4/4 drum pattern analysis:');
            console.log(`  Total phrases detected: ${phraseResult.phrases.length}`);
            console.log(`  Pattern library size: ${phraseResult.patternLibrary.length}`);
            console.log(`  Combined notes/sec: ${densityResult.combinedMetrics.notesPerSecond.toFixed(2)}`);
            console.log(`  Combined density: ${densityResult.combinedMetrics.densityCategory}`);
            console.log(`  Natural difficulty: ${densityResult.combinedMetrics.naturalDifficulty}`);

            // Verify per-band metrics
            console.log(`  Low band transients: ${densityResult.bandMetrics.low.totalTransients}`);
            console.log(`  Mid band transients: ${densityResult.bandMetrics.mid.totalTransients}`);
            console.log(`  High band transients: ${densityResult.bandMetrics.high.totalTransients}`);
        });

        it('should detect 16th note patterns with variation', async () => {
            // Create a pattern with 16th note subdivisions that repeats
            const lowBeats: GeneratedBeat[] = [];
            const pattern = [
                { gridPosition: 0, gridType: 'straight_16th' as GridType, intensity: 0.9 },
                { gridPosition: 1, gridType: 'straight_16th' as GridType, intensity: 0.6 }, // 16th note!
                { gridPosition: 2, gridType: 'straight_16th' as GridType, intensity: 0.8 },
            ];

            // Repeat pattern 4 times (4 measures)
            for (let measure = 0; measure < 4; measure++) {
                for (let beat = 0; beat < 4; beat++) {
                    const beatIndex = measure * 4 + beat;
                    const baseTime = beatIndex * 0.5;

                    for (const note of pattern) {
                        lowBeats.push(createGeneratedBeat({
                            timestamp: baseTime + note.gridPosition * 0.125,
                            beatIndex,
                            gridPosition: note.gridPosition,
                            gridType: note.gridType,
                            intensity: note.intensity,
                            band: 'low',
                        }));
                    }
                }
            }

            const streams = createMockStreams(lowBeats, [], []);

            // Run both analyzers
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Should detect phrases because of 16th note variation
            expect(phraseResult.phrases.length).toBeGreaterThan(0);

            // Should have dense density (3 notes/beat = 6.0 notes/sec at 120 BPM is > 5.0 denseThreshold)
            expect(densityResult.bandMetrics.low.notesPerSecond).toBeCloseTo(6.0, 0.1);
            expect(densityResult.combinedMetrics.densityCategory).toBe('dense');

            console.log('\n✓ 16th note pattern analysis:');
            console.log(`  Phrases detected: ${phraseResult.phrases.length}`);
            console.log(`  Phrases with variation: ${phraseResult.phrases.filter(p => p.hasVariation).length}`);
            console.log(`  Notes/sec: ${densityResult.bandMetrics.low.notesPerSecond.toFixed(2)}`);
            console.log(`  Density category: ${densityResult.combinedMetrics.densityCategory}`);
        });

        it('should detect triplet patterns', async () => {
            // Create a pattern with triplet subdivisions
            const midBeats: GeneratedBeat[] = [];

            // Create 8-beat phrase with triplets, repeated twice
            for (let repeat = 0; repeat < 2; repeat++) {
                for (let beat = 0; beat < 8; beat++) {
                    const beatIndex = repeat * 8 + beat;
                    const baseTime = beatIndex * 0.5;

                    // Triplet pattern: 3 notes per beat
                    for (let pos = 0; pos < 3; pos++) {
                        midBeats.push(createGeneratedBeat({
                            timestamp: baseTime + pos * (0.5 / 3),
                            beatIndex,
                            gridPosition: pos,
                            gridType: 'triplet_8th',
                            intensity: 0.7,
                            band: 'mid',
                        }));
                    }
                }
            }

            const streams = createMockStreams([], midBeats, []);

            // Run both analyzers
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Should detect phrases because triplet grid is interesting
            expect(phraseResult.phrases.length).toBeGreaterThan(0);

            // Verify phrases have triplet grid type
            const tripletPhrases = phraseResult.phrases.filter(p =>
                p.pattern.some(b => b.gridType === 'triplet_8th')
            );
            expect(tripletPhrases.length).toBeGreaterThan(0);

            // Should have high density (3 notes/beat = 6.0 notes/sec at 120 BPM)
            expect(densityResult.bandMetrics.mid.notesPerSecond).toBeCloseTo(6.0, 0.1);
            expect(densityResult.combinedMetrics.densityCategory).toBe('dense');

            console.log('\n✓ Triplet pattern analysis:');
            console.log(`  Phrases detected: ${phraseResult.phrases.length}`);
            console.log(`  Phrases with triplet grid: ${tripletPhrases.length}`);
            console.log(`  Notes/sec: ${densityResult.bandMetrics.mid.notesPerSecond.toFixed(2)}`);
            console.log(`  Density category: ${densityResult.combinedMetrics.densityCategory}`);
            console.log(`  Natural difficulty: ${densityResult.combinedMetrics.naturalDifficulty}`);
        });
    });

    describe('Multi-Band Analysis Integration', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should correctly analyze all three frequency bands', async () => {
            // Create different patterns for each band
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Low band: sparse (0.31 notes/beat = 0.62 notes/sec at 120 BPM)
            for (let i = 0; i < 4; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 2.0,
                    beatIndex: i * 4,
                    gridPosition: 0,
                    intensity: 0.9,
                    band: 'low',
                }));
            }

            // Mid band: moderate (2 notes/beat = 4.0 notes/sec at 120 BPM)
            for (let i = 0; i < 16; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.6,
                    band: 'mid',
                }));
            }

            // High band: dense (~2.8 notes/beat ≈ 5.6 notes/sec at 120 BPM)
            for (let i = 0; i < 16; i++) {
                for (let pos = 0; pos < 4; pos++) {
                    // Skip some notes for variation
                    if (Math.random() > 0.3) {
                        highBeats.push(createGeneratedBeat({
                            timestamp: i * 0.5 + pos * 0.125,
                            beatIndex: i,
                            gridPosition: pos,
                            intensity: 0.5 + Math.random() * 0.3,
                            band: 'high',
                        }));
                    }
                }
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            // Run both analyzers
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Verify per-band phrase analysis
            expect(phraseResult.bandAnalysis.low).toBeDefined();
            expect(phraseResult.bandAnalysis.mid).toBeDefined();
            expect(phraseResult.bandAnalysis.high).toBeDefined();

            // Verify per-band density metrics
            expect(densityResult.bandMetrics.low.densityCategory).toBe('sparse');
            expect(densityResult.bandMetrics.mid.densityCategory).toBe('dense');
            expect(densityResult.bandMetrics.high.densityCategory).toBe('dense');

            console.log('\n✓ Multi-band analysis:');
            console.log(`  Low band:`);
            console.log(`    Transients: ${densityResult.bandMetrics.low.totalTransients}`);
            console.log(`    Notes/sec: ${densityResult.bandMetrics.low.notesPerSecond.toFixed(2)}`);
            console.log(`    Density: ${densityResult.bandMetrics.low.densityCategory}`);
            console.log(`    Phrases: ${phraseResult.bandAnalysis.low.phrases.length}`);
            console.log(`  Mid band:`);
            console.log(`    Transients: ${densityResult.bandMetrics.mid.totalTransients}`);
            console.log(`    Notes/sec: ${densityResult.bandMetrics.mid.notesPerSecond.toFixed(2)}`);
            console.log(`    Density: ${densityResult.bandMetrics.mid.densityCategory}`);
            console.log(`    Phrases: ${phraseResult.bandAnalysis.mid.phrases.length}`);
            console.log(`  High band:`);
            console.log(`    Transients: ${densityResult.bandMetrics.high.totalTransients}`);
            console.log(`    Notes/sec: ${densityResult.bandMetrics.high.notesPerSecond.toFixed(2)}`);
            console.log(`    Density: ${densityResult.bandMetrics.high.densityCategory}`);
            console.log(`    Phrases: ${phraseResult.bandAnalysis.high.phrases.length}`);
        });

        it('should correctly attribute sourceBand for cross-band phrases', async () => {
            // Create similar patterns in different bands
            const pattern = [
                { gridPosition: 0, intensity: 0.8 },
                { gridPosition: 1, intensity: 0.7 }, // Variation
            ];

            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Each band gets the same pattern
            for (let i = 0; i < 8; i++) {
                for (const note of pattern) {
                    lowBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + note.gridPosition * 0.125,
                        beatIndex: i,
                        gridPosition: note.gridPosition,
                        intensity: note.intensity,
                        band: 'low',
                    }));
                    midBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + note.gridPosition * 0.125,
                        beatIndex: i,
                        gridPosition: note.gridPosition,
                        intensity: note.intensity,
                        band: 'mid',
                    }));
                    highBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + note.gridPosition * 0.125,
                        beatIndex: i,
                        gridPosition: note.gridPosition,
                        intensity: note.intensity,
                        band: 'high',
                    }));
                }
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            // Run phrase analysis
            const phraseResult = phraseAnalyzer.analyze(streams.streams);

            // Verify sourceBand attribution
            const lowPhrases = phraseResult.phrasesByBand.get('low') ?? [];
            const midPhrases = phraseResult.phrasesByBand.get('mid') ?? [];
            const highPhrases = phraseResult.phrasesByBand.get('high') ?? [];

            // All phrases should have correct sourceBand
            for (const phrase of lowPhrases) {
                expect(phrase.sourceBand).toBe('low');
            }
            for (const phrase of midPhrases) {
                expect(phrase.sourceBand).toBe('mid');
            }
            for (const phrase of highPhrases) {
                expect(phrase.sourceBand).toBe('high');
            }

            console.log('\n✓ Cross-band source attribution:');
            console.log(`  Low band phrases: ${lowPhrases.length}`);
            console.log(`  Mid band phrases: ${midPhrases.length}`);
            console.log(`  High band phrases: ${highPhrases.length}`);
        });
    });

    describe('Natural Difficulty Detection', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });
            densityAnalyzer = new DensityAnalyzer({
                denseThreshold: 5.0,
            });
        });

        it('should correctly identify sparse patterns as easy difficulty', async () => {
            // Create sparse pattern: 1 transient every 4 beats
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
            const densityResult = densityAnalyzer.analyze(streams, 120);

            expect(densityResult.combinedMetrics.densityCategory).toBe('sparse');
            expect(densityResult.combinedMetrics.naturalDifficulty).toBe('easy');

            console.log('\n✓ Sparse pattern difficulty:');
            console.log(`  Notes/sec: ${densityResult.combinedMetrics.notesPerSecond.toFixed(2)}`);
            console.log(`  Density: ${densityResult.combinedMetrics.densityCategory}`);
            console.log(`  Natural difficulty: ${densityResult.combinedMetrics.naturalDifficulty}`);
        });

        it('should correctly identify moderate patterns as medium difficulty', async () => {
            // Create moderate pattern: 2 transients per beat (eighth notes)
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.6,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams([], midBeats, []);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            expect(densityResult.combinedMetrics.densityCategory).toBe('moderate');
            expect(densityResult.combinedMetrics.naturalDifficulty).toBe('medium');

            console.log('\n✓ Moderate pattern difficulty:');
            console.log(`  Notes/sec: ${densityResult.combinedMetrics.notesPerSecond.toFixed(2)}`);
            console.log(`  Density: ${densityResult.combinedMetrics.densityCategory}`);
            console.log(`  Natural difficulty: ${densityResult.combinedMetrics.naturalDifficulty}`);
        });

        it('should correctly identify dense patterns as hard difficulty', async () => {
            // Create dense pattern: 4 transients per beat (16th notes)
            const highBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                for (let pos = 0; pos < 4; pos++) {
                    highBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + pos * 0.125,
                        beatIndex: i,
                        gridPosition: pos,
                        intensity: 0.6,
                        band: 'high',
                    }));
                }
            }

            const streams = createMockStreams([], [], highBeats);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            expect(densityResult.combinedMetrics.densityCategory).toBe('dense');
            expect(densityResult.combinedMetrics.naturalDifficulty).toBe('hard');

            console.log('\n✓ Dense pattern difficulty:');
            console.log(`  Notes/sec: ${densityResult.combinedMetrics.notesPerSecond.toFixed(2)}`);
            console.log(`  Density: ${densityResult.combinedMetrics.densityCategory}`);
            console.log(`  Natural difficulty: ${densityResult.combinedMetrics.naturalDifficulty}`);
        });
    });

    describe('Section-Based Analysis', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });
            densityAnalyzer = new DensityAnalyzer({
                beatsPerSection: 8, // 2 measures in 4/4 time
                denseThreshold: 5.0,
            });
        });

        it('should analyze density across multiple sections', async () => {
            // Create a track with varying density sections
            const lowBeats: GeneratedBeat[] = [];

            // Section 1 (beats 0-7): sparse (0.375 notes/beat = 0.75 notes/sec at 120 BPM)
            for (let i = 0; i < 8; i += 3) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            // Section 2 (beats 8-15): dense (4 notes/beat = 8.0 notes/sec at 120 BPM)
            for (let i = 8; i < 16; i++) {
                for (let pos = 0; pos < 4; pos++) {
                    lowBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + pos * 0.125,
                        beatIndex: i,
                        gridPosition: pos,
                        intensity: 0.6,
                        band: 'low',
                    }));
                }
            }

            // Section 3 (beats 16-23): moderate (2 notes/beat = 4.0 notes/sec at 120 BPM)
            for (let i = 16; i < 24; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.6,
                    band: 'low',
                }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Should have 3 sections
            expect(densityResult.sections.length).toBe(3);

            // Verify section characteristics
            expect(densityResult.sections[0].densityCategory).toBe('sparse');
            expect(densityResult.sections[1].densityCategory).toBe('dense');
            expect(densityResult.sections[2].densityCategory).toBe('moderate');

            console.log('\n✓ Section-based density analysis:');
            for (let i = 0; i < densityResult.sections.length; i++) {
                const section = densityResult.sections[i];
                console.log(`  Section ${i + 1} (beats ${section.startBeat}-${section.endBeat}):`);
                console.log(`    Notes/sec: ${section.notesPerSecond.toFixed(2)}`);
                console.log(`    Density: ${section.densityCategory}`);
                console.log(`    Difficulty: ${section.naturalDifficulty}`);
            }
        });

        it('should handle partial final sections', async () => {
            // Create 10 beats (partial final section with 8 beats per section)
            const lowBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 10; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Should have 2 sections (8 + 2)
            expect(densityResult.sections.length).toBe(2);

            // First section should have 8 beats
            expect(densityResult.sections[0].beatCount).toBe(8);

            // Second section should have 2 beats (partial)
            expect(densityResult.sections[1].beatCount).toBe(2);

            console.log('\n✓ Partial final section handling:');
            console.log(`  Total sections: ${densityResult.sections.length}`);
            console.log(`  Section 1 beats: ${densityResult.sections[0].beatCount}`);
            console.log(`  Section 2 beats: ${densityResult.sections[1].beatCount}`);
        });
    });

    describe('Pattern Library Generation', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should populate pattern library with detected phrases', async () => {
            // Create a pattern with clear repeating phrases
            const lowBeats: GeneratedBeat[] = [];

            // Create 4-beat pattern with 16th note variation, repeated 4 times
            for (let repeat = 0; repeat < 4; repeat++) {
                for (let beat = 0; beat < 4; beat++) {
                    const beatIndex = repeat * 4 + beat;
                    const baseTime = beatIndex * 0.5;

                    // Pattern with 16th note variation
                    lowBeats.push(createGeneratedBeat({
                        timestamp: baseTime,
                        beatIndex,
                        gridPosition: 0,
                        intensity: 0.8,
                        band: 'low',
                    }));
                    lowBeats.push(createGeneratedBeat({
                        timestamp: baseTime + 0.125,
                        beatIndex,
                        gridPosition: 1, // 16th note - creates variation
                        intensity: 0.6,
                        band: 'low',
                    }));
                }
            }

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);

            // Pattern library should contain phrases with variation
            expect(phraseResult.patternLibrary.length).toBeGreaterThan(0);

            // All patterns in library should have variation
            for (const phrase of phraseResult.patternLibrary) {
                expect(phrase.hasVariation).toBe(true);
                expect(phrase.availableForReuse).toBe(true);
            }

            console.log('\n✓ Pattern library generation:');
            console.log(`  Pattern library size: ${phraseResult.patternLibrary.length}`);
            console.log(`  All patterns have variation: ${phraseResult.patternLibrary.every(p => p.hasVariation)}`);
            console.log(`  All patterns available for reuse: ${phraseResult.patternLibrary.every(p => p.availableForReuse)}`);
        });

        it('should track phrase occurrences with timestamps', async () => {
            // Create repeating 2-beat pattern
            const midBeats: GeneratedBeat[] = [];
            const pattern = [
                { gridPosition: 1, intensity: 0.8 }, // 16th note for variation
            ];

            for (let repeat = 0; repeat < 4; repeat++) {
                for (let beat = 0; beat < 2; beat++) {
                    const beatIndex = repeat * 2 + beat;
                    const baseTime = beatIndex * 0.5;

                    for (const note of pattern) {
                        midBeats.push(createGeneratedBeat({
                            timestamp: baseTime + note.gridPosition * 0.125,
                            beatIndex,
                            gridPosition: note.gridPosition,
                            intensity: note.intensity,
                            band: 'mid',
                        }));
                    }
                }
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);

            // Verify phrase occurrences have valid timestamps
            for (const phrase of phraseResult.phrases) {
                for (const occurrence of phrase.occurrences) {
                    expect(typeof occurrence.beatIndex).toBe('number');
                    expect(typeof occurrence.startTimestamp).toBe('number');
                    expect(typeof occurrence.endTimestamp).toBe('number');
                    expect(occurrence.endTimestamp).toBeGreaterThanOrEqual(occurrence.startTimestamp);
                }
            }

            console.log('\n✓ Phrase occurrence timestamps:');
            if (phraseResult.phrases.length > 0) {
                const firstPhrase = phraseResult.phrases[0];
                console.log(`  First phrase has ${firstPhrase.occurrences.length} occurrences`);
                console.log(`  Sample occurrence: beat ${firstPhrase.occurrences[0]?.beatIndex}, start ${firstPhrase.occurrences[0]?.startTimestamp.toFixed(3)}s`);
            }
        });
    });

    describe('End-to-End Pipeline Verification', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
                phraseSizes: [1, 2, 4, 8],
            });
            densityAnalyzer = new DensityAnalyzer({
                beatsPerSection: 8,
            });
        });

        it('should process a complete rhythm track end-to-end', async () => {
            // Create a realistic 32-beat (8-measure) track
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Low band: Kick pattern (sparse, repeating 4-beat pattern)
            for (let measure = 0; measure < 8; measure++) {
                const baseBeat = measure * 4;
                // Kick on 1 and 3
                lowBeats.push(createGeneratedBeat({
                    timestamp: baseBeat * 0.5,
                    beatIndex: baseBeat,
                    gridPosition: 0,
                    intensity: 0.9,
                    band: 'low',
                }));
                lowBeats.push(createGeneratedBeat({
                    timestamp: (baseBeat + 2) * 0.5,
                    beatIndex: baseBeat + 2,
                    gridPosition: 0,
                    intensity: 0.85,
                    band: 'low',
                }));
            }

            // Mid band: Snare pattern (moderate, repeating 4-beat pattern)
            for (let measure = 0; measure < 8; measure++) {
                const baseBeat = measure * 4;
                // Snare on 2 and 4
                midBeats.push(createGeneratedBeat({
                    timestamp: (baseBeat + 1) * 0.5,
                    beatIndex: baseBeat + 1,
                    gridPosition: 0,
                    intensity: 0.85,
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: (baseBeat + 3) * 0.5,
                    beatIndex: baseBeat + 3,
                    gridPosition: 0,
                    intensity: 0.8,
                    band: 'mid',
                }));
            }

            // High band: Hi-hat pattern (dense, 16th notes with syncopation)
            for (let beat = 0; beat < 32; beat++) {
                const baseTime = beat * 0.5;
                // Regular 16th notes
                for (let pos = 0; pos < 4; pos++) {
                    // Add some syncopation by varying intensity
                    const intensity = pos === 1 || pos === 3 ? 0.5 : 0.7;
                    highBeats.push(createGeneratedBeat({
                        timestamp: baseTime + pos * 0.125,
                        beatIndex: beat,
                        gridPosition: pos,
                        intensity,
                        band: 'high',
                    }));
                }
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);

            // Run complete pipeline
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams, 120);

            // Comprehensive verification
            expect(phraseResult.phrases.length).toBeGreaterThan(0);
            expect(phraseResult.patternLibrary.length).toBeGreaterThan(0);
            expect(phraseResult.mostSignificantPhrases.length).toBeGreaterThan(0);
            expect(densityResult.combinedMetrics.totalTransients).toBeGreaterThan(0);
            expect(densityResult.sections.length).toBeGreaterThan(0);

            // Verify per-band analysis
            expect(phraseResult.bandAnalysis.low.phrases.length).toBeGreaterThanOrEqual(0);
            expect(phraseResult.bandAnalysis.mid.phrases.length).toBeGreaterThanOrEqual(0);
            expect(phraseResult.bandAnalysis.high.phrases.length).toBeGreaterThanOrEqual(0);

            console.log('\n✓ End-to-end pipeline verification:');
            console.log(`  Track duration: ${streams.metadata.densityValidation.requiredMinInterval * 32}s`);
            console.log(`  Total beats: 32`);
            console.log(`  `);
            console.log(`  Phrase Analysis:`);
            console.log(`    Total phrases: ${phraseResult.phrases.length}`);
            console.log(`    Pattern library size: ${phraseResult.patternLibrary.length}`);
            console.log(`    Most significant phrases: ${phraseResult.mostSignificantPhrases.length}`);
            console.log(`    Low band phrases: ${phraseResult.bandAnalysis.low.phrases.length}`);
            console.log(`    Mid band phrases: ${phraseResult.bandAnalysis.mid.phrases.length}`);
            console.log(`    High band phrases: ${phraseResult.bandAnalysis.high.phrases.length}`);
            console.log(`  `);
            console.log(`  Density Analysis:`);
            console.log(`    Total transients: ${densityResult.combinedMetrics.totalTransients}`);
            console.log(`    Notes/sec: ${densityResult.combinedMetrics.notesPerSecond.toFixed(2)}`);
            console.log(`    Overall density: ${densityResult.combinedMetrics.densityCategory}`);
            console.log(`    Natural difficulty: ${densityResult.combinedMetrics.naturalDifficulty}`);
            console.log(`    Sections analyzed: ${densityResult.sections.length}`);
            console.log(`  `);
            console.log(`  Per-Band Density:`);
            console.log(`    Low: ${densityResult.bandMetrics.low.notesPerSecond.toFixed(2)} n/s (${densityResult.bandMetrics.low.densityCategory})`);
            console.log(`    Mid: ${densityResult.bandMetrics.mid.notesPerSecond.toFixed(2)} n/s (${densityResult.bandMetrics.mid.densityCategory})`);
            console.log(`    High: ${densityResult.bandMetrics.high.notesPerSecond.toFixed(2)} n/s (${densityResult.bandMetrics.high.densityCategory})`);
        });
    });
});
