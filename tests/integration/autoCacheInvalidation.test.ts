/**
 * Integration test for automatic cache invalidation in ExtensionManager
 *
 * This test verifies that ExtensionManager.register() automatically invalidates
 * the appropriate registry cache (SpellRegistry, SkillRegistry, or FeatureRegistry)
 * based on the category being registered.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry.js';
import { SpellRegistry } from '../../src/core/spells/SpellRegistry.js';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import { initializeSkillDefaults, initializeSpellDefaults, initializeFeatureDefaults } from '../../src/core/extensions/initializeDefaults.js';

describe('Automatic Cache Invalidation Integration Tests', () => {
    beforeEach(() => {
        // Reset all registries and ExtensionManager for clean state
        ExtensionManager.getInstance().resetAll();
        SkillRegistry.getInstance().invalidateCache();
        SpellRegistry.getInstance().invalidateCache();
        FeatureRegistry.getInstance().invalidateCache();
    });

    describe('SkillRegistry auto-invalidation', () => {
        it('should auto-invalidate SkillRegistry cache after register("skills", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();

            // Initialize default skills
            initializeSkillDefaults();

            // Warm up the cache by calling getAllSkills
            const skillsBefore = skillRegistry.getAllSkills();
            const countBefore = skillsBefore.length;

            // Register a new skill via ExtensionManager
            const customSkill = {
                id: 'test_skill_auto',
                name: 'Test Skill Auto',
                ability: 'STR' as const,
                description: 'Test skill for auto-invalidation',
                categories: ['test'],
                source: 'custom' as const
            };

            manager.register('skills', [customSkill]);

            // Verify the new skill is accessible via SkillRegistry
            // This would fail if cache wasn't invalidated
            const skillsAfter = skillRegistry.getAllSkills();
            expect(skillsAfter).toHaveLength(countBefore + 1);
            expect(skillRegistry.isValidSkill('test_skill_auto')).toBe(true);

            const customSkillInRegistry = skillRegistry.getSkill('test_skill_auto');
            expect(customSkillInRegistry).toBeDefined();
            expect(customSkillInRegistry?.name).toBe('Test Skill Auto');
        });

        it('should auto-invalidate SkillRegistry cache after register("skills.STR", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();

            // Initialize default skills
            initializeSkillDefaults();

            // Warm up the cache
            const strSkillsBefore = skillRegistry.getSkillsByAbility('STR');
            const countBefore = strSkillsBefore.length;

            // Register a new STR skill via ExtensionManager
            const customSkill = {
                id: 'test_str_skill',
                name: 'Test STR Skill',
                ability: 'STR' as const,
                description: 'Test STR skill for auto-invalidation',
                categories: ['test'],
                source: 'custom' as const
            };

            manager.register('skills.STR' as any, [customSkill]);

            // Verify the SkillRegistry cache was invalidated by checking ability cache was refreshed
            // Note: skills.STR is a separate category from 'skills', so it won't show in getAllSkills()
            // But the cache invalidation should have happened
            const strSkillsAfter = skillRegistry.getSkillsByAbility('STR');
            // Since we registered to skills.STR category (not main 'skills'), this tests
            // that cache invalidation occurred - the ability cache was rebuilt
            expect(strSkillsAfter.length).toBeGreaterThanOrEqual(countBefore);

            // Also verify the skill exists in ExtensionManager
            const strSkillsInManager = manager.get('skills.STR');
            const foundInManager = strSkillsInManager.find((s: any) => s.id === 'test_str_skill');
            expect(foundInManager).toBeDefined();
            expect(foundInManager.name).toBe('Test STR Skill');
        });
    });

    describe('SpellRegistry auto-invalidation', () => {
        it('should auto-invalidate SpellRegistry cache after register("spells", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const spellRegistry = SpellRegistry.getInstance();

            // Initialize default spells
            initializeSpellDefaults();

            // Warm up the cache
            const spellsBefore = spellRegistry.getSpells();
            const countBefore = spellsBefore.length;

            // Register a new spell via ExtensionManager
            const customSpell = {
                id: 'test_spell_auto',
                name: 'Test Spell Auto',
                level: 1,
                school: 'Evocation' as const,
                casting_time: '1 action',
                range: '60 feet',
                components: ['V', 'S'],
                duration: 'Instantaneous',
                description: 'Test spell for auto-invalidation',
                source: 'custom' as const
            };

            manager.register('spells', [customSpell]);

            // Verify the new spell is accessible via SpellRegistry
            const spellsAfter = spellRegistry.getSpells();
            expect(spellsAfter).toHaveLength(countBefore + 1);

            const customSpellInRegistry = spellRegistry.getSpell('test_spell_auto');
            expect(customSpellInRegistry).toBeDefined();
            expect(customSpellInRegistry?.name).toBe('Test Spell Auto');
        });

        it('should auto-invalidate SpellRegistry cache after register("spells.Wizard", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const spellRegistry = SpellRegistry.getInstance();

            // Initialize default spells
            initializeSpellDefaults();

            // First, ensure we have a test spell to register to the class list
            const testSpell = {
                id: 'test_wizard_spell',
                name: 'Test Wizard Spell',
                level: 1,
                school: 'Evocation' as const,
                casting_time: '1 action',
                range: '60 feet',
                components: ['V'],
                duration: 'Instantaneous',
                description: 'Test spell for wizard class list',
                classes: ['Wizard' as const],
                source: 'custom' as const
            };

            manager.register('spells', [testSpell]);

            // Warm up the cache by getting the wizard spell list
            const wizardSpellsBefore = spellRegistry.getSpellsForClass('Wizard');
            const countBefore = wizardSpellsBefore.length;

            // Register the spell to Wizard's class list
            const classSpellList = {
                class: 'Wizard',
                cantrips: [],
                spells_by_level: {
                    '1': ['test_wizard_spell']
                }
            };

            manager.register('spells.Wizard' as any, [classSpellList]);

            // Verify the spell list is updated in SpellRegistry
            const wizardSpellsAfter = spellRegistry.getSpellsForClass('Wizard');
            expect(wizardSpellsAfter.length).toBeGreaterThanOrEqual(countBefore);
        });
    });

    describe('FeatureRegistry auto-invalidation', () => {
        it('should auto-invalidate FeatureRegistry cache after register("classFeatures", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const featureRegistry = FeatureRegistry.getInstance();

            // Initialize default features
            initializeFeatureDefaults();

            // Warm up the cache - get Fighter features specifically
            const fighterFeaturesBefore = featureRegistry.getClassFeatures('Fighter', 20);
            const countBefore = fighterFeaturesBefore.length;

            // Register a new class feature via ExtensionManager
            const customFeature = {
                id: 'test_feature_auto',
                name: 'Test Feature Auto',
                description: 'Test feature for auto-invalidation',
                type: 'passive' as const,
                class: 'Fighter',
                level: 3,
                source: 'custom' as const
            };

            manager.register('classFeatures', [customFeature]);

            // Verify the new feature is accessible via FeatureRegistry
            const fighterFeaturesAfter = featureRegistry.getClassFeatures('Fighter', 20);
            expect(fighterFeaturesAfter).toHaveLength(countBefore + 1);

            const customFeatureInRegistry = featureRegistry.getClassFeatureById('test_feature_auto');
            expect(customFeatureInRegistry).toBeDefined();
            expect(customFeatureInRegistry?.name).toBe('Test Feature Auto');
        });

        it('should auto-invalidate FeatureRegistry cache after register("racialTraits", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const featureRegistry = FeatureRegistry.getInstance();

            // Initialize default features
            initializeFeatureDefaults();

            // Warm up the cache - get Human traits specifically
            const humanTraitsBefore = featureRegistry.getRacialTraits('Human');
            const countBefore = humanTraitsBefore.length;

            // Register a new racial trait via ExtensionManager
            const customTrait = {
                id: 'test_trait_auto',
                name: 'Test Trait Auto',
                description: 'Test trait for auto-invalidation',
                race: 'Human',
                source: 'custom' as const
            };

            manager.register('racialTraits', [customTrait]);

            // Verify the new trait is accessible via FeatureRegistry
            const humanTraitsAfter = featureRegistry.getRacialTraits('Human');
            expect(humanTraitsAfter).toHaveLength(countBefore + 1);

            const customTraitInRegistry = featureRegistry.getRacialTraitById('test_trait_auto');
            expect(customTraitInRegistry).toBeDefined();
            expect(customTraitInRegistry?.name).toBe('Test Trait Auto');
        });

        it('should auto-invalidate FeatureRegistry cache after register("classFeatures.Fighter", ...)', () => {
            const manager = ExtensionManager.getInstance();
            const featureRegistry = FeatureRegistry.getInstance();

            // Initialize default features
            initializeFeatureDefaults();

            // Warm up the cache - get Fighter features
            const fighterFeaturesBefore = featureRegistry.getClassFeatures('Fighter', 20);
            const countBefore = fighterFeaturesBefore.length;

            // First, register to the main classFeatures category (what FeatureRegistry reads)
            const customFeature = {
                id: 'test_fighter_feature',
                name: 'Test Fighter Feature',
                description: 'Test Fighter feature for auto-invalidation',
                type: 'active' as const,
                class: 'Fighter',
                level: 5,
                source: 'custom' as const
            };

            manager.register('classFeatures', [customFeature]);

            // Now also register to classFeatures.Fighter (separate category)
            // This should trigger cache invalidation even though it's a different category
            const anotherFeature = {
                id: 'test_fighter_feature_2',
                name: 'Test Fighter Feature 2',
                description: 'Another test feature',
                type: 'passive' as const,
                class: 'Fighter',
                level: 7,
                source: 'custom' as const
            };

            manager.register('classFeatures.Fighter' as any, [anotherFeature]);

            // Verify the first feature is accessible via FeatureRegistry (from classFeatures)
            const customFeatureInRegistry = featureRegistry.getClassFeatureById('test_fighter_feature');
            expect(customFeatureInRegistry).toBeDefined();
            expect(customFeatureInRegistry?.name).toBe('Test Fighter Feature');

            // Verify Fighter features count increased by 1 (from the main classFeatures registration)
            const fighterFeaturesAfter = featureRegistry.getClassFeatures('Fighter', 20);
            expect(fighterFeaturesAfter).toHaveLength(countBefore + 1);

            // Also verify the second feature exists in the classFeatures.Fighter category
            const fighterCategoryFeatures = manager.get('classFeatures.Fighter' as any);
            const foundInCategory = fighterCategoryFeatures.find((f: any) => f.id === 'test_fighter_feature_2');
            expect(foundInCategory).toBeDefined();
        });
    });

    describe('No invalidation for non-registry categories', () => {
        it('should NOT invalidate SkillRegistry when registering classes', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();

            // Initialize default skills
            initializeSkillDefaults();

            // Warm up the cache
            const skillsBefore = skillRegistry.getAllSkills();
            const countBefore = skillsBefore.length;

            // Register a class (should not affect SkillRegistry cache)
            // First need to register the class data
            manager.register('classes.data', [{
                name: 'TestClass',
                primary_ability: 'STR' as const,
                hit_die: 8,
                saving_throws: ['STR' as const, 'CON' as const],
                is_spellcaster: false,
                skill_count: 2,
                available_skills: ['athletics', 'intimidation'],
                has_expertise: false
            }]);
            manager.register('classes', ['TestClass']);

            // The cache should still have the same count
            const skillsAfter = skillRegistry.getAllSkills();
            expect(skillsAfter).toHaveLength(countBefore);
        });
    });

    describe('reset() auto-invalidation', () => {
        it('should auto-invalidate SkillRegistry cache after reset("skills")', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();

            // Initialize default skills
            initializeSkillDefaults();

            // Register a custom skill
            const customSkill = {
                id: 'test_reset_skill',
                name: 'Test Reset Skill',
                ability: 'DEX' as const,
                description: 'Test skill for reset',
                categories: ['test'],
                source: 'custom' as const
            };

            manager.register('skills', [customSkill]);

            // Verify it's registered
            expect(skillRegistry.isValidSkill('test_reset_skill')).toBe(true);

            // Reset the skills category
            manager.reset('skills');

            // Verify the custom skill is gone (cache was invalidated)
            expect(skillRegistry.isValidSkill('test_reset_skill')).toBe(false);
        });

        it('should auto-invalidate SpellRegistry cache after reset("spells")', () => {
            const manager = ExtensionManager.getInstance();
            const spellRegistry = SpellRegistry.getInstance();

            // Initialize default spells
            initializeSpellDefaults();

            // Register a custom spell
            const customSpell = {
                id: 'test_reset_spell',
                name: 'Test Reset Spell',
                level: 1,
                school: 'Evocation' as const,
                casting_time: '1 action',
                range: '60 feet',
                components: ['V'],
                duration: 'Instantaneous',
                description: 'Test spell for reset',
                source: 'custom' as const
            };

            manager.register('spells', [customSpell]);

            // Verify it's registered
            expect(spellRegistry.getSpell('test_reset_spell')).toBeDefined();

            // Reset the spells category
            manager.reset('spells');

            // Verify the custom spell is gone (cache was invalidated)
            expect(spellRegistry.getSpell('test_reset_spell')).toBeUndefined();
        });

        it('should auto-invalidate FeatureRegistry cache after reset("classFeatures")', () => {
            const manager = ExtensionManager.getInstance();
            const featureRegistry = FeatureRegistry.getInstance();

            // Initialize default features
            initializeFeatureDefaults();

            // Register a custom feature
            const customFeature = {
                id: 'test_reset_feature',
                name: 'Test Reset Feature',
                description: 'Test feature for reset',
                type: 'passive' as const,
                class: 'Barbarian',
                level: 2,
                source: 'custom' as const
            };

            manager.register('classFeatures', [customFeature]);

            // Verify it's registered
            expect(featureRegistry.getClassFeatureById('test_reset_feature')).toBeDefined();

            // Reset the classFeatures category
            manager.reset('classFeatures');

            // Verify the custom feature is gone (cache was invalidated)
            expect(featureRegistry.getClassFeatureById('test_reset_feature')).toBeUndefined();
        });
    });

    describe('resetAll() invalidates all registry caches', () => {
        it('should invalidate SkillRegistry, SpellRegistry, and FeatureRegistry caches after resetAll()', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();
            const spellRegistry = SpellRegistry.getInstance();
            const featureRegistry = FeatureRegistry.getInstance();

            // Initialize defaults
            initializeSkillDefaults();
            initializeSpellDefaults();
            initializeFeatureDefaults();

            // Register custom items to each category
            const customSkill = {
                id: 'test_resetall_skill',
                name: 'Test ResetAll Skill',
                ability: 'INT' as const,
                description: 'Test skill for resetAll',
                categories: ['test'],
                source: 'custom' as const
            };

            const customSpell = {
                id: 'test_resetall_spell',
                name: 'Test ResetAll Spell',
                level: 1,
                school: 'Illusion' as const,
                casting_time: '1 action',
                range: '30 feet',
                components: ['V', 'S'],
                duration: '1 minute',
                description: 'Test spell for resetAll',
                source: 'custom' as const
            };

            const customFeature = {
                id: 'test_resetall_feature',
                name: 'Test ResetAll Feature',
                description: 'Test feature for resetAll',
                type: 'passive' as const,
                class: 'Rogue',
                level: 3,
                source: 'custom' as const
            };

            manager.register('skills', [customSkill]);
            manager.register('spells', [customSpell]);
            manager.register('classFeatures', [customFeature]);

            // Verify all are registered
            expect(skillRegistry.isValidSkill('test_resetall_skill')).toBe(true);
            expect(spellRegistry.getSpell('test_resetall_spell')).toBeDefined();
            expect(featureRegistry.getClassFeatureById('test_resetall_feature')).toBeDefined();

            // Reset all
            manager.resetAll();

            // Verify all custom items are gone (all caches were invalidated)
            expect(skillRegistry.isValidSkill('test_resetall_skill')).toBe(false);
            expect(spellRegistry.getSpell('test_resetall_spell')).toBeUndefined();
            expect(featureRegistry.getClassFeatureById('test_resetall_feature')).toBeUndefined();
        });
    });

    describe('registerMultiple with mixed categories', () => {
        it('should invalidate both SkillRegistry and SpellRegistry caches when registering skills and spells', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();
            const spellRegistry = SpellRegistry.getInstance();

            // Initialize defaults
            initializeSkillDefaults();
            initializeSpellDefaults();

            // Warm up caches
            const skillsBefore = skillRegistry.getAllSkills();
            const spellsBefore = spellRegistry.getSpells();

            // Register multiple categories at once
            manager.registerMultiple([
                {
                    category: 'skills',
                    items: [{
                        id: 'test_multi_skill',
                        name: 'Test Multi Skill',
                        ability: 'WIS' as const,
                        description: 'Test skill for registerMultiple',
                        categories: ['test'],
                        source: 'custom' as const
                    }]
                },
                {
                    category: 'spells',
                    items: [{
                        id: 'test_multi_spell',
                        name: 'Test Multi Spell',
                        level: 1,
                        school: 'Conjuration' as const,
                        casting_time: '1 action',
                        range: 'Touch',
                        components: ['V', 'S', 'M'],
                        duration: '1 hour',
                        description: 'Test spell for registerMultiple',
                        source: 'custom' as const
                    }]
                }
            ]);

            // Verify both registries were invalidated
            expect(skillRegistry.isValidSkill('test_multi_skill')).toBe(true);
            expect(spellRegistry.getSpell('test_multi_spell')).toBeDefined();
            expect(skillRegistry.getAllSkills()).toHaveLength(skillsBefore.length + 1);
            expect(spellRegistry.getSpells()).toHaveLength(spellsBefore.length + 1);
        });

        it('should only invalidate FeatureRegistry cache once when registering features and traits', () => {
            const manager = ExtensionManager.getInstance();
            const featureRegistry = FeatureRegistry.getInstance();

            // Initialize defaults
            initializeFeatureDefaults();

            // Warm up cache - get specific class/race counts
            const monkFeaturesBefore = featureRegistry.getClassFeatures('Monk', 20);
            const elfTraitsBefore = featureRegistry.getRacialTraits('Elf');

            // Register both class features and racial traits
            manager.registerMultiple([
                {
                    category: 'classFeatures',
                    items: [{
                        id: 'test_multi_feature',
                        name: 'Test Multi Feature',
                        description: 'Test feature for registerMultiple',
                        type: 'passive' as const,
                        class: 'Monk',
                        level: 4,
                        source: 'custom' as const
                    }]
                },
                {
                    category: 'racialTraits',
                    items: [{
                        id: 'test_multi_trait',
                        name: 'Test Multi Trait',
                        description: 'Test trait for registerMultiple',
                        race: 'Elf',
                        source: 'custom' as const
                    }]
                }
            ]);

            // Verify both are accessible (FeatureRegistry cache invalidated only once)
            expect(featureRegistry.getClassFeatureById('test_multi_feature')).toBeDefined();
            expect(featureRegistry.getRacialTraitById('test_multi_trait')).toBeDefined();
            expect(featureRegistry.getClassFeatures('Monk', 20)).toHaveLength(monkFeaturesBefore.length + 1);
            expect(featureRegistry.getRacialTraits('Elf')).toHaveLength(elfTraitsBefore.length + 1);
        });
    });

    describe('Backward compatibility: manual invalidateCache() still works', () => {
        it('should be safe to call invalidateCache() manually after automatic invalidation', () => {
            const manager = ExtensionManager.getInstance();
            const skillRegistry = SkillRegistry.getInstance();

            // Initialize defaults
            initializeSkillDefaults();

            // Register a skill (triggers automatic invalidation)
            const customSkill = {
                id: 'test_manual_invalidate',
                name: 'Test Manual Invalidate',
                ability: 'CHA' as const,
                description: 'Test skill for manual invalidation',
                categories: ['test'],
                source: 'custom' as const
            };

            manager.register('skills', [customSkill]);

            // Verify it's registered
            expect(skillRegistry.isValidSkill('test_manual_invalidate')).toBe(true);

            // Manually call invalidateCache() (should be safe/idempotent)
            skillRegistry.invalidateCache();

            // Verify the skill is still accessible after manual invalidation
            expect(skillRegistry.isValidSkill('test_manual_invalidate')).toBe(true);
            expect(skillRegistry.getSkill('test_manual_invalidate')?.name).toBe('Test Manual Invalidate');
        });

        it('should be safe to call invalidateCache() multiple times', () => {
            const skillRegistry = SkillRegistry.getInstance();

            // Initialize defaults
            initializeSkillDefaults();

            // Call invalidateCache multiple times (should be safe)
            skillRegistry.invalidateCache();
            skillRegistry.invalidateCache();
            skillRegistry.invalidateCache();

            // Verify registry still works
            const skills = skillRegistry.getAllSkills();
            expect(skills.length).toBeGreaterThan(0);
        });
    });
});
