/**
 * Pitch Detection using pYIN (Probabilistic YIN) Algorithm
 *
 * Implements the pYIN algorithm for robust pitch detection in polyphonic music.
 * pYIN extends the classic YIN algorithm with probabilistic modeling and
 * Hidden Markov Model (HMM) tracking for smoother, more accurate pitch estimation.
 *
 * ## Algorithm Overview
 *
 * 1. **YIN Difference Function**: Computes the difference between the signal
 *    and time-shifted versions of itself at various lags (candidate periods).
 *
 * 2. **Cumulative Mean Normalization**: Normalizes the difference function
 *    to make it more robust to amplitude variations.
 *
 * 3. **Pitch Candidates**: For each frame, identifies multiple pitch candidates
 *    with associated probabilities based on the normalized difference function.
 *
 * 4. **HMM Tracking**: Uses a Hidden Markov Model to track pitch over time,
 *    considering both observation probabilities and transition costs.
 *
 * 5. **Viterbi Decoding**: Finds the optimal sequence of pitch states that
 *    maximizes the overall probability, producing smooth pitch trajectories.
 *
 * ## Key Features
 *
 * - **Probabilistic Output**: Provides probability/confidence for each pitch estimate
 * - **Voicing Detection**: Automatically detects voiced (pitched) vs unvoiced segments
 * - **Smooth Transitions**: HMM prevents erratic pitch jumps between frames
 * - **Polyphonic Robustance**: Handles complex audio by tracking the most likely fundamental
 *
 * @example
 * ```typescript
 * const detector = new PitchDetector({
 *   minFrequency: 80,
 *   maxFrequency: 1000,
 * });
 *
 * const results = detector.detect(audioBuffer);
 *
 * for (const result of results) {
 *   if (result.isVoiced) {
 *     console.log(`${result.timestamp.toFixed(3)}s: ${result.noteName} (${result.frequency.toFixed(1)} Hz)`);
 *   }
 * }
 * ```
 *
 * ## References
 *
 * - Mauch, M., & Dixon, S. (2014). pYIN: A Fundamental Frequency Estimator Using
 *   Probabilistic Threshold Distributions. IEEE ICASSP.
 * - De Cheveigné, A., & Kawahara, H. (2002). YIN, a fundamental frequency
 *   estimator for speech and music. JASA.
 */

import { resampleAudio } from './beat/utils/audioUtils.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for the PitchDetector
 */
export interface PitchDetectorConfig {
    // === Frequency Range ===
    /** Minimum frequency to detect in Hz (default: 80Hz, low guitar) */
    minFrequency: number;
    /** Maximum frequency to detect in Hz (default: 1000Hz, high vocals) */
    maxFrequency: number;

    // === Analysis Window ===
    /** Frame size in samples (default: 2048, ~46ms at 44.1kHz) */
    frameSize: number;
    /** Hop size in samples (default: 512, ~12ms at 44.1kHz) */
    hopSize: number;

    // === pYIN HMM Parameters ===
    /** Probability threshold for voiced/unvoiced decision (default: 0.5) */
    voicingThreshold: number;
    /** Penalty for large pitch jumps in HMM (default: 0.5) */
    transitionPenalty: number;
    /** Probability of staying in the same pitch state (default: 0.99) */
    selfTransitionProbability: number;

    // === YIN Core Parameters ===
    /** Threshold for accepting a pitch candidate (default: 0.1) */
    yinThreshold: number;

    // === Sample Rate ===
    /** Target sample rate for analysis (default: 44100) */
    targetSampleRate: number;
}

/**
 * Result of pitch detection for a single frame
 */
export interface PitchResult {
    /** Timestamp in seconds */
    timestamp: number;
    /** Detected frequency in Hz (0 if no pitch detected) */
    frequency: number;
    /** Probability from pYIN HMM (0-1) */
    probability: number;
    /** Whether this frame contains a detectable pitch */
    isVoiced: boolean;
    /** MIDI note number (null if unvoiced) */
    midiNote: number | null;
    /** Note name e.g., "C4", "F#5" (null if unvoiced) */
    noteName: string | null;
    /** Alternative hypotheses for debugging/analysis (optional) */
    alternativeHypotheses?: {
        frequency: number;
        probability: number;
    }[];
}

/**
 * Internal representation of a pitch candidate
 */
interface PitchCandidate {
    /** Lag in samples (period) */
    lag: number;
    /** Frequency in Hz */
    frequency: number;
    /** Probability based on normalized difference */
    probability: number;
}

/**
 * HMM state representing a pitch
 */
interface PitchState {
    /** Frequency in Hz */
    frequency: number;
    /** MIDI note (rounded) */
    midiNote: number;
    /** Index in the state array */
    index: number;
}

/**
 * Viterbi path node for tracking optimal sequence
 */
interface ViterbiNode {
    /** Log probability of the best path to this state */
    logProbability: number;
    /** Index of the previous state in the best path */
    previousState: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default configuration for PitchDetector */
const DEFAULT_CONFIG: PitchDetectorConfig = {
    minFrequency: 80,
    maxFrequency: 1000,
    frameSize: 2048,
    hopSize: 512,
    voicingThreshold: 0.2,
    transitionPenalty: 0.5,
    selfTransitionProbability: 0.99,
    yinThreshold: 0.4,
    targetSampleRate: 44100,
};

/** Number of pitch bins per semitone for HMM states */
const BINS_PER_SEMITONE = 2;

/** MIDI note number for A4 (440 Hz) */
const A4_MIDI = 69;

/** Frequency of A4 in Hz */
const A4_FREQUENCY = 440;

/** Note names for MIDI to note name conversion */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ============================================================================
// PitchDetector Class
// ============================================================================

/**
 * Pitch Detector using the pYIN algorithm
 *
 * Detects the fundamental frequency (pitch) of audio signals over time.
 * Uses probabilistic YIN with HMM tracking for robust, smooth pitch estimation.
 */
export class PitchDetector {
    private config: PitchDetectorConfig;
    private states: PitchState[] = [];
    private transitionMatrix: number[][] = [];

    /**
     * Create a new PitchDetector
     *
     * @param config - Configuration options (partial, defaults applied)
     */
    constructor(config: Partial<PitchDetectorConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Validate configuration
        if (this.config.minFrequency <= 0) {
            throw new Error(`minFrequency must be positive, got: ${this.config.minFrequency}`);
        }
        if (this.config.maxFrequency <= this.config.minFrequency) {
            throw new Error(`maxFrequency must be greater than minFrequency`);
        }
        if (this.config.frameSize <= 0 || (this.config.frameSize & (this.config.frameSize - 1)) !== 0) {
            throw new Error(`frameSize must be a positive power of 2`);
        }
        if (this.config.hopSize <= 0) {
            throw new Error(`hopSize must be positive`);
        }
        if (this.config.voicingThreshold < 0 || this.config.voicingThreshold > 1) {
            throw new Error(`voicingThreshold must be between 0 and 1`);
        }

        // Initialize HMM states and transition matrix
        this.initializeHMM();
    }

    /**
     * Get the current configuration
     */
    getConfig(): PitchDetectorConfig {
        return { ...this.config };
    }

    /**
     * Initialize the HMM states and transition matrix
     *
     * Creates pitch states covering the frequency range with 2 bins per semitone.
     * Pre-computes the transition probabilities between all state pairs.
     */
    private initializeHMM(): void {
        const { minFrequency, maxFrequency } = this.config;

        // Calculate MIDI note range
        const minMidi = this.frequencyToMidi(minFrequency);
        const maxMidi = this.frequencyToMidi(maxFrequency);

        // Create states with 2 bins per semitone
        this.states = [];
        for (let midi = minMidi; midi <= maxMidi; midi += 0.5) {
            this.states.push({
                frequency: this.midiToFrequency(midi),
                midiNote: Math.round(midi),
                index: this.states.length,
            });
        }

        // Add unvoiced state (index = states.length)
        this.states.push({
            frequency: 0,
            midiNote: -1,
            index: this.states.length,
        });

        // Pre-compute transition matrix
        this.transitionMatrix = this.computeTransitionMatrix();
    }

    /**
     * Compute the transition probability matrix for the HMM
     *
     * The transition probability depends on the pitch distance between states.
     * Closer pitches have higher transition probabilities.
     */
    private computeTransitionMatrix(): number[][] {
        const numStates = this.states.length;
        const matrix: number[][] = [];

        for (let i = 0; i < numStates; i++) {
            matrix[i] = [];
            for (let j = 0; j < numStates; j++) {
                matrix[i][j] = this.transitionProbability(i, j);
            }
        }

        return matrix;
    }

    /**
     * Calculate transition probability between two states
     */
    private transitionProbability(fromIndex: number, toIndex: number): number {
        const { selfTransitionProbability, transitionPenalty } = this.config;
        const numStates = this.states.length;
        const unvoicedIndex = numStates - 1;

        // Self-transition (staying in the same state)
        if (fromIndex === toIndex) {
            return Math.log(selfTransitionProbability);
        }

        // Transition to/from unvoiced state
        if (fromIndex === unvoicedIndex || toIndex === unvoicedIndex) {
            // Lower probability for voiced/unvoiced transitions
            return Math.log((1 - selfTransitionProbability) * 0.1);
        }

        // Transition between voiced states
        const fromMidi = this.states[fromIndex].midiNote;
        const toMidi = this.states[toIndex].midiNote;
        const midiDiff = Math.abs(toMidi - fromMidi);

        // Exponential decay based on pitch distance
        const probability = (1 - selfTransitionProbability) * Math.exp(-transitionPenalty * midiDiff);

        return Math.log(probability);
    }

    /**
     * Convert frequency in Hz to MIDI note number
     */
    private frequencyToMidi(frequency: number): number {
        return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
    }

    /**
     * Convert MIDI note number to frequency in Hz
     */
    private midiToFrequency(midi: number): number {
        return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
    }

    /**
     * Convert MIDI note number to note name (e.g., "C4", "F#5")
     */
    private midiToNoteName(midi: number): string {
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = Math.round(midi) % 12;
        return `${NOTE_NAMES[noteIndex]}${octave}`;
    }

    /**
     * Detect pitch in an audio buffer
     *
     * Processes the entire audio buffer and returns pitch estimates for each frame.
     *
     * @param audioBuffer - Audio buffer to analyze
     * @returns Array of pitch results, one per analysis frame
     */
    detect(audioBuffer: AudioBuffer): PitchResult[] {
        // Resample if necessary
        const resampled = resampleAudio(audioBuffer, this.config.targetSampleRate);
        const signal = resampled.data;
        const sampleRate = this.config.targetSampleRate;

        // Calculate frame parameters
        const { frameSize, hopSize } = this.config;
        const numFrames = Math.floor((signal.length - frameSize) / hopSize) + 1;
        const hopTime = hopSize / sampleRate;

        // Collect pitch candidates for each frame
        const frameCandidates: PitchCandidate[][] = [];
        const allFrameCandidates: PitchCandidate[][] = [];

        for (let frame = 0; frame < numFrames; frame++) {
            const startSample = frame * hopSize;
            const frameSignal = signal.slice(startSample, startSample + frameSize);

            // Get pitch candidates for this frame
            const { filtered, all } = this.analyzeFrame(frameSignal, sampleRate);
            frameCandidates.push(filtered);
            allFrameCandidates.push(all);
        }

        // Run Viterbi decoding to find optimal pitch path
        const optimalPath = this.viterbiDecode(frameCandidates);

        // Convert to PitchResult array
        const results: PitchResult[] = [];
        for (let frame = 0; frame < numFrames; frame++) {
            const stateIndex = optimalPath[frame];
            const state = this.states[stateIndex];
            const candidates = frameCandidates[frame];
            const allCandidates = allFrameCandidates[frame];

            const result: PitchResult = {
                timestamp: frame * hopTime,
                frequency: state.frequency,
                probability: this.getFrameProbability(stateIndex, candidates),
                isVoiced: state.frequency > 0,
                midiNote: state.frequency > 0 ? state.midiNote : null,
                noteName: state.frequency > 0 ? this.midiToNoteName(state.midiNote) : null,
            };

            // Add alternative hypotheses from all candidates (including subharmonics)
            // This is useful for debugging and analysis
            if (allCandidates.length > 1) {
                result.alternativeHypotheses = allCandidates.slice(0, 5).map(c => ({
                    frequency: c.frequency,
                    probability: c.probability,
                }));
            }

            results.push(result);
        }

        return results;
    }

    /**
     * Detect pitch continuously across a signal (full pYIN with HMM tracking)
     *
     * Same as detect() but accepts a Float32Array directly instead of AudioBuffer.
     * Use this when audio has already been decoded or filtered.
     *
     * Note: The HMM is tuned for clean monophonic signals and may be too conservative
     * for band-pass filtered polyphonic music. For such cases, prefer detectSignalRaw()
     * which uses raw YIN voicing decisions without HMM bias.
     *
     * @param signal - Mono audio signal
     * @param sampleRate - Sample rate of the signal
     * @returns Array of pitch results, one per analysis frame
     */
    detectSignal(signal: Float32Array, sampleRate: number): PitchResult[] {
        const { frameSize, hopSize } = this.config;
        const numFrames = Math.floor((signal.length - frameSize) / hopSize) + 1;
        const hopTime = hopSize / sampleRate;

        // Collect pitch candidates for each frame
        const frameCandidates: PitchCandidate[][] = [];
        const allFrameCandidates: PitchCandidate[][] = [];

        for (let frame = 0; frame < numFrames; frame++) {
            const startSample = frame * hopSize;
            const frameSignal = signal.slice(startSample, startSample + frameSize);

            const { filtered, all } = this.analyzeFrame(frameSignal, sampleRate);
            frameCandidates.push(filtered);
            allFrameCandidates.push(all);
        }

        // Run Viterbi decoding to find optimal pitch path
        const optimalPath = this.viterbiDecode(frameCandidates);

        // Convert to PitchResult array
        const results: PitchResult[] = [];
        for (let frame = 0; frame < numFrames; frame++) {
            const stateIndex = optimalPath[frame];
            const state = this.states[stateIndex];
            const candidates = frameCandidates[frame];
            const allCandidates = allFrameCandidates[frame];

            const result: PitchResult = {
                timestamp: frame * hopTime,
                frequency: state.frequency,
                probability: this.getFrameProbability(stateIndex, candidates),
                isVoiced: state.frequency > 0,
                midiNote: state.frequency > 0 ? state.midiNote : null,
                noteName: state.frequency > 0 ? this.midiToNoteName(state.midiNote) : null,
            };

            if (allCandidates.length > 1) {
                result.alternativeHypotheses = allCandidates.slice(0, 5).map(c => ({
                    frequency: c.frequency,
                    probability: c.probability,
                }));
            }

            results.push(result);
        }

        return results;
    }

    /**
     * Detect pitch continuously across a signal using raw YIN (no HMM)
     *
     * Analyzes every frame with YIN and uses raw candidate probability for voicing
     * decisions, without the HMM's unvoiced-state bias. More suitable than detectSignal()
     * for band-pass filtered polyphonic music where the HMM tends to stay stuck in
     * the unvoiced state.
     *
     * @param signal - Mono audio signal
     * @param sampleRate - Sample rate of the signal
     * @returns Array of pitch results, one per analysis frame
     */
    detectSignalRaw(signal: Float32Array, sampleRate: number): PitchResult[] {
        const { frameSize, hopSize, voicingThreshold } = this.config;
        const numFrames = Math.floor((signal.length - frameSize) / hopSize) + 1;
        const hopTime = hopSize / sampleRate;

        const results: PitchResult[] = [];

        // DEBUG: track candidate quality distribution
        let framesWithCandidates = 0;
        let framesWithNoCandidates = 0;
        const probBuckets = { below01: 0, b01_02: 0, b02_03: 0, b03_04: 0, b04_05: 0, above05: 0 };

        for (let frame = 0; frame < numFrames; frame++) {
            const startSample = frame * hopSize;
            const frameSignal = signal.slice(startSample, startSample + frameSize);

            const { filtered, all } = this.analyzeFrame(frameSignal, sampleRate);
            const timestamp = frame * hopTime;

            if (filtered.length > 0) {
                framesWithCandidates++;
                const bestProb = filtered[0].probability;

                // Bucket the probability
                if (bestProb < 0.1) probBuckets.below01++;
                else if (bestProb < 0.2) probBuckets.b01_02++;
                else if (bestProb < 0.3) probBuckets.b02_03++;
                else if (bestProb < 0.4) probBuckets.b03_04++;
                else if (bestProb < 0.5) probBuckets.b04_05++;
                else probBuckets.above05++;

                if (bestProb >= voicingThreshold) {
                    const best = filtered[0];
                    const midiNote = Math.round(this.frequencyToMidi(best.frequency));

                    const result: PitchResult = {
                        timestamp,
                        frequency: best.frequency,
                        probability: best.probability,
                        isVoiced: true,
                        midiNote,
                        noteName: this.midiToNoteName(midiNote),
                    };

                    if (all.length > 1) {
                        result.alternativeHypotheses = all.slice(0, 5).map(c => ({
                            frequency: c.frequency,
                            probability: c.probability,
                        }));
                    }

                    results.push(result);
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
            } else {
                framesWithNoCandidates++;
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

        // DEBUG: log candidate quality distribution
        console.log('[PitchDetector.detectSignalRaw] Candidate quality:', {
            numFrames,
            framesWithCandidates,
            framesWithNoCandidates,
            candidateRate: ((framesWithCandidates / numFrames) * 100).toFixed(1) + '%',
            voicingThreshold,
            probBuckets,
        });

        return results;
    }

    /**
     * Detect pitch at a specific timestamp
     *
     * Analyzes a single frame centered at the given timestamp.
     *
     * @param signal - Mono audio signal
     * @param sampleRate - Sample rate of the signal
     * @param timestamp - Timestamp in seconds to analyze
     * @returns Pitch result for the frame
     */
    detectAt(signal: Float32Array, sampleRate: number, timestamp: number): PitchResult {
        const { frameSize, hopSize } = this.config;
        const targetSample = Math.round(timestamp * sampleRate);

        // Ensure we have enough samples for the frame
        const startSample = Math.max(0, targetSample - Math.floor(frameSize / 2));
        const endSample = Math.min(signal.length, startSample + frameSize);

        if (endSample - startSample < frameSize) {
            // Not enough samples
            return {
                timestamp,
                frequency: 0,
                probability: 0,
                isVoiced: false,
                midiNote: null,
                noteName: null,
            };
        }

        const frameSignal = signal.slice(startSample, endSample);
        const { filtered, all } = this.analyzeFrame(frameSignal, sampleRate);

        // Find best candidate
        if (filtered.length === 0) {
            return {
                timestamp,
                frequency: 0,
                probability: 0,
                isVoiced: false,
                midiNote: null,
                noteName: null,
            };
        }

        const best = filtered[0];
        const midiNote = Math.round(this.frequencyToMidi(best.frequency));

        const result: PitchResult = {
            timestamp,
            frequency: best.frequency,
            probability: best.probability,
            isVoiced: best.probability >= this.config.voicingThreshold,
            midiNote,
            noteName: this.midiToNoteName(midiNote),
        };

        // Add alternative hypotheses from all candidates
        if (all.length > 1) {
            result.alternativeHypotheses = all.slice(0, 5).map(c => ({
                frequency: c.frequency,
                probability: c.probability,
            }));
        }

        return result;
    }

    /**
     * Analyze a single frame and return pitch candidates
     *
     * Implements the core YIN algorithm with probabilistic output.
     * Uses absolute threshold method: prefers the first (highest frequency) candidate
     * below the threshold to avoid octave errors.
     */
    private analyzeFrame(signal: Float32Array, sampleRate: number): { filtered: PitchCandidate[], all: PitchCandidate[] } {
        const { minFrequency, maxFrequency, yinThreshold } = this.config;

        // Calculate lag range from frequency range
        const maxLag = Math.ceil(sampleRate / minFrequency);
        const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));

        // Ensure we don't exceed half the frame size
        const actualMaxLag = Math.min(maxLag, Math.floor(signal.length / 2));

        // Compute YIN difference function
        const difference = this.computeDifferenceFunction(signal, actualMaxLag);

        // Compute cumulative mean normalized difference function
        const cmndf = this.computeCMNDF(difference, minLag, actualMaxLag);

        // Find local minima as pitch candidates
        const allCandidates: PitchCandidate[] = [];

        for (let lag = minLag + 1; lag < actualMaxLag - 1; lag++) {
            // Check if this is a local minimum
            if (cmndf[lag] < cmndf[lag - 1] && cmndf[lag] < cmndf[lag + 1]) {
                // Check if below threshold
                if (cmndf[lag] < yinThreshold) {
                    // Refine the estimate using parabolic interpolation
                    const refinedLag = this.parabolicInterpolation(cmndf, lag);
                    const frequency = sampleRate / refinedLag;

                    // Convert difference to probability (lower = higher probability)
                    const probability = 1 - cmndf[lag];

                    if (frequency >= minFrequency && frequency <= maxFrequency) {
                        allCandidates.push({ lag: refinedLag, frequency, probability });
                    }
                }
            }
        }

        // Sort by probability (descending)
        allCandidates.sort((a, b) => b.probability - a.probability);

        if (allCandidates.length === 0) {
            return { filtered: [], all: [] };
        }

        // Apply subharmonic filtering:
        // For each candidate, check if there's a higher-frequency candidate
        // with similar probability that is approximately N times the frequency.
        // If so, the lower frequency is likely a subharmonic and should be removed.
        const filteredCandidates: PitchCandidate[] = [];
        const bestProb = allCandidates[0].probability;

        for (const candidate of allCandidates) {
            let isSubharmonic = false;

            // Check against all higher-frequency candidates with good probability
            for (const other of allCandidates) {
                if (other.frequency <= candidate.frequency) continue;
                if (other.probability < bestProb * 0.9) continue;

                // Check if this candidate is a subharmonic of the other
                // (i.e., other.frequency ≈ N * candidate.frequency for integer N)
                const ratio = other.frequency / candidate.frequency;
                const nearestInteger = Math.round(ratio);
                const deviation = Math.abs(ratio - nearestInteger);

                // If the ratio is close to an integer (2, 3, 4, etc.), this is a subharmonic
                if (nearestInteger >= 2 && nearestInteger <= 5 && deviation < 0.1) {
                    isSubharmonic = true;
                    break;
                }
            }

            if (!isSubharmonic) {
                filteredCandidates.push(candidate);
            }
        }

        // If we filtered out all candidates, keep the best one
        if (filteredCandidates.length === 0 && allCandidates.length > 0) {
            filteredCandidates.push(allCandidates[0]);
        }

        return { filtered: filteredCandidates, all: allCandidates };
    }

    /**
     * Compute the YIN difference function
     *
     * For each lag τ, computes: d(τ) = Σ (x[i] - x[i+τ])²
     *
     * This measures how well the signal correlates with itself at each lag.
     * A low value indicates the signal repeats with that period.
     */
    private computeDifferenceFunction(signal: Float32Array, maxLag: number): Float32Array {
        const length = signal.length;
        const difference = new Float32Array(maxLag + 1);

        // τ = 0 is always 0 (signal equals itself)
        difference[0] = 0;

        for (let tau = 1; tau <= maxLag; tau++) {
            let sum = 0;
            for (let i = 0; i < length - tau; i++) {
                const diff = signal[i] - signal[i + tau];
                sum += diff * diff;
            }
            difference[tau] = sum;
        }

        return difference;
    }

    /**
     * Compute the Cumulative Mean Normalized Difference Function (CMNDF)
     *
     * Normalizes the difference function by dividing by the cumulative mean.
     * This makes the function more robust to amplitude variations.
     *
     * Formula: cmndf(τ) = d(τ) / (1/τ * Σ d(j) for j=1 to τ)
     */
    private computeCMNDF(difference: Float32Array, minLag: number, maxLag: number): Float32Array {
        const cmndf = new Float32Array(difference.length);

        // First value is 1 (undefined for τ=0, but we need it for interpolation)
        cmndf[0] = 1;

        let cumulativeSum = 0;

        for (let tau = 1; tau <= maxLag; tau++) {
            cumulativeSum += difference[tau];
            cmndf[tau] = (difference[tau] * tau) / cumulativeSum;
        }

        return cmndf;
    }

    /**
     * Parabolic interpolation to refine the lag estimate
     *
     * Fits a parabola to three points and finds the minimum.
     * This provides sub-sample accuracy for the pitch estimate.
     */
    private parabolicInterpolation(cmndf: Float32Array, peakIndex: number): number {
        if (peakIndex <= 0 || peakIndex >= cmndf.length - 1) {
            return peakIndex;
        }

        const y1 = cmndf[peakIndex - 1];
        const y2 = cmndf[peakIndex];
        const y3 = cmndf[peakIndex + 1];

        // Parabolic interpolation formula
        // The minimum of the parabola is at: x = peakIndex + adjustment
        const adjustment = (y3 - y1) / (2 * (2 * y2 - y1 - y3));

        // Clamp to valid range
        return Math.max(peakIndex - 1, Math.min(peakIndex + 1, peakIndex + adjustment));
    }

    /**
     * Get the probability for a given state based on frame candidates
     */
    private getFrameProbability(stateIndex: number, candidates: PitchCandidate[]): number {
        const numStates = this.states.length;
        const unvoicedIndex = numStates - 1;

        if (stateIndex === unvoicedIndex) {
            // Unvoiced probability is based on lack of good candidates
            if (candidates.length === 0) {
                return 1.0;
            }
            return 1 - candidates[0].probability;
        }

        // Find the candidate closest to this state's frequency
        const stateFrequency = this.states[stateIndex].frequency;
        let bestProbability = 0;

        for (const candidate of candidates) {
            const freqDiff = Math.abs(candidate.frequency - stateFrequency) / stateFrequency;
            if (freqDiff < 0.05) { // Within 5% of state frequency
                bestProbability = Math.max(bestProbability, candidate.probability);
            }
        }

        return bestProbability;
    }

    /**
     * Run Viterbi decoding to find the optimal pitch path
     *
     * The Viterbi algorithm finds the most likely sequence of states given
     * the observations (pitch candidates) and the transition model.
     */
    private viterbiDecode(frameCandidates: PitchCandidate[][]): number[] {
        const numFrames = frameCandidates.length;
        const numStates = this.states.length;
        const unvoicedIndex = numStates - 1;

        if (numFrames === 0) {
            return [];
        }

        // Initialize Viterbi trellis
        const trellis: ViterbiNode[][] = [];

        // First frame: use prior probabilities
        trellis[0] = [];
        for (let s = 0; s < numStates; s++) {
            const priorLogProb = this.priorLogProbability(s, frameCandidates[0]);
            trellis[0][s] = {
                logProbability: priorLogProb,
                previousState: -1,
            };
        }

        // Process remaining frames
        for (let frame = 1; frame < numFrames; frame++) {
            trellis[frame] = [];

            for (let s = 0; s < numStates; s++) {
                const observationLogProb = this.observationLogProbability(s, frameCandidates[frame]);

                // Find best previous state
                let bestPrevState = 0;
                let bestLogProb = -Infinity;

                for (let prevS = 0; prevS < numStates; prevS++) {
                    const transitionLogProb = this.transitionMatrix[prevS][s];
                    const pathLogProb = trellis[frame - 1][prevS].logProbability + transitionLogProb;

                    if (pathLogProb > bestLogProb) {
                        bestLogProb = pathLogProb;
                        bestPrevState = prevS;
                    }
                }

                trellis[frame][s] = {
                    logProbability: bestLogProb + observationLogProb,
                    previousState: bestPrevState,
                };
            }
        }

        // Backtrack to find optimal path
        const path: number[] = new Array(numFrames);

        // Find best final state
        let bestFinalState = 0;
        let bestFinalLogProb = trellis[numFrames - 1][0].logProbability;

        for (let s = 1; s < numStates; s++) {
            if (trellis[numFrames - 1][s].logProbability > bestFinalLogProb) {
                bestFinalLogProb = trellis[numFrames - 1][s].logProbability;
                bestFinalState = s;
            }
        }

        // Backtrack
        path[numFrames - 1] = bestFinalState;
        for (let frame = numFrames - 2; frame >= 0; frame--) {
            path[frame] = trellis[frame + 1][path[frame + 1]].previousState;
        }

        return path;
    }

    /**
     * Calculate prior log probability for the first frame
     */
    private priorLogProbability(stateIndex: number, candidates: PitchCandidate[]): number {
        const numStates = this.states.length;
        const unvoicedIndex = numStates - 1;

        // Base prior: slightly favor voiced states
        const voicedPrior = Math.log(0.7 / (numStates - 1));
        const unvoicedPrior = Math.log(0.3);

        if (stateIndex === unvoicedIndex) {
            return unvoicedPrior + this.observationLogProbability(stateIndex, candidates);
        }

        return voicedPrior + this.observationLogProbability(stateIndex, candidates);
    }

    /**
     * Calculate observation log probability for a state given candidates
     */
    private observationLogProbability(stateIndex: number, candidates: PitchCandidate[]): number {
        const numStates = this.states.length;
        const unvoicedIndex = numStates - 1;

        if (stateIndex === unvoicedIndex) {
            // Unvoiced observation probability
            if (candidates.length === 0) {
                return Math.log(0.9); // High probability if no candidates
            }
            const bestProb = candidates[0].probability;
            return Math.log(1 - bestProb * 0.8); // Lower probability if good candidates exist
        }

        // Voiced observation probability
        const stateFrequency = this.states[stateIndex].frequency;
        let bestMatch = 0;

        for (const candidate of candidates) {
            const freqRatio = candidate.frequency / stateFrequency;
            const exactDiff = Math.abs(freqRatio - 1);

            // Check for exact match (within 5%)
            if (exactDiff < 0.05) {
                // Apply distance-based scaling: closer matches get higher probability
                // This gives a slight edge to states that are closer to the candidate
                const distanceScale = 1 - (exactDiff / 0.05) * 0.2; // 0.8 to 1.0 scaling
                const scaledProb = candidate.probability * distanceScale;

                if (scaledProb > bestMatch) {
                    bestMatch = scaledProb;
                }
            }

            // Check for octave matches only if no exact match found
            if (bestMatch === 0) {
                const octaveLowDiff = Math.abs(freqRatio - 0.5);  // Candidate is octave below state
                const octaveHighDiff = Math.abs(freqRatio - 2);   // Candidate is octave above state

                if (octaveLowDiff < 0.05 || octaveHighDiff < 0.05) {
                    // Apply octave penalty: reduce probability for octave matches
                    const penalizedProb = candidate.probability * 0.4;
                    if (penalizedProb > bestMatch) {
                        bestMatch = penalizedProb;
                    }
                }
            }
        }

        if (bestMatch === 0) {
            return Math.log(0.01); // Very low probability if no matching candidate
        }

        return Math.log(bestMatch);
    }
}
