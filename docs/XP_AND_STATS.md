# XP Leveling and Stats Reference

Complete guide to XP, leveling, and stats in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [XP and Leveling](#xp-and-leveling)
2. [Track Mastery Prestige System](#track-mastery-prestige-system)
3. [Stat Strategies](#stat-strategies)
4. [XP Scaling](#xp-scaling)
5. [Progression Configuration](#progression-configuration)

---

## XP and Leveling


### Earning XP from Listening to Music

Track a listening session, calculate XP earned with modifiers, and apply it to your character. Level-ups happen automatically when XP thresholds are reached.

```typescript
import {
  SessionTracker,
  XPCalculator,
  CharacterUpdater,
  MasterySystem
} from 'playlist-data-engine';

// ===== STEP 1: TRACK LISTENING SESSIONS =====
const tracker = new SessionTracker();

// Start a session - returns a sessionId (required for ending the session)
const sessionId = tracker.startSession(track.id, track);

// ... user listens to a track for 300 seconds (5 minutes) ...

// End the session - requires the sessionId returned from startSession()
const session = tracker.endSession(sessionId);

if (session) {
  // ===== STEP 2: CALCULATE XP WITH MODIFIERS =====
  const xpCalc = new XPCalculator();

  // Base XP: 1 XP per second of listening
  const baseXP = session.duration; // 300 seconds = 300 base XP

  // Environmental modifiers (examples):
  // - Running: 1.5x | Walking: 1.2x | Night time: 1.25x
  // - Extreme weather: 1.4x | High altitude (≥2000m): 1.3x

  // Gaming modifiers (examples):
  // - Base gaming bonus: +0.25x
  // - RPG game: +0.20x | Action/FPS: +0.15x | Multiplayer: +0.15x
  // - Long session (4+ hours): up to +0.20x

  // Total calculation is capped at 3.0x multiplier
  // Example: Running (1.5x) + Playing RPG (1.75x) = 2.625x total
  const totalXP = xpCalc.calculateSessionXP(session, track);

  // ===== STEP 3: APPLY SESSION TO CHARACTER =====
  const updater = new CharacterUpdater();
  const previousListenCount = tracker.getTrackListenCount(track.id) - 1;
  const result = updater.updateCharacterFromSession(character, session, track, previousListenCount);

  // ===== STEP 4: BASIC LEVEL-UP HANDLING =====
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

#### Comprehensive Level-Up Celebration & Multi-Source XP System

The `levelUpDetails` returned by both `updateCharacterFromSession()` and `addXP()` contains everything you need for that "LEVELED UP!" celebration experience. Whether XP comes from music listening, combat, quests, or custom activities, the level-up system works identically.

```typescript
import { CharacterUpdater } from 'playlist-data-engine';

const updater = new CharacterUpdater();

// ===== LEVEL-UP CELEBRATION FUNCTION (Reusable) =====
function celebrateLevelUp(result: LevelUpResult, source: string) {
    if (!result.leveledUp) return;

    console.log(`🎉 LEVELED UP from ${source}!`);
    console.log(`🎉 Level ${result.levelUpDetails![0].fromLevel} → ${result.newLevel}!`);

    // Handle multiple level-ups (e.g., boss rewards)
    console.log(`Gained ${result.levelUpDetails?.length} level(s) at once!`);

    for (const detail of result.levelUpDetails!) {
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

// ===== MUSIC LISTENING XP =====
// Follow the same pattern from "Earning XP from Listening to Music" above
// The celebrateLevelUp() function works identically for all XP sources
const musicResult = updater.updateCharacterFromSession(character, session, track, listenCount);
celebrateLevelUp(musicResult, 'Music Session');

// ===== COMBAT XP =====
// Award XP for defeating enemies
const combatResult = updater.addXP(character, 500, 'combat');
celebrateLevelUp(combatResult, 'Combat');

// ===== QUEST COMPLETION XP =====
// Award XP for completing quests
const questResult = updater.addXP(character, 1000, 'quest');
celebrateLevelUp(questResult, 'Quest Complete');
console.log(`Earned ${questResult.xpEarned} XP.`);

// ===== CUSTOM ACTIVITY XP =====
// Award XP for exploration, crafting, social interactions, etc.
const explorationResult = updater.addXP(character, 250, 'exploration');
const craftingResult = updater.addXP(character, 150, 'crafting');
const socialResult = updater.addXP(character, 100, 'social');

// ===== MASSIVE XP REWARD (Boss/Milestone) =====
// Boss defeated or major milestone - can trigger multiple level-ups at once!
const bossResult = updater.addXP(character, 10000, 'boss_defeat');
console.log(`🎉🎉🎉 BOSS DEFEATED!`);
celebrateLevelUp(bossResult, 'Boss Defeat'); // Reuses the celebration function from above

// ===== XP SOURCE TRACKING =====
// Track where XP came from for analytics/achievements
// Note: XPSource is a custom application-level type (not from the engine)
// Define it yourself based on your tracking needs:
const xpHistory: Array<{ source: string; amount: number; timestamp: number }> = [];

function addXPWithTracking(character: CharacterSheet, amount: number, source: string) {
    const result = updater.addXP(character, amount, source);

    // Track the XP source
    xpHistory.push({
        source,
        amount,
        timestamp: Date.now()
    });

    celebrateLevelUp(result, source);
    return result;
}

// Usage with tracking
addXPWithTracking(character, 500, 'combat');
addXPWithTracking(character, 1000, 'quest_main');
addXPWithTracking(character, 250, 'side_quest');

// Later, analyze where XP came from
const combatXP = xpHistory
    .filter(h => h.source.startsWith('combat'))
    .reduce((sum, h) => sum + h.amount, 0);

const questXP = xpHistory
    .filter(h => h.source.startsWith('quest'))
    .reduce((sum, h) => sum + h.amount, 0);

console.log(`Total Combat XP: ${combatXP}, Total Quest XP: ${questXP}`);
```

**Type Reference:**
- `CharacterUpdateResult` - Return type from `updateCharacterFromSession()` and `addXP()` - [*src/core/progression/CharacterUpdater.ts*](src/core/progression/CharacterUpdater.ts)
- `LevelUpDetail` - Contains `fromLevel`, `toLevel`, `hpIncrease`, `statIncreases`, etc. - [*src/core/types/Progression.ts*](src/core/types/Progression.ts)

**All XP Sources Return the Same Detailed Breakdown:**

| Source | Method | XP Calculation | Level-Up Details |
|--------|--------|----------------|------------------|
| Music Listening | `updateCharacterFromSession()` | Duration × modifiers | ✅ Full breakdown |
| Combat | `addXP()` | Direct amount | ✅ Full breakdown |
| Quests | `addXP()` | Direct amount | ✅ Full breakdown |
| Custom Activities | `addXP()` | Direct amount | ✅ Full breakdown |

**Level-Up Result Properties:**
- `leveledUp` - Whether character leveled up
- `newLevel` - New level (if leveled up)
- `levelUpDetails` - Array of HP, stat, feature, and spell slot changes
- `xpEarned` - Amount of XP earned
- `masteredTrack` - (Music only) Whether track was mastered
- `masteryBonusXP` - (Music only) Bonus XP from mastery


## Track Mastery Prestige System

The prestige system allows players to reset their character after mastering a track (meeting BOTH plays AND XP thresholds) in exchange for a visual badge upgrade. Higher prestige levels require more plays and XP.

**Key Features:**
- 10 prestige levels (Roman numerals I-X)
- Dual requirements: plays AND XP (prevents "cheesing" via play/pause spam)
- 1.5x scaling per level (10 plays + 1,000 XP at base, up to 584 plays + 57,666 XP at max)
- Character resets to level 1, but equipment is preserved

### Checking Prestige Eligibility

```typescript
import {
  SessionTracker,
  CharacterUpdater,
  PrestigeSystem,
  type PrestigeLevel
} from 'playlist-data-engine';

const tracker = new SessionTracker();
const updater = new CharacterUpdater();

// Get character's current prestige level
const prestigeLevel: PrestigeLevel = character.prestige_level ?? 0;

// Get track progress
const listenCount = tracker.getTrackListenCount(track.id);
const totalXP = tracker.getTrackXPTotal(track.id);

// Check if character can prestige
const canPrestige = PrestigeSystem.canPrestige(prestigeLevel, listenCount, totalXP);

if (canPrestige) {
  console.log(`✅ Character can prestige!`);
}

// Get full prestige info for UI display
const info = PrestigeSystem.getPrestigeInfo(prestigeLevel, listenCount, totalXP);
console.log(`Plays: ${info.currentPlays}/${info.playsThreshold} (${Math.round(info.playsProgress * 100)}%)`);
console.log(`XP: ${info.currentXP}/${info.xpThreshold} (${Math.round(info.xpProgress * 100)}%)`);
console.log(`Mastered: ${info.isMastered}`);
console.log(`Can Prestige: ${info.canPrestige}`);
console.log(`Max Prestige: ${info.isMaxPrestige}`);
```

### Executing Prestige

```typescript
import {
  SessionTracker,
  CharacterUpdater,
  AudioAnalyzer,
  CharacterGenerator
} from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const tracker = new SessionTracker();
const updater = new CharacterUpdater();

// Get audio profile for regeneration
const audioProfile = await analyzer.extractSonicFingerprint(track.audio_url);

// Execute prestige (resets character to level 1, preserves equipment)
const result = updater.resetCharacterForPrestige(
  character,
  tracker,       // SessionTracker to clear track sessions
  track.id,      // Track UUID
  audioProfile,  // For character regeneration
  track          // Track metadata
);

if (result.success) {
  // Update your character state with the regenerated character
  character = (result as any).character;

  console.log(result.message);
  // "Successfully prestiged to level I! New mastery requirements: 15 plays, 1,500 XP"

  console.log(`New prestige level: ${PrestigeSystem.toRomanNumeral(result.newPrestigeLevel)}`);
  console.log(`Previous level: ${PrestigeSystem.toRomanNumeral(result.previousPrestigeLevel)}`);
} else {
  console.log(`Prestige failed: ${result.message}`);
}
```

### Displaying Prestige-Aware Mastery Progress

```typescript
import { PrestigeSystem, type PrestigeLevel } from 'playlist-data-engine';

// Get character's prestige level (defaults to 0)
const prestigeLevel: PrestigeLevel = character.prestige_level ?? 0;

// Get progress info
const listenCount = tracker.getTrackListenCount(track.id);
const totalXP = tracker.getTrackXPTotal(track.id);
const info = PrestigeSystem.getPrestigeInfo(prestigeLevel, listenCount, totalXP);

// Display in UI
const prestigeRoman = PrestigeSystem.toRomanNumeral(prestigeLevel);
const playsPercent = Math.round(info.playsProgress * 100);
const xpPercent = Math.round(info.xpProgress * 100);

console.log(`Prestige ${prestigeRoman || 'None'}`);
console.log(`Plays: ${info.currentPlays}/${info.playsThreshold} (${playsPercent}%)`);
console.log(`XP: ${info.currentXP.toLocaleString()}/${info.xpThreshold.toLocaleString()} (${xpPercent}%)`);

// Check if both requirements are met (mastered)
if (info.isMastered) {
  console.log(`🎉 Track Mastered!`);

  // Can they prestige?
  if (info.canPrestige) {
    const nextLevel = PrestigeSystem.getNextPrestigeLevel(prestigeLevel);
    console.log(`Ready to prestige to ${PrestigeSystem.toRomanNumeral(nextLevel!)}!`);
  }

  // Are they at max prestige?
  if (info.isMaxPrestige) {
    console.log(`⭐ Maximum Prestige Achieved!`);
  }
}
```

### Setting Custom Thresholds

For special cases (events, difficulty adjustments), you can override the default thresholds:

```typescript
import { PrestigeSystem } from 'playlist-data-engine';

// Set custom thresholds for prestige level 5
PrestigeSystem.setCustomThresholds(5, {
  playsThreshold: 100,   // Override calculated 77
  xpThreshold: 10000     // Override calculated 7,594
});

// Set only plays threshold (XP uses calculated value)
PrestigeSystem.setCustomThresholds(3, {
  playsThreshold: 50
});

// Reset plays to calculated value
PrestigeSystem.setCustomThresholds(3, {
  playsThreshold: null
});

// Check if custom thresholds exist
const hasCustom = PrestigeSystem.hasCustomThresholds(5);

// Get custom thresholds
const custom = PrestigeSystem.getCustomThresholds(5);

// Clear custom thresholds for specific level
PrestigeSystem.clearCustomThresholds(5);

// Clear all custom thresholds
PrestigeSystem.clearCustomThresholds();

// View all threshold values (for debugging/display)
const allThresholds = PrestigeSystem.getAllThresholds();
allThresholds.forEach(t => {
  console.log(`Prestige ${t.level}: ${t.plays} plays, ${t.xp} XP`);
});
```

### Threshold Reference

| Prestige | Plays | XP |
|----------|-------|-----|
| 0 | 10 | 1,000 |
| I | 15 | 1,500 |
| II | 23 | 2,250 |
| III | 34 | 3,375 |
| IV | 51 | 5,063 |
| V | 77 | 7,594 |
| VI | 115 | 11,391 |
| VII | 173 | 17,086 |
| VIII | 259 | 25,629 |
| IX | 389 | 38,444 |
| X (max) | 584 | 57,666 |


## Stat Strategies

### Level-Up with Stat Increases

Stats increase on level-up at levels 4, 8, 12, 16, and 19 (standard mode) or every level (uncapped mode) following D&D 5e rules.

```typescript
import {
    StatManager,
    CharacterUpdater,
    CharacterGenerator,
    LevelUpProcessor
} from 'playlist-data-engine';

// ===== GAME MODE SELECTION =====
// Standard mode (default): D&D 5e rules - stats capped at 20, increases at levels 4, 8, 12, 16, 19
// Uses MANUAL stat selection (2-step level-up process)
const standardCharacter = CharacterGenerator.generate(
    seed,
    audioProfile,
    track,
    { gameMode: 'standard' }  // Optional, this is the default
);

// Uncapped mode: No stat limits, stat increases EVERY level (unlimited)
// Uses AUTOMATIC stat selection (1-step level-up process)
const uncappedCharacter = CharacterGenerator.generate(
    seed,
    audioProfile,
    track,
    { gameMode: 'uncapped' }
);

// ===== STRATEGY QUICK REFERENCE =====
// All stat strategies use the same pattern - just change the strategy parameter:
//
// const statManager = new StatManager({ strategy: /* your choice here */ });
// const updater = new CharacterUpdater(statManager);
//
// Available strategies:
//   • 'dnD5e' (manual)         - Player chooses stats at level-up (2-step process)
//   • 'dnD5e_smart' (auto)     - Intelligently selects based on class primary ability
//   • 'balanced' (auto)        - Distributes evenly across all stats
//   • Custom function          - Your own formula (see OPTION 6 below)
//
// Then use updater.addXP() - level-ups will use your chosen strategy automatically

// ===== OPTION 1: Auto-Detected Strategy (Recommended) =====
// CharacterUpdater automatically detects strategy based on gameMode - no StatManager needed!
const updater = new CharacterUpdater();

// Standard mode: 2-step level-up (manual stat selection required)
const standardResult = updater.addXP(standardCharacter, 6500, 'quest');
console.log(`Leveled up to ${standardResult.newLevel}!`);

if (updater.hasPendingStatIncreases(standardCharacter)) {
    const count = updater.getPendingStatIncreaseCount(standardCharacter);
    console.log(`${count} stat increases pending! Player must choose.`);

    // Player chooses +2 to STR
    const completeResult = updater.applyPendingStatIncrease(standardCharacter, 'STR');
    console.log(`STR: ${completeResult.statIncreases[0].oldValue} → ${completeResult.statIncreases[0].newValue}`);

    // Or player chooses +1 to STR and +1 to DEX
    const result2 = updater.applyPendingStatIncrease(standardCharacter, 'STR', ['DEX']);
}

// Uncapped mode: 1-step level-up (automatic stat selection)
const uncappedResult = updater.addXP(uncappedCharacter, 6500, 'quest');
console.log(`Leveled up to ${uncappedResult.newLevel}!`);
console.log(`Stats auto-increased: ${JSON.stringify(uncappedResult.levelUpDetails?.[0].statIncreases)}`);

// ===== OPTION 2: Manual Stat Selection =====
// Two approaches for the same end result - choose based on your needs:

// APPROACH A: CharacterUpdater (Recommended)
// Higher-level API - handles XP, level-up, and pending stats together
const manualStatManager = new StatManager({ strategy: 'dnD5e' });
const manualUpdater = new CharacterUpdater(manualStatManager);

const manualResult = manualUpdater.addXP(character, 6500, 'quest');

if (manualUpdater.hasPendingStatIncreases(character)) {
    // Show UI to get player choice (returns 'STR' or ['DEX', 'CON'])
    const playerChoice = await showStatSelectionUI();

    const completeResult = manualUpdater.applyPendingStatIncrease(
        character,
        playerChoice.primary,
        playerChoice.secondary
    );
    console.log(`Stats increased: ${completeResult.statIncreases.map(s => s.ability).join(', ')}`);
}

// APPROACH B: LevelUpProcessor (Advanced)
// Lower-level API - complete control over two-phase level-up process
// Phase 1: Process HP/proficiency benefits
// Phase 2: Apply stats after player choice
const statManager = new StatManager();
const statIncreaseLevels = [4, 8, 12, 16, 19];
const newLevel = character.level + 1;

// Phase 1: Process level-up benefits first
const benefits = LevelUpProcessor.processLevelUp(character, newLevel, character.seed);
character = LevelUpProcessor.applyLevelUp(character, benefits);

// Phase 2: Get player choice and apply stats
if (statIncreaseLevels.includes(newLevel)) {
    const playerChoice = await showStatSelectionUI();
    const statResult = statManager.processLevelUp(character, newLevel, {
        forcedAbilities: playerChoice
    });

    character = statResult.character;
    console.log(`Stat increased: ${statResult.increases[0].ability} +${statResult.increases[0].delta}`);
}

// ===== OPTION 3: Smart Auto-Selection (Force Auto Mode) =====
// Automatically picks best stats based on class and current scores - no player input needed
// Intelligently selects based on:
// - Class primary ability (Fighter → STR/DEX, Wizard → INT, etc.)
// - Current stat values (boosts lowest relevant stat if primary is high)
// - D&D 5e rules (+2 to one, or +1 to two)
const smartStatManager = new StatManager({
    strategy: 'dnD5e_smart'
});
const smartUpdater = new CharacterUpdater(smartStatManager);

const smartResult = smartUpdater.addXP(character, 6500, 'quest');
console.log(`Leveled up to ${smartResult.newLevel}! Stats auto-increased.`);

// ===== OPTION 4: Item-Based Stat Changes (Potions, Curses, Restorations) =====
const itemStatManager = new StatManager();

// Potion of Strength: +4 STR (temporary or permanent based on your game logic)
const potionResult = itemStatManager.increaseStats(
    character,
    [{ ability: 'STR', amount: 4 }],
    'item'
);

character = potionResult.character;

// Check if stat was capped at 20 (standard mode)
if (potionResult.capped.length > 0) {
    console.log('Stat was capped at 20!');
}

// Check what actually increased
for (const inc of potionResult.increases) {
    console.log(`${inc.ability}: ${inc.oldValue} → ${inc.newValue} (+${inc.delta})`);
}

// Curse of Weakness: -2 STR penalty
const curseResult = itemStatManager.decreaseStats(
    character,
    [{ ability: 'STR', amount: 2 }],
    'event'
);

character = curseResult.character;

// Poison: -1 DEX, -1 CON
const poisonResult = itemStatManager.decreaseStats(
    character,
    [
        { ability: 'DEX', amount: 1 },
        { ability: 'CON', amount: 1 }
    ],
    'event'
);

// Remove curse with restoration potion
const restoreResult = itemStatManager.increaseStats(
    character,
    [{ ability: 'STR', amount: 2 }],
    'item'
);

// ===== OPTION 5: Change Strategy Mid-Game =====
// Start with manual selection (early game), switch to auto later
const flexibleManager = new StatManager();

// Early game: Player chooses manually
const earlyGame = flexibleManager.processLevelUp(character, 4, {
    forcedAbilities: ['STR']
});

// Mid-game: Switch to smart auto-selection (e.g., after level 10)
flexibleManager.updateConfig({
    strategy: 'dnD5e_smart'
});

// Level-ups are now automatic - no manual input needed
const midGame = flexibleManager.processLevelUp(character, 11);

// Late-game: Switch to balanced strategy
flexibleManager.updateConfig({
    strategy: 'balanced'
});

// ===== OPTION 6: Custom Level-Up Formula =====
// Provide your own formula for stat selection (perfect for custom game mechanics!)
// Example: Tank build that always prioritizes CON first, then DEX
const tankStrategy = (character, amount, options) => {
    if (character.ability_scores.CON < 18) {
        return [{ ability: 'CON', amount }];
    }
    return [{ ability: 'DEX', amount }];
};

// Use the pattern from Strategy Quick Reference above
const customStatManager = new StatManager({ strategy: tankStrategy });
const customUpdater = new CharacterUpdater(customStatManager);
const customResult = customUpdater.addXP(character, 6500, 'quest');
```

### Game Mode Comparison

```typescript
// Standard mode (D&D 5e rules)
const standard = CharacterGenerator.generate(seed, audioProfile, track, { gameMode: 'standard' });
// Stats capped at 20, stat increases at levels 4, 8, 12, 16, 19

// Uncapped mode (epic progression - unlimited levels)
const uncapped = CharacterGenerator.generate(seed, audioProfile, track, { gameMode: 'uncapped' });
// No stat cap, stat increases EVERY level (unlimited)
// Level 2, 3, 4... and beyond give +2 to one stat (or +1 to two)
```

### HP Increases on Every Level

The leveling system ensures HP increases on EVERY level up, not just at stat increase levels:

```typescript
// HP increases every level using class hit die + CON modifier
// Example: Fighter (d10 hit die) with +2 CON:
// Level 1 → 2: HP increases by 1d10+2 (avg 7.5)
// Level 2 → 3: HP increases by 1d10+2
// ...and so on for ALL levels!

// Standard mode (capped at level 20):
// - Ability scores increase at levels 4, 8, 12, 16, 19
// - Each grants +2 to one ability or +1 to two abilities
// - Stats are capped at 20
// - HP increases EVERY level

// Uncapped mode (unlimited levels):
// - Ability scores increase at EVERY level
// - Each grants +2 to one ability or +1 to two abilities
// - No stat cap - grow infinitely!
// - HP increases EVERY level
```

### Optional Features - Developer Implementation

The engine provides core stat manipulation but does NOT include:

1. **Banked Stat Points**: Stat increases must be applied immediately. If your game needs a "spend points later" system, implement it yourself using `StatManager` as the building block.

2. **Respec System**: There's no built-in stat respec system. Track the history of stat increases yourself and implement respec logic using `increaseStats` and `decreaseStats`.

**Example: Implementing Banked Points**

```typescript
// Your game's custom banked points system
// Note: These are custom application-level types (not from the engine)
type BankedPoints = {
    available: number;
    history: Array<{ timestamp: number; source: string; amount: number }>;
};

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

## XP Scaling

### Custom XP Scaling for Uncapped Mode

Uncapped mode supports two options for XP progression (unlimited levels):

**Option 1: Default D&D 5e Pattern (Continues Naturally)**

```typescript
import { CharacterGenerator, LevelUpProcessor } from 'playlist-data-engine';

// Just generate a character in uncapped mode - no additional config needed!
const character = CharacterGenerator.generate(
    seed,
    audioProfile,
    track,
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
    track,
    { gameMode: 'uncapped' }
);

// Uses YOUR formulas:
// Level 1: 0 XP
// Level 2: 50,000 XP
// Level 3: 100,000 XP
// Level 10: 450,000 XP
// Proficiency: Level 1-2: 2, Level 3-4: 3, Level 5-6: 4, etc.
```

**Type Reference:** `UncappedProgressionConfig` interface - [*src/core/progression/LevelUpProcessor.ts*](src/core/progression/LevelUpProcessor.ts)

**Example: Exponential Scaling**

```typescript
LevelUpProcessor.setUncappedConfig({
    // Faster progression at low levels, slower at high levels
    xpFormula: (level) => Math.floor(1000 * Math.pow(1.5, level - 1)),
    proficiencyBonusFormula: (level) => 2 + Math.floor(Math.sqrt(level))
});

const character = CharacterGenerator.generate(seed, audio, track, { gameMode: 'uncapped' });

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

## Progression Configuration

Customize XP calculation, stat increases, and level-up behavior globally across all characters.

```typescript
import {
    DEFAULT_PROGRESSION_CONFIG,
    mergeProgressionConfig,
    type ProgressionConfig
} from 'playlist-data-engine';

// ===== VIEW DEFAULT CONFIGURATION =====
const defaultProgression = DEFAULT_PROGRESSION_CONFIG;
console.log(defaultProgression.xp.level_thresholds); // D&D 5e XP thresholds

// ===== CUSTOMIZE PROGRESSION SETTINGS =====
const customProgression = mergeProgressionConfig({
    xp: {
        // Base XP rate (default: 1 XP per second)
        xp_per_second: 2, // Double XP rate

        // Environmental activity bonuses (multipliers applied to base XP)
        activity_bonuses: {
            running: 2.0,      // 2x XP while running (default: 1.5)
            walking: 1.2,      // 1.2x XP while walking
            night_time: 1.5,   // 1.5x XP at night (default: 1.25)
            // Weather bonuses
            rain: 1.2,
            snow: 1.3,
            storm: 1.4,
            // Gaming bonuses
            gaming_base: 1.25, // Base gaming bonus
            rpg_game: 0.2,     // Additional for RPG games
            action_fps: 0.15,  // Additional for action/FPS
            multiplayer: 0.15, // Additional for multiplayer
            // Max multiplier cap
            max_multiplier: 3.0 // Total cap on all modifiers (default: 3.0)
        }
    },
    statIncrease: {
        // Strategy: 'dnD5e' (manual), 'dnD5e_smart' (auto), 'balanced', or custom
        strategy: 'balanced',
        autoApply: true // Automatically apply stat increases
    },
    levelUp: {
        useAverageHP: true,           // Use average HP instead of rolling
        allowManualStatSelection: false // Disable manual selection UI
    }
});

// For the complete `ProgressionConfig` interface definition, see:
// [*src/core/config/progressionConfig.ts*](src/core/config/progressionConfig.ts)
```

**Important Notes:**
- Configuration is **global** - affects all characters and all XP calculations
- Set configuration **before** generating characters or processing level-ups
- `mergeProgressionConfig()` merges your settings with defaults - unset properties remain default

**Available Exports:** [*src/core/config/progressionConfig.ts*](src/core/config/progressionConfig.ts)
- `DEFAULT_PROGRESSION_CONFIG` - Default D&D 5e progression values
- `mergeProgressionConfig(userConfig?)` - Merge progression config with defaults
- `type ProgressionConfig` - Progression system configuration interface

---

## See Also

- [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md) - Complete API reference
- [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md) - Usage examples
- [EQUIPMENT_SYSTEM.md](EQUIPMENT_SYSTEM.md) - Equipment properties, enchanting, and effects
- [PREREQUISITES.md](PREREQUISITES.md) - Level and ability requirements
- [EXTENSIBILITY_GUIDE.md](EXTENSIBILITY_GUIDE.md) - Custom content registration
