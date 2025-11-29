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
