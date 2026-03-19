/**
 * Prestige System Types
 *
 * The Prestige System allows players to reset their character after mastering a track
 * in exchange for a visual badge upgrade. Uses 1.5x scaling per prestige level for
 * both plays AND XP requirements.
 *
 * Mastery Requirements (Dual System):
 * - Must meet BOTH plays AND XP thresholds to unlock mastery
 * - Base: 10 plays + 1,000 XP
 * - 1.5x scaling per prestige level
 * - Dual requirement prevents "cheesing" (play/pause spam) since XP requires actual engagement
 */

/**
 * Prestige level type (0-10, where 0 = no prestige, 1-10 = Roman numerals I-X)
 */
export type PrestigeLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Roman numeral representations for prestige levels
 */
export const PRESTIGE_ROMAN_NUMERALS: Record<PrestigeLevel, string> = {
    0: '',
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X'
} as const;

/**
 * Maximum prestige level achievable
 */
export const MAX_PRESTIGE_LEVEL = 10 as const;

/**
 * Base number of plays required to master a track at prestige level 0
 */
export const BASE_PLAYS_THRESHOLD = 10 as const;

/**
 * Base XP required to master a track at prestige level 0
 */
export const BASE_XP_THRESHOLD = 1000 as const;

/**
 * Scaling factor per prestige level (1.5x)
 */
export const PRESTIGE_SCALING_FACTOR = 1.5 as const;

/**
 * Custom thresholds for a prestige level (allows overriding defaults)
 * null means use calculated value, undefined means no override set
 */
export interface CustomThresholds {
    /** Custom plays threshold, or null to use calculated value */
    playsThreshold?: number | null;
    /** Custom XP threshold, or null to use calculated value */
    xpThreshold?: number | null;
}

/**
 * Complete prestige information for a character/track combination
 */
export interface PrestigeInfo {
    /** Current prestige level (0-10) */
    prestigeLevel: PrestigeLevel;
    /** Current number of plays for this track */
    currentPlays: number;
    /** Current XP earned for this track */
    currentXP: number;
    /** Required plays to master at current prestige level */
    playsThreshold: number;
    /** Required XP to master at current prestige level */
    xpThreshold: number;
    /** Progress toward plays requirement (0-1) */
    playsProgress: number;
    /** Progress toward XP requirement (0-1) */
    xpProgress: number;
    /** Whether track is mastered (meets BOTH plays AND XP thresholds) */
    isMastered: boolean;
    /** Whether character can prestige (mastered AND not at max prestige) */
    canPrestige: boolean;
    /** Whether character is at max prestige level */
    isMaxPrestige: boolean;
}

/**
 * Result of a prestige operation
 */
export interface PrestigeResult {
    /** Whether the prestige operation succeeded */
    success: boolean;
    /** New prestige level after operation */
    newPrestigeLevel: PrestigeLevel;
    /** Previous prestige level before operation */
    previousPrestigeLevel: PrestigeLevel;
    /** Human-readable result message */
    message: string;
}

/**
 * Type guard to check if a value is a valid PrestigeLevel
 */
export function isPrestigeLevel(value: unknown): value is PrestigeLevel {
    return typeof value === 'number' &&
           Number.isInteger(value) &&
           value >= 0 &&
           value <= 10;
}

/**
 * Convert a number to a PrestigeLevel (clamped to valid range)
 */
export function toPrestigeLevel(value: number): PrestigeLevel {
    const clamped = Math.max(0, Math.min(10, Math.floor(value)));
    return clamped as PrestigeLevel;
}
