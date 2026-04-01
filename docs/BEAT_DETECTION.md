# Beat Detection Documentation

The Playlist Data Engine provides beat detection and rhythm analysis features for rhythm games and beat-synchronized applications.

> **Note**: For general audio analysis (frequency analysis, waveform visualization), see [AUDIO_ANALYSIS.md](AUDIO_ANALYSIS.md).

---

## Table of Contents

- [Overview](#overview)
- [Beat Detection System](#beat-detection-system)
- [Chart Creation with Required Keys](#chart-creation-with-required-keys)
- [Downbeat Configuration](#downbeat-configuration)
- [Beat Interpolation](#beat-interpolation)
- [Beat Subdivision](#beat-subdivision)
- [Real-Time Subdivision Playground (Practice Mode)](#real-time-subdivision-playground-practice-mode)
- [Groove Analysis](#groove-analysis)

### Automatic Level Generation — Rhythm Generation

> **Note**: This is the rhythm generation half of automatic level generation. For pitch detection and button mapping, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md).

- [Procedural Rhythm Generation](#procedural-rhythm-generation) — Overview and pipeline
- [Transient Detection](#transient-detection) — Multi-band onset detection
- [Rhythm Quantization](#rhythm-quantization) — Grid alignment and density validation
- [Scoring and Composite Generation](#scoring-and-composite-generation) — Band selection and stream creation
- [Phrase Detection](#phrase-detection) — Pattern library for density enhancement
- [Difficulty Variant Generation](#difficulty-variant-generation) — Easy/Medium/Hard variants
- [Usage Examples](#usage-examples) — Common workflows for rhythm generation

### Automatic Level Generation — Pitch Detection & Button Mapping

> **Note**: This is the pitch detection and button mapping half of automatic level generation. It depends on the rhythm generation outputs.

- [Pitch Detection](#pitch-detection) — pYIN algorithm, Essentia.js alternatives, and multi-band analysis
- [Melody Contour Analysis](#melody-contour-analysis) — Pitch direction and interval tracking
- [Button Mapping Strategies](#button-mapping-strategies) — DDR and Guitar Hero modes
- [Level Generation Examples](#level-generation-examples) — Complete workflows
- [Serialization Format](#serialization-format) — FullBeatMapExportData structure and compatibility

### Reference

- [References](#references)

---

## Overview

The beat detection system is powered by the Web Audio API and provides:

| Feature | Methods | Purpose |
|---------|---------|---------|
| **Beat Detection** | `generateBeatMap()` + `createBeatStream()` | Rhythm timing data for games and visuals |
| **Beat Interpolation** | `interpolateBeatMap()` | Fill gaps in detected beats |
| **Beat Subdivision** | `subdivideBeatMap()` | Create rhythmic patterns (eighth notes, triplets, etc.) |

### Source Files

| Component | Location |
|-----------|----------|
| **AudioAnalyzer** (main class) | [src/core/analysis/AudioAnalyzer.ts](../src/core/analysis/AudioAnalyzer.ts) |
| **SpectrumScanner** (frequency bands) | [src/core/analysis/SpectrumScanner.ts](../src/core/analysis/SpectrumScanner.ts) |
| **BeatMapGenerator** | [src/core/analysis/beat/BeatMapGenerator.ts](../src/core/analysis/beat/BeatMapGenerator.ts) |
| **BeatStream** | [src/core/analysis/beat/BeatStream.ts](../src/core/analysis/beat/BeatStream.ts) |
| **GrooveAnalyzer** | [src/core/analysis/beat/GrooveAnalyzer.ts](../src/core/analysis/beat/GrooveAnalyzer.ts) |
| **OnsetStrengthEnvelope** | [src/core/analysis/beat/OnsetStrengthEnvelope.ts](../src/core/analysis/beat/OnsetStrengthEnvelope.ts) |
| **BeatTracker** (Ellis DP) | [src/core/analysis/beat/BeatTracker.ts](../src/core/analysis/beat/BeatTracker.ts) |
| **TempoDetector** | [src/core/analysis/beat/TempoDetector.ts](../src/core/analysis/beat/TempoDetector.ts) |
| **BeatInterpolator** | [src/core/analysis/beat/BeatInterpolator.ts](../src/core/analysis/beat/BeatInterpolator.ts) |
| **RhythmXPCalculator** | [src/core/progression/RhythmXPCalculator.ts](../src/core/progression/RhythmXPCalculator.ts) |
| **Beat Types** | [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts) |
| **Rhythm XP Types** | [src/core/types/RhythmXP.ts](../src/core/types/RhythmXP.ts) |
| **Audio Types** | [src/core/types/AudioProfile.ts](../src/core/types/AudioProfile.ts) |

---

## Beat Detection System

The beat detection system enables precise rhythm timing for rhythm games and beat-synchronized applications. It operates in two phases:

1. **Pre-Analysis Phase**: Analyze the entire track to detect beats → generates a `BeatMap`
2. **Gameplay Phase**: Stream beat events synchronized with audio playback using `BeatStream`

### Core Goal

Provide beat timing data and synchronization primitives. This is the **data engine only** — no frontend/UI components. The data engine emits beat events and provides button press timing data.

**Precision Target**: ±10ms (sample-accurate scheduling using Web Audio API)

---

### OSE Parameter Modes

The Onset Strength Envelope (OSE) calculation uses several parameters that affect beat detection quality and performance. To make these parameters more accessible, the engine provides a **tiered mode system** that maps user-friendly mode names to optimized technical values.

#### Tier 1: Primary Controls (Hop Size)

Hop size determines the time resolution of onset detection. Smaller values = more precise but slower analysis.

| Mode | Value | Description | Use Case |
|------|-------|-------------|----------|
| `'efficient'` | 10ms | Fast analysis, reduced precision | Preview mode, quick scans |
| `'standard'` | 4ms | Paper specification (Ellis 2007) | **Recommended for most use cases** |
| `'hq'` | 2ms | High quality, maximum precision | Critical timing, rhythm games |
| `'custom'` | user-defined | Custom hop size (1-50ms, clamped) | Specialized requirements |

**Default Change**: The default hop size changed from 10ms to 4ms to match the Ellis 2007 paper specification. Users who prefer the previous behavior can opt into `'efficient'` mode.

#### Tier 2: Advanced Controls

##### Mel Bands Mode

Mel bands determine the frequency resolution of onset detection. More bands = better frequency resolution but slightly slower analysis.

| Mode | Value | Description | Use Case |
|------|-------|-------------|----------|
| `'standard'` | 40 bands | Paper default, librosa default | **Recommended for most use cases** |
| `'detailed'` | 64 bands | Better frequency resolution | Complex instrumentation |
| `'maximum'` | 80 bands | Maximum detail | Orchestral, dense mixes |

##### Gaussian Smooth Mode

Gaussian smoothing determines how much the onset envelope is smoothed. More smoothing = cleaner peaks but may miss fast transients.

| Mode | Value | Description | Use Case |
|------|-------|-------------|----------|
| `'minimal'` | 10ms | Preserves fast transients | Percussive music, electronic |
| `'standard'` | 20ms | Paper default | **Recommended for most use cases** |
| `'smooth'` | 40ms | Cleaner peaks, less noise | Smooth jazz, ambient |

#### Usage Examples

##### Using Hop Size Modes

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Standard mode (default) - paper specification
const standardGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'standard' }  // 4ms (Ellis 2007 paper spec)
});

// Efficient mode - fast analysis, reduced precision
const efficientGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'efficient' }  // 10ms
});

// HQ mode - maximum precision
const hqGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'hq' }  // 2ms
});

// Custom mode - user-defined value
const customGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'custom', customValue: 5 }  // 5ms
});

// Backward compatible - direct value still works
const legacyGenerator = new BeatMapGenerator({
  hopSizeMs: 10  // Direct numeric value (legacy behavior)
});
```

##### Using Advanced Controls

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Mel bands configuration
const detailedGenerator = new BeatMapGenerator({
  melBandsMode: { mode: 'detailed' }  // 64 bands
});

// Gaussian smoothing configuration
const smoothGenerator = new BeatMapGenerator({
  gaussianSmoothMode: { mode: 'smooth' }  // 40ms
});

// Combined configuration
const configuredGenerator = new BeatMapGenerator({
  hopSizeMode: { mode: 'standard' },       // 4ms (paper spec)
  melBandsMode: { mode: 'detailed' },      // 64 bands
  gaussianSmoothMode: { mode: 'standard' } // 20ms
});
```

##### Using Helper Functions

```typescript
import {
  getHopSizeMs,
  getMelBands,
  getGaussianSmoothMs,
  HOP_SIZE_PRESETS,
  MEL_BANDS_PRESETS,
  GAUSSIAN_SMOOTH_PRESETS,
} from 'playlist-data-engine';

// Convert mode to value
const hopSize = getHopSizeMs({ mode: 'standard' });  // 4
const melBands = getMelBands({ mode: 'detailed' });  // 64
const smoothMs = getGaussianSmoothMs({ mode: 'smooth' });  // 40

// Access presets directly
console.log(HOP_SIZE_PRESETS.efficient);  // 10
console.log(HOP_SIZE_PRESETS.standard);   // 4
console.log(HOP_SIZE_PRESETS.hq);         // 2

// Custom values are clamped to valid range (1-50ms)
const customHop = getHopSizeMs({ mode: 'custom', customValue: 100 });  // 50 (clamped)
```

#### Mode-to-Value Reference

| Parameter | Mode | Value | Notes |
|-----------|------|-------|-------|
| Hop Size | `efficient` | 10ms | Legacy default |
| Hop Size | `standard` | 4ms | **Current default**, paper spec |
| Hop Size | `hq` | 2ms | Maximum precision |
| Mel Bands | `standard` | 40 | Paper/librosa default |
| Mel Bands | `detailed` | 64 | Better resolution |
| Mel Bands | `maximum` | 80 | Maximum detail |
| Gaussian Smooth | `minimal` | 10ms | Preserves transients |
| Gaussian Smooth | `standard` | 20ms | Paper default |
| Gaussian Smooth | `smooth` | 40ms | Cleaner peaks |

#### Precedence Rules

When both mode and direct value are provided, **mode takes precedence**:

```typescript
// Mode wins - uses 4ms from mode, not 10ms from hopSizeMs
const generator = new BeatMapGenerator({
  hopSizeMs: 10,
  hopSizeMode: { mode: 'standard' }  // This wins
});

// Use direct value only when mode is not specified
const legacyGenerator = new BeatMapGenerator({
  hopSizeMs: 10  // Uses 10ms (no mode specified)
});
```

---

### Sensitivity & Filter Controls

The beat detection system provides two parameters for fine-tuning beat detection:

| Parameter | Range | Default | Purpose |
|-----------|-------|---------|---------|
| **`sensitivity`** | 0.1 - 10.0 | 1.0 | Pre-processing: controls tempo strictness |
| **`filter`** | 0.0 - 1.0 | 0.0 | Post-processing: filters beats by grid alignment |

#### Sensitivity (Pre-Processing)

The `sensitivity` parameter controls how aggressively the beat detection algorithm works by adjusting the effective `dpAlpha` value:

```typescript
effectiveDpAlpha = dpAlpha / sensitivity
```

| Sensitivity | effectiveDpAlpha | Result |
|-------------|------------------|--------|
| 0.1 | 6800 | Very strict tempo, fewer beats detected |
| 0.5 | 1360 | Strict tempo, fewer beats than default |
| 1.0 | 680 | Default algorithm behavior |
| 2.0 | 340 | More flexible, more beats detected |
| 5.0 | 136 | Very flexible, detects subdivisions |
| 10.0 | 68 | Maximum flexibility, many beats |

**When to use:**
- **Low sensitivity (0.1-0.5)**: Songs with very consistent tempo where you want only the strongest beats
- **Default (1.0)**: Most music, balanced detection
- **High sensitivity (2.0-5.0)**: Complex rhythms, syncopated music, or when you want to capture subdivisions
- **Very high (10.0)**: Experimental, may include noise

#### Filter (Post-Processing)

The `filter` parameter removes beats that deviate from the expected tempo grid:

| Filter | Behavior |
|--------|----------|
| 0.0 | No filtering (default, all detected beats kept) |
| 0.5 | Remove beats significantly off the 1/4 note grid |
| 0.9 | Keep only beats very close to the grid |
| 1.0 | Keep only beats exactly on the grid |

**When to use:**
- **0.0**: Keep all detected beats (default)
- **0.3-0.5**: Remove clearly off-grid beats while keeping natural timing variations
- **0.7-0.9**: Strict quantization for rhythm games requiring precise grid timing
- **1.0**: Only beats exactly on tempo grid (may remove too many beats)

#### Parameter Combinations

| Sensitivity | Filter | Result |
|-------------|--------|--------|
| 0.5 | 0.0 | Fewer beats detected, all kept |
| 1.0 | 0.0 | Default detection, all kept |
| 2.0 | 0.0 | More beats detected (including subdivisions) |
| 1.0 | 0.5 | Default detection, off-grid beats removed |
| 2.0 | 0.5 | More beats detected, off-grid beats removed |
| 2.0 | 1.0 | Many beats detected, only exact grid beats kept |

---

### Types

#### Beat

Represents a single detected beat:

| Property | Type | Description |
|----------|------|-------------|
| `timestamp` | `number` | Time in seconds from audio start |
| `beatInMeasure` | `number` | Position in measure (0 = downbeat). Derived from `downbeatConfig`. |
| `isDownbeat` | `boolean` | Whether this is the first beat of a measure. Derived from `downbeatConfig`. |
| `measureNumber` | `number` | Measure index (0-indexed). Derived from `downbeatConfig`. |
| `intensity` | `number` | Onset strength (0-1, normalized) |
| `confidence` | `number` | Detection confidence (0-1) |
| `requiredKey` | `string?` | Optional required key for rhythm game charts (e.g., 'up', 'down', 'left', 'right') |

**Note**: The `beatInMeasure`, `isDownbeat`, and `measureNumber` properties are derived from the manual downbeat configuration (or defaults if not specified). See [Downbeat Configuration](#downbeat-configuration) for details.

**Note**: The `requiredKey` property is used for rhythm game chart creation. When specified, the player must press the matching key for the beat to count as a hit. See [Chart Creation with Required Keys](#chart-creation-with-required-keys) for details.

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### BeatMap

Complete beat map for a single audio track:

| Property | Type | Description |
|----------|------|-------------|
| `audioId` | `string` | Unique identifier for the audio source |
| `duration` | `number` | Duration in seconds |
| `beats` | `Beat[]` | Array of all detected beats |
| `bpm` | `number` | Initial BPM estimate |
| `metadata` | `BeatMapMetadata` | Algorithm settings and version info |
| `downbeatConfig?` | `DownbeatConfig` | Optional downbeat configuration (only stored if explicitly provided) |

**Notes**:
- BPM is calculated dynamically during playback from actual beat intervals, not stored as a static value.
- The `downbeatConfig` field is optional. If undefined, the default configuration was used (beat 0 = downbeat, 4/4 time).

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### TimeSignatureConfig

Time signature configuration for beat grid:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `beatsPerMeasure` | `number` | `4` | Number of beats per measure (4 = 4/4 time, 3 = 3/4 time) |

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### DownbeatSegment

A segment of downbeat configuration (supports time signature changes):

| Property | Type | Description |
|----------|------|-------------|
| `startBeat` | `number` | Beat index where this segment starts (0-indexed) |
| `downbeatBeatIndex` | `number` | Absolute beat index that is the "one" (downbeat) - 0-indexed |
| `timeSignature` | `TimeSignatureConfig` | Time signature for this segment |

**Note**: Segments are contiguous. If segment 1 has `startBeat: 0` and segment 2 has `startBeat: 32`, segment 1 covers beats 0-31 and segment 2 covers beats 32+. There are no gaps.

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### DownbeatConfig

Downbeat configuration for manual placement:

| Property | Type | Description |
|----------|------|-------------|
| `segments` | `DownbeatSegment[]` | Array of downbeat segments (ordered by startBeat) |

**Default**: `{ segments: [{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }] }`

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### BeatMapMetadata

Algorithm settings used for detection:

| Property | Type | Description |
|----------|------|-------------|
| `version` | `string` | Algorithm version |
| `algorithm` | `string` | Algorithm identifier (e.g., 'ellis-dp-v1') |
| `minBpm` | `number` | Minimum BPM threshold |
| `maxBpm` | `number` | Maximum BPM threshold |
| `sensitivity` | `number` | Pre-processing sensitivity (0.1-10.0) |
| `filter` | `number` | Post-processing grid-alignment filter (0.0-1.0) |
| `noiseFloorThreshold` | `number` | Noise floor threshold |
| `hopSizeMs` | `number` | Milliseconds between FFT frames |
| `fftSize` | `number` | FFT window size in samples |
| `dpAlpha` | `number` | Ellis balance factor for tempo consistency |
| `melBands` | `number` | Number of Mel frequency bands |
| `highPassCutoff` | `number` | High-pass filter cutoff (Hz) |
| `gaussianSmoothMs` | `number` | Gaussian smoothing window (ms) |
| `tempoCenter` | `number` | Tempo center in seconds (0.5 = 120 BPM) |
| `tempoWidth` | `number` | Tempo width in octaves |
| `generatedAt` | `string` | ISO timestamp |

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### BeatEvent

Event emitted by BeatStream during playback:

| Property | Type | Description |
|----------|------|-------------|
| `beat` | `Beat` | The beat this event relates to |
| `currentBpm` | `number` | Current BPM from recent beat intervals |
| `audioTime` | `number` | Current audio context time |
| `timeUntilBeat` | `number` | Time until beat (negative if passed) |
| `type` | `BeatEventType` | 'upcoming' \| 'exact' \| 'passed' |

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### ButtonPressResult

Result of a button press accuracy check from `checkButtonPress()`:

| Property | Type | Description |
|----------|------|-------------|
| `accuracy` | `BeatAccuracy` | Accuracy level: 'perfect' \| 'great' \| 'good' \| 'ok' \| 'miss' \| 'wrongKey' |
| `offset` | `number` | Time difference from nearest beat in seconds (negative = early, positive = late) |
| `matchedBeat` | `Beat` | The beat that was matched (nearest beat to the press) |
| `absoluteOffset` | `number` | Absolute time difference in seconds |
| `keyMatch` | `boolean` | Whether the pressed key matched the required key (true if no key required) |
| `pressedKey` | `string?` | The key that was pressed (passed to checkButtonPress) |
| `requiredKey` | `string?` | The required key from the matched beat (undefined if beat has no required key) |

**Key Matching Behavior:**
- If beat has no `requiredKey`: `keyMatch` is `true`, accuracy is timing-based
- If beat has `requiredKey` and `pressedKey` matches: `keyMatch` is `true`, accuracy is timing-based
- If beat has `requiredKey` and `pressedKey` doesn't match: `keyMatch` is `false`, accuracy is `'wrongKey'`
- If beat has `requiredKey` but no `pressedKey` provided: `keyMatch` is `false`, accuracy is `'miss'`
- If `ignoreKeyRequirements: true` in BeatStreamOptions: Key checking is bypassed, timing-only evaluation

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### BeatMapGeneratorOptions

Configuration for beat map generation:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `minBpm` | `number` | 60 | Minimum BPM to detect |
| `maxBpm` | `number` | 180 | Maximum BPM to detect |
| `sensitivity` | `number` | 1.0 | Pre-processing sensitivity (0.1-10.0) |
| `filter` | `number` | 0.0 | Post-processing grid-alignment filter (0.0-1.0) |
| `noiseFloorThreshold` | `number` | 0 | Noise floor threshold |
| `hopSizeMs` | `number` | 4 | Milliseconds between FFT frames |
| `hopSizeMode` | `HopSizeConfig` | `{ mode: 'standard' }` | Hop size mode (alternative to `hopSizeMs`) |
| `fftSize` | `number` | 2048 | FFT window size in samples |
| `rollingBpmWindowSize` | `number` | 8 | Beats for rolling BPM calculation |
| `dpAlpha` | `number` | 680 | Ellis balance factor |
| `melBands` | `number` | 40 | Mel frequency bands for OSE |
| `melBandsMode` | `MelBandsConfig` | `{ mode: 'standard' }` | Mel bands mode (alternative to `melBands`) |
| `highPassCutoff` | `number` | 0.4 | High-pass filter cutoff (Hz) |
| `gaussianSmoothMs` | `number` | 20 | Gaussian smoothing window (ms) |
| `gaussianSmoothMode` | `GaussianSmoothConfig` | `{ mode: 'standard' }` | Gaussian smooth mode (alternative to `gaussianSmoothMs`) |
| `tempoCenter` | `number` | 0.5 | Tempo center (seconds, 0.5 = 120 BPM) |
| `tempoWidth` | `number` | 1.4 | Tempo width in octaves |

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

#### BeatStreamOptions

Configuration for beat streaming:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `anticipationTime` | `number` | 2.0 | Time before beat for 'upcoming' event (seconds) |
| `userOffsetMs` | `number` | 0 | Player-calibrated audio/visual offset (ms) |
| `compensateOutputLatency` | `boolean` | true | Auto-adjust using AudioContext.outputLatency |
| `timingTolerance` | `number` | 0.01 | Synchronization tolerance (seconds, 10ms) |
| `difficultyPreset` | `DifficultyPreset` | 'hard' | Difficulty preset for accuracy thresholds |
| `customThresholds` | `Partial<AccuracyThresholds>` | {} | Custom thresholds (overrides preset) |
| `ignoreKeyRequirements` | `boolean` | false | When true, beats with requiredKey use timing-only evaluation (easy mode) |

**Source**: [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts)

---

### Classes

#### BeatMapGenerator

Generates beat maps from audio files using the Ellis Dynamic Programming algorithm.

**Source**: [src/core/analysis/beat/BeatMapGenerator.ts](../src/core/analysis/beat/BeatMapGenerator.ts)

##### Constructor

```typescript
new BeatMapGenerator(options?: BeatMapGeneratorOptions)
```

##### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `generateBeatMap` | `audioUrl`, `audioId`, `downbeatConfig?`, `onProgress?` | `Promise<BeatMap>` | Generate beat map from audio URL |
| `generateBeatMapFromBuffer` | `audioBuffer`, `audioId`, `downbeatConfig?`, `onProgress?` | `Promise<BeatMap>` | Generate from decoded AudioBuffer |
| `getProgress` | - | `BeatMapGenerationProgress` | Get current generation progress |
| `cancel` | - | `void` | Cancel ongoing generation |
| `toJSON` | `beatMap` | `string` | Serialize beat map to JSON |
| `fromJSON` | `jsonString` | `BeatMap` | Parse beat map from JSON |
| `saveToFile` | `beatMap`, `filePath` | `Promise<void>` | Save to disk (Node.js only) |
| `loadFromFile` | `filePath` | `Promise<BeatMap>` | Load from disk (Node.js only) |

---

#### BeatStream

Real-time beat event streaming synchronized with audio playback.

**Source**: [src/core/analysis/beat/BeatStream.ts](../src/core/analysis/beat/BeatStream.ts)

##### Constructor

```typescript
new BeatStream(beatMap: BeatMap, audioContext: AudioContext, options?: BeatStreamOptions)
```

##### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribe` | `callback: BeatStreamCallback` | `() => void` | Subscribe to beat events, returns unsubscribe |
| `start` | - | `void` | Start streaming beat events |
| `stop` | - | `void` | Stop streaming |
| `seek` | `time: number` | `void` | Seek to a specific time |
| `getUpcomingBeats` | `count: number` | `Beat[]` | Get next N beats for pre-rendering |
| `getBeatAtTime` | `time: number` | `Beat \| undefined` | Find beat at specific time |
| `getSyncState` | - | `AudioSyncState` | Get synchronization state for debugging |
| `getCurrentBpm` | - | `number` | Get current BPM from rolling calculation |
| `checkButtonPress` | `timestamp: number, pressedKey?: string` | `ButtonPressResult` | Check button press accuracy with optional key validation |
| `getLastBeatAccuracy` | - | `ButtonPressResult \| null` | Get last press accuracy |

---

#### OnsetStrengthEnvelope

Calculates the perceptual onset strength envelope using Mel-frequency bands.

**Source**: [src/core/analysis/beat/OnsetStrengthEnvelope.ts](../src/core/analysis/beat/OnsetStrengthEnvelope.ts)

##### Constructor

```typescript
new OnsetStrengthEnvelope(config?: OSEConfig)
```

##### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `calculate` | `audioBuffer: AudioBuffer` | `OSEResult` | Calculate onset strength envelope |

##### OSEConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `targetSampleRate` | `number` | 8000 | Resample to this rate (Hz) |
| `fftWindowSize` | `number` | 32 | FFT window size (ms) |
| `hopSizeMs` | `number` | 4 | Hop size (ms) - use with `hopSizeMode` or direct value |
| `hopSizeMode` | `HopSizeConfig` | `{ mode: 'standard' }` | Hop size mode (alternative to `hopSizeMs`) |
| `melBands` | `number` | 40 | Number of Mel bands |
| `melBandsMode` | `MelBandsConfig` | `{ mode: 'standard' }` | Mel bands mode (alternative to `melBands`) |
| `highPassCutoff` | `number` | 0.4 | High-pass filter cutoff (Hz) |
| `gaussianSmoothMs` | `number` | 20 | Smoothing window (ms) |
| `gaussianSmoothMode` | `GaussianSmoothConfig` | `{ mode: 'standard' }` | Gaussian smooth mode (alternative to `gaussianSmoothMs`) |

---

#### BeatTracker

Implements the Ellis Dynamic Programming beat tracking algorithm.

**Source**: [src/core/analysis/beat/BeatTracker.ts](../src/core/analysis/beat/BeatTracker.ts)

##### Constructor

```typescript
new BeatTracker(config?: BeatTrackerConfig)
```

##### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `trackBeats` | `onsetEnvelope`, `tempoEstimate`, `config` | `BeatTrackingResult` | Find optimal beat sequence |

##### BeatTrackerConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `dpAlpha` | `number` | 680 | Ellis balance factor |
| `minPredecessorRatio` | `number` | 0.5 | Minimum predecessor (τp/2) |
| `maxPredecessorRatio` | `number` | 2.0 | Maximum predecessor (2τp) |

---

#### TempoDetector

Global tempo estimation using autocorrelation with perceptual weighting.

**Source**: [src/core/analysis/beat/TempoDetector.ts](../src/core/analysis/beat/TempoDetector.ts)

##### Constructor

```typescript
new TempoDetector(config?: TempoDetectorConfig)
```

##### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `estimateTempo` | `onsetEnvelope`, `hopSize` | `TempoEstimate` | Estimate tempo from onset envelope |

##### TempoDetectorConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `tempoCenter` | `number` | 0.5 | Tempo center (seconds, 0.5 = 120 BPM) |
| `tempoWidth` | `number` | 1.4 | Tempo width in octaves |
| `minBpm` | `number` | 60 | Minimum BPM |
| `maxBpm` | `number` | 180 | Maximum BPM |
| `useOctaveResolution` | `boolean` | `false` | Enable TPS2 octave resolution to fix half-tempo/double-tempo ambiguity. Uses Ellis 2007 duple meter calculation to prefer tempos with strong half-period evidence. Enable if tempo detection returns half the actual BPM (e.g., 73 BPM instead of 146 BPM). |
| `useTripleMeter` | `boolean` | `false` | Enable TPS3 triple meter resolution for 3/4 and 6/8 time signatures. Uses Ellis 2007 triple meter calculation (TPS3) to boost tempos with strong third-period evidence. Enable for waltzes, 6/8 shuffles, and other triple-meter music where beats occur in groups of three. Works independently of `useOctaveResolution` and can be enabled simultaneously. |

---

### Usage Examples

#### Basic BeatMap Generation

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Generate beat map with default options
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

console.log(`Detected ${beatMap.beats.length} beats at ~${beatMap.bpm} BPM`);
console.log(`Duration: ${beatMap.duration}s`);
```

#### BeatMap with Custom Options

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

const generator = new BeatMapGenerator({
  minBpm: 80,
  maxBpm: 160,
  dpAlpha: 800,  // Stricter tempo adherence
  melBands: 40,
  tempoCenter: 0.5,  // 120 BPM center
});

const beatMap = await generator.generateBeatMap('song.mp3', 'track-001', (progress) => {
  console.log(`${progress.phase}: ${progress.progress}% - ${progress.message}`);
});
```

#### Sensitivity & Filter Configuration

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Sensitivity: controls how many beats are detected
// Filter: controls how strictly beats must align to the grid

// Common presets:
const generator = new BeatMapGenerator({
  sensitivity: 2.0,  // High: detect subdivisions | Low (0.5): only strong beats
  filter: 0.7,       // High: strict grid alignment | Low (0.0): keep all beats
});

const beatMap = await generator.generateBeatMap('song.mp3', 'track-001');
console.log(`Detected ${beatMap.beats.length} beats`);
console.log(`Settings used:`, beatMap.metadata.sensitivity, beatMap.metadata.filter);
```

| Use Case | Sensitivity | Filter | Description |
|----------|-------------|--------|-------------|
| Casual game | 0.5 | 0.0 | Only strong beats, all kept |
| Rhythm game | 2.0 | 0.7 | Detect subdivisions, remove off-grid |
| Expert mode | 5.0 | 0.9 | Maximum detection, strict alignment |
| Simple 4/4 songs | 0.5 | 0.5 | Fewer beats, moderate filtering |

#### BeatMap Serialization

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Serialize to JSON
const jsonString = AudioAnalyzer.beatMapToJSON(beatMap);

// Save to file (Node.js)
await AudioAnalyzer.saveBeatMapToFile(beatMap, './beatmaps/track-001.json');

// Load from file
const loadedBeatMap = await AudioAnalyzer.loadBeatMapFromFile('./beatmaps/track-001.json');

// Parse from JSON
const parsedBeatMap = AudioAnalyzer.beatMapFromJSON(jsonString);
```

#### Beat Stream Setup

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();

// Generate beat map
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Create beat stream
const beatStream = analyzer.createBeatStream(beatMap, audioContext, {
  anticipationTime: 2.0,  // 2 seconds for animation pre-rendering
  timingTolerance: 0.01,  // 10ms precision
  userOffsetMs: 0,        // Adjustable player latency offset
  compensateOutputLatency: true,
});

// Subscribe to beat events
const unsubscribe = beatStream.subscribe((event) => {
  switch (event.type) {
    case 'upcoming':
      // 2 seconds before beat - pre-render visuals
      console.log(`Beat approaching at ${event.beat.timestamp}s`);
      break;
    case 'exact':
      // Beat is happening now
      console.log(`Beat at ${event.beat.timestamp}s, BPM: ${event.currentBpm}`);
      break;
    case 'passed':
      // Beat was missed
      console.log(`Missed beat at ${event.beat.timestamp}s`);
      break;
  }
});

// Start streaming when audio plays
// audioElement.play();  // Your audio element
beatStream.start();

// Clean up
// unsubscribe();
// beatStream.stop();
```

#### Button Press Detection

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();

const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');
const beatStream = analyzer.createBeatStream(beatMap, audioContext);

beatStream.start();

// Call this when player presses a button
function onPlayerButtonPress() {
  const result = beatStream.checkButtonPress(audioContext.currentTime);

  console.log(`Accuracy: ${result.accuracy}`);
  console.log(`Offset: ${result.offset * 1000}ms (${result.offset < 0 ? 'early' : 'late'})`);
  console.log(`Matched beat at: ${result.matchedBeat.timestamp}s`);

  // Result.accuracy is one of: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey'
  return result;
}
```

#### Accuracy Levels

| Level | Easy | Medium | Hard | Description |
|-------|------|--------|------|-------------|
| `perfect` | ±35ms | ±10ms | ±8ms | Perfect timing |
| `great` | ±70ms | ±25ms | ±20ms | Very close |
| `good` | ±110ms | ±50ms | ±40ms | Good timing |
| `ok` | ±150ms | ±100ms | ±75ms | Acceptable |
| `miss` | >150ms | >100ms | >75ms | Missed the beat |
| `wrongKey` | — | — | — | Correct timing but wrong key pressed (for charts with required keys) |

**Default**: Medium difficulty (balanced experience for most players)

See [Configuring Difficulty](#configuring-difficulty) for how to customize thresholds.

#### Configuring Difficulty

The beat detection system supports configurable difficulty through three presets (`easy`, `medium`, `hard`) and custom thresholds.

```typescript
import { AudioAnalyzer, validateThresholds } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Use a preset: 'easy' | 'medium' | 'hard'
const stream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'medium'  // also available: 'easy', 'hard'
});

// Or customize with customThresholds (partial override)
const customStream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'medium',
  customThresholds: { perfect: 0.030 }  // Stricter perfect (±30ms)
});

// Validate custom thresholds before use
const result = validateThresholds({ perfect: 0.050, great: 0.100, good: 0.150, ok: 0.200 });
if (!result.valid) console.error('Invalid:', result.errors);
```

**Preset Constants** are exported for direct access: `EASY_ACCURACY_THRESHOLDS`, `MEDIUM_ACCURACY_THRESHOLDS`, `HARD_ACCURACY_THRESHOLDS`. Use `getAccuracyThresholdsForPreset('medium')` to get thresholds programmatically, or `stream.getAccuracyThresholds()` to get current thresholds.

##### Changing Difficulty Mid-Stream

Use `setDifficulty()` for adaptive difficulty during gameplay:

```typescript
stream.start();

// Adjust based on player performance
function onPlayerPerformanceUpdate(accuracy: number) {
  if (accuracy < 0.5) stream.setDifficulty({ preset: 'easy' });
  else if (accuracy > 0.9) stream.setDifficulty({ preset: 'hard' });
}

// Can also use custom thresholds
stream.setDifficulty({ preset: 'medium', customThresholds: { perfect: 0.060 } });
```

#### Pre-rendering Beats

```typescript
// Get upcoming beats for animation pre-rendering
const upcomingBeats = beatStream.getUpcomingBeats(10);

upcomingBeats.forEach((beat, index) => {
  const timeUntil = beat.timestamp - audioContext.currentTime;
  console.log(`Beat ${index + 1}: ${beat.timestamp}s (in ${timeUntil.toFixed(2)}s)`);
  console.log(`  Downbeat: ${beat.isDownbeat}, Intensity: ${beat.intensity.toFixed(2)}`);
});
```

#### Rolling BPM

```typescript
// BPM is calculated from actual beat intervals, not a static value
beatStream.subscribe((event) => {
  const currentBpm = beatStream.getCurrentBpm();

  // If the band slows down, BPM naturally decreases
  // If they speed up, BPM naturally increases
  console.log(`Current tempo: ${currentBpm.toFixed(1)} BPM`);
});
```

#### Seeking

```typescript
// Seek to a specific time
function seekTo(timeInSeconds: number) {
  // audioElement.currentTime = timeInSeconds;  // Your audio element
  beatStream.seek(timeInSeconds);
}

// Get current sync state for debugging
const syncState = beatStream.getSyncState();
console.log(`Drift: ${syncState.drift * 1000}ms`);
console.log(`Output latency: ${syncState.outputLatency * 1000}ms`);
console.log(`Synchronized: ${syncState.isSynchronized}`);
```

---

### Algorithm Details

#### Ellis Dynamic Programming Beat Tracking

This implementation is based on Daniel P.W. Ellis's 2007 paper *"Beat Tracking by Dynamic Programming"* — the foundation for Python's `librosa` beat tracker.

**Why the Ellis Algorithm?**

Unlike real-time beat detection that guesses beats one-by-one, the Ellis algorithm recursively analyzes the entire audio file to find the **globally optimal** beat sequence. It guarantees finding the best possible rhythmic path through the song by:
- Maximizing alignment with onset strength peaks (where beats "sound" like they should be)
- Minimizing deviation from consistent tempo intervals (beats should be evenly spaced)
- Automatically filtering subdivisions through mathematical penalties

*Reference: [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)*

#### The Ellis Objective Function

The algorithm finds beat times {t₁, t₂, ..., tₙ} that maximize:

```
C({ti}) = Σ O(ti) + α Σ F(ti - ti-1, τp)
```

Where:
- **O(t)** = Onset Strength Envelope (high at moments that make good beats)
- **F(Δt, τ)** = Transition cost function (penalizes tempo deviation)
- **α** = Balance factor (paper found optimal: **α = 680**)
- **τp** = Target inter-beat interval (from tempo estimation)

#### Transition Cost Function

```
F(Δt, τ) = -(log(Δt/τ))²
```

This function:
- Returns **0** when Δt = τ (perfect tempo match)
- Becomes **increasingly negative** for larger deviations
- Is **symmetric on log-time axis**: F(kτ, τ) = F(τ/k, τ)
- **Naturally filters subdivisions**: Placing beats on 8th/16th notes severely violates tempo consistency

#### Fluid Tempo Handling

- **No grid quantization**: Beat timestamps are the actual detected moments, not snapped to a BPM grid
- **Rolling BPM calculation**: Current BPM is derived from the actual intervals between recent beats
- **Works with drifting tempo**: The DP algorithm naturally accommodates gradual tempo drift within ±10% of target
- **Time signature agnostic**: We detect beats, not measures. Downbeats are configured manually via `downbeatConfig`.

---

## Chart Creation with Required Keys

The beat detection system supports rhythm game chart creation through the `requiredKey` property on beats. This enables Guitar Hero/DDR-style gameplay where specific keys must be pressed for specific beats.

### Overview

| Concept | Description |
|---------|-------------|
| **Required Key** | An optional property on a beat that specifies which key must be pressed |
| **Chart** | A beat map (typically `SubdividedBeatMap`) that has required key assignments |
| **WrongKey** | A new accuracy type for when timing is correct but the wrong key was pressed |

### How Key Matching Works

The engine performs **simple string comparison** — it does not validate or care about the physical input source:

```typescript
// Engine logic (simplified)
if (beat.requiredKey && pressedKey !== beat.requiredKey) {
    result.accuracy = 'wrongKey';
}
```

**Frontend responsibility**: Map physical inputs to logical key strings before calling the engine:

| Physical Input | Pass to Engine |
|----------------|----------------|
| Keyboard arrow keys | `"up"`, `"down"`, `"left"`, `"right"` |
| Game controller D-pad | `"up"`, `"down"`, `"left"`, `"right"` |
| Game controller face buttons | `"a"`, `"b"`, `"x"`, `"y"` |
| Touch screen zones | Any string you define |

The engine doesn't know or care if "up" came from a keyboard, controller, or touch screen — it just matches strings.

### Helper Functions

The engine provides utility functions for managing required keys on beat maps:

```typescript
import {
    assignKeyToBeat,
    assignKeysToBeats,
    extractKeyMap,
    clearAllKeys,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
} from 'playlist-data-engine';
```

| Function | Purpose |
|----------|---------|
| `assignKeyToBeat(beatMap, index, key)` | Assign a key to a single beat (immutable) |
| `assignKeysToBeats(beatMap, assignments)` | Bulk assign keys to multiple beats |
| `extractKeyMap(beatMap)` | Get a Map of beatIndex → requiredKey |
| `clearAllKeys(beatMap)` | Remove all key assignments |
| `hasRequiredKeys(beatMap)` | Check if any keys are assigned |
| `getKeyCount(beatMap)` | Count beats with keys |
| `getUsedKeys(beatMap)` | Get unique keys used (sorted) |

### Creating a Chart

Complete end-to-end workflow showing the full pipeline from audio to playable chart:

```typescript
import {
    BeatMapGenerator,
    BeatInterpolator,
    BeatSubdivider,
    unifyBeatMap,
    SubdivisionConfig,
    BeatStream,
    assignKeysToBeats,
    getUsedKeys,
} from 'playlist-data-engine';

// Step 1: Generate beat map from audio
const generator = new BeatMapGenerator();
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Step 2: Interpolate to fill gaps
const interpolator = new BeatInterpolator();
const interpolatedMap = interpolator.interpolate(beatMap);

// Step 3: Unify for subdivision
const unifiedMap = unifyBeatMap(interpolatedMap);

// Step 4: Subdivide for rhythm patterns
const subdivisionConfig: SubdivisionConfig = {
    beatSubdivisions: new Map([
        [0, 'eighth'],   // All beats get eighth notes
    ]),
    defaultSubdivision: 'eighth',
};
const subdivider = new BeatSubdivider();
const subdividedMap = subdivider.subdivide(unifiedMap, subdivisionConfig);

// Step 5: Assign required keys to create a chart
const chartMap = assignKeysToBeats(subdividedMap, [
    { beatIndex: 0, key: 'left' },
    { beatIndex: 1, key: 'down' },
    { beatIndex: 2, key: 'up' },
    { beatIndex: 3, key: 'right' },
    // ... more assignments
]);

// Step 6: Check what keys are used
const usedKeys = getUsedKeys(chartMap);
// ['down', 'left', 'right', 'up']

// Step 7: Use in gameplay
const audioContext = new AudioContext();
const beatStream = new BeatStream(chartMap, audioContext);
beatStream.start();

// Step 8: On player input - frontend maps physical input to string
function onPlayerInput(physicalKey: string) {
    const keyMap = { 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right' };
    const pressedKey = keyMap[physicalKey];

    const result = beatStream.checkButtonPress(audioContext.currentTime, pressedKey);

    // result.accuracy: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey'
    // result.keyMatch: true | false
    // result.requiredKey: the key the beat required (if any)
    // result.pressedKey: the key that was passed in
}

// Easy mode: ignore key requirements (timing-only evaluation)
const easyStream = new BeatStream(chartMap, audioContext, {
    ignoreKeyRequirements: true,
});
```

### Key Assignment Best Practices

1. **Use consistent key names**: Pick a convention (e.g., lowercase: 'up', 'down', 'left', 'right')
2. **Assign keys after beat map generation**: Keys are assigned as a post-processing step
3. **Test with `hasRequiredKeys()`**: Verify a beat map is actually a chart before gameplay
4. **Use `getUsedKeys()` for UI**: Determine which buttons to display based on the chart

### Chart Essentials

A compact example showing key chart operations: creating a chart, handling input with key validation, and using `ignoreKeyRequirements` for easy mode.

```typescript
import {
    BeatMapGenerator,
    assignKeysToBeats,
    getUsedKeys,
    BeatStream,
    type ButtonPressResult,
    type BeatStreamOptions,
} from 'playlist-data-engine';

const generator = new BeatMapGenerator();
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Assign keys to create a chart (alternating left-right pattern)
const chartMap = assignKeysToBeats(beatMap, beatMap.beats.map((_, i) => ({
    beatIndex: i,
    key: i % 2 === 0 ? 'left' : 'right',
})));
console.log(`Keys used: ${getUsedKeys(chartMap).join(', ')}`); // "left, right"

// Create BeatStream - normal mode enforces keys, easy mode ignores them
const audioContext = new AudioContext();
const options: BeatStreamOptions = {
    difficultyPreset: 'medium',
    ignoreKeyRequirements: false,  // Set true for timing-only evaluation
};
const beatStream = new BeatStream(chartMap, audioContext, options);
beatStream.start();

// Handle player input with key validation
function onPlayerInput(physicalKey: string) {
    const keyMap: Record<string, string> = {
        'ArrowLeft': 'left', 'ArrowRight': 'right',
        'ArrowUp': 'up', 'ArrowDown': 'down',
    };
    const pressedKey = keyMap[physicalKey];
    if (!pressedKey) return;

    const result: ButtonPressResult = beatStream.checkButtonPress(
        audioContext.currentTime,
        pressedKey
    );

    // result.accuracy: 'perfect' | 'great' | 'good' | 'ok' | 'miss' | 'wrongKey'
    // result.keyMatch: true | false (always true if ignoreKeyRequirements is enabled)
    // result.requiredKey: the key the beat required (if any)
    // result.pressedKey: the key that was passed in
}
```

---

### Scope Note

This is the **data engine only** — no frontend/UI components. The data engine emits beat events and provides button press timing data. Building a playable rhythm game demo (visual feedback, note spawning, etc.) should be done in a separate frontend project (e.g., `playlist-data-showcase`).

The data engine provides:
- Beat event stream (`upcoming`, `exact`, `passed`)
- Button press accuracy detection (`perfect`, `great`, `good`, `ok`, `miss`, `wrongKey`)
- Configurable difficulty presets (easy, medium, hard) and custom thresholds
- Rolling BPM calculation
- Beat pre-rendering data
- Chart creation with required keys and key validation helpers

The frontend provides:
- Visual note spawning
- Animation and effects
- User interface
- Score display

---

## Downbeat Configuration

The data engine uses manual downbeat configuration rather than automatic detection. This provides consistent, predictable results across all music genres.

**IMPORTANT: The Typical Workflow**

You usually don't know the correct downbeat position until AFTER generating the beat map. The recommended workflow is:

1. **Generate** the beat map first (uses default config: beat 0 = downbeat, 4/4 time)
2. **Examine** the beat map to identify which beat is actually the "one"
3. **Reapply** the correct configuration using `reapplyDownbeatConfig()`

This approach is more practical than trying to configure upfront.

### Configuration Types

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `segments` | `DownbeatSegment[]` | `[{ startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } }]` | Array of config segments |

Each `DownbeatSegment` has:

| Property | Type | Description |
|----------|------|-------------|
| `startBeat` | `number` | Beat index where this segment starts (segments are contiguous) |
| `downbeatBeatIndex` | `number` | Absolute beat index that is the "one" (downbeat) - 0-indexed |
| `timeSignature.beatsPerMeasure` | `number` | Beats per measure (4 = 4/4 time) |

**Note**: Segments are CONTIGUOUS. If segment 1 has `startBeat: 0` and segment 2 has `startBeat: 32`, then segment 1 covers beats 0-31 and segment 2 covers beats 32+. There are no gaps.

### Usage Examples

**Recommended: Generate first, then configure:**

```typescript
import { BeatMapGenerator, reapplyDownbeatConfig } from 'playlist-data-engine';

const generator = new BeatMapGenerator();

// Step 1: Generate with default config
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Step 2: Examine beat map, identify that beat 9 is actually the "one"

// Step 3: Apply correct configuration
const correctedMap = reapplyDownbeatConfig(beatMap, {
  segments: [{
    startBeat: 0,
    downbeatBeatIndex: 9,  // Beat 9 is the "one"
    timeSignature: { beatsPerMeasure: 4 },
  }],
});
// Beats 1, 5, 9, 13, 17... are now downbeats
```

**3/4 time waltz:**

```typescript
import { BeatMapGenerator, reapplyDownbeatConfig } from 'playlist-data-engine';

const generator = new BeatMapGenerator();
const beatMap = await generator.generateBeatMap('waltz.mp3', 'track-2');
const waltzMap = reapplyDownbeatConfig(beatMap, {
  segments: [{
    startBeat: 0,
    downbeatBeatIndex: 0,
    timeSignature: { beatsPerMeasure: 3 },
  }],
});
// Every 3rd beat is a downbeat: 0, 3, 6, 9...
```

**Time signature change (4/4 → 3/4 at beat 32):**

```typescript
const beatMap = await generator.generateBeatMap('mixed.mp3', 'track-3');
const mixedMap = reapplyDownbeatConfig(beatMap, {
  segments: [
    { startBeat: 0, downbeatBeatIndex: 0, timeSignature: { beatsPerMeasure: 4 } },
    { startBeat: 32, downbeatBeatIndex: 32, timeSignature: { beatsPerMeasure: 3 } },
  ],
});
// Beats 0-31: 4/4 time (beats 0, 4, 8... are downbeats)
// Beats 32+: 3/4 time (beats 32, 35, 38... are downbeats)
// Note: Measure numbers continue incrementing across the change
```

**Pickup beats:**

```typescript
// Song starts 2 beats before the first measure
const beatMap = await generator.generateBeatMap('pickup.mp3', 'track-4');
const pickupMap = reapplyDownbeatConfig(beatMap, {
  segments: [{
    startBeat: 0,
    downbeatBeatIndex: 2,  // Beat 2 is the first downbeat
    timeSignature: { beatsPerMeasure: 4 },
  }],
});
// Beat 0: beatInMeasure=2 (pickup beat 3)
// Beat 1: beatInMeasure=3 (pickup beat 4)
// Beat 2: beatInMeasure=0 (downbeat, measure 0)
// Beat 3: beatInMeasure=1, measure 0
// Beat 6: beatInMeasure=0 (downbeat, measure 1)
```

### Key Points

- **0-indexed beat numbers**: The first beat is beat 0, not beat 1. This is consistent with array indexing.
- **Bidirectional calculation**: Setting `downbeatBeatIndex: 9` means beats 1, 5, 9, 13, 17... are downbeats (calculated both forward and backward from beat 9).
- **Measure continuation**: Measure numbers don't reset when time signature changes - they continue incrementing across segment boundaries.
- **Config storage**: `downbeatConfig` is only stored in the BeatMap if explicitly provided. If undefined, the default was used.

---

## Beat Interpolation

Beat interpolation is a **post-processing pass** that runs after BeatMap generation to fill gaps where detected beats may be missing. This is useful for rhythm games that need a complete beat grid, even in sections where beat detection was sparse or silent.

### Overview

The interpolation system uses a **Pace + Anchors model**:
- **Pace**: The quarter note interval established from dense sections (where detection works well)
- **Anchors**: Individual detected beats that validate and override interpolated beats

The result is an `InterpolatedBeatMap` with two output streams:
- `detectedBeats[]` — Original detected beats only
- `mergedBeats[]` — Interpolated beats + detected beats (detected beats override at same positions)

### Source Files

| Component | Location |
|-----------|----------|
| **BeatInterpolator** | [src/core/analysis/beat/BeatInterpolator.ts](../src/core/analysis/beat/BeatInterpolator.ts) |
| **Interpolation Types** | [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts) |

---

### Basic Interpolation with Defaults

The simplest way to use beat interpolation is with the default settings:

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Generate a beat map
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Interpolate with default options
const interpolated = analyzer.interpolateBeatMap(beatMap);

console.log(`Detected beats: ${interpolated.detectedBeats.length}`);
console.log(`Total beats (merged): ${interpolated.mergedBeats.length}`);
console.log(`Interpolated beats: ${interpolated.interpolationMetadata.interpolatedBeatCount}`);
console.log(`Quarter note: ${interpolated.quarterNoteBpm} BPM`);
```

#### One-Step Generation + Interpolation

For convenience, you can generate and interpolate in a single call:

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Generate beat map with interpolation in one step
const interpolated = await analyzer.generateBeatMapWithInterpolation(
  'song.mp3',
  'track-001'
);

console.log(`Total beats: ${interpolated.mergedBeats.length}`);
console.log(`Quarter note confidence: ${interpolated.quarterNoteConfidence}`);
```

---

### Accessing Detected vs Merged Streams

The `InterpolatedBeatMap` provides two beat streams for different use cases:

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const interpolated = await analyzer.generateBeatMapWithInterpolation(
  'song.mp3',
  'track-001'
);

// Stream 1: Original detected beats only (no interpolation)
const detectedBeats = interpolated.detectedBeats;
console.log(`Original detected: ${detectedBeats.length} beats`);

// Stream 2: Merged beats (interpolated + detected override)
const mergedBeats = interpolated.mergedBeats;
console.log(`Merged total: ${mergedBeats.length} beats`);

// Each merged beat has a source field
mergedBeats.forEach(beat => {
  if (beat.source === 'detected') {
    console.log(`[${beat.timestamp.toFixed(2)}s] Detected beat (confidence: ${beat.confidence.toFixed(2)})`);
  } else {
    console.log(`[${beat.timestamp.toFixed(2)}s] Interpolated beat (distance to anchor: ${beat.distanceToAnchor?.toFixed(2)}s)`);
  }
});
```

#### Using Merged Beats with BeatStream

You can use interpolated beats directly with BeatStream:

```typescript
import { AudioAnalyzer, BeatStream } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();

// Generate interpolated beat map
const interpolated = await analyzer.generateBeatMapWithInterpolation(
  'song.mp3',
  'track-001'
);

// Create BeatStream with interpolated beats
const beatStream = analyzer.createBeatStream(interpolated, audioContext, {
  useInterpolatedBeats: true,  // Use mergedBeats instead of detectedBeats
  anticipationTime: 2.0,
});

// Subscribe to beat events (now includes interpolated beats)
beatStream.subscribe((event) => {
  console.log(`Beat at ${event.beat.timestamp}s (source: ${(event.beat as any).source || 'detected'})`);
});

beatStream.start();
```

---

### Customizing Options

Fine-tune interpolation behavior with these options:

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

const interpolated = analyzer.interpolateBeatMap(beatMap, {
  // Anchor filtering - beats below this confidence aren't used as anchors
  minAnchorConfidence: 0.3,

  // Grid snapping - how close a detected beat must be to override (seconds)
  gridSnapTolerance: 0.05,

  // Tempo adaptation - how much to adjust tempo at each anchor (0=fixed, 1=full)
  tempoAdaptationRate: 0.3,

  // Extrapolation - extend grid before first/after last detected beat
  extrapolateStart: true,
  extrapolateEnd: true,

  // Anomaly detection - multiplier for detecting unusual intervals
  anomalyThreshold: 0.4,

  // Dense section threshold - minimum beats to establish pace
  denseSectionMinBeats: 3,

  // Confidence weights (must sum to 1.0)
  gridAlignmentWeight: 0.5,    // How well anchors align to grid
  anchorConfidenceWeight: 0.3, // Average confidence of bounding anchors
  paceConfidenceWeight: 0.2,   // Quarter note detection confidence
});

// Access interpolation metadata
const meta = interpolated.interpolationMetadata;
console.log(`Detected: ${meta.detectedBeatCount}`);
console.log(`Interpolated: ${meta.interpolatedBeatCount}`);
console.log(`Interpolation ratio: ${(meta.interpolationRatio * 100).toFixed(1)}%`);
console.log(`Avg interpolated confidence: ${meta.avgInterpolatedConfidence.toFixed(2)}`);
console.log(`Tempo drift ratio: ${meta.tempoDriftRatio.toFixed(2)}`);
```

#### Option Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minAnchorConfidence` | `number` | `0.3` | Minimum confidence to be an anchor |
| `gridSnapTolerance` | `number` | `0.05` | Seconds tolerance for grid snapping |
| `tempoAdaptationRate` | `number` | `0.3` | Tempo drift adaptation (0-1) |
| `extrapolateStart` | `boolean` | `true` | Extrapolate before first beat |
| `extrapolateEnd` | `boolean` | `true` | Extrapolate after last beat |
| `anomalyThreshold` | `number` | `0.4` | Anomaly detection multiplier |
| `denseSectionMinBeats` | `number` | `3` | Min beats for dense section |
| `gridAlignmentWeight` | `number` | `0.5` | Grid alignment confidence weight |
| `anchorConfidenceWeight` | `number` | `0.3` | Anchor confidence weight |
| `paceConfidenceWeight` | `number` | `0.2` | Pace confidence weight |

---

### Serialization

Save and load interpolated beat maps:

```typescript
import { AudioAnalyzer, BeatInterpolator } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const interpolated = await analyzer.generateBeatMapWithInterpolation(
  'song.mp3',
  'track-001'
);

// Serialize to JSON
const jsonString = BeatInterpolator.toJSON(interpolated);

// Save to file (Node.js)
// await fs.writeFile('./beatmaps/track-001-interpolated.json', jsonString);

// Load from JSON
const loaded = BeatInterpolator.fromJSON(jsonString);

console.log(`Loaded ${loaded.mergedBeats.length} beats`);
```

---

### How It Works

#### Quarter Note Detection (Dense Section Priority)

The quarter note interval is determined by analyzing intervals between detected beats, with **higher weight given to dense sections** (where beats are detected consistently):

1. Identify dense sections (3+ consecutive beats at similar intervals)
2. Build a weighted histogram of all intervals
3. Weight intervals by density, consistency, and confidence
4. The histogram peak becomes the quarter note

#### Gap Analysis

After quarter note detection, the system analyzes gaps:
- **Half-note gaps** (2× quarter note): Interpolate 1 beat in between
- **Longer gaps**: Interpolate N-1 beats to fill
- **Anomalies**: Single unusual intervals are ignored (likely false positives)

#### Confidence Model

Interpolated beat confidence is calculated from three factors:
- **Grid alignment (50%)**: How well surrounding anchors align to the grid
- **Anchor confidence (30%)**: Average confidence of bounding detected beats
- **Pace confidence (20%)**: Confidence in the quarter note detection

All interpolated beats in a validated gap have **equal confidence** (no decay based on distance).

---

### When to Use Beat Interpolation

| Use Case | Recommended |
|----------|-------------|
| Rhythm games needing complete beat grid | ✅ Yes |
| Silent sections in songs | ✅ Yes |
| Sparse beat detection | ✅ Yes |
| Visualization with beat-synchronized effects | ✅ Yes |
| Original beat detection quality | ❌ Use `detectedBeats` |
| Songs with sudden tempo changes | ✅ Use `enableMultiTempo` |

---

### Multi-Tempo Detection

For tracks with **sudden tempo changes** (e.g., a track that jumps from 128 BPM to 140 BPM), enable multi-tempo detection. This feature identifies distinct tempo sections and handles them separately.

> **⚠️ Important**: This feature is **conservative by design**. It only activates when there's undeniable evidence of a sudden tempo change. The default is ALWAYS gradual drift, which works for 99% of tracks.

#### When Multi-Tempo Activates

**All three conditions must be true:**

1. **2+ valid tempo clusters exist** — Each cluster needs 4+ consecutive detected beats at a consistent tempo
2. **Clusters have >10% tempo difference** — Configurable via `tempoSectionThreshold`
3. **Crossing point check fails** — Drift-based interpolation cannot bridge the gap between clusters

If any condition is false, the feature does nothing and lets gradual drift handle it naturally.

#### Basic Usage

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const beatMap = await analyzer.generateBeatMap('song-with-tempo-change.mp3', 'track-001');

// First, check if multi-tempo was detected
const interpolated = analyzer.interpolateBeatMap(beatMap);
console.log(`Has multiple tempos: ${interpolated.interpolationMetadata.hasMultipleTempos}`);
console.log(`Detected tempos: ${interpolated.interpolationMetadata.detectedClusterTempos}`);

// If multi-tempo detected, re-analyze with it enabled
if (interpolated.interpolationMetadata.hasMultipleTempos) {
  const multiTempoResult = analyzer.interpolateBeatMap(beatMap, {
    enableMultiTempo: true,
  });

  console.log(`Sections: ${multiTempoResult.interpolationMetadata.tempoSections?.length}`);
  multiTempoResult.interpolationMetadata.tempoSections?.forEach((section, i) => {
    console.log(`Section ${i + 1}: ${section.bpm} BPM (${section.start}s - ${section.end}s)`);
  });
}
```

#### One-Pass Multi-Tempo

Alternatively, enable multi-tempo in a single pass:

```typescript
const analyzer = new AudioAnalyzer();
const interpolated = analyzer.interpolateBeatMap(beatMap, {
  enableMultiTempo: true,  // Will auto-apply if multiple tempos detected
});

// Check if multi-tempo was actually applied
if (interpolated.interpolationMetadata.hasMultiTempoApplied) {
  console.log('Multi-tempo analysis was applied');
}
```

#### The "Crossing Paths" Boundary Strategy

Multi-tempo uses a **crossing paths** strategy to determine section boundaries:

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

**Algorithm:**
1. Detect clusters at different tempos (endpoints)
2. Look at detected beats BETWEEN clusters (the evidence)
3. Interpolate forwards through connecting beats WITH drift
4. Interpolate backwards through connecting beats WITH drift
5. At crossing point, measure the gap
6. **If gap < threshold** → drift bridged it → single section
7. **If gap > threshold** → sudden jump → two sections with boundary

#### Gradual Drift vs Sudden Change

| Type | Cause | Detection |
|------|-------|-----------|
| **Gradual drift** | Beats slightly push/pull tempo over time | Forwards and backwards interpolation **meet** |
| **Hard section change** | Tempo jumped suddenly (not enough beats to drift) | Forwards and backwards interpolation **don't meet** |

Both types use the same drift-based interpolation. The difference is whether drift could bridge the gap.

#### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `tempoSectionThreshold` | `0.1` | Tempo difference threshold (10%) |
| `minClusterBeats` | `4` | Minimum beats for a valid tempo cluster |
| `enableMultiTempo` | `false` | Enable multi-tempo analysis |

```typescript
const interpolated = analyzer.interpolateBeatMap(beatMap, {
  enableMultiTempo: true,
  tempoSectionThreshold: 0.15,  // 15% threshold (more lenient)
  minClusterBeats: 6,           // Require 6 beats per cluster (stricter)
});
```

#### Octave Filtering

The system automatically filters out octave-related tempos (half/double). A 60 BPM section followed by a 120 BPM section is treated as the **same tempo**, not a section change.

#### Output Metadata

After multi-tempo analysis, the `interpolationMetadata` includes:

| Field | Description |
|-------|-------------|
| `detectedClusterTempos` | Array of detected tempos (e.g., `[128, 140]`) |
| `hasMultipleTempos` | `true` if 2+ tempos detected |
| `tempoSections` | Array of `TempoSection` objects with boundaries |
| `hasMultiTempoApplied` | `true` after multi-tempo re-analysis completes |

```typescript
interface TempoSection {
  start: number;          // Section start time in seconds
  end: number;            // Section end time in seconds
  bpm: number;            // Tempo for this section
  intervalSeconds: number; // Quarter note interval
  beatCount: number;      // Detected beats in this section
  startBeatIndex: number; // Index of first beat
  endBeatIndex: number;   // Index of last beat
}
```

---

## Beat Subdivision

Beat subdivision transforms a quarter-note beat grid into various rhythmic patterns (half notes, eighth notes, triplets, etc.). This enables rhythm game level creation by allowing dynamic subdivision changes at specific beat positions.

### Overview

The subdivision system operates on a `UnifiedBeatMap` (created from an `InterpolatedBeatMap`) and produces a `SubdividedBeatMap` with the requested rhythmic pattern.

**Processing Pipeline:**

```
┌─────────────┐     ┌──────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  BeatMap    │ ──▶ │  InterpolatedBeatMap │ ──▶ │  UnifiedBeatMap  │ ──▶ │  SubdividedBeatMap  │
│ (detected)  │     │ (detected + interp.) │     │ (flattened QN)   │     │ (rhythm patterns)   │
└─────────────┘     └──────────────────────┘     └──────────────────┘     └─────────────────────┘
```

### Source Files

| Component | Location |
|-----------|----------|
| **BeatSubdivider** | [src/core/analysis/beat/BeatSubdivider.ts](../src/core/analysis/beat/BeatSubdivider.ts) |
| **unifyBeatMap** | [src/core/analysis/beat/utils/unifyBeatMap.ts](../src/core/analysis/beat/utils/unifyBeatMap.ts) |
| **subdivideBeatMap** | [src/core/analysis/beat/utils/subdivideBeatMap.ts](../src/core/analysis/beat/utils/subdivideBeatMap.ts) |
| **Subdivision Types** | [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts) |

---

### Subdivision Types

| Type | Density | Description | beatInMeasure Labels |
|------|---------|-------------|---------------------|
| `quarter` | 1x | Default, unchanged | 0, 1, 2, 3 |
| `half` | 0.5x | Beats on 1 and 3 only | 0, 2, 4, 6 |
| `eighth` | 2x | Beat between each quarter | 0, 0.5, 1, 1.5, 2, 2.5... |
| `sixteenth` | 4x | Maximum density (hard limit) | 0, 0.25, 0.5, 0.75, 1... |
| `triplet8` | 3x | Eighth triplets (3 per quarter) | 0, 0.33, 0.66, 1, 1.33... |
| `triplet4` | 1.5x | Quarter triplets (3 per 2 beats, 2-beat structure) | 0, 0.66, 1.33, 2, 2.66... |
| `dotted4` | 0.67x | Dotted quarter (2/3 density, 2-beat structure with interp at 0.5) | 0, 0.5, 2, 2.5, 4, 4.5... |
| `dotted8` | 2x | Dotted eighth (3/4 + 1/4 pattern) | 0, 0.75, 1, 1.75, 2... |
| `swing` | 2x | Swing feel (2/3 + 1/3 pattern) | 0, 0.667, 1, 1.667, 2... |
| `offbeat8` | 1x | Offbeat eighth (8th rest + 8th note, skips downbeat) | 0.5, 1.5, 2.5, 3.5... |
| `rest` | 0x | No beat generated (creates gaps) | N/A |

**Note:** Sixteenth notes (4x) are the **maximum supported density**. Higher densities are not supported.

**2-Beat Structure Types:** `triplet4` and `dotted4` are 2-beat structures that only process beats at even `beatInMeasure` positions (0, 2, 4, 6...). This allows proper triplet and dotted patterns across beat pairs.

---

### Basic Usage

#### One-Step Subdivision

The simplest way to subdivide a beat map:

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Generate and interpolate beat map
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');
const interpolated = analyzer.interpolateBeatMap(beatMap);

// Subdivide with default config (quarter notes)
const subdivided = analyzer.subdivideBeatMap(interpolated);

console.log(`Original beats: ${interpolated.mergedBeats.length}`);
console.log(`Subdivided beats: ${subdivided.beats.length}`);
console.log(`Density multiplier: ${subdivided.subdivisionMetadata.averageDensityMultiplier}`);
```

#### Custom Subdivision Configuration

Use per-beat configuration for fine-grained control over rhythm patterns:

```typescript
import { AudioAnalyzer, type SubdivisionConfig } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const interpolated = await analyzer.generateBeatMapWithInterpolation('song.mp3', 'track-001');

// Create a rhythm phrase with varying subdivisions per beat
const subdivisionConfig: SubdivisionConfig = {
  beatSubdivisions: new Map([
    // Intro (beats 0-31): quarter notes
    ...Array.from({ length: 32 }, (_, i) => [i, 'quarter'] as const),

    // Verse (beats 32-95): eighth notes
    ...Array.from({ length: 64 }, (_, i) => [32 + i, 'eighth'] as const),

    // Bridge (beats 96-127): half notes
    ...Array.from({ length: 32 }, (_, i) => [96 + i, 'half'] as const),

    // Solo (beats 128+): triplets
    ...Array.from({ length: 32 }, (_, i) => [128 + i, 'triplet8'] as const),
  ]),
  defaultSubdivision: 'quarter',
};

const subdivided = analyzer.subdivideBeatMap(interpolated, subdivisionConfig);
```

---

### Using BeatSubdivider Directly

For more control, use the `BeatSubdivider` class directly:

```typescript
import {
  BeatMapGenerator,
  BeatInterpolator,
  BeatSubdivider,
  unifyBeatMap,
  type SubdivisionConfig
} from 'playlist-data-engine';

const generator = new BeatMapGenerator();
const interpolator = new BeatInterpolator();
const subdivider = new BeatSubdivider({
  tolerance: 0.02,          // 20ms tolerance for detected beat alignment
  defaultIntensity: 0.5,    // Intensity for generated beats
  defaultConfidence: 0.7,   // Confidence for generated beats
});

// Step 1: Generate beat map
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Step 2: Interpolate to fill gaps
const interpolatedMap = interpolator.interpolate(beatMap);

// Step 3: Unify into quarter-note grid
const unifiedMap = unifyBeatMap(interpolatedMap);

// Step 4: Create per-beat subdivision configuration
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([
    [0, 'eighth'],   // Beat 0 gets eighth notes
    [1, 'eighth'],   // Beat 1 gets eighth notes
    [2, 'quarter'],  // Beat 2 gets quarter notes
    [3, 'quarter'],  // Beat 3 gets quarter notes
  ]),
  defaultSubdivision: 'quarter',  // Default for unassigned beats
};

const subdividedMap = subdivider.subdivide(unifiedMap, config);

console.log(`Original: ${unifiedMap.beats.length} beats`);
console.log(`Subdivided: ${subdividedMap.beats.length} beats`);
console.log(`Subdivisions used: ${subdividedMap.subdivisionMetadata.subdivisionsUsed.join(', ')}`);
```

---

### Subdivision Types Explained

Each subdivision type can be assigned to individual beats using the `SubdivisionConfig`:

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'eighth']]),  // Beat 0 gets eighth notes
  defaultSubdivision: 'quarter',               // All other beats
};
```

#### Subdivision Results

| Type | Density | From `0, 1, 2, 3...` | Notes |
|------|---------|---------------------|-------|
| `quarter` | 1x | `0, 1, 2, 3` | Default, unchanged |
| `half` | 0.5x | `0, 2, 4, 6` | Downbeats and beat 3s only |
| `eighth` | 2x | `0, 0.5, 1, 1.5, 2...` | Midpoint between quarters |
| `sixteenth` | 4x | `0, 0.25, 0.5, 0.75, 1...` | **Maximum density** |
| `triplet8` | 3x | `0, 0.33, 0.66, 1, 1.33...` | 3 beats per quarter |
| `triplet4` | 1.5x | `0, 0.66, 1, 1.66, 2...` | 3 beats per half note |
| `dotted4` | 0.67x | `0, 1.5, 3, 4.5, 6...` | Cross-rhythm, ignores measure boundaries |
| `dotted8` | 2x | `0, 0.667, 1, 1.667...` | Swing feel (long-short pattern) |
| `swing` | 2x | `0, 0.667, 1, 1.667...` | Same as dotted8 |

#### Rest (Creating Gaps)

The `rest` type creates gaps in rhythm patterns - useful for syncopation or dramatic pauses:

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([
    [0, 'quarter'],   // Beat 0: quarter note
    [1, 'rest'],      // Beat 1: no beat (rest)
    [2, 'eighth'],    // Beat 2: eighth notes
    [3, 'rest'],      // Beat 3: no beat (rest)
  ]),
  defaultSubdivision: 'quarter',
};
// Creates a "hit, rest, hit-hit, rest" pattern
```

---

### Beat Label System (Decimal)

In a `SubdividedBeat`, the `beatInMeasure` property uses **decimal values** to represent positions between quarter notes:

| Subdivision | Example Labels |
|-------------|----------------|
| quarter | 0, 1, 2, 3 |
| eighth | 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5 |
| sixteenth | 0, 0.25, 0.5, 0.75, 1, 1.25... |
| triplet8 | 0, 0.33, 0.66, 1, 1.33, 1.66... |

**Note:** The base `Beat` interface uses integer `beatInMeasure` values. Only `SubdividedBeat` uses decimal values.

---

### Detected Beat Preservation

Each `SubdividedBeat` has an `isDetected` flag indicating whether it was originally detected (vs interpolated or generated by subdivision):

```typescript
const subdivided = analyzer.subdivideBeatMap(interpolated);

// Get originally detected beats for accent patterns
const detectedBeats = subdivided.beats.filter(b => b.isDetected);
console.log(`Detected beats: ${detectedBeats.length}`);

// Use detectedBeatIndices for quick lookup
console.log(`Detected indices: ${subdivided.detectedBeatIndices}`);
```

**Behavior by Subdivision Type:**
- **Half notes**: Detected beats not on positions 0/2 are removed
- **Eighth/Sixteenth**: New beats are NOT marked as detected
- **Triplets/Dotted**: Generated beats aligned close to detected beats may be marked

---

### Tempo-Aware Subdivision

When the `UnifiedBeatMap` contains multiple tempo sections (from multi-tempo interpolation), subdivision is automatically tempo-aware:

```typescript
// Enable multi-tempo detection during interpolation
const interpolated = analyzer.interpolateBeatMap(beatMap, {
  enableMultiTempo: true,
});

// Subdivision uses correct intervals for each tempo section
const subdivided = analyzer.subdivideBeatMap(interpolated, {
  beatSubdivisions: new Map(),
  defaultSubdivision: 'eighth',
});

// Check if multiple tempos were detected
console.log(`Has multiple tempos: ${subdivided.subdivisionMetadata.hasMultipleTempos}`);
```

---

### Validation

Validate subdivision configuration before use:

```typescript
import {
  validateSubdivisionConfig,
  validateSubdivisionConfigAgainstBeats,
  validateSubdivisionDensity,
} from 'playlist-data-engine';

// Structural validation
try {
  validateSubdivisionConfig(config);
} catch (e) {
  console.error('Invalid config:', e.message);
}

// Validate against beat count
try {
  validateSubdivisionConfigAgainstBeats(config, totalBeats);
} catch (e) {
  console.error('Config exceeds beat count:', e.message);
}

// Validate density (throws if > 4x)
try {
  validateSubdivisionDensity('sixteenth');  // OK
  validateSubdivisionDensity('thirtysecond'); // Throws - not supported
} catch (e) {
  console.error('Invalid density:', e.message);
}
```

---

### Types Reference

#### SubdivisionType

```typescript
type SubdivisionType =
  | 'quarter'    // 1x density (no change)
  | 'half'       // 0.5x density (beats 1 and 3)
  | 'eighth'     // 2x density
  | 'sixteenth'  // 4x density (MAXIMUM)
  | 'triplet8'   // 3x density - 3 beats per quarter (eighth triplets)
  | 'triplet4'   // 1.5x density - 3 beats per 2 quarters (quarter triplets, 2-beat structure)
  | 'dotted4'    // 0.67x density - 2-beat structure with original at 0 and interpolated at 0.5
  | 'dotted8'    // 2x density - Dotted eighth pattern (3/4 + 1/4)
  | 'swing'      // 2x density - Swing feel (2/3 + 1/3 pattern)
  | 'offbeat8'   // 1x density - Offbeat eighth (8th rest + 8th note, skips downbeat)
  | 'rest';      // No beat generated (creates gaps)
```

#### SubdivisionConfig

Configuration for per-beat subdivision. Each beat can have its own subdivision type for fine-grained rhythmic control.

```typescript
interface SubdivisionConfig {
  /**
   * Subdivision type for each beat index (sparse map).
   * Beats not in this map use the defaultSubdivision.
   */
  beatSubdivisions: Map<number, SubdivisionType>;

  /** Default subdivision for beats not explicitly assigned */
  defaultSubdivision: SubdivisionType;
}
```

**Example:**

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([
    [0, 'quarter'],   // Beat 0: quarter note
    [1, 'eighth'],    // Beat 1: eighth notes
    [2, 'eighth'],    // Beat 2: eighth notes
    [3, 'quarter'],   // Beat 3: quarter note
  ]),
  defaultSubdivision: 'quarter',  // All other beats
};
```

#### SubdividedBeat

```typescript
interface SubdividedBeat extends Beat {
  /** Position within the measure as a decimal (e.g., 0.5 for the "and" of beat 1) */
  beatInMeasure: number;

  /** Whether this beat was originally detected */
  isDetected: boolean;

  /** Index of the original beat in the UnifiedBeatMap */
  originalBeatIndex?: number;

  /** The subdivision type that created this beat */
  subdivisionType: SubdivisionType;
}
```

#### SubdividedBeatMap

```typescript
interface SubdividedBeatMap {
  audioId: string;
  duration: number;
  beats: SubdividedBeat[];
  detectedBeatIndices: number[];
  subdivisionConfig: SubdivisionConfig;
  downbeatConfig: DownbeatConfig;
  tempoSections?: TempoSection[];
  subdivisionMetadata: SubdivisionMetadata;
}
```

#### SubdivisionMetadata

```typescript
interface SubdivisionMetadata {
  /** Number of beats in the original unified map */
  originalBeatCount: number;

  /** Number of beats after subdivision */
  subdividedBeatCount: number;

  /** Overall density multiplier (2.0 = twice as many beats) */
  averageDensityMultiplier: number;

  /** Number of beats with explicit non-default subdivision */
  explicitBeatCount: number;

  /** Subdivision types used */
  subdivisionsUsed: SubdivisionType[];

  /** Whether the track has multiple tempo sections */
  hasMultipleTempos: boolean;

  /** Maximum density encountered */
  maxDensity: number;
}
```

#### BeatSubdividerOptions

```typescript
interface BeatSubdividerOptions {
  /** Tolerance for aligning beats to detected beats (default: 0.02 = 20ms) */
  tolerance?: number;

  /** Default intensity for generated beats (default: 0.5) */
  defaultIntensity?: number;

  /** Default confidence for generated beats (default: 0.7) */
  defaultConfidence?: number;
}
```

---

### Classes

#### BeatSubdivider

Transforms quarter-note beat grids into various rhythmic subdivisions.

**Source**: [src/core/analysis/beat/BeatSubdivider.ts](../src/core/analysis/beat/BeatSubdivider.ts)

##### Constructor

```typescript
new BeatSubdivider(options?: BeatSubdividerOptions)
```

##### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subdivide` | `unifiedMap: UnifiedBeatMap`, `config?: SubdivisionConfig` | `SubdividedBeatMap` | Subdivide according to configuration |

---

### Utility Functions

#### unifyBeatMap

Converts an `InterpolatedBeatMap` to a `UnifiedBeatMap`:

```typescript
import { unifyBeatMap } from 'playlist-data-engine';

const unifiedMap = unifyBeatMap(interpolatedMap);
```

#### subdivideBeatMap

Convenience function that unifies then subdivides in one step:

```typescript
import { subdivideBeatMap } from 'playlist-data-engine';

const subdividedMap = subdivideBeatMap(interpolatedMap, config);
```

---

### When to Use Beat Subdivision

| Use Case | Recommended |
|----------|-------------|
| Rhythm game level creation | ✅ Yes |
| Dynamic difficulty patterns | ✅ Yes |
| Swing/triplet feel | ✅ Yes |
| Practice mode with changing tempos | ✅ Yes |
| Simple beat visualization | ❌ Use UnifiedBeatMap directly |

---

### Using SubdividedBeatMap with BeatStream

The `BeatStream` class accepts `SubdividedBeatMap` directly, allowing you to stream beat events from subdivided beats:

```typescript
import {
  BeatMapGenerator,
  BeatInterpolator,
  BeatStream,
  unifyBeatMap,
  subdivideBeatMap
} from 'playlist-data-engine';

// Generate and process beat map
const generator = new BeatMapGenerator();
const interpolator = new BeatInterpolator();

const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const interpolatedMap = interpolator.interpolate(beatMap);

// Subdivide to eighth notes
const subdividedMap = subdivideBeatMap(interpolatedMap, {
  beatSubdivisions: new Map(),
  defaultSubdivision: 'eighth',
});

// Create BeatStream from SubdividedBeatMap
const audioContext = new AudioContext();
const beatStream = new BeatStream(subdividedMap, audioContext, {
  anticipationTime: 2.0,
  difficultyPreset: 'medium'
});

// Subscribe to beat events (includes all subdivided beats)
beatStream.subscribe((event) => {
  if (event.type === 'exact') {
    console.log(`Beat at ${event.beat.timestamp}s`);
    // Access subdivision-specific properties
    const subdividedBeat = event.beat;
    console.log(`Subdivision: ${subdividedBeat.subdivisionType}`);
    console.log(`Is detected: ${subdividedBeat.isDetected}`);
  }
});

beatStream.start();
```

**Key Points:**

- `BeatStream` automatically detects `SubdividedBeatMap` and uses the subdivided beats
- The `subdivisionType` and `isDetected` properties are preserved on each beat
- BPM is calculated from the subdivided beat intervals
- Works with all subdivision types (quarter, half, eighth, sixteenth, triplets, dotted)

**Changing Beat Maps:**

You can switch between different subdivision configurations during runtime:

```typescript
// Start with quarter notes
const quarterMap = subdivideBeatMap(interpolatedMap, {
  beatSubdivisions: new Map(),
  defaultSubdivision: 'quarter',
});
const stream = new BeatStream(quarterMap, audioContext);
stream.start();

// Later, switch to eighth notes
const eighthMap = subdivideBeatMap(interpolatedMap, {
  beatSubdivisions: new Map(),
  defaultSubdivision: 'eighth',
});
stream.setBeatMap(eighthMap);
```

---

## Real-Time Subdivision Playground (Practice Mode)

A separate feature from the pre-calculated SubdividedBeatMap, the Real-Time Subdivision Playground enables instant subdivision switching during playback for practice mode. Users can start with quarter notes and instantly switch to eighth notes (or any subdivision) while practicing.

### Key Distinction

| Feature | SubdividedBeatMap | Real-Time Playground |
|---------|-------------------|---------------------|
| Purpose | Level creation | Practice mode |
| Timing | Pre-calculated | Generated on-the-fly |
| Storage | Saved with level | Not stored |
| Switching | Via config segments | Via button click during playback |
| Complexity | Lower (static) | Higher (dynamic) |

### Source Files

| Component | Location |
|-----------|----------|
| **SubdivisionPlaybackController** | [src/core/playback/SubdivisionPlaybackController.ts](../src/core/playback/SubdivisionPlaybackController.ts) |

---

### Basic Usage

Create a real-time controller for practice mode:

```typescript
import {
  BeatMapGenerator,
  BeatInterpolator,
  unifyBeatMap,
  SubdivisionPlaybackController
} from 'playlist-data-engine';

// Generate and unify (done once)
const generator = new BeatMapGenerator();
const interpolator = new BeatInterpolator();

const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const interpolatedMap = interpolator.interpolate(beatMap);
const unifiedMap = unifyBeatMap(interpolatedMap);

// Create real-time controller for practice mode
const audioContext = new AudioContext();
const controller = new SubdivisionPlaybackController(
  unifiedMap,
  audioContext,
  {
    initialSubdivision: 'quarter',
    transitionMode: 'next-downbeat',
    onSubdivisionChange: (oldType, newType) => {
      console.log(`Switched from ${oldType} to ${newType}`);
    },
  }
);

// Subscribe to beat events
const unsubscribe = controller.subscribe((event) => {
  if (event.type === 'upcoming') {
    console.log(`Beat approaching in ${event.timeUntilBeat}s`);
  } else if (event.type === 'exact') {
    console.log('Beat!', event.beat);
  }
});

// Start playback
controller.play();
```

---

### Real-Time Subdivision Switching

```typescript
// Switch subdivision during playback
controller.setSubdivision('eighth');   // 2x density
controller.setSubdivision('half');     // 0.5x density
controller.setSubdivision('quarter');  // back to normal
```

---

### Transition Modes

The `transitionMode` option controls how subdivision changes are applied:

| Mode | Behavior |
|------|----------|
| `'immediate'` | Switch instantly at the current position |
| `'next-downbeat'` | Wait for the next downbeat before switching |
| `'next-measure'` | Wait for the next measure before switching |

```typescript
// Immediate mode - switches right away
const immediateController = new SubdivisionPlaybackController(
  unifiedMap,
  audioContext,
  { transitionMode: 'immediate' }
);

// Next-downbeat mode - waits for beat 1 ofconst downbeatController = new SubdivisionPlaybackController(
  unifiedMap,
  audioContext,
  { transitionMode: 'next-downbeat' }
);

// Next-measure mode - waits for start of next measure
const measureController = new SubdivisionPlaybackController(
  unifiedMap,
  audioContext,
  { transitionMode: 'next-measure' }
);
```

---

### Playback Control

Control playback with standard methods

```typescript
// Start playback
controller.play();

// Pause playback
controller.pause();

// Resume playback
controller.resume();

// Stop playback (resets position)
controller.stop();

// Seek to a specific time
controller.seek(30.5);  // Jump to 30.5 seconds

// Get current state
console.log('Running:', controller.isRunning());
console.log('Paused:', controller.isPaused());
console.log('Current time:', controller.getCurrentTime());
console.log('Duration:', controller.getDuration());
```

---

### Beat Query Methods

Get beats for display or analysis

```typescript
// Get beats in a time range
const beats = controller.getBeatsInRange(10, 15);
console.log(`Beats between 10s and 15s: ${beats.length}`);

// Get upcoming beats for pre-rendering
const upcomingBeats = controller.getUpcomingBeats(5);
console.log(`Next 5 beats:`, upcomingBeats);

// Get beat at specific time
const beat = controller.getBeatAtTime(12.5);
if (beat) {
  console.log('Beat at 12.5s:', beat);
}

// Get current beat (most recently passed)
const currentBeat = controller.getCurrentBeat();

// Get next beat
const nextBeat = controller.getNextBeat();
```

---

### Options Interface

#### SubdivisionPlaybackOptions

```typescript
interface SubdivisionPlaybackOptions {
  /** Starting subdivision type (default: 'quarter') */
  initialSubdivision?: SubdivisionType;

  /** How to handle subdivision changes (default: 'immediate') */
  transitionMode?: 'immediate' | 'next-downbeat' | 'next-measure';

  /** Callback when subdivision changes */
  onSubdivisionChange?: (oldType: SubdivisionType, newType: SubdivisionType) => void;

  /** Anticipation time for beat events in seconds (default: 2.0) */
  anticipationTime?: number;

  /** Timing tolerance for beat event detection in seconds (default: 0.01) */
  timingTolerance?: number;

  /** User-calibrated offset in milliseconds (default: 0) */
  userOffsetMs?: number;

  /** Whether to compensate for output latency (default: true) */
  compensateOutputLatency?: boolean;
}
```

---

### Event Types

#### SubdivisionBeatEvent

```typescript
interface SubdivisionBeatEvent {
  /** The beat that triggered this event */
  beat: SubdividedBeat;

  /** Current subdivision type */
  currentSubdivision: SubdivisionType;

  /** Audio context time when event was emitted */
  audioTime: number;

  /** Time until the beat (negative if passed) */
  timeUntilBeat: number;

  /** Type of event: 'upcoming', 'exact', or 'passed' */
  type: BeatEventType;
}
```

#### BeatEventType

| Type | When | Use Case |
|------|------|----------|
| `'upcoming'` | Beat is within `anticipationTime` | Pre-render visuals, prepare animations |
| `'exact'` | Beat time is reached (within tolerance) | Trigger sounds, haptics |
| `'passed'` | Beat time has passed | Clean up, logging |

```typescript
type BeatEventType = 'upcoming' | 'exact' | 'passed';
```

#### SubdivisionCallback

```typescript
type SubdivisionCallback = (event: SubdivisionBeatEvent) => void;
```

---

### SubdivisionPlaybackController Class

**Source**: [src/core/playback/SubdivisionPlaybackController.ts](../src/core/playback/SubdivisionPlaybackController.ts)

#### Constructor

```typescript
new SubdivisionPlaybackController(
  unifiedMap: UnifiedBeatMap,
  audioContext: AudioContext,
  options?: SubdivisionPlaybackOptions
)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `subdivision` | `SubdivisionType` | Current subdivision type (read-only) |
| `beatMap` | `UnifiedBeatMap` | The unified beat map (read-only) |

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `subscribe` | `callback: SubdivisionCallback` | `() => void` | Subscribe to beat events, returns unsubscribe function |
| `setSubdivision` | `type: SubdivisionType` | `void` | Change subdivision in real-time |
| `setTransitionMode` | `mode: SubdivisionTransitionMode` | `void` | Change transition mode during playback |
| `play` | - | `void` | Start streaming beat events |
| `pause` | - | `void` | Pause event emission, preserves position |
| `resume` | - | `void` | Resume from paused position |
| `stop` | - | `void` | Stop playback and reset state |
| `seek` | `time: number` | `void` | Jump to a specific time |
| `getBeatsInRange` | `startTime: number`, `endTime: number` | `SubdividedBeat[]` | Get beats in a time range |
| `getUpcomingBeats` | `count: number` | `SubdividedBeat[]` | Get upcoming beats within anticipation window |
| `getBeatAtTime` | `time: number` | `SubdividedBeat \| null` | Get beat at specific time |
| `getCurrentBeat` | - | `SubdividedBeat \| null` | Get current (most recent) beat |
| `getNextBeat` | - | `SubdividedBeat \| null` | Get next beat |
| `isRunning` | - | `boolean` | Check if playback is active |
| `isPaused` | - | `boolean` | Check if playback is paused |
| `getCurrentTime` | - | `number` | Get current playback position |
| `getDuration` | - | `number` | Get beat map duration |
| `getOptions` | - | `Required<SubdivisionPlaybackOptions>` | Get current options |
| `setBeatMap` | `unifiedMap: UnifiedBeatMap` | `void` | Update the beat map |
| `checkButtonPress` | `timestamp: number`, `thresholds?: AccuracyThresholds` | `ButtonPressResult` | Check tap accuracy against current subdivision's beats (no key matching, optional custom thresholds) |
| `dispose` | - | `void` | Clean up resources |

#### Runtime Transition Mode Changes

The `setTransitionMode` method allows changing how subdivision changes are applied during playback:

```typescript
// Runtime transition mode changes
controller.setTransitionMode('next-measure');
controller.setSubdivision('eighth'); // Will apply at next measure boundary

// Switch to immediate mode (applies any pending change right away)
controller.setTransitionMode('immediate');
```

---

## Groove Analysis

The GrooveAnalyzer is a "style meter" system that rewards **consistency in timing feel** rather than proximity to perfect center. Inspired by Devil May Cry's style meter, it's not about being mechanically perfect—it's about establishing and maintaining a consistent "pocket."

### Core Philosophy

| Timing Pattern | Traditional Scoring | GrooveAnalyzer |
|----------------|---------------------|----------------|
| Hit perfectly on beat | Perfect score | Neutral (no groove) |
| Hit consistently 30ms late | Imperfect score | **GOOD** (you're in a pocket) |
| Hit on beat after establishing late pocket | Perfect score | **BAD** (you broke the feel) |

The meter charges when you maintain consistency to **your established pocket**, not to absolute perfection.

### Source Files

| Component | Location |
|-----------|----------|
| **GrooveAnalyzer** | [src/core/analysis/beat/GrooveAnalyzer.ts](../src/core/analysis/beat/GrooveAnalyzer.ts) |
| **Groove Types** | [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts) |

---

### When to Use

Use GrooveAnalyzer during beat map playback for:

- **Practice/Learning Mode**: Help players develop consistent timing feel
- **Style Scoring**: Reward players who find and maintain a groove
- **Visual Feedback**: Display groove direction and intensity in real-time
- **Progress Tracking**: Track how well players maintain their pocket over time

**Not for**: Competitive scoring where absolute precision matters (use `BeatStream.checkButtonPress()` directly instead).

---

### The Two-Axis System

The groove meter has two quality dimensions:

#### Axis 1: Direction (Where's your pocket?)

| Direction | Meaning | Offset |
|-----------|---------|--------|
| `push` | Ahead of the beat | Negative (e.g., -30ms) |
| `pull` | Behind the beat | Positive (e.g., +30ms) |
| `neutral` | On the beat | Within ±10ms dead zone |

#### Axis 2: Intensity (How consistent?)

The groove meter uses a **tiered system** that allows hotness to exceed 100 for exceptional play. Higher tiers have tighter pocket windows, making it progressively harder to maintain your groove.

| Tier | Hotness Range | Window Size (120 BPM) | Description |
|------|---------------|----------------------|-------------|
| **D** | 0-33 | 31ms | Starting groove |
| **C** | 33-66 | 25ms | Building momentum |
| **B** | 66-100 | 20ms | Solid groove |
| **A** | 100-150 | 15ms | Locked in |
| **S** | 150-200 | 10ms | Exceptional |
| **SS** | 200-350 | 7ms | Legendary |
| **Platinum** | 350+ | 5ms | Godlike |

**Progressive Tightening**: As you climb tiers, the pocket window shrinks, requiring more precise consistency to maintain. The window continues to shrink even past 100 hotness.

**Uncapped Hotness**: Unlike the old system that capped at 100, hotness can now grow indefinitely. Each consistent hit adds +8 hotness, but the tighter windows at higher tiers make it increasingly difficult to maintain streaks.

---

### Basic Usage

```typescript
import {
  BeatMapGenerator,
  BeatInterpolator,
  unifyBeatMap,
  BeatStream,
  GrooveAnalyzer
} from 'playlist-data-engine';

// 1. Generate beat map (done once per song)
const generator = new BeatMapGenerator();
const interpolator = new BeatInterpolator();

const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
const interpolatedMap = interpolator.interpolate(beatMap);
const unifiedMap = unifyBeatMap(interpolatedMap);

// 2. Create BeatStream for timing and GrooveAnalyzer for feel
const audioContext = new AudioContext();
const beatStream = new BeatStream(unifiedMap, audioContext);
const grooveAnalyzer = new GrooveAnalyzer();

// 3. Start playback
beatStream.start();

// 4. On each button press during gameplay
function onButtonPress(timestamp: number) {
  // Check timing accuracy
  const buttonResult = beatStream.checkButtonPress(timestamp);

  // Analyze groove feel (offset + current BPM + accuracy)
  const grooveResult = grooveAnalyzer.recordHit(
    buttonResult.offset,
    beatStream.getCurrentBpm(),
    buttonResult.matchedBeat.time,  // Audio time from beat map (required)
    buttonResult.accuracy  // 'miss' or 'wrongKey' will decrease hotness (required)
  );

  // Use the results
  console.log(`Direction: ${grooveResult.pocketDirection}`);
  console.log(`Hotness: ${grooveResult.hotness}%`);
  console.log(`Consistency: ${grooveResult.consistency}`);
  console.log(`In Pocket: ${grooveResult.inPocket}`);
}

// 5. When user misses a beat (doesn't press)
function onMissedBeat() {
  const grooveResult = grooveAnalyzer.recordMiss();
  console.log(`Hotness dropped to: ${grooveResult.hotness}%`);
}
```

---

### GrooveAnalyzer Constructor

```typescript
new GrooveAnalyzer(options?: Partial<GrooveAnalyzerOptions>)
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minHitsForPocket` | `number` | `3` | Minimum hits to establish a pocket |
| `basePocketWindowFraction` | `number` | `0.03125` | Base window as fraction of beat (1/32 note) |
| `minPocketWindowSeconds` | `number` | `0.015` | Minimum window size (15ms floor) |
| `hotnessGainPerHit` | `number` | `8` | Hotness increase on consistent hit |
| `hotnessLossOnBreak` | `number` | `80` | Hotness decrease on pocket break |
| `hotnessLossOnMiss` | `number` | `80` | Hotness decrease on missed beat |
| `averagingWindowSize` | `number` | `4` | Recent hits to average for pocket |
| `neutralDeadZone` | `number` | `0.010` | Dead zone for neutral (±10ms) |

#### Custom Configuration Example

```typescript
const grooveAnalyzer = new GrooveAnalyzer({
  minHitsForPocket: 5,          // Require more hits to establish pocket
  hotnessGainPerHit: 10,        // Faster meter buildup
  hotnessLossOnBreak: 30,       // Harsher penalty for breaking pocket
  neutralDeadZone: 0.015,       // Larger neutral zone (±15ms)
});
```

---

### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `recordHit` | `offset: number`, `bpm: number`, `currentTime: number`, `accuracy: BeatAccuracy` | `GrooveResult` | Record a button press and get groove analysis. **Required:** Pass `currentTime` (from `buttonResult.matchedBeat.time`) for accurate groove duration tracking. **Required:** Pass `accuracy` from `buttonResult.accuracy` - when `'miss'` or `'wrongKey'`, hotness decreases instead of increasing it. |
| `recordMiss` | - | `GrooveResult` | Record a missed beat (reduces hotness, resets streak) |
| `getState` | - | `GrooveState` | Get current state snapshot |
| `getGrooveStats` | `currentAudioTime?: number` | `GrooveStats \| null` | Get groove statistics for end bonus calculation. Returns null if no groove was active. |
| `resetGrooveStats` | - | `void` | Reset groove lifetime tracking (called internally when groove ends) |
| `reset` | - | `void` | Clear all state and start fresh |
| `setDifficulty` | `options: { preset: DifficultyPreset, customPenalties?: Partial<GroovePenaltyConfig> }` | `void` | Set difficulty level for groove penalties. Updates `hotnessLossOnMiss` and `hotnessLossOnBreak` based on preset. |

---

### Difficulty Presets

Groove penalties can be adjusted based on difficulty level. Higher difficulties have more severe penalties for misses and wrong keys.

| Preset | `hotnessLossOnMiss` | `hotnessLossOnBreak` | Description |
|--------|---------------------|----------------------|-------------|
| `easy` | 50 | 50 | Forgiving for casual players |
| `medium` | 80 | 80 | Balanced difficulty |
| `hard` | 120 | 120 | Strict for veterans |
| `custom` | (varies) | (varies) | Use `customPenalties` parameter |

```typescript
// Set to hard difficulty
grooveAnalyzer.setDifficulty({ preset: 'hard' });

// Set to custom difficulty
grooveAnalyzer.setDifficulty({
    preset: 'custom',
    customPenalties: { hotnessLossOnMiss: 30, hotnessLossOnBreak: 25 }
});
```

**Related Exports:**

| Export | Description |
|--------|-------------|
| `EASY_GROOVE_PENALTIES` | Easy difficulty penalty config |
| `MEDIUM_GROOVE_PENALTIES` | Medium difficulty penalty config |
| `HARD_GROOVE_PENALTIES` | Hard difficulty penalty config |
| `GROOVE_PENALTY_PRESETS` | Map of preset names to penalty configs |
| `getGroovePenaltiesForPreset(preset, customPenalties?)` | Get penalty config for a preset |
| `GROOVE_TIERS` | Array of tier configurations (tier, minHotness, maxHotness, windowMs) |
| `getGrooveTier(hotness)` | Get groove tier for a hotness value |
| `getGrooveWindowMs(hotness)` | Get pocket window size in milliseconds for a hotness value |
| `getMinHotnessForTier(tier)` | Get minimum hotness required for a tier |

---

### Result Types

#### GrooveResult (from `recordHit` / `recordMiss`)

| Property | Type | Description |
|----------|------|-------------|
| `pocketDirection` | `GrooveDirection` | Current pocket direction ('push', 'pull', 'neutral') |
| `establishedOffset` | `number` | Running average offset in seconds (pocket center) |
| `consistency` | `number` | How close hit was to pocket (0-1, quadratic falloff) |
| `hotness` | `number` | Current meter value (0+, can exceed 100 for higher tiers) |
| `tier` | `GrooveTier` | Current groove tier ('D', 'C', 'B', 'A', 'S', or 'SS') |
| `streakLength` | `number` | Current streak of consistent hits |
| `inPocket` | `boolean` | Whether this hit was within pocket window |
| `pocketWindow` | `number` | Current window size in seconds |
| `endedGrooveStats` | `GrooveStats \| undefined` | Stats from groove that just ended (present when hotness drops to 0 or direction changes between push/pull/neutral). Use for groove end bonus XP. |

#### GrooveState (from `getState`)

| Property | Type | Description |
|----------|------|-------------|
| `pocketDirection` | `GrooveDirection` | Established pocket direction |
| `establishedOffset` | `number` | Running average offset in seconds |
| `hotness` | `number` | Current meter value (0+, can exceed 100 for higher tiers) |
| `tier` | `GrooveTier` | Current groove tier ('D', 'C', 'B', 'A', 'S', or 'SS') |
| `streakLength` | `number` | Current streak of consistent hits |
| `hitCount` | `number` | Total hits recorded this session |
| `pocketWindow` | `number` | Current window size in seconds |
| `grooveStartTime` | `number \| null` | When current groove started (audio time), null if no active groove |
| `grooveDuration` | `number` | Duration of current groove in seconds (0 if no active groove) |
| `maxHotness` | `number` | Peak hotness reached during current groove (0+) |
| `avgHotness` | `number` | Average hotness over groove lifetime (0+) |
| `grooveHitCount` | `number` | Total hits in current groove |

#### GrooveStats (from `getGrooveStats` / `endedGrooveStats`)

| Property | Type | Description |
|----------|------|-------------|
| `maxStreak` | `number` | Peak streak during the groove |
| `maxHotness` | `number` | Peak hotness reached (0+, can exceed 100) |
| `avgHotness` | `number` | Average hotness over groove lifetime (0+) |
| `duration` | `number` | How long the groove lasted in seconds |
| `totalHits` | `number` | Total hits in the groove |
| `startTime` | `number` | When groove started (audio time in seconds) |
| `endTime` | `number` | When groove ended (audio time in seconds) |

---

### Tier-Based Window Calculation

The pocket window is determined by the current groove tier, with BPM scaling applied:

```
windowMs = getGrooveWindowMs(hotness)  // Tier-based window
windowSeconds = windowMs / 1000
pocketWindow = windowSeconds × (120 / BPM)  // BPM scaling
```

| Tier | Hotness | Base Window | At 90 BPM | At 120 BPM | At 140 BPM |
|------|---------|-------------|-----------|------------|------------|
| D | 0-33 | 31ms | 41ms | 31ms | 27ms |
| C | 33-66 | 25ms | 33ms | 25ms | 21ms |
| B | 66-100 | 20ms | 27ms | 20ms | 17ms |
| A | 100-150 | 15ms | 20ms | 15ms | 13ms |
| S | 150-200 | 10ms | 13ms | 10ms | 9ms |
| SS | 200-350 | 7ms | 9ms | 7ms | 6ms |
| Platinum | 350+ | 5ms | 7ms | 5ms | 4ms |

**BPM Scaling**: Faster songs have proportionally smaller windows. The base window is calibrated for 120 BPM.

---

### Consistency Calculation (Quadratic Falloff)

Consistency uses quadratic falloff for a more forgiving feel near the pocket center:

| Distance from Center | Consistency |
|---------------------|-------------|
| 0% (at center) | 1.00 |
| 50% to edge | 0.75 |
| 70% to edge | 0.51 |
| 90% to edge | 0.19 |
| 100%+ (outside) | 0.00 |

Formula: `consistency = 1 - (normalizedDistance²)`

---

### Behavior Details

#### Pocket Establishment

- Requires 3 consistent hits (configurable via `minHitsForPocket`)
- Rolling average of last 4 hits determines pocket center
- Direction is determined from the average, not individual hits

#### Direction Changes

When timing drifts from one direction to another:

1. **No hard reset** — Rolling average naturally shifts
2. **Pocket follows** — Window center moves with the average
3. **Hotness affected** — During transition, hits may fall outside pocket
4. **Smooth feel** — More musical than hard resets

#### Missed Beats

- Hotness reduced by 10 (configurable, lighter than pocket break's 20)
- Streak resets to 0
- Established pocket is **NOT** cleared — groove can recover
- Frontend should call `recordMiss()` when user doesn't press on a beat

#### Breaking Pocket

- Hotness reduced by 20 (configurable)
- Streak **continues** (per design decision)
- Pocket center continues to adapt via rolling average

---

### UI Concept

```
┌─────────────────────────────────────────────────────────────────┐
│  GROOVE METER                                                    │
│                                                                 │
│     PUSH ←──────────[●]──────────→ PULL                        │
│                     ↑                                           │
│              Your pocket                                        │
│                                                                 │
│  Hotness: ████████████████████░░ 142                           │
│  Tier: A (Locked in!)                                           │
│  Streak:  18 hits                                               │
│  Consistency: 0.91                                              │
│                                                                 │
│  "Locked in behind the beat!"                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Tier Display

The `tier` field in `GrooveResult` and `GrooveState` provides the current groove tier:

```typescript
const grooveResult = grooveAnalyzer.recordHit(offset, bpm, currentTime, accuracy);

// Display tier in UI
console.log(`Tier: ${grooveResult.tier}`);  // 'D', 'C', 'B', 'A', 'S', 'SS', or 'Platinum'
console.log(`Hotness: ${grooveResult.hotness}`);  // Can exceed 100

// Tier-based styling
const tierColors = {
  D: '#888',   // Gray
  C: '#4a4',   // Green
  B: '#44f',   // Blue
  A: '#f4f',   // Purple
  S: '#f80',   // Orange
  SS: '#ff0',  // Gold
  Platinum: '#e5e4e2',  // Platinum
};
```

---

### Use Cases

| Use Case | Recommended |
|----------|-------------|
| Practice mode with feel feedback | ✅ Yes |
| Style-based scoring | ✅ Yes |
| Rhythm training tools | ✅ Yes |
| Visual groove indicators | ✅ Yes |
| Competitive precision scoring | ❌ Use BeatStream directly |

---

### Rhythm XP Integration

The GrooveAnalyzer integrates seamlessly with the `RhythmXPCalculator` to reward players with character XP based on their groove performance. See [XP_AND_STATS.md - Rhythm Game XP](XP_AND_STATS.md#rhythm-game-xp) for complete documentation.

#### How Groove Data Feeds XP

| Groove Data | XP System Usage |
|-------------|-----------------|
| `hotness` | Per-hit groove multiplier (optional mode) |
| `endedGrooveStats` | Groove end bonus calculation |
| `avgHotness` | Weighted bonus in groove end calculation |
| `maxStreak` | Weighted bonus in groove end calculation |
| `duration` | Weighted bonus in groove end calculation |

#### Groove End Bonus Flow

When a groove ends (hotness drops to 0 or direction changes between push/pull/neutral), the `endedGrooveStats` are immediately available:

```typescript
import { GrooveAnalyzer, RhythmXPCalculator, CharacterUpdater } from 'playlist-data-engine';

const grooveAnalyzer = new GrooveAnalyzer();
const rhythmXP = new RhythmXPCalculator();
const updater = new CharacterUpdater();

// During gameplay - on each button press
function onButtonPress(timestamp: number) {
  const buttonResult = beatStream.checkButtonPress(timestamp);

  // Pass the beat's audio time for accurate groove duration tracking
  const grooveResult = grooveAnalyzer.recordHit(
    buttonResult.offset,
    beatStream.getCurrentBpm(),
    buttonResult.matchedBeat?.time,  // Audio time from beat map
    buttonResult.accuracy  // Pass accuracy - miss/wrongKey will decrease hotness
  );

  // Check if groove ended - immediate bonus opportunity!
  if (grooveResult.endedGrooveStats) {
    const bonusResult = rhythmXP.calculateGrooveEndBonus(grooveResult.endedGrooveStats);
    console.log(`Groove ended! Bonus: ${bonusResult.bonusXP} XP`);
    // Add bonus to character
    // updater.addRhythmXP(character, bonusResult);
  }
}
```

#### Groove Reset Behavior

The groove (including streak AND lifetime tracking) resets when:
1. **Hotness drops to 0** - The groove has completely ended
2. **Pocket direction changes** (push ↔ neutral ↔ pull) - The player's timing shifted between ahead/behind/on-beat states. This includes:
   - Push → Neutral (playing settled from ahead to on-beat)
   - Neutral → Pull (playing drifted from on-beat to behind)
   - Push → Pull (direct transition, skipping neutral)
   - And all reverse transitions (Pull → Neutral, Neutral → Push, Pull → Push)

When the groove resets:
- `hotness` → 0
- `streakLength` → 0
- All lifetime stats captured in `endedGrooveStats` before reset
- Fresh tracking starts for the new groove

**Note:** ALL direction changes reset tracking, including transitions involving 'neutral'. This ensures the groove meter accurately reflects the player's current timing consistency.

---

## Procedural Rhythm Generation

The procedural rhythm generation system automatically creates interesting subdivision patterns from audio analysis. Unlike the manual subdivision system (which applies uniform patterns like "eighth notes"), procedural generation detects transients in the audio and generates rhythm patterns that match the music's actual rhythmic content.

### Overview

The system produces a `GeneratedRhythm` containing:
- **3 difficulty variants** (easy/medium/hard) of a composite rhythm stream
- **Individual band streams** (low/mid/high frequency bands) for advanced use
- **Analysis results** including transients, phrases, and density metrics

**Key Difference from Beat Detection**: Beat detection finds quarter note beats (the "pulse"). Transient detection finds individual note attacks (onsets) across all frequency bands. Transient detection is more granular and produces more events.

### Source Files

| Component | Location |
|-----------|----------|
| **RhythmGenerator** (orchestrator) | [src/core/generation/RhythmGenerator.ts](../src/core/generation/RhythmGenerator.ts) |
| **MultiBandAnalyzer** | [src/core/analysis/MultiBandAnalyzer.ts](../src/core/analysis/MultiBandAnalyzer.ts) |
| **TransientDetector** | [src/core/analysis/beat/TransientDetector.ts](../src/core/analysis/beat/TransientDetector.ts) |
| **RhythmQuantizer** | [src/core/analysis/beat/RhythmQuantizer.ts](../src/core/analysis/beat/RhythmQuantizer.ts) |
| **PhraseAnalyzer** | [src/core/analysis/beat/PhraseAnalyzer.ts](../src/core/analysis/beat/PhraseAnalyzer.ts) |
| **DensityAnalyzer** | [src/core/analysis/beat/DensityAnalyzer.ts](../src/core/analysis/beat/DensityAnalyzer.ts) |
| **StreamScorer** | [src/core/analysis/beat/StreamScorer.ts](../src/core/analysis/beat/StreamScorer.ts) |
| **CompositeStreamGenerator** | [src/core/analysis/beat/CompositeStreamGenerator.ts](../src/core/analysis/beat/CompositeStreamGenerator.ts) |
| **DifficultyVariantGenerator** | [src/core/analysis/beat/DifficultyVariantGenerator.ts](../src/core/analysis/beat/DifficultyVariantGenerator.ts) |

---

### Processing Pipeline

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ AudioBuffer │ ──▶ │ MultiBandAnalyzer │ ──▶ │ TransientDetector │
└─────────────┘     └──────────────────┘     └───────────────────┘
                                                    │
                                                    ▼
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│ GeneratedRhythm │ ◀── │ DifficultyVariant │ ◀── │ CompositeStream   │
│ (final output)  │     │ Generator         │     │ Generator         │
└─────────────────┘     └──────────────────┘     └───────────────────┘
                              ▲                        ▲
                              │                        │
                    ┌─────────────────┐     ┌─────────────────┐
                    │  StreamScorer   │ ◀── │  PhraseAnalyzer │
                    └─────────────────┘     │  DensityAnalyzer│
                                            └─────────────────┘
```

---

## Transient Detection

Transient detection (also known as *onset detection*) identifies the precise moments when notes begin in audio. Unlike beat detection which finds the quarter note pulse, transient detection captures every distinct attack across multiple frequency bands.

### Multi-Band Analysis Approach

The system splits audio into three frequency bands, each analyzed independently:

```
┌────────────────────────────────────────────────────────────────────┐
│                         Audio Signal                                │
└────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │   Low Band   │ │   Mid Band   │ │  High Band   │
            │  20-500 Hz   │ │ 500-2000 Hz  │ │ 2000-20000 Hz│
            │ (bass, kick) │ │(vocals,snare)│ │(hi-hats,cym) │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │    Energy    │ │ Spectral Flux│ │     HFC      │
            │  Detection   │ │  Detection   │ │  Detection   │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
                        ┌───────────────────┐
                        │ TransientAnalysis │
                        └───────────────────┘
```

### Frequency Bands Reference

| Band | Frequency Range | Typical Content | Detection Method |
|------|-----------------|-----------------|------------------|
| **Low** | 20-500 Hz | Bass, kick drums, sub frequencies | Energy-based |
| **Mid** | 500-2000 Hz | Vocals, snare body, lead instruments | Spectral Flux |
| **High** | 2000-20000 Hz | Hi-hats, cymbals, harmonics, air | HFC (High-Frequency Content) |

### Detection Strategies

#### 1. Energy-Based Detection (Low Band)

Best for detecting bass-heavy transients like kick drums.

**Algorithm**: Directly measures amplitude changes in the energy envelope.

```
Energy[n] = sum(samples[n-window:n+window]²)

Transient when: Energy[n] > threshold × local_average
```

**Why it works**: Kick drums and bass produce sharp amplitude increases that are clearly visible in the raw energy signal without needing spectral analysis.

#### 2. Spectral Flux (Mid Band)

Best for detecting harmonic instrument onsets and vocals.

**Algorithm**: Measures how much the frequency spectrum changes between frames.

```
Flux[n] = sum(max(0, |Spectrum[n]| - |Spectrum[n-1]|))

Transient when: Flux[n] > threshold × local_average
```

**Why it works**: When a new note starts, the spectrum changes significantly as new frequencies appear. This works well for instruments with complex harmonics.

#### 3. High-Frequency Content / HFC (High Band)

Best for detecting percussive high-frequency content like hi-hats and cymbals.

**Algorithm**: Weights high-frequency bins more heavily in spectral flux calculation.

```
HFC[n] = sum(k × |Spectrum[n,k]|) for each frequency bin k

Transient when: HFC[n] > threshold × local_average
```

**Why it works**: Cymbals and hi-hats have most of their energy in high frequencies. Weighting these bins makes them more detectable even when quiet.

### Adaptive Thresholding

> **Note**: Adaptive thresholding is **disabled by default** (`adaptiveThresholding: false`). The threshold you set is used exactly as-is. Enable this only if you need automatic adjustment based on track dynamics.

When enabled, adaptive thresholding adjusts the threshold based on the track's dynamic range:

```
┌────────────────────────────────────────────────────────────────────┐
│                    Adaptive Threshold Flow                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   1. Calculate signal mean energy                                  │
│   2. Calculate standard deviation                                  │
│   3. Compute coefficient of variation: CV = stdDev / mean          │
│   4. Adjust threshold: adaptive = base × (1 + CV × 0.5)            │
│                                                                    │
│   Note: This can only INCREASE the threshold, never decrease it.   │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │ Low CV (consistent signal): Threshold stays near base        │ │
│   │ High CV (dynamic signal): Threshold increases → fewer detect │ │
│   └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### Cross-Referencing with Beat Maps

Transients are not quantized to the beat grid during detection—that happens in the next phase (Rhythm Quantization). However, each transient records its relationship to the nearest beat:

```typescript
interface TransientResult {
  timestamp: number;          // When the transient occurred (seconds)
  intensity: number;          // Strength (0.0 - 1.0)
  band: 'low' | 'mid' | 'high';
  detectionMethod: 'energy' | 'spectral_flux' | 'hfc';
  nearestBeat?: {
    index: number;            // Which quarter note this is near
    distance: number;         // How far from the beat grid (seconds)
  };
}
```

### Per-Band Configuration

Each frequency band can have different detection settings optimized for its typical content:

| Band | Default Threshold | Min Interval | Description |
|------|-------------------|--------------|-------------|
| **Low** | 0.5 | 80ms | Higher threshold - bass transients are typically stronger; longer interval - bass events are more sparse |
| **Mid** | 0.3 | 30ms | Medium threshold - balanced detection; moderate interval |
| **High** | 0.25 | 20ms | Lower threshold - hi-hats can be subtle; shorter interval - rapid fire percussion |

```typescript
interface BandTransientConfig {
  threshold: number;           // Peak detection threshold (0.0 - 1.0)
  minInterval: number;         // Buffer window in seconds (Non-Maximum Suppression)
  adaptiveThresholding: boolean;
}
```

### Non-Maximum Suppression (NMS)

Within each band's `minInterval` buffer window, only the **strongest transient wins**. This prevents multiple detections for the same acoustic event:

```
┌────────────────────────────────────────────────────────────────────┐
│                    Non-Maximum Suppression Flow                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   1. Find all peaks above threshold                                │
│   2. Sort candidates by intensity (strongest first)                │
│   3. For each candidate:                                           │
│      - If not within buffer window of accepted transient → accept   │
│      - Otherwise → suppress (weaker transient discarded)           │
│   4. Return accepted transients sorted by timestamp                 │
│                                                                    │
│   Example (50ms buffer):                                           │
│   ────────────────────────                                         │
│   Peaks:  ●     ●●    ●     (4 peaks detected)                     │
│           0ms  40ms 60ms  100ms                                    │
│                                                                    │
│   After NMS (50ms buffer):                                         │
│   ────────────────────────                                         │
│   Result:  ●      ●     ●     (3 transients - weaker at 40ms       │
│           0ms   60ms  100ms   suppressed by stronger 0ms peak)     │
└────────────────────────────────────────────────────────────────────┘
```

### Basic Usage

```typescript
import { MultiBandAnalyzer, TransientDetector } from 'playlist-data-engine';

// Analyze audio into frequency bands
const multiBandAnalyzer = new MultiBandAnalyzer();
const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);

// Detect transients with default per-band settings
const detector = new TransientDetector();
const transients = detector.detect(multiBandResult);

// Or customize per-band settings
const customDetector = new TransientDetector({
  bandConfig: {
    low: { threshold: 0.5, minInterval: 0.1 },  // Higher threshold, longer buffer for bass
    high: { threshold: 0.2 },  // Lower threshold for hi-hats
  },
});
const customTransients = customDetector.detect(multiBandResult);

// Access per-band transients
const lowBandHits = transients.bandTransients.get('low');
const midBandHits = transients.bandTransients.get('mid');
const highBandHits = transients.bandTransients.get('high');

console.log(`Total transients: ${transients.transients.length}`);
console.log(`Low band: ${lowBandHits?.length} (kick/bass)`);
console.log(`Mid band: ${midBandHits?.length} (vocals/snare)`);
console.log(`High band: ${highBandHits?.length} (hi-hats/cymbals)`);
```

---

## Rhythm Quantization

Rhythm quantization translates raw transients into grid-aligned rhythmic subdivisions. This is the bridge between audio analysis and playable rhythm patterns.

### Decide-Then-Quantize Architecture

Grid detection and quantization are split into two separate phases to support BPM-aware rule overrides without double-quantizing:

1. **Grid Decision Phase** — For each beat, detect whether transients fit better on a straight 16th, triplet, or 8th note grid. BPM-aware rules apply here, modifying grid decisions before any snapping occurs.
2. **Quantization Phase** — Using the final (possibly BPM-constrained) grid decisions, snap each transient from its **original** timestamp to the chosen grid position.

This means there is only one quantization pass. BPM rules are consulted during grid decision-making, not applied post-hoc to already-quantized data.

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Decide-Then-Quantize Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. RhythmQuantizer.decideGrids()     →  base grid decisions       │
│          ↓                                                           │
│   2. TempoAwareQuantizer.applyRules()  →  BPM-constrained decisions │
│          ↓                                                           │
│   3. RhythmQuantizer.quantizeToGrids() →  quantize from originals   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Per-Beat Grid Detection

For each quarter note beat, the system determines whether transients fit better on a straight 16th note grid or an 8th note triplet grid:

```
┌────────────────────────────────────────────────────────────────────┐
│                    Beat Duration (e.g., 500ms at 120 BPM)          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Straight 16th Grid:    │    │    │    │   (4 divisions)          │
│                          0   125  250  375  500ms                  │
│                                                                    │
│   Triplet 8th Grid:       │   │   │      (3 divisions)             │
│                           0  167 333  500ms                        │
│                                                                    │
│   Transients:            ●      ●      ●                           │
│                          50    200    350ms                        │
│                                                                    │
│   Analysis:                                                        │
│   - 16th grid avg offset: 50ms                                     │
│   - Triplet grid avg offset: 17ms  ← BETTER FIT                    │
│   - Decision: Use triplet grid for this beat                       │
└────────────────────────────────────────────────────────────────────┘
```

### Density Validation

Before quantization, the system validates that detected transients aren't too dense. **Each frequency band (low/mid/high) is validated independently**, so if one band is too dense, only that band's threshold is increased—not all bands.

| Validation | Description |
|------------|-------------|
| **Minimum interval** | `quarterNoteInterval / 6` (between 16th and 32nd note) |
| **Per-band retry logic** | If too dense, reduce sensitivity and retry (opt-in, default: 0 retries) |
| **Linear increments** | Each retry increases threshold by 0.1 (0.1, 0.2, 0.3, 0.4, 0.5) |

```typescript
// Per-band density validation result
interface BandDensityValidationResult {
  band: 'low' | 'mid' | 'high';
  isValid: boolean;
  minIntervalDetected: number;  // Smallest gap between transients in this band
  requiredMinInterval: number;  // quarterNoteInterval / 6
  retryCount: number;           // How many retries occurred for this band
  sensitivityReduction: number; // Cumulative reduction applied to this band
  finalIntensityThreshold: number;  // Final threshold after retries
  transientsRemaining: number;      // Transients left after filtering
}

// Aggregate result combining all bands
interface DensityValidationResult {
  isValid: boolean;  // True if all bands pass validation
  bands: {
    low: BandDensityValidationResult;
    mid: BandDensityValidationResult;
    high: BandDensityValidationResult;
  };
  maxRetryCount: number;         // Highest retry count across all bands
  maxSensitivityReduction: number;  // Highest reduction across all bands
}
```

**Configuration Example** - Density validation is **disabled by default** (0 retries). Enable it by configuring `densityValidation`:

```typescript
import { RhythmQuantizer } from 'playlist-data-engine';

// Enable density validation with 5 retries
const quantizer = new RhythmQuantizer({
  densityValidation: {
    maxRetries: 5,                    // Number of retries before giving up (default: 0)
    baseSensitivityReduction: 0.1,   // Amount to increase threshold per retry
    maxCumulativeReduction: 0.5,     // Maximum total threshold increase
  },
});

const result = quantizer.quantize(transientAnalysis, unifiedBeatMap);

// Check if density validation triggered any retries
console.log(`Max retries used: ${result.metadata.densityValidation.maxRetryCount}`);
console.log(`Max threshold increase: ${result.metadata.densityValidation.maxSensitivityReduction}`);
```

### Intensity Filtering

Transients can be filtered by intensity to remove weak detections:

```typescript
import { RhythmQuantizer } from 'playlist-data-engine';

const quantizer = new RhythmQuantizer({
  minimumTransientIntensity: 0.3,  // Filter transients below 30% intensity
});

const result = quantizer.quantize(transientAnalysis, unifiedBeatMap);
console.log(`Filtered: ${result.metadata.transientsFilteredByIntensity} transients`);
```

### Generated Beat Structure

Each quantized beat contains detailed metadata:

```typescript
interface GeneratedBeat {
  timestamp: number;           // Quantized time (seconds)
  beatIndex: number;           // Which quarter note this belongs to
  gridPosition: number;        // Position within beat (0-3 for 16th, 0-2 for triplet, 0-1 for 8th)
  gridType: 'straight_16th' | 'triplet_8th' | 'straight_8th';
  intensity: number;           // Transient strength (0.0 - 1.0)
  band: 'low' | 'mid' | 'high';
  quantizationError?: number;  // How far it was moved (ms)
}
```

### Grid Decision Metadata

For each beat, the system records which grid was chosen and why:

```typescript
interface GridDecision {
  beatIndex: number;
  selectedGrid: 'straight_16th' | 'triplet_8th' | 'straight_8th';
  straightAvgOffset?: number;  // Average ms offset if using 16th grid (undefined when forced)
  tripletAvgOffset?: number;   // Average ms offset if using triplet grid (undefined when forced)
  transientCount: number;      // How many transients in this beat
  confidence: number;          // How much better the chosen grid fits (1.0 = forced override)
}
```

**Confidence values:**
- `< 1.0` — Auto-detected grid decision (chosen because it best fits transient positions)
- `1.0` — Forced/authoritative decision (band-forced grid, or BPM-based override by TempoAwareQuantizer)

When a grid decision is forced (e.g., by BPM-aware rules), `straightAvgOffset` and `tripletAvgOffset` are cleared since they no longer reflect the chosen grid.

### BPM-Aware Quantization Rules

The `TempoAwareQuantizer` is an extensible pipeline step that applies BPM-based rules to constrain the quantization grid for fundamental playability. This operates during the grid decision phase (before any quantization), so transients are always snapped from their original timestamps to the final grid.

#### Rule Interface

Rules implement the `TempoQuantizationRule` interface:

```typescript
interface TempoQuantizationRule {
  id: string;
  description: string;
  /** Check if this rule applies given the BPM and context */
  applies(bpm: number, context: TempoRuleContext): boolean;
  /** Modify grid decisions based on this rule */
  apply(decisions: GridDecision[], context: TempoRuleContext): GridDecision[];
}
```

Rules are applied in order — each rule receives the decisions (possibly modified by earlier rules) and returns modified decisions.

#### High BPM Grid Restriction Rule

At high tempos, fine subdivisions become physically unplayable:

| BPM | 16th note duration | Triplet 8th duration |
|-----|--------------------|-----------------------|
| 160 | 93.75ms | 125ms |
| 200 | 75ms | 100ms |

The built-in `HighBpmGridRestrictionRule` applies two thresholds:

| BPM Range | Effect |
|-----------|--------|
| < 160 | No restriction — all grid types allowed |
| >= 160 | `straight_16th` overridden to `straight_8th` |
| >= 200 | `triplet_8th` also overridden to `straight_8th` |

- Applies to `mid` and `high` bands only (`low` is already forced to `straight_8th`)
- When overriding, sets `confidence: 1.0` and clears offset fields
- Deduplication happens naturally during quantization when two transients snap to the same grid point
- Thresholds are configurable via `HighBpmGridRestrictionConfig`

#### Relationship to Difficulty-Based Limits

BPM-aware rules and difficulty-based subdivision limits are separate pipeline stages:

1. **BPM-aware quantization** (this step) — constrains the grid for fundamental playability at any difficulty. Happens during quantization. Thresholds: 16th restricted at 160 BPM, triplets at 200 BPM.
2. **Tempo-aware subdivision limits** (DifficultyVariantGenerator) — further constrains grid types per difficulty based on BPM. Thresholds: medium restricts 16th at 70 BPM, hard restricts 16th at 120 BPM, easy restricts to quarters at 120 BPM.

At 180 BPM: the BPM rule converts 16th→8th for the base quantization. Then the difficulty variant generator additionally restricts medium (already on 8th) and hard (forced to 8th). At 120 BPM: the BPM rule does nothing, but medium restricts 16th and hard allows all types.

---

## Scoring and Composite Generation

The scoring system evaluates which frequency band has the most "interesting" rhythm for each section, then combines them into a composite stream.

### Scoring Factors

Each band stream is scored on multiple factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **IOI Variance** | - | Inter-Onset Interval variance—more varied = more interesting |
| **Syncopation** | - | Offbeat transients score higher |
| **Phrase Significance** | - | Higher if section contains detected phrases |
| **Density Factor** | - | BPM-aware bell curve—optimal density (~4.0 notes/sec) scores highest |

```
Score = ioiVariance + syncopationLevel + phraseSignificance + densityFactor
```

### Section Scoring

The song is divided into 2-measure sections (8 beats each), and each band receives a score per section:

```
┌────────────────────────────────────────────────────────────────────┐
│                   Section Scoring Example                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Section: Beats 0-7 (First 2 measures)                            │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │ Band   │ Score │ IOI Var │ Sync │ Phrase │ Density │        │ │
│   ├─────────────────────────────────────────────────────────────┤ │
│   │ Low    │ 0.72  │ 0.15    │ 0.20 │ 0.00   │ 0.37    │        │ │
│   │ Mid    │ 0.89  │ 0.25    │ 0.30 │ 0.15   │ 0.19    │ ← WIN │ │
│   │ High   │ 0.65  │ 0.10    │ 0.25 │ 0.00   │ 0.30    │        │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│   Winner: Mid band (score: 0.89, margin: 0.17)                     │
└────────────────────────────────────────────────────────────────────┘
```

### Composite Stream Generation

The composite stream is created by selecting the highest-scoring band for each section:

```typescript
interface CompositeStream {
  beats: CompositeBeat[];           // Combined beats from winning sections
  sections: CompositeSection[];     // Which band won each section
  naturalDifficulty: 'easy' | 'medium' | 'hard';
  metadata: {
    totalBeats: number;
    sectionCount: number;
    beatsPerBand: { low: number; mid: number; high: number };
    sectionsPerBand: { low: number; mid: number; high: number };
  };
}

interface CompositeBeat extends GeneratedBeat {
  sourceBand: 'low' | 'mid' | 'high';  // Which band contributed this beat
}
```

### Natural Difficulty Detection

The composite's natural difficulty is determined by its density:

| Density | Notes/Second | Natural Difficulty |
|---------|--------------|-------------------|
| Sparse | < 1.0 | Easy |
| Moderate | 1.0 - 1.5 | Medium |
| Dense | > 1.5 | Hard |

### Custom Scoring Configuration

The scoring system can be customized to control which frequency bands are favored during composite stream generation. This is useful when the automatic merit-based selection doesn't match your desired outcome.

#### When to Use Custom Scoring

- **Bass-heavy results**: If the low band wins most sections, reduce its bias
- **Percussion focus**: Emphasize high frequencies (hi-hats, cymbals)
- **Melody/rhythm balance**: Favor mid frequencies for guitar/keyboard parts
- **Experimental patterns**: Dramatically alter which transients are selected

#### Factor Weights

Control how much each scoring factor contributes to band selection. Weights should sum to approximately 1.0 for balanced scoring:

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `ioiVarianceWeight` | 0.30 | 0.0-1.0 | Rhythmic variety importance |
| `syncopationWeight` | 0.30 | 0.0-1.0 | Offbeat emphasis importance |
| `phraseSignificanceWeight` | 0.25 | 0.0-1.0 | Pattern detection importance |
| `densityWeight` | 0.15 | 0.0-1.0 | Note count importance |

#### Band Bias Weights

Manual preference multipliers applied to the final score for each frequency band:

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `bandBiasWeights.low` | 0.8 | 0.0-2.0 | 0 = never win, 1 = neutral, 2 = strongly favored |
| `bandBiasWeights.mid` | 0.95 | 0.0-2.0 | Same as above |
| `bandBiasWeights.high` | 1.0 | 0.0-2.0 | Same as above |

**Note**: Bass is slightly disfavored by default (0.8) to reduce low-frequency dominance in composite stream selection. Mids are very slightly disfavored (0.95).

#### How Bias Affects Selection

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Band Bias Example                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Without bias (merit-based):                                       │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │ Band   │ Score │ Winner?                                      │ │
│   ├──────────────────────────────────────────────────────────────┤ │
│   │ Low    │ 0.89  │ ← WIN (highest merit)                        │ │
│   │ Mid    │ 0.72  │                                              │ │
│   │ High   │ 0.65  │                                              │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   With bias: { low: 0.5, mid: 1.0, high: 1.5 }                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │ Band   │ Score │ Bias  │ Final │ Winner?                     │ │
│   ├──────────────────────────────────────────────────────────────┤ │
│   │ Low    │ 0.89  │ ×0.5  │ 0.445 │                             │ │
│   │ Mid    │ 0.72  │ ×1.0  │ 0.720 │                             │ │
│   │ High   │ 0.65  │ ×1.5  │ 0.975 │ ← WIN (bias pushes it up)   │ │
│   └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

#### Common Use Cases

| Use Case | Configuration | Effect |
|----------|---------------|--------|
| **Reduce bass dominance** | `{ low: 0.5, mid: 1.0, high: 1.0 }` | Bass wins half as often |
| **Focus on melody/rhythm** | `{ low: 0.3, mid: 1.5, high: 1.0 }` | Strongly favor mid band |
| **Emphasize percussion** | `{ low: 1.0, mid: 1.0, high: 1.5 }` | Favor hi-hats, cymbals |
| **Balanced mix** | `{ low: 0.8, mid: 1.2, high: 1.0 }` | Slight mid preference |

---

## Phrase Detection

The phrase detection system identifies repeated rhythmic patterns within a song. These detected phrases form a **song-specific pattern library** used for density enhancement.

### How Phrases Are Detected

Phrases are detected by comparing rhythmic patterns across the song:

1. **Scan for duplicates**: Check each 1, 2, 4, and 8-beat window for identical patterns
2. **Hash for comparison**: Create a hash from beat indices, grid positions, and grid types (intensity is ignored)
3. **Filter uninteresting patterns**: Exclude straight quarter notes and straight eighth notes
4. **Score significance**: Larger phrases with more occurrences are more significant

### Phrase Structure

```typescript
interface RhythmicPhrase {
  pattern: GeneratedBeat[];         // The rhythm pattern
  sizeInBeats: number;              // 1, 2, 4, or 8
  sourceBand: 'low' | 'mid' | 'high';  // Which band this was detected in
  occurrences: PhraseOccurrence[];  // All locations where this occurs
  significance: number;             // Weighted by size and occurrence count
  hasVariation: boolean;            // Excludes straight quarters/eighths
  availableForReuse: boolean;       // Can be inserted for density enhancement
}

interface PhraseOccurrence {
  beatIndex: number;        // Where in the beat map
  startTimestamp: number;   // Start time (for pitch analysis reference)
  endTimestamp: number;     // End time
}
```

### Significance Scoring

```
Significance = sizeInBeats × log(occurrenceCount + 1)
```

| Size | 2 Occurrences | 5 Occurrences | 10 Occurrences |
|------|---------------|---------------|----------------|
| 1 beat | 0.7 | 1.6 | 2.3 |
| 2 beats | 1.4 | 3.2 | 4.6 |
| 4 beats | 2.8 | 6.4 | 9.2 |
| 8 beats | 5.5 | 12.9 | 18.4 |

### Integration with Pitch Detection

The `sourceBand` and timestamp fields enable integration with pitch detection:

```typescript
// For pitch detection integration (future use):
// 1. Use sourceBand to know which frequency range to analyze
// 2. Use startTimestamp/endTimestamp to extract the audio segment
// 3. Associate detected pitches with phrase occurrences
```

---

## Difficulty Variant Generation

The system generates three difficulty variants from the composite stream by either simplifying (for easier difficulties) or enhancing density (for harder difficulties).

### Target Density Ranges

Each difficulty level has a target density range (notes per second):

| Difficulty | Target Density | Description |
|------------|----------------|-------------|
| **Easy** | 0 - 1.0 notes/sec | Sparse (mostly quarter and 8th notes) |
| **Medium** | 1.0 - 1.5 notes/sec | Moderate (8th notes, some 16ths) |
| **Hard** | > 1.5 notes/sec | Dense (16ths, triplets) |

### Subdivision Limits by Difficulty

Subdivision limits are **tempo-aware** — allowed grid types tighten at higher BPMs for playability:

| Difficulty | BPM < 70 | 70 ≤ BPM ≤ 120 | BPM > 120 |
|------------|----------|----------------|-----------|
| **Easy** | `straight_8th`, `quarter_triplet` | `straight_8th`, `quarter_triplet` | `straight_4th`, `quarter_triplet` |
| **Medium** | All types | `straight_8th`, `quarter_triplet` | `straight_8th`, `quarter_triplet` |
| **Hard** | All types | All types | `straight_8th`, `quarter_triplet` |
| **Natural** | All types | All types | All types |

**BPM thresholds:**
- **70 BPM** (Medium): 16th notes and 8th triplets reserved for hard/natural
- **120 BPM** (Easy): 8th notes → quarter notes
- **120 BPM** (Hard): 16th notes → 8th notes, 8th triplets → quarter triplets

At slow tempos (< 70 BPM), the static `SUBDIVISION_LIMITS` apply. Use `getTempoAwareAllowedGridTypes(difficulty, bpm)` for tempo-aware limits.

### Variant Generation Strategy

The system uses a **global target-based density control** approach that calculates the exact number of beats needed from the target density range, then distributes that count across beat indices. A **grid lock mechanism** runs first to ensure all density operations respect the single-grid-per-beat rule.

#### Grid Lock Per Beat Index

Before any density work, the system locks the grid type for each beat index:

1. **Resolve mixed grids** — Run `enforceSingleGridPerBeat()` to resolve any beats with mixed grid types
2. **Build lock map** — Create a `Map<number, ExtendedGridType>` mapping each beat index to its dominant grid type
3. **Fill empty indices** — For indices with no beats, resolve from `gridDecisions` map, then use nearest-neighbor fallback (offsets 1, -1, 2, -2, 3, -3), then default to the allowed grid type for the target difficulty
4. **All operations respect lock** — Enhancement and simplification use the locked grid type, so `enforceSingleGridPerBeat()` never needs to discard newly-added beats

#### Global Target Calculation

For each difficulty, the system calculates an exact target beat count:

| Difficulty | Target Density (midpoint) | Target Range |
|------------|---------------------------|--------------|
| **Easy** | 0.9 notes/sec | [0, 1.0] |
| **Medium** | 1.25 notes/sec | [1.0, 1.5] |
| **Hard** | 1.75 notes/sec | [1.5, ∞) |

The target strategy (`densityTargetStrategy` config) adjusts within the range: `'midpoint'` (center), `'lower'` (conservative), or `'upper'` (aggressive).

#### Strategy by Natural Difficulty

| Natural Difficulty | Target Variant | Strategy |
|-------------------|----------------|----------|
| Hard (dense) | Easy | Grid conversion (16th→8th or →quarter at high BPM) + **multi-pass reduction** to ≤1.0 nps |
| Hard (dense) | Medium | Grid conversion (if BPM ≥ 70) + **multi-pass reduction** to [1.0, 1.5] nps |
| Hard (dense) | Hard | Unchanged (unless BPM > 120, then grid conversion) |
| Medium | Easy | Grid conversion + **multi-pass reduction** to ≤1.0 nps |
| Medium | Medium | Unchanged (unless BPM ≥ 70, then grid conversion) |
| Medium | Hard | **Empty-index-first enhancement** to ≥1.5 nps |
| Easy (sparse) | Easy | Unchanged (unless BPM > 120, then grid conversion) |
| Easy (sparse) | Medium | **Empty-index-first enhancement** to [1.0, 1.5] nps |
| Easy (sparse) | Hard | **Empty-index-first enhancement** to ≥1.5 nps |

### Custom Configuration

`DifficultyVariantGenerator` accepts a `Partial<DifficultyVariantConfig>` in its constructor to override default tuning parameters. Only the fields you provide are changed; everything else falls back to defaults.

```typescript
const generator = new DifficultyVariantGenerator({
    simplificationIntensityThreshold: 0.5,
    densityTargetStrategy: 'lower',  // More conservative targets
    maxReductionPasses: 5,           // More passes for difficult songs
    logConversions: true,
});

// Inspect the resolved config at runtime
const config = generator.getConfig();
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `logConversions` | `boolean` | `false` | Log subdivision conversions for debugging |
| `preservePhraseBoundaries` | `boolean` | `true` | Preserve phrase structure when simplifying |
| `simplificationIntensityThreshold` | `number` | `0.3` | Min intensity to keep beats during simplification |
| `heavySimplificationIntensityThreshold` | `number` | `0.5` | Min intensity for heavy simplification |
| `moderateSimplificationIntensityThreshold` | `number` | `0.4` | Threshold for removing offbeat 16ths (hard→medium) |
| `densityReductionMinIntensity` | `number` | `0.25` | Min intensity for density reduction removal |
| `densityTargetStrategy` | `'midpoint' \| 'lower' \| 'upper'` | `'midpoint'` | Where in the density range to target (midpoint=center, lower=conservative, upper=aggressive) |
| `maxReductionPasses` | `number` | `3` | Safety limit for density reduction passes (normally stops earlier once midpoint beat count is reached) |
| `interpolatedBeatIntensity` | `number` | `0.5` | Intensity assigned to interpolated beats (0.0–1.0) |
| `preferPatternInsertion` | `boolean` | `true` | Prefer pattern insertion over simple interpolation |
| `maxPatternInsertionSize` | `number` | `4` | Max phrase size (in beats) for pattern insertion |
| `seed` | `string?` | `undefined` | Deterministic seed for grid-lock-based distribution. Same seed + same beats always produces the same variant |

### Simplification Rules

When simplifying to easier difficulties:

1. **Enforce subdivision limits** - 16th notes snap to 8th notes for Easy
2. **Apply density-aware reduction** - After grid conversion, remove beats if density exceeds target
3. **Prioritize strong beats** - Beats 1 and 3 of each measure are kept first
4. **Remove offbeats first** - Grid positions 1 and 3 prioritized for removal
5. **Respect phrase boundaries** - Beats in significant phrases are preserved when possible

#### Beat Removal Priority

When reducing density, beats are assigned a priority score (higher = kept longer):

| Factor | Priority Impact |
|--------|-----------------|
| Strong beat (1, 3 of measure) | +0.3 |
| Downbeat (gridPosition 0) | +0.2 |
| Intensity | +intensity × 0.3 |
| Phrase membership | +0.15 max |
| Offbeat penalty (positions 1, 3) | -0.1 |

This ensures offbeats with low intensity are removed first, preserving musical structure.

#### Multi-Pass Reduction with Convergence Loop

The reduction algorithm targets a **specific beat count** calculated from the midpoint density (e.g., 0.9 nps for easy, 1.25 nps for medium, 1.75 nps for hard), not just the ceiling of the target range. `calculateBeatCountTarget()` converts the midpoint density into an exact beat count, and the loop removes beats until that count is reached.

| Pass | Protections | Purpose |
|------|-------------|---------|
| **Pass 1** | Full protections (intensity ≥ 0.4, priority ≥ 0.75) | First attempt with strict safeguards |
| **Pass 2** | Relaxed (intensity threshold -0.1, priority threshold -0.15, allow low-significance phrase beats) | Reach targets that Pass 1 can't hit |
| **Pass 3** | Minimal (only strong beats at beatIndex % 4 === 0 or 2 protected) | Last resort fallback |

After each pass, the algorithm checks if the remaining beat count has reached the midpoint target. If so, it stops. Maximum 3 passes by default (configurable via `maxReductionPasses`). The number of passes used is recorded in `SubdivisionConversionMetadata.reductionPasses`.

### Density Enhancement

When enhancing to harder difficulties, the system uses a **greedy, deterministic distribution** that prioritizes empty indices first:

#### Distribution Phases

**Phase A — Fill Empty Indices First**:
- For each empty beat index (no existing beats), assign 1-2 beats at preferred positions
- Small gaps (1-2 consecutive empty indices): Prefer pattern insertion where neighboring beat context is available
- Large gaps (3+ consecutive empty indices): Use simple half-note or quarter-note beats to maintain the beat

**Phase B — Fill Partially Occupied Indices**:
- For each occupied index, calculate remaining slots (`maxPositions - currentCount`)
- Add beats at empty positions within the locked grid type
- Pattern insertion is preferred; interpolation is the fallback

#### Deterministic Distribution

No probabilistic rolls are used. The distribution is deterministic and greedy:
- Empty indices are always prioritized
- The seed is used only for tiebreaking when multiple indices are equally good candidates
- Timestamps are always derived from the authoritative `unifiedBeatMap` quarter-note positions

#### Grid Lock Respect

All enhancement operations respect the locked grid type per index:
- `createBeatsForEmptyIndex()` uses the locked grid type
- `interpolateBeats()` uses the locked grid type and derives timestamps from `unifiedBeatMap`
- This ensures `enforceSingleGridPerBeat()` never needs to discard newly-added beats

### Variant Metadata

```typescript
interface DifficultyVariant {
  difficulty: 'easy' | 'medium' | 'hard';
  beats: VariantBeat[];            // The beats in this variant (may include converted grid types)
  isUnedited: boolean;             // true for the composite's natural difficulty
  editType: 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';
  editAmount: number;              // 0-1, how much was changed
  patternsInserted?: string[];     // IDs of patterns inserted (if any)
  conversionMetadata?: SubdivisionConversionMetadata;  // Metadata about subdivision conversions (includes reductionPasses)
}
```

---

## Usage Examples

### Basic Rhythm Generation

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Generate rhythm from audio URL
const rhythm = await analyzer.generateRhythm('song.mp3', 'track-001');

// Access difficulty variants
const easyVariant = rhythm.difficultyVariants.easy;
const mediumVariant = rhythm.difficultyVariants.medium;
const hardVariant = rhythm.difficultyVariants.hard;

console.log(`Easy: ${easyVariant.beats.length} beats`);
console.log(`Medium: ${mediumVariant.beats.length} beats`);
console.log(`Hard: ${hardVariant.beats.length} beats`);
```

### Generate with Default Settings

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Simple one-call generation
const rhythm = await analyzer.generateRhythm('song.mp3', 'track-001');

// Use the medium variant for gameplay
const beats = rhythm.difficultyVariants.medium.beats;
console.log(`Natural difficulty: ${rhythm.composite.naturalDifficulty}`);
console.log(`Total beats: ${beats.length}`);
```

### Filter by Transient Intensity

```typescript
import { RhythmGenerator } from 'playlist-data-engine';

const generator = new RhythmGenerator({
  minimumTransientIntensity: 0.3,  // Only use transients above 30%
});

const rhythm = await generator.generate(audioBuffer, beatMap, interpolatedBeatMap);

console.log(`Filtered: ${rhythm.metadata.transientsFilteredByIntensity} transients`);
```

### Select Specific Output Streams

```typescript
import { RhythmGenerator } from 'playlist-data-engine';

// Focus on bass-heavy rhythms
const bassGenerator = new RhythmGenerator({
  outputMode: 'low',  // Use low band directly instead of composite
});

const rhythm = await bassGenerator.generate(audioBuffer, beatMap, interpolatedBeatMap);

// All variants are from the low band
console.log(rhythm.difficultyVariants.medium.beats);
```

### Custom Scoring with Band Bias

Use `scoringConfig` to control which frequency bands are favored in the composite stream:

```typescript
import { RhythmGenerator } from 'playlist-data-engine';

// Example: Reduce bass dominance, favor high frequencies
const generator = new RhythmGenerator({
  outputMode: 'composite',
  scoringConfig: {
    bandBiasWeights: {
      low: 0.3,   // Bass rarely wins (30% of normal)
      mid: 1.0,   // Neutral - no change
      high: 1.5,  // Strongly favor high frequencies (hi-hats, cymbals)
    }
  }
});

const rhythm = await generator.generate(audioBuffer, beatMap, interpolatedBeatMap);

// Check which bands won sections
console.log(rhythm.composite.metadata.sectionsPerBand);
// { low: 2, mid: 8, high: 15 } - high band dominates
```

### Custom Scoring with Factor Weights

Adjust how much each scoring factor contributes:

```typescript
import { RhythmGenerator } from 'playlist-data-engine';

// Example: Focus on syncopated rhythms
const generator = new RhythmGenerator({
  outputMode: 'composite',
  scoringConfig: {
    // Favor syncopation and variety over density
    ioiVarianceWeight: 0.35,      // Increased from 0.30
    syncopationWeight: 0.40,      // Increased from 0.30
    phraseSignificanceWeight: 0.15, // Decreased from 0.25
    densityWeight: 0.10,          // Decreased from 0.15
    // Total: 1.0 ✓
  }
});

const rhythm = await generator.generate(audioBuffer, beatMap, interpolatedBeatMap);
```

### Combined Scoring Configuration

Use both factor weights and band bias together:

```typescript
import { RhythmGenerator } from 'playlist-data-engine';

// Example: Syncopated high-frequency rhythms
const generator = new RhythmGenerator({
  outputMode: 'composite',
  scoringConfig: {
    // Favor syncopation and variety
    ioiVarianceWeight: 0.35,
    syncopationWeight: 0.40,
    phraseSignificanceWeight: 0.15,
    densityWeight: 0.10,

    // And bias toward high frequencies
    bandBiasWeights: {
      low: 0.2,   // Almost never use bass
      mid: 1.0,   // Neutral
      high: 1.8,  // Strongly favor high frequencies
    }
  }
});

const rhythm = await generator.generate(audioBuffer, beatMap, interpolatedBeatMap);
console.log(`Natural difficulty: ${rhythm.composite.naturalDifficulty}`);
```

### Working with Difficulty Variants

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const rhythm = await analyzer.generateRhythm('song.mp3', 'track-001');

// Check which variant is unedited (matches the original composite)
for (const [name, variant] of Object.entries(rhythm.difficultyVariants)) {
  if (variant.isUnedited) {
    console.log(`${name} is the natural difficulty (unedited)`);
  }
  console.log(`${name}: ${variant.beats.length} beats, editType: ${variant.editType}`);
}

// Check what patterns were inserted
const hardVariant = rhythm.difficultyVariants.hard;
if (hardVariant.patternsInserted) {
  console.log(`Patterns inserted: ${hardVariant.patternsInserted.length}`);
}

// The 'natural' variant is always unedited - the actual detected rhythm
const naturalVariant = rhythm.difficultyVariants.natural;
console.log(`Natural variant: ${naturalVariant.beats.length} beats (unedited composite)`);
```

### Accessing Individual Band Streams

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const rhythm = await analyzer.generateRhythm('song.mp3', 'track-001');

// Access raw band streams for advanced use
const lowBand = rhythm.bandStreams.low;
const midBand = rhythm.bandStreams.mid;
const highBand = rhythm.bandStreams.high;

console.log(`Low band: ${lowBand.beats.length} beats`);
console.log(`Mid band: ${midBand.beats.length} beats`);
console.log(`High band: ${highBand.beats.length} beats`);

// Check grid decisions per band
for (const decision of lowBand.gridDecisions) {
  console.log(`Beat ${decision.beatIndex}: ${decision.selectedGrid}`);
}
```

### Custom Configuration Presets

```typescript
import { RhythmGenerator, getRhythmPreset, getRhythmPresetNames } from 'playlist-data-engine';

// List available presets
console.log('Available presets:', getRhythmPresetNames());
// ['casual', 'standard', 'challenge', 'bass']

// Get a preset configuration
const preset = getRhythmPreset('bass');
console.log(preset);
// { difficulty: 'medium', outputMode: 'low', description: 'Focus on bass/low-frequency rhythms' }

// Create generator with preset
const generator = new RhythmGenerator({
  difficulty: preset.difficulty,
  outputMode: preset.outputMode,
});
```

### Complete Workflow Example

```typescript
import {
  BeatMapGenerator,
  BeatInterpolator,
  unifyBeatMap,
  RhythmGenerator
} from 'playlist-data-engine';

// Step 1: Generate beat map (quarter note grid)
const beatMapGenerator = new BeatMapGenerator();
const beatMap = await beatMapGenerator.generateBeatMap('song.mp3', 'track-001');

// Step 2: Interpolate to fill gaps
const interpolator = new BeatInterpolator();
const interpolated = interpolator.interpolate(beatMap);

// Step 3: Create unified beat map
const unifiedMap = unifyBeatMap(interpolated);

// Step 4: Generate procedural rhythm
const rhythmGenerator = new RhythmGenerator({
  difficulty: 'medium',
  outputMode: 'composite',
  minimumTransientIntensity: 0.2,
});
const rhythm = await rhythmGenerator.generate(audioBuffer, beatMap, interpolated);

// Step 5: Use the generated rhythm
console.log(`Analysis complete:`);
console.log(`  Transients detected: ${rhythm.metadata.transientsDetected}`);
console.log(`  Phrases found: ${rhythm.metadata.phrasesDetected}`);
console.log(`  Natural difficulty: ${rhythm.metadata.naturalDifficulty}`);
console.log(`  Easy beats: ${rhythm.difficultyVariants.easy.beats.length}`);
console.log(`  Medium beats: ${rhythm.difficultyVariants.medium.beats.length}`);
console.log(`  Hard beats: ${rhythm.difficultyVariants.hard.beats.length}`);
```

---

## Pitch Detection

The pitch detection system extracts melodic information from audio to create button patterns that follow the music's melody. This is separate from beat/transient detection—while beats tell us *when* to press buttons, pitch detection tells us *which* buttons to press.

### Source Files

| Component | Location |
|-----------|----------|
| **PitchDetector** (pYIN algorithm) | [src/core/analysis/PitchDetector.ts](../src/core/analysis/PitchDetector.ts) |
| **EssentiaPitchDetector** (Essentia.js WASM) | [src/core/analysis/EssentiaPitchDetector.ts](../src/core/analysis/EssentiaPitchDetector.ts) |
| **PitchBeatLinker** | [src/core/generation/PitchBeatLinker.ts](../src/core/generation/PitchBeatLinker.ts) |
| **MelodyContourAnalyzer** | [src/core/analysis/MelodyContourAnalyzer.ts](../src/core/analysis/MelodyContourAnalyzer.ts) |

### pYIN Algorithm Explanation

The engine uses **pYIN** (probabilistic YIN), a robust pitch detection algorithm that extends the classic YIN algorithm with probabilistic modeling and Hidden Markov Model (HMM) tracking.

#### How pYIN Works Conceptually

pYIN operates in two layers:

1. **YIN Core**: Analyzes each audio frame to find candidate pitches with associated probabilities
2. **HMM Layer**: Tracks pitch over time, using temporal context to make smooth, consistent pitch decisions

This two-layer approach produces more accurate results than YIN alone, especially in challenging audio with noise, polyphony, or rapid pitch changes.

#### YIN Core: Difference Function and CMNDF

The YIN algorithm finds the fundamental frequency by measuring how well the signal repeats at different periods:

**Step 1: Difference Function**

For each lag τ (candidate period), compute:
```
d(τ) = Σ (x[i] - x[i+τ])²
```

A low value indicates the signal repeats with that period. The lag with the lowest difference corresponds to the pitch period.

**Step 2: Cumulative Mean Normalized Difference Function (CMNDF)**

Normalize the difference function to make it robust to amplitude variations:
```
cmndf(τ) = d(τ) / (1/τ × Σ d(j) for j=1 to τ)
```

This normalization helps distinguish true pitch periods from amplitude-related artifacts.

**Step 3: Pitch Candidate Selection**

Find local minima in the CMNDF below a threshold. Each minimum represents a pitch candidate with probability `1 - cmndf[lag]`. Multiple candidates are kept for the HMM to evaluate.

#### HMM Layer: Pitch State Tracking

The Hidden Markov Model provides temporal smoothing:

**States**: Each state represents a specific pitch (frequency). The engine uses 2 bins per semitone across the configured frequency range, plus an "unvoiced" state for non-pitched audio.

**Transition Probabilities**: Closer pitches have higher transition probabilities. The model penalizes large pitch jumps, encouraging smooth trajectories.

**Viterbi Decoding**: Finds the optimal sequence of pitch states that maximizes the overall probability, considering both:
- Observation probabilities (how well each frame matches each pitch)
- Transition probabilities (how likely it is to move between pitches)

#### Why pYIN Over Alternatives

| Algorithm | Pros | Cons |
|-----------|------|------|
| **pYIN** (chosen) | Probabilistic output, handles polyphony well, smooth tracking | Slightly more complex |
| YIN | Simple, fast | No temporal smoothing, octave errors common |
| CREPE | Very accurate on monophonic audio | Heavy neural network, browser-incompatible |

pYIN strikes the best balance for browser-based rhythm games: accurate enough for melody following, efficient enough for real-time use.

#### Essentia.js Alternatives

While pYIN is a solid general-purpose pitch detector, its pure-TypeScript implementation has limitations when applied to polyphonic music (full mixes with vocals, bass, drums, and harmony simultaneously). The band-pass filtering it relies on can destroy harmonics, reducing accuracy on dense arrangements.

Since the engine already imports the `essentia.js` WebAssembly library for genre classification (`MusicClassifier`), the `EssentiaPitchDetector` provides access to 6 natively compiled C++ algorithms with no additional dependencies:

| Algorithm | Type | Best For | Confidence? | Polyphonic? |
|-----------|------|----------|-------------|-------------|
| `pitch_melodia` | Built-in WASM | Standard monophonic melody extraction **(Recommended)** | Yes | Single F0 |
| `pitch_yin_probabilistic` | Built-in WASM | WASM-accelerated pYIN (same algo, C++ speed) | Yes | Single F0 |
| `multipitch_melodia` | Built-in WASM | Multiple simultaneous F0 contours (MELODIA) | No | Multi F0 |
| `multipitch_klapuri` | Built-in WASM | Harmonic summation multi-pitch detection | No | Multi F0 |
| `pitch_crepe` | External TFJS model | Neural network pitch detection (high accuracy) | Yes | Single F0 |

**Why pitch_melodia?** This is the industry-standard algorithm for extracting the lead melody from fully polyphonic music. It was designed specifically to isolate a single dominant pitch contour even in dense mixes — exactly the use case for rhythm game button mapping. It outperforms the custom pYIN implementation because:

1. **Native C++ performance**: Compiled to WebAssembly, it runs orders of magnitude faster than the TypeScript pYIN
2. **Designed for polyphony**: Uses spectral harmonic analysis rather than autocorrelation, so it doesn't destroy harmonics through band-pass filtering
3. **Finer time resolution**: Uses a 128-sample hop size (~2.9ms at 44.1kHz) vs pYIN's 512 samples (~11.6ms), capturing faster melodic passages
4. **Built-in confidence**: Returns per-frame pitch confidence, enabling quality filtering

**Usage via PitchBeatLinker** — The pitch algorithm is selected through the `PitchBeatLinkerConfig`:

```typescript
const linker = new PitchBeatLinker({
  pitchAlgorithm: 'pitch_melodia', // Use Essentia.js (default)
});

// link() is async due to lazy WASM loading
const linkedAnalysis = await linker.link(bandStreams, audioBuffer);
```

For the full API, see [DATA_ENGINE_REFERENCE.md](DATA_ENGINE_REFERENCE.md#essentiapitchdetector).

#### Configurable Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `minFrequency` | 80 Hz | Lowest frequency to detect (low guitar string) |
| `maxFrequency` | 1000 Hz | Highest frequency to detect (high vocals) |
| `voicingThreshold` | 0.2 | Probability threshold for voiced/unvoiced decision |
| `transitionPenalty` | 0.5 | Penalty for large pitch jumps in HMM |
| `selfTransitionProbability` | 0.99 | Probability of staying in same pitch state |
| `yinThreshold` | 0.1 | Threshold for accepting pitch candidates |
| `hopSize` | 512 samples | Analysis window overlap (~12ms at 44.1kHz) |

#### Handling Polyphonic Audio

Real music contains multiple simultaneous pitches. pYIN handles this by:

1. **Multiple Candidates**: Keeping several pitch candidates per frame with associated probabilities
2. **Subharmonic Filtering**: Removing candidates that are likely subharmonics of higher-frequency candidates
3. **HMM Selection**: The Viterbi decoder selects the most consistent fundamental frequency over time

For melody extraction in dense mixes, the multi-band analysis (below) helps isolate the lead instrument.

#### Probabilistic Output

Each pitch result includes:

```typescript
interface PitchResult {
  timestamp: number;      // When this pitch was detected
  frequency: number;      // Detected frequency in Hz
  probability: number;    // Confidence (0-1) from pYIN HMM
  isVoiced: boolean;      // Whether pitch was detected (vs silence/noise)
  midiNote: number | null; // MIDI note number (e.g., 69 for A4)
  noteName: string | null; // Note name (e.g., "C4", "F#5")
  alternativeHypotheses?: { // Other possible pitches (for debugging)
    frequency: number;
    probability: number;
  }[];
}
```

The `probability` field is crucial for button mapping—lower-confidence pitches can be deprioritized or replaced with pattern-based button assignments.

---

### Beat-Timestamped Pitch Detection

Rather than analyzing the entire audio continuously, pitch detection is performed on the full unfiltered signal and then matched to beat timestamps from the generated rhythm patterns.

#### Why Timestamp-Based Analysis

| Approach | Pros | Cons |
|----------|------|------|
| **Timestamp-based** (chosen) | Efficient, aligned with beats, direct integration | May miss pitch between beats |
| Continuous | Complete pitch contour | Redundant with beat detection, slower |

For rhythm games, we only need pitch at the moments when players press buttons—analyzing at beat timestamps is both efficient and accurate.

#### Linking Pitch to Composite Beat Timestamps

The `PitchBeatLinker` runs full-spectrum pitch detection and matches pitch frames to composite beat timestamps:

```typescript
import { PitchBeatLinker } from 'playlist-data-engine';

const linker = new PitchBeatLinker();

// Analyze pitch on the full unfiltered signal and link to composite beats
const compositePitches = await linker.linkWithComposite(
  generatedRhythm.composite,
  audioBuffer
);

// Access pitch at each beat
for (const pitchAtBeat of compositePitches) {
  if (pitchAtBeat.pitch?.isVoiced) {
    console.log(`Beat ${pitchAtBeat.beatIndex}: ${pitchAtBeat.pitch.noteName}`);
  }
}
```

All pitch detection runs on the full unfiltered audio signal — band-pass filtering removes too many harmonics for YIN/Essentia to find periodicity reliably. The `band` field on each `PitchAtBeat` reflects the rhythm origin (which frequency band the beat was detected in), not the pitch detection source.

#### Melody Contour Analysis and Variant Derivation

```typescript
// Analyze melody contour from composite pitches
const contourAnalyzer = new MelodyContourAnalyzer();
const contourResult = contourAnalyzer.analyze(compositePitches);

// Derive pitches for all difficulty variants
const variantPitches = linker.deriveAllVariantPitches(
  generatedRhythm.difficultyVariants,
  compositePitches
);

console.log('Easy pitches:', variantPitches.easy.length);
console.log('Medium pitches:', variantPitches.medium.length);
console.log('Hard pitches:', variantPitches.hard.length);
```

---

## Melody Contour Analysis

*This section documents how pitch direction and intervals are calculated for button mapping. See the [PitchBeatLinker](../src/core/generation/PitchBeatLinker.ts) source for implementation details.*

### Pitch-to-Pitch Comparison

Each beat's pitch is compared to the previous beat to determine:

#### Direction Categories

| Direction | Condition |
|-----------|-----------|
| `up` | Current pitch > Previous pitch (by >0.5 semitones) |
| `down` | Current pitch < Previous pitch (by >0.5 semitones) |
| `stable` | Pitch change ≤ 0.5 semitones |
| `none` | No pitch detected at current or previous beat |

#### Interval Calculation

Intervals are measured in semitones and categorized for button mapping:

| Category | Semitones | Example |
|----------|-----------|---------|
| `unison` | 0 | Same note |
| `small` | 1-2 | Minor/major second |
| `medium` | 3-4 | Minor/major third |
| `large` | 5-7 | Perfect fourth to perfect fifth |
| `very_large` | 8+ | Sixth or larger |

### Contour Extraction

The melody contour is analyzed at multiple time scales:

- **Short-term** (1-2 beats): Immediate direction for quick reactions
- **Medium-term** (4-8 beats): Phrase-level direction for pattern generation
- **Long-term** (16+ beats): Overall melodic trend

#### Segment Detection

Consecutive beats with the same direction are grouped into segments:

```typescript
interface MelodySegment {
  startTime: number;      // Segment start time
  endTime: number;        // Segment end time
  startPitch: string;     // Starting note (e.g., "C4")
  endPitch: string;       // Ending note (e.g., "F#5")
  direction: 'up' | 'down' | 'stable';
  interval: number;       // Total semitones spanned
}
```

---

## Button Mapping Strategies

*This section documents how detected pitches are converted to button assignments. See the [ButtonMapper](../src/core/generation/ButtonMapper.ts) source for implementation details.*

### Controller Mode Overview

The engine supports two controller modes with different button mapping philosophies:

| Mode | Buttons | Axes | Best For |
|------|---------|------|----------|
| **DDR** | up, down, left, right | 2 (circular) | Dance pads, circular motion games |
| **Guitar Hero** | 1, 2, 3, 4, 5 | 1 (horizontal) | Fret-based games, linear pitch mapping |

Mode selection is via the `controllerMode` config option.

### DDR Mode Strategy (4 Buttons, Circular Motion)

DDR mode uses a **circular motion philosophy**: buttons are selected to create flowing, dance-like patterns.

#### Circular State Transitions

```
up → right → down → left → up
```

Pitch direction determines the direction of circular movement:

| Pitch Direction | Movement |
|-----------------|----------|
| Up (ascending) | Clockwise progression |
| Down (descending) | Counter-clockwise progression |
| Stable | Stay on current button or small movement |

#### Interval Size Effects

| Interval | Effect |
|----------|--------|
| Small (1-2 semitones) | Move 1 step in direction |
| Medium (3-4 semitones) | Move 2 steps |
| Large (5+ semitones) | Move 3 steps or jump across |

#### Example

"Ascending small interval from 'left' → 'up'" (clockwise 1 step)

### Guitar Hero Mode Strategy (5 Buttons, 1 Axis)

Guitar Hero mode uses a **fretboard metaphor**: lower-numbered buttons correspond to lower pitches.

#### Fretboard Mapping

| Button | Pitch Range |
|--------|-------------|
| 1 | Lowest pitch detected |
| 2 | Low-mid pitch |
| 3 | Middle pitch |
| 4 | Mid-high pitch |
| 5 | Highest pitch detected |

The full pitch range of the song is mapped linearly across the 5 buttons.

#### String Wrap Logic

Instead of clamping at the edges (buttons 1 and 5), the mapping "wraps" like a guitar string:

- Going below button 1 wraps to button 5
- Going above button 5 wraps to button 1

This creates continuous, flowing patterns even at the extremes.

#### Interval Size Effects

| Interval | Fret Jump |
|----------|-----------|
| Small (1-2 semitones) | Move 1 fret |
| Medium (3-4 semitones) | Move 2 frets |
| Large (5+ semitones) | Move 3+ frets |

#### Example

"Descending large interval from fret 3 → fret 1" (down 2 positions)

### Probability-Based Blending

The `pitchInfluenceWeight` parameter controls the balance between pitch-based and pattern-based button assignment:

| Weight | Behavior |
|--------|----------|
| `1.0` | 100% pitch-based (follow melody exactly) |
| `0.5` | 50/50 blend of pitch and patterns |
| `0.0` | Pattern-only (skip pitch detection entirely) |

#### Low-Probability Pitch Handling

When pitch probability is low:
1. The beat is marked for pattern-based replacement
2. Consecutive pattern beats are grouped into **runs**, each filled end-to-end with full multi-beat patterns (e.g., a 4-beat roll places all 4 keys across consecutive beats)
3. Result is a smooth blend of melody and rhythm patterns, with pattern IDs shared across consecutive beats in the same placement

### Difficulty-Based Variations

| Difficulty | Mapping Strategy |
|------------|-----------------|
| **Easy** | Direction-only mapping, no large leaps, simpler patterns |
| **Medium** | Direction + interval, leaps allowed, moderate complexity |
| **Hard** | Full interval mapping, rapid changes, maximum complexity |

---

## Level Generation Examples

### Basic Level Generation

```typescript
import { RhythmGenerator, PitchBeatLinker, ButtonMapper } from 'playlist-data-engine';

// Step 1: Generate rhythm
const rhythmGenerator = new RhythmGenerator({ difficulty: 'medium' });
const rhythm = await rhythmGenerator.generate(audioBuffer, beatMap, interpolated);

// Step 2: Link pitch to composite stream beats
const linker = new PitchBeatLinker();
const compositePitches = await linker.linkWithComposite(
  rhythm.composite,
  audioBuffer
);

// Step 3: Map buttons
const mapper = new ButtonMapper({
  controllerMode: 'ddr',
  pitchInfluenceWeight: 0.8
});
const buttonMap = mapper.map(rhythm, 'medium', compositePitches);

console.log(`Generated ${buttonMap.keyAssignments.size} button assignments`);
```

### Pattern-Only Generation (No Pitch Analysis)

```typescript
import { RhythmGenerator, ButtonMapper } from 'playlist-data-engine';

// Generate rhythm without pitch analysis
const rhythmGenerator = new RhythmGenerator({ difficulty: 'easy' });
const rhythm = await rhythmGenerator.generate(audioBuffer, beatMap, interpolated);

// Map buttons using patterns only (pitchInfluenceWeight: 0)
const mapper = new ButtonMapper({
  controllerMode: 'guitar_hero',
  pitchInfluenceWeight: 0  // Skips pitch detection entirely
});
const buttonMap = mapper.map(rhythm, 'easy');
```

### Seeded (Deterministic) Generation

Pass a `seed` to `LevelGenerator` for fully deterministic level generation. The same seed + same audio + same settings always produces the same level:

```typescript
import { LevelGenerator } from 'playlist-data-engine';

// Generate a level with a seed
const generator = new LevelGenerator({
  difficulty: 'medium',
  controllerMode: 'ddr',
  seed: 'my-level-42',
});

// This will always produce the same level for the same audio
const level = await generator.generate(audioBuffer, unifiedBeatMap);

// Regenerating with the same seed produces identical results
const level2 = await generator.generate(audioBuffer, unifiedBeatMap);
// level.chart === level2.chart (identical key assignments)

// Different seed = different level
const altGenerator = new LevelGenerator({ seed: 'my-level-99' });
const altLevel = await altGenerator.generate(audioBuffer, unifiedBeatMap);
// altLevel differs from level (different patterns selected)
```

The seed affects all randomized decisions in the pipeline:
- **RhythmGenerator**: density rolls, difficulty variant beat-level decisions
- **ButtonMapper**: pattern selection (when multiple same-sized patterns are valid), variation button picks (for consecutive key limit fixes)

### Full Workflow: Audio → Rhythm → Pitch → Buttons → ChartedBeatMap

```typescript
import {
  BeatMapGenerator,
  BeatInterpolator,
  unifyBeatMap,
  RhythmGenerator,
  PitchBeatLinker,
  ButtonMapper
} from 'playlist-data-engine';

// Step 1: Generate beat map
const beatMapGenerator = new BeatMapGenerator();
const beatMap = await beatMapGenerator.generateBeatMap('song.mp3', 'track-001');

// Step 2: Interpolate to fill gaps
const interpolator = new BeatInterpolator();
const interpolated = interpolator.interpolate(beatMap);

// Step 3: Create unified beat map
const unifiedMap = unifyBeatMap(interpolated);

// Step 4: Generate procedural rhythm
const rhythmGenerator = new RhythmGenerator({
  difficulty: 'medium',
  outputMode: 'composite'
});
const rhythm = await rhythmGenerator.generate(audioBuffer, beatMap, interpolated);

// Step 5: Link pitch to composite stream beats
const linker = new PitchBeatLinker();
const compositePitches = await linker.linkWithComposite(
  rhythm.composite,
  audioBuffer
);

// Step 6: Derive pitches for all difficulty variants
const variantPitches = linker.deriveAllVariantPitches(rhythm.difficultyVariants, compositePitches);

// Step 7: Map buttons for each difficulty
const mapper = new ButtonMapper({ controllerMode: 'ddr', pitchInfluenceWeight: 0.8 });
const easyButtons = mapper.map(rhythm, 'easy', variantPitches.easy);
const mediumButtons = mapper.map(rhythm, 'medium', variantPitches.medium);
const hardButtons = mapper.map(rhythm, 'hard', variantPitches.hard);

console.log('Level generation complete!');
console.log(`  Easy: ${easyButtons.keyAssignments.size} buttons`);
console.log(`  Medium: ${mediumButtons.keyAssignments.size} buttons`);
console.log(`  Hard: ${hardButtons.keyAssignments.size} buttons`);
```

### Serialization: Save and Load Generated Levels

The `LevelSerializer` class provides methods to save and load generated levels. This is useful for:
- Persisting generated levels to disk or cloud storage
- Sharing levels between users
- Caching generated levels to avoid re-generation

```typescript
import { LevelGenerator, LevelSerializer } from 'playlist-data-engine';

// Generate a level
const generator = new LevelGenerator({
  difficulty: 'medium',
  controllerMode: 'ddr',
});
const level = await generator.generate(audioBuffer, unifiedBeatMap);

// === Save to JSON string ===
const jsonString = LevelSerializer.toJSON(level);
// Save to localStorage, send to server, etc.
localStorage.setItem('saved-level', jsonString);

// === Load from JSON string ===
const loadedLevel = LevelSerializer.fromJSON(jsonString);
console.log('Loaded level:', loadedLevel.metadata.difficulty);

// === Export to FullBeatMapExportData format ===
// This format is compatible with the playlist-data-showcase app
const exportData = LevelSerializer.toExportData(level);
console.log('Export format version:', exportData.version);
console.log('Generation source:', exportData.generationSource); // 'procedural'

// === Import from FullBeatMapExportData ===
const reimportedLevel = LevelSerializer.fromExportData(exportData);

// === Validate before importing unknown data ===
const unknownData = JSON.parse(someJsonString);
const result = LevelSerializer.validate(unknownData);
if (result.success) {
  const validLevel = LevelSerializer.fromExportData(result.data!);
  console.log('Valid level loaded!');
} else {
  console.error('Validation failed:', result.errors);
  console.warn('Warnings:', result.warnings);
}

// === Round-trip preservation ===
// All level data is preserved through serialization
const roundTripJson = LevelSerializer.toJSON(level);
const roundTripLevel = LevelSerializer.fromJSON(roundTripJson);
console.assert(
  roundTripLevel.chart.beats.length === level.chart.beats.length,
  'Beat count preserved'
);
```

### Conversion: GeneratedLevel → ChartedBeatMap for BeatStream

The `GeneratedLevel` output includes a `chart` property that is already a `ChartedBeatMap` ready for use with `BeatStream`. No additional conversion is needed.

```typescript
import { LevelGenerator, BeatStream } from 'playlist-data-engine';

// Generate a level
const generator = new LevelGenerator({
  difficulty: 'medium',
  controllerMode: 'ddr',
  buttons: { pitchInfluenceWeight: 0.8 }
});
const level = await generator.generate(audioBuffer, unifiedBeatMap);

// The chart property is already a ChartedBeatMap
const chartedBeatMap = level.chart;

// Create a BeatStream from the generated chart
const beatStream = new BeatStream(chartedBeatMap, audioContext);

// Connect to audio element for synchronization
const audioElement = document.querySelector('audio');
beatStream.connectAudioElement(audioElement);

// Start playback
audioElement.play();
beatStream.start();

// Listen for beat events (includes requiredKey from button mapping)
beatStream.on('beat', (beat) => {
  console.log(`Beat at ${beat.timestamp}s - Press key: ${beat.requiredKey}`);

  // Check if player pressed the correct key
  const playerPressedKey = 'up'; // From game input
  const isCorrect = beatStream.checkButtonPress(
    beat.timestamp,
    playerPressedKey,
    50 // ±50ms tolerance window
  );

  if (isCorrect) {
    console.log('Perfect hit!');
  }
});

// Access metadata about the generated level
console.log('Level metadata:');
console.log(`  Difficulty: ${level.metadata.difficulty}`);
console.log(`  Keys used: ${level.metadata.buttonMetadata.keysUsed.join(', ')}`);
console.log(`  Pitch-influenced beats: ${level.metadata.buttonMetadata.pitchInfluencedBeats}`);
console.log(`  Patterns used: ${level.metadata.buttonMetadata.patternsUsed.join(', ')}`);

if (level.metadata.pitchMetadata) {
  console.log('Pitch analysis:');
  console.log(`  Melody range: ${level.metadata.pitchMetadata.melodyRange?.min} - ${level.metadata.pitchMetadata.melodyRange?.max}`);
  console.log(`  Direction stats:`, level.metadata.pitchMetadata.directionStats);
  console.log(`  Interval stats:`, level.metadata.pitchMetadata.intervalStats);
}
```

---

## Serialization Format

The `LevelSerializer` class exports generated levels to the `FullBeatMapExportData` format, a unified JSON structure that supports both procedurally generated levels and manually charted levels. This format is fully compatible with the playlist-data-showcase app's import/export functionality.

### Overview of FullBeatMapExportData Format

The `FullBeatMapExportData` format contains all the data needed to reconstruct a complete rhythm game level:

| Section | Purpose |
|---------|---------|
| **Format identification** | `version: 1` and `format: 'full-beatmap'` for type detection |
| **Audio identification** | `audioId`, `audioTitle`, `duration` |
| **Tempo information** | `quarterNoteBpm`, `quarterNoteConfidence` |
| **Beat data** | `detectedBeats`, `mergedBeats`, `interpolatedMetadata` |
| **Subdivision** | `config`, `beats`, `metadata` (optional) |
| **Chart** | `style`, `keyCount`, `usedKeys` (optional) |
| **Procedural extensions** | `generationSource`, `generationMetadata` (optional) |

#### Core Structure

```typescript
interface FullBeatMapExportData {
  // Format identification
  version: 1;
  format: 'full-beatmap';

  // Audio identification
  audioId: string;
  audioTitle?: string;
  exportedAt: number;  // Unix timestamp
  duration: number;

  // Tempo information
  quarterNoteBpm: number;
  quarterNoteConfidence: number;

  // Beat data
  detectedBeats: FullExportDetectedBeat[];
  mergedBeats: FullExportMergedBeat[];
  interpolatedMetadata: InterpolatedMetadataJSON;

  // Subdivision (null if no subdivision applied)
  subdivision: SubdivisionExportData | null;

  // Chart metadata (null if no chart)
  chart: ChartExportData | null;

  // Procedural extensions (optional)
  generationSource?: 'manual' | 'procedural';
  generationMetadata?: ProceduralGenerationMetadata;
}
```

### Procedural Extensions

Procedurally generated levels include additional metadata that preserves the generation context. These fields are optional and are safely ignored by the showcase app during import.

#### Root-Level Extensions

| Field | Type | Description |
|-------|------|-------------|
| `generationSource` | `'manual' \| 'procedural'` | Indicates whether the level was created manually or procedurally |
| `generationMetadata` | `ProceduralGenerationMetadata` | Detailed metadata about the generation process |

#### ProceduralGenerationMetadata Structure

```typescript
interface ProceduralGenerationMetadata {
  difficulty: string;              // 'easy', 'medium', or 'hard'
  pitchInfluenceWeight: number;    // 0-1, how much pitch affected button mapping
  patternsUsed: string[];          // IDs of button patterns used
  controllerMode: 'ddr' | 'guitar_hero';
  seed?: string;                   // For reproducibility. When set, same seed + audio + settings = same level
  generatedAt: string;             // ISO timestamp

  // Pitch analysis results (absent if pitchInfluenceWeight = 0)
  directionStats?: {
    up: number;
    down: number;
    stable: number;
    none: number;
  };
  intervalStats?: {
    unison: number;
    small: number;
    medium: number;
    large: number;
    very_large: number;
  };

  // Rhythm generation summary
  rhythmMetadata?: {
    difficulty: string;
    bandsAnalyzed: ('low' | 'mid' | 'high')[];
    transientsDetected: number;
    averageDensity: number;
  };
}
```

#### Beat-Level Procedural Extensions

Individual beats in `subdivision.beats[]` can include procedural-specific fields:

| Field | Type | Description |
|-------|------|-------------|
| `quarterNoteIndex` | `number` | Index of the parent quarter note |
| `subdivisionPosition` | `number` | Position within the quarter (0-3 for 16th, 0-2 for triplet) |
| `sourceBand` | `'low' \| 'mid' \| 'high'` | Which frequency band this beat originated from |
| `quantizationError` | `number` | How far (ms) the beat was moved during quantization |

### Compatibility with Manual Charting

The serialization format is designed for seamless interoperability between the data engine and the playlist-data-showcase app:

#### Procedural Level → Showcase App Import

When a procedurally generated level is exported and imported into the showcase app:

1. **Required fields are preserved**: All beat timing, key assignments, and chart metadata work correctly
2. **Procedural extensions are ignored**: The showcase app uses `.map()` to extract only needed fields
3. **Chart playback works**: `requiredKey` values are used for key matching during gameplay

```typescript
// Export from engine
const exportData = LevelSerializer.toExportData(generatedLevel);
const json = JSON.stringify(exportData);

// Import in showcase app - procedural fields are safely ignored
// The showcase app extracts: timestamp, beatInMeasure, requiredKey, etc.
```

#### Manual Chart → Engine Import

Manual charts exported from the showcase app can be imported into the engine:

1. **Missing procedural fields get defaults**: `quarterNoteIndex = 0`, `subdivisionPosition = 0`, `sourceBand = 'mid'`
2. **generationSource is absent**: The engine detects manual charts by the lack of `generationSource` field
3. **Rhythm reconstruction**: Basic rhythm data is reconstructed from available beat information

```typescript
// Manual charts don't have generationMetadata
if (!exportData.generationSource || exportData.generationSource === 'manual') {
  // This is a manually charted level
  // Procedural fields will use sensible defaults
}
```

### Round-Trip Preservation

The serialization format preserves all level data through save/load cycles:

| Data | Preservation |
|------|--------------|
| **Beat timestamps** | ✅ Exact preservation |
| **Key assignments** | ✅ `requiredKey` preserved for all beats |
| **Chart metadata** | ✅ Style, key count, used keys preserved |
| **Pitch metadata** | ✅ Direction/interval stats preserved for procedural levels |
| **Rhythm metadata** | ✅ Density, transient count, bands analyzed preserved |
| **Generation config** | ✅ Difficulty, controller mode, seed preserved |

#### Round-Trip Example

```typescript
import { LevelGenerator, LevelSerializer } from 'playlist-data-engine';

// Generate a level
const level = await generator.generate(audioBuffer, unifiedBeatMap);

// Export → Import → Re-export
const export1 = LevelSerializer.toExportData(level);
const reimported = LevelSerializer.fromExportData(export1);
const export2 = LevelSerializer.toExportData(reimported);

// Verify preservation
console.assert(
  JSON.stringify(export1) === JSON.stringify(export2),
  'Round-trip should produce identical output'
);
```

### Edge Cases

#### Pattern-Only Levels (pitchInfluenceWeight = 0)

When pitch influence is disabled during generation:

- `generationMetadata.directionStats` is absent
- `generationMetadata.intervalStats` is absent
- `generationMetadata.pitchInfluenceWeight = 0`

#### Levels Without Subdivision

When no subdivision was applied:

- `subdivision` is `null`
- Beats are reconstructed from `mergedBeats` on import
- Default `subdivisionType: 'quarter'` is used

#### Levels Without Key Assignments

When no chart was created:

- `chart` is `null`
- `requiredKey` is undefined on all beats
- `usedKeys` array is empty

### Type Definitions

The complete type definitions are available in the engine:

| Type | Location |
|------|----------|
| `FullBeatMapExportData` | [src/core/types/LevelExport.ts](../src/core/types/LevelExport.ts) |
| `ProceduralGenerationMetadata` | [src/core/types/LevelExport.ts](../src/core/types/LevelExport.ts) |
| `LevelSerializer` | [src/core/analysis/LevelSerializer.ts](../src/core/analysis/LevelSerializer.ts) |

---

## References

- [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)
- [librosa beat tracking implementation](https://librosa.org/doc/latest/generated/librosa.beat.beat_track.html)
- [librosa onset strength implementation](https://librosa.org/doc/latest/generated/librosa.onset.onset_strength.html)
- [pYIN: A Fundamental Frequency Estimator (Mauch & Dixon, 2014)](https://ieeexplore.ieee.org/document/6853678)
- [YIN: A Fundamental Frequency Estimator (De Cheveigné & Kawahara, 2002)](https://asa.scitation.org/doi/10.1121/1.1458024)
