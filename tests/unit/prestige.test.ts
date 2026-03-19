import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    PrestigeSystem,
    PRESTIGE_ROMAN_NUMERALS,
    MAX_PRESTIGE_LEVEL,
    BASE_PLAYS_THRESHOLD,
    BASE_XP_THRESHOLD,
    PRESTIGE_SCALING_FACTOR,
    isPrestigeLevel,
    toPrestigeLevel
} from '../../src/index';

describe('PrestigeSystem', () => {
    // Clear custom thresholds before/after each test to ensure isolation
    beforeEach(() => {
        PrestigeSystem.clearCustomThresholds();
    });

    afterEach(() => {
        PrestigeSystem.clearCustomThresholds();
    });

    // =========================================================================
    // THRESHOLD CALCULATIONS - 1.5x SCALING
    // =========================================================================

    describe('getPlaysThreshold', () => {
        it('should return base plays threshold for prestige level 0', () => {
            expect(PrestigeSystem.getPlaysThreshold(0)).toBe(BASE_PLAYS_THRESHOLD);
        });

        it('should use 1.5x scaling per prestige level', () => {
            // Values calculated: floor(10 * 1.5^n)
            // n=0: 10, n=1: 15, n=2: 22, n=3: 33, n=4: 50, n=5: 75, n=6: 113, n=7: 170, n=8: 255, n=9: 383, n=10: 574
            for (let level = 0; level <= MAX_PRESTIGE_LEVEL; level++) {
                const threshold = PrestigeSystem.getPlaysThreshold(level as 0);
                const expected = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, level));
                expect(threshold).toBe(expected);
            }
        });

        it('should calculate correctly: floor(10 * 1.5^n)', () => {
            for (let level = 0; level <= MAX_PRESTIGE_LEVEL; level++) {
                const expected = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, level));
                expect(PrestigeSystem.getPlaysThreshold(level as 0)).toBe(expected);
            }
        });
    });

    describe('getXPThreshold', () => {
        it('should return base XP threshold for prestige level 0', () => {
            expect(PrestigeSystem.getXPThreshold(0)).toBe(BASE_XP_THRESHOLD);
        });

        it('should use 1.5x scaling per prestige level', () => {
            // Values calculated: floor(1000 * 1.5^n)
            // n=0: 1000, n=1: 1500, n=2: 2250, n=3: 3375, n=4: 5062, n=5: 7593, n=6: 11390, n=7: 17085, n=8: 25628, n=9: 38442, n=10: 57664
            for (let level = 0; level <= MAX_PRESTIGE_LEVEL; level++) {
                const threshold = PrestigeSystem.getXPThreshold(level as 0);
                const expected = Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, level));
                expect(threshold).toBe(expected);
            }
        });

        it('should calculate correctly: floor(1000 * 1.5^n)', () => {
            for (let level = 0; level <= MAX_PRESTIGE_LEVEL; level++) {
                const expected = Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, level));
                expect(PrestigeSystem.getXPThreshold(level as 0)).toBe(expected);
            }
        });
    });

    // =========================================================================
    // CUSTOM THRESHOLDS
    // =========================================================================

    describe('setCustomThresholds', () => {
        it('should override calculated plays threshold', () => {
            PrestigeSystem.setCustomThresholds(5, { playsThreshold: 100 });
            expect(PrestigeSystem.getPlaysThreshold(5)).toBe(100);
            // XP should still use calculated value
            const expectedXP = Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 5));
            expect(PrestigeSystem.getXPThreshold(5)).toBe(expectedXP);
        });

        it('should override calculated XP threshold', () => {
            PrestigeSystem.setCustomThresholds(3, { xpThreshold: 5000 });
            expect(PrestigeSystem.getXPThreshold(3)).toBe(5000);
            // Plays should still use calculated value
            const expectedPlays = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 3));
            expect(PrestigeSystem.getPlaysThreshold(3)).toBe(expectedPlays);
        });

        it('should override both thresholds', () => {
            PrestigeSystem.setCustomThresholds(7, { playsThreshold: 200, xpThreshold: 20000 });
            expect(PrestigeSystem.getPlaysThreshold(7)).toBe(200);
            expect(PrestigeSystem.getXPThreshold(7)).toBe(20000);
        });

        it('should revert to calculated when set to null', () => {
            // Set custom, then revert
            PrestigeSystem.setCustomThresholds(2, { playsThreshold: 100 });
            expect(PrestigeSystem.getPlaysThreshold(2)).toBe(100);

            PrestigeSystem.setCustomThresholds(2, { playsThreshold: null });
            const expectedPlays = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 2));
            expect(PrestigeSystem.getPlaysThreshold(2)).toBe(expectedPlays); // Reverted to calculated
        });
    });

    describe('clearCustomThresholds', () => {
        it('should clear thresholds for a specific level', () => {
            PrestigeSystem.setCustomThresholds(3, { playsThreshold: 999 });
            PrestigeSystem.setCustomThresholds(5, { playsThreshold: 888 });

            PrestigeSystem.clearCustomThresholds(3);

            const expectedPlays3 = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 3));
            expect(PrestigeSystem.getPlaysThreshold(3)).toBe(expectedPlays3); // Reverted to calculated
            expect(PrestigeSystem.getPlaysThreshold(5)).toBe(888); // Still custom
        });

        it('should clear all thresholds when no level specified', () => {
            PrestigeSystem.setCustomThresholds(3, { playsThreshold: 999 });
            PrestigeSystem.setCustomThresholds(5, { xpThreshold: 9999 });

            PrestigeSystem.clearCustomThresholds();

            const expectedPlays3 = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 3));
            const expectedXP5 = Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 5));
            expect(PrestigeSystem.getPlaysThreshold(3)).toBe(expectedPlays3);
            expect(PrestigeSystem.getXPThreshold(5)).toBe(expectedXP5);
        });
    });

    describe('hasCustomThresholds', () => {
        it('should return true when custom thresholds exist', () => {
            PrestigeSystem.setCustomThresholds(3, { playsThreshold: 100 });
            expect(PrestigeSystem.hasCustomThresholds(3)).toBe(true);
        });

        it('should return false when no custom thresholds', () => {
            expect(PrestigeSystem.hasCustomThresholds(3)).toBe(false);
        });
    });

    describe('getCustomThresholds', () => {
        it('should return undefined when no custom thresholds set', () => {
            expect(PrestigeSystem.getCustomThresholds(3)).toBeUndefined();
        });

        it('should return the custom thresholds when set', () => {
            PrestigeSystem.setCustomThresholds(4, { playsThreshold: 75, xpThreshold: 7500 });
            const custom = PrestigeSystem.getCustomThresholds(4);
            expect(custom?.playsThreshold).toBe(75);
            expect(custom?.xpThreshold).toBe(7500);
        });
    });

    // =========================================================================
    // MASTERY CHECKING - DUAL REQUIREMENTS
    // =========================================================================

    describe('isMastered', () => {
        it('should return false when plays are below threshold but XP is met', () => {
            // Prestige 0: 10 plays + 1000 XP required
            expect(PrestigeSystem.isMastered(5, 2000, 0)).toBe(false); // 5 plays, 2000 XP
        });

        it('should return false when XP is below threshold but plays are met', () => {
            expect(PrestigeSystem.isMastered(15, 500, 0)).toBe(false); // 15 plays, 500 XP
        });

        it('should return true when BOTH thresholds are met', () => {
            expect(PrestigeSystem.isMastered(10, 1000, 0)).toBe(true);
            expect(PrestigeSystem.isMastered(15, 1500, 1)).toBe(true);
            expect(PrestigeSystem.isMastered(23, 2250, 2)).toBe(true);
        });

        it('should return true when both thresholds are exceeded', () => {
            expect(PrestigeSystem.isMastered(20, 2000, 0)).toBe(true);
        });

        it('should work with higher prestige levels', () => {
            // Use calculated values for prestige 5
            const playsThreshold = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 5));
            const xpThreshold = Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, 5));

            expect(PrestigeSystem.isMastered(playsThreshold, xpThreshold, 5)).toBe(true);
            expect(PrestigeSystem.isMastered(playsThreshold - 1, xpThreshold, 5)).toBe(false);
            expect(PrestigeSystem.isMastered(playsThreshold, xpThreshold - 1, 5)).toBe(false);
        });

        it('should prevent cheesing - needs both plays AND XP', () => {
            // This is the key anti-cheese test
            // Someone could spam play/pause to get plays, but XP requires actual listening
            expect(PrestigeSystem.isMastered(100, 0, 0)).toBe(false); // Lots of plays, no XP
            expect(PrestigeSystem.isMastered(0, 10000, 0)).toBe(false); // No plays, lots of XP (impossible but testing)
        });
    });

    describe('canPrestige', () => {
        it('should return true when mastered and not at max level', () => {
            expect(PrestigeSystem.canPrestige(0, 10, 1000)).toBe(true);
            expect(PrestigeSystem.canPrestige(3, 34, 3375)).toBe(true);
        });

        it('should return false when not mastered', () => {
            expect(PrestigeSystem.canPrestige(0, 5, 1000)).toBe(false);
            expect(PrestigeSystem.canPrestige(0, 10, 500)).toBe(false);
        });

        it('should return false when at max prestige level', () => {
            // Even if mastered, can't prestige at level 10
            expect(PrestigeSystem.canPrestige(10, 1000, 100000)).toBe(false);
        });

        it('should return false when at max prestige regardless of plays/XP', () => {
            expect(PrestigeSystem.canPrestige(10, 10000, 1000000)).toBe(false);
        });
    });

    // =========================================================================
    // PRESTIGE INFO
    // =========================================================================

    describe('getPrestigeInfo', () => {
        it('should return complete info object', () => {
            const info = PrestigeSystem.getPrestigeInfo(0, 5, 500);

            expect(info.prestigeLevel).toBe(0);
            expect(info.currentPlays).toBe(5);
            expect(info.currentXP).toBe(500);
            expect(info.playsThreshold).toBe(10);
            expect(info.xpThreshold).toBe(1000);
            expect(info.playsProgress).toBe(0.5);
            expect(info.xpProgress).toBe(0.5);
            expect(info.isMastered).toBe(false);
            expect(info.canPrestige).toBe(false);
            expect(info.isMaxPrestige).toBe(false);
        });

        it('should cap progress at 1.0', () => {
            const info = PrestigeSystem.getPrestigeInfo(0, 100, 5000);

            expect(info.playsProgress).toBe(1);
            expect(info.xpProgress).toBe(1);
        });

        it('should show mastered when both requirements met', () => {
            const info = PrestigeSystem.getPrestigeInfo(2, 25, 2500);

            expect(info.isMastered).toBe(true);
            expect(info.canPrestige).toBe(true);
        });

        it('should show isMaxPrestige correctly', () => {
            const info = PrestigeSystem.getPrestigeInfo(10, 1000, 100000);
            expect(info.isMaxPrestige).toBe(true);
            expect(info.canPrestige).toBe(false);
        });
    });

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    describe('toRomanNumeral', () => {
        it('should return correct Roman numerals', () => {
            expect(PrestigeSystem.toRomanNumeral(0)).toBe('');
            expect(PrestigeSystem.toRomanNumeral(1)).toBe('I');
            expect(PrestigeSystem.toRomanNumeral(2)).toBe('II');
            expect(PrestigeSystem.toRomanNumeral(3)).toBe('III');
            expect(PrestigeSystem.toRomanNumeral(4)).toBe('IV');
            expect(PrestigeSystem.toRomanNumeral(5)).toBe('V');
            expect(PrestigeSystem.toRomanNumeral(6)).toBe('VI');
            expect(PrestigeSystem.toRomanNumeral(7)).toBe('VII');
            expect(PrestigeSystem.toRomanNumeral(8)).toBe('VIII');
            expect(PrestigeSystem.toRomanNumeral(9)).toBe('IX');
            expect(PrestigeSystem.toRomanNumeral(10)).toBe('X');
        });
    });

    describe('getNextPrestigeLevel', () => {
        it('should return next level', () => {
            expect(PrestigeSystem.getNextPrestigeLevel(0)).toBe(1);
            expect(PrestigeSystem.getNextPrestigeLevel(5)).toBe(6);
        });

        it('should return null at max level', () => {
            expect(PrestigeSystem.getNextPrestigeLevel(10)).toBeNull();
        });
    });

    describe('createSuccessResult', () => {
        it('should create a success result with correct values', () => {
            const result = PrestigeSystem.createSuccessResult(0, 1);

            expect(result.success).toBe(true);
            expect(result.newPrestigeLevel).toBe(1);
            expect(result.previousPrestigeLevel).toBe(0);
            expect(result.message).toContain('I');
            expect(result.message).toContain('15'); // Next plays threshold
            expect(result.message).toContain('1,500'); // Next XP threshold
        });
    });

    describe('createFailureResult', () => {
        it('should create a failure result with reason', () => {
            const result = PrestigeSystem.createFailureResult('Not enough plays', 3);

            expect(result.success).toBe(false);
            expect(result.newPrestigeLevel).toBe(3);
            expect(result.previousPrestigeLevel).toBe(3);
            expect(result.message).toContain('Not enough plays');
        });
    });

    describe('getAllThresholds', () => {
        it('should return all 11 levels (0-10)', () => {
            const thresholds = PrestigeSystem.getAllThresholds();
            expect(thresholds).toHaveLength(11);
        });

        it('should return correct thresholds for each level', () => {
            const thresholds = PrestigeSystem.getAllThresholds();

            // Verify each level has correct calculated values
            for (let i = 0; i <= MAX_PRESTIGE_LEVEL; i++) {
                const expectedPlays = Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, i));
                const expectedXP = Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, i));
                expect(thresholds[i]).toEqual({ level: i, plays: expectedPlays, xp: expectedXP });
            }
        });
    });

    // =========================================================================
    // TYPE GUARDS AND HELPERS
    // =========================================================================

    describe('isPrestigeLevel', () => {
        it('should return true for valid prestige levels', () => {
            expect(isPrestigeLevel(0)).toBe(true);
            expect(isPrestigeLevel(5)).toBe(true);
            expect(isPrestigeLevel(10)).toBe(true);
        });

        it('should return false for invalid values', () => {
            expect(isPrestigeLevel(-1)).toBe(false);
            expect(isPrestigeLevel(11)).toBe(false);
            expect(isPrestigeLevel(3.5)).toBe(false);
            expect(isPrestigeLevel('5')).toBe(false);
            expect(isPrestigeLevel(null)).toBe(false);
            expect(isPrestigeLevel(undefined)).toBe(false);
        });
    });

    describe('toPrestigeLevel', () => {
        it('should convert valid numbers to prestige levels', () => {
            expect(toPrestigeLevel(0)).toBe(0);
            expect(toPrestigeLevel(5)).toBe(5);
            expect(toPrestigeLevel(10)).toBe(10);
        });

        it('should clamp negative numbers to 0', () => {
            expect(toPrestigeLevel(-5)).toBe(0);
        });

        it('should clamp numbers above 10 to 10', () => {
            expect(toPrestigeLevel(15)).toBe(10);
        });

        it('should floor decimal values', () => {
            expect(toPrestigeLevel(3.7)).toBe(3);
        });
    });

    // =========================================================================
    // CONSTANTS
    // =========================================================================

    describe('constants', () => {
        it('should have correct MAX_PRESTIGE_LEVEL', () => {
            expect(MAX_PRESTIGE_LEVEL).toBe(10);
        });

        it('should have correct BASE_PLAYS_THRESHOLD', () => {
            expect(BASE_PLAYS_THRESHOLD).toBe(10);
        });

        it('should have correct BASE_XP_THRESHOLD', () => {
            expect(BASE_XP_THRESHOLD).toBe(1000);
        });

        it('should have correct PRESTIGE_SCALING_FACTOR', () => {
            expect(PRESTIGE_SCALING_FACTOR).toBe(1.5);
        });

        it('should have Roman numerals for all levels', () => {
            expect(Object.keys(PRESTIGE_ROMAN_NUMERALS)).toHaveLength(11);
            expect(PRESTIGE_ROMAN_NUMERALS[0]).toBe('');
            expect(PRESTIGE_ROMAN_NUMERALS[10]).toBe('X');
        });
    });
});
