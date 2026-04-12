# Playlist Data Engine

> The data engine behind **[ar://listen](https://listen.arweave.net/)** — an interactive music player where every song becomes an adventure. Five years in the making.

The engine takes **serverless playlists** (stored on Arweave via the Ario network) and turns them into music-powered experiences. It parses playlist data into clean formats, analyzes audio with TensorFlow-powered ML models, detects beats for rhythm games, generates RPG characters from sonic fingerprints, runs combat simulations with seeded dice, and feeds real-world sensor data back into the player to create a living, responsive experience. All with automatic Arweave gateway failover via the Ario Wayfinder so your data is always reachable.

**Think of it as a toybox for making music more fun.**

### The Vision: An Intelligent Music Player

The original design — five years ago — was simple: what if a music player *listened* to your music as carefully as you do? What if it knew the genre, the mood, the beats, the groove? What if it could react to where you are, what you're doing, the weather outside, the time of day? What if every song came with a character, a combat encounter, a rhythm game chart — all generated from the music itself?

That's what this engine does. Every system connects back to making the music player smarter and more interactive:

| Player Feature | What Powers It |
|---|---|
| **Playlist loading** from Arweave with automatic gateway failover | PlaylistParser + Ario Wayfinder |
| **Dynamic theming** — colors, mood, energy from the music | ColorExtractor + MusicClassifier + AudioAnalyzer |
| **Real-time beat visualization** synced to audio playback | BeatStream + BeatMapGenerator |
| **Rhythm game mode** — play along to any song | Beat detection + auto chart generation + ButtonMapper |
| **Character companions** generated from each song | CharacterGenerator + AudioAnalyzer |
| **Combat encounters** drawn from the music's energy and complexity | EnemyGenerator + CombatEngine |
| **Context-aware XP** — running at night in the rain earns more | EnvironmentalSensors + GamingPlatformSensors |
| **Progression that persists** across listening sessions | SessionTracker + CharacterUpdater + PrestigeSystem |
| **Genre-aware recommendations** from 400+ subgenres | MusicClassifier (TensorFlow + essentia.js) |
| **Pitch-driven visuals** — melody contour, note detection | PitchAnalyzer (pYIN + Essentia.js WASM) |

---

## What Can You Build?

The engine is modular — use what you want, ignore the rest. Everything here serves the interactive music player, but each piece works standalone too.

### Playlist Parsing & Data Extraction (Core Feature)

- **Serverless Playlist Parser** — Parse Arweave-hosted playlists into clean, structured data with automatic gateway failover via the Ario Wayfinder network
- **Quick Data Extraction** — One-liners to grab audio URLs, image URLs, track titles, artists, genres, tags, durations, VRM models, and more
- **Color Extraction** — K-means color palette extraction from track artwork
- **Arweave Gateway Manager** — Built-in resilience: automatically races multiple Arweave gateways plus the Ario Wayfinder, caches working gateways, and falls back seamlessly when one fails

### Audio Analysis

- **Sonic Fingerprinting** — Triple-tap real-time analysis sampling at 5%, 40%, 70% of a track for fast profiling (bass/mid/treble dominance, RMS energy, dynamic range, spectral features)
- **Full Timeline Analysis** — Segment-by-segment analysis of entire songs for waveform visualization and level generation
- **Genre & Mood Detection** — TensorFlow.js + essentia.js ML models classify genres (400+ Discogs subgenres), moods (60 themes), and vibe metrics (danceability, energy, valence) using musicnn, effnet, vggish, and tempocnn architectures
- **Pitch Detection** — Full-track pitch analysis using the pYIN algorithm and Essentia.js WASM detectors (including CREPE), with melody contour analysis, pitch direction tracking, and interval statistics

### Rhythm Games

Three modes for rhythm game development:

1. **Beat Detection** — Detect beats automatically using the Ellis 2007 dynamic programming algorithm with multi-band onset detection, configurable sensitivity/filtering, and +/-10ms precision via Web Audio API scheduling
2. **Manual Chart Creation** — Build complicated rhythm game charts by hand with required key assignment, downbeat configuration, time signature changes, and per-beat key mapping for DDR/Guitar Hero/Tap controller modes
3. **Automatic Chart Generation** — Full procedural pipeline: multi-band transient detection → rhythm quantization → phrase detection → composite stream generation → difficulty variant generation (easy/medium/hard/natural), with pitch-based button mapping

Plus: groove analysis (pocket detection, hotness meter), combo/groove XP rewards, beat interpolation, and real-time subdivision switching for practice mode.

### RPG Characters from Music

- **Deterministic Character Generation** — Analyze audio and generate RPG character sheets (race, class, stats, abilities, spells, equipment, appearance) — same song, same character, always
- **Combat Simulator** — Turn-based combat with AI opponents, seeded dice, Monte Carlo balance testing, and parameter sweeps
- **Enemy Generation** — Procedural enemies from music with CR scaling, archetypes, rarity tiers, and simulation-validated balance
- **Equipment & Enchanting** — Items, weapons, armor, accessories with enchanting, set bonuses, box loot, and stat effects
- **Progression System** — Full XP, leveling (lv.20 max + uncapped), stat strategies, track mastery, and a 10-tier prestige system
- **Content Packs** — Modular system for custom races, classes, enemies, equipment, and spells
- **IRL Sensor Integration** — The player adapts to your world: GPS, weather, motion, gaming platform, and solar data feed into XP multipliers and gameplay modifiers
- **Seeded Randomness** — Deterministic dice rolling, seeded RNG, and reproducible simulations

---

## Quick Start

```bash
npm install
npm test
npm run build
```

### Parse a Playlist & Extract Data

```typescript
import { PlaylistParser, getAudioUrls, getTrackTitles, getArtists } from 'playlist-data-engine';

const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistJSON);

// Quick data extraction
const urls = getAudioUrls(playlist);         // ['https://...', ...]
const titles = getTrackTitles(playlist);     // ['Song 1', 'Song 2']
const artists = getArtists(playlist);        // ['Artist A', 'Artist B']
const genres = getGenres(playlist);          // ['Electronic', 'Hip-Hop']
const duration = getTotalDuration(playlist); // total seconds
```

### Analyze Audio

```typescript
import { AudioAnalyzer, MusicClassifier, PitchAnalyzer } from 'playlist-data-engine';

// Fast sonic fingerprint (samples at 5%, 40%, 70%)
const analyzer = new AudioAnalyzer();
const profile = await analyzer.extractSonicFingerprint(track.audio_url);
// → { bass_dominance, mid_dominance, treble_dominance, rms_energy, dynamic_range, ... }

// TensorFlow-based genre, mood, and vibe classification
const classifier = new MusicClassifier();
const classification = await classifier.analyze(track.audio_url);
// → { genres: ['techno', 'detroit-house'], moods: ['energetic', 'driving'], vibes: { danceability, energy, valence } }

// Full-track pitch detection (pYIN algorithm)
const pitchAnalyzer = new PitchAnalyzer();
const pitch = await pitchAnalyzer.analyze(track.audio_url);
// → { fundamentalFrequency, noteName, contour, intervals, ... }

// Full timeline analysis (every 2 seconds, or exactly N data points)
const timeline = await analyzer.analyzeTimeline(track.audio_url, { type: 'interval', intervalSeconds: 2 });
```

### Beat Detection & Rhythm Games

```typescript
import { BeatMapGenerator, BeatStream } from 'playlist-data-engine';

// Auto-detect beats
const generator = new BeatMapGenerator();
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Stream beats in real-time synced to audio playback
const stream = new BeatStream(beatMap, audioContext);
const result = stream.checkButtonPress(timestamp);
// → { accuracy: 'perfect', matchedBeat, offset, ... }
```

### Generate a Character from a Song

```typescript
import { AudioAnalyzer, CharacterGenerator, generateSeed } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
const character = CharacterGenerator.generate(track.id, audioProfile, track);
// → { name, race, class, level, abilityScores, hp, equipment, spells, ... }
```

---

## Arweave & the Ario Wayfinder

Playlists are stored on Arweave. The engine uses the **Ario Wayfinder** network to maximize data resiliency — it races multiple Arweave gateways in parallel and the first to respond wins. No configuration needed.

```typescript
import { arweaveGatewayManager } from 'playlist-data-engine';

// Resolves Arweave URLs with automatic fallback
const workingUrl = await arweaveGatewayManager.resolveUrl('https://arweave.net/txId/file.json');
```

---

## Architecture Overview

```
src/core/
├── parser/             # Playlist parsing & data extraction
│   ├── PlaylistParser.ts       # Parse Arweave-hosted playlists
│   └── MetadataExtractor.ts    # Extract URLs, titles, artists, genres
├── analysis/           # Audio analysis, classification, beat detection
│   ├── AudioAnalyzer.ts        # Sonic fingerprint (triple-tap & timeline)
│   ├── MusicClassifier.ts      # TensorFlow genre/mood/vibe classification
│   ├── PitchAnalyzer.ts        # Full-track pitch detection (pYIN)
│   ├── ColorExtractor.ts       # K-means color palette from artwork
│   ├── SpectrumScanner.ts      # Frequency band analysis
│   └── beat/                   # Beat detection, interpolation, subdivision
│       ├── BeatMapGenerator.ts # Beat map creation (Ellis DP algorithm)
│       ├── BeatStream.ts       # Real-time beat synchronization
│       ├── GrooveAnalyzer.ts   # Groove meter & pocket detection
│       ├── RhythmGenerator.ts  # Procedural rhythm generation pipeline
│       ├── ButtonMapper.ts     # DDR/Guitar Hero/Tap button mapping
│       └── BeatTracker.ts      # Tempo & beat tracking
├── generation/         # Procedural generation
│   ├── CharacterGenerator.ts   # Character sheet generation
│   ├── EnemyGenerator.ts       # Enemy generation from seeds
│   └── EquipmentGenerator.ts   # Equipment from audio profiles
├── progression/        # XP, leveling, stats
│   ├── CharacterUpdater.ts     # Apply XP & handle level-ups
│   ├── XPCalculator.ts         # Session & activity XP
│   ├── RhythmXPCalculator.ts   # Rhythm game scoring & XP
│   ├── StatManager.ts          # Stat strategies (manual, auto, custom)
│   └── LevelUpProcessor.ts     # Level-up processing
├── combat/             # D&D 5e combat engine
│   ├── CombatEngine.ts         # Turn-based combat resolution
│   ├── CombatSimulator.ts      # Monte Carlo simulation runner
│   ├── AttackResolver.ts       # Attack roll & damage resolution
│   └── InitiativeRoller.ts     # Initiative tracking
├── randomness/         # Seeded RNG & dice
│   ├── SeededRNG.ts            # Deterministic PRNG (MurmurHash V3)
│   ├── DiceRoller.ts           # Static D&D dice roller
│   └── SeededDiceRoller.ts     # Deterministic dice roller
├── content/            # Content pack system
│   └── ContentPackRegistry.ts  # Register & manage content packs
├── sensors/            # IRL sensor integration
│   └── SensorMultiplier.ts     # Activity & environment XP bonuses
└── types/              # TypeScript type definitions
```

---

## Core Concepts

### Serverless Playlist Parsing

The engine's bread and butter — the foundation everything else builds on. Feed it a raw serverless playlist JSON and it parses the data into clean, structured formats ready for your app. Audio URLs, image URLs, track metadata, VRM 3D model references — all extracted and organized.

The parser handles Arweave-hosted content with built-in gateway failover via the Ario Wayfinder. If one gateway is down, it automatically tries the next — your player never notices.

### Audio Analysis Pipeline

Four analysis modes, each serving different use cases:

| Mode | What It Does | Use Case |
|------|-------------|----------|
| **Sonic Fingerprint** | Fast frequency analysis at 3 sample points | Character generation, quick profiling |
| **Full Timeline** | Segment-by-segment analysis of entire song | Waveform visualization, level generation |
| **Music Classification** | TensorFlow genre/mood/vibe detection | Playlist organization, recommendation |
| **Pitch Analysis** | Full-track fundamental frequency detection | Melody analysis, button mapping |

Frequency analysis separates audio into three perceptual bands:
- **Bass** (20-400 Hz) — Kick drums, bass guitar, sub-bass
- **Mid** (400 Hz-4 kHz) — Vocals, guitars, keyboards
- **Treble** (4 kHz-14 kHz) — Hi-hats, cymbals, high harmonics

Genre classification uses essentia.js ML models with musicnn, effnet, vggish, and tempocnn architectures, covering 400+ Discogs subgenres and 60 mood themes.

### Deterministic Generation

Everything is seedable. Pass the same inputs, get the same outputs — always. Powered by `SeededRNG` (MurmurHash V3) flowing through character generation, enemy creation, combat dice, and rhythm game button mapping.

### D&D 5e-Inspired Progression

| Mode | Level Cap | Stat Increases | Description |
|------|-----------|----------------|-------------|
| **Standard** | 20 | Levels 4, 8, 12, 16, 19 (manual or smart auto) | Authentic D&D 5e experience |
| **Uncapped** | Unlimited | Every level (automatic) | Infinite progression with custom XP curves |

XP from multiple sources: listening sessions, combat, quests, rhythm game performance, and custom activities — all with configurable multipliers.

---

## Feature Highlights

### Beat Detection & Rhythm Games

Three ways to create rhythm game content:

**1. Auto-detect beats** — Ellis 2007 DP algorithm with configurable sensitivity, grid filtering, and beat interpolation to fill gaps

**2. Manual chart creation** — Build charts by hand with per-beat key assignment, downbeat configuration, time signature changes, and measure labeling

**3. Automatic chart generation** — Full procedural pipeline: multi-band transient detection → rhythm quantization → phrase detection → composite stream generation → difficulty variants (easy/medium/hard/natural), with pitch-based button mapping for DDR, Guitar Hero, and Tap modes

Plus: groove analysis, beat subdivision (eighth notes, triplets, 16th notes), real-time subdivision switching for practice, and rhythm XP (accuracy scoring, combo multipliers up to 5x, groove bonuses).

### Combat System

Turn-based combat with full simulation support — `CombatEngine` for live gameplay, `CombatSimulator` for running 1,000+ Monte Carlo simulations with seeded dice, configurable AI styles, and parameter sweeps for balance testing.

### Enemy Generation

Procedural enemies from music with CR-based scaling, archetypes (brute/archer/support), 8 creature categories, 4 rarity tiers, simulation-validated balance, and a `DifficultyCalculator` that binary-searches for the CR that hits your target win rate.

### Equipment & Enchanting

Music-derived weapons, armor, and accessories with enchanting, curses, upgrades, stat effects, conditional properties (time of day, creature type, wielder race/class), and loot box containers.

### Content Packs & Custom Content

Extensible content system — register custom races (with subraces), classes (with template inheritance), enemies, equipment, spells, skills, and appearance options at runtime via `ExtensionManager`. Drop in a content pack JSON and it works.

### IRL Sensor Integration

The player knows where you are and what you're doing. GPS, motion, weather (OpenWeatherMap), gaming platform (Steam), and solar position (NOAA algorithm, no API key needed) all feed into XP multipliers. Severe weather (blizzard, hurricane, typhoon, tornado) triggers dramatic bonus XP. Total multiplier capped at 3.0x.

### XP & Progression

Multiple XP sources (music, combat, quests, rhythm game, custom) all return identical detailed level-up breakdowns. Track mastery with dual requirements (plays + XP), a 10-tier prestige system (I-X), stat strategies from manual D&D 5e to custom formulas, and custom XP curves for uncapped mode.

### Seeded Randomness & Dice

Full D&D 5e dice system — `DiceRoller` (static, live gameplay) and `SeededDiceRoller` (instance-based, deterministic simulations). Inject into `CombatEngine` for reproducible combat. Same seed + same config = identical results, always.

---

## Installation & Integration

```bash
npm install playlist-data-engine
```

Dual ESM/CJS package with TypeScript declarations:

```typescript
import {
  PlaylistParser,
  AudioAnalyzer,
  MusicClassifier,
  PitchAnalyzer,
  BeatMapGenerator,
  CharacterGenerator,
  CombatEngine,
  CombatSimulator,
  arweaveGatewayManager,
  // ... many more
} from 'playlist-data-engine';
```

### Browser & Node.js

The engine runs in both environments. Audio analysis uses the Web Audio API (browser) or compatible polyfills like `web-audio-api` (Node.js). The playlist parser, combat simulator, dice rollers, and all non-audio features work everywhere.

---

## Documentation

| Document | What It Covers |
|----------|---------------|
| **[DATA_ENGINE_REFERENCE.md](docs/DATA_ENGINE_REFERENCE.md)** | Complete API reference — every type, class, method, and reference table |
| **[USAGE_IN_OTHER_PROJECTS.md](docs/USAGE_IN_OTHER_PROJECTS.md)** | Integration guide with working code examples for every major feature |
| **[AUDIO_ANALYSIS.md](docs/features/AUDIO_ANALYSIS.md)** | Sonic fingerprinting, full timeline, TensorFlow genre/mood classification, pitch detection |
| **[BEAT_DETECTION.md](docs/features/BEAT_DETECTION.md)** | Beat detection, manual charts, auto chart generation, pitch-based button mapping |
| **[COMBAT_SYSTEM.md](docs/features/COMBAT_SYSTEM.md)** | Turn-based combat engine, simulations, AI combat, parameter sweeps |
| **[ENEMY_GENERATION.md](docs/features/ENEMY_GENERATION.md)** | Procedural enemy generation, CR scaling, balance validation |
| **[EQUIPMENT_SYSTEM.md](docs/features/EQUIPMENT_SYSTEM.md)** | Equipment generation, enchanting, set bonuses, stat effects |
| **[CONTENT_PACKS.md](docs/features/CONTENT_PACKS.md)** | Content pack system, creating custom content packs |
| **[CUSTOM_CONTENT.md](docs/features/CUSTOM_CONTENT.md)** | Custom races, classes, enemies, equipment, spells |
| **[ROLS_AND_SEEDS.md](docs/features/ROLS_AND_SEEDS.md)** | Seeded RNG, dice rolling, deterministic combat simulations |
| **[XP_AND_STATS.md](docs/features/XP_AND_STATS.md)** | XP sources, leveling, stat strategies, prestige system |
| **[IRL_SENSORS.md](docs/features/IRL_SENSORS.md)** | Real-world sensor integration, activity bonuses |
| **[PREREQUISITES.md](docs/features/PREREQUISITES.md)** | Dependencies, environment setup, system requirements |
| **[EXTENSIBILITY_GUIDE.md](docs/features/EXTENSIBILITY_GUIDE.md)** | Extension points, plugin patterns, custom content registration |

---

## Project Status

- **Version**: 1.1.0
- **TypeScript**: Strict mode
- **Tests**: 7,205 tests across 183 test files
- **Module**: Dual ESM/CJS with full type declarations

## License

MIT
