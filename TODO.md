# Playlist Data Engine - TODO

## Overview

This document tracks what's been completed, what was recently changed, and what still needs work.

---

## Recent Changes (TypeScript Fixes)

### What Was Removed (and why it's safe)

| Item | Location | Why It's Safe |
|------|----------|---------------|
| `discordUserId` property | GamingPlatformSensors.ts | Was being stored but never used for actual Discord API calls |
| `callback` parameter | DiscordRPCClient.ts subscribeToVoiceUpdates() | Stub for future Discord voice features |
| `maxConnectionAttempts` | DiscordRPCClient.ts | Was incremented but never used for retry logic |
| `rpcEndpoint` | DiscordRPCClient.ts | Was never used for actual RPC calls |
| `longitude` parameter | GeolocationProvider.ts getBiome() | Simplified biome logic only uses latitude |
| `isListening` property | LightSensor.ts | Internal state flag that wasn't exposed |
| `attackName` parameter | AttackResolver.ts calculateAttackBonus() | Bonus calculation doesn't need attack name |
| `attacker` parameter | AttackResolver.ts rollAttack() | Attack roll (d20 + bonus) doesn't reference attacker |
| `characterClass` variable | SpellCaster.ts restoreSpellSlots() | Declared but never used in slot restoration |
| `rollInitiative` import | InitiativeRoller.ts | Import from DiceRoller was never used |
| `CombatActionResult` import | CombatEngine.ts | Imported but never referenced |
| `players` variable | CombatEngine.ts getCombatResult() | Filtered but never used |

**Bottom Line**: All removed items were truly unused. No functionality was lost.

---

## Feature Completeness Status

### ✅ Fully Implemented (~85%)

| Feature | Status | Notes |
|---------|--------|-------|
| **Audio Analysis** | Complete | FFT analysis, frequency bands, color extraction |
| **Character Generation** | Complete | D&D 5e races, classes, equipment, spells, appearance |
| **Combat System** | Complete | Initiative, attacks, damage, criticals, spell casting |
| **Progression/Leveling** | Complete | XP calculation, level-up benefits, session tracking |
| **Playlist Parsing** | Complete | Arweave support, metadata extraction, validation |
| **Dice System** | Complete | Polyhedral dice, seeded rolls, advantage/disadvantage |
| **D&D 5e Data** | Complete | Races, classes, spells, equipment, XP tables |

### ⚠️ Partially Implemented (~10%)

| Feature | Current State | What's Missing |
|---------|---------------|----------------|
| **Discord RPC** | Mock implementation only | Real Discord RPC library integration |
| **Environmental Sensors** | Basic weather/location only | Light sensor, motion detector missing |
| **Biome Detection** | Simplified (latitude only) | Real GIS service or database integration |
| **Gaming Sensors** | Steam fully functional, Discord limited | Discord voice channel detection is stub |
| **Geolocation** | Browser API works | No elevation/altitude data sources |
| **Weather** | OpenWeatherMap API works | Moon phase is hardcoded to 0.5, no forecast data |

### ❌ Not Implemented (~5%)

| Feature | Status | File |
|---------|--------|------|
| **EnvironmentalSensors** | Empty aggregator class | `src/core/sensors/EnvironmentalSensors.ts` |
| **LightSensor** | Minimal (experimental API) | `src/core/sensors/LightSensor.ts` |
| **MotionDetector** | Missing entirely | `src/core/sensors/MotionDetector.ts` (needs creation) |

---

## What To Work On Next

### Priority 1: Environmental Sensor Aggregation

**File**: [src/core/sensors/EnvironmentalSensors.ts](src/core/sensors/EnvironmentalSensors.ts)

**Current State**: Empty class that needs to combine data from all sensors into a unified `EnvironmentalContext`

**What's Needed**:
```typescript
// Combine data from:
- GeolocationProvider (biome, coordinates)
- WeatherAPIClient (weather conditions)
- LightSensor (ambient light level)
- MotionDetector (activity type)
```

---

### Priority 2: Motion Detection

**File**: Create `src/core/sensors/MotionDetector.ts`

**What's Needed**:
- Use DeviceMotion API to detect activity type
- Distinguish between: walking, running, stationary, in vehicle
- Provide `MotionData` interface with acceleration/rotation info

---

### Priority 3: Discord RPC Integration

**File**: [src/core/sensors/DiscordRPCClient.ts](src/core/sensors/DiscordRPCClient.ts)

**Current State**: Mock implementation for browser environment

**What's Needed**:
- Integrate real `discord-rpc` library
- Implement actual user authentication
- Implement real voice channel detection for party size

---

### Priority 4: Enhanced Biome Detection

**File**: [src/core/sensors/GeolocationProvider.ts](src/core/sensors/GeolocationProvider.ts)

**Current State**: Uses simple latitude heuristics

**What's Needed**:
- Integrate with a GIS service (e.g., Mapbox, Google Maps API)
- Use actual elevation/altitude data
- Implement real biome detection based on coordinates

---

### Priority 5: AttackResolver Enhancement

**File**: [src/core/combat/AttackResolver.ts](src/core/combat/AttackResolver.ts)

**Current State**: `rollDamage()` has hardcoded `abilityModifier = 0`

**What's Needed**:
```typescript
// Line 111: Should extract from attacker's ability score
const abilityModifier = 0; // TODO: Extract from attacker's ability scores
```

---

## Technical Debt Notes

### Placeholder Logic to Address

| Location | Issue | Suggested Fix |
|----------|-------|---------------|
| AttackResolver.ts:111 | `abilityModifier = 0` hardcoded | Extract from attacker's ability scores based on damage type |
| SpellCaster.ts:156 | `characterClass` was unused | Could be used for class-specific slot restoration |
| WeatherAPIClient.ts | Moon phase hardcoded to 0.5 | Implement actual lunar calculation |
| DiscordRPCClient.ts | Mock implementations | Replace with real `discord-rpc` library |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-04 | Initial release with TypeScript fixes |
| | | - Enabled strict type checking |
| | | - Fixed all type safety issues (null checks) |
| | | - Removed unused variables/imports |
| | | - Added declaration file generation |
