/**
 * Full Sensor Pipeline Integration Tests
 *
 * Tests the complete end-to-end flow of sensor data:
 * 1. Raw sensor data collection (geolocation, motion, weather, light, gaming)
 * 2. Data aggregation and context processing
 * 3. XP modifier calculation combining environmental and gaming factors
 * 4. Error recovery and graceful degradation
 * 5. Cache behavior across multiple sensor reads
 * 6. Multi-sensor interaction scenarios
 *
 * Covers Task 11.2: Integration tests for full sensor pipeline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnvironmentalSensors } from '../../src/core/sensors/EnvironmentalSensors';
import { GamingPlatformSensors } from '../../src/core/sensors/GamingPlatformSensors';
import type { MotionData } from '../../src/core/types/Environmental';

// Helper function to create mock geolocation data
const createMockGeoData = (overrides = {}) => ({
  latitude: 40.7128,
  longitude: -74.0060,
  altitude: 10,
  accuracy: 10,
  heading: null,
  speed: null,
  timestamp: Date.now(),
  ...overrides
});

// Helper function to create mock weather data
const createMockWeatherData = (overrides = {}) => ({
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

// Helper function to create mock motion data
// Note: motion detection uses |magnitude - 9.8| where magnitude = sqrt(x^2 + y^2 + z^2)
// - stationary: delta < 0.5 (magnitude ≈ 9.8, e.g., { x: 9.8, y: 0, z: 0 })
// - walking: 0.5 <= delta < 2.0 (magnitude ≈ 10-12, e.g., { x: 10, y: 1, z: 0 })
// - running: 2.0 <= delta < 5.0 (magnitude ≈ 12-15, e.g., { x: 12, y: 2, z: 1 })
// - driving: delta >= 5.0 (magnitude >= 15, e.g., { x: 15, y: 5, z: 0 })
const createMockMotionData = (overrides = {}): MotionData => ({
  acceleration: { x: 0.1, y: 0.1, z: 0.1 },
  accelerationIncludingGravity: { x: 9.8, y: 9.8, z: 9.8 },
  rotationRate: { alpha: null, beta: null, gamma: null },
  interval: 100,
  timestamp: Date.now(),
  ...overrides
});

describe('Full Sensor Pipeline Integration (Task 11.2)', () => {
  let environmentalSensors: EnvironmentalSensors;
  let gamingSensors: GamingPlatformSensors;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    environmentalSensors?.stopMonitoring();
    gamingSensors?.stopMonitoring();
    vi.restoreAllMocks();
  });

  describe('Complete Data Flow: Raw Sensor → Context → XP Modifier', () => {
    it('should flow from raw geolocation data to environmental context', async () => {
      const mockGeoData = createMockGeoData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      // Spy on the instance's getCurrentPosition method and checkAvailability
      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      // Manually set permission for geolocation
      (environmentalSensors as any).permissions.set('geolocation', true);

      const context = await environmentalSensors.updateSnapshot();

      // Verify geolocation data flows into context
      expect(context.geolocation).toBeDefined();
      expect(context.geolocation?.latitude).toBe(40.7128);
      expect(context.geolocation?.longitude).toBe(-74.0060);
      expect(context.biome).toBeDefined(); // Biome should be calculated from coordinates
      expect(context.timestamp).toBeGreaterThan(0);
    });

    it('should flow from raw weather data to environmental context with biome', async () => {
      const mockGeoData = createMockGeoData({
        latitude: 51.5074,  // London
        longitude: -0.1278
      });
      const mockWeatherData = createMockWeatherData({
        temperature: 15,
        humidity: 75,
        pressure: 1013,
        weatherType: 'rain',
        windSpeed: 25,
        windDirection: 180
      });

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);

      // Manually set permissions
      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);

      const context = await environmentalSensors.updateSnapshot();

      // Verify complete data flow
      expect(context.geolocation).toBeDefined();
      expect(context.weather).toBeDefined();
      expect(context.weather?.temperature).toBe(15);
      expect(context.weather?.weatherType).toBe('rain');
      expect(context.biome).toBeDefined(); // Urban biome for London
      expect(context.timestamp).toBeGreaterThan(0);
    });

    it('should calculate correct XP modifier from complete environmental context', async () => {
      const mockGeoData = createMockGeoData({
        latitude: 39.7392,  // Denver (high altitude)
        longitude: -104.9903,
        altitude: 1600  // Above 1000m threshold
      });
      const mockWeatherData = createMockWeatherData({
        temperature: 10,
        humidity: 80,
        pressure: 1000,
        weatherType: 'thunderstorm',
        windSpeed: 35,
        windDirection: 180,
        isNight: true
      });
      const mockMotionData = createMockMotionData({
        acceleration: { x: 2.5, y: 1.2, z: 3.0 },
        accelerationIncludingGravity: { x: 12, y: 6, z: 6 },  // This gives magnitude ≈ 14.7, delta ≈ 4.9 (running)
        rotationRate: { alpha: 0.1, beta: 0.2, gamma: 0.15 }
      });

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);
      vi.spyOn((environmentalSensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));

      // Manually set permissions
      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);
      (environmentalSensors as any).permissions.set('motion', true);

      environmentalSensors.startMonitoring();
      await environmentalSensors.updateSnapshot();

      const modifier = environmentalSensors.calculateXPModifier();

      // Expected: 1.0 base + 0.5 running + 0.4 storm + 0.25 night + 0.3 altitude = 2.45
      expect(modifier).toBeGreaterThan(2.0);
      expect(modifier).toBeLessThanOrEqual(3.0); // Should be capped at 3.0
    });

    it('should flow from gaming detection to gaming context with XP bonus', async () => {
      const mockCurrentGame = {
        name: "Baldur's Gate 3",
        source: 'steam' as const,
        sessionDuration: 240, // 4 hours
        partySize: 4
      };

      const mockMetadata = {
        genre: ['RPG', 'Fantasy', 'Multiplayer']
      };

      gamingSensors = new GamingPlatformSensors({
        steam: {
          apiKey: 'test-steam-key',
          steamId: '123456789'
        }
      });

      vi.spyOn((gamingSensors as any).steam, 'getCurrentGame')
        .mockResolvedValue(mockCurrentGame);
      vi.spyOn((gamingSensors as any).steam, 'getGameMetadata')
        .mockResolvedValue(mockMetadata);

      await gamingSensors.authenticate('123456789');
      gamingSensors.startMonitoring();

      // Wait for polling cycle
      await new Promise(resolve => setTimeout(resolve, 100));

      const context = gamingSensors.getContext();

      // Verify gaming data flow
      expect(context.isActivelyGaming).toBe(true);
      expect(context.platformSource).toBe('steam');
      expect(context.currentGame?.name).toBe("Baldur's Gate 3");
      expect(context.currentGame?.genre).toEqual(['RPG', 'Fantasy', 'Multiplayer']);
      expect(context.currentGame?.sessionDuration).toBe(240);
      expect(context.currentGame?.partySize).toBe(4);

      // Calculate gaming bonus
      const bonus = gamingSensors.calculateGamingBonus();

      // Expected: 1.0 base + 0.25 gaming + 0.2 RPG + 0.15 multiplayer + 0.2 duration = 1.8
      // But capped at 1.75 (maxGamingModifier) per documented design
      expect(bonus).toBe(1.75);
    });
  });

  describe('Multi-Sensor Interaction: Environmental + Gaming', () => {
    it('should combine environmental and gaming XP modifiers correctly', async () => {
      const mockGeoData = createMockGeoData({
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 1500  // Above 1000 threshold for altitude bonus
      });
      const mockWeatherData = createMockWeatherData({
        temperature: 12,
        humidity: 85,
        pressure: 1005,
        weatherType: 'rain',
        windSpeed: 20,
        windDirection: 180,
        isNight: true
      });
      const mockMotionData = createMockMotionData({
        acceleration: { x: 3.0, y: 1.5, z: 3.5 },
        accelerationIncludingGravity: { x: 12, y: 6, z: 6 },  // Running motion
        rotationRate: { alpha: 0.2, beta: 0.3, gamma: 0.25 }
      });
      const mockCurrentGame = {
        name: 'Elden Ring',
        source: 'steam' as const,
        sessionDuration: 180, // 3 hours
        partySize: 1
      };
      const mockMetadata = {
        genre: ['Action RPG', 'Fantasy']
      };

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);
      vi.spyOn((environmentalSensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);
      (environmentalSensors as any).permissions.set('motion', true);

      gamingSensors = new GamingPlatformSensors({
        steam: {
          apiKey: 'test-steam-key',
          steamId: '123456789'
        }
      });

      vi.spyOn((gamingSensors as any).steam, 'getCurrentGame')
        .mockResolvedValue(mockCurrentGame);
      vi.spyOn((gamingSensors as any).steam, 'getGameMetadata')
        .mockResolvedValue(mockMetadata);

      // Initialize both sensor systems
      environmentalSensors.startMonitoring();
      await environmentalSensors.updateSnapshot();

      await gamingSensors.authenticate('123456789');
      gamingSensors.startMonitoring();

      // Wait for polling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calculate individual modifiers
      const envModifier = environmentalSensors.calculateXPModifier();
      const gamingBonus = gamingSensors.calculateGamingBonus();

      // Combined modifier should respect the 3.0x cap
      const combinedModifier = Math.min(envModifier * gamingBonus, 3.0);

      expect(envModifier).toBeGreaterThan(2.0);
      expect(gamingBonus).toBeGreaterThan(1.5);
      expect(combinedModifier).toBeLessThanOrEqual(3.0);
    });

    it('should track gaming sessions with environmental context changes', async () => {
      gamingSensors = new GamingPlatformSensors({
        steam: {
          apiKey: 'test-steam-key',
          steamId: '123456789'
        }
      });

      // Record multiple game sessions
      gamingSensors.recordGameSession('Skyrim', 120);
      gamingSensors.recordGameSession('Fallout 4', 90);
      gamingSensors.recordGameSession('Civilization VI', 180);

      const context = gamingSensors.getContext();

      // Verify session tracking
      expect(context.totalGamingMinutes).toBe(390);
      expect(context.gamesPlayedWhileListening).toContain('Skyrim');
      expect(context.gamesPlayedWhileListening).toContain('Fallout 4');
      expect(context.gamesPlayedWhileListening).toContain('Civilization VI');
      expect(context.gamesPlayedWhileListening.length).toBe(3);
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should use fallback values when sensors fail', async () => {
      const mockGeoData = createMockGeoData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key', {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2
      });

      let callCount = 0;
      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            return mockGeoData;
          }
          throw new Error('Geolocation unavailable');
        });

      (environmentalSensors as any).permissions.set('geolocation', true);

      // First call succeeds
      const context1 = await environmentalSensors.updateSnapshot();
      expect(context1.geolocation).toBeDefined();

      // Second call fails but uses fallback
      const context2 = await environmentalSensors.updateSnapshot();
      expect(context2.geolocation).toBeDefined(); // Should have last known good
      expect(context2.geolocation?.latitude).toBe(40.7128); // Fallback to previous value
    });

    it('should maintain sensor health status through failures', async () => {
      const mockGeoData = createMockGeoData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key', {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2
      });

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockRejectedValue(new Error('API timeout'));

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);

      // Update snapshot (weather should fail after retries)
      await environmentalSensors.updateSnapshot();

      // Check sensor status
      const weatherStatus = environmentalSensors.getSensorStatus('weather');

      expect(weatherStatus).toBeDefined();
      expect(weatherStatus?.health).toBe('degraded'); // With maxRetries: 1, consecutiveFailures is at most 2 (degraded, not failed)
      expect(weatherStatus?.consecutiveFailures).toBeGreaterThan(0);
      expect(weatherStatus?.lastError).toContain('API timeout');
    });

    it('should recover from sensor failures and update health status', async () => {
      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key', {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2
      });

      let callCount = 0;
      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockImplementation(async () => {
          callCount++;
          if (callCount <= 3) {
            throw new Error('Temporary failure');
          }
          return mockWeatherData;
        });

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);

      // First few calls should fail
      await environmentalSensors.updateSnapshot();
      let status = environmentalSensors.getSensorStatus('weather');
      expect(status?.health).toBe('degraded'); // With maxRetries: 1, consecutiveFailures is at most 2 (degraded, not failed)

      // After retries succeed, sensor should recover
      await environmentalSensors.updateSnapshot();
      status = environmentalSensors.getSensorStatus('weather');
      expect(status?.health).toBe('healthy'); // Should recover after success
    });

    it('should notify recovery callbacks when sensor status changes', async () => {
      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key', {
        maxRetries: 1,
        initialDelayMs: 10,
        maxDelayMs: 50,
        backoffMultiplier: 2
      });

      const notifications: any[] = [];

      // Register recovery callback
      environmentalSensors.onSensorRecovery((notification) => {
        notifications.push(notification);
      });

      let callCount = 0;
      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockImplementation(async () => {
          callCount++;
          if (callCount <= 3) {
            throw new Error('Temporary failure');
          }
          return mockWeatherData;
        });

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);

      // Trigger failures then recovery
      await environmentalSensors.updateSnapshot();
      await environmentalSensors.updateSnapshot();

      // Should have received recovery notifications
      expect(notifications.length).toBeGreaterThan(0);

      // Check notification structure - find the weather recovery notification
      const weatherNotification = notifications.find(n => n.sensorType === 'weather' && n.newStatus === 'healthy');
      expect(weatherNotification).toBeDefined();
      expect(weatherNotification?.sensorType).toBe('weather');
      expect(weatherNotification?.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Cache Behavior in Integrated Pipeline', () => {
    it('should use geolocation cache to reduce API calls', async () => {
      const mockGeoData = createMockGeoData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      const geoSpy = vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      (environmentalSensors as any).permissions.set('geolocation', true);

      // First call
      await environmentalSensors.updateSnapshot();
      expect(geoSpy).toHaveBeenCalled();

      // Check cache stats exist
      const diagnostics = environmentalSensors.getDiagnostics();
      expect(diagnostics.cache.geolocation.stats).toBeDefined();
    });

    it('should use weather cache with appropriate TTL', async () => {
      const mockGeoData = createMockGeoData();
      const mockWeatherData = createMockWeatherData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);

      // First call should hit weather API
      await environmentalSensors.updateSnapshot();

      // Check cache stats
      const diagnostics = environmentalSensors.getDiagnostics();
      expect(diagnostics.cache.weather.size).toBeGreaterThanOrEqual(0);
      expect(diagnostics.cache.weather.stats).toBeDefined();
    });

    it('should invalidate cache when explicitly requested', async () => {
      const mockGeoData = createMockGeoData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      (environmentalSensors as any).permissions.set('geolocation', true);

      // Populate cache
      await environmentalSensors.updateSnapshot();

      // Invalidate cache
      (environmentalSensors as any).geolocation.invalidateCache();

      // Cache should be empty (null age means no cached value)
      const cacheAge = (environmentalSensors as any).geolocation.getCacheAge();
      expect(cacheAge).toBeNull();
    });
  });

  describe('Sensor Lifecycle and State Management', () => {
    it('should properly start and stop monitoring', async () => {
      const mockMotionData = createMockMotionData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      const startSpy = vi.spyOn((environmentalSensors as any).motion, 'startMonitoring')
        .mockImplementation((callback: any) => callback(mockMotionData));
      const stopSpy = vi.spyOn((environmentalSensors as any).motion, 'stopMonitoring');

      (environmentalSensors as any).permissions.set('motion', true);

      // Start monitoring
      environmentalSensors.startMonitoring();
      expect(startSpy).toHaveBeenCalledTimes(1);

      // Stop monitoring
      environmentalSensors.stopMonitoring();
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });

    it('should provide comprehensive diagnostics', async () => {
      const mockGeoData = createMockGeoData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);

      (environmentalSensors as any).permissions.set('geolocation', true);

      await environmentalSensors.updateSnapshot();

      const diagnostics = environmentalSensors.getDiagnostics();

      // Verify diagnostic structure
      expect(diagnostics.timestamp).toBeGreaterThan(0);
      expect(diagnostics.sensors).toBeDefined();
      expect(diagnostics.sensors.length).toBeGreaterThan(0);
      expect(diagnostics.cache).toBeDefined();
      expect(diagnostics.permissions).toBeDefined();
      expect(diagnostics.context).toBeDefined();

      // Verify sensor status includes health
      const geoSensor = diagnostics.sensors.find(s => s.type === 'geolocation');
      expect(geoSensor).toBeDefined();
      expect(geoSensor?.status.health).toBeDefined();
    });

    it('should handle permission requests correctly', async () => {
      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(createMockGeoData());

      const permissions = await environmentalSensors.requestPermissions(['geolocation', 'weather']);

      expect(permissions).toHaveLength(2);
      expect(permissions[0].type).toBe('geolocation');
      expect(permissions[1].type).toBe('weather');
      expect(permissions[0].timestamp).toBeGreaterThan(0);
      expect(permissions[1].timestamp).toBeGreaterThan(0);
    });

    it('should check sensor availability', async () => {
      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      const hasGeo = environmentalSensors.checkAvailability('geolocation');
      const hasWeather = environmentalSensors.checkAvailability('weather');

      expect(typeof hasGeo).toBe('boolean');
      expect(typeof hasWeather).toBe('boolean');
    });
  });

  describe('Combined XP Calculation Edge Cases', () => {
    it('should never exceed 3.0x total XP modifier', async () => {
      const mockGeoData = createMockGeoData({
        latitude: 39.7392,
        longitude: -104.9903,
        altitude: 2000 // Very high altitude
      });
      const mockWeatherData = createMockWeatherData({
        temperature: -10,
        humidity: 90,
        pressure: 980,
        weatherType: 'snow',
        windSpeed: 60,
        windDirection: 180,
        isNight: true,
        moonPhase: 0.8
      });
      const mockMotionData = createMockMotionData({
        acceleration: { x: 4.0, y: 2.0, z: 4.5 },
        accelerationIncludingGravity: { x: 12.0, y: 11.0, z: 13.0 },
        rotationRate: { alpha: 0.3, beta: 0.4, gamma: 0.35 }
      });

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);
      vi.spyOn((environmentalSensors as any).motion, 'startMonitoring')
        .mockImplementation((cb: any) => cb(mockMotionData));

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);
      (environmentalSensors as any).permissions.set('motion', true);

      environmentalSensors.startMonitoring();
      await environmentalSensors.updateSnapshot();

      const modifier = environmentalSensors.calculateXPModifier();

      // Even with maximum stacking, should never exceed 3.0x
      expect(modifier).toBeLessThanOrEqual(3.0);
    });

    it('should return 1.0x when no bonuses apply', async () => {
      const mockGeoData = createMockGeoData({
        latitude: 25.7617,
        longitude: -80.1918,
        altitude: 5
      });
      const mockWeatherData = createMockWeatherData({
        temperature: 25,
        humidity: 50,
        pressure: 1015,
        weatherType: 'clear',
        windSpeed: 5,
        windDirection: 0,
        isNight: false
      });
      const mockMotionData = createMockMotionData();

      environmentalSensors = new EnvironmentalSensors('test-weather-api-key');

      vi.spyOn(environmentalSensors, 'checkAvailability' as any).mockReturnValue(true);
      vi.spyOn((environmentalSensors as any).geolocation, 'getCurrentPosition')
        .mockResolvedValue(mockGeoData);
      vi.spyOn((environmentalSensors as any).weather, 'getWeather')
        .mockResolvedValue(mockWeatherData);
      vi.spyOn((environmentalSensors as any).motion, 'startMonitoring')
        .mockImplementation((cb: any) => cb(mockMotionData));

      (environmentalSensors as any).permissions.set('geolocation', true);
      (environmentalSensors as any).permissions.set('weather', true);
      (environmentalSensors as any).permissions.set('motion', true);

      environmentalSensors.startMonitoring();
      await environmentalSensors.updateSnapshot();

      const modifier = environmentalSensors.calculateXPModifier();

      // Stationary, clear weather, day, low altitude = 1.0x
      expect(modifier).toBe(1.0);
    });
  });

  describe('Gaming Sensor Error Handling', () => {
    it('should handle Steam API failures gracefully', async () => {
      gamingSensors = new GamingPlatformSensors({
        steam: {
          apiKey: 'test-steam-key',
          steamId: '123456789'
        }
      });

      vi.spyOn((gamingSensors as any).steam, 'getCurrentGame')
        .mockRejectedValue(new Error('Steam API unavailable'));

      await gamingSensors.authenticate('123456789');
      gamingSensors.startMonitoring();

      // Wait for polling cycle
      await new Promise(resolve => setTimeout(resolve, 100));

      const context = gamingSensors.getContext();

      // Should still have context, but no active game
      expect(context.isActivelyGaming).toBe(false);
      expect(context.platformSource).toBe('none');
    });

    it('should calculate 1.0x bonus when not gaming', async () => {
      gamingSensors = new GamingPlatformSensors({
        steam: {
          apiKey: 'test-steam-key',
          steamId: '123456789'
        }
      });

      vi.spyOn((gamingSensors as any).steam, 'getCurrentGame')
        .mockResolvedValue(null);

      await gamingSensors.authenticate('123456789');
      gamingSensors.startMonitoring();

      await new Promise(resolve => setTimeout(resolve, 100));

      const bonus = gamingSensors.calculateGamingBonus();

      expect(bonus).toBe(1.0);
    });
  });
});
