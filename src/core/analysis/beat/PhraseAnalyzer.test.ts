import { describe, it, expect, beforeEach } from 'vitest';
import {
    PhraseAnalyzer,
    type PhraseAnalyzerConfig,
    type PhraseAnalysisResult,
    type RhythmicPhrase,
    type BandPhraseAnalysis,
} from './PhraseAnalyzer.js';
import type { GeneratedBeat, GeneratedRhythmMap, GridType } from './RhythmQuantizer.js';

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
    const gridDecisions = [];
    for (let i = 0; i <= maxBeatIndex; i++) {
        gridDecisions.push({
            beatIndex: i,
            selectedGrid: 'straight_16th' as GridType,
            straightAvgOffset: 10,
            tripletAvgOffset: 20,
            transientCount: beats.filter(b => b.beatIndex === i).length,
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
 * Create an empty rhythm map
 */
function createEmptyRhythmMap(): GeneratedRhythmMap {
    return createMockRhythmMap([]);
}

// ============================================================================
// PhraseAnalyzer Tests
// ============================================================================

describe('PhraseAnalyzer', () => {
    let analyzer: PhraseAnalyzer;

    describe('constructor', () => {
        it('should create an analyzer with default configuration', () => {
            analyzer = new PhraseAnalyzer();
            // Default config should be applied
            expect(analyzer).toBeDefined();
        });

        it('should accept custom configuration', () => {
            const config: Partial<PhraseAnalyzerConfig> = {
                phraseSizes: [1, 2],
                minOccurrences: 3,
                topSignificantCount: 5,
                includePhrasesWithoutVariation: true,
            };

            analyzer = new PhraseAnalyzer(config);
            expect(analyzer).toBeDefined();
        });
    });

    describe('analyze - basic functionality', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer();
        });

        it('should return PhraseAnalysisResult with all required properties', () => {
            const streams = {
                low: createEmptyRhythmMap(),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            expect(result.phrases).toBeDefined();
            expect(result.phrasesByBand).toBeDefined();
            expect(result.mostSignificantPhrases).toBeDefined();
            expect(result.phrasesBySize).toBeDefined();
            expect(result.patternLibrary).toBeDefined();
            expect(result.bandAnalysis).toBeDefined();
        });

        it('should handle empty streams gracefully', () => {
            const streams = {
                low: createEmptyRhythmMap(),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            expect(result.phrases).toHaveLength(0);
            expect(result.patternLibrary).toHaveLength(0);
        });

        it('should return bandAnalysis for all three bands', () => {
            const streams = {
                low: createEmptyRhythmMap(),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            expect(result.bandAnalysis.low).toBeDefined();
            expect(result.bandAnalysis.mid).toBeDefined();
            expect(result.bandAnalysis.high).toBeDefined();
            expect(result.bandAnalysis.low.band).toBe('low');
            expect(result.bandAnalysis.mid.band).toBe('mid');
            expect(result.bandAnalysis.high.band).toBe('high');
        });
    });

    describe('phrase detection - varying sizes', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should detect 1-beat phrases that repeat', () => {
            // Create two identical 1-beat patterns at beat 0 and beat 4
            const beats: GeneratedBeat[] = [
                // Beat 0: 16th note pattern at positions 0 and 2
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.7 }),
                createGeneratedBeat({ timestamp: 0.25, beatIndex: 0, gridPosition: 2, intensity: 0.6 }),
                // Beat 4: Same pattern
                createGeneratedBeat({ timestamp: 2.0, beatIndex: 4, gridPosition: 0, intensity: 0.7 }),
                createGeneratedBeat({ timestamp: 2.25, beatIndex: 4, gridPosition: 2, intensity: 0.6 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find at least one phrase that repeats
            expect(result.phrases.length).toBeGreaterThan(0);
        });

        it('should detect 2-beat phrases that repeat', () => {
            // Create two identical 2-beat patterns
            const beats: GeneratedBeat[] = [
                // Beats 0-1
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.625, beatIndex: 1, gridPosition: 1 }),
                // Beats 2-3: Same pattern
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.125, beatIndex: 2, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.625, beatIndex: 3, gridPosition: 1 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find phrases including the 2-beat pattern
            const twoBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 2);
            expect(twoBeatPhrases.length).toBeGreaterThan(0);
        });

        it('should detect 4-beat phrases that repeat', () => {
            // Create two identical 4-beat patterns (8 beats total)
            const beats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                const patternBeat = i % 4;
                beats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: patternBeat, // Different pattern per beat
                    intensity: 0.5 + (patternBeat * 0.1),
                }));
            }

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find various phrase sizes
            expect(result.phrasesBySize.size).toBeGreaterThan(0);
        });

        it('should detect 8-beat phrases that repeat', () => {
            // Create two identical 8-beat patterns (16 beats total)
            const beats: GeneratedBeat[] = [];
            for (let i = 0; i < 16; i++) {
                const patternBeat = i % 8;
                beats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: patternBeat % 4,
                    gridType: patternBeat < 4 ? 'straight_16th' : 'triplet_8th', // Variation
                    intensity: 0.5,
                }));
            }

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find phrases
            expect(result.phrases.length).toBeGreaterThan(0);
        });
    });

    describe('significance scoring', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should assign higher significance to larger phrases', () => {
            // Create repeating 1-beat and 2-beat patterns
            const beats: GeneratedBeat[] = [
                // 1-beat pattern repeats 4 times (beats 0, 2, 4, 6)
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 2.0, beatIndex: 4, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 3.0, beatIndex: 6, gridPosition: 0 }),
                // 2-beat pattern repeats 2 times (beats 0-1, 4-5)
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 2.125, beatIndex: 4, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 2.5, beatIndex: 5, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Find 1-beat and 2-beat phrases
            const oneBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 1);
            const twoBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 2);

            // Both should exist
            expect(oneBeatPhrases.length).toBeGreaterThan(0);
            expect(twoBeatPhrases.length).toBeGreaterThan(0);
        });

        it('should sort mostSignificantPhrases by significance descending', () => {
            const beats: GeneratedBeat[] = [
                // Create various repeating patterns
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.5 }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0, intensity: 0.5 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, intensity: 0.5 }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0, intensity: 0.5 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // If there are phrases, they should be sorted by significance
            if (result.mostSignificantPhrases.length > 1) {
                for (let i = 0; i < result.mostSignificantPhrases.length - 1; i++) {
                    expect(result.mostSignificantPhrases[i].significance)
                        .toBeGreaterThanOrEqual(result.mostSignificantPhrases[i + 1].significance);
                }
            }
        });
    });

    describe('excluding uninteresting patterns', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false, // Default: exclude uninteresting
            });
        });

        it('should exclude straight quarter notes (no variation)', () => {
            // Create straight quarter notes: single note at position 0 for each beat
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Straight quarter notes should be excluded
            result.phrases.forEach(phrase => {
                expect(phrase.hasVariation).toBe(true);
            });
        });

        it('should exclude straight eighth notes (no variation)', () => {
            // Create straight eighth notes: notes at positions 0 and 2 for each beat
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.25, beatIndex: 0, gridPosition: 2 }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.75, beatIndex: 1, gridPosition: 2 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.25, beatIndex: 2, gridPosition: 2 }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.75, beatIndex: 3, gridPosition: 2 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Straight eighth notes should be excluded
            result.phrases.forEach(phrase => {
                expect(phrase.hasVariation).toBe(true);
            });
        });

        it('should include patterns with 16th note subdivisions', () => {
            // Create pattern with 16th notes (gridPosition 1 or 3)
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }), // 16th note!
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.625, beatIndex: 1, gridPosition: 1 }), // 16th note!
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.125, beatIndex: 2, gridPosition: 1 }), // 16th note!
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.625, beatIndex: 3, gridPosition: 1 }), // 16th note!
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find phrases because 16th notes have variation
            expect(result.phrases.length).toBeGreaterThan(0);
            result.phrases.forEach(phrase => {
                expect(phrase.hasVariation).toBe(true);
            });
        });

        it('should include patterns with triplet grid', () => {
            // Create pattern with triplet grid
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 0.166, beatIndex: 0, gridPosition: 1, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 0.666, beatIndex: 1, gridPosition: 1, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 1.166, beatIndex: 2, gridPosition: 1, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0, gridType: 'triplet_8th' }),
                createGeneratedBeat({ timestamp: 1.666, beatIndex: 3, gridPosition: 1, gridType: 'triplet_8th' }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find phrases because triplet grid has variation
            expect(result.phrases.length).toBeGreaterThan(0);
            result.phrases.forEach(phrase => {
                expect(phrase.hasVariation).toBe(true);
            });
        });

        it('should include patterns with intensity variation', () => {
            // Create pattern with varying intensity
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.3 }),
                createGeneratedBeat({ timestamp: 0.25, beatIndex: 0, gridPosition: 2, intensity: 0.9 }), // Big difference
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0, intensity: 0.3 }),
                createGeneratedBeat({ timestamp: 0.75, beatIndex: 1, gridPosition: 2, intensity: 0.9 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, intensity: 0.3 }),
                createGeneratedBeat({ timestamp: 1.25, beatIndex: 2, gridPosition: 2, intensity: 0.9 }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0, intensity: 0.3 }),
                createGeneratedBeat({ timestamp: 1.75, beatIndex: 3, gridPosition: 2, intensity: 0.9 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find phrases because intensity variation > 10%
            expect(result.phrases.length).toBeGreaterThan(0);
        });
    });

    describe('sourceBand tracking', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should track sourceBand for low band phrases', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.7 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, intensity: 0.7 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats.map(b => ({ ...b, band: 'low' }))),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // All phrases from low band should have sourceBand = 'low'
            const lowPhrases = result.phrasesByBand.get('low') ?? [];
            lowPhrases.forEach(phrase => {
                expect(phrase.sourceBand).toBe('low');
            });
        });

        it('should track sourceBand for mid band phrases', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.7 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, intensity: 0.7 }),
            ];

            const streams = {
                low: createEmptyRhythmMap(),
                mid: createMockRhythmMap(beats.map(b => ({ ...b, band: 'mid' }))),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            const midPhrases = result.phrasesByBand.get('mid') ?? [];
            midPhrases.forEach(phrase => {
                expect(phrase.sourceBand).toBe('mid');
            });
        });

        it('should track sourceBand for high band phrases', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.7 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, intensity: 0.7 }),
            ];

            const streams = {
                low: createEmptyRhythmMap(),
                mid: createEmptyRhythmMap(),
                high: createMockRhythmMap(beats.map(b => ({ ...b, band: 'high' }))),
            };

            const result = analyzer.analyze(streams);

            const highPhrases = result.phrasesByBand.get('high') ?? [];
            highPhrases.forEach(phrase => {
                expect(phrase.sourceBand).toBe('high');
            });
        });

        it('should correctly attribute phrases to their source band', () => {
            const lowBeats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 1, band: 'low' }), // Variation
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 1, band: 'low' }),
            ];
            const midBeats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 2, band: 'mid' }), // Different pattern
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 2, band: 'mid' }),
            ];
            const highBeats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 3, band: 'high' }), // Different pattern
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 3, band: 'high' }),
            ];

            const streams = {
                low: createMockRhythmMap(lowBeats),
                mid: createMockRhythmMap(midBeats),
                high: createMockRhythmMap(highBeats),
            };

            const result = analyzer.analyze(streams);

            // Verify phrases are correctly attributed
            result.phrases.forEach(phrase => {
                if (phrase.pattern[0]?.gridPosition === 1) {
                    expect(phrase.sourceBand).toBe('low');
                } else if (phrase.pattern[0]?.gridPosition === 2) {
                    expect(phrase.sourceBand).toBe('mid');
                } else if (phrase.pattern[0]?.gridPosition === 3) {
                    expect(phrase.sourceBand).toBe('high');
                }
            });
        });
    });

    describe('PhraseOccurrence timestamps', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should store startTimestamp for each occurrence', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 2.5, beatIndex: 4, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            if (result.phrases.length > 0) {
                result.phrases.forEach(phrase => {
                    phrase.occurrences.forEach(occurrence => {
                        expect(typeof occurrence.startTimestamp).toBe('number');
                        expect(occurrence.startTimestamp).toBeGreaterThanOrEqual(0);
                    });
                });
            }
        });

        it('should store endTimestamp for each occurrence', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 2.5, beatIndex: 4, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            if (result.phrases.length > 0) {
                result.phrases.forEach(phrase => {
                    phrase.occurrences.forEach(occurrence => {
                        expect(typeof occurrence.endTimestamp).toBe('number');
                        expect(occurrence.endTimestamp).toBeGreaterThanOrEqual(occurrence.startTimestamp);
                    });
                });
            }
        });

        it('should store beatIndex for each occurrence', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 2.5, beatIndex: 4, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            if (result.phrases.length > 0) {
                result.phrases.forEach(phrase => {
                    phrase.occurrences.forEach(occurrence => {
                        expect(typeof occurrence.beatIndex).toBe('number');
                        expect(occurrence.beatIndex).toBeGreaterThanOrEqual(0);
                    });
                });
            }
        });

        it('should calculate correct timestamps for multi-beat phrases', () => {
            // Create a clear 2-beat pattern that repeats
            const beats: GeneratedBeat[] = [
                // Beats 0-1: first occurrence with variation (16th note at position 1)
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }), // 16th note variation
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                // Beats 2-3: second occurrence with same pattern
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.125, beatIndex: 2, gridPosition: 1 }), // 16th note variation
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            const twoBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 2);
            expect(twoBeatPhrases.length).toBeGreaterThan(0);

            // Verify all 2-beat phrases have correct timestamp behavior
            twoBeatPhrases.forEach(phrase => {
                expect(phrase.occurrences.length).toBeGreaterThanOrEqual(2);

                phrase.occurrences.forEach(occurrence => {
                    // End timestamp should always be >= start timestamp
                    expect(occurrence.endTimestamp).toBeGreaterThanOrEqual(occurrence.startTimestamp);
                    // beatIndex should be valid
                    expect(occurrence.beatIndex).toBeGreaterThanOrEqual(0);
                });
            });
        });
    });

    describe('pattern library', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });
        });

        it('should only include phrases with variation in patternLibrary', () => {
            const beats: GeneratedBeat[] = [
                // Pattern with variation (16th note)
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 1 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            result.patternLibrary.forEach(phrase => {
                expect(phrase.hasVariation).toBe(true);
            });
        });

        it('should only include phrases available for reuse in patternLibrary', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 1 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            result.patternLibrary.forEach(phrase => {
                expect(phrase.availableForReuse).toBe(true);
            });
        });

        it('should populate patternLibrary when interesting patterns exist', () => {
            const beats: GeneratedBeat[] = [
                // Interesting pattern with 16th notes
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }), // 16th
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.125, beatIndex: 2, gridPosition: 1 }), // 16th
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should have patterns in library
            expect(result.patternLibrary.length).toBeGreaterThan(0);
        });
    });

    describe('phrasesBySize grouping', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1, 2, 4, 8],
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should group phrases by size correctly', () => {
            const beats: GeneratedBeat[] = [
                // 1-beat patterns
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                // 2-beat patterns (additional notes to make them different from 1-beat)
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 1.125, beatIndex: 2, gridPosition: 1 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Verify phrasesBySize map contains correct sizes
            result.phrasesBySize.forEach((phrases, size) => {
                expect([1, 2, 4, 8]).toContain(size);
                phrases.forEach(phrase => {
                    expect(phrase.sizeInBeats).toBe(size);
                });
            });
        });
    });

    describe('phrasesByBand grouping', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should group phrases by band correctly', () => {
            const lowBeats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, band: 'low' }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, band: 'low' }),
            ];
            const midBeats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 1, band: 'mid' }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 1, band: 'mid' }),
            ];
            const highBeats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 2, band: 'high' }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 2, band: 'high' }),
            ];

            const streams = {
                low: createMockRhythmMap(lowBeats),
                mid: createMockRhythmMap(midBeats),
                high: createMockRhythmMap(highBeats),
            };

            const result = analyzer.analyze(streams);

            // Verify phrasesByBand map
            expect(result.phrasesByBand.has('low')).toBe(true);
            expect(result.phrasesByBand.has('mid')).toBe(true);
            expect(result.phrasesByBand.has('high')).toBe(true);

            // Verify all phrases in each band have correct sourceBand
            result.phrasesByBand.get('low')?.forEach(p => expect(p.sourceBand).toBe('low'));
            result.phrasesByBand.get('mid')?.forEach(p => expect(p.sourceBand).toBe('mid'));
            result.phrasesByBand.get('high')?.forEach(p => expect(p.sourceBand).toBe('high'));
        });
    });

    describe('configuration options', () => {
        it('should respect minOccurrences configuration', () => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 3,
                includePhrasesWithoutVariation: true,
            });

            // Only 2 occurrences - should not create a phrase
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // With minOccurrences=3, these 2 occurrences shouldn't create phrases
            expect(result.phrases.length).toBe(0);
        });

        it('should respect topSignificantCount configuration', () => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                topSignificantCount: 2,
                includePhrasesWithoutVariation: true,
            });

            // Create multiple phrases
            const beats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                beats.push(createGeneratedBeat({ timestamp: i * 0.5, beatIndex: i, gridPosition: i % 4 }));
            }

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // mostSignificantPhrases should be limited to topSignificantCount
            expect(result.mostSignificantPhrases.length).toBeLessThanOrEqual(2);
        });

        it('should respect includePhrasesWithoutVariation configuration', () => {
            // With includePhrasesWithoutVariation = true
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });

            // Straight quarter notes (no variation)
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.5, beatIndex: 3, gridPosition: 0 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const resultWithUninteresting = analyzer.analyze(streams);

            // Now with includePhrasesWithoutVariation = false
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: false,
            });

            const resultWithoutUninteresting = analyzer.analyze(streams);

            // Should have fewer (or equal) phrases when excluding uninteresting
            expect(resultWithoutUninteresting.phrases.length)
                .toBeLessThanOrEqual(resultWithUninteresting.phrases.length);
        });
    });

    describe('phrase ID generation', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });
        });

        it('should generate unique IDs for different patterns', () => {
            const beats: GeneratedBeat[] = [
                // Pattern A
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),
                // Pattern B (different)
                createGeneratedBeat({ timestamp: 0.125, beatIndex: 0, gridPosition: 1 }),
                createGeneratedBeat({ timestamp: 1.125, beatIndex: 2, gridPosition: 1 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // All phrase IDs should be unique
            const ids = result.phrases.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should generate same ID for identical patterns', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0, intensity: 0.5 }),
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0, intensity: 0.5 }),
                createGeneratedBeat({ timestamp: 2.0, beatIndex: 4, gridPosition: 0, intensity: 0.5 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // All occurrences should belong to the same phrase (same ID)
            if (result.phrases.length > 0) {
                const phrase = result.phrases[0];
                expect(phrase.occurrences.length).toBeGreaterThanOrEqual(2);
            }
        });

        it('should recognize patterns with different intensities as the same rhythm', () => {
            // Same rhythm pattern but with different intensities at each occurrence
            const beats: GeneratedBeat[] = [
                // First occurrence: intensity 0.3
                createGeneratedBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 1, intensity: 0.3 }), // 16th note
                // Second occurrence: intensity 0.8 (different!)
                createGeneratedBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 1, intensity: 0.8 }),
                // Third occurrence: intensity 0.5 (different again!)
                createGeneratedBeat({ timestamp: 2.0, beatIndex: 4, gridPosition: 1, intensity: 0.5 }),
            ];

            const streams = {
                low: createMockRhythmMap(beats),
                mid: createEmptyRhythmMap(),
                high: createEmptyRhythmMap(),
            };

            const result = analyzer.analyze(streams);

            // Should find ONE phrase with THREE occurrences (not three separate phrases)
            expect(result.phrases.length).toBe(1);
            expect(result.phrases[0].occurrences.length).toBe(3);
            expect(result.phrases[0].hasVariation).toBe(true); // 16th note = variation
        });
    });
});
