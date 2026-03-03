# Remove Segment-Based Subdivision & Add Rest Support

## Overview

Remove the legacy segment-based subdivision configuration (`SegmentSubdivisionConfig`) entirely from the engine, leaving only per-beat subdivision (renamed to simply `SubdivisionConfig`). Add `'rest'` as a new `SubdivisionType` to allow beats to be marked as rests (no note played).

**Goals:**
1. Simplify the API - one clear way to configure subdivisions
2. Add rest support for rhythm chart creation
3. Update documentation to reflect the new approach

---

## Work Already Completed

### Commit `7630f19` - PerBeatSubdivisionConfig Interface
- [x] Added `PerBeatSubdivisionConfig` interface to [BeatMap.ts](src/core/types/BeatMap.ts)
- [x] Added `DEFAULT_PER_BEAT_SUBDIVISION_CONFIG` constant
- [x] Exported new type and constant from [src/index.ts](src/index.ts)

### Commit `111c4b3` - Per-Beat Subdivision Processing
- [x] Added `subdividePerBeat()` method to [BeatSubdivider.ts](src/core/analysis/beat/BeatSubdivider.ts)
- [x] Added `createInterpolatedBeatsForSubdivision()` helper method
- [x] Added `createEmptySubdividedBeatMapFromPerBeatConfig()` for empty maps
- [x] Created `SegmentSubdivisionContext` interface for type safety
- [x] Updated `subdivide()` to route to appropriate method based on config type
- [x] Maintained backwards compatibility with segment-based configs

### Uncommitted Changes (in progress)
- [x] Renamed `SubdivisionConfig` to `SegmentSubdivisionConfig` in [BeatMap.ts](src/core/types/BeatMap.ts)
- [x] Created `SubdivisionConfig` union type (`SegmentSubdivisionConfig | PerBeatSubdivisionConfig`)
- [x] Added `isPerBeatSubdivisionConfig()` type guard
- [x] Added `isSegmentSubdivisionConfig()` type guard
- [x] Added `validatePerBeatSubdivisionConfig()` validator
- [x] Added `validateSegmentSubdivisionConfig()` validator (split from original)
- [x] Updated `validateSubdivisionConfig()` to dispatch based on config type
- [x] Added `validatePerBeatSubdivisionConfigAgainstBeats()` validator
- [x] Added `validateSegmentSubdivisionConfigAgainstBeats()` validator
- [x] Updated exports in [src/index.ts](src/index.ts)

---

## Phase 1: Add 'rest' Subdivision Type

### 1.1 Update SubdivisionType Definition
- [x] Add `'rest'` to the `SubdivisionType` union in [BeatMap.ts](src/core/types/BeatMap.ts)
  - Update the JSDoc comment to explain rest
  - `'rest'` means "no subdivision beats generated for this beat"

### 1.2 Update Subdivision Constants
- [x] Add `'rest'` to `VALID_SUBDIVISION_TYPES` array
- [x] Update `getSubdivisionDensity()` to return `0` for `'rest'`
- [x] Update any density-related validation to handle rest (density 0 is valid)

### 1.3 Update BeatSubdivider to Handle Rest
- [x] In `subdividePerBeat()` method, skip beat generation when subdivision is `'rest'`
  - The beat should still exist in the unified map but produce no subdivided beats
  - **Decision: No beat at all in SubdividedBeatMap** (cleaner for rhythm games)

---

## Phase 2: Remove Segment-Based Configuration (DELETE)

> **NOTE:** The uncommitted changes ADDED segment-related types/guards/validators.
> This phase REMOVES them entirely since we're going per-beat only.

### 2.1 Remove Segment Types from BeatMap.ts
- [x] Delete `SubdivisionSegment` interface
- [x] Delete `SegmentSubdivisionConfig` interface
- [x] Delete `DEFAULT_SUBDIVISION_CONFIG` (segment-based default)
- [x] Remove the union type definition
- [x] Remove `version` field from `PerBeatSubdivisionConfig` (no longer needed without migration)
- [x] Rename `PerBeatSubdivisionConfig` to `SubdivisionConfig` (the only config type)
- [x] Rename `DEFAULT_PER_BEAT_SUBDIVISION_CONFIG` to `DEFAULT_SUBDIVISION_CONFIG`

### 2.2 Remove Segment Type Guards and Validators
- [x] Delete `isPerBeatSubdivisionConfig()` function (no longer needed)
- [x] Delete `isSegmentSubdivisionConfig()` function
- [x] Delete `validateSegmentSubdivisionConfig()` function
- [x] Delete `validateSegmentSubdivisionConfigAgainstBeats()` function
- [x] Rename `validatePerBeatSubdivisionConfig()` to `validateSubdivisionConfig()`
- [x] Rename `validatePerBeatSubdivisionConfigAgainstBeats()` to `validateSubdivisionConfigAgainstBeats()`

### 2.3 Update BeatSubdivider.ts
- [ ] Remove `SegmentSubdivisionConfig` import
- [ ] Remove `SubdivisionSegment` import
- [ ] Remove `isPerBeatSubdivisionConfig` import
- [ ] Delete `SegmentSubdivisionContext` interface
- [ ] Delete `subdivideSegments()` method
- [ ] Delete `processSegments()` method
- [ ] Delete `subdivideSegment()` method
- [ ] Delete `createEmptySubdividedBeatMap()` (segment-based version)
- [ ] Rename `subdividePerBeat()` to `subdivide()` (the main method)
- [ ] Rename `createEmptySubdividedBeatMapFromPerBeatConfig()` to `createEmptySubdividedBeatMap()`
- [ ] Update `SubdivisionContext` to remove segment-specific fields
- [ ] Update `buildMetadata()` to work with per-beat context only
- [ ] Update class JSDoc to remove segment-based references

### 2.4 Update SubdivisionPlaybackController.ts
- [ ] Update `regenerateBeats()` to use new `SubdivisionConfig` format:
  ```typescript
  // OLD:
  const config = {
      segments: [{ startBeat: 0, subdivision: this.state.currentSubdivision }],
  };

  // NEW:
  const config: SubdivisionConfig = {
      beatSubdivisions: new Map(),  // empty = all use default
      defaultSubdivision: this.state.currentSubdivision,
  };
  ```

### 2.5 Update Exports (src/index.ts)
- [ ] Remove `SegmentSubdivisionConfig` from type exports
- [ ] Remove `SubdivisionSegment` from type exports
- [ ] Keep `SubdivisionConfig` (now the per-beat format only)
- [ ] Remove `isPerBeatSubdivisionConfig` export
- [ ] Remove `isSegmentSubdivisionConfig` export
- [ ] Rename `validatePerBeatSubdivisionConfig` export to `validateSubdivisionConfig`

### 2.6 Update Beat Analysis Index (src/core/analysis/beat/index.ts)
- [ ] Remove segment-related exports
- [ ] Update re-exports to reflect simplified API

---

## Phase 3: Update SubdividedBeatMap Type

### 3.1 Update SubdividedBeatMap Interface
- [ ] Change `subdivisionConfig` property type from union to single type:
  ```typescript
  // OLD:
  subdivisionConfig: SegmentSubdivisionConfig | PerBeatSubdivisionConfig;

  // NEW:
  subdivisionConfig: SubdivisionConfig;
  ```

### 3.2 Update SubdivisionMetadata Interface
- [ ] Remove `segmentCount` field (no longer applicable)
- [ ] Add `explicitBeatCount` field (number of beats with explicit non-default subdivision)

---

## Phase 4: Update Tests

### 4.1 Update beatSubdivider.test.ts
- [ ] Remove all segment-based test cases
- [ ] Update imports to use new types
- [ ] Add test cases for `'rest'` subdivision type
- [ ] Update existing tests to use `SubdivisionConfig` (per-beat format)

### 4.2 Update Other Test Files
- [ ] [beatKeyHelpers.test.ts](tests/unit/beat/beatKeyHelpers.test.ts) - Update subdivision config usage
- [ ] [beatStream.test.ts](tests/unit/beat/beatStream.test.ts) - Update subdivision config usage
- [ ] [unifyBeatMap.test.ts](tests/unit/beat/unifyBeatMap.test.ts) - Check for segment usage
- [ ] [subdivisionPlaybackController.test.ts](tests/unit/playback/subdivisionPlaybackController.test.ts) - Update config format

---

## Phase 5: Update Documentation

> **IMPORTANT:** Documentation must reflect that segment-based is REMOVED, not just "legacy".
> The docs should show ONLY the per-beat approach.

### 6.1 Update DATA_ENGINE_REFERENCE.md

#### Type Exports Section
- [ ] Remove `SegmentSubdivisionConfig` from type tables
- [ ] Remove `SubdivisionSegment` from type tables
- [ ] Update `SubdivisionConfig` to show per-beat format:
  ```typescript
  interface SubdivisionConfig {
      beatSubdivisions: Map<number, SubdivisionType>;
      defaultSubdivision: SubdivisionType;
  }
  ```
- [ ] Add `'rest'` to SubdivisionType documentation

#### Function Reference Section
- [ ] Remove `isPerBeatSubdivisionConfig` from reference
- [ ] Remove `isSegmentSubdivisionConfig` from reference
- [ ] Remove `validateSegmentSubdivisionConfig` from reference
- [ ] Update `validateSubdivisionConfig` to show per-beat validation only

#### BeatSubdivider Section
- [ ] Update examples to use per-beat `SubdivisionConfig`
- [ ] Remove any segment-based examples
- [ ] Add example showing `'rest'` usage

#### Quick Start Example
- [ ] Update to use per-beat config format

### 6.2 Update AUDIO_ANALYSIS.md

#### Beat Subdivision Section (~line 2092)
- [ ] Rewrite overview to focus on per-beat approach
- [ ] Remove "Segment-Based Configuration" subsection entirely
- [ ] Add "Per-Beat Configuration" section with examples

#### Subdivision Types Section
- [ ] Add `'rest'` type documentation:
  ```
  #### Rest (0x Density)
  No beats generated - used for creating gaps in rhythm patterns.

  ```typescript
  const config: SubdivisionConfig = {
      beatSubdivisions: new Map([
          [0, 'quarter'],
          [1, 'rest'],      // No beat on beat 1
          [2, 'eighth'],    // Eighth notes on beat 2
          [3, 'rest'],      // No beat on beat 3
      ]),
      defaultSubdivision: 'quarter',
  };
  ```
  ```

#### Type Definitions Section (~line 2465)
- [ ] Remove `SubdivisionSegment` interface definition
- [ ] Remove `SegmentSubdivisionConfig` interface definition
- [ ] Update `SubdivisionConfig` to show per-beat format only
- [ ] Update `SubdividedBeatMap` to show new config type

#### All Code Examples
- [ ] Search for `segments:` pattern and update all examples
- [ ] Update to use per-beat Map format

### 6.3 Update Code Examples in Source Files
- [ ] Update JSDoc examples in [BeatMap.ts](src/core/types/BeatMap.ts)
- [ ] Update JSDoc examples in [BeatSubdivider.ts](src/core/analysis/beat/BeatSubdivider.ts)
- [ ] Update examples in [subdivideBeatMap.ts](src/core/analysis/beat/utils/subdivideBeatMap.ts)
- [ ] Update examples in [BeatStream.ts](src/core/analysis/beat/BeatStream.ts)

---

## Phase 6: Final Cleanup

### 7.1 Remove Deprecated Comments
- [ ] Remove any `@deprecated` tags that referenced segment-based as legacy
- [ ] Clean up migration-related comments
- [ ] Remove "version 2" references (no version field needed)

### 7.2 Update Constants
- [ ] Verify `DEFAULT_SUBDIVISION_CONFIG` uses new format:
  ```typescript
  export const DEFAULT_SUBDIVISION_CONFIG: SubdivisionConfig = {
      beatSubdivisions: new Map(),
      defaultSubdivision: 'quarter',
  };
  ```

### 7.3 Build & Test Verification
- [ ] Run `npm run build` to verify no TypeScript errors
- [ ] Run `npm test` to verify all tests pass
- [ ] Grep for any remaining references to `SegmentSubdivisionConfig`
- [ ] Grep for any remaining references to `segments:` in config objects

---

## Dependencies

- None - this is a self-contained refactor

## Questions/Unknowns

1. ~~**Rest beat representation**~~: **DECIDED** - No beat at all in SubdividedBeatMap (cleaner for rhythm games)

2. ~~**SubdivisionMetadata.segmentCount**~~: **DECIDED** - Remove and replace with `explicitBeatCount`

---

## Estimated Impact

**Files Modified:** ~10 files (THIS PROJECT ONLY)

| File | Changes |
|------|---------|
| `src/core/types/BeatMap.ts` | Major - remove segment types, add rest, rename types |
| `src/core/analysis/beat/BeatSubdivider.ts` | Major - remove segment methods, update to per-beat only |
| `src/core/playback/SubdivisionPlaybackController.ts` | Minor - update config format |
| `src/index.ts` | Export changes |
| `src/core/analysis/beat/index.ts` | Export changes |
| `tests/unit/beat/beatSubdivider.test.ts` | Test updates |
| `DATA_ENGINE_REFERENCE.md` | Documentation rewrite |
| `docs/AUDIO_ANALYSIS.md` | Documentation rewrite |

**Breaking Changes:** Yes
- `SegmentSubdivisionConfig` removed entirely
- `SubdivisionSegment` removed entirely
- `SubdivisionConfig` changes from union to single per-beat type
- Various type guards and validators removed/renamed
- `version` field removed from config
