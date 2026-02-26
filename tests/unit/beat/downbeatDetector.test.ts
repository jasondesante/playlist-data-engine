/**
 * Tests for Downbeat Detector
 *
 * Tests the downbeat detection algorithm for identifying measure boundaries.
 */

import { describe, it, expect } from 'vitest';
import { DownbeatDetector } from '../../../src/core/analysis/beat/DownbeatDetector.js';
import type { Beat, TempoEstimate, DownbeatDetectorConfig } from '../../../src/core/types/BeatMap.js';

// Helper to create beats with specified intensities
function createBeatsWithIntensities(
    intensities: number[],
    duration: number = 10
): Beat[] {
    const interval = duration / intensities.length;

    return intensities.map((intensity, index) => ({
        timestamp: index * interval,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity,
        confidence: 0.8,
    }));
}

// Helper to create beats with a regular intensity pattern
function createBeatsWithPattern(
    pattern: number[],
    numMeasures: number,
    beatsPerMeasure: number
): Beat[] {
    const intensities: number[] = [];

    for (let measure = 0; measure < numMeasures; measure++) {
        for (let beat = 0; beat < beatsPerMeasure; beat++) {
            intensities.push(pattern[beat % pattern.length]);
        }
    }

    return createBeatsWithIntensities(intensities);
}

// Helper to create a duple tempo estimate
function createDupleTempoEstimate(): TempoEstimate {
    return {
        primaryBpm: 120,
        secondaryBpm: 60,
        primaryWeight: 1.0,
        secondaryWeight: 0.5,
        isDuple: true,
        targetIntervalSeconds: 0.5,
    };
}

// Helper to create a triple tempo estimate
function createTripleTempoEstimate(): TempoEstimate {
    return {
        primaryBpm: 120,
        secondaryBpm: 40,
        primaryWeight: 1.0,
        secondaryWeight: 0.5,
        isDuple: false,
        targetIntervalSeconds: 0.5,
    };
}

// Helper to add noise to beat intensities
function addNoise(beats: Beat[], noiseLevel: number = 0.1): Beat[] {
    return beats.map(beat => ({
        ...beat,
        intensity: Math.max(0, Math.min(1, beat.intensity + (Math.random() - 0.5) * noiseLevel)),
    }));
}

describe('DownbeatDetector', () => {
    describe('constructor', () => {
        it('should create instance with default config', () => {
            const detector = new DownbeatDetector();
            const config = detector.getConfig();

            expect(config.measureLengths).toEqual([2, 3, 4, 6]);
            expect(config.minIntensityDifference).toBe(0.1);
            expect(config.patternWeight).toBe(0.5);
        });

        it('should create instance with custom config', () => {
            const customConfig: DownbeatDetectorConfig = {
                measureLengths: [3, 4],
                minIntensityDifference: 0.2,
                patternWeight: 0.7,
            };

            const detector = new DownbeatDetector(customConfig);
            const config = detector.getConfig();

            expect(config.measureLengths).toEqual([3, 4]);
            expect(config.minIntensityDifference).toBe(0.2);
            expect(config.patternWeight).toBe(0.7);
        });
    });

    describe('detectDownbeats', () => {
        it('should detect 4/4 meter with strong-weak-weak-weak pattern', () => {
            const detector = new DownbeatDetector();
            // Strong-weak-weak-weak pattern
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(result.beatsPerMeasure).toBe(4);
            expect(result.confidence).toBeGreaterThan(0.5);
        });

        it('should detect 3/4 waltz pattern', () => {
            const detector = new DownbeatDetector();
            // Strong-weak-weak waltz pattern
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3], 8, 3);
            const tempoEstimate = createTripleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(result.beatsPerMeasure).toBe(3);
        });

        it('should detect 6/8 compound meter pattern', () => {
            const detector = new DownbeatDetector();
            // Strong-weak-weak-Strong-weak-weak pattern (6/8)
            const beats = createBeatsWithPattern([1.0, 0.2, 0.2, 0.6, 0.2, 0.2], 4, 6);
            const tempoEstimate = createTripleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should detect 6 beats per measure
            expect(result.beatsPerMeasure).toBe(6);
        });

        it('should label downbeats correctly', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 4, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Check that every 4th beat is a downbeat
            const downbeats = result.beats.filter(b => b.isDownbeat);
            expect(downbeats.length).toBe(4);

            for (const downbeat of downbeats) {
                expect(downbeat.beatInMeasure).toBe(0);
            }
        });

        it('should assign correct measure numbers', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 4, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Check measure numbers
            for (let i = 0; i < result.beats.length; i++) {
                const expectedMeasure = Math.floor(i / 4);
                expect(result.beats[i].measureNumber).toBe(expectedMeasure);
            }
        });

        it('should assign correct beatInMeasure values', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 4, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Check beat positions
            for (let i = 0; i < result.beats.length; i++) {
                expect(result.beats[i].beatInMeasure).toBe(i % 4);
            }
        });

        it('should handle songs starting mid-measure', () => {
            const detector = new DownbeatDetector();
            // Create pattern that starts with weak beat
            const intensities = [0.3, 0.3, 0.3, 1.0, 0.3, 0.3, 0.3, 1.0];
            const beats = createBeatsWithIntensities(intensities);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should still detect 4/4
            expect(result.beatsPerMeasure).toBe(4);

            // Phase offset should account for the weak start
            // The downbeat should be at beat 3 (the first strong beat)
            const firstDownbeat = result.beats.findIndex(b => b.isDownbeat);
            expect(firstDownbeat).toBeGreaterThanOrEqual(0);
        });

        it('should handle uniform intensity (fallback)', () => {
            const detector = new DownbeatDetector();
            // All beats have same intensity
            const beats = createBeatsWithPattern([0.5, 0.5, 0.5, 0.5], 4, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should still produce a result (defaults to 4/4)
            expect(result.beatsPerMeasure).toBeGreaterThanOrEqual(2);
            expect(result.confidence).toBeLessThan(0.8); // Low confidence expected
        });

        it('should handle noisy patterns', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const noisyBeats = addNoise(beats, 0.2);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(noisyBeats, tempoEstimate);

            // Should still detect 4/4 despite noise
            expect(result.beatsPerMeasure).toBe(4);
        });

        it('should handle very short sequences', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithIntensities([1.0, 0.3]);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should fall back to defaults
            expect(result.beatsPerMeasure).toBe(4);
            expect(result.confidence).toBe(0.5);
        });

        it('should handle empty input', () => {
            const detector = new DownbeatDetector();
            const beats: Beat[] = [];
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(result.beats).toEqual([]);
            expect(result.beatsPerMeasure).toBe(4);
        });

        it('should return measure length scores', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should have scores for all candidate measure lengths
            expect(result.measureLengthScores.size).toBeGreaterThan(0);
            expect(result.measureLengthScores.has(4)).toBe(true);
        });

        it('should return detection method', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(['pattern', 'autocorrelation', 'combined']).toContain(result.method);
        });

        it('should return phase offset', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(result.phaseOffset).toBeGreaterThanOrEqual(0);
            expect(result.phaseOffset).toBeLessThan(result.beatsPerMeasure);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            const detector = new DownbeatDetector({ patternWeight: 0.7 });
            const config1 = detector.getConfig();
            const config2 = detector.getConfig();

            // Modifying one should not affect the other
            config1.patternWeight = 0.3;
            expect(config2.patternWeight).toBe(0.7);
        });
    });

    describe('getPatternStats', () => {
        it('should return correct statistics', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 4, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);
            const stats = detector.getPatternStats(result);

            expect(stats.numDownbeats).toBe(4);
            expect(stats.numMeasures).toBe(4);
            expect(stats.avgDownbeatIntensity).toBeGreaterThan(stats.avgNonDownbeatIntensity);
            expect(stats.intensityRatio).toBeGreaterThan(1);
        });

        it('should handle empty result', () => {
            const detector = new DownbeatDetector();
            const result = detector.detectDownbeats([], createDupleTempoEstimate());
            const stats = detector.getPatternStats(result);

            expect(stats.numDownbeats).toBe(0);
            expect(stats.numMeasures).toBe(0);
            expect(stats.avgDownbeatIntensity).toBe(0);
            expect(stats.intensityRatio).toBe(1);
        });
    });

    describe('edge cases', () => {
        it('should handle single beat', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithIntensities([1.0]);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should fall back to default
            expect(result.beatsPerMeasure).toBe(4);
            expect(result.beats.length).toBe(1);
        });

        it('should handle 2/4 meter', () => {
            const detector = new DownbeatDetector();
            // Strong-weak pattern
            const beats = createBeatsWithPattern([1.0, 0.3], 8, 2);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should detect 2 beats per measure
            expect(result.beatsPerMeasure).toBe(2);
        });

        it('should respect custom measure lengths', () => {
            const detector = new DownbeatDetector({
                measureLengths: [3, 6],
            });
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3], 8, 3);
            const tempoEstimate = createTripleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should only consider 3 or 6
            expect([3, 6]).toContain(result.beatsPerMeasure);
        });

        it('should work with pattern weight favoring autocorrelation', () => {
            const detector = new DownbeatDetector({
                patternWeight: 0.2, // Favor autocorrelation
            });
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(result.method).toBe('autocorrelation');
            expect(result.beatsPerMeasure).toBe(4);
        });

        it('should work with pattern weight favoring pattern analysis', () => {
            const detector = new DownbeatDetector({
                patternWeight: 0.8, // Favor pattern
            });
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 8, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            expect(result.method).toBe('pattern');
            expect(result.beatsPerMeasure).toBe(4);
        });

        it('should use tempo meter hint for triple meter', () => {
            const detector = new DownbeatDetector();
            // Create pattern that could be 3 or 6
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3], 8, 3);
            const tempoEstimate = createTripleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Should prefer 3 for triple meter
            expect(result.beatsPerMeasure).toBe(3);
        });

        it('should preserve original beat properties', () => {
            const detector = new DownbeatDetector();
            const beats = createBeatsWithPattern([1.0, 0.3, 0.3, 0.3], 4, 4);
            const tempoEstimate = createDupleTempoEstimate();

            const result = detector.detectDownbeats(beats, tempoEstimate);

            // Original properties should be preserved
            for (let i = 0; i < result.beats.length; i++) {
                expect(result.beats[i].timestamp).toBe(beats[i].timestamp);
                expect(result.beats[i].intensity).toBeCloseTo(beats[i].intensity);
            }
        });
    });
});
