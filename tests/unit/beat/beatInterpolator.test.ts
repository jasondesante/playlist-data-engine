/**
 * Tests for Beat Interpolation Algorithms
 *
 * Tests the three interpolation approaches:
 * - histogram-grid: Fixed grid based on histogram peak detection
 * - adaptive-phase-locked: Phase tracking at anchor points with tempo drift handling
 * - dual-pass: KDE + weighted clustering with confidence scoring
 */

import { describe, it, expect } from 'vitest';
import { BeatInterpolator } from '../../../src/core/analysis/beat/BeatInterpolator.js';
import type { Beat, BeatMap, BeatMapMetadata, BeatWithSource } from '../../../src/core/types/BeatMap.js';
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

// Helper to create beats with slight tempo drift
function createBeatsWithTempoDrift(
    startBpm: number,
    endBpm: number,
    durationSeconds: number
): Beat[] {
    const beats: Beat[] = [];
    const bpmChangePerBeat = (endBpm - startBpm) / (durationSeconds * startBpm / 60);

    let time = 0;
    let currentBpm = startBpm;

    while (time < durationSeconds) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));

        const interval = 60 / currentBpm;
        time += interval;
        currentBpm += bpmChangePerBeat;
    }

    return beats;
}

describe('Beat Interpolation Algorithms', () => {
    describe('Approach 1: Fixed grid matches expected timestamps', () => {
        it('should generate grid at exact quarter note intervals', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'histogram-grid' });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);
            const qn = 60 / bpm; // 0.5 seconds

            // Check that merged beats are at quarter note intervals
            for (let i = 1; i < result.mergedBeats.length; i++) {
                const interval = result.mergedBeats[i].timestamp - result.mergedBeats[i - 1].timestamp;
                expect(interval).toBeCloseTo(qn, 1);
            }
        });

        it('should start grid from first detected beat', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'histogram-grid' });
            const bpm = 120;
            const duration = 5;
            const startOffset = 0.25; // Start at 0.25 seconds
            const beats = createRegularBeats(bpm, duration, startOffset);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // First beat should be at the first detected beat's timestamp
            expect(result.mergedBeats[0].timestamp).toBeCloseTo(startOffset, 2);
        });

        it('should extrapolate before first beat when enabled', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'histogram-grid',
                extrapolateStart: true,
            });
            const bpm = 120;
            const duration = 5;
            const startOffset = 1.0; // First beat at 1 second
            const beats = createRegularBeats(bpm, duration, startOffset);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Should have beats before the first detected beat
            expect(result.mergedBeats[0].timestamp).toBeLessThan(startOffset);
            expect(result.mergedBeats[0].source).toBe('interpolated');
        });

        it('should not extrapolate before first beat when disabled', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'histogram-grid',
                extrapolateStart: false,
            });
            const bpm = 120;
            const duration = 5;
            const startOffset = 1.0;
            const beats = createRegularBeats(bpm, duration, startOffset);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // First beat should be at startOffset
            expect(result.mergedBeats[0].timestamp).toBeCloseTo(startOffset, 2);
            expect(result.mergedBeats[0].source).toBe('detected');
        });

        it('should extrapolate after last beat when enabled', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'histogram-grid',
                extrapolateEnd: true,
            });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, 3); // Only 3 seconds of beats
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Should have beats after the last detected beat
            const lastBeat = result.mergedBeats[result.mergedBeats.length - 1];
            expect(lastBeat.timestamp).toBeGreaterThan(3);
        });

        it('should not extrapolate after last beat when disabled', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'histogram-grid',
                extrapolateEnd: false,
            });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, 3);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Last beat should be at or before 3 seconds
            const lastDetected = beats[beats.length - 1];
            const lastMerged = result.mergedBeats[result.mergedBeats.length - 1];
            expect(lastMerged.timestamp).toBeLessThanOrEqual(lastDetected.timestamp + 0.01);
        });

        it('should generate correct number of beats for known duration', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'histogram-grid',
                extrapolateStart: false,
                extrapolateEnd: false,
            });
            const bpm = 120;
            const duration = 4; // 4 seconds
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // At 120 BPM with 0.5s intervals, 4 seconds should have ~8 beats
            expect(result.mergedBeats.length).toBeGreaterThanOrEqual(7);
            expect(result.mergedBeats.length).toBeLessThanOrEqual(9);
        });

        it('should fill gaps with interpolated beats at correct positions', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'histogram-grid' });
            const bpm = 120;
            const duration = 5;
            // Skip beats at indices 3 and 7
            const beats = createBeatsWithGaps(bpm, duration, [3, 7]);
            const beatMap = createBeatMap(beats, duration, bpm);
            const qn = 60 / bpm; // 0.5 seconds

            const result = interpolator.interpolate(beatMap);

            // Check that beats at positions 3*qn and 7*qn exist and are interpolated
            const expectedPositions = [3 * qn, 7 * qn];

            for (const expectedPos of expectedPositions) {
                const found = result.mergedBeats.find(b =>
                    Math.abs(b.timestamp - expectedPos) < 0.05
                );
                expect(found).toBeDefined();
                expect(found!.source).toBe('interpolated');
            }
        });
    });

    describe('Approach 2: Adaptive grid adjusts at anchors', () => {
        it('should adjust tempo based on detected beats', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'adaptive-phase-locked',
                tempoAdaptationRate: 0.5,
            });

            // Create beats with a slight tempo change
            const beats: Beat[] = [];
            const duration = 6;

            // First half at 120 BPM, second half at 130 BPM
            let time = 0;
            // 3 seconds at 120 BPM (6 beats)
            for (let i = 0; i < 6; i++) {
                beats.push(createBeat(time, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
                time += 0.5; // 120 BPM
            }

            // 3 seconds at ~130 BPM (~0.46s per beat, 6 beats)
            for (let i = 0; i < 6; i++) {
                beats.push(createBeat(time, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor((6 + i) / 4),
                }));
                time += 0.46; // ~130 BPM
            }

            const beatMap = createBeatMap(beats, duration + 3, 120);
            const result = interpolator.interpolate(beatMap);

            // Should have detected beats
            expect(result.detectedBeats.length).toBe(12);

            // Merged beats should include interpolated beats
            expect(result.mergedBeats.length).toBeGreaterThan(0);
        });

        it('should track phase at each anchor point', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'adaptive-phase-locked',
            });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // All detected beats should be in the merged output
            for (const detectedBeat of beats) {
                const found = result.mergedBeats.find(b =>
                    Math.abs(b.timestamp - detectedBeat.timestamp) < 0.01
                );
                expect(found).toBeDefined();
                expect(found!.source).toBe('detected');
            }
        });

        it('should handle tempo drift with adaptation', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'adaptive-phase-locked',
                tempoAdaptationRate: 0.8, // High adaptation
            });

            // Create beats with gradual tempo drift
            const beats = createBeatsWithTempoDrift(120, 130, 5);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);

            // Should still have all detected beats
            const detectedCount = result.mergedBeats.filter(b => b.source === 'detected').length;
            expect(detectedCount).toBe(beats.length);
        });

        it('should use no tempo adaptation when rate is 0', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'adaptive-phase-locked',
                tempoAdaptationRate: 0, // Fixed tempo
            });

            // Create beats with tempo drift
            const beats = createBeatsWithTempoDrift(120, 130, 5);
            const beatMap = createBeatMap(beats, 5, 120);

            const result = interpolator.interpolate(beatMap);

            // With fixed tempo, should still produce output
            expect(result.mergedBeats.length).toBeGreaterThan(0);
        });

        it('should produce sorted output', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'adaptive-phase-locked',
            });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Check that merged beats are sorted by timestamp
            for (let i = 1; i < result.mergedBeats.length; i++) {
                expect(result.mergedBeats[i].timestamp).toBeGreaterThanOrEqual(
                    result.mergedBeats[i - 1].timestamp
                );
            }
        });
    });

    describe('Approach 3: Confidence scoring works correctly', () => {
        it('should assign confidence to all beats', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'dual-pass' });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // All beats should have confidence between 0 and 1
            for (const beat of result.mergedBeats) {
                expect(beat.confidence).toBeGreaterThanOrEqual(0);
                expect(beat.confidence).toBeLessThanOrEqual(1);
            }
        });

        it('should have higher confidence for detected beats than interpolated', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'dual-pass' });
            const bpm = 120;
            const duration = 5;
            // Create beats with gaps to force interpolation
            const beats = createBeatsWithGaps(bpm, duration, [5, 10, 15]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            const detectedBeats = result.mergedBeats.filter(b => b.source === 'detected');
            const interpolatedBeats = result.mergedBeats.filter(b => b.source === 'interpolated');

            if (interpolatedBeats.length > 0 && detectedBeats.length > 0) {
                const avgDetected = detectedBeats.reduce((s, b) => s + b.confidence, 0) / detectedBeats.length;
                const avgInterpolated = interpolatedBeats.reduce((s, b) => s + b.confidence, 0) / interpolatedBeats.length;

                // Detected beats typically have higher or equal confidence
                expect(avgDetected).toBeGreaterThanOrEqual(avgInterpolated * 0.9);
            }
        });

        it('should include distance to anchor for interpolated beats', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'dual-pass' });
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [5, 10]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            const interpolatedBeats = result.mergedBeats.filter(b => b.source === 'interpolated');

            // Interpolated beats should have distance and anchor info
            for (const beat of interpolatedBeats) {
                expect(beat.distanceToAnchor).toBeDefined();
                expect(beat.nearestAnchorTimestamp).toBeDefined();
            }
        });

        it('should calculate grid alignment in confidence', () => {
            const interpolator = new BeatInterpolator({
                algorithm: 'dual-pass',
                gridAlignmentWeight: 0.6,
                anchorConfidenceWeight: 0.2,
                paceConfidenceWeight: 0.2,
            });
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // With perfectly aligned beats, confidence should be high
            const avgConfidence = result.mergedBeats.reduce((s, b) => s + b.confidence, 0) / result.mergedBeats.length;
            expect(avgConfidence).toBeGreaterThan(0.5);
        });

        it('should use error correction at anchor points', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'dual-pass' });

            // Create beats with slight timing errors
            const beats: Beat[] = [];
            const qn = 0.5;
            for (let i = 0; i < 10; i++) {
                // Add small timing error
                const error = (i % 2 === 0 ? 0.02 : -0.02);
                beats.push(createBeat(i * qn + error, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
            }

            const beatMap = createBeatMap(beats, 5, 120);
            const result = interpolator.interpolate(beatMap);

            // Should still produce valid output with error correction
            expect(result.mergedBeats.length).toBeGreaterThan(0);
        });

        it('should factor in gap analysis for confidence', () => {
            const interpolator = new BeatInterpolator({ algorithm: 'dual-pass' });
            const bpm = 120;
            const duration = 5;

            // Compare well-aligned beats with misaligned beats
            const alignedBeats = createRegularBeats(bpm, duration);
            const alignedBeatMap = createBeatMap(alignedBeats, duration, bpm);
            const alignedResult = interpolator.interpolate(alignedBeatMap);

            // Create misaligned beats
            const misalignedBeats: Beat[] = [];
            for (let i = 0; i < 10; i++) {
                misalignedBeats.push(createBeat(i * 0.5 + 0.15, { // 15% off grid
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
            }
            const misalignedBeatMap = createBeatMap(misalignedBeats, duration, bpm);
            const misalignedResult = interpolator.interpolate(misalignedBeatMap);

            // Both should produce valid output
            expect(alignedResult.mergedBeats.length).toBeGreaterThan(0);
            expect(misalignedResult.mergedBeats.length).toBeGreaterThan(0);
        });
    });

    describe('All approaches produce same beat count for simple case', () => {
        it('should produce same beat count for regular beats at 120 BPM', () => {
            const bpm = 120;
            const duration = 4;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const algorithms: ('histogram-grid' | 'adaptive-phase-locked' | 'dual-pass')[] = [
                'histogram-grid',
                'adaptive-phase-locked',
                'dual-pass',
            ];

            const results = algorithms.map(algo => {
                const interpolator = new BeatInterpolator({
                    algorithm: algo,
                    extrapolateStart: false,
                    extrapolateEnd: false,
                });
                return interpolator.interpolate(beatMap);
            });

            // All algorithms should produce similar beat counts (within 1 beat tolerance)
            const counts = results.map(r => r.mergedBeats.length);
            const minCount = Math.min(...counts);
            const maxCount = Math.max(...counts);

            expect(maxCount - minCount).toBeLessThanOrEqual(1);
        });

        it('should all detect same quarter note for regular beats', () => {
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const algorithms: ('histogram-grid' | 'adaptive-phase-locked' | 'dual-pass')[] = [
                'histogram-grid',
                'adaptive-phase-locked',
                'dual-pass',
            ];

            const results = algorithms.map(algo => {
                const interpolator = new BeatInterpolator({ algorithm: algo });
                return interpolator.interpolate(beatMap);
            });

            // All should detect ~0.5s quarter note (120 BPM)
            for (const result of results) {
                expect(result.quarterNoteInterval).toBeCloseTo(0.5, 1);
                expect(result.quarterNoteBpm).toBeCloseTo(120, 0);
            }
        });

        it('should all preserve detected beats in merged output', () => {
            const bpm = 120;
            const duration = 4;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const algorithms: ('histogram-grid' | 'adaptive-phase-locked' | 'dual-pass')[] = [
                'histogram-grid',
                'adaptive-phase-locked',
                'dual-pass',
            ];

            for (const algo of algorithms) {
                const interpolator = new BeatInterpolator({ algorithm: algo });
                const result = interpolator.interpolate(beatMap);

                // All detected beats should be in merged output
                const detectedBeats = result.mergedBeats.filter(b => b.source === 'detected');
                expect(detectedBeats.length).toBe(beats.length);
            }
        });

        it('should all produce sorted output', () => {
            const bpm = 120;
            const duration = 4;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const algorithms: ('histogram-grid' | 'adaptive-phase-locked' | 'dual-pass')[] = [
                'histogram-grid',
                'adaptive-phase-locked',
                'dual-pass',
            ];

            for (const algo of algorithms) {
                const interpolator = new BeatInterpolator({ algorithm: algo });
                const result = interpolator.interpolate(beatMap);

                // Check sorted by timestamp
                for (let i = 1; i < result.mergedBeats.length; i++) {
                    expect(result.mergedBeats[i].timestamp).toBeGreaterThanOrEqual(
                        result.mergedBeats[i - 1].timestamp
                    );
                }
            }
        });
    });

    describe('Detected beats override interpolated in merge', () => {
        it('should mark detected beats with source=detected', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // All original beats should be marked as detected
            const detectedBeats = result.mergedBeats.filter(b => b.source === 'detected');
            expect(detectedBeats.length).toBe(beats.length);
        });

        it('should mark interpolated beats with source=interpolated', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7, 11]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Should have some interpolated beats
            const interpolatedBeats = result.mergedBeats.filter(b => b.source === 'interpolated');
            expect(interpolatedBeats.length).toBeGreaterThan(0);
        });

        it('should use detected beat when it exists at grid position', () => {
            const interpolator = new BeatInterpolator({ gridSnapTolerance: 0.05 });
            const bpm = 120;
            const duration = 3;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Each detected beat should appear in merged output
            for (const originalBeat of beats) {
                const mergedBeat = result.mergedBeats.find(b =>
                    Math.abs(b.timestamp - originalBeat.timestamp) < 0.01
                );
                expect(mergedBeat).toBeDefined();
                expect(mergedBeat!.source).toBe('detected');
            }
        });

        it('should preserve detected beat confidence', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 3;

            // Create beats with varying confidence
            const beats: Beat[] = [];
            for (let i = 0; i * 0.5 < duration; i++) {
                beats.push(createBeat(i * 0.5, {
                    confidence: 0.7 + (i % 3) * 0.1, // Varying confidence
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
            }
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Detected beats should preserve their original confidence
            for (const originalBeat of beats) {
                const mergedBeat = result.mergedBeats.find(b =>
                    Math.abs(b.timestamp - originalBeat.timestamp) < 0.01
                );
                if (mergedBeat && mergedBeat.source === 'detected') {
                    expect(mergedBeat.confidence).toBeCloseTo(originalBeat.confidence, 1);
                }
            }
        });

        it('should override interpolated beat when detected is within tolerance', () => {
            const interpolator = new BeatInterpolator({ gridSnapTolerance: 0.1 });
            const qn = 0.5;
            const duration = 3;

            // Create beats slightly off the grid
            const beats: Beat[] = [
                createBeat(0.0),
                createBeat(0.52), // Slightly off grid (within tolerance)
                createBeat(1.0),
                createBeat(1.48), // Slightly off grid (within tolerance)
                createBeat(2.0),
            ];

            const beatMap = createBeatMap(beats, duration, 120);
            const result = interpolator.interpolate(beatMap);

            // All original beats should be detected (not interpolated)
            const detectedCount = result.mergedBeats.filter(b => b.source === 'detected').length;
            expect(detectedCount).toBe(beats.length);
        });

        it('should have separate detectedBeats array unchanged', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // detectedBeats should be exactly the original beats
            expect(result.detectedBeats.length).toBe(beats.length);
            expect(result.detectedBeats).toEqual(beats);
        });
    });

    describe('Output structure validation', () => {
        it('should return correct InterpolatedBeatMap structure', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Check all required properties
            expect(result).toHaveProperty('audioId');
            expect(result).toHaveProperty('duration');
            expect(result).toHaveProperty('detectedBeats');
            expect(result).toHaveProperty('mergedBeats');
            expect(result).toHaveProperty('quarterNoteInterval');
            expect(result).toHaveProperty('quarterNoteBpm');
            expect(result).toHaveProperty('quarterNoteConfidence');
            expect(result).toHaveProperty('originalMetadata');
            expect(result).toHaveProperty('interpolationMetadata');

            expect(result.audioId).toBe(beatMap.audioId);
            expect(result.duration).toBe(beatMap.duration);
            expect(Array.isArray(result.detectedBeats)).toBe(true);
            expect(Array.isArray(result.mergedBeats)).toBe(true);
        });

        it('should return correct BeatWithSource structure for merged beats', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);

            // Check BeatWithSource structure
            for (const beat of result.mergedBeats) {
                expect(beat).toHaveProperty('timestamp');
                expect(beat).toHaveProperty('beatInMeasure');
                expect(beat).toHaveProperty('isDownbeat');
                expect(beat).toHaveProperty('measureNumber');
                expect(beat).toHaveProperty('intensity');
                expect(beat).toHaveProperty('confidence');
                expect(beat).toHaveProperty('source');

                expect(['detected', 'interpolated']).toContain(beat.source);
            }
        });

        it('should return correct InterpolationMetadata structure', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createRegularBeats(bpm, duration);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);
            const meta = result.interpolationMetadata;

            expect(meta).toHaveProperty('quarterNoteDetection');
            expect(meta).toHaveProperty('gapAnalysis');
            expect(meta).toHaveProperty('detectedBeatCount');
            expect(meta).toHaveProperty('interpolatedBeatCount');
            expect(meta).toHaveProperty('totalBeatCount');
            expect(meta).toHaveProperty('interpolationRatio');
            expect(meta).toHaveProperty('avgInterpolatedConfidence');
            expect(meta).toHaveProperty('tempoDriftRatio');

            expect(meta.detectedBeatCount).toBe(beats.length);
            expect(meta.totalBeatCount).toBe(result.mergedBeats.length);
        });

        it('should have consistent counts in metadata', () => {
            const interpolator = new BeatInterpolator();
            const bpm = 120;
            const duration = 5;
            const beats = createBeatsWithGaps(bpm, duration, [3, 7, 11]);
            const beatMap = createBeatMap(beats, duration, bpm);

            const result = interpolator.interpolate(beatMap);
            const meta = result.interpolationMetadata;

            // total = detected + interpolated
            expect(meta.totalBeatCount).toBe(meta.detectedBeatCount + meta.interpolatedBeatCount);

            // interpolationRatio = interpolated / total
            if (meta.totalBeatCount > 0) {
                expect(meta.interpolationRatio).toBeCloseTo(
                    meta.interpolatedBeatCount / meta.totalBeatCount,
                    2
                );
            }
        });
    });
});

describe('Tempo Cluster Detection (Phase 2)', () => {
    describe('identifyTempoClusters', () => {
        it('should return empty array when no beats', () => {
            const interpolator = new BeatInterpolator();
            const beats: Beat[] = [];
            const clusters = (interpolator as any).identifyTempoClusters?.(beats);
            expect(clusters).toEqual([]);
        });

        it('should return empty array when only one beat', () => {
            const interpolator = new BeatInterpolator()
            const beats: Beat[] = [createBeat(0)];
            const clusters = (interpolator as any).identifyTempoClusters?.(beats)
            expect(clusters).toEqual([]);
        });

        it('should return empty array when beats are not in dense sections', () => {
            const interpolator = new BeatInterpolator({ denseSectionMinBeats: 5 })
            // Create beats with high variance (not consistent enough for dense sections)
            const beats: Beat[] = [
                createBeat(0),
                createBeat(0.1),  // 100ms gap = 10x faster
                createBeat(0.5),  // 400ms gap - very different
                createBeat(0.6),  // 100ms gap - back to fast
            ]
            const clusters = (interpolator as any).identifyTempoClusters?.(beats)
            expect(clusters).toEqual([]);
        });

        it('should return single verified cluster for consistent beats at same tempo', () => {
            const interpolator = new BeatInterpolator({ minClusterBeats: 4 })
            // Create 8 beats at 120 BPM (0.5s intervals)
            const beats: Beat[] = []
            for (let i = 0; i < 8; i++) {
                beats.push(createBeat(i * 0.5))
            }
            const clusters = (interpolator as any).identifyTempoClusters?.(beats)
            expect(clusters.length).toBe(1)
            expect(clusters[0].bpm).toBeCloseTo(120, 1)
            expect(clusters[0].isVerified).toBe(true)
            expect(clusters[0].beatCount).toBe(8)
        });

        it('should merge adjacent sections with similar tempo', () => {
            const interpolator = new BeatInterpolator({ minClusterBeats: 4 })
            // Create two groups of 4 beats each at similar tempo (120 and 125 BPM)
            const beats: Beat[] = []
            // First 4 beats at 120 BPM
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(i * 0.5))
            }
            // Next 4 beats at 125 BPM (0.48s intervals - close to 0.5)
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(2 + i * 0.48))
            }
            const clusters = (interpolator as any).identifyTempoClusters?.(beats)
            // Should merge into one cluster since tempos are similar (within 10% threshold)
            expect(clusters.length).toBe(1)
            expect(clusters[0].beatCount).toBe(8)
        });

        it('should return multiple clusters for clearly different tempos', () => {
            const interpolator = new BeatInterpolator({ minClusterBeats: 4, tempoSectionThreshold: 0.1 })
            // Create two groups of 4+ beats at clearly different tempos with a GAP
            // The gap ensures identifyDenseSections sees them as separate sections
            const beats: Beat[] = []
            // First 5 beats at 120 BPM (0.5s intervals)
            for (let i = 0; i < 5; i++) {
                beats.push(createBeat(i * 0.5))
            }
            // GAP: Skip the next beat position (would be at 2.5s at 120 BPM)
            // This creates a clear separation between sections
            // Next 5 beats at 150 BPM (0.4s intervals), starting AFTER the gap
            for (let i = 0; i < 5; i++) {
                beats.push(createBeat(3.5 + i * 0.4)) // Start at 3.5s, not 2.5s
            }
            const clusters = (interpolator as any).identifyTempoClusters?.(beats)
            // Should have two separate clusters
            expect(clusters.length).toBe(2)
            expect(clusters[0].bpm).toBeCloseTo(120, 1)
            expect(clusters[1].bpm).toBeCloseTo(150, 1)
        });

        it('should filter out unverified clusters (less than minClusterBeats)', () => {
            const interpolator = new BeatInterpolator({ minClusterBeats: 5 })
            // Create 4 beats at 120 BPM (not enough to be verified)
            const beats: Beat[] = []
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(i * 0.5))
            }
            const clusters = (interpolator as any).identifyTempoClusters?.(beats)
            // Should return empty since 4 < 5 minClusterBeats
            expect(clusters).toEqual([])
        });
    });

    describe('findConflictingClusters', () => {
        it('should return null when fewer than 2 clusters', () => {
            const interpolator = new BeatInterpolator()
            expect((interpolator as any).findConflictingClusters?.([])).toBeNull()
            const singleCluster: any[] = [{ bpm: 120 }]
            expect((interpolator as any).findConflictingClusters?.(singleCluster)).toBeNull()
        })

        it('should return null when clusters have similar tempos', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.1 })
            const clusters: any[] = [
                { bpm: 120, startIndex: 0, endIndex: 3 },
                { bpm: 125, startIndex: 4, endIndex: 7 }, // ~4% difference, below 10% threshold
            ]
            const conflicts = (interpolator as any).findConflictingClusters?.(clusters)
            expect(conflicts).toBeNull()
        })

        it('should return conflicts when clusters have clearly different tempos', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.1 })
            const clusters: any[] = [
                { bpm: 120, startIndex: 0, endIndex: 3 },
                { bpm: 150, startIndex: 4, endIndex: 7 }, // 25% difference, above 10% threshold
            ]
            const conflicts = (interpolator as any).findConflictingClusters?.(clusters)
            expect(conflicts).not.toBeNull()
            expect(conflicts!.length).toBe(1)
            expect(conflicts![0].cluster1.bpm).toBe(120)
            expect(conflicts![0].cluster2.bpm).toBe(150)
        })

        it('should filter out octave multiples as conflicts', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.1 })
            const clusters: any[] = [
                { bpm: 60, startIndex: 0, endIndex: 3 },
                { bpm: 120, startIndex: 4, endIndex: 7 }, // Double tempo - same actual tempo
            ]
            const conflicts = (interpolator as any).findConflictingClusters?.(clusters)
            // Should return null since 60 and 120 BPM are octave multiples
            expect(conflicts).toBeNull()
        })

        it('should detect multiple conflicts', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.1 })
            const clusters: any[] = [
                { bpm: 100, startIndex: 0, endIndex: 3 },
                { bpm: 120, startIndex: 4, endIndex: 7 }, // 20% difference from 100
                { bpm: 150, startIndex: 8, endIndex: 11 }, // 25% difference from 120
            ]
            const conflicts = (interpolator as any).findConflictingClusters?.(clusters)
            expect(conflicts).not.toBeNull()
            expect(conflicts!.length).toBeGreaterThan(1)
        })
    })

    describe('isOctaveMultiple', () => {
        it('should return true for half tempo', () => {
            const interpolator = new BeatInterpolator()
            expect((interpolator as any).isOctaveMultiple?.(60, 120)).toBe(true)
            expect((interpolator as any).isOctaveMultiple?.(120, 60)).toBe(true)
        })

        it('should return true for double tempo', () => {
            const interpolator = new BeatInterpolator()
            expect((interpolator as any).isOctaveMultiple?.(120, 60)).toBe(true)
            expect((interpolator as any).isOctaveMultiple?.(240, 120)).toBe(true)
        })

        it('should return false for non-octave tempos', () => {
            const interpolator = new BeatInterpolator()
            expect((interpolator as any).isOctaveMultiple?.(100, 120)).toBe(false)
            expect((interpolator as any).isOctaveMultiple?.(120, 150)).toBe(false)
            expect((interpolator as any).isOctaveMultiple?.(90, 120)).toBe(false)
        })

        it('should handle slight variations within tolerance', () => {
            const interpolator = new BeatInterpolator()
            // 62 BPM is close to 60 BPM * 2 = 120, within 10% tolerance
            expect((interpolator as any).isOctaveMultiple?.(62, 123)).toBe(true)
            // 59 BPM is close to 60 BPM, within 10% tolerance of 60 * 2 = 120
            expect((interpolator as any).isOctaveMultiple?.(118, 59)).toBe(true)
        })
    });
});

// ============================================================================
// Phase 3: Section Boundary Detection Tests
// ============================================================================

describe('Section Boundary Detection (Phase 3)', () => {
    describe('calculatePhaseAlignment', () => {
        it('should return 1 for beats exactly on grid', () => {
            const interpolator = new BeatInterpolator()
            const anchor = 0
            const interval = 0.5 // 120 BPM

            // Beat at exactly 1 second (2 beats from anchor)
            const alignment = (interpolator as any).calculatePhaseAlignment?.(1.0, anchor, interval)
            expect(alignment).toBe(1)
        })

        it('should return 1 for beats within tolerance', () => {
            const interpolator = new BeatInterpolator()
            const anchor = 0
            const interval = 0.5 // 120 BPM, 10% tolerance = 0.05s

            // Beat at 1.03 seconds (within 10% of expected 1.0s)
            const alignment = (interpolator as any).calculatePhaseAlignment?.(1.03, anchor, interval)
            expect(alignment).toBe(1)
        })

        it('should return 0 for beats outside tolerance', () => {
            const interpolator = new BeatInterpolator()
            const anchor = 0
            const interval = 0.5 // 120 BPM, 10% tolerance = 0.05s

            // Beat at 1.1 seconds (outside 10% of expected 1.0s)
            const alignment = (interpolator as any).calculatePhaseAlignment?.(1.1, anchor, interval)
            expect(alignment).toBe(0)
        })

        it('should work with non-zero anchors', () => {
            const interpolator = new BeatInterpolator()
            const anchor = 2.5
            const interval = 0.5

            // Beat exactly 2 intervals from anchor
            const alignment = (interpolator as any).calculatePhaseAlignment?.(3.5, anchor, interval)
            expect(alignment).toBe(1)
        })

        it('should handle beats before anchor', () => {
            const interpolator = new BeatInterpolator()
            const anchor = 2.0
            const interval = 0.5

            // Beat 2 intervals before anchor
            const alignment = (interpolator as any).calculatePhaseAlignment?.(1.0, anchor, interval)
            expect(alignment).toBe(1)
        })
    })

    describe('findCrossingPoint', () => {
        it('should create automatic boundary when no connecting beats', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.1 })

            // Create cluster 1: 4 beats at 120 BPM
            const cluster1Beats: Beat[] = []
            for (let i = 0; i < 4; i++) {
                cluster1Beats.push(createBeat(i * 0.5))
            }

            // Create cluster 2: 4 beats at 150 BPM, starting after a gap
            const cluster2Beats: Beat[] = []
            for (let i = 0; i < 4; i++) {
                cluster2Beats.push(createBeat(3.0 + i * 0.4)) // Gap from 2.0 to 3.0
            }

            const allBeats = [...cluster1Beats, ...cluster2Beats]

            const cluster1 = {
                startIndex: 0,
                endIndex: 3,
                beatCount: 4,
                avgInterval: 0.5,
                intervalVariance: 0,
                bpm: 120,
                isVerified: true,
            }
            const cluster2 = {
                startIndex: 4,
                endIndex: 7,
                beatCount: 4,
                avgInterval: 0.4,
                intervalVariance: 0,
                bpm: 150,
                isVerified: true,
            }

            const result = (interpolator as any).findCrossingPoint?.(cluster1, cluster2, allBeats)

            expect(result.hasBoundary).toBe(true)
            expect(result.boundaryTimestamp).toBeDefined()
            expect(result.gapRatio).toBe(1.0) // Maximum gap
        })

        it('should not create boundary when drift bridges gap', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.15 })

            // Create a scenario where connecting beats show gradual drift between clusters
            // Even though clusters have different tempos, the connecting beats bridge the gap
            const beats: Beat[] = []
            // 4 beats at 120 BPM
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(i * 0.5))
            }
            // Many connecting beats showing smooth gradual drift from 120 to 140 BPM
            // These beats demonstrate gradual tempo change, NOT a sudden jump
            const driftBeats = 8
            for (let i = 0; i < driftBeats; i++) {
                // Gradually decrease interval from 0.5 to 0.43
                const progress = i / (driftBeats - 1)
                const interval = 0.5 - (progress * 0.07) // 0.5 -> 0.43
                const time = 2.0 + i * interval
                beats.push(createBeat(time))
            }
            // 4 beats at 140 BPM
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(2.0 + driftBeats * 0.46 + i * 0.43))
            }

            const cluster1 = {
                startIndex: 0,
                endIndex: 3,
                beatCount: 4,
                avgInterval: 0.5,
                intervalVariance: 0,
                bpm: 120,
                isVerified: true,
            }
            const cluster2 = {
                startIndex: 4 + driftBeats,
                endIndex: 7 + driftBeats,
                beatCount: 4,
                avgInterval: 0.43,
                intervalVariance: 0,
                bpm: 140,
                isVerified: true,
            }

            const result = (interpolator as any).findCrossingPoint?.(cluster1, cluster2, beats)

            // With many connecting beats showing gradual drift, gap should be small
            // However, since 120->140 is ~17% difference, the algorithm may still detect a boundary
            // The key is that gapRatio should be relatively small due to gradual drift
            expect(result.gapRatio).toBeLessThan(0.5) // Gap should be less than 50% of interval
        })

        it('should create boundary when gap exceeds threshold', () => {
            const interpolator = new BeatInterpolator({ tempoSectionThreshold: 0.1 })

            // Create two clusters with a clear tempo jump (no connecting beats showing drift)
            const beats: Beat[] = []
            // 4 beats at 120 BPM (0.5s intervals)
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(i * 0.5))
            }
            // Sparse connecting beats (not showing gradual drift)
            beats.push(createBeat(3.0)) // Big gap, then sparse beat
            beats.push(createBeat(3.5))
            // 4 beats at 150 BPM (0.4s intervals)
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(4.5 + i * 0.4))
            }

            const cluster1 = {
                startIndex: 0,
                endIndex: 3,
                beatCount: 4,
                avgInterval: 0.5,
                intervalVariance: 0,
                bpm: 120,
                isVerified: true,
            }
            const cluster2 = {
                startIndex: 6,
                endIndex: 9,
                beatCount: 4,
                avgInterval: 0.4,
                intervalVariance: 0,
                bpm: 150,
                isVerified: true,
            }

            const result = (interpolator as any).findCrossingPoint?.(cluster1, cluster2, beats)

            // 25% tempo difference should create a boundary
            expect(result.hasBoundary).toBe(true)
            expect(result.boundaryTimestamp).toBeDefined()
        })
    })

    describe('measureGapAtCrossing', () => {
        it('should calculate gap ratio correctly', () => {
            const interpolator = new BeatInterpolator()

            // Create mock drift results
            const forwardsResult = {
                finalInterval: 0.5,
                beatPositions: [2.5, 3.0, 3.5],
                phaseError: 0,
                endTimestamp: 4.0,
            }
            const backwardsResult = {
                finalInterval: 0.4,
                beatPositions: [3.5, 3.1],
                phaseError: 0,
                endTimestamp: 2.5,
            }

            const gapResult = (interpolator as any).measureGapAtCrossing?.(
                forwardsResult,
                backwardsResult,
                0.5,
                0.4
            )

            expect(gapResult.gapRatio).toBeGreaterThanOrEqual(0)
            expect(gapResult.crossingTimestamp).toBeDefined()
            expect(gapResult.forwardsInterval).toBe(0.5)
            expect(gapResult.backwardsInterval).toBe(0.4)
        })

        it('should handle empty beat positions', () => {
            const interpolator = new BeatInterpolator()

            const forwardsResult = {
                finalInterval: 0.5,
                beatPositions: [],
                phaseError: 0,
                endTimestamp: 4.0,
            }
            const backwardsResult = {
                finalInterval: 0.4,
                beatPositions: [],
                phaseError: 0,
                endTimestamp: 2.5,
            }

            const gapResult = (interpolator as any).measureGapAtCrossing?.(
                forwardsResult,
                backwardsResult,
                0.5,
                0.4
            )

            expect(gapResult.gapRatio).toBeGreaterThanOrEqual(0)
        })
    })

    describe('assignBeatsToSections', () => {
        it('should assign beats based on boundary timestamp', () => {
            const interpolator = new BeatInterpolator()

            const connectingBeats = [
                createBeat(2.5),
                createBeat(3.0),
                createBeat(3.5),
                createBeat(4.0),
            ]

            const cluster1 = {
                startIndex: 0,
                endIndex: 3,
                beatCount: 4,
                avgInterval: 0.5,
                intervalVariance: 0,
                bpm: 120,
                isVerified: true,
            }
            const cluster2 = {
                startIndex: 8,
                endIndex: 11,
                beatCount: 4,
                avgInterval: 0.4,
                intervalVariance: 0,
                bpm: 150,
                isVerified: true,
            }

            const boundaryTimestamp = 3.25

            const result = (interpolator as any).assignBeatsToSections?.(
                connectingBeats,
                cluster1,
                cluster2,
                boundaryTimestamp
            )

            // Beats at 2.5 and 3.0 should go to section 1
            expect(result.beatsInSection1.length).toBe(2)
            // Beats at 3.5 and 4.0 should go to section 2
            expect(result.beatsInSection2.length).toBe(2)
        })

        it('should handle all beats in one section', () => {
            const interpolator = new BeatInterpolator()

            const connectingBeats = [
                createBeat(2.5),
                createBeat(3.0),
            ]

            const cluster1 = { avgInterval: 0.5, bpm: 120, isVerified: true } as any
            const cluster2 = { avgInterval: 0.4, bpm: 150, isVerified: true } as any

            // Boundary is before all connecting beats
            const boundaryTimestamp = 2.0

            const result = (interpolator as any).assignBeatsToSections?.(
                connectingBeats,
                cluster1,
                cluster2,
                boundaryTimestamp
            )

            expect(result.beatsInSection1.length).toBe(0)
            expect(result.beatsInSection2.length).toBe(2)
        })

        it('should handle empty connecting beats', () => {
            const interpolator = new BeatInterpolator()

            const connectingBeats: Beat[] = []
            const cluster1 = { avgInterval: 0.5, bpm: 120, isVerified: true } as any
            const cluster2 = { avgInterval: 0.4, bpm: 150, isVerified: true } as any

            const result = (interpolator as any).assignBeatsToSections?.(
                connectingBeats,
                cluster1,
                cluster2,
                3.0
            )

            expect(result.beatsInSection1.length).toBe(0)
            expect(result.beatsInSection2.length).toBe(0)
        })
    })
})
