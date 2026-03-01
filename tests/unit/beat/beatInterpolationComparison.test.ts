/**
 * Tests for Beat Interpolation Comparison Utility
 *
 * Tests the comparison utility that helps researchers compare
 * the three interpolation approaches.
 */

import { describe, it, expect } from 'vitest';
import {
    compareInterpolationApproaches,
    calculateAccuracyAgainstGroundTruth,
    formatComparisonTable,
    comparisonToJSON,
    ALL_ALGORITHMS,
} from '../../../src/core/analysis/beat/utils/beatInterpolationComparison.js';
import { BeatInterpolator } from '../../../src/core/analysis/beat/BeatInterpolator.js';
import type { Beat, BeatMap, BeatMapMetadata, BeatWithSource, InterpolatedBeatMap } from '../../../src/core/types/BeatMap.js';
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

// Helper to create beats with gaps at specific indices
function createBeatsWithGaps(
    bpm: number,
    durationSeconds: number,
    gapIndices: number[]
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;
    let beatIndex = 0;

    for (let time = 0; time < durationSeconds; time += interval) {
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

describe('Beat Interpolation Comparison Utility', () => {
    describe('compareInterpolationApproaches', () => {
        it('should run all three algorithms and return results', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            // Should have results for all algorithms
            expect(comparison.results).toHaveProperty('histogram-grid');
            expect(comparison.results).toHaveProperty('adaptive-phase-locked');
            expect(comparison.results).toHaveProperty('dual-pass');

            // Each result should be a valid InterpolatedBeatMap
            for (const algo of ALL_ALGORITHMS) {
                const result = comparison.results[algo];
                expect(result).toHaveProperty('audioId');
                expect(result).toHaveProperty('duration');
                expect(result).toHaveProperty('detectedBeats');
                expect(result).toHaveProperty('mergedBeats');
                expect(result).toHaveProperty('quarterNoteInterval');
            }
        });

        it('should include original beat map info', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            expect(comparison.originalBeatMap.audioId).toBe(beatMap.audioId);
            expect(comparison.originalBeatMap.duration).toBe(beatMap.duration);
            expect(comparison.originalBeatMap.beatCount).toBe(beats.length);
            expect(comparison.originalBeatMap.bpm).toBe(bpm);
        });

        it('should calculate comparison metrics', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            // Should have multiple metrics
            expect(comparison.metrics.length).toBeGreaterThan(0);

            // Each metric should have required properties
            for (const metric of comparison.metrics) {
                expect(metric).toHaveProperty('name');
                expect(metric).toHaveProperty('description');
                expect(metric).toHaveProperty('unit');
                expect(metric).toHaveProperty('values');
                expect(metric).toHaveProperty('bestAlgorithm');
                expect(metric).toHaveProperty('higherIsBetter');

                // Values should have all algorithms
                expect(metric.values).toHaveProperty('histogram-grid');
                expect(metric.values).toHaveProperty('adaptive-phase-locked');
                expect(metric.values).toHaveProperty('dual-pass');
            }
        });

        it('should include pairwise comparisons when enabled', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap, {
                includePairwise: true,
            });

            // Should have 3 pairwise comparisons (3 choose 2 = 3)
            expect(comparison.pairwiseComparisons.length).toBe(3);

            // Each comparison should have required properties
            for (const pc of comparison.pairwiseComparisons) {
                expect(pc).toHaveProperty('algorithm1');
                expect(pc).toHaveProperty('algorithm2');
                expect(pc).toHaveProperty('beatCountDifference');
                expect(pc).toHaveProperty('avgTimestampDifference');
                expect(pc).toHaveProperty('sharedBeats');
                expect(pc).toHaveProperty('positionCorrelation');
            }
        });

        it('should skip pairwise comparisons when disabled', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap, {
                includePairwise: false,
            });

            expect(comparison.pairwiseComparisons.length).toBe(0);
        });

        it('should generate a summary', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            expect(comparison.summary).toContain('Beat Interpolation Comparison');
            expect(comparison.summary).toContain(beatMap.audioId);
            expect(comparison.summary).toContain('histogram-grid');
            expect(comparison.summary).toContain('adaptive-phase-locked');
            expect(comparison.summary).toContain('dual-pass');
        });

        it('should provide a recommendation', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            expect(comparison.recommendation).toHaveProperty('algorithm');
            expect(comparison.recommendation).toHaveProperty('reason');
            expect(comparison.recommendation).toHaveProperty('confidence');
            expect(['high', 'medium', 'low']).toContain(comparison.recommendation.confidence);
            expect(ALL_ALGORITHMS).toContain(comparison.recommendation.algorithm);
        });

        it('should include processing time', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            expect(comparison.processingTimeMs).toBeGreaterThanOrEqual(0);
        });

        it('should include timestamp', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            expect(comparison.comparedAt).toBeDefined();
            const date = new Date(comparison.comparedAt);
            expect(date.getTime()).not.toBeNaN();
        });

        it('should work with beats that have gaps', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7, 11]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);

            // All algorithms should produce more merged beats than detected
            for (const algo of ALL_ALGORITHMS) {
                expect(comparison.results[algo].mergedBeats.length).toBeGreaterThan(beats.length);
            }
        });

        it('should respect custom interpolation options', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            // Test with extrapolation disabled
            const comparison = compareInterpolationApproaches(beatMap, {
                interpolationOptions: {
                    extrapolateStart: false,
                    extrapolateEnd: false,
                },
            });

            // All results should have extrapolation disabled
            for (const algo of ALL_ALGORITHMS) {
                const firstBeat = comparison.results[algo].mergedBeats[0];
                const lastBeat = comparison.results[algo].mergedBeats[comparison.results[algo].mergedBeats.length - 1];

                // First beat should be at or after the first detected beat
                expect(firstBeat.timestamp).toBeGreaterThanOrEqual(beats[0].timestamp - 0.01);
            }
        });
    });

    describe('calculateAccuracyAgainstGroundTruth', () => {
        it('should calculate precision and recall', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7]);
            const beatMap = createBeatMap(beats, duration, bpm);

            // Use the regular beats as ground truth
            const groundTruth = createRegularBeats(bpm, duration).map(b => b.timestamp);

            const interpolator = new BeatInterpolator();
            const interpolatedMap = interpolator.interpolate(beatMap);

            const accuracy = calculateAccuracyAgainstGroundTruth(interpolatedMap, groundTruth);

            expect(accuracy.truePositives).toBeGreaterThanOrEqual(0);
            expect(accuracy.falsePositives).toBeGreaterThanOrEqual(0);
            expect(accuracy.falseNegatives).toBeGreaterThanOrEqual(0);
            expect(accuracy.precision).toBeGreaterThanOrEqual(0);
            expect(accuracy.precision).toBeLessThanOrEqual(1);
            expect(accuracy.recall).toBeGreaterThanOrEqual(0);
            expect(accuracy.recall).toBeLessThanOrEqual(1);
            expect(accuracy.f1Score).toBeGreaterThanOrEqual(0);
            expect(accuracy.f1Score).toBeLessThanOrEqual(1);
        });

        it('should return perfect scores for perfect match', () => {
            const bpm = 120;
            const duration = 2;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const groundTruth = beats.map(b => b.timestamp);

            const interpolator = new BeatInterpolator({
                extrapolateStart: false,
                extrapolateEnd: false,
            });
            const interpolatedMap = interpolator.interpolate(beatMap);

            const accuracy = calculateAccuracyAgainstGroundTruth(interpolatedMap, groundTruth, 0.01);

            // All ground truth beats should be found (high recall)
            expect(accuracy.truePositives).toBe(beats.length);
            expect(accuracy.recall).toBe(1);
            // Precision should be high (may have interpolated beats matching the same positions)
            expect(accuracy.precision).toBeGreaterThanOrEqual(0.9);
            // F1 should be high
            expect(accuracy.f1Score).toBeGreaterThanOrEqual(0.9);
        });

        it('should calculate timing errors', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7, 11]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const groundTruth = createRegularBeats(bpm, duration).map(b => b.timestamp);

            const interpolator = new BeatInterpolator();
            const interpolatedMap = interpolator.interpolate(beatMap);

            const accuracy = calculateAccuracyAgainstGroundTruth(interpolatedMap, groundTruth);

            expect(accuracy.avgTimingErrorMs).toBeGreaterThanOrEqual(0);
            expect(accuracy.maxTimingErrorMs).toBeGreaterThanOrEqual(0);
            expect(accuracy.maxTimingErrorMs).toBeGreaterThanOrEqual(accuracy.avgTimingErrorMs);
        });

        it('should handle empty inputs gracefully', () => {
            const beatMap = createBeatMap([], 5, 120);

            const interpolator = new BeatInterpolator();
            const interpolatedMap = interpolator.interpolate(beatMap);

            const accuracy = calculateAccuracyAgainstGroundTruth(interpolatedMap, []);

            expect(accuracy.truePositives).toBe(0);
            expect(accuracy.falsePositives).toBe(0);
            expect(accuracy.falseNegatives).toBe(0);
            expect(accuracy.precision).toBe(0);
            expect(accuracy.recall).toBe(0);
        });
    });

    describe('formatComparisonTable', () => {
        it('should generate a markdown table', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);
            const table = formatComparisonTable(comparison);

            expect(table).toContain('| Metric |');
            expect(table).toContain('histogram-grid');
            expect(table).toContain('adaptive-phase-locked');
            expect(table).toContain('dual-pass');
            expect(table).toContain('| Best |');
        });

        it('should include all metrics in the table', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);
            const table = formatComparisonTable(comparison);

            for (const metric of comparison.metrics) {
                expect(table).toContain(metric.name);
            }
        });
    });

    describe('comparisonToJSON', () => {
        it('should serialize comparison to valid JSON', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);
            const json = comparisonToJSON(comparison);

            expect(() => JSON.parse(json)).not.toThrow();
        });

        it('should include all key information in JSON', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const comparison = compareInterpolationApproaches(beatMap);
            const json = comparisonToJSON(comparison);
            const parsed = JSON.parse(json);

            expect(parsed).toHaveProperty('originalBeatMap');
            expect(parsed).toHaveProperty('metrics');
            expect(parsed).toHaveProperty('recommendation');
            expect(parsed).toHaveProperty('comparedAt');
            expect(parsed).toHaveProperty('beatCounts');
        });
    });

    describe('ALL_ALGORITHMS constant', () => {
        it('should contain all three algorithms', () => {
            expect(ALL_ALGORITHMS).toContain('histogram-grid');
            expect(ALL_ALGORITHMS).toContain('adaptive-phase-locked');
            expect(ALL_ALGORITHMS).toContain('dual-pass');
            expect(ALL_ALGORITHMS.length).toBe(3);
        });
    });

    describe('Performance', () => {
        it('should complete comparison quickly for typical beat maps', () => {
            const bpm = 120;
            const duration = 60; // 1 minute
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const startTime = performance.now();
            compareInterpolationApproaches(beatMap);
            const elapsed = performance.now() - startTime;

            // Should complete in under 100ms
            expect(elapsed).toBeLessThan(100);
        });

        it('should handle large beat maps efficiently', () => {
            const bpm = 120;
            const duration = 300; // 5 minutes
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const startTime = performance.now();
            const comparison = compareInterpolationApproaches(beatMap);
            const elapsed = performance.now() - startTime;

            // Should complete in under 500ms even for 5-minute songs
            expect(elapsed).toBeLessThan(500);

            // Results should still be valid
            expect(comparison.results['dual-pass'].mergedBeats.length).toBeGreaterThan(0);
        });
    });
});
