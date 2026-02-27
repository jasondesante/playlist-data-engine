# Engine: Sensitivity & Filter Controls Implementation Plan

> **Project**: playlist-data-engine
> **Depends on**: Nothing (this is the foundation)
> **Blocks**: Frontend sensitivity/filter UI updates

## Overview

The **primary improvement** is adding a `sensitivity` parameter that gives users control over how aggressively the beat detection algorithm works. A secondary `filter` parameter is available as an optional post-processing step.

### 1. Sensitivity (Pre-processing) — PRIMARY FEATURE
- **Range**: 0.1 to 10.0
- **Default**: 1.0
- **Behavior**: Adjusts `dpAlpha` to control tempo strictness
  - `< 1.0`: Less sensitive, stricter tempo adherence (fewer beats detected)
  - `= 1.0`: Default algorithm behavior
  - `> 1.0`: More sensitive, more flexible (more beats detected)

**How it works:**
```typescript
effectiveDpAlpha = dpAlpha / sensitivity
```
- Sensitivity **only** influences `dpAlpha` — nothing else in the pipeline changes
- `dpAlpha` is used in the DP algorithm's transition cost calculation
- Higher dpAlpha = stricter tempo = fewer beats
- Lower dpAlpha = more flexible = more beats

| Sensitivity | effectiveDpAlpha | Result |
|-------------|------------------|--------|
| 0.1 | 6800 | Very strict, fewer beats |
| 1.0 | 680 | Default |
| 2.0 | 340 | More flexible, more beats |
| 10.0 | 68 | Very flexible, many beats |

### 2. Filter (Post-processing) — OPTIONAL FEATURE
- **Range**: 0.0 to 1.0
- **Default**: 0.0 (disabled by default)
- **Behavior**: When enabled, filters beats by grid alignment
  - `= 0.0`: No filtering (default, all beats kept)
  - `= 0.5`: Remove beats significantly off the 1/4 note grid
  - `= 1.0`: Keep only beats exactly on the 1/4 note grid

This is an optional enhancement — most users will only need `sensitivity`.

### Existing Parameter: noiseFloorThreshold
- Already exposed in the public API
- Filters beats by minimum intensity (removes noise)
- **No changes needed in this plan**

---

## Phase 1: Pre-Processing Sensitivity

### 1.1 Rename intensityThreshold → sensitivity
- [x] In `BeatMap.ts`, rename `intensityThreshold` to `sensitivity` in `BeatMapGeneratorOptions`:
  ```typescript
  /** Pre-processing sensitivity (0.1-10.0, default: 1.0) */
  sensitivity?: number;
  ```
- [x] Update default:
  ```typescript
  sensitivity: 1.0,
  ```

### 1.2 Add Sensitivity to BeatTracker Config
- [x] In `BeatTracker.ts`, add to `BeatTrackerConfig`:
  ```typescript
  export interface BeatTrackerConfig {
      dpAlpha?: number;
      /** Sensitivity multiplier (0.1-10, default: 1.0) */
      sensitivity?: number;
      minPredecessorRatio?: number;
      maxPredecessorRatio?: number;
  }
  ```
- [x] In `trackBeats()`, calculate effective dpAlpha:
  ```typescript
  const sensitivity = this.config.sensitivity ?? 1.0;
  const effectiveDpAlpha = Math.round(this.config.dpAlpha / sensitivity);

  // Clamp to reasonable bounds (prevent extreme values)
  const clampedDpAlpha = Math.max(10, Math.min(10000, effectiveDpAlpha));
  ```
- [x] Use `clampedDpAlpha` in transition cost calculation

### 1.3 Sensitivity Mapping Logic
- [x] Implement mapping:
  ```typescript
  // sensitivity 0.1 → dpAlpha * 10 = 6800 (very strict, fewer beats)
  // sensitivity 1.0 → dpAlpha * 1 = 680 (default)
  // sensitivity 2.0 → dpAlpha / 2 = 340 (more beats)
  // sensitivity 10.0 → dpAlpha / 10 = 68 (very flexible, many beats)
  ```

### 1.4 Pass Sensitivity from BeatMapGenerator
- [x] In `BeatMapGenerator.ts`, create BeatTracker with sensitivity:
  ```typescript
  const beatTracker = new BeatTracker({
      dpAlpha: this.options.dpAlpha,
      sensitivity: this.options.sensitivity,
  });
  ```

### 1.5 Update Metadata
- [x] In `BeatMap.ts`, update `BeatMapMetadata`:
  ```typescript
  interface BeatMapMetadata {
      // ... existing fields
      sensitivity: number;  // Pre-processing sensitivity used (was intensityThreshold)
  }
  ```

### 1.6 Add Unit Tests for Sensitivity
- [x] Test sensitivity = 0.5 produces fewer beats than 1.0
- [x] Test sensitivity = 1.0 produces default beat count
- [x] Test sensitivity = 2.0 produces more beats than 1.0
- [x] Test sensitivity = 5.0 produces even more beats
- [x] Test sensitivity = 10.0 doesn't produce garbage/noise

---

## Phase 2: Post-Processing Filter (Grid-Alignment)

### 2.1 Add Filter Parameter to Options
- [x] In `BeatMap.ts`, add to `BeatMapGeneratorOptions`:
  ```typescript
  /** Post-processing grid-alignment filter (0.0-1.0, default: 0.0) */
  filter?: number;
  ```
- [x] Add to defaults:
  ```typescript
  filter: 0.0,
  ```

### 2.2 Implement Grid-Alignment Filter in BeatMapGenerator
- [x] Add new method in `BeatMapGenerator.ts`:
  ```typescript
  /**
   * Filter beats by how well they align with the tempo grid.
   *
   * @param beats - Beats to filter
   * @param tempoEstimate - Tempo estimate with beat period
   * @param filterThreshold - Grid alignment threshold (0.0-1.0)
   * @returns Filtered beats
   */
  private filterBeatsByGridAlignment(
      beats: Beat[],
      tempoEstimate: TempoEstimate,
      filterThreshold: number
  ): Beat[] {
      if (filterThreshold <= 0) return beats;

      const beatPeriod = 60.0 / tempoEstimate.primaryBpm; // seconds per beat

      // Calculate max allowed deviation based on threshold
      // threshold 0.0 = allow any deviation
      // threshold 1.0 = allow 0 deviation (only exact grid)
      // threshold 0.5 = allow 50% of a half-beat deviation
      const maxDeviation = (1.0 - filterThreshold) * (beatPeriod / 2);

      const filtered = beats.filter(beat => {
          // Calculate how far this beat is from the nearest grid position
          const gridPosition = Math.round(beat.timestamp / beatPeriod);
          const expectedTime = gridPosition * beatPeriod;
          const deviation = Math.abs(beat.timestamp - expectedTime);

          return deviation <= maxDeviation;
      });

      logger.debug('BeatDetection', 'Filtered beats by grid alignment', {
          originalCount: beats.length,
          filteredCount: filtered.length,
          threshold: filterThreshold,
          maxDeviationMs: maxDeviation * 1000,
      });

      return filtered;
  }
  ```
- [x] Call this method after beat tracking when `filter > 0`

### 2.3 Integration in generateBeatMapFromBuffer
- [x] Apply filter after downbeat detection:
  ```typescript
  // Post-processing: filter beats by grid alignment
  let beats = downbeatResult.beats;
  if (filter > 0) {
      beats = this.filterBeatsByGridAlignment(beats, tempoEstimate, filter);
  }
  ```

### 2.4 Add Filter to Metadata
- [x] In `BeatMap.ts`, add to `BeatMapMetadata`:
  ```typescript
  interface BeatMapMetadata {
      // ... existing fields
      filter: number;  // Post-processing filter used
  }
  ```

### 2.5 Add Unit Tests for Filter
- [x] Test filter = 0.0 (no filtering)
- [x] Test filter = 0.5 (moderate filtering)
- [x] Test filter = 0.9 (aggressive filtering)
- [x] Test filter = 1.0 (only exact grid beats)
- [x] Test with beats on various subdivisions (1/4, 1/8, 1/16)
- [x] Test edge case: empty beats array

---

## Phase 3: Integration & Documentation

### 3.1 Update BeatMapGenerator.generateBeatMapFromBuffer
- [x] Apply both parameters:
  ```typescript
  const sensitivity = this.options.sensitivity ?? 1.0;
  const filter = this.options.filter ?? 0.0;

  // Pre-processing: sensitivity is passed to BeatTracker
  const beatTracker = new BeatTracker({
      dpAlpha: this.options.dpAlpha,
      sensitivity: sensitivity,
  });

  // ... run beat detection ...

  // Post-processing: filter beats by grid alignment
  let beats = downbeatResult.beats;
  if (filter > 0) {
      beats = this.filterBeatsByGridAlignment(beats, tempoEstimate, filter);
  }

  // Apply noise floor threshold (existing behavior)
  beats = this.applyIntensityThreshold(beats);
  ```

### 3.2 Integration Tests
- [x] Test combinations:
  - [x] Low sensitivity + No filter
  - [x] High sensitivity + No filter
  - [x] Default sensitivity + High filter
  - [x] High sensitivity + High filter
- [x] Test with various audio types (steady beats, syncopated, complex rhythms)
- [x] Verify metadata is correctly stored

### 3.3 Update Documentation
- [x] Update `docs/AUDIO_ANALYSIS.md`:
  - [x] Document `sensitivity` parameter
  - [x] Document `filter` parameter
  - [x] Add usage examples with different combinations
- [x] Update `DATA_ENGINE_REFERENCE.md`
- [x] Add inline code comments (already adequate in source files)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Rename `intensityThreshold` → `sensitivity`, add `filter` to options and metadata |
| `src/core/analysis/beat/BeatMapGenerator.ts` | Add `filterBeatsByGridAlignment()` method, pass sensitivity to tracker |
| `src/core/analysis/beat/BeatTracker.ts` | Add sensitivity to config, adjust dpAlpha |
| `docs/AUDIO_ANALYSIS.md` | Document new parameters |
| `tests/unit/beat/beatMapGenerator.test.ts` | Add tests for both parameters |

---

## API Changes

### Before
```typescript
interface BeatMapGeneratorOptions {
    intensityThreshold?: number; // 0-1, unused
    noiseFloorThreshold?: number; // 0-1, intensity floor
    dpAlpha?: number; // transition cost weight
    // ...
}
```

### After
```typescript
interface BeatMapGeneratorOptions {
    /** Pre-processing sensitivity (0.1-10.0, default: 1.0) */
    sensitivity?: number;

    /** Post-processing grid-alignment filter (0.0-1.0, default: 0.0) */
    filter?: number;

    noiseFloorThreshold?: number; // unchanged, intensity floor
    dpAlpha?: number; // unchanged, base transition cost weight
    // ...
}
```

---

## Parameter Behavior Summary

| Sensitivity | Filter | Result |
|-------------|--------|--------|
| 0.5 | 0.0 | Fewer beats detected, all kept |
| 1.0 | 0.0 | Default detection, all kept |
| 2.0 | 0.0 | More beats detected, all kept (including subdivisions) |
| 1.0 | 0.5 | Default detection, off-grid beats removed |
| 2.0 | 0.5 | More beats detected, off-grid beats removed |
| 2.0 | 1.0 | Many beats detected, only exact grid beats kept |

---

## Estimated Scope

- **Phase 1**: Sensitivity implementation - ~2-3 hours
- **Phase 2**: Filter implementation - ~2-3 hours
- **Phase 3**: Integration & docs - ~1-2 hours

**Total**: ~5-8 hours

---

## Completion Checklist

- [x] All unit tests pass
- [x] Integration tests pass
- [x] Documentation updated
- [x] Ready to publish new engine version
