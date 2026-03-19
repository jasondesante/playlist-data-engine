/**
 * Audio utility functions for beat detection
 *
 * These utilities support the Ellis Dynamic Programming beat tracking algorithm
 * by providing audio preprocessing, Mel filterbank generation, and signal processing.
 */

/**
 * Convert frequency in Hz to Mel scale
 * Formula: m = 2595 * log10(1 + f/700)
 *
 * @param hz - Frequency in Hz
 * @returns Mel scale value
 */
export function hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
}

/**
 * Convert Mel scale value to frequency in Hz
 * Formula: f = 700 * (10^(m/2595) - 1)
 *
 * @param mel - Mel scale value
 * @returns Frequency in Hz
 */
export function melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
}

/**
 * Result of audio resampling
 */
export interface ResampledAudio {
    /** Resampled audio data as mono Float32Array */
    data: Float32Array;
    /** Original sample rate */
    originalSampleRate: number;
    /** Target sample rate */
    targetSampleRate: number;
}

/**
 * Resample audio buffer to a target sample rate
 * Uses linear interpolation for simplicity
 *
 * @param audioBuffer - Source audio buffer
 * @param targetRate - Target sample rate in Hz
 * @returns Resampled audio data with metadata
 */
export function resampleAudio(audioBuffer: AudioBuffer, targetRate: number): ResampledAudio {
    const originalRate = audioBuffer.sampleRate;
    const ratio = originalRate / targetRate;
    const originalLength = audioBuffer.length;
    const targetLength = Math.ceil(originalLength / ratio);

    // Mix down to mono first
    const monoData = new Float32Array(originalLength);
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < originalLength; i++) {
            monoData[i] += channelData[i] / audioBuffer.numberOfChannels;
        }
    }

    // Resample using linear interpolation
    const resampled = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
        const originalIndex = i * ratio;
        const lowerIndex = Math.floor(originalIndex);
        const upperIndex = Math.min(lowerIndex + 1, originalLength - 1);
        const fraction = originalIndex - lowerIndex;

        // Linear interpolation
        resampled[i] = monoData[lowerIndex] * (1 - fraction) + monoData[upperIndex] * fraction;
    }

    return {
        data: resampled,
        originalSampleRate: originalRate,
        targetSampleRate: targetRate,
    };
}

/**
 * Create a Mel filterbank for spectral analysis
 *
 * Creates triangular filters spaced evenly on the Mel scale,
 * suitable for perceptual audio analysis as per Ellis 2007.
 *
 * @param numBands - Number of Mel bands to create
 * @param fftSize - FFT size used for analysis
 * @param sampleRate - Audio sample rate in Hz
 * @param minFreq - Minimum frequency in Hz (default: 0)
 * @param maxFreq - Maximum frequency in Hz (default: sampleRate/2)
 * @returns Array of Float32Array filters, each representing one Mel band
 */
export function createMelFilterbank(
    numBands: number,
    fftSize: number,
    sampleRate: number,
    minFreq: number = 0,
    maxFreq: number = sampleRate / 2
): Float32Array[] {
    const numBins = fftSize / 2 + 1;
    const filterbank: Float32Array[] = [];

    // Convert frequency range to Mel scale
    const minMel = hzToMel(minFreq);
    const maxMel = hzToMel(maxFreq);

    // Create numBands + 2 evenly spaced points in Mel scale
    // We need +2 because each filter spans 3 points (left, center, right)
    const melPoints: number[] = [];
    for (let i = 0; i < numBands + 2; i++) {
        melPoints.push(minMel + (i * (maxMel - minMel)) / (numBands + 1));
    }

    // Convert back to Hz and then to FFT bin indices
    const binIndices = melPoints.map(mel => {
        const hz = melToHz(mel);
        return Math.floor((fftSize + 1) * hz / sampleRate);
    });

    // Create triangular filters
    for (let band = 0; band < numBands; band++) {
        const filter = new Float32Array(numBins);
        const left = binIndices[band];
        const center = binIndices[band + 1];
        const right = binIndices[band + 2];

        // Rising edge (left to center)
        for (let i = left; i < center; i++) {
            if (center !== left) {
                filter[i] = (i - left) / (center - left);
            }
        }

        // Falling edge (center to right)
        for (let i = center; i < right; i++) {
            if (right !== center) {
                filter[i] = (right - i) / (right - center);
            }
        }

        filterbank.push(filter);
    }

    return filterbank;
}

/**
 * Apply a high-pass filter to remove DC offset and low-frequency components
 * Uses a simple first-order IIR filter
 *
 * @param signal - Input signal
 * @param cutoff - Cutoff frequency in Hz
 * @param sampleRate - Sample rate in Hz
 * @returns Filtered signal
 */
export function highPassFilter(
    signal: Float32Array,
    cutoff: number,
    sampleRate: number
): Float32Array {
    if (signal.length === 0) {
        return new Float32Array(0);
    }

    // Calculate filter coefficient
    // Using simple RC high-pass: y[n] = alpha * (y[n-1] + x[n] - x[n-1])
    const rc = 1 / (2 * Math.PI * cutoff);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);

    const filtered = new Float32Array(signal.length);
    filtered[0] = signal[0];

    for (let i = 1; i < signal.length; i++) {
        filtered[i] = alpha * (filtered[i - 1] + signal[i] - signal[i - 1]);
    }

    return filtered;
}

/**
 * Apply Gaussian smoothing to a signal
 *
 * @param signal - Input signal
 * @param windowMs - Window size in milliseconds
 * @param sampleRate - Sample rate in Hz
 * @returns Smoothed signal
 */
export function gaussianSmooth(
    signal: Float32Array,
    windowMs: number,
    sampleRate: number
): Float32Array {
    if (signal.length === 0) {
        return new Float32Array(0);
    }

    // Calculate window size in samples
    const windowSamples = Math.round((windowMs / 1000) * sampleRate);

    if (windowSamples <= 1) {
        return new Float32Array(signal);
    }

    // Create Gaussian kernel
    const sigma = windowSamples / 6; // 3-sigma rule
    const kernelSize = windowSamples;
    const kernel = new Float32Array(kernelSize);
    const halfKernel = Math.floor(kernelSize / 2);

    let kernelSum = 0;
    for (let i = 0; i < kernelSize; i++) {
        const x = i - halfKernel;
        kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernelSum += kernel[i];
    }

    // Normalize kernel
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= kernelSum;
    }

    // Apply convolution
    const smoothed = new Float32Array(signal.length);
    for (let i = 0; i < signal.length; i++) {
        let sum = 0;
        for (let j = 0; j < kernelSize; j++) {
            const idx = i + j - halfKernel;
            // Reflect at boundaries
            const clampedIdx = idx < 0 ? -idx :
                              idx >= signal.length ? 2 * signal.length - idx - 2 :
                              idx;
            const safeIdx = Math.max(0, Math.min(signal.length - 1, clampedIdx));
            sum += signal[safeIdx] * kernel[j];
        }
        smoothed[i] = sum;
    }

    return smoothed;
}

/**
 * Calculate the standard deviation of a signal
 *
 * @param signal - Input signal
 * @returns Standard deviation
 */
export function calculateStdDev(signal: Float32Array): number {
    if (signal.length === 0) {
        return 0;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < signal.length; i++) {
        sum += signal[i];
    }
    const mean = sum / signal.length;

    // Calculate variance
    let varianceSum = 0;
    for (let i = 0; i < signal.length; i++) {
        const diff = signal[i] - mean;
        varianceSum += diff * diff;
    }
    const variance = varianceSum / signal.length;

    return Math.sqrt(variance);
}

/**
 * Perform FFT on a signal and return magnitude spectrum
 * Uses Cooley-Tukey algorithm with Hann window
 *
 * @param signal - Input signal (will be padded to nearest power of 2)
 * @returns Magnitude spectrum (half spectrum, positive frequencies only)
 */
export function performFFT(signal: Float32Array): Float32Array {
    const originalLength = signal.length;

    // Pad to nearest power of 2
    const paddedSize = Math.pow(2, Math.ceil(Math.log2(originalLength)));
    const real = new Float32Array(paddedSize);
    const imag = new Float32Array(paddedSize);

    // Apply Hann window and copy signal
    for (let i = 0; i < originalLength; i++) {
        const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (originalLength - 1));
        real[i] = signal[i] * window;
    }

    // Perform FFT (Cooley-Tukey)
    // Bit reversal
    let j = 0;
    for (let i = 0; i < paddedSize - 1; i++) {
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }

        let k = paddedSize / 2;
        while (j >= k) {
            j -= k;
            k /= 2;
        }
        j += k;
    }

    // FFT computation
    let length = 2;
    while (length <= paddedSize) {
        const angle = (-2 * Math.PI) / length;
        const wReal = Math.cos(angle);
        const wImag = Math.sin(angle);

        for (let i = 0; i < paddedSize; i += length) {
            let uReal = 1;
            let uImag = 0;

            for (let k = 0; k < length / 2; k++) {
                const t1 = i + k;
                const t2 = i + k + length / 2;

                const tReal = real[t2] * uReal - imag[t2] * uImag;
                const tImag = real[t2] * uImag + imag[t2] * uReal;

                real[t2] = real[t1] - tReal;
                imag[t2] = imag[t1] - tImag;
                real[t1] += tReal;
                imag[t1] += tImag;

                const tempReal = uReal * wReal - uImag * wImag;
                uImag = uReal * wImag + uImag * wReal;
                uReal = tempReal;
            }
        }

        length *= 2;
    }

    // Calculate magnitude spectrum (half spectrum)
    const magnitude = new Float32Array(paddedSize / 2 + 1);
    for (let i = 0; i < magnitude.length; i++) {
        const re = real[i];
        const im = imag[i];
        magnitude[i] = Math.sqrt(re * re + im * im);
    }

    return magnitude;
}

/**
 * Result of STFT analysis
 */
export interface STFTResult {
    /** 2D array of magnitude spectra (frame x frequency bin) */
    frames: Float32Array[];
    /** Number of frames */
    numFrames: number;
    /** FFT size used */
    fftSize: number;
    /** Hop size in samples */
    hopSize: number;
    /** Sample rate */
    sampleRate: number;
}

/**
 * Perform Short-Time Fourier Transform (STFT) on a signal
 *
 * @param signal - Input signal
 * @param fftSize - FFT window size in samples
 * @param hopSize - Hop size in samples
 * @param sampleRate - Sample rate in Hz
 * @returns STFT result containing magnitude spectra for each frame
 */
export function performSTFT(
    signal: Float32Array,
    fftSize: number,
    hopSize: number,
    sampleRate: number
): STFTResult {
    const frames: Float32Array[] = [];
    let position = 0;

    while (position + fftSize <= signal.length) {
        // Extract frame
        const frame = signal.slice(position, position + fftSize);

        // Perform FFT
        const spectrum = performFFT(frame);
        frames.push(spectrum);

        position += hopSize;
    }

    return {
        frames,
        numFrames: frames.length,
        fftSize,
        hopSize,
        sampleRate,
    };
}

// ============================================================================
// Band-Pass Filter for Multi-Band Transient Detection
// ============================================================================

/**
 * Configuration for the Butterworth band-pass filter
 *
 * The filter uses cascaded 2nd-order biquad sections for steep cutoff.
 * An 8th order filter provides 48 dB/octave slope.
 */
export interface BandPassFilterConfig {
    /** Filter order (must be even positive integer). Default: 8 for 48 dB/octave */
    order?: number;
    /** Optional Q factor adjustment. Default: 0.707 (Butterworth maximally flat) */
    qFactor?: number;
}

/**
 * Frequency band definition for multi-band analysis
 */
export interface FrequencyBand {
    /** Band name identifier (e.g., 'low', 'mid', 'high') */
    name: string;
    /** Lower cutoff frequency in Hz */
    lowHz: number;
    /** Upper cutoff frequency in Hz */
    highHz: number;
    /** Human-readable description of the band's typical content */
    description: string;
}

/**
 * Standard frequency bands for multi-band transient detection
 *
 * These three bands cover the full audible spectrum and are optimized
 * for detecting different types of rhythmic elements:
 * - Low: Bass, kick drums, sub frequencies
 * - Mid: Vocals, snare body, lead instruments
 * - High: Hi-hats, cymbals, harmonics, air
 */
export const FREQUENCY_BANDS: FrequencyBand[] = [
    { name: 'low', lowHz: 20, highHz: 500, description: 'Low frequencies (bass, kick, sub)' },
    { name: 'mid', lowHz: 500, highHz: 2000, description: 'Mid frequencies (vocals, snare body, lead instruments)' },
    { name: 'high', lowHz: 2000, highHz: 20000, description: 'High frequencies (hi-hats, cymbals, harmonics, air)' },
];

/**
 * Biquad filter coefficients
 */
interface BiquadCoefficients {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
}

/**
 * Calculate Q value for a specific stage of a Butterworth filter
 *
 * For an n-th order Butterworth filter, each 2nd-order stage has a different Q
 * based on the pole locations on the unit circle.
 *
 * @param stage - Stage number (1 to n/2 for n-th order filter)
 * @param order - Total filter order
 * @returns Q value for this stage
 */
function butterworthQ(stage: number, order: number): number {
    const theta = (Math.PI * (2 * stage - 1)) / (2 * order);
    return 1 / (2 * Math.sin(theta));
}

/**
 * Calculate Butterworth low-pass biquad coefficients for a single stage
 * Using RBJ Audio EQ Cookbook formulas
 *
 * Reference: https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html
 *
 * @param cutoff - Cutoff frequency in Hz
 * @param sampleRate - Sample rate in Hz
 * @param stage - Stage number (1 to n/2 for n-th order filter)
 * @param order - Total filter order
 * @returns Biquad coefficients for this stage
 */
function butterworthLowpassStage(
    cutoff: number,
    sampleRate: number,
    stage: number,
    order: number
): BiquadCoefficients {
    // Angular frequency
    const w0 = (2 * Math.PI * cutoff) / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);

    // Q for this Butterworth stage
    const Q = butterworthQ(stage, order);
    const alpha = sinW0 / (2 * Q);

    // RBJ Cookbook low-pass coefficients (normalized by a0)
    const a0 = 1 + alpha;

    const b0 = (1 - cosW0) / 2 / a0;
    const b1 = (1 - cosW0) / a0;
    const b2 = (1 - cosW0) / 2 / a0;
    const a1 = (-2 * cosW0) / a0;
    const a2 = (1 - alpha) / a0;

    return { b0, b1, b2, a1, a2 };
}

/**
 * Calculate Butterworth high-pass biquad coefficients for a single stage
 * Using RBJ Audio EQ Cookbook formulas
 *
 * Reference: https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html
 *
 * @param cutoff - Cutoff frequency in Hz
 * @param sampleRate - Sample rate in Hz
 * @param stage - Stage number (1 to n/2 for n-th order filter)
 * @param order - Total filter order
 * @returns Biquad coefficients for this stage
 */
function butterworthHighpassStage(
    cutoff: number,
    sampleRate: number,
    stage: number,
    order: number
): BiquadCoefficients {
    // Angular frequency
    const w0 = (2 * Math.PI * cutoff) / sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);

    // Q for this Butterworth stage
    const Q = butterworthQ(stage, order);
    const alpha = sinW0 / (2 * Q);

    // RBJ Cookbook high-pass coefficients (normalized by a0)
    const a0 = 1 + alpha;

    const b0 = (1 + cosW0) / 2 / a0;
    const b1 = -(1 + cosW0) / a0;
    const b2 = (1 + cosW0) / 2 / a0;
    const a1 = (-2 * cosW0) / a0;
    const a2 = (1 - alpha) / a0;

    return { b0, b1, b2, a1, a2 };
}

/**
 * Apply a single biquad filter stage to a signal
 *
 * @param signal - Input signal
 * @param coeffs - Biquad coefficients
 * @returns Filtered signal
 */
function applyBiquad(signal: Float32Array, coeffs: BiquadCoefficients): Float32Array {
    const { b0, b1, b2, a1, a2 } = coeffs;
    const output = new Float32Array(signal.length);

    // Initialize with first two samples (no previous state)
    output[0] = b0 * signal[0];
    if (signal.length > 1) {
        output[1] = b0 * signal[1] + b1 * signal[0] - a1 * output[0];
    }

    // Process remaining samples
    for (let i = 2; i < signal.length; i++) {
        output[i] =
            b0 * signal[i] +
            b1 * signal[i - 1] +
            b2 * signal[i - 2] -
            a1 * output[i - 1] -
            a2 * output[i - 2];
    }

    return output;
}

/**
 * Apply a Butterworth band-pass filter to a signal
 *
 * Implements a band-pass filter by cascading high-pass and low-pass filters.
 * Uses cascaded 2nd-order biquad sections for steep cutoff slopes.
 *
 * Default configuration is 8th order (48 dB/octave slope) which provides
 * clean band separation at crossover points without significant phase distortion.
 *
 * @param signal - Input signal to filter
 * @param lowHz - Lower cutoff frequency in Hz
 * @param highHz - Upper cutoff frequency in Hz
 * @param sampleRate - Sample rate in Hz
 * @param config - Optional filter configuration
 * @returns Filtered signal (same length as input)
 * @throws Error if order is not a positive even integer
 *
 * @example
 * ```typescript
 * // Apply default 8th order band-pass filter for low band (20-500 Hz)
 * const filtered = bandPassFilter(signal, 20, 500, 44100);
 *
 * // Apply 4th order filter with custom Q factor
 * const filtered = bandPassFilter(signal, 500, 2000, 44100, { order: 4, qFactor: 0.5 });
 * ```
 */
export function bandPassFilter(
    signal: Float32Array,
    lowHz: number,
    highHz: number,
    sampleRate: number,
    config?: BandPassFilterConfig
): Float32Array {
    // Handle empty signal
    if (signal.length === 0) {
        return new Float32Array(0);
    }

    // Default to 8th order (48 dB/octave)
    const order = config?.order ?? 8;
    // Note: qFactor is reserved for future use - Butterworth uses Q=0.707 internally

    // Validate order
    if (order <= 0 || order % 2 !== 0) {
        throw new Error(`Filter order must be a positive even integer, got: ${order}`);
    }

    // Validate frequency range
    if (lowHz >= highHz) {
        throw new Error(`Low frequency (${lowHz} Hz) must be less than high frequency (${highHz} Hz)`);
    }
    if (highHz >= sampleRate / 2) {
        throw new Error(`High frequency (${highHz} Hz) must be less than Nyquist frequency (${sampleRate / 2} Hz)`);
    }

    const numStages = order / 2;
    let filtered: Float32Array = new Float32Array(signal);

    // Apply high-pass filter stages (remove frequencies below lowHz)
    for (let stage = 1; stage <= numStages; stage++) {
        const coeffs = butterworthHighpassStage(lowHz, sampleRate, stage, order);
        filtered = applyBiquad(filtered, coeffs);
    }

    // Apply low-pass filter stages (remove frequencies above highHz)
    for (let stage = 1; stage <= numStages; stage++) {
        const coeffs = butterworthLowpassStage(highHz, sampleRate, stage, order);
        filtered = applyBiquad(filtered, coeffs);
    }

    return filtered;
}

/**
 * Apply a frequency band filter to a signal
 *
 * Convenience function that applies the band-pass filter using
 * predefined frequency band settings from FREQUENCY_BANDS.
 *
 * @param signal - Input signal to filter
 * @param bandName - Name of the frequency band ('low', 'mid', or 'high')
 * @param sampleRate - Sample rate in Hz
 * @param config - Optional filter configuration
 * @returns Filtered signal
 * @throws Error if bandName is not recognized
 *
 * @example
 * ```typescript
 * // Apply low band filter (20-500 Hz) for bass/kick detection
 * const lowFiltered = applyFrequencyBand(signal, 'low', 44100);
 *
 * // Apply mid band filter (500-2000 Hz) for vocal/snare detection
 * const midFiltered = applyFrequencyBand(signal, 'mid', 44100);
 *
 * // Apply high band filter (2000-20000 Hz) for hi-hat/cymbal detection
 * const highFiltered = applyFrequencyBand(signal, 'high', 44100);
 * ```
 */
export function applyFrequencyBand(
    signal: Float32Array,
    bandName: 'low' | 'mid' | 'high',
    sampleRate: number,
    config?: BandPassFilterConfig
): Float32Array {
    const band = FREQUENCY_BANDS.find(b => b.name === bandName);
    if (!band) {
        throw new Error(`Unknown frequency band: ${bandName}. Valid bands are: low, mid, high`);
    }
    return bandPassFilter(signal, band.lowHz, band.highHz, sampleRate, config);
}
