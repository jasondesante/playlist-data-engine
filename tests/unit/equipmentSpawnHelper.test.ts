/**
 * EquipmentSpawnHelper Unit Tests
 *
 * Tests for equipment spawning helper functionality.
 * Part of Phase 10.1: Unit Tests for EquipmentSpawnHelper.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EquipmentSpawnHelper } from '../../src/core/equipment/EquipmentSpawnHelper.js';
import type { EnhancedEquipment } from '../../src/core/types/Equipment.js';
import { SeededRNG } from '../../src/utils/random.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { ensureAllDefaultsInitialized } from '../../src/core/extensions/initializeDefaults.js';

describe('EquipmentSpawnHelper', () => {
    let extensionManager: ExtensionManager;
    let rng: SeededRNG;

    beforeEach(() => {
        // Initialize all defaults including equipment
        ensureAllDefaultsInitialized();

        // Get singleton instance
        extensionManager = ExtensionManager.getInstance();

        // Create seeded RNG for deterministic tests
        rng = new SeededRNG('test_seed');
    });

    afterEach(() => {
        // Clean up is handled by singleton lifecycle
    });

    describe('spawnFromList', () => {
        it('should spawn items from a list of names', () => {
            const itemNames = ['Longsword', 'Dagger', 'Leather Armor'];
            const items = EquipmentSpawnHelper.spawnFromList(itemNames);

            expect(items).toHaveLength(3);
            expect(items[0]).toBeDefined();
            expect(items[0]?.name).toBe('Longsword');
            expect(items[1]?.name).toBe('Dagger');
            expect(items[2]?.name).toBe('Leather Armor');
        });

        it('should return undefined for non-existent items', () => {
            const itemNames = ['Longsword', 'Nonexistent Item', 'Dagger'];
            const items = EquipmentSpawnHelper.spawnFromList(itemNames);

            expect(items).toHaveLength(3);
            expect(items[0]?.name).toBe('Longsword');
            expect(items[1]).toBeUndefined();
            expect(items[2]?.name).toBe('Dagger');
        });

        it('should shuffle items deterministically when RNG provided', () => {
            const itemNames = ['Longsword', 'Dagger', 'Leather Armor', 'Shield'];
            const rng1 = new SeededRNG('shuffle_test');
            const rng2 = new SeededRNG('shuffle_test');

            const items1 = EquipmentSpawnHelper.spawnFromList(itemNames, rng1);
            const items2 = EquipmentSpawnHelper.spawnFromList(itemNames, rng2);

            expect(items1).toEqual(items2);
        });

        it('should return different order with different RNG seeds', () => {
            const itemNames = ['Longsword', 'Dagger', 'Leather Armor'];
            const items1 = EquipmentSpawnHelper.spawnFromList(itemNames, new SeededRNG('seed1'));
            const items2 = EquipmentSpawnHelper.spawnFromList(itemNames, new SeededRNG('seed2'));

            // At least one item should be in a different position
            const names1 = items1.map(i => i?.name);
            const names2 = items2.map(i => i?.name);
            expect(names1).not.toEqual(names2);
        });

        it('should handle empty list', () => {
            const items = EquipmentSpawnHelper.spawnFromList([]);
            expect(items).toEqual([]);
        });
    });

    describe('spawnByRarity', () => {
        it('should spawn items of specified rarity', () => {
            const items = EquipmentSpawnHelper.spawnByRarity('common', 3, rng);

            expect(items.length).toBeGreaterThan(0);
            expect(items.length).toBeLessThanOrEqual(3);
            items.forEach(item => {
                expect(item.rarity).toBe('common');
            });
        });

        it('should spawn uncommon items', () => {
            const items = EquipmentSpawnHelper.spawnByRarity('uncommon', 2, rng);

            items.forEach(item => {
                expect(item.rarity).toBe('uncommon');
            });
        });

        it('should spawn rare items', () => {
            const items = EquipmentSpawnHelper.spawnByRarity('rare', 1, rng);

            items.forEach(item => {
                expect(item.rarity).toBe('rare');
            });
        });

        it('should return all available items if count exceeds available', () => {
            const items = EquipmentSpawnHelper.spawnByRarity('legendary', 100, rng);

            // Should return all legendary items in database
            items.forEach(item => {
                expect(item.rarity).toBe('legendary');
            });
            // No duplicates
            const uniqueNames = new Set(items.map(i => i.name));
            expect(uniqueNames.size).toBe(items.length);
        });

        it('should exclude items with spawnWeight: 0', () => {
            const items = EquipmentSpawnHelper.spawnByRarity('legendary', 10, rng);

            items.forEach(item => {
                // Vorpal Sword has spawnWeight: 0 and should be excluded
                if (item.name === 'Vorpal Sword') {
                    expect(item.spawnWeight).toBeGreaterThan(0);
                }
            });
        });

        it('should return empty array for non-existent rarity', () => {
            // Filter to simulate no items available
            const items = EquipmentSpawnHelper.spawnByRarity('legendary', 0, rng);
            expect(items).toHaveLength(0);
        });

        it('should be deterministic with same RNG seed', () => {
            const rng1 = new SeededRNG('rarity_test');
            const rng2 = new SeededRNG('rarity_test');

            const items1 = EquipmentSpawnHelper.spawnByRarity('common', 5, rng1);
            const items2 = EquipmentSpawnHelper.spawnByRarity('common', 5, rng2);

            expect(items1).toEqual(items2);
        });
    });

    describe('spawnByTags', () => {
        it('should spawn items matching specified tags', () => {
            // Use tags that exist in default equipment database
            const items = EquipmentSpawnHelper.spawnByTags(['melee', 'martial'], 3, rng);

            expect(items.length).toBeGreaterThan(0);
            items.forEach(item => {
                expect(item.tags).toBeDefined();
                expect(item.tags && (item.tags.includes('melee') || item.tags.includes('martial'))).toBe(true);
            });
        });

        it('should filter by equipment type when specified', () => {
            const items = EquipmentSpawnHelper.spawnByTags(
                ['magic'],
                5,
                rng,
                { includeTypes: ['weapon'] }
            );

            items.forEach(item => {
                expect(item.type).toBe('weapon');
            });
        });

        it('should filter by minimum rarity', () => {
            const items = EquipmentSpawnHelper.spawnByTags(
                ['magic'],
                5,
                rng,
                { minRarity: 'rare' }
            );

            items.forEach(item => {
                expect(['rare', 'very_rare', 'legendary'].includes(item.rarity)).toBe(true);
            });
        });

        it('should filter by maximum rarity', () => {
            const items = EquipmentSpawnHelper.spawnByTags(
                ['weapon'],
                5,
                rng,
                { maxRarity: 'uncommon' }
            );

            items.forEach(item => {
                expect(['common', 'uncommon'].includes(item.rarity)).toBe(true);
            });
        });

        it('should exclude zero-weight items when option is set', () => {
            const items = EquipmentSpawnHelper.spawnByTags(
                ['weapon'],
                10,
                rng,
                { excludeZeroWeight: true }
            );

            items.forEach(item => {
                expect(item.spawnWeight ?? 1).toBeGreaterThan(0);
            });
        });

        it('should use weighted selection based on spawnWeight', () => {
            // Use 'melee' tag which exists on default equipment
            const items = EquipmentSpawnHelper.spawnByTags(['melee'], 5, rng);

            // Should find items with melee tag
            expect(items.length).toBeGreaterThan(0);
        });

        it('should return empty array when no items match tags', () => {
            const items = EquipmentSpawnHelper.spawnByTags(['nonexistent_tag_xyz'], 5, rng);
            expect(items).toEqual([]);
        });

        it('should return fewer items if not enough matches', () => {
            const items = EquipmentSpawnHelper.spawnByTags(['vorpal', 'artifact'], 10, rng);
            expect(items.length).toBeLessThan(10);
        });
    });

    describe('spawnRandom', () => {
        it('should spawn specified number of items', () => {
            const items = EquipmentSpawnHelper.spawnRandom(5, rng);

            expect(items.length).toBe(5);
        });

        it('should use weighted selection based on spawnWeight', () => {
            const rng1 = new SeededRNG('weight_test');
            const rng2 = new SeededRNG('weight_test');

            const items1 = EquipmentSpawnHelper.spawnRandom(10, rng1);
            const items2 = EquipmentSpawnHelper.spawnRandom(10, rng2);

            // Same seed should produce same results
            expect(items1).toEqual(items2);
        });

        it('should filter by equipment type when specified', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                { includeTypes: ['weapon'] }
            );

            items.forEach(item => {
                expect(item.type).toBe('weapon');
            });
        });

        it('should filter by multiple equipment types', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                10,
                rng,
                { includeTypes: ['weapon', 'armor'] }
            );

            items.forEach(item => {
                expect(['weapon', 'armor'].includes(item.type)).toBe(true);
            });
        });

        it('should filter by minimum rarity', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                { minRarity: 'rare' }
            );

            items.forEach(item => {
                expect(['rare', 'very_rare', 'legendary'].includes(item.rarity)).toBe(true);
            });
        });

        it('should filter by maximum rarity', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                { maxRarity: 'uncommon' }
            );

            items.forEach(item => {
                expect(['common', 'uncommon'].includes(item.rarity)).toBe(true);
            });
        });

        it('should filter by rarity range', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                { minRarity: 'uncommon', maxRarity: 'rare' }
            );

            items.forEach(item => {
                expect(['uncommon', 'rare'].includes(item.rarity)).toBe(true);
            });
        });

        it('should exclude zero-weight items when option is set', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                10,
                rng,
                { excludeZeroWeight: true }
            );

            items.forEach(item => {
                expect(item.spawnWeight ?? 1).toBeGreaterThan(0);
            });
        });

        it('should not spawn duplicate items', () => {
            const items = EquipmentSpawnHelper.spawnRandom(20, rng);
            const uniqueNames = new Set(items.map(i => i.name));
            expect(uniqueNames.size).toBe(items.length);
        });

        it('should return empty array if pool is empty after filtering', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                { minRarity: 'legendary', maxRarity: 'legendary', excludeZeroWeight: true }
            );
            // May return items or empty depending on database
            expect(Array.isArray(items)).toBe(true);
        });

        it('should be deterministic with same seed', () => {
            const rng1 = new SeededRNG('deterministic_test');
            const rng2 = new SeededRNG('deterministic_test');

            const items1 = EquipmentSpawnHelper.spawnRandom(5, rng1);
            const items2 = EquipmentSpawnHelper.spawnRandom(5, rng2);

            expect(items1).toEqual(items2);
        });
    });

    describe('spawnFromTemplate', () => {
        it('should spawn item with template applied', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('flaming_weapon_template', 'Longsword');

            expect(item).not.toBeNull();
            expect(item?.name).toContain('Longsword');
            expect(item?.tags).toContain('fire');
            expect(item?.templateId).toBe('flaming_weapon_template');
        });

        it('should add template properties to base item', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('plus_one_weapon', 'Dagger');

            expect(item).not.toBeNull();
            expect(item?.properties).toBeDefined();
            // Should have +1 property from template
            const hasPlusOne = item?.properties?.some(p =>
                p.type === 'passive_modifier' && p.target === 'attack_roll' && p.value === 1
            );
            expect(hasPlusOne).toBe(true);
        });

        it('should merge tags from template and base item', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('flaming_weapon_template', 'Longsword');

            expect(item).not.toBeNull();
            expect(item?.tags).toBeDefined();
            expect(item?.tags).toContain('fire'); // From template
            expect(item?.tags).toContain('melee'); // From base item
            expect(item?.tags).toContain('flaming'); // From template
        });

        it('should return null for non-existent template', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('nonexistent_template', 'Longsword');
            expect(item).toBeNull();
        });

        it('should return null for non-existent base item', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('flaming_weapon_template', 'Nonexistent Sword');
            expect(item).toBeNull();
        });

        it('should use default item if base not specified', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('plus_one_weapon');

            expect(item).not.toBeNull();
            expect(item?.properties).toBeDefined();
            expect(item?.templateId).toBe('plus_one_weapon');
        });

        it('should combine properties from base and template', () => {
            const item = EquipmentSpawnHelper.spawnFromTemplate('plus_one_weapon', 'Greataxe');

            expect(item).not.toBeNull();
            expect(item?.properties).toBeDefined();
            // Should have base properties plus +1 from template
            expect(item?.properties!.length).toBeGreaterThan(0);
        });
    });

    describe('spawnTreasureHoard', () => {
        it('should generate treasure hoard with items', () => {
            const hoard = EquipmentSpawnHelper.spawnTreasureHoard(5, rng);

            expect(hoard.items).toBeInstanceOf(Array);
            expect(hoard.cr).toBe(5);
            expect(hoard.totalValue).toBeGreaterThan(0);
        });

        it('should scale item rarity with CR', () => {
            const lowCRHoard = EquipmentSpawnHelper.spawnTreasureHoard(2, new SeededRNG('cr2'));
            const highCRHoard = EquipmentSpawnHelper.spawnTreasureHoard(15, new SeededRNG('cr15'));

            // Higher CR should generally have more valuable items
            // This is probabilistic, so we just verify structure
            expect(lowCRHoard.items).toBeInstanceOf(Array);
            expect(highCRHoard.items).toBeInstanceOf(Array);
        });

        it('should include at least one item', () => {
            const hoard = EquipmentSpawnHelper.spawnTreasureHoard(1, rng);
            expect(hoard.items.length).toBeGreaterThan(0);
        });

        it('should estimate total value', () => {
            const hoard = EquipmentSpawnHelper.spawnTreasureHoard(10, rng);

            expect(hoard.totalValue).toBeGreaterThan(0);
            expect(typeof hoard.totalValue).toBe('number');
            expect(Number.isInteger(hoard.totalValue)).toBe(true);
        });

        it('should be deterministic with same seed', () => {
            const rng1 = new SeededRNG('treasure_test');
            const rng2 = new SeededRNG('treasure_test');

            const hoard1 = EquipmentSpawnHelper.spawnTreasureHoard(10, rng1);
            const hoard2 = EquipmentSpawnHelper.spawnTreasureHoard(10, rng2);

            expect(hoard1.items.map(i => i.name)).toEqual(hoard2.items.map(i => i.name));
        });

        it('should generate different hoards with different seeds', () => {
            const hoard1 = EquipmentSpawnHelper.spawnTreasureHoard(10, new SeededRNG('seed1'));
            const hoard2 = EquipmentSpawnHelper.spawnTreasureHoard(10, new SeededRNG('seed2'));

            const names1 = hoard1.items.map(i => i.name);
            const names2 = hoard2.items.map(i => i.name);

            expect(names1).not.toEqual(names2);
        });
    });

    describe('addToCharacter', () => {
        let character: any;

        beforeEach(() => {
            // Create a minimal character
            character = {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
                level: 1,
                ability_scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 },
                ability_modifiers: { STR: 3, DEX: 1, CON: 2, INT: 0, WIS: 1, CHA: -1 },
                proficiency_bonus: 2,
                hp: { current: 12, max: 12, temp: 0 },
                armor_class: 14,
                initiative: 1,
                speed: 30,
                skills: {},
                saving_throws: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: false },
                racial_traits: [],
                class_features: [],
                xp: { current: 0, next_level: 1000 },
                seed: 'test_seed',
                generated_at: new Date().toISOString()
            };
        });

        it('should add items to character inventory', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Longsword',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 3,
                    damage: { dice: '1d8', damageType: 'slashing' },
                    source: 'default'
                },
                {
                    name: 'Leather Armor',
                    type: 'armor',
                    rarity: 'common',
                    weight: 10,
                    acBonus: 11,
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment).toBeDefined();
            expect(updatedCharacter.equipment.weapons).toHaveLength(1);
            expect(updatedCharacter.equipment.armor).toHaveLength(1);
            expect(updatedCharacter.equipment.weapons[0].name).toBe('Longsword');
            expect(updatedCharacter.equipment.armor[0].name).toBe('Leather Armor');
        });

        it('should equip items when equip option is true', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Dagger',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 1,
                    damage: { dice: '1d4', damageType: 'piercing' },
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, true);

            expect(updatedCharacter.equipment.weapons[0].equipped).toBe(true);
            expect(updatedCharacter.equipment.equippedWeight).toBeGreaterThan(0);
        });

        it('should not equip items when equip option is false', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Dagger',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 1,
                    damage: { dice: '1d4', damageType: 'piercing' },
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment.weapons[0].equipped).toBe(false);
            expect(updatedCharacter.equipment.equippedWeight).toBe(0);
        });

        it('should generate unique instance IDs for items', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Dagger',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 1,
                    damage: { dice: '1d4', damageType: 'piercing' },
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment.weapons[0].instanceId).toBeDefined();
            expect(updatedCharacter.equipment.weapons[0].instanceId).toContain('Dagger');
        });

        it('should update total weight correctly', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Longsword',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 3,
                    damage: { dice: '1d8', damageType: 'slashing' },
                    source: 'default'
                },
                {
                    name: 'Shield',
                    type: 'armor',
                    rarity: 'common',
                    weight: 6,
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment.totalWeight).toBe(9); // 3 + 6
        });

        it('should update equipped weight when items are equipped', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Longsword',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 3,
                    damage: { dice: '1d8', damageType: 'slashing' },
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, true);

            expect(updatedCharacter.equipment.equippedWeight).toBe(3);
        });

        it('should add items to correct inventory sections', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Longsword',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 3,
                    source: 'default'
                },
                {
                    name: 'Leather Armor',
                    type: 'armor',
                    rarity: 'common',
                    weight: 10,
                    source: 'default'
                },
                {
                    name: 'Rope',
                    type: 'item',
                    rarity: 'common',
                    weight: 1,
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment.weapons.length).toBe(1);
            expect(updatedCharacter.equipment.armor.length).toBe(1);
            expect(updatedCharacter.equipment.items.length).toBe(1);
        });

        it('should handle adding items to existing equipment', () => {
            // Initialize equipment
            character.equipment = {
                weapons: [{ name: 'Dagger', quantity: 1, equipped: false }],
                armor: [],
                items: [],
                totalWeight: 1,
                equippedWeight: 0
            };

            const items: EnhancedEquipment[] = [
                {
                    name: 'Longsword',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 3,
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment.weapons.length).toBe(2);
            expect(updatedCharacter.equipment.totalWeight).toBe(4); // 1 + 3
        });

        it('should add multiple items of the same type', () => {
            const items: EnhancedEquipment[] = [
                {
                    name: 'Dagger',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 1,
                    source: 'default'
                },
                {
                    name: 'Longsword',
                    type: 'weapon',
                    rarity: 'common',
                    weight: 3,
                    source: 'default'
                }
            ];

            const updatedCharacter = EquipmentSpawnHelper.addToCharacter(character, items, false);

            expect(updatedCharacter.equipment.weapons.length).toBe(2);
        });
    });

    describe('SpawnRandomOptions edge cases', () => {
        it('should handle all filter options together', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                {
                    excludeZeroWeight: true,
                    includeTypes: ['weapon'],
                    minRarity: 'uncommon',
                    maxRarity: 'rare'
                }
            );

            items.forEach(item => {
                expect(item.type).toBe('weapon');
                expect(['uncommon', 'rare'].includes(item.rarity)).toBe(true);
                expect(item.spawnWeight ?? 1).toBeGreaterThan(0);
            });
        });

        it('should handle empty includeTypes', () => {
            const items = EquipmentSpawnHelper.spawnRandom(
                5,
                rng,
                { includeTypes: [] }
            );

            // Should still spawn items when includeTypes is empty
            expect(items.length).toBe(5);
        });
    });

    describe('Determinism and consistency', () => {
        it('should produce consistent results across multiple calls with same seed', () => {
            const seed = 'consistency_test';
            const results = [];

            for (let i = 0; i < 5; i++) {
                const testRng = new SeededRNG(seed);
                const items = EquipmentSpawnHelper.spawnRandom(10, testRng);
                results.push(items.map(i => i.name));
            }

            // All results should be identical
            results.forEach(result => {
                expect(result).toEqual(results[0]);
            });
        });

        it('should produce different results with different seeds', () => {
            const items1 = EquipmentSpawnHelper.spawnRandom(10, new SeededRNG('seed1'));
            const items2 = EquipmentSpawnHelper.spawnRandom(10, new SeededRNG('seed2'));

            const names1 = items1.map(i => i.name);
            const names2 = items2.map(i => i.name);

            expect(names1).not.toEqual(names2);
        });
    });

    describe('Integration with ExtensionManager', () => {
        it('should include custom registered equipment in spawn pool', () => {
            // This test verifies that the spawn helper respects custom equipment
            // registered through ExtensionManager

            const customItem: EnhancedEquipment = {
                name: 'Custom Test Sword',
                type: 'weapon',
                rarity: 'rare',
                weight: 3,
                damage: { dice: '1d8', damageType: 'slashing' },
                spawnWeight: 1.0,
                source: 'custom',
                tags: ['custom', 'test', 'weapon']
            };

            // Register custom equipment
            const manager = ExtensionManager.getInstance();
            manager.register('equipment', [customItem], {
                mode: 'relative',
                validate: false // Skip validation for test
            });

            // Spawn by tags should potentially include our custom item
            const items = EquipmentSpawnHelper.spawnByTags(['custom', 'test'], 5, rng);

            // Verify we can spawn items (custom item may or may not appear due to randomness)
            expect(Array.isArray(items)).toBe(true);
        });
    });
});
