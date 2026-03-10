# XP Leveling and Stats Reference

Complete guide to XP, leveling, and stats in the Playlist Data Engine.

**For API details, see [DATA_ENGINE_REFERENCE.md](../DATA_ENGINE_REFERENCE.md)**
**For other usage examples, see [USAGE_IN_OTHER_PROJECTS.md](../USAGE_IN_OTHER_PROJECTS.md)**

---

## Table of Contents

1. [XP and Leveling](#xp-and-leveling)
2. [Rhythm Game XP](#rhythm-game-xp)
3. [Track Mastery Prestige System](#track-mastery-prestige-system)
4. [Stat Strategies](#stat-strategies)
5. [XP Scaling](#xp-scaling)
6. [Progression Configuration](#progression-configuration)

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

The `levelUpDetails` returned by both `updateCharacterFromSession()` and `addXP()` contains everything you need for that "LEVELED UP!" celebration experience. All XP sources work identically.

```typescript
import { CharacterUpdater } from 'playlist-data-engine';

const updater = new CharacterUpdater();

// ===== REUSABLE CELEBRATION FUNCTION =====
function celebrateLevelUp(result: LevelUpResult, source: string) {
    if (!result.leveledUp) return;

    console.log(`🎉 LEVELED UP from ${source}!`);
    console.log(`Level ${result.levelUpDetails![0].fromLevel} → ${result.newLevel}!`);
    console.log(`Gained ${result.levelUpDetails?.length} level(s) at once!`);

    for (const detail of result.levelUpDetails!) {
        console.log(`=== Level ${detail.fromLevel} → ${detail.toLevel} ===`);
        console.log(`HP: +${detail.hpIncrease} (new max: ${detail.newMaxHP})`);

        if (detail.proficiencyIncrease > 0) {
            console.log(`Proficiency: +${detail.proficiencyIncrease} (new: ${detail.newProficiency})`);
        }
        if (detail.statIncreases?.length) {
            console.log(`Stats: ${detail.statIncreases.map(s => `${s.ability} ${s.oldValue}→${s.newValue}`).join(', ')}`);
        }
        if (detail.featuresGained?.length) {
            console.log(`Features: ${detail.featuresGained.join(', ')}`);
        }
        if (detail.newSpellSlots) {
            console.log(`Spell Slots:`, detail.newSpellSlots);
        }
    }
}

// ===== USAGE: ALL XP SOURCES USE THE SAME PATTERN =====
// Music listening
const musicResult = updater.updateCharacterFromSession(character, session, track, listenCount);
celebrateLevelUp(musicResult, 'Music Session');

// Combat, quests, custom activities - same pattern
const combatResult = updater.addXP(character, 500, 'combat');
celebrateLevelUp(combatResult, 'Combat');

const questResult = updater.addXP(character, 1000, 'quest');
celebrateLevelUp(questResult, 'Quest Complete');

// Boss rewards can trigger multiple level-ups at once!
const bossResult = updater.addXP(character, 10000, 'boss_defeat');
celebrateLevelUp(bossResult, 'Boss Defeat');

// ===== OPTIONAL: XP SOURCE TRACKING =====
// Track XP sources for analytics (application-level implementation)
const xpHistory: Array<{ source: string; amount: number; timestamp: number }> = [];

function addXPWithTracking(character: CharacterSheet, amount: number, source: string) {
    const result = updater.addXP(character, amount, source);
    xpHistory.push({ source, amount, timestamp: Date.now() });
    celebrateLevelUp(result, source);
    return result;
}

// Analyze: const combatXP = xpHistory.filter(h => h.source.startsWith('combat')).reduce((sum, h) => sum + h.amount, 0);
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
| Rhythm Game | `addRhythmXP()` | Accuracy × combo × groove | ✅ Full breakdown |

**Level-Up Result Properties:**
- `leveledUp` - Whether character leveled up
- `newLevel` - New level (if leveled up)
- `levelUpDetails` - Array of HP, stat, feature, and spell slot changes
- `xpEarned` - Amount of XP earned
- `masteredTrack` - (Music only) Whether track was mastered
- `masteryBonusXP` - (Music only) Bonus XP from mastery


## Rhythm Game XP

The rhythm game XP system rewards players for timing accuracy, combo streaks, and groove meter performance. It integrates with the beat detection system to provide character progression from rhythm gameplay.

**Key Concept: Score vs XP**
The system separates "score points" (for in-game display/leaderboards) from "character XP" (for progression) via the `xpRatio` parameter:
- **Score Points**: Raw values from accuracy (perfect = 10, great = 7, etc.) - for display
- **Character XP**: Score converted via `xpRatio` (default: 0.1, so 10 score = 1 XP) - for progression

### Basic Usage with BeatStream and GrooveAnalyzer

```typescript
import {
  BeatMapGenerator,
  BeatStream,
  GrooveAnalyzer,
  RhythmXPCalculator,
  CharacterUpdater
} from 'playlist-data-engine';

// ===== SETUP =====
const generator = new BeatMapGenerator();
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const beatStream = new BeatStream(beatMap, audioContext);
const grooveAnalyzer = new GrooveAnalyzer();
const rhythmXP = new RhythmXPCalculator(); // Uses defaults
const updater = new CharacterUpdater();

// Start session tracking
rhythmXP.startSession();
let comboCount = 0;

// ===== ON BUTTON PRESS =====
function onButtonPress(timestamp: number) {
  // 1. Check button press accuracy
  const buttonResult = beatStream.checkButtonPress(timestamp);

  // 2. Record hit for groove analysis
  const grooveResult = grooveAnalyzer.recordHit(
    buttonResult.offset,
    beatStream.getCurrentBpm(),
    buttonResult.matchedBeat?.time,
    buttonResult.accuracy  // 'miss' or 'wrongKey' will hurt groove
  );

  // 3. Check if combo is about to break (before updating)
  const comboBeforeHit = comboCount;
  const isComboBreaker = buttonResult.accuracy === 'miss' || buttonResult.accuracy === 'wrongKey';

  // 4. Update combo
  if (isComboBreaker) {
    comboCount = 0;
  } else {
    comboCount++;
  }

  // 5. Calculate XP for this hit AND update session totals
  const xpResult = rhythmXP.recordHit(buttonResult.accuracy, {
    comboLength: comboCount,
    grooveHotness: grooveResult.hotness
  });

  console.log(`Accuracy: ${buttonResult.accuracy}`);
  console.log(`Score: ${xpResult.finalScore.toFixed(1)} points (for leaderboards)`);
  console.log(`XP: ${xpResult.finalXP.toFixed(2)} (added to character)`);

  // 6. Add XP to character (triggers level-ups!)
  const updateResult = updater.addRhythmXP(character, xpResult, 'rhythm_game');

  if (updateResult.leveledUp) {
    console.log(`🎉 LEVELED UP to ${updateResult.newLevel}!`);
    if (updateResult.levelUpDetails) {
      for (const detail of updateResult.levelUpDetails) {
        console.log(`  HP: +${detail.hpIncrease}`);
      }
    }
  }

  // 7. If combo broke, award combo end bonus
  if (isComboBreaker && comboBeforeHit > 0) {
    const comboBonus = rhythmXP.calculateComboEndBonus(comboBeforeHit);
    console.log(`Combo ended! ${comboBeforeHit} hit streak → +${comboBonus.bonusXP.toFixed(2)} XP bonus`);
    updater.addXP(character, comboBonus.bonusXP, 'combo_bonus');
  }

  // 8. Check if groove ended (endedGrooveStats is present when groove just ended)
  // This is returned directly in the result - no need for separate game loop!
  if (grooveResult.endedGrooveStats) {
    const grooveBonus = rhythmXP.calculateGrooveEndBonus(grooveResult.endedGrooveStats);
    console.log(`🔥 Groove ended! Duration: ${grooveResult.endedGrooveStats.duration.toFixed(1)}s`);
    console.log(`   Avg Hotness: ${grooveResult.endedGrooveStats.avgHotness.toFixed(1)}%`);
    console.log(`   Bonus: +${grooveBonus.bonusXP.toFixed(2)} XP`);
    updater.addXP(character, grooveBonus.bonusXP, 'groove_bonus');
  }
}

// ===== ON SESSION END =====
function onSessionEnd() {
  const finalStats = rhythmXP.endSession();

  console.log('=== Session Complete ===');
  console.log(`Total Score: ${finalStats?.totalScore.toFixed(0)}`);
  console.log(`Total XP: ${finalStats?.totalXP.toFixed(2)}`);
  console.log(`Max Combo: ${finalStats?.maxCombo}`);
  console.log(`Duration: ${finalStats?.duration.toFixed(1)}s`);
  console.log(`Accuracy: ${finalStats?.accuracyPercentage.toFixed(1)}%`);
  console.log('Accuracy Distribution:', finalStats?.accuracyDistribution);

  // Check for any active groove at session end
  const grooveState = grooveAnalyzer.getState();
  if (grooveState.avgHotness > 0 && grooveState.grooveHitCount > 0) {
    const grooveBonus = rhythmXP.calculateGrooveEndBonus({
      maxStreak: grooveState.streakLength,
      maxHotness: grooveState.maxHotness,
      avgHotness: grooveState.avgHotness,
      duration: grooveState.grooveDuration,
      totalHits: grooveState.grooveHitCount,
      startTime: grooveState.grooveStartTime ?? 0,
      endTime: Date.now() / 1000,
    });
    console.log(`Final groove bonus: +${grooveBonus.bonusXP.toFixed(2)} XP`);
    updater.addXP(character, grooveBonus.bonusXP, 'groove_bonus');
    grooveAnalyzer.resetGrooveStats();
  }
}
```

### Configuration Options

```typescript
import { RhythmXPCalculator, mergeRhythmXPConfig, type RhythmXPConfig } from 'playlist-data-engine';

// ===== DEFAULT CONFIGURATION =====
// Default values are tuned for D&D 5e progression:
// - xpRatio: 0.1 (10 score points = 1 character XP)
// - Combo cap: 5.0x at 200 combo
// - Groove end bonus: enabled

// ===== CUSTOM CONFIGURATION =====
const customConfig: Partial<RhythmXPConfig> = {
  // Base XP values (score points) for each accuracy level
  baseXP: {
    perfect: 10,
    great: 7,
    good: 5,
    ok: 2,
    miss: 0,
    wrongKey: 0,  // Can be negative for score penalty (XP floored at 0)
  },

  // Score-to-XP conversion ratio
  xpRatio: 0.1,  // 10 score = 1 XP (tuned for D&D 5e progression)

  // Combo multiplier settings
  combo: {
    enabled: true,
    cap: 5.0,  // Max 5x multiplier
    // Custom formula (optional)
    // formula: (combo) => 1 + Math.log10(combo + 1),
    endBonus: {
      enabled: true,
      // Custom formula (optional): comboLength * 2 is default
      // formula: (combo) => Math.floor(combo * 1.5),
    },
  },

  // Groove XP settings
  groove: {
    perHitMultiplier: false,  // If true: multiplier += (hotness/100) * perHitScale
    perHitScale: 1.0,
    endBonus: {
      enabled: true,
      maxStreakWeight: 2.5,      // How much max streak matters
      avgHotnessWeight: 2.5,     // How much average hotness matters
      durationWeight: 2.5,       // How long groove lasted
    },
  },

  maxMultiplier: 5.0,  // Total multiplier cap
};

const rhythmXP = new RhythmXPCalculator(customConfig);
```

### Custom Combo Formulas

```typescript
import { RhythmXPCalculator } from 'playlist-data-engine';

// ===== EXPONENTIAL GROWTH (Uncapped feel) =====
// Slower scaling at high combos, faster at low combos
const exponentialXP = new RhythmXPCalculator({
  combo: {
    enabled: true,
    cap: 10.0,
    formula: (combo) => 1 + Math.log10(combo + 1),
    // At 10 combo = 2.0x, at 100 combo = 3.0x, at 1000 combo = 4.0x
    endBonus: { enabled: true },
  },
});

// ===== STEP-BASED (Tiered progression) =====
// Every 10 hits = +0.1x, predictable milestones
const stepXP = new RhythmXPCalculator({
  combo: {
    enabled: true,
    cap: 5.0,
    formula: (combo) => 1 + Math.floor(combo / 10) * 0.1,
    // At 10 combo = 1.1x, at 50 combo = 1.5x, at 100 combo = 2.0x
    endBonus: { enabled: true },
  },
});

// ===== OTHER VARIATIONS =====
// Aggressive: formula: (combo) => 1 + (combo / 25)  // 2x at 25 combo
// Custom end bonus: endBonus: { formula: (combo) => Math.floor(combo * 1.5) }
```

### Groove End Bonus

When groove ends (hotness drops to 0 or direction changes), stats are returned directly in `grooveResult.endedGrooveStats` - no separate game loop needed!

**Groove ends when:**
1. Hotness drops to 0 (player broke their pocket too many times)
2. Direction changes from push ↔ pull (player shifted from ahead to behind beat)
3. Session ends (manually check `grooveState` for any active groove)

**What resets when groove ends:**
- `streakLength`, `grooveStartTime`, `maxHotness`, `hotnessSamples`, `grooveHitCount` → all reset
- **Note:** `establishedOffset` and `pocketDirection` are NOT reset - only groove statistics

### Per-Hit Groove Multiplier Mode

```typescript
import { RhythmXPCalculator } from 'playlist-data-engine';

// By default, groove only affects the end bonus.
// Enable per-hit mode to add groove to every hit's multiplier:

const perHitGrooveXP = new RhythmXPCalculator({
  groove: {
    perHitMultiplier: true,  // Enable per-hit groove bonus
    perHitScale: 1.0,        // At 100% hotness = +1.0x to multiplier
    endBonus: { enabled: true },  // End bonus still works too!
  },
});

// Example: At 80% hotness with 50 combo:
// - Combo multiplier: 2.0x (1 + 50/50)
// - Groove multiplier: 0.8x (80/100 * 1.0)
// - Total: 2.8x (capped at maxMultiplier)
```

### Session Tracking for UI Display

```typescript
import { RhythmXPCalculator } from 'playlist-data-engine';

const rhythmXP = new RhythmXPCalculator();

// Start tracking
rhythmXP.startSession();

// On each hit, recordHit() updates totals automatically
rhythmXP.recordHit('perfect', { comboLength: 10 });
rhythmXP.recordHit('great', { comboLength: 11 });
rhythmXP.recordHit('miss', { comboLength: 0 });

// Get running totals for UI
const stats = rhythmXP.getSessionTotals();
if (stats) {
  console.log(`Score: ${stats.totalScore}`);
  console.log(`XP: ${stats.totalXP}`);
  console.log(`Accuracy: ${stats.accuracyPercentage.toFixed(1)}%`);
  console.log(`Perfect: ${stats.accuracyDistribution.perfect}`);
  console.log(`Great: ${stats.accuracyDistribution.great}`);
  console.log(`Max Combo: ${stats.maxCombo}`);
}

// End session and get final stats
const finalStats = rhythmXP.endSession();
```

### Stateless Usage (Frontend Tracks Combo)

```typescript
import { RhythmXPCalculator } from 'playlist-data-engine';

const rhythmXP = new RhythmXPCalculator({ xpRatio: 0.1 });

// Frontend manages combo tracking
let currentCombo = 0;

function onHit(accuracy: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey', grooveHotness: number) {
  // Calculate XP without internal session tracking
  const result = rhythmXP.calculateButtonPressXP(accuracy, {
    comboLength: currentCombo,
    grooveHotness,
  });

  // Frontend updates combo
  if (accuracy === 'miss' || accuracy === 'wrongKey') {
    // Get end bonus before resetting
    if (currentCombo > 0) {
      const bonus = rhythmXP.calculateComboEndBonus(currentCombo);
      console.log(`Combo bonus: +${bonus.bonusXP} XP`);
    }
    currentCombo = 0;
  } else {
    currentCombo++;
  }

  return result;
}
```

### Expected XP Rates (Default Config)

With `xpRatio: 0.1` and default multipliers:

**Per-Hit XP (no multipliers):**
| Accuracy | Score | XP |
|----------|-------|-----|
| Perfect | 10 | 1.0 |
| Great | 7 | 0.7 |
| Good | 5 | 0.5 |
| Ok | 2 | 0.2 |
| Miss | 0 | 0 |
| Wrong Key | 0 | 0 |

**Combo Multiplier Scaling:**
| Combo | Multiplier |
|-------|------------|
| 0 | 1.0x |
| 25 | 1.5x |
| 50 | 2.0x |
| 100 | 3.0x |
| 200+ | 5.0x (cap) |

**Typical 3-minute song at 120 BPM (~360 beats):**
- 80% perfect, 15% great, 5% good = ~320 base XP
- With average 50-combo (2x multiplier) = ~640 XP effective
- With groove end bonus = additional ~20-50 XP

**Level progression estimate:**
| Level | XP Required | Songs (good performance) |
|-------|-------------|--------------------------|
| 1→2 | 300 | ~1 song |
| 2→3 | 600 | ~2 songs |
| 3→4 | 1,800 | ~4-5 songs |
| 4→5 | 3,800 | ~8-10 songs |

**Tuning tips:**
- Faster leveling: Set `xpRatio: 0.2` (doubles XP rate)
- Slower leveling: Set `xpRatio: 0.05` (halves XP rate)
- Emphasize combos: Increase `combo.cap` to 10.0
- Emphasize groove: Set `groove.perHitMultiplier: true`

### Listening XP Boost While Playing Rhythm Game

In addition to per-button-press XP, the system boosts background listening XP when rhythm game mode is active. Configure via `ProgressionConfig`:

```typescript
import { mergeProgressionConfig } from 'playlist-data-engine';

mergeProgressionConfig({
  xp: {
    activity_bonuses: {
      // Rhythm game bonuses (apply to listening XP)
      rhythm_game_base: 1.25,    // +25% base when rhythm game active
      rhythm_game_combo: 0.5,    // Up to +50% at max combo
      rhythm_game_groove: 0.5,   // Up to +50% at 100% hotness
    },
  },
});
```

See [Progression Configuration](#progression-configuration) for more details on activity bonuses.

**Type Reference:**
- `RhythmXPConfig` - Configuration interface - [*src/core/types/RhythmXP.ts*](src/core/types/RhythmXP.ts)
- `RhythmXPResult` - Result from `calculateButtonPressXP()` - [*src/core/types/RhythmXP.ts*](src/core/types/RhythmXP.ts)
- `RhythmSessionTotals` - Session statistics - [*src/core/types/RhythmXP.ts*](src/core/types/RhythmXP.ts)
- `GrooveStats` - Groove end bonus stats - [*src/core/types/RhythmXP.ts*](src/core/types/RhythmXP.ts)
- `RhythmXPCalculator` - Main calculator class - [*src/core/progression/RhythmXPCalculator.ts*](src/core/progression/RhythmXPCalculator.ts)


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

### ISessionTracker Adapter {#isessiontracker-adapter}

If you're using a custom state management solution (Zustand, Redux, etc.) instead of the built-in `SessionTracker`, implement the `ISessionTracker` interface for the prestige system's `resetCharacterForPrestige()` method.

**Using with Zustand:**

```typescript
import { type ISessionTracker, CharacterUpdater } from 'playlist-data-engine';
import { useSessionStore } from './stores/sessionStore';

const zustandAdapter: ISessionTracker = {
    getTrackListenCount: (id) => useSessionStore.getState().getTrackListenCount(id),
    getTrackXPTotal: (id) => useSessionStore.getState().getTrackXPTotal(id),
    clearTrackSessions: (id) => useSessionStore.getState().clearTrackSessions(id),
};

const result = updater.resetCharacterForPrestige(character, zustandAdapter, trackUuid, audioProfile, track);
```

**Using with a mock for testing:**

```typescript
const mockTracker: ISessionTracker = {
    getTrackListenCount: () => 15,
    getTrackXPTotal: () => 2000,
    clearTrackSessions: () => 10,
};
```


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
const manualStatManager = new StatManager({ strategy: 'dnD5e' });
const manualUpdater = new CharacterUpdater(manualStatManager);

const manualResult = manualUpdater.addXP(character, 6500, 'quest');

if (manualUpdater.hasPendingStatIncreases(character)) {
    const playerChoice = await showStatSelectionUI();  // Returns 'STR' or ['DEX', 'CON']
    const completeResult = manualUpdater.applyPendingStatIncrease(
        character, playerChoice.primary, playerChoice.secondary
    );
}

// Alternative: Use LevelUpProcessor directly for lower-level control over the two-phase process

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

### HP Increases on Every Level

HP increases on **every** level using class hit die + CON modifier. Standard mode caps stats at 20; uncapped mode has no cap.

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

**Example Formulas:**

```typescript
// Exponential: faster at low levels, slower at high levels
LevelUpProcessor.setUncappedConfig({
    xpFormula: (level) => Math.floor(1000 * Math.pow(1.5, level - 1)),
    proficiencyBonusFormula: (level) => 2 + Math.floor(Math.sqrt(level))
});
// Level 1: 1,000 XP | Level 5: ~5,062 XP | Level 10: ~38,443 XP

// OSRS-style: cubic XP curve
LevelUpProcessor.setUncappedConfig({
    xpFormula: (level) => Math.floor(Math.pow(level, 3) * 100),
    proficiencyBonusFormula: (level) => 2 + Math.floor(level / 10)
});
// Level 1: 100 XP | Level 5: 12,500 XP | Level 10: 100,000 XP
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
