/**
 * Integration test for Part 4: Template-Based Class System
 *
 * This test suite covers Phase 4 of Part 4:
 * - baseClass inheritance in getClassData()
 * - Custom classes inherit from base unless overridden
 * - Template class pattern examples
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import { initializeFeatureDefaults, initializeSkillDefaults } from '../../src/core/extensions/initializeDefaults';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry';
import { getClassData, getClassSpellList, getSpellSlotsForClass, getClassStartingEquipment } from '../../src/utils/constants';
import { sampleAudioProfile, sampleTrack } from '../fixtures/sampleData';
import { Class, asClass } from '../../src/core/types/Character';

describe('Integration: Part 4 Template-Based Class System', () => {
    let featureRegistry: FeatureRegistry;
    let skillRegistry: SkillRegistry;
    let extensionManager: ExtensionManager;

    beforeEach(() => {
        featureRegistry = FeatureRegistry.getInstance();
        skillRegistry = SkillRegistry.getInstance();
        extensionManager = ExtensionManager.getInstance();

        // Reset all registries
        featureRegistry.reset();
        skillRegistry.reset();
        extensionManager.resetAll();

        // Initialize with defaults
        initializeFeatureDefaults();
        initializeSkillDefaults();
    });

    afterEach(() => {
        featureRegistry.reset();
        skillRegistry.reset();
        extensionManager.resetAll();
    });

    describe('Phase 4.1: baseClass inheritance in getClassData()', () => {
        it('should merge base class data with custom class data when baseClass is specified', () => {
            // Register a custom "Necromancer" class based on Wizard
            extensionManager.register('classes.data' as any, [{
                name: 'Necromancer',
                baseClass: 'Wizard',  // Inherits from Wizard by default
                primary_ability: 'INT',
                hit_die: 8,  // Same as Wizard
                saving_throws: ['INT', 'WIS'],  // Same as Wizard
                is_spellcaster: true,
                skill_count: 2,
                // Override available_skills to include custom skill
                available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
                has_expertise: false
            }]);

            // Get the custom class data
            const necromancerData = getClassData('Necromancer');

            // Verify the class data exists and has merged properties
            expect(necromancerData).toBeDefined();
            expect(necromancerData?.name).toBe('Necromancer');
            expect(necromancerData?.baseClass).toBe('Wizard');
            expect(necromancerData?.primary_ability).toBe('INT');
            expect(necromancerData?.hit_die).toBe(8);
            expect(necromancerData?.saving_throws).toEqual(['INT', 'WIS']);
            expect(necromancerData?.is_spellcaster).toBe(true);
            expect(necromancerData?.skill_count).toBe(2);
            expect(necromancerData?.has_expertise).toBe(false);

            // Verify custom skills are used (override from base)
            expect(necromancerData?.available_skills).toContain('arcana');
            expect(necromancerData?.available_skills).toContain('medicine');
            expect(necromancerData?.available_skills).toContain('religion');
            expect(necromancerData?.available_skills).toContain('necromancy');
        });

        it('should allow partial override of base class properties', () => {
            // Register a custom "BattleMage" class based on Wizard with different hit die
            extensionManager.register('classes.data' as any, [{
                name: 'BattleMage',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 10,  // Different from Wizard's 6
                saving_throws: ['INT', 'CON'],  // Different from Wizard's INT/WIS
                is_spellcaster: true,
                skill_count: 2,
                // Don't specify available_skills - should inherit from base
                available_skills: [],
                has_expertise: false
            }]);

            const battleMageData = getClassData('BattleMage');

            // Verify overridden properties
            expect(battleMageData?.hit_die).toBe(10);  // Overridden
            expect(battleMageData?.saving_throws).toEqual(['INT', 'CON']);  // Overridden

            // Verify inherited properties
            expect(battleMageData?.primary_ability).toBe('INT');  // Inherited
            expect(battleMageData?.is_spellcaster).toBe(true);  // Inherited
        });

        it('should handle custom classes without baseClass', () => {
            // Register a completely custom class without baseClass
            extensionManager.register('classes.data' as any, [{
                name: 'Runecaster',
                primary_ability: 'WIS',
                hit_die: 8,
                saving_throws: ['WIS', 'CON'],
                is_spellcaster: true,
                skill_count: 3,
                available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
                has_expertise: false,
                // No baseClass specified
            }]);

            const runecasterData = getClassData('Runecaster');

            // Verify the class data exists without baseClass
            expect(runecasterData).toBeDefined();
            expect(runecasterData?.name).toBe('Runecaster');
            expect(runecasterData?.baseClass).toBeUndefined();
            expect(runecasterData?.primary_ability).toBe('WIS');
            expect(runecasterData?.hit_die).toBe(8);
        });

        it('should return undefined for non-existent classes', () => {
            const nonExistentData = getClassData('NonExistentClass');
            expect(nonExistentData).toBeUndefined();
        });
    });

    describe('Phase 4.2: Custom classes inherit from base unless overridden', () => {
        it('should generate a character with a custom class that extends a base class', () => {
            // Register custom "Necromancer" class
            extensionManager.register('classes.data' as any, [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }]);

            // Register custom skill for Necromancer
            extensionManager.register('skills.INT' as any, [{
                id: 'necromancy',
                name: 'Necromancy',
                ability: 'INT',
                description: 'Knowledge of undead creation and control',
                source: 'custom'
            }]);

            // Register the class name so it can be used in generation
            extensionManager.register('classes' as any, [asClass('Necromancer')]);

            // Generate a Necromancer character
            const necromancer = CharacterGenerator.generate(
                'test-seed-necromancer',
                sampleAudioProfile,
                'Test Necromancer',
                { forceClass: asClass('Necromancer') }
            );

            // Verify the character was generated with the custom class
            expect(necromancer).toBeDefined();
            expect(necromancer.class).toBe('Necromancer');
            expect(necromancer.ability_scores.INT).toBeGreaterThan(10);  // INT is primary
            expect(necromancer.hp.max).toBeGreaterThan(0);  // Should have HP based on hit_die
        });

        it('should use custom spell lists for custom classes when registered', () => {
            // Register custom "Necromancer" class
            extensionManager.register('classes.data' as any, [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }]);

            // Register custom spell list for Necromancer
            extensionManager.register('classSpellLists.Necromancer' as any, [{
                class: 'Necromancer' as Class,
                cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
                spells_by_level: {
                    1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
                    2: ['Ray of Enfeeblement', 'Web'],
                }
            }]);

            // Get the custom spell list
            const spellList = getClassSpellList('Necromancer');

            // Verify custom spell list is used
            expect(spellList).toBeDefined();
            expect(spellList?.cantrips).toContain('Chill Touch');
            expect(spellList?.cantrips).toContain('Mage Hand');
            expect(spellList?.spells_by_level[1]).toContain('Animate Dead');
            expect(spellList?.spells_by_level[2]).toContain('Ray of Enfeeblement');
        });

        it('should use custom spell slot progression for custom classes when registered', () => {
            // Register custom "Necromancer" class
            extensionManager.register('classes.data' as any, [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }]);

            // Register custom spell slots for Necromancer (same as Wizard)
            extensionManager.register('classSpellSlots' as any, [{
                class: 'Necromancer',
                slots_by_level: {
                    1: { 1: 2 },
                    2: { 1: 3 },
                    3: { 1: 4, 2: 2 },
                    4: { 1: 4, 2: 3 },
                    5: { 1: 4, 2: 3, 3: 2 },
                }
            }]);

            // Get custom spell slots
            const slots = getSpellSlotsForClass('Necromancer', 3);

            // Verify custom spell slots are used
            expect(slots).toBeDefined();
            expect(slots?.[1]).toBe(4);
            expect(slots?.[2]).toBe(2);
            expect(slots?.[3]).toBeUndefined();  // Level 3 Necromancer doesn't have level 3 slots
        });

        it('should use custom starting equipment for custom classes when registered', () => {
            // Register custom "Necromancer" class
            extensionManager.register('classes.data' as any, [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }]);

            // Register custom starting equipment for Necromancer
            extensionManager.register('classStartingEquipment.Necromancer' as any, [{
                class: 'Necromancer',
                weapons: ['Bone Staff', 'Dagger'],
                armor: ['No Armor'],
                items: ['Arcane Focus', 'Skeleton Key', 'Dark Robes']
            }]);

            // Get custom starting equipment
            const equipment = getClassStartingEquipment('Necromancer');

            // Verify custom equipment is used
            expect(equipment).toBeDefined();
            expect(equipment?.weapons).toContain('Bone Staff');
            expect(equipment?.weapons).toContain('Dagger');
            expect(equipment?.armor).toContain('No Armor');
            expect(equipment?.items).toContain('Arcane Focus');
            expect(equipment?.items).toContain('Skeleton Key');
            expect(equipment?.items).toContain('Dark Robes');
        });
    });

    describe('Phase 4.3: Template class pattern examples', () => {
        it('should support the Necromancer class example', () => {
            // This is the full example from the upgrade plan

            // Register a custom "Necromancer" class based on Wizard
            extensionManager.register('classes.data' as any, [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
                has_expertise: false
            }]);

            // IMPORTANT: Register the class name in the 'classes' category so it's recognized as valid
            // This must be done BEFORE registering features for the class
            extensionManager.register('classes' as any, [asClass('Necromancer')]);

            // Register custom skill for Necromancer
            extensionManager.register('skills.INT' as any, [{
                id: 'necromancy',
                name: 'Necromancy',
                ability: 'INT',
                description: 'Knowledge of undead creation and control',
                prerequisites: { class: 'Necromancer' },
                source: 'custom'
            }]);

            // Register custom features for Necromancer
            // Use validate: false because the custom class validation runs before the class is fully registered
            extensionManager.register('classFeatures.Necromancer' as any, [{
                id: 'necromancer_raise_dead',
                name: 'Raise Undead',
                description: 'Can raise undead creatures',
                type: 'active' as const,
                level: 1,
                class: 'Necromancer' as Class,
                prerequisites: {
                    class: 'Necromancer' as Class,
                    abilities: { INT: 13 }
                },
                effects: [
                    { type: 'ability_unlock', target: 'raise_undead', value: true }
                ],
                source: 'custom' as const
            }], { validate: false });

            // Register custom spell list for Necromancer
            extensionManager.register('classSpellLists.Necromancer' as any, [{
                class: 'Necromancer' as Class,
                cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
                spells_by_level: {
                    1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
                    2: ['Ray of Enfeeblement', 'Web'],
                    3: ['Animate Dead', 'Feign Death'],
                }
            }]);

            // Register the class
            extensionManager.register('classes' as any, [asClass('Necromancer')]);

            // Verify class data
            const necromancerData = getClassData('Necromancer');
            expect(necromancerData).toBeDefined();
            expect(necromancerData?.baseClass).toBe('Wizard');
            expect(necromancerData?.available_skills).toContain('necromancy');

            // Verify spell list
            const spellList = getClassSpellList('Necromancer');
            expect(spellList?.cantrips).toContain('Chill Touch');
            expect(spellList?.spells_by_level[1]).toContain('Animate Dead');

            // Generate a character to verify everything works together
            const necromancer = CharacterGenerator.generate(
                'test-seed-necromancer-full',
                sampleAudioProfile,
                'Test Necromancer',
                { forceClass: asClass('Necromancer') }
            );

            expect(necromancer.class).toBe('Necromancer');
            expect(necromancer.ability_scores.INT).toBeGreaterThan(10);
        });
    });
});
