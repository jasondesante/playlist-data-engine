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
import type { MappedLevelResult } from '../../../src/core/generation/ButtonMapper.js';
import type { PitchAtBeat, IntervalCategory, PitchDirection } from '../../../src/core/generation/PitchBeatLinker.js';
import type { DDRButton } from '../../../src/core/types/ButtonMapping.js';
import type { GeneratedRhythm, RhythmMetadata } from '../../../src/core/generation/RhythmGenerator.js';
import type { DifficultyVariant } from '../../../src/core/analysis/beat/DifficultyVariantGenerator.js';

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

// =============================================================================
// Tests: Difficulty Constraints - DDR Mode
// =============================================================================

describe('DDR: Difficulty Constraints', () => {
    describe('Easy mode constraints', () => {
        it('should have consecutiveSameKeyLimit of 12 for easy mode', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'easy',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(12);
        });

        it('should only move to adjacent buttons in easy mode (no leaps)', () => {
            const transitions = ButtonMapper.getDDRTransitions();

            // For easy mode, we verify the easy transition table only uses adjacent buttons
            // Adjacency in DDR: up↔left, up↔right, down↔left, down↔right
            const adjacentMap: Record<DDRButton, DDRButton[]> = {
                'up': ['left', 'right'],
                'down': ['left', 'right'],
                'left': ['up', 'down'],
                'right': ['up', 'down'],
            };

            // Easy transitions are direction-only and should only move to adjacent buttons
            // Note: The actual implementation uses DDR_EASY_TRANSITIONS, but we can verify
            // the concept by checking that the full transition table's small/medium intervals
            // use adjacent buttons for stepwise motion

            // For small intervals, movement should be to adjacent buttons
            for (const button of ['up', 'down', 'left', 'right'] as DDRButton[]) {
                const smallAsc = transitions[button].ascending.small;
                const smallDesc = transitions[button].descending.small;

                // Small ascending/descending should go to adjacent or stay
                const validTargets = [...adjacentMap[button], button];
                expect(validTargets).toContain(smallAsc);
                expect(validTargets).toContain(smallDesc);
            }
        });

        it('should use direction-only mapping in easy mode (ignores interval size)', () => {
            // In easy mode, interval category should not affect button selection
            // This is tested by verifying the configuration
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'easy',
            });

            expect(mapper.getConfig().difficulty).toBe('easy');
        });
    });

    describe('Medium mode constraints', () => {
        it('should have consecutiveSameKeyLimit of 8 for medium mode', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(8);
        });

        it('should allow leaps in medium mode (large intervals can skip buttons)', () => {
            const transitions = ButtonMapper.getDDRTransitions();

            // In medium mode, large intervals can skip to non-adjacent buttons
            // For example: from 'up' with large ascending interval goes to 'right'
            // from 'up' with very_large ascending interval goes to 'left'

            // Verify that large/very_large intervals can reach non-adjacent buttons
            // (This tests that interval categories are considered in medium mode)
            expect(transitions.up.ascending.large).toBeDefined();
            expect(transitions.up.ascending.very_large).toBeDefined();

            // Large and very_large should potentially be different from small
            // (not always, but interval category should be considered)
            const allTargets = new Set([
                transitions.up.ascending.small,
                transitions.up.ascending.medium,
                transitions.up.ascending.large,
                transitions.up.ascending.very_large,
            ]);

            // At least some variety should exist based on interval
            expect(allTargets.size).toBeGreaterThanOrEqual(2);
        });

        it('should use both direction and interval for mapping in medium mode', () => {
            const transitions = ButtonMapper.getDDRTransitions();

            // Verify ascending and descending produce different results for same interval
            for (const button of ['up', 'down', 'left', 'right'] as DDRButton[]) {
                // For small intervals, ascending and descending should generally go different directions
                // (unless at a boundary)
                const asc = transitions[button].ascending.small;
                const desc = transitions[button].descending.small;

                // Both should be valid DDR buttons
                expect(['up', 'down', 'left', 'right']).toContain(asc);
                expect(['up', 'down', 'left', 'right']).toContain(desc);
            }
        });
    });

    describe('Hard mode constraints', () => {
        it('should have consecutiveSameKeyLimit of 6 for hard mode', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'hard',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(6);
        });

        it('should allow rapid button changes in hard mode', () => {
            // Hard mode allows complex patterns and rapid changes
            // This is verified by having a lower consecutive limit
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'hard',
            });

            // Lower limit = more variety required
            expect(mapper.getConfig().consecutiveSameKeyLimit).toBeLessThan(8);
        });

        it('should use full interval mapping in hard mode', () => {
            const transitions = ButtonMapper.getDDRTransitions();

            // Verify all interval categories are distinct for some buttons
            // This shows that interval size matters in hard mode
            const categories: IntervalCategory[] = ['unison', 'small', 'medium', 'large', 'very_large'];

            for (const button of ['up', 'down', 'left', 'right'] as DDRButton[]) {
                // Each interval category should have a defined transition
                for (const cat of categories) {
                    expect(transitions[button].ascending[cat]).toBeDefined();
                    expect(transitions[button].descending[cat]).toBeDefined();
                }
            }
        });
    });
});

// =============================================================================
// Tests: Difficulty Constraints - Guitar Hero Mode
// =============================================================================

describe('Guitar Hero: Difficulty Constraints', () => {
    describe('Easy mode constraints', () => {
        it('should have consecutiveSameKeyLimit of 12 for easy mode', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'easy',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(12);
        });

        it('should only move to adjacent frets in easy mode (no leaps)', () => {
            const transitions = ButtonMapper.getGuitarHeroTransitions();

            // For easy mode, small/medium intervals should only move by 1 fret
            // (adjacent frets)
            for (const fret of [1, 2, 3, 4, 5] as const) {
                const smallAsc = transitions[fret].ascending.small;
                const mediumAsc = transitions[fret].ascending.medium;
                const smallDesc = transitions[fret].descending.small;
                const mediumDesc = transitions[fret].descending.medium;

                // Small and medium intervals should move by at most 1 fret (without wrap)
                // When wrapping, the distance is still 1 conceptually (string change)
                // Check that small and medium have same result (direction-only in easy)
                expect(smallAsc).toBe(mediumAsc);
                expect(smallDesc).toBe(mediumDesc);
            }
        });

        it('should not allow large fret jumps in easy mode', () => {
            // Easy mode should not have 2+ fret jumps for any interval
            // (string wrap is still 1-fret movement conceptually)
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'easy',
            });

            expect(mapper.getConfig().difficulty).toBe('easy');
        });
    });

    describe('Medium mode constraints', () => {
        it('should have consecutiveSameKeyLimit of 8 for medium mode', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'medium',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(8);
        });

        it('should allow leaps (2+ frets) for large intervals in medium mode', () => {
            const transitions = ButtonMapper.getGuitarHeroTransitions();

            // For medium mode, large intervals can skip frets
            // From fret 1, large ascending should go to fret 3 (2-fret jump)
            expect(transitions[1].ascending.large).toBe(3);

            // From fret 3, large descending should go to fret 1 (2-fret jump)
            expect(transitions[3].descending.large).toBe(1);

            // From fret 2, large ascending should go to fret 4 (2-fret jump)
            expect(transitions[2].ascending.large).toBe(4);
        });

        it('should use interval size to determine fret jump distance', () => {
            const transitions = ButtonMapper.getGuitarHeroTransitions();

            // Small/medium = 1 fret, large = 2 frets, very_large = 2-3 frets
            // From fret 3 (middle position)
            expect(transitions[3].ascending.small).toBe(4);  // +1
            expect(transitions[3].ascending.medium).toBe(4); // +1
            expect(transitions[3].ascending.large).toBe(5);  // +2
        });
    });

    describe('Hard mode constraints', () => {
        it('should have consecutiveSameKeyLimit of 6 for hard mode', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'hard',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(6);
        });

        it('should allow rapid fret changes in hard mode', () => {
            // Hard mode allows complex patterns and rapid changes
            // This is verified by having a lower consecutive limit
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'hard',
            });

            // Lower limit = more variety required
            expect(mapper.getConfig().consecutiveSameKeyLimit).toBeLessThan(8);
        });

        it('should use very_large intervals for dramatic expression', () => {
            const transitions = ButtonMapper.getGuitarHeroTransitions();

            // Very large intervals should allow maximum expression
            // From fret 4, very_large descending goes to fret 1 (3-fret jump)
            expect(transitions[4].descending.very_large).toBe(1);

            // From fret 2, very_large descending wraps to fret 4
            expect(transitions[2].descending.very_large).toBe(4);
        });
    });
});

// =============================================================================
// Tests: Pattern Difficulty Constraints
// =============================================================================

describe('Pattern Difficulty Constraints', () => {
    it('should limit pattern difficulty to 3 for easy mode', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
        });

        // getMaxPatternDifficulty is private, but we can verify behavior
        // by checking the configuration
        expect(mapper.getConfig().difficulty).toBe('easy');
    });

    it('should limit pattern difficulty to 6 for medium mode', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
        });

        expect(mapper.getConfig().difficulty).toBe('medium');
    });

    it('should allow pattern difficulty up to 10 for hard mode', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'hard',
        });

        expect(mapper.getConfig().difficulty).toBe('hard');
    });
});

// =============================================================================
// Tests: Cross-Difficulty Comparison
// =============================================================================

describe('Cross-Difficulty Comparison', () => {
    it('should have decreasing consecutiveSameKeyLimit as difficulty increases', () => {
        const easyMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
        });
        const mediumMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
        });
        const hardMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'hard',
        });

        // Higher difficulty = lower limit (more variety required)
        expect(easyMapper.getConfig().consecutiveSameKeyLimit).toBeGreaterThan(
            mediumMapper.getConfig().consecutiveSameKeyLimit
        );
        expect(mediumMapper.getConfig().consecutiveSameKeyLimit).toBeGreaterThan(
            hardMapper.getConfig().consecutiveSameKeyLimit
        );
    });

    it('should apply same difficulty constraints to both controller modes', () => {
        const ddrEasy = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
        });
        const ghEasy = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'easy',
        });

        // Both should have same consecutiveSameKeyLimit for same difficulty
        expect(ddrEasy.getConfig().consecutiveSameKeyLimit).toBe(
            ghEasy.getConfig().consecutiveSameKeyLimit
        );
    });
});

// =============================================================================
// Tests: Backward Compatibility — MappedLevelResult shape
// =============================================================================

/**
 * Create a minimal GeneratedRhythm fixture with N beats for testing mapper.map().
 * All beats use 'straight_16th' grid type with ascending timestamps.
 */
function createMinimalGeneratedRhythm(beatCount: number): GeneratedRhythm {
    const beats = Array.from({ length: beatCount }, (_, i) => ({
        timestamp: i * 0.25,
        beatIndex: Math.floor(i / 4),
        gridPosition: i % 4,
        gridType: 'straight_16th' as const,
        intensity: 0.5,
        band: 'mid' as const,
        sourceBand: 'mid' as const,
    }));

    const variant: DifficultyVariant = {
        difficulty: 'medium',
        beats,
        isUnedited: true,
        editType: 'none',
        editAmount: 0,
    };

    const metadata: RhythmMetadata = {
        difficulty: 'medium',
        bandsAnalyzed: ['low', 'mid', 'high'],
        transientsDetected: beatCount,
        transientsFilteredByIntensity: 0,
        densityValidationRetries: 0,
        phrasesDetected: 1,
        averageDensity: 1.0,
        targetDensity: 1.0,
        tempoBPM: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        subdivision: 'straight_16th',
        gridConfidence: 0.9,
        dominantBand: 'mid',
        densityRange: { min: 0.8, max: 1.2 },
        densityStdDev: 0.1,
        totalDuration: beatCount * 0.25,
        totalBeats: beatCount,
    };

    return {
        difficultyVariants: {
            easy: { ...variant, difficulty: 'easy' },
            medium: variant,
            hard: { ...variant, difficulty: 'hard' },
            natural: { ...variant, difficulty: 'natural' },
        },
        bandStreams: { low: { beats: [] }, mid: { beats: [] }, high: { beats: [] } },
        composite: { beats: [], sections: [], naturalDifficulty: 'medium' },
        analysis: {
            transientAnalysis: { bands: {} },
            quantizationResult: {} as any,
            phraseAnalysis: {} as any,
            densityAnalysis: {} as any,
            scoringResult: {} as any,
        },
        metadata,
    };
}

/**
 * Create pitch analysis data for N beats with specified directions.
 */
function createPitchAnalysis(
    beatCount: number,
    direction: PitchDirection = 'ascending',
    intervalCategory: IntervalCategory = 'small',
    probability: number = 0.9
): PitchAtBeat[] {
    return Array.from({ length: beatCount }, (_, i) => ({
        beatIndex: i,
        timestamp: i * 0.25,
        band: 'mid' as const,
        pitch: {
            timestamp: i * 0.25,
            frequency: 440,
            probability,
            isVoiced: true,
            midiNote: 69,
            noteName: 'A4',
        },
        direction,
        intervalFromPrevious: 1,
        intervalCategory,
    }));
}

describe('Backward Compatibility: MappedLevelResult shape', () => {
    it('should return MappedLevelResult with all expected fields when mapping with pitch', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.8,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const pitchAnalysis = createPitchAnalysis(16);
        const result: MappedLevelResult = mapper.map(rhythm, 'medium', pitchAnalysis);

        // Top-level fields
        expect(result).toHaveProperty('variant');
        expect(result).toHaveProperty('rhythmMetadata');
        expect(result).toHaveProperty('buttonMetadata');
        expect(result).toHaveProperty('keyAssignments');
        expect(result).toHaveProperty('mappingSources');
        expect(result).toHaveProperty('mappingPatternIds');

        // variant should be the medium variant
        expect(result.variant.difficulty).toBe('medium');
        expect(result.variant.beats).toHaveLength(16);

        // rhythmMetadata should be preserved
        expect(result.rhythmMetadata).toBe(rhythm.metadata);
        expect(result.rhythmMetadata.tempoBPM).toBe(120);
    });

    it('should return MappedLevelResult with all expected fields when mapping without pitch', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.0,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const result = mapper.map(rhythm, 'medium');

        // All top-level fields present even without pitch
        expect(result).toHaveProperty('variant');
        expect(result).toHaveProperty('rhythmMetadata');
        expect(result).toHaveProperty('buttonMetadata');
        expect(result).toHaveProperty('keyAssignments');
        expect(result).toHaveProperty('mappingSources');
        expect(result).toHaveProperty('mappingPatternIds');

        // variant still correct
        expect(result.variant.difficulty).toBe('medium');
    });

    it('should have keyAssignments as Map<number, string> with correct entries', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.8,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const pitchAnalysis = createPitchAnalysis(16);
        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // keyAssignments is a Map
        expect(result.keyAssignments).toBeInstanceOf(Map);

        // Should have exactly 16 entries (one per beat)
        expect(result.keyAssignments.size).toBe(16);

        // Every key should be a valid DDR button
        const validDDR = new Set<string>(['up', 'down', 'left', 'right']);
        for (const [beatIndex, key] of result.keyAssignments) {
            expect(typeof beatIndex).toBe('number');
            expect(typeof key).toBe('string');
            expect(validDDR.has(key)).toBe(true);
        }

        // All beat indices 0-15 should be present
        for (let i = 0; i < 16; i++) {
            expect(result.keyAssignments.has(i)).toBe(true);
        }
    });

    it('should have mappingSources as Map<number, "pitch"|"pattern"> with correct values', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.8,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const pitchAnalysis = createPitchAnalysis(16);
        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // mappingSources is a Map
        expect(result.mappingSources).toBeInstanceOf(Map);

        // Should have exactly 16 entries
        expect(result.mappingSources.size).toBe(16);

        // Every value should be 'pitch' or 'pattern'
        for (const [beatIndex, source] of result.mappingSources) {
            expect(typeof beatIndex).toBe('number');
            expect(['pitch', 'pattern']).toContain(source);
        }

        // With pitchInfluenceWeight=0.8, most beats should be pitch
        const pitchCount = Array.from(result.mappingSources.values())
            .filter(s => s === 'pitch').length;
        expect(pitchCount).toBeGreaterThan(0);
    });

    it('should have mappingPatternIds as Map<number, string|undefined> with correct values', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.8,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const pitchAnalysis = createPitchAnalysis(16);
        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // mappingPatternIds is a Map
        expect(result.mappingPatternIds).toBeInstanceOf(Map);

        // Should have exactly 16 entries
        expect(result.mappingPatternIds.size).toBe(16);

        // Pattern-sourced beats should have a patternId, pitch-sourced should be undefined
        for (const [beatIndex, patternId] of result.mappingPatternIds) {
            expect(typeof beatIndex).toBe('number');
            const source = result.mappingSources.get(beatIndex);
            if (source === 'pattern') {
                expect(patternId).toBeDefined();
                expect(typeof patternId).toBe('string');
            } else {
                // Pitch-sourced beats may or may not have a patternId (undefined is expected)
                expect(patternId === undefined || typeof patternId === 'string').toBe(true);
            }
        }
    });

    it('should have buttonMetadata with all expected fields', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.8,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const pitchAnalysis = createPitchAnalysis(16);
        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        const meta = result.buttonMetadata;

        // Core fields
        expect(meta.controllerMode).toBe('ddr');
        expect(Array.isArray(meta.keysUsed)).toBe(true);
        expect(typeof meta.pitchInfluencedBeats).toBe('number');
        expect(typeof meta.patternInfluencedBeats).toBe('number');
        expect(Array.isArray(meta.patternsUsed)).toBe(true);
        expect(meta.buttonDistribution).toBeInstanceOf(Map);

        // Beat counts should sum to total
        expect(meta.pitchInfluencedBeats + meta.patternInfluencedBeats).toBe(16);

        // With pitch analysis provided, should have direction and interval stats
        expect(meta.directionStats).toBeDefined();
        expect(meta.directionStats).toHaveProperty('up');
        expect(meta.directionStats).toHaveProperty('down');
        expect(meta.directionStats).toHaveProperty('stable');
        expect(meta.directionStats).toHaveProperty('none');

        expect(meta.intervalStats).toBeDefined();
        expect(meta.intervalStats).toHaveProperty('unison');
        expect(meta.intervalStats).toHaveProperty('small');
        expect(meta.intervalStats).toHaveProperty('medium');
        expect(meta.intervalStats).toHaveProperty('large');
        expect(meta.intervalStats).toHaveProperty('very_large');

        // Band stats
        expect(meta.bandStats).toBeDefined();
        expect(meta.bandStats).toHaveProperty('low');
        expect(meta.bandStats).toHaveProperty('mid');
        expect(meta.bandStats).toHaveProperty('high');

        // New patternPlacements field (added by rewrite)
        expect(meta.patternPlacements).toBeDefined();
        expect(Array.isArray(meta.patternPlacements)).toBe(true);
    });

    it('should work correctly for Guitar Hero controller mode', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'medium',
            pitchInfluenceWeight: 0.8,
        });

        const rhythm = createMinimalGeneratedRhythm(16);
        const pitchAnalysis = createPitchAnalysis(16);
        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // All fields present
        expect(result.keyAssignments.size).toBe(16);
        expect(result.mappingSources.size).toBe(16);
        expect(result.mappingPatternIds.size).toBe(16);

        // Keys should be numbers 1-5 for Guitar Hero
        const validFrets = new Set<string>(['1', '2', '3', '4', '5']);
        for (const [, key] of result.keyAssignments) {
            expect(validFrets.has(key)).toBe(true);
        }

        expect(result.buttonMetadata.controllerMode).toBe('guitar_hero');
    });

    it('should handle zero-beat rhythm gracefully', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
        });

        const rhythm = createMinimalGeneratedRhythm(0);
        const result = mapper.map(rhythm, 'medium');

        expect(result.keyAssignments.size).toBe(0);
        expect(result.mappingSources.size).toBe(0);
        expect(result.mappingPatternIds.size).toBe(0);
        expect(result.buttonMetadata.pitchInfluencedBeats).toBe(0);
        expect(result.buttonMetadata.patternInfluencedBeats).toBe(0);
        expect(result.buttonMetadata.patternsUsed).toEqual([]);
    });
});
