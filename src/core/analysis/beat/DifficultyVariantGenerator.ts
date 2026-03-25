/**
 * Difficulty Variant Generator for Procedural Rhythm Generation
 *
 * Generates difficulty variants (easy/medium/hard) from the composite stream
 * by simplifying or enhancing density based on natural difficulty.
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 3.3
 *
 * @example
 * ```typescript
 * // Basic usage - generate all 3 difficulty variants
 * const generator = new DifficultyVariantGenerator();
 * const variants = generator.generateAll(compositeStream, phraseAnalysis, gridDecisions);
 *
 * // Access each difficulty variant
 * const easyVariant = variants.easy;
 * const mediumVariant = variants.medium;
 * const hardVariant = variants.hard;
 *
 * // Check which variant is unedited (natural difficulty)
 * console.log(`Easy is unedited: ${easyVariant.isUnedited}`);
 * console.log(`Medium is unedited: ${mediumVariant.isUnedited}`);
 * console.log(`Hard is unedited: ${hardVariant.isUnedited}`);
 *
 * // Check edit details
 * console.log(`Medium edit type: ${mediumVariant.editType}`);
 * console.log(`Medium edit amount: ${mediumVariant.editAmount.toFixed(2)}`);
 *
 * // Custom configuration for phrase boundary preservation
 * const customGenerator = new DifficultyVariantGenerator({
 *   preservePhraseBoundaries: true,
 *   logConversions: true,
 * });
 * ```
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
     * - Target density: < 1.0 transients/beat (sparse)
     */
    easy: {
        maxSubdivision: 'eighth',
        allowedGridTypes: ['straight_8th', 'quarter_triplet'],
        description: '8th notes and quarter note triplets only',
        targetDensityRange: { min: 0, max: 1.0 },
    },

    /**
     * Medium difficulty: All subdivision types allowed, but density should be reduced
     *
     * - 16th notes allowed
     * - 8th note triplets allowed
     * - All grid types available
     * - Target density: 1.0 - 1.75 transients/beat (moderate)
     * - Density reduction via moderate simplification (remove weak offbeat 16ths)
     */
    medium: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'All subdivision types, with density reduction for moderate difficulty',
        targetDensityRange: { min: 1.0, max: 1.75 },
    },

    /**
     * Hard difficulty: All subdivision types allowed
     *
     * - 16th notes allowed
     * - 8th note triplets allowed
     * - All grid types available
     * - Maximum density expected
     * - Target density: > 1.75 transients/beat (dense)
     */
    hard: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'All subdivision types including 16th notes',
        targetDensityRange: { min: 1.75, max: Infinity },
    },

    /**
     * Natural difficulty: Unedited composite stream
     *
     * - All grid types allowed (no restrictions)
     * - Represents the actual detected rhythm from the audio
     * - No target density range (accepts whatever was detected)
     * - Used as a baseline for comparison against difficulty variants
     */
    natural: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'Unedited composite stream - no subdivision restrictions',
        targetDensityRange: { min: 0, max: Infinity },
    },
};

// ============================================================================
// Types
// ============================================================================

/**
 * Difficulty level for rhythm variants
 *
 * - 'easy': Simplified rhythm with 8th notes max
 * - 'medium': Moderate difficulty with density reduction
 * - 'hard': Full density with all subdivisions
 * - 'natural': Unedited composite stream (what was actually detected)
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'natural';

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

    /** Target density range for this difficulty (transients per beat) */
    targetDensityRange: { min: number; max: number };
}

/**
 * Type of edit applied to create a difficulty variant
 */
export type EditType = 'none' | 'simplified' | 'interpolated' | 'pattern_inserted';

/**
 * A beat in a difficulty variant that may have been converted to an extended grid type
 *
 * This extends CompositeBeat to support Easy difficulty grid types (straight_8th, quarter_triplet)
 * that aren't in the original GridType.
 */
export interface VariantBeat extends Omit<CompositeBeat, 'gridType'> {
    /** Grid type - extended to support simplified subdivisions */
    gridType: ExtendedGridType;
}

/**
 * A difficulty variant of the composite stream
 */
export interface DifficultyVariant {
    /** The difficulty level of this variant */
    difficulty: DifficultyLevel;

    /** The beats in this variant (may include converted grid types) */
    beats: VariantBeat[];

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
    beat: VariantBeat;

    /** The grid type that is not allowed */
    gridType: ExtendedGridType;

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

    /** Intensity threshold for removing offbeat 16ths during moderate simplification (hard→medium). Default: 0.4 */
    moderateSimplificationIntensityThreshold: number;

    /** Minimum intensity threshold for removing beats during density reduction. Default: 0.25 */
    densityReductionMinIntensity: number;

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
    moderateSimplificationIntensityThreshold: 0.4,
    densityReductionMinIntensity: 0.25,
    enhancementDensityMultiplier: 2.5,
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
 * @param gridType - The original grid type (can be extended type)
 * @param difficulty - The target difficulty
 * @returns The converted grid type (or original if already allowed)
 */
export function convertToAllowedGridType(
    gridType: ExtendedGridType,
    difficulty: DifficultyLevel
): ExtendedGridType {
    const allowedTypes = SUBDIVISION_LIMITS[difficulty].allowedGridTypes;

    // If already allowed, return as-is
    if (allowedTypes.includes(gridType)) {
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
                // For extended types not in base GridType, keep as-is if allowed
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
 * @param beats - The beats to validate (may include extended grid types)
 * @param difficulty - The difficulty level to validate against
 * @returns Validation result with any violations
 */
export function validateSubdivisionLimits(
    beats: VariantBeat[],
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
        natural: DifficultyVariant;
    } {
        const naturalDifficulty = composite.naturalDifficulty;

        // Generate variants based on natural difficulty
        const easy = this.generateVariant(composite, 'easy', naturalDifficulty, phraseAnalysis, gridDecisions);
        const medium = this.generateVariant(composite, 'medium', naturalDifficulty, phraseAnalysis, gridDecisions);
        const hard = this.generateVariant(composite, 'hard', naturalDifficulty, phraseAnalysis, gridDecisions);

        // Enforce single grid type per beat index across all variants.
        // Mixed grids (triplet + straight in same beat) are unmusical and hard to read.
        easy.beats = this.enforceSingleGridPerBeat(easy.beats);
        medium.beats = this.enforceSingleGridPerBeat(medium.beats);
        hard.beats = this.enforceSingleGridPerBeat(hard.beats);

        // Generate the natural variant (unedited composite stream)
        const natural: DifficultyVariant = {
            difficulty: 'natural',
            beats: this.enforceSingleGridPerBeat([...composite.beats]),
            isUnedited: true,
            editType: 'none',
            editAmount: 0,
        };

        // Validate all variants against subdivision limits
        this.validateVariant(easy, 'easy');
        this.validateVariant(medium, 'medium');
        this.validateVariant(hard, 'hard');
        // Note: natural variant is not validated since it has no restrictions

        return { easy, medium, hard, natural };
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
        const allowedTypes = SUBDIVISION_LIMITS[targetDifficulty].allowedGridTypes;

        if (isNatural) {
            // Check if all beats already have allowed grid types
            const allTypesAllowed = composite.beats.every(b => allowedTypes.includes(b.gridType));

            if (allTypesAllowed) {
                // This variant is the unedited composite
                return {
                    difficulty: targetDifficulty,
                    beats: [...composite.beats],
                    isUnedited: true,
                    editType: 'none',
                    editAmount: 0,
                };
            }

            // Even for "natural" difficulty, we must ensure grid types are allowed
            // This handles edge cases where DensityAnalyzer may misclassify or
            // the composite has mixed grid types
            const result = this.simplifyBeats(
                composite.beats,
                targetDifficulty,
                composite.quarterNoteInterval,
                false,
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
                composite.quarterNoteInterval,
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
                gridDecisions,
                composite.quarterNoteInterval
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
     * @param quarterNoteInterval - Duration of a quarter note in seconds for timestamp calculation
     * @param isHeavySimplification - Whether this is heavy simplification (hard -> easy)
     * @param phraseAnalysis - Optional phrase analysis for preserving phrase boundaries
     * @returns Simplified beats with conversion metadata
     */
    private simplifyBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        quarterNoteInterval: number,
        isHeavySimplification: boolean = false,
        phraseAnalysis?: PhraseAnalysisResult
    ): { beats: VariantBeat[]; metadata: SubdivisionConversionMetadata } {
        const metadata: SubdivisionConversionMetadata = {
            sixteenthToEighth: 0,
            tripletToQuarterTriplet: 0,
            beatsRemoved: 0,
            totalBeatsBefore: beats.length,
            totalBeatsAfter: 0,
        };

        // Build phrase membership map for boundary preservation
        const phraseMembership = this.buildPhraseMembershipMap(phraseAnalysis);

        // Resolve mixed grids before density calculations for accurate counts
        const cleanedBeats = this.enforceSingleGridPerBeat(beats);
        metadata.totalBeatsBefore = cleanedBeats.length;

        // If all grid types are allowed, no grid conversion needed, but density reduction may still be required
        const allowedTypes = SUBDIVISION_LIMITS[targetDifficulty].allowedGridTypes;
        const allTypesAllowed = cleanedBeats.every(b => allowedTypes.includes(b.gridType));

        if (allTypesAllowed && !isHeavySimplification) {
            // Even though grid types are allowed, check if density reduction is needed
            const densityReducedBeats = this.reduceDensityToTarget(
                cleanedBeats as VariantBeat[],
                targetDifficulty,
                metadata,
                phraseMembership
            );
            metadata.totalBeatsAfter = densityReducedBeats.length;
            return { beats: densityReducedBeats, metadata };
        }

        // For heavy simplification, filter beats based on priority
        let beatsToProcess = cleanedBeats;
        if (isHeavySimplification) {
            beatsToProcess = this.filterBeatsForHeavySimplification(cleanedBeats, metadata, phraseMembership);
        }

        // Convert each beat to allowed grid type
        const convertedBeats: VariantBeat[] = [];

        for (const beat of beatsToProcess) {
            if (allowedTypes.includes(beat.gridType)) {
                // Beat already allowed, keep as-is (as VariantBeat)
                convertedBeats.push(beat as VariantBeat);
                continue;
            }

            // Convert the beat
            const convertedBeat = this.convertBeatGridType(beat, targetDifficulty, quarterNoteInterval);

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

        // Apply density-aware reduction if still above target
        // This ensures we actually meet the target density range for the difficulty
        const densityReducedBeats = this.reduceDensityToTarget(
            deduplicatedBeats,
            targetDifficulty,
            metadata,
            phraseMembership
        );

        metadata.totalBeatsAfter = densityReducedBeats.length;

        return { beats: densityReducedBeats, metadata };
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
     * Calculate the density (transients per beat) of a beat collection
     *
     * @param beats - The beats to analyze
     * @returns Transients per beat (0 if no beats)
     */
    private calculateDensity(beats: CompositeBeat[] | VariantBeat[]): number {
        if (beats.length === 0) return 0;

        // Find the range of beat indices
        const beatIndices = beats.map(b => b.beatIndex);
        const minBeat = Math.min(...beatIndices);
        const maxBeat = Math.max(...beatIndices);
        const totalBeats = maxBeat - minBeat + 1;

        if (totalBeats === 0) return 0;

        return beats.length / totalBeats;
    }

    /**
     * Reduce density by removing low-priority beats until target is reached
     *
     * This method implements a priority-based beat removal strategy:
     * 1. Calculate current density
     * 2. If above target, sort beats by removal priority (lowest priority first)
     * 3. Remove beats one at a time until density is within target range
     *
     * Removal priority (lowest to highest - low priority = removed first):
     * - Offbeats (gridPosition 1, 3) with low intensity - removed first
     * - Mid-beat positions (gridPosition 2) with low intensity
     * - Downbeats (gridPosition 0) on weak beats (2, 4 of measure)
     * - Strong beats (beats 1, 3 of measure) - kept as long as possible
     *
     * Protected beats (not removed):
     * - Beats with priority >= (1 - densityReductionMinIntensity)
     * - Beats with intensity >= moderateSimplificationIntensityThreshold
     *
     * @param beats - The beats to potentially reduce
     * @param targetDifficulty - The target difficulty level
     * @param metadata - Metadata to track removals
     * @param phraseMembership - Map of beat indices to phrase membership
     * @returns Beats with density reduced to target range
     */
    private reduceDensityToTarget<T extends CompositeBeat | VariantBeat>(
        beats: T[],
        targetDifficulty: DifficultyLevel,
        metadata: SubdivisionConversionMetadata,
        phraseMembership: Map<number, RhythmicPhrase[]> = new Map()
    ): T[] {
        const targetRange = SUBDIVISION_LIMITS[targetDifficulty].targetDensityRange;
        let currentDensity = this.calculateDensity(beats);

        // If already within target range, no reduction needed
        if (currentDensity <= targetRange.max) {
            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Density ${currentDensity.toFixed(2)} already within ` +
                    `target range [${targetRange.min}, ${targetRange.max}] for ${targetDifficulty}`
                );
            }
            return beats;
        }

        if (this.config.logConversions) {
            console.log(
                `[DifficultyVariantGenerator] Reducing density from ${currentDensity.toFixed(2)} to ` +
                `target max ${targetRange.max} for ${targetDifficulty}`
            );
        }

        // Calculate removal priority for each beat
        const beatsWithPriority = beats.map(beat => ({
            beat,
            priority: this.calculateRemovalPriority(beat, phraseMembership),
        }));

        // Sort by priority (ascending - lowest priority first for removal)
        beatsWithPriority.sort((a, b) => a.priority - b.priority);

        // Find beat range for density calculation
        const beatIndices = beats.map(b => b.beatIndex);
        const minBeat = Math.min(...beatIndices);
        const maxBeat = Math.max(...beatIndices);
        const totalBeats = maxBeat - minBeat + 1;

        // Remove beats one at a time until density is within target
        const removedBeats = new Set<T>();
        let remainingCount = beats.length;

        for (const { beat, priority } of beatsWithPriority) {
            // Check if we've reached target density
            const projectedDensity = (remainingCount - 1) / totalBeats;

            if (projectedDensity <= targetRange.max) {
                // We've removed enough beats, stop
                break;
            }

            // Don't remove if it's a critical beat (very high priority) or has high intensity
            const priorityThreshold = 1 - this.config.densityReductionMinIntensity;
            if (priority >= priorityThreshold || beat.intensity >= this.config.moderateSimplificationIntensityThreshold) {
                continue;
            }

            // Remove this beat
            removedBeats.add(beat);
            remainingCount--;

            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Removed beat at index ${beat.beatIndex} ` +
                    `position ${beat.gridPosition} (priority: ${priority.toFixed(2)}, intensity: ${beat.intensity.toFixed(2)})`
                );
            }
        }

        // Check if we couldn't reach target density (all remaining beats are protected)
        const finalDensity = remainingCount / totalBeats;
        if (finalDensity > targetRange.max && this.config.logConversions) {
            console.warn(
                `[DifficultyVariantGenerator] Could not reach target density ${targetRange.max} for ${targetDifficulty}. ` +
                `Final density: ${finalDensity.toFixed(2)} (${remainingCount} beats remaining are all protected)`
            );
        }

        // Filter out removed beats
        const keptBeats = beats.filter(b => !removedBeats.has(b));
        metadata.beatsRemoved += removedBeats.size;

        // Ensure we keep at least some beats (don't over-reduce)
        const minBeatsToKeep = Math.ceil(targetRange.min * totalBeats);
        if (keptBeats.length < minBeatsToKeep && beats.length > 0) {
            // Add back the highest priority removed beats
            const removedWithPriority = beatsWithPriority
                .filter(({ beat }) => removedBeats.has(beat))
                .sort((a, b) => b.priority - a.priority);

            for (const { beat } of removedWithPriority) {
                if (keptBeats.length >= minBeatsToKeep) break;
                keptBeats.push(beat);
                metadata.beatsRemoved--;
            }
        }

        return keptBeats;
    }

    /**
     * Calculate removal priority for a beat (higher = more important to keep)
     *
     * Priority factors:
     * - Strong beat bonus: +0.3 (beats 1 and 3 of measure)
     * - Downbeat bonus: +0.2 (gridPosition 0)
     * - Intensity contribution: +intensity * 0.3
     * - Phrase membership bonus: +0.15 (max)
     * - Offbeat penalty: -0.1 (gridPosition 1 or 3)
     *
     * @param beat - The beat to evaluate
     * @param phraseMembership - Map of beat indices to phrase membership
     * @returns Priority score (0-1 range, higher = keep)
     */
    private calculateRemovalPriority(
        beat: CompositeBeat | VariantBeat,
        phraseMembership: Map<number, RhythmicPhrase[]>
    ): number {
        let priority = 0.5; // Base priority

        // Strong beat bonus
        if (this.isStrongBeat(beat.beatIndex)) {
            priority += 0.3;
        }

        // Downbeat bonus
        if (beat.gridPosition === 0) {
            priority += 0.2;
        }

        // Intensity contribution
        priority += beat.intensity * 0.3;

        // Phrase membership bonus
        const phrases = phraseMembership.get(beat.beatIndex);
        if (phrases && phrases.length > 0) {
            const maxSignificance = Math.max(...phrases.map(p => p.significance));
            priority += Math.min(0.15, maxSignificance * 0.05);
        }

        // Offbeat penalty
        if (beat.gridPosition === 1 || beat.gridPosition === 3) {
            priority -= 0.1;
        }

        // Clamp to 0-1 range
        return Math.max(0, Math.min(1, priority));
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
     * @param quarterNoteInterval - Duration of a quarter note in seconds
     * @returns The converted beat as VariantBeat, or null if the beat should be removed
     */
    private convertBeatGridType(
        beat: CompositeBeat,
        targetDifficulty: DifficultyLevel,
        quarterNoteInterval: number
    ): VariantBeat | null {
        const targetGridType = convertToAllowedGridType(beat.gridType, targetDifficulty);

        // If no conversion needed, return as-is (but as VariantBeat)
        if (targetGridType === beat.gridType) {
            return {
                ...beat,
                gridType: targetGridType,
            };
        }

        // Calculate new grid position and timestamp based on conversion
        let newGridPosition: number;
        let newTimestamp: number;

        // CRITICAL: Calculate the actual beat start timestamp from the beat's own timestamp.
        // We derive the beat start by subtracting the offset contributed by the grid position.
        // This preserves the actual detected timing rather than assuming beat 0 starts at timestamp 0.
        //
        // For straight_16th grid (4 positions): each position = quarterInterval/4
        // For triplet_8th grid (3 positions): each position = quarterInterval/3
        let beatStartTimestamp: number;

        switch (beat.gridType) {
            case 'straight_16th': {
                // Derive actual beat start from the beat's timestamp
                // Position 0 = beat start, Position 1 = +1/4, Position 2 = +1/2, Position 3 = +3/4
                const sixteenthNoteInterval = quarterNoteInterval / 4;
                beatStartTimestamp = beat.timestamp - (beat.gridPosition * sixteenthNoteInterval);

                // 16th → 8th conversion
                // Positions: 0→0, 1→0 (snap to quarter), 2→2, 3→2 (snap to 8th)
                if (beat.gridPosition === 1 || beat.gridPosition === 3) {
                    // These are off-beat 16ths that snap to the previous grid point
                    newGridPosition = beat.gridPosition === 1 ? 0 : 2;
                } else {
                    newGridPosition = beat.gridPosition;
                }

                // Calculate new timestamp from the ACTUAL beat start (not theoretical)
                // 8th note interval = quarterInterval / 2
                // Position 0 = beat start, Position 2 = beat start + 8th interval
                const eighthNoteInterval = quarterNoteInterval / 2;
                newTimestamp = beatStartTimestamp + (newGridPosition === 0 ? 0 : eighthNoteInterval);
                break;
            }

            case 'triplet_8th': {
                // Derive actual beat start from the beat's timestamp
                // Position 0 = beat start, Position 1 = +1/3, Position 2 = +2/3
                const tripletInterval = quarterNoteInterval / 3;
                beatStartTimestamp = beat.timestamp - (beat.gridPosition * tripletInterval);

                // 8th triplet → quarter triplet conversion
                // All positions snap to 0 (the quarter triplet)
                newGridPosition = 0;
                // Quarter triplet is at beat start (using actual detected timing)
                newTimestamp = beatStartTimestamp;
                break;
            }

            default:
                // Unknown grid type, keep as-is (return as VariantBeat)
                return {
                    ...beat,
                    gridType: beat.gridType as ExtendedGridType,
                };
        }

        // Return the converted beat with updated grid type, position, and timestamp
        return {
            ...beat,
            gridType: targetGridType,
            gridPosition: newGridPosition,
            timestamp: newTimestamp,
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
    private deduplicateConvertedBeats(beats: VariantBeat[]): VariantBeat[] {
        const beatMap = new Map<string, VariantBeat>();

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
     * @param quarterNoteInterval - Duration of a quarter note in seconds for timestamp calculation
     * @returns Enhanced beats with metadata
     */
    private enhanceBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        enhancementLevel: 'moderate' | 'heavy',
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>,
        quarterNoteInterval: number = 0.5
    ): { beats: VariantBeat[]; metadata: EnhancementMetadata } {
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
            ? this.config.enhancementDensityMultiplier * 2.5
            : this.config.enhancementDensityMultiplier;

        metadata.densityMultiplier = densityMultiplier;

        // If no beats to enhance, return empty
        if (beats.length === 0) {
            metadata.totalBeatsAfter = 0;
            return { beats: [], metadata };
        }

        // Resolve mixed grids BEFORE calculating targets.
        // If a beat index has both triplet and straight notes, the density calculation
        // counts them all, but enforceSingleGridPerBeat later removes the losers.
        // This causes the final density to fall short of the target. By resolving
        // grids first, all density math and interpolation work with accurate counts.
        const cleanedBeats = this.enforceSingleGridPerBeat(beats);
        metadata.totalBeatsBefore = cleanedBeats.length;

        // Group beats by beatIndex for analysis
        const beatsByIndex = this.groupBeatsByIndex(cleanedBeats);

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
                // Collect positions already filled by pattern insertion so
                // interpolation doesn't duplicate them
                const patternPositions = new Set<number>();
                for (const b of enhancedBeats) {
                    if (b.beatIndex === beatIndex) {
                        patternPositions.add(b.gridPosition);
                    }
                }

                const interpolatedBeats = this.interpolateBeats(
                    existingBeats,
                    beatIndex,
                    beatsToAdd - addedFromPattern,
                    gridDecisions,
                    quarterNoteInterval,
                    patternPositions
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

        // Only use patterns that match the existing grid type.
        // Inserting a mismatched grid creates unmusical mixed-grid beats.
        if (matchingPatterns.length === 0) {
            return { beatsAdded: 0 };
        }
        const patternsToUse = matchingPatterns;

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
     *
     * @param existingBeats - Existing beats at this beat index
     * @param beatIndex - The beat index to interpolate for
     * @param beatsToAdd - Number of beats to add
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @param quarterNoteInterval - Duration of a quarter note in seconds for timestamp calculation
     * @param occupiedPositions - Optional set of grid positions already filled (e.g., by pattern insertion)
     * @returns Array of interpolated beats
     */
    private interpolateBeats(
        existingBeats: CompositeBeat[],
        beatIndex: number,
        beatsToAdd: number,
        gridDecisions?: Map<number, GridDecision>,
        quarterNoteInterval: number = 0.5,
        occupiedPositions?: Set<number>
    ): CompositeBeat[] {
        if (beatsToAdd <= 0 || existingBeats.length === 0) {
            return [];
        }

        // Determine grid type from existing beats or grid decisions
        let gridType: GridType = existingBeats[0].gridType;
        const getMaxPositions = (gt: string) =>
            gt === 'straight_16th' ? 4
                : gt === 'straight_8th' ? 2
                    : 3;
        let maxPositions = getMaxPositions(gridType);

        // Check grid decisions for this beat index
        if (gridDecisions) {
            const decision = gridDecisions.get(beatIndex);
            if (decision) {
                gridType = decision.selectedGrid;
                maxPositions = getMaxPositions(gridType);
            }
        }

        // Get existing positions, plus any positions already filled by pattern insertion
        const existingPositions = new Set(existingBeats.map(b => b.gridPosition));
        if (occupiedPositions) {
            for (const pos of occupiedPositions) {
                existingPositions.add(pos);
            }
        }

        // Find available positions (positions without beats)
        const availablePositions: number[] = [];
        for (let pos = 0; pos < maxPositions; pos++) {
            if (!existingPositions.has(pos)) {
                availablePositions.push(pos);
            }
        }

        // Don't fall back to alternate grid type - that would mix grids within a single beat.
        // enforceSingleGridPerBeat will clean up any remaining mixing, but avoiding it
        // at the source produces better results.

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

        // Create interpolated beats
        const interpolatedBeats: CompositeBeat[] = positionsToFill.map(gridPosition => {
            // CRITICAL: Use the reference beat's OWN grid type interval to derive the beat start.
            // Then use the target grid type interval for the new grid position.
            // Mixing intervals causes offset errors (32nd-note or 16th-triplet).
            const referenceInterval = referenceBeat.gridType === 'straight_16th'
                ? quarterNoteInterval / 4
                : referenceBeat.gridType === 'straight_8th'
                    ? quarterNoteInterval / 2
                    : quarterNoteInterval / 3;
            const newInterval = gridType === 'straight_16th'
                ? quarterNoteInterval / 4
                : gridType === 'straight_8th'
                    ? quarterNoteInterval / 2
                    : quarterNoteInterval / 3;
            const beatStartTimestamp = referenceBeat.timestamp - (referenceBeat.gridPosition * referenceInterval);
            const timestamp = beatStartTimestamp + (gridPosition * newInterval);

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
     * Enforce single grid type per beat index.
     *
     * When a beat index has notes from both triplet and straight grids,
     * keep only the grid type with higher total intensity. This prevents
     * unmusical combinations like a 16th note and a triplet in the same beat.
     *
     * @param beats - The beats to enforce single-grid on
     * @returns Beats with at most one grid type per beat index
     */
    private enforceSingleGridPerBeat<T extends CompositeBeat | VariantBeat>(
        beats: T[]
    ): T[] {
        // Group beats by beatIndex
        const beatsByIndex = new Map<number, T[]>();
        for (const beat of beats) {
            const existing = beatsByIndex.get(beat.beatIndex) ?? [];
            existing.push(beat);
            beatsByIndex.set(beat.beatIndex, existing);
        }

        const result: T[] = [];

        for (const [, beatsAtIndex] of beatsByIndex) {
            if (beatsAtIndex.length <= 1) {
                result.push(...beatsAtIndex);
                continue;
            }

            // Check if this beat index has mixed grid types
            const gridTypes = new Set(beatsAtIndex.map(b => b.gridType));
            if (gridTypes.size <= 1) {
                // Single grid type, keep all
                result.push(...beatsAtIndex);
                continue;
            }

            // Mixed grids - pick the winner by total intensity
            let winnerGrid: ExtendedGridType = 'straight_16th';
            let winnerIntensity = 0;

            for (const gridType of gridTypes) {
                const totalIntensity = beatsAtIndex
                    .filter(b => b.gridType === gridType)
                    .reduce((sum, b) => sum + b.intensity, 0);
                if (totalIntensity > winnerIntensity) {
                    winnerIntensity = totalIntensity;
                    winnerGrid = gridType;
                }
            }

            // Keep only beats matching the winner grid type
            const kept = beatsAtIndex.filter(b => b.gridType === winnerGrid);

            if (this.config.logConversions && kept.length < beatsAtIndex.length) {
                const removed = beatsAtIndex.filter(b => b.gridType !== winnerGrid);
                console.log(
                    `[DifficultyVariantGenerator] Enforced single grid at beat ${beatsAtIndex[0].beatIndex}: ` +
                    `kept ${winnerGrid} (${kept.length} beats), removed ${removed.map(b => b.gridType).join(', ')} (${removed.length} beats)`
                );
            }

            result.push(...kept);
        }

        return result.sort((a, b) => a.timestamp - b.timestamp);
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
