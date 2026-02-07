import type { WeatherData, ForecastData, PerformanceMetrics, PerformanceStatistics } from '../types/Environmental';
import type { WeatherSensorConfig } from '../config/sensorConfig.js';
import { Logger } from '../../utils/logger.js';

interface CacheEntry {
    data: WeatherData;
    timestamp: number;
}

interface ForecastCacheEntry {
    data: ForecastData[];
    timestamp: number;
}

interface CacheStatistics {
    hits: number;
    misses: number;
}

interface PersistentCache {
    [key: string]: {
        data: WeatherData;
        timestamp: number;
    };
}

/**
 * Performance timing data for API calls
 */
interface PerformanceTiming {
    startTime: number;
    endTime: number;
    success: boolean;
}

/**
 * Severe weather alert types with XP bonus multipliers
 */
export enum SevereWeatherType {
    Blizzard = 'Blizzard',
    Hurricane = 'Hurricane',
    Typhoon = 'Typhoon',
    Tornado = 'Tornado',
    None = 'None'
}

/**
 * Severe weather alert information
 */
export interface SevereWeatherAlert {
    type: SevereWeatherType;
    xpBonus: number; // 0.5 to 1.0 (50% to 100%)
    severity: 'moderate' | 'high' | 'extreme';
    message: string;
    detectedAt: number;
}

const STORAGE_KEY = 'weather_api_cache';

export class WeatherAPIClient {
    private apiKey: string;
    private baseUrl: string = 'https://api.openweathermap.org/data/2.5/weather';
    private forecastUrl: string = 'https://api.openweathermap.org/data/2.5/forecast';
    private cache: Map<string, CacheEntry> = new Map();
    private forecastCache: Map<string, ForecastCacheEntry> = new Map();
    private cacheTTL: number = 12 * 60 * 1000; // 12 minutes
    private forecastCacheTTL: number = 60 * 60 * 1000; // 60 minutes for forecasts
    private cacheStats: CacheStatistics = { hits: 0, misses: 0 };
    private useLocalStorage: boolean;
    private logger = Logger.for('WeatherAPIClient');
    // Store last known location for tropical region detection
    private lastKnownLocation: { latitude: number; longitude: number } | null = null;

    // Performance metrics for current weather API
    private weatherApiMetrics: PerformanceMetrics = {
        successCount: 0,
        errorCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastCallTimestamp: null
    };

    // Performance metrics for forecast API
    private forecastApiMetrics: PerformanceMetrics = {
        successCount: 0,
        errorCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastCallTimestamp: null
    };

    // Store recent API call times for percentile calculations (last 100 calls)
    private recentWeatherApiTimes: number[] = [];
    private recentForecastApiTimes: number[] = [];
    private readonly maxRecentSamples = 100;

    constructor(apiKey?: string, cacheTTLMinutes?: number, useLocalStorage?: boolean);
    constructor(config: WeatherSensorConfig);
    constructor(apiKeyOrConfig?: string | WeatherSensorConfig, cacheTTLMinutes?: number, useLocalStorage?: boolean) {
        // Handle both legacy constructor signature and new config object
        if (typeof apiKeyOrConfig === 'string' || apiKeyOrConfig === undefined) {
            this.apiKey = apiKeyOrConfig ?? '';
            this.cacheTTL = (cacheTTLMinutes ?? 12) * 60 * 1000;
            this.useLocalStorage = (useLocalStorage ?? true) && this.isLocalStorageAvailable();
        } else {
            const config = apiKeyOrConfig;
            this.apiKey = config.apiKey ?? '';
            this.cacheTTL = config.cacheTTL ?? 12 * 60 * 1000;
            this.useLocalStorage = (config.useLocalStorage ?? true) && this.isLocalStorageAvailable();
        }

        if (this.useLocalStorage) {
            this.loadFromLocalStorage();
        }
    }

    /**
     * Check if localStorage is available
     */
    private isLocalStorageAvailable(): boolean {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Load cache from localStorage
     */
    private loadFromLocalStorage(): void {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const persistentCache: PersistentCache = JSON.parse(stored);
                const now = Date.now();
                for (const [key, entry] of Object.entries(persistentCache)) {
                    if (now - entry.timestamp < this.cacheTTL) {
                        this.cache.set(key, entry);
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Failed to load weather cache from localStorage', { error });
        }
    }

    /**
     * Save cache to localStorage
     */
    private saveToLocalStorage(): void {
        if (!this.useLocalStorage) return;
        try {
            const persistentCache: PersistentCache = {};
            for (const [key, entry] of this.cache.entries()) {
                persistentCache[key] = entry;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentCache));
        } catch (error) {
            this.logger.warn('Failed to save weather cache to localStorage', { error });
        }
    }

    /**
     * Start timing an API call
     * @returns A function that when called, records the elapsed time
     */
    private startTiming(): (success: boolean) => void {
        const startTime = performance.now();
        return (success: boolean) => {
            const elapsed = performance.now() - startTime;
            return;
        };
    }

    /**
     * Record performance metrics for weather API call
     */
    private recordWeatherApiCall(elapsedMs: number, success: boolean): void {
        const now = Date.now();

        if (success) {
            this.weatherApiMetrics.successCount++;
            this.weatherApiMetrics.totalTime += elapsedMs;
            this.weatherApiMetrics.minTime = Math.min(this.weatherApiMetrics.minTime, elapsedMs);
            this.weatherApiMetrics.maxTime = Math.max(this.weatherApiMetrics.maxTime, elapsedMs);

            // Store recent times for percentile calculation
            this.recentWeatherApiTimes.push(elapsedMs);
            if (this.recentWeatherApiTimes.length > this.maxRecentSamples) {
                this.recentWeatherApiTimes.shift();
            }
        } else {
            this.weatherApiMetrics.errorCount++;
        }

        this.weatherApiMetrics.lastCallTimestamp = now;
    }

    /**
     * Record performance metrics for forecast API call
     */
    private recordForecastApiCall(elapsedMs: number, success: boolean): void {
        const now = Date.now();

        if (success) {
            this.forecastApiMetrics.successCount++;
            this.forecastApiMetrics.totalTime += elapsedMs;
            this.forecastApiMetrics.minTime = Math.min(this.forecastApiMetrics.minTime, elapsedMs);
            this.forecastApiMetrics.maxTime = Math.max(this.forecastApiMetrics.maxTime, elapsedMs);

            // Store recent times for percentile calculation
            this.recentForecastApiTimes.push(elapsedMs);
            if (this.recentForecastApiTimes.length > this.maxRecentSamples) {
                this.recentForecastApiTimes.shift();
            }
        } else {
            this.forecastApiMetrics.errorCount++;
        }

        this.forecastApiMetrics.lastCallTimestamp = now;
    }

    /**
     * Calculate percentile from an array of numbers
     */
    private calculatePercentile(values: number[], percentile: number): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get performance statistics for weather API
     */
    private getPerformanceStatistics(metrics: PerformanceMetrics, recentTimes: number[]): PerformanceStatistics {
        const totalCalls = metrics.successCount + metrics.errorCount;
        const average = metrics.successCount > 0 ? metrics.totalTime / metrics.successCount : 0;
        const successRate = totalCalls > 0 ? (metrics.successCount / totalCalls) * 100 : 0;

        return {
            average: Math.round(average),
            min: metrics.minTime === Infinity ? 0 : Math.round(metrics.minTime),
            max: Math.round(metrics.maxTime),
            totalCalls,
            successRate: Math.round(successRate * 10) / 10
        };
    }

    /**
     * Get performance metrics for weather API
     * @returns Performance metrics for current weather API calls
     */
    getWeatherApiMetrics(): PerformanceMetrics {
        return { ...this.weatherApiMetrics };
    }

    /**
     * Get performance statistics for weather API
     * @returns Calculated performance statistics including average, min, max, success rate
     */
    getWeatherApiStatistics(): PerformanceStatistics & { p95: number; p99: number } {
        const stats = this.getPerformanceStatistics(this.weatherApiMetrics, this.recentWeatherApiTimes);
        return {
            ...stats,
            p95: Math.round(this.calculatePercentile(this.recentWeatherApiTimes, 95)),
            p99: Math.round(this.calculatePercentile(this.recentWeatherApiTimes, 99))
        };
    }

    /**
     * Get performance metrics for forecast API
     * @returns Performance metrics for forecast API calls
     */
    getForecastApiMetrics(): PerformanceMetrics {
        return { ...this.forecastApiMetrics };
    }

    /**
     * Get performance statistics for forecast API
     * @returns Calculated performance statistics including average, min, max, success rate
     */
    getForecastApiStatistics(): PerformanceStatistics & { p95: number; p99: number } {
        const stats = this.getPerformanceStatistics(this.forecastApiMetrics, this.recentForecastApiTimes);
        return {
            ...stats,
            p95: Math.round(this.calculatePercentile(this.recentForecastApiTimes, 95)),
            p99: Math.round(this.calculatePercentile(this.recentForecastApiTimes, 99))
        };
    }

    /**
     * Reset all performance metrics
     */
    resetPerformanceMetrics(): void {
        this.weatherApiMetrics = {
            successCount: 0,
            errorCount: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            lastCallTimestamp: null
        };
        this.forecastApiMetrics = {
            successCount: 0,
            errorCount: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            lastCallTimestamp: null
        };
        this.recentWeatherApiTimes = [];
        this.recentForecastApiTimes = [];
    }

    /**
     * Generate cache key from coordinates
     * @param latitude Latitude
     * @param longitude Longitude
     * @returns Cache key string
     */
    private getCacheKey(latitude: number, longitude: number): string {
        // Round to 4 decimal places (~11m precision) for better cache hits
        const lat = Math.round(latitude * 10000) / 10000;
        const lon = Math.round(longitude * 10000) / 10000;
        return `${lat},${lon}`;
    }

    /**
     * Check if a cache entry is still valid
     * @param entry Cache entry to validate
     * @returns True if entry is valid and within TTL
     */
    private isCacheEntryValid(entry: CacheEntry): boolean {
        const age = Date.now() - entry.timestamp;
        return age < this.cacheTTL;
    }

    /**
     * Calculate the moon phase for a given date using astronomical algorithms.
     *
     * Returns a value between 0 and 1 representing the moon's illumination phase:
     * - 0.0 = New Moon (completely dark)
     * - 0.25 = First Quarter (half illuminated, waxing)
     * - 0.5 = Full Moon (fully illuminated)
     * - 0.75 = Last Quarter (half illuminated, waning)
     * - 1.0 = New Moon (cycle completes)
     *
     * Algorithm: Uses a simplified version of the Conway method combined with
     * astronomical calculations based on the known date of a new moon reference.
     *
     * Reference: Based on the mean synodic month of 29.530588853 days
     * (the average time from new moon to new moon).
     *
     * @param date The date for which to calculate the moon phase
     * @returns Moon phase value between 0 and 1
     */
    private calculateMoonPhase(date: Date): number {
        // Reference date: Known new moon on January 11, 2024 at 11:57 UTC
        // This is a well-documented new moon that serves as our epoch
        const knownNewMoon = new Date('2024-01-11T11:57:00Z');

        // Mean synodic month (average lunar cycle) in milliseconds
        // 29.530588853 days = 29 days, 12 hours, 44 minutes, 2.9 seconds
        const synodicMonthMs = 29.530588853 * 24 * 60 * 60 * 1000;

        // Calculate time difference from reference new moon
        const timeSinceReference = date.getTime() - knownNewMoon.getTime();

        // Calculate how many lunar cycles have passed (including fractional)
        const cyclesPassed = timeSinceReference / synodicMonthMs;

        // The fractional part tells us where we are in the current cycle
        // We use Math.abs to handle any potential negative values
        const phase = Math.abs(cyclesPassed % 1);

        return phase;
    }

    /**
     * Fetch current weather for coordinates
     * @param latitude Latitude
     * @param longitude Longitude
     * @returns Promise resolving to WeatherData or null if failed
     */
    async getWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
        if (!this.apiKey) {
            this.logger.warn('Weather API key not provided');
            return null;
        }

        // Store location for tropical region detection
        this.lastKnownLocation = { latitude, longitude };

        // Check cache first
        const cacheKey = this.getCacheKey(latitude, longitude);
        const cachedEntry = this.cache.get(cacheKey);

        if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
            this.cacheStats.hits++;
            return cachedEntry.data;
        }

        this.cacheStats.misses++;

        const startTime = performance.now();
        let success = false;

        try {
            const url = `${this.baseUrl}?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Weather API error: ${response.statusText}`);
            }

            const data = await response.json();

            // Calculate isNight based on current time vs sunrise/sunset
            const now = Date.now() / 1000;
            const isNight = now < data.sys.sunrise || now > data.sys.sunset;

            const weatherData: WeatherData = {
                temperature: data.main.temp,
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                weatherType: data.weather[0]?.main || 'Clear',
                windSpeed: data.wind.speed,
                windDirection: data.wind.deg,
                isNight,
                moonPhase: this.calculateMoonPhase(new Date()),
                timestamp: Date.now()
            };

            // Store in cache
            this.cache.set(cacheKey, {
                data: weatherData,
                timestamp: Date.now()
            });

            // Persist to localStorage
            this.saveToLocalStorage();

            success = true;
            return weatherData;
        } catch (error) {
            this.logger.error('Failed to fetch weather', { error });
            return null;
        } finally {
            const elapsed = performance.now() - startTime;
            this.recordWeatherApiCall(elapsed, success);
        }
    }

    /**
     * Invalidate all cached weather data
     */
    invalidateCache(): void {
        this.cache.clear();
        this.saveToLocalStorage();
    }

    /**
     * Invalidate cache for a specific location
     * @param latitude Latitude
     * @param longitude Longitude
     */
    invalidateLocation(latitude: number, longitude: number): void {
        const cacheKey = this.getCacheKey(latitude, longitude);
        this.cache.delete(cacheKey);
        this.saveToLocalStorage();
    }

    /**
     * Get cache statistics
     * @returns Cache statistics object
     */
    getCacheStats(): CacheStatistics {
        return { ...this.cacheStats };
    }

    /**
     * Reset cache statistics
     */
    resetCacheStats(): void {
        this.cacheStats = { hits: 0, misses: 0 };
    }

    /**
     * Clear expired cache entries
     * @returns Number of entries cleared
     */
    clearExpiredEntries(): number {
        let cleared = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (!this.isCacheEntryValid(entry)) {
                this.cache.delete(key);
                cleared++;
            }
        }
        if (cleared > 0) {
            this.saveToLocalStorage();
        }
        return cleared;
    }

    /**
     * Get current cache size
     * @returns Number of cached entries
     */
    getCacheSize(): number {
        return this.cache.size;
    }

    /**
     * Get the last known location used for weather queries
     * Used for tropical region detection in severe weather alerts
     * @returns Last known location or null if no weather has been fetched
     */
    getLastKnownLocation(): { latitude: number; longitude: number } | null {
        return this.lastKnownLocation ? { ...this.lastKnownLocation } : null;
    }

    /**
     * Check if a forecast cache entry is still valid
     * @param entry Forecast cache entry to validate
     * @returns True if entry is valid and within TTL
     */
    private isForecastCacheEntryValid(entry: ForecastCacheEntry): boolean {
        const age = Date.now() - entry.timestamp;
        return age < this.forecastCacheTTL;
    }

    /**
     * Generate forecast cache key with hours limit
     * @param latitude Latitude
     * @param longitude Longitude
     * @param hours Number of hours to forecast
     * @returns Forecast cache key string
     */
    private getForecastCacheKey(latitude: number, longitude: number, hours: number): string {
        const lat = Math.round(latitude * 10000) / 10000;
        const lon = Math.round(longitude * 10000) / 10000;
        return `forecast_${lat},${lon}_${hours}h`;
    }

    /**
     * Fetch weather forecast for coordinates
     * @param latitude Latitude
     * @param longitude Longitude
     * @param hours Number of hours to return (max 120 hours / 5 days)
     * @returns Promise resolving to array of ForecastData or null if failed
     */
    async getForecast(latitude: number, longitude: number, hours: number = 24): Promise<ForecastData[] | null> {
        if (!this.apiKey) {
            this.logger.warn('Weather API key not provided');
            return null;
        }

        // Limit hours to maximum supported by API (120 hours = 5 days)
        const hoursToFetch = Math.min(hours, 120);

        // Check forecast cache first
        const forecastCacheKey = this.getForecastCacheKey(latitude, longitude, hoursToFetch);
        const cachedForecastEntry = this.forecastCache.get(forecastCacheKey);

        if (cachedForecastEntry && this.isForecastCacheEntryValid(cachedForecastEntry)) {
            // Filter cached results to requested hours
            return cachedForecastEntry.data.slice(0, Math.ceil(hoursToFetch / 3));
        }

        const startTime = performance.now();
        let success = false;

        try {
            // OpenWeatherMap 5-day/3-hour forecast endpoint
            // Using cnt parameter to limit number of timestamps returned
            // 3-hour intervals means we need ceil(hours / 3) data points
            const count = Math.ceil(hoursToFetch / 3);
            const url = `${this.forecastUrl}?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric&cnt=${count}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Weather Forecast API error: ${response.statusText}`);
            }

            const data = await response.json();

            // Parse forecast data from API response
            const forecastData: ForecastData[] = data.list.map((item: any) => ({
                temperature: item.main.temp,
                humidity: item.main.humidity,
                pressure: item.main.pressure,
                weatherType: item.weather[0]?.main || 'Clear',
                windSpeed: item.wind.speed,
                windDirection: item.wind.deg,
                timestamp: Date.now(),
                forecastTime: new Date(item.dt * 1000),
                probabilityOfPrecipitation: item.pop || 0
            }));

            // Store in forecast cache
            this.forecastCache.set(forecastCacheKey, {
                data: forecastData,
                timestamp: Date.now()
            });

            success = true;
            return forecastData;
        } catch (error) {
            this.logger.error('Failed to fetch weather forecast', { error });
            return null;
        } finally {
            const elapsed = performance.now() - startTime;
            this.recordForecastApiCall(elapsed, success);
        }
    }

    /**
     * Get upcoming weather changes for XP modifier calculation
     * @param latitude Latitude
     * @param longitude Longitude
     * @param hours Hours ahead to check (default: 12 hours)
     * @returns Promise resolving to upcoming weather info or null
     */
    async getUpcomingWeather(latitude: number, longitude: number, hours: number = 12): Promise<{
        willRain: boolean;
        willSnow: boolean;
        rainProbability: number;
        snowProbability: number;
        worstWeatherType: string;
    } | null> {
        const forecast = await this.getForecast(latitude, longitude, hours);

        if (!forecast || forecast.length === 0) {
            return null;
        }

        // Analyze forecast for weather conditions
        let willRain = false;
        let willSnow = false;
        let maxRainProb = 0;
        let maxSnowProb = 0;
        const weatherTypes: string[] = [];

        for (const item of forecast) {
            weatherTypes.push(item.weatherType);

            if (item.weatherType.toLowerCase().includes('rain') || item.weatherType.toLowerCase().includes('drizzle')) {
                willRain = true;
                maxRainProb = Math.max(maxRainProb, item.probabilityOfPrecipitation);
            }

            if (item.weatherType.toLowerCase().includes('snow')) {
                willSnow = true;
                maxSnowProb = Math.max(maxSnowProb, item.probabilityOfPrecipitation);
            }
        }

        // Determine worst weather type for XP bonus calculation
        // Priority: Storm > Snow > Rain > Clouds > Clear
        const typePriority: Record<string, number> = {
            'thunderstorm': 5,
            'snow': 4,
            'rain': 3,
            'drizzle': 2,
            'clouds': 1,
            'clear': 0,
            'mist': 1,
            'fog': 1,
            'haze': 1,
            'smoke': 1,
            'dust': 1,
            'sand': 1,
            'ash': 1,
            'squall': 2,
            'tornado': 5
        };

        let worstWeatherType = 'Clear';
        let maxPriority = -1;

        for (const type of new Set(weatherTypes)) {
            const priority = typePriority[type.toLowerCase()] ?? 0;
            if (priority > maxPriority) {
                maxPriority = priority;
                worstWeatherType = type;
            }
        }

        return {
            willRain,
            willSnow,
            rainProbability: maxRainProb,
            snowProbability: maxSnowProb,
            worstWeatherType
        };
    }

    /**
     * Detect severe weather conditions from current or forecast data
     *
     * Analyzes weather conditions to detect severe weather events including:
     * - Blizzard: Heavy snow with high winds (>25 km/h)
     * - Hurricane/Typhoon: Extreme wind speeds (>118 km/h) with rain/storm
     * - Tornado: Tornado weather type detected (API-specific)
     *
     * @param weather Weather data to analyze
     * @returns Severe weather alert or null if conditions are normal
     */
    detectSevereWeather(weather: WeatherData | ForecastData): SevereWeatherAlert | null {
        const weatherTypeLower = weather.weatherType.toLowerCase();
        const windSpeedKmh = weather.windSpeed * 3.6; // Convert m/s to km/h

        // Blizzard detection: Heavy snow with high winds
        if (weatherTypeLower.includes('snow') || weatherTypeLower.includes('blizzard')) {
            const isHeavySnow = weatherTypeLower.includes('blizzard') ||
                              weatherTypeLower.includes('heavy') ||
                              weather.windSpeed > 8; // Strong winds
            const isHighWind = windSpeedKmh > 25; // >25 km/h

            if ((weatherTypeLower.includes('blizzard') || (isHeavySnow && isHighWind))) {
                return {
                    type: SevereWeatherType.Blizzard,
                    xpBonus: 0.5, // +50% XP
                    severity: windSpeedKmh > 50 ? 'extreme' : 'high',
                    message: '⚠️ Blizzard conditions detected! Stay safe and warm.',
                    detectedAt: Date.now()
                };
            }
        }

        // Hurricane/Typhoon detection: Extreme winds with storm conditions
        if (windSpeedKmh > 118) {
            // Hurricane force winds: >118 km/h (Category 1+)
            const isTropical = this.lastKnownLocation
                ? this.isTropicalRegion(this.lastKnownLocation.latitude)
                : false;
            const type = isTropical ? SevereWeatherType.Hurricane : SevereWeatherType.Typhoon;

            return {
                type,
                xpBonus: 0.75, // +75% XP
                severity: windSpeedKmh > 177 ? 'extreme' : 'high',
                message: `🌀 ${type} conditions detected! Please seek shelter.`,
                detectedAt: Date.now()
            };
        }

        // Tornado detection: Tornado weather type or extreme conditions
        if (weatherTypeLower.includes('tornado')) {
            return {
                type: SevereWeatherType.Tornado,
                xpBonus: 1.0, // +100% XP (maximum bonus)
                severity: 'extreme',
                message: '🌪️ TORNADO WARNING! Take immediate shelter!',
                detectedAt: Date.now()
            };
        }

        // Extreme thunderstorm detection (near-severe threshold)
        if (weatherTypeLower.includes('thunderstorm') && windSpeedKmh > 60) {
            // Very strong thunderstorm - close to severe but not in the same category
            return {
                type: SevereWeatherType.Tornado, // Using tornado as proxy for extreme storm
                xpBonus: 0.5, // +50% XP (same as blizzard)
                severity: 'high',
                message: '⛈️ Extreme thunderstorm with high winds! Exercise caution.',
                detectedAt: Date.now()
            };
        }

        return null;
    }

    /**
     * Helper method to determine if a location is in tropical region
     *
     * Tropical regions are roughly between the Tropic of Cancer (23.5°N) and
     * the Tropic of Capricorn (23.5°S). This is where hurricanes and typhoons
     * are most likely to form.
     *
     * @param latitude Latitude in decimal degrees
     * @returns True if in tropical region (between 23.5°N and 23.5°S)
     */
    private isTropicalRegion(latitude: number): boolean {
        // Tropical regions: between 23.5°N and 23.5°S (absolute value < 23.5)
        return Math.abs(latitude) < 23.5;
    }

    /**
     * Get safety warning message for severe weather
     *
     * @param alert Severe weather alert
     * @returns Safety warning message with recommendations
     */
    getSafetyWarning(alert: SevereWeatherAlert): string {
        switch (alert.type) {
            case SevereWeatherType.Blizzard:
                return alert.severity === 'extreme'
                    ? '🚨 EXTREME BLIZZARD: Stay indoors, avoid travel. Keep emergency supplies ready.'
                    : '⚠️ Blizzard: Dress warmly, avoid unnecessary travel. Check on neighbors.';
            case SevereWeatherType.Hurricane:
            case SevereWeatherType.Typhoon:
                return alert.severity === 'extreme'
                    ? '🚨 EXTREME CYCLONE: Seek shelter immediately! Follow evacuation orders.'
                    : '⚠️ Hurricane/Typhoon: Secure property, prepare emergency kit, follow local alerts.';
            case SevereWeatherType.Tornado:
                return '🚨 TORNADO: Take shelter in basement or interior room immediately! Stay away from windows.';
            default:
                return '⚠️ Severe weather detected. Stay informed and stay safe.';
        }
    }

    /**
     * Invalidate all forecast cache
     */
    invalidateForecastCache(): void {
        this.forecastCache.clear();
    }

    /**
     * Invalidate forecast cache for a specific location
     * @param latitude Latitude
     * @param longitude Longitude
     */
    invalidateForecastLocation(latitude: number, longitude: number): void {
        // Clear all forecast cache entries for this location (any hours value)
        for (const [key] of this.forecastCache.entries()) {
            const baseKey = this.getCacheKey(latitude, longitude);
            if (key.includes(baseKey)) {
                this.forecastCache.delete(key);
            }
        }
    }

    /**
     * Clear expired forecast cache entries
     * @returns Number of entries cleared
     */
    clearExpiredForecastEntries(): number {
        let cleared = 0;
        for (const [key, entry] of this.forecastCache.entries()) {
            if (!this.isForecastCacheEntryValid(entry)) {
                this.forecastCache.delete(key);
                cleared++;
            }
        }
        return cleared;
    }
}
