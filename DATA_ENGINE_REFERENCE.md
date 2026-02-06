# Data Engine Reference

Complete API reference for the Playlist Data Engine. Contains all type definitions, class constructors, and method signatures.

**For quick overview, see [spec.md](specs/001-core-engine/spec.md)**
**For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)**

## Table of Contents

1. [Quick Export Reference](#quick-export-reference)
2. [Data Types](#data-types)
3. [Core Modules](#core-modules)
4. [Progression System](#progression-system)
5. [Configuration](#configuration)
6. [Environmental Sensors](#environmental-sensors)
7. [Gaming Integration](#gaming-integration)
8. [Combat System](#combat-system)
9. [Equipment System](#equipment-system)
   - [Equipment Types](#equipment-types)
   - [Equipment Properties](#equipment-properties)
   - [Equipment Effects](#equipment-effects)
   - [Equipment Generator](#equipment-generator)
   - [Equipment Modifier](#equipment-modifier)
   - [Equipment Spawn Helper](#equipment-spawn-helper)
10. [Extensibility System](#extensibility-system)
    - [ExtensionManager](#extensionmanager)
    - [FeatureQuery](#featurequery)
    - [SkillQuery](#skillquery)
    - [SpellQuery](#spellquery)
    - [Per-Category Spawn Rate System](#per-category-spawn-rate-system)
    - [WeightedSelector](#weightedselector)
    - [CharacterGenerator Extensions](#charactergenerator-extensions)
    - [Validation System](#validation-system)
    - [Advanced Patterns](#advanced-patterns)
    - [Skill Prerequisites](#skill-prerequisites)
    - [Spell Prerequisites](#spell-prerequisites)
    - [Custom Races](#custom-races)
    - [Subrace Support](#subrace-support)
    - [Custom Classes](#custom-classes)
11. [Cross-References](#cross-references)

---

## Quick Export Reference

A concise overview of all main exports from the library, organized by category.

### Core Functionality

| Export | Description | Section |
|--------|-------------|---------|
| `PlaylistParser` | Parse playlist JSON/Araweave data | [Core Modules](#core-modules) |
| `MetadataExtractor` | Extract metadata from track objects | [Core Modules](#core-modules) |
| `AudioAnalyzer` | Analyze audio frequency characteristics | [Core Modules](#core-modules) |
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
| `LevelUpProcessor` | Handle level-ups | [Progression System](#progression-system) |
| `MasterySystem` | Track track mastery | [Progression System](#progression-system) |
| `CharacterUpdater` | Apply sessions to characters | [Progression System](#progression-system) |
| `StatManager` | Manage stat increases | [Stat Increase System](#stat-increase-system) |

**Stat Increase Strategies:** `DnD5eStandardStrategy`, `DnD5eSmartStrategy`, `BalancedStrategy`, `PrimaryOnlyStrategy`, `RandomStrategy`, `ManualStrategy`, `createStatIncreaseStrategy` — see [Stat Increase System](#stat-increase-system)

### Equipment System

| Export | Description | Section |
|--------|-------------|---------|
| `EquipmentEffectApplier` | Apply/remove equipment effects when equipping/unequipping | [Equipment System](#equipment-system) |
| `EquipmentModifier` | Enchant, curse, upgrade, and modify equipment | [Equipment System](#equipment-system) |
| `EquipmentSpawnHelper` | Batch spawn equipment by rarity, tags, or templates | [Equipment System](#equipment-system) |

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

**Validation Schemas:** `PlaylistTrackSchema`, `ServerlessPlaylistSchema`, `AudioProfileSchema`, `AbilityScoresSchema`, `CharacterSheetSchema` — see [Utilities](#utilities)

**Configuration:** `DEFAULT_SENSOR_CONFIG`, `loadConfigFromEnv()`, `mergeConfig()`, `DEFAULT_PROGRESSION_CONFIG`, `mergeProgressionConfig()` — see [Configuration](#configuration)

### Type Exports

All TypeScript types are exported, including:

**Character Types:** `CharacterSheet`, `AbilityScores`, `Skill`, `ProficiencyLevel`, `Race`, `Class`, `Ability`, `GameMode` — see [Data Types](#data-types)

**Generator Types:** `CharacterGeneratorOptions` (includes `gameMode`), `AudioProfile`, `ColorPalette`, `FrequencyBands` — see [Data Types](#data-types)

**Context Types:** `EnvironmentalContext`, `GamingContext`, `ListeningSession` — see [Data Types](#data-types)

**Stat Increase Types:** `StatIncreaseConfig`, `StatIncreaseResult`, `StatIncreaseStrategy`, `StatIncreaseOptions`, `StatIncreaseStrategyType`, `StatIncreaseFunction` — see [Stat Increase System](#stat-increase-system)

**Extensibility Types:** `ClassFeature`, `RacialTrait`, `CustomSkill`, `FeatureEffect`, `FeaturePrerequisite`, `SkillPrerequisite`, `SpellPrerequisite`, `ValidationResult`, `ExtensionCategory` — see [Extensibility System](#extensibility-system) and [PREREQUISITES.md](docs/PREREQUISITES.md)

**Equipment Types:** `EnhancedEquipment` (primary), `Equipment` (legacy), `InventoryItem`, `EquipmentProperty`, `EquipmentCondition`, `EquipmentModification`, `EnhancedInventoryItem`, `EquipmentMiniFeature`, `SpawnRandomOptions`, `TreasureHoardResult` — see [Equipment System](#equipment-system)

**Game Data:** `RACE_DATA`, `CLASS_DATA`, `SPELL_DATABASE`, `XP_THRESHOLDS` — see [Game Data Reference](#game-data-reference)

---

## Data Types

Type definitions for all core data structures.

### Playlist Types

**Location:** [src/core/types/Playlist.ts](src/core/types/Playlist.ts)

| Type | Description | Key Properties |
|------|-------------|----------------|
| `ServerlessPlaylist` | Main container object returned by `PlaylistParser` | `name`, `tracks`, `image`, `creator`, `genre?`, `tags?` |
| `PlaylistTrack` | Flattened track object containing audio_url | `audio_url` (critical), `title`, `artist`, `image_url`, chain data |
| `RawArweavePlaylist` | Raw input schema received from Arweave before parsing | `tracks[].metadata` (stringified JSON), blockchain shell data |

### AudioProfile

**Location:** [src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)

Result of the `AudioAnalyzer`. Used to generate characters.

| Property | Type | Description |
|----------|------|-------------|
| `bass_dominance` | number | Bass frequency dominance (0.0 - 1.0) |
| `mid_dominance` | number | Mid-range frequency dominance (0.0 - 1.0) |
| `treble_dominance` | number | Treble frequency dominance (0.0 - 1.0) |
| `average_amplitude` | number | Average amplitude (0.0 - 1.0) |
| `spectral_centroid?` | number | Advanced metric: spectral centroid |
| `spectral_rolloff?` | number | Advanced metric: spectral rolloff |
| `zero_crossing_rate?` | number | Advanced metric: zero crossing rate |
| `color_palette?` | ColorPalette | Color palette extracted from artwork |
| `analysis_metadata` | object | Duration, buffer status, sample positions, timestamp |

### ColorPalette

**Location:** [src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)

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

**Location:** [src/core/types/AudioProfile.ts](src/core/types/AudioProfile.ts)

Audio frequency band separation for analysis. Rebalanced v2 ranges prevent treble dominance.

| Band | Range | Spectrum |
|------|-------|----------|
| Bass | 20Hz - 400Hz | 11% (380 Hz) |
| Mid | 400Hz - 4kHz | 52% (3,600 Hz) |
| Treble | 4kHz - 14kHz | 37% (10,000 Hz) |

```typescript
export interface FrequencyBands {
    bass: number[];   // Bass frequencies (20Hz - 400Hz)
    mid: number[];    // Mid frequencies (400Hz - 4kHz)
    treble: number[]; // Treble frequencies (4kHz - 14kHz)
}
```

### Character Types

**Location:** [src/core/types/Character.ts](src/core/types/Character.ts)

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

**Location:** [src/core/types/Character.ts](src/core/types/Character.ts)

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

**Location:** [src/core/types/Character.ts](src/core/types/Character.ts)

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
| damage_dice | string? | Damage dice |
| damage_type | string? | Damage type |
| attack_roll | boolean? | Requires attack roll? |
| saving_throw | string? | Saving throw ability |

#### AbilityScores

**Location:** [src/core/types/Character.ts](src/core/types/Character.ts)

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

**Location:** [src/core/types/Character.ts](src/core/types/Character.ts)

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
| feature_effects | FeatureEffect[]? | Effects from features/traits |
| equipment_effects | EquipmentEffect[]? | Effects from equipped items |

### InventoryItem Variants

Three related types for equipment and inventory management.

| Type | Location | Description |
|------|----------|-------------|
| **InventoryItem** | [src/core/generation/EquipmentGenerator.ts](src/core/generation/EquipmentGenerator.ts) | Basic inventory: name, quantity, equipped flag |
| **EnhancedInventoryItem** | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) | Adds: modifications, templateId, instanceId (for enchantments, per-instance tracking) |
| **CharacterEquipment** | [src/core/types/Equipment.ts](src/core/types/Equipment.ts) | Container: weapons[], armor[], items[], totalWeight, equippedWeight |

**Key differences:**
- `InventoryItem` - Legacy/compatibility type
- `EnhancedInventoryItem` - Current standard with enchantment support
- `CharacterEquipment` - Character's complete inventory state

### CharacterAppearance

**Location:** [src/core/generation/AppearanceGenerator.ts](src/core/generation/AppearanceGenerator.ts)

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
    // Dynamic features (from audio/visual)
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    aura_color?: string;
}
```

### EnvironmentalContext

*Also known as: Environmental sensors, IRL sensors, real-world context*

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

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

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

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

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

Device motion and acceleration data from accelerometer/gyroscope.

| Property | Type | Description |
|----------|------|-------------|
| acceleration | {x, y, z} | Acceleration without gravity (m/s²) |
| accelerationIncludingGravity | {x, y, z} | Raw acceleration with gravity |
| rotationRate | {alpha, beta, gamma} | Rotation rates (degrees/second) |
| interval | number | Sample interval (ms) |
| timestamp | number | Unix timestamp |

### WeatherData

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

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

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

Ambient light sensor data.

| Property | Type | Description |
|----------|------|-------------|
| illuminance | number | Light intensity in lux |
| timestamp | number | Unix timestamp |

### ForecastData

*Also known as: Weather forecast*

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

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

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

| Type | Description |
|------|-------------|
| **SensorType** | 'geolocation' \| 'motion' \| 'weather' \| 'light' |
| **SensorHealthStatus** | 'healthy' \| 'degraded' \| 'failed' \| 'unknown' |

### Sensor Status & Monitoring

**Location:** [src/core/types/Environmental.ts](src/core/types/Environmental.ts)

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

**Location:** [src/core/sensors/WeatherAPIClient.ts](src/core/sensors/WeatherAPIClient.ts)

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

**Location:** [src/core/types/Progression.ts](src/core/types/Progression.ts)

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

**Location:** [src/core/types/Combat.ts](src/core/types/Combat.ts)

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

#### Additional Combat Types

**Location:** [src/core/types/Combat.ts](src/core/types/Combat.ts)

| Type | Description |
|------|-------------|
| `CombatActionResult` | Outcome of a combat action (success, roll, damage) |
| `AttackRoll` | Attack roll result (d20, bonus, hit/miss) |
| `DamageRoll` | Damage roll result (dice, rolls, total) |
| `SpellCastResult` | Spell casting outcome (success, save DC, effects) |
| `CombatResult` | Final combat result (winner, XP, treasure) |
| `CombatConfig` | Combat configuration options (environment, music, tactical) |

#### Combat Helper Types

**InitiativeResult** — [src/core/combat/InitiativeRoller.ts](src/core/combat/InitiativeRoller.ts)

| Property | Type | Description |
|----------|------|-------------|
| `combatant` | Combatant | The combatant |
| `d20Roll` | number | d20 roll |
| `dexModifier` | number | DEX modifier |
| `initiativeTotal` | number | Total initiative |

**AttackResult** — [src/core/combat/AttackResolver.ts](src/core/combat/AttackResolver.ts)

| Property | Type | Description |
|----------|------|-------------|
| `attacker` | Combatant | The attacker |
| `target` | Combatant | The target |
| `attack` | Attack | Attack used |
| `attackRoll` | AttackRoll | Roll result |
| `damageRoll?` | DamageRoll | Damage rolled |
| `hpAfterDamage?` | number | Target HP after damage |
| `description` | string | Result description |

**SpellSlots** — [src/core/generation/SpellManager.ts](src/core/generation/SpellManager.ts)

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

*Location: [src/utils/hash.ts](src/utils/hash.ts)*

Functions for deterministic seed generation and hashing from blockchain data.

| Function | Returns | Description |
|----------|---------|-------------|
| `generateSeed(chain, address, id)` | `string` | Creates a unique seed string from blockchain identifiers |
| `hashSeedToFloat(seed)` | `number` | Float in range [0.0, 1.0) |
| `hashSeedToInt(seed, min, max)` | `number` | Integer in range [min, max) |
| `deriveSeed(baseSeed, suffix)` | `string` | Creates derived seed by appending suffix to base seed |

#### SeededRNG

*Location: [src/utils/random.ts](src/utils/random.ts)*

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

*Location:* `src/utils/validators.ts`

Zod schemas for runtime type validation. Use `safeParse()` for validation:

```typescript
import { PlaylistTrackSchema } from '@playlist-data-engine/utils';

const result = PlaylistTrackSchema.safeParse(data);
if (!result.success) {
  console.error(result.error);
}
```

| Schema | Validates |
|--------|-----------|
| `PlaylistTrackSchema` | Track metadata with chain-specific validation (AR: tx_id, others: token_address + token_id) |
| `ServerlessPlaylistSchema` | Complete playlist structure (metadata + tracks array) |
| `AudioProfileSchema` | Audio analysis (frequency, color palette, analysis metadata) |
| `AbilityScoresSchema` | All six ability scores (STR, DEX, CON, INT, WIS, CHA) in range 1-20 |
| `CharacterSheetSchema` | Complete character sheet (abilities, HP, skills, equipment, appearance, XP) |

#### Logging

*Location: [src/utils/logger.ts](src/utils/logger.ts)*

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

*Location: [src/utils/logger.ts](src/utils/logger.ts)*

| Type | Description |
|------|-------------|
| `LogEntry` | Single log entry structure (timestamp, level, context, message, data) |
| `LoggerConfig` | Configuration options (level, includeTimestamp, includeContext, customHandler) |

#### Sensor Dashboard

*Location: [src/utils/sensorDashboard.ts](src/utils/sensorDashboard.ts)*

Diagnostic tool for visual console output during development and debugging. Displays sensor status, health indicators, cache statistics, performance metrics, and recent failures.

**Functions**

| Function | Description |
|----------|-------------|
| `displayEnvironmentalDiagnostics(diagnostics, config?)` | Displays environmental sensor dashboard (GPS, motion, weather, light sensors) |
| `displayGamingDiagnostics(diagnostics, config?)` | Displays gaming platform sensor dashboard (Steam, Discord) |
| `displaySystemDashboard(data, config?)` | Displays combined system dashboard with health summary |

**Types**

*Location: [src/utils/sensorDashboard.ts](src/utils/sensorDashboard.ts)*

| Type | Description |
|------|-------------|
| `DashboardConfig` | Configuration options (useColors, compact, showTimestamp, maxFailures) |

---

### Game Data Reference
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
| `RACE_DATA` | Ability bonuses, speed, traits for each race | `src/utils/constants.ts` |
| `CLASS_DATA` | Hit dice, saving throws, skill options for each class | `src/utils/constants.ts` |
| `XP_THRESHOLDS` | Level (1-20) to XP required mapping | `src/utils/constants.ts` |
| `SPELL_DATABASE` | D&D 5e spells with details | `src/utils/constants.ts` |
| `EQUIPMENT_DATABASE` | Weapons, armor, items stats | `src/utils/constants.ts` |

#### Helper Functions
*Also known as: Data lookup functions, game data getters*

**Location:** `src/utils/constants.ts`

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
*Also known as: Race definition, racial stats*

**Location:** `src/utils/constants.ts` (31-43)

| Property | Type | Description |
|----------|------|-------------|
| `ability_bonuses` | `Partial<Record<Ability, number>>` | Ability score bonuses granted |
| `speed` | `number` | Base walking speed in feet |
| `traits` | `string[]` | Racial trait names/IDs |
| `subraces` | `string[]` (optional) | Available subraces |

**ClassDataEntry**
*Also known as: Class definition, job stats*

**Location:** `src/utils/constants.ts` (243-342)

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

**Location:** `src/core/parser/PlaylistParser.ts`

Converts raw JSON data (Arweave) into standardized `ServerlessPlaylist` objects.

#### Class: `PlaylistParser`

**Constructor:**
```typescript
new PlaylistParser(options?: PlaylistParserOptions)
```

**Methods:**

| Method | Description |
|--------|-------------|
| `async parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist>` | Parses raw playlist data into ServerlessPlaylist with metadata and track array |

**Options:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `validateAudioUrls` | boolean | `false` | Perform HEAD request to verify audio URLs exist |
| `strict` | boolean | `false` | Throw errors on invalid tracks instead of skipping |

#### Helper: `MetadataExtractor`

**Location:** `src/core/parser/MetadataExtractor.ts`

*Also known as: Metadata parser, field extractor*

Extracts metadata fields from playlist track data. All methods are static.

| Method | Description |
|--------|-------------|
| `static extractAudioUrl(data): string \| null` | Extracts audio URL with priority: mp3_url > lossy_audio > audio_url > lossless_audio > animation_url |
| `static extractImageUrl(data): string \| null` | Extracts image URL with priority: image_small > image > image_large > image_thumb |
| `static extractTitle(data): string \| null` | Extracts name/title with priority: name > title |
| `static extractArtist(data): string \| null` | Extracts artist with priority: artist > created_by > minter |
| `static parseMetadata(metadata): Record<string, unknown> \| null` | Parses metadata string to JSON object with error handling |
| `static convertAttributes(attributes): Record<string, string \| number> \| null` | Converts OpenSea-style attributes array to key-value object |

---

### AudioAnalyzer

*Also known as: Audio fingerprinting, frequency analysis, sonic analyzer*

**Location:** [src/core/analysis/AudioAnalyzer.ts](src/core/analysis/AudioAnalyzer.ts)

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
| `extractSonicFingerprint(audioUrl: string)` | `Promise<AudioProfile>` | Downloads and analyzes audio file; returns bass/mid/treble dominance, average_amplitude, optional advanced metrics, and analysis_metadata |

### ColorExtractor

*Also known as: Color palette extractor, dominant colors, k-means color analyzer*

**Location:** [src/core/analysis/ColorExtractor.ts](src/core/analysis/ColorExtractor.ts)

Extracts dominant colors from image URLs using K-Means clustering (k=4) with Median Cut fallback.

| Method | Returns | Description |
|--------|---------|-------------|
| `extractPalette(imageUrl: string)` | `Promise<ColorPalette>` | Extracts 4 dominant colors ranked by frequency; calculates brightness, saturation, monochrome status |

### SpectrumScanner

*Also known as: Frequency band separator, FFT band analyzer*

**Location:** [src/core/analysis/SpectrumScanner.ts](src/core/analysis/SpectrumScanner.ts)

Separates raw frequency data into bands using rebalanced v2 ranges (prevents treble dominance).

| Method | Returns | Description |
|--------|---------|-------------|
| `separateFrequencyBands(frequencyData, sampleRate)` | `FrequencyBands` | Separates FFT data into bass (20-400Hz), mid (400Hz-4kHz), treble (4kHz-14kHz) bands |
| `calculateDominance(band, bandWidthHz?)` | `number` | Calculates normalized average amplitude for a frequency band (bandwidth-aware) |

---

### CharacterGenerator
*Also known as: Character builder, hero generator, PC creator, D&D character generator*

**Location:** `src/core/generation/CharacterGenerator.ts`

Creates deterministic D&D 5e character sheets from a seed and audio profile.

#### Class: `CharacterGenerator`

**Methods:**

| Method | Description |
|--------|-------------|
| `static generate(seed: string, audioProfile: AudioProfile, track: PlaylistTrack, options?: CharacterGeneratorOptions): CharacterSheet` | Generates a complete character sheet deterministically |

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
| `CharacterSheet` | `src/core/types/Character.ts` | Complete character data structure |
| `CharacterGeneratorOptions` | `src/core/generation/CharacterGenerator.ts` | Generation options interface |
| `CharacterGeneratorExtensions` | `src/core/generation/CharacterGenerator.ts` | Custom content extensions |

#### Helper: `RaceSelector`
*Also known as: Race picker, ancestry selector*

**Location:** `src/core/generation/RaceSelector.ts`

Deterministically selects a race based on the seed.

**Methods:**

| Method | Description |
|--------|-------------|
| `static select(rng: SeededRNG): Race` | Selects from: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling |

#### Helper: `ClassSuggester`
*Also known as: Class recommender, job suggester*

**Location:** `src/core/generation/ClassSuggester.ts`

Suggests a class based on audio frequency dominance.

**Methods:**

| Method | Description |
|--------|-------------|
| `static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class` | **High Bass:** Barbarian, Fighter, Paladin. **High Treble:** Rogue, Ranger, Monk. **High Mid:** Wizard, Cleric, Druid. **High Amplitude:** Bard, Sorcerer, Warlock |

#### Helper: `AbilityScoreCalculator`
*Also known as: Stat calculator, ability mapper*

**Location:** `src/core/generation/AbilityScoreCalculator.ts`

Maps audio profile to ability scores (STR, DEX, CON, INT, WIS, CHA).

**Methods:**

| Method | Description |
|--------|-------------|
| `static calculateBaseScores(audioProfile: AudioProfile): AbilityScores` | **STR:** Bass dominance. **DEX:** Treble dominance. **CON:** Average amplitude. **INT:** Mid dominance. **WIS:** Balance between bass and treble. **CHA:** Combined mid and amplitude |
| `static applyRacialBonuses(baseScores: AbilityScores, race: Race): AbilityScores` | Adds +2 bonuses based on race |
| `static calculateModifiers(scores: AbilityScores): AbilityScores` | Calculates D&D 5e modifiers (e.g., 15 → +2) |

#### Helper: `SkillAssigner`
*Also known as: Proficiency assigner, skill selector*

**Location:** `src/core/generation/SkillAssigner.ts`

Assigns skill proficiencies based on class.

**Methods:**

| Method | Description |
|--------|-------------|
| `static assignSkills(characterClass: Class, rng: SeededRNG, character?: CharacterSheet): Record<string, ProficiencyLevel>` | Selects random skills from class's available list. Handles "Expertise" for Bards and Rogues. Supports custom skills via SkillQuery. Optional `character` enables prerequisite validation |

#### Helper: `SpellManager`
*Also known as: Spell manager, magic system, spell slot manager*

**Location:** `src/core/generation/SpellManager.ts`

Manages spells for spellcasting classes.

**Methods:**

| Method | Description |
|--------|-------------|
| `static isSpellcaster(characterClass: Class): boolean` | Returns true if the class can cast spells |
| `static getSpellSlots(characterClass: Class, characterLevel: number): Record<number, { total: number; used: number }>` | Gets spell slot counts for a class at a given level |
| `static getCantrips(characterClass: Class): string[]` | Returns all available cantrips for a spellcasting class |
| `static getKnownSpells(characterClass: Class, characterLevel: number, character?: CharacterSheet): string[]` | Returns all spells known by a spellcaster at a given level. If `character` provided, filters by prerequisites |
| `static initializeSpells(characterClass: Class, characterLevel: number, character?: CharacterSheet): SpellSlots` | Returns complete spell configuration with slots, known spells, and cantrips |
| `static filterCharacterSpells(character: CharacterSheet): CharacterSheet` | Filters known spells and cantrips by prerequisites, returns updated character sheet |
| `static getSpellCountAtLevel(spellLevel: number, spellSlots: Record<number, { total: number; used: number }>): number` | Returns number of spell slots at a given level |
| `static useSpellSlot(spellSlots: Record<number, { total: number; used: number }>, spellLevel: number): Record<number, { total: number; used: number }>` | Consumes one spell slot at the specified level |
| `static restoreSpellSlots(spellSlots: Record<number, { total: number; used: number }>, spellLevel?: number): Record<number, { total: number; used: number }>` | Restores spell slots at a specific level or all levels |

#### Helper: `EquipmentGenerator`
*Also known as: Inventory manager, gear generator*

**Location:** `src/core/generation/EquipmentGenerator.ts`

Manages inventory and starting gear. For equipment properties, enchanting, and custom equipment, see [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md).

**Methods:**

| Method | Description |
|--------|-------------|
| `static getStartingEquipment(characterClass: Class): { weapons: string[]; armor: string[]; items: string[] }` | Returns starting equipment list for a class |
| `static initializeEquipment(characterClass: Class): CharacterEquipment` | Creates complete equipment state with starting gear equipped |
| `static addItem(equipment: CharacterEquipment, itemName: string, quantity: number): CharacterEquipment` | Adds an item to inventory and recalculates weight |
| `static removeItem(equipment: CharacterEquipment, itemName: string, quantity: number): CharacterEquipment` | Removes an item from inventory and recalculates weight |
| `static equipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment` | Equips an item from inventory |
| `static unequipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment` | Unequips an item from inventory |
| `static getInventoryList(equipment: CharacterEquipment): InventoryItem[]` | Returns flattened list of all inventory items |

#### Helper: `AppearanceGenerator`
*Also known as: Visual generator, appearance builder*

**Location:** `src/core/generation/AppearanceGenerator.ts`

Generates visual traits.

**Methods:**

| Method | Description |
|--------|-------------|
| `static generate(seed: string, characterClass: Class, audioProfile: AudioProfile): CharacterAppearance` | **Deterministic:** Body type, skin tone, hair style/color, eye color. **Dynamic:** Primary color (from album art), Aura color (magical classes) |

#### Helper: `NamingEngine`
*Also known as: Name generator, character namer*

**Location:** `src/core/generation/NamingEngine.ts`

**Note:** Internal API - automatically called by `CharacterGenerator.generate()`.

Generates RPG-style character names from track metadata using 7 naming formats with weighted distribution (20-20-10-20-15-10-5). Audio characteristics provide ~50% influence through weighted selection, random choice provides ~50%.

**Methods:**

| Method | Description |
|--------|-------------|
| `generateName(seed: string, track: PlaylistTrack, audioProfile: AudioProfile, characterClass: Class, deterministic?: boolean): string` | Generates name using weighted formats: Class Title (20%), Adjective Construct (20%), Clan Construct (10%), Descriptive Epithet (20%), Compound Adjective (15%), Artist-Inspired (10%), Mononym Subtitle (5%) |
| `cleanTitle(title: string): string` | Removes "(Official Video)", "[Remix]", "ft.", track numbers, file extensions |

---

## Progression System

### SessionTracker

**Location:** `src/core/progression/SessionTracker.ts`

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

### ListeningSession

**Location:** `src/core/types/Progression.ts` (60-71)

Record of a single listening session.

```typescript
export interface ListeningSession {
    track_uuid: string;
    start_time: number;           // Unix timestamp
    end_time: number;             // Unix timestamp
    duration_seconds: number;
    base_xp_earned: number;
    bonus_xp: number;
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
    activity_type?: string;
    total_xp_earned: number;
}
```

---

### XPCalculator

**Location:** `src/core/progression/XPCalculator.ts`

Calculates XP based on duration, activity, environment, and gaming context.

#### Class: `XPCalculator`

**Constructor:**
```typescript
new XPCalculator(options?: Partial<ExperienceSystem>)
```

### ExperienceSystem

**Location:** `src/core/types/Progression.ts` (76-98)

Configuration for XP calculation.

```typescript
export interface ExperienceSystem {
    // XP thresholds for each level (D&D 5e standard)
    level_thresholds: number[];

    // Base XP rates
    xp_per_second: number;        // Base rate (e.g., 1 XP per second of listening)
    xp_per_track_completion: number;  // Bonus for finishing a song

    // Activity multipliers
    activity_bonuses: {
        stationary: number;
        walking: number;
        running: number;
        driving: number;
        night_time: number;
        extreme_weather: number;
        high_altitude: number;
    };

    // Mastery system
    track_mastery_threshold: number;  // Listens required to master a track
    mastery_bonus_xp: number;         // Bonus for mastering
}
```

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

**Location:** `src/core/progression/CharacterUpdater.ts`

*Also known as: Character progression, XP handler, level-up manager, character advancement*

Orchestrates applying session results to a character, handling leveling up and mastery.

**For usage examples, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**

#### Method Reference

| Method | Description |
|--------|-------------|
| `constructor(statManager?: StatManager)` | Creates instance with optional StatManager to override auto-detected strategy |
| `addXP(character, xpAmount, source?)` | Add XP from any source (combat, quests, activities); triggers level-up system |
| `updateCharacterFromSession(character, session, track?, previousListenCount?)` | Update character from listening session with XP calculation and mastery bonuses |
| `applyPendingStatIncrease(character, primaryStat, secondaryStats?)` | Apply pending stat increase with user-selected stats (manual mode only) |
| `hasPendingStatIncreases(character)` | Check if character has pending stat increases |
| `getPendingStatIncreaseCount(character)` | Get count of pending stat increases |

#### Stat Strategy Auto-Detection

`CharacterUpdater` auto-detects stat increase strategy based on character's `gameMode`:

| Game Mode | Strategy | Behavior |
|-----------|----------|----------|
| `standard` (capped at 20) | `dnD5e` (manual) | 2-step level-up: XP adds HP/proficiency/features, stats require manual selection via `applyPendingStatIncrease()` |
| `uncapped` | `dnD5e_smart` (auto) | 1-step level-up: Everything applied automatically, intelligently boosts primary/lowest stats |

**Override with custom StatManager:**
```typescript
import { StatManager, CharacterUpdater } from 'playlist-data-engine';

// Force automatic mode for standard characters
const statManager = new StatManager({ strategy: 'dnD5e_smart' });
const updater = new CharacterUpdater(statManager);
```

#### Types

| Type | Location | Description |
|------|----------|-------------|
| `CharacterUpdateResult` | [src/core/progression/CharacterUpdater.ts](src/core/progression/CharacterUpdater.ts) (11-20) | Result of character update with XP, level-up, and mastery data |
| `LevelUpDetail` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Detailed breakdown of individual level-up (HP, proficiency, stats, features, spell slots) |
| `ApplyPendingStatIncreaseResult` | [src/core/types/Progression.ts](src/core/types/Progression.ts) | Result of applying pending stat increase with stat change details |

---

### SessionTracker

**Location:** `src/core/progression/SessionTracker.ts`

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
| `isTrackMastered(trackUuid, masteryThreshold?)` | Checks if track has been mastered (default threshold: 10) |
| `getSessionsInRange(startTime, endTime)` | Returns sessions within time range |
| `getAverageSessionLength()` | Returns average session duration (seconds) |
| `getLongestSession()` | Returns the session with longest duration |
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

**Location:** `src/core/progression/XPCalculator.ts`

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

**Location:** `src/core/progression/LevelUpProcessor.ts`

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

### MasterySystem

**Location:** `src/core/progression/MasterySystem.ts`

*Also known as: Track mastery, song mastery, listening achievement*

Tracks song mastery based on listen counts.

#### Method Reference

| Method | Description |
|--------|-------------|
| `checkMastery(listenCount)` | Returns true if listens meets mastery threshold (default: 10) |
| `calculateMasteryBonus(isMastered)` | Returns bonus XP if mastered |
| `isJustMastered(previous, current)` | Returns true if mastery was achieved in current session |

---

## Stat Increase System

**Location:** `src/core/progression/stat/StatManager.ts`

Provides comprehensive stat increase management for D&D 5e-style character progression with flexible strategies for level-ups, items, and custom formulas.

### Class: `StatManager`

**Constructor:**
```typescript
new StatManager(config?: Partial<StatIncreaseConfig>)
```

**Type: StatIncreaseConfig**

**Location:** `src/core/types/Progression.ts` (173-185)

```typescript
export interface StatIncreaseConfig {
    maxStatCap: number;
    strategy: StatIncreaseStrategyType | StatIncreaseStrategy | StatIncreaseFunction;
    autoApply: boolean;
    statIncreaseLevels: number[];
}
```

**Configuration:**
- `maxStatCap` (number): Hard cap for all stats (default: 20)
- `strategy`: Strategy for auto-selecting stats on level up
- `autoApply` (boolean): Auto-apply stat increases during level up (default: true)
- `statIncreaseLevels` (number[]): Levels that grant stat increases (default: [4, 8, 12, 16, 19])

**Methods:**

- `increaseStats(character, increases, source): StatIncreaseResult`
    - Manually increase stats (potions, items, events)
    - Returns updated character with full change details
    - Enforces stat cap and recalculates modifiers

- `decreaseStats(character, decreases, source): StatIncreaseResult`
    - Decrease stats (curses, poison)
    - Uses same logic as increase but with negative amounts

- `setStat(character, ability, value, source): StatIncreaseResult`
    - Set a stat to an absolute value
    - Useful for setting specific values or resetting stats

- `processLevelUp(character, newLevel, options): StatIncreaseResult | null`
    - Process stat increases for level up
    - Returns null if this level doesn't grant stat increases
    - Uses configured strategy to determine which stats increase

- `canIncrease(character, ability, amount): boolean`
    - Check if an ability can be increased by a given amount
    - Returns false if stat would exceed cap

- `getStatCap(character, ability): number`
    - Get the stat cap for an ability (reads gameMode from character)

- `getConfig(): Readonly<Required<StatIncreaseConfig>>`
    - Get the current configuration
    - Returns a readonly copy of the configuration with all defaults applied

- `validateDnD5eStatSelection(character, selections, increaseAmount?): { valid: true } | StatSelectionValidationError`
    - Validate stat selection follows D&D 5e rules
    - Rules: +2 to one ability OR +1 to two abilities
    - Returns `{ valid: true }` if valid, or a `StatSelectionValidationError` with details if invalid
    - `increaseAmount` defaults to 2

- `updateConfig(config): void`
    - Update configuration mid-game
    - Use to change stat increase strategies dynamically
    - Can adjust stat cap or stat increase levels

### Configuration

**updateConfig() - Change Strategy Mid-Game:**

```typescript
const statManager = new StatManager();

// Start with manual selection (D&D 5e standard)
// Early game: Player manually chooses stats
const result = statManager.processLevelUp(character, 4, {
    forcedAbilities: ['STR']  // Player chose STR
});

// Mid-game: Switch to smart auto-selection
// Example: After reaching level 10, automate stat increases
statManager.updateConfig({
    strategy: 'dnD5e_smart'
});

// Now level-ups are automatic - no manual input needed!
const level11Result = statManager.processLevelUp(character, 11);

// Late-game: Switch to balanced strategy
statManager.updateConfig({
    strategy: 'balanced'
});
```

**Stat Decreases (Curses, Poison, etc.):**

```typescript
const statManager = new StatManager();

// Curse of Weakness: -2 STR penalty
const curseResult = statManager.decreaseStats(
    character,
    [{ ability: 'STR', amount: 2 }],
    'event'
);

character = curseResult.character;

// Check actual decrease
for (const dec of curseResult.increases) {
    console.log(`${dec.ability}: ${dec.oldValue} → ${dec.newValue} (${dec.delta})`);
    // Output: "STR: 16 → 14 (-2)"
}

// Poison: -1 DEX, -1 CON
const poisonResult = statManager.decreaseStats(
    character,
    [
        { ability: 'DEX', amount: 1 },
        { ability: 'CON', amount: 1 }
    ],
    'event'
);

// Remove curse with potion (restores stats)
const restoreResult = statManager.increaseStats(
    character,
    [{ ability: 'STR', amount: 2 }],
    'item'
);
```

### Optional Features (Developer Implementation)

**Banked Stat Points:**

The engine does not include a "banked stat points" system. Stat increases must be applied immediately - they are not stored for later use. If your game requires this feature, you'll need to implement it yourself:

```typescript
// Example: Custom banked points system
interface BankedPoints {
    available: number;
    history: Array<{ timestamp: number; source: string; amount: number }>;
}

class CharacterWithBankedPoints {
    character: CharacterSheet;
    banked: BankedPoints;

    // Apply banked points to a stat
    applyBankedPoints(ability: Ability, amount: number): void {
        if (this.banked.available < amount) {
            throw new Error('Not enough banked points');
        }

        const statManager = new StatManager();
        const result = statManager.increaseStats(
            this.character,
            [{ ability, amount }],
            'manual'
        );

        this.character = result.character;
        this.banked.available -= amount;
        this.banked.history.push({
            timestamp: Date.now(),
            source: 'banked',
            amount
        });
    }
}
```

**Respec System:**

Similarly, a stat respec system is not included. You can implement this by tracking the history of stat increases:

```typescript
// Example: Custom respec system
interface StatHistory {
    level: number;
    timestamp: number;
    increases: Array<{ ability: Ability; amount: number }>;
}

class CharacterWithRespec {
    character: CharacterSheet;
    statHistory: StatHistory[];

    // Respec all stat increases back to base values
    respec(): void {
        // 1. Reset all stats to base (before any level-up increases)
        // 2. Return all spent stat points to a pool
        // 3. Let player re-allocate

        // This is game-specific logic that depends on your stat system
        // The engine provides the building blocks (increaseStats, decreaseStats)
    }
}
```

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

**Type: StatIncreaseStrategyType**

**Location:** `src/core/types/Progression.ts` (107-113)

```typescript
type StatIncreaseStrategyType =
    | 'dnD5e'          // Manual selection (D&D 5e standard)
    | 'dnD5e_smart'    // Intelligent auto-selection
    | 'balanced'       // +1 to two lowest stats
    | 'primary_only'   // Always boosts class primary
    | 'random'         // Random selection
    | 'manual';        // Requires manual selection
```

### Stat Increase Result

**Location:** `src/core/types/Progression.ts` (190-214)

```typescript
export interface StatIncreaseResult {
    character: CharacterSheet;        // Updated character
    increases: Array<{
        ability: Ability;             // Which stat increased
        oldValue: number;             // Value before increase
        newValue: number;             // Value after increase
        delta: number;                // Amount increased
    }>;
    capped: Array<{
        ability: Ability;             // Stat that was capped
        attemptedValue: number;       // Value that was attempted
        cappedAt: number;             // The cap (20)
    }>;
    source: 'level_up' | 'manual' | 'item' | 'event';
    timestamp: number;
}
```

### Stat Selection Validation Error

**Location:** `src/core/types/Progression.ts` (281-290)

Returned by `StatManager.validateDnD5eStatSelection()` when stat selection validation fails.

```typescript
export interface StatSelectionValidationError {
    /** Error message */
    error: string;

    /** What was wrong */
    reason: 'invalid_ability' | 'invalid_amount' | 'exceeds_cap' | 'wrong_pattern' | 'duplicate_ability';

    /** Valid patterns allowed */
    allowedPatterns: string[];
}
```

### Usage Examples

**Manual Stat Selection (D&D 5e Standard):**
```typescript
const statManager = new StatManager();

// At level 4, 8, 12, 16, or 19 - player must choose
const result = statManager.processLevelUp(character, 4, {
    forcedAbilities: ['STR']  // Player chose STR
});

console.log(`STR increased from ${result.increases[0].oldValue} to ${result.increases[0].newValue}`);
```

**Smart Auto-Selection:**
```typescript
const statManager = new StatManager({
    strategy: 'dnD5e_smart'  // Automatically picks best stats
});
const updater = new CharacterUpdater(statManager);

// Stats automatically increase on level up!
```

**Potion/Item Stat Boosts:**
```typescript
const statManager = new StatManager();

// Potion of Strength: +4 STR
const result = statManager.increaseStats(
    character,
    [{ ability: 'STR', amount: 4 }],
    'item'
);

character = result.character;

if (result.capped.length > 0) {
    console.log('Stat was capped at 20!');
}
```

**Custom Formula:**
```typescript
// Define your own stat selection logic
const tankStrategy = (character, amount, options) => {
    if (character.ability_scores.CON < 18) {
        return [{ ability: 'CON', amount }];
    }
    return [{ ability: 'DEX', amount }];
};

const statManager = new StatManager({ strategy: tankStrategy });
```

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

**Usage:**

```typescript
// Standard mode (default)
const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    track,
    { gameMode: 'standard' }
);

// Uncapped mode with default D&D 5e pattern continuation
const epicCharacter = CharacterGenerator.generate(
    seed,
    audioProfile,
    track,
    { gameMode: 'uncapped' }
);
```

The `gameMode` is stored on the character and automatically used during level-ups.

For uncapped progression configuration examples, see [XP_AND_STATS.md](docs/XP_AND_STATS.md#uncapped-mode-custom-formulas).

---

## Configuration

**Locations:**
- Sensor Config: `src/core/config/sensorConfig.ts`
- Progression Config: `src/core/config/progressionConfig.ts`

The engine provides centralized configuration options for sensors and progression systems. These configurations allow you to customize behavior such as cache TTLs, retry logic, XP modifiers, and level-up settings.

### Sensor Configuration

**Sensor Configuration Types**

```typescript
// Complete sensor configuration
export interface SensorConfig {
    geolocation: Partial<GeolocationSensorConfig>;
    weather: Partial<WeatherSensorConfig>;
    gaming: Partial<GamingSensorConfig>;
    xpModifier: Partial<XPModifierConfig>;
    retry: Partial<RetryConfig>;
}

// Individual sensor configs
export interface GeolocationSensorConfig {
    cacheTTL?: number;              // Default: 5 minutes
    useLocalStorage?: boolean;      // Default: true
    enableHighAccuracy?: boolean;   // Default: true
    timeout?: number;               // Default: 5000ms
}

export interface WeatherSensorConfig {
    apiKey?: string;
    cacheTTL?: number;              // Default: 12 minutes
    forecastCacheTTL?: number;      // Default: 60 minutes
    useLocalStorage?: boolean;      // Default: true
}

export interface GamingSensorConfig {
    steam?: {
        apiKey?: string;
        steamId?: string;
        pollInterval?: number;      // Default: 60000ms (1 minute)
    };
    discord?: {
        clientId?: string;
        enableRichPresence?: boolean; // Default: true
        pollInterval?: number;      // Default: 60000ms
    };
    metadataCacheExpiry?: number;   // Default: 24 hours
    maxBackoffMs?: number;         // Default: 10 minutes
    xpModifier?: Partial<XPModifierConfig>;
}

export interface XPModifierConfig {
    maxModifier: number;           // Default: 3.0
    maxGamingModifier: number;     // Default: 1.75
    runningBonus: number;          // Default: 0.5
    walkingBonus: number;          // Default: 0.2
    stormBonus: number;            // Default: 0.4
    snowBonus: number;             // Default: 0.3
    nightBonus: number;            // Default: 0.25
    altitudeThreshold: number;     // Default: 1000m
    altitudeBonus: number;         // Default: 0.3
    gamingBaseBonus: number;       // Default: 0.25
    gamingRPGBonus: number;        // Default: 0.2
    gamingMultiplayerBonus: number; // Default: 0.15
}

export interface RetryConfig {
    enabled: boolean;              // Default: true
    maxRetries?: number;           // Default: 3
    initialDelayMs?: number;       // Default: 1000ms
    maxDelayMs?: number;           // Default: 10000ms
    backoffMultiplier?: number;    // Default: 2
}
```

**Available Exports:**

```typescript
import {
    DEFAULT_SENSOR_CONFIG,
    loadConfigFromEnv,
    mergeConfig,
    type SensorConfig,
    type GeolocationSensorConfig,
    type WeatherSensorConfig,
    type GamingSensorConfig,
    type XPModifierConfig,
    type RetryConfig
} from 'playlist-data-engine';
```

**Functions:**

- `loadConfigFromEnv(): Partial<SensorConfig>`
    - Loads configuration from environment variables
    - Reads `WEATHER_API_KEY`, `STEAM_API_KEY`, `STEAM_USER_ID`, `DISCORD_CLIENT_ID`, `XP_MAX_MODIFIER`

- `mergeConfig(userConfig?: Partial<SensorConfig>): Required<SensorConfig>`
    - Merges user config with environment config and defaults
    - Priority: userConfig > envConfig > defaults

**Constants:**

- `DEFAULT_SENSOR_CONFIG: Required<SensorConfig>` - Default configuration values

### Progression Configuration

**Progression Configuration Type**

```typescript
export interface ProgressionConfig {
    xp: {
        level_thresholds: number[];
        xp_per_second: number;
        xp_per_track_completion: number;
        activity_bonuses: {
            stationary: number;
            walking: number;
            running: number;
            driving: number;
            night_time: number;
            extreme_weather: number;
            high_altitude: number;
        };
        track_mastery_threshold: number;
        mastery_bonus_xp: number;
    };
    statIncrease: Partial<StatIncreaseConfig>;
    levelUp: {
        useAverageHP: boolean;
        allowManualStatSelection: boolean;
        showNotifications: boolean;
    };
}
```

**Available Exports:**

```typescript
import {
    DEFAULT_PROGRESSION_CONFIG,
    mergeProgressionConfig,
    type ProgressionConfig
} from 'playlist-data-engine';
```

**Functions:**

- `mergeProgressionConfig(userConfig?: Partial<ProgressionConfig>): Required<ProgressionConfig>`
    - Merges user configuration with defaults
    - Returns complete configuration with all required fields

**Constants:**

- `DEFAULT_PROGRESSION_CONFIG: Required<ProgressionConfig>` - Default D&D 5e progression values

---

## Environmental Sensors

**Location:** `src/core/sensors/EnvironmentalSensors.ts`

Integrates real-world data (GPS, Weather, Motion, Light) to influence XP generation.

#### Class: `EnvironmentalSensors`

**Constructor:**
```typescript
new EnvironmentalSensors(weatherApiKeyOrConfig?: string | { weather?: { apiKey?: string }; geolocation?: Partial<GeolocationSensorConfig>; retry?: Partial<RetryConfig>; xpModifier?: Partial<XPModifierConfig> }, retryConfig?: Partial<SensorRetryConfig>)
```

**Methods:**

- `async requestPermissions(types: SensorType[]): Promise<SensorPermission[]>`
    - Requests browser permissions for 'geolocation', 'motion', 'light', etc.
- `startMonitoring(callback?: (context: EnvironmentalContext) => void): void`
    - Starts listening to sensor streams.
- `stopMonitoring(): void`
    - Stops all sensor monitoring.
- `async updateSnapshot(): Promise<EnvironmentalContext>`
    - Manually fetches current pull-based data (Geo, Weather) with retry logic.
- `calculateXPModifier(): number`
    - Returns a multiplier (1.0x - 3.0x) based on current context.
- `async calculateXPModifierWithForecast(forecastHours?: number): Promise<number>`
    - Calculates XP modifier including upcoming weather forecast.
- `async calculateXPModifierWithSevereWeather(): Promise<{ modifier: number; severeWeatherAlert: SevereWeatherAlert | null; safetyWarning: string | null }>`
    - Calculates XP modifier with severe weather detection.
- `detectSevereWeather(): SevereWeatherAlert | null`
    - Detects severe weather from current conditions.
- `getSevereWeatherWarning(): string | null`
    - Returns safety warning for current severe weather.
- `getSensorStatus(sensorType: SensorType): SensorStatus | null`
    - Returns current health status of a sensor.
- `getAllSensorStatuses(): SensorStatus[]`
    - Returns status of all sensors.
- `getFailureLog(sensorType?: SensorType, limit?: number): SensorFailureLog[]`
    - Returns failure log entries, optionally filtered.
- `getLastKnownGood(sensorType: SensorType): any`
    - Returns last known good value for a sensor.
- `clearFailureLog(): void`
    - Clears failure log entries.
- `updateRetryConfig(config: Partial<SensorRetryConfig>): void`
    - Updates retry configuration.
- `onSensorRecovery(callback: (notification: SensorRecoveryNotification) => void): () => void`
    - Registers callback for sensor recovery notifications, returns unsubscribe function.
- `getPermissions(): SensorPermission[]`
    - Returns current permission states.
- `checkAvailability(type: SensorType): boolean`
    - Checks if a sensor type is available in the current environment.
- `getCurrentActivity(): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'`
    - Returns current activity type from motion sensor.
- `getDiagnostics(): { timestamp: number; diagnosticMode: boolean; sensors: [...]; cache: {...}; performance: {...}; recentFailures: SensorFailureLog[]; permissions: SensorPermission[]; context: {...} }`
    - Returns comprehensive diagnostic information.
- `enableDiagnosticMode(): void`
    - Enables diagnostic logging mode.
- `disableDiagnosticMode(): void`
    - Disables diagnostic logging mode.
- `printDashboard(config?: DashboardConfig): void`
    - Prints formatted sensor dashboard to console.

#### Helper: `GeolocationProvider`

**Location:** `src/core/sensors/GeolocationProvider.ts`

Handles GPS data and biome detection.

- `getCurrentPosition(): Promise<GeolocationData | null>`
    - Returns lat, long, altitude, speed, etc.
- `getBiome(latitude: number, longitude: number): string`
    - Returns 'tundra', 'forest', 'urban', or 'plains' based on coordinates.

#### Helper: `MotionDetector`

**Location:** `src/core/sensors/MotionDetector.ts`

Handles accelerometer and gyroscope data.

- `startMonitoring(callback: (data: MotionData) => void): void`
- `detectActivity(data: MotionData): 'stationary' | 'walking' | 'running' | 'driving'`
    - Uses acceleration magnitude to infer activity type.

#### Helper: `WeatherAPIClient`

**Location:** `src/core/sensors/WeatherAPIClient.ts`

Fetches weather data from OpenWeatherMap.

- `getWeather(lat: number, lon: number): Promise<WeatherData | null>`
    - Returns temp, humidity, weather type, and day/night status.

#### Helper: `LightSensor`

**Location:** `src/core/sensors/LightSensor.ts`

Uses the AmbientLightSensor API.

- `startMonitoring(callback: (data: LightData) => void): void`
    - Returns illuminance in lux.

---

## Gaming Integration

**Location:** `src/core/sensors/GamingPlatformSensors.ts`

Monitors Steam and Discord activity to award gaming bonuses.

#### Class: `GamingPlatformSensors`

**Constructor:**
```typescript
new GamingPlatformSensors(config: { steam?: { apiKey: string; steamId?: string; pollInterval?: number }; discord?: { clientId: string; enableRichPresence?: boolean; pollInterval?: number } })
```

**Methods:**

- `async authenticate(steamUserId?: string, discordUserId?: string): Promise<boolean>`
    - Authenticates with Steam (by ID) and Discord (connects RPC).
- `startMonitoring(callback?: (context: GamingContext) => void): void`
    - Starts polling for gaming activity.
- `stopMonitoring(): void`
    - Stops monitoring gaming activity.
- `isPlayingGame(gameName: string): boolean`
    - Checks if currently playing a specific game.
- `calculateGamingBonus(): number`
    - Calculates gaming XP bonus multiplier (1.0 to 1.75).
- `getContext(): GamingContext`
    - Returns current gaming context snapshot.
- `recordGameSession(gameName: string, durationMinutes: number): void`
    - Records a game session in the gaming history.
- `getDiagnostics(): { timestamp: number; steam: {...}; discord: {...}; gamingContext: GamingContext; polling: {...}; cache: {...}; performance: {...} }`
    - Returns comprehensive diagnostic information.
- `printDashboard(config?: DashboardConfig): void`
    - Prints formatted gaming sensor dashboard to console.
#### Helper: `SteamAPIClient`

**Location:** `src/core/sensors/SteamAPIClient.ts`

Integrates with Steam Web API.

- `getCurrentGame(steamUserId: string): Promise<{ name: string; appId: number; source: 'steam'; sessionDuration?: number } | null>`
    - Fetches currently played game.
- `getGameMetadata(gameName: string): Promise<{ appId?: number; name: string; genre?: string[]; description?: string } | null>`
    - Fetches genre tags and metadata for gaming bonuses.

#### Helper: `DiscordRPCClient`

**Location:** `src/core/sensors/DiscordRPCClient.ts`

**Dual-Mode Support:**
- **Server Mode (Node.js)**: Full Discord Rich Presence functionality when running in Node.js
- **Browser Mode**: Graceful degradation with clear console warnings

**Automatic Environment Detection**: The client auto-detects the environment and switches modes automatically. No configuration required.

**⚠️ IMPORTANT**: Discord RPC CANNOT read or set game activity in any environment. It is ONLY for displaying music status ("Listening to").

**Methods:**

- `async connect(): Promise<boolean>`
    - **Browser**: Always returns `false` with warning
    - **Node.js**: Connects to Discord RPC when available
- `disconnect(): void`
    - Disconnects from Discord RPC (no-op in browser mode)
- `isConnectedToDiscord(): boolean`
    - Returns connection status (always `false` in browser mode)
- `getConnectionState(): DiscordConnectionState`
    - Returns current connection state
- `getLastError(): string | null`
    - **Browser**: Returns "Discord Rich Presence requires a server environment (Node.js)"
    - **Node.js**: Returns last error or `null`
- `setMusicActivity(musicDetails: { songName: string, artistName?: string, albumArtKey?: string, albumName?: string, startTime?: number, endTime?: number }): Promise<boolean>`
    - Displays "Listening to {song}" on Discord profile with progress bar (server mode only)
- `clearMusicActivity(): Promise<boolean>`
    - Clears music activity from Discord Rich Presence (server mode only)
- `async getUserInfo(): Promise<DiscordUserInfo | null>`
    - Retrieves Discord user information (server mode only)

### Discord RPC Environment Modes

The `DiscordRPCClient` supports dual-mode operation:

#### Server Mode (Node.js)
When running in a Node.js environment, full Discord Rich Presence is available:
- Real-time connection to Discord's IPC server
- Music activity display on Discord profile
- Progress bars, album art, and artist information
- User info retrieval

#### Browser Mode
When running in browsers, Discord RPC gracefully degrades:
- All methods return appropriate defaults (false, null)
- Console warnings explain the limitation
- Connection state is `DiscordUnavailable`
- API remains fully compatible - no breaking changes

**Note**: This behavior is automatic and requires no configuration changes.

### Discord Types

**Location:** `src/core/sensors/DiscordRPCClient.ts`

```typescript
// User information from Discord READY event (103-109)
export interface DiscordUserInfo {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;        // Avatar hash
    globalName?: string;    // Display name
}

// Music activity details - specific interface for music presence (191-199)
export interface MusicActivityDetails {
    songName: string;
    artistName?: string;
    albumArtKey?: string;
    albumName?: string;       // For album art text
    startTime?: number;       // Unix timestamp in seconds
    endTime?: number;         // Unix timestamp in seconds (replaces durationSeconds)
    durationSeconds?: number; // Deprecated: Use endTime instead (for backward compatibility)
}

// Discord Rich Presence activity structure (161-186)
export interface DiscordActivity {
    type?: ActivityType;       // Playing, Streaming, Listening, etc.
    details?: string;          // Main activity text (max 128 chars)
    state?: string;            // Secondary activity text (max 128 chars)
    startTimestamp?: number;
    endTimestamp?: number;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    party?: DiscordActivityParty;
    buttons?: DiscordActivityButton[];
    secret?: string;
    matchSecret?: string;
    spectateSecret?: string;
}

// Discord RPC connection states (87-98)
export enum DiscordConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    DiscordUnavailable = 'discord_unavailable',
    Error = 'error',
}

// Activity types for Discord Rich Presence (115-121)
export enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    Competing = 5,
}

// Supporting types for DiscordActivity
export interface DiscordActivityButton {
    label: string;
    url: string;
}

export interface DiscordActivityAssets {
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
}

export interface DiscordActivityTimestamps {
    startTimestamp?: number;
    endTimestamp?: number;
}

export interface DiscordActivityParty {
    id?: string;
    size?: [current: number, max: number];
}

// Discord RPC error codes (205-222)
export enum DiscordRPCErrorCode {
    InvalidOpcode = 4000,
    InvalidPayload = 4001,
    InvalidFrameBeforeHandshake = 4002,
    InvalidFrame = 4003,
    NotConnected = 4004,
    AlreadyConnected = 4005,
    InvalidPermissions = 4006,
    InvalidClientId = 4007,
}

// Discord RPC error response structure (227-231)
export interface DiscordRPCErrorResponse {
    code: DiscordRPCErrorCode;
    message: string;
    evt?: string;
}

// Raw Discord RPC event data (237-252)
export interface DiscordRPCRawEvent {
    cmd?: string;
    evt?: string;
    nonce?: string;
    data?: {
        user?: {
            id: string;
            username: string;
            discriminator: string;
            avatar?: string;
            global_name?: string;
        };
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
```

---

## Combat System

**Location:** `src/core/combat/CombatEngine.ts`

A full D&D 5e turn-based combat engine.

#### Class: `CombatEngine`

**Constructor:**
```typescript
new CombatEngine(config?: CombatConfig)
```

**Methods:**

- `startCombat(players: CharacterSheet[], enemies: CharacterSheet[], environment?: EnvironmentalContext): CombatInstance`
    - Rolls initiative and creates a combat session.
- `getCurrentCombatant(combat: CombatInstance): Combatant`
    - Returns the current active combatant.
- `executeAttack(combat: CombatInstance, attacker: Combatant, target: Combatant, attack: Attack): CombatAction`
    - Resolves an attack roll against AC and applies damage. Requires a pre-built `Attack` object.
- `executeWeaponAttack(combat: CombatInstance, attacker: Combatant, target: Combatant, weaponName?: string): CombatAction`
    - Automatically builds an `Attack` object from the attacker's equipped weapon(s) and executes the attack.
    - If no `weaponName` is provided, uses the first equipped weapon.
    - If `weaponName` is provided, uses that specific weapon (must be equipped).
    - Throws an error if the attacker has no equipped weapons or the named weapon is not equipped.
- `executeCastSpell(combat: CombatInstance, caster: Combatant, spell: Spell, targets: Combatant[]): CombatAction`
    - Executes a spell casting action.
- `executeDodge(combat: CombatInstance, combatant: Combatant): CombatAction`
    - Executes dodge action (increases AC by 2 until next turn).
- `executeDash(combat: CombatInstance, combatant: Combatant): CombatAction`
    - Executes dash action (double movement speed).
- `executeDisengage(combat: CombatInstance, combatant: Combatant): CombatAction`
    - Executes disengage action (no opportunity attacks provoked).
- `nextTurn(combat: CombatInstance): CombatInstance`
    - Advances the turn order and resets action trackers.
- `getCombatResult(combat: CombatInstance): CombatResult | null`
    - Returns winner and rewards if combat is over.
- `getCombatSummary(combat: CombatInstance): string`
    - Returns formatted combat summary string.
- `applyDamage(combatant: Combatant, damage: number): number`
    - Applies damage to combatant (accounts for temp HP).
- `healCombatant(combatant: Combatant, healing: number): number`
    - Heals a combatant.
- `applyTemporaryHP(combatant: Combatant, tempHP: number): void`
    - Applies temporary hit points.
- `getLivingCombatants(combat: CombatInstance): Combatant[]`
    - Returns all non-defeated combatants.
- `getDefeatedCombatants(combat: CombatInstance): Combatant[]`
    - Returns all defeated combatants.

#### Helper: `InitiativeRoller` (instance class)

**Location:** `src/core/combat/InitiativeRoller.ts`

> **Note**: This is an instance class. Create an instance with `new InitiativeRoller()` before using methods.

Manages the D&D 5e initiative system for combat. Handles rolling initiative, sorting combatants by turn order, and managing turn progression. Internally uses `DiceRoller.rollD20()` for all dice rolls.

**Initiative Rolling:**

- `rollInitiativeForCombatant(combatant: Combatant): InitiativeResult`
    - Rolls initiative for a single combatant (d20 + DEX modifier)
    - Updates the combatant's `initiative` property in-place
    - Returns `InitiativeResult` with combatant, d20Roll, dexModifier, and initiativeTotal
- `rollInitiativeForAll(combatants: Combatant[]): { results: InitiativeResult[], sortedCombatants: Combatant[] }`
    - Rolls initiative for all combatants and sorts by descending initiative
    - Higher initiative acts first; ties broken by higher DEX modifier
    - Returns detailed roll results and the sorted combatant array

**Turn Management:**

- `getNextCombatant(combatants: Combatant[], currentIndex: number): { combatant: Combatant, index: number, isNewRound: boolean }`
    - Gets the next combatant in turn order
    - Automatically wraps around to beginning when reaching the end of the list
    - Returns the combatant, their new index, and whether a new round has started
- `getInitiativeOrder(combatants: Combatant[]): string[]`
    - Returns initiative order as an array of formatted strings for display
    - Each string shows: position, name, initiative value, and DEX modifier
    - Useful for displaying turn order to players

**Mid-Combat Changes:**

- `rerollInitiativeForCombatant(combatant: Combatant): number`
    - Re-rolls initiative for a specific combatant
    - Use when an effect changes a combatant's DEX modifier mid-combat
    - Updates combatant's initiative in-place and returns the new value
- `delayTurn(combatants: Combatant[], combatantId: string): Combatant[]`
    - Delays a combatant's turn by moving them one position later in initiative order
    - Used when a combatant takes the "Ready" action in D&D 5e
    - Returns a new array with the combatant moved to the next position
- `resortByInitiative(combatants: Combatant[]): Combatant[]`
    - Resorts combatants by their current initiative values
    - Use when new combatants join mid-combat or initiative values change
    - Returns a new sorted array (higher initiative first, DEX as tiebreaker)

#### Helper: `DiceRoller` (static class)

**Location:** `src/core/combat/DiceRoller.ts`

> **Note**: This is a static class. Call methods directly without instantiation: `DiceRoller.rollD20()`

Utility class for D&D-style dice rolling mechanics. All methods are static - no `new` needed.

**Basic Dice Functions:**

- `DiceRoller.rollDie(sides: number): number`
    - Roll a single die with the specified number of sides (4, 6, 8, 10, 12, 20, 100)
    - Returns a value from 1 to sides
- `DiceRoller.rollD20(): number`
    - Roll a d20 (common for attacks, ability checks, saving throws)
    - Returns a value from 1 to 20
- `DiceRoller.rollMultipleDice(count: number, sides: number): number[]`
    - Roll multiple dice of the same size
    - Returns an array of individual roll results
- `DiceRoller.rollPercentile(): number`
    - Roll a d100 (percentile die)
    - Returns a value from 1 to 100

**Formula Parsing:**

- `DiceRoller.parseDiceFormula(formula: string): { diceCount: number, diceSides: number, modifier: number, rolls: number[], total: number }`
    - Parse and roll a dice formula string like "2d6+3" or "1d20-2"
    - Returns an object with parsed formula data and results

**Advantage/Disadvantage:**

- `DiceRoller.rollWithAdvantage(): { roll1: number, roll2: number, result: number }`
    - Roll d20 with advantage (roll twice, take higher)
    - Returns both rolls and the final result
- `DiceRoller.rollWithDisadvantage(): { roll1: number, roll2: number, result: number }`
    - Roll d20 with disadvantage (roll twice, take lower)
    - Returns both rolls and the final result

**Combat Functions:**

- `DiceRoller.rollInitiative(dexModifier: number): number`
    - Roll initiative (d20 + DEX modifier)
    - Returns the initiative value
- `DiceRoller.calculateDamage(formula: string, modifier: number, isCritical?: boolean): { rolls: number[], modifier: number, total: number, isCritical: boolean }`
    - Calculate damage from a dice formula with optional modifier
    - For critical hits, dice are doubled (not the modifier)
    - Returns detailed damage breakdown
- `DiceRoller.doubleDamage(rolls: number[]): number[]`
    - Double the damage dice for a critical hit
    - Returns a new array with each roll duplicated

**Saving Throws & Ability Checks:**

- `DiceRoller.rollSavingThrow(abilityModifier: number, proficiencyBonus?: number): number`
    - Roll a saving throw (d20 + ability modifier + proficiency bonus if proficient)
    - Returns the total save result
- `DiceRoller.rollAbilityCheck(abilityModifier: number, proficiencyBonus?: number): number`
    - Roll an ability check (d20 + ability modifier + proficiency bonus if proficient)
    - Returns the total check result

**Critical Hit Detection:**

- `DiceRoller.isCriticalHit(d20Roll: number): boolean`
    - Check if a d20 roll is a critical hit (natural 20)
- `DiceRoller.isCriticalMiss(d20Roll: number): boolean`
    - Check if a d20 roll is a critical miss (natural 1)

**Seeded RNG:**

- `DiceRoller.seededRoll(seed: number): number`
    - Generate a deterministic "seeded" d20 roll for reproducibility
    - Uses a simple LCG algorithm
    - Returns a value from 1 to 20

#### Helper: `AttackResolver` (instance class)

**Location:** `src/core/combat/AttackResolver.ts`

> **Note**: This is an instance class. Create an instance with `new AttackResolver()` before using methods.

Handles melee and ranged attack resolution (D&D 5e: d20 + attack bonus vs target AC).

- `resolveAttack(attacker: Combatant, target: Combatant, attack: Attack): AttackResult`
    - Resolves a complete attack action (roll vs AC, damage if hit)
- `isInRange(attacker: Combatant, target: Combatant, attack: Attack): boolean`
    - Checks if an attack is within range (melee: 5ft, ranged: attack.range)
- `calculateAttackBonus(character: any, attackName: string, abilityModifier: number, isProficient: boolean): number`
    - Calculates attack bonus (ability modifier + proficiency bonus if proficient)
- `attackWithAdvantage(attacker: Combatant, target: Combatant, attack: Attack): AttackResult`
    - Resolves attack with advantage (roll twice, take higher)
- `attackWithDisadvantage(attacker: Combatant, target: Combatant, attack: Attack): AttackResult`
    - Resolves attack with disadvantage (roll twice, take lower)

#### Helper: `SpellCaster` (instance class)

**Location:** `src/core/combat/SpellCaster.ts`

> **Note**: This is an instance class. Create an instance with `new SpellCaster()` before using methods.

Handles spell casting mechanics (spell slots, saving throws, spell damage).

- `castSpell(caster: Combatant, spell: Spell, targets: Combatant[]): SpellCastResult`
    - Casts a spell at one or more targets (handles slot consumption, attack rolls, saving throws)
- `hasSpellSlot(caster: Combatant, spellLevel: number): boolean`
    - Checks if caster has a spell slot of the given level available
- `consumeSpellSlot(caster: Combatant, spellLevel: number): void`
    - Consumes a spell slot
- `restoreSpellSlots(caster: Combatant): void`
    - Restores all spell slots to maximum (after long rest)
- `calculateSaveDC(caster: Combatant, ability: string): number`
    - Calculates spell save DC (8 + ability modifier + proficiency bonus)
- `makeSavingThrow(target: Combatant, saveAbility: string, saveDC: number): boolean`
    - Makes a saving throw against a spell (returns true if save succeeds)
- `getSpellSlotInfo(caster: Combatant): string`
    - Returns formatted spell slot information
- `canUpcast(caster: Combatant, spell: Spell, targetSlotLevel: number): boolean`
    - Checks if a spell can be upcast (cast using higher-level slot)
- `upcastSpell(caster: Combatant, spell: Spell, targets: Combatant[], slotLevelUsed: number): SpellCastResult`
    - Upcasts a spell using a higher-level spell slot

---

## Equipment System

**Location:** `src/core/equipment/`, `src/core/types/Equipment.ts`, `src/core/generation/EquipmentGenerator.ts`

**For comprehensive documentation, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)**

### Equipment Types

**Location:** `src/core/types/Equipment.ts`

```typescript
// EquipmentPropertyType
// Location: `src/core/types/Equipment.ts` (38-45)
type EquipmentPropertyType =
    | 'stat_bonus'           // +1 STR, +2 DEX, etc.
    | 'skill_proficiency'    // Proficiency or expertise in skills
    | 'ability_unlock'       // Darkvision, flight, etc.
    | 'passive_modifier'     // Damage resistance, speed bonus, AC bonus
    | 'special_property'     // Finesse, versatile, two-handed, etc.
    | 'damage_bonus'         // +1d6 fire damage, etc.
    | 'stat_requirement';    // Minimum stat required to use

// EquipmentCondition
// Location: `src/core/types/Equipment.ts` (51-59)
type EquipmentCondition =
    | { type: 'vs_creature_type'; value: string }
    | { type: 'at_time_of_day'; value: 'day' | 'night' | 'dawn' | 'dusk' }
    | { type: 'wielder_race'; value: string }
    | { type: 'wielder_class'; value: string }
    | { type: 'while_equipped'; value: boolean }
    | { type: 'on_hit'; value: boolean }
    | { type: 'on_damage_taken'; value: boolean }
    | { type: 'custom'; value: string; description: string };

// Equipment Property
// Location: `src/core/types/Equipment.ts` (64-71)
interface EquipmentProperty {
    type: EquipmentPropertyType;
    target: string;
    value: number | string | boolean;
    condition?: EquipmentCondition;
    description?: string;
    stackable?: boolean;
}

// Enhanced Equipment
// Location: `src/core/types/Equipment.ts` (89-137)
interface EnhancedEquipment {
    name: string;
    type: 'weapon' | 'armor' | 'item';
    rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    weight: number;
    properties?: EquipmentProperty[];
    grantsFeatures?: Array<string | EquipmentMiniFeature>;
    grantsSkills?: Array<{ skillId: string; level: 'proficient' | 'expertise' }>;
    grantsSpells?: Array<{ spellId: string; level?: number; uses?: number; recharge?: string }>;
    damage?: { dice: string; damageType: string; versatile?: string };
    acBonus?: number;
    weaponProperties?: string[];
    spawnWeight?: number;
    templateId?: string;
    source?: 'default' | 'custom';
    tags?: string[];
}

// Equipment Modification
// Location: `src/core/types/Equipment.ts` (142-159)
interface EquipmentModification {
    id: string;
    name: string;
    properties: EquipmentProperty[];
    addsFeatures?: Array<string | EquipmentMiniFeature>;
    addsSkills?: Array<{ skillId: string; level: 'proficient' | 'expertise' }>;
    addsSpells?: Array<{ spellId: string; level?: number; uses?: number; recharge?: string }>;
    appliedAt: string;
    source: string;
}

// Enhanced Inventory Item
// Location: `src/core/types/Equipment.ts` (164-177)
// Note: Basic `InventoryItem` exists at `src/core/generation/EquipmentGenerator.ts` (37-41)
interface EnhancedInventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
    modifications?: EquipmentModification[];
    templateId?: string;
    instanceId?: string;
}

// Effect Application Result
// Location: `src/core/types/Equipment.ts` (231-238)
interface EffectApplicationResult {
    applied: boolean;
    count: number;
    errors: string[];
}

// Equipment Validation Result
// Location: `src/core/types/Equipment.ts` (243-248)
interface EquipmentValidationResult {
    valid: boolean;
    errors?: string[];
}

// Spawn Random Options
// Location: `src/core/types/Equipment.ts` (253-262)
interface SpawnRandomOptions {
    excludeZeroWeight?: boolean;
    includeTypes?: ('weapon' | 'armor' | 'item')[];
    minRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
    maxRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary';
}

// Treasure Hoard Result
// Location: `src/core/types/Equipment.ts` (267-274)
interface TreasureHoardResult {
    items: EnhancedEquipment[];
    totalValue: number;
    cr: number;
}
```

### EquipmentEffectApplier

**Location:** `src/core/equipment/EquipmentEffectApplier.ts`

```typescript
class EquipmentEffectApplier {
    static equipItem(
        character: CharacterSheet,
        equipment: EnhancedEquipment,
        instanceId?: string
    ): EffectApplicationResult;

    static unequipItem(
        character: CharacterSheet,
        equipmentName: string,
        instanceId?: string
    ): EffectApplicationResult;

    static reapplyEquipmentEffects(
        character: CharacterSheet
    ): EffectApplicationResult;

    static getActiveEffects(
        character: CharacterSheet
    ): EquipmentProperty[];
}
```

### EquipmentValidator

**Location:** `src/core/equipment/EquipmentValidator.ts`

```typescript
class EquipmentValidator {
    static validateEquipment(
        equipment: EnhancedEquipment
    ): EquipmentValidationResult;

    static validateProperty(
        property: EquipmentProperty
    ): EquipmentValidationResult;

    static validateEquipmentFeatureReference(
        featureId: string
    ): boolean;

    static validateEquipmentSkillReference(
        skillId: string
    ): boolean;

    static validateDamageInfo(
        damage: EnhancedEquipment['damage']
    ): EquipmentValidationResult;

    static validateSpawnWeight(
        weight: number
    ): EquipmentValidationResult;

    static validateModification(
        modification: EquipmentModification
    ): EquipmentValidationResult;
}
```

### EquipmentModifier

**Location:** `src/core/equipment/EquipmentModifier.ts`

```typescript
class EquipmentModifier {
    static enchant(
        equipment: CharacterEquipment,
        itemName: string,
        enchantment: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    static applyTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static curse(
        equipment: CharacterEquipment,
        itemName: string,
        curse: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    static upgrade(
        equipment: CharacterEquipment,
        itemName: string,
        upgrade: EquipmentModification,
        character?: CharacterSheet
    ): CharacterEquipment;

    static removeModification(
        equipment: CharacterEquipment,
        itemName: string,
        modificationId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static disenchant(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static liftCurse(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    // Query methods
    static getCombinedEffects(
        equipment: CharacterEquipment,
        itemName: string,
        instanceId?: string
    ): EquipmentProperty[];

    static hasTemplate(
        equipment: CharacterEquipment,
        itemName: string,
        templateId: string
    ): boolean;

    static isCursed(
        equipment: CharacterEquipment,
        itemName: string
    ): boolean;

    static isEnchanted(
        equipment: CharacterEquipment,
        itemName: string
    ): boolean;

    static getAppliedTemplates(
        equipment: CharacterEquipment,
        itemName: string
    ): string[];

    static getModificationHistory(
        equipment: CharacterEquipment,
        itemName: string
    ): EquipmentModification[];

    static removeAllModifications(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static getModificationSources(
        equipment: CharacterEquipment,
        itemName: string
    ): string[];

    static countModificationsBySource(
        equipment: CharacterEquipment,
        itemName: string
    ): Record<string, number>;

    static getItemSummary(
        equipment: CharacterEquipment,
        itemName: string
    ): { name: string; modifications: EquipmentModification[]; isCursed: boolean; isEnchanted: boolean };

    // Factory methods
    static createModification(
        id: string,
        name: string,
        properties: EquipmentProperty[],
        source: string
    ): EquipmentModification;

    static generateModificationId(prefix?: string): string;
}
```

### EquipmentSpawnHelper

**Location:** `src/core/equipment/EquipmentSpawnHelper.ts`

Helper class for spawning multiple equipment items at once. Provides batch spawning utilities for spawning from lists, by rarity, by tags, randomly, from templates, and treasure hoards.

```typescript
class EquipmentSpawnHelper {
    static spawnFromList(
        itemNames: string[],
        rng?: SeededRNG
    ): (EnhancedEquipment | undefined)[];

    static spawnByRarity(
        rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary',
        count: number,
        rng?: SeededRNG
    ): EnhancedEquipment[];

    static spawnByTags(
        tags: string[],
        count: number,
        rng?: SeededRNG,
        options?: SpawnRandomOptions
    ): EnhancedEquipment[];

    static spawnRandom(
        count: number,
        rng: SeededRNG,
        options?: SpawnRandomOptions
    ): EnhancedEquipment[];

    static spawnFromTemplate(
        templateId: string,
        baseItemName?: string
    ): EnhancedEquipment | null;

    static spawnTreasureHoard(
        cr: number,
        rng: SeededRNG
    ): TreasureHoardResult;

    static addToCharacter(
        character: CharacterSheet,
        items: EnhancedEquipment[],
        equip?: boolean
    ): CharacterSheet;
}
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `spawnFromList()` | `itemNames`, `rng?` | `(EnhancedEquipment \| undefined)[]` | Spawn multiple items from array of names (undefined for missing) |
| `spawnByRarity()` | `rarity`, `count`, `rng?` | `EnhancedEquipment[]` | Spawn items of specific rarity |
| `spawnByTags()` | `tags`, `count`, `rng`, `options?` | `EnhancedEquipment[]` | Spawn items with specific tags |
| `spawnRandom()` | `count`, `rng`, `options?` | `EnhancedEquipment[]` | Spawn random equipment with weighted selection |
| `spawnFromTemplate()` | `templateId`, `baseItemName?` | `EnhancedEquipment \| null` | Spawn item from template ID |
| `spawnTreasureHoard()` | `cr`, `rng` | `TreasureHoardResult` | Spawn treasure hoard based on challenge rating |
| `addToCharacter()` | `character`, `items`, `equip?` | `CharacterSheet` | Add spawned equipment to character |

### EquipmentGenerator

**Location:** `src/core/generation/EquipmentGenerator.ts`

```typescript
class EquipmentGenerator {
    static getStartingEquipment(
        characterClass: Class
    ): { weapons: string[]; armor: string[]; items: string[] };

    static initializeEquipment(
        characterClass: Class
    ): CharacterEquipment;

    static addItem(
        equipment: CharacterEquipment,
        itemName: string,
        quantity: number = 1
    ): CharacterEquipment;

    static removeItem(
        equipment: CharacterEquipment,
        itemName: string,
        quantity: number = 1
    ): CharacterEquipment;

    static equipItem(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static unequipItem(
        equipment: CharacterEquipment,
        itemName: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    /**
     * @internal Private method for internal use. Use getEquipmentDataStatic for external access.
     */
    private static getEquipmentData(
        itemName: string
    ): EnhancedEquipment | undefined;

    static getEquipmentDataStatic(
        itemName: string
    ): EnhancedEquipment | undefined;

    static getInventoryList(
        equipment: CharacterEquipment
    ): EnhancedInventoryItem[];

    static getEquipmentByType(
        equipment: CharacterEquipment,
        type: 'weapons' | 'armor' | 'items'
    ): EnhancedInventoryItem[];

    static addModification(
        equipment: CharacterEquipment,
        itemName: string,
        modification: EquipmentModification,
        instanceId?: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static removeModification(
        equipment: CharacterEquipment,
        itemName: string,
        modificationId: string,
        character?: CharacterSheet
    ): CharacterEquipment;

    static getActiveEffects(
        equipment: CharacterEquipment,
        itemName: string,
        instanceId?: string
    ): EquipmentProperty[];
}
```

---

## Enchantment Library

**Location:** `src/utils/enchantmentLibrary.ts`

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

```typescript
function createStrengthEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification
function createDexterityEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification
function createConstitutionEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification
function createIntelligenceEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification
function createWisdomEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification
function createCharismaEnchantment(bonus: 1 | 2 | 3 | 4): EquipmentModification
```

Each function returns an `EquipmentModification` that adds the specified bonus to the corresponding ability score when applied via `EquipmentModifier.enchant()`.

### Query Functions

```typescript
function getEnchantment(id: string): EquipmentModification | undefined
// Get a specific enchantment by its ID

function getCurse(id: string): EquipmentModification | undefined
// Get a specific curse by its ID

function getAllEnchantments(): EquipmentModification[]
// Get all enchantments (weapons, armor, resistances, combo)

function getAllCurses(): EquipmentModification[]
// Get all curses

function getEnchantmentsByType(type: 'weapon' | 'armor' | 'resistance' | 'combo'): EquipmentModification[]
// Get enchantments filtered by type
```

### Usage Example

```typescript
import { EquipmentModifier, WEAPON_ENCHANTMENTS, CURSES, createStrengthEnchantment } from 'playlist-data-engine';

// Apply a predefined enchantment
const flamingEnch = WEAPON_ENCHANTMENTS.flaming;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    flamingEnch,
    character
);

// Apply a curse
const cursed = EquipmentModifier.curse(
    character.equipment,
    'Ring',
    CURSES.attunement,
    character
);

// Create and apply custom stat boost
const strengthBoost = createStrengthEnchantment(2); // +2 Strength
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Belt of Giant Strength',
    strengthBoost,
    character
);
```

---

## Magic Item Examples

**Location:** `src/utils/magicItemExamples.ts`

The Magic Item Examples library provides a comprehensive collection of 38 pre-built magic items that demonstrate all capabilities of the Advanced Equipment System. These examples serve as both reference implementations and test fixtures for the equipment system.

### Available Collections

#### Magic Items (`MAGIC_ITEM_EXAMPLES`)

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

```typescript
function getMagicItem(name: string): EnhancedEquipment | undefined
// Get a specific magic item by name

function getMagicItemsByType(type: 'weapon' | 'armor' | 'item'): EnhancedEquipment[]
// Get all magic items of a specific type

function getMagicItemsByRarity(rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'): EnhancedEquipment[]
// Get all magic items of a specific rarity

function getCursedItems(): EnhancedEquipment[]
// Get all cursed items (items with 'cursed' tag)

function getItemsWithProperty(propertyType: string): EnhancedEquipment[]
// Get all items with a specific property type

function applyTemplate(baseEquipment: EnhancedEquipment, templateId: string): EnhancedEquipment | null
// Apply a template to base equipment, returns enhanced item or null if template not found
```

### Usage Example

```typescript
import {
    MAGIC_ITEM_EXAMPLES,
    MAGIC_EQUIPMENT_TEMPLATES,
    getMagicItem,
    getMagicItemsByType,
    getCursedItems,
    applyTemplate,
    EnhancedEquipment
} from 'playlist-data-engine';

// Get a specific item by name
const flameTongue = getMagicItem('Flame Tongue');
if (flameTongue) {
    console.log(flameTongue.properties); // Array of equipment properties
}

// Get all weapons
const weapons = getMagicItemsByType('weapon');
console.log(weapons.length); // 4 weapons

// Get cursed items
const curses = getCursedItems();
console.log(curses.map(item => item.name)); // ['-1 Cursed Sword', 'Belt of Strength Drain', ...]

// Apply a template to base equipment
const baseLongsword: EnhancedEquipment = {
    name: 'Longsword',
    type: 'weapon',
    rarity: 'common',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing', versatile: '1d10' },
    weaponProperties: ['finesse', 'versatile'],
    source: 'base',
    tags: ['martial', 'melee']
};

const flamingLongsword = applyTemplate(baseLongsword, 'flaming_weapon_template');
if (flamingLongsword) {
    console.log(flamingLongsword.name); // "Longsword (flaming weapon template)"
    console.log(flamingLongsword.properties); // Combined properties from base + template
}

// Access all items directly
MAGIC_ITEM_EXAMPLES.forEach(item => {
    console.log(`${item.name} (${item.rarity}) - ${item.type}`);
});
```

### Registration with ExtensionManager

Magic item examples can be registered as custom equipment for use in procedural generation:

```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { MAGIC_ITEM_EXAMPLES } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register all magic items as custom equipment
manager.register('equipment', MAGIC_ITEM_EXAMPLES, {
    mode: 'append',
    weights: MAGIC_ITEM_EXAMPLES.reduce((acc, item) => {
        acc[item.name] = item.spawnWeight ?? 0;
        return acc;
    }, {} as Record<string, number>)
});

// Now items will appear in random generation (respecting spawnWeight)
```

---

## Extensibility System

**Location:** `src/core/extensions/`

**For comprehensive extensibility documentation, see [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)**

The extensibility system allows runtime customization of ALL procedural generation lists with spawn rate control.

### Quick Reference

**Supported Categories:**

| Category | Description |
|----------|-------------|
| `equipment` | Weapons, armor, items |
| `equipment.properties` | Equipment property templates (enchantments, curses) |
| `equipment.modifications` | Modification templates |
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

**Location:** `src/core/extensions/ExtensionManager.ts`

Singleton registry for managing runtime customization of procedural generation lists with spawn rate control.

```typescript
class ExtensionManager {
    // Instance Management
    static getInstance(): ExtensionManager

    // Registration
    register(category: ExtensionCategory, items: any[], options?: ExtensionOptions): void
    registerMultiple(registrations: RegistrationEntry[]): void

    // Data Retrieval
    get(category: ExtensionCategory): any[]
    getDefaults(category: ExtensionCategory): any[]
    getCustom(category: ExtensionCategory): any[]

    // Weight Management
    setWeights(category: ExtensionCategory, weights: Record<string, number>): void
    getWeights(category: ExtensionCategory): Record<string, number>
    getDefaultWeights(category: ExtensionCategory): Record<string, number>

    // Spawn Mode Configuration
    setMode(category: ExtensionCategory, mode: SpawnMode): void
    getMode(category: ExtensionCategory): SpawnMode

    // State Queries
    hasCustomData(category: ExtensionCategory): boolean
    getInfo(category?: ExtensionCategory): Record<string, any>
    getRegisteredCategories(): ExtensionCategory[]

    // Reset Operations
    reset(category: ExtensionCategory): void
    resetAll(): void

    // Validation
    validate(category: ExtensionCategory, items: any[]): ValidationResult

    // Data Export
    exportCustomData(): Record<string, any>
    exportCustomDataForCategory(category: ExtensionCategory): any[]
}

type ExtensionCategory =
    | 'equipment'
    | 'equipment.properties'
    | 'equipment.modifications'
    | 'equipment.templates'
    | 'appearance.bodyTypes'
    | 'appearance.skinTones'
    | 'appearance.hairColors'
    | 'appearance.hairStyles'
    | 'appearance.eyeColors'
    | 'appearance.facialFeatures'
    | 'spells'
    | 'races'
    | 'classes'
    | `spells.${string}`
    | 'classFeatures'
    | `classFeatures.${string}`
    | 'racialTraits'
    | `racialTraits.${string}`
    | 'skills'
    | `skills.${string}`
    | 'skillLists'
    | `skillLists.${string}`;

type SpawnMode = 'relative' | 'absolute' | 'default' | 'replace';

interface ExtensionOptions {
    mode?: SpawnMode;
    weights?: Record<string, number>;
    validate?: boolean;
}

interface RegistrationEntry {
    category: ExtensionCategory;
    items: any[];
    options?: ExtensionOptions;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getInstance()` | - | `ExtensionManager` | Returns singleton instance |
| `register()` | `category`, `items`, `options?` | `void` | Register items for a category with optional weights/mode |
| `registerMultiple()` | `registrations[]` | `void` | Register multiple categories in a single call |
| `get()` | `category` | `any[]` | Get combined defaults + custom items |
| `getDefaults()` | `category` | `any[]` | Get default items only |
| `getCustom()` | `category` | `any[]` | Get custom items only |
| `setWeights()` | `category`, `weights` | `void` | Set spawn weights for items |
| `getWeights()` | `category` | `Record<string, number>` | Get current weights |
| `getDefaultWeights()` | `category` | `Record<string, number>` | Get default weights only |
| `setMode()` | `category`, `mode` | `void` | Set spawn mode for category |
| `getMode()` | `category` | `SpawnMode` | Get current spawn mode |
| `hasCustomData()` | `category` | `boolean` | Check if category has custom data |
| `getInfo()` | `category?` | `Record<string, any>` | Get detailed info about one or all categories |
| `getRegisteredCategories()` | - | `ExtensionCategory[]` | List all categories with custom data |
| `reset()` | `category` | `void` | Reset category to defaults |
| `resetAll()` | - | `void` | Reset all categories to defaults |
| `validate()` | `category`, `items` | `ValidationResult` | Validate items against category schema |
| `exportCustomData()` | - | `Record<string, any>` | Export all custom data |
| `exportCustomDataForCategory()` | `category` | `any[]` | Export custom data for single category |

**Spawn Modes:**

| Mode | Behavior |
|------|----------|
| `relative` | Custom items added to default pool with custom weights |
| `absolute` | Only custom items can spawn (ignore defaults) |
| `default` | All items (default + custom) have equal weight |
| `replace` | Clear previous custom data before registering new items |

### FeatureQuery

**Location:** `src/core/features/FeatureQuery.ts`

Query and validation layer for class features and racial traits stored in ExtensionManager.

**Architecture:** FeatureQuery provides query methods and validation helpers. All features and traits are stored in ExtensionManager; FeatureQuery provides:
- Query methods that read from ExtensionManager with caching for performance
- Feature-related helper methods (prerequisite validation, subrace support, etc.)
- Cache invalidation for manual updates

**Registration:** Use `ExtensionManager.register('classFeatures', [...])` or `ExtensionManager.register('racialTraits', [...])` directly.

**Design principle:** No duplicate storage. All three registries (SpellQuery, SkillQuery, FeatureQuery) follow the same pattern: they do not maintain their own copy of data. All data lives in ExtensionManager.

```typescript
class FeatureQuery {
    // Instance Management
    static getInstance(): FeatureQuery

    // Class Features (reads from ExtensionManager with caching)
    getClassFeatures(characterClass: Class, level?: number): ClassFeature[]
    getClassFeaturesForLevel(characterClass: Class, level: number): ClassFeature[]
    getClassFeatureById(featureId: string): ClassFeature | undefined
    getAllClassFeatures(): Map<string, ClassFeature[]>

    // Racial Traits (reads from ExtensionManager with caching)
    getRacialTraits(race: Race): RacialTrait[]
    getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[]
    getBaseRacialTraits(race: Race): RacialTrait[]
    getSubraceTraits(race: Race, subrace: string): RacialTrait[]
    getAvailableSubraces(race: Race): string[]
    getRacialTraitById(traitId: string): RacialTrait | undefined
    getAllRacialTraits(): Map<string, RacialTrait[]>

    // Validation (delegates to FeatureValidator)
    validatePrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): ValidationResult
    validateFeaturePrerequisites(feature: ClassFeature, character: CharacterSheet): ValidationResult
    validateTraitPrerequisites(trait: RacialTrait, character: CharacterSheet): ValidationResult
    canGainFeature(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean

    // Registry Statistics
    getRegisteredClasses(): Class[]
    getRegisteredRaces(): Race[]
    getQueryStats(): { totalClassFeatures: number; totalRacialTraits: number; classesWithFeatures: number; racesWithTraits: number }

    // Export (reads from ExtensionManager)
    exportRacialTraits(): Record<string, RacialTrait[]>

    // Equipment Features (static methods)
    static getEquipmentFeatures(equipmentName: string): ClassFeature[]
    static isValidEquipmentFeature(featureId: string): boolean
}

interface ClassFeature {
    id: string;
    name: string;
    description: string;
    type: FeatureType;
    class: Class;
    level: number;
    prerequisites?: FeaturePrerequisite;
    effects?: FeatureEffect[];
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;
}

interface RacialTrait {
    id: string;
    name: string;
    description: string;
    race: Race;
    subrace?: string;
    prerequisites?: FeaturePrerequisite;
    effects?: FeatureEffect[];
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;
}

type FeatureType = 'passive' | 'active' | 'resource' | 'trigger';

type FeatureEffectType =
    | 'stat_bonus'
    | 'skill_proficiency'
    | 'ability_unlock'
    | 'passive_modifier'
    | 'resource_grant'
    | 'spell_slot_bonus';

interface FeatureEffect {
    type: FeatureEffectType;
    target: string;
    value: number | string | boolean;
    condition?: string;
    description?: string;
}

interface FeaturePrerequisite {
    level?: number;
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    class?: Class;
    race?: Race;
    subrace?: string;
    features?: string[];
    skills?: string[];
    spells?: string[];
    custom?: string;
}

interface ValidationResult {
    valid: boolean;
    errors?: string[];
    unmet?: string[];
}

// Additional types for character storage

interface CharacterFeature {
    featureId: string;
    name: string;
    gainedAtLevel: number;
    source: 'default' | 'custom';
    state?: Record<string, number | boolean | string>;
    choices?: Record<string, string | number | boolean>;
}

interface CharacterTrait {
    traitId: string;
    name: string;
    source: 'default' | 'custom';
}
```

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

**Note on Registration:**

**Class features** must be registered via ExtensionManager:
```typescript
ExtensionManager.getInstance().register('classFeatures', [featureData]);
```

**Racial traits** must be registered via ExtensionManager:
```typescript
ExtensionManager.getInstance().register('racialTraits', [traitData]);
```

**Note on Initialization:**

Default class features and racial traits are initialized via ExtensionManager:
```typescript
ExtensionManager.getInstance().initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES)
ExtensionManager.getInstance().initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS)
```

---

### FeatureValidator

**Location:** `src/core/features/FeatureValidator.ts`

Utility class for validating class features and racial traits against strict schemas. All methods are static.

```typescript
class FeatureValidator {
    // Feature Validation
    static validateClassFeature(feature: unknown): ValidationResult
    static validateRacialTrait(trait: unknown): ValidationResult

    // Batch Validation
    static validateClassFeatures(features: unknown[]): ValidationResult
    static validateRacialTraits(traits: unknown[]): ValidationResult

    // Component Validation
    static validateEffect(effect: unknown): ValidationResult
    static validatePrerequisites(prerequisites: unknown): ValidationResult
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// Helper functions (convenience wrappers)
function validateClassFeature(feature: unknown): ValidationResult
function validateRacialTrait(trait: unknown): ValidationResult
function validateClassFeatures(features: unknown[]): ValidationResult
function validateRacialTraits(traits: unknown[]): ValidationResult
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `validateClassFeature()` | `feature: unknown` | `ValidationResult` | Validate class feature schema including required fields, enums, and value ranges |
| `validateRacialTrait()` | `trait: unknown` | `ValidationResult` | Validate racial trait schema including required fields, enums, and value ranges |
| `validateClassFeatures()` | `features: unknown[]` | `ValidationResult` | Validate array of class features with index-based error reporting |
| `validateRacialTraits()` | `traits: unknown[]` | `ValidationResult` | Validate array of racial traits with index-based error reporting |
| `validateEffect()` | `effect: unknown` | `ValidationResult` | Validate feature effect (type, target, value, condition) |
| `validatePrerequisites()` | `prerequisites: unknown` | `ValidationResult` | Validate prerequisite object (level, abilities, class, race, subrace, features, skills, spells) |

**Class Feature Validation Rules:**

`validateClassFeature()` checks the following required fields:
- `id` - Must be a string in `lowercase_with_underscores` format (e.g., `barbarian_rage`, `fighter_action_surge`)
- `name` - Must be a string
- `description` - Must be a string
- `type` - Must be one of: `passive`, `active`, `resource`, `trigger`
- `class` - Must be a valid default class or custom class registered via ExtensionManager
- `level` - Must be a number between 1 and 20
- `source` - Must be `default` or `custom`

Optional fields validated:
- `prerequisites` - Must pass prerequisite validation
- `effects` - Array of effects, each must pass effect validation
- `tags` - Array of strings
- `lore` - String (flavor text)
- `subrace` - String (for subrace-specific features)

**Racial Trait Validation Rules:**

`validateRacialTrait()` checks the following required fields:
- `id` - Must be a string in `lowercase_with_underscores` format
- `name` - Must be a string
- `description` - Must be a string
- `race` - Must be a valid default race or custom race registered via ExtensionManager
- `source` - Must be `default` or `custom`

Optional fields validated:
- `subrace` - String (for subrace-specific traits)
- `prerequisites` - Must pass prerequisite validation
- `effects` - Array of effects, each must pass effect validation
- `tags` - Array of strings
- `lore` - String (flavor text)

**Effect Validation Rules:**

`validateEffect()` checks:
- `type` - Must be one of: `stat_bonus`, `skill_proficiency`, `ability_unlock`, `passive_modifier`, `resource_grant`, `spell_slot_bonus`
- `target` - Must be a string (target depends on effect type)
- `value` - Required (number, string, or boolean depending on type)

For `skill_proficiency` effects:
- `value` - Must be one of: `none`, `proficient`, `expertise`

**Prerequisite Validation:**

**For detailed validation rules and runtime behavior:** See [docs/PREREQUISITES.md#validation-system](docs/PREREQUISITES.md#validation-system)

`validatePrerequisites()` validates prerequisite objects and their runtime values against a character.

---

### WeightedSelector

**Location:** `src/core/extensions/WeightedSelector.ts`

Utility class for weighted random selection supporting different spawn modes for probability calculation.

```typescript
class WeightedSelector {
    // Single Selection (throws on empty arrays)
    static select<T>(items: T[], weights: Record<string, number>, rng: SeededRNG, mode?: SelectionMode): T

    // Multiple Selection
    static selectMultiple<T>(items: T[], weights: Record<string, number>, rng: SeededRNG, count: number, mode?: SelectionMode): T[]

    // Probability Calculation
    static getProbabilities<T>(items: T[], weights: Record<string, number>, mode?: SelectionMode): Record<string, number>

    // Weight Normalization (includes items parameter)
    static normalizeWeights<T>(items: T[], weights: Record<string, number>, mode: SelectionMode): Record<string, number>

    // Item Identification
    static getItemKey<T>(item: T): string
}

type SelectionMode = 'relative' | 'absolute' | 'default' | 'replace';

interface SeededRNG {
    next(): number;
    seed: number;
}

interface WeightedSelectionOptions {
    mode?: SelectionMode;
    allowDuplicates?: boolean;
    fallbackToEqualWeights?: boolean;
}
```

**Method Reference:**

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

**Location:** `src/core/skills/SkillQuery.ts`

Query and validation layer for character skills stored in ExtensionManager.

**Architecture:** SkillQuery provides query methods and validation helpers. All skills are stored in ExtensionManager; SkillQuery provides:
- Query methods that read from ExtensionManager with caching for performance
- Skill-related helper methods (prerequisite validation, ability/category filtering, etc.)
- Cache invalidation for manual updates

**Registration:** Use `ExtensionManager.register('skills', [...])` directly.

**Design principle:** No duplicate storage. All data lives in ExtensionManager.

```typescript
class SkillQuery {
    // Instance Management
    static getInstance(): SkillQuery

    // Retrieval (reads from ExtensionManager with caching)
    getSkill(id: string): CustomSkill | undefined
    getAllSkills(): CustomSkill[]
    getSkillsByAbility(ability: Ability): CustomSkill[]
    getSkillsByCategory(category: string): CustomSkill[]
    getCategories(): string[]
    getSkillsBySource(source: 'default' | 'custom'): CustomSkill[]
    getAvailableSkills(character: CharacterSheet): CustomSkill[]

    // Validation (delegates to SkillValidator)
    validatePrerequisites(skill: CustomSkill, character: CharacterSheet): SkillValidationResult
    validateSkill(skill: CustomSkill): SkillValidationResult

    // Query
    isValidSkill(id: string): boolean
    getSkillCount(): number
    getQueryStats(): SkillQueryStats
}

type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

interface CustomSkill {
    id: string;
    name: string;
    description?: string;
    ability: Ability;
    armorPenalty?: boolean;
    customProperties?: Record<string, string | number | boolean | string[]>;
    categories?: string[];
    source: 'default' | 'custom';
    tags?: string[];
    lore?: string;
    prerequisites?: SkillPrerequisite;
}

interface SkillPrerequisite {
    level?: number;
    abilities?: Partial<Record<Ability, number>>;
    class?: Class;
    race?: Race;
    subrace?: string;
    skills?: string[];
    features?: string[];
    spells?: string[];
    custom?: string;
}

interface SkillValidationResult {
    valid: boolean;
    errors: string[];
}

interface SkillQueryStats {
    totalSkills: number;
    defaultSkills: number;
    customSkills: number;
    skillsByAbility: Record<Ability, number>;
    categories: string[];
}

// Additional types

interface SkillProficiency {
    skillId: string;
    level: 'none' | 'proficient' | 'expertise';
    source: 'class' | 'background' | 'feat' | 'custom' | 'racial' | 'other';
    grantedBy?: string;
}

interface SkillListDefinition {
    class: string;
    skillCount: number;
    availableSkills: string[];
    selectionWeights?: SkillSelectionWeights;
    hasExpertise?: boolean;
    expertiseCount?: number;
}

interface SkillSelectionWeights {
    weights: Record<string, number>;
    mode?: 'relative' | 'absolute' | 'default';
}
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getInstance()` | - | `SkillQuery` | Returns singleton instance |
| `getSkill()` | `id` | `CustomSkill \| undefined` | Get skill by ID |
| `getAllSkills()` | - | `CustomSkill[]` | Get all registered skills (reads from ExtensionManager with caching) |
| `getSkillsByAbility()` | `ability` | `CustomSkill[]` | Get skills for specific ability (builds index from EM data with caching) |
| `getSkillsByCategory()` | `category` | `CustomSkill[]` | Get skills in a specific category (builds index from EM data with caching) |
| `getCategories()` | - | `string[]` | Get all categories in use (derived from EM data) |
| `getSkillsBySource()` | `source` | `CustomSkill[]` | Get skills by source (default or custom) |
| `getAvailableSkills()` | `character` | `CustomSkill[]` | Get skills character can learn (prerequisites met) |
| `validatePrerequisites()` | `skill`, `character` | `SkillValidationResult` | Validate skill prerequisites (delegates to SkillValidator) |
| `validateSkill()` | `skill` | `SkillValidationResult` | Validate skill data structure (delegates to SkillValidator) |
| `isValidSkill()` | `id` | `boolean` | Check if skill ID exists in registry |
| `getSkillCount()` | - | `number` | Get total skill count |
| `getQueryStats()` | - | `SkillQueryStats` | Get statistics about registered skills |

**Note on Registration:**

Skills must be registered via ExtensionManager:
```typescript
ExtensionManager.getInstance().register('skills', [skillData]);
```

**Note on Initialization:**

Default skills are initialized via ExtensionManager:
```typescript
ExtensionManager.getInstance().initializeDefaults('skills', DEFAULT_SKILLS)
```

---

### SkillValidator

**Location:** `src/core/skills/SkillValidator.ts`

Utility class for validating custom skills, skill proficiencies, and skill list definitions. All methods are static and validate against strict schemas.

```typescript
class SkillValidator {
    // Skill Validation
    static validateSkill(skill: unknown): SkillValidationResult
    static validateSkills(skills: unknown[]): SkillValidationResult

    // Skill Proficiency Validation
    static validateSkillProficiency(proficiency: unknown): SkillValidationResult
    static validateSkillProficiencies(proficiencies: unknown[]): SkillValidationResult

    // Skill List Definition Validation
    static validateSkillListDefinition(skillList: unknown): SkillValidationResult

    // Prerequisite Validation
    static validateSkillPrerequisites(prerequisites: SkillPrerequisite | undefined, character: CharacterSheet): SkillValidationResult

    // Type Guards
    static isValidAbility(ability: string): ability is Ability
    static isValidSkillId(id: string): boolean
}

interface SkillValidationResult {
    valid: boolean;
    errors: string[];
}

// Helper functions (convenience wrappers)
function validateSkill(skill: unknown): SkillValidationResult
function validateSkills(skills: unknown[]): SkillValidationResult
function validateSkillProficiency(proficiency: unknown): SkillValidationResult
function validateSkillProficiencies(proficiencies: unknown[]): SkillValidationResult
function validateSkillListDefinition(skillList: unknown): SkillValidationResult
function validateSkillPrerequisites(prerequisites: SkillPrerequisite | undefined, character: CharacterSheet): SkillValidationResult
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `validateSkill()` | `skill: unknown` | `SkillValidationResult` | Validate skill schema including required fields, ID format, ability, source |
| `validateSkills()` | `skills: unknown[]` | `SkillValidationResult` | Validate multiple skills with index-based error reporting |
| `validateSkillProficiency()` | `proficiency: unknown` | `SkillValidationResult` | Validate skill proficiency (skillId, level, source) |
| `validateSkillProficiencies()` | `proficiencies: unknown[]` | `SkillValidationResult` | Validate array of skill proficiencies |
| `validateSkillListDefinition()` | `skillList: unknown` | `SkillValidationResult` | Validate class skill list (class, skillCount, availableSkills, expertiseCount) |
| `validateSkillPrerequisites()` | `prerequisites`, `character` | `SkillValidationResult` | Validate prerequisites against character |
| `isValidAbility()` | `ability: string` | `boolean` | Check if valid ability score (STR, DEX, CON, INT, WIS, CHA) |
| `isValidSkillId()` | `id: string` | `boolean` | Check if skill ID follows lowercase_with_underscores format |

**Skill Validation:**

`validateSkill()` checks the following required fields:
- `id` - Must be a string in lowercase_with_underscores format (e.g., `athletics`, `survival_cold`)
- `name` - Must be a string
- `ability` - Must be one of: STR, DEX, CON, INT, WIS, CHA
- `source` - Must be 'default' or 'custom'

Optional fields validated:
- `description` - String
- `armorPenalty` - Boolean (whether armor applies disadvantage)
- `categories` - String array (skill categories for organization)
- `tags` - String array (for filtering/searching)
- `customProperties` - Record with string, number, boolean, or string[] values
- `lore` - String (flavor text)

**Skill Proficiency Validation:**

`validateSkillProficiency()` checks skill proficiency objects:
- `skillId` - Must follow lowercase_with_underscores format
- `level` - Must be 'none', 'proficient', or 'expertise'
- `source` - Must be 'class', 'background', 'feat', 'custom', 'racial', or 'other'
- `grantedBy` - Optional string (what granted this proficiency)

**Skill List Definition Validation:**

`validateSkillListDefinition()` validates class skill list definitions:
- `class` - String (class name)
- `skillCount` - Non-negative integer (number of skills to choose)
- `availableSkills` - String array (valid skill IDs to choose from)
- `hasExpertise` - Optional boolean (whether class can get expertise)
- `expertiseCount` - Optional non-negative integer (number of expertise choices)

---

### Skill Prerequisites

**For comprehensive guide, examples, and best practices:** See [docs/PREREQUISITES.md](docs/PREREQUISITES.md)

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

**Validation:**
- `SkillValidator.validateSkillPrerequisites(skill, character)` - Validate prerequisites against character
- `SkillQuery.validatePrerequisites(skill, character)` - Validate via registry

---

### Spell Prerequisites

**For comprehensive guide, examples, and best practices:** See [docs/PREREQUISITES.md](docs/PREREQUISITES.md)

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

**Validation:**
- `SpellValidator.validateSpellPrerequisites(prerequisites, character)` - Validate prerequisites against character
- `SpellValidator.validateSpell(spell)` - Validate spell schema including prerequisites

---

### SpellQuery

**Location:** `src/core/spells/SpellQuery.ts`

Query and validation layer for spells stored in ExtensionManager.

**Architecture:** SpellQuery provides query methods and validation helpers. All spells are stored in ExtensionManager; SpellQuery provides:
- Query methods that read from ExtensionManager with caching for performance
- Spell-related helper methods (prerequisite validation, class spell lists, etc.)
- Cache invalidation for manual updates

**Registration:** Use `ExtensionManager.register('spells', [...])` or `ExtensionManager.register('spells.${ClassName}', [...])` for class spell lists directly.

**Design principle:** No duplicate storage. All three registries (SpellQuery, SkillQuery, FeatureQuery) follow the same pattern: they do not maintain their own copy of data. All data lives in ExtensionManager.

```typescript
class SpellQuery {
    // Instance Management
    static getInstance(): SpellQuery

    // Retrieval (reads from ExtensionManager with caching)
    getSpell(spellId: string): RegisteredSpell | undefined
    getSpells(): RegisteredSpell[]
    getSpellsByLevel(level: number): RegisteredSpell[]
    getSpellsBySchool(school: SpellSchool): RegisteredSpell[]
    getSpellsForClass(characterClass: Class): RegisteredSpell[]
    getAvailableSpells(character: CharacterSheet): RegisteredSpell[]
    getSpellsBySource(source: 'default' | 'custom'): RegisteredSpell[]

    // Class Spell Lists
    getClassSpellList(characterClass: Class): string[]

    // Spell Slots
    getSpellSlotsForClass(characterClass: Class, level: number): number

    // Validation
    validatePrerequisites(spell: RegisteredSpell, character: CharacterSheet): ValidationResult
    validateSpell(spell: RegisteredSpell): ValidationResult

    // Query
    hasSpell(spellId: string): boolean
    getSpellCount(): number
    getQueryStats(): { totalSpells: number; defaultSpells: number; customSpells: number; spellsByLevel: Record<number, number>; spellsBySchool: Record<SpellSchool, number>; classesWithSpells: number }
}

type SpellSchool =
    | 'Abjuration'
    | 'Conjuration'
    | 'Divination'
    | 'Enchantment'
    | 'Evocation'
    | 'Illusion'
    | 'Necromancy'
    | 'Transmutation';

interface RegisteredSpell extends Spell {
    id: string;
    classes?: Class[];
    source: 'default' | 'custom';
}

interface Spell {
    id?: string;
    name: string;
    level: number;
    school: SpellSchool;
    prerequisites?: SpellPrerequisite;
    description?: string;
    casting_time?: string;
    range?: string;
    components?: string[];
    duration?: string;
    classes?: Class[];
    source?: 'default' | 'custom';
}

interface SpellPrerequisite {
    level?: number;
    casterLevel?: number;
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    class?: string;
    features?: string[];
    spells?: string[];
    skills?: string[];
    custom?: string;
}

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings?: string[];
}
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getInstance()` | - | `SpellQuery` | Returns singleton instance |
| `getSpell()` | `spellId` | `RegisteredSpell \| undefined` | Get spell by ID |
| `getSpells()` | - | `RegisteredSpell[]` | Get all spells (reads from ExtensionManager with caching) |
| `getSpellsByLevel()` | `level` | `RegisteredSpell[]` | Get spells of specific level (0-9) (queries ExtensionManager, builds index with caching) |
| `getSpellsBySchool()` | `school` | `RegisteredSpell[]` | Get spells of specific school (queries ExtensionManager, builds index with caching) |
| `getSpellsForClass()` | `class` | `RegisteredSpell[]` | Get spells available to a class (filters by `classes` property) |
| `getAvailableSpells()` | `character` | `RegisteredSpell[]` | Get spells character can learn (prerequisites met) |
| `getSpellsBySource()` | `source` | `RegisteredSpell[]` | Get spells by source (default or custom) |
| `getClassSpellList()` | `class` | `string[]` | Get spell list for a class (reads from ExtensionManager) |
| `getSpellSlotsForClass()` | `class`, `level` | `number` | Get spell slots for class/level (delegates to constants helper) |
| `validatePrerequisites()` | `spell`, `character` | `ValidationResult` | Validate spell prerequisites (delegates to SpellValidator) |
| `validateSpell()` | `spell` | `ValidationResult` | Validate spell schema (delegates to SpellValidator) |
| `hasSpell()` | `spellId` | `boolean` | Check if spell exists |
| `getSpellCount()` | - | `number` | Get total spell count |
| `getQueryStats()` | - | `{ totalSpells, defaultSpells, customSpells, spellsByLevel, spellsBySchool, classesWithSpells }` | Get registry statistics (computed from ExtensionManager data) |

**Usage Notes:**

- **Registration:** Use `ExtensionManager.register('spells', [...])` directly.
- **Class Spell Lists:** Register custom class spell lists via `ExtensionManager.register('spells.${ClassName}', [...])`. Spell IDs are validated during registration.
- **Querying:** Query methods read from ExtensionManager with lazy caching for performance. Caches are automatically invalidated after registration.
- **No Duplicate Storage:** All three registries (SpellQuery, SkillQuery, FeatureQuery) follow the same pattern and do not maintain their own data copy. ExtensionManager is the single source of truth.

---

### SpellValidator

**Location:** `src/core/spells/SpellValidator.ts`

Utility class for validating spells and their prerequisites. All methods are static and validate against strict schemas.

```typescript
class SpellValidator {
    // Spell Validation
    static validateSpell(spell: unknown): SpellValidationResult
    static validateSpells(spells: unknown[]): SpellValidationResult

    // Prerequisite Validation
    static validatePrerequisites(prerequisites: unknown): SpellValidationResult
    static validateSpellPrerequisites(
        prerequisites: SpellPrerequisite | undefined,
        character: CharacterSheet
    ): SpellValidationResult

    // Type Guards
    static isValidAbility(ability: string): ability is Ability
    static isValidSchool(school: string): school is Spell['school']
    static isValidSpellLevel(level: number): boolean
}

interface SpellValidationResult {
    valid: boolean;
    errors: string[];
}

// Helper functions (convenience wrappers)
function validateSpell(spell: unknown): SpellValidationResult
function validateSpells(spells: unknown[]): SpellValidationResult
function validateSpellPrerequisitesSchema(prerequisites: unknown): SpellValidationResult
function validateSpellPrerequisites(
    prerequisites: SpellPrerequisite | undefined,
    character: CharacterSheet
): SpellValidationResult
```

**Method Reference:**

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `validateSpell()` | `spell: unknown` | `SpellValidationResult` | Validate spell schema including prerequisites |
| `validateSpells()` | `spells: unknown[]` | `SpellValidationResult` | Validate array of spells |
| `validatePrerequisites()` | `prerequisites: unknown` | `SpellValidationResult` | Validate prerequisite object structure |
| `validateSpellPrerequisites()` | `prerequisites`, `character` | `SpellValidationResult` | Validate prerequisites against character |
| `isValidAbility()` | `ability: string` | `boolean` | Check if valid ability score |
| `isValidSchool()` | `school: string` | `boolean` | Check if valid spell school |
| `isValidSpellLevel()` | `level: number` | `boolean` | Check if valid spell level (0-9) |

---

### Custom Races

**For comprehensive guide, examples, and best practices:** See [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)

The engine supports custom races through the ExtensionManager. Custom races can define ability score bonuses, speed, traits, and available subraces.

#### API Interfaces

```typescript
interface RaceDataEntry {
    ability_bonuses: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    speed: number;
    traits: string[];
    subraces?: string[];
}
```

**Helper Functions:**
- `getRaceData(race: string)` - Get race data from default or custom races

---

### Subrace Support

**For comprehensive guide, examples, and best practices:** See [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)

Characters can have a subrace property (e.g., 'High Elf', 'Hill Dwarf'). Subraces allow for more granular racial trait assignment and prerequisite validation.

#### API Interfaces

```typescript
interface CharacterSheet {
    subrace?: string;
}

interface FeaturePrerequisite {
    subrace?: string;
}

interface RacialTrait {
    subrace?: string;
}
```

**FeatureQuery Methods:**
- `getRacialTraitsForSubrace(race, subrace)` - Get traits for specific subrace
- `validatePrerequisites(feature, character)` - Validates subrace requirements

---

### Custom Classes

**For comprehensive guide, examples, and best practices:** See [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)

The engine supports template-based custom classes through the ExtensionManager. Custom classes can extend existing D&D 5e base classes or be defined from scratch.

#### API Interfaces

```typescript
interface ClassDataEntry {
    name: string;
    primary_ability: Ability;
    hit_die: number;
    saving_throws: Ability[];
    is_spellcaster: boolean;
    skill_count: number;
    available_skills: string[];
    has_expertise: boolean;
    expertise_count?: number;
    baseClass?: Class;
    audio_preferences?: { ... };
}
```

**Helper Functions:**
- `getClassData(className: string)` - Get class data from default or custom classes
- `getClassSpellList(className: string)` - Get spell list for class
- `getSpellSlotsForClass(className: string, level: number)` - Get spell slots for class

---

## Cross-References

- For quick overview, see [spec.md](specs/001-core-engine/spec.md)
- For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)
- For equipment system guide, see [docs/EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)
- For prerequisites guide, see [docs/PREREQUISITES.md](docs/PREREQUISITES.md)
- For custom content guide, see [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md)
- For extensibility guide, see [docs/EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)
