/**
 * Class Suggester - Suggests class based on audio profile
 * Based on ENGINE_DESIGN_DOCUMENT.md Section 6.D
 */

import type { Class } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { ALL_CLASSES } from '../../utils/constants.js';

export class ClassSuggester {
    /**
     * Suggest class based on audio profile
     */
    static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class {
        const { bass_dominance, mid_dominance, treble_dominance, average_amplitude } = audioProfile;

        // Create weighted choices based on audio characteristics
        const weights: [Class, number][] = [];

        // High bass = strength classes
        if (bass_dominance > 0.6) {
            weights.push(['Barbarian', 3], ['Fighter', 2], ['Paladin', 2]);
        }

        // High treble = dexterity classes
        if (treble_dominance > 0.6) {
            weights.push(['Rogue', 3], ['Ranger', 2], ['Monk', 2]);
        }

        // High mid = intelligence/wisdom classes
        if (mid_dominance > 0.6) {
            weights.push(['Wizard', 2], ['Cleric', 2], ['Druid', 2]);
        }

        // High amplitude = charisma classes
        if (average_amplitude > 0.5) {
            weights.push(['Bard', 2], ['Sorcerer', 2], ['Warlock', 2]);
        }

        // If no strong preferences, use balanced weights
        if (weights.length === 0) {
            return rng.randomChoice(ALL_CLASSES);
        }

        return rng.weightedChoice(weights);
    }
}
