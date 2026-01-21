export type SensorType = 'geolocation' | 'motion' | 'weather' | 'light';

export interface SensorPermission {
    type: SensorType;
    granted: boolean;
    timestamp: number;
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

export interface LightData {
    illuminance: number; // lux
    timestamp: number;
}

export type BiomeType = 'urban' | 'forest' | 'desert' | 'mountain' | 'valley' | 'water' | 'tundra' | 'plains';

export interface EnvironmentalContext {
    geolocation?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    light?: LightData;
    biome?: BiomeType;
    timestamp: number;
    environmental_xp_modifier?: number;
}
