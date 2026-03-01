/**
 * Audio analysis using Web Audio API with "Triple Tap" strategy
 *
 * Provides three audio analysis modes:
 * 1. Triple Tap Real-Time Analysis - Peak detection at playhead position
 * 2. Full Song Timeline Analysis - Configurable data points across entire track
 * 3. Beat Detection System - Ellis DP algorithm for rhythm game support
 */

import type { AudioProfile, AudioTimelineEvent, FrequencyBands } from '../types/AudioProfile.js';
import type { BeatMap, BeatMapGeneratorOptions, BeatStreamOptions, BeatInterpolationOptions, InterpolatedBeatMap } from '../types/BeatMap.js';
import { SpectrumScanner } from './SpectrumScanner.js';
import { BeatMapGenerator, type ProgressCallback } from './beat/BeatMapGenerator.js';
import { BeatStream } from './beat/BeatStream.js';
import { BeatInterpolator } from './beat/BeatInterpolator.js';

export type SamplingStrategy =
    | { type: 'interval'; intervalSeconds: number } // e.g., every 1s
    | { type: 'count'; count: number };             // e.g., exactly 100 points

export interface AudioAnalyzerOptions {
    /** Include advanced metrics (spectral_centroid, spectral_rolloff, zero_crossing_rate) */
    includeAdvancedMetrics?: boolean;

    /** Sample rate for analysis */
    sampleRate?: number;

    /** FFT size (must be power of 2) */
    fftSize?: number;

    /**
     * Treble boost multiplier (0.0-1.0+)
     * Reduces treble dominance to help balance class selection.
     * Default: 1
     * @default 1
     */
    trebleBoost?: number;

    /**
     * Bass boost multiplier (0.0-1.0+)
     * Increases bass dominance to help balance class selection.
     * Default: 1
     * @default 1
     */
    bassBoost?: number;

    /**
     * Mid boost multiplier (0.0-1.0+)
     * Increases mid dominance to help balance class selection.
     * Default: 1
     * @default 1
     */
    midBoost?: number;
}

/**
 * Audio analyzer using Web Audio API with Triple Tap sampling strategy
 *
 * Analyzes audio files using Fourier analysis to extract frequency band information
 * (bass, mid, treble dominance). For audio longer than 3 seconds, uses Triple Tap
 * sampling at 5%, 40%, and 70% positions to provide representative analysis.
 */
export class AudioAnalyzer {
    private options: AudioAnalyzerOptions;

    /**
     * Initialize AudioAnalyzer with configuration options
     *
     * @param {AudioAnalyzerOptions} [options] - Configuration options
     * @param {boolean} [options.includeAdvancedMetrics=false] - Include spectral analysis metrics
     * @param {number} [options.sampleRate=44100] - Sample rate in Hz
     * @param {number} [options.fftSize=2048] - FFT size for frequency analysis (must be power of 2)
     * @param {number} [options.trebleBoost=1] - Treble boost multiplier (0.0-1.0+)
     * @param {number} [options.bassBoost=1] - Bass boost multiplier (0.0-1.0+)
     * @param {number} [options.midBoost=1] - Mid boost multiplier (0.0-1.0+)
     *
     * @example
     * const analyzer = new AudioAnalyzer({
     *   includeAdvancedMetrics: true,
     *   sampleRate: 48000,
     *   trebleBoost: 0.6,
     *   bassBoost: 1.3
     * });
     */
    constructor(options: AudioAnalyzerOptions = {}) {
        this.options = {
            includeAdvancedMetrics: false,
            sampleRate: 44100,
            fftSize: 2048,
            trebleBoost: 1,
            bassBoost: 1,
            midBoost: 1,
            ...options,
        };
    }

    /**
     * Extract sonic fingerprint from audio URL
     * Uses "Triple Tap" strategy: analyze at 5%, 40%, and 70% positions
     */
    async extractSonicFingerprint(audioUrl: string): Promise<AudioProfile> {
        const audioBuffer = await this.fetchAndDecode(audioUrl);
        const duration = audioBuffer.duration;

        // Determine if we should analyze the full buffer (< 3 seconds)
        const fullBufferAnalyzed = duration < 3;

        let samplePositions: number[];
        if (fullBufferAnalyzed) {
            // Analyze entire buffer
            samplePositions = [0];
        } else {
            // Triple Tap: 5%, 40%, 70%
            samplePositions = [0.05, 0.40, 0.70];
        }

        // Analyze each sample position
        const frequencyDataSamples: FrequencyBands[] = [];

        for (const position of samplePositions) {
            const frequencyData = await this.analyzeAtPosition(
                audioBuffer,
                position,
                fullBufferAnalyzed
            );
            frequencyDataSamples.push(frequencyData);
        }

        // Average the frequency data across all samples
        const averagedBands = this.averageFrequencyBands(frequencyDataSamples);

        // Calculate dominance metrics using SpectrumScanner
        // Pass bandwidth values for normalization to prevent wider bands from dominating
        // Bandwidth values based on rebalanced frequency bands:
        // - Bass: 20-400Hz = 380 Hz range
        // - Mid: 400-4000Hz = 3600 Hz range
        // - Treble: 4000-14000Hz = 10000 Hz range
        let bassDominance = SpectrumScanner.calculateDominance(averagedBands.bass, 380);
        let midDominance = SpectrumScanner.calculateDominance(averagedBands.mid, 3600);
        let trebleDominance = SpectrumScanner.calculateDominance(averagedBands.treble, 10000);

        // Apply frequency attenuation/boost to help balance class selection
        // Treble is attenuated (reduced) while bass and mid are boosted to counteract
        // the natural treble dominance in modern music production and analysis
        bassDominance = bassDominance * this.options.bassBoost!;
        midDominance = midDominance * this.options.midBoost!;
        trebleDominance = trebleDominance * this.options.trebleBoost!;

        // Normalize so values sum to 1.0 (relative percentages)
        const total = bassDominance + midDominance + trebleDominance;
        bassDominance = bassDominance / (total || 1);
        midDominance = midDominance / (total || 1);
        trebleDominance = trebleDominance / (total || 1);

        // Calculate average amplitude
        const averageAmplitude = this.calculateAverageAmplitude(audioBuffer);
        const rmsEnergy = this.calculateRMS(audioBuffer);
        const peakAmplitude = this.calculatePeak(audioBuffer);
        const dynamicRange = peakAmplitude - rmsEnergy;

        // Build audio profile
        const profile: AudioProfile = {
            bass_dominance: bassDominance,
            mid_dominance: midDominance,
            treble_dominance: trebleDominance,
            average_amplitude: averageAmplitude,
            analysis_metadata: {
                duration_analyzed: fullBufferAnalyzed ? duration : duration * samplePositions.length * 0.01,
                full_buffer_analyzed: fullBufferAnalyzed,
                sample_positions: samplePositions,
                analyzed_at: new Date().toISOString(),
            },
            rms_energy: rmsEnergy,
            dynamic_range: dynamicRange,
        };

        // Add advanced metrics if requested
        if (this.options.includeAdvancedMetrics) {
            const allFrequencies = [
                ...averagedBands.bass,
                ...averagedBands.mid,
                ...averagedBands.treble,
            ];

            profile.spectral_centroid = this.calculateSpectralCentroid(allFrequencies);
            profile.spectral_rolloff = this.calculateSpectralRolloff(allFrequencies);
            profile.zero_crossing_rate = this.calculateZeroCrossingRate(audioBuffer);
        }

        return profile;
    }

    /**
     * Perform detailed timeline analysis of the entire song
     *
     * @param audioUrl URL of the audio file to analyze
     * @param strategy strategy for sampling (interval-based or count-based)
     */
    async analyzeTimeline(audioUrl: string, strategy: SamplingStrategy): Promise<AudioTimelineEvent[]> {
        const audioBuffer = await this.fetchAndDecode(audioUrl);
        const duration = audioBuffer.duration;
        const sampleRate = audioBuffer.sampleRate;

        const timeline: AudioTimelineEvent[] = [];
        let samplePoints: number[] = [];

        if (strategy.type === 'interval') {
            const interval = strategy.intervalSeconds;
            for (let t = 0; t < duration; t += interval) {
                samplePoints.push(t);
            }
        } else {
            const count = strategy.count;
            const interval = duration / count;
            for (let i = 0; i < count; i++) {
                samplePoints.push(i * interval);
            }
        }

        for (const startTime of samplePoints) {
            // Determine segment length (cap at 1 second or duration remaining)
            const remaining = duration - startTime;
            const segmentDuration = Math.min(1.0, remaining);

            if (segmentDuration <= 0) break;

            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor((startTime + segmentDuration) * sampleRate);

            // Extract frequency data
            const audioData = this.extractAudioSegment(audioBuffer, startSample, endSample);
            const fftBins = this.performFFT(audioData, this.options.fftSize!);

            const frequencyData = new Uint8Array(fftBins.length);
            for (let i = 0; i < fftBins.length; i++) {
                frequencyData[i] = Math.min(255, Math.round(fftBins[i]));
            }

            const bands = SpectrumScanner.separateFrequencyBands(frequencyData, sampleRate);

            // Calculate dominance using per-bin average (no bandwidth normalization).
            // FFT bins are evenly spaced in Hz, so per-bin average already accounts for
            // different band widths. Dividing by bandwidth would double-normalize and
            // massively inflate bass (smallest bandwidth → largest value).
            const bassDom = SpectrumScanner.calculateDominance(bands.bass) * this.options.bassBoost!;
            const midDom = SpectrumScanner.calculateDominance(bands.mid) * this.options.midBoost!;
            const trebleDom = SpectrumScanner.calculateDominance(bands.treble) * this.options.trebleBoost!;
            const total = (bassDom + midDom + trebleDom) || 1;

            // Calculate amplitude metrics for this segment
            const rms = this.calculateRMS(audioBuffer, startSample, endSample);
            const peak = this.calculatePeak(audioBuffer, startSample, endSample);

            const allFrequencies = [
                ...bands.bass,
                ...bands.mid,
                ...bands.treble,
            ];

            timeline.push({
                timestamp: startTime,
                duration: segmentDuration,
                bass: bassDom / total,
                mid: midDom / total,
                treble: trebleDom / total,
                amplitude: rms,
                rms_energy: rms,
                peak: peak,
                dynamic_range: peak - rms,
                spectral_centroid: this.calculateSpectralCentroid(allFrequencies),
                spectral_rolloff: this.calculateSpectralRolloff(allFrequencies),
                zero_crossing_rate: this.calculateZeroCrossingRate(audioBuffer, startSample, endSample),
            });
        }

        return timeline;
    }

    // ==================== Beat Detection System ====================

    /**
     * Generate a beat map from an audio URL
     *
     * Uses the Ellis Dynamic Programming beat tracking algorithm to detect
     * beats and downbeats throughout the entire audio track.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param audioId - Unique identifier for the audio source
     * @param options - Beat map generation options (optional)
     * @param onProgress - Optional progress callback for long-running analysis
     * @returns Promise resolving to the generated beat map
     *
     * @example
     * ```typescript
     * const analyzer = new AudioAnalyzer();
     * const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001', {
     *   minBpm: 60,
     *   maxBpm: 180,
     *   dpAlpha: 680,
     * });
     * console.log(`Detected ${beatMap.beats.length} beats at ${beatMap.bpm} BPM`);
     * ```
     */
    async generateBeatMap(
        audioUrl: string,
        audioId: string,
        options?: BeatMapGeneratorOptions,
        onProgress?: ProgressCallback
    ): Promise<BeatMap> {
        const generator = new BeatMapGenerator(options);
        return generator.generateBeatMap(audioUrl, audioId, onProgress);
    }

    /**
     * Generate a beat map from an AudioBuffer
     *
     * Use this method when you already have the audio decoded.
     *
     * @param audioBuffer - Decoded audio buffer
     * @param audioId - Unique identifier for the audio source
     * @param options - Beat map generation options (optional)
     * @param onProgress - Optional progress callback for long-running analysis
     * @returns Promise resolving to the generated beat map
     *
     * @example
     * ```typescript
     * const audioBuffer = await analyzer.fetchAndDecodeAudio('song.mp3');
     * const beatMap = await analyzer.generateBeatMapFromBuffer(audioBuffer, 'track-001');
     * ```
     */
    async generateBeatMapFromBuffer(
        audioBuffer: AudioBuffer,
        audioId: string,
        options?: BeatMapGeneratorOptions,
        onProgress?: ProgressCallback
    ): Promise<BeatMap> {
        const generator = new BeatMapGenerator(options);
        return generator.generateBeatMapFromBuffer(audioBuffer, audioId, onProgress);
    }

    /**
     * Create a BeatStream for real-time beat event streaming
     *
     * The BeatStream emits beat events synchronized with audio playback,
     * with configurable anticipation time for pre-rendering.
     *
     * @param beatMap - The beat map containing beat data
     * @param audioContext - The Web Audio API AudioContext for timing
     * @param options - Stream options (anticipation time, latency compensation, etc.)
     * @returns BeatStream instance for subscribing to beat events
     *
     * @example
     * ```typescript
     * const beatStream = analyzer.createBeatStream(beatMap, audioContext, {
     *   anticipationTime: 2.0,  // 2 seconds for animation pre-rendering
     *   compensateOutputLatency: true,
     * });
     *
     * const unsubscribe = beatStream.subscribe((event) => {
     *   if (event.type === 'upcoming') {
     *     // Pre-render beat visual
     *   } else if (event.type === 'exact') {
     *     // Beat is happening now
     *   }
     * });
     *
     * beatStream.start();
     * ```
     */
    createBeatStream(
        beatMap: BeatMap,
        audioContext: AudioContext,
        options?: BeatStreamOptions
    ): BeatStream {
        return new BeatStream(beatMap, audioContext, options);
    }

    // ==================== Beat Interpolation ====================

    /**
     * Interpolate a beat map to fill gaps in detected beats
     *
     * This is a post-processing pass that runs AFTER BeatMap generation to fill
     * gaps where detected beats are missing. Uses the Adaptive Phase-Locked Grid
     * algorithm with dense section priority to determine the quarter note interval,
     * then generates interpolated beats with tempo drift handling.
     *
     * @param beatMap - The beat map to interpolate
     * @param options - Interpolation options (optional)
     * @returns Interpolated beat map with two output streams
     *
     * @example
     * ```typescript
     * const analyzer = new AudioAnalyzer();
     * const beatMap = await analyzer.generateBeatMap('song.mp3', 'track-001');
     *
     * // Interpolate with default options
     * const interpolated = analyzer.interpolateBeatMap(beatMap);
     *
     * // Access original detected beats
     * console.log(`Detected: ${interpolated.detectedBeats.length} beats`);
     *
     * // Access merged beats (interpolated + detected)
     * console.log(`Total: ${interpolated.mergedBeats.length} beats`);
     * ```
     */
    interpolateBeatMap(
        beatMap: BeatMap,
        options?: BeatInterpolationOptions
    ): InterpolatedBeatMap {
        const interpolator = new BeatInterpolator(options);
        return interpolator.interpolate(beatMap);
    }

    /**
     * Generate a beat map with interpolation in a single step
     *
     * Convenience method that combines beat map generation and interpolation.
     * This is useful when you always want interpolated beats and don't need
     * the intermediate BeatMap.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @param audioId - Unique identifier for the audio source
     * @param beatMapOptions - Beat map generation options (optional)
     * @param interpolationOptions - Interpolation options (optional)
     * @param onProgress - Optional progress callback for long-running analysis
     * @returns Promise resolving to the interpolated beat map
     *
     * @example
     * ```typescript
     * const analyzer = new AudioAnalyzer();
     *
     * // Generate with interpolation in one step
     * const interpolated = await analyzer.generateBeatMapWithInterpolation(
     *   'song.mp3',
     *   'track-001',
     *   { minBpm: 60, maxBpm: 180 }  // BeatMap options
     * );
     *
     * console.log(`Total beats: ${interpolated.mergedBeats.length}`);
     * console.log(`Quarter note: ${interpolated.quarterNoteBpm} BPM`);
     * ```
     */
    async generateBeatMapWithInterpolation(
        audioUrl: string,
        audioId: string,
        beatMapOptions?: BeatMapGeneratorOptions,
        interpolationOptions?: BeatInterpolationOptions,
        onProgress?: ProgressCallback
    ): Promise<InterpolatedBeatMap> {
        // Generate the beat map first
        const beatMap = await this.generateBeatMap(audioUrl, audioId, beatMapOptions, onProgress);

        // Then interpolate
        return this.interpolateBeatMap(beatMap, interpolationOptions);
    }

    /**
     * Generate a beat map with interpolation from an AudioBuffer in a single step
     *
     * Use this method when you already have the audio decoded and want
     * interpolated beats in a single call.
     *
     * @param audioBuffer - Decoded audio buffer
     * @param audioId - Unique identifier for the audio source
     * @param beatMapOptions - Beat map generation options (optional)
     * @param interpolationOptions - Interpolation options (optional)
     * @param onProgress - Optional progress callback for long-running analysis
     * @returns Promise resolving to the interpolated beat map
     *
     * @example
     * ```typescript
     * const analyzer = new AudioAnalyzer();
     * const audioBuffer = await analyzer.fetchAndDecodeAudio('song.mp3');
     *
     * const interpolated = await analyzer.generateBeatMapWithInterpolationFromBuffer(
     *   audioBuffer,
     *   'track-001'
     * );
     * ```
     */
    async generateBeatMapWithInterpolationFromBuffer(
        audioBuffer: AudioBuffer,
        audioId: string,
        beatMapOptions?: BeatMapGeneratorOptions,
        interpolationOptions?: BeatInterpolationOptions,
        onProgress?: ProgressCallback
    ): Promise<InterpolatedBeatMap> {
        // Generate the beat map first
        const beatMap = await this.generateBeatMapFromBuffer(audioBuffer, audioId, beatMapOptions, onProgress);

        // Then interpolate
        return this.interpolateBeatMap(beatMap, interpolationOptions);
    }

    /**
     * Serialize a beat map to JSON string
     *
     * @param beatMap - Beat map to serialize
     * @returns JSON string
     */
    static beatMapToJSON(beatMap: BeatMap): string {
        return BeatMapGenerator.toJSON(beatMap);
    }

    /**
     * Parse a beat map from JSON string
     *
     * @param jsonString - JSON string to parse
     * @returns Beat map
     */
    static beatMapFromJSON(jsonString: string): BeatMap {
        return BeatMapGenerator.fromJSON(jsonString);
    }

    /**
     * Save a beat map to a file (Node.js only)
     *
     * @param beatMap - Beat map to save
     * @param filePath - Path to save to
     */
    static async saveBeatMapToFile(beatMap: BeatMap, filePath: string): Promise<void> {
        return BeatMapGenerator.saveToFile(beatMap, filePath);
    }

    /**
     * Load a beat map from a file (Node.js only)
     *
     * @param filePath - Path to load from
     * @returns Beat map
     */
    static async loadBeatMapFromFile(filePath: string): Promise<BeatMap> {
        return BeatMapGenerator.loadFromFile(filePath);
    }

    /**
     * Shared logic to fetch and decode audio from a URL
     */
    private async fetchAndDecode(audioUrl: string): Promise<AudioBuffer> {
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = (globalThis as any).AudioContext || (window as any)?.AudioContext;

        if (!AudioContextClass) {
            throw new Error('AudioContext not available in this environment');
        }

        const audioContext = new AudioContextClass();
        return await new Promise<AudioBuffer>((resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
    }

    /**
     * Analyze audio at a specific position
     */
    private async analyzeAtPosition(
        audioBuffer: AudioBuffer,
        position: number,
        analyzeFullBuffer: boolean
    ): Promise<FrequencyBands> {
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        // Calculate start and end samples
        let startSample: number;
        let endSample: number;

        if (analyzeFullBuffer) {
            startSample = 0;
            endSample = audioBuffer.length;
        } else {
            // Analyze 1 second at the given position
            const positionInSeconds = duration * position;
            startSample = Math.floor(positionInSeconds * sampleRate);
            endSample = Math.min(startSample + sampleRate, audioBuffer.length);
        }

        // Extract audio data from the specified range and perform FFT analysis
        const audioData = this.extractAudioSegment(audioBuffer, startSample, endSample);
        const fftBins = this.performFFT(audioData, this.options.fftSize!);

        // Normalize FFT bins to 0-255 range for consistency with Web Audio API
        const frequencyData = new Uint8Array(fftBins.length);
        for (let i = 0; i < fftBins.length; i++) {
            frequencyData[i] = Math.min(255, Math.round(fftBins[i]));
        }

        // Separate into frequency bands using SpectrumScanner
        return SpectrumScanner.separateFrequencyBands(frequencyData, sampleRate);
    }

    /**
     * Extract audio segment from buffer
     *
     * Mixes all channels down to mono and extracts the specified sample range.
     * Made protected to allow beat detection classes to access audio data.
     */
    protected extractAudioSegment(
        audioBuffer: AudioBuffer,
        startSample: number,
        endSample: number
    ): Float32Array {
        const length = endSample - startSample;
        const audioData = new Float32Array(length);

        // Mix down all channels to mono for analysis
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                audioData[i] += channelData[startSample + i] / audioBuffer.numberOfChannels;
            }
        }

        return audioData;
    }

    /**
     * Simple FFT implementation for frequency analysis
     * Uses Cooley-Tukey algorithm
     *
     * Made protected to allow beat detection classes to access FFT functionality.
     */
    protected performFFT(signal: Float32Array, fftSize: number): number[] {
        // Pad signal to nearest power of 2
        const paddedSize = Math.pow(2, Math.ceil(Math.log2(Math.min(signal.length, fftSize))));
        const real = new Float32Array(paddedSize);
        const imag = new Float32Array(paddedSize);

        // Apply Hann window and copy signal
        for (let i = 0; i < Math.min(signal.length, paddedSize); i++) {
            const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (paddedSize - 1));
            real[i] = signal[i] * window;
        }

        // Perform FFT
        this.fft(real, imag);

        // Calculate magnitude spectrum
        const magnitude = new Array(paddedSize / 2);
        for (let i = 0; i < magnitude.length; i++) {
            const re = real[i];
            const im = imag[i];
            magnitude[i] = Math.sqrt(re * re + im * im);
        }

        // Normalize and scale to logarithmic scale for better visualization
        const maxMagnitude = Math.max(...magnitude);
        const normalized = magnitude.map(m => {
            const normalized = m / (maxMagnitude || 1);
            // Use logarithmic scale (20 * log10(x))
            return 20 * Math.log10(Math.max(normalized, 0.001));
        });

        return normalized;
    }

    /**
     * Cooley-Tukey FFT algorithm
     */
    private fft(real: Float32Array, imag: Float32Array): void {
        const n = real.length;

        if (n <= 1) return;

        // Bit reversal
        let j = 0;
        for (let i = 0; i < n - 1; i++) {
            if (i < j) {
                [real[i], real[j]] = [real[j], real[i]];
                [imag[i], imag[j]] = [imag[j], imag[i]];
            }

            let k = n / 2;
            while (j >= k) {
                j -= k;
                k /= 2;
            }
            j += k;
        }

        // FFT computation
        let length = 2;
        while (length <= n) {
            const angle = (-2 * Math.PI) / length;
            const wReal = Math.cos(angle);
            const wImag = Math.sin(angle);

            for (let i = 0; i < n; i += length) {
                let uReal = 1;
                let uImag = 0;

                for (let j = 0; j < length / 2; j++) {
                    const t1 = i + j;
                    const t2 = i + j + length / 2;

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
    }

    /**
     * Average frequency bands across multiple samples
     */
    private averageFrequencyBands(samples: FrequencyBands[]): FrequencyBands {
        if (samples.length === 0) {
            return { bass: [], mid: [], treble: [] };
        }

        if (samples.length === 1) {
            return samples[0];
        }

        // Average each band
        const maxLength = Math.max(
            ...samples.map(s => Math.max(s.bass.length, s.mid.length, s.treble.length))
        );

        const bass: number[] = [];
        const mid: number[] = [];
        const treble: number[] = [];

        for (let i = 0; i < maxLength; i++) {
            const bassValues = samples.map(s => s.bass[i] || 0);
            const midValues = samples.map(s => s.mid[i] || 0);
            const trebleValues = samples.map(s => s.treble[i] || 0);

            bass.push(bassValues.reduce((a, b) => a + b, 0) / bassValues.length);
            mid.push(midValues.reduce((a, b) => a + b, 0) / midValues.length);
            treble.push(trebleValues.reduce((a, b) => a + b, 0) / trebleValues.length);
        }

        return { bass, mid, treble };
    }

    /**
     * Calculate average amplitude across all channels
     */
    private calculateAverageAmplitude(audioBuffer: AudioBuffer): number {
        let sum = 0;
        let count = 0;

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                sum += Math.abs(data[i]);
                count++;
            }
        }

        return count > 0 ? sum / count : 0;
    }

    /**
     * Calculate RMS (Root Mean Square) energy - more representative of perceived loudness
     */
    private calculateRMS(audioBuffer: AudioBuffer, startSample: number = 0, endSample: number = audioBuffer.length): number {
        let squareSum = 0;
        let count = 0;

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            const end = Math.min(endSample, data.length);
            for (let i = startSample; i < end; i++) {
                squareSum += data[i] * data[i];
                count++;
            }
        }

        return count > 0 ? Math.sqrt(squareSum / count) : 0;
    }

    /**
     * Calculate Peak amplitude
     */
    private calculatePeak(audioBuffer: AudioBuffer, startSample: number = 0, endSample: number = audioBuffer.length): number {
        let max = 0;

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            const end = Math.min(endSample, data.length);
            for (let i = startSample; i < end; i++) {
                const val = Math.abs(data[i]);
                if (val > max) max = val;
            }
        }

        return max;
    }

    /**
     * Calculate spectral centroid (brightness)
     */
    private calculateSpectralCentroid(frequencies: number[]): number {
        let weightedSum = 0;
        let sum = 0;

        for (let i = 0; i < frequencies.length; i++) {
            weightedSum += i * frequencies[i];
            sum += frequencies[i];
        }

        return sum > 0 ? weightedSum / sum : 0;
    }

    /**
     * Calculate spectral rolloff (frequency below which 85% of energy is contained)
     */
    private calculateSpectralRolloff(frequencies: number[]): number {
        const totalEnergy = frequencies.reduce((a, b) => a + b, 0);
        const threshold = totalEnergy * 0.85;

        let cumulativeEnergy = 0;
        for (let i = 0; i < frequencies.length; i++) {
            cumulativeEnergy += frequencies[i];
            if (cumulativeEnergy >= threshold) {
                return i / frequencies.length;
            }
        }

        return 1.0;
    }

    /**
     * Calculate zero crossing rate (measure of noisiness/percussiveness)
     */
    private calculateZeroCrossingRate(audioBuffer: AudioBuffer, startSample: number = 0, endSample: number = audioBuffer.length): number {
        let crossings = 0;
        let totalSamples = 0;

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            const end = Math.min(endSample, data.length);
            const start = Math.max(0, startSample);

            for (let i = Math.max(1, start + 1); i < end; i++) {
                if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) {
                    crossings++;
                }
                totalSamples++;
            }
        }

        return totalSamples > 0 ? crossings / totalSamples : 0;
    }
}
