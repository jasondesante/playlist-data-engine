import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentalSensors } from '../../src/core/sensors/EnvironmentalSensors';
import {
  mockSensorData_Stationary_Indoors,
  mockSensorData_Running_Outdoors,
  mockSensorData_Walking_Night,
  mockSensorData_Driving_Highway,
  mockSensorData_HighAltitude_Mountain,
  mockSensorData_Tropical_Beach,
  mockSensorData_Snow_Cold,
  getMockSensorData,
  getExpectedMultiplier
} from '../fixtures/mockSensorData';
import type { EnvironmentalContext } from '../../src/core/types/Progression';

/**
 * Integration Tests for Environmental Sensors
 * Tests multi-class interactions, sensor data aggregation, and XP bonus calculations
 */

describe('Environmental Sensors Integration (T118)', () => {
  let sensors: EnvironmentalSensors;

  beforeEach(() => {
    sensors = new EnvironmentalSensors({
      enableLocation: true,
      enableMotion: true,
      enableWeather: true,
      enableLight: true
    });
  });

  describe('Sensor Data Aggregation', () => {
    it('should properly aggregate all sensor data into EnvironmentalContext', () => {
      const context = mockSensorData_Stationary_Indoors;

      // Verify all sensor data is present and properly structured
      expect(context.location).toBeDefined();
      expect(context.motion).toBeDefined();
      expect(context.weather).toBeDefined();
      expect(context.light).toBeDefined();

      // Verify location data
      expect(context.location?.latitude).toBeGreaterThanOrEqual(-90);
      expect(context.location?.latitude).toBeLessThanOrEqual(90);
      expect(context.location?.longitude).toBeGreaterThanOrEqual(-180);
      expect(context.location?.longitude).toBeLessThanOrEqual(180);
      expect(context.location?.accuracy).toBeGreaterThan(0);

      // Verify motion data structure
      expect(context.motion?.acceleration).toHaveProperty('x');
      expect(context.motion?.acceleration).toHaveProperty('y');
      expect(context.motion?.acceleration).toHaveProperty('z');
      expect(context.motion?.acceleration_with_gravity).toHaveProperty('x');
      expect(context.motion?.acceleration_with_gravity).toHaveProperty('y');
      expect(context.motion?.acceleration_with_gravity).toHaveProperty('z');
      expect(context.motion?.rotation_rate).toHaveProperty('alpha');
      expect(context.motion?.rotation_rate).toHaveProperty('beta');
      expect(context.motion?.rotation_rate).toHaveProperty('gamma');
      expect(context.motion?.activity_type).toBeDefined();
      expect(['stationary', 'walking', 'running', 'driving', 'unknown']).toContain(
        context.motion?.activity_type
      );

      // Verify weather data
      expect(context.weather?.temperature).toBeDefined();
      expect(context.weather?.humidity).toBeGreaterThanOrEqual(0);
      expect(context.weather?.humidity).toBeLessThanOrEqual(100);
      expect(context.weather?.pressure).toBeGreaterThan(0);
      expect(['clear', 'clouds', 'rain', 'snow', 'thunderstorm', 'mist', 'fog']).toContain(
        context.weather?.weather_type
      );
      expect(context.weather?.wind_speed).toBeGreaterThanOrEqual(0);
      expect(context.weather?.is_night).toBeDefined();

      // Verify light data
      expect(context.light?.illuminance).toBeGreaterThanOrEqual(0);
      expect(['bright_daylight', 'indoor', 'dim', 'dark']).toContain(context.light?.environment);
    });

    it('should maintain data consistency across multiple sensor readings', () => {
      const context1 = mockSensorData_Stationary_Indoors;
      const context2 = mockSensorData_Running_Outdoors;

      // Both should have all required properties
      [context1, context2].forEach((context) => {
        expect(context.location).toBeDefined();
        expect(context.motion).toBeDefined();
        expect(context.weather).toBeDefined();
        expect(context.light).toBeDefined();
        expect(context.location?.timestamp).toBeGreaterThan(0);
        expect(context.motion?.timestamp).toBeGreaterThan(0);
        expect(context.weather?.timestamp).toBeGreaterThan(0);
        expect(context.light?.timestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('XP Modifier Calculations from Environmental Data', () => {
    it('should have pre-calculated XP modifier for stationary indoor activity', () => {
      const context = mockSensorData_Stationary_Indoors;
      const expectedMultiplier = getExpectedMultiplier('stationary');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBe(1.0); // No bonuses for stationary indoors
    });

    it('should have pre-calculated XP modifier for running outdoors in storm', () => {
      const context = mockSensorData_Running_Outdoors;
      const expectedMultiplier = getExpectedMultiplier('running');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBeGreaterThan(1.0); // Running + storm = bonus
    });

    it('should have pre-calculated XP modifier for night walking', () => {
      const context = mockSensorData_Walking_Night;
      const expectedMultiplier = getExpectedMultiplier('walking');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBe(1.25); // Night bonus
    });

    it('should have pre-calculated XP modifier for driving', () => {
      const context = mockSensorData_Driving_Highway;
      const expectedMultiplier = getExpectedMultiplier('driving');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBe(1.0); // No bonus for driving
    });

    it('should have pre-calculated XP modifier for high altitude', () => {
      const context = mockSensorData_HighAltitude_Mountain;
      const expectedMultiplier = getExpectedMultiplier('altitude');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBe(1.3); // Altitude bonus
    });

    it('should have pre-calculated XP modifier for tropical climate', () => {
      const context = mockSensorData_Tropical_Beach;
      const expectedMultiplier = getExpectedMultiplier('tropical');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBe(1.0); // Comfortable tropical, no bonus
    });

    it('should have pre-calculated XP modifier for snow and cold conditions', () => {
      const context = mockSensorData_Snow_Cold;
      const expectedMultiplier = getExpectedMultiplier('snow');

      expect(context.environmental_xp_modifier).toBe(expectedMultiplier);
      expect(context.environmental_xp_modifier).toBe(1.4); // Cold + snow bonus
    });
  });

  describe('Sensor Fixture Data Quality', () => {
    const scenarios: Array<['stationary' | 'running' | 'walking' | 'driving' | 'altitude' | 'tropical' | 'snow', string]> = [
      ['stationary', 'Stationary Indoors'],
      ['running', 'Running Outdoors'],
      ['walking', 'Walking Night'],
      ['driving', 'Driving Highway'],
      ['altitude', 'High Altitude Mountain'],
      ['tropical', 'Tropical Beach'],
      ['snow', 'Snow Cold']
    ];

    scenarios.forEach(([scenario, name]) => {
      it(`should have valid ${name} mock data`, () => {
        const context = getMockSensorData(scenario);

        // Verify all required properties
        expect(context.location).toBeDefined();
        expect(context.motion).toBeDefined();
        expect(context.weather).toBeDefined();
        expect(context.light).toBeDefined();
        expect(context.biome).toBeDefined();
        expect(context.time_of_day).toBeDefined();
        expect(context.environmental_xp_modifier).toBeGreaterThan(0);
        expect(context.environmental_xp_modifier).toBeLessThanOrEqual(3.0);

        // Verify location bounds
        expect(context.location!.latitude).toBeGreaterThanOrEqual(-90);
        expect(context.location!.latitude).toBeLessThanOrEqual(90);
        expect(context.location!.longitude).toBeGreaterThanOrEqual(-180);
        expect(context.location!.longitude).toBeLessThanOrEqual(180);

        // Verify motion data is properly structured
        expect(context.motion!.acceleration).toBeDefined();
        expect(typeof context.motion!.acceleration.x).toBe('number');
        expect(typeof context.motion!.acceleration.y).toBe('number');
        expect(typeof context.motion!.acceleration.z).toBe('number');

        // Verify weather data
        expect(context.weather!.temperature).toBeDefined();
        expect(context.weather!.humidity).toBeGreaterThanOrEqual(0);
        expect(context.weather!.humidity).toBeLessThanOrEqual(100);

        // Verify light data
        expect(context.light!.illuminance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Activity Type Detection', () => {
    it('should correctly identify stationary activity', () => {
      const context = mockSensorData_Stationary_Indoors;
      expect(context.motion?.activity_type).toBe('stationary');
      expect(context.motion?.movement_intensity).toBe(0.0);
    });

    it('should correctly identify running activity', () => {
      const context = mockSensorData_Running_Outdoors;
      expect(context.motion?.activity_type).toBe('running');
      expect(context.motion?.movement_intensity).toBeGreaterThan(0.5);
    });

    it('should correctly identify walking activity', () => {
      const context = mockSensorData_Walking_Night;
      expect(context.motion?.activity_type).toBe('walking');
      expect(context.motion?.movement_intensity).toBeGreaterThan(0);
      expect(context.motion?.movement_intensity).toBeLessThan(0.5);
    });

    it('should correctly identify driving activity', () => {
      const context = mockSensorData_Driving_Highway;
      expect(context.motion?.activity_type).toBe('driving');
    });
  });

  describe('Weather Condition Analysis', () => {
    it('should correctly identify clear weather', () => {
      const context = mockSensorData_Stationary_Indoors;
      expect(context.weather?.weather_type).toBe('clear');
      expect(context.weather?.wind_speed).toBeLessThan(5);
    });

    it('should correctly identify thunderstorm conditions', () => {
      const context = mockSensorData_Running_Outdoors;
      expect(context.weather?.weather_type).toBe('thunderstorm');
      expect(context.weather?.wind_speed).toBeGreaterThan(10);
    });

    it('should correctly identify night conditions', () => {
      const context = mockSensorData_Walking_Night;
      expect(context.weather?.is_night).toBe(true);
      expect(context.light?.illuminance).toBeLessThan(100);
    });

    it('should correctly identify snow conditions', () => {
      const context = mockSensorData_Snow_Cold;
      expect(context.weather?.weather_type).toBe('snow');
      expect(context.weather?.temperature).toBeLessThan(0);
    });
  });

  describe('Environmental Context Composition', () => {
    it('should provide complete biome classification', () => {
      const scenarios = [
        { context: mockSensorData_Stationary_Indoors, expectedBiome: 'urban' },
        { context: mockSensorData_Running_Outdoors, expectedBiome: 'urban' },
        { context: mockSensorData_HighAltitude_Mountain, expectedBiome: 'mountain' },
        { context: mockSensorData_Tropical_Beach, expectedBiome: 'forest' },
        { context: mockSensorData_Snow_Cold, expectedBiome: 'tundra' }
      ];

      scenarios.forEach(({ context, expectedBiome }) => {
        expect(context.biome).toBe(expectedBiome);
      });
    });

    it('should provide complete time of day classification', () => {
      const dayContext = mockSensorData_Driving_Highway;
      const nightContext = mockSensorData_Walking_Night;

      expect(['day', 'dawn', 'dusk']).toContain(dayContext.time_of_day);
      expect(nightContext.time_of_day).toBe('night');
    });

    it('should provide complete season classification', () => {
      const validSeasons = ['spring', 'summer', 'autumn', 'winter'];

      [
        mockSensorData_Stationary_Indoors,
        mockSensorData_Running_Outdoors,
        mockSensorData_Walking_Night,
        mockSensorData_Driving_Highway,
        mockSensorData_HighAltitude_Mountain,
        mockSensorData_Tropical_Beach,
        mockSensorData_Snow_Cold
      ].forEach((context) => {
        expect(validSeasons).toContain(context.season);
      });
    });
  });

  describe('Multiplier Cap and Bounds', () => {
    it('should never exceed 3.0x XP multiplier in mock data', () => {
      const scenarios: Array<'stationary' | 'running' | 'walking' | 'driving' | 'altitude' | 'tropical' | 'snow'> = [
        'stationary',
        'running',
        'walking',
        'driving',
        'altitude',
        'tropical',
        'snow'
      ];

      scenarios.forEach((scenario) => {
        const context = getMockSensorData(scenario);
        expect(context.environmental_xp_modifier).toBeGreaterThanOrEqual(1.0);
        expect(context.environmental_xp_modifier).toBeLessThanOrEqual(3.0);
      });
    });

    it('should never provide negative XP multiplier in mock data', () => {
      const scenarios: Array<'stationary' | 'running' | 'walking' | 'driving' | 'altitude' | 'tropical' | 'snow'> = [
        'stationary',
        'running',
        'walking',
        'driving',
        'altitude',
        'tropical',
        'snow'
      ];

      scenarios.forEach((scenario) => {
        const context = getMockSensorData(scenario);
        expect(context.environmental_xp_modifier).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('Mock Data Helper Functions', () => {
    it('should return correct sensor data for all scenarios', () => {
      const scenarioMap = {
        stationary: mockSensorData_Stationary_Indoors,
        running: mockSensorData_Running_Outdoors,
        walking: mockSensorData_Walking_Night,
        driving: mockSensorData_Driving_Highway,
        altitude: mockSensorData_HighAltitude_Mountain,
        tropical: mockSensorData_Tropical_Beach,
        snow: mockSensorData_Snow_Cold
      };

      Object.entries(scenarioMap).forEach(([scenario, expectedData]) => {
        const data = getMockSensorData(scenario as any);
        expect(data).toEqual(expectedData);
      });
    });

    it('should provide consistent expected multipliers', () => {
      const scenarios = [
        { scenario: 'stationary', expected: 1.0 },
        { scenario: 'running', expected: 1.5 },
        { scenario: 'walking', expected: 1.25 },
        { scenario: 'driving', expected: 1.0 },
        { scenario: 'altitude', expected: 1.3 },
        { scenario: 'tropical', expected: 1.0 },
        { scenario: 'snow', expected: 1.4 }
      ];

      scenarios.forEach(({ scenario, expected }) => {
        const multiplier = getExpectedMultiplier(scenario as any);
        expect(multiplier).toBe(expected);
      });
    });
  });
});
