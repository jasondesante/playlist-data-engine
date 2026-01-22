import type { GeolocationData } from '../types/Environmental';
import type { GeolocationSensorConfig } from '../config/sensorConfig.js';
import { Logger } from '../../utils/logger.js';

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
    private logger = Logger.for('GeolocationProvider');

    constructor(cacheTTLMinutes?: number, useLocalStorage?: boolean);
    constructor(config: GeolocationSensorConfig);
    constructor(cacheTTLMinutesOrConfig?: number | GeolocationSensorConfig, useLocalStorage?: boolean) {
        // Handle both legacy constructor signature and new config object
        if (typeof cacheTTLMinutesOrConfig === 'number' || cacheTTLMinutesOrConfig === undefined) {
            this.cacheTTL = (cacheTTLMinutesOrConfig ?? 5) * 60 * 1000;
            this.useLocalStorage = (useLocalStorage ?? true) && this.isLocalStorageAvailable();
        } else {
            const config = cacheTTLMinutesOrConfig;
            this.cacheTTL = config.cacheTTL ?? 5 * 60 * 1000;
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
                // Geolocation cache only has one entry
                const entry = Object.values(persistentCache)[0];
                if (entry && now - entry.timestamp < this.cacheTTL) {
                    this.cache = entry;
                }
            }
        } catch (error) {
            this.logger.warn('Failed to load geolocation cache from localStorage', { error });
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
            this.logger.warn('Failed to save geolocation cache to localStorage', { error });
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
                    this.logger.warn('Geolocation error', { error: error.message });
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
                this.logger.warn('Failed to clear geolocation cache from localStorage', { error });
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
     * - Coastal vs inland detection (oceans, seas, islands, peninsulas)
     * - Elevation/altitude when available (mountains, valleys)
     *
     * @param latitude Latitude coordinate
     * @param longitude Longitude coordinate
     * @param altitude Optional altitude in meters (null if unavailable)
     * @returns Biome type string (may include _coastal suffix for coastal variants)
     */
    getBiome(latitude: number, longitude: number, altitude: number | null = null): string {
        const absLat = Math.abs(latitude);
        const normalizedLon = this.normalizeLongitude(longitude);

        // Check if location is coastal (for suffixing biomes)
        const isCoastal = this.isCoastal(latitude, longitude);
        const coastalSuffix = isCoastal ? '_coastal' : '';

        // ELEVATION-BASED BIOME DETECTION
        // When valid altitude data is available, use it to determine biome
        // Elevation overrides coordinate-based detection for mountains and valleys
        if (altitude !== null && !isNaN(altitude)) {
            const elevationBiome = this.getElevationBiome(altitude, coastalSuffix);
            if (elevationBiome) {
                return elevationBiome;
            }
        }

        // Polar regions (Arctic/Antarctic) - always tundra
        if (absLat > 66.5) {
            return `tundra${coastalSuffix}`;
        }

        // Swamp regions (highest priority - specific wetlands)
        // Check swamps globally before other biome classifications
        if (this.isInSwampRegion(latitude, normalizedLon)) {
            return `swamp${coastalSuffix}`;
        }

        // Desert belts around 15-45° N/S latitude
        // Check this BEFORE tropics for desert regions to avoid misclassifying deserts as forests
        // Extended range to cover Gobi (35-45°N) and other higher-latitude deserts
        if (absLat >= 15 && absLat <= 45) {
            // Check if we're in known desert longitude regions
            if (this.isInDesertRegion(latitude, normalizedLon)) {
                // Coastal deserts (e.g., Atacama, coastal Sahara)
                // Inland deserts don't get coastal suffix
                return isCoastal ? 'coastal_desert' : 'desert';
            }
        }

        // Tropical and subtropical regions (within 23.5° of equator)
        // Check this AFTER desert to avoid misclassifying tropical deserts as forests
        if (absLat <= 23.5) {

            // Jungle regions (dense tropical rainforests)
            if (this.isInJungleRegion(latitude, normalizedLon)) {
                return `jungle${coastalSuffix}`;
            }

            // Savanna regions (tropical grasslands)
            if (this.isInSavannaRegion(latitude, normalizedLon)) {
                return `savanna${coastalSuffix}`;
            }

            // Northern Hemisphere tropics (Amazon, Central Africa, Southeast Asia)
            if (latitude > 0) {
                // Amazon basin (50-70° W)
                if (normalizedLon >= 290 && normalizedLon <= 310) return `forest${coastalSuffix}`;
                // Central Africa (10-30° E) - but NOT Sahara (already checked above)
                if (normalizedLon >= 10 && normalizedLon <= 30) return `forest${coastalSuffix}`;
                // South/Southeast Asia (70-120° E)
                if (normalizedLon >= 70 && normalizedLon <= 120) return `forest${coastalSuffix}`;
            }
            // Southern Hemisphere tropics
            else {
                // Congo basin (10-30° E)
                if (normalizedLon >= 10 && normalizedLon <= 30) return `forest${coastalSuffix}`;
                // Indonesia/Pacific (100-140° E)
                if (normalizedLon >= 100 && normalizedLon <= 140) return `forest${coastalSuffix}`;
            }
            // Default tropical biome
            return `forest${coastalSuffix}`;
        }

        // Temperate regions (above 23.5° up to 66.5°)
        // Urban detection for major mid-latitude cities first (Northern Hemisphere only)
        if (latitude > 0 && absLat >= 30 && absLat <= 50) {
            // North America urban corridors
            if (normalizedLon >= 235 && normalizedLon <= 290) {
                // Northeast US, West Coast, etc. - urban
                // Coastal urban areas get special designation
                return isCoastal ? 'coastal_urban' : 'urban';
            }
            // Europe urban
            if (normalizedLon >= 0 && normalizedLon <= 40) {
                return isCoastal ? 'coastal_urban' : 'urban';
            }
            // East Asia urban
            if (normalizedLon >= 110 && normalizedLon <= 145) {
                return isCoastal ? 'coastal_urban' : 'urban';
            }
        }

        // Rest of temperate regions by geography
        if (absLat > 23.5 && absLat <= 66.5) {
            // Northern Hemisphere temperate
            if (latitude > 0) {
                // Taiga (boreal forest) regions - check before other temperate biomes
                if (this.isInTaigaRegion(latitude, normalizedLon)) {
                    return `taiga${coastalSuffix}`;
                }

                // North America (70-125° W) - forests in north, plains in middle
                if (normalizedLon >= 235 && normalizedLon <= 290) {
                    return absLat >= 45 ? `forest${coastalSuffix}` : `plains${coastalSuffix}`;
                }
                // Europe (0-40° E) - forest
                if (normalizedLon >= 0 && normalizedLon <= 40) {
                    return `forest${coastalSuffix}`;
                }
                // Asia (40-180° E) - mountains in north, plains in south
                if (normalizedLon > 40 && normalizedLon <= 180) {
                    return absLat >= 50 ? `mountain${coastalSuffix}` : `plains${coastalSuffix}`;
                }
            }
            // Southern Hemisphere temperate
            else {
                // South America (40-80° W)
                if (normalizedLon >= 280 && normalizedLon <= 320) {
                    return `plains${coastalSuffix}`;
                }
                // Southern Africa (15-40° E)
                if (normalizedLon >= 15 && normalizedLon <= 40) {
                    return `plains${coastalSuffix}`;
                }
                // Australia/New Zealand (110-180° E)
                if (normalizedLon >= 110 && normalizedLon <= 180) {
                    return `plains${coastalSuffix}`;
                }
            }
        }

        // Default fallback
        return `plains${coastalSuffix}`;
    }

    /**
     * Determine biome based on elevation/altitude
     *
     * Elevation thresholds (based on common geographical classifications):
     * - High mountain: >3500m (11,500ft) - permanent snow, alpine
     * - Mountain: 1500-3500m (4,900-11,500ft) - mountain ranges
     * - High plateau: 500-1500m (1,600-4,900ft) - transitional
     * - Valley/below sea level: <0m - depressions, rift valleys
     *
     * When altitude data is valid and indicates mountain or valley terrain,
     * return the appropriate biome. Otherwise return null to fall back to
     * coordinate-based detection.
     *
     * @param altitude Altitude in meters
     * @param coastalSuffix The coastal suffix to apply if needed
     * @returns Biome string if elevation indicates mountain/valley, null otherwise
     */
    private getElevationBiome(altitude: number, coastalSuffix: string): string | null {
        // High mountains - always mountain biome
        if (altitude > 3500) {
            return `mountain${coastalSuffix}`;
        }

        // Mountain range elevation
        if (altitude > 1500) {
            return `mountain${coastalSuffix}`;
        }

        // Below sea level - valleys, depressions, rift valleys
        if (altitude < 0) {
            return `valley${coastalSuffix}`;
        }

        // For elevations between 0-1500m, fall back to coordinate-based detection
        // This includes high plateaus which could be plains, forests, or deserts
        // depending on their geographic location
        return null;
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
     * Check if coordinates fall within jungle regions (dense tropical rainforests)
     * Jungle is a subtype of forest - specifically dense tropical forests
     */
    private isInJungleRegion(lat: number, lon: number): boolean {
        const absLat = Math.abs(lat);

        // Jungles are tropical (within 15° of equator for denser vegetation)
        if (absLat > 15) return false;

        // Amazon Jungle (South America): 5°N-15°S, 50-70°W
        if (lat >= -15 && lat <= 5 && lon >= 290 && lon <= 310) return true;

        // Congo Jungle (Africa): 5°N-5°S, 10-30°E
        if (lat >= -5 && lat <= 5 && lon >= 10 && lon <= 30) return true;

        // Southeast Asian Jungles (Indonesia, Malaysia, Papua New Guinea)
        if (lat >= -10 && lat <= 10 && lon >= 95 && lon <= 140) return true;

        return false;
    }

    /**
     * Check if coordinates fall within swamp/wetland regions
     */
    private isInSwampRegion(lat: number, lon: number): boolean {
        const absLat = Math.abs(lat);

        // Florida Everglades (USA): 25-26°N, 80-81°W
        if (lat >= 25 && lat <= 26 && lon >= 279 && lon <= 281) return true;

        // Okavango Delta (Botswana): 18-20°S, 22-24°E
        if (lat >= -20 && lat <= -18 && lon >= 22 && lon <= 24) return true;

        // Sundarbans (Bangladesh/India): 21-22°N, 89-90°E
        if (lat >= 21 && lat <= 22 && lon >= 89 && lon <= 90) return true;

        // Pantanal (Brazil/Bolivia): 15-20°S, 55-60°W
        if (lat >= -20 && lat <= -15 && lon >= 300 && lon <= 305) return true;

        return false;
    }

    /**
     * Check if coordinates fall within taiga (boreal forest) regions
     * Taiga is between 50-70° latitude in northern hemisphere
     */
    private isInTaigaRegion(lat: number, lon: number): boolean {
        // Taiga only in northern hemisphere, 50-70°N
        if (lat < 50 || lat > 70) return false;

        // Canadian Taiga: 50-70°N, 60-130°W
        if (lat >= 50 && lat <= 70 && lon >= 230 && lon <= 300) return true;

        // Scandinavian Taiga: 60-70°N, 5-30°E
        if (lat >= 60 && lat <= 70 && lon >= 5 && lon <= 30) return true;

        // Russian Taiga: 55-70°N, 30-180°E
        if (lat >= 55 && lat <= 70 && lon >= 30 && lon <= 180) return true;

        return false;
    }

    /**
     * Check if coordinates fall within savanna (tropical grassland) regions
     */
    private isInSavannaRegion(lat: number, lon: number): boolean {
        const absLat = Math.abs(lat);

        // Savannas are tropical to subtropical (within 20° of equator, excluding dense jungle areas)
        if (absLat > 20) return false;

        // African Savanna (East Africa - Serengeti region): 5°S-15°N, 30-40°E
        if (lat >= -5 && lat <= 15 && lon >= 30 && lon <= 40) return true;

        // Southern African Savanna: 15-20°S, 15-35°E
        if (lat >= -20 && lat <= -15 && lon >= 15 && lon <= 35) return true;

        // South American Cerrado: 5-25°S, 45-60°W (outside Amazon jungle range)
        if (lat >= -25 && lat <= -5 && lon >= 300 && lon <= 315) return true;

        // Northern Australian Tropical Savanna: 10-20°S, 130-135°E
        if (lat >= -20 && lat <= -10 && lon >= 130 && lon <= 135) return true;

        return false;
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

    /**
     * Check if coordinates are near a coastline (coastal vs inland detection)
     * Uses heuristic patterns based on proximity to oceans and major coastlines
     *
     * This is a simplified heuristic approach. In a production system, this would use:
     * - A GIS service with coastline proximity data
     * - A pre-computed coastline database with distance calculations
     * - Or reverse geocoding to check for "ocean" in location names
     *
     * @param latitude Latitude coordinate
     * @param longitude Longitude coordinate (normalized 0-360)
     * @returns true if the location is likely coastal, false if inland
     */
    private isCoastal(latitude: number, longitude: number): boolean {
        const absLat = Math.abs(latitude);
        const lon = this.normalizeLongitude(longitude);

        // CONSERVATIVE APPROACH: Only mark obvious coastal locations
        // This avoids false positives on inland areas

        // Small islands are always coastal
        if (this.isInSmallIslandRegion(latitude, lon)) {
            return true;
        }

        // Narrow landmasses (isthmuses, peninsulas) are coastal
        if (this.isInNarrowLandmass(latitude, lon)) {
            return true;
        }

        // Polar regions are always coastal (near Arctic/Antarctic Ocean)
        if (absLat > 60) return true;

        // Major sea and gulf coasts (specific, well-defined regions)
        // Mediterranean Sea
        if (latitude > 30 && latitude < 45 && lon >= 0 && lon <= 25) return true;
        if (latitude > 30 && latitude < 40 && lon >= 25 && lon <= 35) return true;

        // Red Sea (narrow sea, so both coasts are coastal)
        if (latitude > 15 && latitude < 30 && lon >= 35 && lon <= 43) return true;

        // Persian Gulf
        if (latitude > 24 && latitude < 30 && lon >= 48 && lon <= 55) return true;

        // Black Sea
        if (latitude > 41 && latitude < 47 && lon >= 27 && lon <= 42) return true;

        // Caspian Sea (large inland sea)
        if (latitude > 36 && latitude < 47 && lon >= 46 && lon <= 55) return true;

        // Baltic Sea
        if (latitude > 53 && latitude < 66 && lon >= 15 && lon <= 30) return true;

        // North Sea
        if (latitude > 50 && latitude < 60 && lon >= 0 && lon <= 10) return true;

        // Arabian Sea (India west coast - specific latitude range)
        if (latitude > 15 && latitude < 25 && lon >= 65 && lon <= 75) return true;

        // Bay of Bengal (India east coast - specific latitude range)
        if (latitude > 15 && latitude < 23 && lon >= 80 && lon <= 90) return true;

        // Sea of Japan
        if (latitude > 35 && latitude < 43 && lon >= 130 && lon <= 142) return true;

        // South China Sea (Vietnam/Philippines coast)
        if (latitude > 10 && latitude < 25 && lon >= 105 && lon <= 122) return true;

        // Gulf of Mexico (Texas/Mexico coast)
        if (latitude > 20 && latitude < 30 && lon >= 265 && lon <= 280) return true;

        // Caribbean Sea
        if (latitude > 15 && latitude < 25 && lon >= 275 && lon <= 300) return true;

        return false;
    }

    /**
     * Check if coordinates are in a small island region
     * Small islands are always considered coastal
     */
    private isInSmallIslandRegion(lat: number, lon: number): boolean {
        // British Isles
        if (lat >= 50 && lat <= 60 && lon >= 358 && lon <= 360) return true;
        if (lat >= 50 && lat <= 60 && lon >= 0 && lon <= 10) return true;

        // Japanese archipelago
        if (lat >= 30 && lat <= 46 && lon >= 128 && lon <= 146) return true;

        // Philippines
        if (lat >= 4 && lat <= 22 && lon >= 116 && lon <= 127) return true;

        // Indonesian archipelago
        if (lat >= -10 && lat <= 6 && lon >= 94 && lon <= 142) return true;

        // New Zealand
        if (lat >= -47 && lat <= -34 && lon >= 165 && lon <= 179) return true;

        // Madagascar
        if (lat >= -26 && lat <= -12 && lon >= 43 && lon <= 51) return true;

        // Iceland
        if (lat >= 63 && lat <= 67 && lon >= 338 && lon <= 344) return true;

        // Caribbean islands (Cuba, Hispaniola, Jamaica, Puerto Rico)
        if (lat >= 10 && lat <= 23 && lon >= 275 && lon <= 300) return true;

        // Sri Lanka
        if (lat >= 5 && lat <= 10 && lon >= 79 && lon <= 82) return true;

        // Hawaiian Islands
        if (lat >= 18 && lat <= 23 && lon >= 204 && lon <= 206) return true;

        // Fiji
        if (lat >= -18 && lat <= -12 && lon >= 176 && lon <= 181) return true;

        return false;
    }

    /**
     * Check if coordinates are in a narrow landmass (isthmus or peninsula)
     * These regions are typically coastal on at least one side
     */
    private isInNarrowLandmass(lat: number, lon: number): boolean {
        // Central America (isthmus connecting North and South America)
        if (lat >= 7 && lat <= 18 && lon >= 275 && lon <= 290) return true;

        // Korean Peninsula
        if (lat >= 33 && lat <= 43 && lon >= 124 && lon <= 132) return true;

        // Italian Peninsula
        if (lat >= 36 && lat <= 47 && lon >= 8 && lon <= 19) return true;

        // Iberian Peninsula (Spain/Portugal)
        if (lat >= 36 && lat <= 44 && lon >= 358 && lon <= 360) return true;
        if (lat >= 36 && lat <= 44 && lon >= 0 && lon <= 10) return true;

        // Scandinavian Peninsula
        if (lat >= 55 && lat <= 71 && lon >= 4 && lon <= 32) return true;

        // Florida Peninsula
        if (lat >= 24 && lat <= 31 && lon >= 268 && lon <= 272) return true;

        // Alaska Peninsula
        if (lat >= 55 && lat <= 62 && lon >= 210 && lon <= 220) return true;

        // Kamchatka Peninsula
        if (lat >= 50 && lat <= 62 && lon >= 156 && lon <= 163) return true;

        return false;
    }
}
