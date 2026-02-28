# Configurable Accuracy Thresholds Implementation Plan

## Overview

Add configurable beat tap accuracy thresholds to the playlist-data-engine, allowing frontend applications to customize difficulty settings. This includes adding a 4th accuracy level ("ok"), three difficulty presets (easy/medium/hard), and support for fully custom thresholds.

## Current State

- **3 accuracy levels**: `perfect`, `great`, `good`, `miss`
- **Hardcoded thresholds** in `BEAT_ACCURACY_THRESHOLDS`:
  - Perfect: ±10ms
  - Great: ±25ms
  - Good: ±50ms
  - Miss: >50ms
- **No configuration** - thresholds are constants, not options

## Target State

- **4 accuracy levels**: `perfect`, `great`, `good`, `ok`, `miss`
- **3 difficulty presets**:
  - **Easy**: perfect=±75ms, great=±125ms, good=±175ms, ok=±250ms
  - **Medium**: perfect=±45ms, great=±90ms, good=±135ms, ok=±200ms
  - **Hard**: perfect=±10ms, great=±25ms, good=±50ms, ok=±100ms (current behavior)
- **Custom thresholds**: Allow manual configuration of all 4 thresholds via `BeatStreamOptions`
- **Backward compatible**: Default behavior unchanged (Hard preset)

---

## Phase 1: Type Definitions

### Task 1.1: Update BeatAccuracy Type
- [x] Add `'ok'` to `BeatAccuracy` type in `src/core/types/BeatMap.ts`
  ```typescript
  export type BeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss';
  ```

### Task 1.2: Create AccuracyThresholds Interface
- [x] Add new `AccuracyThresholds` interface in `src/core/types/BeatMap.ts`
  ```typescript
  /**
   * Accuracy thresholds for button press detection (in seconds)
   * Used to configure difficulty levels for rhythm games.
   */
  export interface AccuracyThresholds {
      /** Perfect: within this threshold (seconds) */
      perfect: number;
      /** Great: within this threshold (seconds) */
      great: number;
      /** Good: within this threshold (seconds) */
      good: number;
      /** Ok: within this threshold (seconds) */
      ok: number;
  }
  ```

### Task 1.3: Create DifficultyPreset Type
- [x] Add `DifficultyPreset` type in `src/core/types/BeatMap.ts`
  ```typescript
  /**
   * Preset difficulty levels for accuracy thresholds
   */
  export type DifficultyPreset = 'easy' | 'medium' | 'hard' | 'custom';
  ```

---

## Phase 2: Constants and Presets

### Task 2.1: Define Difficulty Preset Thresholds
- [x] Add preset constants in `src/core/types/BeatMap.ts`
  ```typescript
  /**
   * Easy difficulty thresholds (forgiving)
   */
  export const EASY_ACCURACY_THRESHOLDS: AccuracyThresholds = {
      perfect: 0.075,  // ±75ms
      great: 0.125,    // ±125ms
      good: 0.175,     // ±175ms
      ok: 0.250,       // ±250ms
  } as const;

  /**
   * Medium difficulty thresholds (balanced)
   */
  export const MEDIUM_ACCURACY_THRESHOLDS: AccuracyThresholds = {
      perfect: 0.045,  // ±45ms
      great: 0.090,    // ±90ms
      good: 0.135,     // ±135ms
      ok: 0.200,       // ±200ms
  } as const;

  /**
   * Hard difficulty thresholds (strict - original behavior)
   */
  export const HARD_ACCURACY_THRESHOLDS: AccuracyThresholds = {
      perfect: 0.010,  // ±10ms
      great: 0.025,    // ±25ms
      good: 0.050,     // ±50ms
      ok: 0.100,       // ±100ms
  } as const;
  ```

### Task 2.2: Update Default Thresholds Constant
- [x] Rename and update `BEAT_ACCURACY_THRESHOLDS` to use the new structure
  ```typescript
  /**
   * Default accuracy thresholds (Hard difficulty)
   * @deprecated Use HARD_ACCURACY_THRESHOLDS or getAccuracyThresholds() instead
   */
  export const BEAT_ACCURACY_THRESHOLDS: AccuracyThresholds = HARD_ACCURACY_THRESHOLDS;
  ```

### Task 2.3: Add Preset Lookup Function
- [x] Add helper function in `src/core/types/BeatMap.ts`
  ```typescript
  /**
   * Get accuracy thresholds for a difficulty preset
   */
  export function getAccuracyThresholdsForPreset(preset: DifficultyPreset): AccuracyThresholds {
      switch (preset) {
          case 'easy':
              return EASY_ACCURACY_THRESHOLDS;
          case 'medium':
              return MEDIUM_ACCURACY_THRESHOLDS;
          case 'hard':
          default:
              return HARD_ACCURACY_THRESHOLDS;
      }
  }
  ```

---

## Phase 3: BeatStreamOptions Updates

### Task 3.1: Add Threshold Options to BeatStreamOptions
- [ ] Update `BeatStreamOptions` interface in `src/core/types/BeatMap.ts`
  ```typescript
  export interface BeatStreamOptions {
      /** Time before beat to emit 'upcoming' event in seconds (default: 2.0) */
      anticipationTime?: number;

      /** Player-calibrated audio/visual offset in milliseconds (default: 0) */
      userOffsetMs?: number;

      /**
       * Auto-adjust using AudioContext.outputLatency (default: true)
       */
      compensateOutputLatency?: boolean;

      /** Timing tolerance for synchronization in seconds (default: 0.01) */
      timingTolerance?: number;

      /**
       * Difficulty preset for accuracy thresholds (default: 'hard')
       * Ignored if customThresholds is provided.
       */
      difficultyPreset?: DifficultyPreset;

      /**
       * Custom accuracy thresholds (in seconds)
       * If provided, overrides difficultyPreset.
       */
      customThresholds?: Partial<AccuracyThresholds>;
  }
  ```

### Task 3.2: Update DEFAULT_BEATSTREAM_OPTIONS
- [ ] Add new defaults in `src/core/types/BeatMap.ts`
  ```typescript
  export const DEFAULT_BEATSTREAM_OPTIONS: Required<BeatStreamOptions> = {
      anticipationTime: 2.0,
      userOffsetMs: 0,
      compensateOutputLatency: true,
      timingTolerance: 0.01,
      difficultyPreset: 'hard',
      customThresholds: {},
  };
  ```

---

## Phase 4: BeatStream Implementation

### Task 4.1: Add Threshold Resolution to BeatStream
- [ ] Add private method to resolve effective thresholds in `BeatStream.ts`
  ```typescript
  /**
   * Resolve the effective accuracy thresholds based on options
   */
  private resolveThresholds(): AccuracyThresholds {
      // If custom thresholds provided, merge with defaults
      if (this.options.customThresholds && Object.keys(this.options.customThresholds).length > 0) {
          const base = getAccuracyThresholdsForPreset(this.options.difficultyPreset || 'hard');
          return {
              ...base,
              ...this.options.customThresholds,
          };
      }

      // Otherwise use preset
      return getAccuracyThresholdsForPreset(this.options.difficultyPreset || 'hard');
  }
  ```

### Task 4.2: Store Resolved Thresholds in BeatStream
- [ ] Add thresholds property to BeatStream state
- [ ] Initialize thresholds in constructor
- [ ] Add getter method for current thresholds
  ```typescript
  /**
   * Get the current accuracy thresholds being used
   */
  getAccuracyThresholds(): AccuracyThresholds {
      return this.state.thresholds;
  }
  ```

### Task 4.3: Update checkButtonPress Method
- [ ] Modify accuracy determination logic to use resolved thresholds and include 'ok' level
  ```typescript
  // Determine accuracy level using configured thresholds
  let accuracy: BeatAccuracy;
  const thresholds = this.state.thresholds;

  if (absoluteOffset <= thresholds.perfect) {
      accuracy = 'perfect';
  } else if (absoluteOffset <= thresholds.great) {
      accuracy = 'great';
  } else if (absoluteOffset <= thresholds.good) {
      accuracy = 'good';
  } else if (absoluteOffset <= thresholds.ok) {
      accuracy = 'ok';
  } else {
      accuracy = 'miss';
  }
  ```

---

## Phase 5: Export Updates

### Task 5.1: Update Beat Module Exports
- [ ] Add new exports to `src/core/analysis/beat/index.ts`
  ```typescript
  export {
      // ... existing exports ...
      EASY_ACCURACY_THRESHOLDS,
      MEDIUM_ACCURACY_THRESHOLDS,
      HARD_ACCURACY_THRESHOLDS,
      getAccuracyThresholdsForPreset,
  } from '../../types/BeatMap.js';

  export type {
      // ... existing type exports ...
      AccuracyThresholds,
      DifficultyPreset,
  } from '../../types/BeatMap.js';
  ```

### Task 5.2: Update Main Index Exports
- [ ] Add new exports to `src/index.ts`
  ```typescript
  // Beat detection constants
  export {
      // ... existing exports ...
      EASY_ACCURACY_THRESHOLDS,
      MEDIUM_ACCURACY_THRESHOLDS,
      HARD_ACCURACY_THRESHOLDS,
      getAccuracyThresholdsForPreset,
  } from './core/types/BeatMap.js';

  export type {
      // ... existing type exports ...
      AccuracyThresholds,
      DifficultyPreset,
  } from './core/types/BeatMap.js';
  ```

---

## Phase 6: Test Updates

### Task 6.1: Update Unit Tests
- [ ] Update `tests/unit/beat/beatStream.test.ts`
  - [ ] Add tests for new 'ok' accuracy level
  - [ ] Add tests for difficulty presets (easy/medium/hard)
  - [ ] Add tests for custom thresholds
  - [ ] Update existing threshold boundary tests

### Task 6.2: Update Integration Tests
- [ ] Update `tests/integration/beatDetection.integration.test.ts`
  - [ ] Add tests for preset selection
  - [ ] Add tests for custom threshold override
  - [ ] Update accuracy detection tests to include 'ok'

---

## Phase 7: Documentation Updates

### Task 7.1: Update DATA_ENGINE_REFERENCE.md
- [ ] Update "Beat Detection Types" table to include:
  - `AccuracyThresholds` interface
  - `DifficultyPreset` type
- [ ] Update "Beat Detection Constants" table to include:
  - `EASY_ACCURACY_THRESHOLDS`
  - `MEDIUM_ACCURACY_THRESHOLDS`
  - `HARD_ACCURACY_THRESHOLDS`
  - `getAccuracyThresholdsForPreset()`
- [ ] Update `BeatStreamOptions` documentation
- [ ] Update `ButtonPressResult` accuracy levels (add 'ok')
- [ ] Update `checkButtonPress` method documentation

### Task 7.2: Update AUDIO_ANALYSIS.md
- [ ] Update "Button Press Accuracy" section with:
  - New 'ok' accuracy level
  - Difficulty presets table
  - Example usage with custom thresholds
- [ ] Add new "Configuring Difficulty" section with code examples
  ```typescript
  // Using presets
  const stream = new BeatStream(beatMap, audioContext, {
      difficultyPreset: 'easy'
  });

  // Using custom thresholds
  const stream = new BeatStream(beatMap, audioContext, {
      customThresholds: {
          perfect: 0.050,  // ±50ms
          great: 0.100,    // ±100ms
          good: 0.150,     // ±150ms
          ok: 0.200,       // ±200ms
      }
  });
  ```

---

## Dependencies

- None (self-contained feature)

---

## Breaking Changes

### Potentially Breaking
- `BEAT_ACCURACY_THRESHOLDS` structure changes from `{ perfect, great, good }` to `{ perfect, great, good, ok }`
  - **Mitigation**: Old code accessing only `perfect`, `great`, `good` will still work
  - **Action**: Mark as `@deprecated` with migration path

### Non-Breaking
- `BeatAccuracy` type adds `'ok'` - existing switch statements may need default case
- `BeatStreamOptions` adds optional fields - backward compatible

---

## Questions/Unknowns

- [ ] Should we validate that thresholds are in ascending order (perfect < great < good < ok)?
- [ ] Should we expose a method to change difficulty mid-stream, or require re-creation?
- [ ] Should we add a `validateThresholds()` helper for frontend use?

---

## Estimated Effort

| Phase | Tasks | Complexity |
|-------|-------|------------|
| Phase 1: Types | 3 tasks | Low |
| Phase 2: Constants | 3 tasks | Low |
| Phase 3: Options | 2 tasks | Low |
| Phase 4: BeatStream | 3 tasks | Medium |
| Phase 5: Exports | 2 tasks | Low |
| Phase 6: Tests | 2 tasks | Medium |
| Phase 7: Docs | 2 tasks | Medium |
| **Total** | **17 tasks** | **~4-6 hours** |

---

## Success Criteria

- [ ] All 4 accuracy levels work correctly (perfect, great, good, ok, miss)
- [ ] All 3 presets produce expected threshold values
- [ ] Custom thresholds override preset values
- [ ] Existing tests pass (backward compatibility)
- [ ] New tests cover all new functionality
- [ ] Documentation is complete and accurate
- [ ] Frontend can successfully configure difficulty
