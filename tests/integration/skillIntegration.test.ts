/**
 * Integration test for SkillRegistry and ExtensionManager integration
 * Phase 13.1: Integrate SkillRegistry with ExtensionManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { initializeSkillDefaults } from '../../src/core/extensions/initializeDefaults.js';

describe('Phase 13.1: SkillRegistry Integration with ExtensionManager', () => {
    let registry: SkillRegistry;

    beforeEach(() => {
        // Get SkillRegistry instance
        registry = SkillRegistry.getInstance();

        // Reset instances for clean state
        ExtensionManager.getInstance().resetAll();

        // Invalidate SkillRegistry cache after EM reset
        registry.invalidateCache();

        // Initialize with default skills for each test
        initializeSkillDefaults();
    });

    it('should initialize ExtensionManager with default skills', () => {
        const manager = ExtensionManager.getInstance();

        // Check that general skills category is initialized
        const allSkills = manager.get('skills');
        expect(allSkills.length).toBeGreaterThan(0);
        expect(allSkills).toHaveLength(18); // 18 default D&D 5e skills
    });

    it('should initialize ability-specific skill categories', () => {
        const manager = ExtensionManager.getInstance();

        // Check STR skills
        const strSkills = manager.get('skills.STR');
        expect(strSkills.length).toBeGreaterThan(0);
        expect(strSkills[0].ability).toBe('STR');

        // Check DEX skills
        const dexSkills = manager.get('skills.DEX');
        expect(dexSkills.length).toBeGreaterThan(0);
        expect(dexSkills[0].ability).toBe('DEX');

        // Check INT skills
        const intSkills = manager.get('skills.INT');
        expect(intSkills.length).toBeGreaterThan(0);
        expect(intSkills[0].ability).toBe('INT');
    });

    it('should register custom skills with ExtensionManager and SkillRegistry', () => {
        const manager = ExtensionManager.getInstance();

        const customSkill = {
            id: 'test_survival',
            name: 'Survival (Test)',
            ability: 'WIS' as const,
            description: 'A test custom skill',
            categories: ['exploration', 'test'],
            source: 'custom' as const
        };

        // Register via ExtensionManager
        manager.register('skills', [customSkill]);

        // Check it's in ExtensionManager
        const allSkills = manager.get('skills');
        const customInManager = allSkills.find((s: any) => s.id === 'test_survival');
        expect(customInManager).toBeDefined();
        expect(customInManager.name).toBe('Survival (Test)');

        // Check it's also in SkillRegistry
        expect(registry.isValidSkill('test_survival')).toBe(true);
        
        const skillInRegistry = registry.getSkill('test_survival');
        expect(skillInRegistry).toBeDefined();
        expect(skillInRegistry?.name).toBe('Survival (Test)');
    });

    it('should validate custom skills during registration', () => {
        const manager = ExtensionManager.getInstance();

        // Invalid skill - missing required fields
        expect(() => {
            manager.register('skills', [{
                id: 'invalid_skill'
                // missing name, ability, source
            }], { validate: true });
        }).toThrow();
    });

    it('should validate skill ID format (lowercase_with_underscores)', () => {
        const manager = ExtensionManager.getInstance();

        // Invalid ID format
        expect(() => {
            manager.register('skills', [{
                id: 'InvalidSkillID',
                name: 'Invalid',
                ability: 'STR' as const,
                source: 'custom' as const
            }], { validate: true });
        }).toThrow();
    });

    it('should support spawn rate weights for skills', () => {
        const manager = ExtensionManager.getInstance();

        // Set custom weights
        manager.setWeights('skills', {
            'athletics': 2.0,      // Twice as likely
            'acrobatics': 0.5,     // Half as likely
            'stealth': 0.0         // Never spawns
        });

        const weights = manager.getWeights('skills');

        expect(weights['athletics']).toBe(2.0);
        expect(weights['acrobatics']).toBe(0.5);
        expect(weights['stealth']).toBe(0.0);
    });

    it('should register ability-specific skills and add them to registry', () => {
        const manager = ExtensionManager.getInstance();

        const customSkill = {
            id: 'custom_strength_skill',
            name: 'Custom Strength Skill',
            ability: 'STR' as const,
            description: 'A custom STR-based skill',
            source: 'custom' as const
        };

        // Register to STR-specific category (for organizational purposes)
        manager.register('skills.STR', [customSkill]);

        // Also need to register to main skills category for SkillRegistry to see it
        manager.register('skills', [customSkill]);

        // Check it's in SkillRegistry
        expect(registry.isValidSkill('custom_strength_skill')).toBe(true);
    });

    it('should handle skill list validation', () => {
        const manager = ExtensionManager.getInstance();

        // Valid skill list
        const skillList = {
            class: 'TestClass',
            skillCount: 2,
            availableSkills: ['athletics', 'acrobatics']
        };

        expect(() => {
            manager.register('skillLists', [skillList], { validate: true });
        }).not.toThrow();
    });

    it('should reject invalid skill lists', () => {
        const manager = ExtensionManager.getInstance();

        // Invalid skill list - negative skillCount
        expect(() => {
            manager.register('skillLists', [{
                class: 'TestClass',
                skillCount: -1,
                availableSkills: ['athletics']
            }], { validate: true });
        }).toThrow();

        // Invalid skill list - non-array availableSkills
        expect(() => {
            manager.register('skillLists', [{
                class: 'TestClass',
                skillCount: 2,
                availableSkills: 'not-an-array'
            }], { validate: true });
        }).toThrow();
    });

    // Additional integration tests for Task 3.2
    describe('Task 3.2: SkillRegistry/ExtensionManager Integration', () => {
        it('should register via ExtensionManager and SkillRegistry.getAllSkills() sees it', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom skill via ExtensionManager
            const customSkill = {
                id: 'test_custom_integration',
                name: 'Test Custom Integration Skill',
                ability: 'INT' as const,
                description: 'A skill for integration testing',
                categories: ['knowledge', 'test'],
                source: 'custom' as const
            };

            manager.register('skills', [customSkill]);

            // Verify SkillRegistry sees it via getAllSkills()
            const allSkills = registry.getAllSkills();
            expect(allSkills.some(s => s.id === 'test_custom_integration')).toBe(true);

            // Verify we can get it directly
            const retrieved = registry.getSkill('test_custom_integration');
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('Test Custom Integration Skill');
        });

        it('getSkillsByAbility() returns correct skills from EM data', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom STR skills via ExtensionManager
            const strSkills = [
                {
                    id: 'test_str_skill_1',
                    name: 'STR Skill 1',
                    ability: 'STR' as const,
                    description: 'First STR skill',
                    source: 'custom' as const
                },
                {
                    id: 'test_str_skill_2',
                    name: 'STR Skill 2',
                    ability: 'STR' as const,
                    description: 'Second STR skill',
                    categories: ['combat'],
                    source: 'custom' as const
                }
            ];

            manager.register('skills', strSkills);

            // Verify getSkillsByAbility returns correct skills
            const retrievedStrSkills = registry.getSkillsByAbility('STR');
            expect(retrievedStrSkills.some(s => s.id === 'test_str_skill_1')).toBe(true);
            expect(retrievedStrSkills.some(s => s.id === 'test_str_skill_2')).toBe(true);

            // Verify athletics (default STR skill) is still there
            expect(retrievedStrSkills.some(s => s.id === 'athletics')).toBe(true);
        });

        it('getSkillsByCategory() returns correct skills from EM data', () => {
            const manager = ExtensionManager.getInstance();

            // Register custom skills with specific categories
            const customSkills = [
                {
                    id: 'test_nature_skill',
                    name: 'Nature Lore',
                    ability: 'WIS' as const,
                    description: 'Knowledge of nature',
                    categories: ['nature', 'knowledge'],
                    source: 'custom' as const
                },
                {
                    id: 'test_social_skill',
                    name: 'Diplomacy',
                    ability: 'CHA' as const,
                    description: 'Social interaction',
                    categories: ['social', 'knowledge'],
                    source: 'custom' as const
                }
            ];

            manager.register('skills', customSkills);

            // Verify getSkillsByCategory returns correct skills
            const knowledgeSkills = registry.getSkillsByCategory('knowledge');
            expect(knowledgeSkills.some(s => s.id === 'test_nature_skill')).toBe(true);
            expect(knowledgeSkills.some(s => s.id === 'test_social_skill')).toBe(true);
            // Verify default knowledge skills are still there
            expect(knowledgeSkills.some(s => s.id === 'arcana')).toBe(true);
            expect(knowledgeSkills.some(s => s.id === 'history')).toBe(true);

            const socialSkills = registry.getSkillsByCategory('social');
            expect(socialSkills.some(s => s.id === 'test_social_skill')).toBe(true);
            // Verify default social skills are still there
            expect(socialSkills.some(s => s.id === 'persuasion')).toBe(true);
        });

        it('cache invalidation works after EM registration', () => {
            const manager = ExtensionManager.getInstance();

            // Get initial cache state
            const initialCount = registry.getAllSkills().length;
            expect(initialCount).toBe(18); // 18 default skills

            // Verify ability cache is built
            const initialStrSkills = registry.getSkillsByAbility('STR');
            expect(initialStrSkills.length).toBe(1); // Only athletics

            // Register new skill via ExtensionManager
            const newSkill = {
                id: 'test_cache_invalidation',
                name: 'Cache Invalidation Test',
                ability: 'STR' as const,
                description: 'Testing cache invalidation',
                source: 'custom' as const
            };

            manager.register('skills', [newSkill]);

            // Invalidate cache explicitly
            registry.invalidateCache();

            // Verify new skill is visible after cache invalidation
            const newCount = registry.getAllSkills().length;
            expect(newCount).toBe(19); // 18 default + 1 new

            const newStrSkills = registry.getSkillsByAbility('STR');
            expect(newStrSkills.length).toBe(2); // athletics + new skill
            expect(newStrSkills.some(s => s.id === 'test_cache_invalidation')).toBe(true);
        });

        it('getAvailableSkills() filters correctly from EM data', () => {
            const manager = ExtensionManager.getInstance();

            // Create a mock character with specific prerequisites
            const mockCharacter = {
                name: 'Test Character',
                race: 'Human',
                class: 'Wizard',
                level: 10,
                ability_scores: { STR: 10, DEX: 12, CON: 14, INT: 18, WIS: 14, CHA: 10 },
                ability_modifiers: { STR: 0, DEX: 1, CON: 2, INT: 4, WIS: 2, CHA: 0 },
                proficiency_bonus: 4,
                skills: {},
                class_features: [],
                racial_traits: []
            } as any;

            // Register skills with varying prerequisites via ExtensionManager
            const customSkills = [
                {
                    id: 'test_no_prereq',
                    name: 'No Prereq Skill',
                    ability: 'INT' as const,
                    description: 'Available to everyone',
                    source: 'custom' as const
                },
                {
                    id: 'test_level_prereq',
                    name: 'Level Prereq Skill',
                    ability: 'INT' as const,
                    description: 'Requires level 5',
                    prerequisites: { level: 5 },
                    source: 'custom' as const
                },
                {
                    id: 'test_high_level_prereq',
                    name: 'High Level Prereq Skill',
                    ability: 'INT' as const,
                    description: 'Requires level 15',
                    prerequisites: { level: 15 },
                    source: 'custom' as const
                },
                {
                    id: 'test_class_prereq',
                    name: 'Wizard Only Skill',
                    ability: 'INT' as const,
                    description: 'Wizard only',
                    prerequisites: { class: 'Wizard' },
                    source: 'custom' as const
                },
                {
                    id: 'test_int_prereq',
                    name: 'High INT Skill',
                    ability: 'INT' as const,
                    description: 'Requires INT 16',
                    prerequisites: { abilities: { INT: 16 } },
                    source: 'custom' as const
                }
            ];

            manager.register('skills', customSkills);

            // Get available skills
            const availableSkills = registry.getAvailableSkills(mockCharacter);

            // Verify filtering works correctly
            expect(availableSkills.some(s => s.id === 'test_no_prereq')).toBe(true);
            expect(availableSkills.some(s => s.id === 'test_level_prereq')).toBe(true);
            expect(availableSkills.some(s => s.id === 'test_class_prereq')).toBe(true);
            expect(availableSkills.some(s => s.id === 'test_int_prereq')).toBe(true);

            // High level prereq should NOT be available (character is level 10)
            expect(availableSkills.some(s => s.id === 'test_high_level_prereq')).toBe(false);
        });
    });
});
