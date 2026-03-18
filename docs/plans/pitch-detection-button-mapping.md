# Pitch Detection & Button Mapping - Implementation Plan

## Overview

This plan focuses on two interconnected features:

1. **Pitch Detection**: Extract pitch/melody information from audio over time
2. **Button Mapping**: Generate interesting button combinations for rhythm game notes

The button mapping uses pitch information to create patterns that follow the melody, making the gameplay feel more connected to the music. This plan builds on the output from the companion plan `procedural-rhythm-generation.md`.

## Relationship to Companion Plan

This plan **depends on** `procedural-rhythm-generation.md`:
- Rhythm generation produces `SubdividedBeatMap` (WHEN notes happen)
- This plan produces button assignments (WHAT to press)
- Together they create a complete playable level

---

## Current Foundation

The engine already has:
- ✅ Key assignment helpers (`beatKeyHelpers.ts`)
- ✅ Difficulty presets (`DifficultyPreset`: easy/medium/hard)
- ✅ Audio utilities (FFT, STFT, mel filterbanks)
- ✅ Multi-band analysis (from rhythm generation plan)

After rhythm generation plan completes:
- ✅ `SubdividedBeatMap` with rhythmic patterns
- ✅ `TransientAnalysis` with band-specific transients
- ✅ 4 rhythm streams (bass/mid/high/composite)

---

## Phase 1: Pitch Detection & Melody Analysis

**Goal**: Extract pitch information over time to influence button pattern generation.

### 1.1 Pitch Detector Implementation
- [ ] Create `PitchDetector` class in `src/core/analysis/PitchDetector.ts`
  - [ ] Implement YIN algorithm for monophonic pitch detection
  - [ ] Add autocorrelation-based fallback
  - [ ] Support configurable frequency range (for different instruments)
  - [ ] Handle polyphonic audio gracefully (pick dominant pitch)

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

### 1.2 Melody Contour Analysis
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
- [ ] Calculate contour direction over different time windows

### 1.3 Key Detection Hint
- [ ] Basic key detection from pitch histogram
  ```typescript
  interface KeyHint {
    likelyKey: string;  // e.g., "C major", "A minor"
    confidence: number;
    alternatives: Array<{ key: string; confidence: number }>;
  }
  ```
- [ ] Implement pitch class histogram
- [ ] Correlate with major/minor scale profiles
- [ ] Return top candidates with confidence scores

### 1.4 Multi-Band Pitch Analysis
- [ ] Apply pitch detection to multiple frequency bands
  - [ ] Focus on mid band (500-2000Hz) for vocals/lead melody
  - [ ] Optionally analyze other bands for harmony
- [ ] Store which band produced the most confident pitch results
- [ ] Use band selection to inform button generation
  ```typescript
  interface MultiBandPitchAnalysis {
    primaryBand: string;  // Band with best pitch confidence
    bandAnalyses: Map<string, PitchAnalysis>;
    combinedMelody: MelodyContour;
  }
  ```

### 1.5 Linking Pitch to Beat Map
- [ ] Create `PitchBeatLinker` utility
  - [ ] Map pitch results to nearest beat positions
  - [ ] Calculate pitch direction between consecutive beats
  - [ ] Identify pitch events that align with transients
  ```typescript
  interface PitchAtBeat {
    beatIndex: number;
    timestamp: number;
    pitch: PitchResult | null;
    direction: 'up' | 'down' | 'stable' | 'none';
    intervalFromPrevious: number;  // Semitones, 0 if none
  }

  interface LinkedPitchAnalysis {
    pitchByBeat: PitchAtBeat[];
    melodyContour: MelodyContour;
    dominantBand: string;
  }
  ```

### 1.6 Tests
- [ ] Unit tests for YIN implementation
- [ ] Unit tests for melody contour extraction
- [ ] Unit tests for key detection
- [ ] Test with synthesized audio of known pitch
- [ ] Test with real vocal tracks
- [ ] Test pitch-to-beat linking accuracy

---

## Phase 2: Button Mapping System

**Goal**: Generate interesting button combinations that follow the music's melody and rhythm.

### 2.1 Button Mapping Configuration
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
    pitchInfluenceWeight: number;  // 0-1, how strongly pitch affects buttons

    // Rhythm influence
    emphasizeDownbeats: boolean;
    emphasizeSyncopation: boolean;

    // Difficulty settings
    consecutiveSameKeyLimit: number;  // Prevent spam
    patternMemory: number;  // Measures to avoid repeating

    // Band selection (from rhythm generation)
    useRhythmBand: boolean;  // Use same band that won rhythm slicing
  }

  // Pitch-to-key mapping modes
  type PitchMappingMode =
    | 'directional'  // Up pitch = up button, down pitch = down button
    | 'chromatic'    // Each semitone maps to different key
    | 'interval';    // Intervals determine button changes
  ```

### 2.2 Button Pattern Vocabulary
- [ ] Define button pattern types
  ```typescript
  interface ButtonPattern {
    name: string;
    keys: string[][];  // Array of key combinations per beat
    measures: number;
    tags: string[];
    difficulty: number;  // 1-10
  }

  // Example patterns:
  // "alternating": [['up'], ['down'], ['up'], ['down']]
  // "roll": [['left'], ['down'], ['right']]
  // "chord": [['up', 'down']]
  // "stream": [['left'], ['left'], ['right'], ['right']]
  // "staircase": [['up'], ['right'], ['down'], ['left']]
  ```
- [ ] Create pattern library
  - [ ] Basic patterns (alternating, single key runs)
  - [ ] Roll patterns (sequential key presses)
  - [ ] Chord patterns (simultaneous presses)
  - [ ] Stream patterns (repeated directions)
  - [ ] Jump patterns (non-adjacent keys)

### 2.3 Button Mapper Class
- [ ] Create `ButtonMapper` in `src/core/generation/ButtonMapper.ts`
  ```typescript
  class ButtonMapper {
    constructor(config: ButtonMappingConfig);

    map(
      subdividedBeatMap: SubdividedBeatMap,
      pitchAnalysis?: LinkedPitchAnalysis,
      transientAnalysis?: TransientAnalysis
    ): MappedLevelResult;

    // Pitch-influenced mapping
    private mapPitchToKey(
      pitch: PitchAtBeat,
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

    // Combine pitch + pattern influences
    private blendPitchAndPattern(
      pitchKey: string | null,
      patternKey: string,
      weight: number
    ): string;
  }

  interface MappedLevelResult {
    beatMap: SubdividedBeatMap;  // Now with requiredKey populated
    metadata: {
      keysUsed: string[];
      chordCount: number;
      averageKeysPerBeat: number;
      pitchInfluencedBeats: number;
      patternsUsed: string[];
    };
  }
  ```

### 2.4 Pitch-to-Button Mapping Strategies
- [ ] Implement directional mapping
  - Melody goes up → use "up" or "right" button
  - Melody goes down → use "down" or "left" button
  - Large intervals → bigger "jumps" in button position
  - Stable pitch → repeat or adjacent button
  ```typescript
  // Directional mapping example
  const DIRECTIONAL_MAP = {
    'up': { small: 'up', medium: 'up', large: 'up' },
    'down': { small: 'down', medium: 'down', large: 'down' },
    'stable': 'same',  // Repeat previous key
  };
  ```

- [ ] Implement chromatic mapping
  - Map each semitone to a button in sequence
  - Modulo for limited buttons (4 buttons = 4 semitone groups)
  ```typescript
  // Chromatic mapping (C=up, C#=up, D=down, D#=down, E=left, etc.)
  const CHROMATIC_MAP = ['up', 'up', 'down', 'down', 'left', 'left', 'right', 'right', ...];
  ```

- [ ] Implement interval mapping
  - Same note = same button
  - Small interval (1-2 semitones) = adjacent button
  - Medium interval (3-5 semitones) = skip one button
  - Large interval (6+ semitones) = opposite button
  ```typescript
  const INTERVAL_MAP = {
    0: 'same',           // Unison
    1: 'adjacent',       // Minor 2nd
    2: 'adjacent',       // Major 2nd
    3: 'skip_one',       // Minor 3rd
    4: 'skip_one',       // Major 3rd
    5: 'opposite',       // Perfect 4th
    7: 'opposite',       // Perfect 5th
    // etc.
  };
  ```

### 2.5 Difficulty-Based Button Logic
- [ ] Easy:
  - Single button per beat
  - No simultaneous presses (chords)
  - Predictable patterns (alternating)
  - Strong pitch influence (follows melody closely)
  - No rapid direction changes
  - `consecutiveSameKeyLimit`: 3

- [ ] Medium:
  - Occasional chords (2 buttons), probability 0.1-0.2
  - Pattern variation enabled
  - Moderate pitch influence (weight 0.5)
  - Some rapid direction changes
  - `consecutiveSameKeyLimit`: 2

- [ ] Hard:
  - Frequent chords, probability 0.3-0.5
  - Rapid button changes allowed
  - Complex patterns (rolls, streams)
  - Lower pitch influence (weight 0.3) - more variety
  - `consecutiveSameKeyLimit`: 2
  - Hold notes enabled

### 2.6 Combining Rhythm Band Selection with Pitch
- [ ] Implement band-aware button mapping
  - If rhythm used 'bass' band for a section, use same band for pitch
  - If rhythm used 'mid' band, focus pitch detection there
  - Store band selection from rhythm generation in metadata
  ```typescript
  interface BandAwareMapping {
    rhythmBand: string;  // From rhythm generation
    pitchBand: string;   // Usually matches, but can differ
    useConsistentBands: boolean;
  }
  ```

### 2.7 Tests
- [ ] Unit tests for pitch-to-key mapping (all 3 modes)
- [ ] Unit tests for pattern selection
- [ ] Verify difficulty constraints are respected
- [ ] Test band-aware mapping logic
- [ ] Integration test: full button mapping with real pitch data

---

## Phase 3: Level Generator Orchestration

**Goal**: Create the orchestrator that combines rhythm and button mapping into complete playable levels.

### 3.1 Level Generator Class
- [ ] Create `LevelGenerator` in `src/core/generation/LevelGenerator.ts`
  ```typescript
  interface LevelGenerationOptions {
    difficulty: DifficultyPreset;

    // Rhythm settings (passes through to RhythmGenerator)
    rhythm: Partial<RhythmGenerationOptions>;

    // Button settings
    buttons: Partial<ButtonMappingConfig>;

    // Pitch settings
    usePitchDetection: boolean;
    pitchMappingMode: PitchMappingMode;

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
    private async generateRhythm(...): Promise<GeneratedRhythm>;
    private async detectPitch(audioBuffer: AudioBuffer, dominantBand: string): Promise<LinkedPitchAnalysis>;
    private mapButtons(
      rhythm: GeneratedRhythm,
      pitch: LinkedPitchAnalysis | null
    ): MappedLevelResult;
  }

  interface GeneratedLevel {
    beatMap: SubdividedBeatMap;  // Fully generated with keys
    rhythmStreams: {
      bass: SubdividedBeatMap;
      mid: SubdividedBeatMap;
      high: SubdividedBeatMap;
      composite: SubdividedBeatMap;
    };
    pitchAnalysis: LinkedPitchAnalysis | null;
    metadata: LevelMetadata;
  }

  interface LevelMetadata {
    difficulty: DifficultyPreset;
    rhythmMetadata: RhythmMetadata;
    buttonMetadata: {
      keysUsed: string[];
      chordCount: number;
      pitchInfluencedBeats: number;
      patternsUsed: string[];
    };
    pitchMetadata: {
      bandUsed: string;
      melodyRange: { min: string; max: string } | null;
      keyHint: string | null;
    } | null;
    generationConfig: LevelGenerationOptions;
  }
  ```

### 3.2 Pipeline Implementation
- [ ] Implement the full generation pipeline
  1. Run rhythm generation (from companion plan)
  2. Run pitch detection on dominant band
  3. Link pitch to beat positions
  4. Generate button mappings
  5. Combine into final level
- [ ] Add progress callbacks for long-running generation
  ```typescript
  interface GenerationProgress {
    stage: 'rhythm' | 'pitch' | 'buttons' | 'finalizing';
    progress: number;  // 0-1
    message: string;
  }
  ```
- [ ] Support cancellation
- [ ] Add caching for intermediate results

### 3.3 Configuration Presets
- [ ] Create preset configurations
  ```typescript
  const LEVEL_PRESETS = {
    casual: {
      difficulty: 'easy',
      rhythm: { maxDensity: 'eighth', averageDensity: 0.3 },
      buttons: {
        maxSimultaneous: 1,
        usePitchMapping: true,
        pitchMappingMode: 'directional',
        pitchInfluenceWeight: 0.8
      }
    },
    standard: {
      difficulty: 'medium',
      rhythm: { maxDensity: 'eighth', averageDensity: 0.5 },
      buttons: {
        maxSimultaneous: 2,
        chordProbability: 0.2,
        pitchInfluenceWeight: 0.5
      }
    },
    challenge: {
      difficulty: 'hard',
      rhythm: { maxDensity: 'sixteenth', averageDensity: 0.7 },
      buttons: {
        maxSimultaneous: 2,
        chordProbability: 0.4,
        pitchInfluenceWeight: 0.3
      }
    },
    insane: {
      difficulty: 'hard',
      rhythm: { maxDensity: 'sixteenth', averageDensity: 0.9 },
      buttons: {
        maxSimultaneous: 3,
        chordProbability: 0.6,
        pitchInfluenceWeight: 0.2
      }
    }
  };
  ```

### 3.4 Tests
- [ ] Integration tests for full pipeline
- [ ] Performance tests (generation time < 10 seconds for 3-minute song)
- [ ] Verify pitch influence is visible in output
- [ ] Test all presets produce valid levels

---

## Phase 4: API & Integration

**Goal**: Expose the complete level generation system through a clean API.

### 4.1 Public API
- [ ] Add exports to `src/index.ts`
- [ ] Create convenience methods on `AudioAnalyzer`
  ```typescript
  // On AudioAnalyzer class
  async generateLevel(
    audioUrl: string,
    options: LevelGenerationOptions
  ): Promise<GeneratedLevel>;

  // Quick generation with preset
  async generateLevelWithPreset(
    audioUrl: string,
    preset: 'casual' | 'standard' | 'challenge' | 'insane'
  ): Promise<GeneratedLevel>;
  ```

### 4.2 Serialization
- [ ] Add `toJSON`/`fromJSON` for `GeneratedLevel`
- [ ] Add file save/load methods
  ```typescript
  interface SerializedLevel {
    version: string;
    beatMap: SerializedBeatMap;
    metadata: LevelMetadata;
    generatedAt: string;
  }

  // Save/load helpers
  function saveLevel(level: GeneratedLevel, path: string): Promise<void>;
  function loadLevel(path: string): Promise<GeneratedLevel>;
  ```
- [ ] Ensure metadata is preserved
- [ ] Version the serialization format for future compatibility

### 4.3 Tests
- [ ] API integration tests
- [ ] Serialization round-trip tests
- [ ] Backward compatibility tests

---

## Phase 5: Documentation

**Goal**: Ensure all new features are properly documented.

### 5.1 Code Documentation
- [ ] JSDoc for all public types and interfaces
- [ ] Usage examples in code comments
- [ ] Inline comments for complex algorithms (especially YIN pitch detection)

### 5.2 Update DATA_ENGINE_REFERENCE.md
- [ ] Add new section: "Pitch Detection & Button Mapping"
  - [ ] Document `PitchDetector` class and YIN algorithm
  - [ ] Document `ButtonMapper` class and mapping strategies
  - [ ] Document `LevelGenerator` orchestration
  - [ ] Explain the 3 pitch-to-key mapping modes (directional, chromatic, interval)
  - [ ] Add code examples for generating complete levels
  - [ ] Document configuration presets
  - [ ] Document serialization format

### 5.3 Update BEAT_DETECTION.md
- [ ] Add section on pitch detection (separate from beat/transient detection)
- [ ] Document how pitch analysis links to beat positions
- [ ] Explain multi-band pitch analysis approach
- [ ] Document melody contour extraction
- [ ] Add examples of pitch-to-button mapping

---

## Dependencies

### External Dependencies
- None (YIN algorithm can be implemented from scratch)

### Internal Dependencies
- **Requires**: `procedural-rhythm-generation.md` to be completed
  - Needs `SubdividedBeatMap` output
  - Needs `TransientAnalysis` for band selection
  - Needs rhythm streams metadata

---

## Questions/Unknowns

### Technical Questions
1. **YIN vs. pYIN vs. CREPE**: Which pitch detection algorithm is best for polyphonic music?
   - Recommendation: Start with YIN, may need pYIN for better voiced/unvoiced detection
   - CREPE is ML-based and may be overkill for this use case

2. **Pitch detection on filtered bands**: Does band-passing improve or degrade pitch accuracy?
   - Consider: Test on vocals (mid band) vs full spectrum

3. **Polyphonic handling**: How to handle multiple simultaneous pitches?
   - Consider: Pick dominant pitch, or use confidence-weighted selection

### Design Questions
1. **Pitch influence strength**: How strongly should melody override other factors?
   - Recommendation: Configurable weight (0-1), defaults vary by difficulty

2. **Button pattern vs pitch**: When they conflict, which wins?
   - Recommendation: Blend with configurable weight, favor playability

3. **Key detection usage**: Should key hints influence button patterns?
   - Consider: Use key to avoid "wrong" button combinations

---

## Success Criteria

1. Generated button patterns feel connected to the melody
2. Pitch detection works reliably on vocal/melody tracks
3. All 3 pitch-to-key mapping modes produce playable patterns
4. Difficulty settings produce noticeably different button complexity
5. Generation is deterministic when given same seed
6. Generation completes in reasonable time (< 10 seconds for 3-minute song)
7. Serialization preserves all level data and metadata
8. API is simple and discoverable
9. Documentation is complete and accurate
