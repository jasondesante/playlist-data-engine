# Engine Design Document: The "Audio Alchemist Core"

## 1. Architectural Overview
The "Core" is designed as a standalone **npm package** or module (`@audio-alchemist/core`). It handles data ingestion, parsing, audio signal processing, procedural generation logic, and environmental sensor integration. It knows nothing about the game's UI, React state, or visuals—it only returns **Data**.

*   **Input:** Playlist JSON / Arweave TXID + Optional Environmental Data.
*   **Output:** `ServerlessPlaylist` object containing `PlaylistTrack` objects, `CharacterSheet` objects, and `EnvironmentalContext` objects.

---

## 2. Data Model

The Engine reads the raw JSON input, parses the stringified metadata, and "flattens" it into a single, robust object called `PlaylistTrack`.

### A. The Playlist Container
This is the structure of the JSON file fetched directly from Arweave.

```typescript
interface ServerlessPlaylist {
  // --- Playlist Metadata ---
  name: string;           // Name of the playlist
  description?: string;   // Optional description
  image: string;          // URL to playlist cover art
  creator: string;        // Wallet address of the curator
  genre?: string;         // General genre of the playlist
  tags?: string[];        // Search tags
  
  // --- The Content ---
  tracks: PlaylistTrack[]; // Array of flattened track objects
}
```

### B. The PlaylistTrack Object
This is the single source of truth for a track in the engine. It is the result of taking the "Outer Shell" (Blockchain Data) and merging it with the "Inner Core" (Parsed Metadata).

```typescript
interface PlaylistTrack {
  // --- Identity & Blockchain Data (The Outer Shell) ---
  id: string;             // e.g. "ethereum/0xContract/1"
  uuid: string;           // Unique instance ID for the game engine
  playlist_index: number; // Order in the playlist
  
  chain_name: string;     // e.g. "ethereum", "optimism"
  token_address: string;  // Contract Address (or 0x0 for files)
  token_id: string;       // Token ID (or 0 for files)
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

### C. The Extraction Logic (CRITICAL)
When constructing the `PlaylistTrack` object from the raw input, the Engine **MUST** follow strictly defined priority queues. It stops at the first valid, non-empty string found.

#### 1. Audio Extraction Logic
The engine looks for the playable audio file in this exact order. We prioritize compressed formats for faster loading and better web performance.
1.  `mp3_url` (Standard web audio - preferred)
2.  `lossy_audio` (Compressed)
3.  `audio_url` (Explicit audio field)
4.  `lossless_audio` (High fidelity - larger files)
5.  `animation_url` (OpenSea standard - often audio, but could be video)

#### 2. Image Extraction Logic
We prioritize smaller images for performance in the game engine, falling back to the main image.
1.  `image_small` (Preferred for performance)
2.  `image` (Standard)
3.  `image_large` (Fallback)
4.  `image_thumb` (Last resort)

#### 3. Name/Title Extraction Logic
1.  `name`
2.  `title`

#### 4. Artist Extraction Logic
1.  `artist`
2.  `created_by`
3.  `minter`

### D. The Parsing & Flattening Pipeline
This section details how the raw JSON from Arweave is transformed into the clean interfaces above.

#### 1. The Raw Input Schema (The "Before" State)
This is what the engine receives from Arweave. It is "dirty" because the metadata is a string, not an object.
```typescript
interface RawArweavePlaylist {
  name: string;
  image: string;
  creator: string;
  tracks: Array<{
    // Outer Blockchain Data
    chain_name: string;
    token_address: string;
    token_id: string;
    platform: string;
    id?: string;
    uuid?: string;
    
    // The Stringified Payload
    metadata: string; // "{ \"name\": \"Song\", \"audio_url\": ... }"
  }>
}
```

#### 2. The Flattening Process (The Transformation)
The `PlaylistParser` iterates through the `tracks` array and performs the following operations for **each** item:

1.  **Parse Metadata:** Execute `JSON.parse(track.metadata)`. If this fails, skip the track or flag as error.
2.  **Initialize PlaylistTrack:** Create a new object.
3.  **Map Outer Shell:** Copy `chain_name`, `token_address`, `token_id`, `platform`, `playlist_index` directly from the raw object to the new object.
4.  **Run Extraction Logic:**
    *   Pass the *Parsed Metadata* object into the Logic defined in **Section 2.C**.
    *   Populate `title`, `artist`, `image_url`, and `audio_url` based on the hierarchy.
5.  **Merge Attributes:** If the parsed metadata has an `attributes` array (OpenSea style), convert it to a key-value pair object and store in `PlaylistTrack.attributes`.
6.  **Validate:** If `audio_url` is empty after extraction, the track is marked as "Unsummonable" and excluded from the game loop.

---

## 3. The Seeding Strategy
We use a **Deterministic Seed** derived from the blockchain data in the `PlaylistTrack`.

*   **Seed String:** The engine first checks if `track.id` exists (this field is already formatted as `${chain_name}-${token_address}-${token_id}`). If `track.id` is not present, the engine constructs the seed string manually: `${track.chain_name}-${track.token_address}-${track.token_id}`
*   **Usage:** This string is hashed (e.g., murmurHash) into a float (0.0 - 1.0) to drive deterministic aspects of character generation including Race, Starting Class, Appearance, and certain Base Modifiers. This ensures the "Soul" of the NFT remains constant, regardless of metadata updates.

---

## 4. Audio Analysis: The "Micro-Snapshot" Engine

We do not analyze the entire file. We do not determine BPM via heavy computation. We use a lightweight **Spectrum Scanner**.

### A. The "Triple Tap" Strategy
To get a fingerprint of the song without downloading 50MB of WAV data immediately, the engine performs three rapid snapshots.

1.  **Snapshot A (The Intro):** 500ms sample taken at `Duration * 0.05` (5% mark).
2.  **Snapshot B (The Meat):** 500ms sample taken at `Duration * 0.40` (40% mark).
3.  **Snapshot C (The Peak):** 500ms sample taken at `Duration * 0.70` (70% mark).

*Note: If the file format/hosting does not support byte-range seeking (streaming), the engine falls back to analyzing the first 3 contiguous seconds.*

### B. The Frequency Bands
For each 500ms snapshot, we run an FFT (Fast Fourier Transform) via `AnalyserNode`. We separate the spectrum into 3 buckets:

1.  **Low (Bass):** 20Hz - 250Hz
    *   *Represents:* Strength, Constitution, Physical Power.
2.  **Mid (Vocals/Melody):** 250Hz - 4kHz
    *   *Represents:* Intelligence, Wisdom, Charisma.
3.  **High (Percussion/Air):** 4kHz - 20kHz
    *   *Represents:* Dexterity, Speed, Precision.

### C. Output: The Audio Profile
The analyzer averages the 3 snapshots and outputs:
```typescript
interface AudioProfile {
  bass_dominance: number;   // 0.0 to 1.0
  mid_dominance: number;    // 0.0 to 1.0
  treble_dominance: number; // 0.0 to 1.0
  average_amplitude: number;// 0.0 to 1.0 (Volume/Energy)
  duration: number;         // Confirmed duration
  
  // Advanced metrics (optional)
  spectral_centroid?: number;  // Brightness of sound
  spectral_rolloff?: number;   // Where high frequencies drop off
  zero_crossing_rate?: number; // Percussiveness indicator
  
  // Visual data (optional)
  colorPalette?: ColorPalette;  // Only present if image was analyzed
}
```

### D. Visual Analysis: Color Palette Extraction

In addition to audio analysis, the engine extracts the dominant color palette from the track's album artwork. This provides visual theming data that can be used for character tinting, UI customization, and environmental effects.

#### The Extraction Process

The engine uses HTML5 Canvas to analyze the `image_url` field from the `PlaylistTrack` object:

1.  **Load Image:** Create an off-screen canvas and draw the image at a reduced resolution (e.g., 100x100px) for performance.
2.  **Sample Pixels:** Extract pixel data using `getImageData()`.
3.  **Color Quantization:** Use a clustering algorithm (e.g., k-means or median cut) to identify the 4 most dominant colors.
4.  **Sort by Frequency:** Rank colors by pixel count, with the most common color first.

#### Output: The Color Palette
```typescript
interface ColorPalette {
  primary: string;      // Most common color (hex format: "#A1B2C3")
  secondary: string;    // 2nd most common color
  tertiary: string;     // 3rd most common color
  accent: string;       // 4th most common color
  
  // Optional metadata
  brightness: number;   // 0.0 to 1.0 (average luminance)
  saturation: number;   // 0.0 to 1.0 (average saturation)
  is_monochrome: boolean; // True if all colors are grayscale
}
```

#### Integration with AudioProfile

The `extractSonicFingerprint` function is expanded to optionally include visual analysis:
```typescript
async function extractSonicFingerprint(
  audioUrl: string,
  imageUrl?: string,  // NEW: Optional image URL
  options?: {
    includeAdvancedMetrics?: boolean;
    includeColorPalette?: boolean;  // NEW: Default true if imageUrl provided
  }
): Promise<AudioProfile>
```

#### Gameplay Applications

- **Character Tinting:** Use `primary` color to tint armor/clothing sprites.
- **Spell Effects:** Use `secondary` and `tertiary` for particle effects and auras.
- **UI Theming:** Dynamically theme the character sheet using the palette.
- **Rarity Indicators:** High saturation + brightness = "Legendary" visual tier.
- **Environmental Matching:** Bonus XP if character's palette matches the current biome (e.g., green palette in forests).

---

## 5. Environmental Sensor System

The engine provides **optional** sensor integration hooks that allow games to incorporate real-world context into gameplay mechanics. All sensor data is opt-in and respects user privacy.

### A. Available Sensors & APIs

#### 1. Geolocation API
Accessible via the browser's native `navigator.geolocation` API.

```typescript
interface GeolocationData {
  latitude: number;
  longitude: number;
  altitude?: number;        // In meters above sea level (if available)
  accuracy: number;         // In meters
  altitude_accuracy?: number;
  heading?: number;         // Direction of travel (0-360 degrees)
  speed?: number;           // Meters per second
  timestamp: number;        // Unix timestamp
}
```

**Gameplay Applications:**
- **Altitude-based bonuses:** Characters gain constitution bonuses when listening at high altitudes (mountain training).
- **Biome detection:** Assign terrain types based on coordinates (desert, forest, ocean, urban).
- **Travel XP:** Award bonus experience for listening while covering distance.

#### 2. Motion Sensors (Accelerometer & Gyroscope)
Accessible via the browser's `DeviceMotionEvent` and `DeviceOrientationEvent` APIs.

```typescript
interface MotionData {
  // Accelerometer (measures acceleration)
  acceleration: {
    x: number;  // m/s²
    y: number;
    z: number;
  };
  
  // Accelerometer including gravity
  acceleration_with_gravity: {
    x: number;
    y: number;
    z: number;
  };
  
  // Gyroscope (measures rotation rate)
  rotation_rate: {
    alpha: number;  // degrees/second
    beta: number;
    gamma: number;
  };
  
  // Motion magnitude (derived)
  movement_intensity: number;  // 0.0 to 1.0 (calculated from acceleration)
  activity_type: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown';
  
  timestamp: number;
}
```

**Activity Detection Logic:**
- **Stationary:** `movement_intensity < 0.1`
- **Walking:** `movement_intensity 0.1 - 0.4` + regular oscillation pattern
- **Running:** `movement_intensity 0.4 - 0.7` + rapid oscillation
- **Driving:** `movement_intensity > 0.7` + smooth patterns + high GPS speed

**Gameplay Applications:**
- **Running Mode:** 1.5x XP multiplier when `activity_type === 'running'`
- **Driving Mode:** Unlock "Highway Warrior" class bonuses
- **Combat Training:** Require certain exercises (jumping jacks, squats detected via accelerometer) to unlock combat skills

#### 3. Weather API Integration
The engine can fetch weather data by combining GPS coordinates with a weather API (e.g., OpenWeatherMap, WeatherAPI).

```typescript
interface WeatherData {
  temperature: number;         // Celsius
  feels_like: number;          // Apparent temperature
  humidity: number;            // Percentage
  pressure: number;            // hPa
  weather_type: 'clear' | 'clouds' | 'rain' | 'snow' | 'thunderstorm' | 'mist' | 'fog';
  wind_speed: number;          // m/s
  wind_direction: number;      // degrees
  visibility: number;          // meters
  timestamp: number;
  
  // Derived gameplay data
  is_night: boolean;           // Based on sunrise/sunset times
  moon_phase?: number;         // 0.0 to 1.0 (new to full)
}
```

**Gameplay Applications:**
- **Elemental Affinity:** Rain boosts Water/Ice spell damage, Thunderstorms boost Lightning
- **Temperature Extremes:** Hot weather increases Fire resistance, Cold weather increases Constitution
- **Night Owl Bonus:** 1.25x XP for listening between sunset and sunrise
- **Full Moon:** Unlock werewolf transformations or magic bonuses

#### 4. Ambient Light Sensor
Accessible via `AmbientLightSensor` API (experimental, limited browser support).

```typescript
interface LightData {
  illuminance: number;  // lux (light intensity)
  timestamp: number;
  
  // Derived
  environment: 'bright_daylight' | 'indoor' | 'dim' | 'dark';
}
```

**Gameplay Applications:**
- **Stealth Bonus:** Higher Dexterity checks in dark environments
- **Vision Penalties:** Reduced perception in dim light unless character has Darkvision

### B. The Environmental Context Object

All sensor data is aggregated into a single context object that can be passed to gameplay functions.

```typescript
interface EnvironmentalContext {
  location?: GeolocationData;
  motion?: MotionData;
  weather?: WeatherData;
  light?: LightData;
  
  // Derived gameplay modifiers
  biome?: 'urban' | 'forest' | 'desert' | 'mountain' | 'water' | 'tundra';
  time_of_day?: 'dawn' | 'day' | 'dusk' | 'night';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  
  // Composite XP multiplier based on all factors
  environmental_xp_modifier: number;  // 0.5 to 3.0
}
```

### C. Privacy & Permissions

All sensor access requires explicit user permission. The engine provides:
- Clear permission request dialogs
- Opt-out functionality for each sensor
- No data storage without consent
- Transparent explanation of how data is used

---

## 6. The D&D Character System

This section replaces the simple "summonWarrior" concept with a full D&D 5th Edition-inspired character generation system. The engine provides **granular control** over how much complexity to use.

### A. Core Character Sheet Structure

```typescript
interface CharacterSheet {
  // --- Core Identity ---
  name: string;
  title?: string;              // "Thumping Midnight City the Bard"
  level: number;               // 1-20
  experience_points: number;
  
  // --- D&D Core Stats ---
  race: Race;
  character_class: CharacterClass;
  background?: Background;
  alignment?: Alignment;
  
  // --- Ability Scores (3-20 range) ---
  ability_scores: AbilityScores;
  ability_modifiers: AbilityModifiers;  // Derived from scores
  
  // --- Combat Stats ---
  hit_points: {
    current: number;
    maximum: number;
    temporary: number;
  };
  armor_class: number;
  initiative_bonus: number;
  speed: number;               // In feet
  
  // --- Proficiencies ---
  proficiency_bonus: number;   // Based on level
  saving_throws: SavingThrows;
  skills: SkillProficiencies;
  
  // --- Combat Abilities ---
  attacks: Attack[];
  spells_known?: Spell[];
  spell_slots?: SpellSlots;
  
  // --- Features & Abilities ---
  class_features: ClassFeature[];
  racial_traits: RacialTrait[];
  feats: Feat[];
  
  // --- Equipment ---
  inventory: InventoryItem[];
  equipped_items: EquippedItems;
  currency: {
    gold: number;
    silver: number;
    copper: number;
  };
  
  // --- Personality (Optional Depth) ---
  personality_traits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  
  // --- Visuals (For rendering) ---
  appearance: CharacterAppearance;
  
  // --- Progression Tracking ---
  listening_sessions: ListeningSession[];
  total_listening_time: number;  // In seconds
  tracks_mastered: string[];     // Track UUIDs
}
```

### B. Ability Scores System

Following D&D rules, we map audio analysis to the six core abilities:

```typescript
interface AbilityScores {
  strength: number;      // 3-20 (8 is average, 10 is baseline, 18 is heroic)
  dexterity: number;     // 3-20
  constitution: number;  // 3-20
  intelligence: number;  // 3-20
  wisdom: number;        // 3-20
  charisma: number;      // 3-20
}

interface AbilityModifiers {
  strength: number;      // -4 to +5 (calculated: (score - 10) / 2, rounded down)
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}
```

**Generation Algorithm:**
1. **Base Roll:** Start all abilities at 8 (below average).
2. **Frequency Mapping:**
   - **Strength:** `8 + (bass_dominance * 10)` = 8-18 range
   - **Constitution:** `8 + (average_amplitude * 10)` = 8-18 range (stamina from volume)
   - **Dexterity:** `8 + (treble_dominance * 10)` = 8-18 range
   - **Intelligence:** `8 + (mid_dominance * 6) + (spectral_centroid * 4)` = 8-18 range
   - **Wisdom:** `8 + ((mid_dominance + bass_dominance) / 2 * 8)` = 8-16 range (balance)
   - **Charisma:** `8 + (mid_dominance * 8) + (genre_modifier)` = 8-18 range
3. **Racial Bonuses:** Add race-specific bonuses (e.g., Dragonborn +2 STR, +1 CHA).
4. **Cap at 20:** Maximum ability score is 20 (D&D 5e standard).

### C. Race System

Races are determined **deterministically** from the blockchain seed. Each race provides ability score bonuses and unique traits.

```typescript
type Race = 
  | 'Human'        // +1 to all abilities
  | 'Elf'          // +2 DEX, Darkvision, Fey Ancestry
  | 'Dwarf'        // +2 CON, Darkvision, Dwarven Resilience
  | 'Halfling'     // +2 DEX, Lucky, Brave
  | 'Dragonborn'   // +2 STR, +1 CHA, Breath Weapon
  | 'Gnome'        // +2 INT, Darkvision, Gnome Cunning
  | 'Half-Elf'     // +2 CHA, +1 to two others, Darkvision
  | 'Half-Orc'     // +2 STR, +1 CON, Relentless Endurance
  | 'Tiefling';    // +2 CHA, +1 INT, Darkvision, Infernal Legacy

interface RacialTrait {
  name: string;
  description: string;
  game_effect?: string;  // "Advantage on saving throws against poison"
}
```

**Race Selection Logic:**
```typescript
// Hash the seed string to get a deterministic number 0-8
const raceIndex = hashSeed(seedString) % 9;
const raceMap = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];
const selectedRace = raceMap[raceIndex];
```

### D. Class System

Classes are influenced by the **audio profile**. The highest frequency dominance determines the primary class suggestion, but developers can allow players to choose.

```typescript
type CharacterClass = 
  | 'Barbarian'    // High STR/CON (bass + amplitude)
  | 'Bard'         // High CHA (mid + genre)
  | 'Cleric'       // High WIS (balanced frequencies)
  | 'Druid'        // High WIS (balanced frequencies, nature genres)
  | 'Fighter'      // High STR/DEX (bass or treble)
  | 'Monk'         // High DEX/WIS (treble + balance)
  | 'Paladin'      // High STR/CHA (bass + mid)
  | 'Ranger'       // High DEX/WIS (treble + balance)
  | 'Rogue'        // High DEX (treble dominance)
  | 'Sorcerer'     // High CHA (mid + amplitude)
  | 'Warlock'      // High CHA (mid, dark/electronic genres)
  | 'Wizard';      // High INT (mid + complex patterns)

interface CharacterClass {
  name: string;
  hit_die: 'd6' | 'd8' | 'd10' | 'd12';  // For HP calculation
  primary_ability: keyof AbilityScores;
  saving_throw_proficiencies: (keyof AbilityScores)[];
  skill_proficiencies_count: number;     // How many skills to choose
  starting_equipment: string[];
  multiclass_requirements?: Partial<AbilityScores>;
}
```

**Class Suggestion Algorithm:**
```typescript
function suggestClass(audioProfile: AudioProfile, abilityScores: AbilityScores): CharacterClass {
  // Highest frequency band suggests combat style
  if (audioProfile.bass_dominance > 0.6 && abilityScores.strength >= 14) {
    return audioProfile.average_amplitude > 0.7 ? 'Barbarian' : 'Fighter';
  }
  if (audioProfile.treble_dominance > 0.6 && abilityScores.dexterity >= 14) {
    return abilityScores.wisdom >= 13 ? 'Monk' : 'Rogue';
  }
  if (audioProfile.mid_dominance > 0.6) {
    if (abilityScores.charisma >= 14) {
      return genre.includes('electronic') ? 'Warlock' : 'Bard';
    }
    if (abilityScores.intelligence >= 14) return 'Wizard';
    if (abilityScores.wisdom >= 14) return 'Cleric';
  }
  
  // Balanced frequencies
  if (Math.abs(audioProfile.bass_dominance - audioProfile.mid_dominance) < 0.2) {
    return abilityScores.wisdom >= 13 ? 'Druid' : 'Paladin';
  }
  
  return 'Fighter'; // Default
}
```

### E. Skills System

D&D 5e has 18 skills, each tied to an ability score. Characters gain proficiency in some skills based on class and background.

```typescript
interface SkillProficiencies {
  // STR-based
  athletics: ProficiencyLevel;
  
  // DEX-based
  acrobatics: ProficiencyLevel;
  sleight_of_hand: ProficiencyLevel;
  stealth: ProficiencyLevel;
  
  // INT-based
  arcana: ProficiencyLevel;
  history: ProficiencyLevel;
  investigation: ProficiencyLevel;
  nature: ProficiencyLevel;
  religion: ProficiencyLevel;
  
  // WIS-based
  animal_handling: ProficiencyLevel;
  insight: ProficiencyLevel;
  medicine: ProficiencyLevel;
  perception: ProficiencyLevel;
  survival: ProficiencyLevel;
  
  // CHA-based
  deception: ProficiencyLevel;
  intimidation: ProficiencyLevel;
  performance: ProficiencyLevel;
  persuasion: ProficiencyLevel;
}

type ProficiencyLevel = 
  | 'none'        // No bonus
  | 'proficient'  // Add proficiency bonus
  | 'expertise';  // Double proficiency bonus (Rogues, Bards)
  
interface SavingThrows {
  strength: boolean;
  dexterity: boolean;
  constitution: boolean;
  intelligence: boolean;
  wisdom: boolean;
  charisma: boolean;
}
```

**Skill Check Calculation:**
```typescript
// Example: Stealth check for a Rogue
const stealthBonus = 
  abilityModifiers.dexterity +  // Base modifier
  (skills.stealth === 'proficient' ? proficiencyBonus : 0) +
  (skills.stealth === 'expertise' ? proficiencyBonus : 0);  // Doubled for expertise

// Roll: d20 + stealthBonus
```

### F. Combat System

```typescript
interface Attack {
  name: string;
  attack_bonus: number;      // Ability modifier + proficiency (if proficient)
  damage_dice: string;       // "1d8", "2d6", etc.
  damage_type: DamageType;
  range?: number;            // In feet (null for melee)
  properties: WeaponProperty[];
}

type DamageType = 
  | 'slashing' | 'piercing' | 'bludgeoning'  // Physical
  | 'fire' | 'cold' | 'lightning' | 'thunder' | 'poison' | 'acid'  // Elemental
  | 'necrotic' | 'radiant' | 'psychic' | 'force';  // Magical

type WeaponProperty = 
  | 'light' | 'finesse' | 'versatile' | 'two-handed' 
  | 'heavy' | 'reach' | 'thrown' | 'ammunition';

interface Spell {
  name: string;
  level: number;             // 0 (cantrip) to 9
  school: SpellSchool;
  casting_time: string;
  range: string;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    material_description?: string;
  };
  duration: string;
  description: string;
  damage_dice?: string;
  damage_type?: DamageType;
  saving_throw?: keyof AbilityScores;
  attack_roll?: boolean;
}

type SpellSchool = 
  | 'Abjuration' | 'Conjuration' | 'Divination' | 'Enchantment'
  | 'Evocation' | 'Illusion' | 'Necromancy' | 'Transmutation';
```

### G. Leveling & Experience System

Characters gain XP through **listening time** and **activity bonuses**.

```typescript
interface ExperienceSystem {
  // XP thresholds for each level (D&D 5e standard)
  level_thresholds: number[];  // [0, 300, 900, 2700, 6500, ...]
  
  // Base XP rates
  xp_per_second: number;       // Base rate (e.g., 1 XP per second of listening)
  xp_per_track_completion: number;  // Bonus for finishing a song
  
  // Activity multipliers
  activity_bonuses: {
    stationary: 1.0;
    walking: 1.2;
    running: 1.5;
    driving: 1.3;
    night_time: 1.25;
    extreme_weather: 1.4;
    high_altitude: 1.3;
  };
  
  // Mastery system
  track_mastery_threshold: number;  // Listens required to master a track
  mastery_bonus_xp: number;         // Bonus for mastering
}

interface ListeningSession {
  track_uuid: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  base_xp_earned: number;
  bonus_xp: number;
  environmental_context?: EnvironmentalContext;
  gaming_context?: GamingContext;          // NEW: Gaming activity data
  activity_type?: string;
  total_xp_earned: number;
}
```

**XP Calculation Example:**
```typescript
function calculateXP(session: ListeningSession): number {
  let xp = session.duration_seconds * XP_PER_SECOND;
  
  // Activity bonus
  if (session.activity_type === 'running') {
    xp *= 1.5;
  }
  
  // Environmental bonuses
  if (session.environmental_context?.time_of_day === 'night') {
    xp *= 1.25;
  }
  if (session.environmental_context?.weather?.weather_type === 'thunderstorm') {
    xp *= 1.4;
  }
  
  // Gaming bonuses (NEW)
  if (session.gaming_context?.isActivelyGaming) {
    const gamingMultiplier = calculateGamingBonus(session.gaming_context);
    xp *= gamingMultiplier;
  }
  
  // Track completion bonus
  if (session.duration_seconds >= track.duration * 0.95) {
    xp += XP_PER_TRACK_COMPLETION;
  }
  
  return Math.floor(xp);
}
```

### H. Character Appearance System

Visual customization based on deterministic seed and dynamic progression.

```typescript
interface CharacterAppearance {
  // Deterministic (from seed)
  body_type: 'slender' | 'athletic' | 'muscular' | 'stocky';
  skin_tone: string;         // Hex color
  hair_style: number;        // Index into style catalog
  hair_color: string;        // Hex color
  eye_color: string;         // Hex color
  facial_features: number;   // Variant ID
  
  // Dynamic (from audio profile)
  primary_color: string;     // Armor/clothing color (from album art)
  secondary_color: string;   // Accent color
  aura_color?: string;       // For magical classes
  
  // Equipment visuals
  armor_appearance: {
    type: 'none' | 'light' | 'medium' | 'heavy';
    style_id: number;
  };
  weapon_appearance: {
    type: WeaponType;
    style_id: number;
  };
  accessory_slots: {
    head?: InventoryItem;
    neck?: InventoryItem;
    back?: InventoryItem;
    hands?: InventoryItem;
  };
}

type WeaponType = 
  | 'sword' | 'axe' | 'mace' | 'dagger' | 'spear' | 'bow' | 'crossbow'
  | 'staff' | 'wand' | 'greatsword' | 'polearm' | 'unarmed';
```

---

## 7. Gaming Platform Integration

The engine integrates with Steam and Discord APIs to track gaming activity and provide gameplay-aware bonuses. This allows developers to reward users who listen to music while actively playing games.

### A. Gaming Platform APIs

#### Steam Web API Integration

The engine uses the Steam Web API to detect active gameplay sessions:

```typescript
interface SteamConfig {
  apiKey: string;              // Steam Web API key
  steamId?: string;            // User's Steam ID (64-bit)
  pollInterval?: number;       // How often to check (default: 30000ms)
}

interface SteamGameActivity {
  isPlaying: boolean;          // Currently in a game
  gameId?: number;             // Steam App ID
  gameName?: string;           // Game title
  gameGenre?: string[];        // Game genres
  playtime?: number;           // Current session playtime (minutes)
  lastChecked: number;         // Timestamp of last API call
}
```

**API Endpoints Used:**
- `IPlayerService/GetRecentlyPlayedGames` - Detects currently playing games
- `ISteamUserStats/GetSchemaForGame` - Retrieves game metadata
- `ISteamApps/GetAppList` - Maps App IDs to game names

#### Discord Rich Presence Integration

The engine integrates with Discord's Game SDK or uses the Discord RPC (Rich Presence) API to detect gaming activity:

```typescript
interface DiscordConfig {
  clientId: string;            // Discord Application Client ID
  enableRichPresence?: boolean;// Update Discord status (default: true)
  pollInterval?: number;       // How often to check (default: 30000ms)
}

interface DiscordGameActivity {
  isPlaying: boolean;          // Currently in a game
  gameName?: string;           // Game title from Discord presence
  gameDetails?: string;        // Detailed status (e.g., "In Ranked Match")
  partySize?: number;          // Number of players in party
  elapsedTime?: number;        // Seconds since game started
  lastChecked: number;         // Timestamp of last check
}
```

**Integration Methods:**
- **Discord RPC:** Direct integration for desktop apps
- **Discord Gateway API:** For web-based detection (requires user token)
- **Webhook Detection:** Parse Discord webhooks for game status updates

### B. Unified Gaming Context

The engine merges Steam and Discord data into a single gaming context:

```typescript
interface GamingContext {
  isActivelyGaming: boolean;   // True if either platform shows activity
  platformSource: 'steam' | 'discord' | 'both' | 'none';
  
  // Current game information
  currentGame?: {
    name: string;              // Game title
    source: 'steam' | 'discord';
    genre?: string[];          // Game genres (Steam only)
    sessionDuration?: number;  // Minutes in current session
    partySize?: number;        // Multiplayer party size (Discord)
  };
  
  // Historical tracking
  totalGamingMinutes: number;  // Lifetime gaming while listening
  gamesPlayedWhileListening: string[]; // Unique game titles
  
  lastUpdated: number;         // Timestamp of last check
}
```

### C. Gaming Platform Sensor Class

```typescript
class GamingPlatformSensors {
  private steamConfig?: SteamConfig;
  private discordConfig?: DiscordConfig;
  private currentContext: GamingContext;
  private pollTimer?: NodeJS.Timer;
  
  constructor(config: {
    steam?: SteamConfig;
    discord?: DiscordConfig;
  }) {
    this.steamConfig = config.steam;
    this.discordConfig = config.discord;
    this.currentContext = this.getDefaultContext();
  }
  
  /**
   * Start monitoring gaming platforms.
   */
  async startMonitoring(
    callback?: (context: GamingContext) => void
  ): Promise<void>;
  
  /**
   * Stop monitoring and clean up.
   */
  stopMonitoring(): void;
  
  /**
   * Get current gaming context.
   */
  async getCurrentContext(): Promise<GamingContext>;
  
  /**
   * Check Steam for active games.
   */
  private async checkSteamActivity(): Promise<SteamGameActivity | null>;
  
  /**
   * Check Discord for active games.
   */
  private async checkDiscordActivity(): Promise<DiscordGameActivity | null>;
  
  /**
   * Calculate XP multiplier based on gaming activity.
   */
  calculateGamingBonus(context: GamingContext): number;
}
```

### D. XP Bonus Calculation for Gaming

Gaming activity provides significant XP bonuses to encourage simultaneous music listening and gameplay:

```typescript
function calculateGamingBonus(context: GamingContext): number {
  let multiplier = 1.0;
  
  if (!context.isActivelyGaming) {
    return multiplier;
  }
  
  // Base bonus for any active gaming
  multiplier += 0.25; // +25% XP
  
  // Genre-specific bonuses
  if (context.currentGame?.genre) {
    const genres = context.currentGame.genre;
    
    // High-intensity genres get larger bonuses
    if (genres.includes('Action') || genres.includes('FPS')) {
      multiplier += 0.15; // +15% for action games
    }
    if (genres.includes('RPG')) {
      multiplier += 0.20; // +20% for RPG games
    }
    if (genres.includes('Strategy')) {
      multiplier += 0.10; // +10% for strategy games
    }
  }
  
  // Multiplayer bonus
  if (context.currentGame?.partySize && context.currentGame.partySize > 1) {
    multiplier += 0.15; // +15% for playing with friends
  }
  
  // Long session bonus (diminishing returns)
  if (context.currentGame?.sessionDuration) {
    const hours = context.currentGame.sessionDuration / 60;
    if (hours >= 1) {
      multiplier += Math.min(0.20, hours * 0.05); // Up to +20% for 4+ hours
    }
  }
  
  return multiplier;
}
```

### E. Integration with Environmental System

Gaming context can be combined with environmental sensors for compound bonuses:

```typescript
interface EnhancedListeningSession extends ListeningSession {
  gaming_context?: GamingContext;
  gaming_bonus_multiplier?: number;
}

function calculateTotalXPModifier(
  envContext?: EnvironmentalContext,
  gamingContext?: GamingContext
): number {
  let modifier = 1.0;
  
  // Environmental bonuses
  if (envContext) {
    if (envContext.motion?.activity_type === 'running') {
      modifier += 0.50; // +50% for running
    }
    if (envContext.weather?.weather_type === 'thunderstorm') {
      modifier += 0.25; // +25% for storms
    }
    // ... other environmental bonuses
  }
  
  // Gaming bonuses
  if (gamingContext?.isActivelyGaming) {
    const gamingBonus = calculateGamingBonus(gamingContext) - 1.0;
    modifier += gamingBonus;
  }
  
  // Compound bonus cap (prevent excessive stacking)
  return Math.min(modifier, 3.0); // Max 300% XP (3x)
}
```

### F. Developer Use Cases

**Example 1: Simple Gaming Detection**
```typescript
// Reward bonus XP when user is gaming
const gamingSensors = new GamingPlatformSensors({
  steam: { apiKey: 'YOUR_STEAM_KEY', steamId: 'USER_STEAM_ID' }
});

const gamingContext = await gamingSensors.getCurrentContext();

if (gamingContext.isActivelyGaming) {
  session.gaming_bonus_multiplier = calculateGamingBonus(gamingContext);
  session.total_xp_earned *= session.gaming_bonus_multiplier;
}
```

**Example 2: Genre-Matched Music Rewards**
```typescript
// Give extra bonuses when music genre matches game genre
if (gamingContext.currentGame?.genre?.includes('RPG')) {
  if (track.genre === 'epic' || track.genre === 'orchestral') {
    session.genre_synergy_bonus = 1.5; // +50% for thematic match
  }
}
```

**Example 3: Achievement Unlocks**
```typescript
// Unlock special features when reaching milestones
if (gamingContext.totalGamingMinutes >= 100) {
  character.unlockAchievement('Gaming Maestro');
  character.bonuses.push({
    name: 'Gamer\'s Focus',
    description: 'Permanent +10% XP when gaming',
    modifier: 1.10
  });
}
```

---

## 8. The Naming Engine (Algorithm)

Names are generated using a hierarchy of metadata. We want names that sound like RPG titles but retain the song's identity.

### A. The Hierarchy
We look for data in this order. The first valid hit determines the "Core" of the name.

1.  **Title:** Extracted via Logic 3 (see Section 2.C).
2.  **Token Name:** If `token_id` exists and Title is missing, use `Token #{token_id}`.
3.  **Fallback:** "Unnamed Frequency"

### B. The Cleaning Process
*   Remove text in brackets: `(Official Video)`, `[Remix]`, `(feat. X)`.
*   Remove numbers if they look like track numbers: `01 - Song` -> `Song`.

### C. The Permutation Logic
Once we have the **Core**, **Artist**, **AudioProfile**, and **Class**, we construct the name:

**Format 1: The Class Title (40% Chance)**
*   *Structure:* `[Core] the [Class]`
*   *Example:* "Midnight City the Bard"

**Format 2: The Adjective Construct (30% Chance)**
*   *Structure:* `[Adjective] [Core]`
*   *Adjective Source:* Derived from `AudioProfile` + `Genre`.
    *   High Bass + Techno = "Thumping"
    *   High Treble + Rock = "Screaming"
    *   Low Amp + Ambient = "Whispering"
*   *Example:* "Thumping Midnight City"

**Format 3: The Clan Construct (20% Chance)**
*   *Structure:* `[Core] of [Artist]`
*   *Example:* "Midnight City of M83"

**Format 4: The Platform Construct (10% Chance)**
*   *Structure:* `[Platform Rank] [Core]`
*   *Platform Rank:*
    *   Sound.xyz -> "Sonic"
    *   Catalog -> "Archivist"
    *   Contract-Wizard -> "Alchemist"
*   *Example:* "Alchemist Midnight City"

---

## 9. API Reference (Exports)

The package exposes these primary functions for game developers.

### `PlaylistParser`

```typescript
/**
 * Takes an Arweave TXID, fetches JSON, parses metadata, and flattens
 * everything into the single PlaylistTrack object structure.
 */
async function fetchAndParsePlaylist(txId: string): Promise<ServerlessPlaylist>
```

### `AudioAnalyzer`

```typescript
/**
 * Creates an invisible Audio element.
 * Loads specific byte ranges (if possible) or buffers start of stream.
 * Returns the frequency profile.
 */
async function extractSonicFingerprint(
  audioUrl: string,
  options?: {
    includeAdvancedMetrics?: boolean;
  }
): Promise<AudioProfile>
```

### `EnvironmentalSensors`

```typescript
/**
 * Request access to device sensors and gather environmental context.
 * All sensors are opt-in and require user permission.
 */
interface SensorOptions {
  enableLocation?: boolean;
  enableMotion?: boolean;
  enableWeather?: boolean;
  enableLight?: boolean;
  weatherApiKey?: string;  // Required if enableWeather is true
}

class EnvironmentalSensors {
  constructor(options: SensorOptions);
  
  /**
   * Request permissions for enabled sensors.
   * Returns an object indicating which sensors were granted.
   */
  async requestPermissions(): Promise<{
    location: boolean;
    motion: boolean;
    weather: boolean;
    light: boolean;
  }>;
  
  /**
   * Get current environmental context.
   * Only includes data for sensors that have been granted permission.
   */
  async getCurrentContext(): Promise<EnvironmentalContext>;
  
  /**
   * Start continuous monitoring and invoke callback on significant changes.
   */
  startMonitoring(
    callback: (context: EnvironmentalContext) => void,
    interval?: number  // Check interval in milliseconds (default: 5000)
  ): void;
  
  /**
   * Stop continuous monitoring.
   */
  stopMonitoring(): void;
  
  /**
   * Calculate XP modifier based on current environmental context.
   */
  calculateXPModifier(context: EnvironmentalContext): number;
}
```

### `GamingPlatformSensors`

```typescript
/**
 * Monitor Steam and Discord for active gaming sessions.
 * Enables gaming-based XP bonuses and achievements.
 */
interface GamingPlatformConfig {
  steam?: {
    apiKey: string;
    steamId?: string;
    pollInterval?: number;
  };
  discord?: {
    clientId: string;
    enableRichPresence?: boolean;
    pollInterval?: number;
  };
}

class GamingPlatformSensors {
  constructor(config: GamingPlatformConfig);
  
  /**
   * Start monitoring gaming platforms.
   * Callback is invoked whenever gaming status changes.
   */
  async startMonitoring(
    callback?: (context: GamingContext) => void
  ): Promise<void>;
  
  /**
   * Stop monitoring and clean up resources.
   */
  stopMonitoring(): void;
  
  /**
   * Get current gaming context.
   */
  async getCurrentContext(): Promise<GamingContext>;
  
  /**
   * Calculate XP bonus multiplier based on gaming activity.
   * Returns 1.0 (no bonus) to 1.75 (max bonus).
   */
  calculateGamingBonus(context: GamingContext): number;
  
  /**
   * Check if a specific game is currently being played.
   */
  isPlayingGame(gameName: string): boolean;
}
```

### `CharacterFactory`

```typescript
/**
 * The main character generation system.
 * Supports both quick generation and detailed D&D-style creation.
 */
interface CharacterGenerationOptions {
  // Complexity level
  mode: 'simple' | 'standard' | 'advanced' | 'full_dnd';
  
  // Allow player choice vs. full procedural
  allowClassSelection?: boolean;
  allowRaceSelection?: boolean;
  allowAbilityScoreAdjustment?: boolean;
  
  // Environmental bonuses
  environmentalContext?: EnvironmentalContext;
  
  // Starting level
  startingLevel?: number;  // Default: 1
  
  // Custom skill selections (for advanced mode)
  skillSelections?: Partial<SkillProficiencies>;
}

/**
 * Generate a character from a track and audio analysis.
 */
function generateCharacter(
  track: PlaylistTrack,
  analysis: AudioProfile,
  options?: CharacterGenerationOptions
): CharacterSheet;

/**
 * Update an existing character based on a listening session.
 * Handles XP gains, level-ups, and stat improvements.
 */
function updateCharacterFromSession(
  character: CharacterSheet,
  session: ListeningSession
): CharacterSheet;

/**
 * Calculate level-up benefits when threshold is reached.
 */
function processLevelUp(
  character: CharacterSheet,
  newLevel: number
): {
  newFeatures: ClassFeature[];
  abilityScoreIncrease?: boolean;  // At levels 4, 8, 12, 16, 19
  newSpellSlots?: SpellSlots;
  hitPointIncrease: number;
};
```

### `CombatEngine` (Optional Advanced Feature)

```typescript
/**
 * For games that want turn-based combat integrated with music.
 */
interface CombatInstance {
  combatants: Combatant[];
  currentTurn: number;
  roundNumber: number;
  environment?: EnvironmentalContext;  // Affects certain abilities
}

interface Combatant {
  character: CharacterSheet;
  initiative: number;
  currentHP: number;
  statusEffects: StatusEffect[];
  position?: {x: number, y: number};  // For tactical combat
}

class CombatEngine {
  /**
   * Initialize a combat encounter.
   */
  startCombat(
    playerCharacters: CharacterSheet[],
    enemies: CharacterSheet[],
    environment?: EnvironmentalContext
  ): CombatInstance;
  
  /**
   * Roll initiative for all combatants.
   */
  rollInitiative(combat: CombatInstance): CombatInstance;
  
  /**
   * Execute an attack action.
   */
  executeAttack(
    attacker: Combatant,
    target: Combatant,
    attack: Attack
  ): {
    hit: boolean;
    damage: number;
    critical: boolean;
  };
  
  /**
   * Cast a spell.
   */
  castSpell(
    caster: Combatant,
    spell: Spell,
    targets: Combatant[]
  ): SpellResult;
  
  /**
   * Advance to the next turn.
   */
  nextTurn(combat: CombatInstance): CombatInstance;
}
```

---

## 10. Integration Examples

### Example 1: Simple Mode (Casual Game)

```typescript
import { fetchAndParsePlaylist, extractSonicFingerprint, generateCharacter } from '@audio-alchemist/core';

// Fetch playlist
const playlist = await fetchAndParsePlaylist('arweave_tx_id');

// For each track, generate a simple character
for (const track of playlist.tracks) {
  const audioProfile = await extractSonicFingerprint(track.audio_url);
  
  const character = generateCharacter(track, audioProfile, {
    mode: 'simple',  // Just basic stats and visuals
    startingLevel: 1
  });
  
  console.log(`${character.name} - Level ${character.level} ${character.character_class}`);
  console.log(`HP: ${character.hit_points.maximum}, AC: ${character.armor_class}`);
}
```

### Example 2: Full D&D Mode with Environmental Bonuses

```typescript
import { 
  fetchAndParsePlaylist, 
  extractSonicFingerprint, 
  generateCharacter,
  EnvironmentalSensors,
  updateCharacterFromSession
} from '@audio-alchemist/core';

// Initialize environmental sensors
const sensors = new EnvironmentalSensors({
  enableLocation: true,
  enableMotion: true,
  enableWeather: true,
  weatherApiKey: 'your_api_key'
});

await sensors.requestPermissions();

// Fetch playlist and generate character
const playlist = await fetchAndParsePlaylist('arweave_tx_id');
const track = playlist.tracks[0];
const audioProfile = await extractSonicFingerprint(track.audio_url);

const character = generateCharacter(track, audioProfile, {
  mode: 'full_dnd',
  allowClassSelection: true,  // Let player choose from suggestions
  allowRaceSelection: false,  // Keep race deterministic
  startingLevel: 1
});

// Start a listening session with environmental tracking
const sessionStart = Date.now();
const envContext = await sensors.getCurrentContext();

// ... user listens to music while running ...

const sessionEnd = Date.now();
const session: ListeningSession = {
  track_uuid: track.uuid,
  start_time: sessionStart,
  end_time: sessionEnd,
  duration_seconds: (sessionEnd - sessionStart) / 1000,
  base_xp_earned: 0,
  bonus_xp: 0,
  environmental_context: envContext,
  activity_type: envContext.motion?.activity_type,
  total_xp_earned: 0
};

// Calculate XP with bonuses
session.base_xp_earned = session.duration_seconds;
session.bonus_xp = session.base_xp_earned * (sensors.calculateXPModifier(envContext) - 1);
session.total_xp_earned = session.base_xp_earned + session.bonus_xp;

// Update character
const updatedCharacter = updateCharacterFromSession(character, session);

if (updatedCharacter.level > character.level) {
  console.log(`LEVEL UP! Now level ${updatedCharacter.level}`);
  const levelUpBenefits = processLevelUp(updatedCharacter, updatedCharacter.level);
  console.log(`New features: ${levelUpBenefits.newFeatures.map(f => f.name).join(', ')}`);
}
```

### Example 3: Running Mode Detection

```typescript
// Continuous monitoring for fitness integration
sensors.startMonitoring((context) => {
  if (context.motion?.activity_type === 'running') {
    // Show notification: "Running Mode Active! +50% XP"
    displayNotification("🏃 Running Mode: 1.5x XP Boost!");
  }
  
  if (context.weather?.weather_type === 'thunderstorm') {
    // Show notification: "Thunderstorm detected! Lightning spells boosted!"
    displayNotification("⚡ Stormy weather: Lightning damage +25%");
  }
}, 5000);  // Check every 5 seconds
```

### Example 4: Gaming Integration with Steam and Discord

```typescript
import { 
  fetchAndParsePlaylist, 
  extractSonicFingerprint, 
  generateCharacter,
  GamingPlatformSensors,
  updateCharacterFromSession
} from '@audio-alchemist/core';

// Initialize gaming platform monitoring
const gamingSensors = new GamingPlatformSensors({
  steam: {
    apiKey: 'YOUR_STEAM_API_KEY',
    steamId: 'USER_STEAM_ID_64',
    pollInterval: 30000  // Check every 30 seconds
  },
  discord: {
    clientId: 'YOUR_DISCORD_CLIENT_ID',
    enableRichPresence: true
  }
});

// Start monitoring with callback
await gamingSensors.startMonitoring((gamingContext) => {
  if (gamingContext.isActivelyGaming) {
    const bonus = gamingSensors.calculateGamingBonus(gamingContext);
    console.log(`🎮 Gaming detected: ${gamingContext.currentGame?.name}`);
    console.log(`📈 XP Multiplier: ${bonus.toFixed(2)}x`);
    
    // Show notification
    displayNotification(
      `Gaming Boost Active! +${Math.round((bonus - 1) * 100)}% XP`
    );
  }
});

// Setup character and listening session
const playlist = await fetchAndParsePlaylist('arweave_tx_id');
const track = playlist.tracks[0];
const audioProfile = await extractSonicFingerprint(track.audio_url);
const character = generateCharacter(track, audioProfile, {
  mode: 'full_dnd',
  startingLevel: 1
});

// Start listening session
const sessionStart = Date.now();
const gamingContext = await gamingSensors.getCurrentContext();

// ... user listens to music while gaming ...

const sessionEnd = Date.now();
const session: ListeningSession = {
  track_uuid: track.uuid,
  start_time: sessionStart,
  end_time: sessionEnd,
  duration_seconds: (sessionEnd - sessionStart) / 1000,
  base_xp_earned: 0,
  bonus_xp: 0,
  gaming_context: gamingContext,  // Include gaming data
  total_xp_earned: 0
};

// Calculate XP with gaming bonuses
session.base_xp_earned = session.duration_seconds;

if (gamingContext.isActivelyGaming) {
  const gamingBonus = gamingSensors.calculateGamingBonus(gamingContext);
  session.bonus_xp = session.base_xp_earned * (gamingBonus - 1);
  session.total_xp_earned = session.base_xp_earned * gamingBonus;
  
  console.log(`Base XP: ${session.base_xp_earned}`);
  console.log(`Gaming Bonus: ${session.bonus_xp}`);
  console.log(`Total XP: ${session.total_xp_earned}`);
} else {
  session.total_xp_earned = session.base_xp_earned;
}

// Update character
const updatedCharacter = updateCharacterFromSession(character, session);

if (updatedCharacter.level > character.level) {
  console.log(`🎉 LEVEL UP! Now level ${updatedCharacter.level}`);
}

// Stop monitoring when done
gamingSensors.stopMonitoring();
```

### Example 5: Combined Environmental + Gaming Bonuses

```typescript
import { 
  EnvironmentalSensors,
  GamingPlatformSensors,
  calculateTotalXPModifier
} from '@audio-alchemist/core';

// Initialize both sensor types
const envSensors = new EnvironmentalSensors({
  enableLocation: true,
  enableMotion: true,
  enableWeather: true,
  weatherApiKey: 'your_api_key'
});

const gamingSensors = new GamingPlatformSensors({
  steam: { apiKey: 'YOUR_STEAM_KEY', steamId: 'USER_STEAM_ID' }
});

await envSensors.requestPermissions();
await gamingSensors.startMonitoring();

// Get both contexts
const envContext = await envSensors.getCurrentContext();
const gamingContext = await gamingSensors.getCurrentContext();

// Calculate compound bonus
const totalModifier = calculateTotalXPModifier(envContext, gamingContext);

console.log(`🌍 Environmental Modifier: ${envSensors.calculateXPModifier(envContext).toFixed(2)}x`);
console.log(`🎮 Gaming Modifier: ${gamingSensors.calculateGamingBonus(gamingContext).toFixed(2)}x`);
console.log(`⚡ TOTAL MODIFIER: ${totalModifier.toFixed(2)}x`);

// Example: User is running + gaming + thunderstorm
// Environmental: 1.5x (running) * 1.25x (storm) = 1.875x
// Gaming: 1.4x (RPG game with party)
// Combined: Could reach 2.6x+ total!

session.total_xp_earned = session.base_xp_earned * totalModifier;
```

---

## 12. Technical Considerations

### A. Browser Compatibility

**Sensor API Support:**
- **Geolocation:** 97% browser support (all modern browsers)
- **DeviceMotion/Orientation:** 95% mobile, 70% desktop
- **AmbientLightSensor:** <30% (experimental, use as optional enhancement)

**Gaming Platform API Support:**
- **Steam Web API:** Server-side only (requires proxy for browser apps)
- **Discord RPC:** Desktop apps via IPC, web apps via OAuth2
- **Browser Compatibility:** Gaming features require CORS-compliant proxy or backend service

**Fallback Strategy:**
- Gracefully degrade when sensors unavailable
- Provide manual input options for environmental data
- Cache sensor permissions to reduce prompt fatigue

### B. Privacy & Security

- **No server-side storage** of location data by default
- All sensor access requires explicit opt-in
- Clear privacy policy in sensor permission dialogs
- Option to use environmental bonuses without sharing data (honor system)
- **Gaming platform data:**
  - Steam API calls made from user's backend or trusted proxy
  - Discord integration requires user OAuth consent
  - Game activity data never shared with third parties
  - Users can disable gaming tracking at any time

### C. Performance Optimization

- **Audio analysis** should complete in <1 second for typical 3-minute tracks
- **Character generation** should be near-instantaneous (all procedural, no network calls)
- **Sensor polling** should be rate-limited to avoid battery drain
- **Gaming platform polling:**
  - Default 60-second intervals for Steam/Discord checks
  - Implement exponential backoff if APIs are rate-limited
  - Cache game metadata to reduce redundant API calls
  - Batch multiple checks when possible

### D. Testing Considerations

Provide mock data generators for:
- Environmental contexts (test without real GPS)
- Audio profiles (test without analyzing real audio)
- Deterministic seeds (reproducible character generation)
- **Gaming contexts (test without Steam/Discord):**
  - Mock gaming sessions with configurable game titles
  - Simulate genre and multiplayer data
  - Test bonus calculations without real API calls


---

**Document Version:** 2.0  
**Last Updated:** 2025-11-29  
**Author:** Audio Alchemist Development Team
