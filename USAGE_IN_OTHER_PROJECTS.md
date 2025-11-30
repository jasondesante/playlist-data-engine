# Using Playlist Data Engine in Other Projects

Your Playlist Data Engine is now built and ready to use! Here are the recommended ways to use it in other projects on your local machine.

## Option 1: Using `file:` Path (Recommended for Development)

This is the most flexible option for local development and testing.

### Step 1: Note the absolute path
The absolute path to your built library is:
```
/Users/jasondesante/playlist-data-engine
```

### Step 2: In your other project's `package.json`

Add the library as a local dependency:

```json
{
  "dependencies": {
    "playlist-data-engine": "file:/Users/jasondesante/playlist-data-engine"
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
cd /Users/jasondesante/playlist-data-engine
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
cp -r /Users/jasondesante/playlist-data-engine/dist /path/to/your/project/vendor/playlist-data-engine
```

Then reference it in your project code directly.

---

## Usage Examples

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
tracker.startSession(character.name);

// ... user listens to a track for 300 seconds ...

const session = tracker.endSession();

// Calculate XP earned
const xpCalc = new XPCalculator();
const baseXP = xpCalc.calculateSessionXP(300);  // ~1 XP per second
session.xp_earned = baseXP;

// Apply session to character (handles level-ups)
const updater = new CharacterUpdater();
const updatedChar = updater.updateCharacterFromSession(character, session);

if (updatedChar.level > character.level) {
  console.log(`Level up! Now level ${updatedChar.level}`);
}

// Track track mastery
const mastery = new MasterySystem();
mastery.checkMastery(track.id, baseXP);
if (mastery.isJustMastered(track.id)) {
  console.log(`Track mastered! Bonus XP unlocked!`);
}
```

### Environmental Sensors

```typescript
import { EnvironmentalSensors } from 'playlist-data-engine';

// Initialize sensors with weather API key
const sensors = new EnvironmentalSensors(process.env.OPENWEATHERMAP_API_KEY);

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

### Advanced: Combining All Systems

```typescript
import {
  PlaylistParser,
  CharacterGenerator,
  AudioAnalyzer,
  EnvironmentalSensors,
  GamingPlatformSensors,
  SessionTracker,
  XPCalculator,
  CharacterUpdater
} from 'playlist-data-engine';

// Full pipeline: Parse → Analyze → Generate → Track → Level Up
const parser = new PlaylistParser();
const playlist = await parser.parse(playlistJSON);

for (const track of playlist.tracks) {
  // 1. Generate character from audio
  const analyzer = new AudioAnalyzer();
  const audio = await analyzer.extractSonicFingerprint(track.audio_url);
  let character = CharacterGenerator.generate(track.id, audio, track.title);

  // 2. Track listening session
  const tracker = new SessionTracker();
  tracker.startSession(character.name);
  // ... user listens ...
  const session = tracker.endSession();

  // 3. Get environmental context
  const sensors = new EnvironmentalSensors(process.env.OPENWEATHERMAP_API_KEY);
  const envContext = await sensors.updateSnapshot();
  const envMultiplier = sensors.calculateXPModifier();

  // 4. Get gaming context
  const gamingSensors = new GamingPlatformSensors({
    steam: { apiKey: process.env.STEAM_API_KEY, steamId: userSteamId }
  });
  const gamingContext = gamingSensors.getContext();
  const gamingMultiplier = gamingSensors.calculateGamingBonus();

  // 5. Calculate total XP
  const xpCalc = new XPCalculator();
  const baseXP = xpCalc.calculateSessionXP(session.duration_seconds);
  session.total_xp = baseXP * envMultiplier * gamingMultiplier;

  // 6. Update character with combined bonuses
  const updater = new CharacterUpdater();
  character = updater.updateCharacterFromSession(character, session);

  console.log(`${character.name} earned ${session.total_xp.toFixed(0)} XP`);
  console.log(`  Base: ${baseXP.toFixed(0)}, Env: ${envMultiplier.toFixed(2)}x, Gaming: ${gamingMultiplier.toFixed(2)}x`);
  if (character.level > 1) {
    console.log(`  LEVEL UP! Now level ${character.level}`);
  }
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
cd /Users/jasondesante/playlist-data-engine
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
cd /Users/jasondesante/playlist-data-engine
npm run build  # Rebuild distribution files
```

If using `file://` paths or `npm link`, the changes will automatically be available to your other project.

---

## Environment Variables

Some features require API keys:

```bash
# For environmental sensors (weather data)
export OPENWEATHERMAP_API_KEY="your_key_here"

# For Steam integration
export STEAM_API_KEY="your_key_here"

# For Discord integration
export DISCORD_CLIENT_ID="your_client_id"
```

---

## Troubleshooting

### Library changes not reflecting in my project

If using `file://` paths:
```bash
# Rebuild the library
cd /Users/jasondesante/playlist-data-engine
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
- `dist/playlist-data-engine.mjs` - ES module (177 KB, gzipped: 42.21 KB)
- `dist/playlist-data-engine.js` - CommonJS (113 KB, gzipped: 31.43 KB)
- Source types available in `src/index.ts`

You now have a fully functional, bundled library ready to use in other projects!

