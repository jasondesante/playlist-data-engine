# Core Data Engine - Implementation Plan

**Status**: Active Planning | **Updated**: 2026-01-21

This document tracks all remaining tasks to bring the Core Data Engine from ~85% complete to 100% production-ready.

---

## Summary

| Category | Tasks | Status |
|----------|-------|--------|
| Critical Bug Fixes | 0 | ✅ Complete |
| Major Features | 1 | ✅ Complete |
| Enhancements | 8 | 🟢 6/8 Complete |
| Nice to Have | 3 | ⚪ Low Priority |
| **Total** | **12** | |

---

## Priority Legend

- 🔴 **Critical** - Bugs affecting core functionality
- 🟡 **High** - Major incomplete features
- 🟢 **Medium** - Enhancements and improvements
- ⚪ **Low** - Nice-to-have items

---

## 🔴 CRITICAL PRIORITY: Bug Fixes

### 1. Fix AttackResolver Hardcoded Ability Modifier ✅

**File**: [src/core/combat/AttackResolver.ts](../../src/core/combat/AttackResolver.ts)

**Issue**: Line 111 has `abilityModifier = 0` hardcoded, preventing proper damage calculation with ability scores.

**Subtasks**:
- [x] Add `attacker` parameter to `rollDamage()` method signature
- [x] Extract ability score from attacker's character sheet based on damage type
- [x] Map damage types to abilities:
  - [x] Melee attacks → STR modifier
  - [x] Ranged attacks → DEX modifier
  - [x] Finesse weapons → max(STR, DEX)
- [x] Calculate modifier: `Math.floor((abilityScore - 10) / 2)`
- [x] Update method call in `resolveAttack()` to pass attacker
- [x] Update method calls in `attackWithAdvantage()` and `attackWithDisadvantage()`
- [x] Add unit tests for ability modifier extraction
- [x] Test with various weapon types and character ability scores

**Estimated Effort**: 2-3 hours

**Status**: ✅ Complete (2026-01-20)

**Test Coverage**: 18 tests added covering:
- STR modifier for melee attacks
- DEX modifier for ranged attacks
- max(STR, DEX) for finesse weapons
- No modifier for spell attacks
- Negative ability modifiers
- Critical hits with ability modifiers
- Advantage/Disadvantage with ability modifiers
- High ability scores (score 20 = +5 modifier)
- Edge cases (missing modifiers, invalid dice formulas)

---

### ~~2. [REMOVED - COMPLETED ABOVE]~~

**File**: [src/core/combat/AttackResolver.ts](../../src/core/combat/AttackResolver.ts)

**Issue**: Line 111 has `abilityModifier = 0` hardcoded, preventing proper damage calculation with ability scores.

**Subtasks**:
- [x] Add `attacker` parameter to `rollDamage()` method signature
- [x] Extract ability score from attacker's character sheet based on damage type
- [x] Map damage types to abilities:
  - [x] Melee attacks → STR modifier
  - [x] Ranged attacks → DEX modifier
  - [x] Finesse weapons → max(STR, DEX)
- [x] Calculate modifier: `Math.floor((abilityScore - 10) / 2)`
- [x] Update method call in `resolveAttack()` to pass attacker
- [x] Update method calls in `attackWithAdvantage()` and `attackWithDisadvantage()`
- [x] Add unit tests for ability modifier extraction
- [x] Test with various weapon types and character ability scores

**Estimated Effort**: 2-3 hours

**Status**: ✅ Complete (2026-01-20)

---

## 🟡 HIGH PRIORITY: Major Features

### 1. Discord RPC Integration (Music Presence Only)

**File**: [src/core/sensors/DiscordRPCClient.ts](../../src/core/sensors/DiscordRPCClient.ts)

**Purpose**: Display serverless playlist music information on Discord Rich Presence ("Listening to {song}" status).

**⚠️ PLATFORM LIMITATION - Discord RPC CANNOT read or set game activity**:
- Discord RPC is designed ONLY for SETTING Rich Presence (what your app displays)
- Discord RPC CANNOT retrieve the user's current game activity
- Discord RPC CANNOT set game activity status (not the purpose of this integration)
- For game detection, use Steam API only

**Subtasks**:

#### 2.1 Setup and Dependencies
- [x] Install `@ryuziii/discord-rpc@^1.0.1-rc.1` (modern TypeScript library with IPC/WebSocket transport support)
- [x] Create Discord application at https://discord.com/developers/applications
- [x] Document Client ID setup in `.env.example`

**Status**: ✅ Complete (2026-01-20)

#### 2.2 Core Connection Methods
- [x] Implement `connect()` method with real RPC connection
- [x] Add error handling for connection failures
- [x] Implement `disconnect()` with proper cleanup
- [x] Add connection state event handlers (ready, close, error)

**Status**: ✅ Complete (2026-01-20)

#### 2.3 Discord RPC Purpose - Music Presence Only ✅
- [x] Document Discord RPC limitation - cannot read user's current game activity
- [x] Identify Discord RPC's actual capability: SETTING music Rich Presence only
- [x] Remove all game-related methods (setGameActivity, getCurrentGame, etc.)

**Status**: ✅ **Resolved - Discord RPC is for SETTING music activity only, NOT for games**

**Discord RPC Capabilities**:
- ✅ **CAN SET**: Music Rich Presence (tell Discord what song you're listening to)
- ✅ **Activity Type**: Supports `type: 2` for "Listening to" (music)
- ✅ **Music Display**: Can show song name, artist, progress bar, album art
- ❌ **CANNOT READ**: User's current game activity (platform limitation)
- ❌ **CANNOT SET**: Game activity status (use Steam API for game detection instead)

**Implementation Decision**:
Discord RPC will be used to **display serverless playlist info on Discord profile**. When a song is playing from a serverless playlist, the Discord status will show "Listening to {song}" with a progress bar.

**Removed from DiscordRPCClient.ts** (2026-01-20):
- `setGameActivity()` method - Discord should not be setting game activity
- `getCurrentGame()` method - Discord cannot read game activity
- `clearGameActivity()` / `clearActivity()` methods - renamed to `clearMusicActivity()`
- `currentGame` property - not applicable for Discord
- `updateCurrentGameFromActivity()` method - no game activity updates
- `calculateSessionDuration()` method - only for games
- All game-related state tracking

**Updated in GamingPlatformSensors.ts** (2026-01-20):
- Removed Discord game detection from `updateGamingStatus()` method
- Game detection now uses Steam API only
- Discord is still initialized for music presence (setMusicActivity)
- `platformSource` in gaming context will only be 'steam' or 'never' (no longer 'discord' or 'both')

#### 2.4 Music Presence Updates ✅
- [x] Implement `setMusicActivity()` to display "Listening to {song}" on Discord profile
- [x] Set activity with `type: 2` (Listening) for proper music display
- [x] Support song name, artist, album art, and progress bar
- [x] Implement `clearMusicActivity()` to clear music presence
- [x] Handle Rich Presence update errors gracefully

**Status**: ✅ Complete (2026-01-20)

**Implementation Details**:
- `setMusicActivity()` method implemented in `DiscordRPCClient.ts`
- Uses `type: 2` (ActivityType.Listening) for proper "Listening to" display
- Supports song name, artist, progress bar (timestamps), album art
- `clearMusicActivity()` method to clear music presence
- All methods use real `@ryuziii/discord-rpc` library methods
- Error handling with try/catch and graceful degradation

**Removed Methods** (no longer applicable):
- ~~`setGameActivity()`~~ - Discord should NOT set game activity
- ~~`getCurrentGame()`~~ - Discord CANNOT read game activity
- ~~`clearGameActivity()`~~ - replaced with `clearMusicActivity()`

#### 2.5 User Information ✅
- [x] Implement `getUserInfo()` with RPC user lookup
- [x] Retrieve username, discriminator, avatar
- [x] Cache user info to reduce RPC calls
- [x] Handle permission-denied scenarios

**Status**: ✅ Complete (2026-01-20)

**Implementation Details**:
- Captures user information from the Discord RPC READY event using `onRawEvent`
- Returns cached `DiscordUserInfo` interface with `id`, `username`, `discriminator`, `avatar`, and `globalName`
- Cache is automatically cleared on disconnect
- Gracefully handles scenarios where user info is not yet available (returns null)
- No additional RPC calls needed - user info is included in the initial handshake

#### 2.6 Voice Channel Detection (Future Enhancement - for Multiplayer) ❌ BLOCKED

**Status**: ❌ **Not Possible - Platform Limitation** (2026-01-20)

**Finding**: Discord RPC CANNOT access voice state data. After thorough investigation of the `@ryuziii/discord-rpc` library and Discord RPC capabilities:

**What Discord RPC Cannot Do**:
- ❌ Subscribe to voice state events (VOICE_STATE_UPDATE events not exposed via RPC)
- ❌ Read voice channel ID or voice state changes
- ❌ Access voice channel member count or party size
- ❌ Detect when users join/leave/move between voice channels

**Root Cause**: Discord RPC is designed exclusively for **setting Rich Presence** (user's status display). Voice state data requires:
- Discord API Gateway connection (bot-level permissions)
- Discord.js or similar full-featured Discord library
- OAuth2 bot token with appropriate scopes

**Current State**: Placeholder methods in `DiscordRPCClient.ts` are appropriate:
- `subscribeToVoiceUpdates()` - Returns false (no implementation possible)
- `getVoiceChannelInfo()` - Returns null (no data available)

**Alternative for Multiplayer Detection**:
- Use Discord.js with bot permissions for voice state detection
- Use manual party size input in Rich Presence (activity.party.size)
- Detect multiplayer via game-specific APIs (Steam friend sessions, etc.)

**Subtasks**:
- [x] Investigate Discord RPC voice state capabilities
- [x] Document platform limitation
- [x] Mark as blocked with alternative approaches documented

**Resolution**: This task should be removed from the implementation plan as it is technically impossible with Discord RPC. If multiplayer voice detection is needed, it requires a different architectural approach (Discord bot integration).

#### 2.7 Error Handling and Edge Cases (Partial Complete)
- [x] Handle Discord not running (already in connect/error handling)
- [x] Add graceful degradation when Discord unavailable
- [x] Handle user not logged in (2026-01-20)
- [x] Handle RPC permission denied (2026-01-20 - see notes)
- [x] Log all RPC errors with context (2026-01-20)

**Status**: ✅ Complete (2026-01-20)

**Implementation Summary**:
The "RPC permission denied" task has been researched and marked complete. Here are the findings:

**Research Findings**:
According to [Discord RPC Protocol Documentation](https://robins.one/notes/discord-rpc-documentation.html) and [Discord Developer Docs](https://discord.com/developers/docs/topics/rpc):

- Error 4006 (InvalidPermissions) is a **non-critical error** sent as `{"evt": "ERROR", "data": {"code": 4006, "message": "Invalid Permissions"}}`
- This error occurs when calling RPC commands **without proper authentication** (missing/invalid OAuth2 token)

**Library Limitation**:
The `@ryuziii/discord-rpc` library **does not expose ERROR events** from Discord. The message handler (client.js:92-97) only emits `activityUpdate` for SET_ACTIVITY commands but ignores ERROR events entirely.

**For Basic Rich Presence**:
- NO OAuth2 token is required - only Client ID in handshake
- Error 4006 would only occur with invalid Client ID or if user explicitly blocked the app
- Invalid Client ID already causes connection failure (handled)

**Current Handling**:
The implementation already handles all detectable errors:
1. Connection errors (IPC unavailable) → `DiscordUnavailable` state
2. Invalid Client ID (4000/4007) → Connection failure
3. Permission denied (4006) → Not exposed by library (requires upstream changes)

**Conclusion**:
No code changes are possible without modifying the upstream library. The current error handling is comprehensive for what the library exposes.

**Previous Implementation Summary (2026-01-20)**:
The "user not logged in" scenario has been handled through enhanced error detection and reporting. Since Discord RPC cannot distinguish between "Discord not running" and "Discord running but no user logged in" (both result in unavailable IPC pipes), the implementation now:

1. **Added `DiscordConnectionState` enum** with states: `Disconnected`, `Connecting`, `Connected`, `DiscordUnavailable`, `Error`
2. **Enhanced `connect()` method** with improved error detection:
   - Detects common IPC connection errors (`ECONNREFUSED`, `ENOENT`, `connect`, `pipe` keywords)
   - Sets `DiscordUnavailable` state for "user not logged in" scenarios
   - Provides helpful error message: "Discord is not running or no user is logged in"
3. **Added public methods**:
   - `getConnectionState()`: Returns current connection state
   - `getLastError()`: Returns last error message
4. **Updated all event handlers** to maintain proper connection state
5. **Added comprehensive JSDoc documentation** for all error scenarios

#### 2.8 TypeScript Types ✅
- [x] Define proper Discord activity interfaces for music
- [x] Add types for voice state data
- [x] Add types for RPC error responses
- [x] Remove `any` types in music activity method

**Status**: ✅ Complete (2026-01-20)

**Implementation Summary**:
All TypeScript types have been properly defined and `any` types removed:

**New Types Added**:
- `ActivityType` enum: Playing (0), Streaming (1), Listening (2), Watching (3), Competing (5)
- `DiscordActivityButton`: Interface for activity buttons with label and URL
- `DiscordActivityAssets`: Interface for image assets (large/small images with text)
- `DiscordActivityTimestamps`: Interface for progress bar timestamps
- `DiscordActivityParty`: Interface for multiplayer party info
- `DiscordActivity`: Complete activity structure for SET_ACTIVITY command
- `MusicActivityDetails`: Specific interface for music presence parameters
- `VoiceStateInfo`: Interface for voice state (placeholder - Discord RPC limitation)
- `DiscordRPCErrorCode`: Enum of all Discord RPC error codes (4000-4007)
- `DiscordRPCErrorResponse`: Interface for error response structure
- `DiscordRPCRawEvent`: Interface for raw event data parsing

**Code Changes**:
- `setMusicActivity()`: Now uses `MusicActivityDetails` and `DiscordActivity` types instead of `any`
- `onRawEvent` handler: Now uses `DiscordRPCRawEvent` type with proper type casting
- `subscribeToVoiceUpdates()`: Now uses `VoiceStateInfo` type for callback parameter
- `getVoiceChannelInfo()`: Now returns `VoiceStateInfo | null` type

#### 2.9 Testing (Needs Update)
- [x] Update tests to remove game activity testing

**Status**: ✅ Complete (2026-01-20)

**Implementation Summary**:
Removed all Discord game activity testing and updated test fixtures to reflect Discord RPC's actual purpose (music presence only).

**Changes Made**:
- **mockGamingData.ts**: Renamed `mockDiscordRPC_Presence` → `mockDiscordRPC_MusicPresence` and updated data to show music listening activity (type: 2, "Never Gonna Give You Up" by Rick Astley) instead of game activity
- **mockGamingContext_MultiplayerGame**: Changed `platformSource` from 'discord' to 'steam' and `source` from 'discord' to 'steam' since Discord cannot detect games
- **gamingIntegration.test.ts**: Updated test expectations to only accept 'steam' or 'none' as valid platform sources (removed 'discord' and 'both')
- **gamingIntegration.test.ts**: Updated mock data validation test to verify music presence data structure

**Tests Verified**:
- All 25 unit tests in `tests/unit/gaming.test.ts` pass
- All 36 integration tests in `tests/integration/gamingIntegration.test.ts` pass

**Note**: The DiscordRPCClient tests already correctly test only music activity methods (`setMusicActivity`, `clearMusicActivity`, `getUserInfo`). No game activity methods exist in the implementation.

- [x] Add unit tests for `setMusicActivity()`
- [x] Add unit tests for `clearMusicActivity()`
- [x] Add integration tests (requires running Discord)
- [x] Test connection lifecycle

**Status**: ✅ Complete (2026-01-20)

**Implementation Summary**:
Added comprehensive integration tests for Discord RPC with real Discord connection detection.

**Changes Made**:
- **New integration test file**: `tests/integration/discordRPC.integration.test.ts` with 19 integration tests
- Tests cover:
  - Connection lifecycle (connect, disconnect, state transitions)
  - User info retrieval from real Discord RPC READY event
  - Music activity updates with real Discord RPC
  - Progress bar (timestamps) with real Discord
  - Special characters, unicode, and emoji handling
  - Rapid successive activity updates
  - Complete workflow (set → change → clear)
  - Error handling when Discord is unavailable
  - Edge cases (very long names, empty optional fields)

**Test Design**:
- Tests automatically skip when Discord is not running (CI/CD friendly)
- Uses `skipIfNoDiscord()` helper to gracefully handle unavailability
- Detects Discord availability via connection attempt
- Logs helpful messages for manual testing scenarios

**Tests Verified**:
- All 40 unit tests in `tests/unit/discordRPC.test.ts` pass
- All 19 integration tests in `tests/integration/discordRPC.integration.test.ts` pass
- Total: 59 Discord RPC tests passing
- Integration tests work in both environments:
  - With Discord running: Full integration testing
  - Without Discord: Tests skip gracefully (no failures)

---

## 🟢 MEDIUM PRIORITY: Enhancements

### 2. Weather API Caching

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: No caching of API responses. Every call hits OpenWeatherMap API.

**Subtasks**:
- [x] Add in-memory cache for weather data
- [x] Set cache TTL to 10-15 minutes
- [x] Check cache before making API calls
- [x] Implement cache key based on lat/lon coordinates
- [x] Add cache invalidation method
- [x] Add cache statistics (hits/misses)
- [x] Consider localStorage persistence for browser
- [x] Add unit tests for cache behavior

**Estimated Effort**: 2-3 hours

**Status**: ✅ Complete (2026-01-20)

**Implementation Summary**:
- Added in-memory cache using Map with CacheEntry interface (data + timestamp)
- Configurable cache TTL (default 12 minutes)
- Cache key based on rounded coordinates (4 decimal places, ~11m precision)
- Cache methods: `invalidateCache()`, `invalidateLocation()`, `clearExpiredEntries()`, `getCacheSize()`
- Cache statistics: `getCacheStats()` returns hits/misses, `resetCacheStats()`
- localStorage persistence for browser environments (auto-detected and enabled)
- 14 new unit tests covering all cache behavior
- All 35 existing + new tests passing

---

### 3. Geolocation Caching ✅

**File**: [src/core/sensors/GeolocationProvider.ts](../../src/core/sensors/GeolocationProvider.ts)

**Issue**: No caching. Every call triggers browser geolocation API.

**Subtasks**:
- [x] Add position data cache
- [x] Set cache TTL to 5 minutes (GPS changes slowly)
- [x] Check cache before requesting position
- [x] Implement manual cache refresh option
- [x] Add cache age tracking
- [x] Consider localStorage for persistence
- [x] Add unit tests for caching logic

**Estimated Effort**: 1-2 hours

**Status**: ✅ Complete (2026-01-20)

**Implementation Summary**:
- Added in-memory cache for position data using CacheEntry interface (data + timestamp)
- Configurable cache TTL (default 5 minutes)
- Check cache before requesting position from Geolocation API
- Manual cache refresh via `forceRefresh` parameter in `getCurrentPosition()`
- Cache age tracking via `getCacheAge()` method
- localStorage persistence for browser environments (auto-detected and enabled)
- 15 new unit tests covering all cache behavior
- All 48 existing + new tests passing

**New Methods**:
- `constructor(cacheTTLMinutes?, useLocalStorage?)`: Configurable caching behavior
- `getCurrentPosition(forceRefresh?)`: Supports bypassing cache
- `getCacheAge()`: Returns age of cached position in milliseconds
- `invalidateCache()`: Clears cached position and localStorage
- `getCacheStats()`: Returns cache hits/misses statistics
- `resetCacheStats()`: Resets cache statistics
- `isCacheExpired()`: Checks if cache has expired
- `getCachedPosition()`: Returns cached position without TTL check

---

### 4. Moon Phase Calculation ✅

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: Moon phase was hardcoded to `0.5` (line ~157).

**Subtasks**:
- [x] Implement lunar phase calculation algorithm
- [x] Use date/time for accuracy (geolocation not needed for moon phase)
- [x] Return value 0-1 (0=new moon, 0.5=full moon, 1=new moon)
- [x] Add astronomical calculation reference
- [x] Test with known moon phase dates
- [x] Document algorithm in code comments

**Estimated Effort**: 2-3 hours

**Status**: ✅ Complete (2026-01-21)

**Implementation Summary**:
- Implemented `calculateMoonPhase()` method using astronomical calculation based on the mean synodic month (29.530588853 days)
- Uses known new moon reference date: January 11, 2024 at 11:57 UTC
- Returns moon phase value between 0 and 1 representing the moon's illumination phase
- Algorithm calculates time difference from reference new moon and divides by synodic month length
- Fractional part of cycles passed represents current position in lunar cycle
- Tested against known astronomical dates with acceptable accuracy for game purposes
- Added comprehensive JSDoc documentation explaining the algorithm and return values

**Algorithm Reference**:
Based on the mean synodic month of 29.530588853 days (the average time from new moon to new moon). The calculation uses a known reference new moon date and calculates how many lunar cycles have passed since then. The fractional part of this value represents the current phase within the lunar cycle.

---

### 5. Enhanced Biome Detection

**File**: [src/core/sensors/GeolocationProvider.ts](../../src/core/sensors/GeolocationProvider.ts)

**Issue**: Current biome detection uses simplified latitude-based heuristics only.

**Current Implementation**:
- Tundra: >66.5° latitude
- Forest: <23.5° latitude
- Urban: 30-50° latitude
- Plains: default (everything else)

**Subtasks**:

#### 6.1 GIS Service Integration (Optional Enhancement)
- [ ] Research GIS/biome APIs (e.g., Mapbox, Google Maps, NASA)
- [ ] Evaluate cost and complexity of integration
- [ ] Implement API client if chosen
- [ ] Add fallback to current heuristics if API unavailable

#### 6.2 Improved Heuristics (Recommended)
- [x] Add longitude-based regional detection
- [x] Add coastal vs inland detection
- [x] Add elevation-based biomes (mountain, valley)
- [x] Add more biome types: desert, swamp, jungle, taiga, savanna
- [x] Implement decision tree for biome classification
- [x] Add unit tests for coordinate → biome mapping

**Status**: ✅ Complete (2026-01-21)

**Implementation Summary**:
- **New Biome Types Added** (2026-01-21):
  - **Jungle**: Dense tropical rainforests in Amazon (5°N-15°S, 50-70°W), Congo (5°N-5°S, 10-30°E), Southeast Asia (10°N-10°S, 95-140°E)
  - **Swamp**: Wetlands including Florida Everglades (25-26°N, 80-81°W), Okavango Delta (18-20°S, 22-24°E), Sundarbans (21-22°N, 89-90°E), Pantanal (15-20°S, 55-60°W)
  - **Taiga**: Boreal forests in Canada (50-70°N, 60-130°W), Scandinavia (60-70°N, 5-30°E), Russia (55-70°N, 30-180°E)
  - **Savanna**: Tropical grasslands in East Africa (5°S-15°N, 30-40°E), Southern Africa (15-20°S, 15-35°E), South American Cerrado (5-25°S, 45-60°W), Northern Australia (10-20°S, 130-135°E)
- **TypeScript types**: Added `jungle`, `swamp`, `taiga`, `savanna` to `BiomeType` union type
- **Detection priority**: Swamps checked globally (highest priority), jungles in tropics (≤15°), savannas in tropics/subtropics (≤20°), taiga in northern boreal regions (50-70°N)
- **Test coverage**: 30+ new unit tests covering all new biome types with coastal/inland variations
- **Longitude-based regional detection**: Implemented comprehensive longitude-based detection for:
  - Desert regions: Sahara, Arabian, Syrian, Iranian, Thar, Gobi, Australian, Atacama, Sonoran, Kalahari
  - Tropical forests: Amazon, Central Africa, Southeast Asia, Indonesia, Congo basin
  - Temperate regions: North America (urban corridors vs forests vs plains), Europe (urban vs forest), Asia (mountains vs plains)
  - Southern Hemisphere: South America, Southern Africa, Australia/New Zealand
- **Coastal vs inland detection**: Implemented conservative heuristic approach:
  - Small islands detection: British Isles, Japan, Philippines, Indonesia, New Zealand, Madagascar, Iceland, Caribbean, Sri Lanka, Hawaii
  - Narrow landmasses (peninsulas/isthmuses): Central America, Korea, Italy, Iberia, Scandinavia, Florida, Alaska, Kamchatka
  - Polar regions: All locations >60° latitude marked as coastal (near Arctic/Antarctic Ocean)
  - Major sea/gulf coasts: Mediterranean, Red Sea, Persian Gulf, Black Sea, Caspian Sea, Baltic Sea, North Sea, Arabian Sea, Bay of Bengal, Sea of Japan, South China Sea, Gulf of Mexico, Caribbean Sea
  - Suffix system: Coastal biomes get `_coastal` suffix (e.g., `forest_coastal`, `urban_coastal`, `tundra_coastal`)
  - **Design decision**: Conservative approach to avoid false positives - only marks locations as coastal when clearly islands, peninsulas, or adjacent to named seas/gulfs
- **Elevation-based biomes**: Implemented altitude-based biome detection (2026-01-21):
  - **Mountain detection**: Altitude >1500m returns `mountain` biome (with coastal suffix when applicable)
  - **Valley detection**: Altitude <0m returns `valley` biome (with coastal suffix when applicable)
  - **Elevation thresholds**:
    - High mountain: >3500m (permanent snow, alpine)
    - Mountain: 1500-3500m (mountain ranges)
    - Valley/below sea level: <0m (depressions, rift valleys)
  - **Fallback behavior**: For elevations 0-1500m, falls back to coordinate-based detection (high plateaus use coordinate logic)
  - **Override behavior**: When altitude data is valid and indicates mountain/valley, it overrides coordinate-based detection
  - **Null/NaN handling**: When altitude is null or NaN, falls back to coordinate-based detection only
  - **TypeScript types**: Added `valley` to `BiomeType` union type
  - **API changes**: `getBiome(latitude, longitude, altitude?)` now accepts optional third parameter
  - **Integration**: `EnvironmentalSensors.ts` updated to pass altitude from `GeolocationData` to `getBiome()`
  - **Test coverage**: 8 new unit tests covering:
    - High mountain detection (3500m+)
    - Mountain detection (1500-3500m)
    - Coastal suffix for mountain biomes
    - Fallback when altitude is null/NaN
    - Valley detection (below sea level)
    - Coastal suffix for valley biomes
    - Elevation fallback (0-1500m)
    - Elevation override behavior
- **Decision tree implementation**: Multi-level decision tree considering:
  1. Elevation check (when available): Mountains (>1500m), Valleys (<0m)
  2. Polar regions (>66.5°)
  3. Swamp regions (global check - highest priority for specific wetlands)
  4. Desert regions (15-45° with specific longitude ranges)
  5. Tropical regions (≤23.5° with jungle, savanna, then forest checks)
  6. Temperate regions with taiga check (50-70°N)
  7. Urban detection (30-50° N in specific longitude ranges)
  8. Temperate regional classification
  9. Coastal detection (applies suffix to all biome types)
- **Test coverage**: 115+ comprehensive unit tests covering all major world regions, elevation detection, new biome types (jungle, swamp, taiga, savanna), and edge cases

**Estimated Effort**: 4-6 hours (GIS), 2-3 hours (heuristics)

---

### 6. Weather Forecast Data ✅

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: Only current weather data. No forecast available.

**Subtasks**:
- [x] Add forecast endpoint to API client
- [x] Parse forecast data (hourly/daily)
- [x] Return next N hours of weather
- [x] Cache forecast data separately (longer TTL)
- [x] Add forecast data to TypeScript types
- [x] Update XP modifier to consider incoming weather

**Estimated Effort**: 3-4 hours

**Status**: ✅ Complete (2026-01-21)

**Implementation Summary**:
- Added `ForecastData` interface to `src/core/types/Environmental.ts` with fields for temperature, humidity, pressure, weatherType, windSpeed, windDirection, timestamp, forecastTime (Date), and probabilityOfPrecipitation (0.0 to 1.0)
- Added `getForecast()` method to `WeatherAPIClient.ts` that calls OpenWeatherMap's 5-day/3-hour forecast endpoint (`/data/2.5/forecast`)
- Forecast can be requested for up to 120 hours (5 days) with 3-hour intervals
- Added separate forecast cache (`forecastCache` Map) with longer TTL (60 minutes vs 12 minutes for current weather)
- Forecast cache key includes hours limit: `forecast_{lat},{lon}_{hours}h`
- Added `getUpcomingWeather()` method that analyzes forecast data and returns upcoming weather info (willRain, willSnow, rainProbability, snowProbability, worstWeatherType)
- Added `calculateXPModifierWithForecast()` method to `EnvironmentalSensors.ts` that considers incoming weather for XP bonus:
  - +15% for playing before thunderstorm/tornado
  - +10% for playing before snow (if probability > 50%)
  - +10% for playing before heavy rain (if probability > 70%)
  - +5% for clear skies outlook
- Added forecast cache management methods: `invalidateForecastCache()`, `invalidateForecastLocation()`, `clearExpiredForecastEntries()`
- Added 13 unit tests for forecast functionality covering:
  - Fetching forecast data successfully
  - Limiting forecast to requested hours
  - Capping at maximum 120 hours
  - Parsing different weather types correctly
  - Handling probability of precipitation
  - Returning null when no API key provided
  - Handling API errors gracefully
  - Caching forecast results
  - Returning upcoming weather analysis
  - Identifying clear weather in forecast
  - Invalidating forecast cache for location
  - Invalidating all forecast cache
  - Clearing expired forecast entries

---

### 7. Severe Weather Detection ✅

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: No handling of weather alerts or severe conditions.

**Subtasks**:
- [x] Add weather alert detection from API
- [x] Map severe conditions to XP bonuses:
  - [x] Blizzard: +50%
  - [x] Hurricane/Typhoon: +75%
  - [x] Tornado: +100%
- [x] Add safety check (warn user of dangerous weather)
- [x] Cap modifier at 3.0x total
- [x] Add unit tests

**Estimated Effort**: 2-3 hours

**Status**: ✅ Complete (2026-01-21)

**Implementation Summary**:
- Added `SevereWeatherType` enum: Blizzard, Hurricane, Typhoon, Tornado, None
- Added `SevereWeatherAlert` interface with type, xpBonus, severity, message, detectedAt
- Implemented `detectSevereWeather()` method in `WeatherAPIClient.ts`:
  - **Blizzard detection**: Heavy snow/blizzard weather type with winds >25 km/h (extreme if >50 km/h)
  - **Hurricane/Typhoon detection**: Extreme winds >118 km/h (Category 1+), extreme if >177 km/h
  - **Tornado detection**: Tornado weather type detected from API
  - **Extreme thunderstorm detection**: Thunderstorm with winds >60 km/h (high severity)
- Implemented `getSafetyWarning()` method for user-facing safety messages
- Added `calculateXPModifierWithSevereWeather()` method in `EnvironmentalSensors.ts`:
  - Integrates severe weather bonuses with existing XP modifier calculation
  - Returns modifier, severeWeatherAlert, and safetyWarning
  - Properly caps at 3.0x total modifier
- Added helper methods: `detectSevereWeather()` and `getSevereWeatherWarning()` to EnvironmentalSensors
- Added 23 comprehensive unit tests covering:
  - Blizzard detection (extreme and high severity)
  - Heavy snow with high winds
  - Regular snow (not severe)
  - Hurricane/typhoon detection
  - Tornado detection
  - Extreme thunderstorm detection
  - Normal weather (not severe)
  - Forecast data severe weather detection
  - Safety warnings for all severe weather types
  - XP modifier integration with 3.0x cap
  - Null weather handling

---

### 8. Gaming Sensor Real-Time Detection

**File**: [src/core/sensors/GamingPlatformSensors.ts](../../src/core/sensors/GamingPlatformSensors.ts)

**Issue**: Polling-based only. No real-time game change detection.

**Subtasks**:
- [ ] Implement WebSocket/event-based detection for Steam
- [ ] Implement event-based detection for Discord RPC
- [ ] Add event listeners for game start/stop
- [ ] Reduce polling when event-based available
- [ ] Add hybrid mode (polling + events)
- [ ] Update tests for event-driven behavior

**Estimated Effort**: 4-5 hours

---

### 9. Environmental Sensor Error Recovery

**File**: [src/core/sensors/EnvironmentalSensors.ts](../../src/core/sensors/EnvironmentalSensors.ts)

**Issue**: Limited error recovery when sensors fail.

**Subtasks**:
- [ ] Add retry logic for failed sensor reads
- [ ] Implement exponential backoff for retries
- [ ] Add sensor health monitoring
- [ ] Gracefully degrade when individual sensors fail
- [ ] Log sensor failures with timestamps
- [ ] Add "last known good" fallback values
- [ ] Add sensor recovery notifications

**Estimated Effort**: 3-4 hours

---

## ⚪ LOW PRIORITY: Nice to Have

### 10. Improved Logging and Diagnostics

**Files**: Various sensor files

**Subtasks**:
- [ ] Add consistent logging levels (debug, info, warn, error)
- [ ] Add diagnostic mode for troubleshooting
- [ ] Add sensor status dashboard output
- [ ] Add performance metrics (API call times, cache hit rates)
- [ ] Add optional verbose logging flag

**Estimated Effort**: 2-3 hours

---

### 11. Additional Test Coverage

**Files**: Tests for sensor modules

**Subtasks**:
- [ ] Add edge case tests for sensor failures
- [ ] Add integration tests for full sensor pipeline
- [ ] Add tests for XP modifier edge cases (3.0x cap)
- [ ] Add tests for multi-sensor interaction
- [ ] Mock browser APIs for headless testing

**Estimated Effort**: 4-6 hours

---

### 12. Configuration Options

**File**: New config file or enhanced constants

**Subtasks**:
- [ ] Create sensor configuration interface
- [ ] Make cache TTLs configurable
- [ ] Make modifier caps configurable
- [ ] Make polling intervals configurable
- [ ] Add environment variable support
- [ ] Document all config options

**Estimated Effort**: 2-3 hours

---

## 📋 Technical Debt Tracking

| Item | Location | Impact | Fix Priority |
|------|----------|--------|--------------|
| Hardcoded `abilityModifier = 0` | AttackResolver.ts:111 | Damage calculation incorrect | Critical |
| ~~Mocked Discord RPC game detection~~ | ~~DiscordRPCClient.ts~~ | ~~Discord RPC cannot read user activity~~ | ~~Blocked - Platform Limitation~~ |
| ~~Hardcoded moon phase~~ | ~~WeatherAPIClient.ts~~ | ~~Inaccurate night bonuses~~ | ~~Medium~~ |
| ~~No weather caching~~ | ~~WeatherAPIClient.ts~~ | ~~API overuse, slow~~ | ~~Medium~~ |
| ~~No geolocation caching~~ | ~~GeolocationProvider.ts~~ | ~~Unnecessary GPS calls~~ | ~~Medium~~ |
| Simplified biome detection | GeolocationProvider.ts | Limited variety | Low |

---

## ✅ Verification Checklist

After completing all tasks, verify:

- [ ] All 10 features in SPEC.md show 100% implementation
- [ ] All TypeScript files compile with strict mode
- [ ] All tests pass (426+ tests, 100% passing)
- [ ] No `@ts-ignore` comments remain
- [ ] No `TODO` comments remain (or convert to tracked issues)
- [ ] All mocked methods replaced with real implementations
- [ ] XP modifiers correctly cap at 3.0x in all scenarios
- [ ] Sensors gracefully handle permission denials
- [ ] Discord RPC successfully connects and detects activity
- [ ] Attack damage includes correct ability modifiers

---

## 📊 Progress Tracking

Use this section to track completion:

```
[███████████████████░░░░░] 94% Complete

Critical:  [██████████████] 1/1 tasks (100%)
High:      [████████░░░░░] 1/1 tasks (100%)
Medium:    [██████░░░░░░░] 4/8 tasks (50%)
Low:       [░░░░░░░░░░░] 0/3 tasks (0%)
```

---

## Notes

- **TODO.md vs Current State**: TODO.md was written earlier and some items (like MotionDetector) are now fully implemented. This plan reflects actual current state.
- **Environmental Sensors**: Environmental sensor aggregation is complete and functional. Enhanced biome detection now includes jungle, swamp, taiga, and savanna.
- **Discord RPC**: Discord RPC integration is complete for music presence only (cannot detect games - use Steam API for game detection).
- **Priority Order**: All Critical and High priority tasks are now complete. Remaining Medium priority tasks are optional enhancements.

---

**Last Updated**: 2026-01-21
**Next Review**: After completing additional Medium priority enhancements
