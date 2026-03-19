import { describe, it, expect } from 'vitest';
import { PrestigeSystem } from '../../src/core/progression/PrestigeSystem';
import { MASTERY_BONUS_XP } from '../../src/utils/constants';
import type { PrestigeLevel } from '../../src/core/types/Prestige';

describe('PrestigeSystem - Mastery Methods', () => {
    describe('isMastered', () => {
        it('should return false if plays threshold not met', () => {
            const xp = 10000; // Way more than enough XP
            expect(PrestigeSystem.isMastered(0, xp, 0)).toBe(false);
            expect(PrestigeSystem.isMastered(9, xp, 0)).toBe(false);
        });

        it('should return false if XP threshold not met', () => {
            const plays = 100; // Way more than enough plays
            expect(PrestigeSystem.isMastered(plays, 0, 0)).toBe(false);
            expect(PrestigeSystem.isMastered(plays, 999, 0)).toBe(false);
        });

        it('should return true only if BOTH thresholds are met', () => {
            // For prestige level 0: 10 plays + 1000 XP
            expect(PrestigeSystem.isMastered(10, 1000, 0)).toBe(true);
            expect(PrestigeSystem.isMastered(15, 1500, 0)).toBe(true);
        });

        it('should return false if only one threshold is met', () => {
            // Enough plays, not enough XP
            expect(PrestigeSystem.isMastered(20, 500, 0)).toBe(false);
            // Enough XP, not enough plays
            expect(PrestigeSystem.isMastered(5, 2000, 0)).toBe(false);
        });

        it('should use prestige level for thresholds', () => {
            // Prestige level 1: 15 plays + 1500 XP
            expect(PrestigeSystem.isMastered(15, 1500, 1)).toBe(true);
            expect(PrestigeSystem.isMastered(14, 1500, 1)).toBe(false);
            expect(PrestigeSystem.isMastered(15, 1499, 1)).toBe(false);
        });
    });

    describe('calculateMasteryBonus', () => {
        it('should return 0 if not mastered', () => {
            expect(PrestigeSystem.calculateMasteryBonus(false)).toBe(0);
        });

        it('should return bonus XP if mastered', () => {
            expect(PrestigeSystem.calculateMasteryBonus(true)).toBe(MASTERY_BONUS_XP);
        });
    });

    describe('isJustMastered', () => {
        it('should return true if mastery threshold crossed in this session', () => {
            // Previous: 9 plays, 900 XP (not mastered)
            // Current: 10 plays, 1000 XP (mastered)
            expect(PrestigeSystem.isJustMastered(9, 10, 900, 1000, 0)).toBe(true);
        });

        it('should return false if already mastered previously', () => {
            // Previous: 10 plays, 1000 XP (mastered)
            // Current: 11 plays, 1100 XP (still mastered)
            expect(PrestigeSystem.isJustMastered(10, 11, 1000, 1100, 0)).toBe(false);
        });

        it('should return false if not yet mastered', () => {
            // Previous: 8 plays, 800 XP
            // Current: 9 plays, 900 XP (still not mastered)
            expect(PrestigeSystem.isJustMastered(8, 9, 800, 900, 0)).toBe(false);
        });

        it('should return true only when both thresholds are crossed', () => {
            // Cross plays threshold but not XP threshold - NOT mastered
            expect(PrestigeSystem.isJustMastered(9, 10, 800, 900, 0)).toBe(false);
            // Cross XP threshold but not plays threshold - NOT mastered
            expect(PrestigeSystem.isJustMastered(8, 9, 900, 1100, 0)).toBe(false);
            // Cross both thresholds - mastered
            expect(PrestigeSystem.isJustMastered(9, 10, 900, 1100, 0)).toBe(true);
        });

        it('should respect prestige level thresholds', () => {
            // Prestige level 1 requires 15 plays + 1500 XP
            // Crossing from 14 plays/1400 XP to 15/1500
            expect(PrestigeSystem.isJustMastered(14, 15, 1400, 1500, 1)).toBe(true);
            // But if we were already at 15/1500
            expect(PrestigeSystem.isJustMastered(15, 16, 1500, 1600, 1)).toBe(false);
        });
    });
});
