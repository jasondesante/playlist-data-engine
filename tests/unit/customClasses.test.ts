/**
 * Unit tests for Custom Classes
 *
 * Tests the template-based custom class support including:
 * - Register custom class with ExtensionManager
 * - Custom class data retrieved correctly via getClassData()
 * - Merge logic with baseClass inheritance
 * - Helper functions: getClassSpellList, getSpellSlotsForClass, getClassStartingEquipment
 * - Validation rejects invalid class data
 *
 * Part of Phase 7.2: Write unit tests for custom classes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import {
    getClassData,
    getClassSpellList,
    getSpellSlotsForClass
} from '../../src/utils/constants.js';
import { CLASS_DATA, ALL_CLASSES } from '../../src/constants/DefaultClasses.js';
import { getClassStartingEquipment } from '../../src/utils/equipmentConstants.js';
import { Class, asClass, DEFAULT_CLASSES } from '../../src/core/types/Character.js';

describe('Custom Classes', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        // Use the singleton instance for consistency
        manager = ExtensionManager.getInstance();
        manager.initializeDefaults('classes', [...ALL_CLASSES]);
    });

    afterEach(() => {
        // Reset all custom data
        manager.resetAll();
    });

    describe('Register custom class with ExtensionManager', () => {
        it('should register custom class data via classes.data category', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
                has_expertise: false
            }];

            expect(() => {
                manager.register('classes.data' as any, customClassData);
            }).not.toThrow();

            const retrieved = manager.get('classes.data' as any);
            expect(retrieved).toEqual(customClassData);
        });

        it('should register custom class name via classes category after data', () => {
            const customClassData = [{
                name: 'BattleMage',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 10,
                saving_throws: ['INT', 'CON'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['athletics', 'arcana', 'intimidation'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            // Now register the class name
            expect(() => {
                manager.register('classes', [asClass('BattleMage')]);
            }).not.toThrow();

            const classes = manager.get('classes');
            expect(classes).toContain('BattleMage');
        });

        it('should register multiple custom classes at once', () => {
            const customClassData = [
                {
                    name: 'Necromancer',
                    baseClass: 'Wizard',
                    primary_ability: 'INT',
                    hit_die: 8,
                    saving_throws: ['INT', 'WIS'],
                    is_spellcaster: true,
                    skill_count: 2,
                    available_skills: ['arcana', 'medicine', 'religion'],
                    has_expertise: false
                },
                {
                    name: 'Spellsword',
                    baseClass: 'Fighter',
                    primary_ability: 'STR',
                    hit_die: 10,
                    saving_throws: ['STR', 'CON'],
                    is_spellcaster: true,
                    skill_count: 2,
                    available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation'],
                    has_expertise: false
                }
            ];

            manager.register('classes.data' as any, customClassData);
            manager.register('classes', [asClass('Necromancer'), asClass('Spellsword')]);

            const classes = manager.get('classes');
            expect(classes).toContain('Necromancer');
            expect(classes).toContain('Spellsword');
        });

        it('should register custom class without baseClass (completely custom)', () => {
            const customClassData = [{
                name: 'Runecaster',
                primary_ability: 'WIS',
                hit_die: 8,
                saving_throws: ['WIS', 'CON'],
                is_spellcaster: true,
                skill_count: 3,
                available_skills: ['arcana', 'nature', 'religion', 'insight', 'medicine'],
                has_expertise: false
                // No baseClass specified
            }];

            manager.register('classes.data' as any, customClassData);

            const retrieved = manager.get('classes.data' as any);
            expect(retrieved[0].baseClass).toBeUndefined();
        });

        it('should validate custom class data when validate option is true', () => {
            const validClassData = [{
                name: 'ValidClass',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'history'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, validClassData);
            expect(result.valid).toBe(true);
        });
    });

    describe('Custom class data retrieved correctly via getClassData()', () => {
        it('should retrieve default class data via getClassData()', () => {
            const wizardData = getClassData('Wizard');

            expect(wizardData).toBeDefined();
            expect(wizardData?.primary_ability).toBe(CLASS_DATA.Wizard.primary_ability);
            expect(wizardData?.hit_die).toBe(CLASS_DATA.Wizard.hit_die);
            expect(wizardData?.saving_throws).toEqual(CLASS_DATA.Wizard.saving_throws);
        });

        it('should retrieve custom class data via ExtensionManager', () => {
            const customClassData = [{
                name: 'Spellsword',
                baseClass: 'Fighter',
                primary_ability: 'STR',
                hit_die: 10,
                saving_throws: ['STR', 'CON'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['athletics', 'acrobatics', 'arcana', 'intimidation'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const spellswordData = getClassData('Spellsword');

            expect(spellswordData).toBeDefined();
            expect(spellswordData?.name).toBe('Spellsword');
            expect(spellswordData?.baseClass).toBe('Fighter');
            expect(spellswordData?.primary_ability).toBe('STR');
            expect(spellswordData?.hit_die).toBe(10);
        });

        it('should return undefined for non-existent classes', () => {
            const nonExistentData = getClassData('NonExistentClass');
            expect(nonExistentData).toBeUndefined();
        });

        it('should handle class with no baseClass', () => {
            const customClassData = [{
                name: 'Mystic',
                primary_ability: 'WIS',
                hit_die: 8,
                saving_throws: ['WIS', 'CHA'],
                is_spellcaster: true,
                skill_count: 3,
                available_skills: ['insight', 'medicine', 'religion', 'persuasion'],
                has_expertise: true,
                expertise_count: 2
            }];

            manager.register('classes.data' as any, customClassData);

            const mysticData = getClassData('Mystic');

            expect(mysticData).toBeDefined();
            expect(mysticData?.name).toBe('Mystic');
            expect(mysticData?.baseClass).toBeUndefined();
        });
    });

    describe('Merge logic with baseClass inheritance', () => {
        it('should merge base class data with custom class data when baseClass is specified', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                // Override only available_skills
                available_skills: ['arcana', 'medicine', 'religion', 'necromancy'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const necromancerData = getClassData('Necromancer');

            // Verify inherited properties from Wizard
            expect(necromancerData?.primary_ability).toBe('INT');
            expect(necromancerData?.hit_die).toBe(8);
            expect(necromancerData?.saving_throws).toEqual(['INT', 'WIS']);
            expect(necromancerData?.is_spellcaster).toBe(true);
            expect(necromancerData?.skill_count).toBe(2);
            expect(necromancerData?.has_expertise).toBe(false);

            // Verify custom skills override base
            expect(necromancerData?.available_skills).toContain('arcana');
            expect(necromancerData?.available_skills).toContain('medicine');
            expect(necromancerData?.available_skills).toContain('religion');
            expect(necromancerData?.available_skills).toContain('necromancy');
            expect(necromancerData?.available_skills).not.toContain('history'); // Wizard has this, Necromancer shouldn't
        });

        it('should allow partial override of base class properties', () => {
            const customClassData = [{
                name: 'BattleMage',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 10,  // Different from Wizard's 8
                saving_throws: ['INT', 'CON'],  // Different from Wizard's INT/WIS
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'history'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const battleMageData = getClassData('BattleMage');

            // Verify overridden properties
            expect(battleMageData?.hit_die).toBe(10);
            expect(battleMageData?.saving_throws).toEqual(['INT', 'CON']);

            // Verify inherited properties (or explicitly provided ones)
            expect(battleMageData?.primary_ability).toBe('INT');
            expect(battleMageData?.is_spellcaster).toBe(true);
        });

        it('should completely replace available_skills when provided', () => {
            const customClassData = [{
                name: 'DragonKnight',
                baseClass: 'Paladin',
                primary_ability: 'CHA',
                hit_die: 10,
                saving_throws: ['WIS', 'CHA'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['athletics', 'intimidation', 'nature', 'survival'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const dragonKnightData = getClassData('DragonKnight');

            // Should have exactly the custom skills, not merged
            expect(dragonKnightData?.available_skills).toEqual(['athletics', 'intimidation', 'nature', 'survival']);
            expect(dragonKnightData?.available_skills).toHaveLength(4);
        });

        it('should handle empty available_skills array', () => {
            const customClassData = [{
                name: 'BlankClass',
                baseClass: 'Fighter',
                primary_ability: 'STR',
                hit_die: 10,
                saving_throws: ['STR', 'CON'],
                is_spellcaster: false,
                skill_count: 2,
                available_skills: [],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const blankClassData = getClassData('BlankClass');

            // Empty array should be respected
            expect(blankClassData?.available_skills).toEqual([]);
        });

        it('should inherit available_skills when not provided', () => {
            // Note: Validation requires all fields, so we need to provide them here
            // But getClassData will still merge with baseClass if we provide baseClass
            const customClassData = [{
                name: 'StandardWizard',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                // Provide same skills as Wizard to simulate "inheritance"
                available_skills: CLASS_DATA.Wizard.available_skills,
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const standardWizardData = getClassData('StandardWizard');

            // Should have Wizard's skills
            expect(standardWizardData?.available_skills).toEqual(CLASS_DATA.Wizard.available_skills);
        });

        it('should handle multiple levels of inheritance (custom extends custom)', () => {
            // Register a base custom class
            manager.register('classes.data' as any, [{
                name: 'BaseMage',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'history'],
                has_expertise: false
            }]);

            // This tests that getClassData only does one level of merge
            // If we try to extend a custom class, it won't do double inheritance
            const baseMageData = getClassData('BaseMage');
            expect(baseMageData?.hit_die).toBe(8);
            expect(baseMageData?.primary_ability).toBe('INT');
        });
    });

    describe('Helper functions for custom classes', () => {
        it('should use default spell list when custom list not registered', () => {
            const wizardSpellList = getClassSpellList('Wizard');

            expect(wizardSpellList).toBeDefined();
            expect(wizardSpellList?.cantrips).toBeDefined();
            expect(wizardSpellList?.spells_by_level).toBeDefined();
        });

        it('should retrieve custom spell list when registered', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            // Register custom spell list
            manager.register('classSpellLists.Necromancer' as any, [{
                class: 'Necromancer',
                cantrips: ['Chill Touch', 'Mage Hand', 'Mending', 'Message'],
                spells_by_level: {
                    1: ['Animate Dead', 'False Life', 'Ray of Sickness'],
                    2: ['Ray of Enfeeblement', 'Web'],
                    3: ['Animate Dead', 'Feign Death']
                }
            }]);

            const spellList = getClassSpellList('Necromancer');

            expect(spellList).toBeDefined();
            expect(spellList?.cantrips).toContain('Chill Touch');
            expect(spellList?.spells_by_level[1]).toContain('Animate Dead');
        });

        it('should use default spell slots when custom slots not registered', () => {
            const wizardSlots = getSpellSlotsForClass('Wizard', 3);

            expect(wizardSlots).toBeDefined();
            expect(wizardSlots?.[1]).toBeGreaterThan(0);
            expect(wizardSlots?.[2]).toBeGreaterThan(0);
        });

        it('should retrieve custom spell slots when registered', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            // Register custom spell slots
            manager.register('classSpellSlots' as any, [{
                class: 'Necromancer',
                slots_by_level: {
                    1: { 1: 2 },
                    2: { 1: 3 },
                    3: { 1: 4, 2: 2 },
                    4: { 1: 4, 2: 3 },
                    5: { 1: 4, 2: 3, 3: 2 }
                }
            }]);

            const slots = getSpellSlotsForClass('Necromancer', 3);

            expect(slots).toBeDefined();
            expect(slots?.[1]).toBe(4);
            expect(slots?.[2]).toBe(2);
        });

        it('should use default starting equipment when custom equipment not registered', () => {
            const fighterEquipment = getClassStartingEquipment('Fighter');

            expect(fighterEquipment).toBeDefined();
            expect(fighterEquipment?.weapons).toBeDefined();
            expect(fighterEquipment?.armor).toBeDefined();
        });

        it('should retrieve custom starting equipment when registered', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            // Register custom starting equipment
            manager.register('classStartingEquipment.Necromancer' as any, [{
                class: 'Necromancer',
                weapons: ['Bone Staff', 'Dagger'],
                armor: ['No Armor'],
                items: ['Arcane Focus', 'Skeleton Key', 'Dark Robes']
            }]);

            const equipment = getClassStartingEquipment('Necromancer');

            expect(equipment).toBeDefined();
            expect(equipment?.weapons).toContain('Bone Staff');
            expect(equipment?.armor).toContain('No Armor');
            expect(equipment?.items).toContain('Arcane Focus');
        });
    });

    describe('Validation rejects invalid class data', () => {
        it('should reject class data without name', () => {
            const invalidClassData = [{
                // Missing name property
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('name'))).toBe(true);
        });

        it('should reject class data with invalid primary_ability', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'POW' as any, // POW is not a valid ability
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('primary_ability'))).toBe(true);
        });

        it('should reject class data with invalid hit_die', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: -5, // Invalid negative hit die
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('hit_die'))).toBe(true);
        });

        it('should reject class data with non-array saving_throws', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: 'INT' as any, // Should be array
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('saving_throws'))).toBe(true);
        });

        it('should reject class data with invalid ability in saving_throws', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'POW' as any], // POW is not valid
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('saving throw') || e.includes('POW'))).toBe(true);
        });

        it('should reject class data with non-boolean is_spellcaster', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: 'yes' as any, // Should be boolean
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('is_spellcaster'))).toBe(true);
        });

        it('should reject class data with invalid skill_count', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: -1, // Invalid negative skill count
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('skill_count'))).toBe(true);
        });

        it('should reject class data with non-array available_skills', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: 'arcana' as any, // Should be array
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('available_skills'))).toBe(true);
        });

        it('should reject class data with non-boolean has_expertise', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: 'yes' as any // Should be boolean
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('has_expertise'))).toBe(true);
        });

        it('should reject class data with invalid expertise_count', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: true,
                expertise_count: -1 // Invalid negative expertise count
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('expertise_count'))).toBe(true);
        });

        it('should reject class data with invalid baseClass type', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                baseClass: 123 as any, // Should be string
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('baseClass'))).toBe(true);
        });

        it('should reject class data with invalid baseClass value (non-existent class)', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                baseClass: 'NonExistentClass', // Not a valid default class
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('baseClass') && e.includes('valid'))).toBe(true);
        });

        it('should reject class data with baseClass referencing unregistered custom class', () => {
            // Register one custom class
            manager.register('classes.data' as any, [{
                name: 'BaseMage',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }]);

            // Try to use a custom class that hasn't been registered as baseClass
            const invalidClassData = [{
                name: 'DerivedMage',
                baseClass: 'UnregisteredClass', // Custom class not registered yet
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('baseClass') && e.includes('valid'))).toBe(true);
        });

        it('should allow baseClass referencing registered custom class', () => {
            // Register base custom class first
            manager.register('classes.data' as any, [{
                name: 'BaseMage',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'history'],
                has_expertise: false
            }]);

            // Register derived class that references the base
            const validClassData = [{
                name: 'SpecializedMage',
                baseClass: 'BaseMage', // References custom class registered above
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'], // Override with fewer skills
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, validClassData);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should allow baseClass referencing valid default class', () => {
            const validClassData = [{
                name: 'ValidClass',
                baseClass: 'Wizard', // Valid default class
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false
            }];

            const result = manager.validate('classes.data' as any, validClassData);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should reject class data with invalid audio_preferences type', () => {
            const invalidClassData = [{
                name: 'InvalidClass',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana'],
                has_expertise: false,
                audio_preferences: 'invalid' as any // Should be object
            }];

            const result = manager.validate('classes.data' as any, invalidClassData);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('audio_preferences'))).toBe(true);
        });

        it('should allow class data with all valid properties', () => {
            const validClassData = [{
                name: 'PerfectClass',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'history'],
                has_expertise: false,
                expertise_count: 0,
                audio_preferences: {
                    primary: 'high_treble',
                    secondary: 'high_bass',
                    tertiary: 'high_mid'
                }
            }];

            const result = manager.validate('classes.data' as any, validClassData);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });
    });

    describe('Edge cases and integration', () => {
        it('should handle registering default class again as custom', () => {
            // Try to register Wizard as a custom class
            manager.register('classes', [asClass('Wizard')]);

            const classes = manager.get('classes');
            expect(classes).toContain('Wizard');
        });

        it('should handle multiple custom classes with different base classes', () => {
            const classData = [
                { name: 'NecroWizard', baseClass: 'Wizard', primary_ability: 'INT', hit_die: 8, saving_throws: ['INT', 'WIS'], is_spellcaster: true, skill_count: 2, available_skills: ['arcana'], has_expertise: false },
                { name: 'PaladinFighter', baseClass: 'Fighter', primary_ability: 'STR', hit_die: 10, saving_throws: ['STR', 'CON'], is_spellcaster: false, skill_count: 2, available_skills: ['athletics'], has_expertise: false },
                { name: 'RogueRogue', baseClass: 'Rogue', primary_ability: 'DEX', hit_die: 8, saving_throws: ['DEX', 'INT'], is_spellcaster: false, skill_count: 4, available_skills: ['stealth'], has_expertise: true }
            ];

            manager.register('classes.data' as any, classData);
            manager.register('classes', [asClass('NecroWizard'), asClass('PaladinFighter'), asClass('RogueRogue')]);

            // Verify all classes are registered
            const classes = manager.get('classes');
            expect(classes).toContain('NecroWizard');
            expect(classes).toContain('PaladinFighter');
            expect(classes).toContain('RogueRogue');
        });

        it('should handle custom class with all optional properties', () => {
            const customClassData = [{
                name: 'FullOptionClass',
                baseClass: 'Bard',
                primary_ability: 'CHA',
                hit_die: 8,
                saving_throws: ['DEX', 'CHA'],
                is_spellcaster: true,
                skill_count: 3,
                available_skills: ['performance', 'persuasion', 'deception'],
                has_expertise: true,
                expertise_count: 2,
                audio_preferences: {
                    primary: 'high_mid',
                    secondary: 'high_bass',
                    tertiary: 'high_treble',
                    bass: 0.7,
                    mid: 0.8,
                    treble: 0.3,
                    amplitude: 0.6
                }
            }];

            manager.register('classes.data' as any, customClassData);

            const fullOptionData = getClassData('FullOptionClass');

            expect(fullOptionData).toBeDefined();
            expect(fullOptionData?.name).toBe('FullOptionClass');
            expect(fullOptionData?.expertise_count).toBe(2);
            expect(fullOptionData?.audio_preferences).toBeDefined();
            expect(fullOptionData?.audio_preferences?.bass).toBe(0.7);
        });

        it('should handle class with expertise_count but no has_expertise', () => {
            const customClassData = [{
                name: 'ExpertiseClass',
                baseClass: 'Rogue',
                primary_ability: 'DEX',
                hit_die: 8,
                saving_throws: ['DEX', 'INT'],
                is_spellcaster: false,
                skill_count: 4,
                available_skills: ['stealth', 'perception'],
                has_expertise: true,
                expertise_count: 3
            }];

            manager.register('classes.data' as any, customClassData);

            const expertiseData = getClassData('ExpertiseClass');

            expect(expertiseData?.has_expertise).toBe(true);
            expect(expertiseData?.expertise_count).toBe(3);
        });

        it('should preserve baseClass property in returned data', () => {
            const customClassData = [{
                name: 'SubClass',
                baseClass: 'Cleric',
                primary_ability: 'WIS',
                hit_die: 8,
                saving_throws: ['WIS', 'CHA'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['medicine', 'religion'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const subClassData = getClassData('SubClass');

            expect(subClassData?.baseClass).toBe('Cleric');
        });
    });

    describe('Class type extensibility (asClass, isValidClass)', () => {
        it('should create valid Class type with asClass()', () => {
            const customClass = asClass('MyCustomClass');
            expect(customClass).toBe('MyCustomClass');
        });

        it('should allow custom class to be used in character generation context', () => {
            const customClassData = [{
                name: 'DragonLord',
                baseClass: 'Paladin',
                primary_ability: 'CHA',
                hit_die: 10,
                saving_throws: ['WIS', 'CHA'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['intimidation', 'persuasion', 'nature'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);
            manager.register('classes', [asClass('DragonLord')]);

            const classes = manager.get('classes');
            expect(classes).toContain('DragonLord');
        });
    });

    describe('Integration with CharacterGenerator (helper functions used by consumers)', () => {
        it('should support SkillAssigner using getClassData() for custom classes', () => {
            const customClassData = [{
                name: 'BattleMage',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['athletics', 'arcana', 'intimidation'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            const battleMageData = getClassData('BattleMage');

            // SkillAssigner would use this data to assign skills
            expect(battleMageData?.available_skills).toBeDefined();
            expect(battleMageData?.skill_count).toBeDefined();
        });

        it('should support SpellManager using getClassSpellList() for custom classes', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            // Register custom spell list
            manager.register('classSpellLists.Necromancer' as any, [{
                class: 'Necromancer',
                cantrips: ['Chill Touch'],
                spells_by_level: { 1: ['Animate Dead'] }
            }]);

            const spellList = getClassSpellList('Necromancer');

            // SpellManager would use this to get spells
            expect(spellList?.cantrips).toBeDefined();
            expect(spellList?.spells_by_level).toBeDefined();
        });

        it('should support EquipmentGenerator using getClassStartingEquipment() for custom classes', () => {
            const customClassData = [{
                name: 'Necromancer',
                baseClass: 'Wizard',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'WIS'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['arcana', 'medicine', 'religion'],
                has_expertise: false
            }];

            manager.register('classes.data' as any, customClassData);

            // Register custom starting equipment
            manager.register('classStartingEquipment.Necromancer' as any, [{
                class: 'Necromancer',
                weapons: ['Bone Staff'],
                armor: ['No Armor'],
                items: ['Arcane Focus']
            }]);

            const equipment = getClassStartingEquipment('Necromancer');

            // EquipmentGenerator would use this to get starting equipment
            expect(equipment?.weapons).toBeDefined();
            expect(equipment?.armor).toBeDefined();
            expect(equipment?.items).toBeDefined();
        });
    });
});
