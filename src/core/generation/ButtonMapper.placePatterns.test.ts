/**
 * Unit tests for ButtonMapper placePatterns() function
 *
 * Tests the pattern placement writer that writes pattern keys and IDs
 * into final arrays while preserving pitch-derived keys:
 * - Full 4-key pattern written across 4 consecutive beats
 * - Pitch keys between runs preserved
 * - Multiple patterns in a single run
 * - Multiple runs separated by pitch beats
 * - Empty/edge cases (no runs, all pitch, all pattern)
 * - Interpolated fallback for any residual nulls
 *
 * Task 1.6 - Pattern Placement Rewrite
 */

import { describe, it, expect } from 'vitest';
import { placePatterns } from './ButtonMapper.js';
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

function placement<T extends DDRButton | GuitarHeroButton>(
    pattern: ButtonPattern<T>,
    startIndex: number,
): PatternPlacement<T> {
    return {
        pattern,
        startIndex,
        filledLength: pattern.keys.length,
    };
}

// =============================================================================
// Full Pattern Placement Tests
// =============================================================================

describe('placePatterns - Full Pattern Placement', () => {
    it('should write a full 4-key pattern across 4 consecutive beats', () => {
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null, // run of 4 pattern beats
        ];
        const runs = [ddrRun(4, null, null, 0)];
        const pattern = ddrPattern('roll_cw', ['up', 'right', 'down', 'left']);
        const placementsByRun = [[placement(pattern, 0)]];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual(['up', 'right', 'down', 'left']);
        expect(result.patternIds).toEqual(['roll_cw', 'roll_cw', 'roll_cw', 'roll_cw']);
    });

    it('should preserve pitch keys between runs', () => {
        const pitchKeys: (DDRButton | null)[] = [
            null, null,    // run 1: beats 0-1
            'up',          // pitch beat
            null, null,    // run 2: beats 3-4
        ];
        const runs = [
            ddrRun(2, null, 'up', 0),
            ddrRun(2, 'up', null, 3),
        ];
        const pat1 = ddrPattern('basic_lr', ['left', 'right']);
        const pat2 = ddrPattern('basic_ud', ['down', 'up']);
        const placementsByRun = [
            [placement(pat1, 0)],
            [placement(pat2, 3)],
        ];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual(['left', 'right', 'up', 'down', 'up']);
        expect(result.patternIds[0]).toBe('basic_lr');
        expect(result.patternIds[1]).toBe('basic_lr');
        expect(result.patternIds[2]).toBeUndefined(); // pitch beat
        expect(result.patternIds[3]).toBe('basic_ud');
        expect(result.patternIds[4]).toBe('basic_ud');
    });

    it('should handle multiple patterns in a single run', () => {
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null, null, null, null, null, // 8-beat run
        ];
        const runs = [ddrRun(8, null, null, 0)];
        const pat1 = ddrPattern('roll_cw', ['up', 'right', 'down', 'left']);
        const pat2 = ddrPattern('roll_ccw', ['left', 'down', 'right', 'up']);
        const placementsByRun = [[
            placement(pat1, 0),
            placement(pat2, 4),
        ]];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual([
            'up', 'right', 'down', 'left',
            'left', 'down', 'right', 'up',
        ]);
        expect(result.patternIds).toEqual([
            'roll_cw', 'roll_cw', 'roll_cw', 'roll_cw',
            'roll_ccw', 'roll_ccw', 'roll_ccw', 'roll_ccw',
        ]);
    });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('placePatterns - Edge Cases', () => {
    it('should return pitch keys unchanged when there are no runs', () => {
        const pitchKeys: (DDRButton | null)[] = ['up', 'down', 'left', 'right'];
        const runs: PatternRun<DDRButton>[] = [];
        const placementsByRun: PatternPlacement<DDRButton>[][] = [];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual(['up', 'down', 'left', 'right']);
        expect(result.patternIds).toEqual([undefined, undefined, undefined, undefined]);
    });

    it('should handle a run at the start of the song', () => {
        const pitchKeys: (DDRButton | null)[] = [
            null, null, // run at start (no previous key)
            'down',     // pitch
        ];
        const runs = [ddrRun(2, null, 'down', 0)];
        const pat = ddrPattern('basic_ud', ['up', 'down']);
        const placementsByRun = [[placement(pat, 0)]];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual(['up', 'down', 'down']);
        expect(result.patternIds).toEqual(['basic_ud', 'basic_ud', undefined]);
    });

    it('should handle a run at the end of the song', () => {
        const pitchKeys: (DDRButton | null)[] = [
            'up',       // pitch
            null, null, // run at end (no next key)
        ];
        const runs = [ddrRun(2, 'up', null, 1)];
        const pat = ddrPattern('basic_lr', ['right', 'left']);
        const placementsByRun = [[placement(pat, 1)]];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual(['up', 'right', 'left']);
        expect(result.patternIds).toEqual([undefined, 'basic_lr', 'basic_lr']);
    });

    it('should handle a pattern-only song (single run covering all beats)', () => {
        const pitchKeys: (DDRButton | null)[] = [null, null, null, null];
        const runs = [ddrRun(4, null, null, 0)];
        const pat = ddrPattern('roll_cw', ['up', 'right', 'down', 'left']);
        const placementsByRun = [[placement(pat, 0)]];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual(['up', 'right', 'down', 'left']);
        expect(result.patternIds).toEqual(['roll_cw', 'roll_cw', 'roll_cw', 'roll_cw']);
    });
});

// =============================================================================
// Interpolated Fallback
// =============================================================================

describe('placePatterns - Interpolated Fallback', () => {
    it('should interpolate any remaining null keys as a safety net', () => {
        // If a run has a gap not covered by any placement, placePatterns
        // should fill it via interpolation rather than leaving nulls
        const pitchKeys: (DDRButton | null)[] = [
            null, null, // beats covered by placement
            null,       // beat NOT covered by any placement (gap)
            'right',    // pitch beat
        ];
        const runs = [ddrRun(3, null, 'right', 0)];
        const pat = ddrPattern('basic', ['up', 'down']);
        const placementsByRun = [[placement(pat, 0)]];
        // Only 2 of 3 beats covered; beat 2 is still null

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        // Beat 0 and 1 should be from the pattern
        expect(result.keys[0]).toBe('up');
        expect(result.keys[1]).toBe('down');
        // Beat 2 should be interpolated (not null)
        expect(result.keys[2]).not.toBeNull();
        // Beat 3 should still be the pitch key
        expect(result.keys[3]).toBe('right');
    });
});

// =============================================================================
// Guitar Hero Tests
// =============================================================================

describe('placePatterns - Guitar Hero', () => {
    it('should place a Guitar Hero pattern correctly', () => {
        const pitchKeys: (GuitarHeroButton | null)[] = [
            null, null, null,
            3,
            null, null,
        ];
        const runs: PatternRun<GuitarHeroButton>[] = [
            { startIndex: 0, endIndex: 3, length: 3, previousKey: null, nextKey: 3 },
            { startIndex: 4, endIndex: 6, length: 2, previousKey: 3, nextKey: null },
        ];
        const pat1 = ghPattern('ascending', [1, 2, 3]);
        const pat2 = ghPattern('slide', [4, 5]);
        const placementsByRun = [
            [placement(pat1, 0)],
            [placement(pat2, 4)],
        ];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toEqual([1, 2, 3, 3, 4, 5]);
        expect(result.patternIds).toEqual([
            'ascending', 'ascending', 'ascending',
            undefined,
            'slide', 'slide',
        ]);
    });
});

// =============================================================================
// Array Length Consistency
// =============================================================================

describe('placePatterns - Array Length Consistency', () => {
    it('should return keys and patternIds of the same length as input', () => {
        const pitchKeys: (DDRButton | null)[] = [null, null, 'up', null, null, null, 'down', null];
        const runs = [
            ddrRun(2, null, 'up', 0),
            ddrRun(3, 'up', 'down', 3),
            ddrRun(1, 'down', null, 7),
        ];
        const p1 = ddrPattern('a', ['left', 'right']);
        const p2 = ddrPattern('b', ['right', 'down', 'left']);
        const p3 = ddrPattern('c', ['right']);
        const placementsByRun = [
            [placement(p1, 0)],
            [placement(p2, 3)],
            [placement(p3, 7)],
        ];

        const result = placePatterns(pitchKeys, runs, placementsByRun);

        expect(result.keys).toHaveLength(8);
        expect(result.patternIds).toHaveLength(8);
        // No null keys in output
        expect(result.keys.every(k => k !== null)).toBe(true);
    });
});
