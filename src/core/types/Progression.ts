/**
 * Progression and Environmental System Types
 * Based on specs/001-core-engine/SPEC.md
 */

import type { CharacterSheet, Ability } from './Character.js';

// Import environmental types from Environmental.ts to avoid duplication
import type {
    GeolocationData,
    MotionData,
    WeatherData,
    LightData,
    EnvironmentalContext
} from './Environmental.js';

// Import rhythm game context for listening session XP boost
import type { RhythmGameContext } from './RhythmXP.js';

// Re-export them for consumers
export type {
    GeolocationData,
    MotionData,
    WeatherData,
    LightData,
    EnvironmentalContext
} from './Environmental.js';

// ============================================================================
// Gaming Platform Types
// ============================================================================

/**
 * GamingContext - Steam gaming activity data
 * Game detection uses Steam API only.
 */
export interface GamingContext {
    isActivelyGaming: boolean;
    platformSource: 'steam' | 'none';

    currentGame?: {
        name: string;
        source: 'steam';
        genre?: string[];
        sessionDuration?: number;  // Minutes in current session
        partySize?: number;        // Multiplayer party size
    };

    totalGamingMinutes: number;   // Lifetime gaming while listening
    gamesPlayedWhileListening: string[];
    lastUpdated: number;          // Timestamp of last check
}

// ============================================================================
// Progression System Types
// ============================================================================

/**
 * ListeningSession - Record of a single listening session
 */
export interface ListeningSession {
    track_uuid: string;
    start_time: number;           // Unix timestamp
    end_time: number;             // Unix timestamp
    duration_seconds: number;
    base_xp_earned: number;
    bonus_xp: number;
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
    /** Rhythm game context for XP boost (System B) */
    rhythm_game_context?: RhythmGameContext;
    activity_type?: string;
    total_xp_earned: number;
}

/**
 * ExperienceSystem - Configuration for XP calculation
 */
export interface ExperienceSystem {
    // XP thresholds for each level (D&D 5e standard)
    level_thresholds: number[];

    // Base XP rates
    xp_per_second: number;        // Base rate (e.g., 1 XP per second of listening)
    xp_per_track_completion: number;  // Bonus for finishing a song

    // Activity multipliers
    activity_bonuses: {
        stationary: number;
        walking: number;
        running: number;
        driving: number;
        night_time: number;
        extreme_weather: number;
        high_altitude: number;
        // Rhythm game listening bonuses (System B from RHYTHM_XP_PLAN)
        rhythm_game_base: number;      // Base multiplier when rhythm game active (default: 1.25)
        rhythm_game_combo: number;     // Max additional from combo (default: 0.5)
        rhythm_game_groove: number;    // Max additional from groove hotness (default: 0.5)
    };

    // Mastery system
    track_mastery_threshold: number;  // Listens required to master a track
    mastery_bonus_xp: number;         // Bonus for mastering
}

// ============================================================================
// Stat Increase System Types
// ============================================================================

/**
 * Strategy selection - either a predefined type or custom implementation
 */
export type StatIncreaseStrategyType =
    | 'dnD5e'          // Standard D&D 5e: +2 to one or +1 to two (manual selection)
    | 'dnD5e_smart'    // Intelligent: boosts class primary or lowest stats
    | 'balanced'       // +1 to two lowest stats
    | 'primary_only'   // Always boosts class primary ability
    | 'random'         // Random selection
    | 'manual';        // Requires manual selection

/**
 * Simple function type for custom stat increase formulas
 * Game developers can provide a function instead of implementing the full interface
 */
export type StatIncreaseFunction = (
    character: CharacterSheet,
    increaseAmount: number,
    options?: StatIncreaseOptions
) => Array<{ ability: Ability; amount: number }>;

/**
 * Options passed to strategy selection
 */
export interface StatIncreaseOptions {
    /** Force specific abilities (overrides strategy logic) */
    forcedAbilities?: Ability[];

    /** Exclude certain abilities from selection */
    excludedAbilities?: Ability[];

    /** Require increasing multiple abilities (for +2, can be 2x+1 or 1x+2) */
    requireMultiple?: boolean;

    /** Prioritize these abilities (tiebreaker) */
    priorityAbilities?: Ability[];
}

/**
 * Base interface for stat increase strategies
 */
export interface StatIncreaseStrategy {
    /** Strategy name for debugging/logging */
    readonly name: string;

    /**
     * Determine which stats to increase
     * @param character - Current character state
     * @param increaseAmount - Total points to distribute (e.g., 2)
     * @param options - Optional constraints
     * @returns Array of {ability, amount} to increase
     */
    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }>;

    /**
     * Check if this strategy requires manual user input
     * @param options - Optional constraints
     * @returns true if strategy requires manual selection
     */
    requiresManualInput(options?: StatIncreaseOptions): boolean;
}

/**
 * Stat increase configuration options
 */
export interface StatIncreaseConfig {
    /** Maximum stat cap (default: 20 per D&D 5e, hard limit) */
    maxStatCap: number;

    /** Strategy to use for automatic stat increases on level up */
    strategy: StatIncreaseStrategyType | StatIncreaseStrategy | StatIncreaseFunction;

    /** When true, automatically apply stat increases during level up */
    autoApply: boolean;

    /** Custom stat increase levels (default: [4, 8, 12, 16, 19]) */
    statIncreaseLevels: number[];
}

/**
 * Stat increase result from any operation
 */
export interface StatIncreaseResult {
    /** The character after modification */
    character: CharacterSheet;

    /** Stats that were increased */
    increases: Array<{
        ability: Ability;
        oldValue: number;
        newValue: number;
        delta: number;
    }>;

    /** Stats that were NOT increased due to cap */
    capped: Array<{
        ability: Ability;
        attemptedValue: number;
        cappedAt: number;
    }>;

    /** Source of the increase */
    source: 'level_up' | 'manual' | 'item' | 'event';

    /** Timestamp of modification */
    timestamp: number;
}

/**
 * LevelUpDetail - Complete breakdown of what happened during a single level-up
 */
export interface LevelUpDetail {
    /** Level before this level-up */
    fromLevel: number;

    /** Level after this level-up */
    toLevel: number;

    /** Hit points gained */
    hpIncrease: number;

    /** New max HP after level-up */
    newMaxHP: number;

    /** Proficiency bonus gained (0 if no increase) */
    proficiencyIncrease: number;

    /** New proficiency bonus after level-up */
    newProficiency: number;

    /** Stats that increased (if applicable) */
    statIncreases?: Array<{
        ability: Ability;
        oldValue: number;
        newValue: number;
        delta: number;
    }>;

    /** Class features gained at this level */
    featuresGained?: string[];

    /**
     * New spell slots after level-up (if spellcaster)
     */
    newSpellSlots?: Record<number, { total: number; used: number }>;
}

/**
 * Result from applying a pending stat increase
 */
export interface ApplyPendingStatIncreaseResult {
    /** Updated character with stats applied */
    character: CharacterSheet;

    /** Stats that were increased */
    statIncreases: Array<{
        ability: Ability;
        oldValue: number;
        newValue: number;
        delta: number;
    }>;

    /** Remaining pending stat increases (counter) */
    remainingPending: number;

    /** Timestamp of completion */
    timestamp: number;
}

/**
 * Validation error for stat selection
 */
export interface StatSelectionValidationError {
    /** Error message */
    error: string;

    /** What was wrong */
    reason: 'invalid_ability' | 'invalid_amount' | 'exceeds_cap' | 'wrong_pattern' | 'duplicate_ability';

    /** Valid patterns allowed */
    allowedPatterns: string[];
}
