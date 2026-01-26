# Core Data Engine Specification

Transforms music playlists into D&D 5e-inspired RPG characters through audio/visual analysis and deterministic generation.

---

## Overview

**Input**: Playlist data (Arweave/JSON) → **Output**: Rich RPG character + environmental/gaming context

### Core Features (10)
1. **Playlist Parsing** - Arweave/JSON input, priority queues, deterministic seed
2. **Audio Analysis** - Triple Tap (5%/40%/70%), bass/mid/treble profiling
3. **Visual Analysis** - K-means palette extraction, 4 colors
4. **Character Generation** - 9 races, 12 classes, deterministic
5. **Naming** - 3 formats weighted 50/30/20, title cleaning
6. **Advanced Character** - 18 skills, proficiencies, spells, equipment, appearance
7. **Environmental Sensors** - GPS, motion, weather, light → XP modifiers
8. **Gaming Integration** - Steam game detection + Discord music presence
9. **Progression** - 1 XP/sec, D&D 5e levels 1-20, mastery, stat increases on level up
10. **Combat** - Turn-based, initiative, attacks, spell casting

---

## Core Data Types

See `src/core/types/` for complete TypeScript definitions.

| Type | File | Key Properties |
|------|------|----------------|
| `AudioProfile` | `AudioProfile.ts` | bass/mid/treble_dominance, average_amplitude, spectral_centroid |
| `ColorPalette` | `ColorPalette.ts` | primary/secondary/tertiary/background, brightness, saturation |
| `CharacterSheet` | `Character.ts` | name, race (9), class (12), level (1-20), ability scores, skills, equipment |
| `ServerlessPlaylist` | `Playlist.ts` | name, tracks, genre, tags |
| `EnvironmentalContext` | `Environmental.ts` | geolocation, motion, weather, light, biome (12 types) |
| `GamingContext` | `Progression.ts` | isActivelyGaming, currentGame (steam source), genre, sessionDuration |
| `CombatInstance` | `Combat.ts` | combatants, initiative order, turn/round tracking, action history |

---

## Ability Score Mapping

Implemented in `src/core/generation/AbilityScoreCalculator.ts`. Base scores range 8-15:

| Ability | Formula |
|---------|---------|
| STR | `8 + (bass_dominance × 7)` |
| DEX | `8 + (treble_dominance × 7)` |
| CON | `8 + (average_amplitude × 7)` |
| INT | `8 + (mid_dominance × 7)` |
| WIS | `8 + ((1 - \|bass - treble\|) × 7)` |
| CHA | `8 + ((mid_dominance + average_amplitude) / 2 × 7)` |

Racial bonuses applied after, capped at 20.

**Stat Increases on Level Up**: At levels 4, 8, 12, 16, and 19, characters gain ability score increases following D&D 5e rules (+2 to one ability or +1 to two abilities). The `StatManager` class provides flexible strategies for stat selection including manual choice, intelligent auto-selection, or custom formulas.

---

## XP Modifiers

**Base Rate**: 1 XP/second listening

| Category | Modifiers (capped at 3.0x total) |
|----------|----------------------------------|
| **Motion** | Running 1.5x, Walking 1.2x, Driving 1.3x |
| **Weather** | Storm/Rain/Snow 1.4x |
| **Time** | Night 1.25x |
| **Altitude** | ≥2000m 1.3x |
| **Gaming** | Active +25%, RPG +20%, Action/FPS +15%, Multiplayer +15%, 4hr+ +20% |

Formula: `base × environmental × gaming` (max 3.0x)

---

## Configuration

Sensors can be configured via environment variables or programmatically.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `WEATHER_API_KEY` | OpenWeatherMap API key for weather data |
| `STEAM_API_KEY` | Steam Web API key for game detection |
| `STEAM_USER_ID` | 64-bit Steam ID for account identification |
| `DISCORD_CLIENT_ID` | Discord application ID for music presence |
| `XP_MAX_MODIFIER` | Maximum XP multiplier (default: 3.0) |

**Environment file**: `.env.example`
**Configuration module**: `src/core/config/sensorConfig.ts` with `loadConfigFromEnv()` and `mergeConfig()` functions

---

## Key Classes

| Class | Purpose | Source File |
|-------|---------|-------------|
| `PlaylistParser` | Parses Arweave/JSON playlist data | `src/core/parser/PlaylistParser.ts` |
| `AudioAnalyzer` | Extracts sonic fingerprint from audio | `src/core/analysis/AudioAnalyzer.ts` |
| `CharacterGenerator` | Generates character from seed + profile | `src/core/generation/CharacterGenerator.ts` |
| `NamingEngine` | Generates RPG-style character names | `src/core/generation/NamingEngine.ts` |
| `EnvironmentalSensors` | GPS, motion, weather, light monitoring | `src/core/sensors/EnvironmentalSensors.ts` |
| `GamingPlatformSensors` | Steam game detection + Discord presence | `src/core/sensors/GamingPlatformSensors.ts` |
| `SessionTracker` | Tracks listening sessions for XP | `src/core/progression/SessionTracker.ts` |
| `XPCalculator` | Calculates XP with modifiers | `src/core/progression/XPCalculator.ts` |
| `CharacterUpdater` | Orchestrates character updates from sessions | `src/core/progression/CharacterUpdater.ts` |
| `LevelUpProcessor` | Handles D&D 5e level-up mechanics | `src/core/progression/LevelUpProcessor.ts` |
| `StatManager` | Manages stat increases (level-up, potions, custom) | `src/core/progression/stat/StatManager.ts` |
| `CombatEngine` | Turn-based combat system | `src/core/combat/CombatEngine.ts` |

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Remaining Work

**Status**: All implementation tasks complete. No remaining work items.

### Test Status
- **Total Tests**: 837 passing (100%)
- **Unit Tests**: 732 tests across 20 files
- **Integration Tests**: 105 tests across 7 files
- **Test Duration**: ~18 seconds

### Code Quality
- No TODO/FIXME/BUG/HACK/XXX comments in source code
- TypeScript compilation: Clean (strict mode enabled)
- All 10 core features fully implemented and tested

### Developer Configuration Required

This engine requires developers to provide API keys. End-users provide their identity (Steam ID, Discord login) through your application's UI—the engine does not handle authentication or OAuth flows.

| Service | Developer Provides | End-User Provides | Mode |
|---------|-------------------|-------------------|-------|
| Weather (OpenWeatherMap) | API key | — | Browser + Server |
| Steam (Web API) | API key | 64-bit Steam ID | Browser + Server |
| Discord (RPC) | Application client ID | Logged-in Discord client | **Server only** |

### Discord RPC Dual-Mode Support

**Server Mode (Node.js)**: Full Discord Rich Presence functionality is available when the package runs in a Node.js environment. The `@ryuziii/discord-rpc` dependency is automatically detected and used.

**Browser Mode**: When running in browsers, Discord RPC gracefully degrades with clear console warnings explaining that Discord Rich Presence requires a server environment. The API remains fully compatible - all methods exist and return appropriate defaults (false, null).

**Automatic Detection**: The DiscordRPCClient auto-detects the environment and switches modes automatically. No configuration required.

### Optional Enhancements
These are potential future improvements, not required tasks:
- Additional biome types beyond current 12
- More spell variety (currently 53 hardcoded spells)
- Additional language support for genre detection
