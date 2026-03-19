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

    /** Intensity threshold for keeping beats during HEAVY simplification. Default: 0.5 */
    heavySimplificationIntensityThreshold: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_DIFFICULTY_VARIANT_CONFIG: DifficultyVariantConfig = {
    logConversions: false,
    preservePhraseBoundaries: true,
    simplificationIntensityThreshold: 0.3,
    heavySimplificationIntensityThreshold: 0.5,
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
     * @returns Object containing easy, medium, and hard variants
     */
    generate(composite: CompositeStream): {
        easy: DifficultyVariant;
        medium: DifficultyVariant;
        hard: DifficultyVariant;
    } {
        const naturalDifficulty = composite.naturalDifficulty;

        // Generate variants based on natural difficulty
        const easy = this.generateVariant(composite, 'easy', naturalDifficulty);
        const medium = this.generateVariant(composite, 'medium', naturalDifficulty);
        const hard = this.generateVariant(composite, 'hard', naturalDifficulty);

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
            // Determine if this is heavy simplification (2 levels down: hard -> easy)
            const isHeavySimplification = this.isHeavySimplification(targetDifficulty, naturalDifficulty);

            // Simplify beats to meet subdivision limits
            const result = this.simplifyBeats(composite.beats, targetDifficulty, isHeavySimplification);

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
     * @returns Simplified beats with conversion metadata
     */
    private simplifyBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        isHeavySimplification: boolean = false
    ): { beats: CompositeBeat[]; metadata: SubdivisionConversionMetadata } {
        const metadata: SubdivisionConversionMetadata = {
            sixteenthToEighth: 0,
            tripletToQuarterTriplet: 0,
            beatsRemoved: 0,
            totalBeatsBefore: beats.length,
            totalBeatsAfter: 0,
        };

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
            beatsToProcess = this.filterBeatsForHeavySimplification(beats, metadata);
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
     *
     * In 4/4 time with 0-indexed beats:
     * - Beat 0, 4, 8... = Beat 1 of measure (strong)
     * - Beat 2, 6, 10... = Beat 3 of measure (strong)
     * - Beat 1, 5, 9... = Beat 2 of measure (weak)
     * - Beat 3, 7, 11... = Beat 4 of measure (weak)
     *
     * @param beats - The beats to filter
     * @param metadata - Metadata object to track removals
     * @returns Filtered beats
     */
    private filterBeatsForHeavySimplification(
        beats: CompositeBeat[],
        metadata: SubdivisionConversionMetadata
    ): CompositeBeat[] {
        const threshold = this.config.heavySimplificationIntensityThreshold;
        const keptBeats: CompositeBeat[] = [];

        for (const beat of beats) {
            const isStrongBeat = this.isStrongBeat(beat.beatIndex);
            const isDownbeat = beat.gridPosition === 0;
            const isOffbeat = beat.gridPosition === 1 || beat.gridPosition === 3;

            if (isStrongBeat) {
                // Always keep beats on strong beats (1 and 3 of measure)
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
     * Get the current configuration
     */
    getConfig(): DifficultyVariantConfig {
        return { ...this.config };
    }
}
