# playlist-data-engine: Arweave Default URLs Upgrade Plan

## Overview

Upgrade the MusicClassifier to support Arweave-hosted default model URLs with explicit type parameters. **This plan must NOT break existing playlist-data-showcase usage.**

### Critical Requirements

1. **Backward Compatibility**: Existing code using `string | TwoStepModelConfig` must continue to work
2. **Explicit Type Parameters**: Support `modelType`, `embeddingType`, `classifierType` for Arweave URLs
3. **Default to Arweave**: New `DEFAULT_MODELS` constant with Arweave URLs
4. **Seamless Transition**: Frontend should work without changes after engine update

### Handoff to Frontend

After completing **Phase 3**, the engine is ready for frontend integration.
Frontend plan: `SHOWCASE_ARWEAVE_UPGRADE_PLAN.md`

---

## Phase 1: Add New Types (Non-Breaking)

**Goal**: Add new interfaces and type guards without changing any existing behavior.

### 1.1 Add SingleStepModelConfig Interface

**File:** `src/core/analysis/MusicClassifier.ts`

Add AFTER the existing `TwoStepModelConfig` interface:

```typescript
/**
 * Configuration for single-step model architecture where one model
 * handles feature extraction and classification internally.
 */
export interface SingleStepModelConfig {
    /** URL to the model file */
    modelUrl: string;
    /** Explicit model architecture type (overrides URL detection) */
    modelType: ModelArchitecture;
    /** Optional custom labels for model output */
    labels?: string[];
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`
- [x] Build succeeds: `npm run build`

---

### 1.2 Extend TwoStepModelConfig Interface

**File:** `src/core/analysis/MusicClassifier.ts`

Add optional type parameters to the EXISTING interface (non-breaking since they're optional):

```typescript
export interface TwoStepModelConfig {
    /** URL to the embedding model (e.g., discogs-effnet-bs64-1.json) */
    embedding: string;
    /** URL to the classifier model that operates on embeddings */
    classifier: string;
    /** Optional custom labels for classifier output */
    labels?: string[];
    /** Explicit embedding architecture type (overrides URL detection) */
    embeddingType?: ModelArchitecture;
    /** Explicit classifier type for genre models (overrides URL detection) */
    classifierType?: GenreListType;
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`
- [x] Build succeeds: `npm run build`

---

### 1.3 Add Type Guards

**File:** `src/core/analysis/MusicClassifier.ts`

Add AFTER the interfaces:

```typescript
/**
 * Type guard to check if a model config is a single-step configuration.
 */
export function isSingleStepModel(config: unknown): config is SingleStepModelConfig {
    return typeof config === 'object' && config !== null && 'modelUrl' in config;
}

/**
 * Type guard to check if a model config is a two-step configuration.
 */
export function isTwoStepModel(config: unknown): config is TwoStepModelConfig {
    return typeof config === 'object' && config !== null &&
        'embedding' in config && 'classifier' in config;
}

/**
 * Type guard to check if a model config is a plain string (legacy format).
 */
export function isStringModel(config: unknown): config is string {
    return typeof config === 'string';
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`
- [x] Build succeeds: `npm run build`

---

### 1.4 Add Unit Tests for Type Guards

**File:** `src/core/analysis/__tests__/MusicClassifier.types.test.ts` (new file)

```typescript
import { describe, it, expect } from 'vitest';
import { isSingleStepModel, isTwoStepModel, isStringModel } from '../MusicClassifier';

describe('Model Config Type Guards', () => {
    describe('isSingleStepModel', () => {
        it('returns true for valid SingleStepModelConfig', () => {
            expect(isSingleStepModel({ modelUrl: 'https://example.com/model.json', modelType: 'musicnn' })).toBe(true);
        });

        it('returns true with optional labels', () => {
            expect(isSingleStepModel({
                modelUrl: 'https://example.com/model.json',
                modelType: 'effnet',
                labels: ['a', 'b']
            })).toBe(true);
        });

        it('returns false for TwoStepModelConfig', () => {
            expect(isSingleStepModel({ embedding: 'a', classifier: 'b' })).toBe(false);
        });

        it('returns false for string', () => {
            expect(isSingleStepModel('https://example.com/model.json')).toBe(false);
        });

        it('returns false for null/undefined', () => {
            expect(isSingleStepModel(null)).toBe(false);
            expect(isSingleStepModel(undefined)).toBe(false);
        });
    });

    describe('isTwoStepModel', () => {
        it('returns true for valid TwoStepModelConfig', () => {
            expect(isTwoStepModel({ embedding: 'a', classifier: 'b' })).toBe(true);
        });

        it('returns true with optional type params', () => {
            expect(isTwoStepModel({
                embedding: 'a',
                classifier: 'b',
                embeddingType: 'effnet',
                classifierType: 'discogs400'
            })).toBe(true);
        });

        it('returns false for SingleStepModelConfig', () => {
            expect(isTwoStepModel({ modelUrl: 'a', modelType: 'musicnn' })).toBe(false);
        });

        it('returns false for string', () => {
            expect(isTwoStepModel('https://example.com/model.json')).toBe(false);
        });
    });

    describe('isStringModel', () => {
        it('returns true for string', () => {
            expect(isStringModel('https://example.com/model.json')).toBe(true);
        });

        it('returns false for objects', () => {
            expect(isStringModel({ modelUrl: 'a', modelType: 'musicnn' })).toBe(false);
            expect(isStringModel({ embedding: 'a', classifier: 'b' })).toBe(false);
        });
    });
});
```

**Validation:**
- [x] Tests pass: `npm test`
- [x] TypeScript compiles without errors

---

## Phase 2: Update Detection Functions (Non-Breaking)

**Goal**: Add optional explicit type parameters to detection functions.

### 2.1 Update detectModelArchitecture()

**File:** `src/core/analysis/MusicClassifier.ts`

Find the existing function and add the optional parameter:

```typescript
export function detectModelArchitecture(
    modelUrl: string,
    explicitType?: ModelArchitecture
): ModelArchitecture {
    // Use explicit type if provided
    if (explicitType) return explicitType;

    // Existing URL parsing logic unchanged
    const url = modelUrl.toLowerCase();
    if (url.includes('effnet') || url.includes('discogs')) return 'effnet';
    if (url.includes('vggish')) return 'vggish';
    if (url.includes('tempocnn') || (url.includes('tempo') && !url.includes('temple'))) return 'tempocnn';
    return 'musicnn';
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`

---

### 2.2 Update detectGenreListType()

**File:** `src/core/analysis/MusicClassifier.ts`

Find the existing function and add the optional parameter:

```typescript
export function detectGenreListType(
    modelUrl: string,
    explicitType?: GenreListType
): GenreListType {
    // Use explicit type if provided
    if (explicitType) return explicitType;

    // Existing URL parsing logic unchanged
    const url = modelUrl.toLowerCase();
    if (url.includes('jamendo')) return 'jamendo';
    if (url.includes('discogs400') || url.includes('discogs')) return 'discogs400';
    if (url.includes('tzanetakis')) return 'tzanetakis';
    if (url.includes('mtt_musicnn')) return 'mtt_musicnn';
    return 'jamendo';
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`

---

### 2.3 Add Tests for Explicit Type Override

**File:** `src/core/analysis/__tests__/MusicClassifier.types.test.ts`

Add to existing test file:

```typescript
import { detectModelArchitecture, detectGenreListType } from '../MusicClassifier';

describe('Detection Functions with Explicit Types', () => {
    describe('detectModelArchitecture', () => {
        it('uses URL parsing when no explicit type', () => {
            expect(detectModelArchitecture('https://example.com/effnet/model.json')).toBe('effnet');
            expect(detectModelArchitecture('https://example.com/vggish/model.json')).toBe('vggish');
            expect(detectModelArchitecture('https://example.com/musicnn/model.json')).toBe('musicnn');
        });

        it('overrides URL detection with explicit type', () => {
            expect(detectModelArchitecture('https://example.com/effnet/model.json', 'musicnn')).toBe('musicnn');
            expect(detectModelArchitecture('https://example.com/model.json', 'effnet')).toBe('effnet');
        });
    });

    describe('detectGenreListType', () => {
        it('uses URL parsing when no explicit type', () => {
            expect(detectGenreListType('https://example.com/jamendo/model.json')).toBe('jamendo');
            expect(detectGenreListType('https://example.com/discogs400/model.json')).toBe('discogs400');
        });

        it('overrides URL detection with explicit type', () => {
            expect(detectGenreListType('https://example.com/jamendo/model.json', 'discogs400')).toBe('discogs400');
            expect(detectGenreListType('https://example.com/model.json', 'tzanetakis')).toBe('tzanetakis');
        });
    });
});
```

**Validation:**
- [x] Tests pass: `npm test`

---

## Phase 3: Update Core Logic (Non-Breaking)

**Goal**: Update internal methods to handle new config types while maintaining backward compatibility.

### 3.1 Update runModelPrediction()

**File:** `src/core/analysis/MusicClassifier.ts`

Find the existing `runModelPrediction()` method and update to handle all three cases:

```typescript
private async runModelPrediction(
    config: string | SingleStepModelConfig | TwoStepModelConfig,
    audioSignal: Float32Array,
    labels: string[]
): Promise<ClassificationTag[]> {
    let predictions: number[];

    if (isStringModel(config)) {
        // Legacy: plain string URL
        const architecture = detectModelArchitecture(config);
        const features = this.extractor.computeFrameWise(audioSignal, 512);
        predictions = await this.predictWithModel(config, features);
    } else if (isTwoStepModel(config)) {
        // Two-step architecture: embedding + classifier
        predictions = await this.predictWithTwoStepModel(config, audioSignal);
    } else if (isSingleStepModel(config)) {
        // Single-step architecture: one model with explicit type
        const architecture = detectModelArchitecture(config.modelUrl, config.modelType);
        const features = this.getFeaturesForArchitecture(audioSignal, architecture);
        predictions = await this.predictWithModel(config.modelUrl, features);
    } else {
        throw new Error('Invalid model configuration');
    }

    return this.mapPredictions(predictions, labels);
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`
- [x] Build succeeds: `npm run build`

---

### 3.2 Update predictWithTwoStepModel()

**File:** `src/core/analysis/MusicClassifier.ts`

Find the existing method and update to use explicit type if provided:

```typescript
private async predictWithTwoStepModel(
    config: TwoStepModelConfig,
    audioSignal: Float32Array
): Promise<number[]> {
    // Step 1: Detect embedding architecture (use explicit type if provided)
    const architecture = detectModelArchitecture(config.embedding, config.embeddingType);

    // Step 2: Get architecture-specific features
    const features = this.getFeaturesForArchitecture(audioSignal, architecture);

    // ... rest of existing method unchanged ...
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`

---

### 3.3 Update formatModelForMetadata()

**File:** `src/core/analysis/MusicClassifier.ts`

Find the existing function and update:

```typescript
export function formatModelForMetadata(config: string | SingleStepModelConfig | TwoStepModelConfig): string {
    if (isStringModel(config)) {
        return config;
    }
    if (isTwoStepModel(config)) {
        return `${config.embedding} -> ${config.classifier}`;
    }
    if (isSingleStepModel(config)) {
        return config.modelUrl;
    }
    return String(config);
}
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`

---

### 3.4 Update analyze() Method

**File:** `src/core/analysis/MusicClassifier.ts`

Find the section where genre model type is detected and update to pass explicit type:

```typescript
// In the genre analysis section, find this line:
const genreType = detectGenreListType(genreModelUrl);

// Change to:
const genreConfig = this.options.models?.genre;
const genreType = isTwoStepModel(genreConfig) && genreConfig.classifierType
    ? genreConfig.classifierType
    : detectGenreListType(genreModelUrl);
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Run existing tests: `npm test`
- [x] Manual test: Verify genre analysis still works with local models

---

## Phase 4: Add Default Arweave Models (Non-Breaking)

**Goal**: Add default model configurations that frontend can opt into.

### 4.1 Create DEFAULT_MODELS Constant

**File:** `src/core/analysis/MusicClassifier.ts`

Add near the top of the file (after imports, before the class):

```typescript
/**
 * Default model configurations using Arweave-hosted models.
 * These work out-of-the-box without any local model files.
 */
export const DEFAULT_ARWEAVE_MODELS = {
    genre: {
        embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
        classifier: 'https://arweave.net/ZY-GSfMe7crJUITAtHITcoLCNfNWVP1HMwywivZ_LAQ/model.json',
        embeddingType: 'effnet' as ModelArchitecture,
        classifierType: 'discogs400' as GenreListType
    },
    mood: {
        embedding: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
        classifier: 'https://arweave.net/BUXf3AoFuIsrNDkV2hW6BhiwSVTuFllWOUQv5mu6qQ8/model.json',
        embeddingType: 'effnet' as ModelArchitecture
    },
    danceability: {
        modelUrl: 'https://arweave.net/kUIS-Xxr4k3MZ4K2gHdvMgZxK7aBYce_FPGIkGA_hjM/model.json',
        modelType: 'musicnn' as ModelArchitecture
    }
} as const;
```

**Note**: Replace placeholder URLs with actual Arweave transaction IDs.

**Validation:**
- [x] TypeScript compiles without errors
- [x] Export is accessible: `npm run build`

---

### 4.2 Export Types and Constants

**File:** `src/index.ts`

Ensure all new types are exported:

```typescript
export {
    MusicClassifier,
    type MusicClassifierOptions,
    type ModelArchitecture,
    type GenreListType,
    type TwoStepModelConfig,
    type SingleStepModelConfig,
    type ModelConfig,
    isTwoStepModel,
    isSingleStepModel,
    isStringModel,
    detectModelArchitecture,
    detectGenreListType,
    getGenreLabels,
    formatModelForMetadata,
    averageEmbeddings,
    DEFAULT_ARWEAVE_MODELS,
    DISCOGS400_GENRES
} from './core/analysis/MusicClassifier.js';
```

**Validation:**
- [x] TypeScript compiles without errors
- [x] Build succeeds: `npm run build`

---

## Phase 5: Documentation Updates

### 5.1 Update DATA_ENGINE_REFERENCE.md

- [x] Document `SingleStepModelConfig` interface
- [x] Document new optional fields in `TwoStepModelConfig`
- [x] Document `DEFAULT_ARWEAVE_MODELS` constant
- [x] Add examples using explicit type parameters
- [x] Add migration guide for upgrading

### 5.2 Update AUDIO_ANALYSIS.md

- [x] Add section on model configuration formats
- [x] Document explicit type parameters
- [x] Add Arweave URL examples

---

## Phase 6: Final Validation

### 6.1 Full Test Suite

```bash
npm test
npm run build
```
- [x] All tests pass
- [x] Build succeeds
- [x] No TypeScript errors

### 6.2 Integration Test with Local Showcase

1. Link the engine locally:
   ```bash
   cd playlist-data-engine
   npm link
   cd ../playlist-data-showcase
   npm link playlist-data-engine
   ```

2. Run the showcase:
   ```bash
   npm run dev
   ```

3. Test genre analysis with a sample track:
   - [ ] Genre analysis works
   - [ ] Mood analysis works
   - [ ] Danceability analysis works
   - [ ] No console errors

### 6.3 Publish

```bash
npm version patch  # or minor if adding features
npm publish
```

---

## Handoff Checklist

Before handing off to frontend:

- [ ] All tests pass
- [ ] Build succeeds
- [ ] Published to npm (or available via git)
- [ ] Documentation updated
- [ ] Integration tested with showcase

**Frontend can now proceed with:** `SHOWCASE_ARWEAVE_UPGRADE_PLAN.md`

---

## Rollback Plan

If any phase breaks the showcase:

1. Revert the specific commit for that phase
2. Verify showcase works again
3. Investigate the issue before retrying

Each phase is a separate commit for easy rollback.
