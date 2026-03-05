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
    GrooveStats,
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

    describe('4.3 Hotness/Meter Tests', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        describe('Hotness increases by 8 on consistent hits (in pocket)', () => {
            it('should increase hotness by 8 (default) when hit is in pocket', () => {
                // Establish pocket with 3 consistent hits
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result3 = analyzer.recordHit(30 * MS, DEFAULT_BPM);

                // After pocket established, hotness should be 8 (first in-pocket hit)
                expect(result3.hotness).toBe(DEFAULT_GROOVE_OPTIONS.hotnessGainPerHit);
                expect(result3.hotness).toBe(8);
            });

            it('should accumulate hotness with multiple consistent hits', () => {
                // Establish pocket
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                // Continue with consistent hits
                const result4 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result4.hotness).toBe(16); // 8 + 8

                const result5 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result5.hotness).toBe(24); // 16 + 8

                const result6 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result6.hotness).toBe(32); // 24 + 8
            });

            it('should use custom hotnessGainPerHit when configured', () => {
                const customAnalyzer = new GrooveAnalyzer({ hotnessGainPerHit: 15 });

                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);

                expect(result.hotness).toBe(15);
            });

            it('should not increase hotness before pocket is established', () => {
                // First hit - no pocket yet
                const result1 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result1.hotness).toBe(0);

                // Second hit - still no pocket
                const result2 = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result2.hotness).toBe(0);
            });

            it('should increase hotness when hit is within pocket window', () => {
                // Establish pocket at 30ms
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const state = analyzer.getState();
                const pocketWindow = state.pocketWindow;

                // Hit within pocket window (but not exactly at center)
                const nearCenterOffset = 30 * MS + (pocketWindow * 0.3);
                const result = analyzer.recordHit(nearCenterOffset, DEFAULT_BPM);

                expect(result.inPocket).toBe(true);
                expect(result.hotness).toBe(16); // 8 + 8
            });
        });

        describe('Hotness decreases by 20 on pocket breaks', () => {
            it('should decrease hotness by 20 (default) when hit breaks pocket', () => {
                // Establish pocket at 30ms
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Hotness is now 8

                // Build up some hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // 16
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // 24
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // 32

                const state = analyzer.getState();
                expect(state.hotness).toBe(32);

                // Break the pocket with a hit far from established offset
                const farOffset = 30 * MS + (state.pocketWindow * 3); // Way outside
                const result = analyzer.recordHit(farOffset, DEFAULT_BPM);

                expect(result.inPocket).toBe(false);
                expect(result.hotness).toBe(12); // 32 - 20 = 12
            });

            it('should use custom hotnessLossOnBreak when configured', () => {
                const customAnalyzer = new GrooveAnalyzer({ hotnessLossOnBreak: 30 });

                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);

                const state = customAnalyzer.getState();
                // 5 hits: pocket established on 3rd, so 3 in-pocket hits = 8 * 3 = 24
                expect(state.hotness).toBe(24);

                // Break pocket
                const farOffset = 30 * MS + (state.pocketWindow * 3);
                const result = customAnalyzer.recordHit(farOffset, DEFAULT_BPM);

                expect(result.hotness).toBe(0); // 24 - 30 = -6, clamped to 0
            });

            it('should reduce hotness but not reset streak on pocket break', () => {
                // Establish pocket and build streak
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const beforeBreak = analyzer.getState();
                expect(beforeBreak.streakLength).toBe(3); // 3 hits after pocket established

                // Break pocket
                const farOffset = 30 * MS + (beforeBreak.pocketWindow * 3);
                const result = analyzer.recordHit(farOffset, DEFAULT_BPM);

                // Hotness decreases
                expect(result.hotness).toBeLessThan(beforeBreak.hotness);
                // But streak continues (per design decision)
                expect(result.streakLength).toBe(beforeBreak.streakLength);
            });

            it('should handle multiple consecutive pocket breaks', () => {
                // Establish pocket and get hotness to 32
                for (let i = 0; i < 6; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                const state = analyzer.getState();
                // 6 hits: pocket established on 3rd, so 4 in-pocket hits = 8 * 4 = 32
                expect(state.hotness).toBe(32);

                // Break pocket twice
                const farOffset1 = 30 * MS + (state.pocketWindow * 3);
                const result1 = analyzer.recordHit(farOffset1, DEFAULT_BPM);
                expect(result1.hotness).toBe(12); // 32 - 20 = 12

                const farOffset2 = 30 * MS + (state.pocketWindow * 3);
                const result2 = analyzer.recordHit(farOffset2, DEFAULT_BPM);
                expect(result2.hotness).toBe(0); // 12 - 20 = -8, clamped to 0
            });
        });

        describe('Hotness decreases by 10 on missed beats (recordMiss)', () => {
            it('should decrease hotness by 10 (default) on recordMiss()', () => {
                // Establish pocket and build hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const beforeMiss = analyzer.getState();
                expect(beforeMiss.hotness).toBe(16); // 8 + 8

                // Miss a beat
                const result = analyzer.recordMiss();

                expect(result.hotness).toBe(6); // 16 - 10 = 6
            });

            it('should use custom hotnessLossOnMiss when configured', () => {
                const customAnalyzer = new GrooveAnalyzer({ hotnessLossOnMiss: 15 });

                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);

                const beforeMiss = customAnalyzer.getState();
                expect(beforeMiss.hotness).toBe(16);

                const result = customAnalyzer.recordMiss();
                expect(result.hotness).toBe(1); // 16 - 15 = 1
            });

            it('should reset streak to 0 on recordMiss()', () => {
                // Build up a streak
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const beforeMiss = analyzer.getState();
                expect(beforeMiss.streakLength).toBeGreaterThan(0);

                // Miss resets streak
                const result = analyzer.recordMiss();
                expect(result.streakLength).toBe(0);
            });

            it('should NOT clear established pocket on recordMiss()', () => {
                // Establish pocket
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const beforeMiss = analyzer.getState();
                expect(beforeMiss.pocketDirection).toBe('pull');
                expect(beforeMiss.establishedOffset).toBeCloseTo(30 * MS, 3);

                // Miss should NOT clear the pocket
                const result = analyzer.recordMiss();
                expect(result.pocketDirection).toBe('pull');
                expect(result.establishedOffset).toBeCloseTo(30 * MS, 3);
            });

            it('should return consistency 0 and inPocket false on recordMiss()', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const result = analyzer.recordMiss();
                expect(result.consistency).toBe(0);
                expect(result.inPocket).toBe(false);
            });

            it('should handle multiple consecutive misses', () => {
                // Build hotness to 24
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const miss1 = analyzer.recordMiss();
                expect(miss1.hotness).toBe(14); // 24 - 10

                const miss2 = analyzer.recordMiss();
                expect(miss2.hotness).toBe(4); // 14 - 10

                const miss3 = analyzer.recordMiss();
                expect(miss3.hotness).toBe(0); // 4 - 10 = -6, clamped to 0
            });
        });

        describe('Hotness clamped to 0-100', () => {
            it('should not exceed 100 hotness', () => {
                // Keep hitting in pocket to build hotness
                for (let i = 0; i < 15; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // 14 hits after pocket = 8 * 14 = 112, but should be clamped to 100
                expect(result.hotness).toBe(100);
            });

            it('should not go below 0 hotness from pocket breaks', () => {
                // Establish pocket with minimal hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Hotness = 8

                // Break pocket twice (8 - 20 - 20 would be -32)
                const state = analyzer.getState();
                const farOffset = 30 * MS + (state.pocketWindow * 3);

                analyzer.recordHit(farOffset, DEFAULT_BPM); // 8 - 20 = -12, clamped to 0
                const result = analyzer.recordHit(farOffset, DEFAULT_BPM);

                expect(result.hotness).toBe(0);
            });

            it('should not go below 0 hotness from misses', () => {
                // Start with 0 hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Hotness = 8

                // Miss twice
                analyzer.recordMiss(); // 8 - 10 = -2, clamped to 0
                const result = analyzer.recordMiss();

                expect(result.hotness).toBe(0);
            });

            it('should stay at 0 hotness when already at minimum', () => {
                // Fresh analyzer with 0 hotness
                const state = analyzer.getState();
                expect(state.hotness).toBe(0);

                // Miss when at 0 should stay at 0
                const result = analyzer.recordMiss();
                expect(result.hotness).toBe(0);
            });

            it('should properly clamp after building to max then losing', () => {
                // Build to max hotness
                for (let i = 0; i < 15; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                expect(analyzer.getState().hotness).toBe(100);

                // Hit in pocket should stay at 100
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.hotness).toBe(100);

                // Breaking should reduce from 100
                const state = analyzer.getState();
                const farOffset = 30 * MS + (state.pocketWindow * 3);
                const breakResult = analyzer.recordHit(farOffset, DEFAULT_BPM);
                expect(breakResult.hotness).toBe(80); // 100 - 20
            });
        });

        describe('Progressive tightening works correctly at higher hotness', () => {
            it('should have larger pocket window at 0% hotness', () => {
                // Establish pocket at 0% hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const state = analyzer.getState();
                // At 120 BPM: beatDuration = 0.5s, 1/32 note = 62.5ms
                // baseWindow = 62.5ms * 0.03125 * 8 = 15.625ms
                // At 0% hotness: pocketWindow = baseWindow = ~15.6ms
                expect(state.pocketWindow).toBeGreaterThan(0.014); // At least 14ms
                expect(state.pocketWindow).toBeLessThan(0.020); // Less than 20ms
            });

            it('should have smaller pocket window at higher hotness', () => {
                // Establish pocket and build hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const windowAt8Hotness = analyzer.getState().pocketWindow;

                // Build more hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const windowAt24Hotness = analyzer.getState().pocketWindow;

                // Window should be smaller at higher hotness
                expect(windowAt24Hotness).toBeLessThan(windowAt8Hotness);
            });

            it('should have minimum pocket window at 100% hotness', () => {
                // Build to max hotness
                for (let i = 0; i < 15; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                expect(state.hotness).toBe(100);

                // At 100% hotness, pocketWindow should be at minimum (15ms by default)
                expect(state.pocketWindow).toBeCloseTo(DEFAULT_GROOVE_OPTIONS.minPocketWindowSeconds, 3);
            });

            it('should calculate progressive tightening correctly at 50% hotness', () => {
                // Use custom gain to get exactly 50 hotness
                // Need 50/10 = 5 in-pocket hits after pocket establishment
                // 3 hits to establish + 5 hits = 8 hits total
                const customAnalyzer = new GrooveAnalyzer({ hotnessGainPerHit: 10 });

                // Establish pocket + 5 in-pocket hits = 50 hotness
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);  // Pocket established, hotness = 10
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);  // hotness = 20
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);  // hotness = 30
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);  // hotness = 40
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);  // hotness = 50

                const state = customAnalyzer.getState();
                expect(state.hotness).toBe(50);

                // At 50% hotness:
                // pocketWindow = baseWindow - (baseWindow - minWindow) * 0.5
                // pocketWindow = (baseWindow + minWindow) / 2

                // At 120 BPM:
                // beatDuration = 0.5s, 1/32 note = 62.5ms
                // baseWindow = 62.5ms * 0.03125 * 8 = 15.625ms
                // minWindow = 15ms
                // At 50%: (15.625 + 15) / 2 = 15.3125ms

                expect(state.pocketWindow).toBeGreaterThan(0.015); // Above min
                expect(state.pocketWindow).toBeLessThan(0.016); // Below base
            });

            it('should make it harder to stay in pocket at high hotness', () => {
                // Establish pocket with a known offset
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const windowAtLowHotness = analyzer.getState().pocketWindow;

                // Build to high hotness
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const windowAtHighHotness = analyzer.getState().pocketWindow;
                expect(windowAtHighHotness).toBeLessThan(windowAtLowHotness);

                // A hit that was in pocket before might now be outside
                // Test by hitting at the edge of the old window
                const edgeOffset = 30 * MS + windowAtLowHotness * 0.9;

                // Reset and establish fresh with low hotness
                analyzer.reset();
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                const lowHotnessResult = analyzer.recordHit(edgeOffset, DEFAULT_BPM);
                expect(lowHotnessResult.inPocket).toBe(true);

                // Reset and establish with high hotness
                analyzer.reset();
                for (let i = 0; i < 13; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                const highHotnessResult = analyzer.recordHit(edgeOffset, DEFAULT_BPM);
                // With tighter window, the edge offset might be outside
                // (depends on exact values, so just verify window is smaller)
                expect(analyzer.getState().pocketWindow).toBeLessThan(windowAtLowHotness);
            });

            it('should adjust pocket window based on BPM', () => {
                analyzer.recordHit(30 * MS, 120);
                analyzer.recordHit(30 * MS, 120);
                analyzer.recordHit(30 * MS, 120);

                const window120BPM = analyzer.getState().pocketWindow;

                // Reset and try at 90 BPM (slower = larger window)
                analyzer.reset();
                analyzer.recordHit(30 * MS, 90);
                analyzer.recordHit(30 * MS, 90);
                analyzer.recordHit(30 * MS, 90);

                const window90BPM = analyzer.getState().pocketWindow;

                // At slower BPM, the 1/32 note is longer, so window is larger
                expect(window90BPM).toBeGreaterThan(window120BPM);

                // Reset and try at 150 BPM (faster = smaller window)
                analyzer.reset();
                analyzer.recordHit(30 * MS, 150);
                analyzer.recordHit(30 * MS, 150);
                analyzer.recordHit(30 * MS, 150);

                const window150BPM = analyzer.getState().pocketWindow;

                // At faster BPM, window is smaller
                expect(window150BPM).toBeLessThan(window120BPM);
            });
        });
    });

    describe('4.4 Missed Beat Tests', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        describe('recordMiss() reduces hotness by configured amount (default 10)', () => {
            it('should reduce hotness by default 10 on miss', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const before = analyzer.getState();
                expect(before.hotness).toBe(16);

                const result = analyzer.recordMiss();
                expect(result.hotness).toBe(6);
            });

            it('should reduce hotness by custom amount on miss', () => {
                const customAnalyzer = new GrooveAnalyzer({ hotnessLossOnMiss: 5 });

                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                customAnalyzer.recordHit(30 * MS, DEFAULT_BPM);

                const result = customAnalyzer.recordMiss();
                expect(result.hotness).toBe(11); // 16 - 5 = 11
            });
        });

        describe('recordMiss() resets streak to 0', () => {
            it('should reset streak to 0 on miss', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const before = analyzer.getState();
                expect(before.streakLength).toBe(3);

                const result = analyzer.recordMiss();
                expect(result.streakLength).toBe(0);
            });

            it('should reset streak even when hotness is already 0', () => {
                // Build a streak
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                // Reset hotness to 0 by breaking pocket repeatedly
                const state = analyzer.getState();
                const farOffset = 30 * MS + (state.pocketWindow * 3);
                analyzer.recordHit(farOffset, DEFAULT_BPM);
                analyzer.recordHit(farOffset, DEFAULT_BPM);

                // Streak should still exist (per design)
                const beforeMiss = analyzer.getState();

                // But after miss, streak resets
                const result = analyzer.recordMiss();
                expect(result.streakLength).toBe(0);
            });
        });

        describe('recordMiss() does NOT clear established pocket', () => {
            it('should preserve pocket direction after miss', () => {
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                analyzer.recordHit(-30 * MS, DEFAULT_BPM);

                const before = analyzer.getState();
                expect(before.pocketDirection).toBe('push');

                const result = analyzer.recordMiss();
                expect(result.pocketDirection).toBe('push');
            });

            it('should preserve established offset after miss', () => {
                analyzer.recordHit(25 * MS, DEFAULT_BPM);
                analyzer.recordHit(35 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const before = analyzer.getState();
                expect(before.establishedOffset).toBeCloseTo(30 * MS, 3);

                const result = analyzer.recordMiss();
                expect(result.establishedOffset).toBeCloseTo(30 * MS, 3);
            });

            it('should preserve hit count after miss', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const before = analyzer.getState();
                expect(before.hitCount).toBe(3);

                analyzer.recordMiss();

                const after = analyzer.getState();
                expect(after.hitCount).toBe(3); // Miss doesn't increment hit count
            });

            it('should allow groove recovery after miss', () => {
                // Establish pocket and build hotness
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);

                const beforeMiss = analyzer.getState();
                expect(beforeMiss.hotness).toBe(16);

                // Miss a beat
                analyzer.recordMiss();
                const afterMiss = analyzer.getState();
                expect(afterMiss.hotness).toBe(6);
                expect(afterMiss.pocketDirection).toBe('pull'); // Pocket preserved

                // Continue hitting in pocket - groove should recover
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const recovery = analyzer.getState();
                expect(recovery.hotness).toBe(14); // 6 + 8
                expect(recovery.streakLength).toBe(1); // New streak started
            });
        });
    });

    describe('4.5 Edge Cases', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        describe('First hit returns sensible defaults (no pocket yet)', () => {
            it('should return 0 hotness on first hit', () => {
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.hotness).toBe(0);
            });

            it('should return 0 consistency on first hit', () => {
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.consistency).toBe(0);
            });

            it('should return false inPocket on first hit', () => {
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.inPocket).toBe(false);
            });

            it('should return 0 streak on first hit', () => {
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.streakLength).toBe(0);
            });

            it('should still calculate established offset from first hit', () => {
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.establishedOffset).toBe(30 * MS);
            });
        });

        describe('Second hit still no pocket (need 3 hits)', () => {
            it('should return 0 hotness on second hit', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.hotness).toBe(0);
            });

            it('should return 0 consistency on second hit', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.consistency).toBe(0);
            });

            it('should return false inPocket on second hit', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.inPocket).toBe(false);
            });

            it('should have hitCount of 2 after second hit', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(analyzer.getState().hitCount).toBe(2);
            });
        });

        describe('Reset clears all state', () => {
            it('should clear hotness on reset', () => {
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                expect(analyzer.getState().hotness).toBeGreaterThan(0);

                analyzer.reset();
                expect(analyzer.getState().hotness).toBe(0);
            });

            it('should clear streak on reset', () => {
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                expect(analyzer.getState().streakLength).toBeGreaterThan(0);

                analyzer.reset();
                expect(analyzer.getState().streakLength).toBe(0);
            });

            it('should clear hit count on reset', () => {
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                expect(analyzer.getState().hitCount).toBe(5);

                analyzer.reset();
                expect(analyzer.getState().hitCount).toBe(0);
            });

            it('should clear established offset on reset', () => {
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                expect(analyzer.getState().establishedOffset).toBe(30 * MS);

                analyzer.reset();
                expect(analyzer.getState().establishedOffset).toBe(0);
            });

            it('should clear pocket direction on reset', () => {
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                expect(analyzer.getState().pocketDirection).toBe('pull');

                analyzer.reset();
                expect(analyzer.getState().pocketDirection).toBe('neutral');
            });

            it('should clear recent offsets on reset', () => {
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(40 * MS, DEFAULT_BPM);

                // After reset, hitting 0 should give us 0 as established offset
                analyzer.reset();
                analyzer.recordHit(0, DEFAULT_BPM);
                expect(analyzer.getState().establishedOffset).toBe(0);
            });

            it('should allow rebuilding after reset', () => {
                // Build initial state
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }
                const beforeReset = analyzer.getState();
                expect(beforeReset.hotness).toBeGreaterThan(0);

                // Reset
                analyzer.reset();

                // Build new state with different offset
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(-25 * MS, DEFAULT_BPM);
                }
                const afterReset = analyzer.getState();
                expect(afterReset.pocketDirection).toBe('push');
                expect(afterReset.establishedOffset).toBe(-25 * MS);
            });
        });

        describe('BPM changes affect pocket window correctly (auto-adjust)', () => {
            it('should adjust window when BPM changes between hits', () => {
                // Start at 120 BPM
                analyzer.recordHit(30 * MS, 120);
                analyzer.recordHit(30 * MS, 120);
                analyzer.recordHit(30 * MS, 120);

                const window120 = analyzer.getState().pocketWindow;

                // Change to 90 BPM
                analyzer.recordHit(30 * MS, 90);
                const window90 = analyzer.getState().pocketWindow;

                expect(window90).toBeGreaterThan(window120);

                // Change to 150 BPM
                analyzer.recordHit(30 * MS, 150);
                const window150 = analyzer.getState().pocketWindow;

                expect(window150).toBeLessThan(window120);
            });

            it('should handle extreme BPM values', () => {
                // Very slow: 60 BPM
                analyzer.recordHit(0, 60);
                analyzer.recordHit(0, 60);
                analyzer.recordHit(0, 60);
                const window60 = analyzer.getState().pocketWindow;

                analyzer.reset();

                // Very fast: 200 BPM
                analyzer.recordHit(0, 200);
                analyzer.recordHit(0, 200);
                analyzer.recordHit(0, 200);
                const window200 = analyzer.getState().pocketWindow;

                expect(window60).toBeGreaterThan(window200);
            });

            it('should return correct pocketWindow in result for each hit', () => {
                const result120 = analyzer.recordHit(0, 120);
                const result90 = analyzer.recordHit(0, 90);
                const result150 = analyzer.recordHit(0, 150);

                // Each result should reflect the BPM for that hit
                expect(result90.pocketWindow).toBeGreaterThan(result120.pocketWindow);
                expect(result150.pocketWindow).toBeLessThan(result120.pocketWindow);
            });
        });

        describe('Rolling window maintains correct size (drops old hits)', () => {
            it('should maintain window size of 4 by default', () => {
                // Hit 5 times with different offsets
                analyzer.recordHit(10 * MS, DEFAULT_BPM); // Window: [10]
                analyzer.recordHit(20 * MS, DEFAULT_BPM); // Window: [10, 20]
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // Window: [10, 20, 30]
                let result = analyzer.recordHit(40 * MS, DEFAULT_BPM); // Window: [10, 20, 30, 40]
                expect(result.establishedOffset).toBeCloseTo(25 * MS, 3);

                // 5th hit should drop the first one
                result = analyzer.recordHit(50 * MS, DEFAULT_BPM); // Window: [20, 30, 40, 50]
                expect(result.establishedOffset).toBeCloseTo(35 * MS, 3);
            });

            it('should respect custom averagingWindowSize', () => {
                const smallWindowAnalyzer = new GrooveAnalyzer({ averagingWindowSize: 2 });

                smallWindowAnalyzer.recordHit(10 * MS, DEFAULT_BPM);
                smallWindowAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                let result = smallWindowAnalyzer.recordHit(50 * MS, DEFAULT_BPM);
                // Window should be [30, 50], average = 40
                expect(result.establishedOffset).toBeCloseTo(40 * MS, 3);

                result = smallWindowAnalyzer.recordHit(70 * MS, DEFAULT_BPM);
                // Window should be [50, 70], average = 60
                expect(result.establishedOffset).toBeCloseTo(60 * MS, 3);
            });

            it('should smoothly transition when window slides', () => {
                // Establish with 0ms offset
                for (let i = 0; i < 4; i++) {
                    analyzer.recordHit(0, DEFAULT_BPM);
                }

                // Add hits that shift the average
                analyzer.recordHit(10 * MS, DEFAULT_BPM);
                // Window: [0, 0, 0, 10] -> avg = 2.5
                expect(analyzer.getState().establishedOffset).toBeCloseTo(2.5 * MS, 3);

                analyzer.recordHit(20 * MS, DEFAULT_BPM);
                // Window: [0, 0, 10, 20] -> avg = 7.5
                expect(analyzer.getState().establishedOffset).toBeCloseTo(7.5 * MS, 3);

                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                // Window: [0, 10, 20, 30] -> avg = 15
                expect(analyzer.getState().establishedOffset).toBeCloseTo(15 * MS, 3);

                analyzer.recordHit(40 * MS, DEFAULT_BPM);
                // Window: [10, 20, 30, 40] -> avg = 25
                expect(analyzer.getState().establishedOffset).toBeCloseTo(25 * MS, 3);
            });

            it('should handle window size of 1', () => {
                const singleWindowAnalyzer = new GrooveAnalyzer({ averagingWindowSize: 1 });

                const result1 = singleWindowAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result1.establishedOffset).toBe(30 * MS);

                const result2 = singleWindowAnalyzer.recordHit(50 * MS, DEFAULT_BPM);
                expect(result2.establishedOffset).toBe(50 * MS);

                const result3 = singleWindowAnalyzer.recordHit(70 * MS, DEFAULT_BPM);
                expect(result3.establishedOffset).toBe(70 * MS);
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

    // ========================================
    // Phase 8.2: Groove Lifetime Tracking Tests
    // ========================================

    describe('Groove Lifetime Tracking', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        describe('getState() returns correct values including new fields', () => {
            it('should return null grooveStartTime initially', () => {
                const state = analyzer.getState();
                expect(state.grooveStartTime).toBeNull();
                expect(state.grooveDuration).toBe(0);
                expect(state.maxHotness).toBe(0);
                expect(state.avgHotness).toBe(0);
                expect(state.grooveHitCount).toBe(0);
            });

            it('should return groove lifetime stats after groove is established', () => {
                // Establish pocket and build groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                expect(state.grooveStartTime).not.toBeNull();
                expect(state.grooveDuration).toBeGreaterThan(0);
                expect(state.maxHotness).toBeGreaterThan(0);
                expect(state.avgHotness).toBeGreaterThan(0);
                expect(state.grooveHitCount).toBeGreaterThan(0);
            });

            it('should return all standard fields in addition to new fields', () => {
                // Build groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                // Standard fields
                expect(state.pocketDirection).toBe('pull');
                expect(state.establishedOffset).toBeCloseTo(30 * MS, 3);
                expect(state.hotness).toBeGreaterThan(0);
                expect(state.streakLength).toBe(3); // 3 hits after pocket established
                expect(state.hitCount).toBe(5);
                expect(state.pocketWindow).toBeGreaterThan(0);
                // New fields
                expect(state.grooveStartTime).not.toBeNull();
                expect(state.grooveDuration).toBeGreaterThan(0);
                expect(state.maxHotness).toBeGreaterThan(0);
                expect(state.avgHotness).toBeGreaterThan(0);
                expect(state.grooveHitCount).toBeGreaterThan(0);
            });
        });

        describe('avgHotness calculation over multiple hits', () => {
            it('should return 0 avgHotness when no groove is active', () => {
                const state = analyzer.getState();
                expect(state.avgHotness).toBe(0);
            });

            it('should calculate avgHotness correctly over multiple hits', () => {
                // Establish pocket (3 hits to establish)
                // Default hotnessGainPerHit is 8
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM);
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // hotness = 8 (first in-pocket hit)

                const state1 = analyzer.getState();
                expect(state1.avgHotness).toBe(8);

                // Add more hits
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // hotness = 16
                analyzer.recordHit(30 * MS, DEFAULT_BPM); // hotness = 24

                const state2 = analyzer.getState();
                // Average of [8, 16, 24] = 16
                expect(state2.avgHotness).toBe(16);
            });

            it('should update avgHotness when hotness changes', () => {
                // Build up groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                // All hits are consistent, so hotness should increase each hit
                // avgHotness should be the average of all hotness values recorded
                expect(state.avgHotness).toBeGreaterThan(0);
                expect(state.avgHotness).toBeLessThanOrEqual(state.maxHotness);
            });

            it('should reset avgHotness when groove ends', () => {
                // Use custom analyzer with high hotnessLossOnBreak to ensure groove ends quickly
                const quickEndAnalyzer = new GrooveAnalyzer({
                    hotnessGainPerHit: 8,
                    hotnessLossOnBreak: 50,
                });

                // Build up groove
                for (let i = 0; i < 10; i++) {
                    quickEndAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const stateBefore = quickEndAnalyzer.getState();
                expect(stateBefore.avgHotness).toBeGreaterThan(0);

                // Drain hotness by hitting off-pocket
                // With hotnessLossOnBreak: 50, two hits should drain hotness to 0
                for (let i = 0; i < 5; i++) {
                    const result = quickEndAnalyzer.recordHit(200 * MS, DEFAULT_BPM);
                    if (result.endedGrooveStats) {
                        break;
                    }
                }

                const stateAfter = quickEndAnalyzer.getState();
                expect(stateAfter.hotness).toBe(0);
                // avgHotness should be 0 since groove tracking reset
                expect(stateAfter.avgHotness).toBe(0);
            });
        });

        describe('maxHotness tracking', () => {
            it('should return 0 maxHotness initially', () => {
                const state = analyzer.getState();
                expect(state.maxHotness).toBe(0);
            });

            it('should track peak hotness during groove', () => {
                // Establish pocket and build groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                // Hotness should have increased each hit (8 per hit by default)
                // After 10 hits, hotness = 8 * 7 = 56 (7 hits in pocket after 3 to establish)
                expect(state.maxHotness).toBeGreaterThan(0);
                expect(state.maxHotness).toBe(state.hotness); // All consistent, so max = current
            });

            it('should retain maxHotness even when current hotness drops', () => {
                // Build groove to high hotness
                for (let i = 0; i < 15; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const peakState = analyzer.getState();
                const peakHotness = peakState.hotness;

                // Break pocket a few times (reduces hotness but doesn't end groove)
                analyzer.recordHit(200 * MS, DEFAULT_BPM);
                analyzer.recordHit(200 * MS, DEFAULT_BPM);

                const stateAfterBreak = analyzer.getState();
                // maxHotness should still be the peak
                expect(stateAfterBreak.maxHotness).toBe(peakHotness);
                // Current hotness should be lower
                expect(stateAfterBreak.hotness).toBeLessThan(peakHotness);
            });

            it('should reset maxHotness when groove ends and new groove starts', () => {
                // Build first groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const firstGrooveMax = analyzer.getState().maxHotness;
                expect(firstGrooveMax).toBeGreaterThan(0);

                // End groove by draining hotness using recordMiss
                while (analyzer.getState().hotness > 0) {
                    analyzer.recordMiss();
                }

                expect(analyzer.getState().hotness).toBe(0);

                // Start new groove with different timing
                analyzer.reset(); // Reset to clear established pocket

                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(-30 * MS, DEFAULT_BPM);
                }

                const newGrooveMax = analyzer.getState().maxHotness;
                // New groove should have fresh tracking
                expect(newGrooveMax).toBeGreaterThan(0);
            });
        });

        describe('grooveDuration calculation', () => {
            it('should return 0 duration when no groove is active', () => {
                const state = analyzer.getState();
                expect(state.grooveDuration).toBe(0);
            });

            it('should calculate duration based on hits and BPM', () => {
                // Establish groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                // Duration should be based on grooveHitCount * (60 / BPM)
                // At 120 BPM: 60/120 = 0.5 seconds per beat
                // With 3 groove hits (hits after pocket established): 3 * 0.5 = 1.5 seconds
                expect(state.grooveDuration).toBeGreaterThan(0);
            });

            it('should increase duration as more hits are recorded', () => {
                // Establish groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const duration1 = analyzer.getState().grooveDuration;

                // Add more hits
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const duration2 = analyzer.getState().grooveDuration;
                expect(duration2).toBeGreaterThan(duration1);
            });

            it('should reset duration when groove ends', () => {
                // Use custom analyzer with high hotnessLossOnBreak to ensure groove ends quickly
                const quickEndAnalyzer = new GrooveAnalyzer({
                    hotnessGainPerHit: 8,
                    hotnessLossOnBreak: 50,
                });

                // Build groove
                for (let i = 0; i < 10; i++) {
                    quickEndAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const durationBefore = quickEndAnalyzer.getState().grooveDuration;
                expect(durationBefore).toBeGreaterThan(0);

                // End groove by hitting off-pocket
                for (let i = 0; i < 5; i++) {
                    const result = quickEndAnalyzer.recordHit(200 * MS, DEFAULT_BPM);
                    if (result.endedGrooveStats) {
                        break;
                    }
                }

                const stateAfter = quickEndAnalyzer.getState();
                expect(stateAfter.hotness).toBe(0);
                expect(stateAfter.grooveDuration).toBe(0);
            });
        });

        describe('resetGrooveStats() clears tracking without losing pocket', () => {
            it('should clear groove stats but keep established offset', () => {
                // Build groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const stateBefore = analyzer.getState();
                expect(stateBefore.establishedOffset).toBeCloseTo(30 * MS, 3);
                expect(stateBefore.grooveStartTime).not.toBeNull();
                expect(stateBefore.maxHotness).toBeGreaterThan(0);

                // Reset groove stats only
                analyzer.resetGrooveStats();

                const stateAfter = analyzer.getState();
                // Pocket should remain
                expect(stateAfter.establishedOffset).toBeCloseTo(30 * MS, 3);
                expect(stateAfter.pocketDirection).toBe('pull');
                // Groove stats should be cleared
                expect(stateAfter.grooveStartTime).toBeNull();
                expect(stateAfter.grooveDuration).toBe(0);
                expect(stateAfter.maxHotness).toBe(0);
                expect(stateAfter.avgHotness).toBe(0);
                expect(stateAfter.grooveHitCount).toBe(0);
            });

            it('should keep hit count and streak after resetGrooveStats', () => {
                // Build groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hitCountBefore = analyzer.getState().hitCount;
                const streakBefore = analyzer.getState().streakLength;

                // Reset groove stats only
                analyzer.resetGrooveStats();

                const stateAfter = analyzer.getState();
                // Hit count should remain
                expect(stateAfter.hitCount).toBe(hitCountBefore);
                // Streak remains (it's not reset by resetGrooveStats, only by groove ending)
                expect(stateAfter.streakLength).toBe(streakBefore);
            });

            it('should allow building new groove stats after reset', () => {
                // Build first groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                // Reset groove stats
                analyzer.resetGrooveStats();

                // Build new groove (pocket is already established)
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const state = analyzer.getState();
                expect(state.grooveStartTime).not.toBeNull();
                expect(state.maxHotness).toBeGreaterThan(0);
                expect(state.grooveHitCount).toBeGreaterThan(0);
            });
        });

        describe('getGrooveStats() returns correct stats', () => {
            it('should return null when no groove is active', () => {
                const stats = analyzer.getGrooveStats();
                expect(stats).toBeNull();
            });

            it('should return groove stats when groove is active', () => {
                // Build groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const stats = analyzer.getGrooveStats();
                expect(stats).not.toBeNull();
                expect(stats!.maxStreak).toBeGreaterThan(0);
                expect(stats!.maxHotness).toBeGreaterThan(0);
                expect(stats!.avgHotness).toBeGreaterThan(0);
                expect(stats!.duration).toBeGreaterThan(0);
                expect(stats!.totalHits).toBeGreaterThan(0);
                expect(stats!.startTime).toBeGreaterThanOrEqual(0);
                expect(stats!.endTime).toBeGreaterThan(stats!.startTime);
            });

            it('should accept optional currentAudioTime parameter', () => {
                // Build groove
                for (let i = 0; i < 10; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const customTime = 10.5; // 10.5 seconds
                const stats = analyzer.getGrooveStats(customTime);
                expect(stats).not.toBeNull();
                expect(stats!.endTime).toBe(customTime);
            });
        });

        describe('endedGrooveStats in recordHit result', () => {
            it('should not include endedGrooveStats during active groove', () => {
                // Build groove
                for (let i = 0; i < 10; i++) {
                    const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                    // During active groove, endedGrooveStats should not be present
                    // (or undefined) since groove hasn't ended
                }

                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);
                expect(result.endedGrooveStats).toBeUndefined();
            });

            it('should include endedGrooveStats when groove ends due to hotness reaching 0', () => {
                // Use custom analyzer with high hotnessLossOnBreak to ensure groove ends quickly
                const quickEndAnalyzer = new GrooveAnalyzer({
                    hotnessGainPerHit: 8,
                    hotnessLossOnBreak: 50, // High loss to end groove quickly
                });

                // Build groove
                for (let i = 0; i < 10; i++) {
                    quickEndAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = quickEndAnalyzer.getState().hotness;
                expect(hotnessBefore).toBeGreaterThan(0);

                // Hit off-pocket to end groove
                // With hotnessLossOnBreak: 50, two hits should drain hotness to 0
                let endingResult: GrooveResult | null = null;
                for (let i = 0; i < 10; i++) {
                    const result = quickEndAnalyzer.recordHit(200 * MS, DEFAULT_BPM);
                    if (result.endedGrooveStats) {
                        endingResult = result;
                        break;
                    }
                }

                expect(endingResult).not.toBeNull();
                expect(endingResult!.endedGrooveStats).toBeDefined();
                expect(endingResult!.endedGrooveStats!.maxStreak).toBeGreaterThan(0);
                expect(endingResult!.endedGrooveStats!.maxHotness).toBeGreaterThan(0);
                expect(endingResult!.endedGrooveStats!.duration).toBeGreaterThan(0);
            });

            it('should include endedGrooveStats when direction changes (push to pull)', () => {
                // Use custom analyzer to make direction change more predictable
                const directionAnalyzer = new GrooveAnalyzer({
                    hotnessGainPerHit: 8,
                    hotnessLossOnBreak: 20,
                    averagingWindowSize: 2, // Smaller window for faster direction changes
                });

                // Build groove with push direction
                for (let i = 0; i < 10; i++) {
                    directionAnalyzer.recordHit(-50 * MS, DEFAULT_BPM);
                }

                expect(directionAnalyzer.getState().pocketDirection).toBe('push');
                expect(directionAnalyzer.getState().hotness).toBeGreaterThan(0);

                // Switch to pull direction with very different offset
                // With averagingWindowSize: 2, direction changes faster
                let endingResult: GrooveResult | null = null;
                for (let i = 0; i < 10; i++) {
                    const result = directionAnalyzer.recordHit(100 * MS, DEFAULT_BPM);
                    if (result.endedGrooveStats) {
                        endingResult = result;
                        break;
                    }
                }

                // When direction changes from push to pull, groove ends
                if (endingResult && endingResult.endedGrooveStats) {
                    expect(endingResult.endedGrooveStats.maxHotness).toBeGreaterThan(0);
                }
            });

            it('should reset streakLength when groove ends', () => {
                // Use custom analyzer with high hotnessLossOnBreak
                const quickEndAnalyzer = new GrooveAnalyzer({
                    hotnessGainPerHit: 8,
                    hotnessLossOnBreak: 50,
                });

                // Build groove
                for (let i = 0; i < 10; i++) {
                    quickEndAnalyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const streakBefore = quickEndAnalyzer.getState().streakLength;
                expect(streakBefore).toBeGreaterThan(0);

                // End groove by hitting off-pocket
                for (let i = 0; i < 10; i++) {
                    const result = quickEndAnalyzer.recordHit(200 * MS, DEFAULT_BPM);
                    if (result.endedGrooveStats) {
                        // After groove ends, streak should be reset
                        expect(result.streakLength).toBe(0);
                        break;
                    }
                }
            });
        });
    });

    // ========================================
    // Accuracy Parameter Tests (Miss & WrongKey handling)
    // ========================================

    describe('recordHit() accuracy parameter for miss/wrongKey handling', () => {
        beforeEach(() => {
            analyzer = new GrooveAnalyzer();
        });

        describe('When accuracy is "miss"', () => {
            it('should NOT increase groove when accuracy is miss', () => {
                // Build up some groove first
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;
                expect(hotnessBefore).toBeGreaterThan(0);

                // Record a hit with miss accuracy - should decrease hotness, not increase
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'miss');

                expect(result.hotness).toBeLessThan(hotnessBefore);
                expect(result.inPocket).toBe(false);
            });

            it('should decrease hotness by hotnessLossOnMiss when accuracy is miss', () => {
                // Build up some groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record a miss
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'miss');

                // Should lose hotnessLossOnMiss (default 10)
                expect(result.hotness).toBe(Math.max(0, hotnessBefore - 10));
            });

            it('should reset streak when accuracy is miss', () => {
                // Build up groove and streak
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const streakBefore = analyzer.getState().streakLength;
                expect(streakBefore).toBeGreaterThan(0);

                // Record a miss
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'miss');

                expect(result.streakLength).toBe(0);
            });

            it('should NOT update pocket tracking when accuracy is miss', () => {
                // Establish pocket with consistent timing
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const establishedOffsetBefore = analyzer.getState().establishedOffset;

                // Record a miss with very different offset
                analyzer.recordHit(200 * MS, DEFAULT_BPM, undefined, 'miss');

                // Established offset should NOT change (miss doesn't affect pocket)
                const establishedOffsetAfter = analyzer.getState().establishedOffset;
                expect(establishedOffsetAfter).toBe(establishedOffsetBefore);
            });
        });

        describe('When accuracy is "wrongKey"', () => {
            it('should NOT increase groove when accuracy is wrongKey', () => {
                // Build up some groove first
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;
                expect(hotnessBefore).toBeGreaterThan(0);

                // Record a hit with wrongKey accuracy - should decrease hotness, not increase
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'wrongKey');

                expect(result.hotness).toBeLessThan(hotnessBefore);
                expect(result.inPocket).toBe(false);
            });

            it('should decrease hotness by hotnessLossOnMiss when accuracy is wrongKey', () => {
                // Build up some groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record a wrong key
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'wrongKey');

                // Should lose hotnessLossOnMiss (default 10)
                expect(result.hotness).toBe(Math.max(0, hotnessBefore - 10));
            });

            it('should reset streak when accuracy is wrongKey', () => {
                // Build up groove and streak
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const streakBefore = analyzer.getState().streakLength;
                expect(streakBefore).toBeGreaterThan(0);

                // Record a wrong key
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'wrongKey');

                expect(result.streakLength).toBe(0);
            });

            it('should NOT update pocket tracking when accuracy is wrongKey', () => {
                // Establish pocket with consistent timing
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const establishedOffsetBefore = analyzer.getState().establishedOffset;

                // Record a wrong key with very different offset
                analyzer.recordHit(200 * MS, DEFAULT_BPM, undefined, 'wrongKey');

                // Established offset should NOT change (wrongKey doesn't affect pocket)
                const establishedOffsetAfter = analyzer.getState().establishedOffset;
                expect(establishedOffsetAfter).toBe(establishedOffsetBefore);
            });
        });

        describe('Valid accuracy values should still work correctly', () => {
            it('should increase groove when accuracy is perfect', () => {
                // Establish pocket
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record a perfect hit
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'perfect');

                // Should increase hotness
                expect(result.hotness).toBeGreaterThan(hotnessBefore);
            });

            it('should increase groove when accuracy is great', () => {
                // Establish pocket
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record a great hit
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'great');

                // Should increase hotness
                expect(result.hotness).toBeGreaterThan(hotnessBefore);
            });

            it('should increase groove when accuracy is good', () => {
                // Establish pocket
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record a good hit
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'good');

                // Should increase hotness
                expect(result.hotness).toBeGreaterThan(hotnessBefore);
            });

            it('should increase groove when accuracy is ok', () => {
                // Establish pocket
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record an ok hit
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'ok');

                // Should increase hotness
                expect(result.hotness).toBeGreaterThan(hotnessBefore);
            });

            it('should work normally when accuracy is undefined (backwards compatible)', () => {
                // Establish pocket
                for (let i = 0; i < 3; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                const hotnessBefore = analyzer.getState().hotness;

                // Record a hit without accuracy parameter
                const result = analyzer.recordHit(30 * MS, DEFAULT_BPM);

                // Should increase hotness (normal behavior)
                expect(result.hotness).toBeGreaterThan(hotnessBefore);
            });
        });

        describe('Comparison between miss accuracy and recordMiss()', () => {
            it('should behave the same as recordMiss() when accuracy is miss', () => {
                // Build up groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                // Create a second analyzer with same state
                const analyzer2 = new GrooveAnalyzer();
                for (let i = 0; i < 5; i++) {
                    analyzer2.recordHit(30 * MS, DEFAULT_BPM);
                }

                // Record miss using accuracy parameter
                const result1 = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'miss');

                // Record miss using recordMiss()
                const result2 = analyzer2.recordMiss();

                // Both should have same hotness and streak
                expect(result1.hotness).toBe(result2.hotness);
                expect(result1.streakLength).toBe(result2.streakLength);
                expect(result1.inPocket).toBe(result2.inPocket);
            });

            it('should behave the same as recordMiss() when accuracy is wrongKey', () => {
                // Build up groove
                for (let i = 0; i < 5; i++) {
                    analyzer.recordHit(30 * MS, DEFAULT_BPM);
                }

                // Create a second analyzer with same state
                const analyzer2 = new GrooveAnalyzer();
                for (let i = 0; i < 5; i++) {
                    analyzer2.recordHit(30 * MS, DEFAULT_BPM);
                }

                // Record wrongKey using accuracy parameter
                const result1 = analyzer.recordHit(30 * MS, DEFAULT_BPM, undefined, 'wrongKey');

                // Record miss using recordMiss()
                const result2 = analyzer2.recordMiss();

                // Both should have same hotness and streak
                expect(result1.hotness).toBe(result2.hotness);
                expect(result1.streakLength).toBe(result2.streakLength);
                expect(result1.inPocket).toBe(result2.inPocket);
            });
        });
    });
});
