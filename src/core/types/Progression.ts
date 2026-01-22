/**
 * Progression and Environmental System Types
 * Based on specs/001-core-engine/SPEC.md
 */

// Import environmental types from Environmental.ts to avoid duplication
import type {
    GeolocationData,
    MotionData,
    WeatherData,
    LightData,
    EnvironmentalContext
} from './Environmental.js';

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
 * Note: Discord RPC CANNOT read game activity due to platform limitations.
 * Discord RPC is only used for SETTING music presence ("Listening to" status).
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
    };

    // Mastery system
    track_mastery_threshold: number;  // Listens required to master a track
    mastery_bonus_xp: number;         // Bonus for mastering
}
