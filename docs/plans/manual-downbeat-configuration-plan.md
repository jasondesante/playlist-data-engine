# Manual Downbeat Configuration Implementation Plan

## Overview

Replace automatic downbeat detection with a manual configuration system. Users will specify the downbeat position and time signature when configuring a track, rather than relying on automatic intensity-based detection which is unreliable for electronic music.

**Rationale**: Automatic downbeat detection based on intensity patterns fails often in electronic music where intensity is uniform. A manual system gives users precise control and produces consistent, predictable results.

### Primary Workflow

**Important**: The typical workflow is **generate-then-configure**:

1. **Generate** the beat map first (with default config)
2. **Examine** the beat map to identify where the downbeat should be
3. **Reapply** the correct downbeat configuration using `reapplyDownbeatConfig()`

This is because you need to see the beat map to know which beat should be the downbeat. You can't know this before analyzing the audio.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `reapplyDownbeatConfig` location | Standalone function in `BeatMap.ts` | BeatMap is an interface, not a class |
| `downbeatConfig` in BeatMap | Optional field | Omitted if default was used, stored only if explicitly passed |
| Measure numbering across segments | Continue incrementing | Measure number doesn't reset when time signature changes |
| Segments | Contiguous by definition | No gaps - each segment runs until the next one starts |
| Beat count validation | After beat detection | Can't validate until we know total beats |

---

## Goals

1. Remove `DownbeatDetector` class and related code
2. Add `TimeSignatureConfig` type for specifying beats per measure (defaults to 4/4)
3. Add `DownbeatSegment` and `DownbeatConfig` types supporting time signature changes
4. Add optional `downbeatConfig` parameter to `generateBeatMap()` for per-track configuration
5. Store `downbeatConfig` in `BeatMap` only when explicitly provided (omit for default)
6. Calculate `beatInMeasure`, `isDownbeat`, `measureNumber` from manual config
7. Support placing downbeat at any beat (e.g., beat 9) with bidirectional calculation
8. Support time signature changes within a track via contiguous segments
9. Add `reapplyDownbeatConfig()` standalone function for reprocessing without audio re-analysis
10. Remove `isDuple` from `TempoEstimate` (dead code after DownbeatDetector removal)
11. Update `BeatInterpolator.reassignBeatPositions()` to read config from `BeatMap`
12. Update all documentation with emphasis on generate-then-configure workflow

---

## Files Affected

### Files to Delete
| File | Reason |
|------|--------|
| `src/core/analysis/beat/DownbeatDetector.ts` | Automatic detection removed |
| `tests/unit/beat/downbeatDetector.test.ts` | Tests for removed class |

### Files to Modify (Core)
| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Add `TimeSignatureConfig`, `DownbeatSegment`, `DownbeatConfig`, `validateDownbeatConfig`, add optional `downbeatConfig` to `BeatMap`, add `reapplyDownbeatConfig()` function, remove `DownbeatDetectorConfig`, `DownbeatDetectionResult`, remove `isDuple` from `TempoEstimate` |
| `src/core/analysis/beat/BeatMapGenerator.ts` | Remove `DownbeatDetector` usage, add optional `downbeatConfig` parameter to `generateBeatMap()`, add manual downbeat calculation with segment support, store config in BeatMap only if explicitly provided |
| `src/core/analysis/beat/BeatInterpolator.ts` | Update `reassignBeatPositions()` to read config from `BeatMap.downbeatConfig` |
| `src/core/analysis/beat/TempoDetector.ts` | Remove `isDuple` calculation and return value (keep TPS2/TPS3 methods) |
| `src/core/analysis/beat/index.ts` | Remove `DownbeatDetector` exports |
| `src/index.ts` | Remove `DownbeatDetector` export, add new type exports, add `reapplyDownbeatConfig` export |

### Files to Modify (Documentation)
| File | Changes |
|------|---------|
| `docs/AUDIO_ANALYSIS.md` | Remove DownbeatDetector docs, add manual config docs |
| `DATA_ENGINE_REFERENCE.md` | Remove DownbeatDetector section, update TempoEstimate (remove `isDuple`), add DownbeatConfig docs |

---

## Phase 1: Type System Updates

### 1.1 Add New Types in BeatMap.ts

- [x] Add `TimeSignatureConfig` interface
  ```typescript
  /**
   * Time signature configuration for beat grid
   * Defaults to 4/4 time if not specified
   */
  export interface TimeSignatureConfig {
      /** Number of beats per measure (default: 4 for 4/4 time) */
      beatsPerMeasure: number;
  }

  /** Default time signature (4/4) */
  export const DEFAULT_TIME_SIGNATURE: TimeSignatureConfig = {
      beatsPerMeasure: 4,
  };
  ```

- [x] Add `DownbeatSegment` interface for supporting time signature changes
  ```typescript
  /**
   * A segment of downbeat configuration
   * Used to support time signature changes within a track
   *
   * Segments are CONTIGUOUS - each segment covers all beats from its startBeat
   * until the next segment's startBeat (or end of track). There are no gaps.
   *
   * Example: If segment 1 has startBeat: 0 and segment 2 has startBeat: 32,
   * then segment 1 covers beats 0-31 and segment 2 covers beats 32+.
   */
  export interface DownbeatSegment {
      /**
       * Beat index where this segment starts
       * The first segment should typically have startBeat: 0
       */
      startBeat: number;

      /**
       * Beat index that represents the "one" (downbeat) in this segment
       * This is an absolute beat index, not relative to startBeat
       *
       * Example: If set to 9 with beatsPerMeasure: 4, then beats 1, 5, 9, 13, 17... are downbeats
       * (calculated bidirectionally from beat 9)
       */
      downbeatBeatIndex: number;

      /** Time signature for this segment */
      timeSignature: TimeSignatureConfig;
  }
  ```

- [x] Add `DownbeatConfig` interface
  ```typescript
  /**
   * Downbeat configuration for manual placement
   * Supports multiple segments for time signature changes within a track
   */
  export interface DownbeatConfig {
      /**
       * Array of downbeat segments
       * - For simple tracks: single segment with startBeat: 0
       * - For time signature changes: multiple segments ordered by startBeat
       *
       * Each segment defines its own downbeat anchor and time signature.
       * The downbeatBeatIndex is absolute (not relative to segment start).
       */
      segments: DownbeatSegment[];
  }

  /** Default downbeat config (first beat is the one, 4/4 time) */
  export const DEFAULT_DOWNBEAT_CONFIG: DownbeatConfig = {
      segments: [{
          startBeat: 0,
          downbeatBeatIndex: 0,
          timeSignature: DEFAULT_TIME_SIGNATURE,
      }],
  };
  ```

### 1.2 Update BeatMap Type

- [x] Add optional `downbeatConfig` field to `BeatMap` interface
  ```typescript
  export interface BeatMap {
      // ... existing fields ...

      /**
       * The downbeat configuration used to generate this beat map
       * Only stored if explicitly provided; undefined means default (beat 0 = downbeat, 4/4 time)
       * Stored for reproducibility and reprocessing
       */
      downbeatConfig?: DownbeatConfig;
  }
  ```

  **Note**: The field is optional. If the default config was used, the field is omitted (undefined).
  This keeps BeatMaps clean when using default behavior.

### 1.3 Update generateBeatMap() Signature

- [x] Add optional `downbeatConfig` parameter to `generateBeatMap()` method
  ```typescript
  /**
   * Generate a beat map for an audio file
   *
   * IMPORTANT: The typical workflow is to generate FIRST with default config,
   * examine the beat map to identify the correct downbeat, then use
   * reapplyDownbeatConfig() to set it. You usually don't know the correct
   * downbeat until after seeing the generated beat map.
   *
   * @param audioFilePath - Path to the audio file
   * @param trackId - Unique identifier for this track
   * @param downbeatConfig - Optional manual downbeat configuration (defaults to beat 0 = downbeat, 4/4 time)
   *                          If provided, will be stored in the resulting BeatMap
   */
  async generateBeatMap(
      audioFilePath: string,
      trackId: string,
      downbeatConfig?: DownbeatConfig
  ): Promise<BeatMap>
  ```

### 1.4 Validation Constants and Function

- [x] Add validation for downbeatConfig
  ```typescript
  /** Minimum beats per measure */
  export const MIN_BEATS_PER_MEASURE = 2;

  /** Maximum beats per measure */
  export const MAX_BEATS_PER_MEASURE = 12;

  /**
   * Validate downbeat configuration (structural validation only)
   *
   * Note: Beat count validation (e.g., downbeatBeatIndex < totalBeats) happens
   * inside generateBeatMap() AFTER beat detection, since we don't know the
   * total beat count until then.
   *
   * @throws Error if configuration is invalid
   */
  export function validateDownbeatConfig(config: DownbeatConfig): void {
      if (!config.segments || config.segments.length === 0) {
          throw new Error('DownbeatConfig must have at least one segment');
      }

      for (const segment of config.segments) {
          if (segment.startBeat < 0) {
              throw new Error(`startBeat must be non-negative, got ${segment.startBeat}`);
          }
          if (segment.downbeatBeatIndex < 0) {
              throw new Error(`downbeatBeatIndex must be non-negative, got ${segment.downbeatBeatIndex}`);
          }
          const { beatsPerMeasure } = segment.timeSignature;
          if (beatsPerMeasure < MIN_BEATS_PER_MEASURE || beatsPerMeasure > MAX_BEATS_PER_MEASURE) {
              throw new Error(
                  `beatsPerMeasure must be between ${MIN_BEATS_PER_MEASURE} and ${MAX_BEATS_PER_MEASURE}, got ${beatsPerMeasure}`
              );
          }
      }

      // Verify segments are ordered by startBeat
      for (let i = 1; i < config.segments.length; i++) {
          if (config.segments[i].startBeat <= config.segments[i - 1].startBeat) {
              throw new Error('Segments must be ordered by startBeat in ascending order');
          }
      }
  }

  /**
   * Validate downbeat config against actual beat count
   * Called inside generateBeatMap() after beat detection
   *
   * @throws Error if downbeatBeatIndex exceeds total beats
   */
  export function validateDownbeatConfigAgainstBeats(
      config: DownbeatConfig,
      totalBeats: number
  ): void {
      for (const segment of config.segments) {
          if (segment.downbeatBeatIndex >= totalBeats) {
              throw new Error(
                  `downbeatBeatIndex ${segment.downbeatBeatIndex} exceeds total beats ${totalBeats}`
              );
          }
      }
  }
  ```

### 1.4 Remove Obsolete Types

- [x] Remove `DownbeatDetectorConfig` interface
- [x] Remove `DownbeatDetectionResult` interface
- [x] Remove `isDuple` field from `TempoEstimate` interface (no longer used)
- [x] Update `BeatMapGenerationProgress.phase` to remove `'downbeat_detection'`
  - Replace with `'measure_labeling'` or similar

---

## Phase 2: Remove DownbeatDetector

### 2.1 Delete DownbeatDetector.ts

- [x] Delete `src/core/analysis/beat/DownbeatDetector.ts` entirely

### 2.2 Update Exports in index.ts

- [x] Remove from `src/core/analysis/beat/index.ts`:
  ```typescript
  // DELETE:
  export { DownbeatDetector } from './DownbeatDetector.js';
  export type { DownbeatDetectorConfig, DownbeatDetectionResult } from './types.js';
  ```

### 2.3 Update Main Export in src/index.ts

- [x] Remove from `src/index.ts`:
  ```typescript
  // DELETE:
  export { DownbeatDetector } from './core/analysis/beat/DownbeatDetector.js';
  ```

### 2.4 Delete Test File

- [x] Delete `tests/unit/beat/downbeatDetector.test.ts` entirely

---

## Phase 3: Update BeatMapGenerator

### 3.1 Remove DownbeatDetector Import

- [x] Remove import:
  ```typescript
  // DELETE:
  import { DownbeatDetector } from './DownbeatDetector.js';
  ```

### 3.2 Update generateBeatMap() Signature

- [x] Add optional `downbeatConfig` parameter:
  ```typescript
  async generateBeatMap(
      audioFilePath: string,
      trackId: string,
      downbeatConfig?: DownbeatConfig  // Optional - undefined means default
  ): Promise<BeatMap>
  ```

  **Note**: Use `undefined` as default, not `DEFAULT_DOWNBEAT_CONFIG`. This allows us to
  distinguish between "user didn't provide config" (omit from BeatMap) and
  "user explicitly provided default config" (include in BeatMap).

### 3.3 Add Downbeat Calculation Utility

- [x] Add internal utility function for calculating beat measure info with segment support:
  ```typescript
  /**
   * Calculate measure information for all beats based on manual config
   * Supports multiple segments for time signature changes
   *
   * IMPORTANT: Measure numbers CONTINUE across segment boundaries.
   * When time signature changes, measure number doesn't reset - it keeps
   * incrementing. Only the beatsPerMeasure changes.
   *
   * @param beats - Array of beats (with timestamps)
   * @param config - Downbeat configuration
   * @returns Beats with beatInMeasure, isDownbeat, measureNumber populated
   */
  private applyMeasureLabels(
      beats: Beat[],
      config: DownbeatConfig
  ): Beat[] {
      let runningMeasureNumber = 0;

      return beats.map((beat, index) => {
          // Find the active segment for this beat
          const segment = this.findActiveSegment(config.segments, index);
          const { downbeatBeatIndex, timeSignature } = segment;
          const { beatsPerMeasure } = timeSignature;

          // Calculate position relative to the anchor downbeat
          // Using modulo arithmetic that works bidirectionally
          const distanceFromAnchor = index - downbeatBeatIndex;

          // Calculate position in measure (0 to beatsPerMeasure-1)
          // Handle negative distances correctly for pickup beats
          // Example: downbeatBeatIndex=2, beatsPerMeasure=4
          //   beat 0: distance=-2, beatInMeasure=2 (pickup beat 3)
          //   beat 1: distance=-1, beatInMeasure=3 (pickup beat 4)
          //   beat 2: distance=0,  beatInMeasure=0 (downbeat, measure 0)
          const beatInMeasure = ((distanceFromAnchor % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure;

          // This beat is a downbeat if it's at position 0 in the measure
          const isDownbeat = beatInMeasure === 0;

          // Calculate measure number (0-indexed from first downbeat)
          // Measures before the anchor downbeat will have negative numbers,
          // but we floor to 0 for practical purposes
          const measureNumber = Math.max(0, Math.floor(distanceFromAnchor / beatsPerMeasure));

          return {
              ...beat,
              beatInMeasure,
              isDownbeat,
              measureNumber,
          };
      });
  }

  /**
   * Find the active segment for a given beat index
   * Segments must be ordered by startBeat in ascending order
   */
  private findActiveSegment(
      segments: DownbeatSegment[],
      beatIndex: number
  ): DownbeatSegment {
      // Find the last segment whose startBeat is <= beatIndex
      let activeSegment = segments[0];
      for (const segment of segments) {
          if (segment.startBeat <= beatIndex) {
              activeSegment = segment;
          } else {
              break;
          }
      }
      return activeSegment;
  }
  ```

### 3.4 Update Generation Pipeline

- [x] Remove Step 5 (Downbeat Detection) from `generateBeatMap()`
- [x] Replace with measure labeling step using `applyMeasureLabels()`
- [ ] Add optional `downbeatConfig` parameter to `generateBeatMap()` method signature
- [ ] Validate downbeatConfig structurally at the start of `generateBeatMap()`:
  ```typescript
  if (downbeatConfig) {
      validateDownbeatConfig(downbeatConfig);
  }
  ```
- [ ] Validate beat counts AFTER beat tracking (before applying labels):
  ```typescript
  if (downbeatConfig) {
      validateDownbeatConfigAgainstBeats(downbeatConfig, beats.length);
  }
  ```
- [ ] Store downbeatConfig in BeatMap ONLY if explicitly provided:
  ```typescript
  const beatMap: BeatMap = {
      trackId,
      beats: labeledBeats,
      // Only include downbeatConfig if it was explicitly provided
      ...(downbeatConfig ? { downbeatConfig } : {}),
      // ... other fields ...
  };
  ```
- [ ] Update progress phases:
  ```typescript
  // OLD: 'downbeat_detection'
  // NEW: 'measure_labeling'
  this.updateProgress('measure_labeling', 87, 'Applying measure labels...');
  ```

---

## Phase 4: Update Beat Interpolation

### 4.1 Update BeatInterpolator.ts

- [ ] Update `interpolate()` method to receive `BeatMap` (which contains `downbeatConfig`)
- [ ] Update `reassignBeatPositions()` to read config from `BeatMap.downbeatConfig`:
  ```typescript
  private reassignBeatPositions(
      beats: BeatWithSource[],
      downbeatConfig: DownbeatConfig
  ): void {
      for (let i = 0; i < beats.length; i++) {
          const beat = beats[i];

          // Find the active segment for this beat
          const segment = this.findActiveSegment(downbeatConfig.segments, i);
          const { downbeatBeatIndex, timeSignature } = segment;
          const { beatsPerMeasure } = timeSignature;

          const distanceFromAnchor = i - downbeatBeatIndex;
          const beatInMeasure = ((distanceFromAnchor % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure;
          const isDownbeat = beatInMeasure === 0;
          const measureNumber = Math.max(0, Math.floor(distanceFromAnchor / beatsPerMeasure));

          beat.beatInMeasure = beatInMeasure;
          beat.isDownbeat = isDownbeat;
          beat.measureNumber = measureNumber;
      }
  }

  /**
   * Find the active segment for a given beat index
   */
  private findActiveSegment(
      segments: DownbeatSegment[],
      beatIndex: number
  ): DownbeatSegment {
      let activeSegment = segments[0];
      for (const segment of segments) {
          if (segment.startBeat <= beatIndex) {
              activeSegment = segment;
          } else {
              break;
          }
      }
      return activeSegment;
  }
  ```
- [ ] Remove the logic that tries to infer `beatsPerMeasure` from detected beats (lines 778-792)
- [ ] Update `mergeBeats()` to pass `downbeatConfig` to `reassignBeatPositions()`

---

## Phase 5: Add reapplyDownbeatConfig Function

### 5.1 Add Standalone Function in BeatMap.ts

Since `BeatMap` is an interface (not a class), `reapplyDownbeatConfig` must be a standalone function.

- [ ] Add function to recalculate measure labels without re-running audio analysis:
  ```typescript
  /**
   * Reapply downbeat configuration to recalculate measure labels
   *
   * This is the PRIMARY way to set downbeat configuration. The typical workflow is:
   * 1. Generate beat map with default config
   * 2. Examine the beat map to identify the correct downbeat position
   * 3. Call this function to apply the correct configuration
   *
   * This does NOT re-analyze audio - it only recalculates measure labels.
   *
   * @param beatMap - The original beat map
   * @param newConfig - New downbeat configuration to apply
   * @returns New BeatMap with updated measure labels (original is not modified)
   * @throws Error if configuration is invalid or downbeatBeatIndex exceeds total beats
   */
  export function reapplyDownbeatConfig(
      beatMap: BeatMap,
      newConfig: DownbeatConfig
  ): BeatMap {
      validateDownbeatConfig(newConfig);
      validateDownbeatConfigAgainstBeats(newConfig, beatMap.beats.length);

      const updatedBeats = beatMap.beats.map((beat, index) => {
          // Find the active segment for this beat
          const segment = findActiveSegment(newConfig.segments, index);
          const { downbeatBeatIndex, timeSignature } = segment;
          const { beatsPerMeasure } = timeSignature;

          const distanceFromAnchor = index - downbeatBeatIndex;
          const beatInMeasure = ((distanceFromAnchor % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure;
          const isDownbeat = beatInMeasure === 0;
          const measureNumber = Math.max(0, Math.floor(distanceFromAnchor / beatsPerMeasure));

          return {
              ...beat,
              beatInMeasure,
              isDownbeat,
              measureNumber,
          };
      });

      return {
          ...beatMap,
          beats: updatedBeats,
          downbeatConfig: newConfig,
      };
  }

  /**
   * Find the active segment for a given beat index
   * Segments are contiguous - each covers beats until the next segment starts
   */
  function findActiveSegment(
      segments: DownbeatSegment[],
      beatIndex: number
  ): DownbeatSegment {
      let activeSegment = segments[0];
      for (const segment of segments) {
          if (segment.startBeat <= beatIndex) {
              activeSegment = segment;
          } else {
              break;
          }
      }
      return activeSegment;
  }
  ```

### 5.2 Export New Function

- [ ] Export `reapplyDownbeatConfig` from `src/index.ts`:
  ```typescript
  export { reapplyDownbeatConfig } from './core/types/BeatMap.js';
  ```

---

## Phase 6: Clean Up TempoDetector

### 6.1 Remove isDuple Calculation

- [x] Remove `isDuple` calculation from `estimateTempo()` method (lines 117-122)
- [x] Remove `isDuple` from return value
- [x] Remove related variables: `tps2`, `tps3`, and the branching logic for duple vs triple

### 6.2 Keep TPS2/TPS3 Methods

- [x] Keep `calculateTPS2()` and `calculateTPS3()` methods (part of Ellis algorithm, may be useful later)
- [x] Add JSDoc note that these are currently unused but kept for algorithm completeness

### 6.3 Update Secondary BPM Logic

- [x] Simplify secondary BPM calculation (currently branches on `isDuple`)
- [x] Default to duple behavior (half-tempo secondary) since that's most common

---

## Phase 7: Update Tests

### 7.1 Delete DownbeatDetector Tests

- [x] Delete `tests/unit/beat/downbeatDetector.test.ts` (done in Phase 2)

### 7.2 Update Integration Tests

- [x] Search for tests that reference `DownbeatDetector` and update
- [ ] Add tests for `applyMeasureLabels()` behavior:
  - [ ] Test default config (beat 0 = downbeat, 4/4 time)
  - [ ] Test custom downbeat index (e.g., beat 9)
  - [ ] Test bidirectional calculation (beats before and after anchor)
  - [ ] Test different time signatures (3/4, 6/8)
  - [ ] Test pickup beats (correct beatInMeasure for beats before first downbeat)
  - [ ] Test time signature changes (multiple segments)

### 7.3 Update BeatMapGenerator Tests

- [ ] Add tests for `downbeatConfig` parameter in `generateBeatMap()`
- [ ] Verify backward compatibility (default behavior unchanged)
- [ ] Test that `downbeatConfig` is stored in output `BeatMap`

### 7.4 Update TempoDetector Tests

- [x] Remove tests for `isDuple` field
- [x] Update tests that expect `isDuple` in `TempoEstimate`

### 7.5 Add Reprocess Function Tests

- [ ] Test `reapplyDownbeatConfig()` standalone function
- [ ] Verify beats are correctly relabeled with new config
- [ ] Verify original BeatMap is not modified (immutability)
- [ ] Test error when downbeatBeatIndex exceeds total beats

### 7.6 Add Validation Tests

- [ ] Test `validateDownbeatConfig()` with valid configs
- [ ] Test validation errors for invalid configs (negative values, out of range, etc.)

---

## Phase 8: Update Documentation

### 8.1 Update AUDIO_ANALYSIS.md

- [ ] Remove `DownbeatDetector` from "Source Files" table
- [ ] Remove DownbeatDetector section (if exists)
- [ ] Add new section for manual downbeat configuration:
  ```markdown
  #### Downbeat Configuration

  The data engine uses manual downbeat configuration rather than automatic detection.
  This provides consistent, predictable results across all music genres.

  **IMPORTANT: The Typical Workflow**

  You usually don't know the correct downbeat position until AFTER generating the beat map.
  The recommended workflow is:

  1. **Generate** the beat map first (uses default config: beat 0 = downbeat, 4/4 time)
  2. **Examine** the beat map to identify which beat is actually the "one"
  3. **Reapply** the correct configuration using `reapplyDownbeatConfig()`

  This approach is more practical than trying to configure upfront.

  ##### Configuration Types

  | Property | Type | Default | Description |
  |----------|------|---------|-------------|
  | `segments` | `DownbeatSegment[]` | `[{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }]` | Array of config segments |

  Each `DownbeatSegment` has:

  | Property | Type | Description |
  |----------|------|-------------|
  | `startBeat` | `number` | Beat index where this segment starts (segments are contiguous) |
  | `downbeatBeatIndex` | `number` | Absolute beat index that is the "one" (downbeat) - 0-indexed |
  | `timeSignature.beatsPerMeasure` | `number` | Beats per measure (4 = 4/4 time) |

  **Note**: Segments are CONTIGUOUS. If segment 1 has `startBeat: 0` and segment 2 has `startBeat: 32`,
  then segment 1 covers beats 0-31 and segment 2 covers beats 32+. There are no gaps.

  ##### Usage Examples

  **Recommended: Generate first, then configure:**
  \`\`\`typescript
  const generator = new BeatMapGenerator();

  // Step 1: Generate with default config
  const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

  // Step 2: Examine beat map, identify that beat 9 is actually the "one"

  // Step 3: Apply correct configuration
  const correctedMap = reapplyDownbeatConfig(beatMap, {
    segments: [{
      startBeat: 0,
      downbeatBeatIndex: 9,  // Beat 9 is the "one"
      timeSignature: { beatsPerMeasure: 4 },
    }],
  });
  // Beats 1, 5, 9, 13, 17... are now downbeats
  \`\`\`

  **3/4 time waltz:**
  \`\`\`typescript
  const beatMap = await generator.generateBeatMap('waltz.mp3', 'track-2');
  const waltzMap = reapplyDownbeatConfig(beatMap, {
    segments: [{
      startBeat: 0,
      downbeatBeatIndex: 0,
      timeSignature: { beatsPerMeasure: 3 },
    }],
  });
  // Every 3rd beat is a downbeat: 0, 3, 6, 9...
  \`\`\`

  **Time signature change (4/4 → 3/4 at beat 32):**
  \`\`\`typescript
  const beatMap = await generator.generateBeatMap('mixed.mp3', 'track-3');
  const mixedMap = reapplyDownbeatConfig(beatMap, {
    segments: [
      { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
      { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
    ],
  });
  // Beats 0-31: 4/4 time (beats 0, 4, 8... are downbeats)
  // Beats 32+: 3/4 time (beats 32, 35, 38... are downbeats)
  // Note: Measure numbers continue incrementing across the change
  \`\`\`

  **Pickup beats:**
  \`\`\`typescript
  // Song starts 2 beats before the first measure
  const beatMap = await generator.generateBeatMap('pickup.mp3', 'track-4');
  const pickupMap = reapplyDownbeatConfig(beatMap, {
    segments: [{
      startBeat: 0,
      downbeatBeatIndex: 2,  // Beat 2 is the first downbeat
      timeSignature: { beatsPerMeasure: 4 },
    }],
  });
  // Beat 0: beatInMeasure=2 (pickup beat 3)
  // Beat 1: beatInMeasure=3 (pickup beat 4)
  // Beat 2: beatInMeasure=0 (downbeat, measure 0)
  // Beat 3: beatInMeasure=1, measure 0
  // Beat 6: beatInMeasure=0 (downbeat, measure 1)
  \`\`\`
  ```

- [ ] Update `Beat` type documentation to clarify `beatInMeasure` is derived from config
- [ ] Update `BeatMap` type docs to include optional `downbeatConfig` field
- [ ] Update progress phases documentation (replace `downbeat_detection` with `measure_labeling`)
- [ ] Emphasize that `downbeatBeatIndex` is 0-indexed (beat numbers start at 0)

### 8.2 Update DATA_ENGINE_REFERENCE.md

- [ ] Remove `DownbeatDetector` from table of contents
- [ ] Remove `DownbeatDetector` from class summary table
- [ ] Remove entire `DownbeatDetector` section (~line 1642)
- [ ] Update `TempoEstimate` type table: remove `isDuple` field
- [ ] Update `Beat` type docs: clarify `beatInMeasure`, `isDownbeat`, `measureNumber` are derived from config
- [ ] Add `TimeSignatureConfig`, `DownbeatSegment`, and `DownbeatConfig` to types table
- [ ] Update `generateBeatMap()` signature to show optional `downbeatConfig` parameter
- [ ] Add `reapplyDownbeatConfig()` function to exports/docs
- [ ] Update `BeatMapGenerator` description to remove "identify downbeats"
- [ ] Document that `downbeatConfig` in `BeatMap` is optional (omitted if default used)

### 8.3 Update Type Documentation in AUDIO_ANALYSIS.md

- [ ] Add `TimeSignatureConfig` to types table
- [ ] Add `DownbeatSegment` to types table
- [ ] Add `DownbeatConfig` to types table
- [ ] Remove `DownbeatDetectorConfig` and `DownbeatDetectionResult` from docs
- [ ] Remove `isDuple` from `TempoEstimate` documentation

---

## Phase 9: Verification

### 9.1 Build Verification

- [ ] Run `npm run build` - must succeed
- [ ] No TypeScript errors

### 9.2 Test Verification

- [ ] Run `npm test` - all tests pass
- [ ] No references to `DownbeatDetector` in test output

### 9.3 Export Verification

- [ ] Verify `DownbeatDetector` is not exported from package
- [ ] Verify new types are properly exported (`TimeSignatureConfig`, `DownbeatSegment`, `DownbeatConfig`)

### 9.4 Backward Compatibility

- [ ] Existing code using defaults continues to work
- [ ] BeatMaps generated with old code can still be loaded
- [ ] Default behavior: beat 0 is downbeat, 4/4 time

---

## Dependencies

```
Phase 1 (Types + reapplyDownbeatConfig function) ─────────────┐
                    │                                         │
                    ▼                                         │
Phase 2 (Remove DownbeatDetector) ────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 3 (BeatMapGenerator) ───────────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 4 (BeatInterpolator) ───────────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 5 (Export reapply function) ────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 6 (TempoDetector) ──────────────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 7 (Tests) ──────────────────────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 8 (Documentation) ──────────────────────────────────────┤
                    │                                         │
                    ▼                                         │
Phase 9 (Verification) ◄──────────────────────────────────────┘
```

---

## Questions/Unknowns

| Question | Status | Resolution |
|----------|--------|------------|
| Should `measureNumber` be 0-indexed or 1-indexed? | Resolved | Keep 0-indexed (current behavior) |
| How to handle beats before the first downbeat? | Resolved | Calculate measure number as 0 (floor at 0), but use correct `beatInMeasure` |
| Should time signature support "beats per bar" naming? | Resolved | Use `beatsPerMeasure` for clarity |
| Export `TimeSignatureConfig` and `DownbeatConfig`? | Resolved | Yes, for user configuration |
| Remove `isDuple` from TempoEstimate? | Resolved | Yes, only used by DownbeatDetector |
| Remove TPS2/TPS3 methods from TempoDetector? | Resolved | No, keep them (part of Ellis algorithm) |
| Per-track or per-generator config? | Resolved | Per-track (passed to `generateBeatMap()`) |
| Store config in BeatMap? | Resolved | Yes, but only if explicitly provided (omit for default) |
| Support time signature changes? | Resolved | Yes, via contiguous segments |
| Add reprocess method? | Resolved | Yes, as standalone `reapplyDownbeatConfig()` function |
| `reapplyDownbeatConfig` location? | Resolved | Standalone function in `BeatMap.ts` (BeatMap is an interface) |
| Primary workflow? | Resolved | Generate-then-configure (examine map first, then set downbeat) |
| Measure numbering across segments? | Resolved | Continue incrementing (don't reset on time signature change) |
| Beat count validation timing? | Resolved | After beat detection (inside `generateBeatMap()`) |
| Field name in BeatMap? | Resolved | `downbeatConfig` (optional) |

---

## Success Criteria

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Build Success | TypeScript compiles | `npm run build` |
| Tests Pass | All tests pass | `npm test` |
| No DownbeatDetector References | Zero occurrences | Grep search |
| No isDuple References | Zero in TempoEstimate usage | Grep search |
| Default Behavior Unchanged | Beat 0 = downbeat, 4/4, no config stored | Unit test |
| Custom Downbeat Works | Beat 9 → 1,5,9,13... are downbeats | Unit test |
| Pickup Beats Work | Correct beatInMeasure before first downbeat | Unit test |
| Time Signature Changes Work | Multiple segments calculate correctly | Unit test |
| Reprocess Function Works | `reapplyDownbeatConfig()` relabels beats | Unit test |
| Config Stored Only If Explicit | `beatMap.downbeatConfig` undefined when default used | Unit test |
| Beat Count Validation | Error when downbeatBeatIndex exceeds total beats | Unit test |
| Documentation Complete | All sections updated, workflow emphasized | Manual review |

---

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Types | 1.5 | Add new interfaces with segment support, validation, reapply function |
| Phase 2: Remove DownbeatDetector | 0.5 | Delete files, update exports |
| Phase 3: BeatMapGenerator | 2 | New calculation logic with segment support, optional config |
| Phase 4: BeatInterpolator | 1 | Update reassignBeatPositions |
| Phase 5: Reprocess Function | 0.5 | Already added in Phase 1 (standalone function) |
| Phase 6: TempoDetector | 0.5 | Remove isDuple, keep TPS methods |
| Phase 7: Tests | 2 | Delete old, add new (including segment tests) |
| Phase 8: Documentation | 1.5 | Update AUDIO_ANALYSIS.md and DATA_ENGINE_REFERENCE.md |
| Phase 9: Verification | 0.5 | Build and test |
| **Total** | **10** | |

---

## Example Usage (Post-Implementation)

```typescript
import { BeatMapGenerator, reapplyDownbeatConfig } from 'playlist-data-engine';

const generator = new BeatMapGenerator();

// ========================================
// RECOMMENDED: Generate-Then-Configure
// ========================================

// Step 1: Generate with default config (beat 0 = downbeat, 4/4 time)
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
// beatMap.downbeatConfig is undefined (default was used)

// Step 2: Examine beat map, identify that beat 9 is actually the "one"

// Step 3: Apply correct configuration (no audio re-analysis)
const correctedMap = reapplyDownbeatConfig(beatMap, {
  segments: [{
    startBeat: 0,
    downbeatBeatIndex: 9,  // Beat 9 is the "one"
    timeSignature: { beatsPerMeasure: 4 },
  }],
});
// correctedMap.downbeatConfig is now populated
// Beats 1, 5, 9, 13, 17... are downbeats (bidirectional from 9)

// ========================================
// OTHER EXAMPLES
// ========================================

// 3/4 time waltz
const waltzMap = reapplyDownbeatConfig(beatMap, {
  segments: [{
    startBeat: 0,
    downbeatBeatIndex: 0,
    timeSignature: { beatsPerMeasure: 3 },
  }],
});
// Every 3rd beat is a downbeat: 0, 3, 6, 9...

// Pickup beats: song starts 2 beats before the first measure
const pickupMap = reapplyDownbeatConfig(beatMap, {
  segments: [{
    startBeat: 0,
    downbeatBeatIndex: 2,  // Beat 2 is the first downbeat
    timeSignature: { beatsPerMeasure: 4 },
  }],
});
// Beat 0: beatInMeasure=2 (pickup beat 3), measureNumber=0
// Beat 1: beatInMeasure=3 (pickup beat 4), measureNumber=0
// Beat 2: beatInMeasure=0 (downbeat), measureNumber=0
// Beat 6: beatInMeasure=0 (downbeat), measureNumber=1

// Time signature change: 4/4 for 8 bars, then 3/4
const mixedMap = reapplyDownbeatConfig(beatMap, {
  segments: [
    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
    { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
  ],
});
// Beats 0-31: 4/4 time (downbeats at 0, 4, 8...)
// Beats 32+: 3/4 time (downbeats at 32, 35, 38...)
// Note: Measure numbers continue incrementing (don't reset at 32)
```

---

## Next Steps

1. **Review and approve** this plan
2. **Start Phase 1**: Add new types and `reapplyDownbeatConfig` function to BeatMap.ts
3. **Work through phases** sequentially (1-9)
4. **Run tests** at the end (Phase 9)
5. **Update documentation** when code changes complete (Phase 8)
6. **Verify build** and backward compatibility

---

## Summary of Key Decisions

| Decision | Choice |
|----------|--------|
| Primary workflow | Generate-then-configure |
| `reapplyDownbeatConfig` | Standalone function in `BeatMap.ts` |
| `downbeatConfig` in BeatMap | Optional (omit if default used) |
| Segments | Contiguous (no gaps) |
| Measure numbering | Continues across segments |
| Beat count validation | After beat detection |
| Beat indexing | 0-indexed |

---

## Additional Cleanup Items

The following were identified as related dead code that becomes unused after DownbeatDetector removal:

| Item | Location | Action |
|------|----------|--------|
| `isDuple` field | `TempoEstimate` type | Remove |
| `isDuple` calculation | `TempoDetector.estimateTempo()` | Remove |
| TPS2/TPS3 method calls | `TempoDetector.estimateTempo()` | Remove calls, keep methods |
| Measure inference logic | `BeatInterpolator.reassignBeatPositions()` | Replace with config-based calculation |
| `DownbeatDetectorConfig` type | `BeatMap.ts` | Remove |
| `DownbeatDetectionResult` type | `BeatMap.ts` | Remove |
| `downbeat_detection` progress phase | `BeatMapGenerator` | Replace with `measure_labeling` |

---

## Implementation Notes

### Key Implementation Details

1. **BeatMap is an interface**, not a class. Therefore `reapplyDownbeatConfig` is a standalone function, not a method.

2. **Segments are contiguous by definition**. If segment 1 starts at beat 0 and segment 2 starts at beat 32, segment 1 covers beats 0-31. No gap handling needed.

3. **Measure numbers continue across segments**. When time signature changes, measure number keeps incrementing - it doesn't reset.

4. **downbeatConfig is optional in BeatMap**. It's only stored if explicitly provided. Undefined means "default was used".

5. **Beat count validation happens late**. We can't validate `downbeatBeatIndex < totalBeats` until after beat detection, inside `generateBeatMap()`.

6. **0-indexed beat numbers**. The first beat is beat 0, not beat 1. This is consistent with array indexing.
