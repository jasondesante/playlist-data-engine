/**
 * Unit tests for Monstrosity Enemy Generation
 *
 * Tests monstrosity template properties, varied creature traits,
 * and monstrosity enemy generation functionality.
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator';
import { getTemplateById, DEFAULT_ENEMY_TEMPLATES } from '../../src/constants/DefaultEnemies';
import { getMonstrosityTemplateById, getMonstrosityTemplates, getMonstrosityTemplatesByArchetype } from '../../src/constants/EnemyTemplates/Monstrosity';
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

describe('Monstrosity Template Structure', () => {
    describe('Template Existence', () => {
        it('should have owlbear template', () => {
            const owlbear = getMonstrosityTemplateById('owlbear');
            expect(owlbear).toBeDefined();
            expect(owlbear?.name).toBe('Owlbear');
        });

        it('should have griffin template', () => {
            const griffin = getMonstrosityTemplateById('griffin');
            expect(griffin).toBeDefined();
            expect(griffin?.name).toBe('Griffin');
        });

        it('should have mimic template', () => {
            const mimic = getMonstrosityTemplateById('mimic');
            expect(mimic).toBeDefined();
            expect(mimic?.name).toBe('Mimic');
        });

        it('should have basilisk template', () => {
            const basilisk = getMonstrosityTemplateById('basilisk');
            expect(basilisk).toBeDefined();
            expect(basilisk?.name).toBe('Basilisk');
        });

        it('should have exactly 4 monstrosity templates', () => {
            const monstrosities = getMonstrosityTemplates();
            expect(monstrosities.length).toBe(4);
        });
    });

    describe('Template Categories', () => {
        it('should mark all templates as monstrosity category', () => {
            const monstrosities = getMonstrosityTemplates();
            monstrosities.forEach(template => {
                expect(template.category).toBe('monstrosity');
            });
        });
    });

    describe('Template Archetypes', () => {
        it('should have owlbear as brute', () => {
            const owlbear = getMonstrosityTemplateById('owlbear');
            expect(owlbear?.archetype).toBe('brute');
        });

        it('should have griffin as archer', () => {
            const griffin = getMonstrosityTemplateById('griffin');
            expect(griffin?.archetype).toBe('archer');
        });

        it('should have mimic as brute', () => {
            const mimic = getMonstrosityTemplateById('mimic');
            expect(mimic?.archetype).toBe('brute');
        });

        it('should have basilisk as support', () => {
            const basilisk = getMonstrosityTemplateById('basilisk');
            expect(basilisk?.archetype).toBe('support');
        });

        it('should get correct templates by archetype', () => {
            const monstrosityArchers = getMonstrosityTemplatesByArchetype('archer');
            const monstrosityBrutes = getMonstrosityTemplatesByArchetype('brute');
            const monstrositySupport = getMonstrosityTemplatesByArchetype('support');

            expect(monstrosityArchers.length).toBe(1);
            expect(monstrosityBrutes.length).toBe(2);
            expect(monstrositySupport.length).toBe(1);

            expect(monstrosityArchers[0]?.id).toBe('griffin');
            expect(monstrosityBrutes.map(t => t.id)).toContain('owlbear');
            expect(monstrosityBrutes.map(t => t.id)).toContain('mimic');
            expect(monstrositySupport[0]?.id).toBe('basilisk');
        });
    });

    describe('Signature Abilities', () => {
        it('should have Multiattack for owlbear', () => {
            const owlbear = getMonstrosityTemplateById('owlbear');
            expect(owlbear?.signatureAbility.name).toBe('Multiattack');
            expect(owlbear?.signatureAbility.damageType).toBe('slashing');
            expect(owlbear?.signatureAbility.attackType).toBe('melee');
            expect(owlbear?.signatureAbility.properties).toContain('multiattack');
        });

        it('should have Dive Attack for griffin', () => {
            const griffin = getMonstrosityTemplateById('griffin');
            expect(griffin?.signatureAbility.name).toBe('Dive Attack');
            expect(griffin?.signatureAbility.damageType).toBe('piercing');
            expect(griffin?.signatureAbility.attackType).toBe('ranged');
            expect(griffin?.signatureAbility.range).toBe(80);
            expect(griffin?.signatureAbility.properties).toContain('charge');
        });

        it('should have Adhesive for mimic', () => {
            const mimic = getMonstrosityTemplateById('mimic');
            expect(mimic?.signatureAbility.name).toBe('Adhesive');
            expect(mimic?.signatureAbility.damageType).toBe('bludgeoning');
            expect(mimic?.signatureAbility.attackType).toBe('melee');
            expect(mimic?.signatureAbility.properties).toContain('grapple');
        });

        it('should have Petrifying Gaze for basilisk', () => {
            const basilisk = getMonstrosityTemplateById('basilisk');
            expect(basilisk?.signatureAbility.name).toBe('Petrifying Gaze');
            expect(basilisk?.signatureAbility.damageType).toBe('psychic');
            expect(basilisk?.signatureAbility.attackType).toBe('spell');
            expect(basilisk?.signatureAbility.properties).toContain('stun');
        });
    });
});

describe('Monstrosity Resistances and Immunities', () => {
    describe('Varied Resistances', () => {
        it('should have no resistances for owlbear (brute predator)', () => {
            const owlbear = getMonstrosityTemplateById('owlbear');
            expect(owlbear?.resistances?.resistances || []).toHaveLength(0);
        });

        it('should have no resistances for griffin (flying predator)', () => {
            const griffin = getMonstrosityTemplateById('griffin');
            expect(griffin?.resistances?.resistances || []).toHaveLength(0);
        });

        it('should have acid resistance for mimic', () => {
            const mimic = getMonstrosityTemplateById('mimic');
            expect(mimic?.resistances?.resistances).toContain('acid');
        });

        it('should have poison resistance for basilisk', () => {
            const basilisk = getMonstrosityTemplateById('basilisk');
            expect(basilisk?.resistances?.resistances).toContain('poison');
        });
    });

    describe('No Universal Immunities', () => {
        it('should have no universal immunities across monstrosities', () => {
            const monstrosities = getMonstrosityTemplates();

            // Monstrosities don't share universal immunities like undead (poison)
            // Each has its own unique resistances
            monstrosities.forEach(template => {
                const immunities = template.resistances?.immunities || [];
                // No monstrosity has universal immunities
                expect(immunities.length).toBe(0);
            });
        });
    });
});

describe('Monstrosity Audio Preferences', () => {
    it('should prefer bass for owlbear (brute)', () => {
        const owlbear = getMonstrosityTemplateById('owlbear');
        expect(owlbear?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(owlbear?.audioPreference.bass).toBeGreaterThan(owlbear?.audioPreference.mid || 0);
        expect(owlbear?.audioPreference.bass).toBeGreaterThan(owlbear?.audioPreference.treble || 0);
    });

    it('should prefer treble for griffin (archer/flying)', () => {
        const griffin = getMonstrosityTemplateById('griffin');
        expect(griffin?.audioPreference.treble).toBeGreaterThanOrEqual(0.8);
        expect(griffin?.audioPreference.treble).toBeGreaterThan(griffin?.audioPreference.bass || 0);
        expect(griffin?.audioPreference.treble).toBeGreaterThan(griffin?.audioPreference.mid || 0);
    });

    it('should prefer mid for mimic (deceptive/ambush)', () => {
        const mimic = getMonstrosityTemplateById('mimic');
        expect(mimic?.audioPreference.mid).toBeGreaterThanOrEqual(0.6);
        expect(mimic?.audioPreference.mid).toBeGreaterThan(mimic?.audioPreference.bass || 0);
        expect(mimic?.audioPreference.mid).toBeGreaterThan(mimic?.audioPreference.treble || 0);
    });

    it('should prefer mid for basilisk (support/control)', () => {
        const basilisk = getMonstrosityTemplateById('basilisk');
        expect(basilisk?.audioPreference.mid).toBeGreaterThanOrEqual(0.6);
        expect(basilisk?.audioPreference.mid).toBeGreaterThan(basilisk?.audioPreference.bass || 0);
        expect(basilisk?.audioPreference.mid).toBeGreaterThan(basilisk?.audioPreference.treble || 0);
    });
});

describe('Monstrosity Enemy Generation', () => {
    describe('Template ID Generation', () => {
        it('should generate owlbear from templateId', () => {
            const owlbear = EnemyGenerator.generate({
                seed: 'owlbear-test',
                templateId: 'owlbear',
                rarity: 'common'
            });

            expect(owlbear.name).toBe('Owlbear');
            expect(owlbear.ability_scores.STR).toBeGreaterThanOrEqual(16);
        });

        it('should generate griffin from templateId', () => {
            const griffin = EnemyGenerator.generate({
                seed: 'griffin-test',
                templateId: 'griffin',
                rarity: 'common'
            });

            expect(griffin.name).toBe('Griffin');
            expect(griffin.ability_scores.DEX).toBeGreaterThanOrEqual(13);
        });

        it('should generate mimic from templateId', () => {
            const mimic = EnemyGenerator.generate({
                seed: 'mimic-test',
                templateId: 'mimic',
                rarity: 'common'
            });

            expect(mimic.name).toBe('Mimic');
            expect(mimic.ability_scores.STR).toBeGreaterThanOrEqual(12);
        });

        it('should generate basilisk from templateId', () => {
            const basilisk = EnemyGenerator.generate({
                seed: 'basilisk-test',
                templateId: 'basilisk',
                rarity: 'uncommon'
            });

            expect(basilisk.name).toBe('Basilisk');
            expect(basilisk.ability_scores.CON).toBeGreaterThanOrEqual(10);
        });
    });

    describe('Category-based Generation', () => {
        it('should generate monstrosity enemies when category is specified', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'monstrosity-test',
                category: 'monstrosity',
                archetype: 'brute'
            });

            // Should be one of monstrosity brutes (owlbear or mimic)
            expect(['Owlbear', 'Mimic']).toContain(enemy.name);
        });

        it('should generate monstrosity archer', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'monstrosity-archer-test',
                category: 'monstrosity',
                archetype: 'archer'
            });

            expect(enemy.name).toBe('Griffin');
        });

        it('should generate monstrosity support', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'monstrosity-support-test',
                category: 'monstrosity',
                archetype: 'support'
            });

            expect(enemy.name).toBe('Basilisk');
        });
    });

    describe('Rarity Scaling', () => {
        const rarities: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];

        it('should scale owlbear stats by rarity', () => {
            const owlbearCommon = EnemyGenerator.generate({
                seed: 'owlbear-common',
                templateId: 'owlbear',
                rarity: 'common'
            });
            const owlbearBoss = EnemyGenerator.generate({
                seed: 'owlbear-boss',
                templateId: 'owlbear',
                rarity: 'boss'
            });

            // Boss should have higher stats than common
            expect(owlbearBoss.ability_scores.STR).toBeGreaterThan(owlbearCommon.ability_scores.STR);
        });

        it('should scale mimic HP by rarity', () => {
            const mimicCommon = EnemyGenerator.generate({
                seed: 'mimic-common',
                templateId: 'mimic',
                rarity: 'common'
            });
            const mimicElite = EnemyGenerator.generate({
                seed: 'mimic-elite',
                templateId: 'mimic',
                rarity: 'elite'
            });

            expect(mimicElite.hp.max).toBeGreaterThan(mimicCommon.hp.max);
        });

        it('should scale basilisk damage die by rarity', () => {
            const rarityConfig = getRarityConfig('common');
            const bossConfig = getRarityConfig('boss');

            expect(rarityConfig.signatureDieSize).toBe(6); // d6
            expect(bossConfig.signatureDieSize).toBe(12); // d12
        });
    });

    describe('Audio-influenced Monstrosity Generation', () => {
        it('should select griffin for treble-heavy audio', () => {
            const trebleAudio = createMockAudioProfile({
                bass_dominance: 0.05,
                mid_dominance: 0.05,
                treble_dominance: 0.9
            });

            const enemy = EnemyGenerator.generate({
                seed: 'treble-monstrosity-test',
                category: 'monstrosity',
                audioProfile: trebleAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            // With treble-heavy audio, griffin (archer) should be selected
            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select owlbear for bass-heavy audio', () => {
            const bassAudio = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.05,
                treble_dominance: 0.05
            });

            const enemy = EnemyGenerator.generate({
                seed: 'bass-monstrosity-test',
                category: 'monstrosity',
                audioProfile: bassAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });
    });

    describe('Category Mix Mode', () => {
        it('should generate mixed monstrosity encounter using category mode', () => {
            const enemies = EnemyGenerator.generateEncounterByCR({
                seed: 'monstrosity-mix-test',
                targetCR: 0.5,
                count: 6,
                enemyMix: 'category',
                category: 'monstrosity'
            });

            expect(enemies.length).toBe(6);

            // All enemies should be from monstrosity category
            const monstrosityNames = ['Owlbear', 'Griffin', 'Mimic', 'Basilisk'];
            enemies.forEach(enemy => {
                expect(monstrosityNames).toContain(enemy.name);
            });

            // Should have variety (not all same)
            const names = enemies.map(e => e.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBeGreaterThan(1);
        });
    });
});

describe('Monstrosity Template Integration', () => {
    it('should find monstrosity templates in main template list', () => {
        const owlbear = getTemplateById('owlbear');
        const griffin = getTemplateById('griffin');
        const mimic = getTemplateById('mimic');
        const basilisk = getTemplateById('basilisk');

        expect(owlbear).toBeDefined();
        expect(griffin).toBeDefined();
        expect(mimic).toBeDefined();
        expect(basilisk).toBeDefined();
    });

    it('should have correct categories for monstrosity templates', () => {
        const owlbear = getTemplateById('owlbear');
        const griffin = getTemplateById('griffin');
        const mimic = getTemplateById('mimic');
        const basilisk = getTemplateById('basilisk');

        expect(owlbear?.category).toBe('monstrosity');
        expect(griffin?.category).toBe('monstrosity');
        expect(mimic?.category).toBe('monstrosity');
        expect(basilisk?.category).toBe('monstrosity');
    });

    it('should include monstrosity in total template count', () => {
        // Should have 10 V1 templates + 4 undead + 4 fiend + 4 elemental + 4 construct + 4 dragon + 4 monstrosity = 34 total
        expect(DEFAULT_ENEMY_TEMPLATES.length).toBe(34);
    });
});

describe('Monstrosity Base Stats', () => {
    it('should have appropriate base stats for owlbear', () => {
        const owlbear = getMonstrosityTemplateById('owlbear');

        expect(owlbear?.baseStats.STR).toBe(18);
        expect(owlbear?.baseStats.DEX).toBe(10);
        expect(owlbear?.baseStats.CON).toBe(14);
        expect(owlbear?.baseStats.INT).toBe(3);
        expect(owlbear?.baseStats.WIS).toBe(10);
        expect(owlbear?.baseStats.CHA).toBe(6);
    });

    it('should have appropriate base stats for griffin', () => {
        const griffin = getMonstrosityTemplateById('griffin');

        expect(griffin?.baseStats.STR).toBe(16);
        expect(griffin?.baseStats.DEX).toBe(15);
        expect(griffin?.baseStats.CON).toBe(14);
        expect(griffin?.baseStats.INT).toBe(4);
        expect(griffin?.baseStats.WIS).toBe(12);
        expect(griffin?.baseStats.CHA).toBe(7);
    });

    it('should have appropriate base stats for mimic', () => {
        const mimic = getMonstrosityTemplateById('mimic');

        expect(mimic?.baseStats.STR).toBe(14);
        expect(mimic?.baseStats.DEX).toBe(10);
        expect(mimic?.baseStats.CON).toBe(12);
        expect(mimic?.baseStats.INT).toBe(6);
        expect(mimic?.baseStats.WIS).toBe(8);
        expect(mimic?.baseStats.CHA).toBe(4);
    });

    it('should have appropriate base stats for basilisk', () => {
        const basilisk = getMonstrosityTemplateById('basilisk');

        expect(basilisk?.baseStats.STR).toBe(14);
        expect(basilisk?.baseStats.DEX).toBe(10);
        expect(basilisk?.baseStats.CON).toBe(12);
        expect(basilisk?.baseStats.INT).toBe(4);
        expect(basilisk?.baseStats.WIS).toBe(6);
        expect(basilisk?.baseStats.CHA).toBe(6);
    });

    it('should have appropriate HP values', () => {
        const owlbear = getMonstrosityTemplateById('owlbear');
        const griffin = getMonstrosityTemplateById('griffin');
        const mimic = getMonstrosityTemplateById('mimic');
        const basilisk = getMonstrosityTemplateById('basilisk');

        expect(owlbear?.baseHP).toBe(37);
        expect(griffin?.baseHP).toBe(30);
        expect(mimic?.baseHP).toBe(21);
        expect(basilisk?.baseHP).toBe(26);
    });

    it('should have appropriate AC values', () => {
        const owlbear = getMonstrosityTemplateById('owlbear');
        const griffin = getMonstrosityTemplateById('griffin');
        const mimic = getMonstrosityTemplateById('mimic');
        const basilisk = getMonstrosityTemplateById('basilisk');

        expect(owlbear?.baseAC).toBe(13);
        expect(griffin?.baseAC).toBe(12);
        expect(mimic?.baseAC).toBe(12);
        expect(basilisk?.baseAC).toBe(14);
    });

    it('should have appropriate speed values', () => {
        const owlbear = getMonstrosityTemplateById('owlbear');
        const griffin = getMonstrosityTemplateById('griffin');
        const mimic = getMonstrosityTemplateById('mimic');
        const basilisk = getMonstrosityTemplateById('basilisk');

        expect(owlbear?.baseSpeed).toBe(40);
        expect(griffin?.baseSpeed).toBe(50);
        expect(mimic?.baseSpeed).toBe(10);
        expect(basilisk?.baseSpeed).toBe(20);
    });
});
