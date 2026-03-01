# Beat Interpolation Implementation Plan

## Overview

Add beat interpolation capability as a **post-processing analysis pass** that runs AFTER the BeatMap is generated but BEFORE the BeatStream is created. This pass analyzes the entire BeatMap to determine the quarter note interval, identify anomalies, and generate interpolated beats to fill gaps where detected beats are on the grid but not at quarter-note intervals.

**Research Intent**: This implementation includes 3 selectable approaches for experimentation and comparison to determine which works best.

---

## Requirements Summary

### Must Have
- [ ] Detect quarter note interval using **dense section priority** (weight intervals from sections with consistent beat detection higher than sparse sections)
- [ ] Implement **Pace + Anchors model**: pace sets grid spacing, anchors validate and override
- [ ] Generate complete beat grid from first detected beat
- [ ] Detected beats override interpolated beats at same positions
- [ ] Two output streams: `detectedBeats[]` (original) and `mergedBeats[]` (interpolated + detected override)
- [ ] Mark all beats with `source: 'detected' | 'interpolated'` field
- [ ] Extrapolate grid from edges (before first / after last detected beat)

### Should Have
- [ ] **Trust the grid** for silent sections: if surrounding anchors align, interpolate through with full confidence
- [ ] **Equal confidence** for all beats in a validated gap (no decay based on distance)
- [ ] Confidence based on: grid alignment (50%), anchor confidence (30%), pace confidence (20%)
- [ ] Anomaly detection: distinguish single unusual intervals from consistent patterns
- [ ] Anchor-point tempo adaptation (slight drift correction at each detected beat)
- [ ] All 3 interpolation algorithms selectable for research/comparison

### Future Enhancement
- [ ] Section-based tempo change detection (distinct tempo sections)
- [ ] Multi-phase optimization for better grid alignment
- [ ] Kalman filter for smooth tempo tracking
- [ ] Eighth note detection (higher resolution)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXISTING PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│  Audio → OSE → TempoDetector → BeatTracker → DownbeatDetector      │
│                                              ↓                      │
│                                         BeatMap                     │
│                                    (detected beats only)            │
└─────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NEW: INTERPOLATION PASS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Step 1: Quarter Note Detection                              │   │
│  │  - Analyze ALL intervals between detected beats              │   │
│  │  - Build histogram of intervals                              │   │
│  │  - Find most common interval = quarter note candidate        │   │
│  │  - Cross-validate against TempoDetector result               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Step 2: Anomaly & Gap Analysis                              │   │
│  │  - Identify anomalies: single beats at 2x speed (ignore)     │   │
│  │  - Identify half-note gaps: beats 2x apart (interpolate)     │   │
│  │  - Identify longer gaps: beats Nx apart (interpolate N-1)    │   │
│  │  - Validate: do surrounding beats align to grid?             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Step 3: Grid Generation (3 selectable approaches)           │   │
│  │                                                              │   │
│  │  Approach 1: Fixed Histogram Grid                            │   │
│  │  - Use histogram peak as fixed quarter note                  │   │
│  │  - Generate rigid grid from first detected beat              │   │
│  │  - No tempo drift handling                                   │   │
│  │                                                              │   │
│  │  Approach 2: Adaptive Phase-Locked Grid                      │   │
│  │  - Same quarter note detection                               │   │
│  │  - Phase tracking at each detected beat anchor               │   │
│  │  - Allow tempo to drift slightly between anchors             │   │
│  │                                                              │   │
│  │  Approach 3: Dual-Pass with Confidence Scoring               │   │
│  │  - KDE + weighted clustering for quarter note                │   │
│  │  - Distributed error correction at anchors                   │   │
│  │  - Confidence scoring based on distance from anchors         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Step 4: Merge & Output                                      │   │
│  │  - Generate interpolated beats on grid                       │   │
│  │  - Merge: detected beats override interpolated at same pos   │   │
│  │  - Output TWO streams:                                       │   │
│  │    1. detectedBeats[] - original detected only               │   │
│  │    2. mergedBeats[] - interpolated + detected override       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│                       InterpolatedBeatMap                           │
└─────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         CONSUMPTION                                 │
├─────────────────────────────────────────────────────────────────────┤
│  User can choose:                                                   │
│  - detectedBeats[] → BeatStream (original behavior)                │
│  - mergedBeats[] → BeatStream (with interpolation)                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Concepts

### Quarter Note Detection Strategy (Dense Section Priority)

The quarter note is determined by prioritizing intervals from **sections with consistent beat detection** over sparse sections:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DENSE SECTION (sets pace)     SPARSE SECTION      NEXT DETECTED       │
│  0 → 0.5 → 1.0          →     [interpolate]   →    5.0                 │
│       ↑                            ↑                    ↑              │
│   Sets pace                 Uses established       Validates grid      │
│   (QN = 0.5s)               pace: 1.5, 2.0,         (5.0 / 0.5 = 10   │
│                             2.5, 3.0, 3.5,           = aligned!)       │
│                             4.0, 4.5                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Algorithm**:

1. **Identify dense sections**: Find sections where beats are detected consistently at regular intervals (e.g., 3+ consecutive beats at similar spacing)

2. **Build weighted histogram**: Weight intervals by:
   - **Density**: Intervals from dense sections get higher weight
   - **Consistency**: Intervals that match their neighbors get higher weight
   - **Confidence**: Intervals between high-confidence beats get higher weight

3. **Find quarter note**: The weighted histogram peak is the quarter note

4. **Validate**: Cross-check against TempoDetector's result as sanity check

### Pace + Anchors Model

The interpolation system uses two key concepts:

| Concept | What it means | How it's used |
|---------|---------------|---------------|
| **Pace** | The quarter note interval established from dense sections | Sets the grid spacing for interpolation |
| **Anchors** | Individual detected beats that mark positions | Override interpolated beats, validate grid alignment |

**Key insight**: The pace comes from sections where detection works well. Anchors in sparse sections don't set pace - they just validate it.

### Gap Interpolation

When a gap is found between anchors:

1. **Calculate expected beats**: `gapDuration / quarterNote` = number of beats that should fit
2. **Place interpolated beats**: At `anchorTime + (n × quarterNote)` for each missing beat
3. **Validate at next anchor**: If next detected beat aligns to grid → confidence HIGH
4. **No confidence decay**: All interpolated beats in a validated gap have equal confidence

### Anomaly Detection

After quarter note (QN) is established:

| Interval Pattern | Interpretation | Action |
|------------------|----------------|--------|
| Single beat at 0.5× QN | Anomaly/false positive | Ignore, don't interpolate |
| Consistent beats at 2× QN | Half-note detection | Interpolate 1 beat in between |
| Consistent beats at 3× QN | Dotted half-note | Interpolate 2 beats in between |
| Gap then return to QN | Missed detection | Interpolate to fill gap |
| Surrounding beats align to grid | Valid section | Trust the grid, interpolate through |

### Silent Sections

**Rule**: Trust the grid. If the pace was established from dense sections elsewhere in the song, and the detected beats before/after silence align to that grid, interpolate through the silence with full confidence. The math knows exactly how many beats fit.

### Confidence Model

**Confidence is NOT based on distance from anchors.** Instead:

| Confidence Source | Weight | Description |
|-------------------|--------|-------------|
| **Grid alignment** | 50% | How well do the surrounding anchors align to the established pace? |
| **Anchor confidence** | 30% | Average confidence of the detected beats bounding this gap |
| **Pace confidence** | 20% | How confident are we in the quarter note detection itself? |

**Result**: All beats interpolated within a single validated gap have the SAME confidence.

---

## Phase 1: Type Definitions & Interfaces

### 1.1 Add New Types to BeatMap.ts
- [x] Add `BeatSource` type (`'detected' | 'interpolated'`)
- [x] Add `InterpolationAlgorithm` type (`'histogram-grid' | 'adaptive-phase-locked' | 'dual-pass'`)
- [x] Add `BeatWithSource` interface extending `Beat`:
  ```typescript
  interface BeatWithSource extends Beat {
      source: BeatSource;
      distanceToAnchor?: number;        // seconds to nearest detected beat
      nearestAnchorTimestamp?: number;  // timestamp of nearest detected beat
  }
  ```
- [x] Add `QuarterNoteDetection` interface:
  ```typescript
  interface QuarterNoteDetection {
      intervalSeconds: number;          // detected quarter note duration
      bpm: number;                      // equivalent BPM
      confidence: number;               // 0-1 confidence in detection
      histogramPeak: number;            // raw histogram peak value
      secondaryPeaks: number[];         // other peaks (half-note, etc.)
      method: 'histogram' | 'kde' | 'tempo-detector-fallback';
      denseSectionCount: number;        // how many dense sections contributed
      denseSectionBeats: number;        // total beats from dense sections
  }
  ```
- [x] Add `GapAnalysis` interface:
  ```typescript
  interface GapAnalysis {
      totalGaps: number;                // number of gaps found
      halfNoteGaps: number;             // gaps exactly 2× quarter note
      anomalies: number[];              // indices of anomalous beats
      avgGapSize: number;               // average gap in beats
      gridAlignmentScore: number;       // how well beats align to grid (0-1)
  }
  ```
- [x] Add `InterpolationMetadata` interface:
  ```typescript
  interface InterpolationMetadata {
      algorithm: InterpolationAlgorithm;
      quarterNoteDetection: QuarterNoteDetection;
      gapAnalysis: GapAnalysis;
      detectedBeatCount: number;
      interpolatedBeatCount: number;
      totalBeatCount: number;
      interpolationRatio: number;       // interpolated / total
      avgInterpolatedConfidence: number;
      tempoDriftRatio: number;          // max local tempo / min local tempo
  }
  ```
- [x] Add `InterpolatedBeatMap` interface:
  ```typescript
  interface InterpolatedBeatMap {
      audioId: string;
      duration: number;

      // Two output streams
      detectedBeats: Beat[];            // original detected beats only
      mergedBeats: BeatWithSource[];    // interpolated + detected (override)

      // Quarter note info
      quarterNoteInterval: number;
      quarterNoteBpm: number;
      quarterNoteConfidence: number;

      // Metadata
      originalMetadata: BeatMapMetadata;
      interpolationMetadata: InterpolationMetadata;
  }
  ```
- [x] Add `BeatInterpolationOptions` interface:
  ```typescript
  interface BeatInterpolationOptions {
      algorithm?: InterpolationAlgorithm;  // default: 'dual-pass'
      minAnchorConfidence?: number;        // min confidence to use as anchor (default: 0.3)
      gridSnapTolerance?: number;          // seconds tolerance for snapping (default: 0.05)
      tempoAdaptationRate?: number;        // 0=fixed, 1=full adaptation (default: 0.3)
      extrapolateStart?: boolean;          // extrapolate before first beat (default: true)
      extrapolateEnd?: boolean;            // extrapolate after last beat (default: true)
      anomalyThreshold?: number;           // multiplier for anomaly detection (default: 0.4)
      denseSectionMinBeats?: number;       // min beats to count as dense section (default: 3)
      gridAlignmentWeight?: number;        // weight for grid alignment in confidence (default: 0.5)
      anchorConfidenceWeight?: number;     // weight for anchor confidence (default: 0.3)
      paceConfidenceWeight?: number;       // weight for pace confidence (default: 0.2)
  }
  ```
- [x] Add `DEFAULT_BEAT_INTERPOLATION_OPTIONS` constant

### 1.2 Update Module Exports
- [x] Export new types from `src/core/analysis/beat/index.ts`
- [x] Export new types from `src/core/types/BeatMap.ts`

---

## Phase 2: Core Analysis Infrastructure

### 2.1 Create BeatInterpolator Class
- [x] Create `src/core/analysis/beat/BeatInterpolator.ts`
- [x] Class structure:
  ```typescript
  class BeatInterpolator {
      constructor(options?: BeatInterpolationOptions);

      // Main entry point
      interpolate(beatMap: BeatMap): InterpolatedBeatMap;

      // Step 1: Quarter note detection
      private detectQuarterNote(beats: Beat[]): QuarterNoteDetection;

      // Step 2: Gap analysis
      private analyzeGaps(beats: Beat[], quarterNote: number): GapAnalysis;

      // Step 3: Grid generation (delegates to algorithm)
      private generateGrid(beatMap: BeatMap, qn: QuarterNoteDetection): BeatWithSource[];

      // Algorithm implementations
      private interpolateHistogramGrid(...): BeatWithSource[];
      private interpolateAdaptivePhaseLocked(...): BeatWithSource[];
      private interpolateDualPass(...): BeatWithSource[];

      // Merge logic
      private mergeBeats(detected: Beat[], interpolated: BeatWithSource[]): BeatWithSource[];
  }
  ```

### 2.2 Implement Quarter Note Detection (Dense Section Priority)
- [x] Create `detectQuarterNote(beats: Beat[]): QuarterNoteDetection` method:
  1. **Identify dense sections**: Find consecutive beats (3+) at similar intervals
  2. **Build weighted histogram**:
     - Calculate all intervals between adjacent detected beats
     - Weight each interval by:
       - Is it in a dense section? (higher weight)
       - Is it consistent with neighbors? (higher weight)
       - Are the bounding beats high-confidence? (higher weight)
  3. Find primary peak (most weighted interval = quarter note)
  4. Find secondary peaks (half-note = 2×, eighth = 0.5×)
  5. Calculate confidence based on:
     - How many dense sections contributed
     - How many total beats from dense sections
     - Peak prominence in weighted histogram
  6. Cross-validate against TempoDetector result if available
  7. Return detection with metadata (including dense section stats)

### 2.3 Implement Gap Analysis
- [x] Create `analyzeGaps(beats: Beat[], quarterNote: number): GapAnalysis` method:
  1. Calculate ratio of each interval to quarter note
  2. Identify half-note gaps (ratio ≈ 2.0)
  3. Identify anomalies (single interval at unusual ratio)
  4. Calculate grid alignment score (how well beats fit the grid)
  5. Return analysis with statistics

---

## Phase 3: Interpolation Algorithms

### 3.1 Approach 1: Histogram-Based Fixed Grid
- [x] Implement `interpolateHistogramGrid()`:
  ```
  1. Use quarterNote.intervalSeconds as fixed grid spacing
  2. Start grid from first detected beat timestamp
  3. Generate timestamps: t0, t0+QN, t0+2*QN, ... until end
  4. Extend backwards to start of audio
  5. For each grid position:
     - If detected beat within tolerance: use detected beat
     - Else: create interpolated beat
  6. Mark all beats with source field
  ```

### 3.2 Approach 2: Adaptive Phase-Locked Grid
- [x] Implement `interpolateAdaptivePhaseLocked()`:
  ```
  1. Start with quarter note interval
  2. Track current phase and running tempo
  3. For each detected beat (anchor):
     a. Calculate expected position based on current tempo
     b. Calculate phase error = actual - expected
     c. Adjust running tempo: tempo += error * adaptationRate / beatsSinceLastAnchor
     d. Generate interpolated beats since last anchor with adjusted tempo
     e. Reset phase to anchor position
  4. Continue until end of audio
  5. Mark all beats with source field
  ```

### 3.3 Approach 3: Dual-Pass with Confidence Scoring
- [x] Implement `interpolateDualPass()`:

  **Pass 1: Enhanced Quarter Note Detection**
  - [x] Apply Gaussian KDE for smooth peak finding
  - [x] Weight intervals by beat confidence
  - [x] Consider regularity of intervals
  - [x] Return quarter note with higher confidence

  **Pass 2: Grid with Distributed Error Correction**
  - [x] Generate initial grid from first beat
  - [x] For each anchor point:
    - Calculate cumulative error from expected position
    - Distribute error across all beats since last anchor
    - Update running tempo with EMA
  - [x] Generate interpolated beats with corrected positions

  **Pass 3: Confidence Scoring**
  - [x] For each interpolated beat:
    - Calculate distance to nearest detected beat
    - Apply decay: `conf = baseConf * exp(-decayRate * distanceBeats)`
    - Factor in local tempo consistency
    - Factor in grid alignment score

---

## Phase 4: Merge & Output Logic

### 4.1 Merge Implementation
- [x] Create `mergeBeats(detected: Beat[], gridBeats: BeatWithSource[], tolerance: number): BeatWithSource[]`:
  ```
  1. Sort both arrays by timestamp
  2. Iterate through grid beats
  3. For each grid beat:
     - Check if detected beat exists within tolerance
     - If yes: use detected beat (it overrides)
     - If no: use interpolated beat
  4. Return merged array sorted by timestamp
  ```

### 4.2 Output Assembly
- [x] Create `assembleOutput()` method:
  - [x] `detectedBeats` = original BeatMap.beats (unchanged)
  - [x] `mergedBeats` = result of merge algorithm
  - [x] Calculate statistics (counts, ratios, averages)
  - [x] Assemble InterpolatedBeatMap

---

## Phase 5: Integration

### 5.1 AudioAnalyzer Integration
- [x] Add `interpolateBeatMap(beatMap: BeatMap, options?: BeatInterpolationOptions): InterpolatedBeatMap` method
- [x] Add convenience method `generateBeatMapWithInterpolation()` that combines generation + interpolation

### 5.2 BeatStream Compatibility
- [x] Verify BeatStream works with `BeatWithSource[]` (should work via extends Beat)
- [x] Add option to BeatStream to use either stream:
  ```typescript
  interface BeatStreamOptions {
      // ... existing options
      useInterpolatedBeats?: boolean;  // if true and InterpolatedBeatMap provided, use mergedBeats
  }
  ```

### 5.3 Serialization
- [x] Add `InterpolatedBeatMapJSON` interface
- [x] Add `BeatInterpolator.toJSON()` / `fromJSON()` static methods

---

## Phase 6: Testing Strategy

### 6.1 Unit Tests - Quarter Note Detection
Create `tests/unit/beat/quarterNoteDetection.test.ts`:
- [x] Test: Regular intervals at 120 BPM → detects 0.5s quarter note
- [x] Test: Intervals with some 2× gaps → still detects 0.5s
- [x] Test: Intervals with single anomaly → ignores anomaly
- [x] Test: All intervals at 2× (half-notes) → detects 1.0s, suggests 0.5s alternative
- [x] Test: Empty beat array → graceful failure
- [x] Test: Single beat → graceful failure
- [x] Test: Confidence calculation varies with peak prominence

### 6.2 Unit Tests - Gap Analysis
Create `tests/unit/beat/gapAnalysis.test.ts`:
- [x] Test: Identify half-note gaps (2× ratio)
- [x] Test: Identify anomalies (single unusual interval)
- [x] Test: Calculate grid alignment score
- [x] Test: Handle silent sections (surrounding beats aligned)

### 6.3 Unit Tests - Interpolation Algorithms
Create `tests/unit/beat/beatInterpolator.test.ts`:
- [x] Test Approach 1: Fixed grid matches expected timestamps
- [x] Test Approach 2: Adaptive grid adjusts at anchors
- [x] Test Approach 3: Confidence scoring works correctly
- [x] Test: All approaches produce same beat count for simple case
- [x] Test: Detected beats override interpolated in merge

### 6.4 Integration Tests
Create `tests/integration/beatInterpolation.integration.test.ts`:
- [x] Test: Full pipeline with real audio file
- [x] Test: Compare all 3 approaches on same audio
- [x] Test: Interpolated beats align with actual beats within tolerance
- [x] Test: Performance benchmark (<100ms for 5-min song)

### 6.5 Test Utilities
- [x] Create synthetic beat map generator for testing
- [x] Create beat map with known gaps for testing
- [x] Create beat map with known anomalies for testing

---

## Phase 7: Documentation

### 7.1 Code Documentation
- [x] JSDoc on all new types and interfaces
- [x] JSDoc on BeatInterpolator class and all methods
- [x] Inline comments explaining algorithm steps

### 7.2 Usage Documentation
- [ ] Example: Basic interpolation with defaults
- [ ] Example: Selecting different algorithms
- [ ] Example: Accessing detected vs merged streams
- [ ] Example: Customizing options

### 7.3 Update DATA_ENGINE_REFERENCE.md
- [ ] Add `BeatInterpolator` to API reference table
- [ ] Add `InterpolatedBeatMap` type to types reference
- [ ] Add `BeatInterpolationOptions` to options reference
- [ ] Add `BeatSource` and `BeatWithSource` types
- [ ] Document algorithm selection (histogram-grid, adaptive-phase-locked, dual-pass)
- [ ] Document all option parameters with defaults

### 7.4 Update AUDIO_ANALYSIS.md
- [ ] Add "Beat Interpolation" section with conceptual explanation
- [ ] Explain dense section priority for quarter note detection
- [ ] Explain Pace + Anchors model
- [ ] Explain confidence model (grid alignment, anchor confidence, pace confidence)
- [ ] Add usage examples for both detected and merged streams
- [ ] Add guidance on when to use each algorithm
- [ ] Add option tuning guidelines

---

## Phase 8: Research & Experimentation Tools

### 8.1 Comparison Utilities
- [ ] Create utility to compare outputs of different approaches
- [ ] Create utility to visualize detected vs interpolated beats
- [ ] Create utility to calculate accuracy metrics against ground truth

### 8.2 Debugging Output
- [ ] Add optional debug output showing:
  - Quarter note detection histogram
  - Gap analysis results
  - Per-beat confidence scores
  - Tempo drift over time

---

## Dependencies

### Phase Dependencies
```
Phase 1 (Types) ─────────────────────────────────────────┐
                                                          │
Phase 2 (Core Analysis) ─────────────────────────────────┤
                    │                                     │
                    ▼                                     │
Phase 3 (Algorithms) ────────────────────────────────────┤
                    │                                     │
                    ▼                                     │
Phase 4 (Merge/Output) ──────────────────────────────────┤
                    │                                     │
                    ▼                                     │
Phase 5 (Integration) ◄──────────────────────────────────┘
                    │
                    ▼
Phase 6 (Testing) ◄──────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
Phase 7 (Documentation) ─────────────────────────────────┤
                                                          │
Phase 8 (Research Tools) ◄───────────────────────────────┘
```

### External Dependencies
- No new npm packages required
- Uses existing Float32Array, Map, math utilities

---

## Success Criteria

| Criterion | Target | How to Measure |
|-----------|--------|----------------|
| **Accuracy** | Interpolated beats within ±50ms of actual | Compare against manually annotated beats |
| **Coverage** | 95%+ of quarter notes present | Count beats in merged vs expected |
| **Performance** | <100ms for 5-minute song | Benchmark test |
| **Reliability** | No crashes on edge cases | Edge case tests pass |
| **Research Value** | Can compare all 3 approaches | Selection API works |

---

## Estimated Effort

| Phase | Hours | Notes |
|-------|-------|-------|
| Phase 1: Types | 2-3 | Straightforward additions |
| Phase 2: Core Analysis | 4-6 | Quarter note + gap detection |
| Phase 3: Algorithms | 8-12 | 3 implementations to compare |
| Phase 4: Merge/Output | 2-3 | Merge logic + assembly |
| Phase 5: Integration | 2-3 | AudioAnalyzer + serialization |
| Phase 6: Testing | 6-8 | Comprehensive test coverage |
| Phase 7: Documentation | 2-3 | JSDoc + examples |
| Phase 8: Research Tools | 3-4 | Comparison utilities |
| **Total** | **29-42** | |

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Multi-measure patterns? | Not needed yet - focus on quarter notes first |
| Eighth note detection? | Future enhancement - quarter notes must work first |
| Silent sections? | Trust the grid if surrounding beats align |
| Tempo doubling/halving? | Analyze whole map post-detection, identify anomalies vs patterns |

---

## Remaining Questions

1. **Anomaly threshold**: What multiplier defines an anomaly? (Start with 0.3-0.4× or 2.5-3× quarter note)
2. **Grid snap tolerance**: How close does a detected beat need to be to "override"? (Start with 50ms)
3. **Dense section threshold**: How many consecutive beats at similar intervals count as "dense"? (Start with 3)
4. **Confidence weights**: Are the default weights (50% grid, 30% anchor, 20% pace) appropriate?

These can be tuned through experimentation with the 3 approaches.

---

## Next Steps

1. **Review and approve** this plan
2. **Start Phase 1**: Add type definitions
3. **Implement Phase 2**: Core analysis (quarter note detection + gap analysis)
4. **Implement Phase 3**: All 3 algorithms for comparison
5. **Test and compare** approaches on real audio
6. **Document findings** and recommended defaults
