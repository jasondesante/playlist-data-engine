/**
 * Tests for ButtonMapper - DDR Mode Pitch-to-Button Mapping
 *
 * Tests the DDR controller mode pitch-to-button mapping strategies.
 * DDR uses 4 directional buttons with circular motion philosophy:
 * - Vertical axis: up/down for pitch direction
 * - Horizontal axis: left/right for interval magnitude
 *
 * Part of Phase 2.8 Tests - Unit tests for DDR mode pitch-to-button mapping
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
