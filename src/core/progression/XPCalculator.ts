/**
 * XPCalculator - Handles all XP calculations for listening sessions
 * Based on specs/001-core-engine/SPEC.md
 */

import type { ListeningSession, EnvironmentalContext, GamingContext } from '../types/Progression.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import type { ExperienceSystem } from '../types/Progression.js';

/**
 * Default D&D 5e XP thresholds (0-20)
 * See PHB page 15 for reference
 */
const DEFAULT_XP_THRESHOLDS = [
    0,      // Level 1
    300,    // Level 2
    900,    // Level 3
    2700,   // Level 4
    6500,   // Level 5
    14000,  // Level 6
    23000,  // Level 7
    34000,  // Level 8
    48000,  // Level 9
    64000,  // Level 10
    85000,  // Level 11
    100000, // Level 12
    120000, // Level 13
    140000, // Level 14
    165000, // Level 15
    195000, // Level 16
    225000, // Level 17
    265000, // Level 18
    305000, // Level 19
    355000, // Level 20
];

/**
 * Default activity multipliers for XP calculation
 */
const DEFAULT_ACTIVITY_BONUSES = {
    stationary: 1.0,
    walking: 1.2,
    running: 1.5,
    driving: 1.3,
    night_time: 1.25,
    extreme_weather: 1.4,
    high_altitude: 1.3,
};

/**
 * XPCalculator class - Manages experience point calculations
 * with support for activity, environmental, and gaming bonuses
 */
export class XPCalculator {
    private config: ExperienceSystem;

    /**
     * Create a new XPCalculator
     * @param options - Configuration options for XP calculation
     */
    constructor(options?: Partial<ExperienceSystem>) {
        this.config = {
            level_thresholds: options?.level_thresholds || DEFAULT_XP_THRESHOLDS,
            xp_per_second: options?.xp_per_second ?? 1,
            xp_per_track_completion: options?.xp_per_track_completion ?? 50,
            activity_bonuses: {
                ...DEFAULT_ACTIVITY_BONUSES,
                ...options?.activity_bonuses,
            },
            track_mastery_threshold: options?.track_mastery_threshold ?? 10,
            mastery_bonus_xp: options?.mastery_bonus_xp ?? 100,
        };
    }

    /**
     * Calculate total XP earned for a listening session
     * Applies all multipliers: base, activity, environmental, gaming
     *
     * @param session - The listening session
     * @param track - The playlist track (for duration validation)
     * @returns Total XP earned after all bonuses
     */
    calculateSessionXP(session: ListeningSession, track?: PlaylistTrack): number {
        // Start with base XP (1 XP per second of listening)
        let xp = session.duration_seconds * this.config.xp_per_second;

        // Apply activity bonus
        if (session.activity_type && session.activity_type in this.config.activity_bonuses) {
            const activityMultiplier =
                this.config.activity_bonuses[
                    session.activity_type as keyof typeof this.config.activity_bonuses
                ];
            xp *= activityMultiplier;
        }

        // Apply environmental bonuses
        if (session.environmental_context) {
            xp = this.applyEnvironmentalBonus(xp, session.environmental_context);
        }

        // Apply gaming bonuses
        if (session.gaming_context) {
            xp = this.applyGamingBonus(xp, session.gaming_context);
        }

        // Apply track completion bonus (95%+ listened)
        if (track && session.duration_seconds >= track.duration * 0.95) {
            xp += this.config.xp_per_track_completion;
        }

        return Math.floor(xp);
    }

    /**
     * Apply environmental bonuses to XP
     * Accounts for time of day, weather, altitude, biome
     *
     * @param baseXP - Base XP value
     * @param context - Environmental context data
     * @returns XP with environmental bonuses applied
     */
    private applyEnvironmentalBonus(baseXP: number, context: EnvironmentalContext): number {
        let multiplier = 1.0;

        // Night time bonus
        if (context.weather?.isNight) {
            multiplier *= this.config.activity_bonuses.night_time;
        }

        // Weather bonuses
        if (context.weather) {
            if (context.weather.weatherType === 'Thunderstorm') {
                multiplier *= this.config.activity_bonuses.extreme_weather;
            }
            // Rain and snow also count as extreme
            if (context.weather.weatherType === 'Rain' || context.weather.weatherType === 'Snow') {
                multiplier *= this.config.activity_bonuses.extreme_weather;
            }
        }

        // Altitude bonus (high altitude = high elevation)
        if (context.geolocation?.altitude) {
            // 2000m+ altitude triggers bonus
            if (context.geolocation.altitude >= 2000) {
                multiplier *= this.config.activity_bonuses.high_altitude;
            }
        }

        return baseXP * multiplier;
    }

    /**
     * Apply gaming bonuses to XP
     * Rewards users who listen while gaming
     *
     * @param baseXP - Base XP value
     * @param context - Gaming context data
     * @returns XP with gaming bonuses applied
     */
    private applyGamingBonus(baseXP: number, context: GamingContext): number {
        if (!context.isActivelyGaming) {
            return baseXP;
        }

        let multiplier = 1.0;

        // Base bonus for any active gaming (+25%)
        multiplier += 0.25;

        if (context.currentGame) {
            // Genre-specific bonuses
            if (context.currentGame.genre) {
                const genres = context.currentGame.genre;

                if (genres.includes('Action') || genres.includes('FPS')) {
                    multiplier += 0.15;
                }
                if (genres.includes('RPG')) {
                    multiplier += 0.20;
                }
                if (genres.includes('Strategy')) {
                    multiplier += 0.10;
                }
            }

            // Multiplayer bonus
            if (context.currentGame.partySize && context.currentGame.partySize > 1) {
                multiplier += 0.15;
            }

            // Session duration bonus (up to +20% for 4+ hours)
            if (context.currentGame.sessionDuration) {
                const hours = context.currentGame.sessionDuration / 60;
                if (hours >= 1) {
                    multiplier += Math.min(0.20, hours * 0.05);
                }
            }
        }

        return baseXP * multiplier;
    }

    /**
     * Calculate total XP modifier (environmental + gaming combined)
     * Capped at 3.0x to prevent excessive stacking
     *
     * @param envContext - Environmental context (optional)
     * @param gamingContext - Gaming context (optional)
     * @returns Combined multiplier (1.0 to 3.0)
     */
    calculateTotalModifier(
        envContext?: EnvironmentalContext,
        gamingContext?: GamingContext
    ): number {
        let modifier = 1.0;

        // Environmental bonuses
        if (envContext) {
            modifier *= this.calculateEnvironmentalModifier(envContext);
        }

        // Gaming bonuses
        if (gamingContext && gamingContext.isActivelyGaming) {
            modifier *= this.calculateGamingModifier(gamingContext);
        }

        // Cap at 3.0x total
        return Math.min(modifier, 3.0);
    }

    /**
     * Calculate environmental XP modifier
     *
     * @param context - Environmental context
     * @returns Multiplier (1.0 to 3.0)
     */
    private calculateEnvironmentalModifier(context: EnvironmentalContext): number {
        let multiplier = 1.0;

        // Note: activity_type was removed from MotionData type - it's computed by MotionDetector.detectActivity()
        // If needed, derive from acceleration data or call detectActivity() separately

        if (context.weather?.weatherType === 'Thunderstorm') {
            multiplier *= this.config.activity_bonuses.extreme_weather;
        }

        if (context.weather?.isNight) {
            multiplier *= this.config.activity_bonuses.night_time;
        }

        if (context.geolocation?.altitude && context.geolocation.altitude >= 2000) {
            multiplier *= this.config.activity_bonuses.high_altitude;
        }

        return Math.min(multiplier, 3.0);
    }

    /**
     * Calculate gaming XP modifier
     *
     * @param context - Gaming context
     * @returns Multiplier (1.0 to 1.75)
     */
    private calculateGamingModifier(context: GamingContext): number {
        let multiplier = 1.0;

        multiplier += 0.25; // Base gaming bonus

        if (context.currentGame) {
            if (context.currentGame.genre) {
                const genres = context.currentGame.genre;
                if (genres.includes('Action') || genres.includes('FPS')) {
                    multiplier += 0.15;
                }
                if (genres.includes('RPG')) {
                    multiplier += 0.20;
                }
                if (genres.includes('Strategy')) {
                    multiplier += 0.10;
                }
            }

            if (context.currentGame.partySize && context.currentGame.partySize > 1) {
                multiplier += 0.15;
            }

            if (context.currentGame.sessionDuration) {
                const hours = context.currentGame.sessionDuration / 60;
                if (hours >= 1) {
                    multiplier += Math.min(0.20, hours * 0.05);
                }
            }
        }

        return Math.min(multiplier, 1.75);
    }

    /**
     * Get the XP threshold for a specific level
     *
     * @param level - The level (1-20)
     * @returns Total XP required to reach that level
     */
    getXPThresholdForLevel(level: number): number {
        if (level < 1 || level > 20) {
            throw new Error('Level must be between 1 and 20');
        }
        return this.config.level_thresholds[level - 1];
    }

    /**
     * Get the XP required to advance from current level to next
     *
     * @param currentLevel - Current level (1-19)
     * @returns XP needed to reach next level
     */
    getXPToNextLevel(currentLevel: number): number {
        if (currentLevel < 1 || currentLevel > 19) {
            throw new Error('Current level must be between 1 and 19');
        }
        const currentThreshold = this.config.level_thresholds[currentLevel - 1];
        const nextThreshold = this.config.level_thresholds[currentLevel];
        return nextThreshold - currentThreshold;
    }

    /**
     * Determine what level a character should be at with given XP total
     *
     * @param totalXP - Total experience points
     * @returns Character level (1-20)
     */
    getLevelFromXP(totalXP: number): number {
        for (let level = 20; level >= 1; level--) {
            if (totalXP >= this.config.level_thresholds[level - 1]) {
                return level;
            }
        }
        return 1;
    }

    /**
     * Check if track is mastered based on listen count
     *
     * @param listenCount - Number of times the track has been listened to
     * @returns True if listen count meets or exceeds mastery threshold
     */
    isTrackMastered(listenCount: number): boolean {
        return listenCount >= this.config.track_mastery_threshold;
    }

    /**
     * Get the mastery bonus XP
     *
     * @returns XP bonus for mastering a track
     */
    getMasteryBonusXP(): number {
        return this.config.mastery_bonus_xp;
    }

    /**
     * Get current configuration
     *
     * @returns The ExperienceSystem configuration
     */
    getConfig(): ExperienceSystem {
        return { ...this.config };
    }
}
