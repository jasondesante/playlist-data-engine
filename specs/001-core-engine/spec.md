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
| `WEATHER_API_KEY` | OpenWeatherMap API key (get free at openweathermap.org/api) |
| `STEAM_API_KEY` | Steam Web API key (get at steamcommunity.com/dev/apikey) |
| `STEAM_USER_ID` | Your 64-bit Steam ID (find at steamid.io) |
| `DISCORD_CLIENT_ID` | Discord Client ID for music presence (create at discord.com/developers/applications) |
| `XP_MAX_MODIFIER` | Max XP multiplier (default: 3.0) |

See `.env.example` for full documentation. Programmatic configuration via `loadConfigFromEnv()` and `mergeConfig()` from `src/core/config/sensorConfig.ts`.

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

### Known Limitations
- **Discord Voice**: Discord RPC cannot access voice state data (platform limitation). Music presence (`setMusicActivity()`) is fully supported.
- **External APIs**: Weather (OpenWeatherMap), Steam (Web API), and Discord RPC require developer-provided API keys/credentials.

### Optional Enhancements
These are potential future improvements, not required tasks:
- Additional biome types beyond current 12
- More spell variety (currently 53 hardcoded spells)
- Additional language support for genre detection
