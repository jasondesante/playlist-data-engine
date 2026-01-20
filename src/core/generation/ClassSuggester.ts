/**
 * Class Suggester - Suggests class based on audio profile
 * Based on specs/001-core-engine/SPEC.md
 */

import type { Class } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { ALL_CLASSES } from '../../utils/constants.js';

/**
 * Suggest D&D 5e classes based on audio frequency analysis
 *
 * Maps audio characteristics to character classes:
 * - High bass (strength) → Barbarian, Fighter, Paladin
 * - High treble (dexterity) → Rogue, Ranger, Monk
 * - High mid (intelligence/wisdom) → Wizard, Cleric, Druid
 */
export class ClassSuggester {
    /**
     * Suggest a class based on audio frequency dominance
     *
     * Analyzes bass/mid/treble frequencies to weight class suggestions:
     * - Bass dominance suggests strength-based classes (Barbarian, Fighter)
     * - Treble dominance suggests dexterity-based classes (Rogue, Ranger)
     * - Mid dominance suggests intelligence-based classes (Wizard)
     * - Amplitude suggests charisma classes (Bard, Warlock)
     *
     * Uses weighted random selection with seeded RNG for determinism.
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results (bass/mid/treble/amplitude)
     * @param {SeededRNG} rng - Seeded random number generator for deterministic selection
     * @returns {Class} Suggested D&D 5e class
     *
     * @example
     * const audioProfile = await analyzer.extractSonicFingerprint(audioUrl);
     * const suggestedClass = ClassSuggester.suggest(audioProfile, rng);
     * console.log(`This audio suggests: ${suggestedClass}`);
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
