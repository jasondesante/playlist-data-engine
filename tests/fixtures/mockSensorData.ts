/**
 * Mock Environmental Sensor Data
 * Provides realistic mock data for testing environmental sensor integration
 */

import type { EnvironmentalContext } from '../../src/core/types/Progression';

/**
 * Mock data for user indoors, no motion, clear weather
 */
export const mockSensorData_Stationary_Indoors: EnvironmentalContext = {
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    altitude: 10,
    accuracy: 5,
    heading: 0,
    speed: 0,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.05,
      y: 0.02,
      z: 9.81
    },
    acceleration_with_gravity: {
      x: 0.05,
      y: 0.02,
      z: 9.82
    },
    rotation_rate: {
      alpha: 0,
      beta: 0,
      gamma: 0
    },
    movement_intensity: 0.0,
    activity_type: 'stationary',
    timestamp: Date.now()
  },
  weather: {
    temperature: 22,
    feels_like: 21,
    humidity: 45,
    pressure: 1013,
    weather_type: 'clear',
    wind_speed: 2,
    wind_direction: 0,
    visibility: 10000,
    is_night: false,
    moon_phase: 0.5,
    timestamp: Date.now()
  },
  biome: 'urban',
  time_of_day: 'day',
  season: 'spring',
  environmental_xp_modifier: 1.0
};

/**
 * Mock data for user running outdoors
 */
export const mockSensorData_Running_Outdoors: EnvironmentalContext = {
  location: {
    latitude: 40.7580,
    longitude: -73.9855,
    altitude: 12,
    accuracy: 10,
    heading: 45,
    speed: 3.5,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.3,
      y: 0.2,
      z: 9.85
    },
    acceleration_with_gravity: {
      x: 0.3,
      y: 0.2,
      z: 10.27
    },
    rotation_rate: {
      alpha: 2,
      beta: 1,
      gamma: 5
    },
    movement_intensity: 0.8,
    activity_type: 'running',
    timestamp: Date.now()
  },
  weather: {
    temperature: 18,
    feels_like: 16,
    humidity: 60,
    pressure: 1012,
    weather_type: 'thunderstorm',
    wind_speed: 12,
    wind_direction: 225,
    visibility: 5000,
    is_night: false,
    moon_phase: 0,
    timestamp: Date.now()
  },
  biome: 'urban',
  time_of_day: 'day',
  season: 'summer',
  environmental_xp_modifier: 1.5
};

/**
 * Mock data for user walking outdoors at night
 */
export const mockSensorData_Walking_Night: EnvironmentalContext = {
  location: {
    latitude: 51.5074,
    longitude: -0.1278,
    altitude: 15,
    accuracy: 8,
    heading: 180,
    speed: 1.4,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.08,
      y: 0.05,
      z: 9.88
    },
    acceleration_with_gravity: {
      x: 0.08,
      y: 0.05,
      z: 9.97
    },
    rotation_rate: {
      alpha: 0.5,
      beta: 0.3,
      gamma: 2
    },
    movement_intensity: 0.3,
    activity_type: 'walking',
    timestamp: Date.now()
  },
  weather: {
    temperature: 8,
    feels_like: 5,
    humidity: 75,
    pressure: 1010,
    weather_type: 'clouds',
    wind_speed: 5,
    wind_direction: 90,
    visibility: 8000,
    is_night: true,
    moon_phase: 0.8,
    timestamp: Date.now()
  },
  biome: 'urban',
  time_of_day: 'night',
  season: 'winter',
  environmental_xp_modifier: 1.25
};

/**
 * Mock data for user driving
 */
export const mockSensorData_Driving_Highway: EnvironmentalContext = {
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 50,
    accuracy: 15,
    heading: 270,
    speed: 25,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.3,
      y: 0.1,
      z: 9.91
    },
    acceleration_with_gravity: {
      x: 0.3,
      y: 0.1,
      z: 10.62
    },
    rotation_rate: {
      alpha: 0.2,
      beta: 0.1,
      gamma: 1
    },
    movement_intensity: 0.4,
    activity_type: 'driving',
    timestamp: Date.now()
  },
  weather: {
    temperature: 25,
    feels_like: 26,
    humidity: 40,
    pressure: 1013,
    weather_type: 'clear',
    wind_speed: 8,
    wind_direction: 270,
    visibility: 15000,
    is_night: false,
    moon_phase: 0,
    timestamp: Date.now()
  },
  biome: 'urban',
  time_of_day: 'day',
  season: 'summer',
  environmental_xp_modifier: 1.0
};

/**
 * Mock data for high altitude location
 */
export const mockSensorData_HighAltitude_Mountain: EnvironmentalContext = {
  location: {
    latitude: 40.0376,
    longitude: -105.2705,
    altitude: 3000,
    accuracy: 20,
    heading: 90,
    speed: 1.0,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.05,
      y: 0.02,
      z: 9.80
    },
    acceleration_with_gravity: {
      x: 0.05,
      y: 0.02,
      z: 9.92
    },
    rotation_rate: {
      alpha: 0,
      beta: 0,
      gamma: 0
    },
    movement_intensity: 0.1,
    activity_type: 'stationary',
    timestamp: Date.now()
  },
  weather: {
    temperature: 5,
    feels_like: 2,
    humidity: 50,
    pressure: 700,
    weather_type: 'clear',
    wind_speed: 15,
    wind_direction: 0,
    visibility: 50000,
    is_night: false,
    moon_phase: 0,
    timestamp: Date.now()
  },
  biome: 'mountain',
  time_of_day: 'day',
  season: 'spring',
  environmental_xp_modifier: 1.3
};

/**
 * Mock data for tropical biome
 */
export const mockSensorData_Tropical_Beach: EnvironmentalContext = {
  location: {
    latitude: 20.8067,
    longitude: -156.4729,
    altitude: 2,
    accuracy: 10,
    heading: 45,
    speed: 0.2,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.04,
      y: 0.02,
      z: 9.83
    },
    acceleration_with_gravity: {
      x: 0.04,
      y: 0.02,
      z: 9.90
    },
    rotation_rate: {
      alpha: 0,
      beta: 0,
      gamma: 0
    },
    movement_intensity: 0.05,
    activity_type: 'stationary',
    timestamp: Date.now()
  },
  weather: {
    temperature: 28,
    feels_like: 30,
    humidity: 80,
    pressure: 1012,
    weather_type: 'clouds',
    wind_speed: 10,
    wind_direction: 135,
    visibility: 12000,
    is_night: false,
    moon_phase: 0.25,
    timestamp: Date.now()
  },
  biome: 'forest',
  time_of_day: 'day',
  season: 'summer',
  environmental_xp_modifier: 1.0
};

/**
 * Mock data for snowy conditions
 */
export const mockSensorData_Snow_Cold: EnvironmentalContext = {
  location: {
    latitude: 60.1695,
    longitude: 24.9354,
    altitude: 30,
    accuracy: 12,
    heading: 0,
    speed: 0.5,
    timestamp: Date.now()
  },
  motion: {
    acceleration: {
      x: 0.06,
      y: 0.04,
      z: 9.82
    },
    acceleration_with_gravity: {
      x: 0.06,
      y: 0.04,
      z: 9.94
    },
    rotation_rate: {
      alpha: 0,
      beta: 0,
      gamma: 0
    },
    movement_intensity: 0.2,
    activity_type: 'walking',
    timestamp: Date.now()
  },
  weather: {
    temperature: -8,
    feels_like: -15,
    humidity: 95,
    pressure: 1015,
    weather_type: 'snow',
    wind_speed: 20,
    wind_direction: 0,
    visibility: 3000,
    is_night: true,
    moon_phase: 0,
    timestamp: Date.now()
  },
  biome: 'tundra',
  time_of_day: 'night',
  season: 'winter',
  environmental_xp_modifier: 1.4
};

/**
 * Get sensor data for a specific scenario
 */
export function getMockSensorData(scenario: 'stationary' | 'running' | 'walking' | 'driving' | 'altitude' | 'tropical' | 'snow'): EnvironmentalContext {
  switch (scenario) {
    case 'stationary':
      return mockSensorData_Stationary_Indoors;
    case 'running':
      return mockSensorData_Running_Outdoors;
    case 'walking':
      return mockSensorData_Walking_Night;
    case 'driving':
      return mockSensorData_Driving_Highway;
    case 'altitude':
      return mockSensorData_HighAltitude_Mountain;
    case 'tropical':
      return mockSensorData_Tropical_Beach;
    case 'snow':
      return mockSensorData_Snow_Cold;
    default:
      return mockSensorData_Stationary_Indoors;
  }
}

/**
 * Calculate expected XP multiplier for a sensor scenario
 * Used to validate bonus calculations in tests
 */
export function getExpectedMultiplier(scenario: 'stationary' | 'running' | 'walking' | 'driving' | 'altitude' | 'tropical' | 'snow'): number {
  switch (scenario) {
    case 'stationary':
      return 1.0;
    case 'running':
      return 1.5;
    case 'walking':
      return 1.25;
    case 'driving':
      return 1.0;
    case 'altitude':
      return 1.3;
    case 'tropical':
      return 1.0;
    case 'snow':
      return 1.4;
    default:
      return 1.0;
  }
}
