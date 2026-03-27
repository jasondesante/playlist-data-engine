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
     * Load the CREPE TensorFlow.js model.
     * @internal
     */
    private async loadCrepeModel(modelUrl: string): Promise<void> {
        // CREPE model loading will be implemented in Task 1.2
        // For now, throw an error to indicate the feature is not yet implemented
        throw new Error(
            `CREPE model loading not yet implemented. Model URL: ${modelUrl}`
        );
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

        // Algorithm dispatch will be implemented in Task 1.2
        // For now, return empty results
        console.warn('[EssentiaPitchDetector] detectSignal not yet implemented', signal.length, sampleRate);
        return [];
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
