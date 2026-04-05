# PitchAnalyzer Implementation Plan

## Overview

Create a standalone `PitchAnalyzer` class in `src/core/analysis/PitchAnalyzer.ts` that provides full-track pitch detection as a first-class analysis feature, alongside `AudioAnalyzer` and `MusicClassifier`. Currently, pitch detection is only accessible through the level generation pipeline (`LevelGenerator` → `PitchBeatLinker` → `MelodyContourAnalyzer`), which requires a beat map. The new `PitchAnalyzer` operates on raw audio with zero dependency on beat detection or rhythm generation.

## Key Design Decisions

- **No `PitchBeatLinker`.** This is the critical distinction. The new analyzer uses `PitchDetector`/`EssentiaPitchDetector` directly on the audio signal and does not align pitch frames to beats.
- **Contour analysis on `PitchResult[]`, not `PitchAtBeat[]`.** The existing `MelodyContourAnalyzer` imports `PitchAtBeat` from the generation module. Rather than refactoring that class or introducing a cross-module dependency, the `PitchAnalyzer` will have its own contour analysis that works directly on the `PitchResult[]` output from the detectors.
- **Same analyzer pattern as `AudioAnalyzer` / `MusicClassifier`.** Accepts a URL, fetches/decodes audio internally, returns a typed profile with metadata.
- **Contour depth matches `MelodyContourAnalysisResult`.** The contour output includes the same interval categorization, direction stats, interval stats, and time-window direction analysis as the existing contour analyzer. The `PitchContour` type mirrors `MelodyContour` and the summary includes `DirectionStats` and `IntervalStats`.
- **Flat summary stats + minimal `analysis_metadata`.** No `summary` wrapper object. Useful numeric stats live as flat fields on the profile (matching `AudioProfile`'s pattern). `analysis_metadata` holds only pipeline info. No top-level `algorithm` field (lives in `analysis_metadata.algorithm_used`).
- **Types co-located with the class.** `PitchAnalysisProfile` and related types live in `PitchAnalyzer.ts` (same pattern as `MelodyContourAnalysisResult` in `MelodyContourAnalyzer.ts`, `PitchResult` in `PitchDetector.ts`).
- **Algorithm-specific max frequency defaults.** When `algorithm === 'pyin_legacy'` and `maxFrequency` is not explicitly provided, default to 1000 Hz (the YIN algorithm's practical ceiling). All other algorithms default to 20000 Hz.
- **Progress callback support.** Optional `onProgress` callback reports start/end and overall progress, following the same pattern as `RhythmGenerator`.
- **Contour is optional.** `includeContour` defaults to `true` but can be set to `false` to skip contour computation.

## Phase 1: Define the Output Type

- [ ] Create a new `PitchAnalysisProfile` interface in `src/core/analysis/PitchAnalyzer.ts` (co-located with the class, matching existing type-per-module pattern)

  ```typescript
  interface PitchAnalysisProfile {
      /** Per-frame pitch detection results */
      pitchResults: PitchResult[];

      /** Melody contour analysis (only populated when includeContour !== false) */
      contour?: PitchContour;

      // Flat summary stats (same pattern as AudioProfile's flat numeric fields)

      /** Ratio of voiced to total frames (0.0 - 1.0) */
      voicingRatio: number;
      /** Average frequency of voiced frames in Hz */
      averageFrequency: number;
      /** Median frequency of voiced frames in Hz */
      medianFrequency: number;
      /** Minimum detected frequency in Hz */
      minFrequency: number;
      /** Maximum detected frequency in Hz */
      maxFrequency: number;
      /** Pitch range in semitones */
      pitchRangeSemitones: number;
      /** Lowest detected note name (e.g., "C3") */
      lowestNote: string | null;
      /** Highest detected note name (e.g., "G5") */
      highestNote: string | null;
      /** Most common note names, sorted by frequency */
      noteDistribution: { note: string; count: number; percentage: number }[];
      /** Total frames analyzed */
      totalFrames: number;
      /** Number of voiced frames */
      voicedFrames: number;

      /** Direction statistics from contour analysis */
      directionStats?: DirectionStats;
      /** Interval statistics from contour analysis */
      intervalStats?: IntervalStats;

      /** Analysis metadata (pipeline info only) */
      analysis_metadata: {
          algorithm_used: string;
          analyzed_at: string;
          duration_analyzed: number;
      };
  }
  ```

- [ ] Create a `PitchContour` interface that mirrors `MelodyContour` depth

  ```typescript
  interface PitchContour {
      /** Overall melody direction */
      direction: 'ascending' | 'descending' | 'stable' | 'mixed';
      /** Pitch range info */
      range: {
          minNote: string;
          maxNote: string;
          semitones: number;
      };
      /** Melody segments (groups of consecutive frames with same direction) */
      segments: PitchContourSegment[];
      /** Time-window direction analysis */
      shortTermDirection: 'ascending' | 'descending' | 'stable' | 'mixed';
      mediumTermDirection: 'ascending' | 'descending' | 'stable' | 'mixed';
      longTermDirection: 'ascending' | 'descending' | 'stable' | 'mixed';
  }

  interface PitchContourSegment {
      startTime: number;
      endTime: number;
      startNote: string;
      endNote: string;
      direction: 'up' | 'down' | 'stable';
      interval: number; // semitones
  }
  ```

  Reuses the existing `DirectionStats` and `IntervalStats` types exported from `MelodyContourAnalyzer.ts` (they are generic enough to apply here).

- [ ] Export the new types from `PitchAnalyzer.ts` alongside the class

## Phase 2: Implement PitchAnalyzer Class

- [ ] Create `src/core/analysis/PitchAnalyzer.ts`

  ```typescript
  interface PitchAnalyzerConfig {
      /** Which pitch algorithm to use (default: 'pitch_melodia') */
      algorithm?: PitchAlgorithm;
      /** Min frequency in Hz (default: 80) */
      minFrequency?: number;
      /** Max frequency in Hz (default varies by algorithm: 1000 for pyin_legacy, 20000 for others) */
      maxFrequency?: number;
      /** Target sample rate (default: 44100) */
      sampleRate?: number;
      /** CREPE model URL (only for 'pitch_crepe' algorithm) */
      crepeModelUrl?: string;
      /** URL resolver for Arweave URLs */
      resolveUrl?: (url: string) => Promise<string>;
      /** Whether to include melody contour analysis (default: true) */
      includeContour?: boolean;
      /** Optional progress callback */
      onProgress?: (phase: string, progress: number) => void;
  }
  ```

- [ ] Implement `analyze(audioUrl: string): Promise<PitchAnalysisProfile>` — main public method

  Internal flow:
  1. Emit `onProgress('fetching', 0)`
  2. Fetch and decode audio from URL (same pattern as `AudioAnalyzer.extractSonicFingerprint()`)
  3. Convert AudioBuffer to mono Float32Array signal
  4. Emit `onProgress('detecting', 0)`
  5. Resolve algorithm-specific defaults (clamp maxFrequency for pyin_legacy)
  6. Instantiate the appropriate pitch detector:
     - `algorithm === 'pyin_legacy'` → use built-in `PitchDetector`
     - anything else → use `EssentiaPitchDetector` (async factory `create()`)
  7. Run `detectSignal(signal, sampleRate)` → `PitchResult[]`
  8. Emit `onProgress('detecting', 1)`
  9. Compute summary statistics from `PitchResult[]`
  10. If `includeContour !== false`, compute contour analysis from `PitchResult[]`
  11. Build and return `PitchAnalysisProfile`

- [ ] Implement private `computeSummary(results: PitchResult[])` method
  - Calculate voicedFrames, voicingRatio, averageFrequency, medianFrequency
  - Calculate min/max frequency, pitchRangeSemitones
  - Build noteDistribution from voiced frames
  - Return flat stats to be spread onto the profile

- [ ] Implement private `computeContour(results: PitchResult[])` method
  - Compare consecutive voiced frames to determine direction (up/down/stable)
  - Group consecutive frames with same direction into segments
  - Determine overall direction from segment analysis
  - Compute time-window direction analysis (short/medium/long term)
  - Calculate interval statistics (unison/small/medium/large/very_large)
  - Reuse the same interval categorization thresholds from `MelodyContourAnalyzer` (1-2 small, 3-4 medium, 5-7 large, 8+ very_large)
  - Return `PitchContour` + `DirectionStats` + `IntervalStats`

- [ ] Implement private `fetchAndDecodeAudio(url: string): Promise<{ signal: Float32Array; sampleRate: number; duration: number }>` method
  - Fetch audio, decode via OfflineAudioContext, mix to mono, return signal + metadata

- [ ] Implement private `resolveDefaults(config: PitchAnalyzerConfig)` method
  - If `algorithm === 'pyin_legacy'` and `maxFrequency` is not provided → default to 1000
  - Otherwise if `maxFrequency` not provided → default to 20000

## Phase 3: Export and Wire Up

- [ ] Export `PitchAnalyzer` from `src/core/analysis/index.ts`
- [ ] Export `PitchAnalyzer`, `PitchAnalyzerConfig`, `PitchAnalysisProfile`, `PitchContour`, `PitchContourSegment` from `src/index.ts` in a new "PITCH ANALYSIS" section (distinct from the existing "PITCH DETECTION" section which has the low-level detectors and the beat-coupled `PitchBeatLinker`)

## Phase 4: Tests

- [ ] Create `tests/unit/analysis/pitchAnalyzer.test.ts`

  Test cases:
  - [ ] Constructor with default config
  - [ ] Constructor with custom config
  - [ ] `analyze()` with a valid audio URL returns `PitchAnalysisProfile`
  - [ ] Summary statistics are accurate (voicing ratio, frequency range, note distribution)
  - [ ] Contour analysis produces segments, direction, time-window directions, interval stats
  - [ ] `pyin_legacy` algorithm selection uses built-in detector and clamps maxFrequency to 1000
  - [ ] Essentia algorithm selection uses `EssentiaPitchDetector` with 20000 Hz default
  - [ ] `includeContour: false` skips contour computation (contour, directionStats, intervalStats all absent)
  - [ ] `onProgress` callback fires with expected phases
  - [ ] Handles edge cases: silent audio, very short audio, all-unvoiced audio

## Phase 5: Documentation

### 5a. `docs/AUDIO_ANALYSIS.md`

- [ ] Add a new `## Pitch Analysis` section between "Music Classification" and "Related Documentation", following the same format as the AudioAnalyzer and MusicClassifier sections:

  **Structure:**
  ```markdown
  ## Pitch Analysis

  For full-track pitch detection without beat-map dependency, use the `PitchAnalyzer`.
  This provides per-frame pitch results, melody contour analysis, and summary statistics
  directly from raw audio.

  ### Method

  analyze(audioUrl: string): Promise<PitchAnalysisProfile>

  ### Usage Example

  import { PitchAnalyzer } from 'playlist-data-engine';

  const analyzer = new PitchAnalyzer({
    algorithm: 'pitch_melodia',
    includeContour: true
  });

  const profile = await analyzer.analyze('https://example.com/audio.mp3');

  console.log(`Voicing ratio: ${(profile.voicingRatio * 100).toFixed(1)}%`);
  console.log(`Range: ${profile.lowestNote} - ${profile.highestNote}`);
  console.log(`Contour direction: ${profile.contour?.direction}`);

  ### PitchAnalysisProfile Output

  | Property | Type | Description |
  |----------|------|-------------|
  | `pitchResults` | `PitchResult[]` | Per-frame pitch detection results |
  | `contour` | `PitchContour` | Melody contour (when includeContour: true) |
  | `voicingRatio` | `number` | Ratio of voiced frames (0.0 - 1.0) |
  | `averageFrequency` | `number` | Average frequency of voiced frames (Hz) |
  | `medianFrequency` | `number` | Median frequency of voiced frames (Hz) |
  | `minFrequency` | `number` | Minimum detected frequency (Hz) |
  | `maxFrequency` | `number` | Maximum detected frequency (Hz) |
  | `pitchRangeSemitones` | `number` | Pitch range in semitones |
  | `lowestNote` | `string | null` | Lowest detected note name |
  | `highestNote` | `string | null` | Highest detected note name |
  | `noteDistribution` | `{ note, count, percentage }[]` | Note frequency distribution |
  | `totalFrames` | `number` | Total frames analyzed |
  | `voicedFrames` | `number` | Voiced frames count |
  | `directionStats` | `DirectionStats` | Direction statistics (when contour enabled) |
  | `intervalStats` | `IntervalStats` | Interval statistics (when contour enabled) |
  | `analysis_metadata` | `{ algorithm_used, analyzed_at, duration_analyzed }` | Pipeline metadata |
  ```

- [ ] Add a note distinguishing `PitchAnalyzer` (standalone, no beats) from `PitchBeatLinker` (beat-aligned, used in level generation), with a link to the "Beat Detection & Button Mapping" section of `DATA_ENGINE_REFERENCE.md`

### 5b. `DATA_ENGINE_REFERENCE.md`

- [ ] **Quick Export Reference** — Add a new "Pitch Analysis" row to the export table (between "Pitch Detection & Button Mapping" and "Utilities"), listing `PitchAnalyzer`, `PitchAnalysisProfile`, `PitchContour`, `PitchContourSegment`

- [ ] **Type Exports** — Add `PitchAnalysisProfile`, `PitchContour`, `PitchContourSegment`, `PitchAnalyzerConfig` to the Generator Types list

- [ ] **Core Modules** — Add a `PitchAnalyzer` subsection between `MusicClassifier` and `Beat Detection`, following the same format as the `AudioAnalyzer` and `MusicClassifier` entries:

  ```markdown
  ### PitchAnalyzer

  *Location:* src/core/analysis/PitchAnalyzer.ts

  *Also known as: pitch analysis, standalone pitch detection, full-track pitch*

  Full-track pitch detection that operates on raw audio with zero dependency on beat
  detection or rhythm generation. Returns per-frame pitch results, melody contour
  analysis, and summary statistics.

  #### Constructor Options

  | Option | Type | Default | Description |
  |--------|------|---------|-------------|
  | `algorithm` | `PitchAlgorithm` | `'pitch_melodia'` | Pitch detection algorithm |
  | `minFrequency` | `number` | `80` | Min frequency in Hz |
  | `maxFrequency` | `number` | algorithm-dependent | Max frequency in Hz (1000 for pyin_legacy, 20000 for others) |
  | `sampleRate` | `number` | `44100` | Target sample rate |
  | `crepeModelUrl` | `string` | — | CREPE model URL |
  | `resolveUrl` | `(url) => Promise<string>` | — | URL resolver for Arweave URLs |
  | `includeContour` | `boolean` | `true` | Include melody contour analysis |
  | `onProgress` | `(phase, progress) => void` | — | Progress callback |

  #### Methods

  | Method | Returns | Description |
  |--------|---------|-------------|
  | `analyze(audioUrl)` | `Promise<PitchAnalysisProfile>` | Full-track pitch analysis with optional contour |
  ```

- [ ] **Pitch Detection & Button Mapping** section — Add a callout box at the top of the section explaining the distinction:
  - `PitchAnalyzer` = standalone, no beats required, for general pitch analysis
  - `PitchBeatLinker` + `MelodyContourAnalyzer` = beat-aligned, for rhythm game chart generation
  - Include cross-reference link to the new Core Modules entry

- [ ] **Data Types** — Add a `PitchAnalysisProfile` type documentation entry (between `MusicClassificationProfile` and `AudioTimelineEvent`), documenting the interface fields in a table

- [ ] **Files Changed table** — Update to include both documentation files

## Dependencies

- No external dependencies — uses existing `PitchDetector`, `EssentiaPitchDetector`, and Web Audio API
- No changes to existing classes — this is purely additive
- Reuses `DirectionStats` and `IntervalStats` types from `MelodyContourAnalyzer.ts`

## Files Changed

| File | Action |
|---|---|
| `src/core/analysis/PitchAnalyzer.ts` | **New file** — main class + co-located types (`PitchAnalysisProfile`, `PitchContour`, `PitchContourSegment`, `PitchAnalyzerConfig`) |
| `src/core/analysis/index.ts` | Add `PitchAnalyzer` export |
| `src/index.ts` | Add exports in new "PITCH ANALYSIS" section |
| `tests/unit/analysis/pitchAnalyzer.test.ts` | **New file** — tests |
| `docs/AUDIO_ANALYSIS.md` | Add "Pitch Analysis" section (method, usage example, output table) |
| `DATA_ENGINE_REFERENCE.md` | Add exports, type docs, Core Modules entry, cross-references |

## Questions/Unknowns

All decisions resolved:
- **Default max frequency**: Algorithm-specific. 1000 Hz for `pyin_legacy` (YIN algorithm ceiling), 20000 Hz for all others (Essentia defaults).
- **Contour analysis**: Optional via `includeContour` flag, defaults to `true`.
- **Contour depth**: Full depth matching `MelodyContourAnalysisResult` — interval categorization, direction stats, interval stats, time-window analysis.
- **Type location**: Co-located in `PitchAnalyzer.ts` (matches existing per-module pattern).
- **Metadata structure**: Flat summary stats on profile + minimal `analysis_metadata` for pipeline info. No `summary` wrapper, no top-level `algorithm`.
- **Progress reporting**: Optional `onProgress(phase, progress)` callback.
