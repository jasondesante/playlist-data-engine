/**
 * Race Selector - Deterministic race selection
 * Based on ENGINE_DESIGN_DOCUMENT.md Section 6.C
 */

import type { Race } from '../types/Character.js';
import { SeededRNG } from '../../utils/random.js';
import { ALL_RACES } from '../../utils/constants.js';

/**
 * Select character races deterministically from seeded random selection
 */
export class RaceSelector {
    /**
     * Select a random race deterministically from seeded RNG
     *
     * Selects from 9 D&D 5e races:
     * - Dwarf, Elf, Halfling, Human, Dragonborn, Gnome, Half-Elf, Half-Orc, Tiefling
     *
     * Same seed always selects the same race.
     *
     * @param {SeededRNG} rng - Seeded random number generator
     * @returns {Race} Selected race
     *
     * @example
     * const rng = new SeededRNG('my-seed-123');
     * const race = RaceSelector.select(rng);  // Always selects same race for same seed
     */
    static select(rng: SeededRNG): Race {
        return rng.randomChoice(ALL_RACES);
    }
}
