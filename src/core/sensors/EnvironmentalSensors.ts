import type { SensorType, SensorPermission, EnvironmentalContext } from '../types/Environmental';
import { GeolocationProvider } from './GeolocationProvider';
import { MotionDetector } from './MotionDetector';
import { WeatherAPIClient } from './WeatherAPIClient';
import { LightSensor } from './LightSensor';

/**
 * Environmental sensor integration for location, motion, weather, and light data
 *
 * Aggregates data from:
 * - GPS/Geolocation (latitude, longitude, altitude)
 * - Motion sensors (accelerometer, gyroscope, activity detection)
 * - Weather API (temperature, humidity, conditions)
 * - Light sensor (illuminance, environment classification)
 *
 * Calculates environmental XP modifiers (1.0x - 3.0x) based on activity
 * type, weather conditions, altitude, and time of day.
 */
export class EnvironmentalSensors {
    private permissions: Map<SensorType, boolean> = new Map();
    private geolocation: GeolocationProvider;
    private motion: MotionDetector;
    private weather: WeatherAPIClient;
    private light: LightSensor;

    private context: EnvironmentalContext = {
        timestamp: Date.now()
    };

    /**
     * Initialize environmental sensors with optional weather API key
     *
     * @param {string} [weatherApiKey] - OpenWeatherMap API key (required for weather data)
     *
     * @example
     * const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
     */
    constructor(weatherApiKey?: string) {
        this.permissions.set('geolocation', false);
        this.permissions.set('motion', false);
        this.permissions.set('weather', false);
        this.permissions.set('light', false);

        this.geolocation = new GeolocationProvider();
        this.motion = new MotionDetector();
        this.weather = new WeatherAPIClient(weatherApiKey);
        this.light = new LightSensor();
    }

    /**
     * Request user permissions for specific sensor types
     *
     * Requests browser/device permissions for GPS, motion, weather, and light sensors.
     * User must explicitly grant permissions before data can be accessed.
     *
     * @param {SensorType[]} types - Array of sensor types to request ('geolocation' | 'motion' | 'weather' | 'light')
     * @returns {Promise<SensorPermission[]>} Array of permission results (granted/denied)
     *
     * @example
     * const permissions = await sensors.requestPermissions(['geolocation', 'motion']);
     */
    async requestPermissions(types: SensorType[]): Promise<SensorPermission[]> {
        const results: SensorPermission[] = [];

        for (const type of types) {
            let granted = false;

            switch (type) {
                case 'geolocation':
                    granted = await this.requestGeolocationPermission();
                    break;
                case 'motion':
                    granted = await this.requestMotionPermission();
                    break;
                case 'weather':
                    granted = true;
                    break;
                case 'light':
                    granted = await this.requestLightPermission();
                    break;
            }

            this.permissions.set(type, granted);
            results.push({
                type,
                granted,
                timestamp: Date.now()
            });
        }

        return results;
    }

    /**
     * Start monitoring enabled sensors
     */
    startMonitoring(callback?: (context: EnvironmentalContext) => void): void {
        if (this.permissions.get('motion')) {
            this.motion.startMonitoring((data) => {
                this.context.motion = data;
                this.context.timestamp = Date.now();
                if (callback) callback(this.context);
            });
        }

        if (this.permissions.get('light')) {
            this.light.startMonitoring((data) => {
                this.context.light = data;
                this.context.timestamp = Date.now();
                if (callback) callback(this.context);
            });
        }

        // Poll geolocation and weather if enabled (e.g., every 5 minutes)
        // For simplicity, we just fetch once on start here, but a real app would set an interval
        this.updateSnapshot();
    }

    /**
     * Stop all monitoring
     */
    stopMonitoring(): void {
        this.motion.stopMonitoring();
        this.light.stopMonitoring();
    }

    /**
     * Manually update snapshot of pull-based sensors (Geo, Weather)
     */
    async updateSnapshot(): Promise<EnvironmentalContext> {
        if (this.permissions.get('geolocation')) {
            const geo = await this.geolocation.getCurrentPosition();
            if (geo) {
                this.context.geolocation = geo;

                // Calculate biome from coordinates
                const biome = this.geolocation.getBiome(geo.latitude, geo.longitude);
                this.context.biome = biome as any;

                // If we have geo and weather permission, update weather
                if (this.permissions.get('weather')) {
                    const weather = await this.weather.getWeather(geo.latitude, geo.longitude);
                    if (weather) {
                        this.context.weather = weather;
                    }
                }
            }
        }

        this.context.timestamp = Date.now();
        return this.context;
    }

    /**
     * Calculate XP modifier based on environmental factors
     * Cap at 3.0x total
     */
    calculateXPModifier(): number {
        let modifier = 1.0;

        // Motion bonuses
        if (this.context.motion) {
            const activity = this.motion.detectActivity(this.context.motion);
            if (activity === 'running') modifier += 0.5; // +50%
            else if (activity === 'walking') modifier += 0.2; // +20%
        }

        // Weather bonuses
        if (this.context.weather) {
            const type = this.context.weather.weatherType.toLowerCase();
            if (type.includes('rain') || type.includes('storm')) modifier += 0.4; // +40% for braving the storm
            if (type.includes('snow')) modifier += 0.3; // +30%

            if (this.context.weather.isNight) modifier += 0.25; // +25% for night owl
        }

        // Geolocation bonuses
        if (this.context.geolocation && this.context.geolocation.altitude && this.context.geolocation.altitude > 1000) {
            modifier += 0.3; // +30% for high altitude
        }

        return Math.min(modifier, 3.0);
    }

    getPermissions(): SensorPermission[] {
        return Array.from(this.permissions.entries()).map(([type, granted]) => ({
            type,
            granted,
            timestamp: Date.now()
        }));
    }

    checkAvailability(type: SensorType): boolean {
        if (typeof window === 'undefined') return false;

        switch (type) {
            case 'geolocation':
                return 'geolocation' in navigator;
            case 'motion':
                return 'DeviceMotionEvent' in window;
            case 'weather':
                return true;
            case 'light':
                return 'AmbientLightSensor' in window;
            default:
                return false;
        }
    }

    private async requestGeolocationPermission(): Promise<boolean> {
        if (!this.checkAvailability('geolocation')) return false;
        try {
            // Trigger a request by calling getCurrentPosition
            await this.geolocation.getCurrentPosition();
            return true;
        } catch (e) {
            return false;
        }
    }

    private async requestMotionPermission(): Promise<boolean> {
        if (!this.checkAvailability('motion')) return false;
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                return response === 'granted';
            } catch (e) {
                return false;
            }
        }
        return true;
    }

    private async requestLightPermission(): Promise<boolean> {
        if (!this.checkAvailability('light')) return false;
        try {
            const result = await navigator.permissions.query({ name: 'ambient-light-sensor' as any });
            return result.state === 'granted' || result.state === 'prompt';
        } catch (e) {
            return false;
        }
    }

    // Add this inside the EnvironmentalSensors class
    public getCurrentActivity(): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown' {
        if (!this.context.motion || !this.permissions.get('motion')) {
            return 'unknown';
        }
        return this.motion.detectActivity(this.context.motion);
    }
}
