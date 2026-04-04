# Audio Analysis Documentation

The Playlist Data Engine provides audio analysis modes for extracting meaningful data from music files. Each mode serves different use cases, from quick character generation to timeline visualization.

---

## Overview

The engine's audio analysis is powered by the Web Audio API and provides two distinct modes for general audio analysis:

| Mode | Method | Purpose | Use Case |
|------|--------|---------|----------|
| **Triple Tap Real-Time** | `extractSonicFingerprint()` | Quick analysis at key positions | Character generation, quick profiling |
| **Full Song Timeline** | `analyzeTimeline()` | Complete track analysis | Waveform visualization, level generation |
| **Music Classification** | `analyze()` | Deep ML classification | Genre, mood, and vibe detection |

> **Note**: For rhythm game features like beat detection, beat streaming, and chart creation, see [BEAT_DETECTION.md](BEAT_DETECTION.md).

### Source Files

| Component | Location |
|-----------|----------|
| **AudioAnalyzer** (main class) | [src/core/analysis/AudioAnalyzer.ts](../src/core/analysis/AudioAnalyzer.ts) |
| **MusicClassifier** (ML classification) | [src/core/analysis/MusicClassifier.ts](../src/core/analysis/MusicClassifier.ts) |
| **SpectrumScanner** (frequency bands) | [src/core/analysis/SpectrumScanner.ts](../src/core/analysis/SpectrumScanner.ts) |
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

## Music Classification (Genre, Mood, Vibe)

For deep semantic analysis of music including mood, themes, and vibe metrics (like danceability), use the `MusicClassifier`. This uses multiple `essentia.js` models.

### Method

```typescript
analyze(audioUrl: string): Promise<MusicClassificationProfile>
```

### Usage Example

```typescript
import { MusicClassifier } from 'playlist-data-engine';

const classifier = new MusicClassifier({
  topN: 3,         // Return top 3 genres/moods
  threshold: 0.1   // 10% confidence threshold
});

const profile = await classifier.analyze('https://example.com/audio.mp3');

console.log(`Genre: ${profile.primary_genre}`);
console.log(`Moods: ${profile.mood_tags.join(', ')}`);
console.log(`Danceability: ${profile.vibe_metrics.danceability}`);
console.log(`Energy: ${profile.vibe_metrics.energy}`);
```

### MusicClassificationProfile Output

| Property | Type | Description |
|----------|------|-------------|
| `genres` | `ClassificationTag[]` | Top matched genres |
| `moods` | `ClassificationTag[]` | Top matched moods/themes |
| `primary_genre` | `string` | Highest confidence genre |
| `mood_tags` | `string[]` | Most relevant mood keywords |
| `vibe_metrics` | `VibeMetrics` | Danceability, energy, valence, etc. |

---

### Two-Step Model Architecture

The `MusicClassifier` supports both single-step (one model) and two-step (embedding + classifier) architectures. This enables using state-of-the-art models like Discogs-EffNet for embeddings combined with specialized classifier heads.

#### Architecture Compatibility Table

Different model architectures require different mel-band configurations for feature extraction:

| Architecture | Mel Bands | Extractor | Compatible Models |
|--------------|-----------|-----------|-------------------|
| `musicnn` | 96 | Essentia musicnn | MusiCNN classifiers, MSD models |
| `effnet` | 128 | Custom | Discogs-EffNet embeddings |
| `vggish` | 64 | Essentia vggish | VGGish classifiers, AudioSet |
| `tempocnn` | 40 | Essentia tempocnn | TempoCNN tempo estimation |

> **Important**: The engine automatically detects the architecture from the model URL and uses the correct mel-band configuration. No manual configuration needed!

#### Model Configuration Formats

Every model option (`genre`, `mood`, `danceability`, `voice`, `acoustic`) accepts two formats:

##### Format 1: Single-Step Model Config (with explicit type)

For URLs where architecture cannot be detected (e.g., Arweave URLs), use `SingleStepModelConfig`:

```typescript
import { MusicClassifier, type SingleStepModelConfig } from 'playlist-data-engine';

const config: SingleStepModelConfig = {
    modelUrl: 'https://arweave.net/xxx/model.json',
    modelType: 'musicnn',  // Explicitly specify architecture
    genreType: 'jamendo',  // Explicitly specify genre list (for genre models)
    labels: ['custom', 'labels']  // Optional custom labels
};
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `modelUrl` | `string` | Yes | URL to the model file |
| `modelType` | `ModelArchitecture` | Yes | Explicit architecture: `'musicnn'` \| `'effnet'` \| `'vggish'` \| `'tempocnn'` |
| `genreType` | `GenreListType` | No* | Explicit genre list: `'jamendo'` \| `'discogs400'` \| `'tzanetakis'` \| `'mtt_musicnn'` (*required for genre models with Arweave URLs) |
| `labels` | `string[]` | No | Custom output labels |

##### Format 2: Two-Step Model Config (with explicit types)

Separate embedding and classifier models with optional explicit type parameters:

```typescript
import { MusicClassifier, type TwoStepModelConfig } from 'playlist-data-engine';

const config: TwoStepModelConfig = {
    embedding: '/models/discogs-effnet-bs64-1.json',
    classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json',
    // Optional explicit types (override URL detection)
    embeddingType: 'effnet',      // ModelArchitecture
    classifierType: 'discogs400'  // GenreListType (for genre models)
};
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `embedding` | `string` | Yes | URL to the embedding model |
| `classifier` | `string` | Yes | URL to the classifier model |
| `labels` | `string[]` | No | Custom output labels |
| `embeddingType` | `ModelArchitecture` | No | Explicit embedding type: `'musicnn'` \| `'effnet'` \| `'vggish'` \| `'tempocnn'` |
| `classifierType` | `GenreListType` | No | Explicit genre list type: `'jamendo'` \| `'discogs400'` \| `'tzanetakis'` \| `'mtt_musicnn'` |

##### Why Use Explicit Type Parameters?

URL-based detection works for conventional file paths like `/models/effnet-classifier.json`, but fails for:
- **Arweave URLs**: `https://arweave.net/xxx/model.json` contains no architecture hints
- **Custom hosting**: URLs without descriptive filenames
- **Proxied URLs**: Gateway URLs that obscure the original filename

#### Signal Flow Diagrams

**Single-Step Flow:**
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Audio Signal   │ ──▶ │  Feature         │ ──▶ │  Single Model   │
│  (16kHz mono)   │     │  Extractor       │     │  (classifier)   │
└─────────────────┘     │  (96 bands)      │     └────────┬────────┘
                        └──────────────────┘              │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Class Labels   │
                                                 │  (genre, mood)  │
                                                 └─────────────────┘
```

**Two-Step Flow:**
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Audio Signal   │ ──▶ │  Feature         │ ──▶ │  Embedding      │
│  (16kHz mono)   │     │  Extractor       │     │  Model          │
└─────────────────┘     │  (128 bands)     │     │  (1280-dim)     │
                        └──────────────────┘     └────────┬────────┘
                                                          │
                        Architecture-specific              │
                        mel-band config                    ▼
                                                 ┌─────────────────┐
                                                 │  Classifier     │
                                                 │  Model          │
                                                 │  (class probs)  │
                                                 └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Class Labels   │
                                                 │  (genre, mood)  │
                                                 └─────────────────┘
```

#### Configuration Examples

**Mixed Configuration (Single + Two-Step):**

```typescript
const classifier = new MusicClassifier({
    models: {
        // Two-step: embedding + classifier (uses 128-band extractor)
        genre: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
        },
        // Two-step: same embedding cached, different classifier
        mood: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
        },
        // Single-step: requires modelUrl + modelType (uses 64-band vggish extractor)
        danceability: {
            modelUrl: '/models/danceability-vggish-audioset-1.json',
            modelType: 'vggish'
        },
        // Single-step: optional voice detection
        voice: {
            modelUrl: '/models/voice-detector.json',
            modelType: 'musicnn'
        },
        // Two-step: optional acoustic detection
        acoustic: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/acoustic-classifier.json'
        }
    }
});
```

#### Using Arweave-Hosted Models (Zero Setup)

The default configuration uses pre-configured Arweave-hosted models:

```typescript
import { MusicClassifier } from 'playlist-data-engine';

// Zero setup - models load from Arweave automatically
const classifier = new MusicClassifier();

const profile = await classifier.analyze('https://example.com/track.mp3');
```

| Model | Architecture | Labels | Source |
|-------|-------------|--------|--------|
| **Genre** | Two-step (effnet + classifier) | discogs400 (400+ subgenres) | Arweave |
| **Mood** | Two-step (effnet + classifier) | JAMENDO_MOODS (60 themes) | Arweave |
| **Danceability** | Single-step (musicnn) | Binary | Turbo Gateway |

#### Using Presets

Instead of raw URLs, use preset names to select pre-configured models. This is the simplest way to swap genre/mood/danceability models without managing URLs.

```typescript
import { MusicClassifier } from 'playlist-data-engine';

// Use presets for genre and mood
const classifier = new MusicClassifier({
    preset: { genre: 'jamendo', mood: 'jamendo' }
});

// Mix presets with custom URLs — explicit models take precedence
const classifier = new MusicClassifier({
    preset: { genre: 'tzanetakis' },
    models: {
        mood: { modelUrl: '/models/custom-mood.json', modelType: 'musicnn' }
    }
});
```

**Available presets:**

| Category | Preset | Architecture | Labels |
|----------|--------|--------------|--------|
| Genre | `discogs400` | Two-step (effnet + discogs400) | 400+ subgenres |
| Genre | `jamendo` | Two-step (effnet + jamendo) | MTG Jamendo 87 |
| Genre | `tzanetakis` | Single-step (musicnn) | GTZAN 10 |
| Genre | `musicnn` | Single-step (musicnn) | MagnaTagATune 50 |
| Mood | `jamendo` | Two-step (effnet + jamendo) | 60 themes |
| Mood | `happyMusicnn` | Single-step (musicnn) | Binary (happy/not happy) |
| Danceability | `default` | Single-step (musicnn) | Binary |

To enumerate available presets at runtime:

```typescript
import { AVAILABLE_PRESETS } from 'playlist-data-engine';
console.log(AVAILABLE_PRESETS.genre);       // ['discogs400', 'jamendo', 'tzanetakis', 'musicnn']
console.log(AVAILABLE_PRESETS.mood);        // ['jamendo', 'happyMusicnn']
console.log(AVAILABLE_PRESETS.danceability); // ['default']
```

**Partial Override & Custom Arweave Models:**

```typescript
import { MusicClassifier, DEFAULT_ARWEAVE_MODELS } from 'playlist-data-engine';

const classifier = new MusicClassifier({
    models: {
        // Use default Arweave model
        genre: DEFAULT_ARWEAVE_MODELS.genre,
        // Override with local model
        mood: {
            modelUrl: '/models/mood-musicnn-msd-1.json',
            modelType: 'musicnn'
        },
        // Or use custom Arweave URLs with explicit types
        danceability: {
            modelUrl: 'https://arweave.net/YOUR_TXID/model.json',
            modelType: 'musicnn'  // Required for Arweave URLs
        }
    }
});
```

> **Note:** Single-step mood models use binary labels (`'happy'`, `'not happy'`) while two-step mood models use the full JAMENDO_MOODS taxonomy (60 mood/theme labels).

#### Embedding Model Caching

When using two-step models with shared embeddings (e.g., same Discogs-EffNet for genre and mood), the embedding model is automatically cached and reused:

```typescript
const classifier = new MusicClassifier({
    cacheEmbeddings: true,  // Default: true
    models: {
        genre: {
            embedding: '/models/discogs-effnet-bs64-1.json',  // Loaded once
            classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
        },
        mood: {
            embedding: '/models/discogs-effnet-bs64-1.json',  // Reused from cache!
            classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
        }
    }
});

// Later, to free memory:
classifier.clearEmbeddingCache();   // Clear embedding models only
classifier.clearClassifierCache();  // Clear classifier models only
classifier.clearAllCaches();        // Clear everything
```

#### Metadata Tracking

The `analysis_metadata.models_used` field tracks which models were used:

```typescript
const profile = await classifier.analyze(audioUrl);

console.log(profile.analysis_metadata.models_used);
// Two-step: ['/models/discogs-effnet-bs64-1.json -> /models/mtg_jamendo_genre-discogs-effnet-1.json', ...]
// Single-step: ['/models/genre-musicnn-msd-1.json', ...]
```

---

## Related Documentation

- **[BEAT_DETECTION.md](BEAT_DETECTION.md)** - Beat detection, rhythm games, and chart creation features
