/**
 * Difficulty Variant Generator for Procedural Rhythm Generation
 *
 * Generates difficulty variants (easy/medium/hard) from the composite stream
 * by simplifying or enhancing density based on natural difficulty.
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 3.3
 */

import type { CompositeBeat, CompositeStream } from './CompositeStreamGenerator.js';
import type { NaturalDifficulty } from './DensityAnalyzer.js';
import type { GridType, GridDecision } from './RhythmQuantizer.js';
import type { PhraseAnalysisResult, RhythmicPhrase } from './PhraseAnalyzer.js';

// ============================================================================
// Extended Grid Types
// ============================================================================

/**
 * Extended grid type including simplified subdivisions for Easy difficulty
 *
 * - `straight_16th`: Standard 16th note grid (4 positions per beat: 0, 1, 2, 3)
 * - `triplet_8th`: 8th note triplet grid (3 positions per beat: 0, 1, 2)
 * - `straight_8th`: Standard 8th note grid (2 positions per beat: 0, 2) - Easy only
 * - `quarter_triplet`: Quarter note triplet (1 position per beat, triplet feel) - Easy only
 */
export type ExtendedGridType = GridType | 'straight_8th' | 'quarter_triplet';

/**
 * All possible grid types for reference
 */
export const ALL_GRID_TYPES: ExtendedGridType[] = [
    'straight_16th',
    'triplet_8th',
    'straight_8th',
    'quarter_triplet',
];

// ============================================================================
// Subdivision Limits by Difficulty
// ============================================================================

/**
 * Subdivision limits for each difficulty level
 *
 * This constant defines which grid types are allowed for each difficulty.
 * The primary constraint is that Easy difficulty excludes rapid subdivisions
 * (16th notes and 8th note triplets) to ensure appropriate playability.
 *
 * | Difficulty | Max Subdivision | Allowed Grid Types |
 * |------------|-----------------|-------------------|
 * | Easy | 8th notes, quarter triplets | `straight_8th`, `quarter_triplet` |
 * | Medium | 16th notes | All types |
 * | Hard | 16th notes | All types |
 *
 * @example
 * ```typescript
 * // Check if a grid type is allowed for a difficulty
 * const gridType: ExtendedGridType = 'straight_16th';
 * const difficulty: DifficultyLevel = 'easy';
 *
 * if (SUBDIVISION_LIMITS[difficulty].allowedGridTypes.includes(gridType)) {
 *   // Grid type is allowed
 * } else {
 *   // Need to simplify this beat
 * }
 * ```
 */
export const SUBDIVISION_LIMITS: Record<DifficultyLevel, SubdivisionLimitConfig> = {
    /**
     * Easy difficulty: Limited to 8th notes and quarter note triplets
     *
     * - No 16th notes (too rapid for beginners)
     * - No 8th note triplets (too rapid for beginners)
     * - 8th notes are the maximum density
     * - Quarter note triplets allowed for swing feel
     */
    easy: {
        maxSubdivision: 'eighth',
        allowedGridTypes: ['straight_8th', 'quarter_triplet'],
        description: '8th notes and quarter note triplets only',
    },

    /**
     * Medium difficulty: All subdivision types allowed
     *
     * - 16th notes allowed
     * - 8th note triplets allowed
     * - All grid types available
     */
    medium: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'All subdivision types including 16th notes',
    },

    /**
     * Hard difficulty: All subdivision types allowed
     *
     * - 16th notes allowed
     * - 8th note triplets allowed
     * - All grid types available
     * - Maximum density expected
     */
    hard: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'All subdivision types including 16th notes',
    },
};

// ============================================================================
// Types
// ============================================================================

/**
 * Difficulty level for rhythm variants
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * Maximum subdivision type
 */
export type MaxSubdivision = 'eighth' | 'sixteenth';

/**
 * Configuration for subdivision limits at a difficulty level
 */
export interface SubdivisionLimitConfig {
    /** Maximum subdivision allowed at this difficulty */
    maxSubdivision: MaxSubdivision;

    /** Grid types allowed at this difficulty */
    allowedGridTypes: ExtendedGridType[];

    /** Human-readable description of the limits */
    description: string;
}

/**
 * Type of edit applied to create a difficulty variant
 */
export type EditType = 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';

/**
 * A difficulty variant of the composite stream
 */
export interface DifficultyVariant {
    /** The difficulty level of this variant */
    difficulty: DifficultyLevel;

    /** The beats in this variant */
    beats: CompositeBeat[];

    /** Whether this variant is unedited from the composite */
    isUnedited: boolean;

    /** Type of edit applied (if any) */
    editType: EditType;

    /** How much was changed (0 = no changes, 1 = heavily modified) */
    editAmount: number;

    /** IDs of patterns inserted (if editType is 'pattern_inserted') */
    patternsInserted?: string[];

    /** Metadata about subdivision conversions */
    conversionMetadata?: SubdivisionConversionMetadata;

    /** Metadata about density enhancement */
    enhancementMetadata?: EnhancementMetadata;
}

/**
 * Metadata about subdivision conversions during simplification
 */
export interface SubdivisionConversionMetadata {
    /** Number of beats converted from 16th to 8th */
    sixteenthToEighth: number;

    /** Number of beats converted from 8th triplet to quarter triplet */
    tripletToQuarterTriplet: number;

    /** Number of beats that were removed entirely */
    beatsRemoved: number;

    /** Total beats before conversion */
    totalBeatsBefore: number;

    /** Total beats after conversion */
    totalBeatsAfter: number;
}

/**
 * Metadata about density enhancement during variant generation
 */
export interface EnhancementMetadata {
    /** Total beats before enhancement */
    totalBeatsBefore: number;

    /** Total beats after enhancement */
    totalBeatsAfter: number;

    /** Number of beats added via pattern insertion */
    patternsInserted: number;

    /** Number of beats added via grid interpolation */
    interpolatedBeats: number;

    /** IDs of patterns that were inserted */
    insertedPatternIds: string[];

    /** Target density multiplier that was applied */
    densityMultiplier: number;
}

/**
 * Result of validating a variant against subdivision limits
 */
export interface SubdivisionValidationResult {
    /** Whether the variant passes validation */
    isValid: boolean;

    /** Beats that violate the subdivision limits */
    violations: SubdivisionViolation[];

    /** Total number of beats checked */
    totalBeats: number;

    /** Number of violating beats */
    violationCount: number;
}

/**
 * A single subdivision violation
 */
export interface SubdivisionViolation {
    /** The beat that violates the limits */
    beat: CompositeBeat;

    /** The grid type that is not allowed */
    gridType: GridType;

    /** Suggested conversion target */
    suggestedConversion: ExtendedGridType;
}

/**
 * Configuration for difficulty variant generation
 */
export interface DifficultyVariantConfig {
    /** Whether to log subdivision conversions for debugging. Default: false */
    logConversions: boolean;

    /** Whether to preserve phrase boundaries when simplifying. Default: true */
    preservePhraseBoundaries: boolean;

    /** Minimum intensity threshold for keeping beats during simplification. Default: 0.3 */
    simplificationIntensityThreshold: number;

    /** Intensity threshold for keeping beats during HEAVY simplification. Default: 0.5 */
    heavySimplificationIntensityThreshold: number;

    /** Target density multiplier for enhancement (1.0 = no change, 1.5 = 50% more beats). Default: 1.5 */
    enhancementDensityMultiplier: number;

    /** Intensity for interpolated beats (0.0 - 1.0). Default: 0.5 */
    interpolatedBeatIntensity: number;

    /** Whether to prefer pattern insertion over simple interpolation. Default: true */
    preferPatternInsertion: boolean;

    /** Maximum phrase size to consider for pattern insertion (in beats). Default: 4 */
    maxPatternInsertionSize: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DIFFICULTY_VARIANT_CONFIG: DifficultyVariantConfig = {
    logConversions: false,
    preservePhraseBoundaries: true,
    simplificationIntensityThreshold: 0.3,
    heavySimplificationIntensityThreshold: 0.5,
    enhancementDensityMultiplier: 1.5,
    interpolatedBeatIntensity: 0.5,
    preferPatternInsertion: true,
    maxPatternInsertionSize: 4,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a grid type is allowed for a given difficulty
 *
 * @param gridType - The grid type to check
 * @param difficulty - The difficulty level
 * @returns True if the grid type is allowed
 */
export function isGridTypeAllowed(gridType: GridType, difficulty: DifficultyLevel): boolean {
    return SUBDIVISION_LIMITS[difficulty].allowedGridTypes.includes(gridType);
}

/**
 * Get the allowed grid types for a difficulty level
 *
 * @param difficulty - The difficulty level
 * @returns Array of allowed grid types
 */
export function getAllowedGridTypes(difficulty: DifficultyLevel): ExtendedGridType[] {
    return [...SUBDIVISION_LIMITS[difficulty].allowedGridTypes];
}

/**
 * Convert a grid type to the closest allowed type for a difficulty
 *
 * Conversion rules for Easy difficulty:
 * - `straight_16th` → `straight_8th` (snap to nearest 8th note)
 * - `triplet_8th` → `quarter_triplet` (snap to quarter note triplet)
 *
 * @param gridType - The original grid type
 * @param difficulty - The target difficulty
 * @returns The converted grid type (or original if already allowed)
 */
export function convertToAllowedGridType(
    gridType: GridType,
    difficulty: DifficultyLevel
): ExtendedGridType {
    // If already allowed, return as-is
    if (isGridTypeAllowed(gridType, difficulty)) {
        return gridType;
    }

    // Conversion rules for Easy difficulty
    if (difficulty === 'easy') {
        switch (gridType) {
            case 'straight_16th':
                return 'straight_8th';
            case 'triplet_8th':
                return 'quarter_triplet';
            default:
                return gridType;
        }
    }

    // For Medium and Hard, all types are allowed
    return gridType;
}

/**
 * Map natural difficulty to difficulty level
 *
 * @param naturalDifficulty - The natural difficulty from density analysis
 * @returns The corresponding difficulty level
 */
export function naturalDifficultyToLevel(naturalDifficulty: NaturalDifficulty): DifficultyLevel {
    return naturalDifficulty;
}

/**
 * Validate a list of beats against subdivision limits for a difficulty
 *
 * @param beats - The beats to validate
 * @param difficulty - The difficulty level to validate against
 * @returns Validation result with any violations
 */
export function validateSubdivisionLimits(
    beats: CompositeBeat[],
    difficulty: DifficultyLevel
): SubdivisionValidationResult {
    const violations: SubdivisionViolation[] = [];
    const allowedTypes = SUBDIVISION_LIMITS[difficulty].allowedGridTypes;

    for (const beat of beats) {
        if (!allowedTypes.includes(beat.gridType)) {
            violations.push({
                beat,
                gridType: beat.gridType,
                suggestedConversion: convertToAllowedGridType(beat.gridType, difficulty),
            });
        }
    }

    return {
        isValid: violations.length === 0,
        violations,
        totalBeats: beats.length,
        violationCount: violations.length,
    };
}

// ============================================================================
// DifficultyVariantGenerator Class
// ============================================================================

/**
 * Generates difficulty variants from a composite stream
 *
 * ## Algorithm Overview
 *
 * 1. **Determine Variants to Generate**: Based on the composite's natural difficulty,
 *    determine which variants need editing vs. remain unedited.
 *
 * 2. **Simplification** (for dense composites needing easier difficulties):
 *    - Enforce subdivision limits (primary constraint for Easy)
 *    - Prioritize keeping transients on strong beats (1, 3)
 *    - Remove offbeat subdivisions first
 *    - Snap removed subdivisions to nearest allowed grid
 *
 * 3. **Density Enhancement** (for sparse composites needing harder difficulties):
 *    - First priority: Insert detected patterns from phrase library
 *    - Fallback: Simple grid interpolation
 *
 * ## Usage
 *
 * ```typescript
 * const generator = new DifficultyVariantGenerator();
 * const variants = generator.generate(composite, phraseAnalysis);
 *
 * // Access each variant
 * const easyVariant = variants.easy;
 * const mediumVariant = variants.medium;
 * const hardVariant = variants.hard;
 *
 * // Check if a variant was edited
 * console.log('Easy was simplified:', easyVariant.editType === 'simplified');
 * console.log('Medium is unedited:', mediumVariant.isUnedited);
 * ```
 */
export class DifficultyVariantGenerator {
    private config: DifficultyVariantConfig;

    constructor(config: Partial<DifficultyVariantConfig> = {}) {
        this.config = { ...DEFAULT_DIFFICULTY_VARIANT_CONFIG, ...config };
    }

    /**
     * Generate all three difficulty variants from a composite stream
     *
     * After generation, each variant is validated against its subdivision limits
     * to ensure compliance.
     *
     * @param composite - The composite stream from CompositeStreamGenerator
     * @param phraseAnalysis - Optional phrase analysis for pattern library access
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @returns Object containing easy, medium, and hard variants
     */
    generate(
        composite: CompositeStream,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): {
        easy: DifficultyVariant;
        medium: DifficultyVariant;
        hard: DifficultyVariant;
    } {
        const naturalDifficulty = composite.naturalDifficulty;

        // Generate variants based on natural difficulty
        const easy = this.generateVariant(composite, 'easy', naturalDifficulty, phraseAnalysis, gridDecisions);
        const medium = this.generateVariant(composite, 'medium', naturalDifficulty, phraseAnalysis, gridDecisions);
        const hard = this.generateVariant(composite, 'hard', naturalDifficulty, phraseAnalysis, gridDecisions);

        // Validate all variants against subdivision limits
        this.validateVariant(easy, 'easy');
        this.validateVariant(medium, 'medium');
        this.validateVariant(hard, 'hard');

        return { easy, medium, hard };
    }

    /**
     * Validate a generated variant against its subdivision limits
     *
     * This ensures that all generated variants comply with their respective
     * difficulty's subdivision constraints. Logs warnings if violations are found.
     *
     * @param variant - The variant to validate
     * @param difficulty - The difficulty level
     */
    private validateVariant(variant: DifficultyVariant, difficulty: DifficultyLevel): void {
        const validation = validateSubdivisionLimits(variant.beats, difficulty);

        if (!validation.isValid) {
            // Log warning about validation failures
            console.warn(
                `[DifficultyVariantGenerator] ${difficulty} variant has ${validation.violationCount} ` +
                `subdivision violations out of ${validation.totalBeats} beats. ` +
                `This indicates a bug in the variant generation logic.`
            );

            if (this.config.logConversions) {
                // Log details of violations
                for (const violation of validation.violations.slice(0, 5)) {
                    console.warn(
                        `  - Beat at index ${violation.beat.beatIndex}, ` +
                        `position ${violation.beat.gridPosition}, ` +
                        `grid: ${violation.gridType} (suggested: ${violation.suggestedConversion})`
                    );
                }
                if (validation.violations.length > 5) {
                    console.warn(`  ... and ${validation.violations.length - 5} more violations`);
                }
            }
        } else if (this.config.logConversions) {
            console.log(
                `[DifficultyVariantGenerator] ${difficulty} variant validated: ` +
                `${validation.totalBeats} beats, no subdivision violations`
            );
        }
    }

    /**
     * Generate a single difficulty variant
     *
     * @param composite - The composite stream
     * @param targetDifficulty - The target difficulty level
     * @param naturalDifficulty - The natural difficulty of the composite
     * @param phraseAnalysis - Optional phrase analysis for pattern library access
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @returns The difficulty variant
     */
    private generateVariant(
        composite: CompositeStream,
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): DifficultyVariant {
        const isNatural = targetDifficulty === naturalDifficulty;

        if (isNatural) {
            // This variant is the unedited composite
            return {
                difficulty: targetDifficulty,
                beats: [...composite.beats],
                isUnedited: true,
                editType: 'none',
                editAmount: 0,
            };
        }

        // Determine what kind of edit is needed
        const needsSimplification = this.needsSimplification(targetDifficulty, naturalDifficulty);
        const needsEnhancement = this.needsEnhancement(targetDifficulty, naturalDifficulty);

        if (needsSimplification) {
            // Determine if this is heavy simplification (2 levels down: hard -> easy)
            const isHeavySimplification = this.isHeavySimplification(targetDifficulty, naturalDifficulty);

            // Simplify beats to meet subdivision limits, respecting phrase boundaries if enabled
            const result = this.simplifyBeats(
                composite.beats,
                targetDifficulty,
                isHeavySimplification,
                phraseAnalysis
            );

            return {
                difficulty: targetDifficulty,
                beats: result.beats,
                isUnedited: false,
                editType: 'simplified',
                editAmount: result.metadata.totalBeatsBefore > 0
                    ? (result.metadata.totalBeatsBefore - result.metadata.totalBeatsAfter) / result.metadata.totalBeatsBefore
                    : 0,
                conversionMetadata: result.metadata,
            };
        }

        if (needsEnhancement) {
            // Determine enhancement level based on how many steps up we're going
            const enhancementLevel = this.getEnhancementLevel(targetDifficulty, naturalDifficulty);

            // Enhance beats using pattern library and interpolation
            const result = this.enhanceBeats(
                composite.beats,
                targetDifficulty,
                enhancementLevel,
                phraseAnalysis,
                gridDecisions
            );

            // Determine edit type based on what was actually done
            const editType = result.metadata.patternsInserted > 0 ? 'pattern_inserted' : 'interpolated';

            return {
                difficulty: targetDifficulty,
                beats: result.beats,
                isUnedited: false,
                editType,
                editAmount: result.metadata.totalBeatsBefore > 0
                    ? (result.metadata.totalBeatsAfter - result.metadata.totalBeatsBefore) / result.metadata.totalBeatsBefore
                    : 0,
                patternsInserted: result.metadata.insertedPatternIds.length > 0
                    ? result.metadata.insertedPatternIds
                    : undefined,
                enhancementMetadata: result.metadata,
            };
        }

        // Default: return unedited
        return {
            difficulty: targetDifficulty,
            beats: [...composite.beats],
            isUnedited: true,
            editType: 'none',
            editAmount: 0,
        };
    }

    /**
     * Simplify beats to meet subdivision limits for a target difficulty
     *
     * This method converts beats that violate subdivision limits to allowed grid types:
     * - `straight_16th` → `straight_8th` (snap 16th notes to nearest 8th note)
     * - `triplet_8th` → `quarter_triplet` (snap 8th triplets to quarter note triplet)
     *
     * For heavy simplification (hard -> easy), additional beat prioritization is applied:
     * - Prioritize keeping transients on strong beats (beats 1 and 3 of each measure)
     * - Remove offbeat subdivisions first (gridPosition 1 and 3)
     * - Keep only core beats (high intensity or on strong beats)
     *
     * After conversion, duplicate beats at the same grid position are deduplicated
     * (keeping the highest intensity).
     *
     * @param beats - The beats to simplify
     * @param targetDifficulty - The target difficulty level
     * @param isHeavySimplification - Whether this is heavy simplification (hard -> easy)
     * @param phraseAnalysis - Optional phrase analysis for preserving phrase boundaries
     * @returns Simplified beats with conversion metadata
     */
    private simplifyBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        isHeavySimplification: boolean = false,
        phraseAnalysis?: PhraseAnalysisResult
    ): { beats: CompositeBeat[]; metadata: SubdivisionConversionMetadata } {
        const metadata: SubdivisionConversionMetadata = {
            sixteenthToEighth: 0,
            tripletToQuarterTriplet: 0,
            beatsRemoved: 0,
            totalBeatsBefore: beats.length,
            totalBeatsAfter: 0,
        };

        // Build phrase membership map for boundary preservation
        const phraseMembership = this.buildPhraseMembershipMap(phraseAnalysis);

        // If all grid types are allowed, no conversion needed
        const allowedTypes = SUBDIVISION_LIMITS[targetDifficulty].allowedGridTypes;
        const allTypesAllowed = beats.every(b => allowedTypes.includes(b.gridType));

        if (allTypesAllowed && !isHeavySimplification) {
            metadata.totalBeatsAfter = beats.length;
            return { beats: [...beats], metadata };
        }

        // For heavy simplification, filter beats based on priority
        let beatsToProcess = beats;
        if (isHeavySimplification) {
            beatsToProcess = this.filterBeatsForHeavySimplification(beats, metadata, phraseMembership);
        }

        // Convert each beat to allowed grid type
        const convertedBeats: CompositeBeat[] = [];

        for (const beat of beatsToProcess) {
            if (allowedTypes.includes(beat.gridType)) {
                // Beat already allowed, keep as-is
                convertedBeats.push(beat);
                continue;
            }

            // Convert the beat
            const convertedBeat = this.convertBeatGridType(beat, targetDifficulty);

            if (convertedBeat) {
                convertedBeats.push(convertedBeat);

                // Track conversion type
                if (beat.gridType === 'straight_16th') {
                    metadata.sixteenthToEighth++;
                    if (this.config.logConversions) {
                        console.log(
                            `[DifficultyVariantGenerator] Converted 16th note at beat ${beat.beatIndex} ` +
                            `position ${beat.gridPosition} to 8th note`
                        );
                    }
                } else if (beat.gridType === 'triplet_8th') {
                    metadata.tripletToQuarterTriplet++;
                    if (this.config.logConversions) {
                        console.log(
                            `[DifficultyVariantGenerator] Converted 8th triplet at beat ${beat.beatIndex} ` +
                            `position ${beat.gridPosition} to quarter triplet`
                        );
                    }
                }
            } else {
                // Beat was removed (e.g., couldn't convert)
                metadata.beatsRemoved++;
                if (this.config.logConversions) {
                    console.log(
                        `[DifficultyVariantGenerator] Removed beat at beat ${beat.beatIndex} ` +
                        `position ${beat.gridPosition} (grid: ${beat.gridType})`
                    );
                }
            }
        }

        // Deduplicate beats that may have snapped to the same grid position
        const deduplicatedBeats = this.deduplicateConvertedBeats(convertedBeats);
        metadata.beatsRemoved += convertedBeats.length - deduplicatedBeats.length;
        metadata.totalBeatsAfter = deduplicatedBeats.length;

        return { beats: deduplicatedBeats, metadata };
    }

    /**
     * Filter beats for heavy simplification (hard -> easy)
     *
     * Implements beat prioritization:
     * 1. Strong beats (beats 1 and 3 of each measure) are always kept
     * 2. Downbeats (gridPosition 0) on weak beats are kept if high intensity
     * 3. Offbeats (gridPosition 1, 2, 3) are only kept if very high intensity
     * 4. Beats part of significant phrases get additional consideration
     *
     * In 4/4 time with 0-indexed beats:
     * - Beat 0, 4, 8... = Beat 1 of measure (strong)
     * - Beat 2, 6, 10... = Beat 3 of measure (strong)
     * - Beat 1, 5, 9... = Beat 2 of measure (weak)
     * - Beat 3, 7, 11... = Beat 4 of measure (weak)
     *
     * @param beats - The beats to filter
     * @param metadata - Metadata object to track removals
     * @param phraseMembership - Map of beat indices to phrase membership
     * @returns Filtered beats
     */
    private filterBeatsForHeavySimplification(
        beats: CompositeBeat[],
        metadata: SubdivisionConversionMetadata,
        phraseMembership: Map<number, RhythmicPhrase[]> = new Map()
    ): CompositeBeat[] {
        const threshold = this.config.heavySimplificationIntensityThreshold;
        const keptBeats: CompositeBeat[] = [];

        for (const beat of beats) {
            const isStrongBeat = this.isStrongBeat(beat.beatIndex);
            const isDownbeat = beat.gridPosition === 0;
            const isOffbeat = beat.gridPosition === 1 || beat.gridPosition === 3;

            // Check if beat should be preserved due to phrase membership
            const shouldPreservePhrase = this.shouldPreserveForPhrase(beat, phraseMembership, threshold);

            if (isStrongBeat) {
                // Always keep beats on strong beats (1 and 3 of measure)
                keptBeats.push(beat);
            } else if (shouldPreservePhrase) {
                // Keep beats that are part of significant phrases
                keptBeats.push(beat);
            } else if (isDownbeat && beat.intensity >= threshold * 0.7) {
                // Keep downbeats on weak beats if reasonably high intensity
                keptBeats.push(beat);
            } else if (isOffbeat && beat.intensity >= threshold) {
                // Only keep offbeats if very high intensity
                keptBeats.push(beat);
            } else if (beat.gridPosition === 2 && beat.intensity >= threshold * 0.8) {
                // Grid position 2 is the "and" of the beat - keep if high intensity
                keptBeats.push(beat);
            } else {
                // Remove this beat
                metadata.beatsRemoved++;
                if (this.config.logConversions) {
                    console.log(
                        `[DifficultyVariantGenerator] Heavy simplification: removed beat at ` +
                        `beat ${beat.beatIndex} position ${beat.gridPosition} ` +
                        `(intensity: ${beat.intensity.toFixed(2)}, strongBeat: ${isStrongBeat})`
                    );
                }
            }
        }

        return keptBeats;
    }

    /**
     * Determine if a beat index is on a strong beat (beat 1 or 3 of a measure)
     *
     * In 4/4 time with 0-indexed beats:
     * - Beat indices 0, 4, 8, 12... are beat 1 of their measure
     * - Beat indices 2, 6, 10, 14... are beat 3 of their measure
     *
     * @param beatIndex - The beat index (0-indexed)
     * @returns True if this is a strong beat
     */
    private isStrongBeat(beatIndex: number): boolean {
        const positionInMeasure = beatIndex % 4;
        return positionInMeasure === 0 || positionInMeasure === 2;
    }

    /**
     * Convert a single beat to an allowed grid type
     *
     * Conversion rules for Easy difficulty:
     * - `straight_16th` (4 positions: 0, 1, 2, 3) → `straight_8th` (2 positions: 0, 2)
     *   - Position 0 → 0 (quarter note)
     *   - Position 1 → 0 (snaps back to quarter)
     *   - Position 2 → 2 (8th note)
     *   - Position 3 → 2 (snaps to 8th)
     *
     * - `triplet_8th` (3 positions: 0, 1, 2) → `quarter_triplet` (1 position: 0)
     *   - All positions snap to 0 (quarter triplet)
     *
     * @param beat - The beat to convert
     * @param targetDifficulty - The target difficulty
     * @returns The converted beat, or null if the beat should be removed
     */
    private convertBeatGridType(
        beat: CompositeBeat,
        targetDifficulty: DifficultyLevel
    ): CompositeBeat | null {
        const targetGridType = convertToAllowedGridType(beat.gridType, targetDifficulty);

        // If no conversion needed, return as-is
        if (targetGridType === beat.gridType) {
            return beat;
        }

        // Calculate new grid position and timestamp based on conversion
        let newGridPosition: number;
        let timestampAdjustment: number;

        switch (beat.gridType) {
            case 'straight_16th': {
                // 16th → 8th conversion
                // Positions: 0→0, 1→0 (snap to quarter), 2→2, 3→2 (snap to 8th)
                if (beat.gridPosition === 1 || beat.gridPosition === 3) {
                    // These are off-beat 16ths that snap to the previous grid point
                    newGridPosition = beat.gridPosition === 1 ? 0 : 2;
                } else {
                    newGridPosition = beat.gridPosition;
                }
                // Calculate timestamp adjustment
                // 16th note interval = quarterInterval / 4
                // 8th note interval = quarterInterval / 2
                // We need to adjust based on original vs new position
                // Since we don't have quarterNoteInterval here, we estimate from beat timing
                // For now, we'll set the new grid position and keep the beat structure
                timestampAdjustment = 0; // Will be recalculated during deduplication
                break;
            }

            case 'triplet_8th': {
                // 8th triplet → quarter triplet conversion
                // All positions snap to 0 (the quarter triplet)
                newGridPosition = 0;
                timestampAdjustment = 0;
                break;
            }

            default:
                // Unknown grid type, keep as-is
                return beat;
        }

        // Return the converted beat with updated grid type and position
        return {
            ...beat,
            gridType: targetGridType as GridType, // Cast back to GridType for compatibility
            gridPosition: newGridPosition,
            // Note: timestamp will be corrected during deduplication if needed
        };
    }

    /**
     * Deduplicate converted beats that may have snapped to the same grid position
     *
     * After conversion, multiple beats may end up at the same (beatIndex, gridPosition, gridType).
     * This method keeps only the highest-intensity beat at each position.
     *
     * @param beats - Converted beats (may have duplicates)
     * @returns Deduplicated beats
     */
    private deduplicateConvertedBeats(beats: CompositeBeat[]): CompositeBeat[] {
        const beatMap = new Map<string, CompositeBeat>();

        for (const beat of beats) {
            // Create a unique key for this grid position
            const key = `${beat.beatIndex}:${beat.gridPosition}:${beat.gridType}`;

            const existing = beatMap.get(key);
            if (!existing || beat.intensity > existing.intensity) {
                // Either no beat at this position, or this one is stronger
                beatMap.set(key, beat);
            }
        }

        // Convert map back to array and sort by timestamp
        return Array.from(beatMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Determine if simplification is needed
     *
     * @param targetDifficulty - The target difficulty
     * @param naturalDifficulty - The natural difficulty of the composite
     * @returns True if simplification is needed
     */
    private needsSimplification(
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty
    ): boolean {
        const difficultyOrder: DifficultyLevel[] = ['easy', 'medium', 'hard'];
        const targetIndex = difficultyOrder.indexOf(targetDifficulty);
        const naturalIndex = difficultyOrder.indexOf(naturalDifficulty);

        return targetIndex < naturalIndex;
    }

    /**
     * Determine if enhancement is needed
     *
     * @param targetDifficulty - The target difficulty
     * @param naturalDifficulty - The natural difficulty of the composite
     * @returns True if enhancement is needed
     */
    private needsEnhancement(
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty
    ): boolean {
        const difficultyOrder: DifficultyLevel[] = ['easy', 'medium', 'hard'];
        const targetIndex = difficultyOrder.indexOf(targetDifficulty);
        const naturalIndex = difficultyOrder.indexOf(naturalDifficulty);

        return targetIndex > naturalIndex;
    }

    /**
     * Determine if this is heavy simplification (2 levels down)
     *
     * Heavy simplification occurs when going from hard -> easy (skipping medium).
     * This requires more aggressive beat removal - keeping only core beats.
     *
     * @param targetDifficulty - The target difficulty
     * @param naturalDifficulty - The natural difficulty of the composite
     * @returns True if this is heavy simplification
     */
    private isHeavySimplification(
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty
    ): boolean {
        return naturalDifficulty === 'hard' && targetDifficulty === 'easy';
    }

    /**
     * Get the enhancement level based on how many steps up we're going
     *
     * @param targetDifficulty - The target difficulty
     * @param naturalDifficulty - The natural difficulty of the composite
     * @returns 'moderate' for 1 step up, 'heavy' for 2 steps up
     */
    private getEnhancementLevel(
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty
    ): 'moderate' | 'heavy' {
        const difficultyOrder: DifficultyLevel[] = ['easy', 'medium', 'hard'];
        const targetIndex = difficultyOrder.indexOf(targetDifficulty);
        const naturalIndex = difficultyOrder.indexOf(naturalDifficulty);
        const stepsUp = targetIndex - naturalIndex;

        return stepsUp >= 2 ? 'heavy' : 'moderate';
    }

    /**
     * Enhance beats by adding density through pattern insertion and interpolation
     *
     * ## Algorithm Overview
     *
     * 1. **Pattern Insertion** (first priority):
     *    - Look for suitable patterns from the phrase library
     *    - Insert patterns at beats that have low density
     *    - Patterns are song-specific and more interesting than simple interpolation
     *
     * 2. **Grid Interpolation** (fallback):
     *    - For beats where no pattern matches, interpolate additional subdivisions
     *    - Respect per-beat grid decisions (16th vs triplet) from Phase 1
     *    - Add beats at intermediate grid positions
     *
     * @param beats - The beats to enhance
     * @param targetDifficulty - The target difficulty level
     * @param enhancementLevel - Whether this is moderate or heavy enhancement
     * @param phraseAnalysis - Optional phrase analysis for pattern library
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @returns Enhanced beats with metadata
     */
    private enhanceBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        enhancementLevel: 'moderate' | 'heavy',
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): { beats: CompositeBeat[]; metadata: EnhancementMetadata } {
        const metadata: EnhancementMetadata = {
            totalBeatsBefore: beats.length,
            totalBeatsAfter: 0,
            patternsInserted: 0,
            interpolatedBeats: 0,
            insertedPatternIds: [],
            densityMultiplier: this.config.enhancementDensityMultiplier,
        };

        // Adjust density multiplier based on enhancement level
        const densityMultiplier = enhancementLevel === 'heavy'
            ? this.config.enhancementDensityMultiplier * 1.5
            : this.config.enhancementDensityMultiplier;

        metadata.densityMultiplier = densityMultiplier;

        // If no beats to enhance, return empty
        if (beats.length === 0) {
            metadata.totalBeatsAfter = 0;
            return { beats: [], metadata };
        }

        // Group beats by beatIndex for analysis
        const beatsByIndex = this.groupBeatsByIndex(beats);

        // Calculate target beats per beat index based on multiplier
        const targetBeatsPerBeat = this.calculateTargetBeatsPerBeat(beatsByIndex, densityMultiplier);

        // Create enhanced beats array
        const enhancedBeats: CompositeBeat[] = [];

        // Process each beat index
        const maxBeatIndex = Math.max(...Array.from(beatsByIndex.keys()));

        for (let beatIndex = 0; beatIndex <= maxBeatIndex; beatIndex++) {
            const existingBeats = beatsByIndex.get(beatIndex) ?? [];
            const targetCount = targetBeatsPerBeat.get(beatIndex) ?? existingBeats.length;

            if (existingBeats.length >= targetCount) {
                // Already at or above target, keep existing beats
                enhancedBeats.push(...existingBeats);
                continue;
            }

            // Need to add beats
            const beatsToAdd = targetCount - existingBeats.length;

            // Try pattern insertion first (if enabled and phrase analysis available)
            let addedFromPattern = 0;
            if (this.config.preferPatternInsertion && phraseAnalysis) {
                const patternResult = this.tryInsertPattern(
                    existingBeats,
                    beatIndex,
                    beatsToAdd,
                    phraseAnalysis,
                    enhancedBeats
                );
                addedFromPattern = patternResult.beatsAdded;
                if (patternResult.patternId) {
                    metadata.patternsInserted++;
                    metadata.insertedPatternIds.push(patternResult.patternId);
                }
            }

            // If pattern insertion didn't add enough beats, use interpolation
            if (addedFromPattern < beatsToAdd) {
                const interpolatedBeats = this.interpolateBeats(
                    existingBeats,
                    beatIndex,
                    beatsToAdd - addedFromPattern,
                    gridDecisions
                );
                enhancedBeats.push(...interpolatedBeats);
                metadata.interpolatedBeats += interpolatedBeats.length;
            }

            // Add original beats
            enhancedBeats.push(...existingBeats);
        }

        // Sort and deduplicate
        const sortedBeats = enhancedBeats.sort((a, b) => {
            if (a.beatIndex !== b.beatIndex) return a.beatIndex - b.beatIndex;
            return a.gridPosition - b.gridPosition;
        });

        const deduplicatedBeats = this.deduplicateEnhancedBeats(sortedBeats);

        metadata.totalBeatsAfter = deduplicatedBeats.length;

        if (this.config.logConversions) {
            console.log(
                `[DifficultyVariantGenerator] Enhanced beats for ${targetDifficulty}: ` +
                `${metadata.totalBeatsBefore} → ${metadata.totalBeatsAfter} beats ` +
                `(patterns: ${metadata.patternsInserted}, interpolated: ${metadata.interpolatedBeats})`
            );
        }

        return { beats: deduplicatedBeats, metadata };
    }

    /**
     * Group beats by their beat index
     */
    private groupBeatsByIndex(beats: CompositeBeat[]): Map<number, CompositeBeat[]> {
        const map = new Map<number, CompositeBeat[]>();

        for (const beat of beats) {
            const existing = map.get(beat.beatIndex);
            if (existing) {
                existing.push(beat);
            } else {
                map.set(beat.beatIndex, [beat]);
            }
        }

        return map;
    }

    /**
     * Calculate target beats per beat index based on density multiplier
     */
    private calculateTargetBeatsPerBeat(
        beatsByIndex: Map<number, CompositeBeat[]>,
        densityMultiplier: number
    ): Map<number, number> {
        const targetMap = new Map<number, number>();

        for (const [beatIndex, beats] of beatsByIndex) {
            // Calculate target count, cap at 4 (max subdivisions per beat)
            const targetCount = Math.min(Math.ceil(beats.length * densityMultiplier), 4);
            targetMap.set(beatIndex, targetCount);
        }

        return targetMap;
    }

    /**
     * Try to insert a pattern from the phrase library
     *
     * Looks for patterns that:
     * - Have available slots in the current beat
     * - Match the grid type of existing beats
     * - Are within the max pattern size limit
     */
    private tryInsertPattern(
        existingBeats: CompositeBeat[],
        beatIndex: number,
        beatsToAdd: number,
        phraseAnalysis: PhraseAnalysisResult,
        enhancedBeats: CompositeBeat[]
    ): { beatsAdded: number; patternId?: string } {
        const patternLibrary = phraseAnalysis.patternLibrary;

        // Filter patterns by max size
        const suitablePatterns = patternLibrary.filter(
            p => p.sizeInBeats <= this.config.maxPatternInsertionSize && p.availableForReuse
        );

        if (suitablePatterns.length === 0) {
            return { beatsAdded: 0 };
        }

        // Get the grid type of existing beats (if any)
        const existingGridType = existingBeats.length > 0 ? existingBeats[0].gridType : 'straight_16th';

        // Find patterns that match the grid type
        const matchingPatterns = suitablePatterns.filter(p =>
            p.pattern.some(b => b.gridType === existingGridType)
        );

        // If no matching patterns, use any pattern
        const patternsToUse = matchingPatterns.length > 0 ? matchingPatterns : suitablePatterns;

        // Sort by significance (most significant first)
        patternsToUse.sort((a, b) => b.significance - a.significance);

        // Try to use the most significant pattern
        const pattern = patternsToUse[0];

        // Find beats from the pattern that fit in the current beat index
        const patternBeatsForCurrentBeat = pattern.pattern.filter(b => b.beatIndex === 0);

        // Get existing grid positions
        const existingPositions = new Set(existingBeats.map(b => b.gridPosition));

        // Find pattern beats that don't overlap with existing beats
        const newBeats = patternBeatsForCurrentBeat.filter(b => !existingPositions.has(b.gridPosition));

        if (newBeats.length === 0) {
            return { beatsAdded: 0 };
        }

        // Take only the number of beats we need
        const beatsToInsert = newBeats.slice(0, beatsToAdd);

        // Convert pattern beats to composite beats
        const sourceBand = pattern.sourceBand;
        const compositeBeats: CompositeBeat[] = beatsToInsert.map(b => ({
            ...b,
            beatIndex, // Use current beat index
            band: sourceBand,
            sourceBand,
            intensity: b.intensity * 0.8, // Slightly reduce intensity for inserted patterns
        }));

        enhancedBeats.push(...compositeBeats);

        return {
            beatsAdded: compositeBeats.length,
            patternId: pattern.id,
        };
    }

    /**
     * Interpolate beats to add density
     *
     * Adds beats at intermediate grid positions that don't already have beats.
     * Respects grid decisions (16th vs triplet) if available.
     */
    private interpolateBeats(
        existingBeats: CompositeBeat[],
        beatIndex: number,
        beatsToAdd: number,
        gridDecisions?: Map<number, GridDecision>
    ): CompositeBeat[] {
        if (beatsToAdd <= 0 || existingBeats.length === 0) {
            return [];
        }

        // Determine grid type from existing beats or grid decisions
        let gridType: GridType = existingBeats[0].gridType;
        let maxPositions = gridType === 'straight_16th' ? 4 : 3;

        // Check grid decisions for this beat index
        if (gridDecisions) {
            const decision = gridDecisions.get(beatIndex);
            if (decision) {
                gridType = decision.selectedGrid;
                maxPositions = gridType === 'straight_16th' ? 4 : 3;
            }
        }

        // Get existing positions
        const existingPositions = new Set(existingBeats.map(b => b.gridPosition));

        // Find available positions (positions without beats)
        const availablePositions: number[] = [];
        for (let pos = 0; pos < maxPositions; pos++) {
            if (!existingPositions.has(pos)) {
                availablePositions.push(pos);
            }
        }

        // If no available positions, try alternate grid type
        if (availablePositions.length === 0 && gridType === 'straight_16th') {
            // Try triplet grid
            for (let pos = 0; pos < 3; pos++) {
                if (!existingPositions.has(pos)) {
                    availablePositions.push(pos);
                }
            }
        }

        // Sort available positions (prefer mid-beat positions for interpolation)
        availablePositions.sort((a, b) => {
            // Prefer positions 1 and 2 (off-beats) for interpolation
            const aScore = a === 0 ? 2 : (a === 3 ? 2 : 1);
            const bScore = b === 0 ? 2 : (b === 3 ? 2 : 1);
            return aScore - bScore;
        });

        // Take the positions we need
        const positionsToFill = availablePositions.slice(0, beatsToAdd);

        // Get reference beat for timestamp calculation
        const referenceBeat = existingBeats[0];
        const quarterNoteInterval = 0.5; // Default, would need actual value from beat map

        // Create interpolated beats
        const interpolatedBeats: CompositeBeat[] = positionsToFill.map(gridPosition => {
            const interval = gridType === 'straight_16th' ? quarterNoteInterval / 4 : quarterNoteInterval / 3;
            const timestamp = referenceBeat.timestamp - (referenceBeat.gridPosition * interval) + (gridPosition * interval);

            return {
                timestamp,
                beatIndex,
                gridPosition,
                gridType,
                intensity: this.config.interpolatedBeatIntensity,
                band: referenceBeat.band,
                sourceBand: referenceBeat.sourceBand,
                quantizationError: 0,
            };
        });

        return interpolatedBeats;
    }

    /**
     * Deduplicate enhanced beats (same beatIndex + gridPosition + gridType)
     */
    private deduplicateEnhancedBeats(beats: CompositeBeat[]): CompositeBeat[] {
        const beatMap = new Map<string, CompositeBeat>();

        for (const beat of beats) {
            const key = `${beat.beatIndex}:${beat.gridPosition}:${beat.gridType}`;
            const existing = beatMap.get(key);

            if (!existing || beat.intensity > existing.intensity) {
                beatMap.set(key, beat);
            }
        }

        return Array.from(beatMap.values());
    }

    /**
     * Get the current configuration
     */
    getConfig(): DifficultyVariantConfig {
        return { ...this.config };
    }

    /**
     * Build a map of beat indices to their phrase membership
     *
     * This creates a lookup structure to quickly check if a beat is part of
     * a detected rhythmic phrase, and how significant that phrase is.
     *
     * @param phraseAnalysis - The phrase analysis result
     * @returns Map from beat index to array of phrases that include that beat
     */
    private buildPhraseMembershipMap(
        phraseAnalysis?: PhraseAnalysisResult
    ): Map<number, RhythmicPhrase[]> {
        const membershipMap = new Map<number, RhythmicPhrase[]>();

        if (!phraseAnalysis || !this.config.preservePhraseBoundaries) {
            return membershipMap;
        }

        // Only consider phrases with variation (interesting patterns)
        const significantPhrases = phraseAnalysis.phrases.filter(p => p.hasVariation);

        for (const phrase of significantPhrases) {
            for (const occurrence of phrase.occurrences) {
                // Each occurrence spans from beatIndex to beatIndex + sizeInBeats - 1
                for (let i = 0; i < phrase.sizeInBeats; i++) {
                    const beatIndex = occurrence.beatIndex + i;
                    const existing = membershipMap.get(beatIndex) ?? [];
                    existing.push(phrase);
                    membershipMap.set(beatIndex, existing);
                }
            }
        }

        return membershipMap;
    }

    /**
     * Check if a beat should be preserved due to phrase membership
     *
     * When preservePhraseBoundaries is enabled, this method determines if
     * a beat that would normally be removed should be kept because it's
     * part of a significant detected phrase.
     *
     * @param beat - The beat to check
     * @param phraseMembership - Map of beat indices to phrase membership
     * @param intensityThreshold - The intensity threshold being used
     * @returns True if the beat should be preserved due to phrase membership
     */
    private shouldPreserveForPhrase(
        beat: CompositeBeat,
        phraseMembership: Map<number, RhythmicPhrase[]>,
        intensityThreshold: number
    ): boolean {
        if (!this.config.preservePhraseBoundaries) {
            return false;
        }

        const phrases = phraseMembership.get(beat.beatIndex);
        if (!phrases || phrases.length === 0) {
            return false;
        }

        // Find the most significant phrase this beat belongs to
        const mostSignificant = phrases.reduce((best, phrase) =>
            phrase.significance > best.significance ? phrase : best
        );

        // If the beat is close to the intensity threshold and part of a significant phrase,
        // preserve it to keep the phrase intact
        const intensityMargin = beat.intensity - intensityThreshold;
        const isCloseToThreshold = intensityMargin >= -0.15; // Within 15% below threshold

        // More significant phrases get more leniency
        const significanceThreshold = 1.5;
        const isSignificantPhrase = mostSignificant.significance >= significanceThreshold;

        // Preserve if:
        // 1. The beat is close to the intensity threshold AND
        // 2. It's part of a significant phrase
        if (isCloseToThreshold && isSignificantPhrase) {
            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Preserving beat at index ${beat.beatIndex} ` +
                    `position ${beat.gridPosition} (intensity: ${beat.intensity.toFixed(2)}) ` +
                    `due to phrase membership (phrase significance: ${mostSignificant.significance.toFixed(2)})`
                );
            }
            return true;
        }

        return false;
    }
}
