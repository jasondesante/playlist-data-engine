/**
 * Level Generator - Orchestrates complete rhythm game level generation
 *
 * This is the main entry point for generating playable rhythm game levels from audio.
 * It orchestrates all phases of the pipeline:
 *
 * Phase 1: Rhythm generation (from procedural-rhythm-generation.md)
 * Phase 2: Pitch analysis (if pitchInfluenceWeight > 0)
 * Phase 3: Button mapping (from pitch-detection-button-mapping.md)
 * Phase 4: Conversion to ChartedBeatMap
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 3.1
 *
 * @example
 * ```typescript
 * const generator = new LevelGenerator({
 *   difficulty: 'medium',
 *   controllerMode: 'ddr',
 *   buttons: { pitchInfluenceWeight: 08 },
 * });
 *
 * // Generate level from audio
 * const level = await generator.generate(audioBuffer, unifiedBeatMap);
 *
 * // Use the chart with BeatStream
 * const beatStream = new BeatStream(level.chart, audioContext);
 * ```
 */

import { RhythmGenerator } from './RhythmGenerator.js';
import type { RhythmGenerationOptions, GeneratedRhythm, RhythmMetadata } from './RhythmGenerator.js';
import { PitchBeatLinker } from './PitchBeatLinker.js';
import type { PitchBeatLinkerConfig } from './PitchBeatLinker.js';
import type { PitchAlgorithm } from '../analysis/EssentiaPitchDetector.js';
import { MelodyContourAnalyzer } from '../analysis/MelodyContourAnalyzer.js';
import type { MelodyContourAnalysisResult } from '../analysis/MelodyContourAnalyzer.js';
import { ButtonMapper } from './ButtonMapper.js';
import type { MappedLevelResult, ButtonMappingMetadata } from './ButtonMapper.js';
import { BeatConverter } from './BeatConverter.js';
import type { ButtonMappingConfig, ControllerMode } from '../types/ButtonMapping.js';
import { mergeButtonMappingConfig } from '../types/ButtonMapping.js';
import type { DifficultyPreset } from '../types/BeatMap.js';
import type { UnifiedBeatMap } from '../types/BeatMap.js';
import type { ChartedBeatMap } from '../types/ChartedBeatMap.js';
import type { DifficultyVariant, DifficultyLevel } from '../analysis/beat/DifficultyVariantGenerator.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Options for level generation
 */
export interface LevelGenerationOptions {
    /** Target difficulty for the generated chart */
    difficulty: DifficultyPreset;

    /** Controller mode (DDR or Guitar Hero) */
    controllerMode: ControllerMode

    /** Rhythm generation settings (passed through to RhythmGenerator) */
    rhythm?: Partial<RhythmGenerationOptions>

    /** Button mapping settings */
    buttons?: Partial<ButtonMappingConfig>

    /** Seed for reproducibility */
    seed?: string

    /**
     * Pre-generated rhythm to use instead of generating new.
     * When provided, skips the rhythm generation phase entirely.
     * Useful for reusing rhythm from a previous generation step.
     */
    cachedRhythm?: GeneratedRhythm

    /** Which pitch detection algorithm to use. 'pyin_legacy' uses built-in pYIN; others use Essentia.js. (default: 'pitch_melodia') */
    pitchAlgorithm?: PitchAlgorithm

    /** URL to the CREPE TFJS model (only required when pitchAlgorithm is 'pitch_crepe') */
    crepeModelUrl?: string

    /**
     * Probability threshold for voiced/unvoiced decision in pitch detection.
     * Higher values require stronger pitch signal to be considered "voiced".
     * Passed through to PitchDetectorConfig.
     *
     * @default 0.2
     */
    voicingThreshold?: number
}

/**
 * Metadata about the generated level
 */
export interface LevelMetadata {
    /** Difficulty preset used */
    difficulty: DifficultyPreset

    /** Controller mode used */
    controllerMode: ControllerMode

    /** Rhythm generation metadata */
    rhythmMetadata: RhythmMetadata

    /** Button mapping metadata */
    buttonMetadata: ButtonMappingMetadata

    /** Pitch analysis metadata (if pitch detection was used) */
    pitchMetadata: {
        melodyRange: { min: string; max: string } | null
        directionStats: {
            up: number
            down: number
            stable: number
            none: number
        } | null
        intervalStats: {
            unison: number
            small: number
            medium: number
            large: number
            very_large: number
        } | null
    } | null

    /** Chart metadata */
    chartMetadata: {
        totalBeats: number
        detectedBeats: number
        generatedBeats: number
    }

    /** Generation configuration */
    generationConfig: LevelGenerationOptions
}

/**
 * Complete generated level ready for gameplay
 */
export interface GeneratedLevel {
    /** The playable ChartedBeatMap */
    chart: ChartedBeatMap

    /** The selected difficulty variant with keys assigned */
    variant: DifficultyVariant

    /** Original rhythm generation output preserved */
    rhythm: GeneratedRhythm

    /** Pitch analysis results (null if pitchInfluenceWeight was 0) */
    pitchAnalysis: MelodyContourAnalysisResult | null

    /** Combined metadata */
    metadata: LevelMetadata
}

/**
 * Progress callback for generation progress updates
 */
export type LevelProgressCallback = (progress: LevelGenerationProgress) => void

/**
 * Progress information during level generation
 */
export interface LevelGenerationProgress {
    /** Current stage of generation */
    stage: 'rhythm' | 'pitch' | 'buttons' | 'conversion' | 'finalizing'

    /** Progress within current stage (0-1) */
    progress: number

    /** Human-readable status message */
    message: string
}

/**
 * Result of level generation for all difficulties
 */
export interface AllDifficultiesResult {
    easy: GeneratedLevel
    medium: GeneratedLevel
    hard: GeneratedLevel
    natural?: GeneratedLevel
}

/**
 * Cache phase identifier
 */
export type LevelCachePhase = 'rhythm' | 'pitch'

/**
 * Cached intermediate result
 */
interface CacheEntry<T> {
    /** The cached result */
    result: T
    /** Timestamp when cached (ms) */
    timestamp: number
    /** Cache key used */
    key: string
}

/**
 * Statistics about the cache
 */
export interface LevelCacheStats {
    /** Number of entries currently cached */
    entryCount: number
    /** Phases that have cached results */
    cachedPhases: LevelCachePhase[]
    /** Number of cache hits during this session */
    hits: number
    /** Number of cache misses during this session */
    misses: number
}

/**
 * Extended options for level generation with cache settings
 */
export interface LevelGenerationOptionsWithCache extends LevelGenerationOptions {
    /** Enable caching of intermediate results (default: true) */
    enableCache?: boolean
    /** Maximum age of cache entries in milliseconds (default: 30 minutes) */
    cacheMaxAge?: number
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default level generation options
 */
const DEFAULT_LEVEL_OPTIONS: LevelGenerationOptionsWithCache = {
    difficulty: 'medium',
    controllerMode: 'ddr',
    rhythm: {},
    buttons: {},
    enableCache: true,
    cacheMaxAge: 30 * 60 * 1000, // 30 minutes
};

// ============================================================================
// LevelGenerator Class
// ============================================================================

/**
 * Level Generator
 *
 * Orchestrates the complete rhythm game level generation pipeline.
 * Takes audio input and produces playable ChartedBeatMap output.
 *
 * @example
 * ```typescript
 * // With caching enabled (default)
 * const generator = new LevelGenerator({
 *   difficulty: 'medium',
 *   controllerMode: 'ddr',
 *   enableCache: true,
 * });
 *
 * // First call computes and caches rhythm/pitch
 * const level1 = await generator.generate(audioBuffer, beatMap);
 *
 * // Second call reuses cached results (much faster)
 * const level2 = await generator.generate(audioBuffer, beatMap);
 *
 * // Clear cache when done with this audio
 * generator.clearCache();
 * ```
 */
export class LevelGenerator {
    private options: LevelGenerationOptionsWithCache;
    private buttonConfig: ButtonMappingConfig;

    // Cache storage
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private cacheHits: number = 0;
    private cacheMisses: number = 0;

    /**
     * Create a new LevelGenerator
     *
     * @param options - Generation options (partial, defaults applied)
     */
    constructor(options: Partial<LevelGenerationOptionsWithCache> = {}) {
        this.options = {
            ...DEFAULT_LEVEL_OPTIONS,
            ...options,
            rhythm: {
                ...DEFAULT_LEVEL_OPTIONS.rhythm,
                ...options.rhythm,
            },
            buttons: {
                ...DEFAULT_LEVEL_OPTIONS.buttons,
                ...options.buttons,
            },
        };

        // Build complete button mapping config
        this.buttonConfig = mergeButtonMappingConfig({
            ...this.options.buttons,
            difficulty: this.options.difficulty,
            controllerMode: this.options.controllerMode,
            seed: this.options.seed,
        });
    }

    /**
     * Get the current configuration
     */
    getOptions(): LevelGenerationOptionsWithCache {
        return { ...this.options };
    }

    // ============================================================================
    // Cache Management Methods
    // ============================================================================

    /**
     * Generate a cache key for a specific phase and inputs
     */
    private generateCacheKey(
        audioId: string,
        phase: LevelCachePhase,
        configFingerprint: string
    ): string {
        return `${audioId}:${phase}:${configFingerprint}`;
    }

    /**
     * Create a config fingerprint for cache invalidation
     * Only includes config options that affect the output
     */
    private createConfigFingerprint(phase: LevelCachePhase): string {
        const rhythmConfig = this.options.rhythm || {};

        if (phase === 'rhythm') {
            // Rhythm is affected by rhythm generation options
            return JSON.stringify({
                measureStartOffset: rhythmConfig.measureStartOffset,
                minimumTransientIntensity: rhythmConfig.minimumTransientIntensity,
                seed: rhythmConfig.seed,
            });
        }

        if (phase === 'pitch') {
            // Pitch analysis depends on which detector/algorithm is used and voicing threshold
            return JSON.stringify({
                pitchAlgorithm: this.options.pitchAlgorithm,
                crepeModelUrl: this.options.crepeModelUrl,
                voicingThreshold: this.options.voicingThreshold,
            });
        }

        return 'default';
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
        const maxAge = this.options.cacheMaxAge ?? DEFAULT_LEVEL_OPTIONS.cacheMaxAge!;
        if (age > maxAge) {
            this.cache.delete(key);
            this.cacheMisses++;
            return null;
        }

        this.cacheHits++;

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
        const maxAge = this.options.cacheMaxAge ?? DEFAULT_LEVEL_OPTIONS.cacheMaxAge!;
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): LevelCacheStats {
        const cachedPhases: LevelCachePhase[] = [];

        for (const [key] of this.cache.entries()) {
            const phase = key.split(':')[1] as LevelCachePhase;
            if (!cachedPhases.includes(phase)) {
                cachedPhases.push(phase);
            }
        }

        return {
            entryCount: this.cache.size,
            cachedPhases,
            hits: this.cacheHits,
            misses: this.cacheMisses,
        };
    }

    /**
     * Check if a phase result is cached for the given audio ID
     */
    isCached(audioId: string, phase: LevelCachePhase): boolean {
        const configFingerprint = this.createConfigFingerprint(phase);
        const key = this.generateCacheKey(audioId, phase, configFingerprint);
        return this.cache.has(key);
    }

    /**
     * Get the cache hit ratio (0-1)
     */
    getCacheHitRatio(): number {
        const total = this.cacheHits + this.cacheMisses;
        if (total === 0) return 0;
        return this.cacheHits / total;
    }

    // ============================================================================
    // Main Public API
    // ============================================================================

    /**
     * Generate a level for a specific difficulty
     *
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @param unifiedBeatMap - The unified beat map for measure/beat info
     * @param progressCallback - Optional callback for progress updates
     * @param signal - Optional AbortSignal for cancellation
     * @returns Generated level with playable chart
     * @throws {DOMException} If the operation is cancelled via signal
     */
    async generate(
        audioBuffer: AudioBuffer,
        unifiedBeatMap: UnifiedBeatMap,
        progressCallback?: LevelProgressCallback,
        signal?: AbortSignal
    ): Promise<GeneratedLevel> {
        const progress = (stage: LevelGenerationProgress['stage'], p: number, message: string) => {
            progressCallback?.({ stage, progress: p, message });
        };

        // Check for cancellation at start
        signal?.throwIfAborted();

        // Get audio ID for cache key
        const audioId = unifiedBeatMap.audioId;

        // Phase 1: Generate rhythm (with caching or use provided cached rhythm)
        progress('rhythm', 0, 'Starting rhythm generation...');

        let rhythm: GeneratedRhythm | null = null;

        // First check if a cached rhythm was provided via options
        if (this.options.cachedRhythm) {
            rhythm = this.options.cachedRhythm;
            progress('rhythm', 1, 'Using pre-generated rhythm from store');
        } else {
            // Otherwise use internal caching
            const rhythmCacheKey = this.generateCacheKey(
                audioId,
                'rhythm',
                this.createConfigFingerprint('rhythm')
            );

            rhythm = this.getFromCache<GeneratedRhythm>(rhythmCacheKey);

            if (rhythm) {
                progress('rhythm', 1, 'Rhythm loaded from cache');
            } else {
                rhythm = await this.generateRhythm(
                    audioBuffer,
                    unifiedBeatMap,
                    (phase, p, msg) => {
                        progress('rhythm', p, `[${phase}] ${msg}`);
                    },
                    signal
                );
                this.setCache(rhythmCacheKey, rhythm);
                progress('rhythm', 1, 'Rhythm generation complete');
            }
        }

        // Check for cancellation after rhythm generation
        signal?.throwIfAborted();

        // Phase 2: Analyze pitch (if enabled, with caching)
        let pitchAnalysis: MelodyContourAnalysisResult | null = null;

        if (this.buttonConfig.pitchInfluenceWeight > 0) {
            const pitchCacheKey = this.generateCacheKey(
                audioId,
                'pitch',
                this.createConfigFingerprint('pitch')
            );

            pitchAnalysis = this.getFromCache<MelodyContourAnalysisResult>(pitchCacheKey);

            if (pitchAnalysis) {
                progress('pitch', 1, 'Pitch analysis loaded from cache');
            } else {
                progress('pitch', 0, 'Starting pitch analysis...');
                pitchAnalysis = await this.analyzePitch(audioBuffer, rhythm, (p, msg) => {
                    progress('pitch', p, msg);
                });
                this.setCache(pitchCacheKey, pitchAnalysis);
                progress('pitch', 1, 'Pitch analysis complete');
            }
        } else {
            progress('pitch', 1, 'Pitch analysis skipped');
        }

        // Check for cancellation after pitch analysis
        signal?.throwIfAborted();

        // Phase 3: Map buttons
        progress('buttons', 0, 'Starting button mapping...');
        const mappedResult = this.mapButtons(rhythm, pitchAnalysis);
        progress('buttons', 1, 'Button mapping complete');

        // Check for cancellation after button mapping
        signal?.throwIfAborted();

        // Phase 4: Convert to ChartedBeatMap
        progress('conversion', 0, 'Converting to playable chart...');
        const chart = this.convertToChart(mappedResult, unifiedBeatMap);
        progress('conversion', 1, 'Chart conversion complete');

        // Check for cancellation before finalizing
        signal?.throwIfAborted();

        // Phase 5: Finalize
        progress('finalizing', 0, 'Finalizing level...');
        const level = this.buildLevel(chart, mappedResult, rhythm, pitchAnalysis);
        progress('finalizing', 1, 'Level generation complete');

        return level;
    }

    /**
     * Generate levels for all difficulties
     *
     * This method efficiently reuses cached rhythm and pitch analysis results
     * across all difficulty levels.
     *
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @param unifiedBeatMap - The unified beat map for measure/beat info
     * @param progressCallback - Optional callback for progress updates
     * @param signal - Optional AbortSignal for cancellation
     * @returns Generated levels for easy, medium, and hard
     * @throws {DOMException} If the operation is cancelled via signal
     */
    async generateAllDifficulties(
        audioBuffer: AudioBuffer,
        unifiedBeatMap: UnifiedBeatMap,
        progressCallback?: LevelProgressCallback,
        signal?: AbortSignal
    ): Promise<AllDifficultiesResult> {
        const difficulties: Exclude<DifficultyPreset, 'custom'>[] = ['easy', 'medium', 'hard', 'natural'];
        const results: Record<Exclude<DifficultyPreset, 'custom'> | 'natural', GeneratedLevel | null> = {
            easy: null,
            medium: null,
            hard: null,
            natural: null,
        };

        // Check for cancellation at start
        signal?.throwIfAborted();

        // Get audio ID for cache key
        const audioId = unifiedBeatMap.audioId;

        // Generate rhythm once (shared across difficulties, with caching or use provided cached rhythm)
        let rhythm: GeneratedRhythm | null = null;

        // First check if a cached rhythm was provided via options
        if (this.options.cachedRhythm) {
            rhythm = this.options.cachedRhythm;
        } else {
            // Otherwise use internal caching
            const rhythmCacheKey = this.generateCacheKey(
                audioId,
                'rhythm',
                this.createConfigFingerprint('rhythm')
            );

            rhythm = this.getFromCache<GeneratedRhythm>(rhythmCacheKey);

            if (!rhythm) {
                rhythm = await this.generateRhythm(audioBuffer, unifiedBeatMap, undefined, signal);
                this.setCache(rhythmCacheKey, rhythm);
            }
        }

        // Check for cancellation after rhythm generation
        signal?.throwIfAborted();

        // Analyze pitch once (shared across difficulties, with caching)
        let pitchAnalysis: MelodyContourAnalysisResult | null = null;

        if (this.buttonConfig.pitchInfluenceWeight > 0) {
            const pitchCacheKey = this.generateCacheKey(
                audioId,
                'pitch',
                this.createConfigFingerprint('pitch')
            );

            pitchAnalysis = this.getFromCache<MelodyContourAnalysisResult>(pitchCacheKey);

            if (!pitchAnalysis) {
                pitchAnalysis = await this.analyzePitch(audioBuffer, rhythm);
                this.setCache(pitchCacheKey, pitchAnalysis);
            }
        }

        // Check for cancellation after pitch analysis
        signal?.throwIfAborted();

        // Generate each difficulty
        for (let i = 0; i < difficulties.length; i++) {
            const difficulty = difficulties[i];
            progressCallback?.({
                stage: 'buttons',
                progress: i / difficulties.length,
                message: `Generating ${difficulty} chart...`,
            });

            // Check for cancellation before each difficulty
            signal?.throwIfAborted();

            // Create generator for this difficulty
            const diffGenerator = new LevelGenerator({
                ...this.options,
                difficulty,
                buttons: {
                    ...this.options.buttons,
                    difficulty,
                },
            });

            // Map buttons and convert
            const mappedResult = diffGenerator.mapButtons(rhythm, pitchAnalysis);
            const chart = diffGenerator.convertToChart(mappedResult, unifiedBeatMap);
            const level = diffGenerator.buildLevel(chart, mappedResult, rhythm, pitchAnalysis);

            results[difficulty] = level;
        }

        return {
            easy: results.easy!,
            medium: results.medium!,
            hard: results.hard!,
            natural: results.natural!,
        };
    }

    // ============================================================================
    // Pipeline Steps
    // ============================================================================

    /**
     * Phase 1: Generate rhythm from audio
     */
    private async generateRhythm(
        audioBuffer: AudioBuffer,
        unifiedBeatMap: UnifiedBeatMap,
        progressCallback?: (phase: string, progress: number, message: string) => void,
        signal?: AbortSignal
    ): Promise<GeneratedRhythm> {
        const rhythmGenerator = new RhythmGenerator(this.options.rhythm);

        const rhythm = await rhythmGenerator.generate(
            audioBuffer,
            unifiedBeatMap,
            signal,
            progressCallback ? (phase, progress, message) => {
                progressCallback(phase, progress, message);
            } : undefined
        );

        return rhythm;
    }

    /**
     * Phase 2: Analyze pitch on rhythm beats
     */
    private async analyzePitch(
        audioBuffer: AudioBuffer,
        generatedRhythm: GeneratedRhythm,
        progressCallback?: (progress: number, message: string) => void
    ): Promise<MelodyContourAnalysisResult> {
        progressCallback?.(0.1, 'Linking pitch to beats...');

        // Create pitch linker with pitch config propagated from LevelGenerationOptions
        const pitchLinkerConfig: PitchBeatLinkerConfig = {};
        if (this.options.pitchAlgorithm !== undefined) {
            pitchLinkerConfig.pitchAlgorithm = this.options.pitchAlgorithm;
        }
        if (this.options.crepeModelUrl !== undefined) {
            pitchLinkerConfig.crepeModelUrl = this.options.crepeModelUrl;
        }
        if (this.options.voicingThreshold !== undefined) {
            pitchLinkerConfig.pitchDetector = {
                ...pitchLinkerConfig.pitchDetector,
                voicingThreshold: this.options.voicingThreshold,
            };
        }
        const pitchLinker = new PitchBeatLinker(pitchLinkerConfig);

        // Link pitch to composite stream beats (fast path — no band-level analysis)
        const compositePitches = await pitchLinker.linkWithComposite(
            generatedRhythm.composite,
            audioBuffer
        );

        progressCallback?.(0.4, 'Analyzing melody contour...');

        // Analyze melody contour from composite pitches
        const contourAnalyzer = new MelodyContourAnalyzer();
        const contourResult = contourAnalyzer.analyze(compositePitches);

        progressCallback?.(0.8, 'Deriving variant pitches...');

        // Get the target difficulty level
        const difficultyLevel: DifficultyLevel = this.options.difficulty === 'custom' ? 'medium' : this.options.difficulty;

        // Derive variant pitches from enriched composite (with direction/interval from contour analysis)
        const variantPitches = pitchLinker.deriveVariantPitches(
            generatedRhythm.difficultyVariants[difficultyLevel],
            contourResult.pitchByBeat
        );

        // Return the full contour analysis with variant pitches for button mapping
        return {
            ...contourResult,
            pitchByBeat: variantPitches,
        };
    }

    /**
     * Phase 3: Map buttons to beats
     */
    private mapButtons(
        rhythm: GeneratedRhythm,
        pitchAnalysis: MelodyContourAnalysisResult | null
    ): MappedLevelResult {
        const buttonMapper = new ButtonMapper(this.buttonConfig);

        const difficulty: DifficultyLevel = this.options.difficulty === 'custom' ? 'medium' : this.options.difficulty;

        return buttonMapper.map(
            rhythm,
            difficulty,
            pitchAnalysis?.pitchByBeat
        );
    }

    /**
     * Phase 4: Convert to ChartedBeatMap
     */
    private convertToChart(
        mappedResult: MappedLevelResult,
        unifiedBeatMap: UnifiedBeatMap
    ): ChartedBeatMap {
        // Use BeatConverter.fromMappedResult for proper conversion
        return BeatConverter.fromMappedResult(
            mappedResult.variant,
            unifiedBeatMap,
            mappedResult.buttonMetadata,
            mappedResult.rhythmMetadata,
            mappedResult.keyAssignments,
            mappedResult.mappingSources,
            mappedResult.mappingPatternIds
        );
    }

    /**
     * Build the final GeneratedLevel result
     */
    private buildLevel(
        chart: ChartedBeatMap,
        mappedResult: MappedLevelResult,
        rhythm: GeneratedRhythm,
        pitchAnalysis: MelodyContourAnalysisResult | null
    ): GeneratedLevel {
        const metadata: LevelMetadata = {
            difficulty: this.options.difficulty,
            controllerMode: this.options.controllerMode,
            rhythmMetadata: mappedResult.rhythmMetadata,
            buttonMetadata: mappedResult.buttonMetadata,
            pitchMetadata: pitchAnalysis ? {
                melodyRange: pitchAnalysis.melodyContour.range.minNote !== 'N/A' ? {
                    min: pitchAnalysis.melodyContour.range.minNote,
                    max: pitchAnalysis.melodyContour.range.maxNote,
                } : null,
                directionStats: pitchAnalysis.directionStats,
                intervalStats: pitchAnalysis.intervalStats,
            } : null,
            chartMetadata: {
                totalBeats: chart.beats.length,
                detectedBeats: chart.detectedBeatIndices.length,
                generatedBeats: chart.beats.length - chart.detectedBeatIndices.length,
            },
            generationConfig: this.options,
        };

        return {
            chart,
            variant: mappedResult.variant,
            rhythm,
            pitchAnalysis,
            metadata,
        };
    }
}
