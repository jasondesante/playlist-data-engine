import type { CharacterSheet, Class, Ability } from '../types/Character.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { SeededRNG } from '../../utils/random.js';
import { RACE_DATA, CLASS_DATA, PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';
import { RaceSelector } from './RaceSelector.js';
import { ClassSuggester } from './ClassSuggester.js';
import { AbilityScoreCalculator } from './AbilityScoreCalculator.js';
import { SkillAssigner } from './SkillAssigner.js';
import { AppearanceGenerator } from './AppearanceGenerator.js';

export interface CharacterGeneratorOptions {
    /** Starting level (default: 1) */
    level?: number;

    /** Override class suggestion */
    forceClass?: Class;
}

/**
 * Generate D&D 5e-compliant character sheets deterministically from audio signatures
 *
 * Uses seeded random number generation to ensure the same seed always produces
 * the same character. Combines audio frequency analysis with blockchain metadata
 * to create unique, reproducible characters.
 */
export class CharacterGenerator {
    /**
     * Generate a complete D&D 5e character sheet from audio profile and seed
     *
     * Deterministically generates:
     * - Race (with racial ability bonuses)
     * - Class (suggested by audio profile frequency analysis)
     * - Ability scores (based on bass/mid/treble dominance)
     * - Skills, proficiencies, and saving throws
     * - Hit points and armor class
     * - Character appearance (color-matched to audio)
     *
     * Same seed + audio profile = identical character every time.
     *
     * @param {string} seed - Deterministic seed (e.g., "chain-contract-tokenId")
     * @param {AudioProfile} audioProfile - Audio frequency analysis results
     * @param {string} name - Character name
     * @param {CharacterGeneratorOptions} [options] - Generation options
     * @param {number} [options.level=1] - Starting level (1-20)
     * @param {Class} [options.forceClass] - Override class suggestion
     * @returns {CharacterSheet} Complete D&D 5e character sheet
     *
     * @example
     * const character = CharacterGenerator.generate(
     *   'polygon-0x123-456',
     *   audioProfile,
     *   'Sonic Warrior',
     *   { level: 5 }
     * );
     * console.log(`${character.name}: Level ${character.level} ${character.class}`);
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
        const race = RaceSelector.select(rng);

        // Suggest class based on audio profile
        const suggestedClass = options.forceClass || ClassSuggester.suggest(audioProfile, rng);

        // Calculate base ability scores from audio profile
        const baseScores = AbilityScoreCalculator.calculateBaseScores(audioProfile);

        // Apply racial bonuses
        const abilityScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, race);

        // Calculate ability modifiers
        const abilityModifiers = AbilityScoreCalculator.calculateModifiers(abilityScores);

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

        // Assign skills based on class
        const skills = SkillAssigner.assignSkills(suggestedClass, rng);

        // Initialize saving throws
        const saving_throws: Record<Ability, boolean> = {
            STR: classData.saving_throws.includes('STR'),
            DEX: classData.saving_throws.includes('DEX'),
            CON: classData.saving_throws.includes('CON'),
            INT: classData.saving_throws.includes('INT'),
            WIS: classData.saving_throws.includes('WIS'),
            CHA: classData.saving_throws.includes('CHA'),
        };

        // Generate character appearance
        const appearance = AppearanceGenerator.generate(seed, suggestedClass, audioProfile);

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
            appearance,
            xp: {
                current: 0,
                next_level: XP_THRESHOLDS[level + 1] || 0,
            },
            seed,
            generated_at: new Date().toISOString(),
        };
    }
}
