/**
 * Race Selector - Deterministic race selection with extensibility support
 * Based on specs/001-core-engine/SPEC.md
 */

import type { Race } from '../types/Character.js';
import { SeededRNG } from '../../utils/random.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { WeightedSelector } from '../extensions/WeightedSelector.js';
import { ensureRaceDefaultsInitialized } from '../extensions/initializeDefaults.js';

/**
 * Select character races deterministically from seeded random selection
 *
 * Supports the extensibility system:
 * - Custom races can be registered via ExtensionManager
 * - Spawn rates can be customized per race
 * - Relative and absolute selection modes supported
 */
export class RaceSelector {
    /**
     * Select a random race deterministically from seeded RNG
     *
     * Selects from available races (default 9 D&D 5e races plus any custom races):
     * - Default: Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
     * - Custom: Any races registered via ExtensionManager
     *
     * Uses weighted selection with spawn rate control:
     * - Equal weights by default (all races equally likely)
     * - Custom weights can be set via ExtensionManager.setWeights('races', weights)
     *
     * Same seed always selects the same race.
     *
     * @param {SeededRNG} rng - Seeded random number generator
     * @returns {Race} Selected race
     *
     * @example
     * ```typescript
     * const rng = new SeededRNG('my-seed-123');
     * const race = RaceSelector.select(rng);  // Always selects same race for same seed
     * ```
     *
     * @example
     * ```typescript
     * // With custom spawn weights
     * const manager = ExtensionManager.getInstance();
     * manager.setWeights('races', { 'Human': 2, 'Elf': 1.5 });  // Make humans more common
     * const race = RaceSelector.select(rng);
     * ```
     *
     * @example
     * ```typescript
     * // With custom races
     * manager.register('races', ['Dragonkin', 'Fairy'], {
     *     mode: 'relative',
     *     weights: { 'Dragonkin': 0.5, 'Fairy': 0.3 }  // Rare races
     * });
     * const race = RaceSelector.select(rng);
     * ```
     */
    static select(rng: SeededRNG): Race {
        // Ensure race defaults are initialized
        ensureRaceDefaultsInitialized();

        const manager = ExtensionManager.getInstance();
        const allRaces = manager.get('races');
        const raceWeights = manager.getWeights('races');

        // Get the spawn mode for races (default to 'default' for equal weights)
        const mode = manager.getMode('races') || 'default';

        return WeightedSelector.select(allRaces, raceWeights, rng, mode);
    }
}
