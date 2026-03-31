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
import { deriveSeed, hashSeedToFloat } from '../../utils/hash.js';

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

    /** Per-beat key assignments (beat index → button key) from the ButtonMapper */
    keyAssignments: Map<number, string>;

    /** Per-beat mapping source (beat index → 'pitch' | 'pattern') */
    mappingSources: Map<number, 'pitch' | 'pattern'>;

    /** Per-beat pattern IDs (beat index → pattern ID, undefined for pitch-sourced beats) */
    mappingPatternIds: Map<number, string | undefined>;
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

    /** Pattern placements — groups of consecutive beats sharing the same patternId */
    patternPlacements?: {
        patternId: string;
        startIndex: number;
        length: number;
    }[];
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

/**
 * A consecutive run of beats that need pattern filling.
 *
 * Identified by scanning pitch classification results: consecutive beats
 * with no pitch-derived key form a single run. Each run records the
 * surrounding context keys for smooth boundary transitions.
 */
export interface PatternRun<T extends DDRButton | GuitarHeroButton> {
    /** Start index in the beat array */
    startIndex: number;
    /** End index (exclusive) in the beat array */
    endIndex: number;
    /** Number of beats in this run */
    length: number;
    /** Key from the pitch beat immediately before this run (null if run starts at beat 0) */
    previousKey: T | null;
    /** Key from the pitch beat immediately after this run (null if run ends at last beat) */
    nextKey: T | null;
}

/**
 * Result of placing a pattern within a run.
 *
 * Each placement represents a single pattern that was selected and
 * written into a contiguous range of beats within a pattern run.
 */
export interface PatternPlacement<T extends DDRButton | GuitarHeroButton> {
    /** The pattern that was placed */
    pattern: ButtonPattern<T>;
    /** Beat index where this pattern starts */
    startIndex: number;
    /** Number of beats actually filled by this pattern */
    filledLength: number;
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
// Pitch Classification Functions
// ============================================================================

/**
 * Get interval category from pitch, defaulting to 'small' if not set
 */
function getIntervalCategory(pitch: PitchAtBeat): IntervalCategory {
    return pitch.intervalCategory ?? 'small';
}

/**
 * Map pitch to DDR button using state transitions.
 *
 * Uses the DDR circular motion transition tables to determine the next button
 * based on current position, pitch direction, and interval size.
 */
function mapPitchToDDR(
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

/**
 * Map pitch to Guitar Hero button using state transitions.
 *
 * Uses the Guitar Hero fret transition tables to determine the next fret
 * based on current position, pitch direction, and interval size.
 * Supports string wrap for large intervals.
 */
function mapPitchToGuitarHero(
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

/**
 * Classify each beat as pitch-derived or pattern-needed.
 *
 * Builds a pitch-by-timestamp lookup, then for each beat attempts pitch mapping
 * using the DDR/Guitar Hero transition tables. Beats with no pitch or
 * direction === 'none' return null, indicating they need pattern filling.
 *
 * This is a pure function — it only considers pitch data and produces pitch keys.
 * Pattern selection is handled separately in the run-based placement pipeline.
 */
function classifyBeats<T extends DDRButton | GuitarHeroButton>(
    beats: { timestamp: number }[],
    pitchAnalysis: PitchAtBeat[] | undefined,
    controllerMode: 'ddr' | 'guitar_hero',
    difficulty: DifficultyLevel,
): {
    pitchKeys: (T | null)[];
    probabilities: number[];
} {
    // Build pitch lookup by timestamp
    const pitchByTimestamp = new Map<number, PitchAtBeat>();
    if (pitchAnalysis) {
        for (const pitch of pitchAnalysis) {
            const key = Math.round(pitch.timestamp * 1000);
            pitchByTimestamp.set(key, pitch);
        }
    }

    const pitchKeys: (T | null)[] = [];
    const probabilities: number[] = [];
    let previousKey: T | null = null;

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
        let pitchKey: T | null = null;
        let probability = 0;

        if (pitchAtBeat && pitchAtBeat.direction !== 'none') {
            pitchKey = controllerMode === 'ddr'
                ? mapPitchToDDR(pitchAtBeat, previousKey as DDRButton | null, difficulty) as unknown as T
                : mapPitchToGuitarHero(pitchAtBeat, previousKey as GuitarHeroButton | null, difficulty) as unknown as T;
            probability = pitchAtBeat.pitch?.probability ?? 0.5;
        }

        pitchKeys.push(pitchKey);
        probabilities.push(probability);

        previousKey = pitchKey;
    }

    return { pitchKeys, probabilities };
}

// ============================================================================
// Run Detection
// ============================================================================

/**
 * Scan pitch classification results and group consecutive null beats into runs.
 *
 * A "run" is a maximal sequence of consecutive beats that all need pattern filling
 * (i.e., their pitchKey is null). Each run records the surrounding context keys
 * so that pattern selection can produce smooth boundary transitions.
 *
 * @param pitchKeys - Array from classifyBeats; null = needs pattern, non-null = has pitch key
 * @returns Array of PatternRun objects (empty if all beats have pitch keys)
 */
export function identifyPatternRuns<T extends DDRButton | GuitarHeroButton>(
    pitchKeys: (T | null)[]
): PatternRun<T>[] {
    const runs: PatternRun<T>[] = [];
    let runStart = -1;

    for (let i = 0; i <= pitchKeys.length; i++) {
        const isNull = i < pitchKeys.length && pitchKeys[i] === null;

        if (isNull && runStart === -1) {
            // Start a new run
            runStart = i;
        } else if (!isNull && runStart !== -1) {
            // End the current run at the non-null position
            const previousKey = runStart > 0 ? pitchKeys[runStart - 1] : null;
            const nextKey = i < pitchKeys.length ? pitchKeys[i] : null;

            runs.push({
                startIndex: runStart,
                endIndex: i,
                length: i - runStart,
                previousKey,
                nextKey,
            });

            runStart = -1;
        }
    }

    return runs;
}

// ============================================================================
// Run-Based Pattern Compatibility
// ============================================================================

/**
 * Check if a full multi-beat pattern is compatible for placement within a run.
 *
 * Evaluates boundary transitions at both ends of the pattern:
 * - **Entry**: `pattern.keys[0]` must differ from the previous key (no immediate repeat).
 * - **Exit**: `pattern.keys[last]` must allow a smooth transition to the next key.
 *   - DDR: last key must be adjacent to or same as next key (uses `DDR_ADJACENT`).
 *   - Guitar Hero: last key must be between previous and next, or moving toward next.
 *
 * The pattern must also fit within the remaining space of the run.
 * Difficulty filtering is handled by the caller in `selectPatternForRun()`.
 *
 * @param pattern - The pattern to check
 * @param run - The run this pattern would be placed in
 * @param positionInRun - Offset from the start of the run (0 = start of run)
 * @param previousKey - Key immediately before this pattern (run previousKey or previous pattern's last key)
 * @param nextKey - Key immediately after this pattern (run nextKey, or null if more patterns follow)
 * @returns True if the pattern is compatible with the run boundaries
 */
export function isPatternRunCompatible<T extends DDRButton | GuitarHeroButton>(
    pattern: ButtonPattern<T>,
    run: PatternRun<T>,
    positionInRun: number,
    previousKey: T | null,
    nextKey: T | null,
): boolean {
    // Empty patterns are never compatible
    if (pattern.keys.length === 0) {
        return false;
    }

    // Pattern must fit within the remaining run space
    if (positionInRun + pattern.keys.length > run.length) {
        return false;
    }

    const firstKey = pattern.keys[0];
    const lastKey = pattern.keys[pattern.keys.length - 1];

    // Rule 1: First key must differ from previous key (no immediate repeat)
    if (previousKey !== null && firstKey === previousKey) {
        return false;
    }

    // Rule 2: Last key must allow smooth transition to next key
    if (nextKey !== null) {
        // DDR: last key should be adjacent-to or same-as next key
        if (typeof lastKey === 'string' && typeof nextKey === 'string') {
            const adjacent = DDR_ADJACENT[lastKey as DDRButton];
            if (!adjacent?.includes(nextKey as DDRButton) && lastKey !== nextKey) {
                return false;
            }
        }

        // Guitar Hero: last key should be between previous and next, or moving toward next
        if (typeof lastKey === 'number' && typeof nextKey === 'number') {
            if (previousKey !== null && typeof previousKey === 'number') {
                const movingTowardNext =
                    (previousKey < nextKey && lastKey >= previousKey && lastKey <= nextKey) ||
                    (previousKey > nextKey && lastKey <= previousKey && lastKey >= nextKey);
                if (!movingTowardNext && lastKey !== nextKey) {
                    return false;
                }
            } else {
                // No previous key context: last key should be within 1 fret of next
                if (Math.abs(lastKey - nextKey) > 1) {
                    return false;
                }
            }
        }
    }

    return true;
}

// ============================================================================
// Run-Based Pattern Selection
// ============================================================================

/**
 * Select patterns to fill a pattern run using a greedy largest-first strategy.
 *
 * The algorithm walks through the run left-to-right:
 * 1. Filters patterns by difficulty and sorts by length (largest first).
 * 2. At each position, tries to find a compatible pattern:
 *    - **Exact fit**: a pattern whose length equals the remaining space, with
 *      the run's `nextKey` used for exit-transition checking.
 *    - **Largest fit**: the largest compatible pattern (intermediate placements
 *      use `null` for nextKey, so exit transitions are deferred).
 * 3. If no compatible pattern exists at all, the beat is filled via
 *    `interpolateButton()` and recorded as a synthetic single-key placement.
 *
 * Variety constraints (applied in order of priority):
 * - Never repeat the same pattern consecutively within a run.
 * - Prefer a different category from the last placed pattern.
 * - Optionally avoid patterns recently used across runs (via `recentlyUsedPatternIds`).
 *
 * @param run - The pattern run to fill
 * @param patternLibrary - All available patterns for the controller mode
 * @param maxDifficulty - Maximum pattern difficulty to consider
 * @param recentlyUsedPatternIds - Optional set of pattern IDs used in recent
 *   measures (for cross-run variety). Defaults to no constraint.
 * @returns Array of placements covering every beat in the run
 */
export function selectPatternForRun<T extends DDRButton | GuitarHeroButton>(
    run: PatternRun<T>,
    patternLibrary: ButtonPattern<T>[],
    maxDifficulty: number,
    recentlyUsedPatternIds?: Set<string>,
    randomFn?: () => number,
): PatternPlacement<T>[] {
    const placements: PatternPlacement<T>[] = [];

    // Step 1: Filter by difficulty, exclude empty patterns
    const eligible = patternLibrary.filter(
        p => p.difficulty <= maxDifficulty && p.keys.length > 0
    );

    // Step 2: Sort by keys.length descending (greedy: largest first)
    eligible.sort((a, b) => b.keys.length - a.keys.length);

    // Determine controller mode from library (for synthetic interpolated placements)
    const controllerMode = eligible[0]?.controllerMode ?? 'ddr';

    let posInRun = 0;
    let prevKey: T | null = run.previousKey;
    let lastPatternId: string | null = null;
    let lastCategory: string | null = null;

    while (posInRun < run.length) {
        const remaining = run.length - posInRun;
        let selected: ButtonPattern<T> | undefined;

        // Strategy 1: Exact-fit pattern (fills remaining space, uses run.nextKey for exit check)
        const exactCandidates = eligible.filter(p => p.keys.length === remaining);
        selected = findCompatiblePattern(
            exactCandidates, run, posInRun, prevKey, run.nextKey,
            lastPatternId, lastCategory, recentlyUsedPatternIds,
            randomFn
        );

        // Strategy 2: Largest compatible pattern (intermediate placement, no exit check)
        if (!selected) {
            const fittingCandidates = eligible.filter(p => p.keys.length <= remaining);
            selected = findCompatiblePattern(
                fittingCandidates, run, posInRun, prevKey, null,
                lastPatternId, lastCategory, recentlyUsedPatternIds,
                randomFn
            );
        }

        // Strategy 3: Relax all variety constraints
        if (!selected) {
            const fittingCandidates = eligible.filter(p => p.keys.length <= remaining);
            selected = findCompatiblePattern(
                fittingCandidates, run, posInRun, prevKey, null,
                null, null, null,
                randomFn
            );
        }

        if (selected) {
            placements.push({
                pattern: selected,
                startIndex: run.startIndex + posInRun,
                filledLength: selected.keys.length,
            });
            prevKey = selected.keys[selected.keys.length - 1];
            lastPatternId = selected.id;
            lastCategory = selected.category;
            posInRun += selected.keys.length;
        } else {
            // No compatible pattern: use interpolation for this beat
            const effectiveNextKey = (posInRun === run.length - 1) ? run.nextKey : null;
            const interpKey = interpolateButton(prevKey, effectiveNextKey);
            placements.push({
                pattern: {
                    id: '__interpolated__',
                    name: 'Interpolated',
                    controllerMode,
                    keys: [interpKey],
                    measures: 0,
                    tags: ['interpolated'],
                    category: 'transition',
                    difficulty: 1,
                },
                startIndex: run.startIndex + posInRun,
                filledLength: 1,
            });
            prevKey = interpKey;
            posInRun++;
        }
    }

    return placements;
}

/**
 * Find a compatible pattern from candidates, applying variety constraints in
 * order of strictness.
 *
 * Passes (each more relaxed than the last):
 * 1. Avoid same pattern + different category + not recently used
 * 2. Allow same category (still avoid same pattern + recently used)
 * 3. Allow recently used (still avoid same pattern consecutively)
 * 4. Allow everything
 *
 * Within each pass, picks randomly from the largest group of same-sized
 * compatible patterns (candidates must be pre-sorted by `keys.length` desc).
 */
function findCompatiblePattern<T extends DDRButton | GuitarHeroButton>(
    candidates: ButtonPattern<T>[],
    run: PatternRun<T>,
    positionInRun: number,
    previousKey: T | null,
    nextKey: T | null,
    avoidPatternId: string | null,
    preferDifferentCategory: string | null,
    recentlyUsedPatternIds: Set<string> | null | undefined,
    randomFn: () => number = Math.random,
): ButtonPattern<T> | undefined {
    // Pass 1: strict variety
    const pass1 = candidates.filter(p =>
        isPatternRunCompatible(p, run, positionInRun, previousKey, nextKey) &&
        p.id !== avoidPatternId &&
        p.category !== preferDifferentCategory &&
        !recentlyUsedPatternIds?.has(p.id)
    );
    if (pass1.length > 0) return pickFromLargestGroup(pass1, randomFn);

    // Pass 2: allow same category
    const pass2 = candidates.filter(p =>
        isPatternRunCompatible(p, run, positionInRun, previousKey, nextKey) &&
        p.id !== avoidPatternId &&
        !recentlyUsedPatternIds?.has(p.id)
    );
    if (pass2.length > 0) return pickFromLargestGroup(pass2, randomFn);

    // Pass 3: allow recently used
    const pass3 = candidates.filter(p =>
        isPatternRunCompatible(p, run, positionInRun, previousKey, nextKey) &&
        p.id !== avoidPatternId
    );
    if (pass3.length > 0) return pickFromLargestGroup(pass3, randomFn);

    // Pass 4: no constraints
    const pass4 = candidates.filter(p =>
        isPatternRunCompatible(p, run, positionInRun, previousKey, nextKey)
    );
    if (pass4.length > 0) return pickFromLargestGroup(pass4, randomFn);

    return undefined;
}

/**
 * Pick a random pattern from the largest group of same-sized patterns.
 *
 * Candidates must be sorted by `keys.length` descending. The first element
 * determines the maximum size, and all patterns of that size are pooled for
 * random selection.
 */
function pickFromLargestGroup<T extends DDRButton | GuitarHeroButton>(
    patterns: ButtonPattern<T>[],
    randomFn: () => number = Math.random
): ButtonPattern<T> {
    const maxSize = patterns[0].keys.length;
    const largest = patterns.filter(p => p.keys.length === maxSize);
    return largest[Math.floor(randomFn() * largest.length)];
}

// ============================================================================
// Run-Based Pattern Placement
// ============================================================================

/**
 * Write pattern keys and IDs into the final arrays, preserving pitch-derived keys.
 *
 * For each run, each placement writes its pattern's keys sequentially into the
 * output arrays. Beats that already have a pitch-derived key (non-null in
 * `pitchKeys`) are left untouched.
 *
 * @param pitchKeys - Array from classifyBeats; non-null entries are pitch-derived
 * @param runs - Pattern runs from identifyPatternRuns()
 * @param placementsByRun - Pattern placements from selectPatternForRun(), one array per run
 * @returns Object with fully populated keys and patternIds arrays
 */
export function placePatterns<T extends DDRButton | GuitarHeroButton>(
    pitchKeys: (T | null)[],
    runs: PatternRun<T>[],
    placementsByRun: PatternPlacement<T>[][],
): {
    keys: T[];
    patternIds: (string | undefined)[];
} {
    const totalBeats = pitchKeys.length;
    const keys: (T | null)[] = [...pitchKeys];
    const patternIds: (string | undefined)[] = new Array(totalBeats).fill(undefined);

    for (let r = 0; r < runs.length; r++) {
        const run = runs[r];
        const placements = placementsByRun[r];

        for (const placement of placements) {
            for (let j = 0; j < placement.filledLength; j++) {
                const beatIndex = placement.startIndex + j;
                if (beatIndex >= totalBeats) break;

                keys[beatIndex] = placement.pattern.keys[j];
                patternIds[beatIndex] = placement.pattern.id;
            }
        }
    }

    // Every beat should now have a key (either from pitch or from a placement)
    // If any beat is still null, interpolate as a safety net
    for (let i = 0; i < totalBeats; i++) {
        if (keys[i] === null) {
            const prevKey = i > 0 ? keys[i - 1] : null;
            const nextKey = i < totalBeats - 1 ? keys[i + 1] : null;
            keys[i] = interpolateButton(prevKey, nextKey);
        }
    }

    return {
        keys: keys as T[],
        patternIds,
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Get a pattern button that provides variation from the current key.
 *
 * Selects a pattern from the library that starts with a different key
 * than the current key, filtering by difficulty. Falls back to any
 * eligible pattern if no different-key pattern is available.
 */
function getVariationButton<T extends DDRButton | GuitarHeroButton>(
    currentKey: T,
    library: ButtonPattern<T>[],
    maxDifficulty: number,
    randomFn: () => number = Math.random
): T {
    const eligiblePatterns = library.filter(p => p.difficulty <= maxDifficulty);

    if (eligiblePatterns.length === 0) {
        return currentKey;
    }

    // Try to find a pattern that starts with a different key
    const differentKeyPatterns = eligiblePatterns.filter(p => p.keys[0] !== currentKey);
    const pool = differentKeyPatterns.length > 0 ? differentKeyPatterns : eligiblePatterns;
    return pool[Math.floor(randomFn() * pool.length)].keys[0];
}

// ============================================================================
// Transition and Interpolation Utilities
// ============================================================================

/**
 * DDR button adjacency map for smooth transitions
 */
const DDR_ADJACENT: Record<DDRButton, DDRButton[]> = {
    'up': ['left', 'right'],
    'down': ['left', 'right'],
    'left': ['up', 'down'],
    'right': ['up', 'down'],
};

/**
 * Find the next pitch-derived key in the array
 *
 * @param keys - Array of keys (null means no pitch)
 * @param startIndex - Index to start searching from
 * @returns The next non-null key, or null if none found
 */
function findNextPitchKey<T extends DDRButton | GuitarHeroButton>(
    keys: (T | null)[],
    startIndex: number
): T | null {
    for (let i = startIndex + 1; i < keys.length; i++) {
        if (keys[i] !== null) {
            return keys[i];
        }
    }
    return null;
}

/**
 * Interpolate between two buttons to find a smooth transition
 *
 * @param previousKey - The previous key (may be null)
 * @param nextKey - The next key (may be null)
 * @returns An interpolated button for smooth transition
 */
function interpolateButton<T extends DDRButton | GuitarHeroButton>(
    previousKey: T | null,
    nextKey: T | null
): T {
    // If no previous, start from a neutral position
    if (previousKey === null) {
        if (nextKey === null) {
            // No context - return defaults
            return (typeof nextKey === 'string' ? 'left' : 3) as T;
        }
        // Start adjacent to next key
        if (typeof nextKey === 'string') {
            const adjacent = DDR_ADJACENT[nextKey as DDRButton];
            return adjacent[0] as T;
        } else {
            // Guitar Hero: start one fret below or at 3
            return Math.max(1, (nextKey as number) - 1) as T;
        }
    }

    // If no next, continue in same direction or stay
    if (nextKey === null) {
        return previousKey;
    }

    // DDR interpolation
    if (typeof previousKey === 'string' && typeof nextKey === 'string') {
        const prev = previousKey as DDRButton;
        const next = nextKey as DDRButton;

        // Same key - stay
        if (prev === next) return previousKey;

        // Check if adjacent - if so, move toward next
        const adjacent = DDR_ADJACENT[prev];
        if (adjacent.includes(next)) {
            return nextKey;
        }

        // Opposite keys (up/down or left/right) - pick an adjacent that leads toward next
        // up <-> down: go through left or right
        // left <-> right: go through up or down
        const prevAdjacent = DDR_ADJACENT[prev];
        const nextAdjacent = DDR_ADJACENT[next];

        // Find common adjacent button
        for (const adj of prevAdjacent) {
            if (nextAdjacent.includes(adj)) {
                return adj as T;
            }
        }

        // Fallback: return first adjacent
        return prevAdjacent[0] as T;
    }

    // Guitar Hero interpolation
    if (typeof previousKey === 'number' && typeof nextKey === 'number') {
        const prev = previousKey as number;
        const next = nextKey as number;

        // Same fret - stay
        if (prev === next) return previousKey;

        // Move one step toward next
        if (next > prev) {
            return Math.min(5, prev + 1) as T;
        } else {
            return Math.max(1, prev - 1) as T;
        }
    }

    // Fallback
    return previousKey;
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
     * Generate a deterministic random float for a given context.
     * Uses MurmurHash so the same seed + context always produces the same value.
     * Falls back to Math.random() when no seed is configured.
     */
    private seededRandom(context: string): number {
        if (!this.config.seed) {
            return Math.random();
        }
        return hashSeedToFloat(deriveSeed(this.config.seed, context));
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

        // Build per-beat key assignments map
        const keyAssignments = new Map<number, string>();
        const mappingSources = new Map<number, 'pitch' | 'pattern'>();
        const mappingPatternIds = new Map<number, string | undefined>();
        for (const assignment of assignments) {
            keyAssignments.set(assignment.beatIndex, String(assignment.key));
            mappingSources.set(assignment.beatIndex, assignment.source);
            mappingPatternIds.set(assignment.beatIndex, assignment.patternId);
        }

        return {
            variant,
            rhythmMetadata: generatedRhythm.metadata,
            buttonMetadata,
            keyAssignments,
            mappingSources,
            mappingPatternIds,
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
     * Map buttons for a single difficulty variant using run-based pattern placement.
     *
     * Pipeline:
     * 1. classifyBeats() → pitchKeys, probabilities
     * 2. classifyPitchVsPattern() → boolean classification (pitch vs pattern)
     * 3. Build workingKeys array (null for pattern beats, pitch key for pitch beats)
     * 4. identifyPatternRuns() → runs of consecutive pattern beats
     * 5. selectPatternForRun() per run → pattern placements
     * 6. placePatterns() → final keys + patternIds
     * 7. Build ButtonAssignment[] with proper source/patternId per beat
     * 8. applyConsecutiveLimit() → fix any monotony
     */
    private mapButtons(
        variant: DifficultyVariant,
        pitchAnalysis: PitchAtBeat[] | undefined,
        difficulty: DifficultyLevel
    ): ButtonAssignment[] {
        const beats = variant.beats;
        const assignments: ButtonAssignment[] = [];

        // Get max pattern difficulty for this game difficulty
        const maxPatternDifficulty = this.getMaxPatternDifficulty(difficulty);

        // Counter for seeded random calls (ensures deterministic ordering)
        let pickCounter = 0;

        // Step 1: Classify beats as pitch-derived or pattern-needed
        const { pitchKeys, probabilities } = classifyBeats(
            beats,
            pitchAnalysis,
            this.config.controllerMode,
            difficulty,
        );

        // Step 2: Determine which beats should be pitch vs pattern
        // Uses probability-based blending logic to determine which beats should be pitch vs pattern.
        // but produces a boolean classification instead of generating pattern keys.
        const isPitchBeat = this.classifyPitchVsPattern(
            pitchKeys,
            probabilities,
            this.config.pitchInfluenceWeight
        );

        // Step 3: Create working array — null for pattern beats, pitch key for pitch beats
        const workingKeys: (DDRButton | GuitarHeroButton | null)[] = pitchKeys.map((key, i) =>
            key !== null && isPitchBeat[i] ? key : null
        );

        // Step 4: Get pattern library for this controller mode
        const patternLibrary = this.config.controllerMode === 'ddr'
            ? DDR_PATTERN_LIBRARY.patterns as ButtonPattern<DDRButton | GuitarHeroButton>[]
            : GUITAR_HERO_PATTERN_LIBRARY.patterns as ButtonPattern<DDRButton | GuitarHeroButton>[];

        // Step 5: Identify runs of consecutive pattern beats
        const runs = identifyPatternRuns(workingKeys);

        // Step 6: Select patterns for each run, tracking recently used patterns for variety
        const recentlyUsedPatternIds = new Set<string>();
        const placementsByRun = runs.map((run, runIdx) => {
            const placements = selectPatternForRun(
                run,
                patternLibrary,
                maxPatternDifficulty,
                recentlyUsedPatternIds,
                () => this.seededRandom(`run:${runIdx}:pick:${pickCounter++}`)
            );
            // Update recently used set for cross-run variety
            for (const p of placements) {
                if (p.pattern.id !== '__interpolated__') {
                    recentlyUsedPatternIds.add(p.pattern.id);
                }
            }
            return placements;
        });

        // Step 7: Place patterns into the final key and patternId arrays
        const { keys: finalKeys, patternIds: finalPatternIds } = placePatterns(
            workingKeys,
            runs,
            placementsByRun
        );

        // Step 8: Build final assignments with proper source/patternId per beat
        for (let i = 0; i < beats.length; i++) {
            const isPitchSource = workingKeys[i] !== null;
            assignments.push({
                beatIndex: i,
                timestamp: beats[i].timestamp,
                key: finalKeys[i],
                source: isPitchSource ? 'pitch' : 'pattern',
                patternId: isPitchSource ? undefined : finalPatternIds[i],
                probability: probabilities[i],
            });
        }

        // Step 9: Apply consecutive same-key limit (post-processing)
        if (this.config.consecutiveSameKeyLimit > 0) {
            this.applyConsecutiveLimit(assignments, patternLibrary, maxPatternDifficulty);
        }

        return assignments;
    }

    /**
     * Classify each beat as pitch or pattern based on probability and weight.
     *
     * Uses probability-based blending logic:
     * sorts pitch beats by probability (lowest first), replaces the bottom
     * `(1 - weight)` fraction with patterns. Beats with no pitch data always
     * use patterns regardless of weight.
     *
     * @param pitchKeys - Array from classifyBeats; null = no pitch available
     * @param probabilities - Per-beat pitch probabilities
     * @param weight - pitchInfluenceWeight (0.0 = all pattern, 1.0 = all pitch)
     * @returns Boolean array where true = pitch, false = pattern
     */
    private classifyPitchVsPattern(
        pitchKeys: (DDRButton | GuitarHeroButton | null)[],
        probabilities: number[],
        weight: number
    ): boolean[] {
        const result: boolean[] = new Array(pitchKeys.length).fill(false);

        // Collect indices that have pitch, sorted by probability (lowest first)
        const withProbability = pitchKeys
            .map((key, index) => ({
                index,
                probability: probabilities[index],
                hasPitch: key !== null,
            }))
            .filter(item => item.hasPitch);

        withProbability.sort((a, b) => a.probability - b.probability);

        // Calculate how many beats to replace with patterns
        // weight = 1.0 → replaceCount = 0 (all pitch kept)
        // weight = 0.0 → replaceCount = all (all replaced)
        // weight = 0.5 → replaceCount = half (lowest prob half replaced)
        const replaceCount = Math.floor(withProbability.length * (1 - weight));

        // Indices of beats to demote from pitch to pattern (lowest probability)
        const indicesToReplace = new Set(
            withProbability.slice(0, replaceCount).map(item => item.index)
        );

        for (let i = 0; i < pitchKeys.length; i++) {
            if (pitchKeys[i] === null) {
                // No pitch available → always pattern
                result[i] = false;
            } else if (indicesToReplace.has(i)) {
                // Low probability → demote to pattern
                result[i] = false;
            } else {
                // High probability → keep as pitch
                result[i] = true;
            }
        }

        return result;
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
            case 'natural': return 10; // Natural uses hard difficulty limits
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

        for (let i = 0; i < positions.length; i++) {
            const pos = positions[i];
            // Select a button that provides variation (seeded for determinism)
            const newKey = getVariationButton(
                assignments[pos].key,
                patternLibrary,
                maxPatternDifficulty,
                () => this.seededRandom(`var:${pos}:${i}`)
            );

            if (newKey !== assignments[pos].key) {
                assignments[pos].key = newKey;
                assignments[pos].source = 'pattern';
                assignments[pos].patternId = 'consecutive_limit_fix';
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

        // Build pattern placements by scanning for consecutive same-patternId beats
        const patternPlacements: ButtonMappingMetadata['patternPlacements'] = [];
        let currentPatternId: string | undefined;
        let currentStartIndex = 0;

        for (let i = 0; i < assignments.length; i++) {
            const pid = assignments[i].patternId;
            if (pid && pid === currentPatternId) {
                // Continue current placement
            } else {
                // End previous placement if any
                if (currentPatternId) {
                    patternPlacements.push({
                        patternId: currentPatternId,
                        startIndex: currentStartIndex,
                        length: i - currentStartIndex,
                    });
                }
                currentPatternId = pid;
                currentStartIndex = i;
            }
        }
        // Close last placement
        if (currentPatternId) {
            patternPlacements.push({
                patternId: currentPatternId,
                startIndex: currentStartIndex,
                length: assignments.length - currentStartIndex,
            });
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
            patternPlacements,
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
