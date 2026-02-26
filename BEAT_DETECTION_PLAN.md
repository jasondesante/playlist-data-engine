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

### Dynamic Programming Beat Tracking (Ellis Algorithm)

This implementation is based on Daniel P.W. Ellis's seminal 2007 paper *"Beat Tracking by Dynamic Programming"* - the foundation for Python's `librosa` beat tracker.

> [!NOTE]
> **Why the Ellis Algorithm?**
> Unlike real-time beat detection that guesses beats one-by-one, the Ellis algorithm recursively analyzes the entire audio file to find the **globally optimal** beat sequence. It guarantees finding the best possible rhythmic path through the song by:
> - Maximizing alignment with onset strength peaks (where beats "sound" like they should be)
> - Minimizing deviation from consistent tempo intervals (beats should be evenly spaced)
> - Automatically filtering subdivisions through mathematical penalties
>
> *Reference: [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)*

### The Ellis Objective Function

The algorithm finds beat times {t₁, t₂, ..., tₙ} that maximize:

```
C({ti}) = Σ O(ti) + α Σ F(ti - ti-1, τp)
```

Where:
- **O(t)** = Onset Strength Envelope (high at moments that make good beats)
- **F(Δt, τ)** = Transition cost function (penalizes tempo deviation)
- **α** = Balance factor (paper found optimal: **α = 680**)
- **τp** = Target inter-beat interval (from tempo estimation)

### Transition Cost Function (Critical for Subdivision Filtering)

```
F(Δt, τ) = -(log(Δt/τ))²
```

This function:
- Returns **0** when Δt = τ (perfect tempo match)
- Becomes **increasingly negative** for larger deviations
- Is **symmetric on log-time axis**: F(kτ, τ) = F(τ/k, τ)
- **Naturally filters subdivisions**: Placing beats on 8th/16th notes severely violates tempo consistency, so the math rejects them

### Key Paper Findings

| Parameter | Paper Value | Notes |
|-----------|-------------|-------|
| Time step | 4 ms | We'll use 10ms (good enough) |
| STFT window | 32 ms | We'll use 2048 samples @ 44.1kHz ≈ 46ms |
| Mel bands | 40 | For perceptual weighting |
| Predecessor search range | τp/2 to 2τp | Limits DP search window |
| **α (balance factor)** | **100-680** | Higher = stricter tempo adherence |
| Tempo center | 0.5s (120 BPM) | Human perception bias |
| Tempo width (στ) | 0.9-1.4 octaves | Perceptual weighting |
| Beat timing accuracy | 46.5 ms std dev | Limited by human transcriber variance |
| Beat accuracy (correct tempo) | 86.6% | When tempo matches ground truth |

### Fluid Tempo Handling

- **No grid quantization**: Beat timestamps are the actual detected moments, not snapped to a BPM grid
- **Rolling BPM calculation**: Current BPM is derived from the actual intervals between recent beats
- **Works with drifting tempo**: The DP algorithm naturally accommodates gradual tempo drift within ±10% of target
- **Time signature agnostic**: We detect beats, not measures. Downbeats identified by intensity pattern.

### Human-Like Quantization

The "quantization" we do is labeling, not grid-snapping:
- Detected onset at `0.52s` stays at `0.52s` (not forced to `0.50s`)
- We assign `beatInMeasure` labels based on intensity patterns
- BPM flows naturally because we measure actual intervals, not theoretical grids

---

## Phase 1: Type Definitions

Create the foundational types for the beat detection system.

- [x] Create `/src/core/types/BeatMap.ts`
  - [x] Define `Beat` interface (timestamp, beatInMeasure, isDownbeat, measureNumber, intensity, confidence)
  - [x] Define `BeatMap` interface (audioId, duration, beats, bpm, metadata)
    - Note: No `tempoChanges` array - BPM is calculated dynamically from beat intervals
    - Note: No `timeSignature` - we detect beats, not measures. Downbeats identified by intensity.
  - [x] Define `BeatMapMetadata` with version, algorithm info, threshold settings
  - [x] Define `BeatEvent` interface (beat, currentBpm, audioTime, timeUntilBeat, type)
  - [x] Define `BeatStreamCallback` type
  - [x] Define `AudioSyncState` interface
  - [x] Define `BeatMapGeneratorOptions` interface
    - [x] Include `minBpm` (default 60), `maxBpm` (default 180)
    - [x] Include `intensityThreshold` (0.0-1.0, default 0.3)
    - [x] Include `noiseFloorThreshold` (default 0.1) - minimum threshold to prevent noise detection
    - [x] Include `hopSizeMs` (default 10) - milliseconds between FFT frames
    - [x] Include `fftSize` (default 2048) - FFT window size
    - [x] Include `rollingBpmWindowSize` (default 8) - number of beats for rolling BPM calculation
    - [x] Include `dpAlpha` (default 680) - Ellis balance factor for tempo consistency vs onset strength
      - Higher values = stricter tempo adherence (good for songs with clear beats)
      - Lower values = more flexibility for songs with weak/irregular beats
    - [x] Include `melBands` (default 40) - number of Mel frequency bands for OSE
    - [x] Include `highPassCutoff` (default 0.4) - Hz, removes DC offset from OSE
    - [x] Include `gaussianSmoothMs` (default 20) - Gaussian smoothing window for OSE
    - [x] Include `tempoCenter` (default 0.5) - seconds, center of tempo perception bias (120 BPM)
    - [x] Include `tempoWidth` (default 1.4) - octaves, width of tempo perception weighting
  - [x] Define `BeatStreamOptions` interface
    - [x] Include `anticipationTime` (default 2.0s) - time before beat to emit 'upcoming' event
    - [x] Include `userOffsetMs` (default 0) - player-calibrated audio/visual offset
    - [x] Include `compensateOutputLatency` (default true) - auto-adjust using AudioContext.outputLatency (fallback to 0 if unsupported)
    - [x] Include `timingTolerance` (default 0.01s = 10ms)
  - [x] Define `BeatMapJSON` interface for serialization (same as BeatMap but JSON-safe)

---

## Phase 2: Onset Strength Envelope (OSE) Extraction

Implement the perceptual onset strength envelope as described in Ellis Section 3.1.

### 2.1: Onset Strength Envelope Calculator

- [x] Create `/src/core/analysis/beat/OnsetStrengthEnvelope.ts`
  - [x] Implement constructor with config:
    ```typescript
    interface OSEConfig {
      targetSampleRate: number;    // Default: 8000 (paper resamples to 8kHz)
      fftWindowSize: number;        // Default: 32 (ms) - paper uses 32ms windows
      hopSizeMs: number;            // Default: 10 (ms) - paper uses 4ms, we use 10ms
      melBands: number;             // Default: 40 - perceptual frequency bands
      highPassCutoff: number;       // Default: 0.4 Hz - removes DC offset
      gaussianSmoothMs: number;     // Default: 20 ms - smoothing window
    }
    ```
  - [x] Implement `calculate(audioBuffer: AudioBuffer): Float32Array` method

  - [x] **Step 1: Audio Preprocessing**
    - [x] Resample audio to 8 kHz (reduces computational load, focuses on beat-relevant frequencies)
    - [x] Store original sample rate for time conversion

  - [x] **Step 2: Mel Spectrogram Calculation**
    - [x] Compute STFT magnitude using 32ms windows (256 samples @ 8kHz)
    - [x] Apply Hann window function
    - [x] Hop size: 10ms (80 samples @ 8kHz) - slightly larger than paper's 4ms
    - [x] Convert to 40 Mel bands via weighted summing of spectrogram values
    - [x] Use Mel scale formula: `m = 2595 * log10(1 + f/700)` for frequency mapping
    - [x] Implement Mel filterbank creation (triangular filters)

  - [x] **Step 3: Onset Strength Calculation** (Ellis Section 3.1)
    ```
    For each Mel band:
      1. Convert magnitude to dB: dB = 20 * log10(magnitude + ε)
      2. Calculate first-order difference: diff[n] = dB[n] - dB[n-1]
      3. Half-wave rectify: if diff < 0, set to 0
    Then:
      4. Sum positive differences across all Mel bands
      5. Apply high-pass filter at 0.4 Hz (removes DC, makes locally zero-mean)
      6. Smooth with 20ms Gaussian window
      7. Normalize by dividing by standard deviation (critical for DP balance!)
    ```

  - [x] **Step 4: Normalization**
    - [x] Calculate standard deviation of the envelope
    - [x] Divide entire envelope by std dev (ensures consistent α scaling across songs)
    - [x] This normalization is **critical** according to the paper - the balance between terms depends on envelope scale

  - [x] Return onset strength envelope as Float32Array with metadata (sample rate, frame count)

### 2.2: Helper Functions

- [x] Create `/src/core/analysis/beat/utils/audioUtils.ts`
  - [x] `resampleAudio(buffer: AudioBuffer, targetRate: number): Float32Array`
  - [x] `createMelFilterbank(numBands: number, fftSize: number, sampleRate: number): Float32Array[]`
  - [x] `hzToMel(hz: number): number` - `2595 * log10(1 + f/700)`
  - [x] `melToHz(mel: number): number` - `700 * (10^(m/2595) - 1)`
  - [x] `highPassFilter(signal: Float32Array, cutoff: number, sampleRate: number): Float32Array`
  - [x] `gaussianSmooth(signal: Float32Array, windowMs: number, sampleRate: number): Float32Array`

### Tests

- [x] Create `/tests/unit/beat/onsetStrengthEnvelope.test.ts`
  - [x] Test with synthetic click track (known onset times)
  - [x] Test that peaks align with onset moments
  - [x] Test silence produces near-zero envelope
  - [x] Test normalization produces std dev ≈ 1.0
  - [x] Test Mel filterbank creation
  - [x] Compare output shape/characteristics to librosa.onset.onset_strength

---

## Phase 3: Tempo Estimation

Implement global tempo estimation using autocorrelation with perceptual weighting (Ellis Section 3.2).

- [x] Create `/src/core/analysis/beat/TempoDetector.ts`
  - [x] Implement constructor with config:
    ```typescript
    interface TempoDetectorConfig {
      tempoCenter: number;      // Default: 0.5 seconds (120 BPM)
      tempoWidth: number;       // Default: 1.4 octaves (or 0.9 for stricter)
      minBpm: number;           // Default: 60
      maxBpm: number;           // Default: 180
    }
    ```

  - [x] **Implement `estimateTempo(onsetEnvelope: Float32Array, hopSize: number): TempoEstimate`**

  - [x] **Step 1: Autocorrelation**
    ```
    TPS(τ) = W(τ) × Σ O(t) × O(t-τ)

    Where:
      τ = lag time in frames
      O(t) = onset strength envelope value at frame t
    ```

  - [x] **Step 2: Perceptual Weighting Function** (Ellis Equation 6)
    ```
    W(τ) = exp(-0.5 × (log₂(τ/τ₀) / στ)²)

    Where:
      τ₀ = 0.5 seconds (center, corresponds to 120 BPM)
      στ = 1.4 octaves (width of tempo perception bias)
    ```

    - [x] This weighting biases toward human tempo perception (120 BPM)
    - [x] Downweights periods far from the center

  - [x] **Step 3: Primary Tempo Detection**
    - [x] Find τ that maximizes TPS(τ)
    - [x] Convert to BPM: `bpm = 60 / (τ × hopSizeSeconds)`

  - [x] **Step 4: Secondary Tempo & Metrical Level** (Ellis Equations 7 & 8)
    ```
    TPS2(τ) = TPS(τ) + 0.5×TPS(2τ) + 0.25×TPS(2τ-1) + 0.25×TPS(2τ+1)
    TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)
    ```

    - [x] Calculate both TPS2 and TPS3
    - [x] Whichever is larger determines duple vs triple meter
    - [x] The larger peak gives the "faster" tempo level
    - [x] This improves accuracy from 77% to 84% per paper

  - [x] **Step 5: Return TempoEstimate**
    ```typescript
    interface TempoEstimate {
      primaryBpm: number;        // Main tempo estimate
      secondaryBpm: number;      // Adjacent metrical level
      primaryWeight: number;     // Relative strength of primary
      secondaryWeight: number;   // Relative strength of secondary
      isDuple: boolean;          // True if duple, false if triple
      targetIntervalSeconds: number;  // τp for DP tracker
    }
    ```

  - [x] Handle edge cases:
    - [x] Very short audio clips
    - [x] Monotonic/non-rhythmic audio

- [x] Create `/tests/unit/beat/tempoDetector.test.ts`
  - [x] Test with known BPM click tracks (60, 90, 120, 150 BPM)
  - [x] Test BPM estimation accuracy within ±5 BPM
  - [x] Test duple vs triple detection
  - [x] Test that 120 BPM is preferred when ambiguous

---

## Phase 4: Dynamic Programming Beat Tracker

Implement the core DP algorithm as described in Ellis Section 2.

- [x] Create `/src/core/analysis/beat/BeatTracker.ts`
  - [x] Implement constructor with config:
    ```typescript
    interface BeatTrackerConfig {
      dpAlpha: number;           // Default: 680 (Ellis optimal)
      minPredecessorRatio: number;  // Default: 0.5 (τp/2)
      maxPredecessorRatio: number;  // Default: 2.0 (2τp)
    }
    ```

  - [x] **Implement `trackBeats(onsetEnvelope, tempoEstimate, config): Beat[]`**

  - [x] **Step 1: Precompute Transition Costs** (Ellis Equation 2)
    ```typescript
    // For all possible predecessor intervals
    const prange = Math.round(2 * period) to Math.round(period / 2);

    // Transition cost for each interval (precompute for efficiency)
    for (let i = 0; i < prange.length; i++) {
      const deltaT = prange[i];
      txcost[i] = -alpha * Math.pow(Math.log(deltaT / period), 2);
    }
    ```

    - [x] Note: This is the **only** place α is used
    - [x] Larger α = stricter tempo adherence
    - [x] The log-squared formulation is symmetric: F(kτ, τ) = F(τ/k, τ)

  - [x] **Step 2: Forward Pass - Calculate Best Scores** (Ellis Equations 3 & 4)
    ```typescript
    // Initialize (Using Typed Arrays for max performance)
    const backlink = new Int32Array(length).fill(-1);
    const cumscore = new Float32Array(onsetEnvelope); // Copy as initial scores

    // Forward pass
    for (let i = maxPrange + 1; i < length; i++) {
      const timerange = prange.map(p => i + p); // Predecessor indices

      // Search over all possible predecessors, apply transition weights
      const scorecands = timerange.map((t, idx) => txcost[idx] + cumscore[t]);

      // Find best predecessor beat
      const [bestScore, bestIdx] = max(scorecands);

      // Add local onset score
      cumscore[i] = bestScore + onsetEnvelope[i];

      // Store backtrace pointer
      backlink[i] = timerange[bestIdx];
    }
    ```

    - [x] Search range limits: τ = t - 2τp to t - τp/2
    - [x] This is O(n) complexity despite searching exponential space

  - [x] **Step 3: Backward Pass - Extract Beat Sequence**
    ```typescript
    // Start from highest cumulative score (near end)
    let [_, beats] = max(cumscore);

    // Backtrace through backlinks
    while (backlink[beats[0]] > 0) {
      beats.unshift(backlink[beats[0]]);
    }
    ```

    - [x] Start from frame with highest cumscore (typically within τp of end)
    - [x] Follow backlinks until reaching beginning
    - [x] Convert frame indices to timestamps: `time = frameIndex * hopSizeSeconds`

  - [x] **Step 4: Handle Edge Cases**
    - [x] **Silence sections**: DP naturally "fills in" beats at target interval with 0 onset score
    - [x] **Start/end trimming**: Use discounted best score curve to find first/last valid beats
      ```
      // C*(t) grows steadily, but plot difference from straight line
      // connecting origin to final value to find beat boundaries
      discountedScore[t] = cumscore[t] - (t / length) * cumscore[length-1]
      ```
    - [x] **Tempo drift**: DP naturally accommodates ±10% drift from target

  - [x] **Step 5: Convert to Beat Objects**
    - [x] For each beat frame, create Beat object with:
      - timestamp (seconds)
      - intensity (onset strength at that frame)
      - confidence (derived from local score contribution)
    - [x] Apply downbeat detection (see Phase 5)

  - [x] Return array of Beat objects

### Reference Implementation (from Ellis Figure 1)

```matlab
% Original Matlab code for reference
function beats = beatsimple(localscore, period, alpha)
  backlink = -ones(1, length(localscore));
  cumscore = localscore;

  % Search range for previous beat
  prange = round(-2*period) : round(-period/2);

  % Log-gaussian window over that range
  txcost = -alpha * abs(log(prange / -period)).^2;

  for i = max(-prange) + 1 : length(localscore)
    timerange = i + prange;
    scorecands = txcost + cumscore(timerange);
    [vv, xx] = max(scorecands);
    cumscore(i) = vv + localscore(i);
    backlink(i) = timerange(xx);
  end

  [vv, beats] = max(cumscore);
  while backlink(beats(1)) > 0
    beats = [backlink(beats(1)), beats];
  end
end
```

### Tests

- [x] Create `/tests/unit/beat/beatTracker.test.ts`
  - [x] Test with 120 BPM click track (quarter notes)
  - [x] Verify beat times are within ±20ms of expected
  - [x] Test filtering of 8th note subdivisions (should reject)
  - [x] Test filtering of 16th note subdivisions (should reject)
  - [x] Test with gradual tempo drift (±10% variation)
  - [x] Test silence handling (should still produce beats at target interval)
  - [x] Test with different α values (100 vs 680 vs 1000)
  - [x] Verify backlink chain produces valid sequence
  - [x] Compare results to librosa.beat.beat_track output (skipped - requires external comparison)

---

## Phase 5: Downbeat Detection

Identify measure boundaries by analyzing intensity patterns.

- [x] Implement downbeat detection in `BeatTracker.ts` or separate `DownbeatDetector.ts`

  - [x] **Approach 1: Intensity Pattern Analysis**
    - [x] Collect intensity values for all beats
    - [x] Try different groupings (2, 3, 4 beats per measure)
    - [x] For each grouping, calculate variance of position-relative intensities
    - [x] Choose grouping that produces most consistent pattern (strong-weak-weak-weak, etc.)

  - [x] **Approach 2: Autocorrelation of Intensity Sequence**
    - [x] Create intensity sequence array
    - [x] Autocorrelate at lags corresponding to 2, 3, 4, 6 beats
    - [x] Choose period with strongest correlation

  - [x] **Assign beatInMeasure labels**
    - [x] Identify the strongest beat in each detected measure
    - [x] Mark as downbeat (beatInMeasure = 0, isDownbeat = true)
    - [x] Number subsequent beats 1, 2, 3, etc.
    - [x] Handle songs that start mid-measure

  - [x] **Measure Number Assignment**
    - [x] Count measures from first downbeat
    - [x] `measureNumber = Math.floor(beatIndex / beatsPerMeasure)`

### Tests

- [x] Create `/tests/unit/beat/downbeatDetector.test.ts`
  - [x] Test with 4/4 music with emphasized downbeats
  - [x] Test with 3/4 waltz pattern
  - [x] Test with 6/8 compound meter
  - [x] Test with songs starting mid-measure
  - [x] Test with songs lacking clear downbeat emphasis

---

## Phase 6: Beat Map Generator

Orchestrate onset detection and beat tracking to generate complete beat maps.

- [x] Create `/src/core/analysis/beat/BeatMapGenerator.ts`
  - [x] Implement constructor with BeatMapGeneratorOptions
  - [x] Implement `generateBeatMap(audioUrl, audioId)` method
  - [x] Implement `generateBeatMapFromBuffer(audioBuffer, audioId)` method
  - [x] **Pipeline:**
    ```
    1. Load/decode audio (Main thread)
    2. Calculate Onset Strength Envelope (Phase 2)
    3. Estimate Tempo (Phase 3)
    4. Run DP Beat Tracker (Phase 4)
    5. Detect Downbeats (Phase 5)
    6. Assemble BeatMap
    ```
    Note: Web Worker implementation deferred - current synchronous implementation is sufficient for typical audio files.
  - [x] Implement `getProgress()` for progress tracking
  - [x] Implement `cancel()` for cancellation
  - [x] **JSON Serialization Support:**
    - [x] `toJSON(beatMap)` static method - export beat map as JSON string
    - [x] `fromJSON(jsonString)` static method - load beat map from JSON
    - [x] `saveToFile(beatMap, path)` - save to disk (Node.js only)
    - [x] `loadFromFile(path)` - load from disk (Node.js only)

### BeatMap Contents

The generated BeatMap contains:
- `beats[]` - Array of detected beats with timestamps (actual detected times, not grid-snapped)
- `bpm` - Initial BPM estimate (actual BPM calculated dynamically during playback)
- `metadata` - Algorithm settings, threshold used, etc.

Note: BPM is NOT stored as a single value or array of tempo changes. The front-end calculates current BPM from the actual beat intervals using the rolling window.

- [x] Create `/tests/unit/beat/beatMapGenerator.test.ts`
  - [x] Test full beat map generation
  - [x] Test JSON serialization round-trip
  - [x] Test progress reporting
  - [x] Test cancellation support
  - [x] Test various audio configurations (sample rates, channels, durations)

---

## Phase 7: Beat Stream

Implement real-time beat event streaming synchronized with audio playback.

- [x] Create `/src/core/analysis/beat/BeatStream.ts`
  - [x] Implement constructor with BeatMap, AudioContext, and options
  - [x] Implement `subscribe(callback)` returning unsubscribe function
  - [x] Implement `start()` method
  - [x] Implement `stop()` method
  - [x] Implement `seek(time)` method for seeking
  - [x] Implement audio clock synchronization & Latency Compensation:
    - [x] Use `AudioContext.currentTime` as ground truth.
    - [x] Apply `AudioContext.outputLatency` and `baseLatency` to align logic with actual audio output. Gracfully fallback to `0` if undefined (e.g., in Safari/older browsers).
    - [x] Apply user-calibrated `userOffsetMs` to accommodate specific hardware delay.
    - [x] Use a lookahead queue with `requestAnimationFrame` or Web Workers to schedule events slightly in the future.
    - [x] Target sample-accurate scheduling for audio, and ±10ms timing precision for visual events.
  - [x] Implement anticipation system:
    - [x] Emit 'upcoming' events ahead of time (e.g., 2.0s) so UI can spawn elements.
    - [x] Emit 'exact' event when the true synchronized beat time is reached.
    - [x] Emit 'passed' event if beat was missed.
  - [x] Implement `getUpcomingBeats(count)` for pre-rendering animations
  - [x] Implement `getBeatAtTime(time)` query
  - [x] Implement `getSyncState()` for debugging
  - [x] Implement rolling BPM calculation:
    - [x] `getCurrentBpm()` - returns BPM calculated from recent beat intervals
    - [x] Configurable window size (default 8 beats)
  - [x] **Button Press Detection:**
    - [x] `checkButtonPress(timestamp)` - returns accuracy score
    - [x] `getLastBeatAccuracy()` - returns how close last press was to beat
    - [x] Define accuracy levels: Perfect (±10ms), Great (±25ms), Good (±50ms), Miss

- [x] Create `/tests/unit/beat/beatStream.test.ts`
  - [x] Test event emission order
  - [x] Test anticipation timing (2.0s default)
  - [x] Test seeking behavior
  - [x] Test button press accuracy detection
  - [x] Test rolling BPM calculation during playback

---

## Phase 8: Integration

Integrate beat detection with existing AudioAnalyzer and export public API.

- [x] Modify `/src/core/analysis/AudioAnalyzer.ts`
  - [x] Add `generateBeatMap(audioUrl, options)` method
  - [x] Add `createBeatStream(beatMap, audioContext, options)` method
  - [x] Make `performFFT` and `extractAudioSegment` accessible to beat detection classes
- [x] Create `/src/core/analysis/beat/index.ts`
  - [x] Export BeatMapGenerator
  - [x] Export BeatStream
  - [x] Export OnsetStrengthEnvelope
  - [x] Export BeatTracker
  - [x] Export TempoDetector
  - [x] Export utility functions (toJSON, fromJSON)
- [x] Modify `/src/index.ts`
  - [x] Export all beat-related types
  - [x] Export all beat-related classes

---

## Phase 9: Integration Tests

Test the complete system with real audio files.

- [x] Create `/tests/integration/beatDetection.integration.test.ts`
  - [x] Test beat map generation with real audio URL
  - [x] Test beat stream synchronization
  - [x] Verify BPM detection accuracy (±5 BPM for songs with known tempo)
  - [x] Verify beat timing accuracy (±46ms std dev per paper)
  - [x] Test JSON save/load round-trip
  - [x] Compare results to librosa reference implementation (documented for manual verification)

---

## Phase 10: Documentation Update

Create comprehensive audio analysis documentation and update reference files.

### Create `docs/AUDIO_ANALYSIS.md`

Create a dedicated documentation file covering all audio analysis features:

- [x] **Section: Overview**
  - [x] Explain the three audio analysis modes available in the engine
  - [x] Link to relevant source files

- [x] **Section: 3-Tap Real-Time Analysis** (existing feature)
  - [x] Document the original `AudioAnalyzer` real-time analysis
  - [x] Peak detection at playhead position
  - [x] Spectral centroid calculation
  - [x] RMS (loudness) extraction
  - [x] Usage example for real-time visualization

- [x] **Section: Full Song Analysis** (existing feature)
  - [x] Document `analyzeTimeline()` method
  - [x] Configurable data points across entire track
  - [x] Options for analysis resolution
  - [x] Usage example for waveform rendering / timeline visualization

- [x] **Section: Beat Detection System** (new feature)
  - [x] **Types**
    - [x] `Beat` interface (timestamp, beatInMeasure, isDownbeat, measureNumber, intensity, confidence)
    - [x] `BeatMap` interface (audioId, duration, beats, bpm, metadata)
    - [x] `BeatMapMetadata` (version, algorithm, threshold settings)
    - [x] `BeatEvent` interface (beat, currentBpm, audioTime, timeUntilBeat, type)
    - [x] `BeatStreamCallback` type
    - [x] `AudioSyncState` interface
    - [x] `BeatMapGeneratorOptions` interface
    - [x] `BeatStreamOptions` interface
    - [x] `BeatMapJSON` interface
  - [x] **Classes**
    - [x] `BeatMapGenerator` - generate beat maps from audio
      - [x] Constructor with `BeatMapGeneratorOptions`
      - [x] `generateBeatMap(audioUrl, audioId)` method
      - [x] `generateBeatMapFromBuffer(audioBuffer, audioId)` method
      - [x] `getProgress()`, `cancel()` methods
      - [x] `toJSON()`, `fromJSON()`, `saveToFile()`, `loadFromFile()` methods
    - [x] `BeatStream` - real-time beat event streaming
      - [x] Constructor with `BeatMap`, `AudioContext`, and options
      - [x] `subscribe(callback)` method returning unsubscribe function
      - [x] `start()`, `stop()`, `seek(time)` methods
      - [x] `getUpcomingBeats(count)`, `getBeatAtTime(time)` methods
      - [x] `getSyncState()`, `getCurrentBpm()` methods
      - [x] `checkButtonPress(timestamp)`, `getLastBeatAccuracy()` methods
    - [x] `OnsetStrengthEnvelope` - perceptual onset detection
      - [x] Constructor with config
      - [x] `calculate(audioBuffer)` method
      - [x] Mel filterbank generation
      - [x] Half-wave rectification and normalization
    - [x] `BeatTracker` - Ellis DP algorithm
      - [x] `trackBeats(onsetEnvelope, tempoEstimate, config)` method
      - [x] Dynamic Programming algorithm explanation
      - [x] Transition cost function: `F(Δt, τ) = -(log(Δt/τ))²`
      - [x] Subdivision filtering via α penalty
    - [x] `TempoDetector` - global tempo estimation
      - [x] `estimateTempo(onsetEnvelope, hopSize)` method
      - [x] Autocorrelation with perceptual weighting
      - [x] TPS2/TPS3 for duple/triple detection
  - [x] **Usage Examples**
    - [x] Basic BeatMap Generation - Generate beat map from audio URL
    - [x] BeatMap Serialization - Save/load beat maps (JSON and file)
    - [x] Beat Stream Setup - Subscribe to beat events during playback
    - [x] Button Press Detection - Rhythm game input accuracy
    - [x] Pre-rendering Beats - Get upcoming beats for visual spawning
    - [x] Rolling BPM - Get current tempo during playback
    - [x] Pre-analysis phase (BeatMap generation)
    - [x] Gameplay phase (BeatStream with audio sync)
    - [x] Anticipation system (upcoming/exact/passed events at 2.0s)
    - [x] Accuracy levels (Perfect ±10ms, Great ±25ms, Good ±50ms, Miss)
  - [x] **Algorithm Details**
    - [x] Ellis Dynamic Programming beat tracking explanation
    - [x] Fluid tempo handling (rolling BPM from actual intervals)
    - [x] Subdivision filtering mechanism
  - [x] **Scope Note**: Data engine only (no UI/frontend)
  - [x] Reference to showcase project for visual implementation

### DATA_ENGINE_REFERENCE.md Updates

- [x] Add Beat Detection types to [Quick Export Reference](#quick-export-reference) table
  - [x] `BeatMapGenerator`, `BeatStream`, `OnsetStrengthEnvelope`, `BeatTracker`, `TempoDetector`
  - [x] Utility functions: `beatMapToJSON`, `beatMapFromJSON`
- [x] Add beat detection types to the main reference sections (these reference the actual code)
- [x] Update Table of Contents if needed

### USAGE_IN_OTHER_PROJECTS.md Updates

- [ ] Add reference link to `docs/AUDIO_ANALYSIS.md` in Quick Links section
- [ ] Add brief entry in Usage Examples index pointing to Audio Analysis doc

### Documentation Style Guidelines

- Follow existing documentation patterns:
  - Use tables for type properties and method signatures
  - Include file locations for types (e.g., `src/core/types/BeatMap.ts`)
  - Provide code examples with TypeScript syntax
  - Cross-reference related sections with markdown links
  - Keep descriptions concise but complete

---

## Key Formulas Reference

### Ellis Objective Function (Equation 1)
```
C({ti}) = Σ O(ti) + α Σ F(ti - ti-1, τp)
```

### Transition Cost Function (Equation 2)
```
F(Δt, τ) = -(log(Δt/τ))²
```
- Maximum: 0 when Δt = τ
- Symmetric: F(kτ, τ) = F(τ/k, τ)

### Recursive Score Calculation (Equations 3 & 4)
```
C*(t) = O(t) + max{αF(t-τ, τp) + C*(τ)}
P*(t) = arg max{αF(t-τ, τp) + C*(τ)}

Search range: τ = t - 2τp ... t - τp/2
```

### Tempo Period Strength (Equations 5 & 6)
```
TPS(τ) = W(τ) × Σ O(t)O(t-τ)

W(τ) = exp(-0.5 × (log₂(τ/τ₀) / στ)²)

Where:
  τ₀ = 0.5s (120 BPM center)
  στ = 1.4 octaves (or 0.9 for stricter)
```

### Metrical Level Detection (Equations 7 & 8)
```
TPS2(τ) = TPS(τ) + 0.5×TPS(2τ) + 0.25×TPS(2τ-1) + 0.25×TPS(2τ+1)
TPS3(τ) = TPS(τ) + 0.33×TPS(3τ) + 0.33×TPS(3τ-1) + 0.33×TPS(3τ+1)
```

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
- [x] Beat events → **All beats with DP filtering of subdivisions**
- [x] Scope → **Data engine only (no frontend). Frontend/demo in playlist-data-showcase**
- [x] Tempo handling → **Fluid/rolling BPM calculated from actual beat intervals, not grid-based**
- [x] Time signature → **Time signature agnostic - we detect beats, not measures**
- [x] Anticipation time → **2.0s default for animation pre-rendering**
- [x] Hop size → **10ms default, configurable (paper uses 4ms)**
- [x] Subdivision filtering → **DP transition penalty F(Δt, τ) = -(log(Δt/τ))²**
- [x] Balance factor α → **680 (paper optimal), range 100-1000**
- [x] Tempo drift tolerance → **±10% of target tempo**

---

## Files to Create/Modify

| File | Action | Status |
|------|--------|--------|
| `src/core/types/BeatMap.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/OnsetStrengthEnvelope.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/BeatTracker.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/TempoDetector.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/DownbeatDetector.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/BeatMapGenerator.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/BeatStream.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/utils/audioUtils.ts` | Create | ✅ Complete |
| `src/core/analysis/beat/index.ts` | Create | ✅ Complete |
| `src/core/analysis/AudioAnalyzer.ts` | Modify | ✅ Complete |
| `src/index.ts` | Modify | ✅ Complete |
| `tests/unit/beat/*.test.ts` | Create | ✅ Complete (Phase 1-7) |
| `tests/integration/beatDetection.integration.test.ts` | Create | ✅ Complete |
| `docs/AUDIO_ANALYSIS.md` | Create (Phase 10) |
| `DATA_ENGINE_REFERENCE.md` | Modify - add beat detection exports to reference (Phase 10) |
| `USAGE_IN_OTHER_PROJECTS.md` | Modify - add reference link (Phase 10) |

---

## Verification

After implementation:
1. Run `npm test` - all tests pass
2. Generate beat map for test audio
3. Play audio and verify beat events align with audible beats
4. Test button press detection with ±10ms accuracy
5. Compare output to librosa.beat.beat_track for reference
6. Verify documentation updated:
   - `docs/AUDIO_ANALYSIS.md` created with all three analysis modes documented
   - DATA_ENGINE_REFERENCE.md includes beat detection types/classes in its exports reference
   - USAGE_IN_OTHER_PROJECTS.md includes reference link to Audio Analysis doc
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
  hopSizeMs: 10,                  // 10ms between FFT frames
  melBands: 40,                   // Perceptual frequency bands
  dpAlpha: 680,                   // Ellis optimal balance factor
  tempoCenter: 0.5,               // 120 BPM center for perception bias
  tempoWidth: 1.4,                // Octaves width for tempo weighting
  rollingBpmWindowSize: 8,        // Calculate BPM from last 8 beats
});

const beatMap = await generator.generateBeatMap('song.mp3', 'track-001');

// BeatMap contains actual detected beat timestamps (not grid-snapped)
// Beats are the globally optimal sequence per Ellis DP algorithm
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
  // The DP algorithm tracks ±10% drift from estimated tempo
});
```

---

## References

- [Beat Tracking by Dynamic Programming (Ellis, 2007)](https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf)
- [librosa beat tracking implementation](https://librosa.org/doc/latest/generated/librosa.beat.beat_track.html)
- [librosa onset strength implementation](https://librosa.org/doc/latest/generated/librosa.onset.onset_strength.html)
