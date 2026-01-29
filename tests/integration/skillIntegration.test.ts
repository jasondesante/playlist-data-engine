/**
 * Integration test for SkillRegistry and ExtensionManager integration
 * Phase 13.1: Integrate SkillRegistry with ExtensionManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { initializeSkillDefaults } from '../../src/core/extensions/initializeDefaults.js';

describe('Phase 13.1: SkillRegistry Integration with ExtensionManager', () => {
    beforeEach(() => {
        // Reset instances for clean state
        ExtensionManager.getInstance().resetAll();
        SkillRegistry.getInstance().reset();
    });

    it('should initialize ExtensionManager with default skills', () => {
        initializeSkillDefaults();

        const manager = ExtensionManager.getInstance();

        // Check that general skills category is initialized
        const allSkills = manager.get('skills');
        expect(allSkills.length).toBeGreaterThan(0);
        expect(allSkills).toHaveLength(18); // 18 default D&D 5e skills
    });

    it('should initialize ability-specific skill categories', () => {
        initializeSkillDefaults();

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
        initializeSkillDefaults();

        const manager = ExtensionManager.getInstance();
        const registry = SkillRegistry.getInstance();

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
        initializeSkillDefaults();

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
        initializeSkillDefaults();

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
        initializeSkillDefaults();

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
        initializeSkillDefaults();

        const manager = ExtensionManager.getInstance();
        const registry = SkillRegistry.getInstance();

        const customSkill = {
            id: 'custom_strength_skill',
            name: 'Custom Strength Skill',
            ability: 'STR' as const,
            description: 'A custom STR-based skill',
            source: 'custom' as const
        };

        // Register to STR-specific category
        manager.register('skills.STR', [customSkill]);

        // Check it's in SkillRegistry
        expect(registry.isValidSkill('custom_strength_skill')).toBe(true);
    });

    it('should handle skill list validation', () => {
        initializeSkillDefaults();

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
        initializeSkillDefaults();

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
});
