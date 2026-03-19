/**
 * Rhythm Generator - Orchestrator for Procedural Rhythm Generation
 *
 * This is the main entry point for generating procedural rhythm patterns from audio.
 * It orchestrates all phases of the pipeline:
 *
 * Phase 1: Multi-band analysis, transient detection, quantization
 * Phase 2: Phrase analysis, density analysis
 * Phase 3: Stream scoring, composite generation, difficulty variants
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 3.4
 */

import { MultiBandAnalyzer, type MultiBandResult } from '../analysis/MultiBandAnalyzer.js';
import { TransientDetector, type TransientAnalysis } from '../analysis/beat/TransientDetector.js';
import {
    RhythmQuantizer,
    type QuantizationConfig,
    type QuantizedBandStreams,
    type GeneratedRhythmMap,
    type GridDecision,
} from '../analysis/beat/RhythmQuantizer.js';
import { PhraseAnalyzer, type PhraseAnalysisResult } from '../analysis/beat/PhraseAnalyzer.js';
import { DensityAnalyzer, type DensityAnalysisResult } from '../analysis/beat/DensityAnalyzer.js';
import { StreamScorer, type StreamScoringResult } from '../analysis/beat/StreamScorer.js';
import {
    CompositeStreamGenerator,
    type CompositeStream,
    type CompositeBeat,
} from '../analysis/beat/CompositeStreamGenerator.js';
import {
    DifficultyVariantGenerator,
    type DifficultyVariant,
    type DifficultyLevel,
} from '../analysis/beat/DifficultyVariantGenerator.js';
import type { UnifiedBeatMap, DifficultyPreset } from '../types/BeatMap.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Output mode for rhythm generation
 */
export type OutputMode = 'composite' | 'low' | 'mid' | 'high';

/**
 * Band identifier
 */
export type Band = 'low' | 'mid' | 'high';

/**
 * Phase identifier for caching
 */
export type CachePhase =
    | 'multiBand'
    | 'transients'
    | 'quantization'
    | 'phrases'
    | 'density'
    | 'scoring'
    | 'composite'
    | 'variants';

/**
 * Cached intermediate result
 */
interface CacheEntry<T> {
    /** The cached result */
    result: T;
    /** Timestamp when cached (ms) */
    timestamp: number;
    /** Cache key used */
    key: string;
}

/**
 * Configuration options for rhythm generation
 */
export interface RhythmGenerationOptions {
    /** Which difficulty preset to use for output (default: 'medium') */
    difficulty?: DifficultyPreset;

    /** Which stream to use as primary output (default: 'composite') */
    outputMode?: OutputMode;

    /** Offset in beats for "Beat 1" (downbeat alignment, default: 0) */
    measureStartOffset?: number;

    /** Filter weak transients (0.0 = catch all, default: 0.0) */
    minimumTransientIntensity?: number;

    /** Seed for reproducibility (optional) */
    seed?: string;

    /** Whether to log progress information (default: false) */
    verbose?: boolean;

    /** Whether to enable caching of intermediate results (default: true) */
    enableCache?: boolean;

    /** Maximum age of cache entries in milliseconds (default: 30 minutes) */
    cacheMaxAge?: number;
}

/**
 * Statistics about the cache
 */
export interface CacheStats {
    /** Number of entries currently cached */
    entryCount: number;
    /** Total size estimate in bytes (approximate) */
    estimatedSize: number;
    /** Phases that have cached results */
    cachedPhases: CachePhase[];
    /** Oldest entry timestamp (ms) */
    oldestEntry: number | null;
    /** Number of cache hits during this session */
    hits: number;
    /** Number of cache misses during this session */
    misses: number;
}

/**
 * Progress callback for long-running generation
 */
export type ProgressCallback = (phase: string, progress: number, message: string) => void;

/**
 * Complete result of rhythm generation
 */
export interface GeneratedRhythm {
    /** 3 difficulty variants of the composite stream */
    difficultyVariants: {
        easy: DifficultyVariant;
        medium: DifficultyVariant;
        hard: DifficultyVariant;
    };

    /** Individual band streams (for reference/advanced use) */
    bandStreams: {
        low: GeneratedRhythmMap;
        mid: GeneratedRhythmMap;
        high: GeneratedRhythmMap;
    };

    /** The composite stream (unedited baseline) */
    composite: CompositeStream;

    /** Analysis results */
    analysis: {
        transientAnalysis: TransientAnalysis;
        quantizationResult: QuantizedBandStreams;
        phraseAnalysis: PhraseAnalysisResult;
        densityAnalysis: DensityAnalysisResult;
        scoringResult: StreamScoringResult;
    };

    /** Metadata about the generation */
    metadata: RhythmMetadata;
}

/**
 * Metadata about rhythm generation
 */
export interface RhythmMetadata {
    /** Difficulty preset used for output */
    difficulty: DifficultyPreset;

    /** Bands that were analyzed */
    bandsAnalyzed: Band[];

    /** Total transients detected */
    transientsDetected: number;

    /** Transients filtered by intensity threshold */
    transientsFilteredByIntensity: number;

    /** Number of density validation retries */
    densityValidationRetries: number;

    /** Number of phrases detected */
    phrasesDetected: number;

    /** Average density across all bands */
    averageDensity: number;

    /** Natural difficulty of the composite */
    naturalDifficulty: DifficultyLevel;

    /** Configuration used for generation */
    generationConfig: ResolvedOptions;

    /** Duration of the audio in seconds */
    duration: number;

    /** Total beats in the unified beat map */
    totalBeats: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Internal type for resolved options (seed remains optional)
 */
type ResolvedOptions = {
    difficulty: DifficultyPreset;
    outputMode: OutputMode;
    measureStartOffset: number;
    minimumTransientIntensity: number;
    seed: string | undefined;
    verbose: boolean;
    enableCache: boolean;
    cacheMaxAge: number;
};

const DEFAULT_OPTIONS: ResolvedOptions = {
    difficulty: 'medium',
    outputMode: 'composite',
    measureStartOffset: 0,
    minimumTransientIntensity: 0.0,
    seed: undefined,
    verbose: false,
    enableCache: true,
    cacheMaxAge: 30 * 60 * 1000, // 30 minutes
};

// ============================================================================
// RhythmGenerator Class
// ============================================================================

/**
 * Main orchestrator for procedural rhythm generation.
 *
 * Takes an audio buffer and a beat map, then generates:
 * - 3 difficulty variants (easy/medium/hard)
 * - Individual band streams (low/mid/high)
 * - A composite stream combining the best sections from each band
 * - Rich analysis results and metadata
 *
 * ## Usage
 *
 * ```typescript
 * const generator = new RhythmGenerator({
 *   difficulty: 'medium',
 *   outputMode: 'composite',
 *   minimumTransientIntensity: 0.3,
 * });
 *
 * const result = await generator.generate(audioBuffer, unifiedBeatMap, (phase, progress, message) => {
 *   console.log(`[${phase}] ${Math.round(progress * 100)}%: ${message}`);
 * });
 *
 * // Access difficulty variants
 * const easyBeats = result.difficultyVariants.easy.beats;
 * const mediumBeats = result.difficultyVariants.medium.beats;
 * const hardBeats = result.difficultyVariants.hard.beats;
 *
 * // Access individual band streams
 * const lowBandBeats = result.bandStreams.low.beats;
 *
 * // Access analysis results
 * const phrases = result.analysis.phraseAnalysis.phrases;
 * const density = result.analysis.densityAnalysis.combinedMetrics;
 * ```
 */
export class RhythmGenerator {
    private options: ResolvedOptions;

    // Pipeline components
    private multiBandAnalyzer: MultiBandAnalyzer;
    private transientDetector: TransientDetector;
    private rhythmQuantizer: RhythmQuantizer;
    private phraseAnalyzer: PhraseAnalyzer;
    private densityAnalyzer: DensityAnalyzer;
    private streamScorer: StreamScorer;
    private compositeGenerator: CompositeStreamGenerator;
    private variantGenerator: DifficultyVariantGenerator;

    // Cache storage
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private cacheHits: number = 0;
    private cacheMisses: number = 0;

    /**
     * Create a new RhythmGenerator
     *
     * @param options - Configuration options (all optional, defaults provided)
     */
    constructor(options: RhythmGenerationOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };

        // Initialize pipeline components with appropriate configurations
        this.multiBandAnalyzer = new MultiBandAnalyzer();

        this.transientDetector = new TransientDetector();

        this.rhythmQuantizer = new RhythmQuantizer({
            minimumTransientIntensity: this.options.minimumTransientIntensity,
        });

        this.phraseAnalyzer = new PhraseAnalyzer();

        this.densityAnalyzer = new DensityAnalyzer();

        this.streamScorer = new StreamScorer();

        this.compositeGenerator = new CompositeStreamGenerator();

        this.variantGenerator = new DifficultyVariantGenerator();
    }

    // ================================================================
    // Cache Management Methods
    // ================================================================

    /**
     * Generate a cache key for a specific phase and inputs
     */
    private generateCacheKey(
        audioId: string,
        phase: CachePhase,
        configFingerprint: string
    ): string {
        return `${audioId}:${phase}:${configFingerprint}`;
    }

    /**
     * Create a config fingerprint for cache invalidation
     */
    private createConfigFingerprint(): string {
        // Include all options that affect the output
        const relevantConfig = {
            minimumTransientIntensity: this.options.minimumTransientIntensity,
            measureStartOffset: this.options.measureStartOffset,
        };
        return JSON.stringify(relevantConfig);
    }

    /**
     * Get a cached result if available and not expired
     */
    private getFromCache<T>(key: string): T | null {
        if (!this.options.enableCache) {
            return null;
        }

        const entry = this.cache.get(key) as CacheEntry<T> | undefined;
        if (!entry) {
            this.cacheMisses++;
            return null;
        }

        // Check if entry has expired
        const age = Date.now() - entry.timestamp;
        if (age > this.options.cacheMaxAge) {
            this.cache.delete(key);
            this.cacheMisses++;
            return null;
        }

        this.cacheHits++;
        if (this.options.verbose) {
            console.log(`[RhythmGenerator] Cache HIT for key: ${key}`);
        }
        return entry.result;
    }

    /**
     * Store a result in the cache
     */
    private setCache<T>(key: string, result: T): void {
        if (!this.options.enableCache) {
            return;
        }

        this.cache.set(key, {
            result,
            timestamp: Date.now(),
            key,
        });

        if (this.options.verbose) {
            console.log(`[RhythmGenerator] Cache SET for key: ${key}`);
        }
    }

    /**
     * Clear all cached results
     */
    clearCache(): void {
        this.cache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * Clear expired cache entries
     */
    pruneExpiredCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.options.cacheMaxAge) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats {
        let estimatedSize = 0;
        const cachedPhases: CachePhase[] = [];
        let oldestEntry: number | null = null;

        for (const [key, entry] of this.cache.entries()) {
            // Extract phase from key (format: audioId:phase:config)
            const phase = key.split(':')[1] as CachePhase;
            if (!cachedPhases.includes(phase)) {
                cachedPhases.push(phase);
            }

            // Rough size estimate (JSON stringification)
            try {
                estimatedSize += JSON.stringify(entry.result).length * 2; // UTF-16
            } catch {
                estimatedSize += 1000; // Default estimate for non-serializable
            }

            if (oldestEntry === null || entry.timestamp < oldestEntry) {
                oldestEntry = entry.timestamp;
            }
        }

        return {
            entryCount: this.cache.size,
            estimatedSize,
            cachedPhases,
            oldestEntry,
            hits: this.cacheHits,
            misses: this.cacheMisses,
        };
    }

    /**
     * Check if a phase result is cached for the given audio ID
     */
    isCached(audioId: string, phase: CachePhase): boolean {
        const configFingerprint = this.createConfigFingerprint();
        const key = this.generateCacheKey(audioId, phase, configFingerprint);
        return this.cache.has(key);
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getOptions(): ResolvedOptions {
        return { ...this.options };
    }

    /**
     * Generate rhythm patterns from audio and beat map
     *
     * This is the main entry point that orchestrates all phases of the pipeline.
     * Results are cached by audioId and configuration for efficient reuse.
     *
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @param unifiedBeatMap - Unified beat map from beat detection
     * @param signal - Optional AbortSignal for cancellation
     * @param onProgress - Optional progress callback
     * @returns Complete rhythm generation result
     * @throws {DOMException} If the operation is cancelled via signal
     */
    async generate(
        audioBuffer: AudioBuffer,
        unifiedBeatMap: UnifiedBeatMap,
        signal?: AbortSignal,
        onProgress?: ProgressCallback
    ): Promise<GeneratedRhythm> {
        const log = (phase: string, progress: number, message: string) => {
            if (this.options.verbose) {
                console.log(`[RhythmGenerator] [${phase}] ${Math.round(progress * 100)}%: ${message}`);
            }
            onProgress?.(phase, progress, message);
        };

        // Check for cancellation
        signal?.throwIfAborted();

        // Check cache for complete result
        const cacheKey = this.generateCacheKey(
            unifiedBeatMap.audioId,
            'variants', // Cache at the final phase level (complete result)
            this.createConfigFingerprint()
        );

        const cachedResult = this.getFromCache<GeneratedRhythm>(cacheKey);
        if (cachedResult) {
            log('Cache', 1, 'Retrieved complete result from cache');
            return cachedResult;
        }

        // ================================================================
        // Phase 1: Multi-band Analysis, Transient Detection, Quantization
        // ================================================================
        log('Phase 1', 0, 'Starting multi-band analysis');
        signal?.throwIfAborted();

        const multiBandResult = this.analyzeMultiBand(audioBuffer);
        log('Phase 1', 0.2, `Analyzed ${multiBandResult.bands.size} frequency bands`);
        signal?.throwIfAborted();

        const transientAnalysis = this.detectTransients(multiBandResult);
        log('Phase 1', 0.4, `Detected ${transientAnalysis.transients.length} transients`);
        signal?.throwIfAborted();

        const quantizationResult = this.quantizeTransients(transientAnalysis, unifiedBeatMap);
        log('Phase 1', 0.8, `Quantized to ${quantizationResult.streams.low.beats.length +
            quantizationResult.streams.mid.beats.length +
            quantizationResult.streams.high.beats.length} beats across all bands`);
        log('Phase 1', 1, 'Phase 1 complete');

        signal?.throwIfAborted();

        // ================================================================
        // Phase 2: Phrase Analysis, Density Analysis
        // ================================================================
        log('Phase 2', 0, 'Starting phrase and density analysis');
        signal?.throwIfAborted();

        const phraseAnalysis = this.analyzePhrases(quantizationResult.streams);
        log('Phase 2', 0.3, `Detected ${phraseAnalysis.phrases.length} rhythmic phrases`);
        signal?.throwIfAborted();

        const densityAnalysis = this.analyzeDensity(quantizationResult);
        log('Phase 2', 0.7, `Density category: ${densityAnalysis.combinedMetrics.densityCategory}`);
        log('Phase 2', 1, 'Phase 2 complete');
        signal?.throwIfAborted();

        // ================================================================
        // Phase 3: Scoring, Composite Generation, Difficulty Variants
        // ================================================================
        log('Phase 3', 0, 'Starting scoring and composite generation');
        signal?.throwIfAborted();

        const scoringResult = this.scoreStreams(quantizationResult, phraseAnalysis, densityAnalysis);
        log('Phase 3', 0.2, `Scored ${scoringResult.sectionWinners.length} sections`);
        signal?.throwIfAborted();

        const composite = this.generateComposite(quantizationResult, scoringResult, densityAnalysis);
        log('Phase 3', 0.4, `Generated composite with ${composite.beats.length} beats, ` +
            `natural difficulty: ${composite.naturalDifficulty}`);
        signal?.throwIfAborted();

        const difficultyVariants = this.generateDifficultyVariants(composite, phraseAnalysis, quantizationResult);
        log('Phase 3', 0.8, 'Generated easy/medium/hard difficulty variants');
        log('Phase 3', 1, 'Phase 3 complete');

        // Check for cancellation before building final result
        signal?.throwIfAborted();

        // ================================================================
        // Build Final Result
        // ================================================================
        const metadata: RhythmMetadata = {
            difficulty: this.options.difficulty,
            bandsAnalyzed: ['low', 'mid', 'high'],
            transientsDetected: transientAnalysis.metadata.totalTransients,
            transientsFilteredByIntensity: quantizationResult.metadata.transientsFilteredByIntensity,
            densityValidationRetries: quantizationResult.metadata.densityValidation.retryCount,
            phrasesDetected: phraseAnalysis.phrases.length,
            averageDensity: densityAnalysis.combinedMetrics.transientsPerBeat,
            naturalDifficulty: composite.naturalDifficulty,
            generationConfig: this.options,
            duration: audioBuffer.duration,
            totalBeats: unifiedBeatMap.beats.length,
        };

        const result: GeneratedRhythm = {
            difficultyVariants,
            bandStreams: quantizationResult.streams,
            composite,
            analysis: {
                transientAnalysis,
                quantizationResult,
                phraseAnalysis,
                densityAnalysis,
                scoringResult,
            },
            metadata,
        };

        // Cache the complete result
        this.setCache(cacheKey, result);

        return result;
    }

    // ================================================================
    // Pipeline Step Methods (exposed for testing and advanced use)
    // ================================================================

    /**
     * Phase 1.1: Multi-band audio analysis
     *
     * Splits audio into frequency bands and analyzes each for transients.
     *
     * @param audioBuffer - Audio buffer to analyze
     * @returns Multi-band analysis result
     */
    analyzeMultiBand(audioBuffer: AudioBuffer): MultiBandResult {
        return this.multiBandAnalyzer.analyze(audioBuffer);
    }

    /**
     * Phase 1.2: Transient detection
     *
     * Detects transients in each frequency band using band-specific strategies.
     *
     * @param multiBandResult - Multi-band analysis from Phase 1.1
     * @returns Transient analysis with per-band results
     */
    detectTransients(multiBandResult: MultiBandResult): TransientAnalysis {
        return this.transientDetector.detect(multiBandResult);
    }

    /**
     * Phase 1.3: Rhythm quantization
     *
     * Quantizes transients to the beat map grid with density validation.
     *
     * @param transientAnalysis - Transient analysis from Phase 1.2
     * @param unifiedBeatMap - Unified beat map
     * @returns Quantized band streams
     */
    quantizeTransients(
        transientAnalysis: TransientAnalysis,
        unifiedBeatMap: UnifiedBeatMap
    ): QuantizedBandStreams {
        return this.rhythmQuantizer.quantize(transientAnalysis, unifiedBeatMap);
    }

    /**
     * Phase 2.1: Phrase analysis
     *
     * Detects rhythmic phrases in each band stream.
     *
     * @param streams - Quantized band streams
     * @returns Phrase analysis result
     */
    analyzePhrases(streams: {
        low: GeneratedRhythmMap;
        mid: GeneratedRhythmMap;
        high: GeneratedRhythmMap;
    }): PhraseAnalysisResult {
        return this.phraseAnalyzer.analyze(streams);
    }

    /**
     * Phase 2.2: Density analysis
     *
     * Analyzes density and determines natural difficulty.
     *
     * @param quantizedStreams - Quantized band streams
     * @returns Density analysis result
     */
    analyzeDensity(quantizedStreams: QuantizedBandStreams): DensityAnalysisResult {
        return this.densityAnalyzer.analyze(quantizedStreams);
    }

    /**
     * Phase 3.1: Stream scoring
     *
     * Scores each band stream section for rhythmic interest.
     *
     * @param streams - Quantized band streams
     * @param phraseAnalysis - Phrase analysis from Phase 2.1
     * @param densityAnalysis - Density analysis from Phase 2.2
     * @returns Stream scoring result
     */
    scoreStreams(
        streams: QuantizedBandStreams,
        phraseAnalysis: PhraseAnalysisResult,
        densityAnalysis: DensityAnalysisResult
    ): StreamScoringResult {
        return this.streamScorer.score(streams, phraseAnalysis, densityAnalysis);
    }

    /**
     * Phase 3.2: Composite stream generation
     *
     * Creates a composite stream from the highest-scoring sections.
     *
     * @param streams - Quantized band streams
     * @param scoringResult - Scoring result from Phase 3.1
     * @param densityAnalysis - Density analysis from Phase 2.2
     * @returns Composite stream
     */
    generateComposite(
        streams: QuantizedBandStreams,
        scoringResult: StreamScoringResult,
        densityAnalysis: DensityAnalysisResult
    ): CompositeStream {
        return this.compositeGenerator.generate(streams, scoringResult, densityAnalysis);
    }

    /**
     * Phase 3.3: Difficulty variant generation
     *
     * Generates easy/medium/hard variants from the composite stream.
     *
     * @param composite - Composite stream from Phase 3.2
     * @param phraseAnalysis - Phrase analysis from Phase 2.1
     * @param quantizationResult - Quantization result for grid decisions
     * @returns Difficulty variants
     */
    generateDifficultyVariants(
        composite: CompositeStream,
        phraseAnalysis: PhraseAnalysisResult,
        quantizationResult: QuantizedBandStreams
    ): { easy: DifficultyVariant; medium: DifficultyVariant; hard: DifficultyVariant } {
        // Collect grid decisions from all band streams
        const gridDecisions = this.collectGridDecisions(quantizationResult);

        return this.variantGenerator.generate(composite, phraseAnalysis, gridDecisions);
    }

    /**
     * Collect grid decisions from all band streams
     *
     * Merges grid decisions from all bands into a single map.
     * When multiple bands have decisions for the same beat index,
     * the decision with higher confidence is used.
     */
    private collectGridDecisions(quantizationResult: QuantizedBandStreams): Map<number, GridDecision> {
        const gridDecisions = new Map<number, GridDecision>();

        const allDecisions = [
            ...quantizationResult.streams.low.gridDecisions,
            ...quantizationResult.streams.mid.gridDecisions,
            ...quantizationResult.streams.high.gridDecisions,
        ];

        for (const decision of allDecisions) {
            const existing = gridDecisions.get(decision.beatIndex);
            if (!existing || decision.confidence > existing.confidence) {
                gridDecisions.set(decision.beatIndex, decision);
            }
        }

        return gridDecisions;
    }

    // ================================================================
    // Static Convenience Methods
    // ================================================================

    /**
     * Quick generate rhythm patterns with default options
     *
     * Convenience method for simple use cases.
     *
     * @param audioBuffer - Audio buffer to analyze
     * @param unifiedBeatMap - Unified beat map
     * @returns Generated rhythm result
     */
    static async quickGenerate(
        audioBuffer: AudioBuffer,
        unifiedBeatMap: UnifiedBeatMap
    ): Promise<GeneratedRhythm> {
        const generator = new RhythmGenerator();
        return generator.generate(audioBuffer, unifiedBeatMap);
    }

    /**
     * Generate rhythm patterns for a specific difficulty
     *
     * Convenience method for generating a single difficulty variant.
     *
     * @param audioBuffer - Audio buffer to analyze
     * @param unifiedBeatMap - Unified beat map
     * @param difficulty - Target difficulty level
     * @returns Difficulty variant for the requested level
     */
    static async generateForDifficulty(
        audioBuffer: AudioBuffer,
        unifiedBeatMap: UnifiedBeatMap,
        difficulty: DifficultyLevel
    ): Promise<DifficultyVariant> {
        const generator = new RhythmGenerator();
        const result = await generator.generate(audioBuffer, unifiedBeatMap);
        return result.difficultyVariants[difficulty];
    }
}
