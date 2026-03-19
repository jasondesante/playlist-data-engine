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
import type { GridType } from './RhythmQuantizer.js';

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
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DIFFICULTY_VARIANT_CONFIG: DifficultyVariantConfig = {
    logConversions: false,
    preservePhraseBoundaries: true,
    simplificationIntensityThreshold: 0.3,
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
     * @param composite - The composite stream from CompositeStreamGenerator
     * @returns Object containing easy, medium, and hard variants
     */
    generate(composite: CompositeStream): {
        easy: DifficultyVariant;
        medium: DifficultyVariant;
        hard: DifficultyVariant;
    } {
        const naturalDifficulty = composite.naturalDifficulty;

        // Generate variants based on natural difficulty
        // Note: Full implementation of simplification/enhancement logic is in subsequent tasks
        // This creates the structure with placeholder logic

        const easy = this.generateVariant(composite, 'easy', naturalDifficulty);
        const medium = this.generateVariant(composite, 'medium', naturalDifficulty);
        const hard = this.generateVariant(composite, 'hard', naturalDifficulty);

        return { easy, medium, hard };
    }

    /**
     * Generate a single difficulty variant
     *
     * @param composite - The composite stream
     * @param targetDifficulty - The target difficulty level
     * @param naturalDifficulty - The natural difficulty of the composite
     * @returns The difficulty variant
     */
    private generateVariant(
        composite: CompositeStream,
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty
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
            // Placeholder: Will implement full simplification logic in next task
            // For now, validate and mark what would need conversion
            const validation = validateSubdivisionLimits(composite.beats, targetDifficulty);

            if (this.config.logConversions && validation.violationCount > 0) {
                console.log(
                    `[DifficultyVariantGenerator] ${targetDifficulty} variant: ` +
                    `${validation.violationCount}/${validation.totalBeats} beats need conversion`
                );
            }

            return {
                difficulty: targetDifficulty,
                beats: [...composite.beats], // Placeholder: actual simplification in next task
                isUnedited: false,
                editType: 'simplified',
                editAmount: validation.violationCount / validation.totalBeats,
                conversionMetadata: {
                    sixteenthToEighth: validation.violations.filter(
                        v => v.gridType === 'straight_16th'
                    ).length,
                    tripletToQuarterTriplet: validation.violations.filter(
                        v => v.gridType === 'triplet_8th'
                    ).length,
                    beatsRemoved: 0,
                    totalBeatsBefore: validation.totalBeats,
                    totalBeatsAfter: validation.totalBeats, // Will change with actual implementation
                },
            };
        }

        if (needsEnhancement) {
            // Placeholder: Will implement full enhancement logic in next task
            return {
                difficulty: targetDifficulty,
                beats: [...composite.beats], // Placeholder: actual enhancement in next task
                isUnedited: false,
                editType: 'interpolated',
                editAmount: 0.3, // Placeholder
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
     * Get the current configuration
     */
    getConfig(): DifficultyVariantConfig {
        return { ...this.config };
    }
}
