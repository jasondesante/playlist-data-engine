/**
 * Basic character generator - creates D&D 5e characters from audio profiles
 */

import type { CharacterSheet, AbilityScores, Race, Class, Skill, ProficiencyLevel } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { RACE_DATA, CLASS_DATA, ALL_RACES, ALL_CLASSES, PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';

export interface CharacterGeneratorOptions {
    /** Starting level (default: 1) */
    level?: number;

    /** Override class suggestion */
    forceClass?: Class;
}

export class CharacterGenerator {
    /**
     * Generate a complete character sheet from seed and audio profile
     */
    static generate(
        seed: string,
        audioProfile: AudioProfile,
        name: string,
        options: CharacterGeneratorOptions = {}
    ): CharacterSheet {
        const rng = new SeededRNG(seed);
        const level = options.level || 1;

        // Select race deterministically from seed
        const race = this.selectRace(rng);

        // Suggest class based on audio profile
        const suggestedClass = options.forceClass || this.suggestClass(audioProfile, rng);

        // Calculate base ability scores from audio profile
        const baseScores = this.calculateAbilityScores(audioProfile, rng);

        // Apply racial bonuses
        const abilityScores = this.applyRacialBonuses(baseScores, race);

        // Calculate ability modifiers
        const abilityModifiers = this.calculateModifiers(abilityScores);

        // Get class data
        const classData = CLASS_DATA[suggestedClass];
        const raceData = RACE_DATA[race];

        // Calculate HP
        const maxHp = classData.hit_die + abilityModifiers.CON;

        // Calculate AC (base 10 + DEX modifier)
        const armorClass = 10 + abilityModifiers.DEX;

        // Calculate initiative
        const initiative = abilityModifiers.DEX;

        // Proficiency bonus
        const proficiencyBonus = PROFICIENCY_BONUS[level];

        // Initialize skills (all none for now - will be enhanced in Phase 2)
        const skills: Record<Skill, ProficiencyLevel> = {
            athletics: 'none',
            acrobatics: 'none',
            sleight_of_hand: 'none',
            stealth: 'none',
            arcana: 'none',
            history: 'none',
            investigation: 'none',
            nature: 'none',
            religion: 'none',
            animal_handling: 'none',
            insight: 'none',
            medicine: 'none',
            perception: 'none',
            survival: 'none',
            deception: 'none',
            intimidation: 'none',
            performance: 'none',
            persuasion: 'none',
        };

        // Initialize saving throws
        const saving_throws: Record<string, boolean> = {
            STR: classData.saving_throws.includes('STR'),
            DEX: classData.saving_throws.includes('DEX'),
            CON: classData.saving_throws.includes('CON'),
            INT: classData.saving_throws.includes('INT'),
            WIS: classData.saving_throws.includes('WIS'),
            CHA: classData.saving_throws.includes('CHA'),
        };

        return {
            name,
            race,
            class: suggestedClass,
            level,
            ability_scores: abilityScores,
            ability_modifiers: abilityModifiers,
            proficiency_bonus: proficiencyBonus,
            hp: {
                current: maxHp,
                max: maxHp,
                temp: 0,
            },
            armor_class: armorClass,
            initiative,
            speed: raceData.speed,
            skills,
            saving_throws,
            racial_traits: raceData.traits,
            class_features: [`${suggestedClass} Level ${level}`],
            xp: {
                current: 0,
                next_level: XP_THRESHOLDS[level + 1] || 0,
            },
            seed,
            generated_at: new Date().toISOString(),
        };
    }

    /**
     * Select race deterministically from seed
     */
    private static selectRace(rng: SeededRNG): Race {
        return rng.randomChoice(ALL_RACES);
    }

    /**
     * Suggest class based on audio profile
     */
    private static suggestClass(audioProfile: AudioProfile, rng: SeededRNG): Class {
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

    /**
     * Calculate base ability scores from audio profile
     */
    private static calculateAbilityScores(audioProfile: AudioProfile, rng: SeededRNG): AbilityScores {
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
    private static applyRacialBonuses(baseScores: AbilityScores, race: Race): AbilityScores {
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
    private static calculateModifiers(scores: AbilityScores): AbilityScores {
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
