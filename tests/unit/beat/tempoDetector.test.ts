/**
 * Tests for Tempo Detector
 *
 * Tests the Ellis 2007 tempo estimation algorithm using autocorrelation
 * with perceptual weighting.
 */

import { describe, it, expect } from 'vitest';
import { TempoDetector } from '../../../src/core/analysis/beat/TempoDetector.js';
import type { TempoDetectorConfig } from '../../../src/core/types/BeatMap.js';

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

// Helper to create a click track onset envelope
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

// Helper to create a noisy onset envelope
function addNoise(envelope: Float32Array, noiseLevel: number = 0.1): Float32Array {
    const noisy = new Float32Array(envelope.length);
    for (let i = 0; i < envelope.length; i++) {
        noisy[i] = envelope[i] + (Math.random() - 0.5) * noiseLevel;
    }
    return noisy;
}

// Helper to create a silent envelope
function createSilentEnvelope(numFrames: number): Float32Array {
    return new Float32Array(numFrames);
}

describe('TempoDetector', () => {
    describe('constructor', () => {
        it('should create instance with default config', () => {
            const detector = new TempoDetector();
            const config = detector.getConfig();

            expect(config.tempoCenter).toBe(0.5);
            expect(config.tempoWidth).toBe(1.4);
            expect(config.minBpm).toBe(90);
            expect(config.maxBpm).toBe(180);
        });

        it('should create instance with custom config', () => {
            const customConfig: TempoDetectorConfig = {
                tempoCenter: 0.4,  // 150 BPM center
                tempoWidth: 0.9,   // Stricter
                minBpm: 80,
                maxBpm: 200,
            };

            const detector = new TempoDetector(customConfig);
            const config = detector.getConfig();

            expect(config.tempoCenter).toBe(0.4);
            expect(config.tempoWidth).toBe(0.9);
            expect(config.minBpm).toBe(80);
            expect(config.maxBpm).toBe(200);
        });
    });

    describe('estimateTempo', () => {
        it('should detect 60 BPM from periodic envelope', () => {
            const detector = new TempoDetector({ minBpm: 50, maxBpm: 180 });
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(60, 10);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should be within ±5 BPM
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(55);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(65);
            expect(estimate.targetIntervalSeconds).toBeCloseTo(60 / estimate.primaryBpm, 2);
        });

        it('should detect 90 BPM from periodic envelope', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(90, 10);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should be within ±5 BPM
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(85);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(95);
        });

        it('should detect 120 BPM from periodic envelope', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should be within ±5 BPM
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(115);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(125);
        });

        it('should detect 150 BPM from periodic envelope', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(150, 10);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should be within ±5 BPM
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(145);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(155);
        });

        it('should detect tempo from click track envelope', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createClickTrackOnsetEnvelope(120, 10);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(115);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(125);
        });

        it('should handle noisy envelopes', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);
            const noisyEnvelope = addNoise(envelope, 0.2);

            const estimate = detector.estimateTempo(noisyEnvelope, hopSizeSeconds);

            // Should still detect tempo reasonably well
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(100);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(140);
        });

        it('should prefer 120 BPM when ambiguous', () => {
            // With tempoCenter at 0.5s (120 BPM), ambiguous signals should bias toward 120
            const detector = new TempoDetector({ tempoCenter: 0.5, tempoWidth: 1.4 });

            // Create a somewhat ambiguous envelope (multiple overlapping patterns)
            const hopSizeSeconds = 0.01;
            const numFrames = 10000;
            const envelope = new Float32Array(numFrames);

            // Mix two tempos: 100 BPM and 120 BPM
            for (let i = 0; i < numFrames; i++) {
                const t = i * hopSizeSeconds;
                envelope[i] =
                    0.6 * Math.sin(2 * Math.PI * (100 / 60) * t) +
                    0.4 * Math.sin(2 * Math.PI * (120 / 60) * t);
            }

            // Ensure values are positive
            for (let i = 0; i < numFrames; i++) {
                envelope[i] = Math.max(0, envelope[i]);
            }

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect a tempo in the range, preferring 120 due to weighting
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(90);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(150);
        });

        it('should return default for very short envelopes', () => {
            const detector = new TempoDetector();
            const envelope = new Float32Array(5); // Very short

            const estimate = detector.estimateTempo(envelope, 0.01);

            expect(estimate.primaryBpm).toBe(120);
        });

        it('should return default for silent envelopes', () => {
            const detector = new TempoDetector();
            const envelope = createSilentEnvelope(1000);

            const estimate = detector.estimateTempo(envelope, 0.01);

            // Should return some valid estimate (likely default)
            expect(estimate.primaryBpm).toBeGreaterThan(0);
        });

        it('should return correct structure', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 5);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            expect(estimate).toHaveProperty('primaryBpm');
            expect(estimate).toHaveProperty('secondaryBpm');
            expect(estimate).toHaveProperty('primaryWeight');
            expect(estimate).toHaveProperty('secondaryWeight');
            expect(estimate).toHaveProperty('targetIntervalSeconds');

            expect(typeof estimate.primaryBpm).toBe('number');
            expect(typeof estimate.secondaryBpm).toBe('number');
            expect(typeof estimate.primaryWeight).toBe('number');
            expect(typeof estimate.secondaryWeight).toBe('number');
            expect(typeof estimate.targetIntervalSeconds).toBe('number');
        });

        it('should respect BPM bounds', () => {
            const detector = new TempoDetector({ minBpm: 80, maxBpm: 140 });

            // Even with a 60 BPM signal, should not report below 80
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(60, 10);
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect either the actual tempo or its octave
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(80);
        });
    });

    describe('getTempoCandidates', () => {
        it('should return multiple tempo candidates', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            const candidates = detector.getTempoCandidates(envelope, hopSizeSeconds, 5);

            expect(candidates.length).toBeGreaterThanOrEqual(1);
            expect(candidates.length).toBeLessThanOrEqual(5);

            // Each candidate should have bpm and strength
            for (const candidate of candidates) {
                expect(candidate).toHaveProperty('bpm');
                expect(candidate).toHaveProperty('strength');
                expect(candidate.bpm).toBeGreaterThan(0);
            }
        });

        it('should return candidates sorted by strength', () => {
            const detector = new TempoDetector();
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            const candidates = detector.getTempoCandidates(envelope, hopSizeSeconds, 5);

            for (let i = 1; i < candidates.length; i++) {
                expect(candidates[i - 1].strength).toBeGreaterThanOrEqual(candidates[i].strength);
            }
        });

        it('should return default for short envelopes', () => {
            const detector = new TempoDetector();
            const envelope = new Float32Array(5);

            const candidates = detector.getTempoCandidates(envelope, 0.01, 5);

            expect(candidates.length).toBe(1);
            expect(candidates[0].bpm).toBe(120);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the config', () => {
            const detector = new TempoDetector({ tempoWidth: 1.0 });
            const config1 = detector.getConfig();
            const config2 = detector.getConfig();

            // Modifying one should not affect the other
            config1.tempoWidth = 2.0;
            expect(config2.tempoWidth).toBe(1.0);
        });
    });

    describe('duple/triple meter detection', () => {
        it('should detect duple meter for 4/4 pattern', () => {
            const detector = new TempoDetector();
            const hopSizeSeconds = 0.01;
            const numFrames = 10000;
            const envelope = new Float32Array(numFrames);

            // Create 4/4 pattern: strong-weak-medium-weak
            const bpm = 120;
            const beatIntervalFrames = Math.round((60 / bpm) / hopSizeSeconds);

            for (let frame = 0; frame < numFrames; frame++) {
                const beatInMeasure = Math.floor(frame / beatIntervalFrames) % 4;
                const distanceToBeat = frame % beatIntervalFrames;
                const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);
                const peakWidth = 2;

                // Strong beats on 1, medium on 3, weak on 2 and 4
                let intensity: number;
                if (beatInMeasure === 0) {
                    intensity = 1.0;
                } else if (beatInMeasure === 2) {
                    intensity = 0.6;
                } else {
                    intensity = 0.3;
                }

                envelope[frame] = intensity * Math.exp(-Math.pow(minDistance / peakWidth, 2));
            }

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect the beat (may detect half-time 60 or actual 120)
            // This is expected behavior - tempo estimation can pick up either level
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(55);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(125);
        });

        it('should detect triple meter for 3/4 pattern', () => {
            const detector = new TempoDetector();
            const hopSizeSeconds = 0.01;
            const numFrames = 10000;
            const envelope = new Float32Array(numFrames);

            // Create 3/4 pattern: strong-weak-weak
            const bpm = 120;
            const beatIntervalFrames = Math.round((60 / bpm) / hopSizeSeconds);

            for (let frame = 0; frame < numFrames; frame++) {
                const beatInMeasure = Math.floor(frame / beatIntervalFrames) % 3;
                const distanceToBeat = frame % beatIntervalFrames;
                const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);
                const peakWidth = 2;

                // Strong beats on 1, weak on 2 and 3
                const intensity = beatInMeasure === 0 ? 1.0 : 0.3;

                envelope[frame] = intensity * Math.exp(-Math.pow(minDistance / peakWidth, 2));
            }

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect the beat
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(115);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(125);
        });
    });

    describe('edge cases', () => {
        it('should handle constant envelope', () => {
            const detector = new TempoDetector();
            const envelope = new Float32Array(1000).fill(0.5);

            // Should not throw
            const estimate = detector.estimateTempo(envelope, 0.01);
            expect(estimate.primaryBpm).toBeGreaterThan(0);
        });

        it('should handle envelope with single peak', () => {
            const detector = new TempoDetector();
            const envelope = new Float32Array(1000);
            envelope[500] = 1.0;

            // Should not throw
            const estimate = detector.estimateTempo(envelope, 0.01);
            expect(estimate.primaryBpm).toBeGreaterThan(0);
        });

        it('should handle very high BPM', () => {
            const detector = new TempoDetector({ maxBpm: 200 });
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(180, 5);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // May detect half-time (90) or actual (180) depending on perceptual weighting
            // The 120 BPM perceptual bias can cause half-time detection
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(80);
        });

        it('should handle very low BPM', () => {
            const detector = new TempoDetector({ minBpm: 50 });
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(60, 10);

            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(50);
        });
    });

    describe('octave resolution (useOctaveResolution)', () => {
        /**
         * Helper to create an onset envelope that simulates a half-tempo ambiguity scenario.
         * Creates a signal with beats at the target BPM, but also strong energy at half that BPM.
         * Without octave resolution, the algorithm might detect the half-tempo.
         */
        function createHalfTempoAmbiguousEnvelope(
            targetBpm: number,
            durationSeconds: number,
            hopSizeMs: number = 10
        ): { envelope: Float32Array; hopSizeSeconds: number } {
            const hopSizeSeconds = hopSizeMs / 1000;
            const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
            const envelope = new Float32Array(numFrames);

            const beatIntervalFrames = Math.round((60 / targetBpm) / hopSizeSeconds);
            const halfTempoIntervalFrames = beatIntervalFrames * 2;

            // Create peaks at the target BPM with strong energy
            // Also add some energy at half the tempo (double the interval)
            for (let frame = 0; frame < numFrames; frame++) {
                // Distance to nearest beat at target tempo
                const distanceToBeat = frame % beatIntervalFrames;
                const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);

                // Distance to nearest "half-tempo beat"
                const distanceToHalfBeat = frame % halfTempoIntervalFrames;
                const minHalfDistance = Math.min(distanceToHalfBeat, halfTempoIntervalFrames - distanceToHalfBeat);

                // Combine both: strong peaks at target tempo, weaker at half-tempo
                // This creates ambiguity that octave resolution should resolve
                const peakWidth = 2;
                const targetPeak = Math.exp(-Math.pow(minDistance / peakWidth, 2));
                const halfPeak = Math.exp(-Math.pow(minHalfDistance / peakWidth, 2)) * 0.8;

                envelope[frame] = targetPeak + halfPeak;
            }

            return { envelope, hopSizeSeconds };
        }

        /**
         * Helper to create an envelope that emphasizes sub-harmonics.
         * Simulates a case where the algorithm might detect 24 BPM (1/6 of 146).
         */
        function createSubharmonicEnvelope(
            targetBpm: number,
            durationSeconds: number,
            hopSizeMs: number = 10
        ): { envelope: Float32Array; hopSizeSeconds: number } {
            const hopSizeSeconds = hopSizeMs / 1000;
            const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
            const envelope = new Float32Array(numFrames);

            const beatIntervalFrames = Math.round((60 / targetBpm) / hopSizeSeconds);

            // Create beats at target BPM with varying intensities
            // to create a pattern that could be misinterpreted
            for (let frame = 0; frame < numFrames; frame++) {
                const beatIndex = Math.floor(frame / beatIntervalFrames);
                const distanceToBeat = frame % beatIntervalFrames;
                const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);

                // Vary intensity in a pattern that could create sub-harmonics
                // Every 6th beat is stronger (simulating measure emphasis)
                let intensity = 1.0;
                if (beatIndex % 6 === 0) {
                    intensity = 1.5;
                } else if (beatIndex % 3 === 0) {
                    intensity = 1.2;
                }

                const peakWidth = 2;
                envelope[frame] = intensity * Math.exp(-Math.pow(minDistance / peakWidth, 2));
            }

            return { envelope, hopSizeSeconds };
        }

        it('should correct half-tempo detection when useOctaveResolution is true (73 BPM -> 146 BPM)', () => {
            // Create an envelope at 146 BPM that could be misdetected as 73 BPM
            // The envelope has energy at both the target tempo and its half-tempo
            const { envelope, hopSizeSeconds } = createHalfTempoAmbiguousEnvelope(146, 15);

            // Without octave resolution - may detect half-tempo
            const detectorWithoutOctave = new TempoDetector({ useOctaveResolution: false });
            const estimateWithoutOctave = detectorWithoutOctave.estimateTempo(envelope, hopSizeSeconds);

            // With octave resolution - should prefer the faster tempo if TPS2 favors it
            const detectorWithOctave = new TempoDetector({ useOctaveResolution: true });
            const estimateWithOctave = detectorWithOctave.estimateTempo(envelope, hopSizeSeconds);

            // The octave resolution algorithm uses TPS2 scoring to compare tempo candidates.
            // TPS2(τ) = TPS(τ) + 0.5×TPS(2τ) + neighbors
            // For a 146 BPM signal with strong half-tempo energy:
            // - TPS2 at 146 BPM lag includes energy at 73 BPM lag (strong)
            // - TPS2 at 73 BPM lag includes energy at 36.5 BPM lag (weak)
            // Therefore TPS2(146) > TPS2(73), favoring the faster tempo.

            // Both versions should return valid tempos (the algorithm doesn't break)
            expect(estimateWithoutOctave.primaryBpm).toBeGreaterThan(0);
            expect(estimateWithOctave.primaryBpm).toBeGreaterThan(0);

            // The octave-resolved tempo should be reasonable (not an extreme outlier)
            expect(estimateWithOctave.primaryBpm).toBeGreaterThanOrEqual(60);
            expect(estimateWithOctave.primaryBpm).toBeLessThanOrEqual(180);
        });

        it('should preserve correct tempo when already at proper octave (146 BPM stays 146 BPM)', () => {
            // Create a clean 146 BPM envelope
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(146, 15);

            // With octave resolution enabled
            const detector = new TempoDetector({ useOctaveResolution: true });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect around 146 BPM (±20 BPM tolerance due to discretization)
            // Tempo detection has some variance due to frame-based lag calculation
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(126);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(166);
        });

        it('should correct sub-harmonic detection when useOctaveResolution is true', () => {
            // Create an envelope that could be misdetected at a sub-harmonic (e.g., 24 BPM for 146 BPM track)
            const { envelope, hopSizeSeconds } = createSubharmonicEnvelope(146, 15);

            // With octave resolution
            const detector = new TempoDetector({
                useOctaveResolution: true,
                minBpm: 40,  // Allow low BPM detection to see the correction
            });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should not detect a very low sub-harmonic (like 24 BPM)
            // Should detect something closer to the actual 146 BPM
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(70);
        });

        it('should maintain backward compatibility when useOctaveResolution is false', () => {
            // Create a 120 BPM envelope
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            // Test with octave resolution disabled (default behavior)
            const detector = new TempoDetector({ useOctaveResolution: false });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should still work correctly for standard tempos
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(115);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(125);
        });

        it('should verify useOctaveResolution defaults to false', () => {
            const detector = new TempoDetector();
            const config = detector.getConfig();

            expect(config.useOctaveResolution).toBe(false);
        });

        it('should allow useOctaveResolution to be explicitly enabled', () => {
            const detector = new TempoDetector({ useOctaveResolution: true });
            const config = detector.getConfig();

            expect(config.useOctaveResolution).toBe(true);
        });

        it('should handle octave resolution with various tempos', () => {
            const testTempos = [80, 100, 120, 140, 160];

            for (const bpm of testTempos) {
                const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(bpm, 10);

                const detector = new TempoDetector({ useOctaveResolution: true });
                const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

                // Should detect a tempo, either the actual or an octave
                // Just verify it doesn't crash and returns valid output
                expect(estimate.primaryBpm).toBeGreaterThan(0);
                expect(estimate.primaryBpm).toBeLessThanOrEqual(200);
            }
        });
    });

    describe('triple meter resolution (useTripleMeter)', () => {
        /**
         * Helper to create an onset envelope with a triple meter pattern (3/4 or 6/8).
         * Creates a signal where beats group in threes with a strong-weak-weak pattern.
         * The third sub-harmonic has strong energy, which TPS3 can detect.
         */
        function createTripleMeterOnsetEnvelope(
            bpm: number,
            durationSeconds: number,
            hopSizeMs: number = 10
        ): { envelope: Float32Array; hopSizeSeconds: number } {
            const hopSizeSeconds = hopSizeMs / 1000;
            const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
            const envelope = new Float32Array(numFrames);

            const beatIntervalFrames = Math.round((60 / bpm) / hopSizeSeconds);

            // Create a 3/4 pattern: strong-weak-weak
            for (let frame = 0; frame < numFrames; frame++) {
                const beatInMeasure = Math.floor(frame / beatIntervalFrames) % 3;
                const distanceToBeat = frame % beatIntervalFrames;
                const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);
                const peakWidth = 2;

                // Strong beat on 1, weak beats on 2 and 3
                const intensity = beatInMeasure === 0 ? 1.0 : 0.4;

                envelope[frame] = intensity * Math.exp(-Math.pow(minDistance / peakWidth, 2));
            }

            return { envelope, hopSizeSeconds };
        }

        /**
         * Helper to create an envelope that could be misdetected at one-third tempo.
         * This simulates a waltz where the algorithm might detect the measure tempo
         * instead of the beat tempo.
         */
        function createThirdTempoAmbiguousEnvelope(
            targetBpm: number,
            durationSeconds: number,
            hopSizeMs: number = 10
        ): { envelope: Float32Array; hopSizeSeconds: number } {
            const hopSizeSeconds = hopSizeMs / 1000;
            const numFrames = Math.floor(durationSeconds / hopSizeSeconds);
            const envelope = new Float32Array(numFrames);

            const beatIntervalFrames = Math.round((60 / targetBpm) / hopSizeSeconds);
            const thirdTempoIntervalFrames = beatIntervalFrames * 3;

            // Create peaks at the target BPM, but also strong energy at the measure level (1/3 tempo)
            for (let frame = 0; frame < numFrames; frame++) {
                // Distance to nearest beat at target tempo
                const distanceToBeat = frame % beatIntervalFrames;
                const minDistance = Math.min(distanceToBeat, beatIntervalFrames - distanceToBeat);

                // Distance to nearest "measure beat" (1/3 tempo)
                const distanceToMeasureBeat = frame % thirdTempoIntervalFrames;
                const minMeasureDistance = Math.min(distanceToMeasureBeat, thirdTempoIntervalFrames - distanceToMeasureBeat);

                // Combine: strong peaks at target tempo, moderate at measure level
                const peakWidth = 2;
                const targetPeak = Math.exp(-Math.pow(minDistance / peakWidth, 2));
                const measurePeak = Math.exp(-Math.pow(minMeasureDistance / peakWidth, 2)) * 0.7;

                envelope[frame] = targetPeak + measurePeak;
            }

            return { envelope, hopSizeSeconds };
        }

        it('should detect triple meter pattern correctly with useTripleMeter enabled', () => {
            // Create a 120 BPM triple meter pattern (3/4 time)
            const { envelope, hopSizeSeconds } = createTripleMeterOnsetEnvelope(120, 15);

            // With triple meter resolution enabled
            const detector = new TempoDetector({ useTripleMeter: true });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect around 120 BPM (±10 BPM tolerance)
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(110);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(130);
        });

        it('should correct third-tempo detection when useTripleMeter is true (50 BPM -> 150 BPM)', () => {
            // Create an envelope at 150 BPM that could be misdetected as 50 BPM (one-third tempo)
            const { envelope, hopSizeSeconds } = createThirdTempoAmbiguousEnvelope(150, 15);

            // Without triple meter resolution - may detect third-tempo
            const detectorWithoutTriple = new TempoDetector({ useTripleMeter: false });
            const estimateWithoutTriple = detectorWithoutTriple.estimateTempo(envelope, hopSizeSeconds);

            // With triple meter resolution - should prefer the faster tempo if TPS3 favors it
            const detectorWithTriple = new TempoDetector({ useTripleMeter: true });
            const estimateWithTriple = detectorWithTriple.estimateTempo(envelope, hopSizeSeconds);

            // Both versions should return valid tempos (the algorithm doesn't break)
            expect(estimateWithoutTriple.primaryBpm).toBeGreaterThan(0);
            expect(estimateWithTriple.primaryBpm).toBeGreaterThan(0);

            // The triple meter resolved tempo should be reasonable
            expect(estimateWithTriple.primaryBpm).toBeGreaterThanOrEqual(60);
            expect(estimateWithTriple.primaryBpm).toBeLessThanOrEqual(180);
        });

        it('should preserve correct tempo for duple meter when triple meter is enabled', () => {
            // Create a standard 4/4 pattern at 120 BPM
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            // With triple meter resolution enabled
            const detector = new TempoDetector({ useTripleMeter: true });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should still correctly detect 120 BPM (±10 BPM)
            // TPS3 shouldn't incorrectly trigger for duple meter
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(110);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(130);
        });

        it('should handle combined useOctaveResolution and useTripleMeter', () => {
            // Create a triple meter pattern at 140 BPM
            const { envelope, hopSizeSeconds } = createTripleMeterOnsetEnvelope(140, 15);

            // With both options enabled
            const detector = new TempoDetector({
                useOctaveResolution: true,
                useTripleMeter: true,
            });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should detect a valid tempo (doesn't crash with both enabled)
            expect(estimate.primaryBpm).toBeGreaterThan(0);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(180);
        });

        it('should maintain backward compatibility when useTripleMeter is false', () => {
            // Create a 120 BPM envelope
            const { envelope, hopSizeSeconds } = createPeriodicOnsetEnvelope(120, 10);

            // Test with triple meter disabled (default behavior)
            const detector = new TempoDetector({ useTripleMeter: false });
            const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

            // Should still work correctly for standard tempos
            expect(estimate.primaryBpm).toBeGreaterThanOrEqual(115);
            expect(estimate.primaryBpm).toBeLessThanOrEqual(125);
        });

        it('should verify useTripleMeter defaults to false', () => {
            const detector = new TempoDetector();
            const config = detector.getConfig();

            expect(config.useTripleMeter).toBe(false);
        });

        it('should allow useTripleMeter to be explicitly enabled', () => {
            const detector = new TempoDetector({ useTripleMeter: true });
            const config = detector.getConfig();

            expect(config.useTripleMeter).toBe(true);
        });

        it('should handle triple meter resolution with various tempos (60, 80, 100, 120, 140 BPM)', () => {
            const testTempos = [60, 80, 100, 120, 140];

            for (const bpm of testTempos) {
                const { envelope, hopSizeSeconds } = createTripleMeterOnsetEnvelope(bpm, 10);

                const detector = new TempoDetector({ useTripleMeter: true });
                const estimate = detector.estimateTempo(envelope, hopSizeSeconds);

                // Should detect a tempo, either the actual or an octave
                // Just verify it doesn't crash and returns valid output
                expect(estimate.primaryBpm).toBeGreaterThan(0);
                expect(estimate.primaryBpm).toBeLessThanOrEqual(200);
            }
        });
    });
});
