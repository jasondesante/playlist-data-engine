# IRL Sensors Reference

Complete guide to the environmental and gaming sensors in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [Environmental Sensors](#environmental-sensors)
2. [Gaming Sensors](#gaming-sensors)
3. [Sensor Dashboard](#sensor-dashboard)

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
```

---


## Gaming Platform Integration


**Discord RPC Dual-Mode:**

The Discord RPC integration now works in both browser and server environments with automatic detection:

- **Server Mode (Node.js)**: Full Discord Rich Presence when running in Node.js
- **Browser Mode**: Graceful degradation with console warnings (API remains compatible)

```typescript
import { GamingPlatformSensors } from 'playlist-data-engine';

// Initialize with Steam and Discord
const gamingSensors = new GamingPlatformSensors({
  steam: {
    apiKey: process.env.STEAM_API_KEY,
    steamId: '123456789',
    pollInterval: 60000  // Check every 60 seconds
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID  // Required for both modes
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

- The `@ryuziii/discord-rpc` package is now an **optional dependency**
- In browser environments, Discord music presence gracefully degrades with warnings
- Steam game detection works in both browser AND server modes
- No configuration required - environment is detected automatically


---


## Sensor Dashboard

The Sensor Dashboard provides formatted console output for sensor diagnostics during development and debugging. It displays sensor status, health indicators, cache statistics, performance metrics, and recent failures with optional ANSI color support (auto-disabled in non-TTY environments like CI).

### Basic Usage

```typescript
import { SensorDashboard, EnvironmentalSensors, GamingPlatformSensors } from 'playlist-data-engine';

// Initialize sensors
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
const gamingSensors = new GamingPlatformSensors({
    steamApiKey: process.env.STEAM_API_KEY,
    discordClientId: process.env.DISCORD_CLIENT_ID
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
- Platform Status - Steam authentication/API key, Discord connection state
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
