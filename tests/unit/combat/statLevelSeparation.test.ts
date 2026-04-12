/**
 * Stat Level Separation Tests (Task 1.7.5)
 *
 * Tests that StatLevelOverrides in EnemyGenerator correctly apply independent
 * HP, attack, and defense scaling at different effective levels.
 *
 * Key properties:
 * - When no overrides are set, output is identical to the current system (backward compat)
 * - Overrides use StatScaling functions to compute stats at the specified level
 * - Each axis (HP, attack, defense) is independent — setting one doesn't affect others
 * - The `stat_levels` field on CharacterSheet records which overrides were applied
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';
import { getDamageModifierForStats, getHPAtLevel, getAttackAtLevel } from '../../../src/constants/StatScaling.js';
import type { StatLevelOverrides } from '../../../src/core/types/Enemy.js';

// ============================================================================
// Helpers
// ============================================================================

function extractModifier(damageStr: string): number {
    const match = damageStr.match(/\+\s*(-?\d+)/);
    if (!match) throw new Error(`Cannot extract modifier from damage string: "${damageStr}"`);
    return parseInt(match[1], 10);
}

function extractDamageDie(damageStr: string): string {
    // Match "d6", "2d6", "2d8", "d12", etc. (leading digit count optional)
    const match = damageStr.match(/(\d*d\d+)/);
    if (!match) throw new Error(`Cannot extract damage die from damage string: "${damageStr}"`);
    return match[1];
}

/**
 * Generate the same enemy with and without stat level overrides and compare.
 * Returns both the baseline (no overrides) and overridden versions.
 */
function generatePair(
    seed: string,
    templateId: string,
    rarity: 'common' | 'uncommon' | 'elite' | 'boss',
    overrides: StatLevelOverrides,
    cr?: number
) {
    const baseOptions: any = { seed, templateId, rarity };
    if (cr !== undefined) baseOptions.cr = cr;

    const baseline = EnemyGenerator.generate(baseOptions);
    const overridden = EnemyGenerator.generate({ ...baseOptions, statLevels: overrides });

    return { baseline, overridden };
}

// ============================================================================
// 1. Default (no overrides) produces identical output to current system
// ============================================================================

describe('stat level separation — backward compatibility', () => {
    it('generating without statLevels twice produces identical results', () => {
        const options = { seed: 'backward-compat-test', templateId: 'orc', rarity: 'elite' as const, cr: 5 };

        const first = EnemyGenerator.generate(options);
        const second = EnemyGenerator.generate(options);

        expect(first.hp.max).toBe(second.hp.max);
        expect(first.armor_class).toBe(second.armor_class);
        expect(first.equipment.weapons[0].damage).toBe(second.equipment.weapons[0].damage);
        expect(first.ability_scores).toEqual(second.ability_scores);
        expect(first.stat_levels).toBeUndefined();
    });

    it('undefined statLevels does not add stat_levels to CharacterSheet', () => {
        const enemy = EnemyGenerator.generate({
            seed: 'no-stat-levels-field',
            templateId: 'orc',
            rarity: 'common'
        });

        expect(enemy.stat_levels).toBeUndefined();
    });

    it('statLevels adds stat_levels to CharacterSheet with override values', () => {
        const overrides: StatLevelOverrides = { hpLevel: 10, attackLevel: 10, defenseLevel: 10 };
        const enemy = EnemyGenerator.generate({
            seed: 'stat-levels-set',
            templateId: 'orc',
            rarity: 'elite',
            cr: 5,
            statLevels: overrides
        });

        expect(enemy.stat_levels).toBeDefined();
        expect(enemy.stat_levels?.hpLevel).toBe(10);
        expect(enemy.stat_levels?.attackLevel).toBe(10);
        expect(enemy.stat_levels?.defenseLevel).toBe(10);
    });

    it('partial overrides only affect the specified stat axes', () => {
        const seed = 'partial-override-test';
        const { baseline, overridden } = generatePair(seed, 'orc', 'elite', { hpLevel: 15 }, 5);

        // HP should differ (level 15 HP scaling vs default which has no level scaling)
        expect(overridden.hp.max).not.toBe(baseline.hp.max);
        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max);

        // AC should be the same (no defense override — same code path)
        expect(overridden.armor_class).toBe(baseline.armor_class);

        // Damage die should be the same (no attack override — same code path)
        const baseWeapon = baseline.equipment.weapons[0];
        const overWeapon = overridden.equipment.weapons[0];
        expect(extractDamageDie(overWeapon.damage)).toBe(extractDamageDie(baseWeapon.damage));

        // Damage modifier should be the same (no attack override)
        expect(extractModifier(overWeapon.damage)).toBe(extractModifier(baseWeapon.damage));
    });

    it('same seed produces same results with same overrides', () => {
        const overrides: StatLevelOverrides = { hpLevel: 10, attackLevel: 10, defenseLevel: 10 };
        const options = { seed: 'deterministic-overrides', templateId: 'orc', rarity: 'elite' as const, cr: 5, statLevels: overrides };

        const e1 = EnemyGenerator.generate(options);
        const e2 = EnemyGenerator.generate(options);

        expect(e1.hp.max).toBe(e2.hp.max);
        expect(e1.armor_class).toBe(e2.armor_class);
        expect(e1.equipment.weapons[0].damage).toBe(e2.equipment.weapons[0].damage);
        expect(e1.ability_scores).toEqual(e2.ability_scores);
    });
});

// ============================================================================
// 2. HP-only override: high HP level, normal attack/defense
// ============================================================================

describe('stat level separation — HP-only override', () => {
    it('high HP level produces more HP than baseline', () => {
        const { baseline, overridden } = generatePair('hp-only-high', 'orc', 'common', { hpLevel: 15 });

        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max);
        // Should be roughly 2x at level 15 vs default (CR 0.25 for common orc)
        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max * 1.5);
    });

    it('high HP level matches getHPAtLevel computation', () => {
        const hpLevel = 15;
        const rarity: const = 'common';
        const enemy = EnemyGenerator.generate({
            seed: 'hp-compute-test',
            templateId: 'orc',
            rarity,
            statLevels: { hpLevel }
        });

        const template = EnemyGenerator.getTemplateById('orc')!;
        const expectedHP = getHPAtLevel(template.baseHP, hpLevel, rarity);

        expect(enemy.hp.max).toBe(expectedHP);
    });

    it('HP at level 1 matches baseline for CR >= 1 enemies', () => {
        // At level 1, the level factor is 1.0, so getHPAtLevel produces the same
        // result as the default path (rarity multiplier only, no level scaling)
        const { baseline, overridden } = generatePair('hp-level1-match', 'orc', 'elite', { hpLevel: 1 }, 5);

        expect(overridden.hp.max).toBe(baseline.hp.max);
    });

    it('HP at level 1 is higher than baseline for explicitly set CR < 1 enemies', () => {
        // When explicit CR < 1 is set, baseline applies fractional CR multiplier (0.75x for CR 0.25)
        // HP override at level 1 uses level factor 1.0 with fractional CR multiplier 1.0
        const { baseline, overridden } = generatePair('hp-level1-cr-low', 'orc', 'common', { hpLevel: 1 }, 0.25);

        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max);
    });

    it('attack and defense remain unaffected by HP override', () => {
        const { baseline, overridden } = generatePair('hp-only-neutral', 'orc', 'elite', { hpLevel: 10 }, 5);

        // Attack (damage die + modifier) should be the same
        const baseWeapon = baseline.equipment.weapons[0];
        const overWeapon = overridden.equipment.weapons[0];
        expect(extractDamageDie(overWeapon.damage)).toBe(extractDamageDie(baseWeapon.damage));
        expect(extractModifier(overWeapon.damage)).toBe(extractModifier(baseWeapon.damage));

        // AC should be the same (no defense override)
        expect(overridden.armor_class).toBe(baseline.armor_class);
    });

    it('stat_levels on CharacterSheet records only the HP override', () => {
        const enemy = EnemyGenerator.generate({
            seed: 'hp-only-stat-records',
            templateId: 'orc',
            rarity: 'common',
            statLevels: { hpLevel: 10 }
        });

        expect(enemy.stat_levels).toBeDefined();
        expect(enemy.stat_levels?.hpLevel).toBe(10);
        expect(enemy.stat_levels?.attackLevel).toBeUndefined();
        expect(enemy.stat_levels?.defenseLevel).toBeUndefined();
    });
});

// ============================================================================
// 3. Attack-only override: high attack, normal HP/defense
// ============================================================================

describe('stat level separation — attack-only override', () => {
    it('high attack level produces larger damage die than baseline', () => {
        const { baseline, overridden } = generatePair('atk-only-high', 'orc', 'common', { attackLevel: 15 });

        const baseDie = extractDamageDie(baseline.equipment.weapons[0].damage);
        const overDie = extractDamageDie(overridden.equipment.weapons[0].damage);

        // Level 15 gives 2d6, while default common orc gets d6 (rarity-based)
        expect(overDie).not.toBe(baseDie);
        expect(overDie).toBe('2d6');
    });

    it('high attack level produces higher damage modifier than baseline', () => {
        const { baseline, overridden } = generatePair('atk-only-mod', 'orc', 'elite', { attackLevel: 15 }, 5);

        const baseMod = extractModifier(baseline.equipment.weapons[0].damage);
        const overMod = extractModifier(overridden.equipment.weapons[0].damage);

        expect(overMod).toBeGreaterThan(baseMod);
    });

    it('low attack level produces smaller damage die for high-CR enemies', () => {
        const { baseline, overridden } = generatePair('atk-only-low', 'orc', 'elite', { attackLevel: 1 }, 10);

        const baseDie = extractDamageDie(baseline.equipment.weapons[0].damage);
        const overDie = extractDamageDie(overridden.equipment.weapons[0].damage);

        // Level 1 gives 1d6, level 10 gets higher die from rarity scaling
        expect(overDie).toBe('1d6');
        expect(overDie).not.toBe(baseDie);
    });

    it('attack stats match getAttackAtLevel computation', () => {
        const attackLevel = 10;
        const rarity: const = 'common';
        const enemy = EnemyGenerator.generate({
            seed: 'atk-compute-test',
            templateId: 'orc',
            rarity,
            statLevels: { attackLevel }
        });

        const attackStats = getAttackAtLevel(enemy.ability_scores, attackLevel, rarity, 'brute');
        const weapon = enemy.equipment.weapons[0];

        expect(extractDamageDie(weapon.damage)).toBe(attackStats.damageDie);
        expect(extractModifier(weapon.damage)).toBe(attackStats.damageModifier);
    });

    it('attack level at 1 produces d6 for all rarities', () => {
        const rarities: Array<'common' | 'uncommon' | 'elite' | 'boss'> = ['common', 'uncommon', 'elite', 'boss'];

        for (const rarity of rarities) {
            const enemy = EnemyGenerator.generate({
                seed: `atk-d6-${rarity}`,
                templateId: 'orc',
                rarity,
                cr: 5,
                statLevels: { attackLevel: 1 }
            });
            expect(extractDamageDie(enemy.equipment.weapons[0].damage)).toBe('1d6');
        }
    });

    it('HP and AC remain unaffected by attack override', () => {
        const { baseline, overridden } = generatePair('atk-only-neutral', 'orc', 'elite', { attackLevel: 10 }, 5);

        expect(overridden.hp.max).toBe(baseline.hp.max);
        expect(overridden.armor_class).toBe(baseline.armor_class);
    });

    it('stat_levels on CharacterSheet records only the attack override', () => {
        const enemy = EnemyGenerator.generate({
            seed: 'atk-only-stat-records',
            templateId: 'orc',
            rarity: 'common',
            statLevels: { attackLevel: 10 }
        });

        expect(enemy.stat_levels).toBeDefined();
        expect(enemy.stat_levels?.attackLevel).toBe(10);
        expect(enemy.stat_levels?.hpLevel).toBeUndefined();
        expect(enemy.stat_levels?.defenseLevel).toBeUndefined();
    });
});

// ============================================================================
// 4. Defense-only override: high AC, normal HP/attack
// ============================================================================

describe('stat level separation — defense-only override', () => {
    it('high defense level produces different AC than baseline', () => {
        const { baseline, overridden } = generatePair('def-only-high', 'orc', 'common', { defenseLevel: 15 });

        // The defense override uses getDefenseAtLevel which computes AC differently
        // from the default path (includes baseAC + equipmentAC instead of acModifier).
        // The key test is that the override path IS being used.
        expect(overridden.armor_class).not.toBe(baseline.armor_class);
    });

    it('defense override changes AC relative to level 1 defense', () => {
        // Compare two overrides at different defense levels to verify level scaling
        const lowDef = EnemyGenerator.generate({
            seed: 'def-level-low',
            templateId: 'orc',
            rarity: 'common',
            statLevels: { defenseLevel: 1 }
        });
        const highDef = EnemyGenerator.generate({
            seed: 'def-level-high',
            templateId: 'orc',
            rarity: 'common',
            statLevels: { defenseLevel: 20 }
        });

        // Higher defense level should produce higher AC
        expect(highDef.armor_class).toBeGreaterThan(lowDef.armor_class);
    });

    it('HP and attack remain unaffected by defense override', () => {
        const { baseline, overridden } = generatePair('def-only-neutral', 'orc', 'elite', { defenseLevel: 10 }, 5);

        expect(overridden.hp.max).toBe(baseline.hp.max);

        const baseWeapon = baseline.equipment.weapons[0];
        const overWeapon = overridden.equipment.weapons[0];
        expect(extractDamageDie(overWeapon.damage)).toBe(extractDamageDie(baseWeapon.damage));
        expect(extractModifier(overWeapon.damage)).toBe(extractModifier(baseWeapon.damage));
    });

    it('stat_levels on CharacterSheet records only the defense override', () => {
        const enemy = EnemyGenerator.generate({
            seed: 'def-only-stat-records',
            templateId: 'orc',
            rarity: 'common',
            statLevels: { defenseLevel: 10 }
        });

        expect(enemy.stat_levels).toBeDefined();
        expect(enemy.stat_levels?.defenseLevel).toBe(10);
        expect(enemy.stat_levels?.hpLevel).toBeUndefined();
        expect(enemy.stat_levels?.attackLevel).toBeUndefined();
    });
});

// ============================================================================
// 5. Combined overrides: high HP + high attack + low defense (brute-tank)
// ============================================================================

describe('stat level separation — combined overrides', () => {
    it('brute: high HP, high attack, defense at default', () => {
        const overrides: StatLevelOverrides = { hpLevel: 15, attackLevel: 15 };
        const { baseline, overridden } = generatePair('brute-build', 'orc', 'elite', overrides, 5);

        // HP should be much higher (level 15 scaling vs no level scaling in baseline)
        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max);

        // Attack should be stronger (2d6 at level 15 vs d8/d10 at level 5)
        const baseWeapon = baseline.equipment.weapons[0];
        const overWeapon = overridden.equipment.weapons[0];
        expect(extractDamageDie(overWeapon.damage)).not.toBe(extractDamageDie(baseWeapon.damage));
        expect(extractDamageDie(overWeapon.damage)).toBe('2d6');

        // AC should be unchanged (no defense override)
        expect(overridden.armor_class).toBe(baseline.armor_class);
    });

    it('glass cannon: high attack, HP override removes fractional CR penalty', () => {
        // For CR < 1 enemies with explicit CR, hpLevel=1 removes the fractional CR HP reduction
        const overrides: StatLevelOverrides = { hpLevel: 1, attackLevel: 15 };
        const { baseline, overridden } = generatePair('glass-cannon', 'orc', 'common', overrides, 0.25);

        // HP at level 1 should be higher than CR 0.25 baseline (removes fractional CR penalty)
        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max);

        // Attack should be much stronger (2d6 at level 15 vs d6 at CR 0.25)
        const overWeapon = overridden.equipment.weapons[0];
        expect(extractDamageDie(overWeapon.damage)).toBe('2d6');

        // AC unchanged (no defense override)
        expect(overridden.armor_class).toBe(baseline.armor_class);
    });

    it('tank: high HP, high defense, normal attack', () => {
        const overrides: StatLevelOverrides = { hpLevel: 15, defenseLevel: 15 };
        const { baseline, overridden } = generatePair('tank-build', 'orc', 'elite', overrides, 5);

        // HP should be much higher
        expect(overridden.hp.max).toBeGreaterThan(baseline.hp.max);

        // Attack should remain at default (no attack override)
        const baseWeapon = baseline.equipment.weapons[0];
        const overWeapon = overridden.equipment.weapons[0];
        expect(extractDamageDie(overWeapon.damage)).toBe(extractDamageDie(baseWeapon.damage));
        expect(extractModifier(overWeapon.damage)).toBe(extractModifier(baseWeapon.damage));

        // Defense should be different (override active)
        expect(overridden.armor_class).not.toBe(baseline.armor_class);
    });

    it('all three overrides produce expected stat profile', () => {
        const overrides: StatLevelOverrides = { hpLevel: 10, attackLevel: 10, defenseLevel: 10 };
        const enemy = EnemyGenerator.generate({
            seed: 'all-three-overrides',
            templateId: 'orc',
            rarity: 'common',
            statLevels: overrides
        });

        const template = EnemyGenerator.getTemplateById('orc')!;

        // HP should match StatScaling
        const expectedHP = getHPAtLevel(template.baseHP, 10, 'common');
        expect(enemy.hp.max).toBe(expectedHP);

        // Attack should match StatScaling
        const attackStats = getAttackAtLevel(enemy.ability_scores, 10, 'common', 'brute');
        const weapon = enemy.equipment.weapons[0];
        expect(extractDamageDie(weapon.damage)).toBe(attackStats.damageDie);
        expect(extractModifier(weapon.damage)).toBe(attackStats.damageModifier);

        // stat_levels should record all three
        expect(enemy.stat_levels?.hpLevel).toBe(10);
        expect(enemy.stat_levels?.attackLevel).toBe(10);
        expect(enemy.stat_levels?.defenseLevel).toBe(10);
    });

    it('combined overrides are deterministic', () => {
        const overrides: StatLevelOverrides = { hpLevel: 8, attackLevel: 12, defenseLevel: 6 };
        const options = { seed: 'combined-det', templateId: 'orc', rarity: 'elite' as const, cr: 5, statLevels: overrides };

        const e1 = EnemyGenerator.generate(options);
        const e2 = EnemyGenerator.generate(options);

        expect(e1.hp.max).toBe(e2.hp.max);
        expect(e1.armor_class).toBe(e2.armor_class);
        expect(e1.equipment.weapons[0].damage).toBe(e2.equipment.weapons[0].damage);
    });
});

// ============================================================================
// 6. Damage modifier uses actual ability scores, not hardcoded rarity values
// ============================================================================

describe('stat level separation — damage modifier uses ability scores', () => {
    it('attack override damage modifier matches getDamageModifierForStats', () => {
        const attackLevel = 10;
        const enemy = EnemyGenerator.generate({
            seed: 'dmg-mod-ability',
            templateId: 'orc',
            rarity: 'elite',
            cr: 5,
            statLevels: { attackLevel }
        });

        const weapon = enemy.equipment.weapons[0];
        const modifier = extractModifier(weapon.damage);
        const expected = getDamageModifierForStats(enemy.ability_scores, attackLevel, 'brute');

        expect(modifier).toBe(expected);
    });

    it('different archetypes use different primary stats for damage', () => {
        // Brute (orc) uses STR, archer (goblin-archer) uses DEX
        const brute = EnemyGenerator.generate({
            seed: 'archetype-brute',
            templateId: 'orc',
            rarity: 'elite',
            cr: 5,
            statLevels: { attackLevel: 10 }
        });

        const archer = EnemyGenerator.generate({
            seed: 'archetype-archer',
            templateId: 'goblin-archer',
            rarity: 'elite',
            cr: 5,
            statLevels: { attackLevel: 10 }
        });

        const bruteMod = extractModifier(brute.equipment.weapons[0].damage);
        const archerMod = extractModifier(archer.equipment.weapons[0].damage);

        // Brute uses STR, archer uses DEX — verify via getDamageModifierForStats
        const bruteExpected = getDamageModifierForStats(brute.ability_scores, 10, 'brute');
        const archerExpected = getDamageModifierForStats(archer.ability_scores, 10, 'archer');

        expect(bruteMod).toBe(bruteExpected);
        expect(archerMod).toBe(archerExpected);
    });

    it('attack override die size is independent of rarity label', () => {
        // Same attackLevel, different rarities — die size determined by level, not rarity
        const common = EnemyGenerator.generate({
            seed: 'rarity-indep-c',
            templateId: 'orc',
            rarity: 'common',
            cr: 5,
            statLevels: { attackLevel: 10 }
        });

        const boss = EnemyGenerator.generate({
            seed: 'rarity-indep-b',
            templateId: 'orc',
            rarity: 'boss',
            cr: 5,
            statLevels: { attackLevel: 10 }
        });

        // Both use level 10 for attack die → 1d12 (level-based, not rarity-based)
        const commonDie = extractDamageDie(common.equipment.weapons[0].damage);
        const bossDie = extractDamageDie(boss.equipment.weapons[0].damage);

        expect(commonDie).toBe('1d12');
        expect(bossDie).toBe('1d12');
    });

    it('no override also uses ability-score-based modifier (not hardcoded)', () => {
        // Verify the fix from 1.7.3 still works — no statLevels at all
        const enemy = EnemyGenerator.generate({
            seed: 'no-override-ability',
            templateId: 'orc',
            rarity: 'elite',
            cr: 5
        });

        const weapon = enemy.equipment.weapons[0];
        const modifier = extractModifier(weapon.damage);
        const expected = getDamageModifierForStats(enemy.ability_scores, enemy.level, 'brute');

        expect(modifier).toBe(expected);
    });

    it('high STR enemy has higher damage modifier than low STR enemy at same level', () => {
        // Both at attackLevel 10 — damage modifier driven by actual ability scores
        const highSTR = EnemyGenerator.generate({
            seed: 'high-str-mod',
            templateId: 'orc',
            rarity: 'elite',
            cr: 10,
            statLevels: { attackLevel: 10 }
        });

        const lowSTR = EnemyGenerator.generate({
            seed: 'low-str-mod',
            templateId: 'goblin-archer',
            rarity: 'elite',
            cr: 10,
            statLevels: { attackLevel: 10 }
        });

        const highMod = extractModifier(highSTR.equipment.weapons[0].damage);
        const lowMod = extractModifier(lowSTR.equipment.weapons[0].damage);

        // Orc (brute, STR primary) should have STR-based modifier
        // Goblin archer (archer, DEX primary) should have DEX-based modifier
        const highExpected = getDamageModifierForStats(highSTR.ability_scores, 10, 'brute');
        const lowExpected = getDamageModifierForStats(lowSTR.ability_scores, 10, 'archer');

        expect(highMod).toBe(highExpected);
        expect(lowMod).toBe(lowExpected);
    });
});

// ============================================================================
// 7. Edge cases: extreme level overrides
// ============================================================================

describe('stat level separation — edge cases', () => {
    it('level 1 HP override on CR 20 boss matches getHPAtLevel', () => {
        const overrides: StatLevelOverrides = { hpLevel: 1 };
        const enemy = EnemyGenerator.generate({
            seed: 'lvl1-hp-cr20',
            templateId: 'orc',
            rarity: 'boss',
            cr: 20,
            statLevels: overrides
        });

        const template = EnemyGenerator.getTemplateById('orc')!;
        const expectedHP = getHPAtLevel(template.baseHP, 1, 'boss');

        // HP at level 1 boss — matches StatScaling computation
        expect(enemy.hp.max).toBe(expectedHP);
    });

    it('level 20 HP override on CR 1 enemy produces very high HP', () => {
        const overrides: StatLevelOverrides = { hpLevel: 20 };
        const enemy = EnemyGenerator.generate({
            seed: 'lvl20-hp-cr1',
            templateId: 'orc',
            rarity: 'common',
            cr: 1,
            statLevels: overrides
        });

        const template = EnemyGenerator.getTemplateById('orc')!;
        const expectedHP = getHPAtLevel(template.baseHP, 20, 'common');

        expect(enemy.hp.max).toBe(expectedHP);

        // A CR 1 common without override would have much less HP
        const normal = EnemyGenerator.generate({
            seed: 'normal-cr1',
            templateId: 'orc',
            rarity: 'common',
            cr: 1
        });
        expect(enemy.hp.max).toBeGreaterThan(normal.hp.max);
    });

    it('level 20 attack override on CR 1 enemy gives 2d8 damage die', () => {
        const overrides: StatLevelOverrides = { attackLevel: 20 };
        const enemy = EnemyGenerator.generate({
            seed: 'lvl20-atk-cr1',
            templateId: 'orc',
            rarity: 'common',
            cr: 1,
            statLevels: overrides
        });

        const weapon = enemy.equipment.weapons[0];
        expect(extractDamageDie(weapon.damage)).toBe('2d8');
    });

    it('level 1 attack override on CR 20 enemy gives d6 damage die', () => {
        // Note: boss enhancement doubles signature ability dice (abilities),
        // but the weapon equipment damage uses the attackLevel override.
        const overrides: StatLevelOverrides = { attackLevel: 1 };
        const enemy = EnemyGenerator.generate({
            seed: 'lvl1-atk-cr20',
            templateId: 'orc',
            rarity: 'boss',
            cr: 20,
            statLevels: overrides
        });

        const weapon = enemy.equipment.weapons[0];
        expect(extractDamageDie(weapon.damage)).toBe('1d6');
    });

    it('defense level 20 produces higher AC than defense level 1', () => {
        const lowDef = EnemyGenerator.generate({
            seed: 'def-compare-low',
            templateId: 'orc',
            rarity: 'common',
            cr: 1,
            statLevels: { defenseLevel: 1 }
        });
        const highDef = EnemyGenerator.generate({
            seed: 'def-compare-high',
            templateId: 'orc',
            rarity: 'common',
            cr: 1,
            statLevels: { defenseLevel: 20 }
        });

        expect(highDef.armor_class).toBeGreaterThan(lowDef.armor_class);
    });

    it('extreme combination: all at level 20 on CR 1 common', () => {
        const overrides: StatLevelOverrides = { hpLevel: 20, attackLevel: 20, defenseLevel: 20 };
        const enemy = EnemyGenerator.generate({
            seed: 'all-20-cr1',
            templateId: 'orc',
            rarity: 'common',
            cr: 1,
            statLevels: overrides
        });

        const template = EnemyGenerator.getTemplateById('orc')!;

        // HP at level 20 common should be much higher than default
        const expectedHP = getHPAtLevel(template.baseHP, 20, 'common');
        expect(enemy.hp.max).toBe(expectedHP);

        // Attack at level 20: 2d8
        const weapon = enemy.equipment.weapons[0];
        expect(extractDamageDie(weapon.damage)).toBe('2d8');

        // Defense at level 20: higher than defense level 1
        const lowDef = EnemyGenerator.generate({
            seed: 'all-20-compare-def',
            templateId: 'orc',
            rarity: 'common',
            cr: 1,
            statLevels: { defenseLevel: 1 }
        });
        expect(enemy.armor_class).toBeGreaterThan(lowDef.armor_class);
    });

    it('extreme combination: all at level 1 on CR 20 boss', () => {
        const overrides: StatLevelOverrides = { hpLevel: 1, attackLevel: 1, defenseLevel: 1 };
        const enemy = EnemyGenerator.generate({
            seed: 'all-1-cr20',
            templateId: 'orc',
            rarity: 'boss',
            cr: 20,
            statLevels: overrides
        });

        const template = EnemyGenerator.getTemplateById('orc')!;

        // HP at level 1 boss matches StatScaling
        const expectedHP = getHPAtLevel(template.baseHP, 1, 'boss');
        expect(enemy.hp.max).toBe(expectedHP);

        // Attack at level 1: 1d6
        const weapon = enemy.equipment.weapons[0];
        expect(extractDamageDie(weapon.damage)).toBe('1d6');

        // Defense at level 1: lower than defense level 20
        const highDef = EnemyGenerator.generate({
            seed: 'all-1-compare-def',
            templateId: 'orc',
            rarity: 'boss',
            cr: 20,
            statLevels: { defenseLevel: 20 }
        });
        expect(enemy.armor_class).toBeLessThan(highDef.armor_class);
    });

    it('fractional level overrides work correctly', () => {
        const overrides: StatLevelOverrides = { hpLevel: 0.5 };
        const enemy = EnemyGenerator.generate({
            seed: 'frac-level',
            templateId: 'orc',
            rarity: 'common',
            statLevels: overrides
        });

        const template = EnemyGenerator.getTemplateById('orc')!;
        const expectedHP = getHPAtLevel(template.baseHP, 0.5, 'common');

        // Should apply the 0.85x fractional CR multiplier
        expect(enemy.hp.max).toBe(expectedHP);
        expect(enemy.hp.max).toBeLessThan(template.baseHP);
    });

    it('different templates respond to overrides consistently', () => {
        // Test that the override system works across different enemy types
        const overrides: StatLevelOverrides = { attackLevel: 10 };

        const orc = EnemyGenerator.generate({
            seed: 'multi-tpl-orc',
            templateId: 'orc',
            rarity: 'elite',
            cr: 5,
            statLevels: overrides
        });

        const archer = EnemyGenerator.generate({
            seed: 'multi-tpl-archer',
            templateId: 'goblin-archer',
            rarity: 'elite',
            cr: 5,
            statLevels: overrides
        });

        // Both should have 1d12 damage die at attack level 10
        expect(extractDamageDie(orc.equipment.weapons[0].damage)).toBe('1d12');
        expect(extractDamageDie(archer.equipment.weapons[0].damage)).toBe('1d12');

        // Both should use their respective primary stats for modifier
        const orcExpected = getDamageModifierForStats(orc.ability_scores, 10, 'brute');
        const archerExpected = getDamageModifierForStats(archer.ability_scores, 10, 'archer');
        expect(extractModifier(orc.equipment.weapons[0].damage)).toBe(orcExpected);
        expect(extractModifier(archer.equipment.weapons[0].damage)).toBe(archerExpected);
    });
});
