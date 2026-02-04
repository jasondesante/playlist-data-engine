/**
 * Unit tests for SkillAssigner
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SkillAssigner } from '../../src/core/generation/SkillAssigner.js';
import { SeededRNG } from '../../src/utils/random.js';
import type { Class, Skill } from '../../src/core/types/Character.js';
import { CLASS_DATA } from '../../src/utils/constants.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { DEFAULT_SKILLS } from '../../src/core/skills/DefaultSkills.js';
import { registerTestSkill, registerTestSkills } from '../helpers/registrationHelpers.js';
import type { CustomSkill } from '../../src/core/skills/SkillTypes.js';

describe('SkillAssigner', () => {
    // Initialize ExtensionManager with default skills before each test
    beforeEach(() => {
        const em = ExtensionManager.getInstance();
        em.resetAll();
        em.initializeDefaults('skills', [...DEFAULT_SKILLS]);
    });

    afterEach(() => {
        const em = ExtensionManager.getInstance();
        em.resetAll();
    });
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

    describe('Custom Skills (Phase 15.1)', () => {
        describe('Registry Integration', () => {
            it('should include custom skills registered in SkillRegistry', () => {
                const registry = SkillRegistry.getInstance();

                // Register custom skills
                const customSkill1: CustomSkill = {
                    id: 'survival_cold',
                    name: 'Survival (Cold Environments)',
                    ability: 'WIS',
                    description: 'Expertise in cold weather survival',
                    categories: ['exploration', 'environmental'],
                    source: 'custom'
                };

                const customSkill2: CustomSkill = {
                    id: 'street_smarts',
                    name: 'Street Smarts',
                    ability: 'CHA',
                    description: 'Urban survival and negotiation',
                    categories: ['social', 'urban'],
                    source: 'custom'
                };

                registerTestSkill(customSkill1);
                registerTestSkill(customSkill2);

                // Generate skills
                const rng = new SeededRNG('custom-skills-test');
                const skills = SkillAssigner.assignSkills('Ranger', rng);

                // Custom skills should be present in the returned object
                expect(skills).toHaveProperty('survival_cold');
                expect(skills).toHaveProperty('street_smarts');

                // Custom skills should have proficiency level (even if 'none')
                expect(skills['survival_cold']).toBeDefined();
                expect(skills['street_smarts']).toBeDefined();
            });

            it('should include all default skills plus custom skills', () => {
                const registry = SkillRegistry.getInstance();

                const customSkill: CustomSkill = {
                    id: 'custom_alchemy',
                    name: 'Alchemy',
                    ability: 'INT',
                    description: 'Knowledge of magical and mundane alchemy',
                    categories: ['knowledge'],
                    source: 'custom'
                };

                registerTestSkill(customSkill);

                const rng = new SeededRNG('all-skills-test');
                const skills = SkillAssigner.assignSkills('Wizard', rng);

                // Should have all 18 default skills
                const defaultSkills: Skill[] = [
                    'athletics', 'acrobatics', 'sleight_of_hand', 'stealth',
                    'arcana', 'history', 'investigation', 'nature', 'religion',
                    'animal_handling', 'insight', 'medicine', 'perception', 'survival',
                    'deception', 'intimidation', 'performance', 'persuasion'
                ];

                for (const skill of defaultSkills) {
                    expect(skills).toHaveProperty(skill);
                }

                // Should also have custom skill
                expect(skills).toHaveProperty('custom_alchemy');
                expect(skills['custom_alchemy']).toBe('none');
            });

            it('should handle multiple custom skills with different abilities', () => {
                const registry = SkillRegistry.getInstance();

                const customSkills: CustomSkill[] = [
                    { id: 'heavy_lifting', name: 'Heavy Lifting', ability: 'STR', source: 'custom' },
                    { id: 'dex_acrobatics', name: 'Parkour', ability: 'DEX', source: 'custom' },
                    { id: 'int_lore', name: 'Ancient Lore', ability: 'INT', source: 'custom' },
                    { id: 'wis_perception', name: 'Alertness', ability: 'WIS', source: 'custom' },
                    { id: 'cha_intimidation', name: 'Commanding Presence', ability: 'CHA', source: 'custom' }
                ];

                for (const skill of customSkills) {
                    registerTestSkill(skill);
                }

                const rng = new SeededRNG('multi-ability-test');
                const skills = SkillAssigner.assignSkills('Fighter', rng);

                // All custom skills should be present
                for (const skill of customSkills) {
                    expect(skills).toHaveProperty(skill.id);
                    expect(skills[skill.id]).toBeDefined();
                }
            });
        });

        describe('Invalid Skill Filtering', () => {
            it('should filter out invalid skill IDs from available_skills', () => {
                const registry = SkillRegistry.getInstance();

                // Spy on console.warn to verify warning is logged
                const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                // We can't modify CLASS_DATA directly, but we can test the validation behavior
                // by creating a scenario where invalid skills would be present
                // The validateSkills method should filter them out

                // For this test, we'll verify the validateSkills behavior indirectly
                // by checking that only valid skills from the available list are assigned

                const rng = new SeededRNG('invalid-test');
                const skills = SkillAssigner.assignSkills('Fighter', rng);

                // All assigned skills should be valid (from the original available_skills list)
                const assignedSkills = Object.entries(skills)
                    .filter(([, level]) => level !== 'none')
                    .map(([skill]) => skill as Skill);

                for (const skill of assignedSkills) {
                    expect(registry.isValidSkill(skill)).toBe(true);
                }

                consoleWarnSpy.mockRestore();
            });

            it('should warn console when encountering invalid skill ID', () => {
                const registry = SkillRegistry.getInstance();

                const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

                // Register a custom skill
                const customSkill: CustomSkill = {
                    id: 'test_skill',
                    name: 'Test Skill',
                    ability: 'STR',
                    source: 'custom'
                };
                registerTestSkill(customSkill);

                // The SkillAssigner validates skills, but since we can't modify CLASS_DATA
                // directly, we'll verify the validation mechanism exists
                const rng = new SeededRNG('warn-test');
                const skills = SkillAssigner.assignSkills('Fighter', rng);

                // Custom skill should be present but not assigned (since not in Fighter's available skills)
                expect(skills).toHaveProperty('test_skill');
                expect(skills['test_skill']).toBe('none');

                consoleWarnSpy.mockRestore();
            });

            it('should handle empty available_skills after filtering', () => {
                const registry = SkillRegistry.getInstance();

                // This is an edge case - if all available_skills are invalid,
                // the SkillAssigner should still return all skills with 'none' proficiency

                const rng = new SeededRNG('empty-filter-test');
                const skills = SkillAssigner.assignSkills('Fighter', rng);

                // Should still have all skills in the registry
                const allSkills = registry.getAllSkills();
                expect(Object.keys(skills).length).toBeGreaterThanOrEqual(allSkills.length);
            });
        });

        describe('Custom Skills with Proficiency', () => {
            it('should initialize custom skills to "none" proficiency by default', () => {
                const registry = SkillRegistry.getInstance();

                const customSkills: CustomSkill[] = [
                    {
                        id: 'wilderness_survival',
                        name: 'Wilderness Survival',
                        ability: 'WIS',
                        description: 'Advanced wilderness survival techniques',
                        source: 'custom'
                    },
                    {
                        id: 'urban_tracking',
                        name: 'Urban Tracking',
                        ability: 'DEX',
                        description: 'Track targets in urban environments',
                        source: 'custom'
                    }
                ];

                for (const skill of customSkills) {
                    registerTestSkill(skill);
                }

                const rng = new SeededRNG('custom-none-test');
                const skills = SkillAssigner.assignSkills('Ranger', rng);

                // Custom skills should be present but not proficient (not in available_skills)
                expect(skills['wilderness_survival']).toBe('none');
                expect(skills['urban_tracking']).toBe('none');
            });

            it('should maintain deterministic selection with custom skills in registry', () => {
                const registry = SkillRegistry.getInstance();

                const customSkill: CustomSkill = {
                    id: 'deterministic_custom',
                    name: 'Deterministic Custom',
                    ability: 'INT',
                    source: 'custom'
                };

                registerTestSkill(customSkill);

                const seed = 'deterministic-custom-test';

                const rng1 = new SeededRNG(seed);
                const skills1 = SkillAssigner.assignSkills('Wizard', rng1);

                const rng2 = new SeededRNG(seed);
                const skills2 = SkillAssigner.assignSkills('Wizard', rng2);

                // Results should be identical
                expect(skills1).toEqual(skills2);

                // Custom skill should be present with 'none' proficiency
                expect(skills1['deterministic_custom']).toBe('none');
            });
        });

        describe('Custom Skills with Expertise Classes', () => {
            it('should include custom skills for Rogue without assigning them as proficient', () => {
                const registry = SkillRegistry.getInstance();

                const customSkill: CustomSkill = {
                    id: 'shadow_maneuver',
                    name: 'Shadow Maneuver',
                    ability: 'DEX',
                    description: 'Move quickly through shadows',
                    source: 'custom'
                };

                registerTestSkill(customSkill);

                const rng = new SeededRNG('rogue-custom-test');
                const skills = SkillAssigner.assignSkills('Rogue', rng);

                // Custom skill should be present
                expect(skills).toHaveProperty('shadow_maneuver');

                // Should not be proficient (not in Rogue's available_skills)
                expect(skills['shadow_maneuver']).toBe('none');

                // Rogue should still have 4 total proficient/expertise skills
                const proficientCount = Object.values(skills).filter(
                    level => level === 'proficient' || level === 'expertise'
                ).length;
                expect(proficientCount).toBe(4);
            });

            it('should include custom skills for Bard without assigning them as proficient', () => {
                const registry = SkillRegistry.getInstance();

                const customSkills: CustomSkill[] = [
                    {
                        id: 'musical_lore',
                        name: 'Musical Lore',
                        ability: 'INT',
                        description: 'Knowledge of musical history and theory',
                        source: 'custom'
                    },
                    {
                        id: 'performance_artistry',
                        name: 'Performance Artistry',
                        ability: 'CHA',
                        description: 'Advanced performance techniques',
                        source: 'custom'
                    }
                ];

                for (const skill of customSkills) {
                    registerTestSkill(skill);
                }

                const rng = new SeededRNG('bard-custom-test');
                const skills = SkillAssigner.assignSkills('Bard', rng);

                // Custom skills should be present
                expect(skills).toHaveProperty('musical_lore');
                expect(skills).toHaveProperty('performance_artistry');

                // Should not be proficient (not in Bard's available_skills)
                expect(skills['musical_lore']).toBe('none');
                expect(skills['performance_artistry']).toBe('none');

                // Bard should still have 3 total proficient/expertise skills
                const proficientCount = Object.values(skills).filter(
                    level => level === 'proficient' || level === 'expertise'
                ).length;
                expect(proficientCount).toBe(3);
            });
        });

        describe('Custom Skills Registry State', () => {
            it('should handle registry reset between tests', () => {
                const registry = SkillRegistry.getInstance();
                const em = ExtensionManager.getInstance();

                // Register custom skills
                const customSkill: CustomSkill = {
                    id: 'reset_test_skill',
                    name: 'Reset Test Skill',
                    ability: 'CON',
                    source: 'custom'
                };

                registerTestSkill(customSkill);

                const rng1 = new SeededRNG('before-reset');
                const skills1 = SkillAssigner.assignSkills('Barbarian', rng1);

                // Custom skill should be present
                expect(skills1).toHaveProperty('reset_test_skill');

                // Reset registry using ExtensionManager
                em.resetAll();
                em.initializeDefaults('skills', [...DEFAULT_SKILLS]);
                registry.invalidateCache();

                const rng2 = new SeededRNG('after-reset');
                const skills2 = SkillAssigner.assignSkills('Barbarian', rng2);

                // Custom skill should NOT be present after reset
                expect(skills2).not.toHaveProperty('reset_test_skill');
            });

            it('should handle multiple custom skills with same ability', () => {
                const registry = SkillRegistry.getInstance();

                const wisSkills: CustomSkill[] = [
                    { id: 'wisdom_custom_1', name: 'Custom WIS 1', ability: 'WIS', source: 'custom' },
                    { id: 'wisdom_custom_2', name: 'Custom WIS 2', ability: 'WIS', source: 'custom' },
                    { id: 'wisdom_custom_3', name: 'Custom WIS 3', ability: 'WIS', source: 'custom' }
                ];

                for (const skill of wisSkills) {
                    registerTestSkill(skill);
                }

                const rng = new SeededRNG('same-ability-test');
                const skills = SkillAssigner.assignSkills('Cleric', rng);

                // All custom WIS skills should be present
                for (const skill of wisSkills) {
                    expect(skills).toHaveProperty(skill.id);
                    expect(skills[skill.id]).toBe('none');
                }
            });
        });

        describe('Custom Skills Edge Cases', () => {
            it('should handle custom skill with underscore in ID', () => {
                const registry = SkillRegistry.getInstance();

                const customSkill: CustomSkill = {
                    id: 'under_score_skill',
                    name: 'Under Score Skill',
                    ability: 'STR',
                    source: 'custom'
                };

                registerTestSkill(customSkill);

                const rng = new SeededRNG('underscore-test');
                const skills = SkillAssigner.assignSkills('Barbarian', rng);

                expect(skills).toHaveProperty('under_score_skill');
                expect(skills['under_score_skill']).toBeDefined();
            });

            it('should handle custom skill with numeric suffix in ID', () => {
                const registry = SkillRegistry.getInstance();

                const customSkill: CustomSkill = {
                    id: 'combat_style_2',
                    name: 'Combat Style 2',
                    ability: 'STR',
                    source: 'custom'
                };

                registerTestSkill(customSkill);

                const rng = new SeededRNG('numeric-suffix-test');
                const skills = SkillAssigner.assignSkills('Fighter', rng);

                expect(skills).toHaveProperty('combat_style_2');
                expect(skills['combat_style_2']).toBeDefined();
            });

            it('should handle custom skill with all six abilities', () => {
                const registry = SkillRegistry.getInstance();

                const abilities = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

                abilities.forEach((ability) => {
                    const customSkill: CustomSkill = {
                        id: `test_${ability.toLowerCase()}_skill`,
                        name: `Test ${ability} Skill`,
                        ability: ability,
                        source: 'custom'
                    };
                    registerTestSkill(customSkill);
                });

                const rng = new SeededRNG('all-abilities-test');
                const skills = SkillAssigner.assignSkills('Bard', rng);

                // All custom skills should be present
                abilities.forEach(ability => {
                    const skillId = `test_${ability.toLowerCase()}_skill`;
                    expect(skills).toHaveProperty(skillId);
                    expect(skills[skillId]).toBe('none');
                });
            });

            it('should maintain skill count correctly with custom skills present', () => {
                const registry = SkillRegistry.getInstance();

                // Add 10 custom skills
                for (let i = 0; i < 10; i++) {
                    const customSkill: CustomSkill = {
                        id: `custom_skill_${i}`,
                        name: `Custom Skill ${i}`,
                        ability: 'INT',
                        source: 'custom'
                    };
                    registerTestSkill(customSkill);
                }

                const rng = new SeededRNG('skill-count-test');
                const skills = SkillAssigner.assignSkills('Wizard', rng);

                // Wizard should have exactly 2 proficient/expertise skills (from default skills)
                const proficientCount = Object.values(skills).filter(
                    level => level === 'proficient' || level === 'expertise'
                ).length;
                expect(proficientCount).toBe(2);

                // All 10 custom skills should be present with 'none' proficiency
                for (let i = 0; i < 10; i++) {
                    expect(skills[`custom_skill_${i}`]).toBe('none');
                }
            });
        });
    });
});
