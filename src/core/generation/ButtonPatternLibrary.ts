/**
 * Button Pattern Library
 *
 * Contains predefined button patterns for DDR and Guitar Hero controller modes.
 * These patterns serve as fallback when pitch detection probability is low or
 * when pitchInfluenceWeight is set to use more pattern-driven mapping.
 *
 * @module ButtonPatternLibrary
 */

import type {
    DDRButton,
    GuitarHeroButton,
    ButtonPattern,
    ButtonPatternCategory,
    ButtonPatternLibrary,
    DDRPatternLibrary,
    GuitarHeroPatternLibrary,
} from '../types/ButtonMapping.js';

// =============================================================================
// DDR PATTERNS
// =============================================================================

/**
 * DDR Basic Patterns
 *
 * Simple patterns for beginners and easy difficulty.
 * Focuses on alternating keys and single key runs.
 */
const DDR_BASIC_PATTERNS: ButtonPattern<DDRButton>[] = [
    // Single key patterns
    {
        id: 'ddr_basic_single_up',
        name: 'Single Up',
        controllerMode: 'ddr',
        keys: ['up'],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'ddr_basic_single_down',
        name: 'Single Down',
        controllerMode: 'ddr',
        keys: ['down'],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'ddr_basic_single_left',
        name: 'Single Left',
        controllerMode: 'ddr',
        keys: ['left'],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'ddr_basic_single_right',
        name: 'Single Right',
        controllerMode: 'ddr',
        keys: ['right'],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },

    // Alternating patterns (2 keys)
    {
        id: 'ddr_basic_alternating_up_down',
        name: 'Alternating Up-Down',
        controllerMode: 'ddr',
        keys: ['up', 'down', 'up', 'down'],
        measures: 1,
        tags: ['basic', 'alternating', 'vertical'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'ddr_basic_alternating_left_right',
        name: 'Alternating Left-Right',
        controllerMode: 'ddr',
        keys: ['left', 'right', 'left', 'right'],
        measures: 1,
        tags: ['basic', 'alternating', 'horizontal'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'ddr_basic_alternating_up_left',
        name: 'Alternating Up-Left',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'up', 'left'],
        measures: 1,
        tags: ['basic', 'alternating'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'ddr_basic_alternating_down_right',
        name: 'Alternating Down-Right',
        controllerMode: 'ddr',
        keys: ['down', 'right', 'down', 'right'],
        measures: 1,
        tags: ['basic', 'alternating'],
        category: 'basic',
        difficulty: 2,
    },

    // Double step patterns
    {
        id: 'ddr_basic_double_up',
        name: 'Double Up',
        controllerMode: 'ddr',
        keys: ['up', 'up', 'down', 'down'],
        measures: 1,
        tags: ['basic', 'double', 'repeat'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'ddr_basic_double_left',
        name: 'Double Left',
        controllerMode: 'ddr',
        keys: ['left', 'left', 'right', 'right'],
        measures: 1,
        tags: ['basic', 'double', 'repeat'],
        category: 'basic',
        difficulty: 2,
    },

    // Simple walks
    {
        id: 'ddr_basic_walk_forward',
        name: 'Walk Forward',
        controllerMode: 'ddr',
        keys: ['left', 'right', 'left', 'right'],
        measures: 1,
        tags: ['basic', 'walk', 'horizontal'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'ddr_basic_walk_vertical',
        name: 'Walk Vertical',
        controllerMode: 'ddr',
        keys: ['up', 'down', 'up', 'down'],
        measures: 1,
        tags: ['basic', 'walk', 'vertical'],
        category: 'basic',
        difficulty: 2,
    },
];

/**
 * DDR Roll Patterns
 *
 * Sequential key presses that flow around the pad in circular motion.
 * Follows the natural clockwise flow: up → right → down → left → up
 */
const DDR_ROLL_PATTERNS: ButtonPattern<DDRButton>[] = [
    // Clockwise rolls
    {
        id: 'ddr_roll_clockwise_full',
        name: 'Clockwise Full Roll',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down', 'left'],
        measures: 1,
        tags: ['roll', 'clockwise', 'full'],
        category: 'roll',
        difficulty: 3,
    },
    {
        id: 'ddr_roll_clockwise_extended',
        name: 'Clockwise Extended Roll',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down', 'left', 'up', 'right', 'down', 'left'],
        measures: 2,
        tags: ['roll', 'clockwise', 'extended'],
        category: 'roll',
        difficulty: 4,
    },

    // Counter-clockwise rolls
    {
        id: 'ddr_roll_counterclockwise_full',
        name: 'Counter-Clockwise Full Roll',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'down', 'right'],
        measures: 1,
        tags: ['roll', 'counterclockwise', 'full'],
        category: 'roll',
        difficulty: 3,
    },
    {
        id: 'ddr_roll_counterclockwise_extended',
        name: 'Counter-Clockwise Extended Roll',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'down', 'right', 'up', 'left', 'down', 'right'],
        measures: 2,
        tags: ['roll', 'counterclockwise', 'extended'],
        category: 'roll',
        difficulty: 4,
    },

    // Half rolls (up-down transitions)
    {
        id: 'ddr_roll_half_right',
        name: 'Half Roll Right',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down'],
        measures: 1,
        tags: ['roll', 'half', 'right'],
        category: 'roll',
        difficulty: 3,
    },
    {
        id: 'ddr_roll_half_left',
        name: 'Half Roll Left',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'down'],
        measures: 1,
        tags: ['roll', 'half', 'left'],
        category: 'roll',
        difficulty: 3,
    },

    // Bottom half rolls
    {
        id: 'ddr_roll_bottom_half_right',
        name: 'Bottom Half Roll Right',
        controllerMode: 'ddr',
        keys: ['down', 'right', 'up'],
        measures: 1,
        tags: ['roll', 'half', 'bottom', 'right'],
        category: 'roll',
        difficulty: 3,
    },
    {
        id: 'ddr_roll_bottom_half_left',
        name: 'Bottom Half Roll Left',
        controllerMode: 'ddr',
        keys: ['down', 'left', 'up'],
        measures: 1,
        tags: ['roll', 'half', 'bottom', 'left'],
        category: 'roll',
        difficulty: 3,
    },

    // Triangle rolls (3-button patterns)
    {
        id: 'ddr_roll_triangle_up',
        name: 'Triangle Roll Up',
        controllerMode: 'ddr',
        keys: ['left', 'up', 'right'],
        measures: 1,
        tags: ['roll', 'triangle', 'top'],
        category: 'roll',
        difficulty: 3,
    },
    {
        id: 'ddr_roll_triangle_down',
        name: 'Triangle Roll Down',
        controllerMode: 'ddr',
        keys: ['left', 'down', 'right'],
        measures: 1,
        tags: ['roll', 'triangle', 'bottom'],
        category: 'roll',
        difficulty: 3,
    },
];

/**
 * DDR Stream Patterns
 *
 * Repeated directional patterns for sustained rhythm sections.
 * Common in faster songs and higher difficulties.
 */
const DDR_STREAM_PATTERNS: ButtonPattern<DDRButton>[] = [
    // Vertical streams
    {
        id: 'ddr_stream_vertical_8',
        name: 'Vertical Stream 8',
        controllerMode: 'ddr',
        keys: ['up', 'down', 'up', 'down', 'up', 'down', 'up', 'down'],
        measures: 2,
        tags: ['stream', 'vertical', 'fast'],
        category: 'stream',
        difficulty: 5,
    },
    {
        id: 'ddr_stream_vertical_16',
        name: 'Vertical Stream 16',
        controllerMode: 'ddr',
        keys: [
            'up', 'down', 'up', 'down', 'up', 'down', 'up', 'down',
            'up', 'down', 'up', 'down', 'up', 'down', 'up', 'down',
        ],
        measures: 4,
        tags: ['stream', 'vertical', 'extended'],
        category: 'stream',
        difficulty: 7,
    },

    // Horizontal streams
    {
        id: 'ddr_stream_horizontal_8',
        name: 'Horizontal Stream 8',
        controllerMode: 'ddr',
        keys: ['left', 'right', 'left', 'right', 'left', 'right', 'left', 'right'],
        measures: 2,
        tags: ['stream', 'horizontal', 'fast'],
        category: 'stream',
        difficulty: 5,
    },

    // Diagonal streams
    {
        id: 'ddr_stream_diagonal_1',
        name: 'Diagonal Stream 1',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'up', 'right', 'up', 'right', 'up', 'right'],
        measures: 2,
        tags: ['stream', 'diagonal'],
        category: 'stream',
        difficulty: 5,
    },
    {
        id: 'ddr_stream_diagonal_2',
        name: 'Diagonal Stream 2',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'up', 'left', 'up', 'left', 'up', 'left'],
        measures: 2,
        tags: ['stream', 'diagonal'],
        category: 'stream',
        difficulty: 5,
    },
    {
        id: 'ddr_stream_diagonal_3',
        name: 'Diagonal Stream 3',
        controllerMode: 'ddr',
        keys: ['down', 'right', 'down', 'right', 'down', 'right', 'down', 'right'],
        measures: 2,
        tags: ['stream', 'diagonal'],
        category: 'stream',
        difficulty: 5,
    },
    {
        id: 'ddr_stream_diagonal_4',
        name: 'Diagonal Stream 4',
        controllerMode: 'ddr',
        keys: ['down', 'left', 'down', 'left', 'down', 'left', 'down', 'left'],
        measures: 2,
        tags: ['stream', 'diagonal'],
        category: 'stream',
        difficulty: 5,
    },

    // Mixed streams
    {
        id: 'ddr_stream_mixed_box',
        name: 'Box Stream',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down', 'left', 'up', 'right', 'down', 'left'],
        measures: 2,
        tags: ['stream', 'box', 'circular'],
        category: 'stream',
        difficulty: 6,
    },
    {
        id: 'ddr_stream_mixed_zigzag',
        name: 'Zigzag Stream',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'down', 'right', 'up', 'left', 'down', 'right'],
        measures: 2,
        tags: ['stream', 'zigzag'],
        category: 'stream',
        difficulty: 6,
    },
];

/**
 * DDR Jump Patterns
 *
 * Non-adjacent key patterns that require larger movements.
 * Used for emphasis on strong beats or dramatic moments.
 */
const DDR_JUMP_PATTERNS: ButtonPattern<DDRButton>[] = [
    // Opposite jumps (maximum distance)
    {
        id: 'ddr_jump_opposite_vertical',
        name: 'Opposite Jump Vertical',
        controllerMode: 'ddr',
        keys: ['up', 'down', 'up', 'down'],
        measures: 1,
        tags: ['jump', 'opposite', 'vertical'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'ddr_jump_opposite_horizontal',
        name: 'Opposite Jump Horizontal',
        controllerMode: 'ddr',
        keys: ['left', 'right', 'left', 'right'],
        measures: 1,
        tags: ['jump', 'opposite', 'horizontal'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'ddr_jump_diagonal_1',
        name: 'Diagonal Jump 1',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'up', 'left'],
        measures: 1,
        tags: ['jump', 'diagonal'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'ddr_jump_diagonal_2',
        name: 'Diagonal Jump 2',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'up', 'right'],
        measures: 1,
        tags: ['jump', 'diagonal'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'ddr_jump_diagonal_3',
        name: 'Diagonal Jump 3',
        controllerMode: 'ddr',
        keys: ['down', 'left', 'down', 'left'],
        measures: 1,
        tags: ['jump', 'diagonal'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'ddr_jump_diagonal_4',
        name: 'Diagonal Jump 4',
        controllerMode: 'ddr',
        keys: ['down', 'right', 'down', 'right'],
        measures: 1,
        tags: ['jump', 'diagonal'],
        category: 'jump',
        difficulty: 4,
    },

    // Cross jumps
    {
        id: 'ddr_jump_cross_pattern',
        name: 'Cross Pattern',
        controllerMode: 'ddr',
        keys: ['up', 'left', 'down', 'right'],
        measures: 1,
        tags: ['jump', 'cross'],
        category: 'jump',
        difficulty: 5,
    },
    {
        id: 'ddr_jump_x_pattern',
        name: 'X Pattern',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down', 'left'],
        measures: 1,
        tags: ['jump', 'x'],
        category: 'jump',
        difficulty: 5,
    },

    // Leap patterns (big movements)
    {
        id: 'ddr_jump_leap_sequence',
        name: 'Leap Sequence',
        controllerMode: 'ddr',
        keys: ['up', 'down', 'left', 'right', 'up', 'down'],
        measures: 2,
        tags: ['jump', 'leap', 'sequence'],
        category: 'jump',
        difficulty: 6,
    },
    {
        id: 'ddr_jump_corner_to_corner',
        name: 'Corner to Corner',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down', 'left', 'up', 'right'],
        measures: 2,
        tags: ['jump', 'corner'],
        category: 'jump',
        difficulty: 6,
    },
];

/**
 * DDR Transition Patterns
 *
 * Patterns that bridge between sections, useful for fills and transitions.
 */
const DDR_TRANSITION_PATTERNS: ButtonPattern<DDRButton>[] = [
    // Build-up transitions
    {
        id: 'ddr_transition_build_up',
        name: 'Build Up',
        controllerMode: 'ddr',
        keys: ['left', 'left', 'up', 'up', 'right', 'right'],
        measures: 2,
        tags: ['transition', 'build-up', 'intensity'],
        category: 'transition',
        difficulty: 4,
    },
    {
        id: 'ddr_transition_wind_down',
        name: 'Wind Down',
        controllerMode: 'ddr',
        keys: ['right', 'right', 'up', 'up', 'left', 'left'],
        measures: 2,
        tags: ['transition', 'wind-down'],
        category: 'transition',
        difficulty: 4,
    },

    // Fill patterns
    {
        id: 'ddr_transition_fill_4',
        name: 'Fill 4 Count',
        controllerMode: 'ddr',
        keys: ['up', 'right', 'down', 'left'],
        measures: 1,
        tags: ['transition', 'fill'],
        category: 'transition',
        difficulty: 3,
    },
    {
        id: 'ddr_transition_fill_8',
        name: 'Fill 8 Count',
        controllerMode: 'ddr',
        keys: ['up', 'up', 'right', 'right', 'down', 'down', 'left', 'left'],
        measures: 2,
        tags: ['transition', 'fill', 'extended'],
        category: 'transition',
        difficulty: 4,
    },
];

// =============================================================================
// GUITAR HERO PATTERNS
// =============================================================================

/**
 * Guitar Hero Basic Patterns
 *
 * Simple ascending and descending runs that follow the fretboard metaphor.
 */
const GUITAR_HERO_BASIC_PATTERNS: ButtonPattern<GuitarHeroButton>[] = [
    // Single fret patterns
    {
        id: 'gh_basic_single_1',
        name: 'Single Fret 1',
        controllerMode: 'guitar_hero',
        keys: [1],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'gh_basic_single_2',
        name: 'Single Fret 2',
        controllerMode: 'guitar_hero',
        keys: [2],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'gh_basic_single_3',
        name: 'Single Fret 3',
        controllerMode: 'guitar_hero',
        keys: [3],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'gh_basic_single_4',
        name: 'Single Fret 4',
        controllerMode: 'guitar_hero',
        keys: [4],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },
    {
        id: 'gh_basic_single_5',
        name: 'Single Fret 5',
        controllerMode: 'guitar_hero',
        keys: [5],
        measures: 1,
        tags: ['basic', 'single', 'beginner'],
        category: 'basic',
        difficulty: 1,
    },

    // Ascending runs
    {
        id: 'gh_basic_ascending_full',
        name: 'Ascending Full Run',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3, 4, 5],
        measures: 1,
        tags: ['basic', 'ascending', 'full'],
        category: 'basic',
        difficulty: 3,
    },
    {
        id: 'gh_basic_ascending_quad',
        name: 'Ascending Quad',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3, 4],
        measures: 1,
        tags: ['basic', 'ascending'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_ascending_tri_low',
        name: 'Ascending Tri Low',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3],
        measures: 1,
        tags: ['basic', 'ascending', 'tri'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_ascending_tri_mid',
        name: 'Ascending Tri Mid',
        controllerMode: 'guitar_hero',
        keys: [2, 3, 4],
        measures: 1,
        tags: ['basic', 'ascending', 'tri'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_ascending_tri_high',
        name: 'Ascending Tri High',
        controllerMode: 'guitar_hero',
        keys: [3, 4, 5],
        measures: 1,
        tags: ['basic', 'ascending', 'tri'],
        category: 'basic',
        difficulty: 2,
    },

    // Descending runs
    {
        id: 'gh_basic_descending_full',
        name: 'Descending Full Run',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 3, 2, 1],
        measures: 1,
        tags: ['basic', 'descending', 'full'],
        category: 'basic',
        difficulty: 3,
    },
    {
        id: 'gh_basic_descending_quad',
        name: 'Descending Quad',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 3, 2],
        measures: 1,
        tags: ['basic', 'descending'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_descending_tri_high',
        name: 'Descending Tri High',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 3],
        measures: 1,
        tags: ['basic', 'descending', 'tri'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_descending_tri_mid',
        name: 'Descending Tri Mid',
        controllerMode: 'guitar_hero',
        keys: [4, 3, 2],
        measures: 1,
        tags: ['basic', 'descending', 'tri'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_descending_tri_low',
        name: 'Descending Tri Low',
        controllerMode: 'guitar_hero',
        keys: [3, 2, 1],
        measures: 1,
        tags: ['basic', 'descending', 'tri'],
        category: 'basic',
        difficulty: 2,
    },

    // Step patterns
    {
        id: 'gh_basic_step_up',
        name: 'Step Up',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3, 4],
        measures: 1,
        tags: ['basic', 'step', 'up'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_basic_step_down',
        name: 'Step Down',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 3, 2],
        measures: 1,
        tags: ['basic', 'step', 'down'],
        category: 'basic',
        difficulty: 2,
    },
];

/**
 * Guitar Hero Alternating Patterns
 *
 * Patterns that alternate between two or more frets.
 */
const GUITAR_HERO_ALTERNATING_PATTERNS: ButtonPattern<GuitarHeroButton>[] = [
    // Two-fret alternations
    {
        id: 'gh_alternating_1_3',
        name: 'Alternating 1-3',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 1, 3],
        measures: 1,
        tags: ['alternating', 'skip'],
        category: 'basic',
        difficulty: 3,
    },
    {
        id: 'gh_alternating_2_4',
        name: 'Alternating 2-4',
        controllerMode: 'guitar_hero',
        keys: [2, 4, 2, 4],
        measures: 1,
        tags: ['alternating', 'skip'],
        category: 'basic',
        difficulty: 3,
    },
    {
        id: 'gh_alternating_3_5',
        name: 'Alternating 3-5',
        controllerMode: 'guitar_hero',
        keys: [3, 5, 3, 5],
        measures: 1,
        tags: ['alternating', 'skip'],
        category: 'basic',
        difficulty: 3,
    },
    {
        id: 'gh_alternating_1_2',
        name: 'Alternating 1-2',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 1, 2],
        measures: 1,
        tags: ['alternating', 'adjacent'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_alternating_2_3',
        name: 'Alternating 2-3',
        controllerMode: 'guitar_hero',
        keys: [2, 3, 2, 3],
        measures: 1,
        tags: ['alternating', 'adjacent'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_alternating_3_4',
        name: 'Alternating 3-4',
        controllerMode: 'guitar_hero',
        keys: [3, 4, 3, 4],
        measures: 1,
        tags: ['alternating', 'adjacent'],
        category: 'basic',
        difficulty: 2,
    },
    {
        id: 'gh_alternating_4_5',
        name: 'Alternating 4-5',
        controllerMode: 'guitar_hero',
        keys: [4, 5, 4, 5],
        measures: 1,
        tags: ['alternating', 'adjacent'],
        category: 'basic',
        difficulty: 2,
    },

    // Three-fret alternations
    {
        id: 'gh_alternating_tri_1_3_5',
        name: 'Alternating 1-3-5',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 5, 3],
        measures: 1,
        tags: ['alternating', 'tri', 'wide'],
        category: 'basic',
        difficulty: 4,
    },
    {
        id: 'gh_alternating_tri_1_2_3',
        name: 'Alternating 1-2-3',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3, 2],
        measures: 1,
        tags: ['alternating', 'tri', 'tight'],
        category: 'basic',
        difficulty: 3,
    },
    {
        id: 'gh_alternating_tri_3_4_5',
        name: 'Alternating 3-4-5',
        controllerMode: 'guitar_hero',
        keys: [3, 4, 5, 4],
        measures: 1,
        tags: ['alternating', 'tri', 'tight'],
        category: 'basic',
        difficulty: 3,
    },

    // Extended alternations
    {
        id: 'gh_alternating_extended_1_3',
        name: 'Extended Alternating 1-3',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 1, 3, 1, 3, 1, 3],
        measures: 2,
        tags: ['alternating', 'extended'],
        category: 'basic',
        difficulty: 4,
    },
    {
        id: 'gh_alternating_extended_2_4',
        name: 'Extended Alternating 2-4',
        controllerMode: 'guitar_hero',
        keys: [2, 4, 2, 4, 2, 4, 2, 4],
        measures: 2,
        tags: ['alternating', 'extended'],
        category: 'basic',
        difficulty: 4,
    },
];

/**
 * Guitar Hero Chord Patterns
 *
 * Power chord shapes and multi-fret patterns that simulate chord playing.
 */
const GUITAR_HERO_CHORD_PATTERNS: ButtonPattern<GuitarHeroButton>[] = [
    // Power chord shapes (1-3-5 and variations)
    {
        id: 'gh_chord_power_full',
        name: 'Power Chord Full',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 5],
        measures: 1,
        tags: ['chord', 'power', 'full'],
        category: 'chord',
        difficulty: 4,
    },
    {
        id: 'gh_chord_power_low',
        name: 'Power Chord Low',
        controllerMode: 'guitar_hero',
        keys: [1, 3],
        measures: 1,
        tags: ['chord', 'power', 'low'],
        category: 'chord',
        difficulty: 3,
    },
    {
        id: 'gh_chord_power_mid',
        name: 'Power Chord Mid',
        controllerMode: 'guitar_hero',
        keys: [2, 4],
        measures: 1,
        tags: ['chord', 'power', 'mid'],
        category: 'chord',
        difficulty: 3,
    },
    {
        id: 'gh_chord_power_high',
        name: 'Power Chord High',
        controllerMode: 'guitar_hero',
        keys: [3, 5],
        measures: 1,
        tags: ['chord', 'power', 'high'],
        category: 'chord',
        difficulty: 3,
    },

    // Triad patterns
    {
        id: 'gh_chord_triad_low',
        name: 'Triad Low',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3],
        measures: 1,
        tags: ['chord', 'triad', 'low'],
        category: 'chord',
        difficulty: 4,
    },
    {
        id: 'gh_chord_triad_mid',
        name: 'Triad Mid',
        controllerMode: 'guitar_hero',
        keys: [2, 3, 4],
        measures: 1,
        tags: ['chord', 'triad', 'mid'],
        category: 'chord',
        difficulty: 4,
    },
    {
        id: 'gh_chord_triad_high',
        name: 'Triad High',
        controllerMode: 'guitar_hero',
        keys: [3, 4, 5],
        measures: 1,
        tags: ['chord', 'triad', 'high'],
        category: 'chord',
        difficulty: 4,
    },

    // Chord progressions
    {
        id: 'gh_chord_progression_1',
        name: 'Chord Progression 1',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 2, 4, 3, 5],
        measures: 2,
        tags: ['chord', 'progression'],
        category: 'chord',
        difficulty: 5,
    },
    {
        id: 'gh_chord_progression_2',
        name: 'Chord Progression 2',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3, 4, 5, 4, 3, 2],
        measures: 2,
        tags: ['chord', 'progression', 'wave'],
        category: 'chord',
        difficulty: 5,
    },
];

/**
 * Guitar Hero Jump Patterns
 *
 * Large interval patterns requiring position shifts.
 */
const GUITAR_HERO_JUMP_PATTERNS: ButtonPattern<GuitarHeroButton>[] = [
    // Wide jumps
    {
        id: 'gh_jump_wide_1_4',
        name: 'Wide Jump 1-4',
        controllerMode: 'guitar_hero',
        keys: [1, 4, 1, 4],
        measures: 1,
        tags: ['jump', 'wide'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'gh_jump_wide_2_5',
        name: 'Wide Jump 2-5',
        controllerMode: 'guitar_hero',
        keys: [2, 5, 2, 5],
        measures: 1,
        tags: ['jump', 'wide'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'gh_jump_wide_1_5',
        name: 'Wide Jump 1-5',
        controllerMode: 'guitar_hero',
        keys: [1, 5, 1, 5],
        measures: 1,
        tags: ['jump', 'widest'],
        category: 'jump',
        difficulty: 5,
    },

    // Position shifts
    {
        id: 'gh_jump_shift_up',
        name: 'Position Shift Up',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 4, 5],
        measures: 1,
        tags: ['jump', 'shift', 'up'],
        category: 'jump',
        difficulty: 4,
    },
    {
        id: 'gh_jump_shift_down',
        name: 'Position Shift Down',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 2, 1],
        measures: 1,
        tags: ['jump', 'shift', 'down'],
        category: 'jump',
        difficulty: 4,
    },

    // Leap patterns
    {
        id: 'gh_jump_leap_sequence',
        name: 'Leap Sequence',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 5, 3, 1, 3, 5],
        measures: 2,
        tags: ['jump', 'leap', 'sequence'],
        category: 'jump',
        difficulty: 5,
    },
    {
        id: 'gh_jump_bounce',
        name: 'Bounce Pattern',
        controllerMode: 'guitar_hero',
        keys: [1, 5, 2, 4, 3],
        measures: 1,
        tags: ['jump', 'bounce'],
        category: 'jump',
        difficulty: 5,
    },

    // Stretch patterns
    {
        id: 'gh_jump_stretch_1_4_5',
        name: 'Stretch 1-4-5',
        controllerMode: 'guitar_hero',
        keys: [1, 4, 5, 4],
        measures: 1,
        tags: ['jump', 'stretch'],
        category: 'jump',
        difficulty: 5,
    },
    {
        id: 'gh_jump_stretch_1_2_5',
        name: 'Stretch 1-2-5',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 5, 2],
        measures: 1,
        tags: ['jump', 'stretch'],
        category: 'jump',
        difficulty: 5,
    },
];

/**
 * Guitar Hero Transition Patterns
 *
 * Patterns for fills and section transitions.
 */
const GUITAR_HERO_TRANSITION_PATTERNS: ButtonPattern<GuitarHeroButton>[] = [
    // Build-up transitions
    {
        id: 'gh_transition_build_up',
        name: 'Build Up',
        controllerMode: 'guitar_hero',
        keys: [1, 1, 2, 2, 3, 3, 4, 4, 5],
        measures: 2,
        tags: ['transition', 'build-up'],
        category: 'transition',
        difficulty: 4,
    },
    {
        id: 'gh_transition_wind_down',
        name: 'Wind Down',
        controllerMode: 'guitar_hero',
        keys: [5, 5, 4, 4, 3, 3, 2, 2, 1],
        measures: 2,
        tags: ['transition', 'wind-down'],
        category: 'transition',
        difficulty: 4,
    },

    // Fill patterns
    {
        id: 'gh_transition_fill_ascending',
        name: 'Fill Ascending',
        controllerMode: 'guitar_hero',
        keys: [1, 2, 3, 4, 5],
        measures: 1,
        tags: ['transition', 'fill', 'ascending'],
        category: 'transition',
        difficulty: 3,
    },
    {
        id: 'gh_transition_fill_descending',
        name: 'Fill Descending',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 3, 2, 1],
        measures: 1,
        tags: ['transition', 'fill', 'descending'],
        category: 'transition',
        difficulty: 3,
    },
    {
        id: 'gh_transition_fill_wave',
        name: 'Fill Wave',
        controllerMode: 'guitar_hero',
        keys: [1, 3, 5, 3, 1],
        measures: 1,
        tags: ['transition', 'fill', 'wave'],
        category: 'transition',
        difficulty: 4,
    },

    // End section patterns
    {
        id: 'gh_transition_end_resolve',
        name: 'End Resolve',
        controllerMode: 'guitar_hero',
        keys: [5, 4, 3, 2, 1, 1],
        measures: 2,
        tags: ['transition', 'resolve', 'end'],
        category: 'transition',
        difficulty: 3,
    },
];

// =============================================================================
// PATTERN LIBRARY CONSTRUCTION
// =============================================================================

/**
 * All DDR patterns combined.
 */
const ALL_DDR_PATTERNS: ButtonPattern<DDRButton>[] = [
    ...DDR_BASIC_PATTERNS,
    ...DDR_ROLL_PATTERNS,
    ...DDR_STREAM_PATTERNS,
    ...DDR_JUMP_PATTERNS,
    ...DDR_TRANSITION_PATTERNS,
];

/**
 * All Guitar Hero patterns combined.
 */
const ALL_GUITAR_HERO_PATTERNS: ButtonPattern<GuitarHeroButton>[] = [
    ...GUITAR_HERO_BASIC_PATTERNS,
    ...GUITAR_HERO_ALTERNATING_PATTERNS,
    ...GUITAR_HERO_CHORD_PATTERNS,
    ...GUITAR_HERO_JUMP_PATTERNS,
    ...GUITAR_HERO_TRANSITION_PATTERNS,
];

/**
 * Build a pattern library from a list of patterns.
 *
 * @param controllerMode - The controller mode ('ddr' or 'guitar_hero')
 * @param patterns - Array of patterns to include in the library
 * @returns A complete pattern library with indices
 */
function buildPatternLibrary<T extends DDRButton | GuitarHeroButton>(
    controllerMode: 'ddr' | 'guitar_hero',
    patterns: ButtonPattern<T>[]
): ButtonPatternLibrary<T> {
    // Build by category index
    const byCategory = new Map<ButtonPatternCategory, ButtonPattern<T>[]>();
    const categories: ButtonPatternCategory[] = ['basic', 'roll', 'stream', 'jump', 'chord', 'transition'];

    for (const category of categories) {
        const categoryPatterns = patterns.filter(p => p.category === category);
        if (categoryPatterns.length > 0) {
            byCategory.set(category, categoryPatterns);
        }
    }

    // Build by difficulty index (1-10)
    const byDifficulty = new Map<number, ButtonPattern<T>[]>();
    for (let diff = 1; diff <= 10; diff++) {
        const diffPatterns = patterns.filter(p => p.difficulty === diff);
        if (diffPatterns.length > 0) {
            byDifficulty.set(diff, diffPatterns);
        }
    }

    return {
        controllerMode,
        patterns,
        byCategory,
        byDifficulty,
    };
}

// =============================================================================
// EXPORTED PATTERN LIBRARIES
// =============================================================================

/**
 * Complete DDR pattern library.
 * Contains all DDR patterns organized by category and difficulty.
 */
export const DDR_PATTERN_LIBRARY: DDRPatternLibrary = buildPatternLibrary('ddr', ALL_DDR_PATTERNS);

/**
 * Complete Guitar Hero pattern library.
 * Contains all Guitar Hero patterns organized by category and difficulty.
 */
export const GUITAR_HERO_PATTERN_LIBRARY: GuitarHeroPatternLibrary = buildPatternLibrary(
    'guitar_hero',
    ALL_GUITAR_HERO_PATTERNS
);

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a pattern library by controller mode.
 *
 * @param mode - The controller mode
 * @returns The appropriate pattern library
 */
export function getPatternLibrary(mode: 'ddr'): DDRPatternLibrary;
export function getPatternLibrary(mode: 'guitar_hero'): GuitarHeroPatternLibrary;
export function getPatternLibrary(mode: 'ddr' | 'guitar_hero'): DDRPatternLibrary | GuitarHeroPatternLibrary {
    return mode === 'ddr' ? DDR_PATTERN_LIBRARY : GUITAR_HERO_PATTERN_LIBRARY;
}

/**
 * Get all patterns of a specific category from a library.
 *
 * @param library - The pattern library
 * @param category - The category to filter by
 * @returns Array of patterns in that category
 */
export function getPatternsByCategory<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>,
    category: ButtonPatternCategory
): ButtonPattern<T>[] {
    return library.byCategory.get(category) ?? [];
}

/**
 * Get all patterns within a difficulty range.
 *
 * @param library - The pattern library
 * @param minDifficulty - Minimum difficulty (inclusive)
 * @param maxDifficulty - Maximum difficulty (inclusive)
 * @returns Array of patterns in the difficulty range
 */
export function getPatternsByDifficulty<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>,
    minDifficulty: number = 1,
    maxDifficulty: number = 10
): ButtonPattern<T>[] {
    const result: ButtonPattern<T>[] = [];
    for (let diff = minDifficulty; diff <= maxDifficulty; diff++) {
        const patterns = library.byDifficulty.get(diff);
        if (patterns) {
            result.push(...patterns);
        }
    }
    return result;
}

/**
 * Get patterns that match all required tags.
 *
 * @param library - The pattern library
 * @param requiredTags - Tags that must all be present
 * @returns Array of patterns matching all tags
 */
export function getPatternsByTags<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>,
    requiredTags: string[]
): ButtonPattern<T>[] {
    return library.patterns.filter(pattern =>
        requiredTags.every(tag => pattern.tags.includes(tag))
    );
}

/**
 * Get patterns that have a specific key count.
 *
 * @param library - The pattern library
 * @param keyCount - The number of keys in the pattern
 * @returns Array of patterns with that key count
 */
export function getPatternsByKeyCount<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>,
    keyCount: number
): ButtonPattern<T>[] {
    return library.patterns.filter(pattern => pattern.keys.length === keyCount);
}

/**
 * Get a random pattern from a library.
 *
 * @param library - The pattern library
 * @param filter - Optional filter function
 * @returns A random pattern, or undefined if no patterns match
 */
export function getRandomPattern<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>,
    filter?: (pattern: ButtonPattern<T>) => boolean
): ButtonPattern<T> | undefined {
    const patterns = filter ? library.patterns.filter(filter) : library.patterns;
    if (patterns.length === 0) return undefined;
    const index = Math.floor(Math.random() * patterns.length);
    return patterns[index];
}

/**
 * Get pattern by ID.
 *
 * @param library - The pattern library
 * @param id - The pattern ID to find
 * @returns The pattern, or undefined if not found
 */
export function getPatternById<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>,
    id: string
): ButtonPattern<T> | undefined {
    return library.patterns.find(pattern => pattern.id === id);
}

/**
 * Get statistics about a pattern library.
 *
 * @param library - The pattern library
 * @returns Statistics object
 */
export function getPatternLibraryStats<T extends DDRButton | GuitarHeroButton>(
    library: ButtonPatternLibrary<T>
): {
    totalPatterns: number;
    byCategory: Record<ButtonPatternCategory, number>;
    byDifficulty: Record<number, number>;
    averageKeyCount: number;
    minKeys: number;
    maxKeys: number;
} {
    const byCategory: Record<ButtonPatternCategory, number> = {
        basic: 0,
        roll: 0,
        stream: 0,
        jump: 0,
        chord: 0,
        transition: 0,
    };

    const byDifficulty: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) {
        byDifficulty[i] = 0;
    }

    let totalKeys = 0;
    let minKeys = Infinity;
    let maxKeys = 0;

    for (const pattern of library.patterns) {
        byCategory[pattern.category]++;
        byDifficulty[pattern.difficulty]++;
        totalKeys += pattern.keys.length;
        minKeys = Math.min(minKeys, pattern.keys.length);
        maxKeys = Math.max(maxKeys, pattern.keys.length);
    }

    return {
        totalPatterns: library.patterns.length,
        byCategory,
        byDifficulty,
        averageKeyCount: library.patterns.length > 0 ? totalKeys / library.patterns.length : 0,
        minKeys: minKeys === Infinity ? 0 : minKeys,
        maxKeys,
    };
}
