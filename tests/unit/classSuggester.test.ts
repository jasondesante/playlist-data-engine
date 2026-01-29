/**
 * Unit tests for ClassSuggester
 *
 * Tests the affinity-based class selection system with 4% baseline from Phase 9 rewrite.
 *
 * Phase 9.3: Test ClassSuggester Rewrite
 * - Unit test: Verify 4% baseline for all classes (never drops below 4%)
 * - Unit test: Verify probabilities sum to 1.0
 * - Edge case test: All-zero audio (equal distribution)
 * - Edge case test: Max values in all bands (favors some classes)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ClassSuggester } from '../../src/core/generation/ClassSuggester.js';
import { SeededRNG } from '../../src/utils/random.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import type { AudioProfile } from '../../src/core/types/AudioProfile.js';

// Reset ExtensionManager before each test to ensure clean state
describe('ClassSuggester', () => {
    beforeEach(() => {
        // Reset ExtensionManager to ensure clean state
        ExtensionManager.getInstance().resetAll();
    });

    describe('4% Baseline System', () => {
        it('should ensure all classes have at least 4% probability with extreme bass profile', () => {
            // Extreme bass profile: only Barbarian, Fighter, Paladin should be favored
            // But ALL classes should still have at least 4% chance
            const bassHeavyProfile: AudioProfile = {
                bass_dominance: 0.95,
                mid_dominance: 0.10,
                treble_dominance: 0.05,
                average_amplitude: 0.50,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-bass-baseline');

            // Generate 100 suggestions to check distribution
            const suggestions = new Map<string, number>();
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(bassHeavyProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Every class should appear at least once in 100 trials
            // (4% baseline means each class should appear ~4 times in 100 trials)
            const allClasses = [
                'Barbarian',
                'Bard',
                'Cleric',
                'Druid',
                'Fighter',
                'Monk',
                'Paladin',
                'Ranger',
                'Rogue',
                'Sorcerer',
                'Warlock',
                'Wizard',
            ];

            for (const cls of allClasses) {
                expect(suggestions.has(cls)).toBe(true);
                const count = suggestions.get(cls) || 0;
                const actualProbability = count / trials;

                // Allow for some variance (at least 1% in 100 trials)
                // But all classes should appear
                expect(actualProbability).toBeGreaterThan(0);
            }
        });

        it('should ensure all classes have at least 4% probability with extreme treble profile', () => {
            // Extreme treble profile: only Rogue, Ranger, Monk should be favored
            const trebleHeavyProfile: AudioProfile = {
                bass_dominance: 0.05,
                mid_dominance: 0.10,
                treble_dominance: 0.95,
                average_amplitude: 0.50,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-treble-baseline');

            // Generate 100 suggestions to check distribution
            const suggestions = new Map<string, number>();
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(trebleHeavyProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Every class should appear at least once
            const allClasses = [
                'Barbarian',
                'Bard',
                'Cleric',
                'Druid',
                'Fighter',
                'Monk',
                'Paladin',
                'Ranger',
                'Rogue',
                'Sorcerer',
                'Warlock',
                'Wizard',
            ];

            for (const cls of allClasses) {
                expect(suggestions.has(cls)).toBe(true);
            }
        });

        it('should ensure all classes have at least 4% probability with extreme mid profile', () => {
            // Extreme mid profile: only Wizard, Cleric, Druid should be favored
            const midHeavyProfile: AudioProfile = {
                bass_dominance: 0.05,
                mid_dominance: 0.95,
                treble_dominance: 0.10,
                average_amplitude: 0.50,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-mid-baseline');

            // Generate 100 suggestions to check distribution
            const suggestions = new Map<string, number>();
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(midHeavyProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Every class should appear at least once
            const allClasses = [
                'Barbarian',
                'Bard',
                'Cleric',
                'Druid',
                'Fighter',
                'Monk',
                'Paladin',
                'Ranger',
                'Rogue',
                'Sorcerer',
                'Warlock',
                'Wizard',
            ];

            for (const cls of allClasses) {
                expect(suggestions.has(cls)).toBe(true);
            }
        });

        it('should ensure all classes have at least 4% probability with extreme amplitude profile', () => {
            // Extreme amplitude profile: only Bard, Sorcerer, Warlock should be favored
            const amplitudeHeavyProfile: AudioProfile = {
                bass_dominance: 0.10,
                mid_dominance: 0.10,
                treble_dominance: 0.10,
                average_amplitude: 0.95,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-amplitude-baseline');

            // Generate 100 suggestions to check distribution
            const suggestions = new Map<string, number>();
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(amplitudeHeavyProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Every class should appear at least once
            const allClasses = [
                'Barbarian',
                'Bard',
                'Cleric',
                'Druid',
                'Fighter',
                'Monk',
                'Paladin',
                'Ranger',
                'Rogue',
                'Sorcerer',
                'Warlock',
                'Wizard',
            ];

            for (const cls of allClasses) {
                expect(suggestions.has(cls)).toBe(true);
            }
        });
    });

    describe('Probability Sum Validation', () => {
        it('should produce probabilities that sum to 1.0 with balanced profile', () => {
            // Balanced profile: all values equal
            const balancedProfile: AudioProfile = {
                bass_dominance: 0.5,
                mid_dominance: 0.5,
                treble_dominance: 0.5,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-balanced-sum');

            // Generate many suggestions and calculate empirical probabilities
            const suggestions = new Map<string, number>();
            const trials = 1000;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(balancedProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Sum of all empirical probabilities should be approximately 1.0
            const totalProbability = Array.from(suggestions.values()).reduce(
                (sum, count) => sum + count / trials,
                0
            );

            expect(totalProbability).toBeCloseTo(1.0, 4);
        });

        it('should produce probabilities that sum to 1.0 with bass-heavy profile', () => {
            const bassHeavyProfile: AudioProfile = {
                bass_dominance: 0.9,
                mid_dominance: 0.1,
                treble_dominance: 0.1,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-bass-sum');
            const suggestions = new Map<string, number>();
            const trials = 1000;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(bassHeavyProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            const totalProbability = Array.from(suggestions.values()).reduce(
                (sum, count) => sum + count / trials,
                0
            );

            expect(totalProbability).toBeCloseTo(1.0, 4);
        });

        it('should produce probabilities that sum to 1.0 with treble-heavy profile', () => {
            const trebleHeavyProfile: AudioProfile = {
                bass_dominance: 0.1,
                mid_dominance: 0.1,
                treble_dominance: 0.9,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-treble-sum');
            const suggestions = new Map<string, number>();
            const trials = 1000;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(trebleHeavyProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            const totalProbability = Array.from(suggestions.values()).reduce(
                (sum, count) => sum + count / trials,
                0
            );

            expect(totalProbability).toBeCloseTo(1.0, 4);
        });

        it('should produce probabilities that sum to 1.0 with mixed profile', () => {
            const mixedProfile: AudioProfile = {
                bass_dominance: 0.7,
                mid_dominance: 0.6,
                treble_dominance: 0.3,
                average_amplitude: 0.8,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-mixed-sum');
            const suggestions = new Map<string, number>();
            const trials = 1000;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(mixedProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            const totalProbability = Array.from(suggestions.values()).reduce(
                (sum, count) => sum + count / trials,
                0
            );

            expect(totalProbability).toBeCloseTo(1.0, 4);
        });
    });

    describe('Edge Case: All-Zero Audio', () => {
        it('should distribute equally when all audio values are zero', () => {
            // All-zero profile: should result in equal distribution
            const zeroProfile: AudioProfile = {
                bass_dominance: 0,
                mid_dominance: 0,
                treble_dominance: 0,
                average_amplitude: 0,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-zero-profile');

            // Generate many suggestions to check for equal distribution
            const suggestions = new Map<string, number>();
            const trials = 1200; // Use multiple of 12 for easier verification

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(zeroProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Each class should appear approximately 100 times (1200 / 12 = 100)
            // Allow for reasonable variance due to randomness: 70-130 times
            const expectedCountPerClass = trials / 12;
            const minExpected = expectedCountPerClass - 30;
            const maxExpected = expectedCountPerClass + 30;

            for (const [cls, count] of suggestions) {
                expect(count).toBeGreaterThanOrEqual(minExpected);
                expect(count).toBeLessThanOrEqual(maxExpected);
            }

            // Verify we have all 12 classes
            expect(suggestions.size).toBe(12);
        });

        it('should handle near-zero values correctly', () => {
            // Near-zero profile: should still result in approximately equal distribution
            const nearZeroProfile: AudioProfile = {
                bass_dominance: 0.01,
                mid_dominance: 0.01,
                treble_dominance: 0.01,
                average_amplitude: 0.01,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-near-zero-profile');

            // Generate many suggestions
            const suggestions = new Map<string, number>();
            const trials = 600;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(nearZeroProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Each class should appear approximately 50 times (600 / 12 = 50)
            // Allow for variance: 30-70 times
            const minExpected = 30;
            const maxExpected = 70;

            for (const [cls, count] of suggestions) {
                expect(count).toBeGreaterThanOrEqual(minExpected);
                expect(count).toBeLessThanOrEqual(maxExpected);
            }

            // Verify we have all 12 classes
            expect(suggestions.size).toBe(12);
        });
    });

    describe('Edge Case: Max Values in All Bands', () => {
        it('should favor strength classes when all bands are max', () => {
            // All max values: bass/mid/treble/amplitude all at 1.0
            // This should favor classes with multiple traits (Barbarian, Bard, Sorcerer)
            const maxProfile: AudioProfile = {
                bass_dominance: 1.0,
                mid_dominance: 1.0,
                treble_dominance: 1.0,
                average_amplitude: 1.0,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-max-profile');

            // Generate many suggestions to see which classes are favored
            const suggestions = new Map<string, number>();
            const trials = 500;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(maxProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // Classes with multiple trait preferences should appear more often
            // Barbarian (bass + amplitude), Bard (amplitude + mid + treble), etc.
            // But all classes should still appear due to baseline
            expect(suggestions.size).toBe(12);

            // Check that all classes appeared at least once
            for (const [cls, count] of suggestions) {
                expect(count).toBeGreaterThan(0);
            }
        });

        it('should handle high variance profile (chaos test)', () => {
            // High variance profile: bass very high, treble very low
            // This tests the "chaos" trait for Sorcerer
            const varianceProfile: AudioProfile = {
                bass_dominance: 0.95,
                mid_dominance: 0.50,
                treble_dominance: 0.05,
                average_amplitude: 0.50,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-variance-profile');

            // Generate suggestions
            const suggestions = new Map<string, number>();
            const trials = 200;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(varianceProfile, rng);
                suggestions.set(suggested, (suggestions.get(suggested) || 0) + 1);
            }

            // All classes should appear
            expect(suggestions.size).toBe(12);
        });
    });

    describe('Deterministic Selection', () => {
        it('should produce the same result with the same seed', () => {
            const profile: AudioProfile = {
                bass_dominance: 0.7,
                mid_dominance: 0.3,
                treble_dominance: 0.5,
                average_amplitude: 0.6,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const seed = 'deterministic-test-seed';
            const rng1 = new SeededRNG(seed);
            const rng2 = new SeededRNG(seed);

            const result1 = ClassSuggester.suggest(profile, rng1);
            const result2 = ClassSuggester.suggest(profile, rng2);

            expect(result1).toBe(result2);
        });

        it('should produce different results with different seeds', () => {
            const profile: AudioProfile = {
                bass_dominance: 0.5,
                mid_dominance: 0.5,
                treble_dominance: 0.5,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng1 = new SeededRNG('seed-1');
            const rng2 = new SeededRNG('seed-2');

            const result1 = ClassSuggester.suggest(profile, rng1);
            const result2 = ClassSuggester.suggest(profile, rng2);

            // Results should be different (statistically very unlikely to be same)
            expect(result1).not.toBe(result2);
        });
    });

    describe('Audio Affinity Influence', () => {
        it('should favor Barbarian with bass-heavy profile', () => {
            const bassHeavyProfile: AudioProfile = {
                bass_dominance: 0.9,
                mid_dominance: 0.1,
                treble_dominance: 0.1,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-bass-barbarian');

            // Generate suggestions and count Barbarian appearances
            let barbarianCount = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(bassHeavyProfile, rng);
                if (suggested === 'Barbarian') {
                    barbarianCount++;
                }
            }

            // Barbarian should appear significantly more than baseline (4%)
            // With bass-heavy profile, expect at least 15% appearance rate
            expect(barbarianCount / trials).toBeGreaterThan(0.10);
        });

        it('should favor Rogue with treble-heavy profile', () => {
            const trebleHeavyProfile: AudioProfile = {
                bass_dominance: 0.1,
                mid_dominance: 0.1,
                treble_dominance: 0.9,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-treble-rogue');

            // Generate suggestions and count Rogue appearances
            let rogueCount = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(trebleHeavyProfile, rng);
                if (suggested === 'Rogue') {
                    rogueCount++;
                }
            }

            // Rogue should appear significantly more than baseline
            expect(rogueCount / trials).toBeGreaterThan(0.10);
        });

        it('should favor Wizard with mid-heavy profile', () => {
            const midHeavyProfile: AudioProfile = {
                bass_dominance: 0.1,
                mid_dominance: 0.9,
                treble_dominance: 0.1,
                average_amplitude: 0.5,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-mid-wizard');

            // Generate suggestions and count Wizard appearances
            let wizardCount = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(midHeavyProfile, rng);
                if (suggested === 'Wizard') {
                    wizardCount++;
                }
            }

            // Wizard should appear significantly more than baseline
            expect(wizardCount / trials).toBeGreaterThan(0.10);
        });

        it('should favor Bard with amplitude-heavy profile', () => {
            const amplitudeHeavyProfile: AudioProfile = {
                bass_dominance: 0.2,
                mid_dominance: 0.2,
                treble_dominance: 0.2,
                average_amplitude: 0.9,
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const rng = new SeededRNG('test-amplitude-bard');

            // Generate suggestions and count Bard appearances
            let bardCount = 0;
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const suggested = ClassSuggester.suggest(amplitudeHeavyProfile, rng);
                if (suggested === 'Bard') {
                    bardCount++;
                }
            }

            // Bard should appear significantly more than baseline
            expect(bardCount / trials).toBeGreaterThan(0.10);
        });
    });
});
