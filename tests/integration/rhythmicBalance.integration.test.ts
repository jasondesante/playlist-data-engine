/**
 * Integration Tests for Rhythmic Balance Pipeline
 *
 * Tests the complete integration of RhythmicBalancer within the rhythm
 * generation pipeline, including:
 * - Empty measure handling
 * - Lone upbeat shifting
 * - Downbeat proximity enforcement
 * - Density reduction with strong beat emphasis
 * - Non-4/4 time signature support
 *
 * Reference: docs/plans/rhythmic-balance.md Phase 5
 */

import { describe, it, expect } from 'vitest';
import {
    RhythmicBalancer,
    DEFAULT_RHYTHMIC_BALANCE_CONFIG,
    findActiveSegment,
    isStrongBeatForEmphasis,
    getMetricGroupSize,
} from '../../src/core/analysis/beat/RhythmicBalancer.js';
import type { CompositeBeat, CompositeStream } from '../../src/core/analysis/beat/CompositeStreamGenerator.js';
import type {
    UnifiedBeatMap,
    Beat,
    DownbeatSegment,
} from '../../src/core/types/BeatMap.js';
import { BEAT_DETECTION_VERSION, BEAT_DETECTION_ALGORITHM } from '../../src/core/types/BeatMap.js';
import type { GridType } from '../../src/core/analysis/beat/RhythmQuantizer.js';

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
    segments?: DownbeatSegment[];
}): UnifiedBeatMap {
    const numMeasures = options.numMeasures ?? 4;
    const beatsPerMeasure = options.beatsPerMeasure ?? 4;
    const bpm = options.bpm ?? 120;
    const quarterNoteInterval = options.quarterNoteInterval ?? 60 / bpm;

    const beats: Beat[] = [];
    const segments = options.segments ?? [
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
            version: BEAT_DETECTION_VERSION,
            algorithm: BEAT_DETECTION_ALGORITHM,
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            filter: 0.0,
            noiseFloorThreshold: 0,
            hopSizeMs: 4,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        },
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
        metadata: { totalBeats: beats.length },
    };
}

/**
 * Get all measure numbers from a beat map
 */
function getMeasureRange(unifiedBeatMap: UnifiedBeatMap): number[] {
    const measures = new Set<number>();
    for (const beat of unifiedBeatMap.beats) {
        measures.add(beat.measureNumber);
    }
    return Array.from(measures).sort((a, b) => a - b);
}

/**
 * Count beats per measure in a composite stream
 */
function countBeatsPerMeasure(
    beats: CompositeBeat[],
    unifiedBeatMap: UnifiedBeatMap
): Map<number, number> {
    const counts = new Map<number, number>();
    for (const beat of beats) {
        const beatInfo = unifiedBeatMap.beats[beat.beatIndex];
        if (beatInfo) {
            const measure = beatInfo.measureNumber;
            counts.set(measure, (counts.get(measure) ?? 0) + 1);
        }
    }
    return counts;
}

// ============================================================================
// Phase 5: Integration Tests
// ============================================================================

describe('Rhythmic Balance Integration Tests', () => {
    // =========================================================================
    // Task 5.1: End-to-end test — empty measures
    // =========================================================================
    describe('Task 5.1: Empty measures end-to-end', () => {
        it('5.1.1-5.1.2: should fill all empty measures with a beat on beat 1 downbeat', () => {
            // Create a composite stream with several empty measures
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 8, beatsPerMeasure: 4 });

            // Create beats only in measures 0, 3, 7 (leaving 1, 2, 4, 5, 6 empty)
            const beats: CompositeBeat[] = [
                // Measure 0
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                    intensity: 0.8,
                }),
                // Measure 3 (beatIndex 12)
                createMockCompositeBeat({
                    timestamp: 6.0,
                    beatIndex: 12,
                    gridPosition: 0,
                    intensity: 0.7,
                }),
                // Measure 7 (beatIndex 28)
                createMockCompositeBeat({
                    timestamp: 14.0,
                    beatIndex: 28,
                    gridPosition: 0,
                    intensity: 0.75,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Verify every measure has at least 1 beat
            const measures = getMeasureRange(unifiedBeatMap);
            const beatsPerMeasure = countBeatsPerMeasure(result.beats, unifiedBeatMap);

            for (const measure of measures) {
                const count = beatsPerMeasure.get(measure) ?? 0;
                expect(count).toBeGreaterThanOrEqual(1);
            }

            // Verify that each measure has a beat on beat 1 (gridPosition 0 at the downbeat beatIndex)
            for (const measure of measures) {
                const downbeatBeatIndex = measure * 4; // 4/4 time
                const downbeatBeat = result.beats.find(
                    b => b.beatIndex === downbeatBeatIndex && b.gridPosition === 0
                );
                expect(downbeatBeat).toBeDefined();
            }

            console.log(`\n✓ Empty measures filled correctly`);
            console.log(`  Input beats: ${beats.length}`);
            console.log(`  Output beats: ${result.beats.length}`);
            console.log(`  Measures with beats: ${beatsPerMeasure.size}`);
        });

        it('should preserve original beats while adding beats for empty measures', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4, beatsPerMeasure: 4 });

            const originalBeats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                    intensity: 0.9,
                    band: 'low',
                    sourceBand: 'low',
                }),
                createMockCompositeBeat({
                    timestamp: 6.0, // measure 3
                    beatIndex: 12,
                    gridPosition: 0,
                    intensity: 0.8,
                    band: 'high',
                    sourceBand: 'high',
                }),
            ];

            const composite = createMockCompositeStream([...originalBeats]);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Verify original beats are preserved with their properties
            const beat0 = result.beats.find(b => b.beatIndex === 0);
            expect(beat0).toBeDefined();
            expect(beat0!.intensity).toBe(0.9);
            expect(beat0!.band).toBe('low');
            expect(beat0!.sourceBand).toBe('low');

            const beat12 = result.beats.find(b => b.beatIndex === 12);
            expect(beat12).toBeDefined();
            expect(beat12!.intensity).toBe(0.8);
            expect(beat12!.band).toBe('high');
            expect(beat12!.sourceBand).toBe('high');
        });

        it('should use configured intensity for added beats', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const customIntensity = 0.55;
            const balancer = new RhythmicBalancer({
                addedBeatIntensity: customIntensity,
            });
            const result = balancer.balance(composite, unifiedBeatMap);

            // Find the added beats (not the original)
            const addedBeats = result.beats.filter(b => b.beatIndex !== 0);
            for (const addedBeat of addedBeats) {
                expect(addedBeat.intensity).toBe(customIntensity);
            }
        });
    });

    // =========================================================================
    // Task 5.2: End-to-end test — lone upbeats and proximity
    // =========================================================================
    describe('Task 5.2: Lone upbeats and proximity end-to-end', () => {
        it('5.2.1-5.2.2: should shift subdivision notes to downbeats', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4, beatsPerMeasure: 4 });

            // Create a composite with measures containing lone subdivision notes
            const beats: CompositeBeat[] = [
                // Measure 0: normal downbeat
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                // Measure 1: lone "e" note (should be shifted)
                createMockCompositeBeat({
                    timestamp: 2.25, // beatIndex 4 + 0.25
                    beatIndex: 4,
                    gridPosition: 1, // "e"
                    intensity: 0.7,
                    band: 'mid',
                    sourceBand: 'mid',
                }),
                // Measure 2: lone "+" note (should be shifted)
                createMockCompositeBeat({
                    timestamp: 4.5, // beatIndex 8 + 0.5
                    beatIndex: 8,
                    gridPosition: 2, // "+"
                    intensity: 0.65,
                    band: 'high',
                    sourceBand: 'high',
                }),
                // Measure 3: lone "a" note (should be shifted)
                createMockCompositeBeat({
                    timestamp: 6.75, // beatIndex 12 + 0.75
                    beatIndex: 12,
                    gridPosition: 3, // "a"
                    intensity: 0.6,
                    band: 'low',
                    sourceBand: 'low',
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // All shifted beats should now be at gridPosition 0
            const measure1Beat = result.beats.find(b => b.beatIndex === 4);
            expect(measure1Beat).toBeDefined();
            expect(measure1Beat!.gridPosition).toBe(0);
            expect(measure1Beat!.intensity).toBe(0.7); // preserved
            expect(measure1Beat!.band).toBe('mid'); // preserved

            const measure2Beat = result.beats.find(b => b.beatIndex === 8);
            expect(measure2Beat).toBeDefined();
            expect(measure2Beat!.gridPosition).toBe(0);
            expect(measure2Beat!.intensity).toBe(0.65); // preserved

            const measure3Beat = result.beats.find(b => b.beatIndex === 12);
            expect(measure3Beat).toBeDefined();
            expect(measure3Beat!.gridPosition).toBe(0);
            expect(measure3Beat!.intensity).toBe(0.6); // preserved
        });

        it('5.2.3: should shift upbeat notes far from any downbeat', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 8 });

            // Create upbeats with no nearby downbeats
            const beats: CompositeBeat[] = [
                // Only downbeat at measure 0
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                // Upbeat at measure 4, far from any downbeat (range 2 won't reach)
                // No downbeats in measures 1, 2, 3, 4, 5, 6, 7 initially
                createMockCompositeBeat({
                    timestamp: 8.25, // beatIndex 16 + 0.25
                    beatIndex: 16,
                    gridPosition: 1, // upbeat
                    intensity: 0.7,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer({
                downbeatProximityRange: 2,
                fillEmptyMeasures: false, // Isolate proximity behavior
            });
            const result = balancer.balance(composite, unifiedBeatMap);

            // The upbeat at beatIndex 16 should be shifted to gridPosition 0
            const shiftedBeat = result.beats.find(b => b.beatIndex === 16);
            expect(shiftedBeat).toBeDefined();
            expect(shiftedBeat!.gridPosition).toBe(0);
            expect(shiftedBeat!.intensity).toBe(0.7);
        });

        it('should handle combined shifting and filling', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                // Measure 0: downbeat
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                // Measure 2: lone upbeat (should be shifted)
                createMockCompositeBeat({
                    timestamp: 4.5,
                    beatIndex: 8,
                    gridPosition: 2,
                    intensity: 0.8,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // All measures should have beats
            const beatsPerMeasure = countBeatsPerMeasure(result.beats, unifiedBeatMap);
            expect(beatsPerMeasure.get(0)).toBeGreaterThanOrEqual(1);
            expect(beatsPerMeasure.get(1)).toBeGreaterThanOrEqual(1);
            expect(beatsPerMeasure.get(2)).toBeGreaterThanOrEqual(1);
            expect(beatsPerMeasure.get(3)).toBeGreaterThanOrEqual(1);

            // The shifted beat in measure 2 should be at gridPosition 0
            const measure2Beat = result.beats.find(b => b.beatIndex === 8);
            expect(measure2Beat!.gridPosition).toBe(0);
        });
    });

    // =========================================================================
    // Task 5.3: End-to-end test — density reduction respects emphasis
    // =========================================================================
    describe('Task 5.3: Density reduction respects emphasis (integration)', () => {
        it('5.3.1-5.3.3: should configure emphasis modes for density reduction', () => {
            // This test verifies that the rhythmicBalanceConfig is properly
            // configured and can be used by DifficultyVariantGenerator.
            // The actual density reduction tests are in the unit tests.

            const naturalBalancer = new RhythmicBalancer({
                strongBeatEmphasis: 'natural',
            });
            expect(naturalBalancer.getConfig().strongBeatEmphasis).toBe('natural');

            const backbeatBalancer = new RhythmicBalancer({
                strongBeatEmphasis: 'backbeat',
            });
            expect(backbeatBalancer.getConfig().strongBeatEmphasis).toBe('backbeat');

            const neutralBalancer = new RhythmicBalancer({
                strongBeatEmphasis: 'neutral',
            });
            expect(neutralBalancer.getConfig().strongBeatEmphasis).toBe('neutral');
        });

        it('should correctly identify strong beats based on emphasis mode', () => {
            // Test the helper functions that determine strong beats
            // for density reduction

            // 4/4 time: natural emphasizes 0, 2; backbeat emphasizes 1, 3
            const beatsPerMeasure = 4;

            // Natural mode: beats 0 and 2 are strong
            expect(isStrongBeatForEmphasis(0, beatsPerMeasure, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(1, beatsPerMeasure, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(2, beatsPerMeasure, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(3, beatsPerMeasure, 'natural')).toBe(false);

            // Backbeat mode: beats 1 and 3 are "strong" (emphasized)
            expect(isStrongBeatForEmphasis(0, beatsPerMeasure, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(1, beatsPerMeasure, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(2, beatsPerMeasure, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(3, beatsPerMeasure, 'backbeat')).toBe(true);

            // Neutral mode: no beats are strong
            for (let i = 0; i < 4; i++) {
                expect(isStrongBeatForEmphasis(i, beatsPerMeasure, 'neutral')).toBe(false);
            }
        });
    });

    // =========================================================================
    // Task 5.4: End-to-end test — non-4/4 time signatures
    // =========================================================================
    describe('Task 5.4: Non-4/4 time signatures end-to-end', () => {
        it('5.4.1: should fill empty measures in 9/8 time on beat 1 downbeat', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({
                numMeasures: 4,
                beatsPerMeasure: 9, // 9/8 time
            });

            // Create beats only in measures 0 and 2
            const beats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 9.0, // measure 2 starts at beatIndex 18
                    beatIndex: 18,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Every measure should have a beat on beat 1 (downbeat)
            const measures = getMeasureRange(unifiedBeatMap);
            for (const measure of measures) {
                const downbeatBeatIndex = measure * 9; // 9/8 time
                const downbeatBeat = result.beats.find(
                    b => b.beatIndex === downbeatBeatIndex && b.gridPosition === 0
                );
                expect(downbeatBeat).toBeDefined();
            }
        });

        it('5.4.2: should identify correct strong beats in 9/8 natural mode', () => {
            // 9/8 is compound meter: beats 0, 3, 6 are strong (groups of 3)
            const beatsPerMeasure = 9;

            expect(isStrongBeatForEmphasis(0, beatsPerMeasure, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(1, beatsPerMeasure, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(2, beatsPerMeasure, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(3, beatsPerMeasure, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(4, beatsPerMeasure, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(5, beatsPerMeasure, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(6, beatsPerMeasure, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(7, beatsPerMeasure, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(8, beatsPerMeasure, 'natural')).toBe(false);
        });

        it('5.4.3: should identify correct strong beats in 9/8 backbeat mode', () => {
            // 9/8 backbeat: beats 1, 2, 4, 5, 7, 8 are emphasized (weak beats)
            const beatsPerMeasure = 9;

            expect(isStrongBeatForEmphasis(0, beatsPerMeasure, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(1, beatsPerMeasure, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(2, beatsPerMeasure, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(3, beatsPerMeasure, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(4, beatsPerMeasure, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(5, beatsPerMeasure, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(6, beatsPerMeasure, 'backbeat')).toBe(false);
            expect(isStrongBeatForEmphasis(7, beatsPerMeasure, 'backbeat')).toBe(true);
            expect(isStrongBeatForEmphasis(8, beatsPerMeasure, 'backbeat')).toBe(true);
        });

        it('5.4.4: should handle mid-song time signature change (4/4 → 9/8)', () => {
            // Create a beat map with a time signature change
            const quarterNoteInterval = 0.5;
            const beats: Beat[] = [];

            // Measures 0-1: 4/4 time (8 beats total)
            for (let i = 0; i < 8; i++) {
                beats.push(
                    createMockBeat({
                        timestamp: i * quarterNoteInterval,
                        beatIndex: i,
                        beatInMeasure: i % 4,
                        isDownbeat: i % 4 === 0,
                        measureNumber: Math.floor(i / 4),
                    })
                );
            }

            // Measures 2-3: 9/8 time (18 beats total, starting at beatIndex 8)
            for (let i = 0; i < 18; i++) {
                beats.push(
                    createMockBeat({
                        timestamp: (8 + i) * quarterNoteInterval,
                        beatIndex: 8 + i,
                        beatInMeasure: i % 9,
                        isDownbeat: i % 9 === 0,
                        measureNumber: 2 + Math.floor(i / 9),
                    })
                );
            }

            const segments: DownbeatSegment[] = [
                {
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                },
                {
                    startBeat: 8, // Time signature changes at beat 8
                    downbeatBeatIndex: 8,
                    timeSignature: { beatsPerMeasure: 9 },
                },
            ];

            const unifiedBeatMap: UnifiedBeatMap = {
                audioId: 'test-time-sig-change',
                duration: beats.length * quarterNoteInterval,
                beats,
                detectedBeatIndices: beats.map((_, i) => i),
                quarterNoteInterval,
                quarterNoteBpm: 120,
                downbeatConfig: { segments },
            };

            // Create a composite with only downbeats in measure 0 and measure 2
            const compositeBeats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
                createMockCompositeBeat({
                    timestamp: 4.0, // measure 2 (9/8 section) downbeat
                    beatIndex: 8,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(compositeBeats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Verify that the correct segment is found for each beat
            const segment0 = findActiveSegment(segments, 0);
            expect(segment0.timeSignature.beatsPerMeasure).toBe(4);

            const segment8 = findActiveSegment(segments, 8);
            expect(segment8.timeSignature.beatsPerMeasure).toBe(9);

            // Verify that empty measures were filled
            const beatsPerMeasure = countBeatsPerMeasure(result.beats, unifiedBeatMap);
            expect(beatsPerMeasure.get(0)).toBeGreaterThanOrEqual(1); // 4/4 measure
            expect(beatsPerMeasure.get(1)).toBeGreaterThanOrEqual(1); // 4/4 measure
            expect(beatsPerMeasure.get(2)).toBeGreaterThanOrEqual(1); // 9/8 measure
            expect(beatsPerMeasure.get(3)).toBeGreaterThanOrEqual(1); // 9/8 measure
        });

        it('should handle 6/8 compound time correctly', () => {
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
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Every measure should have a beat
            const beatsPerMeasure = countBeatsPerMeasure(result.beats, unifiedBeatMap);
            expect(beatsPerMeasure.size).toBe(4);
            for (const count of beatsPerMeasure.values()) {
                expect(count).toBeGreaterThanOrEqual(1);
            }

            // 6/8 strong beats: 0, 3 (groups of 3)
            expect(isStrongBeatForEmphasis(0, 6, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(3, 6, 'natural')).toBe(true);
        });

        it('should handle 3/4 waltz time correctly', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({
                numMeasures: 4,
                beatsPerMeasure: 3,
            });

            const beats: CompositeBeat[] = [
                // Only measure 0 has a beat
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Every measure should have a beat on beat 1
            for (let measure = 0; measure < 4; measure++) {
                const downbeatBeatIndex = measure * 3;
                const downbeat = result.beats.find(
                    b => b.beatIndex === downbeatBeatIndex && b.gridPosition === 0
                );
                expect(downbeat).toBeDefined();
            }

            // 3/4 strong beat: only beat 0 (one group of 3)
            expect(isStrongBeatForEmphasis(0, 3, 'natural')).toBe(true);
            expect(isStrongBeatForEmphasis(1, 3, 'natural')).toBe(false);
            expect(isStrongBeatForEmphasis(2, 3, 'natural')).toBe(false);
        });
    });

    // =========================================================================
    // Additional Integration Scenarios
    // =========================================================================
    describe('Additional integration scenarios', () => {
        it('should handle a realistic sparse composite stream', () => {
            // Simulate a sparse composite that might come from quiet sections
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 16 });

            // Only a few beats scattered across the track
            const beats: CompositeBeat[] = [
                createMockCompositeBeat({ timestamp: 0, beatIndex: 0, gridPosition: 0 }),
                createMockCompositeBeat({ timestamp: 10.0, beatIndex: 20, gridPosition: 0 }),
                createMockCompositeBeat({ timestamp: 20.0, beatIndex: 40, gridPosition: 0 }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Every measure should have at least one beat
            const beatsPerMeasure = countBeatsPerMeasure(result.beats, unifiedBeatMap);
            expect(beatsPerMeasure.size).toBe(16);
            for (const [measure, count] of beatsPerMeasure) {
                expect(count).toBeGreaterThanOrEqual(1);
            }
        });

        it('should maintain beat properties through balancing', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const originalBeats: CompositeBeat[] = [
                createMockCompositeBeat({
                    timestamp: 0,
                    beatIndex: 0,
                    gridPosition: 0,
                    intensity: 0.95,
                    band: 'low',
                    sourceBand: 'low',
                    gridType: 'triplet_8th',
                }),
            ];

            const composite = createMockCompositeStream(originalBeats);
            const balancer = new RhythmicBalancer();
            const result = balancer.balance(composite, unifiedBeatMap);

            // Original beat should be unchanged
            const original = result.beats.find(b => b.beatIndex === 0);
            expect(original).toBeDefined();
            expect(original!.intensity).toBe(0.95);
            expect(original!.band).toBe('low');
            expect(original!.sourceBand).toBe('low');
            expect(original!.gridType).toBe('triplet_8th');
        });

        it('should produce deterministic results', () => {
            const unifiedBeatMap = createMockUnifiedBeatMap({ numMeasures: 4 });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat({ timestamp: 0, beatIndex: 0, gridPosition: 0 }),
                createMockCompositeBeat({ timestamp: 2.25, beatIndex: 4, gridPosition: 1 }),
            ];

            const composite = createMockCompositeStream(beats);
            const balancer = new RhythmicBalancer();

            // Run balance multiple times
            const result1 = balancer.balance(composite, unifiedBeatMap);
            const result2 = balancer.balance(composite, unifiedBeatMap);
            const result3 = balancer.balance(composite, unifiedBeatMap);

            // All results should be identical
            expect(result1.beats.length).toBe(result2.beats.length);
            expect(result2.beats.length).toBe(result3.beats.length);

            for (let i = 0; i < result1.beats.length; i++) {
                expect(result1.beats[i].beatIndex).toBe(result2.beats[i].beatIndex);
                expect(result1.beats[i].gridPosition).toBe(result2.beats[i].gridPosition);
                expect(result1.beats[i].timestamp).toBe(result2.beats[i].timestamp);
            }
        });
    });
});
