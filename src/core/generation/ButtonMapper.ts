/**
 * Button Mapper - Maps pitch analysis to button assignments for rhythm games
 *
 * This is the main entry point for button mapping in the Pitch Detection & Button Mapping pipeline.
 * It takes rhythm generation output and optional pitch analysis, then assigns buttons based on:
 *
 * 1. **Pitch Detection**: Uses melody contour (direction, interval) to determine buttons
 * 2. **Pattern Library**: Falls back to predefined patterns when pitch is unavailable
 * 3. **Probability-Based Blending**: Combines pitch and pattern based on pYIN confidence
 *
 * Supports two controller modes:
 * - **DDR**: 4 directional buttons with circular motion philosophy
 * - **Guitar Hero**: 5 fret buttons with fretboard metaphor
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 2.3
 *
 * @example
 * ```typescript
 * const mapper = new ButtonMapper({
 *   controllerMode: 'ddr',
 *   difficulty: 'medium',
 *   pitchInfluenceWeight: 0.8,
 * });
 *
 * // Map with pitch analysis
 * const result = mapper.map(generatedRhythm, 'medium', pitchAnalysis);
 *
 * // Map without pitch (pattern-only)
 * const resultNoPitch = mapper.map(generatedRhythm, 'medium');
 * ```
 */

import type {
    ButtonMappingConfig,
    DDRButton,
    GuitarHeroButton,
    ButtonPattern,
} from '../types/ButtonMapping.js';
import {
    DEFAULT_BUTTON_MAPPING_CONFIG,
    mergeButtonMappingConfig,
    validateButtonMappingConfig,
} from '../types/ButtonMapping.js';
import {
    DDR_PATTERN_LIBRARY,
    GUITAR_HERO_PATTERN_LIBRARY,
} from './ButtonPatternLibrary.js';
import type { GeneratedRhythm, RhythmMetadata } from './RhythmGenerator.js';
import type { DifficultyVariant, DifficultyLevel } from '../analysis/beat/DifficultyVariantGenerator.js';
import type { PitchAtBeat, IntervalCategory, PitchDirection } from './PitchBeatLinker.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of mapping buttons to a difficulty variant
 */
export interface MappedLevelResult {
    /** The difficulty variant with keys assigned to beats */
    variant: DifficultyVariant;

    /** Original rhythm metadata preserved */
    rhythmMetadata: RhythmMetadata;

    /** Button mapping metadata */
    buttonMetadata: ButtonMappingMetadata;
}

/**
 * Metadata about the button mapping process
 */
export interface ButtonMappingMetadata {
    /** Controller mode used for mapping */
    controllerMode: 'ddr' | 'guitar_hero';

    /** All unique keys used in the chart */
    keysUsed: string[];

    /** Number of beats influenced by pitch */
    pitchInfluencedBeats: number;

    /** Number of beats from pattern library */
    patternInfluencedBeats: number;

    /** IDs of patterns used */
    patternsUsed: string[];

    /** Statistics about button distribution */
    buttonDistribution: Map<string, number>;

    /** Direction statistics (if pitch analysis was provided) */
    directionStats?: {
        up: number;
        down: number;
        stable: number;
        none: number;
    };

    /** Interval statistics (if pitch analysis was provided) */
    intervalStats?: {
        unison: number;
        small: number;
        medium: number;
        large: number;
        very_large: number;
    };

    /** Band statistics (if pitch analysis was provided) - which frequency bands pitches came from */
    bandStats?: {
        low: number;
        mid: number;
        high: number;
    };
}

/**
 * Internal type for button assignment result
 */
interface ButtonAssignment {
    beatIndex: number;
    timestamp: number;
    key: DDRButton | GuitarHeroButton;
    source: 'pitch' | 'pattern';
    patternId?: string;
    probability?: number;
}

// ============================================================================
// DDR Transition Tables
// ============================================================================

/**
 * DDR Circular Motion Transition Table
 *
 * Determines next button based on: current position + pitch direction + interval size.
 * Follows the natural clockwise flow: up → right → down → left → up
 */
const DDR_TRANSITIONS: Record<DDRButton, {
    ascending: Record<IntervalCategory, DDRButton>;
    descending: Record<IntervalCategory, DDRButton>;
    stable: DDRButton;
}> = {
    'up': {
        ascending: { unison: 'up', small: 'up', medium: 'right', large: 'right', very_large: 'left' },
        descending: { unison: 'up', small: 'left', medium: 'right', large: 'down', very_large: 'down' },
        stable: 'up',
    },
    'right': {
        ascending: { unison: 'right', small: 'up', medium: 'up', large: 'up', very_large: 'left' },
        descending: { unison: 'right', small: 'down', medium: 'down', large: 'down', very_large: 'left' },
        stable: 'right',
    },
    'down': {
        ascending: { unison: 'down', small: 'left', medium: 'right', large: 'up', very_large: 'up' },
        descending: { unison: 'down', small: 'down', medium: 'left', large: 'left', very_large: 'right' },
        stable: 'down',
    },
    'left': {
        ascending: { unison: 'left', small: 'up', medium: 'up', large: 'up', very_large: 'right' },
        descending: { unison: 'left', small: 'down', medium: 'down', large: 'down', very_large: 'right' },
        stable: 'left',
    },
};

/**
 * DDR Easy mode transition table (direction-only, no leaps)
 *
 * Easy mode only uses direction and moves to adjacent buttons.
 */
const DDR_EASY_TRANSITIONS: Record<DDRButton, {
    ascending: DDRButton;
    descending: DDRButton;
    stable: DDRButton;
}> = {
    'up': { ascending: 'up', descending: 'left', stable: 'up' },
    'right': { ascending: 'up', descending: 'down', stable: 'right' },
    'down': { ascending: 'right', descending: 'down', stable: 'down' },
    'left': { ascending: 'up', descending: 'down', stable: 'left' },
};

// ============================================================================
// Guitar Hero Transition Tables
// ============================================================================

/**
 * Guitar Hero Fret Transition Table (with string wrap)
 *
 * Determines next fret based on: current position + pitch direction + interval size.
 * String wrap: ascending past 5 → wraps to 2-4; descending past 1 → wraps to 4-2
 */
const GUITAR_HERO_TRANSITIONS: Record<GuitarHeroButton, {
    ascending: Record<IntervalCategory, GuitarHeroButton>;
    descending: Record<IntervalCategory, GuitarHeroButton>;
    stable: GuitarHeroButton;
}> = {
    1: {
        ascending: { unison: 1, small: 2, medium: 2, large: 3, very_large: 3 },
        descending: { unison: 1, small: 4, medium: 4, large: 3, very_large: 3 }, // string wrap up
        stable: 1,
    },
    2: {
        ascending: { unison: 2, small: 3, medium: 3, large: 4, very_large: 4 },
        descending: { unison: 2, small: 1, medium: 1, large: 4, very_large: 4 },
        stable: 2,
    },
    3: {
        ascending: { unison: 3, small: 4, medium: 4, large: 5, very_large: 5 },
        descending: { unison: 3, small: 2, medium: 2, large: 1, very_large: 1 },
        stable: 3,
    },
    4: {
        ascending: { unison: 4, small: 5, medium: 5, large: 2, very_large: 2 }, // string wrap down
        descending: { unison: 4, small: 3, medium: 3, large: 2, very_large: 1 },
        stable: 4,
    },
    5: {
        ascending: { unison: 5, small: 2, medium: 2, large: 3, very_large: 3 }, // string wrap down
        descending: { unison: 5, small: 4, medium: 4, large: 3, very_large: 2 },
        stable: 5,
    },
};

/**
 * Guitar Hero Easy mode transition table (direction-only, stepwise motion)
 *
 * Easy mode only uses direction and moves to adjacent frets.
 */
const GUITAR_HERO_EASY_TRANSITIONS: Record<GuitarHeroButton, {
    ascending: GuitarHeroButton;
    descending: GuitarHeroButton;
    stable: GuitarHeroButton;
}> = {
    1: { ascending: 2, descending: 1, stable: 1 },
    2: { ascending: 3, descending: 1, stable: 2 },
    3: { ascending: 4, descending: 2, stable: 3 },
    4: { ascending: 5, descending: 3, stable: 4 },
    5: { ascending: 5, descending: 4, stable: 5 },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get interval category from pitch, defaulting to 'small' if not set
 */
function getIntervalCategory(pitch: PitchAtBeat): IntervalCategory {
    return pitch.intervalCategory ?? 'small';
}

/**
 * Check for consecutive same-key violations and return positions to fix
 */
function checkConsecutiveLimit(
    keys: (DDRButton | GuitarHeroButton)[],
    limit: number
): { positions: number[] } {
    const positions: number[] = [];

    if (limit <= 0 || keys.length === 0) {
        return { positions };
    }

    let consecutiveCount = 1;
    const currentKey = keys[0];

    for (let i = 1; i < keys.length; i++) {
        if (keys[i] === currentKey) {
            consecutiveCount++;
            if (consecutiveCount > limit) {
                positions.push(i);
            }
        } else {
            consecutiveCount = 1;
        }
    }

    return { positions };
}

/**
 * Select a pattern from the library compatible with the previous key
 */
function selectPatternFromLibrary<T extends DDRButton | GuitarHeroButton>(
    patterns: ButtonPattern<T>[],
    previousKey: T | null,
    maxDifficulty: number
): ButtonPattern<T> {
    // Filter by difficulty
    const eligiblePatterns = patterns.filter(p => p.difficulty <= maxDifficulty);

    if (eligiblePatterns.length === 0) {
        // Fallback: use first pattern
        return patterns[0];
    }

    // Try to find a pattern that starts with a different key
    if (previousKey !== null) {
        const differentKeyPatterns = eligiblePatterns.filter(p => p.keys[0] !== previousKey);
        if (differentKeyPatterns.length > 0) {
            return differentKeyPatterns[Math.floor(Math.random() * differentKeyPatterns.length)];
        }
    }

    // Random selection
    return eligiblePatterns[Math.floor(Math.random() * eligiblePatterns.length)];
}

/**
 * Get a pattern button that provides variation from the current key
 */
function getVariationButton<T extends DDRButton | GuitarHeroButton>(
    currentKey: T,
    library: ButtonPattern<T>[],
    maxDifficulty: number
): T {
    const pattern = selectPatternFromLibrary(library, currentKey, maxDifficulty);
    return pattern.keys[0];
}

// ============================================================================
// ButtonMapper Class
// ============================================================================

/**
 * Button Mapper
 *
 * Maps pitch analysis to button assignments for rhythm games.
 * Supports DDR (4 directional buttons) and Guitar Hero (5 fret buttons) modes.
 */
export class ButtonMapper {
    private config: ButtonMappingConfig;

    /**
     * Create a new ButtonMapper
     *
     * @param config - Configuration options (partial, defaults applied)
     */
    constructor(config?: Partial<ButtonMappingConfig>) {
        this.config = mergeButtonMappingConfig(config);

        // Validate configuration
        const validation = validateButtonMappingConfig(this.config);
        if (!validation.valid) {
            throw new Error(`Invalid button mapping config: ${validation.errors.join(', ')}`);
        }
    }

    /**
     * Get the current configuration
     */
    getConfig(): ButtonMappingConfig {
        return { ...this.config };
    }

    // ============================================================================
    // Main Public API
    // ============================================================================

    /**
     * Main entry point - map buttons for a difficulty variant
     *
     * Takes a generated rhythm and optional pitch analysis, then assigns buttons
     * based on pitch direction/interval and pattern library fallback.
     *
     * @param generatedRhythm - The generated rhythm from RhythmGenerator
     * @param difficulty - Which difficulty variant to map ('easy', 'medium', 'hard')
     * @param pitchAnalysis - Optional pitch analysis from MelodyContourAnalyzer
     * @returns Mapped level result with button assignments
     */
    map(
        generatedRhythm: GeneratedRhythm,
        difficulty: DifficultyLevel,
        pitchAnalysis?: PitchAtBeat[]
    ): MappedLevelResult {
        // Get the appropriate difficulty variant
        const variant = generatedRhythm.difficultyVariants[difficulty];

        // Map buttons for this variant
        const assignments = this.mapButtons(variant, pitchAnalysis, difficulty);

        // Build metadata
        const buttonMetadata = this.buildMetadata(assignments, pitchAnalysis);

        return {
            variant,
            rhythmMetadata: generatedRhythm.metadata,
            buttonMetadata,
        };
    }

    /**
     * Map buttons for all three difficulty variants
     *
     * @param generatedRhythm - The generated rhythm from RhythmGenerator
     * @param pitchAnalysis - Optional pitch analysis from MelodyContourAnalyzer
     * @returns Object with mapped results for each difficulty
     */
    mapAll(
        generatedRhythm: GeneratedRhythm,
        pitchAnalysis?: PitchAtBeat[]
    ): {
        easy: MappedLevelResult;
        medium: MappedLevelResult;
        hard: MappedLevelResult;
    } {
        return {
            easy: this.map(generatedRhythm, 'easy', pitchAnalysis),
            medium: this.map(generatedRhythm, 'medium', pitchAnalysis),
            hard: this.map(generatedRhythm, 'hard', pitchAnalysis),
        };
    }

    // ============================================================================
    // Core Mapping Logic
    // ============================================================================

    /**
     * Map buttons for a single difficulty variant
     */
    private mapButtons(
        variant: DifficultyVariant,
        pitchAnalysis: PitchAtBeat[] | undefined,
        difficulty: DifficultyLevel
    ): ButtonAssignment[] {
        const beats = variant.beats;
        const assignments: ButtonAssignment[] = [];

        // Build pitch lookup by timestamp
        const pitchByTimestamp = new Map<number, PitchAtBeat>();
        if (pitchAnalysis) {
            for (const pitch of pitchAnalysis) {
                const key = Math.round(pitch.timestamp * 1000);
                pitchByTimestamp.set(key, pitch);
            }
        }

        // Get max pattern difficulty for this game difficulty
        const maxPatternDifficulty = this.getMaxPatternDifficulty(difficulty);

        // First pass: generate pitch-derived and pattern-derived buttons
        const pitchKeys: (DDRButton | GuitarHeroButton | null)[] = [];
        const patternKeys: (DDRButton | GuitarHeroButton)[] = [];
        const probabilities: number[] = [];

        let previousKey: DDRButton | GuitarHeroButton | null = null;

        for (const beat of beats) {
            // Find pitch at this beat's timestamp
            const timestampKey = Math.round(beat.timestamp * 1000);
            let pitchAtBeat: PitchAtBeat | null = null;

            // Look up with tolerance
            for (let offset = -2; offset <= 2; offset++) {
                pitchAtBeat = pitchByTimestamp.get(timestampKey + offset) ?? null;
                if (pitchAtBeat) break;
            }

            // Generate pitch-derived button
            let pitchKey: DDRButton | GuitarHeroButton | null = null;
            let probability = 0;

            if (pitchAtBeat && pitchAtBeat.direction !== 'none') {
                pitchKey = this.config.controllerMode === 'ddr'
                    ? this.mapPitchToDDR(pitchAtBeat, previousKey as DDRButton | null, difficulty)
                    : this.mapPitchToGuitarHero(pitchAtBeat, previousKey as GuitarHeroButton | null, difficulty);
                probability = pitchAtBeat.pitch?.probability ?? 0.5;
            }

            pitchKeys.push(pitchKey);
            probabilities.push(probability);

            // Generate pattern-derived button (always, for fallback)
            const patternKey: DDRButton | GuitarHeroButton = this.config.controllerMode === 'ddr'
                ? this.selectPatternButton(previousKey as DDRButton | null, DDR_PATTERN_LIBRARY.patterns, maxPatternDifficulty)
                : this.selectPatternButton(previousKey as GuitarHeroButton | null, GUITAR_HERO_PATTERN_LIBRARY.patterns, maxPatternDifficulty);
            patternKeys.push(patternKey);

            previousKey = pitchKey ?? patternKey;
        }

        // Second pass: blend pitch and pattern based on probability and weight
        const weight = this.config.pitchInfluenceWeight;
        const finalKeys = this.blendPitchAndPattern(
            beats.map(b => ({ timestamp: b.timestamp })),
            pitchKeys,
            patternKeys,
            probabilities,
            weight
        );

        // Build final assignments
        for (let i = 0; i < beats.length; i++) {
            const isPitchSource = pitchKeys[i] !== null && pitchKeys[i] === finalKeys[i];
            assignments.push({
                beatIndex: i,
                timestamp: beats[i].timestamp,
                key: finalKeys[i],
                source: isPitchSource ? 'pitch' : 'pattern',
                probability: probabilities[i],
            });
        }

        // Apply consecutive same-key limit
        if (this.config.consecutiveSameKeyLimit > 0) {
            const patterns = this.config.controllerMode === 'ddr'
                ? DDR_PATTERN_LIBRARY.patterns as ButtonPattern<DDRButton | GuitarHeroButton>[]
                : GUITAR_HERO_PATTERN_LIBRARY.patterns as ButtonPattern<DDRButton | GuitarHeroButton>[];
            this.applyConsecutiveLimit(assignments, patterns, maxPatternDifficulty);
        }

        return assignments;
    }

    /**
     * Blend pitch-derived and pattern-derived buttons based on probability
     */
    private blendPitchAndPattern(
        beats: { timestamp: number }[],
        pitchKeys: (DDRButton | GuitarHeroButton | null)[],
        patternKeys: (DDRButton | GuitarHeroButton)[],
        probabilities: number[],
        weight: number
    ): (DDRButton | GuitarHeroButton)[] {
        // Build list of indices with pitch, sorted by probability (lowest first)
        const withProbability = beats
            .map((beat, index) => ({
                index,
                probability: probabilities[index],
                hasPitch: pitchKeys[index] !== null,
            }))
            .filter(item => item.hasPitch);

        // Sort by probability (lowest first) - these get replaced first
        withProbability.sort((a, b) => a.probability - b.probability);

        // Calculate how many beats to replace with patterns
        // weight = 1.0 → 0% replaced (all pitch)
        // weight = 0.5 → 50% replaced (lowest probability half)
        // weight = 0.0 → 100% replaced (all patterns)
        const replaceCount = Math.floor(withProbability.length * (1 - weight));

        // Indices of beats to replace (lowest probability)
        const indicesToReplace = new Set(
            withProbability.slice(0, replaceCount).map(item => item.index)
        );

        // Build final result
        return beats.map((_, index) => {
            // No pitch available → always use pattern
            if (pitchKeys[index] === null) {
                return patternKeys[index];
            }
            // Low probability → use pattern
            if (indicesToReplace.has(index)) {
                return patternKeys[index];
            }
            // High probability → use pitch
            return pitchKeys[index]!;
        });
    }

    /**
     * Select a button from pattern library
     */
    private selectPatternButton<T extends DDRButton | GuitarHeroButton>(
        previousKey: T | null,
        library: ButtonPattern<T>[],
        maxDifficulty: number
    ): T {
        const pattern = selectPatternFromLibrary(library, previousKey, maxDifficulty);
        return pattern.keys[0];
    }

    // ============================================================================
    // DDR Pitch Mapping
    // ============================================================================

    /**
     * Map pitch to DDR button using state transitions
     */
    private mapPitchToDDR(
        pitch: PitchAtBeat,
        previousKey: DDRButton | null,
        difficulty: DifficultyLevel
    ): DDRButton {
        // Default starting position (left for natural clockwise flow)
        const currentButton = previousKey ?? 'left';

        // Stable pitch or unison = repeat same button
        if (pitch.direction === 'stable' || pitch.intervalCategory === 'unison') {
            return currentButton;
        }

        // Easy mode: direction-only mapping (no leaps)
        if (difficulty === 'easy') {
            const transitions = DDR_EASY_TRANSITIONS[currentButton];
            return pitch.direction === 'up' ? transitions.ascending : transitions.descending;
        }

        // Medium/Hard: full transition table with interval consideration
        const transitions = DDR_TRANSITIONS[currentButton];
        const directionKey = pitch.direction === 'up' ? 'ascending' : 'descending';
        const intervalCategory = getIntervalCategory(pitch);

        return transitions[directionKey][intervalCategory];
    }

    // ============================================================================
    // Guitar Hero Pitch Mapping
    // ============================================================================

    /**
     * Map pitch to Guitar Hero button using state transitions
     */
    private mapPitchToGuitarHero(
        pitch: PitchAtBeat,
        previousKey: GuitarHeroButton | null,
        difficulty: DifficultyLevel
    ): GuitarHeroButton {
        // Default to middle fret
        const currentFret = previousKey ?? 3;

        // Stable pitch or unison = stay on current fret
        if (pitch.direction === 'stable' || pitch.intervalCategory === 'unison') {
            return currentFret;
        }

        // Easy mode: direction-only mapping (stepwise motion)
        if (difficulty === 'easy') {
            const transitions = GUITAR_HERO_EASY_TRANSITIONS[currentFret];
            return pitch.direction === 'up' ? transitions.ascending : transitions.descending;
        }

        // Medium/Hard: full transition table with interval consideration
        const transitions = GUITAR_HERO_TRANSITIONS[currentFret];
        const directionKey = pitch.direction === 'up' ? 'ascending' : 'descending';
        const intervalCategory = getIntervalCategory(pitch);

        return transitions[directionKey][intervalCategory];
    }

    // ============================================================================
    // Difficulty and Limit Handling
    // ============================================================================

    /**
     * Get maximum pattern difficulty based on game difficulty
     */
    private getMaxPatternDifficulty(difficulty: DifficultyLevel): number {
        switch (difficulty) {
            case 'easy': return 3;
            case 'medium': return 6;
            case 'hard': return 10;
        }
    }

    /**
     * Apply consecutive same-key limit to prevent monotonous patterns
     */
    private applyConsecutiveLimit(
        assignments: ButtonAssignment[],
        patternLibrary: ButtonPattern<DDRButton | GuitarHeroButton>[],
        maxPatternDifficulty: number
    ): void {
        const keys = assignments.map(a => a.key);
        const limit = this.config.consecutiveSameKeyLimit;
        const { positions } = checkConsecutiveLimit(keys, limit);

        for (const pos of positions) {
            // Get adjacent keys for variation
            const prevKey = pos > 0 ? assignments[pos - 1].key : null;

            // Select a button that provides variation
            const newKey = getVariationButton(
                assignments[pos].key,
                patternLibrary,
                maxPatternDifficulty
            );

            if (newKey !== assignments[pos].key) {
                assignments[pos].key = newKey;
                assignments[pos].source = 'pattern';
            }
        }
    }

    // ============================================================================
    // Metadata Building
    // ============================================================================

    /**
     * Build metadata about the button mapping process
     */
    private buildMetadata(
        assignments: ButtonAssignment[],
        pitchAnalysis: PitchAtBeat[] | undefined
    ): ButtonMappingMetadata {
        const keysUsed = new Set<string>();
        const buttonDistribution = new Map<string, number>();
        let pitchInfluencedBeats = 0;
        let patternInfluencedBeats = 0;
        const patternsUsed = new Set<string>();

        for (const assignment of assignments) {
            const keyStr = String(assignment.key);
            keysUsed.add(keyStr);
            buttonDistribution.set(keyStr, (buttonDistribution.get(keyStr) ?? 0) + 1);

            if (assignment.source === 'pitch') {
                pitchInfluencedBeats++;
            } else {
                patternInfluencedBeats++;
            }

            if (assignment.patternId) {
                patternsUsed.add(assignment.patternId);
            }
        }

        // Calculate direction, interval, and band stats if pitch analysis was provided
        let directionStats: ButtonMappingMetadata['directionStats'] | undefined;
        let intervalStats: ButtonMappingMetadata['intervalStats'] | undefined;
        let bandStats: ButtonMappingMetadata['bandStats'] | undefined;

        if (pitchAnalysis && pitchAnalysis.length > 0) {
            directionStats = { up: 0, down: 0, stable: 0, none: 0 };
            intervalStats = { unison: 0, small: 0, medium: 0, large: 0, very_large: 0 };
            bandStats = { low: 0, mid: 0, high: 0 };

            for (const pitch of pitchAnalysis) {
                directionStats[pitch.direction]++;
                if (pitch.intervalCategory) {
                    intervalStats[pitch.intervalCategory]++;
                }
                if (pitch.band) {
                    bandStats[pitch.band]++;
                }
            }
        }

        return {
            controllerMode: this.config.controllerMode,
            keysUsed: Array.from(keysUsed),
            pitchInfluencedBeats,
            patternInfluencedBeats,
            patternsUsed: Array.from(patternsUsed),
            buttonDistribution,
            directionStats,
            intervalStats,
            bandStats,
        };
    }

    // ============================================================================
    // Public Utility Methods
    // ============================================================================

    /**
     * Get the DDR transition table (for debugging/visualization)
     */
    static getDDRTransitions(): typeof DDR_TRANSITIONS {
        return DDR_TRANSITIONS;
    }

    /**
     * Get the Guitar Hero transition table (for debugging/visualization)
     */
    static getGuitarHeroTransitions(): typeof GUITAR_HERO_TRANSITIONS {
        return GUITAR_HERO_TRANSITIONS;
    }

    /**
     * Get all available buttons for the current controller mode
     */
    getAvailableButtons(): (DDRButton | GuitarHeroButton)[] {
        if (this.config.controllerMode === 'ddr') {
            return ['up', 'down', 'left', 'right'];
        } else {
            return [1, 2, 3, 4, 5];
        }
    }

    /**
     * Check if a button is valid for the current controller mode
     */
    isValidButton(button: unknown): button is DDRButton | GuitarHeroButton {
        if (this.config.controllerMode === 'ddr') {
            return ['up', 'down', 'left', 'right'].includes(button as string);
        } else {
            return [1, 2, 3, 4, 5].includes(button as number);
        }
    }
}
