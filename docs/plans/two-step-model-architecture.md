# Two-Step Model Architecture Support for MusicClassifier

## Overview

Update `MusicClassifier` to support two-step model architectures where embedding and classifier models are separate files. This enables using models like Discogs-EffNet (embedding) + MTG Jamendo Genre/Mood (classifier) while maintaining backward compatibility with single-model approaches (MusiCNN-style).

### Key Design Principle

**Every model option (`genre`, `mood`, `danceability`, `voice`, `acoustic`) accepts EITHER:**

| Format | Type | Process | Example |
|--------|------|---------|---------|
| **Single string** | `string` | 1-step | `'/models/classifier.json'` |
| **Two-step object** | `{ embedding, classifier }` | 2-step | `{ embedding: '/models/emb.json', classifier: '/models/cls.json' }` |

The engine automatically detects which format is provided and executes the appropriate pipeline.

### Architecture Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Audio Signal   │ ──▶ │  Feature         │ ──▶ │  Embedding      │
│  (16kHz mono)   │     │  Extractor       │     │  Model          │
└─────────────────┘     │  (mel-spectrogram)│    │  (1280-dim)     │
                        └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Classifier     │
                                                 │  Model          │
                                                 │  (class probs)  │
                                                 └─────────────────┘
```

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
        // Two-step: embedding + classifier
        genre: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_genre-discogs-effnet-1.json'
        },
        // Two-step: same embedding cached, different classifier
        mood: {
            embedding: '/models/discogs-effnet-bs64-1.json',
            classifier: '/models/mtg_jamendo_moodtheme-discogs-effnet-1.json'
        },
        // Single-step: one model does it all
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

- [ ] Add new type definitions to `MusicClassifier.ts`
  - [ ] `ModelArchitecture` type: `'musicnn' | 'vggish' | 'tempocnn'`
  - [ ] `TwoStepModelConfig` interface with `embedding`, `classifier`, and optional `labels`
  - [ ] `ModelConfig` union type: `string | TwoStepModelConfig`
  - [ ] Update `MusicClassifierOptions` - ALL model options use `ModelConfig`:
    ```typescript
    models?: {
        genre?: ModelConfig;       // string OR { embedding, classifier }
        mood?: ModelConfig;        // string OR { embedding, classifier }
        danceability?: ModelConfig; // string OR { embedding, classifier }
        voice?: ModelConfig;       // string OR { embedding, classifier }
        acoustic?: ModelConfig;    // string OR { embedding, classifier }
    };
    ```
  - [ ] Add `cacheEmbeddings?: boolean` option

- [ ] Implement model architecture detection helpers
  - [ ] `detectModelArchitecture(modelUrl: string): ModelArchitecture`
    - Detect `vggish` from URL pattern
    - Detect `tempocnn` from URL pattern
    - Default to `musicnn` for discogs-effnet, msd, etc.
  - [ ] `isTwoStepModel(config): config is TwoStepModelConfig`
    - Type guard to check if config is two-step or single model

---

## Phase 2: Embedding Model Cache

- [ ] Add embedding model caching infrastructure
  - [ ] Add `private embeddingModelCache: Map<string, any>` property
  - [ ] Add `private classifierModelCache: Map<string, any>` property (optional, for reuse)

- [ ] Implement `getEmbeddingModel()` method
  - [ ] Check cache first, return cached model if available
  - [ ] Select correct model class based on architecture:
    - `vggish` → `TensorflowVGGish`
    - `musicnn`/`tempocnn` → `TensorflowMusiCNN`
  - [ ] Initialize and cache model if `cacheEmbeddings` is true
  - [ ] Return model instance

---

## Phase 3: Two-Step Prediction Logic

- [ ] Implement embedding computation helpers
  - [ ] `averageEmbeddings(embeddings: number[][]): number[]`
    - Average embeddings across all audio frames
    - Handle empty arrays gracefully

- [ ] Implement classifier execution on embeddings
  - [ ] `runClassifierOnEmbeddings(classifierUrl: string, embeddings: number[][]): Promise<number[]>`
    - Load classifier model directly with `tf.loadGraphModel()`
    - Average embeddings across frames
    - Create input tensor with correct shape `[1, embedding_dim]`
    - Execute model and get predictions
    - Properly dispose tensors and model after inference
    - Return prediction array

- [ ] Implement main two-step prediction method
  - [ ] `predictWithTwoStepModel(config: TwoStepModelConfig, features: any[]): Promise<number[]>`
    - Detect embedding architecture
    - Get/create embedding model (with caching)
    - Run embedding model to get feature vectors
    - Run classifier on embeddings
    - Return averaged predictions

---

## Phase 4: Update analyze() Method

- [ ] Create helper method for unified model prediction
  - [ ] `runModelPrediction(config: ModelConfig, features: any[], labels: string[]): Promise<ClassificationTag[]>`
  - [ ] Detects if config is single-step (string) or two-step (object)
  - [ ] Calls appropriate prediction method
  - [ ] Returns mapped predictions with labels

- [ ] Refactor ALL model analysis to use unified pattern
  - [ ] Genre: single or two-step → `JAMENDO_GENRES` labels
  - [ ] Mood: single or two-step → `JAMENDO_MOODS` labels
  - [ ] Danceability: single or two-step → `['danceable', 'non-danceable']` labels
  - [ ] Voice: single or two-step → `['voice', 'instrumental']` labels (or similar)
  - [ ] Acoustic: single or two-step → appropriate labels

- [ ] Track models used in metadata
  - [ ] Single-step: just the model URL
  - [ ] Two-step: `"embedding -> classifier"` format

---

## Phase 5: Update Default Configuration

- [ ] Update constructor defaults (all support single OR two-step)
  - [ ] Genre: two-step `{ embedding, classifier }` with discogs-effnet + jamendo-genre
  - [ ] Mood: two-step `{ embedding, classifier }` with discogs-effnet + jamendo-mood
  - [ ] Danceability: single-model string (VGGish) - can be upgraded to two-step later
  - [ ] Voice: optional, single or two-step
  - [ ] Acoustic: optional, single or two-step
  - [ ] Set `cacheEmbeddings: true` by default
  - [ ] User can override ANY option with either format

---

## Phase 6: Update GenreAnalyzer Wrapper

- [ ] Update `GenreAnalyzer.ts` if needed
  - [ ] Ensure it can pass through two-step configs to `MusicClassifier`
  - [ ] Update `GenreAnalyzerOptions` if it has its own model config

---

## Phase 7: Testing

- [ ] Add unit tests for two-step model flow
  - [ ] Mock `tf.loadGraphModel()` for classifier
  - [ ] Mock embedding model `predict()` to return fake embeddings
  - [ ] Verify correct flow: features → embeddings → predictions
  - [ ] Verify metadata shows both models

- [ ] Add backward compatibility tests for ALL model options
  - [ ] Test genre with single URL string
  - [ ] Test genre with two-step object
  - [ ] Test mood with single URL string
  - [ ] Test mood with two-step object
  - [ ] Test danceability with single URL string
  - [ ] Test danceability with two-step object
  - [ ] Test voice/acoustic with both formats
  - [ ] Ensure existing behavior unchanged

- [ ] Add cache verification tests
  - [ ] Verify embedding model is created only once when same URL used for genre and mood
  - [ ] Verify cache is used on second call

- [ ] Add mixed configuration tests
  - [ ] Some models single-step, some two-step in same instance
  - [ ] All two-step with shared embedding
  - [ ] All single-step (original behavior)

---

## Phase 8: Documentation & Cleanup

- [ ] Update JSDoc comments
  - [ ] Document `TwoStepModelConfig` interface
  - [ ] Document `cacheEmbeddings` option
  - [ ] Add examples in class-level docs

- [ ] Update `DATA_ENGINE_REFERENCE.md` (reference tables)
  - [ ] Update `MusicClassifier` Constructor Options table:
    - Add new `models` option with type showing both formats accepted
    - Add `cacheEmbeddings` option
  - [ ] Update `models` option description to explain single-string vs two-step object format
  - [ ] Add note about embedding model caching behavior

- [ ] Update `docs/AUDIO_ANALYSIS.md` (examples)
  - [ ] Add two-step model usage examples
  - [ ] Show both single-step and two-step configurations
  - [ ] Document discogs-effnet + jamendo genre/mood workflow
  - [ ] Add signal flow diagrams for both 1-step and 2-step
  - [ ] Add architecture compatibility table (which models work with which extractor)

---

## Dependencies

- Essentia.js v0.1.3 (already installed)
- TensorFlow.js (already installed via `@tensorflow/tfjs`)
- Model files need to be available at configured URLs

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/core/analysis/MusicClassifier.ts` | Types, cache, two-step prediction, update `analyze()` |
| `src/core/analysis/MusicClassifier.test.ts` | Two-step model tests, backward compatibility tests |
| `src/core/analysis/GenreAnalyzer.ts` | Pass through two-step configs |
| `docs/AUDIO_ANALYSIS.md` | Usage documentation (optional) |

---

## Verification

1. **Build**: `npm run build` - TypeScript compiles without errors
2. **Tests**: `npm test` - All tests pass
3. **Manual**: Test with actual model files:
   - Two-step genre: discogs-effnet + jamendo-genre
   - Two-step mood: discogs-effnet + jamendo-mood
   - Single-step danceability: vggish model
4. **Cache**: Verify embedding model loaded once when shared between genre/mood

---

## Questions/Unknowns

- [ ] What are the exact URLs/paths for the model files in production?
- [ ] Should classifier models also be cached, or only embeddings?
- [ ] Are there any memory constraints to consider with multiple cached models?
- [ ] Should we expose a method to clear the cache manually?
