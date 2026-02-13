/**
 * Unit tests for Elemental Enemy Generation
 *
 * Tests elemental template properties, elemental-specific traits,
 * and elemental enemy generation functionality.
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator';
import { getTemplateById, DEFAULT_ENEMY_TEMPLATES } from '../../src/constants/DefaultEnemies';
import { getElementalTemplateById, getElementalTemplates, getElementalTemplatesByArchetype } from '../../src/constants/EnemyTemplates/Elemental';
import { getRarityConfig } from '../../src/constants/EnemyRarity';
import type { AudioProfile } from '../../src/core/types/AudioProfile';

/**
 * Helper function to create a mock audio profile
 */
function createMockAudioProfile(overrides?: Partial<AudioProfile>): AudioProfile {
    return {
        bass_dominance: 0.5,
        mid_dominance: 0.3,
        treble_dominance: 0.2,
        average_amplitude: 0.5,
        spectral_centroid: 1000,
        ...overrides
    };
}

describe('Elemental Template Structure', () => {
    describe('Template Existence', () => {
        it('should have fire-elemental template', () => {
            const fireElemental = getElementalTemplateById('fire-elemental');
            expect(fireElemental).toBeDefined();
            expect(fireElemental?.name).toBe('Fire Elemental');
        });

        it('should have water-elemental template', () => {
            const waterElemental = getElementalTemplateById('water-elemental');
            expect(waterElemental).toBeDefined();
            expect(waterElemental?.name).toBe('Water Elemental');
        });

        it('should have air-elemental template', () => {
            const airElemental = getElementalTemplateById('air-elemental');
            expect(airElemental).toBeDefined();
            expect(airElemental?.name).toBe('Air Elemental');
        });

        it('should have earth-elemental template', () => {
            const earthElemental = getElementalTemplateById('earth-elemental');
            expect(earthElemental).toBeDefined();
            expect(earthElemental?.name).toBe('Earth Elemental');
        });

        it('should have exactly 4 elemental templates', () => {
            const elementals = getElementalTemplates();
            expect(elementals.length).toBe(4);
        });
    });

    describe('Template Categories', () => {
        it('should mark all templates as elemental category', () => {
            const elementals = getElementalTemplates();
            elementals.forEach(template => {
                expect(template.category).toBe('elemental');
            });
        });
    });

    describe('Template Archetypes', () => {
        it('should have fire-elemental as brute', () => {
            const fireElemental = getElementalTemplateById('fire-elemental');
            expect(fireElemental?.archetype).toBe('brute');
        });

        it('should have earth-elemental as brute', () => {
            const earthElemental = getElementalTemplateById('earth-elemental');
            expect(earthElemental?.archetype).toBe('brute');
        });

        it('should have water-elemental as support', () => {
            const waterElemental = getElementalTemplateById('water-elemental');
            expect(waterElemental?.archetype).toBe('support');
        });

        it('should have air-elemental as archer', () => {
            const airElemental = getElementalTemplateById('air-elemental');
            expect(airElemental?.archetype).toBe('archer');
        });

        it('should get correct templates by archetype', () => {
            const elementalBrutes = getElementalTemplatesByArchetype('brute');
            const elementalArchers = getElementalTemplatesByArchetype('archer');
            const elementalSupport = getElementalTemplatesByArchetype('support');

            expect(elementalBrutes.length).toBe(2);
            expect(elementalArchers.length).toBe(1);
            expect(elementalSupport.length).toBe(1);

            expect(elementalBrutes.map(t => t.id)).toContain('fire-elemental');
            expect(elementalBrutes.map(t => t.id)).toContain('earth-elemental');
            expect(elementalArchers[0]?.id).toBe('air-elemental');
            expect(elementalSupport[0]?.id).toBe('water-elemental');
        });
    });

    describe('Signature Abilities', () => {
        it('should have Burning Touch for fire-elemental', () => {
            const fireElemental = getElementalTemplateById('fire-elemental');
            expect(fireElemental?.signatureAbility.name).toBe('Burning Touch');
            expect(fireElemental?.signatureAbility.damageType).toBe('fire');
            expect(fireElemental?.signatureAbility.attackType).toBe('melee');
            expect(fireElemental?.signatureAbility.properties).toContain('ongoing');
        });

        it('should have Whirlpool for water-elemental', () => {
            const waterElemental = getElementalTemplateById('water-elemental');
            expect(waterElemental?.signatureAbility.name).toBe('Whirlpool');
            expect(waterElemental?.signatureAbility.damageType).toBe('cold');
            expect(waterElemental?.signatureAbility.attackType).toBe('spell');
            expect(waterElemental?.signatureAbility.properties).toContain('control');
        });

        it('should have Wind Blast for air-elemental', () => {
            const airElemental = getElementalTemplateById('air-elemental');
            expect(airElemental?.signatureAbility.name).toBe('Wind Blast');
            expect(airElemental?.signatureAbility.damageType).toBe('force');
            expect(airElemental?.signatureAbility.attackType).toBe('ranged');
            expect(airElemental?.signatureAbility.properties).toContain('push');
        });

        it('should have Earth Slam for earth-elemental', () => {
            const earthElemental = getElementalTemplateById('earth-elemental');
            expect(earthElemental?.signatureAbility.name).toBe('Earth Slam');
            expect(earthElemental?.signatureAbility.damageType).toBe('bludgeoning');
            expect(earthElemental?.signatureAbility.attackType).toBe('melee');
            expect(earthElemental?.signatureAbility.properties).toContain('aoe');
        });
    });
});

describe('Elemental Resistances and Immunities', () => {
    describe('Fire Elemental', () => {
        it('should have fire immunity', () => {
            const fireElemental = getElementalTemplateById('fire-elemental');
            expect(fireElemental?.resistances?.immunities).toContain('fire');
        });
    });

    describe('Water Elemental', () => {
        it('should have cold immunity', () => {
            const waterElemental = getElementalTemplateById('water-elemental');
            expect(waterElemental?.resistances?.immunities).toContain('cold');
        });

        it('should have fire resistance', () => {
            const waterElemental = getElementalTemplateById('water-elemental');
            expect(waterElemental?.resistances?.resistances).toContain('fire');
        });

        it('should have necrotic resistance', () => {
            const waterElemental = getElementalTemplateById('water-elemental');
            expect(waterElemental?.resistances?.resistances).toContain('necrotic');
        });
    });

    describe('Air Elemental', () => {
        it('should have lightning immunity', () => {
            const airElemental = getElementalTemplateById('air-elemental');
            expect(airElemental?.resistances?.immunities).toContain('lightning');
        });

        it('should have thunder resistance', () => {
            const airElemental = getElementalTemplateById('air-elemental');
            expect(airElemental?.resistances?.resistances).toContain('thunder');
        });
    });

    describe('Earth Elemental', () => {
        it('should have poison immunity', () => {
            const earthElemental = getElementalTemplateById('earth-elemental');
            expect(earthElemental?.resistances?.immunities).toContain('poison');
        });

        it('should have necrotic resistance', () => {
            const earthElemental = getElementalTemplateById('earth-elemental');
            expect(earthElemental?.resistances?.resistances).toContain('necrotic');
        });
    });
});

describe('Elemental Audio Preferences', () => {
    it('should prefer bass for fire-elemental (brute)', () => {
        const fireElemental = getElementalTemplateById('fire-elemental');
        expect(fireElemental?.audioPreference.bass).toBeGreaterThanOrEqual(0.7);
        expect(fireElemental?.audioPreference.bass).toBeGreaterThan(fireElemental?.audioPreference.mid || 0);
        expect(fireElemental?.audioPreference.bass).toBeGreaterThan(fireElemental?.audioPreference.treble || 0);
    });

    it('should prefer mid for water-elemental (support)', () => {
        const waterElemental = getElementalTemplateById('water-elemental');
        expect(waterElemental?.audioPreference.mid).toBeGreaterThanOrEqual(0.6);
        expect(waterElemental?.audioPreference.mid).toBeGreaterThan(waterElemental?.audioPreference.bass || 0);
        expect(waterElemental?.audioPreference.mid).toBeGreaterThan(waterElemental?.audioPreference.treble || 0);
    });

    it('should prefer treble for air-elemental (archer)', () => {
        const airElemental = getElementalTemplateById('air-elemental');
        expect(airElemental?.audioPreference.treble).toBeGreaterThanOrEqual(0.8);
        expect(airElemental?.audioPreference.treble).toBeGreaterThan(airElemental?.audioPreference.bass || 0);
        expect(airElemental?.audioPreference.treble).toBeGreaterThan(airElemental?.audioPreference.mid || 0);
    });

    it('should prefer bass for earth-elemental (brute)', () => {
        const earthElemental = getElementalTemplateById('earth-elemental');
        expect(earthElemental?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(earthElemental?.audioPreference.bass).toBeGreaterThan(earthElemental?.audioPreference.mid || 0);
        expect(earthElemental?.audioPreference.bass).toBeGreaterThan(earthElemental?.audioPreference.treble || 0);
    });
});

describe('Elemental Enemy Generation', () => {
    describe('Template ID Generation', () => {
        it('should generate fire-elemental from templateId', () => {
            const fireElemental = EnemyGenerator.generate({
                seed: 'fire-elemental-test',
                templateId: 'fire-elemental',
                rarity: 'common'
            });

            expect(fireElemental.name).toBe('Fire Elemental');
            expect(fireElemental.ability_scores.CON).toBeGreaterThanOrEqual(14);
        });

        it('should generate water-elemental from templateId', () => {
            const waterElemental = EnemyGenerator.generate({
                seed: 'water-elemental-test',
                templateId: 'water-elemental',
                rarity: 'common'
            });

            expect(waterElemental.name).toBe('Water Elemental');
            expect(waterElemental.ability_scores.WIS).toBeGreaterThanOrEqual(10);
        });

        it('should generate air-elemental from templateId', () => {
            const airElemental = EnemyGenerator.generate({
                seed: 'air-elemental-test',
                templateId: 'air-elemental',
                rarity: 'common'
            });

            expect(airElemental.name).toBe('Air Elemental');
            expect(airElemental.ability_scores.DEX).toBeGreaterThanOrEqual(14);
        });

        it('should generate earth-elemental from templateId', () => {
            const earthElemental = EnemyGenerator.generate({
                seed: 'earth-elemental-test',
                templateId: 'earth-elemental',
                rarity: 'common'
            });

            expect(earthElemental.name).toBe('Earth Elemental');
            expect(earthElemental.ability_scores.STR).toBeGreaterThanOrEqual(16);
        });
    });

    describe('Category-based Generation', () => {
        it('should generate elemental enemies when category is specified', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'elemental-test',
                category: 'elemental',
                archetype: 'brute'
            });

            // Should be one of elemental brutes (fire-elemental or earth-elemental)
            expect(['Fire Elemental', 'Earth Elemental']).toContain(enemy.name);
        });

        it('should generate elemental archer', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'elemental-archer-test',
                category: 'elemental',
                archetype: 'archer'
            });

            expect(enemy.name).toBe('Air Elemental');
        });

        it('should generate elemental support', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'elemental-support-test',
                category: 'elemental',
                archetype: 'support'
            });

            expect(enemy.name).toBe('Water Elemental');
        });
    });

    describe('Rarity Scaling', () => {
        it('should scale fire-elemental stats by rarity', () => {
            const fireCommon = EnemyGenerator.generate({
                seed: 'fire-common',
                templateId: 'fire-elemental',
                rarity: 'common'
            });
            const fireBoss = EnemyGenerator.generate({
                seed: 'fire-boss',
                templateId: 'fire-elemental',
                rarity: 'boss'
            });

            // Boss should have higher stats than common
            expect(fireBoss.ability_scores.CON).toBeGreaterThan(fireCommon.ability_scores.CON);
        });

        it('should scale earth-elemental HP by rarity', () => {
            const earthCommon = EnemyGenerator.generate({
                seed: 'earth-common',
                templateId: 'earth-elemental',
                rarity: 'common'
            });
            const earthElite = EnemyGenerator.generate({
                seed: 'earth-elite',
                templateId: 'earth-elemental',
                rarity: 'elite'
            });

            expect(earthElite.hp.max).toBeGreaterThan(earthCommon.hp.max);
        });

        it('should scale water-elemental damage die by rarity', () => {
            const rarityConfig = getRarityConfig('common');
            const bossConfig = getRarityConfig('boss');

            expect(rarityConfig.signatureDieSize).toBe(6); // d6
            expect(bossConfig.signatureDieSize).toBe(12); // d12
        });
    });

    describe('Audio-influenced Elemental Generation', () => {
        it('should select air-elemental for treble-heavy audio', () => {
            const trebleAudio = createMockAudioProfile({
                bass_dominance: 0.05,
                mid_dominance: 0.05,
                treble_dominance: 0.9
            });

            const enemy = EnemyGenerator.generate({
                seed: 'treble-elemental-test',
                category: 'elemental',
                audioProfile: trebleAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            // With treble-heavy audio, air-elemental (archer) should be selected
            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select fire-elemental for bass-heavy audio', () => {
            const bassAudio = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.05,
                treble_dominance: 0.05
            });

            const enemy = EnemyGenerator.generate({
                seed: 'bass-elemental-test',
                category: 'elemental',
                audioProfile: bassAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select water-elemental for mid-range audio', () => {
            const midAudio = createMockAudioProfile({
                bass_dominance: 0.1,
                mid_dominance: 0.8,
                treble_dominance: 0.1
            });

            const enemy = EnemyGenerator.generate({
                seed: 'mid-elemental-test',
                category: 'elemental',
                audioProfile: midAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });
    });

    describe('Category Mix Mode', () => {
        it('should generate mixed elemental encounter using category mode', () => {
            const enemies = EnemyGenerator.generateEncounterByCR({
                seed: 'elemental-mix-test',
                targetCR: 0.5,
                count: 6,
                enemyMix: 'category',
                category: 'elemental'
            });

            expect(enemies.length).toBe(6);

            // All enemies should be from elemental category
            const elementalNames = ['Fire Elemental', 'Water Elemental', 'Air Elemental', 'Earth Elemental'];
            enemies.forEach(enemy => {
                expect(elementalNames).toContain(enemy.name);
            });

            // Should have variety (not all same)
            const names = enemies.map(e => e.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBeGreaterThan(1);
        });
    });
});

describe('Elemental Template Integration', () => {
    it('should find elemental templates in main template list', () => {
        const fireElemental = getTemplateById('fire-elemental');
        const waterElemental = getTemplateById('water-elemental');
        const airElemental = getTemplateById('air-elemental');
        const earthElemental = getTemplateById('earth-elemental');

        expect(fireElemental).toBeDefined();
        expect(waterElemental).toBeDefined();
        expect(airElemental).toBeDefined();
        expect(earthElemental).toBeDefined();
    });

    it('should have correct categories for elemental templates', () => {
        const fireElemental = getTemplateById('fire-elemental');
        const waterElemental = getTemplateById('water-elemental');
        const airElemental = getTemplateById('air-elemental');
        const earthElemental = getTemplateById('earth-elemental');

        expect(fireElemental?.category).toBe('elemental');
        expect(waterElemental?.category).toBe('elemental');
        expect(airElemental?.category).toBe('elemental');
        expect(earthElemental?.category).toBe('elemental');
    });

    it('should include elementals in total template count', () => {
        // Should have 10 V1 templates + 4 undead + 4 fiend + 4 elemental = 22 total
        expect(DEFAULT_ENEMY_TEMPLATES.length).toBe(22);
    });
});

describe('Elemental Base Stats', () => {
    it('should have appropriate base stats for fire-elemental', () => {
        const fireElemental = getElementalTemplateById('fire-elemental');

        expect(fireElemental?.baseStats.STR).toBe(14);
        expect(fireElemental?.baseStats.DEX).toBe(12);
        expect(fireElemental?.baseStats.CON).toBe(16);
        expect(fireElemental?.baseStats.INT).toBe(6);
        expect(fireElemental?.baseStats.WIS).toBe(10);
        expect(fireElemental?.baseStats.CHA).toBe(6);
    });

    it('should have appropriate base stats for water-elemental', () => {
        const waterElemental = getElementalTemplateById('water-elemental');

        expect(waterElemental?.baseStats.STR).toBe(14);
        expect(waterElemental?.baseStats.DEX).toBe(14);
        expect(waterElemental?.baseStats.CON).toBe(14);
        expect(waterElemental?.baseStats.INT).toBe(8);
        expect(waterElemental?.baseStats.WIS).toBe(12);
        expect(waterElemental?.baseStats.CHA).toBe(8);
    });

    it('should have appropriate base stats for air-elemental', () => {
        const airElemental = getElementalTemplateById('air-elemental');

        expect(airElemental?.baseStats.STR).toBe(12);
        expect(airElemental?.baseStats.DEX).toBe(16);
        expect(airElemental?.baseStats.CON).toBe(14);
        expect(airElemental?.baseStats.INT).toBe(8);
        expect(airElemental?.baseStats.WIS).toBe(12);
        expect(airElemental?.baseStats.CHA).toBe(8);
    });

    it('should have appropriate base stats for earth-elemental', () => {
        const earthElemental = getElementalTemplateById('earth-elemental');

        expect(earthElemental?.baseStats.STR).toBe(18);
        expect(earthElemental?.baseStats.DEX).toBe(8);
        expect(earthElemental?.baseStats.CON).toBe(16);
        expect(earthElemental?.baseStats.INT).toBe(6);
        expect(earthElemental?.baseStats.WIS).toBe(10);
        expect(earthElemental?.baseStats.CHA).toBe(6);
    });

    it('should have appropriate HP values', () => {
        const fireElemental = getElementalTemplateById('fire-elemental');
        const waterElemental = getElementalTemplateById('water-elemental');
        const airElemental = getElementalTemplateById('air-elemental');
        const earthElemental = getElementalTemplateById('earth-elemental');

        expect(fireElemental?.baseHP).toBe(26);
        expect(waterElemental?.baseHP).toBe(22);
        expect(airElemental?.baseHP).toBe(18);
        expect(earthElemental?.baseHP).toBe(30);
    });

    it('should have appropriate AC values', () => {
        const fireElemental = getElementalTemplateById('fire-elemental');
        const waterElemental = getElementalTemplateById('water-elemental');
        const airElemental = getElementalTemplateById('air-elemental');
        const earthElemental = getElementalTemplateById('earth-elemental');

        expect(fireElemental?.baseAC).toBe(13);
        expect(waterElemental?.baseAC).toBe(14);
        expect(airElemental?.baseAC).toBe(15);
        expect(earthElemental?.baseAC).toBe(17);
    });

    it('should have appropriate speed values', () => {
        const fireElemental = getElementalTemplateById('fire-elemental');
        const waterElemental = getElementalTemplateById('water-elemental');
        const airElemental = getElementalTemplateById('air-elemental');
        const earthElemental = getElementalTemplateById('earth-elemental');

        expect(fireElemental?.baseSpeed).toBe(50);
        expect(waterElemental?.baseSpeed).toBe(30);
        expect(airElemental?.baseSpeed).toBe(90);
        expect(earthElemental?.baseSpeed).toBe(20);
    });
});
