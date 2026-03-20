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
    SubdivisionConfig,
    SubdividedBeat,
    SubdividedBeatMap,
    SubdivisionMetadata,
    // Groove analyzer types
    GrooveDirection,
    GrooveResult,
    GrooveState,
    GrooveAnalyzerOptions,
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
    // Groove analyzer defaults
    DEFAULT_GROOVE_OPTIONS,
} from '../../types/BeatMap.js';

// Classes
export { OnsetStrengthEnvelope, type OSEResult } from './OnsetStrengthEnvelope.js';
export { TempoDetector } from './TempoDetector.js';
export { BeatTracker, type BeatTrackingResult } from './BeatTracker.js';
export { BeatMapGenerator, type ProgressCallback } from './BeatMapGenerator.js';
export { BeatStream } from './BeatStream.js';
export { BeatInterpolator } from './BeatInterpolator.js';
export { BeatSubdivider, type BeatSubdividerOptions } from './BeatSubdivider.js';
export { GrooveAnalyzer } from './GrooveAnalyzer.js';

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

// Transient Detector
export { TransientDetector } from './TransientDetector.js';
export type {
    TransientResult,
    TransientAnalysis,
    TransientDetectorConfig,
    TransientDetectionMethod,
} from './TransientDetector.js';

// Rhythm Quantizer
export { RhythmQuantizer } from './RhythmQuantizer.js';
export type {
    QuantizationConfig,
    QuantizedBandStreams,
    DensityValidationConfig,
    DensityValidationResult,
    GridType,
    GridDecision,
    GeneratedBeat,
    GeneratedRhythmMap,
} from './RhythmQuantizer.js';

// Phrase Analyzer
export { PhraseAnalyzer } from './PhraseAnalyzer.js';
export type {
    PhraseOccurrence,
    RhythmicPhrase,
    BandPhraseAnalysis,
    PhraseAnalysisResult,
    PhraseAnalyzerConfig,
} from './PhraseAnalyzer.js';

// Density Analyzer
export { DensityAnalyzer } from './DensityAnalyzer.js';
export type {
    DensityCategory,
    NaturalDifficulty,
    BeatDensityMetrics,
    SectionDensityMetrics,
    BandDensityMetrics,
    DensityAnalysisResult,
    DensityAnalyzerConfig,
} from './DensityAnalyzer.js';

// Stream Scorer
export { StreamScorer } from './StreamScorer.js';
export type {
    Band,
    ScoringFactors,
    SectionScore,
    StreamScoringResult,
    SectionWinner,
    StreamScorerConfig,
} from './StreamScorer.js';

// Composite Stream Generator
export { CompositeStreamGenerator } from './CompositeStreamGenerator.js';
export type {
    CompositeSection,
    CompositeBeat,
    CompositeStream,
    CompositeStreamConfig,
} from './CompositeStreamGenerator.js';

// Difficulty Variant Generator
export {
    DifficultyVariantGenerator,
    SUBDIVISION_LIMITS,
    ALL_GRID_TYPES,
    isGridTypeAllowed,
    getAllowedGridTypes,
    convertToAllowedGridType,
    naturalDifficultyToLevel,
    validateSubdivisionLimits,
} from './DifficultyVariantGenerator.js';
export type {
    ExtendedGridType,
    DifficultyLevel,
    MaxSubdivision,
    SubdivisionLimitConfig,
    EditType,
    VariantBeat,
    DifficultyVariant,
    SubdivisionConversionMetadata,
    SubdivisionValidationResult,
    SubdivisionViolation,
    DifficultyVariantConfig,
} from './DifficultyVariantGenerator.js';

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
