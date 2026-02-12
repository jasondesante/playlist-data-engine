/**
 * Ability Score Calculator - Maps audio profile to ability scores
 * Based on specs/001-core-engine/SPEC.md
 */

import type { AbilityScores } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { getRaceData } from '../../constants/DefaultRaces.js';
import type { SeededRNG } from '../../utils/random.js';

type Ability = keyof AbilityScores;

/**
 * Mapping of frequency band to assigned abilities
 */
interface FrequencyMapping {
    /** The two abilities assigned to this frequency band */
    abilities: [Ability, Ability];
    /** Whether first ability gets spice (randomized per character) */
    firstHasSpice: boolean;
}

/**
 * Calculate D&D 5e ability scores and modifiers from audio characteristics
 *
 * NEW SYSTEM (v2):
 * - Each frequency band (bass/mid/treble) is randomly assigned to 2 abilities
 * - 50% random + 50% audio-influenced for each ability
 * - One of each pair gets "spice" (combined with additional audio metrics)
 * - One of each pair uses pure dominance value
 *
 * This ensures every song generates different stat distributions.
 */
export class AbilityScoreCalculator {
    /**
     * Get a spiced audio value for a frequency band
     * Combines the dominance value with an additional metric for variety
     */
    private static getSpicedValue(
        band: 'bass' | 'mid' | 'treble',
        dominance: number,
        audioProfile: AudioProfile
    ): number {
        // Get the spice value, falling back to dominance if unavailable
        let spiceValue: number;

        switch (band) {
            case 'bass':
                // Bass pairs well with RMS energy (power) or dynamic range
                spiceValue = audioProfile.rms_energy ?? audioProfile.dynamic_range ?? dominance;
                break;
            case 'mid':
                // Mid pairs with spectral centroid (brightness) or dynamic range
                // Normalize spectral_centroid from Hz (typically 100-10000) to 0-1 range
                if (audioProfile.spectral_centroid !== undefined) {
                    spiceValue = Math.min(1, Math.max(0, (audioProfile.spectral_centroid - 100) / 9900));
                } else {
                    spiceValue = audioProfile.dynamic_range ?? dominance;
                }
                break;
            case 'treble':
                // Treble pairs with zero crossing rate (noisiness) or spectral centroid
                // Normalize spectral_centroid from Hz (typically 100-10000) to 0-1 range
                if (audioProfile.zero_crossing_rate !== undefined) {
                    spiceValue = audioProfile.zero_crossing_rate;
                } else if (audioProfile.spectral_centroid !== undefined) {
                    spiceValue = Math.min(1, Math.max(0, (audioProfile.spectral_centroid - 100) / 9900));
                } else {
                    spiceValue = dominance;
                }
                break;
        }

        // Average the dominance and spice values
        return (dominance + spiceValue) / 2;
    }

    /**
     * Create frequency-to-ability mappings using seeded RNG
     * Each frequency (bass/mid/treble) gets assigned 2 unique abilities
     */
    private static createFrequencyMappings(rng: SeededRNG): Map<'bass' | 'mid' | 'treble', FrequencyMapping> {
        const abilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        const mappings = new Map<'bass' | 'mid' | 'treble', FrequencyMapping>();

        // Shuffle abilities randomly
        const shuffled = rng.shuffle(abilities);

        // Assign 2 abilities to each frequency band
        const bands: Array<'bass' | 'mid' | 'treble'> = ['bass', 'mid', 'treble'];

        for (let i = 0; i < 3; i++) {
            const band = bands[i];
            const ability1 = shuffled[i * 2];
            const ability2 = shuffled[i * 2 + 1];

            // Randomly decide which ability gets the spice (50/50)
            const firstHasSpice = rng.random() < 0.5;

            mappings.set(band, {
                abilities: [ability1, ability2],
                firstHasSpice
            });
        }

        return mappings;
    }

    /**
     * Calculate base ability scores (8-15) from audio profile frequencies
     *
     * NEW SYSTEM:
     * - Randomly assigns bass/mid/treble to ability pairs (deterministic per seed)
     * - 50% random + 50% audio for each score
     * - One ability per pair gets "spiced" audio value
     * - Result: 8-15 range (D&D 5e standard array range)
     *
     * @param {AudioProfile} audioProfile - Frequency analysis results
     * @param {SeededRNG} rng - Seeded random number generator for reproducibility
     * @returns {AbilityScores} Base scores (before racial bonuses), range 8-15
     */
    static calculateBaseScores(audioProfile: AudioProfile, rng: SeededRNG): AbilityScores {
        const { bass_dominance, mid_dominance, treble_dominance } = audioProfile;

        // Create frequency-to-ability mappings
        const mappings = this.createFrequencyMappings(rng);

        // Initialize all abilities to minimum
        const scores: AbilityScores = {
            STR: 8,
            DEX: 8,
            CON: 8,
            INT: 8,
            WIS: 8,
            CHA: 8
        };

        const audioMultiplier = 3.5; // 50% of range (7 total)
        const randomMultiplier = 3.5; // 50% of range

        // Process each frequency band
        for (const [band, mapping] of mappings) {
            const [ability1, ability2] = mapping.abilities;
            const firstHasSpice = mapping.firstHasSpice;

            // Get the dominance value for this band
            let dominance: number;
            switch (band) {
                case 'bass':
                    dominance = bass_dominance;
                    break;
                case 'mid':
                    dominance = mid_dominance;
                    break;
                case 'treble':
                    dominance = treble_dominance;
                    break;
            }

            // Calculate audio influence for each ability
            const audioValue1 = firstHasSpice
                ? this.getSpicedValue(band, dominance, audioProfile)
                : dominance;

            const audioValue2 = firstHasSpice
                ? dominance
                : this.getSpicedValue(band, dominance, audioProfile);

            // Generate random values (0-1) for each ability
            const randomValue1 = rng.random();
            const randomValue2 = rng.random();

            // Calculate final scores: 8 + (random * 3.5) + (audio * 3.5)
            scores[ability1] = Math.floor(8 + (randomValue1 * randomMultiplier) + (audioValue1 * audioMultiplier));
            scores[ability2] = Math.floor(8 + (randomValue2 * randomMultiplier) + (audioValue2 * audioMultiplier));
        }

        return scores;
    }

    /**
     * Apply racial ability bonuses to base scores
     *
     * Each D&D 5e race provides +2 bonuses to specific abilities. This function
     * applies those racial bonuses and ensures no ability exceeds the D&D maximum of 20.
     *
     * Supports both default D&D 5e races and custom races registered via ExtensionManager.
     *
     * @param {AbilityScores} baseScores - Base scores before racial bonuses
     * @param {string} race - Selected character race (e.g., 'Human', 'Elf', 'Dwarf', or custom race)
     * @returns {AbilityScores} Final scores with racial bonuses applied (capped at 20)
     *
     * @example
     * // Default race
     * const bonusedScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, 'Elf');
     * // For Elf: DEX +2, assuming baseScores.DEX was 14 → becomes 16
     *
     * // Custom race (if registered via ExtensionManager)
     * const customScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, 'Dragonkin');
     */
    static applyRacialBonuses(baseScores: AbilityScores, race: string): AbilityScores {
        const raceData = getRaceData(race);

        if (!raceData) {
            console.warn(`Unknown race: "${race}", using no ability bonuses`);
            return { ...baseScores };
        }

        const bonuses = raceData.ability_bonuses;
        const result = { ...baseScores };

        if (bonuses) {
            for (const [ability, bonus] of Object.entries(bonuses)) {
                const key = ability as keyof AbilityScores;
                result[key] = Math.min(20, (result[key] || 0) + (bonus || 0));
            }
        }

        return result;
    }

    /**
     * Calculate ability modifiers from ability scores
     *
     * D&D 5e modifiers are derived from ability scores using the formula:
     * modifier = floor((score - 10) / 2)
     *
     * Example: Score 15 → modifier +2, Score 8 → modifier -1, Score 10 → modifier 0
     *
     * @param {AbilityScores} scores - Ability scores (3-20 range)
     * @returns {AbilityScores} Modifiers used for d20 rolls and damage calculations
     *
     * @example
     * const scores = { STR: 15, DEX: 14, CON: 13, INT: 12, WIS: 11, CHA: 10 };
     * const modifiers = AbilityScoreCalculator.calculateModifiers(scores);
     * console.log(`STR modifier: +${modifiers.STR}`);  // +2
     */
    static calculateModifiers(scores: AbilityScores): AbilityScores {
        return {
            STR: Math.floor((scores.STR - 10) / 2),
            DEX: Math.floor((scores.DEX - 10) / 2),
            CON: Math.floor((scores.CON - 10) / 2),
            INT: Math.floor((scores.INT - 10) / 2),
            WIS: Math.floor((scores.WIS - 10) / 2),
            CHA: Math.floor((scores.CHA - 10) / 2),
        };
    }
}
