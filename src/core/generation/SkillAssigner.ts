/**
 * SkillAssigner - Assigns D&D 5e skill proficiencies based on character class
 */

import type { Class, Skill, ProficiencyLevel } from '../types/Character.js';
import type { SeededRNG } from '../../utils/random.js';
import { CLASS_DATA } from '../../utils/constants.js';

/**
 * All 18 D&D 5e skills
 */
const ALL_SKILLS: Skill[] = [
    'athletics',
    'acrobatics',
    'sleight_of_hand',
    'stealth',
    'arcana',
    'history',
    'investigation',
    'nature',
    'religion',
    'animal_handling',
    'insight',
    'medicine',
    'perception',
    'survival',
    'deception',
    'intimidation',
    'performance',
    'persuasion',
];

export class SkillAssigner {
    /**
     * Assign skill proficiencies based on character class
     * 
     * @param characterClass - The character's class
     * @param rng - Seeded random number generator for deterministic selection
     * @returns Record of all 18 skills with their proficiency levels
     */
    static assignSkills(
        characterClass: Class,
        rng: SeededRNG
    ): Record<Skill, ProficiencyLevel> {
        // Initialize all skills to 'none'
        const skills: Record<Skill, ProficiencyLevel> = {} as Record<Skill, ProficiencyLevel>;
        for (const skill of ALL_SKILLS) {
            skills[skill] = 'none';
        }

        // Get class data
        const classData = CLASS_DATA[characterClass];

        // Deterministically select skills from available skills
        const selectedSkills = this.selectRandomSkills(
            classData.available_skills,
            classData.skill_count,
            rng
        );

        // Assign proficiency to selected skills
        for (const skill of selectedSkills) {
            skills[skill] = 'proficient';
        }

        // Handle expertise for Bard and Rogue
        if (classData.has_expertise && classData.expertise_count) {
            const expertiseSkills = this.selectRandomSkills(
                selectedSkills,
                classData.expertise_count,
                rng
            );

            for (const skill of expertiseSkills) {
                skills[skill] = 'expertise';
            }
        }

        return skills;
    }

    /**
     * Deterministically select N random skills from a list
     * 
     * @param availableSkills - Array of skills to choose from
     * @param count - Number of skills to select
     * @param rng - Seeded random number generator
     * @returns Array of selected skills
     */
    private static selectRandomSkills(
        availableSkills: Skill[],
        count: number,
        rng: SeededRNG
    ): Skill[] {
        // Create a copy to avoid mutating the original
        const skillPool = [...availableSkills];

        // Fisher-Yates shuffle with seeded RNG, then take first N
        for (let i = skillPool.length - 1; i > 0; i--) {
            const j = Math.floor(rng.random() * (i + 1));
            [skillPool[i], skillPool[j]] = [skillPool[j], skillPool[i]];
        }

        // Take the first 'count' skills
        return skillPool.slice(0, count);
    }
}
