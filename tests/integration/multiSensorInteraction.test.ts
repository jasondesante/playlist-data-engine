/**
 * Multi-Sensor Interaction Integration Tests
 *
 * Tests complex interactions between multiple sensors including:
 * - Inter-dependent sensor data (weather depends on geolocation)
 * - Cross-sensor cascading failures
 * - Sensor priority and override behavior
 * - Concurrent sensor operations
 * - Cross-sensor data consistency
 *
 * Covers Task 11.4: Add tests for multi-sensor interaction
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvironmentalSensors } from '../../src/core/sensors/EnvironmentalSensors';
import type { MotionData, WeatherData, GeolocationData } from '../../src/core/types/Environmental';

// Helper functions to create mock sensor data
const createMockGeoData = (overrides = {}): GeolocationData => ({
  latitude: 40.7128,
  longitude: -74.0060,
  altitude: 10,
  accuracy: 10,
  heading: null,
  speed: null,
  timestamp: Date.now(),
  ...overrides
});

const createMockWeatherData = (overrides = {}): WeatherData => ({
  temperature: 20,
  humidity: 60,
  pressure: 1015,
  weatherType: 'clear',
  windSpeed: 5,
  windDirection: 0,
  isNight: false,
  moonPhase: 0.5,
  timestamp: Date.now(),
  ...overrides
});

const createMockMotionData = (overrides = {}): MotionData => ({
  acceleration: { x: 0.1, y: 0.1, z: 0.1 },
  accelerationIncludingGravity: { x: 9.8, y: 9.8, z: 9.8 },
  rotationRate: { alpha: null, beta: null, gamma: null },
  interval: 100,
  timestamp: Date.now(),
  ...overrides
});

describe('Multi-Sensor Interaction Tests (Task 11.4)', () => {
  let sensors: EnvironmentalSensors;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Use custom retry config for faster tests
    sensors = new EnvironmentalSensors('test-weather-api-key', {
      maxRetries: 1,           // Only 1 retry for faster tests
      initialDelayMs: 10,      // 10ms delay instead of 1000ms
      maxDelayMs: 50,          // 50ms max delay
      backoffMultiplier: 2
    });
  });

  afterEach(() => {
    sensors?.stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('Inter-Dependent Sensor Data', () => {
    it('should skip weather API call when geolocation fails', async () => {
      // Weather API depends on geolocation coordinates
      // When geolocation fails, weather should use last known good (undefined on first run)

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      const geoSpy = vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockRejectedValue(new Error('Geolocation failed'));

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      await sensors.updateSnapshot();

      // Geolocation should have been attempted
      expect(geoSpy).toHaveBeenCalled();

      // Without geolocation, weather should not be fetched
      const context = (sensors as any).context;
      // Geolocation is undefined (not set) when it fails
      expect(context.geolocation).toBeUndefined();
      expect(context.weather).toBeUndefined();
    });

    it('should use cached geolocation for weather when available', async () => {
      // First call: both geo and weather succeed
      const mockGeoData = createMockGeoData({ latitude: 51.5074, longitude: -0.1278 });
      const mockWeatherData = createMockWeatherData({ temperature: 15, weatherType: 'rain' });

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);

      // First call - both succeed
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValueOnce(mockGeoData)
        .mockRejectedValueOnce(new Error('Second geo call fails'));

      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      // First update - both succeed
      const context1 = await sensors.updateSnapshot();
      expect(context1.geolocation?.latitude).toBe(51.5074);
      expect(context1.weather?.temperature).toBe(15);

      // Second update - geo fails but weather should still work with cached geo
      const context2 = await sensors.updateSnapshot();
      // Should have last known good geolocation
      expect(context2.geolocation?.latitude).toBe(51.5074);
      // Weather should still be fetched using cached coordinates
      expect(context2.weather?.temperature).toBe(15);
    });

    it('should calculate biome using geolocation data', async () => {
      // Biome is calculated from geolocation coordinates
      // This tests the interaction between geolocation sensor and biome calculation

      const mockGeoData = createMockGeoData({ latitude: 70, longitude: 0 }); // Arctic

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      (sensors as any).permissions.set('geolocation', true);

      await sensors.updateSnapshot();

      const context = (sensors as any).context;
      expect(context.geolocation?.latitude).toBe(70);
      expect(context.biome).toBe('tundra_coastal'); // Polar region
    });
  });

  describe('Cross-Sensor Cascading Failures', () => {
    it('should maintain partial sensor data when other sensors fail', async () => {
      // Motion succeeds, geolocation succeeds, weather fails
      // Should still have motion and geo data available

      const mockGeoData = createMockGeoData();
      const mockMotionData = createMockMotionData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      // Mock fetch to avoid actual HTTP calls - weather will fail with 401 Unauthorized
      global.fetch = vi.fn().mockRejectedValue(new Error('Weather API timeout')) as any;
      vi.spyOn((sensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);
      (sensors as any).permissions.set('motion', true);

      sensors.startMonitoring();

      // Use shorter timeout for this test
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), 2000)
      );

      // Race between updateSnapshot and timeout
      await Promise.race([
        sensors.updateSnapshot(),
        timeoutPromise
      ]).catch(() => {
        // Timeout is expected for weather failures with retries
        // The important part is that geo and motion data are still available
      });

      const context = (sensors as any).context;

      // Motion and geolocation should be available
      expect(context.motion).toBeDefined();
      expect(context.geolocation).toBeDefined();

      // Weather may be null after failure
      // But XP calculation should still work with available sensors
      const xpModifier = sensors.calculateXPModifier();
      expect(xpModifier).toBeGreaterThanOrEqual(1.0);
    });

    it('should recover individual sensors without affecting others', async () => {
      // Weather fails initially, then recovers
      // Geolocation remains healthy throughout

      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      let weatherCallCount = 0;
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockImplementation(async () => {
          weatherCallCount++;
          // Fail first 2 calls (1 original + 1 retry = 2 consecutive failures → degraded)
          // Then succeed
          if (weatherCallCount <= 2) {
            throw new Error('Weather API temporarily unavailable');
          }
          return mockWeatherData;
        });

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      // First update - weather fails (with retry), status should be degraded
      await sensors.updateSnapshot();
      let weatherStatus = sensors.getSensorStatus('weather');
      // With maxRetries: 1, 2 consecutive failures → degraded
      expect(weatherStatus?.health).toBe('degraded');

      // Second update - weather recovers
      await sensors.updateSnapshot();
      weatherStatus = sensors.getSensorStatus('weather');
      expect(weatherStatus?.health).toBe('healthy'); // Recovered

      // Geolocation should have remained healthy throughout
      const geoStatus = sensors.getSensorStatus('geolocation');
      expect(geoStatus?.health).toBe('healthy');
    });
  });

  describe('Sensor Priority and Override Behavior', () => {
    it('should prioritize current sensor data over last known good', async () => {
      // First call: get baseline data
      const initialGeo = createMockGeoData({ latitude: 40.7128, longitude: -74.0060 });
      const initialWeather = createMockWeatherData({ temperature: 20, weatherType: 'clear' });

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValueOnce(initialGeo)
        .mockResolvedValueOnce(createMockGeoData({ latitude: 51.5074, longitude: -0.1278 })); // Different location

      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockResolvedValue(initialWeather);

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      // First snapshot
      await sensors.updateSnapshot();
      const context1 = (sensors as any).context;
      expect(context1.geolocation?.latitude).toBe(40.7128);

      // Second snapshot with different location
      await sensors.updateSnapshot();
      const context2 = (sensors as any).context;

      // Should use current data, not last known good
      expect(context2.geolocation?.latitude).toBe(51.5074);
      expect(context2.geolocation?.longitude).toBe(-0.1278);
    });

    it('should use last known good when current sensor fails', async () => {
      const mockGeoData = createMockGeoData({ latitude: 35.6762, longitude: 139.6503 }); // Tokyo

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);

      // Use mockImplementation to ensure complete control over behavior
      let callCount = 0;
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(mockGeoData);
          } else {
            return Promise.reject(new Error('GPS unavailable'));
          }
        });

      (sensors as any).permissions.set('geolocation', true);

      // First snapshot succeeds
      await sensors.updateSnapshot();
      const context1 = (sensors as any).context;
      expect(context1.geolocation?.latitude).toBe(35.6762);

      // Second snapshot fails - should use last known good
      await sensors.updateSnapshot();
      const context2 = (sensors as any).context;
      expect(context2.geolocation?.latitude).toBe(35.6762); // Same as first
    });

    it('should handle elevation override in biome detection', async () => {
      // Test that elevation (from geolocation) overrides coordinate-based biome detection

      const mockGeoLowAltitude = createMockGeoData({
        latitude: 40,
        longitude: -105,
        altitude: 100 // Low altitude - should be urban by coordinates
      });

      const mockGeoHighAltitude = createMockGeoData({
        latitude: 40,
        longitude: -105,
        altitude: 2000 // High altitude - should be mountain despite coordinates
      });

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValueOnce(mockGeoLowAltitude)
        .mockResolvedValueOnce(mockGeoHighAltitude);

      (sensors as any).permissions.set('geolocation', true);

      // First snapshot - low altitude
      await sensors.updateSnapshot();
      const context1 = (sensors as any).context;
      expect(context1.biome).toBe('urban'); // Urban by coordinates

      // Second snapshot - high altitude
      await sensors.updateSnapshot();
      const context2 = (sensors as any).context;
      expect(context2.biome).toBe('mountain'); // Mountain overrides coordinates
    });
  });

  describe('Concurrent Sensor Operations', () => {
    it('should handle rapid successive sensor updates', async () => {
      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      let geoCallCount = 0;
      let weatherCallCount = 0;

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockImplementation(async () => {
          geoCallCount++;
          // Simulate slight delay
          await new Promise(resolve => setTimeout(resolve, 10));
          return mockGeoData;
        });

      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockImplementation(async () => {
          weatherCallCount++;
          await new Promise(resolve => setTimeout(resolve, 5));
          return mockWeatherData;
        });

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      // Trigger multiple concurrent updates
      const promises = [
        sensors.updateSnapshot(),
        sensors.updateSnapshot(),
        sensors.updateSnapshot()
      ];

      await Promise.all(promises);

      // All calls should complete successfully
      expect(geoCallCount).toBe(3);
      expect(weatherCallCount).toBe(3);

      const context = (sensors as any).context;
      expect(context.geolocation).toBeDefined();
      expect(context.weather).toBeDefined();
    });

    it('should not corrupt context when sensors update simultaneously', async () => {
      const mockMotionData = createMockMotionData();
      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);
      vi.spyOn((sensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => {
          // Simulate rapid motion updates
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              callback(mockMotionData);
            }, i * 10);
          }
        });

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);
      (sensors as any).permissions.set('motion', true);

      sensors.startMonitoring();

      // Trigger concurrent updates
      await Promise.all([
        sensors.updateSnapshot(),
        sensors.updateSnapshot()
      ]);

      // Wait for motion updates to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const context = (sensors as any).context;

      // All sensor data should be present and consistent
      expect(context.geolocation).toBeDefined();
      expect(context.weather).toBeDefined();
      expect(context.motion).toBeDefined();
      expect(context.timestamp).toBeGreaterThan(0);

      // XP modifier should be calculable
      const xpModifier = sensors.calculateXPModifier();
      expect(xpModifier).toBeGreaterThanOrEqual(1.0);
      expect(xpModifier).toBeLessThanOrEqual(3.0);
    });
  });

  describe('Cross-Sensor Data Consistency', () => {
    it('should maintain consistent timestamps across sensor updates', async () => {
      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      const beforeUpdate = Date.now();
      await sensors.updateSnapshot();
      const afterUpdate = Date.now();

      const context = (sensors as any).context;

      // Context timestamp should be between before and after
      expect(context.timestamp).toBeGreaterThanOrEqual(beforeUpdate);
      expect(context.timestamp).toBeLessThanOrEqual(afterUpdate);

      // Individual sensor timestamps should also be reasonable
      if (context.geolocation) {
        expect(context.geolocation.timestamp).toBeGreaterThan(0);
      }
      if (context.weather) {
        expect(context.weather.timestamp).toBeGreaterThan(0);
      }
    });

    it('should handle sensor data with conflicting time values', async () => {
      // Test when sensors return data with different timestamps
      // The context timestamp should reflect the most recent update

      const oldTimestamp = Date.now() - 10000; // 10 seconds ago
      const newTimestamp = Date.now();

      const mockGeoData = createMockGeoData({ timestamp: oldTimestamp });
      const mockWeatherData = createMockWeatherData({ timestamp: newTimestamp });

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      await sensors.updateSnapshot();

      const context = (sensors as any).context;

      // Context timestamp should be recent (when updateSnapshot was called)
      expect(context.timestamp).toBeGreaterThanOrEqual(newTimestamp - 100);

      // Individual sensor timestamps should reflect when they were collected
      expect(context.geolocation?.timestamp).toBe(oldTimestamp);
      expect(context.weather?.timestamp).toBe(newTimestamp);
    });
  });

  describe('Multi-Sensor XP Modifier Calculation', () => {
    it('should correctly combine all sensor data for XP calculation', async () => {
      // Create a scenario with maximum environmental bonuses:
      // - Running (motion)
      // - Rain at night (weather)
      // - High altitude (geolocation)

      const mockGeoData = createMockGeoData({
        latitude: 39.7392, // Denver
        longitude: -104.9903,
        altitude: 1600 // High altitude
      });

      const mockWeatherData = createMockWeatherData({
        temperature: 10,
        humidity: 80,
        pressure: 1000,
        weatherType: 'rain',
        isNight: true
      });

      const mockMotionData = createMockMotionData({
        accelerationIncludingGravity: { x: 12, y: 11, z: 13 } // Running
      });

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);
      vi.spyOn((sensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));
      vi.spyOn((sensors as any).motion, 'detectActivity')
        .mockReturnValue('running');

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);
      (sensors as any).permissions.set('motion', true);

      sensors.startMonitoring();
      await sensors.updateSnapshot();

      const xpModifier = sensors.calculateXPModifier();

      // Expected: 1.0 + 0.5 (running) + 0.4 (rain) + 0.25 (night) + 0.3 (altitude) = 2.45
      expect(xpModifier).toBeCloseTo(2.45, 1);
      expect(xpModifier).toBeLessThanOrEqual(3.0); // Should respect cap
    });

    it('should calculate XP with partial sensor data', async () => {
      // Only some sensors are available
      // Test that XP calculation gracefully handles missing data

      const mockGeoData = createMockGeoData({ altitude: 50 }); // Low altitude, no bonus
      const mockMotionData = createMockMotionData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((sensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('motion', true);
      // Weather permission NOT granted

      sensors.startMonitoring();
      await sensors.updateSnapshot();

      const xpModifier = sensors.calculateXPModifier();

      // Should work with available data (motion + geolocation)
      expect(xpModifier).toBeGreaterThanOrEqual(1.0);
      expect(xpModifier).toBeLessThanOrEqual(3.0);
    });
  });

  describe('Sensor Health Monitoring Across Multiple Sensors', () => {
    it('should track health status for all sensors independently', async () => {
      const mockGeoData = createMockGeoData();
      const mockMotionData = createMockMotionData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockRejectedValue(new Error('Weather fails'));
      vi.spyOn((sensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);
      (sensors as any).permissions.set('motion', true);

      sensors.startMonitoring();
      await sensors.updateSnapshot();

      const allStatuses = sensors.getAllSensorStatuses();

      // Should have status for all sensor types
      expect(allStatuses.length).toBe(4);
      const sensorTypes = allStatuses.map(s => s.type).sort();
      expect(sensorTypes).toEqual(['geolocation', 'light', 'motion', 'weather']);

      // Health statuses should be independent
      const geoStatus = sensors.getSensorStatus('geolocation');
      const weatherStatus = sensors.getSensorStatus('weather');
      const motionStatus = sensors.getSensorStatus('motion');

      expect(geoStatus?.health).toBe('healthy');
      expect(weatherStatus?.health).toBe('failed'); // Failed after retries
      expect(motionStatus?.health).toBe('healthy');
    });

    it('should provide diagnostics covering all sensors', async () => {
      const mockGeoData = createMockGeoData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      (sensors as any).permissions.set('geolocation', true);

      await sensors.updateSnapshot();

      const diagnostics = sensors.getDiagnostics();

      // Verify diagnostics structure includes all sensors
      expect(diagnostics.sensors).toBeDefined();
      expect(diagnostics.sensors.length).toBe(4);

      // Verify cache info for sensors with caching
      expect(diagnostics.cache.geolocation).toBeDefined();
      expect(diagnostics.cache.weather).toBeDefined();

      // Verify permissions
      expect(diagnostics.permissions).toBeDefined();
      expect(diagnostics.permissions.length).toBe(4);

      // Verify context data
      expect(diagnostics.context.hasGeolocation).toBe(true);
    });
  });

  describe('Sensor Recovery Notifications', () => {
    it('should send notifications for individual sensor recovery', async () => {
      const notifications: any[] = [];

      sensors.onSensorRecovery((notification) => {
        notifications.push(notification);
      });

      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      vi.spyOn(sensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((sensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      let weatherCallCount = 0;
      vi.spyOn((sensors as any).weather, 'getWeather')
        .mockImplementation(async () => {
          weatherCallCount++;
          if (weatherCallCount <= 2) {
            throw new Error('Weather fails');
          }
          return mockWeatherData;
        });

      (sensors as any).permissions.set('geolocation', true);
      (sensors as any).permissions.set('weather', true);

      // First update - fails
      await sensors.updateSnapshot();

      // Second update - still failing
      await sensors.updateSnapshot();

      // Third update - recovers
      await sensors.updateSnapshot();

      // Should have recovery notification
      const recoveryNotification = notifications.find(n => n.newStatus === 'healthy');
      expect(recoveryNotification).toBeDefined();
      expect(recoveryNotification.sensorType).toBeDefined();
    });
  });
});
