# Procedural Rhythm Subdivision Generation - Implementation Plan

## Overview

This plan focuses on automatically generating interesting subdivision patterns over quarter note beat maps. The goal is to take an existing `UnifiedBeatMap` (quarter notes) and procedurally create rhythmic patterns that:

1. Match the music's energy and transients
2. Provide configurable difficulty levels (easy/medium/hard)
3. Feel "musical" rather than random
4. Output a rich `GeneratedRhythm` containing:
   - 3 difficulty variants (easy/medium/hard) of the composite stream
   - Individual band streams (low/mid/high) for advanced use
   - Analysis results (transients, phrases, density metrics)

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
GeneratedRhythm (difficulty variants + band streams + analysis)
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
- [x] Create `BandPassFilter` utility in `audioUtils.ts`
  - [x] Implement Butterworth band-pass filter
  - [x] Default to **8th order** (48 dB/octave slope) for clean band separation
  - [x] Support configurable order (higher = steeper cutoff, more phase distortion)
  - [x] Use cascaded 2nd-order biquad sections (4 stages = 8th order)
  ```typescript
  interface BandPassFilterConfig {
    order: number;           // Default: 8 (48 dB/octave)
    qFactor?: number;        // Optional Q adjustment
  }
  ```

  > **Why 8th Order**: Provides sharp enough cutoff (48 dB/octave) to minimize band bleed at crossover points (500Hz, 2000Hz) without introducing significant phase distortion or ringing artifacts that occur with higher orders (10th+).
- [x] Define frequency band presets
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
    { name: 'mid', lowHz: 500, highHz: 2000, description: 'Mid frequencies (vocals, snare body, lead instruments)' },
    { name: 'high', lowHz: 2000, highHz: 20000, description: 'High frequencies (hi-hats, cymbals, harmonics, air)' },
  ];
  ```

> **Future Consideration**: Expand to 6 bands (sub, bass, lowMid, mid, highMid, high) for finer-grained rhythm detection in complex material. This would increase processing time approximately 2x.

### 1.2 Multi-Band Analyzer
- [x] Create `MultiBandAnalyzer` class in `src/core/analysis/MultiBandAnalyzer.ts`
  - [x] Accept `AudioBuffer` as input
  - [x] Apply band-pass filters for each band
  - [x] Generate separate onset strength envelopes per band
  - [x] Calculate per-band energy over time
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
- [x] Create `TransientDetector` class in `src/core/analysis/beat/TransientDetector.ts`
  - [x] Implement varied detection strategies tailored to the frequency band:
    - [x] **Low Band**: Energy-based detection / Subband Envelope (great for clear kick/bass transients)
    - [x] **Mid Band**: Spectral Flux algorithm (reliable for snare, vocals, and harmonic onsets)
    - [x] **High Band**: High-Frequency Content (HFC) / Spectral Flux (ideal for hi-hats, cymbals, air)
  - [x] Add adaptive thresholding to adjust to the song's dynamic range
  - [x] Support concurrent per-band transient detection
  - [x] **Note**: Rhythmic quantization to the beat map grid happens in section 1.4, not here.
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
- [x] Calculate minimum allowed interval based on tempo (16th note duration = quarterNoteInterval / 4)
- [x] Check if any two consecutive transients are closer than the minimum interval
- [x] If too dense, trigger sensitivity adjustment with retry logic:
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
- [x] Implement exponential backoff for sensitivity reduction
- [x] Track retry count and cumulative sensitivity reduction in metadata

#### 1.4.2 Intensity Filtering
- [x] Support optional filtering by transient intensity:
  ```typescript
  interface QuantizationConfig {
    minimumTransientIntensity: number;  // Default: 0.0 (catch all), user can set higher to filter weak transients
    // ... other config
  }
  ```
- [x] Filter transients below intensity threshold before quantization
- [x] Log how many transients were filtered for transparency

#### 1.4.3 Per-Beat Grid Detection & Quantization

**Goal**: For each beat, determine whether transients fit better on a straight 16th note grid or an 8th note triplet grid, then quantize to the chosen grid.

##### Interfaces

- [x] **Grid decision metadata** (produced during grid detection):
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

- [x] **Core beat type** - a single quantized note:
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

- [x] **Per-band rhythm map** - a complete rhythm chart for one frequency band:
  ```typescript
  interface GeneratedRhythmMap {
    audioId: string;
    duration: number;
    beats: GeneratedBeat[];      // All quantized beats for this band
    gridDecisions: GridDecision[];  // Per-beat grid choices (16th vs triplet)
  }
  ```

- [x] **Complete Phase 1 output** - all 3 band streams plus metadata:
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

- [x] **Per-beat grid detection**:
  - [x] For each beat, extract transients within that beat's time range
  - [x] Lay out a **straight 16th note grid** for the beat
  - [x] Calculate **average ms offset per transient** from the 16th grid (total offset / transient count)
  - [x] Lay out an **8th note triplet grid** for the beat
  - [x] Calculate **average ms offset per transient** from the triplet grid (total offset / transient count)
  - [x] **Whichever grid has smaller average offset** = use that grid for this beat
  - [x] Record decision in `GridDecision` for each beat
- [x] **Quantize to chosen grid**:
  - [x] For each beat, use the selected grid (16th or triplet)
  - [x] Snap transients to nearest grid point (within tolerance)
  - [x] Create `GeneratedBeat` for each quantized transient
  - [x] Track quantization error for debugging
- [x] **Handle edge cases**:
  - [x] Transients too far from any grid point (discard or mark as "unquantized")
  - [x] Multiple transients snapping to same grid point (keep strongest)
  - [x] Beats with no transients (skip, no grid decision needed)

#### 1.4.4 Phase 1 Output Summary

**Output**: `QuantizedBandStreams` containing 3 quantized rhythm streams (low/mid/high).

- [x] Each stream is a `GeneratedRhythmMap` - a complete, playable rhythm chart
- [x] Streams are compatible with existing beat map infrastructure
- [x] No manual-subdivision metadata (`SubdivisionConfig`, `isDetected`, etc.) - those are manual-path concerns

### 1.5 Tests
- [x] Unit tests for band-pass filter
- [x] Unit tests for `MultiBandAnalyzer`
- [x] Unit tests for `TransientDetector`
- [x] Unit tests for density validation retry logic
- [x] Unit tests for intensity filtering
- [x] Unit tests for rhythmic quantization
- [x] Integration test: detect transients on known drum track
- [x] Verify quantization aligns with beat map grid
- [x] Verify retry logic reduces sensitivity correctly (exponential backoff)
- [x] Verify all 3 band streams are valid quantized rhythms

---

## Phase 2: Rhythmic Phrase Analysis & Density Metrics

**Goal**: Analyze quantized streams for rhythmic patterns and measure density to determine natural difficulty.

**Input**: 3 quantized rhythm streams (low/mid/high) from Phase 1, compatible with existing beat map infrastructure.

**Output**: 3 streams (unchanged) + phrase library + density metrics for each band. Difficulty variants are generated in Phase 3 after composite creation.

### 2.1 Rhythmic Phrase Analysis

**Goal**: Find duplicate rhythmic phrases to identify distinct rhythmic motifs specific to the song. These detected phrases form a **song-specific pattern library** used later for density enhancement.

- [x] Scan quantized streams for **duplicate multi-beat phrases** (per band):
  - [x] Check phrase sizes: 1 beat, 2 beats, 4 beats, 8 beats
  - [x] **Larger identical phrases are more significant** - an 8-beat repeated pattern is more meaningful than a 1-beat repeat
  - [x] **More occurrences increases significance** - a phrase that appears 10 times is more noteworthy than one that appears twice
  - [x] Track phrase occurrences with timestamps for pitch detection integration
  - [x] Record `sourceBand` for each phrase (which frequency band it was detected in)
  - [x] Store `startTimestamp`/`endTimestamp` for each occurrence (enables pitch analysis of that audio segment)
- [x] **Exclude uninteresting patterns** from phrase detection:
  - [x] Straight quarter notes (no variation)
  - [x] Straight eighth notes (no variation)
  - [x] Only patterns with **rhythmic variation** count as significant phrases
- [x] **Store detected phrases** as a song-specific pattern library:
  - [x] Phrases are remembered for use in density enhancement (Phase 2.3)
  - [x] When increasing density, prefer inserting detected patterns over simple interpolation
  - [x] Patterns are more interesting because they're derived from the song itself
  ```typescript
  interface PhraseOccurrence {
    beatIndex: number;       // Index into UnifiedBeatMap.beats[]
    startTimestamp: number;  // Start time in seconds (for pitch analysis reference)
    endTimestamp: number;    // End time in seconds
  }

  interface RhythmicPhrase {
    pattern: GeneratedBeat[];  // The actual rhythm pattern
    sizeInBeats: number;  // 1, 2, 4, or 8
    sourceBand: 'low' | 'mid' | 'high';  // Which frequency band this phrase was detected in
    occurrences: PhraseOccurrence[];  // All locations where this pattern occurs
    significance: number;  // Weighted by size and occurrence count
    hasVariation: boolean;  // Excludes straight quarters/eighths
    availableForReuse: boolean;  // Can be inserted elsewhere for density
  }

  interface PhraseAnalysisResult {
    phrases: RhythmicPhrase[];
    phrasesByBand: Map<'low' | 'mid' | 'high', RhythmicPhrase[]>;  // Phrases grouped by source band
    mostSignificantPhrases: RhythmicPhrase[];  // Top N by significance score
    phrasesBySize: Map<number, RhythmicPhrase[]>;  // Grouped by 1, 2, 4, 8 beats
    patternLibrary: RhythmicPhrase[];  // Phrases available for density enhancement
  }
  ```

  > **Note for Pitch Detection Integration**: The `sourceBand` and `PhraseOccurrence.timestamp` fields are essential for the companion pitch detection plan. When analyzing pitch for a detected phrase, the pitch detector will:
  > 1. Use `sourceBand` to know which frequency range to analyze
  > 2. Use `startTimestamp`/`endTimestamp` to extract the exact audio segment
  > 3. Associate detected pitches with the same phrase occurrences across the song

### 2.2 Density Analysis & Natural Difficulty Detection

**Goal**: Measure rhythmic density and determine what difficulty the unedited stream naturally represents.

- [x] Calculate **detected transients per beat** for each stream:
  ```typescript
  interface DensityMetrics {
    transientsPerBeat: number;
    densityCategory: 'sparse' | 'moderate' | 'dense';
    naturalDifficulty: 'easy' | 'medium' | 'hard';
    // What difficulty the unedited stream naturally maps to
  }
  ```
- [x] Determine **natural difficulty** based on density:
  - [x] High density (many transients per beat) → Unedited = hard
  - [x] Medium density → Unedited = medium
  - [x] Low density (sparse transients) → Unedited = easy
- [x] Track density per beat and per section for granular analysis
- [x] This determines the **baseline for simplification/interpolation**

### 2.3 Tests
- [x] Unit tests for phrase detection (varying sizes, significance scoring)
- [x] Unit tests for excluding straight quarter/eighth patterns
- [x] Unit tests for pattern library storage and retrieval
- [x] Unit tests for `sourceBand` tracking (verify phrases are attributed to correct band)
- [x] Unit tests for `PhraseOccurrence` timestamps (verify start/end times are accurate)
- [x] Unit tests for density calculation and categorization
- [x] Unit tests for natural difficulty detection
- [x] Verify phrase library is populated correctly
- [x] Verify density metrics are accurate per band
- [x] Integration test: process known track and verify phrase/density analysis

---

## Phase 3: Scoring, Composite Generation & Difficulty Variants

**Goal**: Score band streams for interest level, create a composite stream by combining the best sections, then generate difficulty variants from the composite.

**Input**: 3 quantized rhythm streams (low/mid/high) from Phase 1 + phrase library + density metrics from Phase 2.

**Output**: `GeneratedRhythm` containing:
- 3 difficulty variants (easy/medium/hard) of the composite stream
- Individual band streams (low/mid/high) for reference
- Analysis results (transient, quantization, phrase)
- Rich metadata

### 3.1 Band Stream Scoring

**Goal**: Evaluate the "interest" level of each band stream per section.

- [x] Implement scoring logic for rhythmic interest:
  - [x] Score based on **Inter-Onset Interval (IOI) density and variance**
  - [x] Score based on **Syncopation** (weighting transients on offbeats higher)
  - [x] Consider **phrase significance** from Phase 2 analysis
  - [x] Added density factor (bell curve for optimal density scoring)
  ```typescript
  interface SectionScore {
    beatRange: { start: number; end: number };
    band: 'low' | 'mid' | 'high';
    score: number;
    factors: {
      ioiVariance: number;
      syncopationLevel: number;
      phraseSignificance: number;
      densityFactor: number;
    };
  }
  ```
- [x] Score per 2-measure section
- [x] Identify which band has the most interesting rhythm for each section

### 3.2 Composite Stream Generation

**Goal**: Create a single composite stream by slicing together the highest-scoring sections from each band.

- [x] Create the composite stream:
  - [x] For each section, select the band with the highest interest score
  - [x] Slice that band's rhythm into the composite
  - [x] Handle transitions between bands smoothly
  ```typescript
  interface CompositeStream {
    beats: CompositeBeat[];          // All beats combined from winning sections
    sections: CompositeSection[];    // Which band contributed to each section
    naturalDifficulty: 'easy' | 'medium' | 'hard';  // Determined by density analysis
    metadata: {
      totalBeats: number;
      sectionCount: number;
      beatsPerBand: { low: number; mid: number; high: number };
      sectionsPerBand: { low: number; mid: number; high: number };
    };
  }

  interface CompositeSection {
    beatRange: { start: number; end: number };
    sourceBand: 'low' | 'mid' | 'high';
    score: number;  // Why this band won this section
    margin: number; // Margin of victory over runner-up
  }

  interface CompositeBeat extends GeneratedBeat {
    sourceBand: 'low' | 'mid' | 'high';  // Which band this beat originated from
  }
  ```
- [x] Generate **1 composite stream** (unedited baseline)
- [x] Determine the composite's **natural difficulty** based on Phase 2 density metrics
- [x] Filter out sections where no band has any beats (empty section handling)
- [x] Deduplicate beats at the same timestamp (keep highest intensity)

### 3.3 Difficulty Variant Generation

**Goal**: Generate the 2 other difficulty variants from the composite stream.

Since the composite already represents one difficulty level (its natural difficulty), only 2 additional variants need to be created.

#### 3.3.1 Subdivision Limits by Difficulty

Each difficulty level has constraints on the maximum subdivision density allowed. These limits ensure appropriate playability curves across difficulties.

| Difficulty | Max Subdivision | Allowed Grid Types |
|------------|-----------------|-------------------|
| **Easy** | 8th notes, quarter note triplets | `straight_8th`, `quarter_triplet` |
| **Medium** | 16th notes | `straight_16th`, `triplet_8th`, all types |
| **Hard** | 16th notes | `straight_16th`, `triplet_8th`, all types |

> **Key Constraint**: Easy difficulty excludes both `straight_16th` and `triplet_8th` grids. This is a stricter constraint than density alone - even if an Easy stream has low note density, it must not contain rapid subdivisions.

- [x] Define `SUBDIVISION_LIMITS` constant mapping difficulty to allowed grid types
  - **Implementation**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`
  - Added `ExtendedGridType` with `straight_8th` and `quarter_triplet` for Easy
  - Added `SUBDIVISION_LIMITS` constant mapping each difficulty to allowed grid types
  - Added `ALL_GRID_TYPES` constant listing all 4 grid types
  - Added helper functions: `isGridTypeAllowed`, `getAllowedGridTypes`, `convertToAllowedGridType`
  - Added `validateSubdivisionLimits` for validation against limits
  - Added `DifficultyVariantGenerator` class structure with placeholder variant generation
- [x] Validate generated variants against subdivision limits
  - Added `validateVariant()` private method to check each variant after generation
  - Logs warnings if violations are found (indicates bugs in generation logic)
  - Logs success message when `logConversions` config is enabled
- [x] When simplifying to Easy, snap 16th notes to nearest 8th note grid
  - Implemented `simplifyBeats()` method with full conversion logic
  - Implemented `convertBeatGridType()` method for per-beat conversion
  - 16th positions 0,1 → 8th position 0; 16th positions 2,3 → 8th position 2
- [x] When simplifying to Easy, snap 8th note triplets to nearest quarter note triplet
  - All triplet positions (0, 1, 2) snap to quarter triplet position 0
- [x] Log any subdivision conversions for debugging
  - Added logging when `logConversions` config is enabled
  - Logs each conversion with beat index, position, and conversion type
  - Logs validation results after generation

#### 3.3.2 Variant Generation by Natural Difficulty

- [x] Determine which variants to generate based on composite's natural difficulty:
  - **Implementation**: `src/core/analysis/beat/DifficultyVariantGenerator.ts`
  - `generateVariant()` method routes to correct strategy based on natural difficulty
  - `needsSimplification()` and `needsEnhancement()` helper methods determine edit type
  - `isHeavySimplification()` identifies hard→easy transitions requiring aggressive filtering

  **If composite is naturally hard (dense):**
  - [x] **Hard**: Composite (unedited) - natural difficulty variant marked as unedited
  - [x] **Medium**: Simplify - remove some subdivisions (standard simplification)
  - [x] **Easy**: Heavy simplification - keep only core beats
    - **Implementation**: `filterBeatsForHeavySimplification()` method
    - Prioritizes strong beats (beats 1 and 3 of each measure)
    - Keeps downbeats on weak beats if high intensity
    - Removes offbeats unless very high intensity
    - Uses `isStrongBeat()` helper to identify beats 1 and 3 (beatIndex % 4 == 0 or 2)

  **If composite is naturally medium (moderate):**
  - [x] **Hard**: Interpolate additional subdivisions between detected transients
  - [x] **Medium**: Composite (unedited) - natural difficulty variant marked as unedited
  - [x] **Easy**: Simplify - remove some subdivisions (standard simplification)

  **If composite is naturally easy (sparse):**
  - [x] **Hard**: Heavy density enhancement using pattern library and interpolation
  - [x] **Medium**: Moderate density enhancement
  - [x] **Easy**: Composite (unedited) - natural difficulty variant marked as unedited

- [x] **Density enhancement** (for sparse composites needing harder difficulties):
  - [x] **First priority**: Insert detected patterns from phrase library whenever possible (song-specific, more interesting)
  - [x] **Fallback**: Simple grid interpolation if no suitable pattern exists
  - [x] Respect per-beat grid decisions (16th vs triplet) from Phase 1

- [x] **Simplification** (for dense composites needing easier difficulties):
  - [x] **Enforce subdivision limits** (see 3.3.1) - this is the primary constraint for Easy
  - [x] Prioritize keeping transients on strong beats (1, 3)
    - Strong beats identified as beatIndex % 4 == 0 or 2 (beats 1 and 3 of 4/4 measure)
  - [x] Remove offbeat subdivisions first (gridPosition 1 and 3 prioritized for removal)
  - [x] Snap removed subdivisions to nearest allowed grid (e.g., 16th → 8th for Easy)
  - [ ] Respect detected phrase boundaries when possible (not yet implemented)

- [x] **Mark each variant**:
  ```typescript
  interface DifficultyVariant {
    difficulty: 'easy' | 'medium' | 'hard';
    stream: GeneratedBeat[];
    isUnedited: boolean;  // true for the composite's natural difficulty
    editType: 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';
    editAmount: number;  // 0-1, how much was changed
    patternsInserted?: string[];  // IDs of patterns inserted (if any)
  }
  ```

### 3.4 Rhythm Generator Orchestration

**Goal**: Create the orchestrator that combines all phases into a cohesive pipeline.

- [x] Create `RhythmGenerator` in `src/core/generation/RhythmGenerator.ts`
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
    private quantizeTransients(transients: TransientAnalysis, unifiedMap: UnifiedBeatMap): QuantizedBandStreams;
    private analyzePhrasesAndDensity(quantized: QuantizedBandStreams): PhraseAnalysisResult & DensityMetrics;
    private scoreAndGenerateComposite(streams: QuantizedBandStreams, analysis: PhraseAnalysisResult): CompositeStream;
    private generateDifficultyVariants(composite: CompositeStream): DifficultyVariant[];
  }

  interface GeneratedRhythm {
    // 3 difficulty variants of the composite stream
    difficultyVariants: {
      easy: DifficultyVariant;
      medium: DifficultyVariant;
      hard: DifficultyVariant;
    };

    // Individual band streams (for reference/advanced use)
    bandStreams: {
      low: GeneratedRhythmMap;
      mid: GeneratedRhythmMap;
      high: GeneratedRhythmMap;
    };

    // The composite (unedited baseline)
    composite: CompositeStream;

    // Analysis results
    transientAnalysis: TransientAnalysis;
    quantizationResult: QuantizedBandStreams;
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

### 3.5 Pipeline Implementation
- [ ] Implement the full rhythm generation pipeline
- [ ] Add progress callbacks for long-running generation
- [ ] Support cancellation
- [ ] Add caching for intermediate results

### 3.6 Configuration Presets
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
    }
  };
  ```

### 3.7 Tests
- [x] Unit tests for scoring logic
- [x] Unit tests for composite generation
- [x] Unit tests for difficulty variant generation (simplification)
  - Tests cover: easy/medium/hard variants, unedited flag, editType, editAmount
  - Heavy simplification tested with beat prioritization
- [x] Unit tests for difficulty variant generation (density enhancement)
- [x] Unit tests for subdivision limits enforcement (Easy has no 16th/8th-triplets)
- [x] Unit tests for pattern insertion from phrase library
- [ ] Integration tests for full pipeline (all 3 phases)
- [ ] Performance tests (generation time < 5 seconds for 3-minute song)
- [ ] Verify 3 difficulty variants are valid
- [ ] Verify `isUnedited` flag is correct for natural difficulty variant
- [ ] Verify composite sections reference correct source bands
- [ ] Verify Easy variant contains only allowed grid types (`straight_8th`, `quarter_triplet`)

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

**Goal**: Ensure all new features are properly documented, following the DATA_ENGINE_REFERENCE.md style guide.

### 5.1 Code Documentation
- [ ] JSDoc for all public types and interfaces
- [ ] Usage examples in code comments
- [ ] Inline comments for complex algorithms (especially transient detection strategies)

### 5.2 Update DATA_ENGINE_REFERENCE.md

**Style**: Per the style guide, this file prioritizes scannable efficiency. No code examples—use structured tables, location links, and cross-references instead.

- [ ] Add new section: "Procedural Rhythm Generation"
  - [ ] Add location links (italicized format) to all major definitions:
    - [ ] `RhythmGenerator` → *[src/core/generation/RhythmGenerator.ts](src/core/generation/RhythmGenerator.ts)*
    - [ ] `MultiBandAnalyzer` → *[src/core/analysis/MultiBandAnalyzer.ts](src/core/analysis/MultiBandAnalyzer.ts)*
    - [ ] `TransientDetector` → *[src/core/analysis/beat/TransientDetector.ts](src/core/analysis/beat/TransientDetector.ts)*
  - [ ] Create structured tables for methods (with Returns/Description columns)
  - [ ] Create frequency bands reference table (low/mid/high Hz ranges)
  - [ ] Create output streams table (low/mid/high/composite with purpose descriptions)
  - [ ] Create phrase analysis table documenting `RhythmicPhrase` and `PhraseOccurrence` fields (for pitch detection integration)
  - [ ] Add cross-references to BEAT_DETECTION.md for algorithm details
  - [ ] Add cross-reference to pitch-detection-button-mapping.md for phrase/pitch correlation
  - [ ] Add "Also known as" aliases where helpful (e.g., *transient detection* ↔ *onset detection*)

### 5.3 Update BEAT_DETECTION.md

**Purpose**: This is the specialized guide where explanations, algorithm details, and usage examples belong.

- [ ] Add section on transient detection (separate from beat detection)
  - [ ] Explain multi-band analysis approach with diagrams/examples
  - [ ] Document the 3 detection strategies: Energy-based, Spectral Flux, HFC
  - [ ] Explain how transients cross-reference with beat maps
- [ ] Add section on rhythm quantization
  - [ ] Explain per-beat grid detection (16th vs triplet)
  - [ ] Document density validation and sensitivity retry logic
- [ ] Add section on scoring and composite generation
  - [ ] Explain IOI variance, syncopation scoring, phrase significance
  - [ ] Document the slicing algorithm for composite creation
- [ ] Add section on phrase detection
  - [ ] Explain how phrases are detected per-band (low/mid/high)
  - [ ] Document that each phrase stores `sourceBand` indicating its frequency band origin
  - [ ] Document that each occurrence stores `startTimestamp`/`endTimestamp` for precise audio location
- [ ] Add usage examples for common workflows:
  - [ ] Basic usage with `AudioAnalyzer.generateRhythm()`
  - [ ] Generate rhythms with default settings
  - [ ] Filter by transient intensity
  - [ ] Select specific output streams (composite vs band-specific)
  - [ ] Working with difficulty variants
  - [ ] Accessing individual band streams
  - [ ] Custom configuration presets

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
5. All 3 difficulty variants are valid and usable
6. Per-beat grid detection (16th vs triplet) produces accurate results
7. Phrase detection finds meaningful rhythmic patterns in the source material
8. Difficulty variants correctly marked as edited vs unedited
