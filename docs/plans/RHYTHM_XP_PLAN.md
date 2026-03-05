# Rhythm Game XP Reward System Implementation Plan

## Overview

Integrate the beat detection/rhythm game system with the existing XP progression system. This allows players to earn XP from rhythm gameplay based on timing accuracy, combo streaks, and groove meter performance.

**Core Philosophy:**
- Follow existing patterns from `ProgressionConfig` and `XPCalculator`
- Highly configurable with sensible defaults
- Custom formula support via callbacks for advanced use cases
- Separate concerns: accuracy XP, combo multiplier, groove bonuses
- **Score vs XP separation**: Game score (for display/leaderboards) is separate from character XP (for progression)

**Key Insight:** A "perfect" hit might be worth 10 *score points* for the game's leaderboard, but only 1 *XP* for character progression. The `xpRatio` parameter controls this conversion (default: 0.1, meaning 10 score = 1 XP).

---

## Two Parallel XP Systems

This plan implements **two independent XP reward systems** that both operate during rhythm gameplay:

### System A: Rhythm Game XP (`RhythmXPCalculator`)
- **Purpose**: Rewards per-button-press gameplay
- **Trigger**: Each button press during rhythm game
- **Output**: `finalXP` added to character via `CharacterUpdater.addRhythmXP()`
- **Based on**: Hit accuracy, combo multiplier, groove hotness

### System B: Listening Session XP Boost (`XPCalculator` extensions)
- **Purpose**: Boosts background listening XP while playing rhythm game
- **Trigger**: Active listening session with rhythm game mode enabled
- **Output**: Multiplied listening XP added via normal session tracking
- **Based on**: `activity_bonuses.rhythm_game_*` multipliers

**Both systems accumulate simultaneously** - a player actively playing the rhythm game earns:
1. Rhythm game XP from each button press (System A)
2. PLUS their listening XP gets boosted by rhythm game activity bonuses (System B)

---

## Phase 1: Core Types & Configuration

### 1.1 Define Rhythm XP Types
- [x] Create `RhythmXPConfig` interface in `src/core/types/BeatMap.ts` or new file
  - **Implemented in:** `src/core/types/RhythmXP.ts` (new file)
  - **Also created:** `RhythmBaseXPConfig`, `ComboEndBonusConfig`, `RhythmComboConfig`, `GrooveEndBonusConfig`, `RhythmGrooveConfig`
  - **Exports added to:** `src/index.ts`
  ```typescript
  interface RhythmXPConfig {
    // Base XP per accuracy level (these are "score points")
    baseXP: {
      perfect: number;   // Default: 10
      great: number;     // Default: 7
      good: number;      // Default: 5
      ok: number;        // Default: 2
      miss: number;      // Default: 0 (configurable, can be negative)
      wrongKey: number;  // Default: 0 (configurable, can be negative)
    };

    // Score-to-XP conversion ratio
    // finalCharacterXP = scorePoints * xpRatio
    // Examples:
    //   xpRatio: 1.0  → 10 score = 10 XP (unchanged)
    //   xpRatio: 0.1  → 10 score = 1 XP (divide by 10)
    //   xpRatio: 0.5  → 10 score = 5 XP (half)
    xpRatio: number;  // Default: 0.1 (10 score points = 1 character XP)

    // Combo multiplier settings
    combo: {
      enabled: boolean;
      cap: number;       // Default: 5.0 (max 5x multiplier)
      formula?: (comboLength: number) => number;  // Custom formula

      // Combo end bonus (awarded when combo breaks)
      endBonus: {
        enabled: boolean;     // Default: true
        // Formula for bonus based on combo length that just ended
        // Default: comboLength * 2 (e.g., 50 combo = 100 bonus score)
        formula?: (comboLength: number) => number;
      };
    };

    // Groove XP settings
    groove: {
      // Per-hit groove boost (optional)
      perHitMultiplier: boolean;  // Default: false
      perHitScale: number;        // Default: 1.0 (hotness% * scale added to multiplier)

      // End-of-groove bonus (default mode)
      endBonus: {
        enabled: boolean;         // Default: true
        maxStreakWeight: number;  // How much max streak matters
        avgHotnessWeight: number; // How much average hotness matters
        durationWeight: number;   // How much groove duration matters
      };
    };

    // Max total multiplier cap (like existing 3.0x cap)
    maxMultiplier: number;  // Default: 5.0
  }
  ```

  **Note on Miss/WrongKey Penalties:**
  - `miss` and `wrongKey` can be set to negative values for score penalties
  - **Score vs XP handling**: Negative values reduce the *score* displayed, but character XP is floored at 0
  - Example: `miss: -5` with `xpRatio: 0.1` → score shows -5, but character XP change is 0 (not -0.5)
  - This prevents punishing character progression while still providing gameplay feedback

### 1.2 Define Result Types
- [x] Create `RhythmXPResult` interface
  - **Implemented in:** `src/core/types/RhythmXP.ts` (lines 212-245)
  ```typescript
  interface RhythmXPResult {
    scorePoints: number;      // Raw score from accuracy (before ratio)
    baseXP: number;           // Score converted to XP (scorePoints * xpRatio)
    comboMultiplier: number;  // Current combo multiplier
    grooveMultiplier: number; // Groove bonus (0 if not enabled)
    totalMultiplier: number;  // Combined (capped at max)
    finalScore: number;       // scorePoints * totalMultiplier (for display/leaderboards)
    finalXP: number;          // baseXP * totalMultiplier (what gets added to character)
    breakdown: {
      accuracy: BeatAccuracy;
      comboLength: number;
      grooveHotness?: number;
    };
  }
  ```

### 1.3 Session Totals Type (for UI display)
- [x] Create `RhythmSessionTotals` interface for tracking cumulative stats
  - **Implemented in:** `src/core/types/RhythmXP.ts` (lines 333-358)
  ```typescript
  interface RhythmSessionTotals {
    /** Total raw score accumulated */
    totalScore: number;

    /** Total character XP earned */
    totalXP: number;

    /** Peak combo achieved */
    maxCombo: number;

    /** Count of each accuracy type */
    accuracyDistribution: {
      perfect: number;
      great: number;
      good: number;
      ok: number;
      miss: number;
      wrongKey: number;
    };

    /** Overall accuracy percentage (perfect+great+good+ok / total hits) */
    accuracyPercentage: number;

    /** Session duration in seconds */
    duration: number;
  }
  ```
  This helps frontends display session summaries without tracking everything themselves.

### 1.5 Create Default Configuration
- [x] Create `DEFAULT_RHYTHM_XP_CONFIG` constant
  - **Implemented in:** `src/core/types/RhythmXP.ts` (lines 409-438)
  - **Also created:** `mergeRhythmXPConfig()` helper function (lines 511-526)
  ```typescript
  const DEFAULT_RHYTHM_XP_CONFIG: RhythmXPConfig = {
    baseXP: { perfect: 10, great: 7, good: 5, ok: 2, miss: 0, wrongKey: 0 },
    xpRatio: 0.1,  // 10 score points = 1 character XP (tuned for D&D 5e progression)
    combo: {
      enabled: true,
      cap: 5.0,
      endBonus: {
        enabled: true,
        formula: (combo) => combo * 2  // 50 combo = 100 bonus score = 10 XP
      }
    },
    groove: {
      perHitMultiplier: false,
      perHitScale: 1.0,
      endBonus: { enabled: true, maxStreakWeight: 0.4, avgHotnessWeight: 0.4, durationWeight: 0.2 }
    },
    maxMultiplier: 5.0
  };
  ```

### 1.6 Extend ProgressionConfig
- [x] Add `rhythm_game` to `activity_bonuses` in `ProgressionConfig`
- [x] Add `rhythmXP` section to `ProgressionConfig.xp`
  - [x] Reference `RhythmXPConfig` type
  - [x] Update `mergeProgressionConfig()` to handle new section
  - **Implemented in:** `src/core/config/progressionConfig.ts`
  
  **Note:** `mergeProgressionConfig()` (see `src/core/config/progressionConfig.ts:109-131`) already handles new `activity_bonuses` fields via spread operator:
  ```typescript
  activity_bonuses: {
    ...DEFAULT_PROGRESSION_CONFIG.xp.activity_bonuses,
    ...userConfig.xp?.activity_bonuses  // New fields merge automatically
  }
  ```
  Adding `rhythm_game_base`, `rhythm_game_combo`, `rhythm_game_groove` to defaults will work without code changes.

### 1.7 Rhythm Game Listening XP Multipliers (Consolidated)

This section combines all listening XP boost functionality. These bonuses apply to the **background listening XP** when rhythm game mode is active (System B from the overview).

- [x] Add rhythm game bonuses to `activity_bonuses` in `ProgressionConfig.xp` (see `src/core/config/progressionConfig.ts`)
  - **Implemented in:** `src/core/types/Progression.ts`, `src/core/config/progressionConfig.ts`
  ```typescript
  activity_bonuses: {
    // Existing movement/environmental bonuses (from engine)
    stationary: number;
    walking: number;
    running: number;
    driving: number;
    night_time: number;
    extreme_weather: number;
    high_altitude: number;

    // NEW: Rhythm game listening bonuses (System B)
    rhythm_game_base: number;      // Default: 1.25 (base +25% when rhythm game active)
    rhythm_game_combo: number;     // Default: 0.5 (max +50% at max combo)
    rhythm_game_groove: number;    // Default: 0.5 (max +50% at 100% hotness)
  }
    ```

  **Note:** Apps may extend this with their own bonuses (e.g., weather, gaming genres). The engine's `mergeProgressionConfig()` handles new fields gracefully via spread operator.

- [x] Update `DEFAULT_ACTIVITY_BONUSES` in `XPCalculator.ts` (lines 36-44)
  - **Implemented in:** `src/core/progression/XPCalculator.ts`
  ```typescript
  const DEFAULT_ACTIVITY_BONUSES = {
    stationary: 1.0,
    walking: 1.2,
    running: 1.5,
    driving: 1.3,
    night_time: 1.25,
    extreme_weather: 1.4,
    high_altitude: 1.3,
    // NEW: Rhythm game bonuses
    rhythm_game_base: 1.25,
    rhythm_game_combo: 0.5,
    rhythm_game_groove: 0.5,
  };
  ```

- [x] Update `DEFAULT_PROGRESSION_CONFIG.xp.activity_bonuses` in `progressionConfig.ts` (same fields)
  - **Implemented in:** `src/core/config/progressionConfig.ts`

- [x] Add `RhythmGameContext` to `ListeningSession` for tracking active state
  - **Note:** `RhythmGameContext` already exists in `src/core/types/RhythmXP.ts`
  ```typescript
  interface RhythmGameContext {
    isActive: boolean;           // Is rhythm game mode currently active?
    currentCombo: number;        // Current combo length
    maxComboCap: number;         // Max combo for scaling (default: 100)
    grooveHotness: number;       // Current groove hotness (0-100)
    avgGrooveHotness?: number;   // Average hotness over session (optional)
  }
  ```

- [x] Update `ListeningSession` type to include rhythm game context
  - **Implemented in:** `src/core/types/Progression.ts`
  ```typescript
  interface ListeningSession {
    // ... existing fields ...
    rhythm_game_context?: RhythmGameContext;  // Optional: present when rhythm game active
  }
  ```

- [x] Update `XPCalculator.calculateSessionXP()` to apply rhythm game bonuses
  - **Implemented in:** `src/core/progression/XPCalculator.ts`
  ```typescript
  // In calculateSessionXP() - follows existing pattern:
  // (See src/core/progression/XPCalculator.ts lines 79-103)
  
  // After gaming bonus, add rhythm game bonus:
  if (session.rhythm_game_context) {
    xp = this.applyRhythmGameBonus(xp, session.rhythm_game_context);
  }
  ```

- [x] Add `applyRhythmGameBonus()` method (follows pattern of `applyEnvironmentalBonus` and `applyGamingBonus`)
  - **Implemented in:** `src/core/progression/XPCalculator.ts`
  ```typescript
  /**
   * Apply rhythm game bonuses to XP
   * Rewards users who play rhythm game while listening
   *
   * @param baseXP - Base XP value
   * @param context - Rhythm game context data
   * @returns XP with rhythm game bonuses applied
   */
  private applyRhythmGameBonus(baseXP: number, context: RhythmGameContext): number {
    if (!context.isActive) {
      return baseXP;
    }

    let multiplier = this.config.activity_bonuses.rhythm_game_base;  // 1.25x base

    // Combo bonus: scales with combo length (0% to 50% additional)
    if (context.currentCombo > 0) {
      const comboRatio = context.currentCombo / context.maxComboCap;
      multiplier += comboRatio * this.config.activity_bonuses.rhythm_game_combo;
    }

    // Groove bonus: scales with hotness (0% to 50% additional)
    if (context.grooveHotness > 0) {
      const grooveRatio = context.grooveHotness / 100;
      multiplier += grooveRatio * this.config.activity_bonuses.rhythm_game_groove;
    }

    return baseXP * multiplier;
  }
  ```

  **Note:** The existing `calculateTotalModifier()` method was also updated to include rhythm game context for the combined modifier display.
  - **Implemented in:** `src/core/progression/XPCalculator.ts`

**Note:** This completes all listening XP boost functionality. No separate phase needed.

---

## Phase 2: GrooveAnalyzer Enhancement

The `GrooveAnalyzer` currently only tracks current hotness and streak. To support groove end bonuses, we need to enhance it to track statistics over the groove lifetime.

### 2.1 Add Groove Lifetime Tracking
- [ ] Add new fields to `GrooveAnalyzer`
  ```typescript
  // Internal tracking state
  private grooveStartTime: number | null = null;      // When current groove started (audio time)
  private maxHotness: number = 0;                     // Peak hotness during groove
  private hotnessSamples: number[] = [];              // All hotness values for averaging
  private grooveHitCount: number = 0;                 // Total hits in current groove
  private previousDirection: GrooveDirection = 'neutral';  // Track direction for change detection
  ```

### 2.1.1 Groove Reset Triggers
The groove lifetime tracking resets when:
1. **Hotness drops to 0** - The groove has completely ended
2. **Pocket direction changes** (push ↔ pull) - The player has shifted from playing ahead of the beat to behind (or vice versa)

**Why direction changes reset tracking:**
- A groove is defined by maintaining a consistent pocket (ahead/behind/on beat)
- When direction changes, the player has been hitting outside their established pocket
- Those out-of-pocket hits already reduce hotness via `hotnessLossOnBreak`
- The direction change is a symptom of the groove being broken
- Starting fresh tracking for the new direction makes statistical sense

**Note:** Transitions to/from 'neutral' do NOT reset tracking - only push↔pull transitions.

### 2.2 Update GrooveState Interface
- [ ] Extend `GrooveState` in `src/core/types/BeatMap.ts`
  ```typescript
  interface GrooveState {
    // Existing fields
    pocketDirection: GrooveDirection;
    establishedOffset: number;
    hotness: number;
    streakLength: number;
    hitCount: number;
    pocketWindow: number;

    // NEW: Groove lifetime statistics
    grooveStartTime: number | null;    // When groove started (null if no active groove)
    grooveDuration: number;            // Duration in seconds (0 if no active groove)
    maxHotness: number;                // Peak hotness reached during groove
    avgHotness: number;                // Average hotness over groove lifetime
    grooveHitCount: number;            // Total hits in current groove
  }
  ```

### 2.3 Add GrooveStats Interface
- [ ] Create dedicated interface for groove end bonus calculation
  ```typescript
  /**
   * Statistics for groove end bonus calculation
   * Returned by GrooveAnalyzer.getGrooveStats()
   */
  interface GrooveStats {
    maxStreak: number;           // Peak streak during groove
    maxHotness: number;          // Peak hotness reached
    avgHotness: number;          // Average hotness over groove lifetime
    duration: number;            // How long groove lasted (seconds)
    totalHits: number;           // Total hits in groove
    startTime: number;           // When groove started (audio time)
    endTime: number;             // When groove ended (audio time)
  }
  ```

### 2.4 Update GrooveAnalyzer.recordHit()
- [ ] Track hotness samples, groove timing, and direction changes in `recordHit()`
  ```typescript
  recordHit(offset: number, bpm: number, currentTime?: number): GrooveResult {
    // ... existing logic ...

    // Store previous direction before updating
    const previousDirection = this.previousDirection;

    // Determine new direction (existing logic)
    this.pocketDirection = this.determineDirection(this.establishedOffset);
    this.previousDirection = this.pocketDirection;

    // Check for direction change (push ↔ pull only, ignore neutral transitions)
    const directionChanged =
      (previousDirection === 'push' && this.pocketDirection === 'pull') ||
      (previousDirection === 'pull' && this.pocketDirection === 'push');

    if (directionChanged) {
      // Direction changed - reset lifetime tracking for new groove
      // Note: hotness already decreased from out-of-pocket hits that caused the shift
      this.resetGrooveStats();
    }

    // Track groove lifetime statistics
    if (this.hotness > 0) {
      // Groove is active
      if (this.grooveStartTime === null) {
        this.grooveStartTime = currentTime ?? null;
      }
      this.maxHotness = Math.max(this.maxHotness, this.hotness);
      this.hotnessSamples.push(this.hotness);
      this.grooveHitCount++;
    } else {
      // Groove ended (hotness hit 0) - reset lifetime tracking
      this.resetGrooveStats();
    }

    return result;
  }
  ```

  **Note:** `currentTime` is an optional parameter that the frontend should pass using
  `buttonResult.matchedBeat.time` from the beat map for accurate groove duration tracking.

### 2.5 Add getGrooveStats() Method
- [ ] Add method to get all stats needed for groove end bonus
  ```typescript
  /**
   * Get groove statistics for end bonus calculation.
   * Call this when hotness drops to 0 or at session end.
   *
   * @param currentAudioTime - Current audio time for duration calculation
   * @returns GrooveStats or null if no groove was active
   */
  getGrooveStats(currentAudioTime: number): GrooveStats | null {
    if (this.grooveStartTime === null || this.grooveHitCount === 0) {
      return null;
    }

    const avgHotness = this.hotnessSamples.length > 0
      ? this.hotnessSamples.reduce((a, b) => a + b, 0) / this.hotnessSamples.length
      : 0;

    return {
      maxStreak: this.streakLength,  // Current streak is max when groove ends
      maxHotness: this.maxHotness,
      avgHotness,
      duration: currentAudioTime - this.grooveStartTime,
      totalHits: this.grooveHitCount,
      startTime: this.grooveStartTime,
      endTime: currentAudioTime
    };
  }
  ```

### 2.6 Add resetGrooveStats() Method
- [ ] Add public method to reset groove lifetime stats
  ```typescript
  /**
   * Reset groove lifetime tracking.
   * Called internally when hotness drops to 0 or direction changes.
   * Can also be called externally to force a reset (e.g., at session end).
   */
  resetGrooveStats(): void {
    this.grooveStartTime = null;
    this.maxHotness = 0;
    this.hotnessSamples = [];
    this.grooveHitCount = 0;
  }
  ```

  **Note:** This method is public so the frontend can manually reset groove stats
  (e.g., after collecting a groove end bonus at session end).

### 2.7 Update getState() Method
- [ ] Include new lifetime statistics in `getState()`
  ```typescript
  getState(): GrooveState {
    const avgHotness = this.hotnessSamples.length > 0
      ? this.hotnessSamples.reduce((a, b) => a + b, 0) / this.hotnessSamples.length
      : 0;

    return {
      pocketDirection: this.pocketDirection,
      establishedOffset: this.establishedOffset,
      hotness: this.hotness,
      streakLength: this.streakLength,
      hitCount: this.hitCount,
      pocketWindow: this.getPocketWindow(),
      // NEW fields
      grooveStartTime: this.grooveStartTime,
      grooveDuration: this.grooveStartTime ? (Date.now() / 1000 - this.grooveStartTime) : 0,
      maxHotness: this.maxHotness,
      avgHotness,
      grooveHitCount: this.grooveHitCount
    };
  }
  ```

---

## Phase 3: Combo Multiplier System

### 2.1 Default Combo Formula
- [ ] Implement default capped combo formula
  ```typescript
  // Default: 1 + (comboLength / 50) capped at 5.0
  // At 50 combo = 2x, at 100 combo = 3x, at 200 combo = 5x (cap)
  function defaultComboFormula(comboLength: number, cap: number): number {
    return Math.min(1 + (comboLength / 50), cap);
  }
  ```

### 2.2 Custom Formula Support
- [ ] Allow passing custom formula via config
  ```typescript
  // Example uncapped exponential growth
  const uncappedFormula = (combo: number) => 1 + Math.log10(combo + 1);

  // Example step-based (every 10 hits = +0.1x)
  const stepFormula = (combo: number) => 1 + Math.floor(combo / 10) * 0.1;
  ```

### 2.3 Combo Behavior
- [ ] Document combo reset behavior clearly
  - **Combo builds**: Each successful hit (perfect, great, good, ok) increments combo
  - **Combo breaks**: On `miss` or `wrongKey`, combo resets to 0 immediately
  - **Multiplier is per-hit**: The combo multiplier applies to the *current* hit only, not retroactively
  - **Frontend tracks combo**: `RhythmXPCalculator` accepts `comboLength` as a parameter (doesn't track internally)

**Example:**
```
Hit 1: perfect, combo=1  → 10 × 1.02x = 10.2 score, 1.02 XP
Hit 2: perfect, combo=2  → 10 × 1.04x = 10.4 score, 1.04 XP
Hit 3: great,  combo=3  → 7  × 1.06x = 7.4 score, 0.74 XP
Hit 4: miss,   combo=0  → 0 × 1.00x = 0 score, 0 XP (combo reset!)
Hit 5: perfect, combo=1  → 10 × 1.02x = 10.2 score, 1.02 XP (started fresh)
```

The combo multiplier formula determines how much bonus you get at each combo level. The default formula (`1 + combo/50`) gives small incremental bonuses that add up over time.

### 2.4 Combo End Bonus
- [ ] Implement optional combo end bonus
  ```typescript
  interface ComboEndBonusResult {
    comboLength: number;    // The combo that just ended
    bonusScore: number;     // Raw bonus score (before ratio)
    bonusXP: number;        // Actual XP (bonusScore * xpRatio)
  }

  // Default formula: comboLength * 2
  // 10 combo → 20 bonus score → 2 XP (with 0.1 ratio)
  // 50 combo → 100 bonus score → 10 XP
  // 100 combo → 200 bonus score → 20 XP
  ```

- [ ] Add `calculateComboEndBonus(comboLength: number)` method to `RhythmXPCalculator`

**When to call:**
- Frontend calls this immediately after a miss/wrongKey
- Pass the combo length *before* it reset to 0
- Adds a satisfying "completion bonus" for the streak achieved

**Example flow:**
```
Hit 50: perfect, combo=50 → 20 score, 2 XP
Hit 51: miss, combo=0 → call calculateComboEndBonus(50) → +10 XP bonus!
```

---

## Phase 4: Groove XP Integration

### 4.1 Per-Hit Groove Multiplier (Optional Mode)
- [ ] Implement optional per-hit groove boost
  ```typescript
  // If enabled: multiplier += (hotness / 100) * perHitScale
  // At 100% hotness with scale 1.0 = +1.0x to multiplier
  ```

### 4.2 Groove End Bonus Calculator
- [ ] Create `calculateGrooveEndBonus()` function
  ```typescript
  interface GrooveEndStats {
    maxStreak: number;      // Peak streak during groove
    avgHotness: number;     // Average hotness over groove lifetime
    duration: number;       // How long groove lasted (seconds or beats)
    totalHits: number;      // Total hits in groove
  }

  interface GrooveEndBonusResult {
    bonusScore: number;     // Raw bonus score (before ratio)
    bonusXP: number;        // Actual XP (bonusScore * xpRatio)
  }

  function calculateGrooveEndBonus(stats: GrooveEndStats, config: GrooveEndBonusConfig): GrooveEndBonusResult {
    // Weighted calculation:
    // bonusScore = (maxStreak * streakWeight) + (avgHotness * hotnessWeight) + (duration * durationWeight)
    // bonusXP = bonusScore * xpRatio
    // Returns both for display vs character progression
  }
  ```

### 4.3 Groove Tracking Helper (Now Built-in)

**Note:** With the Phase 2 GrooveAnalyzer enhancements (see section 2.1-2.7), the groove tracking helper is now built directly into `GrooveAnalyzer`. The `getGrooveStats()` method provides all data needed for `calculateGrooveEndBonus()`.

No separate helper class needed.

---

## Phase 5: RhythmXPCalculator Class (Rhythm Game Scoring)

### 5.1 Core Calculator Implementation
- [ ] Create `src/core/progression/RhythmXPCalculator.ts`
  ```typescript
  export class RhythmXPCalculator {
    // Session tracking state (optional - for convenience)
    private sessionTotals: RhythmSessionTotals;
    private sessionStartTime: number | null = null;

    constructor(config?: Partial<RhythmXPConfig>);

    // ========================================
    // Core XP Calculation (stateless)
    // ========================================

    // Main method: Calculate XP for a button press
    calculateButtonPressXP(
      buttonResult: ButtonPressResult,
      options: {
        comboLength?: number;
        grooveHotness?: number;
      }
    ): RhythmXPResult;

    // Calculate combo end bonus (call when combo breaks)
    calculateComboEndBonus(comboLength: number): ComboEndBonusResult;

    // Calculate groove end bonus (call when groove ends)
    calculateGrooveEndBonus(stats: GrooveStats): GrooveEndBonusResult;

    // Get base XP for accuracy level
    getBaseXP(accuracy: BeatAccuracy): number;

    // Calculate combo multiplier
    getComboMultiplier(comboLength: number): number;

    // ========================================
    // Session Tracking (stateful convenience)
    // ========================================

    /** Start a new session (resets all totals) */
    startSession(): void;

    /** Record a hit and update session totals. Returns the XP result. */
    recordHit(
      buttonResult: ButtonPressResult,
      options: {
        comboLength?: number;
        grooveHotness?: number;
      }
    ): RhythmXPResult;

    /** Get current session totals for UI display */
    getSessionTotals(): RhythmSessionTotals;

    /** End session and get final totals */
    endSession(): RhythmSessionTotals;

    // ========================================
    // Configuration
    // ========================================

    getConfig(): RhythmXPConfig;
    updateConfig(config: Partial<RhythmXPConfig>): void;
  }
  ```

  **Session Tracking Behavior:**
  - `startSession()` resets all totals and records start time
  - `recordHit()` calculates XP AND updates internal session totals
  - `getSessionTotals()` returns a snapshot for UI updates
  - `endSession()` returns final totals and clears session state
  - The calculator can be used statelessly (just `calculateButtonPressXP`) OR with session tracking

### 5.2 Integration with CharacterUpdater
- [ ] Add `addRhythmXP()` method to `CharacterUpdater` (see `src/core/progression/CharacterUpdater.ts`)
  ```typescript
  /**
   * Result type for rhythm XP additions (excludes track mastery fields)
   * See CharacterUpdateResult interface at CharacterUpdater.ts:15-24
   */
  export type RhythmXPUpdateResult = Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'>;

  /**
   * Add XP from rhythm game button presses.
   * Triggers level-up system just like addXP() does.
   *
   * @param character - The character to update
   * @param xpResult - Result from RhythmXPCalculator.calculateButtonPressXP()
   * @param source - Source label for tracking (default: 'rhythm_game')
   * @returns Result object containing updated character and level-up details
   */
  addRhythmXP(
    character: CharacterSheet,
    xpResult: RhythmXPResult,
    source?: string
  ): RhythmXPUpdateResult;
  ```

  **Implementation:** This method should reuse the existing `addXP()` logic:
  ```typescript
  addRhythmXP(
    character: CharacterSheet,
    xpResult: RhythmXPResult,
    source: string = 'rhythm_game'
  ): RhythmXPUpdateResult {
    // Delegate to addXP() for full level-up processing
    const result = this.addXP(character, xpResult.finalXP, source);
    
    // Return without mastery fields (rhythm XP doesn't involve track mastery)
    return {
      character: result.character,
      xpEarned: result.xpEarned,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      levelUpDetails: result.levelUpDetails
    };
  }
  ```

---

## Phase 6: Integration & Exports

### 6.1 Update Exports
- [ ] Export from `src/index.ts`:
  - `RhythmXPCalculator`
  - `RhythmXPConfig` type
  - `RhythmXPResult` type
  - `RhythmSessionTotals` type
  - `ComboEndBonusResult` type
  - `GrooveEndStats` type
  - `GrooveEndBonusResult` type
  - `GrooveStats` type (from GrooveAnalyzer enhancement)
  - `DEFAULT_RHYTHM_XP_CONFIG`
  - `mergeRhythmXPConfig()` helper

### 6.2 Update BeatMap Types Exports
- [ ] Ensure types are exported from `src/core/types/BeatMap.ts` or create dedicated file
- [ ] Consider: `src/core/types/RhythmXP.ts` for organization

---

## Phase 7: Documentation

### 7.1 Update XP_AND_STATS.md
- [ ] Add new section: "Rhythm Game XP"
- [ ] Document `RhythmXPCalculator` usage
- [ ] Include examples:
  - Basic usage with `checkButtonPress`
  - Combo multiplier configuration
  - Groove end bonus calculation
  - Custom formula examples

### 7.2 Update DATA_ENGINE_REFERENCE.md
- [ ] Add API reference for `RhythmXPCalculator`
- [ ] Document all configuration options

### 7.3 Update AUDIO_ANALYSIS.md
- [ ] Add cross-reference to rhythm XP system
- [ ] Update GrooveAnalyzer section to mention XP integration

### 7.4 Expected XP Rates Documentation
- [ ] Add tuning guidance section to documentation
  ```markdown
  ## Expected XP Rates (with default config)

  With `xpRatio: 0.1` and default multipliers:

  **Per-Hit XP (no multipliers):**
  - Perfect: 1.0 XP
  - Great: 0.7 XP
  - Good: 0.5 XP
  - Ok: 0.2 XP

  **Typical 3-minute song at 120 BPM (~360 beats):**
  - 80% perfect, 15% great, 5% good = ~320 XP base
  - With average 50-combo (2x multiplier) = ~640 XP
  - With 80% average groove hotness = ~512 XP effective

  **Level progression estimate:**
  - Level 1→2 (300 XP): ~1 song with good performance
  - Level 2→3 (600 more XP): ~2 songs
  - Level 4→5 (3,800 more XP): ~6-7 songs with consistent play

  **Tuning tips:**
  - Faster leveling: Set `xpRatio: 0.2` (doubles XP rate)
  - Slower leveling: Set `xpRatio: 0.05` (halves XP rate)
  - Emphasize combos: Increase `combo.cap` to 10.0
  - Emphasize groove: Set `groove.perHitMultiplier: true`
  ```

---

## Phase 8: Testing

### 8.1 Unit Tests
- [ ] Test `RhythmXPCalculator.calculateButtonPressXP()`
  - [ ] All accuracy levels return correct base score
  - [ ] xpRatio correctly converts score to XP
  - [ ] Combo multiplier applies correctly
  - [ ] Custom combo formula works
  - [ ] Cap is respected
  - [ ] Groove per-hit multiplier (when enabled)
  - [ ] finalScore vs finalXP are correctly separated
  - [ ] Negative baseXP values don't result in negative finalXP (floored at 0)
- [ ] Test `calculateComboEndBonus()`
  - [ ] Default formula (combo * 2) works
  - [ ] Custom formula works
  - [ ] xpRatio applied correctly
  - [ ] Returns both bonusScore and bonusXP
  - [ ] Edge case: combo = 0 returns 0
- [ ] Test `calculateGrooveEndBonus()`
  - [ ] Weighted calculation correct
  - [ ] Returns both bonusScore and bonusXP
  - [ ] xpRatio applied correctly
  - [ ] Edge cases (0 hotness, 0 streak)
- [ ] Test session tracking methods
  - [ ] `startSession()` resets all totals
  - [ ] `recordHit()` updates totals correctly
  - [ ] `getSessionTotals()` returns accurate snapshot
  - [ ] `endSession()` returns final totals and clears state
  - [ ] accuracyDistribution counts each type correctly
  - [ ] accuracyPercentage calculates correctly
- [ ] Test config merging
- [ ] Test with `CharacterUpdater.addRhythmXP()`
  - [ ] Level-ups trigger correctly
  - [ ] levelUpDetails returned

### 8.2 Unit Tests for GrooveAnalyzer
- [ ] Test `getState()` returns correct values including new fields
- [ ] Test `avgHotness` calculation over multiple hits
- [ ] Test `maxHotness` tracking
- [ ] Test `grooveDuration` calculation
- [ ] Test `resetGrooveStats()` clears tracking without losing pocket

### 8.3 Integration Tests
- [ ] Test full flow: `checkButtonPress()` → `calculateButtonPressXP()` → `addRhythmXP()`
- [ ] Test with GrooveAnalyzer integration
- [ ] Test listening session XP boost with rhythm game context

---

## Dependencies

- Existing: `ButtonPressResult`, `BeatAccuracy` from `src/core/types/BeatMap.ts`
- Existing: `GrooveResult`, `GrooveState` from `src/core/types/BeatMap.ts`
- Existing: `XPCalculator` patterns from `src/core/progression/XPCalculator.ts`
- Existing: `ProgressionConfig` from `src/core/config/progressionConfig.ts`
- Existing: `CharacterUpdater` from `src/core/progression/CharacterUpdater.ts`

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/core/types/RhythmXP.ts` | **NEW** - All rhythm XP types including RhythmSessionTotals |
| `src/core/progression/RhythmXPCalculator.ts` | **NEW** - Main calculator with session tracking |
| `src/core/config/progressionConfig.ts` | Extend activity_bonuses with rhythm_game_* |
| `src/core/progression/XPCalculator.ts` | Add rhythm game bonus calculation |
| `src/core/progression/CharacterUpdater.ts` | Add `addRhythmXP()` method (triggers level-ups) |
| `src/core/analysis/beat/GrooveAnalyzer.ts` | Add avgHotness, maxHotness, grooveDuration tracking, getGrooveStats() |
| `src/core/types/BeatMap.ts` | Extend GrooveState with new fields, add GrooveStats interface |
| `src/core/types/Progression.ts` | Add RhythmGameContext interface |
| `src/index.ts` | Export new types and class |
| `docs/XP_AND_STATS.md` | Add rhythm game XP section |
| `docs/DATA_ENGINE_REFERENCE.md` | Add API reference |
| `docs/AUDIO_ANALYSIS.md` | Add cross-references |

---

## Usage Example (Target API)

```typescript
import {
  BeatMapGenerator,
  BeatStream,
  GrooveAnalyzer,
  RhythmXPCalculator,
  CharacterUpdater
} from 'playlist-data-engine';

// Setup
const generator = new BeatMapGenerator();
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const beatStream = new BeatStream(beatMap, audioContext);
const grooveAnalyzer = new GrooveAnalyzer();
const rhythmXP = new RhythmXPCalculator({
  xpRatio: 0.1,  // 10 score = 1 XP (so perfect = 1 XP, great = 0.7 XP, etc.)
  combo: { cap: 5.0 },
  groove: {
    perHitMultiplier: false,  // Default: groove affects end bonus only
    endBonus: { enabled: true }
  }
});
const updater = new CharacterUpdater();

// Start session tracking
rhythmXP.startSession();
let comboCount = 0;

// On button press
function onButtonPress(timestamp: number) {
  const buttonResult = beatStream.checkButtonPress(timestamp);
  const grooveResult = grooveAnalyzer.recordHit(buttonResult.offset, beatStream.getCurrentBpm());

  // Check if combo is about to break (before updating)
  const comboBeforeHit = comboCount;
  const isComboBreaker = buttonResult.accuracy === 'miss' || buttonResult.accuracy === 'wrongKey';

  // Update combo
  if (isComboBreaker) {
    comboCount = 0;
  } else {
    comboCount++;
  }

  // Calculate XP for this hit AND update session totals
  const xpResult = rhythmXP.recordHit(buttonResult, {
    comboLength: comboCount,
    grooveHotness: grooveResult.hotness
  });

  console.log(`Accuracy: ${buttonResult.accuracy}`);
  console.log(`Score: ${xpResult.finalScore} points (for leaderboards)`);
  console.log(`XP: ${xpResult.finalXP} (added to character)`);

  // Get current session stats for UI (optional)
  const sessionStats = rhythmXP.getSessionTotals();
  console.log(`Session: ${sessionStats.totalScore} score, ${sessionStats.totalXP} XP, ${sessionStats.accuracyPercentage.toFixed(1)}% accuracy`);

  // Add to character (uses finalXP, not finalScore)
  const updateResult = updater.addRhythmXP(character, xpResult, 'rhythm_game');

  if (updateResult.leveledUp) {
    console.log(`🎉 LEVELED UP to ${updateResult.newLevel}!`);
    if (updateResult.levelUpDetails) {
      for (const detail of updateResult.levelUpDetails) {
        console.log(`  HP: +${detail.hpIncrease}`);
      }
    }
  }

  // If combo broke, award combo end bonus
  if (isComboBreaker && comboBeforeHit > 0) {
    const comboBonus = rhythmXP.calculateComboEndBonus(comboBeforeHit);
    console.log(`Combo ended! ${comboBeforeHit} hit streak → +${comboBonus.bonusXP} XP bonus`);
    updater.addXP(character, comboBonus.bonusXP, 'combo_bonus');
  }
}

// When song/session ends
function onSessionEnd() {
  const finalStats = rhythmXP.endSession();
  
  console.log('=== Session Complete ===');
  console.log(`Total Score: ${finalStats.totalScore}`);
  console.log(`Total XP: ${finalStats.totalXP}`);
  console.log(`Max Combo: ${finalStats.maxCombo}`);
  console.log(`Duration: ${finalStats.duration}s`);
  console.log(`Accuracy: ${finalStats.accuracyPercentage.toFixed(1)}%`);
  console.log('Accuracy Distribution:', finalStats.accuracyDistribution);
  
  // Check for any final groove bonus
  onGrooveEnd();
}

// When groove ends (hotness drops to 0 or session ends)
function onGrooveEnd() {
  const grooveState = grooveAnalyzer.getState();
  
  if (grooveState.grooveDuration !== null && grooveState.avgHotness > 0) {
    const bonus = rhythmXP.calculateGrooveEndBonus({
      maxStreak: grooveState.streakLength,
      avgHotness: grooveState.avgHotness,  // Now available from GrooveState!
      duration: grooveState.grooveDuration ?? 0,
      totalHits: grooveState.hitCount
    });
    console.log(`Groove ended! Duration: ${grooveState.grooveDuration}s, Avg Hotness: ${grooveState.avgHotness.toFixed(1)}%`);
    console.log(`Groove end bonus: +${bonus.bonusXP} XP`);
    updater.addXP(character, bonus.bonusXP, 'groove_bonus');
    
    // Reset groove stats for next groove
    grooveAnalyzer.resetGrooveStats();
  }
}

// Example: Check for groove end during gameplay loop
function gameLoop() {
  const grooveState = grooveAnalyzer.getState();
  
  // If hotness just dropped to 0 and we had an active groove
  if (grooveState.hotness === 0 && grooveState.grooveDuration !== null) {
    onGrooveEnd();
  }
}
```

### Score vs XP Explanation

The system separates two concepts:

| Concept | What it's for | Example Value |
|---------|---------------|---------------|
| **Score Points** | In-game display, leaderboards, feedback | 10 (perfect) |
| **Character XP** | Progression, leveling up | 1 (after 0.1 ratio) |

**Calculation flow:**
```
1. Base Score    → perfect = 10 score points
2. Multipliers   → 10 × 2.5x combo = 25 finalScore
3. XP Ratio      → 25 × 0.1 = 2.5 finalXP (added to character)
```

This lets you tune the rhythm game independently:
- Want faster leveling? Set `xpRatio: 0.2` (10 score = 2 XP)
- Want slower leveling? Set `xpRatio: 0.05` (10 score = 0.5 XP)
- Want score=XP? Set `xpRatio: 1.0` (10 score = 10 XP)

---

## Questions Resolved

1. **Combo Formula**: Custom formula support with configurable cap (default 5x)
2. **Combo End Bonus**: Optional bonus when combo breaks (default: comboLength × 2 score)
3. **Groove End Trigger**: Manual via `calculateGrooveEndBonus()` call
4. **Groove XP Mode**: Both per-hit and end-bonus supported; default is end-bonus only
5. **Miss/WrongKey XP**: Configurable (default 0). Negative values affect score only; character XP floored at 0
6. **Score vs XP**: Separate values via `xpRatio` (default 0.1 = 10 score = 1 XP)
7. **Listening XP Boost**: Rhythm game activity applies XP multiplier to listening sessions, just like weather/movement bonuses
8. **Two Parallel Systems**: RhythmXPCalculator (per-hit XP) and XPCalculator bonuses (listening XP boost) both accumulate simultaneously
9. **GrooveAnalyzer Enhancement**: Extend existing GrooveState with avgHotness, maxHotness, grooveDuration fields
10. **CharacterUpdater Integration**: addRhythmXP() triggers full level-up processing like addXP()
11. **Groove Reset Triggers**: Lifetime tracking resets when hotness drops to 0 OR when pocket direction changes (push↔pull); transitions to/from neutral do NOT trigger reset
