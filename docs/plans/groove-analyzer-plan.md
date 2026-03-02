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

- [ ] **1.1 Add GrooveAnalyzer Types**
  - [ ] `GrooveDirection` - 'push' | 'pull' | 'neutral'
  - [ ] `GrooveResult` - Return type for `recordHit()`
  - [ ] `GrooveState` - Current analyzer state snapshot
  - [ ] `GrooveAnalyzerOptions` - Configuration options

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
  /** Minimum hits to establish a pocket (default: 2) */
  minHitsForPocket: number;

  /** Base pocket window as fraction of beat (default: 0.03125 = 1/32 note) */
  basePocketWindowFraction: number;

  /** Minimum pocket window in seconds (floor for progressive tightening) */
  minPocketWindowSeconds: number;

  /** Hotness gain per consistent hit (default: 8) */
  hotnessGainPerHit: number;

  /** Hotness loss on pocket break (default: 20) */
  hotnessLossOnBreak: number;

  /** Number of recent hits to average for pocket establishment */
  averagingWindowSize: number;
}

export const DEFAULT_GROOVE_OPTIONS: GrooveAnalyzerOptions = {
  minHitsForPocket: 2,
  basePocketWindowFraction: 0.03125, // 1/32 note
  minPocketWindowSeconds: 0.015,     // 15ms floor
  hotnessGainPerHit: 8,
  hotnessLossOnBreak: 20,
  averagingWindowSize: 4,
};
```

---

## Phase 2: GrooveAnalyzer Class

Create `src/core/analysis/beat/GrooveAnalyzer.ts`.

- [ ] **2.1 Class Structure**
  - [ ] Constructor accepting `GrooveAnalyzerOptions`
  - [ ] Private state tracking properties
  - [ ] `recordHit(offset: number, bpm: number): GrooveResult` method
  - [ ] `getState(): GrooveState` method
  - [ ] `reset(): void` method

- [ ] **2.2 Pocket Detection Logic**
  - [ ] Track recent hit offsets in rolling window (default: 4 hits)
  - [ ] Calculate running average of offsets
  - [ ] Determine direction from average (push = negative, pull = positive)
  - [ ] Only establish pocket after `minHitsForPocket` consistent hits

- [ ] **2.3 Consistency Calculation**
  - [ ] Calculate distance from current hit to established pocket center
  - [ ] Calculate current pocket window (BPM-aware + progressive tightening)
  - [ ] Return consistency score (1.0 = perfect, 0.0 = outside window)

- [ ] **2.4 Hotness/Meter Logic**
  - [ ] Increase hotness when hit is within pocket window
  - [ ] Decrease hotness when hit breaks pocket
  - [ ] Progressive window tightening as hotness increases
  - [ ] Clamp hotness to 0-100 range

- [ ] **2.5 BPM-Aware Window Calculation**
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
    // 1. Add to recent offsets
    // 2. Update running average
    // 3. Determine pocket direction
    // 4. Calculate pocket window (BPM-aware + progressive)
    // 5. Check if hit is in pocket
    // 6. Update hotness
    // 7. Update streak
    // 8. Return result
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
    // Exponential moving average or simple average
  }

  private determineDirection(offset: number): GrooveDirection {
    if (Math.abs(offset) < 0.010) return 'neutral'; // 10ms dead zone (on beat)
    return offset < 0 ? 'push' : 'pull';
  }

  private checkDirectionChange(newDirection: GrooveDirection): boolean {
    // If we have an established pocket and direction flips, reset combo
    if (this.pocketDirection !== 'neutral' &&
        newDirection !== 'neutral' &&
        this.pocketDirection !== newDirection) {
      return true; // Direction changed - break combo
    }
    return false;
  }
}
```

---

## Phase 3: Exports & Integration

- [ ] **3.1 Export from beat index**
  - [ ] Add exports to `src/core/analysis/beat/index.ts`
  - [ ] Add types to `src/core/types/BeatMap.ts` exports

- [ ] **3.2 Export from main engine index**
  - [ ] Add to `src/index.ts` public exports

- [ ] **3.3 Integration with BeatStream (optional)**
  - [ ] Consider if `BeatStream` should optionally create/manage a `GrooveAnalyzer`
  - [ ] Or keep separate - frontend creates both and connects them

---

## Phase 4: Unit Tests

Create `tests/unit/beat/grooveAnalyzer.test.ts`.

- [ ] **4.1 Pocket Detection Tests**
  - [ ] Establishes pocket after 2-3 consistent hits
  - [ ] Correctly identifies push direction (negative offsets)
  - [ ] Correctly identifies pull direction (positive offsets)
  - [ ] Returns neutral when offsets are near zero

- [ ] **4.2 Consistency Calculation Tests**
  - [ ] Returns 1.0 consistency when hit is exactly on pocket
  - [ ] Returns 0.0 consistency when hit is outside window
  - [ ] Returns partial consistency for near-pocket hits

- [ ] **4.3 Hotness/Meter Tests**
  - [ ] Hotness increases on consistent hits
  - [ ] Hotness decreases on pocket breaks
  - [ ] Hotness clamped to 0-100
  - [ ] Progressive tightening works correctly

- [ ] **4.4 Edge Cases**
  - [ ] First hit returns sensible defaults
  - [ ] Reset clears all state
  - [ ] BPM changes affect pocket window correctly

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

    // After each button press during gameplay
    const result = grooveAnalyzer.recordHit(timingError, currentBpm);

    // Read the groove state for UI display
    if (result.pocketDirection !== 'neutral') {
      console.log(`${result.pocketDirection} groove: ${result.hotness}%`);
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
| Pocket establishment | 2-3 hits (fast) | Responsive feel for practice sessions |
| Window calculation | BPM-aware (1/32 note) | Musical timing, not fixed ms |

---

## Questions/Unknowns

- [ ] Should `GrooveAnalyzer` need BPM passed per-hit, or cached from construction?
  - **Recommendation:** Per-hit (BPM can change in some songs)

- [x] ~~Should breaking pocket reset streak or just reduce hotness?~~
  - **Answer:** Reduce hotness (chunk taken out), streak continues if still hitting

- [x] ~~How to handle direction changes mid-session?~~
  - **Answer:** Direction change (push → pull or pull → push) breaks the groove combo and starts fresh. User must re-establish a new pocket.

## Behavior Clarifications

**Groove Meter Activation:**
- Meter only activates when playing consistently AHEAD or BEHIND the beat
- Playing perfectly on the beat = no groove meter (neutral)
- Meter has dual quality: **direction** (pushed/pulled) + **intensity** (hotness 0-100)

**Direction Change = Reset:**
- If established pocket is +30ms (pull) and user suddenly hits -20ms (push), the combo breaks
- New pocket must be established from scratch
- This prevents "gaming" the system by oscillating

**Frontend Responsibility:**
- Engine provides: hotness, direction, consistency, streak
- Frontend decides: visual representation, decay over time, what "hot" looks like

---

## Future Considerations

- **Groove "style" labels** - Display text like "Laid Back", "Pushing", "On Point" based on offset magnitude
- **Best groove tracking** - Track highest hotness achieved in session
- **Multi-pocket detection** - Detect if user switches feels intentionally
