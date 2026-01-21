import type { WeatherData } from '../types/Environmental';

interface CacheEntry {
    data: WeatherData;
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

const STORAGE_KEY = 'weather_api_cache';

export class WeatherAPIClient {
    private apiKey: string;
    private baseUrl: string = 'https://api.openweathermap.org/data/2.5/weather';
    private cache: Map<string, CacheEntry> = new Map();
    private cacheTTL: number = 12 * 60 * 1000; // 12 minutes
    private cacheStats: CacheStatistics = { hits: 0, misses: 0 };
    private useLocalStorage: boolean;

    constructor(apiKey: string = '', cacheTTLMinutes: number = 12, useLocalStorage: boolean = true) {
        this.apiKey = apiKey;
        this.cacheTTL = cacheTTLMinutes * 60 * 1000;
        this.useLocalStorage = useLocalStorage && this.isLocalStorageAvailable();
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
            console.warn('Failed to load weather cache from localStorage:', error);
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
            console.warn('Failed to save weather cache to localStorage:', error);
        }
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
            console.warn('Weather API key not provided');
            return null;
        }

        // Check cache first
        const cacheKey = this.getCacheKey(latitude, longitude);
        const cachedEntry = this.cache.get(cacheKey);

        if (cachedEntry && this.isCacheEntryValid(cachedEntry)) {
            this.cacheStats.hits++;
            return cachedEntry.data;
        }

        this.cacheStats.misses++;

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

            return weatherData;
        } catch (error) {
            console.error('Failed to fetch weather:', error);
            return null;
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
}
