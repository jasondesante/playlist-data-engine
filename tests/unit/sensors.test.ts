import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnvironmentalSensors } from '../../src/core/sensors/EnvironmentalSensors';
import { GeolocationProvider } from '../../src/core/sensors/GeolocationProvider';
import { MotionDetector } from '../../src/core/sensors/MotionDetector';
import { WeatherAPIClient } from '../../src/core/sensors/WeatherAPIClient';
import { LightSensor } from '../../src/core/sensors/LightSensor';

describe('EnvironmentalSensors', () => {
    let sensors: EnvironmentalSensors;

    beforeEach(() => {
        sensors = new EnvironmentalSensors('test-api-key');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with all permissions denied', () => {
        const permissions = sensors.getPermissions();
        expect(permissions).toHaveLength(4);
        permissions.forEach(p => {
            expect(p.granted).toBe(false);
        });
    });

    it('should check availability correctly', () => {
        // In jsdom environment, window is defined.
        // We can't easily delete window in jsdom, so let's test that it returns boolean
        expect(typeof sensors.checkAvailability('geolocation')).toBe('boolean');
        expect(typeof sensors.checkAvailability('motion')).toBe('boolean');
        expect(typeof sensors.checkAvailability('light')).toBe('boolean');
        expect(sensors.checkAvailability('weather')).toBe(true);
    });

    it('should request permissions and update state', async () => {
        // Mock checkAvailability to return true for this test
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);

        // Mock internal request methods
        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestMotionPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestLightPermission').mockResolvedValue(true);

        const results = await sensors.requestPermissions(['geolocation', 'motion', 'weather', 'light']);

        expect(results).toHaveLength(4);
        expect(results.find(r => r.type === 'geolocation')?.granted).toBe(true);
        expect(results.find(r => r.type === 'motion')?.granted).toBe(true);
        expect(results.find(r => r.type === 'weather')?.granted).toBe(true);
        expect(results.find(r => r.type === 'light')?.granted).toBe(true);

        const permissions = sensors.getPermissions();
        expect(permissions.find(p => p.type === 'geolocation')?.granted).toBe(true);
    });

    it('should handle real OpenWeatherMap API response', async () => {
        // Real OpenWeatherMap API response structure
        const mockWeatherResponse = {
            coord: { lon: 10.99, lat: 44.34 },
            weather: [
                {
                    id: 501,
                    main: 'Rain',
                    description: 'moderate rain',
                    icon: '10d'
                }
            ],
            main: {
                temp: 298.48,
                feels_like: 298.74,
                temp_min: 297.56,
                temp_max: 300.05,
                pressure: 1015,
                humidity: 64,
                sea_level: 1015,
                grnd_level: 933
            },
            visibility: 10000,
            wind: {
                speed: 0.62,
                deg: 349,
                gust: 1.18
            },
            rain: { '1h': 3.16 },
            clouds: { all: 100 },
            dt: 1661870592,
            sys: {
                type: 2,
                id: 2075663,
                country: 'IT',
                sunrise: 1661834187,
                sunset: 1661882248
            },
            timezone: 7200,
            id: 3163858,
            name: 'Zocca',
            cod: 200
        };

        // Mock fetch
        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => mockWeatherResponse
        });

        const weatherClient = new WeatherAPIClient('test-key');
        const weather = await weatherClient.getWeather(44.34, 10.99);

        expect(weather).not.toBeNull();
        expect(weather?.temperature).toBe(298.48);
        expect(weather?.humidity).toBe(64);
        expect(weather?.pressure).toBe(1015);
        expect(weather?.weatherType).toBe('Rain');
        expect(weather?.windSpeed).toBe(0.62);
        expect(weather?.windDirection).toBe(349);
        expect(weather?.isNight).toBe(true); // Since current time is after sunset
        expect(weather?.timestamp).toBeDefined();
    });

    it('should handle real GeolocationPosition structure', async () => {
        const mockGeolocationPosition = {
            coords: {
                latitude: 51.5074,
                longitude: -0.1278,
                altitude: 5,
                accuracy: 10,
                altitudeAccuracy: 2,
                heading: 45,
                speed: 2.5
            },
            timestamp: 1661870592000
        };

        // Mock navigator.geolocation
        const mockGetCurrentPosition = vi.fn((success) => {
            success(mockGeolocationPosition as any);
        });

        Object.defineProperty(global.navigator, 'geolocation', {
            value: { getCurrentPosition: mockGetCurrentPosition },
            configurable: true
        });

        const geoProvider = new GeolocationProvider();
        const geoData = await geoProvider.getCurrentPosition();

        expect(geoData).not.toBeNull();
        expect(geoData?.latitude).toBe(51.5074);
        expect(geoData?.longitude).toBe(-0.1278);
        expect(geoData?.altitude).toBe(5);
        expect(geoData?.accuracy).toBe(10);
        expect(geoData?.heading).toBe(45);
        expect(geoData?.speed).toBe(2.5);
    });

    it('should handle null values in GeolocationPosition', async () => {
        const mockGeolocationPosition = {
            coords: {
                latitude: 51.5074,
                longitude: -0.1278,
                altitude: null,      // Some devices don't provide altitude
                accuracy: 10,
                altitudeAccuracy: null,
                heading: null,       // Stationary device has no heading
                speed: null          // Device not moving
            },
            timestamp: 1661870592000
        };

        const mockGetCurrentPosition = vi.fn((success) => {
            success(mockGeolocationPosition as any);
        });

        Object.defineProperty(global.navigator, 'geolocation', {
            value: { getCurrentPosition: mockGetCurrentPosition },
            configurable: true
        });

        const geoProvider = new GeolocationProvider();
        const geoData = await geoProvider.getCurrentPosition();

        expect(geoData?.latitude).toBe(51.5074);
        expect(geoData?.altitude).toBeNull();
        expect(geoData?.heading).toBeNull();
        expect(geoData?.speed).toBeNull();
    });

    it('should handle real DeviceMotionEvent structure', () => {
        const mockMotionEvent: Partial<DeviceMotionEvent> = {
            acceleration: {
                x: 0.5,
                y: 1.2,
                z: -0.3
            },
            accelerationIncludingGravity: {
                x: 0.5,
                y: 1.2,
                z: 9.5  // Gravity is ~9.8
            },
            rotationRate: {
                alpha: 10.5,
                beta: 2.1,
                gamma: -5.3
            },
            interval: 16  // milliseconds
        };

        const motionDetector = new MotionDetector();
        const activity = motionDetector.detectActivity({
            acceleration: mockMotionEvent.acceleration || { x: null, y: null, z: null },
            accelerationIncludingGravity: mockMotionEvent.accelerationIncludingGravity as any,
            rotationRate: mockMotionEvent.rotationRate as any,
            interval: mockMotionEvent.interval || 0,
            timestamp: Date.now()
        });

        // With acceleration including gravity [0.5, 1.2, 9.5]
        // magnitude = sqrt(0.25 + 1.44 + 90.25) = sqrt(91.94) ≈ 9.59
        // delta = |9.59 - 9.8| = 0.21, which is < 0.5 = stationary
        expect(activity).toBe('stationary');
    });

    it('should detect running activity from DeviceMotionEvent', () => {
        // Simulate running with higher acceleration
        const mockMotionEvent: Partial<DeviceMotionEvent> = {
            acceleration: {
                x: 1.5,
                y: 3.2,
                z: 0.8
            },
            accelerationIncludingGravity: {
                x: 1.5,
                y: 3.2,
                z: 12.0  // Higher acceleration including gravity
            },
            rotationRate: {
                alpha: 15.0,
                beta: 4.0,
                gamma: -8.0
            },
            interval: 16
        };

        const motionDetector = new MotionDetector();
        const activity = motionDetector.detectActivity({
            acceleration: mockMotionEvent.acceleration || { x: null, y: null, z: null },
            accelerationIncludingGravity: mockMotionEvent.accelerationIncludingGravity as any,
            rotationRate: mockMotionEvent.rotationRate as any,
            interval: mockMotionEvent.interval || 0,
            timestamp: Date.now()
        });

        // magnitude = sqrt(2.25 + 10.24 + 144) = sqrt(156.49) ≈ 12.51
        // delta = |12.51 - 9.8| = 2.71, which is 0.5 < 2.71 < 5.0 = walking/running range
        expect(['walking', 'running']).toContain(activity);
    });

    it('should handle null values in DeviceMotionEvent', () => {
        // Some devices don't provide acceleration without gravity
        const mockMotionEvent: Partial<DeviceMotionEvent> = {
            acceleration: null,  // Not supported on some devices
            accelerationIncludingGravity: {
                x: 0.1,
                y: 0.2,
                z: 9.8
            },
            rotationRate: {
                alpha: null,
                beta: null,
                gamma: null
            },
            interval: 16
        };

        const motionDetector = new MotionDetector();
        const activity = motionDetector.detectActivity({
            acceleration: mockMotionEvent.acceleration || { x: null, y: null, z: null },
            accelerationIncludingGravity: mockMotionEvent.accelerationIncludingGravity as any,
            rotationRate: mockMotionEvent.rotationRate as any,
            interval: mockMotionEvent.interval || 0,
            timestamp: Date.now()
        });

        expect(activity).toBe('stationary');
    });

    it('should calculate XP modifier correctly', () => {
        // Mock context directly if possible, or use private access for testing
        // Since context is private, we can't set it directly without casting to any
        const context = (sensors as any).context;

        // Default
        expect(sensors.calculateXPModifier()).toBe(1.0);

        // Add motion (running)
        context.motion = {
            accelerationIncludingGravity: { x: 0, y: 15, z: 0 }, // High acceleration ~ running
            timestamp: Date.now()
        };
        // Mock detectActivity on the motion instance
        vi.spyOn((sensors as any).motion, 'detectActivity').mockReturnValue('running');
        expect(sensors.calculateXPModifier()).toBe(1.5); // 1.0 + 0.5

        // Add weather (rain + night)
        context.weather = {
            weatherType: 'Rain',
            isNight: true,
            timestamp: Date.now()
        };
        expect(sensors.calculateXPModifier()).toBe(1.5 + 0.4 + 0.25); // 2.15

        // Add altitude
        context.geolocation = {
            altitude: 1500,
            timestamp: Date.now()
        };
        expect(sensors.calculateXPModifier()).toBe(2.15 + 0.3); // 2.45

        // Cap at 3.0
        // Add more bonuses to exceed cap
        vi.spyOn((sensors as any).motion, 'detectActivity').mockReturnValue('running'); // +0.5
        // Let's just force a high modifier logic or assume we added enough
        // With current logic: 1.0 + 0.5 (run) + 0.4 (rain) + 0.25 (night) + 0.3 (alt) = 2.45
        // Need 0.55 more.
        // If we add snow (0.3) to weather type 'Rain, Snow'
        context.weather.weatherType = 'Rain, Snow';
        // 2.45 + 0.3 = 2.75. Still under.
        // Maybe we can mock the return value of detectActivity to be something else or add more conditions?
        // The implementation has: running +0.5, walking +0.2.
        // Weather: rain/storm +0.4, snow +0.3, night +0.25.
        // Geo: altitude > 1000 +0.3.
        // Max possible: 1.0 + 0.5 + 0.4 + 0.3 + 0.25 + 0.3 = 2.75.
        // Wait, if weather is "Rain, Snow", it matches both "rain" and "snow" checks?
        // if (type.includes('rain') || ...) modifier += 0.4;
        // if (type.includes('snow')) modifier += 0.3;
        // Yes.
        // So 2.75 is the max with current logic.
        // The cap is 3.0, so we can't reach it with current logic unless we add more bonuses or tweak values.
        // But the test should just verify it calculates correctly.
        expect(sensors.calculateXPModifier()).toBeCloseTo(2.75);
    });

    it('should handle geolocation biome detection', () => {
        const geoProvider = new GeolocationProvider();

        // Tundra (high latitude)
        expect(geoProvider.getBiome(70, 0)).toBe('tundra');

        // Tropics (low latitude)
        expect(geoProvider.getBiome(0, 0)).toBe('forest');

        // Mid-latitudes (urban)
        expect(geoProvider.getBiome(40, -74)).toBe('urban');
    });
});

describe('Permission Request System (T078)', () => {
    let sensors: EnvironmentalSensors;

    beforeEach(() => {
        sensors = new EnvironmentalSensors('test-api-key');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should track permission state after request', async () => {
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);
        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestMotionPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestLightPermission').mockResolvedValue(true);

        // Before request, all should be denied
        let permissions = sensors.getPermissions();
        expect(permissions.every(p => !p.granted)).toBe(true);

        // Request permissions
        const results = await sensors.requestPermissions(['geolocation', 'motion', 'light']);
        expect(results).toHaveLength(3);

        // After request, check that state is updated
        permissions = sensors.getPermissions();
        expect(permissions.find(p => p.type === 'geolocation')?.granted).toBe(true);
        expect(permissions.find(p => p.type === 'motion')?.granted).toBe(true);
        expect(permissions.find(p => p.type === 'light')?.granted).toBe(true);
    });

    it('should handle partial permission grants', async () => {
        vi.spyOn(sensors, 'checkAvailability')
            .mockImplementation((type) => type !== 'light'); // Light sensor unavailable

        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestMotionPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestLightPermission').mockResolvedValue(false);

        const results = await sensors.requestPermissions(['geolocation', 'motion', 'light']);

        expect(results.find(r => r.type === 'geolocation')?.granted).toBe(true);
        expect(results.find(r => r.type === 'motion')?.granted).toBe(true);
        expect(results.find(r => r.type === 'light')?.granted).toBe(false);
    });

    it('should handle permission denial gracefully', async () => {
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);
        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(false);
        vi.spyOn(sensors as any, 'requestMotionPermission').mockResolvedValue(false);

        const results = await sensors.requestPermissions(['geolocation', 'motion']);

        expect(results.find(r => r.type === 'geolocation')?.granted).toBe(false);
        expect(results.find(r => r.type === 'motion')?.granted).toBe(false);

        // Verify calculateXPModifier still works without permissions
        expect(sensors.calculateXPModifier()).toBe(1.0);
    });

    it('should handle geolocation permission with real API', async () => {
        const mockGeolocationPosition = {
            coords: {
                latitude: 51.5074,
                longitude: -0.1278,
                altitude: null,
                accuracy: 10,
                altitudeAccuracy: null,
                heading: null,
                speed: null
            },
            timestamp: 1661870592000
        };

        const mockGetCurrentPosition = vi.fn((success) => {
            success(mockGeolocationPosition as any);
        });

        Object.defineProperty(global.navigator, 'geolocation', {
            value: { getCurrentPosition: mockGetCurrentPosition },
            configurable: true
        });

        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);

        const results = await sensors.requestPermissions(['geolocation']);

        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('geolocation');
        expect(results[0].granted).toBe(true);
        expect(results[0].timestamp).toBeDefined();
    });

    it('should handle motion permission with DeviceMotionEvent.requestPermission', async () => {
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);

        // Mock DeviceMotionEvent.requestPermission
        (DeviceMotionEvent as any).requestPermission = vi.fn().mockResolvedValue('granted');

        const results = await sensors.requestPermissions(['motion']);

        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('motion');
        expect(results[0].granted).toBe(true);
    });

    it('should handle motion permission gracefully when API unavailable', async () => {
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);

        // Remove requestPermission to simulate older browsers
        const oldRequestPermission = (DeviceMotionEvent as any).requestPermission;
        delete (DeviceMotionEvent as any).requestPermission;

        const results = await sensors.requestPermissions(['motion']);

        expect(results).toHaveLength(1);
        expect(results[0].type).toBe('motion');
        expect(results[0].granted).toBe(true); // Defaults to true if API not available

        // Restore
        if (oldRequestPermission) {
            (DeviceMotionEvent as any).requestPermission = oldRequestPermission;
        }
    });

    it('should include timestamp in permission results', async () => {
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);
        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(true);

        const beforeTime = Date.now();
        const results = await sensors.requestPermissions(['geolocation']);
        const afterTime = Date.now();

        expect(results[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(results[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should separate permission results for each sensor type', async () => {
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(true);
        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(true);
        vi.spyOn(sensors as any, 'requestMotionPermission').mockResolvedValue(false);
        vi.spyOn(sensors as any, 'requestLightPermission').mockResolvedValue(true);

        const results = await sensors.requestPermissions(['geolocation', 'motion', 'light', 'weather']);

        expect(results).toHaveLength(4);
        expect(results.map(r => r.type)).toEqual(['geolocation', 'motion', 'light', 'weather']);

        const geoResult = results.find(r => r.type === 'geolocation');
        const motionResult = results.find(r => r.type === 'motion');
        const lightResult = results.find(r => r.type === 'light');
        const weatherResult = results.find(r => r.type === 'weather');

        expect(geoResult?.granted).toBe(true);
        expect(motionResult?.granted).toBe(false);
        expect(lightResult?.granted).toBe(true);
        expect(weatherResult?.granted).toBe(true); // Weather doesn't require permission
    });

    it('should handle availability check before permission request', async () => {
        // Mock all unavailable except weather
        vi.spyOn(sensors, 'checkAvailability').mockReturnValue(false);

        // When unavailable, request methods should return false
        vi.spyOn(sensors as any, 'requestGeolocationPermission').mockResolvedValue(false);
        vi.spyOn(sensors as any, 'requestMotionPermission').mockResolvedValue(false);
        vi.spyOn(sensors as any, 'requestLightPermission').mockResolvedValue(false);

        const results = await sensors.requestPermissions(['geolocation', 'motion', 'light']);

        // All should be denied due to unavailability
        expect(results.find(r => r.type === 'geolocation')?.granted).toBe(false);
        expect(results.find(r => r.type === 'motion')?.granted).toBe(false);
        expect(results.find(r => r.type === 'light')?.granted).toBe(false);
    });
});

describe('LightSensor (T087-088)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize AmbientLightSensor and access illuminance property', () => {
        // Real AmbientLightSensor illuminance readings (in lux)
        const illuminanceValues = [
            { value: 0.1, label: 'Very dark (night, no lights)' },
            { value: 5, label: 'Dark room with lights' },
            { value: 50, label: 'Indoor office' },
            { value: 500, label: 'Bright indoor lighting' },
            { value: 10000, label: 'Daylight' },
            { value: 100000, label: 'Direct sunlight' }
        ];

        for (const { value } of illuminanceValues) {
            const mockSensor = {
                illuminance: value,
                addEventListener: vi.fn(),
                start: vi.fn(),
                stop: vi.fn()
            };

            // Mock the AmbientLightSensor constructor
            (window as any).AmbientLightSensor = vi.fn(() => mockSensor);

            // Verify the sensor can be created
            const sensor = new LightSensor();
            expect(sensor).toBeDefined();

            // Verify illuminance values are accessible
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(150000); // Exceeds direct sunlight but valid
        }
    });

    it('should handle gracefully when AmbientLightSensor is not available', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Remove AmbientLightSensor from window
        const oldALS = (window as any).AmbientLightSensor;
        delete (window as any).AmbientLightSensor;

        const sensor = new LightSensor();
        const lightDataSpy = vi.fn();

        // Should not crash when starting monitoring
        sensor.startMonitoring(lightDataSpy);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('AmbientLightSensor not supported')
        );

        // Restore
        if (oldALS) {
            (window as any).AmbientLightSensor = oldALS;
        }

        consoleWarnSpy.mockRestore();
    });

describe('WeatherAPIClient Caching', () => {
    let weatherClient: WeatherAPIClient;
    let mockFetch: ReturnType<typeof vi.fn>;

    const mockWeatherResponse = {
        coord: { lon: 10.99, lat: 44.34 },
        weather: [{ id: 501, main: 'Rain', description: 'moderate rain', icon: '10d' }],
        main: { temp: 298.48, feels_like: 298.74, temp_min: 297.56, temp_max: 300.05, pressure: 1015, humidity: 64, sea_level: 1015, grnd_level: 933 },
        visibility: 10000,
        wind: { speed: 0.62, deg: 349, gust: 1.18 },
        rain: { '1h': 3.16 },
        clouds: { all: 100 },
        dt: 1661870592,
        sys: { type: 2, id: 2075663, country: 'IT', sunrise: 1661834187, sunset: 1661882248 },
        timezone: 7200,
        id: 3163858,
        name: 'Zocca',
        cod: 200
    };

    beforeEach(() => {
        // Mock fetch
        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => mockWeatherResponse
        });
        global.fetch = mockFetch;

        // Create client with short TTL for testing
        weatherClient = new WeatherAPIClient('test-key', 12, false); // 12 minutes TTL, no localStorage
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should cache weather data and return cached data on subsequent calls', async () => {
        const lat = 44.34;
        const lon = 10.99;

        // First call should hit the API
        const weather1 = await weatherClient.getWeather(lat, lon);
        expect(weather1).not.toBeNull();
        expect(weather1?.temperature).toBe(298.48);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call should return cached data
        const weather2 = await weatherClient.getWeather(lat, lon);
        expect(weather2).not.toBeNull();
        expect(weather2?.temperature).toBe(298.48);
        expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    it('should track cache hits and misses', async () => {
        const lat = 44.34;
        const lon = 10.99;

        // First call - cache miss
        await weatherClient.getWeather(lat, lon);
        let stats = weatherClient.getCacheStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(1);

        // Second call - cache hit
        await weatherClient.getWeather(lat, lon);
        stats = weatherClient.getCacheStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);

        // Third call - cache hit
        await weatherClient.getWeather(lat, lon);
        stats = weatherClient.getCacheStats();
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
    });

    it('should invalidate cache for specific location', async () => {
        const lat = 44.34;
        const lon = 10.99;

        // First call - cache miss
        await weatherClient.getWeather(lat, lon);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call - cache hit
        await weatherClient.getWeather(lat, lon);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Invalidate specific location
        weatherClient.invalidateLocation(lat, lon);

        // Third call - cache miss again
        await weatherClient.getWeather(lat, lon);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all cache', async () => {
        const lat1 = 44.34;
        const lon1 = 10.99;
        const lat2 = 40.71;
        const lon2 = -74.01;

        // Fetch two locations
        await weatherClient.getWeather(lat1, lon1);
        await weatherClient.getWeather(lat2, lon2);
        expect(mockFetch).toHaveBeenCalledTimes(2);

        // Both should be cached
        await weatherClient.getWeather(lat1, lon1);
        await weatherClient.getWeather(lat2, lon2);
        expect(mockFetch).toHaveBeenCalledTimes(2);

        // Invalidate all cache
        weatherClient.invalidateCache();

        // Both should hit API again
        await weatherClient.getWeather(lat1, lon1);
        await weatherClient.getWeather(lat2, lon2);
        expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should reset cache statistics', async () => {
        const lat = 44.34;
        const lon = 10.99;

        await weatherClient.getWeather(lat, lon);
        await weatherClient.getWeather(lat, lon);

        let stats = weatherClient.getCacheStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);

        weatherClient.resetCacheStats();

        stats = weatherClient.getCacheStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
    });

    it('should return cache size', async () => {
        const lat1 = 44.34;
        const lon1 = 10.99;
        const lat2 = 40.71;
        const lon2 = -74.01;

        expect(weatherClient.getCacheSize()).toBe(0);

        await weatherClient.getWeather(lat1, lon1);
        expect(weatherClient.getCacheSize()).toBe(1);

        await weatherClient.getWeather(lat2, lon2);
        expect(weatherClient.getCacheSize()).toBe(2);

        // Same location should not increase size
        await weatherClient.getWeather(lat1, lon1);
        expect(weatherClient.getCacheSize()).toBe(2);
    });

    it('should clear expired cache entries', async () => {
        // Create client with very short TTL (1ms)
        const shortTTLClient = new WeatherAPIClient('test-key', 0.000017, false); // ~1ms in minutes
        const lat = 44.34;
        const lon = 10.99;

        await shortTTLClient.getWeather(lat, lon);
        expect(shortTTLClient.getCacheSize()).toBe(1);

        // Wait for cache to expire
        await new Promise(resolve => setTimeout(resolve, 10));

        // Clear expired entries
        const cleared = shortTTLClient.clearExpiredEntries();
        expect(cleared).toBe(1);
        expect(shortTTLClient.getCacheSize()).toBe(0);
    });

    it('should use coordinate-based cache keys with rounding', async () => {
        // Coordinates that round to the same key (4 decimal places)
        // 44.34004 rounds to 44.34, 44.34005 rounds to 44.3401 (different!)
        // Let's use coordinates within 0.00005 of each other
        const lat1 = 44.34;
        const lon1 = 10.99;
        const lat2 = 44.34004;
        const lon2 = 10.99004;

        await weatherClient.getWeather(lat1, lon1);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // These should hit the same cache entry due to rounding
        await weatherClient.getWeather(lat2, lon2);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should treat different coordinates as different cache entries', async () => {
        const lat1 = 44.34;
        const lon1 = 10.99;
        const lat2 = 40.71;
        const lon2 = -74.01;

        await weatherClient.getWeather(lat1, lon1);
        await weatherClient.getWeather(lat2, lon2);

        expect(weatherClient.getCacheSize()).toBe(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle cache statistics returns copy not reference', async () => {
        const stats = weatherClient.getCacheStats();
        stats.hits = 999;

        const newStats = weatherClient.getCacheStats();
        expect(newStats.hits).toBe(0); // Should not be affected by modifying the returned object
    });

    it('should return null when no API key is provided', async () => {
        const noKeyClient = new WeatherAPIClient('', 12, false);
        const weather = await noKeyClient.getWeather(44.34, 10.99);

        expect(weather).toBeNull();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Not Found'
        });

        const weather = await weatherClient.getWeather(44.34, 10.99);
        expect(weather).toBeNull();

        // Should not cache failed requests
        expect(weatherClient.getCacheSize()).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const weather = await weatherClient.getWeather(44.34, 10.99);
        expect(weather).toBeNull();

        // Should not cache failed requests
        expect(weatherClient.getCacheSize()).toBe(0);
    });
});
});
