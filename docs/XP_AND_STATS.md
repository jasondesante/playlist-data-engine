# XP Leveling and Stats Reference

Complete guide to XP, leveling, and stats in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [XP and Leveling](#xp-and-leveling)
2. [Stat Strategies](#stat-strategies)
2. [XP Scaling](#xp-scaling)

---

## XP and Leveling


### Earning XP from Listening to Music

This is the core workflow: track a listening session, calculate XP earned, and apply it to your character. Level-ups happen automatically when XP thresholds are reached.
**NOTE**: This first example is the same that's in USAGE_IN_OTHER_PROJECTS.md. 

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


## Stat Strategies

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
const standard = CharacterGenerator.generate(seed, audioProfile, track, { gameMode: 'standard' });
// Stats capped at 20, stat increases at levels 4, 8, 12, 16, 19

// Uncapped mode (epic progression - unlimited levels)
const uncapped = CharacterGenerator.generate(seed, audioProfile, track, { gameMode: 'uncapped' });
// No stat cap, stat increases EVERY level (unlimited)
// Level 2, 3, 4... and beyond give +2 to one stat (or +1 to two)
```

**Optional Features - Developer Implementation:**

The engine provides core stat manipulation but does NOT include:

1. **Banked Stat Points**: Stat increases must be applied immediately - they are not stored across sessions for later use. If your game needs a "spend points later" system, implement it yourself using `StatManager` as the building block.

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
