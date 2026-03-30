/**
 * Unit tests for ButtonMapper selectPatternForRun() function
 *
 * Tests the greedy largest-first pattern selection for filling pattern runs:
 * - Exact-fit pattern selected when run length matches a pattern
 * - Largest-fit pattern selected for longer runs
 * - Residual beats handled via interpolation
 * - Variety constraints (no consecutive same pattern, category preference)
 * - Pattern memory (recently used pattern avoidance)
 * - Boundary transition handling
 *
 * Task 1.5 - Pattern Placement Rewrite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectPatternForRun } from './ButtonMapper.js';
import type { DDRButton, GuitarHeroButton, ButtonPattern } from '../types/ButtonMapping.js';
import type { PatternRun, PatternPlacement } from './ButtonMapper.js';

// =============================================================================
// Helpers
// =============================================================================

function ddrPattern(
    id: string,
    keys: DDRButton[],
    difficulty = 3,
    category: ButtonPattern<DDRButton>['category'] = 'basic'
): ButtonPattern<DDRButton> {
    return {
        id,
        name: id,
        controllerMode: 'ddr',
        keys,
        measures: 1,
        tags: [],
        category,
        difficulty,
    };
}

function ghPattern(
    id: string,
    keys: GuitarHeroButton[],
    difficulty = 3,
    category: ButtonPattern<GuitarHeroButton>['category'] = 'basic'
): ButtonPattern<GuitarHeroButton> {
    return {
        id,
        name: id,
        controllerMode: 'guitar_hero',
        keys,
        measures: 1,
        tags: [],
        category,
        difficulty,
    };
}

function ddrRun(
    length: number,
    previousKey: DDRButton | null = null,
    nextKey: DDRButton | null = null,
    startIndex = 0,
): PatternRun<DDRButton> {
    return { startIndex, endIndex: startIndex + length, length, previousKey, nextKey };
}

function ghRun(
    length: number,
    previousKey: GuitarHeroButton | null = null,
    nextKey: GuitarHeroButton | null = null,
    startIndex = 0,
): PatternRun<GuitarHeroButton> {
    return { startIndex, endIndex: startIndex + length, length, previousKey, nextKey };
}

/** Sum of filledLength across all placements */
function totalFilled(placements: PatternPlacement<any>[]): number {
    return placements.reduce((sum, p) => sum + p.filledLength, 0);
}

// =============================================================================
// Exact-Fit Pattern Tests
// =============================================================================

describe('selectPatternForRun - Exact-Fit Selection', () => {
    it('should select an exact-fit 4-beat pattern for a 4-beat run', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('basic_ud', ['up', 'down'], 2, 'basic'),
        ];
        const run = ddrRun(4, 'left', 'up');
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(1);
        expect(placements[0].pattern.keys).toEqual(['up', 'right', 'down', 'left']);
        expect(placements[0].filledLength).toBe(4);
        expect(placements[0].startIndex).toBe(0);
        expect(totalFilled(placements)).toBe(4);

        spy.mockRestore();
    });

    it('should select an exact-fit pattern that satisfies exit transition', () => {
        const lib = [
            // This one: lastKey='left', nextKey='up' → adjacent ✓
            ddrPattern('ends_ok', ['up', 'right', 'down', 'left'], 3, 'roll'),
            // This one: lastKey='down', nextKey='up' → NOT adjacent (up's adj = [left,right])
            ddrPattern('ends_bad', ['right', 'up', 'left', 'down'], 3, 'roll'),
        ];
        const run = ddrRun(4, null, 'up');
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // With random=0, it should pick 'ends_ok' (the compatible one)
        expect(placements).toHaveLength(1);
        expect(placements[0].pattern.id).toBe('ends_ok');

        spy.mockRestore();
    });

    it('should fall back to largest-fit when no exact-fit is compatible', () => {
        const lib = [
            ddrPattern('bad_4beat', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('good_2beat', ['right', 'down'], 2, 'basic'),
            ddrPattern('good_1beat', ['right'], 1, 'basic'),
        ];
        // previousKey='up', exact 4-beat starts with 'up' → rejected (same as prev)
        // 2-beat starts with 'right' (differs from 'up') → compatible
        const run = ddrRun(4, 'up', null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // Should use 2-beat + 2-beat
        expect(totalFilled(placements)).toBe(4);
        // First placement should be a 2-beat pattern (largest compatible)
        expect(placements[0].pattern.keys.length).toBe(2);

        spy.mockRestore();
    });
});

// =============================================================================
// Largest-Fit Pattern Tests
// =============================================================================

describe('selectPatternForRun - Largest-Fit Selection', () => {
    it('should use two 4-beat patterns for an 8-beat run', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
            ddrPattern('half_r', ['up', 'right', 'down'], 3, 'roll'),
            ddrPattern('basic_2', ['up', 'down'], 2, 'basic'),
        ];
        const run = ddrRun(8, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // 4 + 4 = 8, or 4 + 3 + 1, etc. but exact-fit should be preferred
        expect(totalFilled(placements)).toBe(8);
        // First placement should be 4-beat (largest)
        expect(placements[0].filledLength).toBe(4);

        spy.mockRestore();
    });

    it('should prefer largest compatible pattern at each step', () => {
        const lib = [
            ddrPattern('p3', ['up', 'right', 'down'], 3, 'roll'),
            ddrPattern('p2a', ['up', 'right'], 2, 'basic'),
            ddrPattern('p2b', ['left', 'right'], 2, 'basic'),
            ddrPattern('p1', ['up'], 1, 'basic'),
        ];
        // Run of 3, prevKey='left' → 3-beat starts with 'up' (differs from 'left') ✓
        const run = ddrRun(3, 'left', null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(1);
        expect(placements[0].pattern.id).toBe('p3');
        expect(placements[0].filledLength).toBe(3);

        spy.mockRestore();
    });

    it('should handle an 8-beat run with multiple sizes by filling greedily', () => {
        const lib = [
            ddrPattern('size4', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('size2', ['left', 'up'], 2, 'basic'),
            ddrPattern('size1', ['up'], 1, 'basic'),
        ];
        // prevKey='up', so size4 starts with 'up' → rejected (same as prev)
        // But size2 starts with 'left' → different ✓
        const run = ddrRun(8, 'up', null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(8);
        // First placement: size2 (largest compatible)
        expect(placements[0].filledLength).toBe(2);

        spy.mockRestore();
    });
});

// =============================================================================
// Residual Beat Tests (Interpolation Fallback)
// =============================================================================

describe('selectPatternForRun - Residual Beats (Interpolation)', () => {
    it('should handle a single residual beat with interpolation', () => {
        const lib = [
            ddrPattern('size4', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('size3', ['up', 'right', 'down'], 3, 'roll'),
        ];
        // Run of 5: 4 + 1 residual (or 3 + 3 won't fit), so 4 + 1 interpolated
        const run = ddrRun(5, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(5);
        // Last placement should be interpolated (single beat)
        const last = placements[placements.length - 1];
        expect(last.filledLength).toBe(1);
        expect(last.pattern.id).toBe('__interpolated__');

        spy.mockRestore();
    });

    it('should handle 2 residual beats with interpolation when no 2-beat pattern is compatible', () => {
        const lib = [
            ddrPattern('size4', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        // Run of 6: 4 + 2 residual
        // prevKey after size4 is 'left', size4 starts with 'up' → OK for second
        // But only size4 exists, and it won't fit in remaining 2
        const run = ddrRun(6, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(6);
        // Should have: 1 placement of size4 + 2 interpolated beats
        const patternPlacements = placements.filter(p => p.pattern.id !== '__interpolated__');
        const interpPlacements = placements.filter(p => p.pattern.id === '__interpolated__');
        expect(patternPlacements).toHaveLength(1);
        expect(patternPlacements[0].filledLength).toBe(4);
        expect(interpPlacements).toHaveLength(2);
        expect(interpPlacements[0].filledLength).toBe(1);
        expect(interpPlacements[1].filledLength).toBe(1);

        spy.mockRestore();
    });

    it('should handle a 1-beat run with interpolation (no multi-beat pattern fits)', () => {
        const lib = [
            ddrPattern('size4', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('size2', ['up', 'down'], 2, 'basic'),
        ];
        const run = ddrRun(1, 'left', 'right');
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(1);
        expect(placements[0].filledLength).toBe(1);
        expect(placements[0].pattern.id).toBe('__interpolated__');

        spy.mockRestore();
    });

    it('should cover entire run with no gaps', () => {
        const lib = [
            ddrPattern('size3', ['up', 'right', 'down'], 3, 'roll'),
        ];
        // Run of 7: 3 + 3 + 1 interpolated = 7
        const run = ddrRun(7, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(7);

        spy.mockRestore();
    });

    it('should use interpolated key that transitions smoothly to nextKey', () => {
        const lib: ButtonPattern<DDRButton>[] = []; // Empty library
        const run = ddrRun(1, 'left', 'up');
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(1);
        // interpolateButton('left', 'up') → common adjacent of left and up
        // left adjacent: [up, down], up adjacent: [left, right]
        // common: none, so returns prevAdjacent[0] = 'up'
        expect(placements[0].pattern.keys[0]).toBe('up');

        spy.mockRestore();
    });
});

// =============================================================================
// Variety Tests
// =============================================================================

describe('selectPatternForRun - Variety Constraints', () => {
    it('should not place the same pattern consecutively within a run', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            // starts with 'up' (differs from 'left' = roll_cw's last key) → transitively compatible
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
        ];
        const run = ddrRun(8, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // With mock random=0: first picks roll_cw (first in array after sort)
        // Second placement should NOT be roll_cw (variety constraint)
        expect(placements.length).toBeGreaterThanOrEqual(2);
        // Check no consecutive same pattern IDs
        for (let i = 1; i < placements.length; i++) {
            if (placements[i].pattern.id !== '__interpolated__') {
                expect(placements[i].pattern.id).not.toBe(placements[i - 1].pattern.id);
            }
        }

        spy.mockRestore();
    });

    it('should prefer different categories from the last placed pattern', () => {
        const lib = [
            ddrPattern('roll_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_b', ['left', 'down', 'right', 'up'], 3, 'roll'),
            ddrPattern('basic_a', ['up', 'down', 'up', 'down'], 2, 'basic'),
        ];
        const run = ddrRun(6, null, null);
        // First: 4-beat roll_a. Remaining 2: basic_a is different category → preferred
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // First placement should be roll (4 beats)
        expect(placements[0].pattern.category).toBe('roll');
        // Second placement should prefer 'basic' (different from 'roll')
        if (placements.length >= 2 && placements[1].pattern.id !== '__interpolated__') {
            expect(placements[1].pattern.category).toBe('basic');
        }

        spy.mockRestore();
    });

    it('should relax category preference when no different-category pattern fits', () => {
        const lib = [
            ddrPattern('roll_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            // starts with 'up' (differs from 'left' = roll_a's last key) → compatible
            ddrPattern('roll_b', ['up', 'left', 'down', 'right'], 3, 'roll'),
        ];
        // Only 'roll' category available — should still place two different roll patterns
        const run = ddrRun(8, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(8);
        // Should use both roll patterns (variety prevents same consecutively)
        const patternIds = placements
            .filter(p => p.pattern.id !== '__interpolated__')
            .map(p => p.pattern.id);
        expect(new Set(patternIds).size).toBeGreaterThan(1);

        spy.mockRestore();
    });
});

// =============================================================================
// Pattern Memory Tests
// =============================================================================

describe('selectPatternForRun - Pattern Memory', () => {
    it('should avoid patterns in recentlyUsedPatternIds', () => {
        const lib = [
            ddrPattern('roll_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_b', ['left', 'down', 'right', 'up'], 3, 'roll'),
        ];
        const run = ddrRun(4, null, null);
        const recentlyUsed = new Set(['roll_a']);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10, recentlyUsed);

        // Should NOT pick roll_a (it's in recentlyUsed)
        expect(placements[0].pattern.id).not.toBe('roll_a');

        spy.mockRestore();
    });

    it('should work without recentlyUsedPatternIds (default behavior)', () => {
        const lib = [
            ddrPattern('roll_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const run = ddrRun(4, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        // No recentlyUsedPatternIds provided
        const placements = selectPatternForRun(run, lib, 10);

        expect(placements[0].pattern.id).toBe('roll_a');

        spy.mockRestore();
    });

    it('should relax pattern memory constraint when all recent patterns are needed', () => {
        const lib = [
            ddrPattern('only_pattern', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const run = ddrRun(8, null, null);
        const recentlyUsed = new Set(['only_pattern']);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        // Only one pattern exists and it's "recently used"
        // Strategy 3 (relax all) should still pick it
        const placements = selectPatternForRun(run, lib, 10, recentlyUsed);

        expect(totalFilled(placements)).toBe(8);
        expect(placements[0].pattern.id).toBe('only_pattern');

        spy.mockRestore();
    });
});

// =============================================================================
// Difficulty Filtering Tests
// =============================================================================

describe('selectPatternForRun - Difficulty Filtering', () => {
    it('should only use patterns within maxDifficulty', () => {
        const lib = [
            ddrPattern('easy_p', ['up', 'down'], 2, 'basic'),
            ddrPattern('hard_p', ['up', 'right', 'down', 'left'], 8, 'stream'),
        ];
        const run = ddrRun(4, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        // maxDifficulty = 3: hard_p (difficulty 8) should be excluded
        const placements = selectPatternForRun(run, lib, 3);

        // Should use easy_p (difficulty 2) for 2 beats, then interpolate the rest
        const patternPlacements = placements.filter(p => p.pattern.id !== '__interpolated__');
        for (const p of patternPlacements) {
            expect(p.pattern.difficulty).toBeLessThanOrEqual(3);
        }

        spy.mockRestore();
    });

    it('should return all-interpolated when no patterns meet difficulty', () => {
        const lib = [
            ddrPattern('hard_p', ['up', 'right', 'down', 'left'], 8, 'stream'),
        ];
        const run = ddrRun(4, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 3); // maxDifficulty=3, pattern=8

        // All beats should be interpolated
        expect(placements.every(p => p.pattern.id === '__interpolated__')).toBe(true);
        expect(totalFilled(placements)).toBe(4);

        spy.mockRestore();
    });
});

// =============================================================================
// Boundary Transition Tests
// =============================================================================

describe('selectPatternForRun - Boundary Transitions', () => {
    it('should consider previousKey for entry transition', () => {
        const lib = [
            ddrPattern('starts_up', ['up', 'right', 'down'], 3, 'roll'),
            ddrPattern('starts_right', ['right', 'down', 'left'], 3, 'roll'),
        ];
        // previousKey='up': starts_up would be rejected (same as prev)
        const run = ddrRun(3, 'up', null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(1);
        expect(placements[0].pattern.id).toBe('starts_right');

        spy.mockRestore();
    });

    it('should consider nextKey for exit transition on exact-fit', () => {
        const lib = [
            // lastKey='left', nextKey='up' → left adjacent to [up,down] ✓
            ddrPattern('good_exit', ['up', 'right', 'down', 'left'], 3, 'roll'),
            // lastKey='down', nextKey='up' → down adjacent to [left,right], not 'up' ✗
            ddrPattern('bad_exit', ['right', 'up', 'left', 'down'], 3, 'roll'),
        ];
        const run = ddrRun(4, null, 'up');
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // exact-fit should pick good_exit (compatible exit transition)
        expect(placements).toHaveLength(1);
        expect(placements[0].pattern.id).toBe('good_exit');

        spy.mockRestore();
    });

    it('should handle run at start of song (no previousKey)', () => {
        const lib = [
            ddrPattern('starts_up', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const run = ddrRun(4, null, null); // no previousKey
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(4);
        expect(placements[0].pattern.id).toBe('starts_up');

        spy.mockRestore();
    });

    it('should handle run at end of song (no nextKey)', () => {
        const lib = [
            ddrPattern('any_end', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const run = ddrRun(4, 'left', null); // no nextKey
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(4);

        spy.mockRestore();
    });

    it('should track previousKey through placements for inter-pattern transitions', () => {
        const lib = [
            ddrPattern('p2_first', ['up', 'right'], 2, 'basic'),
            // starts with 'down' → should be compatible after p2_first (prevKey='right')
            ddrPattern('p2_second', ['down', 'left'], 2, 'basic'),
            // starts with 'right' → should NOT be compatible after p2_first (prevKey='right', same!)
            ddrPattern('p2_same', ['right', 'down'], 2, 'basic'),
        ];
        const run = ddrRun(4, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(4);
        // Second placement should NOT start with 'right' (prevKey from first = 'right')
        if (placements.length >= 2 && placements[1].pattern.id !== '__interpolated__') {
            expect(placements[1].pattern.keys[0]).not.toBe('right');
        }

        spy.mockRestore();
    });
});

// =============================================================================
// Guitar Hero Tests
// =============================================================================

describe('selectPatternForRun - Guitar Hero Mode', () => {
    it('should select patterns with Guitar Hero keys', () => {
        const lib = [
            ghPattern('asc4', [1, 2, 3, 4], 3, 'basic'),
            ghPattern('asc2', [2, 3], 2, 'basic'),
            ghPattern('single', [3], 1, 'basic'),
        ];
        const run = ghRun(4, null, 5);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(4);
        expect(typeof placements[0].pattern.keys[0]).toBe('number');

        spy.mockRestore();
    });

    it('should respect Guitar Hero exit transitions', () => {
        const lib = [
            // lastKey=4, nextKey=5: 4 is in [null,5] since no previousKey → |4-5|=1 ✓
            ghPattern('gh_good', [2, 3, 4], 3, 'basic'),
            // lastKey=1, nextKey=5: |1-5|=4 > 1 ✗ (no previousKey context)
            ghPattern('gh_bad', [3, 2, 1], 3, 'basic'),
        ];
        const run = ghRun(3, null, 5);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(1);
        expect(placements[0].pattern.id).toBe('gh_good');

        spy.mockRestore();
    });

    it('should handle Guitar Hero residual beats with interpolation', () => {
        const lib = [
            ghPattern('gh4', [1, 2, 3, 4], 3, 'basic'),
        ];
        const run = ghRun(5, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(5);
        const last = placements[placements.length - 1];
        expect(last.pattern.id).toBe('__interpolated__');
        expect(typeof last.pattern.keys[0]).toBe('number');

        spy.mockRestore();
    });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('selectPatternForRun - Edge Cases', () => {
    it('should return empty placements for a zero-length run', () => {
        const lib = [ddrPattern('p', ['up'], 1)];
        const run = ddrRun(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(0);
    });

    it('should handle empty pattern library by interpolating all beats', () => {
        const lib: ButtonPattern<DDRButton>[] = [];
        const run = ddrRun(3, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements).toHaveLength(3);
        expect(placements.every(p => p.pattern.id === '__interpolated__')).toBe(true);

        spy.mockRestore();
    });

    it('should produce placements with correct startIndex values', () => {
        const lib = [
            ddrPattern('p4', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const run = ddrRun(6, null, null, 10); // startIndex=10
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(placements[0].startIndex).toBe(10);
        expect(placements[1].startIndex).toBe(14); // 10 + 4

        spy.mockRestore();
    });

    it('should handle run where all patterns are too large', () => {
        const lib = [
            ddrPattern('big', ['up', 'right', 'down', 'left', 'up', 'right'], 3, 'stream'),
        ];
        const run = ddrRun(2, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        // All 2 beats should be interpolated
        expect(placements).toHaveLength(2);
        expect(placements.every(p => p.pattern.id === '__interpolated__')).toBe(true);

        spy.mockRestore();
    });

    it('should filter out empty-key patterns from the library', () => {
        const lib = [
            ddrPattern('empty', [] as DDRButton[], 1, 'basic'),
            ddrPattern('normal', ['up', 'right'], 2, 'basic'),
        ];
        const run = ddrRun(2, null, null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const placements = selectPatternForRun(run, lib, 10);

        expect(totalFilled(placements)).toBe(2);
        expect(placements[0].pattern.id).toBe('normal');

        spy.mockRestore();
    });
});
