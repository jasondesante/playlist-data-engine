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
- [Progression and XP Tracking](#progression-and-xp-tracking) - Track sessions, calculate XP, handle level-ups

### Advanced Examples
- [Combining All Systems](#combining-all-systems) - Full pipeline with environmental and gaming context

### Specific Features
- [Color Extraction and Character Naming](#color-extraction-and-character-naming) - Extract colors from artwork and generate RPG-style names
- [Advanced Character Features](#advanced-character-features) - Skills, spells, equipment, and appearance generation
- [Environmental Sensors](#environmental-sensors) - Get environmental context and XP modifiers
- [Gaming Platform Integration](#gaming-platform-integration) - Integrate Steam and Discord for gaming bonuses
- [Combat System](#combat-system) - Run turn-based D&D 5e combat

### Common Patterns
- [Deterministic Character Generation](#deterministic-character-generation) - How the same seed always produces the same character
- [Understanding XP Bonus Calculation](#understanding-xp-bonus-calculation) - How environmental and gaming modifiers combine
- [Manual Level-Up Processing](#manual-level-up-processing) - Handle level-ups programmatically

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
  track.title
);

console.log(`Generated: ${character.name}`);
console.log(`  Race: ${character.race}`);
console.log(`  Class: ${character.class}`);
console.log(`  STR: ${character.ability_scores.STR}, DEX: ${character.ability_scores.DEX}`);
```

### Progression and XP Tracking

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

  if (result.leveledUp) {
    console.log(`Level up! Now level ${result.newLevel}`);
  }

  // Check for track mastery
  if (result.masteredTrack) {
    console.log(`Track mastered! ${result.masteryBonusXP} bonus XP unlocked!`);
  }
}
```

---

## Specific Features

### Color Extraction and Character Naming

```typescript
import { ColorExtractor, NamingEngine } from 'playlist-data-engine';

// Extract color palette from track artwork
const colorExtractor = new ColorExtractor();
const palette = await colorExtractor.extractPalette(track.image_url);
console.log(`Primary color: ${palette.primary_color}`);
console.log(`Colors: ${palette.colors.join(', ')}`);
console.log(`Brightness: ${palette.brightness}, Saturation: ${palette.saturation}`);
console.log(`Is monochrome: ${palette.is_monochrome}`);

// Generate RPG-style character name from track metadata
const namingEngine = new NamingEngine();
const characterName = namingEngine.generateName(track, audioProfile);
console.log(`Character name: "${characterName}"`);
// Examples: "Sonic Midnight City the Bard", "Electric Dreams the Wizard", "Thumping Nexus of Daft Punk"
```

### Advanced Character Features

```typescript
import { SkillAssigner, SpellManager, EquipmentGenerator, AppearanceGenerator, SeededRNG } from 'playlist-data-engine';

const character = CharacterGenerator.generate(track.id, audioProfile, track.title);

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

// Generate starting equipment
const equipment = EquipmentGenerator.initializeEquipment(character.class);
console.log(`Weapons:`, equipment.weapons.map(w => `${w.name} x${w.quantity}${w.equipped ? ' (equipped)' : ''}`).join(', '));
console.log(`Armor:`, equipment.armor.map(a => `${a.name} x${a.quantity}${a.equipped ? ' (equipped)' : ''}`).join(', '));
console.log(`Items:`, equipment.items.map(i => `${i.name} x${i.quantity}`).join(', '));
console.log(`Total weight: ${equipment.totalWeight} lbs (${equipment.equippedWeight} lbs equipped)`);

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

### Environmental Sensors

```typescript
import { EnvironmentalSensors } from 'playlist-data-engine';

// Initialize sensors with weather API key
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);

// Request permissions
const permissions = await sensors.requestPermissions(['geolocation', 'motion', 'weather']);
console.log(`Permissions granted:`, permissions);

// Get current environmental context
const context = await sensors.updateSnapshot();

// Calculate XP modifier based on environment
const xpModifier = sensors.calculateXPModifier();
console.log(`Environmental bonus: ${xpModifier.toFixed(2)}x`);
// Examples:
// - Running in rain: 1.5x
// - Stationary indoors: 1.0x
// - Walking at night: 1.25x
// - High altitude + snow: 1.4x
```

### Gaming Platform Integration

```typescript
import { GamingPlatformSensors } from 'playlist-data-engine';

// Initialize with Steam and Discord
const gamingSensors = new GamingPlatformSensors({
  steam: {
    apiKey: process.env.STEAM_API_KEY,
    steamId: '123456789',
    pollInterval: 60000  // Check every 60 seconds
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID
  }
});

// Start monitoring
gamingSensors.startMonitoring((context) => {
  if (context.isActivelyGaming) {
    const bonus = gamingSensors.calculateGamingBonus();
    console.log(`Playing: ${context.currentGame?.name}, Bonus: ${bonus.toFixed(2)}x`);
    // Examples:
    // - Action game: 1.425x
    // - RPG game: 1.55x
    // - Multiplayer RPG: 1.8x
  }
});

// Stop monitoring when done
gamingSensors.stopMonitoring();
```

### Combat System

```typescript
import {
  CombatEngine,
  CharacterGenerator,
  AudioAnalyzer
} from 'playlist-data-engine';

// Initialize combat engine (optional configuration)
const combat = new CombatEngine({
  useEnvironment: true,    // Apply environmental bonuses
  useMusic: false,         // Apply music bonuses (requires audio context)
  tacticalMode: false,     // Enable advanced tactical rules
  maxTurnsBeforeDraw: 100  // Max turns before draw
});

// Generate player character from audio
const analyzer = new AudioAnalyzer();
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);
const playerCharacter = CharacterGenerator.generate(track.id, audioProfile, track.title);

// Create enemy characters (manually or from a database)
const enemy1 = { /* CharacterSheet */ };
const enemy2 = { /* CharacterSheet */ };

// Start combat - rolls initiative, establishes turn order
const combatInstance = combat.startCombat(
  [playerCharacter],  // Player characters
  [enemy1, enemy2],   // Enemies
  environmentalContext // Optional environmental modifiers
);

// Execute combat turns
while (combatInstance.isActive) {
  const current = combat.getCurrentCombatant(combatInstance);

  if (current.character.attacks && current.character.attacks.length > 0) {
    // Execute attack
    const attack = current.character.attacks[0];
    const target = combat.getLivingCombatants(combatInstance).find(c => c.id !== current.id);

    if (target) {
      const action = combat.executeAttack(combatInstance, current, target, attack);
      console.log(action.result.description);

      if (target.isDefeated) {
        console.log(`${target.character.name} has been defeated!`);
      }
    }
  }

  // Move to next turn
  combat.nextTurn(combatInstance);

  // Check if combat ended
  const result = combat.getCombatResult(combatInstance);
  if (result) {
    console.log(`Combat ended: ${result.description}`);
    console.log(`XP awarded: ${result.xpAwarded}`);
    console.log(`Rounds elapsed: ${result.roundsElapsed}`);
    break;
  }
}
```

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
  // 1. Generate character from audio
  const audio = await analyzer.extractSonicFingerprint(track.audio_url);
  let character = CharacterGenerator.generate(track.id, audio, track.title);

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

## Common Patterns

### Deterministic Character Generation

The same seed and audio profile always produces the same character:

```typescript
import { CharacterGenerator, AudioAnalyzer } from 'playlist-data-engine';

const seed = 'ethereum-0x123abc-1';
const audio = await analyzer.extractSonicFingerprint(track.audio_url);

// Generate the same character every time
const char1 = CharacterGenerator.generate(seed, audio, 'Test');
const char2 = CharacterGenerator.generate(seed, audio, 'Test');

console.log(char1.race === char2.race);  // true
console.log(char1.class === char2.class);  // true
console.log(JSON.stringify(char1) === JSON.stringify(char2));  // true

// Use this for caching characters in your app
const characterCache = new Map<string, CharacterSheet>();
if (!characterCache.has(track.id)) {
  characterCache.set(track.id, CharacterGenerator.generate(track.id, audio, track.title));
}
```

### Understanding XP Bonus Calculation

XP is calculated by combining multiple modifiers (capped at 3.0x total):

```typescript
import { XPCalculator } from 'playlist-data-engine';

const xpCalc = new XPCalculator();

// Base XP: 1 XP per second of listening
const baseXP = 300;  // 5 minutes = 300 seconds

// Environmental modifier examples:
// - Running: 1.5x
// - Walking: 1.2x
// - Night time: 1.25x
// - Extreme weather (rain/snow/storm): 1.4x
// - High altitude (≥2000m): 1.3x

// Gaming modifier examples:
// - Base gaming bonus: +0.25x
// - RPG game: +0.20x
// - Action/FPS: +0.15x
// - Multiplayer: +0.15x
// - Long session (4+ hours): up to +0.20x

// Total calculation (capped at 3.0x):
const envMultiplier = 1.5;   // Running
const gamingMultiplier = 1.55; // Playing RPG game
const totalModifier = Math.min(3.0, envMultiplier * gamingMultiplier);
const totalXP = Math.floor(baseXP * totalModifier);

console.log(`Base: ${baseXP} XP, Total: ${totalXP} XP (${totalModifier.toFixed(2)}x)`);
```

### Manual Level-Up Processing

For advanced use cases where you need to handle level-ups manually:

```typescript
import { LevelUpProcessor } from 'playlist-data-engine';

// Check if character has enough XP to level up
if (character.xp.current >= character.xp.next_level) {
  const newLevel = character.level + 1;

  // Process the level-up (returns benefits, doesn't apply them)
  const benefits = LevelUpProcessor.processLevelUp(character, newLevel);

  console.log(`Level up to ${benefits.newLevel}!`);
  console.log(`  HP increase: +${benefits.hitPointIncrease}`);
  console.log(`  New HP total: ${benefits.newHitPointsTotal}`);
  console.log(`  Proficiency bonus: ${benefits.newProficiencyBonus}`);

  if (benefits.abilityScoreIncrease) {
    console.log(`  ASI: +${benefits.abilityScoreIncrease.increase} ${benefits.abilityScoreIncrease.ability}`);
  }

  if (benefits.newSpellSlots) {
    console.log(`  New spell slots:`, benefits.newSpellSlots);
  }

  if (benefits.classFeatures) {
    console.log(`  New features:`, benefits.classFeatures);
  }

  // Apply the benefits to the character
  character = LevelUpProcessor.applyLevelUp(character, benefits);
}
```

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

### Generation
- `RaceSelector` - Select character races
- `ClassSuggester` - Suggest classes based on audio
- `AbilityScoreCalculator` - Calculate ability scores
- `SkillAssigner` - Assign skills and proficiencies
- `SpellManager` - Manage spells and casting
- `EquipmentGenerator` - Generate starting equipment
- `NamingEngine` - Generate character names
- `AppearanceGenerator` - Generate character appearance

### Progression
- `XPCalculator` - Calculate XP earned and thresholds
- `SessionTracker` - Track listening sessions
- `LevelUpProcessor` - Handle level-ups
- `MasterySystem` - Track track mastery
- `CharacterUpdater` - Apply sessions to characters

### Sensors
- `EnvironmentalSensors` - GPS, motion, weather, light integration
- `GamingPlatformSensors` - Steam and Discord integration
- `SteamAPIClient` - Steam API client
- `DiscordRPCClient` - Discord RPC client

### Combat (Optional)
- `CombatEngine` - Turn-based D&D 5e combat
- `InitiativeRoller` - Roll initiative
- `AttackResolver` - Resolve attack rolls
- `SpellCaster` - Cast spells in combat

### Types & Constants
All TypeScript types are exported, including:
- `CharacterSheet`, `AbilityScores`, `Skill`, `ProficiencyLevel`
- `Race`, `Class`, `Ability`
- `AudioProfile`, `ColorPalette`, `FrequencyBands`
- `EnvironmentalContext`, `GamingContext`, `ListeningSession`
- `RACE_DATA`, `CLASS_DATA`, `SPELL_DATABASE`, `XP_THRESHOLDS`, etc.

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

