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
    DownbeatDetectorConfig,
    DownbeatDetectionResult,
    BeatMapGenerationProgress,
    // Accuracy threshold types
    AccuracyThresholds,
    DifficultyPreset,
    ThresholdValidationResult,
    // Beat interpolation types
    BeatSource,
    BeatWithSource,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
    InterpolatedBeatMap,
    BeatInterpolationOptions,
    // JSON serialization types for interpolation
    BeatWithSourceJSON,
    QuarterNoteDetectionJSON,
    GapAnalysisJSON,
    InterpolationMetadataJSON,
    InterpolatedBeatMapJSON,
} from '../../types/BeatMap.js';

export {
    DEFAULT_BEATMAP_GENERATOR_OPTIONS,
    DEFAULT_BEATSTREAM_OPTIONS,
    BEAT_ACCURACY_THRESHOLDS,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    // Difficulty preset thresholds
    EASY_ACCURACY_THRESHOLDS,
    MEDIUM_ACCURACY_THRESHOLDS,
    HARD_ACCURACY_THRESHOLDS,
    getAccuracyThresholdsForPreset,
    // Validation helper
    validateThresholds,
    // Beat interpolation defaults
    DEFAULT_BEAT_INTERPOLATION_OPTIONS,
} from '../../types/BeatMap.js';

// Classes
export { OnsetStrengthEnvelope, type OSEResult } from './OnsetStrengthEnvelope.js';
export { TempoDetector } from './TempoDetector.js';
export { BeatTracker, type BeatTrackingResult } from './BeatTracker.js';
export { DownbeatDetector } from './DownbeatDetector.js';
export { BeatMapGenerator, type ProgressCallback } from './BeatMapGenerator.js';
export { BeatStream } from './BeatStream.js';
export { BeatInterpolator } from './BeatInterpolator.js';

// Debug utilities
export {
    generateDebugReport,
    collectHistogramData,
    collectGapDetails,
    collectBeatDebugInfo,
    collectTempoDriftData,
    formatDebugReportToConsole,
    formatDebugReportToJSON,
    generateTempoDriftVisualization,
    generateConfidenceVisualization,
    BeatInterpolationDebug,
    DEFAULT_DEBUG_OUTPUT_OPTIONS,
} from './utils/beatInterpolationDebug.js';
export type {
    HistogramEntry,
    GapDetail,
    TempoDriftPoint,
    BeatDebugInfo,
    InterpolationDebugReport,
    DebugOutputOptions,
} from './utils/beatInterpolationDebug.js';

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
