# Core Data Engine Specification

**Status**: Implementation Complete (All tasks, 837 tests passing) | **Updated**: 2026-01-23

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
9. **Progression** - 1 XP/sec, D&D 5e levels 1-20, mastery
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

---

## XP Modifiers

**Base Rate**: 1 XP/second listening

| Category | Modifiers (capped at 3.0x total) |
|----------|----------------------------------|
| **Motion** | Running 1.5x, Walking 1.2x, Driving 1.3x |
| **Weather** | Storm/Rain 1.4x, Snow 1.3x |
| **Time** | Night 1.25x |
| **Altitude** | ≥2000m adds 0.3x |
| **Gaming** | Active +25%, RPG +20%, Action/FPS +15%, Multiplayer +15%, 4hr+ +20% |

Formula: `base × environmental × gaming` (max 3.0x)

---

## Performance Targets & Edge Cases

| Operation | Target | Edge Case Handling |
|-----------|--------|-------------------|
| Parse 50 tracks | < 2s | Malformed JSON → skip with error log |
| Audio analysis | < 1s/track | Audio 404 → mark "Unsummonable" |
| Color extraction | < 200ms | Fails → return null, continue |
| Character generation | < 100ms | Audio < 3s → analyze entire buffer |
| Level-up | < 50ms | Sensor denied → graceful degrade, no bonus |
| - | - | Rate limited → exponential backoff + cache |

---

## Source Files

**Sensors** (8): `DiscordRPCClient.ts`, `MotionDetector.ts`, `SteamAPIClient.ts`, `GamingPlatformSensors.ts`, `EnvironmentalSensors.ts`, `GeolocationProvider.ts`, `WeatherAPIClient.ts`, `LightSensor.ts`

**Combat** (5): `AttackResolver.ts`, `CombatEngine.ts`, `DiceRoller.ts`, `InitiativeRoller.ts`, `SpellCaster.ts`

**Generation** (9): `AbilityScoreCalculator.ts`, `AppearanceGenerator.ts`, `CharacterGenerator.ts`, `ClassSuggester.ts`, `EquipmentGenerator.ts`, `NamingEngine.ts`, `RaceSelector.ts`, `SkillAssigner.ts`, `SpellManager.ts`

**Progression** (5): `XPCalculator.ts`, `LevelUpProcessor.ts`, `MasterySystem.ts`, `SessionTracker.ts`, `CharacterUpdater.ts`

**Analysis** (3): `AudioAnalyzer.ts`, `SpectrumScanner.ts`, `ColorExtractor.ts`

**Parser** (2): `PlaylistParser.ts`, `MetadataExtractor.ts`

**Types** (7): `Environmental.ts`, `Progression.ts`, `Combat.ts`, `Character.ts`, `Playlist.ts`, `AudioProfile.ts`, `ColorPalette.ts`

**Utilities** (6): `logger.ts`, `sensorDashboard.ts`, `random.ts`, `constants.ts`, `validators.ts`, `hash.ts`

**Config** (2): `sensorConfig.ts`, `index.ts`

**Tests** (27): Unit tests in `tests/unit/`, integration tests in `tests/integration/`, mocks in `tests/mocks/browserAPIs.ts`

---

## Configuration

Sensors can be configured via environment variables or programmatically.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `WEATHER_API_KEY` | OpenWeatherMap API key (get free at openweathermap.org/api) |
| `STEAM_API_KEY` | Steam Web API key (get at steamcommunity.com/dev/apikey) |
| `STEAM_USER_ID` | Your 64-bit Steam ID (find at steamid.io) |
| `DISCORD_CLIENT_ID` | Discord Client ID for music presence (create at discord.com/developers/applications) |
| `XP_MAX_MODIFIER` | Max XP multiplier (default: 3.0) |

See `.env.example` for documentation. Use `loadConfigFromEnv()` or `mergeConfig(userConfig)` from `src/core/config/sensorConfig.ts` for programmatic configuration.

### Configuration Interfaces

```typescript
import { mergeConfig, loadConfigFromEnv } from '@audio-alchemist/core/config';

// Load from environment, then override with custom values
const config = mergeConfig({
    xpModifier: { maxModifier: 2.5 },
    retry: { maxRetries: 5 }
});
```

---

## How to Use

### Basic Workflow: Playlist → Character

```typescript
import { PlaylistParser, AudioAnalyzer, CharacterGenerator, NamingEngine } from '@audio-alchemist/core';

// 1. Parse playlist from Arweave/JSON
const parser = new PlaylistParser({ validateAudioUrls: false });
const playlist = await parser.parse(rawArweavePlaylistData);

// 2. Analyze audio for a track
const analyzer = new AudioAnalyzer({ includeAdvancedMetrics: true });
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);

// 3. Generate character name and sheet
const namingEngine = new NamingEngine();
const characterName = namingEngine.generateName(track, audioProfile);

const seed = `${track.chain_name}-${track.token_address}-${track.token_id}`;
const character = CharacterGenerator.generate(seed, audioProfile, characterName);

console.log(`${character.name}: Level ${character.level} ${character.race} ${character.class}`);
// → "Midnight Synth: Level 1 Elf Artificer"
```

### Environmental Sensors

```typescript
import { EnvironmentalSensors } from '@audio-alchemist/core';

// Initialize with optional weather API key
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);

// Request permissions (browser)
const permissions = await sensors.requestPermissions(['geolocation', 'motion', 'weather', 'light']);

// Start monitoring
sensors.startMonitoring((context) => {
    console.log('Biome:', context.biome);
    console.log('Activity:', sensors.getCurrentActivity());
});

// Calculate XP modifier (1.0x - 3.0x)
const modifier = sensors.calculateXPModifier();
```

### Gaming Integration (Steam + Discord)

```typescript
import { GamingPlatformSensors, DiscordRPCClient } from '@audio-alchemist/core';

const gaming = new GamingPlatformSensors({
    steam: { apiKey: process.env.STEAM_API_KEY, steamId: '123456789' },
    discord: { clientId: process.env.DISCORD_CLIENT_ID }
});

// Authenticate and start monitoring
await gaming.authenticate('123456789');
gaming.startMonitoring((context) => {
    if (context.isActivelyGaming) {
        console.log('Playing:', context.currentGame?.name);
    }
});

// Calculate gaming bonus (1.0x - 1.75x)
const bonus = gaming.calculateGamingBonus();

// Discord music presence
const discord = new DiscordRPCClient(process.env.DISCORD_CLIENT_ID);
await discord.connect();
await discord.setMusicActivity({
    songName: track.title,
    artistName: track.artist,
    albumArtKey: 'album1',
    startTime: Date.now() / 1000,
    durationSeconds: track.duration
});
```

### Progression & Combat

```typescript
// Progression: Track XP and level up
const sessionTracker = new SessionTracker();
const sessionId = sessionTracker.startSession(track.uuid, track);
// ... after listening ends ...
const session = sessionTracker.endSession(sessionId);
const totalXP = xpCalc.calculateSessionXP(session, track);

// Combat: Turn-based battles
const combat = new CombatEngine();
const instance = combat.startCombat([character], [enemy], environmentalContext);
const current = combat.getCurrentCombatant(instance);
combat.executeAttack(instance, current, enemy, character.equipment[0]);
combat.nextTurn(instance);
```
