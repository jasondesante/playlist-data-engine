# Beat Subdivision System Implementation Plan

## Progress Summary

**Completed Phases:**
- Phase 1: Type System Updates (complete)
- Phase 2: Create UnifiedBeatMap (complete)
- Phase 3: Create BeatSubdivider Core (complete)
- Phase 4: Implement Subdivision Algorithms (complete)
- Phase 5: Segment Support (complete)
- Phase 6: Integration (complete)

**In Progress Phases:**
- None

**Pending Phases:**
- Phase 6.3: Update BeatStream (Optional)
- Phase 7: Testing
- Phase 8: Documentation
- Phase 9: Verification
- Phase 10: Real-Time Subdivision Playground (Practice Mode)

---

## Overview

Add the ability to subdivide a beat map from quarter notes into different rhythmic patterns (half notes, eighth notes, sixteenth notes, triplets, dotted notes). This enables rhythm game level creation by allowing dynamic subdivision changes at specific beat positions.

### Problem Statement

Currently, the beat interpolation system produces a grid of quarter notes (detected + interpolated). Users want to:
1. **Slow down** the grid to half notes (beats on 1 and 3 only)
2. **Speed up** the grid to eighth notes (add beats between quarter notes)
3. **Create rhythmic variation** with triplets, dotted notes, and other subdivisions
4. **Change subdivisions over time** to create dynamic rhythm patterns for levels

### Key Insight: The Merged Map is the Foundation

After interpolation completes, the detected + interpolated beats are merged into a single map of quarter notes. This merged map is the foundation for subdivision:
- **Detected beats** are preserved for accent/rhythm patterns (separate array)
- **All beats** (detected + interpolated) are treated uniformly for subdivision
- **Subdivision** operates on this unified quarter-note grid

### Primary Workflow

1. **Generate** beat map with detection → `BeatMap`
2. **Interpolate** to fill gaps → `InterpolatedBeatMap`
3. **Unify** into single quarter-note grid → `UnifiedBeatMap`
4. **Subdivide** with rhythm config → `SubdividedBeatMap`

---

## Goals

### Core Feature: Pre-Calculated SubdividedBeatMap (Phases 1-9)

1. Create `UnifiedBeatMap` type that flattens detected + interpolated beats (with tempoSections support)
2. Create `SubdivisionType` enum for all subdivision types
3. Create `SubdivisionConfig` with segment support (like `DownbeatConfig`)
4. Implement `BeatSubdivider` class with subdivision algorithms
5. Support half notes (0.5x density), eighth notes (2x), sixteenth notes (4x)
6. Support eighth triplets (3 per quarter) and quarter triplets (3 per half note)
7. Support dotted quarter (1.5x interval) and dotted eighth (swing pattern: 2/3 + 1/3)
8. Support segment-based subdivision changes at any beat index
9. Preserve detected beat information for accent patterns
10. Use decimal beat labels (0, 0.5, 1, 1.5...) in SubdividedBeat only (base Beat stays integer)
11. Tempo-aware subdivision using TempoSection intervals for multi-tempo tracks
12. Hard density limit at sixteenth notes (4x)
13. Validation: `validateSubdivisionConfig()` and `validateSubdivisionConfigAgainstBeats()`

### Practice Mode Feature: Real-Time Subdivision Playground (Phase 10)

14. Create `SubdivisionPlaybackController` for real-time subdivision switching
15. Enable instant switching between subdivision types during playback
16. Support practice mode workflow: start with quarters, switch to eighths, etc.
17. Provide configurable transition modes (immediate vs. next-downbeat)
18. Integrate with existing beat event system for UI updates

---

## Processing Pipeline

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  BeatMap    │ ──▶ │  InterpolatedBeatMap │ ──▶ │  UnifiedBeatMap  │ ──▶ │  SubdividedBeatMap  │
│ (detected)  │     │ (detected + interp.) │     │ (flattened QN)   │     │ (rhythm patterns)   │
└─────────────┘     └──────────────────────┘     └──────────────────┘     └─────────────────────┘
      │                        │                          │                         │
      │                        │                          │                         │
      ▼                        ▼                          ▼                         ▼
  beats: Beat[]      detectedBeats: Beat[]        beats: Beat[]            beats: SubdividedBeat[]
                     mergedBeats: BeatWithSource[] detectedBeatIndices       subdivisionConfig
                     interpolationMetadata:        tempoSections?            detectedBeatIndices
                       - tempoSections?            downbeatConfig            downbeatConfig (inherited)
                                                        isDetected flag       tempoSections? (inherited)
                                                                              subdivisionMetadata
```

---

## Key Data Structures

### SubdivisionType Enum

```typescript
/**
 * Types of beat subdivision
 *
 * - quarter: Default, 1x density (unchanged)
 * - half: 0.5x density (beats on 1 and 3 only)
 * - eighth: 2x density (beat between each quarter)
 * - sixteenth: 4x density (3 beats between each quarter) - MAXIMUM DENSITY
 * - triplet8: Eighth triplets (3 beats per quarter note)
 * - triplet4: Quarter triplets (3 beats per half note)
 * - dotted4: Dotted quarter (every 1.5 quarters, phase-independent)
 * - dotted8: Dotted eighth (swing long-short pattern: 2/3 + 1/3)
 *
 * Note: Sixteenth notes (4x) are the maximum supported density.
 * Higher densities are not supported and will throw an error.
 */
export type SubdivisionType =
  | 'quarter'    // 1x density (no change)
  | 'half'       // 0.5x density (beats 1 and 3)
  | 'eighth'     // 2x density
  | 'sixteenth'  // 4x density (MAXIMUM)
  | 'triplet8'   // 3 beats per quarter (eighth triplets)
  | 'triplet4'   // 3 beats per half note (quarter triplets)
  | 'dotted4'    // Every 1.5 quarters (phase-independent)
  | 'dotted8';   // Swing pattern (2/3 + 1/3 quarters)
```

### SubdivisionConfig (Like DownbeatConfig)

```typescript
/**
 * A segment of subdivision configuration
 *
 * Segments are CONTIGUOUS - each segment covers all beats from its startBeat
 * until the next segment's startBeat (or end of track). There are no gaps.
 *
 * Example: If segment 1 has startBeat: 0 with 'quarter' and segment 2 has
 * startBeat: 32 with 'eighth', then beats 0-31 are quarter notes and
 * beats 32+ are eighth notes.
 */
export interface SubdivisionSegment {
    /** Beat index where this subdivision starts */
    startBeat: number;

    /** Type of subdivision to apply */
    subdivision: SubdivisionType;
}

/**
 * Subdivision configuration for rhythm pattern generation
 * Supports multiple segments for subdivision changes within a track
 */
export interface SubdivisionConfig {
    /** Array of subdivision segments ordered by startBeat */
    segments: SubdivisionSegment[];
}

/** Default subdivision config (quarter notes throughout) */
export const DEFAULT_SUBDIVISION_CONFIG: SubdivisionConfig = {
    segments: [{
        startBeat: 0,
        subdivision: 'quarter',
    }],
};
```

### UnifiedBeatMap

```typescript
/**
 * A unified beat map with detected + interpolated beats merged
 *
 * This is the foundation for subdivision. All beats are treated equally
 * regardless of whether they were originally detected or interpolated.
 * Detected beats are flagged for accent/rhythm pattern use.
 */
export interface UnifiedBeatMap {
    /** Unique identifier for the audio source */
    audioId: string;

    /** Duration of the audio in seconds */
    duration: number;

    /** All beats (detected + interpolated) as a single unified list */
    beats: Beat[];

    /** Indices of beats that were originally detected (for accent lookup) */
    detectedBeatIndices: number[];

    /** Quarter note interval in seconds (primary tempo) */
    quarterNoteInterval: number;

    /** Equivalent BPM for the quarter note (primary tempo) */
    quarterNoteBpm: number;

    /** The downbeat configuration inherited from interpolation */
    downbeatConfig: DownbeatConfig;

    /** Tempo sections for multi-tempo support (from InterpolationMetadata) */
    tempoSections?: TempoSection[];

    /** Metadata from the original beat map */
    originalMetadata: BeatMapMetadata;
}
```

### SubdividedBeatMap

```typescript
/**
 * A beat map with subdivision applied
 *
 * The beat grid has been transformed according to the subdivision config,
 * which may add beats (eighth, sixteenth, triplets), remove beats (half),
 * or reposition beats (dotted patterns).
 */
export interface SubdividedBeatMap {
    /** Unique identifier for the audio source */
    audioId: string;

    /** Duration of the audio in seconds */
    duration: number;

    /** Beats after subdivision applied */
    beats: SubdividedBeat[];

    /** Indices of beats that were originally detected (for accent lookup) */
    detectedBeatIndices: number[];

    /** The subdivision configuration used */
    subdivisionConfig: SubdivisionConfig;

    /** The downbeat configuration inherited from UnifiedBeatMap (preserved unchanged) */
    downbeatConfig: DownbeatConfig;

    /** Tempo sections inherited from UnifiedBeatMap (for reference) */
    tempoSections?: TempoSection[];

    /** Metadata about the subdivision process */
    subdivisionMetadata: SubdivisionMetadata;
}

/**
 * A beat in a subdivided beat map
 *
 * Note: beatInMeasure is a DECIMAL in SubdividedBeat (e.g., 0.5, 1.25, 2.75)
 * while the base Beat interface uses integers. This allows for positions
 * like "the 'and' of beat 1" (1.5) or swing patterns.
 */
export interface SubdividedBeat extends Beat {
    /** Position within the measure as a decimal (e.g., 0, 0.5, 1, 1.5 for eighth notes) */
    beatInMeasure: number;

    /** Whether this beat was originally detected (vs interpolated) */
    isDetected: boolean;

    /** Index of the original beat in the UnifiedBeatMap (input to subdivider) */
    originalBeatIndex?: number;

    /** The subdivision type that created this beat */
    subdivisionType: SubdivisionType;
}

/**
 * Metadata about the subdivision process
 */
export interface SubdivisionMetadata {
    /** Number of beats in the original unified map */
    originalBeatCount: number;

    /** Number of beats after subdivision */
    subdividedBeatCount: number;

    /** Overall density multiplier (2.0 = twice as many beats) */
    averageDensityMultiplier: number;

    /** Number of subdivision segments */
    segmentCount: number;

    /** Subdivision types used */
    subdivisionsUsed: SubdivisionType[];

    /** Whether the track has multiple tempo sections */
    hasMultipleTempos: boolean;

    /** Maximum density encountered (for validation against limit) */
    maxDensity: number;
}
```

---

## Core Behaviors

### Beat Label System (Decimal)

| Subdivision | Labels in 4/4 | Description |
|-------------|---------------|-------------|
| quarter | 0, 1, 2, 3 | Standard quarter notes |
| half | 0, 2, 4, 6 | Beats on 1 and 3 only |
| eighth | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 | Double density |
| sixteenth | 0, 0.25, 0.5, 0.75, 1, 1.25... | Quadruple density |
| triplet8 | 0, 0.33, 0.66, 1, 1.33, 1.66... | 3 beats per quarter |
| triplet4 | 0, 0.66, 1.33, 2, 2.66, 3.33... | 3 beats per half note |
| dotted4 | 0, 1.5, 3, 4.5, 6... | Phase-independent |
| dotted8 | 0, 0.667, 1, 1.667, 2... | Swing long-short (2/3 + 1/3) |

### Subdivision Rules

#### Half Notes (0.5x density)
- Keep beats where `beatInMeasure % 2 === 0` (positions 0 and 2)
- Discard beats at positions 1 and 3
- Uses downbeat info to determine measure positions
- **Measure numbers are preserved** from the original quarter-note grid (not recalculated)
- Example: Beats at 0, 2, 4, 6... are kept (downbeats and beat 3s)

#### Eighth Notes (2x density)
- Insert new beat midway between each quarter note
- New beat has `beatInMeasure = original + 0.5`
- **Intensity/confidence: linear average of neighboring beats**

#### Sixteenth Notes (4x density)
- Insert 3 new beats evenly spaced between each quarter note
- Labels: original, +0.25, +0.5, +0.75
- **This is the MAXIMUM supported density** (hard limit)
- Intensity/confidence: linear average of neighboring beats

#### Eighth Triplets (triplet8)
- 3 beats per quarter note
- Labels: 0, 0.33, 0.66, 1, 1.33, 1.66...
- Interval = quarterNoteInterval / 3
- Intensity/confidence: linear average of neighboring beats

#### Quarter Triplets (triplet4)
- 3 beats per half note (same density as eighth notes but different feel)
- Labels: 0, 0.66, 1.33, 2, 2.66, 3.33...
- Interval = quarterNoteInterval * 2 / 3
- Intensity/confidence: linear average of neighboring beats

#### Dotted Quarter (dotted4)
- Beats at intervals of 1.5x quarter note
- **Phase-independent**: Doesn't care about measure boundaries
- Pattern: 0, 1.5, 3, 4.5, 6...
- Creates 3-beat groups in 4/4 time (cross-rhythm)
- Intensity/confidence: linear average of neighboring beats

#### Dotted Eighth (dotted8)
- Swing long-short pattern
- Long: 2/3 of quarter (≈0.667), Short: 1/3 of quarter (≈0.333)
- Labels: 0, 0.667, 1, 1.667, 2, 2.667...
- Classic swing feel

### Segment Transitions

- Changes happen **IMMEDIATELY** at the specified beat index
- No waiting for measure boundaries
- Pattern continues from that point with new subdivision
- Example: Quarter → Eighth at beat 32 means beat 32 is the first eighth note

### Tempo-Aware Subdivision (Multi-Tempo Support)

When the UnifiedBeatMap contains multiple tempo sections (from `InterpolationMetadata.tempoSections`), subdivision must be tempo-aware:

- **Each TempoSection has its own `intervalSeconds`** - use this for subdivision calculations within that section
- **Section boundaries**: Subdivision intervals change at tempo section boundaries
- **Example**: If section 1 is 120 BPM and section 2 is 90 BPM, eighth note intervals are 250ms in section 1 and ~333ms in section 2
- The `BeatSubdivider` accepts `tempoSections` from `UnifiedBeatMap` and calculates appropriate intervals per section

```typescript
// Tempo-aware subdivision example
const unifiedMap = unifyBeatMap(interpolatedMap);
// unifiedMap.tempoSections contains tempo information

const subdividedMap = subdivider.subdivide(unifiedMap, config);
// Subdivision uses correct intervals for each tempo section
```

### Detected Beat Preservation

- Each beat has `isDetected: boolean` flag
- `detectedBeatIndices: number[]` array for quick lookup
- When subdividing:
  - Half notes: Remove detected beats if not on 1 or 3
  - Eighth/Sixteenth: New beats are NOT detected
  - Triplets/Dotted: Align to nearest detected beat if close

---

## Files Affected

### Files to Create

| File | Purpose |
|------|---------|
| `src/core/analysis/beat/BeatSubdivider.ts` | Main subdivision logic |
| `src/core/analysis/beat/utils/unifyBeatMap.ts` | Convert InterpolatedBeatMap → UnifiedBeatMap |

### Files to Modify

| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Add SubdivisionType, SubdivisionConfig, SubdivisionSegment, UnifiedBeatMap, SubdividedBeatMap, SubdividedBeat, SubdivisionMetadata, validation functions |
| `src/core/analysis/beat/index.ts` | Export BeatSubdivider |
| `src/index.ts` | Export new types and BeatSubdivider |

### Test Files to Create

| File | Purpose |
|------|---------|
| `tests/unit/beat/beatSubdivider.test.ts` | Unit tests for BeatSubdivider |
| `tests/unit/beat/unifyBeatMap.test.ts` | Unit tests for unification |

---

## Phase 1: Type System Updates

### 1.1 Add SubdivisionType

- [x] Add `SubdivisionType` type to `BeatMap.ts`
  ```typescript
  export type SubdivisionType =
    | 'quarter' | 'half' | 'eighth' | 'sixteenth'
    | 'triplet8' | 'triplet4' | 'dotted4' | 'dotted8';
  ```

### 1.2 Add SubdivisionSegment and SubdivisionConfig

- [x] Add `SubdivisionSegment` interface
- [x] Add `SubdivisionConfig` interface
- [x] Add `DEFAULT_SUBDIVISION_CONFIG` constant

### 1.3 Add UnifiedBeatMap

- [x] Add `UnifiedBeatMap` interface
  - [x] `beats: Beat[]` - unified list
  - [x] `detectedBeatIndices: number[]` - quick lookup
  - [x] `quarterNoteInterval`, `quarterNoteBpm`
  - [x] `downbeatConfig` - inherited

### 1.4 Add SubdividedBeatMap

- [x] Add `SubdividedBeat` interface (extends Beat)
  - [x] `isDetected: boolean`
  - [x] `originalBeatIndex?: number`
  - [x] `subdivisionType: SubdivisionType`
- [x] Add `SubdividedBeatMap` interface
- [x] Add `SubdivisionMetadata` interface

### 1.5 Add Validation Functions

- [x] Add `validateSubdivisionConfig()` function (structural validation)
  - [x] Verify segments array is non-empty
  - [x] Verify segments are ordered by startBeat
  - [x] Verify startBeat >= 0 for all segments
  - [x] Verify subdivision type is valid
- [x] Add `validateSubdivisionConfigAgainstBeats()` function
  - [x] Verify startBeat values don't exceed total beat count
  - [x] Similar to `validateDownbeatConfigAgainstBeats()`
- [x] Add density validation
  - [x] Define MAX_DENSITY = 4 (sixteenth notes)
  - [x] Throw error if subdivision would exceed max density

---

## Phase 2: Create UnifiedBeatMap

### 2.1 Create unifyBeatMap Utility

- [x] Create `src/core/analysis/beat/utils/unifyBeatMap.ts`
- [x] Implement `unifyBeatMap(interpolatedBeatMap: InterpolatedBeatMap): UnifiedBeatMap`
  - [x] Flatten `mergedBeats` into single `Beat[]`
  - [x] Remove `source` field distinction
  - [x] Build `detectedBeatIndices` array
  - [x] Extract `tempoSections` from InterpolationMetadata (for tempo-aware subdivision)
  - [x] Add `isDetected` would be on SubdividedBeat, not here

### 2.2 Unit Tests for Unification

- [x] Test flattening of merged beats
- [x] Test detected beat index tracking
- [x] Test that all metadata is preserved

---

## Phase 3: Create BeatSubdivider Core

### 3.1 Create BeatSubdivider Class

- [x] Create `src/core/analysis/beat/BeatSubdivider.ts`
- [x] Add class skeleton:
  ```typescript
  export class BeatSubdivider {
      constructor(options?: BeatSubdividerOptions) {}

      subdivide(
          unifiedMap: UnifiedBeatMap,
          config?: SubdivisionConfig
      ): SubdividedBeatMap;
  }
  ```

### 3.2 Add Options Interface

- [x] Add `BeatSubdividerOptions` interface
  - [x] `tolerance?: number` - for detected beat alignment
  - [x] `defaultIntensity?: number` - for new beats
  - [x] `defaultConfidence?: number` - for new beats

### 3.3 Implement Main subdivide() Method

- [x] Validate config
- [x] Process each segment
- [x] Combine results
- [x] Build metadata

---

## Phase 4: Implement Subdivision Algorithms

### 4.1 Quarter Notes (No-op)

- [x] Implement `subdivideQuarter()` - pass through unchanged
- [x] Update beat labels to use subdivisionType

### 4.2 Half Notes

- [x] Implement `subdivideHalf()`
  - [x] Filter beats where `beatInMeasure % 2 === 0`
  - [x] Recalculate beatInMeasure (0, 2, 4... → 0, 1, 2...)
  - [x] Update measure numbers if needed

### 4.3 Eighth Notes

- [x] Implement `subdivideEighth()`
  - [x] For each pair of quarter notes, insert new beat at midpoint
  - [x] Calculate new beatInMeasure (decimal)
  - [x] Interpolate intensity/confidence from neighbors

### 4.4 Sixteenth Notes

- [x] Implement `subdivideSixteenth()`
  - [x] Insert 3 beats between each quarter
  - [x] Labels: +0.25, +0.5, +0.75

### 4.5 Eighth Triplets (triplet8)

- [x] Implement `subdivideTriplet8()`
  - [x] 3 beats per quarter note
  - [x] Interval = quarterNoteInterval / 3
  - [x] Labels: 0, 0.33, 0.66, 1...

### 4.6 Quarter Triplets (triplet4)

- [x] Implement `subdivideTriplet4()`
  - [x] 3 beats per half note
  - [x] Interval = quarterNoteInterval * 2 / 3
  - [x] Labels: 0, 0.66, 1.33, 2...

### 4.7 Dotted Quarter (dotted4)

- [x] Implement `subdivideDotted4()`
  - [x] Phase-independent pattern
  - [x] Interval = quarterNoteInterval * 1.5
  - [x] Start from first beat, continue to end
  - [x] Recalculate beatInMeasure based on position

### 4.8 Dotted Eighth (dotted8)

- [x] Implement `subdivideDotted8()`
  - [x] Swing pattern: **2/3 + 1/3** of quarter (0.667 + 0.333)
  - [x] Long beat at 2/3, short at 1/3
  - [x] Labels alternate pattern

### 4.9 Tempo-Aware Subdivision

- [x] Implement tempo-aware subdivision support
  - [x] Accept `tempoSections` from UnifiedBeatMap
  - [x] Use each section's `intervalSeconds` for subdivision calculations
  - [x] Handle section boundaries correctly
  - [x] Fall back to primary `quarterNoteInterval` if no tempoSections

---

## Phase 5: Segment Support

### 5.1 Segment Processing

- [x] Implement `processSegments()` method
  - [x] Find active segment for each beat range
  - [x] Apply appropriate subdivision
  - [x] Handle transitions at segment boundaries

### 5.2 Segment Boundary Handling

- [x] Ensure smooth transitions between segments
- [x] Immediate change at beat index (no measure boundary wait)
- [x] Recalculate beatInMeasure after each segment

### 5.3 Segment Metadata

- [x] Track which beats came from which segment
- [x] Build `subdivisionMetadata.subdivisionsUsed`

---

## Phase 6: Integration

### 6.1 Update Exports

- [x] Export `BeatSubdivider` from `src/core/analysis/beat/index.ts`
- [x] Export new types from `src/index.ts`
- [x] Export `unifyBeatMap` utility

### 6.2 Add Convenience Functions

- [x] Add `subdivideBeatMap()` convenience function that:
  - [x] Takes `InterpolatedBeatMap` + `SubdivisionConfig`
  - [x] Unifies, then subdivides
  - [x] Returns `SubdividedBeatMap`

### 6.3 Update BeatStream (Optional)

- [ ] Consider if `BeatStream` should accept `SubdividedBeatMap`
- [ ] May need new `useSubdividedBeats` option

---

## Phase 7: Testing

### 7.1 Unit Tests for BeatSubdivider

- [ ] Test each subdivision type:
  - [x] Quarter (no-op)
  - [x] Half (density halved, correct beats kept)
  - [x] Eighth (density doubled, correct positions)
  - [x] Sixteenth (density 4x)
  - [x] Triplet8 (3 per quarter)
  - [ ] Triplet4 (3 per half)
  - [ ] Dotted4 (phase-independent)
  - [ ] Dotted8 (swing pattern)

### 7.2 Segment Tests

- [ ] Test single segment (default)
- [ ] Test multiple segments
- [ ] Test segment transitions at various beat indices
- [ ] Test segment with different subdivisions

### 7.3 Detected Beat Tests

- [ ] Test detected beat preservation (flag)
- [ ] Test detectedBeatIndices array accuracy
- [ ] Test half notes removing detected beats
- [ ] Test new beats NOT being marked as detected

### 7.4 Edge Cases

- [ ] Empty beat map
- [ ] Single beat
- [ ] Very short track
- [ ] Tempo changes (multi-tempo tracks)
- [ ] Multiple time signatures
- [ ] Subdivision config with startBeat exceeding beat count (validation)
- [ ] Density limit enforcement (error on > sixteenth)

### 7.5 Beat Label Tests

- [ ] Verify decimal labels for each subdivision
- [ ] Test measure number calculation
- [ ] Test downbeat marking preservation
- [ ] Verify measure numbers are preserved for half notes

### 7.6 Tempo-Aware Subdivision Tests

- [ ] Test subdivision with single tempo (no tempoSections)
- [ ] Test subdivision with multiple tempo sections
- [ ] Verify correct intervals used per section
- [ ] Test section boundary handling
- [ ] Test subdivision config segments that span tempo section boundaries

---

## Phase 8: Documentation

### 8.1 Update AUDIO_ANALYSIS.md

- [ ] Add "Beat Subdivision" section
- [ ] Document the processing pipeline
- [ ] Document each subdivision type with examples
- [ ] Add segment configuration examples
- [ ] Add beat label system documentation

### 8.2 Update DATA_ENGINE_REFERENCE.md

- [ ] Add `BeatSubdivider` to class summary
- [ ] Add new types to types table
- [ ] Document `SubdivisionConfig` options
- [ ] Add usage examples

### 8.3 Add JSDoc Comments

- [ ] Document all new types with JSDoc
- [ ] Document `BeatSubdivider` class and methods
- [ ] Add `@example` blocks for common usage

---

## Phase 9: Verification

### 9.1 Build Verification

- [ ] Run `npm run build` - must succeed
- [ ] No TypeScript errors

### 9.2 Test Verification

- [ ] Run `npm test` - all tests pass
- [ ] New tests for subdivision pass

### 9.3 Export Verification

- [ ] Verify all new types are exported
- [ ] Verify `BeatSubdivider` is exported
- [ ] Verify `unifyBeatMap` is exported

### 9.4 Integration Verification

- [ ] Can create `UnifiedBeatMap` from `InterpolatedBeatMap`
- [ ] Can subdivide with default config (quarter notes)
- [ ] Can subdivide with custom config
- [ ] Detected beats are preserved correctly

---

## Dependencies

```
Phase 1 (Types) ────────────────────────────────────────────────────┐
        │                                                           │
        ▼                                                           │
Phase 2 (UnifiedBeatMap) ───────────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 3 (BeatSubdivider Core) ──────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 4 (Subdivision Algorithms) ───────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 5 (Segment Support) ──────────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 6 (Integration) ──────────────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 7 (Testing) ──────────────────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 8 (Documentation) ────────────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 9 (Verification) ─────────────────────────────────────────────┤
        │                                                           │
        ▼                                                           │
Phase 10 (Real-Time Playground) ────────────────────────────────────┘
        │
        │  (Depends on UnifiedBeatMap from Phase 2 and
        │   subdivision algorithms from Phase 4)
        ▼
    [Practice Mode Feature]
```

**Note:** All 10 phases are included in the MVP. Phase 10 (Real-Time Playground) is part of the initial implementation scope.

---

## Questions/Unknowns

| Question | Status | Resolution |
|----------|--------|------------|
| Should subdivision affect measure numbers? | Resolved | Keep consistent with downbeat config |
| How to handle intensity/confidence for new beats? | Resolved | Linear average of neighboring beats |
| Should we support nested subdivisions? | Deferred | Not for v1 |
| Max density limit? | Resolved | Hard limit at sixteenth (4x density) |
| How does this interact with multi-tempo? | Resolved | Tempo-aware: use each TempoSection's intervalSeconds |
| beatInMeasure decimal support? | Resolved | SubdividedBeat only (base Beat stays integer) |
| originalBeatIndex semantics? | Resolved | References UnifiedBeatMap index (input to subdivider) |
| DownbeatConfig in SubdividedBeatMap? | Resolved | Inherit and preserve from UnifiedBeatMap |
| Phase 10 scope? | Resolved | Include in MVP (not deferred) |

---

## Success Criteria

### Core Feature (Phases 1-9)

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Build Success | TypeScript compiles | `npm run build` |
| Tests Pass | All tests pass | `npm test` |
| Quarter Notes | No change from input | Unit test |
| Half Notes | 0.5x density, correct beats, measure numbers preserved | Unit test |
| Eighth Notes | 2x density, correct positions | Unit test |
| Sixteenth Notes | 4x density, correct positions, **hard limit enforced** | Unit test |
| Triplets | 3 beats per unit, correct feel | Unit test |
| Dotted Notes | Phase-independent or swing (2/3 + 1/3) | Unit test |
| Segments | Changes at beat index | Unit test |
| Detected Beats | Preserved with flag | Unit test |
| Decimal Labels | Correct for each subdivision (SubdividedBeat only) | Unit test |
| Tempo-Aware | Correct intervals per TempoSection | Unit test |
| Validation | Config validation catches errors | Unit test |
| Documentation | Complete with examples | Manual review |

### Practice Mode Feature (Phase 10)

| Criterion | Target | How to Verify |
|-----------|--------|---------------|
| Real-Time Switching | Instant subdivision change | Unit test + manual |
| Continuity | No missed beats on switch | Unit test |
| Quarter → Eighth | Doubles density immediately | Manual testing |
| Eighth → Half | Halves density immediately | Manual testing |
| Transition Modes | Configurable behavior | Unit test |
| Beat Events | Correct events after switch | Unit test |
| Practice Mode UI | Buttons work correctly | Manual testing |

---

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Types | 2 | SubdivisionType, configs, new interfaces, validation functions |
| Phase 2: UnifiedBeatMap | 1.5 | Flattening utility + tempoSections support |
| Phase 3: BeatSubdivider Core | 2.5 | Class skeleton, options, main method, tempo-aware support |
| Phase 4: Subdivision Algorithms | 5 | 8 subdivision types + tempo-aware calculations |
| Phase 5: Segment Support | 2 | Segment processing, transitions |
| Phase 6: Integration | 1 | Exports, convenience functions |
| Phase 7: Testing | 5 | Comprehensive test coverage including multi-tempo |
| Phase 8: Documentation | 2.5 | AUDIO_ANALYSIS.md, DATA_ENGINE_REFERENCE.md |
| Phase 9: Verification | 1 | Build, test, export verification |
| Phase 10: Real-Time Playground | 4 | Practice mode controller, real-time switching |
| **Total** | **26.5** | All phases included in MVP |

**Implementation Priority:**
1. **Phases 1-9** (Core): Pre-calculated SubdividedBeatMap for level creation
2. **Phase 10** (Real-Time): Practice mode feature - included in MVP

---

## Example Usage (Post-Implementation)

```typescript
import {
    BeatMapGenerator,
    BeatInterpolator,
    BeatSubdivider,
    unifyBeatMap,
    SubdivisionConfig
} from 'playlist-data-engine';

const generator = new BeatMapGenerator();
const interpolator = new BeatInterpolator();
const subdivider = new BeatSubdivider();

// Step 1: Generate beat map
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Step 2: Interpolate to fill gaps
const interpolatedMap = interpolator.interpolate(beatMap);

// Step 3: Unify into quarter-note grid
const unifiedMap = unifyBeatMap(interpolatedMap);

// Step 4: Subdivide with rhythm pattern
const subdivisionConfig: SubdivisionConfig = {
    segments: [
        { startBeat: 0, subdivision: 'quarter' },      // Intro: quarter notes
        { startBeat: 32, subdivision: 'eighth' },      // Verse: eighth notes
        { startBeat: 96, subdivision: 'half' },        // Bridge: half notes
        { startBeat: 128, subdivision: 'triplet8' },   // Solo: triplets
    ],
};

const subdividedMap = subdivider.subdivide(unifiedMap, subdivisionConfig);

// Result: A beat map that changes rhythm density over time
// - Beats 0-31: Quarter notes (standard grid)
// - Beats 32-95: Eighth notes (double time)
// - Beats 96-127: Half notes (half time)
// - Beats 128+: Triplets (swing feel)

// Detected beats are still marked for accent patterns
const detectedBeats = subdividedMap.beats.filter(b => b.isDetected);
```

### Half Notes Example

```typescript
// Convert to half notes (beats on 1 and 3 only)
const halfNoteMap = subdivider.subdivide(unifiedMap, {
    segments: [{ startBeat: 0, subdivision: 'half' }],
});

// Original quarter notes: 0, 1, 2, 3, 4, 5, 6, 7...
// Half notes result:       0,    2,    4,    6...
// (Keeps downbeats and beat 3s)
```

### Swing Feel Example

```typescript
// Apply swing feel with dotted eighth pattern
const swingMap = subdivider.subdivide(unifiedMap, {
    segments: [{ startBeat: 0, subdivision: 'dotted8' }],
});

// Long-short pattern: 0, 0.66, 1, 1.66, 2, 2.66...
// (First beat long, second beat short)
```

---

## Next Steps

1. **Review and approve** this plan
2. **Start Phase 1**: Add new types to `BeatMap.ts`
3. **Work through phases** sequentially (1-10, all included in MVP)
4. **Run tests** after each phase
5. **Update documentation** when code changes complete (Phase 8)
6. **Verify build** and functionality
7. **Implement Phase 10**: Real-time practice mode feature

**Implementation Approach:**
- Complete Phases 1-9 first (pre-calculated subdivision for level creation)
- Implement Phase 10 (real-time playground) as part of MVP
- All 10 phases are included in the initial implementation scope

---

## Phase 10: Real-Time Subdivision Playground (Practice Mode)

### Overview

A separate feature from the pre-calculated SubdividedBeatMap. This enables real-time subdivision switching during playback for practice mode. Users can start with quarter notes and instantly switch to eighth notes (or any subdivision) while practicing.

### Key Distinction

| Feature | SubdividedBeatMap | Real-Time Playground |
|---------|-------------------|---------------------|
| Purpose | Level creation | Practice mode |
| Timing | Pre-calculated | Generated on-the-fly |
| Storage | Saved with level | Not stored |
| Switching | Via config segments | Via button click during playback |
| Complexity | Lower (static) | Higher (dynamic) |

### 10.1 Create SubdivisionPlaybackController

- [ ] Create `src/core/playback/SubdivisionPlaybackController.ts`
- [ ] Class that wraps `UnifiedBeatMap` and provides real-time subdivision
  ```typescript
  export class SubdivisionPlaybackController {
      constructor(
          unifiedMap: UnifiedBeatMap,
          audioContext: AudioContext,
          options?: SubdivisionPlaybackOptions
      );

      /** Get current subdivision type */
      readonly subdivision: SubdivisionType;

      /** Change subdivision in real-time */
      setSubdivision(type: SubdivisionType): void;

      /** Get beats for a time range (generated on-the-fly) */
      getBeatsInRange(startTime: number, endTime: number): SubdividedBeat[];

      /** Subscribe to beat events */
      subscribe(callback: SubdivisionCallback): () => void;

      /** Start/stop playback */
      play(): void;
      pause(): void;
      seek(time: number): void;
  }
  ```

### 10.2 Real-Time Beat Generation

- [ ] Implement on-the-fly beat generation
  - [ ] Calculate beat positions from current subdivision type
  - [ ] Use `quarterNoteInterval` as base
  - [ ] Generate beats in time range requested
  - [ ] Maintain continuity across subdivision changes

### 10.3 Subdivision Transition Handling

- [ ] Handle transitions when user clicks button
  - [ ] Calculate next beat position for new subdivision
  - [ ] Option 1: Wait for next downbeat (musical)
  - [ ] Option 2: Immediate switch (immediate)
  - [ ] Configurable via `transitionMode` option

### 10.4 Options Interface

- [ ] Add `SubdivisionPlaybackOptions`
  ```typescript
  export interface SubdivisionPlaybackOptions {
      /** Starting subdivision type */
      initialSubdivision?: SubdivisionType; // default: 'quarter'

      /** How to handle subdivision changes */
      transitionMode?: 'immediate' | 'next-downbeat' | 'next-measure';

      /** Callback when subdivision changes */
      onSubdivisionChange?: (oldType: SubdivisionType, newType: SubdivisionType) => void;

      /** Anticipation time for beat events */
      anticipationTime?: number;
  }
  ```

### 10.5 Beat Event Types

- [ ] Add `SubdivisionBeatEvent` type
  ```typescript
  export interface SubdivisionBeatEvent {
      beat: SubdividedBeat;
      currentSubdivision: SubdivisionType;
      timeUntilBeat: number;
      audioTime: number;
  }

  export type SubdivisionCallback = (event: SubdivisionBeatEvent) => void;
  ```

### 10.6 Integration with BeatStream

- [ ] Consider relationship with existing `BeatStream`
  - [ ] Option A: Extend BeatStream with subdivision support
  - [ ] Option B: Separate controller that uses UnifiedBeatMap directly
  - [ ] Recommendation: Separate controller (cleaner separation)

### 10.7 Unit Tests

- [ ] Test real-time beat generation for each subdivision type
- [ ] Test subdivision transitions
- [ ] Test continuity across changes
- [ ] Test playback position tracking

### 10.8 Documentation

- [ ] Update AUDIO_ANALYSIS.md
  - [ ] Add "Real-Time Subdivision Playground" section
  - [ ] Document use case: practice mode with dynamic difficulty
  - [ ] Add code examples for SubdivisionPlaybackController
  - [ ] Document SubdivisionPlaybackOptions interface
  - [ ] Add practice mode UI concept diagram
- [ ] Update DATA_ENGINE_REFERENCE.md
  - [ ] Add SubdivisionPlaybackController to class summary table
  - [ ] Add new types: SubdivisionPlaybackOptions, SubdivisionBeatEvent, SubdivisionCallback
  - [ ] Document setSubdivision() method
  - [ ] Document transition modes (immediate, next-downbeat, next-measure)
  - [ ] Add usage examples for practice mode

---

## Real-Time Playground Usage Example

```typescript
import {
    BeatMapGenerator,
    BeatInterpolator,
    unifyBeatMap,
    SubdivisionPlaybackController
} from 'playlist-data-engine';

// Generate and unify (done once)
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const interpolatedMap = interpolator.interpolate(beatMap);
const unifiedMap = unifyBeatMap(interpolatedMap);

// Create real-time controller for practice mode
const controller = new SubdivisionPlaybackController(
    unifiedMap,
    audioContext,
    {
        initialSubdivision: 'quarter',
        transitionMode: 'next-downbeat',
        onSubdivisionChange: (oldType, newType) => {
            console.log(`Switched from ${oldType} to ${newType}`);
        },
    }
);

// Subscribe to beat events
controller.subscribe((event) => {
    // Handle beat event in practice mode UI
    displayBeat(event.beat, event.currentSubdivision);
});

// Start playback
controller.play();

// User clicks "Eighth Notes" button in practice mode
document.getElementById('eighth-btn').onclick = () => {
    controller.setSubdivision('eighth');  // Switches in real-time!
};

// User clicks "Half Notes" button
document.getElementById('half-btn').onclick = () => {
    controller.setSubdivision('half');  // Slows down the beat grid
};

// User clicks "Quarter Notes" button
document.getElementById('quarter-btn').onclick = () => {
    controller.setSubdivision('quarter');  // Back to normal
};
```

### Practice Mode UI Concept

```
┌─────────────────────────────────────────────────────────┐
│  PRACTICE MODE - Song.mp3                               │
│                                                         │
│  [Quarter] [Eighth] [Half] [Triplets] [Swing]           │
│     ↑                                                   │
│   (active)                                              │
│                                                         │
│  ▶ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                    ↑    ↑    ↑    ↑                     │
│                   beat events flow based on active      │
│                   subdivision type                      │
└─────────────────────────────────────────────────────────┘
```

---

## Summary of Key Decisions

| Decision | Choice |
|----------|--------|
| Processing pipeline | Detect → Interpolate → Unify → Subdivide |
| Beat labels | Decimal system (0, 0.5, 1, 1.5...) in **SubdividedBeat only** |
| Detected beat preservation | Boolean flag + separate array |
| Config structure | Segments array (like DownbeatConfig) |
| Subdivision types | Enum/string values |
| Segment transitions | Immediate at beat index |
| Half-note logic | Keep beats 1 and 3 (downbeat + beat 3), **preserve measure numbers** |
| Dotted patterns | Phase-independent (don't care about measures) |
| New beat intensity | **Linear average of neighboring beats** |
| Swing pattern (dotted8) | **2/3 + 1/3** (not 0.66 + 0.34) |
| Maximum density | **Hard limit at sixteenth (4x)** |
| Multi-tempo support | **Tempo-aware**: use each TempoSection's intervalSeconds |
| Validation | `validateSubdivisionConfig()` + `validateSubdivisionConfigAgainstBeats()` |
| originalBeatIndex | References **UnifiedBeatMap** index (input to subdivider) |
| DownbeatConfig in SubdividedBeatMap | **Inherit and preserve** from UnifiedBeatMap |
| Phase 10 scope | **Included in MVP** (not deferred) |
| **Real-time controller** | Separate class, wraps UnifiedBeatMap |
| **Real-time transitions** | Configurable (immediate or next-downbeat) |
