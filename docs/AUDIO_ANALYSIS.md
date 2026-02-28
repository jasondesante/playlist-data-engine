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
| **OnsetStrengthEnvelope** | [src/core/analysis/beat/OnsetStrengthEnvelope.ts](../src/core/analysis/beat/OnsetStrengthEnvelope.ts) |
| **BeatTracker** (Ellis DP) | [src/core/analysis/beat/BeatTracker.ts](../src/core/analysis/beat/BeatTracker.ts) |
| **TempoDetector** | [src/core/analysis/beat/TempoDetector.ts](../src/core/analysis/beat/TempoDetector.ts) |
| **DownbeatDetector** | [src/core/analysis/beat/DownbeatDetector.ts](../src/core/analysis/beat/DownbeatDetector.ts) |
| **Beat Types** | [src/core/types/BeatMap.ts](../src/core/types/BeatMap.ts) |
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
| `beatInMeasure` | `number` | Position in measure (0 = downbeat) |
| `isDownbeat` | `boolean` | Whether this is the first beat of a measure |
| `measureNumber` | `number` | Measure index (0-indexed) |
| `intensity` | `number` | Onset strength (0-1, normalized) |
| `confidence` | `number` | Detection confidence (0-1) |

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

**Note**: BPM is calculated dynamically during playback from actual beat intervals, not stored as a static value.

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

#### BeatMapGeneratorOptions

Configuration for beat map generation:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `minBpm` | `number` | 60 | Minimum BPM to detect |
| `maxBpm` | `number` | 180 | Maximum BPM to detect |
| `sensitivity` | `number` | 1.0 | Pre-processing sensitivity (0.1-10.0) |
| `filter` | `number` | 0.0 | Post-processing grid-alignment filter (0.0-1.0) |
| `noiseFloorThreshold` | `number` | 0.1 | Noise floor threshold |
| `hopSizeMs` | `number` | 10 | Milliseconds between FFT frames |
| `fftSize` | `number` | 2048 | FFT window size in samples |
| `rollingBpmWindowSize` | `number` | 8 | Beats for rolling BPM calculation |
| `dpAlpha` | `number` | 680 | Ellis balance factor |
| `melBands` | `number` | 40 | Mel frequency bands for OSE |
| `highPassCutoff` | `number` | 0.4 | High-pass filter cutoff (Hz) |
| `gaussianSmoothMs` | `number` | 20 | Gaussian smoothing window (ms) |
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
| `generateBeatMap` | `audioUrl`, `audioId`, `onProgress?` | `Promise<BeatMap>` | Generate beat map from audio URL |
| `generateBeatMapFromBuffer` | `audioBuffer`, `audioId`, `onProgress?` | `Promise<BeatMap>` | Generate from decoded AudioBuffer |
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
| `checkButtonPress` | `timestamp: number` | `ButtonPressResult` | Check button press accuracy |
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
| `hopSizeMs` | `number` | 10 | Hop size (ms) |
| `melBands` | `number` | 40 | Number of Mel bands |
| `highPassCutoff` | `number` | 0.4 | High-pass filter cutoff (Hz) |
| `gaussianSmoothMs` | `number` | 20 | Smoothing window (ms) |

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

  // Result.accuracy is one of: 'perfect' | 'great' | 'good' | 'ok' | 'miss'
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
- **Time signature agnostic**: We detect beats, not measures. Downbeats identified by intensity pattern.

---

### Scope Note

This is the **data engine only** — no frontend/UI components. The data engine emits beat events and provides button press timing data. Building a playable rhythm game demo (visual feedback, note spawning, etc.) should be done in a separate frontend project (e.g., `playlist-data-showcase`).

The data engine provides:
- Beat event stream (`upcoming`, `exact`, `passed`)
- Button press accuracy detection (`perfect`, `great`, `good`, `ok`, `miss`)
- Configurable difficulty presets (easy, medium, hard) and custom thresholds
- Rolling BPM calculation
- Beat pre-rendering data

The frontend provides:
- Visual note spawning
- Animation and effects
- User interface
- Score display

---

## References

- [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)
- [librosa beat tracking implementation](https://librosa.org/doc/latest/generated/librosa.beat.beat_track.html)
- [librosa onset strength implementation](https://librosa.org/doc/latest/generated/librosa.onset.onset_strength.html)
