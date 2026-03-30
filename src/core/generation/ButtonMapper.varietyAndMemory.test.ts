/**
 * Integration tests for variety and pattern memory across the full pipeline.
 *
 * Tests the complete flow:
 *   identifyPatternRuns() → selectPatternForRun() → placePatterns()
 *
 * with emphasis on:
 * - Cross-run variety: consecutive runs don't reuse the same pattern
 * - Within-run variety: large runs use different patterns in sequence
 * - Pattern memory: the recentlyUsedPatternIds set is respected
 *
 * These tests exercise the pipeline at the same level as mapButtons(), which
 * tracks recently used patterns across runs and passes them to each call of
 * selectPatternForRun(). Since mapButtons() is a private method, we simulate
 * its cross-run tracking manually in the test helpers.
 *
 * Task 2.3 - Pattern Placement Rewrite
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

/**
 * Full pipeline with cross-run variety tracking (mirrors mapButtons behavior).
 *
 * This is the critical difference from the fullPipelineDDR helper in other test
 * files: it maintains a recentlyUsedPatternIds set that persists across runs,
 * exactly as mapButtons() does at lines 1301-1316 of ButtonMapper.ts.
 */
function fullPipelineWithMemory(
    pitchKeys: (DDRButton | null)[],
    library: ButtonPattern<DDRButton>[],
    maxDifficulty: number,
    existingMemory?: Set<string>,
) {
    const runs = identifyPatternRuns<DDRButton>(pitchKeys);
    const recentlyUsedPatternIds = existingMemory ?? new Set<string>();
    const placementsByRun = runs.map(run => {
        const placements = selectPatternForRun(
            run,
            library,
            maxDifficulty,
            recentlyUsedPatternIds,
        );
        // Update recently used set for cross-run variety (same as mapButtons)
        for (const p of placements) {
            if (p.pattern.id !== '__interpolated__') {
                recentlyUsedPatternIds.add(p.pattern.id);
            }
        }
        return placements;
    });
    const result = placePatterns(pitchKeys, runs, placementsByRun);
    return { ...result, runs, placementsByRun, recentlyUsedPatternIds };
}

/** Full pipeline for Guitar Hero with memory tracking */
function fullPipelineGHWithMemory(
    pitchKeys: (GuitarHeroButton | null)[],
    library: ButtonPattern<GuitarHeroButton>[],
    maxDifficulty: number,
    existingMemory?: Set<string>,
) {
    const runs = identifyPatternRuns<GuitarHeroButton>(pitchKeys);
    const recentlyUsedPatternIds = existingMemory ?? new Set<string>();
    const placementsByRun = runs.map(run => {
        const placements = selectPatternForRun(
            run,
            library,
            maxDifficulty,
            recentlyUsedPatternIds,
        );
        for (const p of placements) {
            if (p.pattern.id !== '__interpolated__') {
                recentlyUsedPatternIds.add(p.pattern.id);
            }
        }
        return placements;
    });
    const result = placePatterns(pitchKeys, runs, placementsByRun);
    return { ...result, runs, placementsByRun, recentlyUsedPatternIds };
}

// =============================================================================
// Test 1: Consecutive runs don't use the same pattern
// =============================================================================

describe('Variety & Memory - Consecutive runs use different patterns', () => {
    it('should not reuse a pattern from a preceding run in the next run (DDR)', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
            ddrPattern('basic_ud', ['up', 'down', 'up', 'down'], 2, 'basic'),
        ];
        // Two 4-beat runs separated by a pitch beat
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null,  // Run 1
            'down',                  // Pitch beat separator
            null, null, null, null,  // Run 2
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        // Both runs should be fully filled
        expect(result.keys.every(k => k !== null)).toBe(true);

        // Get the pattern IDs used in each run
        const run1Ids = new Set(result.patternIds.slice(0, 4));
        const run2Ids = new Set(result.patternIds.slice(5, 9));

        // Run 2 should not contain any pattern ID that was used in Run 1
        for (const id of run1Ids) {
            if (id !== '__interpolated__') {
                expect(run2Ids.has(id)).toBe(false);
            }
        }

        spy.mockRestore();
    });

    it('should not reuse a pattern from one run when three runs exist (DDR)', () => {
        const lib = [
            ddrPattern('pat_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('pat_b', ['left', 'down', 'right', 'up'], 3, 'roll'),
            ddrPattern('pat_c', ['right', 'up', 'left', 'down'], 3, 'roll'),
        ];
        // Three 4-beat runs separated by pitch beats
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null,  // Run 1
            'down',                  // Pitch separator
            null, null, null, null,  // Run 2
            'up',                    // Pitch separator
            null, null, null, null,  // Run 3
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        const run1Ids = new Set(result.patternIds.slice(0, 4));
        const run2Ids = new Set(result.patternIds.slice(5, 9));
        const run3Ids = new Set(result.patternIds.slice(10, 14));

        // Run 2 should not reuse Run 1's patterns
        for (const id of run1Ids) {
            if (id !== '__interpolated__') {
                expect(run2Ids.has(id)).toBe(false);
            }
        }
        // Run 3 should not reuse Run 1 or Run 2's patterns
        for (const id of run1Ids) {
            if (id !== '__interpolated__') {
                expect(run3Ids.has(id)).toBe(false);
            }
        }
        for (const id of run2Ids) {
            if (id !== '__interpolated__') {
                expect(run3Ids.has(id)).toBe(false);
            }
        }

        spy.mockRestore();
    });

    it('should track variety across consecutive runs for Guitar Hero', () => {
        const lib = [
            ghPattern('gh_asc', [1, 2, 3, 4], 3, 'basic'),
            ghPattern('gh_desc', [4, 3, 2, 1], 3, 'basic'),
            ghPattern('gh_wave', [2, 3, 2, 1], 3, 'basic'),
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = [
            null, null, null, null,  // Run 1
            3,                        // Pitch separator
            null, null, null, null,  // Run 2
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGHWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        const run1Ids = new Set(result.patternIds.slice(0, 4));
        const run2Ids = new Set(result.patternIds.slice(5, 9));

        for (const id of run1Ids) {
            if (id !== '__interpolated__') {
                expect(run2Ids.has(id)).toBe(false);
            }
        }

        spy.mockRestore();
    });
});

// =============================================================================
// Test 2: Large run uses different patterns in sequence
// =============================================================================

describe('Variety & Memory - Large runs use different patterns in sequence', () => {
    it('should not repeat the same pattern consecutively within a large run (DDR)', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
            ddrPattern('alt_ud', ['up', 'down', 'up', 'down'], 2, 'basic'),
        ];
        // 12-beat run — enough room for 3× 4-beat patterns or mixed sizes
        const pitchKeys: (DDRButton | null)[] = new Array(12).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        // Group consecutive same-patternId beats into placements
        const groups: { id: string; length: number }[] = [];
        let current = result.patternIds[0];
        let groupLen = 1;
        for (let i = 1; i < result.patternIds.length; i++) {
            if (result.patternIds[i] === current) {
                groupLen++;
            } else {
                groups.push({ id: current!, length: groupLen });
                current = result.patternIds[i];
                groupLen = 1;
            }
        }
        groups.push({ id: current!, length: groupLen });

        // No two consecutive groups should have the same pattern ID
        for (let i = 1; i < groups.length; i++) {
            if (groups[i].id !== '__interpolated__' && groups[i - 1].id !== '__interpolated__') {
                expect(groups[i].id).not.toBe(groups[i - 1].id);
            }
        }

        spy.mockRestore();
    });

    it('should use at least 2 different patterns in a 16-beat run', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('alt_ud', ['up', 'down', 'up', 'down'], 2, 'basic'),
        ];
        const pitchKeys: (DDRButton | null)[] = new Array(16).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        const uniqueIds = new Set(
            result.patternIds.filter(p => p !== '__interpolated__')
        );
        // With 16 beats and variety constraint, at least 2 different patterns
        expect(uniqueIds.size).toBeGreaterThanOrEqual(2);

        spy.mockRestore();
    });

    it('should alternate between available patterns in a long run', () => {
        // Only two patterns — algorithm must alternate between them
        const lib = [
            ddrPattern('pat_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('pat_b', ['left', 'down', 'right', 'up'], 3, 'roll'),
        ];
        // 16 beats = 4 full placements of 4 beats each
        const pitchKeys: (DDRButton | null)[] = new Array(16).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        // With deterministic random, the algorithm should alternate between pat_a and pat_b
        // No two consecutive groups should be the same
        const groups: { id: string; length: number }[] = [];
        let current = result.patternIds[0];
        let groupLen = 1;
        for (let i = 1; i < result.patternIds.length; i++) {
            if (result.patternIds[i] === current) {
                groupLen++;
            } else {
                groups.push({ id: current!, length: groupLen });
                current = result.patternIds[i];
                groupLen = 1;
            }
        }
        groups.push({ id: current!, length: groupLen });

        for (let i = 1; i < groups.length; i++) {
            if (groups[i].id !== '__interpolated__' && groups[i - 1].id !== '__interpolated__') {
                expect(groups[i].id).not.toBe(groups[i - 1].id);
            }
        }

        spy.mockRestore();
    });

    it('should handle a long run with mixed pattern sizes while maintaining variety', () => {
        const lib = [
            ddrPattern('size4_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('size4_b', ['left', 'down', 'right', 'up'], 3, 'roll'),
            ddrPattern('size2_a', ['up', 'down'], 3, 'basic'),
            ddrPattern('size2_b', ['left', 'right'], 3, 'basic'),
        ];
        // 10-beat run — room for mixed sizes like 4+4+2, 4+2+4, etc.
        const pitchKeys: (DDRButton | null)[] = new Array(10).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.keys).toHaveLength(10);

        // Group consecutive same-patternId beats
        const groups: { id: string; length: number }[] = [];
        let current = result.patternIds[0];
        let groupLen = 1;
        for (let i = 1; i < result.patternIds.length; i++) {
            if (result.patternIds[i] === current) {
                groupLen++;
            } else {
                groups.push({ id: current!, length: groupLen });
                current = result.patternIds[i];
                groupLen = 1;
            }
        }
        groups.push({ id: current!, length: groupLen });

        // No consecutive groups should have the same pattern ID
        for (let i = 1; i < groups.length; i++) {
            if (groups[i].id !== '__interpolated__' && groups[i - 1].id !== '__interpolated__') {
                expect(groups[i].id).not.toBe(groups[i - 1].id);
            }
        }

        spy.mockRestore();
    });

    it('should handle variety in Guitar Hero long runs', () => {
        const lib = [
            ghPattern('gh_a', [1, 2, 3, 4], 3, 'basic'),
            ghPattern('gh_b', [4, 3, 2, 1], 3, 'basic'),
        ];
        const pitchKeys: (GuitarHeroButton | null)[] = new Array(12).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineGHWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        const groups: { id: string; length: number }[] = [];
        let current = result.patternIds[0];
        let groupLen = 1;
        for (let i = 1; i < result.patternIds.length; i++) {
            if (result.patternIds[i] === current) {
                groupLen++;
            } else {
                groups.push({ id: current!, length: groupLen });
                current = result.patternIds[i];
                groupLen = 1;
            }
        }
        groups.push({ id: current!, length: groupLen });

        for (let i = 1; i < groups.length; i++) {
            if (groups[i].id !== '__interpolated__' && groups[i - 1].id !== '__interpolated__') {
                expect(groups[i].id).not.toBe(groups[i - 1].id);
            }
        }

        spy.mockRestore();
    });
});

// =============================================================================
// Test 3: Pattern memory (recentlyUsedPatternIds) respected
// =============================================================================

describe('Variety & Memory - Pattern memory (recentlyUsedPatternIds)', () => {
    it('should avoid patterns in a pre-populated recentlyUsedPatternIds set', () => {
        const lib = [
            ddrPattern('roll_cw', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('roll_ccw', ['up', 'left', 'down', 'right'], 3, 'roll'),
        ];
        // Pre-populate memory with roll_cw
        const existingMemory = new Set(['roll_cw']);
        const pitchKeys: (DDRButton | null)[] = new Array(4).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10, existingMemory);

        // Should NOT use roll_cw (it's in the memory)
        expect(result.patternIds[0]).not.toBe('roll_cw');
        // Should use roll_ccw instead
        expect(result.patternIds[0]).toBe('roll_ccw');

        spy.mockRestore();
    });

    it('should accumulate patterns across multiple runs in memory', () => {
        const lib = [
            ddrPattern('pat_a', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('pat_b', ['left', 'down', 'right', 'up'], 3, 'roll'),
            ddrPattern('pat_c', ['right', 'up', 'left', 'down'], 3, 'roll'),
        ];
        // Two runs: first uses one pattern, second should avoid it
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null,  // Run 1
            'down',                  // Pitch separator
            null, null, null, null,  // Run 2
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        // Verify memory grew to include Run 1's pattern
        const run1Id = result.patternIds[0];
        expect(result.recentlyUsedPatternIds.has(run1Id)).toBe(true);

        // Run 2 should avoid Run 1's pattern
        const run2Ids = new Set(result.patternIds.slice(5, 9));
        expect(run2Ids.has(run1Id)).toBe(false);

        spy.mockRestore();
    });

    it('should relax memory constraint when all patterns are in memory (only one option)', () => {
        const lib = [
            ddrPattern('only_pat', ['up', 'right', 'down', 'left'], 3, 'roll'),
        ];
        const existingMemory = new Set(['only_pat']);
        const pitchKeys: (DDRButton | null)[] = new Array(8).fill(null);
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10, existingMemory);

        // Even though only_pat is in memory, it should still be used
        // (the algorithm relaxes all constraints when nothing else works)
        expect(result.keys.every(k => k !== null)).toBe(true);
        expect(result.patternIds.some(p => p === 'only_pat')).toBe(true);

        spy.mockRestore();
    });

    it('should pass memory through a sequence of many runs', () => {
        const lib = [
            ddrPattern('pat_1', ['up', 'right', 'down', 'left'], 3, 'roll'),
            ddrPattern('pat_2', ['left', 'down', 'right', 'up'], 3, 'roll'),
            ddrPattern('pat_3', ['right', 'up', 'left', 'down'], 3, 'roll'),
            ddrPattern('pat_4', ['down', 'left', 'up', 'right'], 3, 'roll'),
        ];
        // Four 4-beat runs separated by pitch beats
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null, null,  // Run 1
            'down',
            null, null, null, null,  // Run 2
            'up',
            null, null, null, null,  // Run 3
            'left',
            null, null, null, null,  // Run 4
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        // Get pattern IDs per run
        const runIds = [
            new Set(result.patternIds.slice(0, 4)),
            new Set(result.patternIds.slice(5, 9)),
            new Set(result.patternIds.slice(10, 14)),
            new Set(result.patternIds.slice(15, 19)),
        ];

        // Each run should use a pattern not used by any preceding run
        const usedSoFar = new Set<string>();
        for (let r = 0; r < runIds.length; r++) {
            for (const id of runIds[r]) {
                if (id !== '__interpolated__') {
                    expect(usedSoFar.has(id)).toBe(false);
                    usedSoFar.add(id);
                }
            }
        }

        spy.mockRestore();
    });

    it('should track memory correctly even when runs produce interpolated beats', () => {
        const lib = [
            ddrPattern('pat_a', ['up', 'right', 'down'], 3, 'roll'),
        ];
        // Run 1: 3-beat run → uses pat_a
        // Run 2: 1-beat run → interpolated (no 1-beat pattern)
        // Run 3: 3-beat run → should avoid pat_a from Run 1
        const pitchKeys: (DDRButton | null)[] = [
            null, null, null,    // Run 1 (3 beats)
            'down',              // Pitch separator
            null,                // Run 2 (1 beat → interpolated)
            'up',                // Pitch separator
            null, null, null,    // Run 3 (3 beats)
        ];
        const spy = vi.spyOn(Math, 'random').mockReturnValue(0);

        const result = fullPipelineWithMemory(pitchKeys, lib, 10);

        expect(result.keys.every(k => k !== null)).toBe(true);

        // Run 1 should use pat_a
        expect(result.patternIds[0]).toBe('pat_a');

        // Run 2 should be interpolated
        expect(result.patternIds[4]).toBe('__interpolated__');

        // Run 3: pat_a is in memory, so it should be avoided
        // Only one pattern in the library, so strategy 3 relaxes constraints
        // and allows pat_a — but it should have been attempted to avoid first
        const run3Ids = new Set(result.patternIds.slice(6, 9));
        // If only one pattern exists and it's in memory, the algorithm must use it
        // but should try alternatives first. In this case there are none.
        expect(result.keys.slice(6, 9).every(k => k !== null)).toBe(true);

        spy.mockRestore();
    });
});
