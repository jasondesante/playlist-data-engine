/**
 * Unit tests for SkillRegistry
 *
 * Tests the custom skill system including:
 * - Register custom skills
 * - Get skills by ability/category
 * - Validate skill IDs
 * - SkillRegistry as convenience wrapper around ExtensionManager
 *
 * **IMPORTANT**: SkillRegistry now reads from ExtensionManager.
 * Tests use ExtensionManager for initialization and reset.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { DEFAULT_SKILLS } from '../../src/core/skills/DefaultSkills.js';
import { registerTestSkill, registerTestSkills } from '../helpers/registrationHelpers.js';
import type { CustomSkill } from '../../src/core/skills/SkillTypes.js';
import type { Ability } from '../../src/core/types/Character.js';

describe('SkillRegistry', () => {
    let registry: SkillRegistry;
    let em: ExtensionManager;

    beforeEach(() => {
        // Get instances
        registry = SkillRegistry.getInstance();
        em = ExtensionManager.getInstance();
        // Reset to ensure clean state using ExtensionManager
        em.resetAll();
        // Invalidate SkillRegistry cache after EM reset
        registry.invalidateCache();
        // Initialize with default skills
        em.initializeDefaults('skills', [...DEFAULT_SKILLS]);
    });

    afterEach(() => {
        // Clean up after each test using ExtensionManager
        em.resetAll();
        // Invalidate SkillRegistry cache after EM reset
        registry.invalidateCache();
        // Restore defaults for next test
        em.initializeDefaults('skills', [...DEFAULT_SKILLS]);
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = SkillRegistry.getInstance();
            const instance2 = SkillRegistry.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should maintain state across getInstance calls', () => {
            const publicRegistry = SkillRegistry.getInstance();
            // With the new pattern, we just verify skills are available
            expect(publicRegistry.getSkillCount()).toBeGreaterThan(0);
        });
    });

    describe('Register Custom Skills', () => {
        it('should register a single custom skill', () => {
            const customSkill: CustomSkill = {
                id: 'custom_swimming',
                name: 'Swimming',
                description: 'Ability to swim and endure water environments.',
                ability: 'STR' as Ability,
                armorPenalty: true,
                categories: ['exploration', 'environmental'],
                source: 'custom'
            };

            registerTestSkill(customSkill);

            const retrieved = registry.getSkill('custom_swimming');
            expect(retrieved).toEqual(customSkill);

            // Verify it's stored in ExtensionManager
            const emSkills = em.get('skills') as CustomSkill[];
            expect(emSkills.some(s => s.id === 'custom_swimming')).toBe(true);
        });

        it('should register multiple custom skills', () => {
            const customSkills: CustomSkill[] = [
                {
                    id: 'custom_riding',
                    name: 'Animal Riding',
                    description: 'Ability to ride and control mounts.',
                    ability: 'DEX' as Ability,
                    source: 'custom'
                },
                {
                    id: 'custom_sailing',
                    name: 'Sailing',
                    description: 'Knowledge of ships and sailing.',
                    ability: 'INT' as Ability,
                    categories: ['exploration', 'knowledge'],
                    source: 'custom'
                }
            ];

            registerTestSkills(customSkills);

            expect(registry.getSkill('custom_riding')).toBeDefined();
            expect(registry.getSkill('custom_sailing')).toBeDefined();

            // Verify both are in ExtensionManager
            const emSkills = em.get('skills') as CustomSkill[];
            expect(emSkills.some(s => s.id === 'custom_riding')).toBe(true);
            expect(emSkills.some(s => s.id === 'custom_sailing')).toBe(true);
        });

        it('should allow duplicate skill ID registration (ExtensionManager does not prevent duplicates)', () => {
            const skill: CustomSkill = {
                id: 'duplicate_skill',
                name: 'Duplicate Skill',
                description: 'This skill is registered twice.',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            // ExtensionManager does not do duplicate detection
            // This test verifies that behavior - duplicates are allowed
            expect(() => {
                registerTestSkill(skill);
                registerTestSkill(skill);
            }).not.toThrow();

            // Verify the skill exists (may have duplicate entries)
            const retrieved = registry.getSkill('duplicate_skill');
            expect(retrieved).toBeDefined();
        });

        it('should validate skill ID format', () => {
            const invalidSkill: CustomSkill = {
                id: 'InvalidSkillName',
                name: 'Invalid',
                description: 'Invalid ID format.',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            expect(() => {
                registerTestSkill(invalidSkill);
            }).toThrow(/Invalid items for category 'skills'/);
        });

        it('should throw on invalid skill ID with numbers at start', () => {
            const invalidSkill: CustomSkill = {
                id: '1_invalid_skill',
                name: 'Invalid',
                description: 'Invalid ID format.',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            expect(() => {
                registerTestSkill(invalidSkill);
            }).toThrow(/Invalid items for category 'skills'/);
        });

        it('should accept valid skill IDs with underscores and numbers', () => {
            const validSkill: CustomSkill = {
                id: 'skill_3d_printing',
                name: '3D Printing',
                description: 'Valid ID with underscore and number.',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            expect(() => {
                registerTestSkill(validSkill);
            }).not.toThrow();
        });
    });

    describe('Get Skills', () => {
        beforeEach(() => {
            // Reset to clean state before adding custom skills
            em.resetAll();
            registry.invalidateCache();
            em.initializeDefaults('skills', [...DEFAULT_SKILLS]);

            // Add custom skills
            const customSkills: CustomSkill[] = [
                {
                    id: 'custom_alchemy',
                    name: 'Alchemy',
                    description: 'Knowledge of potions and chemicals.',
                    ability: 'INT' as Ability,
                    categories: ['knowledge', 'crafting'],
                    source: 'custom'
                },
                {
                    id: 'custom_intimidation_beast',
                    name: 'Beast Intimidation',
                    description: 'Intimidate animals and beasts.',
                    ability: 'CHA' as Ability,
                    categories: ['social', 'environmental'],
                    source: 'custom'
                }
            ];

            registerTestSkills(customSkills);
        });

        it('should get skill by ID', () => {
            const skill = registry.getSkill('athletics');
            expect(skill).toBeDefined();
            expect(skill?.id).toBe('athletics');
            expect(skill?.name).toBe('Athletics');
            expect(skill?.ability).toBe('STR');
        });

        it('should return undefined for non-existent skill ID', () => {
            const skill = registry.getSkill('non_existent_skill');
            expect(skill).toBeUndefined();
        });

        it('should get all registered skills', () => {
            const allSkills = registry.getAllSkills();
            expect(allSkills.length).toBe(20); // 18 default + 2 custom
        });

        it('should get skills by ability', () => {
            const strSkills = registry.getSkillsByAbility('STR' as Ability);
            expect(strSkills.length).toBeGreaterThan(0);
            expect(strSkills.some(s => s.id === 'athletics')).toBe(true);
        });

        it('should return empty array for ability with no skills', () => {
            // Clear all skills and verify empty
            em.resetAll();
            em.initializeDefaults('skills', []); // Clear defaults too
            registry.invalidateCache();

            const intSkills = registry.getSkillsByAbility('INT' as Ability);
            expect(intSkills).toEqual([]);
        });

        it('should get skills by category', () => {
            const knowledgeSkills = registry.getSkillsByCategory('knowledge');
            expect(knowledgeSkills.length).toBeGreaterThan(0);

            // Check that Arcana (knowledge category) is included
            expect(knowledgeSkills.some(s => s.id === 'arcana')).toBe(true);

            // Check custom alchemy skill is included
            expect(knowledgeSkills.some(s => s.id === 'custom_alchemy')).toBe(true);
        });

        it('should return empty array for category with no skills', () => {
            const nonexistentCategory = registry.getSkillsByCategory('nonexistent_category');
            expect(nonexistentCategory).toEqual([]);
        });

        it('should get all categories in use', () => {
            const categories = registry.getCategories();
            expect(categories.length).toBeGreaterThan(0);
            expect(categories).toContain('knowledge');
            expect(categories).toContain('physical');
            expect(categories).toContain('social');
            expect(categories).toContain('crafting');
        });

        it('should get skills by source', () => {
            const defaultSkills = registry.getSkillsBySource('default');
            const customSkills = registry.getSkillsBySource('custom');

            expect(defaultSkills.length).toBe(18);
            expect(customSkills.length).toBe(2);
        });
    });

    describe('Validate Skills', () => {
        it('should validate skill ID exists', () => {
            expect(registry.isValidSkill('athletics')).toBe(true);
            expect(registry.isValidSkill('non_existent')).toBe(false);
        });

        it('should validate valid skill structure', () => {
            const validSkill: CustomSkill = {
                id: 'valid_skill',
                name: 'Valid Skill',
                description: 'A valid skill.',
                ability: 'WIS' as Ability,
                source: 'custom'
            };

            const result = registry.validateSkill(validSkill);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail validation for missing id', () => {
            const invalidSkill = {
                name: 'No ID',
                ability: 'INT' as Ability,
                source: 'custom' as const
            };

            const result = registry.validateSkill(invalidSkill as CustomSkill);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Skill must have a valid id (string)');
        });

        it('should fail validation for missing name', () => {
            const invalidSkill = {
                id: 'no_name',
                ability: 'INT' as Ability,
                source: 'custom' as const
            };

            const result = registry.validateSkill(invalidSkill as CustomSkill);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Skill must have a valid name (string)');
        });

        it('should fail validation for missing ability', () => {
            const invalidSkill = {
                id: 'no_ability',
                name: 'No Ability',
                source: 'custom' as const
            };

            const result = registry.validateSkill(invalidSkill as CustomSkill);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Skill must have an ability (string)');
        });

        it('should fail validation for invalid ability', () => {
            const invalidSkill: CustomSkill = {
                id: 'invalid_ability',
                name: 'Invalid Ability',
                ability: 'XXX' as Ability,
                source: 'custom'
            };

            const result = registry.validateSkill(invalidSkill);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Invalid ability: "XXX"'))).toBe(true);
        });

        it('should fail validation for invalid source', () => {
            const invalidSkill = {
                id: 'invalid_source',
                name: 'Invalid Source',
                ability: 'INT' as Ability,
                source: 'invalid'
            };

            const result = registry.validateSkill(invalidSkill as CustomSkill);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Invalid source: "invalid"'))).toBe(true);
        });

        it('should fail validation for invalid ID format', () => {
            const invalidSkill: CustomSkill = {
                id: 'InvalidFormat',
                name: 'Invalid Format',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            const result = registry.validateSkill(invalidSkill);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('Skill id must use lowercase_with_underscores format: "InvalidFormat"'))).toBe(true);
        });

        it('should return multiple errors for multiple issues', () => {
            const invalidSkill = {
                name: 'Multiple Issues',
                ability: 'XXX' as Ability,
                source: 'invalid'
            };

            const result = registry.validateSkill(invalidSkill as CustomSkill);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });

    describe('Get Registry Statistics', () => {
        it('should return accurate stats for empty registry', () => {
            em.resetAll();
            em.initializeDefaults('skills', []); // Clear defaults too
            registry.invalidateCache();

            const stats = registry.getRegistryStats();

            expect(stats.totalSkills).toBe(0);
            expect(stats.defaultSkills).toBe(0);
            expect(stats.customSkills).toBe(0);
            expect(stats.categories).toEqual([]);
        });

        it('should return accurate stats after initialization', () => {
            const stats = registry.getRegistryStats();

            expect(stats.totalSkills).toBe(18);
            expect(stats.defaultSkills).toBe(18);
            expect(stats.customSkills).toBe(0);
            expect(stats.categories.length).toBeGreaterThan(0);
        });

        it('should track default vs custom skills separately', () => {
            const customSkills: CustomSkill[] = [
                {
                    id: 'custom_1',
                    name: 'Custom 1',
                    ability: 'STR' as Ability,
                    source: 'custom'
                },
                {
                    id: 'custom_2',
                    name: 'Custom 2',
                    ability: 'DEX' as Ability,
                    source: 'custom'
                }
            ];

            registerTestSkills(customSkills);

            const stats = registry.getRegistryStats();
            expect(stats.totalSkills).toBe(20);
            expect(stats.defaultSkills).toBe(18);
            expect(stats.customSkills).toBe(2);
        });

        it('should count skills per ability', () => {
            const stats = registry.getRegistryStats();

            // Check expected counts per ability
            expect(stats.skillsByAbility.STR).toBe(1); // athletics
            expect(stats.skillsByAbility.DEX).toBe(3); // acrobatics, sleight_of_hand, stealth
            expect(stats.skillsByAbility.INT).toBe(5); // arcana, history, investigation, nature, religion
            expect(stats.skillsByAbility.WIS).toBe(5); // animal_handling, insight, medicine, perception, survival
            expect(stats.skillsByAbility.CHA).toBe(4); // deception, intimidation, performance, persuasion
            expect(stats.skillsByAbility.CON).toBe(0); // No CON skills in D&D 5e
        });

        it('should track custom categories', () => {
            const customSkill: CustomSkill = {
                id: 'custom_foraging',
                name: 'Foraging',
                ability: 'WIS' as Ability,
                categories: ['exploration', 'survival', 'food'],
                source: 'custom'
            };

            registerTestSkill(customSkill);

            const stats = registry.getRegistryStats();
            expect(stats.categories).toContain('food');
        });
    });

    describe('Skill Categories and Tags', () => {
        it('should handle skills without categories', () => {
            const noCategorySkill: CustomSkill = {
                id: 'no_category',
                name: 'No Category',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            registerTestSkill(noCategorySkill);
            expect(registry.getSkill('no_category')).toBeDefined();
        });

        it('should handle skills with multiple categories', () => {
            const multiCategorySkill: CustomSkill = {
                id: 'multi_category',
                name: 'Multi Category',
                ability: 'WIS' as Ability,
                categories: ['exploration', 'survival', 'environmental', 'wilderness'],
                source: 'custom'
            };

            registerTestSkill(multiCategorySkill);

            // Should appear in all categories
            expect(registry.getSkillsByCategory('exploration').some(s => s.id === 'multi_category')).toBe(true);
            expect(registry.getSkillsByCategory('survival').some(s => s.id === 'multi_category')).toBe(true);
            expect(registry.getSkillsByCategory('environmental').some(s => s.id === 'multi_category')).toBe(true);
            expect(registry.getSkillsByCategory('wilderness').some(s => s.id === 'multi_category')).toBe(true);
        });

        it('should store tags on skills', () => {
            const taggedSkill: CustomSkill = {
                id: 'tagged_skill',
                name: 'Tagged Skill',
                ability: 'INT' as Ability,
                source: 'custom',
                tags: ['secret', 'advanced', 'requires_training']
            };

            registerTestSkill(taggedSkill);

            const retrieved = registry.getSkill('tagged_skill');
            expect(retrieved?.tags).toEqual(['secret', 'advanced', 'requires_training']);
        });

        it('should store custom properties', () => {
            const customPropsSkill: CustomSkill = {
                id: 'custom_props_skill',
                name: 'Custom Props Skill',
                ability: 'DEX' as Ability,
                source: 'custom',
                customProperties: {
                    toolType: 'musical',
                    requiresTraining: true,
                    synergy: ['performance', 'history'],
                    difficulty: 5
                }
            };

            registerTestSkill(customPropsSkill);

            const retrieved = registry.getSkill('custom_props_skill');
            expect(retrieved?.customProperties).toEqual({
                toolType: 'musical',
                requiresTraining: true,
                synergy: ['performance', 'history'],
                difficulty: 5
            });
        });

        it('should store armor penalty setting', () => {
            const armoredSkill: CustomSkill = {
                id: 'armored_skill',
                name: 'Armored Skill',
                ability: 'STR' as Ability,
                armorPenalty: true,
                source: 'custom'
            };

            registerTestSkill(armoredSkill);

            const retrieved = registry.getSkill('armored_skill');
            expect(retrieved?.armorPenalty).toBe(true);
        });

        it('should default armor penalty to false if not specified', () => {
            const noPenaltySkill: CustomSkill = {
                id: 'no_penalty',
                name: 'No Penalty',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            registerTestSkill(noPenaltySkill);

            const retrieved = registry.getSkill('no_penalty');
            expect(retrieved?.armorPenalty).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty skill ID format', () => {
            const emptyIdSkill: CustomSkill = {
                id: '',
                name: 'Empty ID',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            const result = registry.validateSkill(emptyIdSkill);
            expect(result.valid).toBe(false);
        });

        it('should handle skill with only special characters', () => {
            const specialCharSkill: CustomSkill = {
                id: '___',
                name: 'Special Chars',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            // Underscores alone are valid (start with letter is required)
            const result = registry.validateSkill(specialCharSkill);
            expect(result.valid).toBe(false);
        });

        it('should handle getting skill from empty registry', () => {
            em.resetAll();
            registry.invalidateCache();

            const skill = registry.getSkill('anything');
            expect(skill).toBeUndefined();
        });

        it('should handle skill with very long ID', () => {
            const longIdSkill: CustomSkill = {
                id: 'very_long_skill_id_with_many_underscores_and_characters',
                name: 'Long ID Skill',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            expect(() => {
                registerTestSkill(longIdSkill);
            }).not.toThrow();

            expect(registry.isValidSkill('very_long_skill_id_with_many_underscores_and_characters')).toBe(true);
        });
    });

    describe('getSkillCount', () => {
        it('should return 0 for empty registry', () => {
            em.resetAll();
            em.initializeDefaults('skills', []); // Clear defaults too
            registry.invalidateCache();

            const count = registry.getSkillCount();
            expect(count).toBe(0);
        });

        it('should return correct count after initialization', () => {
            const count = registry.getSkillCount();
            expect(count).toBe(18);
        });

        it('should return correct count after adding custom skills', () => {
            const customSkill: CustomSkill = {
                id: 'custom_count_test',
                name: 'Count Test',
                ability: 'INT' as Ability,
                source: 'custom'
            };

            registerTestSkill(customSkill);
            const count = registry.getSkillCount();
            expect(count).toBe(19);
        });

        it('should be consistent with getAllSkills().length', () => {
            const customSkills: CustomSkill[] = [
                {
                    id: 'custom_count_1',
                    name: 'Count 1',
                    ability: 'STR' as Ability,
                    source: 'custom'
                },
                {
                    id: 'custom_count_2',
                    name: 'Count 2',
                    ability: 'DEX' as Ability,
                    source: 'custom'
                },
                {
                    id: 'custom_count_3',
                    name: 'Count 3',
                    ability: 'INT' as Ability,
                    source: 'custom'
                }
            ];

            registerTestSkills(customSkills);

            const count = registry.getSkillCount();
            const allSkillsLength = registry.getAllSkills().length;

            expect(count).toBe(allSkillsLength);
            expect(count).toBe(21); // 18 default + 3 custom
        });

        it('should return correct count after reset', () => {
            expect(registry.getSkillCount()).toBe(18);

            em.resetAll();
            em.initializeDefaults('skills', []); // Clear defaults too
            registry.invalidateCache();
            expect(registry.getSkillCount()).toBe(0);
        });
    });

    describe('getAvailableSkills', () => {
        // Helper function to create a minimal character sheet
        function createMockCharacter(overrides: any = {}): any {
            return {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 5,
                ability_scores: {
                    STR: 14,
                    DEX: 12,
                    CON: 14,
                    INT: 10,
                    WIS: 10,
                    CHA: 10
                },
                ability_modifiers: {
                    STR: 2,
                    DEX: 1,
                    CON: 2,
                    INT: 0,
                    WIS: 0,
                    CHA: 0
                },
                proficiency_bonus: 3,
                hp: { current: 45, max: 45, temp: 0 },
                armor_class: 16,
                initiative: 1,
                speed: 30,
                skills: {},
                saving_throws: {
                    STR: false,
                    DEX: false,
                    CON: false,
                    INT: false,
                    WIS: false,
                    CHA: false
                },
                racial_traits: [],
                class_features: [],
                xp: { current: 6500, next_level: 14000 },
                seed: 'test-seed',
                generated_at: new Date().toISOString(),
                ...overrides
            } as any;
        }

        it('should return all skills when no prerequisites exist', () => {
            const character = createMockCharacter();
            const available = registry.getAvailableSkills(character);

            expect(available.length).toBe(18);
        });

        it('should return all default skills for character without restrictions', () => {
            const character = createMockCharacter({
                level: 10,
                class: 'Wizard',
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 18, WIS: 12, CHA: 10 } as any
            });
            const available = registry.getAvailableSkills(character);

            expect(available.length).toBe(18);
        });

        it('should filter skills by level prerequisite', () => {
            // Register a skill with level prerequisite
            const advancedSkill: CustomSkill = {
                id: 'advanced_skill',
                name: 'Advanced Skill',
                ability: 'INT' as Ability,
                prerequisites: { level: 10 },
                source: 'custom'
            };
            registerTestSkill(advancedSkill);

            // Low level character should not see the advanced skill
            const lowLevelCharacter = createMockCharacter({ level: 5 });
            const lowLevelAvailable = registry.getAvailableSkills(lowLevelCharacter);

            expect(lowLevelAvailable).not.toContainEqual(advancedSkill);
            expect(lowLevelAvailable.length).toBe(18); // Only default skills

            // High level character should see the advanced skill
            const highLevelCharacter = createMockCharacter({ level: 15 });
            const highLevelAvailable = registry.getAvailableSkills(highLevelCharacter);

            expect(highLevelAvailable).toContainEqual(advancedSkill);
            expect(highLevelAvailable.length).toBe(19); // 18 default + 1 advanced
        });

        it('should filter skills by ability prerequisite', () => {
            // Register a skill requiring high INT
            const highIntSkill: CustomSkill = {
                id: 'high_int_skill',
                name: 'High INT Skill',
                ability: 'INT' as Ability,
                prerequisites: { abilities: { INT: 16 } },
                source: 'custom'
            };
            registerTestSkill(highIntSkill);

            // Character with INT 10 should not see the skill
            const lowIntCharacter = createMockCharacter({
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } as any,
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 } as any
            });
            const lowIntAvailable = registry.getAvailableSkills(lowIntCharacter);

            expect(lowIntAvailable).not.toContainEqual(highIntSkill);
            expect(lowIntAvailable.length).toBe(18);

            // Character with INT 18 should see the skill
            const highIntCharacter = createMockCharacter({
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 18, WIS: 10, CHA: 10 } as any,
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 4, WIS: 0, CHA: 0 } as any
            });
            const highIntAvailable = registry.getAvailableSkills(highIntCharacter);

            expect(highIntAvailable).toContainEqual(highIntSkill);
            expect(highIntAvailable.length).toBe(19);
        });

        it('should filter skills by class prerequisite', () => {
            // Register a Wizard-only skill
            const wizardSkill: CustomSkill = {
                id: 'wizard_only_skill',
                name: 'Wizard Only Skill',
                ability: 'INT' as Ability,
                prerequisites: { class: 'Wizard' },
                source: 'custom'
            };
            registerTestSkill(wizardSkill);

            // Fighter should not see the Wizard skill
            const fighter = createMockCharacter({ class: 'Fighter' });
            const fighterAvailable = registry.getAvailableSkills(fighter);

            expect(fighterAvailable).not.toContainEqual(wizardSkill);
            expect(fighterAvailable.length).toBe(18);

            // Wizard should see the skill
            const wizard = createMockCharacter({ class: 'Wizard' });
            const wizardAvailable = registry.getAvailableSkills(wizard);

            expect(wizardAvailable).toContainEqual(wizardSkill);
            expect(wizardAvailable.length).toBe(19);
        });

        it('should filter skills by race prerequisite', () => {
            // Register an Elf-only skill
            const elfSkill: CustomSkill = {
                id: 'elf_only_skill',
                name: 'Elf Only Skill',
                ability: 'DEX' as Ability,
                prerequisites: { race: 'Elf' },
                source: 'custom'
            };
            registerTestSkill(elfSkill);

            // Human should not see the Elf skill
            const human = createMockCharacter({ race: 'Human' });
            const humanAvailable = registry.getAvailableSkills(human);

            expect(humanAvailable).not.toContainEqual(elfSkill);
            expect(humanAvailable.length).toBe(18);

            // Elf should see the skill
            const elf = createMockCharacter({ race: 'Elf' });
            const elfAvailable = registry.getAvailableSkills(elf);

            expect(elfAvailable).toContainEqual(elfSkill);
            expect(elfAvailable.length).toBe(19);
        });

        it('should filter skills by skill prerequisite', () => {
            // Register a skill that requires arcana proficiency
            const advancedArcanaSkill: CustomSkill = {
                id: 'advanced_arcana',
                name: 'Advanced Arcana',
                ability: 'INT' as Ability,
                prerequisites: { skills: ['arcana'] },
                source: 'custom'
            };
            registerTestSkill(advancedArcanaSkill);

            // Character without arcana proficiency should not see the skill
            const noProficiencyCharacter = createMockCharacter({ skills: {} });
            const noProficiencyAvailable = registry.getAvailableSkills(noProficiencyCharacter);

            expect(noProficiencyAvailable).not.toContainEqual(advancedArcanaSkill);
            expect(noProficiencyAvailable.length).toBe(18);

            // Character with arcana proficiency should see the skill
            const proficientCharacter = createMockCharacter({ skills: { arcana: 'proficient' } as any });
            const proficientAvailable = registry.getAvailableSkills(proficientCharacter);

            expect(proficientAvailable).toContainEqual(advancedArcanaSkill);
            expect(proficientAvailable.length).toBe(19);
        });

        it('should filter skills by feature prerequisite', () => {
            // Register a skill that requires a specific feature
            const featureSkill: CustomSkill = {
                id: 'feature_based_skill',
                name: 'Feature Based Skill',
                ability: 'CHA' as Ability,
                prerequisites: { features: ['draconic_bloodline'] },
                source: 'custom'
            };
            registerTestSkill(featureSkill);

            // Character without the feature should not see the skill
            const noFeatureCharacter = createMockCharacter({ class_features: [] });
            const noFeatureAvailable = registry.getAvailableSkills(noFeatureCharacter);

            expect(noFeatureAvailable).not.toContainEqual(featureSkill);
            expect(noFeatureAvailable.length).toBe(18);

            // Character with the feature should see the skill
            const hasFeatureCharacter = createMockCharacter({ class_features: ['draconic_bloodline'] });
            const hasFeatureAvailable = registry.getAvailableSkills(hasFeatureCharacter);

            expect(hasFeatureAvailable).toContainEqual(featureSkill);
            expect(hasFeatureAvailable.length).toBe(19);
        });

        it('should filter skills by spell prerequisite', () => {
            // Register a skill that requires knowing fireball
            const pyromancySkill: CustomSkill = {
                id: 'pyromancy_skill',
                name: 'Pyromancy Skill',
                ability: 'INT' as Ability,
                prerequisites: { spells: ['fireball'] },
                source: 'custom'
            };
            registerTestSkill(pyromancySkill);

            // Character without fireball should not see the skill
            const noSpellCharacter = createMockCharacter({
                spells: {
                    spell_slots: {},
                    known_spells: ['magic_missile'],
                    cantrips: []
                } as any
            });
            const noSpellAvailable = registry.getAvailableSkills(noSpellCharacter);

            expect(noSpellAvailable).not.toContainEqual(pyromancySkill);
            expect(noSpellAvailable.length).toBe(18);

            // Character with fireball should see the skill
            const hasSpellCharacter = createMockCharacter({
                spells: {
                    spell_slots: {},
                    known_spells: ['fireball'],
                    cantrips: []
                } as any
            });
            const hasSpellAvailable = registry.getAvailableSkills(hasSpellCharacter);

            expect(hasSpellAvailable).toContainEqual(pyromancySkill);
            expect(hasSpellAvailable.length).toBe(19);
        });

        it('should handle combined prerequisites', () => {
            // Register a skill with multiple prerequisites
            const multiPrereqSkill: CustomSkill = {
                id: 'multi_prereq_skill',
                name: 'Multi Prerequisite Skill',
                ability: 'CHA' as Ability,
                prerequisites: {
                    level: 5,
                    class: 'Sorcerer',
                    abilities: { CHA: 14 }
                },
                source: 'custom'
            };
            registerTestSkill(multiPrereqSkill);

            // Character not meeting all prerequisites should not see the skill
            const partialCharacter = createMockCharacter({
                class: 'Sorcerer',
                level: 5,
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } as any,
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 } as any
            });
            const partialAvailable = registry.getAvailableSkills(partialCharacter);

            expect(partialAvailable).not.toContainEqual(multiPrereqSkill);
            expect(partialAvailable.length).toBe(18);

            // Character meeting all prerequisites should see the skill
            const fullCharacter = createMockCharacter({
                class: 'Sorcerer',
                level: 5,
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 16 } as any,
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 3 } as any
            });
            const fullAvailable = registry.getAvailableSkills(fullCharacter);

            expect(fullAvailable).toContainEqual(multiPrereqSkill);
            expect(fullAvailable.length).toBe(19);
        });

        it('should return empty array for empty registry', () => {
            em.resetAll();
            em.initializeDefaults('skills', []); // Clear defaults too
            registry.invalidateCache();

            const character = createMockCharacter();
            const available = registry.getAvailableSkills(character);

            expect(available).toEqual([]);
        });

        it('should handle multiple skills with varying prerequisites', () => {
            // Register multiple custom skills with different prerequisites
            const skills: CustomSkill[] = [
                {
                    id: 'skill_level_3',
                    name: 'Level 3 Skill',
                    ability: 'STR' as Ability,
                    prerequisites: { level: 3 },
                    source: 'custom'
                },
                {
                    id: 'skill_level_10',
                    name: 'Level 10 Skill',
                    ability: 'DEX' as Ability,
                    prerequisites: { level: 10 },
                    source: 'custom'
                },
                {
                    id: 'skill_wisdom',
                    name: 'Wisdom Skill',
                    ability: 'WIS' as Ability,
                    prerequisites: { abilities: { WIS: 14 } },
                    source: 'custom'
                }
            ];
            registerTestSkills(skills);

            // Level 5 character with WIS 14 should see 2 of the custom skills
            const character = createMockCharacter({
                level: 5,
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 14, CHA: 10 } as any,
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 2, CHA: 0 } as any
            });
            const available = registry.getAvailableSkills(character);

            expect(available.length).toBe(20); // 18 default + 2 custom
            expect(available.some(s => s.id === 'skill_level_3')).toBe(true);
            expect(available.some(s => s.id === 'skill_wisdom')).toBe(true);
            expect(available.some(s => s.id === 'skill_level_10')).toBe(false);
        });
    });
});
