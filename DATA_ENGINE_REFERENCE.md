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
7. [Cross-References](#cross-references)

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

## Cross-References

- For quick overview, see [spec.md](specs/001-core-engine/spec.md)
- For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)
