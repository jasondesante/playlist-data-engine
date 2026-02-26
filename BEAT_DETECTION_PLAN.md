# Beat Detection & Beat Stream Implementation Plan

## Overview

Implement a rhythm game support system that enables precise beat timing for gameplay. The system has two phases:

1. **Pre-Analysis Phase**: Analyze entire track to detect beats and identify downbeats → generates a BeatMap (JSON serializable)
2. **Gameplay Phase**: Stream beat events synchronized with audio playback using the BeatMap as ground truth

**Core Goal**: Provide beat timing data and synchronization primitives. The data engine provides the data stream - any visual/frontend implementation will be in `playlist-data-showcase`.

**Precision Target**: ±10ms (sample-accurate scheduling using Web Audio API)

**Scope Note**: This is the **data engine only** - no frontend/UI components. The data engine emits beat events and provides button press timing data. Building a playable rhythm game demo (visual feedback, note spawning, etc.) will be done in the `playlist-data-showcase` project.

---

## Key Design Principles

### Dynamic Programming Beat Tracking (State-of-the-Art)

Unlike simple onset detection or moving-window predictions, this system will utilize a **Dynamic Programming approach** for offline analysis.

> [!NOTE]
> **What is the Ellis Algorithm?**
> This approach is based on Daniel P.W. Ellis's seminal 2007 paper *"Beat Tracking by Dynamic Programming"* (which is the foundation for tools like python's `librosa` beat tracker). Instead of guessing beats one by one as the song plays, it recursively analyzes the entire audio file to find the absolutely perfect sequence of beats. It guarantees finding the best possible rhythmic path through the song, ignoring localized mistakes or complex drum fills that often trick real-time algorithms.
>
> *Reference: [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)*

This approach guarantees finding the globally optimal beat sequence for the entire track:

1. **Extract Onset Strength Envelope (OSE)**: Compute bass-weighted spectral flux to highlight transient moments across all audio frames.
2. **Global Tempo Estimation**: Use autocorrelation on the OSE to find the dominant tempo or tempo period (estimating the song's base BPM).
3. **Dynamic Programming Search**: Algorithmically find the sequence of beats that maximizes two scores simultaneously:
   - *Observation Score*: Beats should align precisely with peaks in the Onset Strength Envelope.
   - *Transition Score*: The time interval between beats should remain consistent with the estimated base tempo.
4. **Natural Subdivision Filtering**: The mathematical penalty for deviating from the target tempo automatically filters out 8th/16th note subdivisions; placing a beat on every subdivision would severely violate the tempo transition score, meaning the math naturally rejects "off-beats".

### Fluid Tempo Handling

- **No grid quantization**: Beat timestamps are the actual detected moments, not snapped to a BPM grid
- **Rolling BPM calculation**: Current BPM is derived from the actual intervals between recent beats
- **Works with drifting tempo**: Songs without click tracks naturally flow - the detection follows
- **Time signature agnostic**: We detect beats, not measures. Downbeats identified by intensity pattern.

### Human-Like Quantization

The "quantization" we do is labeling, not grid-snapping:
- Detected onset at `0.52s` stays at `0.52s` (not forced to `0.50s`)
- We assign `beatInMeasure` labels based on intensity patterns
- BPM flows naturally because we measure actual intervals, not theoretical grids

---

## Phase 1: Type Definitions

Create the foundational types for the beat detection system.

- [ ] Create `/src/core/types/BeatMap.ts`
  - [ ] Define `Beat` interface (timestamp, beatInMeasure, isDownbeat, measureNumber, intensity, confidence)
  - [ ] Define `BeatMap` interface (audioId, duration, beats, bpm, metadata)
    - Note: No `tempoChanges` array - BPM is calculated dynamically from beat intervals
    - Note: No `timeSignature` - we detect beats, not measures. Downbeats identified by intensity.
  - [ ] Define `BeatMapMetadata` with version, algorithm info, threshold settings
  - [ ] Define `BeatEvent` interface (beat, currentBpm, audioTime, timeUntilBeat, type)
  - [ ] Define `BeatStreamCallback` type
  - [ ] Define `AudioSyncState` interface
  - [ ] Define `BeatMapGeneratorOptions` interface
    - [ ] Include `minBpm` (default 60), `maxBpm` (default 180)
    - [ ] Include `intensityThreshold` (0.0-1.0, default 0.3)
    - [ ] Include `noiseFloorThreshold` (default 0.1) - minimum threshold to prevent noise detection
    - [ ] Include `hopSizeMs` (default 10) - milliseconds between FFT frames
    - [ ] Include `fftSize` (default 2048) - FFT window size
    - [ ] Include `rollingBpmWindowSize` (default 8) - number of beats for rolling BPM calculation
    - [ ] Include `dpPenaltyFactor` (default 1.0) - weight of tempo consistency vs onset strength
  - [ ] Define `BeatStreamOptions` interface
    - [ ] Include `anticipationTime` (default 2.0s) - time before beat to emit 'upcoming' event
    - [ ] Include `userOffsetMs` (default 0) - player-calibrated audio/visual offset
    - [ ] Include `compensateOutputLatency` (default true) - auto-adjust using AudioContext.outputLatency
    - [ ] Include `timingTolerance` (default 0.01s = 10ms)
  - [ ] Define `BeatMapJSON` interface for serialization (same as BeatMap but JSON-safe)

---

## Phase 2: Onset Detection & Predictive Beat Tracking

Implement the core algorithm for detecting note attacks (onsets/transients) and tracking the true pulse.

### 2.1: Onset Detector

- [ ] Create `/src/core/analysis/beat/OnsetDetector.ts`
  - [ ] Implement constructor with fftSize and hopSize parameters (default: 2048, 10ms)
  - [ ] Implement `detectOnsets(audioBuffer, options)` method
  - [ ] Implement spectral flux calculation between consecutive FFT frames
  - [ ] Implement bass-weighted spectral flux (focus on 20-400Hz for beat detection)
  - [ ] Implement threshold filtering with noise floor (minimum 0.1)
  - [ ] Implement peak finding in onset envelope
  - [ ] Leverage existing FFT infrastructure from AudioAnalyzer (`performFFT`, `extractAudioSegment`)
  - [ ] Return onset times with strength values

### 2.2: Dynamic Programming Beat Tracker

- [ ] Create `/src/core/analysis/beat/BeatTracker.ts`
  - [ ] Implement `trackBeats(onsetEnvelope, estimatedTempo, options)` method
  - [ ] Implement Dynamic Programming beat tracking algorithm (based on the Ellis algorithm):
    ```
    1. Calculate target inter-beat interval from estimated tempo.
    2. Define objective function: Score = Onset Strength - (Penalty * Tempo Deviation).
    3. Forward pass: For each time frame, find best previous beat time that maximizes cumulative score.
    4. Store back-pointers to trace the optimal path.
    5. Backward pass: Start from highest scoring beat near the end and trace back to get sequence.
    ```
  - [ ] Algorithm automatically handles subdivisions by penalizing large deviations from the target tempo interval.
  - [ ] Implement rolling BPM calculation (average of last N beat intervals) for the output BeatMap.
  - [ ] Handle edge cases:
    - [ ] Silence sections (no onsets) → DP automatically steps forward by target interval with 0 onset score.
    - [ ] Tempo changes → DP algorithm naturally accommodates gradual tempo drift within penalty bounds.

### 2.3: Downbeat Detection

- [ ] Implement downbeat detection in `BeatTracker.ts`
  - [ ] Analyze intensity pattern across accepted beats
  - [ ] Identify the "one" by finding strongest beat in repeating pattern
  - [ ] Assign `beatInMeasure` based on intensity pattern (not time signature assumption)
  - [ ] Mark `isDownbeat` for the strongest beats in the pattern
  - [ ] Handle songs that start mid-measure (don't assume first beat = downbeat)

### Tests

- [ ] Create `/tests/unit/beat/onsetDetector.test.ts`
  - [ ] Test with synthetic click track (known onset times)
  - [ ] Test silence at start (no false beats)
  - [ ] Test onset strength assignment
  - [ ] Test bass-weighted flux vs standard flux

- [ ] Create `/tests/unit/beat/beatTracker.test.ts`
  - [ ] Test with known BPM click tracks (quarter notes only)
  - [ ] Test filtering of 8th notes (should only accept quarter notes)
  - [ ] Test filtering of 16th notes
  - [ ] Test rolling BPM calculation accuracy
  - [ ] Test tempo drift handling (gradual BPM change)
  - [ ] Test silence section handling
  - [ ] Test downbeat detection with emphasized first beats

---

## Phase 3: Tempo Detection (Simplified)

Since BPM is calculated dynamically from beat intervals, tempo detection is simplified to initial BPM estimation.

- [ ] Create `/src/core/analysis/beat/TempoDetector.ts`
  - [ ] Implement `estimateInitialBpm(onsets, options)` method
  - [ ] Use autocorrelation of onset envelope for initial estimate
  - [ ] Return BPM range hint for BeatTracker initialization
  - [ ] No time signature estimation - we detect beats, not measures

- [ ] Create `/tests/unit/beat/tempoDetector.test.ts`
  - [ ] Test initial BPM estimation with known BPM click tracks
  - [ ] Test BPM estimation accuracy within ±5 BPM

---

## Phase 4: Beat Map Generator

Orchestrate onset detection and beat tracking to generate complete beat maps.

- [ ] Create `/src/core/analysis/beat/BeatMapGenerator.ts`
  - [ ] Implement constructor with BeatMapGeneratorOptions
  - [ ] Implement `generateBeatMap(audioUrl, audioId)` method
  - [ ] Implement `generateBeatMapFromBuffer(audioBuffer, audioId)` method
  - [ ] Integrate OnsetDetector for raw onset detection
  - [ ] Integrate BeatTracker for Dynamic Programming pulse tracking
  - [ ] Integrate TempoDetector for initial BPM estimation
  - [ ] Implement `getProgress()` for progress tracking
  - [ ] Implement `cancel()` for cancellation
  - [ ] **JSON Serialization Support:**
    - [ ] `toJSON()` method - export beat map as JSON string
    - [ ] `fromJSON(jsonString)` static method - load beat map from JSON
    - [ ] `saveToFile(path)` - save to disk (Node.js only)
    - [ ] `loadFromFile(path)` - load from disk (Node.js only)

### BeatMap Contents

The generated BeatMap contains:
- `beats[]` - Array of detected beats with timestamps (actual detected times, not grid-snapped)
- `bpm` - Initial BPM estimate (actual BPM calculated dynamically during playback)
- `metadata` - Algorithm settings, threshold used, etc.

Note: BPM is NOT stored as a single value or array of tempo changes. The front-end calculates current BPM from the actual beat intervals using the rolling window.

- [ ] Create `/tests/unit/beat/beatMapGenerator.test.ts`
  - [ ] Test full beat map generation
  - [ ] Test JSON serialization round-trip
  - [ ] Test progress reporting
  - [ ] Test with songs containing tempo drift

---

## Phase 5: Beat Stream

Implement real-time beat event streaming synchronized with audio playback.

- [ ] Create `/src/core/analysis/beat/BeatStream.ts`
  - [ ] Implement constructor with BeatMap, AudioContext, and options
  - [ ] Implement `subscribe(callback)` returning unsubscribe function
  - [ ] Implement `start()` method
  - [ ] Implement `stop()` method
  - [ ] Implement `seek(time)` method for seeking
  - [ ] Implement audio clock synchronization & Latency Compensation:
    - [ ] Use `AudioContext.currentTime` as ground truth.
    - [ ] Apply `AudioContext.outputLatency` and `baseLatency` to align logic with actual audio output.
    - [ ] Apply user-calibrated `userOffsetMs` to accommodate specific hardware delay.
    - [ ] Use a lookahead queue with `requestAnimationFrame` or Web Workers to schedule events slightly in the future.
    - [ ] Target sample-accurate scheduling for audio, and ±10ms timing precision for visual events.
  - [ ] Implement anticipation system:
    - [ ] Emit 'upcoming' events ahead of time (e.g., 2.0s) so UI can spawn elements.
    - [ ] Emit 'exact' event when the true synchronized beat time is reached.
    - [ ] Emit 'passed' event if beat was missed.
  - [ ] Implement `getUpcomingBeats(count)` for pre-rendering animations
  - [ ] Implement `getBeatAtTime(time)` query
  - [ ] Implement `getSyncState()` for debugging
  - [ ] Implement rolling BPM calculation:
    - [ ] `getCurrentBpm()` - returns BPM calculated from recent beat intervals
    - [ ] Configurable window size (default 8 beats)
  - [ ] **Button Press Detection:**
    - [ ] `checkButtonPress(timestamp)` - returns accuracy score
    - [ ] `getLastBeatAccuracy()` - returns how close last press was to beat
    - [ ] Define accuracy levels: Perfect (±10ms), Great (±25ms), Good (±50ms), Miss

- [ ] Create `/tests/unit/beat/beatStream.test.ts`
  - [ ] Test event emission order
  - [ ] Test anticipation timing (2.0s default)
  - [ ] Test seeking behavior
  - [ ] Test button press accuracy detection
  - [ ] Test rolling BPM calculation during playback

---

## Phase 6: Integration

Integrate beat detection with existing AudioAnalyzer and export public API.

- [ ] Modify `/src/core/analysis/AudioAnalyzer.ts`
  - [ ] Add `generateBeatMap(audioUrl, options)` method
  - [ ] Add `createBeatStream(beatMap, audioContext, options)` method
  - [ ] Make `performFFT` and `extractAudioSegment` accessible to beat detection classes
- [ ] Create `/src/core/analysis/beat/index.ts`
  - [ ] Export BeatMapGenerator
  - [ ] Export BeatStream
  - [ ] Export OnsetDetector
  - [ ] Export BeatTracker
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
  - [ ] `BeatMapGenerator`, `BeatStream`, `OnsetDetector`, `BeatTracker`, `TempoDetector`
  - [ ] Utility functions: `beatMapToJSON`, `beatMapFromJSON`
- [ ] Add new section: [Beat Detection System](#beat-detection-system)
  - [ ] Document `Beat` interface (timestamp, beatInMeasure, isDownbeat, intensity, confidence)
  - [ ] Document `BeatMap` interface (audioId, duration, beats, bpm, metadata)
  - [ ] Document `BeatMapMetadata` (version, algorithm, threshold settings)
  - [ ] Document `BeatEvent` interface (beat, currentBpm, audioTime, timeUntilBeat, type)
  - [ ] Document `BeatStreamCallback` type
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
  - [ ] `getCurrentBpm()` method (rolling BPM)
  - [ ] `checkButtonPress(timestamp)` method
  - [ ] `getLastBeatAccuracy()` method
- [ ] Document `OnsetDetector` class
  - [ ] Constructor with `fftSize`, `hopSizeMs` parameters
  - [ ] `detectOnsets(audioBuffer, options)` method
- [ ] Document `BeatTracker` class
  - [ ] `trackBeats(onsetEnvelope, estimatedTempo, options)` method
  - [ ] Dynamic Programming beat tracking algorithm
  - [ ] Subdivision filtering via DP penalty
  - [ ] Rolling BPM calculation
- [ ] Document `TempoDetector` class
  - [ ] `estimateInitialBpm(onsets, options)` method
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
  - [ ] Rolling BPM - Get current tempo during playback
- [ ] Add code examples showing:
  - [ ] Pre-analysis phase (BeatMap generation)
  - [ ] Gameplay phase (BeatStream with audio sync)
  - [ ] Anticipation system (upcoming/exact/passed events at 2.0s)
  - [ ] Accuracy levels (Perfect ±10ms, Great ±25ms, Good ±50ms, Miss)
  - [ ] Rolling BPM calculation
- [ ] Note about scope: Data engine only (no UI/frontend)
- [ ] Reference to showcase project for visual implementation
- [ ] Document fluid tempo handling and Dynamic Programming beat tracking

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
- [x] Threshold handling → **Static threshold with noise floor (0.1 minimum)**
- [x] Beat events → **All beats with predictive filtering of subdivisions**
- [x] Scope → **Data engine only (no frontend). Frontend/demo in playlist-data-showcase**
- [x] Tempo handling → **Fluid/rolling BPM calculated from actual beat intervals, not grid-based**
- [x] Time signature → **Time signature agnostic - we detect beats, not measures**
- [x] Anticipation time → **2.0s default for animation pre-rendering**
- [x] Hop size → **10ms default, configurable**
- [x] Subdivision filtering → **Dynamic Programming with tempo transition penalty**

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/core/types/BeatMap.ts` | Create |
| `src/core/analysis/beat/OnsetDetector.ts` | Create |
| `src/core/analysis/beat/BeatTracker.ts` | Create |
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
  minBpm: 60,
  maxBpm: 180,
  intensityThreshold: 0.3,
  noiseFloorThreshold: 0.1,      // Minimum threshold to prevent noise
  hopSizeMs: 10,                  // 10ms between FFT frames
  rollingBpmWindowSize: 8,        // Calculate BPM from last 8 beats
  dpPenaltyFactor: 1.0            // DP weight for tempo consistency
});

const beatMap = await generator.generateBeatMap('song.mp3', 'track-001');

// BeatMap contains actual detected beat timestamps (not grid-snapped)
// BPM is calculated dynamically during playback from beat intervals

// Save for later (manual editing possible!)
const json = beatMap.toJSON();
// Edit in text editor if needed
// beatMap = BeatMap.fromJSON(editedJson);

// === GAMEPLAY (Data Engine provides data, showcase provides UI) ===
const audioContext = new AudioContext();
const beatStream = new BeatStream(beatMap, audioContext, {
  anticipationTime: 2.0,          // 2 seconds for animation pre-rendering
  timingTolerance: 0.01,          // 10ms
  userOffsetMs: 0,                // Adjustable player latency offset
  compensateOutputLatency: true   // Auto-adjust for hardware/OS delay
});

// Subscribe to beat events (data engine emits these)
const unsubscribe = beatStream.subscribe((event) => {
  // Data engine provides the event data
  // playlist-data-showcase would handle visual feedback here
  console.log(`Beat at ${event.beat.timestamp}s`, event.type);
  console.log(`Current BPM: ${beatStream.getCurrentBpm()}`);
});

// Get upcoming beats for pre-rendering (2s anticipation gives plenty of time)
const upcoming = beatStream.getUpcomingBeats(10);
// Use these to spawn notes/animations that arrive exactly on beat

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
- `event.type === 'upcoming'` (2s before beat) → Spawn note on screen, begin animation
- `event.type === 'exact'` → Flash beat marker, note reaches target
- `checkButtonPress()` result → Show "Perfect!"/"Great!"/etc.
- `getCurrentBpm()` → Display current tempo, adjust animation speed

### Fluid Tempo Example

For songs with drifting tempo:
```typescript
// BPM is calculated from actual beat intervals, not a static value
beatStream.subscribe((event) => {
  const currentBpm = beatStream.getCurrentBpm();
  // If the band slows down, BPM naturally decreases
  // If they speed up, BPM naturally increases
  // No tempo change detection needed - it's automatic
});
```
