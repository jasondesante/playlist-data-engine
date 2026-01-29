/**
 * Class Suggester - Suggests class based on audio profile with extensibility support
 * Based on specs/001-core-engine/SPEC.md
 */

import type { Class } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { WeightedSelector } from '../extensions/WeightedSelector.js';
import { ensureClassDefaultsInitialized } from '../extensions/initializeDefaults.js';

/**
 * Suggest D&D 5e classes based on audio frequency analysis
 *
 * Maps audio characteristics to character classes:
 * - High bass (strength) → Barbarian, Fighter, Paladin
 * - High treble (dexterity) → Rogue, Ranger, Monk
 * - High mid (intelligence/wisdom) → Wizard, Cleric, Druid
 * - High amplitude (charisma) → Bard, Sorcerer, Warlock
 *
 * Supports the extensibility system:
 * - Custom classes can be registered via ExtensionManager
 * - Spawn rates can be customized per class
 * - Audio-based weights are combined with custom spawn rate weights
 */
export class ClassSuggester {
    /**
     * Suggest a class based on audio frequency dominance
     *
     * Analyzes bass/mid/treble frequencies to weight class suggestions:
     * - Bass dominance suggests strength-based classes (Barbarian, Fighter, Paladin)
     * - Treble dominance suggests dexterity-based classes (Rogue, Ranger, Monk)
     * - Mid dominance suggests intelligence-based classes (Wizard, Cleric, Druid)
     * - Amplitude suggests charisma classes (Bard, Sorcerer, Warlock)
     *
     * Combines audio-based weights with custom spawn rate weights from ExtensionManager.
     * Uses weighted random selection with seeded RNG for determinism.
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results (bass/mid/treble/amplitude)
     * @param {SeededRNG} rng - Seeded random number generator for deterministic selection
     * @returns {Class} Suggested D&D 5e class
     *
     * @example
     * ```typescript
     * const audioProfile = await analyzer.extractSonicFingerprint(audioUrl);
     * const suggestedClass = ClassSuggester.suggest(audioProfile, rng);
     * console.log(`This audio suggests: ${suggestedClass}`);
     * ```
     *
     * @example
     * ```typescript
     * // With custom spawn weights
     * const manager = ExtensionManager.getInstance();
     * manager.setWeights('classes', { 'Barbarian': 2, 'Wizard': 0.5 });  // Make barbarians more common
     * const suggestedClass = ClassSuggester.suggest(audioProfile, rng);
     * ```
     *
     * @example
     * ```typescript
     * // With custom classes
     * manager.register('classes', ['Necromancer', 'Battlemage'], {
     *     mode: 'relative',
     *     weights: { 'Necromancer': 0.3, 'Battlemage': 0.5 }
     * });
     * const suggestedClass = ClassSuggester.suggest(audioProfile, rng);
     * ```
     */
    static suggest(audioProfile: AudioProfile, rng: SeededRNG): Class {
        // Ensure class defaults are initialized
        ensureClassDefaultsInitialized();

        const manager = ExtensionManager.getInstance();
        const allClasses = manager.get('classes') as Class[];

        // Get audio-based weights
        const audioWeights = this.getAudioWeights(audioProfile, allClasses);

        // Get custom spawn rate weights from ExtensionManager
        const customWeights = manager.getWeights('classes');

        // Get the spawn mode for classes
        const mode = manager.getMode('classes') || 'relative';

        // Combine audio weights with custom weights (custom takes priority)
        const combinedWeights = this.combineWeights(audioWeights, customWeights);

        return WeightedSelector.select(allClasses, combinedWeights, rng, mode);
    }

    /**
     * Get audio-based class weights from audio profile
     *
     * Maps frequency dominance to class weights:
     * - Bass > 0.6: Barbarian(3), Fighter(2), Paladin(2)
     * - Treble > 0.6: Rogue(3), Ranger(2), Monk(2)
     * - Mid > 0.6: Wizard(2), Cleric(2), Druid(2)
     * - Amplitude > 0.15: Bard(2), Sorcerer(2), Warlock(2)
     *
     * Note: Amplitude threshold lowered from 0.5 to 0.15 because most music
     * has average amplitude between 0.05-0.25. The old threshold of 0.5 was
     * too high and made charisma classes (Bard/Sorcerer/Warlock) too rare.
     *
     * If no thresholds are met, returns empty weights (all classes equally likely).
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results
     * @param {Class[]} allClasses - All available classes (default + custom)
     * @returns {Record<string, number>} Class weights based on audio
     * @private
     */
    private static getAudioWeights(
        audioProfile: AudioProfile,
        allClasses: Class[]
    ): Record<string, number> {
        const { bass_dominance, mid_dominance, treble_dominance, average_amplitude } = audioProfile;

        // Create weighted choices based on audio characteristics
        const weights: [Class, number][] = [];

        // High bass = strength classes
        if (bass_dominance > 0.6) {
            weights.push(['Barbarian', 3], ['Fighter', 2], ['Paladin', 2]);
        }

        // High treble = dexterity classes
        // Equalized weights to fix Rogue bias (was 3, now 2)
        if (treble_dominance > 0.6) {
            weights.push(['Rogue', 2], ['Ranger', 2], ['Monk', 2]);
        }

        // High mid = intelligence/wisdom classes
        if (mid_dominance > 0.6) {
            weights.push(['Wizard', 2], ['Cleric', 2], ['Druid', 2]);
        }

        // High amplitude = charisma classes
        // Threshold lowered from 0.5 to 0.15 to fix rarity of charisma classes
        // Most music has average amplitude between 0.05-0.25 (not 0.5)
        // This makes Bards, Sorcerers, and Warlocks spawn more frequently
        if (average_amplitude > 0.15) {
            weights.push(['Bard', 2], ['Sorcerer', 2], ['Warlock', 2]);
        }

        // Convert to record format
        const weightRecord: Record<string, number> = {};
        for (const [cls, weight] of weights) {
            // Only add if class exists in available classes
            if (allClasses.includes(cls)) {
                weightRecord[cls] = weight;
            }
        }

        return weightRecord;
    }

    /**
     * Combine audio-based weights with custom spawn rate weights
     *
     * Custom weights take priority over audio-based weights.
     * If a class has both, the custom weight is used.
     * If a class has no audio weight, it gets a default weight of 1.
     *
     * @param {Record<string, number>} audioWeights - Audio-based class weights
     * @param {Record<string, number>} customWeights - Custom spawn rate weights
     * @returns {Record<string, number>} Combined weights
     * @private
     */
    private static combineWeights(
        audioWeights: Record<string, number>,
        customWeights: Record<string, number>
    ): Record<string, number> {
        // Custom weights take priority
        return { ...audioWeights, ...customWeights };
    }
}
