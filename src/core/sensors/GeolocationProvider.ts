import type { GeolocationData } from '../types/Environmental';

interface CacheEntry {
    data: GeolocationData;
    timestamp: number;
}

interface CacheStatistics {
    hits: number;
    misses: number;
}

interface PersistentCache {
    [key: string]: {
        data: GeolocationData;
        timestamp: number;
    };
}

const STORAGE_KEY = 'geolocation_cache';

export class GeolocationProvider {
    private cache: CacheEntry | null = null;
    private cacheTTL: number = 5 * 60 * 1000; // 5 minutes
    private cacheStats: CacheStatistics = { hits: 0, misses: 0 };
    private useLocalStorage: boolean;

    constructor(cacheTTLMinutes: number = 5, useLocalStorage: boolean = true) {
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
                // Geolocation cache only has one entry
                const entry = Object.values(persistentCache)[0];
                if (entry && now - entry.timestamp < this.cacheTTL) {
                    this.cache = entry;
                }
            }
        } catch (error) {
            console.warn('Failed to load geolocation cache from localStorage:', error);
        }
    }

    /**
     * Save cache to localStorage
     */
    private saveToLocalStorage(): void {
        if (!this.useLocalStorage || !this.cache) return;
        try {
            const persistentCache: PersistentCache = {
                'position': this.cache
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentCache));
        } catch (error) {
            console.warn('Failed to save geolocation cache to localStorage:', error);
        }
    }

    /**
     * Check if a cache entry is still valid
     * @param entry Cache entry to validate
     * @returns True if entry is valid and within TTL
     */
    private isCacheEntryValid(entry: CacheEntry | null): boolean {
        if (!entry) return false;
        const age = Date.now() - entry.timestamp;
        return age < this.cacheTTL;
    }

    /**
     * Get the age of the cached position in milliseconds
     * @returns Age in milliseconds, or null if no cache exists
     */
    getCacheAge(): number | null {
        if (!this.cache) return null;
        return Date.now() - this.cache.timestamp;
    }

    /**
     * Get the current position using the Geolocation API
     * @param forceRefresh If true, bypass cache and fetch fresh position
     * @returns Promise resolving to GeolocationData or null if failed/denied
     */
    async getCurrentPosition(forceRefresh: boolean = false): Promise<GeolocationData | null> {
        // Check cache first (unless force refresh is requested)
        if (!forceRefresh && this.isCacheEntryValid(this.cache)) {
            this.cacheStats.hits++;
            return this.cache.data;
        }

        this.cacheStats.misses++;

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return null;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const geoData: GeolocationData = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        altitude: position.coords.altitude,
                        accuracy: position.coords.accuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    };

                    // Store in cache
                    this.cache = {
                        data: geoData,
                        timestamp: Date.now()
                    };

                    // Persist to localStorage
                    this.saveToLocalStorage();

                    resolve(geoData);
                },
                (error) => {
                    console.warn('Geolocation error:', error.message);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Invalidate all cached geolocation data
     */
    invalidateCache(): void {
        this.cache = null;
        if (this.useLocalStorage) {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (error) {
                console.warn('Failed to clear geolocation cache from localStorage:', error);
            }
        }
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
     * Check if cache is expired
     * @returns True if cache is expired or doesn't exist
     */
    isCacheExpired(): boolean {
        return !this.isCacheEntryValid(this.cache);
    }

    /**
     * Get the cached position without checking TTL
     * @returns Cached position data or null if no cache exists
     */
    getCachedPosition(): GeolocationData | null {
        return this.cache?.data ?? null;
    }

    /**
     * Calculate the biome based on coordinates (simplified logic)
     * In a real app, this would query a GIS service or use a sophisticated map.
     * Here we use simple latitude/longitude heuristics for demonstration.
     */
    getBiome(latitude: number, _longitude: number): string {
        // Simplified biome detection
        const absLat = Math.abs(latitude);

        if (absLat > 66.5) return 'tundra'; // Polar circles
        if (absLat < 23.5) {
            // Tropics - check for water or forest (simplified)
            // This is very rough and just for flavor
            return 'forest';
        }
        if (absLat > 30 && absLat < 50) {
            return 'urban'; // Mid-latitudes often populated
        }

        return 'plains'; // Default
    }
}
