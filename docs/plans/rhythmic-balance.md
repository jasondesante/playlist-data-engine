# Rhythmic Balance Implementation Plan

## Overview

Add a **RhythmicBalancer** step between `CompositeStreamGenerator` and `DifficultyVariantGenerator` that enforces "rhythmic taste" rules on the natural composite stream. Also extend the density reduction in `DifficultyVariantGenerator` to factor in these same preferences when deciding which beats to remove.

### Motivation

The composite stream can have empty measures, lone upbeat notes without downbeat anchors, and no concept of strong vs weak beats within a measure during density reduction. These issues make charts feel "soulless" or "broken" to players who can't read rhythm well. This step ensures every chart has a solid rhythmic foundation — downbeats where players expect them, and density reduction that preserves structural beats over decorative ones.

### Design Principle

RhythmicBalancer takes a `CompositeStream` and returns a `CompositeStream` — same type, no new format. It simply adds or repositions beats to improve the natural composite before difficulty variants are generated from it.

### Time Signature Awareness

The pipeline currently hardcodes `% 4` in `isStrongBeat()`. The RhythmicBalancer (and the updated density reduction) must use the `unifiedBeatMap.downbeatConfig` to derive the correct grouping for any time signature.

**Metric grouping rules** — determined automatically from `beatsPerMeasure`:
- **Simple meter** (beatsPerMeasure not divisible by 3): group size = 2 (strong, weak, strong, weak, ...)
  - 4/4 → strong at positions 0, 2 (beats 1, 3)
  - 2/4 → strong at position 0 (beat 1)
- **Compound meter** (beatsPerMeasure divisible by 3): group size = 3 (strong, weak, weak, strong, weak, weak, ...)
  - 3/4 → strong at position 0 (beat 1)
  - 6/8 → strong at positions 0, 3 (beats 1, 4)
  - 9/8 → strong at positions 0, 3, 6 (beats 1, 4, 7)
  - 12/8 → strong at positions 0, 3, 6, 9 (beats 1, 4, 7, 10)

**How to get beatsPerMeasure at runtime**: For a given `beatIndex`, find the active `DownbeatSegment` from `unifiedBeatMap.downbeatConfig.segments`, then use `segment.timeSignature.beatsPerMeasure`. The `unifiedBeatMap.beats[beatIndex].measureNumber` and `beatInMeasure` are already correctly computed by `BeatMapGenerator.applyMeasureLabels()` for any time signature including mid-song changes.

**Important**: All measure grouping in the RhythmicBalancer and DifficultyVariantGenerator must use `unifiedBeatMap.beats[beatIndex].measureNumber` and `beatInMeasure` instead of computing `beatIndex % 4` manually.

## Current State

### Pipeline (RhythmGenerator.ts lines 1126–1131)
```
CompositeStreamGenerator.generate()  →  composite: CompositeStream
                                                       ↓
DifficultyVariantGenerator.generate()  →  easy/medium/hard/natural
```

After this change:
```
CompositeStreamGenerator.generate()  →  composite: CompositeStream
                                                       ↓
RhythmicBalancer.balance()           →  balancedComposite: CompositeStream  ← NEW
                                                       ↓
DifficultyVariantGenerator.generate()  →  easy/medium/hard/natural
```

### Existing isStrongBeat (DifficultyVariantGenerator.ts:1516)
Hardcoded to beats 1 and 3:
```typescript
private isStrongBeat(beatIndex: number): boolean {
    const positionInMeasure = beatIndex % 4;
    return positionInMeasure === 0 || positionInMeasure === 2;
}
```

### Existing calculateRemovalPriority (DifficultyVariantGenerator.ts:2135)
```typescript
// +0.3 for strong beat (isStrongBeat)
// +0.2 for downbeat (gridPosition === 0)
// +0.3 × intensity
// +0.05 × phrase significance (max +0.15)
// −0.1 for offbeat (gridPosition 1 or 3)
```

### Key Types
- `CompositeBeat extends GeneratedBeat` + `sourceBand: Band` (`Band = 'low' | 'mid' | 'high'`)
- `beatIndex` = quarter-note index (0-indexed). Measure position from `unifiedBeatMap.beats[beatIndex].beatInMeasure`
- `gridPosition`: 0=downbeat("1"), 1="e", 2="+", 3="a" (straight_16th); 0=downbeat, 1="+" (straight_8th)
- Beat creation pattern (from `createBeatsForEmptyIndex`): `band='mid'`, `sourceBand='mid'`, timestamp from `unifiedBeatMap.beats[beatIndex].timestamp`
- `UnifiedBeatMap.beats[]` has per-beat `measureNumber`, `beatInMeasure`, `isDownbeat`
- `UnifiedBeatMap.downbeatConfig.segments[]` has per-segment `timeSignature.beatsPerMeasure` (2–12)

---

## Phase 1: RhythmicBalancer Foundation

- [x] Task 1.1: Create `RhythmicBalanceConfig` interface
  - [x] 1.1.1: New file `src/core/analysis/beat/RhythmicBalancer.ts`
  - [x] 1.1.2: Interface with fields:
    - `strongBeatEmphasis: 'natural' | 'backbeat' | 'neutral'` (default `'natural'`) — which beats are "strong" for density reduction priority. Derives grouping from time signature (see "Time Signature Awareness" above):
      - `'natural'` — emphasize the natural metric accents (e.g., 4/4 → beats 1, 3; 9/8 → beats 1, 4, 7)
      - `'backbeat'` — emphasize the weak positions within each metric group (e.g., 4/4 → beats 2, 4; 9/8 → beats 2, 3, 5, 6, 8, 9)
      - `'neutral'` — no positional preference
    - `downbeatProximityRange: number` (default `2`) — max distance in quarter-note beats from an upbeat note to the nearest downbeat note. 0 = same beat only, 4 = same measure
    - `fillEmptyMeasures: boolean` (default `true`) — whether to fill empty measures with a beat on beat 1 downbeat
    - `addedBeatIntensity: number` (default `0.45`) — intensity for beats added by the balancer. Lower than detected beats so they're removable during density reduction if needed
  - [x] 1.1.3: Export default config constant `DEFAULT_RHYTHMIC_BALANCE_CONFIG`

- [x] Task 1.2: Create `RhythmicBalancer` class
  - [x] 1.2.1: Constructor accepts `RhythmicBalanceConfig` (optional, defaults to `DEFAULT_RHYTHMIC_BALANCE_CONFIG`)
  - [x] 1.2.2: `balance(composite: CompositeStream, unifiedBeatMap: UnifiedBeatMap): CompositeStream` — main entry point, returns new CompositeStream with updated beats array and metadata
  - [x] 1.2.3: Method order: `shiftLoneSubdivisionNotes()` → `fillEmptyMeasures()` → `enforceDownbeatProximity()`
  - [x] 1.2.4: Return value preserves `sections`, `naturalDifficulty`, `quarterNoteInterval`; updates `metadata.totalBeats`

- [x] Task 1.3: Add `rhythmicBalanceConfig` to `RhythmGeneratorConfig`
  - [x] 1.3.1: Add optional `rhythmicBalanceConfig?: RhythmicBalanceConfig` field to the config interface in `RhythmGenerator.ts`
  - [x] 1.3.2: Instantiate `RhythmicBalancer` in `RhythmGenerator` constructor

- [x] Task 1.4: Wire into pipeline
  - [x] 1.4.1: Call `rhythmicBalancer.balance(composite, unifiedBeatMap)` after composite generation (line ~1126) and before difficulty variants (line ~1131)
  - [x] 1.4.2: Pass the balanced composite to `generateDifficultyVariants()`
  - [x] 1.4.3: Pass `rhythmicBalanceConfig` (or just `strongBeatEmphasis`) to `DifficultyVariantGenerator` for density reduction awareness

---

## Phase 2: Measure Coverage (Rules 1 & 2)

Rules: Every measure needs at least 1 beat, and if it has exactly 1 beat, that beat must be on a downbeat.

- [x] Task 2.1: Implement `shiftLoneSubdivisionNotes()`
  - [x] 2.1.1: Group beats by measure using `unifiedBeatMap.beats[beatIndex].measureNumber` (not `beatIndex % 4` — supports any time signature)
  - [x] 2.1.2: For each measure with exactly 1 beat where `gridPosition !== 0`, create a replacement beat at the same `beatIndex` with `gridPosition = 0`
  - [x] 2.1.3: Preserve the original beat's `intensity`, `band`, `sourceBand`, `gridType` — only change `gridPosition` and recalculate `timestamp`
  - [x] 2.1.4: Recalculate timestamp: `unifiedBeatMap.beats[beatIndex].timestamp + (0 * interval)` = just the beat start (gridPosition 0 is always the quarter-note position regardless of grid type)
  - [x] 2.1.5: Replace the original beat in the array with the shifted beat

- [x] Task 2.2: Implement `fillEmptyMeasures()`
  - [x] 2.2.1: Determine the measure range from `unifiedBeatMap`: iterate `unifiedBeatMap.beats[]` to find min/max `measureNumber`
  - [x] 2.2.2: For each measure with 0 beats, find the downbeat beatIndex by scanning `unifiedBeatMap.beats[]` for the beat where `measureNumber === targetMeasure && isDownbeat === true`
  - [x] 2.2.3: Create a new `CompositeBeat` at that beatIndex with `gridPosition = 0`
  - [x] 2.2.4: Use `config.addedBeatIntensity` for intensity, `band = 'mid'`, `sourceBand = 'mid'`
  - [x] 2.2.5: Derive timestamp from `unifiedBeatMap.beats[beatIndex].timestamp`
  - [x] 2.2.6: Determine grid type from neighbor context (check adjacent measures for an existing beat's grid type), fall back to `straight_8th`
  - [x] 2.2.7: Guard: skip if no downbeat beat exists in unifiedBeatMap for that measure (track may not extend that far)

- [x] Task 2.3: Tests for measure coverage
  - [x] 2.3.1: Test that a measure with a lone "e" (gridPosition 1) note gets shifted to downbeat (gridPosition 0)
  - [x] 2.3.2: Test that a measure with a lone "+" (gridPosition 2) note gets shifted to downbeat
  - [x] 2.3.3: Test that a measure with a lone downbeat is left unchanged
  - [x] 2.3.4: Test that an empty measure gets a new beat on beat 1's downbeat
  - [x] 2.3.5: Test that a measure with 2+ beats is not modified by shift rules
  - [x] 2.3.6: Test edge case: track doesn't extend to end of last measure (partial final measure)

---

## Phase 3: Downbeat Proximity (Rule 5)

Rule: Upbeat/subdivision notes need a downbeat note within a configurable range. If no downbeat is nearby, the upbeat note is shifted to the downbeat of its beat index.

- [x] Task 3.1: Implement `enforceDownbeatProximity()`
  - [x] 3.1.1: Build a `Set<number>` of all beat indices that have at least one downbeat (any beat with `gridPosition === 0`)
  - [x] 3.1.2: For each beat where `gridPosition !== 0`, search beat indices in `[beatIndex - range, beatIndex + range]` for a downbeat presence
  - [x] 3.1.3: If no downbeat found in range, create a replacement beat at the same `beatIndex` with `gridPosition = 0`, preserving `intensity`, `band`, `sourceBand`, `gridType`
  - [x] 3.1.4: Recalculate timestamp from `unifiedBeatMap.beats[beatIndex].timestamp`
  - [x] 3.1.5: Replace the original beat in the array

- [x] Task 3.2: Tests for downbeat proximity
  - [x] 3.3.1: Test range=0: upbeat note with downbeat in same beatIndex (gridPosition 0 already present) is kept as-is
  - [x] 3.3.2: Test range=0: upbeat note with no downbeat in same beatIndex is shifted
  - [x] 3.3.3: Test range=2: upbeat note with downbeat 1 beat away is kept
  - [x] 3.3.4: Test range=2: upbeat note with nearest downbeat 3 beats away is shifted
  - [x] 3.3.5: Test range=4: upbeat note with downbeat in same measure is kept
  - [x] 3.3.6: Test that a downbeat note (gridPosition 0) is never shifted regardless of proximity

---

## Phase 4: Strong Beat Emphasis in Density Reduction (Rules 3 & 4)

The density reducer needs to know which beats are structurally important and prefer keeping them.

- [x] Task 4.1: Pass rhythmic balance config to DifficultyVariantGenerator
  - [x] 4.1.1: Add optional `rhythmicBalanceConfig?: RhythmicBalanceConfig` to `DifficultyVariantConfig`
  - [x] 4.1.2: Thread it through from `RhythmGenerator.generateDifficultyVariants()` to the `DifficultyVariantGenerator` constructor or `generate()` call
  - [x] 4.1.3: DifficultyVariantGenerator needs access to `unifiedBeatMap.downbeatConfig` to resolve `beatsPerMeasure` per segment — it already receives `unifiedBeatMap` in `generate()`

- [x] Task 4.2: Make `isStrongBeat()` time-signature-aware
  - [x] 4.2.1: Create helper `getMetricGroupSize(beatsPerMeasure: number): number` — returns 3 if `beatsPerMeasure % 3 === 0`, otherwise 2
  - [x] 4.2.2: Create helper `isMetricStrongBeat(beatInMeasure: number, groupSize: number): boolean` — returns `true` if `beatInMeasure % groupSize === 0`
  - [x] 4.2.3: Create helper `isMetricWeakBeat(beatInMeasure: number, groupSize: number): boolean` — returns `true` if `beatInMeasure % groupSize !== 0`
  - [x] 4.2.4: Replace `isStrongBeat(beatIndex)` with `isStrongBeat(beatIndex, beatsPerMeasure)`:
    - `'natural'` → uses `isMetricStrongBeat(beatInMeasure, groupSize)` (auto-derived from time signature)
    - `'backbeat'` → uses `isMetricWeakBeat(beatInMeasure, groupSize)`
    - `'neutral'` → return `false` for all (no strong/weak distinction)
  - [x] 4.2.5: Resolve `beatsPerMeasure` from `unifiedBeatMap.downbeatConfig.segments` for the given `beatIndex`'s segment
  - [x] 4.2.6: Default to `'natural'` with 4 beats per measure when no config provided (backwards compatible)

- [x] Task 4.3: Extend `calculateRemovalPriority()` with structural importance
  - [x] 4.3.1: Add bonus for beats that are the **only downbeat in their measure**: these are the most structurally important and should get the highest protection (e.g., +0.2)
  - [x] 4.3.2: To check this efficiently, build a `Map<number, number>` of `measureNumber → downbeatCount` once before the priority loop. Use `unifiedBeatMap.beats[beatIndex].measureNumber` (not `Math.floor(beatIndex / 4)`) to support any time signature
  - [x] 4.3.3: The existing `+0.3 strong beat bonus` and `+0.2 downbeat bonus` remain; the new `+0.2 only-downbeat-in-measure bonus` stacks on top
  - [x] 4.3.4: In `'neutral'` mode, the `+0.3 strong beat bonus` is zeroed out but downbeat and only-downbeat bonuses still apply

- [ ] Task 4.4: Tests for density reduction with strong beat emphasis
  - [ ] 4.4.1: Test `'natural'` mode in 4/4: when reducing density, beats on positions 0 and 2 are preserved over positions 1 and 3
  - [ ] 4.4.2: Test `'backbeat'` mode in 4/4: when reducing density, beats on positions 1 and 3 are preserved over positions 0 and 2
  - [ ] 4.4.3: Test `'natural'` mode in 9/8: when reducing density, beats on positions 0, 3, 6 are preserved (groups of 3)
  - [ ] 4.4.4: Test `'backbeat'` mode in 9/8: when reducing density, beats on positions 1, 2, 4, 5, 7, 8 are preserved
  - [ ] 4.4.5: Test `'neutral'` mode: no positional preference, only downbeat and only-downbeat bonuses apply
  - [ ] 4.4.6: Test that the only downbeat in a measure is always preserved (highest priority)
  - [ ] 4.4.7: Test backwards compatibility: no config provided → behaves as current `'natural'` with 4/4

---

## Phase 5: Integration Tests

- [ ] Task 5.1: End-to-end test — empty measures
  - [ ] 5.1.1: Create a composite stream with several empty measures
  - [ ] 5.1.2: Run `RhythmicBalancer.balance()` and verify every measure has at least 1 beat on beat 1

- [ ] Task 5.2: End-to-end test — lone upbeats and proximity
  - [ ] 5.2.1: Create a composite with measures containing lone subdivision notes
  - [ ] 5.2.2: Run balancer and verify subdivision notes are shifted to downbeats
  - [ ] 5.2.3: Create a composite with upbeat notes far from any downbeat, verify they're shifted

- [ ] Task 5.3: End-to-end test — density reduction respects emphasis
  - [ ] 5.3.1: Generate a hard natural composite, apply rhythmic balance, then generate easy variant with `'backbeat'` emphasis in 4/4
  - [ ] 5.3.2: Verify that the remaining beats after reduction are biased toward positions 1 and 3 within measures
  - [ ] 5.3.3: Repeat with `'natural'` and verify bias toward positions 0 and 2

- [ ] Task 5.4: End-to-end test — non-4/4 time signatures
  - [ ] 5.4.1: Create a composite in 9/8 time (9 beats per measure), apply rhythmic balance, verify empty measures get filled on beat 1's downbeat using `measureNumber` from unifiedBeatMap
  - [ ] 5.4.2: Generate easy variant with `'natural'` emphasis in 9/8, verify beats at positions 0, 3, 6 are preserved over positions 1, 2, 4, 5, 7, 8
  - [ ] 5.4.3: Generate easy variant with `'backbeat'` emphasis in 9/8, verify the opposite bias
  - [ ] 5.4.4: Test mid-song time signature change (4/4 → 9/8) — verify each segment uses the correct grouping

---

## Phase 6: Documentation Updates

- [ ] Task 6.1: Update DATA_ENGINE_REFERENCE.md
  - [ ] 6.1.1: Add RhythmicBalancer section describing the post-composite balancing step
  - [ ] 6.1.2: Update the pipeline diagram to show the new step
  - [ ] 6.1.3: Document `RhythmicBalanceConfig` fields with defaults and examples
  - [ ] 6.1.4: Update `DifficultyVariantConfig` to document `rhythmicBalanceConfig` and its effect on `isStrongBeat()` and `calculateRemovalPriority()`

- [ ] Task 6.2: Update BEAT_DETECTION.md
  - [ ] 6.2.1: Update the procedural rhythm generation pipeline diagram to include RhythmicBalancer

---

## Dependencies

- Phase 1 must complete before Phases 2, 3, 4, 5 (foundation)
- Phases 2 and 3 are independent of each other (different rules, both modify the composite)
- Phase 4 is independent of Phases 2 and 3 (operates on DifficultyVariantGenerator, not RhythmicBalancer)
- Phase 5 depends on all implementation phases (1–4)
- Phase 6 depends on Phase 5 (docs reflect final code)

## Resolved Decisions

- **Grid type for added beats**: Neighbor context, fall back to `straight_8th`. A single downbeat at position 0 has the same timestamp regardless of grid type — the type mainly matters for the grid lock step later.
- **Cascading proximity shifts**: Single pass only — the downbeat index set is built once from original state before processing.
- **Interaction with enhance path**: No changes needed — `distributeBeatsAcrossIndices()` already prefers gridPosition 0 when creating beats for empty indices.
- **Time signature awareness**: All measure grouping uses `unifiedBeatMap.beats[beatIndex].measureNumber` and `beatInMeasure` (not `beatIndex % 4`). Metric grouping auto-derived from `beatsPerMeasure`: divisible by 3 → groups of 3 (compound meter), otherwise groups of 2 (simple meter). The `strongBeatEmphasis` config uses `'natural' | 'backbeat' | 'neutral'` where `'natural'` and `'backbeat'` are time-signature-aware.
