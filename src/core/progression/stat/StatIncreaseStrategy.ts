/**
 * StatIncreaseStrategy - Built-in implementations for stat increase selection
 *
 * Provides multiple strategies for determining which stats to increase on level up:
 * - DnD5eStandardStrategy: Manual selection (D&D 5e default)
 * - DnD5eSmartStrategy: Intelligent auto-selection
 * - BalancedStrategy: Always balances lowest stats
 * - PrimaryOnlyStrategy: Always boosts class primary
 * - RandomStrategy: Random selection
 * - ManualStrategy: Requires explicit input
 * - Function support: Accepts simple functions
 */

import type {
    CharacterSheet,
    Ability,
    Class
} from '../../types/Character.js';
import type {
    StatIncreaseStrategy,
    StatIncreaseOptions,
    StatIncreaseStrategyType,
    StatIncreaseFunction
} from '../../types/Progression.js';
import { CLASS_DATA } from '../../../constants/DefaultClasses.js';

/**
 * D&D 5e Standard Strategy
 * Returns empty array requiring manual selection (D&D 5e default behavior)
 */
export class DnD5eStandardStrategy implements StatIncreaseStrategy {
    readonly name = 'D&D 5e Standard';

    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        // If forced abilities provided, use those
        if (options?.forcedAbilities && options.forcedAbilities.length > 0) {
            const increases: Array<{ ability: Ability; amount: number }> = [];

            for (const ability of options.forcedAbilities) {
                // Check if already at cap
                if (character.ability_scores[ability] >= 20) {
                    continue; // Skip capped stats
                }
                increases.push({ ability, amount: increaseAmount / options.forcedAbilities.length });
            }

            return increases;
        }

        // Otherwise return empty - caller must manually choose
        // This is the default D&D 5e behavior
        return [];
    }

    requiresManualInput(options?: StatIncreaseOptions): boolean {
        // Requires manual input if no forced abilities provided
        return !options?.forcedAbilities || options.forcedAbilities.length === 0;
    }
}

/**
 * D&D 5e Smart Strategy
 * Intelligently selects based on class and current stats
 */
export class DnD5eSmartStrategy implements StatIncreaseStrategy {
    readonly name = 'D&D 5e Smart';

    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        const excluded = new Set(options?.excludedAbilities || []);

        // Get all abilities not at cap and not excluded
        const availableAbilities: Ability[] = (
            ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as Ability[]
        ).filter(ability =>
            !excluded.has(ability) &&
            character.ability_scores[ability] < 20
        );

        if (availableAbilities.length === 0) {
            return []; // All at cap
        }

        // Get class data for primary ability
        const classData = CLASS_DATA[character.class as Class];
        const primary = classData?.primary_ability || 'STR';

        // Strategy: Prioritize primary ability if under 18
        if (!excluded.has(primary) &&
            character.ability_scores[primary] < 18 &&
            availableAbilities.includes(primary)) {

            // Check if we should do +1 to two stats instead
            if (increaseAmount === 2 && this.shouldSplit(character, primary)) {
                const lowest = this.findLowestStat(character, availableAbilities, primary);
                return [
                    { ability: primary, amount: 1 },
                    { ability: lowest, amount: 1 }
                ];
            }

            return [{ ability: primary, amount: increaseAmount }];
        }

        // Otherwise boost lowest stats
        if (increaseAmount === 2 && availableAbilities.length >= 2) {
            const lowest1 = this.findLowestStat(character, availableAbilities);
            const lowest2 = this.findLowestStat(character, availableAbilities.filter(a => a !== lowest1));

            return [
                { ability: lowest1, amount: 1 },
                { ability: lowest2, amount: 1 }
            ];
        }

        const lowest = this.findLowestStat(character, availableAbilities);
        return [{ ability: lowest, amount: increaseAmount }];
    }

    requiresManualInput(): boolean {
        return false; // Always automatic
    }

    private shouldSplit(character: CharacterSheet, primary: Ability): boolean {
        // Split if primary is decent (15+) and there's a very low stat
        const primaryScore = character.ability_scores[primary];
        if (primaryScore < 15) return false;

        const scores = Object.values(character.ability_scores);
        const minScore = Math.min(...scores);

        return minScore < primaryScore - 4;
    }

    private findLowestStat(
        character: CharacterSheet,
        abilities: Ability[],
        exclude?: Ability
    ): Ability {
        let lowest: Ability = abilities[0];
        let lowestScore = character.ability_scores[lowest];

        for (const ability of abilities) {
            if (ability === exclude) continue;
            const score = character.ability_scores[ability];
            if (score < lowestScore) {
                lowest = ability;
                lowestScore = score;
            }
        }

        return lowest;
    }
}

/**
 * Balanced Strategy
 * Always increases the two lowest stats by +1 each (or distributes evenly)
 */
export class BalancedStrategy implements StatIncreaseStrategy {
    readonly name = 'Balanced';

    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        const excluded = new Set(options?.excludedAbilities || []);

        // Sort abilities by score (lowest first)
        const sorted = (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as Ability[])
            .filter(a => !excluded.has(a))
            .filter(a => character.ability_scores[a] < 20)
            .sort((a, b) => character.ability_scores[a] - character.ability_scores[b]);

        if (sorted.length === 0) return [];

        // If forced, use those
        if (options?.forcedAbilities && options.forcedAbilities.length >= 2) {
            return [
                { ability: options.forcedAbilities[0], amount: 1 },
                { ability: options.forcedAbilities[1], amount: 1 }
            ];
        }

        // Distribute as evenly as possible
        const results: Array<{ ability: Ability; amount: number }> = [];
        let remaining = increaseAmount;

        for (let i = 0; i < sorted.length && remaining > 0; i++) {
            results.push({ ability: sorted[i], amount: 1 });
            remaining--;
        }

        return results;
    }

    requiresManualInput(): boolean {
        return false; // Always automatic
    }
}

/**
 * Primary Only Strategy
 * Always boosts the class's primary ability
 */
export class PrimaryOnlyStrategy implements StatIncreaseStrategy {
    readonly name = 'Primary Only';

    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        const classData = CLASS_DATA[character.class as Class];
        const primary = classData?.primary_ability || 'STR';

        if (options?.excludedAbilities?.includes(primary)) {
            // Fallback to lowest if primary is excluded
            const lowest = this.findLowestStat(character, options?.excludedAbilities);
            return [{ ability: lowest, amount: increaseAmount }];
        }

        // Check if at cap
        if (character.ability_scores[primary] >= 20) {
            // Fallback to lowest
            const lowest = this.findLowestStat(character, [primary]);
            return [{ ability: lowest, amount: increaseAmount }];
        }

        return [{ ability: primary, amount: increaseAmount }];
    }

    requiresManualInput(): boolean {
        return false; // Always automatic
    }

    private findLowestStat(character: CharacterSheet, excluded?: Ability[]): Ability {
        const abilities = (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as Ability[])
            .filter(a => !excluded?.includes(a))
            .filter(a => character.ability_scores[a] < 20);

        if (abilities.length === 0) {
            return 'STR'; // Fallback
        }

        let lowest: Ability = abilities[0];
        let lowestScore = character.ability_scores[lowest];

        for (const ability of abilities) {
            const score = character.ability_scores[ability];
            if (score < lowestScore) {
                lowest = ability;
                lowestScore = score;
            }
        }

        return lowest;
    }
}

/**
 * Random Strategy
 * Randomly selects abilities
 */
export class RandomStrategy implements StatIncreaseStrategy {
    readonly name = 'Random';

    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        const available = (['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as Ability[])
            .filter(a => !options?.excludedAbilities?.includes(a))
            .filter(a => character.ability_scores[a] < 20);

        if (available.length === 0) return [];

        // Random selection
        const shuffled = [...available].sort(() => Math.random() - 0.5);

        if (increaseAmount === 2 && shuffled.length >= 2) {
            return [
                { ability: shuffled[0], amount: 1 },
                { ability: shuffled[1], amount: 1 }
            ];
        }

        return [{ ability: shuffled[0], amount: increaseAmount }];
    }

    requiresManualInput(): boolean {
        return false; // Always automatic
    }
}

/**
 * Manual Strategy
 * Always defers to manual stat selection
 * Returns empty array to signal that manual input is required
 * Stats should be applied via CharacterUpdater.applyPendingStatIncrease()
 */
export class ManualStrategy implements StatIncreaseStrategy {
    readonly name = 'Manual';

    selectIncreases(
        _character: CharacterSheet,
        _increaseAmount: number,
        _options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        // Always defer to manual input via applyPendingStatIncrease()
        // This strategy never auto-selects stats, even with forcedAbilities
        return [];
    }

    requiresManualInput(): boolean {
        return true; // Always requires manual input
    }
}

/**
 * Function Strategy Wrapper
 * Wraps a simple function to implement the StatIncreaseStrategy interface
 */
class FunctionStrategyWrapper implements StatIncreaseStrategy {
    readonly name: string;
    private fn: StatIncreaseFunction;

    constructor(fn: StatIncreaseFunction, name?: string) {
        this.fn = fn;
        this.name = name || 'Custom Function';
    }

    selectIncreases(
        character: CharacterSheet,
        increaseAmount: number,
        options?: StatIncreaseOptions
    ): Array<{ ability: Ability; amount: number }> {
        return this.fn(character, increaseAmount, options);
    }

    requiresManualInput(): boolean {
        return false; // Custom functions are treated as automatic
    }
}

/**
 * Factory function to create strategy instances
 * Accepts either a string type, a full strategy implementation, or a simple function
 */
export function createStatIncreaseStrategy(
    strategy: StatIncreaseStrategyType | StatIncreaseStrategy | StatIncreaseFunction
): StatIncreaseStrategy {
    // If it's already a strategy, return it
    if (typeof strategy !== 'string' && typeof strategy !== 'function') {
        return strategy;
    }

    // If it's a function, wrap it
    if (typeof strategy === 'function') {
        return new FunctionStrategyWrapper(strategy);
    }

    // Otherwise it's a string type
    switch (strategy) {
        case 'dnD5e':
            return new DnD5eStandardStrategy();
        case 'dnD5e_smart':
            return new DnD5eSmartStrategy();
        case 'balanced':
            return new BalancedStrategy();
        case 'primary_only':
            return new PrimaryOnlyStrategy();
        case 'random':
            return new RandomStrategy();
        case 'manual':
            return new ManualStrategy();
        default:
            const exhaustiveCheck: never = strategy;
            throw new Error(`Unknown strategy type: ${exhaustiveCheck}`);
    }
}
