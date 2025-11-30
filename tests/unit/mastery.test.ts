import { describe, it, expect } from 'vitest';
import { MasterySystem } from '../../src/core/progression/MasterySystem';
import { MASTERY_THRESHOLD, MASTERY_BONUS_XP } from '../../src/utils/constants';

describe('MasterySystem', () => {
    const masterySystem = new MasterySystem();

    describe('checkMastery', () => {
        it('should return false if listen count is below threshold', () => {
            expect(masterySystem.checkMastery(0)).toBe(false);
            expect(masterySystem.checkMastery(MASTERY_THRESHOLD - 1)).toBe(false);
        });

        it('should return true if listen count is at threshold', () => {
            expect(masterySystem.checkMastery(MASTERY_THRESHOLD)).toBe(true);
        });

        it('should return true if listen count is above threshold', () => {
            expect(masterySystem.checkMastery(MASTERY_THRESHOLD + 1)).toBe(true);
        });
    });

    describe('calculateMasteryBonus', () => {
        it('should return 0 if not mastered', () => {
            expect(masterySystem.calculateMasteryBonus(false)).toBe(0);
        });

        it('should return bonus XP if mastered', () => {
            expect(masterySystem.calculateMasteryBonus(true)).toBe(MASTERY_BONUS_XP);
        });
    });

    describe('isJustMastered', () => {
        it('should return true if mastery threshold crossed in this session', () => {
            expect(masterySystem.isJustMastered(MASTERY_THRESHOLD - 1, MASTERY_THRESHOLD)).toBe(true);
        });

        it('should return false if already mastered previously', () => {
            expect(masterySystem.isJustMastered(MASTERY_THRESHOLD, MASTERY_THRESHOLD + 1)).toBe(false);
        });

        it('should return false if not yet mastered', () => {
            expect(masterySystem.isJustMastered(MASTERY_THRESHOLD - 2, MASTERY_THRESHOLD - 1)).toBe(false);
        });
    });
});
