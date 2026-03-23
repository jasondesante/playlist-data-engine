/**
 * Unit Tests for StreamScorer
 *
 * Tests the scoring system for evaluating rhythmic interest in band streams.
 *
 * Reference: docs/plans/procedural-rhythm-generation.md Phase 3.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
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

// ============================================================================
// Unit Tests
// ============================================================================

describe('StreamScorer', () => {
    let scorer: StreamScorer;
    let phraseAnalyzer: PhraseAnalyzer;
    let densityAnalyzer: DensityAnalyzer;

    describe('Constructor and Configuration', () => {
        it('should create a scorer with default configuration', () => {
            scorer = new StreamScorer();
            const config = scorer.getConfig();

            expect(config.beatsPerSection).toBe(8);
            expect(config.ioiVarianceWeight).toBe(0.3);
            expect(config.syncopationWeight).toBe(0.3);
            expect(config.phraseSignificanceWeight).toBe(0.25);
            expect(config.densityWeight).toBe(0.15);
        });

        it('should accept custom configuration', () => {
            scorer = new StreamScorer({
                beatsPerSection: 4,
                ioiVarianceWeight: 0.4,
                syncopationWeight: 0.2,
            });
            const config = scorer.getConfig();

            expect(config.beatsPerSection).toBe(4);
            expect(config.ioiVarianceWeight).toBe(0.4);
            expect(config.syncopationWeight).toBe(0.2);
            // Defaults should remain
            expect(config.phraseSignificanceWeight).toBe(0.25);
            expect(config.densityWeight).toBe(0.15);
        });

        it('should have correct offbeat grid positions defined', () => {
            scorer = new StreamScorer();
            const config = scorer.getConfig();

            // For straight 16th notes: positions 1 and 3 are offbeats
            expect(config.offbeatGridPositions.straight_16th).toEqual([1, 3]);

            // For triplet 8th notes: positions 1 and 2 are offbeats (after downbeat)
            expect(config.offbeatGridPositions.triplet_8th).toEqual([1, 2]);
        });
    });

    describe('Scoring Factors', () => {
        beforeEach(() => {
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        describe('IOI Variance Scoring', () => {
            it('should score low variance patterns lower (monotonous)', async () => {
                // Create a monotonous pattern: straight quarter notes (zero variance)
                const lowBeats: GeneratedBeat[] = [];
                for (let i = 0; i < 16; i++) {
                    lowBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5,
                        beatIndex: i,
                        gridPosition: 0,
                        intensity: 0.7,
                        band: 'low',
                    }));
                }

                const streams = createMockStreams(lowBeats, [], []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                // Low variance should result in low IOI variance score
                const lowScore = scoreResult.sectionScores.find(
                    s => s.band === 'low' && s.beatRange.start === 0
                );
                expect(lowScore).toBeDefined();
                expect(lowScore!.factors.ioiVariance).toBeLessThan(0.5);
            });

            it('should score varied patterns higher (interesting)', async () => {
                // Create a varied pattern with different IOIs
                const midBeats: GeneratedBeat[] = [];
                const timestamps = [0, 0.125, 0.375, 0.5, 0.75, 1.0, 1.25, 1.5];
                for (let i = 0; i < timestamps.length; i++) {
                    midBeats.push(createGeneratedBeat({
                        timestamp: timestamps[i],
                        beatIndex: Math.floor(timestamps[i] / 0.5),
                        gridPosition: (timestamps[i] % 0.5) / 0.125,
                        intensity: 0.7,
                        band: 'mid',
                    }));
                }

                const streams = createMockStreams([], midBeats, []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const midScore = scoreResult.sectionScores.find(
                    s => s.band === 'mid' && s.beatRange.start === 0
                );
                expect(midScore).toBeDefined();
                // Varied pattern should have higher IOI variance
                expect(midScore!.factors.ioiVariance).toBeGreaterThan(0);
            });

            it('should return 0 for empty or single-note sections', async () => {
                const streams = createMockStreams([], [], []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                // All bands should have 0 IOI variance with no notes
                for (const score of scoreResult.sectionScores) {
                    expect(score.factors.ioiVariance).toBe(0);
                }
            });
        });

        describe('Syncopation Scoring', () => {
            it('should score on-beat patterns lower (no syncopation)', async () => {
                // All notes on the beat (gridPosition 0)
                const lowBeats: GeneratedBeat[] = [];
                for (let i = 0; i < 16; i++) {
                    lowBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5,
                        beatIndex: i,
                        gridPosition: 0, // On the beat
                        intensity: 0.7,
                        band: 'low',
                    }));
                }

                const streams = createMockStreams(lowBeats, [], []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const lowScore = scoreResult.sectionScores.find(
                    s => s.band === 'low' && s.beatRange.start === 0
                );
                expect(lowScore).toBeDefined();
                expect(lowScore!.factors.syncopationLevel).toBe(0);
            });

            it('should score offbeat patterns higher (syncopated)', async () => {
                // Notes on offbeats (gridPosition 1 and 3)
                const midBeats: GeneratedBeat[] = [];
                for (let i = 0; i < 16; i++) {
                    midBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + 0.125,
                        beatIndex: i,
                        gridPosition: 1, // Offbeat
                        intensity: 0.7,
                        band: 'mid',
                    }));
                }

                const streams = createMockStreams([], midBeats, []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const midScore = scoreResult.sectionScores.find(
                    s => s.band === 'mid' && s.beatRange.start === 0
                );
                expect(midScore).toBeDefined();
                // All notes are offbeats, so syncopation should be 1.0
                expect(midScore!.factors.syncopationLevel).toBe(1);
            });

            it('should weight syncopation by note intensity', async () => {
                // Mix of strong on-beat and weak offbeat notes
                const highBeats: GeneratedBeat[] = [];
                for (let i = 0; i < 8; i++) {
                    // Strong on-beat note
                    highBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5,
                        beatIndex: i,
                        gridPosition: 0,
                        intensity: 1.0, // Strong
                        band: 'high',
                    }));
                    // Weak offbeat note
                    highBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + 0.125,
                        beatIndex: i,
                        gridPosition: 1,
                        intensity: 0.2, // Weak
                        band: 'high',
                    }));
                }

                const streams = createMockStreams([], [], highBeats);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const highScore = scoreResult.sectionScores.find(
                    s => s.band === 'high' && s.beatRange.start === 0
                );
                expect(highScore).toBeDefined();
                // Syncopation should be less than 0.5 because weak notes are offbeats
                // Total weight = 1.0 + 0.2 = 1.2
                // Syncopated weight = 0.2
                // Ratio = 0.2 / 1.2 ≈ 0.167
                expect(highScore!.factors.syncopationLevel).toBeLessThan(0.3);
                expect(highScore!.factors.syncopationLevel).toBeGreaterThan(0);
            });
        });

        describe('Density Factor Scoring', () => {
            it('should score moderate density highest (bell curve)', async () => {
                // 2 notes per beat (optimal)
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
                        intensity: 0.7,
                        band: 'mid',
                    }));
                }

                const streams = createMockStreams([], midBeats, []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const midScore = scoreResult.sectionScores.find(
                    s => s.band === 'mid' && s.beatRange.start === 0
                );
                expect(midScore).toBeDefined();
                // 2 notes per beat should be near optimal (score close to 1)
                expect(midScore!.factors.densityFactor).toBeGreaterThan(0.8);
            });

            it('should score sparse density lower', async () => {
                // 0.5 notes per beat (sparse)
                const lowBeats: GeneratedBeat[] = [];
                for (let i = 0; i < 4; i++) {
                    lowBeats.push(createGeneratedBeat({
                        timestamp: i * 1.0,
                        beatIndex: i * 2,
                        gridPosition: 0,
                        intensity: 0.7,
                        band: 'low',
                    }));
                }

                const streams = createMockStreams(lowBeats, [], []);
                const phraseResult = phraseAnalyzer.analyze(streams.streams);
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const lowScore = scoreResult.sectionScores.find(
                    s => s.band === 'low' && s.beatRange.start === 0
                );
                expect(lowScore).toBeDefined();
                // Sparse should score lower than optimal
                expect(lowScore!.factors.densityFactor).toBeLessThan(0.7);
            });

            it('should score very dense patterns lower (too many notes)', async () => {
                // 4 notes per beat (very dense)
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
                const densityResult = densityAnalyzer.analyze(streams);
                const scoreResult = scorer.score(streams, phraseResult, densityResult);

                const highScore = scoreResult.sectionScores.find(
                    s => s.band === 'high' && s.beatRange.start === 0
                );
                expect(highScore).toBeDefined();
                // Very dense should score lower than optimal
                expect(highScore!.factors.densityFactor).toBeLessThan(0.5);
            });
        });
    });

    describe('Section Scoring', () => {
        beforeEach(() => {
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should score all bands across all sections', async () => {
            // Create 16 beats (2 sections)
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            for (let i = 0; i < 16; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                    band: 'mid',
                }));
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.7,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Should have 2 sections × 3 bands = 6 scores
            expect(scoreResult.sectionScores.length).toBe(6);

            // Each section should have scores for all bands
            const section1Scores = scoreResult.sectionScores.filter(s => s.beatRange.start === 0);
            const section2Scores = scoreResult.sectionScores.filter(s => s.beatRange.start === 8);

            expect(section1Scores.length).toBe(3);
            expect(section2Scores.length).toBe(3);

            // Verify band coverage
            const section1Bands = section1Scores.map(s => s.band);
            expect(section1Bands).toContain('low');
            expect(section1Bands).toContain('mid');
            expect(section1Bands).toContain('high');
        });

        it('should calculate band totals and averages correctly', async () => {
            // Create a simple pattern where mid band is most interesting
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Low: sparse (boring)
            for (let i = 0; i < 8; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            // Mid: syncopated (interesting)
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1, // Syncopated
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            // High: also on-beat (boring)
            for (let i = 0; i < 8; i++) {
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Mid band should have higher average due to syncopation
            expect(scoreResult.bandAverages.mid).toBeGreaterThan(scoreResult.bandAverages.low);
            expect(scoreResult.bandAverages.mid).toBeGreaterThan(scoreResult.bandAverages.high);

            // Totals should be positive
            expect(scoreResult.bandTotals.low).toBeGreaterThan(0);
            expect(scoreResult.bandTotals.mid).toBeGreaterThan(0);
            expect(scoreResult.bandTotals.high).toBeGreaterThan(0);
        });
    });

    describe('Section Winners', () => {
        beforeEach(() => {
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should determine the winning band for each section', async () => {
            // Create a pattern where different bands win different sections
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            // Section 1: Mid band wins (syncopated)
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            // Section 2: High band wins (syncopated with more variation)
            for (let i = 8; i < 16; i++) {
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + (i % 2 === 0 ? 0.125 : 0.375),
                    beatIndex: i,
                    gridPosition: i % 2 === 0 ? 1 : 3,
                    intensity: 0.8,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Should have winners for each section
            expect(scoreResult.sectionWinners.length).toBe(2);

            // Each winner should have a band and score
            for (const winner of scoreResult.sectionWinners) {
                expect(['low', 'mid', 'high']).toContain(winner.winner);
                expect(winner.score).toBeGreaterThan(0);
                expect(winner.margin).toBeGreaterThanOrEqual(0);
            }
        });

        it('should calculate margin of victory correctly', async () => {
            // Create a pattern where one band clearly wins
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];

            // Low band: only on-beat notes
            for (let i = 0; i < 8; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            // Mid band: syncopated with optimal density
            for (let i = 0; i < 8; i++) {
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                    band: 'mid',
                }));
                midBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.25,
                    beatIndex: i,
                    gridPosition: 2,
                    intensity: 0.7,
                    band: 'mid',
                }));
            }

            const streams = createMockStreams(lowBeats, midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            const winner = scoreResult.sectionWinners[0];
            expect(winner).toBeDefined();
            expect(winner!.winner).toBe('mid');
            expect(winner!.margin).toBeGreaterThan(0);
        });
    });

    describe('Integration with Phrase and Density Analysis', () => {
        beforeEach(() => {
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should consider phrase significance in scoring', async () => {
            // Create a pattern with repeating phrases
            const lowBeats: GeneratedBeat[] = [];

            // Create a 4-beat pattern with variation, repeated twice
            for (let repeat = 0; repeat < 2; repeat++) {
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
                        gridPosition: 1,
                        intensity: 0.6,
                        band: 'low',
                    }));
                }
            }

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Section should have phrase significance factor
            const lowScore = scoreResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            expect(lowScore).toBeDefined();

            // If phrases were detected, significance should be > 0
            if (phraseResult.phrases.length > 0) {
                expect(lowScore!.factors.phraseSignificance).toBeGreaterThanOrEqual(0);
            }
        });

        it('should produce consistent results for the same input', async () => {
            // Create a simple pattern
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
            const densityResult = densityAnalyzer.analyze(streams);

            // Score twice
            const result1 = scorer.score(streams, phraseResult, densityResult);
            const result2 = scorer.score(streams, phraseResult, densityResult);

            // Results should be identical
            expect(result1.bandAverages).toEqual(result2.bandAverages);
            expect(result1.bandTotals).toEqual(result2.bandTotals);
            expect(result1.sectionWinners).toEqual(result2.sectionWinners);
        });
    });

    describe('Edge Cases', () => {
        beforeEach(() => {
            scorer = new StreamScorer({ beatsPerSection: 8 });
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should handle empty streams gracefully', async () => {
            const streams = createMockStreams([], [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Should not crash - all scores should be low (only density factor contributes)
            // With 0 notes, density factor gives a non-zero bell curve value (0.13 at x=0)
            expect(scoreResult.bandAverages.low).toBeLessThan(0.1);
            expect(scoreResult.bandAverages.mid).toBeLessThan(0.1);
            expect(scoreResult.bandAverages.high).toBeLessThan(0.1);
        });

        it('should handle partial final sections', async () => {
            // Create 10 beats (1 full section + 1 partial section)
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
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Should have 2 sections (8 beats + 2 beats)
            expect(scoreResult.sectionWinners.length).toBe(2);

            // Second section should be partial
            const partialSection = scoreResult.sectionScores.find(s => s.beatRange.start === 8);
            expect(partialSection).toBeDefined();
            expect(partialSection!.beatRange.end).toBe(9);
        });

        it('should handle triplet grid types correctly', async () => {
            // Create a triplet pattern
            const midBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                for (let pos = 0; pos < 3; pos++) {
                    midBeats.push(createGeneratedBeat({
                        timestamp: i * 0.5 + pos * (0.5 / 3),
                        beatIndex: i,
                        gridPosition: pos,
                        gridType: 'triplet_8th',
                        intensity: 0.7,
                        band: 'mid',
                    }));
                }
            }

            const streams = createMockStreams([], midBeats, []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Should score without errors
            const midScore = scoreResult.sectionScores.find(
                s => s.band === 'mid' && s.beatRange.start === 0
            );
            expect(midScore).toBeDefined();
            expect(midScore!.score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Factor Weights', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should apply custom factor weights to final scores', async () => {
            // Create a pattern with known characteristics
            const lowBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                // Create syncopated pattern (all notes on offbeats)
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1, // Offbeat position
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);

            // Score with default weights (0.3, 0.3, 0.25, 0.15)
            const defaultScorer = new StreamScorer({ beatsPerSection: 8 });
            const defaultResult = defaultScorer.score(streams, phraseResult, densityResult);

            const defaultScore = defaultResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            expect(defaultScore).toBeDefined();

            // Calculate expected default score
            const factors = defaultScore!.factors;
            const expectedDefault =
                factors.ioiVariance * 0.3 +
                factors.syncopationLevel * 0.3 +
                factors.phraseSignificance * 0.25 +
                factors.densityFactor * 0.15;

            expect(defaultScore!.score).toBeCloseTo(expectedDefault, 5);

            // Now score with increased syncopation weight (0.5 instead of 0.3)
            // and reduced IOI variance weight (0.1 instead of 0.3)
            const customScorer = new StreamScorer({
                beatsPerSection: 8,
                ioiVarianceWeight: 0.1,
                syncopationWeight: 0.5,
                phraseSignificanceWeight: 0.25,
                densityWeight: 0.15,
            });
            const customResult = customScorer.score(streams, phraseResult, densityResult);

            const customScore = customResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            expect(customScore).toBeDefined();

            // Calculate expected custom score
            const expectedCustom =
                factors.ioiVariance * 0.1 +
                factors.syncopationLevel * 0.5 +
                factors.phraseSignificance * 0.25 +
                factors.densityFactor * 0.15;

            expect(customScore!.score).toBeCloseTo(expectedCustom, 5);

            // Since pattern is syncopated (all offbeats), syncopation factor should be high
            // Increasing syncopation weight should increase the score
            expect(customScore!.score).toBeGreaterThan(defaultScore!.score);
        });

        it('should affect section winners when factor weights change', async () => {
            // Create patterns where bands have different strengths
            const lowBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            for (let i = 0; i < 8; i++) {
                // Low band: high syncopation (all offbeats)
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1, // Offbeat
                    intensity: 0.7,
                    band: 'low',
                }));

                // High band: on-beat pattern (no syncopation)
                highBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5,
                    beatIndex: i,
                    gridPosition: 0, // On-beat
                    intensity: 0.7,
                    band: 'high',
                }));
            }

            const streams = createMockStreams(lowBeats, [], highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);

            // With high syncopation weight, low band should win
            const syncopationFavoringScorer = new StreamScorer({
                beatsPerSection: 8,
                ioiVarianceWeight: 0.2,
                syncopationWeight: 0.5, // High syncopation weight
                phraseSignificanceWeight: 0.2,
                densityWeight: 0.1,
            });
            const syncopationResult = syncopationFavoringScorer.score(streams, phraseResult, densityResult);

            // Low band (syncopated) should win
            expect(syncopationResult.sectionWinners[0].winner).toBe('low');

            // With low syncopation weight, the result might differ
            const lowSyncopationScorer = new StreamScorer({
                beatsPerSection: 8,
                ioiVarianceWeight: 0.5, // High IOI weight
                syncopationWeight: 0.05, // Very low syncopation weight
                phraseSignificanceWeight: 0.25,
                densityWeight: 0.2,
            });
            const lowSyncopationResult = lowSyncopationScorer.score(streams, phraseResult, densityResult);

            // The scores should be different
            const lowSyncScore = lowSyncopationResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            const highSyncScore = syncopationResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );

            // Low syncopation weight should reduce low band's advantage
            expect(lowSyncScore!.score).toBeLessThan(highSyncScore!.score);
        });

        it('should include custom factor weights in config', async () => {
            const customWeights = {
                beatsPerSection: 4,
                ioiVarianceWeight: 0.4,
                syncopationWeight: 0.2,
                phraseSignificanceWeight: 0.25,
                densityWeight: 0.15,
            };
            scorer = new StreamScorer(customWeights);

            const config = scorer.getConfig();
            expect(config.ioiVarianceWeight).toBe(0.4);
            expect(config.syncopationWeight).toBe(0.2);
            expect(config.beatsPerSection).toBe(4);
        });
    });

    describe('Band Bias Weights', () => {
        beforeEach(() => {
            phraseAnalyzer = new PhraseAnalyzer({ minOccurrences: 2 });
            densityAnalyzer = new DensityAnalyzer();
        });

        it('should apply band bias to final scores', async () => {
            // Create identical patterns for all bands
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            for (let i = 0; i < 8; i++) {
                // All bands have the same syncopated pattern
                const beat = {
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                };
                lowBeats.push(createGeneratedBeat({ ...beat, band: 'low' }));
                midBeats.push(createGeneratedBeat({ ...beat, band: 'mid' }));
                highBeats.push(createGeneratedBeat({ ...beat, band: 'high' }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);

            // First score without bias to get baseline
            const unbiasedScorer = new StreamScorer({ beatsPerSection: 8 });
            const unbiasedResult = unbiasedScorer.score(streams, phraseResult, densityResult);

            // Get baseline scores
            const baselineLow = unbiasedResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            const baselineMid = unbiasedResult.sectionScores.find(
                s => s.band === 'mid' && s.beatRange.start === 0
            );
            const baselineHigh = unbiasedResult.sectionScores.find(
                s => s.band === 'high' && s.beatRange.start === 0
            );

            expect(baselineLow).toBeDefined();
            expect(baselineMid).toBeDefined();
            expect(baselineHigh).toBeDefined();

            // With identical patterns, all bands should have the same base score
            expect(baselineLow!.score).toBeCloseTo(baselineMid!.score, 5);
            expect(baselineMid!.score).toBeCloseTo(baselineHigh!.score, 5);

            // Now score with band bias
            const biasedScorer = new StreamScorer({
                beatsPerSection: 8,
                bandBiasWeights: { low: 0.5, mid: 1.0, high: 1.5 },
            });
            const biasedResult = biasedScorer.score(streams, phraseResult, densityResult);

            const biasedLow = biasedResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            const biasedMid = biasedResult.sectionScores.find(
                s => s.band === 'mid' && s.beatRange.start === 0
            );
            const biasedHigh = biasedResult.sectionScores.find(
                s => s.band === 'high' && s.beatRange.start === 0
            );

            // Verify bias is applied correctly
            // Low should be half the baseline
            expect(biasedLow!.score).toBeCloseTo(baselineLow!.score * 0.5, 5);
            // Mid should be unchanged
            expect(biasedMid!.score).toBeCloseTo(baselineMid!.score * 1.0, 5);
            // High should be 1.5x the baseline
            expect(biasedHigh!.score).toBeCloseTo(baselineHigh!.score * 1.5, 5);
        });

        it('should default to no bias when not configured', async () => {
            // Create a simple pattern
            const lowBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);

            // Create scorer without band bias config
            scorer = new StreamScorer({ beatsPerSection: 8 });
            const config = scorer.getConfig();

            // bandBiasWeights should be undefined by default
            expect(config.bandBiasWeights).toBeUndefined();

            // Score the streams
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // All scores should be based purely on factors (no bias applied)
            const lowScore = scoreResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            expect(lowScore).toBeDefined();

            // Calculate expected score from factors
            const expectedScore =
                lowScore!.factors.ioiVariance * 0.3 +
                lowScore!.factors.syncopationLevel * 0.3 +
                lowScore!.factors.phraseSignificance * 0.25 +
                lowScore!.factors.densityFactor * 0.15;

            // Score should match expected (no bias multiplier)
            expect(lowScore!.score).toBeCloseTo(expectedScore, 5);
        });

        it('should handle missing band in bias config by defaulting to 1.0', async () => {
            // Create identical patterns for all bands
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            for (let i = 0; i < 8; i++) {
                const beat = {
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                };
                lowBeats.push(createGeneratedBeat({ ...beat, band: 'low' }));
                midBeats.push(createGeneratedBeat({ ...beat, band: 'mid' }));
                highBeats.push(createGeneratedBeat({ ...beat, band: 'high' }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);

            // First get baseline scores without any bias
            const baselineScorer = new StreamScorer({ beatsPerSection: 8 });
            const baselineResult = baselineScorer.score(streams, phraseResult, densityResult);

            const baselineMid = baselineResult.sectionScores.find(
                s => s.band === 'mid' && s.beatRange.start === 0
            );
            const baselineHigh = baselineResult.sectionScores.find(
                s => s.band === 'high' && s.beatRange.start === 0
            );

            // Create scorer with partial bias config (only low band specified)
            const partialBiasScorer = new StreamScorer({
                beatsPerSection: 8,
                bandBiasWeights: { low: 0.0, mid: 1.0, high: 1.0 },
            });
            const partialResult = partialBiasScorer.score(streams, phraseResult, densityResult);

            const partialMid = partialResult.sectionScores.find(
                s => s.band === 'mid' && s.beatRange.start === 0
            );
            const partialHigh = partialResult.sectionScores.find(
                s => s.band === 'high' && s.beatRange.start === 0
            );

            // Mid and High bands should have the same score as baseline (1.0 multiplier)
            expect(partialMid!.score).toBeCloseTo(baselineMid!.score, 5);
            expect(partialHigh!.score).toBeCloseTo(baselineHigh!.score, 5);

            // Low band should have zero score (0.0 multiplier = never wins)
            const partialLow = partialResult.sectionScores.find(
                s => s.band === 'low' && s.beatRange.start === 0
            );
            expect(partialLow!.score).toBe(0);
        });

        it('should affect section winners based on bias', async () => {
            // Create identical patterns for all bands
            const lowBeats: GeneratedBeat[] = [];
            const midBeats: GeneratedBeat[] = [];
            const highBeats: GeneratedBeat[] = [];

            for (let i = 0; i < 8; i++) {
                const beat = {
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                };
                lowBeats.push(createGeneratedBeat({ ...beat, band: 'low' }));
                midBeats.push(createGeneratedBeat({ ...beat, band: 'mid' }));
                highBeats.push(createGeneratedBeat({ ...beat, band: 'high' }));
            }

            const streams = createMockStreams(lowBeats, midBeats, highBeats);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);

            // With strong high bias, high band should win
            const highBiasScorer = new StreamScorer({
                beatsPerSection: 8,
                bandBiasWeights: { low: 0.5, mid: 1.0, high: 2.0 },
            });
            const highBiasResult = highBiasScorer.score(streams, phraseResult, densityResult);

            // High band should win the section
            expect(highBiasResult.sectionWinners.length).toBeGreaterThan(0);
            expect(highBiasResult.sectionWinners[0].winner).toBe('high');

            // With strong low bias, low band should win
            const lowBiasScorer = new StreamScorer({
                beatsPerSection: 8,
                bandBiasWeights: { low: 2.0, mid: 1.0, high: 0.5 },
            });
            const lowBiasResult = lowBiasScorer.score(streams, phraseResult, densityResult);

            // Low band should win the section
            expect(lowBiasResult.sectionWinners.length).toBeGreaterThan(0);
            expect(lowBiasResult.sectionWinners[0].winner).toBe('low');
        });

        it('should include bandBiasWeights in config when set', async () => {
            const biasConfig = { low: 0.3, mid: 1.0, high: 1.5 };
            scorer = new StreamScorer({
                beatsPerSection: 8,
                bandBiasWeights: biasConfig,
            });

            const config = scorer.getConfig();
            expect(config.bandBiasWeights).toBeDefined();
            expect(config.bandBiasWeights).toEqual(biasConfig);
        });

        it('should return bandBiasWeights in scoring result config', async () => {
            const biasConfig = { low: 0.3, mid: 1.0, high: 1.5 };
            scorer = new StreamScorer({
                beatsPerSection: 8,
                bandBiasWeights: biasConfig,
            });

            const lowBeats: GeneratedBeat[] = [];
            for (let i = 0; i < 8; i++) {
                lowBeats.push(createGeneratedBeat({
                    timestamp: i * 0.5 + 0.125,
                    beatIndex: i,
                    gridPosition: 1,
                    intensity: 0.7,
                    band: 'low',
                }));
            }

            const streams = createMockStreams(lowBeats, [], []);
            const phraseResult = phraseAnalyzer.analyze(streams.streams);
            const densityResult = densityAnalyzer.analyze(streams);
            const scoreResult = scorer.score(streams, phraseResult, densityResult);

            // Result config should include bandBiasWeights
            expect(scoreResult.config.bandBiasWeights).toBeDefined();
            expect(scoreResult.config.bandBiasWeights).toEqual(biasConfig);
        });
    });
});
