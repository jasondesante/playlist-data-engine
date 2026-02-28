/**
 * Beat Detection type definitions
 *
 * Based on the Ellis Dynamic Programming beat tracking algorithm
 * Reference: "Beat Tracking by Dynamic Programming" (Ellis, 2007)
 */

/**
 * Represents a single detected beat in the audio
 */
export interface Beat {
    /** Timestamp in seconds from the start of the audio */
    timestamp: number;

    /** Position within the measure (0 = downbeat, 1, 2, 3, etc. for subsequent beats) */
    beatInMeasure: number;

    /** Whether this beat is a downbeat (first beat of a measure) */
    isDownbeat: boolean;

    /** Measure number (0-indexed from first detected downbeat) */
    measureNumber: number;

    /** Onset strength at this beat (0.0 - 1.0, normalized) */
    intensity: number;

    /** Confidence score for this beat detection (0.0 - 1.0) */
    confidence: number;
}

/**
 * Metadata about the beat detection algorithm and settings used
 */
export interface BeatMapMetadata {
    /** Version of the beat detection algorithm */
    version: string;

    /** Algorithm name (e.g., 'ellis-dp-v1') */
    algorithm: string;

    /** Minimum BPM threshold used during detection */
    minBpm: number;

    /** Maximum BPM threshold used during detection */
    maxBpm: number;

    /** Pre-processing sensitivity used (0.1 - 10.0) */
    sensitivity: number;

    /** Post-processing grid-alignment filter used (0.0 - 1.0) */
    filter: number;

    /** Noise floor threshold for filtering low-energy detections */
    noiseFloorThreshold: number;

    /** Milliseconds between FFT frames */
    hopSizeMs: number;

    /** FFT window size in samples */
    fftSize: number;

    /** Ellis balance factor (alpha) for tempo consistency vs onset strength */
    dpAlpha: number;

    /** Number of Mel frequency bands for onset strength envelope */
    melBands: number;

    /** High-pass filter cutoff in Hz for onset strength envelope */
    highPassCutoff: number;

    /** Gaussian smoothing window in ms for onset strength envelope */
    gaussianSmoothMs: number;

    /** Tempo center in seconds (default 0.5s = 120 BPM) */
    tempoCenter: number;

    /** Tempo width in octaves for perception weighting */
    tempoWidth: number;

    /** Timestamp when the beat map was generated */
    generatedAt: string;
}

/**
 * Complete beat map for a single audio track
 *
 * Contains all detected beats and metadata. BPM is calculated dynamically
 * during playback from actual beat intervals, not stored as a static value.
 */
export interface BeatMap {
    /** Unique identifier for the audio source */
    audioId: string;

    /** Duration of the audio in seconds */
    duration: number;

    /** Array of all detected beats */
    beats: Beat[];

    /** Initial BPM estimate from tempo detection */
    bpm: number;

    /** Algorithm metadata and settings */
    metadata: BeatMapMetadata;
}

/**
 * Event types emitted by the BeatStream during playback
 */
export type BeatEventType = 'upcoming' | 'exact' | 'passed';

/**
 * Event emitted by the BeatStream during playback
 */
export interface BeatEvent {
    /** The beat this event relates to */
    beat: Beat;

    /** Current BPM calculated from recent beat intervals */
    currentBpm: number;

    /** Current audio context time in seconds */
    audioTime: number;

    /** Time until the beat occurs (negative if passed) */
    timeUntilBeat: number;

    /** Type of event: 'upcoming', 'exact', or 'passed' */
    type: BeatEventType;
}

/**
 * Callback function type for BeatStream subscriptions
 */
export type BeatStreamCallback = (event: BeatEvent) => void;

/**
 * Audio synchronization state for debugging and monitoring
 */
export interface AudioSyncState {
    /** Current audio context time in seconds */
    audioContextTime: number;

    /** Audio element current time in seconds */
    audioElementTime: number;

    /** Calculated drift between audio and beat stream */
    drift: number;

    /** Whether the sync is within acceptable tolerance */
    isSynchronized: boolean;

    /** Output latency from AudioContext (0 if unsupported) */
    outputLatency: number;

    /** Base latency from AudioContext (0 if unsupported) */
    baseLatency: number;

    /** User-calibrated offset in milliseconds */
    userOffsetMs: number;

    /** Total effective latency compensation in seconds */
    totalCompensation: number;
}

/**
 * Options for BeatMapGenerator
 */
export interface BeatMapGeneratorOptions {
    /** Minimum BPM to detect (default: 60) */
    minBpm?: number;

    /** Maximum BPM to detect (default: 180) */
    maxBpm?: number;

    /** Pre-processing sensitivity (0.1-10.0, default: 1.0) */
    sensitivity?: number;

    /** Post-processing grid-alignment filter (0.0-1.0, default: 0.0) */
    filter?: number;

    /** Minimum threshold to prevent noise detection (default: 0.1) */
    noiseFloorThreshold?: number;

    /** Milliseconds between FFT frames (default: 10) */
    hopSizeMs?: number;

    /** FFT window size in samples (default: 2048) */
    fftSize?: number;

    /** Number of beats for rolling BPM calculation (default: 8) */
    rollingBpmWindowSize?: number;

    /**
     * Ellis balance factor for tempo consistency vs onset strength (default: 680)
     * Higher values = stricter tempo adherence (good for songs with clear beats)
     * Lower values = more flexibility for songs with weak/irregular beats
     */
    dpAlpha?: number;

    /** Number of Mel frequency bands for OSE (default: 40) */
    melBands?: number;

    /** High-pass filter cutoff in Hz, removes DC offset from OSE (default: 0.4) */
    highPassCutoff?: number;

    /** Gaussian smoothing window in ms for OSE (default: 20) */
    gaussianSmoothMs?: number;

    /** Tempo center in seconds for perception bias (default: 0.5 = 120 BPM) */
    tempoCenter?: number;

    /** Tempo width in octaves for perception weighting (default: 1.4) */
    tempoWidth?: number;
}

/**
 * Options for BeatStream configuration
 */
export interface BeatStreamOptions {
    /** Time before beat to emit 'upcoming' event in seconds (default: 2.0) */
    anticipationTime?: number;

    /** Player-calibrated audio/visual offset in milliseconds (default: 0) */
    userOffsetMs?: number;

    /**
     * Auto-adjust using AudioContext.outputLatency (default: true)
     * Gracefully falls back to 0 if unsupported (e.g., Safari/older browsers)
     */
    compensateOutputLatency?: boolean;

    /** Timing tolerance for synchronization in seconds (default: 0.01 = 10ms) */
    timingTolerance?: number;

    /**
     * Difficulty preset for accuracy thresholds (default: 'medium')
     * Ignored if customThresholds is provided.
     */
    difficultyPreset?: DifficultyPreset;

    /**
     * Custom accuracy thresholds (in seconds)
     * If provided, overrides difficultyPreset.
     */
    customThresholds?: Partial<AccuracyThresholds>;
}

/**
 * Accuracy levels for button press detection
 */
export type BeatAccuracy = 'perfect' | 'great' | 'good' | 'ok' | 'miss';

/**
 * Accuracy thresholds for button press detection (in seconds)
 * Used to configure difficulty levels for rhythm games.
 */
export interface AccuracyThresholds {
    /** Perfect: within this threshold (seconds) */
    perfect: number;
    /** Great: within this threshold (seconds) */
    great: number;
    /** Good: within this threshold (seconds) */
    good: number;
    /** Ok: within this threshold (seconds) */
    ok: number;
}

/**
 * Preset difficulty levels for accuracy thresholds
 */
export type DifficultyPreset = 'easy' | 'medium' | 'hard' | 'custom';

/**
 * Easy difficulty thresholds (forgiving)
 */
export const EASY_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.075,  // ±75ms
    great: 0.125,    // ±125ms
    good: 0.175,     // ±175ms
    ok: 0.250,       // ±250ms
} as const;

/**
 * Medium difficulty thresholds (balanced)
 */
export const MEDIUM_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.045,  // ±45ms
    great: 0.090,    // ±90ms
    good: 0.135,     // ±135ms
    ok: 0.200,       // ±200ms
} as const;

/**
 * Hard difficulty thresholds (strict - original behavior)
 */
export const HARD_ACCURACY_THRESHOLDS: AccuracyThresholds = {
    perfect: 0.010,  // ±10ms
    great: 0.025,    // ±25ms
    good: 0.050,     // ±50ms
    ok: 0.100,       // ±100ms
} as const;

/**
 * Result of a button press accuracy check
 */
export interface ButtonPressResult {
    /** Accuracy level of the press */
    accuracy: BeatAccuracy;

    /** Time difference from nearest beat in seconds (negative = early, positive = late) */
    offset: number;

    /** The beat that was matched (nearest beat to the press) */
    matchedBeat: Beat;

    /** Absolute time difference in seconds */
    absoluteOffset: number;
}

/**
 * JSON-serializable version of BeatMap
 *
 * Identical to BeatMap but ensures all values are JSON-safe
 * for serialization/deserialization operations
 */
export interface BeatMapJSON {
    audioId: string;
    duration: number;
    beats: Array<{
        timestamp: number;
        beatInMeasure: number;
        isDownbeat: boolean;
        measureNumber: number;
        intensity: number;
        confidence: number;
    }>;
    bpm: number;
    metadata: BeatMapMetadata;
}

/**
 * Tempo estimation result from the TempoDetector
 */
export interface TempoEstimate {
    /** Main tempo estimate in BPM */
    primaryBpm: number;

    /** Adjacent metrical level in BPM (e.g., half-time or double-time) */
    secondaryBpm: number;

    /** Relative strength of the primary tempo (0.0 - 1.0) */
    primaryWeight: number;

    /** Relative strength of the secondary tempo (0.0 - 1.0) */
    secondaryWeight: number;

    /** True if duple meter (2/4, 4/4), false if triple meter (3/4, 6/8) */
    isDuple: boolean;

    /** Target inter-beat interval in seconds for DP tracker */
    targetIntervalSeconds: number;
}

// ============================================================================
// OSE Parameter Modes
// ============================================================================

/**
 * Tier 1: Hop size mode for controlling beat detection precision
 *
 * Hop size determines the time resolution of onset detection.
 * Smaller values = more precise but slower analysis.
 */
export type HopSizeMode = 'efficient' | 'standard' | 'hq' | 'custom';

/**
 * Preset hop size values in milliseconds
 *
 * - efficient: 10ms - Fast analysis, reduced precision (legacy default)
 * - standard: 4ms - Paper specification (Ellis 2007) - RECOMMENDED
 * - hq: 2ms - High quality, maximum precision
 */
export const HOP_SIZE_PRESETS = {
    efficient: 10,  // Fast analysis, reduced precision
    standard: 4,    // Paper specification (Ellis 2007) - DEFAULT
    hq: 2,          // High quality, maximum precision
} as const;

/**
 * Configuration for hop size mode selection
 */
export interface HopSizeConfig {
    /** The hop size mode to use */
    mode: HopSizeMode;
    /** Custom hop size in milliseconds (only used when mode === 'custom') */
    customValue?: number;
}

/**
 * Tier 2: Mel bands mode for controlling frequency resolution
 *
 * Mel bands determine the frequency resolution of the onset detection.
 * More bands = better frequency resolution but slightly slower analysis.
 */
export type MelBandsMode = 'standard' | 'detailed' | 'maximum';

/**
 * Preset mel bands values
 *
 * - standard: 40 bands - Paper default, librosa default - RECOMMENDED
 * - detailed: 64 bands - Better frequency resolution
 * - maximum: 80 bands - Maximum detail
 */
export const MEL_BANDS_PRESETS = {
    standard: 40,   // Paper default, librosa default
    detailed: 64,   // Better frequency resolution
    maximum: 80,    // Maximum detail
} as const;

/**
 * Configuration for mel bands mode selection
 */
export interface MelBandsConfig {
    /** The mel bands mode to use */
    mode: MelBandsMode;
}

/**
 * Tier 2: Gaussian smooth mode for controlling onset envelope smoothing
 *
 * Gaussian smoothing determines how much the onset envelope is smoothed.
 * More smoothing = cleaner peaks but may miss fast transients.
 */
export type GaussianSmoothMode = 'minimal' | 'standard' | 'smooth';

/**
 * Preset gaussian smoothing values in milliseconds
 *
 * - minimal: 10ms - Preserves fast transients
 * - standard: 20ms - Paper default - RECOMMENDED
 * - smooth: 40ms - Cleaner peaks, less noise
 */
export const GAUSSIAN_SMOOTH_PRESETS = {
    minimal: 10,    // Preserves fast transients
    standard: 20,   // Paper default
    smooth: 40,     // Cleaner peaks, less noise
} as const;

/**
 * Configuration for gaussian smooth mode selection
 */
export interface GaussianSmoothConfig {
    /** The gaussian smooth mode to use */
    mode: GaussianSmoothMode;
}

// ============================================================================
// OSE Configuration
// ============================================================================

/**
 * Configuration for Onset Strength Envelope calculation
 */
export interface OSEConfig {
    /** Target sample rate for resampling (default: 8000 Hz) */
    targetSampleRate?: number;

    /** FFT window size in milliseconds (default: 32) */
    fftWindowSize?: number;

    /** Hop size in milliseconds (default: 10) */
    hopSizeMs?: number;

    /** Number of Mel frequency bands (default: 40) */
    melBands?: number;

    /** High-pass filter cutoff in Hz (default: 0.4) */
    highPassCutoff?: number;

    /** Gaussian smoothing window in ms (default: 20) */
    gaussianSmoothMs?: number;
}

/**
 * Configuration for the BeatTracker (DP algorithm)
 */
export interface BeatTrackerConfig {
    /** Ellis balance factor (default: 680) */
    dpAlpha?: number;

    /** Sensitivity multiplier (0.1-10, default: 1.0) */
    sensitivity?: number;

    /** Minimum predecessor ratio (default: 0.5 = τp/2) */
    minPredecessorRatio?: number;

    /** Maximum predecessor ratio (default: 2.0 = 2τp) */
    maxPredecessorRatio?: number;
}

/**
 * Configuration for the TempoDetector
 */
export interface TempoDetectorConfig {
    /** Tempo center in seconds (default: 0.5 = 120 BPM) */
    tempoCenter?: number;

    /** Tempo width in octaves (default: 1.4, or 0.9 for stricter) */
    tempoWidth?: number;

    /** Minimum BPM (default: 60) */
    minBpm?: number;

    /** Maximum BPM (default: 180) */
    maxBpm?: number;
}

/**
 * Configuration for the DownbeatDetector
 */
export interface DownbeatDetectorConfig {
    /** Measure lengths to try (default: [2, 3, 4, 6]) */
    measureLengths?: number[];

    /** Minimum intensity difference to consider a downbeat (default: 0.1) */
    minIntensityDifference?: number;

    /** Weight for pattern analysis vs autocorrelation (0-1, default: 0.5) */
    patternWeight?: number;
}

/**
 * Result of downbeat detection
 */
export interface DownbeatDetectionResult {
    /** Detected beats with updated downbeat information */
    beats: Beat[];

    /** Detected number of beats per measure */
    beatsPerMeasure: number;

    /** Confidence in the downbeat detection (0-1) */
    confidence: number;

    /** Method that was used ('pattern' | 'autocorrelation' | 'combined') */
    method: 'pattern' | 'autocorrelation' | 'combined';

    /** Score for each measure length candidate */
    measureLengthScores: Map<number, number>;

    /** Phase offset of the first downbeat (in beats) */
    phaseOffset: number;
}

/**
 * Progress information during beat map generation
 */
export interface BeatMapGenerationProgress {
    /** Current phase of generation */
    phase: 'loading' | 'preprocessing' | 'ose_calculation' | 'tempo_estimation' | 'beat_tracking' | 'downbeat_detection' | 'finalizing' | 'complete' | 'error';

    /** Progress percentage (0-100) */
    progress: number;

    /** Human-readable status message */
    message: string;

    /** Error message if phase is 'error' */
    error?: string;
}

/**
 * Default values for BeatMapGeneratorOptions
 */
export const DEFAULT_BEATMAP_GENERATOR_OPTIONS: Required<BeatMapGeneratorOptions> = {
    minBpm: 60,
    maxBpm: 180,
    sensitivity: 1.0,
    filter: 0.0,
    noiseFloorThreshold: 0.1,
    hopSizeMs: 10,
    fftSize: 2048,
    rollingBpmWindowSize: 8,
    dpAlpha: 680,
    melBands: 40,
    highPassCutoff: 0.4,
    gaussianSmoothMs: 20,
    tempoCenter: 0.5,
    tempoWidth: 1.4,
};

/**
 * Default values for BeatStreamOptions
 */
export const DEFAULT_BEATSTREAM_OPTIONS: Required<BeatStreamOptions> = {
    anticipationTime: 2.0,
    userOffsetMs: 0,
    compensateOutputLatency: true,
    timingTolerance: 0.01,
    difficultyPreset: 'medium',
    customThresholds: {},
};

/**
 * Default accuracy thresholds (Hard difficulty)
 * @deprecated Use HARD_ACCURACY_THRESHOLDS or getAccuracyThresholdsForPreset() instead
 */
export const BEAT_ACCURACY_THRESHOLDS: AccuracyThresholds = HARD_ACCURACY_THRESHOLDS;

/**
 * Get accuracy thresholds for a difficulty preset
 * @param preset - The difficulty preset ('easy', 'medium', 'hard', or 'custom')
 * @returns The accuracy thresholds for the specified preset
 * @note 'custom' preset returns hard thresholds as a base for customization
 */
export function getAccuracyThresholdsForPreset(preset: DifficultyPreset): AccuracyThresholds {
    switch (preset) {
        case 'easy':
            return EASY_ACCURACY_THRESHOLDS;
        case 'medium':
            return MEDIUM_ACCURACY_THRESHOLDS;
        case 'hard':
        case 'custom':
        default:
            return HARD_ACCURACY_THRESHOLDS;
    }
}

/**
 * Result of validating accuracy thresholds
 */
export interface ThresholdValidationResult {
    /** Whether the thresholds are valid */
    valid: boolean;
    /** List of validation error messages (empty if valid) */
    errors: string[];
}

/**
 * Validate accuracy thresholds for correctness
 *
 * Checks that:
 * - All provided threshold values are positive numbers
 * - Thresholds are in ascending order (perfect < great < good < ok)
 *
 * @param thresholds - The thresholds to validate (can be partial)
 * @returns Validation result with detailed error messages
 *
 * @example
 * ```typescript
 * // Valid thresholds
 * const result = validateThresholds({ perfect: 0.05, great: 0.1, good: 0.15, ok: 0.2 });
 * console.log(result.valid); // true
 *
 * // Invalid thresholds (not ascending)
 * const invalid = validateThresholds({ perfect: 0.1, great: 0.05 });
 * console.log(invalid.valid); // false
 * console.log(invalid.errors); // ['great (0.05) must be greater than perfect (0.1)']
 * ```
 */
export function validateThresholds(thresholds: Partial<AccuracyThresholds>): ThresholdValidationResult {
    const errors: string[] = [];
    const thresholdKeys: (keyof AccuracyThresholds)[] = ['perfect', 'great', 'good', 'ok'];

    // Check for invalid (non-positive) values
    for (const key of thresholdKeys) {
        if (key in thresholds) {
            const value = thresholds[key];
            if (value === undefined || value === null) {
                errors.push(`${key} is undefined or null`);
            } else if (typeof value !== 'number' || isNaN(value)) {
                errors.push(`${key} must be a number, got ${typeof value}`);
            } else if (value < 0) {
                errors.push(`${key} must be positive, got ${value}`);
            }
        }
    }

    // If there are value errors, return early
    if (errors.length > 0) {
        return { valid: false, errors };
    }

    // Check ascending order for provided thresholds
    const providedThresholds = thresholdKeys.filter(key => key in thresholds && thresholds[key] !== undefined);

    for (let i = 0; i < providedThresholds.length - 1; i++) {
        const current = providedThresholds[i];
        const next = providedThresholds[i + 1];
        const currentValue = thresholds[current]!;
        const nextValue = thresholds[next]!;

        if (currentValue >= nextValue) {
            errors.push(`${next} (${nextValue}) must be greater than ${current} (${currentValue})`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Current version of the beat detection algorithm
 */
export const BEAT_DETECTION_VERSION = '1.0.0';

/**
 * Algorithm identifier for the Ellis DP beat tracker
 */
export const BEAT_DETECTION_ALGORITHM = 'ellis-dp-v1';
