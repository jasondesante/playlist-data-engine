/**
 * Unit tests for EquipmentGenerator
 */

import { describe, it, expect } from 'vitest';
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
});
