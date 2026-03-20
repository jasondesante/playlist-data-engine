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
import type { RhythmGenerationOptions, GeneratedRhythm, RhythmMetadata, Band } from './RhythmGenerator.js';
import { PitchBeatLinker } from './PitchBeatLinker.js';
import type { LinkedPitchAnalysis, PitchAtBeat } from './PitchBeatLinker.js';
import { MelodyContourAnalyzer } from '../analysis/MelodyContourAnalyzer.js';
import type { MelodyContourAnalysisResult } from '../analysis/MelodyContourAnalyzer.js';
import { ButtonMapper } from './ButtonMapper.js';
import type { MappedLevelResult, ButtonMappingMetadata } from './ButtonMapper.js';
import { BeatConverter } from './BeatConverter.js';
import type { ButtonMappingConfig, ControllerMode } from '../types/ButtonMapping.js';
import { mergeButtonMappingConfig } from '../types/ButtonMapping.js';
import type { DifficultyPreset } from '../types/BeatMap.js';
import type { UnifiedBeatMap } from '../types/BeatMap.js';
import type { ChartedBeatMap, ChartMetadata, PitchMetadata, RhythmMetadataSummary } from '../types/ChartedBeatMap.js';
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
    buttonMetadata: {
        keysUsed: string[]
        pitchInfluencedBeats: number
        patternsUsed: string[]
    }

    /** Pitch analysis metadata (if pitch detection was used) */
    pitchMetadata: {
        bandUsed: Band
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
}

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default level generation options
 */
const DEFAULT_LEVEL_OPTIONS: LevelGenerationOptions = {
    difficulty: 'medium',
    controllerMode: 'ddr',
    rhythm: {},
    buttons: {},
};

// ============================================================================
// LevelGenerator Class
// ============================================================================

/**
 * Level Generator
 *
 * Orchestrates the complete rhythm game level generation pipeline.
 * Takes audio input and produces playable ChartedBeatMap output.
 */
export class LevelGenerator {
    private options: LevelGenerationOptions;
    private buttonConfig: ButtonMappingConfig;

    /**
     * Create a new LevelGenerator
     *
     * @param options - Generation options (partial, defaults applied)
     */
    constructor(options: Partial<LevelGenerationOptions> = {}) {
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
        });
    }

    /**
     * Get the current configuration
     */
    getOptions(): LevelGenerationOptions {
        return { ...this.options };
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

        // Phase 1: Generate rhythm
        progress('rhythm', 0, 'Starting rhythm generation...');
        const rhythm = await this.generateRhythm(
            audioBuffer,
            unifiedBeatMap,
            (phase, p, msg) => {
                progress('rhythm', p, `[${phase}] ${msg}`);
            },
            signal
        );
        progress('rhythm', 1, 'Rhythm generation complete');

        // Check for cancellation after rhythm generation
        signal?.throwIfAborted();

        // Phase 2: Analyze pitch (if enabled)
        let pitchAnalysis: MelodyContourAnalysisResult | null = null;
        if (this.buttonConfig.pitchInfluenceWeight > 0) {
            progress('pitch', 0, 'Starting pitch analysis...');
            pitchAnalysis = await this.analyzePitch(audioBuffer, rhythm, (p, msg) => {
                progress('pitch', p, msg);
            });
            progress('pitch', 1, 'Pitch analysis complete');
        } else {
            progress('pitch', 1, 'Pitch analysis skipped (pitchInfluenceWeight = 0)');
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
        const difficulties: Exclude<DifficultyPreset, 'custom'>[] = ['easy', 'medium', 'hard'];
        const results: Record<Exclude<DifficultyPreset, 'custom'>, GeneratedLevel | null> = {
            easy: null,
            medium: null,
            hard: null,
        };

        // Check for cancellation at start
        signal?.throwIfAborted();

        // Generate rhythm once (shared across difficulties)
        const rhythm = await this.generateRhythm(audioBuffer, unifiedBeatMap, undefined, signal);

        // Check for cancellation after rhythm generation
        signal?.throwIfAborted();

        // Analyze pitch once (shared across difficulties)
        let pitchAnalysis: MelodyContourAnalysisResult | null = null;
        if (this.buttonConfig.pitchInfluenceWeight > 0) {
            pitchAnalysis = await this.analyzePitch(audioBuffer, rhythm);
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

        // Create pitch linker
        const pitchLinker = new PitchBeatLinker();

        // Link pitch to band streams
        const linkedAnalysis = pitchLinker.link(
            generatedRhythm.bandStreams,
            audioBuffer
        );

        progressCallback?.(0.4, 'Deriving composite pitches...');

        // Derive composite pitches from linked analysis
        const compositePitches = pitchLinker.deriveCompositePitches(
            generatedRhythm.composite,
            linkedAnalysis
        );

        progressCallback?.(0.6, 'Analyzing melody contour...');

        // Analyze melody contour
        const contourAnalyzer = new MelodyContourAnalyzer();

        // Analyze the linked pitches to get direction/interval
        const contourResult = contourAnalyzer.analyze(linkedAnalysis);

        progressCallback?.(0.8, 'Deriving variant pitches...');

        // Get the target difficulty level
        const difficultyLevel: DifficultyLevel = this.options.difficulty === 'custom' ? 'medium' : this.options.difficulty;

        // Derive variant pitches from composite with direction/interval
        const variantPitches = pitchLinker.deriveVariantPitches(
            generatedRhythm.difficultyVariants[difficultyLevel],
            compositePitches
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
            mappedResult.rhythmMetadata
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
            buttonMetadata: {
                keysUsed: mappedResult.buttonMetadata.keysUsed,
                pitchInfluencedBeats: mappedResult.buttonMetadata.pitchInfluencedBeats,
                patternsUsed: mappedResult.buttonMetadata.patternsUsed,
            },
            pitchMetadata: pitchAnalysis ? {
                bandUsed: pitchAnalysis.dominantBand,
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
