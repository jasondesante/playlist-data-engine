/**
 * Class Suggester - Affinity-based class selection with baseline system
 * Based on specs/001-core-engine/SPEC.md
 * Phase 9: Complete rewrite with 4% baseline and smooth affinity curves
 */

import type { Class } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ensureClassDefaultsInitialized } from '../extensions/initializeDefaults.js';
import { CLASS_AUDIO_PREFERENCES } from '../../../utils/constants.js';

/**
 * Audio trait types for class preference mapping
 */
type AudioTrait = 'bass' | 'treble' | 'mid' | 'amplitude' | 'chaos';

/**
 * Suggest D&D 5e classes based on audio frequency analysis
 *
 * **Phase 9 Rewrite: Affinity-based system with 4% baseline**
 *
 * Key improvements over previous implementation:
 * - **4% baseline probability**: All classes always have at least 4% chance
 * - **Affinity-based selection**: Smooth affinity scoring instead of hard thresholds
 * - **No class lockout**: Any class can be selected at any time
 * - **Audio influences smoothly**: Higher affinity = higher probability (up to 50%+)
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
 * - Audio-based affinities are combined with custom spawn rate weights
 */
export class ClassSuggester {
    /**
     * Minimum probability for each class (4%)
     *
     * This ensures that even with unfavorable audio, every class has a chance.
     * The remaining (1 - baseline × num_classes) is distributed by affinity.
     */
    private static readonly BASELINE_PROBABILITY = 0.04;

    /**
     * Suggest a class based on audio frequency dominance
     *
     * **Phase 9 Algorithm:**
     * 1. Calculate affinity for each class based on audio profile
     * 2. Convert affinities to probabilities with 4% baseline
     * 3. Apply custom spawn rate weights (custom takes priority)
     * 4. Weighted random selection with seeded RNG
     *
     * The affinity system uses smooth scoring instead of hard thresholds:
     * - Each class has preferred audio traits (bass, treble, mid, amplitude)
     * - Primary trait contributes 100% of its weight
     * - Secondary trait contributes 50% of its weight
     * - Tertiary trait contributes 25% of its weight
     * - Result: Smooth affinity score based on how close audio is to "ideal"
     *
     * The baseline system ensures variety:
     * - Each class gets 4% minimum probability
     * - Audio can boost a class from 4% to 50%+
     * - No class ever has 0% chance
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

        // Step 1: Calculate affinity for each class based on audio profile
        const affinities = this.calculateAllAffinities(audioProfile, allClasses);

        // Step 2: Convert affinities to probabilities with 4% baseline
        const probabilities = this.calculateProbabilities(affinities);

        // Step 3: Get custom spawn rate weights from ExtensionManager
        const customWeights = manager.getWeights('classes');

        // Step 4: Apply custom weights (custom takes priority over audio-based probabilities)
        const finalProbabilities = this.applyCustomWeights(probabilities, customWeights, allClasses);

        // Step 5: Weighted random selection
        const choices = Object.entries(finalProbabilities).map(([cls, prob]) => [cls, prob]);
        return rng.weightedChoice(choices);
    }

    /**
     * Calculate affinity score for all classes based on audio profile
     *
     * Uses CLASS_AUDIO_PREFERENCES to determine how much each class "likes"
     * the current audio profile. Higher affinity = higher probability.
     *
     * Affinity calculation:
     * - Primary trait: audio_value × weight × 1.0
     * - Secondary trait: audio_value × weight × 0.5
     * - Tertiary trait: audio_value × weight × 0.25
     * - Chaos: variance across all traits × 0.5
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results
     * @param {Class[]} allClasses - All available classes (default + custom)
     * @returns {Record<Class, number>} Affinity scores for each class
     * @private
     */
    private static calculateAllAffinities(
        audioProfile: AudioProfile,
        allClasses: Class[]
    ): Record<string, number> {
        const affinities: Record<string, number> = {};

        for (const cls of allClasses) {
            affinities[cls] = this.calculateClassAffinity(audioProfile, cls);
        }

        return affinities;
    }

    /**
     * Calculate affinity score for a single class
     *
     * Each class has audio preferences defined in CLASS_AUDIO_PREFERENCES:
     * - primary: Most important audio trait (bass/treble/mid/amplitude/chaos)
     * - secondary: Optional secondary trait
     * - tertiary: Optional tertiary trait
     * - weights: Multipliers for each frequency band (0-1 range)
     *
     * Special trait: "chaos" rewards high variance across frequency bands
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results
     * @param {Class} characterClass - Class to calculate affinity for
     * @returns {number} Affinity score (0-1+ range, can exceed 1 with boosts)
     * @private
     */
    private static calculateClassAffinity(audioProfile: AudioProfile, characterClass: Class): number {
        const prefs = CLASS_AUDIO_PREFERENCES[characterClass];

        // Skip calculation if class has no preferences (custom class without defined preferences)
        if (!prefs) {
            return 0.5; // Neutral affinity for undefined classes
        }

        let affinity = 0;

        // Add primary trait contribution (100%)
        affinity += this.getTraitContribution(audioProfile, prefs.primary, prefs, 1.0);

        // Add secondary trait contribution (50%)
        if (prefs.secondary) {
            affinity += this.getTraitContribution(audioProfile, prefs.secondary, prefs, 0.5);
        }

        // Add tertiary trait contribution (25%)
        if (prefs.tertiary) {
            affinity += this.getTraitContribution(audioProfile, prefs.tertiary, prefs, 0.25);
        }

        return affinity;
    }

    /**
     * Get the contribution of a specific audio trait to affinity
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results
     * @param {AudioTrait} trait - The trait to get contribution for
     * @param prefs - Class audio preferences with weights
     * @param {number} multiplier - Contribution multiplier (1.0, 0.5, or 0.25)
     * @returns {number} Trait contribution to affinity
     * @private
     */
    private static getTraitContribution(
        audioProfile: AudioProfile,
        trait: AudioTrait,
        prefs: { bass?: number; treble?: number; mid?: number; amplitude?: number },
        multiplier: number
    ): number {
        switch (trait) {
            case 'bass':
                return (audioProfile.bass_dominance * (prefs.bass || 1.0)) * multiplier;
            case 'treble':
                return (audioProfile.treble_dominance * (prefs.treble || 1.0)) * multiplier;
            case 'mid':
                return (audioProfile.mid_dominance * (prefs.mid || 1.0)) * multiplier;
            case 'amplitude':
                return (audioProfile.average_amplitude * (prefs.amplitude || 1.0)) * multiplier;
            case 'chaos': {
                // Chaos rewards variance across frequency bands
                const bass = audioProfile.bass_dominance;
                const treble = audioProfile.treble_dominance;
                const mid = audioProfile.mid_dominance;
                // Calculate variance (how different the values are)
                const variance = Math.max(bass, treble, mid) - Math.min(bass, treble, mid);
                return variance * 0.5 * multiplier;
            }
            default:
                return 0;
        }
    }

    /**
     * Convert affinity scores to probabilities with 4% baseline
     *
     * Algorithm:
     * 1. Normalize affinities to 0-1 range
     * 2. Apply 4% baseline to each class
     * 3. Distribute remaining probability by normalized affinity
     * 4. Renormalize to ensure sum = 1.0
     *
     * Result: Each class has minimum 4% probability, audio influences remaining 52%
     * (for 12 classes: 12 × 4% = 48% baseline, 52% distributed by affinity)
     *
     * @param {Record<string, number>} affinities - Affinity scores for each class
     * @returns {Record<string, number>} Probabilities (sum = 1.0)
     * @private
     */
    private static calculateProbabilities(affinities: Record<string, number>): Record<string, number> {
        const classes = Object.keys(affinities);
        const numClasses = classes.length;

        if (numClasses === 0) {
            return {};
        }

        // Step 1: Sum all affinities
        const totalAffinity = Object.values(affinities).reduce((sum, val) => sum + val, 0);

        // Edge case: If all affinities are zero, use equal distribution
        if (totalAffinity === 0) {
            const equalProb = 1 / numClasses;
            const equalProbabilities: Record<string, number> = {};
            for (const cls of classes) {
                equalProbabilities[cls] = equalProb;
            }
            return equalProbabilities;
        }

        // Step 2: Calculate baseline and available probability
        const baselineTotal = this.BASELINE_PROBABILITY * numClasses;
        const availableProbability = 1 - baselineTotal;

        // Edge case: If baseline would exceed 100%, adjust baseline
        const adjustedBaseline = baselineTotal >= 1 ? (1 / numClasses) : this.BASELINE_PROBABILITY;
        const adjustedAvailable = baselineTotal >= 1 ? 0 : availableProbability;

        // Step 3: Calculate probabilities
        const probabilities: Record<string, number> = {};
        for (const cls of classes) {
            // Normalize affinity to 0-1 range
            const normalizedAffinity = affinities[cls] / totalAffinity;

            // Baseline ensures minimum probability
            // Affinity distributes remaining probability
            probabilities[cls] = adjustedBaseline + (normalizedAffinity * adjustedAvailable);
        }

        // Step 4: Renormalize to ensure sum = 1.0 (handles floating point errors)
        const totalProbability = Object.values(probabilities).reduce((sum, val) => sum + val, 0);
        for (const cls of classes) {
            probabilities[cls] /= totalProbability;
        }

        return probabilities;
    }

    /**
     * Apply custom spawn rate weights to probabilities
     *
     * Custom weights from ExtensionManager take priority over audio-based probabilities.
     * This allows users to override audio suggestions with their own preferences.
     *
     * If no custom weights exist, returns audio-based probabilities unchanged.
     * If custom weights exist, they replace the audio-based probabilities.
     *
     * @param {Record<string, number>} probabilities - Audio-based probabilities
     * @param {Record<string, number>} customWeights - Custom spawn rate weights
     * @param {Class[]} allClasses - All available classes
     * @returns {Record<string, number>} Final probabilities (sum = 1.0)
     * @private
     */
    private static applyCustomWeights(
        probabilities: Record<string, number>,
        customWeights: Record<string, number>,
        allClasses: Class[]
    ): Record<string, number> {
        // If no custom weights, use audio-based probabilities
        if (Object.keys(customWeights).length === 0) {
            return probabilities;
        }

        // Custom weights replace audio-based probabilities
        // Normalize custom weights to sum to 1.0
        const totalWeight = Object.values(customWeights).reduce((sum, val) => sum + Math.max(0, val), 0);

        if (totalWeight === 0) {
            // All weights are zero, fall back to audio-based probabilities
            return probabilities;
        }

        const finalProbabilities: Record<string, number> = {};

        // Apply custom weights to specified classes
        for (const [cls, weight] of Object.entries(customWeights)) {
            if (allClasses.includes(cls as Class)) {
                finalProbabilities[cls] = Math.max(0, weight) / totalWeight;
            }
        }

        // For classes without custom weights, use audio-based probabilities
        // scaled by the remaining probability
        const remainingProbability = 1 - Object.values(finalProbabilities).reduce((sum, val) => sum + val, 0);
        const audioTotal = Object.entries(probabilities)
            .filter(([cls]) => !customWeights[cls])
            .reduce((sum, [, val]) => sum + val, 0);

        for (const cls of allClasses) {
            if (!customWeights[cls] && probabilities[cls]) {
                if (audioTotal > 0) {
                    finalProbabilities[cls] = (probabilities[cls] / audioTotal) * remainingProbability;
                } else {
                    finalProbabilities[cls] = remainingProbability / allClasses.length;
                }
            }
        }

        return finalProbabilities;
    }
}
