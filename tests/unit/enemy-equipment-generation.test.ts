/**
 * Unit tests for Enemy Equipment Generation System
 *
 * Tests equipment generation for enemy characters based on:
 * - Archetype (brute, archer, support)
 * - Rarity tier (common, uncommon, elite, boss)
 * - Deterministic seeded selection
 */

import { describe, it, expect } from 'vitest';
import { EnemyEquipmentGenerator } from '../../src/core/generation/EnemyEquipmentGenerator';
import {
    ENEMY_EQUIPMENT_TEMPLATES,
    getEquipmentByArchetype,
    getEquipmentByArchetypeAndRarity,
    getWeaponsByArchetypeAndRarity,
    getArmorByArchetypeAndRarity,
    getShieldsByArchetypeAndRarity
} from '../../src/constants/EnemyEquipment';
import type { EnemyArchetype, EnemyRarity } from '../../src/core/types/Enemy';

describe('Enemy Equipment Templates', () => {
    describe('Template Structure', () => {
        it('should have all required template properties', () => {
            const template = ENEMY_EQUIPMENT_TEMPLATES[0];
            expect(template.id).toBeDefined();
            expect(template.name).toBeDefined();
            expect(template.type).toBeDefined();
            expect(template.archetypes).toBeDefined();
            expect(template.rarities).toBeDefined();
        });

        it('should have valid template types', () => {
            const types = new Set(ENEMY_EQUIPMENT_TEMPLATES.map(t => t.type));
            expect(types).toContain('weapon');
            expect(types).toContain('armor');
            expect(types).toContain('shield');
        });

        it('should have valid archetype values', () => {
            const allArchetypes = new Set<EnemyArchetype>();
            ENEMY_EQUIPMENT_TEMPLATES.forEach(template => {
                template.archetypes.forEach(archetype => allArchetypes.add(archetype));
            });
            expect(Array.from(allArchetypes)).toEqual(['brute', 'archer', 'support']);
        });

        it('should have valid rarity values', () => {
            const allRarities = new Set<EnemyRarity>();
            ENEMY_EQUIPMENT_TEMPLATES.forEach(template => {
                template.rarities.forEach(rarity => allRarities.add(rarity));
            });
            // Check that all expected rarities are present
            expect(allRarities.has('common')).toBe(true);
            expect(allRarities.has('uncommon')).toBe(true);
            expect(allRarities.has('elite')).toBe(true);
            expect(allRarities.has('boss')).toBe(true);
            expect(allRarities.size).toBe(4);
        });
    });

    describe('Equipment by Archetype', () => {
        it('should return equipment for brute archetype', () => {
            const equipment = getEquipmentByArchetype('brute');
            expect(equipment.length).toBeGreaterThan(0);
            equipment.forEach(item => {
                expect(item.archetypes).toContain('brute');
            });
        });

        it('should return equipment for archer archetype', () => {
            const equipment = getEquipmentByArchetype('archer');
            expect(equipment.length).toBeGreaterThan(0);
            equipment.forEach(item => {
                expect(item.archetypes).toContain('archer');
            });
        });

        it('should return equipment for support archetype', () => {
            const equipment = getEquipmentByArchetype('support');
            expect(equipment.length).toBeGreaterThan(0);
            equipment.forEach(item => {
                expect(item.archetypes).toContain('support');
            });
        });

        it('should return weapons for brute', () => {
            const weapons = getWeaponsByArchetypeAndRarity('brute', 'common');
            expect(weapons.length).toBeGreaterThan(0);
            weapons.forEach(w => {
                expect(w.type).toBe('weapon');
                expect(w.archetypes).toContain('brute');
                expect(w.rarities).toContain('common');
            });
        });

        it('should return weapons for archer', () => {
            const weapons = getWeaponsByArchetypeAndRarity('archer', 'uncommon');
            expect(weapons.length).toBeGreaterThan(0);
            weapons.forEach(w => {
                expect(w.type).toBe('weapon');
                expect(w.archetypes).toContain('archer');
                expect(w.rarities).toContain('uncommon');
            });
        });

        it('should return weapons for support', () => {
            const weapons = getWeaponsByArchetypeAndRarity('support', 'elite');
            expect(weapons.length).toBeGreaterThan(0);
            weapons.forEach(w => {
                expect(w.type).toBe('weapon');
                expect(w.archetypes).toContain('support');
                expect(w.rarities).toContain('elite');
            });
        });

        it('should return armor for all archetypes', () => {
            ['brute', 'archer', 'support'].forEach(archetype => {
                const armor = getArmorByArchetypeAndRarity(archetype, 'common');
                expect(armor.length).toBeGreaterThan(0);
                armor.forEach(a => {
                    expect(a.type).toBe('armor');
                    expect(a.archetypes).toContain(archetype);
                });
            });
        });

        it('should return shields for brute and support', () => {
            const bruteShields = getShieldsByArchetypeAndRarity('brute', 'uncommon');
            const supportShields = getShieldsByArchetypeAndRarity('support', 'uncommon');

            expect(bruteShields.length).toBeGreaterThan(0);
            expect(supportShields.length).toBeGreaterThan(0);
        });

        it('should not return shields for archer (two-handed weapons)', () => {
            const archerShields = getShieldsByArchetypeAndRarity('archer', 'boss');
            // Archers can't use shields (they need two hands for bows)
            // Or they may have 0 shields in their templates
            expect(archerShields.every(s => !s.archetypes.includes('archer'))).toBe(true);
        });
    });

    describe('Equipment by Rarity', () => {
        it('should have different equipment pools for common vs boss', () => {
            const commonWeapons = getWeaponsByArchetypeAndRarity('brute', 'common');
            const bossWeapons = getWeaponsByArchetypeAndRarity('brute', 'boss');

            const commonIds = commonWeapons.map(w => w.id);
            const bossIds = bossWeapons.map(w => w.id);

            // Boss should have access to greataxe
            expect(bossIds).toContain('greataxe');

            // Common should have handaxe, not greataxe
            expect(commonIds).toContain('handaxe');
            expect(commonIds).not.toContain('greataxe');
        });

        it('should scale armor availability by rarity', () => {
            const commonArmor = getArmorByArchetypeAndRarity('brute', 'common');
            const eliteArmor = getArmorByArchetypeAndRarity('brute', 'elite');
            const bossArmor = getArmorByArchetypeAndRarity('brute', 'boss');

            const commonIds = commonArmor.map(a => a.id);
            const eliteIds = eliteArmor.map(a => a.id);
            const bossIds = bossArmor.map(a => a.id);

            // Common: only leather armor
            expect(commonIds).toContain('leather-armor');
            expect(commonIds).not.toContain('chain-mail');

            // Elite: chain mail available
            expect(eliteIds).toContain('chain-mail');

            // Boss: plate armor available
            expect(bossIds).toContain('plate-armor');
        });

        it('should scale shield availability by rarity', () => {
            const commonShields = getShieldsByArchetypeAndRarity('brute', 'common');
            const bossShields = getShieldsByArchetypeAndRarity('brute', 'boss');

            // Shield becomes available at uncommon+
            // Common has no shields (25% chance when available, but templates start at uncommon)
            expect(commonShields.length).toBe(0);
            expect(bossShields.length).toBeGreaterThan(0);
        });
    });
});

describe('EnemyEquipmentGenerator', () => {
    describe('generate() method', () => {
        it('should generate equipment for brute common', () => {
            const equipment = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'common',
                seed: 'test-brute-common'
            });

            expect(equipment.weapon).toBeDefined();
            expect(equipment.armor).toBeDefined();
            expect(equipment.shield).toBeUndefined(); // Shields start at uncommon
        });

        it('should generate equipment for brute boss', () => {
            const equipment = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'boss',
                seed: 'test-brute-boss'
            });

            expect(equipment.weapon).toBeDefined();
            expect(equipment.armor).toBeDefined();
            expect(equipment.shield).toBeDefined(); // Boss always has shield
        });

        it('should generate equipment for archer common', () => {
            const equipment = EnemyEquipmentGenerator.generate({
                archetype: 'archer',
                rarity: 'common',
                seed: 'test-archer-common'
            });

            expect(equipment.weapon).toBeDefined();
            expect(equipment.armor).toBeDefined();
            expect(equipment.shield).toBeUndefined(); // Archers don't use shields
        });

        it('should generate equipment for support elite', () => {
            const equipment = EnemyEquipmentGenerator.generate({
                archetype: 'support',
                rarity: 'elite',
                seed: 'test-support-elite'
            });

            expect(equipment.weapon).toBeDefined();
            expect(equipment.armor).toBeDefined();
            // Elite support has 75% shield chance
        });

        it('should be deterministic with same seed', () => {
            const equipment1 = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'uncommon',
                seed: 'determinism-test'
            });

            const equipment2 = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'uncommon',
                seed: 'determinism-test'
            });

            expect(equipment1.weapon?.id).toBe(equipment2.weapon?.id);
            expect(equipment1.armor?.id).toBe(equipment2.armor?.id);
            expect(equipment1.shield?.id).toBe(equipment2.shield?.id);
        });

        it('should produce different results with different seeds', () => {
            const equipment1 = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'uncommon',
                seed: 'seed-1'
            });

            const equipment2 = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'uncommon',
                seed: 'seed-2'
            });

            // At least one should differ (shields are random)
            const weaponsDiffer = equipment1.weapon?.id !== equipment2.weapon?.id;
            const armorDiffers = equipment1.armor?.id !== equipment2.armor?.id;
            const shieldsDiffer = (equipment1.shield?.id) !== (equipment2.shield?.id);

            expect(weaponsDiffer || armorDiffers || shieldsDiffer).toBe(true);
        });

        it('should respect includeShield option', () => {
            const withShield = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'uncommon',
                seed: 'shield-test',
                includeShield: true
            });

            const withoutShield = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'uncommon',
                seed: 'shield-test',
                includeShield: false
            });

            // With includeShield=true, should potentially have shield
            // With includeShield=false, should never have shield
            expect(withoutShield.shield).toBeUndefined();
        });

        it('should select appropriate weapons by archetype', () => {
            const brute = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'elite',
                seed: 'weapon-brute'
            });

            const archer = EnemyEquipmentGenerator.generate({
                archetype: 'archer',
                rarity: 'elite',
                seed: 'weapon-archer'
            });

            const support = EnemyEquipmentGenerator.generate({
                archetype: 'support',
                rarity: 'elite',
                seed: 'weapon-support'
            });

            // Brute should get melee weapons (greataxe, longsword, handaxe)
            expect(['greataxe', 'longsword', 'handaxe', 'brute-mace']).toContain(brute.weapon?.id);

            // Archer should get ranged weapons or backup melee
            expect(['longbow', 'light-crossbow', 'shortsword', 'dagger']).toContain(archer.weapon?.id);

            // Support should get staff or mace
            expect(['quarterstaff', 'support-mace', 'support-dagger']).toContain(support.weapon?.id);
        });

        it('should select appropriate armor by rarity', () => {
            const common = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'common',
                seed: 'armor-common'
            });

            const elite = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'elite',
                seed: 'armor-elite'
            });

            const boss = EnemyEquipmentGenerator.generate({
                archetype: 'brute',
                rarity: 'boss',
                seed: 'armor-boss'
            });

            // Common always gets leather armor
            expect(common.armor?.id).toBe('leather-armor');

            // Elite gets scale mail or chain mail (80% priority chance)
            expect(['scale-mail', 'chain-mail', 'leather-armor']).toContain(elite.armor?.id);

            // Boss gets best armor
            expect(['plate-armor', 'chain-mail', 'scale-mail']).toContain(boss.armor?.id);
        });
    });

    describe('getEquipmentName() method', () => {
        it('should return correct equipment name for template IDs', () => {
            expect(EnemyEquipmentGenerator.getEquipmentName('greataxe')).toBe('Greataxe');
            expect(EnemyEquipmentGenerator.getEquipmentName('longbow')).toBe('Longbow');
            expect(EnemyEquipmentGenerator.getEquipmentName('quarterstaff')).toBe('Quarterstaff');
            expect(EnemyEquipmentGenerator.getEquipmentName('leather-armor')).toBe('Leather Armor');
            expect(EnemyEquipmentGenerator.getEquipmentName('chain-mail')).toBe('Chain Mail');
            expect(EnemyEquipmentGenerator.getEquipmentName('shield')).toBe('Shield');
        });

        it('should return template ID for unknown mappings', () => {
            const unknown = EnemyEquipmentGenerator.getEquipmentName('unknown-template');
            expect(unknown).toBe('unknown-template');
        });
    });

    describe('getAllTemplates() method', () => {
        it('should return all equipment templates', () => {
            const templates = EnemyEquipmentGenerator.getAllTemplates();
            expect(templates.length).toBe(ENEMY_EQUIPMENT_TEMPLATES.length);
            expect(templates).toEqual(ENEMY_EQUIPMENT_TEMPLATES);
        });
    });

    describe('getTemplateById() method', () => {
        it('should find template by ID', () => {
            const template = EnemyEquipmentGenerator.getTemplateById('greataxe');
            expect(template).toBeDefined();
            expect(template?.name).toBe('Greataxe');
            expect(template?.type).toBe('weapon');
        });

        it('should return undefined for unknown template', () => {
            const template = EnemyEquipmentGenerator.getTemplateById('nonexistent');
            expect(template).toBeUndefined();
        });
    });
});

describe('Equipment Integration with EnemyGenerator', () => {
    it('should generate enemies with equipment names from mapping', () => {
        const equipment = EnemyEquipmentGenerator.generate({
            archetype: 'brute',
            rarity: 'uncommon',
            seed: 'integration-test'
        });

        // Get actual equipment names
        const weaponName = equipment.weapon ? EnemyEquipmentGenerator.getEquipmentName(equipment.weapon.id) : undefined;
        const armorName = equipment.armor ? EnemyEquipmentGenerator.getEquipmentName(equipment.armor.id) : undefined;
        const shieldName = equipment.shield ? EnemyEquipmentGenerator.getEquipmentName(equipment.shield.id) : undefined;

        // All names should be defined and non-empty
        expect(weaponName).toBeDefined();
        expect(armorName).toBeDefined();

        if (shieldName) {
            expect(shieldName).toBeDefined();
        }
    });
});
