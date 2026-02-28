# Beat Grid Interpolation System Implementation Plan

## Overview

The beat detection system accurately detects beats when they're found, but often misses beats between detections. When tapping through a song, the detected beats align perfectly with a consistent grid, suggesting the tempo is stable but detection coverage is incomplete.

This plan proposes a **Beat Grid Interpolation System** that uses detected beats as "ground truth anchors" to estimate a metronomic grid of quarter notes, filling in the gaps while allowing detected beats to correct any drift.

### Core Concept

```
Detected beats:  |-----|---------|---|-------|-----|----| (irregular spacing but on-grid)
Estimated grid:  |--|--|--|--|--|--|--|--|--|--|--|--|--| (consistent quarter note grid)
Blended output:  |D |--|E |--|E |--|D |--|E |--|D |--|E |  (D=detected, E=estimated)
```

### User Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Blend modes | Detected-only, Detected+interpolated, Estimated grid with correction |
| Correction style | Instant snap to detected beats |
| Processing | Offline, accuracy priority |
| Tempo type | Mostly consistent (electronic/produced music) |
| Subdivisions | Quarter notes primary (1/8, triplets secondary) |
| Gap handling | Unlimited interpolation |
| Source conflict | Detected beats always win |
| Output format | Multi-stream with metadata |
| Metadata per beat | Source, interpolation confidence, local tempo, anchor proximity |

---

## Algorithmic Approaches

Three distinct algorithms will be implemented and compared:

### Approach A: Linear Interval Interpolation (LII)

**Concept**: Calculate tempo from adjacent detected beats, generate intermediate beats at regular intervals, snap to detected beats when they exist.

**Strengths**:
- Simple and fast
- Works well for consistent tempo
- Easy to understand and debug

**Weaknesses**:
- May produce tempo discontinuities at detected beats
- Doesn't use look-ahead capability

**Best for**: Electronic music with very stable tempo

```
Algorithm:
1. For each pair of consecutive detected beats (A, B):
   a. Calculate interval I = B.timestamp - A.timestamp
   b. Estimate beats-per-gap = round(I / expectedQuarterNoteInterval)
   c. Generate n-1 estimated beats at evenly spaced intervals
2. Mark all beats with source = 'detected' or 'estimated'
3. Calculate interpolation confidence based on gap size
```

---

### Approach B: Global Tempo Regression with Local Correction (GTR-LC)

**Concept**: Use the global tempo estimate as a baseline, generate a full grid from start to end, then locally adjust grid positions to snap to detected beats while maintaining smooth tempo transitions.

**Strengths**:
- More musically coherent (single tempo)
- Better handles songs with minor tempo drift
- Uses global tempo information

**Weaknesses**:
- More complex implementation
- May fight against local tempo variations

**Best for**: Songs with clear global tempo but sparse detection

```
Algorithm:
1. Get global BPM from TempoDetector
2. Generate initial grid at quarter note intervals from t=0
3. For each detected beat:
   a. Find nearest grid position
   b. Calculate offset (detected - grid)
   c. Snap grid position to detected (instant correction)
   d. Propagate offset correction to subsequent grid positions
      with exponential decay (correction influence fades)
4. Calculate confidence based on distance to nearest detected beat
```

---

### Approach C: Windowed Autocorrelation with Grid Fitting (WAC-GF)

**Concept**: Divide the song into overlapping windows, detect local tempo in each window using autocorrelation, fit a beat grid to each window, then blend windows together using detected beats as anchors.

**Strengths**:
- Handles tempo changes gracefully
- Most robust for variable tempo
- Uses look-ahead effectively

**Weaknesses**:
- Most computationally expensive
- More parameters to tune

**Best for**: Songs with tempo variations, live recordings

```
Algorithm:
1. Divide song into overlapping windows (e.g., 10s windows, 5s overlap)
2. For each window:
   a. Run local tempo estimation via autocorrelation
   b. Find best phase alignment with detected beats in window
   c. Generate grid for window
3. Blend adjacent windows using crossfade weights
4. At detected beat positions:
   a. Snap grid to detected beat
   b. Use offset to adjust subsequent grid positions
5. Calculate metadata for each beat
```

---

## Phase 1: Foundation & Types

**Goal**: Define types and interfaces for the beat grid interpolation system.

### Tasks

- [ ] **1.1 Define Core Types**
  - [ ] Create `BeatSource` type: `'detected' | 'estimated' | 'hybrid'`
  - [ ] Create `InterpolatedBeat` extending `Beat` with:
    ```typescript
    interface InterpolatedBeat extends Beat {
      source: BeatSource;
      interpolationConfidence: number;  // 0-1, how confident in this estimate
      localTempo: number;               // BPM at this beat
      anchorProximity: number;          // seconds to nearest detected beat
      anchorBeat?: Beat;                // reference to nearest detected beat
    }
    ```
  - [ ] Create `BeatGridMode` type: `'detected-only' | 'detected-interpolated' | 'estimated-grid'`
  - [ ] Create `BeatGridConfig` interface with blend ratio, max interpolation distance, etc.

- [ ] **1.2 Define Output Types**
  - [ ] Create `BeatGridResult` interface:
    ```typescript
    interface BeatGridResult {
      beats: InterpolatedBeat[];         // All beats (detected + estimated)
      detectedBeats: Beat[];             // Original detected beats only
      estimatedBeats: InterpolatedBeat[]; // Estimated beats only
      averageTempo: number;              // Average BPM across the track
      tempoCurve: TempoCurvePoint[];     // Tempo over time
      metadata: BeatGridMetadata;
    }
    ```
  - [ ] Create `TempoCurvePoint` interface for tempo visualization
  - [ ] Create `BeatGridMetadata` for algorithm info and settings

- [ ] **1.3 Add Types to BeatMap.ts**
  - [ ] Export all new types from [BeatMap.ts](playlist-data-engine/src/core/types/BeatMap.ts)
  - [ ] Add JSDoc documentation with examples

---

## Phase 2: Linear Interval Interpolation (Approach A)

**Goal**: Implement the simplest approach as a baseline.

### Tasks

- [ ] **2.1 Create BeatGridInterpolator Base Class**
  - [ ] Create [BeatGridInterpolator.ts](playlist-data-engine/src/core/analysis/beat/BeatGridInterpolator.ts)
  - [ ] Define abstract interface for interpolation algorithms
  - [ ] Add common utility methods:
    - `calculateInterval(b1, b2)` - time between beats
    - `estimateBeatsInGap(interval, targetInterval)` - how many beats fit
    - `calculateInterpolationConfidence(gapSize, beatsInGap)` - confidence scoring

- [ ] **2.2 Implement LinearIntervalInterpolator**
  - [ ] Create [interpolators/LinearIntervalInterpolator.ts](playlist-data-engine/src/core/analysis/beat/interpolators/LinearIntervalInterpolator.ts)
  - [ ] Implement `interpolate(detectedBeats, options)` method:
    ```
    for each pair of consecutive detected beats:
      calculate interval between them
      estimate how many quarter notes should fit
      generate evenly-spaced estimated beats
      assign confidence based on gap size
  ```
  - [ ] Handle edge cases: single beat, no beats, very long gaps
  - [ ] Ensure detected beats always maintain their exact timestamps

- [ ] **2.3 Add Metadata Calculation**
  - [ ] Calculate `localTempo` for each beat from surrounding intervals
  - [ ] Calculate `anchorProximity` (distance to nearest detected beat)
  - [ ] Set `interpolationConfidence` based on gap size and regularity

- [ ] **2.4 Unit Tests for Approach A**
  - [ ] Test with perfectly regular detected beats (should produce no interpolation)
  - [ ] Test with every-other-beat detected (should fill in gaps)
  - [ ] Test with irregular detection patterns
  - [ ] Test confidence calculations
  - [ ] Test edge cases (empty, single beat, etc.)

---

## Phase 3: Global Tempo Regression with Local Correction (Approach B)

**Goal**: Implement a more musically coherent approach using global tempo.

### Tasks

- [ ] **3.1 Create GlobalTempoInterpolator**
  - [ ] Create [interpolators/GlobalTempoInterpolator.ts](playlist-data-engine/src/core/analysis/beat/interpolators/GlobalTempoInterpolator.ts)
  - [ ] Accept global BPM from TempoDetector as input
  - [ ] Generate initial grid from t=0 at quarter note intervals

- [ ] **3.2 Implement Grid Correction Algorithm**
  - [ ] For each detected beat, find nearest grid position
  - [ ] Calculate offset and apply instant snap correction
  - [ ] Propagate correction to subsequent beats with decay:
    ```typescript
    // Correction influence decays exponentially
    const decayFactor = Math.exp(-distanceFromAnchor / decayConstant);
    correctedPosition = gridPosition + (offset * decayFactor);
    ```
  - [ ] Handle multiple anchors (use nearest detected beat for correction)

- [ ] **3.3 Implement Tempo Smoothing**
  - [ ] After grid correction, calculate local tempo at each position
  - [ ] Apply light smoothing to tempo curve (avoid discontinuities)
  - [ ] Ensure detected beat positions remain unchanged

- [ ] **3.4 Unit Tests for Approach B**
  - [ ] Test with various global BPM values
  - [ ] Test correction propagation and decay
  - [ ] Test with songs that have minor tempo drift
  - [ ] Compare output with Approach A on same inputs

---

## Phase 4: Windowed Autocorrelation with Grid Fitting (Approach C)

**Goal**: Implement the most robust approach for handling tempo variations.

### Tasks

- [ ] **4.1 Create WindowedAutocorrelationInterpolator**
  - [ ] Create [interpolators/WindowedAutocorrelationInterpolator.ts](playlist-data-engine/src/core/analysis/beat/interpolators/WindowedAutocorrelationInterpolator.ts)
  - [ ] Implement windowing with configurable size and overlap
  - [ ] Default: 10-second windows, 5-second overlap (50%)

- [ ] **4.2 Implement Local Tempo Detection per Window**
  - [ ] For each window, run autocorrelation on onset envelope
  - [ ] Find dominant tempo period within window
  - [ ] Store as `WindowTempoInfo`:
    ```typescript
    interface WindowTempoInfo {
      startTime: number;
      endTime: number;
      localBpm: number;
      confidence: number;
    }
    ```

- [ ] **4.3 Implement Phase Alignment**
  - [ ] For each window, find best phase (grid offset) that aligns with detected beats
  - [ ] Use detected beats within window as phase anchors
  - [ ] Score phase candidates by sum of squared distances to detected beats

- [ ] **4.4 Implement Window Blending**
  - [ ] Blend adjacent windows using crossfade weights
  - [ ] At overlap regions, use weighted average of beat positions
  - [ ] Ensure detected beats in overlap regions are not modified

- [ ] **4.5 Unit Tests for Approach C**
  - [ ] Test with constant tempo (should match other approaches)
  - [ ] Test with simulated tempo changes
  - [ ] Test window blending at boundaries
  - [ ] Test phase alignment accuracy

---

## Phase 5: Unified API & Integration

**Goal**: Create a unified interface that allows switching between approaches and integrates with the existing pipeline.

### Tasks

- [ ] **5.1 Create BeatGridGenerator**
  - [ ] Create [BeatGridGenerator.ts](playlist-data-engine/src/core/analysis/beat/BeatGridGenerator.ts)
  - [ ] Accept `BeatMap` (from existing pipeline) as input
  - [ ] Accept `BeatGridConfig` with:
    - `mode: BeatGridMode` - which blend mode to use
    - `approach: 'linear' | 'global-tempo' | 'windowed' | 'auto'`
    - `blendRatio: number` - 0 = pure detected, 1 = pure estimated
  - [ ] Route to appropriate interpolator based on config

- [ ] **5.2 Implement Mode Switching**
  - [ ] `detected-only`: Return detected beats with source metadata
  - [ ] `detected-interpolated`: Fill gaps with estimated beats
  - [ ] `estimated-grid`: Generate grid, use detected for correction only

- [ ] **5.3 Implement Auto-Approach Selection**
  - [ ] Analyze detected beat pattern:
    - Calculate regularity score (std dev of intervals)
    - Calculate coverage (detected beats / expected beats)
  - [ ] Select approach based on analysis:
    - High regularity + high coverage → Linear (A)
    - High regularity + low coverage → Global Tempo (B)
    - Low regularity → Windowed (C)

- [ ] **5.4 Integrate with BeatMapGenerator**
  - [ ] Add optional `generateGrid: boolean` option to `BeatMapGeneratorOptions`
  - [ ] Add `gridConfig: BeatGridConfig` option
  - [ ] Add `grid: BeatGridResult` to `BeatMap` output (optional)

- [ ] **5.5 Update AudioAnalyzer Facade**
  - [ ] Add `generateBeatGrid(audioId, config)` method
  - [ ] Add `generateBeatMapWithGrid(audioId, options)` convenience method

---

## Phase 6: Testing & Comparison Framework

**Goal**: Create tools to compare the three approaches and determine which performs best.

### Tasks

- [ ] **6.1 Create Comparison Test Suite**
  - [ ] Create [__tests__/beatGridComparison.test.ts](playlist-data-engine/src/core/analysis/beat/__tests__/beatGridComparison.test.ts)
  - [ ] Test all three approaches on same inputs
  - [ ] Measure:
    - Number of beats produced
    - Tempo stability (std dev of local tempo)
    - Alignment accuracy with detected beats
    - Processing time

- [ ] **6.2 Create Visual Debugging Tools**
  - [ ] Create function to export beat grid as JSON for visualization
  - [ ] Include tempo curve data
  - [ ] Include confidence values for debugging

- [ ] **6.3 Create Real-World Test Cases**
  - [ ] Select 5-10 diverse audio files:
    - Electronic with stable tempo
    - Rock with drums
    - Classical/orchestral
    - Live recording with tempo drift
    - Song with tempo changes
  - [ ] Generate beat grids with all approaches
  - [ ] Document results and recommendations

- [ ] **6.4 Document Approach Selection Guidelines**
  - [ ] Based on test results, document when to use each approach
  - [ ] Add to code comments and user documentation

---

## Phase 7: Subdivision Support (Optional Enhancement)

**Goal**: Support eighth notes, triplets, and other subdivisions.

### Tasks

- [ ] **7.1 Define Subdivision Types**
  - [ ] Create `SubdivisionType`: `'quarter' | 'eighth' | 'triplet' | 'sixteenth'`
  - [ ] Add to `BeatGridConfig`

- [ ] **7.2 Implement Subdivision Generation**
  - [ ] After generating quarter note grid, subdivide as requested
  - [ ] Mark subdivision beats with appropriate metadata
  - [ ] Calculate confidence for subdivision beats (lower than quarter notes)

- [ ] **7.3 Test Subdivision Output**
  - [ ] Verify correct timing for each subdivision type
  - [ ] Test with various BPM ranges

---

## Data Structures

### InterpolatedBeat

```typescript
interface InterpolatedBeat extends Beat {
  /** Whether this beat was detected or estimated */
  source: 'detected' | 'estimated' | 'hybrid';
  
  /** Confidence in this beat's position (0-1)
   *  - 1.0 for detected beats
   *  - 0.5-0.9 for estimated beats near detected beats
   *  - Lower for estimated beats far from detected beats
   */
  interpolationConfidence: number;
  
  /** Local tempo at this beat position in BPM */
  localTempo: number;
  
  /** Seconds to the nearest detected beat (anchor) */
  anchorProximity: number;
  
  /** Reference to the nearest detected beat (optional) */
  anchorBeat?: Beat;
}
```

### BeatGridResult

```typescript
interface BeatGridResult {
  /** All beats (detected + estimated), sorted by timestamp */
  beats: InterpolatedBeat[];
  
  /** Original detected beats only (subset of beats) */
  detectedBeats: Beat[];
  
  /** Estimated beats only (subset of beats) */
  estimatedBeats: InterpolatedBeat[];
  
  /** Average tempo across the track in BPM */
  averageTempo: number;
  
  /** Tempo curve for visualization */
  tempoCurve: TempoCurvePoint[];
  
  /** Algorithm metadata */
  metadata: BeatGridMetadata;
}
```

### BeatGridConfig

```typescript
interface BeatGridConfig {
  /** Output mode */
  mode: 'detected-only' | 'detected-interpolated' | 'estimated-grid';
  
  /** Interpolation algorithm to use */
  approach: 'linear' | 'global-tempo' | 'windowed' | 'auto';
  
  /** Blend ratio (0 = pure detected, 1 = pure estimated)
   *  Only used in 'detected-interpolated' mode
   */
  blendRatio?: number;
  
  /** Subdivision level */
  subdivision?: 'quarter' | 'eighth' | 'triplet' | 'sixteenth';
  
  /** For windowed approach: window size in seconds */
  windowSizeSeconds?: number;
  
  /** For windowed approach: window overlap ratio (0-1) */
  windowOverlap?: number;
}
```

---

## Dependencies

- Existing beat detection pipeline (BeatMapGenerator, BeatTracker, etc.)
- TempoDetector for global BPM estimate
- Onset envelope data (for windowed autocorrelation)

---

## Questions/Unknowns

1. **Confidence Threshold**: What's the minimum confidence for including an estimated beat? Should this be configurable?

2. **Gap Limit**: Currently planning unlimited interpolation. Should there be a maximum gap size after which we stop interpolating?

3. **Approach Selection**: The "auto" mode needs clear heuristics. What metrics best predict which approach will work best?

4. **Performance**: The windowed approach (C) is more expensive. Is this acceptable for offline analysis, or should we optimize?

5. **Subdivision Priority**: Should subdivisions be implemented in Phase 1-6, or is Phase 7 the right priority?

---

## Success Criteria

- [ ] All three approaches implemented and tested
- [ ] Detected beats never modified (ground truth preserved)
- [ ] Estimated beats align with detected beats (no drift at anchors)
- [ ] Confidence values accurately reflect estimation quality
- [ ] Clear documentation on when to use each approach
- [ ] Integration with existing BeatMapGenerator pipeline
- [ ] Multi-stream output with all requested metadata
