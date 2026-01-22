export type SensorType = 'geolocation' | 'motion' | 'weather' | 'light';

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

export interface LightData {
    illuminance: number; // lux
    timestamp: number;
}

export type BiomeType = 'urban' | 'forest' | 'desert' | 'mountain' | 'valley' | 'water' | 'tundra' | 'plains' | 'jungle' | 'swamp' | 'taiga' | 'savanna';

export interface EnvironmentalContext {
    geolocation?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    light?: LightData;
    biome?: BiomeType;
    timestamp: number;
    environmental_xp_modifier?: number;
}
