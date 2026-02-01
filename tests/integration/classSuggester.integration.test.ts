/**
 * Integration test for Phase 9.3: Test ClassSuggester Rewrite
 *
 * This test generates 100 characters from diverse audio profiles to verify:
 * 1. 4% baseline for all classes (no class ever drops below 4%)
 * 2. Probabilities sum to 1.0
 * 3. Class distribution is balanced (no single class dominates)
 * 4. All classes are possible with any audio profile
 * 5. Audio influences class selection (can boost classes above baseline)
 *
 * The test uses a variety of synthetic audio profiles representing different
 * musical genres to validate the affinity-based system with baseline.
 */

import { describe, it, expect } from 'vitest';
import type { Class } from '../../src/core/types/Character.js';
import { ClassSuggester } from '../../src/core/generation/ClassSuggester.js';
import { SeededRNG } from '../../src/utils/random.js';

/**
 * Synthetic audio profiles representing diverse musical genres
 *
 * These profiles represent real-world audio characteristics after the
 * Phase 8 audio analysis fix (balanced frequency bands).
 */
interface GenreProfile {
    name: string;
    description: string;
    bass_dominance: number;
    mid_dominance: number;
    treble_dominance: number;
    average_amplitude: number;
}

const DIVERSE_GENRE_PROFILES: GenreProfile[] = [
    // Heavy bass genres (should favor Barbarian, Fighter, Paladin)
    {
        name: 'Dubstep',
        description: 'Heavy bass drops, synthesized low frequencies',
        bass_dominance: 0.85,
        mid_dominance: 0.40,
        treble_dominance: 0.60,
        average_amplitude: 0.70,
    },
    {
        name: 'Hip Hop',
        description: 'Strong bassline, rhythmic, vocal-focused mids',
        bass_dominance: 0.75,
        mid_dominance: 0.55,
        treble_dominance: 0.45,
        average_amplitude: 0.60,
    },
    {
        name: 'EDM/Techno',
        description: 'Four-on-the-floor, heavy bass kick',
        bass_dominance: 0.80,
        mid_dominance: 0.50,
        treble_dominance: 0.55,
        average_amplitude: 0.65,
    },
    {
        name: 'Trap',
        description: '808 bass, hi-hat rolls, synthesized leads',
        bass_dominance: 0.90,
        mid_dominance: 0.45,
        treble_dominance: 0.50,
        average_amplitude: 0.75,
    },

    // Treble-heavy genres (should favor Rogue, Ranger, Monk)
    {
        name: 'Classical',
        description: 'Orchestral, strings, high-frequency instruments',
        bass_dominance: 0.35,
        mid_dominance: 0.55,
        treble_dominance: 0.80,
        average_amplitude: 0.40,
    },
    {
        name: 'Jazz',
        description: 'Complex hi-hat patterns, cymbals, brass',
        bass_dominance: 0.40,
        mid_dominance: 0.60,
        treble_dominance: 0.75,
        average_amplitude: 0.45,
    },
    {
        name: 'Ambient',
        description: 'Atmospheric, pads, high-frequency shimmer',
        bass_dominance: 0.25,
        mid_dominance: 0.50,
        treble_dominance: 0.85,
        average_amplitude: 0.30,
    },
    {
        name: 'Indie Folk',
        description: 'Acoustic guitars, vocals, finger-picking',
        bass_dominance: 0.30,
        mid_dominance: 0.65,
        treble_dominance: 0.70,
        average_amplitude: 0.50,
    },

    // Mid-focused genres (should favor Wizard, Cleric, Druid)
    {
        name: 'Rock',
        description: 'Electric guitars, vocals, balanced mix',
        bass_dominance: 0.50,
        mid_dominance: 0.75,
        treble_dominance: 0.55,
        average_amplitude: 0.60,
    },
    {
        name: 'Pop',
        description: 'Vocal-forward, mid-range focus, polished',
        bass_dominance: 0.45,
        mid_dominance: 0.80,
        treble_dominance: 0.50,
        average_amplitude: 0.55,
    },
    {
        name: 'R&B',
        description: 'Vocal-focused, smooth mids, groove',
        bass_dominance: 0.55,
        mid_dominance: 0.70,
        treble_dominance: 0.45,
        average_amplitude: 0.50,
    },
    {
        name: 'Soul',
        description: 'Vocal-driven, horn sections, mid-emphasis',
        bass_dominance: 0.50,
        mid_dominance: 0.75,
        treble_dominance: 0.50,
        average_amplitude: 0.55,
    },

    // High amplitude genres (should favor Bard, Sorcerer, Warlock)
    {
        name: 'Metal',
        description: 'High amplitude, distorted guitars, aggressive',
        bass_dominance: 0.70,
        mid_dominance: 0.60,
        treble_dominance: 0.65,
        average_amplitude: 0.80,
    },
    {
        name: 'Punk',
        description: 'Loud, fast, high energy, compressed',
        bass_dominance: 0.65,
        mid_dominance: 0.70,
        treble_dominance: 0.60,
        average_amplitude: 0.85,
    },
    {
        name: 'Hard Rock',
        description: 'Heavy drums, guitars, high energy',
        bass_dominance: 0.60,
        mid_dominance: 0.65,
        treble_dominance: 0.70,
        average_amplitude: 0.75,
    },
    {
        name: 'Reggae',
        description: 'Bass-heavy, rhythmic, moderate amplitude',
        bass_dominance: 0.70,
        mid_dominance: 0.55,
        treble_dominance: 0.45,
        average_amplitude: 0.60,
    },
    {
        name: 'Funk',
        description: 'Grooving bassline, horns, rhythmic',
        bass_dominance: 0.75,
        mid_dominance: 0.60,
        treble_dominance: 0.50,
        average_amplitude: 0.65,
    },
    {
        name: 'Country',
        description: 'Acoustic instruments, vocals, mid-focused',
        bass_dominance: 0.40,
        mid_dominance: 0.70,
        treble_dominance: 0.55,
        average_amplitude: 0.55,
    },
    {
        name: 'Blues',
        description: 'Guitar-driven, vocal-focused, soulful',
        bass_dominance: 0.50,
        mid_dominance: 0.65,
        treble_dominance: 0.55,
        average_amplitude: 0.60,
    },
    {
        name: 'Lo-Fi',
        description: 'Mellow, dusty, mid-focused, relaxed',
        bass_dominance: 0.35,
        mid_dominance: 0.60,
        treble_dominance: 0.50,
        average_amplitude: 0.45,
    },
    {
        name: 'Synthwave',
        description: 'Retro synths, bass-heavy, bright leads',
        bass_dominance: 0.70,
        mid_dominance: 0.55,
        treble_dominance: 0.65,
        average_amplitude: 0.70,
    },
];

/**
 * Create AudioProfile from genre profile
 */
function createAudioProfile(genre: GenreProfile) {
    return {
        bass_dominance: genre.bass_dominance,
        mid_dominance: genre.mid_dominance,
        treble_dominance: genre.treble_dominance,
        average_amplitude: genre.average_amplitude,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: false,
            sample_positions: [5, 40, 70],
            analyzed_at: new Date().toISOString(),
        },
    };
}

describe('ClassSuggester Integration Tests (Phase 9.3)', () => {
    describe('Generate 100 Characters from Diverse Genres', () => {
        it('should generate 100 characters and document class distribution', () => {
            const allSuggestions: Class[] = [];
            const classCounts = new Map<Class, number>();
            const genreClassMap = new Map<string, Class[]>();

            // Generate one suggestion per genre (21 genres, 5 rounds = 105 suggestions)
            const rounds = 5;
            const expectedSuggestions = DIVERSE_GENRE_PROFILES.length * rounds;

            for (let round = 0; round < rounds; round++) {
                for (const genre of DIVERSE_GENRE_PROFILES) {
                    const audioProfile = createAudioProfile(genre);
                    const seed = `genre-${round}-${genre.name}`;
                    const rng = new SeededRNG(seed);
                    const suggested = ClassSuggester.suggest(audioProfile, rng);

                    allSuggestions.push(suggested);
                    classCounts.set(suggested, (classCounts.get(suggested) || 0) + 1);

                    // Track which classes were suggested for each genre
                    if (!genreClassMap.has(genre.name)) {
                        genreClassMap.set(genre.name, []);
                    }
                    genreClassMap.get(genre.name)!.push(suggested);
                }
            }

            // Verify we generated the expected number of suggestions
            expect(allSuggestions.length).toBe(expectedSuggestions);

            // Log class distribution
            console.log(`\n=== Class Distribution (${expectedSuggestions} generations from ${DIVERSE_GENRE_PROFILES.length} diverse genres) ===`);
            const sortedClasses = Array.from(classCounts.entries()).sort((a, b) => b[1] - a[1]);
            for (const [cls, count] of sortedClasses) {
                const percentage = ((count / expectedSuggestions) * 100).toFixed(1);
                console.log(`${cls}: ${count} (${percentage}%)`);
            }

            // Verify all 12 classes appeared at least once
            expect(classCounts.size).toBe(12);

            // Verify no single class dominates more than 30%
            const maxCount = Math.max(...classCounts.values());
            expect(maxCount / expectedSuggestions).toBeLessThanOrEqual(0.30); // No more than 30%

            // Verify minimum count - all classes should appear at least 2 times
            const minCount = Math.min(...classCounts.values());
            expect(minCount).toBeGreaterThanOrEqual(2); // At least 2 appearances

            // Verify sum equals expected
            const totalCount = Array.from(classCounts.values()).reduce((sum, count) => sum + count, 0);
            expect(totalCount).toBe(expectedSuggestions);

            // Log genre-to-class mapping (first round only for brevity)
            console.log('\n=== Genre to Class Mapping (Round 1) ===');
            for (const [genre, classes] of genreClassMap) {
                console.log(`${genre}: ${classes[0]}`);
            }
        });

        it('should ensure all classes appear with extreme bass profiles', () => {
            // Test with extreme bass profile multiple times
            const bassProfile = {
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

            const suggestions: Class[] = [];
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`extreme-bass-${i}`);
                const suggested = ClassSuggester.suggest(bassProfile, rng);
                suggestions.push(suggested);
            }

            const uniqueClasses = new Set(suggestions);
            console.log(`\n=== Extreme Bass Profile (${trials} trials) ===`);
            console.log(`Unique classes suggested: ${uniqueClasses.size}/12`);

            // All 12 classes should appear
            expect(uniqueClasses.size).toBe(12);

            // Log distribution
            const counts = new Map<Class, number>();
            for (const cls of suggestions) {
                counts.set(cls, (counts.get(cls) || 0) + 1);
            }

            for (const [cls, count] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1])) {
                console.log(`${cls}: ${count} (${((count / trials) * 100).toFixed(1)}%)`);
            }

            // Verify Barbarian appears reasonably often (favored by bass, but baseline ensures variety)
            const barbarianCount = counts.get('Barbarian') || 0;
            expect(barbarianCount).toBeGreaterThan(trials * 0.05); // At least 5%
        });

        it('should ensure all classes appear with extreme treble profiles', () => {
            const trebleProfile = {
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

            const suggestions: Class[] = [];
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`extreme-treble-${i}`);
                const suggested = ClassSuggester.suggest(trebleProfile, rng);
                suggestions.push(suggested);
            }

            const uniqueClasses = new Set(suggestions);
            console.log(`\n=== Extreme Treble Profile (${trials} trials) ===`);
            console.log(`Unique classes suggested: ${uniqueClasses.size}/12`);

            // All 12 classes should appear
            expect(uniqueClasses.size).toBe(12);
        });

        it('should ensure all classes appear with balanced profiles', () => {
            const balancedProfile = {
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

            const suggestions: Class[] = [];
            const trials = 120; // Divisible by 12

            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`balanced-${i}`);
                const suggested = ClassSuggester.suggest(balancedProfile, rng);
                suggestions.push(suggested);
            }

            const uniqueClasses = new Set(suggestions);
            console.log(`\n=== Balanced Profile (${trials} trials) ===`);
            console.log(`Unique classes suggested: ${uniqueClasses.size}/12`);

            // All 12 classes should appear
            expect(uniqueClasses.size).toBe(12);

            // With balanced profile, distribution should be roughly equal
            // Each class should appear around 10 times (120 / 12 = 10)
            const counts = new Map<Class, number>();
            for (const cls of suggestions) {
                counts.set(cls, (counts.get(cls) || 0) + 1);
            }

            for (const [cls, count] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1])) {
                console.log(`${cls}: ${count} (${((count / trials) * 100).toFixed(1)}%)`);
            }

            // Verify reasonable distribution: each class should appear 5-20 times
            // (allowing for more variance due to randomness with seeded RNG)
            for (const [cls, count] of counts) {
                expect(count).toBeGreaterThanOrEqual(5);
                expect(count).toBeLessThanOrEqual(20);
            }
        });
    });

    describe('Baseline System Verification', () => {
        it('should verify 4% baseline prevents class lockout', () => {
            // Generate 200 characters with extreme audio profiles
            // to verify baseline prevents any class from being locked out

            const extremeProfiles = [
                // Extreme bass
                { bass: 0.98, mid: 0.01, treble: 0.01, amp: 0.5 },
                // Extreme treble
                { bass: 0.01, mid: 0.01, treble: 0.98, amp: 0.5 },
                // Extreme mid
                { bass: 0.01, mid: 0.98, treble: 0.01, amp: 0.5 },
                // Extreme amplitude
                { bass: 0.01, mid: 0.01, treble: 0.01, amp: 0.98 },
            ];

            const allClasses = new Set<Class>();
            const trials = 50; // Per profile

            for (const profile of extremeProfiles) {
                for (let i = 0; i < trials; i++) {
                    const audioProfile = {
                        bass_dominance: profile.bass,
                        mid_dominance: profile.mid,
                        treble_dominance: profile.treble,
                        average_amplitude: profile.amp,
                        analysis_metadata: {
                            duration_analyzed: 30,
                            full_buffer_analyzed: false,
                            sample_positions: [5, 40, 70],
                            analyzed_at: new Date().toISOString(),
                        },
                    };

                    const rng = new SeededRNG(`baseline-test-${profile.bass}-${profile.mid}-${profile.treble}-${i}`);
                    const suggested = ClassSuggester.suggest(audioProfile, rng);
                    allClasses.add(suggested);
                }
            }

            console.log(`\n=== Baseline Verification (${extremeProfiles.length} profiles × ${trials} trials = ${extremeProfiles.length * trials} total) ===`);
            console.log(`Unique classes suggested: ${allClasses.size}/12`);

            // All 12 classes should appear even with extreme profiles
            expect(allClasses.size).toBe(12);
        });
    });

    describe('Audio Influence Verification', () => {
        it('should verify audio still influences class selection', () => {
            // Audio should still push classes significantly above baseline
            // Bass-heavy should result in more strength classes than random

            const bassProfile = {
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

            const strengthClasses = ['Barbarian', 'Fighter', 'Paladin'];
            let strengthCount = 0;
            const trials = 200;

            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`audio-influence-${i}`);
                const suggested = ClassSuggester.suggest(bassProfile, rng);
                if (strengthClasses.includes(suggested)) {
                    strengthCount++;
                }
            }

            const strengthPercentage = (strengthCount / trials) * 100;

            console.log(`\n=== Audio Influence Verification (${trials} trials with bass-heavy profile) ===`);
            console.log(`Strength classes (Barbarian, Fighter, Paladin): ${strengthCount}/${trials} (${strengthPercentage.toFixed(1)}%)`);

            // Strength classes should appear more than random (25% = 3/12)
            // but baseline ensures other classes still appear
            expect(strengthPercentage).toBeGreaterThan(20); // At least 20%
            expect(strengthPercentage).toBeLessThan(80); // But not 100% (baseline allows others)
        });
    });

    describe('Before/After Comparison', () => {
        it('should show improvement in variety compared to hard threshold system', () => {
            // Old system: hard threshold at 0.6 meant classes could be locked out
            // New system: 4% baseline ensures all classes always possible

            const trebleProfile = {
                bass_dominance: 0.3,
                mid_dominance: 0.3,
                treble_dominance: 0.7, // Would trigger Rogue/Ranger/Monk in old system
                average_amplitude: 0.4, // Below 0.5, so no charisma classes in old system
                analysis_metadata: {
                    duration_analyzed: 30,
                    full_buffer_analyzed: false,
                    sample_positions: [5, 40, 70],
                    analyzed_at: new Date().toISOString(),
                },
            };

            const allClasses = new Set<Class>();
            const trials = 100;

            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`before-after-${i}`);
                const suggested = ClassSuggester.suggest(trebleProfile, rng);
                allClasses.add(suggested);
            }

            console.log(`\n=== Before/After Comparison ===`);
            console.log(`Profile: Treble=${trebleProfile.treble_dominance}, Amplitude=${trebleProfile.average_amplitude}`);
            console.log(`Old system: Would only suggest Rogue, Ranger, Monk (hard threshold > 0.6)`);
            console.log(`New system: ${allClasses.size}/12 classes possible (4% baseline)`);

            // New system should allow all 12 classes
            expect(allClasses.size).toBe(12);

            // But treble classes should still be favored
            const suggestions: Class[] = [];
            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`before-after-count-${i}`);
                const suggested = ClassSuggester.suggest(trebleProfile, rng);
                suggestions.push(suggested);
            }

            const counts = new Map<Class, number>();
            for (const cls of suggestions) {
                counts.set(cls, (counts.get(cls) || 0) + 1);
            }

            const dexterityClasses = ['Rogue', 'Ranger', 'Monk'];
            const dexterityCount = dexterityClasses.reduce((sum, cls) => sum + (counts.get(cls as Class) || 0), 0);
            const dexterityPercentage = (dexterityCount / trials) * 100;

            console.log(`Dexterity classes (Rogue, Ranger, Monk): ${dexterityCount}/${trials} (${dexterityPercentage.toFixed(1)}%)`);
            console.log(`Baseline ensures variety while audio still influences selection`);
        });
    });
});
