# Tempo Section Detection with Gravity Wells

## Overview

Enhance `BeatInterpolator` to detect and handle multiple distinct tempo sections within a single track. When 2+ clusters of detected beats have conflicting tempos (>10% difference), each cluster forms a "gravity well" that influences interpolation within its time range. Sections have hard boundaries — no morphing/blending between tempos.

---

## ⚠️ CORE PRINCIPLE: Don't Get In The Way

**This feature must be conservative.** It should only activate when there's undeniable evidence of a sudden tempo change. The default is ALWAYS gradual drift.

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEFAULT BEHAVIOR                            │
│                                                                 │
│   Gradual drift handles tempo changes automatically.            │
│   Beats push/pull tempo, tempo coasts between beats.            │
│   This works for 99% of tracks.                                 │
│                                                                 │
│              DON'T INTERFERE WITH THIS.                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               ONLY ACTIVATE WHEN:                                │
│                                                                 │
│   1. Two clusters at >10% different tempos AND                  │
│   2. NO connecting beats showing gradual drift AND              │
│   3. Crossing point gap is >10%                                 │
│                                                                 │
│   All three conditions must be true. Otherwise, stay out.       │
└─────────────────────────────────────────────────────────────────┘
```

**The feature is lazy.** It waits until it's absolutely needed. It doesn't go looking for problems.

---

## Clarified Decisions

These decisions were clarified through design review:

| Topic | Decision |
|-------|----------|
| **Opt-in multi-tempo** | Pass `enableMultiTempo: true` option to `interpolate()` to auto-apply if detected |
| **Normal analysis output** | `detectedClusterTempos: number[]` (e.g., [128, 140]) + `hasMultipleTempos: boolean` |
| **Multi-tempo re-analysis output** | Full `TempoSection[]` with boundaries + re-interpolated beats |
| **Thresholds** | Independent - keep `denseSectionMinBeats=3`, add separate `minClusterBeats=4` |
| **Single beat between clusters** | Use phase alignment to determine which section it belongs to |
| **Gap interpolation** | Use crossing paths strategy - interpolate forwards from C1, backwards from C2, find meeting point |
| **Downbeats** | Out of scope - handled elsewhere in the codebase |
| **Crossing gap threshold** | Same 10% as tempo threshold (not absolute ms) |
| **Octave multiples** | Filter them out (60 BPM vs 120 BPM = same tempo, not a section) |
| **Short tracks** | Beat count only (4+ beats required), no minimum duration |
| **Phase alignment** | Binary in/out of tolerance check |
| **Interpolation reuse** | Extract helpers from `interpolateAdaptivePhaseLocked()` |
| **Re-interpolation scope** | Partial - only re-interpolate boundary regions until hitting detected beats |
| **Section limit** | No limit, but extremely rare to have many |
| **Implementation approach** | Full implementation (all 8 phases, starting with Phase 0 drift helper extraction) |

## Key Concepts

- **Tempo Cluster**: 4+ consecutive detected beats (no interpolated gaps) with consistent intervals
- **Gravity Well**: A valid tempo cluster with its own interpolation tempo that pulls nearby beats toward its grid
- **Section Boundary**: The point where beats switch from one cluster's gravity to another's
- **Backward Interpolation**: Once clusters are identified, work backwards from each cluster to determine which tempo governs the beats in between

## Two Types of Tempo Change

| Type | Cause | How to Detect |
|------|-------|---------------|
| **Gradual drift** | Individual beats slightly push/pull tempo | Interpolate forwards + backwards with drift → they **meet** (gap < 10%) |
| **Hard section change** | Tempo jumped suddenly (not enough beats to drift gradually) | Interpolate forwards + backwards with drift → they **don't meet** (gap > 10%) |

**Both types use the same drift-based interpolation.** The difference is whether drift could bridge the gap or not.

## The "Crossing Paths" Boundary Strategy

**Clusters are just endpoints.** The detected beats BETWEEN clusters are the evidence of whether tempo drifted gradually or jumped suddenly.

```
Cluster 1 (128 BPM)       Connecting Beats (evidence)      Cluster 2 (140 BPM)
       │                        │    │    │    │                 │
       ▼                        ▼    ▼    ▼    ▼                 ▼
   Beat Beat Beat  →  130→132→135→138→139  →  Beat Beat Beat
       │                 (gradual drift)                     │
       │                                                      │
       └────────────────── SAME SECTION ─────────────────────┘
                          (drift bridged the gap)


Cluster 1 (128 BPM)       Gap (no evidence)          Cluster 2 (140 BPM)
       │                     │    │                        │
       ▼                     ▼    ▼                        ▼
   Beat Beat Beat  →  [silence or sparse beats]  →  Beat Beat Beat
       │                  (no drift path)                  │
       │                                                      │
       └────────────── TWO SECTIONS ─────────────────────────┘
                     (boundary at crossing point)
```

**Algorithm**:
1. Detect clusters at different tempos (endpoints)
2. Look at detected beats BETWEEN clusters (the evidence)
3. Interpolate forwards through connecting beats WITH drift
4. Interpolate backwards through connecting beats WITH drift
5. At crossing point, measure the gap
6. **If gap < threshold** → drift bridged it → single section
7. **If gap > threshold** → sudden jump → two sections with boundary

**Key insight**: Two clusters at 128 BPM and 140 BPM don't automatically create a boundary. Only if there's NO evidence of gradual drift between them (missing beats, sparse detection, sudden phase jump) do we create a section boundary.

## Triggers for Multi-Tempo Mode

**All three conditions must be true. This is a high bar intentionally.**

Multi-tempo logic ONLY activates when:
1. 2+ valid tempo clusters exist (≥4 consecutive detected beats each)
2. Clusters have >10% tempo difference (configurable via `tempoSectionThreshold`)
3. **Crossing point check fails** — drift cannot bridge the gap between clusters

If any condition is false, the feature does nothing and lets drift handle it.

## Phase 0: Extract Drift Helpers (Prerequisite)

**Extract existing drift logic into reusable helpers before implementing crossing paths strategy.**

- [ ] Add `interpolateForwardsWithDrift()` helper
  - [ ] Extract core drift logic from `interpolateAdaptivePhaseLocked()`
  - [ ] Parameters: `startAnchor`, `initialTempo`, `connectingBeats`, `adaptationRate`
  - [ ] Generate beat timestamps with tempo evolving via drift
  - [ ] Return `{ finalTempo, beatPositions }` at the "end" of forwards interp
  - [ ] Refactor `interpolateAdaptivePhaseLocked()` to use this helper internally

- [ ] Add `interpolateBackwardsWithDrift()` helper
  - [ ] Same drift logic as forwards, but working backwards from anchor
  - [ ] Parameters: `endAnchor`, `initialTempo`, `connectingBeats`, `adaptationRate`
  - [ ] Each detected beat encountered can push/pull tempo (in reverse)
  - [ ] Generate beat timestamps working backwards through connecting beats
  - [ ] Return `{ finalTempo, beatPositions }` at the "start" of backwards interp

- [ ] Add `DriftInterpolationResult` type
  - [ ] `finalTempo: number` — tempo at the end of interpolation
  - [ ] `beatPositions: number[]` — generated beat timestamps
  - [ ] `phaseError: number` — accumulated phase offset

**Why this phase first?**
- Crossing paths strategy needs both forwards and backwards drift
- Refactoring existing code makes it testable in isolation
- Cleaner separation of concerns for Phase 3 implementation

## Phase 1: Types & Configuration

- [ ] Add `TempoSection` interface to `BeatMap.ts`
  - [ ] `start: number` — section start time in seconds
  - [ ] `end: number` — section end time in seconds
  - [ ] `bpm: number` — tempo for this section
  - [ ] `intervalSeconds: number` — quarter note interval
  - [ ] `beatCount: number` — number of detected beats in cluster
  - [ ] `startBeatIndex: number` — index of first beat in cluster
  - [ ] `endBeatIndex: number` — index of last beat in cluster

- [ ] Add `TempoCluster` internal interface to `BeatInterpolator.ts`
  - [ ] Extends `DenseSection` with tempo-specific fields
  - [ ] `bpm: number`
  - [ ] `isVerified: boolean` — has enough beats to be valid

- [ ] Add new `BeatInterpolationOptions` fields
  - [ ] `tempoSectionThreshold?: number` — tempo difference threshold (default: 0.1 = 10%)
  - [ ] `minClusterBeats?: number` — minimum beats for valid cluster (default: 4)
  - [ ] `enableMultiTempo?: boolean` — if true + hasMultipleTempos detected, runs crossing paths analysis

- [ ] Update `InterpolationMetadata` type
  - [ ] `detectedClusterTempos?: number[]` — tempos found during normal analysis (e.g., [128, 140])
  - [ ] `hasMultipleTempos: boolean` — quick flag for checking if multi-tempo re-analysis is available
  - [ ] `tempoSections?: TempoSection[]` — full section data (only after multi-tempo re-analysis)
  - [ ] `hasMultiTempoApplied?: boolean` — true only after multi-tempo re-analysis completes

## Phase 2: Cluster Detection

- [ ] Add `identifyTempoClusters()` method
  - [ ] Build on `identifyDenseSections()` output
  - [ ] Group dense sections by tempo similarity (within `tempoSectionThreshold`)
  - [ ] Merge adjacent sections with similar tempo into clusters
  - [ ] Filter clusters by `minClusterBeats` (default: 4)
  - [ ] Return `TempoCluster[]` with verified clusters only

- [ ] Add `findConflictingClusters()` method
  - [ ] Take `TempoCluster[]` as input
  - [ ] Check if any 2 clusters have >`tempoSectionThreshold` tempo difference
  - [ ] Return `null` if no conflict (single-tempo track)
  - [ ] Return cluster pairs with conflicts

- [ ] Add `isOctaveMultiple()` helper ✓ CONFIRMED NEEDED
  - [ ] Check if tempoA is ~0.5x or ~2x tempoB (within 10% tolerance)
  - [ ] Used to filter out false "conflicts" (actually same tempo, different octave)
  - [ ] Example: 60 BPM and 120 BPM should NOT create separate sections
  - [ ] Implementation:
    ```typescript
    function isOctaveMultiple(tempoA: number, tempoB: number, tolerance: number = 0.1): boolean {
      const ratios = [0.5, 2];  // half, double (actual octave multiples)
      const actualRatio = tempoA / tempoB;
      return ratios.some(r => Math.abs(actualRatio - r) <= tolerance);
    }
    ```

## Phase 3: Section Boundary Detection (Crossing Paths Strategy)

**Key insight**: The detected beats BETWEEN clusters are the evidence. We interpolate through those beats with drift to see if they bridge the gap.

- [ ] Add `findCrossingPoint()` method — core boundary detection
  - [ ] Input: two adjacent tempo clusters + the detected beats BETWEEN them
  - [ ] If NO beats between clusters → automatic boundary (no evidence of drift)
  - [ ] If beats exist between clusters:
    - [ ] Use `interpolateForwardsWithDrift()` from Phase 0 through connecting beats
    - [ ] Use `interpolateBackwardsWithDrift()` from Phase 0 through connecting beats
    - [ ] At crossing point, measure gap between forward and backward positions
    - [ ] If gap < `tempoSectionThreshold` → drift bridged it → no boundary
    - [ ] If gap > `tempoSectionThreshold` → sudden jump → return boundary timestamp

- [ ] Add `measureGapAtCrossing()` helper
  - [ ] Compare forwards and backwards interpolation results at crossing point
  - [ ] Calculate gap as percentage of tempo (not absolute ms)
  - [ ] Return gap ratio (e.g., 0.15 = 15% gap)

- [ ] Add `assignBeatsToSections()` method
  - [ ] For each detected beat between clusters:
    - [ ] Check phase alignment with Cluster 1's grid
    - [ ] Check phase alignment with Cluster 2's grid
    - [ ] Assign to cluster with better alignment
  - [ ] Beats assigned to C1 → Section 1, beats assigned to C2 → Section 2

- [ ] Add `calculatePhaseAlignment()` helper ✓ CLARIFIED: Binary tolerance
  - [ ] Given beat timestamp and cluster (anchor + tempo)
  - [ ] Check if beat falls within tolerance of expected grid position
  - [ ] Return 1 if aligned (within tolerance), 0 if not
  - [ ] Implementation:
    ```typescript
    function calculatePhaseAlignment(
      beatTimestamp: number,
      clusterAnchor: number,
      clusterInterval: number,
      tolerance: number = 0.1  // 10% of interval
    ): number {
      const expectedPosition = clusterAnchor +
        (Math.round((beatTimestamp - clusterAnchor) / clusterInterval) * clusterInterval);
      const offset = Math.abs(beatTimestamp - expectedPosition);
      return offset <= (clusterInterval * tolerance) ? 1 : 0;
    }
    ```
  - [ ] Used by `assignBeatsToSections()` to determine which cluster a beat belongs to

## Phase 4: Analysis Flow with Multi-Tempo Option

### API Design

Multi-tempo is controlled via `BeatInterpolationOptions`:

```typescript
interface BeatInterpolationOptions {
  // ... existing options
  enableMultiTempo?: boolean;  // If true + hasMultipleTempos detected, runs crossing paths analysis
}
```

### Normal Analysis (Default Behavior)

When `enableMultiTempo` is false or undefined:

```
interpolate(beatMap, { enableMultiTempo: false })
├─ Run existing single-tempo flow (unchanged)
│  ├─ detectQuarterNote()
│  ├─ analyzeGaps()
│  ├─ generateGrid()
│  └─ mergeBeats()
├─ Quick cluster detection (just group beats by interval - cheap)
├─ NO crossing path analysis (expensive - only runs if enabled)
└─ Return InterpolatedBeatMap with:
   ├─ mergedBeats: single-tempo interpolation (as before)
   └─ metadata.detectedClusterTempos: [128, 140]  ← UI shows "Multi-tempo detected"
      metadata.hasMultipleTempos: true
      metadata.hasMultiTempoApplied: false
```

**UI sees `hasMultipleTempos: true && hasMultiTempoApplied: false` → Shows "Re-analyze with Multi-Tempo" button**

### Multi-Tempo Analysis (Opt-In)

When `enableMultiTempo: true`:

```
interpolate(beatMap, { enableMultiTempo: true })
├─ Run normal analysis flow first
├─ Check if hasMultipleTempos detected
│  ├─ If false → return single-tempo result (no extra work)
│  └─ If true → continue to multi-tempo analysis:
├─ Run crossing path analysis (forwards/backwards interpolation)
├─ Determine exact section boundaries
├─ Re-interpolate boundary regions only
└─ Return InterpolatedBeatMap with:
   ├─ mergedBeats: per-section interpolation applied
   ├─ metadata.tempoSections: TempoSection[] (full data with boundaries)
   └─ metadata.hasMultiTempoApplied: true
```

### Why Opt-In via Option?

- **One-pass or two-pass** - Consumer can choose single-pass (`enableMultiTempo: true`) or two-pass (check `hasMultipleTempos`, then re-call)
- **No wasted CPU** - crossing path analysis only runs when explicitly enabled
- **Consumer decides** - UI can show detected tempos, let user choose whether to apply
- **Conservative** - default behavior is unchanged for 99% of tracks

### Implementation Tasks

- [ ] Add `enableMultiTempo?: boolean` to `BeatInterpolationOptions` (Phase 1)

- [ ] Modify `interpolate()` method
  - [ ] Run existing flow unchanged
  - [ ] After merge, call `identifyTempoClusters()` (quick grouping only)
  - [ ] Extract cluster tempos into array
  - [ ] Store in `metadata.detectedClusterTempos: number[]`
  - [ ] Set `metadata.hasMultipleTempos = tempos.length > 1`
  - [ ] If `enableMultiTempo && hasMultipleTempos`:
    - [ ] Run crossing path analysis (expensive part)
    - [ ] Determine exact section boundaries
    - [ ] For each boundary:
      - [ ] Interpolate forwards from Cluster 1's last detected beat
      - [ ] Interpolate backwards from Cluster 2's first detected beat
      - [ ] Find crossing point → hard boundary
      - [ ] Replace only boundary region in `mergedBeats`
    - [ ] Store full `TempoSection[]` in metadata
    - [ ] Set `hasMultiTempoApplied = true`
  - [ ] Return beat map

- [ ] Add `canApplyMultiTempo(beatMap: InterpolatedBeatMap)` helper
  - [ ] Check if `hasMultipleTempos` is true
  - [ ] Check if `hasMultiTempoApplied` is already true
  - [ ] Return boolean - used by UI to show/hide the re-analysis button

## Phase 5: Output & Metadata

- [ ] Update `InterpolatedBeatMap` structure
  - [ ] Add `detectedClusterTempos?: number[]` — populated by normal analysis
  - [ ] Add `tempoSections?: TempoSection[]` — populated by multi-tempo re-analysis
  - [ ] Keep `quarterNoteBpm` as primary tempo (first/largest section)

- [ ] Update `interpolationMetadata` population (Normal Analysis)
  - [ ] Include `detectedClusterTempos` array
  - [ ] Set `hasMultipleTempos` flag
  - [ ] `tempoSections` remains undefined until multi-tempo re-analysis

- [ ] Update `interpolationMetadata` population (Multi-Tempo Re-Analysis)
  - [ ] Populate full `tempoSections` array with boundaries
  - [ ] Set `hasMultiTempoApplied = true`

- [ ] Update `toJSON()` / `fromJSON()` static methods
  - [ ] Serialize/deserialize `detectedClusterTempos`
  - [ ] Serialize/deserialize `tempoSections`

## Phase 6: Documentation

- [ ] Update `DATA_ENGINE_REFERENCE.md`
  - [ ] Add `TempoSection` type to types reference
  - [ ] Document new `BeatInterpolationOptions` fields (`tempoSectionThreshold`, `minClusterBeats`)
  - [ ] Add `tempoSections` field to `InterpolatedBeatMap` output
  - [ ] Document the "tempo gravity" behavior and when it activates

- [ ] Update `docs/AUDIO_ANALYSIS.md`
  - [ ] Add section on multi-tempo detection
  - [ ] Explain the "crossing paths" boundary strategy
  - [ ] Document the three conditions for multi-tempo activation
  - [ ] Add examples of gradual drift vs sudden tempo change

## Phase 7: Debug & Testing

- [ ] Update `beatInterpolationDebug.ts`
  - [ ] Add section boundary visualization
  - [ ] Show per-section tempo in debug report
  - [ ] Add `TempoSectionDebugInfo` type

- [ ] Add test cases to `beatInterpolator.test.ts`
  - [ ] **Two clusters with gradual drift between** — 128 BPM cluster → connecting beats showing drift → 140 BPM cluster, should NOT trigger sections
  - [ ] **Two clusters with gap between** — 128 BPM cluster → sparse/missing beats → 140 BPM cluster, SHOULD trigger sections
  - [ ] **Gradual tempo drift** — tempo drifts 5% over track, should NOT trigger sections
  - [ ] **Single tempo track** — no multi-tempo activation, behaves exactly as before
  - [ ] **Two distinct tempo sections with clear boundary** — SHOULD trigger sections with hard boundary
  - [ ] **Three tempo sections** — multiple boundaries detected correctly
  - [ ] **Octave-related tempos (half/double)** — 60 BPM → 120 BPM, should NOT trigger sections (filtered by `isOctaveMultiple`)
  - [ ] **Short cluster** — 3 beats at 128 BPM → 4 beats at 140 BPM, should NOT trigger (cluster needs 4+ beats)
  - [ ] **Cluster with gaps** — should NOT trigger (must be consecutive detected beats)
  - [ ] **Single beat between clusters** — verify phase alignment assigns to correct section
  - [ ] **Very short track** — 8 beats total (4 at each tempo), SHOULD trigger (beat count only, no minimum duration)

- [ ] Add test helper functions
  - [ ] `createMultiTempoBeats(tempos: {bpm, duration}[])`
  - [ ] `assertTempoSections(result, expectedSections)`

## Dependencies

- Existing `identifyDenseSections()` — foundation for cluster detection
- Existing `interpolateAdaptivePhaseLocked()` — will be refactored in Phase 0 to extract drift helpers
- `QuarterNoteDetection` type — may need extension for multi-tempo

## Questions/Unknowns

### ✓ Resolved

- **API design**: Use `enableMultiTempo` option on `interpolate()` method (not a separate method). Allows single-pass or two-pass workflow.

- **Opt-in multi-tempo**: Normal analysis detects clusters and returns tempos, multi-tempo analysis (opt-in via option) runs crossing paths + applies interpolation.

- **Extrapolation at boundaries**: If extrapolating before first cluster, use first cluster's tempo. After last cluster, use last cluster's tempo. Confirmed in Phase 4.

- **Empty regions between sections**: Use the crossing point as the boundary — everything before belongs to Section 1, everything after belongs to Section 2.

- **Gap measurement**: Gap at crossing point measured as percentage of tempo (same 10% threshold), not absolute ms. If tempo is 500ms/beat and gap is 50ms, that's 10%.

- **Octave multiples**: Filter them out via `isOctaveMultiple()` - only 0.5x and 2x ratios (half/double), NOT triplets (0.33x/3x).

- **Phase 0 prerequisite**: Extract drift helpers from `interpolateAdaptivePhaseLocked()` before implementing crossing paths strategy.

- **Single beat between clusters**: Use phase alignment to determine which section it belongs to.

- **Re-interpolation scope**: Partial - only boundary regions, not entire track.

### Open Questions

- **None currently** - all major design questions have been resolved.

## Success Criteria

1. ⚠️ **DON'T GET IN THE WAY** — gradual drift still works for 99% of tracks
2. **Gradual drift still works** — tracks with slowly evolving tempo are NOT split into sections
3. Single-tempo tracks work exactly as before (no regression)
4. Multi-tempo tracks show distinct sections with clear boundaries
5. Each section uses its own tempo for interpolation (no morphing at boundaries)
6. Debug output clearly shows section boundaries and tempos
7. All existing tests pass + new multi-tempo tests pass

**If this feature activates on tracks where gradual drift would have worked, it's a bug.**
