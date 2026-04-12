# IRL Sensors Reference

Complete guide to the environmental and gaming sensors in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Environmental Sensors](#environmental-sensors)
2. [Solar Information (No API Key Required)](#solar-information-no-api-key-required)
3. [Gaming Sensors](#gaming-sensors)
4. [Severe Weather Detection](#severe-weather-detection)
5. [Sensor Dashboard](#sensor-dashboard)
6. [Sensor Configuration](#sensor-configuration)

---

## Environmental Sensors


```typescript
import { EnvironmentalSensors } from 'playlist-data-engine';

// Initialize sensors with weather API key
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);

// Request permissions
const permissions = await sensors.requestPermissions(['geolocation', 'motion', 'weather']);
console.log(`Permissions granted:`, permissions);

// Get current environmental context
const context = await sensors.updateSnapshot();

// Calculate XP modifier based on environment
const xpModifier = sensors.calculateXPModifier();
console.log(`Environmental bonus: ${xpModifier.toFixed(2)}x`);
// Examples:
// - Running in rain: 1.5x
// - Stationary indoors: 1.0x
// - Walking at night: 1.25x
// - High altitude + snow: 1.4x
// - Hurricane conditions (tropical): 2.25x (severe weather bonus applied)
// - Typhoon conditions (temperate): 2.25x (severe weather bonus applied)
// - Blizzard conditions: 2.0x (severe weather bonus applied)
```

---

## Solar Information (No API Key Required)

The `getSolarInfo()` method provides astronomical calculations for sunrise, sunset, and day stage. **This method works without an API key** using pure astronomical math (NOAA algorithm).

### Basic Usage

```typescript
import { WeatherAPIClient } from 'playlist-data-engine';

// No API key needed for solar calculations!
const weatherClient = new WeatherAPIClient('');
const solarInfo = weatherClient.getSolarInfo(40.7128, -74.0060); // NYC coordinates

console.log(solarInfo.stage);          // 'day', 'night', 'dawn', or 'dusk'
console.log(solarInfo.sunrise);        // Date object
console.log(solarInfo.sunset);         // Date object
console.log(solarInfo.solarNoon);      // Solar noon time
console.log(solarInfo.dayLengthHours); // e.g., 14.5
console.log(solarInfo.sunAltitude);    // Sun altitude in degrees
console.log(solarInfo.sunAzimuth);     // Sun azimuth (0-360, North=0)
```

### Optional Date Parameter

You can also calculate solar info for a specific date:

```typescript
// Get solar info for a specific date
const futureDate = new Date('2024-12-25');
const christmasSolar = weatherClient.getSolarInfo(40.7128, -74.0060, futureDate);
console.log(`Christmas day length: ${christmasSolar.dayLengthHours} hours`);
```


---

## Gaming Platform Integration

```typescript
import { GamingPlatformSensors } from 'playlist-data-engine';

// Initialize with Steam
const gamingSensors = new GamingPlatformSensors({
  steam: {
    apiKey: process.env.STEAM_API_KEY,
    steamId: '123456789',
    pollInterval: 60000  // Check every 60 seconds
  }
});

// Start monitoring
gamingSensors.startMonitoring((context) => {
  if (context.isActivelyGaming) {
    const bonus = gamingSensors.calculateGamingBonus();
    console.log(`Playing: ${context.currentGame?.name}, Bonus: ${bonus.toFixed(2)}x`);
    // Examples:
    // - Action game: 1.425x
    // - RPG game: 1.55x
    // - Multiplayer RPG: 1.8x
  }
});

// Stop monitoring when done
gamingSensors.stopMonitoring();
```

**Browser Compatibility Notes:**

- Steam game detection works in both browser AND server modes
- No configuration required - environment is detected automatically


---

## Severe Weather Detection

The EnvironmentalSensors can detect severe weather conditions that provide significant XP bonuses. These conditions are automatically detected based on current weather data and geographic location.

### Severe Weather Types

**Hurricane vs. Typhoon Classification:**

The system correctly classifies tropical cyclones based on geographic location:
- **Hurricane**: Tropical cyclone detected in tropical regions (between 23.5°N and 23.5°S)
- **Typhoon**: Tropical cyclone detected outside tropical regions (temperate zones)

This classification is important for accurate weather terminology and XP bonus calculations.

**All Severe Weather Types:**

| Type | Condition | XP Bonus | Severity Levels |
|------|-----------|----------|-----------------|
| **Blizzard** | Heavy snow + high winds (>25 km/h) | +50% (0.5x) | moderate, high, extreme |
| **Hurricane** | Extreme winds (>118 km/h) in tropics | +75% (0.75x) | moderate, high, extreme |
| **Typhoon** | Extreme winds (>118 km/h) in temperate | +75% (0.75x) | moderate, high, extreme |
| **Tornado** | Tornado weather type detected | +100% (1.0x) | extreme |

**Tropical Region Definition:**

Tropical regions are defined as locations between the Tropic of Cancer (23.5°N) and the Tropic of Capricorn (23.5°S). This is where hurricanes typically form and occur.

```typescript
// Geographic boundaries
// Northern Hemisphere:
// - Tropical: 0° to 23.5°N (e.g., Singapore, Miami, Caribbean)
// - Temperate: >23.5°N (e.g., Tokyo, New York, Southern Europe)

// Southern Hemisphere:
// - Tropical: 0° to 23.5°S (e.g., Rio de Janeiro, Northern Australia)
// - Temperate: >23.5°S (e.g., Sydney, Southern Australia)
```

### Usage Example

```typescript
import { EnvironmentalSensors } from 'playlist-data-engine';

const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);

// Detect severe weather from current conditions
const alert = await sensors.detectSevereWeather();

if (alert) {
    console.log(`🌀 ${alert.type} detected!`);
    console.log(`XP Bonus: +${alert.xpBonus * 100}%`);
    console.log(`Severity: ${alert.severity}`);
    console.log(`Message: ${alert.message}`);

    // Get safety warning
    const warning = sensors.getSevereWeatherWarning();
    console.log(`Safety: ${warning}`);
}

// Calculate XP modifier with severe weather
const result = await sensors.calculateXPModifierWithSevereWeather();
console.log(`Total XP modifier: ${result.modifier.toFixed(2)}x`);
if (result.severeWeatherAlert) {
    console.log(`Severe weather active: ${result.severeWeatherAlert.type}`);
}
```

### Geographic Examples

```typescript
// Location-specific examples:

// Singapore (1.35°N) - Tropical
// → Hurricane detection (if wind >118 km/h)
// → XP Bonus: +75%

// Tokyo (35.68°N) - Temperate
// → Typhoon detection (if wind >118 km/h)
// → XP Bonus: +75%

// Sydney (-33.87°S) - Temperate
// → Typhoon detection (if wind >118 km/h)
// → XP Bonus: +75%

// Rio de Janeiro (-22.91°S) - Tropical
// → Hurricane detection (if wind >118 km/h)
// → XP Bonus: +75%

// Boundary Cases:
// - 23.5°N exactly: Typhoon (temperate)
// - 23.49°N: Hurricane (tropical)
```

---

## Sensor Dashboard

The Sensor Dashboard provides formatted console output for sensor diagnostics during development and debugging. It displays sensor status, health indicators, cache statistics, performance metrics, and recent failures with optional ANSI color support (auto-disabled in non-TTY environments like CI).

### Basic Usage

```typescript
import { SensorDashboard, EnvironmentalSensors, GamingPlatformSensors } from 'playlist-data-engine';

// Initialize sensors
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
const gamingSensors = new GamingPlatformSensors({
    steamApiKey: process.env.STEAM_API_KEY
});

// Get sensor data
const envDiagnostics = sensors.getDiagnostics();
const gamingDiagnostics = gamingSensors.getDiagnostics();

// Display individual dashboards
SensorDashboard.displayEnvironmentalDiagnostics(envDiagnostics);
SensorDashboard.displayGamingDiagnostics(gamingDiagnostics);

// Display combined system dashboard
SensorDashboard.displaySystemDashboard({
    environmental: envDiagnostics,
    gaming: gamingDiagnostics
});
```

### Custom Configuration

```typescript
import { SensorDashboard, type DashboardConfig } from 'playlist-data-engine';

const config: DashboardConfig = {
    useColors: false,        // Disable colors (for CI/logs)
    compact: true,           // Compact output mode
    showTimestamp: false,    // Hide timestamp
    maxFailures: 10          // Show up to 10 recent failures
};

SensorDashboard.displayEnvironmentalDiagnostics(diagnostics, config);
```

### Dashboard Sections

**Environmental Diagnostics:**
- Sensor Status - Health, permissions, availability, consecutive failures, last error
- Cache Statistics - Geolocation age/expiry, weather cache size, hit rates
- API Performance - Weather/Forecast API calls, success rate, timing metrics (P95/P99)
- Recent Failures - Error messages with retry status and time ago
- Context Data - Available context types (geolocation, motion, weather, light, biome)

**Gaming Diagnostics:**
- Platform Status - Steam authentication/API key
- Gaming Context - Active gaming status, current game with session details
- Polling Status - Active status, interval, exponential backoff multiplier
- Cache - Game metadata cache size and cached games list
- API Performance - Current Game/Metadata API metrics

**Quick Health Summary (System Dashboard):**
- Overall environmental sensor health count
- Gaming platform connection status

### Available Exports

- `SensorDashboard` - Object containing all dashboard display functions
- `displayEnvironmentalDiagnostics()` - Display environmental sensor dashboard
- `displayGamingDiagnostics()` - Display gaming platform sensor dashboard
- `displaySystemDashboard()` - Display combined system dashboard
- `DashboardConfig` type - Configuration options for dashboard output


---

## Sensor Configuration

Sensor configuration controls environmental and gaming platform sensor behavior, including caching, retry logic, and XP modifier calculations.

```typescript
import {
    DEFAULT_SENSOR_CONFIG,
    loadConfigFromEnv,
    mergeConfig,
    type SensorConfig
} from 'playlist-data-engine';

// Use default configuration
const defaultConfig = DEFAULT_SENSOR_CONFIG;
console.log(defaultConfig.xpModifier.maxModifier); // 3.0

// Load configuration from environment variables
// Reads: WEATHER_API_KEY, STEAM_API_KEY, STEAM_USER_ID, XP_MAX_MODIFIER
const envConfig = loadConfigFromEnv();

// Merge custom configuration with defaults
const customConfig = mergeConfig({
    weather: {
        cacheTTL: 15 * 60 * 1000, // 15 minutes (default: 12 minutes)
        apiKey: 'your_api_key_here'
    },
    xpModifier: {
        maxModifier: 2.5, // Lower cap (default: 3.0)
        runningBonus: 0.6, // Higher bonus for running (default: 0.5)
        nightBonus: 0.3 // Higher night bonus (default: 0.25)
    },
    gaming: {
        steam: {
            pollInterval: 30000 // Poll every 30 seconds (default: 60000)
        }
    }
});

// Use configuration with EnvironmentalSensors
import { EnvironmentalSensors } from 'playlist-data-engine';

const sensors = new EnvironmentalSensors(customConfig);
```

**Available Exports:**

**Sensor Configuration:**
- `DEFAULT_SENSOR_CONFIG` - Default sensor configuration values
- `loadConfigFromEnv()` - Load config from environment variables
- `mergeConfig(userConfig?)` - Merge user config with defaults and env vars
- `type SensorConfig` - Complete sensor configuration interface
- `type GeolocationSensorConfig` - GPS sensor configuration
- `type WeatherSensorConfig` - Weather API configuration
- `type GamingSensorConfig` - Gaming platform configuration
- `type XPModifierConfig` - XP modifier calculation settings
- `type RetryConfig` - Retry behavior configuration

---

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [XP_AND_STATS.md](XP_AND_STATS.md) - XP calculation with sensor modifiers