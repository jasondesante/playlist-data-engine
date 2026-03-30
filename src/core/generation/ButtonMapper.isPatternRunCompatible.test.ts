/**
 * Unit tests for ButtonMapper isPatternRunCompatible() function
 *
 * Tests run-based pattern compatibility checking for both controller modes:
 * - Compatible patterns are accepted
 * - Patterns that start with the same key as previous are rejected
 * - Patterns that end with an incompatible key for next are rejected
 * - Size constraints are enforced (pattern must fit in run)
 *
 * Task 1.4 - Pattern Placement Rewrite
 */

import { describe, it, expect } from 'vitest';
import { isPatternRunCompatible } from './ButtonMapper.js';
import type { DDRButton, GuitarHeroButton, ButtonPattern } from '../types/ButtonMapping.js';
import type { PatternRun } from './ButtonMapper.js';

// =============================================================================
// Helpers
// =============================================================================

function ddrPattern(id: string, keys: DDRButton[], difficulty = 3): ButtonPattern<DDRButton> {
    return {
        id,
        name: id,
        controllerMode: 'ddr',
        keys,
        measures: 1,
        tags: [],
        category: 'basic',
        difficulty,
    };
}

function ghPattern(id: string, keys: GuitarHeroButton[], difficulty = 3): ButtonPattern<GuitarHeroButton> {
    return {
        id,
        name: id,
        controllerMode: 'guitar_hero',
        keys,
        measures: 1,
        tags: [],
        category: 'basic',
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

// =============================================================================
// isPatternRunCompatible Tests - DDR Mode
// =============================================================================

describe('isPatternRunCompatible - DDR Mode', () => {
    describe('compatible patterns accepted', () => {
        it('should accept a compatible 4-beat roll pattern in a matching run', () => {
            const pattern = ddrPattern('ddr_roll_clockwise', ['up', 'right', 'down', 'left']);
            const run = ddrRun(4, 'left', 'up');
            // previousKey='left' → firstKey='up' → different ✓
            // lastKey='left' → nextKey='up' → adjacent ✓
            expect(isPatternRunCompatible(pattern, run, 0, 'left', 'up')).toBe(true);
        });

        it('should accept a pattern with no previous or next context', () => {
            const pattern = ddrPattern('ddr_basic', ['up', 'right', 'down']);
            const run = ddrRun(4); // no previous, no next
            expect(isPatternRunCompatible(pattern, run, 0, null, null)).toBe(true);
        });

        it('should accept a single-key pattern that differs from previous', () => {
            const pattern = ddrPattern('ddr_single', ['right']);
            const run = ddrRun(4, 'up', 'down');
            expect(isPatternRunCompatible(pattern, run, 0, 'up', 'down')).toBe(true);
        });

        it('should accept a pattern whose last key equals the next key', () => {
            const pattern = ddrPattern('ddr_ends_on_up', ['left', 'up']);
            const run = ddrRun(4, 'down', 'up');
            // lastKey='up' === nextKey='up' → same is OK
            expect(isPatternRunCompatible(pattern, run, 0, 'down', 'up')).toBe(true);
        });

        it('should accept a pattern placed at a non-zero position in the run', () => {
            const pattern = ddrPattern('ddr_short', ['down', 'left']);
            const run = ddrRun(4, null, 'up');
            // Position 2 in a 4-beat run: 2 + 2 = 4 ≤ 4 ✓
            expect(isPatternRunCompatible(pattern, run, 2, 'right', 'up')).toBe(true);
        });
    });

    describe('first key same as previous rejected', () => {
        it('should reject a pattern that starts with the same key as previous', () => {
            const pattern = ddrPattern('ddr_same_start', ['up', 'right', 'down']);
            const run = ddrRun(4, 'up', 'left');
            expect(isPatternRunCompatible(pattern, run, 0, 'up', 'left')).toBe(false);
        });

        it('should reject a single-key pattern that matches previous', () => {
            const pattern = ddrPattern('ddr_single_up', ['up']);
            const run = ddrRun(4, 'up', 'down');
            expect(isPatternRunCompatible(pattern, run, 0, 'up', 'down')).toBe(false);
        });

        it('should reject when previousKey comes from another pattern in the run', () => {
            const pattern = ddrPattern('ddr_starts_right', ['right', 'down']);
            const run = ddrRun(6, null, 'left');
            // previousKey='right' from a preceding pattern, this pattern starts with 'right'
            expect(isPatternRunCompatible(pattern, run, 3, 'right', 'left')).toBe(false);
        });
    });

    describe('incompatible exit transition rejected', () => {
        it('should reject when last key is opposite of next key (DDR)', () => {
            // DDR adjacency: up↔down are NOT adjacent (they're opposite)
            // up's adjacent: [left, right]
            const pattern = ddrPattern('ddr_ends_on_down', ['left', 'down']);
            const run = ddrRun(4, 'up', 'up');
            // lastKey='down' → nextKey='up' → down's adjacent is [left, right], not 'up'
            expect(isPatternRunCompatible(pattern, run, 0, 'up', 'up')).toBe(false);
        });

        it('should reject when last key is not adjacent and not same as next', () => {
            // left's adjacent: [up, down]. Not adjacent to 'right'.
            const pattern = ddrPattern('ddr_ends_on_left', ['up', 'left']);
            const run = ddrRun(4, null, 'right');
            expect(isPatternRunCompatible(pattern, run, 0, null, 'right')).toBe(false);
        });
    });

    describe('size constraints', () => {
        it('should reject when pattern overflows the run', () => {
            const pattern = ddrPattern('ddr_long', ['up', 'right', 'down', 'left']);
            const run = ddrRun(3); // only 3 beats available
            expect(isPatternRunCompatible(pattern, run, 0, null, null)).toBe(false);
        });

        it('should reject when pattern at non-zero position overflows the run', () => {
            const pattern = ddrPattern('ddr_3beat', ['up', 'right', 'down']);
            const run = ddrRun(4); // 4 beats total
            // Position 2: 2 + 3 = 5 > 4 → overflow
            expect(isPatternRunCompatible(pattern, run, 2, null, null)).toBe(false);
        });

        it('should accept when pattern exactly fills remaining space', () => {
            const pattern = ddrPattern('ddr_2beat', ['up', 'right']);
            const run = ddrRun(4);
            // Position 2: 2 + 2 = 4 ≤ 4 ✓
            expect(isPatternRunCompatible(pattern, run, 2, null, null)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should accept when previousKey is null (start of song)', () => {
            const pattern = ddrPattern('ddr_starts_up', ['up', 'right']);
            const run = ddrRun(4, null, 'down');
            expect(isPatternRunCompatible(pattern, run, 0, null, 'down')).toBe(true);
        });

        it('should accept when nextKey is null (end of song)', () => {
            const pattern = ddrPattern('ddr_ends_anywhere', ['up', 'down']);
            const run = ddrRun(4, 'left', null);
            // firstKey='up' !== previousKey='left' ✓, no nextKey check
            expect(isPatternRunCompatible(pattern, run, 0, 'left', null)).toBe(true);
        });

        it('should accept when nextKey is null (more patterns to follow in run)', () => {
            const pattern = ddrPattern('ddr_mid', ['up', 'down']);
            const run = ddrRun(8, null, 'right');
            // Pattern placed at position 0, but nextKey is null because another pattern follows
            expect(isPatternRunCompatible(pattern, run, 0, null, null)).toBe(true);
        });

        it('should reject an empty pattern', () => {
            const pattern = ddrPattern('ddr_empty', [] as DDRButton[]);
            const run = ddrRun(4);
            expect(isPatternRunCompatible(pattern, run, 0, null, null)).toBe(false);
        });
    });
});

// =============================================================================
// isPatternRunCompatible Tests - Guitar Hero Mode
// =============================================================================

describe('isPatternRunCompatible - Guitar Hero Mode', () => {
    describe('compatible patterns accepted', () => {
        it('should accept a pattern where last key is between previous and next', () => {
            // previousKey=1, nextKey=5: pattern last key should be in [1, 5] range
            const pattern = ghPattern('gh_ascend', [2, 3, 4, 5]);
            const run = ghRun(4, 1, 5);
            expect(isPatternRunCompatible(pattern, run, 0, 1, 5)).toBe(true);
        });

        it('should accept a pattern where last key is between previous and next (descending)', () => {
            // previousKey=5, nextKey=1: pattern last key should be in [1, 5] range
            const pattern = ghPattern('gh_descend', [4, 3, 2]);
            const run = ghRun(4, 5, 1);
            expect(isPatternRunCompatible(pattern, run, 0, 5, 1)).toBe(true);
        });

        it('should accept a pattern where last key equals next key', () => {
            const pattern = ghPattern('gh_ends_same', [2, 3]);
            const run = ghRun(4, 1, 3);
            // lastKey=3 === nextKey=3
            expect(isPatternRunCompatible(pattern, run, 0, 1, 3)).toBe(true);
        });

        it('should accept a pattern with no context keys', () => {
            const pattern = ghPattern('gh_no_context', [3, 2, 4]);
            const run = ghRun(4);
            expect(isPatternRunCompatible(pattern, run, 0, null, null)).toBe(true);
        });

        it('should accept a single-fret pattern that differs from previous', () => {
            const pattern = ghPattern('gh_single', [3]);
            const run = ghRun(4, 1, 5);
            expect(isPatternRunCompatible(pattern, run, 0, 1, 5)).toBe(true);
        });
    });

    describe('first key same as previous rejected', () => {
        it('should reject a pattern that starts with the same fret as previous', () => {
            const pattern = ghPattern('gh_same_start', [3, 4, 5]);
            const run = ghRun(4, 3, 5);
            expect(isPatternRunCompatible(pattern, run, 0, 3, 5)).toBe(false);
        });
    });

    describe('incompatible exit transition rejected', () => {
        it('should reject when last key is outside the previous→next range', () => {
            // previousKey=2, nextKey=3: last key should be in [2, 3] range
            const pattern = ghPattern('gh_overshoot', [3, 4, 5]);
            const run = ghRun(4, 2, 3);
            // lastKey=5, range is [2,3], 5 > 3 → not in range
            expect(isPatternRunCompatible(pattern, run, 0, 2, 3)).toBe(false);
        });

        it('should reject when last key is below the descending range', () => {
            // previousKey=5, nextKey=3: last key should be in [3, 5] range
            const pattern = ghPattern('gh_undershoot', [4, 2, 1]);
            const run = ghRun(4, 5, 3);
            // lastKey=1, range is [3,5], 1 < 3 → not in range
            expect(isPatternRunCompatible(pattern, run, 0, 5, 3)).toBe(false);
        });
    });

    describe('no previous key context (Guitar Hero)', () => {
        it('should accept when last key is within 1 fret of nextKey', () => {
            const pattern = ghPattern('gh_near_next', [2, 3]);
            const run = ghRun(4, null, 4);
            // No previousKey, lastKey=3, nextKey=4, |3-4|=1 ≤ 1 → OK
            expect(isPatternRunCompatible(pattern, run, 0, null, 4)).toBe(true);
        });

        it('should reject when last key is more than 1 fret from nextKey (no previous)', () => {
            const pattern = ghPattern('gh_far_from_next', [1, 2]);
            const run = ghRun(4, null, 5);
            // No previousKey, lastKey=2, nextKey=5, |2-5|=3 > 1 → reject
            expect(isPatternRunCompatible(pattern, run, 0, null, 5)).toBe(false);
        });

        it('should accept when last key equals nextKey (no previous)', () => {
            const pattern = ghPattern('gh_same_next', [3, 3]);
            const run = ghRun(4, null, 3);
            // lastKey=3, nextKey=3, |3-3|=0 ≤ 1 → OK
            expect(isPatternRunCompatible(pattern, run, 0, null, 3)).toBe(true);
        });
    });

    describe('size constraints', () => {
        it('should reject when pattern overflows the Guitar Hero run', () => {
            const pattern = ghPattern('gh_long', [1, 2, 3, 4, 5]);
            const run = ghRun(3);
            expect(isPatternRunCompatible(pattern, run, 0, null, null)).toBe(false);
        });
    });
});

// =============================================================================
// isPatternRunCompatible Tests - Cross-Mode
// =============================================================================

describe('isPatternRunCompatible - Boundary Transition Details', () => {
    it('should handle DDR transition from pitch section into pattern run', () => {
        // Pitch section ends with 'up', pattern run has nextKey=null (end of song)
        const pattern = ddrPattern('ddr_from_up', ['right', 'down', 'left']);
        const run = ddrRun(4, 'up', null);
        // firstKey='right' !== previousKey='up' ✓, no nextKey
        expect(isPatternRunCompatible(pattern, run, 0, 'up', null)).toBe(true);
    });

    it('should handle DDR transition from pattern run back to pitch section', () => {
        // Pattern run has previousKey=null (start of song), pitch section starts with 'down'
        const pattern = ddrPattern('ddr_into_down', ['right', 'down']);
        const run = ddrRun(4, null, 'down');
        // lastKey='down' → nextKey='down' → same ✓
        expect(isPatternRunCompatible(pattern, run, 0, null, 'down')).toBe(true);
    });

    it('should handle Guitar Hero ascending transition through run', () => {
        // Pattern run from fret 1 to fret 5, pattern in the middle
        const pattern = ghPattern('gh_mid_ascend', [2, 3]);
        const run = ghRun(6, 1, 5);
        // firstKey=2 !== previousKey=1 ✓
        // lastKey=3, previousKey=1, nextKey=5: 1<5, 3>=1 && 3<=5 ✓
        expect(isPatternRunCompatible(pattern, run, 0, 1, 5)).toBe(true);
    });

    it('should handle same previous and next keys (Guitar Hero)', () => {
        // previous=3, next=3: lastKey should be 3 (same) or between [3,3]
        const pattern = ghPattern('gh_same_prev_next', [1, 2, 3]);
        const run = ghRun(4, 3, 3);
        // firstKey=1 !== previousKey=3 ✓
        // lastKey=3 === nextKey=3 ✓
        expect(isPatternRunCompatible(pattern, run, 0, 3, 3)).toBe(true);
    });

    it('should reject Guitar Hero when previous equals next and last key differs', () => {
        // previous=3, next=3: pattern ends on 5 → 5 ≠ 3, not in [3,3]
        const pattern = ghPattern('gh_bad_same_prev_next', [1, 2, 5]);
        const run = ghRun(4, 3, 3);
        // firstKey=1 !== previousKey=3 ✓
        // lastKey=5, previousKey=3, nextKey=3: 3<=3, 5>3 → not moving toward
        expect(isPatternRunCompatible(pattern, run, 0, 3, 3)).toBe(false);
    });
});
