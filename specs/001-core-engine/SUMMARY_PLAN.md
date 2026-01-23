# Implementation Plan: Core Data Engine Summary

## Primary Goals

1. **Update and enhance `SPEC.md`** - The existing SPEC.md will become the comprehensive verified summary. Read the old implementation plan, cross-reference claims with actual code, and integrate verified information into SPEC.md.

2. **Final output must be under 300 lines** - SPEC.md should be a concise, trustworthy reference document containing all essential information.

3. **Quality is paramount** - Every claim must be verified against actual code. No hallucinated data structures, methods, or examples. Only accurate, referenced information.

4. **Shape SPEC.md into the ultimate reference** - As tasks are completed, integrate verified information. SPEC.md should become a comprehensive but concise reference for all Core Data Engine concepts.

5. **This plan is temporary** - Once tasks are complete, this plan document (with its task checklist) can be removed. SPEC.md is the deliverable.

**Note to agents executing this plan**: As you complete each verification task, consider whether the verified information should enhance SPEC.md. Update SPEC.md only with information you have just verified from actual source code. Never add unverified claims.

---

## What This Plan Is

This is a **verification and summarization plan** for creating an accurate summary of the Core Data Engine implementation. The old `IMPLEMENTATION_PLAN.md` is 1700+ lines and contains detailed implementation notes from the development process.

**This plan's purpose**: Extract and verify the essential information from the old plan into a clean, concise summary.

**This plan is NOT**: An implementation plan for new features. All implementation is complete. This is purely documentation work.

---

## What the Playlist Data Engine Does (For SPEC.md Context)

**Input**: Playlist data (Arweave/JSON) → **Output**: Rich RPG character + environmental/gaming context

The Core Data Engine transforms music playlists into D&D 5e-inspired characters while integrating external data sources:

1. **Playlist Processing** - Feed in playlist data, get audio/visual analysis
2. **Character Generation** - Audio/visual data → deterministic RPG character (race, class, abilities, skills, equipment)
3. **Discord Integration** - Set music presence on Discord (what you're listening to)
4. **Steam Integration** - Get current game from Steam, combine with music for XP bonuses
5. **Environmental Sensors** - Weather, location, time, motion, light → XP modifiers
6. **Progression** - Characters level up through listening time (1 XP/sec, modified by environment/gaming)
7. **Combat** - Turn-based combat system with attacks, spells, initiative

**Key Point**: SPEC.md should make it EXTREMELY CLEAR how to:
- Feed playlist data into the engine
- Get useful information out (characters, XP, environmental context)
- Connect to external APIs (Discord music presence, Steam gaming, weather)
- Access sensor data (GPS, motion, light, time)
- Use the progression system and combat

**SPEC.md should NOT mention**:
- Features that don't actually work (e.g., Discord voice chat)
- Contradictory or misleading information
- Low-quality/uninteresting features

---

## Output Specification

**File**: `specs/001-core-engine/SPEC.md` (update existing file)

**Format**: README-style documentation with:
- Feature overview with file locations
- Key methods and what they do
- Test coverage areas
- Links to source files
- Technical debt summary
- Remaining work / TODOs

**Strict Rule for Editing SPEC.md**:
- ONLY edit SPEC.md based on information you have just verified by reading actual source code
- Do NOT add information from the old implementation plan without verifying it first
- Each edit should be traceable to a verification task you just completed

**General Cleanup Rule**: Throughout all phases, identify and note:
- Contradictory information (plan says X, code does Y)
- Dead code for features that don't work (e.g., Discord voice chat when Discord RPC cannot access voice state)
- Low-quality/uninteresting features that shouldn't be documented
- These will be cleaned up in Phase 5 (Code Cleanup) and excluded from SPEC.md

**Critical Requirement**: Every technical claim MUST be verified against actual source code before including in summary. No hallucinated examples, data structures, or method signatures.

---

## Workflow: How to Execute This Plan

1. **Start by enhancing SPEC.md** with the reference information from this plan (Quick Reference sections, Concepts, Terminology)
2. **For each verification task**, read the source files and verify claims from the old plan
3. **Update SPEC.md** with verified information - add features, methods, test coverage as you confirm them
4. **Note discrepancies** - if the old plan said something but code differs, note it in SPEC.md
5. **Check line count** periodically - stay under 300 lines, prioritize essential information
6. **When all tasks complete**, SPEC.md is the enhanced deliverable

**SPEC.md Quality Guidelines**:
- Link to source files rather than duplicating implementation details
- Group related concepts together
- Use concise descriptions - not every method needs to be listed
- Test coverage can be summarized (e.g., "18 tests covering STR/DEX modifiers, finesse weapons, critical hits")
- Focus on what future developers need to know: what exists, where it is, what it does

**When to Edit SPEC.md During a Task**:
- YES: Add/clarify a feature you just verified exists
- YES: Add a method signature you just read from source
- YES: Add test coverage you just confirmed exists
- YES: Fix a discrepancy you discovered (old plan was wrong)
- NO: Add information from the old plan without verifying it
- NO: Add "probably" or "likely" - only verified facts
- NO: Add features/methods you haven't personally read in the source code

**EXCLUSIONS - Do NOT Include in SPEC.md**:
- Discord voice chat features (e.g., `subscribeToVoiceUpdates`, voice state tracking)
- The playlist-data-engine will NEVER include Discord voice functionality
- Only music presence features via Discord RPC should be documented

---

## Quick Reference: Source Files

### Sensors (8 files)
- `src/core/sensors/DiscordRPCClient.ts` - Discord Rich Presence for music
- `src/core/sensors/MotionDetector.ts` - Device motion/activity detection
- `src/core/sensors/SteamAPIClient.ts` - Steam game detection
- `src/core/sensors/GamingPlatformSensors.ts` - Aggregates Steam + Discord
- `src/core/sensors/EnvironmentalSensors.ts` - Aggregates all environmental sensors
- `src/core/sensors/GeolocationProvider.ts` - GPS location + biome detection
- `src/core/sensors/WeatherAPIClient.ts` - Weather + forecast + moon phase
- `src/core/sensors/LightSensor.ts` - Ambient light detection

### Combat (5 files)
- `src/core/combat/AttackResolver.ts` - Attack/damage resolution
- `src/core/combat/CombatEngine.ts` - Turn-based combat
- `src/core/combat/DiceRoller.ts` - Dice rolling
- `src/core/combat/InitiativeRoller.ts` - Initiative order
- `src/core/combat/SpellCaster.ts` - Spell casting

### Type Definitions (7 files)
- `src/core/types/Environmental.ts` - Weather, geolocation, biome types
- `src/core/types/Progression.ts` - XP, leveling, gaming context
- `src/core/types/Combat.ts` - Combat-related types
- `src/core/types/Character.ts` - Character types
- `src/core/types/Playlist.ts` - Playlist types
- `src/core/types/AudioProfile.ts` - Audio analysis types
- `src/core/types/ColorPalette.ts` - Color types

### Utilities (6 files)
- `src/utils/logger.ts` - Logging system
- `src/utils/sensorDashboard.ts` - Diagnostic dashboard
- `src/utils/random.ts`, `src/utils/constants.ts`, `src/utils/validators.ts`, `src/utils/hash.ts`

### Config (2 files)
- `src/core/config/sensorConfig.ts` - Sensor configuration
- `src/core/config/index.ts` - Module exports

### Test Files (20 unit + 7 integration)
- Unit: `tests/unit/attackResolver.test.ts`, `tests/unit/discordRPC.test.ts`, `tests/unit/gaming.test.ts`, `tests/unit/sensors.test.ts`, `tests/unit/xpCalculator.test.ts`, etc.
- Integration: `tests/integration/discordRPC.integration.test.ts`, `tests/integration/gamingIntegration.test.ts`, `tests/integration/fullSensorPipeline.test.ts`, etc.

### Test Mocks
- `tests/mocks/browserAPIs.ts` - Browser API mocks for headless testing

---

## Concepts and Terminology (from SPEC.md)

### Core Data Types (verify these exist in `src/core/types/`)
- `AudioProfile` - Audio analysis output (bass/mid/treble dominance, spectral features)
- `ColorPalette` - Visual analysis output (4 colors: primary, secondary, tertiary, accent)
- `CharacterSheet` - Generated character (name, level, race, class, ability scores, etc.)
- See `src/core/types/` for complete definitions

### Ability Score Mapping (verify this matches actual implementation)
- Strength → `bass_dominance`
- Dexterity → `treble_dominance`
- Constitution → `average_amplitude`
- Intelligence → `mid_dominance` + `spectral_centroid`
- Wisdom → `balanced frequencies`
- Charisma → `mid_dominance` + `genre`

### XP Modifiers (verify calculations match actual code)
- **Environmental**: Running (1.5x), Storm (1.4x), Altitude (1.3x), Night (1.25x)
- **Gaming**: Any (+25%), RPG (+20%), Multiplayer (+15%), 4hr+ (+20%)
- **Formula**: `base (1 XP/sec) × environmental × gaming` (capped at 3.0x)

### 10 Core Features (from SPEC.md - all should be complete)
1. Playlist Parsing - Arweave/JSON input, priority queues, deterministic seed
2. Audio Analysis - Triple Tap (5%/40%/70%), bass/mid/treble
3. Visual Analysis - K-means palette extraction, 4 colors
4. Character Generation - 9 races, 12 classes, deterministic
5. Naming - 3 formats weighted 50/30/20, title cleaning
6. Advanced Character - 18 skills, proficiencies, spells, equipment, appearance
7. Environmental Sensors - GPS, motion, weather, light, XP modifiers
8. Gaming Integration - Steam/Discord, genre bonuses
9. Progression - 1 XP/sec, D&D 5e levels 1-20, mastery
10. Combat - Turn-based, initiative, attacks, spell casting

---

## Task Breakdown

### Phase 0: Initial SPEC.md Enhancement

Before starting verification tasks, integrate the reference information from this plan into SPEC.md to create a strong foundation:

- [ ] Read current `SPEC.md` to understand existing structure
- [ ] Add "Source Files" section to SPEC.md with file listings from this plan's Quick Reference
- [ ] Enhance "Core Data Types" section with detailed type information
- [ ] Add/clarify "Ability Score Mapping" section
- [ ] Add/clarify "XP Modifiers" section
- [ ] Ensure all 10 Core Features are properly documented with source file links
- [ ] **Add clear "How to Use" section** - feed playlist in → get character out, connect to Discord/Steam/sensors
- [ ] Review and optimize for clarity and conciseness
- [ ] Check line count - should be under 200 lines after this initial enhancement

### Phase 1: Source File Inventory
- [ ] List all `.ts` source files mentioned in the old plan
- [ ] List all test files mentioned
- [ ] Create quick reference table: Feature → Source File(s) → Test File(s)

### Phase 2: Verification and Summary by Feature (12 Main Tasks)

#### Task 1: AttackResolver Ability Modifier Fix
- [ ] Read `src/core/combat/AttackResolver.ts`
- [ ] Verify the `rollDamage()` method has `attacker` parameter
- [ ] Verify ability modifier calculation exists (STR/DEX/finesse logic)
- [ ] Verify method calls in `resolveAttack()`, `attackWithAdvantage()`, `attackWithDisadvantage()` pass attacker
- [ ] Verify test file `tests/unit/attackResolver.test.ts` exists with 18 tests
- [ ] Summarize what was fixed and how
- [ ] Note any discrepancies

#### Task 2: Discord RPC Integration (Music Presence)
- [ ] Read `src/core/sensors/DiscordRPCClient.ts`
- [ ] Verify `connect()`, `disconnect()` methods
- [ ] Verify `setMusicActivity()` method exists (NOT `setGameActivity`)
- [ ] Verify `clearMusicActivity()` method exists
- [ ] Verify `getUserInfo()` method exists
- [ ] Verify NO game-related methods exist
- [ ] **SKIP any voice chat features** - do NOT document `subscribeToVoiceUpdates` or similar voice functionality
- [ ] Read `src/core/sensors/GamingPlatformSensors.ts` - verify game detection uses Steam only
- [ ] Verify test files: `tests/unit/discordRPC.test.ts` (40 tests), `tests/integration/discordRPC.integration.test.ts` (19 tests)
- [ ] Summarize Discord RPC's actual purpose (music presence only)
- [ ] Note any discrepancies

#### Task 3: Weather API Caching
- [ ] Read `src/core/sensors/WeatherAPIClient.ts`
- [ ] Verify in-memory cache exists (Map with CacheEntry)
- [ ] Verify cache TTL is 12 minutes
- [ ] Verify cache key based on lat/lon coordinates
- [ ] Verify cache methods: `invalidateCache()`, `invalidateLocation()`, `clearExpiredEntries()`, `getCacheSize()`
- [ ] Verify cache statistics: `getCacheStats()` returns hits/misses
- [ ] Verify localStorage persistence for browser
- [ ] Verify 14 cache-related tests exist
- [ ] Summarize caching implementation
- [ ] Note any discrepancies

#### Task 4: Geolocation Caching
- [ ] Read `src/core/sensors/GeolocationProvider.ts`
- [ ] Verify position data cache exists (CacheEntry with data + timestamp)
- [ ] Verify cache TTL is 5 minutes
- [ ] Verify `getCurrentPosition(forceRefresh?)` bypasses cache when true
- [ ] Verify `getCacheAge()`, `invalidateCache()` methods exist
- [ ] Verify localStorage persistence for browser
- [ ] Verify 15 cache-related tests exist
- [ ] Summarize geolocation caching
- [ ] Note any discrepancies

#### Task 5: Moon Phase Calculation
- [ ] Read `src/core/sensors/WeatherAPIClient.ts`
- [ ] Verify `calculateMoonPhase()` method exists
- [ ] Verify algorithm uses reference new moon date (January 11, 2024)
- [ ] Verify uses mean synodic month (29.530588853 days)
- [ ] Verify returns 0-1 value
- [ ] Verify tests with known moon phase dates exist
- [ ] Summarize moon phase implementation
- [ ] Note any discrepancies

#### Task 6: Enhanced Biome Detection
- [ ] Read `src/core/sensors/GeolocationProvider.ts`
- [ ] Verify all biome types exist: jungle, swamp, taiga, savanna, tundra, forest, urban, plains, desert, mountain, valley
- [ ] Verify coastal detection implementation
- [ ] Verify elevation-based detection (mountain >1500m, valley <0m)
- [ ] Verify longitude-based regional detection
- [ ] Verify `getBiome(latitude, longitude, altitude?)` signature
- [ ] Read `src/core/sensors/EnvironmentalSensors.ts` - verify altitude passed to getBiome()
- [ ] Verify biome detection tests exist (115+ tests mentioned)
- [ ] Summarize biome detection implementation
- [ ] Note any discrepancies (especially about GIS API decision)

#### Task 7: Weather Forecast Data
- [ ] Read `src/core/sensors/WeatherAPIClient.ts`
- [ ] Verify `ForecastData` interface exists in `src/core/types/Environmental.ts`
- [ ] Verify `getForecast()` method exists
- [ ] Verify calls OpenWeatherMap `/data/2.5/forecast` endpoint
- [ ] Verify forecast cache exists with 60-minute TTL
- [ ] Verify `getUpcomingWeather()` method exists
- [ ] Read `src/core/sensors/EnvironmentalSensors.ts`
- [ ] Verify `calculateXPModifierWithForecast()` method exists
- [ ] Verify forecast bonus logic (+15% thunderstorm, +10% snow/rain, +5% clear)
- [ ] Verify 13 forecast-related tests exist
- [ ] Summarize forecast implementation
- [ ] Note any discrepancies

#### Task 8: Severe Weather Detection
- [ ] Read `src/core/sensors/WeatherAPIClient.ts`
- [ ] Verify `SevereWeatherType` enum exists (Blizzard, Hurricane, Typhoon, Tornado, None)
- [ ] Verify `SevereWeatherAlert` interface exists
- [ ] Verify `detectSevereWeather()` method exists
- [ ] Verify `getSafetyWarning()` method exists
- [ ] Read `src/core/sensors/EnvironmentalSensors.ts`
- [ ] Verify `calculateXPModifierWithSevereWeather()` method exists
- [ ] Verify XP bonuses: Blizzard +50%, Hurricane/Typhoon +75%, Tornado +100%
- [ ] Verify 3.0x total cap enforcement
- [ ] Verify 23 severe weather tests exist
- [ ] Summarize severe weather implementation
- [ ] Note any discrepancies

#### Task 9: Clean Up Gaming Platform Sensors
- [ ] Read `src/core/sensors/GamingPlatformSensors.ts`
- [ ] Verify `platformSource` type is only `'steam' | 'none'` (no 'discord' or 'both')
- [ ] Verify Discord game detection methods were removed
- [ ] Read `src/core/types/Progression.ts`
- [ ] Verify `currentGame.source` type is only `'steam'`
- [ ] Verify test updates (xpCalculator test uses 'steam')
- [ ] Summarize cleanup changes
- [ ] Note any discrepancies

#### Task 10: Environmental Sensor Error Recovery
- [ ] Read `src/core/sensors/EnvironmentalSensors.ts`
- [ ] Verify `retrySensorOperation()` method exists with retry loop
- [ ] Verify exponential backoff implementation
- [ ] Verify `sensorStatuses` Map tracks health
- [ ] Verify graceful degradation fallbacks
- [ ] Verify `logFailure()` method exists
- [ ] Verify `lastKnownGood` Map exists
- [ ] Verify recovery callbacks exist
- [ ] Summarize error recovery implementation
- [ ] Note any discrepancies

#### Task 11: Improved Logging and Diagnostics
- [ ] Read `src/utils/logger.ts`
- [ ] Verify `Logger.for()` creates named loggers
- [ ] Verify log levels: DEBUG, INFO, WARN, ERROR, NONE
- [ ] Verify diagnostic mode methods exist
- [ ] Verify verbose mode methods exist
- [ ] Read `src/utils/sensorDashboard.ts`
- [ ] Verify `displayEnvironmentalDiagnostics()`, `displayGamingDiagnostics()`, `displaySystemDashboard()` exist
- [ ] Read `src/core/sensors/EnvironmentalSensors.ts` - verify `getDiagnostics()` method
- [ ] Read `src/core/sensors/GamingPlatformSensors.ts` - verify `getDiagnostics()` method
- [ ] Read `src/core/sensors/WeatherAPIClient.ts` - verify performance metrics tracking
- [ ] Read `src/core/sensors/SteamAPIClient.ts` - verify performance metrics tracking
- [ ] Verify test files have diagnostic mode tests
- [ ] Summarize logging/diagnostics implementation
- [ ] Note any discrepancies

#### Task 12: Additional Test Coverage
- [ ] Verify edge case tests exist (17 tests for data integrity & malformed responses)
- [ ] Verify full sensor pipeline integration tests exist (21 tests)
- [ ] Verify XP modifier edge case tests exist (24 tests for 3.0x cap)
- [ ] Verify multi-sensor interaction tests exist (17 tests)
- [ ] Read `tests/mocks/browserAPIs.ts`
- [ ] Verify browser API mocks exist (Geolocation, DeviceMotion, DeviceOrientation, AmbientLightSensor, localStorage)
- [ ] Summarize test coverage additions
- [ ] Note any discrepancies

### Phase 3: Technical Debt and Verification Log
- [ ] Read the Technical Debt Tracking section from old plan
- [ ] Verify each item's current status
- [ ] Summarize what was resolved vs. what remains
- [ ] Read the Verification Log section from old plan
- [ ] Summarize key verification milestones
- [ ] Note final test status

### Phase 4: Configuration System
- [ ] Read `src/core/config/sensorConfig.ts`
- [ ] Verify configuration interfaces exist and document structure
- [ ] Verify `loadConfigFromEnv()` and `mergeConfig()` functions
- [ ] Read `.env.example` and verify env vars are documented
- [ ] Summarize configuration system

### Phase 5: Code Cleanup - Remove Non-Functional Discord Voice Features

**Important**: Discord RPC CANNOT access voice state data. Remove all dead code related to voice features.

- [ ] Read `src/core/sensors/DiscordRPCClient.ts` and identify all voice-related methods
- [ ] Remove `subscribeToVoiceUpdates()` method and related code
- [ ] Remove any voice state tracking properties/types
- [ ] Remove any voice-related event handlers
- [ ] Search for any other voice-related code in the file and remove it
- [ ] Check `tests/unit/discordRPC.test.ts` for voice-related tests and remove them
- [ ] Check `tests/integration/discordRPC.integration.test.ts` for voice-related tests and remove them
- [ ] Run tests to ensure nothing breaks after cleanup
- [ ] Update SPEC.md to reflect Discord RPC is for music presence ONLY (no voice features)

### Phase 6: Failing Tests Analysis
- [ ] Run `npm test` to get current test status
- [ ] Identify which tests are failing
- [ ] Categorize failures by type (biome detection, TypeScript errors, etc.)
- [ ] For each failing test category, identify root cause
- [ ] Create bullet-point plan for fixes (to be implemented later)

### Phase 7: Final SPEC.md Polish
- [ ] Review complete SPEC.md for consistency
- [ ] Ensure all source file references are correct
- [ ] Verify line count is under 300
- [ ] Final accuracy check - no hallucinated data structures or methods
- [ ] Ensure all verified information is integrated
- [ ] Remove any redundant sections
- [ ] Add "Remaining Work" section (failing tests, TODOs, test fix plan)

---

## Success Criteria

1. **Every feature mentioned** has a corresponding source file that exists and was read
2. **Every method signature** mentioned exists in the actual code
3. **Every test count** is verified against actual test files
4. **No data structures** are invented - only reference actual interfaces from code
5. **Discrepancies are noted** between plan and actual implementation
6. **SPEC.md is useful** as the definitive reference for the Core Data Engine
7. **SPEC.md is under 300 lines** while still being comprehensive

---

## Estimated Task Count

- **Phase 0**: 8 tasks (initial SPEC.md enhancement)
- **Phase 1**: 3 tasks (file inventory)
- **Phase 2**: 12 main feature tasks with 5-8 subtasks each = ~60-96 verification tasks
- **Phase 3**: 5 tasks (technical debt + verification log)
- **Phase 4**: 4 tasks (config verification)
- **Phase 5**: 9 tasks (remove Discord voice dead code + test cleanup)
- **Phase 6**: 5 tasks (failing tests analysis + test fix plan)
- **Phase 7**: 7 tasks (final SPEC.md polish)

**Total**: ~100-140 tasks

**Guideline**: Be thorough. Every claim in the old plan should be verified against actual code before integrating into SPEC.md.

---

## References

- **Old Implementation Plan**: `specs/001-core-engine/IMPLEMENTATION_PLAN.md`
- **Specification**: `specs/001-core-engine/SPEC.md`
- **Source Code**: `src/core/`
- **Tests**: `tests/unit/`, `tests/integration/`
