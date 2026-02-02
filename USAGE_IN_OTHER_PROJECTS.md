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
- [Custom Features and Skills](#custom-features-and-skills) - Create custom class features, racial traits, and skills
- [Custom Classes](#custom-classes) - Create entirely new classes or extend existing ones
- [Spawn Rate Control](#spawn-rate-control) - Control how often custom content appears

### Common Patterns
- [Deterministic Character Generation](#deterministic-character-generation) - How the same seed always produces the same character
- [Understanding XP Bonus Calculation](#understanding-xp-bonus-calculation) - How environmental and gaming modifiers combine
- [Manual Level-Up Processing](#manual-level-up-processing) - Handle level-ups programmatically
- [Hash Utilities and Deterministic Seeding](#hash-utilities-and-deterministic-seeding) - Generate deterministic seeds and random values
- [Validation Schemas](#validation-schemas) - Runtime type validation with Zod schemas
- [Custom Features and Skills](#custom-features-and-skills) - Create custom class features, racial traits, and skills
- [Custom Classes](#custom-classes) - Create entirely new classes or extend existing ones
- [Spawn Rate Control](#spawn-rate-control) - Control how often custom content appears

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

#### Detailed Level-Up Celebrations

The `levelUpDetails` returned by `updateCharacterFromSession()` contains everything you need for that "LEVELED UP!" celebration experience:

```typescript
// Same workflow as above, but with detailed level-up display
const result = updater.updateCharacterFromSession(character, session, track, listenCount);

if (result.leveledUp && result.levelUpDetails) {
    console.log(`🎉 LEVELED UP from ${result.levelUpDetails[0].fromLevel} to ${result.newLevel}!`);

    // Each level-up has full details
    for (const detail of result.levelUpDetails) {
        console.log(`\n=== Level ${detail.fromLevel} → ${detail.toLevel} ===`);
        console.log(`💚 HP: +${detail.hpIncrease} (new max: ${detail.newMaxHP})`);

        if (detail.proficiencyIncrease > 0) {
            console.log(`⚔️ Proficiency: +${detail.proficiencyIncrease} (new: ${detail.newProficiency})`);
        }

        if (detail.statIncreases && detail.statIncreases.length > 0) {
            console.log(`📊 STATS INCREASED:`);
            for (const stat of detail.statIncreases) {
                console.log(`   ${stat.ability}: ${stat.oldValue} → ${stat.newValue} (+${stat.delta})`);
            }
        }

        if (detail.featuresGained && detail.featuresGained.length > 0) {
            console.log(`✨ NEW FEATURES: ${detail.featuresGained.join(', ')}`);
        }

        if (detail.newSpellSlots) {
            console.log(`🔮 NEW SPELL SLOTS:`, detail.newSpellSlots);
        }
    }
}

// Example output:
// 🎉 LEVELED UP from 3 to 4!
//
// === Level 3 → 4 ===
// 💚 HP: +7 (new max: 32)
// ⚔️ Proficiency: +1 (new: 3)
// 📊 STATS INCREASED:
//    STR: 14 → 16 (+2)
// ✨ NEW FEATURES: Ability Score Improvement
```

### Adding XP from Other Sources

**NEW:** You can now add XP from any source (combat, quests, custom activities) and get the same detailed level-up breakdowns!

```typescript
import { CharacterUpdater } from 'playlist-data-engine';

const updater = new CharacterUpdater();

// ===== COMBAT XP =====
// Award XP for defeating enemies
const combatResult = updater.addXP(character, 500, 'combat');

if (combatResult.leveledUp && combatResult.levelUpDetails) {
    console.log(`🎉 LEVELED UP from combat!`);
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

// ===== QUEST COMPLETION XP =====
// Award XP for completing quests
const questResult = updater.addXP(character, 1000, 'quest');
console.log(`Quest complete! Earned ${questResult.xpEarned} XP.`);

// ===== CUSTOM ACTIVITY XP =====
// Award XP for exploration, crafting, social interactions, etc.
const explorationResult = updater.addXP(character, 250, 'exploration');
const craftingResult = updater.addXP(character, 150, 'crafting');
const socialResult = updater.addXP(character, 100, 'social');

// ===== MASSIVE XP REWARD =====
// Boss defeated or major milestone - multiple levels at once!
const bossResult = updater.addXP(character, 10000, 'boss_defeat');

if (bossResult.leveledUp) {
    console.log(`🎉🎉🎉 MULTIPLE LEVELS! ${bossResult.newLevel}`);
    console.log(`Gained ${bossResult.levelUpDetails?.length} levels at once!`);

    // Show each level-up
    for (const detail of bossResult.levelUpDetails!) {
        console.log(`\n=== Level ${detail.fromLevel} → ${detail.toLevel} ===`);
        console.log(`💚 HP: +${detail.hpIncrease}`);

        if (detail.featuresGained && detail.featuresGained.length > 0) {
            console.log(`✨ ${detail.featuresGained.join(', ')}`);
        }
    }
}

// ===== TRACKING XP SOURCES =====
// The 'source' parameter helps you track where XP came from
interface XPSource {
    source: string;
    amount: number;
    timestamp: number;
}

const xpHistory: XPSource[] = [];

function addXPWithTracking(character: CharacterSheet, amount: number, source: string) {
    const result = updater.addXP(character, amount, source);

    // Track the XP source
    xpHistory.push({
        source,
        amount,
        timestamp: Date.now()
    });

    return result;
}

// Usage
addXPWithTracking(character, 500, 'combat');
addXPWithTracking(character, 1000, 'quest_main');
addXPWithTracking(character, 250, 'side_quest');

// Later, analyze where XP came from
const combatXP = xpHistory
    .filter(h => h.source.startsWith('combat'))
    .reduce((sum, h) => sum + h.amount, 0);

console.log(`Total combat XP: ${combatXP}`);
```

**Multiple XP Sources - Same Level-Up System:**

Whether XP comes from music listening, combat, quests, or custom activities, the level-up system works identically:

| Source | Method | XP Calculation | Level-Up Details |
|--------|--------|----------------|------------------|
| Music Listening | `updateCharacterFromSession()` | Duration × modifiers | ✅ Yes |
| Combat | `addXP()` | Direct amount | ✅ Yes |
| Quests | `addXP()` | Direct amount | ✅ Yes |
| Custom | `addXP()` | Direct amount | ✅ Yes |

All sources return the same detailed breakdown:
- `leveledUp` - Whether character leveled up
- `newLevel` - New level (if leveled up)
- `levelUpDetails` - Array of HP, stat, feature, and spell slot changes

### Level-Up with Stat Increases

**THE LEVELING UP A CHARACTER EXAMPLE IS NOTHING WITHOUT IMPROVED STATS!** Stats increase on level up at levels 4, 8, 12, 16, and 19 (standard mode) or every level (uncapped mode) following D&D 5e rules.

```typescript
import { StatManager, CharacterUpdater, CharacterGenerator } from 'playlist-data-engine';

// ===== GAME MODE SELECTION =====
// Standard mode (default): D&D 5e rules - stats capped at 20, increases at levels 4, 8, 12, 16, 19
// Uses MANUAL stat selection (2-step level-up process)
const standardCharacter = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Hero',
    { gameMode: 'standard' }  // Optional, this is the default
);

// Uncapped mode: No stat limits, stat increases EVERY level (unlimited)
// Uses AUTOMATIC stat selection (1-step level-up process)
const uncappedCharacter = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Epic Hero',
    { gameMode: 'uncapped' }
);

// ===== OPTION 1: Auto-Detected Strategy (NEW DEFAULT!) =====
// CharacterUpdater automatically detects strategy based on gameMode
const updater = new CharacterUpdater(); // No StatManager needed!

// For standard mode: 2-step level-up (manual stat selection)
const standardResult = updater.addXP(standardCharacter, 6500, 'quest');
console.log(`Leveled up to ${standardResult.newLevel}!`);

// Check for pending stat increases
if (updater.hasPendingStatIncreases(standardCharacter)) {
    const count = updater.getPendingStatIncreaseCount(standardCharacter);
    console.log(`${count} stat increases pending!`);

    // User chooses +2 to STR
    const completeResult = updater.applyPendingStatIncrease(standardCharacter, 'STR');
    console.log(`STR: ${completeResult.statIncreases[0].oldValue} → ${completeResult.statIncreases[0].newValue}`);

    // Or user chooses +1 to STR and +1 to DEX
    const result2 = updater.applyPendingStatIncrease(standardCharacter, 'STR', ['DEX']);
}

// For uncapped mode: 1-step level-up (automatic stat selection)
const uncappedResult = updater.addXP(uncappedCharacter, 6500, 'quest');
console.log(`Leveled up to ${uncappedResult.newLevel}!`);
console.log(`Stats auto-increased: ${JSON.stringify(uncappedResult.levelUpDetails?.[0].statIncreases)}`);

// ===== OPTION 2: Manual Stat Selection (Force Manual Mode) =====
const manualStatManager = new StatManager({ strategy: 'dnD5e' });
const manualUpdater = new CharacterUpdater(manualStatManager);

const result = manualUpdater.addXP(character, 6500, 'quest');

// User must manually select stats (same as Option 1)
if (manualUpdater.hasPendingStatIncreases(character)) {
    const completeResult = manualUpdater.applyPendingStatIncrease(character, 'CON');
    console.log(`CON increased!`);
}

// ===== OPTION 3: Smart Auto-Selection (Force Auto Mode) =====
const smartStatManager = new StatManager({
    strategy: 'dnD5e_smart'  // Auto-selects best stats based on class and current scores
});
const smartUpdater = new CharacterUpdater(smartStatManager);

// Stats automatically increase on level up - no player input required!
const smartResult = smartUpdater.addXP(character, 6500, 'quest');

if (smartResult.leveledUp) {
    console.log(`Leveled up to ${smartResult.newLevel}! Stats auto-increased.`);
    // The engine intelligently chose which stats to increase based on:
    // - Class primary ability
    // - Current stat values (boosts lowest if primary is high)
    // - D&D 5e rules
}

// ===== OPTION 4: Potion/Item Stat Boosts =====
const itemStatManager = new StatManager();

// Potion of Strength: +4 STR (temporary or permanent based on your game logic)
const potionResult = itemStatManager.increaseStats(
    character,
    [{ ability: 'STR', amount: 4 }],
    'item'
);

character = potionResult.character;

// Check if stat was capped at 20
if (potionResult.capped.length > 0) {
    console.log('Stat was capped at 20!');
}

// Check what actually increased
for (const inc of potionResult.increases) {
    console.log(`${inc.ability}: ${inc.oldValue} → ${inc.newValue} (+${inc.delta})`);
}

// ===== OPTION 4: Stat Decreases (Curses, Poison) =====
const curseManager = new StatManager();

// Curse of Weakness: -2 STR penalty
const curseResult = curseManager.decreaseStats(
    character,
    [{ ability: 'STR', amount: 2 }],
    'event'
);

character = curseResult.character;

// Check the decrease
for (const dec of curseResult.increases) {
    console.log(`${dec.ability}: ${dec.oldValue} → ${dec.newValue} (${dec.delta})`);
    // Output: "STR: 16 → 14 (-2)"
}

// Poison: -1 DEX, -1 CON
const poisonResult = curseManager.decreaseStats(
    character,
    [
        { ability: 'DEX', amount: 1 },
        { ability: 'CON', amount: 1 }
    ],
    'event'
);

// Remove curse with restoration potion
const restoreResult = curseManager.increaseStats(
    character,
    [{ ability: 'STR', amount: 2 }],
    'item'
);

// ===== OPTION 5: Change Strategy Mid-Game =====
const flexibleManager = new StatManager();

// Start with manual selection (early game)
const earlyGame = flexibleManager.processLevelUp(character, 4, {
    forcedAbilities: ['STR']  // Player chooses manually
});

// Mid-game: Switch to smart auto-selection
// Example: After level 10, automate stat increases
flexibleManager.updateConfig({
    strategy: 'dnD5e_smart'  // Now automatic!
});

// Level-ups are now automatic - no manual input needed
const midGame = flexibleManager.processLevelUp(character, 11);

// Late-game: Switch to balanced strategy
flexibleManager.updateConfig({
    strategy: 'balanced'
});

// ===== OPTION 6: Custom Level-Up Formula =====
// Provide your own formula for stat selection (perfect for custom game mechanics!)
const tankStrategy = (character, amount, options) => {
    // Always prioritize CON first (tank build), then DEX
    if (character.ability_scores.CON < 18) {
        return [{ ability: 'CON', amount }];
    }
    return [{ ability: 'DEX', amount }];
};

const customStatManager = new StatManager({ strategy: tankStrategy });
const customUpdater = new CharacterUpdater(customStatManager);

// Your custom formula is now used for all level-ups!
```

**Game Mode Comparison:**

```typescript
// Standard mode (D&D 5e rules)
const standard = CharacterGenerator.generate(seed, audio, 'Hero', { gameMode: 'standard' });
// Stats capped at 20, stat increases at levels 4, 8, 12, 16, 19

// Uncapped mode (epic progression - unlimited levels)
const uncapped = CharacterGenerator.generate(seed, audio, 'Hero', { gameMode: 'uncapped' });
// No stat cap, stat increases EVERY level (unlimited)
// Level 2, 3, 4... and beyond give +2 to one stat (or +1 to two)
```

**Optional Features - Developer Implementation:**

The engine provides core stat manipulation but does NOT include:

1. **Banked Stat Points**: Stat increases must be applied immediately - they are not stored for later use. If your game needs a "spend points later" system, implement it yourself using `StatManager` as the building block.

2. **Respec System**: There's no built-in stat respec system. Track the history of stat increases yourself and implement respec logic using `increaseStats` and `decreaseStats`.

**Example: Implementing Banked Points**

```typescript
// Your game's custom banked points system
interface BankedPoints {
    available: number;
    history: Array<{ timestamp: number; source: string; amount: number }>;
}

class CharacterWithBankedPoints {
    character: CharacterSheet;
    banked: BankedPoints;

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
    }
}
```

**HP increases EVERY level (not just stat increase levels):**

The leveling system ensures HP increases on EVERY level up, not just at stat increase levels:

```typescript
// HP increases every level using class hit die + CON modifier
// For example, a Fighter (d10 hit die) with +2 CON:
// Level 1 → Level 2: HP increases by 1d10+2 (avg 7.5)
// Level 2 → Level 3: HP increases by 1d10+2
// ...and so on for all levels!

// Standard mode (capped at level 20):
// - Ability scores increase at levels 4, 8, 12, 16, 19
// - Each grants +2 to one ability or +1 to two abilities
// - Stats are capped at 20

// Uncapped mode (unlimited levels):
// - Ability scores increase at EVERY level
// - Each grants +2 to one ability or +1 to two abilities
// - No stat cap - grow infinitely!
```

### Custom XP Scaling for Uncapped Mode

Uncapped mode supports two options for XP progression (unlimited levels):

**Option 1: Default D&D 5e Pattern (Continues Naturally)**

```typescript
import { CharacterGenerator, LevelUpProcessor } from 'playlist-data-engine';

// Just generate a character in uncapped mode - no additional config needed!
const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Epic Hero',
    { gameMode: 'uncapped' }
);

// XP automatically continues the D&D 5e formula: XP(n) = XP(n-1) + (n-1) × n × 500
// Level 21: 565,000 XP (355000 + 20*21*500)
// Level 25: ~735,000 XP
// Level 30: ~1,120,000 XP
// Proficiency bonus continues: +1 every 4 levels (21-24: 6, 25-28: 7, etc.)
```

**Option 2: Provide Your Own XP Formula**

```typescript
import { CharacterGenerator, LevelUpProcessor, type UncappedProgressionConfig } from 'playlist-data-engine';

// Set custom formulas BEFORE generating characters
LevelUpProcessor.setUncappedConfig({
    // Your formula is used for EVERY level (1-∞)
    xpFormula: (level) => {
        // Example: Linear 50,000 XP per level
        return (level - 1) * 50000;
    },
    proficiencyBonusFormula: (level) => {
        // Example: +1 every 2 levels
        return 2 + Math.floor((level - 1) / 2);
    }
});

// Now generate a character in uncapped mode
const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    'Custom Hero',
    { gameMode: 'uncapped' }
);

// Uses YOUR formulas:
// Level 1: 0 XP
// Level 2: 50,000 XP
// Level 3: 100,000 XP
// Level 10: 450,000 XP
// Proficiency: Level 1-2: 2, Level 3-4: 3, Level 5-6: 4, etc.
```

**Example: Exponential Scaling**

```typescript
LevelUpProcessor.setUncappedConfig({
    // Faster progression at low levels, slower at high levels
    xpFormula: (level) => Math.floor(1000 * Math.pow(1.5, level - 1)),
    proficiencyBonusFormula: (level) => 2 + Math.floor(Math.sqrt(level))
});

const character = CharacterGenerator.generate(seed, audio, 'Hero', { gameMode: 'uncapped' });

// Level 1: 1,000 XP
// Level 2: 1,500 XP
// Level 5: ~5,062 XP
// Level 10: ~38,443 XP
// Level 20+: Scales exponentially
```

**Example: OSRS-Style Scaling**

```typescript
LevelUpProcessor.setUncappedConfig({
    // Old School RuneScape style: exponential XP curve
    xpFormula: (level) => Math.floor(Math.pow(level, 3) * 100),
    proficiencyBonusFormula: (level) => 2 + Math.floor(level / 10)
});

// Level 1: 100 XP
// Level 2: 800 XP
// Level 5: 12,500 XP
// Level 10: 100,000 XP
// Level 20+: Very fast scaling
```

**Reset to Default:**

```typescript
// Clear custom formulas and return to D&D 5e pattern
LevelUpProcessor.setUncappedConfig({});
```

**Important Notes:**

1. Formulas apply to ALL levels (1-infinity), not just beyond 20
2. Your `xpFormula` receives the level number and returns the TOTAL XP required to reach that level
3. Your `proficiencyBonusFormula` receives the level number and returns the proficiency bonus
4. Set config BEFORE generating characters or processing level-ups
5. Config is global and affects ALL uncapped mode characters

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

// ===== SPELL REGISTRY FOR CUSTOM SPELLS =====
// Register and query custom spells with prerequisite validation
import { SpellRegistry, SpellValidator } from 'playlist-data-engine';

const spellRegistry = SpellRegistry.getInstance();

// Initialize with default spells
spellRegistry.initializeDefaults();

// Register custom spells
spellRegistry.registerSpell({
  id: 'phoenix_fire',
  name: 'Phoenix Fire',
  level: 5,
  school: 'Evocation',
  casting_time: '1 action',
  range: '60 feet',
  components: ['V', 'S'],
  duration: 'Instantaneous',
  description: 'A burst of phoenix flame...',
  prerequisites: {
    level: 10,
    abilities: { CHA: 16 }
  },
  classes: ['Sorcerer', 'Wizard'],
  source: 'custom'
});

// Query spells by level, school, or class
const fifthLevelSpells = spellRegistry.getSpellsByLevel(5);
const evocationSpells = spellRegistry.getSpellsBySchool('Evocation');
const sorcererSpells = spellRegistry.getSpellsForClass('Sorcerer');

// Get spells available to a character (prerequisites met)
const availableSpells = spellRegistry.getAvailableSpells(character);
console.log(`Available spells: ${availableSpells.map(s => s.name).join(', ')}`);

// Validate spell prerequisites
const phoenixFire = spellRegistry.getSpell('phoenix_fire');
if (phoenixFire) {
  const validation = spellRegistry.validatePrerequisites(phoenixFire, character);
  if (!validation.valid) {
    console.log(`Prerequisites not met: ${validation.errors.join(', ')}`);
  }
}

// Registry statistics
const stats = spellRegistry.getRegistryStats();
console.log(`Total spells: ${stats.totalSpells} (${stats.customSpells} custom)`);

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

**Discord RPC Dual-Mode:**

The Discord RPC integration now works in both browser and server environments with automatic detection:

- **Server Mode (Node.js)**: Full Discord Rich Presence when running in Node.js
- **Browser Mode**: Graceful degradation with console warnings (API remains compatible)

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
    clientId: process.env.DISCORD_CLIENT_ID  // Required for both modes
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

**Browser Compatibility Notes:**

- The `@ryuziii/discord-rpc` package is now an **optional dependency**
- In browser environments, Discord music presence gracefully degrades with warnings
- Steam game detection works in both browser AND server modes
- No configuration required - environment is detected automatically

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

  // Attack with equipped weapon - engine finds it automatically
  const target = combat.getLivingCombatants(combatInstance).find(c => c.id !== current.id);

  if (target) {
    // Simple: just say who's attacking and who's getting hit
    const action = combat.executeWeaponAttack(combatInstance, current, target);
    console.log(action.result.description);

    if (target.isDefeated) {
      console.log(`${target.character.name} has been defeated!`);
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

**Multiple Equipped Weapons:** If a character has multiple equipped weapons, specify which one:

```typescript
// Attack with a specific equipped weapon
combat.executeWeaponAttack(combatInstance, current, target, 'Longsword');

// Or just use the first equipped weapon (default)
combat.executeWeaponAttack(combatInstance, current, target);
```

**Manual Attack Objects:** For special cases, you can still manually construct `Attack` objects using `executeAttack()` directly. See `Attack` type in DATA_ENGINE_REFERENCE.md for all available properties.

The `DiceRoller` module provides utility functions for D&D-style dice rolling. These are standalone functions (not a class) that can be imported and used directly.

```typescript
import {
  rollDie,
  rollD20,
  rollMultipleDice,
  parseDiceFormula,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollInitiative,
  calculateDamage,
  doubleDamage,
  rollSavingThrow,
  rollAbilityCheck,
  isCriticalHit,
  isCriticalMiss,
  seededRoll,
  rollPercentile
} from 'playlist-data-engine';

// Basic dice rolling
const d6Result = rollDie(6);           // Roll a single d6 (1-6)
const d20Result = rollD20();           // Roll a d20 (1-20)
const threeD6 = rollMultipleDice(3, 6); // Roll 3d6, returns [3, 5, 2]
const percentile = rollPercentile();   // Roll d100 (1-100)

// Parse and roll dice formulas
const fireball = parseDiceFormula('8d6+5');
console.log(`Fireball damage: ${fireball.total}`);  // Sum of all rolls + modifier
console.log(`Individual rolls: ${fireball.rolls}`); // Array of each die result

// Advantage and disadvantage
const advRoll = rollWithAdvantage();
console.log(`Rolled ${advRoll.roll1} and ${advRoll.roll2}, taking ${advRoll.result}`);

const disadvRoll = rollWithDisadvantage();
console.log(`Rolled ${disadvRoll.roll1} and ${disadvRoll.roll2}, taking ${disadvRoll.result}`);

// Combat functions
const initiative = rollInitiative(3);  // d20 + DEX modifier (e.g., +3)

const damage = calculateDamage('2d6', 2, false);  // formula, modifier, critical?
console.log(`Damage: ${damage.total} (${damage.rolls} + ${damage.modifier})`);

const critDamage = calculateDamage('2d6', 2, true);  // Critical hit - dice doubled
console.log(`Critical damage: ${critDamage.total}`);

// Manual critical handling
const baseRolls = rollMultipleDice(2, 6);  // [4, 3]
const critRolls = doubleDamage(baseRolls);   // [4, 3, 4, 3]

// Saving throws and ability checks
const fortitudeSave = rollSavingThrow(2, 2);  // ability modifier + proficiency bonus
const athleticsCheck = rollAbilityCheck(4, 0);  // ability modifier only

// Critical detection
const attackRoll = rollD20();
if (isCriticalHit(attackRoll)) {
  console.log('Critical hit! Double the damage dice!');
}
if (isCriticalMiss(attackRoll)) {
  console.log('Critical miss! Attack fails automatically.');
}

// Seeded RNG for reproducible rolls
const seeded = seededRoll(12345);  // Same seed always produces same result
const anotherSeeded = seededRoll(12345);  // Will equal seeded
```

**Common Use Case: Custom Attack Resolution**

```typescript
import { rollD20, rollWithAdvantage, parseDiceFormula, isCriticalHit } from 'playlist-data-engine';

function resolveAttack(attackBonus: number, targetAC: number, hasAdvantage: boolean) {
  let d20Roll: number;

  if (hasAdvantage) {
    const result = rollWithAdvantage();
    d20Roll = result.result;
    console.log(`Advantage: rolled ${result.roll1} and ${result.roll2}`);
  } else {
    d20Roll = rollD20();
  }

  const total = d20Roll + attackBonus;
  const hit = total >= targetAC;
  const crit = isCriticalHit(d20Roll);

  return { d20Roll, total, hit, crit };
}

const attack = resolveAttack(7, 15, true);
console.log(`Attack roll: ${attack.d20Roll} + 7 = ${attack.total} vs AC 15`);
console.log(attack.crit ? 'CRITICAL HIT!' : (attack.hit ? 'Hit!' : 'Miss!'));
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
  // 1. Generate character from audio (choose game mode at creation time)
  const audio = await analyzer.extractSonicFingerprint(track.audio_url);
  let character = CharacterGenerator.generate(
    track.id,
    audio,
    track.title,
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

## Common Patterns

### Deterministic Character Generation

The same seed and audio profile always produces the same character:

```typescript
import { CharacterGenerator, AudioAnalyzer, type CharacterSheet } from 'playlist-data-engine';

const seed = 'ethereum-0x123abc-1';
const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);

// Generate the same character every time (same inputs = same output)
const char1 = CharacterGenerator.generate(seed, audio, 'Test');
const char2 = CharacterGenerator.generate(seed, audio, 'Test');

// Game mode affects the output, so different game modes = different characters
const standardChar = CharacterGenerator.generate(seed, audio, 'Hero', { gameMode: 'standard' });
const uncappedChar = CharacterGenerator.generate(seed, audio, 'Hero', { gameMode: 'uncapped' });

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

For advanced use cases where you need to handle level-ups manually with full control over stat selection:

```typescript
import { LevelUpProcessor, StatManager } from 'playlist-data-engine';

// ===== Method 1: Manual Stat Selection (D&D 5e Standard) =====
// IMPORTANT: The default DnD5eStandardStrategy REQUIRES you to provide stat choice
// via forcedAbilities. If you don't, processLevelUp() will throw an error!

const statManager = new StatManager();  // Uses DnD5eStandardStrategy by default

// When a character levels up, check if it's a stat increase level
const statIncreaseLevels = [4, 8, 12, 16, 19];

// 1. Process HP/proficiency/level-up benefits first
const newLevel = character.level + 1;
const benefits = LevelUpProcessor.processLevelUp(character, newLevel, character.seed);
character = LevelUpProcessor.applyLevelUp(character, benefits);

// 2. If this is a stat increase level, get player choice and apply stats
if (statIncreaseLevels.includes(newLevel)) {
  // Show UI to get player choice
  const playerChoice = await showStatSelectionUI(); // Returns ['STR'] or ['DEX', 'CON'], etc.

  // Apply stat increase with player's choice
  const statResult = statManager.processLevelUp(character, newLevel, {
    forcedAbilities: playerChoice
  });

  character = statResult.character;
  console.log(`Stat increased: ${statResult.increases[0].ability} +${statResult.increases[0].delta}`);
}

// ===== Method 2: Auto-selection with Smart Strategy (Recommended) =====
// This eliminates the need for manual stat selection entirely

const smartStatManager = new StatManager({
  strategy: 'dnD5e_smart'  // Automatically picks best stats based on class
});

const updater = new CharacterUpdater(smartStatManager);

// Now level-ups are automatic! No manual stat selection needed.
const result = updater.updateCharacterFromSession(character, session, track, listenCount);

if (result.leveledUp) {
  console.log(`Leveled up to ${result.newLevel}! Stats auto-increased.`);
}
```

### Hash Utilities and Deterministic Seeding

The hash utilities provide deterministic seed generation for reproducible character generation:

```typescript
import { generateSeed, hashSeedToFloat, hashSeedToInt, deriveSeed, SeededRNG } from 'playlist-data-engine';

// Generate a deterministic seed from blockchain data
// Takes THREE parameters: chainName, tokenAddress, tokenId
const seed = generateSeed('ethereum', '0x123abc...', '42');
console.log(seed);  // "ethereum-0x123abc...-42"

// Hash seed to float (0.0 - 1.0)
const float = hashSeedToFloat(seed);
console.log(float);  // e.g., 0.6423...

// Hash seed to integer in range
const stat = hashSeedToInt(seed, 8, 18);  // Random stat between 8 and 17
console.log(stat);  // e.g., 14

// Derive new seeds for related random values
const raceSeed = deriveSeed(seed, 'race');
const classSeed = deriveSeed(seed, 'class');
const statsSeed = deriveSeed(seed, 'stats');
console.log(raceSeed);  // "ethereum-0x123abc...-42:race"

// Use SeededRNG for complex deterministic random operations
const rng = new SeededRNG(seed);

// Generate random float in [0.0, 1.0)
const randomValue = rng.random();

// Generate random integer in range [min, max)
const d20Roll = rng.randomInt(1, 21);
const damage = rng.randomInt(1, 9);  // 1d8

// Pick random element from array
const races = ['Human', 'Elf', 'Dwarf', 'Halfling'];
const race = rng.randomChoice(races);

// Pick weighted random element (uses [value, weight] tuples)
const treasureOptions = [
  ['Gold', 50],
  ['Gem', 30],
  ['Artifact', 10]
];
const item = rng.weightedChoice(treasureOptions);
console.log(item);  // 'Gold' (50% chance), 'Gem' (30% chance), or 'Artifact' (10% chance)

// Shuffle array deterministically
const cards = ['A', 'K', 'Q', 'J', '10', '9', '8', '7'];
const shuffled = rng.shuffle([...cards]);
```

**Common Use Case: Blockchain-Based Character Generation**

```typescript
import { generateSeed, CharacterGenerator, AudioAnalyzer } from 'playlist-data-engine';

// Given an NFT's blockchain data
const nftData = {
  chain: 'ethereum',
  contractAddress: '0x1234567890abcdef...',
  tokenId: '1234'
};

// Generate a deterministic seed
const seed = generateSeed(nftData.chain, nftData.contractAddress, nftData.tokenId);

// Generate character from seed and audio
const analyzer = new AudioAnalyzer();
const audio = await analyzer.extractSonicFingerprint(track.audio_url);
const character = CharacterGenerator.generate(seed, audio, 'My NFT Hero');

// The same NFT always generates the same character!
```

---

### Validation Schemas

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

### Logger Utility

The library includes a centralized logging utility with consistent log levels across the application. It supports configurable verbosity, custom handlers for testing, and diagnostic mode for troubleshooting.

```typescript
import { Logger, createLogger, LogLevel } from 'playlist-data-engine';
import type { LoggerConfig, LogEntry } from 'playlist-data-engine';

// Create a named logger for your class/module
const logger = Logger.for('MyCharacterHandler');
// OR using the convenience function
const logger2 = createLogger('MyCombatEngine');

// Log at different levels
logger.debug('Starting character generation', { seed: 'abc123' });
logger.info('Character generated successfully');
logger.warn('Low HP threshold reached', { current: 5, max: 100 });
logger.error('Failed to load character data', new Error('File not found'));
```

**Controlling Verbosity**

```typescript
// Set minimum log level (only this level and above will be shown)
Logger.setLevel(LogLevel.WARN);  // Only WARN and ERROR messages
Logger.setLevel(LogLevel.DEBUG); // All messages including DEBUG

// Convenience methods for verbose mode
Logger.enableVerbose();  // Sets level to DEBUG
Logger.disableVerbose(); // Sets level to INFO
Logger.setVerbose(true); // Enable verbose mode
Logger.isVerbose();      // Check if verbose mode is active

// Diagnostic mode for troubleshooting (maximum verbosity)
Logger.enableDiagnosticMode();
Logger.isDiagnosticMode();  // true
Logger.disableDiagnosticMode();

// Get current level
const currentLevel = Logger.getLevel();
console.log(`Current level: ${LogLevel[currentLevel]}`);
```

**Custom Configuration**

```typescript
import { Logger, LoggerConfig } from 'playlist-data-engine';

// Configure logger globally
const config: LoggerConfig = {
    level: LogLevel.DEBUG,
    includeTimestamp: true,
    includeContext: true,
    customHandler: (entry: LogEntry) => {
        // Send to external logging service
        myLogService.send({
            severity: LogLevel[entry.level],
            message: `[${entry.context}] ${entry.message}`,
            timestamp: entry.timestamp,
            data: entry.data
        });
    }
};

Logger.configure(config);
```

**Using Custom Handlers for Testing**

```typescript
import { Logger, LogLevel, type LogEntry } from 'playlist-data-engine';

// Collect logs for testing
const testLogs: LogEntry[] = [];

Logger.configure({
    customHandler: (entry: LogEntry) => {
        testLogs.push(entry);
    }
});

// Run your code
someFunctionThatLogs();

// Assert on logs
assert(testLogs.some(log =>
    log.level === LogLevel.ERROR &&
    log.message.includes('Failed')
));

// Reset after test
Logger.reset();
```

**Log Levels Reference**

| Level | Value | Use Case |
|-------|-------|----------|
| `DEBUG` | 0 | Detailed debugging information, variable values, flow tracing |
| `INFO` | 1 | General operational information, successful completions |
| `WARN` | 2 | Warning conditions, deprecated usage, unexpected but recoverable states |
| `ERROR` | 3 | Error conditions that need attention, failed operations |
| `NONE` | 4 | Disable all logging |

**Available Exports**

- `Logger` class - Main logging class with static methods
- `createLogger()` function - Convenience function to create a logger instance
- `LogLevel` enum - Log level constants (DEBUG, INFO, WARN, ERROR, NONE)
- `LogEntry` type - Structure of a log entry (timestamp, level, context, message, data)
- `LoggerConfig` type - Configuration options for the logger

---

### Sensor Dashboard

The Sensor Dashboard provides formatted console output for sensor diagnostics during development and debugging. It displays sensor status, health indicators, cache statistics, performance metrics, and recent failures with optional ANSI color support (auto-disabled in non-TTY environments like CI).

#### Basic Usage

```typescript
import { SensorDashboard, EnvironmentalSensors, GamingPlatformSensors } from 'playlist-data-engine';

// Initialize sensors
const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
const gamingSensors = new GamingPlatformSensors({
    steamApiKey: process.env.STEAM_API_KEY,
    discordClientId: process.env.DISCORD_CLIENT_ID
});

// Get sensor data
const envDiagnostics = sensors.getDiagnostics();
const gamingDiagnostics = gamingSensors.getDiagnostics();

// Display individual dashboards
SensorDashboard.displayEnvironmentalDiagnostics(envDiagnostics);
SensorDashboard.displayGamingDiagnostics(gamingDiagnostics);

// Display combined system dashboard
SensorDashboard.displaySystemDashboard({
    environmental: envDiagnostics,
    gaming: gamingDiagnostics
});
```

#### Custom Configuration

```typescript
import { SensorDashboard, type DashboardConfig } from 'playlist-data-engine';

const config: DashboardConfig = {
    useColors: false,        // Disable colors (for CI/logs)
    compact: true,           // Compact output mode
    showTimestamp: false,    // Hide timestamp
    maxFailures: 10          // Show up to 10 recent failures
};

SensorDashboard.displayEnvironmentalDiagnostics(diagnostics, config);
```

#### Dashboard Sections

**Environmental Diagnostics:**
- Sensor Status - Health, permissions, availability, consecutive failures, last error
- Cache Statistics - Geolocation age/expiry, weather cache size, hit rates
- API Performance - Weather/Forecast API calls, success rate, timing metrics (P95/P99)
- Recent Failures - Error messages with retry status and time ago
- Context Data - Available context types (geolocation, motion, weather, light, biome)

**Gaming Diagnostics:**
- Platform Status - Steam authentication/API key, Discord connection state
- Gaming Context - Active gaming status, current game with session details
- Polling Status - Active status, interval, exponential backoff multiplier
- Cache - Game metadata cache size and cached games list
- API Performance - Current Game/Metadata API metrics

**Quick Health Summary (System Dashboard):**
- Overall environmental sensor health count
- Gaming platform connection status

#### Available Exports

- `SensorDashboard` - Object containing all dashboard display functions
- `displayEnvironmentalDiagnostics()` - Display environmental sensor dashboard
- `displayGamingDiagnostics()` - Display gaming platform sensor dashboard
- `displaySystemDashboard()` - Display combined system dashboard
- `DashboardConfig` type - Configuration options for dashboard output

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

**Spawn Modes:**
| Mode | Description |
|------|-------------|
| `relative` | Add to default pool (default) |
| `absolute` | Only custom items spawn |
| `default` | All items equal weight |
| `replace` | Clear previous custom data |

See [EXTENSIBILITY_GUIDE.md](docs/EXTENSIBILITY_GUIDE.md) for:
- Custom classes and features
- Equipment properties and modifications
- Export/import functionality
- Content pack creation

**For detailed guides on specific topics:**
- [docs/PREREQUISITES.md](docs/PREREQUISITES.md) - Complete guide to skill, spell, and feature prerequisites
- [docs/CUSTOM_CONTENT.md](docs/CUSTOM_CONTENT.md) - Custom races, classes, and spawn rate control
- [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md) - Complete API reference

### Example: Dragon-Themed Content

This example demonstrates registering a complete dragon-themed content pack with custom race, subraces, skills, and spells:

```typescript
import { ExtensionManager, FeatureRegistry, SkillRegistry, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// 1. Register a custom race with subraces
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

manager.register('races', ['Dragonkin']);

// 2. Register subrace-specific racial traits
FeatureRegistry.getInstance().registerRacialTrait({
    id: 'fire_dragonkin_fire_resistance',
    name: 'Fire Resistance',
    description: 'You have resistance to fire damage.',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: { subrace: 'Fire Dragonkin' },
    effects: [
        { type: 'ability_unlock', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
});

// 3. Register a skill with prerequisites (feature + level + class)
SkillRegistry.getInstance().registerSkill({
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],
        level: 5,
        class: asClass('Sorcerer')
    },
    source: 'custom'
});

// 4. Register a spell with prerequisites
manager.register('spells', [{
    id: 'dragon_breath',
    name: 'Dragon Breath',
    level: 3,
    school: 'Evocation',
    casting_time: '1 action',
    range: '60 ft cone',
    components: ['V', 'S', 'M'],
    duration: 'Instantaneous',
    description: 'Exhale destructive energy',
    prerequisites: {
        features: ['dragon_bloodline'],
        abilities: { CHA: 16 }
    }
}]);
```

### Example: Custom Necromancer Class

This example demonstrates creating a custom "Necromancer" class that extends the Wizard base class:

```typescript
import { ExtensionManager, CharacterGenerator, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// 1. Register custom skill
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control',
    prerequisites: { class: 'Necromancer' },
    source: 'custom'
}]);

// 2. Register custom class data (inherits from Wizard)
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// 3. Register the class name
manager.register('classes', [asClass('Necromancer')]);

// 4. Register custom features
manager.register('classFeatures.Necromancer', [
    {
        id: 'necromancer_raise_dead',
        name: 'Raise Undead',
        description: 'Can raise undead creatures',
        type: 'active',
        level: 1,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            abilities: { INT: 13 }
        },
        effects: [
            { type: 'ability_unlock', target: 'raise_undead', value: true }
        ],
        source: 'custom'
    }
], { mode: 'replace' });

// 5. Register custom spell list
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death']
    }
}]);

// 6. Generate a Necromancer character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: 'Necromancer' }
);
```

---

## Equipment System

The playlist-data-engine includes a comprehensive equipment system with custom items, properties, enchanting, and batch spawning.

**For complete documentation, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)**

### Registering Custom Equipment

```typescript
import { ExtensionManager } from 'playlist-data-engine';
import type { EnhancedEquipment } from 'playlist-data-engine';

const flamingSword: EnhancedEquipment = {
    name: 'Flaming Sword',
    type: 'weapon',
    rarity: 'rare',
    weight: 3,
    damage: { dice: '1d8', damageType: 'slashing' },
    properties: [{
        type: 'damage_bonus',
        target: 'fire',
        value: '1d6',
        description: '+1d6 fire damage'
    }],
    spawnWeight: 0.1,
    source: 'custom',
    tags: ['magic', 'fire', 'weapon']
};

const manager = ExtensionManager.getInstance();
manager.register('equipment', [flamingSword], {
    mode: 'relative',
    validate: true
});
```

### Spawning Equipment

```typescript
import { EquipmentSpawnHelper, SeededRNG } from 'playlist-data-engine';

const rng = new SeededRNG('loot_seed');

// Spawn from list
const items = EquipmentSpawnHelper.spawnFromList(['Flaming Sword', 'Shield']);

// Spawn by rarity
const rareItems = EquipmentSpawnHelper.spawnByRarity('rare', 3, rng);

// Spawn random (respects spawn weights)
const loot = EquipmentSpawnHelper.spawnRandom(5, rng, { excludeZeroWeight: true });

// Add to character
character = EquipmentSpawnHelper.addToCharacter(character, loot, false);
```

### Applying Equipment Effects

```typescript
import { EquipmentEffectApplier } from 'playlist-data-engine';

// Equip item - applies all properties, features, skills, spells
// instanceId is optional - use it when you want to track specific item instances
const result = EquipmentEffectApplier.equipItem(character, equipment);
// result: { applied: boolean, count: number, errors: string[] }

// With instance tracking (for multiple identical items)
const resultWithId = EquipmentEffectApplier.equipItem(character, equipment, 'instance_123');

// Unequip item - removes all effects
// instanceId is optional - only needed if you used it when equipping
const unequipResult = EquipmentEffectApplier.unequipItem(character, 'Flaming Sword');
// unequipResult: { applied: boolean, count: number, errors: string[] }

// Unequip specific instance
const unequipResultWithId = EquipmentEffectApplier.unequipItem(character, 'Flaming Sword', 'instance_123');
```

### Enchanting Equipment

```typescript
import { EquipmentModifier } from 'playlist-data-engine';

// Create enchantment
const enchantment = EquipmentModifier.createModification(
    'plus_one_001',
    '+1 Flaming Sword',
    [{ type: 'passive_modifier', target: 'attack_roll', value: 1 }],
    'enchantment'
);

// Apply to equipment
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Flaming Sword',
    enchantment,
    character
);

// Check if enchanted
if (EquipmentModifier.isEnchanted(character.equipment, 'Flaming Sword')) {
    console.log('Item is enchanted!');
}

// Get item summary
const summary = EquipmentModifier.getItemSummary(character.equipment, 'Flaming Sword');
console.log(summary);
// { name: 'Flaming Sword', modifications: [...], isCursed: false, isEnchanted: true }
```

**For more examples including conditional properties, inline features, spell granting, and templates, see [EQUIPMENT_SYSTEM.md](docs/EQUIPMENT_SYSTEM.md)**

---

### Enchantment Library

The Enchantment Library provides a comprehensive collection of predefined enchantments and curses that can be applied to equipment at runtime. All enchantments are `EquipmentModification` objects designed to work with `EquipmentModifier`.

**For complete API documentation, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#enchantment-library)**

#### Using Predefined Enchantments

```typescript
import { EquipmentModifier, WEAPON_ENCHANTMENTS, ARMOR_ENCHANTMENTS, RESISTANCE_ENCHANTMENTS } from 'playlist-data-engine';

// Apply a +1 enhancement to a weapon
const plusOne = WEAPON_ENCHANTMENTS.plusOne;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    plusOne,
    character
);

// Add elemental damage
const flaming = WEAPON_ENCHANTMENTS.flaming;  // +1d6 fire damage
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Longsword',
    flaming,
    character
);

// Improve armor
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Plate Armor',
    ARMOR_ENCHANTMENTS.plusTwo,  // +2 AC
    character
);

// Add resistance
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Cloak of Protection',
    RESISTANCE_ENCHANTMENTS.fire,  // Fire resistance
    character
);
```

#### Creating Stat-Boosting Enchantments

The `create*Enchantment` functions create stat bonuses with configurable levels (1-4):

```typescript
import {
    createStrengthEnchantment,
    createDexterityEnchantment,
    createConstitutionEnchantment,
    createIntelligenceEnchantment,
    createWisdomEnchantment,
    createCharismaEnchantment
} from 'playlist-data-engine';

// Create +2 Strength belt
const beltOfStrength = createStrengthEnchantment(2);  // Bonus: 1-4
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Belt of Giant Strength',
    beltOfStrength,
    character
);

// Create +4 Intelligence circlet
const circletOfIntellect = createIntelligenceEnchantment(4);
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Circlet of Intellect',
    circletOfIntellect,
    character
);
```

#### Applying Curses

```typescript
import { EquipmentModifier, CURSES } from 'playlist-data-engine';

// Apply a cursed item
const cursedItem = EquipmentModifier.curse(
    character.equipment,
    'Ring of Weakness',
    CURSES.weakness,  // -4 Strength
    character
);

// Apply attunement lock (cannot remove without remove curse)
const lockedItem = EquipmentModifier.curse(
    character.equipment,
    'Cursed Helmet',
    CURSES.attunement,
    character
);
```

#### Combo Enchantments

Special multi-effect enchantments for powerful items:

```typescript
import { ALL_ENCHANTMENTS } from 'playlist-data-engine';

// Holy Avenger: +3 enhancement, radiant damage vs fiends/undead, +5 saves vs spells
const holyAvenger = ALL_ENCHANTMENTS.holyAvenger;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Holy Avenger',
    holyAvenger,
    character
);

// Dragon Slayer: +2 enhancement, extra damage vs dragons, fire resistance
const dragonSlayer = ALL_ENCHANTMENTS.dragonSlayer;
character.equipment = EquipmentModifier.enchant(
    character.equipment,
    'Dragon Slayer Sword',
    dragonSlayer,
    character
);
```

#### Querying Enchantments

```typescript
import { getEnchantment, getCurse, getAllEnchantments, getAllCurses, getEnchantmentsByType } from 'playlist-data-engine';

// Get specific enchantment by ID
const ench = getEnchantment('enchantment_flaming');
if (ench) {
    console.log(ench.name);  // 'Flaming'
}

// Get all curses
const allCurses = getAllCurses();
console.log(`Available curses: ${allCurses.length}`);  // 17 curses

// Get enchantments by type
const weaponEnchants = getEnchantmentsByType('weapon');
console.log(`Weapon enchantments: ${weaponEnchants.length}`);  // 16 enchantments
```

**Available Exports:**

- **Collections**: `WEAPON_ENCHANTMENTS`, `ARMOR_ENCHANTMENTS`, `RESISTANCE_ENCHANTMENTS`, `CURSES`, `ALL_ENCHANTMENTS`
- **Stat Boost Functions**: `createStrengthEnchantment`, `createDexterityEnchantment`, `createConstitutionEnchantment`, `createIntelligenceEnchantment`, `createWisdomEnchantment`, `createCharismaEnchantment` (each takes `bonus: 1 | 2 | 3 | 4`)
- **Query Functions**: `getEnchantment`, `getCurse`, `getAllEnchantments`, `getAllCurses`, `getEnchantmentsByType`

---

### Magic Item Examples

The Magic Item Examples library provides 38 pre-built magic items that demonstrate all capabilities of the Advanced Equipment System. These include weapons, armor, wondrous items, cursed items, conditional items, and template-based items. They serve as reference implementations and test fixtures.

**For complete API documentation, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#magic-item-examples)**

#### Getting Magic Items by Name

```typescript
import { getMagicItem } from 'playlist-data-engine';

// Get a specific magic item
const flameTongue = getMagicItem('Flame Tongue');
if (flameTongue) {
    console.log(flameTongue.properties);
    // Output: Array of equipment properties including damage_bonus and special_property
}
```

#### Querying Magic Items

```typescript
import {
    getMagicItemsByType,
    getMagicItemsByRarity,
    getCursedItems,
    getItemsWithProperty
} from 'playlist-data-engine';

// Get all weapons
const weapons = getMagicItemsByType('weapon');
console.log(`Magic weapons: ${weapons.length}`);  // 4 weapons

// Get all rare items
const rareItems = getMagicItemsByRarity('rare');
console.log(`Rare items: ${rareItems.length}`);  // ~15 rare items

// Get cursed items
const cursedItems = getCursedItems();
cursedItems.forEach(item => {
    console.log(`Cursed: ${item.name}`);
    // Output: -1 Cursed Sword, Belt of Strength Drain, Helmet of Opposite Alignment
});

// Get all items with a specific property
const statBonusItems = getItemsWithProperty('stat_bonus');
console.log(`Items with stat bonuses: ${statBonusItems.length}`);
```

#### Applying Magic Equipment Templates

Templates can be applied to base equipment to create magic variants:

```typescript
import { applyTemplate, EnhancedEquipment } from 'playlist-data-engine';

// Define base equipment
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

// Apply flaming template
const flamingSword = applyTemplate(baseLongsword, 'flaming_weapon_template');
if (flamingSword) {
    console.log(flamingSword.name);  // "Longsword (flaming weapon template)"
    console.log(flamingSword.properties);  // Combined properties from base + template
}

// Apply +1 enhancement
const plusOneSword = applyTemplate(baseLongsword, 'plus_one_weapon');
if (plusOneSword) {
    console.log(plusOneSword.properties);  // Includes +1 attack/damage bonus
}
```

#### Registering Magic Items with ExtensionManager

Magic item examples can be registered as custom equipment for procedural generation:

```typescript
import { ExtensionManager, MAGIC_ITEM_EXAMPLES } from 'playlist-data-engine';

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
// Note: Vorpal Sword and other legendary items have spawnWeight: 0,
// so they won't appear randomly but can still be spawned by name
```

#### Direct Access to Magic Item Collections

```typescript
import { MAGIC_ITEM_EXAMPLES, MAGIC_EQUIPMENT_TEMPLATES } from 'playlist-data-engine';

// Iterate through all magic items
MAGIC_ITEM_EXAMPLES.forEach(item => {
    console.log(`${item.name} (${item.rarity}) - ${item.type}`);
});

// Access specific template
const viciousTemplate = MAGIC_EQUIPMENT_TEMPLATES.vicious_weapon_template;
console.log(viciousTemplate.properties);
```

**Available Exports:**

- **Collections**: `MAGIC_ITEM_EXAMPLES` (38 items), `MAGIC_EQUIPMENT_TEMPLATES` (9 templates)
- **Query Functions**: `getMagicItem`, `getMagicItemsByType`, `getMagicItemsByRarity`, `getCursedItems`, `getItemsWithProperty`
- **Template Function**: `applyTemplate` - Apply a template to base equipment

---

### Configuration (NEW)

The library provides centralized configuration options for sensors and progression systems. These configurations allow you to customize behavior such as cache TTLs, retry logic, XP modifiers, and level-up settings.

#### Sensor Configuration

Sensor configuration controls environmental and gaming platform sensor behavior, including caching, retry logic, and XP modifier calculations.

```typescript
import {
    DEFAULT_SENSOR_CONFIG,
    loadConfigFromEnv,
    mergeConfig,
    type SensorConfig
} from 'playlist-data-engine';

// Use default configuration
const defaultConfig = DEFAULT_SENSOR_CONFIG;
console.log(defaultConfig.xpModifier.maxModifier); // 3.0

// Load configuration from environment variables
// Reads: WEATHER_API_KEY, STEAM_API_KEY, STEAM_USER_ID, DISCORD_CLIENT_ID, XP_MAX_MODIFIER
const envConfig = loadConfigFromEnv();

// Merge custom configuration with defaults
const customConfig = mergeConfig({
    weather: {
        cacheTTL: 15 * 60 * 1000, // 15 minutes (default: 12 minutes)
        apiKey: 'your_api_key_here'
    },
    xpModifier: {
        maxModifier: 2.5, // Lower cap (default: 3.0)
        runningBonus: 0.6, // Higher bonus for running (default: 0.5)
        nightBonus: 0.3 // Higher night bonus (default: 0.25)
    },
    gaming: {
        steam: {
            pollInterval: 30000 // Poll every 30 seconds (default: 60000)
        }
    }
});

// Use configuration with EnvironmentalSensors
import { EnvironmentalSensors } from 'playlist-data-engine';

const sensors = new EnvironmentalSensors(customConfig);
```

#### Progression Configuration

Progression configuration controls XP calculation, stat increases, and level-up behavior.

```typescript
import {
    DEFAULT_PROGRESSION_CONFIG,
    mergeProgressionConfig,
    type ProgressionConfig
} from 'playlist-data-engine';

// Use default configuration (D&D 5e standard)
const defaultProgression = DEFAULT_PROGRESSION_CONFIG;
console.log(defaultProgression.xp.level_thresholds); // D&D 5e XP thresholds

// Customize progression settings
const customProgression = mergeProgressionConfig({
    xp: {
        xp_per_second: 2, // Double XP rate (default: 1)
        activity_bonuses: {
            running: 2.0, // 2x XP while running (default: 1.5)
            night_time: 1.5 // 1.5x XP at night (default: 1.25)
        }
    },
    statIncrease: {
        strategy: 'balanced', // Use balanced strategy instead of manual
        autoApply: true // Automatically apply stat increases
    },
    levelUp: {
        useAverageHP: true, // Use average HP instead of rolling
        allowManualStatSelection: false // Disable manual selection
    }
});
```

**Available Exports:**

**Sensor Configuration:**
- `DEFAULT_SENSOR_CONFIG` - Default sensor configuration values
- `loadConfigFromEnv()` - Load config from environment variables
- `mergeConfig(userConfig?)` - Merge user config with defaults and env vars
- `type SensorConfig` - Complete sensor configuration interface
- `type GeolocationSensorConfig` - GPS sensor configuration
- `type WeatherSensorConfig` - Weather API configuration
- `type GamingSensorConfig` - Gaming platform configuration
- `type XPModifierConfig` - XP modifier calculation settings
- `type RetryConfig` - Retry behavior configuration

**Progression Configuration:**
- `DEFAULT_PROGRESSION_CONFIG` - Default D&D 5e progression values
- `mergeProgressionConfig(userConfig?)` - Merge progression config with defaults
- `type ProgressionConfig` - Progression system configuration interface

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
- `ExtensionManager` - Register and manage custom content for all categories
- `FeatureRegistry` - Register and query custom class features and racial traits
- `SkillRegistry` - Register and query custom skills
- `SpellRegistry` - Register and query spells with prerequisite validation
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

