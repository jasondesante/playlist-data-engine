# Playlist Data Engine Reference

This document serves as the comprehensive reference for the Playlist Data Engine. It details every feature, class, and function available in the `src` directory, providing a "cookbook" for developers to utilize the full power of the engine.

## Table of Contents

1. [Data Types](#data-types)
    - [ServerlessPlaylist](#serverlessplaylist)
    - [PlaylistTrack](#playlisttrack)
2. [Core Modules](#core-modules)
    - [PlaylistParser](#playlistparser)
    - [AudioAnalyzer](#audioanalyzer)
    - [CharacterGenerator](#charactergenerator)
3. [Progression System](#progression-system)
    - [SessionTracker](#sessiontracker)
    - [XPCalculator](#xpcalculator)
    - [CharacterUpdater](#characterupdater)
4. [Environmental Sensors](#environmental-sensors)
    - [EnvironmentalSensors](#environmentalsensors)
5. [Gaming Integration](#gaming-integration)
    - [GamingPlatformSensors](#gamingplatformsensors)
6. [Combat System](#combat-system)
    - [CombatEngine](#combatengine)
7. [Cookbook & Examples](#cookbook--examples)

---

## Data Types

Understanding the data structures is critical for using the engine effectively.

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
    /** Dominant colors ranked by frequency (hex format) */
    colors: string[];

    /** Primary color (most dominant) */
    primary_color: string;

    /** Secondary color */
    secondary_color?: string;

    /** Accent color */
    accent_color?: string;

    /** Average brightness (0.0 - 1.0) */
    brightness: number;

    /** Average saturation (0.0 - 1.0) */
    saturation: number;

    /** Is the image monochrome? */
    is_monochrome: boolean;
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

}
```

### EnvironmentalContext

Aggregated environmental sensor data.

```typescript
export interface EnvironmentalContext {
    location?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    light?: LightData;

    // Derived gameplay data
    biome?: 'urban' | 'forest' | 'desert' | 'mountain' | 'water' | 'tundra';
    time_of_day?: 'dawn' | 'day' | 'dusk' | 'night';
    season?: 'spring' | 'summer' | 'autumn' | 'winter';

    // Composite XP multiplier (0.5 to 3.0)
    environmental_xp_modifier: number;
}

export interface GeolocationData {
    latitude: number;
    longitude: number;
    altitude?: number;            // Meters above sea level
    accuracy: number;             // Meters
    altitude_accuracy?: number;
    heading?: number;             // Direction 0-360 degrees
    speed?: number;               // Meters per second
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
```

### GamingContext

Steam and Discord gaming activity data.

```typescript
export interface GamingContext {
    isActivelyGaming: boolean;
    platformSource: 'steam' | 'discord' | 'both' | 'none';

    currentGame?: {
        name: string;
        source: 'steam' | 'discord';
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

**Usage:**
```typescript
import { PlaylistParser } from './src/core/parser/PlaylistParser';

const parser = new PlaylistParser({ validateAudioUrls: true });
const playlist = await parser.parse(rawJsonData);
console.log(`Parsed ${playlist.tracks.length} tracks.`);
```

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

**Usage:**
```typescript
import { AudioAnalyzer } from './src/core/analysis/AudioAnalyzer';

const analyzer = new AudioAnalyzer({ includeAdvancedMetrics: true });
const profile = await analyzer.extractSonicFingerprint('https://example.com/audio.mp3');
```

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
- `static initializeSpells(characterClass: Class, characterLevel: number): SpellSlots`
    - Returns known spells, cantrips, and spell slots for the level.
- `static useSpellSlot(spellSlots: SpellSlots, level: number): SpellSlots`
- `static restoreSpellSlots(spellSlots: SpellSlots): SpellSlots`

#### Helper: `EquipmentGenerator`

**Location:** `src/core/generation/EquipmentGenerator.ts`

Manages inventory and starting gear.

- `static initializeEquipment(characterClass: Class): CharacterEquipment`
    - Grants starting weapons, armor, and items.
- `static addItem(equipment: CharacterEquipment, item: string, quantity: number): CharacterEquipment`
- `static equipItem(equipment: CharacterEquipment, item: string): CharacterEquipment`

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

- `startSession(trackUuid: string, track?: PlaylistTrack, context?: { ... }): string`
    - Starts a session. Returns a `sessionId`.
- `endSession(sessionId: string, durationOverride?: number, activityType?: string): ListeningSession | null`
    - Ends the session, calculates XP, and returns the session record.

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
- `getActiveSession(sessionId: string): ActiveSession | null`
- `updateSessionContext(sessionId: string, context: { ... }): boolean`
    - Updates environmental or gaming context for a live session.
- `getSessionHistory(): ListeningSession[]`
- `getSessionsForTrack(trackUuid: string): ListeningSession[]`
- `isTrackMastered(trackUuid: string, threshold?: number): boolean`

**Usage:**
```typescript
const tracker = new SessionTracker();
const sessionId = tracker.startSession('track-1');
// ... time passes ...
const session = tracker.endSession(sessionId);
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
    - Calculates total XP for a session.
- `getXPThresholdForLevel(level: number): number`
- `getLevelFromXP(totalXP: number): number`

---

### CharacterUpdater

**Location:** `src/core/progression/CharacterUpdater.ts`

Orchestrates applying session results to a character, handling leveling up and mastery.

#### Class: `CharacterUpdater`

**Methods:**

- `updateCharacterFromSession(character: CharacterSheet, session: ListeningSession, track?: PlaylistTrack, previousListenCount?: number): CharacterUpdateResult`
### CharacterUpdateResult

Result of a character update operation.

```typescript
export interface CharacterUpdateResult {
    character: CharacterSheet;
    xpEarned: number;
    leveledUp: boolean;
    newLevel?: number;
    masteredTrack: boolean;
    masteryBonusXP: number;
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

**Usage:**
```typescript
const updater = new CharacterUpdater();
const result = updater.updateCharacterFromSession(character, session, track);
if (result.leveledUp) {
    console.log(`Level Up! Welcome to level ${result.newLevel}`);
}
```

---

## Environmental Sensors

**Location:** `src/core/sensors/EnvironmentalSensors.ts`

Integrates real-world data (GPS, Weather, Motion, Light) to influence XP generation.

#### Class: `EnvironmentalSensors`

**Constructor:**
```typescript
new EnvironmentalSensors(weatherApiKey?: string)
```

**Methods:**

- `async requestPermissions(types: SensorType[]): Promise<SensorPermission[]>`
    - Requests browser permissions for 'geolocation', 'motion', 'light', etc.
- `startMonitoring(callback?: (context: EnvironmentalContext) => void): void`
    - Starts listening to sensor streams.
- `stopMonitoring(): void`
- `async updateSnapshot(): Promise<EnvironmentalContext>`
    - Manually fetches current pull-based data (Geo, Weather).
- `calculateXPModifier(): number`
    - Returns a multiplier (1.0x - 3.0x) based on current context.

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

**Usage:**
```typescript
const sensors = new EnvironmentalSensors('API_KEY');
await sensors.requestPermissions(['geolocation', 'weather']);
const context = await sensors.updateSnapshot();
const modifier = sensors.calculateXPModifier();
```

---

## Gaming Integration

**Location:** `src/core/sensors/GamingPlatformSensors.ts`

Monitors Steam and Discord activity to award gaming bonuses.

#### Class: `GamingPlatformSensors`

**Constructor:**
```typescript
new GamingPlatformSensors(config: { steam?: { ... }, discord?: { ... } })
```

**Methods:**

- `async authenticate(steamUserId?: string, discordUserId?: string): Promise<boolean>`
- `startMonitoring(callback?: (context: GamingContext) => void): void`
- `stopMonitoring(): void`
- `calculateGamingBonus(): number`
#### Helper: `SteamAPIClient`

**Location:** `src/core/sensors/SteamAPIClient.ts`

Integrates with Steam Web API.

- `getCurrentGame(steamUserId: string): Promise<{ name: string, appId: number } | null>`
    - Fetches currently played game.
- `getGameMetadata(gameName: string): Promise<{ genre?: string[] } | null>`
    - Fetches genre tags for gaming bonuses.

#### Helper: `DiscordRPCClient`

**Location:** `src/core/sensors/DiscordRPCClient.ts`

Integrates with Discord Rich Presence.

- `getCurrentGame(): Promise<{ name: string } | null>`
    - Detects game from user status.
- `setGameActivity(details: object): Promise<boolean>`
    - Updates Discord status to show what the user is listening to.

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
- `executeAttack(combat: CombatInstance, attacker: Combatant, target: Combatant, attack: Attack): CombatAction`
    - Resolves an attack roll against AC and applies damage.
- `executeCastSpell(combat: CombatInstance, caster: Combatant, spell: Spell, targets: Combatant[]): CombatAction`
- `nextTurn(combat: CombatInstance): CombatInstance`
    - Advances the turn order.
- `getCombatResult(combat: CombatInstance): CombatResult | null`
    - Returns winner and rewards if combat is over.

**Usage:**
```typescript
const combatEngine = new CombatEngine();
let battle = combatEngine.startCombat([hero], [monster]);

while (battle.isActive) {
    const actor = combatEngine.getCurrentCombatant(battle);
    // AI or Player logic to choose action...
    combatEngine.executeAttack(battle, actor, target, attack);
    battle = combatEngine.nextTurn(battle);
}
```

---

## Cookbook & Examples

### 1. The "Hello World" - Play Audio & Generate Character

**Goal:** Get the audio URL from a playlist and generate a character from it.

```typescript
import { PlaylistParser } from './src/core/parser/PlaylistParser';
import { AudioAnalyzer } from './src/core/analysis/AudioAnalyzer';
import { CharacterGenerator } from './src/core/generation/CharacterGenerator';

async function main() {
    // 1. Parse Playlist
    const parser = new PlaylistParser();
    const playlist = await parser.parse(myJsonData);
    
    // 2. Get the first track
    const track = playlist.tracks[0];

    // --- HOW TO PLAY THE AUDIO ---
    console.log(`Now Playing: ${track.title} by ${track.artist}`);
    console.log(`Stream URL: ${track.audio_url}`); // <--- Pass this to your audio player (Howler, HTML5 Audio, etc.)
    
    // Example: HTML5 Audio
    // const audio = new Audio(track.audio_url);
    // audio.play();

    // 3. Analyze Audio (for character generation)
    const analyzer = new AudioAnalyzer();
    const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);

    // 4. Generate Character
    const character = CharacterGenerator.generate(
        track.id,
        audioProfile,
        track.title
    );

    console.log(`Generated: ${character.race} ${character.class} (Level ${character.level})`);
}
```

### 2. The "Workout Mode" - Earn XP while Running

```typescript
import { SessionTracker } from './src/core/progression/SessionTracker';
import { EnvironmentalSensors } from './src/core/sensors/EnvironmentalSensors';
import { CharacterUpdater } from './src/core/progression/CharacterUpdater';

async function workoutSession(character, track) {
    // Setup Sensors
    const sensors = new EnvironmentalSensors();
    await sensors.requestPermissions(['motion', 'geolocation']);
    sensors.startMonitoring();

    // Start Session
    const tracker = new SessionTracker();
    const sessionId = tracker.startSession(track.id);

    console.log("Start running!");
    // ... User runs for 30 mins ...

    // End Session
    const envContext = await sensors.updateSnapshot();
    tracker.updateSessionContext(sessionId, { environmental_context: envContext });
    
    // Auto-detect 'running' activity from motion sensor
    const session = tracker.endSession(sessionId); 

    // Update Character
    const updater = new CharacterUpdater();
    const result = updater.updateCharacterFromSession(character, session, track);

    console.log(`Workout complete! Earned ${result.xpEarned} XP.`);
    sensors.stopMonitoring();
}
```

### 3. The "Boss Fight" - Combat Encounter

```typescript
import { CombatEngine } from './src/core/combat/CombatEngine';

function runEncounter(party, enemies) {
    const engine = new CombatEngine();
    let combat = engine.startCombat(party, enemies);

    console.log("Combat Started!");

    while (combat.isActive) {
        const current = engine.getCurrentCombatant(combat);
        
        // Simple AI: Attack first enemy
        const targets = current.id.startsWith('player') 
            ? combat.combatants.filter(c => c.id.startsWith('enemy') && !c.isDefeated)
            : combat.combatants.filter(c => c.id.startsWith('player') && !c.isDefeated);

        if (targets.length > 0) {
            const target = targets[0];
            // Use first available attack
            const attack = current.character.equipment?.weapons[0] 
                ? { name: 'Weapon Attack', damage_dice: '1d8', damage_type: 'slashing' } // Simplified
                : { name: 'Unarmed Strike', damage_dice: '1d4', damage_type: 'bludgeoning' };

            const action = engine.executeAttack(combat, current, target, attack);
            console.log(`${current.character.name} attacks ${target.character.name}: ${action.result.description}`);
        }

        combat = engine.nextTurn(combat);
    }

    const result = engine.getCombatResult(combat);
    console.log(result.description);
}
```
