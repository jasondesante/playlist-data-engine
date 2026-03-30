/**
 * Unit tests for ButtonMapper identifyPatternRuns() function
 *
 * Tests the run detection logic that groups consecutive null (pattern-needed)
 * beats into PatternRun objects with surrounding context keys.
 *
 * Task 1.3 - Pattern Placement Rewrite
 */

import { describe, it, expect } from 'vitest';
import { identifyPatternRuns } from './ButtonMapper.js';
import type { DDRButton, GuitarHeroButton } from '../types/ButtonMapping.js';

// =============================================================================
// identifyPatternRuns Tests - DDR Mode
// =============================================================================

describe('identifyPatternRuns - DDR Mode', () => {
    it('should return empty array when all beats have pitch', () => {
        const pitchKeys: (DDRButton | null)[] = ['up', 'right', 'down', 'left'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(0);
    });

    it('should return empty array for single beat with pitch', () => {
        const pitchKeys: (DDRButton | null)[] = ['up'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(0);
    });

    it('should detect a single run for entire pattern-only song', () => {
        const pitchKeys: (DDRButton | null)[] = [null, null, null, null, null, null, null, null];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].startIndex).toBe(0);
        expect(runs[0].endIndex).toBe(8);
        expect(runs[0].length).toBe(8);
        expect(runs[0].previousKey).toBeNull();
        expect(runs[0].nextKey).toBeNull();
    });

    it('should detect multiple runs separated by pitch beats', () => {
        // Pattern: [null, null] [pitch] [null, null, null] [pitch] [null]
        const pitchKeys: (DDRButton | null)[] = [
            null, null, 'up', null, null, null, 'right', null,
        ];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(3);

        // Run 1: indices 0-1
        expect(runs[0].startIndex).toBe(0);
        expect(runs[0].endIndex).toBe(2);
        expect(runs[0].length).toBe(2);
        expect(runs[0].previousKey).toBeNull(); // Start of song
        expect(runs[0].nextKey).toBe('up');

        // Run 2: indices 3-5
        expect(runs[1].startIndex).toBe(3);
        expect(runs[1].endIndex).toBe(6);
        expect(runs[1].length).toBe(3);
        expect(runs[1].previousKey).toBe('up');
        expect(runs[1].nextKey).toBe('right');

        // Run 3: index 7
        expect(runs[2].startIndex).toBe(7);
        expect(runs[2].endIndex).toBe(8);
        expect(runs[2].length).toBe(1);
        expect(runs[2].previousKey).toBe('right');
        expect(runs[2].nextKey).toBeNull(); // End of song
    });

    it('should detect edge run at start of song', () => {
        // Pattern starts with nulls, then has pitch
        const pitchKeys: (DDRButton | null)[] = [null, null, null, 'down', 'right'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].startIndex).toBe(0);
        expect(runs[0].length).toBe(3);
        expect(runs[0].previousKey).toBeNull();
        expect(runs[0].nextKey).toBe('down');
    });

    it('should detect edge run at end of song', () => {
        // Pattern ends with nulls
        const pitchKeys: (DDRButton | null)[] = ['up', 'right', null, null, null];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].startIndex).toBe(2);
        expect(runs[0].endIndex).toBe(5);
        expect(runs[0].length).toBe(3);
        expect(runs[0].previousKey).toBe('right');
        expect(runs[0].nextKey).toBeNull();
    });

    it('should handle runs at both start and end of song', () => {
        const pitchKeys: (DDRButton | null)[] = [null, null, 'up', 'down', null];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(2);

        expect(runs[0].startIndex).toBe(0);
        expect(runs[0].previousKey).toBeNull();
        expect(runs[0].nextKey).toBe('up');

        expect(runs[1].startIndex).toBe(4);
        expect(runs[1].previousKey).toBe('down');
        expect(runs[1].nextKey).toBeNull();
    });

    it('should handle single null beat between pitch beats', () => {
        const pitchKeys: (DDRButton | null)[] = ['up', null, 'right'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].startIndex).toBe(1);
        expect(runs[0].endIndex).toBe(2);
        expect(runs[0].length).toBe(1);
        expect(runs[0].previousKey).toBe('up');
        expect(runs[0].nextKey).toBe('right');
    });

    it('should handle empty array', () => {
        const pitchKeys: (DDRButton | null)[] = [];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(0);
    });

    it('should handle alternating pitch and pattern beats', () => {
        const pitchKeys: (DDRButton | null)[] = ['up', null, 'down', null, 'left', null, 'right'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(3);
        for (const run of runs) {
            expect(run.length).toBe(1);
        }
        expect(runs[0].previousKey).toBe('up');
        expect(runs[0].nextKey).toBe('down');
        expect(runs[1].previousKey).toBe('down');
        expect(runs[1].nextKey).toBe('left');
        expect(runs[2].previousKey).toBe('left');
        expect(runs[2].nextKey).toBe('right');
    });
});

// =============================================================================
// identifyPatternRuns Tests - Guitar Hero Mode
// =============================================================================

describe('identifyPatternRuns - Guitar Hero Mode', () => {
    it('should return empty array when all beats have pitch', () => {
        const pitchKeys: (GuitarHeroButton | null)[] = [1, 2, 3, 4, 5];

        const runs = identifyPatternRuns<GuitarHeroButton>(pitchKeys);

        expect(runs).toHaveLength(0);
    });

    it('should detect a run for pattern-only song with Guitar Hero keys', () => {
        const pitchKeys: (GuitarHeroButton | null)[] = [null, null, null, null];

        const runs = identifyPatternRuns<GuitarHeroButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].length).toBe(4);
        expect(runs[0].previousKey).toBeNull();
        expect(runs[0].nextKey).toBeNull();
    });

    it('should correctly record Guitar Hero context keys', () => {
        const pitchKeys: (GuitarHeroButton | null)[] = [3, null, null, 5, null, 1];

        const runs = identifyPatternRuns<GuitarHeroButton>(pitchKeys);

        expect(runs).toHaveLength(2);

        expect(runs[0].previousKey).toBe(3);
        expect(runs[0].nextKey).toBe(5);
        expect(runs[0].startIndex).toBe(1);
        expect(runs[0].length).toBe(2);

        expect(runs[1].previousKey).toBe(5);
        expect(runs[1].nextKey).toBe(1);
        expect(runs[1].startIndex).toBe(4);
        expect(runs[1].length).toBe(1);
    });
});

// =============================================================================
// identifyPatternRuns Tests - Edge Cases
// =============================================================================

describe('identifyPatternRuns - Edge Cases', () => {
    it('should handle all-null single beat', () => {
        const pitchKeys: (DDRButton | null)[] = [null];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].startIndex).toBe(0);
        expect(runs[0].endIndex).toBe(1);
        expect(runs[0].length).toBe(1);
        expect(runs[0].previousKey).toBeNull();
        expect(runs[0].nextKey).toBeNull();
    });

    it('should handle large run in the middle', () => {
        const pitchKeys: (DDRButton | null)[] = ['up', null, null, null, null, null, null, null, null, null, null, 'down'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        expect(runs[0].startIndex).toBe(1);
        expect(runs[0].endIndex).toBe(11);
        expect(runs[0].length).toBe(10);
        expect(runs[0].previousKey).toBe('up');
        expect(runs[0].nextKey).toBe('down');
    });

    it('should handle two adjacent runs separated by single pitch beat', () => {
        const pitchKeys: (DDRButton | null)[] = [null, null, 'up', null, null];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(2);

        expect(runs[0].startIndex).toBe(0);
        expect(runs[0].endIndex).toBe(2);
        expect(runs[0].length).toBe(2);
        expect(runs[0].previousKey).toBeNull();
        expect(runs[0].nextKey).toBe('up');

        expect(runs[1].startIndex).toBe(3);
        expect(runs[1].endIndex).toBe(5);
        expect(runs[1].length).toBe(2);
        expect(runs[1].previousKey).toBe('up');
        expect(runs[1].nextKey).toBeNull();
    });

    it('should produce runs with correct endIndex (exclusive)', () => {
        const pitchKeys: (DDRButton | null)[] = [null, null, null, 'up'];

        const runs = identifyPatternRuns<DDRButton>(pitchKeys);

        expect(runs).toHaveLength(1);
        // endIndex should be exclusive — it points to the first non-null after the run
        expect(runs[0].endIndex).toBe(3);
        // length should equal endIndex - startIndex
        expect(runs[0].length).toBe(runs[0].endIndex - runs[0].startIndex);
    });
});
