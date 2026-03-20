/**
 * Unit tests for PhraseAnalyzer
 *
 * Tests phrase detection, significance scoring, and pattern library generation
 * for procedural rhythm generation - Phase 2.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    PhraseAnalyzer,
    type PhraseAnalyzerConfig,
    type PhraseAnalysisResult,
    type RhythmicPhrase,
    type BandPhraseAnalysis,
    type PhraseOccurrence,
} from './PhraseAnalyzer.js';
import type {
    GeneratedBeat,
    GeneratedRhythmMap,
    QuantizedBandStreams,
    GridType,
} from './RhythmQuantizer.js';

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
function createMockRhythmMap(beats: GeneratedBeat[]): GeneratedRhythmMap {
    const maxBeatIndex = beats.length > 0 ? Math.max(...beats.map(b => b.beatIndex)) : 0;
    return {
        audioId: 'test-audio-id',
        duration: (maxBeatIndex + 1) * 0.5, // Assume 0.5s per beat (120 BPM)
        beats,
        gridDecisions: [],
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
// PhraseAnalyzer Tests
// ============================================================================

describe('PhraseAnalyzer', () => {
    let analyzer: PhraseAnalyzer;

    describe('constructor', () => {
        it('should create an analyzer with default configuration', () => {
            analyzer = new PhraseAnalyzer();
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
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams.streams);

            expect(result.phrases).toBeDefined();
            expect(result.phrasesByBand).toBeDefined();
            expect(result.mostSignificantPhrases).toBeDefined();
            expect(result.phrasesBySize).toBeDefined();
            expect(result.patternLibrary).toBeDefined();
            expect(result.bandAnalysis).toBeDefined();
        });

        it('should handle empty streams gracefully', () => {
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams.streams);

            expect(result.phrases.length).toBe(0);
            expect(result.patternLibrary.length).toBe(0);
        });

        it('should return bandAnalysis for all three bands', () => {
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams.streams);

            expect(result.bandAnalysis.low).toBeDefined();
            expect(result.bandAnalysis.mid).toBeDefined();
            expect(result.bandAnalysis.high).toBeDefined();
            expect(result.bandAnalysis.low.band).toBe('low');
            expect(result.bandAnalysis.mid.band).toBe('mid');
            expect(result.bandAnalysis.high.band).toBe('high');
        });

        it('should populate phrasesByBand map correctly', () => {
            const streams = createMockStreams([], [], []);

            const result = analyzer.analyze(streams.streams);

            expect(result.phrasesByBand.get('low')).toBeDefined();
            expect(result.phrasesByBand.get('mid')).toBeDefined();
            expect(result.phrasesByBand.get('high')).toBeDefined();
        });
    });

    describe('phrase detection - single beat patterns', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should detect repeated single-beat patterns', () => {
            // Create 4 beats with identical 16th note pattern (1, 3 positions)
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, timestamp: beatIndex * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 3, timestamp: beatIndex * 0.5 + 0.1 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should detect the pattern appearing 4 times
            expect(result.phrases.length).toBeGreaterThan(0);
            expect(result.phrases[0].sizeInBeats).toBe(1);
            expect(result.phrases[0].occurrences.length).toBe(4);
        });

        it('should not detect patterns with only 1 occurrence', () => {
            // Create unique patterns on each beat (no repetition)
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 0 }),
                createGeneratedBeat({ beatIndex: 1, gridPosition: 1 }),
                createGeneratedBeat({ beatIndex: 2, gridPosition: 2 }),
                createGeneratedBeat({ beatIndex: 3, gridPosition: 3 }),
            ];

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Each beat is unique, so no phrases should be detected
            expect(result.phrases.length).toBe(0);
        });
    });

    describe('phrase detection - multi-beat patterns', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [2, 4],
                minOccurrences: 2,
            });
        });

        it('should detect 2-beat repeated patterns', () => {
            // Create an 8-beat sequence where beats 0-1 repeat at 2-3, 4-5, 6-7
            const beats: GeneratedBeat[] = [];
            for (let repeat = 0; repeat < 4; repeat++) {
                const baseBeatIndex = repeat * 2;
                // Beat 0 pattern: gridPosition 1
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex, gridPosition: 1, timestamp: baseBeatIndex * 0.5 }));
                // Beat 1 pattern: gridPosition 2
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 1, gridPosition: 2, timestamp: (baseBeatIndex + 1) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should detect the 2-beat pattern appearing 4 times
            const twoBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 2);
            expect(twoBeatPhrases.length).toBeGreaterThan(0);
        });

        it('should detect 4-beat repeated patterns', () => {
            // Create 8 beats where beats 0-3 repeat at 4-7
            const beats: GeneratedBeat[] = [];
            for (let repeat = 0; repeat < 2; repeat++) {
                const baseBeatIndex = repeat * 4;
                // Each beat in the 4-beat phrase has a unique pattern
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex, gridPosition: 1, timestamp: baseBeatIndex * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 1, gridPosition: 2, timestamp: (baseBeatIndex + 1) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 2, gridPosition: 3, timestamp: (baseBeatIndex + 2) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 3, gridPosition: 1, timestamp: (baseBeatIndex + 3) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should detect the 4-beat pattern appearing 2 times
            const fourBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 4);
            expect(fourBeatPhrases.length).toBeGreaterThan(0);
            expect(fourBeatPhrases[0].occurrences.length).toBe(2);
        });

        it('should prefer larger phrases over smaller ones', () => {
            // Create 8 beats with a repeating 4-beat pattern
            // This also creates repeating 2-beat and 1-beat patterns
            const beats: GeneratedBeat[] = [];
            for (let repeat = 0; repeat < 2; repeat++) {
                const baseBeatIndex = repeat * 4;
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex, gridPosition: 1, timestamp: baseBeatIndex * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 1, gridPosition: 2, timestamp: (baseBeatIndex + 1) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 2, gridPosition: 3, timestamp: (baseBeatIndex + 2) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: baseBeatIndex + 3, gridPosition: 1, timestamp: (baseBeatIndex + 3) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // 4-beat phrases should have higher significance than 2-beat or 1-beat
            const fourBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 4);
            const twoBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 2);

            if (fourBeatPhrases.length > 0 && twoBeatPhrases.length > 0) {
                const maxFourBeatSig = Math.max(...fourBeatPhrases.map(p => p.significance));
                const maxTwoBeatSig = Math.max(...twoBeatPhrases.map(p => p.significance));
                expect(maxFourBeatSig).toBeGreaterThan(maxTwoBeatSig);
            }
        });
    });

    describe('pattern variation detection', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should exclude straight quarter note patterns', () => {
            // Straight quarter notes: 1 note per beat at gridPosition 0
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 8; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 0, timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // All phrases should be filtered out (no variation)
            expect(result.phrases.length).toBe(0);
        });

        it('should exclude straight eighth note patterns', () => {
            // Straight eighth notes: notes at gridPosition 0 and 2 on every beat
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 8; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 0, timestamp: beatIndex * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 2, timestamp: beatIndex * 0.5 + 0.25 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // All phrases should be filtered out (no variation)
            expect(result.phrases.length).toBe(0);
        });

        it('should include patterns with 16th note subdivisions', () => {
            // Pattern with 16th notes (gridPosition 1 or 3)
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, timestamp: beatIndex * 0.5 + 0.125 }));
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 3, timestamp: beatIndex * 0.5 + 0.375 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should detect the pattern (has 16th note variation)
            expect(result.phrases.length).toBeGreaterThan(0);
            expect(result.phrases.every(p => p.hasVariation)).toBe(true);
        });

        it('should include patterns with triplet grid', () => {
            // Triplet pattern
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({
                    beatIndex,
                    gridPosition: 0,
                    gridType: 'triplet_8th',
                    timestamp: beatIndex * 0.5
                }));
                beats.push(createGeneratedBeat({
                    beatIndex,
                    gridPosition: 1,
                    gridType: 'triplet_8th',
                    timestamp: beatIndex * 0.5 + 0.167
                }));
                beats.push(createGeneratedBeat({
                    beatIndex,
                    gridPosition: 2,
                    gridType: 'triplet_8th',
                    timestamp: beatIndex * 0.5 + 0.333
                }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should detect the pattern (triplet grid is always interesting)
            expect(result.phrases.length).toBeGreaterThan(0);
            expect(result.phrases.every(p => p.hasVariation)).toBe(true);
        });

        it('should include phrases without variation when configured', () => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
                includePhrasesWithoutVariation: true,
            });

            // Straight quarter notes
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 0, timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should include the pattern when configured to do so
            expect(result.phrases.length).toBeGreaterThan(0);
        });
    });

    describe('significance scoring', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1, 2, 4],
                minOccurrences: 2,
            });
        });

        it('should calculate significance based on size and occurrences', () => {
            // Create patterns with different sizes and occurrence counts
            // 4-beat pattern appearing 2 times
            const beats: GeneratedBeat[] = [];
            for (let repeat = 0; repeat < 2; repeat++) {
                const base = repeat * 4;
                beats.push(createGeneratedBeat({ beatIndex: base, gridPosition: 1, timestamp: base * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 1, gridPosition: 2, timestamp: (base + 1) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 2, gridPosition: 3, timestamp: (base + 2) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 3, gridPosition: 1, timestamp: (base + 3) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // All phrases should have significance > 0
            expect(result.phrases.every(p => p.significance > 0)).toBe(true);
        });

        it('should sort phrases by significance in descending order', () => {
            const beats: GeneratedBeat[] = [];
            // Create 8 beats with a repeating pattern
            for (let repeat = 0; repeat < 4; repeat++) {
                const base = repeat * 2;
                beats.push(createGeneratedBeat({ beatIndex: base, gridPosition: 1, timestamp: base * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 1, gridPosition: 2, timestamp: (base + 1) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Phrases should be sorted by significance (descending)
            for (let i = 1; i < result.phrases.length; i++) {
                expect(result.phrases[i - 1].significance).toBeGreaterThanOrEqual(result.phrases[i].significance);
            }
        });

        it('should limit mostSignificantPhrases to topSignificantCount', () => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1, 2],
                minOccurrences: 2,
                topSignificantCount: 3,
            });

            // Create enough patterns to exceed the limit
            const beats: GeneratedBeat[] = [];
            for (let repeat = 0; repeat < 8; repeat++) {
                const base = repeat * 2;
                beats.push(createGeneratedBeat({ beatIndex: base, gridPosition: 1, timestamp: base * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 1, gridPosition: 2, timestamp: (base + 1) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            expect(result.mostSignificantPhrases.length).toBeLessThanOrEqual(3);
        });
    });

    describe('band-specific analysis', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should track sourceBand for each phrase', () => {
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Create same pattern in all bands
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                lowBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
                midBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'mid', timestamp: beatIndex * 0.5 }));
                highBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'high', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const result = analyzer.analyze(streams.streams);

            // Should have phrases from all bands
            const lowPhrases = result.phrases.filter(p => p.sourceBand === 'low');
            const midPhrases = result.phrases.filter(p => p.sourceBand === 'mid');
            const highPhrases = result.phrases.filter(p => p.sourceBand === 'high');

            expect(lowPhrases.length).toBeGreaterThan(0);
            expect(midPhrases.length).toBeGreaterThan(0);
            expect(highPhrases.length).toBeGreaterThan(0);
        });

        it('should populate phrasesByBand correctly', () => {
            const lowBeats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                lowBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const result = analyzer.analyze(streams.streams);

            const lowBandPhrases = result.phrasesByBand.get('low');
            expect(lowBandPhrases).toBeDefined();
            expect(lowBandPhrases!.length).toBeGreaterThan(0);
            expect(lowBandPhrases!.every(p => p.sourceBand === 'low')).toBe(true);
        });

        it('should provide per-band analysis details', () => {
            const lowBeats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                lowBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const result = analyzer.analyze(streams.streams);

            expect(result.bandAnalysis.low.phrases.length).toBeGreaterThan(0);
            expect(result.bandAnalysis.low.phrasesBySize).toBeDefined();
            expect(result.bandAnalysis.low.phrasesWithVariation).toBeDefined();
        });
    });

    describe('occurrence timestamps', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should record startTimestamp and endTimestamp for each occurrence', () => {
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({
                    beatIndex,
                    gridPosition: 1,
                    timestamp: beatIndex * 0.5 + 0.1,
                    band: 'low'
                }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            expect(result.phrases.length).toBeGreaterThan(0);

            const phrase = result.phrases[0];
            expect(phrase.occurrences.length).toBeGreaterThan(0);

            // Each occurrence should have timestamps
            phrase.occurrences.forEach(occurrence => {
                expect(occurrence.startTimestamp).toBeDefined();
                expect(occurrence.endTimestamp).toBeDefined();
                expect(occurrence.startTimestamp).toBeLessThanOrEqual(occurrence.endTimestamp);
            });
        });

        it('should record beatIndex for each occurrence', () => {
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            const phrase = result.phrases[0];
            phrase.occurrences.forEach(occurrence => {
                expect(occurrence.beatIndex).toBeDefined();
                expect(typeof occurrence.beatIndex).toBe('number');
            });
        });
    });

    describe('pattern library', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should only include phrases with variation in pattern library', () => {
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            result.patternLibrary.forEach(phrase => {
                expect(phrase.hasVariation).toBe(true);
            });
        });

        it('should only include phrases available for reuse', () => {
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                beats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            result.patternLibrary.forEach(phrase => {
                expect(phrase.availableForReuse).toBe(true);
            });
        });
    });

    describe('intensity exclusion from pattern matching', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should recognize identical rhythms with different intensities as same pattern', () => {
            const beats: GeneratedBeat[] = [];
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                // Same rhythm pattern but varying intensity
                beats.push(createGeneratedBeat({
                    beatIndex,
                    gridPosition: 1,
                    intensity: 0.3 + (beatIndex * 0.2), // 0.3, 0.5, 0.7, 0.9
                    band: 'low',
                    timestamp: beatIndex * 0.5
                }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should detect as single pattern with 4 occurrences (not 4 different patterns)
            expect(result.phrases.length).toBe(1);
            expect(result.phrases[0].occurrences.length).toBe(4);
        });
    });

    describe('phrasesBySize grouping', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1, 2, 4],
                minOccurrences: 2,
            });
        });

        it('should group phrases by size correctly', () => {
            const beats: GeneratedBeat[] = [];
            // Create patterns that span multiple sizes
            for (let repeat = 0; repeat < 2; repeat++) {
                const base = repeat * 4;
                beats.push(createGeneratedBeat({ beatIndex: base, gridPosition: 1, timestamp: base * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 1, gridPosition: 2, timestamp: (base + 1) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 2, gridPosition: 3, timestamp: (base + 2) * 0.5 }));
                beats.push(createGeneratedBeat({ beatIndex: base + 3, gridPosition: 1, timestamp: (base + 3) * 0.5 }));
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Each size group should only contain phrases of that size
            result.phrasesBySize.forEach((phrases, size) => {
                phrases.forEach(phrase => {
                    expect(phrase.sizeInBeats).toBe(size);
                });
            });
        });
    });

    describe('edge cases', () => {
        beforeEach(() => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [1],
                minOccurrences: 2,
            });
        });

        it('should handle single beat with no repetition', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 1, band: 'low', timestamp: 0 }),
            ];

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            expect(result.phrases.length).toBe(0);
        });

        it('should handle beats with gaps in beat indices', () => {
            const beats: GeneratedBeat[] = [
                createGeneratedBeat({ beatIndex: 0, gridPosition: 1, band: 'low', timestamp: 0 }),
                createGeneratedBeat({ beatIndex: 5, gridPosition: 1, band: 'low', timestamp: 2.5 }),
                createGeneratedBeat({ beatIndex: 10, gridPosition: 1, band: 'low', timestamp: 5.0 }),
            ];

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            // Should still detect the pattern despite gaps
            expect(result.phrases.length).toBeGreaterThan(0);
            expect(result.phrases[0].occurrences.length).toBe(3);
        });

        it('should handle multiple bands with different patterns', () => {
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];

            // Different patterns in each band
            for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
                lowBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 1, band: 'low', timestamp: beatIndex * 0.5 }));
                midBeats.push(createGeneratedBeat({ beatIndex, gridPosition: 2, band: 'mid', timestamp: beatIndex * 0.5 }));
            }

            const streams = createMockStreams(lowBeats, midBeats, []);
            const result = analyzer.analyze(streams.streams);

            // Should have phrases from both bands
            expect(result.phrasesByBand.get('low')!.length).toBeGreaterThan(0);
            expect(result.phrasesByBand.get('mid')!.length).toBeGreaterThan(0);
        });

        it('should handle very long patterns (8 beats)', () => {
            analyzer = new PhraseAnalyzer({
                phraseSizes: [8],
                minOccurrences: 2,
            });

            const beats: GeneratedBeat[] = [];
            // Create 16 beats with an 8-beat pattern repeating twice
            for (let repeat = 0; repeat < 2; repeat++) {
                const base = repeat * 8;
                for (let i = 0; i < 8; i++) {
                    beats.push(createGeneratedBeat({
                        beatIndex: base + i,
                        gridPosition: (i % 4) as 0 | 1 | 2 | 3,
                        band: 'low',
                        timestamp: (base + i) * 0.5
                    }));
                }
            }

            const streams = createMockStreams(beats, [], []);
            const result = analyzer.analyze(streams.streams);

            const eightBeatPhrases = result.phrases.filter(p => p.sizeInBeats === 8);
            expect(eightBeatPhrases.length).toBeGreaterThan(0);
        });
    });
});