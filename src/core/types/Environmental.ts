export type SensorType = 'geolocation' | 'motion' | 'weather';

/**
 * Performance metrics for API calls
 */
export interface PerformanceMetrics {
    /** Number of successful API calls */
    successCount: number;
    /** Number of failed API calls */
    errorCount: number;
    /** Total time spent on successful API calls (milliseconds) */
    totalTime: number;
    /** Time of the fastest API call (milliseconds) */
    minTime: number;
    /** Time of the slowest API call (milliseconds) */
    maxTime: number;
    /** Timestamp of the last API call */
    lastCallTimestamp: number | null;
}

/**
 * Detailed performance statistics derived from metrics
 */
export interface PerformanceStatistics {
    /** Average API call time in milliseconds */
    average: number;
    /** Minimum API call time in milliseconds */
    min: number;
    /** Maximum API call time in milliseconds */
    max: number;
    /** Total number of API calls */
    totalCalls: number;
    /** Success rate as percentage (0-100) */
    successRate: number;
}

export interface SensorPermission {
    type: SensorType;
    granted: boolean;
    timestamp: number;
}

/**
 * Health status of a sensor
 */
export type SensorHealthStatus = 'healthy' | 'degraded' | 'failed' | 'unknown';

/**
 * Status information for a single sensor
 */
export interface SensorStatus {
    type: SensorType;
    health: SensorHealthStatus;
    lastSuccessTimestamp: number | null;
    lastFailureTimestamp: number | null;
    consecutiveFailures: number;
    totalFailures: number;
    lastError: string | null;
    isRetrying: boolean;
}

/**
 * Log entry for a sensor failure event
 */
export interface SensorFailureLog {
    sensorType: SensorType;
    timestamp: number;
    error: string;
    retryAttempt: number;
    willRetry: boolean;
}

/**
 * Configuration for sensor retry behavior
 */
export interface SensorRetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

/**
 * Notification callback for sensor recovery events
 */
export interface SensorRecoveryNotification {
    sensorType: SensorType;
    previousStatus: SensorHealthStatus;
    newStatus: SensorHealthStatus;
    timestamp: number;
    message: string;
}

export interface GeolocationData {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

export interface MotionData {
    acceleration: {
        x: number | null;
        y: number | null;
        z: number | null;
    };
    accelerationIncludingGravity: {
        x: number;
        y: number;
        z: number;
    };
    rotationRate: {
        alpha: number | null;
        beta: number | null;
        gamma: number | null;
    };
    interval: number;
    timestamp: number;
}

export interface WeatherData {
    temperature: number;
    humidity: number;
    pressure: number;
    weatherType: string; // e.g., 'Clear', 'Rain', 'Clouds'
    windSpeed: number;
    windDirection: number;
    isNight: boolean;
    moonPhase: number; // 0.0 to 1.0
    timestamp: number;
}

export interface ForecastData {
    temperature: number;
    humidity: number;
    pressure: number;
    weatherType: string;
    windSpeed: number;
    windDirection: number;
    timestamp: number;
    forecastTime: Date; // When this forecast is for
    probabilityOfPrecipitation: number; // 0.0 to 1.0
}

/**
 * Day stage categories based on sun position
 */
export type DayStage = 'night' | 'dawn' | 'day' | 'dusk';

/**
 * Twilight type definitions (based on sun angle below horizon)
 * - civil: Sun 6° below horizon (brightest stars visible)
 * - nautical: Sun 12° below horizon (horizon visible at sea)
 * - astronomical: Sun 18° below horizon (full darkness)
 */
export type TwilightType = 'astronomical' | 'nautical' | 'civil';

/**
 * Solar information including sunrise, sunset, and day stage.
 * Works without API key using astronomical calculations.
 */
export interface SolarInfo {
    /** Current time */
    currentTime: Date;
    /** Current day stage */
    stage: DayStage;
    /** Sunrise time (when sun first appears above horizon) */
    sunrise: Date;
    /** Sunset time (when sun last appears above horizon) */
    sunset: Date;
    /** Solar noon (when sun is at highest point) */
    solarNoon: Date;
    /** Civil dawn time (sun 6° below horizon, approaching sunrise) */
    civilDawn?: Date;
    /** Civil dusk time (sun 6° below horizon, after sunset) */
    civilDusk?: Date;
    /** Current sun altitude in degrees (negative = below horizon) */
    sunAltitude: number;
    /** Current sun azimuth in degrees (0-360, North = 0) */
    sunAzimuth: number;
    /** Day length in hours */
    dayLengthHours: number;
    /** Whether data came from API (true) or calculated astronomically (false) */
    fromApi: boolean;
    /** Timestamp when this data was generated */
    timestamp: number;
}

export type BiomeType = 'urban' | 'forest' | 'desert' | 'mountain' | 'valley' | 'water' | 'tundra' | 'plains' | 'jungle' | 'swamp' | 'taiga' | 'savanna';

export interface EnvironmentalContext {
    geolocation?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    biome?: BiomeType;
    timestamp: number;
    environmental_xp_modifier?: number;
}

/**
 * A single source of XP bonus
 */
export interface XPBonusSource {
    /** Unique identifier for this bonus type */
    id: string;
    /** Human-readable label for display */
    label: string;
    /** Emoji icon for UI display */
    icon: string;
    /** The bonus multiplier value (e.g., 0.25 for +25%) */
    bonus: number;
    /** Whether this bonus is currently active */
    active: boolean;
}

/**
 * Detailed breakdown of the XP modifier calculation
 */
export interface XpModifierBreakdown {
    /** Final computed modifier (1.0 - 3.0) */
    total: number;
    /** Base value, always 1.0 */
    baseValue: number;
    /** All possible bonus sources with their active state */
    sources: XPBonusSource[];
    /** Only the currently active bonuses (convenience) */
    activeBonuses: XPBonusSource[];
}
