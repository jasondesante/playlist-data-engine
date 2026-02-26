/**
 * Beat Map Generator
 *
 * Orchestrates the beat detection pipeline to generate complete beat maps:
 * 1. Load/decode audio
 * 2. Calculate Onset Strength Envelope (OSE)
 * 3. Estimate Tempo
 * 4. Run DP Beat Tracker
 * 5. Detect Downbeats
 * 6. Assemble BeatMap
 *
 * Supports JSON serialization and file I/O for caching beat maps.
 */

import type {
    Beat,
    BeatMap,
    BeatMapMetadata,
    BeatMapGeneratorOptions,
    BeatMapJSON,
    BeatMapGenerationProgress,
    TempoEstimate,
} from '../../types/BeatMap.js';
import {
    DEFAULT_BEATMAP_GENERATOR_OPTIONS,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
} from '../../types/BeatMap.js';
import { OnsetStrengthEnvelope, type OSEResult } from './OnsetStrengthEnvelope.js';
import { TempoDetector } from './TempoDetector.js';
import { BeatTracker } from './BeatTracker.js';
import { DownbeatDetector } from './DownbeatDetector.js';

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: BeatMapGenerationProgress) => void;

/**
 * Internal state for generation
 */
interface GenerationState {
    cancelled: boolean;
    progress: BeatMapGenerationProgress;
}

/**
 * Beat Map Generator
 *
 * Generates complete beat maps from audio files using the Ellis DP algorithm.
 * Supports progress tracking, cancellation, and JSON serialization.
 *
 * @example
 * ```typescript
 * const generator = new BeatMapGenerator({
 *   minBpm: 60,
 *   maxBpm: 180,
 *   dpAlpha: 680,
 * });
 *
 * // Generate beat map from URL
 * const beatMap = await generator.generateBeatMap('song.mp3', 'track-001');
 *
 * // Or generate from AudioBuffer
 * const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'track-001');
 *
 * // Serialize to JSON
 * const json = BeatMapGenerator.toJSON(beatMap);
 *
 * // Load from JSON
 * const loadedBeatMap = BeatMapGenerator.fromJSON(json);
 * ```
 */
export class BeatMapGenerator {
    private options: Required<BeatMapGeneratorOptions>;
    private state: GenerationState | null = null;

    /**
     * Create a new BeatMapGenerator
     *
     * @param options - Configuration options (all optional, defaults provided)
     */
    constructor(options: BeatMapGeneratorOptions = {}) {
        this.options = { ...DEFAULT_BEATMAP_GENERATOR_OPTIONS, ...options };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<BeatMapGeneratorOptions> {
        return { ...this.options };
    }

    /**
     * Generate a beat map from an audio URL
     *
     * @param audioUrl - URL of the audio file
     * @param audioId - Unique identifier for the audio source
     * @param onProgress - Optional progress callback
     * @returns Generated beat map
     */
    async generateBeatMap(
        audioUrl: string,
        audioId: string,
        onProgress?: ProgressCallback
    ): Promise<BeatMap> {
        // Initialize state
        this.state = {
            cancelled: false,
            progress: { phase: 'loading', progress: 0, message: 'Loading audio...' },
        };

        try {
            // Step 1: Load and decode audio
            this.updateProgress('loading', 0, 'Loading audio...');
            const audioBuffer = await this.fetchAndDecode(audioUrl);

            if (this.state.cancelled) {
                throw new Error('Generation cancelled');
            }

            // Step 2: Generate beat map from buffer
            return await this.generateBeatMapFromBuffer(audioBuffer, audioId, onProgress);
        } finally {
            this.state = null;
        }
    }

    /**
     * Generate a beat map from an AudioBuffer
     *
     * @param audioBuffer - Decoded audio buffer
     * @param audioId - Unique identifier for the audio source
     * @param onProgress - Optional progress callback
     * @returns Generated beat map
     */
    async generateBeatMapFromBuffer(
        audioBuffer: AudioBuffer,
        audioId: string,
        onProgress?: ProgressCallback
    ): Promise<BeatMap> {
        // Initialize state if not already
        if (!this.state) {
            this.state = {
                cancelled: false,
                progress: { phase: 'preprocessing', progress: 0, message: 'Starting...' },
            };
        }

        try {
            const duration = audioBuffer.duration;

            // Step 1: Preprocessing (5%)
            this.updateProgress('preprocessing', 5, 'Preparing audio...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 2: Calculate Onset Strength Envelope (30%)
            this.updateProgress('ose_calculation', 10, 'Calculating onset strength envelope...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            const ose = new OnsetStrengthEnvelope({
                targetSampleRate: 8000,
                fftWindowSize: 32,
                hopSizeMs: this.options.hopSizeMs,
                melBands: this.options.melBands,
                highPassCutoff: this.options.highPassCutoff,
                gaussianSmoothMs: this.options.gaussianSmoothMs,
            });

            const oseResult = ose.calculate(audioBuffer);
            this.updateProgress('ose_calculation', 35, 'Onset strength envelope calculated.');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 3: Estimate Tempo (15%)
            this.updateProgress('tempo_estimation', 40, 'Estimating tempo...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            const tempoDetector = new TempoDetector({
                tempoCenter: this.options.tempoCenter,
                tempoWidth: this.options.tempoWidth,
                minBpm: this.options.minBpm,
                maxBpm: this.options.maxBpm,
            });

            const tempoEstimate = tempoDetector.estimateTempo(
                oseResult.envelope,
                oseResult.hopSizeSeconds
            );
            this.updateProgress('tempo_estimation', 55, `Tempo estimated: ${Math.round(tempoEstimate.primaryBpm)} BPM`);
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 4: Run DP Beat Tracker (25%)
            this.updateProgress('beat_tracking', 60, 'Tracking beats...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            const beatTracker = new BeatTracker({
                dpAlpha: this.options.dpAlpha,
            });

            const trackingResult = beatTracker.trackBeats(
                oseResult.envelope,
                tempoEstimate,
                oseResult.hopSizeSeconds
            );
            this.updateProgress('beat_tracking', 85, `${trackingResult.beats.length} beats detected.`);
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 5: Detect Downbeats (10%)
            this.updateProgress('downbeat_detection', 87, 'Detecting downbeats...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            const downbeatDetector = new DownbeatDetector();
            const downbeatResult = downbeatDetector.detectDownbeats(
                trackingResult.beats,
                tempoEstimate
            );
            this.updateProgress('downbeat_detection', 97, 'Downbeats detected.');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 6: Finalize (3%)
            this.updateProgress('finalizing', 98, 'Finalizing beat map...');

            const beats = this.applyIntensityThreshold(downbeatResult.beats);

            // Build metadata
            const metadata: BeatMapMetadata = {
                version: BEAT_DETECTION_VERSION,
                algorithm: BEAT_DETECTION_ALGORITHM,
                minBpm: this.options.minBpm,
                maxBpm: this.options.maxBpm,
                intensityThreshold: this.options.intensityThreshold,
                noiseFloorThreshold: this.options.noiseFloorThreshold,
                hopSizeMs: this.options.hopSizeMs,
                fftSize: this.options.fftSize,
                dpAlpha: this.options.dpAlpha,
                melBands: this.options.melBands,
                highPassCutoff: this.options.highPassCutoff,
                gaussianSmoothMs: this.options.gaussianSmoothMs,
                tempoCenter: this.options.tempoCenter,
                tempoWidth: this.options.tempoWidth,
                generatedAt: new Date().toISOString(),
            };

            const beatMap: BeatMap = {
                audioId,
                duration,
                beats,
                bpm: tempoEstimate.primaryBpm,
                metadata,
            };

            this.updateProgress('complete', 100, 'Beat map generation complete.');
            onProgress?.(this.state.progress);

            return beatMap;
        } finally {
            this.state = null;
        }
    }

    /**
     * Get the current generation progress
     *
     * @returns Current progress or null if no generation is active
     */
    getProgress(): BeatMapGenerationProgress | null {
        return this.state?.progress ?? null;
    }

    /**
     * Cancel the current generation
     */
    cancel(): void {
        if (this.state) {
            this.state.cancelled = true;
            this.state.progress = {
                phase: 'error',
                progress: this.state.progress.progress,
                message: 'Generation cancelled',
                error: 'Cancelled by user',
            };
        }
    }

    /**
     * Apply intensity threshold to filter weak beats
     *
     * @param beats - Beats to filter
     * @returns Filtered beats
     */
    private applyIntensityThreshold(beats: Beat[]): Beat[] {
        const threshold = this.options.noiseFloorThreshold;

        return beats.filter(beat => {
            // Keep beats that are above the noise floor
            return beat.intensity >= threshold;
        });
    }

    /**
     * Update progress state
     */
    private updateProgress(
        phase: BeatMapGenerationProgress['phase'],
        progress: number,
        message: string
    ): void {
        if (this.state) {
            this.state.progress = { phase, progress, message };
        }
    }

    /**
     * Fetch and decode audio from a URL
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

    // ==================== Static Methods ====================

    /**
     * Convert a BeatMap to JSON string
     *
     * @param beatMap - Beat map to serialize
     * @returns JSON string
     */
    static toJSON(beatMap: BeatMap): string {
        const json: BeatMapJSON = {
            audioId: beatMap.audioId,
            duration: beatMap.duration,
            beats: beatMap.beats.map(beat => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
            })),
            bpm: beatMap.bpm,
            metadata: beatMap.metadata,
        };

        return JSON.stringify(json, null, 2);
    }

    /**
     * Parse a BeatMap from JSON string
     *
     * @param jsonString - JSON string to parse
     * @returns Beat map
     */
    static fromJSON(jsonString: string): BeatMap {
        const json: BeatMapJSON = JSON.parse(jsonString);

        return {
            audioId: json.audioId,
            duration: json.duration,
            beats: json.beats.map(beat => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
            })),
            bpm: json.bpm,
            metadata: json.metadata,
        };
    }

    /**
     * Save a BeatMap to a file (Node.js only)
     *
     * @param beatMap - Beat map to save
     * @param filePath - Path to save to
     */
    static async saveToFile(beatMap: BeatMap, filePath: string): Promise<void> {
        // Check if we're in a Node.js environment
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('saveToFile is only available in Node.js environment');
        }

        // Dynamic import for Node.js fs/promises
        const { writeFile } = await import('fs/promises');
        const json = BeatMapGenerator.toJSON(beatMap);
        await writeFile(filePath, json, 'utf-8');
    }

    /**
     * Load a BeatMap from a file (Node.js only)
     *
     * @param filePath - Path to load from
     * @returns Beat map
     */
    static async loadFromFile(filePath: string): Promise<BeatMap> {
        // Check if we're in a Node.js environment
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('loadFromFile is only available in Node.js environment');
        }

        // Dynamic import for Node.js fs/promises
        const { readFile } = await import('fs/promises');
        const jsonString = await readFile(filePath, 'utf-8');
        return BeatMapGenerator.fromJSON(jsonString);
    }
}

// Also export instance method wrappers for convenience
export interface BeatMapGeneratorInstance {
    /** Instance method for toJSON - serializes a beat map */
    toJSON(beatMap: BeatMap): string;
    /** Instance method for fromJSON - parses a beat map */
    fromJSON(jsonString: string): BeatMap;
}
