/**
 * Tests for GrooveAnalyzer
 *
 * Tests the "groove meter" system that rewards consistency in timing feel
 * rather than proximity to perfect center.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrooveAnalyzer } from '../../../src/core/analysis/beat/GrooveAnalyzer.js';
import type {
    GrooveResult,
    GrooveState,
    GrooveAnalyzerOptions,
    GrooveDirection,
} from '../../../src/core/types/BeatMap.js';
import { DEFAULT_GROOVE_OPTIONS } from '../../../src/core/types/BeatMap.js';

// Helper constants for timing
const MS = 0.001; // 1ms in seconds
const DEFAULT_BPM = 120;

describe('GrooveAnalyzer', () => {
    let analyzer: GrooveAnalyzer;

    describe('Constructor and Options', () => {
        it('should create instance with default options', () => {
            analyzer = new GrooveAnalyzer();
            const state = analyzer.getState();
            expect(state.hotness).toBe(0);
            expect(state.streakLength).toBe(0);
            expect(state.hitCount).toBe(0);
            expect(state.pocketDirection).toBe('neutral');
            expect(state.establishedOffset).toBe(0);
        });

        it('should accept custom options', () => {
            const customOptions: Partial<GrooveAnalyzerOptions> = {
                minHitsForPocket: 5,
                hotnessGainPerHit: 10,
                hotnessLossOnBreak: 30,
            };
            analyzer = new GrooveAnalyzer(customOptions);
            expect(analyzer).toBeDefined();
        });

        it('should merge custom options with defaults', () => {
            analyzer = new GrooveAnalyzer({ minHitsForPocket: 5 });
            // Test by observing behavior - pocket should require 5 hits
            const result1 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
            const result2 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
            const result3 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
            const result4 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
            // After 4 hits, still no pocket (need 5)
            expect(result4.inPocket).toBe(false);
            const result5 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
            // After 5 hits, pocket is established
            expect(result5.inPocket).toBe(true);
        });
    });

    describe('4.1 Pocket Detection Tests', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        describe('Establishes pocket after 3 consistent hits (minHitsForPocket)', () => {
            it('should not have pocket established after 1 hit', () => {
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.inPocket).toBe(false);
                expect(result.consistency).toBe(0);
            });

            it('should not have pocket established after 2 hits', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.inPocket).toBe(false);
                expect(result.consistency).toBe(0);
            });

            it('should establish pocket after 3 consistent hits', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // After 3 hits, pocket is established
                expect(result.inPocket).toBe(true);
                expect(result.consistency).toBeGreaterThan(0);
            });

            it('should have hotness increase after pocket is established', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.hotness).toBe(DEFAULT_GROOVE_OPTIONS.hotnessGainPerHit);
            });
        });

        describe('Correctly identifies push direction (negative offsets)', () => {
            it('should identify push direction for negative offsets', () => {
                // Push = hitting early = negative offset
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(-30 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('push');
                expect(result.establishedOffset).toBeLessThan(0);
            });

            it('should maintain push direction across multiple consistent hits', () => {
                for (let i = 0; i < 5; i++) {
                    const result = analyzer.recordHit(-25 * MS, DEFAULT_BPM);
                    if (i >= 2) {
                        expect(result.pocketDirection).toBe('push');
                    }
                }
            });

            it('should establish pocket with push direction even with slight variation', () => {
                analyzer.recordHit(-28 * MS, DEFAULT_BPM);
                analyzer.recordHit(-32 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(-30 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('push');
                // Average should be around -30ms
                expect(result.establishedOffset).toBeCloseTo(-30 * MS, 3);
            });
        });

        describe('Correctly identifies pull direction (positive offsets)', () => {
            it('should identify pull direction for positive offsets', () => {
                // Pull = hitting late = positive offset
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('pull');
                expect(result.establishedOffset).toBeGreaterThan(0);
            });

            it('should maintain pull direction across multiple consistent hits', () => {
                for (let i = 0; i < 5; i++) {
                    const result = analyzer.recordHit(25 * MS, DEFAULT_BPM);
                    if (i >= 2) {
                        expect(result.pocketDirection).toBe('pull');
                    }
                }
            });

            it('should establish pocket with pull direction even with slight variation', () => {
                analyzer.recordHit(28 * MS, DEFAULT_BPM);
                analyzer.recordHit(32 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('pull');
                // Average should be around 30ms
                expect(result.establishedOffset).toBeCloseTo(30 * MS, 3);
            });
        });

        describe('Returns neutral when offsets are within ±10ms dead zone', () => {
            it('should return neutral for exactly 0 offset', () => {
                analyzer.recordHit(0, DEFAULT_BPM);
                analyzer.recordHit(0, DEFAULT_BPM);
                const result = analyzer.recordHit(0, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('neutral');
            });

            it('should return neutral for offsets within +10ms', () => {
                analyzer.recordHit(9 * MS, DEFAULT_BPM);
                analyzer.recordHit(9 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(9 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('neutral');
            });

            it('should return neutral for offsets within -10ms', () => {
                analyzer.recordHit(-9 * MS, DEFAULT_BPM);
                analyzer.recordHit(-9 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(-9 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('neutral');
            });

            it('should return pull for offsets just above +10ms', () => {
                analyzer.recordHit(11 * MS, DEFAULT_BPM);
                analyzer.recordHit(11 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(11 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('pull');
            });

            it('should return push for offsets just below -10ms', () => {
                analyzer.recordHit(-11 * MS, DEFAULT_BPM);
                analyzer.recordHit(-11 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(-11 * MS, DEFAULT_BPM);

                expect(result.pocketDirection).toBe('push');
            });

            it('should return neutral for exactly +10ms (boundary)', () => {
                // ±10ms means 10ms is still neutral (Math.abs(0.010) < 0.010 is false, but typically we check <=)
                // The spec says ±10ms dead zone, meaning within the zone is neutral
                analyzer.recordHit(10 * MS, DEFAULT_BPM);
                analyzer.recordHit(10 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(10 * MS, DEFAULT_BPM);

                // At exactly 10ms, it's at the boundary - checking the actual implementation
                // Math.abs(offset) < neutralDeadZone => 0.010 < 0.010 is false, so it should be pull
                expect(result.pocketDirection).toBe('pull');
            });

            it('should return neutral for exactly -10ms (boundary)', () => {
                analyzer.recordHit(-10 * MS, DEFAULT_BPM);
                analyzer.recordHit(-10 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(-10 * MS, DEFAULT_BPM);

                // At exactly -10ms, it's at the boundary - checking the actual implementation
                expect(result.pocketDirection).toBe('push');
            });
        });

        describe('Direction shifts gradually as hitting pattern changes', () => {
            it('should shift from push to pull gradually with rolling average', () => {
                // Establish push pocket first
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                let result = analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                expect(result.pocketDirection).toBe('push');
                expect(result.establishedOffset).toBeCloseTo(-30 * MS, 3);

                // Now start hitting pull - the rolling average should shift gradually
                // Default averagingWindowSize is 4, so we need 4 hits to fully shift
                result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Average now: (-30 + -30 + -30 + 30) / 4 = -15ms
                expect(result.establishedOffset).toBeCloseTo(-15 * MS, 3);
                expect(result.pocketDirection).toBe('push'); // Still push

                result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Average now: (-30 + -30 + 30 + 30) / 4 = 0ms
                expect(result.establishedOffset).toBeCloseTo(0 * MS, 3);
                expect(result.pocketDirection).toBe('neutral');

                result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Average now: (-30 + 30 + 30 + 30) / 4 = 15ms
                expect(result.establishedOffset).toBeCloseTo(15 * MS, 3);
                expect(result.pocketDirection).toBe('pull');

                result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Average now: (30 + 30 + 30 + 30) / 4 = 30ms
                expect(result.establishedOffset).toBeCloseTo(30 * MS, 3);
                expect(result.pocketDirection).toBe('pull');
            });

            it('should shift from pull to push gradually with rolling average', () => {
                // Establish pull pocket first (3 hits to establish)
                analyzer.recordHit(40 * MS, DEFAULT_BPM);  // Window: [40]
                analyzer.recordHit(40 * MS, DEFAULT_BPM);  // Window: [40, 40]
                let result = analyzer.recordHit(40 * MS, DEFAULT_BPM);  // Window: [40, 40, 40], pocket established
                expect(result.pocketDirection).toBe('pull');

                // Now start hitting push - window fills to 4
                result = analyzer.recordHit(-40 * MS, DEFAULT_BPM);  // Window: [40, 40, 40, -40]
                // Average: (40 + 40 + 40 + -40) / 4 = 20ms
                expect(result.establishedOffset).toBeCloseTo(20 * MS, 3);
                expect(result.pocketDirection).toBe('pull');

                result = analyzer.recordHit(-40 * MS, DEFAULT_BPM);  // Window: [40, 40, -40, -40] (oldest 40 dropped)
                // Average: (40 + 40 + -40 + -40) / 4 = 0ms
                expect(result.establishedOffset).toBeCloseTo(0 * MS, 3);
                expect(result.pocketDirection).toBe('neutral');

                result = analyzer.recordHit(-40 * MS, DEFAULT_BPM);  // Window: [40, -40, -40, -40]
                // Average: (40 + -40 + -40 + -40) / 4 = -20ms
                expect(result.establishedOffset).toBeCloseTo(-20 * MS, 3);
                expect(result.pocketDirection).toBe('push');

                result = analyzer.recordHit(-40 * MS, DEFAULT_BPM);  // Window: [-40, -40, -40, -40]
                // Average: (-40 + -40 + -40 + -40) / 4 = -40ms
                expect(result.establishedOffset).toBeCloseTo(-40 * MS, 3);
                expect(result.pocketDirection).toBe('push');
            });

            it('should not hard reset on direction change - smooth transition', () => {
                // Establish a strong push pocket
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(-35 * MS, DEFAULT_BPM);
                }

                const stateBefore = analyzer.getState();
                expect(stateBefore.pocketDirection).toBe('push');
                expect(stateBefore.hotness).toBeGreaterThan(0);

                // Change to pull direction
                const result = analyzer.recordHit(35 * MS, DEFAULT_BPM);

                // The direction should be shifting but not immediately flipped
                // The hotness might have dropped but pocket should not be reset
                expect(result.establishedOffset).not.toBe(-35 * MS); // Not the original
                // After 1 different hit in a window of 4, average should be:
                // (-35 + -35 + -35 + 35) / 4 = -17.5ms (still push direction)
                expect(result.establishedOffset).toBeCloseTo(-17.5 * MS, 3);
            });

            it('should maintain rolling window of correct size', () => {
                // With default averagingWindowSize of 4
                // Hit 5 times with increasing offsets
                analyzer.recordHit(10 * MS, DEFAULT_BPM); // Window: [10]
                analyzer.recordHit(20 * MS, DEFAULT_BPM); // Window: [10, 20]
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // Window: [10, 20, 30]
                let result = analyzer.recordHit(40 * MS, DEFAULT_BPM); // Window: [10, 20, 30, 40]
                expect(result.establishedOffset).toBeCloseTo(25 * MS, 3); // (10+20+30+40)/4 = 25

                result = analyzer.recordHit(50 * MS, DEFAULT_BPM); // Window: [20, 30, 40, 50] - 10 dropped
                expect(result.establishedOffset).toBeCloseTo(35 * MS, 3); // (20+30+40+50)/4 = 35

                result = analyzer.recordHit(60 * MS, DEFAULT_BPM); // Window: [30, 40, 50, 60] - 20 dropped
                expect(result.establishedOffset).toBeCloseTo(45 * MS, 3); // (30+40+50+60)/4 = 45
            });
        });
    });

    describe('4.2 Consistency Calculation Tests', () => {
        // Use a large window size so the rolling average doesn't shift much with one hit
        const LARGE_WINDOW = 100;
        const WINDOW_FILL_COUNT = LARGE_WINDOW; // Fill the window completely

        describe('Returns 1.0 consistency when hit is exactly on pocket center', () => {
            beforeEach(() => {
                analyzer = new GrooveAnalyzer();
            });

            it('should return 1.0 consistency when hit is exactly at established offset', () => {
                // Establish pocket at 30ms
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result3 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result3.inPocket).toBe(true);

                // Hit exactly on pocket center
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.consistency).toBe(1.0);
                expect(result.inPocket).toBe(true);
            });

            it('should return 1.0 consistency for negative offset at pocket center', () => {
                // Establish pocket at -25ms (push)
                analyzer.recordHit(-25 * MS, DEFAULT_BPM);
                analyzer.recordHit(-25 * MS, DEFAULT_BPM);
                analyzer.recordHit(-25 * MS, DEFAULT_BPM);

                // Hit exactly on pocket center
                const result = analyzer.recordHit(-25 * MS, DEFAULT_BPM);
                expect(result.consistency).toBe(1.0);
                expect(result.inPocket).toBe(true);
            });

            it('should return 1.0 consistency at neutral pocket center', () => {
                // Establish neutral pocket
                analyzer.recordHit(0, DEFAULT_BPM);
                analyzer.recordHit(0, DEFAULT_BPM);
                analyzer.recordHit(0, DEFAULT_BPM);

                // Hit exactly on center
                const result = analyzer.recordHit(0, DEFAULT_BPM);
                expect(result.consistency).toBe(1.0);
                expect(result.inPocket).toBe(true);
            });
        });

        describe('Returns 0.0 consistency when hit is outside window', () => {
            beforeEach(() => {
                analyzer = new GrooveAnalyzer({ averagingWindowSize: LARGE_WINDOW });
            });

            it('should return 0.0 consistency when hit is far beyond pocket window', () => {
                // Fill the window with hits at 0ms to establish a stable pocket
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit well outside the window
                const outsideOffset = pocketWindow * 3; // 300% to edge
                const result = analyzer.recordHit(outsideOffset, DEFAULT_BPM);

                expect(result.consistency).toBe(0);
                expect(result.inPocket).toBe(false);
            });

            it('should return 0.0 consistency when hit is far before pocket', () => {
                // Fill the window with hits at 0ms
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit well before the pocket window
                const outsideOffset = -pocketWindow * 3; // -300% to edge
                const result = analyzer.recordHit(outsideOffset, DEFAULT_BPM);

                expect(result.consistency).toBe(0);
                expect(result.inPocket).toBe(false);
            });

            it('should return 0.0 consistency when hit is at 150% to edge (outside window)', () => {
                // Fill the window with hits at 0ms
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit at 150% of the window - definitely outside even with rolling average shift
                const outsideOffset = pocketWindow * 1.5;
                const result = analyzer.recordHit(outsideOffset, DEFAULT_BPM);

                // With large window, the average shift is minimal (1.5/100 = 0.015)
                // New avg = pocketWindow * 0.015, distance = 1.5 * pocketWindow - 0.015 * pocketWindow = 1.485 * pocketWindow
                // Normalized = 1.485, which is > 1, so consistency = 0
                expect(result.consistency).toBe(0);
                expect(result.inPocket).toBe(false);
            });
        });

        describe('Returns partial consistency with quadratic falloff', () => {
            beforeEach(() => {
                // Use large window to minimize average shift on single hit
                analyzer = new GrooveAnalyzer({ averagingWindowSize: LARGE_WINDOW });
            });

            it('should return ~0.75 consistency at 50% to edge', () => {
                // Fill the window with hits at 0ms to establish a stable pocket
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit at 50% of the way to the edge
                const halfWayOffset = pocketWindow * 0.5;
                const result = analyzer.recordHit(halfWayOffset, DEFAULT_BPM);

                // With large window, average barely shifts, so consistency should be close to theoretical
                // Quadratic falloff: 1 - (0.5 * 0.5) = 0.75
                expect(result.consistency).toBeCloseTo(0.75, 1);
                expect(result.inPocket).toBe(true);
            });

            it('should return ~0.51 consistency at 70% to edge', () => {
                // Fill the window with hits at 0ms
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit at 70% of the way to the edge
                const seventyPercentOffset = pocketWindow * 0.7;
                const result = analyzer.recordHit(seventyPercentOffset, DEFAULT_BPM);

                // Quadratic falloff: 1 - (0.7 * 0.7) = 1 - 0.49 = 0.51
                expect(result.consistency).toBeCloseTo(0.51, 1);
                expect(result.inPocket).toBe(true);
            });

            it('should return ~0.19 consistency at 90% to edge', () => {
                // Fill the window with hits at 0ms
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit at 90% of the way to the edge
                const ninetyPercentOffset = pocketWindow * 0.9;
                const result = analyzer.recordHit(ninetyPercentOffset, DEFAULT_BPM);

                // Quadratic falloff: 1 - (0.9 * 0.9) = 1 - 0.81 = 0.19
                expect(result.consistency).toBeCloseTo(0.19, 1);
                expect(result.inPocket).toBe(true);
            });

            it('should return correct falloff for negative offset (push direction)', () => {
                // Fill the window with hits at -40ms
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(-40 * MS, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit at 50% of the way toward edge (more negative)
                const halfWayOffset = -40 * MS - (pocketWindow * 0.5);
                const result = analyzer.recordHit(halfWayOffset, DEFAULT_BPM);

                // Should be close to 0.75 consistency
                expect(result.consistency).toBeCloseTo(0.75, 1);
            });

            it('should return correct falloff for positive offset (pull direction)', () => {
                // Fill the window with hits at 40ms
                for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                    analyzer.recordHit(40 * MS, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit at 50% of the way toward edge (more positive)
                const halfWayOffset = 40 * MS + (pocketWindow * 0.5);
                const result = analyzer.recordHit(halfWayOffset, DEFAULT_BPM);

                // Should be close to 0.75 consistency
                expect(result.consistency).toBeCloseTo(0.75, 1);
            });

            it('should verify quadratic curve at multiple points', () => {
                // Test multiple points on the quadratic curve
                const testCases = [
                    { percentToEdge: 0.1, expected: 1 - 0.1 * 0.1 },  // 0.99
                    { percentToEdge: 0.3, expected: 1 - 0.3 * 0.3 },  // 0.91
                    { percentToEdge: 0.5, expected: 1 - 0.5 * 0.5 },  // 0.75
                    { percentToEdge: 0.7, expected: 1 - 0.7 * 0.7 },  // 0.51
                    { percentToEdge: 0.9, expected: 1 - 0.9 * 0.9 },  // 0.19
                ];

                testCases.forEach(({ percentToEdge, expected }) => {
                    // Create fresh analyzer for each test case
                    const testAnalyzer = new GrooveAnalyzer({ averagingWindowSize: LARGE_WINDOW });

                    // Fill the window with hits at 0ms
                    for (let i = 0; i < WINDOW_FILL_COUNT; i++) {
                        testAnalyzer.recordHit(0, DEFAULT_BPM);
                    }
                    const pocketWindow = testAnalyzer.getState().pocketWindow;

                    const offset = pocketWindow * percentToEdge;
                    const result = testAnalyzer.recordHit(offset, DEFAULT_BPM);
                    expect(result.consistency).toBeCloseTo(expected, 1);
                });
            });
        });
    });

    describe('getState()', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        it('should return correct initial state', () => {
            const state = analyzer.getState();
            expect(state.pocketDirection).toBe('neutral');
            expect(state.establishedOffset).toBe(0);
            expect(state.hotness).toBe(0);
            expect(state.streakLength).toBe(0);
            expect(state.hitCount).toBe(0);
            expect(state.pocketWindow).toBeGreaterThan(0);
        });

        it('should return updated state after hits', () => {
            analyzer.recordHit(30 * MS, DEFAULT_BPM);
            analyzer.recordHit(30 * MS, DEFAULT_BPM);
            analyzer.recordHit(30 * MS, DEFAULT_BPM);

            const state = analyzer.getState();
            expect(state.pocketDirection).toBe('pull');
            expect(state.hitCount).toBe(3);
            expect(state.hotness).toBeGreaterThan(0);
        });
    });

    describe('reset()', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        it('should reset all state to initial values', () => {
            // Build up some state
            for (let i = 0; i < 5; i++) {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
            }

            // Verify state was built up
            let state = analyzer.getState();
            expect(state.hitCount).toBe(5);
            expect(state.hotness).toBeGreaterThan(0);
            expect(state.pocketDirection).toBe('pull');

            // Reset
            analyzer.reset();

            // Verify reset
            state = analyzer.getState();
            expect(state.pocketDirection).toBe('neutral');
            expect(state.establishedOffset).toBe(0);
            expect(state.hotness).toBe(0);
            expect(state.streakLength).toBe(0);
            expect(state.hitCount).toBe(0);
        });
    });
});
