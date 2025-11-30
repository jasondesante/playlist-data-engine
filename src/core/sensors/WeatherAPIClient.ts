import type { WeatherData } from '../types/Environmental';

export class WeatherAPIClient {
    private apiKey: string;
    private baseUrl: string = 'https://api.openweathermap.org/data/2.5/weather';

    constructor(apiKey: string = '') {
        this.apiKey = apiKey;
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

            return {
                temperature: data.main.temp,
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                weatherType: data.weather[0]?.main || 'Clear',
                windSpeed: data.wind.speed,
                windDirection: data.wind.deg,
                isNight,
                moonPhase: 0.5, // API doesn't provide moon phase in free tier, defaulting to 0.5
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Failed to fetch weather:', error);
            return null;
        }
    }
}
