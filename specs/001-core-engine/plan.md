# Implementation Plan: Core Data Engine

**Branch**: `001-core-engine` | **Date**: 2025-11-29 | **Spec**: [specs/001-core-engine/spec.md](../spec.md)
**Input**: Feature specification from `specs/001-core-engine/spec.md`

## Summary

The Core Data Engine is a standalone TypeScript package (`@audio-alchemist/core`) responsible for:
- Parsing playlist data from Arweave/JSON
- Performing audio and visual analysis
- Generating deterministic D&D 5e-inspired characters
- Integrating environmental sensors (GPS, motion, weather, light)
- Integrating gaming platforms (Steam, Discord)
- Managing character progression and XP systems
- Providing optional turn-based combat mechanics

It prioritizes isomorphic design (browser + Node.js) with strict data extraction logic and privacy-first sensor integration.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: 
- `zod` (Validation & schema)
- `murmurhash-v3` (Deterministic seeding)
- Web Audio API (Browser) / `web-audio-api` (Node polyfill for tests)
- Canvas API (Color extraction)
- Geolocation API, DeviceMotion API (Environmental sensors)
- Weather API client (e.g., OpenWeatherMap SDK)
- Steam Web API client (Gaming integration)
- Discord RPC/OAuth (Gaming integration)

**Storage**: N/A (Stateless processing, no persistent storage)
**Testing**: `vitest` (Fast, Vite-compatible, supports mocking)
**Target Platform**: Isomorphic (Browser + Node.js)
**Project Type**: npm package / library
**Performance Goals**: 
- < 2s parsing (50 tracks)
- < 1s audio analysis per track
- < 200ms color palette extraction
- < 100ms character generation
- < 50ms level-up processing

**Constraints**: 
- Zero-dependency preferred for core logic
- Strict typing (TypeScript)
- Privacy-first (all sensors opt-in)
- Graceful degradation when sensors unavailable

**Scale/Scope**: Complete data engine with all features from ENGINE_DESIGN_DOCUMENT.md v2.0

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **I. Standalone Core**: Designed as `@audio-alchemist/core`.
- [x] **II. Deterministic Generation**: Uses seed-based generation.
- [x] **III. Strict Extraction Logic**: Implements priority queues.
- [x] **IV. Lightweight Analysis**: Uses "Triple Tap" strategy.
- [x] **V. Privacy-First Sensors**: Sensors are optional/pluggable.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (comprehensive)
├── quickstart.md        # Phase 1 output
├── tasks.md             # Phase 2 output (comprehensive)
└── checklists/
    └── requirements.md  # Quality validation
```

### Source Code (repository root)

```text
src/
├── core/
│   ├── parser/          # Playlist parsing logic
│   │   ├── PlaylistParser.ts
│   │   ├── MetadataExtractor.ts
│   │   └── ValidationRules.ts
│   ├── analysis/        # Audio & visual analysis
│   │   ├── AudioAnalyzer.ts       # Triple Tap FFT
│   │   ├── ColorExtractor.ts      # Palette extraction
│   │   └── SpectrumScanner.ts     # Frequency analysis
│   ├── generation/      # Character generation (D&D 5e)
│   │   ├── CharacterGenerator.ts
│   │   ├── NamingEngine.ts        # RPG name generation
│   │   ├── RaceSelector.ts        # Deterministic race
│   │   ├── ClassSuggester.ts      # Audio-based class
│   │   ├── AbilityScoreCalculator.ts
│   │   ├── SkillAssigner.ts       # 18 D&D skills
│   │   ├── SpellManager.ts        # Spell lists & slots
│   │   ├── EquipmentGenerator.ts  # Starting equipment
│   │   └── AppearanceGenerator.ts # Visual customization
│   ├── progression/     # XP & leveling system
│   │   ├── XPCalculator.ts
│   │   ├── LevelUpProcessor.ts
│   │   ├── SessionTracker.ts
│   │   └── MasterySystem.ts
│   ├── sensors/         # Environmental & gaming sensors
│   │   ├── EnvironmentalSensors.ts
│   │   ├── GeolocationProvider.ts
│   │   ├── MotionDetector.ts
│   │   ├── WeatherAPIClient.ts
│   │   ├── LightSensor.ts
│   │   ├── GamingPlatformSensors.ts
│   │   ├── SteamAPIClient.ts
│   │   └── DiscordRPCClient.ts
│   ├── combat/          # Optional combat engine
│   │   ├── CombatEngine.ts
│   │   ├── InitiativeRoller.ts
│   │   ├── AttackResolver.ts
│   │   └── SpellCaster.ts
│   └── types/           # Shared interfaces
│       ├── Playlist.ts
│       ├── Track.ts
│       ├── AudioProfile.ts
│       ├── ColorPalette.ts
│       ├── Character.ts
│       ├── Environmental.ts
│       ├── Gaming.ts
│       ├── Progression.ts
│       └── Combat.ts
├── utils/               # Shared utilities
│   ├── hash.ts          # MurmurHash seeding
│   ├── random.ts        # Seeded RNG
│   ├── validators.ts    # Zod schemas
│   └── constants.ts     # D&D 5e data (races, classes, spells)
├── index.ts             # Public API exports
└── config.ts            # Configuration types

tests/
├── unit/                # Core logic tests
│   ├── parser.test.ts
│   ├── analyzer.test.ts
│   ├── colorExtractor.test.ts
│   ├── generator.test.ts
│   ├── namingEngine.test.ts
│   ├── skills.test.ts
│   ├── progression.test.ts
│   ├── sensors.test.ts
│   ├── gaming.test.ts
│   └── combat.test.ts
├── integration/         # End-to-end tests
│   ├── e2e.test.ts
│   ├── fullPipeline.test.ts
│   └── sensorIntegration.test.ts
└── fixtures/            # Test data
    ├── samplePlaylist.json
    ├── sampleTrack.json
    ├── mockAudioBuffers.ts
    ├── mockImages.ts
    └── mockSensorData.ts
```

**Structure Decision**: Single monorepo-style project within the existing Vite app, structured as a library with clear module boundaries.

## Architecture Layers

### Layer 1: Data Ingestion
- **PlaylistParser**: Fetches and parses raw JSON
- **MetadataExtractor**: Implements priority queues for audio/image/name/artist
- **ValidationRules**: Zod schemas for data validation

### Layer 2: Analysis
- **AudioAnalyzer**: Triple Tap FFT analysis (5%, 40%, 70%)
- **ColorExtractor**: K-means/median cut palette extraction
- **SpectrumScanner**: Frequency band separation (bass/mid/treble)

### Layer 3: Generation
- **CharacterGenerator**: Orchestrates full character creation
- **NamingEngine**: 4-format name generation with cleaning
- **RaceSelector**: Deterministic race from seed hash
- **ClassSuggester**: Audio profile → class mapping
- **AbilityScoreCalculator**: Frequency → ability score mapping
- **SkillAssigner**: Class-based skill proficiencies
- **SpellManager**: Spell lists for casters
- **EquipmentGenerator**: Starting equipment by class
- **AppearanceGenerator**: Deterministic + dynamic visuals

### Layer 4: Progression
- **XPCalculator**: Base XP + environmental + gaming bonuses
- **LevelUpProcessor**: D&D 5e level-up mechanics
- **SessionTracker**: Listening session recording
- **MasterySystem**: Track mastery tracking

### Layer 5: Sensors (Optional)
- **EnvironmentalSensors**: Unified sensor interface
  - GeolocationProvider: GPS data
  - MotionDetector: Accelerometer/gyroscope
  - WeatherAPIClient: Weather data fetching
  - LightSensor: Ambient light detection
- **GamingPlatformSensors**: Gaming activity detection
  - SteamAPIClient: Steam Web API integration
  - DiscordRPCClient: Discord Rich Presence

### Layer 6: Combat (Optional)
- **CombatEngine**: Turn-based combat orchestration
- **InitiativeRoller**: Initiative and turn order
- **AttackResolver**: Attack rolls and damage
- **SpellCaster**: Spell casting mechanics

## Data Flow

```
1. Input: Arweave TXID or JSON
   ↓
2. PlaylistParser → ServerlessPlaylist
   ↓
3. For each PlaylistTrack:
   a. AudioAnalyzer → AudioProfile (with optional ColorPalette)
   b. Deterministic seed from blockchain data
   c. CharacterGenerator → CharacterSheet
      - RaceSelector (from seed)
      - ClassSuggester (from audio)
      - AbilityScoreCalculator (from audio)
      - SkillAssigner (from class)
      - SpellManager (if caster)
      - EquipmentGenerator (from class)
      - AppearanceGenerator (seed + audio + visual)
      - NamingEngine (from track metadata)
   ↓
4. During gameplay:
   a. EnvironmentalSensors → EnvironmentalContext (optional)
   b. GamingPlatformSensors → GamingContext (optional)
   c. SessionTracker → ListeningSession
   d. XPCalculator → XP with bonuses
   e. LevelUpProcessor → Updated CharacterSheet
   ↓
5. Optional: CombatEngine for tactical gameplay
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multiple sensor APIs | Real-world integration is core value prop | Manual input would defeat purpose of environmental bonuses |
| Gaming platform integration | Unique differentiator for music+gaming | No simpler way to detect active gaming sessions |
| Full D&D 5e system | Depth required for engaging RPG mechanics | Simplified stats would reduce gameplay depth |
| Color palette extraction | Visual theming enhances character customization | Text-only would miss visual identity of music |
| Combat engine | Optional but enables full RPG experiences | Can be omitted for simpler implementations |

## Phased Implementation Strategy

### Phase 0: Foundation (MVP)
- Playlist parsing
- Audio analysis (Triple Tap)
- Basic character generation (race, class, ability scores)
- Deterministic seeding

### Phase 1: Visual & Naming
- Color palette extraction
- Naming engine with 4 formats
- Character appearance generation

### Phase 2: Advanced Character System
- 18 D&D skills
- Spell system
- Equipment & inventory
- Saving throws

### Phase 3: Progression
- XP calculation
- Level-up mechanics
- Session tracking
- Mastery system

### Phase 4: Environmental Sensors
- Geolocation integration
- Motion detection
- Weather API
- Light sensor
- XP modifiers

### Phase 5: Gaming Integration
- Steam API client
- Discord RPC
- Gaming bonuses
- Compound modifier system

### Phase 6: Combat (Optional)
- Combat engine
- Initiative system
- Attack/damage resolution
- Spell casting in combat

## Testing Strategy

### Unit Tests
- Each module independently tested
- Mock external dependencies (APIs, sensors)
- Deterministic seed testing for reproducibility
- Edge case coverage (404s, malformed data, permission denials)

### Integration Tests
- Full pipeline: JSON → Character
- Sensor integration with mock data
- Gaming platform integration with mock APIs
- XP calculation with compound bonuses

### Performance Tests
- Benchmark parsing speed (50 tracks < 2s)
- Benchmark audio analysis (< 1s per track)
- Benchmark color extraction (< 200ms per image)
- Benchmark character generation (< 100ms)

### Privacy Tests
- Verify sensor permissions are requested
- Verify graceful degradation when denied
- Verify no data storage without consent

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Browser API compatibility | Feature detection + graceful degradation |
| Steam/Discord rate limiting | Exponential backoff + caching |
| Weather API costs | Optional feature, developer provides key |
| Audio analysis performance | OfflineAudioContext + Web Workers |
| Color extraction accuracy | Multiple algorithms (k-means + median cut) |
| Sensor permission fatigue | Cache permissions, clear value proposition |

## Success Metrics

- ✅ All 42 functional requirements implemented
- ✅ All 8 non-functional requirements met
- ✅ 100% test coverage for core logic
- ✅ < 2s parsing for 50 tracks
- ✅ < 1s audio analysis per track
- ✅ 100% deterministic character generation
- ✅ Graceful degradation for all optional features
- ✅ Privacy-compliant sensor integration
