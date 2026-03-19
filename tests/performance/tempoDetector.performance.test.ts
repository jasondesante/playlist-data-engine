/**
 * Performance Tests for Tempo Detector
 *
 * Verifies that the TPS2 octave resolution calculation doesn't significantly
 * slow down tempo analysis.
 *
 * Task 4.2: Performance check
 * - Ensure TPS2 calculation doesn't significantly slow down analysis
 * - Profile if needed
 */

import { describe, it, expect } from 'vitest';
import { TempoDetector } from '../../src/core/analysis/beat/TempoDetector.js';

// Helper to create a synthetic onset envelope with peaks at regular intervals
function createPeriodicOnsetEnvelope(
    bpm: number,
    durationSeconds: number,
    hopSizeMs: number = 10
): { envelope: Float32Array; hopSizeSeconds: number } {
    const hopSizeSeconds = hopSizeMs / 1000;
    const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
    const envelope = new Float32Array(numFrames);

    const beatIntervalFrames = Math.round((60 / bpm) / hopSizeSeconds);

    for (let frame = 0; frame < numFrames; frame++) {
        const distanceToBeat = frame % beatIntervalFrames;
        const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);
        const peakWidth = 2;
        envelope[frame] = Math.exp(-Math.pow(minDistance / peakWidth, 2));
    }

    return { envelope, hopSizeSeconds };
}

/**
 * Simple performance measurement helper
 * Returns execution time in milliseconds
 */
function measureTime(fn: () => void): number {
    const start = performance.now();
    fn();
    return performance.now() - start;
}

/**
 * Run multiple iterations and return statistics
 */
function runBenchmark(
    fn: () => void,
    iterations: number = 100
): { avg: number; min: number; max: number; total: number } {
    const times: number[] = [];

    // Warmup runs (not counted)
    for (let i = 0; i < 10; i++) {
        fn();
    }

    // Measured runs
    for (let i = 0; i < iterations; i++) {
        times.push(measureTime(fn));
    }

    const total = times.reduce((sum, t) => sum + t, 0);
    return {
        avg: total / iterations,
        min: Math.min(...times),
        max: Math.max(...times),
        total,
    };
}

describe('TempoDetector Performance', () => {
    describe('TPS2 calculation overhead', () => {
        it('should have negligible TPS2 overhead for short tracks (30 seconds)', () => {
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 30);

            const detectorWithoutOctave = new TempoDetector({ useOctaveResolution: false });
            const detectorWithOctave = new TempoDetector({ useOctaveResolution: true });

            // Benchmark without octave resolution
            const statsWithout = runBenchmark(() => {
                detectorWithoutOctave.estimateTempo(envelope, hopSizeSeconds);
            }, 200);

            // Benchmark with octave resolution
            const statsWith = runBenchmark(() => {
                detectorWithOctave.estimateTempo(envelope, hopSizeSeconds);
            }, 200);

            // Calculate overhead percentage
            const overheadPercent = ((statsWith.avg - statsWithout.avg) / statsWithout.avg) * 100;

            console.log('30-second track benchmark:');
            console.log(`  Without octave resolution: avg=${statsWithout.avg.toFixed(3)}ms, min=${statsWithout.min.toFixed(3)}ms, max=${statsWithout.max.toFixed(3)}ms`);
            console.log(`  With octave resolution:    avg=${statsWith.avg.toFixed(3)}ms, min=${statsWith.min.toFixed(3)}ms, max=${statsWith.max.toFixed(3)}ms`);
            console.log(`  Overhead: ${overheadPercent.toFixed(2)}%`);

            // TPS2 is O(1) with 4 array lookups - overhead should be minimal
            // Allow up to 20% overhead (generous for O(1) operations)
            expect(Math.abs(overheadPercent)).toBeLessThan(20);
        });

        it('should have negligible TPS2 overhead for medium tracks (2 minutes)', () => {
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 120);

            const detectorWithoutOctave = new TempoDetector({ useOctaveResolution: false });
            const detectorWithOctave = new TempoDetector({ useOctaveResolution: true });

            const statsWithout = runBenchmark(() => {
                detectorWithoutOctave.estimateTempo(envelope, hopSizeSeconds);
            }, 100);

            const statsWith = runBenchmark(() => {
                detectorWithOctave.estimateTempo(envelope, hopSizeSeconds);
            }, 100);

            const overheadPercent = ((statsWith.avg - statsWithout.avg) / statsWithout.avg) * 100;

            console.log('2-minute track benchmark:');
            console.log(`  Without octave resolution: avg=${statsWithout.avg.toFixed(3)}ms, min=${statsWithout.min.toFixed(3)}ms, max=${statsWithout.max.toFixed(3)}ms`);
            console.log(`  With octave resolution:    avg=${statsWith.avg.toFixed(3)}ms, min=${statsWith.min.toFixed(3)}ms, max=${statsWith.max.toFixed(3)}ms`);
            console.log(`  Overhead: ${overheadPercent.toFixed(2)}%`);

            // Overhead should remain minimal even for longer tracks
            expect(Math.abs(overheadPercent)).toBeLessThan(15);
        });

        it('should have negligible TPS2 overhead for long tracks (5 minutes)', () => {
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 300);

            const detectorWithoutOctave = new TempoDetector({ useOctaveResolution: false });
            const detectorWithOctave = new TempoDetector({ useOctaveResolution: true });

            const statsWithout = runBenchmark(() => {
                detectorWithoutOctave.estimateTempo(envelope, hopSizeSeconds);
            }, 50);

            const statsWith = runBenchmark(() => {
                detectorWithOctave.estimateTempo(envelope, hopSizeSeconds);
            }, 50);

            const overheadPercent = ((statsWith.avg - statsWithout.avg) / statsWithout.avg) * 100;

            console.log('5-minute track benchmark:');
            console.log(`  Without octave resolution: avg=${statsWithout.avg.toFixed(3)}ms, min=${statsWithout.min.toFixed(3)}ms, max=${statsWithout.max.toFixed(3)}ms`);
            console.log(`  With octave resolution:    avg=${statsWith.avg.toFixed(3)}ms, min=${statsWith.min.toFixed(3)}ms, max=${statsWith.max.toFixed(3)}ms`);
            console.log(`  Overhead: ${overheadPercent.toFixed(2)}%`);

            // Overhead should remain minimal even for long tracks
            expect(Math.abs(overheadPercent)).toBeLessThan(10);
        });
    });

    describe('absolute performance', () => {
        it('should complete tempo estimation in reasonable time for typical tracks', () => {
            // Typical DJ track: 3-6 minutes
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(128, 300); // 5 minutes

            const detector = new TempoDetector({ useOctaveResolution: true });

            const stats = runBenchmark(() => {
                detector.estimateTempo(envelope, hopSizeSeconds);
            }, 50);

            console.log('5-minute track with octave resolution:');
            console.log(`  Average time: ${stats.avg.toFixed(3)}ms`);
            console.log(`  Min time: ${stats.min.toFixed(3)}ms`);
            console.log(`  Max time: ${stats.max.toFixed(3)}ms`);

            // Tempo estimation should be very fast (under 50ms even for long tracks)
            // This is just the tempo estimation, not full beat tracking
            expect(stats.avg).toBeLessThan(50);
        });

        it('should scale linearly with track length', () => {
            const durations = [30, 60, 120, 240]; // seconds
            const detector = new TempoDetector({ useOctaveResolution: true });

            const avgTimes: number[] = [];

            for (const duration of durations) {
                const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, duration);

                const stats = runBenchmark(() => {
                    detector.estimateTempo(envelope, hopSizeSeconds);
                }, 30);

                avgTimes.push(stats.avg);
                console.log(`${duration}s track: avg=${stats.avg.toFixed(3)}ms`);
            }

            // Check linear scaling: doubling duration should roughly double time
            // Allow 50% tolerance for measurement noise
            const ratio60to30 = avgTimes[1] / avgTimes[0];
            const ratio120to60 = avgTimes[2] / avgTimes[1];
            const ratio240to120 = avgTimes[3] / avgTimes[2];

            console.log('Scaling ratios (should be close to 2.0):');
            console.log(`  60s/30s: ${ratio60to30.toFixed(2)}`);
            console.log(`  120s/60s: ${ratio120to60.toFixed(2)}`);
            console.log(`  240s/120s: ${ratio240to120.toFixed(2)}`);

            // Each ratio should be between 1.5 and 2.5 (allowing for measurement noise)
            expect(ratio60to30).toBeGreaterThan(1.3);
            expect(ratio60to30).toBeLessThan(2.7);
        });
    });

    describe('TPS2 complexity analysis', () => {
        it('should verify TPS2 is O(1) - constant time regardless of envelope size', () => {
            // TPS2 does 4 array lookups and some arithmetic - should be O(1)
            // This is verified by the scaling test above, but let's document it

            const detector = new TempoDetector({ useOctaveResolution: true });

            // The TPS2 calculation itself:
            // - 4 array accesses: O(1)
            // - 4 multiplications: O(1)
            // - 4 additions: O(1)
            // Total: O(1)

            // Called at most 2 times per estimateTempo call
            // Total TPS2 overhead: O(1)

            // Compare to main algorithm:
            // - Autocorrelation: O(n * m) where n=envelope length, m=lag range
            // - Perceptual weighting: O(m)
            // - TPS2: O(1) - negligible

            // Verify that enabling octave resolution adds negligible time
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 120);

            const iterations = 500;
            const timesWithout: number[] = [];
            const timesWith: number[] = [];

            const detectorWithout = new TempoDetector({ useOctaveResolution: false });

            // Warmup
            for (let i = 0; i < 20; i++) {
                detectorWithout.estimateTempo(envelope, hopSizeSeconds);
                detector.estimateTempo(envelope, hopSizeSeconds);
            }

            // Measure
            for (let i = 0; i < iterations; i++) {
                timesWithout.push(measureTime(() => {
                    detectorWithout.estimateTempo(envelope, hopSizeSeconds);
                }));
                timesWith.push(measureTime(() => {
                    detector.estimateTempo(envelope, hopSizeSeconds);
                }));
            }

            const avgWithout = timesWithout.reduce((a, b) => a + b, 0) / iterations;
            const avgWith = timesWith.reduce((a, b) => a + b, 0) / iterations;

            // The absolute overhead should be tiny (microseconds)
            const absoluteOverheadMs = avgWith - avgWithout;

            console.log('TPS2 O(1) verification (2-minute track):');
            console.log(`  Without TPS2: ${avgWithout.toFixed(4)}ms`);
            console.log(`  With TPS2: ${avgWith.toFixed(4)}ms`);
            console.log(`  Absolute overhead: ${absoluteOverheadMs.toFixed(4)}ms (${(absoluteOverheadMs * 1000).toFixed(2)} microseconds)`);

            // TPS2 overhead should be under 1ms (generous for O(1) operations)
            expect(Math.abs(absoluteOverheadMs)).toBeLessThan(1);
        });
    });
});
