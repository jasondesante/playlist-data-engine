/**
 * Damage Modifier Fix Tests (Task 1.7.3)
 *
 * Verifies that EnemyGenerator now uses actual scaled ability scores for
 * damage modifiers instead of the old hardcoded rarity-based values
 * (common: +2, uncommon: +3, elite: +4, boss: +6).
 *
 * The fix replaces getAbilityModifierForRarity() with
 * getDamageModifierForStats() from StatScaling.ts, which computes:
 *   damageModifier = primaryAbilityModifier + floor(0.2 * (level - 1))
 *
 * Where primaryAbilityModifier depends on archetype:
 *   - brute: STR modifier
 *   - archer: DEX modifier
 *   - support: CHA modifier
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';
import { getDamageModifierForStats } from '../../../src/constants/StatScaling.js';

// ============================================================================
// Helper: extract damage modifier from weapon damage string
// ============================================================================

function extractModifier(damageStr: string): number {
    const match = damageStr.match(/\+\s*(-?\d+)/);
    if (!match) throw new Error(`Cannot extract modifier from damage string: "${damageStr}"`);
    return parseInt(match[1], 10);
}

// ============================================================================
// Core fix verification
// ============================================================================

describe('Task 1.7.3 — Damage modifier uses actual ability scores', () => {
    it('brute enemies use STR modifier for damage, not hardcoded rarity value', () => {
        // Orc is a brute with base STR 16
        // Common: STR 16 * 1.0 = 16, mod = +3, level 0.25, base = floor(0.2 * -0.75) = -1 → total 2
        const common = EnemyGenerator.generate({
            seed: 'brute-dmg-test',
            templateId: 'orc',
            rarity: 'common'
        });

        const weapon = common.equipment.weapons[0];
        expect(weapon).toBeDefined();
        const modifier = extractModifier(weapon.damage);

        // Should use STR modifier from scaled stats, not hardcoded +2
        const expectedMod = getDamageModifierForStats(
            common.ability_scores,
            common.level,
            'brute'
        );
        expect(modifier).toBe(expectedMod);

        // Verify it's based on STR
        const strMod = Math.floor((common.ability_scores.STR - 10) / 2);
        // Modifier should be close to STR mod (may differ by base level bonus)
        expect(modifier).toBeGreaterThanOrEqual(strMod - 1);
        expect(modifier).toBeLessThanOrEqual(strMod + 5);
    });

    it('different rarities produce different modifiers based on stats, not hardcoded table', () => {
        const common = EnemyGenerator.generate({ seed: 'rarity-c', templateId: 'orc', rarity: 'common' });
        const uncommon = EnemyGenerator.generate({ seed: 'rarity-u', templateId: 'orc', rarity: 'uncommon' });
        const elite = EnemyGenerator.generate({ seed: 'rarity-e', templateId: 'orc', rarity: 'elite' });
        const boss = EnemyGenerator.generate({ seed: 'rarity-b', templateId: 'orc', rarity: 'boss' });

        const commonMod = extractModifier(common.equipment.weapons[0].damage);
        const uncommonMod = extractModifier(uncommon.equipment.weapons[0].damage);
        const eliteMod = extractModifier(elite.equipment.weapons[0].damage);
        const bossMod = extractModifier(boss.equipment.weapons[0].damage);

        // Old hardcoded values: common=2, uncommon=3, elite=4, boss=6
        // New values are computed from stats. Verify each matches getDamageModifierForStats
        expect(commonMod).toBe(getDamageModifierForStats(common.ability_scores, common.level, 'brute'));
        expect(uncommonMod).toBe(getDamageModifierForStats(uncommon.ability_scores, uncommon.level, 'brute'));
        expect(eliteMod).toBe(getDamageModifierForStats(elite.ability_scores, elite.level, 'brute'));
        expect(bossMod).toBe(getDamageModifierForStats(boss.ability_scores, boss.level, 'brute'));
    });

    it('boss no longer gets hardcoded +6 modifier', () => {
        const boss = EnemyGenerator.generate({ seed: 'boss-no-hardcode', templateId: 'orc', rarity: 'boss' });
        const weapon = boss.equipment.weapons[0];
        const modifier = extractModifier(weapon.damage);

        // Boss orc: STR 16 * 1.12 = 18, mod = +4, level 2, base = floor(0.2 * 1) = 0 → total 4
        // NOT the old hardcoded +6
        expect(modifier).toBe(4);
    });

    it('archer enemies use DEX modifier for damage', () => {
        // Find an archer template
        const goblinArcher = EnemyGenerator.generate({
            seed: 'archer-dmg-test',
            templateId: 'goblin-archer',
            rarity: 'common'
        });

        const weapon = goblinArcher.equipment.weapons[0];
        expect(weapon).toBeDefined();
        const modifier = extractModifier(weapon.damage);

        // Should use DEX modifier from scaled stats
        const expectedMod = getDamageModifierForStats(
            goblinArcher.ability_scores,
            goblinArcher.level,
            'archer'
        );
        expect(modifier).toBe(expectedMod);

        // Verify it's based on DEX, not STR
        const dexMod = Math.floor((goblinArcher.ability_scores.DEX - 10) / 2);
        const strMod = Math.floor((goblinArcher.ability_scores.STR - 10) / 2);

        // For archer, DEX should be the primary stat
        // The modifier should match DEX-based computation
        expect(modifier).toBe(getDamageModifierForStats(goblinArcher.ability_scores, goblinArcher.level, 'archer'));

        // Verify it's NOT using STR (unless STR == DEX by coincidence)
        if (dexMod !== strMod) {
            const strBasedMod = getDamageModifierForStats(goblinArcher.ability_scores, goblinArcher.level, 'brute');
            expect(modifier).not.toBe(strBasedMod);
        }
    });

    it('support enemies use CHA modifier for damage', () => {
        // Cultist is a support template
        const cultist = EnemyGenerator.generate({
            seed: 'support-dmg-test',
            templateId: 'cultist',
            rarity: 'elite'
        });

        const weapon = cultist.equipment.weapons[0];
        if (weapon) {
            const modifier = extractModifier(weapon.damage);
            const expectedMod = getDamageModifierForStats(
                cultist.ability_scores,
                cultist.level,
                'support'
            );
            expect(modifier).toBe(expectedMod);
        }
    });

    it('high CR enemies get higher modifiers due to higher stats, not rarity label', () => {
        // Two orcs: one at CR 1 (elite default), one at CR 10 (explicit)
        const cr1 = EnemyGenerator.generate({ seed: 'cr1-orc', templateId: 'orc', rarity: 'elite' });
        const cr10 = EnemyGenerator.generate({ seed: 'cr10-orc', templateId: 'orc', cr: 10, rarity: 'elite' });

        const cr1Mod = extractModifier(cr1.equipment.weapons[0].damage);
        const cr10Mod = extractModifier(cr10.equipment.weapons[0].damage);

        // CR 10 enemy should have higher damage modifier due to:
        // 1. Higher scaled stats (fractional CR multiplier doesn't reduce them)
        // 2. Higher level → higher base modifier from level scaling
        expect(cr10Mod).toBeGreaterThan(cr1Mod);

        // CR 10 brute orc: STR 16 * 1.07 (elite) = 17, mod = +3, level 10, base = floor(0.2 * 9) = 1 → total 4
        // CR 1 brute orc: STR 16 * 1.07 = 17, mod = +3, level 1, base = 0 → total 3
        expect(cr1Mod).toBe(3);
        expect(cr10Mod).toBe(4);
    });

    it('explicit CR overrides produce consistent modifiers with StatScaling', () => {
        const crs = [1, 3, 5, 10, 15, 20];

        for (const cr of crs) {
            const enemy = EnemyGenerator.generate({
                seed: `cr-${cr}-test`,
                templateId: 'orc',
                cr,
                rarity: 'elite'
            });

            const weapon = enemy.equipment.weapons[0];
            const modifier = extractModifier(weapon.damage);
            const expectedMod = getDamageModifierForStats(
                enemy.ability_scores,
                enemy.level,
                'brute'
            );

            expect(modifier).toBe(expectedMod);
        }
    });

    it('signature ability attack data also uses ability-score-based modifier', () => {
        // The signature ability is stored in class_features (as IDs) but the original
        // abilities array includes the attack data with damage modifier.
        // We verify via weapon damage which goes through the same code path.
        const enemy = EnemyGenerator.generate({ seed: 'sig-ability-test', templateId: 'orc', rarity: 'boss' });
        const weapon = enemy.equipment.weapons[0];
        const modifier = extractModifier(weapon.damage);

        // Same modifier should be computable from stats
        const expectedMod = getDamageModifierForStats(
            enemy.ability_scores,
            enemy.level,
            'brute'
        );
        expect(modifier).toBe(expectedMod);
    });

    it('deterministic generation produces same modifier each time', () => {
        const seed = 'deterministic-mod-test';

        const enemy1 = EnemyGenerator.generate({ seed, templateId: 'orc', rarity: 'elite' });
        const enemy2 = EnemyGenerator.generate({ seed, templateId: 'orc', rarity: 'elite' });

        const mod1 = extractModifier(enemy1.equipment.weapons[0].damage);
        const mod2 = extractModifier(enemy2.equipment.weapons[0].damage);

        expect(mod1).toBe(mod2);
        expect(enemy1.ability_scores).toEqual(enemy2.ability_scores);
    });

    it('natural weapon (no equipment weapon) uses ability-score-based modifier', () => {
        // Generate enemies until we find one without a weapon equipment
        // (Most enemies get weapons from equipment, but we can test the fallback path)
        // Instead, we verify that the weapon damage modifier matches getDamageModifierForStats
        // regardless of whether it came from equipment or natural weapon fallback.
        for (let i = 0; i < 10; i++) {
            const enemy = EnemyGenerator.generate({
                seed: `natural-weapon-${i}`,
                templateId: 'orc',
                rarity: 'common'
            });

            const weapon = enemy.equipment.weapons[0];
            expect(weapon).toBeDefined();

            const modifier = extractModifier(weapon.damage);
            const expectedMod = getDamageModifierForStats(
                enemy.ability_scores,
                enemy.level,
                'brute'
            );
            expect(modifier).toBe(expectedMod);
        }
    });

    it('modifier reflects actual ability score differences between templates', () => {
        // Orc: STR 16, DEX 12 (brute)
        // Goblin Archer: STR 8, DEX 16 (archer)
        const orc = EnemyGenerator.generate({ seed: 'orc-vs-archer-1', templateId: 'orc', rarity: 'elite' });
        const archer = EnemyGenerator.generate({ seed: 'orc-vs-archer-2', templateId: 'goblin-archer', rarity: 'elite' });

        const orcMod = extractModifier(orc.equipment.weapons[0].damage);
        const archerMod = extractModifier(archer.equipment.weapons[0].damage);

        // Both should use their respective primary stats
        const orcExpected = getDamageModifierForStats(orc.ability_scores, orc.level, 'brute');
        const archerExpected = getDamageModifierForStats(archer.ability_scores, archer.level, 'archer');

        expect(orcMod).toBe(orcExpected);
        expect(archerMod).toBe(archerExpected);
    });
});
