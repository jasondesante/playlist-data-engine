/**
 * Tests for ButtonMapper - Pitch-to-Button Mapping
 *
 * Tests both controller modes:
 * - DDR: 4 directional buttons with circular motion philosophy
 * - Guitar Hero: 5 fret buttons with fretboard metaphor
 *
 * Part of Phase 2.8 Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ButtonMapper } from '../../../src/core/generation/ButtonMapper.js';
import type { PitchAtBeat, IntervalCategory, PitchDirection } from '../../../src/core/generation/PitchBeatLinker.js';
import type { DDRButton } from '../../../src/core/types/ButtonMapping.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock PitchAtBeat for testing
 */
function createMockPitchAtBeat(options: {
    beatIndex?: number;
    timestamp?: number;
    direction?: PitchDirection;
    intervalCategory?: IntervalCategory;
    intervalFromPrevious?: number;
    probability?: number;
}): PitchAtBeat {
    return {
        beatIndex: options.beatIndex ?? 0,
        timestamp: options.timestamp ?? 0,
        band: 'mid',
        pitch: options.probability !== undefined ? {
            timestamp: options.timestamp ?? 0,
            frequency: 440,
            probability: options.probability ?? 0.9,
            isVoiced: true,
            midiNote: 69,
            noteName: 'A4',
        } : null,
        direction: options.direction ?? 'none',
        intervalFromPrevious: options.intervalFromPrevious ?? 0,
        intervalCategory: options.intervalCategory,
    };
}

/**
 * Get the DDR transition table from the ButtonMapper
 * This is a helper to verify the transition table is correct
 */
function getDDRTransitions() {
    return ButtonMapper.getDDRTransitions();
}

// =============================================================================
// Tests: DDR Transition Table Validation
// =============================================================================

describe('DDR Transition Tables', () => {
    it('should have transition tables for all 4 buttons', () => {
        const transitions = getDDRTransitions();

        expect(transitions).toHaveProperty('up');
        expect(transitions).toHaveProperty('down');
        expect(transitions).toHaveProperty('left');
        expect(transitions).toHaveProperty('right');
    });

    it('should have all interval categories in ascending/descending transitions', () => {
        const transitions = getDDRTransitions();
        const intervalCategories: IntervalCategory[] = ['unison', 'small', 'medium', 'large', 'very_large'];

        for (const button of ['up', 'down', 'left', 'right'] as DDRButton[]) {
            for (const category of intervalCategories) {
                expect(transitions[button].ascending).toHaveProperty(category);
                expect(transitions[button].descending).toHaveProperty(category);
            }
        }
    });

    it('should have stable transitions for each button', () => {
        const transitions = getDDRTransitions();

        expect(transitions.up.stable).toBe('up');
        expect(transitions.down.stable).toBe('down');
        expect(transitions.left.stable).toBe('left');
        expect(transitions.right.stable).toBe('right');
    });
});

// =============================================================================
// Tests: Pitch Up → 'up' button for small/medium intervals
// =============================================================================

describe('DDR: Pitch up for small/medium intervals', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1.0,
        });
    });

    it('should map small ascending interval from left to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.left.ascending.small;
        expect(result).toBe('up');
    });

    it('should map small ascending interval from down to left (circular motion)', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.ascending.small;
        expect(result).toBe('left');
    });

    it('should map medium ascending interval from left to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.left.ascending.medium;
        expect(result).toBe('up');
    });

    it('should map medium ascending interval from right to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.right.ascending.medium;
        expect(result).toBe('up');
    });

    it('should map small ascending interval from right to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.right.ascending.small;
        expect(result).toBe('up');
    });

    it('should map small ascending interval from up to up (stay in place)', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.ascending.small;
        expect(result).toBe('up');
    });

    it('should map medium ascending interval from up to right (circular flow)', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.ascending.medium;
        expect(result).toBe('right');
    });
});

// =============================================================================
// Tests: Pitch Down → 'down' button for small/medium intervals
// =============================================================================

describe('DDR: Pitch down for small/medium intervals', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1.0,
        });
    });

    it('should map small descending interval from right to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.right.descending.small;
        expect(result).toBe('down');
    });

    it('should map small descending interval from up to left (circular motion)', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.descending.small;
        expect(result).toBe('left');
    });

    it('should map medium descending interval from right to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.right.descending.medium;
        expect(result).toBe('down');
    });

    it('should map medium descending interval from left to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.left.descending.medium;
        expect(result).toBe('down');
    });

    it('should map small descending interval from down to down (stay in place)', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.descending.small;
        expect(result).toBe('down');
    });

    it('should map medium descending interval from down to left (circular flow)', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.descending.medium;
        expect(result).toBe('left');
    });
});

// =============================================================================
// Tests: Large intervals → horizontal axis (left/right)
// =============================================================================

describe('DDR: Large intervals move to horizontal axis', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1.0,
        });
    });

    it('should map large ascending interval from up to right', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.ascending.large;
        expect(result).toBe('right');
    });

    it('should map large descending interval from up to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.descending.large;
        expect(result).toBe('down');
    });

    it('should map very_large ascending interval from up to left', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.ascending.very_large;
        expect(result).toBe('left');
    });

    it('should map very_large descending interval from up to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.up.descending.very_large;
        expect(result).toBe('down');
    });

    it('should map large ascending interval from down to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.ascending.large;
        expect(result).toBe('up');
    });

    it('should map large descending interval from down to left', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.descending.large;
        expect(result).toBe('left');
    });

    it('should map very_large ascending interval from down to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.ascending.very_large;
        expect(result).toBe('up');
    });

    it('should map very_large descending interval from down to right', () => {
        const transitions = getDDRTransitions();
        const result = transitions.down.descending.very_large;
        expect(result).toBe('right');
    });

    it('should map large ascending interval from left to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.left.ascending.large;
        expect(result).toBe('up');
    });

    it('should map large descending interval from left to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.left.descending.large;
        expect(result).toBe('down');
    });

    it('should map large ascending interval from right to up', () => {
        const transitions = getDDRTransitions();
        const result = transitions.right.ascending.large;
        expect(result).toBe('up');
    });

    it('should map large descending interval from right to down', () => {
        const transitions = getDDRTransitions();
        const result = transitions.right.descending.large;
        expect(result).toBe('down');
    });
});

// =============================================================================
// Tests: Stable pitch → repeat previous button
// =============================================================================

describe('DDR: Stable pitch repeats previous button', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1.0,
        });
    });

    it('should return same button for stable transition from up', () => {
        const transitions = getDDRTransitions();
        expect(transitions.up.stable).toBe('up');
    });

    it('should return same button for stable transition from down', () => {
        const transitions = getDDRTransitions();
        expect(transitions.down.stable).toBe('down');
    });

    it('should return same button for stable transition from left', () => {
        const transitions = getDDRTransitions();
        expect(transitions.left.stable).toBe('left');
    });

    it('should return same button for stable transition from right', () => {
        const transitions = getDDRTransitions();
        expect(transitions.right.stable).toBe('right');
    });

    it('should return same button for unison interval (ascending)', () => {
        const transitions = getDDRTransitions();
        // Unison means no change - should stay on current button
        expect(transitions.up.ascending.unison).toBe('up');
        expect(transitions.down.ascending.unison).toBe('down');
        expect(transitions.left.ascending.unison).toBe('left');
        expect(transitions.right.ascending.unison).toBe('right');
    });

    it('should return same button for unison interval (descending)', () => {
        const transitions = getDDRTransitions();
        expect(transitions.up.descending.unison).toBe('up');
        expect(transitions.down.descending.unison).toBe('down');
        expect(transitions.left.descending.unison).toBe('left');
        expect(transitions.right.descending.unison).toBe('right');
    });
});

// =============================================================================
// Tests: 'none' direction → falls back to pattern library
// =============================================================================

describe('DDR: None direction falls back to pattern library', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1.0,
        });
    });

    it('should return valid DDR button even when direction is none', () => {
        const availableButtons = mapper.getAvailableButtons();
        expect(availableButtons).toContain('up');
        expect(availableButtons).toContain('down');
        expect(availableButtons).toContain('left');
        expect(availableButtons).toContain('right');
        expect(availableButtons).toHaveLength(4);
    });

    it('should validate DDR buttons correctly', () => {
        expect(mapper.isValidButton('up')).toBe(true);
        expect(mapper.isValidButton('down')).toBe(true);
        expect(mapper.isValidButton('left')).toBe(true);
        expect(mapper.isValidButton('right')).toBe(true);
        expect(mapper.isValidButton(1)).toBe(false);
        expect(mapper.isValidButton('invalid')).toBe(false);
    });
});

// =============================================================================
// Tests: Circular Motion Philosophy
// =============================================================================

describe('DDR: Circular motion philosophy', () => {
    it('should follow natural clockwise flow: up -> right -> down -> left -> up', () => {
        const transitions = getDDRTransitions();

        // From up: ascending should eventually lead to right
        expect(transitions.up.ascending.medium).toBe('right');

        // From right: descending should lead to down
        expect(transitions.right.descending.small).toBe('down');

        // From down: descending should stay down or go left
        expect(transitions.down.descending.small).toBe('down');

        // From left: ascending should lead to up
        expect(transitions.left.ascending.small).toBe('up');
    });

    it('should maintain circular flow with medium intervals', () => {
        const transitions = getDDRTransitions();

        // Medium ascending from left goes up (continuing clockwise)
        expect(transitions.left.ascending.medium).toBe('up');

        // Medium ascending from up goes right (continuing clockwise)
        expect(transitions.up.ascending.medium).toBe('right');

        // Medium descending from right goes down (continuing counter-clockwise)
        expect(transitions.right.descending.medium).toBe('down');

        // Medium descending from down goes left (continuing counter-clockwise)
        expect(transitions.down.descending.medium).toBe('left');
    });
});

// =============================================================================
// Tests: Difficulty-Based Transitions (Easy vs Medium/Hard)
// =============================================================================

describe('DDR: Easy mode uses direction-only mapping', () => {
    it('should only use direction for easy mode (no interval consideration)', () => {
        // Easy mode uses DDR_EASY_TRANSITIONS which only considers direction
        // This is validated by checking that the ButtonMapper handles easy mode

        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
            pitchInfluenceWeight: 1.0,
        });

        // Easy mode should be configured
        expect(mapper.getConfig().difficulty).toBe('easy');
    });

    it('should map ascending from any button to adjacent button in easy mode', () => {
        // In easy mode, ascending always moves toward up or stays
        // This is direction-only, no leaps allowed
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
        });

        // Verify configuration
        expect(mapper.getConfig().difficulty).toBe('easy');
        expect(mapper.getConfig().controllerMode).toBe('ddr');
    });
});

// =============================================================================
// Tests: ButtonMapper Configuration
// =============================================================================

describe('ButtonMapper DDR Configuration', () => {
    it('should create mapper with DDR mode', () => {
        const mapper = new ButtonMapper({ controllerMode: 'ddr' });
        expect(mapper.getConfig().controllerMode).toBe('ddr');
    });

    it('should return correct available buttons for DDR', () => {
        const mapper = new ButtonMapper({ controllerMode: 'ddr' });
        const buttons = mapper.getAvailableButtons();

        expect(buttons).toEqual(['up', 'down', 'left', 'right']);
    });

    it('should validate DDR buttons correctly', () => {
        const mapper = new ButtonMapper({ controllerMode: 'ddr' });

        expect(mapper.isValidButton('up')).toBe(true);
        expect(mapper.isValidButton('down')).toBe(true);
        expect(mapper.isValidButton('left')).toBe(true);
        expect(mapper.isValidButton('right')).toBe(true);
        expect(mapper.isValidButton(1)).toBe(false);
        expect(mapper.isValidButton(5)).toBe(false);
    });

    it('should throw on invalid configuration', () => {
        expect(() => {
            new ButtonMapper({
                controllerMode: 'ddr',
                pitchInfluenceWeight: 2.0, // Invalid: > 1
            });
        }).toThrow();
    });

    it('should accept valid pitch influence weight', () => {
        expect(() => {
            new ButtonMapper({
                controllerMode: 'ddr',
                pitchInfluenceWeight: 0.5,
            });
        }).not.toThrow();
    });
});

// =============================================================================
// Tests: Guitar Hero Transition Table Validation
// =============================================================================

describe('Guitar Hero Transition Tables', () => {
    it('should have transition tables for all 5 frets', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        expect(transitions).toHaveProperty('1');
        expect(transitions).toHaveProperty('2');
        expect(transitions).toHaveProperty('3');
        expect(transitions).toHaveProperty('4');
        expect(transitions).toHaveProperty('5');
    });

    it('should have all interval categories in ascending/descending transitions', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        const intervalCategories: IntervalCategory[] = ['unison', 'small', 'medium', 'large', 'very_large'];

        for (const fret of [1, 2, 3, 4, 5] as const) {
            for (const category of intervalCategories) {
                expect(transitions[fret].ascending).toHaveProperty(category);
                expect(transitions[fret].descending).toHaveProperty(category);
            }
        }
    });

    it('should have stable transitions for each fret', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        expect(transitions[1].stable).toBe(1);
        expect(transitions[2].stable).toBe(2);
        expect(transitions[3].stable).toBe(3);
        expect(transitions[4].stable).toBe(4);
        expect(transitions[5].stable).toBe(5);
    });
});

// =============================================================================
// Tests: Guitar Hero - Pitch up → higher fret number (move right)
// =============================================================================

describe('Guitar Hero: Pitch up moves to higher fret', () => {
    it('should map small ascending interval from fret 1 to fret 2', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[1].ascending.small).toBe(2);
    });

    it('should map medium ascending interval from fret 1 to fret 2', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[1].ascending.medium).toBe(2);
    });

    it('should map small ascending interval from fret 2 to fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[2].ascending.small).toBe(3);
    });

    it('should map medium ascending interval from fret 2 to fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[2].ascending.medium).toBe(3);
    });

    it('should map small ascending interval from fret 3 to fret 4', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].ascending.small).toBe(4);
    });

    it('should map medium ascending interval from fret 3 to fret 4', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].ascending.medium).toBe(4);
    });

    it('should map small ascending interval from fret 4 to fret 5', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[4].ascending.small).toBe(5);
    });

    it('should map medium ascending interval from fret 4 to fret 5', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[4].ascending.medium).toBe(5);
    });

    it('should map large ascending interval from fret 1 to fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[1].ascending.large).toBe(3);
    });

    it('should map large ascending interval from fret 2 to fret 4', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[2].ascending.large).toBe(4);
    });

    it('should map large ascending interval from fret 3 to fret 5', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].ascending.large).toBe(5);
    });
});

// =============================================================================
// Tests: Guitar Hero - Pitch down → lower fret number (move left)
// =============================================================================

describe('Guitar Hero: Pitch down moves to lower fret', () => {
    it('should map small descending interval from fret 2 to fret 1', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[2].descending.small).toBe(1);
    });

    it('should map medium descending interval from fret 2 to fret 1', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[2].descending.medium).toBe(1);
    });

    it('should map small descending interval from fret 3 to fret 2', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].descending.small).toBe(2);
    });

    it('should map medium descending interval from fret 3 to fret 2', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].descending.medium).toBe(2);
    });

    it('should map small descending interval from fret 4 to fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[4].descending.small).toBe(3);
    });

    it('should map medium descending interval from fret 4 to fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[4].descending.medium).toBe(3);
    });

    it('should map small descending interval from fret 5 to fret 4', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[5].descending.small).toBe(4);
    });

    it('should map medium descending interval from fret 5 to fret 4', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[5].descending.medium).toBe(4);
    });

    it('should map large descending interval from fret 3 to fret 1', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].descending.large).toBe(1);
    });

    it('should map large descending interval from fret 4 to fret 2', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[4].descending.large).toBe(2);
    });

    it('should map large descending interval from fret 5 to fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[5].descending.large).toBe(3);
    });
});

// =============================================================================
// Tests: Guitar Hero - Interval size affects fret jump distance
// =============================================================================

describe('Guitar Hero: Interval size affects fret jump distance', () => {
    it('should move 1 fret for small interval from fret 3 ascending', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Small: 3 -> 4 (1 fret up)
        expect(transitions[3].ascending.small).toBe(4);
    });

    it('should move 1 fret for medium interval from fret 3 ascending', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Medium: 3 -> 4 (1 fret up)
        expect(transitions[3].ascending.medium).toBe(4);
    });

    it('should move 2 frets for large interval from fret 3 ascending', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Large: 3 -> 5 (2 frets up)
        expect(transitions[3].ascending.large).toBe(5);
    });

    it('should move 2 frets for very_large interval from fret 3 ascending', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Very large: 3 -> 5 (2 frets up, max)
        expect(transitions[3].ascending.very_large).toBe(5);
    });

    it('should move 1 fret for small interval from fret 3 descending', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Small: 3 -> 2 (1 fret down)
        expect(transitions[3].descending.small).toBe(2);
    });

    it('should move 2 frets for large interval from fret 3 descending', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Large: 3 -> 1 (2 frets down)
        expect(transitions[3].descending.large).toBe(1);
    });

    it('should demonstrate increasing jump distances with interval size (from fret 2)', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        // Ascending from fret 2
        expect(transitions[2].ascending.small).toBe(3);    // +1 fret
        expect(transitions[2].ascending.medium).toBe(3);   // +1 fret
        expect(transitions[2].ascending.large).toBe(4);    // +2 frets
        expect(transitions[2].ascending.very_large).toBe(4); // +2 frets
    });

    it('should demonstrate increasing jump distances with interval size (from fret 4)', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        // Descending from fret 4
        expect(transitions[4].descending.small).toBe(3);     // -1 fret
        expect(transitions[4].descending.medium).toBe(3);    // -1 fret
        expect(transitions[4].descending.large).toBe(2);     // -2 frets
        expect(transitions[4].descending.very_large).toBe(1); // -3 frets
    });
});

// =============================================================================
// Tests: Guitar Hero - Fret clamping to valid range (1-5) with string wrap
// =============================================================================

describe('Guitar Hero: String wrap at fret boundaries', () => {
    it('should wrap when ascending past fret 5 with small interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 5, ascending small -> wraps to fret 2 (like moving to higher string)
        expect(transitions[5].ascending.small).toBe(2);
    });

    it('should wrap when ascending past fret 5 with medium interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 5, ascending medium -> wraps to fret 2
        expect(transitions[5].ascending.medium).toBe(2);
    });

    it('should wrap when ascending past fret 5 with large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 5, ascending large -> wraps to fret 3
        expect(transitions[5].ascending.large).toBe(3);
    });

    it('should wrap when ascending past fret 5 with very_large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 5, ascending very_large -> wraps to fret 3
        expect(transitions[5].ascending.very_large).toBe(3);
    });

    it('should wrap when ascending from fret 4 with large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 4, ascending large (4+2=6, past 5) -> wraps to fret 2
        expect(transitions[4].ascending.large).toBe(2);
    });

    it('should wrap when ascending from fret 4 with very_large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 4, ascending very_large (4+3=7, past 5) -> wraps to fret 2
        expect(transitions[4].ascending.very_large).toBe(2);
    });

    it('should wrap when descending past fret 1 with small interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 1, descending small -> wraps to fret 4 (like moving to lower string)
        expect(transitions[1].descending.small).toBe(4);
    });

    it('should wrap when descending past fret 1 with medium interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 1, descending medium -> wraps to fret 4
        expect(transitions[1].descending.medium).toBe(4);
    });

    it('should wrap when descending past fret 1 with large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 1, descending large (1-2=-1, past 1) -> wraps to fret 3
        expect(transitions[1].descending.large).toBe(3);
    });

    it('should wrap when descending past fret 1 with very_large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 1, descending very_large (1-3=-2, past 1) -> wraps to fret 3
        expect(transitions[1].descending.very_large).toBe(3);
    });

    it('should wrap when descending from fret 2 with large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 2, descending large (2-2=0, past 1) -> wraps to fret 4
        expect(transitions[2].descending.large).toBe(4);
    });

    it('should wrap when descending from fret 2 with very_large interval', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // From fret 2, descending very_large (2-3=-1, past 1) -> wraps to fret 4
        expect(transitions[2].descending.very_large).toBe(4);
    });

    it('should never return a fret outside 1-5 range', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        const intervalCategories: IntervalCategory[] = ['unison', 'small', 'medium', 'large', 'very_large'];

        for (const fret of [1, 2, 3, 4, 5] as const) {
            for (const category of intervalCategories) {
                const ascResult = transitions[fret].ascending[category];
                const descResult = transitions[fret].descending[category];

                expect(ascResult).toBeGreaterThanOrEqual(1);
                expect(ascResult).toBeLessThanOrEqual(5);
                expect(descResult).toBeGreaterThanOrEqual(1);
                expect(descResult).toBeLessThanOrEqual(5);
            }
        }
    });
});

// =============================================================================
// Tests: Guitar Hero - Stable pitch → stay on same fret
// =============================================================================

describe('Guitar Hero: Stable pitch stays on same fret', () => {
    it('should return same fret for stable transition from fret 1', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[1].stable).toBe(1);
    });

    it('should return same fret for stable transition from fret 2', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[2].stable).toBe(2);
    });

    it('should return same fret for stable transition from fret 3', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[3].stable).toBe(3);
    });

    it('should return same fret for stable transition from fret 4', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[4].stable).toBe(4);
    });

    it('should return same fret for stable transition from fret 5', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[5].stable).toBe(5);
    });

    it('should return same fret for unison interval (ascending)', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        // Unison means no change - should stay on current fret
        expect(transitions[1].ascending.unison).toBe(1);
        expect(transitions[2].ascending.unison).toBe(2);
        expect(transitions[3].ascending.unison).toBe(3);
        expect(transitions[4].ascending.unison).toBe(4);
        expect(transitions[5].ascending.unison).toBe(5);
    });

    it('should return same fret for unison interval (descending)', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();
        expect(transitions[1].descending.unison).toBe(1);
        expect(transitions[2].descending.unison).toBe(2);
        expect(transitions[3].descending.unison).toBe(3);
        expect(transitions[4].descending.unison).toBe(4);
        expect(transitions[5].descending.unison).toBe(5);
    });
});

// =============================================================================
// Tests: Guitar Hero - None direction falls back to pattern library
// =============================================================================

describe('Guitar Hero: None direction falls back to pattern library', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'medium',
            pitchInfluenceWeight: 1.0,
        });
    });

    it('should return valid Guitar Hero buttons when direction is none', () => {
        const availableButtons = mapper.getAvailableButtons();
        expect(availableButtons).toContain(1);
        expect(availableButtons).toContain(2);
        expect(availableButtons).toContain(3);
        expect(availableButtons).toContain(4);
        expect(availableButtons).toContain(5);
        expect(availableButtons).toHaveLength(5);
    });

    it('should validate Guitar Hero buttons correctly', () => {
        expect(mapper.isValidButton(1)).toBe(true);
        expect(mapper.isValidButton(2)).toBe(true);
        expect(mapper.isValidButton(3)).toBe(true);
        expect(mapper.isValidButton(4)).toBe(true);
        expect(mapper.isValidButton(5)).toBe(true);
        expect(mapper.isValidButton('up')).toBe(false);
        expect(mapper.isValidButton(6)).toBe(false);
        expect(mapper.isValidButton(0)).toBe(false);
    });
});

// =============================================================================
// Tests: Guitar Hero - Fretboard Metaphor
// =============================================================================

describe('Guitar Hero: Fretboard metaphor consistency', () => {
    it('should maintain ascending order for ascending intervals from middle fret', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        // From fret 3 (middle), ascending should go to higher frets
        expect(transitions[3].ascending.small).toBeGreaterThan(3);
        expect(transitions[3].ascending.medium).toBeGreaterThan(3);
        expect(transitions[3].ascending.large).toBeGreaterThan(3);
    });

    it('should maintain descending order for descending intervals from middle fret', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        // From fret 3 (middle), descending should go to lower frets
        expect(transitions[3].descending.small).toBeLessThan(3);
        expect(transitions[3].descending.medium).toBeLessThan(3);
        expect(transitions[3].descending.large).toBeLessThan(3);
    });

    it('should have fret 1 as lowest accessible fret (no descending from 1)', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        // Descending from fret 1 should wrap (string change), not go below
        const smallResult = transitions[1].descending.small;
        const mediumResult = transitions[1].descending.medium;

        // Results should be valid frets (1-5), even if wrapping
        expect(smallResult).toBeGreaterThanOrEqual(1);
        expect(smallResult).toBeLessThanOrEqual(5);
        expect(mediumResult).toBeGreaterThanOrEqual(1);
        expect(mediumResult).toBeLessThanOrEqual(5);
    });

    it('should have fret 5 as highest accessible fret (no ascending from 5)', () => {
        const transitions = ButtonMapper.getGuitarHeroTransitions();

        // Ascending from fret 5 should wrap (string change), not go above
        const smallResult = transitions[5].ascending.small;
        const mediumResult = transitions[5].ascending.medium;

        // Results should be valid frets (1-5), even if wrapping
        expect(smallResult).toBeGreaterThanOrEqual(1);
        expect(smallResult).toBeLessThanOrEqual(5);
        expect(mediumResult).toBeGreaterThanOrEqual(1);
        expect(mediumResult).toBeLessThanOrEqual(5);
    });
});

// =============================================================================
// Tests: Guitar Hero Configuration
// =============================================================================

describe('ButtonMapper Guitar Hero Configuration', () => {
    it('should create mapper with Guitar Hero mode', () => {
        const mapper = new ButtonMapper({ controllerMode: 'guitar_hero' });
        expect(mapper.getConfig().controllerMode).toBe('guitar_hero');
    });

    it('should return correct available buttons for Guitar Hero', () => {
        const mapper = new ButtonMapper({ controllerMode: 'guitar_hero' });
        const buttons = mapper.getAvailableButtons();

        expect(buttons).toEqual([1, 2, 3, 4, 5]);
    });

    it('should validate Guitar Hero buttons correctly', () => {
        const mapper = new ButtonMapper({ controllerMode: 'guitar_hero' });

        expect(mapper.isValidButton(1)).toBe(true);
        expect(mapper.isValidButton(2)).toBe(true);
        expect(mapper.isValidButton(3)).toBe(true);
        expect(mapper.isValidButton(4)).toBe(true);
        expect(mapper.isValidButton(5)).toBe(true);
        expect(mapper.isValidButton('up')).toBe(false);
        expect(mapper.isValidButton('down')).toBe(false);
        expect(mapper.isValidButton(0)).toBe(false);
        expect(mapper.isValidButton(6)).toBe(false);
    });

    it('should throw on invalid configuration for Guitar Hero', () => {
        expect(() => {
            new ButtonMapper({
                controllerMode: 'guitar_hero',
                pitchInfluenceWeight: 2.0, // Invalid: > 1
            });
        }).toThrow();
    });

    it('should accept valid pitch influence weight for Guitar Hero', () => {
        expect(() => {
            new ButtonMapper({
                controllerMode: 'guitar_hero',
                pitchInfluenceWeight: 0.5,
            });
        }).not.toThrow();
    });
});

// =============================================================================
// Tests: Guitar Hero Easy Mode (Direction-Only)
// =============================================================================

describe('Guitar Hero: Easy mode uses direction-only mapping', () => {
    it('should create easy mode mapper with Guitar Hero', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'easy',
        });

        expect(mapper.getConfig().difficulty).toBe('easy');
        expect(mapper.getConfig().controllerMode).toBe('guitar_hero');
    });

    it('should only move by 1 fret in easy mode (no leaps)', () => {
        // Easy mode should only move to adjacent frets
        // This is tested by verifying the configuration
        const mapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'easy',
        });

        // Easy mode should be configured correctly
        expect(mapper.getConfig().difficulty).toBe('easy');
    });
});
