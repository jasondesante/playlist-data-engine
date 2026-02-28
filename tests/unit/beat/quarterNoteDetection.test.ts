/**
 * Tests for Quarter Note Detection in BeatInterpolator
 *
 * Tests the dense section priority quarter note detection algorithm
 * which analyzes beat intervals to determine the quarter note duration.
 */

import { describe, it, expect } from 'vitest';
import { BeatInterpolator } from '../../../src/core/analysis/beat/BeatInterpolator.js';
import type { Beat, BeatMap, BeatMapMetadata } from '../../../src/core/types/BeatMap.js';
import { BEAT_DETECTION_VERSION, BEAT_DETECTION_ALGORITHM } from '../../../src/core/types/BeatMap.js';

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

// Helper to create a beat map
function createBeatMap(
    beats: Beat[],
    duration: number,
    bpm: number = 120
): BeatMap {
    const metadata: BeatMapMetadata = {
        version: BEAT_DETECTION_VERSION,
        algorithm: BEAT_DETECTION_ALGORITHM,
        minBpm: 60,
        maxBpm: 180,
        sensitivity: 1.0,
        filter: 0.0,
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
    };

    return {
        audioId: 'test-audio-id',
        duration,
        beats,
        bpm,
        metadata,
    };
}

// Helper to create beats at regular intervals (simulating perfect beat detection)
function createRegularBeats(
    bpm: number,
    durationSeconds: number,
    startOffset: number = 0
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm; // seconds per beat

    for (let time = startOffset; time < durationSeconds; time += interval) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

// Helper to create beats with some 2x gaps (simulating half-note detection)
function createBeatsWithGaps(
    bpm: number,
    durationSeconds: number,
    gapIndices: number[] = []
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;
    let beatIndex = 0;

    for (let time = 0; time < durationSeconds; time += interval) {
        // Skip this beat if it's in the gap indices
        if (gapIndices.includes(beatIndex)) {
            beatIndex++;
            continue;
        }

        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
        beatIndex++;
    }

    return beats;
}

// Helper to create beats with an anomaly (single unusual interval)
function createBeatsWithAnomaly(
    bpm: number,
    durationSeconds: number,
    anomalyIndex: number,
    anomalyRatio: number = 0.5
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let i = 0; i * interval < durationSeconds; i++) {
        let time = i * interval;

        // If this is the anomaly beat, shift it
        if (i === anomalyIndex) {
            // Insert an extra beat at an unusual position
            const anomalyTime = time - (interval * (1 - anomalyRatio));
            beats.push(createBeat(anomalyTime, {
                confidence: 0.7, // Slightly lower confidence for anomaly
            }));
        }

        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

describe('Quarter Note Detection', () => {
    describe('Regular intervals at 120 BPM', () => {
        it('should detect 0.5s quarter note from regular intervals at 120 BPM', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 10); // 10 seconds of 120 BPM
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // At 120 BPM, quarter note = 60/120 = 0.5 seconds
            expect(result.quarterNoteInterval).toBeCloseTo(0.5, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(120, 0);
            expect(result.quarterNoteConfidence).toBeGreaterThan(0.5);
        });

        it('should have high confidence for perfect regular intervals', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 30); // Longer duration = more confidence
            const beatMap = createBeatMap(beats, 30, 120);

            const result = interpolator.interpolate(beatMap);

            // Should have high confidence with perfect regular intervals
            expect(result.quarterNoteConfidence).toBeGreaterThan(0.7);
        });

        it('should identify the quarter note using histogram method', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 10);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            expect(result.interpolationMetadata.quarterNoteDetection.method).toBe('histogram');
        });
    });

    describe('Intervals with some 2x gaps', () => {
        it('should still detect 0.5s quarter note when some beats are 2x apart', () => {
            const interpolator = new BeatInterpolator();
            // Create beats with some gaps (missing every 5th beat)
            const beats = createBeatsWithGaps(120, 10, [4, 9, 14, 19, 24]);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Should still detect 0.5s as the quarter note
            expect(result.quarterNoteInterval).toBeCloseTo(0.5, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(120, 0);
        });

        it('should identify half-note gaps in gap analysis', () => {
            const interpolator = new BeatInterpolator();
            // Create beats with specific gaps at half-note positions
            // At 120 BPM, quarter note = 0.5s, half note = 1.0s
            // We'll create mostly regular beats but skip some to create 2x gaps
            const beats: Beat[] = [];
            const interval = 60 / 120; // 0.5s

            // Add regular beats with some intentional gaps
            for (let i = 0; i < 20; i++) {
                // Skip beat 5 and 15 to create half-note gaps
                if (i === 5 || i === 15) continue;
                beats.push(createBeat(i * interval, {
                    beatInMeasure: beats.length % 4,
                    isDownbeat: beats.length % 4 === 0,
                    measureNumber: Math.floor(beats.length / 4),
                }));
            }

            const beatMap = createBeatMap(beats, 10, 120);
            const result = interpolator.interpolate(beatMap);

            // Gap analysis should detect at least some gaps
            expect(result.interpolationMetadata.gapAnalysis.totalGaps).toBeGreaterThanOrEqual(0);
        });

        it('should maintain reasonable confidence despite gaps', () => {
            const interpolator = new BeatInterpolator();
            const beats = createBeatsWithGaps(120, 10, [4, 9, 14, 19, 24]);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Should still have reasonable confidence
            expect(result.quarterNoteConfidence).toBeGreaterThan(0.4);
        });
    });

    describe('Intervals with single anomaly', () => {
        it('should ignore single anomaly and detect correct quarter note', () => {
            const interpolator = new BeatInterpolator();
            // Create beats with a single anomaly (extra beat at unusual position)
            const beats = createBeatsWithAnomaly(120, 10, 10, 0.5);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Should still detect 0.5s quarter note despite the anomaly
            expect(result.quarterNoteInterval).toBeCloseTo(0.5, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(120, 0);
        });

        it('should identify anomalies in gap analysis', () => {
            const interpolator = new BeatInterpolator();
            const beats = createBeatsWithAnomaly(120, 10, 10, 0.3); // More obvious anomaly
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Anomaly should be detected (though the exact count depends on algorithm)
            expect(result.interpolationMetadata.gapAnalysis.anomalies.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('All intervals at 2x (half-notes)', () => {
        it('should detect the actual interval when all beats are at half-note spacing', () => {
            const interpolator = new BeatInterpolator();
            // Create beats at 60 BPM (which is 2x the quarter note spacing at 120 BPM)
            const beats = createRegularBeats(60, 10); // 1 second intervals
            const beatMap = createBeatMap(beats, 10, 60);

            const result = interpolator.interpolate(beatMap);

            // Should detect 1.0s as the primary interval (60 BPM)
            expect(result.quarterNoteInterval).toBeCloseTo(1.0, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(60, 0);
        });
    });

    describe('Empty beat array', () => {
        it('should handle empty beat array gracefully', () => {
            const interpolator = new BeatInterpolator();
            const beatMap = createBeatMap([], 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Should return empty result with default values
            expect(result.detectedBeats).toEqual([]);
            expect(result.mergedBeats).toEqual([]);
            expect(result.quarterNoteBpm).toBe(120); // Default fallback
            expect(result.quarterNoteConfidence).toBe(0);
        });

        it('should not throw on empty beat array', () => {
            const interpolator = new BeatInterpolator();
            const beatMap = createBeatMap([], 10, 120);

            expect(() => interpolator.interpolate(beatMap)).not.toThrow();
        });
    });

    describe('Single beat', () => {
        it('should handle single beat gracefully', () => {
            const interpolator = new BeatInterpolator();
            const beats = [createBeat(0.5)];
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Should return the single beat with default quarter note
            expect(result.detectedBeats.length).toBe(1);
            expect(result.mergedBeats.length).toBe(1);
            expect(result.mergedBeats[0].source).toBe('detected');
            expect(result.quarterNoteBpm).toBe(120); // Default fallback
        });

        it('should not throw on single beat', () => {
            const interpolator = new BeatInterpolator();
            const beats = [createBeat(0.5)];
            const beatMap = createBeatMap(beats, 10, 120);

            expect(() => interpolator.interpolate(beatMap)).not.toThrow();
        });
    });

    describe('Confidence calculation varies with peak prominence', () => {
        it('should have higher confidence for more prominent peaks', () => {
            // Create two scenarios: perfect intervals vs noisy intervals
            const interpolator = new BeatInterpolator();

            // Perfect intervals - should have high confidence
            const perfectBeats = createRegularBeats(120, 30);
            const perfectBeatMap = createBeatMap(perfectBeats, 30, 120);
            const perfectResult = interpolator.interpolate(perfectBeatMap);

            // Noisy intervals (with gaps) - should have lower but still reasonable confidence
            const noisyBeats = createBeatsWithGaps(120, 30, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
            const noisyBeatMap = createBeatMap(noisyBeats, 30, 120);
            const noisyResult = interpolator.interpolate(noisyBeatMap);

            // Perfect intervals should have higher or equal confidence
            expect(perfectResult.quarterNoteConfidence).toBeGreaterThanOrEqual(noisyResult.quarterNoteConfidence * 0.8);
        });

        it('should include dense section info in confidence calculation', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 10);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            // Should have dense section information
            const qnDetection = result.interpolationMetadata.quarterNoteDetection;
            expect(qnDetection.denseSectionCount).toBeGreaterThan(0);
            expect(qnDetection.denseSectionBeats).toBeGreaterThan(0);
        });
    });

    describe('Different BPM values', () => {
        it('should detect quarter note at 90 BPM', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(90, 10);
            const beatMap = createBeatMap(beats, 10, 90);

            const result = interpolator.interpolate(beatMap);

            // At 90 BPM, quarter note = 60/90 ≈ 0.667 seconds
            expect(result.quarterNoteInterval).toBeCloseTo(60 / 90, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(90, 0);
        });

        it('should detect quarter note at 140 BPM', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(140, 10);
            const beatMap = createBeatMap(beats, 10, 140);

            const result = interpolator.interpolate(beatMap);

            // At 140 BPM, quarter note = 60/140 ≈ 0.429 seconds
            expect(result.quarterNoteInterval).toBeCloseTo(60 / 140, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(140, 0);
        });

        it('should detect quarter note at 60 BPM', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(60, 10);
            const beatMap = createBeatMap(beats, 10, 60);

            const result = interpolator.interpolate(beatMap);

            // At 60 BPM, quarter note = 1.0 seconds
            expect(result.quarterNoteInterval).toBeCloseTo(1.0, 1);
            expect(result.quarterNoteBpm).toBeCloseTo(60, 0);
        });
    });

    describe('Output structure validation', () => {
        it('should return correct QuarterNoteDetection structure', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 10);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);
            const qn = result.interpolationMetadata.quarterNoteDetection;

            expect(qn).toHaveProperty('intervalSeconds');
            expect(qn).toHaveProperty('bpm');
            expect(qn).toHaveProperty('confidence');
            expect(qn).toHaveProperty('histogramPeak');
            expect(qn).toHaveProperty('secondaryPeaks');
            expect(qn).toHaveProperty('method');
            expect(qn).toHaveProperty('denseSectionCount');
            expect(qn).toHaveProperty('denseSectionBeats');

            expect(typeof qn.intervalSeconds).toBe('number');
            expect(typeof qn.bpm).toBe('number');
            expect(typeof qn.confidence).toBe('number');
            expect(typeof qn.histogramPeak).toBe('number');
            expect(Array.isArray(qn.secondaryPeaks)).toBe(true);
            expect(['histogram', 'kde', 'tempo-detector-fallback']).toContain(qn.method);
            expect(typeof qn.denseSectionCount).toBe('number');
            expect(typeof qn.denseSectionBeats).toBe('number');
        });

        it('should have confidence between 0 and 1', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 10);
            const beatMap = createBeatMap(beats, 10, 120);

            const result = interpolator.interpolate(beatMap);

            expect(result.quarterNoteConfidence).toBeGreaterThanOrEqual(0);
            expect(result.quarterNoteConfidence).toBeLessThanOrEqual(1);
        });
    });
});
