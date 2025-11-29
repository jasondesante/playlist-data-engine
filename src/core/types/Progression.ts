/**
 * Progression and Environmental System Types
 * Based on ENGINE_DESIGN_DOCUMENT.md v2.0 and data-model.md
 */

// ============================================================================
// Environmental Sensor Types
// ============================================================================

/**
 * GeolocationData - GPS and location information
 */
export interface GeolocationData {
    latitude: number;
    longitude: number;
    altitude?: number;            // Meters above sea level
    accuracy: number;             // Meters
    altitude_accuracy?: number;
    heading?: number;             // Direction 0-360 degrees
    speed?: number;               // Meters per second
    timestamp: number;            // Unix timestamp
}

/**
 * MotionData - Accelerometer and gyroscope data
 */
export interface MotionData {
    acceleration: {
        x: number;  // m/s²
        y: number;
        z: number;
    };
    acceleration_with_gravity: {
        x: number;
        y: number;
        z: number;
    };
    rotation_rate: {
        alpha: number;  // degrees/second
        beta: number;
        gamma: number;
    };
    movement_intensity: number;   // 0.0 to 1.0
    activity_type: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown';
    timestamp: number;
}

/**
 * WeatherData - Weather API information
 */
export interface WeatherData {
    temperature: number;          // Celsius
    feels_like: number;           // Apparent temperature
    humidity: number;             // Percentage
    pressure: number;             // hPa
    weather_type: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'mist' | 'fog';
    wind_speed: number;           // m/s
    wind_direction: number;       // Degrees
    visibility: number;           // Meters
    is_night: boolean;            // Based on sunrise/sunset times
    moon_phase?: number;          // 0.0 to 1.0 (new to full)
    timestamp: number;
}

/**
 * LightData - Ambient light sensor information
 */
export interface LightData {
    illuminance: number;          // lux (light intensity)
    timestamp: number;
    environment: 'bright_daylight' | 'indoor' | 'dim' | 'dark';
}

/**
 * EnvironmentalContext - Aggregated environmental sensor data
 */
export interface EnvironmentalContext {
    location?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    light?: LightData;

    // Derived gameplay data
    biome?: 'urban' | 'forest' | 'desert' | 'mountain' | 'water' | 'tundra';
    time_of_day?: 'dawn' | 'day' | 'dusk' | 'night';
    season?: 'spring' | 'summer' | 'autumn' | 'winter';

    // Composite XP multiplier (0.5 to 3.0)
    environmental_xp_modifier: number;
}

// ============================================================================
// Gaming Platform Types
// ============================================================================

/**
 * GamingContext - Steam and Discord gaming activity data
 */
export interface GamingContext {
    isActivelyGaming: boolean;
    platformSource: 'steam' | 'discord' | 'both' | 'none';

    currentGame?: {
        name: string;
        source: 'steam' | 'discord';
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
