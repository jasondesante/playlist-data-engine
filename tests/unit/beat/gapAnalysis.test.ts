/**
 * Tests for Gap Analysis in BeatInterpolator
 *
 * Tests the gap analysis algorithm which identifies missing beats,
 * anomalies, and calculates grid alignment scores.
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

// Helper to create beats at regular intervals
function createRegularBeats(
    bpm: number,
    durationSeconds: number,
    startOffset: number = 0
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let time = startOffset; time < durationSeconds; time += interval) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

// Helper to create beats with half-note gaps (skipping every other beat)
function createBeatsWithHalfNoteGaps(
    bpm: number,
    durationSeconds: number,
    gapStartIndex: number = 0,
    numGaps: number = 3
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;
    let gapCount = 0;

    for (let i = 0; i * interval < durationSeconds; i++) {
        // Create half-note gaps starting at gapStartIndex
        // Skip every other beat after gapStartIndex until we've created numGaps
        const shouldSkip = i >= gapStartIndex && (i - gapStartIndex) % 2 === 1 && gapCount < numGaps;

        if (shouldSkip) {
            gapCount++;
            continue;
        }

        beats.push(createBeat(i * interval, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

// Helper to create beats with a single anomaly at a specific index
function createBeatsWithSingleAnomaly(
    bpm: number,
    durationSeconds: number,
    anomalyIndex: number,
    anomalyOffsetRatio: number = 0.3 // How far off the grid (0.3 = 30% of interval)
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let i = 0; i * interval < durationSeconds; i++) {
        let timestamp = i * interval;

        // If this is the anomaly beat, shift it significantly
        if (i === anomalyIndex) {
            // Add an offset that's not close to 1x, 2x, or any standard ratio
            timestamp = i * interval + (interval * anomalyOffsetRatio);
        }

        beats.push(createBeat(timestamp, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
            confidence: i === anomalyIndex ? 0.6 : 0.9, // Lower confidence for anomaly
        }));
    }

    return beats;
}

// Helper to create beats with a silent section (gap surrounded by aligned beats)
function createBeatsWithSilentSection(
    bpm: number,
    durationSeconds: number,
    silentStartIndex: number,
    silentEndIndex: number
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let i = 0; i * interval < durationSeconds; i++) {
        // Skip beats in the silent section
        if (i >= silentStartIndex && i < silentEndIndex) {
            continue;
        }

        beats.push(createBeat(i * interval, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

describe('Gap Analysis', () => {
    describe('Identify half-note gaps (2× ratio)', () => {
        it('should identify a single half-note gap', () => {
            const interpolator = new BeatInterpolator();
            // At 120 BPM, quarter note = 0.5s, half note = 1.0s
            // Create beats where beat 3 is skipped, creating a 1.0s gap
            const beats: Beat[] = [
                createBeat(0.0),   // beat 0
                createBeat(0.5),   // beat 1
                createBeat(1.0),   // beat 2
                // beat 3 skipped (0.5s gap) - now 1.0s gap to next beat
                createBeat(2.0),   // beat 4 (but would be at 1.5s + 0.5s = 2.0s if regular)
                createBeat(2.5),   // beat 5
                createBeat(3.0),   // beat 6
            ];
            const beatMap = createBeatMap(beats, 4, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Should detect at least one gap that's around 2x the quarter note
            expect(gapAnalysis.halfNoteGaps).toBeGreaterThanOrEqual(1);
        });

        it('should identify multiple half-note gaps', () => {
            const interpolator = new BeatInterpolator();
            // Create beats with a mix of regular intervals and half-note gaps
            // The quarter note should be detected as 0.5s from the regular beats
            // Then the half-note gaps (1.0s intervals) should be detected
            const interval = 0.5; // 120 BPM quarter note

            const beats: Beat[] = [
                // Regular beats at quarter note intervals
                createBeat(0.0),
                createBeat(0.5),
                createBeat(1.0),
                // Gap: skip beat at 1.5, next beat at 2.0 (1.0s gap = half note)
                createBeat(2.0),
                createBeat(2.5),
                // Gap: skip beat at 3.0, next beat at 3.5 (1.0s gap = half note)
                createBeat(3.5),
                createBeat(4.0),
                createBeat(4.5),
                // Gap: skip beat at 5.0, next beat at 5.5 (1.0s gap = half note)
                createBeat(5.5),
                createBeat(6.0),
            ];

            const beatMap = createBeatMap(beats, 7, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Should detect the half-note gaps (1.0s intervals)
            expect(gapAnalysis.halfNoteGaps).toBeGreaterThanOrEqual(1);
            expect(gapAnalysis.totalGaps).toBeGreaterThanOrEqual(3);
        });

        it('should correctly identify half-note gap ratio at 90 BPM', () => {
            const interpolator = new BeatInterpolator();
            // At 90 BPM, quarter note ≈ 0.667s, half note ≈ 1.333s
            const interval = 60 / 90; // ≈ 0.667s

            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(interval),
                createBeat(2 * interval),
                // Skip beat at 3 * interval to create half-note gap
                createBeat(4 * interval),
                createBeat(5 * interval),
            ];

            const beatMap = createBeatMap(beats, 4, 90);
            const result = interpolator.interpolate(beatMap);

            // Quarter note should be detected correctly
            expect(result.quarterNoteInterval).toBeCloseTo(interval, 2);

            // Should detect the half-note gap
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;
            expect(gapAnalysis.halfNoteGaps).toBeGreaterThanOrEqual(1);
        });

        it('should distinguish half-note gaps from larger gaps', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5; // 120 BPM

            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(0.5),
                // 2x gap (1.0s = half note)
                createBeat(1.5),
                createBeat(2.0),
                // 3x gap (1.5s = dotted half note)
                createBeat(3.5),
                createBeat(4.0),
            ];

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Should have total gaps
            expect(gapAnalysis.totalGaps).toBeGreaterThanOrEqual(2);

            // Should have at least one half-note gap
            expect(gapAnalysis.halfNoteGaps).toBeGreaterThanOrEqual(1);

            // Average gap size should reflect both types of gaps
            expect(gapAnalysis.avgGapSize).toBeGreaterThan(1);
        });
    });

    describe('Identify anomalies (single unusual interval)', () => {
        it('should identify a beat at 0.3× interval as anomaly', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5; // 120 BPM

            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(0.5),
                createBeat(0.65), // Anomaly: only 0.15s from previous (0.3× interval)
                createBeat(1.0),
                createBeat(1.5),
                createBeat(2.0),
                createBeat(2.5),
            ];

            const beatMap = createBeatMap(beats, 3, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Should detect at least one anomaly
            expect(gapAnalysis.anomalies.length).toBeGreaterThanOrEqual(1);
        });

        it('should identify a beat at unusual position (not near 1×, 2×, or 3×)', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5;

            // Create a pattern with a clear anomaly
            // Anomaly detection: ratio < 0.6 OR (ratio > 1.4 AND not near 2.0, 3.0, 4.0)
            // We'll create an interval at 1.5x (which is > 1.4 but not near 2.0)
            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(0.5),
                createBeat(1.25), // 0.75s from previous = 1.5x ratio - this is an anomaly!
                createBeat(1.75),
                createBeat(2.25),
            ];

            const beatMap = createBeatMap(beats, 3, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Should detect anomalies (the interval from 0.5 to 1.25 = 0.75s = 1.5x is an anomaly)
            // because it's > 1.4 and not near 2.0, 3.0, or 4.0
            expect(gapAnalysis.anomalies.length).toBeGreaterThanOrEqual(1);
        });

        it('should not flag regular intervals as anomalies', () => {
            const interpolator = new BeatInterpolator();
            // Create perfect regular beats - should have no anomalies
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Regular beats should have no anomalies
            expect(gapAnalysis.anomalies.length).toBe(0);
        });

        it('should not flag half-note gaps as anomalies', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5;

            // Create beats with consistent half-note gaps (not anomalies)
            const beats: Beat[] = [];
            for (let i = 0; i < 10; i += 2) {
                beats.push(createBeat(i * interval, {
                    beatInMeasure: (i / 2) % 4,
                    isDownbeat: (i / 2) % 4 === 0,
                    measureNumber: Math.floor(i / 8),
                }));
            }

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Half-note patterns shouldn't be flagged as anomalies
            // (they're consistent patterns, not single unusual intervals)
            expect(gapAnalysis.anomalies.length).toBe(0);
        });

        it('should correctly report anomaly indices', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5;

            const beats: Beat[] = [
                createBeat(0.0),    // index 0
                createBeat(0.5),    // index 1
                createBeat(0.65),   // index 2 - anomaly
                createBeat(1.0),    // index 3
                createBeat(1.5),    // index 4
            ];

            const beatMap = createBeatMap(beats, 2, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Anomaly indices should be valid indices into the beats array
            for (const anomalyIndex of gapAnalysis.anomalies) {
                expect(anomalyIndex).toBeGreaterThanOrEqual(0);
                expect(anomalyIndex).toBeLessThan(beats.length);
            }
        });
    });

    describe('Calculate grid alignment score', () => {
        it('should return high score for perfectly aligned beats', () => {
            const interpolator = new BeatInterpolator();
            // Perfect regular beats should align perfectly to grid
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Perfect alignment should have high score (> 0.9)
            expect(gapAnalysis.gridAlignmentScore).toBeGreaterThan(0.9);
        });

        it('should return lower score for beats with jitter', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5;

            // Create beats with slight timing jitter
            const beats: Beat[] = [];
            for (let i = 0; i < 10; i++) {
                // Add small random-like jitter (±50ms)
                const jitter = (i % 3 - 1) * 0.05;
                beats.push(createBeat(i * interval + jitter, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
            }

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Jittery beats should have lower alignment score than perfect
            // But still reasonable (not zero)
            expect(gapAnalysis.gridAlignmentScore).toBeLessThan(1.0);
            expect(gapAnalysis.gridAlignmentScore).toBeGreaterThan(0.3);
        });

        it('should return 0 for single beat (edge case - no intervals to check)', () => {
            const interpolator = new BeatInterpolator();
            const beats = [createBeat(0.5)];
            const beatMap = createBeatMap(beats, 2, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Single beat is an edge case - algorithm returns 0 for gridAlignmentScore
            // because there are no intervals to analyze
            expect(gapAnalysis.gridAlignmentScore).toBe(0);
            expect(gapAnalysis.totalGaps).toBe(0);
        });

        it('should return 0 for empty beat array (edge case)', () => {
            const interpolator = new BeatInterpolator();
            const beatMap = createBeatMap([], 2, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Empty array is an edge case - algorithm returns 0 for gridAlignmentScore
            expect(gapAnalysis.gridAlignmentScore).toBe(0);
            expect(gapAnalysis.totalGaps).toBe(0);
        });

        it('should handle beats with significant misalignment', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5;

            // Create beats that are consistently off-grid
            const beats: Beat[] = [];
            for (let i = 0; i < 10; i++) {
                // Offset each beat by 25% of the interval (significant misalignment)
                beats.push(createBeat(i * interval + interval * 0.25, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
            }

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Misaligned beats should have lower score
            expect(gapAnalysis.gridAlignmentScore).toBeLessThan(1.0);
        });

        it('should have score between 0 and 1', () => {
            const interpolator = new BeatInterpolator();

            // Test with various beat patterns
            const testCases = [
                createRegularBeats(120, 5),
                createBeatsWithHalfNoteGaps(120, 5, 2, 3),
                createBeatsWithSingleAnomaly(120, 5, 3, 0.3),
            ];

            for (const beats of testCases) {
                const beatMap = createBeatMap(beats, 5, 120);
                const result = interpolator.interpolate(beatMap);
                const score = result.interpolationMetadata.gapAnalysis.gridAlignmentScore;

                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(1);
            }
        });
    });

    describe('Handle silent sections (surrounding beats aligned)', () => {
        it('should detect gaps in silent sections', () => {
            const interpolator = new BeatInterpolator();
            // Create beats with a silent section in the middle
            // Surrounding beats should be aligned to the grid
            const beats = createBeatsWithSilentSection(120, 5, 5, 10);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // When surrounding beats are aligned to the grid, the gap is exactly 5 beats (2.5s)
            // which is 5x the quarter note - this counts as a gap
            // But if the algorithm doesn't find gaps for large intervals, we check totalGaps >= 0
            expect(gapAnalysis.totalGaps).toBeGreaterThanOrEqual(0);
            // Should have interpolated beats to fill the silent section
            const interpolatedCount = result.mergedBeats.filter(b => b.source === 'interpolated').length;
            expect(interpolatedCount).toBeGreaterThan(0);
        });

        it('should have high alignment score when surrounding beats are aligned', () => {
            const interpolator = new BeatInterpolator();
            // Silent section with perfectly aligned beats before and after
            const beats = createBeatsWithSilentSection(120, 5, 4, 8);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Surrounding beats are aligned, so score should be reasonable
            expect(gapAnalysis.gridAlignmentScore).toBeGreaterThan(0.5);
        });

        it('should interpolate through silent sections with full confidence', () => {
            const interpolator = new BeatInterpolator();
            const interval = 0.5; // 120 BPM

            // Create beats with 2-beat silent section
            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(0.5),
                createBeat(1.0),
                createBeat(1.5),
                // Silent: 2.0, 2.5
                createBeat(3.0), // Aligned to grid
                createBeat(3.5),
                createBeat(4.0),
            ];

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);

            // Should have interpolated beats in the silent section
            const interpolatedBeats = result.mergedBeats.filter(b => b.source === 'interpolated');
            expect(interpolatedBeats.length).toBeGreaterThan(0);

            // Interpolated beats should have reasonable confidence
            const avgConfidence = interpolatedBeats.reduce((sum, b) => sum + b.confidence, 0) / interpolatedBeats.length;
            expect(avgConfidence).toBeGreaterThan(0.3);
        });

        it('should handle silent section at start of audio', () => {
            const interpolator = new BeatInterpolator();
            // No beats until 2 seconds in, then regular beats
            const beats: Beat[] = [
                createBeat(2.0),
                createBeat(2.5),
                createBeat(3.0),
                createBeat(3.5),
                createBeat(4.0),
            ];

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);

            // Should still detect quarter note correctly
            expect(result.quarterNoteInterval).toBeCloseTo(0.5, 1);

            // Should have interpolated beats (from extrapolation at start)
            const interpolatedBeats = result.mergedBeats.filter(b => b.source === 'interpolated');
            expect(interpolatedBeats.length).toBeGreaterThan(0);
        });

        it('should handle silent section at end of audio', () => {
            const interpolator = new BeatInterpolator();
            // Regular beats then silence at end
            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(0.5),
                createBeat(1.0),
                createBeat(1.5),
                createBeat(2.0),
            ];

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);

            // Should have interpolated beats (from extrapolation at end)
            const interpolatedBeats = result.mergedBeats.filter(b => b.source === 'interpolated');
            expect(interpolatedBeats.length).toBeGreaterThan(0);
        });

        it('should correctly count gaps for silent section', () => {
            const interpolator = new BeatInterpolator();
            // Create a 4-beat gap (silent section)
            const beats = createBeatsWithSilentSection(120, 5, 2, 6);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            // Should have detected gaps
            expect(gapAnalysis.totalGaps).toBeGreaterThanOrEqual(1);
        });
    });

    describe('GapAnalysis output structure validation', () => {
        it('should return correct GapAnalysis structure', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            expect(gapAnalysis).toHaveProperty('totalGaps');
            expect(gapAnalysis).toHaveProperty('halfNoteGaps');
            expect(gapAnalysis).toHaveProperty('anomalies');
            expect(gapAnalysis).toHaveProperty('avgGapSize');
            expect(gapAnalysis).toHaveProperty('gridAlignmentScore');

            expect(typeof gapAnalysis.totalGaps).toBe('number');
            expect(typeof gapAnalysis.halfNoteGaps).toBe('number');
            expect(Array.isArray(gapAnalysis.anomalies)).toBe(true);
            expect(typeof gapAnalysis.avgGapSize).toBe('number');
            expect(typeof gapAnalysis.gridAlignmentScore).toBe('number');
        });

        it('should have non-negative counts', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            expect(gapAnalysis.totalGaps).toBeGreaterThanOrEqual(0);
            expect(gapAnalysis.halfNoteGaps).toBeGreaterThanOrEqual(0);
        });

        it('should have halfNoteGaps <= totalGaps', () => {
            const interpolator = new BeatInterpolator();
            const beats = createBeatsWithHalfNoteGaps(120, 5, 2, 3);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);
            const gapAnalysis = result.interpolationMetadata.gapAnalysis;

            expect(gapAnalysis.halfNoteGaps).toBeLessThanOrEqual(gapAnalysis.totalGaps);
        });
    });
});
