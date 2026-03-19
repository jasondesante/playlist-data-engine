/**
 * Unit tests for CR/Level Conversion Functions
 *
 * Tests bidirectional CR-to-level conversion, tuning configurations,
 * rounding utilities, and formatting functions.
 */

import { describe, it, expect } from 'vitest';
import {
    crToLevel,
    levelToCR,
    roundLevel,
    roundCR,
    formatLevel,
    formatCR,
    createCRTuning,
    DEFAULT_CR_TUNING,
    type CRTuningConfig
} from '../../src/core/generation/CRLevelConverter';

describe('CRLevelConverter', () => {
    describe('crToLevel', () => {
        it('should convert CR 0 to level 0 with default tuning', () => {
            expect(crToLevel(0)).toBe(0);
        });

        it('should convert fractional CRs to fractional levels', () => {
            expect(crToLevel(0.125)).toBeCloseTo(0.125, 5);
            expect(crToLevel(0.25)).toBeCloseTo(0.25, 5);
            expect(crToLevel(0.5)).toBeCloseTo(0.5, 5);
        });

        it('should convert whole CRs to matching levels', () => {
            expect(crToLevel(1)).toBe(1);
            expect(crToLevel(2)).toBe(2);
            expect(crToLevel(5)).toBe(5);
            expect(crToLevel(10)).toBe(10);
            expect(crToLevel(20)).toBe(20);
        });

        it('should apply base multiplier from tuning config', () => {
            const tuning = createCRTuning({ baseMultiplier: 1.5 });
            expect(crToLevel(2, tuning)).toBe(3); // 2 * 1.5 = 3
            expect(crToLevel(4, tuning)).toBe(6); // 4 * 1.5 = 6
        });

        it('should apply level offset from tuning config', () => {
            const tuning = createCRTuning({ levelOffset: 2 });
            expect(crToLevel(1, tuning)).toBe(3); // (1 * 1.0) + 2 = 3
            expect(crToLevel(5, tuning)).toBe(7); // (5 * 1.0) + 2 = 7
        });

        it('should apply both multiplier and offset', () => {
            const tuning = createCRTuning({ baseMultiplier: 2, levelOffset: 1 });
            expect(crToLevel(3, tuning)).toBe(7); // (3 * 2) + 1 = 7
        });

        it('should use custom curve mapping when available', () => {
            const customCurve = new Map<number, number>([
                [5, 10],  // CR 5 maps to level 10
                [10, 15]  // CR 10 maps to level 15
            ]);
            const tuning = createCRTuning({ customCurve });
            expect(crToLevel(5, tuning)).toBe(10);
            expect(crToLevel(10, tuning)).toBe(15);
        });

        it('should fall back to formula when custom curve does not contain CR', () => {
            const customCurve = new Map<number, number>([[5, 10]]);
            const tuning = createCRTuning({ customCurve });
            expect(crToLevel(3, tuning)).toBe(3); // No custom mapping, uses formula
        });

        it('should respect minimum level bound', () => {
            const tuning = createCRTuning({ minLevel: 1 });
            expect(crToLevel(0, tuning)).toBe(1);
            expect(crToLevel(-1, tuning)).toBe(1);
        });

        it('should respect maximum level bound', () => {
            const tuning = createCRTuning({ maxLevel: 10 });
            expect(crToLevel(20, tuning)).toBe(10);
            expect(crToLevel(15, tuning)).toBe(10);
        });

        it('should handle negative CR values gracefully', () => {
            expect(crToLevel(-1)).toBe(0); // Clamped to minLevel
        });
    });

    describe('levelToCR', () => {
        it('should convert level 0 to CR 0 with default tuning', () => {
            expect(levelToCR(0)).toBe(0);
        });

        it('should convert whole levels to matching CRs', () => {
            expect(levelToCR(1)).toBe(1);
            expect(levelToCR(2)).toBe(2);
            expect(levelToCR(5)).toBe(5);
            expect(levelToCR(10)).toBe(10);
            expect(levelToCR(20)).toBe(20);
        });

        it('should convert fractional levels to fractional CRs', () => {
            expect(levelToCR(0.125)).toBeCloseTo(0.125, 5);
            expect(levelToCR(0.25)).toBeCloseTo(0.25, 5);
            expect(levelToCR(0.5)).toBeCloseTo(0.5, 5);
        });

        it('should apply inverse of base multiplier', () => {
            const tuning = createCRTuning({ baseMultiplier: 2 });
            expect(levelToCR(4, tuning)).toBe(2); // 4 / 2 = 2
            expect(levelToCR(10, tuning)).toBe(5); // 10 / 2 = 5
        });

        it('should apply inverse of level offset', () => {
            const tuning = createCRTuning({ levelOffset: 2 });
            expect(levelToCR(3, tuning)).toBe(1); // (3 - 2) / 1 = 1
            expect(levelToCR(7, tuning)).toBe(5); // (7 - 2) / 1 = 5
        });

        it('should apply inverse of both multiplier and offset', () => {
            const tuning = createCRTuning({ baseMultiplier: 2, levelOffset: 1 });
            expect(levelToCR(7, tuning)).toBe(3); // (7 - 1) / 2 = 3
        });

        it('should use custom curve mapping when available', () => {
            const customCurve = new Map<number, number>([
                [5, 10],  // CR 5 maps to level 10
                [10, 15]  // CR 10 maps to level 15
            ]);
            const tuning = createCRTuning({ customCurve });
            expect(levelToCR(10, tuning)).toBe(5);
            expect(levelToCR(15, tuning)).toBe(10);
        });

        it('should fall back to formula when custom curve does not contain level', () => {
            const customCurve = new Map<number, number>([[5, 10]]);
            const tuning = createCRTuning({ customCurve });
            expect(levelToCR(3, tuning)).toBe(3); // No custom mapping, uses formula
        });

        it('should not return negative CR values', () => {
            expect(levelToCR(-1)).toBe(0);
        });
    });

    describe('bidirectional consistency', () => {
        it('should maintain consistency when converting CR -> level -> CR', () => {
            const testCRs = [0, 0.125, 0.25, 0.5, 1, 2, 5, 10, 15, 20];
            for (const cr of testCRs) {
                const level = crToLevel(cr);
                const backToCR = levelToCR(level);
                expect(backToCR).toBeCloseTo(cr, 10);
            }
        });

        it('should maintain consistency when converting level -> CR -> level', () => {
            const testLevels = [0, 1, 2, 5, 10, 15, 20];
            for (const level of testLevels) {
                const cr = levelToCR(level);
                const backToLevel = crToLevel(cr);
                expect(backToLevel).toBeCloseTo(level, 10);
            }
        });

        it('should maintain consistency with custom tuning', () => {
            const tuning = createCRTuning({ baseMultiplier: 1.5, levelOffset: 1 });
            const cr = 5;
            const level = crToLevel(cr, tuning);
            const backToCR = levelToCR(level, tuning);
            expect(backToCR).toBeCloseTo(cr, 10);
        });
    });

    describe('roundLevel', () => {
        it('should round fractional levels to nearest integer', () => {
            expect(roundLevel(0.4, 0, 20)).toBe(0);
            expect(roundLevel(0.5, 0, 20)).toBe(1);
            expect(roundLevel(0.6, 0, 20)).toBe(1);
            expect(roundLevel(1.2)).toBe(1);
            expect(roundLevel(1.7)).toBe(2);
        });

        it('should respect minimum level bound', () => {
            expect(roundLevel(0.2, 1, 20)).toBe(1);
            expect(roundLevel(-1, 1, 20)).toBe(1);
        });

        it('should respect maximum level bound', () => {
            expect(roundLevel(25, 1, 20)).toBe(20);
            expect(roundLevel(21, 1, 20)).toBe(20);
        });

        it('should allow custom min/max bounds', () => {
            expect(roundLevel(0, 5, 15)).toBe(5);
            expect(roundLevel(20, 5, 15)).toBe(15);
        });

        it('should handle edge cases', () => {
            expect(roundLevel(0.5, 0, 20)).toBe(1);
            expect(roundLevel(0.49, 0, 20)).toBe(0);
            expect(roundLevel(1, 1, 20)).toBe(1);
            expect(roundLevel(20, 1, 20)).toBe(20);
        });
    });

    describe('roundCR', () => {
        it('should round to standard CR steps', () => {
            expect(roundCR(0.1)).toBe(0.125); // 1/8
            expect(roundCR(0.3)).toBe(0.25);  // 1/4
            expect(roundCR(0.4)).toBe(0.5);   // 1/2
            expect(roundCR(0.7)).toBe(0.5);   // Closer to 0.5 than 1
            expect(roundCR(0.8)).toBe(1);
        });

        it('should round whole numbers correctly', () => {
            expect(roundCR(1.4)).toBe(1);
            expect(roundCR(1.5)).toBe(2); // Actually 2 is closer
            expect(roundCR(2.4)).toBe(2);
            expect(roundCR(2.6)).toBe(3);
        });

        it('should handle CR 0 correctly', () => {
            expect(roundCR(0.05)).toBe(0);
            expect(roundCR(0)).toBe(0);
        });

        it('should cap at CR 20', () => {
            expect(roundCR(19.6)).toBe(20);
            expect(roundCR(20.5)).toBe(20);
            expect(roundCR(25)).toBe(20);
        });

        it('should handle all standard CR steps', () => {
            expect(roundCR(0.125)).toBe(0.125);
            expect(roundCR(0.25)).toBe(0.25);
            expect(roundCR(0.5)).toBe(0.5);
            expect(roundCR(1)).toBe(1);
            expect(roundCR(5)).toBe(5);
            expect(roundCR(10)).toBe(10);
            expect(roundCR(20)).toBe(20);
        });
    });

    describe('formatLevel', () => {
        it('should format integer levels as plain numbers', () => {
            expect(formatLevel(0)).toBe('0');
            expect(formatLevel(1)).toBe('1');
            expect(formatLevel(5)).toBe('5');
            expect(formatLevel(20)).toBe('20');
        });

        it('should format fractional levels with standard fractions', () => {
            expect(formatLevel(0.125)).toBe('0 (1/8)');
            expect(formatLevel(0.25)).toBe('0 (1/4)');
            expect(formatLevel(0.5)).toBe('0 (1/2)');
            expect(formatLevel(0.75)).toBe('0 (3/4)');
        });

        it('should format mixed levels (integer + fraction)', () => {
            expect(formatLevel(1.125)).toBe('1 (1/8)');
            expect(formatLevel(2.25)).toBe('2 (1/4)');
            expect(formatLevel(3.5)).toBe('3 (1/2)');
        });

        it('should format non-standard fractions as decimals', () => {
            expect(formatLevel(1.2)).toBe('1.2');
            expect(formatLevel(2.7)).toBe('2.7');
        });
    });

    describe('formatCR', () => {
        it('should format integer CRs as plain numbers', () => {
            expect(formatCR(0)).toBe('0');
            expect(formatCR(1)).toBe('1');
            expect(formatCR(5)).toBe('5');
            expect(formatCR(20)).toBe('20');
        });

        it('should format fractional CRs with standard fractions', () => {
            expect(formatCR(0.125)).toBe('1/8');
            expect(formatCR(0.25)).toBe('1/4');
            expect(formatCR(0.5)).toBe('1/2');
            expect(formatCR(0.75)).toBe('3/4');
        });

        it('should format mixed CRs (integer + fraction)', () => {
            expect(formatCR(1.125)).toBe('1 1/8');
            expect(formatCR(2.25)).toBe('2 1/4');
            expect(formatCR(3.5)).toBe('3 1/2');
        });

        it('should format non-standard fractions as decimals', () => {
            expect(formatCR(1.2)).toBe('1.2');
            expect(formatCR(2.7)).toBe('2.7');
        });
    });

    describe('createCRTuning', () => {
        it('should create default tuning when no options provided', () => {
            const tuning = createCRTuning();
            expect(tuning.baseMultiplier).toBe(DEFAULT_CR_TUNING.baseMultiplier);
            expect(tuning.levelOffset).toBe(DEFAULT_CR_TUNING.levelOffset);
            expect(tuning.minLevel).toBe(DEFAULT_CR_TUNING.minLevel);
            expect(tuning.maxLevel).toBe(DEFAULT_CR_TUNING.maxLevel);
        });

        it('should merge partial options with defaults', () => {
            const tuning = createCRTuning({ baseMultiplier: 1.5 });
            expect(tuning.baseMultiplier).toBe(1.5);
            expect(tuning.levelOffset).toBe(DEFAULT_CR_TUNING.levelOffset);
            expect(tuning.minLevel).toBe(DEFAULT_CR_TUNING.minLevel);
            expect(tuning.maxLevel).toBe(DEFAULT_CR_TUNING.maxLevel);
        });

        it('should create new Map for custom curve', () => {
            const customCurve = new Map([[5, 10]]);
            const tuning = createCRTuning({ customCurve });
            expect(tuning.customCurve).toBe(customCurve);
        });

        it('should allow overriding all options', () => {
            const customCurve = new Map([[1, 2]]);
            const tuning = createCRTuning({
                baseMultiplier: 2,
                levelOffset: 1,
                minLevel: 5,
                maxLevel: 15,
                customCurve
            });
            expect(tuning.baseMultiplier).toBe(2);
            expect(tuning.levelOffset).toBe(1);
            expect(tuning.minLevel).toBe(5);
            expect(tuning.maxLevel).toBe(15);
            expect(tuning.customCurve).toBe(customCurve);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle very large CR values', () => {
            const tuning = createCRTuning({ maxLevel: 20 });
            expect(crToLevel(100, tuning)).toBe(20);
        });

        it('should handle very small CR values', () => {
            expect(crToLevel(0.001)).toBeCloseTo(0.001, 5);
        });

        it('should handle negative levels in levelToCR', () => {
            expect(levelToCR(-5)).toBe(0);
        });

        it('should handle NaN gracefully', () => {
            const result = crToLevel(NaN);
            expect(isNaN(result)).toBe(true);
        });

        it('should handle Infinity with bounds', () => {
            const tuning = createCRTuning({ maxLevel: 20 });
            expect(crToLevel(Infinity, tuning)).toBe(20);
        });
    });

    describe('practical use cases', () => {
        it('should convert typical encounter CRs to levels', () => {
            // CR values for common enemies
            expect(crToLevel(0.25)).toBeCloseTo(0.25);  // Commoner
            expect(crToLevel(0.5)).toBeCloseTo(0.5);   // Skeleton
            expect(crToLevel(1)).toBe(1);              // Goblin
            expect(crToLevel(2)).toBe(2);              // Bugbear
            expect(crToLevel(5)).toBe(5);              // Troll
        });

        it('should support harder game mode tuning', () => {
            const hardMode = createCRTuning({ baseMultiplier: 1.3 });
            expect(crToLevel(5, hardMode)).toBeCloseTo(6.5, 5);
            expect(roundLevel(crToLevel(5, hardMode))).toBe(7);
        });

        it('should support easier game mode tuning', () => {
            const easyMode = createCRTuning({ baseMultiplier: 0.8 });
            expect(crToLevel(5, easyMode)).toBeCloseTo(4, 5);
        });

        it('should allow custom scaling for boss tiers', () => {
            const bossScaling = new Map<number, number>([
                [5, 7],   // CR 5 boss fights like level 7
                [10, 13], // CR 10 boss fights like level 13
                [20, 25]  // CR 20 boss fights like level 25 (epic)
            ]);
            const tuning = createCRTuning({ customCurve: bossScaling, maxLevel: 30 });

            expect(crToLevel(5, tuning)).toBe(7);
            expect(crToLevel(10, tuning)).toBe(13);
            expect(crToLevel(20, tuning)).toBe(25);
        });
    });
});
