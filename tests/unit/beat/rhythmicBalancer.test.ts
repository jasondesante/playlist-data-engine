/**
 * Tests for RhythmicBalancer - Measure Coverage (Phase 2)
 *
 * Tests the shiftLoneSubdivisionNotes and fillEmptyMeasures functionality
 * for the RhythmicBalancer.
 *
 * Reference: docs/plans/rhythmic-balance.md Phase 2
 */

import { describe, it, expect } from 'vitest';
import {
    RhythmicBalancer,
    DEFAULT_RHYTHMIC_BALANCE_CONFIG,
    getMetricGroupSize,
    isMetricStrongBeat,
    isMetricWeakBeat,
    isStrongBeatForEmphasis,
} from '../../../src/core/analysis/beat/RhythmicBalancer.js';
import type { CompositeBeat, CompositeStream } from '../../../src/core/analysis/beat/CompositeStreamGenerator.js';
import type {
    UnifiedBeatMap,
    Beat,
    BeatMapMetadata,
    DownbeatSegment,
} from '../../../src/core/types/BeatMap.js';
import type { GridType } from '../../../src/core/analysis/beat/RhythmQuantizer.js';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock Beat for UnifiedBeatMap
 */
function createMockBeat(options: {
    timestamp: number;
    beatIndex: number;
    beatInMeasure: number;
    isDownbeat: boolean;
    measureNumber: number;
    intensity?: number;
    confidence?: number;
}): Beat {
    return {
        timestamp: options.timestamp,
        beatInMeasure: options.beatInMeasure,
        isDownbeat: options.isDownbeat,
        measureNumber: options.measureNumber,
        intensity: options.intensity ?? 0.6,
        confidence: options.confidence ?? 1.0,
    };
}

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(options: {
    numMeasures?: number;
    beatsPerMeasure?: number;
    bpm?: number;
    quarterNoteInterval?: number;
}): UnifiedBeatMap {
    const numMeasures = options.numMeasures ?? 4;
    const beatsPerMeasure = options.beatsPerMeasure ?? 4;
    const bpm = options.bpm ?? 120;
    const quarterNoteInterval = options.quarterNoteInterval ?? 60 / bpm;

    const beats: Beat[] = [];
    const segments: DownbeatSegment[] = [
        {
            startBeat: 0,
            downbeatBeatIndex: 0,
            timeSignature: { beatsPerMeasure },
        },
    ];

    let beatIndex = 0;
    for (let measure = 0; measure < numMeasures; measure++) {
        for (let beatInMeasure = 0; beatInMeasure < beatsPerMeasure; beatInMeasure++) {
            beats.push(
                createMockBeat({
                    timestamp: beatIndex * quarterNoteInterval,
                    beatIndex,
                    beatInMeasure,
                    isDownbeat: beatInMeasure === 0,
                    measureNumber: measure,
                })
            );
            beatIndex++;
        }
    }

    return {
        audioId: 'test-audio-id',
        duration: beatIndex * quarterNoteInterval,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: { segments },
        originalMetadata: {
            version: '1.0.0',
            algorithm: 'test',
            minBpm: bpm - 20,
            maxBpm: bpm + 20,
            sensitivity: 1.0,
        } as BeatMapMetadata,
    };
}

/**
 * Create a mock CompositeBeat for testing
 */
function createMockCompositeBeat(options: {
    timestamp: number;
    beatIndex: number;
    gridPosition?: number;
    gridType?: GridType;
    intensity?: number;
    band?: 'low' | 'mid' | 'high';
    sourceBand?: 'low' | 'mid' | 'high';
}): CompositeBeat {
    return {
        timestamp: options.timestamp,
        beatIndex: options.beatIndex,
        gridPosition: options.gridPosition ?? 0,
        gridType: options.gridType ?? 'straight_16th',
        intensity: options.intensity ?? 0.6,
        band: options.band ?? 'mid',
        sourceBand: options.sourceBand ?? 'mid',
    };
}

/**
 * Create a minimal CompositeStream for testing
 */
function createMockCompositeStream(beats: CompositeBeat[]): CompositeStream {
    return {
        beats,
        sections: [],
        naturalDifficulty: 'medium',
        quarterNoteInterval: 0.5,
        metadata: {
            totalBeats: beats.length,
            sectionCount: 0,
            beatsPerBand: { low: 0, mid: beats.length, high: 0 },
            sectionsPerBand: { low: 0, mid: 0, high: 0 },
        },
    };
}

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Helper Functions', () => {
    describe('getMetricGroupSize', () => {
        it('should return 2 for simple meters (not divisible by 3)', () => {
            expect(getMetricGroupSize(2)).toBe(2); // 2/4
            expect(getMetricGroupSize(4)).toBe(2); // 4/4
            expect(getMetricGroupSize(5)).toBe(2); // 5/4
            expect(getMetricGroupSize(7)).toBe(2); // 7/4
        });

        it('should return 3 for compound meters (divisible by 3)', () => {
            expect(getMetricGroupSize(3)).toBe(3); // 3/4
            expect(getMetricGroupSize(6)).toBe(3); // 6/8
            expect(getMetricGroupSize(9)).toBe(3); // 9/8
            expect(getMetricGroupSize(12)).toBe(3); // 12/8
        });
    });

    describe('isMetricStrongBeat', () => {
        it('should identify strong beats in simple meter (groups of 2)', () => {
            // 4/4 time: beats 0, 2 are strong (positions 0, 2 in measure)
            expect(isMetricStrongBeat(0, 2)).toBe(true);
            expect(isMetricStrongBeat(1, 2)).toBe(false);
            expect(isMetricStrongBeat(2, 2)).toBe(true);
            expect(isMetricStrongBeat(3, 2)).toBe(false);
        });

        it('should identify strong beats in compound meter (groups of 3)', () => {
            // 9/8 time: beats 0, 3, 6 are strong
            expect(isMetricStrongBeat(0, 3)).toBe(true);
            expect(isMetricStrongBeat(1, 3)).toBe(false);
            expect(isMetricStrongBeat(2, 3)).toBe(false);
            expect(isMetricStrongBeat(3, 3)).toBe(true);
            expect(isMetricStrongBeat(6, 3)).toBe(true);
            expect(isMetricStrongBeat(7, 3)).toBe(false);
        });
    });

    describe('isMetricWeakBeat', () => {
        it('should identify weak beats in simple meter (groups of 2)', () => {
            expect(isMetricWeakBeat(0, 2)).toBe(false);
            expect(isMetricWeakBeat(1, 2)).toBe(true);
            expect(isMetricWeakBeat(2, 2)).toBe(false);
            expect(isMetricWeakBeat(3, 2)).toBe(true);
        });

        it('should identify weak beats in compound meter (groups of 3)', () => {
            expect(isMetricWeakBeat(0, 3)).toBe(false);
            expect(isMetricWeakBeat(1, 3)).toBe(true);
            expect(isMetricWeakBeat(2, 3)).toBe(true);
            expect(isMetricWeakBeat(3, 3)).toBe(false);
        });
    });

    describe('isStrongBeatForEmphasis', () => {
        it('should return false for all beats in neutral mode', () => {
            for (let i = 0; i < 8; i++) {
                expect(isStrongBeatForEmphasis(i, 4, 'neutral')).toBe(false);
            }
        });

        it('should use natural emphasis in natural mode', () => {
            // 4/4 natural: 0, 2 are strong
            expect(isStrongBeatForEmphasis(0, 4, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(1, 4, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(2, 4, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(3, 4, 'natural')).toBe(false);
        });

        it('should use weak beat emphasis in backbeat mode', () => {
            // 4/4 backbeat: 1, 3 are "strong" (emphasized)
            expect(isStrongBeatForEmphasis(0, 4, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(1, 4, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(2, 4, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(3, 4, 'backbeat')).toBe(true);
        });
    });
});

// ============================================================================
// RhythmicBalancer Tests
// ============================================================================

describe('RhythmicBalancer', () => {
    describe('Constructor and Configuration', () => {
        it('should create a balancer with default configuration', () => {
            const balancer = new RhythmicBalancer();
            const config = balancer.getConfig();

            expect(config.strongBeatEmphasis).toBe('natural');
            expect(config.downbeatProximityRange).toBe(2);
            expect(config.fillEmptyMeasures).toBe(true);
            expect(config.addedBeatIntensity).toBe(0.45);
        });

        it('should accept custom configuration', () => {
            const balancer = new RhythmicBalancer({
                strongBeatEmphasis: 'backbeat',
                downbeatProximityRange: 4,
                fillEmptyMeasures: false,
                addedBeatIntensity: 0.6,
            });
            const config = balancer.getConfig();

            expect(config.strongBeatEmphasis).toBe('backbeat');
            expect(config.downbeatProximityRange).toBe(4);
            expect(config.fillEmptyMeasures).toBe(false);
            expect(config.addedBeatIntensity).toBe(0.6);
        });

        it('should merge partial configuration with defaults', () => {
            const balancer = new RhythmicBalancer({
                downbeatProximityRange: 0,
            });
            const config = balancer.getConfig();

            expect(config.strongBeatEmphasis).toBe('natural'); // default
            expect(config.downbeatProximityRange).toBe(0); // custom
            expect(config.fillEmptyMeasures).toBe(true); // default
        });
    });

    describe('shiftLoneSubdivisionNotes (Task 2.3.1-2.3.5)', () => {
        it('2.3.1: should shift a lone "e" note (gridPosition 1) to downbeat', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            // Create a composite with a lone "e" note in measure 1 (beatIndex 4)
            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0, // measure 0, beat 0 - downbeat
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 2.25, // measure 1, beat 0 + 0.25 (gridPosition 1 = "e")
                    beatIndex: 4,
                    gridPosition: 1, // "e" - lone subdivision
                    intensity: 0.7,
                    band: 'mid',
                    sourceBand: 'mid',
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // The lone "e" should now be at gridPosition 0 (downbeat)
            const shiftedBeat = result.composite.beats.find((b) => b.beatIndex === 4);
            expect(shiftedBeat).toBeDefined();
            expect(shiftedBeat!.gridPosition).toBe(0);
            expect(shiftedBeat!.intensity).toBe(0.7); // preserved
            expect(shiftedBeat!.band).toBe('mid'); // preserved
            expect(shiftedBeat!.sourceBand).toBe('mid'); // preserved
        });

        it('2.3.2: should shift a lone "+" note (gridPosition 2) to downbeat', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 2.5, // measure 1, beat 0 + 0.5 (gridPosition 2 = "+")
                    beatIndex: 4,
                    gridPosition: 2, // "+" - lone subdivision
                    intensity: 0.8,
                    band: 'high',
                    sourceBand: 'high',
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            const shiftedBeat = result.composite.beats.find((b) => b.beatIndex === 4);
            expect(shiftedBeat).toBeDefined();
            expect(shiftedBeat!.gridPosition).toBe(0);
            expect(shiftedBeat!.intensity).toBe(0.8); // preserved
            expect(shiftedBeat!.band).toBe('high'); // preserved
        });

        it('2.3.3: should leave a lone downbeat unchanged', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0, // already on downbeat
                    intensity: 0.9,
                }),
                // Measure 1 has a single beat on downbeat
                createMockCompositeBeat({
                    timestamp: 2.0,
                    beatIndex: 4,
                    gridPosition: 0, // already on downbeat
                    intensity: 0.75,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            // Disable fillEmptyMeasures so we only test the shift behavior
            const balancer = new RhythmicBalancer({ fillEmptyMeasures: false, marginSeconds: 0 });
            const result = balancer.balance(composite, unifiedBeatMap);

            // Both beats should be unchanged
            expect(result.composite.beats.length).toBe(2);
            const beat0 = result.composite.beats.find((b) => b.beatIndex === 0);
            const beat4 = result.composite.beats.find((b) => b.beatIndex === 4);

            expect(beat0!.gridPosition).toBe(0);
            expect(beat0!.intensity).toBe(0.9);
            expect(beat4!.gridPosition).toBe(0);
            expect(beat4!.intensity).toBe(0.75);
        });

        it('2.3.5: should not modify measures with 2+ beats', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                // Measure 0 has 2 beats
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 0.25,
                    beatIndex: 0,
                    gridPosition: 1, // "e"
                }),
                // Measure 1 has 3 beats - none should be shifted
                createMockCompositeBeat({
                    timestamp: 2.0,
                    beatIndex: 4,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 2.25,
                    beatIndex: 4,
                    gridPosition: 1, // "e"
                }),
                createMockCompositeBeat({
                    timestamp: 2.5,
                    beatIndex: 4,
                    gridPosition: 2, // "+"
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // All original beats should be present with same grid positions
            const measure1Beats = result.composite.beats.filter((b) => b.beatIndex === 4);
            expect(measure1Beats.length).toBe(3);
            expect(measure1Beats.map((b) => b.gridPosition).sort()).toEqual([0, 1, 2]);
        });
    });

    describe('fillEmptyMeasures (Task 2.3.4)', () => {
        it('2.3.4: should add a beat to empty measures on beat 1 downbeat', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                // Only measure 0 and 2 have beats
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 4.0, // measure 2
                    beatIndex: 8,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer({ marginSeconds: 0 });
            const result = balancer.balance(composite, unifiedBeatMap);

            // Should have added beats for measures 1 and 3
            expect(result.composite.beats.length).toBe(4);

            // Check measure 1 (beatIndex 4) has a beat
            const measure1Beat = result.composite.beats.find((b) => b.beatIndex === 4);
            expect(measure1Beat).toBeDefined();
            expect(measure1Beat!.gridPosition).toBe(0);
            expect(measure1Beat!.intensity).toBe(DEFAULT_RHYTHMIC_BALANCE_CONFIG.addedBeatIntensity);

            // Check measure 3 (beatIndex 12) has a beat
            const measure3Beat = result.composite.beats.find((b) => b.beatIndex === 12);
            expect(measure3Beat).toBeDefined();
            expect(measure3Beat!.gridPosition).toBe(0);
        });

        it('should not add beats when fillEmptyMeasures is false', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer({
                fillEmptyMeasures: false,
                marginSeconds: 0,
            });
            const result = balancer.balance(composite, unifiedBeatMap);

            // Should only have the original beat (no filling)
            expect(result.composite.beats.length).toBe(1);
        });

        it('should use configured addedBeatIntensity for new beats', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 2 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer({
                addedBeatIntensity: 0.55,
                marginSeconds: 0,
            });
            const result = balancer.balance(composite, unifiedBeatMap);

            const addedBeat = result.composite.beats.find((b) => b.beatIndex === 4);
            expect(addedBeat!.intensity).toBe(0.55);
        });

        it('should use mid band for added beats', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 2 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer({ marginSeconds: 0 });
            const result = balancer.balance(composite, unifiedBeatMap);

            const addedBeat = result.composite.beats.find((b) => b.beatIndex === 4);
            expect(addedBeat!.band).toBe('mid');
            expect(addedBeat!.sourceBand).toBe('mid');
        });
    });

    describe('Edge Cases (Task 2.3.6)', () => {
        it('2.3.6: should handle partial final measure gracefully', () => {
            // Create a beat map where the audio doesn't extend to the end of the last measure
            // by having beats only up to beatIndex 14 (cuts off 2 beats of measure 3 in 4/4 time)
            const numMeasures = 4;
            const beatsPerMeasure = 4;
            const bpm = 120;
            const quarterNoteInterval = 60 / bpm;

            const beats: Beat[] = [];
            const segments: DownbeatSegment[] = [
                {
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure },
                },
            ];

            // Only create 14 beats (instead of 16 for 4 measures)
            let beatIndex = 0;
            for (let measure = 0; measure < numMeasures; measure++) {
                for (let beatInMeasure = 0; beatInMeasure < beatsPerMeasure; beatInMeasure++) {
                    if (beatIndex >= 14) break; // Stop at 14 beats
                    beats.push(
                        createMockBeat({
                            timestamp: beatIndex * quarterNoteInterval,
                            beatIndex,
                            beatInMeasure,
                            isDownbeat: beatInMeasure === 0,
                            measureNumber: measure,
                        })
                    );
                    beatIndex++;
                }
            }

            const partialBeatMap: UnifiedBeatMap = {
                audioId: 'test-audio-id',
                duration: beats.length * quarterNoteInterval,
                beats,
                detectedBeatIndices: beats.map((_, i) => i),
                quarterNoteInterval,
                quarterNoteBpm: bpm,
                downbeatConfig: { segments },
                originalMetadata: {
                    version: '1.0.0',
                    algorithm: 'test',
                    minBpm: bpm - 20,
                    maxBpm: bpm + 20,
                    sensitivity: 1.0,
                } as BeatMapMetadata,
            };

            const compositeBeats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(compositeBeats);
            const balancer = new RhythmicBalancer();
            // Should not throw
            const result = balancer.balance(composite, partialBeatMap);

            expect(result.composite.beats.length).toBeGreaterThan(0);
        });

        it('should handle empty composite stream', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const composite = createMockCompositeStream([]);
            const balancer = new RhythmicBalancer({ marginSeconds: 0 });
            const result = balancer.balance(composite, unifiedBeatMap);

            // Should add beats for all measures
            expect(result.composite.beats.length).toBe(4); // 4 measures
            expect(result.composite.beats.every((b) => b.gridPosition === 0)).toBe(true);
        });

        it('should handle composite with beats outside unified beat map range', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 2 });

            // Beat at beatIndex 20 which doesn't exist in our 2-measure beat map
            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 10.0,
                    beatIndex: 20, // Out of range
                    gridPosition: 1,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer({ marginSeconds: 0 });
            // Should not throw - beats outside range are kept as-is
            const result = balancer.balance(composite, unifiedBeatMap);

            expect(result.composite.beats.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Composite Stream Preservation', () => {
        it('should preserve sections, naturalDifficulty, and quarterNoteInterval', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const composite = {
                beats: [
                    createMockCompositeBeat({
                        timestamp: 0,
                        beatIndex: 0,
                        gridPosition: 0,
                    }),
                ],
                sections: [{ sourceBand: 'mid' as const, score: 0.8, beatRange: { start: 0, end: 3 }, margin: 0.1 }],
                naturalDifficulty: 'hard' as const,
                quarterNoteInterval: 0.4,
                metadata: {
                    totalBeats: 1,
                    sectionCount: 1,
                    beatsPerBand: { low: 0, mid: 1, high: 0 },
                    sectionsPerBand: { low: 0, mid: 1, high: 0 },
                },
            };

            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            expect(result.composite.sections).toEqual(composite.sections);
            expect(result.composite.naturalDifficulty).toBe('hard');
            expect(result.composite.quarterNoteInterval).toBe(0.4);
        });

        it('should update metadata.totalBeats after balancing', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const composite = createMockCompositeStream([
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ]);

            const balancer = new RhythmicBalancer({ marginSeconds: 0 });
            const result = balancer.balance(composite, unifiedBeatMap);

            // Should have added beats for measures 1, 2, 3
            expect(result.composite.metadata.totalBeats).toBe(4);
        });

        it('should sort beats by timestamp after processing', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 4.0,
                    beatIndex: 8,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Verify sorted order
            for (let i = 1; i < result.composite.beats.length; i++) {
                expect(result.composite.beats[i].timestamp).toBeGreaterThanOrEqual(
                    result.composite.beats[i - 1].timestamp
                );
            }
        });
    });
});

// ============================================================================
// Downbeat Proximity Tests (Phase 3 - Task 3.2)
// ============================================================================

describe('enforceDownbeatProximity (Task 3.2)', () => {
    // All tests use fillEmptyMeasures: false to isolate proximity behavior
    // and avoid interference from the fill step.

    it('3.3.1: range=0 - upbeat with downbeat at same beatIndex is kept as-is', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
            }),
            // Measure 1: downbeat + upbeat at same beatIndex
            createMockCompositeBeat({
                timestamp: 2.0,
                beatIndex: 4,
                gridPosition: 0, // downbeat
            }),
            createMockCompositeBeat({
                timestamp: 2.25,
                beatIndex: 4,
                gridPosition: 1, // upbeat at same beatIndex as downbeat
                intensity: 0.7,
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            downbeatProximityRange: 0,
            fillEmptyMeasures: false,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        // The upbeat should be kept — there's a downbeat at the same beatIndex
        const upbeat = result.composite.beats.find(b => b.beatIndex === 4 && b.gridPosition === 1);
        expect(upbeat).toBeDefined();
        expect(upbeat!.intensity).toBe(0.7);
    });

    it('3.3.2: range=0 - upbeat with no downbeat at same beatIndex is shifted', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
            }),
            // Measure 1: downbeat at 4, upbeat at 5 (different beatIndex)
            createMockCompositeBeat({
                timestamp: 2.0,
                beatIndex: 4,
                gridPosition: 0, // downbeat
            }),
            createMockCompositeBeat({
                timestamp: 2.75,
                beatIndex: 5,
                gridPosition: 1, // upbeat, no downbeat at beatIndex 5
                intensity: 0.7,
                band: 'high',
                sourceBand: 'high',
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            downbeatProximityRange: 0,
            fillEmptyMeasures: false,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        // The upbeat should be shifted to gridPosition 0
        const shiftedBeat = result.composite.beats.find(b => b.beatIndex === 5);
        expect(shiftedBeat).toBeDefined();
        expect(shiftedBeat!.gridPosition).toBe(0);
        expect(shiftedBeat!.intensity).toBe(0.7); // preserved
        expect(shiftedBeat!.band).toBe('high'); // preserved
        expect(shiftedBeat!.sourceBand).toBe('high'); // preserved
    });

    it('3.3.3: range=2 - upbeat with downbeat 1 beat away is kept', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
            }),
            createMockCompositeBeat({
                timestamp: 2.0,
                beatIndex: 4,
                gridPosition: 0, // downbeat
            }),
            createMockCompositeBeat({
                timestamp: 2.75,
                beatIndex: 5,
                gridPosition: 1, // upbeat, downbeat is 1 beat away (beatIndex 4)
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            downbeatProximityRange: 2,
            fillEmptyMeasures: false,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        // The upbeat should be kept — downbeat is 1 beat away, within range 2
        const upbeat = result.composite.beats.find(b => b.beatIndex === 5 && b.gridPosition === 1);
        expect(upbeat).toBeDefined();
    });

    it('3.3.4: range=2 - upbeat with nearest downbeat >2 beats away is shifted', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0, // only downbeat, at beatIndex 0
            }),
            // Measure 1: two upbeats, no downbeats (measure has 2 beats, so
            // shiftLoneSubdivisionNotes won't touch them)
            createMockCompositeBeat({
                timestamp: 2.25,
                beatIndex: 4,
                gridPosition: 1, // upbeat, nearest downbeat is 4 beats away
                intensity: 0.65,
                band: 'low',
                sourceBand: 'low',
            }),
            createMockCompositeBeat({
                timestamp: 2.75,
                beatIndex: 5,
                gridPosition: 1, // upbeat
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            downbeatProximityRange: 2,
            fillEmptyMeasures: false,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        // beatIndex 4 should be shifted — nearest original downbeat is at index 0 (4 away)
        const shiftedBeat = result.composite.beats.find(b => b.beatIndex === 4);
        expect(shiftedBeat).toBeDefined();
        expect(shiftedBeat!.gridPosition).toBe(0);
        expect(shiftedBeat!.intensity).toBe(0.65); // preserved
        expect(shiftedBeat!.band).toBe('low'); // preserved
        expect(shiftedBeat!.sourceBand).toBe('low'); // preserved
    });

    it('3.3.5: range=4 - upbeat with downbeat in same measure is kept', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
            }),
            // Measure 1: downbeat at 4, upbeat at 7 (3 beats apart)
            createMockCompositeBeat({
                timestamp: 2.0,
                beatIndex: 4,
                gridPosition: 0, // downbeat
            }),
            createMockCompositeBeat({
                timestamp: 3.5,
                beatIndex: 7,
                gridPosition: 2, // upbeat, downbeat is 3 beats away (within range 4)
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            downbeatProximityRange: 4,
            fillEmptyMeasures: false,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        // The upbeat should be kept — downbeat is 3 beats away, within range 4
        const upbeat = result.composite.beats.find(b => b.beatIndex === 7 && b.gridPosition === 2);
        expect(upbeat).toBeDefined();
    });

    it('3.3.6: downbeat note (gridPosition 0) is never shifted regardless of proximity', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            // Isolated downbeat, no other beats nearby
            createMockCompositeBeat({
                timestamp: 6.0,
                beatIndex: 12,
                gridPosition: 0, // downbeat
                intensity: 0.8,
                band: 'low',
                sourceBand: 'low',
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            downbeatProximityRange: 0,
            fillEmptyMeasures: false,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        // The downbeat should be completely unchanged
        const downbeat = result.composite.beats.find(b => b.beatIndex === 12);
        expect(downbeat).toBeDefined();
        expect(downbeat!.gridPosition).toBe(0);
        expect(downbeat!.intensity).toBe(0.8);
        expect(downbeat!.band).toBe('low');
        expect(downbeat!.sourceBand).toBe('low');
    });
});

// ============================================================================
// Non-4/4 Time Signature Tests
// ============================================================================

describe('Non-4/4 Time Signatures', () => {
    it('should work with 3/4 time signature', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({
            numMeasures: 4,
            beatsPerMeasure: 3,
        });

        const beats: CompositeBeat[] = [
            // Lone "e" note in measure 1 (beatIndex 3)
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
            }),
            createMockCompositeBeat({
                timestamp: 1.5, // measure 1, beat 0 + 0.5
                beatIndex: 3,
                gridPosition: 2,
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer();
        const result = balancer.balance(composite, unifiedBeatMap);

        // Should be shifted to downbeat
        const shiftedBeat = result.composite.beats.find((b) => b.beatIndex === 3);
        expect(shiftedBeat!.gridPosition).toBe(0);
    });

    it('should work with 6/8 compound time signature', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({
            numMeasures: 4,
            beatsPerMeasure: 6,
        });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({
                timestamp: 0,
                beatIndex: 0,
                gridPosition: 0,
            }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({ marginSeconds: 0 });
        const result = balancer.balance(composite, unifiedBeatMap);

        // Each measure should have at least one beat
        const measureCounts = new Map<number, number>();
        for (const beat of result.composite.beats) {
            const beatInfo = unifiedBeatMap.beats[beat.beatIndex];
            if (beatInfo) {
                const count = measureCounts.get(beatInfo.measureNumber) ?? 0;
                measureCounts.set(beatInfo.measureNumber, count + 1);
            }
        }

        // All 4 measures should have at least 1 beat
        expect(measureCounts.size).toBe(4);
        for (const count of measureCounts.values()) {
            expect(count).toBeGreaterThanOrEqual(1);
        }
    });
});

// ============================================================================
// Margin Removal Tests (Phase 4)
// ============================================================================

describe('removeMarginNotes', () => {
    it('should remove beats within the start margin', () => {
        // 4 measures at 120 BPM = 8 seconds duration
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),   // removed (at start)
            createMockCompositeBeat({ timestamp: 0.3, beatIndex: 1, gridPosition: 2 }),   // removed (< 0.5s)
            createMockCompositeBeat({ timestamp: 0.6, beatIndex: 1, gridPosition: 2 }),   // kept (>= 0.5s)
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            fillEmptyMeasures: false,
            marginSeconds: 0.5,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        expect(result.composite.beats.length).toBe(1);
        expect(result.composite.beats[0].timestamp).toBe(0.6);
        expect(result.stats.marginRemovals).toBe(2);
    });

    it('should remove beats within the end margin', () => {
        // 4 measures at 120 BPM = 8 seconds duration
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),   // kept
            createMockCompositeBeat({ timestamp: 7.4, beatIndex: 15, gridPosition: 1 }),  // kept (<= 7.5)
            createMockCompositeBeat({ timestamp: 7.8, beatIndex: 15, gridPosition: 2 }),  // removed (> 7.5)
            createMockCompositeBeat({ timestamp: 8.0, beatIndex: 15, gridPosition: 3 }),  // removed (> 7.5)
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            fillEmptyMeasures: false,
            marginSeconds: 0.5,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        expect(result.composite.beats.length).toBe(2);
        expect(result.stats.marginRemovals).toBe(2);
    });

    it('should not remove beats when marginSeconds is 0', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 0.0, beatIndex: 0, gridPosition: 0 }),
            createMockCompositeBeat({ timestamp: 8.0, beatIndex: 15, gridPosition: 3 }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            fillEmptyMeasures: false,
            marginSeconds: 0,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        expect(result.composite.beats.length).toBe(2);
        expect(result.stats.marginRemovals).toBe(0);
    });

    it('should use the default margin of 0.5 seconds', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 0.1, beatIndex: 0, gridPosition: 0 }),   // removed (< 0.5s)
            createMockCompositeBeat({ timestamp: 1.0, beatIndex: 2, gridPosition: 0 }),   // kept
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({ fillEmptyMeasures: false });
        const result = balancer.balance(composite, unifiedBeatMap);

        expect(result.composite.beats.length).toBe(1);
        expect(result.stats.marginRemovals).toBe(1);
    });

    it('should handle beat exactly at the margin boundary (inclusive)', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 0.5, beatIndex: 1, gridPosition: 0 }),   // kept (>= 0.5s, not < 0.5s)
            createMockCompositeBeat({ timestamp: 7.5, beatIndex: 15, gridPosition: 0 }),  // kept (<= 7.5s, not > 7.5s)
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            fillEmptyMeasures: false,
            marginSeconds: 0.5,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        expect(result.composite.beats.length).toBe(2);
        expect(result.stats.marginRemovals).toBe(0);
    });

    it('should remove beats added by fillEmptyMeasures that fall within the margin', () => {
        // When fillEmptyMeasures adds a beat at timestamp 0 (measure 0 downbeat),
        // it should be removed by the margin rule
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        // Start with only a beat in measure 2
        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 4.0, beatIndex: 8, gridPosition: 0 }),
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({ marginSeconds: 0.5 });
        const result = balancer.balance(composite, unifiedBeatMap);

        // Measure 0's filled beat (timestamp 0) should be removed by margin rule
        // Measure 1, 2, 3 beats should remain
        const measure0Beat = result.composite.beats.find(b => b.beatIndex === 0);
        expect(measure0Beat).toBeUndefined();

        // Should have filled measures 1, 3 and kept measure 2
        expect(result.composite.beats.length).toBe(3);
        expect(result.stats.marginRemovals).toBe(1);
    });

    it('should handle custom margin values', () => {
        const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

        const beats: CompositeBeat[] = [
            createMockCompositeBeat({ timestamp: 0.3, beatIndex: 1, gridPosition: 0 }),   // removed (< 1.0s)
            createMockCompositeBeat({ timestamp: 0.8, beatIndex: 1, gridPosition: 2 }),   // removed (< 1.0s)
            createMockCompositeBeat({ timestamp: 1.2, beatIndex: 2, gridPosition: 0 }),   // kept (>= 1.0s)
        ];

        const composite = createMockCompositeStream(beats);
        const balancer = new RhythmicBalancer({
            fillEmptyMeasures: false,
            marginSeconds: 1.0,
        });
        const result = balancer.balance(composite, unifiedBeatMap);

        expect(result.composite.beats.length).toBe(1);
        expect(result.stats.marginRemovals).toBe(2);
    });
});
