/**
 * Progression System Configuration
 *
 * Centralized configuration for the progression system including:
 * - XP calculation settings
 * - Stat increase settings
 * - Level up settings
 * - Rhythm game XP settings
 *
 * Follows the pattern of sensorConfig.ts for consistency
 */

import type { StatIncreaseConfig } from '../types/Progression.js';
import type { RhythmXPConfig } from '../types/RhythmXP.js';
import { DEFAULT_RHYTHM_XP_CONFIG, mergeRhythmXPConfig } from '../types/RhythmXP.js';

/**
 * Complete progression system configuration
 */
export interface ProgressionConfig {
    /** XP calculation configuration */
    xp: {
        level_thresholds: number[];
        xp_per_second: number;
        xp_per_track_completion: number;
        activity_bonuses: {
            stationary: number;
            walking: number;
            running: number;
            driving: number;
            night_time: number;
            extreme_weather: number;
            high_altitude: number;
            // Rhythm game listening bonuses (System B)
            rhythm_game_base: number;      // Base multiplier when rhythm game active
            rhythm_game_combo: number;     // Max additional from combo
            rhythm_game_groove: number;    // Max additional from groove hotness
        };
        track_mastery_threshold: number;
        mastery_bonus_xp: number;
        /** Rhythm game XP configuration (optional) */
        rhythmXP?: Partial<RhythmXPConfig>;
    };

    /** Stat increase configuration */
    statIncrease: Partial<StatIncreaseConfig>;

    /** Level up configuration */
    levelUp: {
        /** Use average HP instead of rolling (default: false) */
        useAverageHP: boolean;

        /** Allow manual selection of stats during level up (default: true) */
        allowManualStatSelection: boolean;

        /** Show level up notifications (default: true) */
        showNotifications: boolean;
    };
}

/**
 * Default XP thresholds (D&D 5e standard)
 */
const DEFAULT_XP_THRESHOLDS = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
];

/**
 * Default progression configuration
 */
export const DEFAULT_PROGRESSION_CONFIG: Required<ProgressionConfig> = {
    xp: {
        level_thresholds: DEFAULT_XP_THRESHOLDS,
        xp_per_second: 1,
        xp_per_track_completion: 50,
        activity_bonuses: {
            stationary: 1.0,
            walking: 1.2,
            running: 1.5,
            driving: 1.3,
            night_time: 1.25,
            extreme_weather: 1.4,
            high_altitude: 1.3,
            // Rhythm game listening bonuses (System B)
            rhythm_game_base: 1.25,      // +25% base when rhythm game active
            rhythm_game_combo: 0.5,      // +50% max from combo
            rhythm_game_groove: 0.5,     // +50% max from groove hotness
        },
        track_mastery_threshold: 10,
        mastery_bonus_xp: 100,
        rhythmXP: DEFAULT_RHYTHM_XP_CONFIG,
    },
    statIncrease: {
        maxStatCap: 20,
        strategy: 'dnD5e', // Default to D&D 5e standard (manual selection)
        autoApply: true,
        statIncreaseLevels: [4, 8, 12, 16, 19],
    },
    levelUp: {
        useAverageHP: false,
        allowManualStatSelection: true,
        showNotifications: true,
    }
};

/**
 * Merge user config with defaults
 *
 * @param userConfig - Partial configuration to override defaults
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const config = mergeProgressionConfig({
 *   statIncrease: {
 *     strategy: 'dnD5e_smart',
 *     autoApply: true
 *   }
 * });
 * ```
 */
export function mergeProgressionConfig(
    userConfig?: Partial<ProgressionConfig>
): Required<ProgressionConfig> {
    if (!userConfig) return DEFAULT_PROGRESSION_CONFIG;

    return {
        xp: {
            ...DEFAULT_PROGRESSION_CONFIG.xp,
            ...userConfig.xp,
            activity_bonuses: {
                ...DEFAULT_PROGRESSION_CONFIG.xp.activity_bonuses,
                ...userConfig.xp?.activity_bonuses
            },
            // Merge rhythmXP using its dedicated helper
            rhythmXP: mergeRhythmXPConfig(userConfig.xp?.rhythmXP),
        },
        statIncrease: {
            ...DEFAULT_PROGRESSION_CONFIG.statIncrease,
            ...userConfig.statIncrease
        },
        levelUp: {
            ...DEFAULT_PROGRESSION_CONFIG.levelUp,
            ...userConfig.levelUp
        },
    };
}
