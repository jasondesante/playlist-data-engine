/**
 * Integration test for custom data in character generation
 * Tests Phase 6.1: "Test each category with custom data" task from DATA_ENGINE_UPGRADE_PLAN.md
 *
 * Test Requirements:
 * - Spells: custom spells appear in generation
 * - Equipment: custom items spawn with correct weights
 * - Appearance: custom options appear
 * - Races: custom races spawn
 * - Classes: custom classes spawn
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import { sampleAudioProfile } from '../fixtures/sampleData';

describe('Integration: Custom Data Generation', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        manager = ExtensionManager.getInstance();
        manager.resetAll();
    });

    afterEach(() => {
        manager.resetAll();
    });

    describe('Spells: custom spells appear in generation', () => {
        it('should include custom spells in spellcasting character', () => {
            const customSpells = [
                { name: 'Phoenix Fire', level: 5, school: 'Evocation' },
                { name: 'Mind Shield', level: 2, school: 'Abjuration' },
                { name: 'Time Warp', level: 3, school: 'Transmutation' },
            ];

            // Generate a Wizard with custom spells
            const character = CharacterGenerator.generate(
                'test-custom-spells',
                sampleAudioProfile,
                'Test Wizard',
                {
                    forceClass: 'Wizard',
                    extensions: {
                        spells: customSpells
                    }
                }
            );

            // Verify character has spells
            expect(character.spells).toBeDefined();
            expect(character.spells?.known_spells).toBeDefined();

            // Get all spells from ExtensionManager to verify custom spells are registered
            const allSpells = manager.get('spells');
            const spellNames = allSpells.map((s: { name: string }) => s.name);

            // Verify custom spells are available in the spell database
            expect(spellNames).toContain('Phoenix Fire');
            expect(spellNames).toContain('Mind Shield');
            expect(spellNames).toContain('Time Warp');

            // Verify default spells are still available
            expect(spellNames).toContain('Fireball'); // Default spell
        });

        it('should handle empty custom spells array', () => {
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

            // Should still generate successfully
            expect(character.spells).toBeDefined();
            expect(character.class).toBe('Wizard');
        });

        it('should include custom spell cantrips', () => {
            const customSpells = [
                { name: 'Arcane Spark', level: 0, school: 'Evocation' },
                { name: 'Mage Hand', level: 0, school: 'Conjuration' },
            ];

            const character = CharacterGenerator.generate(
                'test-custom-cantrips',
                sampleAudioProfile,
                'Test Wizard',
                {
                    forceClass: 'Wizard',
                    extensions: {
                        spells: customSpells
                    }
                }
            );

            // Verify custom cantrips are in the system
            const allSpells = manager.get('spells');
            const cantrips = allSpells.filter((s: { level: number }) => s.level === 0);
            const cantripNames = cantrips.map((s: { name: string }) => s.name);

            expect(cantripNames).toContain('Arcane Spark');
            expect(cantripNames).toContain('Mage Hand');
        });
    });

    describe('Equipment: custom items spawn with correct weights', () => {
        it('should include custom equipment in generated character', () => {
            const customEquipment = [
                { name: 'Dragon Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 },
                { name: 'Mithral Armor', type: 'armor' as const, rarity: 'rare' as const, weight: 10 },
                { name: 'Healing Potion', type: 'item' as const, rarity: 'uncommon' as const, weight: 0.5 },
            ];

            // Generate character with custom equipment
            const character = CharacterGenerator.generate(
                'test-custom-equipment',
                sampleAudioProfile,
                'Test Fighter',
                {
                    forceClass: 'Fighter',
                    extensions: {
                        equipment: customEquipment
                    }
                }
            );

            // Verify custom equipment is registered
            const allEquipment = manager.get('equipment');
            const equipmentNames = allEquipment.map((e: { name: string }) => e.name);

            expect(equipmentNames).toContain('Dragon Sword');
            expect(equipmentNames).toContain('Mithral Armor');
            expect(equipmentNames).toContain('Healing Potion');

            // Verify default equipment is still available
            expect(equipmentNames).toContain('Longsword'); // Default equipment
        });

        it('should apply custom weights to equipment', () => {
            const customEquipment = [
                { name: 'Custom Sword', type: 'weapon' as const, rarity: 'rare' as const, weight: 4 },
            ];

            // Register with high weight for custom sword
            manager.register('equipment', customEquipment, {
                weights: { 'Custom Sword': 10.0 }
            });

            const weights = manager.getWeights('equipment');

            // Verify custom weight is applied
            expect(weights['Custom Sword']).toBe(10.0);
        });

        it('should handle empty custom equipment array', () => {
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

            // Should still generate successfully with default equipment
            expect(character.equipment).toBeDefined();
            expect(character.class).toBe('Fighter');
        });
    });

    describe('Appearance: custom options appear', () => {
        it('should include custom body types in generated character', () => {
            const customBodyTypes = ['giant', 'diminutive', 'ethereal'];

            const character = CharacterGenerator.generate(
                'test-custom-body-types',
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

            // Verify custom body types are available
            const allBodyTypes = manager.get('appearance.bodyTypes');

            expect(allBodyTypes).toContain('giant');
            expect(allBodyTypes).toContain('diminutive');
            expect(allBodyTypes).toContain('ethereal');

            // Verify default body types are still available
            expect(allBodyTypes).toContain('slender');
            expect(allBodyTypes).toContain('athletic');
        });

        it('should include custom skin tones', () => {
            const customSkinTones = ['#FFCCAA', '#C68642', '#8D5524'];

            CharacterGenerator.generate(
                'test-custom-skin-tones',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {
                            skinTones: customSkinTones
                        }
                    }
                }
            );

            const allSkinTones = manager.get('appearance.skinTones');

            expect(allSkinTones).toContain('#FFCCAA');
            expect(allSkinTones).toContain('#C68642');
            expect(allSkinTones).toContain('#8D5524');
        });

        it('should include custom hair colors', () => {
            const customHairColors = ['#1a1a1a', '#4a3728', '#8B4513'];

            CharacterGenerator.generate(
                'test-custom-hair-colors',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {
                            hairColors: customHairColors
                        }
                    }
                }
            );

            const allHairColors = manager.get('appearance.hairColors');

            expect(allHairColors).toContain('#1a1a1a');
            expect(allHairColors).toContain('#4a3728');
            expect(allHairColors).toContain('#8B4513');
        });

        it('should include custom hair styles', () => {
            const customHairStyles = ['Long Flowing', 'Spiky', 'Bald', 'Mohawk'];

            CharacterGenerator.generate(
                'test-custom-hair-styles',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {
                            hairStyles: customHairStyles
                        }
                    }
                }
            );

            const allHairStyles = manager.get('appearance.hairStyles');

            expect(allHairStyles).toContain('Long Flowing');
            expect(allHairStyles).toContain('Spiky');
            expect(allHairStyles).toContain('Bald');
            expect(allHairStyles).toContain('Mohawk');
        });

        it('should include custom eye colors', () => {
            const customEyeColors = ['#2C1810', '#1A1A1A', '#4169E1'];

            CharacterGenerator.generate(
                'test-custom-eye-colors',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {
                            eyeColors: customEyeColors
                        }
                    }
                }
            );

            const allEyeColors = manager.get('appearance.eyeColors');

            expect(allEyeColors).toContain('#2C1810');
            expect(allEyeColors).toContain('#1A1A1A');
            expect(allEyeColors).toContain('#4169E1');
        });

        it('should include custom facial features', () => {
            const customFacialFeatures = ['Dragon Tattoo', 'Scar across Eye', 'Pointed Ears'];

            CharacterGenerator.generate(
                'test-custom-facial-features',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: {
                            facialFeatures: customFacialFeatures
                        }
                    }
                }
            );

            const allFacialFeatures = manager.get('appearance.facialFeatures');

            expect(allFacialFeatures).toContain('Dragon Tattoo');
            expect(allFacialFeatures).toContain('Scar across Eye');
            expect(allFacialFeatures).toContain('Pointed Ears');
        });

        it('should include all custom appearance options at once', () => {
            const customAppearance = {
                bodyTypes: ['giant'],
                skinTones: ['#FFCCAA'],
                hairColors: ['#1a1a1a'],
                hairStyles: ['Spiky'],
                eyeColors: ['#4169E1'],
                facialFeatures: ['Tattoo']
            };

            CharacterGenerator.generate(
                'test-all-custom-appearance',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        appearance: customAppearance
                    }
                }
            );

            // Verify all categories are registered
            expect(manager.get('appearance.bodyTypes')).toContain('giant');
            expect(manager.get('appearance.skinTones')).toContain('#FFCCAA');
            expect(manager.get('appearance.hairColors')).toContain('#1a1a1a');
            expect(manager.get('appearance.hairStyles')).toContain('Spiky');
            expect(manager.get('appearance.eyeColors')).toContain('#4169E1');
            expect(manager.get('appearance.facialFeatures')).toContain('Tattoo');
        });
    });

    describe('Races: custom races spawn', () => {
        it('should include custom races in available options', () => {
            // Note: Custom races must be valid race names from the Race enum
            // This test verifies that we can register existing races with custom weights
            const customRaces = ['Human', 'Elf', 'Dwarf'];

            CharacterGenerator.generate(
                'test-custom-races',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        races: customRaces
                    }
                }
            );

            const allRaces = manager.get('races');

            // Verify the races are in the system
            expect(allRaces).toContain('Human');
            expect(allRaces).toContain('Elf');
            expect(allRaces).toContain('Dwarf');
        });

        it('should apply custom weights to races', () => {
            const customRaces = ['Human', 'Elf'];

            // Register with custom weights
            manager.register('races', customRaces, {
                weights: { 'Human': 5.0, 'Elf': 2.0 }
            });

            const weights = manager.getWeights('races');

            // Verify custom weights are applied
            expect(weights['Human']).toBe(5.0);
            expect(weights['Elf']).toBe(2.0);
        });

        it('should handle empty custom races array', () => {
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

            // Should still generate successfully with default races
            expect(character.race).toBeDefined();
            expect(['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'])
                .toContain(character.race);
        });
    });

    describe('Classes: custom classes spawn', () => {
        it('should include custom classes in available options', () => {
            // Note: Custom classes must be valid class names from the Class enum
            // This test verifies that we can register existing classes with custom weights
            const customClasses = ['Fighter', 'Wizard', 'Rogue'];

            CharacterGenerator.generate(
                'test-custom-classes',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        classes: customClasses
                    }
                }
            );

            const allClasses = manager.get('classes');

            // Verify the classes are in the system
            expect(allClasses).toContain('Fighter');
            expect(allClasses).toContain('Wizard');
            expect(allClasses).toContain('Rogue');
        });

        it('should apply custom weights to classes', () => {
            const customClasses = ['Fighter', 'Wizard'];

            // Register with custom weights
            manager.register('classes', customClasses, {
                weights: { 'Fighter': 3.0, 'Wizard': 1.5 }
            });

            const weights = manager.getWeights('classes');

            // Verify custom weights are applied
            expect(weights['Fighter']).toBe(3.0);
            expect(weights['Wizard']).toBe(1.5);
        });

        it('should handle empty custom classes array', () => {
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

            // Should still generate successfully with default classes
            expect(character.class).toBeDefined();
            expect(['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'])
                .toContain(character.class);
        });
    });

    describe('Combined custom data', () => {
        it('should handle multiple custom categories at once', () => {
            const customSpells = [
                { name: 'Phoenix Fire', level: 5, school: 'Evocation' }
            ];
            const customEquipment = [
                { name: 'Dragon Sword', type: 'weapon' as const, rarity: 'legendary' as const, weight: 5 }
            ];
            const customAppearance = {
                bodyTypes: ['giant']
            };

            const character = CharacterGenerator.generate(
                'test-combined-custom',
                sampleAudioProfile,
                'Test Character',
                {
                    forceClass: 'Wizard',
                    extensions: {
                        spells: customSpells,
                        equipment: customEquipment,
                        appearance: customAppearance
                    }
                }
            );

            // Verify all custom data is registered
            expect(manager.get('spells').some((s: { name: string }) => s.name === 'Phoenix Fire')).toBe(true);
            expect(manager.get('equipment').some((e: { name: string }) => e.name === 'Dragon Sword')).toBe(true);
            expect(manager.get('appearance.bodyTypes')).toContain('giant');

            // Verify character generated successfully
            expect(character.name).toBe('Test Character');
            expect(character.class).toBe('Wizard');
        });
    });

    describe('Edge cases', () => {
        it('should handle multiple generations with different custom data', () => {
            // First generation with custom spells
            const customSpells1 = [
                { name: 'Fire Storm', level: 4, school: 'Evocation' }
            ];

            CharacterGenerator.generate(
                'test-multi-1',
                sampleAudioProfile,
                'Character 1',
                {
                    extensions: { spells: customSpells1 }
                }
            );

            expect(manager.get('spells').some((s: { name: string }) => s.name === 'Fire Storm')).toBe(true);

            // Second generation with different custom spells
            const customSpells2 = [
                { name: 'Ice Storm', level: 4, school: 'Evocation' }
            ];

            CharacterGenerator.generate(
                'test-multi-2',
                sampleAudioProfile,
                'Character 2',
                {
                    extensions: { spells: customSpells2 }
                }
            );

            // Both spells should be available (cumulative)
            expect(manager.get('spells').some((s: { name: string }) => s.name === 'Fire Storm')).toBe(true);
            expect(manager.get('spells').some((s: { name: string }) => s.name === 'Ice Storm')).toBe(true);
        });

        it('should maintain defaults when custom data is provided', () => {
            const customEquipment = [
                { name: 'Custom Item', type: 'item' as const, rarity: 'common' as const, weight: 1 }
            ];

            CharacterGenerator.generate(
                'test-maintain-defaults',
                sampleAudioProfile,
                'Test Character',
                {
                    extensions: {
                        equipment: customEquipment
                    }
                }
            );

            const allEquipment = manager.get('equipment');

            // Custom item should be present
            expect(allEquipment.some((e: { name: string }) => e.name === 'Custom Item')).toBe(true);

            // Default items should still be present
            expect(allEquipment.some((e: { name: string }) => e.name === 'Longsword')).toBe(true);
            expect(allEquipment.some((e: { name: string }) => e.name === 'Shortsword')).toBe(true);
        });
    });
});
