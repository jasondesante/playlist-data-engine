/**
 * Race Selector - Deterministic race selection
 * Based on ENGINE_DESIGN_DOCUMENT.md Section 6.C
 */

import type { Race } from '../types/Character.js';
import { SeededRNG } from '../../utils/random.js';
import { ALL_RACES } from '../../utils/constants.js';

export class RaceSelector {
    /**
     * Select race deterministically from seed
     */
    static select(rng: SeededRNG): Race {
        return rng.randomChoice(ALL_RACES);
    }
}
