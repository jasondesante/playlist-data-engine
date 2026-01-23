# Core Data Engine API Reference

Complete API reference for all classes, methods, and types in the Core Data Engine.

For usage examples, see [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md).
For quick overview, see [SPEC.md](SPEC.md).

---

## Table of Contents

- [Core Data Types](#core-data-types)
- [Parser Classes](#parser-classes)
- [Analysis Classes](#analysis-classes)
- [Generation Classes](#generation-classes)
- [Progression Classes](#progression-classes)
- [Sensor Classes](#sensor-classes)
- [Combat Classes](#combat-classes)

---

## Core Data Types

### ServerlessPlaylist

**Source**: `src/core/types/Playlist.ts`

```typescript
interface ServerlessPlaylist {
    name: string;           // Name of the playlist
    description?: string;   // Optional description
    image: string;          // URL to playlist cover art
    creator: string;        // Wallet address of the curator
    genre?: string;         // General genre of the playlist
    tags?: string[];        // Search tags
    tracks: PlaylistTrack[]; // Array of flattened track objects
}
```

### PlaylistTrack

**Source**: `src/core/types/Playlist.ts`

```typescript
interface PlaylistTrack {
    // Identity & Blockchain Data
    id: string;             // e.g. "ethereum-0xContract-1" or "AR-{tx_id}"
    uuid: string;           // Unique instance ID for the game engine
    playlist_index: number; // Order in the playlist
    chain_name: string;     // e.g. "ethereum", "optimism", "AR"
    token_address?: string; // Contract Address (not present for AR chain)
    token_id?: string;      // Token ID (not present for AR chain)
    tx_id?: string;         // Arweave transaction ID (only for AR chain)
    platform: string;       // e.g. "sound", "catalog", "contract-wizard"

    // Content Data
    title: string;          // Track title
    artist: string;         // Track artist
    description?: string;   // Track description
    album?: string;         // Album name

    // Assets
    image_url: string;      // Cover art URL
    audio_url: string;      // Audio file URL
    duration: number;       // Duration in seconds

    // Meta Tags
    genre: string;          // Primary genre
    tags: string[];         // All tags lowercased
    bpm?: number;           // BPM if available
    key?: string;           // Musical key if available

    // Raw Attributes
    attributes?: Record<string, string | number>;
}
```

### RawArweavePlaylist

**Source**: `src/core/types/Playlist.ts`

```typescript
interface RawArweavePlaylist {
    name: string;
    image: string;
    creator: string;
    description?: string;
    genre?: string;
    tags?: string[];
    tracks: Array<{
        chain_name: string;
        token_address?: string;
        token_id?: string;
        tx_id?: string;
        platform: string;
        id?: string;
        uuid?: string;
        metadata: string; // Stringified JSON payload
    }>;
}
```

### AudioProfile

**Source**: `src/core/types/AudioProfile.ts`

```typescript
interface AudioProfile {
    bass_dominance: number;      // 0.0 - 1.0
    mid_dominance: number;       // 0.0 - 1.0
    treble_dominance: number;    // 0.0 - 1.0
    average_amplitude: number;   // 0.0 - 1.0

    // Optional advanced metrics
    spectral_centroid?: number;
    spectral_rolloff?: number;
    zero_crossing_rate?: number;

    // Optional color palette from artwork
    color_palette?: ColorPalette;

    analysis_metadata: {
        duration_analyzed: number;
        full_buffer_analyzed: boolean;
        sample_positions: number[];
        analyzed_at: string;
    };
}
```

### ColorPalette

**Source**: `src/core/types/AudioProfile.ts`

```typescript
interface ColorPalette {
    colors: string[];            // Dominant colors in hex format
    primary_color: string;       // Most dominant color
    secondary_color?: string;    // Secondary color
    accent_color?: string;       // Accent color
    brightness: number;          // 0.0 - 1.0
    saturation: number;          // 0.0 - 1.0
    is_monochrome: boolean;      // True if image is monochrome
}
```

### CharacterSheet

**Source**: `src/core/types/Character.ts`

```typescript
interface CharacterSheet {
    name: string;
    race: Race;                  // One of 9 D&D races
    class: Class;                // One of 12 D&D classes
    level: number;               // 1-20

    ability_scores: AbilityScores;
    ability_modifiers: AbilityScores;
    proficiency_bonus: number;

    hp: {
        current: number;
        max: number;
        temp: number;
    };

    armor_class: number;
    initiative: number;
    speed: number;

    skills: Record<Skill, ProficiencyLevel>;
    saving_throws: Record<Ability, boolean>;

    racial_traits: string[];
    class_features: string[];

    spells?: {
        spell_slots: Record<number, { total: number; used: number }>;
        known_spells: string[];
        cantrips: string[];
    };

    equipment?: {
        weapons: Array<{ name: string; quantity: number; equipped: boolean }>;
        armor: Array<{ name: string; quantity: number; equipped: boolean }>;
        items: Array<{ name: string; quantity: number; equipped: boolean }>;
        totalWeight: number;
        equippedWeight: number;
    };

    appearance?: {
        body_type: string;
        skin_tone: string;
        hair_style: string;
        hair_color: string;
        eye_color: string;
        facial_features: string[];
        primary_color?: string;
        secondary_color?: string;
        aura_color?: string;
    };

    xp: {
        current: number;
        next_level: number;
    };

    seed: string;
    generated_at: string;
}
```

**Race Union Type**: `'Human' | 'Elf' | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling'`

**Class Union Type**: `'Barbarian' | 'Bard' | 'Cleric' | 'Druid' | 'Fighter' | 'Monk' | 'Paladin' | 'Ranger' | 'Rogue' | 'Sorcerer' | 'Warlock' | 'Wizard'`

**Ability Type**: `'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'`

**Skill Type**: `'athletics' | 'acrobatics' | 'sleight_of_hand' | 'stealth' | 'arcana' | 'history' | 'investigation' | 'nature' | 'religion' | 'animal_handling' | 'insight' | 'medicine' | 'perception' | 'survival' | 'deception' | 'intimidation' | 'performance' | 'persuasion'`

**ProficiencyLevel Type**: `'none' | 'proficient' | 'expertise'`

### EnvironmentalContext

**Source**: `src/core/types/Environmental.ts`

```typescript
interface EnvironmentalContext {
    geolocation?: GeolocationData;
    motion?: MotionData;
    weather?: WeatherData;
    light?: LightData;
    biome?: BiomeType;
    timestamp: number;
    environmental_xp_modifier?: number;
}
```

**BiomeType**: `'urban' | 'forest' | 'desert' | 'mountain' | 'valley' | 'water' | 'tundra' | 'plains' | 'jungle' | 'swamp' | 'taiga' | 'savanna'`

### GeolocationData

**Source**: `src/core/types/Environmental.ts`

```typescript
interface GeolocationData {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}
```

### MotionData

**Source**: `src/core/types/Environmental.ts`

```typescript
interface MotionData {
    acceleration: {
        x: number | null;
        y: number | null;
        z: number | null;
    };
    accelerationIncludingGravity: {
        x: number;
        y: number;
        z: number;
    };
    rotationRate: {
        alpha: number | null;
        beta: number | null;
        gamma: number | null;
    };
    interval: number;
    timestamp: number;
}
```

### WeatherData

**Source**: `src/core/types/Environmental.ts`

```typescript
interface WeatherData {
    temperature: number;
    humidity: number;
    pressure: number;
    weatherType: string;      // e.g., 'Clear', 'Rain', 'Clouds'
    windSpeed: number;
    windDirection: number;
    isNight: boolean;
    moonPhase: number;        // 0.0 to 1.0
    timestamp: number;
}
```

### LightData

**Source**: `src/core/types/Environmental.ts`

```typescript
interface LightData {
    illuminance: number;       // lux
    timestamp: number;
}
```

### GamingContext

**Source**: `src/core/types/Progression.ts`

```typescript
interface GamingContext {
    isActivelyGaming: boolean;
    platformSource: 'steam' | 'none';

    currentGame?: {
        name: string;
        source: 'steam';
        genre?: string[];
        sessionDuration?: number;  // Minutes in current session
        partySize?: number;        // Multiplayer party size
    };

    totalGamingMinutes: number;
    gamesPlayedWhileListening: string[];
    lastUpdated: number;
}
```

### ListeningSession

**Source**: `src/core/types/Progression.ts`

```typescript
interface ListeningSession {
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

### CombatInstance

**Source**: `src/core/types/Combat.ts`

```typescript
interface CombatInstance {
    id: string;
    combatants: Combatant[];
    currentTurnIndex: number;
    roundNumber: number;
    environment?: EnvironmentalContext;
    history: CombatAction[];
    isActive: boolean;
    winner?: Combatant;
    startTime: number;
    lastUpdated: number;
}
```

### Combatant

**Source**: `src/core/types/Combat.ts`

```typescript
interface Combatant {
    id: string;
    character: CharacterSheet;
    initiative: number;
    currentHP: number;
    temporaryHP?: number;
    statusEffects: StatusEffect[];
    position?: { x: number; y: number };
    isDefeated: boolean;
    actionUsed: boolean;
    bonusActionUsed: boolean;
    reactionUsed: boolean;
    spellSlots?: { [level: number]: number };
}
```

### CombatResult

**Source**: `src/core/types/Combat.ts`

```typescript
interface CombatResult {
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
```

---

## Parser Classes

### PlaylistParser

**Source**: `src/core/parser/PlaylistParser.ts`

Parses raw Arweave/JSON playlist data into structured `ServerlessPlaylist` format.

```typescript
interface PlaylistParserOptions {
    validateAudioUrls?: boolean;  // Validate audio URLs (check for 404s)
    strict?: boolean;             // Throw errors on invalid tracks
}
```

#### Constructor

```typescript
constructor(options?: PlaylistParserOptions)
```

Creates a new PlaylistParser instance with optional configuration.

#### Methods

```typescript
async parse(data: RawArweavePlaylist): Promise<ServerlessPlaylist>
```

Parse raw Arweave playlist data into ServerlessPlaylist. Flattens blockchain data with extracted metadata, validates required fields, and optionally validates audio URLs.

---

## Analysis Classes

### AudioAnalyzer

**Source**: `src/core/analysis/AudioAnalyzer.ts`

Extracts sonic fingerprint from audio files using "Triple Tap" sampling strategy (5%, 40%, 70% positions).

```typescript
interface AudioAnalyzerOptions {
    includeAdvancedMetrics?: boolean;  // Include spectral_centroid, spectral_rolloff, zero_crossing_rate
    sampleRate?: number;               // Sample rate in Hz (default: 44100)
    fftSize?: number;                  // FFT size for frequency analysis (default: 2048)
}
```

#### Constructor

```typescript
constructor(options?: AudioAnalyzerOptions)
```

Creates a new AudioAnalyzer instance with optional configuration.

#### Methods

```typescript
async extractSonicFingerprint(audioUrl: string): Promise<AudioProfile>
```

Extract sonic fingerprint from audio URL. Uses Triple Tap strategy for files > 3 seconds. Returns AudioProfile with frequency band dominance values and optional advanced metrics.

---

### ColorExtractor

**Source**: `src/core/analysis/ColorExtractor.ts`

Extracts color palette from artwork using K-means clustering.

#### Methods

```typescript
static async extractColors(imageUrl: string, colorCount: number = 4): Promise<ColorPalette>
```

Extract color palette from image URL. Returns dominant colors ranked by frequency.

---

## Generation Classes

### CharacterGenerator

**Source**: `src/core/generation/CharacterGenerator.ts`

Generates D&D 5e-compliant character sheets deterministically from audio signatures.

```typescript
interface CharacterGeneratorOptions {
    level?: number;      // Starting level (default: 1)
    forceClass?: Class;  // Override class suggestion
}
```

#### Static Methods

```typescript
static generate(
    seed: string,
    audioProfile: AudioProfile,
    name: string,
    options?: CharacterGeneratorOptions
): CharacterSheet
```

Generate a complete D&D 5e character sheet from audio profile and seed. Deterministic - same seed + audio profile always produces identical character.

### NamingEngine

**Source**: `src/core/generation/NamingEngine.ts`

Generates RPG-style character names from track metadata.

#### Methods

```typescript
public generateName(track: PlaylistTrack, audioProfile: AudioProfile): string
```

Generate RPG-style character name from track metadata. Uses three formats with weighted random selection:
- 50% "Class Title" (e.g., "Sonic Bard")
- 30% "Adjective Construct" (e.g., "Midnight Echoes")
- 20% "Clan Construct" (e.g., "Harmonix Collective")

```typescript
public cleanTitle(title: string): string
```

Clean track title by removing metadata suffixes and prefixes (e.g., "(Official Video)", "[Remix]").

### RaceSelector

**Source**: `src/core/generation/RaceSelector.ts`

Deterministically selects character race from seeded RNG.

#### Static Methods

```typescript
static select(rng: SeededRNG): Race
```

Select a race deterministically from the 9 D&D races.

### ClassSuggester

**Source**: `src/core/generation/ClassSuggester.ts`

Suggests character class based on audio profile characteristics.

#### Static Methods

```typescript
static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class
```

Suggest a class based on audio frequency analysis with random variation.

### AbilityScoreCalculator

**Source**: `src/core/generation/AbilityScoreCalculator.ts`

Calculates D&D 5e ability scores from audio profile.

#### Static Methods

```typescript
static calculateBaseScores(audioProfile: AudioProfile): AbilityScores
```

Calculate base ability scores (8-15 range) from audio frequency dominance.

```typescript
static applyRacialBonuses(baseScores: AbilityScores, race: Race): AbilityScores
```

Apply racial ability score bonuses to base scores (capped at 20).

```typescript
static calculateModifiers(abilityScores: AbilityScores): AbilityScores
```

Calculate ability modifiers from ability scores (floor((score - 10) / 2)).

### SkillAssigner

**Source**: `src/core/generation/SkillAssigner.ts`

Assigns D&D 5e skill proficiencies based on character class.

#### Static Methods

```typescript
static assignSkills(characterClass: Class, rng: SeededRNG): Record<Skill, ProficiencyLevel>
```

Assign skill proficiencies based on character class. Returns all 18 skills with proficiency levels.

### SpellManager

**Source**: `src/core/generation/SpellManager.ts`

Manages spell assignment, spell slots, and cantrips for spellcasting classes.

```typescript
interface SpellSlots {
    spell_slots: Record<number, { total: number; used: number }>;  // Spell slots by level (0-9)
    known_spells: string[];                                          // Known spell names
    cantrips: string[];                                              // Cantrip names
}
```

#### Static Methods

```typescript
static isSpellcaster(characterClass: Class): boolean
```

Check if a class is a spellcaster.

```typescript
static getSpellSlots(characterClass: Class, characterLevel: number): Record<number, { total: number; used: number }>
```

Get spell slots for a class at a given level. Returns record of spell slots by spell level (0-9) with total and used counts.

```typescript
static getCantrips(characterClass: Class): string[]
```

Get cantrips known by a spellcaster class.

```typescript
static getKnownSpells(characterClass: Class, characterLevel: number): string[]
```

Get spells known by a spellcaster at a given level. Returns all spells available up to the character's level.

```typescript
static initializeSpells(characterClass: Class, characterLevel: number): SpellSlots
```

Initialize complete spell configuration for a spellcaster at given level. Returns SpellSlots object with spell slots, known spells, and cantrips.

```typescript
static getSpellCountAtLevel(spellLevel: number, spellSlots: Record<number, { total: number; used: number }>): number
```

Get spell count at a given spell level from a character's spell slots.

```typescript
static useSpellSlot(spellSlots: Record<number, { total: number; used: number }>, spellLevel: number): Record<number, { total: number; used: number }>
```

Use a spell slot at a given level (1-9). Returns updated spell slots with one slot used.

```typescript
static restoreSpellSlots(spellSlots: Record<number, { total: number; used: number }>, spellLevel?: number): Record<number, { total: number; used: number }>
```

Restore all spell slots at a given level, or all levels if unspecified. Returns updated spell slots with slots restored.

### EquipmentGenerator

**Source**: `src/core/generation/EquipmentGenerator.ts`

Manages equipment assignment, inventory, and equipped items.

```typescript
interface InventoryItem {
    name: string;
    quantity: number;
    equipped: boolean;
}

interface CharacterEquipment {
    weapons: InventoryItem[];
    armor: InventoryItem[];
    items: InventoryItem[];
    totalWeight: number;
    equippedWeight: number;
}
```

#### Static Methods

```typescript
static getStartingEquipment(characterClass: Class): { weapons: string[]; armor: string[]; items: string[] }
```

Get starting equipment for a class. Returns object with weapons, armor, and items arrays.

```typescript
static initializeEquipment(characterClass: Class): CharacterEquipment
```

Initialize complete equipment for a character class with starting gear. Equips primary weapon and armor by default.

```typescript
static addItem(equipment: CharacterEquipment, itemName: string, quantity?: number): CharacterEquipment
```

Add an item to inventory. Returns updated equipment with new item.

```typescript
static removeItem(equipment: CharacterEquipment, itemName: string, quantity?: number): CharacterEquipment
```

Remove an item from inventory. Returns updated equipment with item removed.

```typescript
static equipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment
```

Equip an item from inventory. Returns updated equipment with item equipped.

```typescript
static unequipItem(equipment: CharacterEquipment, itemName: string): CharacterEquipment
```

Unequip an item. Returns updated equipment with item unequipped.

```typescript
static getInventoryList(equipment: CharacterEquipment): InventoryItem[]
```

Get inventory as flattened list of all items (weapons, armor, items).

### AppearanceGenerator

**Source**: `src/core/generation/AppearanceGenerator.ts`

Generates character appearance from seed and audio profile.

```typescript
interface CharacterAppearance {
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

#### Static Methods

```typescript
static generate(seed: string, characterClass: Class, audioProfile: AudioProfile): CharacterAppearance
```

Generate deterministic character appearance from seed and audio profile. Magical classes receive aura colors.

---

## Progression Classes

### SessionTracker

**Source**: `src/core/progression/SessionTracker.ts`

Tracks listening sessions for XP calculation and character progression.

#### Constructor

```typescript
constructor(xpCalculator?: XPCalculator)
```

Create a new SessionTracker with optional custom XPCalculator.

#### Methods

```typescript
startSession(trackUuid: string, track?: PlaylistTrack, context?: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): string
```

Start a new listening session. Returns session ID for tracking.

```typescript
endSession(sessionId: string, durationOverride?: number, activityType?: string): ListeningSession | null
```

End a listening session and record it. Returns completed session or null if session not found.

```typescript
getActiveSession(sessionId: string): ActiveSession | null
```

Get an active session without ending it.

```typescript
getActiveSessionDuration(sessionId: string): number | null
```

Get duration of active session in seconds.

```typescript
updateSessionContext(sessionId: string, context: { environmental_context?: EnvironmentalContext; gaming_context?: GamingContext }): boolean
```

Update context for an active session.

```typescript
getSessionHistory(): ListeningSession[]
```

Get all recorded sessions.

```typescript
getSessionsForTrack(trackUuid: string): ListeningSession[]
```

Get sessions for a specific track.

```typescript
getTotalListeningTime(): number
```

Get total listening time across all sessions (in seconds).

```typescript
getTotalXPEarned(): number
```

Get total XP earned across all sessions.

```typescript
getTrackListeningTime(trackUuid: string): number
```

Get total listening time for a specific track (in seconds).

```typescript
getTrackListenCount(trackUuid: string): number
```

Get listen count for a track (number of sessions).

```typescript
isTrackMastered(trackUuid: string, masteryThreshold?: number): boolean
```

Check if a track has been mastered (default threshold: 10 listens).

```typescript
getSessionsInRange(startTime: number, endTime: number): ListeningSession[]
```

Get sessions within a time range.

```typescript
getAverageSessionLength(): number
```

Get average session length in seconds.

```typescript
getLongestSession(): ListeningSession | null
```

Get the longest session.

```typescript
clearHistory(): void
```

Clear all session history.

```typescript
clearActiveSessions(): void
```

Clear all active sessions.

```typescript
getActiveSessionCount(): number
```

Get count of active sessions.

```typescript
getActiveSessionIds(): string[]
```

Get all active session IDs.

### XPCalculator

**Source**: `src/core/progression/XPCalculator.ts`

Calculates XP with environmental, gaming, and activity modifiers.

#### Constructor

```typescript
constructor(options?: Partial<ExperienceSystem>)
```

Create a new XPCalculator with optional configuration overrides.

#### Methods

```typescript
calculateSessionXP(session: ListeningSession, track?: PlaylistTrack): number
```

Calculate total XP earned for a listening session. Applies all multipliers: base, activity, environmental, gaming.

```typescript
calculateTotalModifier(envContext?: EnvironmentalContext, gamingContext?: GamingContext): number
```

Calculate total XP modifier (environmental + gaming combined). Capped at 3.0x.

```typescript
getXPThresholdForLevel(level: number): number
```

Get the XP threshold for a specific level (1-20).

```typescript
getXPToNextLevel(currentLevel: number): number
```

Get the XP required to advance from current level to next.

```typescript
getLevelFromXP(totalXP: number): number
```

Determine what level a character should be at with given XP total.

```typescript
isTrackMastered(listenCount: number): boolean
```

Check if track is mastered based on listen count.

```typescript
getMasteryBonusXP(): number
```

Get the mastery bonus XP amount.

```typescript
getConfig(): ExperienceSystem
```

Get current configuration.

### MasterySystem

**Source**: `src/core/progression/MasterySystem.ts`

Handles track mastery logic. Tracks how many times a user has listened to a track and awards mastery status.

#### Methods

```typescript
public checkMastery(listenCount: number): boolean
```

Check if track has reached mastery status based on listen count.

```typescript
public isJustMastered(previousListenCount: number, currentListenCount: number): boolean
```

Determine if track just reached mastery status in this session.

```typescript
public calculateMasteryBonus(isMastered: boolean): number
```

Calculate bonus XP awarded for mastery.

### LevelUpProcessor

**Source**: `src/core/progression/LevelUpProcessor.ts`

Handles character leveling mechanics including HP increases, ability score improvements, spell slots, and class features.

```typescript
interface LevelUpBenefits {
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

#### Static Methods

```typescript
static processLevelUp(character: CharacterSheet, newLevel: number, seed?: string): LevelUpBenefits
```

Process a character level-up. Returns benefits granted by leveling up including HP increase, proficiency bonus, ability score increases (at levels 4, 8, 12, 16, 19), spell slots (for spellcasters), and class features.

```typescript
static applyLevelUp(character: CharacterSheet, benefits: LevelUpBenefits): CharacterSheet
```

Apply a level-up to a character. Returns updated character with level, HP, proficiency bonus, ability scores, spell slots, and class features applied.

```typescript
static getXPThreshold(level: number): number
```

Get the XP threshold for a specific level (1-20) using D&D 5e standard progression.

```typescript
static calculateLevel(totalXP: number): number
```

Calculate level from total XP. Returns character level (1-20).

```typescript
static getXPToNextLevel(currentLevel: number): number
```

Get XP needed to reach next level. Returns 0 if already at max level (20).

```typescript
static getProgressPercentage(currentLevel: number, currentXP: number): number
```

Get progress to next level as a percentage (0-100).

### CharacterUpdater

**Source**: `src/core/progression/CharacterUpdater.ts`

Orchestrates character updates from listening sessions. Calculates XP, checks for level-ups, and handles track mastery.

```typescript
interface CharacterUpdateResult {
    character: CharacterSheet;
    xpEarned: number;
    leveledUp: boolean;
    newLevel?: number;
    masteredTrack: boolean;
    masteryBonusXP: number;
}
```

#### Constructor

```typescript
constructor()
```

Create a new CharacterUpdater with default XPCalculator and MasterySystem.

#### Methods

```typescript
public updateCharacterFromSession(character: CharacterSheet, session: ListeningSession, track?: PlaylistTrack, previousListenCount: number = 0): CharacterUpdateResult
```

Update a character based on a completed listening session. Calculates XP, checks for mastery status, processes level-ups, and returns result with updated character. Handles multiple level-ups if massive XP gain.

---

## Sensor Classes

### EnvironmentalSensors

**Source**: `src/core/sensors/EnvironmentalSensors.ts`

Aggregates data from GPS, motion, weather, and light sensors with error recovery.

```typescript
type SensorType = 'geolocation' | 'motion' | 'weather' | 'light';

interface SensorPermission {
    type: SensorType;
    granted: boolean;
    timestamp: number;
}
```

#### Constructor

Supports multiple signatures for backward compatibility:

```typescript
// Legacy: API key only
new EnvironmentalSensors(weatherApiKey?: string)

// Legacy: API key with retry config
new EnvironmentalSensors(weatherApiKey?: string, retryConfig?: Partial<SensorRetryConfig>)

// New: Full config object
new EnvironmentalSensors(config?: {
    weather?: { apiKey?: string };
    geolocation?: Partial<GeolocationSensorConfig>;
    retry?: Partial<RetryConfig>;
    xpModifier?: Partial<XPModifierConfig>;
})
```

#### Methods

```typescript
async requestPermissions(types: SensorType[]): Promise<SensorPermission[]>
```

Request user permissions for specific sensor types.

```typescript
startMonitoring(callback?: (context: EnvironmentalContext) => void): void
```

Start monitoring enabled sensors.

```typescript
stopMonitoring(): void
```

Stop all monitoring.

```typescript
async updateSnapshot(): Promise<EnvironmentalContext>
```

Manually update snapshot of pull-based sensors (Geo, Weather) with retry logic.

```typescript
calculateXPModifier(): number
```

Calculate XP modifier based on environmental factors. Uses last known good values if current readings unavailable.

```typescript
async calculateXPModifierWithForecast(forecastHours?: number): Promise<number>
```

Calculate XP modifier including forecast for incoming weather.

```typescript
async calculateXPModifierWithSevereWeather(): Promise<{ modifier: number; severeWeatherAlert: SevereWeatherAlert | null; safetyWarning: string | null }>
```

Calculate XP modifier with severe weather detection.

```typescript
detectSevereWeather(): SevereWeatherAlert | null
```

Detect severe weather from current conditions.

```typescript
getSevereWeatherWarning(): string | null
```

Get safety warning for current severe weather.

```typescript
getCurrentActivity(): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
```

Get current activity type with fallback to last known good.

```typescript
getSensorStatus(sensorType: SensorType): SensorStatus | null
```

Get current status of a specific sensor.

```typescript
getAllSensorStatuses(): SensorStatus[]
```

Get status of all sensors.

```typescript
getFailureLog(sensorType?: SensorType, limit?: number): SensorFailureLog[]
```

Get failure log entries, optionally filtered by sensor type.

```typescript
getLastKnownGood(sensorType: SensorType): any
```

Get last known good value for a sensor.

```typescript
clearFailureLog(): void
```

Clear failure log.

```typescript
updateRetryConfig(config: Partial<SensorRetryConfig>): void
```

Update retry configuration.

```typescript
onSensorRecovery(callback: (notification: SensorRecoveryNotification) => void): () => void
```

Register callback for sensor recovery notifications. Returns unsubscribe function.

```typescript
checkAvailability(type: SensorType): boolean
```

Check if sensor type is available in current environment.

```typescript
getDiagnostics(): { timestamp: number; diagnosticMode: boolean; sensors: [...]; cache: {...}; performance: {...}; recentFailures: SensorFailureLog[]; permissions: SensorPermission[]; context: {...} }
```

Get comprehensive diagnostic information for troubleshooting.

```typescript
enableDiagnosticMode(): void
```

Enable diagnostic mode for enhanced logging.

```typescript
disableDiagnosticMode(): void
```

Disable diagnostic mode.

```typescript
printDashboard(config?: DashboardConfig): void
```

Print formatted dashboard to console.

### GamingPlatformSensors

**Source**: `src/core/sensors/GamingPlatformSensors.ts`

Monitors Steam game activity and calculates gaming-based XP bonuses.

**Note**: Discord RPC CANNOT read game activity due to platform limitations. Discord RPC is only for SETTING music presence. Game detection uses Steam API only.

#### Constructor

```typescript
new GamingPlatformSensors(config?: {
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
})
```

#### Methods

```typescript
async authenticate(steamUserId?: string, discordUserId?: string): Promise<boolean>
```

Authenticate with Steam and Discord. Both parameters are optional.

```typescript
startMonitoring(callback?: (context: GamingContext) => void): void
```

Start polling for gaming activity.

```typescript
stopMonitoring(): void
```

Stop monitoring gaming activity.

```typescript
getContext(): GamingContext
```

Get current gaming context.

```typescript
isPlayingGame(gameName: string): boolean
```

Check if currently playing a specific game.

```typescript
calculateGamingBonus(): number
```

Calculate gaming XP bonus multiplier (capped at configured max).

```typescript
recordGameSession(gameName: string, durationMinutes: number): void
```

Add game to list of games played while listening.

```typescript
getDiagnostics(): { timestamp: number; steam: {...}; discord: {...}; gamingContext: GamingContext; polling: {...}; cache: {...}; performance: {...} }
```

Get comprehensive diagnostic information.

```typescript
printDashboard(config?: DashboardConfig): void
```

Print formatted dashboard to console.

### GeolocationProvider

**Source**: `src/core/sensors/GeolocationProvider.ts`

Provides geolocation data using browser's Geolocation API with caching support.

```typescript
interface GeolocationSensorConfig {
    cacheTTL?: number;           // Cache TTL in milliseconds (default: 5 minutes)
    useLocalStorage?: boolean;   // Persist cache to localStorage (default: true)
}
```

#### Constructor

```typescript
constructor(cacheTTLMinutes?: number, useLocalStorage?: boolean)
constructor(config: GeolocationSensorConfig)
```

Creates a new GeolocationProvider with optional cache configuration.

#### Methods

```typescript
async getCurrentPosition(forceRefresh?: boolean): Promise<GeolocationData | null>
```

Get current position using Geolocation API. Returns cached data if valid and not force refreshing.

```typescript
getBiome(latitude: number, longitude: number, altitude?: number | null): string
```

Calculate biome type based on coordinates and optional altitude. Supports 12 biome types: urban, forest, desert, mountain, valley, water, tundra, plains, jungle, swamp, taiga, savanna. Coastal variants are supported (e.g., "forest_coastal").

```typescript
getCacheAge(): number | null
```

Get age of cached position in milliseconds.

```typescript
invalidateCache(): void
```

Clear cached geolocation data.

```typescript
getCacheStats(): { hits: number; misses: number }
```

Get cache statistics.

```typescript
resetCacheStats(): void
```

Reset cache statistics.

```typescript
isCacheExpired(): boolean
```

Check if cache is expired.

```typescript
getCachedPosition(): GeolocationData | null
```

Get cached position without checking TTL.

### MotionDetector

**Source**: `src/core/sensors/MotionDetector.ts`

Detects device motion using DeviceMotionEvent API.

#### Constructor

```typescript
constructor()
```

Creates a new MotionDetector instance.

#### Methods

```typescript
startMonitoring(callback: (data: MotionData) => void): void
```

Start listening for motion events. Callback receives motion data when available.

```typescript
stopMonitoring(): void
```

Stop listening for motion events.

```typescript
getLastMotion(): MotionData | null
```

Get the last recorded motion data.

```typescript
detectActivity(data: MotionData): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
```

Detect activity type based on motion intensity using acceleration magnitude.

### WeatherAPIClient

**Source**: `src/core/sensors/WeatherAPIClient.ts`

OpenWeatherMap API client for current weather and forecast data with caching and performance metrics.

```typescript
interface WeatherSensorConfig {
    apiKey?: string;
    cacheTTL?: number;           // Cache TTL in milliseconds (default: 12 minutes)
    useLocalStorage?: boolean;   // Persist cache to localStorage (default: true)
}

interface SevereWeatherAlert {
    type: 'Blizzard' | 'Hurricane' | 'Typhoon' | 'Tornado' | 'None';
    xpBonus: number;             // 0.5 to 1.0 (50% to 100% bonus)
    severity: 'moderate' | 'high' | 'extreme';
    message: string;
    detectedAt: number;
}
```

#### Constructor

```typescript
constructor(apiKey?: string, cacheTTLMinutes?: number, useLocalStorage?: boolean)
constructor(config: WeatherSensorConfig)
```

Creates a new WeatherAPIClient with OpenWeatherMap API key and optional cache configuration.

#### Methods

```typescript
async getWeather(latitude: number, longitude: number): Promise<WeatherData | null>
```

Fetch current weather for coordinates. Returns cached data if valid and within TTL. Includes temperature, humidity, pressure, wind, moon phase, and isNight flag.

```typescript
async getForecast(latitude: number, longitude: number, hours?: number): Promise<ForecastData[] | null>
```

Fetch weather forecast for coordinates (max 120 hours / 5 days). Returns array of forecast data with 3-hour intervals.

```typescript
async getUpcomingWeather(latitude: number, longitude: number, hours?: number): Promise<{ willRain: boolean; willSnow: boolean; rainProbability: number; snowProbability: number; worstWeatherType: string } | null>
```

Get upcoming weather changes for XP modifier calculation.

```typescript
detectSevereWeather(weather: WeatherData | ForecastData): SevereWeatherAlert | null
```

Detect severe weather conditions including blizzard, hurricane, typhoon, and tornado. Returns alert with XP bonus amount.

```typescript
getSafetyWarning(alert: SevereWeatherAlert): string
```

Get safety warning message for severe weather alert.

```typescript
getWeatherApiMetrics(): PerformanceMetrics
```

Get performance metrics for weather API calls.

```typescript
getWeatherApiStatistics(): PerformanceStatistics & { p95: number; p99: number }
```

Get calculated performance statistics including p95 and p99 percentiles.

```typescript
getForecastApiMetrics(): PerformanceMetrics
```

Get performance metrics for forecast API calls.

```typescript
getForecastApiStatistics(): PerformanceStatistics & { p95: number; p99: number }
```

Get calculated forecast statistics including p95 and p99 percentiles.

```typescript
resetPerformanceMetrics(): void
```

Reset all performance metrics.

```typescript
invalidateCache(): void
```

Invalidate all cached weather data.

```typescript
invalidateLocation(latitude: number, longitude: number): void
```

Invalidate cache for a specific location.

```typescript
getCacheStats(): { hits: number; misses: number }
```

Get cache statistics.

```typescript
resetCacheStats(): void
```

Reset cache statistics.

```typescript
clearExpiredEntries(): number
```

Clear expired cache entries. Returns number of entries cleared.

```typescript
getCacheSize(): number
```

Get current cache size.

```typescript
invalidateForecastCache(): void
```

Invalidate all forecast cache.

```typescript
invalidateForecastLocation(latitude: number, longitude: number): void
```

Invalidate forecast cache for a specific location.

### LightSensor

**Source**: `src/core/sensors/LightSensor.ts`

Ambient light sensor using experimental Web API (AmbientLightSensor).

#### Constructor

```typescript
constructor()
```

Creates a new LightSensor instance.

#### Methods

```typescript
startMonitoring(callback: (data: LightData) => void): void
```

Start monitoring ambient light levels. Callback receives light data with illuminance in lux.

```typescript
stopMonitoring(): void
```

Stop monitoring.

```typescript
getLastReading(): LightData | null
```

Get last light sensor reading.

### DiscordRPCClient

**Source**: `src/core/sensors/DiscordRPCClient.ts`

Manages Discord Rich Presence for music status display.

**Note**: For SETTING music presence only ("Listening to" status). Cannot read game activity.

#### Constructor

```typescript
constructor(clientId?: string)
```

#### Methods

```typescript
async connect(): Promise<DiscordConnectionState>
```

Connect to Discord RPC.

```typescript
disconnect(): void
```

Disconnect from Discord RPC.

```typescript
async setMusicActivity(activity: { songName: string; artistName: string; albumArtKey?: string; startTime: number; durationSeconds: number }): Promise<void>
```

Set music presence status on Discord.

```typescript
clearActivity(): void
```

Clear activity status.

```typescript
getConnectionState(): DiscordConnectionState | null
```

Get current connection state.

### SteamAPIClient

**Source**: `src/core/sensors/SteamAPIClient.ts`

Steam Web API client for game detection and metadata.

#### Constructor

```typescript
constructor(apiKey?: string)
```

#### Methods

```typescript
async getCurrentGame(steamId: string): Promise<{ name: string; source: 'steam'; sessionDuration: number; partySize?: number } | null>
```

Get currently playing game for a Steam user.

```typescript
async getGameMetadata(gameName: string): Promise<{ genre?: string[] } | null>
```

Get game metadata including genre.

```typescript
getCurrentGameApiStatistics(): { average: number; min: number; max: number; totalCalls: number; successRate: number; p95: number; p99: number }
```

Get API call statistics for current game endpoint.

```typescript
getMetadataApiStatistics(): { average: number; min: number; max: number; totalCalls: number; successRate: number; p95: number; p99: number }
```

Get API call statistics for metadata endpoint.

---

## Combat Classes

### CombatEngine

**Source**: `src/core/combat/CombatEngine.ts`

D&D 5e turn-based combat engine.

```typescript
interface CombatConfig {
    useEnvironment?: boolean;     // Apply environmental bonuses (default: true)
    useMusic?: boolean;           // Apply music bonuses (default: false)
    tacticalMode?: boolean;       // Enable advanced tactical rules (default: false)
    maxTurnsBeforeDraw?: number;  // Max turns before draw (default: 100)
    allowFleeing?: boolean;       // Allow combatants to flee (default: false)
}
```

#### Constructor

```typescript
constructor(config?: CombatConfig)
```

Initialize combat engine with configuration options.

#### Methods

```typescript
startCombat(playerCharacters: CharacterSheet[], enemies: CharacterSheet[], environment?: EnvironmentalContext): CombatInstance
```

Initialize a combat encounter with players vs enemies. Rolls initiative and establishes turn order.

```typescript
getCurrentCombatant(combat: CombatInstance): Combatant
```

Get the current active combatant.

```typescript
executeAttack(combat: CombatInstance, attacker: Combatant, target: Combatant, attack: Attack): CombatAction
```

Execute an attack action.

```typescript
executeCastSpell(combat: CombatInstance, caster: Combatant, spell: Spell, targets: Combatant[]): CombatAction
```

Execute a spell casting action.

```typescript
executeDodge(combat: CombatInstance, combatant: Combatant): CombatAction
```

Execute a dodge action (increase AC by 2).

```typescript
executeDash(combat: CombatInstance, combatant: Combatant): CombatAction
```

Execute a dash action (double movement).

```typescript
executeDisengage(combat: CombatInstance, combatant: Combatant): CombatAction
```

Execute a disengage action (avoid opportunity attacks).

```typescript
nextTurn(combat: CombatInstance): CombatInstance
```

Advance to the next turn. Resets action trackers and moves to next combatant.

```typescript
getCombatResult(combat: CombatInstance): CombatResult | null
```

Get combat result when combat ends. Returns null if combat still active.

```typescript
getCombatSummary(combat: CombatInstance): string
```

Get combat status summary as string.

```typescript
applyDamage(combatant: Combatant, damage: number): number
```

Apply damage to a combatant.

```typescript
healCombatant(combatant: Combatant, healing: number): number
```

Heal a combatant.

```typescript
applyTemporaryHP(combatant: Combatant, tempHP: number): void
```

Apply temporary hit points.

```typescript
getLivingCombatants(combat: CombatInstance): Combatant[]
```

Get all living combatants.

```typescript
getDefeatedCombatants(combat: CombatInstance): Combatant[]
```

Get all defeated combatants.

### AttackResolver

**Source**: `src/core/combat/AttackResolver.ts`

Resolves D&D 5e attack rolls and damage.

#### Methods

```typescript
resolveAttack(attacker: Combatant, target: Combatant, attack: Attack): { attackRoll: AttackRoll; damageRoll?: DamageRoll; hpAfterDamage: number; description: string }
```

Resolve an attack against a target. Returns attack roll, damage roll, and HP after damage.

### SpellCaster

**Source**: `src/core/combat/SpellCaster.ts`

Handles spell casting in combat.

#### Methods

```typescript
castSpell(caster: Combatant, spell: Spell, targets: Combatant[]): { success: boolean; spellName: string; caster: Combatant; targets: Combatant[]; saveDC?: number; damage?: DamageRoll; effectsApplied: StatusEffect[]; spellSlotUsed: number; description: string }
```

Cast a spell at targets.

### InitiativeRoller

**Source**: `src/core/combat/InitiativeRoller.ts`

Handles initiative rolls for combat.

#### Methods

```typescript
rollInitiativeForAll(combatants: Combatant[]): { sortedCombatants: Combatant[] }
```

Roll initiative for all combatants and return sorted by initiative.

### DiceRoller

**Source**: `src/core/combat/DiceRoller.ts`

Utility for rolling dice.

#### Static Methods

```typescript
static roll(sides: number, count: number = 1): number[]
```

Roll dice.

```typescript
static d20(): number
```

Roll a d20.

```typescript
static rollDamage(diceFormula: string): DamageRoll
```

Roll damage from dice formula (e.g., "2d6+3").

---

## Utility Classes

### SeededRNG

**Source**: `src/utils/random.ts`

Seeded random number generator for deterministic character generation.

#### Constructor

```typescript
constructor(seed: string)
```

#### Methods

```typescript
random(): number
```

Generate random number between 0 and 1.

```typescript
range(min: number, max: number): number
```

Generate random number in range [min, max).

```typescript
pick<T>(array: T[]): T
```

Pick random element from array.

```typescript
shuffle<T>(array: T[]): T[]
```

Shuffle array deterministically.

---

## Constants

**Source**: `src/utils/constants.ts`

### ALL_RACES

Array of all 9 D&D races: `['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling']`

### ALL_CLASSES

Array of all 12 D&D classes: `['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']`

### XP_THRESHOLDS

D&D 5e XP thresholds for levels 1-20.

### PROFICIENCY_BONUS

Proficiency bonus by level: `{ 1: 2, 2: 2, ..., 4: 2, 5: 3, ..., }`

### RACE_DATA

Racial traits, bonuses, and speed for each race.

### CLASS_DATA

Class data including hit dice, saving throws, available skills, skill count, spellcasting info.

### SPELL_DATABASE

53 hardcoded spells for spellcasting classes.

---

## Cross-References

- **For quick overview**: See [SPEC.md](SPEC.md)
- **For usage examples**: See [USAGE_IN_OTHER_PROJECTS.md](USAGE_IN_OTHER_PROJECTS.md)
- **For implementation decisions**: See [DECISIONS.md](DECISIONS.md)
