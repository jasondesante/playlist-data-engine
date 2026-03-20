/**
 * Button Mapping Types
 *
 * Types for configuring button mapping in rhythm games.
 * Supports two controller modes: DDR (4 directional buttons) and Guitar Hero (5 fret buttons).
 *
 * @module ButtonMapping
 */

import type { DifficultyPreset } from './BeatMap.js';

// =============================================================================
// CONTROLLER MODE TYPES
// =============================================================================

/**
 * Available controller modes for button mapping.
 *
 * - **DDR**: 4 directional buttons (up, down, left, right), 2-axis pitch expression
 *   Vertical axis: up → high pitch, down → low pitch
 *   Horizontal axis: left → low pitch, right → high pitch
 *
 * - **Guitar Hero**: 5 fret buttons (1-5), 1-axis pitch expression
 *   Fretboard metaphor: 1 = lowest pitch, 5 = highest pitch
 */
export type ControllerMode = 'ddr' | 'guitar_hero';

/**
 * DDR directional buttons.
 * Used when controllerMode is 'ddr'.
 */
export type DDRButton = 'up' | 'down' | 'left' | 'right';

/**
 * Guitar Hero fret buttons.
 * Used when controllerMode is 'guitar_hero'.
 * 1 = lowest pitch (green), 5 = highest pitch (orange)
 */
export type GuitarHeroButton = 1 | 2 | 3 | 4 | 5;

/**
 * Union of all possible button types across controller modes.
 */
export type Button = DDRButton | GuitarHeroButton;

// =============================================================================
// BUTTON MAPPING CONFIGURATION
// =============================================================================

/**
 * Configuration for button mapping in rhythm game charts.
 *
 * Controls how buttons are assigned to beats based on pitch information
 * and pattern libraries.
 *
 * @example
 * ```typescript
 * const config: ButtonMappingConfig = {
 *     difficulty: 'medium',
 *     controllerMode: 'ddr',
 *     pitchInfluenceWeight: 0.8,
 *     emphasizeDownbeats: true,
 *     emphasizeSyncopation: false,
 *     consecutiveSameKeyLimit: 8,
 *     patternMemory: 4,
 *     useRhythmBand: true,
 * };
 * ```
 */
export interface ButtonMappingConfig {
    /**
     * Difficulty preset for button mapping.
     * Affects consecutive key limits and pattern complexity.
     */
    difficulty: DifficultyPreset;

    /**
     * Controller mode determines available buttons and mapping strategy.
     *
     * - 'ddr': 4 directional buttons with circular motion philosophy
     * - 'guitar_hero': 5 fret buttons with fretboard metaphor
     */
    controllerMode: ControllerMode;

    /**
     * How strongly pitch affects button selection (0.0 - 1.0).
     *
     * - 0.0: Pure pattern library (skips pitch analysis entirely)
     * - 1.0: Pure pitch-driven mapping
     * - 0.5: Blend of pitch and pattern
     *
     * When pitch probability is low, pattern library fills in regardless.
     *
     * @default 1.0
     */
    pitchInfluenceWeight: number;

    /**
     * Whether to emphasize downbeats with specific button patterns.
     * Creates more noticeable patterns on strong beats.
     *
     * @default true
     */
    emphasizeDownbeats: boolean;

    /**
     * Whether to emphasize syncopated beats.
     * Creates interesting patterns on off-beat notes.
     *
     * @default false
     */
    emphasizeSyncopation: boolean;

    /**
     * Maximum consecutive same-key repeats allowed.
     * Prevents monotonous button patterns.
     *
     * - easy: 12
     * - medium: 8
     * - hard: 6
     */
    consecutiveSameKeyLimit: number;

    /**
     * Number of measures to look back when avoiding pattern repetition.
     * Higher values create more varied charts but may reduce musical coherence.
     *
     * @default 4
     */
    patternMemory: number;

    /**
     * Whether to use the same frequency band that won rhythm slicing.
     * When true, button mapping follows the dominant rhythm band.
     *
     * @default true
     */
    useRhythmBand: boolean;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default button mapping configuration.
 */
export const DEFAULT_BUTTON_MAPPING_CONFIG: ButtonMappingConfig = {
    difficulty: 'medium',
    controllerMode: 'ddr',
    pitchInfluenceWeight: 1.0,
    emphasizeDownbeats: true,
    emphasizeSyncopation: false,
    consecutiveSameKeyLimit: 8,
    patternMemory: 4,
    useRhythmBand: true,
};

/**
 * Difficulty-specific defaults for consecutive same key limits.
 */
export const CONSECUTIVE_KEY_LIMITS: Record<Exclude<DifficultyPreset, 'custom'>, number> = {
    easy: 12,
    medium: 8,
    hard: 6,
};

/**
 * Get the consecutive same key limit for a difficulty preset.
 *
 * @param difficulty - The difficulty preset
 * @returns The maximum consecutive same-key repeats allowed
 */
export function getConsecutiveKeyLimit(difficulty: DifficultyPreset): number {
    if (difficulty === 'custom') {
        return CONSECUTIVE_KEY_LIMITS.medium; // Default to medium for custom
    }
    return CONSECUTIVE_KEY_LIMITS[difficulty];
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation result for button mapping configuration.
 */
export interface ButtonMappingConfigValidationResult {
    /** Whether the configuration is valid */
    valid: boolean;
    /** Validation errors if any */
    errors: string[];
}

/**
 * Validate a button mapping configuration.
 *
 * @param config - The configuration to validate
 * @returns Validation result with errors if any
 */
export function validateButtonMappingConfig(
    config: Partial<ButtonMappingConfig>
): ButtonMappingConfigValidationResult {
    const errors: string[] = [];

    if (config.pitchInfluenceWeight !== undefined) {
        if (config.pitchInfluenceWeight < 0 || config.pitchInfluenceWeight > 1) {
            errors.push(
                `pitchInfluenceWeight must be between 0 and 1, got ${config.pitchInfluenceWeight}`
            );
        }
    }

    if (config.consecutiveSameKeyLimit !== undefined) {
        if (config.consecutiveSameKeyLimit < 1) {
            errors.push(
                `consecutiveSameKeyLimit must be at least 1, got ${config.consecutiveSameKeyLimit}`
            );
        }
    }

    if (config.patternMemory !== undefined) {
        if (config.patternMemory < 0) {
            errors.push(`patternMemory must be non-negative, got ${config.patternMemory}`);
        }
    }

    if (config.controllerMode !== undefined) {
        if (config.controllerMode !== 'ddr' && config.controllerMode !== 'guitar_hero') {
            errors.push(
                `controllerMode must be 'ddr' or 'guitar_hero', got '${config.controllerMode}'`
            );
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Merge partial configuration with defaults.
 *
 * @param partial - Partial configuration to merge
 * @returns Complete configuration with defaults applied
 */
export function mergeButtonMappingConfig(
    partial?: Partial<ButtonMappingConfig>
): ButtonMappingConfig {
    if (!partial) {
        return { ...DEFAULT_BUTTON_MAPPING_CONFIG };
    }

    const config = { ...DEFAULT_BUTTON_MAPPING_CONFIG, ...partial };

    // Apply difficulty-based defaults if not explicitly set
    if (!partial.consecutiveSameKeyLimit && partial.difficulty) {
        config.consecutiveSameKeyLimit = getConsecutiveKeyLimit(partial.difficulty);
    }

    return config;
}

// =============================================================================
// BUTTON PATTERN TYPES
// =============================================================================

/**
 * Pattern category for grouping similar patterns.
 */
export type ButtonPatternCategory =
    | 'basic'       // Simple patterns (alternating, single key runs)
    | 'roll'        // Sequential key presses around the pad
    | 'stream'      // Repeated directions
    | 'jump'        // Non-adjacent keys
    | 'chord'       // Multi-key patterns (Guitar Hero only)
    | 'transition'; // Patterns that transition between sections

/**
 * Generic button pattern interface.
 * Patterns are controller-mode-specific - DDR patterns use DDRButton, Guitar Hero patterns use GuitarHeroButton.
 *
 * @template T - The button type (DDRButton or GuitarHeroButton)
 *
 * @example
 * ```typescript
 * // DDR pattern
 * const ddrPattern: ButtonPattern<DDRButton> = {
 *     id: 'ddr_alternating_up_down',
 *     name: 'Alternating Up-Down',
 *     controllerMode: 'ddr',
 *     keys: ['up', 'down', 'up', 'down'],
 *     measures: 1,
 *     tags: ['basic', 'alternating'],
 *     category: 'basic',
 *     difficulty: 2,
 * };
 *
 * // Guitar Hero pattern
 * const ghPattern: ButtonPattern<GuitarHeroButton> = {
 *     id: 'gh_ascending_run',
 *     name: 'Ascending Run',
 *     controllerMode: 'guitar_hero',
 *     keys: [1, 2, 3, 4],
 *     measures: 1,
 *     tags: ['basic', 'ascending'],
 *     category: 'basic',
 *     difficulty: 2,
 * };
 * ```
 */
export interface ButtonPattern<T extends DDRButton | GuitarHeroButton> {
    /**
     * Unique identifier for this pattern.
     * Format: `{mode}_{category}_{description}` (e.g., 'ddr_basic_alternating')
     */
    id: string;

    /**
     * Human-readable name for this pattern.
     */
    name: string;

    /**
     * Controller mode this pattern is designed for.
     * DDR patterns cannot be used with Guitar Hero mode and vice versa.
     */
    controllerMode: ControllerMode;

    /**
     * Sequence of keys per beat.
     * The length determines how many beats this pattern spans.
     */
    keys: T[];

    /**
     * Number of measures this pattern spans.
     * Used for time-based pattern selection.
     */
    measures: number;

    /**
     * Tags for pattern selection and filtering.
     * Common tags: 'basic', 'alternating', 'roll', 'stream', 'jump', 'chord'
     */
    tags: string[];

    /**
     * Category for grouping similar patterns.
     */
    category: ButtonPatternCategory;

    /**
     * Difficulty rating from 1 (easiest) to 10 (hardest).
     * Used for difficulty-based pattern selection.
     */
    difficulty: number;
}

/**
 * DDR-specific button pattern.
 */
export type DDRPattern = ButtonPattern<DDRButton>;

/**
 * Guitar Hero-specific button pattern.
 */
export type GuitarHeroPattern = ButtonPattern<GuitarHeroButton>;

/**
 * Union type of all pattern types.
 */
export type AnyButtonPattern = DDRPattern | GuitarHeroPattern;

// =============================================================================
// PATTERN LIBRARY TYPES
// =============================================================================

/**
 * A complete pattern library for a controller mode.
 * Contains all available patterns organized by category.
 */
export interface ButtonPatternLibrary<T extends DDRButton | GuitarHeroButton> {
    /**
     * Controller mode this library is for.
     */
    controllerMode: ControllerMode;

    /**
     * All patterns in this library.
     */
    patterns: ButtonPattern<T>[];

    /**
     * Patterns organized by category for quick lookup.
     */
    byCategory: Map<ButtonPatternCategory, ButtonPattern<T>[]>;

    /**
     * Patterns organized by difficulty level (1-10).
     */
    byDifficulty: Map<number, ButtonPattern<T>[]>;
}

/**
 * DDR pattern library type.
 */
export type DDRPatternLibrary = ButtonPatternLibrary<DDRButton>;

/**
 * Guitar Hero pattern library type.
 */
export type GuitarHeroPatternLibrary = ButtonPatternLibrary<GuitarHeroButton>;

// =============================================================================
// PATTERN SELECTION TYPES
// =============================================================================

/**
 * Options for selecting a pattern from the library.
 */
export interface PatternSelectionOptions {
    /**
     * Maximum difficulty level to consider.
     */
    maxDifficulty?: number;

    /**
     * Minimum difficulty level to consider.
     */
    minDifficulty?: number;

    /**
     * Preferred category of pattern.
     */
    category?: ButtonPatternCategory;

    /**
     * Tags that must be present on the pattern.
     */
    requiredTags?: string[];

    /**
     * Tags that should be preferred (optional boost).
     */
    preferredTags?: string[];

    /**
     * Previous key that was used (for smooth transitions).
     */
    previousKey?: DDRButton | GuitarHeroButton;

    /**
     * Number of beats to fill with the pattern.
     */
    targetBeatCount?: number;

    /**
     * Number of measures to fill.
     */
    targetMeasures?: number;
}

/**
 * Result of pattern selection.
 */
export interface PatternSelectionResult<T extends DDRButton | GuitarHeroButton> {
    /**
     * The selected pattern.
     */
    pattern: ButtonPattern<T>;

    /**
     * Score indicating how well this pattern matches the selection criteria (0-1).
     */
    score: number;

    /**
     * Reasons why this pattern was selected.
     */
    matchReasons: string[];
}
