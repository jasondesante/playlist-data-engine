/**
 * Onset Strength Envelope (OSE) Calculator
 *
 * Implements the perceptual onset strength envelope extraction as described in
 * Ellis, D.P.W. (2007) "Beat Tracking by Dynamic Programming"
 *
 * The onset strength envelope is a time series that peaks at moments where
 * new sonic events (notes, drum hits, etc.) are likely to occur. This is
 * the foundation for the Ellis beat tracking algorithm.
 *
 * Reference: https://www.ee.columbia.edu/~dpwe/pubs/Ellis07-beattrack.pdf
 */

import type { OSEConfig } from '../../types/BeatMap.js';
import {
    resampleAudio,
    createMelFilterbank,
    highPassFilter,
    gaussianSmooth,
    calculateStdDev,
    performSTFT,
} from './utils/audioUtils.js';

/**
 * Default configuration for OSE calculation
 */
const DEFAULT_OSE_CONFIG: Required<OSEConfig> = {
    targetSampleRate: 8000,    // Paper resamples to 8kHz
    fftWindowSize: 32,          // 32ms windows (paper's specification)
    hopSizeMs: 10,              // 10ms between frames (paper uses 4ms, we use 10ms for efficiency)
    melBands: 40,               // 40 Mel bands for perceptual weighting
    highPassCutoff: 0.4,        // 0.4 Hz to remove DC offset
    gaussianSmoothMs: 20,       // 20ms Gaussian smoothing window
};

/**
 * Result of onset strength envelope calculation
 */
export interface OSEResult {
    /** Onset strength envelope values (one per frame) */
    envelope: Float32Array;
    /** Number of frames */
    numFrames: number;
    /** Hop size in seconds */
    hopSizeSeconds: number;
    /** Effective sample rate after resampling */
    effectiveSampleRate: number;
    /** Original audio duration in seconds */
    duration: number;
}

/**
 * Onset Strength Envelope Calculator
 *
 * Calculates the perceptual onset strength envelope from audio,
 * following the Ellis 2007 algorithm.
 *
 * @example
 * ```typescript
 * const ose = new OnsetStrengthEnvelope({
 *   targetSampleRate: 8000,
 *   melBands: 40,
 * });
 *
 * const result = ose.calculate(audioBuffer);
 * // result.envelope contains the onset strength values
 * // Peaks in the envelope correspond to likely beat positions
 * ```
 */
export class OnsetStrengthEnvelope {
    private config: Required<OSEConfig>;

    /**
     * Create a new Onset Strength Envelope calculator
     *
     * @param config - Configuration options (all optional, defaults provided)
     */
    constructor(config: OSEConfig = {}) {
        this.config = { ...DEFAULT_OSE_CONFIG, ...config };
    }

    /**
     * Calculate the onset strength envelope from an audio buffer
     *
     * Implements the Ellis algorithm:
     * 1. Resample to 8kHz (reduces computation, focuses on beat-relevant frequencies)
     * 2. Compute Mel spectrogram using STFT
     * 3. Convert to dB, take first-order difference, half-wave rectify
     * 4. Sum across Mel bands to get onset strength
     * 5. Apply high-pass filter (removes DC)
     * 6. Smooth with Gaussian window
     * 7. Normalize by standard deviation (critical for DP balance)
     *
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @returns Onset strength envelope result
     */
    calculate(audioBuffer: AudioBuffer): OSEResult {
        // Step 1: Resample audio to target sample rate
        const resampled = resampleAudio(audioBuffer, this.config.targetSampleRate);
        const sampleRate = resampled.targetSampleRate;
        const duration = audioBuffer.duration;

        // Calculate FFT parameters
        const fftSize = Math.round((this.config.fftWindowSize / 1000) * sampleRate);
        // Ensure FFT size is a power of 2
        const fftSizePowerOf2 = Math.pow(2, Math.ceil(Math.log2(fftSize)));
        const hopSize = Math.round((this.config.hopSizeMs / 1000) * sampleRate);
        const hopSizeSeconds = this.config.hopSizeMs / 1000;

        // Step 2: Compute Mel spectrogram using STFT
        const stftResult = performSTFT(resampled.data, fftSizePowerOf2, hopSize, sampleRate);

        // Create Mel filterbank
        const melFilterbank = createMelFilterbank(
            this.config.melBands,
            fftSizePowerOf2,
            sampleRate
        );

        // Step 3: Apply Mel filterbank and compute onset strength
        // For each frame, we'll compute the Mel spectrogram and then the onset strength
        const numFrames = stftResult.numFrames;
        const melSpectrogram: Float32Array[] = [];

        // Apply Mel filters to each frame
        for (let frame = 0; frame < numFrames; frame++) {
            const spectrum = stftResult.frames[frame];
            const melEnergies = new Float32Array(this.config.melBands);

            for (let band = 0; band < this.config.melBands; band++) {
                const filter = melFilterbank[band];
                let energy = 0;

                for (let bin = 0; bin < filter.length && bin < spectrum.length; bin++) {
                    energy += spectrum[bin] * filter[bin];
                }

                // Convert to dB (with small epsilon to avoid log(0))
                melEnergies[band] = 20 * Math.log10(energy + 1e-10);
            }

            melSpectrogram.push(melEnergies);
        }

        // Step 4: Compute onset strength from Mel spectrogram
        // For each band: first-order difference, half-wave rectify
        // Then sum positive differences across all bands
        const onsetStrength = new Float32Array(numFrames);
        onsetStrength[0] = 0; // First frame has no predecessor

        for (let frame = 1; frame < numFrames; frame++) {
            let frameOnsetStrength = 0;

            for (let band = 0; band < this.config.melBands; band++) {
                // First-order difference
                const diff = melSpectrogram[frame][band] - melSpectrogram[frame - 1][band];

                // Half-wave rectify (only positive differences indicate onset)
                if (diff > 0) {
                    frameOnsetStrength += diff;
                }
            }

            onsetStrength[frame] = frameOnsetStrength;
        }

        // Step 5: Apply high-pass filter to remove DC offset
        // Note: The envelope is in "frames" not samples, so we need to adjust
        // the cutoff to work in frame units
        // Effective sample rate of the envelope = 1 / hopSizeSeconds
        const envelopeSampleRate = 1 / hopSizeSeconds;
        const filteredEnvelope = highPassFilter(
            onsetStrength,
            this.config.highPassCutoff,
            envelopeSampleRate
        );

        // Step 6: Apply Gaussian smoothing
        const smoothedEnvelope = gaussianSmooth(
            filteredEnvelope,
            this.config.gaussianSmoothMs,
            envelopeSampleRate
        );

        // Step 7: Normalize by standard deviation
        // This is CRITICAL according to Ellis - the balance between onset score
        // and transition cost in DP depends on the envelope scale
        const stdDev = calculateStdDev(smoothedEnvelope);
        const normalizedEnvelope = new Float32Array(smoothedEnvelope.length);

        if (stdDev > 1e-10) {
            for (let i = 0; i < smoothedEnvelope.length; i++) {
                normalizedEnvelope[i] = smoothedEnvelope[i] / stdDev;
            }
        } else {
            // If stdDev is near zero, the signal is essentially flat
            // Copy as-is to avoid division by zero
            for (let i = 0; i < smoothedEnvelope.length; i++) {
                normalizedEnvelope[i] = smoothedEnvelope[i];
            }
        }

        return {
            envelope: normalizedEnvelope,
            numFrames,
            hopSizeSeconds,
            effectiveSampleRate: sampleRate,
            duration,
        };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<OSEConfig> {
        return { ...this.config };
    }

    /**
     * Find peaks in the onset strength envelope
     * Useful for debugging and visualization
     *
     * @param envelope - Onset strength envelope
     * @param threshold - Minimum peak height (default: 0.5)
     * @returns Array of frame indices where peaks occur
     */
    findPeaks(envelope: Float32Array, threshold: number = 0.5): number[] {
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
     * Convert frame index to time in seconds
     *
     * @param frameIndex - Frame index
     * @param hopSizeSeconds - Hop size in seconds
     * @returns Time in seconds
     */
    frameToTime(frameIndex: number, hopSizeSeconds: number): number {
        return frameIndex * hopSizeSeconds;
    }

    /**
     * Convert time in seconds to frame index
     *
     * @param time - Time in seconds
     * @param hopSizeSeconds - Hop size in seconds
     * @returns Frame index (rounded)
     */
    timeToFrame(time: number, hopSizeSeconds: number): number {
        return Math.round(time / hopSizeSeconds);
    }
}
