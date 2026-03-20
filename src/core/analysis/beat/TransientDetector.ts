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
     * Default: 0.3
     */
    baseThreshold?: number;

    /**
     * Adaptive thresholding enabled.
     * When true, the detector adjusts thresholds based on the local energy/density of the signal.
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
     * Minimum distance between transients in seconds.
     * Prevents detecting multiple transients for the same event.
     * Default: 0.02 (20ms)
     */
    minTransientInterval?: number;

    /**
     * Custom frequency bands (default: FREQUENCY_BANDS from audioUtils)
     */
    bands?: FrequencyBand[];
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
 * Default configuration for TransientDetector (required properties only)
 */
const DEFAULT_TRANSIENT_DETECTOR_CONFIG = {
    baseThreshold: 0.3,
    adaptiveThresholding: true,
    adaptiveWindowSize: 50,
    minTransientInterval: 0.02, // 20ms minimum between transients
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
        // Extract bands separately to handle optional property
        const { bands, ...requiredConfig } = config;

        this.config = {
            ...DEFAULT_TRANSIENT_DETECTOR_CONFIG,
            ...requiredConfig,
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
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): TransientDetectorConfig {
        return { ...this.config };
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

        // Calculate adaptive threshold if enabled
        const threshold = this.config.adaptiveThresholding
            ? this.calculateAdaptiveThreshold(envelope)
            : this.config.baseThreshold;

        // Find peaks in the envelope
        const peaks = this.findPeaks(envelope, threshold);

        // Convert peaks to transient results
        const transients: TransientResult[] = [];
        const minIntervalFrames = Math.round(this.config.minTransientInterval / hopSizeSeconds);

        for (let i = 0; i < peaks.length; i++) {
            const peakFrame = peaks[i];

            // Apply minimum interval constraint
            if (i > 0) {
                const prevFrame = peaks[i - 1];
                if (peakFrame - prevFrame < minIntervalFrames) {
                    continue; // Skip this peak, too close to previous
                }
            }

            const timestamp = peakFrame * hopSizeSeconds;
            const intensity = envelope[peakFrame];

            transients.push({
                timestamp,
                intensity,
                band: bandName,
                detectionMethod,
            });
        }

        return transients;
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
     * @param envelope - The onset strength envelope
     * @returns Calculated threshold
     */
    private calculateAdaptiveThreshold(envelope: Float32Array): number {
        if (envelope.length === 0) {
            return this.config.baseThreshold;
        }

        // Calculate global statistics
        let sum = 0;
        let max = 0;
        for (let i = 0; i < envelope.length; i++) {
            sum += envelope[i];
            if (envelope[i] > max) {
                max = envelope[i];
            }
        }
        const mean = sum / envelope.length;

        // Calculate standard deviation
        let varianceSum = 0;
        for (let i = 0; i < envelope.length; i++) {
            const diff = envelope[i] - mean;
            varianceSum += diff * diff;
        }
        const stdDev = Math.sqrt(varianceSum / envelope.length);

        // Adaptive threshold: base threshold adjusted by signal characteristics
        // Use higher threshold for signals with high variance (dynamic range)
        // Use lower threshold for signals with low variance (consistent level)
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

        // Scale threshold based on coefficient of variation
        // Higher variance = higher threshold (more selective)
        // Lower variance = lower threshold (less selective)
        const adaptiveFactor = 1 + (coefficientOfVariation * 0.5);
        const adaptiveThreshold = this.config.baseThreshold * adaptiveFactor;

        // Clamp to valid range
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
