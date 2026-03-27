/**
 * EssentiaPitchDetector - Pitch detection using Essentia.js algorithms
 *
 * This module provides pitch detection using the Essentia.js WebAssembly library,
 * offering 6 different algorithms including industry-standard options for
 * polyphonic music (predominant_melodia) and neural network models (CREPE).
 *
 * ## Algorithm Categories
 *
 * ### Built-in WASM Algorithms (5 of 6)
 * These are compiled directly into the essentia-wasm.wasm binary and require
 * no external model files.
 *
 * | Algorithm | Best For | Returns Confidence? | Polyphonic? |
 * |-----------|----------|-------------------|-------------|
 * | `predominant_melodia` | Lead melody in polyphonic music **(Recommended)** | Yes | Single F0 |
 * | `pitch_melodia` | Standard monophonic melody extraction | Yes | Single F0 |
 * | `pitch_yin_probabilistic` | WASM-accelerated pYIN | Yes | Single F0 |
 * | `multipitch_melodia` | Multiple simultaneous F0 contours | No | Multi F0 |
 * | `multipitch_klapuri` | Harmonic summation multi-pitch | No | Multi F0 |
 *
 * ### External Model Algorithm (1 of 6)
 * `pitch_crepe` - Neural network pitch detection using TensorFlow.js.
 * Requires external TFJS model file loaded via `crepeModelUrl` config.
 *
 * @example
 * ```typescript
 * const detector = await EssentiaPitchDetector.create({
 *   algorithm: 'predominant_melodia',
 *   minFrequency: 80,
 *   maxFrequency: 20000,
 * });
 *
 * const results = detector.detectSignal(audioSignal, 44100);
 *
 * for (const result of results) {
 *   if (result.isVoiced) {
 *     console.log(`${result.timestamp.toFixed(3)}s: ${result.noteName} (${result.frequency.toFixed(1)} Hz)`);
 *   }
 * }
 * ```
 */

import type { PitchResult } from './PitchDetector.js';
import * as tf from '@tensorflow/tfjs';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Available Essentia pitch detection algorithms.
 *
 * Built-in WASM algorithms (no external model required):
 * - `predominant_melodia`: Extracts the lead melody from polyphonic music (Recommended default)
 * - `pitch_melodia`: Standard monophonic melody extraction
 * - `pitch_yin_probabilistic`: WASM-accelerated pYIN (same algorithm as PitchDetector, C++ speed)
 * - `multipitch_melodia`: Extracts multiple simultaneous F0 contours
 * - `multipitch_klapuri`: Harmonic summation polyphonic pitch detection
 *
 * External model algorithm:
 * - `pitch_crepe`: Neural network pitch detection using TensorFlow.js (requires crepeModelUrl)
 */
export type EssentiaPitchAlgorithm =
    | 'predominant_melodia'
    | 'pitch_melodia'
    | 'pitch_yin_probabilistic'
    | 'multipitch_melodia'
    | 'multipitch_klapuri'
    | 'pitch_crepe';

/**
 * CREPE model variants for neural network pitch detection.
 *
 * All variants have been converted to browser-compatible TFJS format.
 * The `large` variant is the recommended default for best accuracy/speed tradeoff.
 */
export type CrepeModelVariant = 'tiny' | 'small' | 'medium' | 'large' | 'full';

/**
 * Configuration for the EssentiaPitchDetector.
 */
export interface EssentiaPitchDetectorConfig {
    /**
     * The pitch detection algorithm to use.
     * @default 'predominant_melodia'
     */
    algorithm: EssentiaPitchAlgorithm;

    /**
     * Minimum frequency to detect in Hz.
     * @default 80
     */
    minFrequency: number;

    /**
     * Maximum frequency to detect in Hz.
     * @default 20000
     */
    maxFrequency: number;

    /**
     * Frame size in samples for analysis.
     * Essentia algorithms typically use 2048.
     * @default 2048
     */
    frameSize: number;

    /**
     * Hop size in samples between consecutive frames.
     * Essentia prefers finer hop sizes (128) than pYIN's 512.
     * @default 128
     */
    hopSize: number;

    /**
     * Target sample rate for analysis.
     * @default 44100
     */
    targetSampleRate: number;

    /**
     * URL to the CREPE TensorFlow.js model.
     * Only required when algorithm is 'pitch_crepe'.
     * Should point to the model.json file of the converted TFJS model.
     * @default '/models/crepe/large/model.json'
     */
    crepeModelUrl?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for EssentiaPitchDetector.
 */
const DEFAULT_CONFIG: EssentiaPitchDetectorConfig = {
    algorithm: 'predominant_melodia',
    minFrequency: 80,
    maxFrequency: 20000,
    frameSize: 2048,
    hopSize: 128,
    targetSampleRate: 44100,
    crepeModelUrl: '/models/crepe/large/model.json',
};

/** MIDI note number for A4 (440 Hz) */
const A4_MIDI = 69;

/** Frequency of A4 in Hz */
const A4_FREQUENCY = 440;

/** Note names for MIDI to note name conversion */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ============================================================================
// EssentiaPitchDetector Class
// ============================================================================

/**
 * Pitch Detector using Essentia.js algorithms
 *
 * Provides access to 6 different pitch detection algorithms from Essentia.js,
 * including industry-standard options for polyphonic music and neural networks.
 *
 * Uses the same `PitchResult[]` output format as `PitchDetector` for drop-in
 * compatibility with `PitchBeatLinker`.
 */
export class EssentiaPitchDetector {
    private config: EssentiaPitchDetectorConfig;

    /**
     * Essentia WASM module reference for algorithm invocation
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private essentiaWASM: any = null;

    /**
     * Essentia algorithms instance (EssentiaJS)
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private algorithms: any = null;

    /**
     * CREPE TensorFlow.js model (loaded lazily when pitch_crepe algorithm is used)
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private crepeModel: any = null;

    /**
     * Whether the WASM module has been initialized
     * @internal
     */
    private initialized: boolean = false;

    /**
     * Private constructor - use static `create()` factory method instead.
     *
     * @param config - Detector configuration
     */
    private constructor(config: EssentiaPitchDetectorConfig) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Create a new EssentiaPitchDetector instance.
     *
     * This factory method handles async WASM module loading.
     *
     * @param config - Configuration options (partial, defaults applied)
     * @returns Promise resolving to initialized EssentiaPitchDetector
     *
     * @example
     * ```typescript
     * const detector = await EssentiaPitchDetector.create({
     *   algorithm: 'predominant_melodia',
     * });
     * ```
     */
    static async create(
        config: Partial<EssentiaPitchDetectorConfig> = {}
    ): Promise<EssentiaPitchDetector> {
        const fullConfig = { ...DEFAULT_CONFIG, ...config };
        const detector = new EssentiaPitchDetector(fullConfig);

        // Load Essentia WASM module
        await detector.initializeEssentia();

        // Load CREPE model if that algorithm is selected
        if (fullConfig.algorithm === 'pitch_crepe') {
            await detector.loadCrepeModel(fullConfig.crepeModelUrl!);
        }

        return detector;
    }

    /**
     * Get the current configuration.
     */
    getConfig(): EssentiaPitchDetectorConfig {
        return { ...this.config };
    }

    /**
     * Initialize the Essentia WASM module.
     * @internal
     */
    private async initializeEssentia(): Promise<void> {
        if (this.initialized) return;

        // Load WASM backend (ES module version)
        // @ts-expect-error essentia.js does not have types for dist files
        const wasmModule = await import('essentia.js/dist/essentia-wasm.es.js');
        const EssentiaWASM = wasmModule.EssentiaWASM;

        // Wait for the WASM module to be ready
        await EssentiaWASM.ready;

        this.essentiaWASM = EssentiaWASM;
        this.algorithms = new EssentiaWASM.EssentiaJS(false);
        this.initialized = true;
    }

    /**
     * Load the CREPE TensorFlow.js model from a URL.
     * @internal
     */
    private async loadCrepeModel(modelUrl: string): Promise<void> {
        try {
            this.crepeModel = await tf.loadGraphModel(modelUrl);
            // Warm up the model with a dummy inference to avoid JIT lag on first real call
            const dummy = tf.zeros([1, 1024, 1]);
            tf.tidy(() => { this.crepeModel!.execute(dummy); });
            dummy.dispose();
            console.log(`[EssentiaPitchDetector] CREPE model loaded from ${modelUrl}`);
        } catch (error) {
            throw new Error(
                `Failed to load CREPE model from ${modelUrl}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Detect pitch in an audio signal.
     *
     * Processes the signal using the configured Essentia algorithm and returns
     * pitch estimates in the same format as `PitchDetector.detectSignal()`.
     *
     * @param signal - Mono audio signal as Float32Array
     * @param sampleRate - Sample rate of the signal
     * @returns Array of pitch results, one per analysis frame
     */
    detectSignal(signal: Float32Array, sampleRate: number): PitchResult[] {
        if (!this.initialized) {
            throw new Error('EssentiaPitchDetector not initialized. Use create() factory method.');
        }

        if (signal.length === 0) {
            return [];
        }

        switch (this.config.algorithm) {
            case 'predominant_melodia':
                return this.runPredominantMelodia(signal, sampleRate);
            case 'pitch_melodia':
                return this.runPitchMelodia(signal, sampleRate);
            case 'pitch_yin_probabilistic':
                return this.runPitchYinProbabilistic(signal, sampleRate);
            case 'multipitch_melodia':
                return this.runMultiPitchMelodia(signal, sampleRate);
            case 'multipitch_klapuri':
                return this.runMultiPitchKlapuri(signal, sampleRate);
            case 'pitch_crepe':
                return this.runCrepe(signal, sampleRate);
            default:
                throw new Error(`Unknown algorithm: ${this.config.algorithm as string}`);
        }
    }

    // ========================================================================
    // Single-F0 Algorithm Implementations
    // ========================================================================

    /**
     * PredominantPitchMelodia — extracts the lead melody from polyphonic music.
     * Returns pitch + confidence per frame. Output 0 Hz for unvoiced frames.
     * @internal
     */
    private runPredominantMelodia(signal: Float32Array, sampleRate: number): PitchResult[] {
        const vector = this.essentiaWASM.arrayToVector(signal);
        const result = this.algorithms.PredominantPitchMelodia(
            vector,
            10,              // binResolution
            3,               // filterIterations
            this.config.frameSize,
            false,           // guessUnvoiced
            0.8,             // harmonicWeight
            this.config.hopSize,
            1,               // magnitudeCompression
            40,              // magnitudeThreshold
            this.config.maxFrequency,
            100,             // minDuration
            this.config.minFrequency,
            20,              // numberHarmonics
            0.9,             // peakDistributionThreshold
            0.9,             // peakFrameThreshold
            27.5625,         // pitchContinuity
            55,              // referenceFrequency
            sampleRate,
            100,             // timeContinuity
            false,           // voiceVibrato
            0.2,             // voicingTolerance
        );

        const pitches = Array.from(this.essentiaWASM.vectorToArray(result.pitch) as number[]);
        const confidences = Array.from(this.essentiaWASM.vectorToArray(result.pitchConfidence) as number[]);
        const hopTime = this.config.hopSize / sampleRate;

        return this.mapSingleF0(pitches, confidences, hopTime);
    }

    /**
     * PitchMelodia — standard monophonic melody extraction.
     * Returns pitch + confidence per frame. Output 0 Hz for unvoiced frames.
     * @internal
     */
    private runPitchMelodia(signal: Float32Array, sampleRate: number): PitchResult[] {
        const vector = this.essentiaWASM.arrayToVector(signal);
        const result = this.algorithms.PitchMelodia(
            vector,
            10,              // binResolution
            3,               // filterIterations
            this.config.frameSize,
            false,           // guessUnvoiced
            0.8,             // harmonicWeight
            this.config.hopSize,
            1,               // magnitudeCompression
            40,              // magnitudeThreshold
            this.config.maxFrequency,
            100,             // minDuration
            this.config.minFrequency,
            20,              // numberHarmonics
            0.9,             // peakDistributionThreshold
            0.9,             // peakFrameThreshold
            27.5625,         // pitchContinuity
            55,              // referenceFrequency
            sampleRate,
            100,             // timeContinuity
        );

        const pitches = Array.from(this.essentiaWASM.vectorToArray(result.pitch) as number[]);
        const confidences = Array.from(this.essentiaWASM.vectorToArray(result.pitchConfidence) as number[]);
        const hopTime = this.config.hopSize / sampleRate;

        return this.mapSingleF0(pitches, confidences, hopTime);
    }

    /**
     * PitchYinProbabilistic — WASM-accelerated pYIN algorithm.
     * Returns pitch + voicedProbabilities per frame. Negative pitch = unvoiced.
     * @internal
     */
    private runPitchYinProbabilistic(signal: Float32Array, sampleRate: number): PitchResult[] {
        const vector = this.essentiaWASM.arrayToVector(signal);
        const result = this.algorithms.PitchYinProbabilistic(
            vector,
            this.config.frameSize,
            this.config.hopSize,
            0.1,             // lowRMSThreshold
            'negative',      // outputUnvoiced — negative values for unvoiced frames
            false,           // preciseTime
            sampleRate,
        );

        const pitches = Array.from(this.essentiaWASM.vectorToArray(result.pitch) as number[]);
        const voicedProbs = Array.from(this.essentiaWASM.vectorToArray(result.voicedProbabilities) as number[]);
        const hopTime = this.config.hopSize / sampleRate;

        return pitches.map((freq, i): PitchResult => {
            const timestamp = i * hopTime;
            const isVoiced = freq > 0 && voicedProbs[i] > 0.5;

            if (isVoiced) {
                const midiNote = Math.round(this.frequencyToMidi(freq));
                return {
                    timestamp,
                    frequency: freq,
                    probability: voicedProbs[i],
                    isVoiced: true,
                    midiNote,
                    noteName: this.midiToNoteName(midiNote),
                };
            }

            return {
                timestamp,
                frequency: 0,
                probability: 0,
                isVoiced: false,
                midiNote: null,
                noteName: null,
            };
        });
    }

    // ========================================================================
    // Multi-Pitch Algorithm Implementations
    // ========================================================================

    /**
     * MultiPitchMelodia — multiple simultaneous F0 contours via MELODIA.
     * Returns 2D pitch array (vector of vectors). No confidence output.
     * @internal
     */
    private runMultiPitchMelodia(signal: Float32Array, sampleRate: number): PitchResult[] {
        const vector = this.essentiaWASM.arrayToVector(signal);
        const result = this.algorithms.MultiPitchMelodia(
            vector,
            10,              // binResolution
            3,               // filterIterations
            this.config.frameSize,
            false,           // guessUnvoiced
            0.8,             // harmonicWeight
            this.config.hopSize,
            1,               // magnitudeCompression
            40,              // magnitudeThreshold
            this.config.maxFrequency,
            100,             // minDuration
            this.config.minFrequency,
            20,              // numberHarmonics
            0.9,             // peakDistributionThreshold
            0.9,             // peakFrameThreshold
            27.5625,         // pitchContinuity
            55,              // referenceFrequency
            sampleRate,
            100,             // timeContinuity
        );

        return this.mapMultiPitch(result.pitch, sampleRate);
    }

    /**
     * MultiPitchKlapuri — harmonic summation multi-pitch detection.
     * Returns 2D pitch array (vector of vectors). No confidence output.
     * @internal
     */
    private runMultiPitchKlapuri(signal: Float32Array, sampleRate: number): PitchResult[] {
        const vector = this.essentiaWASM.arrayToVector(signal);
        const result = this.algorithms.MultiPitchKlapuri(
            vector,
            10,              // binResolution
            this.config.frameSize,
            0.8,             // harmonicWeight
            this.config.hopSize,
            1,               // magnitudeCompression
            40,              // magnitudeThreshold
            this.config.maxFrequency,
            this.config.minFrequency,
            10,              // numberHarmonics
            55,              // referenceFrequency
            sampleRate,
        );

        return this.mapMultiPitch(result.pitch, sampleRate);
    }

    // ========================================================================
    // CREPE Neural Network Implementation
    // ========================================================================

    /**
     * CREPE pitch detection via TensorFlow.js neural network.
     *
     * CREPE expects 16kHz audio input with 1024-sample frames.
     * The model outputs a 360-bin pitch distribution (10 cents per bin,
     * covering C1 ≈ 32.7 Hz to ~2093 Hz).
     *
     * The signal is resampled to 16kHz internally.
     * @internal
     */
    private runCrepe(signal: Float32Array, sampleRate: number): PitchResult[] {
        if (!this.crepeModel) {
            throw new Error(
                'CREPE model not loaded. Ensure algorithm is "pitch_crepe" and model URL is valid.'
            );
        }

        // CREPE operates at 16kHz with 1024-sample frames
        const crepeSr = 16000;
        const crepeFrameSize = 1024;
        const crepeHopSize = 256;
        const resampled = this.resampleSignal(signal, sampleRate, crepeSr);

        const numFrames = Math.floor((resampled.length - crepeFrameSize) / crepeHopSize) + 1;
        const crepeHopTime = crepeHopSize / crepeSr;
        const C1_FREQ = 32.70;

        const results: PitchResult[] = [];

        for (let i = 0; i < numFrames; i++) {
            const start = i * crepeHopSize;
            const frame = resampled.slice(start, start + crepeFrameSize);
            const timestamp = i * crepeHopTime;

            let result: PitchResult;
            try {
                // Run CREPE inference inside tf.tidy for automatic tensor cleanup
                const inferenceResult = tf.tidy(() => {
                    const inputTensor = tf.tensor(frame, [1, crepeFrameSize, 1]);
                    const output = this.crepeModel!.execute(inputTensor) as tf.Tensor;
                    return output.dataSync().slice() as Float32Array;
                });

                const probabilities = inferenceResult;
                let weightedSum = 0;
                let totalWeight = 0;
                let maxProb = 0;

                for (let b = 0; b < 360; b++) {
                    const prob = probabilities[b];
                    weightedSum += b * 10 * prob; // bin center in cents
                    totalWeight += prob;
                    if (prob > maxProb) maxProb = prob;
                }

                if (totalWeight > 0 && maxProb > 0.3) {
                    const cents = weightedSum / totalWeight;
                    const frequency = C1_FREQ * Math.pow(2, cents / 1200);
                    const midiNote = Math.round(this.frequencyToMidi(frequency));
                    result = {
                        timestamp,
                        frequency,
                        probability: maxProb,
                        isVoiced: true,
                        midiNote,
                        noteName: this.midiToNoteName(midiNote),
                    };
                } else {
                    result = {
                        timestamp,
                        frequency: 0,
                        probability: 0,
                        isVoiced: false,
                        midiNote: null,
                        noteName: null,
                    };
                }
            } catch (error) {
                console.error(
                    `[EssentiaPitchDetector] CREPE inference error at frame ${i}:`,
                    error
                );
                result = {
                    timestamp,
                    frequency: 0,
                    probability: 0,
                    isVoiced: false,
                    midiNote: null,
                    noteName: null,
                };
            }

            results.push(result);
        }

        return results;
    }

    // ========================================================================
    // Output Mapping Helpers
    // ========================================================================

    /**
     * Map single-F0 algorithm output (pitch + confidence arrays) to PitchResult[].
     * Voiced frames have freq > 0; unvoiced frames have freq == 0.
     * @internal
     */
    private mapSingleF0(
        pitches: number[],
        confidences: number[],
        hopTime: number
    ): PitchResult[] {
        return pitches.map((freq, i): PitchResult => {
            const timestamp = i * hopTime;

            if (freq > 0) {
                const midiNote = Math.round(this.frequencyToMidi(freq));
                return {
                    timestamp,
                    frequency: freq,
                    probability: confidences[i] ?? 0,
                    isVoiced: true,
                    midiNote,
                    noteName: this.midiToNoteName(midiNote),
                };
            }

            return {
                timestamp,
                frequency: 0,
                probability: 0,
                isVoiced: false,
                midiNote: null,
                noteName: null,
            };
        });
    }

    /**
     * Map multi-pitch algorithm output (VectorVectorFloat) to PitchResult[].
     * Uses the lowest detected frequency as primary pitch; stores others
     * in alternativeHypotheses. Defaults probability to 1.0 (no confidence output).
     * @internal
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mapMultiPitch(pitchVV: any, sampleRate: number): PitchResult[] {
        const numFrames = pitchVV.size();
        const hopTime = this.config.hopSize / sampleRate;
        const results: PitchResult[] = [];

        for (let i = 0; i < numFrames; i++) {
            const frameVector = pitchVV.get(i);
            const pitches = Array.from(
                this.essentiaWASM.vectorToArray(frameVector) as Float32Array
            );
            const validPitches = pitches.filter((f) => f > 0).sort((a, b) => a - b);
            const timestamp = i * hopTime;

            if (validPitches.length > 0) {
                const primaryFreq = validPitches[0];
                const midiNote = Math.round(this.frequencyToMidi(primaryFreq));

                const alternatives = validPitches.slice(1).map((f) => ({
                    frequency: f,
                    probability: 1.0,
                }));

                results.push({
                    timestamp,
                    frequency: primaryFreq,
                    probability: 1.0,
                    isVoiced: true,
                    midiNote,
                    noteName: this.midiToNoteName(midiNote),
                    ...(alternatives.length > 0 ? { alternativeHypotheses: alternatives } : {}),
                });
            } else {
                results.push({
                    timestamp,
                    frequency: 0,
                    probability: 0,
                    isVoiced: false,
                    midiNote: null,
                    noteName: null,
                });
            }
        }

        return results;
    }

    // ========================================================================
    // Signal Processing Helpers
    // ========================================================================

    /**
     * Resample a signal from one sample rate to another using linear interpolation.
     * @internal
     */
    private resampleSignal(
        signal: Float32Array,
        fromRate: number,
        toRate: number
    ): Float32Array {
        if (fromRate === toRate) return signal;

        const ratio = fromRate / toRate;
        const newLength = Math.round(signal.length / ratio);
        const result = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
            const srcIndex = i * ratio;
            const low = Math.floor(srcIndex);
            const high = Math.min(low + 1, signal.length - 1);
            const frac = srcIndex - low;
            result[i] = signal[low] * (1 - frac) + signal[high] * frac;
        }

        return result;
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Convert frequency in Hz to MIDI note number.
     * @internal
     */
    private frequencyToMidi(frequency: number): number {
        return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
    }

    /**
     * Convert MIDI note number to note name (e.g., "C4", "F#5").
     * @internal
     */
    private midiToNoteName(midi: number): string {
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = Math.round(midi) % 12;
        return `${NOTE_NAMES[noteIndex]}${octave}`;
    }
}
