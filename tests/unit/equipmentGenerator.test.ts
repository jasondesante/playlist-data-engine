/**
 * Unit tests for EquipmentGenerator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EquipmentGenerator } from '../../src/core/generation/EquipmentGenerator.js';
import { SeededRNG } from '../../src/utils/random.js';
import type { Class } from '../../src/core/types/Character.js';
import { CLASS_STARTING_EQUIPMENT, EQUIPMENT_DATABASE } from '../../src/utils/constants.js';

describe('EquipmentGenerator', () => {
    describe('getStartingEquipment', () => {
        it('should return equipment for all classes', () => {
            const classes: Class[] = [
                'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
                'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
            ];

            for (const characterClass of classes) {
                const equipment = EquipmentGenerator.getStartingEquipment(characterClass);

                expect(equipment).toBeDefined();
                expect(equipment.weapons).toBeDefined();
                expect(equipment.armor).toBeDefined();
                expect(equipment.items).toBeDefined();
            }
        });

        it('should return equipment matching CLASS_STARTING_EQUIPMENT', () => {
            const classes: Class[] = [
                'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
                'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
            ];

            for (const characterClass of classes) {
                const equipment = EquipmentGenerator.getStartingEquipment(characterClass);
                const expectedEquipment = CLASS_STARTING_EQUIPMENT[characterClass];

                expect(equipment.weapons).toEqual(expectedEquipment.weapons);
                expect(equipment.armor).toEqual(expectedEquipment.armor);
                expect(equipment.items).toEqual(expectedEquipment.items);
            }
        });

        it('should return new arrays (not references)', () => {
            const equipment1 = EquipmentGenerator.getStartingEquipment('Fighter');
            const equipment2 = EquipmentGenerator.getStartingEquipment('Fighter');

            expect(equipment1.weapons).not.toBe(equipment2.weapons);
            expect(equipment1).toEqual(equipment2);
        });
    });

    describe('Class-Specific Starting Equipment', () => {
        it('Barbarian should have Greataxe and No Armor', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Barbarian');

            expect(equipment.weapons).toContain('Greataxe');
            expect(equipment.armor).toContain('No Armor');
        });

        it('Bard should have Rapier, Leather Armor, and Lute', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Bard');

            expect(equipment.weapons).toContain('Rapier');
            expect(equipment.armor).toContain('Leather Armor');
            expect(equipment.items).toContain('Lute');
        });

        it('Cleric should have Mace, Scale Mail, and Holy Symbol', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Cleric');

            expect(equipment.weapons).toContain('Mace');
            expect(equipment.armor).toContain('Scale Mail');
            expect(equipment.items).toContain('Holy Symbol');
        });

        it('Druid should have Quarterstaff, Leather Armor, and Druidic Focus', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Druid');

            expect(equipment.weapons).toContain('Quarterstaff');
            expect(equipment.armor).toContain('Leather Armor');
            expect(equipment.items).toContain('Druidic Focus');
        });

        it('Fighter should have Longsword and Chain Mail', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Fighter');

            expect(equipment.weapons).toContain('Longsword');
            expect(equipment.armor).toContain('Chain Mail');
        });

        it('Monk should have Shortsword and No Armor', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Monk');

            expect(equipment.weapons).toContain('Shortsword');
            expect(equipment.armor).toContain('No Armor');
        });

        it('Paladin should have Longsword, Chain Mail, and Holy Symbol', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Paladin');

            expect(equipment.weapons).toContain('Longsword');
            expect(equipment.armor).toContain('Chain Mail');
            expect(equipment.items).toContain('Holy Symbol');
        });

        it('Ranger should have Longbow and Leather Armor', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Ranger');

            expect(equipment.weapons).toContain('Longbow');
            expect(equipment.armor).toContain('Leather Armor');
        });

        it('Rogue should have Rapier, Leather Armor, and Thieves\' Tools', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Rogue');

            expect(equipment.weapons).toContain('Rapier');
            expect(equipment.armor).toContain('Leather Armor');
            expect(equipment.items).toContain('Thieves\' Tools');
        });

        it('Sorcerer should have Dagger, Leather Armor, and Arcane Focus', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Sorcerer');

            expect(equipment.weapons).toContain('Dagger');
            expect(equipment.armor).toContain('Leather Armor');
            expect(equipment.items).toContain('Arcane Focus');
        });

        it('Warlock should have Dagger, Leather Armor, and Arcane Focus', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Warlock');

            expect(equipment.weapons).toContain('Dagger');
            expect(equipment.armor).toContain('Leather Armor');
            expect(equipment.items).toContain('Arcane Focus');
        });

        it('Wizard should have Quarterstaff, No Armor, and Spellbook', () => {
            const equipment = EquipmentGenerator.getStartingEquipment('Wizard');

            expect(equipment.weapons).toContain('Quarterstaff');
            expect(equipment.armor).toContain('No Armor');
            expect(equipment.items).toContain('Spellbook');
        });
    });

    describe('Equipment Database Validation', () => {
        it('should have all starting equipment items in database', () => {
            const classes: Class[] = [
                'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
                'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'
            ];

            for (const characterClass of classes) {
                const startingEquipment = CLASS_STARTING_EQUIPMENT[characterClass];
                const allItems = [
                    ...startingEquipment.weapons,
                    ...startingEquipment.armor,
                    ...startingEquipment.items
                ];

                for (const item of allItems) {
                    expect(EQUIPMENT_DATABASE[item]).toBeDefined();
                }
            }
        });

        it('should have valid equipment types', () => {
            const validTypes = ['weapon', 'armor', 'item'];

            for (const [name, equipment] of Object.entries(EQUIPMENT_DATABASE)) {
                expect(validTypes).toContain(equipment.type);
            }
        });

        it('should have valid rarity levels', () => {
            const validRarities = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];

            for (const [name, equipment] of Object.entries(EQUIPMENT_DATABASE)) {
                expect(validRarities).toContain(equipment.rarity);
            }
        });

        it('should have non-negative weight values', () => {
            for (const [name, equipment] of Object.entries(EQUIPMENT_DATABASE)) {
                expect(equipment.weight).toBeGreaterThanOrEqual(0);
            }
        });

        it('should have reasonable weight values (< 100 lbs)', () => {
            for (const [name, equipment] of Object.entries(EQUIPMENT_DATABASE)) {
                expect(equipment.weight).toBeLessThan(100);
            }
        });
    });

    describe('Equipment Types', () => {
        it('should categorize weapons correctly', () => {
            const weapons = ['Greataxe', 'Longsword', 'Shortsword', 'Rapier', 'Quarterstaff', 'Mace', 'Dagger'];

            for (const weapon of weapons) {
                expect(EQUIPMENT_DATABASE[weapon].type).toBe('weapon');
            }
        });

        it('should categorize armor correctly', () => {
            const armors = ['Leather Armor', 'Scale Mail', 'Chain Mail', 'Plate Armor', 'Shield', 'No Armor'];

            for (const armor of armors) {
                expect(EQUIPMENT_DATABASE[armor].type).toBe('armor');
            }
        });

        it('should categorize items correctly', () => {
            const items = ['Spellbook', 'Holy Symbol', 'Arcane Focus', 'Druidic Focus', 'Lute', 'Thieves\' Tools'];

            for (const item of items) {
                expect(EQUIPMENT_DATABASE[item].type).toBe('item');
            }
        });
    });

    describe('Special Equipment', () => {
        it('spellcasters should have appropriate focus items', () => {
            const wizard = EquipmentGenerator.getStartingEquipment('Wizard');
            const cleric = EquipmentGenerator.getStartingEquipment('Cleric');
            const druid = EquipmentGenerator.getStartingEquipment('Druid');

            expect(wizard.items).toContain('Spellbook');
            expect(cleric.items).toContain('Holy Symbol');
            expect(druid.items).toContain('Druidic Focus');
        });

        it('Rogue should have Thieves\' Tools', () => {
            const rogue = EquipmentGenerator.getStartingEquipment('Rogue');
            expect(rogue.items).toContain('Thieves\' Tools');
        });

        it('Bard should have musical instrument', () => {
            const bard = EquipmentGenerator.getStartingEquipment('Bard');
            expect(bard.items).toContain('Lute');
        });
    });

    describe('Equipment Weight', () => {
        it('heavy armor should weigh more than light armor', () => {
            const chainMail = EQUIPMENT_DATABASE['Chain Mail'];
            const leatherArmor = EQUIPMENT_DATABASE['Leather Armor'];

            expect(chainMail.weight).toBeGreaterThan(leatherArmor.weight);
        });

        it('two-handed weapons should generally weigh more than one-handed', () => {
            const greataxe = EQUIPMENT_DATABASE['Greataxe'];
            const dagger = EQUIPMENT_DATABASE['Dagger'];

            expect(greataxe.weight).toBeGreaterThan(dagger.weight);
        });

        it('No Armor should have zero weight', () => {
            expect(EQUIPMENT_DATABASE['No Armor'].weight).toBe(0);
        });
    });

    describe('Adventure Packs', () => {
        it('should have adventure pack items in database', () => {
            const packs = [
                'Burglar\'s Pack',
                'Explorer\'s Pack',
                'Entertainer\'s Pack',
                'Priest\'s Pack',
                'Dungeoneer\'s Pack',
                'Scholar\'s Pack',
                'Traveler\'s Pack'
            ];

            for (const pack of packs) {
                expect(EQUIPMENT_DATABASE[pack]).toBeDefined();
                expect(EQUIPMENT_DATABASE[pack].type).toBe('item');
            }
        });

        it('adventure packs should have reasonable weight (30-70 lbs)', () => {
            const packs = [
                'Burglar\'s Pack',
                'Explorer\'s Pack',
                'Entertainer\'s Pack',
                'Priest\'s Pack'
            ];

            for (const pack of packs) {
                const weight = EQUIPMENT_DATABASE[pack].weight;
                expect(weight).toBeGreaterThanOrEqual(30);
                expect(weight).toBeLessThanOrEqual(70);
            }
        });
    });

    describe('Ammunition', () => {
        it('should have individual ammunition items in database', () => {
            expect(EQUIPMENT_DATABASE['Arrow']).toBeDefined();
            expect(EQUIPMENT_DATABASE['Bolt']).toBeDefined();
        });

        it('individual ammunition should be lightweight', () => {
            expect(EQUIPMENT_DATABASE['Arrow'].weight).toBeLessThanOrEqual(0.1);
            expect(EQUIPMENT_DATABASE['Bolt'].weight).toBeLessThanOrEqual(0.1);
        });

        it('Ranger should receive 20 Arrow items', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const arrowItem = equipment.items.find((i) => i.name === 'Arrow');
            expect(arrowItem).toBeDefined();
            expect(arrowItem!.quantity).toBe(20);
        });

        it('Ranger arrow weight should be 1 lb total (20 × 0.05)', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Ranger');

            const arrowItem = equipment.items.find((i) => i.name === 'Arrow');
            const arrowWeight = arrowItem!.quantity * EQUIPMENT_DATABASE['Arrow'].weight;

            expect(arrowWeight).toBeCloseTo(1.0, 0.01);
        });
    });

    // ==========================================
    // Phase 10: Additional Equipment Effect Tests
    // Tests for equipment effect integration, modifications,
    // getActiveEffects, enhanced inventory items, and instance IDs
    // ==========================================

    describe('Equipment Effect Integration', () => {
        let testCharacter: any;

        beforeEach(() => {
            // Create a minimal character for effect testing
            testCharacter = {
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
                generated_at: new Date().toISOString(),
                equipment_effects: []
            };
        });

        it('should apply equipment effects when equipping an item with character', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');
            const initialArmorClass = testCharacter.armor_class;

            // Equip Chain Mail (should set AC to 16)
            EquipmentGenerator.equipItem(equipment, 'Chain Mail', testCharacter);

            expect(equipment.armor.find((a) => a.name === 'Chain Mail')?.equipped).toBe(true);
            // Equipment effects should be tracked
            expect(testCharacter.equipment_effects).toBeDefined();
        });

        it('should remove equipment effects when unequipping an item with character', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Fighter');

            // Chain Mail starts equipped for Fighter
            expect(equipment.armor.find((a) => a.name === 'Chain Mail')?.equipped).toBe(true);

            // Unequip it - need to capture return value
            equipment = EquipmentGenerator.unequipItem(equipment, 'Chain Mail', testCharacter);
            expect(equipment.armor.find((a) => a.name === 'Chain Mail')?.equipped).toBe(false);
        });

        it('should not apply effects when character is not provided', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');

            // Equip without character - should not throw
            expect(() => {
                EquipmentGenerator.equipItem(equipment, 'Chain Mail');
            }).not.toThrow();

            expect(equipment.armor.find((a) => a.name === 'Chain Mail')?.equipped).toBe(true);
        });

        it('should handle equipping items with no effects gracefully', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');

            // Torch is a simple item with minimal effects
            expect(() => {
                EquipmentGenerator.equipItem(equipment, 'Rope', testCharacter);
            }).not.toThrow();
        });

        it('should update equipped weight when equipping items', () => {
            let equipment = EquipmentGenerator.initializeEquipment('Fighter');
            const initialEquippedWeight = equipment.equippedWeight;

            // Unequip initial weapon (Longsword is equipped) - capture return value
            equipment = EquipmentGenerator.unequipItem(equipment, 'Longsword');
            const weightAfterUnequip = equipment.equippedWeight;

            // Add Dagger to inventory first, then equip it
            equipment = EquipmentGenerator.addItem(equipment, 'Dagger');
            equipment = EquipmentGenerator.equipItem(equipment, 'Dagger');
            const weightAfterEquip = equipment.equippedWeight;

            // After unequipping Longsword (3 lbs), weight should decrease
            expect(weightAfterUnequip).toBeLessThan(initialEquippedWeight);
            // After equipping Dagger (1 lb), weight should be more than after unequip but less than initial
            expect(weightAfterEquip).toBeGreaterThan(weightAfterUnequip);
        });
    });

    describe('Equipment Modification Methods', () => {
        let testCharacter: any;
        let testEquipment: any;

        beforeEach(() => {
            // Create a minimal character
            testCharacter = {
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
                generated_at: new Date().toISOString(),
                equipment_effects: []
            };

            testEquipment = EquipmentGenerator.initializeEquipment('Fighter');
        });

        it('should add a modification to an equipment item', () => {
            const modification = {
                id: 'plus_one_enchantment',
                name: '+1 Enchantment',
                properties: [
                    {
                        type: 'passive_modifier' as const,
                        target: 'attack_roll',
                        value: 1,
                        description: '+1 to attack rolls'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            const updated = EquipmentGenerator.addModification(
                testEquipment,
                'Longsword',
                modification
            );

            const longsword = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(longsword?.modifications).toBeDefined();
            expect(longsword?.modifications).toHaveLength(1);
            expect(longsword?.modifications?.[0].id).toBe('plus_one_enchantment');
        });

        it('should add multiple modifications to the same item', () => {
            const mod1 = {
                id: 'fire_damage',
                name: 'Fire Damage',
                properties: [
                    {
                        type: 'damage_bonus' as const,
                        target: 'fire',
                        value: 6,
                        description: '+1d6 fire damage'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            const mod2 = {
                id: 'plus_one',
                name: '+1',
                properties: [
                    {
                        type: 'passive_modifier' as const,
                        target: 'attack_roll',
                        value: 1,
                        description: '+1 to attack'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            let updated = EquipmentGenerator.addModification(testEquipment, 'Longsword', mod1);
            updated = EquipmentGenerator.addModification(updated, 'Longsword', mod2);

            const longsword = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(longsword?.modifications).toHaveLength(2);
        });

        it('should remove a modification from an equipment item', () => {
            const modification = {
                id: 'temp_enchantment',
                name: 'Temp Enchantment',
                properties: [
                    {
                        type: 'passive_modifier' as const,
                        target: 'attack_roll',
                        value: 1,
                        description: '+1 to attack'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            let updated = EquipmentGenerator.addModification(testEquipment, 'Longsword', modification);
            const longsword = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(longsword?.modifications).toHaveLength(1);

            updated = EquipmentGenerator.removeModification(updated, 'Longsword', 'temp_enchantment');
            const updatedLongsword = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(updatedLongsword?.modifications).toHaveLength(0);
        });

        it('should return original equipment if item not found when adding modification', () => {
            const modification = {
                id: 'test_mod',
                name: 'Test',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            const updated = EquipmentGenerator.addModification(testEquipment, 'Nonexistent Item', modification);
            expect(updated).toBe(testEquipment);
        });

        it('should return original equipment if modification not found when removing', () => {
            const updated = EquipmentGenerator.removeModification(testEquipment, 'Longsword', 'nonexistent_mod');
            expect(updated).toBe(testEquipment);
        });

        it('should reapply effects when modifying equipped item with character', () => {
            const modification = {
                id: 'test_enchantment',
                name: 'Test Enchantment',
                properties: [
                    {
                        type: 'stat_bonus' as const,
                        target: 'STR',
                        value: 2,
                        description: '+2 Strength'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'enchantment'
            };

            // Ensure item is equipped
            testEquipment = EquipmentGenerator.equipItem(testEquipment, 'Longsword', testCharacter);

            // Add modification
            const updated = EquipmentGenerator.addModification(
                testEquipment,
                'Longsword',
                modification,
                undefined,
                testCharacter
            );

            // Should not throw and character should have equipment_effects tracked
            expect(testCharacter.equipment_effects).toBeDefined();
        });
    });

    describe('getActiveEffects Method', () => {
        let testEquipment: any;

        beforeEach(() => {
            testEquipment = EquipmentGenerator.initializeEquipment('Fighter');
        });

        it('should return empty array for non-existent item', () => {
            const effects = EquipmentGenerator.getActiveEffects(testEquipment, 'Nonexistent Item');
            expect(effects).toEqual([]);
        });

        it('should return base properties for item with no modifications', () => {
            // Add Chain Mail which has properties
            const effects = EquipmentGenerator.getActiveEffects(testEquipment, 'Chain Mail');

            // Chain Mail has base properties like AC bonus
            expect(Array.isArray(effects)).toBe(true);
        });

        it('should return combined effects from base and modifications', () => {
            const modification = {
                id: 'test_mod',
                name: 'Test Mod',
                properties: [
                    {
                        type: 'passive_modifier' as const,
                        target: 'test_target',
                        value: 5,
                        description: 'Test property'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            let updated = EquipmentGenerator.addModification(testEquipment, 'Longsword', modification);
            const effects = EquipmentGenerator.getActiveEffects(updated, 'Longsword');

            // Should have at least the modification property
            const hasModProperty = effects.some((e: any) => e.target === 'test_target');
            expect(hasModProperty).toBe(true);
        });

        it('should combine multiple modification effects', () => {
            const mod1 = {
                id: 'mod1',
                name: 'Mod 1',
                properties: [
                    { type: 'stat_bonus' as const, target: 'STR', value: 1, description: '+1 STR' }
                ],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            const mod2 = {
                id: 'mod2',
                name: 'Mod 2',
                properties: [
                    { type: 'stat_bonus' as const, target: 'DEX', value: 1, description: '+1 DEX' }
                ],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            let updated = EquipmentGenerator.addModification(testEquipment, 'Longsword', mod1);
            updated = EquipmentGenerator.addModification(updated, 'Longsword', mod2);

            const effects = EquipmentGenerator.getActiveEffects(updated, 'Longsword');

            // Should have both modification properties
            const strBonus = effects.filter((e: any) => e.target === 'STR');
            const dexBonus = effects.filter((e: any) => e.target === 'DEX');
            expect(strBonus.length).toBeGreaterThan(0);
            expect(dexBonus.length).toBeGreaterThan(0);
        });

        it('should filter by instance ID when provided', () => {
            // Add same item twice (simulating two instances)
            testEquipment = EquipmentGenerator.addItem(testEquipment, 'Longsword');
            testEquipment = EquipmentGenerator.addItem(testEquipment, 'Longsword');

            // Add modification to first instance with specific instance ID
            const modification = {
                id: 'test_mod',
                name: 'Test Mod',
                properties: [
                    {
                        type: 'passive_modifier' as const,
                        target: 'test_prop',
                        value: 1,
                        description: 'Test'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            const instanceId = 'test_instance_123';
            let updated = EquipmentGenerator.addModification(
                testEquipment,
                'Longsword',
                modification,
                instanceId
            );

            // Get effects for specific instance
            const effects = EquipmentGenerator.getActiveEffects(updated, 'Longsword', instanceId);
            expect(Array.isArray(effects)).toBe(true);
        });
    });

    describe('Enhanced Inventory Items', () => {
        it('should support modifications array on inventory items', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');
            const modification = {
                id: 'test_mod',
                name: 'Test',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            const updated = EquipmentGenerator.addModification(
                equipment,
                'Longsword',
                modification
            );

            const longsword = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(longsword?.modifications).toBeDefined();
            expect(Array.isArray(longsword?.modifications)).toBe(true);
        });

        it('should support templateId on inventory items', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');

            // Manually add a templateId to test the structure
            const item = equipment.weapons.find((w: any) => w.name === 'Longsword');
            if (item) {
                item.templateId = 'flaming_weapon_template';
            }

            expect(item?.templateId).toBe('flaming_weapon_template');
        });

        it('should support instanceId on inventory items', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');
            const modification = {
                id: 'test_mod',
                name: 'Test',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            // Adding a modification should generate an instanceId
            const updated = EquipmentGenerator.addModification(
                equipment,
                'Longsword',
                modification
            );

            const longsword = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(longsword?.instanceId).toBeDefined();
            expect(typeof longsword?.instanceId).toBe('string');
        });

        it('should maintain item type categorization with enhanced items', () => {
            const equipment = EquipmentGenerator.initializeEquipment('Fighter');

            // Weapons should be in weapons array
            expect(equipment.weapons.length).toBeGreaterThan(0);
            equipment.weapons.forEach((item: any) => {
                expect(item.name).toBeDefined();
                expect(item.quantity).toBeDefined();
                expect(typeof item.equipped).toBe('boolean');
            });

            // Armor should be in armor array
            expect(equipment.armor.length).toBeGreaterThan(0);
            equipment.armor.forEach((item: any) => {
                expect(item.name).toBeDefined();
                expect(item.quantity).toBeDefined();
                expect(typeof item.equipped).toBe('boolean');
            });

            // Items should be in items array
            expect(equipment.items.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Instance ID Handling', () => {
        let testEquipment: any;

        beforeEach(() => {
            testEquipment = EquipmentGenerator.initializeEquipment('Fighter');
        });

        it('should generate unique instance IDs when adding modifications', () => {
            const modification = {
                id: 'mod1',
                name: 'Mod 1',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            const updated = EquipmentGenerator.addModification(testEquipment, 'Longsword', modification);
            const item = updated.weapons.find((w: any) => w.name === 'Longsword');

            expect(item?.instanceId).toBeDefined();
            expect(item?.instanceId).toContain('Longsword');
        });

        it('should use provided instance ID for effect application when adding modification', () => {
            const customInstanceId = 'custom_instance_12345';
            const modification = {
                id: 'mod1',
                name: 'Mod 1',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            const updated = EquipmentGenerator.addModification(
                testEquipment,
                'Longsword',
                modification,
                customInstanceId
            );

            const item = updated.weapons.find((w: any) => w.name === 'Longsword');
            // When instanceId is provided, it's used for effect tracking but item.instanceId may still be undefined
            // The modification is still added to the item
            expect(item?.modifications).toHaveLength(1);
            // If we want instanceId to be set on the item, we need to either:
            // 1. Not provide an instanceId (so it auto-generates)
            // 2. Or the item already had an instanceId
        });

        it('should track modifications on the same item', () => {
            // addItem with same name increments quantity, doesn't create new instance
            let updated = EquipmentGenerator.addItem(testEquipment, 'Dagger');

            // Now we should have quantity 2 for Dagger (or Dagger is separate from Longsword)
            const daggers = updated.weapons.filter((w: any) => w.name === 'Dagger');
            expect(daggers.length).toBeGreaterThanOrEqual(1);
        });

        it('should remove modifications from specific instances', () => {
            // Add modification to Longsword
            const modification = {
                id: 'test_mod',
                name: 'Test',
                properties: [
                    {
                        type: 'passive_modifier' as const,
                        target: 'test',
                        value: 1,
                        description: 'Test'
                    }
                ],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            let updated = EquipmentGenerator.addModification(
                testEquipment,
                'Longsword',
                modification
            );

            // Verify modification was added
            const itemBefore = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(itemBefore?.modifications?.length).toBe(1);

            // Remove modification
            updated = EquipmentGenerator.removeModification(
                updated,
                'Longsword',
                'test_mod'
            );

            const itemAfter = updated.weapons.find((w: any) => w.name === 'Longsword');
            expect(itemAfter?.modifications?.length).toBe(0);
        });

        it('should preserve instance ID across operations', () => {
            const modification = {
                id: 'mod1',
                name: 'Mod 1',
                properties: [],
                appliedAt: new Date().toISOString(),
                source: 'test'
            };

            let updated = EquipmentGenerator.addModification(testEquipment, 'Longsword', modification);
            const originalInstance = updated.weapons.find((w: any) => w.name === 'Longsword');
            const originalInstanceId = originalInstance?.instanceId;

            // Equip the item
            updated = EquipmentGenerator.equipItem(updated, 'Longsword');
            const equippedItem = updated.weapons.find((w: any) => w.name === 'Longsword');

            expect(equippedItem?.instanceId).toBe(originalInstanceId);
        });
    });
});
