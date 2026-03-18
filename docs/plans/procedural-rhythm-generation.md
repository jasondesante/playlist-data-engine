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

  const FREQUENCY_BANDS: FrequencyBand[] = [
    { name: 'sub', lowHz: 20, highHz: 60, description: 'Sub bass' },
    { name: 'bass', lowHz: 60, highHz: 250, description: 'Bass/kick' },
    { name: 'lowMid', lowHz: 250, highHz: 500, description: 'Low mids/snare body' },
    { name: 'mid', lowHz: 500, highHz: 2000, description: 'Mids/vocals' },
    { name: 'highMid', lowHz: 2000, highHz: 4000, description: 'High mids/presence' },
    { name: 'high', lowHz: 4000, highHz: 20000, description: 'Highs/air' },
  ];
  ```

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
  - [ ] Cross-reference transients with quarter note beat map (Rhythmic Quantization & Grid Mapping) to lock absolute timestamps to a rhythmic grid. **Scope is strictly limited to snapping to 16th notes and 8th note triplets.**
  ```typescript
  interface TransientResult {
    timestamp: number;
    intensity: number;
    band: string;  // Which frequency band detected this
    detectionMethod: 'energy' | 'spectral_flux' | 'hfc';
    nearestBeat?: {
      index: number;
      distance: number;  // How far from quarter note grid
    };
  }

  interface TransientAnalysis {
    transients: TransientResult[];
    bandTransients: Map<string, TransientResult[]>;
    rhythmSuggestions: RhythmSuggestion[];
  }
  ```

### 1.4 Rhythm Extraction & Scoring Engine
- [ ] Create rhythm extraction logic that maps transients into discrete rhythmic phrases for *each* frequency band
- [ ] Implement scoring logic to evaluate the "interest" level of rhythms within each band over a given window (e.g., 1 measure):
  - [ ] Score based on Inter-Onset Interval (IOI) density and variance
  - [ ] Score based on Syncopation (weighting transients that land on offbeats or micro-subdivisions higher than simple downbeats)
- [ ] Implement a **Rhythm Slicer/Combiner**. The program will evaluate the scores of the Low, Mid, and High band rhythms for a given section, slicing pieces from the strongest/most interesting bands into a final, composite generated subdivision map
  - [ ] **Crucially**, the system must provide access to all 4 streams: the fully preserved, quantized rhythmic phrases for Bass, Mid, and High bands, plus the final aggregated composite stream (which will be the primary, highest-quality map)
  ```typescript
  interface RhythmPhrase {
    band: string;  // Low, Mid, High
    measureIndex: number;
    subdivisions: SubdivisionType[];
    interestScore: number;  // Based on syncopation and density
  }

  // A complete stream mapped onto the beats
  interface RhythmStream extends SubdividedBeatMap {
    bandSource: 'bass' | 'mid' | 'high' | 'composite';
  }

  interface RhythmSuggestion {
    beatIndex: number;
    suggestedSubdivision: SubdivisionType;
    confidence: number;
    source: 'transient' | 'energy' | 'pattern' | 'composite_slicer';
    dominantBand: string;  // Which band won the slice for this section
  }
  ```
- [ ] Detect and extract common patterns from the transients:
  - [ ] Offbeat patterns (transients on &)
  - [ ] Syncopation (transients between grid)
  - [ ] Triple feel (transients suggest triplet subdivision)
  - [ ] Swing feel (consistent micro-timing deviation from mathematical grid)

### 1.5 Tests
- [ ] Unit tests for band-pass filter
- [ ] Unit tests for `MultiBandAnalyzer`
- [ ] Unit tests for `TransientDetector`
- [ ] Integration test: detect transients on known drum track
- [ ] Verify cross-referencing with existing beat maps

---

## Phase 2: Procedural Subdivision Generator

**Goal**: Automatically generate interesting subdivision patterns based on audio analysis and difficulty settings.

### 2.1 Subdivision Pattern Types
- [ ] Define subdivision pattern vocabulary
  ```typescript
  type PatternCategory =
    | 'basic'      // quarter, half
    | 'subdivision' // eighth, sixteenth
    | 'triplet'    // triplet8, triplet4
    | 'syncopated' // offbeat8, swing
    | 'sparse'     // dotted4, dotted8, rest
    | 'mixed';     // combinations

  interface SubdivisionPattern {
    name: string;
    category: PatternCategory;
    subdivisions: SubdivisionType[];
    measures: number;  // Pattern length in measures
    difficulty: number; // 1-10 scale
    tags: string[];  // 'groovy', 'intense', 'chill', etc.
  }
  ```
- [ ] Create pattern library with common rhythmic patterns
  - [ ] Basic 4/4 patterns (quarter notes, basic eighth)
  - [ ] Syncopation patterns (offbeats, anticipations)
  - [ ] Triplet patterns (shuffle feel, 6/8 feel)
  - [ ] Mixed patterns (varying subdivisions per measure)
  - [ ] Rest patterns (breathing room)

### 2.2 Subdivision Generator Config
- [ ] Define generation configuration
  ```typescript
  interface SubdivisionGeneratorConfig {
    difficulty: DifficultyPreset;

    // User Customization
    measureStartOffset: number; // Offset in beats to designate "Beat 1" of a measure (since automatic measure detection is unreliable). This is an exposed, user-tweakable parameter.

    // Density settings
    maxDensity: SubdivisionType;  // 'quarter', 'eighth', 'sixteenth'
    averageDensity: number;  // 0-1, target average density

    // Pattern settings
    patternLength: number;  // Measures per pattern
    variationProbability: number;  // 0-1
    repeatPatternMeasures: number;  // How many measures to repeat a pattern

    // Audio influence
    useAudioSuggestions: boolean;
    audioSuggestionWeight: number;  // 0-1, how much to follow audio hints
    preferredBands: string[];  // Which bands to trust more

    // Musical constraints
    avoidConsecutiveRests: boolean;
    maxConsecutiveDense: number;  // Max beats of high density in a row
    enforceDownbeats: boolean;  // Always have beat 1
  }

  // Difficulty presets
  const DIFFICULTY_CONFIGS: Record<DifficultyPreset, SubdivisionGeneratorConfig>
  ```

### 2.3 Subdivision Generator Class
- [ ] Create `SubdivisionGenerator` in `src/core/generation/SubdivisionGenerator.ts`
  - [ ] Input: `UnifiedBeatMap`, optional `TransientAnalysis`, config
  - [ ] Output: `GeneratedSubdivisionResult`

  ```typescript
  class SubdivisionGenerator {
    constructor(config: SubdivisionGeneratorConfig);

    generate(
      unifiedBeatMap: UnifiedBeatMap,
      transientAnalysis?: TransientAnalysis
    ): GeneratedSubdivisionResult;

    // Pattern selection methods
    private selectPatternForMeasure(
      measureIndex: number,
      transientHints: RhythmSuggestion[],
      previousPattern: SubdivisionPattern | null
    ): SubdivisionPattern;

    // Variation methods
    private applyVariation(
      pattern: SubdivisionPattern,
      config: SubdivisionGeneratorConfig
    ): SubdivisionPattern;

    // Audio-influenced selection
    private getAudioInfluencedSubdivision(
      beatIndex: number,
      transientHints: RhythmSuggestion[]
    ): SubdivisionType | null;
  }

  interface GeneratedSubdivisionResult {
    config: SubdivisionConfig;
    // All 4 streams of generated rhythmic phrases, fully compatible with existing beat maps
    streams: {
      bass: SubdividedBeatMap;
      mid: SubdividedBeatMap;
      high: SubdividedBeatMap;
      composite: SubdividedBeatMap; // The primary, highest-quality combined map
    };
    metadata: {
      patternsUsed: string[];
      audioInfluencedBeats: number;
      averageDensity: number;
      difficultyScore: number;
    };
  }
  ```

### 2.4 Difficulty-Based Generation Rules
- [ ] Implement difficulty-specific logic

  **Easy:**
  - Default to quarter notes
  - Occasional eighth notes on strong beats
  - Many rests for breathing room
  - Never more than 2 consecutive non-rest beats
  - Pattern length: 4-8 measures

  **Medium:**
  - Mix of quarter and eighth
  - Introduction of triplets in appropriate sections
  - Some syncopation
  - Rest patterns for contrast
  - Pattern length: 2-4 measures

  **Hard:**
  - Full sixteenth notes allowed
  - Complex syncopation patterns
  - Rapid subdivision changes
  - Minimal rests
  - Pattern length: 1-2 measures (more variation)

### 2.5 Tests
- [ ] Unit tests for pattern library
- [ ] Unit tests for `SubdivisionGenerator`
- [ ] Verify difficulty constraints are respected
- [ ] Test audio influence weighting
- [ ] Integration test: generate subdivisions for known track

---

## Phase 3: Rhythm Generator Orchestration

**Goal**: Create the orchestrator that combines multi-band analysis and subdivision generation into a cohesive pipeline.

### 3.1 Rhythm Generator Class
- [ ] Create `RhythmGenerator` in `src/core/generation/RhythmGenerator.ts`
  ```typescript
  interface RhythmGenerationOptions {
    difficulty: DifficultyPreset;

    // Subdivision settings
    subdivision: Partial<SubdivisionGeneratorConfig>;

    // Audio analysis settings
    useMultiBand: boolean;
    preferredBands: string[];

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

    // Pipeline steps
    private async analyzeMultiBand(audioBuffer: AudioBuffer): Promise<MultiBandResult>;
    private detectTransients(multiBand: MultiBandResult, unifiedMap: UnifiedBeatMap): TransientAnalysis;
    private generateSubdivisions(unifiedMap: UnifiedBeatMap, transients: TransientAnalysis): GeneratedSubdivisionResult;
  }

  interface GeneratedRhythm {
    streams: {
      bass: SubdividedBeatMap;
      mid: SubdividedBeatMap;
      high: SubdividedBeatMap;
      composite: SubdividedBeatMap;
    };
    transientAnalysis: TransientAnalysis;
    metadata: RhythmMetadata;
  }

  interface RhythmMetadata {
    difficulty: DifficultyPreset;
    bandsAnalyzed: string[];
    transientsDetected: number;
    patternsUsed: string[];
    averageDensity: number;
    generationConfig: RhythmGenerationOptions;
  }
  ```

### 3.2 Pipeline Implementation
- [ ] Implement the full rhythm generation pipeline
- [ ] Add progress callbacks for long-running generation
- [ ] Support cancellation
- [ ] Add caching for intermediate results

### 3.3 Configuration Presets
- [ ] Create preset configurations
  ```typescript
  const RHYTHM_PRESETS = {
    casual: {
      difficulty: 'easy',
      subdivision: { maxDensity: 'eighth', averageDensity: 0.3 },
    },
    standard: {
      difficulty: 'medium',
      subdivision: { maxDensity: 'eighth', averageDensity: 0.5 },
    },
    challenge: {
      difficulty: 'hard',
      subdivision: { maxDensity: 'sixteenth', averageDensity: 0.7 },
    },
    insane: {
      difficulty: 'hard',
      subdivision: { maxDensity: 'sixteenth', averageDensity: 0.9 },
    }
  };
  ```

### 3.4 Tests
- [ ] Integration tests for full pipeline
- [ ] Performance tests (generation time < 5 seconds for 3-minute song)
- [ ] Verify all 4 output streams are valid

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
  - [ ] Document the 4 output streams (bass/mid/high/composite)

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
   - Consider: Per-band thresholding, peak picking refinement

2. **Pattern memory**: How to avoid repetitive patterns without sounding random?
   - Consider: Markov chains, weighted random selection with history

3. **Swing detection**: Can swing feel be reliably detected from transient timing?
   - Consider: Statistical analysis of micro-timing deviations

### Design Questions
1. **Band selection**: Should band selection be automatic or configurable?
   - Recommendation: Auto with override option

2. **Composite vs individual streams**: Which should be the "default" output?
   - Recommendation: Composite as default, others available for advanced use

---

## Success Criteria

1. Generated rhythms feel "musical" - patterns match the audio transients
2. Difficulty settings produce noticeably different rhythmic density
3. Generation is deterministic when given same seed
4. Generation completes in reasonable time (< 5 seconds for 3-minute song)
5. All 4 streams (bass/mid/high/composite) are valid and usable
6. API is simple and discoverable
7. Documentation is complete and accurate
