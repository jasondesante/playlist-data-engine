/**
 * Integration test for ValidationManager
 * Tests validation in the context of character generation with custom extensions
 * Covers Phase 6.1: "Test ValidationManager" task from DATA_ENGINE_UPGRADE_PLAN.md
 *
 * Test Requirements:
 * - Valid data passes
 * - Invalid data fails with clear errors
 * - All categories validated
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionManager } from '../../src/core/extensions';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { sampleAudioProfile } from '../fixtures/sampleData';

describe('Integration: ValidationManager', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        manager = ExtensionManager.getInstance();
        manager.resetAll();
    });

    describe('Valid data passes validation', () => {
        it('should accept valid custom equipment and allow character generation', () => {
            const validEquipment = [
                { name: 'Dragon Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 },
                { name: 'Mithral Armor', type: 'armor' as const, rarity: 'rare' as const, weight: 10 },
            ];

            // Validate equipment
            const result = manager.validate('equipment', validEquipment);

            // Should pass validation
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();

            // Should be able to register and use in character generation
            expect(() => {
                manager.register('equipment', validEquipment);
            }).not.toThrow();

            // Verify equipment is available
            const allEquipment = manager.get('equipment');
            expect(allEquipment.some((e: { name: string }) => e.name === 'Dragon Sword')).toBe(true);
        });

        it('should accept valid custom spells', () => {
            const validSpells = [
                { name: 'Phoenix Fire', level: 5, school: 'Evocation' },
                { name: 'Mind Shield', level: 2, school: 'Abjuration' },
            ];

            const result = manager.validate('spells', validSpells);

            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();

            // Should be able to register
            expect(() => {
                manager.register('spells', validSpells);
            }).not.toThrow();
        });

        it('should accept valid custom races', () => {
            const validRaces = ['Human', 'Elf', 'Dwarf'];

            const result = manager.validate('races', validRaces);

            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should accept valid custom classes', () => {
            const validClasses = ['Fighter', 'Wizard', 'Rogue'];

            const result = manager.validate('classes', validClasses);

            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should accept valid appearance options', () => {
            const validBodyTypes = ['slender', 'athletic', 'muscular', 'stocky'];

            const result = manager.validate('appearance.bodyTypes', validBodyTypes);

            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });
    });

    describe('Invalid data fails with clear errors', () => {
        it('should reject equipment missing required fields and provide clear error', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 3 }, // missing name
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.length).toBeGreaterThan(0);
            expect(result.errors?.some(e => e.includes('name'))).toBe(true);
            expect(result.errors?.some(e => e.includes('Item 0'))).toBe(true);
        });

        it('should reject equipment with invalid type', () => {
            const invalidEquipment = [
                { name: 'Test Item', type: 'invalid_type' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('type'))).toBe(true);
        });

        it('should reject equipment with negative weight', () => {
            const invalidEquipment = [
                { name: 'Test Item', type: 'item' as const, rarity: 'common' as const, weight: -5 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('weight'))).toBe(true);
        });

        it('should reject spells with invalid level', () => {
            const invalidSpells = [
                { name: 'Test Spell', level: 15, school: 'Evocation' }, // level must be 0-9
            ];

            const result = manager.validate('spells', invalidSpells);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('level'))).toBe(true);
        });

        it('should reject spells with invalid school', () => {
            const invalidSpells = [
                { name: 'Test Spell', level: 1, school: 'Invalid School' },
            ];

            const result = manager.validate('spells', invalidSpells);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('school'))).toBe(true);
        });

        it('should reject invalid race names', () => {
            const invalidRaces = ['InvalidRace', 'FakeRace'];

            const result = manager.validate('races', invalidRaces);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('race'))).toBe(true);
        });

        it('should reject invalid class names', () => {
            const invalidClasses = ['InvalidClass', 'FakeClass'];

            const result = manager.validate('classes', invalidClasses);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('class'))).toBe(true);
        });

        it('should reject non-string appearance options', () => {
            const invalidAppearance = ['slender', 123, { invalid: 'object' }];

            const result = manager.validate('appearance.bodyTypes', invalidAppearance);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('string'))).toBe(true);
        });

        it('should reject non-array input', () => {
            const result = manager.validate('equipment', 'not an array' as unknown as []);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('array'))).toBe(true);
        });

        it('should reject null or undefined items in array', () => {
            const invalidEquipment = [
                { name: 'Valid', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
                null,
                undefined,
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.includes('null'))).toBe(true);
        });
    });

    describe('All categories validated', () => {
        it('should validate equipment category', () => {
            const valid = [{ name: 'Test', type: 'item' as const, rarity: 'common' as const, weight: 1 }];
            const result = manager.validate('equipment', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate spells category', () => {
            const valid = [{ name: 'Test Spell', level: 1, school: 'Evocation' }];
            const result = manager.validate('spells', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate races category', () => {
            const valid = ['Human', 'Elf'];
            const result = manager.validate('races', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate classes category', () => {
            const valid = ['Fighter', 'Wizard'];
            const result = manager.validate('classes', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate appearance.bodyTypes subcategory', () => {
            const valid = ['slender', 'athletic'];
            const result = manager.validate('appearance.bodyTypes', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate appearance.skinTones subcategory', () => {
            const valid = ['#FFCCAA', '#8D5524'];
            const result = manager.validate('appearance.skinTones', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate appearance.hairColors subcategory', () => {
            const valid = ['#1a1a1a', '#4a3728'];
            const result = manager.validate('appearance.hairColors', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate appearance.hairStyles subcategory', () => {
            const valid = ['Long', 'Short', 'Bald'];
            const result = manager.validate('appearance.hairStyles', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate appearance.eyeColors subcategory', () => {
            const valid = ['#2C1810', '#1A1A1A'];
            const result = manager.validate('appearance.eyeColors', valid);
            expect(result.valid).toBe(true);
        });

        it('should validate appearance.facialFeatures subcategory', () => {
            const valid = ['Beard', 'Scar', 'Tattoo'];
            const result = manager.validate('appearance.facialFeatures', valid);
            expect(result.valid).toBe(true);
        });
    });

    describe('Validation during character generation', () => {
        it('should register valid custom equipment and generate characters successfully', () => {
            const customEquipment = [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 4 },
            ];

            // Validate first
            const validationResult = manager.validate('equipment', customEquipment);
            expect(validationResult.valid).toBe(true);

            // Register the custom equipment
            manager.register('equipment', customEquipment);

            // Generate a character - should not throw
            expect(() => {
                const character = CharacterGenerator.generate(
                    'test-seed-validation-1',
                    sampleAudioProfile,
                    'Test Character'
                );

                // Verify character was generated successfully
                expect(character).toBeDefined();
                expect(character.name).toBe('Test Character');
                expect(character.level).toBe(1);
            }).not.toThrow();
        });

        it('should fail to register invalid equipment', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 3 }, // missing name
            ];

            // Validate - should fail
            const validationResult = manager.validate('equipment', invalidEquipment);
            expect(validationResult.valid).toBe(false);
            expect(validationResult.errors).toBeDefined();

            // Attempting to register with validation enabled should throw
            expect(() => {
                manager.register('equipment', invalidEquipment, { validate: true });
            }).toThrow();
        });

        it('should allow registration when validation is disabled', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 3 }, // missing name
            ];

            // Should validate as invalid
            const validationResult = manager.validate('equipment', invalidEquipment);
            expect(validationResult.valid).toBe(false);

            // But should allow registration when validation is explicitly disabled
            expect(() => {
                manager.register('equipment', invalidEquipment, { validate: false });
            }).not.toThrow();
        });

        it('should provide clear error messages for multiple validation errors', () => {
            const invalidEquipment = [
                { name: 'Valid Item', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
                { type: 'weapon' as const, rarity: 'common' as const, weight: 2 }, // missing name
                { name: 'Another Valid', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
                { name: 'Invalid Type', type: 'invalid' as const, rarity: 'common' as const, weight: 1 }, // invalid type
                { name: 'Negative Weight', type: 'item' as const, rarity: 'common' as const, weight: -1 }, // negative weight
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors!.length).toBeGreaterThanOrEqual(3);

            // Check that error messages include item indices
            expect(result.errors?.some(e => e.includes('Item 1'))).toBe(true);
            expect(result.errors?.some(e => e.includes('Item 3'))).toBe(true);
            expect(result.errors?.some(e => e.includes('Item 4'))).toBe(true);
        });
    });

    describe('Validation error message clarity', () => {
        it('should include field name in error message', () => {
            const invalidEquipment = [
                { type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.errors?.some(e => e.toLowerCase().includes('name'))).toBe(true);
        });

        it('should include item index for array items', () => {
            const invalidEquipment = [
                { name: 'Valid', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
                { type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.errors?.some(e => e.includes('Item 1'))).toBe(true);
        });

        it('should include expected values in error message', () => {
            const invalidEquipment = [
                { name: 'Test', type: 'invalid_type' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', invalidEquipment);

            expect(result.errors?.some(e => e.includes('weapon') || e.includes('armor') || e.includes('item'))).toBe(true);
        });

        it('should provide actionable error messages', () => {
            const invalidSpells = [
                { name: 'Test Spell', level: 15, school: 'Evocation' },
            ];

            const result = manager.validate('spells', invalidSpells);

            const error = result.errors?.find(e => e.includes('level'));
            expect(error).toBeDefined();
            // Error should mention the valid range (0-9)
            expect(error).toMatch(/0.*9|level/);
        });
    });

    describe('Edge cases', () => {
        it('should validate empty arrays as valid', () => {
            const result = manager.validate('equipment', []);
            expect(result.valid).toBe(true);
        });

        it('should handle very long item names', () => {
            const longName = 'a'.repeat(1000);
            const validEquipment = [
                { name: longName, type: 'item' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', validEquipment);
            expect(result.valid).toBe(true);
        });

        it('should handle special characters in item names', () => {
            const validEquipment = [
                { name: "O'Brian Sword", type: 'weapon' as const, rarity: 'rare' as const, weight: 3 },
                { name: 'Fire & Ice', type: 'weapon' as const, rarity: 'legendary' as const, weight: 4 },
                { name: 'Dagger-dagger', type: 'weapon' as const, rarity: 'common' as const, weight: 1 },
            ];

            const result = manager.validate('equipment', validEquipment);
            expect(result.valid).toBe(true);
        });

        it('should handle unicode characters in appearance options', () => {
            const unicodeOptions = ['月光', 'élégant', 'ναΐτης'];

            const result = manager.validate('appearance.hairStyles', unicodeOptions);
            expect(result.valid).toBe(true);
        });
    });
});
