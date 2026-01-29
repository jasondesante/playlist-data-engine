/**
 * Integration test for edge cases in custom data generation
 * Tests Phase 6.3 tasks from DATA_ENGINE_UPGRADE_PLAN.md:
 * - Test with empty custom data (should use defaults)
 * - Test with replacing all defaults (mode: 'replace')
 * - Test with conflicting weights (resolve correctly)
 * - Test validation errors (clear, helpful messages)
 * - Test ammunition edge cases (remove last item, add to non-existent item, equip item with quantity 0)
 *
 * Test Requirements:
 * - Empty custom data falls back to defaults gracefully
 * - Replace mode completely replaces defaults
 * - Conflicting weights are resolved correctly
 * - Validation errors provide clear, actionable messages
 * - Ammunition edge cases are handled correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import { EquipmentGenerator } from '../../src/core/generation/EquipmentGenerator';
import { WeightedSelector } from '../../src/core/extensions/WeightedSelector';
import { SeededRNG } from '../../src/utils/random.js';
import { sampleAudioProfile } from '../fixtures/sampleData';

describe('Integration: Edge Cases', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        manager = ExtensionManager.getInstance();
        manager.resetAll();
    });

    afterEach(() => {
        manager.resetAll();
    });

    describe('Empty custom data (should use defaults)', () => {
        it('should use default spells when empty array provided', () => {
            const character = CharacterGenerator.generate(
                'test-empty-spells',
                sampleAudioProfile,
                'Test Wizard',
                {
                    forceClass: 'Wizard',
                    extensions: {
                        spells: []
                    }
                }
            );

            // Should still have default spells
            expect(character.spells).toBeDefined();
            expect(character.spells?.known_spells.length).toBeGreaterThan(0);

            // Verify default spells are present
            const allSpells = manager.get('spells');
            const spellNames = allSpells.map((s: { name: string }) => s.name);
            expect(spellNames).toContain('Fireball');
        });

        it('should use default equipment when empty array provided', () => {
            const character = CharacterGenerator.generate(
                'test-empty-equipment',
                sampleAudioProfile,
                'Test Fighter',
                {
                    forceClass: 'Fighter',
                    extensions: {
                        equipment: []
                    }
                }
            );

            // Should still have default equipment
            expect(character.equipment).toBeDefined();
            expect(character.equipment?.weapons.length).toBeGreaterThan(0);

            // Verify default equipment
            const allEquipment = manager.get('equipment');
            const equipmentNames = allEquipment.map((e: { name: string }) => e.name);
            expect(equipmentNames).toContain('Longsword');
        });

        it('should use default appearance when empty object provided', () => {
            const character = CharacterGenerator.generate(
                'test-empty-appearance',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {}
                    }
                }
            );

            // Should still have appearance data
            expect(character.appearance).toBeDefined();
            expect(character.appearance?.body_type).toBeDefined();

            // Verify default appearance options still available
            const allBodyTypes = manager.get('appearance.bodyTypes');
            expect(allBodyTypes).toContain('slender');
            expect(allBodyTypes).toContain('athletic');
        });

        it('should use default races when empty array provided', () => {
            const character = CharacterGenerator.generate(
                'test-empty-races',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        races: []
                    }
                }
            );

            // Should still have a valid race
            expect(character.race).toBeDefined();
            const defaultRaces = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];
            expect(defaultRaces).toContain(character.race);
        });

        it('should use default classes when empty array provided', () => {
            const character = CharacterGenerator.generate(
                'test-empty-classes',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        classes: []
                    }
                }
            );

            // Should still have a valid class
            expect(character.class).toBeDefined();
            const defaultClasses = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
            expect(defaultClasses).toContain(character.class);
        });
    });

    describe('Replacing all defaults (mode: replace)', () => {
        it('should replace all default body types with custom ones', () => {
            const customBodyTypes = ['giant', 'diminutive', 'ethereal', 'elemental'];

            CharacterGenerator.generate(
                'test-replace-body-types',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {
                            bodyTypes: customBodyTypes
                        }
                    }
                }
            );

            // Need to manually register with replace mode to test properly
            manager.register('appearance.bodyTypes', customBodyTypes, { mode: 'replace' });

            const allBodyTypes = manager.get('appearance.bodyTypes');

            // Should only have custom body types
            expect(allBodyTypes).toEqual(customBodyTypes);

            // Should NOT have default body types
            expect(allBodyTypes).not.toContain('slender');
            expect(allBodyTypes).not.toContain('athletic');
            expect(allBodyTypes).not.toContain('muscular');
            expect(allBodyTypes).not.toContain('stocky');
        });

        it('should replace all default skin tones with custom ones', () => {
            const customSkinTones = ['#FF0000', '#00FF00', '#0000FF']; // RGB colors

            manager.register('appearance.skinTones', customSkinTones, { mode: 'replace' });

            const allSkinTones = manager.get('appearance.skinTones');

            // Should only have custom skin tones
            expect(allSkinTones).toEqual(customSkinTones);

            // Should NOT have default skin tones
            expect(allSkinTones).not.toContain('#FFCCAA'); // Default tone
        });

        it('should replace all default equipment with custom ones', () => {
            const customEquipment = [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 10 },
                { name: 'Custom Shield', type: 'armor' as const, rarity: 'rare' as const, weight: 15 },
            ];

            manager.register('equipment', customEquipment, { mode: 'replace' });

            const allEquipment = manager.get('equipment');

            // Should only have custom equipment
            expect(allEquipment.length).toBe(2);
            expect(allEquipment.some((e: { name: string }) => e.name === 'Custom Sword')).toBe(true);
            expect(allEquipment.some((e: { name: string }) => e.name === 'Custom Shield')).toBe(true);

            // Should NOT have default equipment
            expect(allEquipment.some((e: { name: string }) => e.name === 'Longsword')).toBe(false);
        });

        it('should handle replacing with single item', () => {
            const customBodyTypes = ['giant'];

            manager.register('appearance.bodyTypes', customBodyTypes, { mode: 'replace' });

            const allBodyTypes = manager.get('appearance.bodyTypes');

            expect(allBodyTypes).toEqual(['giant']);
        });

        it('should handle replacing all races', () => {
            const customRaces = ['Human', 'Elf']; // Only allow Humans and Elves

            manager.register('races', customRaces, { mode: 'replace' });

            const allRaces = manager.get('races');

            expect(allRaces).toEqual(customRaces);
            expect(allRaces).not.toContain('Dwarf');
            expect(allRaces).not.toContain('Halfling');
        });
    });

    describe('Conflicting weights (resolve correctly)', () => {
        it('should handle registering same item with different weights', () => {
            const customEquipment = [
                { name: 'Sword', type: 'weapon' as const, rarity: 'common' as const, weight: 3 },
            ];

            // Register first time
            manager.register('equipment', customEquipment, {
                weights: { 'Sword': 5.0 }
            });

            let weights = manager.getWeights('equipment');
            expect(weights['Sword']).toBe(5.0);

            // Register again with different weight
            manager.register('equipment', customEquipment, {
                weights: { 'Sword': 10.0 }
            });

            weights = manager.getWeights('equipment');
            expect(weights['Sword']).toBe(10.0); // Should use new weight
        });

        it('should merge weights when registering multiple times', () => {
            const customEquipment1 = [
                { name: 'Sword', type: 'weapon' as const, rarity: 'common' as const, weight: 3 },
            ];
            const customEquipment2 = [
                { name: 'Axe', type: 'weapon' as const, rarity: 'common' as const, weight: 4 },
            ];

            manager.register('equipment', customEquipment1, {
                weights: { 'Sword': 5.0 }
            });

            manager.register('equipment', customEquipment2, {
                weights: { 'Axe': 3.0 }
            });

            const weights = manager.getWeights('equipment');

            // Both weights should be present
            expect(weights['Sword']).toBe(5.0);
            expect(weights['Axe']).toBe(3.0);
        });

        it('should handle zero weights correctly', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = {
                'Sword': 1.0,
                'Axe': 0.0,
                'Dagger': 1.0,
            };

            const rng = new SeededRNG('test-zero-weights');

            // Run many trials - Axe should never be selected
            const numTrials = 100;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(items, weights, rng, 'absolute');
                expect(selected).not.toBe('Axe');
            }
        });

        it('should handle negative weights by treating as zero', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = {
                'Sword': 1.0,
                'Axe': -5.0, // Negative weight
                'Dagger': 1.0,
            };

            const rng = new SeededRNG('test-negative-weights');

            // Run many trials - Axe should never be selected (negative treated as zero)
            const numTrials = 100;
            for (let i = 0; i < numTrials; i++) {
                const selected = WeightedSelector.select(items, weights, rng, 'absolute');
                expect(selected).not.toBe('Axe');
            }
        });

        it('should handle all weights zero (fall back to equal distribution)', () => {
            const items = ['Sword', 'Axe', 'Dagger'];
            const weights = {
                'Sword': 0.0,
                'Axe': 0.0,
                'Dagger': 0.0,
            };

            const rng = new SeededRNG('test-all-zero');

            // Should fall back to equal distribution
            const selected = WeightedSelector.select(items, weights, rng, 'default');
            expect(['Sword', 'Axe', 'Dagger']).toContain(selected);
        });
    });

    describe('Validation errors (clear, helpful messages)', () => {
        it('should provide clear error for missing required field', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 3 }, // missing name
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);

            // Error should mention the missing field
            const hasNameError = result.errors?.some(e =>
                e.toLowerCase().includes('name') && e.toLowerCase().includes('required')
            );
            expect(hasNameError).toBe(true);
        });

        it('should provide item index in error message', () => {
            const invalidEquipment = [
                { name: 'Valid Sword', type: 'weapon' as const, rarity: 'common' as const, weight: 3 },
                { type: 'weapon' as const, rarity: 'common' as const, weight: 2 }, // missing name (item 1)
                { name: 'Valid Axe', type: 'weapon' as const, rarity: 'common' as const, weight: 4 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);

            // Error should include item index
            const hasIndexError = result.errors?.some(e => e.includes('Item 1'));
            expect(hasIndexError).toBe(true);
        });

        it('should provide valid range for invalid numeric values', () => {
            const invalidSpells = [
                { name: 'Test Spell', level: 15, school: 'Evocation' }, // level must be 0-9
            ];

            const result = manager.validate('spells', invalidSpells);

            expect(result.valid).toBe(false);

            // Error should mention valid range
            const hasRangeError = result.errors?.some(e =>
                e.includes('level') && (e.includes('0') || e.includes('9'))
            );
            expect(hasRangeError).toBe(true);
        });

        it('should provide valid options for invalid enum values', () => {
            const invalidEquipment = [
                { name: 'Test', type: 'invalid_type' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);

            // Error should mention valid types
            const hasTypeError = result.errors?.some(e =>
                e.includes('type') && (e.includes('weapon') || e.includes('armor') || e.includes('item'))
            );
            expect(hasTypeError).toBe(true);
        });

        it('should handle multiple validation errors in single item', () => {
            const invalidEquipment = [
                { type: 'invalid' as const, rarity: 'invalid_rarity' as const, weight: -1 }, // multiple errors
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors!.length).toBeGreaterThan(1);

            // Should have errors for type, rarity, and weight
            const hasTypeError = result.errors?.some(e => e.includes('type'));
            const hasRarityError = result.errors?.some(e => e.includes('rarity'));
            const hasWeightError = result.errors?.some(e => e.includes('weight'));

            expect(hasTypeError).toBe(true);
            expect(hasRarityError).toBe(true);
            expect(hasWeightError).toBe(true);
        });

        it('should provide clear error message when validation fails during registration', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 3 }, // missing name
            ];

            expect(() => {
                manager.register('equipment', invalidEquipment, { validate: true });
            }).toThrow();
        });

        it('should allow registration with validation disabled', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 3 }, // missing name
            ];

            // Should not throw when validation is disabled
            expect(() => {
                manager.register('equipment', invalidEquipment, { validate: false });
            }).not.toThrow();
        });
    });

    describe('Ammunition edge cases', () => {
        it('should handle removing last item (quantity goes to 0)', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // Start with 20 arrows
            const initialArrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(initialArrowItem?.quantity).toBe(20);

            // Remove all 20 arrows
            equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', 20);

            // Item should be removed entirely
            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeUndefined();
        });

        it('should handle removing more than available quantity', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const initialArrowItem = equipment.items.find(item => item.name === 'Arrow');
            const initialQuantity = initialArrowItem?.quantity || 0;

            // Try to remove more than available (should remove all and not throw)
            expect(() => {
                equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', 100);
            }).not.toThrow();

            // All arrows should be removed
            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeUndefined();
        });

        it('should handle removing from non-existent item', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Wizard'); // No arrows

            // Should handle gracefully (no-op, not error)
            expect(() => {
                equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', 5);
            }).not.toThrow();

            // Still no arrows
            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeUndefined();
        });

        it('should handle adding to non-existent item (creates new item)', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Wizard'); // No arrows initially

            // Add arrows to wizard (should create new item)
            equipment = EquipmentGenerator.addItem(equipment, 'Arrow', 10);

            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem).toBeDefined();
            expect(arrowItem?.quantity).toBe(10);
        });

        it('should handle adding zero quantity', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const initialWeight = equipment.totalWeight;

            // Add zero arrows (should be no-op)
            equipment = EquipmentGenerator.addItem(equipment, 'Arrow', 0);

            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem?.quantity).toBe(20); // Should still be 20
            expect(equipment.totalWeight).toBe(initialWeight); // Weight unchanged
        });

        it('should handle negative quantity (should be no-op)', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const initialQuantity = equipment.items.find(item => item.name === 'Arrow')?.quantity || 0;
            const initialWeight = equipment.totalWeight;

            // Try to add negative quantity (should be no-op)
            expect(() => {
                equipment = EquipmentGenerator.addItem(equipment, 'Arrow', -5);
            }).not.toThrow();

            // Quantity should remain unchanged
            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem?.quantity).toBe(initialQuantity);
            expect(equipment.totalWeight).toBe(initialWeight);
        });

        it('should handle equipping item with quantity 0 (if somehow exists)', () => {
            // This is an edge case - in normal flow, quantity 0 items are removed
            // But let's test the behavior if such an item exists

            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // Manually create an item with 0 quantity (edge case)
            equipment = EquipmentGenerator.addItem(equipment, 'Test Arrow', 0);

            const testArrowItem = equipment.items.find(item => item.name === 'Test Arrow');
            expect(testArrowItem?.quantity).toBe(0);

            // Try to equip it (should work, even with 0 quantity)
            equipment = EquipmentGenerator.equipItem(equipment, 'Test Arrow');

            const equippedItem = equipment.items.find(item => item.name === 'Test Arrow' && item.equipped);
            expect(equippedItem).toBeDefined();
        });

        it('should handle un-equipping item with quantity 0', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            // Create and equip item with 0 quantity
            equipment = EquipmentGenerator.addItem(equipment, 'Test Arrow', 0);
            equipment = EquipmentGenerator.equipItem(equipment, 'Test Arrow');

            // Now unequip it
            equipment = EquipmentGenerator.unequipItem(equipment, 'Test Arrow');

            const equippedItem = equipment.items.find(item => item.name === 'Test Arrow' && item.equipped);
            expect(equippedItem).toBeUndefined();
        });

        it('should handle removing negative quantity (should be no-op)', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const initialQuantity = equipment.items.find(item => item.name === 'Arrow')?.quantity || 0;
            const initialWeight = equipment.totalWeight;

            // Try to remove negative quantity (should be no-op)
            expect(() => {
                equipment = EquipmentGenerator.removeItem(equipment, 'Arrow', -5);
            }).not.toThrow();

            // Quantity should remain unchanged
            const arrowItem = equipment.items.find(item => item.name === 'Arrow');
            expect(arrowItem?.quantity).toBe(initialQuantity);
            expect(equipment.totalWeight).toBe(initialWeight);
        });
    });

    describe('Complex edge cases', () => {
        it('should handle registering custom data after generating characters', () => {
            // Generate character with defaults
            const character1 = CharacterGenerator.generate(
                'test-before-custom',
                sampleAudioProfile,
                'Character 1'
            );

            // Now register custom data
            const customEquipment = [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 },
            ];

            manager.register('equipment', customEquipment);

            // Generate another character
            const character2 = CharacterGenerator.generate(
                'test-after-custom',
                sampleAudioProfile,
                'Character 2'
            );

            // Custom equipment should be available
            const allEquipment = manager.get('equipment');
            expect(allEquipment.some((e: { name: string }) => e.name === 'Custom Sword')).toBe(true);
        });

        it('should handle resetting categories', () => {
            // Register custom data
            const customBodyTypes = ['giant', 'diminutive'];
            manager.register('appearance.bodyTypes', customBodyTypes, { mode: 'replace' });

            let allBodyTypes = manager.get('appearance.bodyTypes');
            expect(allBodyTypes).toEqual(['giant', 'diminutive']);

            // Reset category
            manager.reset('appearance.bodyTypes');

            // Should have defaults back
            allBodyTypes = manager.get('appearance.bodyTypes');
            expect(allBodyTypes).toContain('slender');
            expect(allBodyTypes).toContain('athletic');
            expect(allBodyTypes).not.toContain('giant');
        });

        it('should handle resetAll()', () => {
            // Register multiple custom categories
            manager.register('appearance.bodyTypes', ['giant'], { mode: 'replace' });
            manager.register('equipment', [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 3 }
            ]);

            // Verify custom data is registered
            expect(manager.get('appearance.bodyTypes')).toEqual(['giant']);

            // Reset all
            manager.resetAll();

            // Verify all custom data is cleared
            expect(manager.get('appearance.bodyTypes')).toContain('slender');
            expect(manager.get('appearance.bodyTypes')).not.toContain('giant');
        });

        it('should handle very large custom data arrays', () => {
            // Create 100 custom body types
            const customBodyTypes = Array.from({ length: 100 }, (_, i) => `custom_body_${i}`);

            expect(() => {
                manager.register('appearance.bodyTypes', customBodyTypes, { mode: 'replace' });
            }).not.toThrow();

            const allBodyTypes = manager.get('appearance.bodyTypes');
            expect(allBodyTypes.length).toBe(100);
        });

        it('should handle special characters in item names', () => {
            const customEquipment = [
                { name: "O'Brian Sword", type: 'weapon' as const, rarity: 'rare' as const, weight: 3 },
                { name: 'Fire & Ice Staff', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 },
                { name: 'Dagger-dagger++', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
            ];

            expect(() => {
                manager.register('equipment', customEquipment);
            }).not.toThrow();

            const allEquipment = manager.get('equipment');
            expect(allEquipment.some((e: { name: string }) => e.name === "O'Brian Sword")).toBe(true);
            expect(allEquipment.some((e: { name: string }) => e.name === 'Fire & Ice Staff')).toBe(true);
            expect(allEquipment.some((e: { name: string }) => e.name === 'Dagger-dagger++')).toBe(true);
        });

        it('should handle unicode characters in custom data', () => {
            const customBodyTypes = ['巨人', 'エルフ', 'Nain', 'योद्धा'];

            expect(() => {
                manager.register('appearance.bodyTypes', customBodyTypes, { mode: 'replace' });
            }).not.toThrow();

            const allBodyTypes = manager.get('appearance.bodyTypes');
            expect(allBodyTypes).toEqual(['巨人', 'エルフ', 'Nain', 'योद्धा']);
        });
    });
});
