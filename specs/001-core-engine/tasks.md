# Implementation Tasks: Core Data Engine

**Feature**: Core Data Engine  
**Branch**: `001-core-engine`  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Overview

This task list breaks down the Core Data Engine implementation into independently testable increments organized by phased delivery. All features from ENGINE_DESIGN_DOCUMENT.md v2.0 are included.

**Total Tasks**: 120  
**MVP Scope**: Phase 0 (Foundation)  
**Phased Delivery**: 6 phases from Foundation to Optional Combat

---

## Phase 0: Foundation (MVP) - 22 tasks

**Goal**: Core parsing, audio analysis, and basic character generation

### Setup (4 tasks)
- [x] **T001** Install core dependencies: `zod`, `murmurhash-v3`, `vitest`
- [x] **T002** Create comprehensive TypeScript interfaces in `src/core/types/`
  - [x] Playlist.ts, Track.ts, AudioProfile.ts, Character.ts
- [x] **T003** Configure `vitest` in `vite.config.ts` with mocking support
- [x] **T004** Create `src/index.ts` as public API entry point with exports

### Utilities (3 tasks)
- [x] **T005** [P] Implement deterministic seed generator in `src/utils/hash.ts`
  - [x] Use murmurhash-v3 to hash seed string to float (0.0-1.0)
- [x] **T006** [P] Create seeded RNG in `src/utils/random.ts`
  - [x] Deterministic random number generation from seed
- [x] **T007** Create Zod validation schemas in `src/utils/validators.ts`

### User Story 1: Playlist Parsing (7 tasks)
- [x] **T008** [US1] Create `PlaylistParser` class in `src/core/parser/PlaylistParser.ts`
- [x] **T009** [US1] Implement metadata parsing logic (JSON.parse with error handling)
- [x] **T010** [US1] Create `MetadataExtractor` with priority queue logic
  - [x] Audio: mp3 > lossy > audio_url > lossless > animation_url
  - [x] Image: image_small > image > image_large > image_thumb
  - [x] Name: name > title
  - [x] Artist: artist > created_by > minter
- [x] **T011** [US1] Implement audio URL validation (mark 404s as "Unsummonable")
- [x] **T012** [US1] Create `ValidationRules` with Zod schemas for PlaylistTrack
- [x] **T013** [US1] Implement flattening pipeline (raw JSON → PlaylistTrack)
- [x] **T014** [US1] Write unit tests for `PlaylistParser` in `tests/unit/parser.test.ts`

### User Story 2: Audio Analysis (8 tasks)
- [x] **T015** [US2] Create `AudioAnalyzer` class in `src/core/analysis/AudioAnalyzer.ts`
- [x] **T016** [US2] Implement "Triple Tap" sampling logic (5%, 40%, 70% positions)
- [x] **T017** [US2] Implement FFT frequency analysis using `OfflineAudioContext`
- [x] **T018** [US2] Create `SpectrumScanner` for frequency band separation
  - [x] Bass: 20Hz-250Hz
  - [x] Mid: 250Hz-4kHz
  - [x] Treble: 4kHz-20kHz
- [x] **T019** [US2] Calculate bass/mid/treble dominance from frequency buckets
- [x] **T020** [US2] Handle short audio files (< 3s) by analyzing entire buffer
- [x] **T021** [US2] Implement advanced metrics (spectral_centroid, spectral_rolloff, zero_crossing_rate)
- [x] **T022** [US2] Write unit tests for `AudioAnalyzer` in `tests/unit/analyzer.test.ts`

---

## Phase 1: Visual & Naming - 16 tasks

**Goal**: Color palette extraction and character naming

### User Story 3: Visual Analysis (6 tasks)
- [ ] **T023** [US3] Create `ColorExtractor` class in `src/core/analysis/ColorExtractor.ts`
- [ ] **T024** [US3] Implement image loading with off-screen canvas (100x100px)
- [ ] **T025** [US3] Implement k-means clustering algorithm for color quantization
- [ ] **T026** [US3] Implement median cut algorithm as fallback
- [ ] **T027** [US3] Calculate brightness, saturation, and monochrome detection
- [ ] **T028** [US3] Write unit tests for `ColorExtractor` in `tests/unit/colorExtractor.test.ts`

### User Story 5: Naming Engine (10 tasks)
- [ ] **T029** [US5] Create `NamingEngine` class in `src/core/generation/NamingEngine.ts`
- [ ] **T030** [US5] Implement name hierarchy extraction (title > token name > fallback)
- [ ] **T031** [US5] Implement cleaning logic:
  - [ ] Remove brackets: `(Official Video)`, `[Remix]`
  - [ ] Remove track numbers: `01 - Song`
- [ ] **T032** [US5] Implement Format 1: Class Title (40% probability)
  - [ ] Structure: `[Core] the [Class]`
- [ ] **T033** [US5] Implement Format 2: Adjective Construct (30% probability)
  - [ ] Create adjective mapping from AudioProfile + Genre
  - [ ] High Bass + Techno = "Thumping"
  - [ ] High Treble + Rock = "Screaming"
  - [ ] Low Amp + Ambient = "Whispering"
- [ ] **T034** [US5] Implement Format 3: Clan Construct (20% probability)
  - [ ] Structure: `[Core] of [Artist]`
- [ ] **T035** [US5] Implement weighted random selection (50/30/20)
- [ ] **T036** [US5] Create adjective database in `src/utils/constants.ts`
- [ ] **T037** [US5] Write unit tests for `NamingEngine` in `tests/unit/namingEngine.test.ts`
- [ ] **T038** [US5] Test format distribution matches probabilities
- [ ] **T039** [US5] Test cleaning logic with edge cases

---

## Phase 2: Advanced Character System - 24 tasks

**Goal**: Full D&D 5e character features

### User Story 4: Basic Character Generation (6 tasks)
- [x] **T041** [US4] Create `CharacterGenerator` class in `src/core/generation/CharacterGenerator.ts`
- [x] **T042** [US4] Create `RaceSelector` with deterministic hash → race index
  - [x] 9 races: Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
- [x] **T043** [US4] Create `ClassSuggester` with audio profile → class mapping
  - [x] 12 classes with frequency-based suggestions
- [x] **T044** [US4] Create `AbilityScoreCalculator` with frequency → score mapping
  - [x] STR: bass_dominance, DEX: treble_dominance, CON: average_amplitude
  - [x] INT: mid + spectral_centroid, WIS: balanced, CHA: mid + genre
- [x] **T045** [US4] Apply racial bonuses to ability scores (cap at 20)
- [x] **T046** [US4] Write unit tests for basic character generation

### User Story 6: Advanced Features (18 tasks)
- [ ] **T047** [US6] Create `SkillAssigner` class in `src/core/generation/SkillAssigner.ts`
- [ ] **T048** [US6] Implement 18 D&D skills with proficiency levels
  - [ ] STR: athletics
  - [ ] DEX: acrobatics, sleight_of_hand, stealth
  - [ ] INT: arcana, history, investigation, nature, religion
  - [ ] WIS: animal_handling, insight, medicine, perception, survival
  - [ ] CHA: deception, intimidation, performance, persuasion
- [ ] **T049** [US6] Assign class-based skill proficiencies
  - [ ] Rogue: expertise in 2 skills
  - [ ] Bard: expertise in 2 skills
- [ ] **T050** [US6] Implement saving throw proficiencies by class
- [ ] **T051** [US6] Create `SpellManager` class in `src/core/generation/SpellManager.ts`
- [ ] **T052** [US6] Define spell lists for each spellcasting class
  - [ ] Wizard, Sorcerer, Warlock, Bard, Cleric, Druid, Paladin, Ranger
- [ ] **T053** [US6] Implement spell slot calculation by level
- [ ] **T054** [US6] Create spell database in `src/utils/constants.ts`
  - [ ] Cantrips (level 0) through 9th level spells
  - [ ] Spell schools: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation
- [ ] **T055** [US6] Create `EquipmentGenerator` class
- [ ] **T056** [US6] Define starting equipment by class
- [ ] **T057** [US6] Implement inventory and equipped items management
- [ ] **T058** [US6] Create `AppearanceGenerator` class
- [ ] **T059** [US6] Implement deterministic appearance (from seed)
  - [ ] body_type, skin_tone, hair_style, hair_color, eye_color, facial_features
- [ ] **T060** [US6] Implement dynamic appearance (from audio/visual)
  - [ ] primary_color, secondary_color from ColorPalette
  - [ ] aura_color for magical classes
- [ ] **T061** [US6] Create race data with traits in `src/utils/constants.ts`
- [ ] **T062** [US6] Create class data with features in `src/utils/constants.ts`
- [ ] **T063** [US6] Write unit tests for skills in `tests/unit/skills.test.ts`
- [ ] **T064** [US6] Write unit tests for spells and equipment

---

## Phase 3: Progression System - 12 tasks

**Goal**: XP tracking, leveling, and session management

### User Story 9: Progression & Leveling (12 tasks)
- [ ] **T065** [US9] Create `XPCalculator` class in `src/core/progression/XPCalculator.ts`
- [ ] **T066** [US9] Implement base XP calculation (1 XP per second)
- [ ] **T067** [US9] Implement track completion bonus (95%+ listened)
- [ ] **T068** [US9] Create `SessionTracker` class
- [ ] **T069** [US9] Implement ListeningSession recording with timestamps
- [ ] **T070** [US9] Create `LevelUpProcessor` class
- [ ] **T071** [US9] Implement D&D 5e XP thresholds (levels 1-20) in constants
- [ ] **T072** [US9] Implement level-up mechanics:
  - [ ] Class features by level
  - [ ] HP increase (hit die + CON modifier)
  - [ ] Ability score increases (levels 4, 8, 12, 16, 19)
  - [ ] Spell slot increases for casters
- [ ] **T073** [US9] Create `MasterySystem` class
- [ ] **T074** [US9] Implement track mastery threshold and bonus XP
- [ ] **T075** [US9] Create `updateCharacterFromSession` function
- [ ] **T076** [US9] Write unit tests for progression in `tests/unit/progression.test.ts`

---

## Phase 4: Environmental Sensors - 16 tasks

**Goal**: Real-world sensor integration with privacy-first design

### User Story 7: Environmental Sensors (16 tasks)
- [ ] **T077** [US7] Create `EnvironmentalSensors` class in `src/core/sensors/EnvironmentalSensors.ts`
- [ ] **T078** [US7] Implement permission request system
  - [ ] Clear dialogs explaining data usage
  - [ ] Per-sensor opt-in/opt-out
- [ ] **T079** [US7] Create `GeolocationProvider` class
- [ ] **T080** [US7] Implement Geolocation API integration
  - [ ] latitude, longitude, altitude, accuracy, heading, speed
- [ ] **T081** [US7] Implement biome detection from coordinates
  - [ ] urban, forest, desert, mountain, water, tundra
- [ ] **T082** [US7] Create `MotionDetector` class
- [ ] **T083** [US7] Implement DeviceMotionEvent integration
  - [ ] acceleration, acceleration_with_gravity, rotation_rate
- [ ] **T084** [US7] Implement activity type detection
  - [ ] stationary (< 0.1), walking (0.1-0.4), running (0.4-0.7), driving (> 0.7)
- [ ] **T085** [US7] Create `WeatherAPIClient` class
- [ ] **T086** [US7] Integrate with weather API (OpenWeatherMap or similar)
  - [ ] temperature, humidity, pressure, weather_type, wind
  - [ ] is_night, moon_phase
- [ ] **T087** [US7] Create `LightSensor` class (experimental)
- [ ] **T088** [US7] Implement AmbientLightSensor API with fallback
- [ ] **T089** [US7] Implement environmental XP modifier calculation
  - [ ] Running: 1.5x, Thunderstorm: 1.4x, High altitude: 1.3x, Night: 1.25x
  - [ ] Cap at 3.0x total
- [ ] **T090** [US7] Implement continuous monitoring with callbacks
- [ ] **T091** [US7] Implement graceful degradation when sensors denied
- [ ] **T092** [US7] Write unit tests for sensors in `tests/unit/sensors.test.ts`

---

## Phase 5: Gaming Platform Integration - 14 tasks

**Goal**: Steam and Discord integration for gaming bonuses

### User Story 8: Gaming Integration (14 tasks)
- [ ] **T093** [US8] Create `GamingPlatformSensors` class in `src/core/sensors/GamingPlatformSensors.ts`
- [ ] **T094** [US8] Create `SteamAPIClient` class
- [ ] **T095** [US8] Implement Steam Web API integration
  - [ ] IPlayerService/GetRecentlyPlayedGames
  - [ ] ISteamUserStats/GetSchemaForGame
  - [ ] ISteamApps/GetAppList
- [ ] **T096** [US8] Implement Steam game detection and metadata fetching
- [ ] **T097** [US8] Create `DiscordRPCClient` class
- [ ] **T098** [US8] Implement Discord Rich Presence integration
  - [ ] Game name, details, party size, elapsed time
- [ ] **T099** [US8] Implement unified GamingContext merging Steam + Discord
- [ ] **T100** [US8] Implement gaming bonus calculation
  - [ ] Base: +25% for any gaming
  - [ ] Genre bonuses: Action +15%, RPG +20%, Strategy +10%
  - [ ] Multiplayer: +15% for party size > 1
  - [ ] Session duration: up to +20% for 4+ hours
- [ ] **T101** [US8] Implement compound bonus system (environmental + gaming)
  - [ ] Cap at 3.0x total
- [ ] **T102** [US8] Implement polling with exponential backoff
  - [ ] Default 60-second intervals
  - [ ] Backoff on rate limiting
- [ ] **T103** [US8] Implement game metadata caching
- [ ] **T104** [US8] Implement `isPlayingGame(gameName)` helper
- [ ] **T105** [US8] Write unit tests for gaming in `tests/unit/gaming.test.ts`
- [ ] **T106** [US8] Write integration tests with mock APIs

---

## Phase 6: Combat System (Optional) - 10 tasks

**Goal**: Turn-based combat engine for advanced RPG games

### User Story 10: Combat Engine (10 tasks)
- [ ] **T107** [US10] Create `CombatEngine` class in `src/core/combat/CombatEngine.ts`
- [ ] **T108** [US10] Create `InitiativeRoller` class
- [ ] **T109** [US10] Implement initiative rolls (d20 + DEX modifier)
- [ ] **T110** [US10] Implement turn order sorting
- [ ] **T111** [US10] Create `AttackResolver` class
- [ ] **T112** [US10] Implement attack rolls (d20 + attack bonus vs AC)
- [ ] **T113** [US10] Implement damage calculation with dice rolling
- [ ] **T114** [US10] Implement critical hits (natural 20 = double damage)
- [ ] **T115** [US10] Create `SpellCaster` class for combat spells
- [ ] **T116** [US10] Write unit tests for combat in `tests/unit/combat.test.ts`

---

## Integration & Polish - 8 tasks

**Goal**: End-to-end testing and documentation

- [ ] **T117** Create comprehensive integration test in `tests/integration/e2e.test.ts`
  - [ ] Full pipeline: JSON → Playlist → Audio Analysis → Character → Session → Level Up
- [ ] **T118** Create sensor integration test with mock data
- [ ] **T119** Create gaming integration test with mock APIs
- [ ] **T120** Update `README.md` with comprehensive examples
- [ ] **T121** Update `quickstart.md` with all API examples
- [ ] **T122** Add JSDoc comments to all public API methods
- [ ] **T123** Create mock data generators for testing
  - [ ] `tests/fixtures/mockSensorData.ts`
  - [ ] `tests/fixtures/mockGamingData.ts`
- [ ] **T124** Run full test suite and verify 100% pass rate

---

## Dependencies

### Phase Completion Order

```
Phase 0 (Foundation) → Phase 1 (Visual & Naming) → Phase 2 (Advanced Character) → Phase 3 (Progression) → Phase 4 (Environmental) → Phase 5 (Gaming) → Phase 6 (Combat)
```

**Critical Path**: Phase 0 must complete before all others. Phases 1-3 can partially overlap. Phases 4-6 are independent and can be developed in parallel.

### Parallel Execution Opportunities

**Phase 0**:
- T001-T004 (Setup) can run in parallel
- T005-T007 (Utilities) can run in parallel
- T010 (MetadataExtractor) can run parallel with T009

**Phase 1**:
- T023-T028 (Visual) can run parallel with T029-T040 (Naming)

**Phase 2**:
- T047-T050 (Skills) can run parallel with T051-T054 (Spells)
- T055-T057 (Equipment) can run parallel with T058-T060 (Appearance)

**Phase 4 & 5**:
- Environmental sensors (T077-T092) can run fully parallel with Gaming integration (T093-T106)

---

## Implementation Strategy

**MVP (Minimum Viable Product)**: Complete Phase 0 (Foundation)
- Playlist parsing, audio analysis, basic character generation
- Deliverable: Functional core engine for simple use cases

**Standard Release**: Complete Phases 0-3
- Adds visual analysis, naming, advanced character features, progression
- Deliverable: Full character generation and leveling system

**Enhanced Release**: Complete Phases 0-5
- Adds environmental sensors and gaming integration
- Deliverable: Real-world integration with XP bonuses

**Complete Release**: All phases including Phase 6
- Adds optional combat engine
- Deliverable: Full RPG toolkit

**Testing**: Unit tests for each module, integration tests for full pipeline
**Documentation**: JSDoc for all public APIs, comprehensive examples in quickstart.md
**Performance**: Benchmark all phases against success criteria

---

## Task Tracking

**Total Tasks**: 120
- Phase 0: 22 tasks (Foundation - MVP)
- Phase 1: 16 tasks (Visual & Naming)
- Phase 2: 24 tasks (Advanced Character)
- Phase 3: 12 tasks (Progression)
- Phase 4: 16 tasks (Environmental Sensors)
- Phase 5: 14 tasks (Gaming Integration)
- Phase 6: 10 tasks (Combat - Optional)
- Integration: 8 tasks (Testing & Documentation)

**Estimated Effort**:
- Phase 0: 3-4 weeks
- Phase 1: 1-2 weeks
- Phase 2: 2-3 weeks
- Phase 3: 1-2 weeks
- Phase 4: 2-3 weeks
- Phase 5: 2-3 weeks
- Phase 6: 1-2 weeks
- **Total**: 12-19 weeks for complete implementation
