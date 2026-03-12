# Two-Step Model Architecture Support for MusicClassifier

## Overview

Update `MusicClassifier` to support two-step model architectures where embedding and classifier models are separate files. This enables using models like Discogs-EffNet (embedding) + MTG Jamendo Genre/Mood (classifier) while maintaining backward compatibility with single-model approaches (MusiCNN-style).

### ⚠️ Critical Discovery: Mel Band Differences

**Different architectures require different mel-band configurations:**

| Architecture | Mel Bands | Essentia Extractor | Model Examples |
|--------------|-----------|-------------------|----------------|
| `musicnn` | 96 | `'musicnn'` | MusiCNN classifiers, MSD models |
| `effnet` | **128** | **Custom required!** | Discogs-EffNet embeddings |
| `vggish` | 64 | `'vggish'` | VGGish classifiers, AudioSet |
| `tempocnn` | 40 | `'tempocnn'` | TempoCNN tempo estimation |

**Discogs-EffNet uses 128 mel bands - NOT compatible with musicnn (96 bands)!**

This means we need a custom 128-band mel-spectrogram extractor for discogs-effnet models.

---

### Key Design Principle

**Every model option (`genre`, `mood`, `danceability`, `voice`, `acoustic`) accepts EITHER:**

| Format | Type | Process | Example |
|--------|------|---------|---------|
| **Single string** | `string` | 1-step | `'/models/classifier.json'` |
| **Two-step object** | `{ embedding, classifier }` | 2-step | `{ embedding: '/models/emb.json', classifier: '/models/cls.json' }` |

The engine automatically detects which format is provided AND which architecture (mel-band config) is needed.

---

### Architecture Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Audio Signal   │ ──▶ │  Feature         │ ──▶ │  Embedding      │
│  (16kHz mono)   │     │  Extractor       │     │  Model          │
└─────────────────┘     │  (mel-spectrogram)│    │  (1280-dim)     │
                        └──────────────────┘     └────────┬────────┘
                                 ▲                         │
                    ┌────────────┴────────────┐           ▼
                    │  Architecture-specific  │   ┌─────────────────┐
                    │  • musicnn: 96 bands    │   │  Classifier     │
                    │  • effnet: 128 bands    │   │  Model          │
                    │  • vggish: 64 bands     │   │  (class probs)  │
                    └─────────────────────────┘   └─────────────────┘
```

---

### Model Configuration Format

**Every model option accepts EITHER:**

1. **Single string** (1-step process) - Model handles everything internally:
   ```typescript
   genre: '/models/genre-classifier.json'
   ```

2. **Object with embedding + classifier** (2-step process) - Separate models chained:
   ```typescript
   genre: {
       embedding: '/models/discogs-effnet-bs64-1.json',
       classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
   }
   ```

### Example Usage

```typescript
// All options support both formats!
const classifier = new MusicClassifier({
    models: {
        // Two-step: embedding + classifier (uses 128-band custom extractor)
        genre: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
        },
        // Two-step: same embedding cached, different classifier
        mood: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
        },
        // Single-step: one model does it all (uses 64-band vggish extractor)
        danceability: '/models/danceability-vggish-audioset-1.json',
        // Any option can be either format:
        voice: '/models/voice-detector.json',                    // Single
        acoustic: {                                               // Two-step
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/acoustic-classifier.json'
        }
    }
});
```

---

## Phase 1: Type Definitions & Helpers

- [x] Add new type definitions to `MusicClassifier.ts`
  - [x] `TwoStepModelConfig` interface with `embedding`, `classifier`, and optional `labels`
  - [x] `ModelConfig` union type: `string | TwoStepModelConfig`
  - [x] Update `MusicClassifierOptions` - ALL model options use `ModelConfig`
  - [x] Add `cacheEmbeddings?: boolean` option
  - [x] `ModelArchitecture` type includes `'effnet'`: `'musicnn' | 'effnet' | 'vggish' | 'tempocnn'`

- [x] Implement model architecture detection helpers
  - [x] `isTwoStepModel(config): config is TwoStepModelConfig` - Type guard
  - [x] `detectModelArchitecture()` detects effnet (checks for 'effnet' and 'discogs' keywords)
    ```typescript
    export function detectModelArchitecture(modelUrl: string): ModelArchitecture {
        const url = modelUrl.toLowerCase();

        // Discogs-EffNet models (128 mel bands)
        if (url.includes('effnet') || url.includes('discogs')) {
            return 'effnet';
        }

        // VGGish models (64 mel bands)
        if (url.includes('vggish')) {
            return 'vggish';
        }

        // TempoCNN models (40 mel bands)
        if (url.includes('tempocnn') || (url.includes('tempo') && !url.includes('temple'))) {
            return 'tempocnn';
        }

        // Default to musicnn (96 mel bands)
        return 'musicnn';
    }
    ```

---

## Phase 2: Embedding Model Cache

> **Bonus**: Also implemented `clearEmbeddingCache()`, `clearClassifierCache()`, and `clearAllCaches()` methods for cache management.

- [x] Add embedding model caching infrastructure
  - [x] Add `private embeddingModelCache: Map<string, any>` property
  - [x] Add `private classifierModelCache: Map<string, any>` property

- [x] Implement `getEmbeddingModel()` method
  - [x] Check cache first, return cached model if available
  - [x] Initialize and cache model if `cacheEmbeddings` is true
  - [x] Return model instance
  - [x] Handle `effnet` architecture (uses raw TF.js `tf.loadGraphModel()`, not Essentia class)

---

## Phase 2.5: Custom 128-Band Mel-Spectrogram Extractor (NEW!)

> **Critical for Discogs-EffNet support**

- [x] Implement custom 128-band mel-spectrogram extraction
  - [x] Add `computeEffnetFeatures()` method using Essentia WASM `MelBands` algorithm
    ```typescript
    private async computeEffnetFeatures(audioSignal: Float32Array): Promise<number[][]> {
        // Use Essentia WASM MelBands algorithm with numberBands: 128
        const essentia = new this.essentiaWASM.EssentiaJS(false);
        const features: number[][] = [];

        for (let i = 0; i < audioSignal.length - 512; i += 512) {
            const frame = audioSignal.slice(i, i + 512);

            // Window + FFT
            const windowed = essentia.Windowing(essentia.arrayToVector(frame));
            const spectrum = essentia.Spectrum(windowed.frame);

            // 128-band mel spectrum (KEY DIFFERENCE!)
            const melBands = essentia.MelBands(
                spectrum.spectrum,
                8000,       // highFrequencyBound (16kHz/2)
                256,        // inputSize (512/2)
                false,      // log
                0,          // lowFrequencyBound
                'unit_sum', // normalize
                128,        // numberBands - THE MAGIC NUMBER!
                16000,      // sampleRate
                'power',    // type
                'slaneyMel',// warpingFormula
                'linear'    // weighting
            );

            // Log compression
            const logMel = essentia.UnaryOperator(melBands.bands, 10000, 1, 'log10');
            features.push(Array.from(essentia.vectorToArray(logMel.array)));
        }

        return features;
    }
    ```

- [x] Add architecture-specific feature extraction dispatch
  - [x] Create `getFeaturesForArchitecture(audioSignal, architecture)` method
  - [x] Route to correct extractor based on architecture:
    - `musicnn` → existing `extractor.computeFrameWise()` (96 bands)
    - `effnet` → new `computeEffnetFeatures()` (128 bands)
    - `vggish` → needs separate vggish extractor (64 bands) - uses default with warning
    - `tempocnn` → needs tempocnn extractor (40 bands) - uses default with warning

- [x] Add multiple extractor instances (one per architecture)
  - [x] `private extractors: Map<ModelArchitecture, any> = new Map()`

---

## Phase 3: Two-Step Prediction Logic

- [x] Implement embedding computation helpers
  - [x] `averageEmbeddings(embeddings: number[][]): number[]`
    - Average embeddings across all audio frames
    - Handle empty arrays gracefully

- [x] Implement classifier execution on embeddings
  - [x] `runClassifierOnEmbeddings(classifierUrl: string, embeddings: number[][]): Promise<number[]>`
    - Load classifier model directly with `tf.loadGraphModel()`
    - Average embeddings across frames
    - Create input tensor with correct shape `[1, embedding_dim]`
    - Execute model and get predictions
    - Properly dispose tensors and model after inference
    - Return prediction array

- [x] Implement main two-step prediction method
  - [x] `predictWithTwoStepModel(config: TwoStepModelConfig, audioSignal: Float32Array): Promise<number[]>`
    - Detect embedding architecture
    - **Get correct features for architecture** (96 vs 128 mel bands!)
    - Load embedding model (with caching)
    - Run embedding model to get feature vectors
    - Run classifier on embeddings
    - Return averaged predictions
  - [x] `runEffnetEmbedding(model, features)` - Runs effnet GraphModel inference on mel-spectrogram
  - [x] `runEssentiaEmbedding(model, features)` - Runs Essentia model inference (musicnn, vggish)

---

## Phase 4: Update analyze() Method

- [x] Create helper method for unified model prediction
  - [x] `runModelPrediction(config: ModelConfig, audioSignal: Float32Array, labels: string[]): Promise<ClassificationTag[]>`
  - [x] Detects if config is single-step (string) or two-step (object)
  - [x] Detects architecture and uses correct feature extractor
  - [x] Calls appropriate prediction method
  - [x] Returns mapped predictions with labels

- [x] Refactor ALL model analysis to use unified pattern
  - [x] Genre: single or two-step → `JAMENDO_GENRES` labels
  - [x] Mood: single or two-step → `JAMENDO_MOODS` labels
  - [x] Danceability: single or two-step → `['danceable', 'non-danceable']` labels
  - [x] Voice: single or two-step → `['voice', 'instrumental']` labels
  - [x] Acoustic: single or two-step → `['acoustic', 'electronic']` labels (populates `electronic_probability` in VibeMetrics)

- [x] Track models used in metadata
  - [x] Single-step: just the model URL
  - [x] Two-step: `"embedding -> classifier"` format

---

## Phase 5: Update Default Configuration

- [x] Update constructor defaults (all support single OR two-step)
  - [x] Genre: two-step `{ embedding, classifier }` with discogs-effnet + jamendo-genre
  - [x] Mood: two-step `{ embedding, classifier }` with discogs-effnet + jamendo-mood
  - [x] Danceability: single-model string (VGGish) - can be upgraded to two-step later
  - [x] Voice: optional, single or two-step (omitted by default, user provides if needed)
  - [x] Acoustic: optional, single or two-step (omitted by default, user provides if needed)
  - [x] Set `cacheEmbeddings: true` by default
  - [x] User can override ANY option with either format

---

## Phase 6: Update GenreAnalyzer Wrapper

- [x] Update `GenreAnalyzer.ts` if needed
  - [x] Ensure it can pass through two-step configs to `MusicClassifier`
  - [x] Update `GenreAnalyzerOptions` if it has its own model config
  - [x] Add tests for two-step model config pass-through
  - [x] Add tests for priority handling (models.genre > modelUrl > default)
  - [x] Add tests for preserving other model configs

---

## Phase 7: Testing

- [x] Add unit tests for two-step model flow
  - [x] Mock `tf.loadGraphModel()` for classifier
  - [x] Mock embedding model `predict()` to return fake embeddings
  - [x] Verify correct flow: features → embeddings → predictions
  - [x] Verify metadata shows both models

- [x] Add architecture-specific feature extraction tests
  - [x] Test architecture detection for effnet (from 'effnet' and 'discogs' keywords)
  - [x] Test architecture detection for vggish
  - [x] Test architecture detection for tempocnn
  - [x] Test architecture detection defaults to musicnn
  - [x] Test isTwoStepModel type guard
  - [x] Test 128-band extraction for effnet (calls Essentia WASM methods)
  - [x] Test 64-band extraction for vggish

- [x] Add backward compatibility tests for ALL model options
  - [x] Test genre with single URL string
  - [x] Test genre with two-step object
  - [x] Test mood with single URL string
  - [x] Test mood with two-step object (via cache test with shared embedding)
  - [x] Test danceability with single URL string
  - [x] Test danceability with two-step object (via mixed config test)
  - [x] Test voice/acoustic with both formats
  - [x] Ensure existing behavior unchanged

- [x] Add cache verification tests
  - [x] Verify embedding model is created only once when same URL used for genre and mood
  - [x] Verify cache is used on second call

- [x] Add mixed configuration tests
  - [x] Some models single-step, some two-step in same instance
  - [x] All two-step with shared embedding
  - [x] All single-step (original behavior)

---

## Phase 8: Documentation & Cleanup

- [x] Update JSDoc comments
  - [x] Document `TwoStepModelConfig` interface
  - [x] Document `cacheEmbeddings` option
  - [x] Document architecture differences (mel-band counts)
  - [x] Add examples in class-level docs

- [x] Update `DATA_ENGINE_REFERENCE.md` (reference tables)
  - [x] Update `MusicClassifier` Constructor Options table
  - [x] Add architecture compatibility table:

    | Architecture | Mel Bands | Extractor | Compatible Models |
    |--------------|-----------|-----------|-------------------|
    | `musicnn` | 96 | Essentia musicnn | MusiCNN, MSD |
    | `effnet` | 128 | Custom | Discogs-EffNet |
    | `vggish` | 64 | Essentia vggish | VGGish, AudioSet |
    | `tempocnn` | 40 | Essentia tempocnn | TempoCNN |

  - [x] Add note about embedding model caching behavior

- [x] Update `docs/AUDIO_ANALYSIS.md` (examples)
  - [x] Add two-step model usage examples
  - [x] Show both single-step and two-step configurations
  - [x] Document discogs-effnet + jamendo genre/mood workflow
  - [x] Add signal flow diagrams for both 1-step and 2-step
  - [x] Add architecture compatibility table

---

## Dependencies

- Essentia.js v0.1.3 (already installed) - provides `MelBands` algorithm for 128-band extraction
- TensorFlow.js (already installed via `@tensorflow/tfjs`)
- Model files need to be available at configured URLs

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/analysis/MusicClassifier.ts` | Add `effnet` architecture, 128-band extractor, two-step prediction, update `analyze()` |
| `src/core/analysis/MusicClassifier.test.ts` | Architecture tests, two-step model tests, backward compatibility tests |
| `src/core/analysis/GenreAnalyzer.ts` | Pass through two-step configs |
| `docs/AUDIO_ANALYSIS.md` | Usage documentation (optional) |

---

## Verification

1. **Build**: `npm run build` - TypeScript compiles without errors
2. **Tests**: `npm test` - All tests pass
3. **Manual**: Test with actual model files:
   - Two-step genre: discogs-effnet (128-band) + jamendo-genre
   - Two-step mood: discogs-effnet (128-band) + jamendo-mood
   - Single-step danceability: vggish (64-band)
4. **Cache**: Verify embedding model loaded once when shared between genre/mood
5. **Feature shapes**: Verify correct mel-band dimensions per architecture

---

## Summary of Changes from Original Plan

1. **Added `'effnet'` architecture type** - Discogs-EffNet uses 128 mel bands, not 96
2. **Added Phase 2.5** - Custom 128-band mel-spectrogram extraction required
3. **Updated feature extraction** - Must route to correct extractor based on architecture
4. **Updated two-step prediction** - Pass raw audio signal, extract features per-architecture
5. **Updated documentation requirements** - Add mel-band compatibility table

---

## Bug Fixes (Post-Implementation)

- [x] **Fixed GenreAnalyzer.test.ts mocks** (2026-03-12)
  - Issue: Test was failing with `TypeError: OfflineAudioContext is not a constructor`
  - Root cause: GenreAnalyzer.test.ts mocked `essentia.js` but MusicClassifier imports from `essentia.js/dist/essentia-wasm.es.js` and `essentia.js/dist/essentia.js-model.es.js`
  - Fix: Updated mocks to match the actual import paths used by MusicClassifier
  - Also updated test to use single-step model config since default is now two-step

---

## Questions/Unknowns

- [x] ~~What mel-band count does discogs-effnet use?~~ **Answer: 128 bands**
- [ ] What are the exact URLs/paths for the model files in production?
- [ ] Should classifier models also be cached, or only embeddings?
- [ ] Are there any memory constraints to consider with multiple cached models?
- [ ] Should we expose a method to clear the cache manually? (Done: `clearAllCaches()`)
