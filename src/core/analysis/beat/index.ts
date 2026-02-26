/**
 * Beat Detection Module
 *
 * Exports for the Ellis Dynamic Programming beat tracking system.
 */

// Types
export type {
    Beat,
    BeatMap,
    BeatMapMetadata,
    BeatEvent,
    BeatEventType,
    BeatStreamCallback,
    AudioSyncState,
    BeatMapGeneratorOptions,
    BeatStreamOptions,
    BeatMapJSON,
    BeatAccuracy,
    ButtonPressResult,
    TempoEstimate,
    OSEConfig,
    BeatTrackerConfig,
    TempoDetectorConfig,
    BeatMapGenerationProgress,
} from '../../types/BeatMap.js';

export {
    DEFAULT_BEATMAP_GENERATOR_OPTIONS,
    DEFAULT_BEATSTREAM_OPTIONS,
    BEAT_ACCURACY_THRESHOLDS,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
} from '../../types/BeatMap.js';

// Classes
export { OnsetStrengthEnvelope, type OSEResult } from './OnsetStrengthEnvelope.js';
export { TempoDetector } from './TempoDetector.js';
export { BeatTracker, type BeatTrackingResult } from './BeatTracker.js';

// Utilities
export {
    hzToMel,
    melToHz,
    resampleAudio,
    createMelFilterbank,
    highPassFilter,
    gaussianSmooth,
    calculateStdDev,
    performFFT,
    performSTFT,
    type ResampledAudio,
    type STFTResult,
} from './utils/audioUtils.js';
