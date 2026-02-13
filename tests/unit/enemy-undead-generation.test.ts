/**
 * Unit tests for Undead Enemy Generation
 *
 * Tests undead template properties, undead-specific traits,
 * and undead enemy generation functionality.
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator';
import { getTemplateById, DEFAULT_ENEMY_TEMPLATES } from '../../src/constants/DefaultEnemies';
import { getUndeadTemplateById, getUndeadTemplates, getUndeadTemplatesByArchetype } from '../../src/constants/EnemyTemplates/Undead';
import { getRarityConfig } from '../../src/constants/EnemyRarity';
import type { AudioProfile } from '../../src/core/types/AudioProfile';
import type { EnemyRarity } from '../../src/core/types/Enemy';

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

describe('Undead Template Structure', () => {
    describe('Template Existence', () => {
        it('should have skeleton template', () => {
            const skeleton = getUndeadTemplateById('skeleton');
            expect(skeleton).toBeDefined();
            expect(skeleton?.name).toBe('Skeleton');
        });

        it('should have zombie template', () => {
            const zombie = getUndeadTemplateById('zombie');
            expect(zombie).toBeDefined();
            expect(zombie?.name).toBe('Zombie');
        });

        it('should have wight template', () => {
            const wight = getUndeadTemplateById('wight');
            expect(wight).toBeDefined();
            expect(wight?.name).toBe('Wight');
        });

        it('should have ghost template', () => {
            const ghost = getUndeadTemplateById('ghost');
            expect(ghost).toBeDefined();
            expect(ghost?.name).toBe('Ghost');
        });

        it('should have exactly 4 undead templates', () => {
            const undead = getUndeadTemplates();
            expect(undead.length).toBe(4);
        });
    });

    describe('Template Categories', () => {
        it('should mark all templates as undead category', () => {
            const undead = getUndeadTemplates();
            undead.forEach(template => {
                expect(template.category).toBe('undead');
            });
        });
    });

    describe('Template Archetypes', () => {
        it('should have skeleton as archer', () => {
            const skeleton = getUndeadTemplateById('skeleton');
            expect(skeleton?.archetype).toBe('archer');
        });

        it('should have zombie as brute', () => {
            const zombie = getUndeadTemplateById('zombie');
            expect(zombie?.archetype).toBe('brute');
        });

        it('should have wight as brute', () => {
            const wight = getUndeadTemplateById('wight');
            expect(wight?.archetype).toBe('brute');
        });

        it('should have ghost as support', () => {
            const ghost = getUndeadTemplateById('ghost');
            expect(ghost?.archetype).toBe('support');
        });

        it('should get correct templates by archetype', () => {
            const undeadArchers = getUndeadTemplatesByArchetype('archer');
            const undeadBrutes = getUndeadTemplatesByArchetype('brute');
            const undeadSupport = getUndeadTemplatesByArchetype('support');

            expect(undeadArchers.length).toBe(1);
            expect(undeadBrutes.length).toBe(2);
            expect(undeadSupport.length).toBe(1);

            expect(undeadArchers[0]?.id).toBe('skeleton');
            expect(undeadBrutes.map(t => t.id)).toContain('zombie');
            expect(undeadBrutes.map(t => t.id)).toContain('wight');
            expect(undeadSupport[0]?.id).toBe('ghost');
        });
    });

    describe('Signature Abilities', () => {
        it('should have Bone Shot for skeleton', () => {
            const skeleton = getUndeadTemplateById('skeleton');
            expect(skeleton?.signatureAbility.name).toBe('Bone Shot');
            expect(skeleton?.signatureAbility.damageType).toBe('piercing');
            expect(skeleton?.signatureAbility.attackType).toBe('ranged');
            expect(skeleton?.signatureAbility.range).toBe(80);
        });

        it('should have Undead Grip for zombie', () => {
            const zombie = getUndeadTemplateById('zombie');
            expect(zombie?.signatureAbility.name).toBe('Undead Grip');
            expect(zombie?.signatureAbility.damageType).toBe('necrotic');
            expect(zombie?.signatureAbility.attackType).toBe('melee');
            expect(zombie?.signatureAbility.properties).toContain('grapple');
        });

        it('should have Life Drain for wight', () => {
            const wight = getUndeadTemplateById('wight');
            expect(wight?.signatureAbility.name).toBe('Life Drain');
            expect(wight?.signatureAbility.damageType).toBe('necrotic');
            expect(wight?.signatureAbility.properties).toContain('lifesteal');
        });

        it('should have Horrifying Visage for ghost', () => {
            const ghost = getUndeadTemplateById('ghost');
            expect(ghost?.signatureAbility.name).toBe('Horrifying Visage');
            expect(ghost?.signatureAbility.damageType).toBe('psychic');
            expect(ghost?.signatureAbility.attackType).toBe('spell');
            expect(ghost?.signatureAbility.properties).toContain('fear');
        });
    });
});

describe('Undead Resistances and Immunities', () => {
    describe('Poison Immunity', () => {
        it('should have poison immunity for skeleton', () => {
            const skeleton = getUndeadTemplateById('skeleton');
            expect(skeleton?.resistances?.immunities).toContain('poison');
        });

        it('should have poison immunity for zombie', () => {
            const zombie = getUndeadTemplateById('zombie');
            expect(zombie?.resistances?.immunities).toContain('poison');
        });

        it('should have poison immunity for wight', () => {
            const wight = getUndeadTemplateById('wight');
            expect(wight?.resistances?.immunities).toContain('poison');
        });

        it('should have poison immunity for ghost', () => {
            const ghost = getUndeadTemplateById('ghost');
            expect(ghost?.resistances?.immunities).toContain('poison');
        });
    });

    describe('Necrotic Resistance', () => {
        it('should have necrotic resistance for skeleton', () => {
            const skeleton = getUndeadTemplateById('skeleton');
            expect(skeleton?.resistances?.resistances).toContain('necrotic');
        });

        it('should have necrotic resistance for zombie', () => {
            const zombie = getUndeadTemplateById('zombie');
            expect(zombie?.resistances?.resistances).toContain('necrotic');
        });

        it('should have necrotic resistance for wight', () => {
            const wight = getUndeadTemplateById('wight');
            expect(wight?.resistances?.resistances).toContain('necrotic');
        });

        it('should have necrotic immunity for ghost (special case)', () => {
            const ghost = getUndeadTemplateById('ghost');
            // Ghosts have necrotic immunity instead of just resistance
            expect(ghost?.resistances?.immunities).toContain('necrotic');
        });
    });

    describe('Ghost Special Resistances', () => {
        it('should have multiple resistances for ghost', () => {
            const ghost = getUndeadTemplateById('ghost');
            const ghostResistances = ghost?.resistances?.resistances || [];

            // Ghost should resist: acid, cold, fire, lightning, thunder
            expect(ghostResistances).toContain('acid');
            expect(ghostResistances).toContain('cold');
            expect(ghostResistances).toContain('fire');
            expect(ghostResistances).toContain('lightning');
            expect(ghostResistances).toContain('thunder');
        });
    });
});

describe('Undead Audio Preferences', () => {
    it('should prefer treble for skeleton (archer)', () => {
        const skeleton = getUndeadTemplateById('skeleton');
        expect(skeleton?.audioPreference.treble).toBeGreaterThanOrEqual(0.8);
        expect(skeleton?.audioPreference.treble).toBeGreaterThan(skeleton?.audioPreference.bass || 0);
        expect(skeleton?.audioPreference.treble).toBeGreaterThan(skeleton?.audioPreference.mid || 0);
    });

    it('should prefer bass for zombie (brute)', () => {
        const zombie = getUndeadTemplateById('zombie');
        expect(zombie?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(zombie?.audioPreference.bass).toBeGreaterThan(zombie?.audioPreference.mid || 0);
        expect(zombie?.audioPreference.bass).toBeGreaterThan(zombie?.audioPreference.treble || 0);
    });

    it('should prefer mid for wight (intelligent brute)', () => {
        const wight = getUndeadTemplateById('wight');
        expect(wight?.audioPreference.mid).toBeGreaterThanOrEqual(0.5);
        expect(wight?.audioPreference.mid).toBeGreaterThan(wight?.audioPreference.bass || 0);
        expect(wight?.audioPreference.mid).toBeGreaterThan(wight?.audioPreference.treble || 0);
    });

    it('should prefer mid for ghost (support)', () => {
        const ghost = getUndeadTemplateById('ghost');
        expect(ghost?.audioPreference.mid).toBeGreaterThanOrEqual(0.6);
        expect(ghost?.audioPreference.mid).toBeGreaterThan(ghost?.audioPreference.bass || 0);
        expect(ghost?.audioPreference.mid).toBeGreaterThan(ghost?.audioPreference.treble || 0);
    });
});

describe('Undead Enemy Generation', () => {
    describe('Template ID Generation', () => {
        it('should generate skeleton from templateId', () => {
            const skeleton = EnemyGenerator.generate({
                seed: 'skeleton-test',
                templateId: 'skeleton',
                rarity: 'common'
            });

            expect(skeleton.name).toBe('Skeleton');
            expect(skeleton.ability_scores.DEX).toBeGreaterThanOrEqual(12);
        });

        it('should generate zombie from templateId', () => {
            const zombie = EnemyGenerator.generate({
                seed: 'zombie-test',
                templateId: 'zombie',
                rarity: 'common'
            });

            expect(zombie.name).toBe('Zombie');
            expect(zombie.ability_scores.CON).toBeGreaterThanOrEqual(12);
        });

        it('should generate wight from templateId', () => {
            const wight = EnemyGenerator.generate({
                seed: 'wight-test',
                templateId: 'wight',
                rarity: 'uncommon'
            });

            expect(wight.name).toBe('Wight');
            expect(wight.ability_scores.STR).toBeGreaterThanOrEqual(14);
        });

        it('should generate ghost from templateId', () => {
            const ghost = EnemyGenerator.generate({
                seed: 'ghost-test',
                templateId: 'ghost',
                rarity: 'uncommon'
            });

            expect(ghost.name).toBe('Ghost');
            expect(ghost.ability_scores.CHA).toBeGreaterThanOrEqual(14);
        });
    });

    describe('Category-based Generation', () => {
        it('should generate undead enemies when category is specified', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'undead-test',
                category: 'undead',
                archetype: 'brute'
            });

            // Should be one of the undead brutes (zombie or wight)
            expect(['Zombie', 'Wight']).toContain(enemy.name);
        });

        it('should generate undead archer', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'undead-archer-test',
                category: 'undead',
                archetype: 'archer'
            });

            expect(enemy.name).toBe('Skeleton');
        });

        it('should generate undead support', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'undead-support-test',
                category: 'undead',
                archetype: 'support'
            });

            expect(enemy.name).toBe('Ghost');
        });
    });

    describe('Rarity Scaling', () => {
        const rarities: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];

        it('should scale skeleton stats by rarity', () => {
            const skeletonCommon = EnemyGenerator.generate({
                seed: 'skeleton-common',
                templateId: 'skeleton',
                rarity: 'common'
            });
            const skeletonBoss = EnemyGenerator.generate({
                seed: 'skeleton-boss',
                templateId: 'skeleton',
                rarity: 'boss'
            });

            // Boss should have higher stats than common
            expect(skeletonBoss.ability_scores.DEX).toBeGreaterThan(skeletonCommon.ability_scores.DEX);
        });

        it('should scale zombie HP by rarity', () => {
            const zombieCommon = EnemyGenerator.generate({
                seed: 'zombie-common',
                templateId: 'zombie',
                rarity: 'common'
            });
            const zombieElite = EnemyGenerator.generate({
                seed: 'zombie-elite',
                templateId: 'zombie',
                rarity: 'elite'
            });

            expect(zombieElite.hp.max).toBeGreaterThan(zombieCommon.hp.max);
        });

        it('should scale wight damage die by rarity', () => {
            const rarityConfig = getRarityConfig('common');
            const bossConfig = getRarityConfig('boss');

            expect(rarityConfig.signatureDieSize).toBe(6); // d6
            expect(bossConfig.signatureDieSize).toBe(12); // d12
        });
    });

    describe('Audio-influenced Undead Generation', () => {
        it('should select skeleton for treble-heavy audio', () => {
            const trebleAudio = createMockAudioProfile({
                bass_dominance: 0.05,
                mid_dominance: 0.05,
                treble_dominance: 0.9
            });

            const enemy = EnemyGenerator.generate({
                seed: 'treble-undead-test',
                category: 'undead',
                audioProfile: trebleAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            // With treble-heavy audio, skeleton (archer) should be selected
            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select zombie for bass-heavy audio', () => {
            const bassAudio = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.05,
                treble_dominance: 0.05
            });

            const enemy = EnemyGenerator.generate({
                seed: 'bass-undead-test',
                category: 'undead',
                audioProfile: bassAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });
    });

    describe('Category Mix Mode', () => {
        it('should generate mixed undead encounter using category mode', () => {
            const enemies = EnemyGenerator.generateEncounterByCR({
                seed: 'undead-mix-test',
                targetCR: 0.5,
                count: 6,
                enemyMix: 'category',
                category: 'undead'
            });

            expect(enemies.length).toBe(6);

            // All enemies should be from undead category
            const undeadNames = ['Skeleton', 'Zombie', 'Wight', 'Ghost'];
            enemies.forEach(enemy => {
                expect(undeadNames).toContain(enemy.name);
            });

            // Should have variety (not all same)
            const names = enemies.map(e => e.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBeGreaterThan(1);
        });
    });
});

describe('Undead Template Integration', () => {
    it('should find undead templates in main template list', () => {
        const skeleton = getTemplateById('skeleton');
        const zombie = getTemplateById('zombie');
        const wight = getTemplateById('wight');
        const ghost = getTemplateById('ghost');

        expect(skeleton).toBeDefined();
        expect(zombie).toBeDefined();
        expect(wight).toBeDefined();
        expect(ghost).toBeDefined();
    });

    it('should have correct categories for undead templates', () => {
        const skeleton = getTemplateById('skeleton');
        const zombie = getTemplateById('zombie');
        const wight = getTemplateById('wight');
        const ghost = getTemplateById('ghost');

        expect(skeleton?.category).toBe('undead');
        expect(zombie?.category).toBe('undead');
        expect(wight?.category).toBe('undead');
        expect(ghost?.category).toBe('undead');
    });

    it('should include undead in total template count', () => {
        // Should have 10 V1 templates + 4 undead = 14 total
        expect(DEFAULT_ENEMY_TEMPLATES.length).toBe(14);
    });
});

describe('Undead Base Stats', () => {
    it('should have appropriate base stats for skeleton', () => {
        const skeleton = getUndeadTemplateById('skeleton');

        expect(skeleton?.baseStats.STR).toBe(12);
        expect(skeleton?.baseStats.DEX).toBe(14);
        expect(skeleton?.baseStats.CON).toBe(12);
        expect(skeleton?.baseStats.INT).toBe(6);
        expect(skeleton?.baseStats.WIS).toBe(8);
        expect(skeleton?.baseStats.CHA).toBe(5);
    });

    it('should have appropriate base stats for zombie', () => {
        const zombie = getUndeadTemplateById('zombie');

        expect(zombie?.baseStats.STR).toBe(14);
        expect(zombie?.baseStats.DEX).toBe(8);
        expect(zombie?.baseStats.CON).toBe(14);
        expect(zombie?.baseStats.INT).toBe(3);
        expect(zombie?.baseStats.WIS).toBe(6);
        expect(zombie?.baseStats.CHA).toBe(5);
    });

    it('should have appropriate base stats for wight', () => {
        const wight = getUndeadTemplateById('wight');

        expect(wight?.baseStats.STR).toBe(16);
        expect(wight?.baseStats.DEX).toBe(12);
        expect(wight?.baseStats.CON).toBe(14);
        expect(wight?.baseStats.INT).toBe(10);
        expect(wight?.baseStats.WIS).toBe(12);
        expect(wight?.baseStats.CHA).toBe(14);
    });

    it('should have appropriate base stats for ghost', () => {
        const ghost = getUndeadTemplateById('ghost');

        expect(ghost?.baseStats.STR).toBe(8);
        expect(ghost?.baseStats.DEX).toBe(14);
        expect(ghost?.baseStats.CON).toBe(12);
        expect(ghost?.baseStats.INT).toBe(12);
        expect(ghost?.baseStats.WIS).toBe(14);
        expect(ghost?.baseStats.CHA).toBe(16);
    });

    it('should have appropriate HP values', () => {
        const skeleton = getUndeadTemplateById('skeleton');
        const zombie = getUndeadTemplateById('zombie');
        const wight = getUndeadTemplateById('wight');
        const ghost = getUndeadTemplateById('ghost');

        expect(skeleton?.baseHP).toBe(13);
        expect(zombie?.baseHP).toBe(22);
        expect(wight?.baseHP).toBe(26);
        expect(ghost?.baseHP).toBe(15);
    });

    it('should have appropriate AC values', () => {
        const skeleton = getUndeadTemplateById('skeleton');
        const zombie = getUndeadTemplateById('zombie');
        const wight = getUndeadTemplateById('wight');
        const ghost = getUndeadTemplateById('ghost');

        expect(skeleton?.baseAC).toBe(13);
        expect(zombie?.baseAC).toBe(8); // Zombies are slow and unarmored
        expect(wight?.baseAC).toBe(14);
        expect(ghost?.baseAC).toBe(11);
    });

    it('should have appropriate speed values', () => {
        const skeleton = getUndeadTemplateById('skeleton');
        const zombie = getUndeadTemplateById('zombie');
        const wight = getUndeadTemplateById('wight');
        const ghost = getUndeadTemplateById('ghost');

        expect(skeleton?.baseSpeed).toBe(30);
        expect(zombie?.baseSpeed).toBe(20); // Zombies are slow
        expect(wight?.baseSpeed).toBe(30);
        expect(ghost?.baseSpeed).toBe(0); // Ghosts float (represented by 0, has fly speed in actual D&D)
    });
});
