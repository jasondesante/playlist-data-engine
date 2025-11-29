/**
 * Unit tests for SkillAssigner
 */

import { describe, it, expect } from 'vitest';
import { SkillAssigner } from '../../src/core/generation/SkillAssigner.js';
import { SeededRNG } from '../../src/utils/random.js';
import type { Class, Skill, ProficiencyLevel } from '../../src/core/types/Character.js';
import { CLASS_DATA } from '../../src/utils/constants.js';

describe('SkillAssigner', () => {
    describe('assignSkills', () => {
        it('should return all 18 D&D skills', () => {
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Fighter', rng);

            const expectedSkills: Skill[] = [
                'athletics', 'acrobatics', 'sleight_of_hand', 'stealth',
                'arcana', 'history', 'investigation', 'nature', 'religion',
                'animal_handling', 'insight', 'medicine', 'perception', 'survival',
                'deception', 'intimidation', 'performance', 'persuasion'
            ];

            for (const skill of expectedSkills) {
                expect(skills).toHaveProperty(skill);
            }
        });

        it('should assign the correct number of proficient skills for each class', () => {
            const classes: Class[] = [
                'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
                'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
            ];

            for (const characterClass of classes) {
                const rng = new SeededRNG(`test-${characterClass}`);
                const skills = SkillAssigner.assignSkills(characterClass, rng);
                const classData = CLASS_DATA[characterClass];

                // Count proficient and expertise skills
                const proficientCount = Object.values(skills).filter(
                    level => level === 'proficient' || level === 'expertise'
                ).length;

                expect(proficientCount).toBe(classData.skill_count);
            }
        });

        it('should assign skills only from the class available skills list', () => {
            const classes: Class[] = [
                'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
                'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
            ];

            for (const characterClass of classes) {
                const rng = new SeededRNG(`test-${characterClass}`);
                const skills = SkillAssigner.assignSkills(characterClass, rng);
                const classData = CLASS_DATA[characterClass];

                // Get all assigned skills (proficient or expertise)
                const assignedSkills = Object.entries(skills)
                    .filter(([, level]) => level !== 'none')
                    .map(([skill]) => skill as Skill);

                // All assigned skills should be in the available skills list
                for (const skill of assignedSkills) {
                    expect(classData.available_skills).toContain(skill);
                }
            }
        });

        it('should be deterministic - same seed produces same skills', () => {
            const seed = 'deterministic-test';

            const rng1 = new SeededRNG(seed);
            const skills1 = SkillAssigner.assignSkills('Wizard', rng1);

            const rng2 = new SeededRNG(seed);
            const skills2 = SkillAssigner.assignSkills('Wizard', rng2);

            expect(skills1).toEqual(skills2);
        });

        it('should assign different skills for different seeds', () => {
            const rng1 = new SeededRNG('seed-1');
            const skills1 = SkillAssigner.assignSkills('Wizard', rng1);

            const rng2 = new SeededRNG('seed-2');
            const skills2 = SkillAssigner.assignSkills('Wizard', rng2);

            // At least one skill should be different
            const hasDifference = Object.keys(skills1).some(
                skill => skills1[skill as Skill] !== skills2[skill as Skill]
            );

            expect(hasDifference).toBe(true);
        });

        describe('Rogue expertise', () => {
            it('should assign 4 proficiencies and 2 expertise to Rogue', () => {
                const rng = new SeededRNG('rogue-test');
                const skills = SkillAssigner.assignSkills('Rogue', rng);

                const proficientSkills = Object.values(skills).filter(
                    level => level === 'proficient'
                );
                const expertiseSkills = Object.values(skills).filter(
                    level => level === 'expertise'
                );

                expect(proficientSkills.length).toBe(2); // 4 total - 2 expertise = 2 proficient
                expect(expertiseSkills.length).toBe(2);
            });

            it('should only assign expertise to skills that are proficient', () => {
                const rng = new SeededRNG('rogue-expertise-test');
                const skills = SkillAssigner.assignSkills('Rogue', rng);

                const expertiseSkills = Object.entries(skills)
                    .filter(([, level]) => level === 'expertise')
                    .map(([skill]) => skill);

                // All expertise skills should be from Rogue's available skills
                for (const skill of expertiseSkills) {
                    expect(CLASS_DATA.Rogue.available_skills).toContain(skill as Skill);
                }
            });
        });

        describe('Bard expertise', () => {
            it('should assign 3 proficiencies and 2 expertise to Bard', () => {
                const rng = new SeededRNG('bard-test');
                const skills = SkillAssigner.assignSkills('Bard', rng);

                const proficientSkills = Object.values(skills).filter(
                    level => level === 'proficient'
                );
                const expertiseSkills = Object.values(skills).filter(
                    level => level === 'expertise'
                );

                expect(proficientSkills.length).toBe(1); // 3 total - 2 expertise = 1 proficient
                expect(expertiseSkills.length).toBe(2);
            });

            it('should assign expertise from any skill (Bard has all skills available)', () => {
                const rng = new SeededRNG('bard-expertise-test');
                const skills = SkillAssigner.assignSkills('Bard', rng);

                const expertiseSkills = Object.entries(skills)
                    .filter(([, level]) => level === 'expertise')
                    .map(([skill]) => skill);

                expect(expertiseSkills.length).toBe(2);
            });
        });

        describe('Non-expertise classes', () => {
            it('should not assign expertise to Fighter', () => {
                const rng = new SeededRNG('fighter-test');
                const skills = SkillAssigner.assignSkills('Fighter', rng);

                const expertiseSkills = Object.values(skills).filter(
                    level => level === 'expertise'
                );

                expect(expertiseSkills.length).toBe(0);
            });

            it('should not assign expertise to Wizard', () => {
                const rng = new SeededRNG('wizard-test');
                const skills = SkillAssigner.assignSkills('Wizard', rng);

                const expertiseSkills = Object.values(skills).filter(
                    level => level === 'expertise'
                );

                expect(expertiseSkills.length).toBe(0);
            });
        });

        describe('Specific class skill counts', () => {
            it('should assign 2 skills to Barbarian', () => {
                const rng = new SeededRNG('barbarian-test');
                const skills = SkillAssigner.assignSkills('Barbarian', rng);

                const assignedSkills = Object.values(skills).filter(
                    level => level !== 'none'
                );

                expect(assignedSkills.length).toBe(2);
            });

            it('should assign 3 skills to Ranger', () => {
                const rng = new SeededRNG('ranger-test');
                const skills = SkillAssigner.assignSkills('Ranger', rng);

                const assignedSkills = Object.values(skills).filter(
                    level => level !== 'none'
                );

                expect(assignedSkills.length).toBe(3);
            });

            it('should assign 4 skills to Rogue (including expertise)', () => {
                const rng = new SeededRNG('rogue-count-test');
                const skills = SkillAssigner.assignSkills('Rogue', rng);

                const assignedSkills = Object.values(skills).filter(
                    level => level !== 'none'
                );

                expect(assignedSkills.length).toBe(4);
            });
        });
    });
});
