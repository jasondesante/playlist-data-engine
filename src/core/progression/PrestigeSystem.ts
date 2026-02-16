/**
 * Prestige System - Core prestige logic for track mastery
 *
 * Handles the prestige mechanic where players reset their character after mastering
 * a track in exchange for visual badge upgrades.
 *
 * Features:
 * - 10 prestige levels (Roman numerals I-X)
 * - 1.5x scaling for plays: Prestige 0=10, I=15, II=23, III=34, IV=51, V=77, VI=115, VII=173, VIII=259, IX=389, X=584
 * - 1.5x scaling for XP: Prestige 0=1,000, I=1,500, II=2,250, III=3,375, IV=5,063, V=7,594, VI=11,391, VII=17,086, VIII=25,629, IX=38,444, X=57,666
 * - Dual requirement (plays AND XP) prevents "cheesing" the system
 * - Custom threshold override support for manual control
 */

import {
    type PrestigeLevel,
    type PrestigeInfo,
    type PrestigeResult,
    type CustomThresholds,
    PRESTIGE_ROMAN_NUMERALS,
    MAX_PRESTIGE_LEVEL,
    BASE_PLAYS_THRESHOLD,
    BASE_XP_THRESHOLD,
    PRESTIGE_SCALING_FACTOR,
    toPrestigeLevel
} from '../types/Prestige.js';
import { MASTERY_BONUS_XP } from '../../utils/constants.js';

/**
 * PrestigeSystem handles all prestige-related calculations and logic.
 *
 * @example
 * ```typescript
 * // Check if a track is mastered
 * const isMastered = PrestigeSystem.isMastered(15, 2000, 1);
 *
 * // Get full prestige info for UI
 * const info = PrestigeSystem.getPrestigeInfo(1, 15, 2000);
 *
 * // Set custom thresholds
 * PrestigeSystem.setCustomThresholds(5, { playsThreshold: 100, xpThreshold: 10000 });
 * ```
 */
export class PrestigeSystem {
    /**
     * Custom thresholds that override calculated defaults
     * Map<prestigeLevel, CustomThresholds>
     */
    private static customThresholds: Map<PrestigeLevel, CustomThresholds> = new Map();

    // =========================================================================
    // THRESHOLD CALCULATIONS
    // =========================================================================

    /**
     * Get the plays threshold for a given prestige level.
     * Returns custom threshold if set, otherwise calculates using 1.5x scaling.
     *
     * Calculated values:
     * - Prestige 0: 10 plays
     * - Prestige I: 15 plays
     * - Prestige II: 23 plays
     * - Prestige III: 34 plays
     * - Prestige IV: 51 plays
     * - Prestige V: 77 plays
     * - Prestige VI: 115 plays
     * - Prestige VII: 173 plays
     * - Prestige VIII: 259 plays
     * - Prestige IX: 389 plays
     * - Prestige X: 584 plays
     *
     * @param prestigeLevel - The prestige level to get threshold for
     * @returns Number of plays required to master
     */
    public static getPlaysThreshold(prestigeLevel: PrestigeLevel): number {
        const custom = this.customThresholds.get(prestigeLevel);
        if (custom?.playsThreshold !== undefined && custom.playsThreshold !== null) {
            return custom.playsThreshold;
        }
        return Math.floor(BASE_PLAYS_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, prestigeLevel));
    }

    /**
     * Get the XP threshold for a given prestige level.
     * Returns custom threshold if set, otherwise calculates using 1.5x scaling.
     *
     * Calculated values:
     * - Prestige 0: 1,000 XP
     * - Prestige I: 1,500 XP
     * - Prestige II: 2,250 XP
     * - Prestige III: 3,375 XP
     * - Prestige IV: 5,063 XP
     * - Prestige V: 7,594 XP
     * - Prestige VI: 11,391 XP
     * - Prestige VII: 17,086 XP
     * - Prestige VIII: 25,629 XP
     * - Prestige IX: 38,444 XP
     * - Prestige X: 57,666 XP
     *
     * @param prestigeLevel - The prestige level to get threshold for
     * @returns XP required to master
     */
    public static getXPThreshold(prestigeLevel: PrestigeLevel): number {
        const custom = this.customThresholds.get(prestigeLevel);
        if (custom?.xpThreshold !== undefined && custom.xpThreshold !== null) {
            return custom.xpThreshold;
        }
        return Math.floor(BASE_XP_THRESHOLD * Math.pow(PRESTIGE_SCALING_FACTOR, prestigeLevel));
    }

    // =========================================================================
    // CUSTOM THRESHOLD MANAGEMENT
    // =========================================================================

    /**
     * Set custom thresholds for a specific prestige level.
     * Pass null to use calculated value, omit to keep existing setting.
     *
     * @param prestigeLevel - The prestige level to customize
     * @param thresholds - Custom threshold values (null = use calculated, omit = keep existing)
     *
     * @example
     * ```typescript
     * // Set both custom thresholds
     * PrestigeSystem.setCustomThresholds(5, { playsThreshold: 100, xpThreshold: 10000 });
     *
     * // Set only plays threshold, keep XP calculated
     * PrestigeSystem.setCustomThresholds(3, { playsThreshold: 50 });
     *
     * // Reset plays to calculated value
     * PrestigeSystem.setCustomThresholds(3, { playsThreshold: null });
     * ```
     */
    public static setCustomThresholds(
        prestigeLevel: PrestigeLevel,
        thresholds: CustomThresholds
    ): void {
        this.customThresholds.set(prestigeLevel, { ...thresholds });
    }

    /**
     * Clear custom thresholds for a specific prestige level or all levels.
     * After clearing, calculated defaults will be used.
     *
     * @param prestigeLevel - Optional prestige level to clear. If omitted, clears all.
     *
     * @example
     * ```typescript
     * // Clear custom thresholds for prestige level 5
     * PrestigeSystem.clearCustomThresholds(5);
     *
     * // Clear all custom thresholds
     * PrestigeSystem.clearCustomThresholds();
     * ```
     */
    public static clearCustomThresholds(prestigeLevel?: PrestigeLevel): void {
        if (prestigeLevel !== undefined) {
            this.customThresholds.delete(prestigeLevel);
        } else {
            this.customThresholds.clear();
        }
    }

    /**
     * Check if custom thresholds are set for a prestige level.
     *
     * @param prestigeLevel - The prestige level to check
     * @returns Whether custom thresholds exist for this level
     */
    public static hasCustomThresholds(prestigeLevel: PrestigeLevel): boolean {
        return this.customThresholds.has(prestigeLevel);
    }

    /**
     * Get the current custom thresholds for a prestige level.
     *
     * @param prestigeLevel - The prestige level to get thresholds for
     * @returns Custom thresholds or undefined if none set
     */
    public static getCustomThresholds(prestigeLevel: PrestigeLevel): CustomThresholds | undefined {
        return this.customThresholds.get(prestigeLevel);
    }

    // =========================================================================
    // MASTERY CHECKING
    // =========================================================================

    /**
     * Check if a track is mastered based on plays AND XP.
     * Both thresholds must be met to be considered mastered.
     *
     * @param listenCount - Number of times the track has been listened to
     * @param totalXP - Total XP earned from this track
     * @param prestigeLevel - Current prestige level
     * @returns True if BOTH thresholds are met
     */
    public static isMastered(
        listenCount: number,
        totalXP: number,
        prestigeLevel: PrestigeLevel
    ): boolean {
        const playsThreshold = this.getPlaysThreshold(prestigeLevel);
        const xpThreshold = this.getXPThreshold(prestigeLevel);
        return listenCount >= playsThreshold && totalXP >= xpThreshold;
    }

    /**
     * Check if a character can prestige (mastered AND not at max level).
     *
     * @param prestigeLevel - Current prestige level
     * @param listenCount - Number of times the track has been listened to
     * @param totalXP - Total XP earned from this track
     * @returns True if character can prestige
     */
    public static canPrestige(
        prestigeLevel: PrestigeLevel,
        listenCount: number,
        totalXP: number
    ): boolean {
        // Can't prestige if at max level
        if (prestigeLevel >= MAX_PRESTIGE_LEVEL) {
            return false;
        }
        // Must be mastered
        return this.isMastered(listenCount, totalXP, prestigeLevel);
    }

    /**
     * Determine if a track just reached mastery status in this session.
     * Checks if the track went from not mastered to mastered between the two states.
     *
     * @param previousListenCount - Listen count before the current session
     * @param currentListenCount - Listen count including the current session
     * @param previousXP - Total XP before the current session
     * @param currentXP - Total XP including the current session
     * @param prestigeLevel - Current prestige level
     * @returns True if mastery was achieved exactly in this session
     */
    public static isJustMastered(
        previousListenCount: number,
        currentListenCount: number,
        previousXP: number,
        currentXP: number,
        prestigeLevel: PrestigeLevel
    ): boolean {
        const wasMastered = this.isMastered(previousListenCount, previousXP, prestigeLevel);
        const isNowMastered = this.isMastered(currentListenCount, currentXP, prestigeLevel);
        return !wasMastered && isNowMastered;
    }

    /**
     * Calculate the bonus XP awarded for achieving mastery.
     *
     * @param isMastered - Whether the track is mastered
     * @returns Bonus XP amount if mastered, 0 otherwise
     */
    public static calculateMasteryBonus(isMastered: boolean): number {
        return isMastered ? MASTERY_BONUS_XP : 0;
    }

    // =========================================================================
    // PRESTIGE INFO
    // =========================================================================

    /**
     * Get complete prestige information for UI display.
     *
     * @param prestigeLevel - Current prestige level
     * @param listenCount - Number of times the track has been listened to
     * @param totalXP - Total XP earned from this track
     * @returns Complete PrestigeInfo object
     */
    public static getPrestigeInfo(
        prestigeLevel: PrestigeLevel,
        listenCount: number,
        totalXP: number
    ): PrestigeInfo {
        const playsThreshold = this.getPlaysThreshold(prestigeLevel);
        const xpThreshold = this.getXPThreshold(prestigeLevel);
        const isMastered = this.isMastered(listenCount, totalXP, prestigeLevel);
        const isMaxPrestige = prestigeLevel >= MAX_PRESTIGE_LEVEL;

        return {
            prestigeLevel,
            currentPlays: listenCount,
            currentXP: totalXP,
            playsThreshold,
            xpThreshold,
            playsProgress: Math.min(1, listenCount / playsThreshold),
            xpProgress: Math.min(1, totalXP / xpThreshold),
            isMastered,
            canPrestige: isMastered && !isMaxPrestige,
            isMaxPrestige
        };
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Convert a prestige level to its Roman numeral representation.
     *
     * @param level - The prestige level
     * @returns Roman numeral string (empty string for level 0)
     */
    public static toRomanNumeral(level: PrestigeLevel): string {
        return PRESTIGE_ROMAN_NUMERALS[level];
    }

    /**
     * Get the next prestige level after prestiging.
     * Returns null if already at max level.
     *
     * @param currentLevel - Current prestige level
     * @returns Next prestige level or null if at max
     */
    public static getNextPrestigeLevel(currentLevel: PrestigeLevel): PrestigeLevel | null {
        if (currentLevel >= MAX_PRESTIGE_LEVEL) {
            return null;
        }
        return toPrestigeLevel(currentLevel + 1);
    }

    /**
     * Create a PrestigeResult for a successful prestige operation.
     *
     * @param previousLevel - The prestige level before prestiging
     * @param newLevel - The prestige level after prestiging
     * @returns PrestigeResult object
     */
    public static createSuccessResult(
        previousLevel: PrestigeLevel,
        newLevel: PrestigeLevel
    ): PrestigeResult {
        const romanNumeral = this.toRomanNumeral(newLevel);
        return {
            success: true,
            newPrestigeLevel: newLevel,
            previousPrestigeLevel: previousLevel,
            message: `Successfully prestiged to level ${romanNumeral}! ` +
                     `New mastery requirements: ${this.getPlaysThreshold(newLevel)} plays, ` +
                     `${this.getXPThreshold(newLevel).toLocaleString()} XP`
        };
    }

    /**
     * Create a PrestigeResult for a failed prestige operation.
     *
     * @param reason - The reason for failure
     * @param currentLevel - The current prestige level
     * @returns PrestigeResult object
     */
    public static createFailureResult(reason: string, currentLevel: PrestigeLevel): PrestigeResult {
        return {
            success: false,
            newPrestigeLevel: currentLevel,
            previousPrestigeLevel: currentLevel,
            message: `Prestige failed: ${reason}`
        };
    }

    /**
     * Get all threshold values for display/debugging purposes.
     *
     * @returns Array of { level, plays, xp } objects
     */
    public static getAllThresholds(): Array<{ level: PrestigeLevel; plays: number; xp: number }> {
        const thresholds: Array<{ level: PrestigeLevel; plays: number; xp: number }> = [];
        for (let level = 0; level <= MAX_PRESTIGE_LEVEL; level++) {
            const prestigeLevel = level as PrestigeLevel;
            thresholds.push({
                level: prestigeLevel,
                plays: this.getPlaysThreshold(prestigeLevel),
                xp: this.getXPThreshold(prestigeLevel)
            });
        }
        return thresholds;
    }
}
