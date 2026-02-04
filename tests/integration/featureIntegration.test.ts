/**
 * Integration test for FeatureRegistry and ExtensionManager integration
 * Phase 8, Task 8.2: Add Integration Tests for Class Features
 *
 * Tests the interaction between FeatureRegistry (convenience wrapper) and
 * ExtensionManager (single source of truth) for class features.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import { initializeFeatureDefaults } from '../../src/core/extensions/initializeDefaults.js';
import { DEFAULT_CLASS_FEATURES } from '../../src/core/features/DefaultFeatures.js';
import type { ClassFeature } from '../../src/core/features/FeatureTypes.js';

describe('Phase 8.2: FeatureRegistry/ExtensionManager Integration for Class Features', () => {
    let registry: FeatureRegistry;
    let manager: ExtensionManager;

    beforeEach(() => {
        // Get FeatureRegistry and ExtensionManager instances
        registry = FeatureRegistry.getInstance();
        manager = ExtensionManager.getInstance();

        // Reset instances for clean state
        manager.resetAll();

        // Invalidate FeatureRegistry cache after EM reset
        registry.invalidateCache();

        // Initialize with default features for each test
        initializeFeatureDefaults();
    });

    describe('Task 8.2.1: Register via ExtensionManager and FeatureRegistry sees it', () => {
        it('should register via ExtensionManager and FeatureRegistry.getAllClassFeatures() sees it', () => {
            // Create a custom class feature
            const customFeature: ClassFeature = {
                id: 'test_custom_berserker_rage',
                name: 'Berserker Rage',
                description: 'A test custom barbarian feature for integration testing',
                type: 'active' as const,
                class: 'Barbarian' as const,
                level: 3,
                source: 'custom' as const,
                tags: ['rage', 'test']
            };

            // Register via ExtensionManager
            manager.register('classFeatures', [customFeature]);

            // Verify FeatureRegistry sees it via getAllClassFeatures()
            const allClassFeatures = registry.getAllClassFeatures();
            expect(allClassFeatures.has('Barbarian')).toBe(true);

            const barbarianFeatures = allClassFeatures.get('Barbarian') || [];
            expect(barbarianFeatures.some(f => f.id === 'test_custom_berserker_rage')).toBe(true);

            // Verify we can get it directly by class and level
            const level3Features = registry.getClassFeatures('Barbarian', 3);
            expect(level3Features.some(f => f.id === 'test_custom_berserker_rage')).toBe(true);

            // Verify we can get it by ID
            const retrieved = registry.getClassFeatureById('test_custom_berserker_rage');
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('Berserker Rage');
        });

        it('should register class features at multiple levels and retrieve them correctly', () => {
            // Create custom features at different levels for the same class
            const customFeatures: ClassFeature[] = [
                {
                    id: 'test_fighter_level_1',
                    name: 'Fighter Level 1 Test Feature',
                    description: 'Test feature at level 1',
                    type: 'passive' as const,
                    class: 'Fighter' as const,
                    level: 1,
                    source: 'custom' as const
                },
                {
                    id: 'test_fighter_level_5',
                    name: 'Fighter Level 5 Test Feature',
                    description: 'Test feature at level 5',
                    type: 'active' as const,
                    class: 'Fighter' as const,
                    level: 5,
                    source: 'custom' as const
                },
                {
                    id: 'test_fighter_level_10',
                    name: 'Fighter Level 10 Test Feature',
                    description: 'Test feature at level 10',
                    type: 'passive' as const,
                    class: 'Fighter' as const,
                    level: 10,
                    source: 'custom' as const
                }
            ];

            // Register via ExtensionManager
            manager.register('classFeatures', customFeatures);

            // Verify all features are visible
            expect(registry.getClassFeatureById('test_fighter_level_1')).toBeDefined();
            expect(registry.getClassFeatureById('test_fighter_level_5')).toBeDefined();
            expect(registry.getClassFeatureById('test_fighter_level_10')).toBeDefined();

            // Verify getClassFeatures returns cumulative features up to level
            const level5Features = registry.getClassFeatures('Fighter', 5);
            expect(level5Features.some(f => f.id === 'test_fighter_level_1')).toBe(true);
            expect(level5Features.some(f => f.id === 'test_fighter_level_5')).toBe(true);
            expect(level5Features.some(f => f.id === 'test_fighter_level_10')).toBe(false);

            // Verify getFeaturesForLevel returns only features at that level
            const level10OnlyFeatures = registry.getFeaturesForLevel('Fighter', 10);
            expect(level10OnlyFeatures.some(f => f.id === 'test_fighter_level_10')).toBe(true);
            expect(level10OnlyFeatures.some(f => f.id === 'test_fighter_level_1')).toBe(false);
        });

        it('should register features for multiple classes via ExtensionManager', () => {
            // Create custom features for different classes
            const customFeatures: ClassFeature[] = [
                {
                    id: 'test_wizard_cantrip_master',
                    name: 'Cantrip Master',
                    description: 'Wizard test feature',
                    type: 'passive' as const,
                    class: 'Wizard' as const,
                    level: 2,
                    source: 'custom' as const
                },
                {
                    id: 'test_rogue_sneak_attack_plus',
                    name: 'Sneak Attack Plus',
                    description: 'Rogue test feature',
                    type: 'active' as const,
                    class: 'Rogue' as const,
                    level: 3,
                    source: 'custom' as const
                },
                {
                    id: 'test_cleric_divine_intervention',
                    name: 'Divine Intervention Test',
                    description: 'Cleric test feature',
                    type: 'active' as const,
                    class: 'Cleric' as const,
                    level: 5,
                    source: 'custom' as const
                }
            ];

            // Register via ExtensionManager
            manager.register('classFeatures', customFeatures);

            // Verify each class has its features
            expect(registry.getClassFeatureById('test_wizard_cantrip_master')).toBeDefined();
            expect(registry.getClassFeatureById('test_rogue_sneak_attack_plus')).toBeDefined();
            expect(registry.getClassFeatureById('test_cleric_divine_intervention')).toBeDefined();

            // Verify getRegisteredClasses includes all custom classes
            const registeredClasses = registry.getRegisteredClasses();
            expect(registeredClasses).toContain('Wizard');
            expect(registeredClasses).toContain('Rogue');
            expect(registeredClasses).toContain('Cleric');
        });
    });

    describe('Task 8.2.2: getClassFeatures() returns correct features from EM data', () => {
        it('should filter features by class and level correctly', () => {
            // Create features across multiple classes and levels
            const customFeatures: ClassFeature[] = [
                {
                    id: 'test_paladin_1',
                    name: 'Paladin Lvl 1',
                    description: 'Level 1',
                    type: 'passive' as const,
                    class: 'Paladin' as const,
                    level: 1,
                    source: 'custom' as const
                },
                {
                    id: 'test_paladin_3',
                    name: 'Paladin Lvl 3',
                    description: 'Level 3',
                    type: 'active' as const,
                    class: 'Paladin' as const,
                    level: 3,
                    source: 'custom' as const
                },
                {
                    id: 'test_paladin_7',
                    name: 'Paladin Lvl 7',
                    description: 'Level 7',
                    type: 'passive' as const,
                    class: 'Paladin' as const,
                    level: 7,
                    source: 'custom' as const
                },
                {
                    id: 'test_monk_1',
                    name: 'Monk Lvl 1',
                    description: 'Level 1',
                    type: 'passive' as const,
                    class: 'Monk' as const,
                    level: 1,
                    source: 'custom' as const
                }
            ];

            manager.register('classFeatures', customFeatures);

            // Test filtering by class
            const paladinFeatures = registry.getClassFeatures('Paladin', 10);
            expect(paladinFeatures.some(f => f.id === 'test_paladin_1')).toBe(true);
            expect(paladinFeatures.some(f => f.id === 'test_paladin_3')).toBe(true);
            expect(paladinFeatures.some(f => f.id === 'test_paladin_7')).toBe(true);
            expect(paladinFeatures.some(f => f.id === 'test_monk_1')).toBe(false); // Wrong class

            // Test filtering by level
            const paladinLevel3 = registry.getClassFeatures('Paladin', 3);
            expect(paladinLevel3.some(f => f.id === 'test_paladin_1')).toBe(true);
            expect(paladinLevel3.some(f => f.id === 'test_paladin_3')).toBe(true);
            expect(paladinLevel3.some(f => f.id === 'test_paladin_7')).toBe(false); // Too high level

            // Test exact level query
            const paladinLevel7Only = registry.getFeaturesForLevel('Paladin', 7);
            expect(paladinLevel7Only.some(f => f.id === 'test_paladin_7')).toBe(true);
            expect(paladinLevel7Only.some(f => f.id === 'test_paladin_1')).toBe(false);
        });

        it('should include default features from ExtensionManager', () => {
            // Verify default features are accessible
            // DEFAULT_CLASS_FEATURES are initialized via initializeFeatureDefaults()

            // Check that we have default features for some classes
            const fighterFeatures = registry.getClassFeatures('Fighter', 20);
            expect(fighterFeatures.length).toBeGreaterThan(0);

            // Verify default features include expected features
            // (We check for features that should exist in DEFAULT_CLASS_FEATURES)
            const allFeatures = registry.getAllClassFeatures();

            // Verify we have the default features from ExtensionManager
            expect(allFeatures.size).toBeGreaterThan(0);

            // Check that getRegistryStats includes default features
            const stats = registry.getRegistryStats();
            expect(stats.totalClassFeatures).toBeGreaterThanOrEqual(DEFAULT_CLASS_FEATURES.length);
        });
    });

    describe('Task 8.2.3: getFeaturesForLevel() filters correctly from EM data', () => {
        it('should return only features gained at a specific level', () => {
            // Get initial count of default Bard features at level 1
            const initialLevel1Count = registry.getFeaturesForLevel('Bard', 1).length;

            // Create features at specific levels
            const customFeatures: ClassFeature[] = [
                {
                    id: 'test_bard_1_feat',
                    name: 'Bard Level 1',
                    description: 'Level 1',
                    type: 'passive' as const,
                    class: 'Bard' as const,
                    level: 1,
                    source: 'custom' as const
                },
                {
                    id: 'test_bard_1_second',
                    name: 'Bard Level 1 Second',
                    description: 'Another level 1',
                    type: 'passive' as const,
                    class: 'Bard' as const,
                    level: 1,
                    source: 'custom' as const
                },
                {
                    id: 'test_bard_5_feat',
                    name: 'Bard Level 5',
                    description: 'Level 5',
                    type: 'active' as const,
                    class: 'Bard' as const,
                    level: 5,
                    source: 'custom' as const
                }
            ];

            manager.register('classFeatures', customFeatures);
            registry.invalidateCache();

            // Get features at exactly level 1 (defaults + our 2 custom)
            const level1Features = registry.getFeaturesForLevel('Bard', 1);
            expect(level1Features.length).toBe(initialLevel1Count + 2);
            expect(level1Features.every(f => f.level === 1)).toBe(true);
            expect(level1Features.some(f => f.id === 'test_bard_1_feat')).toBe(true);
            expect(level1Features.some(f => f.id === 'test_bard_1_second')).toBe(true);
            expect(level1Features.some(f => f.id === 'test_bard_5_feat')).toBe(false);

            // Get features at exactly level 5 (defaults + our 1 custom)
            const level5Features = registry.getFeaturesForLevel('Bard', 5);
            expect(level5Features.some(f => f.id === 'test_bard_5_feat')).toBe(true);
        });

        it('should return empty array for level with no features', () => {
            const featuresAtLevel99 = registry.getFeaturesForLevel('Fighter', 99);
            expect(featuresAtLevel99).toEqual([]);

            const featuresAtLevel0 = registry.getFeaturesForLevel('Wizard', 0);
            expect(featuresAtLevel0).toEqual([]);
        });

        it('should use alias getClassFeaturesForLevel correctly', () => {
            // Test the alias method works the same as getFeaturesForLevel
            const customFeature: ClassFeature = {
                id: 'test_druid_2',
                name: 'Druid Level 2',
                description: 'Level 2',
                type: 'passive' as const,
                class: 'Druid' as const,
                level: 2,
                source: 'custom' as const
            };

            manager.register('classFeatures', [customFeature]);

            const result1 = registry.getFeaturesForLevel('Druid', 2);
            const result2 = registry.getClassFeaturesForLevel('Druid', 2);

            expect(result1).toEqual(result2);
            expect(result2.some(f => f.id === 'test_druid_2')).toBe(true);
        });
    });

    describe('Task 8.2.4: Cache invalidation works after EM registration', () => {
        it('should invalidate cache after ExtensionManager registration', () => {
            // Get initial state - build cache
            const initialStats = registry.getRegistryStats();
            const initialBarbarianCount = registry.getClassFeatures('Barbarian', 20).length;

            // Register new feature via ExtensionManager
            const newFeature: ClassFeature = {
                id: 'test_cache_invalidation_barbarian',
                name: 'Cache Invalidation Test',
                description: 'Testing cache invalidation',
                type: 'active' as const,
                class: 'Barbarian' as const,
                level: 5,
                source: 'custom' as const
            };

            manager.register('classFeatures', [newFeature]);

            // Invalidate cache explicitly
            registry.invalidateCache();

            // Verify new feature is visible after cache invalidation
            const newStats = registry.getRegistryStats();
            expect(newStats.totalClassFeatures).toBe(initialStats.totalClassFeatures + 1);

            const newBarbarianFeatures = registry.getClassFeatures('Barbarian', 20);
            expect(newBarbarianFeatures.length).toBe(initialBarbarianCount + 1);
            expect(newBarbarianFeatures.some(f => f.id === 'test_cache_invalidation_barbarian')).toBe(true);
        });

        it('should rebuild getAllClassFeatures index after cache invalidation', () => {
            // Build initial cache
            const initialClasses = registry.getRegisteredClasses();
            const initialHasSorcerer = initialClasses.includes('Sorcerer');

            // Register Sorcerer feature
            const sorcererFeature: ClassFeature = {
                id: 'test_sorcerer_feature',
                name: 'Sorcerer Test Feature',
                description: 'Test',
                type: 'passive' as const,
                class: 'Sorcerer' as const,
                level: 1,
                source: 'custom' as const
            };

            manager.register('classFeatures', [sorcererFeature]);
            registry.invalidateCache();

            // Verify getRegisteredClasses sees the new class
            const newClasses = registry.getRegisteredClasses();
            expect(newClasses.includes('Sorcerer')).toBe(true);

            // Verify getAllClassFeatures has the new class
            const allFeatures = registry.getAllClassFeatures();
            expect(allFeatures.has('Sorcerer')).toBe(true);
            expect(allFeatures.get('Sorcerer')?.some(f => f.id === 'test_sorcerer_feature')).toBe(true);
        });

        it('should handle multiple cache invalidations', () => {
            let featureCount = registry.getRegistryStats().totalClassFeatures;

            // Register multiple features in batches with cache invalidation
            for (let i = 0; i < 3; i++) {
                const feature: ClassFeature = {
                    id: `test_batch_${i}`,
                    name: `Batch Feature ${i}`,
                    description: `Feature ${i}`,
                    type: 'passive' as const,
                    class: 'Ranger' as const,
                    level: 1 + i,
                    source: 'custom' as const
                };

                manager.register('classFeatures', [feature]);
                registry.invalidateCache();

                const newStats = registry.getRegistryStats();
                expect(newStats.totalClassFeatures).toBe(++featureCount);
            }

            // Verify all features are accessible
            expect(registry.getClassFeatureById('test_batch_0')).toBeDefined();
            expect(registry.getClassFeatureById('test_batch_1')).toBeDefined();
            expect(registry.getClassFeatureById('test_batch_2')).toBeDefined();
        });
    });

    describe('Additional integration tests for comprehensive coverage', () => {
        it('should register via FeatureRegistry convenience wrapper and store in EM', () => {
            // Use FeatureRegistry.registerClassFeature() convenience method
            const customFeature: ClassFeature = {
                id: 'test_wrapper_registration',
                name: 'Wrapper Registration Test',
                description: 'Testing convenience wrapper registration',
                type: 'active' as const,
                class: 'Warlock' as const,
                level: 3,
                source: 'custom' as const
            };

            registry.registerClassFeature(customFeature);

            // Verify it's in ExtensionManager
            const emFeatures = manager.get('classFeatures') as ClassFeature[];
            expect(emFeatures.some(f => f.id === 'test_wrapper_registration')).toBe(true);

            // Verify FeatureRegistry can still access it
            expect(registry.getClassFeatureById('test_wrapper_registration')).toBeDefined();
        });

        it('should validate features during registration via FeatureRegistry', () => {
            // Try to register invalid feature (missing required fields)
            const invalidFeature = {
                id: 'test_invalid'
                // Missing required fields: name, type, class, level, source
            };

            expect(() => {
                registry.registerClassFeature(invalidFeature as ClassFeature);
            }).toThrow();
        });

        it('should handle duplicate feature ID detection across EM and registry', () => {
            const feature: ClassFeature = {
                id: 'test_duplicate_detection',
                name: 'Duplicate Test',
                description: 'Test',
                type: 'passive' as const,
                class: 'Fighter' as const,
                level: 1,
                source: 'custom' as const
            };

            // Register via ExtensionManager
            manager.register('classFeatures', [feature]);
            registry.invalidateCache();

            // Try to register same ID via FeatureRegistry
            expect(() => {
                registry.registerClassFeature(feature);
            }).toThrow(/already exists/);
        });

        it('should persist features across ExtensionManager reset when re-registered', () => {
            const feature: ClassFeature = {
                id: 'test_persistence',
                name: 'Persistence Test',
                description: 'Test',
                type: 'passive' as const,
                class: 'Bard' as const,
                level: 1,
                source: 'custom' as const
            };

            manager.register('classFeatures', [feature]);
            registry.invalidateCache();
            expect(registry.getClassFeatureById('test_persistence')).toBeDefined();

            // Reset and verify feature is gone
            manager.reset('classFeatures');
            registry.invalidateCache();
            expect(registry.getClassFeatureById('test_persistence')).toBeUndefined();

            // Re-register and verify it's back
            manager.register('classFeatures', [feature]);
            registry.invalidateCache(); // Need to invalidate after re-registration
            expect(registry.getClassFeatureById('test_persistence')).toBeDefined();
        });

        it('should correctly count class features in getRegistryStats', () => {
            const initialStats = registry.getRegistryStats();

            // Register features for an existing class
            const newClassFeatures: ClassFeature[] = [
                {
                    id: 'test_stat_1',
                    name: 'Stat Test 1',
                    description: 'Test',
                    type: 'passive' as const,
                    class: 'Ranger' as const,
                    level: 1,
                    source: 'custom' as const
                },
                {
                    id: 'test_stat_2',
                    name: 'Stat Test 2',
                    description: 'Test',
                    type: 'active' as const,
                    class: 'Ranger' as const,
                    level: 3,
                    source: 'custom' as const
                }
            ];

            manager.register('classFeatures', newClassFeatures);
            registry.invalidateCache();

            const newStats = registry.getRegistryStats();
            expect(newStats.totalClassFeatures).toBe(initialStats.totalClassFeatures + 2);
        });
    });
});
