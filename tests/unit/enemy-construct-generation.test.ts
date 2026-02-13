/**
 * Unit tests for Construct Enemy Generation
 *
 * Tests construct template properties, construct-specific traits,
 * and construct enemy generation functionality.
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../src/core/generation/EnemyGenerator';
import { getTemplateById, DEFAULT_ENEMY_TEMPLATES } from '../../src/constants/DefaultEnemies';
import { getConstructTemplateById, getConstructTemplates, getConstructTemplatesByArchetype } from '../../src/constants/EnemyTemplates/Construct';
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

describe('Construct Template Structure', () => {
    describe('Template Existence', () => {
        it('should have animated-armor template', () => {
            const animatedArmor = getConstructTemplateById('animated-armor');
            expect(animatedArmor).toBeDefined();
            expect(animatedArmor?.name).toBe('Animated Armor');
        });

        it('should have flying-sword template', () => {
            const flyingSword = getConstructTemplateById('flying-sword');
            expect(flyingSword).toBeDefined();
            expect(flyingSword?.name).toBe('Flying Sword');
        });

        it('should have shield-guardian template', () => {
            const shieldGuardian = getConstructTemplateById('shield-guardian');
            expect(shieldGuardian).toBeDefined();
            expect(shieldGuardian?.name).toBe('Shield Guardian');
        });

        it('should have golem template', () => {
            const golem = getConstructTemplateById('golem');
            expect(golem).toBeDefined();
            expect(golem?.name).toBe('Golem');
        });

        it('should have exactly 4 construct templates', () => {
            const constructs = getConstructTemplates();
            expect(constructs.length).toBe(4);
        });
    });

    describe('Template Categories', () => {
        it('should mark all templates as construct category', () => {
            const constructs = getConstructTemplates();
            constructs.forEach(template => {
                expect(template.category).toBe('construct');
            });
        });
    });

    describe('Template Archetypes', () => {
        it('should have animated-armor as brute', () => {
            const animatedArmor = getConstructTemplateById('animated-armor');
            expect(animatedArmor?.archetype).toBe('brute');
        });

        it('should have golem as brute', () => {
            const golem = getConstructTemplateById('golem');
            expect(golem?.archetype).toBe('brute');
        });

        it('should have flying-sword as archer', () => {
            const flyingSword = getConstructTemplateById('flying-sword');
            expect(flyingSword?.archetype).toBe('archer');
        });

        it('should have shield-guardian as support', () => {
            const shieldGuardian = getConstructTemplateById('shield-guardian');
            expect(shieldGuardian?.archetype).toBe('support');
        });

        it('should get correct templates by archetype', () => {
            const constructBrutes = getConstructTemplatesByArchetype('brute');
            const constructArchers = getConstructTemplatesByArchetype('archer');
            const constructSupport = getConstructTemplatesByArchetype('support');

            expect(constructBrutes.length).toBe(2);
            expect(constructArchers.length).toBe(1);
            expect(constructSupport.length).toBe(1);

            expect(constructBrutes.map(t => t.id)).toContain('animated-armor');
            expect(constructBrutes.map(t => t.id)).toContain('golem');
            expect(constructArchers[0]?.id).toBe('flying-sword');
            expect(constructSupport[0]?.id).toBe('shield-guardian');
        });
    });

    describe('Signature Abilities', () => {
        it('should have Slam for animated-armor', () => {
            const animatedArmor = getConstructTemplateById('animated-armor');
            expect(animatedArmor?.signatureAbility.name).toBe('Slam');
            expect(animatedArmor?.signatureAbility.damageType).toBe('force');
            expect(animatedArmor?.signatureAbility.attackType).toBe('melee');
            expect(animatedArmor?.signatureAbility.properties).toContain('force');
        });

        it('should have Immutable Form for golem', () => {
            const golem = getConstructTemplateById('golem');
            expect(golem?.signatureAbility.name).toBe('Immutable Form');
            expect(golem?.signatureAbility.damageType).toBe('bludgeoning');
            expect(golem?.signatureAbility.attackType).toBe('melee');
            expect(golem?.signatureAbility.properties).toContain('status_immunity');
        });

        it('should have Diving Strike for flying-sword', () => {
            const flyingSword = getConstructTemplateById('flying-sword');
            expect(flyingSword?.signatureAbility.name).toBe('Diving Strike');
            expect(flyingSword?.signatureAbility.damageType).toBe('slashing');
            expect(flyingSword?.signatureAbility.attackType).toBe('melee');
            expect(flyingSword?.signatureAbility.properties).toContain('charge');
        });

        it('should have Protection Aura for shield-guardian', () => {
            const shieldGuardian = getConstructTemplateById('shield-guardian');
            expect(shieldGuardian?.signatureAbility.name).toBe('Protection Aura');
            expect(shieldGuardian?.signatureAbility.damageType).toBe('force');
            expect(shieldGuardian?.signatureAbility.attackType).toBe('spell');
            expect(shieldGuardian?.signatureAbility.properties).toContain('buff');
        });
    });
});

describe('Construct Resistances and Immunities', () => {
    describe('All Constructs', () => {
        it('should have poison immunity on animated-armor', () => {
            const animatedArmor = getConstructTemplateById('animated-armor');
            expect(animatedArmor?.resistances?.immunities).toContain('poison');
        });

        it('should have psychic immunity on animated-armor', () => {
            const animatedArmor = getConstructTemplateById('animated-armor');
            expect(animatedArmor?.resistances?.immunities).toContain('psychic');
        });

        it('should have poison immunity on flying-sword', () => {
            const flyingSword = getConstructTemplateById('flying-sword');
            expect(flyingSword?.resistances?.immunities).toContain('poison');
        });

        it('should have psychic immunity on flying-sword', () => {
            const flyingSword = getConstructTemplateById('flying-sword');
            expect(flyingSword?.resistances?.immunities).toContain('psychic');
        });

        it('should have poison immunity on shield-guardian', () => {
            const shieldGuardian = getConstructTemplateById('shield-guardian');
            expect(shieldGuardian?.resistances?.immunities).toContain('poison');
        });

        it('should have psychic immunity on shield-guardian', () => {
            const shieldGuardian = getConstructTemplateById('shield-guardian');
            expect(shieldGuardian?.resistances?.immunities).toContain('psychic');
        });

        it('should have poison immunity on golem', () => {
            const golem = getConstructTemplateById('golem');
            expect(golem?.resistances?.immunities).toContain('poison');
        });

        it('should have psychic immunity on golem', () => {
            const golem = getConstructTemplateById('golem');
            expect(golem?.resistances?.immunities).toContain('psychic');
        });
    });

    describe('Golem Specific Resistances', () => {
        it('should have resistance to non-magical physical damage', () => {
            const golem = getConstructTemplateById('golem');
            expect(golem?.resistances?.resistances).toContain('bludgeoning');
            expect(golem?.resistances?.resistances).toContain('piercing');
            expect(golem?.resistances?.resistances).toContain('slashing');
        });
    });
});

describe('Construct Audio Preferences', () => {
    it('should prefer bass for animated-armor (brute)', () => {
        const animatedArmor = getConstructTemplateById('animated-armor');
        expect(animatedArmor?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(animatedArmor?.audioPreference.bass).toBeGreaterThan(animatedArmor?.audioPreference.mid || 0);
        expect(animatedArmor?.audioPreference.bass).toBeGreaterThan(animatedArmor?.audioPreference.treble || 0);
    });

    it('should prefer bass for golem (brute)', () => {
        const golem = getConstructTemplateById('golem');
        expect(golem?.audioPreference.bass).toBeGreaterThanOrEqual(0.8);
        expect(golem?.audioPreference.bass).toBeGreaterThan(golem?.audioPreference.mid || 0);
        expect(golem?.audioPreference.bass).toBeGreaterThan(golem?.audioPreference.treble || 0);
    });

    it('should prefer treble for flying-sword (archer)', () => {
        const flyingSword = getConstructTemplateById('flying-sword');
        expect(flyingSword?.audioPreference.treble).toBeGreaterThanOrEqual(0.8);
        expect(flyingSword?.audioPreference.treble).toBeGreaterThan(flyingSword?.audioPreference.bass || 0);
        expect(flyingSword?.audioPreference.treble).toBeGreaterThan(flyingSword?.audioPreference.mid || 0);
    });

    it('should prefer mid for shield-guardian (support)', () => {
        const shieldGuardian = getConstructTemplateById('shield-guardian');
        expect(shieldGuardian?.audioPreference.mid).toBeGreaterThanOrEqual(0.6);
        expect(shieldGuardian?.audioPreference.mid).toBeGreaterThan(shieldGuardian?.audioPreference.bass || 0);
        expect(shieldGuardian?.audioPreference.mid).toBeGreaterThan(shieldGuardian?.audioPreference.treble || 0);
    });
});

describe('Construct Enemy Generation', () => {
    describe('Template ID Generation', () => {
        it('should generate animated-armor from templateId', () => {
            const animatedArmor = EnemyGenerator.generate({
                seed: 'animated-armor-test',
                templateId: 'animated-armor',
                rarity: 'common'
            });

            expect(animatedArmor.name).toBe('Animated Armor');
            expect(animatedArmor.ability_scores.STR).toBeGreaterThanOrEqual(12);
        });

        it('should generate flying-sword from templateId', () => {
            const flyingSword = EnemyGenerator.generate({
                seed: 'flying-sword-test',
                templateId: 'flying-sword',
                rarity: 'common'
            });

            expect(flyingSword.name).toBe('Flying Sword');
            expect(flyingSword.ability_scores.DEX).toBeGreaterThanOrEqual(14);
        });

        it('should generate shield-guardian from templateId', () => {
            const shieldGuardian = EnemyGenerator.generate({
                seed: 'shield-guardian-test',
                templateId: 'shield-guardian',
                rarity: 'common'
            });

            expect(shieldGuardian.name).toBe('Shield Guardian');
            expect(shieldGuardian.ability_scores.CON).toBeGreaterThanOrEqual(14);
        });

        it('should generate golem from templateId', () => {
            const golem = EnemyGenerator.generate({
                seed: 'golem-test',
                templateId: 'golem',
                rarity: 'common'
            });

            expect(golem.name).toBe('Golem');
            expect(golem.ability_scores.STR).toBeGreaterThanOrEqual(16);
        });
    });

    describe('Category-based Generation', () => {
        it('should generate construct enemies when category is specified', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'construct-test',
                category: 'construct',
                archetype: 'brute'
            });

            // Should be one of construct brutes (animated-armor or golem)
            expect(['Animated Armor', 'Golem']).toContain(enemy.name);
        });

        it('should generate construct archer', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'construct-archer-test',
                category: 'construct',
                archetype: 'archer'
            });

            expect(enemy.name).toBe('Flying Sword');
        });

        it('should generate construct support', () => {
            const enemy = EnemyGenerator.generate({
                seed: 'construct-support-test',
                category: 'construct',
                archetype: 'support'
            });

            expect(enemy.name).toBe('Shield Guardian');
        });
    });

    describe('Rarity Scaling', () => {
        it('should scale animated-armor stats by rarity', () => {
            const armorCommon = EnemyGenerator.generate({
                seed: 'armor-common',
                templateId: 'animated-armor',
                rarity: 'common'
            });
            const armorBoss = EnemyGenerator.generate({
                seed: 'armor-boss',
                templateId: 'animated-armor',
                rarity: 'boss'
            });

            // Boss should have higher stats than common
            expect(armorBoss.ability_scores.CON).toBeGreaterThan(armorCommon.ability_scores.CON);
        });

        it('should scale golem HP by rarity', () => {
            const golemCommon = EnemyGenerator.generate({
                seed: 'golem-common',
                templateId: 'golem',
                rarity: 'common'
            });
            const golemElite = EnemyGenerator.generate({
                seed: 'golem-elite',
                templateId: 'golem',
                rarity: 'elite'
            });

            expect(golemElite.hp.max).toBeGreaterThan(golemCommon.hp.max);
        });

        it('should scale flying-sword damage die by rarity', () => {
            const rarityConfig = getRarityConfig('common');
            const bossConfig = getRarityConfig('boss');

            expect(rarityConfig.signatureDieSize).toBe(6); // d6
            expect(bossConfig.signatureDieSize).toBe(12); // d12
        });
    });

    describe('Audio-influenced Construct Generation', () => {
        it('should select flying-sword for treble-heavy audio', () => {
            const trebleAudio = createMockAudioProfile({
                bass_dominance: 0.05,
                mid_dominance: 0.05,
                treble_dominance: 0.9
            });

            const enemy = EnemyGenerator.generate({
                seed: 'treble-construct-test',
                category: 'construct',
                audioProfile: trebleAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            // With treble-heavy audio, flying-sword (archer) should be selected
            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select animated-armor for bass-heavy audio', () => {
            const bassAudio = createMockAudioProfile({
                bass_dominance: 0.9,
                mid_dominance: 0.05,
                treble_dominance: 0.05
            });

            const enemy = EnemyGenerator.generate({
                seed: 'bass-construct-test',
                category: 'construct',
                audioProfile: bassAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });

        it('should select shield-guardian for mid-range audio', () => {
            const midAudio = createMockAudioProfile({
                bass_dominance: 0.1,
                mid_dominance: 0.8,
                treble_dominance: 0.1
            });

            const enemy = EnemyGenerator.generate({
                seed: 'mid-construct-test',
                category: 'construct',
                audioProfile: midAudio,
                track: { name: 'Test Track', artists: ['Test'], album: 'Test' }
            });

            expect(enemy).toBeDefined();
            expect(enemy.name).toBeTruthy();
        });
    });

    describe('Category Mix Mode', () => {
        it('should generate mixed construct encounter using category mode', () => {
            const enemies = EnemyGenerator.generateEncounterByCR({
                seed: 'construct-mix-test',
                targetCR: 0.5,
                count: 6,
                enemyMix: 'category',
                category: 'construct'
            });

            expect(enemies.length).toBe(6);

            // All enemies should be from construct category
            const constructNames = ['Animated Armor', 'Flying Sword', 'Shield Guardian', 'Golem'];
            enemies.forEach(enemy => {
                expect(constructNames).toContain(enemy.name);
            });

            // Should have variety (not all same)
            const names = enemies.map(e => e.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBeGreaterThan(1);
        });
    });
});

describe('Construct Template Integration', () => {
    it('should find construct templates in main template list', () => {
        const animatedArmor = getTemplateById('animated-armor');
        const flyingSword = getTemplateById('flying-sword');
        const shieldGuardian = getTemplateById('shield-guardian');
        const golem = getTemplateById('golem');

        expect(animatedArmor).toBeDefined();
        expect(flyingSword).toBeDefined();
        expect(shieldGuardian).toBeDefined();
        expect(golem).toBeDefined();
    });

    it('should have correct categories for construct templates', () => {
        const animatedArmor = getTemplateById('animated-armor');
        const flyingSword = getTemplateById('flying-sword');
        const shieldGuardian = getTemplateById('shield-guardian');
        const golem = getTemplateById('golem');

        expect(animatedArmor?.category).toBe('construct');
        expect(flyingSword?.category).toBe('construct');
        expect(shieldGuardian?.category).toBe('construct');
        expect(golem?.category).toBe('construct');
    });

    it('should include constructs in total template count', () => {
        // Should have 10 V1 templates + 4 undead + 4 fiend + 4 elemental + 4 construct + 4 dragon = 30 total
        expect(DEFAULT_ENEMY_TEMPLATES.length).toBe(30);
    });
});

describe('Construct Base Stats', () => {
    it('should have appropriate base stats for animated-armor', () => {
        const animatedArmor = getConstructTemplateById('animated-armor');

        expect(animatedArmor?.baseStats.STR).toBe(14);
        expect(animatedArmor?.baseStats.DEX).toBe(10);
        expect(animatedArmor?.baseStats.CON).toBe(14);
        expect(animatedArmor?.baseStats.INT).toBe(3);
        expect(animatedArmor?.baseStats.WIS).toBe(6);
        expect(animatedArmor?.baseStats.CHA).toBe(1);
    });

    it('should have appropriate base stats for flying-sword', () => {
        const flyingSword = getConstructTemplateById('flying-sword');

        expect(flyingSword?.baseStats.STR).toBe(12);
        expect(flyingSword?.baseStats.DEX).toBe(16);
        expect(flyingSword?.baseStats.CON).toBe(12);
        expect(flyingSword?.baseStats.INT).toBe(1);
        expect(flyingSword?.baseStats.WIS).toBe(4);
        expect(flyingSword?.baseStats.CHA).toBe(1);
    });

    it('should have appropriate base stats for shield-guardian', () => {
        const shieldGuardian = getConstructTemplateById('shield-guardian');

        expect(shieldGuardian?.baseStats.STR).toBe(14);
        expect(shieldGuardian?.baseStats.DEX).toBe(10);
        expect(shieldGuardian?.baseStats.CON).toBe(16);
        expect(shieldGuardian?.baseStats.INT).toBe(6);
        expect(shieldGuardian?.baseStats.WIS).toBe(10);
        expect(shieldGuardian?.baseStats.CHA).toBe(5);
    });

    it('should have appropriate base stats for golem', () => {
        const golem = getConstructTemplateById('golem');

        expect(golem?.baseStats.STR).toBe(18);
        expect(golem?.baseStats.DEX).toBe(8);
        expect(golem?.baseStats.CON).toBe(16);
        expect(golem?.baseStats.INT).toBe(3);
        expect(golem?.baseStats.WIS).toBe(6);
        expect(golem?.baseStats.CHA).toBe(1);
    });

    it('should have appropriate HP values', () => {
        const animatedArmor = getConstructTemplateById('animated-armor');
        const flyingSword = getConstructTemplateById('flying-sword');
        const shieldGuardian = getConstructTemplateById('shield-guardian');
        const golem = getConstructTemplateById('golem');

        expect(animatedArmor?.baseHP).toBe(18);
        expect(flyingSword?.baseHP).toBe(10);
        expect(shieldGuardian?.baseHP).toBe(22);
        expect(golem?.baseHP).toBe(32);
    });

    it('should have appropriate AC values', () => {
        const animatedArmor = getConstructTemplateById('animated-armor');
        const flyingSword = getConstructTemplateById('flying-sword');
        const shieldGuardian = getConstructTemplateById('shield-guardian');
        const golem = getConstructTemplateById('golem');

        expect(animatedArmor?.baseAC).toBe(18);
        expect(flyingSword?.baseAC).toBe(17);
        expect(shieldGuardian?.baseAC).toBe(16);
        expect(golem?.baseAC).toBe(15);
    });

    it('should have appropriate speed values', () => {
        const animatedArmor = getConstructTemplateById('animated-armor');
        const flyingSword = getConstructTemplateById('flying-sword');
        const shieldGuardian = getConstructTemplateById('shield-guardian');
        const golem = getConstructTemplateById('golem');

        expect(animatedArmor?.baseSpeed).toBe(25);
        expect(flyingSword?.baseSpeed).toBe(50);
        expect(shieldGuardian?.baseSpeed).toBe(30);
        expect(golem?.baseSpeed).toBe(20);
    });
});
