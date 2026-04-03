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
import type { UnifiedBeatMap } from '../../types/BeatMap.js';
import type { RhythmicBalanceConfig } from './RhythmicBalancer.js';
import {
    findActiveSegment,
    isStrongBeatForEmphasis,
} from './RhythmicBalancer.js';
import { deriveSeed, hashSeedToFloat } from '../../../utils/hash.js';

// ============================================================================
// Extended Grid Types
// ============================================================================

/**
 * Extended grid type including simplified subdivisions for Easy difficulty
 *
 * - `straight_16th`: Standard 16th note grid (4 positions per beat: 0, 1, 2, 3)
 * - `triplet_8th`: 8th note triplet grid (3 positions per beat: 0, 1, 2)
 * - `straight_8th`: Standard 8th note grid (2 positions per beat: 0, 2)
 * - `quarter_triplet`: Quarter note triplet (1 position per beat, triplet feel)
 * - `straight_4th`: Quarter note grid (1 position per beat: 0) — Easy at BPM > 120
 */
export type ExtendedGridType = GridType | 'straight_8th' | 'quarter_triplet' | 'straight_4th';

/**
 * All possible grid types for reference
 */
export const ALL_GRID_TYPES: ExtendedGridType[] = [
    'straight_16th',
    'triplet_8th',
    'straight_8th',
    'quarter_triplet',
    'straight_4th',
];

/**
 * Maximum positions per beat for each grid type
 *
 * This defines how many beats can fit at a single beat index for each grid type.
 */
const GRID_TYPE_MAX_POSITIONS: Record<ExtendedGridType, number> = {
    straight_16th: 4,
    straight_8th: 2,
    triplet_8th: 3,
    straight_4th: 1,
    quarter_triplet: 1,
};

// ============================================================================
// Subdivision Limits by Difficulty
// ============================================================================

/**
 * Subdivision limits for each difficulty level
 *
 * This constant defines which grid types are allowed for each difficulty
 * at slow tempos (BPM < 70). For tempo-aware limits, use
 * `getTempoAwareAllowedGridTypes()`.
 *
 * The primary constraint is that Easy difficulty excludes rapid subdivisions
 * (16th notes and 8th note triplets) to ensure appropriate playability.
 *
 * | Difficulty | BPM < 70 | 70 ≤ BPM ≤ 120 | BPM > 120 |
 * |------------|----------|----------------|-----------|
 * | Easy | `straight_8th`, `quarter_triplet` | same | `straight_4th`, `quarter_triplet` |
 * | Medium | All types | `straight_8th`, `quarter_triplet` | `straight_8th`, `quarter_triplet` |
 * | Hard | All types | All types | `straight_8th`, `quarter_triplet` |
 * | Natural | All types | All types | All types |
 *
 * @example
 * ```typescript
 * // Check if a grid type is allowed for a difficulty at a given BPM
 * const allowed = getTempoAwareAllowedGridTypes('medium', 120);
 * // ['straight_8th', 'quarter_triplet'] — 16th notes restricted at ≥70 BPM
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
     * - Target density: < 1.0 notes/sec (sparse)
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
     * - Target density: 1.0 - 1.5 notes/sec (moderate)
     * - Density reduction via moderate simplification (remove weak offbeat 16ths)
     */
    medium: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'All subdivision types, with density reduction for moderate difficulty',
        targetDensityRange: { min: 1.0, max: 1.5 },
    },

    /**
     * Hard difficulty: All subdivision types allowed
     *
     * - 16th notes allowed
     * - 8th note triplets allowed
     * - All grid types available
     * - Maximum density expected
     * - Target density: > 1.5 notes/sec (dense)
     */
    hard: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'All subdivision types including 16th notes',
        targetDensityRange: { min: 1.5, max: Infinity },
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

    /**
     * Custom difficulty: Density-based variant with independent parameters
     *
     * - Parameters (targetDensity, maxGridType) provided at generation time
     * - This entry is a fallback/sentinel — actual values come from DensityGenerationConfig
     * - Used by generateAtDensity() for continuous difficulty spectrum
     */
    custom: {
        maxSubdivision: 'sixteenth',
        allowedGridTypes: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
        description: 'Custom density-based variant — parameters provided at generation time',
        targetDensityRange: { min: 0, max: Infinity },
    },
};

// ============================================================================
// BPM Thresholds for Subdivision Restrictions
// ============================================================================

/** BPM threshold: medium restricts 16th/triplet_8th at or above this value */
export const MEDIUM_RESTRICT_BPM = 70;

/** BPM threshold: hard restricts 16th/triplet_8th above this value */
export const HARD_RESTRICT_BPM = 120;

/** BPM threshold: easy restricts to quarter notes above this value */
export const EASY_QUARTER_NOTE_BPM = 120;

// ============================================================================
// Tempo-Aware Subdivision Limits
// ============================================================================

/**
 * Get the allowed grid types for a difficulty at a given BPM.
 *
 * This function returns the effective subdivision limits after applying
 * tempo-based restrictions:
 *
 * - **Easy at BPM > 120**: Only `straight_4th` (quarter notes) and `quarter_triplet`.
 *   At high tempos, even 8th notes are too rapid for beginners.
 * - **Medium at BPM ≥ 70**: Only `straight_8th` and `quarter_triplet`.
 *   16th notes and 8th note triplets are reserved for hard/natural.
 * - **Hard at BPM > 120**: Only `straight_8th` and `quarter_triplet`.
 *   At high tempos, 16th notes become unplayable.
 * - **Natural**: Always all types (no restrictions).
 *
 * Below 70 BPM, all difficulties except easy use their full subdivision limits.
 *
 * @param difficulty - The difficulty level
 * @param bpm - The tempo in beats per minute
 * @returns Array of allowed grid types
 */
export function getTempoAwareAllowedGridTypes(
    difficulty: DifficultyLevel,
    bpm: number
): ExtendedGridType[] {
    if (difficulty === 'natural') {
        return [...SUBDIVISION_LIMITS.natural.allowedGridTypes];
    }

    if (difficulty === 'easy') {
        if (bpm > EASY_QUARTER_NOTE_BPM) {
            return ['straight_4th', 'quarter_triplet'];
        }
        return [...SUBDIVISION_LIMITS.easy.allowedGridTypes];
    }

    if (difficulty === 'medium') {
        if (bpm >= MEDIUM_RESTRICT_BPM) {
            return ['straight_8th', 'quarter_triplet'];
        }
        return [...SUBDIVISION_LIMITS.medium.allowedGridTypes];
    }

    if (difficulty === 'hard') {
        if (bpm > HARD_RESTRICT_BPM) {
            return ['straight_8th', 'quarter_triplet'];
        }
        return [...SUBDIVISION_LIMITS.hard.allowedGridTypes];
    }

    if (difficulty === 'custom') {
        // Caller must pass allowed grid types directly via the density config.
        // This branch should not be reached in normal flow — density generation
        // uses deriveAllowedGridTypes() instead.
        return [...SUBDIVISION_LIMITS.custom.allowedGridTypes];
    }

    // TypeScript exhaustive check — all DifficultyLevel values handled above
    const _exhaustive: never = difficulty;
    throw new Error(`Unhandled difficulty: ${_exhaustive}`);
}

// ============================================================================
// Density-Based Generation Helpers
// ============================================================================

/**
 * Grid hierarchy mapping: maxGridType → derived set of allowed grid types.
 *
 * When a caller specifies a maximum grid type, all coarser grid types are
 * implicitly allowed. This mapping encodes the hierarchy from finest to coarsest.
 */
const GRID_HIERARCHY: Record<ExtendedGridType, ExtendedGridType[]> = {
    straight_4th: ['straight_4th'],
    straight_8th: ['straight_8th', 'quarter_triplet'],
    quarter_triplet: ['quarter_triplet', 'straight_8th'], // same tier as straight_8th
    triplet_8th: ['triplet_8th', 'straight_8th', 'quarter_triplet'],
    straight_16th: ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet'],
};

/**
 * Derive allowed grid types from a DensityGenerationConfig and BPM.
 *
 * This is the core helper for density-based generation. It:
 * 1. Looks up the base set of allowed grid types from the hierarchy based on `maxGridType`
 * 2. Optionally applies BPM-based restrictions if `bpmBasedQuantization` is true
 *
 * @param config - The density generation configuration
 * @param bpm - Current BPM for tempo-aware restrictions
 * @returns Array of allowed ExtendedGridType values
 */
export function deriveAllowedGridTypes(
    config: DensityGenerationConfig,
    bpm: number
): ExtendedGridType[] {
    // Step 1: Derive base allowed types from the grid hierarchy
    const baseTypes = GRID_HIERARCHY[config.maxGridType] ?? [config.maxGridType];

    // Step 2: If BPM-based quantization is not enabled, return base types as-is
    if (!config.bpmBasedQuantization) {
        return [...baseTypes];
    }

    // Step 3: Apply BPM-based restrictions
    const restrictBpm = config.restrictBpm ?? MEDIUM_RESTRICT_BPM;     // default 70
    const quarterNoteBpm = config.quarterNoteBpm ?? EASY_QUARTER_NOTE_BPM; // default 120

    let result = [...baseTypes];

    // At BPM >= restrictBpm (default 70): remove straight_16th and triplet_8th
    if (bpm >= restrictBpm) {
        result = result.filter(t => t !== 'straight_16th' && t !== 'triplet_8th');
    }

    // At BPM > quarterNoteBpm (default 120): remove straight_8th too (only quarter notes remain)
    if (bpm > quarterNoteBpm) {
        result = result.filter(t => t !== 'straight_8th');
    }

    return result;
}

/**
 * Calculate the maximum achievable density (notes/second) for a given set of
 * allowed grid types at a specific BPM.
 *
 * This is used to detect impossible configurations (e.g., requesting 4.0 nps
 * with only 8th notes at 60 BPM, where max achievable is ~2.0 nps).
 *
 * @param allowedGridTypes - The grid types that are allowed
 * @param bpm - Current BPM
 * @returns Maximum achievable density in notes/second
 */
export function calculateMaxAchievableDensity(
    allowedGridTypes: ExtendedGridType[],
    bpm: number
): number {
    if (allowedGridTypes.length === 0 || bpm <= 0) {
        return 0;
    }

    const quarterNoteInterval = 60 / bpm;
    const maxPositionsPerBeat = Math.max(
        ...allowedGridTypes.map(g => GRID_TYPE_MAX_POSITIONS[g])
    );
    return maxPositionsPerBeat / quarterNoteInterval;
}


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
 * - 'custom': Custom density-based variant — parameters provided at generation time
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'natural' | 'custom';

/**
 * Preset difficulty levels (excludes 'custom')
 *
 * Used for GeneratedRhythm.difficultyVariants which only contains preset variants.
 * Custom variants are generated standalone via generateAtDensity().
 */
export type PresetDifficultyLevel = 'easy' | 'medium' | 'hard' | 'natural';

/**
 * Configuration for density-based level generation
 *
 * Provides independent control over target density (notes/second) and maximum
 * quantization grid, enabling a continuous spectrum of difficulty alongside
 * the existing easy/medium/hard/natural presets.
 *
 * @example
 * ```typescript
 * // Dense chart with only 8th note quantization
 * const config: DensityGenerationConfig = {
 *   targetDensity: 3.0,
 *   maxGridType: 'straight_8th'
 * };
 *
 * // Sparse chart with 16th note quantization allowed
 * const config: DensityGenerationConfig = {
 *   targetDensity: 0.5,
 *   maxGridType: 'straight_16th'
 * };
 *
 * // With BPM-based quantization restrictions
 * const config: DensityGenerationConfig = {
 *   targetDensity: 2.0,
 *   maxGridType: 'straight_16th',
 *   bpmBasedQuantization: true,  // At 80 BPM, this restricts to 8ths
 *   restrictBpm: 70              // Custom threshold (default: 70)
 * };
 * ```
 */
export interface DensityGenerationConfig {
    /** Target density in notes per second */
    targetDensity: number;

    /** Maximum quantization grid allowed (independent of density) */
    maxGridType: ExtendedGridType;

    /**
     * When true, apply BPM-based restrictions on top of maxGridType.
     * Uses medium's thresholds (default: 70 BPM):
     *   - At BPM >= restrictBpm: straight_16th and triplet_8th restricted to straight_8th
     * When false, only maxGridType is enforced regardless of BPM.
     * Default: false
     */
    bpmBasedQuantization?: boolean;

    /** BPM threshold for restricting 16th/triplet_8th to 8ths. Default: 70 (MEDIUM_RESTRICT_BPM) */
    restrictBpm?: number;

    /** BPM threshold for restricting 8ths to quarter notes. Default: 120 (EASY_QUARTER_NOTE_BPM) */
    quarterNoteBpm?: number;
}

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

    /** Target density range for this difficulty (notes per second, BPM-adjusted) */
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

    /** Task 4.2.3: Density validation result for downstream consumers */
    densityValidation?: VariantDensityValidationResult;

    /** Whether density was clamped due to grid constraints (density-based generation only) */
    densityClamped?: boolean;
}

/**
 * Metadata about subdivision conversions during simplification
 */
export interface SubdivisionConversionMetadata {
    /** Number of beats converted from 16th to 8th */
    sixteenthToEighth: number;

    /** Number of beats converted from 8th triplet to quarter triplet */
    tripletToQuarterTriplet: number;

    /** Number of beats converted from 8th to quarter note (straight_8th → straight_4th) */
    eighthToQuarter: number;

    /** Number of beats that were removed entirely */
    beatsRemoved: number;

    /** Total beats before conversion */
    totalBeatsBefore: number;

    /** Total beats after conversion */
    totalBeatsAfter: number;

    /** Number of reduction passes used to reach target density */
    reductionPasses?: number;
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
 * Result of locking grid types per beat index
 *
 * This is the foundational structure for the density balancing refactor.
 * Before any density work, the grid type for each beat index is locked
 * so all subsequent operations know which grid to use.
 */
export interface GridLockResult {
    /** Beats after resolving mixed grids (single grid per beat index) */
    beats: CompositeBeat[];

    /** Map from beat index to locked grid type */
    gridLock: Map<number, ExtendedGridType>;
}

/**
 * Strategy for where to target within the density range
 *
 * - 'midpoint': Aim for the middle of the range (default)
 * - 'lower': Aim closer to the minimum (more conservative)
 * - 'upper': Aim closer to the maximum (more aggressive)
 */
export type DensityTargetStrategy = 'midpoint' | 'lower' | 'upper';

/**
 * Result of calculating beat count targets for a difficulty
 */
export interface BeatCountTarget {
    /** Target beat count to aim for (based on strategy) */
    targetCount: number;

    /** Maximum beat count allowed (upper bound of density range) */
    maxCount: number;

    /** Minimum beat count allowed (lower bound of density range) */
    minCount: number;

    /** The target density value (notes per second) used for calculation */
    targetDensity: number;
}

/**
 * Result of calculating how many beats to add for enhancement
 */
export interface BeatsToAddResult {
    /** Number of beats to add to reach target */
    beatsToAdd: number;

    /** Target beat count to aim for */
    targetCount: number;

    /** Maximum beats per index based on allowed grid types */
    maxBeatsPerIndex: number;
}

/**
 * Result of validating variant density against target range
 *
 * Task 4.1: Created for convergence validation
 */
export interface VariantDensityValidationResult {
    /** Whether the variant's density is within the target range */
    inRange: boolean;

    /** The calculated density (notes per second) */
    density: number;

    /** The target density range for this difficulty */
    targetRange: { min: number; max: number };

    /** The difficulty level that was validated */
    difficulty: DifficultyLevel;
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

    /** Intensity for interpolated beats (0.0 - 1.0). Default: 0.5 */
    interpolatedBeatIntensity: number;

    /** Whether to prefer pattern insertion over simple interpolation. Default: true */
    preferPatternInsertion: boolean;

    /** Maximum phrase size to consider for pattern insertion (in beats). Default: 4 */
    maxPatternInsertionSize: number;

    /** Strategy for where to target within the density range. Default: 'midpoint' */
    densityTargetStrategy: DensityTargetStrategy;

    /** Maximum number of passes for density reduction with progressively relaxed protections. Default: 3 */
    maxReductionPasses: number;

    /** Seed for deterministic probability rolls in beat enhancement. If not provided, falls back to a hash of beat data. */
    seed?: string;

    /**
     * Rhythmic balance configuration for density reduction awareness.
     * When provided, the density reduction will use the strongBeatEmphasis setting
     * to determine which beats are structurally important.
     *
     * This config is passed from RhythmGenerator to ensure density reduction
     * respects the same rhythmic taste rules as the RhythmicBalancer.
     */
    rhythmicBalanceConfig?: RhythmicBalanceConfig;
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
    interpolatedBeatIntensity: 0.5,
    preferPatternInsertion: true,
    maxPatternInsertionSize: 4,
    densityTargetStrategy: 'midpoint',
    maxReductionPasses: 3,
    seed: undefined,
    rhythmicBalanceConfig: undefined,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a grid type is allowed for a given difficulty at a given BPM.
 *
 * @param gridType - The grid type to check
 * @param difficulty - The difficulty level
 * @param bpm - Optional BPM. When omitted, uses static SUBDIVISION_LIMITS (no tempo restrictions).
 * @returns True if the grid type is allowed
 */
export function isGridTypeAllowed(gridType: GridType, difficulty: DifficultyLevel, bpm?: number): boolean {
    if (bpm !== undefined) {
        return getTempoAwareAllowedGridTypes(difficulty, bpm).includes(gridType);
    }
    return SUBDIVISION_LIMITS[difficulty].allowedGridTypes.includes(gridType);
}

/**
 * Get the allowed grid types for a difficulty level at a given BPM.
 *
 * @param difficulty - The difficulty level
 * @param bpm - Optional BPM. When omitted, uses static SUBDIVISION_LIMITS (no tempo restrictions).
 * @returns Array of allowed grid types
 */
export function getAllowedGridTypes(difficulty: DifficultyLevel, bpm?: number): ExtendedGridType[] {
    if (bpm !== undefined) {
        return getTempoAwareAllowedGridTypes(difficulty, bpm);
    }
    return [...SUBDIVISION_LIMITS[difficulty].allowedGridTypes];
}

/**
 * Convert a grid type to the closest allowed type for a difficulty at a given BPM.
 *
 * Conversion rules (when grid type is not already allowed):
 *
 * - `straight_16th` → `straight_8th` (or `straight_4th` for Easy at BPM > 120)
 * - `triplet_8th` → `quarter_triplet`
 * - `straight_8th` → `straight_4th` (Easy at BPM > 120 only)
 *
 * @param gridType - The original grid type (can be extended type)
 * @param difficulty - The target difficulty
 * @param bpm - Optional BPM. When omitted, uses static SUBDIVISION_LIMITS.
 * @param allowedGridTypesOverride - Optional override for allowed grid types (for density-based generation)
 * @returns The converted grid type (or original if already allowed)
 */
export function convertToAllowedGridType(
    gridType: ExtendedGridType,
    difficulty: DifficultyLevel,
    bpm?: number,
    allowedGridTypesOverride?: ExtendedGridType[]
): ExtendedGridType {
    // Use override if provided (for density-based generation), otherwise derive from difficulty
    const allowedTypes = allowedGridTypesOverride ?? (bpm !== undefined
        ? getTempoAwareAllowedGridTypes(difficulty, bpm)
        : SUBDIVISION_LIMITS[difficulty].allowedGridTypes);

    // If already allowed, return as-is
    if (allowedTypes.includes(gridType)) {
        return gridType;
    }

    // Conversion rules depend on which types are allowed
    switch (gridType) {
        case 'straight_16th':
            // Check if quarter notes are the allowed straight type (Easy at BPM > 120)
            if (allowedTypes.includes('straight_4th') && !allowedTypes.includes('straight_8th')) {
                return 'straight_4th';
            }
            // Default: snap to 8th notes
            return 'straight_8th';

        case 'triplet_8th':
            return 'quarter_triplet';

        case 'straight_8th':
            // Only conversion: 8th → quarter note (Easy at BPM > 120)
            return 'straight_4th';

        default:
            return gridType;
    }
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
 * Validate a list of beats against subdivision limits for a difficulty at a given BPM.
 *
 * @param beats - The beats to validate (may include extended grid types)
 * @param difficulty - The difficulty level to validate against
 * @param bpm - Optional BPM. When omitted, uses static SUBDIVISION_LIMITS.
 * @returns Validation result with any violations
 */
export function validateSubdivisionLimits(
    beats: VariantBeat[],
    difficulty: DifficultyLevel,
    bpm?: number
): SubdivisionValidationResult {
    const violations: SubdivisionViolation[] = [];
    const allowedTypes = bpm !== undefined
        ? getTempoAwareAllowedGridTypes(difficulty, bpm)
        : SUBDIVISION_LIMITS[difficulty].allowedGridTypes;

    for (const beat of beats) {
        if (!allowedTypes.includes(beat.gridType)) {
            violations.push({
                beat,
                gridType: beat.gridType,
                suggestedConversion: convertToAllowedGridType(beat.gridType, difficulty, bpm),
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
    /**
     * Current unifiedBeatMap for time-signature-aware strong beat detection.
     * Set during generate() and used by isStrongBeat().
     */
    private currentUnifiedBeatMap: UnifiedBeatMap | null = null;

    constructor(config: Partial<DifficultyVariantConfig> = {}) {
        this.config = { ...DEFAULT_DIFFICULTY_VARIANT_CONFIG, ...config };
    }

    /**
     * Lock grid type per beat index before density work
     *
     * This is the foundational method for the density balancing refactor.
     * Before any density work (simplification or enhancement), lock the grid
     * type for each beat index so all subsequent operations know which grid to use.
     *
     * The method:
     * 1. Runs `enforceSingleGridPerBeat()` to resolve any mixed grids
     * 2. Builds a map of beatIndex → dominantGridType from resolved beats
     * 3. For empty beat indices, resolves grid type from:
     *    - gridDecisions map (if available)
     *    - Nearest-neighbor fallback (offsets 1, -1, 2, -2, 3, -3)
     *    - Default to allowed grid type for target difficulty
     *
     * @param beats - Input beats (may have mixed grids)
     * @param targetDifficulty - Target difficulty level for default grid type
     * @param bpm - BPM for tempo-aware grid type defaults
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @param allowedGridTypes - Optional override for allowed grid types (bypasses getTempoAwareAllowedGridTypes)
     * @returns Grid lock result with cleaned beats and locked grid map
     */
    lockGridPerBeatIndex(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        bpm: number,
        gridDecisions?: Map<number, GridDecision>,
        allowedGridTypes?: ExtendedGridType[]
    ): GridLockResult {
        // 1.1.1: Run enforceSingleGridPerBeat() to resolve mixed grids
        const cleanedBeats = this.enforceSingleGridPerBeat(beats);

        // 1.1.2: Build Map<number, ExtendedGridType> of beatIndex → dominantGridType
        const gridLock = new Map<number, ExtendedGridType>();

        // Handle empty input - return empty grid lock
        if (cleanedBeats.length === 0) {
            return {
                beats: [],
                gridLock,
            };
        }

        // Get max beat index to know the range we need to cover
        const maxBeatIndex = Math.max(...cleanedBeats.map(b => b.beatIndex));

        // Build the lock map from resolved beats
        const beatsByIndex = new Map<number, CompositeBeat[]>();
        for (const beat of cleanedBeats) {
            const existing = beatsByIndex.get(beat.beatIndex) ?? [];
            existing.push(beat);
            beatsByIndex.set(beat.beatIndex, existing);
        }

        // Fill the lock map with dominant grid types from resolved beats
        for (const [beatIndex, beatsAtIndex] of beatsByIndex) {
            // Since enforceSingleGridPerBeat already resolved mixed grids,
            // all beats at this index should have the same grid type
            gridLock.set(beatIndex, beatsAtIndex[0].gridType);
        }

        // Get allowed grid types for this difficulty/bpm for fallback (or use override)
        const effectiveAllowedGridTypes = allowedGridTypes ?? getTempoAwareAllowedGridTypes(targetDifficulty, bpm);

        // 1.1.3: Fill empty indices using gridDecisions, neighbor fallback, or default
        for (let beatIndex = 0; beatIndex <= maxBeatIndex; beatIndex++) {
            if (gridLock.has(beatIndex)) {
                continue; // Already locked from resolved beats
            }

            // Try gridDecisions map first
            if (gridDecisions?.has(beatIndex)) {
                const decision = gridDecisions.get(beatIndex)!;
                gridLock.set(beatIndex, decision.selectedGrid);
                continue;
            }

            // Try nearest-neighbor fallback (offsets 1, -1, 2, -2, 3, -3)
            let foundFromNeighbor = false;
            for (const offset of [1, -1, 2, -2, 3, -3]) {
                const neighborIndex = beatIndex + offset;
                if (gridLock.has(neighborIndex)) {
                    gridLock.set(beatIndex, gridLock.get(neighborIndex)!);
                    foundFromNeighbor = true;
                    break;
                }
            }

            if (foundFromNeighbor) {
                continue;
            }

            // Default to first allowed grid type for target difficulty
            // For easy: 'straight_8th' (or 'straight_4th' at high BPM)
            // For medium/hard: 'straight_8th' or 'straight_16th' depending on BPM
            const defaultGrid = effectiveAllowedGridTypes[0] ?? 'straight_8th';
            gridLock.set(beatIndex, defaultGrid);
        }

        // 1.1.4 & 1.1.5: Return the lock map alongside the cleaned beats
        return {
            beats: cleanedBeats,
            gridLock,
        };
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
        unifiedBeatMap: UnifiedBeatMap,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): {
        easy: DifficultyVariant;
        medium: DifficultyVariant;
        hard: DifficultyVariant;
        natural: DifficultyVariant;
    } {
        // Task 4.2: Store unifiedBeatMap for time-signature-aware strong beat detection
        this.currentUnifiedBeatMap = unifiedBeatMap;

        const naturalDifficulty = composite.naturalDifficulty;

        // Generate variants based on natural difficulty
        const easy = this.generateVariant(composite, 'easy', naturalDifficulty, unifiedBeatMap, phraseAnalysis, gridDecisions);
        const medium = this.generateVariant(composite, 'medium', naturalDifficulty, unifiedBeatMap, phraseAnalysis, gridDecisions);
        const hard = this.generateVariant(composite, 'hard', naturalDifficulty, unifiedBeatMap, phraseAnalysis, gridDecisions);

        // Task 1.4.3: Validation-only check for single grid type per beat index.
        // Since generateVariant now uses grid lock, the variants should already have
        // consistent grid types per beat index. These checks validate that assumption.
        // If violations are found, it indicates a bug in the grid lock implementation.
        this.validateGridLockResult(easy.beats, 'easy');
        this.validateGridLockResult(medium.beats, 'medium');
        this.validateGridLockResult(hard.beats, 'hard');

        // Generate the natural variant (unedited composite stream)
        // Natural variant still needs enforcement since it doesn't go through grid lock
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

        // Task 4.2.1: Validate density ranges for each variant
        const durationSeconds = unifiedBeatMap?.duration ?? 120;
        easy.densityValidation = this.validateDensityInRange(easy, durationSeconds);
        medium.densityValidation = this.validateDensityInRange(medium, durationSeconds);
        hard.densityValidation = this.validateDensityInRange(hard, durationSeconds);

        // Task 4.2.2: Log density validation summary
        if (this.config.logConversions) {
            const summarize = (v: DifficultyVariant) => {
                const d = v.densityValidation!;
                const maxDisplay = d.targetRange.max === Infinity ? '∞' : d.targetRange.max.toFixed(1);
                const mark = d.inRange ? '✓' : '✗';
                return `${v.difficulty}: ${d.density.toFixed(2)} nps (target [${d.targetRange.min}, ${maxDisplay}]) ${mark}`;
            };
            console.log(
                `[DifficultyVariantGenerator] Density validation summary:\n` +
                `  ${summarize(easy)}\n` +
                `  ${summarize(medium)}\n` +
                `  ${summarize(hard)}`
            );
        }

        return { easy, medium, hard, natural };
    }

    /**
     * Generate a custom difficulty variant at a specific target density.
     *
     * This method provides granular control over difficulty generation by decoupling
     * target density (notes/second) from maximum quantization grid. Unlike the preset
     * difficulties (easy/medium/hard/natural), this allows any combination such as:
     * - Dense chart (3.0 nps) with only 8th note quantization
     * - Sparse chart (0.5 nps) with 16th note quantization allowed
     *
     * The method handles three scenarios:
     * 1. **Current density > target**: Simplify beats (remove/convert notes)
     * 2. **Current density < target**: Enhance beats (add notes via interpolation/patterns)
     * 3. **Current density ≈ target**: Apply grid restrictions only if needed
     *
     * Best-effort: If the target density is impossible given the grid constraints
     * (e.g., 4.0 nps with only 8th notes at 60 BPM), the density is clamped to the
     * maximum achievable and a warning is logged.
     *
     * @param composite - The composite stream from CompositeStreamGenerator
     * @param config - Density generation configuration (target density + max grid type)
     * @param unifiedBeatMap - The unified beat map for timing information
     * @param phraseAnalysis - Optional phrase analysis for pattern library access during enhancement
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @returns A DifficultyVariant with `difficulty: 'custom'`
     *
     * @example
     * ```typescript
     * const generator = new DifficultyVariantGenerator();
     *
     * // Dense chart with 8th note max grid
     * const denseVariant = generator.generateAtDensity(
     *     composite,
     *     { targetDensity: 3.0, maxGridType: 'straight_8th' },
     *     unifiedBeatMap
     * );
     *
     * // Sparse chart with 16th note grid allowed, BPM-based restrictions
     * const sparseVariant = generator.generateAtDensity(
     *     composite,
     *     { targetDensity: 0.5, maxGridType: 'straight_16th', bpmBasedQuantization: true },
     *     unifiedBeatMap
     * );
     * ```
     */
    generateAtDensity(
        composite: CompositeStream,
        config: DensityGenerationConfig,
        unifiedBeatMap: UnifiedBeatMap,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): DifficultyVariant {
        // Store unifiedBeatMap for time-signature-aware strong beat detection
        this.currentUnifiedBeatMap = unifiedBeatMap;

        // Step 1: Derive BPM and duration from unifiedBeatMap
        const bpm = unifiedBeatMap?.quarterNoteBpm ?? 120;
        const durationSeconds = unifiedBeatMap?.duration ?? 120;

        // Step 2: Calculate current composite density
        const currentDensity = this.calculateDensity(composite.beats, durationSeconds);

        // Step 3: Derive allowed grid types from config
        const allowedGridTypes = deriveAllowedGridTypes(config, bpm);

        // Step 4: Calculate max achievable density for these constraints
        const maxAchievableDensity = calculateMaxAchievableDensity(allowedGridTypes, bpm);

        // Step 5: Determine effective target (clamp if necessary)
        let effectiveTargetDensity = config.targetDensity;
        let densityClamped = false;

        if (config.targetDensity > maxAchievableDensity) {
            effectiveTargetDensity = maxAchievableDensity;
            densityClamped = true;
            console.warn(
                `[DifficultyVariantGenerator] Target density ${config.targetDensity.toFixed(2)} nps ` +
                `exceeds max achievable ${maxAchievableDensity.toFixed(2)} nps for grid types ` +
                `[${allowedGridTypes.join(', ')}] at ${bpm} BPM. Clamping to ${effectiveTargetDensity.toFixed(2)} nps.`
            );
        }

        // Step 6: Lock grid types per beat index
        const { beats: lockedBeats, gridLock } = this.lockGridPerBeatIndex(
            composite.beats,
            'custom',
            bpm,
            gridDecisions,
            allowedGridTypes
        );

        // Calculate density after grid lock (may have changed slightly due to enforcement)
        const lockedDensity = this.calculateDensity(lockedBeats, durationSeconds);

        // Step 7: Determine which path to take based on density comparison
        // Use a small epsilon to prevent divide-by-zero issues
        const densityTolerance = 1e-10;
        const safeTargetDensity = Math.max(effectiveTargetDensity, 1e-10);

        // Check if there are any disallowed grid types in the locked beats
        const hasDisallowedGridTypes = lockedBeats.some(b => !allowedGridTypes.includes(b.gridType));

        if (this.config.logConversions) {
            console.log(
                `[DifficultyVariantGenerator] generateAtDensity: current=${lockedDensity.toFixed(2)} nps, ` +
                `target=${safeTargetDensity.toFixed(2)} nps, maxGridType=${config.maxGridType}, ` +
                `allowedTypes=[${allowedGridTypes.join(', ')}], clamped=${densityClamped}`
            );
        }

        // Step 8: Branch based on density comparison
        if (lockedDensity > safeTargetDensity * (1 + densityTolerance)) {
            // Current density is significantly higher than target — simplify
            const result = this.simplifyBeats(
                lockedBeats,
                'custom',
                composite.quarterNoteInterval,
                false, // not heavy simplification
                phraseAnalysis,
                bpm,
                gridLock,
                durationSeconds,
                allowedGridTypes,
                effectiveTargetDensity
            );

            // Run enforceSingleGridPerBeat on result
            const finalBeats = this.enforceSingleGridPerBeat(result.beats);

            return {
                difficulty: 'custom',
                beats: finalBeats,
                isUnedited: false,
                editType: 'simplified',
                editAmount: result.metadata.totalBeatsBefore > 0
                    ? (result.metadata.totalBeatsBefore - result.metadata.totalBeatsAfter) / result.metadata.totalBeatsBefore
                    : 0,
                conversionMetadata: result.metadata,
                densityClamped,
            };
        } else if (lockedDensity < effectiveTargetDensity * (1 - densityTolerance)) {
            // Current density is significantly lower than target — enhance
            const result = this.enhanceBeats(
                lockedBeats,
                'custom',
                bpm,
                unifiedBeatMap,
                phraseAnalysis,
                gridDecisions,
                composite.quarterNoteInterval,
                gridLock,
                allowedGridTypes,
                effectiveTargetDensity
            );

            // Run enforceSingleGridPerBeat on result
            const finalBeats = this.enforceSingleGridPerBeat(result.beats);

            const editType = result.metadata.patternsInserted > 0 ? 'pattern_inserted' : 'interpolated';
            return {
                difficulty: 'custom',
                beats: finalBeats,
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
        } else {
            // Current density is approximately equal to target
            // Still apply grid restriction if there are disallowed grid types
            if (hasDisallowedGridTypes) {
                if (this.config.logConversions) {
                    console.log(
                        `[DifficultyVariantGenerator] Density approximately equal (${lockedDensity.toFixed(2)} ≈ ` +
                        `${effectiveTargetDensity.toFixed(2)}), but grid restrictions needed`
                    );
                }

                const result = this.simplifyBeats(
                    lockedBeats,
                    'custom',
                    composite.quarterNoteInterval,
                    false,
                    phraseAnalysis,
                    bpm,
                    gridLock,
                    durationSeconds,
                    allowedGridTypes,
                    effectiveTargetDensity
                );

                const finalBeats = this.enforceSingleGridPerBeat(result.beats);

                return {
                    difficulty: 'custom',
                    beats: finalBeats,
                    isUnedited: result.metadata.beatsRemoved === 0 && !densityClamped,
                    editType: result.metadata.beatsRemoved > 0 ? 'simplified' : 'none',
                    editAmount: result.metadata.totalBeatsBefore > 0
                        ? (result.metadata.totalBeatsBefore - result.metadata.totalBeatsAfter) / result.metadata.totalBeatsBefore
                        : 0,
                    conversionMetadata: result.metadata,
                    densityClamped,
                };
            }

            // No changes needed — density matches and grid types are all allowed
            const finalBeats = this.enforceSingleGridPerBeat(lockedBeats);

            return {
                difficulty: 'custom',
                beats: finalBeats,
                isUnedited: !densityClamped,
                editType: 'none',
                editAmount: 0,
            };
        }
    }

    /**
     * Generate multiple custom difficulty variants at specific densities in one call
     *
     * This is a convenience method for generating multiple density-based variants
     * efficiently. Each variant is generated independently with its own deep copy
     * of the composite beats, ensuring no shared state or mutations between variants.
     *
     * @param composite - The composite stream from CompositeStreamGenerator
     * @param configs - Array of labeled density configurations
     * @param unifiedBeatMap - The unified beat map for timing information
     * @param phraseAnalysis - Optional phrase analysis for pattern library access during enhancement
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @returns A Map of labels to DifficultyVariants
     *
     * @example
     * ```typescript
     * const generator = new DifficultyVariantGenerator();
     *
     * const variants = generator.generateAtDensities(
     *     composite,
     *     [
     *         { label: 'beginner', config: { targetDensity: 0.5, maxGridType: 'straight_4th' } },
     *         { label: 'intermediate', config: { targetDensity: 1.5, maxGridType: 'straight_8th' } },
     *         { label: 'expert', config: { targetDensity: 3.0, maxGridType: 'straight_16th' } },
     *     ],
     *     unifiedBeatMap
     * );
     *
     * const beginnerVariant = variants.get('beginner');
     * const expertVariant = variants.get('expert');
     * ```
     */
    generateAtDensities(
        composite: CompositeStream,
        configs: { label: string; config: DensityGenerationConfig }[],
        unifiedBeatMap: UnifiedBeatMap,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): Map<string, DifficultyVariant> {
        const results = new Map<string, DifficultyVariant>();

        for (const { label, config } of configs) {
            // Create a deep copy of the composite for independent variant generation
            // This ensures mutations in one variant don't affect others
            const compositeCopy: CompositeStream = {
                ...composite,
                beats: composite.beats.map(beat => ({ ...beat })),
            };

            // Generate the variant using the existing generateAtDensity method
            const variant = this.generateAtDensity(
                compositeCopy,
                config,
                unifiedBeatMap,
                phraseAnalysis,
                gridDecisions
            );

            results.set(label, variant);
        }

        return results;
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
     * Validate that a variant's beats have no mixed grid types per beat index
     *
     * Task 1.4.3: Validation-only check for grid lock compliance.
     * When grid lock is used in generateVariant(), this method confirms
     * that no grid violations exist (assert, don't fix).
     *
     * @param beats - The beats to validate
     * @param difficulty - The difficulty level for logging
     */
    private validateGridLockResult(beats: VariantBeat[], difficulty: DifficultyLevel): void {
        const validation = this.validateSingleGridPerBeat(beats);

        if (!validation.isValid) {
            // This shouldn't happen if grid lock is working correctly.
            // Log a warning to alert developers about the bug.
            console.warn(
                `[DifficultyVariantGenerator] ${difficulty} variant has ${validation.violations.length} ` +
                `grid lock violations (mixed grid types at same beat index). ` +
                `This indicates a bug in the grid lock implementation.`
            );

            if (this.config.logConversions) {
                for (const violation of validation.violations.slice(0, 5)) {
                    console.warn(
                        `  - Beat index ${violation.beatIndex} has mixed grids: ${violation.gridTypes.join(', ')}`
                    );
                }
                if (validation.violations.length > 5) {
                    console.warn(`  ... and ${validation.violations.length - 5} more violations`);
                }
            }
        }
    }


    /**
     * Validate that a variant's density falls within the target range for its difficulty
     *
     * Task 4.1: Convergence validation - check final density against target range
     *
     * This method calculates the final density of a variant and compares it against
     * the target density range defined in SUBDIVISION_LIMITS. It logs warnings for
     * out-of-range variants but does NOT throw, since edge cases (very short songs,
     * extreme tempos) may not be able to hit exact targets.
     *
     * @param variant - The variant to validate
     * @param bpm - The tempo in beats per minute
     * @returns DensityValidationResult with inRange status, density, and target range
     */
    private validateDensityInRange(
        variant: DifficultyVariant,
        durationSeconds: number
    ): VariantDensityValidationResult {
        // Task 4.1.1: Calculate final density for the variant
        const density = this.calculateDensity(variant.beats, durationSeconds);

        // Task 4.1.2: Compare against SUBDIVISION_LIMITS[difficulty].targetDensityRange
        const targetRange = SUBDIVISION_LIMITS[variant.difficulty].targetDensityRange;

        // Check if density is within range (handle Infinity for hard difficulty max)
        const inRange = density >= targetRange.min &&
            (targetRange.max === Infinity || density <= targetRange.max);

        // Task 4.1.3: Log warnings for variants that are out of range
        if (!inRange) {
            const maxDisplay = targetRange.max === Infinity ? '∞' : targetRange.max.toFixed(2);
            console.warn(
                `[DifficultyVariantGenerator] ${variant.difficulty} variant density ${density.toFixed(2)} nps ` +
                `is OUTSIDE target range [${targetRange.min.toFixed(2)}, ${maxDisplay}]. ` +
                `This may occur for edge cases (short songs, extreme tempos).`
            );
        } else if (this.config.logConversions) {
            const maxDisplay = targetRange.max === Infinity ? '∞' : targetRange.max.toFixed(2);
            console.log(
                `[DifficultyVariantGenerator] ${variant.difficulty} variant density ${density.toFixed(2)} nps ` +
                `is within target range [${targetRange.min.toFixed(2)}, ${maxDisplay}] ✓`
            );
        }

        // Task 4.1.4: Return validation result
        return {
            inRange,
            density,
            targetRange,
            difficulty: variant.difficulty,
        };
    }
    /**
     * Generate a single difficulty variant
     *
     * @param targetDifficulty - The target difficulty level
     * @param composite - The composite stream
     * @param naturalDifficulty - The natural difficulty of the composite
     * @param phraseAnalysis - Optional phrase analysis for pattern library access
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @returns The difficulty variant
     */
    private generateVariant(
        composite: CompositeStream,
        targetDifficulty: DifficultyLevel,
        naturalDifficulty: NaturalDifficulty,
        unifiedBeatMap: UnifiedBeatMap,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>
    ): DifficultyVariant {
        const isNatural = targetDifficulty === naturalDifficulty;
        const bpm = unifiedBeatMap?.quarterNoteBpm ?? 120;
        const durationSeconds = unifiedBeatMap?.duration ?? 120;
        const allowedTypes = getTempoAwareAllowedGridTypes(targetDifficulty, bpm);

        // Task 1.4.1: Lock grid types per beat index before any density work.
        // This ensures all subsequent operations (simplify/enhance) use consistent
        // grid types per beat index, so enforceSingleGridPerBeat never has to discard work.
        const { beats: lockedBeats, gridLock } = this.lockGridPerBeatIndex(
            composite.beats,
            targetDifficulty,
            bpm,
            gridDecisions
        );

        if (isNatural) {
            // Check if all beats already have allowed grid types
            const allTypesAllowed = lockedBeats.every(b => allowedTypes.includes(b.gridType));

            if (allTypesAllowed) {
                // Even for natural difficulty, check if density is below the midpoint target.
                // If so, we need to enhance to reach the target density.
                const { targetCount } = this.calculateBeatCountTarget(
                    lockedBeats.length, durationSeconds, targetDifficulty
                );

                if (lockedBeats.length < targetCount) {
                    // Density is below midpoint — enhance to reach it
                    const result = this.enhanceBeats(
                        lockedBeats,
                        targetDifficulty,
                        bpm,
                        unifiedBeatMap,
                        phraseAnalysis,
                        gridDecisions,
                        composite.quarterNoteInterval,
                        gridLock
                    );

                    const editType = result.metadata.patternsInserted > 0 ? 'pattern_inserted' : 'interpolated';
                    return {
                        difficulty: targetDifficulty,
                        beats: result.beats,
                        isUnedited: false,
                        editType,
                        editAmount: result.metadata.totalBeatsBefore > 0
                            ? (result.metadata.totalBeatsAfter - result.metadata.totalBeatsBefore) / result.metadata.totalBeatsBefore
                            : 0,
                        enhancementMetadata: result.metadata,
                    };
                }

                // This variant is the unedited composite (with grid lock applied)
                return {
                    difficulty: targetDifficulty,
                    beats: [...lockedBeats],
                    isUnedited: true,
                    editType: 'none',
                    editAmount: 0,
                };
            }

            // Even for "natural" difficulty, we must ensure grid types are allowed
            // This handles edge cases where DensityAnalyzer may misclassify or
            // the composite has mixed grid types
            // Task 1.4.2: Pass gridLock to simplifyBeats
            const result = this.simplifyBeats(
                lockedBeats,
                targetDifficulty,
                composite.quarterNoteInterval,
                false,
                phraseAnalysis,
                bpm,
                gridLock,
                durationSeconds
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
            // Task 1.4.2: Pass lockedBeats and gridLock to simplifyBeats
            const result = this.simplifyBeats(
                lockedBeats,
                targetDifficulty,
                composite.quarterNoteInterval,
                isHeavySimplification,
                phraseAnalysis,
                bpm,
                gridLock,
                durationSeconds
            );

            // After simplification, check if grid conversion overshot below the midpoint target.
            // If so, enhance back up to reach the target density.
            const { targetCount } = this.calculateBeatCountTarget(
                result.beats.length, durationSeconds, targetDifficulty
            );

            if (result.beats.length < targetCount - 1) {
                // Grid conversion overshot significantly — enhance back toward midpoint
                const enhanceResult = this.enhanceBeats(
                    result.beats as CompositeBeat[],
                    targetDifficulty,
                    bpm,
                    unifiedBeatMap,
                    phraseAnalysis,
                    gridDecisions,
                    composite.quarterNoteInterval,
                    gridLock
                );

                const editType = enhanceResult.metadata.patternsInserted > 0 ? 'pattern_inserted' : 'interpolated';
                return {
                    difficulty: targetDifficulty,
                    beats: enhanceResult.beats,
                    isUnedited: false,
                    editType,
                    editAmount: 1,
                    conversionMetadata: result.metadata,
                    enhancementMetadata: enhanceResult.metadata,
                };
            }

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
            // Task 3.3.2: enhancementLevel removed — target density range drives beat count now.
            // Enhance beats using global target-based distribution.
            // Task 1.4.2: Pass lockedBeats and gridLock to enhanceBeats
            const result = this.enhanceBeats(
                lockedBeats,
                targetDifficulty,
                bpm,
                unifiedBeatMap,
                phraseAnalysis,
                gridDecisions,
                composite.quarterNoteInterval,
                gridLock
            );

            // Apply BPM-aware grid type conversion if enhanced beats violate tempo limits
            let finalBeats = result.beats as VariantBeat[];
            const hasViolations = finalBeats.some(b => !allowedTypes.includes(b.gridType));
            if (hasViolations) {
                const converted: VariantBeat[] = [];
                for (const beat of finalBeats) {
                    if (allowedTypes.includes(beat.gridType)) {
                        converted.push(beat);
                    } else {
                        const c = this.convertBeatGridType(beat, targetDifficulty, composite.quarterNoteInterval, bpm);
                        if (c) converted.push(c);
                    }
                }
                finalBeats = this.deduplicateConvertedBeats(converted);
            }

            // Determine edit type based on what was actually done
            const editType = result.metadata.patternsInserted > 0 ? 'pattern_inserted' : 'interpolated';

            return {
                difficulty: targetDifficulty,
                beats: finalBeats,
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

        // Default: return unedited (with grid lock applied)
        return {
            difficulty: targetDifficulty,
            beats: [...lockedBeats],
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
        phraseAnalysis?: PhraseAnalysisResult,
        bpm: number = 120,
        gridLock?: Map<number, ExtendedGridType>,
        durationSeconds: number = 120,
        allowedGridTypes?: ExtendedGridType[],    // Override getTempoAwareAllowedGridTypes()
        targetDensity?: number                   // Override calculateBeatCountTarget()
    ): { beats: VariantBeat[]; metadata: SubdivisionConversionMetadata } {
        const metadata: SubdivisionConversionMetadata = {
            sixteenthToEighth: 0,
            tripletToQuarterTriplet: 0,
            eighthToQuarter: 0,
            beatsRemoved: 0,
            totalBeatsBefore: beats.length,
            totalBeatsAfter: 0,
        };

        // Build phrase membership map for boundary preservation
        const phraseMembership = this.buildPhraseMembershipMap(phraseAnalysis);

        // Task 1.2.2: Skip enforceSingleGridPerBeat() if grid lock is provided
        // Grid lock means beats are already cleaned by lockGridPerBeatIndex()
        const cleanedBeats = gridLock
            ? beats
            : this.enforceSingleGridPerBeat(beats);
        metadata.totalBeatsBefore = cleanedBeats.length;

        // If all grid types are allowed, no grid conversion needed, but density reduction may still be required
        // Use override if provided (for density-based generation), otherwise derive from difficulty
        const allowedTypes = allowedGridTypes ?? getTempoAwareAllowedGridTypes(targetDifficulty, bpm);
        const allTypesAllowed = cleanedBeats.every(b => allowedTypes.includes(b.gridType));

        if (allTypesAllowed && !isHeavySimplification) {
            // Calculate target beat count from midpoint density
            // Use override if provided (for density-based generation), otherwise use difficulty-based calculation
            const targetCount = targetDensity !== undefined
                ? Math.round(targetDensity * durationSeconds)
                : this.calculateBeatCountTarget(cleanedBeats.length, durationSeconds, targetDifficulty).targetCount;

            // Even though grid types are allowed, check if density reduction is needed
            const densityReducedBeats = this.reduceDensityToTarget(
                cleanedBeats as VariantBeat[],
                targetDifficulty,
                metadata,
                phraseMembership,
                bpm,
                targetCount,
                durationSeconds
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
            // Task 1.2.3: Pass the locked grid type if available
            // For density-based generation: pass allowedTypes override so conversion respects custom grid restrictions
            const lockedGridType = gridLock?.get(beat.beatIndex);
            const convertedBeat = this.convertBeatGridType(beat, targetDifficulty, quarterNoteInterval, bpm, lockedGridType, allowedTypes);

            if (convertedBeat) {
                convertedBeats.push(convertedBeat);

                // Track conversion type
                if (beat.gridType === 'straight_16th') {
                    metadata.sixteenthToEighth++;
                    if (this.config.logConversions) {
                        const targetType = convertedBeat.gridType === 'straight_4th' ? 'quarter' : '8th';
                        console.log(
                            `[DifficultyVariantGenerator] Converted 16th note at beat ${beat.beatIndex} ` +
                            `position ${beat.gridPosition} to ${targetType} note`
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
                } else if (beat.gridType === 'straight_8th') {
                    metadata.eighthToQuarter++;
                    if (this.config.logConversions) {
                        console.log(
                            `[DifficultyVariantGenerator] Converted 8th note at beat ${beat.beatIndex} ` +
                            `position ${beat.gridPosition} to quarter note`
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

        // Task 2.3.1: Account for beats that collapsed during grid conversion
        // When 16ths → 8ths, two 16ths may snap to the same 8th position
        const beatsCollapsedDuringConversion = convertedBeats.length - deduplicatedBeats.length;

        // Task 2.3.2: After grid conversion, re-check the beat count against the target before running reduceDensityToTarget()
        const currentDensity = this.calculateDensity(deduplicatedBeats, durationSeconds);
        // Use override if provided (for density-based generation), otherwise use difficulty-based calculation
        const targetCount = targetDensity !== undefined
            ? Math.round(targetDensity * durationSeconds)
            : this.calculateBeatCountTarget(deduplicatedBeats.length, durationSeconds, targetDifficulty).targetCount;
        const effectiveTargetDensity = targetDensity ?? this.calculateBeatCountTarget(deduplicatedBeats.length, durationSeconds, targetDifficulty).targetDensity;

        // Task 2.3.3: If grid conversion alone brought density to or below midpoint target, skip reduceDensityToTarget()
        if (deduplicatedBeats.length <= targetCount) {
            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Grid conversion achieved target density: ` +
                    `${currentDensity.toFixed(2)} notes/sec (target midpoint ${effectiveTargetDensity.toFixed(2)} nps, ${targetCount} beats) for ${targetDifficulty}` +
                    (beatsCollapsedDuringConversion > 0 ? ` (${beatsCollapsedDuringConversion} beats collapsed)` : '')
                );
            }
            metadata.totalBeatsAfter = deduplicatedBeats.length;
            return { beats: deduplicatedBeats, metadata };
        }

        // Apply density-aware reduction if still above target
        // This ensures we actually meet the midpoint target density for the difficulty
        const densityReducedBeats = this.reduceDensityToTarget(
            deduplicatedBeats,
            targetDifficulty,
            metadata,
            phraseMembership,
            bpm,
            targetCount,
            durationSeconds
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
     * Determine if a beat index is on a strong beat, based on time signature and emphasis mode
     *
     * This method uses the rhythmicBalanceConfig.strongBeatEmphasis to determine
     * which beats are "strong" for density reduction priority. It is
     * time-signature-aware: derives beatsPerMeasure from the active downbeat segment.
     *
     * @param beatIndex - The beat index (0-indexed)
     * @returns True if this is a strong beat
     */
    private isStrongBeat(beatIndex: number): boolean {
        // Get the emphasis mode from config, default to 'natural'
        const emphasis = this.config.rhythmicBalanceConfig?.strongBeatEmphasis ?? 'natural';

        // If neutral mode, no beats are considered strong
        if (emphasis === 'neutral') {
            return false;
        }

        // Get the unified beat map
        const unifiedBeatMap = this.currentUnifiedBeatMap;
        if (!unifiedBeatMap) {
            // No unified beat map available, fall back to 4/4 natural behavior (backwards compatible)
            const positionInMeasure = beatIndex % 4;
            return positionInMeasure === 0 || positionInMeasure === 2;
        }

        // Get beat info from unified beat map
        const beatInfo = unifiedBeatMap.beats[beatIndex];
        if (!beatInfo) {
            // Beat index out of range, fall back to 4/4 behavior
            const positionInMeasure = beatIndex % 4;
            return positionInMeasure === 0 || positionInMeasure === 2;
        }

        // Get beats per measure from the active segment
        const segments = unifiedBeatMap.downbeatConfig?.segments;
        if (!segments || segments.length === 0) {
            // No segments available, fall back to 4/4 behavior
            const positionInMeasure = beatIndex % 4;
            return positionInMeasure === 0 || positionInMeasure === 2;
        }

        // Find the active segment for this beat index
        const activeSegment = findActiveSegment(segments, beatIndex);
        const beatsPerMeasure = activeSegment.timeSignature.beatsPerMeasure;

        // Use the helper function from RhythmicBalancer
        return isStrongBeatForEmphasis(
            beatInfo.beatInMeasure,
            beatsPerMeasure,
            emphasis
        );
    }

    /**
     * Calculate the density (notes per second) of a beat collection
     *
     * Uses `maxBeatIndex + 1` as the denominator to match DensityAnalyzer's method,
     * Uses the actual track duration in seconds to compute true notes-per-second.
     *
     * @param beats - The beats to analyze
     * @param durationSeconds - Actual track duration in seconds (from unifiedBeatMap.duration)
     * @returns Notes per second (0 if no beats or no duration)
     */
    private calculateDensity(beats: CompositeBeat[] | VariantBeat[], durationSeconds: number): number {
        if (beats.length === 0 || durationSeconds <= 0) return 0;

        return beats.length / durationSeconds;
    }

    /**
     * Calculate target beat count for a difficulty level based on density ranges
     *
     * This is the foundational helper for global target-based density control.
     * It calculates exactly how many beats should be in the output based on:
     * - The target density range for the difficulty
     * - The total quarter-note span of the song
     * - The BPM
     * - The configured strategy (midpoint/lower/upper)
     *
     * Target densities by difficulty:
     * - Easy: 0.9 nps (biased high within [0, 1.0] to preserve musical interest)
     * - Medium: 1.25 nps (true center of [1.0, 1.5])
     * - Hard: 1.75 nps (target above the 1.5 floor)
     * - Natural: Uses the current density (no target)
     *
     * The formula derives from: density = (beatCount / totalQuarterNotes) * (bpm / 60)
     * Solving for beatCount: beatCount = density * totalQuarterNotes * 60 / bpm
     *
     * @param currentBeatCount - The current number of beats
     * @param totalQuarterNotes - The total quarter-note span (maxBeatIndex + 1)
     * @param bpm - Tempo in beats per minute
     * @param targetDifficulty - The target difficulty level
     * @returns Beat count target with min/max bounds
     */
    private calculateBeatCountTarget(
        currentBeatCount: number,
        durationSeconds: number,
        targetDifficulty: DifficultyLevel
    ): BeatCountTarget {
        const targetRange = SUBDIVISION_LIMITS[targetDifficulty].targetDensityRange;

        // For natural and custom difficulty, use current density as target
        if (targetDifficulty === 'natural' || targetDifficulty === 'custom') {
            const currentDensity = durationSeconds > 0 ? currentBeatCount / durationSeconds : 0;
            return {
                targetCount: currentBeatCount,
                maxCount: currentBeatCount,
                minCount: currentBeatCount,
                targetDensity: currentDensity,
            };
        }

        // Define target density midpoints per difficulty
        const densityMidpoints: Record<'easy' | 'medium' | 'hard', number> = {
            easy: 0.9,    // Biased high within [0, 1.0] to preserve musical interest
            medium: 1.25, // True center of [1.0, 1.5]
            hard: 1.75,   // Target above the 1.5 floor
        };

        const midpoint = densityMidpoints[targetDifficulty as 'easy' | 'medium' | 'hard'];

        // Apply strategy offset
        let targetDensity: number;
        switch (this.config.densityTargetStrategy) {
            case 'lower':
                // Aim 75% toward the minimum from the midpoint
                targetDensity = midpoint * 0.75 + targetRange.min * 0.25;
                break;
            case 'upper': {
                // Aim 75% toward the maximum from the midpoint
                const maxDensity = targetRange.max === Infinity ? midpoint * 1.5 : targetRange.max;
                targetDensity = midpoint * 0.75 + maxDensity * 0.25;
                break;
            }
            case 'midpoint':
            default:
                targetDensity = midpoint;
                break;
        }

        // Clamp target to the valid range
        const maxDensity = targetRange.max === Infinity ? targetDensity : targetRange.max;
        targetDensity = Math.max(targetRange.min, Math.min(maxDensity, targetDensity));

        // Calculate beat counts from densities
        // Formula: beatCount = density * durationSeconds
        const minCount = Math.round(targetRange.min * durationSeconds);
        const maxCount = targetRange.max === Infinity
            ? Infinity
            : Math.round(targetRange.max * durationSeconds);
        const targetCount = Math.round(targetDensity * durationSeconds);

        return {
            targetCount,
            maxCount,
            minCount,
            targetDensity,
        };
    }

    /**
     * Calculate how many beats to add for density enhancement
     *
     * This method calculates the exact number of beats to add to reach the target
     * density for a given difficulty level. It uses the same target density midpoints
     * as calculateBeatCountTarget() for consistency.
     *
     * Task 3.1: Global target-based density enhancement helper
     *
     * @param currentBeatCount - Current number of beats
     * @param durationSeconds - Actual track duration in seconds
     * @param bpm - Beats per minute
     * @param targetDifficulty - Target difficulty level
     * @returns BeatsToAddResult with beatsToAdd, targetCount, and maxBeatsPerIndex
     */
    private calculateBeatsToAdd(
        currentBeatCount: number,
        durationSeconds: number,
        bpm: number,
        targetDifficulty: DifficultyLevel
    ): BeatsToAddResult {
        // Get target count from the existing helper (Task 2.1)
        const target = this.calculateBeatCountTarget(
            currentBeatCount,
            durationSeconds,
            targetDifficulty
        );

        // Calculate how many beats to add (never negative)
        const beatsToAdd = Math.max(0, target.targetCount - currentBeatCount);

        // Determine max beats per index based on allowed grid types
        // The max is determined by the most complex allowed grid type
        const allowedTypes = getTempoAwareAllowedGridTypes(targetDifficulty, bpm);
        const maxBeatsPerIndex = this.getMaxBeatsPerIndexFromGridTypes(allowedTypes);

        return {
            beatsToAdd,
            targetCount: target.targetCount,
            maxBeatsPerIndex,
        };
    }

    /**
     * Get max beats per index from a set of allowed grid types
     *
     * Returns the maximum number of beats that can fit at a single beat index
     * based on the most complex grid type in the allowed set.
     *
     * @param allowedTypes - Array of allowed grid types
     * @returns Maximum beats per index
     */
    private getMaxBeatsPerIndexFromGridTypes(allowedTypes: ExtendedGridType[]): number {
        // Find the max among allowed types
        let maxPositions = 1;
        for (const gridType of allowedTypes) {
            const positions = GRID_TYPE_MAX_POSITIONS[gridType];
            if (positions > maxPositions) {
                maxPositions = positions;
            }
        }

        return maxPositions;
    }

    /**
     * Get max beats for a single grid type
     *
     * @param gridType - The grid type
     * @returns Maximum beats per index for this grid type
     */
    private getMaxBeatsForGridType(gridType: ExtendedGridType): number {
        return GRID_TYPE_MAX_POSITIONS[gridType] ?? 1;
    }

    /**
     * Distribute beats across indices to reach a global target count
     *
     * Uses deterministic global target-based distribution.
     *
     * Strategy:
     * - Phase A: Fill empty indices first (prioritize gaps in rhythm)
     * - Phase B: Fill partially occupied indices (add to existing beats)
     *
     * The distribution is deterministic and greedy. Empty indices are always prioritized.
     * Seed is only used for tiebreaking when multiple indices are equally good candidates.
     *
     * @param beatsToAdd - Global count of beats to add
     * @param beatsByIndex - Current beat occupancy per index
     * @param gridLock - Per-index grid types (from lockGridPerBeatIndex)
     * @param maxBeatIndex - The highest beat index in the song
     * @param seed - Seed for deterministic tiebreaking
     * @returns Map of beatIndex → targetCount (how many beats should be at each index after distribution)
     */
    private distributeBeatsAcrossIndices(
        beatsToAdd: number,
        beatsByIndex: Map<number, CompositeBeat[]>,
        gridLock: Map<number, ExtendedGridType>,
        maxBeatIndex: number,
        seed: string,
        allowedGridTypes?: ExtendedGridType[]    // Override for max beats per index fallback
    ): Map<number, number> {
        const targetMap = new Map<number, number>();
        let remainingBeats = beatsToAdd;

        // Initialize target map with current counts
        for (let i = 0; i <= maxBeatIndex; i++) {
            const currentBeats = beatsByIndex.get(i) ?? [];
            targetMap.set(i, currentBeats.length);
        }

        if (remainingBeats <= 0) {
            return targetMap;
        }

        // Helper to get max beats per index: use grid lock (clamped to allowed), then allowedGridTypes, then default
        const getMaxForIndex = (beatIdx: number): number => {
            const lockedGrid = gridLock.get(beatIdx);
            if (lockedGrid) {
                // When allowedGridTypes is provided, clamp capacity to what's allowed.
                // A grid lock of triplet_8th (3 positions) must not exceed 2 when only
                // straight_8th is allowed, otherwise distributeBeatsAcrossIndices will
                // overestimate capacity at that index.
                if (allowedGridTypes && !allowedGridTypes.includes(lockedGrid)) {
                    return this.getMaxBeatsPerIndexFromGridTypes(allowedGridTypes);
                }
                return this.getMaxBeatsForGridType(lockedGrid);
            }
            if (allowedGridTypes) {
                return this.getMaxBeatsPerIndexFromGridTypes(allowedGridTypes);
            }
            return 4; // Default to 4 (16th notes) if no override
        };

        // Identify empty and partially occupied indices
        const emptyIndices: number[] = [];
        const partiallyOccupiedIndices: number[] = [];

        for (let i = 0; i <= maxBeatIndex; i++) {
            const currentCount = targetMap.get(i) ?? 0;
            const maxForIndex = getMaxForIndex(i);

            if (currentCount === 0) {
                emptyIndices.push(i);
            } else if (currentCount < maxForIndex) {
                partiallyOccupiedIndices.push(i);
            }
        }

        // Phase A: Fill empty indices first
        // Group consecutive empty indices to identify gap sizes
        const gaps = this.groupConsecutiveEmptyIndices(emptyIndices);

        // Sort gaps by priority:
        // 1. Small gaps (1-2 indices) first - they benefit most from pattern continuity
        // 2. Then larger gaps
        // Use seed for deterministic ordering when gaps are same size
        gaps.sort((a, b) => {
            const sizeDiff = a.length - b.length;
            if (sizeDiff !== 0) return sizeDiff;
            // Tiebreak by first index using hash
            const hashA = hashSeedToFloat(deriveSeed(seed, `gap:${a[0]}`));
            const hashB = hashSeedToFloat(deriveSeed(seed, `gap:${b[0]}`));
            return hashA - hashB;
        });

        // Fill gaps in order
        for (const gap of gaps) {
            if (remainingBeats <= 0) break;

            const isSmallGap = gap.length <= 2;

            for (const beatIndex of gap) {
                if (remainingBeats <= 0) break;

                const maxForIndex = getMaxForIndex(beatIndex);

                // Determine how many beats to add at this index
                let beatsHere: number;
                if (isSmallGap) {
                    // Small gaps: add 1-2 beats for musical interest
                    // Prioritize position 0 (downbeat), then offbeats
                    beatsHere = Math.min(maxForIndex, remainingBeats, 2);
                } else {
                    // Large gaps: add just 1 beat to maintain the beat
                    // without making sparse sections too busy
                    beatsHere = Math.min(maxForIndex, remainingBeats, 1);
                }

                if (beatsHere > 0) {
                    targetMap.set(beatIndex, beatsHere);
                    remainingBeats -= beatsHere;
                }
            }
        }

        // Phase B: Fill partially occupied indices
        // Sort by how many slots are available (more slots = higher priority)
        partiallyOccupiedIndices.sort((a, b) => {
            const currentA = targetMap.get(a) ?? 0;
            const currentB = targetMap.get(b) ?? 0;
            const maxA = getMaxForIndex(a);
            const maxB = getMaxForIndex(b);
            const availableA = maxA - currentA;
            const availableB = maxB - currentB;

            // Prioritize indices with more available slots
            const availableDiff = availableB - availableA;
            if (availableDiff !== 0) return availableDiff;

            // Tiebreak using hash
            const hashA = hashSeedToFloat(deriveSeed(seed, `partial:${a}`));
            const hashB = hashSeedToFloat(deriveSeed(seed, `partial:${b}`));
            return hashA - hashB;
        });

        // Fill partially occupied indices
        for (const beatIndex of partiallyOccupiedIndices) {
            if (remainingBeats <= 0) break;

            const currentCount = targetMap.get(beatIndex) ?? 0;
            const maxForIndex = getMaxForIndex(beatIndex);

            const available = maxForIndex - currentCount;
            if (available > 0) {
                const toAdd = Math.min(available, remainingBeats);
                targetMap.set(beatIndex, currentCount + toAdd);
                remainingBeats -= toAdd;
            }
        }

        // Phase C: If still remaining beats, top up empty indices to their full grid lock capacity.
        // Phase A uses conservative limits (1 beat for large gaps, 2 for small) to avoid
        // over-filling sparse sections, but if we still need more beats, fill the gaps.
        if (remainingBeats > 0) {
            for (const beatIndex of emptyIndices) {
                if (remainingBeats <= 0) break;

                const currentCount = targetMap.get(beatIndex) ?? 0;
                const maxForIndex = getMaxForIndex(beatIndex);
                const available = maxForIndex - currentCount;

                if (available > 0) {
                    const toAdd = Math.min(available, remainingBeats);
                    targetMap.set(beatIndex, currentCount + toAdd);
                    remainingBeats -= toAdd;
                }
            }
        }

        return targetMap;
    }

    /**
     * Group consecutive empty indices into gaps
     *
     * @param emptyIndices - Array of empty beat indices (sorted)
     * @returns Array of gap arrays, each containing consecutive empty indices
     */
    private groupConsecutiveEmptyIndices(
        emptyIndices: number[]
    ): number[][] {
        if (emptyIndices.length === 0) return [];

        const gaps: number[][] = [];
        let currentGap: number[] = [emptyIndices[0]];

        for (let i = 1; i < emptyIndices.length; i++) {
            const prev = emptyIndices[i - 1];
            const curr = emptyIndices[i];

            // Check if indices are consecutive
            if (curr === prev + 1) {
                currentGap.push(curr);
            } else {
                gaps.push(currentGap);
                currentGap = [curr];
            }
        }

        // Don't forget the last gap
        gaps.push(currentGap);

        return gaps;
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
     * - Pass 1: Beats with priority >= (1 - densityReductionMinIntensity) or intensity >= moderateSimplificationIntensityThreshold
     * - Pass 2: Relaxed thresholds (priority threshold lowered by 0.15, intensity threshold lowered by 0.1)
     * - Pass 3+: Only strong beats (beatIndex % 4 === 0 or 2) are protected
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
        phraseMembership: Map<number, RhythmicPhrase[]> = new Map(),
        bpm: number = 120,
        targetCount?: number,
        durationSeconds: number = 120
    ): T[] {
        const targetRange = SUBDIVISION_LIMITS[targetDifficulty].targetDensityRange;
        const initialDensity = this.calculateDensity(beats, durationSeconds);

        // If already at or below the midpoint target count, no reduction needed
        if (targetCount !== undefined && beats.length <= targetCount) {
            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Density ${initialDensity.toFixed(2)} notes/sec already at or below ` +
                    `target midpoint (${targetCount} beats) for ${targetDifficulty}`
                );
            }
            return beats;
        }

        // Fallback: if no targetCount provided, use range max (legacy behavior)
        if (initialDensity <= targetRange.max && targetCount === undefined) {
            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Density ${initialDensity.toFixed(2)} notes/sec already within ` +
                    `target range [${targetRange.min}, ${targetRange.max}] for ${targetDifficulty}`
                );
            }
            return beats;
        }

        if (this.config.logConversions) {
            console.log(
                `[DifficultyVariantGenerator] Reducing density from ${initialDensity.toFixed(2)} notes/sec to ` +
                `target max ${targetRange.max} notes/sec for ${targetDifficulty}`
            );
        }

        // Task 4.3.2: Build a map of measureNumber → downbeatCount for structural importance
        // This allows us to identify beats that are the only downbeat in their measure
        const downbeatCountByMeasure = this.buildDownbeatCountMap(beats);

        // Calculate removal priority for each beat (do this once upfront)
        const beatsWithPriority = beats.map(beat => ({
            beat,
            priority: this.calculateRemovalPriority(beat, phraseMembership, downbeatCountByMeasure),
        }));

        // Sort by priority (ascending - lowest priority first for removal)
        beatsWithPriority.sort((a, b) => a.priority - b.priority);

        // Track removed beats across all passes
        const removedBeats = new Set<T>();
        let remainingCount = beats.length;
        const maxPasses = this.config.maxReductionPasses;
        let passesUsed = 0;

        // Multi-pass convergence loop (Task 2.2.5-2.2.8)
        for (let pass = 1; pass <= maxPasses; pass++) {
            passesUsed = pass;
            let beatsRemovedThisPass = 0;
            const isFinalPass = pass === maxPasses;

            // Calculate thresholds for this pass
            let priorityThreshold: number;
            let intensityThreshold: number;
            let protectStrongBeatsOnly = false;

            if (pass === 1) {
                // Pass 1: Full protections (Task 2.2.3)
                priorityThreshold = 1 - this.config.densityReductionMinIntensity;
                intensityThreshold = this.config.moderateSimplificationIntensityThreshold;
            } else if (pass === 2) {
                // Pass 2: Relaxed protections (Task 2.2.5)
                priorityThreshold = (1 - this.config.densityReductionMinIntensity) - 0.15;
                intensityThreshold = this.config.moderateSimplificationIntensityThreshold - 0.1;
            } else {
                // Pass 3+: Final fallback - only protect strong beats (Task 2.2.6)
                protectStrongBeatsOnly = true;
                priorityThreshold = 0;
                intensityThreshold = 0;
            }

            for (const { beat, priority } of beatsWithPriority) {
                // Skip already removed beats
                if (removedBeats.has(beat)) continue;

                // Check if we've reached target density
                if (targetCount !== undefined) {
                    // Use midpoint target count as primary stopping condition
                    if (remainingCount - 1 <= targetCount) {
                        // We've reached the midpoint target, stop this pass
                        break;
                    }
                } else {
                    // Fallback: use range max (legacy behavior)
                    const projectedDensity = (remainingCount - 1) / durationSeconds;
                    if (projectedDensity <= targetRange.max) {
                        // We've removed enough beats, stop this pass
                        break;
                    }
                }

                // Check protection rules for this pass
                if (protectStrongBeatsOnly) {
                    // Pass 3: Only protect strong beats (beatIndex % 4 === 0 or 2)
                    if (this.isStrongBeat(beat.beatIndex)) {
                        continue;
                    }
                } else {
                    // Pass 1 & 2: Use priority and intensity thresholds
                    if (priority >= priorityThreshold || beat.intensity >= intensityThreshold) {
                        continue;
                    }
                }

                // Remove this beat
                removedBeats.add(beat);
                remainingCount--;
                beatsRemovedThisPass++;

                if (this.config.logConversions) {
                    console.log(
                        `[DifficultyVariantGenerator] Pass ${pass}: Removed beat at index ${beat.beatIndex} ` +
                        `position ${beat.gridPosition} (priority: ${priority.toFixed(2)}, intensity: ${beat.intensity.toFixed(2)})`
                    );
                }
            }

            if (this.config.logConversions) {
                console.log(
                    `[DifficultyVariantGenerator] Pass ${pass}${isFinalPass ? ' (final)' : ''}: ` +
                    `Removed ${beatsRemovedThisPass} beats, ` +
                    `density now: ${(remainingCount / durationSeconds).toFixed(2)} notes/sec`
                );
            }

            // Check if we've reached the target
            if (targetCount !== undefined) {
                if (remainingCount <= targetCount) {
                    break; // Midpoint target reached, stop convergence loop
                }
            } else {
                const currentDensity = remainingCount / durationSeconds;
                if (currentDensity <= targetRange.max) {
                    break; // Target reached, stop convergence loop
                }
            }
        }

        // Check if we couldn't reach target density after all passes
        const finalDensity = remainingCount / durationSeconds;
        const missedTarget = targetCount !== undefined
            ? remainingCount > targetCount
            : finalDensity > targetRange.max;
        if (missedTarget && this.config.logConversions) {
            const targetLabel = targetCount !== undefined
                ? `${targetCount} beats (midpoint ${(targetCount / durationSeconds).toFixed(2)} nps)`
                : `${targetRange.max} notes/sec`;
            console.warn(
                `[DifficultyVariantGenerator] Could not reach target density ${targetLabel} for ${targetDifficulty} after ${maxPasses} passes. ` +
                `Final density: ${finalDensity.toFixed(2)} notes/sec (${remainingCount} beats remaining)`
            );
        }

        // Filter out removed beats
        const keptBeats = beats.filter(b => !removedBeats.has(b));
        metadata.reductionPasses = passesUsed;
        metadata.beatsRemoved += removedBeats.size;

        // Ensure we keep at least some beats (don't over-reduce)
        // beats = notesPerSec * durationInSeconds
        const minBeatsToKeep = Math.ceil(targetRange.min * durationSeconds);
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
     * Build a map of measureNumber → count of downbeats (gridPosition === 0) in that measure.
     *
     * Uses unifiedBeatMap to resolve measureNumber from beatIndex, supporting any time signature.
     *
     * @param beats - The beats to scan
     * @returns Map from measureNumber to downbeat count
     */
    private buildDownbeatCountMap(beats: (CompositeBeat | VariantBeat)[]): Map<number, number> {
        const measureDownbeats = new Map<number, number>();
        const unifiedBeatMap = this.currentUnifiedBeatMap;

        for (const beat of beats) {
            if (beat.gridPosition !== 0) continue;

            let measureNumber: number;
            if (unifiedBeatMap?.beats[beat.beatIndex]) {
                measureNumber = unifiedBeatMap.beats[beat.beatIndex].measureNumber;
            } else {
                // Fallback: derive from beatIndex assuming 4/4
                measureNumber = Math.floor(beat.beatIndex / 4);
            }

            measureDownbeats.set(measureNumber, (measureDownbeats.get(measureNumber) ?? 0) + 1);
        }

        return measureDownbeats;
    }

    /**
     * Calculate removal priority for a beat (higher = more important to keep)
     *
     * Priority factors:
     * - Strong beat bonus: +0.3 (zeroed in 'neutral' mode)
     * - Downbeat bonus: +0.2 (gridPosition 0)
     * - Only-downbeat-in-measure bonus: +0.2 (stacks on downbeat bonus)
     * - Intensity contribution: +intensity * 0.3
     * - Phrase membership bonus: +0.15 (max)
     * - Offbeat penalty: -0.1 (gridPosition 1 or 3)
     *
     * @param beat - The beat to evaluate
     * @param phraseMembership - Map of beat indices to phrase membership
     * @param downbeatCountByMeasure - Map of measureNumber → downbeat count for structural importance
     * @returns Priority score (0-1 range, higher = keep)
     */
    private calculateRemovalPriority(
        beat: CompositeBeat | VariantBeat,
        phraseMembership: Map<number, RhythmicPhrase[]>,
        downbeatCountByMeasure: Map<number, number> = new Map()
    ): number {
        const emphasis = this.config.rhythmicBalanceConfig?.strongBeatEmphasis ?? 'natural';
        let priority = 0.5; // Base priority

        // Strong beat bonus (Task 4.3.4: zeroed in 'neutral' mode)
        if (emphasis !== 'neutral' && this.isStrongBeat(beat.beatIndex)) {
            priority += 0.3;
        }

        // Downbeat bonus
        if (beat.gridPosition === 0) {
            priority += 0.2;

            // Task 4.3.1: Only-downbeat-in-measure bonus (+0.2)
            // These are the most structurally important beats — highest protection
            const unifiedBeatMap = this.currentUnifiedBeatMap;
            let measureNumber: number;
            if (unifiedBeatMap?.beats[beat.beatIndex]) {
                measureNumber = unifiedBeatMap.beats[beat.beatIndex].measureNumber;
            } else {
                measureNumber = Math.floor(beat.beatIndex / 4);
            }

            const downbeatCount = downbeatCountByMeasure.get(measureNumber) ?? 0;
            if (downbeatCount === 1) {
                priority += 0.2;
            }
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
     * - `straight_8th` (2 positions: 0, 1) → `straight_4th` (1 position: 0)
     *   - All positions snap to 0 (quarter note) — Easy at BPM > 120
     *
     * - `straight_16th` → `straight_4th` (Easy at BPM > 120)
     *   - All positions snap to 0 (quarter note)
     *
     * @param beat - The beat to convert
     * @param targetDifficulty - The target difficulty
     * @param quarterNoteInterval - Duration of a quarter note in seconds
     * @param bpm - The tempo in BPM (for tempo-aware grid type selection)
     * @returns The converted beat as VariantBeat, or null if the beat should be removed
     */
    private convertBeatGridType(
        beat: VariantBeat,
        targetDifficulty: DifficultyLevel,
        quarterNoteInterval: number,
        bpm: number = 120,
        lockedGridType?: ExtendedGridType,
        allowedGridTypes?: ExtendedGridType[]
    ): VariantBeat | null {
        // Task 1.2.3: Use locked grid type if provided and different from beat's current grid
        const sourceGridType = lockedGridType ?? beat.gridType;
        const targetGridType = convertToAllowedGridType(sourceGridType, targetDifficulty, bpm, allowedGridTypes);

        // If no conversion needed, return as-is (but as VariantBeat)
        if (targetGridType === sourceGridType) {
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
        let beatStartTimestamp: number;

        switch (sourceGridType) {
            case 'straight_16th': {
                const sixteenthNoteInterval = quarterNoteInterval / 4;
                beatStartTimestamp = beat.timestamp - (beat.gridPosition * sixteenthNoteInterval);

                if (targetGridType === 'straight_4th') {
                    // 16th → quarter note: all positions snap to beat start
                    newGridPosition = 0;
                    newTimestamp = beatStartTimestamp;
                } else {
                    // 16th → 8th conversion
                    // Positions: 0→0, 1→0 (snap to quarter), 2→2, 3→2 (snap to 8th)
                    if (beat.gridPosition === 1 || beat.gridPosition === 3) {
                        newGridPosition = beat.gridPosition === 1 ? 0 : 2;
                    } else {
                        newGridPosition = beat.gridPosition;
                    }
                    const eighthNoteInterval = quarterNoteInterval / 2;
                    newTimestamp = beatStartTimestamp + (newGridPosition === 0 ? 0 : eighthNoteInterval);
                }
                break;
            }

            case 'triplet_8th': {
                const tripletInterval = quarterNoteInterval / 3;
                beatStartTimestamp = beat.timestamp - (beat.gridPosition * tripletInterval);

                // 8th triplet → quarter triplet: all positions snap to 0
                newGridPosition = 0;
                newTimestamp = beatStartTimestamp;
                break;
            }

            case 'straight_8th': {
                const eighthNoteInterval = quarterNoteInterval / 2;
                beatStartTimestamp = beat.timestamp - (beat.gridPosition * eighthNoteInterval);

                // 8th → quarter note: all positions snap to 0
                newGridPosition = 0;
                newTimestamp = beatStartTimestamp;
                break;
            }

            default:
                return {
                    ...beat,
                    gridType: beat.gridType as ExtendedGridType,
                };
        }

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
     * @param bpm - BPM for calculating global target beat count
     * @param unifiedBeatMap - The unified beat map for timestamp derivation
     * @param phraseAnalysis - Optional phrase analysis for pattern library
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @param quarterNoteInterval - Duration of a quarter note in seconds for timestamp calculation
     * @param gridLock - Optional grid lock map (from lockGridPerBeatIndex) - if provided, skips initial enforceSingleGridPerBeat
     * @returns Enhanced beats with metadata
     */
    private enhanceBeats(
        beats: CompositeBeat[],
        targetDifficulty: DifficultyLevel,
        bpm: number,
        unifiedBeatMap: UnifiedBeatMap,
        phraseAnalysis?: PhraseAnalysisResult,
        gridDecisions?: Map<number, GridDecision>,
        quarterNoteInterval: number = 0.5,
        gridLock?: Map<number, ExtendedGridType>,
        allowedGridTypes?: ExtendedGridType[],    // Override getTempoAwareAllowedGridTypes() for maxBeatsPerIndex
        targetDensity?: number                    // Override calculateBeatsToAdd() target
    ): { beats: VariantBeat[]; metadata: EnhancementMetadata } {
        const durationSeconds = unifiedBeatMap?.duration ?? 120;
        const metadata: EnhancementMetadata = {
            totalBeatsBefore: beats.length,
            totalBeatsAfter: 0,
            patternsInserted: 0,
            interpolatedBeats: 0,
            insertedPatternIds: [],
        };

        // Helper: convert grid type to allowed type, respecting override when provided.
        // When allowedGridTypes override is given, snap to closest allowed type.
        // Otherwise, use the standard difficulty-based conversion.
        const snapToAllowedGridType = (gridType: ExtendedGridType): ExtendedGridType => {
            if (allowedGridTypes) {
                if (allowedGridTypes.includes(gridType)) return gridType;
                // Snap down through hierarchy: 16th -> triplet_8th -> 8th -> quarter_triplet -> 4th
                const hierarchy: ExtendedGridType[] = ['straight_16th', 'triplet_8th', 'straight_8th', 'quarter_triplet', 'straight_4th'];
                const idx = hierarchy.indexOf(gridType);
                for (let i = idx + 1; i < hierarchy.length; i++) {
                    if (allowedGridTypes.includes(hierarchy[i])) return hierarchy[i];
                }
                // Fallback: return the coarsest allowed type
                return allowedGridTypes[allowedGridTypes.length - 1] ?? gridType;
            }
            return convertToAllowedGridType(gridType, targetDifficulty, bpm);
        };

        // If no beats to enhance, return empty
        if (beats.length === 0) {
            metadata.totalBeatsAfter = 0;
            return { beats: [], metadata };
        }

        // Task 1.3.2: Skip enforceSingleGridPerBeat() if grid lock is provided.
        // Grid lock means beats are already cleaned by lockGridPerBeatIndex().
        // If no grid lock, resolve mixed grids BEFORE calculating targets.
        // If a beat index has both triplet and straight notes, the density calculation
        // counts them all, but enforceSingleGridPerBeat later removes the losers.
        // This causes the final density to fall short of the target. By resolving
        // grids first, all density math and interpolation work with accurate counts.
        let cleanedBeats = gridLock ? beats : this.enforceSingleGridPerBeat(beats);

        // When allowedGridTypes is provided (density-based generation), convert any
        // existing beats with disallowed grid types before proceeding. Without this,
        // beats like triplet_8th leak through when they exceed the target count at
        // their index and are pushed through unfiltered (lines ~3091 and ~3181).
        if (allowedGridTypes) {
            const hasDisallowedTypes = cleanedBeats.some(b => !allowedGridTypes.includes(b.gridType));
            if (hasDisallowedTypes) {
                const converted: VariantBeat[] = [];
                for (const beat of cleanedBeats) {
                    if (allowedGridTypes.includes(beat.gridType)) {
                        converted.push(beat as VariantBeat);
                    } else {
                        const convertedBeat = this.convertBeatGridType(
                            beat as VariantBeat,
                            targetDifficulty,
                            quarterNoteInterval,
                            bpm,
                            undefined, // no locked grid override — convertBeatGridType will use allowedGridTypes via convertToAllowedGridType
                            allowedGridTypes
                        );
                        if (convertedBeat) {
                            converted.push(convertedBeat);
                        }
                    }
                }
                // Deduplicate in case conversions snapped multiple beats to the same position
                const deduplicated = this.deduplicateConvertedBeats(converted);
                // VariantBeat[] is safe to use as CompositeBeat[] downstream —
                // the only difference is gridType: ExtendedGridType (superset of GridType)
                cleanedBeats = deduplicated as unknown as CompositeBeat[];
            }
        }

        metadata.totalBeatsBefore = cleanedBeats.length;

        // Group beats by beatIndex for analysis
        const beatsByIndex = this.groupBeatsByIndex(cleanedBeats);

        // Task 3.3.1: Use global target-based distribution instead of probabilistic scaling.
        // Calculate exactly how many beats to add from the density target range,
        // then distribute that count across indices deterministically.
        const maxBeatIndex = Math.max(...Array.from(beatsByIndex.keys()));

        // Override: when targetDensity is provided (density-based generation path),
        // compute beatsToAdd directly instead of using difficulty-based calculation.
        // Cap to prevent runaway enhancement (max 4x current density).
        let beatsToAdd: number;
        if (targetDensity !== undefined) {
            const targetCount = Math.round(targetDensity * durationSeconds);
            beatsToAdd = Math.max(0, targetCount - cleanedBeats.length);
            const maxBeatsAllowed = Math.max(0, 3 * cleanedBeats.length);  // max 4x current density
            beatsToAdd = Math.min(beatsToAdd, maxBeatsAllowed);
        } else {
            const result = this.calculateBeatsToAdd(
                cleanedBeats.length,
                durationSeconds,
                bpm,
                targetDifficulty
            );
            beatsToAdd = result.beatsToAdd;
        }
        const densitySeed = this.config.seed ?? `enhance:${maxBeatIndex}:${cleanedBeats.length}`;
        const targetBeatsPerBeat = this.distributeBeatsAcrossIndices(
            beatsToAdd,
            beatsByIndex,
            gridLock ?? new Map(),
            maxBeatIndex,
            densitySeed,
            allowedGridTypes    // Pass through for max beats per index calculation
        );

        // Create enhanced beats array
        const enhancedBeats: CompositeBeat[] = [];

        // Global occupied-slot tracker: "beatIndex:gridPosition" → gridType.
        // Every beat addition must check this before writing. Once a slot is
        // claimed, no other source (pattern, interpolation, creation, or
        // original beats) can double-dip into the same position.
        const occupiedSlots = new Map<string, string>(); // slot → gridType

        const slotKey = (beatIdx: number, gridPos: number) => `${beatIdx}:${gridPos}`;

        // Register all existing beats into the occupied set up front so
        // nothing can collide with them.
        for (const beat of cleanedBeats) {
            const key = slotKey(beat.beatIndex, beat.gridPosition);
            if (!occupiedSlots.has(key)) {
                occupiedSlots.set(key, beat.gridType);
            }
        }

        for (let beatIndex = 0; beatIndex <= maxBeatIndex; beatIndex++) {
            const existingBeats = beatsByIndex.get(beatIndex) ?? [];
            const targetCount = targetBeatsPerBeat.get(beatIndex) ?? 0;

            if (existingBeats.length >= targetCount) {
                // Already at or above target, keep existing beats
                enhancedBeats.push(...existingBeats);
                continue;
            }

            // Need to add beats
            const beatsToAdd = targetCount - existingBeats.length;

            if (existingBeats.length === 0) {
                // Task 1.3.3: Get locked grid type from gridLock if available
                // Convert to allowed type for the target difficulty before using it
                const rawLockedGrid = gridLock?.get(beatIndex);
                const lockedGridForIndex = rawLockedGrid
                    ? snapToAllowedGridType(rawLockedGrid)
                    : undefined;

                // Empty beat index — create beats from scratch using grid lock,
                // grid decisions, or neighbor context. interpolateBeats requires
                // an existing reference beat, so we synthesize one here.
                const createdBeats = this.createBeatsForEmptyIndex(
                    beatIndex,
                    beatsToAdd,
                    unifiedBeatMap,
                    gridDecisions,
                    quarterNoteInterval,
                    beatsByIndex,
                    occupiedSlots,
                    lockedGridForIndex
                );
                // Gate through occupiedSlots — only add beats whose slot is free
                // AND whose grid type matches this beat index's established grid.
                // Task 1.3.3: Use locked grid type if available, otherwise derive from created beats
                const gridForIndex = lockedGridForIndex ?? this.getGridForBeatIndex(beatIndex, createdBeats, gridDecisions);
                for (const b of createdBeats) {
                    const key = slotKey(b.beatIndex, b.gridPosition);
                    if (!occupiedSlots.has(key) && b.gridType === gridForIndex) {
                        occupiedSlots.set(key, b.gridType);
                        enhancedBeats.push(b);
                        metadata.interpolatedBeats++;
                    }
                }
                continue;
            }

            // Task 1.3.3: Use locked grid type from gridLock if available, otherwise derive from existing beats
            // Convert to allowed type for the target difficulty
            const rawGridForIndex = gridLock?.get(beatIndex) ?? existingBeats[0].gridType;
            const gridForIndex = snapToAllowedGridType(rawGridForIndex);

            // Try pattern insertion first (if enabled and phrase analysis available)
            let addedFromPattern = 0;
            if (this.config.preferPatternInsertion && phraseAnalysis) {
                const patternResult = this.tryInsertPattern(
                    existingBeats,
                    beatIndex,
                    beatsToAdd,
                    phraseAnalysis,
                    occupiedSlots,
                    gridForIndex
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
                    quarterNoteInterval,
                    occupiedSlots,
                    gridForIndex,
                    unifiedBeatMap
                );
                // Gate through occupiedSlots
                for (const b of interpolatedBeats) {
                    const key = slotKey(b.beatIndex, b.gridPosition);
                    if (!occupiedSlots.has(key)) {
                        occupiedSlots.set(key, b.gridType);
                        enhancedBeats.push(b);
                        metadata.interpolatedBeats++;
                    }
                }
            }

            // Add original beats (already registered in occupiedSlots up front,
            // so they're safe — but push them so they're in the output)
            enhancedBeats.push(...existingBeats);
        }

        // Sort and deduplicate
        const sortedBeats = enhancedBeats.sort((a, b) => {
            if (a.beatIndex !== b.beatIndex) return a.beatIndex - b.beatIndex;
            return a.gridPosition - b.gridPosition;
        });

        // Task 1.3.4: When gridLock is provided, validate (assert) instead of fix.
        // Grid lock should have prevented any mixed grids, so if we find violations,
        // it indicates a bug in the grid lock implementation.
        // When no gridLock, use enforcement (legacy behavior).
        let beatsToDeduplicate: CompositeBeat[];
        if (gridLock) {
            // Validation-only: confirm no grid violations exist
            const validation = this.validateSingleGridPerBeat(sortedBeats);
            if (!validation.isValid) {
                // This shouldn't happen if grid lock is working correctly.
                // Log the warning but continue with the beats as-is.
                // The deduplication will handle any position collisions.
            }
            beatsToDeduplicate = sortedBeats;
        } else {
            // Legacy behavior: resolve mixed grids before dedup
            beatsToDeduplicate = this.enforceSingleGridPerBeat(sortedBeats);
        }
        const deduplicatedBeats = this.deduplicateEnhancedBeats(beatsToDeduplicate);

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
     *
     * Includes empty beat indices (those with no existing beats) so that
     * enhancement can fill gaps in the rhythm. Empty beats get a target
     * proportional to the multiplier, treating them as having 1 virtual beat.
     */
    private calculateTargetBeatsPerBeat(
        beatsByIndex: Map<number, CompositeBeat[]>,
        densityMultiplier: number,
        maxBeatIndex: number
    ): Map<number, number> {
        const targetMap = new Map<number, number>();

        for (let beatIndex = 0; beatIndex <= maxBeatIndex; beatIndex++) {
            const beats = beatsByIndex.get(beatIndex);
            if (beats) {
                const targetCount = Math.min(Math.ceil(beats.length * densityMultiplier), 4);
                targetMap.set(beatIndex, targetCount);
            } else {
                const virtualCount = Math.min(Math.ceil(densityMultiplier * 0.7), 4);
                if (virtualCount >= 2) {
                    targetMap.set(beatIndex, virtualCount);
                }
            }
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
        occupiedSlots: Map<string, string>,
        lockedGridType: ExtendedGridType
    ): { beatsAdded: number; patternId?: string } {
        const patternLibrary = phraseAnalysis.patternLibrary;

        // Filter patterns by max size
        const suitablePatterns = patternLibrary.filter(
            p => p.sizeInBeats <= this.config.maxPatternInsertionSize && p.availableForReuse
        );

        if (suitablePatterns.length === 0) {
            return { beatsAdded: 0 };
        }

        // Only use patterns whose beats match the locked grid type for this beat index
        const matchingPatterns = suitablePatterns.filter(p =>
            p.pattern.some(b => b.gridType === lockedGridType)
        );

        if (matchingPatterns.length === 0) {
            return { beatsAdded: 0 };
        }

        // Sort by significance (most significant first)
        matchingPatterns.sort((a, b) => b.significance - a.significance);

        // Try to use the most significant pattern
        const pattern = matchingPatterns[0];

        // Find beats from the pattern that fit in the current beat index
        const patternBeatsForCurrentBeat = pattern.pattern.filter(b => b.beatIndex === 0);

        // Get existing grid positions
        const existingPositions = new Set(existingBeats.map(b => b.gridPosition));

        // Filter pattern beats: must match grid type, not overlap existing positions,
        // AND the slot must not already be occupied in the global tracker.
        const slotKey = (idx: number, pos: number) => `${idx}:${pos}`;
        const newBeats = patternBeatsForCurrentBeat.filter(b => {
            if (b.gridType !== lockedGridType) return false;
            if (existingPositions.has(b.gridPosition)) return false;
            if (occupiedSlots.has(slotKey(beatIndex, b.gridPosition))) return false;
            return true;
        });

        if (newBeats.length === 0) {
            return { beatsAdded: 0 };
        }

        // Take only the number of beats we need
        const beatsToInsert = newBeats.slice(0, beatsToAdd);

        // Convert pattern beats to composite beats and register in occupiedSlots
        const sourceBand = pattern.sourceBand;
        const compositeBeats: CompositeBeat[] = beatsToInsert.map(b => ({
            ...b,
            beatIndex,
            band: sourceBand,
            sourceBand,
            intensity: b.intensity * 0.8,
        }));

        for (const b of compositeBeats) {
            occupiedSlots.set(slotKey(b.beatIndex, b.gridPosition), b.gridType);
        }

        return {
            beatsAdded: compositeBeats.length,
            patternId: pattern.id,
        };
    }

    /**
     * Create beats for an empty beat index (one with no existing beats)
     *
     * When enhancement needs to fill gaps in the rhythm, this method creates
     * beats from scratch using grid decisions or neighbor context to determine
     * the appropriate grid type and timing.
     *
     * @param beatIndex - The beat index to create beats for
     * @param beatsToAdd - Number of beats to create
     * @param unifiedBeatMap - Optional unified beat map for timestamp derivation
     * @param gridDecisions - Optional grid decisions from quantized streams
     * @param quarterNoteInterval - Duration of a quarter note in seconds
     * @param beatsByIndex - All beats grouped by index (for neighbor lookup)
     * @param occupiedSlots - Global occupied slot tracker
     * @param lockedGridType - Optional locked grid type from gridLock (takes priority over other sources)
     * @returns Array of newly created beats
     */
    private createBeatsForEmptyIndex(
        beatIndex: number,
        beatsToAdd: number,
        unifiedBeatMap?: UnifiedBeatMap,
        gridDecisions?: Map<number, GridDecision>,
        quarterNoteInterval: number = 0.5,
        beatsByIndex?: Map<number, CompositeBeat[]>,
        occupiedSlots?: Map<string, string>,
        lockedGridType?: ExtendedGridType
    ): CompositeBeat[] {
        // Task 1.3.3: Use locked grid type as first priority, then fall back to grid decisions, neighbors, default
        // Determine grid type: lockedGridType > grid decision > neighbor > default to straight_16th
        let gridType: ExtendedGridType = lockedGridType ?? 'straight_16th';
        let band: 'low' | 'mid' | 'high' = 'mid';
        let sourceBand: 'low' | 'mid' | 'high' = 'mid';

        // If no locked grid type, try gridDecisions
        if (!lockedGridType && gridDecisions) {
            const decision = gridDecisions.get(beatIndex);
            if (decision) {
                gridType = decision.selectedGrid;
            }
        }

        // Fall back to nearest neighbor's grid type and band (only if no locked grid type and no grid decision)
        if (!lockedGridType && !gridDecisions?.has(beatIndex) && beatsByIndex) {
            for (const offset of [1, -1, 2, -2, 3, -3]) {
                const neighborBeats = beatsByIndex.get(beatIndex + offset);
                if (neighborBeats && neighborBeats.length > 0) {
                    gridType = neighborBeats[0].gridType;
                    band = neighborBeats[0].band;
                    sourceBand = neighborBeats[0].sourceBand;
                    break;
                }
            }
        }

        // Collect positions already occupied from the global tracker
        const occupiedPositions = new Set<number>();
        if (occupiedSlots) {
            const slotKey = (idx: number, pos: number) => `${idx}:${pos}`;
            for (let pos = 0; pos < 4; pos++) {
                if (occupiedSlots.has(slotKey(beatIndex, pos))) {
                    occupiedPositions.add(pos);
                }
            }
        }

        const gridPositionsMap: Record<ExtendedGridType, number> = {
            straight_16th: 4,
            straight_8th: 2,
            triplet_8th: 3,
            straight_4th: 1,
            quarter_triplet: 1,
        };
        const maxPositions = gridPositionsMap[gridType];

        // Pick positions to fill (prefer downbeat 0, then offbeats)
        const availablePositions: number[] = [];
        for (let pos = 0; pos < maxPositions; pos++) {
            if (!occupiedPositions.has(pos)) {
                availablePositions.push(pos);
            }
        }
        availablePositions.sort((a, b) => {
            // Prefer downbeat (0), then mid-beat (1, 2), then last (3)
            const score = (pos: number) => pos === 0 ? 0 : (pos === maxPositions - 1 ? 2 : 1);
            return score(a) - score(b);
        });

        const positionsToFill = availablePositions.slice(0, beatsToAdd);

        // Use the actual beat timestamp from the unified beat map.
        // This is the authoritative source for where each beat sits in time.
        // Falls back to beat index * quarterNoteInterval when no unified beat map is available.
        const beatStartTimestamp = unifiedBeatMap?.beats[beatIndex]?.timestamp ?? beatIndex * quarterNoteInterval;

        const gridIntervalMap: Record<ExtendedGridType, number> = {
            straight_16th: quarterNoteInterval / 4,
            straight_8th: quarterNoteInterval / 2,
            triplet_8th: quarterNoteInterval / 3,
            straight_4th: quarterNoteInterval,
            quarter_triplet: quarterNoteInterval,
        };
        const interval = gridIntervalMap[gridType];

        return positionsToFill.map(gridPosition => ({
            timestamp: beatStartTimestamp + (gridPosition * interval),
            beatIndex,
            gridPosition,
            gridType,
            intensity: this.config.interpolatedBeatIntensity * 0.8, // Slightly lower for filled gaps
            band,
            sourceBand,
            quantizationError: 0,
        })) as CompositeBeat[];
    }

    /**
     * Interpolate beats to add density
     *
     * Adds beats at intermediate grid positions that don't already have beats.
     * Always uses the existing beats' grid type to avoid mixed grids.
     *
     * @param existingBeats - Existing beats at this beat index
     * @param beatIndex - The beat index to interpolate for
     * @param beatsToAdd - Number of beats to add
     * @param quarterNoteInterval - Duration of a quarter note in seconds for timestamp calculation
     * @param occupiedSlots - Global occupied slot tracker
     * @param lockedGridType - Grid type locked for this beat index (ExtendedGridType for full support)
     * @param unifiedBeatMap - The unified beat map for authoritative timestamp derivation
     * @returns Array of interpolated beats
     */
    private interpolateBeats(
        existingBeats: CompositeBeat[],
        beatIndex: number,
        beatsToAdd: number,
        quarterNoteInterval: number = 0.5,
        occupiedSlots?: Map<string, string>,
        lockedGridType?: ExtendedGridType,
        unifiedBeatMap?: UnifiedBeatMap
    ): CompositeBeat[] {
        if (beatsToAdd <= 0 || existingBeats.length === 0) {
            return [];
        }

        // Use the locked grid type (caller ensures this matches existing beats)
        const gridType: ExtendedGridType = lockedGridType ?? existingBeats[0].gridType;
        const getMaxPositions = (gt: string) =>
            gt === 'straight_16th' ? 4
                : gt === 'straight_8th' ? 2
                    : gt === 'straight_4th' ? 1
                        : gt === 'quarter_triplet' ? 1
                            : 3;
        const maxPositions = getMaxPositions(gridType);

        // Get existing positions, plus any positions in the global occupied tracker
        const slotKey = (idx: number, pos: number) => `${idx}:${pos}`;
        const existingPositions = new Set(existingBeats.map(b => b.gridPosition));
        if (occupiedSlots) {
            for (let pos = 0; pos < maxPositions; pos++) {
                if (occupiedSlots.has(slotKey(beatIndex, pos))) {
                    existingPositions.add(pos);
                }
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

        // Get reference beat for band/properties
        const referenceBeat = existingBeats[0];

        // Task 3.4.2: Derive beatStartTimestamp from the unifiedBeatMap —
        // the authoritative quarter-note grid — NOT from the reference beat's
        // own timestamp (which drifts after multiple interpolation passes).
        const beatStartTimestamp = unifiedBeatMap?.beats[beatIndex]?.timestamp
            ?? beatIndex * quarterNoteInterval;

        // Task 3.4.3/3.4.4: Single interval based on the locked grid type.
        // Since the grid is locked per beat index, there is no reference/new split.
        const gridIntervalMap: Record<ExtendedGridType, number> = {
            straight_16th: quarterNoteInterval / 4,
            straight_8th: quarterNoteInterval / 2,
            triplet_8th: quarterNoteInterval / 3,
            straight_4th: quarterNoteInterval,
            quarter_triplet: quarterNoteInterval,
        };
        const interval = gridIntervalMap[gridType];

        // Create interpolated beats
        const interpolatedBeats = positionsToFill.map(gridPosition => ({
            timestamp: beatStartTimestamp + (gridPosition * interval),
            beatIndex,
            gridPosition,
            gridType,
            intensity: this.config.interpolatedBeatIntensity,
            band: referenceBeat.band,
            sourceBand: referenceBeat.sourceBand,
            quantizationError: 0,
        }));

        return interpolatedBeats as CompositeBeat[];
    }

    /**
     * Determine the grid type for a beat index.
     * Used when creating beats for an empty index that has no existing beats.
     */
    private getGridForBeatIndex(
        beatIndex: number,
        candidateBeats: CompositeBeat[],
        gridDecisions?: Map<number, GridDecision>,
        beatsByIndex?: Map<number, CompositeBeat[]>
    ): GridType {
        if (candidateBeats.length > 0) {
            return candidateBeats[0].gridType;
        }
        if (gridDecisions?.has(beatIndex)) {
            return gridDecisions.get(beatIndex)!.selectedGrid;
        }
        if (beatsByIndex) {
            for (const offset of [1, -1, 2, -2, 3, -3]) {
                const neighbor = beatsByIndex.get(beatIndex + offset);
                if (neighbor && neighbor.length > 0) {
                    return neighbor[0].gridType;
                }
            }
        }
        return 'straight_16th';
    }

    /**
     * Deduplicate enhanced beats — each beat index has exactly one grid type.
     * Beats at the same beatIndex:gridPosition are the same musical event regardless
     * of grid type. If two grid types somehow landed at the same position, keep the
     * one matching the dominant grid type for that beat index.
     */
    private deduplicateEnhancedBeats(beats: CompositeBeat[]): CompositeBeat[] {
        // First pass: determine the dominant grid type per beat index.
        // Each beat index has only one grid — the one with the most beats wins.
        const gridCounts = new Map<number, Map<string, number>>();
        for (const beat of beats) {
            const indexMap = gridCounts.get(beat.beatIndex) ?? new Map<string, number>();
            indexMap.set(beat.gridType, (indexMap.get(beat.gridType) ?? 0) + 1);
            gridCounts.set(beat.beatIndex, indexMap);
        }

        const dominantGrid = new Map<number, string>();
        for (const [beatIndex, counts] of gridCounts) {
            let bestGrid = 'straight_16th';
            let bestCount = 0;
            for (const [grid, count] of counts) {
                if (count > bestCount) {
                    bestCount = count;
                    bestGrid = grid;
                }
            }
            dominantGrid.set(beatIndex, bestGrid);
        }

        // Second pass: dedup on beatIndex:gridPosition, prefer the beat
        // matching the dominant grid type for that beat index.
        const beatMap = new Map<string, CompositeBeat>();

        for (const beat of beats) {
            const key = `${beat.beatIndex}:${beat.gridPosition}`;
            const existing = beatMap.get(key);
            const dominant = dominantGrid.get(beat.beatIndex);

            if (!existing) {
                beatMap.set(key, beat);
            } else if (beat.gridType === dominant && existing.gridType !== dominant) {
                // New beat matches the dominant grid, existing doesn't — replace.
                beatMap.set(key, beat);
            }
            // else: keep existing (either both match or neither matches)
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
     * Validate that beats have no mixed grid types per beat index
     *
     * Task 1.3.4: Validation-only check for grid lock compliance.
     * When grid lock is provided to enhanceBeats(), this method confirms
     * that no grid violations exist (assert, don't fix).
     *
     * @param beats - The beats to validate
     * @returns Validation result with any violations found
     */
    private validateSingleGridPerBeat<T extends CompositeBeat | VariantBeat>(
        beats: T[]
    ): { isValid: boolean; violations: Array<{ beatIndex: number; gridTypes: ExtendedGridType[] }> } {
        // Group beats by beatIndex
        const beatsByIndex = new Map<number, T[]>();
        for (const beat of beats) {
            const existing = beatsByIndex.get(beat.beatIndex) ?? [];
            existing.push(beat);
            beatsByIndex.set(beat.beatIndex, existing);
        }

        const violations: Array<{ beatIndex: number; gridTypes: ExtendedGridType[] }> = [];

        for (const [beatIndex, beatsAtIndex] of beatsByIndex) {
            if (beatsAtIndex.length <= 1) {
                continue;
            }

            // Check if this beat index has mixed grid types
            const gridTypes = new Set(beatsAtIndex.map(b => b.gridType));
            if (gridTypes.size > 1) {
                violations.push({
                    beatIndex,
                    gridTypes: Array.from(gridTypes),
                });
            }
        }

        if (violations.length > 0 && this.config.logConversions) {
            console.warn(
                `[DifficultyVariantGenerator] Grid validation found ${violations.length} violations. ` +
                `This indicates a bug in grid lock implementation.`
            );
            for (const violation of violations.slice(0, 5)) {
                console.warn(
                    `  - Beat index ${violation.beatIndex} has mixed grids: ${violation.gridTypes.join(', ')}`
                );
            }
        }

        return {
            isValid: violations.length === 0,
            violations,
        };
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
