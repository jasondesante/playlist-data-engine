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
import { TransientDetector, type TransientAnalysis, type TransientResult, type BandTransientConfigOverrides } from '../analysis/beat/TransientDetector.js';
import {
    RhythmQuantizer,
    type QuantizationConfig,
    type QuantizedBandStreams,
    type GeneratedRhythmMap,
    type GridDecision,
    type GeneratedBeat,
    type DensityValidationResult,
    type BandDensityValidationResult,
} from '../analysis/beat/RhythmQuantizer.js';
import { PhraseAnalyzer, type PhraseAnalysisResult, type RhythmicPhrase, type PhraseOccurrence, type BandPhraseAnalysis } from '../analysis/beat/PhraseAnalyzer.js';
import { DensityAnalyzer, type DensityAnalysisResult, type BandDensityMetrics, type SectionDensityMetrics, type BeatDensityMetrics } from '../analysis/beat/DensityAnalyzer.js';
import { StreamScorer, type StreamScoringResult, type SectionScore, type SectionWinner, type ScoringFactors } from '../analysis/beat/StreamScorer.js';
import {
    CompositeStreamGenerator,
    type CompositeStream,
    type CompositeBeat,
} from '../analysis/beat/CompositeStreamGenerator.js';
import {
    DifficultyVariantGenerator,
    type DifficultyVariant,
    type DifficultyLevel,
    type VariantBeat,
    type SubdivisionConversionMetadata,
    type EnhancementMetadata,
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

    /**
     * Per-band transient detection configuration.
     * Allows customizing threshold, minimum interval, and adaptive thresholding for each frequency band.
     * @example
     * ```typescript
     * transientConfig: {
     *   low: { threshold: 0.5, minInterval: 0.08 }, // Higher threshold for bass
     *   high: { threshold: 0.2 }, // Lower threshold for hi-hats
     * }
     * ```
     */
    transientConfig?: BandTransientConfigOverrides;

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
// JSON Serialization Types
// ============================================================================

/**
 * JSON-serializable version of GeneratedBeat
 */
interface GeneratedBeatJSON {
    timestamp: number;
    beatIndex: number;
    gridPosition: number;
    gridType: 'straight_16th' | 'triplet_8th';
    intensity: number;
    band: 'low' | 'mid' | 'high';
    quantizationError?: number;
}

/**
 * JSON-serializable version of VariantBeat (uses ExtendedGridType)
 */
interface VariantBeatJSON {
    timestamp: number;
    beatIndex: number;
    gridPosition: number;
    gridType: 'straight_16th' | 'triplet_8th' | 'straight_8th' | 'quarter_triplet';
    intensity: number;
    band: 'low' | 'mid' | 'high';
    quantizationError?: number;
    sourceBand: 'low' | 'mid' | 'high';
}

/**
 * JSON-serializable version of CompositeBeat (uses basic GridType)
 */
interface CompositeBeatJSON {
    timestamp: number;
    beatIndex: number;
    gridPosition: number;
    gridType: 'straight_16th' | 'triplet_8th';
    intensity: number;
    band: 'low' | 'mid' | 'high';
    quantizationError?: number;
    sourceBand: 'low' | 'mid' | 'high';
}

/**
 * JSON-serializable version of GridDecision
 */
interface GridDecisionJSON {
    beatIndex: number;
    selectedGrid: 'straight_16th' | 'triplet_8th';
    straightAvgOffset: number;
    tripletAvgOffset: number;
    transientCount: number;
    confidence: number;
}

/**
 * JSON-serializable version of GeneratedRhythmMap
 */
interface GeneratedRhythmMapJSON {
    audioId: string;
    duration: number;
    beats: GeneratedBeatJSON[];
    gridDecisions: GridDecisionJSON[];
}

/**
 * JSON-serializable version of DifficultyVariant
 */
interface DifficultyVariantJSON {
    difficulty: 'easy' | 'medium' | 'hard';
    beats: VariantBeatJSON[];
    isUnedited: boolean;
    editType: 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';
    editAmount: number;
    patternsInserted?: string[];
    conversionMetadata?: SubdivisionConversionMetadata;
    enhancementMetadata?: EnhancementMetadata;
}

/**
 * JSON-serializable version of CompositeSection
 */
interface CompositeSectionJSON {
    beatRange: { start: number; end: number };
    sourceBand: 'low' | 'mid' | 'high';
    score: number;
    margin: number;
}

/**
 * JSON-serializable version of CompositeStream
 */
interface CompositeStreamJSON {
    beats: CompositeBeatJSON[];
    sections: CompositeSectionJSON[];
    naturalDifficulty: 'easy' | 'medium' | 'hard';
    quarterNoteInterval: number;
    metadata: {
        totalBeats: number;
        sectionCount: number;
        beatsPerBand: { low: number; mid: number; high: number };
        sectionsPerBand: { low: number; mid: number; high: number };
    };
}

/**
 * JSON-serializable version of TransientResult
 */
interface TransientResultJSON {
    timestamp: number;
    intensity: number;
    band: 'low' | 'mid' | 'high';
    detectionMethod: 'energy' | 'spectral_flux' | 'hfc';
    nearestBeat?: {
        index: number;
        distance: number;
    };
}

/**
 * JSON-serializable version of TransientAnalysis metadata
 */
interface TransientAnalysisMetadataJSON {
    totalTransients: number;
    transientsPerBand: Array<{ band: 'low' | 'mid' | 'high'; count: number }>;
    duration: number;
    averageIntensity: number;
    detectionMethodsUsed: Array<'energy' | 'spectral_flux' | 'hfc'>;
}

/**
 * JSON-serializable version of TransientAnalysis
 */
interface TransientAnalysisJSON {
    transients: TransientResultJSON[];
    bandTransients: Array<{ band: 'low' | 'mid' | 'high'; transients: TransientResultJSON[] }>;
    metadata: TransientAnalysisMetadataJSON;
}

/**
 * JSON-serializable version of BandDensityValidationResult
 */
interface BandDensityValidationResultJSON {
    band: 'low' | 'mid' | 'high';
    isValid: boolean;
    minIntervalDetected: number;
    requiredMinInterval: number;
    retryCount: number;
    sensitivityReduction: number;
    finalIntensityThreshold: number;
    transientsRemaining: number;
}

/**
 * JSON-serializable version of DensityValidationResult
 */
interface DensityValidationResultJSON {
    isValid: boolean;
    bands: {
        low: BandDensityValidationResultJSON;
        mid: BandDensityValidationResultJSON;
        high: BandDensityValidationResultJSON;
    };
    maxRetryCount: number;
    maxSensitivityReduction: number;
}

/**
 * JSON-serializable version of QuantizedBandStreams metadata
 */
interface QuantizedBandStreamsMetadataJSON {
    densityValidation: DensityValidationResultJSON;
    transientsFilteredByIntensity: number;
    transientsFilteredByBand: {
        low: number;
        mid: number;
        high: number;
    };
}

/**
 * JSON-serializable version of QuantizedBandStreams
 */
interface QuantizedBandStreamsJSON {
    streams: {
        low: GeneratedRhythmMapJSON;
        mid: GeneratedRhythmMapJSON;
        high: GeneratedRhythmMapJSON;
    };
    metadata: QuantizedBandStreamsMetadataJSON;
}

/**
 * JSON-serializable version of PhraseOccurrence
 */
interface PhraseOccurrenceJSON {
    beatIndex: number;
    startTimestamp: number;
    endTimestamp: number;
}

/**
 * JSON-serializable version of RhythmicPhrase
 */
interface RhythmicPhraseJSON {
    id: string;
    pattern: GeneratedBeatJSON[];
    sizeInBeats: number;
    sourceBand: 'low' | 'mid' | 'high';
    occurrences: PhraseOccurrenceJSON[];
    significance: number;
    hasVariation: boolean;
    availableForReuse: boolean;
}

/**
 * JSON-serializable version of BandPhraseAnalysis
 */
interface BandPhraseAnalysisJSON {
    band: 'low' | 'mid' | 'high';
    phrases: RhythmicPhraseJSON[];
    phrasesBySize: Array<{ size: number; phrases: RhythmicPhraseJSON[] }>;
    phrasesWithVariation: RhythmicPhraseJSON[];
}

/**
 * JSON-serializable version of PhraseAnalysisResult
 */
interface PhraseAnalysisResultJSON {
    phrases: RhythmicPhraseJSON[];
    phrasesByBand: Array<{ band: 'low' | 'mid' | 'high'; phrases: RhythmicPhraseJSON[] }>;
    mostSignificantPhrases: RhythmicPhraseJSON[];
    phrasesBySize: Array<{ size: number; phrases: RhythmicPhraseJSON[] }>;
    patternLibrary: RhythmicPhraseJSON[];
    bandAnalysis: {
        low: BandPhraseAnalysisJSON;
        mid: BandPhraseAnalysisJSON;
        high: BandPhraseAnalysisJSON;
    };
}

/**
 * JSON-serializable version of BeatDensityMetrics
 */
interface BeatDensityMetricsJSON {
    beatIndex: number;
    transientCount: number;
    bands: ('low' | 'mid' | 'high')[];
    averageIntensity: number;
}

/**
 * JSON-serializable version of BeatDensityMetrics
 */
interface BeatDensityMetricsJSON {
    beatIndex: number;
    transientCount: number;
    bands: ('low' | 'mid' | 'high')[];
    averageIntensity: number;
}

/**
 * JSON-serializable version of BeatDensityMetrics
 */
interface BeatDensityMetricsJSON {
    beatIndex: number;
    transientCount: number;
    bands: ('low' | 'mid' | 'high')[];
    averageIntensity: number;
}

/**
 * JSON-serializable version of BandDensityMetrics
 */
interface BandDensityMetricsJSON {
    band: 'low' | 'mid' | 'high';
    totalBeats: number;
    totalTransients: number;
    transientsPerBeat: number;
    minTransientsPerBeat: number;
    maxTransientsPerBeat: number;
    variance: number;
    densityCategory: 'sparse' | 'moderate' | 'dense';
    naturalDifficulty: 'easy' | 'medium' | 'hard';
    perBeatDensity: BeatDensityMetricsJSON[];
}

/**
 * JSON-serializable version of DensityAnalysisResult
 */
interface DensityAnalysisResultJSON {
    bandMetrics: {
        low: BandDensityMetricsJSON;
        mid: BandDensityMetricsJSON;
        high: BandDensityMetricsJSON;
    };
    combinedMetrics: {
        totalTransients: number;
        transientsPerBeat: number;
        densityCategory: 'sparse' | 'moderate' | 'dense';
        naturalDifficulty: 'easy' | 'medium' | 'hard';
    };
    sections: Array<{
        startBeat: number;
        endBeat: number;
        beatCount: number;
        totalTransients: number;
        transientsPerBeat: number;
        minTransientsPerBeat: number;
        maxTransientsPerBeat: number;
        densityCategory: 'sparse' | 'moderate' | 'dense';
        naturalDifficulty: 'easy' | 'medium' | 'hard';
    }>;
    perBeatDensity: BeatDensityMetricsJSON[];
}

/**
 * JSON-serializable version of StreamScoringResult
 */
interface StreamScoringResultJSON {
    sectionScores: Array<{
        beatRange: { start: number; end: number };
        band: 'low' | 'mid' | 'high';
        score: number;
        factors: {
            ioiVariance: number;
            syncopationLevel: number;
            phraseSignificance: number;
            densityFactor: number;
        };
    }>;
    bandTotals: { low: number; mid: number; high: number };
    bandAverages: { low: number; mid: number; high: number };
    sectionWinners: Array<{
        beatRange: { start: number; end: number };
        winner: 'low' | 'mid' | 'high';
        score: number;
        margin: number;
    }>;
    config: {
        beatsPerSection: number;
        ioiVarianceWeight: number;
        syncopationWeight: number;
        phraseSignificanceWeight: number;
        densityWeight: number;
        offbeatGridPositions: {
            straight_16th: number[];
            triplet_8th: number[];
        };
    };
}

/**
 * JSON-serializable version of GeneratedRhythm
 */
interface GeneratedRhythmJSON {
    difficultyVariants: {
        easy: DifficultyVariantJSON;
        medium: DifficultyVariantJSON;
        hard: DifficultyVariantJSON;
    };
    bandStreams: {
        low: GeneratedRhythmMapJSON;
        mid: GeneratedRhythmMapJSON;
        high: GeneratedRhythmMapJSON;
    };
    composite: CompositeStreamJSON;
    analysis: {
        transientAnalysis: TransientAnalysisJSON;
        quantizationResult: QuantizedBandStreamsJSON;
        phraseAnalysis: PhraseAnalysisResultJSON;
        densityAnalysis: DensityAnalysisResultJSON;
        scoringResult: StreamScoringResultJSON;
    };
    metadata: RhythmMetadata;
}

// ============================================================================
// Presets
// ============================================================================

/**
 * Preset name for rhythm generation configurations
 */
export type RhythmPresetName = 'casual' | 'standard' | 'challenge' | 'bass';

/**
 * A preset configuration for rhythm generation
 */
export interface RhythmPresetConfig {
    /** Which difficulty preset to use for output */
    difficulty: DifficultyPreset;

    /** Which stream to use as primary output */
    outputMode: OutputMode;

    /** Optional description of what this preset is designed for */
    description?: string;
}

/**
 * Built-in preset configurations for common use cases
 *
 * - **casual**: Easy difficulty, composite output - for relaxed gameplay
 * - **standard**: Medium difficulty, composite output - balanced experience
 * - **challenge**: Hard difficulty, composite output - for skilled players
 * - **bass**: Medium difficulty, low-frequency band - focus on bass rhythms
 *
 * @example
 * ```typescript
 * // Get a preset configuration
 * const preset = getRhythmPreset('standard');
 * console.log(preset.description); // "Balanced experience for most players"
 *
 * // Use preset with RhythmGenerator
 * const generator = new RhythmGenerator({
 *   ...preset,
 *   minimumTransientIntensity: 0.2,
 * });
 *
 * // List all available presets
 * const presetNames = getRhythmPresetNames();
 * console.log('Available presets:', presetNames); // ['casual', 'standard', 'challenge', 'bass']
 *
 * // Select bass-focused preset for rhythm games
 * const bassPreset = getRhythmPreset('bass');
 * const bassGenerator = new RhythmGenerator(bassPreset);
 * ```
 */
export const RHYTHM_PRESETS: Record<RhythmPresetName, RhythmPresetConfig> = {
    casual: {
        difficulty: 'easy',
        outputMode: 'composite',
        description: 'Easy difficulty for relaxed gameplay',
    },
    standard: {
        difficulty: 'medium',
        outputMode: 'composite',
        description: 'Balanced experience for most players',
    },
    challenge: {
        difficulty: 'hard',
        outputMode: 'composite',
        description: 'Hard difficulty for skilled players',
    },
    bass: {
        difficulty: 'medium',
        outputMode: 'low',
        description: 'Focus on bass/low-frequency rhythms',
    },
};

/**
 * Get a preset configuration by name
 *
 * @param name - The preset name to retrieve
 * @returns The preset configuration, or undefined if not found
 */
export function getRhythmPreset(name: RhythmPresetName): RhythmPresetConfig | undefined {
    return RHYTHM_PRESETS[name];
}

/**
 * Get all available preset names
 *
 * @returns Array of preset names
 */
export function getRhythmPresetNames(): RhythmPresetName[] {
    return Object.keys(RHYTHM_PRESETS) as RhythmPresetName[];
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
    transientConfig: BandTransientConfigOverrides | undefined;
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
    transientConfig: undefined,
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

        this.transientDetector = new TransientDetector({
            bandConfig: this.options.transientConfig,
        });

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
            densityValidationRetries: quantizationResult.metadata.densityValidation.maxRetryCount,
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

    // ================================================================
    // Serialization Support
    // ================================================================

    /**
     * Convert a GeneratedRhythm to JSON string
     *
     * Serializes all data including difficulty variants, band streams, composite,
     * analysis results, and metadata.
     *
     * @param rhythm - Generated rhythm to serialize
     * @returns JSON string
     */
    static toJSON(rhythm: GeneratedRhythm): string {
        const json: GeneratedRhythmJSON = {
            difficultyVariants: {
                easy: this.serializeDifficultyVariant(rhythm.difficultyVariants.easy),
                medium: this.serializeDifficultyVariant(rhythm.difficultyVariants.medium),
                hard: this.serializeDifficultyVariant(rhythm.difficultyVariants.hard),
            },
            bandStreams: {
                low: this.serializeGeneratedRhythmMap(rhythm.bandStreams.low),
                mid: this.serializeGeneratedRhythmMap(rhythm.bandStreams.mid),
                high: this.serializeGeneratedRhythmMap(rhythm.bandStreams.high),
            },
            composite: this.serializeCompositeStream(rhythm.composite),
            analysis: {
                transientAnalysis: this.serializeTransientAnalysis(rhythm.analysis.transientAnalysis),
                quantizationResult: this.serializeQuantizedBandStreams(rhythm.analysis.quantizationResult),
                phraseAnalysis: this.serializePhraseAnalysisResult(rhythm.analysis.phraseAnalysis),
                densityAnalysis: this.serializeDensityAnalysisResult(rhythm.analysis.densityAnalysis),
                scoringResult: this.serializeStreamScoringResult(rhythm.analysis.scoringResult),
            },
            metadata: rhythm.metadata,
        };

        return JSON.stringify(json, null, 2);
    }

    /**
     * Parse a GeneratedRhythm from JSON string
     *
     * @param jsonString - JSON string to parse
     * @returns Generated rhythm object
     */
    static fromJSON(jsonString: string): GeneratedRhythm {
        const json: GeneratedRhythmJSON = JSON.parse(jsonString);

        return {
            difficultyVariants: {
                easy: this.deserializeDifficultyVariant(json.difficultyVariants.easy),
                medium: this.deserializeDifficultyVariant(json.difficultyVariants.medium),
                hard: this.deserializeDifficultyVariant(json.difficultyVariants.hard),
            },
            bandStreams: {
                low: this.deserializeGeneratedRhythmMap(json.bandStreams.low),
                mid: this.deserializeGeneratedRhythmMap(json.bandStreams.mid),
                high: this.deserializeGeneratedRhythmMap(json.bandStreams.high),
            },
            composite: this.deserializeCompositeStream(json.composite),
            analysis: {
                transientAnalysis: this.deserializeTransientAnalysis(json.analysis.transientAnalysis),
                quantizationResult: this.deserializeQuantizedBandStreams(json.analysis.quantizationResult),
                phraseAnalysis: this.deserializePhraseAnalysisResult(json.analysis.phraseAnalysis),
                densityAnalysis: this.deserializeDensityAnalysisResult(json.analysis.densityAnalysis),
                scoringResult: this.deserializeStreamScoringResult(json.analysis.scoringResult),
            },
            metadata: json.metadata,
        };
    }

    /**
     * Save a GeneratedRhythm to a file (Node.js only)
     *
     * @param rhythm - Generated rhythm to save
     * @param filePath - Path to save to
     */
    static async saveToFile(rhythm: GeneratedRhythm, filePath: string): Promise<void> {
        // Check if we're in a Node.js environment
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('saveToFile is only available in Node.js environment');
        }

        // Dynamic import for Node.js fs/promises
        const { writeFile } = await import('fs/promises');
        const json = RhythmGenerator.toJSON(rhythm);
        await writeFile(filePath, json, 'utf-8');
    }

    /**
     * Load a GeneratedRhythm from a file (Node.js only)
     *
     * @param filePath - Path to load from
     * @returns Generated rhythm object
     */
    static async loadFromFile(filePath: string): Promise<GeneratedRhythm> {
        // Check if we're in a Node.js environment
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('loadFromFile is only available in Node.js environment');
        }

        // Dynamic import for Node.js fs/promises
        const { readFile } = await import('fs/promises');
        const jsonString = await readFile(filePath, 'utf-8');
        return RhythmGenerator.fromJSON(jsonString);
    }

    // ================================================================
    // Private Serialization Helpers
    // ================================================================

    private static serializeDifficultyVariant(variant: DifficultyVariant): DifficultyVariantJSON {
        return {
            difficulty: variant.difficulty,
            beats: variant.beats.map(b => this.serializeVariantBeat(b)),
            isUnedited: variant.isUnedited,
            editType: variant.editType,
            editAmount: variant.editAmount,
            patternsInserted: variant.patternsInserted,
            conversionMetadata: variant.conversionMetadata,
            enhancementMetadata: variant.enhancementMetadata,
        };
    }

    private static deserializeDifficultyVariant(json: DifficultyVariantJSON): DifficultyVariant {
        return {
            difficulty: json.difficulty,
            beats: json.beats.map(b => this.deserializeVariantBeat(b)),
            isUnedited: json.isUnedited,
            editType: json.editType,
            editAmount: json.editAmount,
            patternsInserted: json.patternsInserted,
            conversionMetadata: json.conversionMetadata,
            enhancementMetadata: json.enhancementMetadata,
        };
    }

    private static serializeVariantBeat(beat: VariantBeat): VariantBeatJSON {
        return {
            timestamp: beat.timestamp,
            beatIndex: beat.beatIndex,
            gridPosition: beat.gridPosition,
            gridType: beat.gridType,
            intensity: beat.intensity,
            band: beat.band,
            quantizationError: beat.quantizationError,
            sourceBand: beat.sourceBand,
        };
    }
    private static deserializeVariantBeat(json: VariantBeatJSON): VariantBeat {
        return {
            timestamp: json.timestamp,
            beatIndex: json.beatIndex,
            gridPosition: json.gridPosition,
            gridType: json.gridType,
            intensity: json.intensity,
            band: json.band,
            quantizationError: json.quantizationError,
            sourceBand: json.sourceBand,
        };
    }

    private static serializeGeneratedRhythmMap(map: GeneratedRhythmMap): GeneratedRhythmMapJSON {
        return {
            audioId: map.audioId,
            duration: map.duration,
            beats: map.beats.map(b => this.serializeGeneratedBeat(b)),
            gridDecisions: map.gridDecisions,
        };
    }
    private static deserializeGeneratedRhythmMap(json: GeneratedRhythmMapJSON): GeneratedRhythmMap {
        return {
            audioId: json.audioId,
            duration: json.duration,
            beats: json.beats.map(b => this.deserializeGeneratedBeat(b)),
            gridDecisions: json.gridDecisions,
        };
    }
    private static serializeGeneratedBeat(beat: GeneratedBeat): GeneratedBeatJSON {
        return {
            timestamp: beat.timestamp,
            beatIndex: beat.beatIndex,
            gridPosition: beat.gridPosition,
            gridType: beat.gridType,
            intensity: beat.intensity,
            band: beat.band,
            quantizationError: beat.quantizationError,
        };
    }
    private static deserializeGeneratedBeat(json: GeneratedBeatJSON): GeneratedBeat {
        return {
            timestamp: json.timestamp,
            beatIndex: json.beatIndex,
            gridPosition: json.gridPosition,
            gridType: json.gridType,
            intensity: json.intensity,
            band: json.band,
            quantizationError: json.quantizationError,
        };
    }

    private static serializeCompositeStream(stream: CompositeStream): CompositeStreamJSON {
        return {
            beats: stream.beats.map(b => this.serializeCompositeBeat(b)),
            sections: stream.sections,
            naturalDifficulty: stream.naturalDifficulty,
            quarterNoteInterval: stream.quarterNoteInterval,
            metadata: stream.metadata,
        };
    }
    private static deserializeCompositeStream(json: CompositeStreamJSON): CompositeStream {
        return {
            beats: json.beats.map(b => this.deserializeCompositeBeat(b)),
            sections: json.sections,
            naturalDifficulty: json.naturalDifficulty,
            quarterNoteInterval: json.quarterNoteInterval,
            metadata: json.metadata,
        };
    }
    private static serializeCompositeBeat(beat: CompositeBeat): CompositeBeatJSON {
        return {
            timestamp: beat.timestamp,
            beatIndex: beat.beatIndex,
            gridPosition: beat.gridPosition,
            gridType: beat.gridType,
            intensity: beat.intensity,
            band: beat.band,
            quantizationError: beat.quantizationError,
            sourceBand: beat.sourceBand,
        };
    }
    private static deserializeCompositeBeat(json: CompositeBeatJSON): CompositeBeat {
        return {
            timestamp: json.timestamp,
            beatIndex: json.beatIndex,
            gridPosition: json.gridPosition,
            gridType: json.gridType,
            intensity: json.intensity,
            band: json.band,
            quantizationError: json.quantizationError,
            sourceBand: json.sourceBand,
        };
    }

    private static serializeTransientAnalysis(analysis: TransientAnalysis): TransientAnalysisJSON {
        return {
            transients: analysis.transients.map(t => this.serializeTransientResult(t)),
            bandTransients: Array.from(analysis.bandTransients.entries()).map(([band, transients]) => ({
                band,
                transients: transients.map(t => this.serializeTransientResult(t)),
            })),
            metadata: {
                totalTransients: analysis.metadata.totalTransients,
                transientsPerBand: Array.from(analysis.metadata.transientsPerBand.entries()).map(([band, count]) => ({
                    band,
                    count,
                })),
                duration: analysis.metadata.duration,
                averageIntensity: analysis.metadata.averageIntensity,
                detectionMethodsUsed: analysis.metadata.detectionMethodsUsed,
            },
        };
    }
    private static deserializeTransientAnalysis(json: TransientAnalysisJSON): TransientAnalysis {
        const bandTransients = new Map<'low' | 'mid' | 'high', TransientResult[]>();
        for (const entry of json.bandTransients) {
            bandTransients.set(entry.band as 'low', entry.transients.map(t => this.deserializeTransientResult(t)));
        }

        const transientsPerBand = new Map<'low' | 'mid' | 'high', number>();
        for (const entry of json.metadata.transientsPerBand) {
            transientsPerBand.set(entry.band as 'low', entry.count);
        }

        return {
            transients: json.transients.map(t => this.deserializeTransientResult(t)),
            bandTransients,
            metadata: {
                totalTransients: json.metadata.totalTransients,
                transientsPerBand,
                duration: json.metadata.duration,
                averageIntensity: json.metadata.averageIntensity,
                detectionMethodsUsed: json.metadata.detectionMethodsUsed,
            },
        };
    }

    private static serializeTransientResult(result: TransientResult): TransientResultJSON {
        return {
            timestamp: result.timestamp,
            intensity: result.intensity,
            band: result.band,
            detectionMethod: result.detectionMethod,
            nearestBeat: result.nearestBeat,
        };
    }
    private static deserializeTransientResult(json: TransientResultJSON): TransientResult {
        return {
            timestamp: json.timestamp,
            intensity: json.intensity,
            band: json.band,
            detectionMethod: json.detectionMethod,
            nearestBeat: json.nearestBeat,
        };
    }

    private static serializeQuantizedBandStreams(streams: QuantizedBandStreams): QuantizedBandStreamsJSON {
        return {
            streams: {
                low: this.serializeGeneratedRhythmMap(streams.streams.low),
                mid: this.serializeGeneratedRhythmMap(streams.streams.mid),
                high: this.serializeGeneratedRhythmMap(streams.streams.high),
            },
            metadata: {
                densityValidation: this.serializeDensityValidationResult(streams.metadata.densityValidation),
                transientsFilteredByIntensity: streams.metadata.transientsFilteredByIntensity,
                transientsFilteredByBand: streams.metadata.transientsFilteredByBand,
            },
        };
    }

    private static serializeDensityValidationResult(result: DensityValidationResult): DensityValidationResultJSON {
        return {
            isValid: result.isValid,
            bands: {
                low: this.serializeBandDensityValidationResult(result.bands.low),
                mid: this.serializeBandDensityValidationResult(result.bands.mid),
                high: this.serializeBandDensityValidationResult(result.bands.high),
            },
            maxRetryCount: result.maxRetryCount,
            maxSensitivityReduction: result.maxSensitivityReduction,
        };
    }

    private static serializeBandDensityValidationResult(result: BandDensityValidationResult): BandDensityValidationResultJSON {
        return {
            band: result.band,
            isValid: result.isValid,
            minIntervalDetected: result.minIntervalDetected,
            requiredMinInterval: result.requiredMinInterval,
            retryCount: result.retryCount,
            sensitivityReduction: result.sensitivityReduction,
            finalIntensityThreshold: result.finalIntensityThreshold,
            transientsRemaining: result.transientsRemaining,
        };
    }
    private static deserializeQuantizedBandStreams(json: QuantizedBandStreamsJSON): QuantizedBandStreams {
        return {
            streams: {
                low: this.deserializeGeneratedRhythmMap(json.streams.low),
                mid: this.deserializeGeneratedRhythmMap(json.streams.mid),
                high: this.deserializeGeneratedRhythmMap(json.streams.high),
            },
            metadata: {
                densityValidation: this.deserializeDensityValidationResult(json.metadata.densityValidation),
                transientsFilteredByIntensity: json.metadata.transientsFilteredByIntensity,
                transientsFilteredByBand: json.metadata.transientsFilteredByBand,
            },
        };
    }

    private static deserializeDensityValidationResult(json: DensityValidationResultJSON): DensityValidationResult {
        return {
            isValid: json.isValid,
            bands: {
                low: this.deserializeBandDensityValidationResult(json.bands.low),
                mid: this.deserializeBandDensityValidationResult(json.bands.mid),
                high: this.deserializeBandDensityValidationResult(json.bands.high),
            },
            maxRetryCount: json.maxRetryCount,
            maxSensitivityReduction: json.maxSensitivityReduction,
        };
    }

    private static deserializeBandDensityValidationResult(json: BandDensityValidationResultJSON): BandDensityValidationResult {
        return {
            band: json.band,
            isValid: json.isValid,
            minIntervalDetected: json.minIntervalDetected,
            requiredMinInterval: json.requiredMinInterval,
            retryCount: json.retryCount,
            sensitivityReduction: json.sensitivityReduction,
            finalIntensityThreshold: json.finalIntensityThreshold,
            transientsRemaining: json.transientsRemaining,
        };
    }

    private static serializePhraseAnalysisResult(result: PhraseAnalysisResult): PhraseAnalysisResultJSON {
        return {
            phrases: result.phrases.map(p => this.serializeRhythmicPhrase(p)),
            phrasesByBand: Array.from(result.phrasesByBand.entries()).map(([band, phrases]) => ({
                band,
                phrases: phrases.map(p => this.serializeRhythmicPhrase(p)),
            })),
            mostSignificantPhrases: result.mostSignificantPhrases.map(p => this.serializeRhythmicPhrase(p)),
            phrasesBySize: Array.from(result.phrasesBySize.entries()).map(([size, phrases]) => ({
                size,
                phrases: phrases.map(p => this.serializeRhythmicPhrase(p)),
            })),
            patternLibrary: result.patternLibrary.map(p => this.serializeRhythmicPhrase(p)),
            bandAnalysis: {
                low: this.serializeBandPhraseAnalysis(result.bandAnalysis.low),
                mid: this.serializeBandPhraseAnalysis(result.bandAnalysis.mid),
                high: this.serializeBandPhraseAnalysis(result.bandAnalysis.high),
            },
        };
    }
    private static deserializePhraseAnalysisResult(json: PhraseAnalysisResultJSON): PhraseAnalysisResult {
        const phrasesByBand = new Map<'low' | 'mid' | 'high', RhythmicPhrase[]>();
        for (const entry of json.phrasesByBand) {
            phrasesByBand.set(entry.band as 'low', entry.phrases.map(p => this.deserializeRhythmicPhrase(p)));
        }

        const phrasesBySize = new Map<number, RhythmicPhrase[]>();
        for (const entry of json.phrasesBySize) {
            phrasesBySize.set(entry.size, entry.phrases.map(p => this.deserializeRhythmicPhrase(p)));
        }

        return {
            phrases: json.phrases.map(p => this.deserializeRhythmicPhrase(p)),
            phrasesByBand,
            mostSignificantPhrases: json.mostSignificantPhrases.map(p => this.deserializeRhythmicPhrase(p)),
            phrasesBySize,
            patternLibrary: json.patternLibrary.map(p => this.deserializeRhythmicPhrase(p)),
            bandAnalysis: {
                low: this.deserializeBandPhraseAnalysis(json.bandAnalysis.low),
                mid: this.deserializeBandPhraseAnalysis(json.bandAnalysis.mid),
                high: this.deserializeBandPhraseAnalysis(json.bandAnalysis.high),
            },
        };
    }

    private static serializeRhythmicPhrase(phrase: RhythmicPhrase): RhythmicPhraseJSON {
        return {
            id: phrase.id,
            pattern: phrase.pattern.map(b => this.serializeGeneratedBeat(b)),
            sizeInBeats: phrase.sizeInBeats,
            sourceBand: phrase.sourceBand,
            occurrences: phrase.occurrences,
            significance: phrase.significance,
            hasVariation: phrase.hasVariation,
            availableForReuse: phrase.availableForReuse,
        };
    }
    private static deserializeRhythmicPhrase(json: RhythmicPhraseJSON): RhythmicPhrase {
        return {
            id: json.id,
            pattern: json.pattern.map(b => this.deserializeGeneratedBeat(b)),
            sizeInBeats: json.sizeInBeats,
            sourceBand: json.sourceBand,
            occurrences: json.occurrences,
            significance: json.significance,
            hasVariation: json.hasVariation,
            availableForReuse: json.availableForReuse,
        };
    }

    private static serializeBandPhraseAnalysis(analysis: BandPhraseAnalysis): BandPhraseAnalysisJSON {
        return {
            band: analysis.band,
            phrases: analysis.phrases.map(p => this.serializeRhythmicPhrase(p)),
            phrasesBySize: Array.from(analysis.phrasesBySize.entries()).map(([size, phrases]) => ({
                size,
                phrases: phrases.map(p => this.serializeRhythmicPhrase(p)),
            })),
            phrasesWithVariation: analysis.phrasesWithVariation.map(p => this.serializeRhythmicPhrase(p)),
        };
    }
    private static deserializeBandPhraseAnalysis(json: BandPhraseAnalysisJSON): BandPhraseAnalysis {
        const phrasesBySize = new Map<number, RhythmicPhrase[]>();
        for (const entry of json.phrasesBySize) {
            phrasesBySize.set(entry.size, entry.phrases.map(p => this.deserializeRhythmicPhrase(p)));
        }

        return {
            band: json.band,
            phrases: json.phrases.map(p => this.deserializeRhythmicPhrase(p)),
            phrasesBySize,
            phrasesWithVariation: json.phrasesWithVariation.map(p => this.deserializeRhythmicPhrase(p)),
        };
    }

    private static serializeDensityAnalysisResult(result: DensityAnalysisResult): DensityAnalysisResultJSON {
        return {
            bandMetrics: {
                low: this.serializeBandDensityMetrics(result.bandMetrics.low),
                mid: this.serializeBandDensityMetrics(result.bandMetrics.mid),
                high: this.serializeBandDensityMetrics(result.bandMetrics.high),
            },
            combinedMetrics: result.combinedMetrics,
            sections: result.sections,
            perBeatDensity: result.perBeatDensity,
        };
    }
    private static deserializeDensityAnalysisResult(json: DensityAnalysisResultJSON): DensityAnalysisResult {
        return {
            bandMetrics: {
                low: this.deserializeBandDensityMetrics(json.bandMetrics.low),
                mid: this.deserializeBandDensityMetrics(json.bandMetrics.mid),
                high: this.deserializeBandDensityMetrics(json.bandMetrics.high),
            },
            combinedMetrics: json.combinedMetrics,
            sections: json.sections,
            perBeatDensity: json.perBeatDensity,
        };
    }

    private static serializeBandDensityMetrics(metrics: BandDensityMetrics): BandDensityMetricsJSON {
        return {
            band: metrics.band,
            totalBeats: metrics.totalBeats,
            totalTransients: metrics.totalTransients,
            transientsPerBeat: metrics.transientsPerBeat,
            minTransientsPerBeat: metrics.minTransientsPerBeat,
            maxTransientsPerBeat: metrics.maxTransientsPerBeat,
            variance: metrics.variance,
            densityCategory: metrics.densityCategory,
            naturalDifficulty: metrics.naturalDifficulty,
            perBeatDensity: metrics.perBeatDensity,
        };
    }
    private static deserializeBandDensityMetrics(json: BandDensityMetricsJSON): BandDensityMetrics {
        return {
            band: json.band,
            totalBeats: json.totalBeats,
            totalTransients: json.totalTransients,
            transientsPerBeat: json.transientsPerBeat,
            minTransientsPerBeat: json.minTransientsPerBeat,
            maxTransientsPerBeat: json.maxTransientsPerBeat,
            variance: json.variance,
            densityCategory: json.densityCategory,
            naturalDifficulty: json.naturalDifficulty,
            perBeatDensity: json.perBeatDensity,
        };
    }

    private static serializeStreamScoringResult(result: StreamScoringResult): StreamScoringResultJSON {
        return {
            sectionScores: result.sectionScores,
            bandTotals: result.bandTotals,
            bandAverages: result.bandAverages,
            sectionWinners: result.sectionWinners,
            config: result.config,
        };
    }
    private static deserializeStreamScoringResult(json: StreamScoringResultJSON): StreamScoringResult {
        return {
            sectionScores: json.sectionScores,
            bandTotals: json.bandTotals,
            bandAverages: json.bandAverages,
            sectionWinners: json.sectionWinners,
            config: json.config,
        };
    }
}
