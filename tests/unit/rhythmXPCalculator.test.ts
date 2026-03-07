/**
 * Unit tests for RhythmXPCalculator
 *
 * Tests the rhythm game XP system that integrates with the beat detection
 * and progression systems.
 *
 * @see docs/plans/RHYTHM_XP_PLAN.md Phase 8.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RhythmXPCalculator } from '../../src/core/progression/RhythmXPCalculator.js';

describe('RhythmXPCalculator', () => {
    let calculator: RhythmXPCalculator;

    describe('calculateButtonPressXP', () => {
        beforeEach(() => {
            calculator = new RhythmXPCalculator();
        });

        describe('All accuracy levels return correct base score', () => {
            it('should return correct base score for perfect accuracy', () => {
                const result = calculator.calculateButtonPressXP('perfect');
                expect(result.scorePoints).toBe(10);
            });

            it('should return correct base score for great accuracy', () => {
                const result = calculator.calculateButtonPressXP('great');
                expect(result.scorePoints).toBe(7);
            });

            it('should return correct base score for good accuracy', () => {
                const result = calculator.calculateButtonPressXP('good');
                expect(result.scorePoints).toBe(5);
            });

            it('should return correct base score for ok accuracy', () => {
                const result = calculator.calculateButtonPressXP('ok');
                expect(result.scorePoints).toBe(2);
            });

            it('should return correct base score for miss accuracy', () => {
                const result = calculator.calculateButtonPressXP('miss');
                expect(result.scorePoints).toBe(0);
            });

            it('should return correct base score for wrongKey accuracy', () => {
                const result = calculator.calculateButtonPressXP('wrongKey');
                expect(result.scorePoints).toBe(0);
            });

            it('should use custom baseXP values when configured', () => {
                const customCalculator = new RhythmXPCalculator({
                    baseXP: {
                        perfect: 100,
                        great: 50,
                        good: 25,
                        ok: 10,
                        miss: 0,
                        wrongKey: 0,
                    },
                });

                expect(customCalculator.calculateButtonPressXP('perfect').scorePoints).toBe(100);
                expect(customCalculator.calculateButtonPressXP('great').scorePoints).toBe(50);
                expect(customCalculator.calculateButtonPressXP('good').scorePoints).toBe(25);
                expect(customCalculator.calculateButtonPressXP('ok').scorePoints).toBe(10);
            });
        });

        describe('xpRatio correctly converts score to XP', () => {
            it('should apply default xpRatio (0.1) to convert score to XP', () => {
                const result = calculator.calculateButtonPressXP('perfect');
                // 10 score * 0.1 ratio = 1 XP
                expect(result.baseXP).toBe(1);
            });

            it('should apply custom xpRatio when configured', () => {
                const customCalculator = new RhythmXPCalculator({
                    xpRatio: 0.5, // 10 score = 5 XP
                });

                const result = customCalculator.calculateButtonPressXP('perfect');
                expect(result.baseXP).toBe(5);
            });

            it('should support xpRatio of 1.0 (no conversion)', () => {
                const customCalculator = new RhythmXPCalculator({
                    xpRatio: 1.0,
                });

                const result = customCalculator.calculateButtonPressXP('perfect');
                expect(result.baseXP).toBe(10);
            });

            it('should support fractional xpRatio', () => {
                const customCalculator = new RhythmXPCalculator({
                    xpRatio: 0.05, // 10 score = 0.5 XP
                });

                const result = customCalculator.calculateButtonPressXP('perfect');
                expect(result.baseXP).toBe(0.5);
            });
        });

        describe('Combo multiplier applies correctly', () => {
            it('should return 1x multiplier when combo is 0', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 0 });
                expect(result.comboMultiplier).toBe(1);
            });

            it('should return 1x multiplier when combo is not provided', () => {
                const result = calculator.calculateButtonPressXP('perfect');
                expect(result.comboMultiplier).toBe(1);
            });

            it('should return 3x multiplier at combo 50 (default formula)', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 50 });
                // 1 + (50/25) = 3
                expect(result.comboMultiplier).toBe(3);
            });

            it('should return 5x multiplier at combo 100 (default formula)', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 100 });
                // 1 + (100/25) = 5
                expect(result.comboMultiplier).toBe(5);
            });

            it('should return 5x multiplier at combo 200 (capped)', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 200 });
                // 1 + (200/25) = 9, but capped at 5
                expect(result.comboMultiplier).toBe(5);
            });

            it('should return 1.04x multiplier at combo 1 (default formula)', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 1 });
                // 1 + (1/25) = 1.04
                expect(result.comboMultiplier).toBeCloseTo(1.04, 2);
            });

            it('should return 2x multiplier at combo 25 (default formula)', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 25 });
                // 1 + (25/25) = 2
                expect(result.comboMultiplier).toBe(2);
            });

            it('should return 1x multiplier when combo is disabled', () => {
                const customCalculator = new RhythmXPCalculator({
                    combo: { enabled: false, cap: 5.0, endBonus: { enabled: true } },
                });

                const result = customCalculator.calculateButtonPressXP('perfect', { comboLength: 100 });
                expect(result.comboMultiplier).toBe(1);
            });
        });

        describe('Custom combo formula works', () => {
            it('should use custom combo formula when provided', () => {
                // Custom formula: linear + 0.1 every 10 hits
                const customCalculator = new RhythmXPCalculator({
                    combo: {
                        enabled: true,
                        cap: 10.0,
                        formula: (combo) => 1 + Math.floor(combo / 10) * 0.1,
                        endBonus: { enabled: true },
                    },
                });

                // 10 combo = 1.1x
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 10 }).comboMultiplier).toBe(1.1);
                // 20 combo = 1.2x
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 20 }).comboMultiplier).toBe(1.2);
                // 25 combo = still 1.2x (floor)
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 25 }).comboMultiplier).toBe(1.2);
                // 100 combo = 2.0x
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 100 }).comboMultiplier).toBe(2.0);
            });

            it('should support exponential formula', () => {
                // Custom formula: logarithmic growth
                const customCalculator = new RhythmXPCalculator({
                    combo: {
                        enabled: true,
                        cap: 10.0,
                        formula: (combo) => 1 + Math.log10(combo + 1),
                        endBonus: { enabled: true },
                    },
                });

                // 0 combo = 1 + log10(1) = 1
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 0 }).comboMultiplier).toBe(1);
                // 9 combo = 1 + log10(10) = 2
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 9 }).comboMultiplier).toBe(2);
                // 99 combo = 1 + log10(100) = 3
                expect(customCalculator.calculateButtonPressXP('perfect', { comboLength: 99 }).comboMultiplier).toBe(3);
            });
        });

        describe('Cap is respected', () => {
            it('should cap combo multiplier at configured cap (default 5.0)', () => {
                // At combo 250, default formula would give 6x, but cap is 5.0
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 250 });
                expect(result.comboMultiplier).toBe(5);
            });

            it('should respect custom combo cap', () => {
                const customCalculator = new RhythmXPCalculator({
                    combo: {
                        enabled: true,
                        cap: 3.0,
                        endBonus: { enabled: true },
                    },
                });

                // At combo 100, formula gives 3x
                const result = customCalculator.calculateButtonPressXP('perfect', { comboLength: 100 });
                expect(result.comboMultiplier).toBe(3);

                // At combo 200, formula would give 5x but cap is 3.0
                const result2 = customCalculator.calculateButtonPressXP('perfect', { comboLength: 200 });
                expect(result2.comboMultiplier).toBe(3);
            });

            it('should cap total multiplier at maxMultiplier config', () => {
                const customCalculator = new RhythmXPCalculator({
                    combo: { enabled: true, cap: 10.0, endBonus: { enabled: true } },
                    groove: { perHitMultiplier: true, perHitScale: 2.0, endBonus: { enabled: true } },
                    maxMultiplier: 5.0,
                });

                // combo 100 = 3x, groove 100% * 2.0 = 2x, total would be 5x
                const result = customCalculator.calculateButtonPressXP('perfect', {
                    comboLength: 100,
                    grooveHotness: 100,
                });
                expect(result.totalMultiplier).toBe(5);

                // combo 200 = 5x (from formula), groove adds more, but total capped at 5
                const result2 = customCalculator.calculateButtonPressXP('perfect', {
                    comboLength: 200,
                    grooveHotness: 100,
                });
                expect(result2.totalMultiplier).toBe(5);
            });
        });

        describe('Groove per-hit multiplier (when enabled)', () => {
            it('should not apply groove multiplier when perHitMultiplier is disabled (default)', () => {
                const result = calculator.calculateButtonPressXP('perfect', { grooveHotness: 100 });
                expect(result.grooveMultiplier).toBe(0);
            });

            it('should apply groove multiplier when perHitMultiplier is enabled', () => {
                const customCalculator = new RhythmXPCalculator({
                    groove: {
                        perHitMultiplier: true,
                        perHitScale: 1.0,
                        endBonus: { enabled: true },
                    },
                });

                // 100% hotness * 1.0 scale = 1.0x groove multiplier
                const result = customCalculator.calculateButtonPressXP('perfect', { grooveHotness: 100 });
                expect(result.grooveMultiplier).toBe(1);
            });

            it('should scale groove multiplier based on hotness', () => {
                const customCalculator = new RhythmXPCalculator({
                    groove: {
                        perHitMultiplier: true,
                        perHitScale: 1.0,
                        endBonus: { enabled: true },
                    },
                });

                // 50% hotness * 1.0 scale = 0.5x groove multiplier
                const result = customCalculator.calculateButtonPressXP('perfect', { grooveHotness: 50 });
                expect(result.grooveMultiplier).toBe(0.5);
            });

            it('should apply perHitScale to groove multiplier', () => {
                const customCalculator = new RhythmXPCalculator({
                    groove: {
                        perHitMultiplier: true,
                        perHitScale: 2.0, // Double the effect
                        endBonus: { enabled: true },
                    },
                });

                // 100% hotness * 2.0 scale = 2.0x groove multiplier
                const result = customCalculator.calculateButtonPressXP('perfect', { grooveHotness: 100 });
                expect(result.grooveMultiplier).toBe(2);
            });

            it('should return 0 groove multiplier when hotness is 0', () => {
                const customCalculator = new RhythmXPCalculator({
                    groove: {
                        perHitMultiplier: true,
                        perHitScale: 1.0,
                        endBonus: { enabled: true },
                    },
                });

                const result = customCalculator.calculateButtonPressXP('perfect', { grooveHotness: 0 });
                expect(result.grooveMultiplier).toBe(0);
            });

            it('should return 0 groove multiplier when hotness is undefined', () => {
                const customCalculator = new RhythmXPCalculator({
                    groove: {
                        perHitMultiplier: true,
                        perHitScale: 1.0,
                        endBonus: { enabled: true },
                    },
                });

                const result = customCalculator.calculateButtonPressXP('perfect');
                expect(result.grooveMultiplier).toBe(0);
            });
        });

        describe('finalScore vs finalXP are correctly separated', () => {
            it('should calculate finalScore from scorePoints and totalMultiplier', () => {
                // perfect = 10 score, combo 50 = 3x multiplier (1 + 50/25)
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 50 });
                expect(result.finalScore).toBe(30); // 10 * 3 = 30
            });

            it('should calculate finalXP from baseXP and totalMultiplier', () => {
                // perfect = 10 score = 1 XP (0.1 ratio), combo 50 = 3x multiplier
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 50 });
                expect(result.finalXP).toBe(3); // 1 * 3 = 3
            });

            it('should keep finalScore and finalXP proportionally different based on xpRatio', () => {
                const customCalculator = new RhythmXPCalculator({
                    xpRatio: 0.2, // 10 score = 2 XP
                });

                const result = customCalculator.calculateButtonPressXP('perfect', { comboLength: 50 });
                expect(result.finalScore).toBe(30); // 10 * 3
                expect(result.finalXP).toBe(6); // 2 * 3
            });

            it('should apply totalMultiplier to both finalScore and finalXP', () => {
                const customCalculator = new RhythmXPCalculator({
                    combo: { enabled: true, cap: 5.0, endBonus: { enabled: true } },
                    groove: {
                        perHitMultiplier: true,
                        perHitScale: 1.0,
                        endBonus: { enabled: true },
                    },
                });

                const result = customCalculator.calculateButtonPressXP('perfect', {
                    comboLength: 50, // 3x (1 + 50/25)
                    grooveHotness: 50, // 0.5x
                });

                // totalMultiplier = 3 + 0.5 = 3.5
                expect(result.totalMultiplier).toBe(3.5);
                expect(result.finalScore).toBe(35); // 10 * 3.5
                expect(result.finalXP).toBe(3.5); // 1 * 3.5
            });
        });

        describe('Negative baseXP values do not result in negative finalXP (floored at 0)', () => {
            it('should floor finalXP at 0 when miss has negative baseXP', () => {
                const customCalculator = new RhythmXPCalculator({
                    baseXP: {
                        perfect: 10,
                        great: 7,
                        good: 5,
                        ok: 2,
                        miss: -5,
                        wrongKey: 0,
                    },
                });

                const result = customCalculator.calculateButtonPressXP('miss');
                // scorePoints = -5, baseXP = -0.5, but finalXP should be floored at 0
                expect(result.scorePoints).toBe(-5);
                expect(result.baseXP).toBe(-0.5);
                expect(result.finalXP).toBe(0);
            });

            it('should floor finalXP at 0 when wrongKey has negative baseXP', () => {
                const customCalculator = new RhythmXPCalculator({
                    baseXP: {
                        perfect: 10,
                        great: 7,
                        good: 5,
                        ok: 2,
                        miss: 0,
                        wrongKey: -10,
                    },
                });

                const result = customCalculator.calculateButtonPressXP('wrongKey');
                expect(result.scorePoints).toBe(-10);
                expect(result.baseXP).toBe(-1);
                expect(result.finalXP).toBe(0);
            });

            it('should still apply multiplier to score but floor XP at 0', () => {
                const customCalculator = new RhythmXPCalculator({
                    baseXP: {
                        perfect: 10,
                        great: 7,
                        good: 5,
                        ok: 2,
                        miss: -5,
                        wrongKey: 0,
                    },
                });

                // Even with combo, negative XP should be floored at 0
                const result = customCalculator.calculateButtonPressXP('miss', { comboLength: 50 });
                expect(result.scorePoints).toBe(-5);
                expect(result.finalScore).toBe(-15); // -5 * 3 = -15 (score can be negative)
                expect(result.finalXP).toBe(0); // Floored at 0
            });
        });

        describe('Breakdown contains correct values', () => {
            it('should include accuracy in breakdown', () => {
                const result = calculator.calculateButtonPressXP('perfect', { comboLength: 50, grooveHotness: 75 });
                expect(result.breakdown.accuracy).toBe('perfect');
            });

            it('should include comboLength in breakdown', () => {
                const result = calculator.calculateButtonPressXP('great', { comboLength: 100, grooveHotness: 75 });
                expect(result.breakdown.comboLength).toBe(100);
            });

            it('should include grooveHotness in breakdown when provided', () => {
                const result = calculator.calculateButtonPressXP('good', { comboLength: 25, grooveHotness: 80 });
                expect(result.breakdown.grooveHotness).toBe(80);
            });

            it('should have undefined grooveHotness in breakdown when not provided', () => {
                const result = calculator.calculateButtonPressXP('ok', { comboLength: 10 });
                expect(result.breakdown.grooveHotness).toBeUndefined();
            });
        });
    });

    describe('calculateComboEndBonus', () => {
        beforeEach(() => {
            calculator = new RhythmXPCalculator();
        });

        it('should return 0 bonus for combo length 0', () => {
            const result = calculator.calculateComboEndBonus(0);
            expect(result.bonusScore).toBe(0);
            expect(result.bonusXP).toBe(0);
        });

        it('should return 0 bonus for negative combo length', () => {
            const result = calculator.calculateComboEndBonus(-5);
            expect(result.bonusScore).toBe(0);
            expect(result.bonusXP).toBe(0);
        });

        it('should use default formula (comboLength * 5)', () => {
            // 10 combo = 50 bonus score = 5 XP (0.1 ratio)
            const result = calculator.calculateComboEndBonus(10);
            expect(result.comboLength).toBe(10);
            expect(result.bonusScore).toBe(50);
            expect(result.bonusXP).toBe(5);
        });

        it('should calculate bonus for large combo', () => {
            // 50 combo = 250 bonus score = 25 XP
            const result = calculator.calculateComboEndBonus(50);
            expect(result.bonusScore).toBe(250);
            expect(result.bonusXP).toBe(25);
        });

        it('should use custom formula when configured', () => {
            const customCalculator = new RhythmXPCalculator({
                combo: {
                    enabled: true,
                    cap: 5.0,
                    endBonus: {
                        enabled: true,
                        formula: (combo) => combo * 5, // 5x instead of 2x
                    },
                },
            });

            const result = customCalculator.calculateComboEndBonus(10);
            expect(result.bonusScore).toBe(50); // 10 * 5
            expect(result.bonusXP).toBe(5); // 50 * 0.1
        });

        it('should return 0 bonus when endBonus is disabled', () => {
            const customCalculator = new RhythmXPCalculator({
                combo: {
                    enabled: true,
                    cap: 5.0,
                    endBonus: { enabled: false },
                },
            });

            const result = customCalculator.calculateComboEndBonus(50);
            expect(result.bonusScore).toBe(0);
            expect(result.bonusXP).toBe(0);
        });

        it('should apply xpRatio to bonus', () => {
            const customCalculator = new RhythmXPCalculator({
                xpRatio: 0.5, // 10 score = 5 XP
            });

            const result = customCalculator.calculateComboEndBonus(10);
            expect(result.bonusScore).toBe(50); // 10 * 5
            expect(result.bonusXP).toBe(25); // 50 * 0.5
        });
    });

    describe('calculateGrooveEndBonus', () => {
        beforeEach(() => {
            calculator = new RhythmXPCalculator();
        });

        it('should calculate bonus using weighted formula', () => {
            // Default weights: maxStreakWeight: 5, avgHotnessWeight: 5, durationWeight: 5
            const result = calculator.calculateGrooveEndBonus({
                maxStreak: 50, // 50 * 5 = 250
                avgHotness: 80, // 80 * 5 = 400
                duration: 10, // 10 * 5 = 50
                totalHits: 100,
            });

            // bonusScore = 250 + 400 + 50 = 700
            // bonusXP = 700 * 0.1 = 70
            expect(result.bonusScore).toBe(700);
            expect(result.bonusXP).toBe(70);
        });

        it('should handle zero values', () => {
            const result = calculator.calculateGrooveEndBonus({
                maxStreak: 0,
                avgHotness: 0,
                duration: 0,
                totalHits: 0,
            });

            expect(result.bonusScore).toBe(0);
            expect(result.bonusXP).toBe(0);
        });

        it('should return 0 bonus when endBonus is disabled', () => {
            const customCalculator = new RhythmXPCalculator({
                groove: {
                    perHitMultiplier: false,
                    perHitScale: 1.0,
                    endBonus: { enabled: false },
                },
            });

            const result = customCalculator.calculateGrooveEndBonus({
                maxStreak: 100,
                avgHotness: 100,
                duration: 60,
                totalHits: 200,
            });

            expect(result.bonusScore).toBe(0);
            expect(result.bonusXP).toBe(0);
        });

        it('should apply xpRatio to bonus', () => {
            const customCalculator = new RhythmXPCalculator({
                xpRatio: 0.5,
            });

            const result = customCalculator.calculateGrooveEndBonus({
                maxStreak: 50, // 50 * 5 = 250
                avgHotness: 80, // 80 * 5 = 400
                duration: 10, // 10 * 5 = 50
                totalHits: 100,
            });

            // bonusScore = 250 + 400 + 50 = 700
            // bonusXP = 700 * 0.5 = 350
            expect(result.bonusScore).toBe(700);
            expect(result.bonusXP).toBe(350);
        });

        it('should use custom weights', () => {
            const customCalculator = new RhythmXPCalculator({
                groove: {
                    perHitMultiplier: false,
                    perHitScale: 1.0,
                    endBonus: {
                        enabled: true,
                        maxStreakWeight: 0.6,
                        avgHotnessWeight: 0.3,
                        durationWeight: 0.1,
                    },
                },
            });

            const result = customCalculator.calculateGrooveEndBonus({
                maxStreak: 50, // 50 * 0.6 = 30
                avgHotness: 80, // 80 * 0.3 = 24
                duration: 10, // 10 * 0.1 = 1
                totalHits: 100,
            });

            // bonusScore = 30 + 24 + 1 = 55
            expect(result.bonusScore).toBe(55);
        });
    });

    describe('Session Tracking', () => {
        beforeEach(() => {
            calculator = new RhythmXPCalculator();
        });

        describe('startSession', () => {
            it('should reset all totals when starting a session', () => {
                calculator.startSession();
                const totals = calculator.getSessionTotals();

                expect(totals).not.toBeNull();
                expect(totals!.totalScore).toBe(0);
                expect(totals!.totalXP).toBe(0);
                expect(totals!.maxCombo).toBe(0);
                expect(totals!.accuracyPercentage).toBe(0);
                expect(totals!.duration).toBe(0);
                expect(totals!.accuracyDistribution.perfect).toBe(0);
                expect(totals!.accuracyDistribution.great).toBe(0);
                expect(totals!.accuracyDistribution.good).toBe(0);
                expect(totals!.accuracyDistribution.ok).toBe(0);
                expect(totals!.accuracyDistribution.miss).toBe(0);
                expect(totals!.accuracyDistribution.wrongKey).toBe(0);
            });
        });

        describe('recordHit', () => {
            it('should auto-start session if not started', () => {
                const result = calculator.recordHit('perfect');
                const totals = calculator.getSessionTotals();

                expect(result).toBeDefined();
                expect(totals).not.toBeNull();
            });

            it('should update session totals correctly', () => {
                calculator.startSession();
                calculator.recordHit('perfect', { comboLength: 10 });
                calculator.recordHit('great', { comboLength: 11 });
                calculator.recordHit('perfect', { comboLength: 12 });

                const totals = calculator.getSessionTotals();
                expect(totals!.accuracyDistribution.perfect).toBe(2);
                expect(totals!.accuracyDistribution.great).toBe(1);
            });

            it('should track maxCombo correctly', () => {
                calculator.startSession();
                calculator.recordHit('perfect', { comboLength: 10 });
                calculator.recordHit('perfect', { comboLength: 20 });
                calculator.recordHit('perfect', { comboLength: 15 }); // Lower combo

                const totals = calculator.getSessionTotals();
                expect(totals!.maxCombo).toBe(20);
            });

            it('should accumulate totalScore and totalXP', () => {
                calculator.startSession();
                const result1 = calculator.recordHit('perfect', { comboLength: 50 }); // 20 score, 2 XP
                const result2 = calculator.recordHit('great', { comboLength: 51 }); // 14 score, 1.4 XP

                const totals = calculator.getSessionTotals();
                expect(totals!.totalScore).toBe(result1.finalScore + result2.finalScore);
                expect(totals!.totalXP).toBe(result1.finalXP + result2.finalXP);
            });
        });

        describe('getSessionTotals', () => {
            it('should return null when no session is active', () => {
                const totals = calculator.getSessionTotals();
                expect(totals).toBeNull();
            });

            it('should return accurate snapshot', () => {
                calculator.startSession();
                calculator.recordHit('perfect', { comboLength: 10 });
                calculator.recordHit('perfect', { comboLength: 20 });
                calculator.recordHit('great', { comboLength: 25 });
                calculator.recordHit('good', { comboLength: 30 });
                calculator.recordHit('miss', { comboLength: 0 });

                const totals = calculator.getSessionTotals();
                expect(totals!.accuracyDistribution.perfect).toBe(2);
                expect(totals!.accuracyDistribution.great).toBe(1);
                expect(totals!.accuracyDistribution.good).toBe(1);
                expect(totals!.accuracyDistribution.miss).toBe(1);
                expect(totals!.maxCombo).toBe(30);
            });

            it('should calculate accuracyPercentage correctly', () => {
                calculator.startSession();
                calculator.recordHit('perfect'); // 1
                calculator.recordHit('perfect'); // 2
                calculator.recordHit('great'); // 3
                calculator.recordHit('miss'); // 4 (not successful)
                calculator.recordHit('wrongKey'); // 5 (not successful)

                const totals = calculator.getSessionTotals();
                // 3 successful out of 5 = 60%
                expect(totals!.accuracyPercentage).toBe(60);
            });

            it('should handle 100% accuracy', () => {
                calculator.startSession();
                calculator.recordHit('perfect');
                calculator.recordHit('perfect');
                calculator.recordHit('perfect');

                const totals = calculator.getSessionTotals();
                expect(totals!.accuracyPercentage).toBe(100);
            });

            it('should handle 0% accuracy', () => {
                calculator.startSession();
                calculator.recordHit('miss');
                calculator.recordHit('miss');
                calculator.recordHit('wrongKey');

                const totals = calculator.getSessionTotals();
                expect(totals!.accuracyPercentage).toBe(0);
            });
        });

        describe('endSession', () => {
            it('should return final totals and clear session state', () => {
                calculator.startSession();
                calculator.recordHit('perfect', { comboLength: 50 });
                calculator.recordHit('great', { comboLength: 51 });

                const finalTotals = calculator.endSession();

                expect(finalTotals).not.toBeNull();
                expect(finalTotals!.accuracyDistribution.perfect).toBe(1);
                expect(finalTotals!.accuracyDistribution.great).toBe(1);

                // Session should be cleared
                expect(calculator.getSessionTotals()).toBeNull();
            });

            it('should return null when no session was active', () => {
                const finalTotals = calculator.endSession();
                expect(finalTotals).toBeNull();
            });
        });
    });

    describe('Configuration', () => {
        it('should return current config via getConfig()', () => {
            calculator = new RhythmXPCalculator({ xpRatio: 0.5 });
            const config = calculator.getConfig();

            expect(config.xpRatio).toBe(0.5);
        });

        it('should update config via updateConfig()', () => {
            calculator = new RhythmXPCalculator({ xpRatio: 0.1 });
            calculator.updateConfig({ xpRatio: 0.5 });

            const config = calculator.getConfig();
            expect(config.xpRatio).toBe(0.5);
        });

        it('should merge partial config updates', () => {
            calculator = new RhythmXPCalculator({
                xpRatio: 0.1,
                baseXP: { perfect: 10, great: 7, good: 5, ok: 2, miss: 0, wrongKey: 0 },
            });

            calculator.updateConfig({ xpRatio: 0.2 });

            const config = calculator.getConfig();
            expect(config.xpRatio).toBe(0.2);
            // Other settings should be preserved
            expect(config.baseXP.perfect).toBe(10);
        });
    });

    describe('Helper Methods', () => {
        beforeEach(() => {
            calculator = new RhythmXPCalculator();
        });

        describe('getBaseXP', () => {
            it('should return correct base XP for each accuracy', () => {
                expect(calculator.getBaseXP('perfect')).toBe(10);
                expect(calculator.getBaseXP('great')).toBe(7);
                expect(calculator.getBaseXP('good')).toBe(5);
                expect(calculator.getBaseXP('ok')).toBe(2);
                expect(calculator.getBaseXP('miss')).toBe(0);
                expect(calculator.getBaseXP('wrongKey')).toBe(0);
            });
        });

        describe('getComboMultiplier', () => {
            it('should return correct multiplier for combo values', () => {
                // Formula: 1 + comboLength / 25
                expect(calculator.getComboMultiplier(0)).toBe(1);
                expect(calculator.getComboMultiplier(25)).toBe(2);
                expect(calculator.getComboMultiplier(50)).toBe(3);
                expect(calculator.getComboMultiplier(100)).toBe(5);
                expect(calculator.getComboMultiplier(200)).toBe(5); // Capped at 5
            });

            it('should respect cap', () => {
                // 300 combo would give 13x, but cap is 5.0
                expect(calculator.getComboMultiplier(300)).toBe(5);
            });
        });
    });
});
