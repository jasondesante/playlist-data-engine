/**
 * CR/Level Conversion Utilities
 *
 * Provides bidirectional conversion between Challenge Rating (CR) and character level
 * for enemy generation and encounter balancing.
 *
 * These functions use D&D 5e-style mappings with smooth interpolation for fractional
 * CR values and configurable tuning parameters for game balance adjustments.
 */

/**
 * CR Tuning Configuration
 *
 * Controls how CR and level values are converted and scaled.
 * Allows game balance adjustments without code changes.
 */
export interface CRTuningConfig {
    /**
     * Base multiplier for CR-to-level conversion
     * Default: 1.0 (standard D&D 5e mapping)
     * Higher values make enemies scale faster with CR
     */
    baseMultiplier: number;

    /**
     * Level offset applied after conversion
     * Default: 0 (no offset)
     * Can be used to shift all enemies to be slightly stronger/weaker
     */
    levelOffset: number;

    /**
     * Custom CR/level mappings that override the default calculation
     * Key is CR, value is the exact level to use
     */
    customCurve: Map<number, number>;

    /**
     * Minimum level for any CR
     * Prevents CR 0 from resulting in negative levels
     */
    minLevel: number;

    /**
     * Maximum level cap
     * Default: 20 (standard D&D 5e level cap)
     */
    maxLevel: number;
}

/**
 * Default CR tuning configuration
 *
 * Standard D&D 5e mapping: CR 0 = level 0, CR 1 = level 1, CR 2 = level 2, etc.
 */
export const DEFAULT_CR_TUNING: CRTuningConfig = {
    baseMultiplier: 1.0,
    levelOffset: 0,
    customCurve: new Map<number, number>(),
    minLevel: 0,
    maxLevel: 20
};

/**
 * Convert Challenge Rating to character level
 *
 * Uses D&D 5e-style mapping with smooth interpolation for fractional CRs.
 *
 * Default mapping (with baseMultiplier: 1.0, levelOffset: 0):
 * - CR 0 = level 0
 * - CR 0.125 (1/8) = level 0.125
 * - CR 0.25 (1/4) = level 0.25
 * - CR 0.5 (1/2) = level 0.5
 * - CR 1 = level 1
 * - CR 2 = level 2
 * - CR 10 = level 10
 * - CR 20 = level 20
 *
 * The formula is: level = (CR * baseMultiplier) + levelOffset
 * Custom curve mappings take precedence over the calculated value.
 *
 * @param cr - Challenge Rating (supports decimals like 0.25, 0.5)
 * @param tuning - Optional tuning configuration (defaults to DEFAULT_CR_TUNING)
 * @returns Character level (may be fractional, typically rounded for use)
 *
 * @example
 * ```typescript
 * // Standard conversions
 * crToLevel(0);     // 0
 * crToLevel(0.25);  // 0.25
 * crToLevel(0.5);   // 0.5
 * crToLevel(1);     // 1
 * crToLevel(5);     // 5
 * crToLevel(10);    // 10
 *
 * // With custom tuning for harder enemies
 * const hardMode = { ...DEFAULT_CR_TUNING, baseMultiplier: 1.2 };
 * crToLevel(5, hardMode); // 6 (5 * 1.2)
 *
 * // With custom curve override
 * const customCurve = new Map([[5, 7]]);
 * const customTuning = { ...DEFAULT_CR_TUNING, customCurve };
 * crToLevel(5, customTuning); // 7 (uses custom mapping)
 * ```
 */
export function crToLevel(cr: number, tuning: CRTuningConfig = DEFAULT_CR_TUNING): number {
    // Check for custom curve override first
    if (tuning.customCurve.has(cr)) {
        return tuning.customCurve.get(cr)!;
    }

    // Calculate level using base formula
    let level = (cr * tuning.baseMultiplier) + tuning.levelOffset;

    // Apply min/max bounds
    level = Math.max(tuning.minLevel, Math.min(tuning.maxLevel, level));

    return level;
}

/**
 * Convert character level to Challenge Rating
 *
 * Inverse of crToLevel(). Uses the same tuning parameters to ensure
 * bidirectional consistency.
 *
 * The formula is: CR = (level - levelOffset) / baseMultiplier
 * Custom curve mappings are searched for a matching level first.
 *
 * @param level - Character level (supports decimals)
 * @param tuning - Optional tuning configuration (defaults to DEFAULT_CR_TUNING)
 * @returns Challenge Rating (may be fractional)
 *
 * @example
 * ```typescript
 * // Standard conversions
 * levelToCR(0);     // 0
 * levelToCR(1);     // 1
 * levelToCR(5);     // 5
 * levelToCR(10);    // 10
 *
 * // With custom tuning
 * const hardMode = { ...DEFAULT_CR_TUNING, baseMultiplier: 1.2 };
 * levelToCR(6, hardMode); // 5 (6 / 1.2)
 *
 * // Bidirectional consistency
 * const original = 5;
 * const converted = levelToCR(crToLevel(original)); // 5
 * ```
 */
export function levelToCR(level: number, tuning: CRTuningConfig = DEFAULT_CR_TUNING): number {
    // Check if level matches any custom curve entry
    for (const [cr, customLevel] of tuning.customCurve.entries()) {
        if (Math.abs(customLevel - level) < 0.001) {
            return cr;
        }
    }

    // Calculate CR using inverse formula
    let cr = (level - tuning.levelOffset) / tuning.baseMultiplier;

    // Apply bounds (CR cannot be negative)
    cr = Math.max(0, cr);

    return cr;
}

/**
 * Round a level to the nearest valid character level
 *
 * D&D 5e levels are integers (1-20). This utility rounds fractional levels
 * to the nearest integer, clamping to the valid range.
 *
 * Note: The default minLevel is 1 for standard D&D 5e characters.
 * Pass 0 as minLevel if you want to allow level 0 results.
 *
 * @param level - Level value (may be fractional)
 * @param minLevel - Minimum valid level (default: 1)
 * @param maxLevel - Maximum valid level (default: 20)
 * @returns Rounded integer level
 *
 * @example
 * ```typescript
 * roundLevel(0.5, 1, 20);   // 1
 * roundLevel(1.2, 1, 20);   // 1
 * roundLevel(2.7, 1, 20);   // 3
 * roundLevel(25, 1, 20);    // 20 (capped)
 * roundLevel(0.4, 0, 20);   // 0 (minLevel 0 allows 0)
 * ```
 */
export function roundLevel(level: number, minLevel: number = 1, maxLevel: number = 20): number {
    const rounded = Math.round(level);
    return Math.max(minLevel, Math.min(maxLevel, rounded));
}

/**
 * Round a CR to the nearest valid CR step
 *
 * D&D 5e CRs typically use specific fractional values: 0, 1/8, 1/4, 1/2, 1, 2, 3, etc.
 * This utility rounds to the nearest valid CR step.
 *
 * Valid CR steps: 0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
 *
 * When equidistant between two steps, prefers the higher value (rounds up).
 *
 * @param cr - CR value (may be any decimal)
 * @returns Rounded CR to nearest valid step
 *
 * @example
 * ```typescript
 * roundCR(0.1);   // 0.125 (closest to 1/8)
 * roundCR(0.3);   // 0.25
 * roundCR(1.5);   // 2 (equidistant, rounds up)
 * roundCR(4.4);   // 4
 * ```
 */
export function roundCR(cr: number): number {
    // Standard CR step values
    const CR_STEPS = [
        0,
        0.125,  // 1/8
        0.25,   // 1/4
        0.5,    // 1/2
        ...Array.from({ length: 20 }, (_, i) => i + 1) // 1-20
    ];

    // Find the closest step
    let closest = CR_STEPS[0]!;
    let minDiff = Math.abs(cr - closest);

    for (const step of CR_STEPS) {
        const diff = Math.abs(cr - step);
        // Use <= to prefer higher value when equidistant (later in array)
        if (diff <= minDiff) {
            minDiff = diff;
            closest = step;
        }
    }

    return closest;
}

/**
 * Get level as a formatted string with fractional notation
 *
 * Converts decimal levels to D&D-style notation where applicable.
 * For example, 0.25 becomes "0 (1/4)" for display purposes.
 *
 * @param level - Level value (may be fractional)
 * @returns Formatted level string
 *
 * @example
 * ```typescript
 * formatLevel(0);     // "0"
 * formatLevel(0.125); // "0 (1/8)"
 * formatLevel(0.25);  // "0 (1/4)"
 * formatLevel(0.5);   // "0 (1/2)"
 * formatLevel(1);     // "1"
 * formatLevel(5.5);   // "5.5"
 * ```
 */
export function formatLevel(level: number): string {
    // Check for common fractional values
    const fractions: Record<number, string> = {
        0.125: '1/8',
        0.25: '1/4',
        0.5: '1/2',
        0.75: '3/4'
    };

    const fractional = level % 1;
    const integer = Math.floor(level);

    if (fractional === 0) {
        return integer.toString();
    }

    if (fractions[fractional]) {
        return integer === 0 ? `0 (${fractions[fractional]})` : `${integer} (${fractions[fractional]})`;
    }

    return level.toString();
}

/**
 * Get CR as a formatted string with fractional notation
 *
 * Converts decimal CRs to D&D-style notation.
 * For example, 0.25 becomes "1/4" and 0.125 becomes "1/8".
 *
 * @param cr - CR value (may be fractional)
 * @returns Formatted CR string
 *
 * @example
 * ```typescript
 * formatCR(0);     // "0"
 * formatCR(0.125); // "1/8"
 * formatCR(0.25);  // "1/4"
 * formatCR(0.5);   // "1/2"
 * formatCR(1);     // "1"
 * formatCR(5);     // "5"
 * ```
 */
export function formatCR(cr: number): string {
    // Check for common fractional values
    const fractions: Record<number, string> = {
        0.125: '1/8',
        0.25: '1/4',
        0.5: '1/2',
        0.75: '3/4'
    };

    const integer = Math.floor(cr);
    const fractional = cr % 1;

    if (fractional === 0) {
        return integer.toString();
    }

    if (fractions[fractional]) {
        const fractionStr = fractions[fractional];
        return integer === 0 ? fractionStr : `${integer} ${fractionStr}`;
    }

    return cr.toString();
}

/**
 * Create a custom CR tuning configuration
 *
 * Factory function to create tuning configs with partial overrides.
 * Merges provided options with defaults.
 *
 * @param options - Partial tuning options to override
 * @returns Complete CRTuningConfig
 *
 * @example
 * ```typescript
 * // Harder enemies: CR converts to higher levels
 * const hardMode = createCRTuning({ baseMultiplier: 1.2 });
 *
 * // Softer enemies: CR converts to lower levels
 * const easyMode = createCRTuning({ baseMultiplier: 0.8 });
 *
 * // Custom curve for specific CRs
 * const customCurve = new Map([[10, 12], [20, 25]]);
 * const custom = createCRTuning({ customCurve });
 * ```
 */
export function createCRTuning(options: Partial<CRTuningConfig> = {}): CRTuningConfig {
    return {
        ...DEFAULT_CR_TUNING,
        ...options,
        customCurve: options.customCurve || new Map<number, number>()
    };
}
