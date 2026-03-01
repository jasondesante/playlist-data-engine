/**
 * Tests for Downbeat Configuration
 *
 * Tests the manual downbeat configuration system including:
 * - validateDownbeatConfig() - structural validation
 * - validateDownbeatConfigAgainstBeats() - beat count validation
 * - reapplyDownbeatConfig() - reprocess measure labels
 */

import { describe, it, expect } from 'vitest';
import {
    reapplyDownbeatConfig,
    validateDownbeatConfig,
    validateDownbeatConfigAgainstBeats,
    DEFAULT_DOWNBEAT_CONFIG,
    DEFAULT_TIME_SIGNATURE,
    MIN_BEATS_PER_MEASURE,
    MAX_BEATS_PER_MEASURE,
    type BeatMap,
    type Beat,
    type DownbeatConfig,
    type DownbeatSegment,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
} from '../../../src/core/types/BeatMap.js';

// Helper to create a minimal beat for testing
function createBeat(timestamp: number, index: number): Beat {
    return {
        timestamp,
        beatInMeasure: index % 4,  // Default 4/4 assumption
        isDownbeat: index % 4 === 0,
        measureNumber: Math.floor(index / 4),
        intensity: 0.5,
        confidence: 0.9,
    };
}

// Helper to create a beat map with a specific number of beats
function createBeatMap(numBeats: number, trackId: string = 'test-track'): BeatMap {
    const beats: Beat[] = [];
    for (let i = 0; i < numBeats; i++) {
        beats.push(createBeat(i * 0.5, i));  // 120 BPM = 0.5s per beat
    }

    return {
        audioId: trackId,
        duration: numBeats * 0.5,
        beats,
        bpm: 120,
        metadata: {
            version: BEAT_DETECTION_VERSION,
            algorithm: BEAT_DETECTION_ALGORITHM,
            minBpm: 60,
            maxBpm: 180,
            sensitivity: 1.0,
            noiseFloorThreshold: 0.1,
            hopSizeMs: 4,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 0.4,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            generatedAt: new Date().toISOString(),
        },
    };
}

// Helper to create a beat map with existing downbeat config
function createBeatMapWithConfig(numBeats: number, config: DownbeatConfig): BeatMap {
    const beatMap = createBeatMap(numBeats);
    return {
        ...beatMap,
        downbeatConfig: config,
    };
}

describe('validateDownbeatConfig', () => {
    describe('valid configurations', () => {
        it('should accept default config', () => {
            expect(() => validateDownbeatConfig(DEFAULT_DOWNBEAT_CONFIG)).not.toThrow();
        });

        it('should accept single segment with beat 0 as downbeat', () => {
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            expect(() => validateDownbeatConfig(config)).not.toThrow();
        });

        it('should accept custom downbeat index', () => {
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            expect(() => validateDownbeatConfig(config)).not.toThrow();
        });

        it('should accept different time signatures', () => {
            const timeSignatures = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            for (const beatsPerMeasure of timeSignatures) {
                const config: DownbeatConfig = {
                    segments: [{
                        startBeat: 0,
                        downbeatBeatIndex: 0,
                        timeSignature: { beatsPerMeasure },
                    }],
                };
                expect(() => validateDownbeatConfig(config)).not.toThrow();
            }
        });

        it('should accept multiple segments for time signature changes', () => {
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
                ],
            };
            expect(() => validateDownbeatConfig(config)).not.toThrow();
        });

        it('should accept multiple segments with different start times', () => {
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 16, downbeatBeatIndex: 16, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 48, downbeatBeatIndex: 48, timeSignature: { beatsPerMeasure: 6 } },
                ],
            };
            expect(() => validateDownbeatConfig(config)).not.toThrow();
        });
    });

    describe('invalid configurations', () => {
        it('should reject empty segments array', () => {
            const config = { segments: [] } as DownbeatConfig;
            expect(() => validateDownbeatConfig(config)).toThrow('DownbeatConfig must have at least one segment');
        });

        it('should reject undefined segments', () => {
            const config = {} as DownbeatConfig;
            expect(() => validateDownbeatConfig(config)).toThrow('DownbeatConfig must have at least one segment');
        });

        it('should reject negative startBeat', () => {
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: -1,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            expect(() => validateDownbeatConfig(config)).toThrow('startBeat must be non-negative');
        });

        it('should reject negative downbeatBeatIndex', () => {
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: -1,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            expect(() => validateDownbeatConfig(config)).toThrow('downbeatBeatIndex must be non-negative');
        });

        it('should reject beatsPerMeasure below minimum', () => {
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 1 },
                }],
            };
            expect(() => validateDownbeatConfig(config)).toThrow(
                `beatsPerMeasure must be between ${MIN_BEATS_PER_MEASURE} and ${MAX_BEATS_PER_MEASURE}`
            );
        });

        it('should reject beatsPerMeasure above maximum', () => {
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 13 },
                }],
            };
            expect(() => validateDownbeatConfig(config)).toThrow(
                `beatsPerMeasure must be between ${MIN_BEATS_PER_MEASURE} and ${MAX_BEATS_PER_MEASURE}`
            );
        });

        it('should reject segments not ordered by startBeat', () => {
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                ],
            };
            expect(() => validateDownbeatConfig(config)).toThrow('Segments must be ordered by startBeat in ascending order');
        });

        it('should reject segments with equal startBeat', () => {
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 3 } },
                ],
            };
            expect(() => validateDownbeatConfig(config)).toThrow('Segments must be ordered by startBeat in ascending order');
        });
    });
});

describe('validateDownbeatConfigAgainstBeats', () => {
    it('should accept config when downbeatBeatIndex is within range', () => {
        const config: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 9,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        };
        expect(() => validateDownbeatConfigAgainstBeats(config, 100)).not.toThrow();
    });

    it('should accept config when downbeatBeatIndex equals last beat', () => {
        const config: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 99,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        };
        expect(() => validateDownbeatConfigAgainstBeats(config, 100)).not.toThrow();
    });

    it('should reject config when downbeatBeatIndex equals total beats', () => {
        const config: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 100,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        };
        expect(() => validateDownbeatConfigAgainstBeats(config, 100)).toThrow(
            'downbeatBeatIndex 100 exceeds total beats 100'
        );
    });

    it('should reject config when downbeatBeatIndex exceeds total beats', () => {
        const config: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 500,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        };
        expect(() => validateDownbeatConfigAgainstBeats(config, 100)).toThrow(
            'downbeatBeatIndex 500 exceeds total beats 100'
        );
    });

    it('should validate all segments in multi-segment config', () => {
        const config: DownbeatConfig = {
            segments: [
                { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                { startBeat: 32, downbeatBeatIndex: 500, timeSignature: { beatsPerMeasure: 3 } },  // Invalid
            ],
        };
        expect(() => validateDownbeatConfigAgainstBeats(config, 100)).toThrow(
            'downbeatBeatIndex 500 exceeds total beats 100'
        );
    });
});

describe('reapplyDownbeatConfig', () => {
    describe('default config (beat 0 = downbeat, 4/4 time)', () => {
        it('should label beat 0 as downbeat', () => {
            const beatMap = createBeatMap(16);
            const result = reapplyDownbeatConfig(beatMap, DEFAULT_DOWNBEAT_CONFIG);

            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[0].beatInMeasure).toBe(0);
            expect(result.beats[0].measureNumber).toBe(0);
        });

        it('should label beats 0, 4, 8, 12 as downbeats', () => {
            const beatMap = createBeatMap(16);
            const result = reapplyDownbeatConfig(beatMap, DEFAULT_DOWNBEAT_CONFIG);

            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[4].isDownbeat).toBe(true);
            expect(result.beats[8].isDownbeat).toBe(true);
            expect(result.beats[12].isDownbeat).toBe(true);
        });

        it('should label non-downbeats correctly', () => {
            const beatMap = createBeatMap(16);
            const result = reapplyDownbeatConfig(beatMap, DEFAULT_DOWNBEAT_CONFIG);

            // Beats 1, 2, 3 should not be downbeats
            expect(result.beats[1].isDownbeat).toBe(false);
            expect(result.beats[2].isDownbeat).toBe(false);
            expect(result.beats[3].isDownbeat).toBe(false);

            // beatInMeasure should be 1, 2, 3
            expect(result.beats[1].beatInMeasure).toBe(1);
            expect(result.beats[2].beatInMeasure).toBe(2);
            expect(result.beats[3].beatInMeasure).toBe(3);
        });

        it('should assign correct measure numbers', () => {
            const beatMap = createBeatMap(16);
            const result = reapplyDownbeatConfig(beatMap, DEFAULT_DOWNBEAT_CONFIG);

            // Beats 0-3: measure 0
            expect(result.beats[0].measureNumber).toBe(0);
            expect(result.beats[1].measureNumber).toBe(0);
            expect(result.beats[2].measureNumber).toBe(0);
            expect(result.beats[3].measureNumber).toBe(0);

            // Beats 4-7: measure 1
            expect(result.beats[4].measureNumber).toBe(1);
            expect(result.beats[5].measureNumber).toBe(1);
            expect(result.beats[6].measureNumber).toBe(1);
            expect(result.beats[7].measureNumber).toBe(1);

            // Beats 8-11: measure 2
            expect(result.beats[8].measureNumber).toBe(2);
        });
    });

    describe('custom downbeat index', () => {
        it('should label beat 9 as downbeat when downbeatBeatIndex=9', () => {
            const beatMap = createBeatMap(20);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            expect(result.beats[9].isDownbeat).toBe(true);
            expect(result.beats[9].beatInMeasure).toBe(0);
        });

        it('should calculate downbeats bidirectionally from anchor (forward)', () => {
            const beatMap = createBeatMap(20);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // From beat 9, forward: 9, 13, 17 are downbeats
            expect(result.beats[9].isDownbeat).toBe(true);
            expect(result.beats[13].isDownbeat).toBe(true);
            expect(result.beats[17].isDownbeat).toBe(true);
        });

        it('should calculate downbeats bidirectionally from anchor (backward)', () => {
            const beatMap = createBeatMap(20);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // From beat 9, backward: 1, 5 are downbeats
            expect(result.beats[1].isDownbeat).toBe(true);
            expect(result.beats[5].isDownbeat).toBe(true);
        });

        it('should label all beats in measure correctly with custom anchor', () => {
            const beatMap = createBeatMap(20);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beat 9 is downbeat (beatInMeasure=0)
            // Beat 10 should be beatInMeasure=1
            // Beat 11 should be beatInMeasure=2
            // Beat 12 should be beatInMeasure=3
            expect(result.beats[9].beatInMeasure).toBe(0);
            expect(result.beats[10].beatInMeasure).toBe(1);
            expect(result.beats[11].beatInMeasure).toBe(2);
            expect(result.beats[12].beatInMeasure).toBe(3);
        });
    });

    describe('pickup beats (beats before first downbeat)', () => {
        it('should correctly label pickup beats when downbeat is at beat 2', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 2,  // First downbeat is at beat 2
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beat 0: 2 beats before downbeat, so beatInMeasure=2 (pickup beat 3)
            expect(result.beats[0].beatInMeasure).toBe(2);
            expect(result.beats[0].isDownbeat).toBe(false);

            // Beat 1: 1 beat before downbeat, so beatInMeasure=3 (pickup beat 4)
            expect(result.beats[1].beatInMeasure).toBe(3);
            expect(result.beats[1].isDownbeat).toBe(false);

            // Beat 2: first downbeat
            expect(result.beats[2].beatInMeasure).toBe(0);
            expect(result.beats[2].isDownbeat).toBe(true);
        });

        it('should assign measure 0 to pickup beats', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 2,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Pickup beats should have measure 0 (floored)
            expect(result.beats[0].measureNumber).toBe(0);
            expect(result.beats[1].measureNumber).toBe(0);

            // First actual measure starts at beat 2
            expect(result.beats[2].measureNumber).toBe(0);
            expect(result.beats[3].measureNumber).toBe(0);
            expect(result.beats[4].measureNumber).toBe(0);
            expect(result.beats[5].measureNumber).toBe(0);
            // Beat 6 starts measure 1
            expect(result.beats[6].measureNumber).toBe(1);
        });

        it('should handle 3 pickup beats in 4/4 time', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 3,  // 3 pickup beats
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            expect(result.beats[0].beatInMeasure).toBe(1);
            expect(result.beats[1].beatInMeasure).toBe(2);
            expect(result.beats[2].beatInMeasure).toBe(3);
            expect(result.beats[3].beatInMeasure).toBe(0);
            expect(result.beats[3].isDownbeat).toBe(true);
        });
    });

    describe('different time signatures', () => {
        it('should correctly label 3/4 time (waltz)', () => {
            const beatMap = createBeatMap(12);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 3 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beats 0, 3, 6, 9 should be downbeats
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[3].isDownbeat).toBe(true);
            expect(result.beats[6].isDownbeat).toBe(true);
            expect(result.beats[9].isDownbeat).toBe(true);

            // Non-downbeats
            expect(result.beats[1].isDownbeat).toBe(false);
            expect(result.beats[2].isDownbeat).toBe(false);
            expect(result.beats[4].isDownbeat).toBe(false);

            // beatInMeasure
            expect(result.beats[0].beatInMeasure).toBe(0);
            expect(result.beats[1].beatInMeasure).toBe(1);
            expect(result.beats[2].beatInMeasure).toBe(2);
            expect(result.beats[3].beatInMeasure).toBe(0);
        });

        it('should correctly label 6/8 time', () => {
            const beatMap = createBeatMap(18);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 6 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beats 0, 6, 12 should be downbeats
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[6].isDownbeat).toBe(true);
            expect(result.beats[12].isDownbeat).toBe(true);

            // Measure numbers
            expect(result.beats[0].measureNumber).toBe(0);
            expect(result.beats[5].measureNumber).toBe(0);
            expect(result.beats[6].measureNumber).toBe(1);
            expect(result.beats[11].measureNumber).toBe(1);
            expect(result.beats[12].measureNumber).toBe(2);
        });

        it('should correctly label 5/4 time', () => {
            const beatMap = createBeatMap(15);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 5 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beats 0, 5, 10 should be downbeats
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[5].isDownbeat).toBe(true);
            expect(result.beats[10].isDownbeat).toBe(true);

            // beatInMeasure cycles 0-4
            expect(result.beats[0].beatInMeasure).toBe(0);
            expect(result.beats[1].beatInMeasure).toBe(1);
            expect(result.beats[2].beatInMeasure).toBe(2);
            expect(result.beats[3].beatInMeasure).toBe(3);
            expect(result.beats[4].beatInMeasure).toBe(4);
            expect(result.beats[5].beatInMeasure).toBe(0);
        });

        it('should correctly label 2/4 time', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 2 },
                }],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Every other beat is a downbeat
            for (let i = 0; i < 16; i++) {
                expect(result.beats[i].isDownbeat).toBe(i % 2 === 0);
                expect(result.beats[i].beatInMeasure).toBe(i % 2);
            }
        });
    });

    describe('time signature changes (multiple segments)', () => {
        it('should handle transition from 4/4 to 3/4', () => {
            const beatMap = createBeatMap(48);
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
                ],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beats 0-31: 4/4 time
            // Downbeats at 0, 4, 8, 12, 16, 20, 24, 28
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[4].isDownbeat).toBe(true);
            expect(result.beats[28].isDownbeat).toBe(true);
            expect(result.beats[31].isDownbeat).toBe(false);

            // Beats 32+: 3/4 time
            // Downbeats at 32, 35, 38, 41, 44, 47
            expect(result.beats[32].isDownbeat).toBe(true);
            expect(result.beats[33].isDownbeat).toBe(false);
            expect(result.beats[34].isDownbeat).toBe(false);
            expect(result.beats[35].isDownbeat).toBe(true);
            expect(result.beats[38].isDownbeat).toBe(true);
        });

        it('should continue measure numbering across segment boundary', () => {
            const beatMap = createBeatMap(48);
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
                ],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // In 4/4: beats 0-31 = 8 measures (0-7)
            expect(result.beats[28].measureNumber).toBe(7);
            expect(result.beats[31].measureNumber).toBe(7);

            // In 3/4 starting at beat 32: measure 8 starts at beat 32
            expect(result.beats[32].measureNumber).toBe(8);
            expect(result.beats[33].measureNumber).toBe(8);
            expect(result.beats[34].measureNumber).toBe(8);
            expect(result.beats[35].measureNumber).toBe(9);
        });

        it('should handle segment starting mid-measure', () => {
            const beatMap = createBeatMap(40);
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 10, downbeatBeatIndex: 10, timeSignature: { beatsPerMeasure: 3 } },
                ],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // Beat 10 starts new segment with 3/4
            // But beat 10 is mid-measure in original 4/4 (measure 2, beatInMeasure 2)
            // In new segment, beat 10 is the downbeat
            expect(result.beats[10].isDownbeat).toBe(true);
            expect(result.beats[10].beatInMeasure).toBe(0);
        });

        it('should handle three segments', () => {
            const beatMap = createBeatMap(64);
            const config: DownbeatConfig = {
                segments: [
                    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
                    { startBeat: 16, downbeatBeatIndex: 16, timeSignature: { beatsPerMeasure: 3 } },
                    { startBeat: 40, downbeatBeatIndex: 40, timeSignature: { beatsPerMeasure: 4 } },
                ],
            };
            const result = reapplyDownbeatConfig(beatMap, config);

            // First segment (4/4): beats 0-15
            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[4].isDownbeat).toBe(true);
            expect(result.beats[12].isDownbeat).toBe(true);

            // Second segment (3/4): beats 16-39
            expect(result.beats[16].isDownbeat).toBe(true);
            expect(result.beats[19].isDownbeat).toBe(true);
            expect(result.beats[22].isDownbeat).toBe(true);

            // Third segment (4/4): beats 40-63
            expect(result.beats[40].isDownbeat).toBe(true);
            expect(result.beats[44].isDownbeat).toBe(true);
        });
    });

    describe('immutability', () => {
        it('should not modify original beat map', () => {
            const beatMap = createBeatMap(16);
            const originalBeats = beatMap.beats.map(b => ({ ...b }));

            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            reapplyDownbeatConfig(beatMap, config);

            // Original should be unchanged
            for (let i = 0; i < 16; i++) {
                expect(beatMap.beats[i].beatInMeasure).toBe(originalBeats[i].beatInMeasure);
                expect(beatMap.beats[i].isDownbeat).toBe(originalBeats[i].isDownbeat);
                expect(beatMap.beats[i].measureNumber).toBe(originalBeats[i].measureNumber);
            }
        });

        it('should return a new beat map object', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const result = reapplyDownbeatConfig(beatMap, config);

            expect(result).not.toBe(beatMap);
            expect(result.beats).not.toBe(beatMap.beats);
        });
    });

    describe('config storage', () => {
        it('should store the new config in the result', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const result = reapplyDownbeatConfig(beatMap, config);

            expect(result.downbeatConfig).toEqual(config);
        });

        it('should replace existing config', () => {
            const oldConfig: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 5,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const beatMap = createBeatMapWithConfig(16, oldConfig);

            const newConfig: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const result = reapplyDownbeatConfig(beatMap, newConfig);

            expect(result.downbeatConfig).toEqual(newConfig);
            expect(result.downbeatConfig?.segments[0].downbeatBeatIndex).toBe(9);
        });
    });

    describe('error handling', () => {
        it('should throw for invalid config', () => {
            const beatMap = createBeatMap(16);
            const invalidConfig = { segments: [] } as DownbeatConfig;

            expect(() => reapplyDownbeatConfig(beatMap, invalidConfig)).toThrow(
                'DownbeatConfig must have at least one segment'
            );
        });

        it('should throw when downbeatBeatIndex exceeds total beats', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 100,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            expect(() => reapplyDownbeatConfig(beatMap, config)).toThrow(
                'downbeatBeatIndex 100 exceeds total beats 16'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle beat map with single beat', () => {
            const beatMap = createBeatMap(1);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 0,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const result = reapplyDownbeatConfig(beatMap, config);

            expect(result.beats[0].isDownbeat).toBe(true);
            expect(result.beats[0].beatInMeasure).toBe(0);
            expect(result.beats[0].measureNumber).toBe(0);
        });

        it('should handle downbeat at last beat', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 15,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const result = reapplyDownbeatConfig(beatMap, config);

            expect(result.beats[15].isDownbeat).toBe(true);
            expect(result.beats[15].beatInMeasure).toBe(0);

            // Backward: 3, 7, 11 are downbeats
            expect(result.beats[3].isDownbeat).toBe(true);
            expect(result.beats[7].isDownbeat).toBe(true);
            expect(result.beats[11].isDownbeat).toBe(true);
        });

        it('should preserve other beat properties', () => {
            const beatMap = createBeatMap(16);
            const config: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 9,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };

            const result = reapplyDownbeatConfig(beatMap, config);

            // Check that other properties are preserved
            for (let i = 0; i < 16; i++) {
                expect(result.beats[i].timestamp).toBe(beatMap.beats[i].timestamp);
                expect(result.beats[i].intensity).toBe(beatMap.beats[i].intensity);
                expect(result.beats[i].confidence).toBe(beatMap.beats[i].confidence);
            }
        });
    });
});

describe('DEFAULT_TIME_SIGNATURE', () => {
    it('should be 4/4 time', () => {
        expect(DEFAULT_TIME_SIGNATURE.beatsPerMeasure).toBe(4);
    });
});

describe('DEFAULT_DOWNBEAT_CONFIG', () => {
    it('should have a single segment', () => {
        expect(DEFAULT_DOWNBEAT_CONFIG.segments.length).toBe(1);
    });

    it('should start at beat 0', () => {
        expect(DEFAULT_DOWNBEAT_CONFIG.segments[0].startBeat).toBe(0);
    });

    it('should have downbeat at beat 0', () => {
        expect(DEFAULT_DOWNBEAT_CONFIG.segments[0].downbeatBeatIndex).toBe(0);
    });

    it('should use default time signature', () => {
        expect(DEFAULT_DOWNBEAT_CONFIG.segments[0].timeSignature).toEqual(DEFAULT_TIME_SIGNATURE);
    });
});
