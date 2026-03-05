# Audio Analysis Documentation

The Playlist Data Engine provides three complementary audio analysis modes for extracting meaningful data from music files. Each mode serves different use cases, from quick character generation to precise rhythm game timing.

---

## Overview

The engine's audio analysis is powered by the Web Audio API and provides three distinct modes:

| Mode | Method | Purpose | Use Case |
|------|--------|---------|----------|
| **Triple Tap Real-Time** | `extractSonicFingerprint()` | Quick analysis at key positions | Character generation, quick profiling |
| **Full Song Timeline** | `analyzeTimeline()` | Complete track analysis | Waveform visualization, level generation |
| **Beat Detection** | `generateBeatMap()` + `createBeatStream()` | Rhythm timing data | Rhythm games, beat-synchronized visuals |

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
| **GrooveAnalyzer** | [src/core/analysis/beat/GrooveAnalyzer.ts](../src/core/analysis/beat/GrooveAnalyzer.ts) |
| **RhythmXPCalculator** | [src/core/progression/RhythmXPCalculator.ts](../src/core/progression/RhythmXPCalculator.ts) |
| **Beat Types** | [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts) |
| **Rhythm XP Types** | [src/core/types/RhythmXP.ts](../src/core/types/RhythmXP.ts) |
| **Audio Types** | [src/core/types/AudioProfile.ts](../src/core/types/AudioProfile.ts) |

---

## 3-Tap Real-Time Analysis

The original `AudioAnalyzer` real-time analysis uses the "Triple Tap" strategy: analyzing three key positions (5%, 40%, 70%) in tracks longer than 3 seconds, or the full buffer for shorter clips.

### Method

```typescript
extractSonicFingerprint(audioUrl: string): Promise<AudioProfile>
```

### Usage

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer({
  includeAdvancedMetrics: true,  // Include spectral centroid, rolloff, zero-crossing rate
  trebleBoost: 0.6,              // Reduce treble dominance
  bassBoost: 1.2,                // Increase bass presence
});

const profile = await analyzer.extractSonicFingerprint(track.audio_url);

console.log(`Bass: ${profile.bass_dominance}`);
console.log(`Mid: ${profile.mid_dominance}`);
console.log(`Treble: ${profile.treble_dominance}`);
console.log(`RMS Energy: ${profile.rms_energy}`);
console.log(`Dynamic Range: ${profile.dynamic_range}`);
```

### AudioProfile Output

| Property | Type | Description |
|----------|------|-------------|
| `bass_dominance` | `number` | Relative bass energy (0-1, normalized with others) |
| `mid_dominance` | `number` | Relative mid-range energy (0-1) |
| `treble_dominance` | `number` | Relative treble energy (0-1) |
| `average_amplitude` | `number` | Average amplitude across all samples |
| `rms_energy` | `number` | Root mean square energy (perceived loudness) |
| `dynamic_range` | `number` | Peak amplitude minus RMS energy |
| `spectral_centroid` | `number?` | Brightness indicator (with advanced metrics) |
| `spectral_rolloff` | `number?` | Frequency below which 85% of energy is contained |
| `zero_crossing_rate` | `number?` | Measure of noisiness/percussiveness |
| `analysis_metadata` | `object` | Duration, sample positions, timestamp |

### Frequency Bands

The analyzer separates audio into three perceptual frequency bands:

| Band | Frequency Range | Typical Content |
|------|-----------------|-----------------|
| **Bass** | 20 - 400 Hz | Kick drums, bass guitar, sub-bass |
| **Mid** | 400 - 4000 Hz | Vocals, guitars, keyboards |
| **Treble** | 4000 - 14000 Hz | Hi-hats, cymbals, high harmonics |

### Triple Tap Strategy

For tracks longer than 3 seconds, the analyzer samples at three positions:

| Position | Rationale |
|----------|-----------|
| **5%** | Capture intro, often distinctive |
| **40%** | Typically in the main body/chorus |
| **70%** | Late section, often bridge or climax |

This provides representative coverage while avoiding expensive full-track analysis.

---

## Full Song Analysis

For applications requiring complete track data (waveform visualization, timeline displays, level generation), use `analyzeTimeline()`.

### Method

```typescript
analyzeTimeline(audioUrl: string, strategy: SamplingStrategy): Promise<AudioTimelineEvent[]>
```

### Sampling Strategies

```typescript
// Option A: Sample every N seconds
const timeline = await analyzer.analyzeTimeline(audioUrl, {
  type: 'interval',
  intervalSeconds: 2  // Sample every 2 seconds
});

// Option B: Generate exactly N data points
const timeline = await analyzer.analyzeTimeline(audioUrl, {
  type: 'count',
  count: 100  // Exactly 100 evenly-spaced samples
});
```

### AudioTimelineEvent Output

| Property | Type | Description |
|----------|------|-------------|
| `timestamp` | `number` | Position in the track (seconds) |
| `duration` | `number` | Length of analyzed segment |
| `bass` | `number` | Bass dominance (0-1, normalized) |
| `mid` | `number` | Mid dominance (0-1, normalized) |
| `treble` | `number` | Treble dominance (0-1, normalized) |
| `amplitude` | `number` | RMS energy for this segment |
| `rms_energy` | `number` | Root mean square energy |
| `peak` | `number` | Peak amplitude |
| `dynamic_range` | `number` | Peak minus RMS |
| `spectral_centroid` | `number` | Brightness indicator |
| `spectral_rolloff` | `number` | Energy distribution measure |
| `zero_crossing_rate` | `number` | Noisiness/percussiveness |

### Usage Example

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();

// Generate 100 data points across the song for visualization
const timeline = await analyzer.analyzeTimeline(audioUrl, {
  type: 'count',
  count: 100
});

// Find the loudest moment
const peakMoment = timeline.reduce((max, event) =>
  event.rms_energy > max.rms_energy ? event : max
);
console.log(`Peak at ${peakMoment.timestamp}s`);

// Build a simple waveform visualization
timeline.forEach(event => {
  const barHeight = Math.round(event.rms_energy * 20);
  console.log(`${'█'.repeat(barHeight)} [${event.timestamp.toFixed(1)}s]`);
});
```

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
| `noiseFloorThreshold` | `number` | 0.1 | Noise floor threshold |
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

#### Sensitivity Control Examples

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Low sensitivity: strict tempo, fewer beats (good for simple 4/4 songs)
const strictGenerator = new BeatMapGenerator({
  sensitivity: 0.5,  // Fewer beats, only the strongest ones
});

// Default sensitivity: balanced detection
const defaultGenerator = new BeatMapGenerator({
  sensitivity: 1.0,  // Standard behavior
});

// High sensitivity: more beats, captures subdivisions
const sensitiveGenerator = new BeatMapGenerator({
  sensitivity: 3.0,  // More beats, including 1/8 and 1/16 notes
});

const strictBeatMap = await strictGenerator.generateBeatMap('simple-beat.mp3', 'track-001');
const defaultBeatMap = await defaultGenerator.generateBeatMap('song.mp3', 'track-002');
const sensitiveBeatMap = await sensitiveGenerator.generateBeatMap('complex-rhythm.mp3', 'track-003');

console.log(`Strict: ${strictBeatMap.beats.length} beats`);
console.log(`Default: ${defaultBeatMap.beats.length} beats`);
console.log(`Sensitive: ${sensitiveBeatMap.beats.length} beats`);
```

#### Filter Control Examples

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// No filtering: keep all detected beats (default)
const noFilter = new BeatMapGenerator({
  filter: 0.0,  // All beats kept
});

// Moderate filtering: remove clearly off-grid beats
const moderateFilter = new BeatMapGenerator({
  filter: 0.5,  // Remove beats far from the grid
});

// Strict filtering: only grid-aligned beats
const strictFilter = new BeatMapGenerator({
  filter: 0.9,  // Only beats very close to the grid
});

const allBeats = await noFilter.generateBeatMap('song.mp3', 'track-001');
const gridBeats = await strictFilter.generateBeatMap('song.mp3', 'track-001');

console.log(`All beats: ${allBeats.beats.length}`);
console.log(`Grid-aligned only: ${gridBeats.beats.length}`);
```

#### Combined Sensitivity + Filter Examples

```typescript
import { BeatMapGenerator } from 'playlist-data-engine';

// Rhythm game preset: high sensitivity + strict filter
// Detects many beats, then removes off-grid ones
const rhythmGameGenerator = new BeatMapGenerator({
  sensitivity: 2.0,  // Detect subdivisions
  filter: 0.7,       // Remove off-grid beats
});

// Casual game preset: low sensitivity + no filter
// Only the strongest beats, all kept
const casualGameGenerator = new BeatMapGenerator({
  sensitivity: 0.5,  // Only strong beats
  filter: 0.0,       // Keep all detected beats
});

// Expert rhythm game: very high sensitivity + strict filter
// Maximum beat detection, quantized to grid
const expertGenerator = new BeatMapGenerator({
  sensitivity: 5.0,  // Detect all rhythmic elements
  filter: 0.9,       // Strict grid alignment
});

// Compare results
const song = 'complex-drum-track.mp3';
const rhythmBeatMap = await rhythmGameGenerator.generateBeatMap(song, 'rhythm-001');
const casualBeatMap = await casualGameGenerator.generateBeatMap(song, 'casual-001');
const expertBeatMap = await expertGenerator.generateBeatMap(song, 'expert-001');

console.log(`Rhythm game: ${rhythmBeatMap.beats.length} beats`);
console.log(`Casual game: ${casualBeatMap.beats.length} beats`);
console.log(`Expert: ${expertBeatMap.beats.length} beats`);

// Metadata shows the settings used
console.log(`Rhythm settings:`, rhythmBeatMap.metadata.sensitivity, rhythmBeatMap.metadata.filter);
```

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
| `perfect` | ±75ms | ±45ms | ±10ms | Perfect timing |
| `great` | ±125ms | ±90ms | ±25ms | Very close |
| `good` | ±175ms | ±135ms | ±50ms | Good timing |
| `ok` | ±250ms | ±200ms | ±100ms | Acceptable |
| `miss` | >250ms | >200ms | >100ms | Missed the beat |
| `wrongKey` | — | — | — | Correct timing but wrong key pressed (for charts with required keys) |

**Default**: Medium difficulty (balanced experience for most players)

See [Configuring Difficulty](#configuring-difficulty) for how to customize thresholds.

#### Configuring Difficulty

The beat detection system supports configurable difficulty through three presets and custom thresholds.

##### Using Difficulty Presets

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();

const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Easy mode - forgiving timing for casual players
const easyStream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'easy'
});

// Medium mode - balanced difficulty (default)
const mediumStream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'medium'
});

// Hard mode - strict timing
const hardStream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'hard'
});
```

##### Using Custom Thresholds

For fine-grained control, you can override specific thresholds:

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();

const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Override only specific thresholds (uses hard preset as base)
const customStream = analyzer.createBeatStream(beatMap, audioContext, {
  customThresholds: {
    perfect: 0.050,  // ±50ms (more lenient perfect)
    great: 0.100,    // ±100ms
    good: 0.150,     // ±150ms
    ok: 0.200,       // ±200ms
  }
});

// Partial override - only change perfect and ok
const partialStream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'medium',  // Base preset
  customThresholds: {
    perfect: 0.030,  // Stricter perfect (±30ms)
  }
});
```

##### Difficulty Preset Constants

The preset thresholds are also exported as constants for direct access:

```typescript
import {
  EASY_ACCURACY_THRESHOLDS,
  MEDIUM_ACCURACY_THRESHOLDS,
  HARD_ACCURACY_THRESHOLDS,
  getAccuracyThresholdsForPreset,
  type AccuracyThresholds,
  type DifficultyPreset,
} from 'playlist-data-engine';

// Access preset values directly
console.log(EASY_ACCURACY_THRESHOLDS);
// { perfect: 0.075, great: 0.125, good: 0.175, ok: 0.250 }

// Get thresholds for a preset programmatically
const thresholds = getAccuracyThresholdsForPreset('medium');
console.log(`Medium perfect window: ${thresholds.perfect * 1000}ms`);
// "Medium perfect window: 45ms"

// Get current thresholds from a BeatStream
const stream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'easy'
});
const currentThresholds = stream.getAccuracyThresholds();
```

##### Validating Custom Thresholds

Use `validateThresholds()` to validate custom thresholds before passing them to BeatStream. This helps catch configuration errors early and provides helpful error messages.

```typescript
import { validateThresholds, type AccuracyThresholds } from 'playlist-data-engine';

// Validate custom thresholds before use
const customThresholds: Partial<AccuracyThresholds> = {
  perfect: 0.050,
  great: 0.100,
  good: 0.150,
  ok: 0.200,
};

const result = validateThresholds(customThresholds);

if (!result.valid) {
  console.error('Invalid thresholds:', result.errors);
  // Example errors:
  // - "great (0.05) must be greater than perfect (0.1)"
  // - "perfect must be positive, got -0.01"
} else {
  // Safe to use with BeatStream
  const stream = analyzer.createBeatStream(beatMap, audioContext, {
    customThresholds
  });
}
```

**Validation Rules:**
- All threshold values must be positive numbers (including zero)
- Thresholds must be in ascending order: `perfect < great < good < ok`
- Partial thresholds are validated only for the values provided

**Return Type:**
```typescript
interface ThresholdValidationResult {
  valid: boolean;
  errors: string[];
}
```

##### Changing Difficulty Mid-Stream

Use `setDifficulty()` to change difficulty settings while the BeatStream is running. This enables adaptive difficulty gameplay where the game adjusts based on player performance.

```typescript
import { AudioAnalyzer } from 'playlist-data-engine';

const analyzer = new AudioAnalyzer();
const audioContext = new AudioContext();
const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');

// Start with hard difficulty
const stream = analyzer.createBeatStream(beatMap, audioContext, {
  difficultyPreset: 'hard'
});

stream.start();

// Later, adjust difficulty based on player performance
function onPlayerPerformanceUpdate(accuracy: number) {
  if (accuracy < 0.5) {
    // Player struggling - switch to easy
    stream.setDifficulty({ preset: 'easy' });
  } else if (accuracy > 0.9) {
    // Player doing great - switch to hard
    stream.setDifficulty({ preset: 'hard' });
  }
}

// You can also use custom thresholds
stream.setDifficulty({
  preset: 'medium',
  customThresholds: { perfect: 0.060 }  // Looser perfect window
});

// Clear custom thresholds and use preset only
stream.setDifficulty({ preset: 'easy', customThresholds: {} });
```

**Use Cases:**
- **Adaptive difficulty**: Automatically adjust based on player performance
- **Practice mode**: Let players try different difficulties without restarting
- **Accessibility**: Allow players to adjust difficulty on the fly

##### UI Integration Example

Here's how you might integrate difficulty selection in a rhythm game UI:

```typescript
import {
  AudioAnalyzer,
  EASY_ACCURACY_THRESHOLDS,
  MEDIUM_ACCURACY_THRESHOLDS,
  HARD_ACCURACY_THRESHOLDS,
} from 'playlist-data-engine';

// Display preset options to the player
const DIFFICULTY_OPTIONS = [
  {
    name: 'Easy',
    preset: 'easy',
    description: `Perfect: ±${EASY_ACCURACY_THRESHOLDS.perfect * 1000}ms`,
  },
  {
    name: 'Medium',
    preset: 'medium',
    description: `Perfect: ±${MEDIUM_ACCURACY_THRESHOLDS.perfect * 1000}ms`,
  },
  {
    name: 'Hard',
    preset: 'hard',
    description: `Perfect: ±${HARD_ACCURACY_THRESHOLDS.perfect * 1000}ms`,
  },
];

// Create stream based on player selection
function createGameStream(beatMap: BeatMap, audioContext: AudioContext, difficulty: DifficultyPreset) {
  return analyzer.createBeatStream(beatMap, audioContext, {
    difficultyPreset: difficulty
  });
}
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

```typescript
import {
    BeatMapGenerator,
    assignKeysToBeats,
    BeatStream,
} from 'playlist-data-engine';

const generator = new BeatMapGenerator();
const audioContext = new AudioContext();

// Step 1: Generate beat map
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');

// Step 2: Assign required keys to create a chart
const chartMap = assignKeysToBeats(beatMap, [
    { beatIndex: 0, key: 'left' },
    { beatIndex: 1, key: 'down' },
    { beatIndex: 2, key: 'up' },
    { beatIndex: 3, key: 'right' },
    // ... more assignments
]);

// Step 3: Use in gameplay
const beatStream = new BeatStream(chartMap, audioContext);
beatStream.start();

// Step 4: On player input
function onPlayerInput(physicalKey: string) {
    // Map physical input to logical key (frontend responsibility)
    const logicalKey = mapInputToKey(physicalKey); // e.g., 'ArrowUp' -> 'up'

    const result = beatStream.checkButtonPress(audioContext.currentTime, logicalKey);

    if (result.accuracy === 'wrongKey') {
        console.log(`Wrong key! Pressed ${result.pressedKey}, needed ${result.requiredKey}`);
    } else {
        console.log(`Accuracy: ${result.accuracy}`);
    }
}
```

### Easy Mode (Ignore Key Requirements)

For accessibility or easier gameplay, you can bypass key checking:

```typescript
// Easy mode: timing-only evaluation even if beat has required key
const easyStream = new BeatStream(chartMap, audioContext, {
    ignoreKeyRequirements: true,
});

// Player can press any key - only timing matters
const result = easyStream.checkButtonPress(timestamp, 'any-key');
// result.accuracy will be timing-based, never 'wrongKey'
```

### Key Assignment Best Practices

1. **Use consistent key names**: Pick a convention (e.g., lowercase: 'up', 'down', 'left', 'right')
2. **Assign keys after beat map generation**: Keys are assigned as a post-processing step
3. **Test with `hasRequiredKeys()`**: Verify a beat map is actually a chart before gameplay
4. **Use `getUsedKeys()` for UI**: Determine which buttons to display based on the chart

### Code Examples

#### Example 1: Creating a Simple 2-Key Chart

This example shows how to create a basic rhythm game chart with two keys (left and right):

```typescript
import {
    BeatMapGenerator,
    assignKeysToBeats,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
} from 'playlist-data-engine';

const generator = new BeatMapGenerator();

// Step 1: Generate the base beat map from audio
const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
console.log(`Generated ${beatMap.beats.length} beats`);

// Step 2: Create a simple 2-key chart by assigning keys to beats
// This creates an alternating left-right pattern
const assignments = beatMap.beats.map((_, index) => ({
    beatIndex: index,
    key: index % 2 === 0 ? 'left' : 'right',
}));

const chartMap = assignKeysToBeats(beatMap, assignments);

// Step 3: Verify the chart
console.log(`Has required keys: ${hasRequiredKeys(chartMap)}`); // true
console.log(`Key count: ${getKeyCount(chartMap)}`); // Same as beat count
console.log(`Keys used: ${getUsedKeys(chartMap).join(', ')}`); // "left, right"
```

#### Example 2: Checking Button Press with Key Validation

This example shows how to handle player input with key validation:

```typescript
import { BeatStream, type ButtonPressResult } from 'playlist-data-engine';

const audioContext = new AudioContext();
const beatStream = new BeatStream(chartMap, audioContext);
beatStream.start();

// Map physical keyboard inputs to logical keys
function mapInputToKey(physicalKey: string): string | null {
    const keyMap: Record<string, string> = {
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'ArrowUp': 'up',
        'ArrowDown': 'down',
    };
    return keyMap[physicalKey] ?? null;
}

// Handle player button press
function onPlayerInput(keyboardEvent: KeyboardEvent) {
    const logicalKey = mapInputToKey(keyboardEvent.key);
    if (!logicalKey) return; // Ignore unmapped keys

    const timestamp = audioContext.currentTime;
    const result: ButtonPressResult = beatStream.checkButtonPress(timestamp, logicalKey);

    // Handle different accuracy results
    switch (result.accuracy) {
        case 'wrongKey':
            console.log(`❌ Wrong key! Pressed '${result.pressedKey}', needed '${result.requiredKey}'`);
            console.log(`   Timing was: ${result.offset > 0 ? 'late' : 'early'} by ${Math.abs(result.offset).toFixed(3)}s`);
            break;
        case 'miss':
            console.log(`❌ Missed! No beat nearby or no key pressed when required`);
            break;
        case 'perfect':
        case 'great':
        case 'good':
        case 'ok':
            console.log(`✓ ${result.accuracy.toUpperCase()}! Key match: ${result.keyMatch}`);
            console.log(`   Offset: ${result.offset.toFixed(3)}s`);
            break;
    }
}

// Listen for keyboard input
document.addEventListener('keydown', onPlayerInput);
```

#### Example 3: Using ignoreKeyRequirements to Bypass Key Checking

This example shows how to create an easy mode where timing matters but key doesn't:

```typescript
import { BeatStream, type BeatStreamOptions } from 'playlist-data-engine';

const audioContext = new AudioContext();

// Normal mode: key requirements enforced
const normalOptions: BeatStreamOptions = {
    difficultyPreset: 'hard',
    ignoreKeyRequirements: false, // default
};
const normalStream = new BeatStream(chartMap, audioContext, normalOptions);
normalStream.start();

// Easy mode: timing-only evaluation, any key works
const easyOptions: BeatStreamOptions = {
    difficultyPreset: 'easy',
    ignoreKeyRequirements: true, // Bypass key checking
};
const easyStream = new BeatStream(chartMap, audioContext, easyOptions);
easyStream.start();

// Compare behavior with the same input
function testBothModes() {
    const timestamp = audioContext.currentTime;

    // Suppose beat 0 requires 'left' but player presses 'right'
    const normalResult = normalStream.checkButtonPress(timestamp, 'right');
    const easyResult = easyStream.checkButtonPress(timestamp, 'right');

    console.log('Normal mode:', normalResult.accuracy); // 'wrongKey'
    console.log('Easy mode:', easyResult.accuracy);     // Timing-based (e.g., 'perfect')

    // In easy mode, keyMatch is always true regardless of actual key
    console.log('Easy mode keyMatch:', easyResult.keyMatch); // true
}

// Use case: Let players choose their difficulty
function createStream(difficulty: 'easy' | 'normal' | 'hard'): BeatStream {
    const options: BeatStreamOptions = {
        difficultyPreset: difficulty,
        ignoreKeyRequirements: difficulty === 'easy',
    };
    return new BeatStream(chartMap, audioContext, options);
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

Each subdivision type can be assigned to individual beats. Here are simple examples using the per-beat format with a single beat:

#### Quarter Notes (No Change)

Default subdivision - beats pass through unchanged:

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'quarter']]),
  defaultSubdivision: 'quarter',
};
// Result: 1x density (unchanged)
```

#### Half Notes (0.5x Density)

Keeps beats on positions 0 and 2 (downbeats and beat 3s). Measure numbers are preserved from the original grid.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'half']]),
  defaultSubdivision: 'half',
};
// Original: 0, 1, 2, 3, 4, 5, 6, 7...
// Result:   0,    2,    4,    6...   (downbeats and beat 3s)
```

#### Eighth Notes (2x Density)

Inserts a new beat midway between each quarter note. Intensity/confidence is interpolated from neighboring beats.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'eighth']]),
  defaultSubdivision: 'eighth',
};
// Original: 0, 1, 2, 3...
// Result:   0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5...
```

#### Sixteenth Notes (4x Density - Maximum)

Inserts 3 beats evenly spaced between each quarter note. This is the **hard maximum** for density.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'sixteenth']]),
  defaultSubdivision: 'sixteenth',
};
// Original: 0, 1, 2, 3...
// Result:   0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2...
```

#### Eighth Triplets (3x Density)

Three beats per quarter note, creating a triplet feel.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'triplet8']]),
  defaultSubdivision: 'triplet8',
};
// Original: 0, 1, 2, 3...
// Result:   0, 0.33, 0.66, 1, 1.33, 1.66, 2, 2.33, 2.66...
```

#### Quarter Triplets (1.5x Density)

Three beats per half note - same density as eighth notes but different feel.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'triplet4']]),
  defaultSubdivision: 'triplet4',
};
// Original: 0, 1, 2, 3...
// Result:   0, 0.66, 1, 1.66, 2, 2.66, 3, 3.66...
```

#### Dotted Quarter (0.67x Density)

Phase-independent pattern that creates 3-beat groups in 4/4 time (cross-rhythm). Doesn't care about measure boundaries.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'dotted4']]),
  defaultSubdivision: 'dotted4',
};
// Pattern: 0, 1.5, 3, 4.5, 6... (every 1.5 quarter notes)
```

#### Dotted Eighth / Swing (2x Density)

Classic swing long-short pattern: long note is 2/3 of a quarter, short note is 1/3.

```typescript
const config: SubdivisionConfig = {
  beatSubdivisions: new Map([[0, 'dotted8']]),
  defaultSubdivision: 'dotted8',
};
// Pattern: 0, 0.667, 1, 1.667, 2, 2.667...
//          ├───long───┤short├───long───┤short┤
```

#### Rest (0x Density)

No beats generated - used for creating gaps in rhythm patterns. Perfect for syncopated rhythms or dramatic pauses.

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
// Result: Beats only at positions 0 and 2 (with eighths on 2)
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
    // Pre-render beat visual
    console.log(`Beat approaching in ${event.timeUntilBeat}s`);
  } else if (event.type === 'exact') {
    // Beat is happening now
    console.log('Beat!', event.beat);
  }
});

// Start playback
controller.play();
```

---

### Real-Time Subdivision Switching

Change subdivision during playback

```typescript
// User clicks "Eighth Notes" button in practice mode
document.getElementById('eighth-btn').onclick = () => {
  controller.setSubdivision('eighth');  // Switches in real-time!
};

// User clicks "Half Notes" button
document.getElementById('half-btn').onclick = () => {
  controller.setSubdivision('half');  // Slows down the beat grid
};

// User clicks "Quarter Notes" button
document.getElementById('quarter-btn').onclick = () => {
  controller.setSubdivision('quarter');  // Back to normal
};
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

Events are emitted at different times during playback:

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

---

### Practice Mode UI Concept

```
┌─────────────────────────────────────────────────────────────────┐
│  PRACTICE MODE - Song.mp3                                       │
│                                                                 │
│  [Quarter] [Eighth] [Half] [Triplets] [Swing]                   │
│     ↑                                                           │
│   (active)                                                      │
│                                                                 │
│  ▶ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                    ↑    ↑    ↑    ↑                             │
│                   beat events flow based on active              │
│                   subdivision type                              │
│                                                                 │
│  Current: Eighth Notes | Next beat in: 0.234s                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Use Cases for Real-Time Playground

| Use Case | Recommended |
|----------|-------------|
| Practice mode with dynamic difficulty | ✅ Yes |
| Learning rhythm patterns | ✅ Yes |
| Interactive beat visualization | ✅ Yes |
| Live performance tools | ✅ Yes |
| Pre-calculated level creation | ❌ Use SubdividedBeatMap directly |

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

| Hotness | Meaning | Window Size |
|---------|---------|-------------|
| 0% | No groove established | Full (1/32 note) |
| 50% | Moderate consistency | Tightened |
| 100% | Locked in | Minimum (15ms floor) |

**Progressive Tightening**: As hotness increases, the pocket window shrinks, requiring more precise consistency to maintain.

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

### Integration with BeatStream

The GrooveAnalyzer is a **standalone class**—it does not integrate directly with BeatStream. This separation provides flexibility:

| Component | Responsibility |
|-----------|----------------|
| `BeatStream` | Beat timing, synchronization, button press accuracy |
| `GrooveAnalyzer` | Feel/pocket tracking, style meter, consistency scoring |
| **Frontend** | Connects both, displays results |

```typescript
// Frontend integration during gameplay
const grooveAnalyzer = new GrooveAnalyzer();

// On each button press during gameplay
const buttonResult = beatStream.checkButtonPress(timestamp);
const grooveResult = grooveAnalyzer.recordHit(
    buttonResult.offset,
    beatStream.getCurrentBpm(),
    buttonResult.matchedBeat.time,  // Audio time from beat map (required)
    buttonResult.accuracy  // 'miss' or 'wrongKey' will decrease hotness (required)
);

// When user misses a beat (doesn't press)
grooveAnalyzer.recordMiss();

// Read the groove state for UI display
if (grooveResult.pocketDirection !== 'neutral') {
  console.log(`${grooveResult.pocketDirection} groove: ${grooveResult.hotness}%`);
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
| `hotnessLossOnBreak` | `number` | `20` | Hotness decrease on pocket break |
| `hotnessLossOnMiss` | `number` | `10` | Hotness decrease on missed beat |
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

---

### Result Types

#### GrooveResult (from `recordHit` / `recordMiss`)

| Property | Type | Description |
|----------|------|-------------|
| `pocketDirection` | `GrooveDirection` | Current pocket direction ('push', 'pull', 'neutral') |
| `establishedOffset` | `number` | Running average offset in seconds (pocket center) |
| `consistency` | `number` | How close hit was to pocket (0-1, quadratic falloff) |
| `hotness` | `number` | Current meter value (0-100) |
| `streakLength` | `number` | Current streak of consistent hits |
| `inPocket` | `boolean` | Whether this hit was within pocket window |
| `pocketWindow` | `number` | Current window size in seconds |
| `endedGrooveStats` | `GrooveStats \| undefined` | Stats from groove that just ended (present when hotness drops to 0 or direction changes push↔pull). Use for groove end bonus XP. |

#### GrooveState (from `getState`)

| Property | Type | Description |
|----------|------|-------------|
| `pocketDirection` | `GrooveDirection` | Established pocket direction |
| `establishedOffset` | `number` | Running average offset in seconds |
| `hotness` | `number` | Current meter value (0-100) |
| `streakLength` | `number` | Current streak of consistent hits |
| `hitCount` | `number` | Total hits recorded this session |
| `pocketWindow` | `number` | Current window size in seconds |
| `grooveStartTime` | `number \| null` | When current groove started (audio time), null if no active groove |
| `grooveDuration` | `number` | Duration of current groove in seconds (0 if no active groove) |
| `maxHotness` | `number` | Peak hotness reached during current groove (0-100) |
| `avgHotness` | `number` | Average hotness over groove lifetime (0-100) |
| `grooveHitCount` | `number` | Total hits in current groove |

#### GrooveStats (from `getGrooveStats` / `endedGrooveStats`)

| Property | Type | Description |
|----------|------|-------------|
| `maxStreak` | `number` | Peak streak during the groove |
| `maxHotness` | `number` | Peak hotness reached (0-100) |
| `avgHotness` | `number` | Average hotness over groove lifetime (0-100) |
| `duration` | `number` | How long the groove lasted in seconds |
| `totalHits` | `number` | Total hits in the groove |
| `startTime` | `number` | When groove started (audio time in seconds) |
| `endTime` | `number` | When groove ended (audio time in seconds) |

---

### BPM-Aware Window Calculation

The pocket window adapts to tempo:

```
beatDuration = 60 / BPM
thirtySecondNote = beatDuration / 8
baseWindow = thirtySecondNote × fraction
pocketWindow = baseWindow - (baseWindow - minWindow) × (hotness / 100)
```

| BPM | Base Window | At 50% Hotness | At 100% Hotness |
|-----|-------------|----------------|-----------------|
| 90 BPM | 41.7ms | 25.8ms | 15ms |
| 120 BPM | 31.3ms | 20.6ms | 15ms |
| 140 BPM | 26.8ms | 18.4ms | 15ms |

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
│  Hotness: ████████████░░░░░░░░ 62%                              │
│  Streak:  14 hits                                               │
│  Consistency: 0.87                                              │
│                                                                 │
│  "Locked in behind the beat!"                                   │
└─────────────────────────────────────────────────────────────────┘
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

When a groove ends (hotness drops to 0 or direction changes push↔pull), the `endedGrooveStats` are immediately available:

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
2. **Pocket direction changes** (push ↔ pull) - The player shifted from ahead to behind (or vice versa)

When the groove resets:
- `streakLength` → 0
- All lifetime stats captured in `endedGrooveStats` before reset
- Fresh tracking starts for the new groove

**Note:** Transitions to/from 'neutral' do NOT reset tracking - only push↔pull transitions.

---

## References

- [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)
- [librosa beat tracking implementation](https://librosa.org/doc/latest/generated/librosa.beat.beat_track.html)
- [librosa onset strength implementation](https://librosa.org/doc/latest/generated/librosa.onset.onset_strength.html)
