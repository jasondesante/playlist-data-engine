# Procedural Rhythm Subdivision Generation - Implementation Plan

## Overview

This plan focuses on automatically generating interesting subdivision patterns over quarter note beat maps. The goal is to take an existing `UnifiedBeatMap` (quarter notes) and procedurally create rhythmic patterns that:

1. Match the music's energy and transients
2. Provide configurable difficulty levels (easy/medium/hard)
3. Feel "musical" rather than random
4. Output multiple streams (bass/mid/high/composite) for flexibility

This plan intentionally **excludes** pitch detection and button mapping - those are covered in the companion plan `pitch-detection-button-mapping.md`.

---

## Input: Quarter Note Beat Maps (`UnifiedBeatMap`)

The procedural rhythm generator operates on a **`UnifiedBeatMap`** - a beat grid at quarter note intervals created by the existing beat detection pipeline:

```
BeatMap (raw detected beats, irregular spacing)
    ↓ BeatInterpolator.interpolate()
InterpolatedBeatMap (gaps filled, quarter note grid established)
    ↓ unifyBeatMap()
UnifiedBeatMap (merged detected + interpolated beats)
    ↓ [this plan: RhythmGenerator + TransientDetector]
GeneratedSubdivisionResult (with bass/mid/high/composite streams)
```

### `UnifiedBeatMap` Structure

**Type definition:** [`src/core/types/BeatMap.ts:1925`](../../src/core/types/BeatMap.ts#L1925)

```typescript
interface UnifiedBeatMap {
  audioId: string;                    // Unique identifier for the audio source
  duration: number;                   // Duration in seconds
  beats: Beat[];                      // All beats at quarter note intervals
  detectedBeatIndices: number[];      // Indices of originally detected beats
  quarterNoteInterval: number;        // Quarter note duration in seconds
  quarterNoteBpm: number;             // Equivalent BPM (60 / quarterNoteInterval)
  downbeatConfig: DownbeatConfig;     // Downbeat configuration for measure labeling
  tempoSections?: TempoSection[];     // Multi-tempo sections (if applicable)
  originalMetadata: BeatMapMetadata;  // Metadata from original beat detection
}
```

### Key Files

| Component | File | Description |
|-----------|------|-------------|
| `UnifiedBeatMap` type | [`src/core/types/BeatMap.ts:1925`](../../src/core/types/BeatMap.ts#L1925) | Interface definition |
| `unifyBeatMap()` | [`src/core/analysis/beat/utils/unifyBeatMap.ts:40`](../../src/core/analysis/beat/utils/unifyBeatMap.ts#L40) | Conversion utility |
| `BeatInterpolator` | [`src/core/analysis/beat/BeatInterpolator.ts`](../../src/core/analysis/beat/BeatInterpolator.ts) | Creates InterpolatedBeatMap from BeatMap |
| `BeatMapGenerator` | [`src/core/analysis/beat/BeatMapGenerator.ts`](../../src/core/analysis/beat/BeatMapGenerator.ts) | Raw beat detection (Ellis algorithm) |

---

## Current Foundation

The engine already has:
- ✅ Beat detection (Ellis algorithm via `BeatMapGenerator`)
- ✅ Quarter note interpolation (`BeatInterpolator`)
- ✅ Subdivision system (`BeatSubdivider` with `SubdivisionType`)
- ✅ Difficulty presets (`DifficultyPreset`: easy/medium/hard)
- ✅ Audio utilities (FFT, STFT, mel filterbanks, filters)

---

## Phase 1: Multi-Band Transient Detector

**Goal**: Create a separate transient detection system that operates on filtered frequency bands and cross-references with the beat map.

### 1.1 Band-Pass Filter Implementation
- [ ] Create `BandPassFilter` utility in `audioUtils.ts`
  - [ ] Implement Butterworth band-pass filter
  - [ ] Support configurable Q-factor
  - [ ] Add cascaded filter for sharper cutoffs
- [ ] Define frequency band presets
  ```typescript
  interface FrequencyBand {
    name: string;
    lowHz: number;
    highHz: number;
    description: string;
  }

  // MVP: 3 bands for rhythm detection
  const FREQUENCY_BANDS: FrequencyBand[] = [
    { name: 'low', lowHz: 20, highHz: 500, description: 'Low frequencies (bass, kick, sub)' },
    { name: 'mid', lowHz: 500, highHz: 4000, description: 'Mid frequencies (vocals, snare body, instruments)' },
    { name: 'high', lowHz: 4000, highHz: 20000, description: 'High frequencies (hi-hats, cymbals, air)' },
  ];
  ```

> **Future Consideration**: Expand to 6 bands (sub, bass, lowMid, mid, highMid, high) for finer-grained rhythm detection in complex material. This would increase processing time approximately 2x.

### 1.2 Multi-Band Analyzer
- [ ] Create `MultiBandAnalyzer` class in `src/core/analysis/MultiBandAnalyzer.ts`
  - [ ] Accept `AudioBuffer` as input
  - [ ] Apply band-pass filters for each band
  - [ ] Generate separate onset strength envelopes per band
  - [ ] Calculate per-band energy over time
  ```typescript
  interface MultiBandResult {
    bands: Map<string, BandAnalysis>;
    dominantBands: string[];  // Bands with most activity
    energyProfile: Float32Array;  // Total energy over time
  }

  interface BandAnalysis {
    name: string;
    envelope: Float32Array;
    peaks: number[];  // Frame indices of transients
    energy: number;   // Average energy in this band
    peakTimes: number[];  // Transient times in seconds
  }
  ```

### 1.3 Multi-Band Transient Detector (Separate from Ellis Beat Detection)
- [ ] Create `TransientDetector` class in `src/core/analysis/beat/TransientDetector.ts`
  - [ ] Implement varied detection strategies tailored to the frequency band:
    - [ ] **Low Band**: Energy-based detection / Subband Envelope (great for clear kick/bass transients)
    - [ ] **Mid Band**: Spectral Flux algorithm (reliable for snare, vocals, and harmonic onsets)
    - [ ] **High Band**: High-Frequency Content (HFC) / Spectral Flux (ideal for hi-hats, cymbals, air)
  - [ ] Add adaptive thresholding to adjust to the song's dynamic range
  - [ ] Support concurrent per-band transient detection
  - [ ] **Note**: Rhythmic quantization to the beat map grid happens in section 1.4, not here.
  ```typescript
  interface TransientResult {
    timestamp: number;
    intensity: number;  // Strength of the detected transient (0.0 - 1.0)
    band: string;  // Which frequency band detected this: 'low', 'mid', or 'high'
    detectionMethod: 'energy' | 'spectral_flux' | 'hfc';
    nearestBeat?: {
      index: number;
      distance: number;  // How far from quarter note grid (in seconds)
    };
  }

  interface TransientAnalysis {
    transients: TransientResult[];
    bandTransients: Map<string, TransientResult[]>;  // Keys: 'low', 'mid', 'high'
    // rhythmSuggestions removed - now generated in 1.4 after quantization
  }
  ```

### 1.4 Transient-to-Rhythm Quantization

**Goal**: Translate raw transients into quantized rhythmic subdivisions that align with the beat map grid.

> **⚠️ Critical Step**: This is the translation layer between audio analysis and playable rhythm patterns. Take time to validate quantization results before proceeding. The quality of this step directly impacts playability.

#### 1.4.1 Density Validation Gate
Before quantization, validate that detected transients aren't too dense:
- [ ] Calculate minimum allowed interval based on tempo (16th note duration = quarterNoteInterval / 4)
- [ ] Check if any two consecutive transients are closer than the minimum interval
- [ ] If too dense, trigger sensitivity adjustment with retry logic:
  ```typescript
  interface DensityValidationResult {
    isValid: boolean;
    minIntervalDetected: number;  // Smallest gap between transients (seconds)
    requiredMinInterval: number;  // 16th note duration at current tempo
    retryCount: number;
    sensitivityReduction: number;  // Cumulative sensitivity reduction applied
  }

  // Retry logic (max 3 retries):
  // - Retry 1: Reduce sensitivity by base amount (e.g., 0.1)
  // - Retry 2: Reduce sensitivity by 2x base amount (0.2)
  // - Retry 3: Reduce sensitivity by 4x base amount (0.4)
  // After 3 retries, proceed with current results and log warning
  ```
- [ ] Implement exponential backoff for sensitivity reduction
- [ ] Track retry count and cumulative sensitivity reduction in metadata

#### 1.4.2 Intensity Filtering
- [ ] Support optional filtering by transient intensity:
  ```typescript
  interface QuantizationConfig {
    minimumTransientIntensity: number;  // Default: 0.0 (catch all), user can set higher to filter weak transients
    // ... other config
  }
  ```
- [ ] Filter transients below intensity threshold before quantization
- [ ] Log how many transients were filtered for transparency

#### 1.4.3 Per-Beat Grid Detection & Quantization

**Goal**: For each beat, determine whether transients fit better on a straight 16th note grid or an 8th note triplet grid, then quantize to the chosen grid.

##### Interfaces

- [ ] **Grid decision metadata** (produced during grid detection):
  ```typescript
  interface GridDecision {
    beatIndex: number;
    selectedGrid: 'straight_16th' | 'triplet_8th';
    straightAvgOffset: number;   // Average ms offset per transient from 16th grid
    tripletAvgOffset: number;    // Average ms offset per transient from triplet grid
    transientCount: number;      // Number of transients in this beat
    confidence: number;          // How much better the chosen grid fits
  }
  ```

- [ ] **Core beat type** - a single quantized note:
  ```typescript
  interface GeneratedBeat {
    timestamp: number;           // Quantized time in seconds
    beatIndex: number;           // Index into UnifiedBeatMap.beats[] - which quarter note this belongs to
    gridPosition: number;        // Position within that beat (0-3 for 16th, 0-2 for triplet)
    gridType: 'straight_16th' | 'triplet_8th';
    intensity: number;           // Transient strength (0.0 - 1.0)
    band: 'low' | 'mid' | 'high';
    quantizationError?: number;  // How far it was moved from original (ms), for debugging
  }
  ```

- [ ] **Per-band rhythm map** - a complete rhythm chart for one frequency band:
  ```typescript
  interface GeneratedRhythmMap {
    audioId: string;
    duration: number;
    beats: GeneratedBeat[];      // All quantized beats for this band
    gridDecisions: GridDecision[];  // Per-beat grid choices (16th vs triplet)
  }
  ```

- [ ] **Complete Phase 1 output** - all 3 band streams plus metadata:
  ```typescript
  interface QuantizedBandStreams {
    streams: {
      low: GeneratedRhythmMap;   // Low frequency band
      mid: GeneratedRhythmMap;    // Mid frequency band
      high: GeneratedRhythmMap;   // High frequency band
    };
    metadata: {
      densityValidation: DensityValidationResult;
      transientsFilteredByIntensity: number;
    };
  }
  ```

##### Algorithm

- [ ] **Per-beat grid detection**:
  - [ ] For each beat, extract transients within that beat's time range
  - [ ] Lay out a **straight 16th note grid** for the beat
  - [ ] Calculate **average ms offset per transient** from the 16th grid (total offset / transient count)
  - [ ] Lay out an **8th note triplet grid** for the beat
  - [ ] Calculate **average ms offset per transient** from the triplet grid (total offset / transient count)
  - [ ] **Whichever grid has smaller average offset** = use that grid for this beat
  - [ ] Record decision in `GridDecision` for each beat
- [ ] **Quantize to chosen grid**:
  - [ ] For each beat, use the selected grid (16th or triplet)
  - [ ] Snap transients to nearest grid point (within tolerance)
  - [ ] Create `GeneratedBeat` for each quantized transient
  - [ ] Track quantization error for debugging
- [ ] **Handle edge cases**:
  - [ ] Transients too far from any grid point (discard or mark as "unquantized")
  - [ ] Multiple transients snapping to same grid point (keep strongest)
  - [ ] Beats with no transients (skip, no grid decision needed)

#### 1.4.4 Phase 1 Output Summary

**Output**: `QuantizedBandStreams` containing 3 quantized rhythm streams (low/mid/high).

- [ ] Each stream is a `GeneratedRhythmMap` - a complete, playable rhythm chart
- [ ] Streams are compatible with existing beat map infrastructure
- [ ] No manual-subdivision metadata (`SubdivisionConfig`, `isDetected`, etc.) - those are manual-path concerns

### 1.5 Tests
- [ ] Unit tests for band-pass filter
- [ ] Unit tests for `MultiBandAnalyzer`
- [ ] Unit tests for `TransientDetector`
- [ ] Unit tests for density validation retry logic
- [ ] Unit tests for intensity filtering
- [ ] Unit tests for rhythmic quantization
- [ ] Integration test: detect transients on known drum track
- [ ] Verify quantization aligns with beat map grid
- [ ] Verify retry logic reduces sensitivity correctly (exponential backoff)
- [ ] Verify all 3 band streams are valid quantized rhythms

---

## Phase 2: Rhythmic Phrase Analysis & Difficulty Variants

**Goal**: Analyze quantized streams for rhythmic patterns and generate difficulty variants for each band stream.

**Input**: 3 quantized rhythm streams (low/mid/high) from Phase 1, compatible with existing beat map infrastructure.

**Output**: 9 total streams - 3 difficulty variants (easy/medium/hard) for each of the 3 bands.

### 2.1 Rhythmic Phrase Analysis

**Goal**: Find duplicate rhythmic phrases to identify distinct rhythmic motifs specific to the song. These detected phrases form a **song-specific pattern library** used later for density enhancement.

- [ ] Scan quantized streams for **duplicate multi-beat phrases**:
  - [ ] Check phrase sizes: 1 beat, 2 beats, 4 beats, 8 beats
  - [ ] **Larger identical phrases are more significant** - an 8-beat repeated pattern is more meaningful than a 1-beat repeat
  - [ ] Track phrase occurrences and locations for later reference
- [ ] **Exclude uninteresting patterns** from phrase detection:
  - [ ] Straight quarter notes (no variation)
  - [ ] Straight eighth notes (no variation)
  - [ ] Only patterns with **rhythmic variation** count as significant phrases
- [ ] **Store detected phrases** as a song-specific pattern library:
  - [ ] Phrases are remembered for use in density enhancement (Phase 2.3)
  - [ ] When increasing density, prefer inserting detected patterns over simple interpolation
  - [ ] Patterns are more interesting because they're derived from the song itself
  ```typescript
  interface RhythmicPhrase {
    pattern: GeneratedBeat[];  // The actual rhythm pattern
    sizeInBeats: number;  // 1, 2, 4, or 8
    occurrences: number[];  // Beat indices where this pattern occurs
    significance: number;  // Weighted by size and occurrence count
    hasVariation: boolean;  // Excludes straight quarters/eighths
    availableForReuse: boolean;  // Can be inserted elsewhere for density
  }

  interface PhraseAnalysisResult {
    phrases: RhythmicPhrase[];
    mostSignificantPhrases: RhythmicPhrase[];  // Top N by significance score
    phrasesBySize: Map<number, RhythmicPhrase[]>;  // Grouped by 1, 2, 4, 8 beats
    patternLibrary: RhythmicPhrase[];  // Phrases available for density enhancement
  }
  ```
  ```

### 2.2 Density Analysis & Natural Difficulty Detection

**Goal**: Measure rhythmic density and determine what difficulty the unedited stream naturally represents.

- [ ] Calculate **detected transients per beat** for each stream:
  ```typescript
  interface DensityMetrics {
    transientsPerBeat: number;
    densityCategory: 'sparse' | 'moderate' | 'dense';
    naturalDifficulty: 'easy' | 'medium' | 'hard';
    // What difficulty the unedited stream naturally maps to
  }
  ```
- [ ] Determine **natural difficulty** based on density:
  - [ ] High density (many transients per beat) → Unedited = hard
  - [ ] Medium density → Unedited = medium
  - [ ] Low density (sparse transients) → Unedited = easy
- [ ] Track density per beat and per section for granular analysis
- [ ] This determines the **baseline for simplification/interpolation**

### 2.3 Difficulty Variants Generation

**Goal**: Create 3 difficulty variants for each band stream, with appropriate simplification or interpolation.

- [ ] Generate difficulty variants based on source density:

  **For dense sources (unedited = hard):**
  - [ ] **Hard**: Unedited stream (no changes)
  - [ ] **Medium**: Simplify - remove some subdivisions
  - [ ] **Easy**: Heavy simplification - keep only core beats

  **For moderate sources (unedited = medium):**
  - [ ] **Hard**: Interpolate additional subdivisions between detected transients
  - [ ] **Medium**: Unedited stream (no changes)
  - [ ] **Easy**: Simplify - remove some subdivisions

  **For sparse sources (unedited = easy):**
  - [ ] **Hard**: Heavy density enhancement
    - [ ] **First priority**: Insert detected duplicate patterns from song-specific pattern library (more interesting, song-specific)
    - [ ] **Fallback**: Simple grid interpolation if no suitable pattern exists or doesn't fit
  - [ ] **Medium**: Moderate density enhancement (prefer patterns, fallback to interpolation)
  - [ ] **Easy**: Unedited stream (no changes)

- [ ] **Density enhancement priority order**:
  1. **Detected pattern insertion** - Use a phrase from the pattern library if it fits the available space
  2. **Simple interpolation** - Fill in grid subdivisions between existing transients (like existing interpolation mode)

- [ ] **Mark each variant** with editing status:
  ```typescript
  interface DifficultyVariant {
    difficulty: 'easy' | 'medium' | 'hard';
    stream: GeneratedBeat[];
    isUnedited: boolean;  // true if this is the raw detected stream
    editType: 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';
    editAmount: number;  // 0-1, how much was changed
    patternsInserted?: string[];  // IDs of patterns from library that were inserted
  }

  interface BandDifficultyVariants {
    band: 'low' | 'mid' | 'high';
    variants: {
      easy: DifficultyVariant;
      medium: DifficultyVariant;
      hard: DifficultyVariant;
    };
    densityMetrics: DensityMetrics;
  }
  ```

- [ ] **Density enhancement logic** (for sparse sources needing harder difficulties):
  - [ ] **Pattern insertion** (first priority):
    - [ ] Find suitable gaps in the stream where a detected pattern could fit
    - [ ] Match pattern size to available space (1/2/4/8 beats)
    - [ ] Insert pattern from song-specific library
    - [ ] More interesting than interpolation because pattern is from the song itself
  - [ ] **Simple interpolation** (fallback):
    - [ ] Similar to existing interpolation mode in the codebase
    - [ ] Fill in subdivisions on the grid between detected transients
    - [ ] Respect the per-beat grid decision (16th vs triplet) from Phase 1
  - [ ] Respect the per-beat grid decision (16th vs triplet) from Phase 1
  - [ ] Don't over-fill - maintain musical feel

- [ ] **Simplification logic** (for dense sources needing easier difficulties):
  - [ ] Prioritize keeping transients on strong beats (1, 3)
  - [ ] Remove offbeat subdivisions first
  - [ ] Respect detected phrase boundaries when possible

### 2.4 Tests
- [ ] Unit tests for phrase detection (varying sizes, significance scoring)
- [ ] Unit tests for excluding straight quarter/eighth patterns
- [ ] Unit tests for pattern library storage and retrieval
- [ ] Unit tests for density calculation and categorization
- [ ] Unit tests for natural difficulty detection
- [ ] Unit tests for simplification logic
- [ ] Unit tests for pattern insertion (density enhancement)
- [ ] Unit tests for interpolation logic
- [ ] Verify all 9 output streams are valid quantized rhythms
- [ ] Verify `isUnedited` flag is correct for each variant
- [ ] Verify pattern insertion is preferred over interpolation when patterns available
- [ ] Integration test: process known track and verify difficulty variants

---

## Phase 3: Rhythm Scoring & Composite Generation

**Goal**: Score band streams for interest level, create composite streams by combining the best sections, and orchestrate the final output.

**Input**: 9 difficulty variant streams from Phase 2 (3 difficulties × 3 bands).

**Output**: Final generated rhythm with composite stream for each difficulty.

### 3.1 Band Stream Scoring

**Goal**: Evaluate the "interest" level of each band stream per section.

- [ ] Implement scoring logic for rhythmic interest:
  - [ ] Score based on **Inter-Onset Interval (IOI) density and variance**
  - [ ] Score based on **Syncopation** (weighting transients on offbeats higher)
  - [ ] Consider **phrase significance** from Phase 2 analysis
  ```typescript
  interface SectionScore {
    beatRange: { start: number; end: number };
    band: 'low' | 'mid' | 'high';
    score: number;
    factors: {
      ioiVariance: number;
      syncopationLevel: number;
      phraseSignificance: number;
    };
  }
  ```
- [ ] Score per measure or per 4-measure section
- [ ] Identify which band has the most interesting rhythm for each section

### 3.2 Composite Stream Generation

**Goal**: Create composite streams by slicing together the highest-scoring sections from each band.

- [ ] For each difficulty level, create a composite stream:
  - [ ] For each section, select the band with the highest interest score
  - [ ] Slice that band's rhythm into the composite
  - [ ] Handle transitions between bands smoothly
  ```typescript
  interface CompositeStream {
    difficulty: 'easy' | 'medium' | 'hard';
    stream: GeneratedBeat[];
    sections: CompositeSection[];  // Which band contributed to each section
  }

  interface CompositeSection {
    beatRange: { start: number; end: number };
    sourceBand: 'low' | 'mid' | 'high';
    score: number;  // Why this band won this section
  }
  ```
- [ ] Generate **3 composite streams** (one per difficulty)

### 3.3 Rhythm Generator Orchestration

**Goal**: Create the orchestrator that combines all phases into a cohesive pipeline.

- [ ] Create `RhythmGenerator` in `src/core/generation/RhythmGenerator.ts`
  ```typescript
  interface RhythmGenerationOptions {
    difficulty: DifficultyPreset;
    
    // Which stream to use as primary output
    outputMode: 'composite' | 'low' | 'mid' | 'high';
    
    // User customization
    measureStartOffset: number;  // Offset in beats for "Beat 1"
    minimumTransientIntensity: number;  // Filter weak transients (default: 0.0)
    
    // Seed for reproducibility
    seed?: string;
  }

  class RhythmGenerator {
    constructor(options: RhythmGenerationOptions);

    async generate(
      audioBuffer: AudioBuffer,
      beatMap: BeatMap,
      interpolatedBeatMap: InterpolatedBeatMap
    ): Promise<GeneratedRhythm>;

    // Pipeline steps (orchestrates Phases 1-3)
    private async analyzeMultiBand(audioBuffer: AudioBuffer): Promise<MultiBandResult>;
    private detectTransients(multiBand: MultiBandResult): TransientAnalysis;
    private quantizeTransients(transients: TransientAnalysis, unifiedMap: UnifiedBeatMap): QuantizationResult;
    private analyzePhrasesAndVariants(quantized: QuantizationResult): BandDifficultyVariants[];
    private scoreAndGenerateComposite(variants: BandDifficultyVariants[]): CompositeResult;
  }

  interface GeneratedRhythm {
    // All available streams
    streams: {
      low: DifficultyVariant;
      mid: DifficultyVariant;
      high: DifficultyVariant;
      composite: DifficultyVariant;
    };
    
    // Analysis results
    transientAnalysis: TransientAnalysis;
    quantizationResult: QuantizationResult;
    phraseAnalysis: PhraseAnalysisResult;
    
    // Metadata
    metadata: RhythmMetadata;
  }

  interface RhythmMetadata {
    difficulty: DifficultyPreset;
    bandsAnalyzed: ('low' | 'mid' | 'high')[];
    transientsDetected: number;
    transientsFilteredByIntensity: number;
    densityValidationRetries: number;
    phrasesDetected: number;
    averageDensity: number;
    generationConfig: RhythmGenerationOptions;
  }
  ```

### 3.4 Pipeline Implementation
- [ ] Implement the full rhythm generation pipeline
- [ ] Add progress callbacks for long-running generation
- [ ] Support cancellation
- [ ] Add caching for intermediate results

### 3.5 Configuration Presets
- [ ] Create preset configurations
  ```typescript
  const RHYTHM_PRESETS = {
    casual: {
      difficulty: 'easy',
      outputMode: 'composite',
    },
    standard: {
      difficulty: 'medium',
      outputMode: 'composite',
    },
    challenge: {
      difficulty: 'hard',
      outputMode: 'composite',
    },
    bass: {
      difficulty: 'medium',
      outputMode: 'low',  // Use low-frequency band directly
    },
    fullIntensity: {
      difficulty: 'hard',
      outputMode: 'composite',
    }
  };
  ```

### 3.6 Tests
- [ ] Unit tests for scoring logic
- [ ] Unit tests for composite generation
- [ ] Integration tests for full pipeline (all 3 phases)
- [ ] Performance tests (generation time < 5 seconds for 3-minute song)
- [ ] Verify all 4 output streams per difficulty are valid
- [ ] Verify composite sections reference correct source bands

---

## Phase 4: API & Integration

**Goal**: Expose the rhythm generation system through a clean API.

### 4.1 Public API
- [ ] Add exports to `src/index.ts`
- [ ] Create convenience methods on `AudioAnalyzer`
  ```typescript
  // On AudioAnalyzer class
  async generateRhythm(
    audioUrl: string,
    options: RhythmGenerationOptions
  ): Promise<GeneratedRhythm>;
  ```

### 4.2 Serialization
- [ ] Add `toJSON`/`fromJSON` for `GeneratedRhythm`
- [ ] Add file save/load methods
- [ ] Ensure metadata is preserved

### 4.3 Tests
- [ ] API integration tests
- [ ] Serialization round-trip tests

---

## Phase 5: Documentation

**Goal**: Ensure all new features are properly documented.

### 5.1 Code Documentation
- [ ] JSDoc for all public types and interfaces
- [ ] Usage examples in code comments
- [ ] Inline comments for complex algorithms (especially transient detection strategies)

### 5.2 Update DATA_ENGINE_REFERENCE.md
- [ ] Add new section: "Procedural Rhythm Generation"
  - [ ] Document `RhythmGenerator` class and usage
  - [ ] Document `MultiBandAnalyzer` and frequency bands
  - [ ] Document `TransientDetector` and detection methods
  - [ ] Document `SubdivisionGenerator` and pattern system
  - [ ] Add code examples for common use cases
  - [ ] Document the 4 output streams (low/mid/high/composite)

### 5.3 Update BEAT_DETECTION.md
- [ ] Add section on transient detection (separate from beat detection)
- [ ] Document how transients cross-reference with beat maps
- [ ] Explain multi-band analysis approach
- [ ] Document rhythm scoring and slicing algorithm

---

## Dependencies

- None - this plan uses existing audio utilities and beat detection
- **Note**: The companion plan `pitch-detection-button-mapping.md` depends on this plan's output

---

## Questions/Unknowns

### Technical Questions
1. **Transient detection accuracy**: How to handle overlapping transients in dense music?
   - ✅ **Resolved**: Implemented density validation with exponential sensitivity reduction (3 retries)

2. **Pattern memory**: How to avoid repetitive patterns without sounding random?
   - ✅ **Resolved**: Song-specific pattern library derived from detected duplicate phrases. When increasing density, prefer inserting detected patterns (song-specific, more interesting) over simple interpolation.

3. **Swing detection**: Can swing feel be reliably detected from transient timing?
   - Consider: Statistical analysis of micro-timing deviations (future enhancement)

### Design Questions
1. **Band selection**: Should band selection be automatic or configurable?
   - ✅ **Resolved**: MVP uses 3 bands (low/mid/high), with 6-band expansion as future consideration

2. **Composite vs individual streams**: Which should be the "default" output?
   - Recommendation: Composite as default, others available for advanced use

3. **Transient intensity filtering**: Should weak transients be filtered?
   - ✅ **Resolved**: Default to catch all (0.0), expose `minimumTransientIntensity` parameter for user filtering

---

## Success Criteria

1. Generated rhythms feel "musical" - patterns match the audio transients
2. Difficulty settings produce noticeably different rhythmic density
3. Generation is deterministic when given same seed
4. Generation completes in reasonable time (< 5 seconds for 3-minute song)
5. All 12 streams are valid and usable (3 bands × 3 difficulties + 3 composites)
6. Per-beat grid detection (16th vs triplet) produces accurate results
7. Phrase detection finds meaningful rhythmic patterns in the source material
8. Difficulty variants correctly marked as edited vs unedited
9. API is simple and discoverable
10. Documentation is complete and accurate
