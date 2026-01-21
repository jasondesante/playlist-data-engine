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
            return this.cache!.data;
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
     * Calculate the biome based on coordinates (improved with longitude-based detection)
     * In a real app, this would query a GIS service or use a sophisticated map.
     * Here we use simple latitude/longitude heuristics for demonstration.
     *
     * The detection now considers:
     * - Latitude bands (polar, temperate, tropical)
     * - Longitude-based regional characteristics (continental vs coastal, desert belts)
     * - Regional biome patterns based on global geography
     */
    getBiome(latitude: number, longitude: number): string {
        const absLat = Math.abs(latitude);
        const normalizedLon = this.normalizeLongitude(longitude);

        // Polar regions (Arctic/Antarctic) - always tundra
        if (absLat > 66.5) {
            return 'tundra';
        }

        // Desert belts around 15-45° N/S latitude
        // Check this BEFORE tropics for desert regions to avoid misclassifying deserts as forests
        // Extended range to cover Gobi (35-45°N) and other higher-latitude deserts
        if (absLat >= 15 && absLat <= 45) {
            // Check if we're in known desert longitude regions
            if (this.isInDesertRegion(latitude, normalizedLon)) {
                return 'desert';
            }
        }

        // Tropical regions (23.5° N/S) - forests and jungles
        // Check this AFTER desert to avoid misclassifying tropical deserts as forests
        if (absLat <= 23.5) {
            // Northern Hemisphere tropics (Amazon, Central Africa, Southeast Asia)
            if (latitude > 0) {
                // Amazon basin (50-70° W)
                if (normalizedLon >= 290 && normalizedLon <= 310) return 'forest';
                // Central Africa (10-30° E) - but NOT Sahara (already checked above)
                if (normalizedLon >= 10 && normalizedLon <= 30) return 'forest';
                // South/Southeast Asia (70-120° E)
                if (normalizedLon >= 70 && normalizedLon <= 120) return 'forest';
            }
            // Southern Hemisphere tropics
            else {
                // Congo basin (10-30° E)
                if (normalizedLon >= 10 && normalizedLon <= 30) return 'forest';
                // Indonesia/Pacific (100-140° E)
                if (normalizedLon >= 100 && normalizedLon <= 140) return 'forest';
            }
            // Default tropical biome
            return 'forest';
        }

        // Temperate regions (above 23.5° up to 66.5°)
        // Urban detection for major mid-latitude cities first (Northern Hemisphere only)
        if (latitude > 0 && absLat >= 30 && absLat <= 50) {
            // North America urban corridors
            if (normalizedLon >= 235 && normalizedLon <= 290) {
                // Northeast US, West Coast, etc. - urban
                return 'urban';
            }
            // Europe urban
            if (normalizedLon >= 0 && normalizedLon <= 40) {
                return 'urban';
            }
            // East Asia urban
            if (normalizedLon >= 110 && normalizedLon <= 145) {
                return 'urban';
            }
        }

        // Rest of temperate regions by geography
        if (absLat > 23.5 && absLat <= 66.5) {
            // Northern Hemisphere temperate
            if (latitude > 0) {
                // North America (70-125° W) - forests in north, plains in middle
                if (normalizedLon >= 235 && normalizedLon <= 290) {
                    return absLat >= 45 ? 'forest' : 'plains';
                }
                // Europe (0-40° E) - forest
                if (normalizedLon >= 0 && normalizedLon <= 40) {
                    return 'forest';
                }
                // Asia (40-180° E) - mountains in north, plains in south
                if (normalizedLon > 40 && normalizedLon <= 180) {
                    return absLat >= 50 ? 'mountain' : 'plains';
                }
            }
            // Southern Hemisphere temperate
            else {
                // South America (40-80° W)
                if (normalizedLon >= 280 && normalizedLon <= 320) {
                    return 'plains';
                }
                // Southern Africa (15-40° E)
                if (normalizedLon >= 15 && normalizedLon <= 40) {
                    return 'plains';
                }
                // Australia/New Zealand (110-180° E)
                if (normalizedLon >= 110 && normalizedLon <= 180) {
                    return 'plains';
                }
            }
        }

        // Default fallback
        return 'plains';
    }

    /**
     * Normalize longitude to 0-360 range for easier region checking
     */
    private normalizeLongitude(lon: number): number {
        let normalized = lon % 360;
        if (normalized < 0) normalized += 360;
        return normalized;
    }

    /**
     * Check if coordinates fall within known desert regions
     * Uses latitude bands around 30° N/S and longitude ranges for major deserts
     */
    private isInDesertRegion(lat: number, lon: number): boolean {
        const absLat = Math.abs(lat);

        // Sahara Desert (15-30° N, 15° W-40° E) - wraps across prime meridian
        if (lat > 15 && lat < 30 && (lon >= 345 || lon <= 40)) return true;

        // Arabian Desert (15-30° N, 35-55° E)
        if (lat > 15 && lat < 30 && lon >= 35 && lon <= 55) return true;

        // Syrian Desert (28-35° N, 35-40° E)
        if (lat > 28 && lat < 35 && lon >= 35 && lon <= 40) return true;

        // Iranian Desert (25-35° N, 50-65° E)
        if (lat > 25 && lat < 35 && lon >= 50 && lon <= 65) return true;

        // Thar Desert (23-30° N, 68-75° E)
        if (lat > 23 && lat < 30 && lon >= 68 && lon <= 75) return true;

        // Gobi Desert (35-45° N, 100-115° E)
        if (lat > 35 && lat < 45 && lon >= 100 && lon <= 115) return true;

        // Australian Desert (20-30° S, 115-145° E)
        if (lat < -20 && lat > -30 && lon >= 115 && lon <= 145) return true;

        // Atacama Desert (20-25° S, 68-70° W → 290-292° normalized)
        if (lat < -20 && lat > -25 && lon >= 290 && lon <= 292) return true;

        // Sonoran Desert (25-35° N, 110-115° W → 245-250° normalized)
        if (lat > 25 && lat < 35 && lon >= 245 && lon <= 250) return true;

        // Kalahari Desert (20-30° S, 20-30° E)
        if (lat < -20 && lat > -30 && lon >= 20 && lon <= 30) return true;

        return false;
    }
}
