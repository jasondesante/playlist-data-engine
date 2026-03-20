/**
 * Multi-Band Analyzer for Transient Detection
 *
 * Splits audio into multiple frequency bands and analyzes each band separately
 * for transient detection. This enables detecting different types of rhythmic
 * elements (bass/kick, vocals/snare, hi-hats/cymbals) independently.
 *
 * Part of the Procedural Rhythm Generation pipeline.
 *
 * @example
 * ```typescript
 * // Basic usage - analyze an audio buffer
 * const analyzer = new MultiBandAnalyzer();
 * const result = analyzer.analyze(audioBuffer);
 *
 * // Access per-band analysis
 * for (const [bandName, analysis] of result.bands) {
 *   console.log(`${bandName}: ${analysis.peaks.length} transients detected`);
 *   console.log(`  Energy: ${analysis.energy.toFixed(3)}`);
 * }
 *
 * // Check which bands have the most activity
 * console.log('Dominant bands:', result.dominantBands);
 *
 * // Custom configuration with adjusted threshold
 * const customAnalyzer = new MultiBandAnalyzer({
 *   peakThreshold: 0.4,  // Higher threshold = fewer, stronger peaks
 *   fftWindowSizeMs: 46, // Larger window = better frequency resolution
 * });
 * ```
 */

import {
    resampleAudio,
    applyFrequencyBand,
    performSTFT,
    gaussianSmooth,
    FREQUENCY_BANDS,
    type FrequencyBand,
} from './beat/utils/audioUtils.js';

/**
 * Configuration for the Multi-Band Analyzer
 */
export interface MultiBandAnalyzerConfig {
    /** Target sample rate for analysis (default: 22050 - good balance of quality and speed) */
    targetSampleRate?: number;
    /** FFT window size in milliseconds (default: 23ms - good for transient detection) */
    fftWindowSizeMs?: number;
    /** Hop size in milliseconds (default: 10ms) */
    hopSizeMs?: number;
    /** Gaussian smoothing window in milliseconds (default: 10ms) */
    smoothWindowMs?: number;
    /** Peak detection threshold (0.0 - 1.0, default: 0.3) */
    peakThreshold?: number;
    /** Custom frequency bands (default: FREQUENCY_BANDS from audioUtils) */
    bands?: FrequencyBand[];
}

/**
 * Analysis result for a single frequency band
 */
export interface BandAnalysis {
    /** Band name identifier ('low', 'mid', 'high') */
    name: string;
    /** Frequency range of this band */
    frequencyRange: {
        lowHz: number;
        highHz: number;
    };
    /** Onset strength envelope for this band (one value per frame) */
    envelope: Float32Array;
    /** Frame indices where peaks (transients) were detected */
    peaks: number[];
    /** Times in seconds where peaks were detected */
    peakTimes: number[];
    /** Average energy in this band (0.0 - 1.0, normalized) */
    energy: number;
    /** Energy over time (one value per frame) */
    energyOverTime: Float32Array;
}

/**
 * Result of multi-band analysis
 */
export interface MultiBandResult {
    /** Analysis results per band, keyed by band name */
    bands: Map<string, BandAnalysis>;
    /** Bands with the most activity, sorted by energy (highest first) */
    dominantBands: string[];
    /** Combined energy profile across all bands (one value per frame) */
    energyProfile: Float32Array;
    /** Analysis metadata */
    metadata: {
        /** Number of frames in the analysis */
        numFrames: number;
        /** Duration of the audio in seconds */
        duration: number;
        /** Hop size used for analysis in seconds */
        hopSizeSeconds: number;
        /** Effective sample rate after resampling */
        effectiveSampleRate: number;
        /** Bands that were analyzed */
        bandsAnalyzed: string[];
    };
}

/**
 * Default configuration for Multi-Band Analyzer
 *
 * Note: targetSampleRate of 44100 Hz is used to ensure the high frequency band
 * (20000 Hz) is below the Nyquist frequency (22050 Hz). Using a lower sample rate
 * would cause the high band filter to fail.
 */
const DEFAULT_CONFIG: Required<MultiBandAnalyzerConfig> = {
    targetSampleRate: 44100,
    fftWindowSizeMs: 23,
    hopSizeMs: 10,
    smoothWindowMs: 10,
    peakThreshold: 0.3,
    bands: FREQUENCY_BANDS,
};

/**
 * Multi-Band Analyzer
 *
 * Analyzes audio across multiple frequency bands for transient detection.
 * Each band is processed independently to detect band-specific rhythmic elements.
 *
 * ## Usage
 *
 * ```typescript
 * const analyzer = new MultiBandAnalyzer({
 *   targetSampleRate: 22050,
 *   peakThreshold: 0.3,
 * });
 *
 * const result = analyzer.analyze(audioBuffer);
 *
 * // Access band-specific analysis
 * const lowBand = result.bands.get('low');
 * console.log(`Low band has ${lowBand?.peaks.length} transients`);
 *
 * // Get dominant bands
 * console.log(`Dominant bands: ${result.dominantBands.join(', ')}`);
 * ```
 *
 * ## Detection Strategies
 *
 * Different frequency bands contain different rhythmic elements:
 * - **Low (20-500 Hz)**: Bass, kick drums, sub frequencies - use energy-based detection
 * - **Mid (500-2000 Hz)**: Vocals, snare body, lead instruments - use spectral flux
 * - **High (2000-20000 Hz)**: Hi-hats, cymbals, harmonics - use HFC or spectral flux
 *
 * The analyzer uses spectral flux across all bands, which works well for general
 * transient detection. The TransientDetector (next step) will apply band-specific
 * detection strategies.
 */
export class MultiBandAnalyzer {
    private config: Required<MultiBandAnalyzerConfig>;

    /**
     * Create a new Multi-Band Analyzer
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: MultiBandAnalyzerConfig = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };

        // Validate configuration
        if (this.config.peakThreshold < 0 || this.config.peakThreshold > 1) {
            throw new Error(`peakThreshold must be between 0 and 1, got: ${this.config.peakThreshold}`);
        }

        if (this.config.bands.length === 0) {
            throw new Error('At least one frequency band must be specified');
        }
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<MultiBandAnalyzerConfig> {
        return { ...this.config };
    }

    /**
     * Analyze an audio buffer across all frequency bands
     *
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @returns Multi-band analysis result
     */
    analyze(audioBuffer: AudioBuffer): MultiBandResult {
        const duration = audioBuffer.duration;
        const sampleRate = this.config.targetSampleRate;

        // Step 1: Resample audio to target sample rate
        const resampled = resampleAudio(audioBuffer, sampleRate);

        // Step 2: Calculate analysis parameters
        const fftSize = Math.pow(2, Math.ceil(Math.log2(
            (this.config.fftWindowSizeMs / 1000) * sampleRate
        )));
        const hopSize = Math.round((this.config.hopSizeMs / 1000) * sampleRate);
        const hopSizeSeconds = this.config.hopSizeMs / 1000;
        const envelopeSampleRate = 1 / hopSizeSeconds;

        // Step 3: Process each frequency band
        const bands = new Map<string, BandAnalysis>();
        const energyProfiles: Float32Array[] = [];

        for (const band of this.config.bands) {
            const bandAnalysis = this.analyzeBand(
                resampled.data,
                band,
                sampleRate,
                fftSize,
                hopSize,
                hopSizeSeconds,
                envelopeSampleRate
            );
            bands.set(band.name, bandAnalysis);
            energyProfiles.push(bandAnalysis.energyOverTime);
        }

        // Step 4: Calculate combined energy profile
        const numFrames = energyProfiles[0]?.length ?? 0;
        const energyProfile = this.combineEnergyProfiles(energyProfiles, numFrames);

        // Step 5: Determine dominant bands
        const dominantBands = this.calculateDominantBands(bands);

        return {
            bands,
            dominantBands,
            energyProfile,
            metadata: {
                numFrames,
                duration,
                hopSizeSeconds,
                effectiveSampleRate: sampleRate,
                bandsAnalyzed: this.config.bands.map(b => b.name),
            },
        };
    }

    /**
     * Analyze a single frequency band
     */
    private analyzeBand(
        signal: Float32Array,
        band: FrequencyBand,
        sampleRate: number,
        fftSize: number,
        hopSize: number,
        hopSizeSeconds: number,
        envelopeSampleRate: number
    ): BandAnalysis {
        // Apply band-pass filter for this band
        const filtered = applyFrequencyBand(signal, band.name as 'low' | 'mid' | 'high', sampleRate);

        // Calculate energy over time using STFT
        const stftResult = performSTFT(filtered, fftSize, hopSize, sampleRate);
        const numFrames = stftResult.numFrames;

        // Calculate energy for each frame
        const energyOverTime = new Float32Array(numFrames);
        for (let frame = 0; frame < numFrames; frame++) {
            const spectrum = stftResult.frames[frame];
            let energy = 0;
            for (let i = 0; i < spectrum.length; i++) {
                energy += spectrum[i] * spectrum[i];
            }
            energyOverTime[frame] = Math.sqrt(energy / spectrum.length);
        }

        // Normalize energy over time to 0-1 range
        const maxEnergy = Math.max(...energyOverTime);
        if (maxEnergy > 0) {
            for (let i = 0; i < energyOverTime.length; i++) {
                energyOverTime[i] /= maxEnergy;
            }
        }

        // Calculate average energy (before normalization for meaningful metric)
        const avgEnergy = maxEnergy;

        // Generate onset strength envelope using spectral flux
        const envelope = this.calculateOnsetEnvelope(stftResult.frames);

        // Smooth the envelope
        const smoothedEnvelope = gaussianSmooth(envelope, this.config.smoothWindowMs, envelopeSampleRate);

        // Normalize envelope
        const maxEnvelope = Math.max(...smoothedEnvelope);
        const normalizedEnvelope = new Float32Array(smoothedEnvelope.length);
        if (maxEnvelope > 0) {
            for (let i = 0; i < smoothedEnvelope.length; i++) {
                normalizedEnvelope[i] = smoothedEnvelope[i] / maxEnvelope;
            }
        }

        // Find peaks in the envelope
        const peaks = this.findPeaks(normalizedEnvelope, this.config.peakThreshold);
        const peakTimes = peaks.map(frame => frame * hopSizeSeconds);

        return {
            name: band.name,
            frequencyRange: {
                lowHz: band.lowHz,
                highHz: band.highHz,
            },
            envelope: normalizedEnvelope,
            peaks,
            peakTimes,
            energy: avgEnergy,
            energyOverTime,
        };
    }

    /**
     * Calculate onset strength envelope using spectral flux
     *
     * Spectral flux measures the amount of change in the spectrum between
     * consecutive frames. High values indicate likely onset points.
     */
    private calculateOnsetEnvelope(frames: Float32Array[]): Float32Array {
        const numFrames = frames.length;
        const envelope = new Float32Array(numFrames);

        // First frame has no predecessor
        envelope[0] = 0;

        for (let frame = 1; frame < numFrames; frame++) {
            const currentFrame = frames[frame];
            const prevFrame = frames[frame - 1];

            // Calculate spectral flux (sum of positive differences)
            let flux = 0;
            for (let bin = 0; bin < currentFrame.length; bin++) {
                const diff = currentFrame[bin] - prevFrame[bin];
                if (diff > 0) {
                    flux += diff;
                }
            }
            envelope[frame] = flux;
        }

        return envelope;
    }

    /**
     * Find peaks in the onset strength envelope
     *
     * A peak is a local maximum that exceeds the threshold.
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

    /**
     * Combine energy profiles from multiple bands
     *
     * Takes the maximum energy at each frame across all bands.
     */
    private combineEnergyProfiles(profiles: Float32Array[], numFrames: number): Float32Array {
        const combined = new Float32Array(numFrames);

        for (let frame = 0; frame < numFrames; frame++) {
            let maxEnergy = 0;
            for (const profile of profiles) {
                if (frame < profile.length && profile[frame] > maxEnergy) {
                    maxEnergy = profile[frame];
                }
            }
            combined[frame] = maxEnergy;
        }

        return combined;
    }

    /**
     * Calculate dominant bands based on average energy
     *
     * Returns band names sorted by energy (highest first).
     */
    private calculateDominantBands(bands: Map<string, BandAnalysis>): string[] {
        const bandEnergies: { name: string; energy: number }[] = [];

        for (const [name, analysis] of bands) {
            bandEnergies.push({
                name,
                energy: analysis.energy,
            });
        }

        // Sort by energy (highest first)
        bandEnergies.sort((a, b) => b.energy - a.energy);

        return bandEnergies.map(b => b.name);
    }
}
