/**
 * WeightedSelector - Weighted selection utility for extensibility system
 *
 * Provides flexible weighted random selection with support for:
 * - Relative mode: Custom weights added to default weights
 * - Absolute mode: Custom weights replace default distribution
 * - Probability calculation for debugging/analysis
 * - Multiple item selection (for features, etc.)
 *
 * @module extensions/WeightedSelector
 */

import type { SeededRNG } from '../../utils/random.js';

/**
 * Selection mode for weighted selection
 */
export type SelectionMode = 'relative' | 'absolute' | 'default' | 'replace';

/**
 * WeightedSelector - Generic weighted selection utility
 *
 * Handles weighted random selection with multiple modes:
 * - 'relative': Use provided weights as-is, normalize to probabilities
 * - 'absolute': All non-specified items get weight 1, then normalize
 * - 'default': Equal weight for all items
 *
 * @template T The type of items being selected
 */
export class WeightedSelector<T = any> {
    /**
     * Select a single item based on weights
     *
     * @param items - Array of items to select from
     * @param weights - Record of item name to weight multiplier
     * @param rng - Seeded random number generator
     * @param mode - Selection mode ('relative', 'absolute', or 'default')
     * @returns The selected item
     *
     * @example
     * ```typescript
     * // Relative mode: Make dragons twice as common
     * const weights = { 'Dragon': 2, 'Goblin': 1 };
     * const selected = WeightedSelector.select(monsters, weights, rng, 'relative');
     * ```
     *
     * @example
     * ```typescript
     * // Absolute mode: Only specified items can spawn
     * const weights = { 'Sword': 5, 'Axe': 3 };
     * const selected = WeightedSelector.select(weapons, weights, rng, 'absolute');
     * ```
     */
    static select<T>(
        items: T[],
        weights: Record<string, number>,
        rng: SeededRNG,
        mode: SelectionMode = 'relative'
    ): T {
        if (items.length === 0) {
            throw new Error('Cannot select from empty items array');
        }

        const finalWeights = this.getFinalWeights(items, weights, mode);

        // Convert to choices format for SeededRNG.weightedChoice
        const choices: [T, number][] = items.map(item => {
            const itemName = this.getItemName(item);
            return [item, finalWeights[itemName] || 1];
        });

        return rng.weightedChoice(choices);
    }

    /**
     * Select multiple unique items based on weights
     *
     * Useful for selecting facial features, spells, etc. where the same
     * item shouldn't be selected twice.
     *
     * @param items - Array of items to select from
     * @param weights - Record of item name to weight multiplier
     * @param rng - Seeded random number generator
     * @param count - Number of items to select
     * @param mode - Selection mode ('relative', 'absolute', or 'default')
     * @returns Array of selected items (no duplicates)
     *
     * @example
     * ```typescript
     * // Select 1-3 facial features with weights
     * const numFeatures = rng.randomInt(1, 4);
     * const features = WeightedSelector.selectMultiple(
     *     allFeatures,
     *     featureWeights,
     *     rng,
     *     numFeatures,
     *     'relative'
     * );
     * ```
     */
    static selectMultiple<T>(
        items: T[],
        weights: Record<string, number>,
        rng: SeededRNG,
        count: number,
        mode: SelectionMode = 'relative'
    ): T[] {
        if (items.length === 0) {
            return [];
        }

        if (count <= 0) {
            return [];
        }

        if (count >= items.length) {
            // Shuffle all items if we want more than available
            return rng.shuffle(items);
        }

        const selected: T[] = [];
        const availableItems = [...items];
        const availableWeights = { ...weights };

        for (let i = 0; i < count && availableItems.length > 0; i++) {
            const item = this.select(availableItems, availableWeights, rng, mode);
            selected.push(item);

            // Remove selected item from pool to prevent duplicates
            const index = availableItems.indexOf(item);
            if (index !== -1) {
                const itemName = this.getItemName(item);
                availableItems.splice(index, 1);
                delete availableWeights[itemName];
            }
        }

        return selected;
    }

    /**
     * Get probability distribution for items based on weights
     *
     * Useful for debugging, testing, or displaying spawn rates to users.
     *
     * @param items - Array of items to calculate probabilities for
     * @param weights - Record of item name to weight multiplier
     * @param mode - Selection mode ('relative', 'absolute', or 'default')
     * @returns Record of item name to probability (0-1)
     *
     * @example
     * ```typescript
     * const probabilities = WeightedSelector.getProbabilities(
     *     monsters,
     *     weights,
     *     'relative'
     * );
     * console.log(probabilities);
     * // { 'Goblin': 0.33, 'Orc': 0.33, 'Dragon': 0.66 }
     * ```
     */
    static getProbabilities<T>(
        items: T[],
        weights: Record<string, number>,
        mode: SelectionMode = 'relative'
    ): Record<string, number> {
        if (items.length === 0) {
            return {};
        }

        const finalWeights = this.getFinalWeights(items, weights, mode);
        const totalWeight = Object.values(finalWeights).reduce((sum, w) => sum + w, 0);

        if (totalWeight === 0) {
            // Equal probability if all weights are 0
            const probabilities: Record<string, number> = {};
            for (const item of items) {
                const name = this.getItemName(item);
                probabilities[name] = 1 / items.length;
            }
            return probabilities;
        }

        const probabilities: Record<string, number> = {};
        for (const item of items) {
            const name = this.getItemName(item);
            const weight = finalWeights[name] || 0;
            probabilities[name] = totalWeight > 0 ? weight / totalWeight : 0;
        }

        return probabilities;
    }

    /**
     * Calculate final weights based on mode
     *
     * Internal method that converts user-provided weights and mode
     * into the final weight values used for selection.
     *
     * @param items - Array of items
     * @param weights - User-provided weights
     * @param mode - Selection mode
     * @returns Final weights record
     */
    private static getFinalWeights<T>(
        items: T[],
        weights: Record<string, number>,
        mode: SelectionMode
    ): Record<string, number> {
        const finalWeights: Record<string, number> = {};

        if (mode === 'default') {
            // All items get equal weight (1.0)
            for (const item of items) {
                const name = this.getItemName(item);
                finalWeights[name] = 1.0;
            }
        } else if (mode === 'absolute') {
            // Specified items use their weight, unspecified get weight 1
            for (const item of items) {
                const name = this.getItemName(item);
                finalWeights[name] = weights[name] !== undefined ? weights[name] : 1;
            }
        } else {
            // Relative mode: use weights as provided, default to 1
            for (const item of items) {
                const name = this.getItemName(item);
                finalWeights[name] = weights[name] !== undefined ? weights[name] : 1;
            }
        }

        return finalWeights;
    }

    /**
     * Extract item name from item (for weight lookup)
     *
     * Handles both string items and objects with a 'name' property.
     *
     * @param item - The item to extract name from
     * @returns The item's name (or string value if item is a string)
     */
    private static getItemName<T>(item: T): string {
        if (typeof item === 'string') {
            return item;
        }
        if (item && typeof item === 'object' && 'name' in item) {
            return String((item as any).name);
        }
        // Fallback: use string representation
        return String(item);
    }
}
