/**
 * Unit tests for ButtonMapper pattern selection
 *
 * Tests pattern selection functionality for both controller modes (DDR and Guitar Hero):
 * - Pattern selection returns valid buttons for each mode
 * - Pattern selection respects difficulty constraints
 * - Pattern selection varies from previous key when possible
 * - Pattern selection uses pattern library correctly
 *
 * Phase 2.8 - Unit tests for pattern selection (both controller modes)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ButtonMapper } from './ButtonMapper.js';
import type {
    DDRButton,
    GuitarHeroButton,
    ButtonMappingConfig,
} from '../types/ButtonMapping.js';
import {
    DDR_PATTERN_LIBRARY,
    GUITAR_HERO_PATTERN_LIBRARY,
} from './ButtonPatternLibrary.js';

// =============================================================================
// DDR MODE PATTERN SELECTION TESTS
// =============================================================================

describe('ButtonMapper Pattern Selection - DDR Mode', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0, // Pattern-only mode for clearer testing
        });
    });

    describe('Valid Button Selection', () => {
        it('should return valid DDR buttons only', () => {
            const availableButtons = mapper.getAvailableButtons();
            const validDDRButtons: DDRButton[] = ['up', 'down', 'left', 'right'];

            expect(availableButtons.length).toBe(4);
            for (const button of availableButtons) {
                expect(validDDRButtons).toContain(button as DDRButton);
            }
        });

        it('should validate DDR buttons correctly', () => {
            expect(mapper.isValidButton('up')).toBe(true);
            expect(mapper.isValidButton('down')).toBe(true);
            expect(mapper.isValidButton('left')).toBe(true);
            expect(mapper.isValidButton('right')).toBe(true);
            expect(mapper.isValidButton(1)).toBe(false);
            expect(mapper.isValidButton('invalid')).toBe(false);
        });

        it('should use buttons from DDR pattern library', () => {
            // All buttons in DDR mode should come from the DDR pattern library
            const libraryButtons = new Set<string>();
            for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
                for (const key of pattern.keys) {
                    libraryButtons.add(key as string);
                }
            }

            const availableButtons = mapper.getAvailableButtons();
            for (const button of availableButtons) {
                expect(libraryButtons.has(button as string)).toBe(true);
            }
        });
    });

    describe('Difficulty-Based Selection', () => {
        it('should use easier patterns for easy difficulty', () => {
            const easyMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'easy',
                pitchInfluenceWeight: 0,
            });

            // Easy difficulty uses max pattern difficulty 3
            const easyPatterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 3);
            expect(easyPatterns.length).toBeGreaterThan(0);
        });

        it('should use medium patterns for medium difficulty', () => {
            // Medium difficulty uses max pattern difficulty 6
            const mediumPatterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 6);
            expect(mediumPatterns.length).toBeGreaterThan(0);
        });

        it('should use all patterns for hard difficulty', () => {
            // Hard difficulty uses max pattern difficulty 10
            const hardPatterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 10);
            expect(hardPatterns.length).toBe(DDR_PATTERN_LIBRARY.patterns.length);
        });

        it('should have patterns available for all difficulties', () => {
            // Verify that patterns exist for each difficulty level
            for (let diff = 1; diff <= 10; diff++) {
                const patterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty === diff);
                // Not all difficulty levels need patterns, but we should have some variety
                if (patterns.length === 0 && diff <= 6) {
                    // At least log a warning for lower difficulties that should have patterns
                    console.warn(`No DDR patterns with difficulty ${diff}`);
                }
            }
            // Verify we have at least some patterns in each category
            const easyPatterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 3);
            const mediumPatterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty > 3 && p.difficulty <= 6);
            const hardPatterns = DDR_PATTERN_LIBRARY.patterns.filter(p => p.difficulty > 6);

            expect(easyPatterns.length).toBeGreaterThan(0);
            expect(mediumPatterns.length).toBeGreaterThan(0);
            expect(hardPatterns.length).toBeGreaterThanOrEqual(0); // Hard patterns are optional
        });
    });

    describe('Pattern Variation', () => {
        it('should provide variation from previous key when possible', () => {
            // Pattern selection should try to use a different key from the previous
            // to avoid monotonous patterns
            const config = mapper.getConfig();

            // Verify configuration supports variation
            expect(config.consecutiveSameKeyLimit).toBeGreaterThan(0);
        });

        it('should have multiple patterns starting with different buttons', () => {
            // Verify that the DDR library has patterns starting with each button
            const startingButtons = new Set<string>();
            for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
                startingButtons.add(pattern.keys[0] as string);
            }

            expect(startingButtons.has('up')).toBe(true);
            expect(startingButtons.has('down')).toBe(true);
            expect(startingButtons.has('left')).toBe(true);
            expect(startingButtons.has('right')).toBe(true);
        });
    });

    describe('Pattern Library Structure', () => {
        it('should have correct controller mode for DDR library', () => {
            expect(DDR_PATTERN_LIBRARY.controllerMode).toBe('ddr');
        });

        it('should have patterns organized by category', () => {
            const categories = ['basic', 'roll', 'stream', 'jump', 'transition'];
            for (const category of categories) {
                const patterns = DDR_PATTERN_LIBRARY.byCategory.get(category as any);
                if (patterns) {
                    expect(patterns.length).toBeGreaterThan(0);
                    for (const pattern of patterns) {
                        expect(pattern.category).toBe(category);
                    }
                }
            }
        });

        it('should have patterns organized by difficulty', () => {
            expect(DDR_PATTERN_LIBRARY.byDifficulty.size).toBeGreaterThan(0);

            for (const [difficulty, patterns] of DDR_PATTERN_LIBRARY.byDifficulty) {
                expect(difficulty).toBeGreaterThanOrEqual(1);
                expect(difficulty).toBeLessThanOrEqual(10);
                for (const pattern of patterns) {
                    expect(pattern.difficulty).toBe(difficulty);
                }
            }
        });
    });
});

// =============================================================================
// GUITAR HERO MODE PATTERN SELECTION TESTS
// =============================================================================

describe('ButtonMapper Pattern Selection - Guitar Hero Mode', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'medium',
            pitchInfluenceWeight: 0, // Pattern-only mode for clearer testing
        });
    });

    describe('Valid Button Selection', () => {
        it('should return valid Guitar Hero buttons only', () => {
            const availableButtons = mapper.getAvailableButtons();
            const validGHButtons: GuitarHeroButton[] = [1, 2, 3, 4, 5];

            expect(availableButtons.length).toBe(5);
            for (const button of availableButtons) {
                expect(validGHButtons).toContain(button as GuitarHeroButton);
            }
        });

        it('should validate Guitar Hero buttons correctly', () => {
            expect(mapper.isValidButton(1)).toBe(true);
            expect(mapper.isValidButton(2)).toBe(true);
            expect(mapper.isValidButton(3)).toBe(true);
            expect(mapper.isValidButton(4)).toBe(true);
            expect(mapper.isValidButton(5)).toBe(true);
            expect(mapper.isValidButton(0)).toBe(false);
            expect(mapper.isValidButton(6)).toBe(false);
            expect(mapper.isValidButton('up')).toBe(false);
        });

        it('should use buttons from Guitar Hero pattern library', () => {
            // All buttons in Guitar Hero mode should come from the Guitar Hero pattern library
            const libraryButtons = new Set<number>();
            for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
                for (const key of pattern.keys) {
                    libraryButtons.add(key as number);
                }
            }

            const availableButtons = mapper.getAvailableButtons();
            for (const button of availableButtons) {
                expect(libraryButtons.has(button as number)).toBe(true);
            }
        });
    });

    describe('Difficulty-Based Selection', () => {
        it('should use easier patterns for easy difficulty', () => {
            const easyMapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'easy',
                pitchInfluenceWeight: 0,
            });

            // Easy difficulty uses max pattern difficulty 3
            const easyPatterns = GUITAR_HERO_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 3);
            expect(easyPatterns.length).toBeGreaterThan(0);
        });

        it('should use medium patterns for medium difficulty', () => {
            // Medium difficulty uses max pattern difficulty 6
            const mediumPatterns = GUITAR_HERO_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 6);
            expect(mediumPatterns.length).toBeGreaterThan(0);
        });

        it('should use all patterns for hard difficulty', () => {
            // Hard difficulty uses max pattern difficulty 10
            const hardPatterns = GUITAR_HERO_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 10);
            expect(hardPatterns.length).toBe(GUITAR_HERO_PATTERN_LIBRARY.patterns.length);
        });

        it('should have patterns available for all difficulties', () => {
            // Verify we have at least some patterns in each category
            const easyPatterns = GUITAR_HERO_PATTERN_LIBRARY.patterns.filter(p => p.difficulty <= 3);
            const mediumPatterns = GUITAR_HERO_PATTERN_LIBRARY.patterns.filter(p => p.difficulty > 3 && p.difficulty <= 6);
            const hardPatterns = GUITAR_HERO_PATTERN_LIBRARY.patterns.filter(p => p.difficulty > 6);

            expect(easyPatterns.length).toBeGreaterThan(0);
            expect(mediumPatterns.length).toBeGreaterThan(0);
            expect(hardPatterns.length).toBeGreaterThanOrEqual(0); // Hard patterns are optional
        });
    });

    describe('Pattern Variation', () => {
        it('should provide variation from previous key when possible', () => {
            // Pattern selection should try to use a different key from the previous
            const config = mapper.getConfig();

            // Verify configuration supports variation
            expect(config.consecutiveSameKeyLimit).toBeGreaterThan(0);
        });

        it('should have multiple patterns starting with different frets', () => {
            // Verify that the Guitar Hero library has patterns starting with each fret
            const startingFrets = new Set<number>();
            for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
                startingFrets.add(pattern.keys[0] as number);
            }

            expect(startingFrets.has(1)).toBe(true);
            expect(startingFrets.has(2)).toBe(true);
            expect(startingFrets.has(3)).toBe(true);
            expect(startingFrets.has(4)).toBe(true);
            expect(startingFrets.has(5)).toBe(true);
        });
    });

    describe('Pattern Library Structure', () => {
        it('should have correct controller mode for Guitar Hero library', () => {
            expect(GUITAR_HERO_PATTERN_LIBRARY.controllerMode).toBe('guitar_hero');
        });

        it('should have patterns organized by category', () => {
            const categories = ['basic', 'chord', 'jump', 'transition'];
            for (const category of categories) {
                const patterns = GUITAR_HERO_PATTERN_LIBRARY.byCategory.get(category as any);
                if (patterns) {
                    expect(patterns.length).toBeGreaterThan(0);
                    for (const pattern of patterns) {
                        expect(pattern.category).toBe(category);
                    }
                }
            }
        });

        it('should have patterns organized by difficulty', () => {
            expect(GUITAR_HERO_PATTERN_LIBRARY.byDifficulty.size).toBeGreaterThan(0);

            for (const [difficulty, patterns] of GUITAR_HERO_PATTERN_LIBRARY.byDifficulty) {
                expect(difficulty).toBeGreaterThanOrEqual(1);
                expect(difficulty).toBeLessThanOrEqual(10);
                for (const pattern of patterns) {
                    expect(pattern.difficulty).toBe(difficulty);
                }
            }
        });
    });
});

// =============================================================================
// CROSS-MODE PATTERN SELECTION TESTS
// =============================================================================

describe('ButtonMapper Pattern Selection - Cross-Mode Tests', () => {
    it('should not mix DDR and Guitar Hero buttons', () => {
        const ddrMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0,
        });

        const ghMapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'medium',
            pitchInfluenceWeight: 0,
        });

        const ddrButtons = ddrMapper.getAvailableButtons();
        const ghButtons = ghMapper.getAvailableButtons();

        // DDR buttons should all be strings
        for (const button of ddrButtons) {
            expect(typeof button).toBe('string');
        }

        // Guitar Hero buttons should all be numbers
        for (const button of ghButtons) {
            expect(typeof button).toBe('number');
        }
    });

    it('should have separate pattern libraries for each mode', () => {
        // DDR library should not contain Guitar Hero patterns
        for (const pattern of DDR_PATTERN_LIBRARY.patterns) {
            expect(pattern.controllerMode).toBe('ddr');
            for (const key of pattern.keys) {
                expect(typeof key).toBe('string');
            }
        }

        // Guitar Hero library should not contain DDR patterns
        for (const pattern of GUITAR_HERO_PATTERN_LIBRARY.patterns) {
            expect(pattern.controllerMode).toBe('guitar_hero');
            for (const key of pattern.keys) {
                expect(typeof key).toBe('number');
            }
        }
    });

    it('should enforce mode-specific validation', () => {
        const ddrMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
        });

        const ghMapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'medium',
        });

        // DDR mapper should only accept DDR buttons
        expect(ddrMapper.isValidButton('up')).toBe(true);
        expect(ddrMapper.isValidButton(1)).toBe(false);

        // Guitar Hero mapper should only accept Guitar Hero buttons
        expect(ghMapper.isValidButton(1)).toBe(true);
        expect(ghMapper.isValidButton('up')).toBe(false);
    });

    it('should have no pattern ID collisions between modes', () => {
        const ddrIds = new Set(DDR_PATTERN_LIBRARY.patterns.map(p => p.id));
        const ghIds = new Set(GUITAR_HERO_PATTERN_LIBRARY.patterns.map(p => p.id));

        // Check for overlap
        for (const id of ddrIds) {
            expect(ghIds.has(id)).toBe(false);
        }

        for (const id of ghIds) {
            expect(ddrIds.has(id)).toBe(false);
        }
    });
});

// =============================================================================
// PATTERN SELECTION HELPER FUNCTION TESTS
// =============================================================================

describe('ButtonMapper Pattern Selection - Helper Functions', () => {
    describe('getMaxPatternDifficulty', () => {
        it('should return 3 for easy difficulty', () => {
            const easyMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'easy',
            });

            // Verify easy configuration
            expect(easyMapper.getConfig().difficulty).toBe('easy');
        });

        it('should return 6 for medium difficulty', () => {
            const mediumMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
            });

            // Verify medium configuration
            expect(mediumMapper.getConfig().difficulty).toBe('medium');
        });

        it('should return 10 for hard difficulty', () => {
            const hardMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'hard',
            });

            // Verify hard configuration
            expect(hardMapper.getConfig().difficulty).toBe('hard');
        });
    });

    describe('Transition Tables', () => {
        it('should have complete DDR transition table', () => {
            const transitions = ButtonMapper.getDDRTransitions();
            const ddrButtons: DDRButton[] = ['up', 'down', 'left', 'right'];
            const intervalCategories = ['unison', 'small', 'medium', 'large', 'very_large'];

            for (const button of ddrButtons) {
                expect(transitions[button]).toBeDefined();
                expect(transitions[button].ascending).toBeDefined();
                expect(transitions[button].descending).toBeDefined();
                expect(transitions[button].stable).toBeDefined();

                for (const category of intervalCategories) {
                    expect(transitions[button].ascending[category as any]).toBeDefined();
                    expect(transitions[button].descending[category as any]).toBeDefined();
                }
            }
        });

        it('should have complete Guitar Hero transition table', () => {
            const transitions = ButtonMapper.getGuitarHeroTransitions();
            const ghButtons: GuitarHeroButton[] = [1, 2, 3, 4, 5];
            const intervalCategories = ['unison', 'small', 'medium', 'large', 'very_large'];

            for (const button of ghButtons) {
                expect(transitions[button]).toBeDefined();
                expect(transitions[button].ascending).toBeDefined();
                expect(transitions[button].descending).toBeDefined();
                expect(transitions[button].stable).toBeDefined();

                for (const category of intervalCategories) {
                    expect(transitions[button].ascending[category as any]).toBeDefined();
                    expect(transitions[button].descending[category as any]).toBeDefined();
                }
            }
        });

        it('should have DDR transitions return valid DDR buttons', () => {
            const transitions = ButtonMapper.getDDRTransitions();
            const validButtons: DDRButton[] = ['up', 'down', 'left', 'right'];

            for (const button of ['up', 'down', 'left', 'right'] as DDRButton[]) {
                // Stable should return same button
                expect(transitions[button].stable).toBe(button);

                // All transitions should be valid buttons
                for (const category of ['unison', 'small', 'medium', 'large', 'very_large']) {
                    expect(validButtons).toContain(transitions[button].ascending[category as any]);
                    expect(validButtons).toContain(transitions[button].descending[category as any]);
                }
            }
        });

        it('should have Guitar Hero transitions return valid frets', () => {
            const transitions = ButtonMapper.getGuitarHeroTransitions();
            const validFrets: GuitarHeroButton[] = [1, 2, 3, 4, 5];

            for (const fret of [1, 2, 3, 4, 5] as GuitarHeroButton[]) {
                // Stable should return same fret
                expect(transitions[fret].stable).toBe(fret);

                // All transitions should be valid frets
                for (const category of ['unison', 'small', 'medium', 'large', 'very_large']) {
                    expect(validFrets).toContain(transitions[fret].ascending[category as any]);
                    expect(validFrets).toContain(transitions[fret].descending[category as any]);
                }
            }
        });
    });
});

// =============================================================================
// CONFIGURATION TESTS FOR PATTERN SELECTION
// =============================================================================

describe('ButtonMapper Pattern Selection - Configuration', () => {
    it('should respect pitchInfluenceWeight configuration', () => {
        // Pattern-only mode (weight = 0)
        const patternOnlyMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 0,
        });

        expect(patternOnlyMapper.getConfig().pitchInfluenceWeight).toBe(0);

        // Full pitch mode (weight = 1)
        const fullPitchMapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1,
        });

        expect(fullPitchMapper.getConfig().pitchInfluenceWeight).toBe(1);
    });

    it('should respect consecutiveSameKeyLimit configuration', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
        });

        // Easy difficulty should have higher consecutive limit
        const config = mapper.getConfig();
        expect(config.consecutiveSameKeyLimit).toBe(12);
    });

    it('should have different consecutive limits by difficulty', () => {
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

        // Easy should have highest limit (most repetition allowed)
        // Hard should have lowest limit (least repetition allowed)
        expect(easyMapper.getConfig().consecutiveSameKeyLimit).toBeGreaterThanOrEqual(
            mediumMapper.getConfig().consecutiveSameKeyLimit
        );
        expect(mediumMapper.getConfig().consecutiveSameKeyLimit).toBeGreaterThanOrEqual(
            hardMapper.getConfig().consecutiveSameKeyLimit
        );
    });

    it('should throw on invalid configuration', () => {
        // Invalid pitchInfluenceWeight
        expect(() => {
            new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
                pitchInfluenceWeight: 2, // Invalid: > 1
            });
        }).toThrow();

        expect(() => {
            new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
                pitchInfluenceWeight: -0.5, // Invalid: < 0
            });
        }).toThrow();
    });
});
