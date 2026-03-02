# Required Keys Beat Map Feature - Implementation Plan

## Prerequisites

⚠️ **This plan should be executed AFTER `beat-subdivision-implementation-plan.md` is complete.**

The subdivision plan introduces `UnifiedBeatMap` and `SubdividedBeatMap` which are the primary types this feature will support. Since `SubdividedBeat extends Beat`, adding `requiredKey` to the base `Beat` interface automatically propagates to all beat types.

### Processing Pipeline (After Both Features)

```
BeatMap → InterpolatedBeatMap → UnifiedBeatMap → SubdividedBeatMap (with requiredKey support)
```

---

## Overview

Add optional "required key" assignments to beats in the beat map. This enables rhythm game chart creation (like Guitar Hero/DDR) where specific keyboard keys must be pressed for specific beats.

### Key Features
- **Fully configurable keys** - any keyboard key including arrows (up, down, left, right)
- **New "WrongKey" accuracy type** - distinct from "Miss" with separate feedback/stats
- **Easy mode bypass** - via DifficultyPreset integration
- **Engine-only scope** - types, checkButtonPress update, serialization, DifficultyPreset integration
- **Works with SubdividedBeatMap** - the primary type for rhythm game charts

### Terminology
- **Required Key** - An optional property on a beat that specifies which keyboard key must be pressed
- **Chart** - A beat map (typically `SubdividedBeatMap`) that has required key assignments
- **WrongKey** - A new accuracy type for when timing is correct but the wrong key was pressed

### Type Hierarchy (After Subdivision Plan)

```
Beat (base)
├── BeatWithSource (extends Beat) - used in InterpolatedBeatMap.mergedBeats
└── SubdividedBeat (extends Beat) - used in SubdividedBeatMap.beats
    ├── isDetected: boolean
    ├── originalBeatIndex?: number
    ├── subdivisionType: SubdivisionType
    └── requiredKey?: string ← NEW (inherited from Beat)
```

---

## Phase 1: Type System Changes

### Task 1.1: Extend Beat Interface
- [ ] Add `requiredKey?: string` property to `Beat` interface in [BeatMap.ts](src/core/types/BeatMap.ts)
- [ ] Update `BeatMapJSON` interface to include `requiredKey` in beat array type
- [ ] Verify `BeatWithSource` inherits automatically (extends Beat) ✓
- [ ] Verify `SubdividedBeat` inherits automatically (extends Beat) ✓
- [ ] Add `requiredKey?: string` to `SubdividedBeatJSON` if created

### Task 1.2: Add WrongKey Accuracy Type
- [ ] Update `BeatAccuracy` type to include `'wrongKey'`:
  ```typescript
  export type BeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey';
  ```
- [ ] Add `keyMatch: boolean` property to `ButtonPressResult` interface
- [ ] Add `pressedKey?: string` property to `ButtonPressResult` interface
- [ ] Add `requiredKey?: string` property to `ButtonPressResult` interface (convenience copy from matched beat)

### Task 1.3: Update DifficultyPreset System
- [ ] Add `ignoreKeyRequirements?: boolean` to `AccuracyThresholds` interface
- [ ] Update `EASY_ACCURACY_THRESHOLDS` to set `ignoreKeyRequirements: true`
- [ ] Update `MEDIUM_ACCURACY_THRESHOLDS` to set `ignoreKeyRequirements: false`
- [ ] Update `HARD_ACCURACY_THRESHOLDS` to set `ignoreKeyRequirements: false`
- [ ] Update `getAccuracyThresholdsForPreset()` function to handle new property

---

## Phase 2: BeatStream Logic Changes

### Task 2.1: Add SubdividedBeatMap Support to BeatStream
- [ ] Update `BeatStream` to accept `SubdividedBeatMap` in addition to `BeatMap | InterpolatedBeatMap`
- [ ] Add type guard `isSubdividedBeatMap()` similar to `isInterpolatedBeatMap()`
- [ ] Update `createNormalizedBeatMap()` to handle `SubdividedBeatMap`
- [ ] Ensure `SubdividedBeat` type works with existing beat iteration logic

### Task 2.2: Update checkButtonPress Method
- [ ] Add optional `pressedKey?: string` parameter to `checkButtonPress(timestamp: number, pressedKey?: string)`
- [ ] Get current thresholds from stream state (already has `this.state.thresholds`)
- [ ] After finding nearest beat and calculating timing accuracy:
  - [ ] Check if beat has `requiredKey` defined
  - [ ] Check if `ignoreKeyRequirements` is false (key checking enabled)
  - [ ] If key required and `pressedKey` doesn't match `requiredKey`:
    - [ ] Set `accuracy = 'wrongKey'`
    - [ ] Set `keyMatch = false`
  - [ ] Otherwise:
    - [ ] Keep existing timing-based accuracy
    - [ ] Set `keyMatch = true` (or `true` if no key required)

### Task 2.3: Update ButtonPressResult Construction
- [ ] Add `pressedKey` to result (the key that was passed in)
- [ ] Add `requiredKey` to result (copy from `matchedBeat.requiredKey`)
- [ ] Add `keyMatch` to result (boolean)

### Task 2.4: Handle Edge Cases
- [ ] Beat has no `requiredKey` → timing-only evaluation (existing behavior)
- [ ] `ignoreKeyRequirements: true` → timing-only evaluation even if beat has required key
- [ ] `pressedKey` not provided but beat requires key → treat as wrongKey (or miss?)

---

## Phase 3: Serialization Updates

### Task 3.1: Update BeatMapJSON Serialization
- [ ] Verify `BeatMapJSON` beats array type includes `requiredKey?: string`
- [ ] No changes needed to `toJSON()` - it spreads all beat properties
- [ ] No changes needed to `fromJSON()` - it spreads all beat properties

### Task 3.2: Update SubdividedBeatMap Serialization (if applicable)
- [ ] Verify `SubdividedBeatMap.toJSON()` preserves `requiredKey` on beats
- [ ] Verify `SubdividedBeatMap.fromJSON()` restores `requiredKey` on beats
- [ ] Add `SubdividedBeatMapJSON` interface if not already present

### Task 3.3: Verify Interpolation Preserves Keys
- [ ] Review `BeatInterpolator.ts` to ensure interpolated beats preserve `requiredKey` if present
- [ ] Note: Since interpolation creates new beats, they won't have required keys by default
- [ ] This is expected - users assign keys AFTER subdivision is complete

### Task 3.4: Update BeatMapGenerator Serialization
- [ ] Verify `saveToFile()` and `loadFromFile()` handle `requiredKey` property
- [ ] Test round-trip serialization with required keys

---

## Phase 4: Helper Functions & Utilities

### Task 4.1: Create Key Validation Helper
- [ ] Add `isValidKeyName(key: string): boolean` function
- [ ] Could validate against standard KeyboardEvent.key values
- [ ] Keep permissive for custom key bindings

### Task 4.2: Create Key Assignment Helper for SubdividedBeatMap
- [ ] Add `assignKeyToBeat(beatMap: SubdividedBeatMap, beatIndex: number, key: string | null): SubdividedBeatMap`
- [ ] Returns new SubdividedBeatMap with updated beat (immutability)
- [ ] `null` key removes the required key
- [ ] Works with `UnifiedBeatMap` and `BeatMap` as well (generic)

### Task 4.3: Create Bulk Key Assignment Helper
- [ ] Add `assignKeysToBeats(beatMap: SubdividedBeatMap, assignments: Array<{beatIndex: number, key: string | null}>): SubdividedBeatMap`
- [ ] Efficient batch updates for chart creation
- [ ] Useful for UI "paint/brush" mode (future)

### Task 4.4: Create Key Map Extraction Helper
- [ ] Add `extractKeyMap(beatMap: SubdividedBeatMap): Map<number, string>`
- [ ] Returns a map of beatIndex → requiredKey for beats that have keys
- [ ] Useful for serialization and UI display

---

## Phase 5: Documentation Updates

### Task 5.1: Update AUDIO_ANALYSIS.md
- [ ] Document the `requiredKey` property on Beat interface
- [ ] Add section on "Chart Creation" explaining required keys
- [ ] Document the new `wrongKey` accuracy type
- [ ] Update ButtonPressResult documentation with new fields

### Task 5.2: Update DATA_ENGINE_REFERENCE.md
- [ ] Add `requiredKey` to Beat type reference
- [ ] Add `wrongKey` to BeatAccuracy type reference
- [ ] Document new ButtonPressResult fields
- [ ] Document `ignoreKeyRequirements` in DifficultyPreset section
- [ ] Add example of creating a chart with required keys

### Task 5.3: Add Code Examples
- [ ] Example: Creating a simple 2-key chart
- [ ] Example: Checking button press with key validation
- [ ] Example: Using easy mode to bypass key requirements

---

## Phase 6: Testing

### Task 6.1: Unit Tests for Type Changes
- [ ] Test Beat interface accepts optional requiredKey
- [ ] Test ButtonPressResult includes new fields
- [ ] Test BeatAccuracy includes 'wrongKey'

### Task 6.2: Unit Tests for checkButtonPress
- [ ] Test timing-only evaluation when no requiredKey on beat
- [ ] Test wrongKey returned when pressedKey doesn't match requiredKey
- [ ] Test correct key returns timing-based accuracy
- [ ] Test ignoreKeyRequirements bypasses key checking
- [ ] Test edge case: requiredKey defined but pressedKey undefined

### Task 6.3: Unit Tests for Serialization
- [ ] Test toJSON/fromJSON preserves requiredKey
- [ ] Test saveToFile/loadFromFile preserves requiredKey
- [ ] Test round-trip with mixed beats (some with keys, some without)

---

## Dependencies

### Prerequisite
- **beat-subdivision-implementation-plan.md** must be complete first
  - Provides `UnifiedBeatMap` and `SubdividedBeatMap` types
  - Provides `SubdividedBeat` which extends `Beat`
  - Provides the subdivision pipeline for chart creation

### No Breaking Changes
- All existing code continues to work since `requiredKey` is optional
- `BeatStream` gains new input type support but maintains backward compatibility

---

## Questions/Unknowns

### Resolved During Research
- ~~Key set to support~~ → Fully configurable, any keyboard key
- ~~Wrong key handling~~ → New "wrongKey" accuracy type
- ~~Data model approach~~ → Extend Beat interface directly
- ~~Chart storage format~~ → Extend existing BeatMap JSON
- ~~Interpolation key inheritance~~ → No inheritance, keys assigned after interpolation

### To Resolve During Implementation
- [ ] Should missing `pressedKey` when key is required be `wrongKey` or `miss`?
- [ ] Should we validate key names against KeyboardEvent.key standard?
- [ ] Should there be a `clearAllKeys()` helper for removing all key assignments?

---

## Success Criteria

### Type System
- [ ] Beat type has optional `requiredKey?: string` field
- [ ] `SubdividedBeat` inherits `requiredKey` from Beat
- [ ] `BeatAccuracy` type includes `'wrongKey'`
- [ ] `ButtonPressResult` includes `keyMatch`, `pressedKey`, `requiredKey` fields

### BeatStream Integration
- [ ] BeatStream accepts `SubdividedBeatMap` as input
- [ ] `checkButtonPress(timestamp, pressedKey)` validates key when required
- [ ] `ignoreKeyRequirements` in DifficultyPreset bypasses key checking

### Serialization
- [ ] Serialization preserves required key data on all beat types
- [ ] Round-trip `toJSON()`/`fromJSON()` maintains required keys

### Documentation & Testing
- [ ] Documentation updated in AUDIO_ANALYSIS.md and DATA_ENGINE_REFERENCE.md
- [ ] Unit tests cover new functionality
- [ ] Integration tests with SubdividedBeatMap pass

---

## Future Considerations (Out of Scope)

These are not part of this initial engine-only implementation but are anticipated future work:

- **UI Editor** - Paint/brush mode for assigning keys to beats in timeline (planned)
- **Key Prompts** - Visual display of required keys during gameplay
- **Key Patterns** - Auto-assign patterns like "A-B-A-B" or "A-B-X-Y"
- **Multi-key Beats** - Beats that require simultaneous key presses
- **Hold Notes** - Beats that require holding a key for a duration
- **Chart Sharing** - Export/import charts separately from audio analysis

---

## Example Usage (Post-Implementation)

```typescript
import {
    BeatMapGenerator,
    BeatInterpolator,
    BeatSubdivider,
    unifyBeatMap,
    SubdivisionConfig,
    BeatStream,
    assignKeysToBeats,
} from 'playlist-data-engine';

// Step 1-4: Create subdivided beat map (from subdivision plan)
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const interpolatedMap = interpolator.interpolate(beatMap);
const unifiedMap = unifyBeatMap(interpolatedMap);
const subdividedMap = subdivider.subdivide(unifiedMap, subdivisionConfig);

// Step 5: Assign required keys to create a chart
const chartMap = assignKeysToBeats(subdividedMap, [
    { beatIndex: 0, key: 'a' },
    { beatIndex: 1, key: 's' },
    { beatIndex: 2, key: 'a' },
    { beatIndex: 3, key: 's' },
    // ... more assignments
]);

// Step 6: Use in gameplay
const beatStream = new BeatStream(chartMap, audioContext, {
    difficulty: 'hard',  // Key requirements enforced
});

// On player input
const result = beatStream.checkButtonPress(timestamp, 'a');
// result.accuracy: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey'
// result.keyMatch: true | false
// result.requiredKey: 'a'
// result.pressedKey: 'a'
```
