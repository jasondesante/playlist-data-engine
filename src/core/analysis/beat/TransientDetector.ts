/**
 * Transient Detector for Multi-Band Rhythm Detection
 *
 * Detects transients (onsets) in audio using band-specific detection strategies.
 * Each frequency band uses a different algorithm optimized for its typical content:
 *
 * Part of the Procedural Rhythm Generation pipeline.
 *
 * @example
 * ```typescript
 * // Basic usage - detect transients from multi-band analysis
 * const detector = new TransientDetector();
 * const transients = detector.detect(multiBandResult);
 *
 * // Access all transients across all bands
 * console.log(`Total transients: ${transients.transients.length}`);
 *
 * // Access transients by band
 * for (const [band, bandTransients] of transients.bandTransients) {
 *   console.log(`${band}: ${bandTransients.length} transients`);
 * }
 *
 * // Custom configuration with higher threshold
 * const customDetector = new TransientDetector({
 *   baseThreshold: 0.5,         // Higher = fewer transients detected
 *   adaptiveThresholding: true, // Adjust based on local energy
 *   minTransientInterval: 0.03, // Minimum 30ms between transients
 * });
 * ```
 */

import type { MultiBandResult, BandAnalysis } from '../MultiBandAnalyzer.js';
import type { FrequencyBand } from './utils/audioUtils.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Detection method used for a transient
 */
export type TransientDetectionMethod = 'energy' | 'spectral_flux' | 'hfc';

/**
 * Band identifier type
 */
type BandName = 'low' | 'mid' | 'high';

/**
 * Per-band transient detection configuration.
 * Each frequency band can have different settings optimized for its typical content.
 */
export interface BandTransientConfig {
    /**
     * Threshold for peak detection (0.0 - 1.0).
     * Higher values are more selective (fewer transients detected).
     */
    threshold: number;

    /**
     * Minimum interval between transients in seconds (buffer window).
     * Within this window, only the strongest transient wins (Non-Maximum Suppression).
     */
    minInterval: number;

    /**
     * Whether to use adaptive thresholding for this band.
     * Adjusts threshold based on local energy/density of the signal.
     */
    adaptiveThresholding: boolean;
}

/**
 * Per-band transient detection configuration overrides.
 * Each band can optionally override the global defaults.
 */
export interface BandTransientConfigOverrides {
    /** Low frequency band (20-500 Hz) - kick drums, bass */
    low?: Partial<BandTransientConfig>;
    /** Mid frequency band (500-2000 Hz) - vocals, snare body */
    mid?: Partial<BandTransientConfig>;
    /** High frequency band (2000-20000 Hz) - hi-hats, cymbals */
    high?: Partial<BandTransientConfig>;
}

/**
 * Result of a single detected transient
 */
export interface TransientResult {
    /** Timestamp in seconds from the start of the audio */
    timestamp: number;

    /** Strength of the detected transient (0.0 - 1.0, normalized) */
    intensity: number;

    /** Which frequency band detected this: 'low', 'mid', or 'high' */
    band: 'low' | 'mid' | 'high';

    /** Detection method used to find this transient */
    detectionMethod: TransientDetectionMethod;

    /** Information about the nearest beat in the beat map (set during quantization) */
    nearestBeat?: {
        /** Index into UnifiedBeatMap.beats[] */
        index: number;
        /** How far from quarter note grid (in seconds) */
        distance: number;
    };
}

/**
 * Configuration for the TransientDetector
 */
export interface TransientDetectorConfig {
    /**
     * Base threshold for peak detection (0.0 - 1.0).
     * Lower values detect more transients, higher values are more selective.
     * This is used as a fallback if per-band threshold is not specified.
     * Default: 0.3
     */
    baseThreshold?: number;

    /**
     * Adaptive thresholding enabled.
     * When true, the detector adjusts thresholds based on the local energy/density of the signal.
     * This is used as a fallback if per-band setting is not specified.
     * Default: true
     */
    adaptiveThresholding?: boolean;

    /**
     * Window size for adaptive thresholding (in frames).
     * The local energy is calculated over this window to adjust thresholds.
     * Default: 50 frames (~500ms at 10ms hop size)
     */
    adaptiveWindowSize?: number;

    /**
     * Minimum distance between transients in seconds (buffer window).
     * Within this window, only the strongest transient wins (Non-Maximum Suppression).
     * This is used as a fallback if per-band interval is not specified.
     * Default: 0.02 (20ms)
     * @deprecated Use per-band config in `bandConfig` instead
     */
    minTransientInterval?: number;

    /**
     * Custom frequency bands (default: FREQUENCY_BANDS from audioUtils)
     */
    bands?: FrequencyBand[];

    /**
     * Per-band configuration overrides.
     * Each band can have different thresholds and intervals optimized for its content.
     * Settings here override the global defaults for specific bands.
     */
    bandConfig?: BandTransientConfigOverrides;
}

/**
 * Result of transient analysis
 */
export interface TransientAnalysis {
    /** All detected transients across all bands */
    transients: TransientResult[];

    /** Transients grouped by frequency band */
    bandTransients: Map<'low' | 'mid' | 'high', TransientResult[]>;

    /** Analysis metadata */
    metadata: {
        /** Total number of transients detected */
        totalTransients: number;

        /** Number of transients per band */
        transientsPerBand: Map<'low' | 'mid' | 'high', number>;

        /** Duration of the audio in seconds */
        duration: number;

        /** Average transient intensity */
        averageIntensity: number;

        /** Detection methods used */
        detectionMethodsUsed: TransientDetectionMethod[];
    };
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default per-band transient detection configurations.
 *
 * These are tuned for typical musical content in each frequency range:
 *
 * - **Low band (20-500 Hz)**: Kick drums, bass - fewer, stronger transients
 *   - Higher threshold (0.4) - bass transients are typically strong
 *   - Longer interval (50ms) - bass events are usually more sparse
 *
 * - **Mid band (500-2000 Hz)**: Vocals, snare body, lead instruments
 *   - Medium threshold (0.3) - balanced detection
 *   - Medium interval (30ms) - moderate density
 *
 * - **High band (2000-20000 Hz)**: Hi-hats, cymbals, harmonics
 *   - Lower threshold (0.25) - hi-hats can be subtle
 *   - Shorter interval (20ms) - rapid fire percussion is common
 */
const DEFAULT_BAND_CONFIGS: Record<BandName, BandTransientConfig> = {
    low: {
        threshold: 0.4,         // Higher - bass transients are stronger
        minInterval: 0.05,      // 50ms buffer - ~1/10 of 16th note at 120 BPM
        adaptiveThresholding: true,
    },
    mid: {
        threshold: 0.3,         // Medium - balanced
        minInterval: 0.03,      // 30ms buffer
        adaptiveThresholding: true,
    },
    high: {
        threshold: 0.25,        // Lower - hi-hats can be subtle
        minInterval: 0.02,      // 20ms buffer - allow rapid fire
        adaptiveThresholding: true,
    },
};

/**
 * Default configuration for TransientDetector (required properties only)
 */
const DEFAULT_TRANSIENT_DETECTOR_CONFIG = {
    baseThreshold: 0.3,
    adaptiveThresholding: true,
    adaptiveWindowSize: 50,
    minTransientInterval: 0.02, // 20ms minimum between transients (fallback)
} as const;

/**
 * Internal config type with required properties filled in by defaults
 */
type TransientDetectorInternalConfig = {
    baseThreshold: number;
    adaptiveThresholding: boolean;
    adaptiveWindowSize: number;
    minTransientInterval: number;
    bands?: FrequencyBand[];
    bandConfig: Record<BandName, BandTransientConfig>;
};

// ============================================================================
// TransientDetector Class
// ============================================================================

/**
 * Multi-Band Transient Detector
 *
 * Detects transients (onsets) using band-specific detection strategies.
 * Each frequency band is analyzed with an algorithm optimized for its typical content:
 *
 * - **Low Band (20-500 Hz)**: Energy-based detection
 *   - Optimized for kick drums, bass, sub frequencies
 *   - Uses the energy envelope directly to detect sharp amplitude changes
 *
 * - **Mid Band (500-2000 Hz)**: Spectral Flux
 *   - Optimized for vocals, snare body, lead instruments
 *   - Measures spectral change between frames for onset detection
 *
 * - **High Band (2000-20000 Hz)**: High-Frequency Content (HFC)
 *   - Optimized for hi-hats, cymbals, harmonics, air
 *   - Weights high-frequency bins more heavily for cymbal/percussive detection
 *
 * ## Usage
 *
 * ```typescript
 * const multiBandAnalyzer = new MultiBandAnalyzer();
 * const multiBandResult = multiBandAnalyzer.analyze(audioBuffer);
 *
 * const detector = new TransientDetector();
 * const transients = detector.detect(multiBandResult);
 *
 * // Access per-band transients
 * const lowBandTransients = transients.bandTransients.get('low');
 * const midBandTransients = transients.bandTransients.get('mid');
 * const highBandTransients = transients.bandTransients.get('high');
 * ```
 *
 * ## Adaptive Thresholding
 *
 * When adaptive thresholding is enabled, the detector adjusts thresholds based on local energy.
 * This helps handle songs with varying dynamics (quiet vs loud sections).
 */
export class TransientDetector {
    private config: TransientDetectorInternalConfig;

    /**
     * Create a new TransientDetector
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: TransientDetectorConfig = {}) {
        // Extract bands and bandConfig separately to handle optional properties
        const { bands, bandConfig, ...requiredConfig } = config;

        // Build per-band config by merging defaults with user overrides
        const mergedBandConfig: Record<BandName, BandTransientConfig> = {
            low: { ...DEFAULT_BAND_CONFIGS.low, ...bandConfig?.low },
            mid: { ...DEFAULT_BAND_CONFIGS.mid, ...bandConfig?.mid },
            high: { ...DEFAULT_BAND_CONFIGS.high, ...bandConfig?.high },
        };

        this.config = {
            ...DEFAULT_TRANSIENT_DETECTOR_CONFIG,
            ...requiredConfig,
            bandConfig: mergedBandConfig,
        };

        // Store bands if provided
        if (bands !== undefined) {
            this.config.bands = bands;
        }

        // Validate configuration
        if (this.config.baseThreshold < 0 || this.config.baseThreshold > 1) {
            throw new Error(`baseThreshold must be between 0 and 1, got: ${this.config.baseThreshold}`);
        }
        if (this.config.adaptiveWindowSize < 1) {
            throw new Error(`adaptiveWindowSize must be at least 1, got: ${this.config.adaptiveWindowSize}`);
        }
        if (this.config.minTransientInterval < 0) {
            throw new Error(`minTransientInterval must be non-negative, got: ${this.config.minTransientInterval}`);
        }

        // Validate per-band config
        for (const band of ['low', 'mid', 'high'] as BandName[]) {
            const bc = this.config.bandConfig[band];
            if (bc.threshold < 0 || bc.threshold > 1) {
                throw new Error(`${band} band threshold must be between 0 and 1, got: ${bc.threshold}`);
            }
            if (bc.minInterval < 0) {
                throw new Error(`${band} band minInterval must be non-negative, got: ${bc.minInterval}`);
            }
        }
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): TransientDetectorConfig {
        const { bandConfig, ...rest } = this.config;
        return {
            ...rest,
            bandConfig: {
                low: { ...bandConfig.low },
                mid: { ...bandConfig.mid },
                high: { ...bandConfig.high },
            },
        };
    }

    /**
     * Get the per-band configuration
     *
     * @returns The per-band configuration
     */
    getBandConfig(): Record<BandName, BandTransientConfig> {
        return {
            low: { ...this.config.bandConfig.low },
            mid: { ...this.config.bandConfig.mid },
            high: { ...this.config.bandConfig.high },
        };
    }

    /**
     * Detect transients in multi-band audio analysis
     *
     * @param multiBandResult - Result from MultiBandAnalyzer
     * @returns Transient analysis with per-band results
     */
    detect(multiBandResult: MultiBandResult): TransientAnalysis {
        const bandTransients = new Map<'low' | 'mid' | 'high', TransientResult[]>();
        const allTransients: TransientResult[] = [];
        const detectionMethodsUsed = new Set<TransientDetectionMethod>();

        // Process each band with its optimized detection strategy
        for (const [bandName, bandAnalysis] of multiBandResult.bands) {
            const transients = this.detectBandTransients(
                bandName as 'low' | 'mid' | 'high',
                bandAnalysis,
                multiBandResult.metadata.hopSizeSeconds
            );

            bandTransients.set(bandName as 'low' | 'mid' | 'high', transients);
            allTransients.push(...transients);

            // Track detection methods used
            transients.forEach(t => detectionMethodsUsed.add(t.detectionMethod));
        }

        // Sort all transients by timestamp
        allTransients.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate metadata
        const transientsPerBand = new Map<'low' | 'mid' | 'high', number>();
        for (const [band, transients] of bandTransients) {
            transientsPerBand.set(band, transients.length);
        }

        const averageIntensity = allTransients.length > 0
            ? allTransients.reduce((sum, t) => sum + t.intensity, 0) / allTransients.length
            : 0;

        return {
            transients: allTransients,
            bandTransients,
            metadata: {
                totalTransients: allTransients.length,
                transientsPerBand,
                duration: multiBandResult.metadata.duration,
                averageIntensity,
                detectionMethodsUsed: Array.from(detectionMethodsUsed),
            },
        };
    }

    /**
     * Detect transients in a specific frequency band
     *
     * Uses band-specific detection strategies:
     * - Low band: Energy-based detection
     * - Mid band: Spectral Flux
     * - High band: High-Frequency Content (HFC)
     *
     * Applies Non-Maximum Suppression (NMS) to ensure only the strongest
     * transient within a buffer window is kept.
     *
     * @param bandName - Name of the frequency band
     * @param bandAnalysis - Analysis result for this band
     * @param hopSizeSeconds - Time between frames in seconds
     * @returns Array of detected transients
     */
    private detectBandTransients(
        bandName: 'low' | 'mid' | 'high',
        bandAnalysis: BandAnalysis,
        hopSizeSeconds: number
    ): TransientResult[] {
        // Get per-band configuration
        const bandConfig = this.config.bandConfig[bandName];

        // Select detection method based on band
        const detectionMethod = this.getDetectionMethod(bandName);

        // Get the envelope to use for peak detection
        // For energy-based detection, use energyOverTime
        // For spectral_flux and hfc, use the onset envelope
        const envelope = detectionMethod === 'energy'
            ? bandAnalysis.energyOverTime
            : bandAnalysis.envelope;


        // Handle case where envelope might not exist or be empty
        if (!envelope || envelope.length === 0) {
            return [];
        }

        // Calculate adaptive threshold if enabled for this band
        const threshold = bandConfig.adaptiveThresholding
            ? this.calculateAdaptiveThreshold(envelope, bandConfig.threshold)
            : bandConfig.threshold;

        // Find peaks in the envelope
        const peaks = this.findPeaks(envelope, threshold);

        // Convert peaks to candidate transients (all peaks above threshold)
        const candidates: TransientResult[] = peaks.map(peakFrame => ({
            timestamp: peakFrame * hopSizeSeconds,
            intensity: envelope[peakFrame],
            band: bandName,
            detectionMethod,
        }));

        // Apply Non-Maximum Suppression (NMS) - keep only strongest in each buffer window
        const transients = this.applyNonMaximumSuppression(
            candidates,
            bandConfig.minInterval
        );

        return transients;
    }

    /**
     * Apply Non-Maximum Suppression (NMS) to transients
     *
     * Within a buffer window, only the strongest transient wins.
     * This prevents multiple detections for the same acoustic event.
     *
     * ## Algorithm
     *
     * 1. Sort candidates by intensity (strongest first)
     * 2. For each candidate (starting with strongest):
     *    - If not suppressed by an already-accepted transient, accept it
     *    - Suppress all weaker candidates within the buffer window
     * 3. Return accepted transients sorted by timestamp
     *
     * @param candidates - All candidate transients (peaks above threshold)
     * @param bufferWindow - Minimum interval in seconds between transients
     * @returns Filtered transients with only the strongest in each window
     */
    private applyNonMaximumSuppression(
        candidates: TransientResult[],
        bufferWindow: number
    ): TransientResult[] {
        if (candidates.length === 0) {
            return [];
        }

        // Sort by intensity (strongest first) for greedy NMS
        const sortedByIntensity = [...candidates].sort((a, b) => b.intensity - a.intensity);

        const accepted: TransientResult[] = [];

        for (const candidate of sortedByIntensity) {
            // Check if this candidate is suppressed by any already-accepted transient
            let isSuppressed = false;

            for (const acceptedTransient of accepted) {
                const timeDiff = Math.abs(candidate.timestamp - acceptedTransient.timestamp);
                if (timeDiff < bufferWindow) {
                    // This candidate is within the buffer window of an already-accepted transient
                    // The accepted one is stronger (since we process in intensity order)
                    isSuppressed = true;
                    break;
                }
            }

            if (!isSuppressed) {
                accepted.push(candidate);
            }
        }

        // Sort by timestamp for output
        accepted.sort((a, b) => a.timestamp - b.timestamp);

        return accepted;
    }

    /**
     * Get the detection method for a specific band
     *
     * @param bandName - Name of the frequency band
     * @returns Detection method to use for this band
     */
    private getDetectionMethod(bandName: 'low' | 'mid' | 'high'): TransientDetectionMethod {
        switch (bandName) {
            case 'low':
                return 'energy';
            case 'mid':
                return 'spectral_flux';
            case 'high':
                return 'hfc';
            default:
                return 'spectral_flux';
        }
    }

    /**
     * Calculate adaptive threshold based on local energy
     *
     * Uses a sliding window to calculate local energy and adjust threshold accordingly.
     * This helps handle songs with varying dynamics.
     *
     * ## Algorithm: Adaptive Thresholding via Coefficient of Variation
     *
     * The threshold is adjusted based on the signal's dynamic range:
     *
     * 1. **Calculate Mean Energy**: Average onset strength across all frames
     * 2. **Calculate Standard Deviation**: Measure of energy variation
     * 3. **Compute Coefficient of Variation (CV)**: stdDev / mean
     *    - CV ≈ 0: Signal is consistent (e.g., electronic dance music)
     *    - CV > 1: Signal has high dynamic range (e.g., classical with quiet/loud sections)
     * 4. **Adjust Threshold**: baseThreshold * (1 + CV * 0.5)
     *    - High CV → Higher threshold (more selective, fewer false positives in dynamic sections)
     *    - Low CV → Lower threshold (catch more transients in consistent sections)
     *
     * @param envelope - The onset strength envelope
     * @param baseThreshold - The base threshold for this band (default: global baseThreshold)
     * @returns Calculated threshold
     */
    private calculateAdaptiveThreshold(envelope: Float32Array, baseThreshold?: number): number {
        const threshold = baseThreshold ?? this.config.baseThreshold;

        if (envelope.length === 0) {
            return threshold;
        }

        // Step 1: Calculate mean energy (first pass through envelope)
        // This represents the average onset strength across the entire signal
        let sum = 0;
        let max = 0;
        for (let i = 0; i < envelope.length; i++) {
            sum += envelope[i];
            if (envelope[i] > max) {
                max = envelope[i];
            }
        }
        const mean = sum / envelope.length;

        // Step 2: Calculate standard deviation (second pass)
        // Standard deviation measures how spread out the energy values are
        // High stdDev = signal has both quiet and loud sections
        let varianceSum = 0;
        for (let i = 0; i < envelope.length; i++) {
            const diff = envelope[i] - mean;
            varianceSum += diff * diff;
        }
        const stdDev = Math.sqrt(varianceSum / envelope.length);

        // Step 3: Compute coefficient of variation (CV)
        // CV = stdDev / mean, a normalized measure of dispersion
        // This allows comparison across signals with different average levels
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

        // Step 4: Apply adaptive scaling factor
        // The 0.5 multiplier is a tuning parameter that controls sensitivity
        // - CV of 0.5 → threshold multiplied by 1.25 (slightly more selective)
        // - CV of 1.0 → threshold multiplied by 1.5 (moderately more selective)
        // - CV of 2.0 → threshold multiplied by 2.0 (much more selective)
        const adaptiveFactor = 1 + (coefficientOfVariation * 0.5);
        const adaptiveThreshold = threshold * adaptiveFactor;

        // Clamp to valid range to prevent extreme values
        return Math.max(0.1, Math.min(0.9, adaptiveThreshold));
    }

    /**
     * Find peaks in the onset strength envelope
     *
     * A peak is a local maximum that exceeds the threshold.
     *
     * @param envelope - The onset strength envelope
     * @param threshold - Minimum peak height
     * @returns Array of frame indices where peaks occur
     */
    private findPeaks(envelope: Float32Array, threshold: number): number[] {
        const peaks: number[] = [];

        for (let i = 1; i < envelope.length - 1; i++) {
            // Check if this is a local maximum
            if (envelope[i] > envelope[i - 1] &&
                envelope[i] > envelope[i + 1] &&
                envelope[i] >= threshold) {
                peaks.push(i);
            }
        }

        return peaks;
    }
}
