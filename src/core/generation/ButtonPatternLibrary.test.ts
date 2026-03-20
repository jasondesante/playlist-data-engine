/**
 * Unit tests for ButtonPatternLibrary
 *
 * Tests the button pattern library functionality including:
 * - Pattern library construction
 * - DDR patterns (basic, roll, stream, jump, transition)
 * - Guitar Hero patterns (basic, alternating, chord, jump, transition)
 * - Helper functions for pattern retrieval
 */

import { describe, it, expect } from 'vitest';
import {
    DDR_PATTERN_LIBRARY,
    GUITAR_HERO_PATTERN_LIBRARY,
    getPatternLibrary,
    getPatternsByCategory,
    getPatternsByDifficulty,
    getPatternsByTags,
    getPatternsByKeyCount,
    getRandomPattern,
    getPatternById,
    getPatternLibraryStats,
} from './ButtonPatternLibrary.js';
import type {
    DDRButton,
    GuitarHeroButton,
    ButtonPattern,
    ButtonPatternCategory,
} from '../types/ButtonMapping.js';

// =============================================================================
// DDR PATTERN LIBRARY TESTS
// =============================================================================

describe('DDR Pattern Library', () => {
    describe('Library Structure', () => {
        it('should have correct controller mode', () => {
            expect(DDR_PATTERN_LIBRARY.controllerMode).toBe('ddr');
        });

        it('should contain basic patterns', () => {
            const basicPatterns = DDR_PATTERN_LIBRARY.byCategory.get('basic');
            expect(basicPatterns).toBeDefined();
            expect(basicPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain roll patterns', () => {
            const rollPatterns = DDR_PATTERN_LIBRARY.byCategory.get('roll');
            expect(rollPatterns).toBeDefined();
            expect(rollPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain stream patterns', () => {
            const streamPatterns = DDR_PATTERN_LIBRARY.byCategory.get('stream');
            expect(streamPatterns).toBeDefined();
            expect(streamPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain jump patterns', () => {
            const jumpPatterns = DDR_PATTERN_LIBRARY.byCategory.get('jump');
            expect(jumpPatterns).toBeDefined();
            expect(jumpPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain transition patterns', () => {
            const transitionPatterns = DDR_PATTERN_LIBRARY.byCategory.get('transition');
            expect(transitionPatterns).toBeDefined();
            expect(transitionPatterns!.length).toBeGreaterThan(0);
        });
    });

    describe('Basic Patterns', () => {
        it('should have single key patterns for each direction', () => {
            const basicPatterns = DDR_PATTERN_LIBRARY.byCategory.get('basic')!;
            const directions: DDRButton[] = ['up', 'down', 'left', 'right'];

            for (const dir of directions) {
                const singlePattern = basicPatterns.find(
                    p => p.keys.length === 1 && p.keys[0] === dir
                );
                expect(singlePattern).toBeDefined();
                expect(singlePattern!.tags).toContain('single');
            }
        });

        it('should have alternating patterns', () => {
            const basicPatterns = DDR_PATTERN_LIBRARY.byCategory.get('basic')!;
            const alternatingPatterns = basicPatterns.filter(p =>
                p.tags.includes('alternating')
            );
            expect(alternatingPatterns.length).toBeGreaterThan(0);
        });

        it('should have correct difficulty range for basic patterns (1-2)', () => {
            const basicPatterns = DDR_PATTERN_LIBRARY.byCategory.get('basic')!;
            for (const pattern of basicPatterns) {
                expect(pattern.difficulty).toBeGreaterThanOrEqual(1);
                expect(pattern.difficulty).toBeLessThanOrEqual(2);
            }
        });
    });

    describe('Roll Patterns', () => {
        it('should have clockwise rolls', () => {
            const rollPatterns = DDR_PATTERN_LIBRARY.byCategory.get('roll')!;
            const clockwiseRoll = rollPatterns.find(p =>
                p.tags.includes('clockwise') && p.keys.length === 4
            );
            expect(clockwiseRoll).toBeDefined();
            expect(clockwiseRoll!.keys).toEqual(['up', 'right', 'down', 'left']);
        });

        it('should have counter-clockwise rolls', () => {
            const rollPatterns = DDR_PATTERN_LIBRARY.byCategory.get('roll')!;
            const counterClockwiseRoll = rollPatterns.find(p =>
                p.tags.includes('counterclockwise') && p.keys.length === 4
            );
            expect(counterClockwiseRoll).toBeDefined();
            expect(counterClockwiseRoll!.keys).toEqual(['up', 'left', 'down', 'right']);
        });

        it('should have half rolls', () => {
            const rollPatterns = DDR_PATTERN_LIBRARY.byCategory.get('roll')!;
            const halfRolls = rollPatterns.filter(p =>
                p.tags.includes('half') && p.keys.length === 3
            );
            expect(halfRolls.length).toBeGreaterThan(0);
        });
    });

    describe('Stream Patterns', () => {
        it('should have vertical streams', () => {
            const streamPatterns = DDR_PATTERN_LIBRARY.byCategory.get('stream')!;
            const verticalStreams = streamPatterns.filter(p =>
                p.tags.includes('vertical')
            );
            expect(verticalStreams.length).toBeGreaterThan(0);
        });

        it('should have horizontal streams', () => {
            const streamPatterns = DDR_PATTERN_LIBRARY.byCategory.get('stream')!;
            const horizontalStreams = streamPatterns.filter(p =>
                p.tags.includes('horizontal')
            );
            expect(horizontalStreams.length).toBeGreaterThan(0);
        });

        it('should have diagonal streams', () => {
            const streamPatterns = DDR_PATTERN_LIBRARY.byCategory.get('stream')!;
            const diagonalStreams = streamPatterns.filter(p =>
                p.tags.includes('diagonal')
            );
            expect(diagonalStreams.length).toBeGreaterThan(0);
        });
    });

    describe('Jump Patterns', () => {
        it('should have opposite jumps', () => {
            const jumpPatterns = DDR_PATTERN_LIBRARY.byCategory.get('jump')!;
            const oppositeJumps = jumpPatterns.filter(p =>
                p.tags.includes('opposite')
            );
            expect(oppositeJumps.length).toBeGreaterThan(0);
        });

        it('should have diagonal jumps', () => {
            const jumpPatterns = DDR_PATTERN_LIBRARY.byCategory.get('jump')!;
            const diagonalJumps = jumpPatterns.filter(p =>
                p.tags.includes('diagonal')
            );
            expect(diagonalJumps.length).toBeGreaterThan(0);
        });
    });

    describe('Pattern Validity', () => {
        it('should only use valid DDR buttons', () => {
            const validButtons: DDRButton[] = ['up', 'down', 'left', 'right'];
            for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
                for (const key of pattern.keys) {
                    expect(validButtons).toContain(key);
                }
            }
        });

        it('should have unique pattern IDs', () => {
            const ids = DDR_PATTERN_LIBRARY.patterns.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have difficulty in valid range (1-10)', () => {
            for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
                expect(pattern.difficulty).toBeGreaterThanOrEqual(1);
                expect(pattern.difficulty).toBeLessThanOrEqual(10);
            }
        });

        it('should have correct controller mode on all patterns', () => {
            for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
                expect(pattern.controllerMode).toBe('ddr');
            }
        });
    });
});

// =============================================================================
// GUITAR HERO PATTERN LIBRARY TESTS
// =============================================================================

describe('Guitar Hero Pattern Library', () => {
    describe('Library Structure', () => {
        it('should have correct controller mode', () => {
            expect(GUITAR_HERO_PATTERN_LIBRARY.controllerMode).toBe('guitar_hero');
        });

        it('should contain basic patterns', () => {
            const basicPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('basic');
            expect(basicPatterns).toBeDefined();
            expect(basicPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain chord patterns', () => {
            const chordPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('chord');
            expect(chordPatterns).toBeDefined();
            expect(chordPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain jump patterns', () => {
            const jumpPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('jump');
            expect(jumpPatterns).toBeDefined();
            expect(jumpPatterns!.length).toBeGreaterThan(0);
        });

        it('should contain transition patterns', () => {
            const transitionPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('transition');
            expect(transitionPatterns).toBeDefined();
            expect(transitionPatterns!.length).toBeGreaterThan(0);
        });
    });

    describe('Basic Patterns', () => {
        it('should have single fret patterns for each fret', () => {
            const basicPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('basic')!;
            const frets: GuitarHeroButton[] = [1, 2, 3, 4, 5];

            for (const fret of frets) {
                const singlePattern = basicPatterns.find(
                    p => p.keys.length === 1 && p.keys[0] === fret
                );
                expect(singlePattern).toBeDefined();
                expect(singlePattern!.tags).toContain('single');
            }
        });

        it('should have ascending runs', () => {
            const basicPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('basic')!;
            const ascendingRuns = basicPatterns.filter(p =>
                p.tags.includes('ascending')
            );
            expect(ascendingRuns.length).toBeGreaterThan(0);

            // Verify ascending full run is [1, 2, 3, 4, 5]
            const fullRun = ascendingRuns.find(p => p.keys.length === 5);
            expect(fullRun).toBeDefined();
            expect(fullRun!.keys).toEqual([1, 2, 3, 4, 5]);
        });

        it('should have descending runs', () => {
            const basicPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('basic')!;
            const descendingRuns = basicPatterns.filter(p =>
                p.tags.includes('descending')
            );
            expect(descendingRuns.length).toBeGreaterThan(0);

            // Verify descending full run is [5, 4, 3, 2, 1]
            const fullRun = descendingRuns.find(p => p.keys.length === 5);
            expect(fullRun).toBeDefined();
            expect(fullRun!.keys).toEqual([5, 4, 3, 2, 1]);
        });
    });

    describe('Alternating Patterns', () => {
        it('should have adjacent fret alternations', () => {
            const basicPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('basic')!;
            const adjacentAlternations = basicPatterns.filter(p =>
                p.tags.includes('alternating') && p.tags.includes('adjacent')
            );
            expect(adjacentAlternations.length).toBeGreaterThan(0);
        });

        it('should have skip fret alternations', () => {
            const basicPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('basic')!;
            const skipAlternations = basicPatterns.filter(p =>
                p.tags.includes('alternating') && p.tags.includes('skip')
            );
            expect(skipAlternations.length).toBeGreaterThan(0);
        });

        it('should have 1-3 alternation pattern', () => {
            const pattern = GUITAR_HERO_PATTERN_LIBRARY.patterns.find(
                p => p.id === 'gh_alternating_1_3'
            );
            expect(pattern).toBeDefined();
            expect(pattern!.keys).toEqual([1, 3, 1, 3]);
        });

        it('should have 2-4 alternation pattern', () => {
            const pattern = GUITAR_HERO_PATTERN_LIBRARY.patterns.find(
                p => p.id === 'gh_alternating_2_4'
            );
            expect(pattern).toBeDefined();
            expect(pattern!.keys).toEqual([2, 4, 2, 4]);
        });
    });

    describe('Chord Patterns', () => {
        it('should have power chord patterns', () => {
            const chordPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('chord')!;
            const powerChords = chordPatterns.filter(p =>
                p.tags.includes('power')
            );
            expect(powerChords.length).toBeGreaterThan(0);
        });

        it('should have full power chord (1-3-5)', () => {
            const pattern = GUITAR_HERO_PATTERN_LIBRARY.patterns.find(
                p => p.id === 'gh_chord_power_full'
            );
            expect(pattern).toBeDefined();
            expect(pattern!.keys).toEqual([1, 3, 5]);
        });

        it('should have triad patterns', () => {
            const chordPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('chord')!;
            const triads = chordPatterns.filter(p => p.tags.includes('triad'));
            expect(triads.length).toBeGreaterThan(0);
        });
    });

    describe('Jump Patterns', () => {
        it('should have wide jump patterns', () => {
            const jumpPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('jump')!;
            const wideJumps = jumpPatterns.filter(p => p.tags.includes('wide'));
            expect(wideJumps.length).toBeGreaterThan(0);
        });

        it('should have 1-5 jump (widest)', () => {
            const pattern = GUITAR_HERO_PATTERN_LIBRARY.patterns.find(
                p => p.id === 'gh_jump_wide_1_5'
            );
            expect(pattern).toBeDefined();
            expect(pattern!.keys).toEqual([1, 5, 1, 5]);
        });

        it('should have position shift patterns', () => {
            const jumpPatterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get('jump')!;
            const shifts = jumpPatterns.filter(p => p.tags.includes('shift'));
            expect(shifts.length).toBeGreaterThan(0);
        });
    });

    describe('Pattern Validity', () => {
        it('should only use valid Guitar Hero buttons', () => {
            const validButtons: GuitarHeroButton[] = [1, 2, 3, 4, 5];
            for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
                for (const key of pattern.keys) {
                    expect(validButtons).toContain(key);
                }
            }
        });

        it('should have unique pattern IDs', () => {
            const ids = GUITAR_HERO_PATTERN_LIBRARY.patterns.map(p => p.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have difficulty in valid range (1-10)', () => {
            for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
                expect(pattern.difficulty).toBeGreaterThanOrEqual(1);
                expect(pattern.difficulty).toBeLessThanOrEqual(10);
            }
        });

        it('should have correct controller mode on all patterns', () => {
            for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
                expect(pattern.controllerMode).toBe('guitar_hero');
            }
        });
    });
});

// =============================================================================
// HELPER FUNCTION TESTS
// =============================================================================

describe('Helper Functions', () => {
    describe('getPatternLibrary', () => {
        it('should return DDR library for ddr mode', () => {
            const library = getPatternLibrary('ddr');
            expect(library.controllerMode).toBe('ddr');
        });

        it('should return Guitar Hero library for guitar_hero mode', () => {
            const library = getPatternLibrary('guitar_hero');
            expect(library.controllerMode).toBe('guitar_hero');
        });
    });

    describe('getPatternsByCategory', () => {
        it('should return patterns for valid category', () => {
            const basicPatterns = getPatternsByCategory(DDR_PATTERN_LIBRARY, 'basic');
            expect(basicPatterns.length).toBeGreaterThan(0);
            for (const pattern of basicPatterns) {
                expect(pattern.category).toBe('basic');
            }
        });

        it('should return empty array for empty category', () => {
            // 'chord' category doesn't exist in DDR
            const chordPatterns = getPatternsByCategory(DDR_PATTERN_LIBRARY, 'chord');
            expect(chordPatterns).toEqual([]);
        });
    });

    describe('getPatternsByDifficulty', () => {
        it('should return patterns within difficulty range', () => {
            const patterns = getPatternsByDifficulty(DDR_PATTERN_LIBRARY, 2, 4);
            expect(patterns.length).toBeGreaterThan(0);
            for (const pattern of patterns) {
                expect(pattern.difficulty).toBeGreaterThanOrEqual(2);
                expect(pattern.difficulty).toBeLessThanOrEqual(4);
            }
        });

        it('should default to all difficulties', () => {
            const patterns = getPatternsByDifficulty(DDR_PATTERN_LIBRARY);
            expect(patterns.length).toBe(DDR_PATTERN_LIBRARY.patterns.length);
        });

        it('should return empty array for impossible range', () => {
            const patterns = getPatternsByDifficulty(DDR_PATTERN_LIBRARY, 11, 15);
            expect(patterns).toEqual([]);
        });
    });

    describe('getPatternsByTags', () => {
        it('should return patterns with all required tags', () => {
            const patterns = getPatternsByTags(DDR_PATTERN_LIBRARY, ['basic', 'alternating']);
            expect(patterns.length).toBeGreaterThan(0);
            for (const pattern of patterns) {
                expect(pattern.tags).toContain('basic');
                expect(pattern.tags).toContain('alternating');
            }
        });

        it('should return empty array when no patterns match', () => {
            const patterns = getPatternsByTags(DDR_PATTERN_LIBRARY, ['nonexistent_tag']);
            expect(patterns).toEqual([]);
        });
    });

    describe('getPatternsByKeyCount', () => {
        it('should return patterns with exact key count', () => {
            const patterns = getPatternsByKeyCount(DDR_PATTERN_LIBRARY, 4);
            expect(patterns.length).toBeGreaterThan(0);
            for (const pattern of patterns) {
                expect(pattern.keys.length).toBe(4);
            }
        });

        it('should return empty array when no patterns match', () => {
            const patterns = getPatternsByKeyCount(DDR_PATTERN_LIBRARY, 100);
            expect(patterns).toEqual([]);
        });
    });

    describe('getRandomPattern', () => {
        it('should return a pattern from the library', () => {
            const pattern = getRandomPattern(DDR_PATTERN_LIBRARY);
            expect(pattern).toBeDefined();
            expect(DDR_PATTERN_LIBRARY.patterns).toContain(pattern);
        });

        it('should respect filter function', () => {
            const pattern = getRandomPattern(
                DDR_PATTERN_LIBRARY,
                p => p.difficulty === 1
            );
            expect(pattern).toBeDefined();
            expect(pattern!.difficulty).toBe(1);
        });

        it('should return undefined when no patterns match filter', () => {
            const pattern = getRandomPattern(
                DDR_PATTERN_LIBRARY,
                () => false
            );
            expect(pattern).toBeUndefined();
        });
    });

    describe('getPatternById', () => {
        it('should return pattern for valid ID', () => {
            const pattern = getPatternById(DDR_PATTERN_LIBRARY, 'ddr_basic_single_up');
            expect(pattern).toBeDefined();
            expect(pattern!.id).toBe('ddr_basic_single_up');
        });

        it('should return undefined for invalid ID', () => {
            const pattern = getPatternById(DDR_PATTERN_LIBRARY, 'nonexistent_pattern');
            expect(pattern).toBeUndefined();
        });
    });

    describe('getPatternLibraryStats', () => {
        it('should return correct stats for DDR library', () => {
            const stats = getPatternLibraryStats(DDR_PATTERN_LIBRARY);

            expect(stats.totalPatterns).toBe(DDR_PATTERN_LIBRARY.patterns.length);
            expect(stats.totalPatterns).toBeGreaterThan(0);

            // Verify category counts
            const categoryTotal = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
            expect(categoryTotal).toBe(stats.totalPatterns);

            // Verify difficulty counts
            const difficultyTotal = Object.values(stats.byDifficulty).reduce((a, b) => a + b, 0);
            expect(difficultyTotal).toBe(stats.totalPatterns);

            // Verify key count stats
            expect(stats.minKeys).toBeGreaterThanOrEqual(1);
            expect(stats.maxKeys).toBeGreaterThanOrEqual(stats.minKeys);
            expect(stats.averageKeyCount).toBeGreaterThanOrEqual(stats.minKeys);
            expect(stats.averageKeyCount).toBeLessThanOrEqual(stats.maxKeys);
        });

        it('should return correct stats for Guitar Hero library', () => {
            const stats = getPatternLibraryStats(GUITAR_HERO_PATTERN_LIBRARY);

            expect(stats.totalPatterns).toBe(GUITAR_HERO_PATTERN_LIBRARY.patterns.length);
            expect(stats.totalPatterns).toBeGreaterThan(0);

            // Verify category counts
            const categoryTotal = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
            expect(categoryTotal).toBe(stats.totalPatterns);
        });
    });
});

// =============================================================================
// CROSS-LIBRARY TESTS
// =============================================================================

describe('Cross-Library Tests', () => {
    it('should have no ID collisions between libraries', () => {
        const ddrIds = new Set(DDR_PATTERN_LIBRARY.patterns.map(p => p.id));
        const ghIds = new Set(GUITAR_HERO_PATTERN_LIBRARY.patterns.map(p => p.id));

        for (const id of ddrIds) {
            expect(ghIds.has(id)).toBe(false);
        }
    });

    it('should have DDR patterns use DDRButton type', () => {
        for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
            for (const key of pattern.keys) {
                expect(['up', 'down', 'left', 'right']).toContain(key);
            }
        }
    });

    it('should have Guitar Hero patterns use GuitarHeroButton type', () => {
        for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
            for (const key of pattern.keys) {
                expect([1, 2, 3, 4, 5]).toContain(key);
            }
        }
    });
});
