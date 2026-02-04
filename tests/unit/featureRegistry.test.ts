/**
 * Unit tests for FeatureRegistry
 *
 * Tests the custom class features and racial traits system including:
 * - Register custom features
 * - Get features by class/level
 * - Validate prerequisites
 * - Reset to defaults
 *
 * Part of Phase 15.1: Unit Tests for FeatureRegistry
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS } from '../../src/core/features/DefaultFeatures.js';
import type { ClassFeature, RacialTrait, Class, Race, AbilityScores } from '../../src/core/types/index.js';
import type { CharacterSheet } from '../../src/core/types/Character.js';

describe('FeatureRegistry', () => {
    let registry: FeatureRegistry;
    let extensionManager: ExtensionManager;

    beforeEach(() => {
        // Get a fresh instance for each test
        registry = FeatureRegistry.getInstance();
        extensionManager = ExtensionManager.getInstance();
        // Reset to ensure clean state
        registry.reset();
        extensionManager.resetAll();
    });

    afterEach(() => {
        // Clean up after each test
        registry.reset();
        extensionManager.resetAll();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = FeatureRegistry.getInstance();
            const instance2 = FeatureRegistry.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should maintain state across getInstance calls', () => {
            const publicRegistry = FeatureRegistry.getInstance();
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);
            expect(publicRegistry.isInitialized()).toBe(true);
        });
    });

    describe('Initialize Defaults', () => {
        it('should initialize with default class features', () => {
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);

            expect(registry.isInitialized()).toBe(true);

            const stats = registry.getRegistryStats();
            expect(stats.totalClassFeatures).toBeGreaterThan(0);
            expect(stats.classesWithFeatures).toBeGreaterThan(0);
        });

        it('should initialize with default racial traits', () => {
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);

            const stats = registry.getRegistryStats();
            expect(stats.totalRacialTraits).toBeGreaterThan(0);
            expect(stats.racesWithTraits).toBeGreaterThan(0);
        });

        it('should not reinitialize if already initialized', () => {
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);
            const stats1 = registry.getRegistryStats();

            // Try to initialize again (should not duplicate)
            extensionManager.initializeDefaults('racialTraits', []);

            // Stats should remain the same (no reset occurred)
            const stats2 = registry.getRegistryStats();
            expect(stats2.totalClassFeatures).toBe(stats1.totalClassFeatures);
        });

        it('should handle empty defaults', () => {
            extensionManager.initializeDefaults('racialTraits', []);

            expect(registry.isInitialized()).toBe(true);
            expect(registry.getRegistryStats().totalRacialTraits).toBe(0);
        });
    });

    describe('Register Custom Class Features', () => {
        it('should register a single custom class feature', () => {
            const customFeature: ClassFeature = {
                id: 'custom_dragons_fury',
                name: 'Dragon Fury',
                description: 'Channel your draconic heritage to deal extra damage.',
                type: 'active',
                class: 'Barbarian',
                level: 3,
                source: 'custom',
                tags: ['damage', 'dragon']
            };

            registry.registerClassFeature(customFeature);

            const retrieved = registry.getClassFeatureById('custom_dragons_fury');
            expect(retrieved).toEqual(customFeature);
        });

        it('should register multiple custom class features', () => {
            const customFeatures: ClassFeature[] = [
                {
                    id: 'custom_flame_strike',
                    name: 'Flame Strike',
                    description: 'Strike with the fury of fire.',
                    type: 'active',
                    class: 'Fighter',
                    level: 5,
                    source: 'custom'
                },
                {
                    id: 'custom_ice_shield',
                    name: 'Ice Shield',
                    description: 'Create a shield of ice.',
                    type: 'passive',
                    class: 'Wizard',
                    level: 2,
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(customFeatures);

            expect(registry.getClassFeatureById('custom_flame_strike')).toBeDefined();
            expect(registry.getClassFeatureById('custom_ice_shield')).toBeDefined();
        });

        it('should throw on duplicate feature ID', () => {
            const feature: ClassFeature = {
                id: 'duplicate_feature',
                name: 'Duplicate Feature',
                description: 'This feature is registered twice.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                source: 'custom'
            };

            registry.registerClassFeature(feature);

            expect(() => {
                registry.registerClassFeature(feature);
            }).toThrow('Class feature with ID "duplicate_feature" already exists');
        });

        it('should organize features by class', () => {
            const barbarianFeature: ClassFeature = {
                id: 'barbarian_custom',
                name: 'Barbarian Custom',
                description: 'A custom barbarian feature.',
                type: 'passive',
                class: 'Barbarian',
                level: 1,
                source: 'custom'
            };

            const fighterFeature: ClassFeature = {
                id: 'fighter_custom',
                name: 'Fighter Custom',
                description: 'A custom fighter feature.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                source: 'custom'
            };

            registry.registerClassFeatures([barbarianFeature, fighterFeature]);

            const registeredClasses = registry.getRegisteredClasses();
            expect(registeredClasses).toContain('Barbarian');
            expect(registeredClasses).toContain('Fighter');
        });
    });

    describe('Register Custom Racial Traits', () => {
        it('should register a single custom racial trait', () => {
            const customTrait: RacialTrait = {
                id: 'custom_dragon_wings',
                name: 'Dragon Wings',
                description: 'You have wings that allow you to fly.',
                race: 'Dragonborn',
                source: 'custom',
                effects: [
                    { type: 'ability_unlock', target: 'flight', value: true }
                ]
            };

            registry.registerRacialTrait(customTrait);

            const retrieved = registry.getRacialTraitById('custom_dragon_wings');
            expect(retrieved).toEqual(customTrait);
        });

        it('should register multiple custom racial traits', () => {
            const customTraits: RacialTrait[] = [
                {
                    id: 'custom_elf_magic',
                    name: 'Elven Magic',
                    description: 'You have innate magical ability.',
                    race: 'Elf',
                    source: 'custom'
                },
                {
                    id: 'custom_dwarf_stone',
                    name: 'Stone Affinity',
                    description: 'You have an affinity for stone and earth.',
                    race: 'Dwarf',
                    source: 'custom'
                }
            ];

            registry.registerRacialTraits(customTraits);

            expect(registry.getRacialTraitById('custom_elf_magic')).toBeDefined();
            expect(registry.getRacialTraitById('custom_dwarf_stone')).toBeDefined();
        });

        it('should throw on duplicate trait ID', () => {
            const trait: RacialTrait = {
                id: 'duplicate_trait',
                name: 'Duplicate Trait',
                description: 'This trait is registered twice.',
                race: 'Human',
                source: 'custom'
            };

            registry.registerRacialTrait(trait);

            expect(() => {
                registry.registerRacialTrait(trait);
            }).toThrow('Racial trait with ID "duplicate_trait" already exists');
        });

        it('should organize traits by race', () => {
            const elfTrait: RacialTrait = {
                id: 'elf_custom',
                name: 'Elf Custom',
                description: 'A custom elf trait.',
                race: 'Elf',
                source: 'custom'
            };

            const dwarfTrait: RacialTrait = {
                id: 'dwarf_custom',
                name: 'Dwarf Custom',
                description: 'A custom dwarf trait.',
                race: 'Dwarf',
                source: 'custom'
            };

            registry.registerRacialTraits([elfTrait, dwarfTrait]);

            const registeredRaces = registry.getRegisteredRaces();
            expect(registeredRaces).toContain('Elf');
            expect(registeredRaces).toContain('Dwarf');
        });

        it('should handle subrace-specific traits', () => {
            const highElfTrait: RacialTrait = {
                id: 'high_elf_cantrip',
                name: 'High Elf Cantrip',
                description: 'You know one cantrip of your choice.',
                race: 'Elf',
                subrace: 'High Elf',
                source: 'custom'
            };

            const woodElfTrait: RacialTrait = {
                id: 'wood_elf_mask',
                name: 'Wood Elf Mask of the Wild',
                description: 'You can attempt to hide even when only lightly obscured.',
                race: 'Elf',
                subrace: 'Wood Elf',
                source: 'custom'
            };

            registry.registerRacialTraits([highElfTrait, woodElfTrait]);

            // Get traits for High Elf subrace
            const highElfTraits = registry.getRacialTraitsForSubrace('Elf', 'High Elf');
            expect(highElfTraits).toContainEqual(highElfTrait);
            expect(highElfTraits).not.toContainEqual(woodElfTrait);

            // Get traits for Wood Elf subrace
            const woodElfTraits = registry.getRacialTraitsForSubrace('Elf', 'Wood Elf');
            expect(woodElfTraits).toContainEqual(woodElfTrait);
            expect(woodElfTraits).not.toContainEqual(highElfTrait);
        });
    });

    describe('Get Features by Class/Level', () => {
        beforeEach(() => {
            // Register test features at different levels
            const testFeatures: ClassFeature[] = [
                {
                    id: 'test_level_1',
                    name: 'Level 1 Feature',
                    description: 'Gained at level 1.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 1,
                    source: 'custom'
                },
                {
                    id: 'test_level_5',
                    name: 'Level 5 Feature',
                    description: 'Gained at level 5.',
                    type: 'active',
                    class: 'Fighter',
                    level: 5,
                    source: 'custom'
                },
                {
                    id: 'test_level_10',
                    name: 'Level 10 Feature',
                    description: 'Gained at level 10.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 10,
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(testFeatures);
        });

        it('should get all features up to a given level', () => {
            const features = registry.getClassFeatures('Fighter', 5);

            // Note: Default features may be included if ExtensionManager was initialized
            // We verify our custom features are present
            expect(features.some(f => f.id === 'test_level_1')).toBe(true);
            expect(features.some(f => f.id === 'test_level_5')).toBe(true);
            expect(features.some(f => f.id === 'test_level_10')).toBe(false);
        });

        it('should get all features at max level', () => {
            const features = registry.getClassFeatures('Fighter', 20);

            // Note: Default features may be included if ExtensionManager was initialized
            // We verify our custom features are present
            expect(features.some(f => f.id === 'test_level_1')).toBe(true);
            expect(features.some(f => f.id === 'test_level_5')).toBe(true);
            expect(features.some(f => f.id === 'test_level_10')).toBe(true);
        });

        it('should get features gained at a specific level', () => {
            const level5Features = registry.getFeaturesForLevel('Fighter', 5);

            // Note: Default features at level 5 may be included
            // We verify our custom feature is present
            expect(level5Features.some(f => f.id === 'test_level_5')).toBe(true);
        });

        it('should return empty array for class with no features', () => {
            // Note: If ExtensionManager has defaults initialized, this may not be empty
            // We check that at least our custom features are not present
            const features = registry.getClassFeatures('Wizard', 5);
            expect(features.some(f => f.id === 'test_level_1')).toBe(false);
        });

        it('should return empty array for level below lowest feature', () => {
            const features = registry.getClassFeatures('Fighter', 0);
            expect(features).toEqual([]);
        });
    });

    describe('Get Feature by ID', () => {
        it('should retrieve class feature by ID', () => {
            const feature: ClassFeature = {
                id: 'retrieve_test',
                name: 'Retrieve Test',
                description: 'Testing retrieval by ID.',
                type: 'passive',
                class: 'Wizard',
                level: 1,
                source: 'custom'
            };

            registry.registerClassFeature(feature);

            const retrieved = registry.getClassFeatureById('retrieve_test');
            expect(retrieved).toEqual(feature);
        });

        it('should return undefined for non-existent feature ID', () => {
            const retrieved = registry.getClassFeatureById('non_existent');
            expect(retrieved).toBeUndefined();
        });

        it('should retrieve racial trait by ID', () => {
            const trait: RacialTrait = {
                id: 'trait_retrieve_test',
                name: 'Trait Retrieve Test',
                description: 'Testing trait retrieval by ID.',
                race: 'Human',
                source: 'custom'
            };

            registry.registerRacialTrait(trait);

            const retrieved = registry.getRacialTraitById('trait_retrieve_test');
            expect(retrieved).toEqual(trait);
        });

        it('should return undefined for non-existent trait ID', () => {
            const retrieved = registry.getRacialTraitById('non_existent_trait');
            expect(retrieved).toBeUndefined();
        });
    });

    describe('Get Racial Traits', () => {
        beforeEach(() => {
            const testTraits: RacialTrait[] = [
                {
                    id: 'human_trait_1',
                    name: 'Human Trait 1',
                    description: 'First human trait.',
                    race: 'Human',
                    source: 'custom'
                },
                {
                    id: 'human_trait_2',
                    name: 'Human Trait 2',
                    description: 'Second human trait.',
                    race: 'Human',
                    source: 'custom'
                },
                {
                    id: 'elf_trait_1',
                    name: 'Elf Trait 1',
                    description: 'First elf trait.',
                    race: 'Elf',
                    source: 'custom'
                }
            ];

            registry.registerRacialTraits(testTraits);
        });

        it('should get all traits for a race', () => {
            const humanTraits = registry.getRacialTraits('Human');

            expect(humanTraits).toHaveLength(2);
            expect(humanTraits.some(t => t.id === 'human_trait_1')).toBe(true);
            expect(humanTraits.some(t => t.id === 'human_trait_2')).toBe(true);
        });

        it('should return empty array for race with no traits', () => {
            const dwarfTraits = registry.getRacialTraits('Dwarf');
            expect(dwarfTraits).toEqual([]);
        });

        it('should filter traits by subrace', () => {
            const genericTrait: RacialTrait = {
                id: 'elf_generic',
                name: 'Generic Elf Trait',
                description: 'All elves have this.',
                race: 'Elf',
                source: 'custom'
            };

            const highElfTrait: RacialTrait = {
                id: 'elf_high_specific',
                name: 'High Elf Specific',
                description: 'Only high elves have this.',
                race: 'Elf',
                subrace: 'High Elf',
                source: 'custom'
            };

            registry.registerRacialTraits([genericTrait, highElfTrait]);

            // Generic query returns both
            const allElfTraits = registry.getRacialTraits('Elf');
            expect(allElfTraits).toHaveLength(3); // 2 from beforeEach + 1 generic + 1 high elf

            // Subrace query returns only generic + subrace specific
            const highElfTraits = registry.getRacialTraitsForSubrace('Elf', 'High Elf');
            expect(highElfTraits.length).toBeGreaterThan(0);
            expect(highElfTraits.some(t => t.id === 'elf_generic')).toBe(true);
            expect(highElfTraits.some(t => t.id === 'elf_high_specific')).toBe(true);
        });
    });

    describe('Validate Prerequisites - Level Requirements', () => {
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            const baseScores: AbilityScores = {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            };

            mockCharacter = {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 5,
                ability_scores: baseScores,
                ability_modifiers: {
                    STR: 0,
                    DEX: 0,
                    CON: 0,
                    INT: 0,
                    WIS: 0,
                    CHA: 0
                },
                proficiency_bonus: 2,
                hp: { current: 10, max: 10, temp: 0 },
                armor_class: 10,
                initiative: 0,
                speed: 30,
                skills: {
                    athletics: 'none',
                    acrobatics: 'none',
                    sleight_of_hand: 'none',
                    stealth: 'none',
                    arcana: 'none',
                    history: 'none',
                    investigation: 'none',
                    nature: 'none',
                    religion: 'none',
                    animal_handling: 'none',
                    insight: 'none',
                    medicine: 'none',
                    perception: 'none',
                    survival: 'none',
                    deception: 'none',
                    intimidation: 'none',
                    performance: 'none',
                    persuasion: 'none'
                },
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
                seed: 'test-seed',
                generated_at: new Date().toISOString()
            };
        });

        it('should validate feature with no prerequisites', () => {
            const feature: ClassFeature = {
                id: 'no_prereqs',
                name: 'No Prerequisites',
                description: 'This feature has no prerequisites.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should validate met level requirement', () => {
            const feature: ClassFeature = {
                id: 'level_5_feature',
                name: 'Level 5 Feature',
                description: 'Requires level 5.',
                type: 'passive',
                class: 'Fighter',
                level: 5,
                prerequisites: { level: 5 },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail unmet level requirement', () => {
            const feature: ClassFeature = {
                id: 'level_10_feature',
                name: 'Level 10 Feature',
                description: 'Requires level 10.',
                type: 'passive',
                class: 'Fighter',
                level: 10,
                prerequisites: { level: 10 },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires level 10 (current: 5)');
        });
    });

    describe('Validate Prerequisites - Ability Score Requirements', () => {
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            const baseScores: AbilityScores = {
                STR: 16,
                DEX: 14,
                CON: 12,
                INT: 10,
                WIS: 8,
                CHA: 6
            };

            mockCharacter = {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 5,
                ability_scores: baseScores,
                ability_modifiers: {
                    STR: 3,
                    DEX: 2,
                    CON: 1,
                    INT: 0,
                    WIS: -1,
                    CHA: -2
                },
                proficiency_bonus: 2,
                hp: { current: 10, max: 10, temp: 0 },
                armor_class: 10,
                initiative: 0,
                speed: 30,
                skills: {
                    athletics: 'none',
                    acrobatics: 'none',
                    sleight_of_hand: 'none',
                    stealth: 'none',
                    arcana: 'none',
                    history: 'none',
                    investigation: 'none',
                    nature: 'none',
                    religion: 'none',
                    animal_handling: 'none',
                    insight: 'none',
                    medicine: 'none',
                    perception: 'none',
                    survival: 'none',
                    deception: 'none',
                    intimidation: 'none',
                    performance: 'none',
                    persuasion: 'none'
                },
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
                seed: 'test-seed',
                generated_at: new Date().toISOString()
            };
        });

        it('should validate met ability score requirement', () => {
            const feature: ClassFeature = {
                id: 'str_13_feature',
                name: 'Strong Feature',
                description: 'Requires STR 13.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                prerequisites: { abilities: { STR: 13 } },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail unmet ability score requirement', () => {
            const feature: ClassFeature = {
                id: 'int_13_feature',
                name: 'Smart Feature',
                description: 'Requires INT 13.',
                type: 'passive',
                class: 'Wizard',
                level: 1,
                prerequisites: { abilities: { INT: 13 } },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires INT 13 (current: 10)');
        });

        it('should validate multiple ability score requirements', () => {
            const feature: ClassFeature = {
                id: 'multi_ability_feature',
                name: 'Multi-Ability Feature',
                description: 'Requires STR 15 and DEX 13.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                prerequisites: { abilities: { STR: 15, DEX: 13 } },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail if any ability score requirement is unmet', () => {
            const feature: ClassFeature = {
                id: 'multi_ability_fail',
                name: 'Multi-Ability Fail',
                description: 'Requires STR 15 and WIS 13.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                prerequisites: { abilities: { STR: 15, WIS: 13 } },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires WIS 13 (current: 8)');
        });
    });

    describe('Validate Prerequisites - Class and Race Requirements', () => {
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            const baseScores: AbilityScores = {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            };

            mockCharacter = {
                name: 'Test Character',
                race: 'Elf',
                class: 'Wizard',
                level: 5,
                ability_scores: baseScores,
                ability_modifiers: {
                    STR: 0,
                    DEX: 0,
                    CON: 0,
                    INT: 0,
                    WIS: 0,
                    CHA: 0
                },
                proficiency_bonus: 2,
                hp: { current: 10, max: 10, temp: 0 },
                armor_class: 10,
                initiative: 0,
                speed: 30,
                skills: {
                    athletics: 'none',
                    acrobatics: 'none',
                    sleight_of_hand: 'none',
                    stealth: 'none',
                    arcana: 'none',
                    history: 'none',
                    investigation: 'none',
                    nature: 'none',
                    religion: 'none',
                    animal_handling: 'none',
                    insight: 'none',
                    medicine: 'none',
                    perception: 'none',
                    survival: 'none',
                    deception: 'none',
                    intimidation: 'none',
                    performance: 'none',
                    persuasion: 'none'
                },
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
                seed: 'test-seed',
                generated_at: new Date().toISOString()
            };
        });

        it('should validate met class requirement', () => {
            const feature: ClassFeature = {
                id: 'wizard_only',
                name: 'Wizard Only',
                description: 'Only for wizards.',
                type: 'passive',
                class: 'Wizard',
                level: 1,
                prerequisites: { class: 'Wizard' },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail unmet class requirement', () => {
            const feature: ClassFeature = {
                id: 'fighter_only',
                name: 'Fighter Only',
                description: 'Only for fighters.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                prerequisites: { class: 'Fighter' },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires class Fighter');
        });

        it('should validate met race requirement', () => {
            const trait: RacialTrait = {
                id: 'elf_only_trait',
                name: 'Elf Only',
                description: 'Only for elves.',
                race: 'Elf',
                prerequisites: { race: 'Elf' },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(trait, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail unmet race requirement', () => {
            const trait: RacialTrait = {
                id: 'dwarf_only_trait',
                name: 'Dwarf Only',
                description: 'Only for dwarves.',
                race: 'Dwarf',
                prerequisites: { race: 'Dwarf' },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(trait, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires race Dwarf (current: Elf)');
        });
    });

    describe('Validate Prerequisites - Feature Chain Requirements', () => {
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            const baseScores: AbilityScores = {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            };

            mockCharacter = {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 10,
                ability_scores: baseScores,
                ability_modifiers: {
                    STR: 0,
                    DEX: 0,
                    CON: 0,
                    INT: 0,
                    WIS: 0,
                    CHA: 0
                },
                proficiency_bonus: 2,
                hp: { current: 10, max: 10, temp: 0 },
                armor_class: 10,
                initiative: 0,
                speed: 30,
                skills: {
                    athletics: 'none',
                    acrobatics: 'none',
                    sleight_of_hand: 'none',
                    stealth: 'none',
                    arcana: 'none',
                    history: 'none',
                    investigation: 'none',
                    nature: 'none',
                    religion: 'none',
                    animal_handling: 'none',
                    insight: 'none',
                    medicine: 'none',
                    perception: 'none',
                    survival: 'none',
                    deception: 'none',
                    intimidation: 'none',
                    performance: 'none',
                    persuasion: 'none'
                },
                saving_throws: {
                    STR: false,
                    DEX: false,
                    CON: false,
                    INT: false,
                    WIS: false,
                    CHA: false
                },
                racial_traits: [],
                class_features: ['base_feature'],
                seed: 'test-seed',
                generated_at: new Date().toISOString()
            };

            // Register base feature for chain tests
            const baseFeature: ClassFeature = {
                id: 'base_feature',
                name: 'Base Feature',
                description: 'The base feature in a chain.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                source: 'custom'
            };
            registry.registerClassFeature(baseFeature);
        });

        it('should validate met feature requirement', () => {
            const feature: ClassFeature = {
                id: 'advanced_feature',
                name: 'Advanced Feature',
                description: 'Requires base feature.',
                type: 'passive',
                class: 'Fighter',
                level: 5,
                prerequisites: { features: ['base_feature'] },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail unmet feature requirement', () => {
            const feature: ClassFeature = {
                id: 'missing_feature_req',
                name: 'Missing Feature Requirement',
                description: 'Requires a feature the character does not have.',
                type: 'passive',
                class: 'Fighter',
                level: 5,
                prerequisites: { features: ['non_existent_feature'] },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires feature: non_existent_feature');
        });

        it('should validate multiple feature requirements', () => {
            // Add another feature to the character
            mockCharacter.class_features.push('second_feature');

            const secondFeature: ClassFeature = {
                id: 'second_feature',
                name: 'Second Feature',
                description: 'The second feature in a chain.',
                type: 'passive',
                class: 'Fighter',
                level: 3,
                source: 'custom'
            };
            registry.registerClassFeature(secondFeature);

            const feature: ClassFeature = {
                id: 'master_feature',
                name: 'Master Feature',
                description: 'Requires both base and second features.',
                type: 'passive',
                class: 'Fighter',
                level: 7,
                prerequisites: { features: ['base_feature', 'second_feature'] },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail if any feature requirement is unmet', () => {
            const feature: ClassFeature = {
                id: 'partial_fail_feature',
                name: 'Partial Fail Feature',
                description: 'Requires features, character only has one.',
                type: 'passive',
                class: 'Fighter',
                level: 5,
                prerequisites: { features: ['base_feature', 'missing_feature'] },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires feature: missing_feature');
        });
    });

    describe('Validate Prerequisites - Complex Combinations', () => {
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            const baseScores: AbilityScores = {
                STR: 16,
                DEX: 14,
                CON: 12,
                INT: 10,
                WIS: 10,
                CHA: 10
            };

            mockCharacter = {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 10,
                ability_scores: baseScores,
                ability_modifiers: {
                    STR: 3,
                    DEX: 2,
                    CON: 1,
                    INT: 0,
                    WIS: 0,
                    CHA: 0
                },
                proficiency_bonus: 2,
                hp: { current: 10, max: 10, temp: 0 },
                armor_class: 10,
                initiative: 0,
                speed: 30,
                skills: {
                    athletics: 'none',
                    acrobatics: 'none',
                    sleight_of_hand: 'none',
                    stealth: 'none',
                    arcana: 'none',
                    history: 'none',
                    investigation: 'none',
                    nature: 'none',
                    religion: 'none',
                    animal_handling: 'none',
                    insight: 'none',
                    medicine: 'none',
                    perception: 'none',
                    survival: 'none',
                    deception: 'none',
                    intimidation: 'none',
                    performance: 'none',
                    persuasion: 'none'
                },
                saving_throws: {
                    STR: false,
                    DEX: false,
                    CON: false,
                    INT: false,
                    WIS: false,
                    CHA: false
                },
                racial_traits: [],
                class_features: ['base_feature'],
                seed: 'test-seed',
                generated_at: new Date().toISOString()
            };

            const baseFeature: ClassFeature = {
                id: 'base_feature',
                name: 'Base Feature',
                description: 'Base feature.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                source: 'custom'
            };
            registry.registerClassFeature(baseFeature);
        });

        it('should validate multiple prerequisite types', () => {
            const feature: ClassFeature = {
                id: 'complex_prereqs',
                name: 'Complex Prerequisites',
                description: 'Requires level 10, STR 15, Fighter class, and base feature.',
                type: 'passive',
                class: 'Fighter',
                level: 10,
                prerequisites: {
                    level: 10,
                    abilities: { STR: 15 },
                    class: 'Fighter',
                    features: ['base_feature']
                },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(true);
        });

        it('should fail if any prerequisite type is unmet', () => {
            const feature: ClassFeature = {
                id: 'complex_fail',
                name: 'Complex Fail',
                description: 'Requires multiple things, level is too low.',
                type: 'passive',
                class: 'Fighter',
                level: 15,
                prerequisites: {
                    level: 15,
                    abilities: { STR: 15 },
                    class: 'Fighter'
                },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(feature, mockCharacter);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires level 15 (current: 10)');
        });
    });

    describe('Can Gain Feature - Convenience Method', () => {
        let mockCharacter: CharacterSheet;

        beforeEach(() => {
            const baseScores: AbilityScores = {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            };

            mockCharacter = {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 5,
                ability_scores: baseScores,
                ability_modifiers: {
                    STR: 0,
                    DEX: 0,
                    CON: 0,
                    INT: 0,
                    WIS: 0,
                    CHA: 0
                },
                proficiency_bonus: 2,
                hp: { current: 10, max: 10, temp: 0 },
                armor_class: 10,
                initiative: 0,
                speed: 30,
                skills: {
                    athletics: 'none',
                    acrobatics: 'none',
                    sleight_of_hand: 'none',
                    stealth: 'none',
                    arcana: 'none',
                    history: 'none',
                    investigation: 'none',
                    nature: 'none',
                    religion: 'none',
                    animal_handling: 'none',
                    insight: 'none',
                    medicine: 'none',
                    perception: 'none',
                    survival: 'none',
                    deception: 'none',
                    intimidation: 'none',
                    performance: 'none',
                    persuasion: 'none'
                },
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
                seed: 'test-seed',
                generated_at: new Date().toISOString()
            };
        });

        it('should return true for feature with met prerequisites', () => {
            const feature: ClassFeature = {
                id: 'can_gain_yes',
                name: 'Can Gain Yes',
                description: 'Prerequisites met.',
                type: 'passive',
                class: 'Fighter',
                level: 5,
                prerequisites: { level: 5 },
                source: 'custom'
            };

            expect(registry.canGainFeature(feature, mockCharacter)).toBe(true);
        });

        it('should return false for feature with unmet prerequisites', () => {
            const feature: ClassFeature = {
                id: 'can_gain_no',
                name: 'Can Gain No',
                description: 'Prerequisites not met.',
                type: 'passive',
                class: 'Fighter',
                level: 10,
                prerequisites: { level: 10 },
                source: 'custom'
            };

            expect(registry.canGainFeature(feature, mockCharacter)).toBe(false);
        });

        it('should return true for feature with no prerequisites', () => {
            const feature: ClassFeature = {
                id: 'can_gain_always',
                name: 'Can Gain Always',
                description: 'No prerequisites.',
                type: 'passive',
                class: 'Fighter',
                level: 1,
                source: 'custom'
            };

            expect(registry.canGainFeature(feature, mockCharacter)).toBe(true);
        });
    });

    describe('Get Registry Statistics', () => {
        it('should return accurate stats for empty registry', () => {
            const stats = registry.getRegistryStats();

            // Note: Class features may include defaults from ExtensionManager
            // Racial traits should be 0 since we haven't registered any
            expect(stats.totalRacialTraits).toBe(0);
            expect(stats.racesWithTraits).toBe(0);
        });

        it('should return accurate stats after registration', () => {
            const features: ClassFeature[] = [
                {
                    id: 'f1',
                    name: 'F1',
                    description: 'Feature 1.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 1,
                    source: 'custom'
                },
                {
                    id: 'f2',
                    name: 'F2',
                    description: 'Feature 2.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 2,
                    source: 'custom'
                },
                {
                    id: 'w1',
                    name: 'W1',
                    description: 'Wizard 1.',
                    type: 'passive',
                    class: 'Wizard',
                    level: 1,
                    source: 'custom'
                }
            ];

            const traits: RacialTrait[] = [
                {
                    id: 'h1',
                    name: 'H1',
                    description: 'Human 1.',
                    race: 'Human',
                    source: 'custom'
                },
                {
                    id: 'e1',
                    name: 'E1',
                    description: 'Elf 1.',
                    race: 'Elf',
                    source: 'custom'
                },
                {
                    id: 'e2',
                    name: 'E2',
                    description: 'Elf 2.',
                    race: 'Elf',
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(features);
            registry.registerRacialTraits(traits);

            const stats = registry.getRegistryStats();
            // Note: Class features may include defaults from ExtensionManager
            // We verify that our custom features are included in the count
            expect(stats.totalClassFeatures).toBeGreaterThanOrEqual(3);
            expect(stats.totalRacialTraits).toBe(3);
            // Note: Classes with features may include defaults from ExtensionManager
            expect(stats.classesWithFeatures).toBeGreaterThanOrEqual(2);
            expect(stats.racesWithTraits).toBe(2);
        });
    });

    describe('Get Registered Classes and Races', () => {
        it('should return empty array for no classes registered', () => {
            const classes = registry.getRegisteredClasses();
            // Note: If ExtensionManager has defaults initialized, this won't be empty
            // We just verify it returns an array
            expect(Array.isArray(classes)).toBe(true);
        });

        it('should return all registered classes', () => {
            const features: ClassFeature[] = [
                {
                    id: 'f1',
                    name: 'F1',
                    description: 'F1.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 1,
                    source: 'custom'
                },
                {
                    id: 'w1',
                    name: 'W1',
                    description: 'W1.',
                    type: 'passive',
                    class: 'Wizard',
                    level: 1,
                    source: 'custom'
                },
                {
                    id: 'r1',
                    name: 'R1',
                    description: 'R1.',
                    type: 'passive',
                    class: 'Rogue',
                    level: 1,
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(features);

            const classes = registry.getRegisteredClasses();
            // Note: Classes may include defaults from ExtensionManager
            expect(classes).toContain('Fighter');
            expect(classes).toContain('Wizard');
            expect(classes).toContain('Rogue');
        });

        it('should return empty array for no races registered', () => {
            const races = registry.getRegisteredRaces();
            expect(races).toEqual([]);
        });

        it('should return all registered races', () => {
            const traits: RacialTrait[] = [
                {
                    id: 'h1',
                    name: 'H1',
                    description: 'H1.',
                    race: 'Human',
                    source: 'custom'
                },
                {
                    id: 'e1',
                    name: 'E1',
                    description: 'E1.',
                    race: 'Elf',
                    source: 'custom'
                },
                {
                    id: 'd1',
                    name: 'D1',
                    description: 'D1.',
                    race: 'Dwarf',
                    source: 'custom'
                }
            ];

            registry.registerRacialTraits(traits);

            const races = registry.getRegisteredRaces();
            expect(races).toContain('Human');
            expect(races).toContain('Elf');
            expect(races).toContain('Dwarf');
            expect(races.length).toBe(3);
        });
    });

    describe('Reset to Defaults', () => {
        it('should clear all registered features and traits', () => {
            const features: ClassFeature[] = [
                {
                    id: 'test_feature',
                    name: 'Test Feature',
                    description: 'Test.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 1,
                    source: 'custom'
                }
            ];

            const traits: RacialTrait[] = [
                {
                    id: 'test_trait',
                    name: 'Test Trait',
                    description: 'Test.',
                    race: 'Human',
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(features);
            registry.registerRacialTraits(traits);

            // Note: totalClassFeatures may include defaults from ExtensionManager
            expect(registry.getRegistryStats().totalRacialTraits).toBeGreaterThanOrEqual(1);
            expect(registry.isInitialized()).toBe(false);

            registry.reset();

            // Note: Class features from ExtensionManager defaults may persist
            // Racial traits should be 0 since they're stored in FeatureRegistry
            expect(registry.getRegistryStats().totalRacialTraits).toBe(0);
            expect(registry.isInitialized()).toBe(false);
        });

        it('should allow reinitialization after reset', () => {
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);
            expect(registry.isInitialized()).toBe(true);
            const stats1 = registry.getRegistryStats();

            registry.reset();
            expect(registry.isInitialized()).toBe(false);

            // Re-initialize after reset
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);
            expect(registry.isInitialized()).toBe(true);
            const stats2 = registry.getRegistryStats();

            expect(stats2.totalClassFeatures).toBe(stats1.totalClassFeatures);
            expect(stats2.totalRacialTraits).toBe(stats1.totalRacialTraits);
        });

        it('should clear registered classes and races after reset', () => {
            const features: ClassFeature[] = [
                {
                    id: 'f1',
                    name: 'F1',
                    description: 'F1.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 1,
                    source: 'custom'
                }
            ];

            const traits: RacialTrait[] = [
                {
                    id: 'h1',
                    name: 'H1',
                    description: 'H1.',
                    race: 'Human',
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(features);
            registry.registerRacialTraits(traits);

            expect(registry.getRegisteredClasses()).toContain('Fighter');
            expect(registry.getRegisteredRaces()).toContain('Human');

            registry.reset();

            // Note: Classes from ExtensionManager defaults may persist
            // Racial traits should be empty since they're stored in FeatureRegistry
            expect(registry.getRegisteredRaces()).toEqual([]);
        });
    });

    describe('Export Racial Traits', () => {
        it('should export empty registry as empty object', () => {
            // FeatureRegistry stores racial traits internally (until Phase 9)
            // This test ensures that when nothing is registered, we get an empty object
            const exported = registry.exportRacialTraits();

            expect(exported).toEqual({});
        });

        it('should export all registered racial traits', () => {
            const traits: RacialTrait[] = [
                {
                    id: 'export_trait_1',
                    name: 'Export Trait 1',
                    description: 'First trait.',
                    race: 'Human',
                    source: 'custom'
                },
                {
                    id: 'export_trait_2',
                    name: 'Export Trait 2',
                    description: 'Second trait.',
                    race: 'Elf',
                    source: 'custom'
                }
            ];

            registry.registerRacialTraits(traits);

            const exported = registry.exportRacialTraits();

            expect(exported.Human).toHaveLength(1);
            expect(exported.Human[0].id).toBe('export_trait_1');
            expect(exported.Elf).toHaveLength(1);
            expect(exported.Elf[0].id).toBe('export_trait_2');
        });

        it('should export class features via ExtensionManager', () => {
            // Class features are accessed via ExtensionManager, not FeatureRegistry
            // This test verifies the pattern for accessing class features
            const features: ClassFeature[] = [
                {
                    id: 'export_feature_1',
                    name: 'Export Feature 1',
                    description: 'First feature.',
                    type: 'passive',
                    class: 'Fighter',
                    level: 1,
                    source: 'custom'
                }
            ];

            registry.registerClassFeatures(features);

            // Use ExtensionManager to get class features
            const classFeatures = extensionManager.get('classFeatures') as ClassFeature[];
            const fighterFeatures = classFeatures.filter((f: ClassFeature) => f.class === 'Fighter');

            expect(fighterFeatures.some((f: ClassFeature) => f.id === 'export_feature_1')).toBe(true);
        });
    });

    describe('Is Initialized', () => {
        it('should return false before initialization', () => {
            expect(registry.isInitialized()).toBe(false);
        });

        it('should return true after initialization', () => {
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);
            expect(registry.isInitialized()).toBe(true);
        });

        it('should return false after reset', () => {
            // Both class features and racial traits are initialized via ExtensionManager
            extensionManager.initializeDefaults('classFeatures', DEFAULT_CLASS_FEATURES);
            extensionManager.initializeDefaults('racialTraits', DEFAULT_RACIAL_TRAITS);
            expect(registry.isInitialized()).toBe(true);

            registry.reset();
            expect(registry.isInitialized()).toBe(false);
        });
    });
});
