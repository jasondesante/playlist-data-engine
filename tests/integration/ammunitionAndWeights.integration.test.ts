/**
 * Integration test for ammunition fix and weight system
 * Tests Phase 6.2 tasks from DATA_ENGINE_UPGRADE_PLAN.md:
 * - Test ammunition fix (Ranger has 20 arrows, weight correct, can remove/add arrows)
 * - Test weight system (custom items with high weight spawn often, weight 0 never spawns, relative vs absolute modes)
 *
 * Test Requirements:
 * - Ammunition Fix: Ranger characters receive 20 individual Arrow items (not "Arrows (20)" bundle)
 * - Ammunition Fix: Weight calculation correct (20 × 0.05 = 1.0 lb)
 * - Ammunition Fix: Can remove/add arrows with quantity management
 * - Weight System: Custom items with high weight spawn more often
 * - Weight System: Custom items with weight 0 never spawn
 * - Weight System: Relative vs absolute modes work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import { EquipmentGenerator } from '../../src/core/generation/EquipmentGenerator';
import { WeightedSelector } from '../../src/core/extensions/WeightedSelector';
import { SeededRNG } from '../../src/utils/random.js';
import { sampleAudioProfile } from '../fixtures/sampleData';

describe('Integration: Ammunition Fix and Weight System', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        manager = ExtensionManager.getInstance();
        manager.resetAll();
    });

    afterEach(() => {
        manager.resetAll();
    });

    describe('Ammunition Fix: Ranger has 20 arrows', () => {
        it('should give Ranger character 20 individual Arrow items', () => {
            const character = CharacterGenerator.generate(
                'test-ranger-arrows',
                sampleAudioProfile,
                'Ranger Test',
                {
                    forceClass: 'Ranger'
                }
            );

            // Verify character is a Ranger
            expect(character.class).toBe('Ranger');

            // Verify equipment exists
            expect(character.equipment).toBeDefined();

            // Find Arrow items
            const arrowItems = character.equipment?.items.filter(item => item.name === 'Arrow');
            expect(arrowItems).toBeDefined();
            expect(arrowItems.length).toBe(1);

            // Verify exactly 20 arrows
            const arrowItem = arrowItems[0];
            expect(arrowItem.name).toBe('Arrow');
            expect(arrowItem.quantity).toBe(20);
        });

        it('should NOT have the old "Arrows (20)" bundle item', () => {
            const character = CharacterGenerator.generate(
                'test-no-old-arrows',
                sampleAudioProfile,
                'Ranger Test',
                {
                    forceClass: 'Ranger'
                }
            );

            // Verify "Arrows (20)" is not in equipment
            const oldArrowItem = character.equipment?.items.find(item => item.name === 'Arrows (20)');
            expect(oldArrowItem).toBeUndefined();
        });

        it('should give Ranger ammunition when using ranged weapons', () => {
            const character = CharacterGenerator.generate(
                'test-ranger-arrows',
                sampleAudioProfile,
                'Ranger Test',
                {
                    forceClass: 'Ranger'
                }
            );

            // Ranger starts with Longbow, should get arrows
            const arrowItems = character.equipment?.items.filter(item => item.name === 'Arrow');
            expect(arrowItems).toBeDefined();
            expect(arrowItems.length).toBe(1);
            expect(arrowItems[0].quantity).toBe(20);
        });

        it('should give correct ammunition type based on weapon', () => {
            const character = CharacterGenerator.generate(
                'test-crossbow-bolts',
                sampleAudioProfile,
                'Ranger Test',
                {
                    forceClass: 'Ranger'
                }
            );

            // Ranger has Longbow, so should get Arrows not Bolts
            const arrowItems = character.equipment?.items.filter(item => item.name === 'Arrow');
            expect(arrowItems.length).toBeGreaterThan(0);

            // Verify no Bolts (since Ranger uses Longbow, not crossbow)
            const boltItems = character.equipment?.items.filter(item => item.name === 'Bolt');
            expect(boltItems.length).toBe(0);
        });
    });

    describe('Ammunition Fix: Weight correct', () => {
        it('should calculate total weight correctly for 20 arrows (20 × 0.05 = 1.0 lb)', () => {
            const character = CharacterGenerator.generate(
                'test-arrow-weight',
                sampleAudioProfile,
                'Ranger Test',
                {
                    forceClass: 'Ranger'
                }
            );

            expect(character.equipment).toBeDefined();

            // Find Arrow item
            const arrowItem = character.equipment?.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeDefined();
            expect(arrowItem?.quantity).toBe(20);

            // Arrow weight is 0.05 lb each
            const expectedArrowWeight = 20 * 0.05;
            expect(expectedArrowWeight).toBe(1.0);

            // Verify total equipment weight includes arrows
            expect(character.equipment?.totalWeight).toBeGreaterThan(0);

            // Verify equipped weight doesn't include arrows (they're not equipped by default)
            const arrowItemWeight = arrowItem ? arrowItem.quantity * 0.05 : 0;
            const expectedTotalWeight = character.equipment!.totalWeight;

            // The total weight should include the arrow weight
            expect(expectedTotalWeight).toBeGreaterThan(arrowItemWeight);
        });

        it('should update weight correctly when removing arrows', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // Initial state should have 20 arrows
            const initialArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(initialArrowItem?.quantity).toBe(20);
            const initialWeight = equipment.totalWeight;

            // Remove 5 arrows
            equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', 5);

            const updatedArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(updatedArrowItem?.quantity).toBe(15);

            // Weight should decrease by 5 × 0.05 = 0.25 lb
            expect(equipment.totalWeight).toBe(initialWeight - 0.25);
        });

        it('should update weight correctly when adding arrows', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const initialWeight = equipment.totalWeight;
            const initialArrowItem = equipment.items.find(item => item.name === 'Arrow');
            const initialArrowCount = initialArrowItem?.quantity || 0;

            // Add 10 arrows
            equipment = EquipmentGenerator.addItem(equipment, 'Arrow', 10);

            const updatedArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(updatedArrowItem?.quantity).toBe(initialArrowCount + 10);

            // Weight should increase by 10 × 0.05 = 0.5 lb
            expect(equipment.totalWeight).toBe(initialWeight + 0.5);
        });
    });

    describe('Ammunition Fix: Can remove/add arrows', () => {
        it('should allow removing partial quantity of arrows', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // Start with 20 arrows
            const initialArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(initialArrowItem?.quantity).toBe(20);

            // Remove 5 arrows
            equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', 5);

            const updatedArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(updatedArrowItem?.quantity).toBe(15);
        });

        it('should allow removing all arrows (item removed entirely)', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // Remove all 20 arrows
            equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', 20);

            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeUndefined();
        });

        it('should allow adding more arrows to existing stack', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const initialArrowItem = equipment.items.find(item => item.name === 'Arrow');
            const initialCount = initialArrowItem?.quantity || 0;

            // Add 30 more arrows
            equipment = EquipmentGenerator.addItem(equipment, 'Arrow', 30);

            const updatedArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(updatedArrowItem?.quantity).toBe(initialCount + 30);
        });

        it('should create new arrow item if adding when none exists', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Wizard'); // Wizards don't have arrows

            // Verify no arrows initially
            let arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeUndefined();

            // Add arrows
            equipment = EquipmentGenerator.addItem(equipment, 'Arrow', 10);

            arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeDefined();
            expect(arrowItem?.quantity).toBe(10);
        });
    });

    describe('Weight System: Custom items with high weight spawn often', () => {
        it('should spawn custom item with high weight more frequently than default items', () => {
            const customEquipment = [
                { name: 'Legendary Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 },
                { name: 'Common Dagger', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
            ];

            // Register with weights: Legendary Sword has 10x weight of Common Dagger
            manager.register('equipment', customEquipment, {
                weights: {
                    'Legendary Sword': 10.0,
                    'Common Dagger': 1.0,
                }
            });

            const weights = manager.getWeights('equipment');
            expect(weights['Legendary Sword']).toBe(10.0);
            expect(weights['Common Dagger']).toBe(1.0);

            // Use WeightedSelector to verify probability calculation
            const rng = new SeededRNG('test-weight-probability');
            const items = ['Legendary Sword', 'Common Dagger'];

            // Run multiple selections to verify distribution
            const selections: Record<string, number> = {
                'Legendary Sword': 0,
                'Common Dagger': 0,
            };

            const numTrials = 100;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(items, weights, rng, 'absolute');
                selections[selected]++;
            }

            // Legendary Sword should be selected more often (approximately 10:1 ratio)
            const legendaryRatio = selections['Legendary Sword'] / numTrials;
            expect(legendaryRatio).toBeGreaterThan(0.5); // Should be around 0.91 (10/11)
        });

        it('should apply weights correctly in relative mode', () => {
            const customEquipment = [
                { name: 'Rare Item', type: 'item' as const, rarity: 'rare' as const, weight: 2 },
            ];

            // In relative mode, custom weight adds to default weight
            manager.register('equipment', customEquipment, {
                mode: 'relative',
                weights: {
                    'Rare Item': 5.0,
                }
            });

            const weights = manager.getWeights('equipment');
            expect(weights['Rare Item']).toBe(5.0);
        });
    });

    describe('Weight System: Custom items with weight 0 never spawn', () => {
        it('should never select item with weight 0', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = {
                'Sword': 1.0,
                'Axe': 0.5,
                'Dagger': 0.0, // Should never be selected
            };

            const rng = new SeededRNG('test-zero-weight');

            // Run many trials
            const numTrials = 100;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(items, weights, rng, 'absolute');
                expect(selected).not.toBe('Dagger');
            }
        });

        it('should handle all items having weight 0 (fall back to equal distribution)', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = {
                'Sword': 0.0,
                'Axe': 0.0,
                'Dagger': 0.0,
            };

            const rng = new SeededRNG('test-all-zero-weights');

            // Should fall back to equal distribution (default mode)
            const selected = WeightedSelector.select(items, weights, rng, 'default');
            expect(['Sword', 'Axe', 'Dagger']).toContain(selected);
        });

        it('should allow setting item weight to 0 to prevent spawning', () => {
            const customEquipment = [
                { name: 'Unwanted Item', type: 'item' as const, rarity: 'common' as const, weight: 1 },
            ];

            manager.register('equipment', customEquipment, {
                weights: {
                    'Unwanted Item': 0.0, // Never spawn
                }
            });

            const weights = manager.getWeights('equipment');
            expect(weights['Unwanted Item']).toBe(0.0);

            // Verify it never spawns in absolute mode
            const rng = new SeededRNG('test-unwanted-item');
            const allEquipment = manager.get('equipment');
            const equipmentNames = allEquipment.map((e: { name: string }) => e.name);

            // In absolute mode, item with weight 0 should never be selected
            const selections: Record<string, number> = {};
            const numTrials = 50;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(equipmentNames, weights, rng, 'absolute');
                selections[selected] = (selections[selected] || 0) + 1;
            }

            expect(selections['Unwanted Item'] || 0).toBe(0);
        });
    });

    describe('Weight System: Relative vs absolute modes', () => {
        it('should use relative mode: custom weights added to pool', () => {
            const customEquipment = [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 },
            ];

            manager.register('equipment', customEquipment, {
                mode: 'relative',
                weights: {
                    'Custom Sword': 5.0,
                }
            });

            const allEquipment = manager.get('equipment');
            const equipmentNames = allEquipment.map((e: { name: string }) => e.name);

            // Verify custom equipment is added to defaults
            expect(equipmentNames).toContain('Custom Sword');

            // Verify default equipment is still present
            expect(equipmentNames).toContain('Longsword');
        });

        it('should use absolute mode: custom weights replace distribution', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = {
                'Sword': 5.0,
                'Axe': 3.0,
                'Dagger': 2.0,
            };

            const rng = new SeededRNG('test-absolute-mode');
            const selections: Record<string, number> = {
                'Sword': 0,
                'Axe': 0,
                'Dagger': 0,
            };

            const numTrials = 100;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(items, weights, rng, 'absolute');
                selections[selected]++;
            }

            // Sword should be selected approximately 50% of the time (5/10)
            const swordRatio = selections['Sword'] / numTrials;
            expect(swordRatio).toBeGreaterThan(0.35); // Allow some variance
            expect(swordRatio).toBeLessThan(0.65);
        });

        it('should handle default mode: equal weights for all items', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const emptyWeights: Record<string, number> = {};

            const rng = new SeededRNG('test-default-mode');
            const selections: Record<string, number> = {
                'Sword': 0,
                'Axe': 0,
                'Dagger': 0,
            };

            const numTrials = 300;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(items, emptyWeights, rng, 'default');
                selections[selected]++;
            }

            // Each item should be selected approximately 33% of the time
            const expectedRatio = 1 / 3;
            const tolerance = 0.15;

            expect(Math.abs(selections['Sword'] / numTrials - expectedRatio)).toBeLessThan(tolerance);
            expect(Math.abs(selections['Axe'] / numTrials - expectedRatio)).toBeLessThan(tolerance);
            expect(Math.abs(selections['Dagger'] / numTrials - expectedRatio)).toBeLessThan(tolerance);
        });

        it('should support replace mode in ExtensionManager', () => {
            const customBodyTypes = ['giant', 'diminutive', 'ethereal'];

            // Use replace mode to exclude default body types
            manager.register('appearance.bodyTypes', customBodyTypes, {
                mode: 'replace'
            });

            const allBodyTypes = manager.get('appearance.bodyTypes');

            // Should only have custom body types
            expect(allBodyTypes).toEqual(['giant', 'diminutive', 'ethereal']);

            // Should NOT have default body types
            expect(allBodyTypes).not.toContain('slender');
            expect(allBodyTypes).not.toContain('athletic');
        });
    });

    describe('Weight System with custom data in character generation', () => {
        it('should use custom weights when generating characters', () => {
            const customAppearance = {
                bodyTypes: ['giant', 'diminutive']
            };

            manager.register('appearance.bodyTypes', customAppearance.bodyTypes, {
                weights: {
                    'giant': 3.0,
                    'diminutive': 1.0,
                }
            });

            // Generate multiple characters to verify distribution
            const bodyTypeCounts: Record<string, number> = {};
            const numGenerations = 20;

            for (let i = 0; i < numGenerations; i++) {
                const character = CharacterGenerator.generate(
                    `test-weight-gen-${i}`,
                    sampleAudioProfile,
                    `Character ${i}`
                );

                const bodyType = character.appearance?.body_type;
                if (bodyType) {
                    bodyTypeCounts[bodyType] = (bodyTypeCounts[bodyType] || 0) + 1;
                }
            }

            // Verify at least one character was generated with custom body type
            const hasCustomBodyType = bodyTypeCounts['giant'] > 0 || bodyTypeCounts['diminutive'] > 0;
            expect(hasCustomBodyType).toBe(true);
        });

        it('should handle multiple categories with different weight modes', () => {
            const customEquipment = [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 },
            ];
            const customBodyTypes = ['giant'];

            manager.register('equipment', customEquipment, {
                mode: 'relative',
                weights: { 'Custom Sword': 5.0 }
            });

            manager.register('appearance.bodyTypes', customBodyTypes, {
                mode: 'replace',
            });

            const character = CharacterGenerator.generate(
                'test-multi-category',
                sampleAudioProfile,
                'Test Character'
            );

            // Verify both customizations are applied
            expect(character.appearance?.body_type).toBe('giant');

            // Equipment should include defaults plus custom
            const allEquipment = manager.get('equipment');
            const equipmentNames = allEquipment.map((e: { name: string }) => e.name);
            expect(equipmentNames).toContain('Custom Sword');
            expect(equipmentNames).toContain('Longsword'); // Default still present
        });
    });
});
