# Using Playlist Data Engine in Other Projects

**For API details, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md)**

Your Playlist Data Engine is now built and ready to use! Here are the recommended ways to use it in other projects on your local machine.

## Option 1: Using `file:` Path (Recommended for Development)

This is the most flexible option for local development and testing.

### Step 1: Note the absolute path
Find the absolute path to your built library. For example:
```
/path/to/playlist-data-engine
```

### Step 2: In your other project's `package.json`

Add the library as a local dependency (replace `/path/to/playlist-data-engine` with your actual path):

```json
{
  "dependencies": {
    "playlist-data-engine": "file:///path/to/playlist-data-engine"
  }
}
```

### Step 3: Install it

```bash
cd /path/to/your/other/project
npm install
```

The library will be symlinked to your workspace, so any changes you make to the source will immediately reflect in your other project.

---

## Option 2: Using `npm link` (Alternative)

This creates a global symlink that you can use across multiple projects.

### Step 1: Create the global link

```bash
cd /path/to/playlist-data-engine
npm link
```

### Step 2: In your other project, link it

```bash
cd /path/to/your/other/project
npm link playlist-data-engine
```

The package will be available just like it was installed from npm.

---

## Option 3: Copy the `dist` Folder (Static)

If you want a completely isolated copy:

```bash
cp -r /path/to/playlist-data-engine/dist /path/to/your/project/vendor/playlist-data-engine
```

Then reference it in your project code directly.

---

## Usage Examples

### Basic Examples
- [Basic Playlist Parsing and Character Generation](#basic-playlist-parsing-and-character-generation) - Parse playlists, analyze audio, and generate characters
- [Earning XP from Listening to Music](#earning-xp-from-listening-to-music) - Track sessions, calculate XP, handle level-ups

### Advanced Examples
- [Combining All Systems](#combining-all-systems) - Full pipeline with environmental and gaming context

### Specific Features
- [Color Extraction and Character Naming](#color-extraction-and-character-naming) - Extract colors from artwork and generate RPG-style names
- [Advanced Character Features](#advanced-character-features) - Skills, spells, equipment, and appearance generation
- [Environmental Sensors](#environmental-sensors) - Get environmental context and XP modifiers
- [Gaming Platform Integration](#gaming-platform-integration) - Integrate Steam and Discord for gaming bonuses
- [Combat System](#combat-system) - Run turn-based D&D 5e combat
- [Equipment System](#equipment-system) - Custom equipment, properties, enchanting, and batch spawning

### Extensibility System
- [Custom Features and Skills](#custom-features-and-skills) - Create custom class features, racial traits, and skills
- [Custom Classes](#custom-classes) - Create entirely new classes or extend existing ones
- [Spawn Rate Control](#spawn-rate-control) - Control how often custom content appears

### Common Patterns
- [Deterministic Character Generation](#deterministic-character-generation) - How the same seed always produces the same character
- [Understanding XP Bonus Calculation](#understanding-xp-bonus-calculation) - How environmental and gaming modifiers combine
- [Manual Level-Up Processing](#manual-level-up-processing) - Handle level-ups programmatically
- [Hash Utilities and Deterministic Seeding](#hash-utilities-and-deterministic-seeding) - Generate deterministic seeds and random values
- [Validation Schemas](#validation-schemas) - Runtime type validation with Zod schemas


### Other Docs
Read about other subjects in their respective docs
- [Custom Classes and Races](docs/CUSTOM_CONTENT.md)
- [Equipment System](docs/EQUIPMENT_SYSTEM.md)
- [Extensibility Guide](docs/EXTENSIBILITY_GUIDE.md)
- [Prerequisites](docs/PREREQUISITES.md)
- [XP and Leveling](docs/XP_AND_STATS.md)

---

## Basic Examples

### Basic Playlist Parsing and Character Generation

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer
} from 'playlist-data-engine';

// Parse a playlist
const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistJSON);
console.log(`Loaded ${playlist.tracks.length} tracks`);

// Analyze first track's audio
const analyzer = new AudioAnalyzer();
const track = playlist.tracks[0];
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
console.log(`Bass: ${audioProfile.bass_dominance}, Mid: ${audioProfile.mid_dominance}, Treble: ${audioProfile.treble_dominance}`);

// Generate character deterministically from audio
const character = CharacterGenerator.generate(
  track.id,  // Deterministic seed
  audioProfile,
  track  // Track metadata for automatic name generation
);

console.log(`Generated: ${character.name}`);
console.log(`  Race: ${character.race}`);
console.log(`  Class: ${character.class}`);
console.log(`  STR: ${character.ability_scores.STR}, DEX: ${character.ability_scores.DEX}`);
```

### Earning XP from Listening to Music

This is the core workflow: track a listening session, calculate XP earned, and apply it to your character. Level-ups happen automatically when XP thresholds are reached.

```typescript
import {
  SessionTracker,
  XPCalculator,
  CharacterUpdater,
  MasterySystem
} from 'playlist-data-engine';

// Track listening sessions
const tracker = new SessionTracker();

// Start a session - returns a sessionId (required for ending the session)
const sessionId = tracker.startSession(track.id, track);

// ... user listens to a track for 300 seconds ...

// End the session - requires the sessionId returned from startSession()
const session = tracker.endSession(sessionId);

if (session) {
  // Calculate XP earned
  const xpCalc = new XPCalculator();
  const totalXP = xpCalc.calculateSessionXP(session, track);  // ~1 XP per second + bonuses

  // Apply session to character (handles level-ups and mastery)
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  // ===== BASIC LEVEL-UP HANDLING =====
  if (result.leveledUp) {
    console.log(`Level up! Now level ${result.newLevel}`);
  }

  // Check for track mastery
  if (result.masteredTrack) {
    console.log(`Track mastered! ${result.masteryBonusXP} bonus XP unlocked!`);
  }
}
```

**Note**: By default, `CharacterUpdater` uses automatic stat increases (`dnD5e_smart` strategy). Stats are intelligently selected based on the character's class and current stats - **no manual intervention required**. This ensures the simple example above works perfectly, with stats increasing automatically on level-up (at levels 4, 8, 12, 16, 19).

To use manual D&D 5e rules (player must choose stats), pass a custom `StatManager`:

```typescript
import { StatManager } from 'playlist-data-engine';

const statManager = new StatManager({ strategy: 'dnD5e' });
const updater = new CharacterUpdater(statManager);
```


## Specific Features

### Color Extraction 

```typescript
import { ColorExtractor } from 'playlist-data-engine';

// Extract color palette from track artwork
const colorExtractor = new ColorExtractor();
const palette = await colorExtractor.extractPalette(track.image_url);
console.log(`Primary color: ${palette.primary_color}`);
console.log(`Colors: ${palette.colors.join(', ')}`);
console.log(`Brightness: ${palette.brightness}, Saturation: ${palette.saturation}`);
console.log(`Is monochrome: ${palette.is_monochrome}`);

```

### Character Naming

Character names are automatically generated by `CharacterGenerator` using track metadata (title, artist, genre) combined with audio characteristics and character class. Names use 7 different naming formats with fantasy-inspired patterns.

```typescript
import { CharacterGenerator } from 'playlist-data-engine';

// Names are generated automatically - no need to provide a name parameter
const character = CharacterGenerator.generate(track.id, audioProfile, track);
console.log(`Generated name: "${character.name}"`);

// By default, names are deterministic
const char1 = CharacterGenerator.generate(track.id, audioProfile, track);
const char2 = CharacterGenerator.generate(track.id, audioProfile, track);
// char1.name === char2.name (always the same)

// Optional: Non-deterministic names (same seed = different name every time)
const char3 = CharacterGenerator.generate(track.id, audioProfile, track, { deterministicName: false });
const char4 = CharacterGenerator.generate(track.id, audioProfile, track, { deterministicName: false });
// char3.name !== char4.name (always different)

// Optional: Override automatic name generation with custom name
const char5 = CharacterGenerator.generate(track.id, audioProfile, track, { forceName: 'Gandalf the Grey' });
console.log(char5.name); // "Gandalf the Grey"

// Advanced: Manually regenerate names using NamingEngine
import { NamingEngine } from 'playlist-data-engine';

const namingEngine = new NamingEngine();
const newName = namingEngine.generateName(
  track.id,           // seed
  track,              // track metadata
  audioProfile,       // audio characteristics
  character.class,    // character class
  true                // deterministic (optional, default: false)
);

// Update character with new name
character.name = newName;
console.log(`Renamed to: "${character.name}"`);
```


### Deterministic Character Generation

The same seed and audio profile always produces the same character:

```typescript
import { CharacterGenerator, AudioAnalyzer, type CharacterSheet } from 'playlist-data-engine';

const seed = 'ethereum-0x123abc-1';
const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);

// Generate the same character every time (same inputs = same output)
const char1 = CharacterGenerator.generate(seed, audio, track);
const char2 = CharacterGenerator.generate(seed, audio, track);

// Game mode affects the output, so different game modes = different characters
const standardChar = CharacterGenerator.generate(seed, audio, track, { gameMode: 'standard' });
const uncappedChar = CharacterGenerator.generate(seed, audio, track, { gameMode: 'uncapped' });

console.log(char1.race === char2.race);  // true
console.log(char1.class === char2.class);  // true
console.log(JSON.stringify(char1) === JSON.stringify(char2));  // true

// Use this for caching characters in your app
const characterCache = new Map<string, CharacterSheet>();
if (!characterCache.has(track.id)) {
  characterCache.set(track.id, CharacterGenerator.generate(track.id, audio, track));
}
```



### Advanced Character Features

```typescript
import { SkillAssigner, SpellManager, EquipmentGenerator, AppearanceGenerator, SeededRNG } from 'playlist-data-engine';

const character = CharacterGenerator.generate(track.id, audioProfile, track);

// Assign skills based on class (returns Record<Skill, ProficiencyLevel>)
const rng = new SeededRNG(track.id);
const skills = SkillAssigner.assignSkills(character.class, rng);
console.log(`Proficient in:`, Object.entries(skills)
  .filter(([_, level]) => level !== 'none')
  .map(([skill, level]) => `${skill} (${level})`)
  .join(', '));
// Example: "athletics (proficient), perception (expertise), stealth (proficient)"

// Generate spells for spellcasters
if (SpellManager.isSpellcaster(character.class)) {
  // Initialize complete spell configuration (slots, known spells, cantrips)
  const spellConfig = SpellManager.initializeSpells(character.class, character.level);

  console.log(`Cantrips: ${spellConfig.cantrips.join(', ')}`);
  console.log(`Known spells: ${spellConfig.known_spells.join(', ')}`);
  console.log(`Spell slots:`, spellConfig.spell_slots);

  // Or get individual components
  const spellSlots = SpellManager.getSpellSlots(character.class, character.level);
  const cantrips = SpellManager.getCantrips(character.class);
  const knownSpells = SpellManager.getKnownSpells(character.class, character.level);
}
// For info on custom spells, see [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md)

// Generate starting equipment
const equipment = EquipmentGenerator.initializeEquipment(character.class);
console.log(`Weapons:`, equipment.weapons.map(w => `${w.name} x${w.quantity}${w.equipped ? ' (equipped)' : ''}`).join(', '));
console.log(`Armor:`, equipment.armor.map(a => `${a.name} x${a.quantity}${a.equipped ? ' (equipped)' : ''}`).join(', '));
console.log(`Items:`, equipment.items.map(i => `${i.name} x${i.quantity}`).join(', '));
console.log(`Total weight: ${equipment.totalWeight} lbs (${equipment.equippedWeight} lbs equipped)`);
// For info on custom equipment, see [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md)

// Generate appearance from seed, class, and audio profile
const appearance = AppearanceGenerator.generate(track.id, character.class, audioProfile);
console.log(`Body type: ${appearance.body_type}`);
console.log(`Hair: ${appearance.hair_color} ${appearance.hair_style}`);
console.log(`Eyes: ${appearance.eye_color}`);
console.log(`Skin tone: ${appearance.skin_tone}`);
console.log(`Facial features: ${appearance.facial_features.join(', ')}`);
if (appearance.aura_color) {
  console.log(`Magical aura: ${appearance.aura_color}`);
}
```



### Stat Strategies

**For detailed documentation, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**

### XP Scaling

**For detailed documentation, see [XP_AND_STATS.md](docs/XP_AND_STATS.md)**


### Environmental Sensors

**For detailed documentation, see [IRL_SENSORS.md](docs/IRL_SENSORS.md)**

### Gaming Platform Integration

**For detailed documentation, see [IRL_SENSORS.md](docs/IRL_SENSORS.md)**


### Combat System

**For detailed documentation, see [COMBAT_SYSTEM.md](docs/COMBAT_SYSTEM.md)**


---

## Advanced Examples

### Combining All Systems

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer,
  EnvironmentalSensors,
  GamingPlatformSensors,
  SessionTracker,
  CharacterUpdater
} from 'playlist-data-engine';

// Full pipeline: Parse → Analyze → Generate → Track → Level Up

// Initialize components ONCE (outside the loop)
const parser = new PlaylistParser();
const analyzer = new AudioAnalyzer();
const tracker = new SessionTracker();  // Single tracker maintains session history
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
const gamingSensors = new GamingPlatformSensors({
  steam: { apiKey: process.env.STEAM_API_KEY, steamId: process.env.STEAM_USER_ID }
});

const playlist = await parser.parse(playlistJSON);

for (const track of playlist.tracks) {
  // 1. Generate character from audio (choose game mode at creation time)
  const audio = await analyzer.extractSonicFingerprint(track.audio_url);
  let character = CharacterGenerator.generate(
    track.id,
    audio,
    track,
    { gameMode: 'standard' }  // or 'uncapped' for epic progression
  );

  // 2. Get environmental context (before starting session)
  const envContext = await sensors.updateSnapshot();

  // 3. Get gaming context (before starting session)
  const gamingContext = gamingSensors.getContext();

  // 4. Track listening session WITH context from the start
  const sessionId = tracker.startSession(track.id, track, {
    environmental_context: envContext,
    gaming_context: gamingContext
  });

  // ... user listens to the track ...

  // 5. End session (XP is calculated automatically with context)
  const session = tracker.endSession(sessionId);
  if (!session) continue;

  // 6. Update character with session results
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  character = result.character;

  console.log(`${character.name} earned ${result.xpEarned} XP`);
  console.log(`  Total: ${result.xpEarned}, Mastery Bonus: ${result.masteryBonusXP}`);
  if (result.leveledUp) {
    console.log(`  LEVEL UP! Now level ${result.newLevel}`);
  }
}
```


---

## Extensibility System

**For detailed extensibility documentation, see [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md)**

The extensibility system allows you to add custom content at runtime, including spells, equipment, races, classes, features, skills, and appearance options.

### Registering Custom Equipment

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Add custom equipment
manager.register('equipment', [
    { name: 'Dragon Sword', type: 'weapon', rarity: 'rare', weight: 5 },
    { name: 'Mithral Armor', type: 'armor', rarity: 'very_rare', weight: 10 }
], {
    weights: { 'Dragon Sword': 0.5 }  // Half as common
});
```

### Registering Custom Spells

```typescript
manager.register('spells', [
    {
        name: 'Phoenix Fire',
        level: 5,
        school: 'Evocation',
        casting_time: '1 action',
        range: '60 feet',
        duration: 'Instantaneous',
        components: ['V', 'S'],
        description: 'A burst of flame...'
    }
]);
```

### Spawn Rate Control

```typescript
// Control spawn rates with weights
manager.setWeights('equipment', {
    'Dragon Sword': 0.5,   // Rare
    'Mithral Armor': 1.0   // Normal
});
```


See [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md) for:
- Custom features, and spawn rates
- Export/import functionality
- Content pack creation

**For detailed guides on specific topics:**
- [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md) - Custom races, subraces, and classes
- [docs/PREREQUISITES.md](docs/PREREQUISITES.md) - Complete guide to skill, spell, and feature prerequisites
- [docs/EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md) - Complete guide to equipment properties and modifications
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference


---


## Equipment System

The playlist-data-engine includes a comprehensive equipment system with custom items, properties, enchanting, and batch spawning.

**For complete documentation, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)**

### Registering, Spawning, and Enchanting Custom Equipment

**For more examples including conditional properties, inline features, spell granting, and templates, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)**

---

## Validation Schemas

The library exports Zod validation schemas for runtime type validation of playlist, audio, and character data. Use these to validate external data before processing or to ensure API responses match expected formats.

```typescript
import {
  PlaylistTrackSchema,
  ServerlessPlaylistSchema,
  AudioProfileSchema,
  AbilityScoresSchema,
  CharacterSheetSchema
} from 'playlist-data-engine';

// Validate a playlist track from an external API
const externalTrackData = {
  id: 'track-123',
  uuid: '550e8400-e29b-41d4-a716-446655440000',
  playlist_index: 0,
  chain_name: 'ethereum',
  token_address: '0x123abc...',
  token_id: '42',
  platform: 'spotify',
  title: 'Epic Battle Music',
  artist: 'Composer Name',
  image_url: 'https://example.com/image.jpg',
  audio_url: 'https://example.com/audio.mp3',
  duration: 240,
  genre: 'Soundtrack',
  tags: ['epic', 'battle', 'orchestral']
};

const trackResult = PlaylistTrackSchema.safeParse(externalTrackData);
if (!trackResult.success) {
  console.error('Invalid track data:', trackResult.error.format());
} else {
  console.log('Track is valid:', trackResult.data);
}
```

**Validating Character Data**

```typescript
import { CharacterSheetSchema, AbilityScoresSchema } from 'playlist-data-engine';

// Validate ability scores
const scoresInput = { STR: 16, DEX: 14, CON: 15, INT: 10, WIS: 12, CHA: 8 };
const scoresResult = AbilityScoresSchema.safeParse(scoresInput);

if (!scoresResult.success) {
  console.error('Invalid ability scores:', scoresResult.error.issues);
  // Example error: "Number must be less than or equal to 20" or "Number must be greater than or equal to 1"
}

// Validate complete character sheet
const characterInput = {
  name: 'Aragorn',
  race: 'Human',
  class: 'Ranger',
  level: 10,
  ability_scores: { STR: 16, DEX: 14, CON: 15, INT: 10, WIS: 14, CHA: 12 },
  ability_modifiers: { STR: 3, DEX: 2, CON: 2, INT: 0, WIS: 2, CHA: 1 },
  proficiency_bonus: 4,
  hp: { current: 87, max: 87, temp: 0 },
  armor_class: 16,
  initiative: 6,
  speed: 30,
  skills: { 'Stealth': 'proficient', 'Survival': 'expertise', 'Nature': 'proficient' },
  saving_throws: { 'Strength': true, 'Dexterity': true },
  racial_traits: ['Extra Language', 'Versatile'],
  class_features: ['Favored Enemy', 'Natural Explorer'],
  equipment: {
    weapons: ['Longbow', 'Longsword'],
    armor: ['Leather Armor'],
    items: ['Rope', 'Torches']
  },
  xp: { current: 65000, next_level: 85000 },
  seed: 'character-seed-123',
  generated_at: new Date().toISOString()
};

const charResult = CharacterSheetSchema.safeParse(characterInput);
if (!charResult.success) {
  console.error('Invalid character:', charResult.error.format());
} else {
  console.log('Character is valid!');
}
```

**Validating Audio Analysis Results**

```typescript
import { AudioProfileSchema } from 'playlist-data-engine';

const audioProfile = {
  bass_dominance: 0.6,
  mid_dominance: 0.3,
  treble_dominance: 0.1,
  average_amplitude: 0.7,
  spectral_centroid: 2500,
  spectral_rolloff: 8000,
  zero_crossing_rate: 0.05,
  analysis_metadata: {
    duration_analyzed: 30,
    full_buffer_analyzed: true,
    sample_positions: [0, 5, 10, 15, 20, 25],
    analyzed_at: new Date().toISOString()
  }
};

const audioResult = AudioProfileSchema.safeParse(audioProfile);
if (!audioResult.success) {
  console.error('Invalid audio profile:', audioResult.error.issues);
}
```

**Note**: Zod schemas are useful for:
- Validating external API responses before processing
- Runtime type checking in user-facing applications
- Ensuring data integrity when storing/retrieving from databases
- Form validation in web applications
- Type guard functions with `schema.safeParse()`

---



## Available Exports

The main exports from the library are:

### Core Functionality
- `PlaylistParser` - Parse playlist JSON
- `MetadataExtractor` - Extract metadata from track objects
- `AudioAnalyzer` - Analyze audio frequency characteristics
- `SpectrumScanner` - Analyze frequency bands
- `ColorExtractor` - Extract color palettes from images
- `CharacterGenerator` - Generate D&D 5e characters deterministically

### Extensibility (NEW)
- `ExtensionManager` - Register and manage custom content for all categories (single source of truth)
- `FeatureQuery` - Query custom class features and racial traits (registration is done via ExtensionManager)
- `SkillQuery` - Query custom skills (registration is done via ExtensionManager)
- `SpellQuery` - Query spells with prerequisite validation (registration is done via ExtensionManager)
- `FeatureValidator` - Validate feature data structures
- `SkillValidator` - Validate skill data structures
- `SpellValidator` - Validate spell data structures
- `FeatureEffectApplier` - Apply feature effects to characters
- `WeightedSelector` - Weighted random selection with multiple modes
- `ensureAllDefaultsInitialized()` - Initialize all default data

### Generation
- `RaceSelector` - Select character races
- `ClassSuggester` - Suggest classes based on audio
- `AbilityScoreCalculator` - Calculate ability scores
- `SkillAssigner` - Assign skills and proficiencies
- `SpellManager` - Manage spells and casting
- `EquipmentGenerator` - Generate starting equipment and manage inventory
- `EquipmentEffectApplier` - Apply/remove equipment effects when equipping/unequipping
- `EquipmentModifier` - Enchant, curse, upgrade, and modify equipment
- `EquipmentSpawnHelper` - Batch spawn equipment by rarity, tags, or templates
- `Enchantment Library (NEW)` - Predefined enchantments and curses for equipment
- `Magic Item Examples (NEW)` - 38 pre-built magic items and equipment templates
- `NamingEngine` - Generate character names
- `AppearanceGenerator` - Generate character appearance

### Progression
- `XPCalculator` - Calculate XP earned and thresholds
- `SessionTracker` - Track listening sessions
- `LevelUpProcessor` - Handle level-ups
- `MasterySystem` - Track track mastery
- `CharacterUpdater` - Apply sessions to characters
- `StatManager` - **NEW** - Manage stat increases (level-up, potions, custom formulas)

### Stat Increase Strategies
- `DnD5eStandardStrategy` - Default D&D 5e (manual selection)
- `DnD5eSmartStrategy` - Intelligent auto-selection
- `BalancedStrategy` - +1 to two lowest stats
- `PrimaryOnlyStrategy` - Always boosts class primary
- `RandomStrategy` - Random stat selection
- `ManualStrategy` - Pure manual mode (always defers to `applyPendingStatIncrease()`)
- `createStatIncreaseStrategy` - Factory function for creating strategies

### Sensors
- `EnvironmentalSensors` - GPS, motion, weather, light integration
- `GamingPlatformSensors` - Steam and Discord integration

> **Note**: `SteamAPIClient` and `DiscordRPCClient` are internal implementation classes used by `GamingPlatformSensors`. They are not exported as part of the public API.

### Combat (Optional)
- `CombatEngine` - Turn-based D&D 5e combat
- `InitiativeRoller` - Roll initiative
- `AttackResolver` - Resolve attack rolls
- `SpellCaster` - Cast spells in combat
- `DiceRoller` - Standalone dice rolling utilities (rollDie, rollD20, parseDiceFormula, rollWithAdvantage, calculateDamage, etc.)

### Types & Constants
All TypeScript types are exported, including:
- `CharacterSheet`, `AbilityScores`, `Skill`, `ProficiencyLevel`
- `Race`, `Class`, `Ability`, `GameMode` - `'standard'` or `'uncapped'` progression mode
- `CharacterGeneratorOptions` - Includes `gameMode` option
- `AudioProfile`, `ColorPalette`, `FrequencyBands`
- `EnvironmentalContext`, `GamingContext`, `ListeningSession`
- `RACE_DATA`, `CLASS_DATA`, `SPELL_DATABASE`, `XP_THRESHOLDS`, etc.

**Stat Increase Types (NEW):**
- `StatIncreaseConfig` - Configuration for stat increase behavior
- `StatIncreaseResult` - Result from stat operations with full change details
- `StatIncreaseStrategy` - Strategy interface for custom formulas
- `StatIncreaseOptions` - Options for stat selection (forced, excluded, etc.)
- `StatIncreaseStrategyType` - Built-in strategy names ('dnD5e', 'dnD5e_smart', etc.)
- `StatIncreaseFunction` - Simple function type for custom formulas

**Extensibility Types (NEW):**
- `ClassFeature` - Custom class feature definition with prerequisites and effects
- `RacialTrait` - Custom racial trait definition
- `CustomSkill` - Custom skill definition
- `FeatureEffect` - Effect types (stat_bonus, skill_proficiency, ability_unlock, passive_modifier, resource_grant, spell_slot_bonus)
- `FeaturePrerequisite` - Prerequisites for class features and racial traits (level, abilities, class, race, skills, spells, subrace, feature chains)
- `SkillPrerequisite` - Prerequisites for learning custom skills (level, abilities, class, race, skills, features, spells)
- `SpellPrerequisite` - Prerequisites for learning spells (level, caster level, abilities, class, features, spells, skills)
- `ValidationResult` - Standard validation result for all prerequisite validation (valid, unmet, errors)
- `ExtensionCategory` - All extensible categories (classFeatures, racialTraits, skills, equipment, appearance, etc.)

**For detailed prerequisite documentation, see [PREREQUISITES.md](docs/PREREQUISITES.md)**

**Equipment System Types (NEW):**
- `EnhancedEquipment` - **Primary equipment type** - Full equipment definition with properties, features, skills, spells. Use this for type-safe equipment data with discriminated unions for EquipmentType, EquipmentRarity, EquipmentPropertyType, and EquipmentCondition
- `Equipment` - **Legacy/base equipment type** from constants.ts with looser typing. Structurally similar to EnhancedEquipment but uses string literals instead of type unions. Kept for backward compatibility with internal code. Prefer `EnhancedEquipment` for new code
- `InventoryItem` - Minimal inventory interface with name, quantity, and equipped properties. Used for simple inventory operations
- `EquipmentProperty` - Individual equipment property (stat_bonus, skill_proficiency, ability_unlock, passive_modifier, special_property, damage_bonus, stat_requirement)
- `EquipmentCondition` - Property conditions (vs_creature_type, at_time_of_day, wielder_race, wielder_class, while_equipped, on_hit, on_damage_taken, custom)
- `EquipmentModification` - Runtime enchantment, curse, or upgrade
- `EnhancedInventoryItem` - Inventory item with per-instance modifications (modifications, templateId, instanceId)
- `EquipmentMiniFeature` - Inline equipment-specific feature definition
- `SpawnRandomOptions` - Options for random equipment spawning
- `TreasureHoardResult` - Treasure hoard with items and estimated value

### Utilities
- `generateSeed` - Generate deterministic seeds from blockchain data (chainName, tokenAddress, tokenId)
- `hashSeedToFloat` - Hash seed to float in 0.0-1.0 range
- `hashSeedToInt` - Hash seed to integer in range [min, max)
- `deriveSeed` - Derive new seed from base seed with suffix
- `SeededRNG` - Deterministic random number generator (random, randomInt, randomChoice, weightedChoice, shuffle)

**Logger (NEW)**
- `Logger` - Centralized logging utility with configurable log levels
- `createLogger` - Convenience function to create a logger instance
- `LogLevel` - Log level enum (DEBUG, INFO, WARN, ERROR, NONE)
- `LogEntry` - Log entry structure type
- `LoggerConfig` - Logger configuration options type

**Sensor Dashboard (NEW)**
- `SensorDashboard` - Diagnostic dashboard for visualizing sensor status in console
- `displayEnvironmentalDiagnostics()` - Display environmental sensor diagnostics
- `displayGamingDiagnostics()` - Display gaming platform sensor diagnostics
- `displaySystemDashboard()` - Display combined system dashboard
- `DashboardConfig` - Dashboard configuration options type

**Validation Schemas**
- `PlaylistTrackSchema` - Zod schema for validating playlist track metadata
- `ServerlessPlaylistSchema` - Zod schema for validating full playlist structure
- `AudioProfileSchema` - Zod schema for validating audio analysis results
- `AbilityScoresSchema` - Zod schema for validating character ability scores
- `CharacterSheetSchema` - Zod schema for validating complete character sheets

**Configuration (NEW)**
- `DEFAULT_SENSOR_CONFIG` - Default sensor configuration values
- `loadConfigFromEnv()` - Load sensor config from environment variables
- `mergeConfig(userConfig?)` - Merge sensor config with defaults
- `DEFAULT_PROGRESSION_CONFIG` - Default D&D 5e progression values
- `mergeProgressionConfig(userConfig?)` - Merge progression config with defaults
- `type SensorConfig` - Sensor configuration interface
- `type ProgressionConfig` - Progression configuration interface

---

## Development Workflow

When working on both projects simultaneously:

```bash
# Terminal 1: In playlist-data-engine directory
cd /path/to/playlist-data-engine
npm run dev  # Watch mode (optional)

# Terminal 2: In your other project
cd /path/to/your/other/project
npm install  # Links to the library

# Any changes in playlist-data-engine/src will be available in your project
# if using the file:// path or npm link
```

---

## Rebuilding After Changes

After making changes to the engine source code:

```bash
cd /path/to/playlist-data-engine
npm run build  # Rebuild distribution files
```

If using `file://` paths or `npm link`, the changes will automatically be available to your other project.

---

## Environment Variables

Some features require API keys:

```bash
# For environmental sensors (weather data)
export WEATHER_API_KEY="your_openweathermap_api_key_here"

# For Steam integration
export STEAM_API_KEY="your_steam_api_key_here"
export STEAM_USER_ID="your_64bit_steam_id_here"

# For Discord integration
export DISCORD_CLIENT_ID="your_discord_client_id_here"

# Optional: Override maximum XP modifier (default: 3.0)
# Set to 1.0 to disable all environmental/gaming bonuses
export XP_MAX_MODIFIER="3.0"
```

All environment variables are optional. The system will use sensible defaults if not provided. For complete configuration options, see `.env.example` in the project root.

---

## Troubleshooting

### Library changes not reflecting in my project

If using `file://` paths:
```bash
# Rebuild the library
cd /path/to/playlist-data-engine
npm run build

# Clear node_modules cache in your project
cd /path/to/your/project
rm -rf node_modules/.bin/playlist-data-engine
```

If using `npm link`, it should be instant.

### TypeScript errors about types

Make sure your project's `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### Audio analysis not working

The AudioAnalyzer uses the Web Audio API, which requires either:
1. A browser environment
2. Mocked Web Audio API (for Node.js testing)
3. A polyfill like `web-audio-api` npm package

---

## Building Status

✅ Library successfully built!
- `dist/playlist-data-engine.mjs` - ES module (330 KB)
- `dist/playlist-data-engine.js` - CommonJS (205 KB)
- Type definitions available in `dist/index.d.ts`

You now have a fully functional, bundled library ready to use in other projects!

