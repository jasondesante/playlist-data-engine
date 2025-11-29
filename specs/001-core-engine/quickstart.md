# Quickstart: Core Data Engine

## Installation

```bash
npm install @audio-alchemist/core
```

## Basic Usage

### 1. Parse a Playlist

```typescript
import { PlaylistParser } from '@audio-alchemist/core';

const parser = new PlaylistParser();
const playlist = await parser.parse(rawJson);

console.log(`Loaded ${playlist.tracks.length} tracks`);
```

### 2. Analyze Audio

```typescript
import { AudioAnalyzer } from '@audio-alchemist/core';

const analyzer = new AudioAnalyzer();
const profile = await analyzer.extractSonicFingerprint(track.audio_url);

console.log('Bass:', profile.bass_dominance);
console.log('Mid:', profile.mid_dominance);
console.log('Treble:', profile.treble_dominance);
```

### 3. Extract Color Palette

```typescript
import { AudioAnalyzer } from '@audio-alchemist/core';

const analyzer = new AudioAnalyzer();
const profile = await analyzer.extractSonicFingerprint(
  track.audio_url,
  track.image_url,
  { includeColorPalette: true }
);

if (profile.colorPalette) {
  console.log('Primary color:', profile.colorPalette.primary);
  console.log('Secondary color:', profile.colorPalette.secondary);
}
```

### 4. Generate Character

```typescript
import { CharacterGenerator } from '@audio-alchemist/core';

const generator = new CharacterGenerator();
const character = generator.generate(track, profile, {
  mode: 'standard' // 'simple' | 'standard' | 'advanced' | 'full_dnd'
});

console.log(`${character.name} - Level ${character.level} ${character.race} ${character.character_class}`);
console.log('Ability Scores:', character.ability_scores);
```

## Advanced Usage

### 5. Full Character with Naming

```typescript
import { CharacterGenerator } from '@audio-alchemist/core';

const character = generator.generate(track, profile, {
  mode: 'full_dnd',
  allowClassSelection: true,
  allowRaceSelection: false
});

console.log(`Name: ${character.name}`);
console.log(`Title: ${character.title}`); // e.g., "Thumping Midnight City the Bard"
console.log(`Race: ${character.race}`);
console.log(`Class: ${character.character_class}`);
console.log(`Skills:`, character.skills);
console.log(`Spells:`, character.spells_known);
```

### 6. Environmental Sensors

```typescript
import { EnvironmentalSensors } from '@audio-alchemist/core';

const sensors = new EnvironmentalSensors({
  enableLocation: true,
  enableMotion: true,
  enableWeather: true,
  weatherApiKey: 'your_api_key'
});

// Request permissions
const permissions = await sensors.requestPermissions();
console.log('Granted sensors:', permissions);

// Get current context
const envContext = await sensors.getCurrentContext();
console.log('Activity:', envContext.motion?.activity_type);
console.log('Weather:', envContext.weather?.weather_type);
console.log('XP Modifier:', envContext.environmental_xp_modifier);
```

### 7. Gaming Platform Integration

```typescript
import { GamingPlatformSensors } from '@audio-alchemist/core';

const gamingSensors = new GamingPlatformSensors({
  steam: {
    apiKey: 'YOUR_STEAM_API_KEY',
    steamId: 'USER_STEAM_ID_64'
  },
  discord: {
    clientId: 'YOUR_DISCORD_CLIENT_ID',
    enableRichPresence: true
  }
});

// Start monitoring
await gamingSensors.startMonitoring((gamingContext) => {
  if (gamingContext.isActivelyGaming) {
    console.log('Playing:', gamingContext.currentGame?.name);
    const bonus = gamingSensors.calculateGamingBonus(gamingContext);
    console.log('XP Multiplier:', bonus);
  }
});
```

### 8. Character Progression

```typescript
import { 
  updateCharacterFromSession,
  processLevelUp 
} from '@audio-alchemist/core';

// Record listening session
const session: ListeningSession = {
  track_uuid: track.uuid,
  start_time: Date.now() - 300000, // 5 minutes ago
  end_time: Date.now(),
  duration_seconds: 300,
  base_xp_earned: 300,
  bonus_xp: 150, // From environmental/gaming bonuses
  environmental_context: envContext,
  gaming_context: gamingContext,
  total_xp_earned: 450
};

// Update character
const updatedCharacter = updateCharacterFromSession(character, session);

// Check for level up
if (updatedCharacter.level > character.level) {
  console.log('LEVEL UP!');
  const benefits = processLevelUp(updatedCharacter, updatedCharacter.level);
  console.log('New features:', benefits.newFeatures);
  console.log('HP increase:', benefits.hitPointIncrease);
}
```

### 9. Combat System (Optional)

```typescript
import { CombatEngine } from '@audio-alchemist/core';

const combat = new CombatEngine();

// Start combat
const encounter = combat.startCombat(
  [playerCharacter],
  [enemyCharacter],
  envContext // Optional environmental effects
);

// Roll initiative
const combatWithInitiative = combat.rollInitiative(encounter);

// Execute attack
const attackResult = combat.executeAttack(
  combatWithInitiative.combatants[0],
  combatWithInitiative.combatants[1],
  playerCharacter.attacks[0]
);

console.log('Hit:', attackResult.hit);
console.log('Damage:', attackResult.damage);
console.log('Critical:', attackResult.critical);
```

## Complete Example

```typescript
import {
  PlaylistParser,
  AudioAnalyzer,
  CharacterGenerator,
  EnvironmentalSensors,
  GamingPlatformSensors,
  updateCharacterFromSession
} from '@audio-alchemist/core';

async function main() {
  // 1. Parse playlist
  const parser = new PlaylistParser();
  const playlist = await parser.parse(arweaveTxId);
  
  // 2. Analyze first track
  const track = playlist.tracks[0];
  const analyzer = new AudioAnalyzer();
  const profile = await analyzer.extractSonicFingerprint(
    track.audio_url,
    track.image_url,
    { 
      includeAdvancedMetrics: true,
      includeColorPalette: true 
    }
  );
  
  // 3. Generate character
  const generator = new CharacterGenerator();
  const character = generator.generate(track, profile, {
    mode: 'full_dnd',
    startingLevel: 1
  });
  
  console.log(`Generated: ${character.name}`);
  console.log(`${character.race} ${character.character_class}`);
  console.log(`Colors: ${profile.colorPalette?.primary}`);
  
  // 4. Setup sensors (optional)
  const envSensors = new EnvironmentalSensors({
    enableLocation: true,
    enableMotion: true,
    enableWeather: true,
    weatherApiKey: process.env.WEATHER_API_KEY
  });
  
  const gamingSensors = new GamingPlatformSensors({
    steam: {
      apiKey: process.env.STEAM_API_KEY,
      steamId: process.env.STEAM_ID
    }
  });
  
  await envSensors.requestPermissions();
  await gamingSensors.startMonitoring();
  
  // 5. Simulate listening session
  const sessionStart = Date.now();
  // ... user listens to music ...
  const sessionEnd = Date.now();
  
  const envContext = await envSensors.getCurrentContext();
  const gamingContext = await gamingSensors.getCurrentContext();
  
  const session = {
    track_uuid: track.uuid,
    start_time: sessionStart,
    end_time: sessionEnd,
    duration_seconds: (sessionEnd - sessionStart) / 1000,
    base_xp_earned: 0,
    bonus_xp: 0,
    environmental_context: envContext,
    gaming_context: gamingContext,
    total_xp_earned: 0
  };
  
  // Calculate XP with bonuses
  const envModifier = envSensors.calculateXPModifier(envContext);
  const gamingModifier = gamingSensors.calculateGamingBonus(gamingContext);
  const totalModifier = Math.min(envModifier * gamingModifier, 3.0);
  
  session.base_xp_earned = session.duration_seconds;
  session.total_xp_earned = session.base_xp_earned * totalModifier;
  session.bonus_xp = session.total_xp_earned - session.base_xp_earned;
  
  // 6. Update character
  const updatedCharacter = updateCharacterFromSession(character, session);
  
  console.log(`XP: ${updatedCharacter.experience_points}`);
  console.log(`Level: ${updatedCharacter.level}`);
  console.log(`Total listening time: ${updatedCharacter.total_listening_time}s`);
}

main();
```

## Configuration Options

### CharacterGenerationOptions

```typescript
interface CharacterGenerationOptions {
  mode: 'simple' | 'standard' | 'advanced' | 'full_dnd';
  allowClassSelection?: boolean;
  allowRaceSelection?: boolean;
  allowAbilityScoreAdjustment?: boolean;
  environmentalContext?: EnvironmentalContext;
  startingLevel?: number;
  skillSelections?: Partial<SkillProficiencies>;
}
```

### SensorOptions

```typescript
interface SensorOptions {
  enableLocation?: boolean;
  enableMotion?: boolean;
  enableWeather?: boolean;
  enableLight?: boolean;
  weatherApiKey?: string;
}
```

### GamingPlatformConfig

```typescript
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
```

## Next Steps

- See [spec.md](spec.md) for detailed user stories and requirements
- See [plan.md](plan.md) for architecture and implementation strategy
- See [tasks.md](tasks.md) for detailed implementation tasks
- See [data-model.md](data-model.md) for complete type definitions
