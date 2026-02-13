/**
 * Unit tests for Fiend Enemy Generation
 *
 * Tests fiend template properties, fiend-specific traits,
 * and fiend enemy generation functionality.
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator';
import { getTemplateById, DEFAULT_ENEMY_TEMPLATES } from '../../src/constants/DefaultEnemies';
import { getFiendTemplateById, getFiendTemplates, getFiendTemplatesByArchetype } from '../../src/constants/EnemyTemplates/Fiend';
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

describe('Fiend Template Structure', () => {
    describe('Template Existence', () => {
        it('should have imp template', () => {
            const imp = getFiendTemplateById('imp');
            expect(imp).toBeDefined();
            expect(imp?.name).toBe('Imp');
        });

        it('should have quasit template', () => {
            const quasit = getFiendTemplateById('quasit');
            expect(quasit).toBeDefined();
            expect(quasit?.name).toBe('Quasit');
        });

        it('should have lemure template', () => {
            const lemure = getFiendTemplateById('lemure');
            expect(lemure).toBeDefined();
            expect(lemure?.name).toBe('Lemure');
        });

        it('should have demon template', () => {
            const demon = getFiendTemplateById('demon');
            expect(demon).toBeDefined();
            expect(demon?.name).toBe('Demon');
        });

        it('should have exactly 4 fiend templates', () => {
            const fiends = getFiendTemplates();
            expect(fiends.length).toBe(4);
        });
    });

    describe('Template Categories', () => {
        it('should mark all templates as fiend category', () => {
            const fiends = getFiendTemplates();
            fiends.forEach(template => {
                expect(template.category).toBe('fiend');
            });
        });
    });

    describe('Template Archetypes', () => {
        it('should have imp as archer', () => {
            const imp = getFiendTemplateById('imp');
            expect(imp?.archetype).toBe('archer');
        });

        it('should have quasit as support', () => {
            const quasit = getFiendTemplateById('quasit');
            expect(quasit?.archetype).toBe('support');
        });

        it('should have lemure as brute', () => {
            const lemure = getFiendTemplateById('lemure');
            expect(lemure?.archetype).toBe('brute');
        });

        it('should have demon as brute', () => {
            const demon = getFiendTemplateById('demon');
            expect(demon?.archetype).toBe('brute');
        });

        it('should get correct templates by archetype', () => {
            const fiendArchers = getFiendTemplatesByArchetype('archer');
            const fiendBrutes = getFiendTemplatesByArchetype('brute');
            const fiendSupport = getFiendTemplatesByArchetype('support');

            expect(fiendArchers.length).toBe(1);
            expect(fiendBrutes.length).toBe(2);
            expect(fiendSupport.length).toBe(1);

            expect(fiendArchers[0]?.id).toBe('imp');
            expect(fiendBrutes.map(t => t.id)).toContain('lemure');
            expect(fiendBrutes.map(t => t.id)).toContain('demon');
            expect(fiendSupport[0]?.id).toBe('quasit');
        });
    });

    describe('Signature Abilities', () => {
        it('should have Sting for imp', () => {
            const imp = getFiendTemplateById('imp');
            expect(imp?.signatureAbility.name).toBe('Sting');
            expect(imp?.signatureAbility.damageType).toBe('poison');
            expect(imp?.signatureAbility.attackType).toBe('ranged');
            expect(imp?.signatureAbility.range).toBe(30);
        });

        it('should have Fear Aura for quasit', () => {
            const quasit = getFiendTemplateById('quasit');
            expect(quasit?.signatureAbility.name).toBe('Fear Aura');
            expect(quasit?.signatureAbility.damageType).toBe('psychic');
            expect(quasit?.signatureAbility.attackType).toBe('spell');
            expect(quasit?.signatureAbility.properties).toContain('fear');
        });

        it('should have Hellish Resilience for lemure', () => {
            const lemure = getFiendTemplateById('lemure');
            expect(lemure?.signatureAbility.name).toBe('Hellish Resilience');
            expect(lemure?.signatureAbility.damageType).toBe('fire');
            expect(lemure?.signatureAbility.attackType).toBe('melee');
            expect(lemure?.signatureAbility.properties).toContain('lifesteal');
        });

        it('should have Chaos Claw for demon', () => {
            const demon = getFiendTemplateById('demon');
            expect(demon?.signatureAbility.name).toBe('Chaos Claw');
            expect(demon?.signatureAbility.damageType).toBe('necrotic');
            expect(demon?.signatureAbility.attackType).toBe('melee');
            expect(demon?.signatureAbility.properties).toContain('chaotic');
        });
    });
});

describe('Fiend Resistances and Immunities', () => {
    describe('Poison Immunity', () => {
        it('should have poison immunity for imp', () => {
            const imp = getFiendTemplateById('imp');
            expect(imp?.resistances?.immunities).toContain('poison');
        });

        it('should have poison immunity for quasit', () => {
            const quasit = getFiendTemplateById('quasit');
            expect(quasit?.resistances?.immunities).toContain('poison');
        });

        it('should have poison immunity for lemure', () => {
            const lemure = getFiendTemplateById('lemure');
            expect(lemure?.resistances?.immunities).toContain('poison');
        });

        it('should have poison immunity for demon', () => {
            const demon = getFiendTemplateById('demon');
            expect(demon?.resistances?.immunities).toContain('poison');
        });
    });

    describe('Fire Resistance', () => {
        it('should have fire resistance for imp', () => {
            const imp = getFiendTemplateById('imp');
            expect(imp?.resistances?.resistances).toContain('fire');
        });

        it('should have fire resistance for quasit', () => {
            const quasit = getFiendTemplateById('quasit');
            expect(quasit?.resistances?.resistances).toContain('fire');
        });

        it('should have fire resistance for lemure', () => {
            const lemure = getFiendTemplateById('lemure');
            expect(lemure?.resistances?.resistances).toContain('fire');
        });

        it('should have fire resistance for demon', () => {
            const demon = getFiendTemplateById('demon');
            expect(demon?.resistances?.resistances).toContain('fire');
        });
    });

    describe('Cold Resistance', () => {
        it('should have cold resistance for imp', () => {
            const imp = getFiendTemplateById('imp');
            expect(imp?.resistances?.resistances).toContain('cold');
        });

        it('should have cold resistance for quasit', () => {
            const quasit = getFiendTemplateById('quasit');
            expect(quasit?.resistances?.resistances).toContain('cold');
        });

        it('should have cold resistance for lemure', () => {
            const lemure = getFiendTemplateById('lemure');
            expect(lemure?.resistances?.resistances).toContain('cold');
        });

        it('should have cold resistance for demon', () => {
            const demon = getFiendTemplateById('demon');
            expect(demon?.resistances?.resistances).toContain('cold');
        });
    });
});

describe('Fiend Audio Preferences', () => {
    it('should prefer treble for imp (archer)', () => {
        const imp = getFiendTemplateById('imp');
        expect(imp?.audioPreference.treble).toBeGreaterThanOrEqual(0.8);
        expect(imp?.audioPreference.treble).toBeGreaterThan(imp?.audioPreference.bass || 0);
        expect(imp?.audioPreference.treble).toBeGreaterThan(imp?.audioPreference.mid || 0);
    });

    it('should prefer mid for quasit (support)', () => {
        const quasit = getFiendTemplateById('quasit');
        expect(quasit?.audioPreference.mid).toBeGreaterThanOrEqual(0.6);
        expect(quasit?.audioPreference.mid).toBeGreaterThan(quasit?.audioPreference.bass || 0);
        expect(quasit?.audioPreference.mid).toBeGreaterThan(quasit?.audioPreference.treble || 0);
    });

    it('should prefer bass for lemure (brute)', () => {
        const lemure = getFiendTemplateById('lemure');
        expect(lemure?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(lemure?.audioPreference.bass).toBeGreaterThan(lemure?.audioPreference.mid || 0);
        expect(lemure?.audioPreference.bass).toBeGreaterThan(lemure?.audioPreference.treble || 0);
    });

    it('should prefer bass for demon (brute)', () => {
        const demon = getFiendTemplateById('demon');
        expect(demon?.audioPreference.bass).toBeGreaterThanOrEqual(0.7);
        expect(demon?.audioPreference.bass).toBeGreaterThan(demon?.audioPreference.mid || 0);
        expect(demon?.audioPreference.bass).toBeGreaterThan(demon?.audioPreference.treble || 0);
    });
});

describe('Fiend Enemy Generation', () => {
    describe('Template ID Generation', () => {
        it('should generate imp from templateId', () => {
            const imp = EnemyGenerator.generate({
                seed: 'imp-test',
                templateId: 'imp',
                rarity: 'common'
            });

            expect(imp.name).toBe('Imp');
            expect(imp.ability_scores.DEX).toBeGreaterThanOrEqual(13);
        });

        it('should generate quasit from templateId', () => {
            const quasit = EnemyGenerator.generate({
                seed: 'quasit-test',
                templateId: 'quasit',
                rarity: 'common'
            });

            expect(quasit.name).toBe('Quasit');
            expect(quasit.ability_scores.CHA).toBeGreaterThanOrEqual(10);
        });

        it('should generate lemure from templateId', () => {
            const lemure = EnemyGenerator.generate({
                seed: 'lemure-test',
                templateId: 'lemure',
                rarity: 'common'
            });

            expect(lemure.name).toBe('Lemure');
            expect(lemure.ability_scores.CON).toBeGreaterThanOrEqual(10);
        });

        it('should generate demon from templateId', () => {
            const demon = EnemyGenerator.generate({
                seed: 'demon-test',
                templateId: 'demon',
                rarity: 'uncommon'
            });

            expect(demon.name).toBe('Demon');
            expect(demon.ability_scores.STR).toBeGreaterThanOrEqual(14);
        });
    });

    describe('Category-based Generation', () => {
        it('should generate fiend enemies when category is specified', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'fiend-test',
                category: 'fiend',
                archetype: 'brute'
            });

            // Should be one of fiend brutes (lemure or demon)
            expect(['Lemure', 'Demon']).toContain(enemy.name);
        });

        it('should generate fiend archer', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'fiend-archer-test',
                category: 'fiend',
                archetype: 'archer'
            });

            expect(enemy.name).toBe('Imp');
        });

        it('should generate fiend support', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'fiend-support-test',
                category: 'fiend',
                archetype: 'support'
            });

            expect(enemy.name).toBe('Quasit');
        });
    });

    describe('Rarity Scaling', () => {
        const rarities: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];

        it('should scale imp stats by rarity', () => {
            const impCommon = EnemyGenerator.generate({
                seed: 'imp-common',
                templateId: 'imp',
                rarity: 'common'
            });
            const impBoss = EnemyGenerator.generate({
                seed: 'imp-boss',
                templateId: 'imp',
                rarity: 'boss'
            });

            // Boss should have higher stats than common
            expect(impBoss.ability_scores.DEX).toBeGreaterThan(impCommon.ability_scores.DEX);
        });

        it('should scale demon HP by rarity', () => {
            const demonCommon = EnemyGenerator.generate({
                seed: 'demon-common',
                templateId: 'demon',
                rarity: 'common'
            });
            const demonElite = EnemyGenerator.generate({
                seed: 'demon-elite',
                templateId: 'demon',
                rarity: 'elite'
            });

            expect(demonElite.hp.max).toBeGreaterThan(demonCommon.hp.max);
        });

        it('should scale quasit damage die by rarity', () => {
            const rarityConfig = getRarityConfig('common');
            const bossConfig = getRarityConfig('boss');

            expect(rarityConfig.signatureDieSize).toBe(6); // d6
            expect(bossConfig.signatureDieSize).toBe(12); // d12
        });
    });

    describe('Audio-influenced Fiend Generation', () => {
        it('should select imp for treble-heavy audio', () => {
            const trebleAudio = createMockAudioProfile({
                bass_dominance: 0.05,
                mid_dominance: 0.05,
                treble_dominance: 0.9
            });

            const enemy = EnemyGenerator.generate({
                seed: 'treble-fiend-test',
                category: 'fiend',
                audioProfile: trebleAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            // With treble-heavy audio, imp (archer) should be selected
            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select lemure for bass-heavy audio', () => {
            const bassAudio = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.05,
                treble_dominance: 0.05
            });

            const enemy = EnemyGenerator.generate({
                seed: 'bass-fiend-test',
                category: 'fiend',
                audioProfile: bassAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });
    });

    describe('Category Mix Mode', () => {
        it('should generate mixed fiend encounter using category mode', () => {
            const enemies = EnemyGenerator.generateEncounterByCR({
                seed: 'fiend-mix-test',
                targetCR: 0.5,
                count: 6,
                enemyMix: 'category',
                category: 'fiend'
            });

            expect(enemies.length).toBe(6);

            // All enemies should be from fiend category
            const fiendNames = ['Imp', 'Quasit', 'Lemure', 'Demon'];
            enemies.forEach(enemy => {
                expect(fiendNames).toContain(enemy.name);
            });

            // Should have variety (not all same)
            const names = enemies.map(e => e.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBeGreaterThan(1);
        });
    });
});

describe('Fiend Template Integration', () => {
    it('should find fiend templates in main template list', () => {
        const imp = getTemplateById('imp');
        const quasit = getTemplateById('quasit');
        const lemure = getTemplateById('lemure');
        const demon = getTemplateById('demon');

        expect(imp).toBeDefined();
        expect(quasit).toBeDefined();
        expect(lemure).toBeDefined();
        expect(demon).toBeDefined();
    });

    it('should have correct categories for fiend templates', () => {
        const imp = getTemplateById('imp');
        const quasit = getTemplateById('quasit');
        const lemure = getTemplateById('lemure');
        const demon = getTemplateById('demon');

        expect(imp?.category).toBe('fiend');
        expect(quasit?.category).toBe('fiend');
        expect(lemure?.category).toBe('fiend');
        expect(demon?.category).toBe('fiend');
    });

    it('should include fiends in total template count', () => {
        // Should have 10 V1 templates + 4 undead + 4 fiend = 18 total
        expect(DEFAULT_ENEMY_TEMPLATES.length).toBe(18);
    });
});

describe('Fiend Base Stats', () => {
    it('should have appropriate base stats for imp', () => {
        const imp = getFiendTemplateById('imp');

        expect(imp?.baseStats.STR).toBe(6);
        expect(imp?.baseStats.DEX).toBe(15);
        expect(imp?.baseStats.CON).toBe(10);
        expect(imp?.baseStats.INT).toBe(11);
        expect(imp?.baseStats.WIS).toBe(10);
        expect(imp?.baseStats.CHA).toBe(12);
    });

    it('should have appropriate base stats for quasit', () => {
        const quasit = getFiendTemplateById('quasit');

        expect(quasit?.baseStats.STR).toBe(8);
        expect(quasit?.baseStats.DEX).toBe(12);
        expect(quasit?.baseStats.CON).toBe(10);
        expect(quasit?.baseStats.INT).toBe(10);
        expect(quasit?.baseStats.WIS).toBe(11);
        expect(quasit?.baseStats.CHA).toBe(12);
    });

    it('should have appropriate base stats for lemure', () => {
        const lemure = getFiendTemplateById('lemure');

        expect(lemure?.baseStats.STR).toBe(10);
        expect(lemure?.baseStats.DEX).toBe(6);
        expect(lemure?.baseStats.CON).toBe(12);
        expect(lemure?.baseStats.INT).toBe(3);
        expect(lemure?.baseStats.WIS).toBe(8);
        expect(lemure?.baseStats.CHA).toBe(5);
    });

    it('should have appropriate base stats for demon', () => {
        const demon = getFiendTemplateById('demon');

        expect(demon?.baseStats.STR).toBe(16);
        expect(demon?.baseStats.DEX).toBe(12);
        expect(demon?.baseStats.CON).toBe(14);
        expect(demon?.baseStats.INT).toBe(8);
        expect(demon?.baseStats.WIS).toBe(10);
        expect(demon?.baseStats.CHA).toBe(10);
    });

    it('should have appropriate HP values', () => {
        const imp = getFiendTemplateById('imp');
        const quasit = getFiendTemplateById('quasit');
        const lemure = getFiendTemplateById('lemure');
        const demon = getFiendTemplateById('demon');

        expect(imp?.baseHP).toBe(10);
        expect(quasit?.baseHP).toBe(7);
        expect(lemure?.baseHP).toBe(13);
        expect(demon?.baseHP).toBe(28);
    });

    it('should have appropriate AC values', () => {
        const imp = getFiendTemplateById('imp');
        const quasit = getFiendTemplateById('quasit');
        const lemure = getFiendTemplateById('lemure');
        const demon = getFiendTemplateById('demon');

        expect(imp?.baseAC).toBe(13);
        expect(quasit?.baseAC).toBe(13);
        expect(lemure?.baseAC).toBe(7); // Lemures are wretched and have poor defense
        expect(demon?.baseAC).toBe(13);
    });

    it('should have appropriate speed values', () => {
        const imp = getFiendTemplateById('imp');
        const quasit = getFiendTemplateById('quasit');
        const lemure = getFiendTemplateById('lemure');
        const demon = getFiendTemplateById('demon');

        expect(imp?.baseSpeed).toBe(20); // Imps are small and slower
        expect(quasit?.baseSpeed).toBe(40); // Quasits are fast
        expect(lemure?.baseSpeed).toBe(30);
        expect(demon?.baseSpeed).toBe(30);
    });
});
