# Pitch Detection & Button Mapping - Implementation Plan

## Overview

This plan focuses on two interconnected features:

1. **Pitch Detection**: Extract pitch/melody information from audio over time
2. **Button Mapping**: Generate interesting button combinations for rhythm game notes

The button mapping uses pitch information to create patterns that follow the melody, making the gameplay feel more connected to the music. This plan builds on the output from the companion plan `procedural-rhythm-generation.md`.

## Relationship to Companion Plan

This plan **depends on** `procedural-rhythm-generation.md`:
- Rhythm generation produces `GeneratedRhythm` containing:
  - 3 difficulty variants (easy/medium/hard) of a composite stream
  - Individual band streams (low/mid/high) for reference
  - Analysis results (transients, phrases, density metrics)
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
- ✅ `GeneratedRhythm` with:
  - 3 difficulty variants (`easy`/`medium`/`hard` as `DifficultyVariant`)
  - 3 band streams (`low`/`mid`/`high` as `GeneratedRhythmMap`)
  - 1 composite stream (`CompositeStream`)
  - Analysis results (`TransientAnalysis`, `PhraseAnalysisResult`, `DensityMetrics`)
  - Rich metadata (`RhythmMetadata`)

---

## Phase 1: Pitch Detection & Melody Analysis

**Goal**: Extract pitch information over time to influence button pattern generation.

### 1.1 Pitch Detector Implementation

**Algorithm Choice: pYIN (Probabilistic YIN)**

We use pYIN instead of standard YIN for several key advantages:
- **Probabilistic output**: Provides multiple pitch hypotheses with probabilities, allowing confident selection
- **HMM-based tracking**: Hidden Markov Model smooths pitch transitions and handles voiced/unvoiced detection
- **Better voicing detection**: More accurate identification of when pitch is present vs absent
- **Polyphonic robustness**: Handles complex audio better by tracking the most likely fundamental frequency

- [x] Implement pYIN algorithm (probabilistic extension of YIN)
  - [x] Implement pYIN algorithm (probabilistic extension of YIN)
    - [x] Implement YIN difference function computation
    - [x] Implement cumulative mean normalized difference function
    - [x] Add HMM (Hidden Markov Model) for pitch state tracking
    - [x] Implement Viterbi decoding for optimal pitch path
  - [x] Support configurable frequency range (for different instruments)
  - [x] Output single best pitch hypothesis per frame (simplifies downstream usage)

  ```typescript
  interface PitchDetectorConfig {
    // === Frequency Range ===
    minFrequency: number;  // Default: 80Hz (low guitar)
    maxFrequency: number;  // Default: 1000Hz (high vocals)

    // === Analysis Window ===
    frameSize: number;     // Default: 2048 samples (~46ms at 44.1kHz)
    hopSize: number;       // Default: 512 samples (~12ms at 44.1kHz)

    // === pYIN HMM Parameters ===
    voicingThreshold: number;    // Default: 0.5 - probability threshold for voiced/unvoiced
    transitionPenalty: number;   // Default: 0.5 - penalty for large pitch jumps in HMM
    selfTransitionProbability: number;  // Default: 0.99 - probability of staying in same pitch state

    // === YIN Core Parameters ===
    yinThreshold: number;  // Default: 0.1 - threshold for accepting a pitch candidate in difference function
  }

  interface PitchResult {
    timestamp: number;
    frequency: number;  // Hz, or 0 if no pitch detected
    probability: number;  // 0-1 - probability from pYIN HMM (replaces simple confidence)
    isVoiced: boolean;    // Whether this frame contains a detectable pitch
    midiNote: number | null;  // MIDI note number (null if unvoiced)
    noteName: string | null;  // e.g., "C4", "F#5" (null if unvoiced)

    // Optional: Alternative hypotheses for debugging/analysis
    alternativeHypotheses?: {
      frequency: number;
      probability: number;
    }[];
  }
  ```

> **Note**: While pYIN internally computes multiple pitch hypotheses, we expose only the most probable result in `PitchResult`. This simplifies integration with button mapping. The `alternativeHypotheses` field is optional and primarily for debugging or advanced analysis.

### 1.2 Multi-Band Pitch Analysis

**Goal**: Reuse the same multi-band filtering infrastructure from rhythm generation for pitch detection, ensuring consistent frequency band analysis across both systems.

> **⚠️ Important**: Pitch detection MUST use the same `FREQUENCY_BANDS` configuration and `MultiBandAnalyzer` infrastructure from rhythm generation. Do not create separate filtering logic.

- [x] **Reuse existing multi-band infrastructure**:
  - [x] Import `FREQUENCY_BANDS` from rhythm generation (defined in `procedural-rhythm-generation.md`)
  - [x] Accept pre-filtered band outputs from `MultiBandAnalyzer` to avoid redundant filtering
  - [x] Use the exact same band definitions:
    ```typescript
    // From procedural-rhythm-generation.md - shared configuration
    const FREQUENCY_BANDS: FrequencyBand[] = [
      { name: 'low', lowHz: 20, highHz: 500, description: 'Low frequencies (bass, kick, sub)' },
      { name: 'mid', lowHz: 500, highHz: 2000, description: 'Mid frequencies (vocals, snare body, lead instruments)' },
      { name: 'high', lowHz: 2000, highHz: 20000, description: 'High frequencies (hi-hats, cymbals, harmonics, air)' },
    ];
    ```
- [x] Apply pitch detection to ALL pre-filtered bands:
  - [x] **Low band (20-500Hz)**: Bass, kick drum, sub frequencies
  - [x] **Mid band (500-2000Hz)**: Vocals, lead melody, snare body - typically the most useful for melody contour
  - [x] **High band (2000-20000Hz)**: Hi-hats, cymbals, harmonics - may have less pitch content but still analyzed
- [x] Store which band produced the most confident pitch results
- [x] Use band selection to inform button generation
  - [x] `MultiBandPitchAnalysis.primaryBand` identifies the best band for button mapping
  - [x] `MultiBandPitchAnalyzer.getPrimaryBandPitches()` method retrieves pitches from the primary band
  - [x] All necessary types exported from `src/core/analysis/index.ts`
  ```typescript
  interface MultiBandPitchAnalysis {
    primaryBand: 'low' | 'mid' | 'high';  // Band with best pitch probability
    bandAnalyses: Map<'low' | 'mid' | 'high', PitchAnalysis>;
    combinedMelody: MelodyContour;
    // Reference to the shared frequency band configuration
    bandsUsed: FrequencyBand[];
  }
  ```

### 1.3 Beat-Timestamped Pitch Detection

**Goal**: Perform pitch detection at the specific timestamps from the generated beat map, rather than running continuous analysis. This approach is more efficient and accurate because we analyze only the audio segments that correspond to actual notes in the rhythm chart.

> **⚠️ Why Timestamp-Based Analysis**: Instead of running pitch detection over the entire audio continuously and then linking results to beats, we analyze only the specific audio segments at `GeneratedBeat.timestamp` positions. This:
> - Reduces computational overhead
> - Provides more accurate pitch detection (shorter, focused analysis windows)
> - Avoids noise from analyzing audio that doesn't correspond to beats
> - Aligns pitch results directly with the rhythm chart

#### 1.3.1 Band Stream Pitch Detection

**Key Insight**: Since pitch detection is based on the timestamps of transients, we iterate over each band stream independently. The `GeneratedRhythm.bandStreams` contains separate `GeneratedBeat[]` arrays for low/mid/high, each with their own timestamps.

- [x] Create `PitchBeatLinker` utility
  - [x] **Iterate over each band stream independently**:
    ```typescript
    // Pseudocode for band stream pitch detection
    for (const band of ['low', 'mid', 'high'] as const) {
      const bandStream = generatedRhythm.bandStreams[band];
      const filteredAudio = multiBandAnalyzer.getBandOutput(band);

      for (const beat of bandStream.beats) {
        // Analyze pitch in the FILTERED audio for this band
        // at the beat's timestamp
        const pitch = pitchDetector.detectAt(filteredAudio, beat.timestamp);
        // Store result keyed by band + beatIndex
      }
    }
    ```
  - [x] For each `GeneratedBeat` in `bandStreams.low`, analyze the **low-frequency filtered audio** at that timestamp
  - [x] For each `GeneratedBeat` in `bandStreams.mid`, analyze the **mid-frequency filtered audio** at that timestamp
  - [x] For each `GeneratedBeat` in `bandStreams.high`, analyze the **high-frequency filtered audio** at that timestamp

#### 1.3.2 Phrase-Level Pitch Correlation

- [x] **Integrate with `RhythmicPhrase` from rhythm generation**:
  - [x] Use `RhythmicPhrase.sourceBand` to know which pre-filtered frequency band to analyze
  - [x] Use `PhraseOccurrence.startTimestamp`/`endTimestamp` to analyze pitch across phrase boundaries
  - [x] Associate detected pitches with phrase occurrences across the song
  ```typescript
  // Re-exported from rhythm generation for reference
  interface PhraseOccurrence {
    beatIndex: number;       // Index into UnifiedBeatMap.beats[]
    startTimestamp: number;  // Start time in seconds (for pitch analysis)
    endTimestamp: number;    // End time in seconds
  }

  interface RhythmicPhrase {
    pattern: GeneratedBeat[];  // The actual rhythm pattern
    sizeInBeats: number;       // 1, 2, 4, or 8
    sourceBand: 'low' | 'mid' | 'high';  // Which band this phrase was detected in
    occurrences: PhraseOccurrence[];     // All locations where this pattern occurs
    significance: number;      // Weighted by size and occurrence count
  }
  ```

#### 1.3.3 Output Types

  ```typescript
  // Direction and interval are populated in section 1.5 (Melody Contour Analysis)
  interface PitchAtBeat {
    beatIndex: number;
    timestamp: number;
    band: 'low' | 'mid' | 'high';  // Which band stream this beat belongs to
    pitch: PitchResult | null;
    direction: 'up' | 'down' | 'stable' | 'none';  // Populated in 1.5
    intervalFromPrevious: number;  // Semitones, 0 if none. Populated in 1.5
    intervalCategory?: IntervalCategory;  // Categorized interval. Populated in 1.5
  }

  interface LinkedPitchAnalysis {
    pitchByBeat: PitchAtBeat[];
    melodyContour: MelodyContour;
    dominantBand: 'low' | 'mid' | 'high';
    phrasePitchCorrelation: Map<string, PitchResult[]>;  // phrase ID -> pitches
  }
  ```

### 1.4 Composite Stream Pitch Derivation

**Goal**: Derive pitches for the composite stream from the already-analyzed band stream pitches. Since the composite stream is assembled from sections of the band streams, we can look up pitches without re-analyzing audio.

> **Key Insight**: The `CompositeStream.sections` array tells us which band contributed each section. We can derive composite pitches by looking up the corresponding band stream beat.

#### 1.4.1 Derivation Logic

- [x] Implement composite pitch derivation
  - [x] For each beat in `CompositeStream.stream`, find which section it belongs to
  - [x] Look up `CompositeSection.sourceBand` for that section
  - [x] Find the corresponding beat in `bandStreams[sourceBand]` by matching timestamp
  - [x] Use the pitch already calculated for that band stream beat
  ```typescript
  interface CompositeSection {
    beatRange: { start: number; end: number };
    sourceBand: 'low' | 'mid' | 'high';  // ← Key for pitch derivation
    score: number;
  }

  // Pseudocode for composite pitch derivation
  function deriveCompositePitches(
    compositeStream: CompositeStream,
    bandStreamPitches: Map<'low' | 'mid' | 'high', PitchAtBeat[]>
  ): PitchAtBeat[] {
    const compositePitches: PitchAtBeat[] = [];

    for (const beat of compositeStream.stream) {
      // Find which section this beat belongs to
      const section = compositeStream.sections.find(s =>
        beat.beatIndex >= s.beatRange.start &&
        beat.beatIndex < s.beatRange.end
      );

      if (section) {
        // Look up the pitch from the source band stream
        const sourcePitches = bandStreamPitches.get(section.sourceBand);
        const matchingPitch = sourcePitches?.find(p => p.timestamp === beat.timestamp);

        compositePitches.push({
          ...matchingPitch,
          // The band in the composite is the source band
          band: section.sourceBand
        });
      }
    }

    return compositePitches;
  }
  ```

#### 1.4.2 Difficulty Variant Pitch Derivation

- [x] Apply same derivation logic to difficulty variants
  - [x] Each `DifficultyVariant.stream` is derived from the composite
  - [x] Pitches can be derived by matching timestamps to composite pitches
  - [x] Simplified variants (easy) may have fewer beats, so filter pitches accordingly

### 1.5 Melody Contour Analysis

**Goal**: Analyze the collected pitch data to identify melodic patterns, direction, and range. This step happens AFTER pitch detection because it needs the pitch data as input.

> **Key Insight**: The primary output for button mapping is the **pitch-to-pitch relationship** - whether each pitch is higher, lower, or the same as the previous, and the interval distance between them. This directional information is what drives button selection in Phase 2.

#### 1.5.1 Pitch-to-Pitch Comparison

- [x] For each band stream, iterate through pitches and compare consecutive beats:
  ```typescript
  // Pseudocode for pitch comparison
  for (const band of ['low', 'mid', 'high'] as const) {
    const pitches = bandStreamPitches.get(band);

    for (let i = 0; i < pitches.length; i++) {
      const current = pitches[i];
      const previous = i > 0 ? pitches[i - 1] : null;

      if (previous?.pitch && current.pitch) {
        const currentMidi = current.pitch.midiNote;
        const previousMidi = previous.pitch.midiNote;

        // Determine direction
        if (currentMidi > previousMidi) {
          current.direction = 'up';
        } else if (currentMidi < previousMidi) {
          current.direction = 'down';
        } else {
          current.direction = 'stable';
        }

        // Calculate interval in semitones
        current.intervalFromPrevious = Math.abs(currentMidi - previousMidi);
      } else {
        current.direction = 'none';
        current.intervalFromPrevious = 0;
      }
    }
  }
  ```

- [x] **Direction categories for button mapping**:
  - `up`: Current pitch is higher than previous (ascending melody)
  - `down`: Current pitch is lower than previous (descending melody)
  - `stable`: Same pitch as previous (repeated note)
  - `none`: No previous pitch available (first note or no pitch detected)

- [x] **Interval categories for button mapping**:
  ```typescript
  // Useful interval groupings for button mapping
  type IntervalCategory =
    | 'unison'      // 0 semitones
    | 'small'       // 1-2 semitones (minor/major 2nd)
    | 'medium'      // 3-4 semitones (minor/major 3rd)
    | 'large'       // 5-7 semitones (4th, tritone, 5th)
    | 'very_large'; // 8+ semitones (6th, 7th, octave+)

  function categorizeInterval(semitones: number): IntervalCategory {
    if (semitones === 0) return 'unison';
    if (semitones <= 2) return 'small';
    if (semitones <= 4) return 'medium';
    if (semitones <= 7) return 'large';
    return 'very_large';
  }
  ```

#### 1.5.2 Contour Aggregation Types

- [x] Create melody contour extraction types
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

#### 1.5.3 Contour Analysis Tasks

- [x] Implement segment detection for melody phrases
  - [x] Group consecutive beats with same direction into segments
  - [x] Calculate total interval span for each segment
- [x] Link segments to beat positions
- [x] Calculate overall contour direction over different time windows
  - [x] Short-term (1-2 beats): immediate direction changes
  - [x] Medium-term (4-8 beats): phrase-level direction
  - [x] Long-term (16+ beats): section-level direction
- [x] Analyze contour separately for each band stream
- [x] Generate combined contour from composite pitches

#### 1.5.4 Output for Button Mapping

- [x] Ensure `PitchAtBeat` is populated with direction and interval:
  ```typescript
  interface PitchAtBeat {
    beatIndex: number;
    timestamp: number;
    band: 'low' | 'mid' | 'high';
    pitch: PitchResult | null;
    direction: 'up' | 'down' | 'stable' | 'none';  // ← Used by button mapper
    intervalFromPrevious: number;  // ← Semitones, used by button mapper
    intervalCategory: IntervalCategory;  // ← Categorized for easier mapping
  }
  ```

### 1.6 Tests
- [x] **Unit tests for pYIN implementation**:
  - [x] Verify YIN difference function produces correct values
  - [x] Verify cumulative mean normalization
  - [x] Verify absolute threshold detection
  - [x] Verify HMM voicing detection transitions (voiced→unvoiced→voiced)
  - [x] Verify HMM pitch state transitions are smooth
  - [x] Verify probability values are in valid range [0,1]
- [x] Unit tests for melody contour extraction
- [x] **Unit tests for pitch-to-pitch comparison**:
  - [x] Verify `direction` is correctly calculated (up/down/stable/none)
  - [x] Verify `intervalFromPrevious` is correctly calculated in semitones
  - [x] Verify `intervalCategory` is correctly assigned (unison/small/medium/large/very_large)
- [x] **Unit tests for per-band contour analysis** (Phase 1.5.3):
  - [x] Verify `bandContours` contains contours for all three bands
  - [x] Verify each band's contour has correct direction and range
- [x] **Unit tests for combined contour generation** (Phase 1.5.3):
  - [x] Verify `combinedContour` spans the full range of all bands
  - [x] Verify `combinedContour` segments are correctly built from all pitches
- [x] Unit tests for multi-band pitch analysis (verify same bands as rhythm generation)
- [x] Test with synthesized audio of known pitch
- [x] Test with real vocal tracks
- [x] Test beat-timestamped pitch detection accuracy
- [x] Verify pitch detection uses pre-filtered band outputs (no redundant filtering)
- [x] **Test composite pitch derivation** - verify derived pitches match source band pitches
- [x] **Test band stream iteration** - verify each band is analyzed with correct filtered audio
- [x] **Test pYIN HMM tracking** - verify smooth pitch trajectories over time
- [x] **Test voicing detection accuracy** - compare voiced/unvoiced classification against ground truth

---

## Phase 2: Button Mapping System

**Goal**: Generate interesting button combinations that follow the music's melody and rhythm.

### 2.1 Button Mapping Configuration

**Controller Modes**: The button mapper supports two distinct controller styles, each with different pitch-to-button mapping strategies:

| Mode | Buttons | Axes | Pitch Expression |
|------|---------|------|------------------|
| **DDR** | up, down, left, right | 2 (vertical + horizontal) | Vertical: up→high, down→low; Horizontal: left→low, right→high |
| **Guitar Hero** | 1, 2, 3, 4, 5 | 1 (horizontal only) | Fretboard metaphor: 1→lowest pitch, 5→highest pitch |

- [x] Define button mapping config
  - [x] Created `src/core/types/ButtonMapping.ts` with:
    - [x] `ControllerMode` type ('ddr' | 'guitar_hero')
    - [x] `DDRButton` type ('up' | 'down' | 'left' | 'right')
    - [x] `GuitarHeroButton` type (1 | 2 | 3 | 4 | 5)
    - [x] `ButtonMappingConfig` interface with all properties
    - [x] `DEFAULT_BUTTON_MAPPING_CONFIG` constant
    - [x] `CONSECUTIVE_KEY_LIMITS` by difficulty
    - [x] `getConsecutiveKeyLimit()` helper
    - [x] `validateButtonMappingConfig()` validation
    - [x] `mergeButtonMappingConfig()` helper
  - [x] Added exports to `src/index.ts`
  ```typescript
  interface ButtonMappingConfig {
    difficulty: DifficultyPreset;

    // === Controller Mode ===
    // Determines available buttons and mapping strategy
    controllerMode: 'ddr' | 'guitar_hero';

    // === Pitch Influence ===
    // How strongly pitch affects button selection (0-1) (default 1)
    // 0 = pure pattern library (skips pitch analysis entirely), 1 = pure pitch-driven
    pitchInfluenceWeight: number;

    // === Rhythm Influence ===
    emphasizeDownbeats: boolean;
    emphasizeSyncopation: boolean;

    // === Difficulty Settings ===
    consecutiveSameKeyLimit: number;  // Max same-key repeats: easy=12, medium=8, hard=6
    patternMemory: number;  // Measures to avoid repeating

    // Band selection (from rhythm generation)
    useRhythmBand: boolean;  // Use same band that won rhythm slicing
  }

  // Controller mode determines available buttons
  type ControllerMode = 'ddr' | 'guitar_hero';

  // DDR: 4 directional buttons, 2-axis pitch expression
  type DDRButton = 'up' | 'down' | 'left' | 'right';

  // Guitar Hero: 5 fret buttons, 1-axis pitch expression (left-to-right = low-to-high)
  type GuitarHeroButton = 1 | 2 | 3 | 4 | 5;

  // Re-exported from rhythm generation for reference
  interface GeneratedBeat {
    timestamp: number;           // Quantized time in seconds
    beatIndex: number;           // Index into UnifiedBeatMap.beats[]
    gridPosition: number;        // Position within that beat (0-3 for 16th, 0-2 for triplet)
    gridType: 'straight_16th' | 'triplet_8th';
    intensity: number;           // Transient strength (0.0 - 1.0)
    band: 'low' | 'mid' | 'high';
    quantizationError?: number;  // How far it was moved from original (ms)
  }
  ```

### 2.2 Button Pattern Vocabulary

**Purpose**: The pattern library provides fallback button assignments when:
- `pitchInfluenceWeight` is low (more pattern-driven)
- Pitch detection probability is low (no reliable pitch data)
- Specific rhythmic patterns are more playable than pitch-accurate mapping

Patterns are controller-mode-specific:
- **DDR patterns**: Use 'up', 'down', 'left', 'right'
- **Guitar Hero patterns**: Use 1, 2, 3, 4, 5

- [x] Define button pattern types
  - [x] Created `ButtonPattern<T>` generic interface with id, name, controllerMode, keys, measures, tags, category, difficulty
  - [x] Added `ButtonPatternCategory` type for grouping patterns
  - [x] Added `DDRPattern` and `GuitarHeroPattern` type aliases
  - [x] Added `ButtonPatternLibrary<T>` interface for organizing patterns
  - [x] Added `PatternSelectionOptions` and `PatternSelectionResult` types
  - [x] Added exports to `src/index.ts`
  ```typescript
  interface ButtonPattern<T extends DDRButton | GuitarHeroButton> {
    id: string;
    name: string;
    controllerMode: 'ddr' | 'guitar_hero';
    keys: T[];  // Sequence of keys per beat (mode-specific)
    measures: number;
    tags: string[];
    category: ButtonPatternCategory;
    difficulty: number;  // 1-10
  }

  // DDR Example patterns:
  // "alternating": ['up', 'down', 'up', 'down']
  // "roll": ['left', 'down', 'right']
  // "stream": ['left', 'left', 'right', 'right']
  // "staircase": ['up', 'right', 'down', 'left']

  // Guitar Hero Example patterns:
  // "ascending": [1, 2, 3, 4]
  // "descending": [5, 4, 3, 2]
  // "alternating": [1, 3, 1, 3]
  // "power_chord": [1, 3, 5]
  ```
- [x] Create pattern library (separate libraries per controller mode)
  - [x] DDR patterns
    - [x] Basic patterns (alternating, single key runs)
    - [x] Roll patterns (sequential key presses around the pad)
    - [x] Stream patterns (repeated directions)
    - [x] Jump patterns (non-adjacent keys)
  - [x] Guitar Hero patterns
    - [x] Basic patterns (ascending, descending runs)
    - [x] Alternating patterns (1-3, 2-4)
    - [x] Chord patterns (1-3-5 power chord shapes)
    - [x] Jump patterns (1-4, 2-5 stretches)

### 2.3 Button Mapper Class
- [x] Create `ButtonMapper` in `src/core/generation/ButtonMapper.ts`
  ```typescript
  class ButtonMapper {
    constructor(config: ButtonMappingConfig);

    // Main entry point - takes GeneratedRhythm, outputs mapped variant
    map(
      generatedRhythm: GeneratedRhythm,
      difficulty: 'easy' | 'medium' | 'hard',  // Which variant to map
      pitchAnalysis?: LinkedPitchAnalysis
    ): MappedLevelResult;

    // === Controller-Mode-Specific Pitch Mapping ===

    // DDR: Maps pitch to directional button using 2-axis logic
    // - Vertical axis: pitch up/down → up/down buttons
    // - Horizontal axis: large intervals → left/right buttons
    private mapPitchToDDR(
      pitch: PitchAtBeat,
      previousKey: DDRButton | null
    ): DDRButton;

    // Guitar Hero: Maps pitch to fret button using 1-axis logic
    // - Fretboard metaphor: pitch up → move right (higher fret)
    // - Interval size determines fret jump distance
    private mapPitchToGuitarHero(
      pitch: PitchAtBeat,
      previousKey: GuitarHeroButton | null
    ): GuitarHeroButton;

    // === Pattern Selection (controller-mode-aware) ===

    // Selects pattern from appropriate library (DDR or Guitar Hero)
    private selectButtonPattern(
      gridType: 'straight_16th' | 'triplet_8th',
      measureIndex: number
    ): ButtonPattern<DDRButton> | ButtonPattern<GuitarHeroButton>;

    // === Core Mapping Logic ===

    // Combine pitch + pattern influences based on pitchInfluenceWeight
    // Uses probability-based blending: lowest probability pitch detections
    // are replaced with pattern buttons first
    // weight: 0 = all patterns, 1 = all pitch (for beats with pitch)
    private blendPitchAndPattern<T extends DDRButton | GuitarHeroButton>(
      beats: PitchAtBeat[],
      pitchKeys: (T | null)[],
      patternKeys: T[],
      weight: number
    ): T[];

    // Difficulty adjustments
    private applyDifficultyVariation(
      keys: (DDRButton | GuitarHeroButton)[],
      difficulty: DifficultyPreset
    ): (DDRButton | GuitarHeroButton)[];
  }

  interface MappedLevelResult {
    // The selected difficulty variant with keys assigned
    variant: DifficultyVariant;
    // Original rhythm metadata preserved
    rhythmMetadata: RhythmMetadata;
    // Button mapping metadata
    buttonMetadata: {
      controllerMode: 'ddr' | 'guitar_hero';
      keysUsed: string[];  // e.g., ['up', 'down', 'left', 'right'] or ['1', '2', '3', '4', '5']
      pitchInfluencedBeats: number;
      patternsUsed: string[];
    };
  }
  ```

### 2.4 Pitch-to-Button Mapping Strategies

> **Input from Phase 1**: These strategies use `PitchAtBeat.direction`, `PitchAtBeat.intervalFromPrevious`, and `PitchAtBeat.intervalCategory` (defined in section 1.5.4).
>
> **Controller Mode Matters**: Each mode expresses pitch movement differently:
> - **DDR**: 2 axes (vertical for pitch up/down, horizontal for interval magnitude)
> - **Guitar Hero**: 1 axis (fretboard position = pitch height)

#### 2.4.1 DDR Mode Strategy (4 buttons, circular motion)

The DDR pad uses **circular motion** as the primary movement philosophy. Dancing should feel like constant circular flow rather than axis-based jumps. The natural clockwise flow is: `up → right → down → left → up`.

**Design Principles:**
- Small intervals move to adjacent buttons in circular sequence
- Medium intervals continue circular motion but may cross axes
- Large intervals move toward vertical axis (up/down)
- Very large intervals go to opposite horizontal (left↔right)

**State Transition Table:** The next button depends on (1) current position, (2) pitch direction, and (3) interval size:

| From | Ascending → | | | | | Descending → | | | | | Stable |
|------|-------------|------|---------|-------|------------|-------------|------|---------|-------|------------|-------|
| | unison | small | medium | large | very_large | unison | small | medium | large | very_large | |
| **up** | up | up | right | right | left | up | left | right | down | down | up |
| **right** | right | up | up | up | left | right | down | down | down | left | right |
| **down** | down | left | right | up | up | down | down | left | left | right | down |
| **left** | left | up | up | up | right | left | down | down | down | right | left |

- [x] Implement DDR pitch-to-button mapping with state transitions
  ```typescript
  type DDRButton = 'up' | 'down' | 'left' | 'right';
  type IntervalCategory = 'unison' | 'small' | 'medium' | 'large' | 'very_large';
  type PitchDirection = 'up' | 'down' | 'stable' | 'none';

  // DDR Circular Motion Transition Table
  // Determines next button based on: current position + pitch direction + interval size
  const DDR_TRANSITIONS: Record<DDRButton, {
    ascending: Record<IntervalCategory, DDRButton>;
    descending: Record<IntervalCategory, DDRButton>;
    stable: DDRButton;
  }> = {
    'up': {
      ascending: {
        unison: 'up',
        small: 'up',           
        medium: 'right',      
        large: 'right',        
        very_large: 'left',   
      },
      descending: {
        unison: 'up',
        small: 'left',       
        medium: 'right',
        large: 'down',         
        very_large: 'down',  
      },
      stable: 'up',
    },
    'right': {
      ascending: {
        unison: 'right',
        small: 'up',       
        medium: 'up',        
        large: 'up',        
        very_large: 'left',  
      },
      descending: {
        unison: 'right',
        small: 'down',          
        medium: 'down',
        large: 'down',          
        very_large: 'left', 
      },
      stable: 'right',
    },
    'down': {
      ascending: {
        unison: 'down',
        small: 'left',       
        medium: 'right',
        large: 'up',        
        very_large: 'up',  
      },
      descending: {
        unison: 'down',
        small: 'down',        
        medium: 'left',       
        large: 'left',        
        very_large: 'right',    
      },
      stable: 'down',
    },
    'left': {
      ascending: {
        unison: 'left',
        small: 'up',          
        medium: 'up',
        large: 'up',          
        very_large: 'right',   
      },
      descending: {
        unison: 'left',
        small: 'down',         
        medium: 'down',       
        large: 'down',         
        very_large: 'right', 
      },
      stable: 'left',
    },
  };

  // DDR mapping function using state transitions
  function mapPitchToDDR(
    pitch: PitchAtBeat,
    previousKey: DDRButton | null
  ): DDRButton {
    // No pitch detected → use pattern library
    if (pitch.direction === 'none') {
      return selectFromPatternLibrary('ddr', previousKey);
    }

    // Default starting position
    const currentButton = previousKey ?? 'left';  // Start from left for natural clockwise flow

    // Stable pitch → repeat previous
    if (pitch.direction === 'stable' || pitch.intervalCategory === 'unison') {
      return currentButton;
    }

    // Look up transition based on direction and interval
    const transitions = DDR_TRANSITIONS[currentButton];
    const directionKey = pitch.direction === 'up' ? 'ascending' : 'descending';

    return transitions[directionKey][pitch.intervalCategory];
  }
  ```

#### 2.4.2 Guitar Hero Mode Strategy (5 buttons, 1 axis)

Guitar Hero uses a fretboard metaphor - the buttons are arranged left-to-right (1-5), where:
- Lower pitches map to lower fret numbers (1, 2)
- Higher pitches map to higher fret numbers (4, 5)
- Button 3 is the "middle" position

**Fret Transition Table:** The next fret depends on (1) current fret, (2) pitch direction, and (3) interval size:

| From | Ascending → | | | | | Descending → | | | | | Stable |
|------|-------------|------|---------|-------|------------|-------------|------|---------|-------|------------|-------|
| | unison | small | medium | large | very_large | unison | small | medium | large | very_large | |
| **1** | 1 | 2 | 2 | 3 | 3 | 1 | 4↗ | 4↗ | 3↗ | 3 | 1 |
| **2** | 2 | 3 | 3 | 4 | 4 | 2 | 1 | 1 | 4↗ | 4 | 2 |
| **3** | 3 | 4 | 4 | 5 | 5 | 3 | 2 | 2 | 1 | 1 | 3 |
| **4** | 4 | 5 | 5 | 2↘ | 2↘ | 4 | 3 | 3 | 2 | 1 | 4 |
| **5** | 5 | 2↘ | 2↘ | 3↘ | 3↘ | 5 | 4 | 4 | 3 | 2 | 5 |

↘ = string wrap down (ceiling → wrap to lower fret)
↗ = string wrap up (floor → wrap to higher fret)

**String Wrap Logic:** Instead of clamping at frets 1 and 5, simulate a string change:
- **Ascending past fret 5** → wrap to fret 2-3 (like moving to a higher string)
  - From 5 +1 fret → fret 2
  - From 5 +2 frets → fret 3
  - From 5 +3 frets → fret 3 (stays centered)
- **Descending past fret 1** → wrap to fret 3-4 (like moving to a lower string)
  - From 1 -1 fret → fret 4
  - From 1 -2 frets → fret 3
  - From 1 -3 frets → fret 3 (stays centered)

**Key observations:**
- Small/medium intervals move by 1 fret (adjacent)
- Large intervals skip 2 frets
- Very large intervals skip 3 frets (more dramatic expression)
- String wrap keeps motion flowing - no stuck positions

- [x] Implement Guitar Hero pitch-to-button mapping with state transitions
  ```typescript
  type GuitarHeroButton = 1 | 2 | 3 | 4 | 5;

  // Guitar Hero Fret Transition Table (with string wrap)
  // Determines next fret based on: current position + pitch direction + interval size
  // String wrap: ascending past 5 → wraps to 2-4; descending past 1 → wraps to 4-2
  const GUITAR_HERO_TRANSITIONS: Record<GuitarHeroButton, {
    ascending: Record<IntervalCategory, GuitarHeroButton>;
    descending: Record<IntervalCategory, GuitarHeroButton>;
    stable: GuitarHeroButton;
  }> = {
    1: {
      ascending: { unison: 1, small: 2, medium: 2, large: 3, very_large: 3 },
      descending: { unison: 1, small: 4, medium: 4, large: 3, very_large: 3 }, // string wrap up
      stable: 1,
    },
    2: {
      ascending: { unison: 2, small: 3, medium: 3, large: 4, very_large: 4 },
      descending: { unison: 2, small: 1, medium: 1, large: 4, very_large: 4 }, // large/very_large wrap
      stable: 2,
    },
    3: {
      ascending: { unison: 3, small: 4, medium: 4, large: 5, very_large: 5 },
      descending: { unison: 3, small: 2, medium: 2, large: 1, very_large: 1 }, // very_large wraps
      stable: 3,
    },
    4: {
      ascending: { unison: 4, small: 5, medium: 5, large: 2, very_large: 2 }, // string wrap down
      descending: { unison: 4, small: 3, medium: 3, large: 2, very_large: 1 },
      stable: 4,
    },
    5: {
      ascending: { unison: 5, small: 2, medium: 2, large: 3, very_large: 3 }, // string wrap down
      descending: { unison: 5, small: 4, medium: 4, large: 3, very_large: 2 },
      stable: 5,
    },
  };

  // Fret jump distances (alternative: algorithmic approach)
  const FRET_JUMPS: Record<IntervalCategory, number> = {
    unison: 0,
    small: 1,
    medium: 1,
    large: 2,
    very_large: 3,  // More dramatic than 'large'
  };

  // String wrap thresholds
  const FRET_CEILING = 5;
  const FRET_FLOOR = 1;
  const WRAP_TARGET_HIGH = 2;  // When ascending past ceiling, land here (+offset)
  const WRAP_TARGET_LOW = 4;   // When descending past floor, land here (-offset)

  // Guitar Hero mapping function using state transitions
  function mapPitchToGuitarHero(
    pitch: PitchAtBeat,
    previousKey: GuitarHeroButton | null
  ): GuitarHeroButton {
    // No pitch detected → use pattern library
    if (pitch.direction === 'none') {
      return selectFromPatternLibrary('guitar_hero', previousKey);
    }

    // Default to middle fret
    const currentFret = previousKey ?? 3;

    // Stable pitch → stay on current fret
    if (pitch.direction === 'stable' || pitch.intervalCategory === 'unison') {
      return currentFret;
    }

    // Look up transition based on direction and interval
    const transitions = GUITAR_HERO_TRANSITIONS[currentFret];
    const directionKey = pitch.direction === 'up' ? 'ascending' : 'descending';

    return transitions[directionKey][pitch.intervalCategory];
  }

  // Alternative: Algorithmic approach with string wrap
  function mapPitchToGuitarHeroAlgorithmic(
    pitch: PitchAtBeat,
    previousKey: GuitarHeroButton | null
  ): GuitarHeroButton {
    if (pitch.direction === 'none') {
      return selectFromPatternLibrary('guitar_hero', previousKey);
    }

    const currentFret = previousKey ?? 3;

    if (pitch.direction === 'stable' || pitch.intervalCategory === 'unison') {
      return currentFret;
    }

    const jump = FRET_JUMPS[pitch.intervalCategory];
    const direction = pitch.direction === 'up' ? +1 : -1;
    let newFret = currentFret + (direction * jump);

    // String wrap instead of clamping
    if (newFret > FRET_CEILING) {
      // Ascending past fret 5 → wrap down to fret 2 (+ offset)
      // e.g., 5+1=6 → 2, 5+2=7 → 3, 5+3=8 → 4
      newFret = WRAP_TARGET_HIGH + (newFret - FRET_CEILING - 1);
    } else if (newFret < FRET_FLOOR) {
      // Descending past fret 1 → wrap up to fret 4 (- offset)
      // e.g., 1-1=0 → 4, 1-2=-1 → 3, 1-3=-2 → 2
      newFret = WRAP_TARGET_LOW - (FRET_FLOOR - newFret - 1);
    }

    return newFret as GuitarHeroButton;
  }
  ```

#### 2.4.3 Common Mapping Logic

**Goal**: Blend pitch-derived buttons with pattern-derived buttons based on pYIN probability.

**Strategy**: Replace buttons in order of probability - lowest probability pitch detections are replaced with pattern buttons first. This ensures that high-probability pitch data is preserved while uncertain pitches fall back to patterns.

- [x] Implement probability-based blending
  ```typescript
  /**
   * Blends pitch-derived and pattern-derived buttons based on pYIN probability.
   *
   * Algorithm:
   * 1. Sort all beats by pitch probability (lowest → highest)
   * 2. Calculate how many beats to replace based on weight
   * 3. Replace the lowest-probability beats with pattern buttons
   * 4. Keep pitch buttons for highest-probability beats
   *
   * @param beats - All beats with pitch data (including probability)
   * @param pitchKeys - Pitch-derived button for each beat (null if no pitch)
   * @param patternKeys - Pattern-derived button for each beat
   * @param weight - 0 = all pattern, 1 = all pitch
   * @returns Final button assignments
   */
  function blendPitchAndPattern<T extends DDRButton | GuitarHeroButton>(
    beats: PitchAtBeat[],
    pitchKeys: (T | null)[],
    patternKeys: T[],
    weight: number
  ): T[] {
    // Build list with probability (from pYIN HMM), filtering out beats with no pitch
    const withProbability = beats
      .map((beat, index) => ({
        index,
        probability: beat.pitch?.probability ?? 0,  // pYIN probability (0-1)
        hasPitch: pitchKeys[index] !== null,
      }))
      .filter(item => item.hasPitch);

    // Sort by probability (lowest first) - these get replaced first
    withProbability.sort((a, b) => a.probability - b.probability);

    // Calculate how many beats to replace with patterns
    // weight = 1.0 → 0% replaced (all pitch)
    // weight = 0.5 → 50% replaced (lowest probability half)
    // weight = 0.0 → 100% replaced (all patterns)
    const replaceCount = Math.floor(withProbability.length * (1 - weight));

    // Indices of beats to replace (lowest probability)
    const indicesToReplace = new Set(
      withProbability.slice(0, replaceCount).map(item => item.index)
    );

    // Build final result
    return beats.map((beat, index) => {
      // No pitch available → always use pattern
      if (pitchKeys[index] === null) {
        return patternKeys[index];
      }
      // Low probability → use pattern
      if (indicesToReplace.has(index)) {
        return patternKeys[index];
      }
      // High probability → use pitch
      return pitchKeys[index]!;
    });
  }
  ```

- [x] **Probability-based blending rationale** (using pYIN HMM probabilities):
  | Probability Level | Weight = 0.8 | Weight = 0.5 | Weight = 0.2 |
  |-------------------|--------------|--------------|--------------|
  | 0.9 (high)        | pitch        | pitch        | pattern      |
  | 0.7               | pitch        | pitch        | pattern      |
  | 0.5               | pitch        | pattern      | pattern      |
  | 0.3 (low)         | pitch        | pattern      | pattern      |
  | no pitch          | pattern      | pattern      | pattern      |

- [x] **Pattern filling for filtered beats**:
  - After identifying which beats need patterns (low probability or no pitch), fill them immediately
  - Randomly select from all patterns in the vocabulary that can fill the available hole
  - If no pattern can fill a remaining unassigned beat, interpolate from the previous pattern button to the next detected pitch button
  ```typescript
  function fillPatternHoles<T extends DDRButton | GuitarHeroButton>(
    beats: PitchAtBeat[],
    pitchKeys: (T | null)[],      // null = needs pattern
    patternLibrary: ButtonPattern<T>[],
    previousKey: T | null
  ): T[] {
    const result: T[] = [...pitchKeys.map(k => k)];  // Copy pitch keys

    for (let i = 0; i < beats.length; i++) {
      if (result[i] !== null) continue;  // Already has pitch key

      // Find patterns that can fill this hole
      // Consider: previous key, next pitch key, and context
      const nextPitchKey = findNextPitchKey(result, i);
      const compatiblePatterns = patternLibrary.filter(pattern =>
        isPatternCompatible(pattern, previousKey, nextPitchKey)
      );

      if (compatiblePatterns.length > 0) {
        // Randomly select a compatible pattern
        const pattern = compatiblePatterns[Math.floor(Math.random() * compatiblePatterns.length)];
        result[i] = pattern.keys[0];  // Use first key from pattern
      } else {
        // No pattern fits - interpolate to next pitch key
        result[i] = interpolateButton(previousKey, nextPitchKey);
      }

      previousKey = result[i];
    }

    return result as T[];
  }
  ```

### 2.5 Difficulty-Based Button Logic

> **How pitch influence works**: The `pitchInfluenceWeight` (0-1) defaults to **1.0** (full pitch influence) and is **user-controlled only**. It does not change based on difficulty. A weight of 1.0 means buttons follow the melody; lower values allow more patterns to fill in.

- [x] **Easy**:
  - Single button per beat
  - **Direction-only mapping**: Uses only`PitchAtBeat.direction` (up/down/stable), ignores`intervalCategory`
  - **No leaps**: Only moves to adjacent buttons (stepwise motion), never skips
  - `stable` direction = repeat the same key
  - `consecutiveSameKeyLimit`: 12

- [x] **Medium**:
  - **Direction + interval mapping**: Uses both `PitchAtBeat.direction` and `intervalCategory`
  - **Leaps allowed**: Can skip buttons based on interval size (medium/large/very_large intervals)
  - Pattern variation enabled
  - `consecutiveSameKeyLimit`: 8

- [x] **Hard**:
  - **Direction + interval mapping**: Uses both `PitchAtBeat.direction` and `intervalCategory`
  - **Leaps allowed**: Can skip buttons based on interval size (medium/large/very_large intervals)
  - Rapid button changes allowed
  - Complex patterns (rolls, streams)
  - `consecutiveSameKeyLimit`: 6

### 2.6 Band-Aware Button Mapping

> **Context**: The pitch-band combination was already done in Phase 1 section 1.4 (Composite Stream Pitch Derivation). This section is about using that already-combined information during button mapping.
>
> **Input from Phase 1**: `PitchAtBeat.band` tells us which frequency band each beat's pitch was derived from (see section 1.3.3).

- [x] Implement band-aware button mapping
  - Use `PitchAtBeat.band` to know which frequency band the pitch came from
  - The pitch data already reflects the correct band (via derivation in 1.4)
  - Store band selection from rhythm generation in metadata for transparency
  ```typescript
  // Re-exported from rhythm generation for reference
  interface CompositeSection {
    beatRange: { start: number; end: number };
    sourceBand: 'low' | 'mid' | 'high';
    score: number;  // Why this band won this section
  }

  interface BandAwareMapping {
    rhythmBand: 'low' | 'mid' | 'high';  // From CompositeSection.sourceBand
    pitchBand: 'low' | 'mid' | 'high';   // From PitchAtBeat.band (usually matches)
    useConsistentBands: boolean;
  }
  ```

### 2.7 Output Format Conversion (GeneratedBeat → ChartedBeatMap)

**Goal**: Convert the procedural generation output (`GeneratedBeat[]`) to a format compatible with the existing manual charting system (`ChartedBeatMap`) for use with `BeatStream`.

#### 2.7.1 ChartedBeatMap Type Definition

The `ChartedBeatMap` is the final output format that bridges procedural generation with the existing beat map infrastructure:

```typescript
import type { Beat, DownbeatConfig, SubdivisionType } from '../../types/BeatMap.js';

/**
 * A beat in a procedurally generated chart.
 * Extends the base Beat interface with procedural-generation-specific fields.
 */
interface ChartedBeat extends Beat {
  // === Inherited from Beat ===
  // timestamp: number;
  // beatInMeasure: number;  // Decimal position (0, 0.25, 0.5, 0.75 for 16th notes)
  // isDownbeat: boolean;
  // measureNumber: number;
  // intensity: number;
  // confidence: number;
  // requiredKey?: string;  // Assigned by ButtonMapper

  // === Procedural generation fields ===

  /** Index into the original UnifiedBeatMap.beats[] - which quarter note this belongs to */
  quarterNoteIndex: number;

  /** Position within that quarter note (0-3 for 16th, 0-2 for triplet) */
  subdivisionPosition: number;

  /** Whether this was detected from audio (true) or interpolated/generated (false) */
  isDetected: boolean;

  /** The subdivision type used for this beat */
  subdivisionType: SubdivisionType;

  /** Which frequency band this beat originated from */
  sourceBand: 'low' | 'mid' | 'high';

  /** Quantization error in milliseconds (how far from original transient) */
  quantizationError?: number;
}

/**
 * A complete procedurally-generated chart ready for gameplay.
 * Compatible with BeatStream and the existing beat map infrastructure.
 */
interface ChartedBeatMap {
  /** Unique identifier for the audio source */
  audioId: string;

  /** Duration of the audio in seconds */
  duration: number;

  /** All beats with required keys assigned */
  beats: ChartedBeat[];

  /** Indices of beats that were originally detected from audio */
  detectedBeatIndices: number[];

  /** The downbeat configuration inherited from UnifiedBeatMap */
  downbeatConfig: DownbeatConfig;

  /** Quarter note interval in seconds (from UnifiedBeatMap) */
  quarterNoteInterval: number;

  /** Equivalent BPM (60 / quarterNoteInterval) */
  bpm: number;

  /** Chart metadata */
  chartMetadata: ChartMetadata;
}

interface ChartMetadata {
  /** Which difficulty this chart represents */
  difficulty: 'easy' | 'medium' | 'hard';

  /** Keys used in this chart */
  keysUsed: string[];

  /** Number of beats with pitch-influenced keys */
  pitchInfluencedBeats: number;

  /** Button patterns used */
  patternsUsed: string[];

  /** Source rhythm metadata */
  rhythmMetadata: RhythmMetadata;

  /** Pitch analysis metadata (if pitch detection was used) */
  pitchMetadata: {
    bandUsed: 'low' | 'mid' | 'high';
    melodyRange: { min: string; max: string } | null;
    /** Direction statistics from melody contour analysis (Phase 1 section 1.5) */
    directionStats: {
      up: number;      // Count of ascending pitches
      down: number;    // Count of descending pitches
      stable: number;  // Count of repeated pitches
      none: number;    // Count with no pitch detected
    } | null;
    /** Interval statistics from melody contour analysis (Phase 1 section 1.5) */
    intervalStats: {
      unison: number;
      small: number;
      medium: number;
      large: number;
      very_large: number;
    } | null;
  } | null;

  /** Generation timestamp */
  generatedAt: string;

  /** Seed used for reproducibility */
  seed?: string;
}
```

#### 2.7.2 BeatConverter Class

- [x] Create `BeatConverter` in `src/core/generation/BeatConverter.ts`
  ```typescript
  /**
   * Converts procedural generation output (GeneratedBeat[]) to ChartedBeatMap
   * for compatibility with BeatStream and the existing beat map infrastructure.
   */
  class BeatConverter {
    /**
     * Convert a DifficultyVariant to a ChartedBeatMap
     *
     * @param variant - The difficulty variant with GeneratedBeat[]
     * @param unifiedBeatMap - The source UnifiedBeatMap for measure/beat info
     * @param keyAssignments - Map of beat index to required key
     * @param metadata - Chart metadata
     * @returns A ChartedBeatMap ready for BeatStream
     */
    convertToChartedBeatMap(
      variant: DifficultyVariant,
      unifiedBeatMap: UnifiedBeatMap,
      keyAssignments: Map<number, string>,
      metadata: Partial<ChartMetadata>
    ): ChartedBeatMap;

    /**
     * Convert a single GeneratedBeat to ChartedBeat
     *
     * @param beat - The GeneratedBeat to convert
     * @param unifiedBeatMap - Source for measure/beat info
     * @param key - The required key (if assigned)
     * @returns A ChartedBeat
     */
    private convertBeat(
      beat: GeneratedBeat,
      unifiedBeatMap: UnifiedBeatMap,
      key?: string
    ): ChartedBeat;

    /**
     * Calculate beatInMeasure from gridPosition and gridType
     *
     * @param quarterNoteIndex - Index of the parent quarter note
     * @param gridPosition - Position within that quarter (0-3 for 16th, 0-2 for triplet)
     * @param gridType - The grid type
     * @returns Decimal beatInMeasure value
     */
    private calculateBeatInMeasure(
      quarterNoteIndex: number,
      gridPosition: number,
      gridType: 'straight_16th' | 'triplet_8th'
    ): number;

    /**
     * Map gridType to SubdivisionType
     *
     * @param gridType - Procedural grid type
     * @returns SubdivisionType for the beat
     */
    private mapGridToSubdivision(
      gridType: 'straight_16th' | 'triplet_8th'
    ): SubdivisionType;
  }
  ```

#### 2.7.3 Conversion Logic Details

- [x] **beatInMeasure calculation**:
  - Get parent quarter note's `beatInMeasure` from UnifiedBeatMap
  - For `straight_16th`: Add `gridPosition * 0.25` (0, 0.25, 0.5, 0.75)
  - For `triplet_8th`: Add `gridPosition * 0.33` (0, 0.33, 0.67)

- [x] **isDownbeat and measureNumber**:
  - Inherited from the parent quarter note in UnifiedBeatMap
  - Subdivisions of beat 0 (downbeat) are NOT downbeats themselves

- [x] **subdivisionType mapping**:
  ```typescript
  const GRID_TO_SUBDIVISION = {
    'straight_16th': 'sixteenth',
    'triplet_8th': 'triplet8',
  };
  ```

- [x] **confidence assignment**:
  - Use `intensity` from GeneratedBeat as base confidence
  - Set `confidence = 1.0` for detected beats
  - Set `confidence = 0.8` for interpolated/generated beats

- [x] **requiredKey assignment**:
  - Look up key from `keyAssignments` map by beat index
  - Set `requiredKey` only if key exists in map

#### 2.7.4 Tests for Conversion

 *
 * Tests the conversion of procedural generation output to ChartedBeatMap format.
 */

- [x] Unit tests for `calculateBeatInMeasure` (all grid positions)
- [x] Unit tests for `mapGridToSubdivision`
- [x] Unit tests for full `convertToChartedBeatMap`
- [x] Verify converted beats have correct `beatInMeasure` values
- [x] Verify `isDownbeat` is only true for quarter note positions
- [x] Verify `requiredKey` is correctly assigned from map
- [x] Integration test: converted ChartedBeatMap works with BeatStream
- [x] Integration test: key matching works with `checkButtonPress()`

### 2.8 Tests
- [x] Unit tests for DDR mode pitch-to-button mapping
  - [x] Verify pitch up → 'up' button for small/medium intervals
  - [x] Verify pitch down → 'down' button for small/medium intervals
  - [x] Verify large intervals → horizontal axis (left/right)
  - [x] Verify stable pitch → repeat previous button
  - [x] Verify 'none' direction → falls back to pattern library
- [x] Unit tests for Guitar Hero mode pitch-to-button mapping
  - [x] Verify pitch up → higher fret number (move right)
  - [x] Verify pitch down → lower fret number (move left)
  - [x] Verify interval size affects fret jump distance
  - [x] Verify fret clamping to valid range (1-5) (with string wrap)
  - [x] Verify stable pitch → stay on same fret
- [x] Unit tests for pattern selection (both controller modes)
- [x] Verify difficulty constraints are respected
- [x] Test band-aware mapping logic (using `PitchAtBeat.band`)
- [x] **Unit tests for probability-based blending (`blendPitchAndPattern`)**:
  - [x] Verify weight = 1.0 → all pitch buttons used (no replacement)
  - [x] Verify weight = 0.0 → all pattern buttons used (full replacement)
  - [x] Verify weight = 0.5 → 50% replaced (lowest probability half)
  - [x] Verify lowest probability beats are replaced first
  - [x] Verify beats with no pitch (null) always use pattern regardless of weight
  - [x] Verify high-probability pitch beats are preserved when weight > 0
  - [x] Verify correct behavior with ties in probability (deterministic ordering)
- [x] Integration test: full button mapping with real pitch data
- [x] Verify direction statistics are calculated correctly in output metadata

---

## Phase 3: Level Generator Orchestration

**Goal**: Create the orchestrator that combines rhythm and button mapping into complete playable levels.

### 3.1 Level Generator Class
- [x] Create `LevelGenerator` in `src/core/generation/LevelGenerator.ts`
  ```typescript
  interface LevelGenerationOptions {
    difficulty: DifficultyPreset;

    // Controller mode (DDR or Guitar Hero)
    controllerMode: 'ddr' | 'guitar_hero';

    // Rhythm settings (passes through to RhythmGenerator)
    rhythm: Partial<RhythmGenerationOptions>;

    // Button settings
    buttons: Partial<ButtonMappingConfig>;

    // Seed for reproducibility
    seed?: string;
  }

  // Note: Pitch analysis is automatically skipped when pitchInfluenceWeight = 0
  // This optimization avoids expensive pitch detection when using pattern-only mode

  class LevelGenerator {
    constructor(options: LevelGenerationOptions);

    async generate(
      audioBuffer: AudioBuffer,
      beatMap: BeatMap,
      interpolatedBeatMap: InterpolatedBeatMap
    ): Promise<GeneratedLevel>;

    // Pipeline steps
    private async generateRhythm(...): Promise<GeneratedRhythm>;

    // Analyze pitch on all band streams, then derive composite/variant pitches
    // See Phase 1 sections 1.2-1.5 for details
    private async analyzePitch(
      audioBuffer: AudioBuffer,
      generatedRhythm: GeneratedRhythm
    ): Promise<LinkedPitchAnalysis>;

    private mapButtons(
      rhythm: GeneratedRhythm,
      pitch: LinkedPitchAnalysis | null
    ): MappedLevelResult;
  }

  // Re-exported from rhythm generation for reference
  interface DifficultyVariant {
    difficulty: 'easy' | 'medium' | 'hard';
    stream: GeneratedBeat[];
    isUnedited: boolean;  // true for the composite's natural difficulty
    editType: 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';
    editAmount: number;  // 0-1, how much was changed
    patternsInserted?: string[];  // IDs of patterns inserted (if any)
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

  interface GeneratedLevel {
    // === PLAYABLE OUTPUT ===
    // The ChartedBeatMap ready for use with BeatStream
    chart: ChartedBeatMap;

    // === SOURCE DATA (for reference/re-generation) ===
    // The selected difficulty variant with keys assigned
    variant: DifficultyVariant;

    // Original rhythm outputs preserved
    rhythm: GeneratedRhythm;

    // Pitch analysis results
    pitchAnalysis: LinkedPitchAnalysis | null;

    // Combined metadata
    metadata: LevelMetadata;
  }

  interface LevelMetadata {
    difficulty: DifficultyPreset;
    rhythmMetadata: RhythmMetadata;
    buttonMetadata: {
      keysUsed: string[];
      pitchInfluencedBeats: number;
      patternsUsed: string[];
    };
    pitchMetadata: {
      bandUsed: 'low' | 'mid' | 'high';
      melodyRange: { min: string; max: string } | null;
      // Direction statistics from Phase 1 section 1.5
      directionStats: {
        up: number;      // Count of ascending pitches
        down: number;    // Count of descending pitches
        stable: number;  // Count of repeated pitches
        none: number;    // Count with no pitch detected
      } | null;
      // Interval statistics from Phase 1 section 1.5
      intervalStats: {
        unison: number;
        small: number;
        medium: number;
        large: number;
        very_large: number;
      } | null;
    } | null;
    chartMetadata: {
      totalBeats: number;
      detectedBeats: number;
      generatedBeats: number;
      subdivisionTypesUsed: SubdivisionType[];
    };
    generationConfig: LevelGenerationOptions;
  }
  ```

### 3.2 Pipeline Implementation
- [x] Implement the full generation pipeline (tested in `levelGenerator.integration.test.ts`)
  1. Run rhythm generation (from companion plan) → `GeneratedRhythm`
  2. **Run pitch analysis** (Phase 1) - **skipped if `pitchInfluenceWeight = 0`**:
     - Analyze pitch on ALL band streams (low/mid/high) using filtered audio
     - Derive composite stream pitches from band stream pitches
     - Calculate melody contour (direction + interval for each beat)
  3. Derive pitches for each difficulty variant from composite (skipped if no pitch analysis)
  4. Select difficulty variant from `GeneratedRhythm.difficultyVariants`
  5. Generate button mappings for selected variant using `PitchAtBeat.direction` and `intervalCategory` → `MappedLevelResult`
  6. **Convert to ChartedBeatMap** using `BeatMapConverter.convertToChartedBeatMap()`
  7. Combine into final `GeneratedLevel` with playable `chart`
- [x] Add progress callbacks for long-running generation
  ```typescript
  interface GenerationProgress {
    stage: 'rhythm' | 'pitch' | 'buttons' | 'conversion' | 'finalizing';
    progress: number;  // 0-1
    message: string;
  }
  ```
- [x] Support cancellation
- [x] Add caching for intermediate results

### 3.3 Tests
- [x] Integration tests for full pipeline (see `levelGenerator.integration.test.ts`)
- [x] Performance tests (generation time < 10 seconds for 3-minute song) (see `levelGenerator.performance.test.ts`)
- [x] Verify pitch influence is visible in output
- [x] Verify direction/interval statistics are populated in `LevelMetadata.pitchMetadata`
- [x] Verify button mapping correctly uses `direction` and `intervalCategory` from pitch analysis

---

## Phase 4: API & Integration

**Goal**: Expose the complete level generation system through a clean API.

### 4.1 Public API
- [x] Add exports to `src/index.ts`
- [x] Create convenience methods on `AudioAnalyzer`
  ```typescript
  // On AudioAnalyzer class
  async generateRhythmLevel(
    audioUrl: string,
    options: LevelGenerationOptions
  ): Promise<GeneratedLevel>;

  // Quick generation with preset
  async generateRhythmLevelWithPreset(
    audioUrl: string,
    preset: 'casual' | 'standard' | 'challenge' | 'insane'
  ): Promise<GeneratedLevel>;
  ```

### 4.2 Level Serialization (Unified Format)

**Reference Implementation:** `playlist-data-showcase/src/store/beatDetectionStore.ts`
- `exportFullBeatMap()` / `importFullBeatMap()`
- `playlist-data-showcase/src/types/index.ts` → `FullBeatMapExportData` interface

The showcase app currently has its own level export/import logic that is **not in the engine**. This task adds proper engine-level save/load that is compatible with both:
1. **Procedurally generated levels** (from this plan)
2. **Manually charted levels** (from the showcase app's chart editor)

#### 4.2.1 Research & Design (COMPLETED)

**Decision: Adopt `FullBeatMapExportData` format directly**

After analyzing the showcase app's implementation, we will use the existing `FullBeatMapExportData` format as the serialization standard. Key findings:

1. **Showcase app ignores extra fields**: The import uses `.map()` to extract only needed fields, so procedural-specific fields can be safely added without breaking compatibility.

2. **Format structure**:
   ```typescript
   interface FullBeatMapExportData {
     version: 1;
     format: 'full-beatmap';
     audioId: string;
     audioTitle?: string;
     exportedAt: number;
     duration: number;
     quarterNoteBpm: number;
     quarterNoteConfidence: number;
     
     // Beat data
     detectedBeats: FullExportDetectedBeat[];
     mergedBeats: FullExportMergedBeat[];
     interpolatedMetadata: {...};
     
     // Subdivision with chart keys
     subdivision: {
       config: SubdivisionConfigJSON;
       beats: FullExportSubdividedBeat[];  // Can add procedural fields here
       metadata: {...};
     } | null;
     
     // Chart metadata
     chart: {
       style: ChartStyle;
       keyCount: number;
       usedKeys: string[];
     } | null;
   }
   ```

3. **Procedural extensions**: Add these optional fields to `subdivision.beats[]`:
   ```typescript
   interface ProceduralBeatExtension {
     /** Only present for procedurally generated beats */
     quarterNoteIndex?: number;
     subdivisionPosition?: number;
     sourceBand?: 'low' | 'mid' | 'high';
     quantizationError?: number;
   }
   ```

4. **Generation source indicator**: Add to root level:
   ```typescript
   generationSource?: 'manual' | 'procedural';
   generationMetadata?: {
     difficulty: string;
     pitchInfluenceWeight: number;
     patternsUsed: string[];
   };
   ```

**Implementation approach**: New `LevelSerializer` class in engine that:
- Converts `GeneratedLevel` → `FullBeatMapExportData` (with procedural extensions)
- Converts `FullBeatMapExportData` → `GeneratedLevel` (for engine)
- Is 100% compatible with showcase app's `importFullBeatMap()`

#### 4.2.2 Implementation
- [x] Add `FullBeatMapExportData` type to engine (copy from showcase app types)
  ```typescript
  // In src/core/types/LevelExport.ts (new file)
  // These types match playlist-data-showcase/src/types/index.ts exactly
  
  export interface FullBeatMapExportData {
    version: 1;
    format: 'full-beatmap';
    audioId: string;
    audioTitle?: string;
    exportedAt: number;
    duration: number;
    quarterNoteBpm: number;
    quarterNoteConfidence: number;
    detectedBeats: FullExportDetectedBeat[];
    mergedBeats: FullExportMergedBeat[];
    interpolatedMetadata: InterpolatedMetadataJSON;
    subdivision: SubdivisionExportData | null;
    chart: ChartExportData | null;
    
    // Procedural-only extensions (optional, ignored by showcase app)
    generationSource?: 'manual' | 'procedural';
    generationMetadata?: ProceduralGenerationMetadata;
  }
  
  // Procedural beat extensions (added to subdivision.beats)
  export interface ProceduralBeatExtension {
    quarterNoteIndex?: number;
    subdivisionPosition?: number;
    sourceBand?: 'low' | 'mid' | 'high';
    quantizationError?: number;
  }
  ```
- [x] Create `LevelSerializer` class
  ```typescript
  // In src/core/analysis/LevelSerializer.ts (new file)

  export class LevelSerializer {
    // Convert GeneratedLevel → FullBeatMapExportData
    static toExportData(level: GeneratedLevel): FullBeatMapExportData;

    // Convert FullBeatMapExportData → GeneratedLevel (for engine use)
    static fromExportData(data: FullBeatMapExportData): GeneratedLevel;

    // JSON serialization
    static toJSON(level: GeneratedLevel): string;
    static fromJSON(json: string): GeneratedLevel;

    // File I/O (Node.js only)
    static async saveToFile(level: GeneratedLevel, path: string): Promise<void>;
    static async loadFromFile(path: string): Promise<GeneratedLevel>;

    // Validation
    static validate(data: unknown): FullBeatMapImportResult;
  }
  ```
- [x] **Mapping: GeneratedLevel → FullBeatMapExportData**
  - The `GeneratedLevel.chart` (ChartedBeatMap) maps to `FullBeatMapExportData.subdivision`
  - `ChartedBeat.beats[]` maps to `FullExportSubdividedBeat[]` (with procedural extensions)
  - `detectedBeatIndices` used to set `isDetected` flag on beats
  - `requiredKey` field is preserved
  - `bpm` maps to `quarterNoteBpm`
  - Extract data from `GeneratedLevel.rhythm` and `pitchAnalysis` for other fields
- [x] **Mapping: FullBeatMapExportData → GeneratedLevel** (reverse import)
  - Parse `subdivision.beats` into `ChartedBeat[]`
  - Reconstruct `pitchAnalysis` if present (from generationMetadata)
  - Reconstruct `GeneratedLevel.metadata` from export data

#### 4.2.3 Compatibility Verification
- [x] **Procedural level → Showcase import**: Generate level in engine, save, load in showcase app
  - Created comprehensive compatibility tests in `src/core/analysis/LevelSerializer.compatibility.test.ts`
  - Tests verify all required fields for showcase app import compatibility
  - Tests cover: root-level fields, detectedBeats, mergedBeats, interpolatedMetadata, subdivision, chart
  - Tests also cover procedural extensions (quarterNoteIndex, subdivisionPosition, sourceBand)
- [x] **Manual chart → Engine import**: Export from showcase app, load in engine
  - Added new test section "Phase 4.2.3: Manual chart → Engine import" with 11 tests
  - Tests verify:
    - Import manual chart without generation metadata
    - Reconstruct chart beats from manual chart
    - Default values for missing procedural fields (quarterNoteIndex=0, subdivisionPosition=0, sourceBand='mid')
    - Manual chart not identified as procedural
    - Metadata reconstruction with defaults
    - Variant reconstruction
    - Rhythm reconstruction
    - Null pitch analysis for manual charts without pitch metadata
    - Key preservation through round-trip
    - Handling explicit `generationSource: 'manual'`
    - Guitar Hero style manual chart import
- [x] **Round-trip test**: Save → load → save → compare outputs identical
  - Round-trip tests verify preservation of audioId, duration, beats, keys
- [x] Verify all fields used by `importFullBeatMap()` are populated correctly:
  - [x] `detectedBeats`, `mergedBeats`, `interpolatedMetadata`
  - [x] `subdivision.config`, `subdivision.beats`, `subdivision.metadata`
  - [x] `chart.style`, `chart.keyCount`, `chart.usedKeys`

#### 4.2.4 Edge Cases
- [ ] Handle procedurally generated levels that skip pitch analysis (`pitchInfluenceWeight: 0`)
- [ ] Handle levels with no subdivision (only interpolated beats)
- [ ] Handle levels with no key assignments (chart is null)
- [ ] Ensure metadata includes generation source indicator (procedural vs manual)

### 4.3 Tests
- [ ] API integration tests
- [ ] Serialization round-trip tests
- [ ] Backward compatibility tests

---

## Phase 5: Documentation

**Goal**: Ensure all new features are properly documented following the established documentation style guide.

### 5.1 Code Documentation
- [ ] JSDoc for all public types and interfaces
- [ ] Usage examples in code comments
- [ ] Inline comments for complex algorithms (especially pYIN pitch detection with HMM)

### 5.2 Update DATA_ENGINE_REFERENCE.md

> **Style Guide Reminder**: This is a scannable API reference. Focus on location links, structured tables, and cross-references. NO code examples or algorithm explanations—those belong in BEAT_DETECTION.md.

- [ ] Add new section: "Pitch Detection & Button Mapping"
  - [ ] **Location links** (italicized) to all major definitions:
    - [ ] [src/core/analysis/PitchDetector.ts](src/core/analysis/PitchDetector.ts) - `PitchDetector` class
    - [ ] [src/core/generation/ButtonMapper.ts](src/core/generation/ButtonMapper.ts) - `ButtonMapper` class
    - [ ] [src/core/generation/LevelGenerator.ts](src/core/generation/LevelGenerator.ts) - `LevelGenerator` class
    - [ ] [src/core/generation/BeatConverter.ts](src/core/generation/BeatConverter.ts) - `BeatConverter` class
    - [ ] [src/core/analysis/LevelSerializer.ts](src/core/analysis/LevelSerializer.ts) - `LevelSerializer` class
  - [ ] **"Also known as" aliases** for discoverability:
    - [ ] *pitch detection* ↔ *melody extraction* ↔ *fundamental frequency estimation*
    - [ ] *button mapping* ↔ *key assignment* ↔ *chart generation*
    - [ ] *melody contour* ↔ *pitch direction* ↔ *interval analysis*
  - [ ] **Structured tables** (not raw TypeScript interfaces):
    - [ ] `PitchDetector` methods table with Returns/Description columns
    - [ ] `ButtonMapper` methods table with Returns/Description columns
    - [ ] `LevelGenerator` methods table with Returns/Description columns
    - [ ] `ButtonMappingConfig` properties table with Type/Default/Description columns
    - [ ] `PitchDetectorConfig` properties table with Type/Default/Description columns
    - [ ] `LevelGenerationOptions` properties table with Type/Default/Description columns
  - [ ] **Cross-references** to related docs:
    - [ ] "For pitch detection algorithms (pYIN with HMM), see [BEAT_DETECTION.md](BEAT_DETECTION.md#pitch-detection)"
    - [ ] "For controller mode strategies (DDR, Guitar Hero), see [BEAT_DETECTION.md](BEAT_DETECTION.md#button-mapping-strategies)"
    - [ ] "For melody contour analysis approach, see [BEAT_DETECTION.md](BEAT_DETECTION.md#melody-contour)"
    - [ ] "For usage examples, see [BEAT_DETECTION.md](BEAT_DETECTION.md#level-generation-examples)"
  - [ ] **Type descriptions** focusing on purpose and key properties (not full interface definitions—readers click location links for complete source):
    - [ ] `PitchResult` - describes a detected pitch at a point in time
    - [ ] `PitchAtBeat` - pitch information linked to a rhythm beat
    - [ ] `MelodyContour` - aggregated melodic direction over time
    - [ ] `ChartedBeatMap` - final playable chart format
    - [ ] `GeneratedLevel` - complete output from level generation
  - [ ] **Controller mode overview** (brief, table format):
    | Mode | Buttons | Axes | See Details |
    |------|---------|------|-------------|
    | DDR | up, down, left, right | 2 (vertical + horizontal) | [BEAT_DETECTION.md#ddr-mode](BEAT_DETECTION.md#ddr-mode) |
    | Guitar Hero | 1, 2, 3, 4, 5 | 1 (horizontal only) | [BEAT_DETECTION.md#guitar-hero-mode](BEAT_DETECTION.md#guitar-hero-mode) |
  - [ ] **Serialization format reference**:
    - [ ] Link to `FullBeatMapExportData` type location
    - [ ] Brief description of format purpose
    - [ ] Cross-reference to BEAT_DETECTION.md for format details

### 5.3 Update BEAT_DETECTION.md

> **This is where detailed explanations and examples go.** Include algorithm descriptions, workflow examples, and conceptual documentation.

- [ ] Add section: "Pitch Detection" (separate from beat/transient detection)
  - [ ] **pYIN Algorithm Explanation**:
    - [ ] How pYIN works conceptually (probabilistic YIN with HMM tracking)
    - [ ] YIN core: difference function, cumulative mean normalized difference
    - [ ] HMM layer: pitch state tracking, Viterbi decoding for optimal path
    - [ ] Why pYIN was chosen over alternatives (YIN, CREPE)
    - [ ] Configurable parameters and their effects:
      - `minFrequency` / `maxFrequency` - frequency range limits
      - `voicingThreshold` - probability threshold for voiced/unvoiced detection
      - `transitionPenalty` - penalty for large pitch jumps in HMM
      - `selfTransitionProbability` - probability of staying in same pitch state
      - `yinThreshold` - threshold for accepting pitch candidates in difference function
      - `hopSize` - analysis window overlap
    - [ ] Handling polyphonic audio (dominant pitch selection via HMM)
    - [ ] Probabilistic output (multiple hypotheses with probabilities)
  - [ ] **Multi-Band Pitch Analysis**:
    - [ ] Why we analyze pitch on pre-filtered bands (reuse from rhythm generation)
    - [ ] Band characteristics and typical pitch content:
      - Low band (20-500Hz): Bass, kick drum, sub frequencies
      - Mid band (500-2000Hz): Vocals, lead melody, snare body
      - High band (2000-20000Hz): Hi-hats, cymbals, harmonics
    - [ ] Band selection strategy (which band to use for melody)
    - [ ] Integration with `MultiBandAnalyzer` from rhythm generation
  - [ ] **Beat-Timestamped Pitch Detection**:
    - [ ] Why timestamp-based analysis (efficiency, accuracy, alignment)
    - [ ] How pitch links to `GeneratedBeat.timestamp` positions
    - [ ] Phrase-level pitch correlation using `RhythmicPhrase.sourceBand`

- [ ] Add section: "Melody Contour Analysis"
  - [ ] **Pitch-to-Pitch Comparison**:
    - [ ] Direction categories: `up`, `down`, `stable`, `none`
    - [ ] Interval calculation in semitones
    - [ ] Interval categories for mapping: `unison`, `small`, `medium`, `large`, `very_large`
  - [ ] **Contour Extraction**:
    - [ ] Segment detection (grouping consecutive same-direction beats)
    - [ ] Time-window analysis (short/medium/long term)
    - [ ] Output for button mapping (`PitchAtBeat.direction`, `PitchAtBeat.intervalCategory`)

- [ ] Add section: "Button Mapping Strategies"
  - [ ] **Controller Mode Overview**:
    - [ ] Why two modes (different gameplay metaphors)
    - [ ] Mode selection via `controllerMode` config option
  - [ ] **DDR Mode Strategy** (4 buttons, circular motion):
    - [ ] Circular motion philosophy: `up → right → down → left → up`
    - [ ] State transition table explanation
    - [ ] How pitch direction maps to button selection
    - [ ] How interval size affects movement magnitude
    - [ ] Example: "Ascending small interval from 'left' → 'up'"
  - [ ] **Guitar Hero Mode Strategy** (5 buttons, 1 axis):
    - [ ] Fretboard metaphor: 1=lowest pitch, 5=highest pitch
    - [ ] State transition table explanation
    - [ ] String wrap logic (instead of clamping at edges)
    - [ ] How interval size affects fret jump distance
    - [ ] Example: "Descending large interval from fret 3 → fret 1"
  - [ ] **Probability-Based Blending** (using pYIN HMM probabilities):
    - [ ] How `pitchInfluenceWeight` controls pitch vs pattern balance
    - [ ] Why lowest-probability pitches are replaced first
    - [ ] Pattern filling for beats with no pitch detected
    - [ ] Example workflow showing blending at different weights
  - [ ] **Difficulty-Based Variations**:
    - [ ] Easy: Direction-only mapping, no leaps
    - [ ] Medium: Direction + interval, leaps allowed
    - [ ] Hard: Full interval mapping, rapid changes

- [ ] Add section: "Level Generation Examples"
  - [ ] **Basic level generation**:
    ```typescript
    const level = await audioAnalyzer.generateRhythmLevel(audioUrl, {
      difficulty: 'medium',
      controllerMode: 'ddr',
      buttons: { pitchInfluenceWeight: 0.8 }
    });
    ```
  - [ ] **Pattern-only generation** (no pitch analysis):
    ```typescript
    const level = await audioAnalyzer.generateRhythmLevel(audioUrl, {
      difficulty: 'easy',
      controllerMode: 'guitar_hero',
      buttons: { pitchInfluenceWeight: 0 }  // Skips pitch detection entirely
    });
    ```
  - [ ] **Full workflow example**: Audio → Rhythm → Pitch → Buttons → ChartedBeatMap
  - [ ] **Serialization example**: Save and load generated levels
  - [ ] **Conversion example**: GeneratedLevel → ChartedBeatMap for BeatStream

- [ ] Add section: "Serialization Format"
  - [ ] Overview of `FullBeatMapExportData` format
  - [ ] Procedural extensions to the format (`generationSource`, `generationMetadata`)
  - [ ] Compatibility with manual charting (showcase app)
  - [ ] Round-trip preservation of procedural metadata

---

## Types from Rhythm Generation

This plan re-uses the following types from `procedural-rhythm-generation.md`. They are defined there and re-exported here for reference:

### Core Beat Types
```typescript
// Single quantized note
interface GeneratedBeat {
  timestamp: number;           // Quantized time in seconds
  beatIndex: number;           // Index into UnifiedBeatMap.beats[]
  gridPosition: number;        // Position within that beat (0-3 for 16th, 0-2 for triplet)
  gridType: 'straight_16th' | 'triplet_8th';
  intensity: number;           // Transient strength (0.0 - 1.0)
  band: 'low' | 'mid' | 'high';
  quantizationError?: number;  // How far it was moved from original (ms)
}

// Per-band rhythm map
interface GeneratedRhythmMap {
  audioId: string;
  duration: number;
  beats: GeneratedBeat[];
  gridDecisions: GridDecision[];
}
```

### Difficulty & Composite Types
```typescript
// Difficulty variant with edit metadata
interface DifficultyVariant {
  difficulty: 'easy' | 'medium' | 'hard';
  stream: GeneratedBeat[];
  isUnedited: boolean;
  editType: 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';
  editAmount: number;
  patternsInserted?: string[];
}

// Composite stream from best band sections
interface CompositeStream {
  stream: GeneratedBeat[];
  sections: CompositeSection[];
  naturalDifficulty: 'easy' | 'medium' | 'hard';
}

interface CompositeSection {
  beatRange: { start: number; end: number };
  sourceBand: 'low' | 'mid' | 'high';
  score: number;
}
```

### Phrase Analysis Types
```typescript
// Phrase occurrence with timestamps for pitch integration
interface PhraseOccurrence {
  beatIndex: number;
  startTimestamp: number;
  endTimestamp: number;
}

// Detected rhythmic phrase
interface RhythmicPhrase {
  pattern: GeneratedBeat[];
  sizeInBeats: number;
  sourceBand: 'low' | 'mid' | 'high';
  occurrences: PhraseOccurrence[];
  significance: number;
}
```

### Main Output Type
```typescript
// Complete rhythm generation output
interface GeneratedRhythm {
  difficultyVariants: {
    easy: DifficultyVariant;
    medium: DifficultyVariant;
    hard: DifficultyVariant;
  };
  bandStreams: {
    low: GeneratedRhythmMap;
    mid: GeneratedRhythmMap;
    high: GeneratedRhythmMap;
  };
  composite: CompositeStream;
  transientAnalysis: TransientAnalysis;
  quantizationResult: QuantizedBandStreams;
  phraseAnalysis: PhraseAnalysisResult;
  metadata: RhythmMetadata;
}
```

---

## Dependencies

### External Dependencies
- None (pYIN algorithm can be implemented from scratch - YIN core + HMM layer)

### Internal Dependencies
- **Requires**: `procedural-rhythm-generation.md` to be completed
  - Needs `GeneratedRhythm` output containing:
    - `difficultyVariants` (easy/medium/hard as `DifficultyVariant`)
    - `bandStreams` (low/mid/high as `GeneratedRhythmMap`)
    - `composite` (`CompositeStream`)
    - `transientAnalysis` (`TransientAnalysis`)
    - `phraseAnalysis` (`PhraseAnalysisResult`)
    - `metadata` (`RhythmMetadata`)
  - Needs `RhythmicPhrase.sourceBand` and `PhraseOccurrence` timestamps for pitch-to-phrase correlation

---

## Questions/Unknowns

### Technical Questions
1. ~~**YIN vs. pYIN vs. CREPE**: Which pitch detection algorithm is best for polyphonic music?~~
   - **RESOLVED**: Using pYIN (probabilistic YIN with HMM)
   - pYIN provides better voiced/unvoiced detection through HMM
   - Probabilistic output allows probability-based button blending
   - CREPE is ML-based and would be overkill for this use case

2. **Pitch detection on filtered bands**: Does band-passing improve or degrade pitch accuracy?
   - Consider: Test on vocals (mid band) vs full spectrum
   - Note: We're reusing the same filtered bands from rhythm generation for consistency

3. **Polyphonic handling**: How to handle multiple simultaneous pitches?
   - Consider: Pick dominant pitch, or use probability-weighted selection

4. **Timestamp-based vs continuous analysis**: Should pitch detection run only at beat timestamps or continuously?
   - **Current approach**: Timestamp-based - analyze only at `GeneratedBeat.timestamp` positions
   - This is more efficient and provides focused analysis windows
   - Consider: May need continuous analysis for very dense rhythm patterns

### Design Questions
1. **Pitch influence strength**: How strongly should melody override other factors?
   - Recommendation: Configurable weight (0-1), defaults vary by difficulty

2. **Button pattern vs pitch**: When they conflict, which wins?
   - Recommendation: Blend with configurable weight, favor playability

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
10. **ChartedBeatMap is fully compatible with BeatStream** - generated levels can be played immediately
11. **Key matching works correctly** - `checkButtonPress()` validates keys against `requiredKey`
12. **Conversion preserves timing accuracy** - beat positions match original transients within tolerance
