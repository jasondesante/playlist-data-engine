/**
 * StatManager - Public API for all stat modifications
 *
 * This is the SINGLE SOURCE OF TRUTH for stat changes.
 * All stat modifications MUST go through this class.
 *
 * Provides methods for:
 * - Manual stat increases (potions, items, events)
 * - Manual stat decreases (curses, poison)
 * - Absolute stat setting
 * - Level-up stat increases
 */

import type { CharacterSheet, Ability, GameMode } from '../../types/Character.js';
import type {
    StatIncreaseConfig,
    StatIncreaseResult,
    StatIncreaseStrategy,
    StatIncreaseOptions,
    StatIncreaseFunction,
    StatIncreaseStrategyType,
    StatSelectionValidationError
} from '../../types/Progression.js';
import { createStatIncreaseStrategy } from './StatIncreaseStrategy.js';

/**
 * Default stat increase levels (D&D 5e standard)
 */
const DEFAULT_STAT_INCREASE_LEVELS = [4, 8, 12, 16, 19];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<StatIncreaseConfig> = {
    maxStatCap: 20,
    strategy: 'dnD5e',
    autoApply: true,
    statIncreaseLevels: DEFAULT_STAT_INCREASE_LEVELS
};

/**
 * StatManager - Public API for stat modifications
 *
 * @example
 * ```typescript
 * // Create with default config (D&D 5e standard)
 * const statManager = new StatManager();
 *
 * // Manual stat increase (potion)
 * const result = statManager.increaseStats(
 *   character,
 *   [{ ability: 'STR', amount: 4 }],
 *   'item'
 * );
 *
 * // Process level up
 * const levelUpResult = statManager.processLevelUp(character, 4, {
 *   forcedAbilities: ['STR']
 * });
 * ```
 */
export class StatManager {
    private config: Required<StatIncreaseConfig>;
    private strategy: StatIncreaseStrategy;

    constructor(config?: Partial<StatIncreaseConfig>) {
        this.config = this.mergeWithDefaults(config);
        this.strategy = createStatIncreaseStrategy(this.config.strategy);
    }

    /**
     * Increase stats manually (e.g., from potions, items, events)
     *
     * @param character - The character to modify
     * @param increases - Array of {ability, amount} to increase
     * @param source - Source of the increase (for tracking)
     * @returns Result with updated character and change details
     *
     * @example
     * ```typescript
     * // Potion of Strength: +4 STR
     * const result = statManager.increaseStats(character, [
     *   { ability: 'STR', amount: 4 }
     * ], 'item');
     *
     * if (result.capped.length > 0) {
     *   console.log('Stat was capped at 20!');
     * }
     *
     * const updatedCharacter = result.character;
     * ```
     */
    increaseStats(
        character: CharacterSheet,
        increases: Array<{ ability: Ability; amount: number }>,
        source: StatIncreaseResult['source'] = 'manual'
    ): StatIncreaseResult {
        const updated = { ...character };
        const resultIncreases: StatIncreaseResult['increases'] = [];
        const resultCapped: StatIncreaseResult['capped'] = [];

        // Deep copy ability scores and modifiers
        updated.ability_scores = { ...updated.ability_scores };
        updated.ability_modifiers = { ...updated.ability_modifiers };

        // Determine stat cap based on character's game mode
        const gameMode: GameMode = updated.gameMode || 'standard';
        const cap = gameMode === 'uncapped' ? Infinity : (this.config.maxStatCap ?? 20);

        for (const { ability, amount } of increases) {
            const currentScore = updated.ability_scores[ability];
            const rawNewScore = currentScore + amount;

            const newScore = Math.min(rawNewScore, cap);
            const actualIncrease = newScore - currentScore;

            if (actualIncrease > 0) {
                updated.ability_scores[ability] = newScore;

                // Recalculate modifier
                updated.ability_modifiers[ability] = Math.floor((newScore - 10) / 2);

                resultIncreases.push({
                    ability,
                    oldValue: currentScore,
                    newValue: newScore,
                    delta: actualIncrease
                });
            } else if (rawNewScore > cap) {
                // Was capped
                resultCapped.push({
                    ability,
                    attemptedValue: rawNewScore,
                    cappedAt: cap
                });
            }
        }

        return {
            character: updated,
            increases: resultIncreases,
            capped: resultCapped,
            source,
            timestamp: Date.now()
        };
    }

    /**
     * Decrease stats (e.g., from curses, damage, poison)
     *
     * @param character - The character to modify
     * @param decreases - Array of {ability, amount} to decrease
     * @param source - Source of the decrease
     * @returns Result with updated character and change details
     *
     * @example
     * ```typescript
     * // Curse lowering strength
     * const result = statManager.decreaseStats(character, [
     *   { ability: 'STR', amount: 2 }
     * ], 'event');
     * ```
     */
    decreaseStats(
        character: CharacterSheet,
        decreases: Array<{ ability: Ability; amount: number }>,
        source: StatIncreaseResult['source'] = 'event'
    ): StatIncreaseResult {
        const increases = decreases.map(({ ability, amount }) => ({
            ability,
            amount: -amount
        }));

        return this.increaseStats(character, increases, source);
    }

    /**
     * Set a stat to a specific value (absolute, not relative)
     *
     * @param character - The character to modify
     * @param ability - The ability to set
     * @param value - The new value
     * @param source - Source of the change
     * @returns Result with updated character
     *
     * @example
     * ```typescript
     * // Set strength to 18
     * const result = statManager.setStat(character, 'STR', 18, 'manual');
     * ```
     */
    setStat(
        character: CharacterSheet,
        ability: Ability,
        value: number,
        source: StatIncreaseResult['source'] = 'manual'
    ): StatIncreaseResult {
        const currentScore = character.ability_scores[ability];
        const delta = value - currentScore;

        return this.increaseStats(character, [{ ability, amount: delta }], source);
    }

    /**
     * Process stat increases for level up
     * This is called internally by LevelUpProcessor
     *
     * @param character - The character leveling up
     * @param newLevel - The level being reached
     * @param options - Optional overrides for this level up
     * @returns Result with stat increases, or null if no increase at this level
     */
    processLevelUp(
        character: CharacterSheet,
        newLevel: number,
        options?: StatIncreaseOptions
    ): StatIncreaseResult | null {
        // Read gameMode from character (defaults to 'standard' for backward compatibility)
        const gameMode: GameMode = character.gameMode || 'standard';
        const isUncapped = gameMode === 'uncapped';

        // Check if this level grants a stat increase
        // - Uncapped mode: every level
        // - Standard mode: use config levels (default: 4, 8, 12, 16, 19)
        const statIncreaseLevels = this.config.statIncreaseLevels?.length
            ? this.config.statIncreaseLevels
            : DEFAULT_STAT_INCREASE_LEVELS;
        const isStatIncreaseLevel = isUncapped || statIncreaseLevels.includes(newLevel);

        if (!isStatIncreaseLevel) {
            return null;
        }

        // Use strategy to determine increases
        const increaseAmount = 2; // D&D 5e standard
        const increases = this.strategy.selectIncreases(
            character,
            increaseAmount,
            options
        );

        if (increases.length === 0) {
            // Strategy deferred or no valid increases
            return null;
        }

        return this.increaseStats(character, increases, 'level_up');
    }

    /**
     * Update the configuration
     *
     * @param config - New config (partial)
     *
     * @example
     * ```typescript
     * // Change strategy mid-game
     * statManager.updateConfig({
     *   strategy: 'dnD5e_smart'
     * });
     *
     * // Override stat cap (e.g., for epic mode)
     * statManager.updateConfig({
     *   maxStatCap: 30
     * });
     * ```
     */
    updateConfig(config: Partial<StatIncreaseConfig>): void {
        const oldStrategy = this.config.strategy;
        this.config = this.mergeWithDefaults(config);

        // Update strategy if it changed
        if (config.strategy && config.strategy !== oldStrategy) {
            this.strategy = createStatIncreaseStrategy(this.config.strategy);
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): Readonly<Required<StatIncreaseConfig>> {
        return this.config;
    }

    /**
     * Check if an ability can be increased
     *
     * @param character - The character to check
     * @param ability - The ability to check
     * @param amount - How much to increase by
     * @returns true if increase is possible
     *
     * @example
     * ```typescript
     * if (statManager.canIncrease(character, 'STR', 2)) {
     *   // Safe to increase
     * }
     * ```
     */
    canIncrease(
        character: CharacterSheet,
        ability: Ability,
        amount: number = 1
    ): boolean {
        const currentScore = character.ability_scores[ability];
        // Determine stat cap based on character's game mode
        const gameMode: GameMode = character.gameMode || 'standard';
        const cap = gameMode === 'uncapped' ? Infinity : (this.config.maxStatCap ?? 20);

        return currentScore + amount <= cap;
    }

    /**
     * Get stat cap for an ability
     * @param character - The character to check (for game mode)
     * @param ability - The ability to check
     * @returns Stat cap for this character's game mode
     */
    getStatCap(character: CharacterSheet, _ability: Ability): number {
        const gameMode: GameMode = character.gameMode || 'standard';
        return gameMode === 'uncapped' ? Infinity : (this.config.maxStatCap ?? 20);
    }

    /**
     * Validate stat selection follows D&D 5e rules
     * Rules: +2 to one ability OR +1 to two abilities
     *
     * @param character - Character to validate against
     * @param selections - User's stat selections
     * @param increaseAmount - Total points to distribute (usually 2)
     * @returns Validation result
     */
    public validateDnD5eStatSelection(
        character: CharacterSheet,
        selections: Array<{ ability: Ability; amount: number }>,
        increaseAmount: number = 2
    ): { valid: true } | StatSelectionValidationError {
        // Rule 1: Total amount must equal 2
        const totalAmount = selections.reduce((sum, s) => sum + s.amount, 0);
        if (totalAmount !== increaseAmount) {
            return {
                error: `Total stat increase must be ${increaseAmount}, got ${totalAmount}`,
                reason: 'invalid_amount',
                allowedPatterns: [`+${increaseAmount} to one ability`, `+1 to two abilities`]
            };
        }

        // Rule 2: Valid pattern (either +2 to one OR +1 to two)
        const validPatterns = [
            { count: 1, amount: increaseAmount },
            { count: 2, amount: 1 }
        ];

        const patternMatch = validPatterns.some(p =>
            selections.length === p.count &&
            selections.every(s => s.amount === p.amount)
        );

        if (!patternMatch) {
            return {
                error: 'Invalid pattern: must be +2 to one ability or +1 to two abilities',
                reason: 'wrong_pattern',
                allowedPatterns: validPatterns.map(p =>
                    p.count === 1 ? `+${p.amount} to one ability` : `+1 to two abilities`
                )
            };
        }

        // Rule 3: Check stat caps
        const statCap = this.getStatCap(character, 'STR');
        for (const selection of selections) {
            const currentScore = character.ability_scores[selection.ability];
            const newScore = currentScore + selection.amount;

            if (newScore > statCap && statCap !== Infinity) {
                return {
                    error: `${selection.ability} would exceed stat cap of ${statCap}`,
                    reason: 'exceeds_cap',
                    allowedPatterns: [`Choose different abilities or use ${statCap - currentScore} points`]
                };
            }
        }

        // Rule 4: Valid abilities
        const validAbilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        for (const selection of selections) {
            if (!validAbilities.includes(selection.ability)) {
                return {
                    error: `Invalid ability: ${selection.ability}`,
                    reason: 'invalid_ability',
                    allowedPatterns: validAbilities
                };
            }
        }

        // Rule 5: No duplicates
        const seenAbilities = new Set<Ability>();
        for (const selection of selections) {
            if (seenAbilities.has(selection.ability)) {
                return {
                    error: `Duplicate ability: ${selection.ability}`,
                    reason: 'duplicate_ability',
                    allowedPatterns: ['Each ability can only be increased once']
                };
            }
            seenAbilities.add(selection.ability);
        }

        return { valid: true };
    }

    /**
     * Merge user config with defaults
     * Note: Stat cap and increase levels are determined at runtime based on character's game mode
     */
    private mergeWithDefaults(
        config?: Partial<StatIncreaseConfig>
    ): Required<StatIncreaseConfig> {
        return {
            maxStatCap: config?.maxStatCap ?? 20,
            strategy: config?.strategy ?? DEFAULT_CONFIG.strategy,
            autoApply: config?.autoApply ?? DEFAULT_CONFIG.autoApply,
            statIncreaseLevels: config?.statIncreaseLevels ?? DEFAULT_STAT_INCREASE_LEVELS
        };
    }
}
