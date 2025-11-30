import type { GeolocationData } from '../types/Environmental';

export class GeolocationProvider {
    /**
     * Get the current position using the Geolocation API
     * @returns Promise resolving to GeolocationData or null if failed/denied
     */
    async getCurrentPosition(): Promise<GeolocationData | null> {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return null;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        altitude: position.coords.altitude,
                        accuracy: position.coords.accuracy,
                        heading: position.coords.heading,
                        speed: position.coords.speed,
                        timestamp: position.timestamp
                    });
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
     * Calculate the biome based on coordinates (simplified logic)
     * In a real app, this would query a GIS service or use a sophisticated map.
     * Here we use simple latitude/longitude heuristics for demonstration.
     */
    getBiome(latitude: number, longitude: number): string {
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
