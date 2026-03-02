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
    // Accuracy threshold types
    AccuracyThresholds,
    DifficultyPreset,
    ThresholdValidationResult,
    // Downbeat configuration types
    TimeSignatureConfig,
    DownbeatSegment,
    DownbeatConfig,
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
    // Unified beat map types (for subdivision)
    UnifiedBeatMap,
    // Subdivision types
    SubdivisionType,
    SubdivisionSegment,
    SubdivisionConfig,
    SubdividedBeat,
    SubdividedBeatMap,
    SubdivisionMetadata,
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
    // Downbeat configuration constants and validation
    DEFAULT_TIME_SIGNATURE,
    DEFAULT_DOWNBEAT_CONFIG,
    MIN_BEATS_PER_MEASURE,
    MAX_BEATS_PER_MEASURE,
    validateDownbeatConfig,
    validateDownbeatConfigAgainstBeats,
    // Subdivision configuration constants and validation
    DEFAULT_SUBDIVISION_CONFIG,
    MAX_SUBDIVISION_DENSITY,
    VALID_SUBDIVISION_TYPES,
    isValidSubdivisionType,
    getSubdivisionDensity,
    validateSubdivisionConfig,
    validateSubdivisionConfigAgainstBeats,
    validateSubdivisionDensity,
} from '../../types/BeatMap.js';

// Classes
export { OnsetStrengthEnvelope, type OSEResult } from './OnsetStrengthEnvelope.js';
export { TempoDetector } from './TempoDetector.js';
export { BeatTracker, type BeatTrackingResult } from './BeatTracker.js';
export { BeatMapGenerator, type ProgressCallback } from './BeatMapGenerator.js';
export { BeatStream } from './BeatStream.js';
export { BeatInterpolator } from './BeatInterpolator.js';
export { BeatSubdivider, type BeatSubdividerOptions } from './BeatSubdivider.js';

// Beat map unification (for subdivision)
export { unifyBeatMap } from './utils/unifyBeatMap.js';

// Beat map subdivision convenience function
export { subdivideBeatMap } from './utils/subdivideBeatMap.js';

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

// Beat Key Helpers (for rhythm game chart creation)
export {
    assignKeyToBeat,
    assignKeysToBeats,
    extractKeyMap,
    clearAllKeys,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
    type KeyAssignableBeatMap,
    type KeyAssignment,
} from './beatKeyHelpers.js';
