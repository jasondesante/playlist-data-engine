/**
 * @file Audio analysis entry point (TensorFlow.js-dependent).
 *
 * This subpath re-exports the audio-analysis and level-generation surface that
 * depends on `@tensorflow/tfjs` (directly or transitively). Importing from
 * `playlist-data-engine/analysis` will pull TensorFlow.js into the consumer's
 * bundle — so it should only be imported by code that actually performs audio
 * analysis (typically inside a Web Worker, so the TF runtime is isolated to
 * the worker thread).
 *
 * The main entry (`playlist-data-engine`) and the gateway entry
 * (`playlist-data-engine/gateway`) are TF-free by design. Keep it that way:
 * do NOT re-export anything from this file via `src/index.ts` or `src/gateway.ts`.
 *
 * Consumers that need analysis: `import { MusicClassifier } from 'playlist-data-engine/analysis'`.
 */

// ML model cache (localForage-backed IndexedDB persistence for TF.js models)
export {
    ModelCache,
    modelCache,
    type ModelCacheOptions,
    type ModelCacheFetchOptions,
} from './utils/modelCache.js';

// Essentia Pitch Detector (WASM algorithms + CREPE) — imports @tensorflow/tfjs
export {
    EssentiaPitchDetector,
    DEFAULT_CREPE_MODEL_URL,
    type EssentiaPitchAlgorithm,
    type PitchAlgorithm,
} from './core/analysis/EssentiaPitchDetector.js';

// Pitch Beat Linker (depends on EssentiaPitchDetector)
export {
    PitchBeatLinker,
    type PitchBeatLinkerConfig,
    type PitchAtBeat,
    type PitchBandName as LinkedPitchBandName,
    type PitchDirection,
    type IntervalCategory,
} from './core/generation/PitchBeatLinker.js';

// PitchAnalyzer (depends on EssentiaPitchDetector)
export {
    PitchAnalyzer,
    type PitchAnalyzerConfig,
    type PitchAnalysisProfile,
    type PitchContour,
    type PitchContourSegment,
    type PitchContourSegmentDirection,
    type PitchContourDirection,
} from './core/analysis/PitchAnalyzer.js';

// Button Mapper (depends on TF-bearing generation tree)
export {
    ButtonMapper,
    type MappedLevelResult,
    type ButtonMappingMetadata,
} from './core/generation/ButtonMapper.js';

// Beat Converter (depends on TF-bearing generation tree)
export {
    BeatConverter,
} from './core/generation/BeatConverter.js';

// Level Generator (depends on TF-bearing generation tree)
export {
    LevelGenerator,
    type LevelGenerationOptions,
    type LevelMetadata,
    type GeneratedLevel,
    type AllDifficultiesResult,
    type LevelProgressCallback,
    type LevelGenerationProgress,
} from './core/generation/LevelGenerator.js';

// Level Serializer (depends on TF-bearing analysis tree)
export {
    LevelSerializer,
    type LevelSerializerOptions,
} from './core/analysis/LevelSerializer.js';

// Audio Analyzer (depends on MusicClassifier)
export { AudioAnalyzer, type AudioAnalyzerOptions, type SamplingStrategy } from './core/analysis/AudioAnalyzer.js';

// Music Classifier (genre/mood ML) — imports @tensorflow/tfjs
export {
    MusicClassifier,
    type MusicClassifierOptions,
    type ModelArchitecture,
    type GenreListType,
    type TwoStepModelConfig,
    type SingleStepModelConfig,
    type ModelConfig,
    type GenrePreset,
    type MoodPreset,
    type DanceabilityPreset,
    type ClassifierPreset,
    isTwoStepModel,
    isSingleStepModel,
    detectModelArchitecture,
    detectGenreListType,
    getGenreLabels,
    formatModelForMetadata,
    averageEmbeddings,
    DEFAULT_ARWEAVE_MODELS,
    GENRE_PRESETS,
    MOOD_PRESETS,
    DANCEABILITY_PRESETS,
    AVAILABLE_PRESETS,
    DISCOGS400_GENRES
} from './core/analysis/MusicClassifier.js';
