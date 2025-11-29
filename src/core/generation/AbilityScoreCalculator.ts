/**
 * Ability Score Calculator - Maps audio profile to ability scores
 * Based on ENGINE_DESIGN_DOCUMENT.md Section 6.B
 */

import type { AbilityScores, Race } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { RACE_DATA } from '../../utils/constants.js';

export class AbilityScoreCalculator {
    /**
     * Calculate base ability scores from audio profile
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
     * Apply racial bonuses to ability scores (cap at 20)
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
     * Calculate ability modifiers from scores
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
