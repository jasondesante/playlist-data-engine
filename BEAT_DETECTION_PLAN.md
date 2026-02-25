# Beat Detection & Beat Stream Implementation Plan

## Overview

Implement a rhythm game support system that enables precise beat timing for gameplay. The system has two phases:

1. **Pre-Analysis Phase**: Analyze entire track to detect BPM, beats, downbeats → generates a BeatMap (JSON serializable)
2. **Gameplay Phase**: Stream beat events synchronized with audio playback using the BeatMap as ground truth

**Core Goal**: Provide beat timing data and synchronization primitives. The data engine provides the data stream - any visual/frontend implementation will be in `playlist-data-showcase`.

**Precision Target**: ±10ms (sample-accurate scheduling using Web Audio API)

**Scope Note**: This is the **data engine only** - no frontend/UI components. The data engine emits beat events and provides button press timing data. Building a playable rhythm game demo (visual feedback, note spawning, etc.) will be done in the `playlist-data-showcase` project.

---

## Phase 1: Type Definitions

Create the foundational types for the beat detection system.

- [ ] Create `/src/core/types/BeatMap.ts`
  - [ ] Define `Beat` interface (timestamp, beatInMeasure, isDownbeat, measureNumber, intensity, confidence)
  - [ ] Define `BeatMap` interface (audioId, duration, beats, tempoChanges, bpm, timeSignature, metadata)
  - [ ] Define `BeatMapMetadata` with version, algorithm info, adaptive threshold settings
  - [ ] Define `BeatEvent` interface (beat, currentBpm, audioTime, timeUntilBeat, type)
  - [ ] Define `BeatStreamCallback` type
  - [ ] Define `TempoChange` interface
  - [ ] Define `TimeSignature` interface
  - [ ] Define `AudioSyncState` interface
  - [ ] Define `BeatMapGeneratorOptions` interface
    - [ ] Include `minBpm` (default 75), `maxBpm` (default 150)
    - [ ] Include `intensityThreshold` (0.0-1.0, required for static mode)
    - [ ] Include `useAdaptiveThreshold` boolean (default false, experimental)
  - [ ] Define `BeatStreamOptions` interface
    - [ ] Include `anticipationTime` (default 0.5s)
    - [ ] Include `timingTolerance` (default 0.01s = 10ms)
  - [ ] Define `BeatMapJSON` interface for serialization (same as BeatMap but JSON-safe)

---

## Phase 2: Onset Detection

Implement the core algorithm for detecting note attacks (onsets/transients) in audio.

- [ ] Create `/src/core/analysis/beat/OnsetDetector.ts`
  - [ ] Implement constructor with fftSize and hopSize parameters
  - [ ] Implement `detectOnsets(audioBuffer, options)` method
  - [ ] Implement spectral flux calculation between consecutive FFT frames
  - [ ] Implement static threshold mode (required parameter `intensityThreshold`)
  - [ ] Implement peak finding in onset envelope
  - [ ] Leverage existing FFT infrastructure from AudioAnalyzer
  - [ ] Return onset times with strength values

- [ ] Create `/tests/unit/beat/onsetDetector.test.ts`
  - [ ] Test with synthetic click track (known onset times)
  - [ ] Test silence at start (no false beats)
  - [ ] Test onset strength assignment

---

## Phase 2.5: Adaptive Threshold (Experimental/Optional)

**Note**: This is an optional experimental feature that builds on top of the core onset detection. It may not work well for all audio types. Core onset detection uses a static threshold by default.

- [ ] Create `/src/core/analysis/beat/AdaptiveThreshold.ts`
  - [ ] Implement `calculateAdaptiveThreshold(onsetEnvelope, targetBpmRange)` method
  - [ ] If too many onsets detected → raise threshold
  - [ ] If too few onsets detected → lower threshold
  - [ ] Iterate until onset count falls within target range
  - [ ] Return final threshold value

### Adaptive Threshold Algorithm

```
Target onsets per second = (minBpm + maxBpm) / 2 / 60 = 1.875 onsets/sec
For a 3-minute song: ~337 onsets expected

Algorithm:
1. Calculate onset strength envelope using spectral flux
2. Set initial threshold at 50th percentile of envelope values
3. Count peaks above threshold
4. If count > expected * 1.2 → raise threshold by 10%
5. If count < expected * 0.8 → lower threshold by 10%
6. Repeat steps 3-5 until count is within range (max 5 iterations)
7. Return final threshold value in metadata for reproducibility
```

- [ ] Add optional `useAdaptiveThreshold` flag to `BeatMapGeneratorOptions`
  - [ ] When `true`: Use adaptive threshold algorithm
  - [ ] When `false` (default): Use static `intensityThreshold` parameter
- [ ] Create `/tests/unit/beat/adaptiveThreshold.test.ts`
  - [ ] Test adaptive threshold converges to expected BPM range
  - [ ] Mark tests as experimental

---

## Phase 3: Tempo Detection

Implement BPM detection using autocorrelation.

- [ ] Create `/src/core/analysis/beat/TempoDetector.ts`
  - [ ] Implement constructor with minBpm, maxBpm parameters
  - [ ] Implement `detectTempo(onsets, sampleRate, duration)` method
  - [ ] Implement autocorrelation of onset envelope
  - [ ] Implement peak selection in BPM range (75-150 default)
  - [ ] Implement `detectTempoChanges(onsets, sampleRate, duration)` method (basic version)
  - [ ] Implement time signature estimation (default 4/4)
- [ ] Create `/tests/unit/beat/tempoDetector.test.ts`
  - [ ] Test with known BPM click tracks
  - [ ] Test tempo detection accuracy within ±2 BPM

---

## Phase 4: Beat Map Generator

Orchestrate onset and tempo detection to generate complete beat maps.

- [ ] Create `/src/core/analysis/beat/BeatMapGenerator.ts`
  - [ ] Implement constructor with BeatMapGeneratorOptions
  - [ ] Implement `generateBeatMap(audioUrl, audioId)` method
  - [ ] Implement `generateBeatMapFromBuffer(audioBuffer, audioId)` method
  - [ ] Integrate OnsetDetector with adaptive threshold
  - [ ] Integrate TempoDetector for BPM
  - [ ] Implement downbeat detection (intensity pattern analysis)
  - [ ] Implement beat quantization to tempo grid
  - [ ] Implement `getProgress()` for progress tracking
  - [ ] Implement `cancel()` for cancellation
  - [ ] **JSON Serialization Support:**
    - [ ] `toJSON()` method - export beat map as JSON string
    - [ ] `fromJSON(jsonString)` static method - load beat map from JSON
    - [ ] `saveToFile(path)` - save to disk (Node.js only)
    - [ ] `loadFromFile(path)` - load from disk (Node.js only)

- [ ] Create `/tests/unit/beat/beatMapGenerator.test.ts`
  - [ ] Test full beat map generation
  - [ ] Test JSON serialization round-trip
  - [ ] Test progress reporting

---

## Phase 5: Beat Stream

Implement real-time beat event streaming synchronized with audio playback.

- [ ] Create `/src/core/analysis/beat/BeatStream.ts`
  - [ ] Implement constructor with BeatMap, AudioContext, and options
  - [ ] Implement `subscribe(callback)` returning unsubscribe function
  - [ ] Implement `start()` method
  - [ ] Implement `stop()` method
  - [ ] Implement `seek(time)` method for seeking
  - [ ] Implement audio clock synchronization:
    - [ ] Use `AudioContext.currentTime` as ground truth
    - [ ] Use `requestAnimationFrame` for smooth updates
    - [ ] Target ±10ms timing tolerance
  - [ ] Implement anticipation system:
    - [ ] Emit 'upcoming' events at configurable time before beat
    - [ ] Emit 'exact' event when beat time is reached
    - [ ] Emit 'passed' event if beat was missed
  - [ ] Implement `getUpcomingBeats(count)` for pre-rendering
  - [ ] Implement `getBeatAtTime(time)` query
  - [ ] Implement `getSyncState()` for debugging
  - [ ] **Button Press Detection:**
    - [ ] `checkButtonPress(timestamp)` - returns accuracy score
    - [ ] `getLastBeatAccuracy()` - returns how close last press was to beat
    - [ ] Define accuracy levels: Perfect (±10ms), Great (±25ms), Good (±50ms), Miss

- [ ] Create `/tests/unit/beat/beatStream.test.ts`
  - [ ] Test event emission order
  - [ ] Test anticipation timing
  - [ ] Test seeking behavior
  - [ ] Test button press accuracy detection

---

## Phase 6: Integration

Integrate beat detection with existing AudioAnalyzer and export public API.

- [ ] Modify `/src/core/analysis/AudioAnalyzer.ts`
  - [ ] Add `generateBeatMap(audioUrl, options)` method
  - [ ] Add `createBeatStream(beatMap, audioContext, options)` method
- [ ] Create `/src/core/analysis/beat/index.ts`
  - [ ] Export BeatMapGenerator
  - [ ] Export BeatStream
  - [ ] Export OnsetDetector
  - [ ] Export TempoDetector
  - [ ] Export utility functions (toJSON, fromJSON)
- [ ] Modify `/src/index.ts`
  - [ ] Export all beat-related types
  - [ ] Export all beat-related classes

---

## Phase 7: Integration Tests

Test the complete system with real audio files.

- [ ] Create `/tests/integration/beatDetection.integration.test.ts`
  - [ ] Test beat map generation with real audio URL
  - [ ] Test beat stream synchronization
  - [ ] Verify BPM detection accuracy (±2 BPM)
  - [ ] Verify beat timing accuracy (±10ms)
  - [ ] Test JSON save/load round-trip

---

## Phase 8: Documentation Update

Update documentation to reflect the new beat detection system.

### DATA_ENGINE_REFERENCE.md Updates

- [ ] Add Beat Detection types to [Quick Export Reference](#quick-export-reference) table
  - [ ] `BeatMapGenerator`, `BeatStream`, `OnsetDetector`, `TempoDetector`
  - [ ] Utility functions: `beatMapToJSON`, `beatMapFromJSON`
- [ ] Add new section: [Beat Detection System](#beat-detection-system)
  - [ ] Document `Beat` interface (timestamp, beatInMeasure, isDownbeat, measureNumber, intensity, confidence)
  - [ ] Document `BeatMap` interface (audioId, duration, beats, tempoChanges, bpm, timeSignature, metadata)
  - [ ] Document `BeatMapMetadata` (version, algorithm, threshold settings)
  - [ ] Document `BeatEvent` interface (beat, currentBpm, audioTime, timeUntilBeat, type)
  - [ ] Document `BeatStreamCallback` type
  - [ ] Document `TempoChange` interface
  - [ ] Document `TimeSignature` interface
  - [ ] Document `AudioSyncState` interface
  - [ ] Document `BeatMapGeneratorOptions` interface
  - [ ] Document `BeatStreamOptions` interface
  - [ ] Document `BeatMapJSON` interface
- [ ] Document `BeatMapGenerator` class
  - [ ] Constructor with `BeatMapGeneratorOptions`
  - [ ] `generateBeatMap(audioUrl, audioId)` method
  - [ ] `generateBeatMapFromBuffer(audioBuffer, audioId)` method
  - [ ] `getProgress()` method
  - [ ] `cancel()` method
  - [ ] `toJSON()`, `fromJSON()`, `saveToFile()`, `loadFromFile()` methods
- [ ] Document `BeatStream` class
  - [ ] Constructor with `BeatMap`, `AudioContext`, and options
  - [ ] `subscribe(callback)` method returning unsubscribe function
  - [ ] `start()`, `stop()`, `seek(time)` methods
  - [ ] `getUpcomingBeats(count)` method
  - [ ] `getBeatAtTime(time)` method
  - [ ] `getSyncState()` method
  - [ ] `checkButtonPress(timestamp)` method
  - [ ] `getLastBeatAccuracy()` method
- [ ] Document `OnsetDetector` class
  - [ ] Constructor with `fftSize`, `hopSize` parameters
  - [ ] `detectOnsets(audioBuffer, options)` method
- [ ] Document `TempoDetector` class
  - [ ] Constructor with `minBpm`, `maxBpm` parameters
  - [ ] `detectTempo(onsets, sampleRate, duration)` method
  - [ ] `detectTempoChanges(onsets, sampleRate, duration)` method
- [ ] Update Table of Contents with Beat Detection System section

### USAGE_IN_OTHER_PROJECTS.md Updates

- [ ] Add new section: [Beat Detection & Rhythm Games](#beat-detection--rhythm-games)
  - [ ] Add to Quick Links section at top
  - [ ] Add to Usage Examples index
- [ ] Add beat detection usage examples:
  - [ ] Basic BeatMap Generation - Generate beat map from audio URL
  - [ ] BeatMap Serialization - Save/load beat maps (JSON and file)
  - [ ] Beat Stream Setup - Subscribe to beat events during playback
  - [ ] Button Press Detection - Rhythm game input accuracy
  - [ ] Pre-rendering Beats - Get upcoming beats for visual spawning
  - [ ] Tempo Detection Only - BPM analysis without full beat map
- [ ] Add code examples showing:
  - [ ] Pre-analysis phase (BeatMap generation)
  - [ ] Gameplay phase (BeatStream with audio sync)
  - [ ] Anticipation system (upcoming/exact/passed events)
  - [ ] Accuracy levels (Perfect ±10ms, Great ±25ms, Good ±50ms, Miss)
- [ ] Note about scope: Data engine only (no UI/frontend)
- [ ] Reference to showcase project for visual implementation

### Documentation Style Guidelines

- Follow existing documentation patterns:
  - Use tables for type properties and method signatures
  - Include file locations for types (e.g., `src/core/types/BeatMap.ts`)
  - Provide code examples with TypeScript syntax
  - Cross-reference related sections with markdown links
  - Keep descriptions concise but complete

---

## Dependencies

- **Existing FFT infrastructure** in AudioAnalyzer - will be reused
- **web-audio-api polyfill** - already installed for testing
- **No new external dependencies** - custom implementation

---

## Questions/Unknowns

- [x] Precision requirement → **±10ms (sample-accurate)**
- [x] Serialization → **JSON with manual edit support**
- [x] Audio source → **Web Audio API (matches existing engine)**
- [x] Threshold handling → **Static threshold by default, adaptive threshold as optional experimental feature**
- [x] Beat events → **All beats + intensity-filtered option**
- [x] Scope → **Data engine only (no frontend). Frontend/demo in playlist-data-showcase**
- [ ] ~Section detection, measure tracking → Not in scope for now~

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/core/types/BeatMap.ts` | Create |
| `src/core/analysis/beat/OnsetDetector.ts` | Create |
| `src/core/analysis/beat/AdaptiveThreshold.ts` | Create (Experimental) |
| `src/core/analysis/beat/TempoDetector.ts` | Create |
| `src/core/analysis/beat/BeatMapGenerator.ts` | Create |
| `src/core/analysis/beat/BeatStream.ts` | Create |
| `src/core/analysis/beat/index.ts` | Create |
| `src/core/analysis/AudioAnalyzer.ts` | Modify |
| `src/index.ts` | Modify |
| `tests/unit/beat/*.test.ts` | Create |
| `tests/integration/beatDetection.integration.test.ts` | Create |
| `DATA_ENGINE_REFERENCE.md` | Modify (Phase 8) |
| `USAGE_IN_OTHER_PROJECTS.md` | Modify (Phase 8) |

---

## Verification

After implementation:
1. Run `npm test` - all tests pass
2. Generate beat map for test audio
3. Play audio and verify beat events align with audible beats
4. Test button press detection with ±10ms accuracy
5. Verify documentation updated:
   - DATA_ENGINE_REFERENCE.md includes Beat Detection System section
   - USAGE_IN_OTHER_PROJECTS.md includes beat detection examples
   - All new types, classes, and methods documented

---

## Usage Example (Post-Implementation)

**Note**: This example shows the data engine API. Frontend implementation (visual feedback, note spawning, UI) will be in `playlist-data-showcase`.

```typescript
import { BeatMapGenerator, BeatStream } from 'playlist-data-engine';

// === PRE-ANALYSIS (Data Engine) ===
const generator = new BeatMapGenerator({
  minBpm: 75,
  maxBpm: 150,
  intensityThreshold: 0.3  // Static threshold (required)
  // useAdaptiveThreshold: true  // Optional experimental feature
});

const beatMap = await generator.generateBeatMap('song.mp3', 'track-001');

// Save for later (manual editing possible!)
const json = beatMap.toJSON();
// Edit in text editor if needed
// beatMap = BeatMap.fromJSON(editedJson);

// === GAMEPLAY (Data Engine provides data, showcase provides UI) ===
const audioContext = new AudioContext();
const beatStream = new BeatStream(beatMap, audioContext, {
  anticipationTime: 0.5,
  timingTolerance: 0.01  // 10ms
});

// Subscribe to beat events (data engine emits these)
const unsubscribe = beatStream.subscribe((event) => {
  // Data engine provides the event data
  // playlist-data-showcase would handle visual feedback here
  console.log(`Beat at ${event.beat.timestamp}s`, event.type);
});

// Button press detection (data engine provides accuracy data)
function onButtonPress() {
  const accuracy = beatStream.checkButtonPress(audioContext.currentTime);
  // accuracy: 'perfect' | 'great' | 'good' | 'miss'
  // playlist-data-showcase would show visual feedback
  return accuracy;
}

// Start streaming beat data
audioElement.play();
beatStream.start();
```

### Frontend Integration (playlist-data-showcase)

The showcase project would consume the data engine's events:
- `event.type === 'upcoming'` → Spawn note on screen
- `event.type === 'exact'` → Flash beat marker
- `checkButtonPress()` result → Show "Perfect!"/"Great!"/etc.
