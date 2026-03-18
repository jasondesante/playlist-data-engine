# Data Engine Reference

Complete API reference for the Playlist Data Engine. Contains all type definitions, class constructors, and method signatures.

**For quick overview, see [SPEC.md](specs/001-core-engine/SPEC.md)**
**For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)**

## Table of Contents

1. [Quick Export Reference](#quick-export-reference)
2. [Data Types](#data-types)
3. [Core Modules](#core-modules)
4. [Beat Detection](#beat-detection)
   - [BeatMapGenerator](#beatmapgenerator)
   - [BeatStream](#beatstream)
   - [GrooveAnalyzer](#grooveanalyzer)
   - [OnsetStrengthEnvelope](#onsetstrengthenvelope)
   - [BeatTracker](#beattracker)
   - [TempoDetector](#tempodetector)
   - [Beat Detection Utilities](#beat-detection-utilities)
5. [Progression System](#progression-system)
6. [Configuration](#configuration)
7. [Environmental Sensors](#environmental-sensors)
8. [Gaming Integration](#gaming-integration)
9. [Combat System](#combat-system)
10. [Enemy Generation](#enemy-generation)
11. [Equipment System](#equipment-system)
   - [Equipment Types](#equipment-types)
   - [EquipmentEffectApplier](#equipmenteffectapplier)
   - [EquipmentValidator](#equipmentvalidator)
   - [Equipment Generator](#equipment-generator)
   - [Equipment Modifier](#equipment-modifier)
   - [Equipment Spawn Helper](#equipment-spawn-helper)
   - [BoxOpener](#boxopener)
12. [Extensibility System](#extensibility-system)
    - [ExtensionManager](#extensionmanager)
    - [FeatureQuery](#featurequery)
    - [FeatureValidator](#featurevalidator)
    - [WeightedSelector](#weightedselector)
    - [SkillQuery](#skillquery)
    - [Skill Prerequisites](#skill-prerequisites)
    - [SkillValidator](#skillvalidator)
    - [SpellQuery](#spellquery)
    - [Spell Prerequisites](#spell-prerequisites)
    - [SpellValidator](#spellvalidator)
    - [Custom Races](#custom-races)
    - [Subrace Support](#subrace-support)
    - [Custom Classes](#custom-classes)

    **For spawn rates, CharacterGenerator extensions, validation rules, and advanced patterns, see [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)**
13. [Cross-References](#cross-references)

---

## Quick Export Reference

A concise overview of all main exports from the library, organized by category.

### Core Functionality

| Export | Description | Section |
|--------|-------------|---------|
| `PlaylistParser` | Parse playlist JSON/Araweave data | [Core Modules](#core-modules) |
| `MetadataExtractor` | Extract metadata from track objects | [Core Modules](#core-modules) |
| `getAudioUrls`, `getImageUrls`, etc. | Simple playlist data extraction utilities | [Core Modules](#core-modules) |
| `AudioAnalyzer` | Analyze audio frequency characteristics | [Core Modules](#core-modules) |
| `MusicClassifier` | Deep ML classification (genre, mood, vibe) | [Core Modules](#core-modules) |
| `SpectrumScanner` | Analyze frequency bands | [Core Modules](#core-modules) |
| `ColorExtractor` | Extract color palettes from images | [Core Modules](#core-modules) |
| `CharacterGenerator` | Generate D&D 5e characters deterministically | [Core Modules](#core-modules) |

### Extensibility

| Export | Description | Section |
|--------|-------------|---------|
| `ExtensionManager` | Register and manage custom content for all categories | [Extensibility System](#extensibility-system) |
| `FeatureQuery` | Query custom class features and racial traits | [Extensibility System](#extensibility-system) |
| `SkillQuery` | Query custom skills | [Extensibility System](#extensibility-system) |
| `SpellQuery` | Query spells with prerequisite validation | [Extensibility System](#extensibility-system) |
| `FeatureValidator` | Validate feature data structures | [Extensibility System](#extensibility-system) |
| `SkillValidator` | Validate skill data structures | [Extensibility System](#extensibility-system) |
| `SpellValidator` | Validate spell data structures | [Extensibility System](#extensibility-system) |
| `FeatureEffectApplier` | Apply feature effects to characters | [Extensibility System](#extensibility-system) |
| `WeightedSelector` | Weighted random selection with multiple modes | [Extensibility System](#extensibility-system) |
| `ensureAllDefaultsInitialized()` | Initialize all default data | [Extensibility System](#extensibility-system) |

### Character Generation

| Export | Description | Section |
|--------|-------------|---------|
| `RaceSelector` | Select character races | [Core Modules](#core-modules) |
| `ClassSuggester` | Suggest classes based on audio | [Core Modules](#core-modules) |
| `AbilityScoreCalculator` | Calculate ability scores | [Core Modules](#core-modules) |
| `SkillAssigner` | Assign skills and proficiencies | [Core Modules](#core-modules) |
| `SpellManager` | Manage spells and casting | [Core Modules](#core-modules) |
| `EquipmentGenerator` | Generate starting equipment | [Equipment System](#equipment-system) |
| `NamingEngine` | Generate character names | [Core Modules](#core-modules) |
| `AppearanceGenerator` | Generate character appearance | [Core Modules](#core-modules) |

### Progression & Leveling

| Export | Description | Section |
|--------|-------------|---------|
| `XPCalculator` | Calculate XP earned and thresholds | [Progression System](#progression-system) |
| `SessionTracker` | Track listening sessions | [Progression System](#progression-system) |
| `ISessionTracker` | Interface for session tracking (dependency injection) | [Progression System](#progression-system) |
| `LevelUpProcessor` | Handle level-ups | [Progression System](#progression-system) |
| `PrestigeSystem` | Track mastery prestige and thresholds | [Progression System](#progression-system) |
| `CharacterUpdater` | Apply sessions to characters | [Progression System](#progression-system) |
| `StatManager` | Manage stat increases | [Stat Increase System](#stat-increase-system) |
| `RhythmXPCalculator` | Calculate XP for rhythm game button presses | [Progression System](#progression-system) |

**Stat Increase Strategies:** `DnD5eStandardStrategy`, `DnD5eSmartStrategy`, `BalancedStrategy`, `PrimaryOnlyStrategy`, `RandomStrategy`, `ManualStrategy`, `createStatIncreaseStrategy` — see [Stat Increase System](#stat-increase-system)

### Equipment System

| Export | Description | Section |
|--------|-------------|---------|
| `EquipmentEffectApplier` | Apply/remove equipment effects when equipping/unequipping | [Equipment System](#equipment-system) |
| `EquipmentModifier` | Enchant, curse, upgrade, and modify equipment | [Equipment System](#equipment-system) |
| `EquipmentSpawnHelper` | Batch spawn equipment by rarity, tags, or templates | [Equipment System](#equipment-system) |
| `BoxOpener` | Open box-type items and generate their contents | [Equipment System](#boxopener) |

**Additional Equipment:** Predefined enchantment library, 38+ pre-built magic items, templates — see [Equipment System](#equipment-system) and [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)

### Sensors

| Export | Description | Section |
|--------|-------------|---------|
| `EnvironmentalSensors` | GPS, motion, weather, light integration | [Environmental Sensors](#environmental-sensors) |
| `GamingPlatformSensors` | Steam and Discord integration | [Gaming Integration](#gaming-integration) |

> **Note:** `SteamAPIClient` and `DiscordRPCClient` are internal implementation classes. Not exported as part of the public API.

### Combat System

| Export | Description | Section |
|--------|-------------|---------|
| `CombatEngine` | Turn-based D&D 5e combat | [Combat System](#combat-system) |
| `InitiativeRoller` | Roll initiative | [Combat System](#combat-system) |
| `AttackResolver` | Resolve attack rolls | [Combat System](#combat-system) |
| `SpellCaster` | Cast spells in combat | [Combat System](#combat-system) |
| `DiceRoller` | Standalone dice rolling utilities | [Combat System](#combat-system) |
| `EnemyGenerator` | Generate enemies and encounters | [Enemy Generation](#enemy-generation) |
| `PartyAnalyzer` | Analyze party strength for encounters | [Enemy Generation](#enemy-generation) |

### Beat Detection

| Export | Description | Section |
|--------|-------------|---------|
| `BeatMapGenerator` | Generate beat maps from audio (Ellis DP algorithm) | [Beat Detection](#beat-detection) |
| `BeatStream` | Real-time beat event streaming synchronized with audio | [Beat Detection](#beat-detection) |
| `GrooveAnalyzer` | "Groove meter" for rhythm game consistency tracking | [Beat Detection](#beat-detection) |
| `OnsetStrengthEnvelope` | Perceptual onset strength envelope calculation (Mel spectrogram) | [Beat Detection](#beat-detection) |
| `BeatTracker` | Dynamic Programming beat tracking (Ellis algorithm) | [Beat Detection](#beat-detection) |
| `TempoDetector` | Global tempo estimation with perceptual weighting | [Beat Detection](#beat-detection) |
| `reapplyDownbeatConfig` | Recalculate measure labels from manual configuration | [Beat Detection](#beat-detection) |
| `BeatInterpolator` | Fill gaps in beat maps with interpolated beats | [Beat Detection](#beat-detection) |
| `BeatSubdivider` | Subdivide beat maps into rhythmic patterns (half, eighth, sixteenth, triplets, dotted) | [Beat Detection](#beat-detection) |
| `unifyBeatMap` | Convert InterpolatedBeatMap to UnifiedBeatMap for subdivision | [Beat Detection](#beat-detection) |
| `subdivideBeatMap` | One-step convenience function for subdivision | [Beat Detection](#beat-detection) |
| `SubdivisionPlaybackController` | Real-time subdivision switching for practice mode | [Beat Detection](#beat-detection) |

**Beat Key Helpers:** `assignKeyToBeat`, `assignKeysToBeats`, `extractKeyMap`, `clearAllKeys`, `hasRequiredKeys`, `getKeyCount`, `getUsedKeys` — see [Beat Key Helper Functions](#beat-key-helper-functions)

**Beat Utilities:** `hzToMel`, `melToHz`, `resampleAudio`, `createMelFilterbank`, `highPassFilter`, `gaussianSmooth`, `calculateStdDev`, `performBeatFFT`, `performSTFT` — see [Beat Detection Utilities](#beat-detection-utilities)

**Beat Constants:** `DEFAULT_BEATMAP_GENERATOR_OPTIONS`, `DEFAULT_BEATSTREAM_OPTIONS`, `BEAT_ACCURACY_THRESHOLDS`, `BEAT_DETECTION_VERSION`, `BEAT_DETECTION_ALGORITHM`, `HOP_SIZE_PRESETS`, `MEL_BANDS_PRESETS`, `GAUSSIAN_SMOOTH_PRESETS`

**OSE Helper Functions:** `getHopSizeMs`, `getMelBands`, `getGaussianSmoothMs` — see [OSE Parameter Mode Helper Functions](#ose-parameter-mode-helper-functions)

### Utilities

| Export | Description | Section |
|--------|-------------|---------|
| `generateSeed` | Generate deterministic seeds from blockchain data | [Utilities](#utilities) |
| `hashSeedToFloat` | Hash seed to float in 0.0-1.0 range | [Utilities](#utilities) |
| `hashSeedToInt` | Hash seed to integer in range | [Utilities](#utilities) |
| `deriveSeed` | Derive new seed from base seed with suffix | [Utilities](#utilities) |
| `SeededRNG` | Deterministic random number generator | [Utilities](#utilities) |
| `Logger` / `createLogger` / `LogLevel` | Centralized logging utility | [Utilities](#utilities) |
| `SensorDashboard` / `display*Diagnostics()` | Diagnostic dashboard for sensors | [Utilities](#utilities) |
| `ImageValidator` | Validate icon/image URL fields | [Utilities](#utilities) |

**Validation Schemas:** `PlaylistTrackSchema`, `ServerlessPlaylistSchema`, `AudioProfileSchema`, `AbilityScoresSchema`, `CharacterSheetSchema` — see [Utilities](#utilities)

**Configuration:** `DEFAULT_SENSOR_CONFIG`, `loadConfigFromEnv()`, `mergeConfig()`, `DEFAULT_PROGRESSION_CONFIG`, `mergeProgressionConfig()` — see [Configuration](#configuration)

### Type Exports

All TypeScript types are exported, including:

**Character Types:** `CharacterSheet`, `AbilityScores`, `Skill`, `ProficiencyLevel`, `Race`, `Class`, `Ability`, `GameMode` — see [Data Types](#data-types)

**Generator Types:** `CharacterGeneratorOptions` (includes `gameMode`), `AudioProfile`, `ColorPalette`, `FrequencyBands`, `MusicClassificationProfile`, `ClassificationTag`, `VibeMetrics`, `GenreProfile`, `GenreTag` — see [Data Types](#data-types)

**Context Types:** `EnvironmentalContext`, `GamingContext`, `ListeningSession` — see [Data Types](#data-types)

**Stat Increase Types:** `StatIncreaseConfig`, `StatIncreaseResult`, `StatIncreaseStrategy`, `StatIncreaseOptions`, `StatIncreaseStrategyType`, `StatIncreaseFunction` — see [Stat Increase System](#stat-increase-system)

**Prestige Types:** `PrestigeLevel`, `PrestigeInfo`, `PrestigeResult`, `CustomThresholds` — see [Prestige System](#prestige-system)

**Extensibility Types:** `ClassFeature`, `RacialTrait`, `CustomSkill`, `FeatureEffect`, `FeaturePrerequisite`, `SkillPrerequisite`, `SpellPrerequisite`, `ValidationResult`, `ExtensionCategory` — see [Extensibility System](#extensibility-system) and [PREREQUISITES.md](docs/PREREQUISITES.md)

**Equipment Types:** `EnhancedEquipment` (primary), `Equipment` (legacy), `InventoryItem`, `EquipmentProperty`, `EquipmentCondition`, `EquipmentModification`, `EnhancedInventoryItem`, `EquipmentMiniFeature`, `SpawnRandomOptions`, `TreasureHoardResult` — see [Equipment System](#equipment-system)

**Box Types:** `BoxDropPool`, `BoxDrop`, `BoxContents`, `BoxOpenResult`, `BoxOpenRequirement`, `BoxOpenError` — see [BoxOpener](#boxopener)

**Enemy Types:** `EnemyCategory`, `EnemyRarity`, `EnemyArchetype`, `EnemyMixMode`, `EncounterDifficulty`, `SignatureAbility`, `AudioPreference`, `EnemyTemplate`, `RarityConfig`, `EnemyGenerationOptions`, `EncounterGenerationOptions`, `EnemyMetadata`, `EnemyFeature` — see [Enemy Generation](#enemy-generation)

**Beat Detection Types:** `Beat`, `BeatMap`, `BeatMapMetadata`, `BeatEvent`, `BeatEventType`, `BeatStreamCallback`, `AudioSyncState`, `BeatMapGeneratorOptions`, `BeatStreamOptions`, `BeatMapJSON`, `BeatAccuracy`, `ButtonPressResult`, `AccuracyThresholds`, `DifficultyPreset`, `TempoEstimate`, `OSEConfig`, `BeatTrackerConfig`, `TempoDetectorConfig`, `TimeSignatureConfig`, `DownbeatSegment`, `DownbeatConfig`, `BeatMapGenerationProgress` — see [Beat Detection](#beat-detection) and [docs/AUDIO_ANALYSIS.md](docs/AUDIO_ANALYSIS.md)

**Beat Interpolation Types:** `BeatSource`, `BeatWithSource`, `QuarterNoteDetection`, `GapAnalysis`, `InterpolationMetadata`, `InterpolatedBeatMap`, `BeatInterpolationOptions`, `InterpolatedBeatMapJSON`, `TempoSection`, `TempoSectionJSON` — see [Beat Detection](#beat-detection) and [docs/AUDIO_ANALYSIS.md](docs/AUDIO_ANALYSIS.md)

**Beat Subdivision Types:** `SubdivisionType`, `SubdivisionConfig`, `UnifiedBeatMap`, `SubdividedBeat`, `SubdividedBeatMap`, `SubdivisionMetadata`, `BeatSubdividerOptions` — see [Beat Detection](#beat-detection) and [docs/AUDIO_ANALYSIS.md](docs/AUDIO_ANALYSIS.md)

**Beat Key Types:** `KeyAssignableBeatMap`, `KeyAssignment` — see [Beat Key Helper Functions](#beat-key-helper-functions)

**OSE Parameter Mode Types:** `HopSizeMode`, `HopSizeConfig`, `MelBandsMode`, `MelBandsConfig`, `GaussianSmoothMode`, `GaussianSmoothConfig` — see [OSE Parameter Modes](#ose-parameter-modes)

**Game Data:** `RACE_DATA`, `CLASS_DATA`, `SPELL_DATABASE`, `XP_THRESHOLDS` — see [Game Data Reference](#game-data-reference)

---

## Data Types

Type definitions for all core data structures.

### Playlist Types

*Location:* *[src/core/types/Playlist.ts](src/core/types/Playlist.ts)*

| Type | Description | Key Properties |
|------|-------------|----------------|
| `ServerlessPlaylist` | Main container object returned by `PlaylistParser` | `name`, `tracks`, `image`, `creator`, `genre?`, `tags?` |
| `PlaylistTrack` | Flattened track object containing audio_url | `audio_url` (critical), `title`, `artist`, `image_url`, `image_thumb_url?`, chain data |
| `RawArweavePlaylist` | Raw input schema received from Arweave before parsing | `tracks[].metadata` (stringified JSON), blockchain shell data |

### AudioProfile

*Location:* *[src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)*

Result of the `AudioAnalyzer`. Used to generate characters.

| Property | Type | Description |
|----------|------|-------------|
| `bass_dominance` | number | Bass frequency dominance (0.0 - 1.0) |
| `mid_dominance` | number | Mid-range frequency dominance (0.0 - 1.0) |
| `treble_dominance` | number | Treble frequency dominance (0.0 - 1.0) |
| `average_amplitude` | number | Average amplitude (0.0 - 1.0) |
| `rms_energy?` | number | Root Mean Square energy (perceived loudness) |
| `dynamic_range?` | number | Difference between Peak and RMS (track "punch") |
| `spectral_centroid?` | number | Advanced metric: spectral centroid |
| `spectral_rolloff?` | number | Advanced metric: spectral rolloff |
| `zero_crossing_rate?` | number | Advanced metric: zero crossing rate |
| `color_palette?` | ColorPalette | Color palette extracted from artwork |
| `analysis_metadata` | object | Duration, buffer status, sample positions, timestamp |

### MusicClassificationProfile

*Location:* *[src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)*

Result of the `MusicClassifier`.

| Property | Type | Description |
|----------|------|-------------|
| `genres` | `ClassificationTag[]` | Array of matched genres |
| `moods` | `ClassificationTag[]` | Array of matched moods and themes |
| `primary_genre` | `string` | The highest-confidence genre tag |
| `mood_tags` | `string[]` | Top semantic mood keywords |
| `vibe_metrics` | `VibeMetrics` | Danceability, energy, valence, etc. |
| `analysis_metadata` | `object` | Duration, models used, timestamp |

### VibeMetrics

*Location:* *[src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)*

Quantitative vibe and engagement scores.

| Property | Type | Description |
|----------|------|-------------|
| `danceability` | `number?` | Suitability for dancing (0.0 - 1.0) |
| `energy` | `number?` | Perceived energy level (0.0 - 1.0) |
| `valence` | `number?` | Emotional positivity (0.0 - 1.0) |
| `engagement` | `number?` | Track catchiness (0.0 - 1.0) |

### ClassificationTag

*Location:* *[src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)*

Individual probability match for genre/mood.

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Tag name |
| `confidence` | `number` | Match confidence (0.0 - 1.0) |

### SamplingStrategy

Used by `analyzeTimeline` to determine how often to sample the audio.

| Option | Type | Description |
|--------|------|-------------|
| `type: 'interval'` | object | Sample every `intervalSeconds` |
| `type: 'count'` | object | Generate exactly `count` samples across the whole song |

### AudioTimelineEvent

Data point for a specific segment of audio.

| Property | Type | Description |
|----------|------|-------------|
| `timestamp` | number | Start time of the segment in seconds |
| `duration` | number | Duration of the segment in seconds |
| `bass` | number | Bass dominance for this segment (0.0 - 1.0) |
| `mid` | number | Mid dominance for this segment (0.0 - 1.0) |
| `treble` | number | Treble dominance for this segment (0.0 - 1.0) |
| `amplitude` | number | RMS amplitude for this segment (backward compatibility) |
| `rms_energy` | number | RMS energy for this segment (same as amplitude, for clarity) |
| `peak` | number | Maximum peak amplitude for this segment |
| `dynamic_range` | number | Dynamic range within this segment (peak - RMS) |
| `spectral_centroid` | number | Frequency brightness measure (always populated) |
| `spectral_rolloff` | number | Frequency below which 85% of energy is contained (always populated) |
| `zero_crossing_rate` | number | Measure of noisiness/percussiveness (always populated) |



### ColorPalette

*Location:* *[src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)*

Defines a color scheme derived from image analysis using k-means clustering.

*Also known as: Color scheme, palette, dominant colors*

| Property | Type | Description |
|----------|------|-------------|
| `colors` | string[] | Dominant colors ranked by frequency (hex format) |
| `primary_color` | string | Most dominant color |
| `secondary_color?` | string | Secondary color |
| `accent_color?` | string | Accent color |
| `brightness` | number | Average brightness (0.0 - 1.0) |
| `saturation` | number | Average saturation (0.0 - 1.0) |
| `is_monochrome` | boolean | Whether the image is monochrome |

### FrequencyBands

*Location:* *[src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)*

Audio frequency band separation for analysis. Rebalanced v2 ranges prevent treble dominance.

| Band | Range | Spectrum |
|------|-------|----------|
| Bass | 20Hz - 400Hz | 11% (380 Hz) |
| Mid | 400Hz - 4kHz | 52% (3,600 Hz) |
| Treble | 4kHz - 14kHz | 37% (10,000 Hz) |

### Character Types

*Location:* *[src/core/types/Character.ts](src/core/types/Character.ts)*

#### Race

*Also known as: Character race, playable race*

Branded type for extensible race names. Default D&D 5e races:

| Race |
|------|
| Human |
| Elf |
| Dwarf |
| Halfling |
| Dragonborn |
| Gnome |
| Half-Elf |
| Half-Orc |
| Tiefling |

**Custom races:** Can be registered via `ExtensionManager`. Use `asRace()` to cast strings and `isValidRace()` for runtime validation.

#### Class

*Also known as: Character class, job, profession*

Branded type for extensible class names. Default D&D 5e classes:

| Class |
|-------|
| Barbarian |
| Bard |
| Cleric |
| Druid |
| Fighter |
| Monk |
| Paladin |
| Ranger |
| Rogue |
| Sorcerer |
| Warlock |
| Wizard |

**Custom classes:** Can be registered via `ExtensionManager`. Use `asClass()` to cast strings and `isValidClass()` for runtime validation.

#### Ability

Standard D&D 5e ability scores:

| Ability | Description |
|---------|-------------|
| STR | Strength |
| DEX | Dexterity |
| CON | Constitution |
| INT | Intelligence |
| WIS | Wisdom |
| CHA | Charisma |

#### Skill

Standard D&D 5e skills:

| Skill | Ability |
|-------|---------|
| athletics | STR |
| acrobatics | DEX |
| sleight_of_hand | DEX |
| stealth | DEX |
| arcana | INT |
| history | INT |
| investigation | INT |
| nature | INT |
| religion | INT |
| animal_handling | WIS |
| insight | WIS |
| medicine | WIS |
| perception | WIS |
| survival | WIS |
| deception | CHA |
| intimidation | CHA |
| performance | CHA |
| persuasion | CHA |

#### ProficiencyLevel

Skill proficiency levels:

| Level | Description |
|-------|-------------|
| none | No proficiency |
| proficient | Proficient (add proficiency bonus) |
| expertise | Expertise (add 2× proficiency bonus) |

#### GameMode

Character progression rules:

| Mode | Description |
|------|-------------|
| standard | D&D 5e rules (stats capped at 20, increases at levels 4/8/12/16/19, max level 20) |
| uncapped | No stat limits, stat increases EVERY level (unlimited progression) |

#### Attack

*Location:* *[src/core/types/Character.ts](src/core/types/Character.ts)*

*Also known as: Weapon attack, combat action*

Combat attack representation.

| Property | Type | Description |
|----------|------|-------------|
| name | string | Attack name |
| bonus | number? | Legacy bonus field (deprecated) |
| attack_bonus | number? | Attack roll bonus |
| damage | string? | Damage description |
| damage_dice | string? | Damage dice (e.g., "1d8") |
| damage_type | string? | Damage type (e.g., "fire", "slashing") |
| type | 'melee' \| 'ranged' \| 'spell'? | Attack type |
| range | number? | Range in feet |
| properties | string[]? | Weapon properties (finesse, versatile, thrown, reach) |

#### Spell

*Location:* *[src/core/types/Character.ts](src/core/types/Character.ts)*

Spell representation for casting.

| Property | Type | Description |
|----------|------|-------------|
| name | string | Spell name |
| level | number? | Spell level (0-9) |
| school | string? | Magic school |
| casting_time | string? | Casting time (e.g., "1 action") |
| range | string? | Spell range |
| duration | string? | Duration |
| components | string[]? | Components (V, S, M) |
| description | string? | Spell description |
| icon | string? | Optional icon URL for small UI display |
| image | string? | Optional image URL for larger display |
| damage_dice | string? | Damage dice |
| damage_type | string? | Damage type |
| attack_roll | boolean? | Requires attack roll? |
| saving_throw | string? | Saving throw ability |

#### AbilityScores

*Location:* *[src/core/types/Character.ts](src/core/types/Character.ts)*

The six ability scores with optional aliases.

| Property | Type | Description |
|----------|------|-------------|
| STR | number | Strength score |
| DEX | number | Dexterity score |
| CON | number | Constitution score |
| INT | number | Intelligence score |
| WIS | number | Wisdom score |
| CHA | number | Charisma score |
| strength | number? | Alias for STR (backward compatibility) |
| dexterity | number? | Alias for DEX (backward compatibility) |
| constitution | number? | Alias for CON (backward compatibility) |

### CharacterSheet

*Location:* *[src/core/types/Character.ts](src/core/types/Character.ts)*

The complete D&D 5e character object. This is the core data structure returned by `CharacterGenerator.generate()`.

| Property | Type | Description |
|----------|------|-------------|
| name | string | Character name |
| race | Race | Character race |
| subrace | string? | Subrace (e.g., 'High Elf', 'Hill Dwarf') |
| class | Class | Character class |
| level | number | Current level (1-20 or uncapped) |
| ability_scores | AbilityScores | Base ability scores |
| ability_modifiers | AbilityScores | Calculated modifiers |
| proficiency_bonus | number | Proficiency bonus based on level |
| hp | { current, max, temp } | Hit points |
| armor_class | number | Armor class |
| initiative | number | Initiative bonus |
| speed | number | Speed in feet |
| skills | Record\<string, ProficiencyLevel\> | Skill proficiencies |
| saving_throws | Record\<Ability, boolean\> | Saving throw proficiencies |
| racial_traits | string[] | Racial trait IDs |
| class_features | string[] | Class feature IDs |
| spells | SpellSlots? | Spell slots and known spells (if applicable) |
| equipment | CharacterEquipment? | Equipment and inventory |
| appearance | CharacterAppearance? | Visual appearance details |
| xp | { current, next_level } | Experience points |
| seed | string | Generation seed (deterministic) |
| generated_at | string | Generation timestamp |
| gameMode | GameMode? | Progression rules (standard/uncapped) |
| pendingStatIncreases | number? | Number of pending stat increases awaiting selection |
| prestige_level | PrestigeLevel? | Track mastery prestige level (0-10, defaults to 0) |
| feature_effects | FeatureEffect[]? | Effects from features/traits |
| equipment_effects | EquipmentEffect[]? | Effects from equipped items |

### InventoryItem Variants

Three related types for equipment and inventory management.

| Type | Location | Description |
|------|----------|-------------|
| **InventoryItem** | *[src/core/generation/EquipmentGenerator.ts](src/core/generation/EquipmentGenerator.ts)* | Basic inventory: name, quantity, equipped flag |
| **EnhancedInventoryItem** | *[src/core/types/Equipment.ts](src/core/types/Equipment.ts)* | Adds: modifications, templateId, instanceId (for enchantments, per-instance tracking) |
| **CharacterEquipment** | *[src/core/types/Equipment.ts](src/core/types/Equipment.ts)* | Container: weapons[], armor[], items[], totalWeight, equippedWeight |

**Key differences:**
- `InventoryItem` - Legacy/compatibility type
- `EnhancedInventoryItem` - Current standard with enchantment support
- `CharacterEquipment` - Character's complete inventory state

### CharacterAppearance

*Location:* *[src/core/generation/AppearanceGenerator.ts](src/core/generation/AppearanceGenerator.ts)*

Visual appearance details for a character.

| Property | Type | Description |
|----------|------|-------------|
| body_type | 'slender' \| 'athletic' \| 'muscular' \| 'stocky' | Deterministic (from seed) |
| skin_tone | string | Deterministic (from seed) |
| hair_style | string | Deterministic (from seed) |
| hair_color | string | Deterministic (from seed) |
| eye_color | string | Deterministic (from seed) |
| facial_features | string[] | Deterministic (from seed) |
| primary_color | string? | Dynamic (from audio/visual) |
| secondary_color | string? | Dynamic (from audio/visual) |
| accent_color | string? | Dynamic (from audio/visual) |
| aura_color | string? | Dynamic (from audio/visual, magical classes only) |

### EnvironmentalContext

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

*Also known as: Environmental sensors, IRL sensors, real-world context*

Aggregated environmental sensor data that provides XP modifiers based on real-world conditions.

| Property | Type | Description |
|----------|------|-------------|
| geolocation | GeolocationData? | GPS position data |
| motion | MotionData? | Device motion/acceleration |
| weather | WeatherData? | Current weather conditions |
| light | LightData? | Ambient light level |
| biome | BiomeType? | Derived biome (12 types) |
| environmental_xp_modifier | number? | Composite XP multiplier (0.5-3.0) |
| timestamp | number | Unix timestamp |

**Biome types:** urban, forest, desert, mountain, valley, water, tundra, plains, jungle, swamp, taiga, savanna

### GeolocationData

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

GPS position and movement data.

| Property | Type | Description |
|----------|------|-------------|
| latitude | number | Latitude coordinate |
| longitude | number | Longitude coordinate |
| altitude | number \| null | Meters above sea level |
| accuracy | number | Accuracy in meters |
| heading | number \| null | Direction 0-360 degrees |
| speed | number \| null | Meters per second |
| timestamp | number | Unix timestamp |

### MotionData

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

Device motion and acceleration data from accelerometer/gyroscope.

| Property | Type | Description |
|----------|------|-------------|
| acceleration | {x, y, z} | Acceleration without gravity (m/s²) |
| accelerationIncludingGravity | {x, y, z} | Raw acceleration with gravity |
| rotationRate | {alpha, beta, gamma} | Rotation rates (degrees/second) |
| interval | number | Sample interval (ms) |
| timestamp | number | Unix timestamp |

### WeatherData

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

Current weather conditions from OpenWeatherMap API.

| Property | Type | Description |
|----------|------|-------------|
| temperature | number | Temperature in Celsius |
| humidity | number | Humidity percentage |
| pressure | number | Atmospheric pressure (hPa) |
| weatherType | string | Condition (Clear, Rain, Clouds, etc.) |
| windSpeed | number | Wind speed (m/s) |
| windDirection | number | Wind direction (degrees) |
| isNight | boolean | Based on sunrise/sunset |
| moonPhase | number | Moon phase 0.0-1.0 (new to full) |
| timestamp | number | Unix timestamp |

### LightData

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

Ambient light sensor data.

| Property | Type | Description |
|----------|------|-------------|
| illuminance | number | Light intensity in lux |
| timestamp | number | Unix timestamp |

### ForecastData

*Also known as: Weather forecast*

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

Weather forecast data for future time periods.

| Property | Type | Description |
|----------|------|-------------|
| temperature | number | Forecast temperature (Celsius) |
| humidity | number | Forecast humidity (%) |
| pressure | number | Forecast pressure (hPa) |
| weatherType | string | Forecast condition |
| windSpeed | number | Forecast wind speed (m/s) |
| windDirection | number | Forecast wind direction (degrees) |
| timestamp | number | Current timestamp |
| forecastTime | Date | When forecast applies |
| probabilityOfPrecipitation | number | PoP 0.0-1.0 |

### Sensor Types

*Also known as: Sensor status, sensor health, sensor diagnostics*

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

| Type | Description |
|------|-------------|
| **SensorType** | 'geolocation' \| 'motion' \| 'weather' \| 'light' |
| **SensorHealthStatus** | 'healthy' \| 'degraded' \| 'failed' \| 'unknown' |

### Sensor Status & Monitoring

*Location:* *[src/core/types/Environmental.ts](src/core/types/Environmental.ts)*

| Interface | Description |
|-----------|-------------|
| **PerformanceMetrics** | API call metrics (success/error counts, timing) |
| **PerformanceStatistics** | Computed stats (avg, min, max, success rate) |
| **SensorPermission** | Permission grant status per sensor |
| **SensorStatus** | Current health state (consecutive failures, retrying) |
| **SensorFailureLog** | Failure log entry with retry info |
| **SensorRetryConfig** | Retry policy (max retries, delays, backoff) |
| **SensorRecoveryNotification** | Status change notification |

### SevereWeatherAlert

*Also known as: Extreme weather, weather events*

*Location:* *[src/core/sensors/WeatherAPIClient.ts](src/core/sensors/WeatherAPIClient.ts)*

Severe weather event that provides XP bonus.

| Property | Type | Description |
|----------|------|-------------|
| type | SevereWeatherType | Blizzard, Hurricane, Typhoon, Tornado, None |
| xpBonus | number | XP bonus 0.5-1.0 (50%-100%) |
| severity | 'moderate' \| 'high' \| 'extreme' | Alert severity level |
| message | string | Alert description |
| detectedAt | number | Detection timestamp |

**SevereWeatherType:** Blizzard, Hurricane, Typhoon, Tornado, None

### GamingContext

*Also known as: Game detection, gaming activity, Steam integration*

*Location:* *[src/core/types/Progression.ts](src/core/types/Progression.ts)*

Steam gaming activity data. **Note:** Discord RPC CANNOT read game activity due to platform limitations. Discord RPC is only used for SETTING music presence ("Listening to" status).

| Property | Type | Description |
|----------|------|-------------|
| isActivelyGaming | boolean | Currently playing a game |
| platformSource | 'steam' \| 'none' | Detection platform |
| currentGame | object? | Current game info |
| currentGame.name | string | Game title |
| currentGame.source | 'steam' | Data source |
| currentGame.genre | string[]? | Game genres |
| currentGame.sessionDuration | number? | Minutes in current session |
| currentGame.partySize | number? | Multiplayer party size |
| totalGamingMinutes | number | Lifetime gaming while listening |
| gamesPlayedWhileListening | string[] | All games played |
| lastUpdated | number | Last check timestamp |

### Combat Types

*Location:* *[src/core/types/Combat.ts](src/core/types/Combat.ts)*

Core D&D 5e-inspired turn-based combat type definitions.

*Also known as: Combat system, battle system, turn-based combat*

#### CombatInstance

State of an active combat encounter.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `combatants` | Combatant[] | All participants |
| `currentTurnIndex` | number | Current turn position |
| `roundNumber` | number | Current round |
| `environment?` | EnvironmentalContext | Optional environmental context |
| `history` | CombatAction[] | Action log |
| `isActive` | boolean | Whether combat is ongoing |
| `winner?` | Combatant | Winner when combat ends |
| `startTime` | number | Combat start timestamp |
| `lastUpdated` | number | Last update timestamp |

#### Combatant

A character participating in combat.

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique ID within combat |
| `character` | CharacterSheet | The character |
| `initiative` | number | Initiative roll result |
| `currentHP` | number | Current hit points |
| `temporaryHP?` | number | Temp HP (absorbs damage first) |
| `statusEffects` | StatusEffect[] | Active conditions |
| `position?` | {x, y} | Tactical position |
| `isDefeated` | boolean | Defeated state |
| `actionUsed` | boolean | Action used this turn |
| `bonusActionUsed` | boolean | Bonus action used |
| `reactionUsed` | boolean | Reaction used |
| `spellSlots?` | Record<number, number> | Remaining slots by level |

#### CombatAction

An action taken during combat.

| Property | Type | Description |
|----------|------|-------------|
| `type` | ActionType | `'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready'` |
| `actor` | Combatant | Who performed the action |
| `target?` | Combatant | Single target |
| `targets?` | Combatant[] | Multiple targets |
| `attack?` | Attack | Attack data |
| `spell?` | Spell | Spell data |
| `result?` | CombatActionResult | Outcome |

#### StatusEffect

Temporary condition affecting a combatant.

*Also known as: Condition, debuff, buff*

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Effect name (e.g., "Charmed", "Frightened") |
| `description` | string | Effect description |
| `duration` | number | Rounds remaining |
| `source?` | string | Which combatant applied it |
| `hasConcentration?` | boolean | Requires concentration |

#### TreasureConfig

Configuration for custom combat loot rewards.

*Also known as: Loot config, rewards*

*Location:* *[src/core/types/Combat.ts](src/core/types/Combat.ts)*

| Property | Type | Description |
|----------|------|-------------|
| `gold?` | number \| `{ min: number; max: number }` | Fixed amount, or range for seeded RNG (inclusive) |
| `items?` | any[] | Custom items to award |

#### Additional Combat Types

*Location:* *[src/core/types/Combat.ts](src/core/types/Combat.ts)*

| Type | Description |
|------|-------------|
| `CombatActionResult` | Outcome of a combat action (success, roll, damage) |
| `AttackRoll` | Attack roll result (d20, bonus, hit/miss) |
| `DamageRoll` | Damage roll result (dice, rolls, total) |
| `SpellCastResult` | Spell casting outcome (success, save DC, effects) |
| `CombatResult` | Final combat result (winner, XP, treasure) |
| `CombatConfig` | Combat configuration options (environment, music, tactical, treasure) |
| `TreasureConfig` | Custom loot rewards (fixed gold, range, items) |

#### Combat Helper Types

**InitiativeResult**

*Location:* *[src/core/combat/InitiativeRoller.ts](src/core/combat/InitiativeRoller.ts)*

| Property | Type | Description |
|----------|------|-------------|
| `combatant` | Combatant | The combatant |
| `d20Roll` | number | d20 roll |
| `dexModifier` | number | DEX modifier |
| `initiativeTotal` | number | Total initiative |

**AttackResult**

*Location:* *[src/core/combat/AttackResolver.ts](src/core/combat/AttackResolver.ts)*

| Property | Type | Description |
|----------|------|-------------|
| `attacker` | Combatant | The attacker |
| `target` | Combatant | The target |
| `attack` | Attack | Attack used |
| `attackRoll` | AttackRoll | Roll result |
| `damageRoll?` | DamageRoll | Damage rolled |
| `hpAfterDamage?` | number | Target HP after damage |
| `description` | string | Result description |

**SpellSlots**

*Location:* *[src/core/generation/SpellManager.ts](src/core/generation/SpellManager.ts)*

| Property | Type | Description |
|----------|------|-------------|
| `spell_slots` | Record<number, {total, used}> | Slots by level |
| `known_spells` | string[] | Known spell names |
| `cantrips` | string[] | Cantrip names |

#### Damage Types

*Also known as: Damage categories, element types*

Physical: `slashing` | `piercing` | `bludgeoning`

Elemental: `fire` | `cold` | `lightning` | `thunder` | `poison` | `acid`

Magical: `necrotic` | `radiant` | `psychic` | `force`

#### Saving Throw Abilities

*Also known as: Save abilities, saves, saving throws*

`strength` | `dexterity` | `constitution` | `intelligence` | `wisdom` | `charisma`

---

### Utilities

#### Hashing & Seeds

*Location:* *[src/utils/hash.ts](src/utils/hash.ts)*

Functions for deterministic seed generation and hashing from blockchain data.

| Function | Returns | Description |
|----------|---------|-------------|
| `generateSeed(chain, address, id)` | `string` | Creates a unique seed string from blockchain identifiers |
| `hashSeedToFloat(seed)` | `number` | Float in range [0.0, 1.0) |
| `hashSeedToInt(seed, min, max)` | `number` | Integer in range [min, max) |
| `deriveSeed(baseSeed, suffix)` | `string` | Creates derived seed by appending suffix to base seed |

#### SeededRNG

*Location:* *[src/utils/random.ts](src/utils/random.ts)*

Deterministic random number generator for reproducible results. The same seed always produces the same sequence of random values.

| Method | Returns | Description |
|--------|---------|-------------|
| `constructor(seed)` | - | Creates a new RNG with the given seed string |
| `random()` | `number` | Float in range [0.0, 1.0) |
| `randomInt(min, max)` | `number` | Integer in range [min, max) - min inclusive, max exclusive |
| `randomChoice(array)` | `T` | Random element from the array |
| `weightedChoice(choices)` | `T` | Element from weighted choices - takes `[[value, weight], ...]` tuples |
| `shuffle(array)` | `T[]` | New array with elements in random order |
| `reset()` | `void` | Resets the internal counter to 0 (restarts sequence from seed) |

**Validation Schemas**

*Also known as: Zod schemas, runtime validators, type validation*

*Location:* *[src/utils/validators.ts](src/utils/validators.ts)*

Zod schemas for runtime type validation. Use `safeParse()` for validation.

| Schema | Validates |
|--------|-----------|
| `PlaylistTrackSchema` | Track metadata with chain-specific validation (AR: tx_id, others: token_address + token_id) |
| `ServerlessPlaylistSchema` | Complete playlist structure (metadata + tracks array) |
| `AudioProfileSchema` | Audio analysis (frequency, color palette, analysis metadata) |
| `AbilityScoresSchema` | All six ability scores (STR, DEX, CON, INT, WIS, CHA) in range 1-20 |
| `CharacterSheetSchema` | Complete character sheet (abilities, HP, skills, equipment, appearance, XP) |

#### Logging

*Location:* *[src/utils/logger.ts](src/utils/logger.ts)*

Centralized logging utility with configurable log levels and diagnostic modes.

**Log Levels**

| Level | Value | Description |
|-------|-------|-------------|
| `DEBUG` | 0 | Detailed debugging information |
| `INFO` | 1 | General operational information (default) |
| `WARN` | 2 | Warning conditions that should be addressed |
| `ERROR` | 3 | Error conditions that need attention |
| `NONE` | 4 | Disable all logging |

**Method Reference**

| Method | Returns | Description |
|--------|---------|-------------|
| `Logger.for(context)` | `Logger` | Creates a named logger instance for a class/module |
| `createLogger(context)` | `Logger` | Convenience function equivalent to `Logger.for()` |
| `debug(message, data?)` | `void` | Log debug message (most verbose) |
| `info(message, data?)` | `void` | Log info message (general operational info) |
| `warn(message, data?)` | `void` | Log warning message (potential issues) |
| `error(message, data?)` | `void` | Log error message (errors needing attention) |
| `Logger.setLevel(level)` | `void` | Set minimum log level to display (default: INFO) |
| `Logger.getLevel()` | `LogLevel` | Get current global log level |
| `Logger.configure(config)` | `void` | Configure logger globally (level, timestamps, handler) |
| `Logger.reset()` | `void` | Reset to default configuration |
| `Logger.enableVerbose()` | `void` | Enable verbose mode (sets level to DEBUG) |
| `Logger.disableVerbose()` | `void` | Disable verbose mode (sets level to INFO) |
| `Logger.setVerbose(enabled)` | `void` | Set verbose mode on/off |
| `Logger.isVerbose()` | `boolean` | Check if verbose mode is enabled |
| `Logger.enableDiagnosticMode()` | `void` | Enable diagnostic mode (maximum verbosity) |
| `Logger.disableDiagnosticMode()` | `void` | Disable diagnostic mode |
| `Logger.isDiagnosticMode()` | `boolean` | Check if diagnostic mode is enabled |

**Types**

*Location:* *[src/utils/logger.ts](src/utils/logger.ts)*

| Type | Description |
|------|-------------|
| `LogEntry` | Single log entry structure (timestamp, level, context, message, data) |
| `LoggerConfig` | Configuration options (level, includeTimestamp, includeContext, customHandler) |

#### ImageValidator

*Location:* *[src/core/utils/ImageValidator.ts](src/core/utils/ImageValidator.ts)*

*Also known as: Image URL validator, icon validator, image field validation*

Validates icon and image URL fields for all entity types. Ensures URLs follow allowed formats before storage.

**Valid URL Prefixes:** `http://`, `https://`, `/`, `assets/`

| Function | Returns | Description |
|----------|---------|-------------|
| `isValidImageUrl(url)` | `boolean` | Check if URL string is a valid format |
| `validateImageUrl(value, fieldName)` | `ImageValidationResult` | Validate single image field (returns errors array) |
| `validateImageFields(obj)` | `string[]` | Validate both icon and image fields on an object |
| `getValidImagePrefixes()` | `ReadonlyArray<string>` | Get list of valid URL prefixes |

**Types**

| Type | Description |
|------|-------------|
| `ImageValidationResult` | Validation result with `valid: boolean` and `errors: string[]` |

#### Sensor Dashboard

*Location:* *[src/utils/sensorDashboard.ts](src/utils/sensorDashboard.ts)*

Diagnostic tool for visual console output during development and debugging. Displays sensor status, health indicators, cache statistics, performance metrics, and recent failures.

**Functions**

| Function | Description |
|----------|-------------|
| `displayEnvironmentalDiagnostics(diagnostics, config?)` | Displays environmental sensor dashboard (GPS, motion, weather, light sensors) |
| `displayGamingDiagnostics(diagnostics, config?)` | Displays gaming platform sensor dashboard (Steam, Discord) |
| `displaySystemDashboard(data, config?)` | Displays combined system dashboard with health summary |

**Types**

*Location:* *[src/utils/sensorDashboard.ts](src/utils/sensorDashboard.ts)*

| Type | Description |
|------|-------------|
| `DashboardConfig` | Configuration options (useColors, compact, showTimestamp, maxFailures) |

---

### Game Data Reference

*Location:* *[src/utils/constants.ts](src/utils/constants.ts)*

*Also known as: Game constants, RPG data, D&D 5e data*

D&D 5e-inspired game constants for races, classes, XP, spells, and equipment.

#### Available Races (`ALL_RACES`)

*Also known as: Character races, playable races*

Human, Elf, Dwarf, Halfling, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling

#### Available Classes (`ALL_CLASSES`)

*Also known as: Character classes, job classes, professions*

Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard

#### Data Structures

*Also known as: Game databases, constant data*

| Constant | Description | Source |
|----------|-------------|--------|
| `RACE_DATA` | Ability bonuses, speed, traits for each race | *[src/utils/constants.ts](src/utils/constants.ts)* |
| `CLASS_DATA` | Hit dice, saving throws, skill options for each class | *[src/utils/constants.ts](src/utils/constants.ts)* |
| `XP_THRESHOLDS` | Level (1-20) to XP required mapping | *[src/utils/constants.ts](src/utils/constants.ts)* |
| `SPELL_DATABASE` | D&D 5e spells with details | *[src/utils/constants.ts](src/utils/constants.ts)* |
| `DEFAULT_EQUIPMENT` | Weapons, armor, items stats (201 items) | *[src/utils/equipmentConstants.ts](src/utils/equipmentConstants.ts)* |
| `MAGIC_ITEMS` | Example magic items (34 items) | *[src/utils/equipmentConstants.ts](src/utils/equipmentConstants.ts)* |
| `ITEM_CREATION_TEMPLATES` | Templates for enchanting equipment (9 templates) | *[src/utils/equipmentConstants.ts](src/utils/equipmentConstants.ts)* |
| `ENCHANTMENT_LIBRARY` | All enchantments and curses organized by category | *[src/utils/equipmentConstants.ts](src/utils/equipmentConstants.ts)* |
| `CLASS_STARTING_EQUIPMENT` | Starting equipment by class (12 classes) | *[src/utils/equipmentConstants.ts](src/utils/equipmentConstants.ts)* |

#### Helper Functions

*Location:* *[src/utils/constants.ts](src/utils/constants.ts)*

*Also known as: Data lookup functions, game data getters*

Retrieves data from default constants and custom extensions registered via ExtensionManager.

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `getRaceData()` | `race: string` | `RaceDataEntry \| undefined` | Race data (default or custom) |
| `getClassData()` | `className: string` | `ClassDataEntry \| undefined` | Class data with template inheritance support |
| `getClassSpellList()` | `className: string` | Spell list object \| undefined | Cantrips and spells by level |
| `getSpellSlotsForClass()` | `className: string`, `characterLevel: number` | `Record<number, number> \| undefined` | Spell slots per level for class |
| `getClassStartingEquipment()` | `className: string` | Equipment object \| undefined | Weapons, armor, items |

#### Type Definitions

**RaceDataEntry**

*Location:* *[src/utils/constants.ts](src/utils/constants.ts)* (31-43)

*Also known as: Race definition, racial stats*

| Property | Type | Description |
|----------|------|-------------|
| `ability_bonuses` | `Partial<Record<Ability, number>>` | Ability score bonuses granted |
| `speed` | `number` | Base walking speed in feet |
| `traits` | `string[]` | Racial trait names/IDs |
| `subraces` | `string[]` (optional) | Available subraces |
| `icon` | `string` (optional) | Icon URL for small UI display |
| `image` | `string` (optional) | Image URL for larger display |

**ClassDataEntry**

*Location:* *[src/utils/constants.ts](src/utils/constants.ts)* (243-342)

*Also known as: Class definition, job stats*

| Property | Type | Description |
|----------|------|-------------|
| `primary_ability` | `Ability` | Primary ability score |
| `hit_die` | `number` | Hit die size |
| `saving_throws` | `Ability[]` | Saving throw proficiencies |
| `is_spellcaster` | `boolean` | Whether class can cast spells |
| `skill_count` | `number` | Number of skills to choose |
| `available_skills` | `string[]` | Available skills (includes custom) |
| `has_expertise` | `boolean` | Whether class has expertise |
| `expertise_count` | `number` (optional) | Number of expertise choices |
| `baseClass` | `Class` (optional) | Base class for template inheritance |
| `audio_preferences` | `object` (optional) | Audio preferences for affinity |
| `icon` | `string` (optional) | Icon URL for small UI display |
| `image` | `string` (optional) | Image URL for larger display |

**Template Inheritance:** Custom classes with `baseClass` inherit properties from base D&D 5e classes. Custom properties override base properties. `available_skills` replaces (not merges) the base list.

#### Prerequisites

*Also known as: Requirements, conditions*

Skills, spells, and features can have prerequisites: base skills/spells/features, ability scores, minimum level, class/race requirements, or custom conditions.

**See [docs/PREREQUISITES.md](docs/PREREQUISITES.md)** for complete guide and examples.

#### Type Helper Functions

*Also known as: Type guards, type converters*

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `asClass()` | `value: string` | `Class` | Brands string as Class type for custom registration |
| `isValidClass()` | `value: string` | `boolean` | Type guard for valid class (default or custom) |

---

## Core Modules

### PlaylistParser

*Location:* *[src/core/parser/PlaylistParser.ts](src/core/parser/PlaylistParser.ts)*

Converts raw JSON data (Arweave) into standardized `ServerlessPlaylist` objects.

#### Class: `PlaylistParser`

**Constructor:**
```typescript
new PlaylistParser(options?: PlaylistParserOptions)
```

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `async parse(data: RawArweavePlaylist)` | `Promise<ServerlessPlaylist>` | Parses raw playlist data into ServerlessPlaylist with metadata and track array |

**Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `validateAudioUrls` | boolean | `false` | Perform HEAD request to verify audio URLs exist |
| `strict` | boolean | `false` | Throw errors on invalid tracks instead of skipping |
| `audioUrlValidationTimeout` | number | `5000` | Timeout in milliseconds for audio URL validation (prevents hanging) |

#### Helper: `MetadataExtractor`

*Location:* *[src/core/parser/MetadataExtractor.ts](src/core/parser/MetadataExtractor.ts)*

*Also known as: Metadata parser, field extractor*

Extracts metadata fields from playlist track data. All methods are static.

| Method | Returns | Description |
|--------|---------|-------------|
| `static extractAudioUrl(data)` | `string \| null` | Extracts audio URL with priority: mp3_url > lossy_audio > audio_url > lossless_audio > animation_url |
| `static extractImageUrl(data)` | `string \| null` | Extracts image URL with priority: image_small > image > image_large > image_thumb |
| `static extractImageThumbUrl(data)` | `string \| null` | Extracts thumbnail URL with priority: image_thumb_url > image_thumb |
| `static extractTitle(data)` | `string \| null` | Extracts name/title with priority: name > title |
| `static extractArtist(data)` | `string \| null` | Extracts artist with priority: artist > created_by > minter |
| `static parseMetadata(metadata)` | `Record<string, unknown> \| null` | Parses metadata string to JSON object with error handling |
| `static convertAttributes(attributes)` | `Record<string, string \| number> \| null` | Converts OpenSea-style attributes array to key-value object |

### Playlist Utilities

*Location:* *[src/utils/playlistUtils.ts](src/utils/playlistUtils.ts)*

Simple functions that return arrays of basic data from playlists. Works with both parsed (`ServerlessPlaylist`) and raw (`RawArweavePlaylist`) formats.

#### Array Extraction Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getAudioUrls(playlist)` | `string[]` | All audio URLs from tracks |
| `getImageUrls(playlist)` | `string[]` | All image URLs from tracks |
| `getTrackTitles(playlist)` | `string[]` | All track titles |
| `getArtists(playlist)` | `string[]` | All artist names |
| `getGenres(playlist)` | `string[]` | Unique genres (sorted alphabetically) |
| `getTags(playlist)` | `string[]` | Unique tags (sorted, lowercased) |
| `getTotalDuration(playlist)` | `number` | Total duration in seconds |
| `getTrackCount(playlist)` | `number` | Number of tracks |

#### Object Extraction Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getTracks(playlist)` | `SimpleTrack[]` | Simplified objects: `{ title, artist, audio_url, image_url, image_thumb_url? }` |
| `getFullTracks(playlist)` | `object[]` | All available track data as plain objects |

#### VRM Extraction Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `getVRMs(playlist)` | `string[]` | VRM URLs from tracks that have the optional `vrm` field |
| `getVRMTracks(playlist)` | `VRMTrack[]` | Track objects with VRM data: `{ title, artist, audio_url, image_url, image_thumb_url?, vrm }` |

#### Types

*Location:* *[src/utils/playlistUtils.ts](src/utils/playlistUtils.ts)*

| Type | Description |
|------|-------------|
| `PlaylistInput` | Union of `ServerlessPlaylist` or `RawArweavePlaylist` |
| `SimpleTrack` | Simplified track: `{ title, artist, audio_url, image_url, image_thumb_url? }` |
| `VRMTrack` | Track with VRM: `{ title, artist, audio_url, image_url, image_thumb_url?, vrm }` |

*For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md#playlist-utilities).*

---

### AudioAnalyzer

*Location:* *[src/core/analysis/AudioAnalyzer.ts](src/core/analysis/AudioAnalyzer.ts)*

*Also known as: Audio fingerprinting, frequency analysis, sonic analyzer*

Extracts sonic fingerprints from audio files using Web Audio API. Analyzes frequency bands (bass, mid, treble dominance) for character generation.

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeAdvancedMetrics` | boolean | `false` | Calculate spectral_centroid, spectral_rolloff, zero_crossing_rate |
| `sampleRate` | number | `44100` | Sample rate in Hz |
| `fftSize` | number | `2048` | FFT size (must be power of 2) |
| `trebleBoost` | number | `1` | Treble boost multiplier (0.0-1.0+) |
| `bassBoost` | number | `1` | Bass boost multiplier (0.0-1.0+) |
| `midBoost` | number | `1` | Mid boost multiplier (0.0-1.0+) |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `extractSonicFingerprint(audioUrl: string)` | `Promise<AudioProfile>` | Downloads and analyzes audio file; returns bass/mid/treble dominance, average_amplitude, RMS energy, dynamic range, optional advanced metrics, and analysis_metadata |
| `analyzeTimeline(audioUrl: string, strategy: SamplingStrategy)` | `Promise<AudioTimelineEvent[]>` | Performs full-song analysis, returning an array of frequency and amplitude data points over time |

### MusicClassifier

*Location:* *[src/core/analysis/MusicClassifier.ts](src/core/analysis/MusicClassifier.ts)*

*Also known as: ML audio classifier, music analyzer*

Deep semantic analysis of music including genre, mood, and vibe metrics using multiple `essentia.js` and TensorFlow.js models. Supports both single-step (one model) and two-step (embedding + classifier) architectures.

**Usage examples:** [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md#musicclassifier)

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `models` | `ModelsConfig` | `DEFAULT_ARWEAVE_MODELS` | Model URLs for each analysis type |
| `topN` | number | `5` | Return top N matches for genres and moods |
| `threshold` | number | `0.05` | Minimum confidence score (5%) |
| `cacheEmbeddings` | boolean | `true` | Cache embedding models for reuse across classifiers |

For complete type definitions (`ModelConfig`, `SingleStepModelConfig`, `TwoStepModelConfig`, `ModelArchitecture`, `GenreListType`), see [src/core/analysis/MusicClassifier.ts:15-77](src/core/analysis/MusicClassifier.ts#L15-L77).

#### DEFAULT_ARWEAVE_MODELS

Pre-configured Arweave-hosted models for zero-setup usage (see [source](src/core/analysis/MusicClassifier.ts#L379-L395)):

| Model | Architecture | Genre/Mood Type |
|-------|--------------|-----------------|
| `genre` | Two-step (effnet + discogs400) | 400+ subgenres |
| `mood` | Two-step (effnet) | 60+ mood themes |
| `danceability` | Single-step (musicnn) | Binary |

#### Architecture & Mel Bands

Different architectures require different mel-band configurations (see [`ModelArchitecture`](src/core/analysis/MusicClassifier.ts#L15-L24)):

| Architecture | Mel Bands | Use Case |
|--------------|-----------|----------|
| `musicnn` | 96 | MusiCNN, MSD classifiers |
| `effnet` | 128 | Discogs-EffNet embeddings |
| `vggish` | 64 | VGGish, AudioSet classifiers |
| `tempocnn` | 40 | TempoCNN tempo models |

#### Genre Label Detection

Genre models auto-detect their taxonomy from URL keywords (see [`GenreListType`](src/core/analysis/MusicClassifier.ts#L26-L35)):

| URL Keyword | Genre List | Count |
|-------------|------------|-------|
| `jamendo` | MTG Jamendo | 87 |
| `discogs400` or `discogs` | Discogs 400 | 400+ |
| `tzanetakis` | GTZAN | 10 |
| `mtt_musicnn` | MagnaTagATune | 50 |

#### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(audioUrl)` | `Promise<MusicClassificationProfile>` | Downloads and analyzes audio; returns genres, moods, vibe metrics, and metadata |
| `clearEmbeddingCache()` | `void` | Clears cached embedding models |
| `clearClassifierCache()` | `void` | Clears cached classifier models |
| `clearAllCaches()` | `void` | Clears all model caches |

#### Exports

| Export | Description |
|--------|-------------|
| `MusicClassifier` | Main classifier class |
| `DEFAULT_ARWEAVE_MODELS` | Pre-configured Arweave model URLs |
| `ModelArchitecture` | Type: `'musicnn' \| 'effnet' \| 'vggish' \| 'tempocnn'` |
| `GenreListType` | Type: `'jamendo' \| 'discogs400' \| 'tzanetakis' \| 'mtt_musicnn'` |
| `detectModelArchitecture()` | Detects architecture from URL |
| `detectGenreListType()` | Detects genre list from URL |
| `isTwoStepModel()` | Type guard for two-step config |
| `isSingleStepModel()` | Type guard for single-step config |

### ColorExtractor

*Also known as: Color palette extractor, dominant colors, k-means color analyzer*

*Location:* *[src/core/analysis/ColorExtractor.ts](src/core/analysis/ColorExtractor.ts)*

Extracts dominant colors from image URLs using K-Means clustering (k=4) with Median Cut fallback.

| Method | Returns | Description |
|--------|---------|-------------|
| `extractPalette(imageUrl: string)` | `Promise<ColorPalette>` | Extracts 4 dominant colors ranked by frequency; calculates brightness, saturation, monochrome status |

### SpectrumScanner

*Also known as: Frequency band separator, FFT band analyzer*

*Location:* *[src/core/analysis/SpectrumScanner.ts](src/core/analysis/SpectrumScanner.ts)*

Separates raw frequency data into bands using rebalanced v2 ranges (prevents treble dominance).

| Method | Returns | Description |
|--------|---------|-------------|
| `separateFrequencyBands(frequencyData, sampleRate)` | `FrequencyBands` | Separates FFT data into bass (20-400Hz), mid (400Hz-4kHz), treble (4kHz-14kHz) bands |
| `calculateDominance(band, bandWidthHz?)` | `number` | Calculates normalized average amplitude for a frequency band (bandwidth-aware) |

---

### CharacterGenerator

*Location:* *[src/core/generation/CharacterGenerator.ts](src/core/generation/CharacterGenerator.ts)*

*Also known as: Character builder, hero generator, PC creator, D&D character generator*

Creates deterministic D&D 5e character sheets from a seed and audio profile.

#### Class: `CharacterGenerator`

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static generate(seed, audioProfile, track, options?)` | `CharacterSheet` | Generates a complete character sheet deterministically |

**Options:**

| Property | Type | Description |
|----------|------|-------------|
| `level` | `number` | Starting level (1-20). Default: `1` |
| `forceClass` | `Class` | Override the suggested class from audio analysis |
| `forceRace` | `Race` | Override race selection (required when specifying subrace) |
| `subrace` | `string \| 'pure'` | Subrace selection |
| `gameMode` | `'standard' \| 'uncapped'` | Game mode for stat progression. Default: `'standard'` |
| `forceName` | `string` | Override automatic name generation with custom name |
| `deterministicName` | `boolean` | Generate deterministic names (same seed = same name). Default: `true` |
| `extensions` | `CharacterGeneratorExtensions` | Custom extensions for procedural generation |

**Subrace Options:**

| Value | Description | Requirements |
|-------|-------------|--------------|
| `undefined` | Randomly select between 'pure' and available subraces | None |
| `'pure'` | Explicitly no subrace | None |
| `'High Elf'`, etc. | Specific subrace | `forceRace` must be specified |

**Returns:** A complete `CharacterSheet` with race, class, level, ability scores, skills, spells (if applicable), equipment, and appearance.

**Types:**

| Type | Source | Description |
|------|--------|-------------|
| `CharacterSheet` | *[src/core/types/Character.ts](src/core/types/Character.ts)* | Complete character data structure |
| `CharacterGeneratorOptions` | *[src/core/generation/CharacterGenerator.ts](src/core/generation/CharacterGenerator.ts)* | Generation options interface |
| `CharacterGeneratorExtensions` | *[src/core/generation/CharacterGenerator.ts](src/core/generation/CharacterGenerator.ts)* | Custom content extensions |

#### Helper: `RaceSelector`

*Location:* *[src/core/generation/RaceSelector.ts](src/core/generation/RaceSelector.ts)*

*Also known as: Race picker, ancestry selector*

Deterministically selects a race based on the seed.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static select(rng: SeededRNG)` | `Race` | Selects from: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling |

#### Helper: `ClassSuggester`

*Location:* *[src/core/generation/ClassSuggester.ts](src/core/generation/ClassSuggester.ts)*

*Also known as: Class recommender, job suggester*

Suggests a class based on audio frequency dominance.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static suggest(audioProfile, rng)` | `Class` | **High Bass:** Barbarian, Fighter, Paladin. **High Treble:** Rogue, Ranger, Monk. **High Mid:** Wizard, Cleric, Druid. **High Amplitude:** Bard, Sorcerer, Warlock |

#### Helper: `AbilityScoreCalculator`

*Location:* *[src/core/generation/AbilityScoreCalculator.ts](src/core/generation/AbilityScoreCalculator.ts)*

*Also known as: Stat calculator, ability mapper*

Maps audio profile to ability scores (STR, DEX, CON, INT, WIS, CHA) using a randomized, 50/50 system.

**System (v2):**
- Each frequency band (bass/mid/treble) is randomly assigned to 2 abilities
- 50% random + 50% audio-influenced for each score
- One of each pair gets "spice" (combined with additional audio metrics like rms_energy, spectral_centroid)
- Result: 8-15 base range (D&D 5e standard array range)

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static calculateBaseScores(audioProfile, rng)` | `AbilityScores` | Randomly assigns bass/mid/treble to ability pairs; calculates 50% random + 50% audio (8-15 range) |
| `static applyRacialBonuses(baseScores, race)` | `AbilityScores` | Adds +2 bonuses based on race (capped at 20) |
| `static calculateModifiers(scores)` | `AbilityScores` | Calculates D&D 5e modifiers (e.g., 15 → +2) |

#### Helper: `SkillAssigner`

*Location:* *[src/core/generation/SkillAssigner.ts](src/core/generation/SkillAssigner.ts)*

*Also known as: Proficiency assigner, skill selector*

Assigns skill proficiencies based on class.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static assignSkills(characterClass, rng, character?)` | `Record<string, ProficiencyLevel>` | Selects skills from class's available list using weighted selection (if registered via `skillLists` in ExtensionManager) or equal weights. Handles "Expertise" for Bards and Rogues. Supports custom skills via SkillQuery. Optional `character` enables prerequisite validation |

#### Helper: `SpellManager`

*Location:* *[src/core/generation/SpellManager.ts](src/core/generation/SpellManager.ts)*

*Also known as: Spell manager, magic system, spell slot manager*

Manages spells for spellcasting classes.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static isSpellcaster(characterClass)` | `boolean` | Returns true if the class can cast spells |
| `static getSpellSlots(characterClass, characterLevel)` | `Record<number, { total, used }>` | Gets spell slot counts for a class at a given level |
| `static getCantrips(characterClass)` | `string[]` | Returns all available cantrips for a spellcasting class |
| `static getKnownSpells(characterClass, characterLevel, character?)` | `string[]` | Returns all spells known by a spellcaster at a given level. If `character` provided, filters by prerequisites |
| `static initializeSpells(characterClass, characterLevel, character?)` | `SpellSlots` | Returns complete spell configuration with slots, known spells, and cantrips |
| `static filterCharacterSpells(character)` | `CharacterSheet` | Filters known spells and cantrips by prerequisites, returns updated character sheet |
| `static getSpellCountAtLevel(spellLevel, spellSlots)` | `number` | Returns number of spell slots at a given level |
| `static useSpellSlot(spellSlots, spellLevel)` | `Record<number, { total, used }>` | Consumes one spell slot at the specified level |
| `static restoreSpellSlots(spellSlots, spellLevel?)` | `Record<number, { total, used }>` | Restores spell slots at a specific level or all levels |

#### Helper: `EquipmentGenerator`

*Location:* *[src/core/generation/EquipmentGenerator.ts](src/core/generation/EquipmentGenerator.ts)*

*Also known as: Inventory manager, gear generator*

Manages inventory and starting gear. For equipment properties, enchanting, and custom equipment, see [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md).

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static getStartingEquipment(characterClass)` | `{ weapons, armor, items }` | Returns starting equipment list for a class |
| `static initializeEquipment(characterClass)` | `CharacterEquipment` | Creates complete equipment state with starting gear equipped |
| `static addItem(equipment, itemName, quantity)` | `CharacterEquipment` | Adds an item to inventory and recalculates weight |
| `static removeItem(equipment, itemName, quantity)` | `CharacterEquipment` | Removes an item from inventory and recalculates weight |
| `static equipItem(equipment, itemName)` | `CharacterEquipment` | Equips an item from inventory |
| `static unequipItem(equipment, itemName)` | `CharacterEquipment` | Unequips an item from inventory |
| `static getInventoryList(equipment)` | `InventoryItem[]` | Returns flattened list of all inventory items |

#### Helper: `AppearanceGenerator`

*Location:* *[src/core/generation/AppearanceGenerator.ts](src/core/generation/AppearanceGenerator.ts)*

*Also known as: Visual generator, appearance builder*

Generates visual traits.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static generate(seed, characterClass, audioProfile)` | `CharacterAppearance` | **Deterministic:** Body type, skin tone, hair style/color, eye color. **Dynamic:** Primary color (from album art), Aura color (magical classes) |

#### Helper: `NamingEngine`

*Location:* *[src/core/generation/NamingEngine.ts](src/core/generation/NamingEngine.ts)*

*Also known as: Name generator, character namer*

**Note:** Internal API - automatically called by `CharacterGenerator.generate()`.

Generates RPG-style character names from track metadata using 7 naming formats with weighted distribution (20-20-10-20-15-10-5). Audio characteristics provide ~50% influence through weighted selection, random choice provides ~50%.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `generateName(seed, track, audioProfile, characterClass, deterministic?)` | `string` | Generates name using weighted formats: Class Title (20%), Adjective Construct (20%), Clan Construct (10%), Descriptive Epithet (20%), Compound Adjective (15%), Artist-Inspired (10%), Mononym Subtitle (5%) |
| `cleanTitle(title)` | `string` | Removes "(Official Video)", "[Remix]", "ft.", track numbers, file extensions |

---

## Beat Detection

Beat detection system based on the Ellis Dynamic Programming algorithm. Provides pre-analysis beat map generation and real-time beat event streaming synchronized with audio playback.

**For comprehensive documentation including usage examples, see [docs/AUDIO_ANALYSIS.md](docs/AUDIO_ANALYSIS.md)**

### Beat Types

*Location:* *[src/core/types/BeatMap.ts](src/core/types/BeatMap.ts)*

| Type | Description | Key Properties |
|------|-------------|----------------|
| `Beat` | Single detected beat (measure fields derived from `downbeatConfig`) | `timestamp`, `beatInMeasure`, `isDownbeat`, `measureNumber`, `intensity`, `confidence`, `requiredKey?` |
| `BeatMap` | Complete beat map for a track | `audioId`, `duration`, `beats`, `bpm`, `metadata`, `downbeatConfig?` |
| `TimeSignatureConfig` | Time signature configuration | `beatsPerMeasure` |
| `DownbeatSegment` | Segment with downbeat and time signature | `startBeat`, `downbeatBeatIndex`, `timeSignature` |
| `DownbeatConfig` | Manual downbeat configuration | `segments` |
| `BeatMapMetadata` | Algorithm settings used | `version`, `algorithm`, `minBpm`, `maxBpm`, `sensitivity`, `filter`, `dpAlpha`, `hopSizeMs`, `melBands` |
| `BeatEvent` | Event emitted during playback | `beat`, `currentBpm`, `audioTime`, `timeUntilBeat`, `type` |
| `AudioSyncState` | Synchronization state for debugging | `audioContextTime`, `audioElementTime`, `drift`, `isSynchronized`, `outputLatency` |
| `TempoEstimate` | Tempo detection result | `primaryBpm`, `secondaryBpm`, `primaryWeight`, `secondaryWeight`, `targetIntervalSeconds` |
| `BeatMapGeneratorOptions` | Configuration for generation | `minBpm`, `maxBpm`, `sensitivity`, `filter`, `hopSizeMs`, `hopSizeMode`, `dpAlpha`, `melBands`, `melBandsMode`, `gaussianSmoothMs`, `gaussianSmoothMode`, `tempoCenter`, `tempoWidth` |
| `HopSizeMode` | Hop size mode selection | `'efficient'` \| `'standard'` \| `'hq'` \| `'custom'` |
| `HopSizeConfig` | Hop size mode configuration | `mode`, `customValue?` |
| `MelBandsMode` | Mel bands mode selection | `'standard'` \| `'detailed'` \| `'maximum'` |
| `MelBandsConfig` | Mel bands mode configuration | `mode` |
| `GaussianSmoothMode` | Gaussian smooth mode selection | `'minimal'` \| `'standard'` \| `'smooth'` |
| `GaussianSmoothConfig` | Gaussian smooth mode configuration | `mode` |
| `BeatStreamOptions` | Configuration for streaming | `anticipationTime`, `userOffsetMs`, `compensateOutputLatency`, `timingTolerance`, `difficultyPreset`, `customThresholds`, `useInterpolatedBeats`, `ignoreKeyRequirements` |
| `ButtonPressResult` | Button press accuracy result | `accuracy`, `offset`, `matchedBeat`, `absoluteOffset`, `keyMatch`, `pressedKey?`, `requiredKey?` |
| `AccuracyThresholds` | Accuracy thresholds for difficulty | `perfect`, `great`, `good`, `ok` |
| `DifficultyPreset` | Preset difficulty levels | `'easy'` \| `'medium'` \| `'hard'` \| `'custom'` |
| `ThresholdValidationResult` | Validation result for thresholds | `valid: boolean`, `errors: string[]` |
| `BeatSource` | Source of a beat | `'detected'` \| `'interpolated'` |
| `BeatWithSource` | Beat with source information | `source`, `distanceToAnchor?`, `nearestAnchorTimestamp?` (extends `Beat`) |
| `QuarterNoteDetection` | Quarter note detection result | `intervalSeconds`, `bpm`, `confidence`, `histogramPeak`, `secondaryPeaks`, `method`, `denseSectionCount`, `denseSectionBeats` |
| `GapAnalysis` | Gap analysis between beats | `totalGaps`, `halfNoteGaps`, `anomalies`, `avgGapSize`, `gridAlignmentScore` |
| `InterpolationMetadata` | Metadata about interpolation | `quarterNoteDetection`, `gapAnalysis`, `detectedBeatCount`, `interpolatedBeatCount`, `totalBeatCount`, `interpolationRatio`, `avgInterpolatedConfidence`, `tempoDriftRatio`, `detectedClusterTempos?`, `hasMultipleTempos`, `tempoSections?`, `hasMultiTempoApplied?` |
| `TempoSection` | Tempo section with boundaries | `start`, `end`, `bpm`, `intervalSeconds`, `beatCount`, `startBeatIndex`, `endBeatIndex` |
| `InterpolatedBeatMap` | Beat map with interpolation | `audioId`, `duration`, `detectedBeats`, `mergedBeats`, `quarterNoteInterval`, `quarterNoteBpm`, `quarterNoteConfidence`, `originalMetadata`, `interpolationMetadata` |
| `BeatInterpolationOptions` | Configuration for interpolation | `minAnchorConfidence`, `gridSnapTolerance`, `tempoAdaptationRate`, `extrapolateStart`, `extrapolateEnd`, `anomalyThreshold`, `denseSectionMinBeats`, `gridAlignmentWeight`, `anchorConfidenceWeight`, `paceConfidenceWeight`, `tempoSectionThreshold`, `minClusterBeats`, `enableMultiTempo` |
| `SubdivisionType` | Types of beat subdivision | `'quarter'` \| `'half'` \| `'eighth'` \| `'sixteenth'` \| `'triplet8'` \| `'triplet4'` \| `'dotted4'` \| `'dotted8'` \| `'swing'` \| `'offbeat8'` \| `'rest'` |
| `SubdivisionConfig` | Per-beat subdivision config | `beatSubdivisions: Map<number, SubdivisionType>`, `defaultSubdivision` |
| `UnifiedBeatMap` | Unified beat map (detected + interpolated merged) | `audioId`, `duration`, `beats`, `detectedBeatIndices`, `quarterNoteInterval`, `quarterNoteBpm`, `downbeatConfig`, `tempoSections?`, `originalMetadata` |
| `SubdividedBeat` | Beat in a subdivided map (extends Beat, includes `requiredKey?`) | `beatInMeasure` (decimal), `isDetected`, `originalBeatIndex?`, `subdivisionType`, `requiredKey?` |
| `SubdividedBeatMap` | Beat map after subdivision | `audioId`, `duration`, `beats`, `detectedBeatIndices`, `subdivisionConfig`, `downbeatConfig`, `tempoSections?`, `subdivisionMetadata` |
| `SubdivisionMetadata` | Metadata about subdivision process | `originalBeatCount`, `subdividedBeatCount`, `averageDensityMultiplier`, `explicitBeatCount`, `subdivisionsUsed`, `hasMultipleTempos`, `maxDensity` |
| `BeatSubdividerOptions` | Configuration for BeatSubdivider | `tolerance`, `defaultIntensity`, `defaultConfidence` |
| `SubdivisionPlaybackOptions` | Configuration for real-time subdivision controller | `initialSubdivision`, `transitionMode`, `onSubdivisionChange`, `anticipationTime`, `timingTolerance`, `userOffsetMs`, `compensateOutputLatency` |
| `SubdivisionBeatEvent` | Event emitted during playback | `beat`, `currentSubdivision`, `timeUntilBeat`, `audioTime`, `type` |
| `SubdivisionCallback` | Callback type for beat events | `(event: SubdivisionBeatEvent) => void` |
| `SubdivisionTransitionMode` | Transition mode for subdivision changes | `'immediate'` \| `'next-downbeat'` \| `'next-measure'` |
| `GrooveDirection` | Direction of established pocket relative to beat | `'push'` \| `'pull'` \| `'neutral'` |
| `GrooveTier` | Groove intensity tier based on hotness | `'D'` \| `'C'` \| `'B'` \| `'A'` \| `'S'` \| `'SS'` \| `'Platinum'` |
| `GrooveResult` | Result returned after each hit recorded | `pocketDirection`, `establishedOffset`, `consistency`, `hotness`, `tier`, `streakLength`, `inPocket`, `pocketWindow` |
| `GrooveState` | Snapshot of current groove analyzer state | `pocketDirection`, `establishedOffset`, `hotness`, `tier`, `streakLength`, `hitCount`, `pocketWindow` |
| `GrooveAnalyzerOptions` | Configuration for GrooveAnalyzer | `minHitsForPocket`, `basePocketWindowFraction`, `minPocketWindowSeconds`, `hotnessGainPerHit`, `hotnessLossOnBreak`, `hotnessLossOnMiss`, `averagingWindowSize`, `neutralDeadZone` |
| `GroovePenaltyConfig` | Groove penalty configuration for difficulty presets | `hotnessLossOnMiss`, `hotnessLossOnBreak` |

### BeatMapGenerator

*Location:* *[src/core/analysis/beat/BeatMapGenerator.ts](src/core/analysis/beat/BeatMapGenerator.ts)*

Generates beat maps from audio using the Ellis DP algorithm. Analyzes entire track to detect beats and apply measure labels from optional `downbeatConfig`.

**Constructor:**

```typescript
constructor(options?: BeatMapGeneratorOptions)
```

**Options (with defaults):**

| Option | Default | Description |
|--------|---------|-------------|
| `minBpm` | 60 | Minimum BPM to detect |
| `maxBpm` | 180 | Maximum BPM to detect |
| `sensitivity` | 1.0 | Pre-processing sensitivity (0.1-10.0) |
| `filter` | 0.0 | Post-processing grid-alignment filter (0.0-1.0) |
| `noiseFloorThreshold` | 0 | Minimum threshold to prevent noise detection |
| `hopSizeMs` | 4 | Milliseconds between FFT frames (Ellis 2007 paper spec) |
| `hopSizeMode` | `{ mode: 'standard' }` | Hop size mode (alternative to `hopSizeMs`) |
| `fftSize` | 2048 | FFT window size in samples |
| `rollingBpmWindowSize` | 8 | Number of beats for rolling BPM calculation |
| `dpAlpha` | 680 | Ellis balance factor for tempo consistency |
| `melBands` | 40 | Number of Mel frequency bands for OSE |
| `melBandsMode` | `{ mode: 'standard' }` | Mel bands mode (alternative to `melBands`) |
| `highPassCutoff` | 0.4 | Hz, removes DC offset from OSE |
| `gaussianSmoothMs` | 20 | Gaussian smoothing window for OSE |
| `gaussianSmoothMode` | `{ mode: 'standard' }` | Gaussian smooth mode (alternative to `gaussianSmoothMs`) |
| `tempoCenter` | 0.5 | Seconds, center of tempo perception bias (120 BPM) |
| `tempoWidth` | 1.4 | Octaves, width of tempo perception weighting |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `generateBeatMap(audioUrl, audioId, downbeatConfig?, progressCallback?)` | `Promise<BeatMap>` | Generate beat map from audio URL |
| `generateBeatMapFromBuffer(audioBuffer, audioId, progressCallback?)` | `Promise<BeatMap>` | Generate beat map from AudioBuffer |
| `getProgress()` | `BeatMapGenerationProgress` | Get current generation progress |
| `cancel()` | `void` | Cancel ongoing generation |
| `static toJSON(beatMap)` | `string` | Export beat map as JSON string |
| `static fromJSON(json)` | `BeatMap` | Load beat map from JSON string |
| `static saveToFile(beatMap, path)` | `Promise<void>` | Save beat map to disk (Node.js only) |
| `static loadFromFile(path)` | `Promise<BeatMap>` | Load beat map from disk (Node.js only) |

### BeatStream

*Location:* *[src/core/analysis/beat/BeatStream.ts](src/core/analysis/beat/BeatStream.ts)*

Real-time beat event streaming synchronized with audio playback. Emits upcoming, exact, and passed beat events.

**Supported Input Types:**
- `BeatMap` - Standard beat map with detected beats
- `InterpolatedBeatMap` - Beat map with interpolated beats (use `useInterpolatedBeats` option)
- `SubdividedBeatMap` - Beat map with subdivision applied (eighth notes, triplets, etc.)

**Constructor:**

```typescript
constructor(beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap, audioContext: AudioContext, options?: BeatStreamOptions)
```

**Options (with defaults):**

| Option | Default | Description |
|--------|---------|-------------|
| `anticipationTime` | 2.0 | Time before beat to emit 'upcoming' event (seconds) |
| `userOffsetMs` | 0 | Player-calibrated audio/visual offset |
| `compensateOutputLatency` | true | Auto-adjust using AudioContext.outputLatency |
| `timingTolerance` | 0.01 | Synchronization tolerance (10ms) |
| `difficultyPreset` | `'hard'` | Difficulty preset (`'easy'`, `'medium'`, `'hard'`, `'custom'`). Ignored if `customThresholds` provided. |
| `customThresholds` | `{}` | Custom accuracy thresholds (partial `AccuracyThresholds`). Overrides `difficultyPreset`. |
| `useInterpolatedBeats` | `false` | Use `mergedBeats` from `InterpolatedBeatMap` instead of `beats` |
| `ignoreKeyRequirements` | `false` | Ignore required key assignments on beats (easy mode - timing-only evaluation) |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribe(callback)` | `() => void` | Subscribe to beat events, returns unsubscribe function |
| `start()` | `void` | Start streaming beat events |
| `stop()` | `void` | Stop streaming beat events |
| `seek(time)` | `void` | Seek to a specific time in seconds |
| `getUpcomingBeats(count)` | `Beat[]` | Get next N beats for pre-rendering animations |
| `getBeatAtTime(time)` | `Beat \| null` | Get beat at specific time |
| `getSyncState()` | `AudioSyncState` | Get current synchronization state for debugging |
| `getCurrentBpm()` | `number` | Get current BPM calculated from recent beat intervals |
| `checkButtonPress(timestamp, pressedKey?)` | `ButtonPressResult` | Check button press accuracy against nearest beat using configured thresholds. Optional `pressedKey` for key-matching beats. |
| `getLastBeatAccuracy()` | `ButtonPressResult \| null` | Get accuracy of last button press |
| `getAccuracyThresholds()` | `AccuracyThresholds` | Get current accuracy thresholds being used |
| `setDifficulty(options)` | `void` | Change difficulty settings mid-stream for adaptive gameplay |

**Accuracy Levels:** Perfect, Great, Good, Ok, Miss, WrongKey (thresholds vary by difficulty preset; WrongKey is for correct timing but wrong key press)

**Difficulty Presets:**

| Preset | Perfect | Great | Good | Ok |
|--------|---------|-------|------|-----|
| Easy | ±35ms | ±70ms | ±110ms | ±150ms |
| Medium | ±10ms | ±25ms | ±50ms | ±100ms |
| Hard | ±8ms | ±20ms | ±40ms | ±75ms |

### Beat Key Helper Functions

*Location:* *[src/core/analysis/beat/beatKeyHelpers.ts](src/core/analysis/beat/beatKeyHelpers.ts)*

Utility functions for assigning and managing required keys on beat maps. Used for rhythm game chart creation where specific keys must be pressed for specific beats.

**Types:**

| Type | Description | Key Properties |
|------|-------------|----------------|
| `KeyAssignableBeatMap` | Union type of beat maps supporting key assignment | `BeatMap` \| `InterpolatedBeatMap` \| `UnifiedBeatMap` \| `SubdividedBeatMap` |
| `KeyAssignment` | Assignment for bulk key operations | `beatIndex`, `key` (string or null to remove) |

**Functions:**

| Function | Returns | Description |
|----------|---------|-------------|
| `assignKeyToBeat<T>(beatMap, beatIndex, key)` | `T` | Assign a required key to a single beat (immutable). Pass `null` to remove. |
| `assignKeysToBeats<T>(beatMap, assignments)` | `T` | Bulk assign keys to multiple beats in one operation |
| `extractKeyMap(beatMap)` | `Map<number, string>` | Extract map of beatIndex → requiredKey for beats with keys |
| `clearAllKeys<T>(beatMap)` | `T` | Remove all required key assignments from a beat map |
| `hasRequiredKeys(beatMap)` | `boolean` | Check if any beats have required keys assigned |
| `getKeyCount(beatMap)` | `number` | Count beats with required keys |
| `getUsedKeys(beatMap)` | `string[]` | Get unique keys used (sorted alphabetically) |

**Key Matching Behavior:**

The engine performs simple string comparison for key matching. The frontend is responsible for mapping physical inputs to logical key strings before calling the engine:

- Keyboard arrow keys → pass `"up"`, `"down"`, `"left"`, `"right"`
- Game controller D-pad → pass `"up"`, `"down"`, `"left"`, `"right"`
- Game controller face buttons → pass `"a"`, `"b"`, `"x"`, `"y"`
- Touch screen zones → pass any custom string

### GrooveAnalyzer

*Location:* *[src/core/analysis/beat/GrooveAnalyzer.ts](src/core/analysis/beat/GrooveAnalyzer.ts)*

A "groove meter" system that rewards **consistency in timing feel** rather than proximity to perfect center. Inspired by Devil May Cry's style meter - it's not about being mechanically perfect, it's about establishing and maintaining a consistent "pocket."

**Core Philosophy:**
- Hitting consistently 30ms behind the beat = GOOD (you're in a pocket)
- Hitting perfectly on beat after establishing a behind-beat pocket = BAD (you broke the feel)
- The meter charges when you maintain consistency to YOUR established pocket, not to absolute perfection

**Constructor:**

```typescript
constructor(options?: Partial<GrooveAnalyzerOptions>)
```

**Options (with defaults):**

| Option | Default | Description |
|--------|---------|-------------|
| `minHitsForPocket` | 3 | Minimum hits to establish a pocket |
| `basePocketWindowFraction` | 0.03125 | Base pocket window as fraction of beat (1/32 note) |
| `minPocketWindowSeconds` | 0.015 | Minimum pocket window (15ms floor for progressive tightening) |
| `hotnessGainPerHit` | 8 | Hotness gain per consistent hit |
| `hotnessLossOnBreak` | 80 | Hotness loss on pocket break |
| `hotnessLossOnMiss` | 80 | Hotness loss on missed beat |
| `averagingWindowSize` | 4 | Number of recent hits to average for pocket establishment |
| `neutralDeadZone` | 0.010 | Dead zone around zero for neutral classification (±10ms = 20ms total) |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `recordHit(offset, bpm, currentTime, accuracy)` | `GrooveResult` | Record a button press hit and get groove analysis. Offset is timing offset in seconds (negative = early/push, positive = late/pull). BPM is current tempo for BPM-aware window calculation. currentTime is audio time for groove duration tracking. accuracy from `buttonResult.accuracy` - when `'miss'` or `'wrongKey'`, hotness decreases instead of increases. |
| `recordMiss()` | `GrooveResult` | Record a missed beat (user didn't press). Reduces hotness by configured miss penalty, resets streak, but keeps established pocket. |
| `getState()` | `GrooveState` | Get current groove analyzer state snapshot |
| `reset()` | `void` | Reset the analyzer to initial state |
| `setDifficulty(options)` | `void` | Set difficulty level for groove penalties. Updates `hotnessLossOnMiss` and `hotnessLossOnBreak` based on preset or custom values. |

**Difficulty Presets:**

Groove penalties can be adjusted based on difficulty level. Higher difficulties have more severe penalties for misses and wrong keys.

| Preset | `hotnessLossOnMiss` | `hotnessLossOnBreak` | Description |
|--------|---------------------|----------------------|-------------|
| `easy` | 50 | 50 | Forgiving for casual players |
| `medium` | 80 | 80 | Balanced difficulty |
| `hard` | 120 | 120 | Strict for veterans |
| `custom` | (varies) | (varies) | Use `customPenalties` parameter |

**Related Exports:**

| Export | Description |
|--------|-------------|
| `EASY_GROOVE_PENALTIES` | Easy difficulty penalty config |
| `MEDIUM_GROOVE_PENALTIES` | Medium difficulty penalty config |
| `HARD_GROOVE_PENALTIES` | Hard difficulty penalty config |
| `GROOVE_PENALTY_PRESETS` | Map of preset names to penalty configs |
| `getGroovePenaltiesForPreset(preset, customPenalties?)` | Get penalty config for a preset |

**Pocket Detection:**

The analyzer tracks recent hit offsets in a rolling window (default: 4 hits) and calculates a running average to establish a "pocket center." Direction is determined from the average:
- **push**: Playing ahead of the beat (negative offset, rushing)
- **pull**: Playing behind the beat (positive offset, dragging)
- **neutral**: Playing on the beat (within ±10ms dead zone)

**Tier System:**

Hotness is uncapped and determines your groove tier. Higher tiers have tighter pocket windows:

| Tier | Hotness Range | Window (120 BPM) |
|------|---------------|------------------|
| D | 0-33 | 31ms |
| C | 33-66 | 25ms |
| B | 66-100 | 20ms |
| A | 100-150 | 15ms |
| S | 150-200 | 10ms |
| SS | 200-350 | 7ms |
| Platinum | 350+ | 5ms |

The `tier` field is included in both `GrooveResult` and `GrooveState` for easy UI display.

**Related Tier Exports:**

| Export | Description |
|--------|-------------|
| `GROOVE_TIERS` | Array of tier configurations |
| `getGrooveTier(hotness)` | Get tier for a hotness value |
| `getGrooveWindowMs(hotness)` | Get pocket window in milliseconds |
| `getMinHotnessForTier(tier)` | Get minimum hotness for a tier |

**For detailed formulas (BPM-aware window calculation, consistency quadratic falloff) and examples:** See [docs/AUDIO_ANALYSIS.md#groove-meter](docs/AUDIO_ANALYSIS.md#groove-meter)

**Design Notes:**

- **Standalone Class**: GrooveAnalyzer is standalone - frontend creates and manages it separately from BeatStream
- **Direction Change = Gradual Shift**: Rolling average naturally drifts to new direction, no hard reset
- **No Serialization**: Ephemeral "fun" metric, no persistence required
- **Frontend Responsibility**: Engine provides hotness, direction, consistency - frontend decides visual representation

### OnsetStrengthEnvelope

*Location:* *[src/core/analysis/beat/OnsetStrengthEnvelope.ts](src/core/analysis/beat/OnsetStrengthEnvelope.ts)*

Calculates perceptual onset strength envelope using Mel spectrogram as described in Ellis Section 3.1.

**Constructor:**

```typescript
constructor(config?: OSEConfig)
```

**Config Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `targetSampleRate` | 8000 | Target sample rate for resampling |
| `fftWindowSize` | 32 | FFT window size in milliseconds |
| `hopSizeMs` | 4 | Hop size in milliseconds (Ellis 2007 paper spec) |
| `hopSizeMode` | `{ mode: 'standard' }` | Hop size mode (alternative to `hopSizeMs`) |
| `melBands` | 40 | Number of Mel frequency bands |
| `melBandsMode` | `{ mode: 'standard' }` | Mel bands mode (alternative to `melBands`) |
| `highPassCutoff` | 0.4 | High-pass filter cutoff in Hz |
| `gaussianSmoothMs` | 20 | Gaussian smoothing window in ms |
| `gaussianSmoothMode` | `{ mode: 'standard' }` | Gaussian smooth mode (alternative to `gaussianSmoothMs`) |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `calculate(audioBuffer)` | `OSEResult` | Calculate onset strength envelope from audio buffer |

**OSEResult:**

| Property | Description |
|----------|-------------|
| `envelope` | Float32Array of onset strength values |
| `sampleRate` | Sample rate of the envelope |
| `frameCount` | Number of frames |
| `hopSize` | Hop size in samples |

### BeatTracker

*Location:* *[src/core/analysis/beat/BeatTracker.ts](src/core/analysis/beat/BeatTracker.ts)*

Dynamic Programming beat tracker implementing the Ellis algorithm. Finds globally optimal beat sequence.

**Constructor:**

```typescript
constructor(config?: BeatTrackerConfig)
```

**Config Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `dpAlpha` | 680 | Ellis balance factor |
| `minPredecessorRatio` | 0.5 | Minimum predecessor ratio (τp/2) |
| `maxPredecessorRatio` | 2.0 | Maximum predecessor ratio (2τp) |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `trackBeats(onsetEnvelope, tempoEstimate, config?)` | `BeatTrackingResult` | Track beats using DP algorithm |

**BeatTrackingResult:**

| Property | Description |
|----------|-------------|
| `beats` | Array of Beat objects |
| `rawBeatIndices` | Frame indices of detected beats |
| `scores` | Cumulative scores at each beat |

### TempoDetector

*Location:* *[src/core/analysis/beat/TempoDetector.ts](src/core/analysis/beat/TempoDetector.ts)*

Estimates global tempo using autocorrelation with perceptual weighting (Ellis Section 3.2).

**Constructor:**

```typescript
constructor(config?: TempoDetectorConfig)
```

**Config Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `tempoCenter` | 0.5 | Tempo center in seconds (120 BPM) |
| `tempoWidth` | 1.4 | Tempo width in octaves |
| `minBpm` | 60 | Minimum BPM |
| `maxBpm` | 180 | Maximum BPM |
| `useOctaveResolution` | `false` | Enable TPS2 octave resolution to fix half-tempo/double-tempo ambiguity. When enabled, uses Ellis 2007 duple meter calculation to prefer tempos with strong half-period evidence. Enable this if tempo detection is returning half the actual BPM (e.g., 73 BPM instead of 146 BPM). |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `estimateTempo(onsetEnvelope, hopSize)` | `TempoEstimate` | Estimate tempo from onset envelope |

### reapplyDownbeatConfig

*Location:* *[src/core/types/BeatMap.ts](src/core/types/BeatMap.ts)*

Standalone function that recalculates measure labels based on a new `DownbeatConfig`. This is the primary way to set downbeat configuration - the typical workflow is to generate the beat map first with default config, examine it to identify the correct downbeat position, then call this function to apply the correct configuration.

**Note:** This does NOT re-analyze audio - it only recalculates measure labels.

**Signature:**

```typescript
function reapplyDownbeatConfig(beatMap: BeatMap, newConfig: DownbeatConfig): BeatMap
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `beatMap` | `BeatMap` | The original beat map |
| `newConfig` | `DownbeatConfig` | New downbeat configuration to apply |

**Returns:** New `BeatMap` with updated measure labels (original is not modified)

**Throws:** Error if configuration is invalid or `downbeatBeatIndex` exceeds total beats

**For usage examples:** See [docs/AUDIO_ANALYSIS.md#downbeat-configuration](docs/AUDIO_ANALYSIS.md#downbeat-configuration)

### BeatInterpolator

*Location:* *[src/core/analysis/beat/BeatInterpolator.ts](src/core/analysis/beat/BeatInterpolator.ts)*

Post-processing pass that fills gaps in beat maps with interpolated beats. Uses the **Pace + Anchors model** with **dense section priority** to determine the quarter note interval, then generates a complete beat grid.

**Key Concepts:**

- **Pace**: The quarter note interval established from dense sections (sections with consistent beat detection)
- **Anchors**: Individual detected beats that validate the grid and override interpolated beats
- **Dense Section Priority**: Intervals from sections with consistent beat detection are weighted higher than sparse sections
- **Two Output Streams**: `detectedBeats` (original) and `mergedBeats` (interpolated + detected override)

**Constructor:**

```typescript
constructor(options?: BeatInterpolationOptions)
```

**Options (with defaults):**

| Option | Default | Description |
|--------|---------|-------------|
| `minAnchorConfidence` | 0.3 | Minimum confidence for a beat to be used as an anchor |
| `gridSnapTolerance` | 0.05 | Tolerance in seconds for snapping detected beats to grid |
| `tempoAdaptationRate` | 0.3 | Rate of tempo adaptation at anchor points (0=fixed, 1=full) |
| `extrapolateStart` | true | Whether to extrapolate grid before first detected beat |
| `extrapolateEnd` | true | Whether to extrapolate grid after last detected beat |
| `anomalyThreshold` | 0.4 | Multiplier for anomaly detection (0.4 = 40% deviation) |
| `denseSectionMinBeats` | 3 | Minimum beats to count as a dense section |
| `gridAlignmentWeight` | 0.5 | Weight for grid alignment in confidence calculation |
| `anchorConfidenceWeight` | 0.3 | Weight for anchor confidence in confidence calculation |
| `paceConfidenceWeight` | 0.2 | Weight for pace confidence in confidence calculation |
| `tempoSectionThreshold` | 0.1 | Tempo difference threshold for section detection (10%) |
| `minClusterBeats` | 4 | Minimum beats for a valid tempo cluster |
| `enableMultiTempo` | false | Enable multi-tempo analysis for tracks with tempo changes |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `interpolate(beatMap)` | `InterpolatedBeatMap` | Interpolate beats in a beat map |
| `getConfig()` | `Required<BeatInterpolationOptions>` | Get current configuration |
| `static toJSON(interpolatedBeatMap)` | `string` | Export interpolated beat map as JSON string |
| `static fromJSON(jsonString)` | `InterpolatedBeatMap` | Load interpolated beat map from JSON string |
| `static saveToFile(interpolatedBeatMap, filePath)` | `Promise<void>` | Save to disk (Node.js only) |
| `static loadFromFile(filePath)` | `Promise<InterpolatedBeatMap>` | Load from disk (Node.js only) |

**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-interpolation](docs/AUDIO_ANALYSIS.md#beat-interpolation)

**Confidence Model:**

Interpolated beat confidence is calculated from three components:

| Component | Default Weight | Description |
|-----------|----------------|-------------|
| Grid Alignment | 50% | How well surrounding anchors align to the established pace |
| Anchor Confidence | 30% | Average confidence of detected beats bounding this gap |
| Pace Confidence | 20% | Confidence in the quarter note detection itself |

**Constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_BEAT_INTERPOLATION_OPTIONS` | See above | Default interpolation options |

### BeatSubdivider

*Location:* *[src/core/analysis/beat/BeatSubdivider.ts](src/core/analysis/beat/BeatSubdivider.ts)*

Transforms a UnifiedBeatMap into a SubdividedBeatMap by applying rhythmic subdivision patterns. Supports half notes, eighth notes, sixteenth notes, triplets, and dotted patterns. Each beat can have its own subdivision type for fine-grained control.

**Key Concepts:**

- **Processing Pipeline**: `BeatMap` → `InterpolatedBeatMap` → `UnifiedBeatMap` → `SubdividedBeatMap`
- **Subdivision Types**: Quarter (1x), Half (0.5x), Eighth (2x), Sixteenth (4x - maximum), Triplets, Dotted patterns
- **Per-Beat Control**: Each beat can have its own subdivision type via `beatSubdivisions` map
- **Tempo-Aware**: Uses TempoSection intervals for multi-tempo tracks

**Constructor:**

```typescript
constructor(options?: BeatSubdividerOptions)
```

**Options (with defaults):**

| Option | Default | Description |
|--------|---------|-------------|
| `tolerance` | 0.02 (20ms) | Tolerance for aligning beats to detected beats |
| `defaultIntensity` | 0.5 | Default intensity for newly generated beats (0.0 - 1.0) |
| `defaultConfidence` | 0.7 | Default confidence for newly generated beats (0.0 - 1.0) |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `subdivide(unifiedMap, config?)` | `SubdividedBeatMap` | Subdivide a unified beat map according to per-beat configuration |

**Subdivision Types:**

| Type | Density | Description | Beat Labels in 4/4 |
|------|---------|-------------|---------------------|
| `'quarter'` | 1x | No change (standard) | 0, 1, 2, 3 |
| `'half'` | 0.5x | Beats on 1 and 3 only | 0, 2, 4, 6 |
| `'eighth'` | 2x | Double density | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 |
| `'sixteenth'` | 4x | Maximum density | 0, 0.25, 0.5, 0.75, 1, 1.25... |
| `'triplet8'` | 3x | Eighth triplets (3 per quarter) | 0, 0.33, 0.66, 1, 1.33, 1.66... |
| `'triplet4'` | 1.5x | Quarter triplets (3 per 2 beats, 2-beat structure) | 0, 0.66, 1.33, 2, 2.66... |
| `'dotted4'` | 0.67x | Dotted quarter (2-beat structure with interp at 0.5) | 0, 0.5, 2, 2.5, 4, 4.5... |
| `'dotted8'` | 2x | Dotted eighth (3/4 + 1/4 pattern) | 0, 0.75, 1, 1.75, 2... |
| `'swing'` | 2x | Swing feel (2/3 + 1/3 pattern) | 0, 0.667, 1, 1.667, 2... |
| `'offbeat8'` | 1x | Offbeat eighth (8th rest + 8th note) | 0.5, 1.5, 2.5, 3.5... |
| `'rest'` | 0x | No beat generated (creates gaps) | (none) |

**2-Beat Structure Types:** `triplet4` and `dotted4` are 2-beat structures that only process beats at even `beatInMeasure` positions (0, 2, 4, 6...). This allows proper triplet and dotted patterns across beat pairs.

**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-subdivision](docs/AUDIO_ANALYSIS.md#beat-subdivision)

**Per-Beat Configuration:**

The `beatSubdivisions` map allows assigning different subdivisions to specific beat indices. Beats not in the map use `defaultSubdivision`. This enables creating complex rhythmic phrases where each beat can have a different feel.

**Validation Functions:**

| Function | Description |
|----------|-------------|
| `validateSubdivisionConfig(config)` | Structural validation for subdivision config |
| `validateSubdivisionConfigAgainstBeats(config, totalBeats)` | Validate beat indices against beat count |
| `validateSubdivisionDensity(subdivision)` | Ensure density doesn't exceed maximum (4x) |
| `isValidSubdivisionType(value)` | Type guard for SubdivisionType |
| `getSubdivisionDensity(subdivision)` | Get density multiplier for a subdivision type |

**Constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_SUBDIVISION_CONFIG` | `{ beatSubdivisions: new Map(), defaultSubdivision: 'quarter' }` | Default subdivision config |
| `MAX_SUBDIVISION_DENSITY` | 4 | Maximum density (sixteenth notes) |
| `VALID_SUBDIVISION_TYPES` | Array of all valid types | For validation |

### unifyBeatMap

*Location:* *[src/core/analysis/beat/utils/unifyBeatMap.ts](src/core/analysis/beat/utils/unifyBeatMap.ts)*

Standalone function that converts an InterpolatedBeatMap into a UnifiedBeatMap. This flattens detected + interpolated beats into a single unified list, preparing the beat map for subdivision.

**Signature:**

```typescript
function unifyBeatMap(interpolatedBeatMap: InterpolatedBeatMap): UnifiedBeatMap
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `interpolatedBeatMap` | `InterpolatedBeatMap` | The interpolated beat map to unify |

**Returns:** `UnifiedBeatMap` ready for subdivision

**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-subdivision](docs/AUDIO_ANALYSIS.md#beat-subdivision)

### subdivideBeatMap

*Location:* *[src/core/analysis/beat/utils/subdivideBeatMap.ts](src/core/analysis/beat/utils/subdivideBeatMap.ts)*

Convenience function that combines unification and subdivision into a single step. Takes an InterpolatedBeatMap and SubdivisionConfig, returns a SubdividedBeatMap.

**Signature:**

```typescript
function subdivideBeatMap(
    interpolatedBeatMap: InterpolatedBeatMap,
    config?: SubdivisionConfig,
    options?: BeatSubdividerOptions
): SubdividedBeatMap
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `interpolatedBeatMap` | `InterpolatedBeatMap` | The interpolated beat map to subdivide |
| `config` | `SubdivisionConfig?` | Optional subdivision configuration (defaults to quarter notes) |
| `options` | `BeatSubdividerOptions?` | Optional BeatSubdivider options |

**Returns:** `SubdividedBeatMap` with subdivision applied

**For usage examples:** See [docs/AUDIO_ANALYSIS.md#beat-subdivision](docs/AUDIO_ANALYSIS.md#beat-subdivision)

### SubdivisionPlaybackController

*Location:* *[src/core/playback/SubdivisionPlaybackController.ts](src/core/playback/SubdivisionPlaybackController.ts)*

Real-time subdivision controller for practice mode. Enables instant switching between subdivision types during playback, allowing users to practice with different rhythmic densities (e.g., start with quarter notes, then switch to eighth notes).

**Key Concepts:**

- **Real-Time Generation**: Beats are generated on-the-fly based on current subdivision type
- **Instant Switching**: Change subdivision type at any time during playback
- **Transition Modes**: Configurable behavior for when subdivision changes take effect
- **Web Audio Integration**: Precise timing using AudioContext for synchronization

**Constructor:**

```typescript
constructor(
    unifiedMap: UnifiedBeatMap,
    audioContext: AudioContext,
    options?: SubdivisionPlaybackOptions
)
```

**Options (with defaults):**

| Option | Default | Description |
|--------|---------|-------------|
| `initialSubdivision` | `'quarter'` | Starting subdivision type |
| `transitionMode` | `'immediate'` | How to handle subdivision changes (`'immediate'`, `'next-downbeat'`, `'next-measure'`) |
| `onSubdivisionChange` | `undefined` | Callback when subdivision changes `(oldType, newType) => void` |
| `anticipationTime` | `2.0` | Time before beat to emit 'upcoming' event (seconds) |
| `timingTolerance` | `0.01` | Tolerance for beat event detection (10ms) |
| `userOffsetMs` | `0` | User-calibrated audio/visual offset (milliseconds) |
| `compensateOutputLatency` | `true` | Auto-adjust using AudioContext.outputLatency |

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `subdivision` | `SubdivisionType` | Get the current subdivision type (read-only) |
| `beatMap` | `UnifiedBeatMap` | Get the unified beat map (read-only) |

**Methods:**

| Method | Description |
|--------|-------------|
| `subscribe(callback: SubdivisionCallback): () => void` | Subscribe to beat events, returns unsubscribe function |
| `setSubdivision(type: SubdivisionType): void` | Change subdivision type in real-time |
| `setTransitionMode(mode: SubdivisionTransitionMode): void` | Change transition mode during playback |
| `play(): void` | Start streaming beat events |
| `stop(): void` | Stop streaming and reset state |
| `pause(): void` | Pause event emission (preserves position) |
| `resume(): void` | Resume paused playback |
| `seek(time: number): void` | Seek to a specific time in seconds |
| `getBeatsInRange(startTime: number, endTime: number): SubdividedBeat[]` | Get beats in a time range |
| `getUpcomingBeats(count: number): SubdividedBeat[]` | Get upcoming beats for pre-rendering |
| `getBeatAtTime(time: number): SubdividedBeat \| null` | Get beat at specific time |
| `getCurrentBeat(): SubdividedBeat \| null` | Get the current (most recent) beat |
| `getNextBeat(): SubdividedBeat \| null` | Get the next beat |
| `getCurrentTime(): number` | Get current playback position in seconds |
| `getDuration(): number` | Get beat map duration in seconds |
| `getOptions(): Required<SubdivisionPlaybackOptions>` | Get current playback options |
| `setBeatMap(unifiedMap: UnifiedBeatMap): void` | Update the unified beat map |
| `checkButtonPress(timestamp: number, thresholds?: AccuracyThresholds): ButtonPressResult` | Check tap accuracy against current subdivision's beats (no key matching, optional custom thresholds) |
| `isRunning(): boolean` | Check if controller is running |
| `isPaused(): boolean` | Check if controller is paused |
| `dispose(): void` | Clean up resources |

**Transition Modes:**

| Mode | Description |
|------|-------------|
| `'immediate'` | Switch subdivision instantly at current position |
| `'next-downbeat'` | Wait for the next downbeat before switching |
| `'next-measure'` | Wait for the next measure before switching |

**For usage examples:** See [docs/AUDIO_ANALYSIS.md#real-time-subdivision-playground-practice-mode](docs/AUDIO_ANALYSIS.md#real-time-subdivision-playground-practice-mode)

**Event Types:**

The `SubdivisionBeatEvent` includes:

| Property | Type | Description |
|----------|------|-------------|
| `beat` | `SubdividedBeat` | The beat this event relates to |
| `currentSubdivision` | `SubdivisionType` | Current subdivision type being used |
| `timeUntilBeat` | `number` | Time until the beat occurs (negative if passed) |
| `audioTime` | `number` | Current audio context time in seconds |
| `type` | `'upcoming'` \| `'exact'` \| `'passed'` | Type of event |

**Constants:**

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS` | `{ initialSubdivision: 'quarter', transitionMode: 'immediate', ... }` | Default playback options |

### Beat Detection Utilities

*Location:* *[src/core/analysis/beat/utils/audioUtils.ts](src/core/analysis/beat/utils/audioUtils.ts)*

| Function | Description |
|----------|-------------|
| `hzToMel(hz: number): number` | Convert Hz to Mel scale: `2595 * log10(1 + f/700)` |
| `melToHz(mel: number): number` | Convert Mel to Hz: `700 * (10^(m/2595) - 1)` |
| `resampleAudio(buffer: AudioBuffer, targetRate: number): ResampledAudio` | Resample audio to target sample rate |
| `createMelFilterbank(numBands: number, fftSize: number, sampleRate: number): Float32Array[]` | Create Mel filterbank (triangular filters) |
| `highPassFilter(signal: Float32Array, cutoff: number, sampleRate: number): Float32Array` | Apply high-pass filter to signal |
| `gaussianSmooth(signal: Float32Array, windowMs: number, sampleRate: number): Float32Array` | Gaussian smoothing on signal |
| `calculateStdDev(signal: Float32Array): number` | Calculate standard deviation of signal |
| `performFFT(samples: Float32Array): Float32Array` | Perform FFT on audio samples |
| `performSTFT(samples: Float32Array, fftSize: number, hopSize: number): STFTResult` | Perform Short-Time Fourier Transform |

### Beat Detection Constants

*Location:* *[src/core/types/BeatMap.ts](src/core/types/BeatMap.ts)*

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_BEATMAP_GENERATOR_OPTIONS` | See above | Default BeatMapGenerator options |
| `DEFAULT_BEATSTREAM_OPTIONS` | See above | Default BeatStream options |
| `BEAT_ACCURACY_THRESHOLDS` | Same as `HARD_ACCURACY_THRESHOLDS` | Accuracy thresholds in seconds (**deprecated**, use `HARD_ACCURACY_THRESHOLDS` or `getAccuracyThresholdsForPreset()`) |
| `EASY_ACCURACY_THRESHOLDS` | `{ perfect: 0.020, great: 0.035, good: 0.060, ok: 0.125 }` | Easy difficulty thresholds (±20ms, ±35ms, ±60ms, ±125ms) |
| `MEDIUM_ACCURACY_THRESHOLDS` | `{ perfect: 0.010, great: 0.025, good: 0.050, ok: 0.100 }` | Medium difficulty thresholds (±10ms, ±25ms, ±50ms, ±100ms) |
| `HARD_ACCURACY_THRESHOLDS` | `{ perfect: 0.008, great: 0.020, good: 0.040, ok: 0.075 }` | Hard difficulty thresholds (±8ms, ±20ms, ±40ms, ±75ms) |
| `getAccuracyThresholdsForPreset(preset)` | Returns `AccuracyThresholds` | Get thresholds for a difficulty preset (`'easy'`, `'medium'`, `'hard'`, `'custom'`) |
| `validateThresholds(thresholds)` | Returns `ThresholdValidationResult` | Validate custom thresholds for correctness (checks positive values and ascending order) |
| `BEAT_DETECTION_VERSION` | `'1.0.0'` | Algorithm version |
| `BEAT_DETECTION_ALGORITHM` | `'ellis-dp-v1'` | Algorithm identifier |
| `DEFAULT_SUBDIVISION_CONFIG` | `{ beatSubdivisions: new Map(), defaultSubdivision: 'quarter' }` | Default subdivision config |
| `MAX_SUBDIVISION_DENSITY` | 4 | Maximum subdivision density (sixteenth notes) |
| `VALID_SUBDIVISION_TYPES` | `['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8', 'swing', 'offbeat8', 'rest']` | All valid subdivision types |
| `isValidSubdivisionType(value)` | Returns boolean | Type guard for SubdivisionType |
| `getSubdivisionDensity(subdivision)` | Returns number | Get density multiplier (0, 0.5, 0.67, 1, 1.5, 2, 3, or 4) |
| `validateSubdivisionConfig(config)` | Throws on error | Validate subdivision config structure |
| `validateSubdivisionConfigAgainstBeats(config, totalBeats)` | Throws on error | Validate config against beat count |
| `validateSubdivisionDensity(subdivision)` | Throws on error | Validate density doesn't exceed max |
| `DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS` | `{ initialSubdivision: 'quarter', transitionMode: 'immediate', anticipationTime: 2.0, timingTolerance: 0.01, userOffsetMs: 0, compensateOutputLatency: true }` | Default options for SubdivisionPlaybackController |

### OSE Parameter Modes

The Onset Strength Envelope (OSE) calculation uses several parameters that affect beat detection quality and performance. To make these parameters more accessible, the engine provides a **tiered mode system** that maps user-friendly mode names to optimized technical values.

**For comprehensive documentation including usage examples, see [docs/AUDIO_ANALYSIS.md](docs/AUDIO_ANALYSIS.md#ose-parameter-modes)**

#### Tier 1: Primary Controls (Hop Size)

Hop size determines the time resolution of onset detection. Smaller values = more precise but slower analysis.

| Mode | Value | Description | Use Case |
|------|-------|-------------|----------|
| `'efficient'` | 10ms | Fast analysis, reduced precision | Preview mode, quick scans |
| `'standard'` | 4ms | Paper specification (Ellis 2007) | **Recommended for most use cases** |
| `'hq'` | 2ms | High quality, maximum precision | Critical timing, rhythm games |
| `'custom'` | user-defined | Custom hop size (1-50ms, clamped) | Specialized requirements |

**Default Change**: The default hop size changed from 10ms to 4ms to match the Ellis 2007 paper specification. Users who prefer the previous behavior can opt into `'efficient'` mode.

#### Tier 2: Advanced Controls

##### Mel Bands Mode

Mel bands determine the frequency resolution of onset detection. More bands = better frequency resolution but slightly slower analysis.

| Mode | Value | Description | Use Case |
|------|-------|-------------|----------|
| `'standard'` | 40 bands | Paper default, librosa default | **Recommended for most use cases** |
| `'detailed'` | 64 bands | Better frequency resolution | Complex instrumentation |
| `'maximum'` | 80 bands | Maximum detail | Orchestral, dense mixes |

##### Gaussian Smooth Mode

Gaussian smoothing determines how much the onset envelope is smoothed. More smoothing = cleaner peaks but may miss fast transients.

| Mode | Value | Description | Use Case |
|------|-------|-------------|----------|
| `'minimal'` | 10ms | Preserves fast transients | Percussive tracks, fast attacks |
| `'standard'` | 20ms | Paper default | **Recommended for most use cases** |
| `'smooth'` | 40ms | Cleaner peaks, less noise | Noisy recordings, legato passages |

#### OSE Parameter Mode Constants

*Location:* *[src/core/types/BeatMap.ts](src/core/types/BeatMap.ts)*

| Constant | Value | Description |
|----------|-------|-------------|
| `HOP_SIZE_PRESETS` | `{ efficient: 10, standard: 4, hq: 2 }` | Preset hop size values in milliseconds |
| `MEL_BANDS_PRESETS` | `{ standard: 40, detailed: 64, maximum: 80 }` | Preset mel bands values |
| `GAUSSIAN_SMOOTH_PRESETS` | `{ minimal: 10, standard: 20, smooth: 40 }` | Preset gaussian smoothing values in milliseconds |

#### OSE Parameter Mode Helper Functions

*Location:* *[src/core/types/BeatMap.ts](src/core/types/BeatMap.ts)*

| Function | Returns | Description |
|----------|---------|-------------|
| `getHopSizeMs(config?: HopSizeConfig)` | `number` | Convert hop size mode to actual milliseconds value. Custom values are clamped to 1-50ms. |
| `getMelBands(config?: MelBandsConfig)` | `number` | Convert mel bands mode to actual count |
| `getGaussianSmoothMs(config?: GaussianSmoothConfig)` | `number` | Convert gaussian smooth mode to actual milliseconds value |

**For detailed examples (mode-based configuration, helper functions, precedence rules):** See [docs/AUDIO_ANALYSIS.md#ose-parameter-modes](docs/AUDIO_ANALYSIS.md#ose-parameter-modes)

## Progression System

### SessionTracker

*Location:* *[src/core/progression/SessionTracker.ts](src/core/progression/SessionTracker.ts)*

Manages active listening sessions and records history.

#### Class: `SessionTracker`

**Constructor:**
```typescript
new SessionTracker(xpCalculator?: XPCalculator)
```

**Methods:**

- `startSession(trackUuid: string, track?: PlaylistTrack, context?: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): string`
    - Starts a session. Returns a `sessionId`.
- `endSession(sessionId: string, durationOverride?: number, activityType?: string): ListeningSession | null`
    - Ends the session, calculates XP, and returns the session record.
- `getActiveSession(sessionId: string): ActiveSession | null`
    - Gets an active session without ending it.
- `getActiveSessionDuration(sessionId: string): number | null`
    - Returns current duration of active session in seconds.
- `updateSessionContext(sessionId: string, context: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): boolean`
    - Updates environmental or gaming context for a live session.
- `getSessionHistory(): ListeningSession[]`
    - Returns all completed listening sessions.
- `getSessionsForTrack(trackUuid: string): ListeningSession[]`
    - Returns sessions for a specific track.
- `getTotalListeningTime(): number`
    - Returns total listening time across all sessions in seconds.
- `getTotalXPEarned(): number`
    - Returns total XP earned across all sessions.
- `getTrackListeningTime(trackUuid: string): number`
    - Returns total listening time for a specific track in seconds.
- `getTrackListenCount(trackUuid: string): number`
    - Returns number of times a track has been listened to.
- `isTrackMastered(trackUuid: string, masteryThreshold?: number): boolean`
    - Checks if track has been mastered (default threshold: 10).
- `getSessionsInRange(startTime: number, endTime: number): ListeningSession[]`
    - Returns sessions within a time range.
- `getAverageSessionLength(): number`
    - Returns average session duration in seconds.
- `getLongestSession(): ListeningSession | null`
    - Returns the session with longest duration.
- `clearHistory(): void`
    - Clears all session history.
- `clearActiveSessions(): void`
    - Clears all active sessions.
- `getActiveSessionCount(): number`
    - Returns number of currently active sessions.
- `getActiveSessionIds(): string[]`
    - Returns all active session IDs.
- `getTrackXPTotal(trackUuid: string): number`
    - Returns total XP earned for a specific track (used by prestige system).
- `clearTrackSessions(trackUuid: string): number`
    - Clears all sessions for a track, returns count removed (used by prestige system).

### ISessionTracker

*Location:* *[src/core/types/ISessionTracker.ts](src/core/types/ISessionTracker.ts)*

Interface for session tracking operations required by the prestige system. Allows consumers using different state management approaches (Zustand, Redux, etc.) to provide adapters for `CharacterUpdater.resetCharacterForPrestige()`.

| Method | Returns | Description |
|--------|---------|-------------|
| `getTrackListenCount(trackUuid)` | `number` | Get the number of listening sessions for a specific track |
| `getTrackXPTotal(trackUuid)` | `number` | Get the total XP earned for a specific track |
| `clearTrackSessions(trackUuid)` | `number` | Clear all listening sessions for a track; returns count removed |

**For usage examples (Zustand adapter, mock for testing):** See [docs/XP_AND_STATS.md#isessiontracker-adapter](docs/XP_AND_STATS.md#isessiontracker-adapter)

### ListeningSession

*Location:* *[src/core/types/Progression.ts](src/core/types/Progression.ts)* (60-71)

Record of a single listening session.

| Property | Type | Description |
|----------|------|-------------|
| `track_uuid` | string | UUID of the track being listened to |
| `start_time` | number | Unix timestamp when session started |
| `end_time` | number | Unix timestamp when session ended |
| `duration_seconds` | number | Total session duration in seconds |
| `base_xp_earned` | number | Base XP earned before modifiers |
| `bonus_xp` | number | Bonus XP from environmental/gaming modifiers |
| `environmental_context?` | EnvironmentalContext | Environmental context during session |
| `gaming_context?` | GamingContext | Gaming context during session |
| `activity_type?` | string | Type of activity (e.g., "listening") |
| `total_xp_earned` | number | Total XP earned (base + bonus) |

---

### XPCalculator

*Location:* *[src/core/progression/XPCalculator.ts](src/core/progression/XPCalculator.ts)*

Calculates XP based on duration, activity, environment, and gaming context.

#### Class: `XPCalculator`

**Constructor:**
```typescript
new XPCalculator(options?: Partial<ExperienceSystem>)
```

### ExperienceSystem

*Location:* *[src/core/types/Progression.ts](src/core/types/Progression.ts)*

Configuration for XP calculation.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `level_thresholds` | `number[]` | XP thresholds for each level (D&D 5e standard) |
| `xp_per_second` | `number` | Base rate (e.g., 1 XP per second of listening) |
| `xp_per_track_completion` | `number` | Bonus for finishing a song |
| `activity_bonuses` | `object` | Activity multipliers for XP |
| `activity_bonuses.stationary` | `number` | Multiplier for stationary activity |
| `activity_bonuses.walking` | `number` | Multiplier for walking |
| `activity_bonuses.running` | `number` | Multiplier for running |
| `activity_bonuses.driving` | `number` | Multiplier for driving |
| `activity_bonuses.night_time` | `number` | Multiplier for night time |
| `activity_bonuses.extreme_weather` | `number` | Multiplier for extreme weather |
| `activity_bonuses.high_altitude` | `number` | Multiplier for high altitude (≥2000m) |
| `activity_bonuses.rhythm_game_base` | `number` | Base multiplier when rhythm game active (default: 1.25) |
| `activity_bonuses.rhythm_game_combo` | `number` | Max additional from combo (default: 0.5) |
| `activity_bonuses.rhythm_game_groove` | `number` | Max additional from groove hotness (default: 0.5) |
| `track_mastery_threshold` | `number` | Listens required to master a track |
| `mastery_bonus_xp` | `number` | Bonus XP for mastering a track |

---

### XPCalculator Methods

**Methods:**

- `calculateSessionXP(session: ListeningSession, track?: PlaylistTrack): number`
    - Calculates total XP for a session with all multipliers applied.
- `calculateTotalModifier(envContext?: EnvironmentalContext, gamingContext?: GamingContext): number`
    - Calculates combined XP modifier (1.0 to 3.0) from environmental and gaming bonuses.
- `getXPThresholdForLevel(level: number): number`
    - Returns XP required for a specific level (1-20).
- `getXPToNextLevel(currentLevel: number): number`
    - Returns XP needed to advance from current level to next.
- `getLevelFromXP(totalXP: number): number`
    - Determines character level from total XP.
- `isTrackMastered(listenCount: number): boolean`
    - Checks if listen count meets mastery threshold.
- `getMasteryBonusXP(): number`
    - Returns bonus XP for mastering a track.
- `getConfig(): ExperienceSystem`
    - Returns current configuration.

---

### CharacterUpdater

*Location:* *[src/core/progression/CharacterUpdater.ts](src/core/progression/CharacterUpdater.ts)*

*Also known as: Character progression, XP handler, level-up manager, character advancement*

Orchestrates applying session results to a character, handling leveling up and mastery.

**For usage examples, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**

#### Method Reference

| Method | Description |
|--------|-------------|
| `constructor(statManager?: StatManager)` | Creates instance with optional StatManager to override auto-detected strategy |
| `addXP(character, xpAmount, source?)` | Add XP from any source (combat, quests, activities); triggers level-up system |
| `updateCharacterFromSession(character, session, track?, options?)` | Update character from listening session with XP calculation and mastery bonuses; options include `previousListenCount`, `previousXP`, `prestigeLevel` |
| `applyPendingStatIncrease(character, primaryStat, secondaryStats?)` | Apply pending stat increase with user-selected stats (manual mode only) |
| `hasPendingStatIncreases(character)` | Check if character has pending stat increases |
| `getPendingStatIncreaseCount(character)` | Get count of pending stat increases |
| `resetCharacterForPrestige(character, sessionTracker, trackUuid, audioProfile, track)` | Reset character for prestige; returns `PrestigeResult & { character: CharacterSheet }` with regenerated level 1 character (equipment preserved, prestige_level incremented) |
| `canPrestige(character, sessionTracker, trackUuid)` | Check if character can prestige for a specific track |
| `getPrestigeInfo(character, sessionTracker, trackUuid)` | Get prestige progress info for character/track combination |

#### Stat Strategy Auto-Detection

`CharacterUpdater` auto-detects stat increase strategy based on character's `gameMode`:

| Game Mode | Strategy | Behavior |
|-----------|----------|----------|
| `standard` (capped at 20) | `dnD5e` (manual) | 2-step level-up: XP adds HP/proficiency/features, stats require manual selection via `applyPendingStatIncrease()` |
| `uncapped` | `dnD5e_smart` (auto) | 1-step level-up: Everything applied automatically, intelligently boosts primary/lowest stats |

**For custom StatManager configuration and strategy options:** See [docs/XP_AND_STATS.md#stat-increase-strategies](docs/XP_AND_STATS.md#stat-increase-strategies)

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `CharacterUpdateResult` | [src/core/progression/CharacterUpdater.ts](src/core/progression/CharacterUpdater.ts) (11-20) | Result of character update with XP, level-up, and mastery data |
| `LevelUpDetail` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Detailed breakdown of individual level-up (HP, proficiency, stats, features, spell slots) |
| `ApplyPendingStatIncreaseResult` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Result of applying pending stat increase with stat change details |

---

### SessionTracker

*Location:* *[src/core/progression/SessionTracker.ts](src/core/progression/SessionTracker.ts)*

*Also known as: Session manager, listening tracker, session history*

Manages active listening sessions and records history.

#### Method Reference

| Method | Description |
|--------|-------------|
| `constructor(xpCalculator?)` | Creates instance with optional XPCalculator |
| `startSession(trackUuid, track?, context?)` | Starts session and returns session ID |
| `endSession(sessionId, durationOverride?, activityType?)` | Ends session, calculates XP, returns ListeningSession record |
| `getActiveSession(sessionId)` | Gets active session without ending it |
| `getActiveSessionDuration(sessionId)` | Returns current duration in seconds |
| `updateSessionContext(sessionId, context)` | Updates environmental/gaming context for live session |
| `getSessionHistory()` | Returns all completed listening sessions |
| `getSessionsForTrack(trackUuid)` | Returns sessions for specific track |
| `getTotalListeningTime()` | Returns total listening time across all sessions (seconds) |
| `getTotalXPEarned()` | Returns total XP earned across all sessions |
| `getTrackListeningTime(trackUuid)` | Returns total listening time for specific track (seconds) |
| `getTrackListenCount(trackUuid)` | Returns number of times track has been listened to |
| `getTrackXPTotal(trackUuid)` | Returns total XP earned for specific track (used by prestige system) |
| `isTrackMastered(trackUuid, masteryThreshold?)` | Checks if track has been mastered (default threshold: 10) |
| `getSessionsInRange(startTime, endTime)` | Returns sessions within time range |
| `getAverageSessionLength()` | Returns average session duration (seconds) |
| `getLongestSession()` | Returns the session with longest duration |
| `clearTrackSessions(trackUuid)` | Clears all sessions for a track (used by prestige system to reset progress) |
| `clearHistory()` | Clears all session history |
| `clearActiveSessions()` | Clears all active sessions |
| `getActiveSessionCount()` | Returns number of currently active sessions |
| `getActiveSessionIds()` | Returns all active session IDs |

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `ListeningSession` | [src/core/types/Progression.ts](src/core/types/Progression.ts) (60-71) | Record of single listening session with duration, XP, and context |
| `ActiveSession` | [src/core/progression/SessionTracker.ts](src/core/progression/SessionTracker.ts) | Active session with start time and context |

---

### XPCalculator

*Location:* *[src/core/progression/XPCalculator.ts](src/core/progression/XPCalculator.ts)*

*Also known as: XP calculator, experience calculator, leveling calculator*

Calculates XP based on duration, activity, environment, and gaming context.

#### Constructor

| Constructor | Description |
|-------------|-------------|
| `constructor(options?: Partial<ExperienceSystem>)` | Creates instance with optional XP system configuration |

#### Method Reference

| Method | Description |
|--------|-------------|
| `calculateSessionXP(session, track?)` | Calculates total XP for session with all multipliers applied |
| `calculateTotalModifier(envContext?, gamingContext?)` | Calculates combined XP modifier (1.0 to 3.0) from environmental and gaming bonuses |
| `getXPThresholdForLevel(level)` | Returns XP required for specific level (1-20) |
| `getXPToNextLevel(currentLevel)` | Returns XP needed to advance from current level to next |
| `getLevelFromXP(totalXP)` | Determines character level from total XP |
| `isTrackMastered(listenCount)` | Checks if listen count meets mastery threshold |
| `getMasteryBonusXP()` | Returns bonus XP for mastering a track |
| `getConfig()` | Returns current configuration |

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `ExperienceSystem` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Configuration for XP calculation (rates, thresholds, bonuses) |

---

### LevelUpProcessor

*Location:* *[src/core/progression/LevelUpProcessor.ts](src/core/progression/LevelUpProcessor.ts)*

*Also known as: Level-up handler, character advancement*

Handles the mechanics of leveling up a character.

#### Method Reference

| Method | Description |
|--------|-------------|
| `processLevelUp(character, newLevel)` | Calculates level-up benefits for given level |
| `applyLevelUp(character, benefits)` | Applies calculated benefits to character sheet |
| `getXPThreshold(level, isUncapped?)` | Returns XP required for specific level (uses uncapped formula when `isUncapped: true`) |
| `calculateLevel(totalXP, isUncapped?)` | Determines character level from total XP |
| `setStatManager(statManager)` | Sets StatManager for stat increase handling |
| `processLevelUpWithoutStats(character, newLevel)` | Calculates benefits excluding stat increases (manual mode) |
| `applyAutomaticBenefitsOnly(character, benefits)` | Applies HP/proficiency/features without stat increases |
| `applyStatIncreasesOnly(character, statSelections)` | Applies stat increases to character with pending counter |
| `setUncappedConfig(config)` | Sets custom formulas for uncapped mode progression (pass empty object to reset) |
| `getUncappedConfig()` | Returns the current uncapped configuration |

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `LevelUpBenefits` | [src/core/progression/LevelUpProcessor.ts](src/core/progression/LevelUpProcessor.ts) | Benefits granted by leveling up (HP, proficiency, stats, spell slots, features) |
| `UncappedProgressionConfig` | [src/core/progression/LevelUpProcessor.ts](src/core/progression/LevelUpProcessor.ts) | Custom formulas for uncapped mode XP thresholds and proficiency bonuses |

---

### PrestigeSystem

*Location:* *[src/core/progression/PrestigeSystem.ts](src/core/progression/PrestigeSystem.ts)*

*Also known as: Track mastery, prestige system, mastery progression*

Handles the prestige mechanic where players reset their character after mastering a track in exchange for visual badge upgrades. Uses dual requirements (plays AND XP) to prevent "cheesing" the system.

#### Key Concepts

- **Prestige Levels:** 10 levels (0-10), where 0 = no prestige, 1-10 = Roman numerals I-X
- **Dual Requirements:** Must meet BOTH plays AND XP thresholds to master
- **Scaling:** 1.5x per prestige level for both plays and XP
- **Reset on Prestige:** Level → 1, XP → 0, stats reset, listen count → 0
- **Preserved:** Equipment only

#### Threshold Values

| Prestige | Plays Required | XP Required |
|----------|---------------|-------------|
| 0 | 10 | 1,000 |
| I | 15 | 1,500 |
| II | 23 | 2,250 |
| III | 34 | 3,375 |
| IV | 51 | 5,063 |
| V | 77 | 7,594 |
| VI | 115 | 11,391 |
| VII | 173 | 17,086 |
| VIII | 259 | 25,629 |
| IX | 389 | 38,444 |
| X (max) | 584 | 57,666 |

#### Method Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `getPlaysThreshold(prestigeLevel)` | number | Plays required for mastery at given prestige level |
| `getXPThreshold(prestigeLevel)` | number | XP required for mastery at given prestige level |
| `setCustomThresholds(prestigeLevel, thresholds)` | void | Override default thresholds for a level (null = use calculated) |
| `clearCustomThresholds(prestigeLevel?)` | void | Clear custom thresholds (omit level to clear all) |
| `hasCustomThresholds(prestigeLevel)` | boolean | Check if custom thresholds exist for a level |
| `getCustomThresholds(prestigeLevel)` | CustomThresholds \| undefined | Get custom thresholds for a level |
| `isMastered(listenCount, totalXP, prestigeLevel)` | boolean | Check if track is mastered (meets BOTH thresholds) |
| `canPrestige(prestigeLevel, listenCount, totalXP)` | boolean | Check if character can prestige (mastered AND not at max) |
| `isJustMastered(prevPlays, currPlays, prevXP, currXP, prestigeLevel)` | boolean | Check if mastery was achieved this session |
| `calculateMasteryBonus(isMastered)` | number | Bonus XP for achieving mastery |
| `getPrestigeInfo(prestigeLevel, listenCount, totalXP)` | PrestigeInfo | Complete prestige info for UI display |
| `toRomanNumeral(level)` | string | Convert level to Roman numeral (empty for 0) |
| `getNextPrestigeLevel(currentLevel)` | PrestigeLevel \| null | Get next level or null if at max |
| `createSuccessResult(previousLevel, newLevel)` | PrestigeResult | Create success result object |
| `createFailureResult(reason, currentLevel)` | PrestigeResult | Create failure result object |
| `getAllThresholds()` | Array | Get all threshold values for display/debugging |

#### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `PRESTIGE_ROMAN_NUMERALS` | Record | Roman numeral mapping for levels 0-10 |
| `MAX_PRESTIGE_LEVEL` | 10 | Maximum prestige level achievable |
| `BASE_PLAYS_THRESHOLD` | 10 | Base plays required at prestige 0 |
| `BASE_XP_THRESHOLD` | 1000 | Base XP required at prestige 0 |
| `PRESTIGE_SCALING_FACTOR` | 1.5 | Multiplier per prestige level |

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `PrestigeLevel` | [src/core/types/Prestige.ts](src/core/types/Prestige.ts) | Union type: 0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7 \| 8 \| 9 \| 10 |
| `PrestigeInfo` | [src/core/types/Prestige.ts](src/core/types/Prestige.ts) | Complete prestige info with progress, thresholds, and status |
| `PrestigeResult` | [src/core/types/Prestige.ts](src/core/types/Prestige.ts) | Result of prestige operation with success/failure info |
| `CustomThresholds` | [src/core/types/Prestige.ts](src/core/types/Prestige.ts) | Custom threshold overrides (playsThreshold, xpThreshold) |

#### Helper Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `isPrestigeLevel(value)` | boolean | Type guard for valid PrestigeLevel |
| `toPrestigeLevel(value)` | PrestigeLevel | Convert number to PrestigeLevel (clamped 0-10) |

---

### RhythmXPCalculator

*Location:* *[src/core/progression/RhythmXPCalculator.ts](src/core/progression/RhythmXPCalculator.ts)*

*Also known as: Rhythm game XP, beat game XP, music game XP calculator*

Calculates XP rewards for rhythm game button presses. Separates "score points" (for display/leaderboards) from "character XP" (for progression) via the `xpRatio` parameter.

The system supports two parallel XP systems:
1. **Per-button-press XP** (this class) - rewards timing accuracy, combos, groove
2. **Listening session XP boost** (XPCalculator) - boosts background listening XP while playing

**For usage examples, see [XP_AND_STATS.md](docs/XP_AND_STATS.md#rhythm-game-xp)**

#### Constructor

| Constructor | Description |
|-------------|-------------|
| `constructor(config?: Partial<RhythmXPConfig>)` | Creates instance with optional configuration to override defaults |

#### Usage Modes

The calculator supports two modes:

1. **Stateless**: Call `calculateButtonPressXP()` directly, frontend tracks combo/session
2. **Stateful**: Use `startSession()`, `recordHit()`, `getSessionTotals()`, `endSession()`

#### Method Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `calculateButtonPressXP(accuracy, options?)` | `RhythmXPResult` | Calculate XP for a single button press with optional combo and groove |
| `calculateComboEndBonus(comboLength)` | `ComboEndBonusResult` | Calculate bonus when a combo breaks (miss or wrongKey) |
| `calculateGrooveEndBonus(stats)` | `GrooveEndBonusResult` | Calculate bonus when a groove ends (hotness drops to 0 or session ends) |
| `getBaseXP(accuracy)` | `number` | Get base score points for an accuracy level |
| `getComboMultiplier(comboLength)` | `number` | Calculate combo multiplier from combo length (capped at `combo.cap`) |
| `startSession()` | `void` | Start a new session, resetting all totals |
| `recordHit(accuracy, options?)` | `RhythmXPResult` | Record a hit AND update session totals (stateful convenience) |
| `getSessionTotals()` | `RhythmSessionTotals \| null` | Get current session statistics snapshot |
| `endSession()` | `RhythmSessionTotals \| null` | End session and get final totals |
| `getConfig()` | `RhythmXPConfig` | Get current configuration |
| `updateConfig(config)` | `void` | Merge partial config with current configuration |

#### Configuration Types

| Type | Location | Description |
|------|----------|-------------|
| `RhythmXPConfig` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Complete rhythm XP configuration (baseXP, xpRatio, combo, groove, maxMultiplier) |
| `RhythmBaseXPConfig` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Base XP values for each accuracy level (perfect, great, good, ok, miss, wrongKey) |
| `RhythmComboConfig` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Combo multiplier configuration (enabled, cap, formula, endBonus) |
| `RhythmGrooveConfig` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Groove XP configuration (perHitMultiplier, perHitScale, endBonus) |
| `ComboEndBonusConfig` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Combo end bonus configuration (enabled, formula) |
| `GrooveEndBonusConfig` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Groove end bonus configuration (enabled, weights) |

#### Result Types

| Type | Location | Description |
|------|----------|-------------|
| `RhythmXPResult` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Result of calculating XP for a button press (scorePoints, baseXP, multipliers, finalScore, finalXP) |
| `ComboEndBonusResult` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Result of combo end bonus (comboLength, bonusScore, bonusXP) |
| `GrooveEndBonusResult` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Result of groove end bonus (bonusScore, bonusXP) |
| `GrooveEndStats` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Input stats for groove end bonus (maxStreak, avgHotness, duration, totalHits) |
| `GrooveStats` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Full groove statistics from GrooveAnalyzer |
| `RhythmSessionTotals` | [src/core/types/RhythmXP.ts](src/core/types/RhythmXP.ts) | Cumulative session statistics (totalScore, totalXP, maxCombo, accuracyDistribution, accuracyPercentage, duration) |

#### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_RHYTHM_XP_CONFIG` | Object | Default configuration tuned for D&D 5e progression |

#### Helper Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `mergeRhythmXPConfig(userConfig?)` | `RhythmXPConfig` | Merge user config with defaults |
| `shouldAccuracyBreakCombo(accuracy, okBreaksCombo?)` | `boolean` | Check if accuracy should break combo streak. Returns `true` for 'miss' and 'wrongKey', always. For 'ok', returns thetrue` by default (configurable). Perfect/great/good never break combo. |

**For configuration details, session tracking, and stateless usage examples:** See [docs/XP_AND_STATS.md#rhythm-game-xp](docs/XP_AND_STATS.md#rhythm-game-xp)

---

## Stat Increase System

*Also known as: Stat boosts, ability score increases, stat progression, attribute increases*

*Location:* *[src/core/progression/stat/StatManager.ts](src/core/progression/stat/StatManager.ts)*

Manages D&D 5e-style stat increases for character progression with flexible strategies for level-ups, items, and custom formulas.

### StatManager

**Constructor:** `new StatManager(config?: Partial<StatIncreaseConfig>)`

**Method Reference:**

| Method | Returns | Description |
|--------|---------|-------------|
| `increaseStats(character, increases, source)` | `StatIncreaseResult` | Manually increase stats (potions, items, events); enforces stat cap and recalculates modifiers |
| `decreaseStats(character, decreases, source)` | `StatIncreaseResult` | Decrease stats (curses, poison); uses same logic as increase but with negative amounts |
| `setStat(character, ability, value, source)` | `StatIncreaseResult` | Set a stat to an absolute value; useful for setting specific values or resetting stats |
| `processLevelUp(character, newLevel, options?)` | `StatIncreaseResult \| null` | Process stat increases for level up; returns null if level doesn't grant increases |
| `canIncrease(character, ability, amount)` | `boolean` | Check if ability can be increased by amount; returns false if stat would exceed cap |
| `getStatCap(character, ability)` | `number` | Get stat cap for ability (reads gameMode from character) |
| `getConfig()` | `Readonly<Required<StatIncreaseConfig>>` | Get current configuration with all defaults applied |
| `validateDnD5eStatSelection(character, selections, increaseAmount?)` | `{ valid: true } \| StatSelectionValidationError` | Validate stat selection follows D&D 5e rules (+2 to one OR +1 to two) |
| `updateConfig(config)` | `void` | Update configuration mid-game; change strategies, stat cap, or increase levels |

**Types:**

| Type | Location | Description |
|------|----------|-------------|
| `StatIncreaseConfig` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Configuration with maxStatCap, strategy, autoApply, statIncreaseLevels |
| `StatIncreaseResult` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Result with updated character, increases array, capped array, source, timestamp |
| `StatSelectionValidationError` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Validation error with reason (invalid_ability, invalid_amount, exceeds_cap, wrong_pattern, duplicate_ability) |

For complete stat increase examples (manual selection, auto-selection, custom formulas, potions/curses), see [XP_AND_STATS.md](docs/XP_AND_STATS.md#stat-increase-strategies).

### Built-in Strategies

| Strategy Name | Type | Description | Use Case |
|---------------|------|-------------|----------|
| `DnD5eStandardStrategy` | Built-in | **DEFAULT** - Standard D&D 5e rules. Grants +2 to one ability OR +1 to two abilities. **Requires manual selection** via `forcedAbilities` option or throws an error. | Traditional D&D 5e gameplay where players choose stat increases |
| `DnD5eSmartStrategy` | Built-in | Intelligent auto-selection. Boosts class's primary ability if below 16, otherwise boosts lowest stat. Can grant +2 to one or +1 to two based on what's most beneficial. | Auto-leveling without manual input while maintaining optimal builds |
| `BalancedStrategy` | Built-in | Always grants +1 to two lowest stats (never grants +2 to one). Ensures balanced character development. | Games that want well-rounded characters without min-maxing |
| `PrimaryOnlyStrategy` | Built-in | Always boosts the class's primary ability score. Grants +2 to one ability only. | Simple progression that reinforces class identity |
| `RandomStrategy` | Built-in | Random stat selection. Can grant +2 to one or +1 to two at random. | Unpredictable, roguelike-style gameplay |
| `ManualStrategy` | Built-in | Always defers to manual stat selection via `applyPendingStatIncrease()`. Returns empty array to signal manual input required. Never auto-applies stats. | Pure manual mode where user must confirm each stat increase via UI |
| **Custom Functions** | Function | Provide your own `(character, amount, options) => Array<{ability, amount}>` function | Game-specific formulas (e.g., "tank build", " DPS build", etc.) |

### Strategy Types

**Type:** `StatIncreaseStrategyType`

*Location:* *[src/core/types/Progression.ts](src/core/types/Progression.ts)*

| Strategy Value | Description |
|----------------|-------------|
| `dnD5e` | Manual selection (D&D 5e standard) - requires player choice via `forcedAbilities` |
| `dnD5e_smart` | Intelligent auto-selection - boosts class primary if below 16, otherwise lowest stat |
| `balanced` | +1 to two lowest stats - ensures balanced character development |
| `primary_only` | Always boosts class primary ability score (+2 to one ability) |
| `random` | Random stat selection - can grant +2 to one or +1 to two at random |
| `manual` | Always defers to manual stat selection via `applyPendingStatIncrease()` |

---

## Game Mode Configuration

The engine supports two game modes for character progression:

### Standard Mode (Default)
- D&D 5e rules
- Stats capped at 20
- Stat increases at levels 4, 8, 12, 16, 19
- Maximum level: 20

### Uncapped Mode
- No stat limits (can exceed 20)
- Stat increases EVERY level (2-∞)
- Maximum level: unlimited
- Custom XP scaling formulas available

The `gameMode` is stored on the character and automatically used during level-ups.

**For usage examples and progression configuration:** See [docs/XP_AND_STATS.md#game-mode-selection](docs/XP_AND_STATS.md#game-mode-selection)

---

## Configuration

**Locations:**
- Sensor Config: `src/core/config/sensorConfig.ts`
- Progression Config: `src/core/config/progressionConfig.ts`

The engine provides centralized configuration options for sensors and progression systems. These configurations allow you to customize behavior such as cache TTLs, retry logic, XP modifiers, and level-up settings.

### Sensor Configuration

*Also known as: Sensor settings, environment configuration, runtime configuration*

*Location:* *[src/core/config/sensorConfig.ts](src/core/config/sensorConfig.ts)*

Centralized configuration for sensors, XP modifiers, and retry logic.

#### Configuration Types

| Type | Description |
|------|-------------|
| `SensorConfig` | Complete sensor configuration (geolocation, weather, gaming, xpModifier, retry) |
| `GeolocationSensorConfig` | GPS sensor settings (cacheTTL, useLocalStorage, enableHighAccuracy, timeout) |
| `WeatherSensorConfig` | Weather API settings (apiKey, cacheTTL, forecastCacheTTL, useLocalStorage) |
| `GamingSensorConfig` | Steam/Discord settings (steam, discord, metadataCacheExpiry, maxBackoffMs, xpModifier) |
| `XPModifierConfig` | XP multiplier settings (maxModifier, gaming bonuses, environmental bonuses) |
| `RetryConfig` | Retry policy (enabled, maxRetries, delays, backoffMultiplier) |

#### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `loadConfigFromEnv()` | `Partial<SensorConfig>` | Loads configuration from environment variables |
| `mergeConfig(userConfig?)` | `Required<SensorConfig>` | Merges user config with environment config and defaults |

#### Constants

| Constant | Type | Description |
|----------|------|-------------|
| `DEFAULT_SENSOR_CONFIG` | `Required<SensorConfig>` | Default configuration values for all sensors |

#### Environment Variables

| Variable | Purpose |
|----------|---------|
| `WEATHER_API_KEY` | OpenWeatherMap API key for weather-based XP modifiers |
| `STEAM_API_KEY` | Steam Web API key for gaming-based XP modifiers |
| `STEAM_USER_ID` | 64-bit Steam ID for game detection |
| `DISCORD_CLIENT_ID` | Discord application ID for Rich Presence music status |
| `XP_MAX_MODIFIER` | Maximum XP multiplier cap (default: 3.0) |

**For complete environment variable documentation and examples, see [.env.example](.env.example).**

### Progression Configuration

*Also known as: XP settings, level-up configuration, progression rules*

*Location:* *[src/core/config/progressionConfig.ts](src/core/config/progressionConfig.ts)*

Configuration for XP thresholds, stat increases, and level-up behavior.

#### Types

| Type | Description |
|------|-------------|
| `ProgressionConfig` | Complete progression configuration (xp, statIncrease, levelUp) |
| `StatIncreaseConfig` | Stat increase strategy and configuration |

#### Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `mergeProgressionConfig(userConfig?)` | `Required<ProgressionConfig>` | Merges user configuration with defaults |

#### Constants

| Constant | Type | Description |
|----------|------|-------------|
| `DEFAULT_PROGRESSION_CONFIG` | `Required<ProgressionConfig>` | Default D&D 5e progression values |

---

## Environmental Sensors
*Also known as: IRL sensors, real-world sensors, environmental context, GPS/weather integration*

*Location:* *[src/core/sensors/EnvironmentalSensors.ts](src/core/sensors/EnvironmentalSensors.ts)*

**For usage examples, see [docs/IRL_SENSORS.md](docs/IRL_SENSORS.md)**

Integrates real-world data (GPS, Weather, Motion, Light) to influence XP generation.

### EnvironmentalSensors

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `requestPermissions()` | `types: SensorType[]` | `Promise<SensorPermission[]>` | Requests browser permissions for sensors |
| `startMonitoring()` | `callback?: (context) => void` | `void` | Starts listening to sensor streams |
| `stopMonitoring()` | - | `void` | Stops all sensor monitoring |
| `updateSnapshot()` | - | `Promise<EnvironmentalContext>` | Fetches current pull-based data (geo, weather) |
| `calculateXPModifier()` | - | `number` | Returns XP multiplier (1.0x - 3.0x) based on context |
| `calculateXPModifierWithForecast()` | `forecastHours?: number` | `Promise<number>` | Calculates XP modifier including weather forecast |
| `calculateXPModifierWithSevereWeather()` | - | `Promise<{ modifier, severeWeatherAlert, safetyWarning }>` | Calculates XP modifier with severe weather detection |
| `detectSevereWeather()` | - | `SevereWeatherAlert \| null` | Detects severe weather from current conditions |
| `getSevereWeatherWarning()` | - | `string \| null` | Returns safety warning for current severe weather |
| `getSensorStatus()` | `sensorType: SensorType` | `SensorStatus \| null` | Returns current health status of a sensor |
| `getAllSensorStatuses()` | - | `SensorStatus[]` | Returns status of all sensors |
| `getFailureLog()` | `sensorType?: SensorType, limit?: number` | `SensorFailureLog[]` | Returns failure log entries, optionally filtered |
| `getLastKnownGood()` | `sensorType: SensorType` | `any` | Returns last known good value for a sensor |
| `clearFailureLog()` | - | `void` | Clears failure log entries |
| `updateRetryConfig()` | `config: Partial<SensorRetryConfig>` | `void` | Updates retry configuration |
| `onSensorRecovery()` | `callback: (notification) => void` | `() => void` | Registers sensor recovery callback, returns unsubscribe |
| `getPermissions()` | - | `SensorPermission[]` | Returns current permission states |
| `checkAvailability()` | `type: SensorType` | `boolean` | Checks if a sensor type is available in the current environment |
| `getCurrentActivity()` | - | `'stationary' \| 'walking' \| 'running' \| 'driving' \| 'unknown'` | Returns current activity type from motion sensor |
| `getDiagnostics()` | - | `{ timestamp, diagnosticMode, sensors, cache, performance, recentFailures, permissions, context }` | Returns comprehensive diagnostic information |
| `enableDiagnosticMode()` | - | `void` | Enables diagnostic logging mode |
| `disableDiagnosticMode()` | - | `void` | Disables diagnostic logging mode |
| `printDashboard()` | `config?: DashboardConfig` | `void` | Prints formatted sensor dashboard to console |

### Environmental Helper Classes

#### Helper: `GeolocationProvider`

*Location:* *[src/core/sensors/GeolocationProvider.ts](src/core/sensors/GeolocationProvider.ts)*

Handles GPS data and biome detection with caching support.

**Constructor:**
```typescript
new GeolocationProvider(cacheTTLMinutes?: number, useLocalStorage?: boolean)
new GeolocationProvider(config: GeolocationSensorConfig)
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getCurrentPosition()` | `forceRefresh?: boolean` | `Promise<GeolocationData \| null>` | Gets current position, using cache unless force refresh |
| `getBiome()` | `latitude: number, longitude: number, altitude?: number \| null` | `string` | Calculates biome type from coordinates (e.g., 'forest', 'desert', 'mountain_coastal') |
| `getCachedPosition()` | - | `GeolocationData \| null` | Returns cached position without checking TTL |
| `getCacheAge()` | - | `number \| null` | Returns age of cached position in milliseconds |
| `isCacheExpired()` | - | `boolean` | Returns true if cache is expired or doesn't exist |
| `invalidateCache()` | - | `void` | Clears all cached geolocation data |
| `getCacheStats()` | - | `{ hits: number, misses: number }` | Returns cache statistics |
| `resetCacheStats()` | - | `void` | Resets cache statistics to zero |

**Biome Types:** `plains`, `forest`, `jungle`, `savanna`, `desert`, `tundra`, `taiga`, `mountain`, `swamp`, `valley`, `urban`, `coastal_urban`, `coastal_desert` (with optional `_coastal` suffix)

#### Helper: `MotionDetector`

*Location:* *[src/core/sensors/MotionDetector.ts](src/core/sensors/MotionDetector.ts)*

Handles accelerometer and gyroscope data for activity detection.

**Methods:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `startMonitoring()` | `callback: (data: MotionData) => void` | `void` | Starts listening for device motion events |
| `stopMonitoring()` | - | `void` | Stops listening for motion events |
| `getLastMotion()` | - | `MotionData \| null` | Returns the last recorded motion data |
| `detectActivity()` | `data: MotionData` | `'stationary' \| 'walking' \| 'running' \| 'driving' \| 'unknown'` | Detects activity type based on motion intensity |

#### Helper: `WeatherAPIClient`

*Location:* *[src/core/sensors/WeatherAPIClient.ts](src/core/sensors/WeatherAPIClient.ts)*

Fetches weather data and forecasts from OpenWeatherMap API.

**Constructor:**
```typescript
new WeatherAPIClient(apiKey?: string, cacheTTLMinutes?: number, useLocalStorage?: boolean)
new WeatherAPIClient(config: WeatherSensorConfig)
```

**Methods:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getWeather()` | `latitude: number, longitude: number` | `Promise<WeatherData \| null>` | Fetches current weather for coordinates |
| `getForecast()` | `latitude: number, longitude: number, hours?: number` | `Promise<ForecastData[] \| null>` | Fetches weather forecast (max 120 hours) |
| `getUpcomingWeather()` | `latitude: number, longitude: number, hours?: number` | `Promise<UpcomingWeatherInfo \| null>` | Gets upcoming weather changes for XP modifier calculation |
| `detectSevereWeather()` | `weather: WeatherData \| ForecastData` | `SevereWeatherAlert \| null` | Detects severe weather (blizzard, hurricane, tornado) |
| `getSafetyWarning()` | `alert: SevereWeatherAlert` | `string` | Returns safety warning message for severe weather alert |
| `invalidateCache()` | - | `void` | Clears all cached weather data |
| `invalidateLocation()` | `latitude: number, longitude: number` | `void` | Clears cache for a specific location |
| `invalidateForecastCache()` | - | `void` | Clears all forecast cache |
| `invalidateForecastLocation()` | `latitude: number, longitude: number` | `void` | Clears forecast cache for a specific location |
| `getCacheStats()` | - | `{ hits: number, misses: number }` | Returns cache statistics |
| `resetCacheStats()` | - | `void` | Resets cache statistics to zero |
| `getCacheSize()` | - | `number` | Returns number of cached entries |
| `clearExpiredEntries()` | - | `number` | Clears expired cache entries, returns count cleared |
| `clearExpiredForecastEntries()` | - | `number` | Clears expired forecast entries, returns count cleared |
| `getWeatherApiMetrics()` | - | `PerformanceMetrics` | Returns performance metrics for weather API calls |
| `getWeatherApiStatistics()` | - | `PerformanceStatistics & { p95: number, p99: number }` | Returns calculated statistics including percentiles |
| `getForecastApiMetrics()` | - | `PerformanceMetrics` | Returns performance metrics for forecast API calls |
| `getForecastApiStatistics()` | - | `PerformanceStatistics & { p95: number, p99: number }` | Returns calculated statistics for forecast API |
| `resetPerformanceMetrics()` | - | `void` | Resets all performance metrics |
| `getSolarInfo()` | `latitude: number, longitude: number, date?: Date` | `SolarInfo` | Gets solar info (sunrise, sunset, day stage) - **works without API key** |

**Severe Weather Types:** `Blizzard`, `Hurricane`, `Typhoon`, `Tornado`, `None`

##### Solar Information (`getSolarInfo`)

*[src/core/api/WeatherAPIClient.ts](src/core/api/WeatherAPIClient.ts)*

Astronomical calculations for sunrise, sunset, and day stage. **Works without an API key** using pure astronomical math (NOAA algorithm).

**Returns: `SolarInfo`**

| Property | Type | Description |
|----------|------|-------------|
| `stage` | `DayStage` | Current day stage |
| `sunrise` | `Date` | Sunrise time (UTC) |
| `sunset` | `Date` | Sunset time (UTC) |
| `solarNoon` | `Date` | Solar noon time (UTC) |
| `sunAltitude` | `number` | Sun altitude in degrees |
| `sunAzimuth` | `number` | Sun azimuth (0-360, North=0) |
| `dayLengthHours` | `number` | Day length in hours |

**Day Stages:**

| Stage | Description |
|-------|-------------|
| `night` | Before civil dawn or after civil dusk |
| `dawn` | Between civil dawn and sunrise (~30 min) |
| `day` | Between sunrise and sunset |
| `dusk` | Between sunset and civil dusk (~30 min) |

*For usage examples, see [IRL_SENSORS.md](docs/IRL_SENSORS.md#solar-information-no-api-key-required).*

#### Helper: `LightSensor`

*Location:* *[src/core/sensors/LightSensor.ts](src/core/sensors/LightSensor.ts)*

Uses the experimental AmbientLightSensor API for illuminance detection.

**Methods:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `startMonitoring()` | `callback: (data: LightData) => void` | `void` | Starts monitoring ambient light levels |
| `stopMonitoring()` | - | `void` | Stops monitoring light |
| `getLastReading()` | - | `LightData \| null` | Returns the last light sensor reading |

**Note:** The AmbientLightSensor API is experimental and may not be available in all browsers. The class gracefully handles unavailability.

---

## Gaming Integration
*Also known as: Gaming sensors, platform detection, game activity monitoring, Steam integration, Discord Rich Presence*

*Location:* *[src/core/sensors/GamingPlatformSensors.ts](src/core/sensors/GamingPlatformSensors.ts)*

Monitors Steam and Discord activity to award gaming bonuses. **Note:** Discord RPC cannot read game activity (platform limitation) - only displays music status.

### GamingPlatformSensors

| Method | Description |
|--------|-------------|
| `constructor(config?: { steam?, discord? })` | Initializes with optional Steam API key/ID and Discord client ID |
| `authenticate(steamUserId?, discordUserId?)` | Authenticates with Steam (by ID) and Discord (connects RPC) |
| `startMonitoring(callback?)` | Starts polling for gaming activity with optional context callback |
| `stopMonitoring()` | Stops monitoring gaming activity |
| `isPlayingGame(gameName)` | Checks if currently playing a specific game (case-insensitive) |
| `calculateGamingBonus()` | Calculates gaming XP bonus multiplier (1.0 to 1.75, configurable) |
| `getContext()` | Returns current `GamingContext` snapshot |
| `recordGameSession(name, durationMinutes)` | Records a game session in gaming history |
| `getDiagnostics()` | Returns comprehensive diagnostic report (Steam, Discord, cache, performance) |
| `printDashboard(config?)` | Prints formatted gaming sensor dashboard to console |

### SteamAPIClient
*Location:* *[src/core/sensors/SteamAPIClient.ts](src/core/sensors/SteamAPIClient.ts)*

| Method | Description |
|--------|-------------|
| `getCurrentGame(steamUserId)` | Fetches currently played game (name, appId, sessionDuration) |
| `getGameMetadata(gameName)` | Fetches genre tags and description for gaming bonuses |
| `getGameSchema(appId)` | Fetches game schema/stats from Steam |
| `getCurrentGameApiStatistics()` | Returns performance metrics (avg, min, max, success rate, p95, p99) |
| `getMetadataApiStatistics()` | Returns metadata API performance metrics |
| `resetPerformanceMetrics()` | Resets all performance tracking counters |

### DiscordRPCClient
*Location:* *[src/core/sensors/DiscordRPCClient.ts](src/core/sensors/DiscordRPCClient.ts)*

**⚠️ Important:** Discord RPC CANNOT read game activity. Use Steam API for game detection. Discord RPC is ONLY for displaying music status ("Listening to") on user's Discord profile.

| Method | Description |
|--------|-------------|
| `constructor(clientId)` | Initializes with Discord application client ID (auto-detects environment) |
| `connect()` | Connects to Discord RPC (server mode only; returns `false` in browser) |
| `disconnect()` | Disconnects from Discord RPC |
| `isConnectedToDiscord()` | Returns connection status (`false` in browser mode) |
| `getConnectionState()` | Returns current `DiscordConnectionState` |
| `getLastError()` | Returns last error message or `null` |
| `setMusicActivity(musicDetails)` | Displays "Listening to {song}" on Discord profile (server only) |
| `clearMusicActivity()` | Clears music activity from Discord (server only) |
| `getUserInfo()` | Retrieves Discord user information (server only) |

**Environment Modes:**
- **Server (Node.js)**: Full Discord Rich Presence using `@ryuziii/discord-rpc`
- **Browser**: Graceful degradation - methods return `false`/`null` with console warnings
- **Detection**: Automatic - no configuration required

### Discord Types

| Type | Description |
|------|-------------|
| `DiscordUserInfo` | User information from Discord READY event (id, username, discriminator, avatar, globalName) |
| `MusicActivityDetails` | Music presence details (songName, artistName, albumArtKey, albumName, startTime, endTime) |
| `DiscordActivity` | Rich Presence activity structure (type, details, state, timestamps, images, buttons) |
| `DiscordConnectionState` | Connection states: `Disconnected`, `Connecting`, `Connected`, `DiscordUnavailable`, `Error` |
| `ActivityType` | Activity types: `Playing` (0), `Streaming` (1), `Listening` (2), `Watching` (3), `Competing` (5) |
| `DiscordActivityButton` | Button with label and URL for activity |
| `DiscordActivityAssets` | Image assets (largeImageKey, largeImageText, smallImageKey, smallImageText) |
| `DiscordActivityTimestamps` | Progress bar timestamps (startTimestamp, endTimestamp) |
| `DiscordActivityParty` | Party information for multiplayer (id, size) |
| `DiscordRPCErrorCode` | RPC error codes (4000-4007): InvalidOpcode, InvalidPayload, NotConnected, etc. |
| `DiscordRPCErrorResponse` | Error response structure (code, message, evt) |
| `DiscordRPCRawEvent` | Raw event data from Discord IPC |

---

## Combat System

*Also known as: D&D 5e combat, turn-based combat, battle system, encounter system*

**For usage examples, see [COMBAT_SYSTEM.md](docs/COMBAT_SYSTEM.md)**

### CombatEngine

*Location:* *[src/core/combat/CombatEngine.ts](src/core/combat/CombatEngine.ts)*

D&D 5e turn-based combat engine with initiative, attacks, spell casting, and damage mechanics.

**Constructor:**

| Constructor | Description |
|-------------|-------------|
| `new CombatEngine(config?: CombatConfig)` | Initialize combat engine with optional configuration (useEnvironment, useMusic, tacticalMode, maxTurnsBeforeDraw, allowFleeing, seed, treasure) |

**Methods:**

| Method | Description |
|--------|-------------|
| `startCombat(players, enemies, environment?)` | Rolls initiative and creates combat session |
| `getCurrentCombatant(combat)` | Returns current active combatant |
| `executeAttack(combat, attacker, target, attack)` | Resolves attack roll vs AC and applies damage (requires pre-built Attack object) |
| `executeWeaponAttack(combat, attacker, target, weaponName?)` | Auto-builds Attack from equipped weapon(s) and executes; uses first weapon or specific weapon if named; throws error if no weapon equipped |
| `executeCastSpell(combat, caster, spell, targets)` | Executes spell casting action |
| `executeDodge(combat, combatant)` | Executes dodge action (AC +2 until next turn) |
| `executeDash(combat, combatant)` | Executes dash action (double movement speed) |
| `executeDisengage(combat, combatant)` | Executes disengage action (no opportunity attacks) |
| `executeFlee(combat, combatant)` | Removes combatant from combat (requires `allowFleeing: true`) |
| `canFlee()` | Returns true if fleeing is allowed by config |
| `nextTurn(combat)` | Advances turn order and resets action trackers |
| `getCombatResult(combat)` | Returns winner and rewards if combat over (null if active) |
| `getCombatSummary(combat)` | Returns formatted combat summary string |
| `applyDamage(combatant, damage)` | Applies damage accounting for temp HP |
| `healCombatant(combatant, healing)` | Heals combatant |
| `applyTemporaryHP(combatant, tempHP)` | Applies temporary hit points |
| `getLivingCombatants(combat)` | Returns all non-defeated combatants |
| `getDefeatedCombatants(combat)` | Returns all defeated combatants |

### InitiativeRoller

*Also known as: Turn order manager, initiative tracker*

*Location:* *[src/core/combat/InitiativeRoller.ts](src/core/combat/InitiativeRoller.ts)*

> **Note:** Instance class - create with `new InitiativeRoller()`

Manages D&D 5e initiative system (rolling, sorting, turn progression).

| Method | Description |
|--------|-------------|
| `rollInitiativeForCombatant(combatant)` | Rolls d20 + DEX, updates combatant in-place, returns InitiativeResult |
| `rollInitiativeForAll(combatants)` | Rolls for all, sorts descending (DEX as tiebreaker), returns results and sorted array |
| `getNextCombatant(combatants, currentIndex)` | Gets next combatant in order, wraps around, returns isNewRound flag |
| `getInitiativeOrder(combatants)` | Returns formatted strings showing position, name, initiative, DEX |
| `rerollInitiativeForCombatant(combatant)` | Re-rolls for specific combatant (when DEX modifier changes) |
| `delayTurn(combatants, combatantId)` | Moves combatant one position later (Ready action) |
| `resortByInitiative(combatants)` | Resorts by current values (mid-combat joins or changes) |

### DiceRoller

*Also known as: Dice system, RNG, random number generator, d20 roller*

*Location:* *[src/core/combat/DiceRoller.ts](src/core/combat/DiceRoller.ts)*

> **Note:** Static class - call methods directly without instantiation: `DiceRoller.rollD20()`

Utility class for D&D-style dice rolling mechanics.

**Basic Dice:**

| Method | Description |
|--------|-------------|
| `rollDie(sides)` | Roll single die (4, 6, 8, 10, 12, 20, 100) |
| `rollD20()` | Roll d20 for attacks, checks, saves |
| `rollMultipleDice(count, sides)` | Roll multiple dice, return array |
| `rollPercentile()` | Roll d100 |

**Formula Parsing:**

| Method | Description |
|--------|-------------|
| `parseDiceFormula(formula)` | Parse and roll "2d6+3", returns parsed data and results |

**Advantage/Disadvantage:**

| Method | Description |
|--------|-------------|
| `rollWithAdvantage()` | Roll twice, take higher |
| `rollWithDisadvantage()` | Roll twice, take lower |

**Combat:**

| Method | Description |
|--------|-------------|
| `rollInitiative(dexModifier)` | Roll d20 + DEX modifier |
| `calculateDamage(formula, modifier, isCritical?)` | Calculate damage with optional modifier (doubles dice on crit) |
| `doubleDamage(rolls)` | Double dice array for critical hit |

**Saving Throws & Ability Checks:**

| Method | Description |
|--------|-------------|
| `rollSavingThrow(abilityModifier, proficiencyBonus?)` | Roll d20 + ability + proficiency |
| `rollAbilityCheck(abilityModifier, proficiencyBonus?)` | Roll d20 + ability + proficiency |

**Critical Hit Detection:**

| Method | Description |
|--------|-------------|
| `isCriticalHit(d20Roll)` | Returns true if natural 20 |
| `isCriticalMiss(d20Roll)` | Returns true if natural 1 |

**Seeded RNG:**

| Method | Description |
|--------|-------------|
| `seededRoll(seed)` | Deterministic d20 for reproducibility (LCG algorithm) |

### AttackResolver

*Also known as: Attack handler, melee/ranged attacks, to-hit calculator*

*Location:* *[src/core/combat/AttackResolver.ts](src/core/combat/AttackResolver.ts)*

> **Note:** Instance class - create with `new AttackResolver()`

Handles melee and ranged attack resolution (d20 + attack bonus vs target AC).

| Method | Description |
|--------|-------------|
| `resolveAttack(attacker, target, attack)` | Resolves complete attack (roll vs AC, damage if hit) |
| `isInRange(attacker, target, attack)` | Checks if attack is within range (melee: 5ft, ranged: attack.range) |
| `calculateAttackBonus(character, attackName, abilityModifier, isProficient)` | Calculates attack bonus (ability + proficiency if proficient) |
| `attackWithAdvantage(attacker, target, attack)` | Resolves attack with advantage (roll twice, take higher) |
| `attackWithDisadvantage(attacker, target, attack)` | Resolves attack with disadvantage (roll twice, take lower) |

### SpellCaster

*Also known as: Spell system, magic casting, spell slot manager*

*Location:* *[src/core/combat/SpellCaster.ts](src/core/combat/SpellCaster.ts)*

> **Note:** Instance class - create with `new SpellCaster()`

Handles spell casting mechanics (spell slots, saving throws, spell damage).

| Method | Description |
|--------|-------------|
| `castSpell(caster, spell, targets)` | Casts spell with slot consumption, attack rolls, and saving throws |
| `hasSpellSlot(caster, spellLevel)` | Checks if caster has slot of given level available |
| `consumeSpellSlot(caster, spellLevel)` | Consumes a spell slot |
| `restoreSpellSlots(caster)` | Restores all slots to maximum (after long rest) |
| `calculateSaveDC(caster, ability)` | Calculates spell save DC (8 + ability + proficiency) |
| `makeSavingThrow(target, saveAbility, saveDC)` | Makes saving throw against spell, returns true if succeeds |
| `getSpellSlotInfo(caster)` | Returns formatted spell slot information |
| `canUpcast(caster, spell, targetSlotLevel)` | Checks if spell can be upcast to higher level |
| `upcastSpell(caster, spell, targets, slotLevelUsed)` | Upcasts spell using higher-level slot |

---

## Enemy Generation

**For usage examples, see [ENEMY_GENERATION.md](ENEMY_GENERATION.md)**

### EnemyGenerator

*Location:* *[src/core/generation/EnemyGenerator.ts](src/core/generation/EnemyGenerator.ts)*

Deterministic enemy generator that creates balanced encounters based on party strength or target CR. All generation is seeded for reproducibility.

**Methods:**

| Method | Description |
|--------|-------------|
| `static generate(options: EnemyGenerationOptions): CharacterSheet` | Generate a single enemy from template or by category/archetype |
| `static generateEncounter(party: CharacterSheet[], options: EncounterGenerationOptions): CharacterSheet[]` | Generate encounter balanced for party (analyzes party strength) |
| `static generateEncounterByCR(options: EncounterGenerationOptions): CharacterSheet[]` | Generate encounter by target CR (no party required) |
| `static getTemplateById(id: string): EnemyTemplate \| undefined` | Get enemy template by ID (e.g., 'orc', 'goblin-archer') |

### CR/Level Conversion

*Location:* *[src/core/generation/CRLevelConverter.ts](src/core/generation/CRLevelConverter.ts)*

Bidirectional conversion between Challenge Rating (CR) and character level for enemy generation and encounter balancing.

| Method | Description |
|--------|-------------|
| `crToLevel(cr: number, tuning?: CRTuningConfig): number` | Convert CR to character level (CR 1 = level 1, supports fractional CR) |
| `levelToCR(level: number, tuning?: CRTuningConfig): number` | Convert character level to CR (inverse of crToLevel) |
| `roundLevel(level: number, minLevel?: number, maxLevel?: number): number` | Round level to nearest valid character level (default: 1-20) |
| `roundCR(cr: number): number` | Round CR to nearest valid step (0, 1/8, 1/4, 1/2, 1, 2, etc.) |
| `formatLevel(level: number): string` | Format level with fractional notation (e.g., "0 (1/4)") |
| `formatCR(cr: number): string` | Format CR with fractional notation (e.g., "1/4", "1/2") |
| `createCRTuning(options?: Partial<CRTuningConfig>): CRTuningConfig` | Create custom CR tuning configuration |

**For usage examples (single enemy generation, encounter generation, audio influence):** See [docs/ENEMY_GENERATION.md](docs/ENEMY_GENERATION.md#enemy-generation)

**Generation Options (EnemyGenerationOptions):**

| Property | Type | Description |
|----------|------|-------------|
| `seed` | `string` | **Required** - Base seed for deterministic generation |
| `templateId?` | `string` | Force specific template (e.g., 'orc', 'goblin-archer') |
| `rarity?` | `EnemyRarity` | Rarity tier (default: 'common') |
| `difficultyMultiplier?` | `number` | Fine-tune difficulty (default: 1.0) |
| `audioProfile?` | `AudioProfile` | Influences template selection |
| `track?` | `PlaylistTrack` | Required if audioProfile provided |

**Encounter Options (EncounterGenerationOptions):**

| Property | Type | Description |
|----------|------|-------------|
| `seed` | `string` | **Required** - Base seed for deterministic generation |
| `count` | `number` | **Required** - Number of enemies to generate |
| `difficulty?` | `EncounterDifficulty` | Party mode: easy/medium/hard/deadly (default: 'medium') |
| `targetCR?` | `number` | CR mode: Target CR for encounter |
| `baseRarity?` | `EnemyRarity` | Base rarity before leader promotion (default: 'common') |
| `difficultyMultiplier?` | `number` | Fine-tune difficulty (default: 1.0) |
| `category?` | `EnemyCategory` | Filter by category |
| `archetype?` | `EnemyArchetype` | Filter by archetype |
| `templateId?` | `string` | Force specific template for all enemies |
| `enemyMix?` | `EnemyMixMode` | Mix mode: 'uniform', 'custom', 'category', or 'random' |
| `templates?` | `string[]` | Template IDs for 'custom' mix mode |
| `audioProfile?` | `AudioProfile` | Influences template selection |
| `track?` | `PlaylistTrack` | Required if audioProfile provided |
| `enableLeaderPromotion?` | `boolean` | Auto-promote leaders for groups > 3 (default: true) |
| `allowMixedCategories?` | `boolean` | Allow mixed categories in 'random' mode (default: true) |
| `lairFeatures?` | `boolean` | Include lair action hints for bosses (default: false) |
| `minRarity?` | `EnemyRarity` | Force minimum rarity tier for all enemies |
| `maxRarity?` | `EnemyRarity` | Cap maximum rarity tier for all enemies |

**Rarity Scaling:**

| Rarity | Stat Multiplier | Signature Die | Extra Abilities | Resistances |
|--------|-----------------|----------------|-----------------|-------------|
| `common` | 1.0× | d6 | 0 | None |
| `uncommon` | 1.1× | d8 | 1 | None |
| `elite` | 1.25× | d10 | 2 | Type-based |
| `boss` | 1.5× | d12 | 3 | Type-based |

**Leader Promotion (groups > 3):**

| Enemy Count | Leader Rule |
|-------------|-------------|
| 1-3 | No leader, all same rarity |
| 4-6 | 1 enemy promoted to next rarity tier |
| 7-9 | 1 enemy promoted two tiers up |
| 10+ | 2 enemies promoted (1 one tier, 1 two tiers) |

### PartyAnalyzer

*Location:* *[src/core/combat/PartyAnalyzer.ts](src/core/combat/PartyAnalyzer.ts)*

Analyzes party strength for encounter generation using D&D 5e encounter building rules.

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `static calculatePartyLevel(party: CharacterSheet[]): number` | `number` | Average party level (rounded down) |
| `static calculatePartyStrength(party: CharacterSheet[]): number` | `number` | Combined strength score |
| `static getXPBudget(party: CharacterSheet[], difficulty: EncounterDifficulty): number` | `number` | XP budget for encounter |
| `static getAverageAC(party: CharacterSheet[]): number` | `number` | Average armor class |
| `static getAverageHP(party: CharacterSheet[]): number` | `number` | Average hit points |
| `static getPartySize(party: CharacterSheet[]): number` | `number` | Party member count |
| `static getAverageDamage(party: CharacterSheet[]): number` | `number` | Estimated damage output |
| `static analyzeParty(party: CharacterSheet[]): PartyAnalysis` | `PartyAnalysis` | Complete analysis with all stats |

**PartyAnalysis Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `averageLevel` | `number` | Average party level |
| `partySize` | `number` | Number of party members |
| `averageAC` | `number` | Average armor class |
| `averageHP` | `number` | Average hit points |
| `averageDamage` | `number` | Estimated damage output |
| `totalStrength` | `number` | Abstract strength score |
| `easyXP` | `number` | XP budget for easy difficulty |
| `mediumXP` | `number` | XP budget for medium difficulty |
| `hardXP` | `number` | XP budget for hard difficulty |
| `deadlyXP` | `number` | XP budget for deadly difficulty |

### Encounter Balance Constants

*Location:* *[src/constants/EncounterBalance.ts](src/constants/EncounterBalance.ts)*

D&D 5e official encounter building tables for balanced encounters.

**XP Budget Per Level:** `XP_BUDGET_PER_LEVEL[level][difficulty]`

| Level | Easy | Medium | Hard | Deadly |
|-------|-------|--------|-------|--------|
| 1 | 25 | 50 | 75 | 100 |
| 5 | 250 | 500 | 750 | 1000 |
| 10 | 600 | 1200 | 1800 | 2400 |
| 15 | 1600 | 3200 | 4800 | 6400 |
| 20 | 5000 | 10000 | 15000 | 20000 |

**CR to XP Conversion:** `CR_TO_XP[cr]`

| CR | XP | CR | XP | CR | XP |
|----|-----|----|-----|----|
| 0 | 10 | 5 | 1800 | 15 | 13000 |
| 1/8 | 25 | 6 | 2300 | 20 | 25000 |
| 1/4 | 50 | 10 | 5900 | 30+ | Scales up |

**Utility Functions:**

| Function | Description |
|----------|-------------|
| `getXPForCR(cr: number): number` | Convert CR to XP |
| `getCRFromXP(xp: number): number` | Convert XP to CR |
| `applyTuning(xpBudget: number, tuningFactor: number): number` | Apply difficulty tuning factor |
| `getXPBudgetPerLevel(level: number, difficulty: EncounterDifficulty): number` | Get XP budget for single character |
| `getXPBudgetForParty(levels: number[], difficulty: EncounterDifficulty): number` | Get total XP budget for party |
| `getEncounterMultiplier(enemyCount: number): number` | Get encounter multiplier for group size |
| `calculateAdjustedXP(enemyCRs: number[], multiplier: number): number` | Calculate adjusted XP with multiplier |
| `getAveragePartyLevel(levels: number[]): number` | Calculate average party level |

### EnemyEquipmentGenerator
*Also known as: Enemy equipment manager, gear generator*

*Location:* *[src/core/generation/EnemyEquipmentGenerator.ts](src/core/generation/EnemyEquipmentGenerator.ts)*

Generates equipment for enemy characters based on archetype and rarity. Equipment selection is deterministic and uses seeded RNG for reproducibility.

**Methods:**

| Method | Description |
|--------|-------------|
| `static generate(options: EnemyEquipmentGenerationOptions): EquipmentConfig` | Generate equipment configuration with weapon, armor, and optional shield |
| `static getEquipmentName(templateId: string): string` | Get actual equipment name from template ID |
| `static getAllTemplates(): EquipmentTemplate[]` | Get all equipment templates |
| `static getTemplateById(id: string): EquipmentTemplate \| undefined` | Get equipment template by ID |

**EquipmentTemplate Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `type` | `'weapon' \| 'armor' \| 'shield'` | Equipment type |
| `archetype` | `EnemyArchetype[]` | Applicable archetypes |
| `rarity` | `EnemyRarity[]` | Applicable rarity tiers |
| `damage?` | `string` | Damage dice (e.g., "1d8") for weapons |
| `acBonus?` | `number` | AC bonus for armor/shields |

**EquipmentConfig Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `weapon?` | `EquipmentTemplate` | Selected weapon template |
| `armor?` | `EquipmentTemplate` | Selected armor template |
| `shield?` | `EquipmentTemplate` | Selected shield template (if applicable) |

### SpellcastingGenerator
*Also known as: Enemy spell system, caster generator*

*Location:* *[src/core/generation/SpellcastingGenerator.ts](src/core/generation/SpellcastingGenerator.ts)*

Generates innate spellcasting abilities for enemy casters. Unlike player spellcasting, enemies use a simplified system with predefined spell lists.

**Methods:**

| Method | Description |
|--------|-------------|
| `static generateSpellList(options: SpellcastingGenerationOptions): SpellcastingConfig` | Generate spell list with seed string |
| `static generateSpellListWithRNG(options: SpellcastingGenerationOptionsWithRNG): SpellcastingConfig` | Same as above but accepts SeededRNG directly |
| `static getSpellSlotsForCR(cr: number): Record<number, number>` | Get spell slot configuration for a given CR |
| `static shouldHaveSpellcasting(archetype: EnemyArchetype, rarity: EnemyRarity): boolean` | Check if enemy archetype/rarity combo should have spellcasting |
| `static archetypeCanCast(archetype: EnemyArchetype): boolean` | Check if archetype has spellcasting capability |
| `static getSpellListForArchetype(archetype: EnemyArchetype): SpellList \| undefined` | Get complete spell list for an archetype |
| `static spellToFeature(spell: InnateSpell): Record<string, unknown> & { isSpell: boolean }` | Convert spell to Feature object |
| `static spellsToFeatures(config: SpellcastingConfig): Array<Record<string, unknown> & { isSpell: boolean }>` | Convert all spells in config to Feature array |

**InnateSpell Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `level` | `number` | Spell level (0 = cantrip, 1-9 = spell level) |
| `school` | `string` | Magical school (evocation, necromancy, etc.) |
| `effect` | `string` | Description of what spell does |
| `damage?` | `string` | Damage dice (e.g., "2d6") for damaging spells |
| `save?` | `string` | Save type (e.g., "DEX") |
| `damageType?` | `string` | Damage type for resistance calculations |
| `range?` | `number` | Range in feet |
| `concentration?` | `boolean` | Whether spell requires concentration |
| `tags?` | `string[]` | Classification tags |

**SpellcastingConfig Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `cantrips` | `InnateSpell[]` | Cantrips enemy knows (always available) |
| `spells` | `InnateSpell[]` | Spells enemy knows (may have limited slots) |
| `slots` | `Record<number, number>` | Spell slots available per level |

### LegendaryGenerator
*Also known as: Boss action system, legendary action generator*

*Location:* *[src/core/generation/LegendaryGenerator.ts](src/core/generation/LegendaryGenerator.ts)*

Generates legendary actions and resistances for boss-tier enemies. Bosses receive 3 legendary actions per round and 3 legendary resistances per day.

**Methods:**

| Method | Description |
|--------|-------------|
| `static generate(options: { archetype: EnemyArchetype, cr: number, seed: string }): LegendaryConfig` | Generate legendary configuration with seed string |
| `static generateWithRNG(options: { archetype: EnemyArchetype, cr: number, rng: SeededRNG }): LegendaryConfig` | Same as above but accepts SeededRNG directly |
| `static getResistancesForCR(cr: number): number` | Get legendary resistances per day for a given CR |
| `static getActionById(id: string): LegendaryAction \| undefined` | Get legendary action by ID |
| `static getActionsForArchetype(archetype: EnemyArchetype): LegendaryAction[]` | Get all legendary actions for an archetype |
| `static shouldHaveLegendary(rarity: EnemyRarity): boolean` | Check if rarity tier should have legendary actions |

**LegendaryAction Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `description` | `string` | Detailed description |
| `cost` | `number` | Cost in legendary action points (1-3) |
| `effect` | `string` | Effect description for combat system |
| `damage?` | `string` | Damage dice if this action deals damage |
| `damageType?` | `string` | Damage type for damaging actions |
| `archetypes` | `EnemyArchetype[]` | Archetypes this action is appropriate for |
| `tags?` | `string[]` | Tags for filtering (movement, damage, control, etc.) |

**LegendaryConfig Interface:**

| Property | Type | Description |
|----------|------|-------------|
| `resistances` | `number` | Number of legendary resistances per day |
| `actions` | `LegendaryAction[]` | Array of legendary actions available to this boss |
| `lairActionHint?` | `string` | Optional lair action hint for encounter design |

### Boss Enhancements

Boss-tier enemies receive special enhancements beyond standard rarity scaling:

**Legendary Resistances:**
- 3 per day for CR 1-10
- 4 per day for CR 11-15
- 5 per day for CR 16-20
- 6 per day for CR 21+

**Legendary Actions:**
- 3 actions available per round
- At least one movement option guaranteed
- Actions selected from archetype-specific pool

**Boss Name Generation:**
- Epic titles added to base name (e.g., "Grognak the Destroyer")
- Titles selected from archetypal pools
- Examples: "the Destroyer", "Lord of Ruin", "the Unbroken"

**Ultimate Ability:**
- Once-per-encounter ability
- Enhanced signature ability (2× damage dice)
- Marked with `uses_per_encounter: 1` and `max_uses_per_encounter: 1`

**Note:** Boss enemies do NOT receive spellcasting - they get ultimate abilities instead.

### Audio Stat Influence

Audio profile affects enemy stat distribution during generation. This is a subtle flavor modifier, not a massive power shift.

**Frequency Band → Stat Mapping:**

| Audio Dominance | Stat Bonus | Max Bonus |
|-----------------|-------------|------------|
| Bass dominance | +1 STR, +1 CON | +2 total |
| Treble dominance | +1 DEX | +2 total |
| Mid dominance | +1 WIS, +1 CHA | +2 total |
| Balanced (no clear dominance) | +1 to all abilities (smaller) | +2 total |

**Implementation Notes:**
- Applied after base stat calculation
- Capped at MAX_AUDIO_INFLUENCE (2) to prevent extreme values
- Additive to rarity scaling, not multiplicative
- Determined by comparing bass_dominance, treble_dominance, and mid_dominance values

### Enemy Type Definitions

*Location:* *[src/core/types/Enemy.ts](src/core/types/Enemy.ts)*

**EnemyCategory:**

| Value | Description |
|--------|-------------|
| `humanoid` | Civilized races that fight with weapons/armor |
| `beast` | Natural animals and magical creatures |
| `undead` | Undead creatures with necrotic resistance and poison immunity |
| `dragon` | Dragon type creatures with elemental immunities and breath weapons |
| `fiend` | Fiendish creatures with fire/cold resistance and poison immunity |
| `construct` | Construct creatures with poison/psychic immunity and no healing |
| `elemental` | Elemental creatures with immunity to their element type |
| `monstrosity` | Monstrosities with varied unique abilities |

**EnemyRarity:**

| Value | Stat Multiplier | Signature Die | Extra Abilities |
|--------|-----------------|----------------|-----------------|
| `common` | 1.0× | d6 | 0 |
| `uncommon` | 1.1× | d8 | 1 |
| `elite` | 1.25× | d10 | 2 |
| `boss` | 1.5× | d12 | 3 |

**EnemyArchetype:**

| Value | Description |
|--------|-------------|
| `brute` | High HP, high damage, melee-focused |
| `archer` | Ranged specialist, high accuracy, lower HP |
| `support` | Buffs allies, debuffs enemies, control abilities |

**EnemyMixMode:**

| Value | Description |
|--------|-------------|
| `uniform` | All enemies use same template (default) |
| `custom` | Use specific templates array |
| `category` | Random mix of enemies from same category |
| `random` | Completely random enemy mix from all templates |

**EncounterDifficulty:**

| Value | Description |
|--------|-------------|
| `easy` | 40-50% of medium XP budget |
| `medium` | Standard balanced fight (100%) |
| `hard` | 150-200% of medium XP budget |
| `deadly` | 250%+ of medium XP budget |

**Type Guards:**

| Function | Description |
|----------|-------------|
| `isValidEnemyCategory(value: unknown): value is EnemyCategory` | Check if valid enemy category |
| `isValidEnemyRarity(value: unknown): value is EnemyRarity` | Check if valid rarity tier |
| `isValidEnemyArchetype(value: unknown): value is EnemyArchetype` | Check if valid archetype |
| `isValidEncounterDifficulty(value: unknown): value is EncounterDifficulty` | Check if valid difficulty |

### Enemy Template Files

**For usage examples, see [ENEMY_GENERATION.md](ENEMY_GENERATION.md)**

The following template files contain enemy definitions organized by category:

| Template File | Location | Description |
|---------------|----------|-------------|
| **Humanoid** | [`src/constants/EnemyTemplates/Humanoid.ts`](src/constants/EnemyTemplates/Humanoid.ts) | Basic civilized enemies (orc, goblin, etc.) |
| **Beast** | [`src/constants/EnemyTemplates/Beast.ts`](src/constants/EnemyTemplates/Beast.ts) | Natural animals and magical creatures |
| **Undead** | [`src/constants/EnemyTemplates/Undead.ts`](src/constants/EnemyTemplates/Undead.ts) | Undead creatures with necrotic resistance and poison immunity |
| **Fiend** | [`src/constants/EnemyTemplates/Fiend.ts`](src/constants/EnemyTemplates/Fiend.ts) | Fiendish creatures with fire/cold resistance and poison immunity |
| **Elemental** | [`src/constants/EnemyTemplates/Elemental.ts`](src/constants/EnemyTemplates/Elemental.ts) | Elemental creatures with immunity to their element type |
| **Construct** | [`src/constants/EnemyTemplates/Construct.ts`](src/constants/EnemyTemplates/Construct.ts) | Construct creatures with poison/psychic immunity and no healing |
| **Dragon** | [`src/constants/EnemyTemplates/Dragon.ts`](src/constants/EnemyTemplates/Dragon.ts) | Dragon type creatures with elemental immunities and breath weapons |
| **Monstrosity** | [`src/constants/EnemyTemplates/Monstrosity.ts`](src/constants/EnemyTemplates/Monstrosity.ts) | Monstrosities with varied unique abilities |

---

## Equipment System

*Location:* *[src/core/equipment/](src/core/equipment/)*, `src/core/types/Equipment.ts`, `src/core/generation/EquipmentGenerator.ts`

**For comprehensive documentation, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)**

### Equipment Types

*Also known as: Item mods, enchantments, affixes, bonuses*

*Location:* *[src/core/types/Equipment.ts](src/core/types/Equipment.ts)*

#### EquipmentPropertyType

Available equipment property types:

| Type | Description |
|------|-------------|
| `stat_bonus` | +1 STR, +2 DEX, etc. |
| `skill_proficiency` | Proficiency or expertise in skills |
| `ability_unlock` | Darkvision, flight, etc. |
| `passive_modifier` | Damage resistance, speed bonus, AC bonus |
| `special_property` | Finesse, versatile, two-handed, etc. |
| `damage_bonus` | +1d6 fire damage, etc. |
| `stat_requirement` | Minimum stat required to use |

#### EquipmentCondition

Conditional property triggers:

| Type | Value |
|------|-------|
| `vs_creature_type` | string (e.g., "undead", "dragon") |
| `at_time_of_day` | "day" \| "night" \| "dawn" \| "dusk" |
| `wielder_race` | string (race name) |
| `wielder_class` | string (class name) |
| `while_equipped` | boolean |
| `on_hit` | boolean |
| `on_damage_taken` | boolean |
| `custom` | value: string, description: string |

#### Equipment Interfaces

| Type | Description | Location |
|------|-------------|----------|
| `EquipmentProperty` | Single property with type, target, value, optional condition | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `EnhancedEquipment` | Full equipment definition with properties, features, skills, spells, damage, AC, icon, image | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `EquipmentModification` | Enchantment/curse applied to equipment with properties and additions | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `EnhancedInventoryItem` | Inventory item with quantity, equipped status, modifications | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `EffectApplicationResult` | Result of applying/removing equipment effects | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `EquipmentValidationResult` | Result of validating equipment data | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `SpawnRandomOptions` | Options for filtering random equipment spawns | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `TreasureHoardResult` | Result of generating treasure hoard | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `BoxDropPool` | Single entry in a box drop pool (weight, itemName, quantity, gold) | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `BoxDrop` | A single drop slot containing a weighted pool of possible items | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `BoxContents` | Box configuration (drops array and consumeOnOpen flag) | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |
| `BoxOpenResult` | Result of opening a box (items array, gold total, consumeBox flag) | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) |

### EquipmentEffectApplier
*Also known as: Equipment effects manager, item bonus applier, equip/unequip handler*

*Location:* *[src/core/equipment/EquipmentEffectApplier.ts](src/core/equipment/EquipmentEffectApplier.ts)*

Static class for applying and removing equipment effects when equipping/unequipping items. All equipment effects stack by default.

| Method | Description |
|--------|-------------|
| `equipItem(character, equipment, instanceId?)` | Apply all effects from equipping an item (properties, features, skills, spells) |
| `unequipItem(character, equipmentName, instanceId?)` | Remove all effects from unequipping an item |
| `reapplyEquipmentEffects(character)` | Re-apply all equipment effects for updates/level-ups |
| `getActiveEffects(character)` | Get array of all active equipment properties on character |

### EquipmentValidator
*Also known as: Equipment validation, equipment data checker, property validator*

*Location:* *[src/core/equipment/EquipmentValidator.ts](src/core/equipment/EquipmentValidator.ts)*

Validates equipment data structures including complete equipment objects, individual properties, feature/skill references, damage info, spawn weights, and modifications.

#### Core Validation

| Method | Description |
|--------|-------------|
| `validateEquipment(equipment)` | Validate complete equipment object (name, type, rarity, weight, properties, features, skills, spells, damage, AC, weapon properties, spawn weight, template, tags) |
| `validateProperty(property)` | Validate single equipment property (type, target, value, condition, stackable, description) |

#### Reference Validation

| Method | Description |
|--------|-------------|
| `validateEquipmentFeatureReference(featureId)` | Check if feature ID exists in FeatureQuery (returns boolean) |
| `validateEquipmentSkillReference(skillId)` | Check if skill ID exists in SkillQuery (returns boolean) |
| `validateFeatureReference(featureRef, index)` | Validate feature reference (string ID or inline mini-feature object) |
| `validateSkillReference(skillId, index?)` | Validate skill reference with optional array index for error messages |

#### Field Validation

| Method | Description |
|--------|-------------|
| `validateDamageInfo(damage)` | Validate damage info (supports string format "1d8 slashing" or object format with dice, damageType, versatile) |
| `validateSpawnWeight(weight)` | Validate spawn weight (non-negative number, 0 = never random but still usable) |
| `validateModification(modification)` | Validate equipment modification (id, name, appliedAt, source, properties, addsFeatures, addsSkills, addsSpells) |
| `validateCondition(condition)` | Validate equipment condition (type, value, description for custom) |
| `validateMiniFeature(miniFeature)` | Validate inline equipment mini-feature (id, name, description, effects array, source) |
| `validateACBonus(acBonus)` | Validate AC bonus value (non-negative finite number) |
| `validateWeaponProperties(weaponProperties)` | Validate weapon properties array (supports range format "range_MIN_MAX") |

### EquipmentModifier
*Also known as: Equipment enchantment system, item modification API, equipment curse/upgrade handler*

*Location:* *[src/core/equipment/EquipmentModifier.ts](src/core/equipment/EquipmentModifier.ts)*

Static class for equipment modification including enchanting (positive effects), cursing (negative effects), upgrading (improving properties), and template application.

**Modification Operations:**
| Method | Description |
|--------|-------------|
| `enchant(equipment, itemName, enchantment, character?)` | Apply positive modification (adds to `modifications` array) |
| `applyTemplate(equipment, itemName, templateId, character?)` | Apply predefined template by ID |
| `curse(equipment, itemName, curse, character?)` | Apply negative modification (adds to `modifications` array) |
| `upgrade(equipment, itemName, upgrade, character?)` | Improve existing properties (same as enchant, semantic difference) |
| `removeModification(equipment, itemName, modificationId, character?)` | Remove specific modification by ID |
| `disenchant(equipment, itemName, character?)` | Remove all enchantments (keep curses) |
| `liftCurse(equipment, itemName, character?)` | Remove all curses (keep enchantments) |
| `removeAllModifications(equipment, itemName, character?)` | Remove all modifications (both enchantments and curses) |

**Query Methods:**
| Method | Description |
|--------|-------------|
| `getCombinedEffects(equipment, itemName, instanceId?)` | Get all properties from base item + modifications |
| `hasTemplate(equipment, itemName, templateId)` | Check if template is applied |
| `isCursed(equipment, itemName)` | Check if item has any curse modifications |
| `isEnchanted(equipment, itemName)` | Check if item has any enchantment modifications |
| `getAppliedTemplates(equipment, itemName)` | Get list of applied template IDs |
| `getModificationHistory(equipment, itemName)` | Get all modifications in application order |
| `getModificationSources(equipment, itemName)` | Get list of unique modification sources |
| `countModificationsBySource(equipment, itemName)` | Count modifications grouped by source |
| `getItemSummary(equipment, itemName)` | Get item summary with modifications and flags |

**Factory Methods:**
| Method | Description |
|--------|-------------|
| `createModification(id, name, properties, source)` | Create EquipmentModification object |
| `generateModificationId(prefix?)` | Generate unique modification ID (timestamp-based) |

For usage examples, see [EQUIPMENT_SYSTEM.md](../docs/EQUIPMENT_SYSTEM.md#equipment-modification).

### EquipmentSpawnHelper

*Also known as: Loot spawner, equipment batch generator, treasure hoard system*

*Location:* *[src/core/equipment/EquipmentSpawnHelper.ts](src/core/equipment/EquipmentSpawnHelper.ts)*

Batch spawning utilities for equipment. Spawns from lists, by rarity, by tags, randomly, from templates, and treasure hoards.

| Method | Description |
|--------|-------------|
| `spawnFromList(itemNames: string[], rng?: SeededRNG)` | Spawn multiple items from array of names (undefined for missing) |
| `spawnByRarity(rarity, count: number, rng?: SeededRNG)` | Spawn items of specific rarity (common/uncommon/rare/very_rare/legendary) |
| `spawnByTags(tags: string[], count: number, rng?: SeededRNG, options?: SpawnRandomOptions)` | Spawn items with specific tags using weighted selection |
| `spawnRandom(count: number, rng: SeededRNG, options?: SpawnRandomOptions)` | Spawn random equipment respecting spawn weights |
| `spawnFromTemplate(templateId: string, baseItemName?: string)` | Spawn item from template ID (null if not found) |
| `spawnTreasureHoard(cr: number, rng: SeededRNG)` | Spawn treasure hoard based on challenge rating |
| `addToCharacter(character: CharacterSheet, items: EnhancedEquipment[], equip?: boolean)` | Add spawned equipment to character inventory |
| `openBoxForCharacter(character: CharacterSheet, boxName: string, rng: SeededRNG)` | Open a named box in the character's inventory, remove it, add contents — see [BoxOpener](#boxopener) |

For usage examples, see [EQUIPMENT_SYSTEM.md](../docs/EQUIPMENT_SYSTEM.md#batch-spawning).

### BoxOpener

*Also known as: Loot box opener, pack unboxer, drop generator*

*Location:* *[src/core/equipment/BoxOpener.ts](src/core/equipment/BoxOpener.ts)*

Static utility class for opening `type: 'box'` equipment items and generating their contents. Supports guaranteed containers (like adventure packs), probability-based loot boxes, gold drops, quantity parameters for bulk items, and nested boxes (which are added unopened). All results are deterministic when given the same `SeededRNG` seed.

#### Methods

| Method | Description |
|--------|-------------|
| `openBox(box: Equipment, rng: SeededRNG, inventory?: EnhancedInventoryItem[]): BoxOpenResult` | Open a box and generate its contents. If `inventory` provided and box has `openRequirements`, validates requirements first and consumes required items. Returns `success: false` with error if requirements not met. |
| `checkRequirements(box: Equipment, inventory: EnhancedInventoryItem[]): BoxOpenError \| null` | Check if box opening requirements are met. Returns `null` if all requirements satisfied, or `BoxOpenError` with details of first unmet requirement. |
| `canOpen(box: Equipment, inventory: EnhancedInventoryItem[]): boolean` | Simple boolean check for UI use. Returns `true` if box can be opened with given inventory. |
| `getRequirementsDescription(box: Equipment): string \| null` | Get human-readable description of requirements. Returns `null` if no requirements, or string like "Requires: Iron Key" or "Requires: 3 Lockpicks". |
| `isBox(equipment: Equipment): boolean` | Return `true` if the equipment has `type: 'box'` and a `boxContents` property. |
| `previewContents(box: Equipment)` | Preview all possible items, gold range, and requirements without opening. Returns `{ possibleItems: string[], possibleGold: { min, max }, totalDrops: number, openRequirements?: BoxOpenRequirement[] }`. Useful for UI tooltips. |

#### BoxOpenResult

| Property | Type | Description |
|----------|------|-------------|
| `success` | `boolean` | Whether the box was successfully opened. `false` if requirements not met. |
| `items` | `BaseEquipment[]` | All items generated from the box drops (empty if not opened) |
| `gold` | `number` | Total gold awarded from gold-type drops |
| `consumeBox` | `boolean` | Whether the box should be removed from inventory (controlled by `boxContents.consumeOnOpen`) |
| `error` | `BoxOpenError?` | Error details if box could not be opened (requirements not met) |
| `consumedItems` | `{ name: string; quantity: number }[]?` | Items consumed from inventory to open the box (only when requirements exist) |

#### Box Type Interfaces

| Interface | Key Properties | Description |
|-----------|---------------|-------------|
| `BoxDropPool` | `weight`, `itemName?`, `quantity?`, `gold?` | Single entry in a drop pool. Weights in a pool should sum to 100. `itemName` and `gold` are mutually exclusive. |
| `BoxDrop` | `pool: BoxDropPool[]` | One drop slot — exactly one entry from the pool is selected per drop. |
| `BoxContents` | `drops: BoxDrop[]`, `consumeOnOpen?`, `openRequirements?` | Full box configuration. `consumeOnOpen` defaults to `true`. `openRequirements` is an optional array of items that must be consumed to open. |
| `BoxOpenRequirement` | `itemName`, `quantity?` | A single requirement to open a box. `itemName` is the item to consume, `quantity` defaults to 1. Gold requirements use `"Gold Coin"` as itemName. |
| `BoxOpenError` | `code`, `message`, `requirement?` | Error returned when box cannot be opened. `code` is `'MISSING_ITEM'`, `'INSUFFICIENT_QUANTITY'`, or `'NO_BOX_CONTENTS'`. |

**For usage examples (openBox, isBox, previewContents, locked boxes with requirements):** See [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md#boxopener-class)

#### Box Behavior Rules

- **Guaranteed containers**: Pools with a single entry (weight 100) always drop that item.
- **Probability boxes**: Multiple pool entries with different weights — one is selected per drop.
- **Nested boxes**: If a drop resolves to another `type: 'box'` item, it is added to inventory unopened (no recursive opening).
- **Quantity**: `BoxDropPool.quantity` creates multiple copies of the same item in one drop (e.g., `quantity: 10` for Torch adds 10 torch items).
- **Gold drops**: Use `gold` instead of `itemName` in a pool entry for a gold award.
- **Deterministic**: Same seed + same box = same result every time.
- **Opening requirements**: Boxes with `openRequirements` require consuming items from inventory. All requirements must be met (atomic operation). Gold requirements use `"Gold Coin"` as itemName with quantity.

For comprehensive examples and all box definitions, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md#box-equipment-type).

### EquipmentGenerator
*Also known as: Equipment manager, inventory system, gear handler, starting equipment provider*

*Location:* *[src/core/generation/EquipmentGenerator.ts](src/core/generation/EquipmentGenerator.ts)*

Manages equipment assignment, inventory, and equipped items for characters. Supports extensibility through ExtensionManager for custom equipment. All equipment lookups check both default and custom equipment databases.

#### Equipment Initialization

| Method | Description |
|--------|-------------|
| `getStartingEquipment(characterClass: Class)` | Get starting equipment for a class (weapons, armor, items arrays) |
| `initializeEquipment(characterClass: Class)` | Initialize complete equipment with starting gear, auto-equips primary weapon and armor |

#### Inventory Management

| Method | Description |
|--------|-------------|
| `addItem(equipment: CharacterEquipment, itemName: string, quantity?: number)` | Add item to inventory, returns updated equipment state |
| `removeItem(equipment: CharacterEquipment, itemName: string, quantity?: number)` | Remove item from inventory, returns updated equipment state |
| `equipItem(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet)` | Equip item and apply equipment effects to character if provided |
| `unequipItem(equipment: CharacterEquipment, itemName: string, character?: CharacterSheet)` | Unequip item and remove equipment effects from character if provided |
| `getInventoryList(equipment: CharacterEquipment)` | Get flattened array of all inventory items |
| `getEquipmentByType(equipment: CharacterEquipment, type: 'weapons' \| 'armor' \| 'items')` | Get items from specific equipment category |

#### Equipment Modification

| Method | Description |
|--------|-------------|
| `addModification(equipment: CharacterEquipment, itemName: string, modification: EquipmentModification, instanceId?: string, character?: CharacterSheet)` | Add enchantment/curse to item, reapply effects if equipped |
| `removeModification(equipment: CharacterEquipment, itemName: string, modificationId: string, character?: CharacterSheet)` | Remove modification from item, reapply remaining effects if equipped |
| `getActiveEffects(equipment: CharacterEquipment, itemName: string, instanceId?: string)` | Get all active properties from base equipment and modifications |

#### Data Lookup

| Method | Description |
|--------|-------------|
| `getEquipmentDataStatic(itemName: string)` | Get equipment data from extended database (defaults + custom) |

For equipment properties, enchanting, and custom equipment examples, see [EQUIPMENT_SYSTEM.md](../docs/EQUIPMENT_SYSTEM.md).

---

## Enchantment Library

*Location:* *[src/utils/enchantmentLibrary.ts](src/utils/enchantmentLibrary.ts)*

The Enchantment Library provides a comprehensive collection of predefined enchantments and curses that can be applied to equipment at runtime using `EquipmentModifier`. All enchantments are `EquipmentModification` objects designed to be applied via `EquipmentModifier.enchant()` for positive effects or `EquipmentModifier.curse()` for negative curses.

### Available Collections

#### Weapon Enchantments (`WEAPON_ENCHANTMENTS`)

| Property | Description |
|----------|-------------|
| `plusOne` | +1 to attack and damage rolls |
| `plusTwo` | +2 to attack and damage rolls |
| `plusThree` | +3 to attack and damage rolls |
| `flaming` | +1d6 fire damage on hit, sheds bright light |
| `frost` | +1d6 cold damage on hit |
| `shocking` | +1d6 lightning damage on hit |
| `thundering` | +1d6 thunder damage on hit, creates thunderous clap |
| `acidic` | +1d6 acid damage on hit |
| `poison` | +1d6 poison damage on hit |
| `holy` | +1d6 radiant damage on hit |
| `vampiric` | Regain 1d6 HP when dealing damage |
| `vorpalEdge` | Critical hits on 19-20 |
| `keenEdge` | Critical hits on 18-20 |
| `mighty` | Weapon damage dice increased by one step |
| `returning` | Weapon returns to wielder's hand after being thrown |
| `lifestealing` | Regain 2d6 HP when dealing damage |

#### Armor Enchantments (`ARMOR_ENCHANTMENTS`)

| Property | Description |
|----------|-------------|
| `plusOne` | +1 Armor Class |
| `plusTwo` | +2 Armor Class |

#### Resistance Enchantments (`RESISTANCE_ENCHANTMENTS`)

| Property | Description |
|----------|-------------|
| `fire` | Resistance to fire damage |
| `cold` | Resistance to cold damage |
| `lightning` | Resistance to lightning damage |
| `acid` | Resistance to acid damage |
| `poison` | Resistance to poison damage |
| `necrotic` | Resistance to necrotic damage |
| `radiant` | Resistance to radiant damage |
| `thunder` | Resistance to thunder damage |
| `all` | Resistance to all damage types |

#### Curses (`CURSES`)

| Property | Description |
|----------|-------------|
| `minusOne` | -1 penalty to attack and damage rolls |
| `minusTwo` | -2 penalty to attack and damage rolls |
| `weakness` | -4 Strength while equipped |
| `feeblemind` | -4 Intelligence while equipped |
| `clumsiness` | -4 Dexterity while equipped |
| `frailty` | -4 Constitution while equipped |
| `foolishness` | -4 Wisdom while equipped |
| `repulsiveness` | -4 Charisma while equipped |
| `fireVulnerability` | Vulnerability to fire damage (double damage) |
| `coldVulnerability` | Vulnerability to cold damage (double damage) |
| `lifesteal` | Wielder takes 1d4 necrotic damage when dealing damage |
| `attunement` | Once equipped, cannot be removed unless targeted by remove curse |
| `berserker` | Must attack each round or take disadvantage on all attacks, +1 to attack/damage |
| `heavyBurden` | Equipment weight is doubled, -5 walking speed |
| `lightSensitivity` | Disadvantage on attacks and perception in bright light |
| `invisibility` | Invisible while equipped, but disadvantage on attacks |
| `hallucinations` | 25% chance each round to see enemies as allies and vice versa |
| `bloodMoney` | Wielder takes 1d4 damage when dealing damage to enemies |

#### Combo Enchantments (`ALL_ENCHANTMENTS`)

Special multi-effect enchantments:

| Property | Description |
|----------|-------------|
| `holyAvenger` | +3 enhancement, +2d6 radiant vs fiends/undead, +5 saves vs spells |
| `dragonSlayer` | +2 enhancement, +3d6 damage vs dragons, fire resistance |
| `demonHunter` | +1 enhancement, +2d6 damage vs fiends |
| `undeadBane` | +1 enhancement, +2d6 radiant damage vs undead |

### Stat Boosting Enchantments

Functions that create stat-boosting enchantments with configurable bonus levels (1-4):

| Function | Parameter | Returns | Description |
|----------|-----------|---------|-------------|
| `createStrengthEnchantment` | `bonus: 1 \| 2 \| 3 \| 4` | `EquipmentModification` | Enchantment adding +bonus to STR |
| `createDexterityEnchantment` | `bonus: 1 \| 2 \| 3 \| 4` | `EquipmentModification` | Enchantment adding +bonus to DEX |
| `createConstitutionEnchantment` | `bonus: 1 \| 2 \| 3 \| 4` | `EquipmentModification` | Enchantment adding +bonus to CON |
| `createIntelligenceEnchantment` | `bonus: 1 \| 2 \| 3 \| 4` | `EquipmentModification` | Enchantment adding +bonus to INT |
| `createWisdomEnchantment` | `bonus: 1 \| 2 \| 3 \| 4` | `EquipmentModification` | Enchantment adding +bonus to WIS |
| `createCharismaEnchantment` | `bonus: 1 \| 2 \| 3 \| 4` | `EquipmentModification` | Enchantment adding +bonus to CHA |

**For usage examples:** See [docs/EQUIPMENT_SYSTEM.md#creating-stat-boosting-enchantments](docs/EQUIPMENT_SYSTEM.md#creating-stat-boosting-enchantments)

### Query Functions

| Function | Parameter | Returns | Description |
|----------|-----------|---------|-------------|
| `getEnchantment` | `id: string` | `EquipmentModification \| undefined` | Get a specific enchantment by its ID |
| `getCurse` | `id: string` | `EquipmentModification \| undefined` | Get a specific curse by its ID |
| `getAllEnchantments` | - | `EquipmentModification[]` | Get all enchantments (weapons, armor, resistances, combo) |
| `getAllCurses` | - | `EquipmentModification[]` | Get all curses |
| `getEnchantmentsByType` | `type: 'weapon' \| 'armor' \| 'resistance' \| 'combo'` | `EquipmentModification[]` | Get enchantments filtered by type |

**For usage examples (applying enchantments, curses, stat boosts):** See [docs/EQUIPMENT_SYSTEM.md#applying-enchantments](docs/EQUIPMENT_SYSTEM.md#applying-enchantments)

---

## Magic Items and Equipment Templates

*Location:* *[src/utils/equipmentConstants.ts](src/utils/equipmentConstants.ts)*

The equipment library provides a comprehensive collection of 34 pre-built magic items and 9 item creation templates that demonstrate all capabilities of the Advanced Equipment System. These examples serve as both reference implementations and test fixtures for the equipment system.

### Available Collections

#### Magic Items (`MAGIC_ITEMS`)

**Weapons (4 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Flame Tongue` | Rare | +1d6 fire damage on hit, sheds bright light, grants Ignition feature |
| `Vorpal Sword` | Legendary | +3 to attack/damage, decapitation on natural 20 |
| `Frost Brand` | Rare | +1d6 cold damage on hit, fire resistance, extinguish flames |
| `Dragonslayer Longsword` | Very Rare | +1 to attack/damage, +2d6 vs dragons |

**Armor (3 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Mithral Shirt` | Uncommon | AC 12 + DEX (max 2), counts as light armor |
| `+1 Plate Armor` | Rare | Fixed AC 19, stealth disadvantage |
| `Elven Chain` | Rare | AC 16, counts as light, no proficiency required |

**Wondrous Items - Stat Bonuses (3 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Belt of Giant Strength (Hill Giant)` | Rare | Strength becomes 21 |
| `Amulet of Proof Against Detection` | Uncommon | Hidden from divination, +1 saves vs spells |
| `Headband of Intellect` | Uncommon | Intelligence becomes 19 |

**Wondrous Items - Skill Proficiencies (2 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Boots of Elvenkind` | Uncommon | Stealth expertise, silent steps |
| `Gloves of Thievery` | Uncommon | Thieves' tools expertise, Sleight of Hand proficient |

**Wondrous Items - Movement (3 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Boots of Speed` | Rare | +10 speed, grants Freedom of Movement & Haste features |
| `Boots of Striding and Springing` | Uncommon | +10 speed, triple jump distance |
| `Boots of Flying` | Rare | Fly 60ft, grants Flight feature |

**Wondrous Items - Defense (3 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Ring of Protection` | Rare | +1 AC and saves (stackable) |
| `Amulet of Proof Against Poison` | Uncommon | Poison immunity and condition immunity |
| `Cloak of Protection` | Uncommon | +1 AC and saves (stackable) |

**Wondrous Items - Vision (2 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Goggles of Night` | Uncommon | Darkvision 60ft |
| `Lantern of Revealing` | Uncommon | Reveals invisible creatures, sheds light |

**Spell-Granting Items (3 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Ring of Spell Storing` | Rare | Store up to 5 spell levels |
| `Pearl of Power (3rd Level)` | Uncommon | Recover one 3rd level spell slot per day |
| `Wand of Magic Missiles` | Uncommon | 7 charges of Magic Missile |

**Cursed Items (3 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `-1 Cursed Sword` | Rare | -1 to attack/damage, attunement curse |
| `Belt of Strength Drain (Cursed)` | Uncommon | -4 Strength, appears as Belt of Giant Strength |
| `Helmet of Opposite Alignment (Cursed)` | Rare | Changes alignment to opposite |

**Conditional Items (4 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Moon Sickle` | Rare | +1 attack/damage, +1d6 radiant at night |
| `Sun Blade` | Rare | +2 attack/damage, +1d8 radiant in daylight, -1 at night |
| `Dwarf-Forged Armor` | Rare | AC 15 + DEX, +2 AC and +1 saves for dwarves |
| `Wizard's Staff` | Uncommon | +1 spell attack and save DC for wizards |

**Template-Based Items (2 items)**
| Item | Rarity | Description |
|------|--------|-------------|
| `Flaming Longsword` | Rare | Uses `flaming_weapon_template` |
| `Frost Longsword` | Rare | Uses `frost_weapon_template` |

#### Magic Equipment Templates (`MAGIC_EQUIPMENT_TEMPLATES`)

Templates that can be applied to base equipment to create magic variants:

| Template ID | Type | Description |
|-------------|------|-------------|
| `plus_one_weapon` | Weapon | +1 to attack and damage rolls |
| `plus_two_weapon` | Weapon | +2 to attack and damage rolls |
| `plus_three_weapon` | Weapon | +3 to attack and damage rolls |
| `flaming_weapon_template` | Weapon | +1d6 fire damage, sheds light |
| `frost_weapon_template` | Weapon | +1d6 cold damage |
| `shocking_weapon_template` | Weapon | +1d6 lightning damage |
| `vicious_weapon_template` | Weapon | +1 attack/damage, +1d8 extra damage (self-damage) |
| `plus_one_armor` | Armor | +1 AC bonus |
| `plus_two_armor` | Armor | +2 AC bonus |

### Query Functions

| Function | Parameter | Returns | Description |
|----------|-----------|---------|-------------|
| `getMagicItem` | `name: string` | `EnhancedEquipment \| undefined` | Get a specific magic item by name |
| `getMagicItemsByType` | `type: 'weapon' \| 'armor' \| 'item'` | `EnhancedEquipment[]` | Get all magic items of a specific type |
| `getMagicItemsByRarity` | `rarity: 'common' \| 'uncommon' \| 'rare' \| 'very_rare' \| 'legendary'` | `EnhancedEquipment[]` | Get all magic items of a specific rarity |
| `getCursedItems` | — | `EnhancedEquipment[]` | Get all cursed items (items with 'cursed' tag) |
| `getItemsWithProperty` | `propertyType: string` | `EnhancedEquipment[]` | Get all items with a specific property type |
| `applyTemplate` | `baseEquipment: EnhancedEquipment, templateId: string` | `EnhancedEquipment \| null` | Apply a template to base equipment, returns enhanced item or null if template not found |

**For usage examples (querying items, applying templates, registration with ExtensionManager):** See [docs/EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md#magic-items-and-templates)

---

## Extensibility System

*Location:* *[src/core/extensions/](src/core/extensions/)*

**For comprehensive extensibility documentation, see [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)**

The extensibility system allows runtime customization of ALL procedural generation lists with spawn rate control.

### Quick Reference

**Supported Categories:**

| Category | Description |
|----------|-------------|
| `equipment` | Weapons, armor, items |
| `equipment.templates` | Complete equipment templates |
| `spells` | Arcane and divine magic |
| `races` | Character races |
| `classes` | Character classes |
| `classFeatures` | Class abilities |
| `racialTraits` | Racial abilities |
| `skills` | Character skills |
| `skillLists` | Per-class skill selections |
| `appearance.*` | Body types, skin tones, hair, eyes, facial features |

### ExtensionManager

*Also known as: Content registry, customization manager, spawn rate controller, mod registration system*

*Location:* *[src/core/extensions/ExtensionManager.ts](src/core/extensions/ExtensionManager.ts)*

Singleton registry for managing runtime customization of procedural generation lists with spawn rate control.

**For usage examples and detailed guides:** See [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)

---

**Types:**

| Type | Description |
|------|-------------|
| `ExtensionCategory` | All extensible category names (equipment, spells, races, classes, skills, appearance, etc.) |
| `ImageSupportedCategory` | Categories that support icon/image fields: `spells`, `skills`, `classFeatures`, `racialTraits`, `equipment`, `races.data`, `classes.data` |
| `SpawnMode` | Spawn mode: `'relative'` | `'absolute'` | `'default'` | `'replace'` |
| `ExtensionOptions` | Registration options: mode, weights, validate |
| `ImageOverride` | Image patch: identifier, icon, image, appliedAt |
| `RegistrationEntry` | Batch registration: category, items, options |
| `ValidationResult` | Validation result: valid, errors, warnings |

---

**Method Reference:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getInstance()` | `ExtensionManager` | Returns singleton instance |
| `register(category, items, options?)` | `void` | Register items for a category with optional weights/mode |
| `registerMultiple(registrations[])` | `void` | Register multiple categories in a single call |
| `get(category)` | `any[]` | Get combined defaults + custom items |
| `getDefaults(category)` | `any[]` | Get default items only |
| `getCustom(category)` | `any[]` | Get custom items only |
| `setWeights(category, weights)` | `void` | Set spawn weights for items |
| `getWeights(category)` | `Record<string, number>` | Get current weights |
| `getDefaultWeights(category)` | `Record<string, number>` | Get default weights only |
| `setMode(category, mode)` | `void` | Set spawn mode for category |
| `getMode(category)` | `SpawnMode` | Get current spawn mode |
| `hasCustomData(category)` | `boolean` | Check if category has custom data |
| `getInfo(category?)` | `Record<string, any>` | Get detailed info about one or all categories |
| `getRegisteredCategories()` | `ExtensionCategory[]` | List all categories with custom data |
| `reset(category)` | `void` | Reset category to defaults |
| `resetAll()` | `void` | Reset all categories to defaults |
| `validate(category, items)` | `ValidationResult` | Validate items against category schema |
| `exportCustomData()` | `Record<string, any>` | Export all custom data |
| `exportCustomDataForCategory(category)` | `any[]` | Export custom data for single category |
| `batchAddIcons(category, iconMap, identifierKey?)` | `number` | Add icons to items matching names/IDs. Returns count updated. Validates URLs first. |
| `batchAddImages(category, imageMap, identifierKey?)` | `number` | Add images to items matching names/IDs. Returns count updated. Validates URLs first. |
| `batchUpdateImages(category, predicate, updates)` | `number` | Update icon/image on all items matching predicate. Returns count updated. |
| `batchByCategory(category, property, valueToImageMap)` | `number` | Add icons/images by property value (e.g., school, rarity). Returns count updated. |
| `getImageOverrides()` | `Map<ImageSupportedCategory, ImageOverride[]>` | Get all image overrides for all categories. |
| `getImageOverridesForCategory(category)` | `ImageOverride[]` | Get image overrides for a specific category. |
| `restoreImageOverrides(category, overrides)` | `void` | Restore saved image overrides (for persistence). |
| `clearImageOverrides(category)` | `void` | Clear all image overrides for a category. |
| `clearAllImageOverrides()` | `void` | Clear all image overrides for all categories. |

---

**Spawn Modes:**

| Mode | Behavior | Use Case |
|------|----------|----------|
| `relative` | Custom items added to default pool with custom weights | Add custom items to existing pool |
| `absolute` | Only custom items can spawn (ignore defaults) | Themed content packs, complete replacement |
| `default` | All items (default + custom) have equal weight | Disable custom spawn weights |
| `replace` | Clear previous custom data before registering new items | Hot-reload content packs during development |

**Image Supported Categories:**

The following categories support `icon` and `image` fields for batch operations:

| Category | Entity Type | Identifier Key |
|----------|-------------|----------------|
| `spells` | Spell | `name` or `id` |
| `skills` | CustomSkill | `id` |
| `classFeatures` | ClassFeature | `id` |
| `racialTraits` | RacialTrait | `id` |
| `equipment` | EnhancedEquipment | `name` |
| `races.data` | RaceDataEntry | `name` (race name) |
| `classes.data` | ClassDataEntry | `name` (class name) |

**For batch image usage examples (batchAddIcons, batchUpdateImages, batchByCategory):** See [docs/EXTENSIBILITY_GUIDE.md#batch-image-operations](docs/EXTENSIBILITY_GUIDE.md#batch-image-operations)

### FeatureQuery

*Also known as: Feature registry, class feature system, racial trait system*

*Location:* *[src/core/features/FeatureQuery.ts](src/core/features/FeatureQuery.ts)*

Query and validation layer for class features and racial traits stored in ExtensionManager.

**For usage examples and detailed guides:** See [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)

---

**Types:**

| Type | Location | Description |
|------|----------|-------------|
| `ClassFeature` | `src/core/features/FeatureQuery.ts` | Class feature with id, name, description, type, class, level, prerequisites, effects, source, tags, lore, icon, image |
| `RacialTrait` | `src/core/features/FeatureQuery.ts` | Racial trait with id, name, description, race, optional subrace, prerequisites, effects, source, tags, lore, icon, image |
| `FeatureType` | `src/core/types/Character.ts` | Feature type: `'passive'` | `'active'` | `'resource'` | `'trigger'` |
| `FeatureEffectType` | `src/core/types/Character.ts` | Effect type: `'stat_bonus'` | `'skill_proficiency'` | `'ability_unlock'` | `'passive_modifier'` | `'resource_grant'` | `'spell_slot_bonus'` |
| `FeatureEffect` | `src/core/types/Character.ts` | Feature effect with type, target, value, optional condition, description |
| `FeaturePrerequisite` | `src/core/types/Character.ts` | Prerequisite with level, abilities, class, race, subrace, features, skills, spells, custom |
| `ValidationResult` | `src/core/features/FeatureValidator.ts` | Validation result with valid, errors, unmet |
| `CharacterFeature` | `src/core/types/Character.ts` | Stored feature on character with featureId, name, gainedAtLevel, source, state, choices |
| `CharacterTrait` | `src/core/types/Character.ts` | Stored trait on character with traitId, name, source |

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getInstance()` | - | `FeatureQuery` | Returns singleton instance |
| `getClassFeatures()` | `class`, `level?` | `ClassFeature[]` | Get all features for class (filtered by level, reads from ExtensionManager with caching) |
| `getClassFeaturesForLevel()` | `class`, `level` | `ClassFeature[]` | Get features for specific class level (reads from ExtensionManager with caching) |
| `getClassFeatureById()` | `featureId` | `ClassFeature \| undefined` | Find feature by ID |
| `getAllClassFeatures()` | - | `Map<string, ClassFeature[]>` | Get all class features by class (builds index from EM data with caching) |
| `getRacialTraits()` | `race` | `RacialTrait[]` | Get traits for race (reads from ExtensionManager with caching) |
| `getRacialTraitsForSubrace()` | `race`, `subrace` | `RacialTrait[]` | Get base + subrace-specific traits (reads from ExtensionManager with caching) |
| `getBaseRacialTraits()` | `race` | `RacialTrait[]` | Get only base traits (no subrace, reads from ExtensionManager with caching) |
| `getSubraceTraits()` | `race`, `subrace` | `RacialTrait[]` | Get only subrace-specific traits (reads from ExtensionManager with caching) |
| `getAvailableSubraces()` | `race` | `string[]` | Get sorted list of available subraces (checks RACE_DATA, derives from EM data) |
| `getRacialTraitById()` | `traitId` | `RacialTrait \| undefined` | Find trait by ID |
| `getAllRacialTraits()` | - | `Map<string, RacialTrait[]>` | Get all racial traits by race (builds index from EM data with caching) |
| `validatePrerequisites()` | `feature`, `character` | `ValidationResult` | Validate any feature/trait prerequisites (delegates to FeatureValidator) |
| `validateFeaturePrerequisites()` | `feature`, `character` | `ValidationResult` | Validate class feature prerequisites (delegates to FeatureValidator) |
| `validateTraitPrerequisites()` | `trait`, `character` | `ValidationResult` | Validate racial trait prerequisites (delegates to FeatureValidator) |
| `canGainFeature()` | `feature`, `character` | `boolean` | Check if character can gain feature |
| `getRegisteredClasses()` | - | `Class[]` | Get all classes with features |
| `getRegisteredRaces()` | - | `Race[]` | Get all races with traits |
| `getQueryStats()` | - | `{ totalClassFeatures, totalRacialTraits, classesWithFeatures, racesWithTraits }` | Get registry statistics (computed from ExtensionManager data) |
| `exportRacialTraits()` | - | `Record<string, RacialTrait[]>` | Export racial traits (reads from ExtensionManager; for class features, use ExtensionManager.get('classFeatures')) |
| `getEquipmentFeatures()` | `equipmentName` | `ClassFeature[]` | Get features that can be granted by equipment (static) |
| `isValidEquipmentFeature()` | `featureId` | `boolean` | Check if feature can be granted by equipment (static) |

---

### FeatureValidator

*Also known as: Feature validation system, class feature validator, racial trait validator*

*Location:* *[src/core/features/FeatureValidator.ts](src/core/features/FeatureValidator.ts)*

Utility class for validating class features and racial traits against strict schemas. All methods are static.

**For detailed validation rules and runtime behavior:** See [docs/PREREQUISITES.md#validation-system](docs/PREREQUISITES.md#validation-system)

---

**Types:**

| Type | Location | Description |
|------|----------|-------------|
| `ValidationResult` | `src/core/features/FeatureValidator.ts` | Validation result with `valid: boolean` and `errors: string[]` |

---

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `validateClassFeature()` | `feature: unknown` | `ValidationResult` | Validate class feature schema (id, name, description, type, class, level, source, prerequisites, effects) |
| `validateRacialTrait()` | `trait: unknown` | `ValidationResult` | Validate racial trait schema (id, name, description, race, source, subrace, prerequisites, effects) |
| `validateClassFeatures()` | `features: unknown[]` | `ValidationResult` | Validate array of class features with index-based error reporting |
| `validateRacialTraits()` | `traits: unknown[]` | `ValidationResult` | Validate array of racial traits with index-based error reporting |
| `validateEffect()` | `effect: unknown` | `ValidationResult` | Validate feature effect (type, target, value, condition) |
| `validatePrerequisites()` | `prerequisites: unknown` | `ValidationResult` | Validate prerequisite object (level, abilities, class, race, subrace, features, skills, spells) |

---

### WeightedSelector

*Location:* *[src/core/extensions/WeightedSelector.ts](src/core/extensions/WeightedSelector.ts)*

Utility class for weighted random selection supporting different spawn modes for probability calculation.

#### Types

| Type | Description |
|------|-------------|
| `SelectionMode` | Spawn mode: `'relative'` \| `'absolute'` \| `'default'` \| `'replace'` |
| `SeededRNG` | RNG interface with `next()` method and `seed` property |
| `WeightedSelectionOptions` | Options: `mode`, `allowDuplicates`, `fallbackToEqualWeights` |

#### Method Reference

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `select()` | `items`, `weights`, `rng`, `mode?` | `T \| null` | Select single item using weighted random |
| `selectMultiple()` | `items`, `weights`, `rng`, `count`, `mode?` | `T[]` | Select multiple items using weighted random |
| `getProbabilities()` | `items`, `weights`, `mode?` | `Record<string, number>` | Calculate probability for each item (0-1) |
| `normalizeWeights()` | `weights`, `mode` | `Record<string, number>` | Normalize weights to sum to 1.0 |
| `getItemKey()` | `item` | `string` | Extract unique key from item for weight lookup |

**Selection Modes:**

| Mode | Behavior | Weight Calculation |
|------|----------|-------------------|
| `relative` | Items without explicit weight use weight of 1.0 | Explicit weights respected, others default to 1.0 |
| `absolute` | Only items with explicit weights can be selected | Items without weight have 0.0 probability |
| `default` | All items have equal weight regardless of explicit weights | All items get weight of 1.0 |

---

### SkillQuery

*Location:* *[src/core/skills/SkillQuery.ts](src/core/skills/SkillQuery.ts)*

*Also known as: Skill registry, custom skill system, proficiency manager*

Query and validation layer for character skills stored in ExtensionManager.

**For comprehensive guide, examples, and best practices:** See [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)

#### Types

| Type | Description | Location |
|------|-------------|----------|
| `CustomSkill` | Registered skill with ID, name, ability, source, prerequisites, icon, image | [src/core/skills/SkillQuery.ts](src/core/skills/SkillQuery.ts) |
| `SkillPrerequisite` | Prerequisites for skills (level, abilities, class, race, skills, features, spells) | [src/core/skills/SkillQuery.ts](src/core/skills/SkillQuery.ts) |
| `SkillValidationResult` | Validation result with valid flag and errors array | [src/core/skills/SkillValidator.ts](src/core/skills/SkillValidator.ts) |
| `SkillQueryStats` | Statistics about registered skills (totals, by ability, categories) | [src/core/skills/SkillQuery.ts](src/core/skills/SkillQuery.ts) |
| `SkillProficiency` | Character skill proficiency with level and source | [src/core/types/Character.ts](src/core/types/Character.ts) |
| `SkillListDefinition` | Class skill list with count, available skills, selection weights, and expertise settings. Register via `manager.register('skillLists', [...])` to control skill selection weights per class | [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts) |
| `SkillSelectionWeights` | Weighted skill selection with spawn mode (`'relative'`, `'absolute'`, `'default'`) and skill weight multipliers. Higher weight = more likely to be selected. Weight of 0 excludes skill from selection | [src/core/skills/SkillTypes.ts](src/core/skills/SkillTypes.ts) |

#### Method Reference

| Method | Description |
|--------|-------------|
| `getInstance()` | Returns singleton instance |
| `getSkill(id)` | Get skill by ID |
| `getAllSkills()` | Get all registered skills (reads from ExtensionManager with caching) |
| `getSkillsByAbility(ability)` | Get skills for specific ability (builds index from EM data with caching) |
| `getSkillsByCategory(category)` | Get skills in a specific category (builds index from EM data with caching) |
| `getCategories()` | Get all categories in use (derived from EM data) |
| `getSkillsBySource(source)` | Get skills by source (default or custom) |
| `getAvailableSkills(character)` | Get skills character can learn (prerequisites met) |
| `validatePrerequisites(skill, character)` | Validate skill prerequisites (delegates to SkillValidator) |
| `validateSkill(skill)` | Validate skill data structure (delegates to SkillValidator) |
| `isValidSkill(id)` | Check if skill ID exists in registry |
| `getSkillCount()` | Get total skill count |
| `getQueryStats()` | Get statistics about registered skills |

---

### SkillValidator

*Location:* *[src/core/skills/SkillValidator.ts](src/core/skills/SkillValidator.ts)*

*Also known as: Skill validation system, proficiency validator*

Utility class for validating custom skills, skill proficiencies, and skill list definitions. All methods are static.

#### Method Reference

| Method | Description |
|--------|-------------|
| `validateSkill(skill: unknown)` | Validate skill schema including required fields, ID format, ability, source |
| `validateSkills(skills: unknown[])` | Validate multiple skills with index-based error reporting |
| `validateSkillProficiency(proficiency: unknown)` | Validate skill proficiency (skillId, level, source) |
| `validateSkillProficiencies(proficiencies: unknown[])` | Validate array of skill proficiencies |
| `validateSkillListDefinition(skillList: unknown)` | Validate class skill list (class, skillCount, availableSkills, expertiseCount) |
| `validateSkillPrerequisites(prerequisites, character)` | Validate prerequisites against character |
| `isValidAbility(ability: string)` | Check if valid ability score (STR, DEX, CON, INT, WIS, CHA) |
| `isValidSkillId(id: string)` | Check if skill ID follows lowercase_with_underscores format |

**Note:** For detailed prerequisite validation rules, see [docs/PREREQUISITES.md](docs/PREREQUISITES.md).

---

### Skill Prerequisites

**For comprehensive guide, examples, and best practices:** See [docs/PREREQUISITES.md](docs/PREREQUISITES.md)

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

**Validation:**
- `SkillValidator.validateSkillPrerequisites(skill, character)` - Validate prerequisites against character
- `SkillQuery.validatePrerequisites(skill, character)` - Validate via registry

---

### SpellQuery

*Location:* *[src/core/spells/SpellQuery.ts](src/core/spells/SpellQuery.ts)*

*Also known as: Spell registry, magic system, spellcaster manager*

Query and validation layer for spells stored in ExtensionManager.

**For comprehensive guide, examples, and best practices:** See [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)

#### Types

| Type | Description | Location |
|------|-------------|----------|
| `RegisteredSpell` | Registered spell with ID, name, level, school, source, prerequisites, icon, image | [src/core/spells/SpellQuery.ts](src/core/spells/SpellQuery.ts) |
| `Spell` | Base spell interface with name, level, school, properties | [src/core/spells/SpellTypes.ts](src/core/spells/SpellTypes.ts) |
| `SpellPrerequisite` | Prerequisites for spells (level, abilities, class, features, spells, skills) | [src/core/spells/SpellTypes.ts](src/core/spells/SpellTypes.ts) |
| `ValidationResult` | Validation result with valid flag, errors, and warnings | [src/core/spells/SpellValidator.ts](src/core/spells/SpellValidator.ts) |
| `SpellSchool` | Magic schools: Abjuration, Conjuration, Divination, Enchantment, Evocation, Illusion, Necromancy, Transmutation | [src/core/spells/SpellTypes.ts](src/core/spells/SpellTypes.ts) |

#### Method Reference

| Method | Description |
|--------|-------------|
| `getInstance()` | Returns singleton instance |
| `getSpell(spellId)` | Get spell by ID |
| `getSpells()` | Get all spells (reads from ExtensionManager with caching) |
| `getSpellsByLevel(level)` | Get spells of specific level 0-9 (queries ExtensionManager, builds index with caching) |
| `getSpellsBySchool(school)` | Get spells of specific school (queries ExtensionManager, builds index with caching) |
| `getSpellsForClass(class)` | Get spells available to a class (filters by classes property) |
| `getAvailableSpells(character)` | Get spells character can learn (prerequisites met) |
| `getSpellsBySource(source)` | Get spells by source (default or custom) |
| `getClassSpellList(class)` | Get spell list for a class (reads from ExtensionManager) |
| `getSpellSlotsForClass(class, level)` | Get spell slots for class/level (delegates to constants helper) |
| `validatePrerequisites(spell, character)` | Validate spell prerequisites (delegates to SpellValidator) |
| `validateSpell(spell)` | Validate spell schema (delegates to SpellValidator) |
| `hasSpell(spellId)` | Check if spell exists |
| `getSpellCount()` | Get total spell count |
| `getQueryStats()` | Get registry statistics (total, by source, by level, by school) |

---

### SpellValidator

*Location:* *[src/core/spells/SpellValidator.ts](src/core/spells/SpellValidator.ts)*

*Also known as: Spell validation system, magic validator*

Utility class for validating spells and their prerequisites. All methods are static.

#### Method Reference

| Method | Description |
|--------|-------------|
| `validateSpell(spell: unknown)` | Validate spell schema including prerequisites |
| `validateSpells(spells: unknown[])` | Validate array of spells |
| `validatePrerequisites(prerequisites: unknown)` | Validate prerequisite object structure |
| `validateSpellPrerequisites(prerequisites, character)` | Validate prerequisites against character |
| `isValidAbility(ability: string)` | Check if valid ability score |
| `isValidSchool(school: string)` | Check if valid spell school |
| `isValidSpellLevel(level: number)` | Check if valid spell level (0-9) |

**Note:** For detailed prerequisite validation rules, see [docs/PREREQUISITES.md](docs/PREREQUISITES.md).

---

### Spell Prerequisites

**For comprehensive guide, examples, and best practices:** See [docs/PREREQUISITES.md](docs/PREREQUISITES.md)

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

**Validation:**
- `SpellValidator.validateSpellPrerequisites(prerequisites, character)` - Validate prerequisites against character
- `SpellValidator.validateSpell(spell)` - Validate spell schema including prerequisites

---

### Custom Races

**For comprehensive guide, examples, and best practices:** See [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)

The engine supports custom races through the ExtensionManager. Custom races can define ability score bonuses, speed, traits, and available subraces.

#### API Interfaces

*Location:* *[src/utils/constants.ts](src/utils/constants.ts)*

**RaceDataEntry** - Complete interface definition: [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md#racedataentry-interface)

| Property | Type | Description |
|----------|------|-------------|
| `ability_bonuses` | `Partial<Record<Ability, number>>` | Ability score bonuses (e.g., `{ STR: 2, DEX: 1 }`) |
| `speed` | number | Base speed in feet |
| `traits` | string[] | Array of trait IDs for this race |
| `subraces?` | string[] | Optional: Available subraces for this race |

**Helper Functions:**
- `getRaceData(race: string)` - Get race data from default or custom races

---

### Subrace Support

**For comprehensive guide, examples, and best practices:** See [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)

Characters can have a subrace property (e.g., 'High Elf', 'Hill Dwarf'). Subraces allow for more granular racial trait assignment and prerequisite validation.

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `CharacterSheet` | [src/core/types/Character.ts](src/core/types/Character.ts) | Has optional `subrace?: string` property |
| `FeaturePrerequisite` | [src/core/types/Character.ts](src/core/types/Character.ts) | Can include `subrace?: string` requirement |
| `RacialTrait` | [src/core/features/FeatureQuery.ts](src/core/features/FeatureQuery.ts) | Optional `subrace?: string` for subrace-specific traits |

**FeatureQuery Methods:**
- `getRacialTraitsForSubrace(race, subrace)` - Get traits for specific subrace
- `validatePrerequisites(feature, character)` - Validates subrace requirements

---

### Custom Classes

**For comprehensive guide, examples, and best practices:** See [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)

The engine supports template-based custom classes through the ExtensionManager. Custom classes can extend existing D&D 5e base classes or be defined from scratch.

#### API Interfaces

*Location:* *[src/utils/constants.ts](src/utils/constants.ts)*

**ClassDataEntry** - Complete interface definition with JSDoc comments: [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md#classdataentry-interface)

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Class name |
| `primary_ability` | Ability | Primary ability score |
| `hit_die` | number | Hit die size (e.g., 10 for d10) |
| `saving_throws` | Ability[] | Saving throw proficiencies |
| `is_spellcaster` | boolean | Whether class can cast spells |
| `skill_count` | number | Number of skills to choose |
| `available_skills` | string[] | Available skills for this class |
| `has_expertise` | boolean | Whether class has expertise |
| `expertise_count?` | number | Number of expertise choices |
| `baseClass?` | Class | For template-based classes: base class to inherit from |
| `audio_preferences?` | object | Audio trait preferences for class affinity |

**Helper Functions:**
- `getClassData(className: string)` - Get class data from default or custom classes
- `getClassSpellList(className: string)` - Get spell list for class
- `getSpellSlotsForClass(className: string, level: number)` - Get spell slots for class

---
## Style Guide

Documentation Style Guide for DATA_ENGINE_REFERENCE.md: This API reference prioritizes efficiency over exhaustiveness by organizing content into navigable sections (Quick Export Reference → Data Types → Core Modules → Specialized Systems). Key conventions: (1) Location links using italicized [src/path/file.ts](src/path/file.ts) format for all major definitions; (2) "Also known as" aliases in italics for discoverability under alternate search terms; (3) Structured tables for properties, methods, and options rather than copying raw TypeScript interfaces; (4) Cross-references to related docs (SPEC.md, USAGE_IN_OTHER_PROJECTS.md, specialized guides) rather than duplicating content; (5) Method reference tables with "Returns" and "Description" columns for APIs; (6) Type descriptions focus on purpose and key properties rather than full interface definitions—readers can click the location link for complete source; (7) No code examples or implementation code blocks—usage examples belong in USAGE_IN_OTHER_PROJECTS.md, algorithm details belong in specialized guides like AUDIO_ANALYSIS.md. The goal is a scannable reference that directs readers to source files for complete implementations while providing sufficient context for most queries.

---

## Cross-References

- For quick overview, see [specs/001-core-engine/SPEC.md](specs/001-core-engine/SPEC.md)
- For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)
- For equipment system guide, see [docs/EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)
- For prerequisites guide, see [docs/PREREQUISITES.md](docs/PREREQUISITES.md)
- For custom content guide, see [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)
- For extensibility guide, see [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)
- For XP and stat system guide, see [docs/XP_AND_STATS.md](docs/XP_AND_STATS.md)
- For combat system guide, see [docs/COMBAT_SYSTEM.md](docs/COMBAT_SYSTEM.md)
- For IRL sensors guide, see [docs/IRL_SENSORS.md](docs/IRL_SENSORS.md)
- For rolls and seeds guide, see [docs/ROLLS_AND_SEEDS.md](docs/ROLLS_AND_SEEDS.md)
