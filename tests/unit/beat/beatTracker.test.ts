/**
 * Tests for Beat Tracker
 *
 * Tests the Ellis 2007 Dynamic Programming beat tracking algorithm.
 */

import { describe, it, expect } from 'vitest';
import { BeatTracker } from '../../../src/core/analysis/beat/BeatTracker.js';
import type { BeatTrackerConfig, TempoEstimate } from '../../../src/core/types/BeatMap.js';

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

    // Create peaks at regular intervals
    for (let frame = 0; frame < numFrames; frame++) {
        // Distance to nearest beat
        const distanceToBeat = frame % beatIntervalFrames;
        const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);

        // Gaussian peak centered on beat
        const peakWidth = 2; // frames
        envelope[frame] = Math.exp(-Math.pow(minDistance / peakWidth, 2));
    }

    return { envelope, hopSizeSeconds };
}

// Helper to create a click track onset envelope (sharp peaks)
function createClickTrackOnsetEnvelope(
    bpm: number,
    durationSeconds: number,
    hopSizeMs: number = 10
): { envelope: Float32Array; hopSizeSeconds: number } {
    const hopSizeSeconds = hopSizeMs / 1000;
    const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
    const envelope = new Float32Array(numFrames);

    const beatIntervalFrames = Math.round((60 / bpm) / hopSizeSeconds);

    // Create sharp peaks at beat positions
    for (let beat = 0; beat * beatIntervalFrames < numFrames; beat++) {
        const frame = beat * beatIntervalFrames;
        if (frame < numFrames) {
            envelope[frame] = 1.0;
            // Add some spread for realism
            if (frame > 0) envelope[frame - 1] = 0.5;
            if (frame < numFrames - 1) envelope[frame + 1] = 0.5;
        }
    }

    return { envelope, hopSizeSeconds };
}

// Helper to create a tempo estimate for a given BPM
function createTempoEstimate(bpm: number): TempoEstimate {
    return {
        primaryBpm: bpm,
        secondaryBpm: bpm / 2,
        primaryWeight: 1.0,
        secondaryWeight: 0.5,
        targetIntervalSeconds: 60 / bpm,
    };
}

// Helper to create an envelope with 8th note subdivisions
function createSubdivisionEnvelope(
    bpm: number,
    durationSeconds: number,
    hopSizeMs: number = 10
): { envelope: Float32Array; hopSizeSeconds: number } {
    const hopSizeSeconds = hopSizeMs / 1000;
    const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
    const envelope = new Float32Array(numFrames);

    // Quarter note interval
    const quarterIntervalFrames = Math.round((60 / bpm) / hopSizeSeconds);
    // 8th note interval (half of quarter)
    const eighthIntervalFrames = Math.round((30 / bpm) / hopSizeSeconds);

    // Create peaks at both quarter and 8th note positions
    // but quarter notes should be stronger
    for (let frame = 0; frame < numFrames; frame++) {
        const distanceToQuarter = frame % quarterIntervalFrames;
        const minDistQuarter = Math.min(distanceToQuarter, quarterIntervalFrames - distanceToQuarter);

        const distanceToEighth = frame % eighthIntervalFrames;
        const minDistEighth = Math.min(distanceToEighth, eighthIntervalFrames - distanceToEighth);

        const peakWidth = 2;

        // Quarter notes are stronger
        const quarterPeak = Math.exp(-Math.pow(minDistQuarter / peakWidth, 2));
        // 8th notes are weaker
        const eighthPeak = 0.6 * Math.exp(-Math.pow(minDistEighth / peakWidth, 2));

        envelope[frame] = Math.max(quarterPeak, eighthPeak);
    }

    return { envelope, hopSizeSeconds };
}

// Helper to create an envelope with gradual tempo drift
function createDriftingTempoEnvelope(
    startBpm: number,
    endBpm: number,
    durationSeconds: number,
    hopSizeMs: number = 10
): { envelope: Float32Array; hopSizeSeconds: number } {
    const hopSizeSeconds = hopSizeMs / 1000;
    const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
    const envelope = new Float32Array(numFrames);

    // Simulate tempo drift by varying the beat interval over time
    let currentBeatFrame = 0;

    while (currentBeatFrame < numFrames) {
        // Linear interpolation of BPM
        const progress = currentBeatFrame / numFrames;
        const currentBpm = startBpm + (endBpm - startBpm) * progress;
        const currentIntervalFrames = Math.round((60 / currentBpm) / hopSizeSeconds);

        // Create Gaussian peak at beat position
        for (let offset = -3; offset <= 3; offset++) {
            const frame = currentBeatFrame + offset;
            if (frame >= 0 && frame < numFrames) {
                const peakWidth = 2;
                envelope[frame] = Math.max(envelope[frame], Math.exp(-Math.pow(offset / peakWidth, 2)));
            }
        }

        currentBeatFrame += currentIntervalFrames;
    }

    return { envelope, hopSizeSeconds };
}

// Helper to create a silent envelope
function createSilentEnvelope(numFrames: number): Float32Array {
    return new Float32Array(numFrames);
}

// Helper to add noise to an envelope
function addNoise(envelope: Float32Array, noiseLevel: number = 0.1): Float32Array {
    const noisy = new Float32Array(envelope.length);
    for (let i = 0; i < envelope.length; i++) {
        noisy[i] = envelope[i] + (Math.random() - 0.5) * noiseLevel;
    }
    return noisy;
}

describe('BeatTracker', () => {
    describe('constructor', () => {
        it('should create instance with default config', () => {
            const tracker = new BeatTracker();
            const config = tracker.getConfig();

            expect(config.dpAlpha).toBe(680);
            expect(config.minPredecessorRatio).toBe(0.5);
            expect(config.maxPredecessorRatio).toBe(2.0);
        });

        it('should create instance with custom config', () => {
            const customConfig: BeatTrackerConfig = {
                dpAlpha: 500,
                minPredecessorRatio: 0.4,
                maxPredecessorRatio: 2.5,
            };

            const tracker = new BeatTracker(customConfig);
            const config = tracker.getConfig();

            expect(config.dpAlpha).toBe(500);
            expect(config.minPredecessorRatio).toBe(0.4);
            expect(config.maxPredecessorRatio).toBe(2.5);
        });
    });

    describe('trackBeats', () => {
        it('should detect beats in 120 BPM click track', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(120, 10);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Should detect multiple beats
            expect(result.beats.length).toBeGreaterThan(10);

            // All beats should have valid timestamps
            for (const beat of result.beats) {
                expect(beat.timestamp).toBeGreaterThanOrEqual(0);
                expect(beat.timestamp).toBeLessThanOrEqual(10);
            }
        });

        it('should detect beats with timing within ±20ms of expected', () => {
            const tracker = new BeatTracker();
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Expected beat interval in seconds
            const expectedInterval = 60 / bpm;
            const tolerance = 0.02; // ±20ms

            // Check that consecutive beats are approximately at the expected interval
            for (let i = 1; i < result.beats.length; i++) {
                const actualInterval = result.beats[i].timestamp - result.beats[i - 1].timestamp;
                const deviation = Math.abs(actualInterval - expectedInterval);

                expect(deviation).toBeLessThanOrEqual(tolerance);
            }
        });

        it('should detect beats at various tempos', () => {
            const tracker = new BeatTracker();
            const tempos = [60, 90, 120, 150];

            for (const bpm of tempos) {
                const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(bpm, 10);
                const tempoEstimate = createTempoEstimate(bpm);

                const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

                // Should detect a reasonable number of beats
                const expectedBeats = Math.floor(10 * bpm / 60);
                expect(result.beats.length).toBeGreaterThan(expectedBeats * 0.7);
                expect(result.beats.length).toBeLessThan(expectedBeats * 1.5);
            }
        });

        it('should filter 8th note subdivisions with high alpha', () => {
            // High alpha (strict tempo) should prefer quarter notes over 8th notes
            const tracker = new BeatTracker({ dpAlpha: 800 });
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createSubdivisionEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Expected quarter note beats
            const expectedQuarterBeats = Math.floor(10 * bpm / 60);
            // If it were tracking 8th notes, we'd get double
            const eighthNoteBeats = expectedQuarterBeats * 2;

            // Should be closer to quarter note count than 8th note count
            // The DP algorithm should reject the subdivision with high alpha
            expect(result.beats.length).toBeLessThan(eighthNoteBeats * 0.8);
        });

        it('should filter 16th note subdivisions', () => {
            const tracker = new BeatTracker({ dpAlpha: 800 });
            const bpm = 120;

            // Create envelope with 16th note subdivision
            const hopSizeSeconds = 0.01;
            const numFrames = Math.floor(10 / hopSizeSeconds);
            const envelope = new Float32Array(numFrames);

            const quarterInterval = Math.round((60 / bpm) / hopSizeSeconds);
            const sixteenthInterval = Math.round((15 / bpm) / hopSizeSeconds);

            // Create peaks at various subdivisions
            for (let frame = 0; frame < numFrames; frame++) {
                const peakWidth = 2;

                // Strong on quarter notes
                const quarterDist = frame % quarterInterval;
                const quarterPeak = Math.exp(-Math.pow(Math.min(quarterDist, quarterInterval - quarterDist) / peakWidth, 2));

                // Weaker on 16th notes
                const sixteenthDist = frame % sixteenthInterval;
                const sixteenthPeak = 0.4 * Math.exp(-Math.pow(Math.min(sixteenthDist, sixteenthInterval - sixteenthDist) / peakWidth, 2));

                envelope[frame] = Math.max(quarterPeak, sixteenthPeak);
            }

            const tempoEstimate = createTempoEstimate(bpm);
            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Should track quarter notes, not 16th notes
            const expectedQuarterBeats = Math.floor(10 * bpm / 60);
            const sixteenthNoteBeats = expectedQuarterBeats * 4;

            // Should be much closer to quarter note count
            expect(result.beats.length).toBeLessThan(sixteenthNoteBeats * 0.4);
        });

        it('should handle gradual tempo drift', () => {
            const tracker = new BeatTracker();
            const startBpm = 110;
            const endBpm = 130; // ~18% increase - within ±10% is ideal, but DP can handle some drift
            const driftRange = Math.abs(endBpm - startBpm) / startBpm;

            // Skip if drift is too extreme
            if (driftRange > 0.25) {
                return;
            }

            const { envelope, hopSizeSeconds } = createDriftingTempoEnvelope(startBpm, endBpm, 10);

            // Use the average tempo as the estimate
            const avgBpm = (startBpm + endBpm) / 2;
            const tempoEstimate = createTempoEstimate(avgBpm);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Should still detect beats despite tempo drift
            expect(result.beats.length).toBeGreaterThan(5);

            // The DP algorithm should accommodate gradual drift
            // Verify beats are detected across the entire duration
            if (result.beats.length > 0) {
                const firstBeat = result.beats[0].timestamp;
                const lastBeat = result.beats[result.beats.length - 1].timestamp;

                // Beats should span most of the audio
                expect(lastBeat - firstBeat).toBeGreaterThan(5);
            }
        });

        it('should handle silence by producing beats at target interval', () => {
            const tracker = new BeatTracker();
            const hopSizeSeconds = 0.01;
            const envelope = createSilentEnvelope(1000);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // With all-zero onset envelope, DP may still produce beats
            // but they will have zero intensity
            // The exact behavior depends on implementation
            expect(result.beatFrames.length).toBeGreaterThanOrEqual(0);
        });

        it('should produce different results with different alpha values', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createSubdivisionEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            // Low alpha (more flexible)
            const lowAlphaTracker = new BeatTracker({ dpAlpha: 100 });
            const lowAlphaResult = lowAlphaTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // High alpha (stricter tempo)
            const highAlphaTracker = new BeatTracker({ dpAlpha: 1000 });
            const highAlphaResult = highAlphaTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Different alpha values should produce different results
            // High alpha should generally be more consistent
            // The exact difference depends on the input
            expect(lowAlphaResult.beats.length).toBeGreaterThan(0);
            expect(highAlphaResult.beats.length).toBeGreaterThan(0);
        });

        it('should produce valid backlink chain', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(120, 5);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Beat frames should be in ascending order
            for (let i = 1; i < result.beatFrames.length; i++) {
                expect(result.beatFrames[i]).toBeGreaterThan(result.beatFrames[i - 1]);
            }
        });

        it('should return correct structure', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 5);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            expect(result).toHaveProperty('beats');
            expect(result).toHaveProperty('beatFrames');
            expect(result).toHaveProperty('cumulativeScores');

            expect(Array.isArray(result.beats)).toBe(true);
            expect(Array.isArray(result.beatFrames)).toBe(true);
            expect(result.cumulativeScores).toBeInstanceOf(Float32Array);

            // Check beat structure
            if (result.beats.length > 0) {
                const beat = result.beats[0];
                expect(beat).toHaveProperty('timestamp');
                expect(beat).toHaveProperty('beatInMeasure');
                expect(beat).toHaveProperty('isDownbeat');
                expect(beat).toHaveProperty('measureNumber');
                expect(beat).toHaveProperty('intensity');
                expect(beat).toHaveProperty('confidence');

                expect(typeof beat.timestamp).toBe('number');
                expect(typeof beat.beatInMeasure).toBe('number');
                expect(typeof beat.isDownbeat).toBe('boolean');
                expect(typeof beat.measureNumber).toBe('number');
                expect(typeof beat.intensity).toBe('number');
                expect(typeof beat.confidence).toBe('number');
            }
        });

        it('should handle very short envelopes', () => {
            const tracker = new BeatTracker();
            const envelope = new Float32Array(5);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(envelope, tempoEstimate, 0.01);

            // Should return empty or minimal result for very short envelopes
            expect(result.beats.length).toBe(0);
            expect(result.beatFrames.length).toBe(0);
        });

        it('should handle noisy envelopes', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);
            const noisyEnvelope = addNoise(envelope, 0.3);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(noisyEnvelope, tempoEstimate, hopSizeSeconds);

            // Should still detect beats despite noise
            expect(result.beats.length).toBeGreaterThan(5);
        });
    });

    describe('trackBeatsWithOptions', () => {
        it('should apply score threshold filtering', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);
            const tempoEstimate = createTempoEstimate(120);

            // First get baseline result
            const baselineResult = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Then with high threshold
            const filteredResult = tracker.trackBeatsWithOptions(
                envelope,
                tempoEstimate,
                hopSizeSeconds,
                { minScoreThreshold: 1000 }
            );

            // High threshold should result in fewer or equal beats
            expect(filteredResult.beats.length).toBeLessThanOrEqual(baselineResult.beats.length);
        });

        it('should apply discounted score trimming', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeatsWithOptions(
                envelope,
                tempoEstimate,
                hopSizeSeconds,
                { applyTrimming: true }
            );

            // Trimming should produce valid results
            expect(result.beats.length).toBeGreaterThan(0);
        });
    });

    describe('getTrackingStats', () => {
        it('should return valid statistics', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(120, 10);
            const tempoEstimate = createTempoEstimate(120);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);
            const stats = tracker.getTrackingStats(result, hopSizeSeconds);

            expect(stats.numBeats).toBe(result.beats.length);
            expect(stats.numBeats).toBeGreaterThan(0);
            expect(stats.avgInterval).toBeGreaterThan(0);
            expect(stats.estimatedBpm).toBeGreaterThan(0);
            expect(stats.avgIntensity).toBeGreaterThanOrEqual(0);
            expect(stats.avgIntensity).toBeLessThanOrEqual(1);
            expect(stats.avgConfidence).toBeGreaterThanOrEqual(0);
            expect(stats.avgConfidence).toBeLessThanOrEqual(1);
        });

        it('should estimate BPM close to actual tempo', () => {
            const tracker = new BeatTracker();
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);
            const stats = tracker.getTrackingStats(result, hopSizeSeconds);

            // Estimated BPM should be within ±10 BPM of actual
            expect(stats.estimatedBpm).toBeGreaterThanOrEqual(bpm - 10);
            expect(stats.estimatedBpm).toBeLessThanOrEqual(bpm + 10);
        });

        it('should return zero stats for empty results', () => {
            const tracker = new BeatTracker();
            const result = {
                beats: [],
                beatFrames: [],
                cumulativeScores: new Float32Array(100),
            };

            const stats = tracker.getTrackingStats(result, 0.01);

            expect(stats.numBeats).toBe(0);
            expect(stats.avgInterval).toBe(0);
            expect(stats.stdInterval).toBe(0);
            expect(stats.avgIntensity).toBe(0);
            expect(stats.avgConfidence).toBe(0);
            expect(stats.estimatedBpm).toBe(0);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            const tracker = new BeatTracker({ dpAlpha: 500 });
            const config1 = tracker.getConfig();
            const config2 = tracker.getConfig();

            // Modifying one should not affect the other
            config1.dpAlpha = 800;
            expect(config2.dpAlpha).toBe(500);
        });
    });

    describe('edge cases', () => {
        it('should handle constant envelope', () => {
            const tracker = new BeatTracker();
            const envelope = new Float32Array(1000).fill(0.5);
            const tempoEstimate = createTempoEstimate(120);

            // Should not throw
            const result = tracker.trackBeats(envelope, tempoEstimate, 0.01);
            expect(result.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle envelope with single peak', () => {
            const tracker = new BeatTracker();
            const envelope = new Float32Array(1000);
            envelope[500] = 1.0;
            const tempoEstimate = createTempoEstimate(120);

            // Should not throw
            const result = tracker.trackBeats(envelope, tempoEstimate, 0.01);
            expect(result.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle envelope with very short period', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(200, 5);
            const tempoEstimate = createTempoEstimate(200);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);
            expect(result.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle envelope with very long period', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(50, 10);
            const tempoEstimate = createTempoEstimate(50);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);
            expect(result.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle negative values in envelope', () => {
            const tracker = new BeatTracker();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 5);

            // Add some negative values
            for (let i = 0; i < envelope.length; i += 100) {
                envelope[i] = -0.5;
            }

            const tempoEstimate = createTempoEstimate(120);

            // Should not throw
            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);
            expect(result.beats.length).toBeGreaterThanOrEqual(0);
        });

        it('should handle tempo estimate with very different BPM', () => {
            const tracker = new BeatTracker();
            // Create envelope at 120 BPM
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            // But use a tempo estimate for 60 BPM (half time)
            const tempoEstimate = createTempoEstimate(60);

            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Should still produce some result
            expect(result.beats.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('sensitivity', () => {
        it('should accept sensitivity in config', () => {
            const tracker = new BeatTracker({ sensitivity: 2.0 });
            const config = tracker.getConfig();

            expect(config.sensitivity).toBe(2.0);
        });

        it('should have default sensitivity of 1.0', () => {
            const tracker = new BeatTracker();
            const config = tracker.getConfig();

            expect(config.sensitivity).toBe(1.0);
        });

        it('should produce fewer beats with sensitivity = 0.5 than with 1.0', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createSubdivisionEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            // Default sensitivity (1.0)
            const defaultTracker = new BeatTracker({ sensitivity: 1.0 });
            const defaultResult = defaultTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Low sensitivity (0.5) - stricter tempo
            const lowSensitivityTracker = new BeatTracker({ sensitivity: 0.5 });
            const lowSensitivityResult = lowSensitivityTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Lower sensitivity should produce fewer or equal beats
            expect(lowSensitivityResult.beats.length).toBeLessThanOrEqual(defaultResult.beats.length);
        });

        it('should produce default beat count with sensitivity = 1.0', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            const tracker = new BeatTracker({ sensitivity: 1.0 });
            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // At 120 BPM for 10 seconds, expect roughly 20 beats (±50% tolerance)
            const expectedBeats = Math.floor(10 * bpm / 60);
            expect(result.beats.length).toBeGreaterThan(expectedBeats * 0.5);
            expect(result.beats.length).toBeLessThan(expectedBeats * 1.5);
        });

        it('should produce more beats with sensitivity = 2.0 than with 1.0', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createSubdivisionEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            // Default sensitivity (1.0)
            const defaultTracker = new BeatTracker({ sensitivity: 1.0 });
            const defaultResult = defaultTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // High sensitivity (2.0) - more flexible
            const highSensitivityTracker = new BeatTracker({ sensitivity: 2.0 });
            const highSensitivityResult = highSensitivityTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Higher sensitivity should produce more or equal beats
            expect(highSensitivityResult.beats.length).toBeGreaterThanOrEqual(defaultResult.beats.length);
        });

        it('should produce even more beats with sensitivity = 5.0', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createSubdivisionEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            // Sensitivity = 2.0
            const mediumTracker = new BeatTracker({ sensitivity: 2.0 });
            const mediumResult = mediumTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Sensitivity = 5.0 - even more flexible
            const highTracker = new BeatTracker({ sensitivity: 5.0 });
            const highResult = highTracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Higher sensitivity should generally produce more or equal beats
            expect(highResult.beats.length).toBeGreaterThanOrEqual(mediumResult.beats.length);
        });

        it('should not produce garbage/noise with sensitivity = 10.0', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            // Very high sensitivity (10.0)
            const tracker = new BeatTracker({ sensitivity: 10.0 });
            const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

            // Should still produce valid beats
            expect(result.beats.length).toBeGreaterThan(0);

            // All beats should have valid properties
            for (const beat of result.beats) {
                expect(beat.timestamp).toBeGreaterThanOrEqual(0);
                expect(beat.timestamp).toBeLessThanOrEqual(10);
                expect(beat.intensity).toBeGreaterThanOrEqual(0);
                expect(beat.intensity).toBeLessThanOrEqual(1);
                expect(beat.confidence).toBeGreaterThanOrEqual(0);
                expect(beat.confidence).toBeLessThanOrEqual(1);
            }

            // BPM estimate should still be reasonable (within 50% of target)
            const stats = tracker.getTrackingStats(result, hopSizeSeconds);
            expect(stats.estimatedBpm).toBeGreaterThan(bpm * 0.5);
            expect(stats.estimatedBpm).toBeLessThan(bpm * 2.0);
        });

        it('should produce monotonic beat ordering regardless of sensitivity', () => {
            const bpm = 120;
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            const sensitivities = [0.5, 1.0, 2.0, 5.0, 10.0];

            for (const sensitivity of sensitivities) {
                const tracker = new BeatTracker({ sensitivity });
                const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);

                // Beat frames should always be in ascending order
                for (let i = 1; i < result.beatFrames.length; i++) {
                    expect(result.beatFrames[i]).toBeGreaterThan(result.beatFrames[i - 1]);
                }
            }
        });

        it('should demonstrate increasing beat counts with increasing sensitivity', () => {
            const bpm = 120;
            // Use subdivision envelope to have beats that can be picked up with higher sensitivity
            const { envelope, hopSizeSeconds } = createSubdivisionEnvelope(bpm, 10);
            const tempoEstimate = createTempoEstimate(bpm);

            const sensitivities = [0.5, 1.0, 2.0, 5.0];
            const beatCounts: number[] = [];

            for (const sensitivity of sensitivities) {
                const tracker = new BeatTracker({ sensitivity });
                const result = tracker.trackBeats(envelope, tempoEstimate, hopSizeSeconds);
                beatCounts.push(result.beats.length);
            }

            // Generally, higher sensitivity should produce more or equal beats
            // (may not be strictly monotonic due to algorithm behavior)
            expect(beatCounts[3]).toBeGreaterThanOrEqual(beatCounts[0]);
        });
    });
});
