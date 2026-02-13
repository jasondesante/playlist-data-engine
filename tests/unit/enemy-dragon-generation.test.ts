/**
 * Unit tests for Dragon Enemy Generation
 *
 * Tests dragon template properties, dragon-specific traits,
 * and dragon enemy generation functionality.
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator';
import { getTemplateById, DEFAULT_ENEMY_TEMPLATES } from '../../src/constants/DefaultEnemies';
import { getDragonTemplateById, getDragonTemplates, getDragonTemplatesByArchetype } from '../../src/constants/EnemyTemplates/Dragon';
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

describe('Dragon Template Structure', () => {
    describe('Template Existence', () => {
        it('should have young-red-dragon template', () => {
            const youngRedDragon = getDragonTemplateById('young-red-dragon');
            expect(youngRedDragon).toBeDefined();
            expect(youngRedDragon?.name).toBe('Young Red Dragon');
        });

        it('should have young-blue-dragon template', () => {
            const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
            expect(youngBlueDragon).toBeDefined();
            expect(youngBlueDragon?.name).toBe('Young Blue Dragon');
        });

        it('should have dragon-wyrmling template', () => {
            const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
            expect(dragonWyrmling).toBeDefined();
            expect(dragonWyrmling?.name).toBe('Dragon Wyrmling');
        });

        it('should have drake template', () => {
            const drake = getDragonTemplateById('drake');
            expect(drake).toBeDefined();
            expect(drake?.name).toBe('Drake');
        });

        it('should have exactly 4 dragon templates', () => {
            const dragons = getDragonTemplates();
            expect(dragons.length).toBe(4);
        });
    });

    describe('Template Categories', () => {
        it('should mark all templates as dragon category', () => {
            const dragons = getDragonTemplates();
            dragons.forEach(template => {
                expect(template.category).toBe('dragon');
            });
        });
    });

    describe('Template Archetypes', () => {
        it('should have young-red-dragon as brute', () => {
            const youngRedDragon = getDragonTemplateById('young-red-dragon');
            expect(youngRedDragon?.archetype).toBe('brute');
        });

        it('should have dragon-wyrmling as brute', () => {
            const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
            expect(dragonWyrmling?.archetype).toBe('brute');
        });

        it('should have drake as brute', () => {
            const drake = getDragonTemplateById('drake');
            expect(drake?.archetype).toBe('brute');
        });

        it('should have young-blue-dragon as archer', () => {
            const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
            expect(youngBlueDragon?.archetype).toBe('archer');
        });

        it('should get correct templates by archetype', () => {
            const dragonBrutes = getDragonTemplatesByArchetype('brute');
            const dragonArchers = getDragonTemplatesByArchetype('archer');

            expect(dragonBrutes.length).toBe(3);
            expect(dragonArchers.length).toBe(1);

            expect(dragonBrutes.map(t => t.id)).toContain('young-red-dragon');
            expect(dragonBrutes.map(t => t.id)).toContain('dragon-wyrmling');
            expect(dragonBrutes.map(t => t.id)).toContain('drake');
            expect(dragonArchers[0]?.id).toBe('young-blue-dragon');
        });
    });

    describe('Signature Abilities', () => {
        it('should have Fire Breath for young-red-dragon', () => {
            const youngRedDragon = getDragonTemplateById('young-red-dragon');
            expect(youngRedDragon?.signatureAbility.name).toBe('Fire Breath');
            expect(youngRedDragon?.signatureAbility.damageType).toBe('fire');
            expect(youngRedDragon?.signatureAbility.attackType).toBe('ranged');
            expect(youngRedDragon?.signatureAbility.properties).toContain('aoe');
            expect(youngRedDragon?.signatureAbility.properties).toContain('cone');
        });

        it('should have Lightning Breath for young-blue-dragon', () => {
            const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
            expect(youngBlueDragon?.signatureAbility.name).toBe('Lightning Breath');
            expect(youngBlueDragon?.signatureAbility.damageType).toBe('lightning');
            expect(youngBlueDragon?.signatureAbility.attackType).toBe('ranged');
            expect(youngBlueDragon?.signatureAbility.properties).toContain('aoe');
            expect(youngBlueDragon?.signatureAbility.properties).toContain('line');
        });

        it('should have Bite + Claw for dragon-wyrmling', () => {
            const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
            expect(dragonWyrmling?.signatureAbility.name).toBe('Bite + Claw');
            expect(dragonWyrmling?.signatureAbility.damageType).toBe('slashing');
            expect(dragonWyrmling?.signatureAbility.attackType).toBe('melee');
            expect(dragonWyrmling?.signatureAbility.properties).toContain('multiattack');
        });

        it('should have Tail Swipe for drake', () => {
            const drake = getDragonTemplateById('drake');
            expect(drake?.signatureAbility.name).toBe('Tail Swipe');
            expect(drake?.signatureAbility.damageType).toBe('bludgeoning');
            expect(drake?.signatureAbility.attackType).toBe('melee');
            expect(drake?.signatureAbility.properties).toContain('knockback');
            expect(drake?.signatureAbility.properties).toContain('push');
        });
    });
});

describe('Dragon Resistances and Immunities', () => {
    describe('Young Red Dragon', () => {
        it('should have fire immunity', () => {
            const youngRedDragon = getDragonTemplateById('young-red-dragon');
            expect(youngRedDragon?.resistances?.immunities).toContain('fire');
        });
    });

    describe('Young Blue Dragon', () => {
        it('should have lightning immunity', () => {
            const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
            expect(youngBlueDragon?.resistances?.immunities).toContain('lightning');
        });

        it('should have thunder resistance', () => {
            const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
            expect(youngBlueDragon?.resistances?.resistances).toContain('thunder');
        });
    });

    describe('Dragon Wyrmling', () => {
        it('should have acid resistance', () => {
            const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
            expect(dragonWyrmling?.resistances?.resistances).toContain('acid');
        });
    });

    describe('Drake', () => {
        it('should have cold resistance', () => {
            const drake = getDragonTemplateById('drake');
            expect(drake?.resistances?.resistances).toContain('cold');
        });
    });
});

describe('Dragon Audio Preferences', () => {
    it('should prefer bass for young-red-dragon (brute)', () => {
        const youngRedDragon = getDragonTemplateById('young-red-dragon');
        expect(youngRedDragon?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(youngRedDragon?.audioPreference.bass).toBeGreaterThan(youngRedDragon?.audioPreference.mid || 0);
        expect(youngRedDragon?.audioPreference.bass).toBeGreaterThan(youngRedDragon?.audioPreference.treble || 0);
    });

    it('should prefer treble for young-blue-dragon (archer)', () => {
        const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
        expect(youngBlueDragon?.audioPreference.treble).toBeGreaterThanOrEqual(0.8);
        expect(youngBlueDragon?.audioPreference.treble).toBeGreaterThan(youngBlueDragon?.audioPreference.bass || 0);
        expect(youngBlueDragon?.audioPreference.treble).toBeGreaterThan(youngBlueDragon?.audioPreference.mid || 0);
    });

    it('should prefer mid for dragon-wyrmling (brute)', () => {
        const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
        expect(dragonWyrmling?.audioPreference.mid).toBeGreaterThanOrEqual(0.5);
        expect(dragonWyrmling?.audioPreference.mid).toBeGreaterThanOrEqual(dragonWyrmling?.audioPreference.bass || 0);
    });

    it('should prefer bass for drake (brute)', () => {
        const drake = getDragonTemplateById('drake');
        expect(drake?.audioPreference.bass).toBeGreaterThanOrEqual(0.7);
        expect(drake?.audioPreference.bass).toBeGreaterThan(drake?.audioPreference.mid || 0);
        expect(drake?.audioPreference.bass).toBeGreaterThan(drake?.audioPreference.treble || 0);
    });
});

describe('Dragon Enemy Generation', () => {
    describe('Template ID Generation', () => {
        it('should generate young-red-dragon from templateId', () => {
            const youngRedDragon = EnemyGenerator.generate({
                seed: 'young-red-dragon-test',
                templateId: 'young-red-dragon',
                rarity: 'common'
            });

            expect(youngRedDragon.name).toBe('Young Red Dragon');
            expect(youngRedDragon.ability_scores.STR).toBeGreaterThanOrEqual(17);
        });

        it('should generate young-blue-dragon from templateId', () => {
            const youngBlueDragon = EnemyGenerator.generate({
                seed: 'young-blue-dragon-test',
                templateId: 'young-blue-dragon',
                rarity: 'common'
            });

            expect(youngBlueDragon.name).toBe('Young Blue Dragon');
            expect(youngBlueDragon.ability_scores.DEX).toBeGreaterThanOrEqual(12);
        });

        it('should generate dragon-wyrmling from templateId', () => {
            const dragonWyrmling = EnemyGenerator.generate({
                seed: 'dragon-wyrmling-test',
                templateId: 'dragon-wyrmling',
                rarity: 'common'
            });

            expect(dragonWyrmling.name).toBe('Dragon Wyrmling');
            expect(dragonWyrmling.ability_scores.STR).toBeGreaterThanOrEqual(13);
        });

        it('should generate drake from templateId', () => {
            const drake = EnemyGenerator.generate({
                seed: 'drake-test',
                templateId: 'drake',
                rarity: 'common'
            });

            expect(drake.name).toBe('Drake');
            expect(drake.ability_scores.STR).toBeGreaterThanOrEqual(14);
        });
    });

    describe('Category-based Generation', () => {
        it('should generate dragon enemies when category is specified', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'dragon-test',
                category: 'dragon',
                archetype: 'brute'
            });

            // Should be one of dragon brutes (young-red-dragon, dragon-wyrmling, or drake)
            expect(['Young Red Dragon', 'Dragon Wyrmling', 'Drake']).toContain(enemy.name);
        });

        it('should generate dragon archer', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'dragon-archer-test',
                category: 'dragon',
                archetype: 'archer'
            });

            expect(enemy.name).toBe('Young Blue Dragon');
        });
    });

    describe('Rarity Scaling', () => {
        it('should scale young-red-dragon stats by rarity', () => {
            const redDragonCommon = EnemyGenerator.generate({
                seed: 'red-dragon-common',
                templateId: 'young-red-dragon',
                rarity: 'common'
            });
            const redDragonBoss = EnemyGenerator.generate({
                seed: 'red-dragon-boss',
                templateId: 'young-red-dragon',
                rarity: 'boss'
            });

            // Boss should have higher stats than common
            expect(redDragonBoss.ability_scores.CON).toBeGreaterThan(redDragonCommon.ability_scores.CON);
        });

        it('should scale dragon-wyrmling HP by rarity', () => {
            const wyrmlingCommon = EnemyGenerator.generate({
                seed: 'wyrmling-common',
                templateId: 'dragon-wyrmling',
                rarity: 'common'
            });
            const wyrmlingElite = EnemyGenerator.generate({
                seed: 'wyrmling-elite',
                templateId: 'dragon-wyrmling',
                rarity: 'elite'
            });

            expect(wyrmlingElite.hp.max).toBeGreaterThan(wyrmlingCommon.hp.max);
        });

        it('should scale young-blue-dragon damage die by rarity', () => {
            const rarityConfig = getRarityConfig('common');
            const bossConfig = getRarityConfig('boss');

            expect(rarityConfig.signatureDieSize).toBe(6); // d6
            expect(bossConfig.signatureDieSize).toBe(12); // d12
        });
    });

    describe('Audio-influenced Dragon Generation', () => {
        it('should select young-blue-dragon for treble-heavy audio', () => {
            const trebleAudio = createMockAudioProfile({
                bass_dominance: 0.05,
                mid_dominance: 0.05,
                treble_dominance: 0.9
            });

            const enemy = EnemyGenerator.generate({
                seed: 'treble-dragon-test',
                category: 'dragon',
                audioProfile: trebleAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            // With treble-heavy audio, young-blue-dragon (archer) should be selected
            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select young-red-dragon for bass-heavy audio', () => {
            const bassAudio = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.05,
                treble_dominance: 0.05
            });

            const enemy = EnemyGenerator.generate({
                seed: 'bass-dragon-test',
                category: 'dragon',
                audioProfile: bassAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select dragon-wyrmling for mid-range audio', () => {
            const midAudio = createMockAudioProfile({
                bass_dominance: 0.1,
                mid_dominance: 0.8,
                treble_dominance: 0.1
            });

            const enemy = EnemyGenerator.generate({
                seed: 'mid-dragon-test',
                category: 'dragon',
                audioProfile: midAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });
    });

    describe('Category Mix Mode', () => {
        it('should generate mixed dragon encounter using category mode', () => {
            const enemies = EnemyGenerator.generateEncounterByCR({
                seed: 'dragon-mix-test',
                targetCR: 0.5,
                count: 6,
                enemyMix: 'category',
                category: 'dragon'
            });

            expect(enemies.length).toBe(6);

            // All enemies should be from dragon category
            const dragonNames = ['Young Red Dragon', 'Young Blue Dragon', 'Dragon Wyrmling', 'Drake'];
            enemies.forEach(enemy => {
                expect(dragonNames).toContain(enemy.name);
            });

            // Should have variety (not all same)
            const names = enemies.map(e => e.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBeGreaterThan(1);
        });
    });
});

describe('Dragon Template Integration', () => {
    it('should find dragon templates in main template list', () => {
        const youngRedDragon = getTemplateById('young-red-dragon');
        const youngBlueDragon = getTemplateById('young-blue-dragon');
        const dragonWyrmling = getTemplateById('dragon-wyrmling');
        const drake = getTemplateById('drake');

        expect(youngRedDragon).toBeDefined();
        expect(youngBlueDragon).toBeDefined();
        expect(dragonWyrmling).toBeDefined();
        expect(drake).toBeDefined();
    });

    it('should have correct categories for dragon templates', () => {
        const youngRedDragon = getTemplateById('young-red-dragon');
        const youngBlueDragon = getTemplateById('young-blue-dragon');
        const dragonWyrmling = getTemplateById('dragon-wyrmling');
        const drake = getTemplateById('drake');

        expect(youngRedDragon?.category).toBe('dragon');
        expect(youngBlueDragon?.category).toBe('dragon');
        expect(dragonWyrmling?.category).toBe('dragon');
        expect(drake?.category).toBe('dragon');
    });

    it('should include dragons in total template count', () => {
        // Should have 10 V1 templates + 4 undead + 4 fiend + 4 elemental + 4 construct + 4 dragon = 30 total
        expect(DEFAULT_ENEMY_TEMPLATES.length).toBe(30);
    });
});

describe('Dragon Base Stats', () => {
    it('should have appropriate base stats for young-red-dragon', () => {
        const youngRedDragon = getDragonTemplateById('young-red-dragon');

        expect(youngRedDragon?.baseStats.STR).toBe(19);
        expect(youngRedDragon?.baseStats.DEX).toBe(12);
        expect(youngRedDragon?.baseStats.CON).toBe(17);
        expect(youngRedDragon?.baseStats.INT).toBe(12);
        expect(youngRedDragon?.baseStats.WIS).toBe(13);
        expect(youngRedDragon?.baseStats.CHA).toBe(15);
    });

    it('should have appropriate base stats for young-blue-dragon', () => {
        const youngBlueDragon = getDragonTemplateById('young-blue-dragon');

        expect(youngBlueDragon?.baseStats.STR).toBe(17);
        expect(youngBlueDragon?.baseStats.DEX).toBe(14);
        expect(youngBlueDragon?.baseStats.CON).toBe(15);
        expect(youngBlueDragon?.baseStats.INT).toBe(14);
        expect(youngBlueDragon?.baseStats.WIS).toBe(13);
        expect(youngBlueDragon?.baseStats.CHA).toBe(15);
    });

    it('should have appropriate base stats for dragon-wyrmling', () => {
        const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');

        expect(dragonWyrmling?.baseStats.STR).toBe(15);
        expect(dragonWyrmling?.baseStats.DEX).toBe(12);
        expect(dragonWyrmling?.baseStats.CON).toBe(14);
        expect(dragonWyrmling?.baseStats.INT).toBe(10);
        expect(dragonWyrmling?.baseStats.WIS).toBe(11);
        expect(dragonWyrmling?.baseStats.CHA).toBe(12);
    });

    it('should have appropriate base stats for drake', () => {
        const drake = getDragonTemplateById('drake');

        expect(drake?.baseStats.STR).toBe(16);
        expect(drake?.baseStats.DEX).toBe(12);
        expect(drake?.baseStats.CON).toBe(14);
        expect(drake?.baseStats.INT).toBe(8);
        expect(drake?.baseStats.WIS).toBe(10);
        expect(drake?.baseStats.CHA).toBe(10);
    });

    it('should have appropriate HP values', () => {
        const youngRedDragon = getDragonTemplateById('young-red-dragon');
        const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
        const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
        const drake = getDragonTemplateById('drake');

        expect(youngRedDragon?.baseHP).toBe(45);
        expect(youngBlueDragon?.baseHP).toBe(38);
        expect(dragonWyrmling?.baseHP).toBe(26);
        expect(drake?.baseHP).toBe(32);
    });

    it('should have appropriate AC values', () => {
        const youngRedDragon = getDragonTemplateById('young-red-dragon');
        const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
        const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
        const drake = getDragonTemplateById('drake');

        expect(youngRedDragon?.baseAC).toBe(18);
        expect(youngBlueDragon?.baseAC).toBe(19);
        expect(dragonWyrmling?.baseAC).toBe(17);
        expect(drake?.baseAC).toBe(15);
    });

    it('should have appropriate speed values', () => {
        const youngRedDragon = getDragonTemplateById('young-red-dragon');
        const youngBlueDragon = getDragonTemplateById('young-blue-dragon');
        const dragonWyrmling = getDragonTemplateById('dragon-wyrmling');
        const drake = getDragonTemplateById('drake');

        expect(youngRedDragon?.baseSpeed).toBe(40);
        expect(youngBlueDragon?.baseSpeed).toBe(40);
        expect(dragonWyrmling?.baseSpeed).toBe(30);
        expect(drake?.baseSpeed).toBe(40);
    });
});
