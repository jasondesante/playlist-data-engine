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

