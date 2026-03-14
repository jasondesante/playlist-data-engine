/**
 * Unit tests for ExtensionManager
 *
 * Tests the core extensibility system including:
 * - Register custom items
 * - Get merged data
 * - Reset to defaults
 * - Weight management
 * - Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ExtensionManager, type ExtensionCategory } from '../../src/core/extensions/ExtensionManager.js';
import { SPELL_DATABASE } from '../../src/constants/DefaultSpells.js';
import { ALL_RACES } from '../../src/utils/constants.js';
import { DEFAULT_RACE_DATA_ARRAY } from '../../src/constants/DefaultRaces.js';
import { ALL_CLASSES } from '../../src/constants/DefaultClasses.js';
import { DEFAULT_EQUIPMENT } from '../../src/constants/DefaultEquipment.js';

describe('ExtensionManager', () => {
    let manager: ExtensionManager;

    // Clean up singleton before each test
    beforeEach(() => {
        // Reset the singleton by creating a fresh instance
        manager = new ExtensionManager() as ExtensionManager; // Access private constructor for testing

        // Initialize with some default data for testing
        manager.initializeDefaults('equipment', Object.values(DEFAULT_EQUIPMENT));
        manager.initializeDefaults('spells', Object.values(SPELL_DATABASE));
        manager.initializeDefaults('races', [...ALL_RACES]);
        manager.initializeDefaults('races.data', [...DEFAULT_RACE_DATA_ARRAY]);
        manager.initializeDefaults('classes', [...ALL_CLASSES]);
        manager.initializeDefaults('appearance.bodyTypes', ['slender', 'athletic', 'muscular', 'stocky']);
        manager.initializeDefaults('appearance.skinTones', ['#F5E6D3', '#E8C4A0', '#D4A574']);
    });

    afterEach(() => {
        // Clean up after each test
        manager.resetAll();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = ExtensionManager.getInstance();
            const instance2 = ExtensionManager.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should maintain state across getInstance calls', () => {
            const publicManager = ExtensionManager.getInstance();
            publicManager.initializeDefaults('races', ['Human']);
            const categories = publicManager.getRegisteredCategories();
            expect(categories).toContain('races');
        });
    });

    describe('Initialize Defaults', () => {
        it('should initialize default data for a category', () => {
            manager.initializeDefaults('equipment', [{ name: 'Sword', type: 'weapon', rarity: 'common', weight: 3 }]);
            const items = manager.getDefaults('equipment');
            expect(items).toHaveLength(1);
            expect(items[0].name).toBe('Sword');
        });

        it('should initialize multiple categories at once', () => {
            const data = {
                'races': ['Human', 'Elf'],
                'classes': ['Fighter', 'Wizard']
            };
            manager.initializeAllDefaults(data);
            expect(manager.getRegisteredCategories()).toContain('races');
            expect(manager.getRegisteredCategories()).toContain('classes');
        });

        it('should return empty array for uninitialized category', () => {
            // Use a category that hasn't been initialized in beforeEach
            const items = manager.get('appearance.facialFeatures');
            expect(items).toEqual([]);
        });
    });

    describe('Register Custom Items', () => {
        it('should register custom equipment items', () => {
            const customEquipment = [
                { name: 'Dragon Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 },
                { name: 'Magic Shield', type: 'armor' as const, rarity: 'rare' as const, weight: 10 }
            ];

            manager.register('equipment', customEquipment);

            const merged = manager.get('equipment');
            expect(merged.length).toBeGreaterThan(Object.values(DEFAULT_EQUIPMENT).length);
            expect(merged.some((e: { name: string }) => e.name === 'Dragon Sword')).toBe(true);
            expect(merged.some((e: { name: string }) => e.name === 'Magic Shield')).toBe(true);
        });

        it('should register custom appearance options', () => {
            const customBodyTypes = ['giant', 'diminutive'];

            manager.register('appearance.bodyTypes', customBodyTypes);

            const merged = manager.get('appearance.bodyTypes');
            expect(merged).toContain('giant');
            expect(merged).toContain('diminutive');
            expect(merged).toContain('slender'); // Default still present
        });

        it('should register custom spells', () => {
            const customSpells = [
                {
                    name: 'Phoenix Fire',
                    level: 5,
                    school: 'Evocation',
                    casting_time: '1 action',
                    range: '60 feet',
                    components: ['V', 'S', 'M'],
                    duration: 'Instantaneous'
                }
            ];

            manager.register('spells', customSpells);

            const merged = manager.get('spells');
            expect(merged.some((s: { name: string }) => s.name === 'Phoenix Fire')).toBe(true);
        });

        it('should register custom races', () => {
            // First register custom race data so the race name is valid
            manager.register('races.data', [{
                race: 'CrystalElf',
                ability_bonuses: { DEX: 2 },
                speed: 30,
                traits: []
            }]);
            manager.register('races.data', [{
                race: 'ShadowFey',
                ability_bonuses: { CHA: 2 },
                speed: 35,
                traits: []
            }]);

            const customRaces = ['CrystalElf', 'ShadowFey'];

            manager.register('races', customRaces);

            const merged = manager.get('races');
            expect(merged).toContain('CrystalElf');
            expect(merged).toContain('ShadowFey');
        });

        it('should register custom classes', () => {
            // First register custom class data so the class name is valid
            manager.register('classes.data', [{
                name: 'Artificer',
                primary_ability: 'INT',
                hit_die: 8,
                saving_throws: ['INT', 'CON'],
                is_spellcaster: true,
                skill_count: 2,
                available_skills: ['Arcana', 'Investigation', 'Perception', 'Sleight of Hand'],
                has_expertise: false
            }]);
            manager.register('classes.data', [{
                name: 'BloodHunter',
                primary_ability: 'STR',
                hit_die: 10,
                saving_throws: ['STR', 'DEX'],
                is_spellcaster: false,
                skill_count: 2,
                available_skills: ['Athletics', 'Insight', 'Investigation', 'Perception'],
                has_expertise: false
            }]);

            const customClasses = ['Artificer', 'BloodHunter'];

            manager.register('classes', customClasses);

            const merged = manager.get('classes');
            expect(merged).toContain('Artificer');
            expect(merged).toContain('BloodHunter');
        });

        it('should throw on invalid equipment items when validate is true', () => {
            const invalidEquipment = [
                { name: 'Invalid Item', type: 'invalid', rarity: 'common', weight: 1 }
            ];

            expect(() => {
                manager.register('equipment', invalidEquipment, { validate: true });
            }).toThrow();
        });

        it('should not throw on invalid equipment items when validate is false', () => {
            const invalidEquipment = [
                { name: 'Invalid Item', type: 'invalid' as 'weapon', rarity: 'common' as const, weight: 1 }
            ];

            expect(() => {
                manager.register('equipment', invalidEquipment, { validate: false });
            }).not.toThrow();
        });

        it('should throw on invalid spell items when validate is true', () => {
            const invalidSpells = [
                { name: 'Invalid Spell', level: 15, school: 'Invalid' }
            ];

            expect(() => {
                manager.register('spells', invalidSpells, { validate: true });
            }).toThrow();
        });

        it('should throw on invalid race items when validate is true', () => {
            const invalidRaces = ['InvalidRace'];

            expect(() => {
                manager.register('races', invalidRaces, { validate: true });
            }).toThrow();
        });

        it('should throw on invalid class items when validate is true', () => {
            const invalidClasses = ['InvalidClass'];

            expect(() => {
                manager.register('classes', invalidClasses, { validate: true });
            }).toThrow();
        });
    });

    describe('Get Merged Data', () => {
        it('should return defaults when no custom data registered', () => {
            const items = manager.get('races');
            expect(items).toEqual([...ALL_RACES]);
        });

        it('should merge defaults with custom data', () => {
            manager.initializeDefaults('appearance.facialFeatures', ['scar', 'tattoo']);
            const customFeatures = ['beard', 'mustache'];
            manager.register('appearance.facialFeatures', customFeatures);

            const merged = manager.get('appearance.facialFeatures');
            expect(merged).toContain('scar'); // Default
            expect(merged).toContain('tattoo'); // Default
            expect(merged).toContain('beard'); // Custom
            expect(merged).toContain('mustache'); // Custom
        });

        it('should return defaults only via getDefaults', () => {
            manager.initializeDefaults('appearance.eyeColors', ['#FF0000', '#00FF00']);
            manager.register('appearance.eyeColors', ['#0000FF']);

            const defaults = manager.getDefaults('appearance.eyeColors');
            expect(defaults).toEqual(['#FF0000', '#00FF00']);
        });

        it('should return custom items only via getCustom', () => {
            manager.register('appearance.hairColors', ['#FF00FF']);

            const custom = manager.getCustom('appearance.hairColors');
            expect(custom).toEqual(['#FF00FF']);
        });

        it('should return empty array for getCustom when no custom data', () => {
            const custom = manager.getCustom('races');
            expect(custom).toEqual([]);
        });
    });

    describe('Weight Management', () => {
        it('should set custom weights for a category', () => {
            manager.setWeights('equipment', { 'Sword': 2.0, 'Axe': 0.5 });

            const weights = manager.getWeights('equipment');
            expect(weights['Sword']).toBe(2.0);
            expect(weights['Axe']).toBe(0.5);
        });

        it('should merge custom weights with default weights', () => {
            manager.setWeights('races', { 'Human': 3.0 });

            const weights = manager.getWeights('races');
            expect(weights['Human']).toBe(3.0);
            // Default races should have weight 1.0
            for (const race of ALL_RACES) {
                if (race !== 'Human') {
                    expect(weights[race]).toBe(1.0);
                }
            }
        });

        it('should return default weights (all 1.0) when no custom weights', () => {
            const weights = manager.getDefaultWeights('classes');
            for (const cls of ALL_CLASSES) {
                expect(weights[cls]).toBe(1.0);
            }
        });

        it('should set weights via register options', () => {
            manager.register('equipment', [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 4 }
            ], {
                weights: { 'Custom Sword': 5.0 }
            });

            const weights = manager.getWeights('equipment');
            expect(weights['Custom Sword']).toBe(5.0);
        });

        it('should handle zero weights (item never spawns)', () => {
            manager.setWeights('races', { 'Human': 0 });

            const weights = manager.getWeights('races');
            expect(weights['Human']).toBe(0);
        });

        it('should handle negative weights', () => {
            manager.setWeights('classes', { 'Fighter': -1 });

            const weights = manager.getWeights('classes');
            expect(weights['Fighter']).toBe(-1);
        });
    });

    describe('Reset to Defaults', () => {
        it('should reset a single category', () => {
            manager.register('equipment', [
                { name: 'Custom Item', type: 'item' as const, rarity: 'common' as const, weight: 1 }
            ]);
            manager.setWeights('equipment', { 'Custom Item': 10 });

            expect(manager.hasCustomData('equipment')).toBe(true);

            manager.reset('equipment');

            expect(manager.hasCustomData('equipment')).toBe(false);
            const merged = manager.get('equipment');
            expect(merged).toEqual(Object.values(DEFAULT_EQUIPMENT));
        });

        it('should reset all categories', () => {
            manager.register('equipment', [{ name: 'A', type: 'item' as const, rarity: 'common' as const, weight: 1 }]);
            manager.register('spells', [{
                name: 'B',
                level: 1,
                school: 'Evocation',
                casting_time: '1 action',
                range: '60 feet',
                components: ['V', 'S'],
                duration: 'Instantaneous'
            }]);
            // Use a custom race that doesn't exist in defaults
            manager.register('races.data', [{ race: 'TestRace', ability_bonuses: {}, speed: 30, traits: [] }]);
            manager.register('races', ['TestRace']);

            expect(manager.hasCustomData('equipment')).toBe(true);
            expect(manager.hasCustomData('spells')).toBe(true);
            expect(manager.hasCustomData('races')).toBe(true);

            manager.resetAll();

            expect(manager.hasCustomData('equipment')).toBe(false);
            expect(manager.hasCustomData('spells')).toBe(false);
            expect(manager.hasCustomData('races')).toBe(false);
        });
    });

    describe('Mode Selection', () => {
        it('should default to relative mode', () => {
            manager.register('equipment', [{ name: 'X', type: 'item' as const, rarity: 'common' as const, weight: 1 }]);

            expect(manager.getMode('equipment')).toBe('relative');
        });

        it('should support absolute mode', () => {
            manager.register('equipment', [{ name: 'Y', type: 'item' as const, rarity: 'common' as const, weight: 1 }], {
                mode: 'absolute'
            });

            expect(manager.getMode('equipment')).toBe('absolute');
        });

        it('should support default mode', () => {
            manager.register('equipment', [{ name: 'Z', type: 'item' as const, rarity: 'common' as const, weight: 1 }], {
                mode: 'default'
            });

            expect(manager.getMode('equipment')).toBe('default');
        });

        it('should return undefined for mode when no custom data', () => {
            expect(manager.getMode('spells')).toBeUndefined();
        });
    });

    describe('Validation', () => {
        it('should validate equipment with required fields', () => {
            const validEquipment = [
                { name: 'Valid Sword', type: 'weapon', rarity: 'common', weight: 3 }
            ];

            const result = manager.validate('equipment', validEquipment);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should reject equipment without name', () => {
            const invalidEquipment = [
                { type: 'weapon', rarity: 'common', weight: 3 }
            ];

            const result = manager.validate('equipment', invalidEquipment);
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.some(e => e.includes('name'))).toBe(true);
        });

        it('should reject equipment with invalid type', () => {
            const invalidEquipment = [
                { name: 'Test', type: 'invalid_type', rarity: 'common', weight: 1 }
            ];

            const result = manager.validate('equipment', invalidEquipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('type'))).toBe(true);
        });

        it('should reject equipment with invalid rarity', () => {
            const invalidEquipment = [
                { name: 'Test', type: 'weapon', rarity: 'mythic', weight: 1 }
            ];

            const result = manager.validate('equipment', invalidEquipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('rarity'))).toBe(true);
        });

        it('should reject equipment with negative weight', () => {
            const invalidEquipment = [
                { name: 'Test', type: 'item', rarity: 'common', weight: -1 }
            ];

            const result = manager.validate('equipment', invalidEquipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('weight'))).toBe(true);
        });

        it('should validate spells with required fields', () => {
            const validSpells = [
                {
                    name: 'Fireball',
                    level: 3,
                    school: 'Evocation',
                    casting_time: '1 action',
                    range: '150 feet',
                    components: ['V', 'S', 'M'],
                    duration: 'Instantaneous'
                }
            ];

            const result = manager.validate('spells', validSpells);
            expect(result.valid).toBe(true);
        });

        it('should reject spells with invalid level', () => {
            const invalidSpells = [
                {
                    name: 'Test Spell',
                    level: 15,
                    school: 'Evocation',
                    casting_time: '1 action',
                    range: '60 feet',
                    components: ['V', 'S'],
                    duration: 'Instantaneous'
                }
            ];

            const result = manager.validate('spells', invalidSpells);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('level'))).toBe(true);
        });

        it('should reject spells with invalid school', () => {
            const invalidSpells = [
                {
                    name: 'Test Spell',
                    level: 1,
                    school: 'Invalid School',
                    casting_time: '1 action',
                    range: '60 feet',
                    components: ['V', 'S'],
                    duration: 'Instantaneous'
                }
            ];

            const result = manager.validate('spells', invalidSpells);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('school'))).toBe(true);
        });

        it('should validate races', () => {
            const validRaces = ['Human', 'Elf', 'Dwarf'];
            const result = manager.validate('races', validRaces);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid races', () => {
            const invalidRaces = ['InvalidRace'];
            const result = manager.validate('races', invalidRaces);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('race'))).toBe(true);
        });

        it('should validate classes', () => {
            const validClasses = ['Fighter', 'Wizard', 'Rogue'];
            const result = manager.validate('classes', validClasses);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid classes', () => {
            const invalidClasses = ['InvalidClass'];
            const result = manager.validate('classes', invalidClasses);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('class'))).toBe(true);
        });

        it('should validate appearance options as strings', () => {
            const validAppearance = ['slender', 'athletic'];
            const result = manager.validate('appearance.bodyTypes', validAppearance);
            expect(result.valid).toBe(true);
        });

        it('should reject non-string appearance options', () => {
            const invalidAppearance = ['slender', 123];
            const result = manager.validate('appearance.bodyTypes', invalidAppearance);
            expect(result.valid).toBe(false);
        });

        it('should reject non-array items', () => {
            const result = manager.validate('equipment', 'not an array' as unknown as []);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('array'))).toBe(true);
        });

        it('should reject null items', () => {
            const result = manager.validate('equipment', [null]);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('null'))).toBe(true);
        });

        it('should reject undefined items', () => {
            const result = manager.validate('equipment', [undefined]);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('undefined'))).toBe(true);
        });

        it('should provide clear error messages with item index', () => {
            const invalidEquipment = [
                { name: 'Valid', type: 'weapon', rarity: 'common', weight: 1 },
                { type: 'weapon', rarity: 'common', weight: 1 },
                { name: 'Also Valid', type: 'weapon', rarity: 'common', weight: 1 }
            ];

            const result = manager.validate('equipment', invalidEquipment);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('Item 1'))).toBe(true);
        });
    });

    describe('Info and Utility Methods', () => {
        it('should report if category has custom data', () => {
            expect(manager.hasCustomData('equipment')).toBe(false);

            manager.register('equipment', [{ name: 'Test', type: 'item' as const, rarity: 'common' as const, weight: 1 }]);

            expect(manager.hasCustomData('equipment')).toBe(true);
        });

        it('should get info for a specific category', () => {
            // Use a custom race that doesn't exist in defaults
            manager.register('races.data', [{ race: 'TestRaceInfo', ability_bonuses: {}, speed: 30, traits: [] }]);
            manager.register('races', ['TestRaceInfo'], { mode: 'relative', weights: { 'TestRaceInfo': 2 } });

            const info = manager.getInfo('races');

            expect(info.hasCustomData).toBe(true);
            expect(info.defaultCount).toBe(ALL_RACES.length);
            expect(info.customCount).toBe(1);
            expect(info.totalCount).toBe(ALL_RACES.length + 1);
            expect(info.mode).toBe('relative');
            expect(info.weights['TestRaceInfo']).toBe(2);
            expect(info.registeredAt).toBeDefined();
        });

        it('should get info for all categories', () => {
            manager.register('equipment', [{ name: 'A', type: 'item' as const, rarity: 'common' as const, weight: 1 }]);
            manager.register('spells', [{
                name: 'B',
                level: 1,
                school: 'Evocation',
                casting_time: '1 action',
                range: '60 feet',
                components: ['V', 'S'],
                duration: 'Instantaneous'
            }]);

            const allInfo = manager.getInfo();

            expect(Object.keys(allInfo).length).toBeGreaterThan(0);
            expect(allInfo['equipment']).toBeDefined();
            expect(allInfo['spells']).toBeDefined();
        });

        it('should get registered categories', () => {
            const categories = manager.getRegisteredCategories();
            expect(categories).toContain('equipment');
            expect(categories).toContain('races');
        });

        it('should export custom data', () => {
            manager.register('equipment', [{ name: 'Custom', type: 'item' as const, rarity: 'common' as const, weight: 1 }], {
                weights: { 'Custom': 5 }
            });

            const exported = manager.exportCustomData();

            expect(exported.extensions).toBeDefined();
            expect(exported.weights).toBeDefined();
            expect(exported.extensions['equipment']).toBeDefined();
            expect(exported.weights['equipment']).toBeDefined();
        });

        it('should export empty object when no custom data', () => {
            const exported = manager.exportCustomData();
            expect(Object.keys(exported.extensions)).toHaveLength(0);
            expect(Object.keys(exported.weights)).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty custom data arrays', () => {
            manager.register('equipment', []);

            const merged = manager.get('equipment');
            expect(merged).toEqual(Object.values(DEFAULT_EQUIPMENT));
        });

        it('should handle registering the same category twice', () => {
            // Use custom race names that are NOT in the default races
            // Disable validation for this test since we're using non-standard race names
            manager.register('races', ['DragonKin'], { validate: false });
            const count1 = manager.get('races').length;

            manager.register('races', ['Fairy', 'Giant'], { validate: false });
            const count2 = manager.get('races').length;

            // Second registration should add more items
            expect(count2).toBeGreaterThan(count1);
        });

        it('should handle calling reset on non-existent category', () => {
            expect(() => {
                manager.reset('nonexistent' as ExtensionCategory);
            }).not.toThrow();
        });

        it('should handle getting weights for non-existent category', () => {
            const weights = manager.getWeights('nonexistent' as ExtensionCategory);
            expect(weights).toEqual({});
        });

        it('should handle setting empty weights', () => {
            manager.setWeights('races', {});
            const weights = manager.getWeights('races');
            // Should still have default weights
            for (const race of ALL_RACES) {
                expect(weights[race]).toBe(1.0);
            }
        });

        it('should handle very long custom data arrays', () => {
            const manyItems = Array.from({ length: 1000 }, (_, i) => ({
                name: `Item ${i}`,
                type: 'item' as const,
                rarity: 'common' as const,
                weight: 1
            }));

            expect(() => {
                manager.register('equipment', manyItems);
            }).not.toThrow();

            const merged = manager.get('equipment');
            expect(merged.length).toBeGreaterThan(1000);
        });

        it('should handle special characters in item names', () => {
            const specialNames = [
                { name: "O'Brian Sword", type: 'weapon' as const, rarity: 'rare' as const, weight: 3 },
                { name: 'Fire & Ice', type: 'weapon' as const, rarity: 'very_rare' as const, weight: 4 },
                { name: 'Dagger-dagger', type: 'weapon' as const, rarity: 'common' as const, weight: 1 }
            ];

            expect(() => {
                manager.register('equipment', specialNames);
            }).not.toThrow();

            const merged = manager.get('equipment');
            expect(merged.some((e: { name: string }) => e.name === "O'Brian Sword")).toBe(true);
        });

        it('should handle unicode characters in appearance options', () => {
            const unicodeOptions = ['月光', 'élégant', 'ναΐτης'];

            expect(() => {
                manager.register('appearance.hairStyles', unicodeOptions);
            }).not.toThrow();

            const merged = manager.get('appearance.hairStyles');
            expect(merged).toContain('月光');
        });
    });

    describe('Duplicate Detection', () => {
        it('should throw error when registering duplicate equipment by name', () => {
            // First registration should succeed
            manager.register('equipment', [
                { name: 'Unique Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 }
            ]);

            // Second registration with same name should fail
            expect(() => {
                manager.register('equipment', [
                    { name: 'Unique Sword', type: 'weapon' as const, rarity: 'common' as const, weight: 1 }
                ]);
            }).toThrow('Duplicate items in category');
        });

        it('should throw error when registering duplicate spells by name', () => {
            manager.register('spells', [{
                name: 'Unique Spell',
                level: 1,
                school: 'Evocation',
                casting_time: '1 action',
                range: '60 feet',
                components: ['V', 'S'],
                duration: 'Instantaneous'
            }]);

            expect(() => {
                manager.register('spells', [{
                    name: 'Unique Spell',
                    level: 3,
                    school: 'Necromancy',
                    casting_time: '1 bonus action',
                    range: '30 feet',
                    components: ['V'],
                    duration: '1 minute'
                }]);
            }).toThrow('Duplicate items in category');
        });

        it('should throw error when registering duplicate appearance options', () => {
            manager.register('appearance.bodyTypes', ['custom-type']);

            expect(() => {
                manager.register('appearance.bodyTypes', ['custom-type']);
            }).toThrow('Duplicate items in category');
        });

        it('should throw error when registering duplicate races', () => {
            // First, register a custom race data so the race name is valid
            manager.register('races.data', [{
                race: 'CustomRace',
                ability_bonuses: { STR: 2 },
                speed: 30,
                traits: []
            }]);

            // Register the race name
            manager.register('races', ['CustomRace']);

            // Try to register the same race again
            expect(() => {
                manager.register('races', ['CustomRace']);
            }).toThrow('Duplicate items in category');
        });

        it('should throw error when registering duplicate classes', () => {
            // First, register a custom class data so the class name is valid
            manager.register('classes.data', [{
                name: 'CustomClass',
                primary_ability: 'STR',
                hit_die: 10,
                saving_throws: ['STR', 'CON'],
                is_spellcaster: false,
                skill_count: 2,
                available_skills: ['Athletics', 'Intimidation'],
                has_expertise: false
            }]);

            // Register the class name
            manager.register('classes', ['CustomClass']);

            // Try to register the same class again
            expect(() => {
                manager.register('classes', ['CustomClass']);
            }).toThrow('Duplicate items in category');
        });

        it('should NOT throw error in replace mode (replaces all items)', () => {
            manager.register('equipment', [
                { name: 'First Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 }
            ]);

            // In replace mode, duplicates should NOT be checked (it replaces everything)
            expect(() => {
                manager.register('equipment', [
                    { name: 'First Sword', type: 'weapon' as const, rarity: 'common' as const, weight: 1 }
                ], { mode: 'replace' });
            }).not.toThrow();
        });

        it('should allow registering different items in same category', () => {
            manager.register('equipment', [
                { name: 'Sword of Fire', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 }
            ]);

            // Different name should be allowed
            expect(() => {
                manager.register('equipment', [
                    { name: 'Sword of Ice', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 }
                ]);
            }).not.toThrow();
        });

        it('should detect duplicates by id property when name is not present', () => {
            // Register an item with an id
            manager.register('classFeatures', [{
                id: 'unique-feature-id',
                name: 'First Feature',
                description: 'A feature',
                class: 'Fighter',
                level: 1,
                effects: []
            }], { validate: false });

            // Try to register another item with the same id but different name
            expect(() => {
                manager.register('classFeatures', [{
                    id: 'unique-feature-id',
                    name: 'Different Feature Name',
                    description: 'Another feature',
                    class: 'Fighter',
                    level: 2,
                    effects: []
                }], { validate: false });
            }).toThrow('Duplicate items in category');
        });

        it('should include duplicate names in error message', () => {
            manager.register('equipment', [
                { name: 'Duplicate Item', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 }
            ]);

            try {
                manager.register('equipment', [
                    { name: 'Duplicate Item', type: 'weapon' as const, rarity: 'common' as const, weight: 1 }
                ]);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Duplicate Item');
                expect((error as Error).message).toContain('unique name or id');
            }
        });
    });
});
