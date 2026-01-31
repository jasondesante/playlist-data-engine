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

---

## Extensibility System

### Custom Features and Skills

**NEW:** The Playlist Data Engine now supports full customization of class features, racial traits, and skills through the extensibility system!

#### Custom Class Features

Create your own class features with prerequisites, effects, and spawn rate control:

```typescript
import { FeatureRegistry, ExtensionManager, type ClassFeature } from 'playlist-data-engine';

// Method 1: Direct registration with FeatureRegistry
const registry = FeatureRegistry.getInstance();

// Add a custom Barbarian feature
const dragonFury: ClassFeature = {
    id: 'dragon_fury',
    name: 'Dragon Fury',
    description: 'Channel your draconic heritage to deal bonus fire damage while raging.',
    type: 'active',
    level: 3,
    class: 'Barbarian',
    prerequisites: {
        level: 3,
        // Optional: Require specific features first
        features: ['rage']
    },
    effects: [
        {
            type: 'resource_grant',
            target: 'dragon_fury_damage',
            value: 2,
            description: '+2 fire damage while raging'
        },
        {
            type: 'passive_modifier',
            target: 'fire_resistance',
            value: true,
            condition: 'while_raging',
            description: 'Fire resistance while raging'
        }
    ],
    source: 'custom'
};

registry.registerClassFeature(dragonFury);

// Method 2: Register via ExtensionManager (recommended)
const manager = ExtensionManager.getInstance();

manager.register('classFeatures', [dragonFury], {
    mode: 'append',  // Add to default features
    weights: {
        'dragon_fury': 0.5  // Half as likely to spawn in selection contexts
    }
});

// Class-specific feature registration
manager.register('classFeatures.Barbarian', [dragonFury]);
```

#### Custom Racial Traits

Create custom racial traits with effects and conditions:

```typescript
import { FeatureRegistry, type RacialTrait } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// Add a custom Elf trait
const elvenCombatTraining: RacialTrait = {
    id: 'elf_weapon_training',
    name: 'Elven Weapon Training',
    description: 'You are proficient with the longsword, shortsword, shortbow, and longbow.',
    race: 'Elf',
    prerequisites: {
        // Optional: Require specific subrace
        subrace: 'High Elf'
    },
    effects: [
        {
            type: 'skill_proficiency',
            target: 'longsword',
            value: 'proficient',
            description: 'Proficient with longsword'
        },
        {
            type: 'skill_proficiency',
            target: 'shortsword',
            value: 'proficient',
            description: 'Proficient with shortsword'
        },
        {
            type: 'skill_proficiency',
            target: 'shortbow',
            value: 'proficient',
            description: 'Proficient with shortbow'
        },
        {
            type: 'skill_proficiency',
            target: 'longbow',
            value: 'proficient',
            description: 'Proficient with longbow'
        }
    ],
    source: 'custom'
};

registry.registerRacialTrait(elvenCombatTraining);
```

#### Custom Skills

Create custom skills for your game:

```typescript
import { SkillRegistry, type CustomSkill } from 'playlist-data-engine';

const skillRegistry = SkillRegistry.getInstance();

// Add a custom survival skill for cold environments
const coldSurvival: CustomSkill = {
    id: 'survival_cold',
    name: 'Survival (Cold Environments)',
    description: 'Expertise in surviving and navigating in cold weather conditions.',
    ability: 'WIS',
    armorPenalty: true,  // Affected by armor disadvantage
    categories: ['exploration', 'environmental'],
    source: 'custom',
    tags: ['wilderness', 'weather', 'arctic']
};

skillRegistry.registerSkill(coldSurvival);

// Register via ExtensionManager with spawn rate control
const manager = ExtensionManager.getInstance();

manager.register('skills', [coldSurvival], {
    mode: 'append',
    weights: {
        'survival_cold': 0.3  // Less likely to spawn than default skills
    }
});

// Register ability-specific skills
manager.register('skills.WIS', [coldSurvival]);

// Verify the skill was registered
if (skillRegistry.isValidSkill('survival_cold')) {
    console.log('Custom skill registered successfully!');
}

// Get skill metadata
const skill = skillRegistry.getSkill('survival_cold');
console.log(`${skill.name} (uses ${skill.ability})`);
console.log(`Categories: ${skill.categories.join(', ')}`);
```

#### Feature Effects

Features can apply various effects to characters:

```typescript
import { type ClassFeature, type FeatureEffect } from 'playlist-data-engine';

const customFeature: ClassFeature = {
    id: 'example_feature',
    name: 'Example Feature',
    description: 'Demonstrates all effect types',
    type: 'passive',
    level: 5,
    class: 'Fighter',
    effects: [
        // Stat Bonus: Increase ability score
        {
            type: 'stat_bonus',
            target: 'STR',
            value: 2,
            description: '+2 Strength score'
        },

        // Skill Proficiency: Grant skill proficiency
        {
            type: 'skill_proficiency',
            target: 'athletics',
            value: 'expertise',
            description: 'Expertise in Athletics'
        },

        // Ability Unlock: Grant special ability
        {
            type: 'ability_unlock',
            target: 'second_wind',
            value: true,
            description: 'Gain Second Wind ability'
        },

        // Passive Modifier: Add constant bonus
        {
            type: 'passive_modifier',
            target: 'speed',
            value: 10,
            condition: 'unarmored',
            description: '+10 speed when unarmored'
        },

        // Resource Grant: Grant resource pool
        {
            type: 'resource_grant',
            target: 'ki_points',
            value: 2,
            description: 'Gain 2 Ki points per short rest'
        },

        // Spell Slot Bonus: Grant additional spell slots
        {
            type: 'spell_slot_bonus',
            target: 'spell_slots_1',
            value: 1,
            description: '+1 level 1 spell slot'
        }
    ],
    source: 'custom'
};
```

#### Querying Features and Skills

```typescript
import { FeatureRegistry, SkillRegistry } from 'playlist-data-engine';

const featureRegistry = FeatureRegistry.getInstance();
const skillRegistry = SkillRegistry.getInstance();

// Get all features for a class at a specific level
const barbarianLevel3Features = featureRegistry.getClassFeatures('Barbarian', 3);
console.log(`Barbarian level 3 features:`, barbarianLevel3Features.map(f => f.name));

// Get all racial traits for a race
const elfTraits = featureRegistry.getRacialTraits('Elf');
console.log(`Elf traits:`, elfTraits.map(t => t.name));

// Get skills by ability
const wisdomSkills = skillRegistry.getSkillsByAbility('WIS');
console.log(`WIS skills:`, wisdomSkills.map(s => s.id));

// Get skills by category
const explorationSkills = skillRegistry.getSkillsByCategory('exploration');
console.log(`Exploration skills:`, explorationSkills.map(s => s.name));

// Get registry statistics
const featureStats = featureRegistry.getRegistryStats();
console.log(`Features: ${featureStats.totalFeatures} (${featureStats.customFeatures} custom)`);

const skillStats = skillRegistry.getRegistryStats();
console.log(`Skills: ${skillStats.totalSkills} (${skillStats.customSkills} custom)`);
```

### Custom Classes

**NEW:** Create entirely new classes or extend existing D&D 5e classes using the template-based class system!

#### Overview

The Template Class System allows you to create new custom classes that extend (inherit from) existing D&D 5e base classes. This enables rapid creation of specialized classes without duplicating all base class properties.

#### Creating a Template-Based Custom Class

Create a new class by extending an existing base class:

```typescript
import { ExtensionManager, asClass } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Register a custom "Necromancer" class based on Wizard
manager.register('classes.data', [{
    name: 'Necromancer',
    baseClass: 'Wizard',  // Inherits from Wizard by default
    // Only override what's different:
    available_skills: ['arcana', 'medicine', 'religion', 'necromancy']
    // All other properties (hit_die, saving_throws, etc.) are inherited from Wizard
}]);

// Register the class name
manager.register('classes', [asClass('Necromancer')]);
```

The `baseClass` property enables template inheritance:
- **Properties are merged**: Base class properties are spread first, then custom properties override
- **Complete overrides**: Specify all properties without `baseClass` for a completely custom class
- **Skill lists are replaced**: The `available_skills` array is completely replaced (not merged)

#### Custom Class with Complete Override

Create a class from scratch without inheriting from a base class:

```typescript
// Register a completely custom "Runecaster" class
manager.register('classes.data', [{
    name: 'Runecaster',
    // No baseClass - must specify everything
    primary_ability: 'WIS',
    hit_die: 8,
    saving_throws: ['WIS', 'CON'],
    is_spellcaster: true,
    skill_count: 3,
    available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
    has_expertise: false,
    // Optional: Audio preferences for class affinity
    audio_preferences: {
        primary: 'folk',
        bass: 0.6,
        treble: 0.7,
        mid: 0.5,
        amplitude: 0.6
    }
}]);

manager.register('classes', [asClass('Runecaster')]);
```

#### Custom Class with Features

Add custom class features to your new class:

```typescript
// Register custom features for Necromancer
manager.register('classFeatures.Necromancer', [
    {
        id: 'necromancer_raise_dead',
        name: 'Raise Undead',
        description: 'Can raise undead creatures to serve you.',
        type: 'active',
        level: 1,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            abilities: { INT: 13 }
        },
        effects: [
            {
                type: 'ability_unlock',
                target: 'raise_undead',
                value: true,
                description: 'Can cast Animate Dead'
            }
        ],
        source: 'custom'
    },
    {
        id: 'necromancer_deadlord',
        name: 'Dead Lord',
        description: 'Control more powerful undead creatures.',
        type: 'passive',
        level: 10,
        class: 'Necromancer',
        prerequisites: {
            class: 'Necromancer',
            level: 10,
            skills: ['necromancy']
        },
        effects: [
            {
                type: 'passive_modifier',
                target: 'undead_control_limit',
                value: 5,
                description: 'Control 5 additional HD of undead'
            }
        ],
        source: 'custom'
    }
], { mode: 'replace' });  // Replace Wizard features entirely
```

#### Custom Class with Skills

Register custom skills for your class:

```typescript
// Register custom skill for Necromancer
manager.register('skills.INT', [{
    id: 'necromancy',
    name: 'Necromancy',
    ability: 'INT',
    description: 'Knowledge of undead creation and control.',
    prerequisites: { class: 'Necromancer' },  // Only for Necromancers
    source: 'custom'
}]);
```

#### Custom Class with Spells

Provide custom spell lists for your spellcasting class:

```typescript
// Register custom spell list for Necromancer
manager.register('classSpellLists.Necromancer', [{
    cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
    spells_by_level: {
        1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
        2: ['Ray of Enfeeblement', 'Web'],
        3: ['Animate Dead', 'Feign Death', 'Speak with Dead'],
        // ... more levels
    }
}]);
```

#### Custom Class with Spell Slots

Define custom spell slot progression:

```typescript
// Register custom spell slot progression
manager.register('classSpellSlots', {
    'Necromancer': {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 },
        // ... more levels
    }
});
```

#### Custom Class with Starting Equipment

Define custom starting equipment:

```typescript
// Register custom starting equipment
manager.register('classStartingEquipment.Necromancer', [{
    weapons: ['Dagger', 'Quarterstaff'],
    armor: [],
    items: ['Component Pouch', 'Spellbook', 'Bone Charm']
}]);
```

#### Generating a Custom Class Character

Generate a character with your custom class:

```typescript
import { CharacterGenerator, getClassData } from 'playlist-data-engine';

// Verify class data
const necromancerData = getClassData('Necromancer');
console.log(necromancerData);
// Output: { name: 'Necromancer', baseClass: 'Wizard', hit_die: 8, ... }

// Generate a character
const character = CharacterGenerator.generate(
    'test-seed',
    sampleAudioProfile,
    'Test Character',
    { forceClass: asClass('Necromancer') }
);

console.log(character.class);  // 'Necromancer'
console.log(character.ability_scores.INT);  // High (primary ability)
console.log(character.class_features);  // ['necromancer_raise_dead']
console.log(character.skills);  // Includes 'necromancy'
```

#### Common Patterns

**Archetype Variant** - Same class, different flavor:
```typescript
{
    name: 'BattleMage',
    baseClass: 'Wizard',
    hit_die: 10,           // More durable than standard Wizard
    saving_throws: ['INT', 'CON'],  // CON instead of WIS
    available_skills: ['arcana', 'athletics', 'intimidation']
}
```

**Multiclass-Inspired** - Two classes combined:
```typescript
{
    name: 'Spellsword',
    baseClass: 'Fighter',
    is_spellcaster: true,  // Add spellcasting
    primary_ability: 'STR',  // Keep Fighter primary
    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation']
}
```

**Specialist** - Narrow focus:
```typescript
{
    name: 'Beastmaster',
    baseClass: 'Ranger',
    skill_count: 3,  // Extra skill for animal handling
    available_skills: ['animal_handling', 'nature', 'survival', 'perception']
}
```

#### Validation Rules

1. **Base class must exist**: `baseClass` must be a valid D&D 5e class name
2. **Custom properties must be valid**: All properties must match expected types
3. **Class name must be registered**: After registering class data, register the class name via `manager.register('classes', [asClass('ClassName')])`
4. **Custom skills must exist**: If referencing custom skills in `available_skills`, register them first

### Spawn Rate Control

Control how often custom content appears in generated characters using spawn rate weights:

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== CLASS FEATURES =====
// Make certain Barbarian features more or less common
manager.setWeights('classFeatures.Barbarian', {
    'rage': 1.0,              // Normal spawn rate (default)
    'dragon_fury': 2.0,       // Twice as likely to appear
    'reckless_attack': 0.5    // Half as likely to appear
});

// ===== RACIAL TRAITS =====
// Control trait spawn rates for Elf
manager.setWeights('racialTraits.Elf', {
    'darkvision': 1.0,        // Always appears (default trait)
    'elf_weapon_training': 0.3,  // 30% of characters get this
    'fey_ancestry': 1.0       // Always appears (default trait)
});

// ===== SKILLS =====
// Control which skills appear during character generation
manager.setWeights('skills', {
    'athletics': 2.0,         // Twice as likely to be selected
    'survival_cold': 0.5,     // Half as likely
    'custom_skill_1': 0.0     // Never spawn (disabled)
});

// Per-ability skill spawn rates
manager.setWeights('skills.WIS', {
    'perception': 1.5,        // More likely for WIS-based characters
    'survival': 0.8,          // Less likely
    'survival_cold': 0.2      // Rare WIS skill
});

// ===== APPEARANCE =====
// Control appearance options
manager.setWeights('appearance.bodyTypes', {
    'athletic': 1.5,          // More common
    'muscular': 1.0,          // Normal
    'slender': 0.8,           // Less common
    'stocky': 0.5             // Rare
});

// ===== EQUIPMENT =====
// Control equipment spawn rates
manager.setWeights('equipment', {
    'Longsword': 1.5,         // More common
    'Dragon Scale Armor': 0.1, // Rare (10% spawn rate)
    'Potion of Healing': 2.0   // Very common
});

// Weight modes: relative vs absolute
manager.register('classFeatures', [customFeature], {
    mode: 'relative',  // Custom weights add to default distribution
    weights: { 'customFeature': 1.0 }
});

manager.register('classFeatures', [customFeature], {
    mode: 'absolute',  // Custom weights replace default distribution
    weights: {
        'rage': 5,
        'customFeature': 3,
        'otherFeature': 2
    }
});

// Get current spawn weights
const currentWeights = manager.getWeights('classFeatures.Barbarian');
console.log('Current Barbarian feature weights:', currentWeights);
```

#### Spawn Rate Modes

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== RELATIVE MODE (default) =====
// Custom weights are added to the default pool
manager.register('skills', [customSkill], {
    mode: 'relative',
    weights: {
        'customSkill': 2.0  // Twice as likely relative to defaults
    }
});

// Result: customSkill competes with default skills
// If default skills have weight 1.0, customSkill at 2.0 is twice as likely

// ===== ABSOLUTE MODE =====
// Custom weights completely replace the default distribution
manager.register('skills', [customSkill1, customSkill2], {
    mode: 'absolute',
    weights: {
        'customSkill1': 7,  // 70% spawn rate
        'customSkill2': 3   // 30% spawn rate
    }
});

// Result: ONLY customSkill1 and customSkill2 can spawn
// Default skills are completely excluded (weight 0)

// ===== DEFAULT MODE =====
// All items have equal probability (ignores custom weights)
manager.register('skills', [customSkill], {
    mode: 'default'
});

// Result: All skills (default + custom) have equal probability
```

#### Advanced Weight Configuration

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// Hierarchical weight system
// Category defaults with individual overrides

// Set default for all skills
manager.setWeights('skills', {
    default: 1.0  // All skills have equal weight by default
});

// Override specific skills
manager.setWeights('skills', {
    'athletics': 2.0,      // Override: athletics is now 2x
    'acrobatics': 0.5,     // Override: acrobatics is now 0.5x
    // All other skills remain at 1.0 (the default)
});

// Per-class skill spawn rates
manager.setWeights('skillLists.Barbarian', {
    'athletics': 2.0,      // Barbarians favor athletics
    'survival': 1.5,       // And survival
    'arcana': 0.2          // But rarely get arcana
});

manager.setWeights('skillLists.Wizard', {
    'arcana': 2.0,         // Wizards favor arcana
    'history': 1.5,        // And history
    'athletics': 0.2       // But rarely get athletics
});

// Zero weight = never spawn
manager.setWeights('classFeatures.Barbarian', {
    'useless_feature': 0.0  // This feature will never spawn
});

// Reset to defaults
manager.reset('classFeatures.Barbarian');
// Now all Barbarian features are back to equal probability

// Reset all categories
manager.resetAll();
```

#### Complete Custom Content Pack Example

```typescript
import { ExtensionManager, FeatureRegistry, SkillRegistry } from 'playlist-data-engine';

// Create an expansion pack with custom features, skills, and spawn rates
function registerArcticExpansionPack() {
    const manager = ExtensionManager.getInstance();
    const featureRegistry = FeatureRegistry.getInstance();
    const skillRegistry = SkillRegistry.getInstance();

    // ===== CUSTOM FEATURES =====
    const frostRage = {
        id: 'frost_rage',
        name: 'Frost Rage',
        description: 'Your rage radiates cold, dealing extra cold damage.',
        type: 'active',
        level: 3,
        class: 'Barbarian',
        effects: [
            {
                type: 'resource_grant',
                target: 'cold_damage_bonus',
                value: 3,
                description: '+3 cold damage while raging'
            }
        ],
        source: 'custom'
    };

    const snowWalker = {
        id: 'snow_walker',
        name: 'Snow Walker',
        description: 'You move through snow and ice without penalty.',
        type: 'passive',
        level: 1,
        class: 'Ranger',
        race: 'Human',
        effects: [
            {
                type: 'ability_unlock',
                target: 'snow_movement',
                value: true,
                description: 'No movement penalty in snow/ice'
            },
            {
                type: 'passive_modifier',
                target: 'survival_cold_bonus',
                value: 5,
                description: '+5 Survival in cold environments'
            }
        ],
        source: 'custom'
    };

    // ===== CUSTOM SKILLS =====
    const coldSurvival = {
        id: 'survival_cold',
        name: 'Survival (Cold Environments)',
        description: 'Expertise in cold weather survival.',
        ability: 'WIS',
        armorPenalty: true,
        categories: ['exploration', 'environmental'],
        source: 'custom'
    };

    const iceFishing = {
        id: 'ice_fishing',
        name: 'Ice Fishing',
        description: 'Ability to catch fish in frozen waters.',
        ability: 'WIS',
        armorPenalty: false,
        categories: ['exploration', 'survival'],
        source: 'custom'
    };

    // ===== REGISTER EVERYTHING =====
    // Features
    featureRegistry.registerClassFeatures([frostRage, snowWalker]);
    manager.register('classFeatures.Barbarian', [frostRage], {
        weights: { 'frost_rage': 0.5 }  // Rare feature
    });
    manager.register('classFeatures.Ranger', [snowWalker], {
        weights: { 'snow_walker': 0.7 }
    });

    // Skills
    skillRegistry.registerSkills([coldSurvival, iceFishing]);
    manager.register('skills', [coldSurvival, iceFishing]);
    manager.register('skills.WIS', [coldSurvival, iceFishing], {
        weights: {
            'survival_cold': 0.5,  // Less common than default skills
            'ice_fishing': 0.3      // Quite rare
        }
    });

    // ===== SPAWN RATE CONFIGURATION =====
    // Make cold-themed content more likely for certain classes
    manager.setWeights('skillLists.Ranger', {
        'survival_cold': 2.0,  // Rangers love this skill
        'ice_fishing': 1.5
    });

    manager.setWeights('skillLists.Barbarian', {
        'survival_cold': 1.5,  // Barbarians also get this
        'ice_fishing': 0.5
    });

    console.log('Arctic Expansion Pack registered!');
}

// Register the expansion pack
registerArcticExpansionPack();

// Generate characters with the new content
const character = CharacterGenerator.generate(seed, audio, 'Arctic Hero');
// Character may now have frost_rage, snow_walker, or survival_cold skill!
```

### Skills with Prerequisites

Skills can have prerequisites that must be met before a character can gain proficiency in them. This allows for advanced skills that require base skills, specific features, spells, ability scores, level, class, or race.

```typescript
import { SkillRegistry, SkillValidator, CharacterGenerator } from 'playlist-data-engine';

const registry = SkillRegistry.getInstance();

// ===== SKILL WITH FEATURE PREREQUISITES =====
// Dragon Smithing: Requires Draconic Bloodline feature
const dragonSmithing: CustomSkill = {
    id: 'dragon_smithing',
    name: 'Dragon Smithing',
    description: 'Craft weapons from dragon scales',
    ability: 'INT',
    prerequisites: {
        features: ['draconic_bloodline'],  // Requires Sorcerer feature
        level: 5,
        class: 'Sorcerer'
    },
    source: 'custom'
};

registry.registerSkill(dragonSmithing);

// ===== SKILL WITH ABILITY SCORE AND SKILL PREREQUISITES =====
// Advanced Arcana: Requires INT 16 and proficiency in Arcana
const advancedArcana: CustomSkill = {
    id: 'advanced_arcana',
    name: 'Advanced Arcana',
    description: 'Cast complex spells and understand magical theory',
    ability: 'INT',
    prerequisites: {
        abilities: { INT: 16 },  // Requires INT 16 or higher
        skills: ['arcana'],       // Must already know Arcana
        level: 7
    },
    source: 'custom'
};

registry.registerSkill(advancedArcana);

// ===== SKILL WITH SPELL PREREQUISITES =====
// Spell Mastery: Requires knowing specific spells first
const spellMasterySkill: CustomSkill = {
    id: 'spell_mastery',
    name: 'Spell Mastery',
    description: 'Improved control over known spells',
    ability: 'INT',
    prerequisites: {
        spells: ['Fireball', 'Lightning Bolt'],  // Must know these spells
        class: 'Wizard',
        level: 10
    },
    source: 'custom'
};

registry.registerSkill(spellMasterySkill);

// ===== SKILL WITH RACE PREREQUISITES =====
// Dwarven Combat Training: Dwarf only
const dwarvenCombat: CustomSkill = {
    id: 'dwarven_warfare',
    name: 'Dwarven Warfare',
    description: 'Advanced dwarven combat techniques',
    ability: 'STR',
    prerequisites: {
        race: 'Dwarf'
    },
    source: 'custom'
};

registry.registerSkill(dwarvenCombat);

// ===== VALIDATING SKILL PREREQUISITES =====
// Check if a character meets the requirements
const character = CharacterGenerator.generate(seed, audioProfile, 'Hero');
const skill = registry.getSkill('dragon_smithing');

if (skill && skill.prerequisites) {
    const result = SkillValidator.validateSkillPrerequisites(skill, character);

    if (!result.valid) {
        console.log('Unmet prerequisites:', result.unmet);
        // Output example: ["Requires feature: draconic_bloodline", "Requires level 5 (current: 1)"]
    }
}

// Skills with unmet prerequisites are automatically
// filtered out during character generation
```

### Spells with Prerequisites

Spells can have prerequisites that must be met before a spellcaster can learn them. This allows for specialized spells that require specific features, abilities, spells, skills, level, or class.

```typescript
import { SpellValidator, SpellManager, ExtensionManager } from 'playlist-data-engine';

// ===== SPELL WITH FEATURE PREREQUISITES =====
// Dragon Breath: Requires Draconic Bloodline feature
const dragonBreath = {
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
};

// ===== SPELL WITH LEVEL AND CLASS PREREQUISITES =====
// Meteor Swarm: High-level evocation spell
const limitedMeteorSwarm = {
    id: 'limited_meteor_swarm',
    name: 'Meteor Swarm',
    level: 9,
    school: 'Evocation',
    casting_time: '1 action',
    range: '1 mile',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: 'Blazing orbs rain down',
    prerequisites: {
        level: 17,  // Character must be level 17+
        class: 'Wizard',
        spells: ['Fireball']  // Must know Fireball first
    }
};

// ===== SPELL WITH SKILL PREREQUISITES =====
// Arcane Sword: Requires Arcana proficiency
const arcaneSwordSpell = {
    id: 'arcane_sword',
    name: 'Arcane Sword',
    level: 5,
    school: 'Evocation',
    casting_time: '1 bonus action',
    range: '60 ft',
    components: ['V', 'S', 'M'],
    duration: 'Concentration, 1 minute',
    description: 'Summon a sword of pure magic',
    prerequisites: {
        skills: ['arcana']  // Requires Arcana proficiency
    }
};

// ===== REGISTER CUSTOM SPELLS =====
const manager = ExtensionManager.getInstance();
manager.register('spells', [dragonBreath, limitedMeteorSwarm, arcaneSwordSpell]);

// ===== VALIDATE SPELL PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Sorcerer');
const spell = SPELL_DATABASE['dragon_breath'];

if (spell.prerequisites) {
    const result = SpellValidator.validateSpellPrerequisites(spell, character);

    if (!result.valid) {
        console.log('Cannot learn this spell:', result.unmet);
    }
}

// During character generation, SpellManager automatically filters
// out spells that have unmet prerequisites
const knownSpells = SpellManager.getKnownSpells(
    character.class,
    character.level,
    character  // Pass character for prerequisite filtering
);
// Only includes spells whose prerequisites are met
```

### Custom Races with Subraces

The engine supports fully extensible custom races with optional subrace variants. Register custom race data and the engine will validate and use it during character generation.

```typescript
import { ExtensionManager } from 'playlist-data-engine';

const manager = ExtensionManager.getInstance();

// ===== REGISTER CUSTOM RACE WITH SUBRACES =====
// Step 1: Register the race name
manager.register('races', ['Dragonkin'], { validate: true });

// Step 2: Register the race data (ability bonuses, speed, traits, subraces)
manager.register('races.data', [{
    race: 'Dragonkin',
    ability_bonuses: { STR: 2, CON: 1, CHA: 1 },
    speed: 30,
    traits: ['Draconic Ancestry', 'Darkvision'],
    subraces: ['Fire Dragonkin', 'Ice Dragonkin', 'Lightning Dragonkin']
}]);

// ===== REGISTER SUBRACE-SPECIFIC TRAITS =====
// Fire Dragonkin only
manager.register('racialTraits', [{
    id: 'fire_dragonkin_resistance',
    name: 'Fire Resistance',
    description: 'Resistance to fire damage',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',  // Only for this subrace
    effects: [
        { type: 'passive_modifier', target: 'fire_resistance', value: true }
    ],
    source: 'custom'
}]);

// Ice Dragonkin only
manager.register('racialTraits', [{
    id: 'ice_dragonkin_resistance',
    name: 'Cold Resistance',
    description: 'Resistance to cold damage',
    race: 'Dragonkin',
    subrace: 'Ice Dragonkin',
    effects: [
        { type: 'passive_modifier', target: 'cold_resistance', value: true }
    ],
    source: 'custom'
}]);

// ===== GENERATE CHARACTER WITH SUBRACE =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Pyro');
// After generation, set the subrace
character.subrace = 'Fire Dragonkin';

// Character will have:
// - Base Dragonkin traits (Draconic Ancestry, Darkvision)
// - Subrace-specific traits (Fire Resistance)
// - Correct ability bonuses (STR+2, CON+1, CHA+1)

// ===== FEATURE WITH SUBRACE PREREQUISITE =====
// Trait that requires a specific subrace
manager.register('racialTraits', [{
    id: 'inferno_breath',
    name: 'Inferno Breath',
    description: 'Breathe fire like a true red dragon',
    race: 'Dragonkin',
    subrace: 'Fire Dragonkin',
    prerequisites: {
        subrace: 'Fire Dragonkin',  // Must be Fire Dragonkin
        level: 5
    },
    effects: [
        { type: 'active_ability', target: 'fire_breath', value: '6d6' }
    ],
    source: 'custom'
}]);
```

**Type Augmentation for Custom Races:**

Since `Race` is a closed union, extend it in your project:

```typescript
// In your project's global types file
import 'playlist-data-engine';

declare module 'playlist-data-engine' {
    type Race =
        | 'Human' | 'Elf' | 'Dwarf'
        | 'Dwarf' | 'Halfling' | 'Dragonborn' | 'Gnome'
        | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
        | 'Dragonkin';  // Custom race
}

// Now TypeScript accepts 'Dragonkin' as a valid Race
const dragonkinCharacter: CharacterSheet = {
    // ...
    race: 'Dragonkin'  // No TypeScript error!
};
```

### Features with Skill/Spell Prerequisites

Class features can now require skills or spells as prerequisites, in addition to the existing support for features, abilities, level, class, and race.

```typescript
import { FeatureRegistry, FeatureValidator } from 'playlist-data-engine';

const registry = FeatureRegistry.getInstance();

// ===== FEATURE REQUIRING SKILL PROFICIENCY =====
// Arcane Smith: Requires Arcana skill proficiency
const arcaneSmith = {
    id: 'arcane_smith',
    name: 'Arcane Smith',
    description: 'Can enchant magical items',
    type: 'passive',
    level: 7,
    class: 'Wizard',
    prerequisites: {
        skills: ['arcana'],  // Requires Arcana proficiency
        level: 7
    },
    effects: [
        { type: 'ability_unlock', target: 'item_enchantment', value: true }
    ],
    source: 'custom'
};

registry.registerClassFeature(arcaneSmith);

// ===== FEATURE REQUIRING SPELL KNOWLEDGE =====
// Spellblade: Requires knowing specific spells
const spellblade = {
    id: 'spellblade',
    name: 'Spellblade',
    description: 'Channel spells through your weapon',
    type: 'active',
    level: 10,
    class: 'Eldritch Knight',
    prerequisites: {
        spells: ['Green-Flame Blade', 'Booming Blade'],
        features: ['weapon_bond']
    },
    effects: [
        { type: 'passive_modifier', target: 'spell_strike_damage', value: 4 }
    ],
    source: 'custom'
};

registry.registerClassFeature(spellblade);

// ===== RACIAL TRAIT WITH SKILL PREREQUISITES =====
// Elven Battle Training: Requires proficiency in a combat skill
const elvenBattleTraining = {
    id: 'elven_battle_training',
    name: 'Elven Battle Training',
    description: 'Advanced elven combat techniques',
    type: 'active',
    race: 'Elf',
    prerequisites: {
        skills: ['athletics', 'perception'],  // Must have both skills
        level: 3
    },
    effects: [
        { type: 'passive_modifier', target: 'initiative', value: 2 }
    ],
    source: 'custom'
};

registry.registerRacialTrait(elvenBattleTraining);

// ===== VALIDATE FEATURE PREREQUISITES =====
const character = CharacterGenerator.generate(seed, audioProfile, 'Elf Warrior');
const feature = registry.getClassFeature('arcane_smith', character.level, character.class);

if (feature && feature.prerequisites) {
    const result = FeatureValidator.validatePrerequisites(feature.prerequisites, character);

    if (!result.valid) {
        console.log('Cannot learn feature:', result.unmet);
    }
}

// Features with unmet prerequisites are automatically
// excluded during character generation
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
const result = EquipmentEffectApplier.equipItem(character, equipment, 'instance_123');

// Unequip item - removes all effects
EquipmentEffectApplier.unequipItem(character, 'Flaming Sword', 'instance_123');
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
- `FeatureValidator` - Validate feature data structures
- `SkillValidator` - Validate skill data structures
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
- `FeaturePrerequisite` - Prerequisite validation (level, abilities, class, race, feature chains)
- `ExtensionCategory` - All extensible categories (classFeatures, racialTraits, skills, equipment, appearance, etc.)

**Equipment System Types (NEW):**
- `EnhancedEquipment` - Full equipment definition with properties, features, skills, spells
- `EquipmentProperty` - Individual equipment property (stat_bonus, skill_proficiency, ability_unlock, passive_modifier, special_property, damage_bonus, spell_grant, stat_requirement)
- `EquipmentCondition` - Property conditions (vs_creature_type, at_time_of_day, wielder_race, wielder_class, while_equipped, on_hit, on_damage_taken, custom)
- `EquipmentModification` - Runtime enchantment, curse, or upgrade
- `EnhancedInventoryItem` - Inventory item with per-instance modifications
- `EquipmentMiniFeature` - Inline equipment-specific feature definition
- `SpawnRandomOptions` - Options for random equipment spawning
- `TreasureHoardResult` - Treasure hoard with items and estimated value

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

