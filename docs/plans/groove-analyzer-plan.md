# GrooveAnalyzer Implementation Plan

## Overview

A "groove meter" system that rewards **consistency in timing feel** rather than proximity to perfect center. Inspired by Devil May Cry's style meter - it's not about being mechanically perfect, it's about establishing and maintaining a consistent "pocket."

### Core Philosophy
- Hitting consistently 30ms behind the beat = GOOD (you're in a pocket)
- Hitting perfectly on beat after establishing a behind-beat pocket = BAD (you broke the feel)
- The meter charges when you maintain consistency to YOUR established pocket, not to absolute perfection

---

## Phase 1: Types & Interfaces

Define all types in `src/core/types/BeatMap.ts` alongside existing beat-related types.

- [x] **1.1 Add GrooveAnalyzer Types**
  - [x] `GrooveDirection` - 'push' | 'pull' | 'neutral'
  - [x] `GrooveResult` - Return type for `recordHit()`
  - [x] `GrooveState` - Current analyzer state snapshot
  - [x] `GrooveAnalyzerOptions` - Configuration options

```typescript
// Direction of the established pocket
export type GrooveDirection = 'push' | 'pull' | 'neutral';

// Result returned after each hit
export interface GrooveResult {
  /** Direction of current pocket */
  pocketDirection: GrooveDirection;

  /** Running average offset in seconds (established pocket center) */
  establishedOffset: number;

  /** How close this hit was to the pocket (0-1, 1 = perfect consistency) */
  consistency: number;

  /** Current hotness/meter value (0-100) */
  hotness: number;

  /** Current streak length within pocket */
  streakLength: number;

  /** Whether this hit was in the pocket window */
  inPocket: boolean;

  /** Current pocket window size in seconds (changes with hotness) */
  pocketWindow: number;
}

// Snapshot of current state
export interface GrooveState {
  pocketDirection: GrooveDirection;
  establishedOffset: number;
  hotness: number;
  streakLength: number;
  hitCount: number;
  pocketWindow: number;
}

// Configuration options
export interface GrooveAnalyzerOptions {
  /** Minimum hits to establish a pocket (default: 3) */
  minHitsForPocket: number;

  /** Base pocket window as fraction of beat (default: 0.03125 = 1/32 note) */
  basePocketWindowFraction: number;

  /** Minimum pocket window in seconds (floor for progressive tightening) */
  minPocketWindowSeconds: number;

  /** Hotness gain per consistent hit (default: 8) */
  hotnessGainPerHit: number;

  /** Hotness loss on pocket break (default: 20) */
  hotnessLossOnBreak: number;

  /** Hotness loss on missed beat (default: 10) */
  hotnessLossOnMiss: number;

  /** Number of recent hits to average for pocket establishment (default: 4) */
  averagingWindowSize: number;

  /** Dead zone around zero for neutral classification in seconds (default: 0.010 = ±10ms) */
  neutralDeadZone: number;
}

export const DEFAULT_GROOVE_OPTIONS: GrooveAnalyzerOptions = {
  minHitsForPocket: 3,
  basePocketWindowFraction: 0.03125, // 1/32 note
  minPocketWindowSeconds: 0.015,     // 15ms floor
  hotnessGainPerHit: 8,
  hotnessLossOnBreak: 20,
  hotnessLossOnMiss: 10,
  averagingWindowSize: 4,
  neutralDeadZone: 0.010,            // ±10ms (20ms total)
};
```

---

## Phase 2: GrooveAnalyzer Class

Create `src/core/analysis/beat/GrooveAnalyzer.ts`.

- [x] **2.1 Class Structure**
  - [x] Constructor accepting `GrooveAnalyzerOptions`
  - [x] Private state tracking properties
  - [x] `recordHit(offset: number, bpm: number): GrooveResult` method
  - [x] `recordMiss(): GrooveResult` method (for missed beats)
  - [x] `getState(): GrooveState` method
  - [x] `reset(): void` method

- [x] **2.2 Pocket Detection Logic**
  - [x] Track recent hit offsets in rolling window (default: 4 hits)
  - [x] Calculate running average of offsets
  - [x] Determine direction from average (push = negative, pull = positive)
  - [x] Only establish pocket after `minHitsForPocket` consistent hits

- [x] **2.3 Consistency Calculation (Quadratic Falloff)**
  - [x] Calculate distance from current hit to established pocket center
  - [x] Calculate current pocket window (BPM-aware + progressive tightening)
  - [x] Return consistency score using **quadratic falloff**:
    ```typescript
    // 1.0 = perfect (at pocket center), 0.0 = outside window
    const normalizedDistance = distanceFromPocket / pocketWindow;
    if (normalizedDistance >= 1) return 0;
    return 1 - (normalizedDistance * normalizedDistance);  // Quadratic falloff
    ```

- [x] **2.4 Hotness/Meter Logic**
  - [x] Increase hotness when hit is within pocket window (+8 default)
  - [x] Decrease hotness when hit breaks pocket (-20 default)
  - [x] Decrease hotness when beat is missed (-10 default, via `recordMiss()`)
  - [x] Progressive window tightening as hotness increases
  - [x] Clamp hotness to 0-100 range

- [x] **2.5 BPM-Aware Window Calculation**
  ```
  // Step 1: Calculate 1/32 note duration at current BPM
  beatDuration = 60 / BPM  // in seconds
  thirtySecondNote = beatDuration / 8  // 1/32 note = 1/8 of a quarter note

  // Step 2: Calculate base pocket window (± around established offset)
  baseWindow = thirtySecondNote * 0.5  // half of 1/32 note each direction

  // Step 3: Apply progressive tightening
  minWindow = 0.010  // 10ms floor (configurable)
  pocketWindow = baseWindow - (baseWindow - minWindow) * (hotness / 100)

  Example at 120 BPM:
  - beatDuration = 0.5s (500ms)
  - 1/32 note = 62.5ms
  - baseWindow = 31.25ms
  - At 0% hotness: 31.25ms window
  - At 50% hotness: 20.6ms window
  - At 100% hotness: 10ms window

  Example at 90 BPM:
  - beatDuration = 0.667s (667ms)
  - 1/32 note = 83.3ms
  - baseWindow = 41.7ms
  - At 0% hotness: 41.7ms window
  - At 50% hotness: 25.8ms window
  - At 100% hotness: 10ms window
  ```

### Class Skeleton

```typescript
export class GrooveAnalyzer {
  private options: Required<GrooveAnalyzerOptions>;
  private recentOffsets: number[] = [];
  private establishedOffset: number = 0;
  private pocketDirection: GrooveDirection = 'neutral';
  private hotness: number = 0;
  private streakLength: number = 0;
  private hitCount: number = 0;

  constructor(options?: Partial<GrooveAnalyzerOptions>) {
    this.options = { ...DEFAULT_GROOVE_OPTIONS, ...options };
  }

  recordHit(offset: number, bpm: number): GrooveResult {
    // 1. Add to recent offsets (rolling window)
    // 2. Update running average (simple moving average)
    // 3. Determine pocket direction from average
    // 4. Calculate pocket window (BPM-aware + progressive)
    // 5. Calculate consistency (quadratic falloff)
    // 6. Check if hit is in pocket
    // 7. Update hotness (+gain if in pocket, -break if outside)
    // 8. Update streak
    // 9. Return result
  }

  /**
   * Record a missed beat (user didn't press)
   * Reduces hotness by configured miss penalty (default: 10)
   * Resets streak but does NOT clear the established pocket
   */
  recordMiss(): GrooveResult {
    this.hotness = Math.max(0, this.hotness - this.options.hotnessLossOnMiss);
    this.streakLength = 0;
    return this.getState();
  }

  getState(): GrooveState {
    return {
      pocketDirection: this.pocketDirection,
      establishedOffset: this.establishedOffset,
      hotness: this.hotness,
      streakLength: this.streakLength,
      hitCount: this.hitCount,
      pocketWindow: this.calculatePocketWindow(this.getCurrentBpm()),
    };
  }

  reset(): void {
    this.recentOffsets = [];
    this.establishedOffset = 0;
    this.pocketDirection = 'neutral';
    this.hotness = 0;
    this.streakLength = 0;
    this.hitCount = 0;
  }

  private calculatePocketWindow(bpm: number): number {
    // BPM-aware: 1/32 note at current BPM
    // Progressive: tighter at higher hotness
  }

  private updateRunningAverage(): void {
    // Simple moving average of recent offsets
    if (this.recentOffsets.length === 0) return;
    this.establishedOffset = this.recentOffsets.reduce((a, b) => a + b, 0) / this.recentOffsets.length;
  }

  private calculateConsistency(distanceFromPocket: number, pocketWindow: number): number {
    const normalizedDistance = distanceFromPocket / pocketWindow;
    if (normalizedDistance >= 1) return 0;
    // Quadratic falloff: 1.0 at center, 0.0 at edge
    return 1 - (normalizedDistance * normalizedDistance);
  }

  private determineDirection(offset: number): GrooveDirection {
    // Use configurable dead zone (±10ms by default = 20ms total)
    if (Math.abs(offset) < this.options.neutralDeadZone) return 'neutral';
    return offset < 0 ? 'push' : 'pull';
  }
}
```

### Direction Change Behavior (Gradual Shift)

When the user's timing drifts from one direction to another (e.g., push → pull):

1. **No hard reset** - The rolling average naturally shifts as new hits come in
2. **Pocket window follows** - As the average shifts, so does the pocket center
3. **Hotness affected** - During the transition, hits may fall outside the moving pocket, reducing hotness
4. **Natural transition** - This creates a smooth feel where the groove meter adapts to the player's evolving feel

This approach is more forgiving and feels more musical than a hard reset on direction change.

---

## Phase 3: Exports & Integration

- [x] **3.1 Export from beat index**
  - [x] Add exports to `src/core/analysis/beat/index.ts`
  - [x] Add types to `src/core/types/BeatMap.ts` exports

- [x] **3.2 Export from main engine index**
  - [x] Add to `src/index.ts` public exports

- [x] **3.3 Standalone Integration (No BeatStream Coupling)**
  - [x] Decision: GrooveAnalyzer is a standalone class
  - [x] Frontend creates and manages GrooveAnalyzer separately from BeatStream
  - [x] Frontend calls `recordHit(offset, bpm)` after each button press
  - [x] Frontend calls `recordMiss()` when user doesn't press on a beat
  - [x] This keeps the engine modular and allows flexible frontend implementations

---

## Phase 4: Unit Tests

Create `tests/unit/beat/grooveAnalyzer.test.ts`.

- [ ] **4.1 Pocket Detection Tests**
  - [ ] Establishes pocket after 3 consistent hits (minHitsForPocket)
  - [ ] Correctly identifies push direction (negative offsets)
  - [ ] Correctly identifies pull direction (positive offsets)
  - [ ] Returns neutral when offsets are within ±10ms dead zone
  - [ ] Direction shifts gradually as hitting pattern changes

- [ ] **4.2 Consistency Calculation Tests**
  - [ ] Returns 1.0 consistency when hit is exactly on pocket center
  - [ ] Returns 0.0 consistency when hit is outside window
  - [ ] Returns partial consistency with quadratic falloff:
    - [ ] 50% to edge = 0.75 consistency (1 - 0.5²)
    - [ ] 70% to edge = 0.51 consistency (1 - 0.7²)
    - [ ] 90% to edge = 0.19 consistency (1 - 0.9²)

- [ ] **4.3 Hotness/Meter Tests**
  - [ ] Hotness increases by 8 on consistent hits (in pocket)
  - [ ] Hotness decreases by 20 on pocket breaks
  - [ ] Hotness decreases by 10 on missed beats (recordMiss)
  - [ ] Hotness clamped to 0-100
  - [ ] Progressive tightening works correctly at higher hotness

- [ ] **4.4 Missed Beat Tests**
  - [ ] recordMiss() reduces hotness by configured amount (default 10)
  - [ ] recordMiss() resets streak to 0
  - [ ] recordMiss() does NOT clear established pocket

- [ ] **4.5 Edge Cases**
  - [ ] First hit returns sensible defaults (no pocket yet)
  - [ ] Second hit still no pocket (need 3 hits)
  - [ ] Reset clears all state
  - [ ] BPM changes affect pocket window correctly (auto-adjust)
  - [ ] Rolling window maintains correct size (drops old hits)

---

## Phase 5: Documentation

- [ ] **5.1 JSDoc Comments**
  - [ ] Document all public methods
  - [ ] Document all types/interfaces
  - [ ] Include usage examples

- [ ] **5.2 Update DATA_ENGINE_REFERENCE.md**
  - [ ] Add GrooveAnalyzer section
  - [ ] Document API and options

- [ ] **5.3 Update AUDIO_ANALYSIS.md**
  - [ ] Add "Groove Analysis" section explaining the style meter concept
  - [ ] Explain when to use it (during beat map playback for practice/learning)
  - [ ] Document the two-axis system: direction (push/pull/neutral) + intensity (hotness 0-100)
  - [ ] Add example showing how to connect GrooveAnalyzer to BeatStream hits
  - [ ] Example code:
    ```typescript
    // Frontend integration during gameplay
    const grooveAnalyzer = new GrooveAnalyzer();

    // On each button press during gameplay
    const buttonResult = beatStream.checkButtonPress(timestamp);
    const grooveResult = grooveAnalyzer.recordHit(buttonResult.offset, beatStream.getCurrentBpm());

    // When user misses a beat (doesn't press)
    grooveAnalyzer.recordMiss();

    // Read the groove state for UI display
    if (grooveResult.pocketDirection !== 'neutral') {
      console.log(`${grooveResult.pocketDirection} groove: ${grooveResult.hotness}%`);
    }
    ```

---

## Dependencies

- None (pure calculation, no external dependencies)

---

## Design Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Time-based decay | No | Engine provides score, frontend decides decay behavior |
| Pocket window | Progressive tightening | Harder to maintain at higher levels |
| Pocket establishment | 3 hits | More deliberate establishment, less jittery |
| Window calculation | BPM-aware (1/32 note) | Musical timing, not fixed ms |
| Consistency formula | Quadratic falloff | More forgiving near center, steeper drop at edges |
| Direction change | Gradual shift | Rolling average naturally adapts, no hard reset |
| Missed beats | Reduce hotness (-10) | Lighter penalty than pocket break, streak resets |
| Integration | Standalone class | Frontend manages separately, cleaner separation |
| Serialization | Not needed | Ephemeral "fun" metric, no persistence required |
| Multi-tempo | Auto-adjust | Per-hit BPM handles tempo changes automatically |
| Neutral dead zone | ±10ms (20ms total) | Tight tolerance for "on beat" classification |
| Average type | Simple moving average | Easier to understand, more stable |

---

## Questions/Unknowns

### Resolved Questions

- [x] ~~Should `GrooveAnalyzer` need BPM passed per-hit, or cached from construction?~~
  - **Answer:** Per-hit (BPM can change in some songs, auto-adjusts naturally)

- [x] ~~Should breaking pocket reset streak or just reduce hotness?~~
  - **Answer:** Reduce hotness (chunk taken out), streak continues if still hitting

- [x] ~~How to handle direction changes mid-session?~~
  - **Answer:** Gradual shift - rolling average naturally drifts to new direction, no hard reset

- [x] ~~What happens when user misses a beat entirely?~~
  - **Answer:** `recordMiss()` reduces hotness by 10, resets streak, but keeps established pocket

- [x] ~~Should GrooveAnalyzer integrate with BeatStream?~~
  - **Answer:** No - standalone class, frontend manages both and connects them

- [x] ~~How should consistency be calculated for partial hits?~~
  - **Answer:** Quadratic falloff from center (1.0) to edge (0.0)

- [x] ~~Should groove state be serializable?~~
  - **Answer:** No - ephemeral fun metric, no persistence needed

### No Open Questions

All design questions have been resolved.

## Behavior Clarifications

**Groove Meter Activation:**
- Meter only activates when playing consistently AHEAD or BEHIND the beat
- Playing perfectly on the beat (within ±10ms) = no groove meter (neutral)
- Meter has dual quality: **direction** (pushed/pulled) + **intensity** (hotness 0-100)
- Requires 3 consistent hits to establish a pocket

**Direction Change = Gradual Shift:**
- If established pocket is +30ms (pull) and user starts hitting -20ms (push), the rolling average gradually shifts
- The pocket center follows the player's evolving feel
- During transition, some hits may fall outside the moving pocket (reducing hotness)
- This feels more musical than hard resets

**Missed Beats:**
- Calling `recordMiss()` reduces hotness by 10 (lighter than pocket break's 20)
- Streak resets to 0
- Established pocket is NOT cleared - the groove can recover
- Frontend should call this when user doesn't press on a beat

**Consistency Calculation (Quadratic Falloff):**
- At pocket center: 1.0 (perfect)
- At 50% to edge: 0.75 (1 - 0.5²)
- At 70% to edge: 0.51 (1 - 0.7²)
- At 90% to edge: 0.19 (1 - 0.9²)
- At/beyond edge: 0.0 (outside window)

**Frontend Responsibility:**
- Engine provides: hotness, direction, consistency, streak, pocket window
- Frontend decides: visual representation, decay over time, what "hot" looks like
- Frontend must call `recordMiss()` when user doesn't press on a beat

---

## Future Considerations

- **Groove "style" labels** - Display text like "Laid Back", "Pushing", "On Point" based on offset magnitude
- **Best groove tracking** - Track highest hotness achieved in session
- **Multi-pocket detection** - Detect if user switches feels intentionally
