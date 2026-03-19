/**
 * Tests for Beat Map Unification
 *
 * Tests the unifyBeatMap utility that converts an InterpolatedBeatMap
 * into a UnifiedBeatMap for use in the subdivision system.
 */

import { describe, it, expect } from 'vitest';
import { unifyBeatMap } from '../../../src/core/analysis/beat/utils/unifyBeatMap.js';
import type {
    Beat,
    InterpolatedBeatMap,
    BeatWithSource,
    BeatMapMetadata,
    InterpolationMetadata,
    DownbeatConfig,
    TempoSection,
} from '../../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    DEFAULT_DOWNBEAT_CONFIG,
} from '../../../src/core/types/BeatMap.js';

// Helper to create a beat with default values
function createBeat(
    timestamp: number,
    options: Partial<Beat> = {}
): Beat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.8,
        confidence: 0.9,
        ...options,
    };
}

// Helper to create a BeatWithSource
function createBeatWithSource(
    timestamp: number,
    source: 'detected' | 'interpolated',
    options: Partial<Beat> = {}
): BeatWithSource {
    return {
        ...createBeat(timestamp, options),
        source,
        distanceToAnchor: source === 'interpolated' ? 0.25 : 0,
        nearestAnchorTimestamp: timestamp,
    };
}

// Helper to create basic metadata
function createMetadata(): BeatMapMetadata {
    return {
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
        generatedAt: new Date().toISOString(),
    };
}

// Helper to create basic interpolation metadata
function createInterpolationMetadata(overrides: Partial<InterpolationMetadata> = {}): InterpolationMetadata {
    return {
        quarterNoteDetection: {
            intervalSeconds: 0.5,
            bpm: 120,
            confidence: 0.9,
            histogramPeak: 0.8,
            secondaryPeaks: [],
            method: 'histogram',
            denseSectionCount: 1,
            denseSectionBeats: 10,
        },
        gapAnalysis: {
            totalGaps: 0,
            halfNoteGaps: 0,
            anomalies: [],
            avgGapSize: 1,
            gridAlignmentScore: 0.9,
        },
        detectedBeatCount: 10,
        interpolatedBeatCount: 5,
        totalBeatCount: 15,
        interpolationRatio: 0.33,
        avgInterpolatedConfidence: 0.7,
        tempoDriftRatio: 1.0,
        hasMultipleTempos: false,
        ...overrides,
    };
}

// Helper to create an InterpolatedBeatMap
function createInterpolatedBeatMap(
    mergedBeats: BeatWithSource[],
    options: {
        duration?: number;
        quarterNoteInterval?: number;
        quarterNoteBpm?: number;
        downbeatConfig?: DownbeatConfig;
        tempoSections?: TempoSection[];
    } = {}
): InterpolatedBeatMap {
    const detectedBeats = mergedBeats
        .filter(b => b.source === 'detected')
        .map(b => createBeat(b.timestamp, {
            beatInMeasure: b.beatInMeasure,
            isDownbeat: b.isDownbeat,
            measureNumber: b.measureNumber,
            intensity: b.intensity,
            confidence: b.confidence,
        }));

    return {
        audioId: 'test-audio-id',
        duration: options.duration ?? 30,
        detectedBeats,
        mergedBeats,
        quarterNoteInterval: options.quarterNoteInterval ?? 0.5,
        quarterNoteBpm: options.quarterNoteBpm ?? 120,
        quarterNoteConfidence: 0.9,
        originalMetadata: createMetadata(),
        interpolationMetadata: createInterpolationMetadata({
            tempoSections: options.tempoSections,
        }),
        downbeatConfig: options.downbeatConfig,
    };
}

describe('unifyBeatMap', () => {
    describe('basic functionality', () => {
        it('should flatten merged beats into a single Beat array', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected', { beatInMeasure: 0, isDownbeat: true }),
                createBeatWithSource(0.5, 'interpolated', { beatInMeasure: 1 }),
                createBeatWithSource(1.0, 'detected', { beatInMeasure: 2 }),
                createBeatWithSource(1.5, 'interpolated', { beatInMeasure: 3 }),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(4);
            expect(unifiedMap.beats[0].timestamp).toBe(0.0);
            expect(unifiedMap.beats[1].timestamp).toBe(0.5);
            expect(unifiedMap.beats[2].timestamp).toBe(1.0);
            expect(unifiedMap.beats[3].timestamp).toBe(1.5);
        });

        it('should remove source field from beats', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
                createBeatWithSource(0.5, 'interpolated'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            // Plain Beat objects should not have source field
            expect(unifiedMap.beats[0]).not.toHaveProperty('source');
            expect(unifiedMap.beats[1]).not.toHaveProperty('source');
        });

        it('should preserve beat properties', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected', {
                    beatInMeasure: 0,
                    isDownbeat: true,
                    measureNumber: 0,
                    intensity: 0.9,
                    confidence: 0.95,
                }),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.beats[0].beatInMeasure).toBe(0);
            expect(unifiedMap.beats[0].isDownbeat).toBe(true);
            expect(unifiedMap.beats[0].measureNumber).toBe(0);
            expect(unifiedMap.beats[0].intensity).toBe(0.9);
            expect(unifiedMap.beats[0].confidence).toBe(0.95);
        });
    });

    describe('detected beat indices', () => {
        it('should track indices of detected beats', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),   // index 0
                createBeatWithSource(0.5, 'interpolated'),
                createBeatWithSource(1.0, 'detected'),   // index 2
                createBeatWithSource(1.5, 'interpolated'),
                createBeatWithSource(2.0, 'detected'),   // index 4
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.detectedBeatIndices).toEqual([0, 2, 4]);
        });

        it('should return empty array when all beats are interpolated', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'interpolated'),
                createBeatWithSource(0.5, 'interpolated'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.detectedBeatIndices).toEqual([]);
        });

        it('should return all indices when all beats are detected', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
                createBeatWithSource(0.5, 'detected'),
                createBeatWithSource(1.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.detectedBeatIndices).toEqual([0, 1, 2]);
        });
    });

    describe('metadata preservation', () => {
        it('should preserve audioId and duration', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats, {
                duration: 45.5,
            });
            interpolatedMap.audioId = 'custom-audio-id';

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.audioId).toBe('custom-audio-id');
            expect(unifiedMap.duration).toBe(45.5);
        });

        it('should preserve quarter note information', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats, {
                quarterNoteInterval: 0.4,
                quarterNoteBpm: 150,
            });

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.quarterNoteInterval).toBe(0.4);
            expect(unifiedMap.quarterNoteBpm).toBe(150);
        });

        it('should preserve original metadata', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.originalMetadata).toEqual(interpolatedMap.originalMetadata);
        });
    });

    describe('downbeatConfig handling', () => {
        it('should use downbeatConfig from InterpolatedBeatMap when present', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const customDownbeatConfig: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 4,
                    timeSignature: { beatsPerMeasure: 3 },
                }],
            };

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats, {
                downbeatConfig: customDownbeatConfig,
            });

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.downbeatConfig).toEqual(customDownbeatConfig);
        });

        it('should use DEFAULT_DOWNBEAT_CONFIG when downbeatConfig is undefined', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            // Explicitly set to undefined
            interpolatedMap.downbeatConfig = undefined;

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.downbeatConfig).toEqual(DEFAULT_DOWNBEAT_CONFIG);
        });
    });

    describe('tempoSections handling', () => {
        it('should extract tempoSections from interpolationMetadata', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
                createBeatWithSource(0.5, 'detected'),
            ];

            const tempoSections: TempoSection[] = [
                {
                    start: 0,
                    end: 15,
                    bpm: 120,
                    intervalSeconds: 0.5,
                    beatCount: 30,
                    startBeatIndex: 0,
                    endBeatIndex: 29,
                },
                {
                    start: 15,
                    end: 30,
                    bpm: 140,
                    intervalSeconds: 0.428,
                    beatCount: 35,
                    startBeatIndex: 30,
                    endBeatIndex: 64,
                },
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats, {
                tempoSections,
            });

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.tempoSections).toEqual(tempoSections);
        });

        it('should have undefined tempoSections when not present in metadata', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            // Don't set tempoSections

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.tempoSections).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('should handle empty merged beats array', () => {
            const interpolatedMap = createInterpolatedBeatMap([]);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(0);
            expect(unifiedMap.detectedBeatIndices).toHaveLength(0);
        });

        it('should handle single detected beat', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'detected'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(1);
            expect(unifiedMap.detectedBeatIndices).toEqual([0]);
        });

        it('should handle single interpolated beat', () => {
            const mergedBeats: BeatWithSource[] = [
                createBeatWithSource(0.0, 'interpolated'),
            ];

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats);
            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(1);
            expect(unifiedMap.detectedBeatIndices).toEqual([]);
        });

        it('should handle large number of beats', () => {
            const mergedBeats: BeatWithSource[] = [];
            for (let i = 0; i < 1000; i++) {
                mergedBeats.push(
                    createBeatWithSource(i * 0.5, i % 3 === 0 ? 'detected' : 'interpolated')
                );
            }

            const interpolatedMap = createInterpolatedBeatMap(mergedBeats, {
                duration: 500,
            });

            const unifiedMap = unifyBeatMap(interpolatedMap);

            expect(unifiedMap.beats).toHaveLength(1000);
            // Every 3rd beat is detected (indices 0, 3, 6, 9, ...)
            expect(unifiedMap.detectedBeatIndices).toHaveLength(Math.ceil(1000 / 3));
        });
    });
});
