/**
 * Seeded random number generator for deterministic randomness
 */

import { hashSeedToFloat, deriveSeed } from './hash.js';

export class SeededRNG {
    private seed: string;
    private counter: number;

    constructor(seed: string) {
        this.seed = seed;
        this.counter = 0;
    }

    /**
     * Generate a random float between 0.0 and 1.0
     */
    random(): number {
        const derivedSeed = deriveSeed(this.seed, this.counter.toString());
        this.counter++;
        return hashSeedToFloat(derivedSeed);
    }

    /**
     * Generate a random integer between min (inclusive) and max (exclusive)
     */
    randomInt(min: number, max: number): number {
        return Math.floor(this.random() * (max - min)) + min;
    }

    /**
     * Pick a random element from an array
     */
    randomChoice<T>(array: T[]): T {
        const index = this.randomInt(0, array.length);
        return array[index];
    }

    /**
     * Pick a random element from an array with weighted probabilities
     * @param choices - Array of [value, weight] tuples
     */
    weightedChoice<T>(choices: [T, number][]): T {
        const totalWeight = choices.reduce((sum, [, weight]) => sum + weight, 0);
        let random = this.random() * totalWeight;

        for (const [value, weight] of choices) {
            random -= weight;
            if (random <= 0) {
                return value;
            }
        }

        // Fallback to last choice
        return choices[choices.length - 1][0];
    }

    /**
     * Shuffle an array deterministically
     */
    shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.randomInt(0, i + 1);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Reset the counter (useful for testing)
     */
    reset(): void {
        this.counter = 0;
    }
}
