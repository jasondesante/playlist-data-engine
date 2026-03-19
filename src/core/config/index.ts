/**
 * Sensor Configuration Module
 *
 * Centralized configuration for all sensor modules including:
 * - Environmental sensors (geolocation, weather, motion, light)
 * - Gaming platform sensors (Steam, Discord RPC)
 * - XP modifier calculation
 * - Caching and retry behavior
 *
 * @example
 * import { SensorConfig, mergeConfig, DEFAULT_SENSOR_CONFIG } from './core/config';
 *
 * // Use defaults
 * const config = mergeConfig();
 *
 * // Override specific values
 * const customConfig = mergeConfig({
 *   weather: { cacheTTL: 15 * 60 * 1000 }, // 15 minutes
 *   xpModifier: { maxModifier: 2.5 }
 * });
 */

export type {
    SensorConfig,
    CacheConfig,
    GeolocationSensorConfig,
    WeatherSensorConfig,
    GamingSensorConfig,
    XPModifierConfig,
    RetryConfig,
} from './sensorConfig.js';

export {
    DEFAULT_SENSOR_CONFIG,
    loadConfigFromEnv,
    mergeConfig,
} from './sensorConfig.js';
