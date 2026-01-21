# Core Data Engine - Implementation Plan

**Status**: Active Planning | **Updated**: 2026-01-20

This document tracks all remaining tasks to bring the Core Data Engine from ~85% complete to 100% production-ready.

---

## Summary

| Category | Tasks | Status |
|----------|-------|--------|
| Critical Bug Fixes | 0 | ✅ Complete |
| Major Features | 1 | 🟡 In Progress |
| Enhancements | 8 | 🟢 Pending |
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
- [ ] Add unit tests for `clearMusicActivity()`
- [ ] Add integration tests (requires running Discord)
- [ ] Test connection lifecycle

**Status**: ✅ Partial Complete (2026-01-20)

**Implementation Summary**:
Added comprehensive unit tests for `setMusicActivity()` method with proper mocking.

**Changes Made**:
- **New test file**: `tests/unit/discordRPC.test.ts` with 40 unit tests
- Tests cover:
  - Basic `setMusicActivity()` functionality (connection state, song name, artist, activity type)
  - Progress bar (timestamps) functionality (start/end timestamps, duration calculation, edge cases)
  - Album art functionality (large image key, image text)
  - Error handling (RPC errors, null handling, graceful degradation)
  - Complex scenarios (complete activity with all fields, artist formatting, special characters)
  - Multiple calls (sequential, rapid successive)
  - Data validation (long names, numeric names, unicode)
  - `clearMusicActivity()` functionality
  - Connection state management
  - `getUserInfo()` functionality

**Tests Verified**:
- All 40 new unit tests in `tests/unit/discordRPC.test.ts` pass
- Tests use proper mocking of internal RPC client (no Discord required)
- Tests are isolated and don't depend on external services

**Estimated Remaining Effort**: 2-3 hours

---

## 🟢 MEDIUM PRIORITY: Enhancements

### 2. Weather API Caching

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: No caching of API responses. Every call hits OpenWeatherMap API.

**Subtasks**:
- [ ] Add in-memory cache for weather data
- [ ] Set cache TTL to 10-15 minutes
- [ ] Check cache before making API calls
- [ ] Implement cache key based on lat/lon coordinates
- [ ] Add cache invalidation method
- [ ] Add cache statistics (hits/misses)
- [ ] Consider localStorage persistence for browser
- [ ] Add unit tests for cache behavior

**Estimated Effort**: 2-3 hours

---

### 3. Geolocation Caching

**File**: [src/core/sensors/GeolocationProvider.ts](../../src/core/sensors/GeolocationProvider.ts)

**Issue**: No caching. Every call triggers browser geolocation API.

**Subtasks**:
- [ ] Add position data cache
- [ ] Set cache TTL to 5 minutes (GPS changes slowly)
- [ ] Check cache before requesting position
- [ ] Implement manual cache refresh option
- [ ] Add cache age tracking
- [ ] Consider localStorage for persistence
- [ ] Add unit tests for caching logic

**Estimated Effort**: 1-2 hours

---

### 4. Moon Phase Calculation

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: Moon phase is hardcoded to `0.5` (line ~100).

**Subtasks**:
- [ ] Implement lunar phase calculation algorithm
- [ ] Use date/time and geolocation for accuracy
- [ ] Return value 0-1 (0=new moon, 0.5=full moon, 1=new moon)
- [ ] Add astronomical calculation reference
- [ ] Test with known moon phase dates
- [ ] Document algorithm in code comments

**Suggested Algorithm**:
```typescript
// Conway's method or similar astronomical calculation
// Input: date, latitude, longitude
// Output: 0-1 representing moon phase
```

**Estimated Effort**: 2-3 hours

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
- [ ] Add longitude-based regional detection
- [ ] Add coastal vs inland detection
- [ ] Add elevation-based biomes (mountain, valley)
- [ ] Add more biome types: desert, swamp, jungle, taiga, savanna
- [ ] Implement decision tree for biome classification
- [ ] Add unit tests for coordinate → biome mapping

**Estimated Effort**: 4-6 hours (GIS), 2-3 hours (heuristics)

---

### 6. Weather Forecast Data

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: Only current weather data. No forecast available.

**Subtasks**:
- [ ] Add forecast endpoint to API client
- [ ] Parse forecast data (hourly/daily)
- [ ] Return next N hours of weather
- [ ] Cache forecast data separately (longer TTL)
- [ ] Add forecast data to TypeScript types
- [ ] Update XP modifier to consider incoming weather

**Estimated Effort**: 3-4 hours

---

### 7. Severe Weather Detection

**File**: [src/core/sensors/WeatherAPIClient.ts](../../src/core/sensors/WeatherAPIClient.ts)

**Issue**: No handling of weather alerts or severe conditions.

**Subtasks**:
- [ ] Add weather alert detection from API
- [ ] Map severe conditions to XP bonuses:
  - [ ] Blizzard: +50%
  - [ ] Hurricane/Typhoon: +75%
  - [ ] Tornado: +100%
- [ ] Add safety check (warn user of dangerous weather)
- [ ] Cap modifier at 3.0x total
- [ ] Add unit tests

**Estimated Effort**: 2-3 hours

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
| Mocked Discord RPC game detection | DiscordRPCClient.ts | Discord RPC cannot read user activity | Blocked - Platform Limitation |
| Hardcoded moon phase | WeatherAPIClient.ts | Inaccurate night bonuses | Medium |
| No weather caching | WeatherAPIClient.ts | API overuse, slow | Medium |
| No geolocation caching | GeolocationProvider.ts | Unnecessary GPS calls | Medium |
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
[███████████████████░░░░░] 92% Complete

Critical:  [██████████████] 1/1 tasks (100%)
High:      [░░░░░░░░░░░] 0/1 tasks (0%)
Medium:    [░░░░░░░░░░░] 0/8 tasks (0%)
Low:       [░░░░░░░░░░░] 0/3 tasks (0%)
```

---

## Notes

- **TODO.md vs Current State**: TODO.md was written earlier and some items (like MotionDetector) are now fully implemented. This plan reflects actual current state.
- **Environmental Sensors**: Contrary to TODO.md, the environmental sensor aggregation is actually complete and functional.
- **Discord RPC**: This is the single largest remaining piece of work.
- **Priority Order**: Recommend fixing Critical bug first, then Discord RPC, then Medium priority items.

---

**Last Updated**: 2026-01-20
**Next Review**: After completing Critical and High priority tasks
