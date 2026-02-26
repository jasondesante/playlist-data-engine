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

    /** Onset intensity threshold (0.0 - 1.0) */
    intensityThreshold: number;

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

    /** Intensity threshold for beat detection (0.0-1.0, default: 0.3) */
    intensityThreshold?: number;

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
}

/**
 * Accuracy levels for button press detection
 */
export type BeatAccuracy = 'perfect' | 'great' | 'good' | 'miss';

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
    intensityThreshold: 0.3,
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
};

/**
 * Accuracy thresholds for button press detection (in seconds)
 */
export const BEAT_ACCURACY_THRESHOLDS = {
    /** Perfect: within ±10ms */
    perfect: 0.010,
    /** Great: within ±25ms */
    great: 0.025,
    /** Good: within ±50ms */
    good: 0.050,
} as const;

/**
 * Current version of the beat detection algorithm
 */
export const BEAT_DETECTION_VERSION = '1.0.0';

/**
 * Algorithm identifier for the Ellis DP beat tracker
 */
export const BEAT_DETECTION_ALGORITHM = 'ellis-dp-v1';
