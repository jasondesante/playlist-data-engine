# Playlist Data Engine Usage Guide

Transform music playlists into D&D 5e-inspired RPG characters through audio/visual analysis and deterministic generation.

**Quick Links:**
- **[API Reference](DATA_ENGINE_REFERENCE.md)** — Complete class and method documentation
- **[Audio Analysis](docs/AUDIO_ANALYSIS.md)** — Triple-tap real-time, full timeline
- **[Beat Detection](docs/BEAT_DETECTION.md)** — Beat detection, rhythm game
- **[XP and Leveling](docs/XP_AND_STATS.md)** — Progression, stat increases, mastery
- **[Environmental Sensors](docs/IRL_SENSORS.md)** — GPS, motion, weather, light modifiers
- **[Rolls and Seeds](docs/ROLLS_AND_SEEDS.md)** — Deterministic random number generation
- **[Combat System](docs/COMBAT_SYSTEM.md)** — Turn-based D&D 5e combat
- **[Enemy Generation](docs/ENEMY_GENERATION.md)** — CR-based enemies, encounters, rarity scaling
- **[Extensibility Guide](docs/EXTENSIBILITY_GUIDE.md)** — Custom content, classes, races, skills
- **[Equipment System](docs/EQUIPMENT_SYSTEM.md)** — Properties, enchanting, templates
- **[Prerequisites](docs/PREREQUISITES.md)** — Level/ability/class/skill/feature requirements
- **[Custom Classes & Races](docs/CUSTOM_CONTENT.md)** — Template-based class inheritance
- **[Content Packs](docs/CONTENT_PACKS.md)** — Data packs for custom content

---

### Installation

Install from local path (recommended):

```json
{
  "dependencies": {
    "playlist-data-engine": "file:/path/to/playlist-data-engine"
  }
}
```

For development, use `npm link` to test changes without rebuilding:

```bash
cd /path/to/playlist-data-engine && npm link
cd /path/to/your/project && npm link playlist-data-engine
```

---

## Usage Examples

### Basic
- [Playlist Parsing and Character Generation](#basic-playlist-parsing-and-character-generation) — Parse playlists, analyze audio, generate characters
- [Quick Data Extraction](#quick-data-extraction) — Simple arrays of URLs, titles, artists from playlists
- [XP from Listening](#earning-xp-from-listening-to-music) — Session tracking, XP calculation, level-ups

### Specific Features
- [Color Extraction](#color-extraction) — Artwork color palette extraction
- [Character Naming](#character-naming) — Automatic and manual RPG-style name generation
- [Deterministic Character Generation](#deterministic-character-generation) — Same seed, same character
- [Stat Strategies](#stat-strategies) — Level-up stat increase options
- [XP Scaling](#xp-scaling) — Progression configuration
- [Prestige System](docs/XP_AND_STATS.md#track-mastery-prestige-system) — Reset for badge upgrades after mastering tracks
- [Environmental Sensors](#environmental-sensors) — GPS, motion, weather, light modifiers
- [Gaming Platform Integration](#gaming-platform-integration) — Steam and Discord bonuses
- [Combat System](#combat-system) — Turn-based D&D 5e combat
- [Enemy Generation](#enemy-generation) — CR-based enemies, encounters, CR vs Rarity independence

### Audio Analysis
- [Full Song Analysis](#full-song-analysis) — Segment-by-segment timeline analysis for visualization
- [Beat Detection](docs/BEAT_DETECTION.md) — Rhythm game timing, beat maps, button press accuracy

### Advanced Pipeline
- [Combining All Systems](#combining-all-systems) — Full pipeline with environmental and gaming context

### Extensibility
See [Extensibility System](#extensibility-system) below for complete extensibility documentation and links to detailed guides.

### Equipment System Links
See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md) for:
- Custom equipment — Properties, enchanting, templates
- Equipment spawning — Batch spawn by rarity, tags, or templates
- Box items — Containers, adventure packs, loot boxes (see also [BoxOpener](DATA_ENGINE_REFERENCE.md#boxopener))

### Developer Reference
- [Available Exports](#available-exports) — Complete API reference
- [Equipment System](#equipment-system) — Quick introduction
- [Extensibility Overview](#extensibility-system) — Registration and custom content
- [Validation Schemas](#validation-schemas) — Runtime type validation with Zod
- [Development Workflow](#development-workflow) — Watch mode and hot reload
- [Environment Variables](#environment-variables) — API keys and sensor configuration
- [Troubleshooting](#troubleshooting) — Common issues

---

## Basic Examples

### Basic Playlist Parsing and Character Generation

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer
} from 'playlist-data-engine';

// Parse a playlist
const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistJSON);
console.log(`Loaded ${playlist.tracks.length} tracks`);

// Analyze first track's audio
const analyzer = new AudioAnalyzer();
const track = playlist.tracks[0];
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
console.log(`Bass: ${audioProfile.bass_dominance}, Mid: ${audioProfile.mid_dominance}, Treble: ${audioProfile.treble_dominance}`);
console.log(`RMS Energy: ${audioProfile.rms_energy}, Dynamic Range: ${audioProfile.dynamic_range}`);

// Generate character deterministically from audio
const character = CharacterGenerator.generate(
  track.id,  // Deterministic seed
  audioProfile,
  track  // Track metadata for automatic name generation
);

console.log(`Generated: ${character.name}`);
console.log(`  Race: ${character.race}`);
console.log(`  Class: ${character.class}`);
console.log(`  STR: ${character.ability_scores.STR}, DEX: ${character.ability_scores.DEX}`);

// All generated data is on the character object:
character.skills      // { athletics: 'proficient', perception: 'expertise', ... }
character.spells      // { cantrips, known_spells, spell_slots }
character.equipment   // { weapons, armor, items, totalWeight, equippedWeight }
character.appearance  // { body_type, hair_color, eye_color, skin_tone, facial_features, aura_color }
```

### Quick Data Extraction

For simple use cases where you just need arrays of URLs or basic data from a playlist:

```typescript
import {
  PlaylistParser,
  getAudioUrls,
  getImageUrls,
  getTrackTitles,
  getArtists,
  getGenres,
  getTags,
  getTotalDuration,
  getTrackCount,
  getTracks,
  getFullTracks,
  getVRMs,
  getVRMTracks
} from 'playlist-data-engine';

// Parse playlist first (existing flow)
const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistData);

// Simple array extraction
const urls = getAudioUrls(playlist);       // ['https://...', 'https://...']
const images = getImageUrls(playlist);     // ['https://...', 'https://...']
const titles = getTrackTitles(playlist);   // ['Song 1', 'Song 2']
const artists = getArtists(playlist);      // ['Artist A', 'Artist B']
const genres = getGenres(playlist);        // ['Electronic', 'Hip-Hop']
const tags = getTags(playlist);            // ['chill', 'upbeat']
const duration = getTotalDuration(playlist); // 1234 (seconds)
const count = getTrackCount(playlist);     // 10

// Simplified track objects
const tracks = getTracks(playlist);
// [{ title: 'Song', artist: 'Artist', audio_url: '...', image_url: '...' }, ...]

// Full track data (all available fields)
const fullTracks = getFullTracks(playlist);
// [{ id, title, artist, album, duration, genre, tags, audio_url, image_url, ... }, ...]

// VRM extraction (for tracks with 3D avatar models)
const vrms = getVRMs(playlist);            // ['https://...', ...]
const vrmTracks = getVRMTracks(playlist);
// [{ title: 'Song', artist: 'Artist', audio_url: '...', image_url: '...', vrm: 'https://...' }, ...]

// Use in your app - example: add all audio URLs to a player
urls.forEach(url => audioPlayer.add(url));
```

### Full Song Analysis

Perform a detailed, segment-by-segment analysis of the entire song. This is ideal for generating game levels or showing a song's progression over time.

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Option A: Sample every 2 seconds
const timelineInterval = await analyzer.analyzeTimeline(audioUrl, { 
  type: 'interval', 
  intervalSeconds: 2 
});

// Option B: Generate exactly 100 data points across the song
const timelineCount = await analyzer.analyzeTimeline(audioUrl, { 
  type: 'count', 
  count: 100 
});

// Access timeline data
timelineCount.forEach(event => {
  console.log(`[${event.timestamp}s]`);
  console.log(`  Energy: ${event.rms_energy} (RMS), Peak: ${event.peak}`);
  console.log(`  Dynamic Range: ${event.dynamic_range}`);
  console.log(`  Frequency: B:${event.bass} M:${event.mid} T:${event.treble}`);
  console.log(`  Spectral Centroid: ${event.spectral_centroid}`);
  console.log(`  Zero Crossing Rate: ${event.zero_crossing_rate}`);
});
```

**For detailed documentation, see [AUDIO_ANALYSIS.md](docs/AUDIO_ANALYSIS.md)**

### Beat Detect

**For detailed documentation, see [BEAT_DETECTION.md](docs/BEAT_DETECTION.md)**

### Earning XP from Listening to Music

Track listening sessions, calculate XP earned (~1 XP/second with environmental/gaming bonuses), and apply to your character. Level-ups happen automatically when XP thresholds are reached.

```typescript
import { SessionTracker, CharacterUpdater } from 'playlist-data-engine';

const tracker = new SessionTracker();
const sessionId = tracker.startSession(track.id, track);

// ... user listens ...

const session = tracker.endSession(sessionId);
if (session) {
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  if (result.leveledUp) console.log(`Level up! Now ${result.newLevel}`);
  if (result.masteredTrack) console.log(`Track mastered! +${result.masteryBonusXP} bonus XP`);
}
```

**Customization**: Stat increases, XP sources, and level scaling are all configurable:

- **Stat strategies**: Auto-smart (default), manual D&D 5e, balanced, primary-only, random, or custom formulas
- **Game modes**: Standard (stats capped at 20, increases at levels 4/8/12/16/19) or uncapped (unlimited levels, every level)
- **XP sources**: Music listening, combat, quests, or any custom activity
- **Level scaling**: Default D&D 5e pattern or provide your own XP formulas

For complete details on progression, stat increases, prestige system, and customization, see **[XP_AND_STATS.md](docs/XP_AND_STATS.md)**.


## Specific Features

### Color Extraction

```typescript
import { ColorExtractor } from 'playlist-data-engine';

// Extract color palette from track artwork
const colorExtractor = new ColorExtractor();
const palette = await colorExtractor.extractPalette(track.image_url);
console.log(`Primary color: ${palette.primary_color}`);
console.log(`Colors: ${palette.colors.join(', ')}`);
console.log(`Brightness: ${palette.brightness}, Saturation: ${palette.saturation}`);
console.log(`Is monochrome: ${palette.is_monochrome}`);

```

### Character Naming

Names are automatically generated by `CharacterGenerator` using track metadata (title, artist, genre) combined with audio characteristics and character class. Names use 7 different naming formats with fantasy-inspired patterns.

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Names are generated automatically - no need to provide a name parameter
const character = CharacterGenerator.generate(track.id, audioProfile, track);
console.log(`Generated name: "${character.name}"`);
```

**Naming Modes:**

| Mode | Behavior | Example |
|------|----------|---------|
| **Deterministic** (default) | Same seed always produces same name | `CharacterGenerator.generate(seed, audio, track)` |
| **Manual override** | Force a specific name | `CharacterGenerator.generate(seed, audio, track, { forceName: 'Gandalf' })` |
| **Non-deterministic** | Same seed produces different names | `CharacterGenerator.generate(seed, audio, track, { deterministicName: false })` |

**Advanced:** For manual name generation using the full `NamingEngine` API (with control over deterministic mode), see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#helper-namingengine).


### Deterministic Character Generation

The same seed and audio profile always produces the same character:

**For more details on deterministic seeding, hash utilities, and seeded randomness, see [ROLLS_AND_SEEDS.md](docs/ROLLS_AND_SEEDS.md)**

```typescript
import { CharacterGenerator, AudioAnalyzer, type CharacterSheet } from 'playlist-data-engine';

const seed = 'ethereum-0x123abc-1';
const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);

// Generate the same character every time (same inputs = same output)
const char1 = CharacterGenerator.generate(seed, audio, track);
const char2 = CharacterGenerator.generate(seed, audio, track);

// Game mode affects the output, so different game modes = different characters
const standardChar = CharacterGenerator.generate(seed, audio, track, { gameMode: 'standard' });
const uncappedChar = CharacterGenerator.generate(seed, audio, track, { gameMode: 'uncapped' });

console.log(char1.race === char2.race);  // true
console.log(char1.class === char2.class);  // true
console.log(JSON.stringify(char1) === JSON.stringify(char2));  // true

// Use this for caching characters in your app
const characterCache = new Map<string, CharacterSheet>();
if (!characterCache.has(track.id)) {
  characterCache.set(track.id, CharacterGenerator.generate(track.id, audio, track));
}
```


---

## Advanced Examples

### Combining All Systems

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer,
  EnvironmentalSensors,
  GamingPlatformSensors,
  SessionTracker,
  CharacterUpdater
} from 'playlist-data-engine';

// Full pipeline: Parse → Analyze → Generate → Track → Level Up

// Initialize components ONCE (outside the loop)
const parser = new PlaylistParser();
const analyzer = new AudioAnalyzer();
const tracker = new SessionTracker();  // Single tracker maintains session history
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
const gamingSensors = new GamingPlatformSensors({
  steam: { apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_USER_ID }
});

const playlist = await parser.parse(playlistJSON);

for (const track of playlist.tracks) {
  // 1. Generate character from audio (choose game mode at creation time)
  const audio = await analyzer.extractSonicFingerprint(track.audio_url);
  let character = CharacterGenerator.generate(
    track.id,
    audio,
    track,
    { gameMode: 'standard' }  // or 'uncapped' for epic progression
  );

  // 2. Get environmental context (before starting session)
  const envContext = await sensors.updateSnapshot();

  // 3. Get gaming context (before starting session)
  const gamingContext = gamingSensors.getContext();

  // 4. Track listening session WITH context from the start
  const sessionId = tracker.startSession(track.id, track, {
    environmental_context: envContext,
    gaming_context: gamingContext
  });

  // ... user listens to the track ...

  // 5. End session (XP is calculated automatically with context)
  const session = tracker.endSession(sessionId);
  if (!session) continue;

  // 6. Update character with session results
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  character = result.character;

  console.log(`${character.name} earned ${result.xpEarned} XP`);
  console.log(`  Total: ${result.xpEarned}, Mastery Bonus: ${result.masteryBonusXP}`);
  if (result.leveledUp) {
    console.log(`  LEVEL UP! Now level ${result.newLevel}`);
  }
}
```


---

## Stat Strategies & XP Scaling

**For detailed documentation, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**

---

## Environmental Sensors & Gaming Platform Integration

GPS, motion, weather, and light sensors that provide XP modifiers based on real-world conditions (running, night, storm, altitude).

Steam game detection and Discord Rich Presence integration that provide XP bonuses based on gaming activity.

**For detailed documentation, see [IRL_SENSORS.md](docs/IRL_SENSORS.md)**

---

## Combat System

Turn-based D&D 5e-inspired combat with initiative, attacks, spell casting, and dice rolling.

**For detailed documentation, see [COMBAT_SYSTEM.md](docs/COMBAT_SYSTEM.md)**

### Enemy Generation

Generate enemies and balanced encounters using the `EnemyGenerator` class. The system uses **two independent axes** for enemy creation:

| Concept | Determines | Examples |
|---------|------------|----------|
| **Challenge Rating (CR)** | Power level (stats, HP, level) | Weak beast vs. ancient dragon |
| **Rarity** | Complexity (abilities, resistances) | Simple guard vs. complex spellcaster |

**Key principle:** Any CR can combine with any rarity.

**For detailed documentation**, see [ENEMY_GENERATION.md](docs/ENEMY_GENERATION.md) for:
- Complete template list
- Rarity tier breakdowns
- Leader promotion system
- Audio-influenced generation
- Encounter balance formulas


---


## Extensibility System

The extensibility system allows you to add custom content at runtime, including spells, equipment, races, classes, features, skills, and appearance options.

**Detailed guides:**
- [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md) - Complete extensibility system (custom content, spawn rates, export/import, content packs)
- [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md) - Custom races, subraces, and classes
- [docs/CONTENT_PACKS.md](docs/CONTENT_PACKS.md) - Content packs with data of many types all in one file.
- [docs/PREREQUISITES.md](docs/PREREQUISITES.md) - Skill, spell, and feature prerequisites
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference

---


## Equipment System

Comprehensive equipment system with custom items, properties, enchanting, templates, batch spawning, and box-type containers.

**See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)** for:
- Equipment properties — Stat bonuses, skills, abilities, damage, conditions
- Equipment modification — Enchanting, cursing, upgrading at runtime
- Equipment spawning — Batch spawn by rarity, tags, or templates
- Equipment-granted features — Items that grant features, skills, or spells
- Box items — Containers, adventure packs, and loot boxes

---

## Validation Schemas

Zod schemas for runtime validation (`PlaylistTrackSchema`, `ServerlessPlaylistSchema`, `AudioProfileSchema`, `AbilityScoresSchema`, `CharacterSheetSchema`). Use for API validation, type guards, or form data.

```typescript
import { CharacterSheetSchema } from 'playlist-data-engine';

const result = CharacterSheetSchema.safeParse(externalData);
if (!result.success) {
  console.error('Invalid:', result.error.format());
}
```

---



## Available Exports

For a complete reference of all exports from the library, see **[DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md)**.

The reference includes:
- **Quick Export Reference** — Concise overview of all exports organized by category
- **Data Types** — Complete type definitions for all core data structures
- **Core Modules** — PlaylistParser, AudioAnalyzer, CharacterGenerator, and more
- **Progression System** — XP calculation, level-ups, stat increases
- **Equipment System** — Properties, enchanting, spawning, templates
- **Extensibility System** — ExtensionManager, FeatureQuery, SkillQuery, SpellQuery
- **Combat System** — Turn-based combat, initiative, dice rolling
- **Configuration** — Sensor and progression configuration
- **Utilities** — Seeded RNG, logging, validation schemas

---

## Development Workflow

**Watch mode**: `npm run dev` rebuilds on file changes.

When developing with `file://` or `npm link`: changes in `src/` are available immediately after rebuild.

**For complete environment configuration, see [`.env.example`](.env.example)** in the project root.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `WEATHER_API_KEY` | OpenWeatherMap API key for weather-based XP modifiers |
| `STEAM_API_KEY` | Steam Web API key for game detection |
| `STEAM_USER_ID` | Your 64-bit Steam ID |
| `DISCORD_CLIENT_ID` | Discord application ID for Rich Presence |
| `XP_MAX_MODIFIER` | Maximum XP multiplier (default: 3.0) |

All variables are optional. For complete configuration with examples and programmatic options, see **[`.env.example`](.env.example)**.

---

## Troubleshooting

### Library changes not reflecting
- With `npm link`: Changes are instant
- With `file://` paths: Run `npm run build` in the library, then clear your project's cache: `rm -rf node_modules/.bin/playlist-data-engine`

### Audio analysis not working
The `AudioAnalyzer` uses the Web Audio API, which requires:
1. A browser environment, **or**
2. A Node.js polyfill like `web-audio-api`

For TypeScript configuration issues, ensure `tsconfig.json` has `"moduleResolution": "node"` and `"esModuleInterop": true`.
