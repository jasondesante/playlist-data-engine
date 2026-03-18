# Procedural Rhythm Game Level Generation - Implementation Plan

## Overview

This plan outlines a phased approach to building a procedural level generation system for the rhythm game. The system will automatically generate:
1. **Rhythmic subdivision patterns** - interesting beat subdivisions over quarter notes
2. **Button/key mappings** - engaging button combinations linked to beats
3. **Multiple difficulty levels** - easy, medium, hard with configurable parameters
4. **Audio-influenced generation** - using multi-band analysis, transient detection, and pitch detection

## Current Foundation

The engine already has:
- ✅ Beat detection (Ellis algorithm via `BeatMapGenerator`)
- ✅ Quarter note interpolation (`BeatInterpolator`)
- ✅ Subdivision system (`BeatSubdivider` with `SubdivisionType`)
- ✅ Key assignment helpers (`beatKeyHelpers.ts`)
- ✅ Difficulty presets (`DifficultyPreset`: easy/medium/hard)
- ✅ Audio utilities (FFT, STFT, mel filterbanks, filters)

---

## Architecture Decision: Order of Operations

Based on analysis, here's the recommended pipeline:

```
Audio → Beat Detection → Interpolation → Unified Beat Map
                                          ↓
                              ┌───────────────────────┐
                              │  Multi-Band Analysis  │ ← NEW
                              │  (separate pass)      │
                              └───────────────────────┘
                                          ↓
                              ┌───────────────────────┐
                              │  Transient Detector   │ ← NEW
                              │  (cross-reference)    │
                              └───────────────────────┘
                                          ↓
                              ┌───────────────────────┐
                              │  Subdivision Pattern  │ ← NEW
                              │  Generator            │
                              └───────────────────────┘
                                          ↓
                              ┌───────────────────────┐
                              │  Pitch Detector       │ ← NEW (Phase 3)
                              │  (melody extraction)  │
                              └───────────────────────┘
                                          ↓
                              ┌───────────────────────┐
                              │  Button/Key Mapper    │ ← NEW
                              │  (uses pitch + rhythm)│
                              └───────────────────────┘
                                          ↓
                              ┌───────────────────────┐
                              │  Generated Level      │
                              │  (SubdividedBeatMap   │
                              │   with keys)          │
                              └───────────────────────┘
```

### Key Architectural Decisions

**Q: Should pitch detection come before or after rhythm generation?**
**A: AFTER rhythm generation.** Here's why:
- Rhythm patterns should be driven by transients/percussion (low-mid frequency bands)
- Pitch detection is most valuable for melody-to-button mapping
- Separating these concerns allows independent experimentation
- Rhythm establishes the "when", pitch establishes the "what"

**Q: Should rhythm and button generation be planned together?**
**A: Plan together, implement separately.**
- Define interfaces that connect them (`LevelGenerationConfig`)
- Implement rhythm generation first (Phase 2)
- Implement button mapping second (Phase 3)
- Both phases inform each other's design

**Q: How do multi-band results influence generation?**
**A: Band selection for different purposes:**
- **Low band (20-250Hz)**: Kick drum transients → beat emphasis, downbeats
- **Low-mid band (250-500Hz)**: Snare/body → rhythm pattern suggestions
- **Mid band (500-2kHz)**: Vocals/lead → melody tracking for buttons
- **High-mid band (2-4kHz)**: Hi-hats/presence → subdivision density hints
- **High band (4-20kHz)**: Air/brightness → accent patterns

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
    - [ ] **Low Band**: Energy-based detection / Subband Envelope (great for clear kick/bass transients).
    - [ ] **Mid Band**: Spectral Flux algorithm (reliable for snare, vocals, and harmonic onsets).
    - [ ] **High Band**: High-Frequency Content (HFC) / Spectral Flux (ideal for hi-hats, cymbals, air).
  - [ ] Add adaptive thresholding to adjust to the song's dynamic range.
  - [ ] Support concurrent per-band transient detection.
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
- [ ] Create rhythm extraction logic that maps transients into discrete rhythmic phrases for *each* frequency band.
- [ ] Implement scoring logic to evaluate the "interest" level of rhythms within each band over a given window (e.g., 1 measure):
  - [ ] Score based on Inter-Onset Interval (IOI) density and variance.
  - [ ] Score based on Syncopation (weighting transients that land on offbeats or micro-subdivisions higher than simple downbeats).
- [ ] Implement a **Rhythm Slicer/Combiner**. The program will evaluate the scores of the Low, Mid, and High band rhythms for a given section, slicing pieces from the strongest/most interesting bands into a final, composite generated subdivision map.
  - [ ] **Crucially**, the system must provide access to all 4 streams: the fully preserved, quantized rhythmic phrases for Bass, Mid, and High bands, plus the final aggregated composite stream (which will be the primary, highest-quality map).
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
  - [ ] Output: `SubdivisionConfig`
  
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

## Phase 3: Pitch Detection & Melody Analysis

**Goal**: Extract pitch information over time to influence button pattern generation.

### 3.1 Pitch Detector Implementation
- [ ] Create `PitchDetector` class in `src/core/analysis/PitchDetector.ts`
  - [ ] Implement YIN algorithm for monophonic pitch detection
  - [ ] Add autocorrelation-based fallback
  - [ ] Support configurable frequency range (for different instruments)
  
  ```typescript
  interface PitchDetectorConfig {
    minFrequency: number;  // Default: 80Hz (low guitar)
    maxFrequency: number;  // Default: 1000Hz (high vocals)
    confidenceThreshold: number;  // 0-1
    hopSize: number;  // In samples
  }
  
  interface PitchResult {
    timestamp: number;
    frequency: number;  // Hz, or 0 if no pitch detected
    confidence: number;  // 0-1
    midiNote: number | null;  // MIDI note number
    noteName: string | null;  // e.g., "C4", "F#5"
  }
  
  interface PitchAnalysis {
    pitches: PitchResult[];
    melodyContour: MelodyContour;
    keyHint: KeyHint | null;
  }
  ```

### 3.2 Melody Contour Analysis
- [ ] Create melody contour extraction
  ```typescript
  interface MelodyContour {
    segments: MelodySegment[];
    direction: 'ascending' | 'descending' | 'stable' | 'mixed';
    range: {
      minNote: string;
      maxNote: string;
      semitones: number;
    };
  }
  
  interface MelodySegment {
    startTime: number;
    endTime: number;
    startPitch: string;
    endPitch: string;
    direction: 'up' | 'down' | 'stable';
    interval: number;  // Semitones
  }
  ```
- [ ] Implement segment detection for melody phrases
- [ ] Link segments to beat positions

### 3.3 Key Detection Hint
- [ ] Basic key detection from pitch histogram
  ```typescript
  interface KeyHint {
    likelyKey: string;  // e.g., "C major", "A minor"
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }
  ```

### 3.4 Multi-Band Pitch Analysis
- [ ] Apply pitch detection to mid band (vocals/melody)
- [ ] Store which band produced the most confident pitch results
- [ ] Use this to inform button generation

### 3.5 Tests
- [ ] Unit tests for YIN implementation
- [ ] Unit tests for melody contour extraction
- [ ] Test with synthesized audio of known pitch
- [ ] Test with real vocal tracks

---

## Phase 4: Procedural Button/Key Mapper

**Goal**: Generate interesting button combinations that follow the music.

### 4.1 Button Mapping Configuration
- [ ] Define button mapping config
  ```typescript
  interface ButtonMappingConfig {
    difficulty: DifficultyPreset;
    
    // Available buttons
    availableKeys: string[];  // e.g., ['up', 'down', 'left', 'right']
    
    // Pattern settings
    maxSimultaneous: number;  // Max buttons pressed at once (chords)
    chordProbability: number;  // 0-1
    holdNoteProbability: number;  // 0-1
    
    // Pitch influence
    usePitchMapping: boolean;
    pitchToKeyMapping: 'directional' | 'chromatic' | 'interval';
    
    // Rhythm influence
    emphasizeDownbeats: boolean;
    emphasizeSyncopation: boolean;
    
    // Difficulty settings
    consecutiveSameKeyLimit: number;  // Prevent spam
    patternMemory: number;  // Measures to avoid repeating
  }
  
  // Pitch-to-key mapping modes
  type PitchMappingMode = 
    | 'directional'  // Up pitch = up button, down pitch = down button
    | 'chromatic'    // Each semitone maps to different key
    | 'interval';    // Intervals determine button changes
  ```

### 4.2 Button Pattern Vocabulary
- [ ] Define button pattern types
  ```typescript
  interface ButtonPattern {
    name: string;
    keys: string[][];  // Array of key combinations per beat
    measures: number;
    tags: string[];
  }
  
  // Example patterns:
  // "alternating": [['up'], ['down'], ['up'], ['down']]
  // "roll": [['left'], ['down'], ['right']]
  // "chord": [['up', 'down']]
  // "stream": [['left'], ['left'], ['right'], ['right']]
  ```

### 4.3 Button Mapper Class
- [ ] Create `ButtonMapper` in `src/core/generation/ButtonMapper.ts`
  ```typescript
  class ButtonMapper {
    constructor(config: ButtonMappingConfig);
    
    map(
      subdividedBeatMap: SubdividedBeatMap,
      pitchAnalysis?: PitchAnalysis,
      transientAnalysis?: TransientAnalysis
    ): MappedLevelResult;
    
    // Pitch-influenced mapping
    private mapPitchToKey(
      pitch: PitchResult,
      previousKey: string | null
    ): string;
    
    // Pattern selection
    private selectButtonPattern(
      subdivisionType: SubdivisionType,
      measureIndex: number
    ): ButtonPattern;
    
    // Difficulty adjustments
    private applyDifficultyVariation(
      keys: string[],
      difficulty: DifficultyPreset
    ): string[];
  }
  
  interface MappedLevelResult {
    beatMap: SubdividedBeatMap;  // Now with requiredKey populated
    metadata: {
      keysUsed: string[];
      chordCount: number;
      averageKeysPerBeat: number;
      pitchInfluencedBeats: number;
    };
  }
  ```

### 4.4 Pitch-to-Button Mapping Strategies
- [ ] Implement directional mapping
  - Melody goes up → use "up" or "right" button
  - Melody goes down → use "down" or "left" button
  - Large intervals → bigger "jumps" in button position
- [ ] Implement chromatic mapping
  - Map each semitone to a button in sequence
  - Modulo for limited buttons
- [ ] Implement interval mapping
  - Same note = same button
  - Small interval = adjacent button
  - Large interval = opposite button

### 4.5 Difficulty-Based Button Logic
- [ ] Easy:
  - Single button per beat
  - No simultaneous presses
  - Predictable patterns (alternating)
  - Pitch influence strong (follows melody)
- [ ] Medium:
  - Occasional chords (2 buttons)
  - Pattern variation
  - Some pitch influence
- [ ] Hard:
  - Frequent chords
  - Rapid button changes
  - Complex patterns
  - Less predictable

### 4.6 Tests
- [ ] Unit tests for pitch-to-key mapping
- [ ] Unit tests for pattern selection
- [ ] Verify difficulty constraints
- [ ] Integration test: full level generation

---

## Phase 5: Level Generator Orchestration

**Goal**: Create the main orchestrator that combines all components.

### 5.1 Level Generator Class
- [ ] Create `LevelGenerator` in `src/core/generation/LevelGenerator.ts`
  ```typescript
  interface LevelGenerationOptions {
    difficulty: DifficultyPreset;
    
    // Subdivision settings
    subdivision: Partial<SubdivisionGeneratorConfig>;
    
    // Button settings  
    buttons: Partial<ButtonMappingConfig>;
    
    // Audio analysis settings
    useMultiBand: boolean;
    usePitchDetection: boolean;
    preferredBands: string[];
    
    // Seed for reproducibility
    seed?: string;
  }
  
  class LevelGenerator {
    constructor(options: LevelGenerationOptions);
    
    async generate(
      audioBuffer: AudioBuffer,
      beatMap: BeatMap,
      interpolatedBeatMap: InterpolatedBeatMap
    ): Promise<GeneratedLevel>;
    
    // Pipeline steps
    private async analyzeMultiBand(audioBuffer: AudioBuffer): Promise<MultiBandResult>;
    private detectTransients(multiBand: MultiBandResult, unifiedMap: UnifiedBeatMap): TransientAnalysis;
    private generateSubdivisions(unifiedMap: UnifiedBeatMap, transients: TransientAnalysis): SubdivisionConfig;
    private detectPitch(audioBuffer: AudioBuffer): PitchAnalysis;
    private mapButtons(subdivided: SubdividedBeatMap, pitch: PitchAnalysis, transients: TransientAnalysis): SubdividedBeatMap;
  }
  
  interface GeneratedLevel {
    beatMap: SubdividedBeatMap;  // Fully generated with keys
    metadata: LevelMetadata;
  }
  
  interface LevelMetadata {
    difficulty: DifficultyPreset;
    subdivisionMetadata: SubdivisionMetadata;
    buttonMetadata: {
      keysUsed: string[];
      chordCount: number;
      pitchInfluencedBeats: number;
    };
    audioAnalysisMetadata: {
      bandsAnalyzed: string[];
      transientsDetected: number;
      pitchRange: { min: string; max: string } | null;
    };
    generationConfig: LevelGenerationOptions;
  }
  ```

### 5.2 Pipeline Implementation
- [ ] Implement the full generation pipeline
- [ ] Add progress callbacks for long-running generation
- [ ] Support cancellation
- [ ] Add caching for intermediate results

### 5.3 Configuration Presets
- [ ] Create preset configurations
  ```typescript
  const LEVEL_PRESETS = {
    casual: {
      difficulty: 'easy',
      subdivision: { maxDensity: 'eighth', averageDensity: 0.3 },
      buttons: { maxSimultaneous: 1, usePitchMapping: true }
    },
    standard: {
      difficulty: 'medium',
      subdivision: { maxDensity: 'eighth', averageDensity: 0.5 },
      buttons: { maxSimultaneous: 2, chordProbability: 0.2 }
    },
    challenge: {
      difficulty: 'hard',
      subdivision: { maxDensity: 'sixteenth', averageDensity: 0.7 },
      buttons: { maxSimultaneous: 2, chordProbability: 0.4 }
    },
    insane: {
      difficulty: 'hard',
      subdivision: { maxDensity: 'sixteenth', averageDensity: 0.9 },
      buttons: { maxSimultaneous: 3, chordProbability: 0.6 }
    }
  };
  ```

### 5.4 Tests
- [ ] Integration tests for full pipeline
- [ ] Performance tests (generation time)
- [ ] Visual/playtest verification

---

## Phase 6: API & Integration

**Goal**: Expose the generation system through a clean API.

### 6.1 Public API
- [ ] Add exports to `src/index.ts`
- [ ] Create convenience methods on `AudioAnalyzer`
  ```typescript
  // On AudioAnalyzer class
  async generateLevel(
    audioUrl: string,
    options: LevelGenerationOptions
  ): Promise<GeneratedLevel>;
  ```

### 6.2 Serialization
- [ ] Add `toJSON`/`fromJSON` for `GeneratedLevel`
- [ ] Add file save/load methods
- [ ] Ensure metadata is preserved

### 6.3 Documentation
- [ ] JSDoc for all public types
- [ ] Usage examples in code comments
- [ ] Update README with new capabilities

---

## Dependencies

### Phase 1 Dependencies
- None (uses existing audio utilities)

### Phase 2 Dependencies
- Phase 1 (for audio-influenced generation)

### Phase 3 Dependencies
- None (can run parallel to Phase 2)

### Phase 4 Dependencies
- Phase 2 (needs subdivided beat map)
- Phase 3 (optional, for pitch influence)

### Phase 5 Dependencies
- Phases 1-4

---

## Questions/Unknowns

### Technical Questions
1. **YIN vs. pYIN vs. CREPE**: Which pitch detection algorithm is best for polyphonic music?
   - Recommendation: Start with YIN, may need pYIN for better voiced/unvoiced detection
   
2. **Transient detection accuracy**: How to handle overlapping transients in dense music?
   - Consider: Per-band thresholding, peak picking refinement
   
3. **Pattern memory**: How to avoid repetitive patterns without sounding random?
   - Consider: Markov chains, weighted random selection with history

### Design Questions
1. **Band selection**: Should band selection be automatic or configurable?
   - Recommendation: Auto with override option
   
2. **Pitch influence strength**: How strongly should melody override other factors?
   - Recommendation: Configurable weight (0-1)

3. **Real-time generation**: Is this needed or is offline-only acceptable?
   - Recommendation: Offline-first, consider real-time as future enhancement

---

## Future Enhancements (Out of Scope)

- Machine learning for pattern quality prediction
- User preference learning
- Genre-specific generation modes
- Real-time level generation
- Collaborative level editing
- Level difficulty scoring
- Auto-balancing for playtesting

---

## Estimated Effort

| Phase | Complexity | Priority |
|-------|------------|----------|
| Phase 1: Multi-Band Transient | High | Core |
| Phase 2: Subdivision Generator | Medium | Core |
| Phase 3: Pitch Detection | High | Enhancement |
| Phase 4: Button Mapper | Medium | Core |
| Phase 5: Orchestration | Medium | Core |
| Phase 6: API & Integration | Low | Polish |

**Recommendation**: Start with Phases 1, 2, and 4 (skip pitch initially). Add Phase 3 once basic procedural generation is working.

---

## Success Criteria

1. Generated levels feel "musical" - patterns match the audio
2. Difficulty settings produce noticeably different experiences
3. Generation is deterministic when given same seed
4. Generation completes in reasonable time (< 10 seconds for 3-minute song)
5. API is simple and discoverable
