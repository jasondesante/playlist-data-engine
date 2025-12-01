# Quickstart: Playlist Data Engine

Get up and running in 5 minutes. For comprehensive documentation, see [README.md](README.md).

## Installation

```bash
npm install
npm test  # Verify setup (373 tests should pass)
```

## 30-Second Example

```typescript
import { PlaylistParser, AudioAnalyzer, CharacterGenerator } from './src/index.js';

const parser = new PlaylistParser();
const playlist = await parser.parse(rawJSON);
const track = playlist.tracks[0];

const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);

const character = CharacterGenerator.generate(track.id, audio, track.title);
console.log(`${character.race} ${character.class} with ${character.ability_scores.strength} STR`);
```

## Phase by Phase Quick Examples

### Phase 0: Parse & Generate

```typescript
// Parse playlist
const parser = new PlaylistParser();
const playlist = await parser.parse(rawPlaylistData);

// Analyze audio
const analyzer = new AudioAnalyzer({ includeAdvancedMetrics: true });
const profile = await analyzer.extractSonicFingerprint(track.audio_url);
// profile.bass_dominance, profile.mid_dominance, profile.treble_dominance

// Generate character (deterministic from seed)
const char = CharacterGenerator.generate(track.id, profile, 'My Character');
// char.race, char.class, char.ability_scores.*, char.hp.max
```

### Phase 1: Visual & Naming

```typescript
import { ColorExtractor, NamingEngine } from './src/index.js';

// Extract colors from artwork
const colors = new ColorExtractor();
const palette = await colors.extractColors(track.image_url);
// palette.dominant_colors, palette.is_monochrome, palette.brightness

// Generate RPG-style names
const naming = new NamingEngine();
const name = naming.generateName(track.title, track.artist, profile, 'Wizard');
// Examples: "Sonic Midnight City", "Thumping Nexus", "Midnight City of Daft Punk"
```

### Phase 2: Skills, Spells, Equipment

```typescript
import { SkillAssigner, SpellManager, EquipmentGenerator, AppearanceGenerator } from './src/index.js';

// Assign skills
const skills = new SkillAssigner();
char.skills = skills.assignSkills(char);

// Add spells (if spellcaster)
const spellMgr = new SpellManager();
if (spellMgr.isSpellcaster(char.class)) {
  char.spells = spellMgr.generateSpells(char);
  char.spell_slots = spellMgr.generateSpellSlots(char);
}

// Generate equipment
const equipment = new EquipmentGenerator();
char.inventory = equipment.generateStartingEquipment(char);

// Generate appearance
const appearance = new AppearanceGenerator();
char.appearance = appearance.generateAppearance(profile, palette);
```

### Phase 3: Progression & Leveling

```typescript
import { SessionTracker, XPCalculator, CharacterUpdater, MasterySystem } from './src/index.js';

// Track listening session
const tracker = new SessionTracker();
tracker.startSession(char.name);
// ... user listens to track ...
const session = tracker.endSession();

// Calculate XP
const xpCalc = new XPCalculator();
const baseXP = xpCalc.calculateSessionXP(session.duration_seconds);

// Apply to character (handles level ups)
const updater = new CharacterUpdater();
char = updater.applyListeningSession(char, { ...session, xp_earned: baseXP });

// Track mastery (bonus after 10 playthroughs)
const mastery = new MasterySystem();
mastery.recordPlaythrough(track.id, baseXP);
if (mastery.isTrackMastered(track.id)) {
  console.log('Track mastered! +bonus XP next listen');
}
```

### Phase 4: Environmental Sensors

```typescript
import { EnvironmentalSensors } from './src/index.js';

// Request permissions
const sensors = new EnvironmentalSensors({
  enableLocation: true,
  enableMotion: true,
  enableWeather: true,
  weatherApiKey: process.env.WEATHER_API_KEY
});

const perms = await sensors.requestPermissions();
// perms.location, perms.motion, perms.weather, perms.light

// Get current context
const context = await sensors.getCurrentContext();
// context.location, context.motion, context.weather, context.light

// Calculate XP multiplier
const multiplier = sensors.calculateXPModifier(context);
session.environmental_multiplier = multiplier;  // e.g., 1.5x for running
```

### Phase 5: Gaming Platform Integration

```typescript
import { GamingPlatformSensors } from './src/index.js';

// Configure
const gaming = new GamingPlatformSensors({
  steam: {
    apiKey: process.env.STEAM_API_KEY,
    steamId: userSteamId,
    pollInterval: 60000
  },
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID
  }
});

await gaming.authenticate(userSteamId, discordUserId);

// Start monitoring
gaming.startMonitoring((context) => {
  console.log(`Playing: ${context.currentGame?.name}`);
  const bonus = gaming.calculateGamingBonus(context);
  // bonus = 1.25 (base) + genre + multiplayer + session duration
  session.gaming_multiplier = bonus;
});

// Stop when done
gaming.stopMonitoring();
```

### Phase 6: Combat (Optional)

```typescript
import { CombatEngine } from './src/index.js';

const combat = new CombatEngine();

// Start combat
const battle = combat.startCombat([playerChar], [enemyChar]);
// battle.combatants is sorted by initiative

// Execute turn
const currentCombatant = combat.getCurrentCombatant(battle);
const target = battle.combatants.find(c => c.id !== currentCombatant.id);

if (currentCombatant.character.attacks?.length > 0) {
  const action = combat.executeAttack(
    battle,
    currentCombatant,
    target,
    currentCombatant.character.attacks[0]
  );
  // action.result.description: "Hero uses Longsword against Villain - Hit! Damage: 8"
}

// Advance turn
battle = combat.nextTurn(battle);

// Check results when done
if (!battle.isActive) {
  const result = combat.getCombatResult(battle);
  console.log(`${result.winner.character.name} won! ${result.xpAwarded} XP awarded`);
}
```

## Common Patterns

### Deterministic Character Generation

```typescript
// Same seed + audio = same character every time
const seed = 'ethereum-0x123abc-1';
const audio = { bass_dominance: 0.8, mid_dominance: 0.5, treble_dominance: 0.3, ... };

const char1 = CharacterGenerator.generate(seed, audio, 'Test');
const char2 = CharacterGenerator.generate(seed, audio, 'Test');

console.log(char1.race === char2.race);  // true
console.log(JSON.stringify(char1) === JSON.stringify(char2));  // true
```

### Full XP Calculation with Bonuses

```typescript
// Base XP from session
const baseXP = 300;  // ~1 XP per second

// Apply environmental bonus (optional)
const envMultiplier = 1.5;  // Running

// Apply gaming bonus (optional)
const gamingMultiplier = 1.3;  // Playing RPG game

// Apply track mastery bonus (optional)
const masteryBonus = 1.1;  // Track mastered

// Combine (capped at 3.0x)
const totalXP = baseXP * envMultiplier * gamingMultiplier * masteryBonus;
const cappedXP = Math.min(totalXP, baseXP * 3.0);
```

### Character Level Progression

```typescript
// Check if character can level up
if (char.experience_points >= char.xp.next_level) {
  // Level up
  const processor = new LevelUpProcessor();
  const updates = processor.processLevelUp(char);

  char.level = updates.newLevel;
  char.hp.max = updates.newHitPoints;
  char.proficiency_bonus = updates.newProficiencyBonus;

  // Reset XP or carry over (depends on your design)
  char.experience_points = 0;
}
```

## Configuration

### Environment Variables

```bash
# For environmental sensors
WEATHER_API_KEY=your_openweathermap_key

# For gaming platforms
STEAM_API_KEY=your_steam_api_key
DISCORD_CLIENT_ID=your_discord_client_id

# Optional
LOG_LEVEL=debug
```

### Audio Analyzer Options

```typescript
const analyzer = new AudioAnalyzer({
  includeAdvancedMetrics: true,  // Include spectral_centroid, spectral_rolloff, zero_crossing_rate
  enableDetailedOutput: false    // Include raw FFT data
});
```

### Environmental Sensors Options

```typescript
const sensors = new EnvironmentalSensors({
  enableLocation: true,
  enableMotion: true,
  enableWeather: true,
  enableLight: false,  // Experimental
  weatherApiKey: process.env.WEATHER_API_KEY
});
```

### Combat Engine Options

```typescript
const combat = new CombatEngine({
  useEnvironment: true,      // Include environmental bonuses in combat
  useMusic: false,           // Music-based combat modifiers
  tacticalMode: false,       // Require position tracking
  maxTurnsBeforeDraw: 100,   // Draw if combat exceeds this
  allowFleeing: false        // Allow retreat actions
});
```

## Testing

```bash
# Run all tests
npm test

# Run specific phase tests
npm test -- combat.test.ts
npm test -- progression.test.ts
npm test -- gaming.test.ts

# Watch mode
npm test -- --watch

# Coverage
npm run test:coverage
```

## Type Safety

All major classes are fully typed. Enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true
  }
}
```

## Performance Tips

1. **Lazy load audio analysis** - Don't analyze all tracks upfront
   ```typescript
   const audioProfiles = new Map();
   if (!audioProfiles.has(track.id)) {
     audioProfiles.set(track.id, await analyzer.extractSonicFingerprint(track.audio_url));
   }
   ```

2. **Cache character generation** - Same seed always produces same character
   ```typescript
   const characterCache = new Map();
   if (!characterCache.has(track.id)) {
     characterCache.set(track.id, CharacterGenerator.generate(...));
   }
   ```

3. **Batch sensor requests** - Avoid repeated permission prompts
   ```typescript
   const perms = await sensors.requestPermissions();
   // Use perms to decide what to monitor
   ```

4. **Debounce gaming platform polling** - Default 60s interval is reasonable
   ```typescript
   const gaming = new GamingPlatformSensors({
     steam: { pollInterval: 120000 }  // Increase to 2 minutes if needed
   });
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tests failing | Run `npm test -- --reporter=verbose` to see details |
| Audio analysis slow | Use `Triple Tap` mode (default), not full buffer analysis |
| Type errors | Ensure `tsconfig.json` has `strict: true` |
| Sensor permissions | User must grant permissions in browser (opt-in) |
| Steam API errors | Check API key and rate limiting (10 req/min) |
| Character feels same | Increase audio profile variation (bass/mid/treble dominance) |

## Next Steps

- **Read [README.md](README.md)** for comprehensive API documentation
- **Check [tests/](tests/)** for more usage examples
- **Review [ENGINE_DESIGN_DOCUMENT.md](ENGINE_DESIGN_DOCUMENT.md)** for architecture details

## Support

- **Issues**: Check existing tests for examples
- **Design questions**: See ENGINE_DESIGN_DOCUMENT.md Section 8
- **Type definitions**: Review src/core/types/ files

---

**Made with ❤️ for music lovers and RPG enthusiasts**
