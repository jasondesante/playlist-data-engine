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
    DownbeatConfig,
    DownbeatSegment,
} from '../../types/BeatMap.js';
import {
    DEFAULT_BEATMAP_GENERATOR_OPTIONS,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    getHopSizeMs,
    getMelBands,
    getGaussianSmoothMs,
    DEFAULT_DOWNBEAT_CONFIG,
    validateDownbeatConfig,
    validateDownbeatConfigAgainstBeats,
} from '../../types/BeatMap.js';
import { OnsetStrengthEnvelope, type OSEResult } from './OnsetStrengthEnvelope.js';
import { TempoDetector } from './TempoDetector.js';
import { BeatTracker } from './BeatTracker.js';
import { Logger } from '../../../utils/logger.js';

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
 * ## Parameter Modes
 *
 * OSE parameters can be configured using either mode-based configs or direct numeric values.
 * When both are provided, mode-based configs take precedence over numeric values.
 *
 * ### Tier 1: Primary Controls
 * - `hopSizeMode` - Controls beat detection precision (efficient/standard/hq/custom)
 * - `hopSizeMs` - Direct hop size in milliseconds (backward compatible)
 *
 * ### Tier 2: Advanced Controls
 * - `melBandsMode` - Controls frequency resolution (standard/detailed/maximum)
 * - `gaussianSmoothMode` - Controls onset envelope smoothing (minimal/standard/smooth)
 *
 * @example
 * ```typescript
 * // Using mode-based configuration (recommended)
 * const generator = new BeatMapGenerator({
 *   hopSizeMode: { mode: 'standard' },      // 4ms (Ellis 2007 paper spec)
 *   melBandsMode: { mode: 'detailed' },     // 64 bands
 *   gaussianSmoothMode: { mode: 'smooth' }  // 40ms
 * });
 *
 * // Using direct numeric values (backward compatible)
 * const generator = new BeatMapGenerator({
 *   hopSizeMs: 4,
 *   melBands: 40,
 *   gaussianSmoothMs: 20,
 *   minBpm: 90,
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
const logger = Logger.for('BeatMapGenerator');

export class BeatMapGenerator {
    private options: Required<BeatMapGeneratorOptions>;
    private state: GenerationState | null = null;

    /**
     * Create a new BeatMapGenerator
     *
     * @param options - Configuration options (all optional, defaults provided)
     */
    constructor(options: BeatMapGeneratorOptions = {}) {
        // Start with defaults
        const mergedOptions = { ...DEFAULT_BEATMAP_GENERATOR_OPTIONS, ...options };

        // Track which mode configs were explicitly provided
        // Only pass mode configs to OSE if they were explicitly set by the caller
        const explicitHopSizeMode = options.hopSizeMode;
        const explicitMelBandsMode = options.melBandsMode;
        const explicitGaussianSmoothMode = options.gaussianSmoothMode;

        // Resolve mode configs to numeric values
        // Mode takes precedence over direct values when both are provided
        const hopSizeMs = explicitHopSizeMode
            ? getHopSizeMs(explicitHopSizeMode)
            : options.hopSizeMs ?? DEFAULT_BEATMAP_GENERATOR_OPTIONS.hopSizeMs;

        const melBands = explicitMelBandsMode
            ? getMelBands(explicitMelBandsMode)
            : options.melBands ?? DEFAULT_BEATMAP_GENERATOR_OPTIONS.melBands;

        const gaussianSmoothMs = explicitGaussianSmoothMode
            ? getGaussianSmoothMs(explicitGaussianSmoothMode)
            : options.gaussianSmoothMs ?? DEFAULT_BEATMAP_GENERATOR_OPTIONS.gaussianSmoothMs;

        this.options = {
            ...mergedOptions,
            hopSizeMs,
            melBands,
            gaussianSmoothMs,
            // Only keep mode configs if they were explicitly provided
            // This prevents default mode configs from overriding resolved numeric values
            ...(explicitHopSizeMode ? { hopSizeMode: explicitHopSizeMode } : {}),
            ...(explicitMelBandsMode ? { melBandsMode: explicitMelBandsMode } : {}),
            ...(explicitGaussianSmoothMode ? { gaussianSmoothMode: explicitGaussianSmoothMode } : {}),
        };
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
     * IMPORTANT: The typical workflow is to generate FIRST with default config,
     * examine the beat map to identify the correct downbeat, then use
     * reapplyDownbeatConfig() to set it. You usually don't know the correct
     * downbeat until after seeing the generated beat map.
     *
     * @param audioUrl - URL of the audio file
     * @param audioId - Unique identifier for the audio source
     * @param downbeatConfig - Optional manual downbeat configuration (defaults to beat 0 = downbeat, 4/4 time)
     *                          If provided, will be stored in the resulting BeatMap
     * @param onProgress - Optional progress callback
     * @returns Generated beat map
     */
    async generateBeatMap(
        audioUrl: string,
        audioId: string,
        downbeatConfig?: DownbeatConfig,
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
            return await this.generateBeatMapFromBuffer(audioBuffer, audioId, downbeatConfig, onProgress);
        } finally {
            this.state = null;
        }
    }

    /**
     * Generate a beat map from an AudioBuffer
     *
     * IMPORTANT: The typical workflow is to generate FIRST with default config,
     * examine the beat map to identify the correct downbeat, then use
     * reapplyDownbeatConfig() to set it. You usually don't know the correct
     * downbeat until after seeing the generated beat map.
     *
     * @param audioBuffer - Decoded audio buffer
     * @param audioId - Unique identifier for the audio source
     * @param downbeatConfig - Optional manual downbeat configuration (defaults to beat 0 = downbeat, 4/4 time)
     *                          If provided, will be stored in the resulting BeatMap
     * @param onProgress - Optional progress callback
     * @returns Generated beat map
     */
    async generateBeatMapFromBuffer(
        audioBuffer: AudioBuffer,
        audioId: string,
        downbeatConfig?: DownbeatConfig,
        onProgress?: ProgressCallback
    ): Promise<BeatMap> {
        // Initialize state if not already
        if (!this.state) {
            this.state = {
                cancelled: false,
                progress: { phase: 'preprocessing', progress: 0, message: 'Starting...' },
            };
        }

        // Validate downbeatConfig structurally if provided
        if (downbeatConfig) {
            validateDownbeatConfig(downbeatConfig);
        }

        try {
            const duration = audioBuffer.duration;

            // Step 1: Preprocessing (5%)
            this.updateProgress('preprocessing', 5, 'Preparing audio...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 2: Calculate Onset Strength Envelope (30%)
            this.updateProgress('ose_calculation', 10, 'Calculating onset strength envelope...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Pass only resolved numeric values to OSE, not mode configs.
            // The numeric values have already been resolved from modes in the constructor.
            // Passing mode configs here would cause them to take precedence and re-resolve
            // to default values, ignoring the user's selected numeric values.
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
                useOctaveResolution: this.options.useOctaveResolution,
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
                sensitivity: this.options.sensitivity,
            });

            const trackingResult = beatTracker.trackBeats(
                oseResult.envelope,
                tempoEstimate,
                oseResult.hopSizeSeconds
            );
            this.updateProgress('beat_tracking', 85, `${trackingResult.beats.length} beats detected.`);
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 5: Apply Measure Labels (10%)
            // Uses manual downbeat configuration (default: beat 0 = downbeat, 4/4 time)
            this.updateProgress('measure_labeling', 87, 'Applying measure labels...');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Use provided config or default
            const configToUse = downbeatConfig ?? DEFAULT_DOWNBEAT_CONFIG;

            // Validate beat counts against config (must happen after beat tracking)
            if (downbeatConfig) {
                validateDownbeatConfigAgainstBeats(downbeatConfig, trackingResult.beats.length);
            }

            const beats = this.applyMeasureLabels(trackingResult.beats, configToUse);

            this.updateProgress('measure_labeling', 97, 'Measure labels applied.');
            if (this.state.cancelled) throw new Error('Generation cancelled');

            // Step 6: Finalize (3%)
            this.updateProgress('finalizing', 98, 'Finalizing beat map...');

            // Post-processing: filter beats by grid alignment if filter > 0
            let processedBeats = beats;
            const filter = this.options.filter;
            if (filter > 0) {
                processedBeats = this.filterBeatsByGridAlignment(processedBeats, tempoEstimate, filter);
            }

            // Apply noise floor threshold
            const beforeFilterCount = processedBeats.length;
            processedBeats = this.applyIntensityThreshold(processedBeats);
            logger.debug('BeatMapGenerator: Intensity filter applied', {
                beatsBefore: beforeFilterCount,
                beatsAfter: processedBeats.length,
                beatsFiltered: beforeFilterCount - processedBeats.length,
                noiseFloorThreshold: this.options.noiseFloorThreshold,
            });

            // Build metadata
            const metadata: BeatMapMetadata = {
                version: BEAT_DETECTION_VERSION,
                algorithm: BEAT_DETECTION_ALGORITHM,
                minBpm: this.options.minBpm,
                maxBpm: this.options.maxBpm,
                sensitivity: this.options.sensitivity,
                filter: this.options.filter,
                noiseFloorThreshold: this.options.noiseFloorThreshold,
                hopSizeMs: this.options.hopSizeMs,
                fftSize: this.options.fftSize,
                dpAlpha: this.options.dpAlpha,
                melBands: this.options.melBands,
                highPassCutoff: this.options.highPassCutoff,
                gaussianSmoothMs: this.options.gaussianSmoothMs,
                tempoCenter: this.options.tempoCenter,
                tempoWidth: this.options.tempoWidth,
                useOctaveResolution: this.options.useOctaveResolution ?? false,
                useTripleMeter: this.options.useTripleMeter ?? false,
                generatedAt: new Date().toISOString(),
            };

            const beatMap: BeatMap = {
                audioId,
                duration,
                beats: processedBeats,
                bpm: tempoEstimate.primaryBpm,
                metadata,
                // Only include downbeatConfig if it was explicitly provided
                // undefined means default was used
                ...(downbeatConfig ? { downbeatConfig } : {}),
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
     * Apply measure labels to beats based on downbeat configuration
     *
     * Calculates beatInMeasure, isDownbeat, and measureNumber for each beat
     * based on the provided downbeat configuration.
     *
     * IMPORTANT: Measure numbers CONTINUE across segment boundaries.
     * When time signature changes, measure number doesn't reset - it keeps
     * incrementing. Only the beatsPerMeasure changes.
     *
     * @param beats - Beats to label (with timestamps)
     * @param config - Downbeat configuration
     * @returns Beats with measure information populated
     */
    private applyMeasureLabels(
        beats: Beat[],
        config: DownbeatConfig
    ): Beat[] {
        // Pre-compute measure offsets for each segment to continue numbering across boundaries
        const measureOffsets = this.computeMeasureOffsets(config.segments, beats.length);

        return beats.map((beat, index) => {
            // Find the active segment for this beat
            const segmentIndex = this.findActiveSegmentIndex(config.segments, index);
            const segment = config.segments[segmentIndex];
            const { downbeatBeatIndex, timeSignature } = segment;
            const { beatsPerMeasure } = timeSignature;

            // Calculate position relative to the anchor downbeat
            // Using modulo arithmetic that works bidirectionally
            const distanceFromAnchor = index - downbeatBeatIndex;

            // Calculate position in measure (0 to beatsPerMeasure-1)
            // Handle negative distances correctly for pickup beats
            const beatInMeasure = ((distanceFromAnchor % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure;

            // This beat is a downbeat if it's at position 0 in the measure
            const isDownbeat = beatInMeasure === 0;

            // Calculate measure number within this segment
            // Measures before the anchor downbeat will have negative numbers,
            // but we floor to 0 for practical purposes
            const measureInSegment = Math.max(0, Math.floor(distanceFromAnchor / beatsPerMeasure));

            // Add the offset from previous segments to continue numbering
            const measureNumber = measureInSegment + measureOffsets[segmentIndex];

            return {
                ...beat,
                beatInMeasure,
                isDownbeat,
                measureNumber,
            };
        });
    }

    /**
     * Compute measure offsets for each segment to continue numbering across boundaries
     *
     * @param segments - Array of downbeat segments (must be ordered by startBeat)
     * @param totalBeats - Total number of beats
     * @returns Array of measure offsets for each segment
     */
    private computeMeasureOffsets(segments: DownbeatSegment[], totalBeats: number): number[] {
        const offsets: number[] = [];

        for (let i = 0; i < segments.length; i++) {
            if (i === 0) {
                offsets.push(0);
            } else {
                // Calculate what measure the previous segment ended at
                const prevSegment = segments[i - 1];
                const { downbeatBeatIndex: prevAnchor, timeSignature: prevTimeSig } = prevSegment;
                const prevBeatsPerMeasure = prevTimeSig.beatsPerMeasure;

                // The previous segment ends at the beat just before this segment starts
                const lastBeatOfPrevSegment = segments[i].startBeat - 1;

                // Calculate the measure number at the end of the previous segment
                const distanceFromAnchor = lastBeatOfPrevSegment - prevAnchor;
                const lastMeasureOfPrevSegment = Math.max(0, Math.floor(distanceFromAnchor / prevBeatsPerMeasure));

                // This segment starts at the next measure number
                offsets.push(lastMeasureOfPrevSegment + 1);
            }
        }

        return offsets;
    }

    /**
     * Find the index of the active segment for a given beat index
     * Segments are contiguous - each covers beats until the next segment starts
     *
     * @param segments - Array of downbeat segments (must be ordered by startBeat)
     * @param beatIndex - The beat index to find the active segment for
     * @returns The index of the active segment
     */
    private findActiveSegmentIndex(
        segments: DownbeatSegment[],
        beatIndex: number
    ): number {
        let activeIndex = 0;
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].startBeat <= beatIndex) {
                activeIndex = i;
            } else {
                break;
            }
        }
        return activeIndex;
    }

    /**
     * Filter beats by how well they align with the tempo grid.
     *
     * This post-processing step removes beats that deviate significantly from
     * the expected quarter-note grid based on the detected tempo.
     *
     * @param beats - Beats to filter
     * @param tempoEstimate - Tempo estimate with beat period
     * @param filterThreshold - Grid alignment threshold (0.0-1.0)
     * @returns Filtered beats
     */
    private filterBeatsByGridAlignment(
        beats: Beat[],
        tempoEstimate: TempoEstimate,
        filterThreshold: number
    ): Beat[] {
        if (filterThreshold <= 0) return beats;

        const beatPeriod = 60.0 / tempoEstimate.primaryBpm; // seconds per beat

        // Calculate max allowed deviation based on threshold
        // threshold 0.0 = allow any deviation
        // threshold 1.0 = allow 0 deviation (only exact grid)
        // threshold 0.5 = allow 50% of a half-beat deviation
        const maxDeviation = (1.0 - filterThreshold) * (beatPeriod / 2);

        const filtered = beats.filter(beat => {
            // Calculate how far this beat is from the nearest grid position
            const gridPosition = Math.round(beat.timestamp / beatPeriod);
            const expectedTime = gridPosition * beatPeriod;
            const deviation = Math.abs(beat.timestamp - expectedTime);

            return deviation <= maxDeviation;
        });

        logger.debug('Filtered beats by grid alignment', {
            originalCount: beats.length,
            filteredCount: filtered.length,
            threshold: filterThreshold,
            maxDeviationMs: maxDeviation * 1000,
        });

        return filtered;
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
                ...(beat.requiredKey !== undefined && { requiredKey: beat.requiredKey }),
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
                ...(beat.requiredKey !== undefined && { requiredKey: beat.requiredKey }),
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
