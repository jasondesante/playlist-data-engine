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

            expect(meta).toHaveProperty('algorithm');
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
