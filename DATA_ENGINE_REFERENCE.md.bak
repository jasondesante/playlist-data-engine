# Data Engine Reference

Complete API reference for the Playlist Data Engine. Contains all type definitions, class constructors, and method signatures.

**For quick overview, see [spec.md](specs/001-core-engine/spec.md)**
**For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)**

## Table of Contents

1. [Data Types](#data-types)
2. [Core Modules](#core-modules)
3. [Progression System](#progression-system)
4. [Environmental Sensors](#environmental-sensors)
5. [Gaming Integration](#gaming-integration)
6. [Combat System](#combat-system)
7. [Equipment System](#equipment-system)
   - [Equipment Types](#equipment-types)
   - [Equipment Properties](#equipment-properties)
   - [Equipment Effects](#equipment-effects)
   - [Equipment Generator](#equipment-generator)
   - [Equipment Modifier](#equipment-modifier)
   - [Equipment Spawn Helper](#equipment-spawn-helper)
8. [Extensibility System](#extensibility-system)
   - [ExtensionManager](#extensionmanager)
   - [FeatureRegistry](#featureregistry)
   - [SkillRegistry](#skillregistry)
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
9. [Cross-References](#cross-references)

---

## Data Types

Type definitions for all core data structures.

### ServerlessPlaylist

The main container object returned by the `PlaylistParser`.

```typescript
export interface ServerlessPlaylist {
    // --- Playlist Metadata ---
    name: string;           // Name of the playlist
    description?: string;   // Optional description
    image: string;          // URL to playlist cover art
    creator: string;        // Wallet address of the curator
    genre?: string;         // General genre
    tags?: string[];        // Search tags

    // --- The Content ---
    tracks: PlaylistTrack[]; // Array of flattened track objects
}
```

### PlaylistTrack

**CRITICAL:** This is the object that contains the audio file URL.

```typescript
export interface PlaylistTrack {
    // --- Identity & Blockchain Data (The Outer Shell) ---
    id: string;             // e.g. "ethereum-0xContract-1" or "AR-{tx_id}"
    uuid: string;           // Unique instance ID for the game engine
    playlist_index: number; // Order in the playlist

    chain_name: string;     // e.g. "ethereum", "optimism", "AR"
    token_address?: string; // Contract Address (or 0x0 for files). Not present for AR chain.
    token_id?: string;      // Token ID (or 0 for files). Not present for AR chain.
    tx_id?: string;         // Arweave transaction ID (only present when chain_name is "AR")
    platform: string;       // e.g. "sound", "catalog", "contract-wizard"

    // --- Content Data (The Inner Core - Extracted from Metadata) ---
    title: string;          // Extracted via Naming Logic
    artist: string;         // Extracted via Artist Logic
    description?: string;   // Description of the track
    album?: string;         // Album name

    // --- Assets (The Extracted Media) ---
    image_url: string;      // The result of the Image Extraction Logic
    audio_url: string;      // The result of the Audio Extraction Logic
    duration: number;       // In seconds (parsed or estimated)

    // --- Meta Tags ---
    genre: string;          // Primary genre
    tags: string[];         // All tags lowercased
    bpm?: number;           // If available in metadata
    key?: string;           // If available in metadata

    // --- Raw Attributes (for edge cases) ---
    attributes?: Record<string, string | number>;
}
```

### RawArweavePlaylist

The raw input schema received from Arweave before parsing.

```typescript
export interface RawArweavePlaylist {
    name: string;
    image: string;
    creator: string;
    description?: string;
    genre?: string;
    tags?: string[];
    tracks: Array<{
        // Outer Blockchain Data
        chain_name: string;
        token_address?: string;  // Not present for AR chain
        token_id?: string;       // Not present for AR chain
        tx_id?: string;          // Arweave transaction ID (only present when chain_name is "AR")
        platform: string;
        id?: string;
        uuid?: string;
        // The Stringified Payload
        metadata: string; // "{ \"name\": \"Song\", \"audio_url\": ... }"
    }>;
}
```

### AudioProfile

Result of the `AudioAnalyzer`. Used to generate characters.

```typescript
export interface AudioProfile {
    /** Bass dominance (0.0 - 1.0) */
    bass_dominance: number;

    /** Mid-range dominance (0.0 - 1.0) */
    mid_dominance: number;

    /** Treble dominance (0.0 - 1.0) */
    treble_dominance: number;

    /** Average amplitude (0.0 - 1.0) */
    average_amplitude: number;

    /** Advanced metrics (optional) */
    spectral_centroid?: number;
    spectral_rolloff?: number;
    zero_crossing_rate?: number;

    /** Color palette extracted from artwork (optional) */
    color_palette?: ColorPalette;

    /** Analysis metadata */
    analysis_metadata: {
        /** Duration of audio analyzed in seconds */
        duration_analyzed: number;

        /** Whether full buffer was analyzed (true for files < 3s) */
        full_buffer_analyzed: boolean;

        /** Sample positions used (percentages) */
        sample_positions: number[];

        /** Timestamp of analysis */
        analyzed_at: string;
    };
}
```

### ColorPalette

Defines a color scheme derived from audio analysis.

```typescript
export interface ColorPalette {
    primary: string;
    secondary: string;
    tertiary: string;
    background: string;
    text: string;
    isMonochrome: boolean;
    brightness: number; // 0-1
    saturation: number; // 0-1
    colors: string[]; // Full palette
}
```

**Note**: There is also a ColorPalette definition in `AudioProfile.ts` with different property names (`primary_color` vs `primary`, `is_monochrome` vs `isMonochrome`). The definition above (from `ColorPalette.ts`) is the canonical version.

### FrequencyBands

Audio frequency band separation for analysis.

```typescript
export interface FrequencyBands {
    /** Bass frequencies (20Hz - 250Hz) */
    bass: number[];
    /** Mid frequencies (250Hz - 4kHz) */
    mid: number[];
    /** Treble frequencies (4kHz - 20kHz) */
    treble: number[];
}
```

### Character Types

```typescript
export type Race =
    | 'Human'
    | 'Elf'
    | 'Dwarf'
    | 'Halfling'
    | 'Dragonborn'
    | 'Gnome'
    | 'Half-Elf'
    | 'Half-Orc'
    | 'Tiefling';

export type Class =
    | 'Barbarian'
    | 'Bard'
    | 'Cleric'
    | 'Druid'
    | 'Fighter'
    | 'Monk'
    | 'Paladin'
    | 'Ranger'
    | 'Rogue'
    | 'Sorcerer'
    | 'Warlock'
    | 'Wizard';

export type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

export type Skill =
    | 'athletics'
    | 'acrobatics'
    | 'sleight_of_hand'
    | 'stealth'
    | 'arcana'
    | 'history'
    | 'investigation'
    | 'nature'
    | 'religion'
    | 'animal_handling'
    | 'insight'
    | 'medicine'
    | 'perception'
    | 'survival'
    | 'deception'
    | 'intimidation'
    | 'performance'
    | 'persuasion';

export type ProficiencyLevel = 'none' | 'proficient' | 'expertise';

export type GameMode = 'standard' | 'uncapped';

export interface Attack {
    name: string;
    bonus?: number;
    attack_bonus?: number;
    damage?: string;
    damage_dice?: string;
    damage_type?: string;
    type?: 'melee' | 'ranged' | 'spell';
    range?: number;
}

export interface Spell {
    name: string;
    level?: number;
    school?: string;
    casting_time?: string;
    range?: string;
    duration?: string;
    components?: string[];
    description?: string;
    damage_dice?: string;
    damage_type?: string;
    attack_roll?: boolean;
    saving_throw?: string;
}

export interface AbilityScores {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
    // Aliases for compatibility
    dexterity?: number;
    strength?: number;
    constitution?: number;
}
```

### CharacterSheet

The complete D&D 5e character object.

```typescript
export interface CharacterSheet {
    /** Character name */
    name: string;

    /** Race */
    race: Race;

    /** Class */
    class: Class;

    /** Current level (1-20) */
    level: number;

    /** Ability scores */
    ability_scores: AbilityScores;

    /** Ability modifiers (calculated from scores) */
    ability_modifiers: AbilityScores;

    /** Proficiency bonus (based on level) */
    proficiency_bonus: number;

    /** Hit points */
    hp: {
        current: number;
        max: number;
        temp: number;
    };

    /** Armor class */
    armor_class: number;

    /** Initiative bonus */
    initiative: number;

    /** Speed in feet */
    speed: number;

    /** Skill proficiencies */
    skills: Record<Skill, ProficiencyLevel>;

    /** Saving throw proficiencies */
    saving_throws: Record<Ability, boolean>;

    /** Racial traits */
    racial_traits: string[];

    /** Class features */
    class_features: string[];

    /** Spells (for spellcasters) */
    spells?: {
        spell_slots: Record<number, { total: number; used: number }>;
        known_spells: string[];
        cantrips: string[];
    };

    /** Equipment */
    equipment?: {
        weapons: string[];
        armor: string[];
        items: string[];
    };

    /** Character appearance */
    appearance?: {
        /** Deterministic features from seed */
        body_type: string;
        skin_tone: string;
        hair_style: string;
        hair_color: string;
        eye_color: string;
        facial_features: string[];

        /** Dynamic features from audio/visual */
        primary_color?: string;
        secondary_color?: string;
        aura_color?: string;
    };

    /** Experience points */
    xp: {
        current: number;
        next_level: number;
    };

    /** Track seed this character was generated from */
    seed: string;

    /** Generation timestamp */
    generated_at: string;

    /** Game mode for stat progression (standard = capped at 20, uncapped = no limits) */
    gameMode?: GameMode;

}
```

### CharacterEquipment

Equipment and inventory state for a character.

```typescript
export interface InventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
}

export interface CharacterEquipment {
    weapons: InventoryItem[];
    armor: InventoryItem[];
    items: InventoryItem[];
    totalWeight: number;
    equippedWeight: number;
}
```

### CharacterAppearance

Visual appearance details for a character.

```typescript
export interface CharacterAppearance {
    // Deterministic features (from seed)
    body_type: 'slender' | 'athletic' | 'muscular' | 'stocky';
    skin_tone: string;
    hair_style: string;
    hair_color: string;
    eye_color: string;
    facial_features: string[];
    // Dynamic features (from audio/visual)
    primary_color?: string;
    secondary_color?: string;
    aura_color?: string;
}
```

### EnvironmentalContext

Aggregated environmental sensor data.

```typescript
export interface EnvironmentalContext {
    geolocation?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    light?: LightData;

    // Derived gameplay data
    biome?: 'urban' | 'forest' | 'desert' | 'mountain' | 'valley' | 'water' | 'tundra' | 'plains' | 'jungle' | 'swamp' | 'taiga' | 'savanna';

    // Composite XP multiplier (0.5 to 3.0)
    environmental_xp_modifier?: number;
    timestamp: number;
}

export interface GeolocationData {
    latitude: number;
    longitude: number;
    altitude: number | null;      // Meters above sea level (null if unavailable)
    accuracy: number;             // Meters
    altitude_accuracy?: number;
    heading: number | null;       // Direction 0-360 degrees (null if unavailable)
    speed: number | null;         // Meters per second (null if unavailable)
    timestamp: number;            // Unix timestamp
}

export interface MotionData {
    acceleration: {
        x: number;  // m/s²
        y: number;
        z: number;
    };
    acceleration_with_gravity: {
        x: number;
        y: number;
        z: number;
    };
    rotation_rate: {
        alpha: number;  // degrees/second
        beta: number;
        gamma: number;
    };
    movement_intensity: number;   // 0.0 to 1.0
    activity_type: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown';
    timestamp: number;
}

export interface WeatherData {
    temperature: number;          // Celsius
    feels_like: number;           // Apparent temperature
    humidity: number;             // Percentage
    pressure: number;             // hPa
    weather_type: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'mist' | 'fog';
    wind_speed: number;           // m/s
    wind_direction: number;       // Degrees
    visibility: number;           // Meters
    is_night: boolean;            // Based on sunrise/sunset times
    moon_phase?: number;          // 0.0 to 1.0 (new to full)
    timestamp: number;
}

export interface LightData {
    illuminance: number;          // lux (light intensity)
    timestamp: number;
    environment: 'bright_daylight' | 'indoor' | 'dim' | 'dark';
}

export interface ForecastData {
    temperature: number;          // Celsius
    humidity: number;             // Percentage
    pressure: number;             // hPa
    weatherType: string;          // e.g., 'Clear', 'Rain', 'Clouds'
    windSpeed: number;           // m/s
    windDirection: number;       // Degrees
    timestamp: number;
    forecastTime: Date;          // When this forecast is for
    probabilityOfPrecipitation: number; // 0.0 to 1.0
}
```

### Sensor-Related Types

```typescript
export type SensorType = 'geolocation' | 'motion' | 'weather' | 'light';

export interface PerformanceMetrics {
    successCount: number;        // Number of successful API calls
    errorCount: number;          // Number of failed API calls
    totalTime: number;           // Total time spent on successful API calls (milliseconds)
    minTime: number;             // Time of the fastest API call (milliseconds)
    maxTime: number;             // Time of the slowest API call (milliseconds)
    lastCallTimestamp: number | null;
}

export interface PerformanceStatistics {
    average: number;             // Average API call time in milliseconds
    min: number;                 // Minimum API call time in milliseconds
    max: number;                 // Maximum API call time in milliseconds
    totalCalls: number;          // Total number of API calls
    successRate: number;         // Success rate as percentage (0-100)
}

export interface SensorPermission {
    type: SensorType;
    granted: boolean;
    timestamp: number;
}

export type SensorHealthStatus = 'healthy' | 'degraded' | 'failed' | 'unknown';

export interface SensorStatus {
    type: SensorType;
    health: SensorHealthStatus;
    lastSuccessTimestamp: number | null;
    lastFailureTimestamp: number | null;
    consecutiveFailures: number;
    totalFailures: number;
    lastError: string | null;
    isRetrying: boolean;
}

export interface SensorFailureLog {
    sensorType: SensorType;
    timestamp: number;
    error: string;
    retryAttempt: number;
    willRetry: boolean;
}

export interface SensorRetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export interface SensorRecoveryNotification {
    sensorType: SensorType;
    previousStatus: SensorHealthStatus;
    newStatus: SensorHealthStatus;
    timestamp: number;
    message: string;
}

export interface SevereWeatherAlert {
    type: 'Blizzard' | 'Hurricane' | 'Typhoon' | 'Tornado' | 'None';
    xpBonus: number;             // 0.5 to 1.0 (50% to 100%)
    severity: 'moderate' | 'high' | 'extreme';
    message: string;
    detectedAt: number;
}
```

### GamingContext

Steam gaming activity data. Note: Discord RPC CANNOT read game activity due to platform limitations. Discord RPC is only used for SETTING music presence ("Listening to" status).

```typescript
export interface GamingContext {
    isActivelyGaming: boolean;
    platformSource: 'steam' | 'none';

    currentGame?: {
        name: string;
        source: 'steam';
        genre?: string[];
        sessionDuration?: number;  // Minutes in current session
        partySize?: number;        // Multiplayer party size
    };

    totalGamingMinutes: number;   // Lifetime gaming while listening
    gamesPlayedWhileListening: string[];
    lastUpdated: number;          // Timestamp of last check
}
```

### CombatInstance

State of an active combat encounter.

```typescript
export interface CombatInstance {
  id: string;
  combatants: Combatant[];
  currentTurnIndex: number;  // Index into combatants array
  roundNumber: number;
  environment?: EnvironmentalContext;
  history: CombatAction[];   // Log of all actions taken
  isActive: boolean;
  winner?: Combatant;        // Set when combat ends
  startTime: number;
  lastUpdated: number;
}

export interface Combatant {
  id: string;             // Unique ID within combat instance
  character: CharacterSheet;
  initiative: number;     // Initiative roll result
  currentHP: number;      // Current hit points
  temporaryHP?: number;   // Temporary hit points (damage is taken from these first)
  statusEffects: StatusEffect[];
  position?: {
    x: number;
    y: number;
  };                      // Optional tactical position
  isDefeated: boolean;    // Whether combatant is unconscious/defeated
  actionUsed: boolean;    // Has action been used this turn
  bonusActionUsed: boolean;
  reactionUsed: boolean;
  spellSlots?: {          // Remaining spell slots by level (if applicable)
    [level: number]: number;
  };
}

export interface CombatAction {
  type: 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready';
  actor: Combatant;
  target?: Combatant;
  targets?: Combatant[];
  attack?: Attack;
  spell?: Spell;
  result?: CombatActionResult;
}

export interface StatusEffect {
  name: string;           // e.g., "Charmed", "Frightened", "Prone"
  description: string;
  duration: number;       // Rounds remaining
  source?: string;        // Which combatant applied this
  hasConcentration?: boolean;  // Some effects require concentration
}

export interface CombatActionResult {
  success: boolean;
  roll?: number;          // d20 roll result
  isCritical?: boolean;
  damage?: number;
  damageType?: string;
  targetHP?: number;
  description: string;
}

export interface AttackRoll {
  d20Roll: number;        // The d20 roll (1-20)
  attackBonus: number;    // Modifier added (ability mod + proficiency)
  totalRoll: number;      // d20 + attackBonus
  targetAC: number;       // Defense of target
  hit: boolean;           // Whether attack hit
  isCritical: boolean;    // Natural 20
  isMiss: boolean;        // Natural 1
}

export interface DamageRoll {
  diceFormula: string;    // e.g., "2d6", "1d8+3"
  rolls: number[];        // Individual die rolls
  modifier?: number;      // Ability modifier added
  total: number;          // Sum of rolls + modifier
  isCritical: boolean;    // If critical hit, dice are doubled
}

export interface SpellCastResult {
  success: boolean;
  spellName: string;
  caster: Combatant;
  targets: Combatant[];
  saveDC?: number;        // Difficulty class for saving throw
  damage?: DamageRoll;
  effectsApplied: StatusEffect[];
  spellSlotUsed: number;  // Spell level
  description: string;
}

export interface CombatResult {
  winner: Combatant;
  defeated: Combatant[];
  roundsElapsed: number;
  totalTurns: number;
  xpAwarded: number;
  treasureAwarded?: {
    gold: number;
    items: any[];
  };
  description: string;
}

export interface CombatConfig {
  useEnvironment?: boolean;     // Apply environmental context to combat (weather, altitude, etc.)
  useMusic?: boolean;           // Apply music-based buffs to character stats
  tacticalMode?: boolean;       // Enable position-based distance mechanics
  maxTurnsBeforeDraw?: number;  // Turn limit before combat is a draw (default: 100)
  allowFleeing?: boolean;       // Can combatants attempt to flee
}
```

### Additional Combat Types

```typescript
export type DamageType =
  | 'slashing' | 'piercing' | 'bludgeoning'  // Physical
  | 'fire' | 'cold' | 'lightning' | 'thunder' | 'poison' | 'acid'  // Elemental
  | 'necrotic' | 'radiant' | 'psychic' | 'force';  // Magical

export type SavingThrowAbility = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
```

### Combat Helper Types

```typescript
export interface InitiativeResult {
    combatant: Combatant;
    d20Roll: number;
    dexModifier: number;
    initiativeTotal: number;
}

export interface AttackResult {
    attacker: Combatant;
    target: Combatant;
    attack: Attack;
    attackRoll: AttackRoll;
    damageRoll?: DamageRoll;
    hpAfterDamage?: number;
    description: string;
}

export interface SpellSlots {
    /** Record of spell slots by spell level (0-9) */
    spell_slots: Record<number, { total: number; used: number }>;
    /** Array of known spell names */
    known_spells: string[];
    /** Array of cantrip names */
    cantrips: string[];
}
```

---

### Utilities

**Hashing & Seeds**

- `generateSeed(chain: string, address: string, id: string): string`
    - Creates a unique seed string.
- `hashSeedToFloat(seed: string): number`
    - Returns a float between 0.0 and 1.0.
- `hashSeedToInt(seed: string, min: number, max: number): number`
    - Returns an integer in range [min, max).

**Randomness**

- `class SeededRNG`
    - `constructor(seed: string)`
    - `random(): number`: Returns float 0-1.
    - `randomInt(min: number, max: number): number`: Returns integer.
    - `randomChoice<T>(array: T[]): T`: Selects random element.
    - `weightedChoice<T>(choices: [T, number][]): T`: Selects based on weights.
    - `shuffle<T>(array: T[]): T[]`: Deterministically shuffles array.

**Validation Schemas**

- `PlaylistTrackSchema`: Validates track metadata.
- `ServerlessPlaylistSchema`: Validates full playlist.
- `AudioProfileSchema`: Validates audio analysis.
- `CharacterSheetSchema`: Validates character data.

---

### Game Data Reference

These constants are exported for use in your application.

#### Available Races (`ALL_RACES`)
- Human
- Elf
- Dwarf
- Halfling
- Dragonborn
- Gnome
- Half-Elf
- Half-Orc
- Tiefling

#### Available Classes (`ALL_CLASSES`)
- Barbarian
- Bard
- Cleric
- Druid
- Fighter
- Monk
- Paladin
- Ranger
- Rogue
- Sorcerer
- Warlock
- Wizard

#### Data Structures
- `RACE_DATA`: Object containing ability bonuses, speed, and traits for each race.
- `CLASS_DATA`: Object containing hit dice, saving throws, and skill options for each class.
- `XP_THRESHOLDS`: Mapping of Level (1-20) to XP required.
- `SPELL_DATABASE`: Comprehensive list of D&D 5e spells with details.
- `EQUIPMENT_DATABASE`: Stats for weapons, armor, and items.

---

### Core Modules

### PlaylistParser

**Location:** `src/core/parser/PlaylistParser.ts`

The `PlaylistParser` is responsible for converting raw JSON data (typically from Arweave) into a standardized `ServerlessPlaylist` object. It handles metadata extraction, validation, and flattening of nested structures.

#### Class: `PlaylistParser`

**Constructor:**
```typescript
new PlaylistParser(options?: PlaylistParserOptions)
```
- `options.validateAudioUrls` (boolean): If true, performs a HEAD request to verify audio URLs exist. Default: `false`.
- `options.strict` (boolean): If true, throws errors on invalid tracks instead of skipping them. Default: `false`.

**Methods:**

- `async parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist>`
    - Parses the raw playlist data.
    - **Returns:** A `ServerlessPlaylist` object containing metadata and an array of `PlaylistTrack` objects.
    - **Throws:** Error if `strict` mode is on and parsing fails.

#### Helper: `MetadataExtractor`

**Location:** `src/core/parser/MetadataExtractor.ts`

Extracts metadata with priority queue logic. All methods are static.

- `static extractAudioUrl(data: Record<string, unknown>): string | null`
    - Extracts audio URL with priority: mp3_url > lossy_audio > audio_url > lossless_audio > animation_url
- `static extractImageUrl(data: Record<string, unknown>): string | null`
    - Extracts image URL with priority: image_small > image > image_large > image_thumb
- `static extractTitle(data: Record<string, unknown>): string | null`
    - Extracts name/title with priority: name > title
- `static extractArtist(data: Record<string, unknown>): string | null`
    - Extracts artist with priority: artist > created_by > minter
- `static parseMetadata(metadata: unknown): Record<string, unknown> | null`
    - Parses metadata string to JSON object with error handling
- `static convertAttributes(attributes: unknown): Record<string, string | number> | null`
    - Converts OpenSea-style attributes array to key-value object

---

### AudioAnalyzer

**Location:** `src/core/analysis/AudioAnalyzer.ts`

The `AudioAnalyzer` extracts sonic fingerprints from audio files using Web Audio API. It uses a "Triple Tap" strategy to analyze audio at 5%, 40%, and 70% marks for a representative profile.

#### Class: `AudioAnalyzer`

**Constructor:**
```typescript
new AudioAnalyzer(options?: AudioAnalyzerOptions)
```
- `options.includeAdvancedMetrics` (boolean): Calculate spectral centroid, rolloff, and zero crossing rate. Default: `false`.
- `options.sampleRate` (number): Sample rate in Hz. Default: `44100`.
- `options.fftSize` (number): FFT size (power of 2). Default: `2048`.

**Methods:**

- `async extractSonicFingerprint(audioUrl: string): Promise<AudioProfile>`
    - Downloads and analyzes the audio file.
    - **Returns:** `AudioProfile` containing:
        - `bass_dominance`, `mid_dominance`, `treble_dominance` (0-255 scale)
        - `average_amplitude`
        - `spectral_centroid`, `spectral_rolloff`, `zero_crossing_rate` (if enabled)
        - `analysis_metadata`

#### Helper: `ColorExtractor`

**Location:** `src/core/analysis/ColorExtractor.ts`

Extracts dominant colors from an image URL.

- `async extractPalette(imageUrl: string): Promise<ColorPalette>`
    - Uses K-Means clustering (k=4) to find dominant colors.
    - Falls back to Median Cut algorithm if K-Means fails.
    - Calculates brightness, saturation, and monochrome status.

#### Helper: `SpectrumScanner`

**Location:** `src/core/analysis/SpectrumScanner.ts`

Separates raw frequency data into bands.

- `static separateFrequencyBands(frequencyData: Uint8Array, sampleRate: number): FrequencyBands`
    - **Bass:** 20Hz - 250Hz
    - **Mid:** 250Hz - 4kHz
    - **Treble:** 4kHz - 20kHz

---

### CharacterGenerator

**Location:** `src/core/generation/CharacterGenerator.ts`

The `CharacterGenerator` creates deterministic D&D 5e character sheets based on a seed and an audio profile.

#### Class: `CharacterGenerator`

**Methods:**

- `static generate(seed: string, audioProfile: AudioProfile, name: string, options?: CharacterGeneratorOptions): CharacterSheet`
    - **Parameters:**
        - `seed`: Unique string (e.g., track ID) to ensure deterministic results.
        - `audioProfile`: The audio analysis result.
        - `name`: Character name.
        - `options.level`: Starting level (1-20). Default: `1`.
        - `options.forceClass`: Override the suggested class.
        - `options.gameMode`: Game mode for stat progression (`'standard'` or `'uncapped'`). Default: `'standard'`.
    - **Returns:** A complete `CharacterSheet` with:
        - Race, Class, Level
        - Ability Scores (STR, DEX, etc.)
        - Skills, Spells, Equipment
        - Appearance (derived from audio/seed)

#### Helper: `RaceSelector`

**Location:** `src/core/generation/RaceSelector.ts`

Deterministically selects a race based on the seed.

- `static select(rng: SeededRNG): Race`
    - Selects from: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling.

#### Helper: `ClassSuggester`

**Location:** `src/core/generation/ClassSuggester.ts`

Suggests a class based on audio frequency dominance.

- `static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class`
    - **High Bass:** Barbarian, Fighter, Paladin
    - **High Treble:** Rogue, Ranger, Monk
    - **High Mid:** Wizard, Cleric, Druid
    - **High Amplitude:** Bard, Sorcerer, Warlock

#### Helper: `AbilityScoreCalculator`

**Location:** `src/core/generation/AbilityScoreCalculator.ts`

Maps audio profile to ability scores (STR, DEX, CON, INT, WIS, CHA).

- `static calculateBaseScores(audioProfile: AudioProfile): AbilityScores`
    - **STR:** Bass dominance
    - **DEX:** Treble dominance
    - **CON:** Average amplitude
    - **INT:** Mid dominance
    - **WIS:** Balance between bass and treble
    - **CHA:** Combined mid and amplitude
- `static applyRacialBonuses(baseScores: AbilityScores, race: Race): AbilityScores`
    - Adds +2 bonuses based on race.
- `static calculateModifiers(scores: AbilityScores): AbilityScores`
    - Calculates D&D 5e modifiers (e.g., 15 -> +2).

#### Helper: `SkillAssigner`

**Location:** `src/core/generation/SkillAssigner.ts`

Assigns skill proficiencies based on class.

- `static assignSkills(characterClass: Class, rng: SeededRNG): Record<Skill, ProficiencyLevel>`
    - Selects random skills from the class's available list.
    - Handles "Expertise" for Bards and Rogues.

#### Helper: `SpellManager`

**Location:** `src/core/generation/SpellManager.ts`

Manages spells for spellcasting classes.

- `static isSpellcaster(characterClass: Class): boolean`
    - Returns true if the class can cast spells.
- `static getSpellSlots(characterClass: Class, characterLevel: number): Record<number, { total: number; used: number }>`
    - Gets spell slot counts for a class at a given level.
- `static getCantrips(characterClass: Class): string[]`
    - Returns all available cantrips for a spellcasting class.
- `static getKnownSpells(characterClass: Class, characterLevel: number): string[]`
    - Returns all spells known by a spellcaster at a given level.
- `static initializeSpells(characterClass: Class, characterLevel: number): SpellSlots`
    - Returns complete spell configuration with slots, known spells, and cantrips.
- `static getSpellCountAtLevel(spellLevel: number, spellSlots: Record<number, { total: number; used: number }>): number`
    - Returns number of spell slots at a given level.
- `static useSpellSlot(spellSlots: Record<number, { total: number; used: number }>, spellLevel: number): Record<number, { total: number; used: number }>`
    - Consumes one spell slot at the specified level.
- `static restoreSpellSlots(spellSlots: Record<number, { total: number; used: number }>, spellLevel?: number): Record<number, { total: number; used: number }>`
    - Restores spell slots at a specific level or all levels.

#### Helper: `EquipmentGenerator`

**Location:** `src/core/generation/EquipmentGenerator.ts`

Manages inventory and starting gear.

- `static getStartingEquipment(characterClass: Class): { weapons: string[]; armor: string[]; items: string[] }`
    - Returns starting equipment list for a class.
- `static initializeEquipment(characterClass: Class): CharacterEquipment`
    - Creates complete equipment state with starting gear equipped.
- `static addItem(equipment: CharacterEquipment, itemName: string, quantity: number): CharacterEquipment`
    - Adds an item to inventory and recalculates weight.
- `static removeItem(equipment: CharacterEquipment, itemName: string, quantity: number): CharacterEquipment`
    - Removes an item from inventory and recalculates weight.
- `static equipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment`
    - Equips an item from inventory.
- `static unequipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment`
    - Unequips an item from inventory.
- `static getInventoryList(equipment: CharacterEquipment): InventoryItem[]`
    - Returns flattened list of all inventory items.

#### Helper: `AppearanceGenerator`

**Location:** `src/core/generation/AppearanceGenerator.ts`

Generates visual traits.

- `static generate(seed: string, characterClass: Class, audioProfile: AudioProfile): CharacterAppearance`
    - **Deterministic:** Body type, skin tone, hair style/color, eye color.
    - **Dynamic:** Primary color (from album art), Aura color (magical classes).

#### Helper: `NamingEngine`

**Location:** `src/core/generation/NamingEngine.ts`

Generates RPG-style names from track metadata.

- `generateName(track: PlaylistTrack, audioProfile: AudioProfile): string`
    - **Formats:**
        - Class Title: "Sonic Bard"
        - Adjective Construct: "Midnight Echoes"
        - Clan Construct: "Harmonix Collective"
- `cleanTitle(title: string): string`
    - Removes "(Official Video)", "ft.", etc.

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

Orchestrates applying session results to a character, handling leveling up and mastery.

#### Class: `CharacterUpdater`

**Methods:**

- `addXP(character: CharacterSheet, xpAmount: number, source?: string): Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'>`
  - Add XP from any source (combat, quests, custom activities)
  - Triggers the same level-up system as listening sessions
  - Returns detailed level-up breakdowns if character levels up

- `updateCharacterFromSession(character: CharacterSheet, session: ListeningSession, track?: PlaylistTrack, previousListenCount?: number): CharacterUpdateResult`
  - Update character from a completed listening session
  - Calculates XP based on session duration and modifiers
  - Handles track mastery bonuses

**Default Behavior - Auto-Detected by gameMode:**

`CharacterUpdater` auto-detects the appropriate stat increase strategy based on the character's `gameMode`:

- **Standard mode** (capped at level 20) → Manual D&D 5e rules (`dnD5e` strategy)
  - 2-step level-up process: XP adds HP/proficiency/features, but stats require manual selection
  - Stores pending stat increases in a counter
  - User completes level-up by calling `applyPendingStatIncrease()`

- **Uncapped mode** → Automatic stat selection (`dnD5e_smart` strategy)
  - 1-step level-up process: Everything applied automatically
  - Intelligently boosts class's primary stat or lowest stats
  - No manual interaction required

**To override the auto-detected strategy**, pass a custom `StatManager`:

```typescript
import { StatManager, CharacterUpdater } from 'playlist-data-engine';

// Force automatic mode even for standard characters
const statManager = new StatManager({ strategy: 'dnD5e_smart' });
const updater = new CharacterUpdater(statManager);

// Force manual mode even for uncapped characters
const manualStatManager = new StatManager({ strategy: 'dnD5e' });
const manualUpdater = new CharacterUpdater(manualStatManager);
```

### addXP() - Adding XP from Any Source

**Use this method** when you want to award XP from sources other than music listening:

```typescript
const updater = new CharacterUpdater();

// Combat victory XP
const combatResult = updater.addXP(character, 500, 'combat');

// Quest completion XP
const questResult = updater.addXP(character, 1000, 'quest');

// Custom activity XP
const customResult = updater.addXP(character, 250, 'exploration');

// All sources return the same detailed level-up information
if (combatResult.leveledUp && combatResult.levelUpDetails) {
    console.log(`🎉 LEVELED UP to ${combatResult.newLevel}!`);

    for (const detail of combatResult.levelUpDetails) {
        console.log(`💚 HP: +${detail.hpIncrease} (new max: ${detail.newMaxHP})`);

        if (detail.statIncreases && detail.statIncreases.length > 0) {
            console.log(`📊 STATS INCREASED:`);
            for (const stat of detail.statIncreases) {
                console.log(`   ${stat.ability}: ${stat.oldValue} → ${stat.newValue} (+${stat.delta})`);
            }
        }
    }
}
```

**Return Type:**
```typescript
{
    character: CharacterSheet;      // Updated character
    xpEarned: number;               // XP amount added
    leveledUp: boolean;             // Whether character leveled up
    newLevel?: number;              // New level (if leveled up)
    levelUpDetails?: LevelUpDetail[]; // Detailed breakdown of each level-up
}
```

**Key Differences from `updateCharacterFromSession()`:**
- No track mastery bonuses (specific to music listening)
- Direct XP amount instead of calculated from session duration
- **Auto-detects strategy based on character's gameMode**
- Same level-up system and detailed breakdowns

### Pending Stat Increases (Manual Level-Up)

When using manual mode (standard gameMode or `dnD5e` strategy), level-ups become a 2-step process:

1. **Step 1**: Add XP → Character gains level with HP/proficiency/features applied
2. **Step 2**: User selects stats → Complete the level-up

**Methods:**

- `applyPendingStatIncrease(character: CharacterSheet, primaryStat: Ability, secondaryStats?: Ability[]): ApplyPendingStatIncreaseResult`
  - Apply a pending stat increase with user-selected stats
  - Only works if `pendingStatIncreases` counter > 0
  - Validates D&D 5e rules: +2 to one ability OR +1 to two abilities
  - Decrements the counter

- `hasPendingStatIncreases(character: CharacterSheet): boolean`
  - Check if character has pending stat increases

- `getPendingStatIncreaseCount(character: CharacterSheet): number`
  - Get the count of pending stat increases

**Example - Manual Stat Selection:**

```typescript
import { CharacterUpdater } from 'playlist-data-engine';

// Standard mode (capped) defaults to manual stat selection
const character = CharacterGenerator.generate(seed, audio, 'Hero', { gameMode: 'standard' });
const updater = new CharacterUpdater(); // No StatManager needed - auto-detected!

// Step 1: Add XP - triggers level-up but PAUSES before stats
const result = updater.addXP(character, 6500, 'quest');

console.log(result.leveledUp); // true
console.log(result.newLevel); // 5

// Check for pending stat increases
if (updater.hasPendingStatIncreases(character)) {
    const count = updater.getPendingStatIncreaseCount(character);
    console.log(`${count} stat increases pending!`);

    // Step 2: User chooses +2 to STR
    const completeResult = updater.applyPendingStatIncrease(character, 'STR');
    console.log(`STR: ${completeResult.statIncreases[0].oldValue} → ${completeResult.statIncreases[0].newValue}`);

    if (completeResult.remainingPending > 0) {
        console.log(`${completeResult.remainingPending} more stat increases waiting!`);
    }
}

// Or user chooses +1 to STR and +1 to DEX
const result2 = updater.applyPendingStatIncrease(character, 'STR', ['DEX']);
```

**Return Type:**
```typescript
{
    character: CharacterSheet;              // Updated character
    statIncreases: Array<{                  // Stats that were increased
        ability: Ability;
        oldValue: number;
        newValue: number;
        delta: number;
    }>;
    remainingPending: number;               // Counter value after applying
    timestamp: number;                      // Completion timestamp
}
```

### CharacterUpdateResult

Result of a character update operation. Now includes detailed level-up information!

```typescript
export interface CharacterUpdateResult {
    character: CharacterSheet;
    xpEarned: number;
    leveledUp: boolean;
    newLevel?: number;
    masteredTrack: boolean;
    masteryBonusXP: number;
    /** Detailed breakdown of each level-up */
    levelUpDetails?: LevelUpDetail[];
}

export interface LevelUpDetail {
    fromLevel: number;
    toLevel: number;
    hpIncrease: number;
    newMaxHP: number;
    proficiencyIncrease: number;
    newProficiency: number;
    statIncreases?: Array<{
        ability: Ability;
        oldValue: number;
        newValue: number;
        delta: number;
    }>;
    featuresGained?: string[];
    newSpellSlots?: Record<number, number>;
}
```

**Example - Displaying Level-Up Details:**

```typescript
const result = updater.updateCharacterFromSession(character, session, track, count);

if (result.leveledUp && result.levelUpDetails) {
    for (const detail of result.levelUpDetails) {
        console.log(`=== Level ${detail.fromLevel} → ${detail.toLevel} ===`);
        console.log(`HP: +${detail.hpIncrease} (new max: ${detail.newMaxHP})`);

        if (detail.proficiencyIncrease > 0) {
            console.log(`Proficiency: +${detail.proficiencyIncrease} (new: ${detail.newProficiency})`);
        }

        if (detail.statIncreases) {
            for (const stat of detail.statIncreases) {
                console.log(`${stat.ability}: ${stat.oldValue} → ${stat.newValue} (+${stat.delta})`);
            }
        }

        if (detail.featuresGained) {
            console.log(`New Features: ${detail.featuresGained.join(', ')}`);
        }
    }
}
```

#### Helper: `SessionTracker`

**Location:** `src/core/progression/SessionTracker.ts`

Manages active listening sessions.

- `startSession(trackUuid: string, track?: PlaylistTrack, context?: object): string`
    - Starts a session and returns a session ID.
- `endSession(sessionId: string, durationOverride?: number): ListeningSession | null`
    - Ends a session, calculates XP, and records it to history.
- `getActiveSession(sessionId: string): ActiveSession | null`
- `getSessionsForTrack(trackUuid: string): ListeningSession[]`
- `isTrackMastered(trackUuid: string): boolean`

#### Helper: `XPCalculator`

**Location:** `src/core/progression/XPCalculator.ts`

Calculates XP based on duration and bonuses.

- `calculateSessionXP(session: ListeningSession, track?: PlaylistTrack): number`
    - Applies base XP (1/sec), activity bonuses, environmental bonuses, and gaming bonuses.
- `getXPToNextLevel(currentLevel: number): number`
- `getLevelFromXP(totalXP: number): number`

#### Helper: `LevelUpProcessor`

**Location:** `src/core/progression/LevelUpProcessor.ts`

Handles the mechanics of leveling up a character.

### LevelUpBenefits

Benefits granted by leveling up.

```typescript
export interface LevelUpBenefits {
    newLevel: number;
    hitPointIncrease: number;
    newHitPointsTotal: number;
    proficiencyBonusIncrease: number;
    newProficiencyBonus: number;

    /** New: Support multiple stat increases */
    abilityScoreIncreases?: Array<{
        ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
        increase: number;
    }>;

    /** Deprecated: Kept for backward compatibility */
    abilityScoreIncrease?: {
        ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
        increase: number;
    };

    newSpellSlots?: Record<number, number>;
    classFeatures?: string[];
}
```
- `static applyLevelUp(character: CharacterSheet, benefits: LevelUpBenefits): CharacterSheet`
    - Applies the calculated benefits to the character sheet.
- `static getXPThreshold(level: number): number`
    - Returns XP required for a specific level.

#### Helper: `MasterySystem`

**Location:** `src/core/progression/MasterySystem.ts`

Tracks song mastery based on listen counts.

- `checkMastery(listenCount: number): boolean`
    - Returns true if listens >= `MASTERY_THRESHOLD` (default 10).
- `calculateMasteryBonus(isMastered: boolean): number`
    - Returns bonus XP if mastered.
- `isJustMastered(previous: number, current: number): boolean`
    - Returns true if mastery was achieved in the current session.

---

## Stat Increase System

**Location:** `src/core/progression/stat/StatManager.ts`

Provides comprehensive stat increase management for D&D 5e-style character progression with flexible strategies for level-ups, items, and custom formulas.

### Class: `StatManager`

**Constructor:**
```typescript
new StatManager(config?: Partial<StatIncreaseConfig>)
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
    'Hero',
    { gameMode: 'standard' }
);

// Uncapped mode with default D&D 5e pattern continuation
const epicCharacter = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Epic Hero',
    { gameMode: 'uncapped' }
);
```

The `gameMode` is stored on the character and automatically used during level-ups.

### Uncapped Progression Configuration

For uncapped mode, you can provide custom formulas for XP thresholds and proficiency bonuses that apply to ALL levels (1-∞).

```typescript
import { LevelUpProcessor, type UncappedProgressionConfig } from 'playlist-data-engine';

// Set custom formulas BEFORE generating characters
LevelUpProcessor.setUncappedConfig({
    // Your formula for XP: receives level, returns TOTAL XP required
    xpFormula: (level: number) => number,
    // Your formula for proficiency bonus: receives level, returns bonus
    proficiencyBonusFormula: (level: number) => number
});
```

**Interface: UncappedProgressionConfig**

```typescript
export interface UncappedProgressionConfig {
    /** Custom formula for calculating XP threshold for ANY level */
    xpFormula?: (level: number) => number;
    /** Custom formula for calculating proficiency bonus for ANY level */
    proficiencyBonusFormula?: (level: number) => number;
}
```

**Methods:**

- `static setUncappedConfig(config: UncappedProgressionConfig): void`
    - Sets custom formulas for uncapped mode progression
    - Pass empty object `{}` to reset to default D&D 5e pattern

- `static getUncappedConfig(): UncappedProgressionConfig | undefined`
    - Returns the current uncapped configuration

**Default Behavior (No Config Provided):**

If no custom formulas are provided, uncapped mode uses the natural continuation of D&D 5e patterns:

- **XP Formula**: `XP(n) = XP(n-1) + (n-1) × n × 500`
  - Level 21: 565,000 XP
  - Level 25: ~735,000 XP
  - Level 30: ~1,120,000 XP

- **Proficiency Bonus**: Continues +1 every 4 levels
  - Level 21-24: 6
  - Level 25-28: 7
  - Level 29-32: 8, etc.

**Example: Linear Scaling**

```typescript
LevelUpProcessor.setUncappedConfig({
    xpFormula: (level) => (level - 1) * 50000,  // 50,000 XP per level
    proficiencyBonusFormula: (level) => 2 + Math.floor((level - 1) / 2)  // +1 every 2 levels
});
```

**Example: Exponential Scaling**

```typescript
LevelUpProcessor.setUncappedConfig({
    xpFormula: (level) => Math.floor(1000 * Math.pow(1.5, level - 1)),
    proficiencyBonusFormula: (level) => 2 + Math.floor(Math.sqrt(level))
});
```

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

- `getCurrentGame(steamUserId: string): Promise<{ name: string, appId: number } | null>`
    - Fetches currently played game.
- `getGameMetadata(gameName: string): Promise<{ genre?: string[] } | null>`
    - Fetches genre tags for gaming bonuses.

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

```typescript
export interface DiscordUserInfo {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;        // Avatar hash
    globalName?: string;    // Display name
}

export interface MusicActivityDetails {
    songName: string;
    artistName?: string;
    albumArtKey?: string;
    albumName?: string;       // For album art text
    startTime?: number;       // Unix timestamp in seconds
    endTime?: number;         // Unix timestamp in seconds (replaces durationSeconds)
}

export interface DiscordActivity {
    type?: 0 | 1 | 2 | 3 | 5;  // Playing, Streaming, Listening, Watching, Competing
    details?: string;          // Main activity text (max 128 chars)
    state?: string;            // Secondary activity text (max 128 chars)
    startTimestamp?: number;
    endTimestamp?: number;
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    party?: { id?: string; size?: [current: number, max: number] };
    buttons?: Array<{ label: string; url: string }>;
    secret?: string;
}

export enum DiscordConnectionState {
    Disconnected = 'disconnected',
    Connecting = 'connecting',
    Connected = 'connected',
    DiscordUnavailable = 'discord_unavailable',
    Error = 'error',
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
    - Resolves an attack roll against AC and applies damage.
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

#### Helper: `InitiativeRoller`

**Location:** `src/core/combat/InitiativeRoller.ts`

Manages initiative system for D&D combat.

- `rollInitiativeForCombatant(combatant: Combatant): InitiativeResult`
    - Rolls initiative for a single combatant (d20 + DEX modifier)
- `rollInitiativeForAll(combatants: Combatant[]): { results: InitiativeResult[], sortedCombatants: Combatant[] }`
    - Rolls initiative for all combatants and sorts by descending initiative
- `getNextCombatant(combatants: Combatant[], currentIndex: number): { combatant: Combatant, index: number, isNewRound: boolean }`
    - Gets the next combatant in turn order (wraps around)
- `getInitiativeOrder(combatants: Combatant[]): string[]`
    - Returns formatted initiative order for display
- `rerollInitiativeForCombatant(combatant: Combatant): number`
    - Re-rolls initiative for a specific combatant
- `delayTurn(combatants: Combatant[], combatantId: string): Combatant[]`
    - Delays a combatant's turn (moves them later in initiative order)
- `resortByInitiative(combatants: Combatant[]): Combatant[]`
    - Resorts combatants by initiative value (for mid-combat joins)

#### Helper: `AttackResolver`

**Location:** `src/core/combat/AttackResolver.ts`

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

#### Helper: `SpellCaster`

**Location:** `src/core/combat/SpellCaster.ts`

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

```typescript
// Equipment Property
interface EquipmentProperty {
    type: EquipmentPropertyType;
    target: string;
    value: number | string | boolean;
    condition?: EquipmentCondition;
    description?: string;
    stackable?: boolean;
}

// Enhanced Equipment
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
    source: 'default' | 'custom';
    tags?: string[];
}

// Equipment Modification
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
interface EnhancedInventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
    modifications?: EquipmentModification[];
    templateId?: string;
    instanceId?: string;
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
        quantity?: number,
        character?: CharacterSheet
    ): CharacterEquipment;

    static removeItem(
        equipment: CharacterEquipment,
        itemName: string,
        quantity?: number,
        character?: CharacterSheet
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

    static getEquipmentData(
        itemName: string
    ): EnhancedEquipment | undefined;

    static getInventoryList(
        equipment: CharacterEquipment
    ): EnhancedInventoryItem[];

    static getEquipmentByType(
        equipment: CharacterEquipment,
        type: 'weapons' | 'armor' | 'items'
    ): EnhancedInventoryItem[];
}
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

```typescript
class ExtensionManager {
    static getInstance(): ExtensionManager

    register(category: ExtensionCategory, items: any[], options?: ExtensionOptions): void
    get(category: ExtensionCategory): any[]
    getDefaults(category: ExtensionCategory): any[]
    getCustom(category: ExtensionCategory): any[]

    setWeights(category: ExtensionCategory, weights: Record<string, number>): void
    getWeights(category: ExtensionCategory): Record<string, number>

    reset(category: ExtensionCategory): void
    resetAll(): void

    validate(category: ExtensionCategory, items: any[]): ValidationResult
    getInfo(category?: ExtensionCategory): Record<string, any>
    exportCustomData(): Record<string, any>
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

interface ExtensionOptions {
    mode?: 'relative' | 'absolute' | 'default' | 'replace';
    weights?: Record<string, number>;
    validate?: boolean;
}
```

**Basic Usage:**
```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();
manager.register('spells', [
    { name: 'Fireball', level: 3, school: 'Evocation' }
], {
    weights: { 'Fireball': 2.0 }  // Twice as common
});
```

See [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md) for:
- Complete API reference
- All category examples
- Spawn rate modes (relative, absolute, default, replace)
- Content pack creation
- Export/import functionality
- Equipment subcategories (properties, modifications, templates)
- Validation rules

### WeightedSelector

**Location:** `src/core/extensions/WeightedSelector.ts`

Utility class for weighted random selection.

```typescript
class WeightedSelector {
    static select<T>(items: T[], weights: Record<string, number>, rng: SeededRNG, mode?: SelectionMode): T
    static selectMultiple<T>(items: T[], weights: Record<string, number>, rng: SeededRNG, count: number, mode?: SelectionMode): T[]
    static getProbabilities<T>(items: T[], weights: Record<string, number>, mode?: SelectionMode): Record<string, number>
}

type SelectionMode = 'relative' | 'absolute' | 'default';
```

**Spawn Modes:**
| Mode | Behavior |
|------|----------|
| `relative` | Custom weights added to default pool |
| `absolute` | Only custom items can spawn |
| `default` | All items have equal weight |
| `replace` | Clear previous custom data before registering |

---

## Cross-References

- For quick overview, see [spec.md](specs/001-core-engine/spec.md)
- For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)

---
    - Get all racial traits for a race

- `getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[]`
    - Get racial traits for a specific subrace

- `getRacialTraitById(traitId: string): RacialTrait | undefined`
    - Get a single racial trait by ID

- `validatePrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): ValidationResult`
    - Validate feature prerequisites against a character
    - Returns validation result with unmet prerequisites if any

- `canGainFeature(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean`
    - Convenience method that returns true if character meets all prerequisites

- `getRegisteredClasses(): Class[]`
    - Get all classes that have features registered

- `getRegisteredRaces(): Race[]`
    - Get all races that have traits registered

- `getRegistryStats(): { totalClassFeatures: number; totalRacialTraits: number; classesWithFeatures: number; racesWithTraits: number }`
    - Get total count of registered features

- `reset(): void`
    - Reset the registry to initial state (clears all registered features)

- `isInitialized(): boolean`
    - Check if the registry has been initialized with defaults

- `exportRegistry(): { classFeatures: Record<string, ClassFeature[]>; racialTraits: Record<string, RacialTrait[]> }`
    - Export all registered features as JSON

#### Types

```typescript
export interface ClassFeature {
    /** Unique identifier (e.g., 'barbarian_rage', 'fighter_action_surge') */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the feature does */
    description: string;

    /** Type of feature: 'passive' | 'active' | 'resource' | 'trigger' */
    type: FeatureType;

    /** Character class this feature belongs to */
    class: Class;

    /** Level at which this feature is gained (1-20) */
    level: number;

    /** Prerequisites that must be met to gain this feature */
    prerequisites?: FeaturePrerequisite;

    /** Effects applied when this feature is gained */
    effects?: FeatureEffect[];

    /** Whether this feature is built-in or custom */
    source: 'default' | 'custom';

    /** Optional tags for filtering/categorizing */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

export interface RacialTrait {
    /** Unique identifier (e.g., 'elf_darkvision', 'dwarf_dwarven_resilience') */
    id: string;

    /** Display name shown to players */
    name: string;

    /** Detailed description of what the trait does */
    description: string;

    /** Race this trait belongs to */
    race: Race;

    /** Optional subrace requirement (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Prerequisites that must be met */
    prerequisites?: FeaturePrerequisite;

    /** Effects applied when this trait is gained */
    effects?: FeatureEffect[];

    /** Whether this trait is built-in or custom */
    source: 'default' | 'custom';

    /** Optional tags for filtering/categorizing */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

export type FeatureType = 'passive' | 'active' | 'resource' | 'trigger';

export type FeatureEffectType =
    | 'stat_bonus'           // Add to an ability score
    | 'skill_proficiency'    // Grant proficiency or expertise
    | 'ability_unlock'       // Unlock a new ability (e.g., darkvision)
    | 'passive_modifier'     // Add a constant modifier to rolls
    | 'resource_grant'       // Grant a resource pool (e.g., rage counts)
    | 'spell_slot_bonus';    // Grant additional spell slots

export interface FeatureEffect {
    /** Type of effect to apply */
    type: FeatureEffectType;

    /** Target stat, skill, or ability this affects */
    target: string;

    /** Value to apply (number for bonuses, string for unlocks, boolean for flags) */
    value: number | string | boolean;

    /** Optional condition for when this effect applies (e.g., "while raging") */
    condition?: string;

    /** Optional description of this specific effect */
    description?: string;
}

export interface FeaturePrerequisite {
    /** Minimum level required */
    level?: number;

    /** Features that must be learned first (by ID) */
    features?: string[];

    /** Minimum ability scores required */
    abilities?: Partial<Record<Ability, number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race or subrace required */
    race?: Race;

    /** Custom condition description (for manual validation) */
    custom?: string;
}

export interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of prerequisite descriptions that are not met */
    unmet?: string[];

    /** Detailed error messages */
    errors?: string[];
}
```

#### Usage Examples

**Register Custom Class Features:**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Register a custom Barbarian feature
registry.registerClassFeature({
    id: 'dragon_fury',
    name: 'Dragon Fury',
    description: 'Channel your draconic heritage to enhance your rage.',
    type: 'active',
    class: 'Barbarian',
    level: 3,
    source: 'custom',
    prerequisites: {
        level: 3,
        features: ['rage']
    },
    effects: [
        {
            type: 'stat_bonus',
            target: 'STR',
            value: 2,
            condition: 'while raging',
            description: '+2 Strength while raging'
        },
        {
            type: 'passive_modifier',
            target: 'damage',
            value: 4,
            condition: 'melee attacks while raging',
            description: '+4 damage on melee attacks while raging'
        }
    ],
    tags: ['melee', 'damage', 'rage'],
    lore: 'This ability is granted to those with dragon blood in their veins.'
});

// Register multiple features at once
registry.registerClassFeatures([
    {
        id: 'reckless_attack',
        name: 'Reckless Attack',
        description: 'You can throw aside all concern for defense...',
        type: 'active',
        class: 'Barbarian',
        level: 2,
        source: 'custom'
    },
    {
        id: 'danger_sense',
        name: 'Danger Sense',
        description: 'You gain an uncanny sense of when things nearby...',
        type: 'passive',
        class: 'Barbarian',
        level: 2,
        source: 'custom'
    }
]);
```

**Register Custom Racial Traits:**

```typescript
// Register a custom racial trait
registry.registerRacialTrait({
    id: 'dragonborn_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonborn',
    subrace: undefined, // Applies to all Dragonborn
    source: 'custom',
    effects: [
        {
            type: 'ability_unlock',
            target: 'damage_resistance',
            value: 'fire',
            description: 'Resistance to fire damage'
        }
    ]
});

// Register a subrace-specific trait
registry.registerRacialTrait({
    id: 'high_elf_weapon_training',
    name: 'High Elf Weapon Training',
    description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.',
    race: 'Elf',
    subrace: 'High Elf',
    source: 'custom',
    effects: [
        {
            type: 'skill_proficiency',
            target: 'longsword',
            value: 'proficient'
        },
        {
            type: 'skill_proficiency',
            target: 'shortsword',
            value: 'proficient'
        },
        {
            type: 'skill_proficiency',
            target: 'shortbow',
            value: 'proficient'
        },
        {
            type: 'skill_proficiency',
            target: 'longbow',
            value: 'proficient'
        }
    ]
});
```

**Query Features:**

```typescript
// Get all features for a level 5 Barbarian
const barbarianFeatures = registry.getClassFeatures('Barbarian', 5);
// Returns: rage, unarmored_defense, reckless_attack, danger_sense, extra_attack

// Get only level 3 features
const level3Features = registry.getFeaturesForLevel('Barbarian', 3);
// Returns: [dragon_fury] (if registered)

// Get racial traits for a race
const elfTraits = registry.getRacialTraits('Elf');
// Returns: darkvision, fey_ancestry, trance, etc.

// Get subrace-specific traits
const highElfTraits = registry.getRacialTraitsForSubrace('Elf', 'High Elf');
// Returns traits specific to High Elves

// Look up a specific feature
const rageFeature = registry.getClassFeatureById('rage');
console.log(rageFeature.name); // "Rage"
```

**Validate Prerequisites:**

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Generate a character
const character = CharacterGenerator.generate(seed, audioProfile, name);

// Check if character can gain a feature
const dragonFury = registry.getClassFeatureById('dragon_fury');
const canGain = registry.canGainFeature(dragonFury, character);
console.log(canGain); // true or false

// Get detailed validation result
const validation = registry.validatePrerequisites(dragonFury, character);
if (!validation.valid) {
    console.log('Unmet prerequisites:', validation.unmet);
    // e.g., ["Requires level 3 (current: 1)", "Requires feature: Rage"]
}
```

**Get Registry Statistics:**

```typescript
const stats = registry.getRegistryStats();
console.log(stats);
// {
//     totalClassFeatures: 120,
//     totalRacialTraits: 45,
//     classesWithFeatures: 12,
//     racesWithTraits: 9
// }
```

---

### SkillRegistry

**Location:** `src/core/skills/SkillRegistry.ts`

Singleton class for managing skills (default D&D 5e skills and custom skills). Supports skill registration, lookup, and categorization.

#### Class: `SkillRegistry`

**Constructor:**
```typescript
// Singleton - use getInstance() instead of new SkillRegistry()
```

**Methods:**

- `static getInstance(): SkillRegistry`
    - Returns the singleton instance

- `initializeDefaults(defaultSkills?: CustomSkill[]): void`
    - Initialize the registry with default skills
    - Uses DEFAULT_SKILLS if not provided

- `registerSkill(skill: CustomSkill): void`
    - Register a single skill
    - **Throws:** Error if skill ID already exists or ID format is invalid

- `registerSkills(skills: CustomSkill[]): void`
    - Register multiple skills at once

- `getSkill(id: string): CustomSkill | undefined`
    - Get a skill by ID

- `getAllSkills(): CustomSkill[]`
    - Get all registered skills

- `getSkillsByAbility(ability: Ability): CustomSkill[]`
    - Get skills that use a specific ability score

- `getSkillsByCategory(category: string): CustomSkill[]`
    - Get skills in a specific category

- `getCategories(): string[]`
    - Get all categories in use

- `getSkillsBySource(source: 'default' | 'custom'): CustomSkill[]`
    - Get skills by source (default or custom)

- `isValidSkill(id: string): boolean`
    - Check if a skill ID exists in the registry

- `validateSkill(skill: CustomSkill): SkillValidationResult`
    - Validate skill data structure

- `getRegistryStats(): SkillRegistryStats`
    - Get statistics about registered skills

- `reset(): void`
    - Reset the registry to initial state

- `isInitialized(): boolean`
    - Check if the registry has been initialized

- `exportRegistry(): CustomSkill[]`
    - Export all registered skills as JSON

- `unregisterSkill(id: string): boolean`
    - Remove a skill by ID
    - **Warning:** Primarily for testing; removing skills in use may cause issues

#### Types

```typescript
export interface CustomSkill {
    /** Unique identifier (e.g., 'athletics', 'survival_cold') */
    id: string;

    /** Display name (e.g., 'Athletics', 'Survival (Cold Environments)') */
    name: string;

    /** Optional description of what the skill covers */
    description?: string;

    /** The ability score used (STR, DEX, CON, INT, WIS, CHA) */
    ability: Ability;

    /** Whether affected by armor disadvantage (default: false) */
    armorPenalty?: boolean;

    /** Optional custom properties for advanced mechanics */
    customProperties?: Record<string, string | number | boolean | string[]>;

    /** Optional categories for grouping (e.g., 'exploration', 'social') */
    categories?: string[];

    /** Source: 'default' or 'custom' */
    source: 'default' | 'custom';

    /** Optional tags for additional categorization */
    tags?: string[];

    /** Optional flavor text or lore */
    lore?: string;
}

export interface SkillValidationResult {
    /** Whether the skill is valid */
    valid: boolean;
    /** Array of error messages (empty if valid) */
    errors: string[];
}

export interface SkillRegistryStats {
    /** Total number of registered skills */
    totalSkills: number;
    /** Number of default skills */
    defaultSkills: number;
    /** Number of custom skills */
    customSkills: number;
    /** Skills per ability */
    skillsByAbility: Record<Ability, number>;
    /** All categories in use */
    categories: string[];
}
```

#### Usage Examples

**Register Custom Skills:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();

// Register a single custom skill
registry.registerSkill({
    id: 'survival_cold',
    name: 'Survival (Cold Environments)',
    description: 'Expertise in surviving and traveling in cold weather conditions.',
    ability: 'WIS',
    armorPenalty: false,
    categories: ['exploration', 'environmental'],
    source: 'custom',
    tags: ['cold', 'weather', 'wilderness'],
    lore: 'Masters of cold survival learn to find shelter, build fires in snow, and navigate blizzards.'
});

// Register multiple skills at once
registry.registerSkills([
    {
        id: 'survival_desert',
        name: 'Survival (Desert)',
        description: 'Expertise in desert survival.',
        ability: 'WIS',
        categories: ['exploration', 'environmental'],
        source: 'custom'
    },
    {
        id: 'navigation',
        name: 'Navigation',
        description: 'Ability to navigate by stars, maps, and landmarks.',
        ability: 'INT',
        categories: ['exploration'],
        source: 'custom',
        armorPenalty: false
    },
    {
        id: 'intimidation',
        name: 'Intimidation',
        description: 'Influence others through threats and force.',
        ability: 'CHA',
        categories: ['social'],
        source: 'custom'
    }
]);
```

**Query Skills:**

```typescript
// Get a specific skill
const athletics = registry.getSkill('athletics');
console.log(athletics.name); // "Athletics"
console.log(athletics.ability); // "STR"

// Get all skills for an ability
const strengthSkills = registry.getSkillsByAbility('STR');
// Returns: [athletics, ...other STR skills]

// Get skills by category
const explorationSkills = registry.getSkillsByCategory('exploration');
// Returns skills tagged with 'exploration'

// Get all categories
const categories = registry.getCategories();
console.log(categories);
// ['exploration', 'social', 'knowledge', 'combat', 'environmental', ...]

// Get custom skills only
const customSkills = registry.getSkillsBySource('custom');

// Check if a skill exists
const hasSurvival = registry.isValidSkill('survival'); // true
const hasFake = registry.isValidSkill('fake_skill'); // false
```

**Validate Skills:**

```typescript
// Validate a skill before registering
const newSkill = {
    id: 'test_skill',
    name: 'Test Skill',
    ability: 'STR',
    source: 'custom'
};

const validation = registry.validateSkill(newSkill);
if (!validation.valid) {
    console.log('Validation errors:', validation.errors);
}
```

**Get Registry Statistics:**

```typescript
const stats = registry.getRegistryStats();
console.log(stats);
// {
//     totalSkills: 21,      // 18 default + 3 custom
//     defaultSkills: 18,
//     customSkills: 3,
//     skillsByAbility: {
//         STR: 2,   // athletics + custom
//         DEX: 3,
//         CON: 1,
//         INT: 4,
//         WIS: 6,
//         CHA: 5
//     },
//     categories: ['exploration', 'social', 'knowledge', 'combat', 'environmental']
// }
```

---

### Per-Category Spawn Rate System

Both FeatureRegistry and SkillRegistry support per-item spawn rate control through ExtensionManager's weight system. This allows custom content to be more or less likely to appear during character generation.

**Feature Spawn Rates:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Set spawn rates for Barbarian class features
manager.setWeights('classFeatures.Barbarian', {
    'rage': 1.0,                // Normal spawn rate
    'unarmored_defense': 1.0,   // Normal spawn rate
    'reckless_attack': 0.5,     // Half as likely
    'danger_sense': 0.3,        // Less likely
    'dragon_fury': 0.1          // Very rare (10% of normal)
});

// Set spawn rates for racial traits
manager.setWeights('racialTraits.Elf', {
    'darkvision': 1.0,
    'fey_ancestry': 0.8,
    'trance': 0.5,
    'custom_elf_trait': 0.2     // Rare custom trait
});
```

**Skill Spawn Rates:**

```typescript
// Set spawn rates for skills in general
manager.setWeights('skills', {
    'athletics': 1.0,
    'acrobatics': 1.0,
    'survival': 0.8,           // Slightly less common
    'survival_cold': 0.3,      // Rare custom skill
    'navigation': 0.5,         // Uncommon custom skill
    'intimidation': 1.2        // More common than default
});

// Set spawn rates for class-specific skill lists
manager.setWeights('skillLists.Rogue', {
    'stealth': 1.5,            // Rogues very likely to get stealth
    'perception': 1.3,
    'acrobatics': 1.2,
    'athletics': 0.5           // Less common for rogues
});
```

**Weight Modes:**

```typescript
// Relative mode (default): Weights added to pool, normalized
manager.register('classFeatures.Barbarian', customFeatures, {
    mode: 'relative',
    weights: { 'dragon_fury': 0.5 }  // Reduces probability by 50%
});

// Absolute mode: Only specified weights used, all others = 1
manager.register('skills', customSkills, {
    mode: 'absolute',
    weights: {
        'navigation': 5.0,    // Very common
        'intimidation': 3.0,  // Common
        'survival_cold': 1.0  // Normal
    }
    // All other skills implicitly have weight 1
});

// Default mode: Equal weights for all items
manager.register('racialTraits', customTraits, {
    mode: 'default'  // Ignore custom weights
});
```

**Get Current Weights:**

```typescript
// Get combined weights (defaults + custom)
const weights = manager.getWeights('skills');
console.log(weights);
// {
//     athletics: 1.0,
//     survival: 0.8,
//     survival_cold: 0.3,
//     navigation: 0.5,
//     intimidation: 1.2,
//     ...
// }

// Get default weights only
const defaultWeights = manager.getDefaultWeights('skills');
console.log(defaultWeights);
// { athletics: 1.0, acrobatics: 1.0, ...all 1.0 }
```

---

### Validation System

The ExtensionManager includes built-in validation for all extensible categories.

**Validation Rules:**

| Category | Required Fields | Valid Values |
|----------|----------------|--------------|
| **equipment** | name, type, rarity, weight | type: 'weapon' \| 'armor' \| 'item'; rarity: 'common'...'legendary'; weight: ≥ 0 |
| **spells** | name, level, school | level: 0-9; school: 'Abjuration'...'Transmutation' |
| **races** | (string value) | Must be valid Race enum value |
| **classes** | (string value) | Must be valid Class enum value |
| **appearance.*** | (string value) | Must be string type |
| **classFeatures** | id, name, type, class, level, source | type: 'passive'\|'active'\|'resource'\|'trigger'; level: 1-20 |
| **racialTraits** | id, name, race, source | Must have valid race from Race enum |
| **skills** | id, name, ability, source | ability: 'STR'\|'DEX'\|'CON'\|'INT'\|'WIS'\|'CHA' |
| **skillLists** | class, skillCount, availableSkills | skillCount: ≥ 0; availableSkills: array of skill IDs |

**Validation Example:**

```typescript
const manager = ExtensionManager.getInstance();

try {
    // This will throw validation errors
    manager.register('spells', [
        {
            name: 'Invalid Spell',
            level: 15,  // Invalid: level must be 0-9
            school: 'NotASchool'  // Invalid: not a valid school
        }
    ], {
        validate: true  // Validation is on by default
    });
} catch (error) {
    console.error(error.message);
    // "Invalid items for category 'spells':
    //  Item 0: Invalid 'level' (must be 0-9)
    //  Item 0: Invalid 'school'"
}

// Disable validation if needed
manager.register('spells', items, { validate: false });
```

---

### Advanced Patterns

**Per-Category Weight Management:**

```typescript
const manager = ExtensionManager.getInstance();

// Set weights independently of registration
manager.register('equipment', customItems);

// Later, adjust spawn rates
manager.setWeights('equipment', {
    'Dragon Scale Armor': 0.1,  // Rare
    'Sword': 2.0,               // Common
    'Potion': 5.0               // Very common
});

// Get current weights for display
const weights = manager.getWeights('equipment');
console.log(weights);
```

**Check Extension Status:**

```typescript
const manager = ExtensionManager.getInstance();

// Check if custom data exists
if (manager.hasCustomData('spells')) {
    console.log('Custom spells registered');
}

// Get extension info
const info = manager.getInfo('spells');
console.log(info);
// {
//     hasCustomData: true,
//     defaultCount: 53,
//     customCount: 5,
//     totalCount: 58,
//     mode: 'relative',
//     weights: { ... },
//     registeredAt: 1234567890
// }
```

**Reset and Export:**

```typescript
const manager = ExtensionManager.getInstance();

// Reset single category
manager.reset('spells');

// Reset everything
manager.resetAll();

// Export custom data for saving/loading
const customData = manager.exportCustomData();
console.log(customData);
// {
//     extensions: {
//         'spells': { items: [...], options: {...}, registeredAt: ... },
//         'equipment': { items: [...], options: {...}, registeredAt: ... }
//     },
//     weights: {
//         'spells': { 'Phoenix Fire': 0.5 },
//         'equipment': { 'Sword': 2.0 }
//     }
// }
```

---

### Complete Working Example: Creating an Expansion Pack

This example demonstrates creating a complete "Dragon Expansion Pack" with custom spells, equipment, races, classes, and appearance options.

```typescript
import {
    ExtensionManager,
    CharacterGenerator,
    AudioAnalyzer
} from 'playlist-data-engine';

/**
 * DRAGON EXPANSION PACK
 * A complete example of creating custom content for the Playlist Data Engine
 */

// ============================================================
// STEP 1: Define Custom Content
// ============================================================

const dragonSpells = [
    {
        name: 'Dragon Breath',
        level: 3,
        school: 'Evocation',
        casting_time: '1 action',
        range: 'Self (30-foot cone)',
        duration: 'Instantaneous',
        components: ['V', 'S'],
        description: 'You exhale destructive energy in a 30-foot cone...'
    },
    {
        name: 'Draconic Presence',
        level: 4,
        school: 'Enchantment',
        casting_time: '1 action',
        range: 'Self',
        duration: 'Concentration, up to 1 minute',
        components: ['V', 'S'],
        description: 'You channel the presence of a dragon, exuding an aura of power...'
    },
    {
        name: 'Scale Hardening',
        level: 2,
        school: 'Abjuration',
        casting_time: '1 bonus action',
        range: 'Touch',
        duration: '1 hour',
        components: ['V', 'S', 'M'],
        description: 'The target\'s skin becomes as hard as dragon scales...'
    }
];

const dragonEquipment = [
    {
        name: 'Dragon Scale Armor',
        type: 'armor',
        rarity: 'very_rare',
        weight: 25
    },
    {
        name: 'Dragon Tooth Dagger',
        type: 'weapon',
        rarity: 'rare',
        weight: 1
    },
    {
        name: 'Potion of Dragon Blood',
        type: 'item',
        rarity: 'rare',
        weight: 0.5
    }
];

// NOTE: This example demonstrates custom SPELLS, EQUIPMENT, and APPEARANCE only.
//
// While you can register 'classes' via ExtensionManager, this ONLY adjusts spawn rates
// for the 12 existing D&D 5e classes. You cannot create entirely new classes like
// "Draconis" through ExtensionManager without source code changes.
//
// This example does NOT add a custom "Draconis" class - it only adds dragon-themed
// content that can appear for any existing class.
const dragonAppearance = {
    bodyTypes: ['draconic', 'dragonborn'],
    skinTones: ['#8B0000', '#B8860B', '#006400', '#4B0082'], // Red, Gold, Green, Purple
    hairColors: ['#FF0000', '#FFD700', '#00FF00'], // Red, Gold, Green
    eyeColors: ['#FF4500', '#FFD700', '#32CD32', '#9400D3'], // Orange-red, Gold, Lime, Purple
    facialFeatures: ['horns', 'scaled skin', 'dragon tail', 'fangs', 'claws']
};

// ============================================================
// STEP 2: Register Content with ExtensionManager
// ============================================================

const manager = ExtensionManager.getInstance();

// Register custom spells
manager.register('spells', dragonSpells, {
    mode: 'relative',  // Add to default spells
    weights: {
        'Dragon Breath': 0.3,      // Rare spell
        'Draconic Presence': 0.2,  // Very rare spell
        'Scale Hardening': 0.4     // Uncommon spell
    },
    validate: true  // Validate spell data before registration
});

// Register custom equipment
manager.register('equipment', dragonEquipment, {
    mode: 'relative',
    weights: {
        'Dragon Scale Armor': 0.1,   // Very rare armor
        'Dragon Tooth Dagger': 0.3,  // Rare weapon
        'Potion of Dragon Blood': 0.2 // Rare consumable
    }
});

// Register custom appearance options
manager.register('appearance.bodyTypes', dragonAppearance.bodyTypes, {
    mode: 'relative',
    weights: { 'draconic': 0.2, 'dragonborn': 0.3 }
});

manager.register('appearance.skinTones', dragonAppearance.skinTones, {
    mode: 'relative',
    weights: {
        '#8B0000': 0.3,  // Red dragons most common
        '#B8860B': 0.2,  // Gold dragons
        '#006400': 0.15, // Green dragons
        '#4B0082': 0.1   // Purple dragons
    }
});

manager.register('appearance.hairColors', dragonAppearance.hairColors, {
    mode: 'relative',
    weights: { '#FF0000': 0.4, '#FFD700': 0.3, '#00FF00': 0.2 }
});

manager.register('appearance.eyeColors', dragonAppearance.eyeColors, {
    mode: 'relative'
});

manager.register('appearance.facialFeatures', dragonAppearance.facialFeatures, {
    mode: 'relative',
    weights: {
        'horns': 0.4,
        'scaled skin': 0.3,
        'dragon tail': 0.2,
        'fangs': 0.3,
        'claws': 0.3
    }
});

// ============================================================
// STEP 3: Verify Registration
// ============================================================

// Check what was registered
const spellInfo = manager.getInfo('spells');
console.log('Spells:', spellInfo);
// {
//     hasCustomData: true,
//     defaultCount: 53,
//     customCount: 3,
//     totalCount: 56,
//     mode: 'relative',
//     weights: { 'Dragon Breath': 0.3, ... },
//     registeredAt: 1234567890
// }

const equipInfo = manager.getInfo('equipment');
console.log('Equipment:', equipInfo);

// ============================================================
// STEP 4: Generate Characters with Custom Content
// ============================================================

async function generateDragonCharacter() {
    // Analyze audio from a music file
    const audioProfile = await AudioAnalyzer.analyze(audioUrl);

    // Generate character with custom content available
    const character = CharacterGenerator.generate(
        'dragon-seed-123',
        audioProfile,
        'Draconis',
        {
            level: 5,
            gameMode: 'standard'
            // Note: Extensions are registered via ExtensionManager,
            // not passed directly in options
        }
    );

    // The character will have:
    // - Custom dragon-themed appearance options (horns, scales, etc.)
    // - Access to custom dragon spells if they're a spellcaster
    // - Possibility of custom dragon equipment
    // - Dragon-themed color palette

    console.log('Generated Character:', character);
    return character;
}

// ============================================================
// STEP 5: Adjust Spawn Rates Later
// ============================================================

// Make dragon items more common after testing
manager.setWeights('equipment', {
    'Dragon Scale Armor': 0.5,  // Increased from 0.1
    'Dragon Tooth Dagger': 0.8, // Increased from 0.3
    'Potion of Dragon Blood': 0.6 // Increased from 0.2
});

// ============================================================
// STEP 6: Export/Import Custom Data
// ============================================================

// Export for saving
const customData = manager.exportCustomData();
console.log('Custom Data:', customData);

// Save to localStorage or file
// localStorage.setItem('dragonExpansion', JSON.stringify(customData));

// Later, load and restore:
// const savedData = JSON.parse(localStorage.getItem('dragonExpansion'));
// manager.importCustomData(savedData);

// ============================================================
// STEP 7: Cleanup (if needed)
// ============================================================

// Reset dragon content when switching themes
// manager.reset('spells');
// manager.reset('equipment');
// manager.reset('appearance.bodyTypes');
// manager.reset('appearance.skinTones');
// manager.reset('appearance.hairColors');
// manager.reset('appearance.eyeColors');
// manager.reset('appearance.facialFeatures');

// Or reset everything at once
// manager.resetAll();
```

**Expected Results:**

When generating characters with this Dragon Expansion Pack:

1. **Appearance**: Characters will have dragon-themed features:
   - Body types: 50% chance of draconic/dragonborn (with other types still possible)
   - Skin tones: Red, gold, green, or purple dragon scales
   - Hair colors: Red, gold, or green
   - Eye colors: Orange-red, gold, lime green, or purple
   - Facial features: High chance of horns, scales, tail, fangs, or claws

2. **Equipment**: Spellcasters may know dragon-themed spells, and any class might receive dragon equipment

3. **Variety**: All default content remains available (mode: 'relative'), ensuring variety

**Key Takeaways:**

1. **Batch Registration**: Register all related content at once for a themed expansion
2. **Weight Control**: Fine-tune spawn rates for balanced gameplay
3. **Validation**: Always validate data during development (set `validate: true`)
4. **Modularity**: Each category is independent - mix and match as needed
5. **Persistence**: Export custom data to save/load expansion configurations
6. **Cleanup**: Use `reset()` to cleanly switch between expansion packs

---

### Skill Prerequisites

**Location:** `src/core/skills/SkillTypes.ts`, `src/core/skills/SkillValidator.ts`

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

#### SkillPrerequisite Interface

```typescript
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Custom condition description */
    custom?: string;
}
```

#### Updated CustomSkill Interface

The `CustomSkill` interface now includes an optional `prerequisites` property:

```typescript
export interface CustomSkill {
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

    // NEW: Prerequisites for learning this skill
    prerequisites?: SkillPrerequisite;
}
```

#### SkillValidator Prerequisite Validation

**Location:** `src/core/skills/SkillValidator.ts`

The `SkillValidator` class now includes a method for validating skill prerequisites:

```typescript
class SkillValidator {
    /**
     * Validate skill prerequisites against a character
     *
     * @param skill - The skill to validate prerequisites for
     * @param character - The character to check against
     * @returns Validation result with valid flag and optional unmet requirements
     */
    static validateSkillPrerequisites(
        skill: CustomSkill,
        character: CharacterSheet
    ): ValidationResult;
}
```

**ValidationResult:**
```typescript
interface ValidationResult {
    /** Whether all prerequisites are met */
    valid: boolean;

    /** Array of unmet prerequisite descriptions (empty if valid) */
    unmet?: string[];
}
```

#### SkillAssigner Filtering

**Location:** `src/core/generation/SkillAssigner.ts`

The `SkillAssigner` now filters skills by prerequisites when assigning skills to a character. Skills with unmet prerequisites are automatically excluded from selection.

#### SkillRegistry Validation

**Location:** `src/core/skills/SkillRegistry.ts`

The `SkillRegistry` includes a method for validating prerequisites:

```typescript
class SkillRegistry {
    /**
     * Validate skill prerequisites against a character
     *
     * @param skill - The skill to validate
     * @param character - The character to check against
     * @returns Validation result
     */
    validatePrerequisites(
        skill: CustomSkill,
        character: CharacterSheet
    ): ValidationResult;
}
```

#### Usage Examples

**Skill with Level and Feature Prerequisites:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const dragonSmithing: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons and armor from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer's Draconic Bloodline feature
        level: 5,                          // Must be level 5+
        class: 'Sorcerer'                  // Must be a Sorcerer
    },
    source: 'custom',
    categories: ['crafting']
};

SkillRegistry.getInstance().registerSkill(dragonSmithing);
```

**Skill with Ability Score and Skill Prerequisites:**

```typescript
const arcaneMastery: CustomSkill = {
    id: 'arcane_mastery',
    name: 'Arcane Mastery',
    description: 'Advanced magical theory and practice',
    ability: 'INT',
    prerequisites: {
        abilities: { INT: 16 },      // Requires 16+ Intelligence
        skills: ['arcana'],          // Must be proficient in Arcana first
        level: 7                     // Must be level 7+
    },
    source: 'custom',
    categories: ['knowledge', 'magic']
};
```

**Skill with Spell and Race Prerequisites:**

```typescript
const elvenSongMagic: CustomSkill = {
    id: 'elven_song_magic',
    name: 'Elven Song Magic',
    description: 'Traditional elven magic through song',
    ability: 'CHA',
    prerequisites: {
        race: 'Elf',                 // Elves only
        spells: ['Minor Illusion'],  // Must know Minor Illusion
        skills: ['performance']      // Must be proficient in Performance
    },
    source: 'custom',
    categories: ['magic', 'social']
};
```

**Validate Prerequisites:**

```typescript
import { SkillRegistry } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();
const skill = registry.getSkill('dragon_smithing');

if (skill && skill.prerequisites) {
    const result = registry.validatePrerequisites(skill, character);

    if (!result.valid) {
        console.log('Unmet prerequisites:', result.unmet);
        // Output: [
        //   'Requires feature: draconic_bloodline',
        //   'Requires level 5 (current: 3)',
        //   'Requires Sorcerer class (current: Fighter)'
        // ]
    }
}
```

---

### Spell Prerequisites

**Location:** `src/utils/constants.ts`, `src/core/spells/SpellValidator.ts`

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

#### SpellPrerequisite Interface

```typescript
export interface SpellPrerequisite {
    /** Minimum character level */
    level?: number;

    /** Minimum spellcaster level (if different from character level) */
    casterLevel?: number;

    /** Minimum ability scores */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: string;

    /** Features that must be learned first (by feature ID) */
    features?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Custom condition */
    custom?: string;
}
```

#### Updated Spell Interface

The `Spell` interface now includes optional `id` and `prerequisites` properties:

```typescript
export interface Spell {
    /** Unique identifier (optional for backward compatibility) */
    id?: string;

    name: string;
    level: number;           // 0-9 (0 = cantrips)
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    casting_time: string;
    range: string;
    components: string[];
    duration: string;
    description?: string;

    // NEW: Prerequisites for learning this spell
    prerequisites?: SpellPrerequisite;
}
```

#### SpellValidator

**Location:** `src/core/spells/SpellValidator.ts` (NEW FILE)

The `SpellValidator` class validates spells and their prerequisites:

```typescript
class SpellValidator {
    /**
     * Validate a spell's data structure
     */
    static validateSpell(spell: unknown): SpellValidationResult;

    /**
     * Validate spell prerequisites schema
     */
    static validatePrerequisites(prerequisites: unknown): SpellValidationResult;

    /**
     * Validate spell prerequisites against a character
     *
     * @param prerequisites - The spell prerequisites to validate
     * @param character - The character to check against
     * @returns Validation result with valid flag and optional errors
     */
    static validateSpellPrerequisites(
        prerequisites: SpellPrerequisite | undefined,
        character: CharacterSheet
    ): SpellValidationResult;
}
```

**SpellValidationResult:**
```typescript
interface SpellValidationResult {
    /** Whether the spell/prerequisites are valid */
    valid: boolean;

    /** Array of error messages (empty if valid) */
    errors: string[];
}
```

#### SpellManager Filtering

**Location:** `src/core/generation/SpellManager.ts`

The `SpellManager` now filters spells by prerequisites when assigning spells to a character:

```typescript
class SpellManager {
    /**
     * Get known spells for a character, filtering by prerequisites
     *
     * @param characterClass - The character's class
     * @param characterLevel - The character's level
     * @param character - Optional character for prerequisite validation
     * @returns Array of known spell names
     */
    static getKnownSpells(
        characterClass: Class,
        characterLevel: number,
        character?: CharacterSheet
    ): string[];
}
```

#### Usage Examples

**Spell with Feature and Ability Prerequisites:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const dragonBreath = {
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy in a 60-foot cone',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Draconic Bloodline feature
        abilities: { CHA: 16 },            // Requires 16+ Charisma
        class: 'Sorcerer'                  // Sorcerer only
    }
};

const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath]);
```

**Spell with Spell Chain Prerequisites:**

```typescript
const improvedFireball = {
    id: 'improved_fireball',
    name: 'Improved Fireball',
    level: 5,
    school: 'Evocation',
    casting_time: '1 action',
    range: '150 ft',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'A more powerful version of fireball',
    prerequisites: {
        spells: ['Fireball'],        // Must know Fireball first
        level: 11,                   // Must be level 11+
        class: 'Wizard'              // Wizards only
    }
};
```

**Spell with Skill Prerequisites:**

```typescript
const arcaneSight = {
    id: 'arcane_sight_superior',
    name: 'Superior Arcane Sight',
    level: 4,
    school: 'Divination',
    casting_time: '1 action',
    range: 'Self',
    components: ['V', 'S'],
    duration: '1 hour',
    description: 'See all magical auras and understand their school',
    prerequisites: {
        skills: ['arcana'],           // Must be proficient in Arcana
        abilities: { INT: 14 },       // Requires 14+ Intelligence
        casterLevel: 7                // Must be a 7th-level spellcaster
    }
};
```

**Validate Spell Prerequisites:**

```typescript
import { SpellValidator } from 'playlist-data-engine';

// Check if a character can learn a spell
const spell = SPELL_DATABASE['dragon_breath'];
if (spell.prerequisites) {
    const result = SpellValidator.validateSpellPrerequisites(
        spell.prerequisites,
        character
    );

    if (!result.valid) {
        console.log('Cannot learn spell:', result.errors);
        // Output: [
        //   'Requires feature: draconic_bloodline',
        //   'Requires CHA 16+ (current: 14)',
        //   'Requires Sorcerer class (current: Wizard)'
        // ]
    }
}
```

---

### Custom Races

**Location:** `src/utils/constants.ts`, `src/core/extensions/ExtensionManager.ts`, `src/core/generation/AbilityScoreCalculator.ts`

The engine now supports custom races through the ExtensionManager. Custom races can define ability score bonuses, speed, traits, and available subraces.

#### RaceDataEntry Interface

```typescript
export interface RaceDataEntry {
    /** Ability score bonuses granted by this race */
    ability_bonuses: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Base walking speed in feet */
    speed: number;

    /** Array of racial trait names/IDs */
    traits: string[];

    /** Optional: Available subraces for this race */
    subraces?: string[];
}
```

#### getRaceData() Helper Function

**Location:** `src/utils/constants.ts`

```typescript
/**
 * Get race data (default or custom)
 *
 * Checks both the built-in RACE_DATA and the ExtensionManager for custom race data.
 *
 * @param race - The race name to look up
 * @returns Race data entry or undefined if not found
 *
 * @example
 * // Get default race data
 * const elfData = getRaceData('Elf');
 * console.log(elfData.speed); // 30
 *
 * // Get custom race data (if registered via ExtensionManager)
 * const dragonkinData = getRaceData('Dragonkin');
 * if (dragonkinData) {
 *     console.log(dragonkinData.ability_bonuses);
 * }
 */
export function getRaceData(race: string): RaceDataEntry | undefined;
```

#### Registering Custom Races

**Via ExtensionManager:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register custom race data (ability bonuses, speed, traits, subraces)
manager.register('races.data', [
    {
        race: 'Dragonkin',
        ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
        speed: 30,
        traits: ['Draconic Ancestry', 'Darkvision', 'Draconic Resistance'],
        subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
    },
    {
        race: 'Fairy',
        ability_bonuses: { DEX: 2, CHA: 2, WIS: 1 },
        speed: 25,
        traits: ['Fey Ancestry', 'Flight', 'Nature Sense'],
        subraces: ['Summer Fairy', 'Winter Fairy', 'Twilight Fairy']
    }
]);

// Step 2: Register the race names for validation
manager.register('races', ['Dragonkin', 'Fairy'], { validate: true });
```

#### AbilityScoreCalculator Custom Race Support

**Location:** `src/core/generation/AbilityScoreCalculator.ts`

The `AbilityScoreCalculator.applyRacialBonuses()` method now accepts `string` instead of `Race` and uses `getRaceData()` to support custom races:

```typescript
class AbilityScoreCalculator {
    /**
     * Apply racial ability score bonuses
     *
     * Supports both default D&D 5e races and custom races registered via ExtensionManager.
     *
     * @param baseScores - Base scores before racial bonuses
     * @param race - Selected character race (e.g., 'Human', 'Elf', or custom race like 'Dragonkin')
     * @returns Final scores with racial bonuses applied (capped at 20 in standard mode)
     */
    static applyRacialBonuses(baseScores: AbilityScores, race: string): AbilityScores;
}
```

#### RaceSelector Custom Race Support

**Location:** `src/core/generation/RaceSelector.ts`

The `RaceSelector` automatically includes custom races registered via ExtensionManager:

```typescript
class RaceSelector {
    /**
     * Select a random race based on weighted spawn rates
     *
     * Selects from available races (default 9 D&D 5e races plus any custom races).
     * Spawn rates can be customized via ExtensionManager weights.
     *
     * @param rng - Seeded random number generator
     * @returns Selected race name
     */
    static selectRace(rng: SeededRNG): string;
}
```

#### Custom Race Validation

**Location:** `src/core/extensions/ExtensionManager.ts`

The ExtensionManager validates custom races:

1. **Race Names**: Must be either a default race or registered via `races.data`
2. **Race Data**: Must have `race` (string), `ability_bonuses` (record), `speed` (number), `traits` (array)

```typescript
// Validation errors for invalid race data
manager.register('races', ['InvalidRace']);
// Throws: "Invalid items for category 'races':
//   Invalid race 'InvalidRace'. Must be one of: Human, Elf, Dwarf, Halfling,
//   Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling or register custom race
//   via 'races.data' first."
```

#### Usage Examples

**Basic Custom Race:**

```typescript
const manager = ExtensionManager.getInstance();

// Register a simple custom race
manager.register('races.data', [{
    race: 'Aasimar',
    ability_bonuses: { CHA: 2 },
    speed: 30,
    traits: ['Celestial Resistance', 'Darkvision', 'Celestial Legacy']
}]);

manager.register('races', ['Aasimar']);

// Now characters can be generated as Aasimar
const character = CharacterGenerator.generate(seed, audioProfile, name);
// character.race might be 'Aasimar'
```

**Custom Race with Subraces:**

```typescript
// Register custom race with subraces
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// Register subrace-specific traits
manager.register('racialTraits', [
    {
        id: 'fire_dragonkin_resistance',
        name: 'Fire Resistance',
        race: 'Dragonkin',
        subrace: 'Fire Dragonkin',
        effects: [{ type: 'passive_modifier', target: 'fire_resistance', value: true }],
        source: 'custom'
    },
    {
        id: 'ice_dragonkin_resistance',
        name: 'Cold Resistance',
        race: 'Dragonkin',
        subrace: 'Ice Dragonkin',
        effects: [{ type: 'passive_modifier', target: 'cold_resistance', value: true }],
        source: 'custom'
    }
]);
```

**Custom Race Spawn Rates:**

```typescript
// Make custom races rarer than default races
manager.setWeights('races', {
    'Human': 1.0,      // Common
    'Elf': 1.0,        // Common
    'Dragonkin': 0.2,  // Rare (20% of normal)
    'Fairy': 0.1       // Very rare (10% of normal)
});
```

---

### Subrace Support

**Location:** `src/core/types/Character.ts`, `src/core/generation/CharacterGenerator.ts`, `src/core/features/FeatureTypes.ts`

Characters can now have a subrace property (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf'). Subraces allow for more granular racial trait assignment and prerequisite validation.

#### CharacterSheet Subrace Property

The `CharacterSheet` interface now includes an optional `subrace` property:

```typescript
export interface CharacterSheet {
    name: string;
    race: Race;

    /** Subrace (e.g., 'High Elf', 'Hill Dwarf', 'Wood Elf') */
    subrace?: string;

    class: Class;
    level: number;
    // ... rest of properties
}
```

#### FeaturePrerequisite Subrace Support

The `FeaturePrerequisite` interface now includes `subrace`:

```typescript
export interface FeaturePrerequisite {
    level?: number;
    features?: string[];
    abilities?: Partial<Record<Ability, number>>;
    class?: Class;
    race?: Race;

    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    /** Skills that must be proficient first (by skill ID) */
    skills?: string[];

    /** Spells that must be known first (by spell name) */
    spells?: string[];

    custom?: string;
}
```

#### RacialTrait Subrace Support

The `RacialTrait` interface includes a `subrace` property for subrace-specific traits:

```typescript
export interface RacialTrait {
    id: string;
    name: string;
    race: Race;

    /** Optional subrace (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

    description?: string;
    level?: number;
    prerequisites?: FeaturePrerequisite;
    effects?: FeatureEffect[];
    source: 'default' | 'custom';
}
```

#### CharacterGenerator Subrace Support

**Location:** `src/core/generation/CharacterGenerator.ts`

The `CharacterGenerator.generate()` method accepts an optional `subrace` parameter:

```typescript
class CharacterGenerator {
    /**
     * Generate a complete D&D 5e character
     *
     * @param seed - Deterministic seed for generation
     * @param audioProfile - Audio analysis result
     * @param name - Character name
     * @param options - Generation options
     * @param options.level - Character level (default: 1)
     * @param options.subrace - Optional subrace (e.g., 'High Elf', 'Hill Dwarf')
     * @param options.extensions - Custom extensions
     * @returns Complete D&D 5e character sheet
     */
    static generate(
        seed: string,
        audioProfile: AudioProfile,
        name: string,
        options?: {
            level?: number;
            subrace?: string;
            gameMode?: GameMode;
            extensions?: CharacterGeneratorExtensions;
        }
    ): CharacterSheet;
}
```

**Racial Trait Assignment by Subrace:**

When generating a character with a subrace, the generator filters racial traits by subrace:

```typescript
// Get racial traits, filtering by subrace if character has one
const racialTraits = subrace
    ? featureRegistry.getRacialTraitsForSubrace(race, subrace)
    : featureRegistry.getRacialTraits(race);
```

#### FeatureRegistry Subrace Methods

**Location:** `src/core/features/FeatureRegistry.ts`

```typescript
class FeatureRegistry {
    /**
     * Get racial traits for a specific subrace
     *
     * @param race - The base race
     * @param subrace - The subrace name
     * @returns Array of racial traits for that subrace
     */
    getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[];

    /**
     * Validate feature prerequisites against a character
     *
     * @param prerequisites - The prerequisites to validate
     * @param character - The character to check against
     * @param context - Optional context (race, subrace, class, level, ability_scores)
     * @returns Validation result with errors array
     */
    validatePrerequisites(
        prerequisites: FeaturePrerequisite,
        character?: CharacterSheet,
        context?: FeaturePrerequisiteContext
    ): ValidationResult;
}
```

#### FeatureValidator Subrace Validation

**Location:** `src/core/features/FeatureValidator.ts`

The `FeatureValidator.validatePrerequisites()` method now validates subrace requirements:

```typescript
class FeatureValidator {
    static validatePrerequisites(
        prerequisites: FeaturePrerequisite,
        character?: CharacterSheet,
        context?: FeaturePrerequisiteContext
    ): ValidationResult {
        const errors: string[] = [];

        // ... other validations ...

        // Check subrace requirement
        if (prereqs.subrace !== undefined) {
            if (!context?.subrace || context.subrace !== prereqs.subrace) {
                errors.push(`Requires subrace ${prereqs.subrace} (current: ${context?.subrace || 'none'})`);
            }
        }

        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    }
}
```

#### RaceDataEntry Subraces Property

The `RaceDataEntry` interface includes optional `subraces`:

```typescript
export interface RaceDataEntry {
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
    /** Optional: Available subraces for this race */
    subraces?: string[];
}
```

#### Usage Examples

**Generate Character with Subrace:**

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Generate a High Elf character
const character = CharacterGenerator.generate(
    'seed-123',
    audioProfile,
    'Elandra',
    {
        level: 5,
        subrace: 'High Elf'  // Specify subrace
    }
);

console.log(character.race);     // 'Elf'
console.log(character.subrace);  // 'High Elf'
console.log(character.racial_traits);
// Might include: ['Darkvision', 'Fey Ancestry', 'Trance', 'High Elf Cantrip']
```

**Subrace-Specific Racial Trait:**

```typescript
import { FeatureRegistry } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Register a High Elf-specific trait
registry.registerRacialTrait({
    id: 'high_elf_cantrip',
    name: 'High Elf Cantrip',
    race: 'Elf',
    subrace: 'High Elf',  // Only for High Elves
    description: 'You know one cantrip from the wizard spell list',
    prerequisites: {
        race: 'Elf',
        subrace: 'High Elf'  // Requires High Elf subrace
    },
    effects: [
        { type: 'grant_spell', target: 'cantrip', source: 'wizard', count: 1 }
    ],
    source: 'custom'
});
```

**Feature with Subrace Prerequisite:**

```typescript
// Register a feature that requires Wood Elf subrace
registry.registerClassFeature({
    id: 'wood elf masking',
    name: 'Wood Elf Masking',
    description: 'You can attempt to hide even when only lightly obscured',
    type: 'passive',
    level: 1,
    class: 'Ranger',
    prerequisites: {
        race: 'Elf',
        subrace: 'Wood Elf'  // Only Wood Elves get this
    },
    effects: [
        { type: 'passive_modifier', target: 'stealth_bonus', value: 2 }
    ],
    source: 'custom'
});
```

**Validate Subrace Prerequisites:**

```typescript
import { FeatureValidator } from 'playlist-data-engine';

const trait = {
    id: 'high_elf_cantrip',
    name: 'High Elf Cantrip',
    prerequisites: {
        race: 'Elf',
        subrace: 'High Elf'
    }
};

// Check if character meets prerequisites
const result = FeatureValidator.validatePrerequisites(
    trait.prerequisites!,
    undefined,
    {
        race: 'Elf',
        subrace: 'Wood Elf',  // Wrong subrace
        class: 'Wizard',
        level: 1,
        ability_scores: { STR: 10, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 }
    }
);

console.log(result.valid);  // false
console.log(result.errors); // ['Requires subrace High Elf (current: Wood Elf)']
```

---

### Custom Classes

**Location:** `src/utils/constants.ts`, `src/core/extensions/ExtensionManager.ts`, `src/core/types/Character.ts`, `src/core/generation/ClassSuggester.ts`

The engine now supports template-based custom classes through the ExtensionManager. Custom classes can extend (inherit from) existing D&D 5e base classes or be defined completely from scratch.

#### Overview

The Template Class System enables creating new classes that extend existing D&D 5e base classes without duplicating all properties. For example, a "Necromancer" class can extend "Wizard" and only override the properties that differ.

**Key Features:**
- **Template inheritance**: Custom classes can inherit from base classes via `baseClass` property
- **Complete customization**: Classes can be defined from scratch without `baseClass`
- **Skill lists**: Custom skill lists (including custom skills)
- **Spell casting**: Custom spell lists and slot progressions
- **Equipment**: Custom starting equipment
- **Features**: Custom class features with prerequisites
- **Audio preferences**: Optional audio affinity for class suggestion

#### Class Type Extensibility

The `Class` type uses a branded string pattern for extensibility:

**Location:** `src/core/types/Character.ts`

```typescript
/**
 * Branded type for class names (supports custom classes)
 *
 * Use asClass() to convert a string to the Class type, and isValidClass()
 * to validate at runtime.
 */
export type Class = string & { readonly __ClassBrand: unique symbol };

/**
 * Convert a string to the Class type
 *
 * Use this function to register custom class names.
 *
 * @param value - The class name string
 * @returns The value branded as a Class type
 *
 * @example
 * const customClass: Class = asClass('Necromancer');
 */
export function asClass(value: string): Class;

/**
 * Type guard to check if a string is a valid Class (default or custom)
 *
 * This checks against both default D&D 5e classes and any custom classes
 * registered via ExtensionManager's 'classes.data' category.
 *
 * @param value - The value to check
 * @returns True if the value is a valid class name
 */
export function isValidClass(value: string): value is Class;
```

#### ClassDataEntry Interface

**Location:** `src/utils/constants.ts`

```typescript
export interface ClassDataEntry {
    /** Primary ability score for this class */
    primary_ability: Ability;

    /** Hit die size for this class */
    hit_die: number;

    /** Saving throw proficiencies */
    saving_throws: Ability[];

    /** Whether this class can cast spells */
    is_spellcaster: boolean;

    /** Number of skills to choose from */
    skill_count: number;

    /** Available skills for this class (includes custom skills) */
    available_skills: string[];

    /** Whether this class has expertise */
    has_expertise: boolean;

    /** Number of expertise choices (if has_expertise is true) */
    expertise_count?: number;

    /**
     * For template-based classes: the base class to inherit from
     *
     * When specified, the custom class will inherit properties from the base class,
     * with custom properties overriding inherited ones.
     *
     * @example
     * // Necromancer extends Wizard
     * baseClass: 'Wizard'
     */
    baseClass?: Class;

    /** Optional: Audio preferences for class affinity calculation */
    audio_preferences?: {
        primary: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        secondary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        tertiary?: 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';
        bass?: number;
        treble?: number;
        mid?: number;
        amplitude?: number;
    };
}
```

#### getClassData() Helper Function

**Location:** `src/utils/constants.ts`

```typescript
/**
 * Get class data (default or custom)
 *
 * This helper function retrieves class data from either:
 * 1. The default CLASS_DATA constant (for built-in classes)
 * 2. The ExtensionManager (for custom classes registered via 'classes.data')
 *
 * For template-based custom classes (those with a baseClass property),
 * the base class data is merged with custom data, with custom properties
 * taking precedence.
 *
 * @param className - The class name to look up
 * @returns Class data entry or undefined if not found
 *
 * @example
 * // Get default class data
 * const wizardData = getClassData('Wizard');
 * console.log(wizardData.hit_die); // 6
 *
 * // Get custom class data (if registered via ExtensionManager)
 * const necromancerData = getClassData('Necromancer');
 * if (necromancerData) {
 *     console.log(necromancerData.baseClass); // 'Wizard'
 *     console.log(necromancerData.primary_ability); // 'INT'
 * }
 */
export function getClassData(className: string): ClassDataEntry | undefined;
```

#### Template Class Merge Logic

When a custom class specifies `baseClass`, the system merges properties as follows:

```typescript
// The merge happens in getClassData() function in src/utils/constants.ts
{
    ...baseData,        // Base class properties (e.g., Wizard)
    ...classEntry,      // Custom properties override base
    available_skills: classEntry.available_skills || baseData.available_skills
}
```

**Property Override Behavior:**

| Property | Behavior | Example |
|----------|----------|---------|
| `primary_ability` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `INT` |
| `hit_die` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `8` |
| `saving_throws` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `['INT', 'WIS']` |
| `is_spellcaster` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `true` |
| `skill_count` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `2` |
| `available_skills` | **Replaced** (not merged) | Custom list replaces base entirely |
| `has_expertise` | Inherited unless specified | `baseClass: 'Wizard'` → inherits `false` |
| `audio_preferences` | Inherited unless specified | Can override for custom audio affinity |

#### Class-Specific Data Helper Functions

**Location:** `src/utils/constants.ts`

```typescript
/**
 * Get spell list for a class (default or custom)
 *
 * Checks CLASS_SPELL_LISTS for default classes, or ExtensionManager
 * for custom spell lists registered via 'classSpellLists.${ClassName}'.
 *
 * @param className - The class name to look up
 * @returns Spell list with cantrips and spells_by_level, or undefined
 */
export function getClassSpellList(className: string): {
    cantrips: string[];
    spells_by_level: Record<number, string[]>;
} | undefined;

/**
 * Get spell slots for a class at a specific level (default or custom)
 *
 * Checks SPELL_SLOTS_BY_CLASS for default classes, or ExtensionManager
 * for custom spell slot progressions registered via 'classSpellSlots'.
 *
 * @param className - The class name to look up
 * @param characterLevel - The character level (1-20)
 * @returns Record of spell slots by level, or undefined
 */
export function getSpellSlotsForClass(className: string, characterLevel: number): Record<number, number> | undefined;

/**
 * Get starting equipment for a class (default or custom)
 *
 * Checks CLASS_STARTING_EQUIPMENT for default classes, or ExtensionManager
 * for custom equipment registered via 'classStartingEquipment.${ClassName}'.
 *
 * @param className - The class name to look up
 * @returns Equipment object with weapons, armor, items arrays, or undefined
 */
export function getClassStartingEquipment(className: string): {
    weapons: string[];
    armor: string[];
    items: string[];
} | undefined;
```

#### Registering Custom Classes

**Via ExtensionManager:**

```typescript
import { ExtensionManager } from 'playlist-data-engine';
import { asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Step 1: Register custom class data
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Step 2: Register the class name for validation
manager.register('classes', [asClass('Necromancer')]);
```

**Complete Custom Class (without baseClass):**

```typescript
// Register a complete custom class (no inheritance)
manager.register('classes.data', [{
    name: 'Runecaster',
    // No baseClass - must specify everything
    primary_ability: 'WIS',
    hit_die: 8,
    saving_throws: ['WIS', 'CON'],
    is_spellcaster: true,
    skill_count: 3,
    available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
    has_expertise: false
}]);

manager.register('classes', [asClass('Runecaster')]);
```

#### Custom Class Validation

**Location:** `src/core/extensions/ExtensionManager.ts`

The ExtensionManager validates custom classes:

1. **Class Names**: Must be either a default class or registered via `classes.data`
2. **Class Data**: Must have `name` (string), `primary_ability` (Ability), `hit_die` (number), `saving_throws` (Ability[]), `is_spellcaster` (boolean), `skill_count` (number), `available_skills` (string[]), `has_expertise` (boolean)

```typescript
// Validation errors for invalid class data
manager.register('classes', ['InvalidClass']);
// Throws: "Invalid items for category 'classes':
//   Invalid class (must be one of: Barbarian, Bard, Cleric, Druid, Fighter,
//   Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard or a custom
//   class registered via 'classes.data')"
```

#### ClassSuggester Custom Class Support

**Location:** `src/core/generation/ClassSuggester.ts`

The `ClassSuggester` automatically includes custom classes registered via ExtensionManager when suggesting a class based on audio profile:

```typescript
class ClassSuggester {
    /**
     * Suggest a class based on audio profile
     *
     * Selects from available classes (default 12 D&D 5e classes plus any
     * custom classes). Custom classes with audio_preferences are matched
     * against the audio profile.
     *
     * @param audioProfile - The audio analysis result
     * @param rng - Seeded random number generator
     * @returns Suggested class name
     */
    static suggest(audioProfile: AudioProfile, rng: SeededRNG): string;
}
```

#### Usage Examples

**Template-Based Custom Class (Necromancer):**

```typescript
import { ExtensionManager, asClass, CharacterGenerator } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register custom skill for Necromancer
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control',
    prerequisites: { class: asClass('Necromancer') },
    source: 'custom'
}]);

// Register Necromancer class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
}]);

manager.register('classes', [asClass('Necromancer')]);

// Register custom spell list for Necromancer
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death']
        // ... more levels
    }
}]);

// Generate a Necromancer character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // High (primary ability)
console.log(character.spells?.known_spells);  // Custom spell list
```

**Archetype Variant (Battle Mage):**

```typescript
// BattleMage - tougher Wizard variant
manager.register('classes.data', [{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard (d8 → d10)
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}]);

manager.register('classes', [asClass('BattleMage')]);
```

**Multiclass-Inspired (Spellsword):**

```typescript
// Spellsword - Fighter with spellcasting
manager.register('classes.data', [{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting to Fighter
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}]);

manager.register('classes', [asClass('Spellsword')]);

// Register spell list for Spellsword
manager.register('classSpellLists.Spellsword', [{
    cantrips: ['Booming Blade', 'Green-Flame Blade', 'Light', 'Mending'],
    spells_by_level: {
        1: ['Shield', 'Thunderwave', 'Magic Missile'],
        2: ['Blur', 'Warding Bond'],
        // ... more levels
    }
}]);

// Register spell slots for Spellsword (half-caster progression)
manager.register('classSpellSlots', [{
    class: 'Spellsword',
    slots_by_level: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        // ... more levels
    }
}]);
```

**Specialist (Beastmaster Ranger):**

```typescript
// Beastmaster - focused Ranger variant
manager.register('classes.data', [{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}]);

manager.register('classes', [asClass('Beastmaster')]);

// Register custom starting equipment
manager.register('classStartingEquipment.Beastmaster', [{
    weapons: ['Longbow', 'Shortsword'],
    armor: ['Leather Armor'],
    items: ['Explorer\'s Pack', 'Animal Companion Kit']
}]);
```

**Custom Class Spawn Rates:**

```typescript
// Make custom classes rarer than default classes
manager.setWeights('classes', {
    'Fighter': 1.0,       // Common
    'Wizard': 1.0,        // Common
    'Necromancer': 0.2,   // Rare (20% of normal)
    'BattleMage': 0.15,   // Very rare
    'Spellsword': 0.1     // Very rare
});
```

#### Integration with Other Systems

Custom classes created via the template pattern integrate seamlessly with:

- **Custom Skills**: Register via `skills.${ABILITY}` categories
- **Custom Features**: Register via `classFeatures.${ClassName}` categories
- **Custom Spell Lists**: Register via `classSpellLists.${ClassName}` categories
- **Custom Spell Slots**: Register via `classSpellSlots` category
- **Custom Equipment**: Register via `classStartingEquipment.${ClassName}` categories
- **Prerequisites**: Custom classes can be used in feature/skill prerequisites

#### Testing Your Custom Class

```typescript
import { CharacterGenerator, getClassData } from 'playlist-data-engine';

// Verify class data
const necromancerData = getClassData('Necromancer');
if (necromancerData) {
    console.log(necromancerData.baseClass);       // 'Wizard'
    console.log(necromancerData.primary_ability); // 'INT'
    console.log(necromancerData.hit_die);         // 8 (inherited)
    console.log(necromancerData.available_skills); // Custom skill list
}

// Generate a character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // Should be high (primary ability)
console.log(character.saving_throws.INT);   // true (inherited from Wizard)
console.log(character.saving_throws.WIS);   // true (inherited from Wizard)
```

---

## Cross-References

- For quick overview, see [spec.md](specs/001-core-engine/spec.md)
- For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)
