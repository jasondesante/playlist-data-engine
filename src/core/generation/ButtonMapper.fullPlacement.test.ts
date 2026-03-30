/**
 * Integration tests for full pattern placement pipeline.
 *
 * Tests the complete flow:
 *   identifyPatternRuns() → selectPatternForRun() → placePatterns()
 *
 * These tests verify that the run-based placement pipeline produces correct
 * results for various scenarios: exact-fit runs, multi-pattern runs, residual
 * beats, gaps between pitch beats, and pattern-only songs.
 *
 * Task 2.1 - Pattern Placement Rewrite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    identifyPatternRuns,
    selectPatternForRun,
    placePatterns,
} from './ButtonMapper.js';
import type { DDRButton, GuitarHeroButton, ButtonPattern } from '../types/ButtonMapping.js';
import type { PatternRun } from './ButtonMapper.js';

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

/** Full pipeline: classify (from pitchKeys) → runs → select → place */
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

// =============================================================================
// Test 1: 4-beat pattern run → single 4-beat pattern placed
// =============================================================================

describe('Full Placement Pipeline - 4-beat run', () => {
    it('should place a single 4-beat pattern across a 4-beat run with all keys from pattern', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null, // 4-beat pattern run
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // All 4 keys should come from the pattern
        expect(result.keys).toEqual(['up', 'right', 'down', 'left']);
        // All 4 beats should share the same patternId
        expect(result.patternIds).toEqual(['roll_cw', 'roll_cw', 'roll_cw', 'roll_cw']);
        // Arrays should be same length as input
        expect(result.keys).toHaveLength(4);
        expect(result.patternIds).toHaveLength(4);
        // No null keys
        expect(result.keys.every(k => k !== null)).toBe(true);

        spy.mockRestore();
    });

    it('should use all keys from the pattern (not just keys[0])', () => {
        // Verifies the core fix: all keys in the pattern sequence are used
        const lib = [
            ddrPattern('zigzag', ['left', 'up', 'right', 'down', 'left'], 3, 'stream'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null, null, // 5-beat run
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // All 5 keys from the zigzag pattern should be present
        expect(result.keys).toEqual(['left', 'up', 'right', 'down', 'left']);
        expect(result.patternIds.every(p => p === 'zigzag')).toBe(true);

        spy.mockRestore();
    });
});

// =============================================================================
// Test 2: 8-beat pattern run → two 4-beat patterns placed
// =============================================================================

describe('Full Placement Pipeline - 8-beat run', () => {
    it('should place two 4-beat patterns for an 8-beat run', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null, null, null, null, null, // 8-beat run
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // All 8 beats should have keys
        expect(result.keys).toHaveLength(8);
        expect(result.keys.every(k => k !== null)).toBe(true);

        // First 4 beats should be one pattern, second 4 beats another
        // (variety constraint prevents using the same pattern consecutively)
        expect(result.patternIds[0]).toBe(result.patternIds[1]);
        expect(result.patternIds[0]).toBe(result.patternIds[2]);
        expect(result.patternIds[0]).toBe(result.patternIds[3]);
        // Second group should be a different pattern
        expect(result.patternIds[4]).toBe(result.patternIds[5]);
        expect(result.patternIds[4]).toBe(result.patternIds[6]);
        expect(result.patternIds[4]).toBe(result.patternIds[7]);
        expect(result.patternIds[0]).not.toBe(result.patternIds[4]);

        // Verify first group keys match the pattern
        const firstPatternId = result.patternIds[0];
        const firstPattern = lib.find(p => p.id === firstPatternId)!;
        expect(result.keys.slice(0, 4)).toEqual(firstPattern.keys);

        spy.mockRestore();
    });

    it('should produce consecutive same-patternId for each placement', () => {
        // pattern_a ends with 'left', pattern_b starts with 'up' (differs from 'left')
        // so pattern_b is compatible after pattern_a
        const lib = [
            ddrPattern('pattern_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('pattern_b', ['up', 'left', 'down', 'right'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = new Array(8).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Scan for pattern placement groups
        // Each group of 4 should have the same patternId
        const groups: { id: string; start: number; length: number }[] = [];
        let current = result.patternIds[0];
        let start = 0;
        for (let i = 1; i <= result.patternIds.length; i++) {
            if (i === result.patternIds.length || result.patternIds[i] !== current) {
                groups.push({ id: current!, start, length: i - start });
                current = result.patternIds[i];
                start = i;
            }
        }

        // Should have exactly 2 groups of 4 (variety prevents same pattern consecutively)
        expect(groups).toHaveLength(2);
        expect(groups[0].length).toBe(4);
        expect(groups[1].length).toBe(4);

        spy.mockRestore();
    });
});

// =============================================================================
// Test 3: 3-beat pattern run → 3-beat pattern or 2+1 placement
// =============================================================================

describe('Full Placement Pipeline - 3-beat run', () => {
    it('should place a 3-beat pattern for a 3-beat run', () => {
        const lib = [
            ddrPattern('half_roll', ['up', 'right', 'down'], 3, 'roll'),
            ddrPattern('full_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(3);
        expect(result.keys.every(k => k !== null)).toBe(true);

        // Should use the 3-beat pattern (exact fit preferred)
        expect(result.patternIds).toEqual(['half_roll', 'half_roll', 'half_roll']);
        expect(result.keys).toEqual(['up', 'right', 'down']);

        spy.mockRestore();
    });

    it('should use 2+1 placement when no 3-beat pattern is available', () => {
        const lib = [
            ddrPattern('two_step', ['up', 'down'], 3, 'basic'),
        ];
        const pitchKeys: (DDRButton | null)[] = [null, null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(3);
        expect(result.keys.every(k => k !== null)).toBe(true);

        // First 2 beats from the 2-beat pattern, last 1 beat interpolated
        expect(result.patternIds[0]).toBe('two_step');
        expect(result.patternIds[1]).toBe('two_step');
        expect(result.patternIds[2]).toBe('__interpolated__');

        spy.mockRestore();
    });
});

// =============================================================================
// Test 4: 1-beat gap between pitch beats → interpolated single key
// =============================================================================

describe('Full Placement Pipeline - 1-beat gap', () => {
    it('should fill a 1-beat gap between pitch beats with an interpolated key', () => {
        const lib = [
            ddrPattern('full_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            'up',     // pitch
            null,     // 1-beat gap
            'down',   // pitch
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(3);
        // Pitch beats preserved
        expect(result.keys[0]).toBe('up');
        expect(result.keys[2]).toBe('down');
        // Gap should be filled (not null)
        expect(result.keys[1]).not.toBeNull();
        // Gap should be interpolated (no multi-beat pattern fits)
        expect(result.patternIds[1]).toBe('__interpolated__');
        // Pitch beats should have no patternId
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds[2]).toBeUndefined();

        spy.mockRestore();
    });

    it('should produce a smooth interpolated key between pitch beats', () => {
        // left → [gap] → right: interpolated should be adjacent to both
        const lib: ButtonPattern<DDRButton>[] = [];
        const pitchKeys: (DDRButton | null)[] = ['left', null, 'right'];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys[0]).toBe('left');
        expect(result.keys[2]).toBe('right');
        // Interpolated key between left and right should be 'up' or 'down'
        // (common adjacents of left=[up,down] and right=[up,down])
        expect(['up', 'down']).toContain(result.keys[1]);

        spy.mockRestore();
    });
});

// =============================================================================
// Test 5: Pattern-only song (pitchInfluenceWeight=0, no pitch analysis)
// =============================================================================

describe('Full Placement Pipeline - Pattern-only song', () => {
    it('should fill an entire song with patterns when all pitchKeys are null', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
            ddrPattern('alt_ud', ['up', 'down', 'up', 'down'], 2, 'basic'),
        ];
        // 16-beat pattern-only song (simulates pitchInfluenceWeight=0, no pitch analysis)
        const pitchKeys: (DDRButton | null)[] = new Array(16).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Every beat should have a key
        expect(result.keys).toHaveLength(16);
        expect(result.keys.every(k => k !== null)).toBe(true);
        // Every beat should have a patternId
        expect(result.patternIds.every(p => p !== undefined)).toBe(true);
        // No beat should have pitch source (no pitch keys exist)
        // (verified by the fact that all patternIds are defined)

        spy.mockRestore();
    });

    it('should place multiple different patterns in a pattern-only song', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('alt_ud', ['up', 'down', 'up', 'down'], 2, 'basic'),
        ];
        const pitchKeys: (DDRButton | null)[] = new Array(12).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Should use variety (not all the same pattern)
        const uniquePatternIds = new Set(result.patternIds.filter(p => p !== '__interpolated__'));
        expect(uniquePatternIds.size).toBeGreaterThanOrEqual(2);

        // Total filled should equal 12
        expect(result.keys).toHaveLength(12);
        expect(result.keys.every(k => k !== null)).toBe(true);

        spy.mockRestore();
    });

    it('should handle a very short pattern-only song (1 beat)', () => {
        const lib = [
            ddrPattern('full_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(1);
        expect(result.keys[0]).not.toBeNull();
        // Only a 4-beat pattern available, so 1 beat should be interpolated
        expect(result.patternIds[0]).toBe('__interpolated__');

        spy.mockRestore();
    });
});

// =============================================================================
// Additional edge cases
// =============================================================================

describe('Full Placement Pipeline - Mixed pitch and pattern beats', () => {
    it('should preserve pitch keys and only fill null beats', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            'down',    // pitch
            null, null, // pattern run
            'up',      // pitch
            null,      // 1-beat gap
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        // Pitch beats preserved
        expect(result.keys[0]).toBe('down');
        expect(result.keys[3]).toBe('up');
        // Pattern beats filled
        expect(result.keys[1]).not.toBeNull();
        expect(result.keys[2]).not.toBeNull();
        // Gap filled
        expect(result.keys[4]).not.toBeNull();
        // Correct patternIds
        expect(result.patternIds[0]).toBeUndefined(); // pitch
        expect(result.patternIds[3]).toBeUndefined(); // pitch

        spy.mockRestore();
    });

    it('should handle runs at song start with no previousKey', () => {
        const lib = [
            ddrPattern('start_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null, // run at start (no previous)
            'down',                 // pitch after
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(5);
        expect(result.keys.every(k => k !== null)).toBe(true);
        // All 4 pattern beats should use the same pattern
        expect(result.patternIds.slice(0, 4)).toEqual([
            'start_roll', 'start_roll', 'start_roll', 'start_roll',
        ]);
        // Pitch beat preserved
        expect(result.keys[4]).toBe('down');
        expect(result.patternIds[4]).toBeUndefined();

        spy.mockRestore();
    });

    it('should handle runs at song end with no nextKey', () => {
        const lib = [
            ddrPattern('end_roll', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            'down',                 // pitch before
            null, null, null, null, // run at end (no next)
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(5);
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.keys[0]).toBe('down');
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds.slice(1, 5)).toEqual([
            'end_roll', 'end_roll', 'end_roll', 'end_roll',
        ]);

        spy.mockRestore();
    });

    it('should handle alternating single-beat gaps', () => {
        const lib = [
            ddrPattern('any_pattern', ['up', 'right'], 3, 'basic'),
        ];
        const pitchKeys: (DDRButton | null)[] = [
            'up', null, 'down', null, 'left', null, 'right',
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineDDR(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(7);
        expect(result.keys.every(k => k !== null)).toBe(true);
        // Pitch beats preserved
        expect(result.keys[0]).toBe('up');
        expect(result.keys[2]).toBe('down');
        expect(result.keys[4]).toBe('left');
        expect(result.keys[6]).toBe('right');
        // Gaps filled (interpolated since no 1-beat pattern in library)
        expect(result.patternIds[1]).toBe('__interpolated__');
        expect(result.patternIds[3]).toBe('__interpolated__');
        expect(result.patternIds[5]).toBe('__interpolated__');

        spy.mockRestore();
    });
});

// =============================================================================
// Guitar Hero full pipeline tests
// =============================================================================

describe('Full Placement Pipeline - Guitar Hero', () => {
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

    it('should place Guitar Hero patterns for a 4-beat run', () => {
        const lib = [
            ghPattern('asc4', [1, 2, 3, 4], 3, 'basic'),
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [null, null, null, null];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        expect(result.keys).toEqual([1, 2, 3, 4]);
        expect(result.patternIds).toEqual(['asc4', 'asc4', 'asc4', 'asc4']);

        spy.mockRestore();
    });

    it('should handle Guitar Hero with pitch and pattern beats', () => {
        const lib = [
            ghPattern('asc4', [1, 2, 3, 4], 3, 'basic'),
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [
            3,                        // pitch
            null, null, null, null,   // pattern run
            5,                        // pitch
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGH(pitchKeys, lib, 10);

        expect(result.keys).toHaveLength(6);
        expect(result.keys[0]).toBe(3);
        expect(result.keys[5]).toBe(5);
        expect(result.patternIds[0]).toBeUndefined();
        expect(result.patternIds[5]).toBeUndefined();
        // Pattern beats filled
        expect(result.keys.slice(1, 5).every(k => k !== null)).toBe(true);

        spy.mockRestore();
    });
});
