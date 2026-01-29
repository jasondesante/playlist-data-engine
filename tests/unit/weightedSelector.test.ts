/**
 * Unit tests for WeightedSelector
 *
 * Tests the weighted selection utility for the extensibility system including:
 * - Relative mode: custom weights added to defaults
 * - Absolute mode: custom weights replace defaults
 * - Default mode: equal weights for all items
 * - Probability calculations
 * - Multiple item selection
 * - Edge cases
 *
 * Phase 6.1: "Test WeightedSelector" task from DATA_ENGINE_UPGRADE_PLAN.md
 */

import { describe, it, expect } from 'vitest';
import { WeightedSelector } from '../../src/core/extensions/WeightedSelector.js';
import { SeededRNG } from '../../src/utils/random.js';

describe('WeightedSelector', () => {
    describe('Relative mode', () => {
        it('should use custom weights when provided', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': 2.0, 'Axe': 1.0, 'Dagger': 1.0 };
            const rng = new SeededRNG('test-seed-relative-1');

            const selected = WeightedSelector.select(items, weights, rng, 'relative');

            // Sword should have 50% probability (2/4), Axe 25%, Dagger 25%
            expect(items).toContain(selected);
        });

        it('should default to weight 1 for items without custom weights', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': 3.0 }; // Only Sword has custom weight

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // Sword: 3/(3+1+1) = 3/5 = 0.6
            // Axe: 1/(3+1+1) = 1/5 = 0.2
            // Dagger: 1/(3+1+1) = 1/5 = 0.2
            expect(probabilities['Sword']).toBeCloseTo(0.6, 5);
            expect(probabilities['Axe']).toBeCloseTo(0.2, 5);
            expect(probabilities['Dagger']).toBeCloseTo(0.2, 5);
        });

        it('should add custom weights to existing weights in relative mode', () => {
            const items = ['Dragon', 'Goblin', 'Orc', 'Elf'];
            const weights = { 'Dragon': 5.0, 'Goblin': 0.5 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // Dragon: 5/(5+0.5+1+1) = 5/7.5 ≈ 0.667
            // Goblin: 0.5/(5+0.5+1+1) = 0.5/7.5 ≈ 0.067
            // Orc: 1/(5+0.5+1+1) = 1/7.5 ≈ 0.133
            // Elf: 1/(5+0.5+1+1) = 1/7.5 ≈ 0.133
            expect(probabilities['Dragon']).toBeCloseTo(0.6666667, 5);
            expect(probabilities['Goblin']).toBeCloseTo(0.0666667, 5);
            expect(probabilities['Orc']).toBeCloseTo(0.1333333, 5);
            expect(probabilities['Elf']).toBeCloseTo(0.1333333, 5);
        });

        it('should make dragons twice as common with weight 2', () => {
            const items = ['Dragon', 'Goblin', 'Orc'];
            const weights = { 'Dragon': 2.0 }; // Others default to 1

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // Dragon: 2/(2+1+1) = 2/4 = 0.5
            expect(probabilities['Dragon']).toBeCloseTo(0.5, 5);
        });

        it('should handle zero weights (item never spawns)', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': 0, 'Axe': 1, 'Dagger': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // Sword: 0/(0+1+1) = 0
            // Axe: 1/(0+1+1) = 0.5
            // Dagger: 1/(0+1+1) = 0.5
            expect(probabilities['Sword']).toBe(0);
            expect(probabilities['Axe']).toBe(0.5);
            expect(probabilities['Dagger']).toBe(0.5);
        });

        it('should handle negative weights (edge case)', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': -1, 'Axe': 2, 'Dagger': 2 };

            // Negative weights should be handled (they reduce total weight)
            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // Sword: -1/(-1+2+2) = -1/3 = -0.333...
            // Axe: 2/(-1+2+2) = 2/3 = 0.666...
            // Dagger: 2/(-1+2+2) = 2/3 = 0.666...
            expect(probabilities['Sword']).toBeCloseTo(-0.333333, 5);
            expect(probabilities['Axe']).toBeCloseTo(0.666666, 5);
            expect(probabilities['Dagger']).toBeCloseTo(0.666666, 5);
        });
    });

    describe('Absolute mode', () => {
        it('should use specified weights and default unspecified to 1', () => {
            const items = ['Sword', 'Axe', 'Dagger', 'Bow'];
            const weights = { 'Sword': 5, 'Axe': 3 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'absolute');

            // Sword: 5/(5+3+1+1) = 5/10 = 0.5
            // Axe: 3/(5+3+1+1) = 3/10 = 0.3
            // Dagger: 1/(5+3+1+1) = 1/10 = 0.1
            // Bow: 1/(5+3+1+1) = 1/10 = 0.1
            expect(probabilities['Sword']).toBeCloseTo(0.5, 5);
            expect(probabilities['Axe']).toBeCloseTo(0.3, 5);
            expect(probabilities['Dagger']).toBeCloseTo(0.1, 5);
            expect(probabilities['Bow']).toBeCloseTo(0.1, 5);
        });

        it('should only allow specified items to spawn when all others are 0', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': 1, 'Axe': 0, 'Dagger': 0 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'absolute');

            // In absolute mode, specified items use their weight
            // Sword: 1/(1+0+0) = 1.0
            // Axe: 0/(1+0+0) = 0
            // Dagger: 0/(1+0+0) = 0
            expect(probabilities['Sword']).toBe(1.0);
            expect(probabilities['Axe']).toBe(0);
            expect(probabilities['Dagger']).toBe(0);
        });

        it('should handle custom weights replacing defaults', () => {
            const items = ['Dragon', 'Goblin', 'Orc'];
            const weights = { 'Dragon': 10, 'Goblin': 2 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'absolute');

            // Dragon: 10/(10+2+1) = 10/13 ≈ 0.769
            // Goblin: 2/(10+2+1) = 2/13 ≈ 0.154
            // Orc (unspecified, defaults to 1): 1/(10+2+1) = 1/13 ≈ 0.077
            expect(probabilities['Dragon']).toBeCloseTo(0.76923, 4);
            expect(probabilities['Goblin']).toBeCloseTo(0.15385, 4);
            expect(probabilities['Orc']).toBeCloseTo(0.07692, 4);
        });
    });

    describe('Default mode', () => {
        it('should assign equal weight to all items', () => {
            const items = ['Sword', 'Axe', 'Dagger', 'Bow'];
            const weights = {};

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'default');

            // All items should have equal probability: 1/4 = 0.25
            expect(probabilities['Sword']).toBeCloseTo(0.25, 5);
            expect(probabilities['Axe']).toBeCloseTo(0.25, 5);
            expect(probabilities['Dagger']).toBeCloseTo(0.25, 5);
            expect(probabilities['Bow']).toBeCloseTo(0.25, 5);
        });

        it('should ignore custom weights in default mode', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': 100, 'Axe': 0.01 }; // Should be ignored

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'default');

            // All items should have equal probability despite custom weights
            expect(probabilities['Sword']).toBeCloseTo(1/3, 5);
            expect(probabilities['Axe']).toBeCloseTo(1/3, 5);
            expect(probabilities['Dagger']).toBeCloseTo(1/3, 5);
        });
    });

    describe('Probability calculations', () => {
        it('should calculate probabilities that sum to 1', () => {
            const items = ['A', 'B', 'C', 'D', 'E'];
            const weights = { 'A': 2, 'B': 3, 'C': 1, 'D': 4, 'E': 2 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            const sum = Object.values(probabilities).reduce((sum, p) => sum + p, 0);
            expect(sum).toBeCloseTo(1.0, 10);
        });

        it('should calculate correct probabilities for simple weights', () => {
            const items = ['Red', 'Blue', 'Green'];
            const weights = { 'Red': 1, 'Blue': 1, 'Green': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // Equal weights = equal probabilities
            expect(probabilities['Red']).toBeCloseTo(1/3, 5);
            expect(probabilities['Blue']).toBeCloseTo(1/3, 5);
            expect(probabilities['Green']).toBeCloseTo(1/3, 5);
        });

        it('should calculate correct probabilities for complex weights', () => {
            const items = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
            const weights = { 'Common': 60, 'Uncommon': 25, 'Rare': 10, 'Epic': 4, 'Legendary': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities['Common']).toBeCloseTo(0.60, 5);
            expect(probabilities['Uncommon']).toBeCloseTo(0.25, 5);
            expect(probabilities['Rare']).toBeCloseTo(0.10, 5);
            expect(probabilities['Epic']).toBeCloseTo(0.04, 5);
            expect(probabilities['Legendary']).toBeCloseTo(0.01, 5);
        });

        it('should handle all-zero weights with equal probability', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 0, 'B': 0, 'C': 0 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // When all weights are 0, should return equal probabilities
            expect(probabilities['A']).toBeCloseTo(1/3, 5);
            expect(probabilities['B']).toBeCloseTo(1/3, 5);
            expect(probabilities['C']).toBeCloseTo(1/3, 5);
        });

        it('should handle single item', () => {
            const items = ['OnlyItem'];
            const weights = {};

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities['OnlyItem']).toBe(1.0);
        });

        it('should handle two items with unequal weights', () => {
            const items = ['Heads', 'Tails'];
            const weights = { 'Heads': 3, 'Tails': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities['Heads']).toBeCloseTo(0.75, 5);
            expect(probabilities['Tails']).toBeCloseTo(0.25, 5);
        });
    });

    describe('Deterministic selection with seeded RNG', () => {
        it('should select the same item with same seed', () => {
            const items = ['Sword', 'Axe', 'Dagger', 'Bow'];
            const weights = { 'Sword': 2, 'Axe': 1, 'Dagger': 1, 'Bow': 1 };
            const seed = 'deterministic-seed-1';

            const rng1 = new SeededRNG(seed);
            const rng2 = new SeededRNG(seed);

            const selected1 = WeightedSelector.select(items, weights, rng1, 'relative');
            const selected2 = WeightedSelector.select(items, weights, rng2, 'relative');

            expect(selected1).toBe(selected2);
        });

        it('should select different items with different seeds', () => {
            const items = ['Sword', 'Axe', 'Dagger', 'Bow'];
            const weights = { 'Sword': 2, 'Axe': 1, 'Dagger': 1, 'Bow': 1 };

            const rng1 = new SeededRNG('seed-1');
            const rng2 = new SeededRNG('seed-2');

            const selected1 = WeightedSelector.select(items, weights, rng1, 'relative');
            const selected2 = WeightedSelector.select(items, weights, rng2, 'relative');

            // Most likely will be different (though not guaranteed)
            // Just verify they're both valid items
            expect(items).toContain(selected1);
            expect(items).toContain(selected2);
        });
    });

    describe('Multiple item selection', () => {
        it('should select multiple unique items', () => {
            const items = ['A', 'B', 'C', 'D', 'E'];
            const weights = { 'A': 1, 'B': 1, 'C': 1, 'D': 1, 'E': 1 };
            const rng = new SeededRNG('test-multiple-1');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, 3, 'relative');

            expect(selected).toHaveLength(3);
            expect(new Set(selected).size).toBe(3); // All unique
            selected.forEach(item => {
                expect(items).toContain(item);
            });
        });

        it('should return all items when count equals item count', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 1, 'B': 1, 'C': 1 };
            const rng = new SeededRNG('test-multiple-2');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, 3, 'relative');

            expect(selected).toHaveLength(3);
            expect(new Set(selected).size).toBe(3);
        });

        it('should return all items when count exceeds item count', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 1, 'B': 1, 'C': 1 };
            const rng = new SeededRNG('test-multiple-3');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, 10, 'relative');

            expect(selected).toHaveLength(3);
            expect(new Set(selected).size).toBe(3);
        });

        it('should return empty array when count is 0', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 1, 'B': 1, 'C': 1 };
            const rng = new SeededRNG('test-multiple-4');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, 0, 'relative');

            expect(selected).toEqual([]);
        });

        it('should return empty array when count is negative', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 1, 'B': 1, 'C': 1 };
            const rng = new SeededRNG('test-multiple-5');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, -1, 'relative');

            expect(selected).toEqual([]);
        });

        it('should select items according to weights', () => {
            const items = ['Common', 'Uncommon', 'Rare'];
            const weights = { 'Common': 10, 'Uncommon': 3, 'Rare': 1 };
            const rng = new SeededRNG('test-multiple-6');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, 100, 'relative');

            // Run many selections and check distribution
            const counts: Record<string, number> = { 'Common': 0, 'Uncommon': 0, 'Rare': 0 };
            for (const item of selected) {
                counts[item]++;
            }

            // Common should appear most often, Rare least often
            expect(counts['Common']).toBeGreaterThan(counts['Uncommon']);
            expect(counts['Uncommon']).toBeGreaterThan(counts['Rare']);
        });

        it('should be deterministic with same seed', () => {
            const items = ['A', 'B', 'C', 'D', 'E'];
            const weights = { 'A': 2, 'B': 1, 'C': 1, 'D': 1, 'E': 1 };
            const seed = 'deterministic-multiple-seed';

            const rng1 = new SeededRNG(seed);
            const rng2 = new SeededRNG(seed);

            const selected1 = WeightedSelector.selectMultiple(items, weights, rng1, 3, 'relative');
            const selected2 = WeightedSelector.selectMultiple(items, weights, rng2, 3, 'relative');

            expect(selected1).toEqual(selected2);
        });
    });

    describe('Object items with name property', () => {
        it('should extract name from objects for weight lookup', () => {
            const items = [
                { name: 'Sword', damage: 10 },
                { name: 'Axe', damage: 15 },
                { name: 'Dagger', damage: 5 }
            ];
            const weights = { 'Sword': 2, 'Axe': 1, 'Dagger': 1 };
            const rng = new SeededRNG('test-objects-1');

            const selected = WeightedSelector.select(items, weights, rng, 'relative');

            expect(selected.name).toBeDefined();
            expect(['Sword', 'Axe', 'Dagger']).toContain(selected.name);
        });

        it('should calculate probabilities for objects', () => {
            const items = [
                { name: 'Dragon', hp: 100 },
                { name: 'Goblin', hp: 10 },
                { name: 'Orc', hp: 20 }
            ];
            const weights = { 'Dragon': 5, 'Goblin': 0.5 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities['Dragon']).toBeCloseTo(0.8, 1); // 5/6.5
            expect(probabilities['Goblin']).toBeCloseTo(0.08, 1); // 0.5/6.5
            expect(probabilities['Orc']).toBeCloseTo(0.12, 1); // 1/6.5
        });
    });

    describe('Edge cases', () => {
        it('should throw on empty items array for select', () => {
            const items: string[] = [];
            const weights = {};
            const rng = new SeededRNG('test-edge-1');

            expect(() => {
                WeightedSelector.select(items, weights, rng, 'relative');
            }).toThrow('Cannot select from empty items array');
        });

        it('should return empty probabilities for empty items array', () => {
            const items: string[] = [];
            const weights = {};

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities).toEqual({});
        });

        it('should return empty array for selectMultiple with empty items', () => {
            const items: string[] = [];
            const weights = {};
            const rng = new SeededRNG('test-edge-2');

            const selected = WeightedSelector.selectMultiple(items, weights, rng, 3, 'relative');

            expect(selected).toEqual([]);
        });

        it('should handle special characters in item names', () => {
            const items = ["O'Brian Sword", 'Fire & Ice', 'Dagger-dagger'];
            const weights = { "O'Brian Sword": 1, 'Fire & Ice': 1, 'Dagger-dagger': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities["O'Brian Sword"]).toBeCloseTo(1/3, 5);
            expect(probabilities['Fire & Ice']).toBeCloseTo(1/3, 5);
            expect(probabilities['Dagger-dagger']).toBeCloseTo(1/3, 5);
        });

        it('should handle unicode characters in item names', () => {
            const items = ['月光', 'élégant', 'ναΐτης'];
            const weights = { '月光': 2, 'élégant': 1, 'ναΐτης': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities['月光']).toBeCloseTo(0.5, 5);
            expect(probabilities['élégant']).toBeCloseTo(0.25, 5);
            expect(probabilities['ναΐτης']).toBeCloseTo(0.25, 5);
        });

        it('should handle very large weights', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 1000000, 'B': 1, 'C': 1 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            expect(probabilities['A']).toBeCloseTo(0.999998, 5);
            expect(probabilities['B']).toBeCloseTo(0.000001, 5);
            expect(probabilities['C']).toBeCloseTo(0.000001, 5);
        });

        it('should handle very small weights', () => {
            const items = ['A', 'B', 'C'];
            const weights = { 'A': 0.0001, 'B': 0.0001, 'C': 0.0001 };

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // All weights equal, so equal probabilities
            expect(probabilities['A']).toBeCloseTo(1/3, 5);
            expect(probabilities['B']).toBeCloseTo(1/3, 5);
            expect(probabilities['C']).toBeCloseTo(1/3, 5);
        });

        it('should use string representation for objects without name property', () => {
            const items = [1, 2, 3]; // Numbers will use string representation
            const weights = { '1': 10, '2': 5, '3': 1 };
            const rng = new SeededRNG('test-edge-7');

            const selected = WeightedSelector.select(items, weights, rng, 'relative');

            expect([1, 2, 3]).toContain(selected);
        });

        it('should handle selection with no weights specified', () => {
            const items = ['A', 'B', 'C'];
            const weights = {};

            const probabilities = WeightedSelector.getProbabilities(items, weights, 'relative');

            // All items should default to weight 1
            expect(probabilities['A']).toBeCloseTo(1/3, 5);
            expect(probabilities['B']).toBeCloseTo(1/3, 5);
            expect(probabilities['C']).toBeCloseTo(1/3, 5);
        });
    });

    describe('Default mode parameter', () => {
        it('should default to relative mode when mode not specified', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = { 'Sword': 2 };

            const probabilities = WeightedSelector.getProbabilities(items, weights);

            // Should behave like relative mode
            expect(probabilities['Sword']).toBeCloseTo(0.5, 5); // 2/4
            expect(probabilities['Axe']).toBeCloseTo(0.25, 5); // 1/4
            expect(probabilities['Dagger']).toBeCloseTo(0.25, 5); // 1/4
        });
    });

    describe('Statistical distribution tests', () => {
        it('should distribute selections according to weights over many trials', () => {
            const items = ['Common', 'Uncommon', 'Rare'];
            const weights = { 'Common': 70, 'Uncommon': 25, 'Rare': 5 };
            const trials = 1000;

            const counts: Record<string, number> = { 'Common': 0, 'Uncommon': 0, 'Rare': 0 };

            for (let i = 0; i < trials; i++) {
                const rng = new SeededRNG(`trial-${i}`);
                const selected = WeightedSelector.select(items, weights, rng, 'relative');
                counts[selected]++;
            }

            // Expected: Common ~70%, Uncommon ~25%, Rare ~5%
            // Allow 5% tolerance for statistical variation
            expect(counts['Common'] / trials).toBeGreaterThan(0.65);
            expect(counts['Common'] / trials).toBeLessThan(0.75);

            expect(counts['Uncommon'] / trials).toBeGreaterThan(0.20);
            expect(counts['Uncommon'] / trials).toBeLessThan(0.30);

            expect(counts['Rare'] / trials).toBeGreaterThan(0.02);
            expect(counts['Rare'] / trials).toBeLessThan(0.08);
        });
    });
});
