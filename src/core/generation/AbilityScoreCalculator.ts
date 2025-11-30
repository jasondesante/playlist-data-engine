/**
 * Ability Score Calculator - Maps audio profile to ability scores
 * Based on ENGINE_DESIGN_DOCUMENT.md Section 6.B
 */

import type { AbilityScores, Race } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { RACE_DATA } from '../../utils/constants.js';

/**
 * Calculate D&D 5e ability scores and modifiers from audio characteristics
 *
 * Maps audio frequency dominance to six core abilities:
 * - STR: Strength (bass dominance)
 * - DEX: Dexterity (treble dominance)
 * - CON: Constitution (amplitude/power)
 * - INT: Intelligence (mid dominance)
 * - WIS: Wisdom (balance between bass and treble)
 * - CHA: Charisma (combined mid + amplitude)
 */
export class AbilityScoreCalculator {
    /**
     * Calculate base ability scores (8-15) from audio profile frequencies
     *
     * Maps audio frequency analysis to six D&D 5e ability scores:
     * - High bass → High Strength
     * - High treble → High Dexterity
     * - High amplitude → High Constitution
     * - High mid-range → High Intelligence and Charisma
     * - Balanced → High Wisdom
     *
     * @param {AudioProfile} audioProfile - Frequency analysis (bass/mid/treble/amplitude dominance)
     * @returns {AbilityScores} Base scores (before racial bonuses), range 8-15
     *
     * @example
     * const audioProfile = await analyzer.extractSonicFingerprint(audioUrl);
     * const baseScores = AbilityScoreCalculator.calculateBaseScores(audioProfile);
     * console.log(`STR: ${baseScores.STR}, DEX: ${baseScores.DEX}`);
     */
    static calculateBaseScores(audioProfile: AudioProfile): AbilityScores {
        const { bass_dominance, mid_dominance, treble_dominance, average_amplitude } = audioProfile;

        // Map audio characteristics to ability scores (8-15 base range)
        const baseRange = 7; // 8-15

        return {
            STR: Math.floor(8 + bass_dominance * baseRange),
            DEX: Math.floor(8 + treble_dominance * baseRange),
            CON: Math.floor(8 + average_amplitude * baseRange),
            INT: Math.floor(8 + mid_dominance * baseRange),
            WIS: Math.floor(8 + (1 - Math.abs(bass_dominance - treble_dominance)) * baseRange),
            CHA: Math.floor(8 + (mid_dominance + average_amplitude) / 2 * baseRange),
        };
    }

    /**
     * Apply racial ability bonuses to base scores
     *
     * Each D&D 5e race provides +2 bonuses to specific abilities. This function
     * applies those racial bonuses and ensures no ability exceeds the D&D maximum of 20.
     *
     * @param {AbilityScores} baseScores - Base scores before racial bonuses
     * @param {Race} race - Selected character race (e.g., 'Human', 'Elf', 'Dwarf')
     * @returns {AbilityScores} Final scores with racial bonuses applied (capped at 20)
     *
     * @example
     * const bonusedScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, 'Elf');
     * // For Elf: DEX +2, assuming baseScores.DEX was 14 → becomes 16
     */
    static applyRacialBonuses(baseScores: AbilityScores, race: Race): AbilityScores {
        const bonuses = RACE_DATA[race].ability_bonuses;
        const result = { ...baseScores };

        for (const [ability, bonus] of Object.entries(bonuses)) {
            const key = ability as keyof AbilityScores;
            result[key] = Math.min(20, result[key] + (bonus || 0));
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
