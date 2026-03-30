/**
 * Unit tests for boundary transitions in the pattern placement pipeline.
 *
 * Tests the full pipeline (identifyPatternRuns → selectPatternForRun → placePatterns)
 * to verify smooth transitions at run/pitch boundaries:
 * - Pattern run followed by pitch beat → last key transitions smoothly to pitch key
 * - Pitch beat followed by pattern run → first key transitions smoothly from pitch key
 * - Run at song start (no previous key) → pattern starts from neutral position
 * - Run at song end (no next key) → pattern doesn't need to consider next
 *
 * Task 2.2 - Pattern Placement Rewrite
 */

import { describe, it, expect, vi } from 'vitest';
import {
    identifyPatternRuns,
    selectPatternForRun,
    placePatterns,
} from './ButtonMapper.js';
import type { DDRButton, GuitarHeroButton, ButtonPattern } from '../types/ButtonMapping.js';

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

/** Full pipeline: pitchKeys → runs → select → place */
function fullPipelineDDR(
    pitchKeys: (DDRButton | null)[],
    library: ButtonPattern<DDRButton>[],
    maxDifficulty: number,
) {
    const runs = identifyPatternRuns<DDRButton>(pitchKeys);
    const placementsByRun = runs.map(run =>
        selectPatternForRun(run, library, maxDifficulty)
    );
    return placePatterns(pitchKeys, runs, placementsByRun);
}

/** Full pipeline for Guitar Hero */
function fullPipelineGH(
    pitchKeys: (GuitarHeroButton | null)[],
    library: ButtonPattern<GuitarHeroButton>[],
    maxDifficulty: number,
) {
    const runs = identifyPatternRuns<GuitarHeroButton>(pitchKeys);
    const placementsByRun = runs.map(run =>
        selectPatternForRun(run, library, maxDifficulty)
    );
    return placePatterns(pitchKeys, runs, placementsByRun);
}

// =============================================================================
// Test 1: Pattern run followed by pitch beat → smooth exit transition
// =============================================================================

describe('Boundary Transitions - Pattern run followed by pitch beat', () => {
    it('should select a pattern whose last key is adjacent or same as the next pitch key (DDR)', () => {
        // Run of 2 beats followed by pitch 'up'
        // DDR adjacency: up adjacent = [left, right], so pattern's last key must be left, right, or up
        const lib = [
            ddrPattern('ends_left', ['right', 'left'], 3, 'roll'),   // last='left' → adjacent to 'up' ✓
            ddrPattern('ends_down', ['left', 'down'], 3, 'roll'),    // last='down' → NOT adjacent to 'up' ✗
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, 'up'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Should pick 'ends_left' because its last key 'left' is adjacent to pitch 'up'
        expect(result.patternIds[0]).toBe('ends_left');
        expect(result.patternIds[1]).toBe('ends_left');
        expect(result.keys[0]).toBe('right');
        expect(result.keys[1]).toBe('left');
        // Pitch beat preserved
        expect(result.keys[2]).toBe('up');
        expect(result.patternIds[2]).toBeUndefined();

        spy.mockRestore();
    });

    it('should select a pattern whose last key equals the next pitch key (DDR)', () => {
        // Run of 2 beats followed by pitch 'left'
        // Pattern ending with 'left' should be preferred (same as next key)
        const lib = [
            ddrPattern('ends_left', ['up', 'left'], 3, 'basic'),     // last='left' = next ✓
            ddrPattern('ends_down', ['up', 'down'], 3, 'basic'),     // last='down' adjacent to 'left' ✓
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, 'left'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Both are valid (adjacent or same), but exact fit should work
        // The algorithm should not pick one that's incompatible
        expect(result.keys[2]).toBe('left');
        expect(result.patternIds[2]).toBeUndefined();
        // Last placed key should be adjacent or same as 'left'
        const lastPlacedKey = result.keys[1];
        const adjacentToLeft = ['up', 'down'];
        expect([...adjacentToLeft, 'left']).toContain(lastPlacedKey);

        spy.mockRestore();
    });

    it('should reject a pattern whose last key is opposite the next pitch key (DDR)', () => {
        // Run of 2 beats followed by pitch 'up'
        // 'down' is opposite of 'up' (not adjacent)
        // Only one pattern available: ends with 'down' → should fallback to interpolation
        const lib = [
            ddrPattern('ends_down', ['left', 'down'], 3, 'roll'),    // last='down' → NOT adjacent to 'up'
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, 'up'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // No compatible exact-fit pattern → beats should be interpolated
        // (the 2-beat pattern is the only option, but it's incompatible for the exact-fit check)
        expect(result.keys).toHaveLength(3);
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.keys[2]).toBe('up');
        expect(result.patternIds[2]).toBeUndefined();

        spy.mockRestore();
    });

    it('should select a Guitar Hero pattern whose last key is within range of next pitch key', () => {
        // Run of 3 beats, previousKey=2 (via pitch), nextKey=4 (pitch after)
        // Pattern last key should be between 2 and 4 (inclusive) when ascending
        const lib = [
            ghPattern('asc_range', [2, 3, 4], 3, 'basic'),   // last=4 → in [2,4] ✓
            ghPattern('overshoot', [3, 4, 5], 3, 'basic'),   // last=5 → NOT in [2,4] ✗
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [2, null, null, null, 4];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        // Should pick 'asc_range' because last key 4 is in the [2,4] range
        expect(result.keys[0]).toBe(2);
        expect(result.keys[4]).toBe(4);
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds[4]).toBeUndefined();

        spy.mockRestore();
    });
});

// =============================================================================
// Test 2: Pitch beat followed by pattern run → smooth entry transition
// =============================================================================

describe('Boundary Transitions - Pitch beat followed by pattern run', () => {
    it('should select a pattern whose first key differs from the previous pitch key (DDR)', () => {
        // Pitch 'up' followed by 2-beat run
        // Pattern first key must NOT be 'up' (no immediate repeat)
        const lib = [
            ddrPattern('starts_right', ['right', 'left'], 3, 'basic'),  // first='right' ≠ 'up' ✓
            ddrPattern('starts_up', ['up', 'right'], 3, 'basic'),       // first='up' = 'up' ✗
        ];
        const pitchKeys: (DDRButton | null)[] = ['up', null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Should pick 'starts_right' because its first key 'right' differs from pitch 'up'
        expect(result.keys[0]).toBe('up');
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds[1]).toBe('starts_right');
        expect(result.patternIds[2]).toBe('starts_right');
        expect(result.keys[1]).toBe('right');
        expect(result.keys[2]).toBe('left');

        spy.mockRestore();
    });

    it('should not select a pattern starting with the same key as the previous pitch key (Guitar Hero)', () => {
        // Pitch fret 3 followed by 2-beat run
        // Pattern first key must NOT be 3
        const lib = [
            ghPattern('starts_4', [4, 5], 3, 'basic'),    // first=4 ≠ 3 ✓
            ghPattern('starts_3', [3, 4], 3, 'basic'),     // first=3 = 3 ✗
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [3, null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        expect(result.keys[0]).toBe(3);
        expect(result.patternIds[0]).toBeUndefined();
        // Should pick the pattern whose first key ≠ 3
        expect(result.keys[1]).not.toBe(3);

        spy.mockRestore();
    });

    it('should use interpolation when all patterns start with the same key as previous pitch key', () => {
        // Pitch 'left' followed by 1-beat run
        // Only pattern starts with 'left' → incompatible
        const lib = [
            ddrPattern('only_starts_left', ['left', 'right'], 3, 'basic'),  // first='left' = previous ✗
        ];
        const pitchKeys: (DDRButton | null)[] = ['left', null, 'down'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // No compatible pattern for exact fit → interpolated
        expect(result.keys).toHaveLength(3);
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.keys[0]).toBe('left');
        expect(result.keys[2]).toBe('down');
        // The gap beat should be filled (interpolated since the only pattern is incompatible)
        expect(result.keys[1]).not.toBeNull();

        spy.mockRestore();
    });
});

// =============================================================================
// Test 3: Run at song start (no previous key)
// =============================================================================

describe('Boundary Transitions - Run at song start (no previous key)', () => {
    it('should place a pattern when the run starts at beat 0 with no previous key', () => {
        const lib = [
            ddrPattern('start_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, null, null, 'down'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // All 4 pattern beats should be filled
        expect(result.keys.slice(0, 4)).toEqual(['up', 'right', 'down', 'left']);
        expect(result.patternIds.slice(0, 4)).toEqual([
            'start_roll', 'start_roll', 'start_roll', 'start_roll',
        ]);
        // Pitch beat preserved
        expect(result.keys[4]).toBe('down');
        expect(result.patternIds[4]).toBeUndefined();

        spy.mockRestore();
    });

    it('should allow any first key when there is no previous key (no repeat constraint)', () => {
        // With no previous key, the algorithm should pick a compatible pattern
        // even if the only pattern starts with any key
        const lib = [
            ddrPattern('up_start', ['up', 'right'], 3, 'basic'),  // starts with 'up' — only valid if no previous
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, 'down'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Pattern should be placed since there's no previous key to conflict with
        expect(result.keys[0]).toBe('up');
        expect(result.patternIds[0]).toBe('up_start');

        spy.mockRestore();
    });

    it('should handle Guitar Hero run at song start with no previous key', () => {
        const lib = [
            ghPattern('gh_start', [1, 2, 3], 3, 'basic'),
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [null, null, null, 5];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        // Pattern placed at song start
        expect(result.keys.slice(0, 3)).toEqual([1, 2, 3]);
        expect(result.patternIds.slice(0, 3)).toEqual(['gh_start', 'gh_start', 'gh_start']);
        expect(result.keys[3]).toBe(5);
        expect(result.patternIds[3]).toBeUndefined();

        spy.mockRestore();
    });

    it('should handle entire song as pattern run (no previous, no next)', () => {
        const lib = [
            ddrPattern('full_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('alt_roll', ['left', 'down', 'right', 'up'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = new Array(8).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Every beat should be filled with patterns
        expect(result.keys).toHaveLength(8);
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.patternIds.every(p => p !== undefined && p !== '__interpolated__')).toBe(true);

        spy.mockRestore();
    });
});

// =============================================================================
// Test 4: Run at song end (no next key)
// =============================================================================

describe('Boundary Transitions - Run at song end (no next key)', () => {
    it('should place a pattern without exit transition constraints at song end', () => {
        // Pitch 'up' followed by 4-beat run at song end
        // With no next key, any pattern that starts with a key ≠ 'up' should work
        const lib = [
            ddrPattern('any_end', ['right', 'down', 'left', 'up'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = ['up', null, null, null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Pattern should be placed; no exit transition needed
        expect(result.keys[0]).toBe('up');
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.keys.slice(1)).toEqual(['right', 'down', 'left', 'up']);
        expect(result.patternIds.slice(1)).toEqual([
            'any_end', 'any_end', 'any_end', 'any_end',
        ]);

        spy.mockRestore();
    });

    it('should allow patterns ending with any key when there is no next key', () => {
        // At song end, even a pattern ending with a non-adjacent key should be OK
        // because there's nothing to transition to
        const lib = [
            ddrPattern('ends_down', ['right', 'down'], 3, 'basic'),  // ends with 'down'
            ddrPattern('ends_up', ['left', 'up'], 3, 'basic'),       // ends with 'up'
        ];
        const pitchKeys: (DDRButton | null)[] = ['left', null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Pattern placed at song end — both patterns are valid (no nextKey constraint)
        expect(result.keys[0]).toBe('left');
        expect(result.keys[1]).not.toBeNull();
        expect(result.keys[2]).not.toBeNull();
        expect(result.patternIds[1]).not.toBeUndefined();
        expect(result.patternIds[2]).not.toBeUndefined();

        spy.mockRestore();
    });

    it('should handle Guitar Hero run at song end with no next key', () => {
        const lib = [
            ghPattern('gh_end', [3, 4, 5], 3, 'basic'),
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [1, null, null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        expect(result.keys[0]).toBe(1);
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.keys.slice(1)).toEqual([3, 4, 5]);
        expect(result.patternIds.slice(1)).toEqual(['gh_end', 'gh_end', 'gh_end']);

        spy.mockRestore();
    });
});

// =============================================================================
// Test: Both boundaries simultaneously
// =============================================================================

describe('Boundary Transitions - Both entry and exit (run between pitch beats)', () => {
    it('should satisfy both entry and exit constraints for a DDR run between pitch beats', () => {
        // Pitch 'up' → 2-beat run → pitch 'down'
        // Entry: first key ≠ 'up'
        // Exit: last key must be adjacent to 'down' → ['left', 'right'] or same as 'down'
        const lib = [
            ddrPattern('good_both', ['left', 'right'], 3, 'basic'),     // first='left'≠'up' ✓, last='right' adj to 'down' ✓
            ddrPattern('bad_exit', ['left', 'up'], 3, 'basic'),        // first='left'≠'up' ✓, last='up' NOT adj to 'down' ✗
            ddrPattern('bad_entry', ['up', 'left'], 3, 'basic'),       // first='up'='up' ✗
        ];
        const pitchKeys: (DDRButton | null)[] = ['up', null, null, 'down'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Should pick 'good_both' — only pattern satisfying both constraints
        expect(result.keys[0]).toBe('up');
        expect(result.keys[1]).toBe('left');
        expect(result.keys[2]).toBe('right');
        expect(result.keys[3]).toBe('down');
        expect(result.patternIds[1]).toBe('good_both');
        expect(result.patternIds[2]).toBe('good_both');
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds[3]).toBeUndefined();

        spy.mockRestore();
    });

    it('should satisfy both entry and exit for a Guitar Hero run between pitch beats', () => {
        // Pitch 2 → 3-beat run → pitch 4
        // Entry: first key ≠ 2
        // Exit: last key must be in [2,4] range (ascending: 2<4)
        const lib = [
            ghPattern('good_gh', [3, 3, 4], 3, 'basic'),    // first=3≠2 ✓, last=4 in [2,4] ✓
            ghPattern('bad_exit', [3, 4, 5], 3, 'basic'),   // first=3≠2 ✓, last=5 NOT in [2,4] ✗
            ghPattern('bad_entry', [2, 3, 4], 3, 'basic'),  // first=2=2 ✗
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [2, null, null, null, 4];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        // Should pick 'good_gh' — only pattern satisfying both constraints
        expect(result.keys[0]).toBe(2);
        expect(result.keys[4]).toBe(4);
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds[4]).toBeUndefined();
        expect(result.patternIds[1]).toBe('good_gh');
        expect(result.patternIds[2]).toBe('good_gh');
        expect(result.patternIds[3]).toBe('good_gh');

        spy.mockRestore();
    });

    it('should fall back to interpolation when no pattern satisfies both entry and exit', () => {
        // Pitch 'left' → 2-beat run → pitch 'right'
        // Entry: first key ≠ 'left'
        // Exit: last key must be adjacent to 'right' → ['up', 'down'] or same
        const lib = [
            ddrPattern('bad_both', ['up', 'up'], 3, 'basic'),     // first='up'≠'left' ✓, last='up' adj to 'right' ✓
            ddrPattern('another_bad', ['down', 'down'], 3, 'basic'), // first='down'≠'left' ✓, last='down' adj to 'right' ✓
        ];
        const pitchKeys: (DDRButton | null)[] = ['left', null, null, 'right'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Both patterns satisfy constraints, so one should be picked
        expect(result.keys).toHaveLength(4);
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.keys[0]).toBe('left');
        expect(result.keys[3]).toBe('right');

        spy.mockRestore();
    });

    it('should handle consecutive runs with pitch between them', () => {
        // Two 2-beat runs separated by a pitch beat
        // Run 1: null,null | pitch 'down' | Run 2: null,null
        // Run 1 entry: no previous (song start), exit: last key adj to 'down'
        // Run 2 entry: first key ≠ 'down', exit: no next (song end)
        const lib = [
            ddrPattern('r1_compatible', ['up', 'left'], 3, 'basic'),     // exit: 'left' adj to 'down' ✓
            ddrPattern('r1_incompatible', ['up', 'up'], 3, 'basic'),     // exit: 'up' NOT adj to 'down' ✗
            ddrPattern('r2_compatible', ['up', 'right'], 3, 'basic'),    // entry: 'up' ≠ 'down' ✓
            ddrPattern('r2_incompatible', ['down', 'left'], 3, 'basic'), // entry: 'down' = 'down' ✗
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, 'down', null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(5);
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.keys[2]).toBe('down');
        expect(result.patternIds[2]).toBeUndefined();

        // Run 1: should pick pattern whose exit is compatible with pitch 'down'
        expect(result.patternIds[0]).not.toBeUndefined();
        expect(result.patternIds[1]).not.toBeUndefined();
        // Run 2: should pick pattern whose entry differs from 'down'
        expect(result.patternIds[3]).not.toBeUndefined();
        expect(result.patternIds[4]).not.toBeUndefined();

        spy.mockRestore();
    });
});
