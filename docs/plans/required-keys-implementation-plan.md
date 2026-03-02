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

Add optional "required key" assignments to beats in the beat map. This enables rhythm game chart creation (like Guitar Hero/DDR) where specific keys must be pressed for specific beats.

### Key Features
- **Fully configurable keys** - any string value (e.g., "up", "down", "a", "b")
- **Frontend-agnostic input** - engine just compares strings, frontend maps physical inputs
- **New "WrongKey" accuracy type** - distinct from "Miss" with separate feedback/stats
- **Easy mode bypass** - via BeatStreamOptions configuration
- **Engine-only scope** - types, checkButtonPress update, serialization, helper functions
- **Works with SubdividedBeatMap** - the primary type for rhythm game charts

### Terminology
- **Required Key** - An optional property on a beat that specifies which key must be pressed
- **Chart** - A beat map (typically `SubdividedBeatMap`) that has required key assignments
- **WrongKey** - A new accuracy type for when timing is correct but the wrong key was pressed

### How Key Matching Works

The engine performs **simple string comparison** - it does not validate or care about the physical input source:

```typescript
// Engine logic (simplified)
if (beat.requiredKey && pressedKey !== beat.requiredKey) {
    result.accuracy = 'wrongKey';
}
```

**Frontend responsibility**: Map physical inputs to logical key strings before calling the engine:
- Keyboard arrow key → pass `"up"`, `"down"`, `"left"`, `"right"`
- Game controller D-pad → pass `"up"`, `"down"`, `"left"`, `"right"`
- Game controller face buttons → pass `"a"`, `"b"`, `"x"`, `"y"`
- Touch screen zones → pass any string you define

The engine doesn't know or care if "up" came from a keyboard, controller, or touch screen - it just matches strings.

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

**Note**: All beat types (detected, interpolated, subdivided) have the optional `requiredKey` field. The value is assigned after the beat map is fully processed and combined - there is no inheritance from source beats because by the time keys are assigned, the distinction between detected and interpolated beats is meaningless.

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

### Task 1.3: Add ignoreKeyRequirements to BeatStreamOptions
- [ ] Add `ignoreKeyRequirements?: boolean` to `BeatStreamOptions` interface
- [ ] Default value: `false` (key requirements enforced by default)
- [ ] When `true`: timing-only evaluation even if beat has required key (easy mode behavior)

---

## Phase 2: BeatStream Logic Changes

### Task 2.1: Add SubdividedBeatMap Support to BeatStream
- [ ] Update `BeatStream` to accept `SubdividedBeatMap` in addition to `BeatMap | InterpolatedBeatMap`
- [ ] Add type guard `isSubdividedBeatMap()` similar to `isInterpolatedBeatMap()`
- [ ] Update `createNormalizedBeatMap()` to handle `SubdividedBeatMap`
- [ ] Ensure `SubdividedBeat` type works with existing beat iteration logic

### Task 2.2: Update checkButtonPress Method
- [ ] Add optional `pressedKey?: string` parameter to `checkButtonPress(timestamp: number, pressedKey?: string)`
- [ ] Get `ignoreKeyRequirements` from stream options (available via `this.options`)
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
- [ ] `pressedKey` not provided but beat requires key → treat as `'miss'` (no valid button press)

---

## Phase 3: Serialization Updates

### Task 3.1: Update BeatMapJSON Serialization
- [ ] Verify `BeatMapJSON` beats array type includes `requiredKey?: string`
- [ ] Update `toJSON()` to include `requiredKey` in beat mapping
- [ ] Update `fromJSON()` to restore `requiredKey` from JSON

### Task 3.2: Update SubdividedBeatMap Serialization (if applicable)
- [ ] Verify `SubdividedBeatMap.toJSON()` preserves `requiredKey` on beats
- [ ] Verify `SubdividedBeatMap.fromJSON()` restores `requiredKey` on beats
- [ ] Add `SubdividedBeatMapJSON` interface if not already present

### Task 3.3: Verify Interpolation Behavior
- [ ] Review `BeatInterpolator.ts` - interpolated beats start without `requiredKey` (expected)
- [ ] Keys are assigned after subdivision is complete, not during interpolation
- [ ] No changes needed - this is the intended behavior

### Task 3.4: Update BeatMapGenerator Serialization
- [ ] Verify `saveToFile()` and `loadFromFile()` handle `requiredKey` property
- [ ] Test round-trip serialization with required keys

---

## Phase 4: Helper Functions & Utilities

Create a new file: `src/core/analysis/beat/beatKeyHelpers.ts`

### Task 4.1: Create Key Assignment Helper
- [ ] Add `assignKeyToBeat<T extends BeatMap>(beatMap: T, beatIndex: number, key: string | null): T`
- [ ] Returns new beat map with updated beat (immutability)
- [ ] `null` key removes the required key
- [ ] Generic to work with `BeatMap`, `InterpolatedBeatMap`, `UnifiedBeatMap`, `SubdividedBeatMap`

### Task 4.2: Create Bulk Key Assignment Helper
- [ ] Add `assignKeysToBeats<T extends BeatMap>(beatMap: T, assignments: Array<{beatIndex: number, key: string | null}>): T`
- [ ] Efficient batch updates for chart creation
- [ ] Useful for UI "paint/brush" mode (future)

### Task 4.3: Create Key Map Extraction Helper
- [ ] Add `extractKeyMap(beatMap: BeatMap): Map<number, string>`
- [ ] Returns a map of beatIndex → requiredKey for beats that have keys
- [ ] Useful for serialization and UI display

### Task 4.4: Create Clear All Keys Helper
- [ ] Add `clearAllKeys<T extends BeatMap>(beatMap: T): T`
- [ ] Returns new beat map with all `requiredKey` properties removed
- [ ] Useful for resetting a chart

### Task 4.5: Export Helpers from index.ts
- [ ] Add exports to `src/core/analysis/beat/index.ts`
- [ ] Add exports to main `src/index.ts` if needed

---

## Phase 5: Documentation Updates

### Task 5.1: Update AUDIO_ANALYSIS.md
- [ ] Document the `requiredKey` property on Beat interface
- [ ] Add section on "Chart Creation" explaining required keys
- [ ] Document the new `wrongKey` accuracy type
- [ ] Update ButtonPressResult documentation with new fields
- [ ] Document how key matching works (string comparison, frontend responsibility)

### Task 5.2: Update DATA_ENGINE_REFERENCE.md
- [ ] Add `requiredKey` to Beat type reference
- [ ] Add `wrongKey` to BeatAccuracy type reference
- [ ] Document new ButtonPressResult fields
- [ ] Document `ignoreKeyRequirements` in BeatStreamOptions section
- [ ] Add example of creating a chart with required keys

### Task 5.3: Add Code Examples
- [ ] Example: Creating a simple 2-key chart
- [ ] Example: Checking button press with key validation
- [ ] Example: Using ignoreKeyRequirements to bypass key checking

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
- [ ] Test missing pressedKey when key required returns 'miss'

### Task 6.3: Unit Tests for Helpers
- [ ] Test assignKeyToBeat with valid key
- [ ] Test assignKeyToBeat with null (removes key)
- [ ] Test assignKeysToBeats batch assignment
- [ ] Test extractKeyMap returns correct map
- [ ] Test clearAllKeys removes all keys

### Task 6.4: Unit Tests for Serialization
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
- `pressedKey` parameter is optional in `checkButtonPress`

---

## Questions/Unknowns

### Resolved During Planning
- ~~Key set to support~~ → Fully configurable, any string value
- ~~Key validation~~ → No validation, simple string comparison
- ~~Wrong key handling~~ → New "wrongKey" accuracy type
- ~~Missing pressedKey when key required~~ → Returns `'miss'`
- ~~Data model approach~~ → Extend Beat interface directly
- ~~Chart storage format~~ → Extend existing BeatMap JSON
- ~~Interpolation key inheritance~~ → No inheritance, keys assigned after all processing
- ~~`ignoreKeyRequirements` location~~ → `BeatStreamOptions` (not AccuracyThresholds)
- ~~Helper function location~~ → New file `beatKeyHelpers.ts`

### To Resolve During Implementation
- [ ] Should there be a `clearAllKeys()` helper? (Added as Task 4.4)

---

## Success Criteria

### Type System
- [ ] Beat type has optional `requiredKey?: string` field
- [ ] `SubdividedBeat` inherits `requiredKey` from Beat
- [ ] `BeatAccuracy` type includes `'wrongKey'`
- [ ] `ButtonPressResult` includes `keyMatch`, `pressedKey`, `requiredKey` fields
- [ ] `BeatStreamOptions` includes `ignoreKeyRequirements?: boolean`

### BeatStream Integration
- [ ] BeatStream accepts `SubdividedBeatMap` as input
- [ ] `checkButtonPress(timestamp, pressedKey?)` validates key when required
- [ ] `ignoreKeyRequirements` in BeatStreamOptions bypasses key checking
- [ ] Missing `pressedKey` when key required returns `'miss'`

### Helper Functions
- [ ] `assignKeyToBeat()` works with all beat map types
- [ ] `assignKeysToBeats()` handles batch assignments
- [ ] `extractKeyMap()` returns correct key map
- [ ] `clearAllKeys()` removes all key assignments

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
- **Combo/Scoring System** - wrongKey would break combo (no combo system exists yet)

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
    extractKeyMap,
} from 'playlist-data-engine';

// Step 1-4: Create subdivided beat map (from subdivision plan)
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const interpolatedMap = interpolator.interpolate(beatMap);
const unifiedMap = unifyBeatMap(interpolatedMap);
const subdividedMap = subdivider.subdivide(unifiedMap, subdivisionConfig);

// Step 5: Assign required keys to create a chart
const chartMap = assignKeysToBeats(subdividedMap, [
    { beatIndex: 0, key: 'left' },
    { beatIndex: 1, key: 'down' },
    { beatIndex: 2, key: 'up' },
    { beatIndex: 3, key: 'right' },
    // ... more assignments
]);

// Step 6: Use in gameplay (key requirements enforced)
const beatStream = new BeatStream(chartMap, audioContext);

// Step 7: On player input (frontend maps physical input to string)
// Example: Player pressed keyboard arrow up
const result = beatStream.checkButtonPress(timestamp, 'up');
// result.accuracy: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey'
// result.keyMatch: true | false
// result.requiredKey: 'up' (from the beat)
// result.pressedKey: 'up' (what was passed in)

// Easy mode: ignore key requirements
const easyStream = new BeatStream(chartMap, audioContext, {
    ignoreKeyRequirements: true,  // Timing-only evaluation
});
```
