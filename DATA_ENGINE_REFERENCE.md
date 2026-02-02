# Data Engine Reference

Complete API reference for the Playlist Data Engine. Contains all type definitions, class constructors, and method signatures.

**For quick overview, see [spec.md](specs/001-core-engine/spec.md)**
**For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)**

## Table of Contents

1. [Data Types](#data-types)
2. [Core Modules](#core-modules)
3. [Progression System](#progression-system)
4. [Configuration](#configuration)
5. [Environmental Sensors](#environmental-sensors)
6. [Gaming Integration](#gaming-integration)
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
   - [SpellRegistry](#spellregistry)
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

**Phase 8.1 (v2) ranges** - Rebalanced to prevent treble dominance:
- Bass: 20Hz - 400Hz (380 Hz range, 11% of spectrum)
- Mid: 400Hz - 4kHz (3,600 Hz range, 52% of spectrum)
- Treble: 4kHz - 14kHz (10,000 Hz range, 37% of spectrum)

```typescript
export interface FrequencyBands {
    /** Bass frequencies (20Hz - 400Hz) */
    bass: number[];
    /** Mid frequencies (400Hz - 4kHz) */
    mid: number[];
    /** Treble frequencies (4kHz - 14kHz) */
    treble: number[];
}
```

### Character Types

**Location:** `src/core/types/Character.ts`

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

/**
 * Branded type for extensible Class names
 *
 * This allows custom classes to be registered via ExtensionManager while maintaining
 * type safety. Use asClass() to convert a string to the Class type, and isValidClass()
 * to validate at runtime.
 */
export type Class = string & { readonly __ClassBrand: unique symbol };

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
    /** Weapon properties (e.g., 'finesse', 'versatile', 'thrown', 'reach') */
    properties?: string[];
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

**Location:** `src/core/types/Character.ts` (229-373)

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

### InventoryItem

**Location:** `src/core/generation/EquipmentGenerator.ts` (37-41)

Basic inventory item structure.

```typescript
export interface InventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
}
```

### EnhancedInventoryItem

**Location:** `src/core/types/Equipment.ts` (164-177)

Enhanced inventory item with modification and instance tracking.

```typescript
export interface EnhancedInventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
    modifications?: EquipmentModification[];
    templateId?: string;
    instanceId?: string;
}
```

### CharacterEquipment

**Location:** `src/core/types/Equipment.ts` (183-189)

Equipment and inventory state for a character.

```typescript
export interface CharacterEquipment {
    weapons: EnhancedInventoryItem[];
    armor: EnhancedInventoryItem[];
    items: EnhancedInventoryItem[];
    totalWeight: number;
    equippedWeight: number;
}
```

### CharacterAppearance

**Location:** `src/core/generation/AppearanceGenerator.ts` (8-21)

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

**Location:** `src/core/types/Environmental.ts` (155-163)

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

### GeolocationData

**Location:** `src/core/types/Environmental.ts` (94-102)

```typescript
export interface GeolocationData {
    latitude: number;
    longitude: number;
    altitude: number | null;      // Meters above sea level (null if unavailable)
    accuracy: number;             // Meters
    heading: number | null;       // Direction 0-360 degrees (null if unavailable)
    speed: number | null;         // Meters per second (null if unavailable)
    timestamp: number;            // Unix timestamp
}

### MotionData

**Location:** `src/core/types/Environmental.ts` (104-122)

```typescript
export interface MotionData {
    acceleration: {
        x: number | null;  // m/s²
        y: number | null;
        z: number | null;
    };
    accelerationIncludingGravity: {
        x: number;
        y: number;
        z: number;
    };
    rotationRate: {
        alpha: number | null;  // degrees/second
        beta: number | null;
        gamma: number | null;
    };
    interval: number;          // Time interval between samples (ms)
    timestamp: number;
}
```

### WeatherData

**Location:** `src/core/types/Environmental.ts` (124-134)

```typescript
export interface WeatherData {
    temperature: number;          // Celsius
    humidity: number;             // Percentage
    pressure: number;             // hPa
    weatherType: string;          // e.g., 'Clear', 'Rain', 'Clouds'
    windSpeed: number;            // m/s
    windDirection: number;        // Degrees
    isNight: boolean;             // Based on sunrise/sunset times
    moonPhase: number;            // 0.0 to 1.0 (new to full)
    timestamp: number;
}
```

### LightData

**Location:** `src/core/types/Environmental.ts` (148-151)

```typescript
export interface LightData {
    illuminance: number;          // lux (light intensity)
    timestamp: number;
}
```

### ForecastData

**Location:** `src/core/types/Environmental.ts` (136-146)

```typescript
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

**Location:** `src/core/types/Environmental.ts`

```typescript
export type SensorType = 'geolocation' | 'motion' | 'weather' | 'light'; // (1)

export interface PerformanceMetrics { // (6-19)
    successCount: number;        // Number of successful API calls
    errorCount: number;          // Number of failed API calls
    totalTime: number;           // Total time spent on successful API calls (milliseconds)
    minTime: number;             // Time of the fastest API call (milliseconds)
    maxTime: number;             // Time of the slowest API call (milliseconds)
    lastCallTimestamp: number | null;
}

export interface PerformanceStatistics { // (24-35)
    average: number;             // Average API call time in milliseconds
    min: number;                 // Minimum API call time in milliseconds
    max: number;                 // Maximum API call time in milliseconds
    totalCalls: number;          // Total number of API calls
    successRate: number;         // Success rate as percentage (0-100)
}

export interface SensorPermission { // (37-41)
    type: SensorType;
    granted: boolean;
    timestamp: number;
}

export type SensorHealthStatus = 'healthy' | 'degraded' | 'failed' | 'unknown'; // (46)

export interface SensorStatus { // (51-60)
    type: SensorType;
    health: SensorHealthStatus;
    lastSuccessTimestamp: number | null;
    lastFailureTimestamp: number | null;
    consecutiveFailures: number;
    totalFailures: number;
    lastError: string | null;
    isRetrying: boolean;
}

export interface SensorFailureLog { // (65-71)
    sensorType: SensorType;
    timestamp: number;
    error: string;
    retryAttempt: number;
    willRetry: boolean;
}

export interface SensorRetryConfig { // (76-81)
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export interface SensorRecoveryNotification { // (86-92)
    sensorType: SensorType;
    previousStatus: SensorHealthStatus;
    newStatus: SensorHealthStatus;
    timestamp: number;
    message: string;
}
```

### SevereWeatherAlert

**Location:** `src/core/sensors/WeatherAPIClient.ts` (50-56)

```typescript
export interface SevereWeatherAlert {
    type: SevereWeatherType;     // Enum: Blizzard, Hurricane, Typhoon, Tornado, None
    xpBonus: number;             // 0.5 to 1.0 (50% to 100%)
    severity: 'moderate' | 'high' | 'extreme';
    message: string;
    detectedAt: number;
}
```

**Related:** `SevereWeatherType` enum defined at `src/core/sensors/WeatherAPIClient.ts` (39-44)

### GamingContext

**Location:** `src/core/types/Progression.ts` (36-51)

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

### Combat Types

**Location:** `src/core/types/Combat.ts`

Core D&D 5e-inspired turn-based combat type definitions.

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

**Locations:**
- `InitiativeResult` → `src/core/combat/InitiativeRoller.ts` (11-16)
- `AttackResult` → `src/core/combat/AttackResolver.ts` (15-23)
- `SpellSlots` → `src/core/generation/SpellManager.ts` (24-31)

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

*Location: `src/utils/hash.ts`*

- `generateSeed(chain: string, address: string, id: string): string`
    - Creates a unique seed string.
- `hashSeedToFloat(seed: string): number`
    - Returns a float between 0.0 and 1.0.
- `hashSeedToInt(seed: string, min: number, max: number): number`
    - Returns an integer in range [min, max).
- `deriveSeed(baseSeed: string, suffix: string): string`
    - Creates a derived seed by appending a suffix to a base seed.

**Randomness**

*Location: `src/utils/random.ts`*

```typescript
class SeededRNG {
    constructor(seed: string)

    // Generate random values
    random(): number                              // Returns float in [0.0, 1.0)
    randomInt(min: number, max: number): number   // Returns integer in [min, max)
    randomChoice<T>(array: T[]): T                // Selects random element from array
    weightedChoice<T>(choices: [T, number][]): T  // Selects element using weights
    shuffle<T>(array: T[]): T[]                   // Returns shuffled copy of array
    reset(): void                                 // Resets internal counter (for testing)
}
```

**SeededRNG** provides deterministic random number generation for reproducible results. The same seed always produces the same sequence of random values, making it ideal for blockchain-based character generation, procedural content, and testing.

**Method Reference:**

| Method | Returns | Description |
|--------|---------|-------------|
| `constructor(seed)` | - | Creates a new RNG with the given seed string |
| `random()` | `number` | Float in range [0.0, 1.0) |
| `randomInt(min, max)` | `number` | Integer in range [min, max) - min is inclusive, max is exclusive |
| `randomChoice(array)` | `T` | Random element from the array |
| `weightedChoice(choices)` | `T` | Element from weighted choices - takes `[[value, weight], ...]` tuples |
| `shuffle(array)` | `T[]` | New array with elements in random order |
| `reset()` | `void` | Resets the internal counter to 0 (restarts sequence from seed) |

**Validation Schemas**

*Location: `src/utils/validators.ts`*

Zod validation schemas for runtime type validation of playlist, audio, and character data.

- `PlaylistTrackSchema`: Validates track metadata (lines 14-48) - includes chain-specific validation (AR requires tx_id, other chains require token_address and token_id)
- `ServerlessPlaylistSchema`: Validates full playlist (lines 53-61) - validates playlist structure with metadata and tracks array
- `AudioProfileSchema`: Validates audio analysis (lines 66-89) - validates frequency analysis, color palette, and analysis metadata
- `AbilityScoresSchema`: Validates ability scores (lines 94-101) - validates all six ability scores (STR, DEX, CON, INT, WIS, CHA) are in range 1-20
- `CharacterSheetSchema`: Validates character data (lines 106-156) - comprehensive validation of complete character sheet including nested objects for abilities, HP, skills, equipment, appearance, and XP

**Logging**

*Location: `src/utils/logger.ts`*

The Logger utility provides centralized logging with consistent log levels across the application. It supports configurable verbosity, custom handlers for testing, and diagnostic mode for troubleshooting.

```typescript
enum LogLevel {
    DEBUG = 0,   // Detailed debugging information
    INFO = 1,    // General operational information
    WARN = 2,    // Warning conditions that should be addressed
    ERROR = 3,   // Error conditions that need attention
    NONE = 4     // Disable all logging
}

class Logger {
    // Instance methods
    debug(message: string, data?: unknown): void
    info(message: string, data?: unknown): void
    warn(message: string, data?: unknown): void
    error(message: string, data?: unknown): void

    // Static methods
    static for(context: string): Logger
    static setLevel(level: LogLevel): void
    static getLevel(): LogLevel
    static configure(config: LoggerConfig): void
    static reset(): void

    // Verbose mode (convenience for setting DEBUG level)
    static enableVerbose(): void
    static disableVerbose(): void
    static setVerbose(enabled: boolean): void
    static isVerbose(): boolean

    // Diagnostic mode (maximum verbosity for troubleshooting)
    static enableDiagnosticMode(): void
    static disableDiagnosticMode(): void
    static isDiagnosticMode(): boolean
}

function createLogger(context: string): Logger

interface LogEntry {
    timestamp: Date
    level: LogLevel
    context: string
    message: string
    data?: unknown
}

interface LoggerConfig {
    level?: LogLevel
    includeTimestamp?: boolean
    includeContext?: boolean
    customHandler?: (entry: LogEntry) => void
}
```

**Method Reference:**

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

**Sensor Dashboard**

*Location: `src/utils/sensorDashboard.ts`*

The Sensor Dashboard provides formatted console output for sensor diagnostics during development and debugging. It displays sensor status, health indicators, cache statistics, performance metrics, and recent failures with optional color support.

```typescript
interface DashboardConfig {
    /** Use colors in output (default: true, auto-disabled in non-TTY environments) */
    useColors?: boolean;
    /** Compact mode for smaller output (default: false) */
    compact?: boolean;
    /** Show timestamp (default: true) */
    showTimestamp?: boolean;
    /** Maximum number of recent failures to show (default: 5) */
    maxFailures?: number;
}
```

**Functions:**

- `displayEnvironmentalDiagnostics(diagnostics, config?): void`
    - Displays environmental sensor dashboard (GPS, motion, weather, light sensors)
    - Shows sensor health, permissions, availability, cache stats, API performance, recent failures
    - **Parameters:**
        - `diagnostics`: Return value of `EnvironmentalSensors.getDiagnostics()`
        - `config`: Optional `DashboardConfig` object
- `displayGamingDiagnostics(diagnostics, config?): void`
    - Displays gaming platform sensor dashboard (Steam, Discord)
    - Shows platform connection status, current game, polling status, cache, API performance
    - **Parameters:**
        - `diagnostics`: Return value of `GamingPlatformSensors.getDiagnostics()`
        - `config`: Optional `DashboardConfig` object
- `displaySystemDashboard(data, config?): void`
    - Displays a combined system dashboard with quick health summary
    - **Parameters:**
        - `data`: Object with optional `environmental` and `gaming` diagnostics
        - `config`: Optional `DashboardConfig` object

**SensorDashboard Object:**

All dashboard functions are also available as methods of the `SensorDashboard` object:

```typescript
import { SensorDashboard } from 'playlist-data-engine';

SensorDashboard.displayEnvironmentalDiagnostics(diagnostics);
SensorDashboard.displayGamingDiagnostics(diagnostics);
SensorDashboard.displaySystemDashboard({ environmental, gaming });
```

**Dashboard Output Sections:**

*Environmental Diagnostics:*
- Sensor Status (health, permissions, availability, consecutive failures, last error)
- Cache Statistics (geolocation age/expiry, weather cache size, hit rates)
- API Performance (Weather API, Forecast API - calls, success rate, avg/min/max/P95/P99 times)
- Recent Failures (sensor type, error, retry attempt, time ago)
- Context Data (geolocation, motion, weather, light, biome availability)

*Gaming Diagnostics:*
- Platform Status (Steam authentication/API key, Discord connection/client ID/state)
- Gaming Context (active gaming, platform, current game with session duration/party size)
- Polling Status (active status, interval, exponential backoff)
- Cache (game metadata size, cached games list)
- API Performance (Current Game API, Metadata API metrics)

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

#### Helper Functions

**Location:** `src/utils/constants.ts`

These helper functions retrieve data from both default constants and custom extensions registered via ExtensionManager.

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
export function getRaceData(race: string): RaceDataEntry | undefined

/**
 * Get class data (default or custom)
 *
 * Checks both the default CLASS_DATA and the ExtensionManager for custom class data.
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
export function getClassData(className: string): ClassDataEntry | undefined

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
} | undefined

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
export function getSpellSlotsForClass(className: string, characterLevel: number): Record<number, number> | undefined

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
} | undefined
```

#### Interface Definitions

**RaceDataEntry**

```typescript
/**
 * Race data entry interface
 *
 * Defines the structure for race data including ability score bonuses,
 * base walking speed, traits, and available subraces. Used by RACE_DATA
 * and by custom races registered via ExtensionManager.
 */
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

**ClassDataEntry**

```typescript
/**
 * Class data entry interface
 *
 * Defines the structure for class data including primary ability, hit die,
 * saving throws, spellcasting, skills, expertise, and optional audio preferences.
 *
 * ## Template-Based Class System
 *
 * This interface supports creating custom classes that extend (inherit from) existing
 * D&D 5e base classes through the `baseClass` property. This enables rapid
 * creation of specialized classes (e.g., "Necromancer" extending "Wizard") without
 * duplicating all base class properties.
 *
 * ### How Template Inheritance Works
 *
 * When `baseClass` is specified in a custom class registration:
 *
 * 1. **Base class lookup**: The system retrieves the base class data from CLASS_DATA
 * 2. **Property merging**: Base class properties are merged with custom class properties
 * 3. **Override behavior**: Custom properties take precedence over base class properties
 * 4. **Special handling for available_skills**: Custom skill list replaces base skill list
 *    (not merged), allowing complete customization of class skills
 */
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

**SkillPrerequisite (Detailed)**

```typescript
/**
 * Skill prerequisite interface
 *
 * Defines prerequisites that must be met before a character can gain
 * proficiency in a skill. Allows for advanced skills that require base
 * skills, specific features, spells, ability scores, level, class, or race.
 */
export interface SkillPrerequisite {
    /** Minimum character level required */
    level?: number;

    /** Minimum ability scores required */
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;

    /** Specific class required */
    class?: Class;

    /** Specific race required */
    race?: Race;

    /** Specific subrace required (e.g., 'High Elf', 'Hill Dwarf') */
    subrace?: string;

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

**SpellPrerequisite (Detailed)**

```typescript
/**
 * Spell prerequisite interface
 *
 * Defines prerequisites that must be met before a spellcaster can learn
 * a spell. Allows for specialized spells that require specific features,
 * abilities, spells, skills, level, or class.
 */
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

**Type Helper Functions**

```typescript
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

Separates raw frequency data into bands using Phase 8.1 (v2) rebalanced ranges.

- `static separateFrequencyBands(frequencyData: Uint8Array, sampleRate: number): FrequencyBands`
    - **Bass:** 20Hz - 400Hz (380 Hz range, 11% of spectrum)
    - **Mid:** 400Hz - 4kHz (3,600 Hz range, 52% of spectrum)
    - **Treble:** 4kHz - 14kHz (10,000 Hz range, 37% of spectrum)

---

### CharacterGenerator

**Location:** `src/core/generation/CharacterGenerator.ts`

The `CharacterGenerator` creates deterministic D&D 5e character sheets based on a seed and an audio profile.

#### Class: `CharacterGenerator`

**Methods:**

```typescript
class CharacterGenerator {
    static generate(
        seed: string,
        audioProfile: AudioProfile,
        name: string,
        options?: CharacterGeneratorOptions
    ): CharacterSheet
}

interface CharacterGeneratorOptions {
    level?: number;              // Starting level (1-20). Default: 1
    forceClass?: Class;          // Override the suggested class
    forceRace?: Race;            // Override the race selection
    subrace?: string | 'pure';   // Subrace selection (see below)
    gameMode?: GameMode;         // Game mode for stat progression. Default: 'standard'
    extensions?: CharacterGeneratorExtensions;  // Custom extensions for procedural generation
}

interface CharacterGeneratorExtensions {
    spells?: SpellExtension[];           // Custom spells to add (spell names)
    equipment?: EquipmentExtension[];    // Custom equipment to add
    races?: RaceExtension[];             // Custom races to add (race names)
    classes?: ClassExtension[];          // Custom classes to add (class names)
    appearance?: AppearanceExtension;    // Custom appearance options
}

type SpellExtension = string;
type EquipmentExtension = string;
type RaceExtension = string;
type ClassExtension = string;

interface AppearanceExtension {
    hairColors?: string[];
    skinTones?: string[];
    eyeColors?: string[];
    builds?: string[];
    heights?: string[];
}

interface CharacterSheet {
    name: string;
    race: Race;
    subrace?: string;
    class: Class;
    level: number;
    ability_scores: AbilityScores;
    ability_modifiers: AbilityScores;
    skills: Record<Skill, ProficiencyLevel>;
    spells?: SpellSlots;
    equipment: CharacterEquipment;
    appearance: CharacterAppearance;
    gameMode: 'standard' | 'uncapped';
}

type Ability = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';

/**
 * Branded type for extensible Class names
 *
 * This allows custom classes to be registered via ExtensionManager while maintaining
 * type safety. The default D&D 5e classes are available via DEFAULT_CLASSES constant.
 *
 * Use asClass() to convert a string to the Class type, and isValidClass()
 * to validate at runtime.
 *
 * @example
 * // Default D&D 5e classes
 * const defaultClass: Class = 'Wizard' as Class;
 *
 * // Custom class (must be registered via ExtensionManager first)
 * const customClass: Class = asClass('Necromancer');
 * if (isValidClass(customClass)) {
 *   // Safe to use
 * }
 */
type Class = string & { readonly __ClassBrand: unique symbol };

type Race = 'Dwarf' | 'Elf' | 'Halfling' | 'Human' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling';
type ProficiencyLevel = 0 | 0.5 | 1 | 2;  // None, Half-proficiency, Proficient, Expertise
```

**Method Reference:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `seed` | `string` | Unique string (e.g., track ID) to ensure deterministic results |
| `audioProfile` | `AudioProfile` | The audio analysis result (frequency, amplitude data) |
| `name` | `string` | Character name |
| `options.level` | `number` | Starting level (1-20). Default: `1` |
| `options.forceClass` | `Class` | Override the suggested class from audio analysis |
| `options.forceRace` | `Race` | Override race selection (required when specifying subrace) |
| `options.subrace` | `string \| 'pure'` | Subrace selection (see below) |
| `options.gameMode` | `'standard' \| 'uncapped'` | Game mode for stat progression. Default: `'standard'` |

**Subrace Options:**

| Value | Description | Requirements |
|-------|-------------|--------------|
| `undefined` | Randomly select between 'pure' and available subraces | None |
| `'pure'` | Explicitly no subrace | None |
| `'High Elf'`, etc. | Specific subrace | `forceRace` must be specified |

**Returns:** A complete `CharacterSheet` with:
- Race, Class, Level
- Subrace (if specified or randomly selected)
- Ability Scores (STR, DEX, etc.) with modifiers
- Skills with proficiency levels
- Spells (for spellcasting classes)
- Equipment (starting gear)
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

- `static assignSkills(characterClass: Class, rng: SeededRNG, character?: CharacterSheet): Record<string, ProficiencyLevel>`
    - Selects random skills from the class's available list.
    - Handles "Expertise" for Bards and Rogues.
    - Supports custom skills via SkillRegistry (return type uses `string` instead of `Skill`).
    - Optional `character` parameter enables prerequisite validation for custom skills.

#### Helper: `SpellManager`

**Location:** `src/core/generation/SpellManager.ts`

Manages spells for spellcasting classes.

- `static isSpellcaster(characterClass: Class): boolean`
    - Returns true if the class can cast spells.
- `static getSpellSlots(characterClass: Class, characterLevel: number): Record<number, { total: number; used: number }>`
    - Gets spell slot counts for a class at a given level.
- `static getCantrips(characterClass: Class): string[]`
    - Returns all available cantrips for a spellcasting class.
- `static getKnownSpells(characterClass: Class, characterLevel: number, character?: CharacterSheet): string[]`
    - Returns all spells known by a spellcaster at a given level.
    - If `character` is provided, filters spells by their prerequisites.
- `static initializeSpells(characterClass: Class, characterLevel: number, character?: CharacterSheet): SpellSlots`
    - Returns complete spell configuration with slots, known spells, and cantrips.
- `static filterCharacterSpells(character: CharacterSheet): CharacterSheet`
    - Filters a character's known spells and cantrips by their prerequisites.
    - Returns an updated character sheet with only valid spells.
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

Orchestrates applying session results to a character, handling leveling up and mastery.

#### Class: `CharacterUpdater`

**Methods:**

- `constructor(statManager?: StatManager)`
  - Creates a new CharacterUpdater instance
  - Optionally accepts a StatManager to override the default stat increase strategy
  - If no StatManager is provided, the strategy is auto-detected based on the character's gameMode

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

**Location:** `src/core/progression/CharacterUpdater.ts` (9-18)

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

### LevelUpDetail

**Location:** `src/core/types/Progression.ts` (219-254)

```typescript
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

**Location:** `src/core/progression/LevelUpProcessor.ts` (25-63)

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
- `static getXPThreshold(level: number, isUncapped: boolean = false): number`
    - Returns XP required for a specific level.
    - `isUncapped`: When true, uses uncapped progression formula for levels beyond 20.

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

**Location:** `src/core/progression/LevelUpProcessor.ts` (75-82)

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

#### Helper: `DiceRoller` (utility functions)

**Location:** `src/core/combat/DiceRoller.ts`

> **Note**: This is a collection of standalone exported functions, not a class. Import functions directly.

Utility functions for D&D-style dice rolling mechanics.

**Basic Dice Functions:**

- `rollDie(sides: number): number`
    - Roll a single die with the specified number of sides (4, 6, 8, 10, 12, 20, 100)
    - Returns a value from 1 to sides
- `rollD20(): number`
    - Roll a d20 (common for attacks, ability checks, saving throws)
    - Returns a value from 1 to 20
- `rollMultipleDice(count: number, sides: number): number[]`
    - Roll multiple dice of the same size
    - Returns an array of individual roll results
- `rollPercentile(): number`
    - Roll a d100 (percentile die)
    - Returns a value from 1 to 100

**Formula Parsing:**

- `parseDiceFormula(formula: string): { diceCount: number, diceSides: number, modifier: number, rolls: number[], total: number }`
    - Parse and roll a dice formula string like "2d6+3" or "1d20-2"
    - Returns an object with parsed formula data and results

**Advantage/Disadvantage:**

- `rollWithAdvantage(): { roll1: number, roll2: number, result: number }`
    - Roll d20 with advantage (roll twice, take higher)
    - Returns both rolls and the final result
- `rollWithDisadvantage(): { roll1: number, roll2: number, result: number }`
    - Roll d20 with disadvantage (roll twice, take lower)
    - Returns both rolls and the final result

**Combat Functions:**

- `rollInitiative(dexModifier: number): number`
    - Roll initiative (d20 + DEX modifier)
    - Returns the initiative value
- `calculateDamage(formula: string, modifier: number, isCritical?: boolean): { rolls: number[], modifier: number, total: number, isCritical: boolean }`
    - Calculate damage from a dice formula with optional modifier
    - For critical hits, dice are doubled (not the modifier)
    - Returns detailed damage breakdown
- `doubleDamage(rolls: number[]): number[]`
    - Double the damage dice for a critical hit
    - Returns a new array with each roll duplicated

**Saving Throws & Ability Checks:**

- `rollSavingThrow(abilityModifier: number, proficiencyBonus?: number): number`
    - Roll a saving throw (d20 + ability modifier + proficiency bonus if proficient)
    - Returns the total save result
- `rollAbilityCheck(abilityModifier: number, proficiencyBonus?: number): number`
    - Roll an ability check (d20 + ability modifier + proficiency bonus if proficient)
    - Returns the total check result

**Critical Hit Detection:**

- `isCriticalHit(d20Roll: number): boolean`
    - Check if a d20 roll is a critical hit (natural 20)
- `isCriticalMiss(d20Roll: number): boolean`
    - Check if a d20 roll is a critical miss (natural 1)

**Seeded RNG:**

- `seededRoll(seed: number): number`
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

### FeatureRegistry

**Location:** `src/core/features/FeatureRegistry.ts`

Singleton registry for managing class features and racial traits with prerequisite validation and subrace support.

```typescript
class FeatureRegistry {
    // Instance Management
    static getInstance(): FeatureRegistry

    // Initialization
    initializeDefaults(defaultClassFeatures?: ClassFeature[], defaultRacialTraits?: RacialTrait[]): void
    reset(): void
    isInitialized(): boolean

    // Class Features
    registerClassFeature(feature: ClassFeature): void
    registerClassFeatures(features: ClassFeature[]): void
    getClassFeatures(characterClass: Class, level?: number): ClassFeature[]
    getClassFeaturesForLevel(characterClass: Class, level: number): ClassFeature[]
    getClassFeatureById(featureId: string): ClassFeature | undefined
    getAllClassFeatures(): Map<string, ClassFeature[]>

    // Racial Traits
    registerRacialTrait(trait: RacialTrait): void
    registerRacialTraits(traits: RacialTrait[]): void
    getRacialTraits(race: Race): RacialTrait[]
    getRacialTraitsForSubrace(race: Race, subrace: string): RacialTrait[]
    getBaseRacialTraits(race: Race): RacialTrait[]
    getSubraceTraits(race: Race, subrace: string): RacialTrait[]
    getAvailableSubraces(race: Race): string[]
    getRacialTraitById(traitId: string): RacialTrait | undefined
    getAllRacialTraits(): Map<string, RacialTrait[]>

    // Validation
    validatePrerequisites(feature: ClassFeature | RacialTrait, character: CharacterSheet): ValidationResult
    validateFeaturePrerequisites(feature: ClassFeature, character: CharacterSheet): ValidationResult
    validateTraitPrerequisites(trait: RacialTrait, character: CharacterSheet): ValidationResult
    canGainFeature(feature: ClassFeature | RacialTrait, character: CharacterSheet): boolean

    // Registry Statistics
    getRegisteredClasses(): Class[]
    getRegisteredRaces(): Race[]
    getRegistryStats(): { totalClassFeatures: number; totalRacialTraits: number; classesWithFeatures: number; racesWithTraits: number }

    // Export
    exportRegistry(): { classFeatures: Record<string, ClassFeature[]>; racialTraits: Record<string, RacialTrait[]> }

    // Equipment Features (static methods)
    static getEquipmentFeatures(equipmentName: string): ClassFeature[]
    static isValidEquipmentFeature(featureId: string): boolean
    static registerEquipmentFeature(feature: ClassFeature): void
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
| `getInstance()` | - | `FeatureRegistry` | Returns singleton instance |
| `initializeDefaults()` | `defaultClassFeatures?`, `defaultRacialTraits?` | `void` | Load default features and traits |
| `reset()` | - | `void` | Clear all custom data, reload defaults |
| `isInitialized()` | - | `boolean` | Check if registry has been initialized |
| `registerClassFeature()` | `feature` | `void` | Register single class feature |
| `registerClassFeatures()` | `features[]` | `void` | Register multiple class features |
| `getClassFeatures()` | `class`, `level?` | `ClassFeature[]` | Get all features for class (filtered by level) |
| `getClassFeaturesForLevel()` | `class`, `level` | `ClassFeature[]` | Get features for specific class level |
| `getClassFeatureById()` | `featureId` | `ClassFeature \| undefined` | Find feature by ID |
| `getAllClassFeatures()` | - | `Map<string, ClassFeature[]>` | Get all class features by class |
| `registerRacialTrait()` | `trait` | `void` | Register single racial trait |
| `registerRacialTraits()` | `traits[]` | `void` | Register multiple racial traits |
| `getRacialTraits()` | `race` | `RacialTrait[]` | Get base traits for race (no subrace) |
| `getRacialTraitsForSubrace()` | `race`, `subrace` | `RacialTrait[]` | Get base + subrace-specific traits |
| `getBaseRacialTraits()` | `race` | `RacialTrait[]` | Get only base traits (no subrace) |
| `getSubraceTraits()` | `race`, `subrace` | `RacialTrait[]` | Get only subrace-specific traits |
| `getAvailableSubraces()` | `race` | `string[]` | Get sorted list of available subraces |
| `getRacialTraitById()` | `traitId` | `RacialTrait \| undefined` | Find trait by ID |
| `getAllRacialTraits()` | - | `Map<string, RacialTrait[]>` | Get all racial traits by race |
| `validatePrerequisites()` | `feature`, `character` | `ValidationResult` | Validate any feature/trait prerequisites |
| `validateFeaturePrerequisites()` | `feature`, `character` | `ValidationResult` | Validate class feature prerequisites |
| `validateTraitPrerequisites()` | `trait`, `character` | `ValidationResult` | Validate racial trait prerequisites |
| `canGainFeature()` | `feature`, `character` | `boolean` | Check if character can gain feature |
| `getRegisteredClasses()` | - | `Class[]` | Get all classes with features |
| `getRegisteredRaces()` | - | `Race[]` | Get all races with traits |
| `getRegistryStats()` | - | `{ totalClassFeatures, totalRacialTraits, classesWithFeatures, racesWithTraits }` | Get registry statistics |
| `exportRegistry()` | - | `{ classFeatures, racialTraits }` | Export all features as JSON |
| `getEquipmentFeatures()` | `equipmentName` | `ClassFeature[]` | Get features that can be granted by equipment (static) |
| `isValidEquipmentFeature()` | `featureId` | `boolean` | Check if feature can be granted by equipment (static) |
| `registerEquipmentFeature()` | `feature` | `void` | Register equipment-granted feature (static) |

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

**Prerequisite Validation Rules:**

`validatePrerequisites()` checks:
- `level` - Number between 1 and 20
- `abilities` - Record with valid abilities (STR, DEX, CON, INT, WIS, CHA) and scores between 1-20
- `class` - Valid default class or custom class registered via ExtensionManager
- `race` - Valid default race or custom race registered via ExtensionManager
- `subrace` - Non-empty string
- `features` - Array of feature ID strings
- `skills` - Array of valid skill IDs
- `spells` - Array of spell name strings
- `custom` - String (manual condition description)

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

### SkillRegistry

**Location:** `src/core/skills/SkillRegistry.ts`

Singleton registry for managing character skills with prerequisite validation and ability score associations.

```typescript
class SkillRegistry {
    // Instance Management
    static getInstance(): SkillRegistry

    // Initialization
    initializeDefaults(defaultSkills?: CustomSkill[]): void
    reset(): void
    isInitialized(): boolean

    // Registration
    registerSkill(skill: CustomSkill): void
    registerSkills(skills: CustomSkill[]): void

    // Retrieval
    getSkill(id: string): CustomSkill | undefined
    getAllSkills(): CustomSkill[]
    getSkillsByAbility(ability: Ability): CustomSkill[]
    getSkillsByCategory(category: string): CustomSkill[]
    getCategories(): string[]
    getSkillsBySource(source: 'default' | 'custom'): CustomSkill[]
    getAvailableSkills(character: CharacterSheet): CustomSkill[]

    // Validation
    validatePrerequisites(skill: CustomSkill, character: CharacterSheet): SkillValidationResult
    validateSkill(skill: CustomSkill): SkillValidationResult

    // Query
    isValidSkill(id: string): boolean
    getSkillCount(): number
    getRegistryStats(): SkillRegistryStats

    // Export/Import
    exportRegistry(): CustomSkill[]

    // Unregister (primarily for testing)
    unregisterSkill(id: string): boolean
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

interface SkillRegistryStats {
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
| `getInstance()` | - | `SkillRegistry` | Returns singleton instance |
| `initializeDefaults()` | `defaultSkills?` | `void` | Load default skills (uses DEFAULT_SKILLS if not provided) |
| `reset()` | - | `void` | Clear all custom data, reload defaults |
| `isInitialized()` | - | `boolean` | Check if registry has been initialized |
| `registerSkill()` | `skill` | `void` | Register single custom skill |
| `registerSkills()` | `skills[]` | `void` | Register multiple custom skills |
| `getSkill()` | `id` | `CustomSkill \| undefined` | Get skill by ID |
| `getAllSkills()` | - | `CustomSkill[]` | Get all registered skills |
| `getSkillsByAbility()` | `ability` | `CustomSkill[]` | Get skills for specific ability |
| `getSkillsByCategory()` | `category` | `CustomSkill[]` | Get skills in a specific category |
| `getCategories()` | - | `string[]` | Get all categories in use |
| `getSkillsBySource()` | `source` | `CustomSkill[]` | Get skills by source (default or custom) |
| `getAvailableSkills()` | `character` | `CustomSkill[]` | Get skills character can learn (prerequisites met) |
| `validatePrerequisites()` | `skill`, `character` | `SkillValidationResult` | Validate skill prerequisites against character |
| `validateSkill()` | `skill` | `SkillValidationResult` | Validate skill data structure |
| `isValidSkill()` | `id` | `boolean` | Check if skill ID exists in registry |
| `getSkillCount()` | - | `number` | Get total skill count |
| `getRegistryStats()` | - | `SkillRegistryStats` | Get statistics about registered skills |
| `exportRegistry()` | - | `CustomSkill[]` | Export all registered skills as JSON |
| `unregisterSkill()` | `id` | `boolean` | Remove skill by ID (primarily for testing) |

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

#### API Interfaces

```typescript
interface SkillPrerequisite {
    level?: number;
    abilities?: Partial<Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', number>>;
    class?: Class;
    race?: Race;
    skills?: string[];
    features?: string[];
    spells?: string[];
    custom?: string;
}

interface CustomSkill {
    id: string;
    name: string;
    ability: Ability;
    prerequisites?: SkillPrerequisite;
    source: 'default' | 'custom';
}
```

**Validation:**
- `SkillValidator.validateSkillPrerequisites(skill, character)` - Validate prerequisites against character
- `SkillRegistry.validatePrerequisites(skill, character)` - Validate via registry

---

### Spell Prerequisites

**For comprehensive guide, examples, and best practices:** See [docs/PREREQUISITES.md](docs/PREREQUISITES.md)

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

#### API Interfaces

```typescript
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

interface Spell {
    id?: string;
    name: string;
    level: number;
    school: 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment' | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
    prerequisites?: SpellPrerequisite;
}
```

**Validation:**
- `SpellValidator.validateSpellPrerequisites(prerequisites, character)` - Validate prerequisites against character
- `SpellValidator.validateSpell(spell)` - Validate spell schema including prerequisites

---

### SpellRegistry

**Location:** `src/core/spells/SpellRegistry.ts`

Singleton registry for managing spells with prerequisite validation and school categorization.

```typescript
class SpellRegistry {
    // Instance Management
    static getInstance(): SpellRegistry

    // Initialization
    initializeDefaults(defaultSpells?: Record<string, Spell>): void
    reset(): void
    isInitialized(): boolean

    // Registration
    registerSpell(spell: RegisteredSpell): void
    registerSpells(spells: RegisteredSpell[]): void

    // Retrieval
    getSpell(spellId: string): RegisteredSpell | undefined
    getSpells(): RegisteredSpell[]
    getSpellsByLevel(level: number): RegisteredSpell[]
    getSpellsBySchool(school: SpellSchool): RegisteredSpell[]
    getSpellsForClass(characterClass: Class): RegisteredSpell[]
    getAvailableSpells(character: CharacterSheet): RegisteredSpell[]
    getSpellsBySource(source: 'default' | 'custom'): RegisteredSpell[]

    // Class Spell Lists
    getClassSpellList(characterClass: Class): string[]
    registerClassSpellList(characterClass: Class, spellIds: string[]): void

    // Spell Slots
    getSpellSlotsForClass(characterClass: Class, level: number): number

    // Validation
    validatePrerequisites(spell: RegisteredSpell, character: CharacterSheet): ValidationResult
    validateSpell(spell: RegisteredSpell): ValidationResult

    // Query
    hasSpell(spellId: string): boolean
    getSpellCount(): number
    getRegistryStats(): { totalSpells: number; defaultSpells: number; customSpells: number; spellsByLevel: Record<number, number>; spellsBySchool: Record<SpellSchool, number>; classesWithSpells: number }

    // Export/Import
    exportRegistry(): RegisteredSpell[]

    // Unregister (primarily for testing)
    unregisterSpell(spellId: string): boolean
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
| `getInstance()` | - | `SpellRegistry` | Returns singleton instance |
| `initializeDefaults()` | `defaultSpells?` | `void` | Load default spells (uses SPELL_DATABASE if not provided) |
| `reset()` | - | `void` | Clear all custom data, reload defaults |
| `isInitialized()` | - | `boolean` | Check if registry has been initialized |
| `registerSpell()` | `spell` | `void` | Register single custom spell |
| `registerSpells()` | `spells[]` | `void` | Register multiple custom spells |
| `getSpell()` | `spellId` | `RegisteredSpell \| undefined` | Get spell by ID |
| `getSpells()` | - | `RegisteredSpell[]` | Get all spells |
| `getSpellsByLevel()` | `level` | `RegisteredSpell[]` | Get spells of specific level (0-9) |
| `getSpellsBySchool()` | `school` | `RegisteredSpell[]` | Get spells of specific school |
| `getSpellsForClass()` | `class` | `RegisteredSpell[]` | Get spells available to a class |
| `getAvailableSpells()` | `character` | `RegisteredSpell[]` | Get spells character can learn (prerequisites met) |
| `getSpellsBySource()` | `source` | `RegisteredSpell[]` | Get spells by source (default or custom) |
| `getClassSpellList()` | `class` | `string[]` | Get spell list for a class |
| `registerClassSpellList()` | `class`, `spellIds[]` | `void` | Register spell list for a class |
| `getSpellSlotsForClass()` | `class`, `level` | `number` | Get spell slots for class/level |
| `validatePrerequisites()` | `spell`, `character` | `ValidationResult` | Validate spell prerequisites |
| `validateSpell()` | `spell` | `ValidationResult` | Validate spell schema |
| `hasSpell()` | `spellId` | `boolean` | Check if spell exists |
| `getSpellCount()` | - | `number` | Get total spell count |
| `getRegistryStats()` | - | `{ totalSpells, defaultSpells, customSpells, spellsByLevel, spellsBySchool, classesWithSpells }` | Get registry statistics |
| `exportRegistry()` | - | `RegisteredSpell[]` | Export all registered spells as JSON |
| `unregisterSpell()` | `spellId` | `boolean` | Remove spell by ID (primarily for testing) |

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

**FeatureRegistry Methods:**
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
