/**
 * Centralized configuration interface for all sensor modules
 *
 * This module provides type-safe configuration options for:
 * - Environmental sensors (geolocation, weather, motion, light)
 * - Gaming platform sensors (Steam)
 * - XP modifier calculation
 * - Caching and retry behavior
 *
 * Configuration can be provided via constructor parameters or loaded from environment variables.
 */

import type { SensorRetryConfig } from '../types/Environmental.js';

/**
 * Cache configuration for sensor data
 */
export interface CacheConfig {
    /** Time-to-live for cached data in milliseconds (default: varies by sensor) */
    ttlMs: number;
    /** Enable/disable localStorage persistence for browser environments (default: true) */
    useLocalStorage: boolean;
}

/**
 * Geolocation sensor configuration
 */
export interface GeolocationSensorConfig {
    /** Cache TTL in milliseconds (default: 5 minutes) */
    cacheTTL?: number;
    /** Enable localStorage persistence (default: true) */
    useLocalStorage?: boolean;
    /** High accuracy mode for GPS (default: true) */
    enableHighAccuracy?: boolean;
    /** GPS timeout in milliseconds (default: 5000) */
    timeout?: number;
}

/**
 * Weather API configuration
 */
export interface WeatherSensorConfig {
    /** OpenWeatherMap API key (can be loaded from WEATHER_API_KEY env var) */
    apiKey?: string;
    /** Current weather cache TTL in milliseconds (default: 12 minutes) */
    cacheTTL?: number;
    /** Forecast cache TTL in milliseconds (default: 60 minutes) */
    forecastCacheTTL?: number;
    /** Enable localStorage persistence (default: true) */
    useLocalStorage?: boolean;
}

/**
 * Gaming platform sensor configuration
 */
export interface GamingSensorConfig {
    /** Steam configuration */
    steam?: {
        /** Steam API key (can be loaded from STEAM_API_KEY env var) */
        apiKey?: string;
        /** Steam user ID (64-bit ID) */
        steamId?: string;
        /** Polling interval in milliseconds (default: 60000 = 1 minute) */
        pollInterval?: number;
    };
    /** Game metadata cache expiry in milliseconds (default: 24 hours) */
    metadataCacheExpiry?: number;
    /** Maximum backoff delay in milliseconds for polling errors (default: 10 minutes) */
    maxBackoffMs?: number;
    /** XP modifier configuration (overrides for gaming-specific bonuses) */
    xpModifier?: Partial<XPModifierConfig>;
}

/**
 * XP modifier calculation configuration
 */
export interface XPModifierConfig {
    /** Maximum XP modifier multiplier (default: 3.0) */
    maxModifier: number;
    /** Maximum gaming XP modifier multiplier (default: 1.75) */
    maxGamingModifier: number;
    /** Motion-based bonus: running (default: 0.5 = +50%) */
    runningBonus: number;
    /** Motion-based bonus: walking (default: 0.2 = +20%) */
    walkingBonus: number;
    /** Weather-based bonus: rain/storm (default: 0.4 = +40%) */
    stormBonus: number;
    /** Weather-based bonus: snow (default: 0.3 = +30%) */
    snowBonus: number;
    /** Time-based bonus: night (default: 0.25 = +25%) */
    nightBonus: number;
    /** Altitude-based bonus threshold in meters (default: 1000) */
    altitudeThreshold: number;
    /** Altitude-based bonus amount (default: 0.3 = +30%) */
    altitudeBonus: number;
    /** Gaming base bonus (default: 0.25 = +25%) */
    gamingBaseBonus: number;
    /** Gaming RPG genre bonus (default: 0.2 = +20%) */
    gamingRPGBonus: number;
    /** Gaming multiplayer bonus (default: 0.15 = +15%) */
    gamingMultiplayerBonus: number;
}

/**
 * Retry configuration for sensor operations
 */
export interface RetryConfig extends SensorRetryConfig {
    /** Enable/disable retry logic entirely (default: true) */
    enabled: boolean;
}

/**
 * Complete sensor configuration interface
 */
export interface SensorConfig {
    /** Geolocation sensor configuration */
    geolocation: Partial<GeolocationSensorConfig>;
    /** Weather sensor configuration */
    weather: Partial<WeatherSensorConfig>;
    /** Gaming platform configuration */
    gaming: Partial<GamingSensorConfig>;
    /** XP modifier configuration */
    xpModifier: Partial<XPModifierConfig>;
    /** Retry configuration */
    retry: Partial<RetryConfig>;
}

/**
 * Default configuration values
 */
export const DEFAULT_SENSOR_CONFIG: Required<SensorConfig> = {
    geolocation: {
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        useLocalStorage: true,
        enableHighAccuracy: true,
        timeout: 5000,
    },
    weather: {
        apiKey: '',
        cacheTTL: 12 * 60 * 1000, // 12 minutes
        forecastCacheTTL: 60 * 60 * 1000, // 60 minutes
        useLocalStorage: true,
    },
    gaming: {
        steam: {
            apiKey: '',
            steamId: undefined,
            pollInterval: 60000, // 1 minute
        },
        metadataCacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
        maxBackoffMs: 10 * 60 * 1000, // 10 minutes
    },
    xpModifier: {
        maxModifier: 3.0,
        maxGamingModifier: 1.75,
        runningBonus: 0.5,
        walkingBonus: 0.2,
        stormBonus: 0.4,
        snowBonus: 0.3,
        nightBonus: 0.25,
        altitudeThreshold: 1000,
        altitudeBonus: 0.3,
        gamingBaseBonus: 0.25,
        gamingRPGBonus: 0.2,
        gamingMultiplayerBonus: 0.15,
    },
    retry: {
        enabled: true,
        maxRetries: 3,
        initialDelayMs: 1000, // 1 second
        maxDelayMs: 10000, // 10 seconds
        backoffMultiplier: 2,
    },
} as const;

/**
 * Load configuration from environment variables
 * @returns Partial configuration loaded from environment
 */
export function loadConfigFromEnv(): Partial<SensorConfig> {
    const config: Partial<SensorConfig> = {};

    // Weather API key from WEATHER_API_KEY
    if (typeof process !== 'undefined' && process.env?.WEATHER_API_KEY) {
        config.weather = { ...config.weather, apiKey: process.env.WEATHER_API_KEY };
    }

    // Steam API key from STEAM_API_KEY
    if (typeof process !== 'undefined' && process.env?.STEAM_API_KEY) {
        config.gaming = {
            ...config.gaming,
            steam: { ...config.gaming?.steam, apiKey: process.env.STEAM_API_KEY }
        };
    }

    // Steam user ID from STEAM_USER_ID
    if (typeof process !== 'undefined' && process.env?.STEAM_USER_ID) {
        config.gaming = {
            ...config.gaming,
            steam: { ...config.gaming?.steam, steamId: process.env.STEAM_USER_ID }
        };
    }

    // XP modifier cap from XP_MAX_MODIFIER (optional)
    if (typeof process !== 'undefined' && process.env?.XP_MAX_MODIFIER) {
        const maxModifier = parseFloat(process.env.XP_MAX_MODIFIER);
        if (!isNaN(maxModifier) && maxModifier > 0) {
            config.xpModifier = { ...config.xpModifier, maxModifier };
        }
    }

    return config;
}

/**
 * Merge user config with defaults and environment variables
 * @param userConfig User-provided configuration
 * @returns Merged configuration with defaults applied
 */
export function mergeConfig(userConfig: Partial<SensorConfig> = {}): Required<SensorConfig> {
    const envConfig = loadConfigFromEnv();

    // Deep merge strategy: userConfig > envConfig > defaults
    return deepMerge(DEFAULT_SENSOR_CONFIG, deepMerge(envConfig, userConfig));
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (sourceValue === undefined) {
            continue;
        }

        if (
            typeof sourceValue === 'object' &&
            sourceValue !== null &&
            !Array.isArray(sourceValue) &&
            typeof targetValue === 'object' &&
            targetValue !== null &&
            !Array.isArray(targetValue)
        ) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = sourceValue as T[Extract<keyof T, string>];
        }
    }

    return result;
}
