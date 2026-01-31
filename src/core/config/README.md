# Sensor Configuration Guide

This guide explains how to configure the Core Data Engine's sensor modules, including environmental sensors (geolocation, weather, motion, light) and gaming platform sensors (Steam, Discord RPC).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration Options](#configuration-options)
- [Environment Variables](#environment-variables)
- [Programmatic Configuration](#programmatic-configuration)
- [Default Values](#default-values)

## Overview

The sensor system supports two configuration methods:

1. **Environment Variables** - Set environment variables for API keys and basic options
2. **Programmatic Configuration** - Pass configuration objects to constructors for fine-grained control

All configuration options have sensible defaults, so you only need to configure what you want to customize.

## Quick Start

### Using Environment Variables

```bash
# .env file
WEATHER_API_KEY=your_openweathermap_api_key
STEAM_API_KEY=your_steam_api_key
STEAM_USER_ID=your_64bit_steam_id
DISCORD_CLIENT_ID=your_discord_client_id
```

### Using Programmatic Configuration

```typescript
import { mergeConfig } from './core/config';
import { EnvironmentalSensors } from './core/sensors/EnvironmentalSensors';

// Create custom configuration
const config = mergeConfig({
    weather: {
        cacheTTL: 15 * 60 * 1000, // 15 minutes
        apiKey: process.env.WEATHER_API_KEY
    },
    xpModifier: {
        maxModifier: 2.5,
        altitudeBonus: 0.5
    }
});

// Use the configuration
const sensors = new EnvironmentalSensors({
    weather: config.weather,
    xpModifier: config.xpModifier
});
```

## Configuration Options

### Weather Sensor Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `''` | OpenWeatherMap API key |
| `cacheTTL` | `number` | `720000` (12 min) | Current weather cache TTL in ms |
| `forecastCacheTTL` | `number` | `3600000` (60 min) | Forecast cache TTL in ms |
| `useLocalStorage` | `boolean` | `true` | Enable localStorage persistence |

### Geolocation Sensor Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cacheTTL` | `number` | `300000` (5 min) | GPS cache TTL in ms |
| `useLocalStorage` | `boolean` | `true` | Enable localStorage persistence |
| `enableHighAccuracy` | `boolean` | `true` | High accuracy GPS mode |
| `timeout` | `number` | `5000` (5 sec) | GPS timeout in ms |

### Gaming Platform Configuration

#### Steam Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | `''` | Steam Web API key |
| `steamId` | `string` | `undefined` | 64-bit Steam ID |
| `pollInterval` | `number` | `60000` (1 min) | Polling interval in ms |

#### Discord RPC Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `clientId` | `string` | `''` | Discord application client ID |
| `enableRichPresence` | `boolean` | `true` | Enable Rich Presence |
| `pollInterval` | `number` | `60000` (1 min) | Polling interval in ms |

#### Gaming Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `metadataCacheExpiry` | `number` | `86400000` (24 hr) | Game metadata cache expiry in ms |
| `maxBackoffMs` | `number` | `600000` (10 min) | Max backoff delay for errors in ms |

### XP Modifier Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxModifier` | `number` | `3.0` | Maximum total XP modifier |
| `maxGamingModifier` | `number` | `1.75` | Maximum gaming XP modifier |
| `runningBonus` | `number` | `0.5` | Running bonus (+50%) |
| `walkingBonus` | `number` | `0.2` | Walking bonus (+20%) |
| `stormBonus` | `number` | `0.4` | Rain/storm bonus (+40%) |
| `snowBonus` | `number` | `0.3` | Snow bonus (+30%) |
| `nightBonus` | `number` | `0.25` | Night bonus (+25%) |
| `altitudeThreshold` | `number` | `1000` | Altitude threshold in meters |
| `altitudeBonus` | `number` | `0.3` | High altitude bonus (+30%) |
| `gamingBaseBonus` | `number` | `0.25` | Base gaming bonus (+25%) |
| `gamingRPGBonus` | `number` | `0.2` | RPG genre bonus (+20%) |
| `gamingMultiplayerBonus` | `number` | `0.15` | Multiplayer bonus (+15%) |

### Retry Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable retry logic |
| `maxRetries` | `number` | `3` | Maximum retry attempts |
| `initialDelayMs` | `number` | `1000` (1 sec) | Initial retry delay in ms |
| `maxDelayMs` | `number` | `10000` (10 sec) | Maximum retry delay in ms |
| `backoffMultiplier` | `number` | `2` | Exponential backoff multiplier |

## Environment Variables

The following environment variables are supported:

| Variable | Description |
|----------|-------------|
| `WEATHER_API_KEY` | OpenWeatherMap API key |
| `STEAM_API_KEY` | Steam Web API key |
| `STEAM_USER_ID` | Your 64-bit Steam ID |
| `DISCORD_CLIENT_ID` | Discord application client ID |
| `XP_MAX_MODIFIER` | Maximum XP modifier (e.g., `3.0`) |

## Programmatic Configuration

### Individual Sensor Configuration

```typescript
import { WeatherAPIClient } from './core/sensors/WeatherAPIClient';
import { GeolocationProvider } from './core/sensors/GeolocationProvider';

// Weather API with custom cache TTL
const weather = new WeatherAPIClient({
    apiKey: 'your_api_key',
    cacheTTL: 15 * 60 * 1000, // 15 minutes
    useLocalStorage: true
});

// Geolocation with custom config
const geo = new GeolocationProvider({
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    enableHighAccuracy: true,
    timeout: 10000 // 10 seconds
});
```

### Environmental Sensors Configuration

```typescript
import { EnvironmentalSensors } from './core/sensors/EnvironmentalSensors';

// Full configuration
const sensors = new EnvironmentalSensors({
    weather: {
        apiKey: process.env.WEATHER_API_KEY,
        cacheTTL: 15 * 60 * 1000
    },
    geolocation: {
        cacheTTL: 5 * 60 * 1000,
        enableHighAccuracy: true
    },
    retry: {
        maxRetries: 5,
        initialDelayMs: 2000
    },
    xpModifier: {
        maxModifier: 2.5,
        runningBonus: 0.4
    }
});
```

### Gaming Platform Configuration

```typescript
import { GamingPlatformSensors } from './core/sensors/GamingPlatformSensors';

// Gaming sensors with custom config
const gaming = new GamingPlatformSensors({
    steam: {
        apiKey: process.env.STEAM_API_KEY,
        steamId: process.env.STEAM_USER_ID,
        pollInterval: 30000 // 30 seconds
    },
    discord: {
        clientId: process.env.DISCORD_CLIENT_ID,
        enableRichPresence: true
    },
    metadataCacheExpiry: 48 * 60 * 60 * 1000, // 48 hours
    xpModifier: {
        maxGamingModifier: 2.0,
        gamingRPGBonus: 0.25
    }
});
```

## Default Values

All configuration values have defaults. See `sensorConfig.ts` for the complete `DEFAULT_SENSOR_CONFIG` object.

```typescript
import { DEFAULT_SENSOR_CONFIG } from './core/config';

console.log(DEFAULT_SENSOR_CONFIG);
```

## Legacy Constructor Support

The sensor classes maintain backward compatibility with legacy constructor signatures:

```typescript
// Legacy (still works)
const weather = new WeatherAPIClient('api_key', 12, true);
const geo = new GeolocationProvider(5, true);

// New (recommended)
const weather = new WeatherAPIClient({ apiKey: 'api_key', cacheTTL: 12 * 60 * 1000 });
const geo = new GeolocationProvider({ cacheTTL: 5 * 60 * 1000 });
```

## Configuration Merging

When using both environment variables and programmatic configuration, the merge order is:

1. Default values
2. Environment variables
3. Programmatic configuration

Programmatic configuration takes precedence over environment variables.

```typescript
import { mergeConfig } from './core/config';

const config = mergeConfig({
    weather: {
        cacheTTL: 20 * 60 * 1000 // Overrides any environment variable
    }
});
```
