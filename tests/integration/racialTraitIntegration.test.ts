/**
 * Integration test for FeatureQuery and ExtensionManager integration
 * Phase 11, Task 11.2: Add Integration Tests for Racial Traits
 *
 * Tests the interaction between FeatureQuery (convenience wrapper) and
 * ExtensionManager (single source of truth) for racial traits.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { FeatureQuery } from '../../src/core/features/FeatureQuery.js';
import { initializeFeatureDefaults } from '../../src/core/extensions/initializeDefaults.js';
import { DEFAULT_RACIAL_TRAITS } from '../../src/core/features/index.js';
import { registerTestRacialTrait } from '../helpers/registrationHelpers.js';
import type { RacialTrait } from '../../src/core/features/FeatureTypes.js';

describe('Phase 11.2: FeatureQuery/ExtensionManager Integration for Racial Traits', () => {
    let registry: FeatureQuery;
    let manager: ExtensionManager;

    beforeEach(() => {
        // Get FeatureQuery and ExtensionManager instances
        registry = FeatureQuery.getInstance();
        manager = ExtensionManager.getInstance();

        // Reset instances for clean state
        manager.resetAll();

        // Initialize with default features for each test
        initializeFeatureDefaults();
    });

    describe('Task 11.2.1: Register via ExtensionManager and FeatureQuery sees it', () => {
        it('should register via ExtensionManager and FeatureQuery.getRacialTraits() sees it', () => {
            // Create a custom racial trait
            const customTrait: RacialTrait = {
                id: 'test_custom_dragon_fire_resistance',
                name: 'Fire Resistance',
                description: 'A test custom dragonborn fire resistance trait for integration testing',
                race: 'Dragonborn' as const,
                source: 'custom' as const,
                tags: ['fire', 'test']
            };

            // Register via ExtensionManager
            manager.register('racialTraits', [customTrait]);

            // Verify FeatureQuery sees it via getRacialTraits()
            const dragonbornTraits = registry.getRacialTraits('Dragonborn');
            expect(dragonbornTraits.some(t => t.id === 'test_custom_dragon_fire_resistance')).toBe(true);

            // Verify we can get it directly by ID
            const retrieved = registry.getRacialTraitById('test_custom_dragon_fire_resistance');
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe('Fire Resistance');
        });

        it('should register racial traits for multiple races via ExtensionManager', () => {
            // Create custom traits for different races
            const customTraits: RacialTrait[] = [
                {
                    id: 'test_elf_magic_resistance',
                    name: 'Magic Resistance',
                    description: 'Elf test trait',
                    race: 'Elf' as const,
                    source: 'custom' as const,
                    tags: ['magic', 'defense']
                },
                {
                    id: 'test_dwarf_stone_form',
                    name: 'Stone Form',
                    description: 'Dwarf test trait',
                    race: 'Dwarf' as const,
                    source: 'custom' as const,
                    tags: ['defense', 'stone']
                },
                {
                    id: 'test_human_adaptability',
                    name: 'Adaptability',
                    description: 'Human test trait',
                    race: 'Human' as const,
                    source: 'custom' as const,
                    tags: ['skill']
                }
            ];

            // Register via ExtensionManager
            manager.register('racialTraits', customTraits);

            // Verify each race has its traits
            expect(registry.getRacialTraitById('test_elf_magic_resistance')).toBeDefined();
            expect(registry.getRacialTraitById('test_dwarf_stone_form')).toBeDefined();
            expect(registry.getRacialTraitById('test_human_adaptability')).toBeDefined();

            // Verify getRegisteredRaces includes all custom races
            const registeredRaces = registry.getRegisteredRaces();
            expect(registeredRaces).toContain('Elf');
            expect(registeredRaces).toContain('Dwarf');
            expect(registeredRaces).toContain('Human');
        });
    });

    describe('Task 11.2.2: getRacialTraits() returns correct traits from EM data', () => {
        it('should filter traits by race correctly', () => {
            // Verify default traits are accessible
            const elfTraits = registry.getRacialTraits('Elf');
            expect(elfTraits.length).toBeGreaterThan(0);

            // Verify some known default Elf traits exist
            expect(elfTraits.some(t => t.id === 'elf_darkvision')).toBe(true);
            expect(elfTraits.some(t => t.id === 'elf_keen_senses')).toBe(true);
            expect(elfTraits.some(t => t.id === 'elf_fey_ancestry')).toBe(true);

            // Create additional traits for testing
            const customTraits: RacialTrait[] = [
                {
                    id: 'test_elf_night_vision',
                    name: 'Night Vision',
                    description: 'Additional elf test trait',
                    race: 'Elf' as const,
                    source: 'custom' as const
                },
                {
                    id: 'test_dwarf_night_vision',
                    name: 'Night Vision',
                    description: 'Dwarf test trait',
                    race: 'Dwarf' as const,
                    source: 'custom' as const
                }
            ];

            manager.register('racialTraits', customTraits);

            // Verify Elf gets its own custom traits but not Dwarf's
            const updatedElfTraits = registry.getRacialTraits('Elf');
            expect(updatedElfTraits.some(t => t.id === 'test_elf_night_vision')).toBe(true);
            expect(updatedElfTraits.some(t => t.id === 'test_dwarf_night_vision')).toBe(false);

            const dwarfTraits = registry.getRacialTraits('Dwarf');
            expect(dwarfTraits.some(t => t.id === 'test_dwarf_night_vision')).toBe(true);
            expect(dwarfTraits.some(t => t.id === 'test_elf_night_vision')).toBe(false);
        });

        it('should include default traits from ExtensionManager', () => {
            // Verify default traits are accessible via getAllRacialTraits
            const allTraits = registry.getAllRacialTraits();
            expect(allTraits.size).toBeGreaterThan(0);

            // Check that we have default traits from ExtensionManager
            expect(allTraits.has('Human')).toBe(true);
            expect(allTraits.has('Elf')).toBe(true);
            expect(allTraits.has('Dwarf')).toBe(true);

            // Check that getQueryStats includes default traits
            const stats = registry.getQueryStats();
            expect(stats.totalRacialTraits).toBeGreaterThanOrEqual(DEFAULT_RACIAL_TRAITS.length);
        });
    });

    describe('Task 11.2.3: getRacialTraitsForSubrace() filters correctly from EM data', () => {
        it('should return base traits plus subrace-specific traits', () => {
            // Create a custom subrace trait
            const customTrait: RacialTrait = {
                id: 'test_high_elf_extra_cantrip',
                name: 'High Elf Cantrip',
                description: 'High elf test trait for integration testing',
                race: 'Elf' as const,
                subrace: 'High Elf',
                source: 'custom' as const,
                tags: ['magic']
            };

            manager.register('racialTraits', [customTrait]);

            // Verify getRacialTraitsForSubrace returns base traits + subrace traits
            const highElfTraits = registry.getRacialTraitsForSubrace('Elf', 'High Elf');

            // Should include base Elf traits
            expect(highElfTraits.some(t => t.id === 'elf_darkvision')).toBe(true);
            expect(highElfTraits.some(t => t.id === 'elf_keen_senses')).toBe(true);

            // Should include subrace-specific trait
            expect(highElfTraits.some(t => t.id === 'test_high_elf_extra_cantrip')).toBe(true);
        });

        it('should getSubraceTraits return only subrace-specific traits', () => {
            // Create a custom subrace trait
            const customTrait: RacialTrait = {
                id: 'test_wood_elf_weapon_training',
                name: 'Wood Elf Weapon Training',
                description: 'Wood elf test trait',
                race: 'Elf' as const,
                subrace: 'Wood Elf',
                source: 'custom' as const,
                tags: ['combat']
            };

            manager.register('racialTraits', [customTrait]);

            // Verify getSubraceTraits returns only subrace-specific traits
            const woodElfOnlyTraits = registry.getSubraceTraits('Elf', 'Wood Elf');

            // Should NOT include base Elf traits
            expect(woodElfOnlyTraits.some(t => t.id === 'elf_darkvision')).toBe(false);
            expect(woodElfOnlyTraits.some(t => t.id === 'elf_keen_senses')).toBe(false);

            // Should include only subrace-specific trait
            expect(woodElfOnlyTraits.some(t => t.id === 'test_wood_elf_weapon_training')).toBe(true);
        });

        it('should handle multiple subraces for same race', () => {
            // Create traits for multiple subraces
            const customTraits: RacialTrait[] = [
                {
                    id: 'test_high_elf_int_bonus',
                    name: 'High Elf Intelligence',
                    description: 'High elf test trait',
                    race: 'Elf' as const,
                    subrace: 'High Elf',
                    source: 'custom' as const
                },
                {
                    id: 'test_wood_elf_wis_bonus',
                    name: 'Wood Elf Wisdom',
                    description: 'Wood elf test trait',
                    race: 'Elf' as const,
                    subrace: 'Wood Elf',
                    source: 'custom' as const
                },
                {
                    id: 'test_drow_dex_bonus',
                    name: 'Drow Dexterity',
                    description: 'Drow test trait',
                    race: 'Elf' as const,
                    subrace: 'Drow',
                    source: 'custom' as const
                }
            ];

            manager.register('racialTraits', customTraits);

            // Verify each subrace gets only its specific traits
            const highElfTraits = registry.getSubraceTraits('Elf', 'High Elf');
            expect(highElfTraits.some(t => t.id === 'test_high_elf_int_bonus')).toBe(true);
            expect(highElfTraits.some(t => t.id === 'test_wood_elf_wis_bonus')).toBe(false);
            expect(highElfTraits.some(t => t.id === 'test_drow_dex_bonus')).toBe(false);

            const woodElfTraits = registry.getSubraceTraits('Elf', 'Wood Elf');
            expect(woodElfTraits.some(t => t.id === 'test_wood_elf_wis_bonus')).toBe(true);
            expect(woodElfTraits.some(t => t.id === 'test_high_elf_int_bonus')).toBe(false);

            const drowTraits = registry.getSubraceTraits('Elf', 'Drow');
            expect(drowTraits.some(t => t.id === 'test_drow_dex_bonus')).toBe(true);
        });
    });

    describe('Task 11.2.4: getAvailableSubraces() derives from EM data', () => {
        it('should derive subraces from registered traits when RACE_DATA not available', () => {
            // First register the custom race with race data
            manager.register('races.data', [{
                race: 'CustomRace',
                speed: 30,
                ability_bonuses: { STR: 2 },
                traits: []
            }]);

            // Create traits for a custom race with subraces
            const customTraits: RacialTrait[] = [
                {
                    id: 'test_custom_race_base_trait',
                    name: 'Custom Race Base Trait',
                    description: 'Base trait',
                    race: 'CustomRace' as any,
                    source: 'custom' as const
                },
                {
                    id: 'test_custom_race_subrace1',
                    name: 'Custom Subrace 1',
                    description: 'Subrace 1 trait',
                    race: 'CustomRace' as any,
                    subrace: 'Mountain Subrace',
                    source: 'custom' as const
                },
                {
                    id: 'test_custom_race_subrace2',
                    name: 'Custom Subrace 2',
                    description: 'Subrace 2 trait',
                    race: 'CustomRace' as any,
                    subrace: 'Forest Subrace',
                    source: 'custom' as const
                }
            ];

            manager.register('racialTraits', customTraits);

            // Verify getAvailableSubraces derives from traits
            const customSubraces = registry.getAvailableSubraces('CustomRace' as any);
            expect(customSubraces).toContain('Mountain Subrace');
            expect(customSubraces).toContain('Forest Subrace');
            expect(customSubraces.length).toBe(2);
        });

        it('should getRaceForSubrace find race from EM data', () => {
            // Create a trait with a subrace
            const customTrait: RacialTrait = {
                id: 'test_custom_subrace_trait',
                name: 'Custom Subrace Trait',
                description: 'Test trait',
                race: 'Halfling' as const,
                subrace: 'Lightfoot Halfling',
                source: 'custom' as const
            };

            manager.register('racialTraits', [customTrait]);

            // Verify getRaceForSubrace finds the race
            const foundRace = registry.getRaceForSubrace('Lightfoot Halfling');
            expect(foundRace).toBe('Halfling');
        });

        it('should return undefined for unknown subrace in getRaceForSubrace', () => {
            const foundRace = registry.getRaceForSubrace('Nonexistent Subrace');
            expect(foundRace).toBeUndefined();
        });
    });

    describe('Task 11.2.5: Cache invalidation works after EM registration', () => {
        it('should invalidate cache after ExtensionManager registration', () => {
            // Get initial state - build cache
            const initialStats = registry.getQueryStats();
            const initialElfCount = registry.getRacialTraits('Elf').length;

            // Register new trait via ExtensionManager (cache is automatically invalidated)
            const newTrait: RacialTrait = {
                id: 'test_cache_invalidation_elf',
                name: 'Cache Invalidation Test',
                description: 'Testing cache invalidation for racial traits',
                race: 'Elf' as const,
                source: 'custom' as const,
                tags: ['test']
            };

            manager.register('racialTraits', [newTrait]);

            // Verify new trait is visible (automatic cache invalidation)
            const newStats = registry.getQueryStats();
            expect(newStats.totalRacialTraits).toBe(initialStats.totalRacialTraits + 1);

            const newElfTraits = registry.getRacialTraits('Elf');
            expect(newElfTraits.length).toBe(initialElfCount + 1);
            expect(newElfTraits.some(t => t.id === 'test_cache_invalidation_elf')).toBe(true);
        });

        it('should rebuild getAllRacialTraits index after cache invalidation', () => {
            // Build initial cache
            const initialRaces = registry.getRegisteredRaces();
            const initialHasTiefling = initialRaces.includes('Tiefling');

            // Register Tiefling trait (if not already present)
            const tieflingTrait: RacialTrait = {
                id: 'test_tiefling_infernal_legacy',
                name: 'Infernal Legacy',
                description: 'Tiefling test trait',
                race: 'Tiefling' as const,
                source: 'custom' as const,
                tags: ['magic']
            };

            manager.register('racialTraits', [tieflingTrait]);

            // Verify getRegisteredRaces sees the new race
            const newRaces = registry.getRegisteredRaces();
            expect(newRaces.includes('Tiefling')).toBe(true);

            // Verify getAllRacialTraits has the new race
            const allTraits = registry.getAllRacialTraits();
            expect(allTraits.has('Tiefling')).toBe(true);
            expect(allTraits.get('Tiefling')?.some(t => t.id === 'test_tiefling_infernal_legacy')).toBe(true);
        });

        it('should handle multiple cache invalidations', () => {
            let traitCount = registry.getQueryStats().totalRacialTraits;

            // Register multiple traits in batches (cache auto-invalidated each time)
            for (let i = 0; i < 3; i++) {
                const trait: RacialTrait = {
                    id: `test_batch_racial_${i}`,
                    name: `Batch Racial Trait ${i}`,
                    description: `Racial trait ${i}`,
                    race: 'Human' as const,
                    source: 'custom' as const,
                    tags: [`test${i}`]
                };

                manager.register('racialTraits', [trait]);

                const newStats = registry.getQueryStats();
                expect(newStats.totalRacialTraits).toBe(++traitCount);
            }

            // Verify all traits are accessible
            expect(registry.getRacialTraitById('test_batch_racial_0')).toBeDefined();
            expect(registry.getRacialTraitById('test_batch_racial_1')).toBeDefined();
            expect(registry.getRacialTraitById('test_batch_racial_2')).toBeDefined();
        });
    });

    describe('Additional integration tests for comprehensive coverage', () => {
        it('should register via helper function and store in EM', () => {
            // Use registerTestRacialTrait() helper function
            const customTrait: RacialTrait = {
                id: 'test_wrapper_registration_racial',
                name: 'Wrapper Registration Test - Racial',
                description: 'Testing convenience wrapper registration for racial traits',
                race: 'Halfling' as const,
                source: 'custom' as const,
                tags: ['test']
            };

            registerTestRacialTrait(customTrait);

            // Verify it's in ExtensionManager
            const emTraits = manager.get('racialTraits') as RacialTrait[];
            expect(emTraits.some(t => t.id === 'test_wrapper_registration_racial')).toBe(true);

            // Verify FeatureQuery can still access it
            expect(registry.getRacialTraitById('test_wrapper_registration_racial')).toBeDefined();
        });

        it('should validate traits during registration via FeatureQuery', () => {
            // Try to register invalid trait (missing required fields)
            const invalidTrait = {
                id: 'test_invalid_racial'
                // Missing required fields: name, race, source
            };

            expect(() => {
                registerTestRacialTrait(invalidTrait as RacialTrait);
            }).toThrow();
        });

        it('should handle duplicate trait ID detection across EM and registry', () => {
            const trait: RacialTrait = {
                id: 'test_duplicate_detection_racial',
                name: 'Duplicate Test Racial',
                description: 'Test',
                race: 'Gnome' as const,
                source: 'custom' as const,
                tags: ['test']
            };

            // Register via ExtensionManager
            manager.register('racialTraits', [trait]);

            // Try to register same ID via helper
            expect(() => {
                registerTestRacialTrait(trait);
            }).toThrow(/already exists/);
        });

        it('should persist traits across ExtensionManager reset when re-registered', () => {
            const trait: RacialTrait = {
                id: 'test_persistence_racial',
                name: 'Persistence Test Racial',
                description: 'Test',
                race: 'Half-Orc' as const,
                source: 'custom' as const,
                tags: ['test']
            };

            manager.register('racialTraits', [trait]);
            expect(registry.getRacialTraitById('test_persistence_racial')).toBeDefined();

            // Reset and verify trait is gone
            manager.reset('racialTraits');
            expect(registry.getRacialTraitById('test_persistence_racial')).toBeUndefined();

            // Re-register and verify it's back
            manager.register('racialTraits', [trait]);
            expect(registry.getRacialTraitById('test_persistence_racial')).toBeDefined();
        });

        it('should correctly count racial traits in getQueryStats', () => {
            const initialStats = registry.getQueryStats();

            // Register traits for an existing race
            const newRacialTraits: RacialTrait[] = [
                {
                    id: 'test_stat_racial_1',
                    name: 'Stat Test Racial 1',
                    description: 'Test',
                    race: 'Dragonborn' as const,
                    source: 'custom' as const,
                    tags: ['test']
                },
                {
                    id: 'test_stat_racial_2',
                    name: 'Stat Test Racial 2',
                    description: 'Test',
                    race: 'Dragonborn' as const,
                    source: 'custom' as const,
                    tags: ['test']
                }
            ];

            manager.register('racialTraits', newRacialTraits);

            const newStats = registry.getQueryStats();
            expect(newStats.totalRacialTraits).toBe(initialStats.totalRacialTraits + 2);
        });

        it('should getBaseRacialTraits exclude subrace-specific traits', () => {
            // Create base and subrace traits
            const customTraits: RacialTrait[] = [
                {
                    id: 'test_base_trait',
                    name: 'Base Trait',
                    description: 'Base trait for all',
                    race: 'Elf' as const,
                    source: 'custom' as const
                },
                {
                    id: 'test_subrace_trait',
                    name: 'Subrace Trait',
                    description: 'Subrace specific',
                    race: 'Elf' as const,
                    subrace: 'High Elf',
                    source: 'custom' as const
                }
            ];

            manager.register('racialTraits', customTraits);

            // Verify getBaseRacialTraits excludes subrace traits
            const baseTraits = registry.getBaseRacialTraits('Elf');
            expect(baseTraits.some(t => t.id === 'test_base_trait')).toBe(true);
            expect(baseTraits.some(t => t.id === 'test_subrace_trait')).toBe(false);
        });

        it('should exportRacialTraits return correct data structure', () => {
            // First register the custom race with race data
            manager.register('races.data', [{
                race: 'Goliath',
                speed: 30,
                ability_bonuses: { STR: 2 },
                traits: []
            }]);

            // Create a custom trait
            const customTrait: RacialTrait = {
                id: 'test_export_trait',
                name: 'Export Test',
                description: 'Test export',
                race: 'Goliath' as const,
                source: 'custom' as const
            };

            manager.register('racialTraits', [customTrait]);

            // Export and verify structure
            const exported = registry.exportRacialTraits();
            expect(typeof exported).toBe('object');
            expect(Array.isArray(exported['Goliath'])).toBe(true);
            expect(exported['Goliath'].some((t: RacialTrait) => t.id === 'test_export_trait')).toBe(true);
        });
    });
});
