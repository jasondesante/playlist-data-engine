/**
 * StatScaling Tests
 *
 * Tests for level-based stat scaling functions in src/constants/StatScaling.ts.
 * These functions enable HP, attack, and defense to scale independently at
 * different effective levels.
 */

import { describe, it, expect } from 'vitest';
import {
    getLevelScalingFactor,
    getHPAtLevel,
    getAttackAtLevel,
    getDefenseAtLevel,
    getDamageModifierForStats
} from '../../../src/constants/StatScaling.js';
import type { AbilityScores } from '../../../src/core/types/Character.js';

// ============================================================================
// Test fixtures
// ============================================================================

const BASE_STATS: AbilityScores = {
    STR: 16,
    DEX: 12,
    CON: 14,
    INT: 10,
    WIS: 10,
    CHA: 8
};

const HIGH_STATS: AbilityScores = {
    STR: 20,
    DEX: 18,
    CON: 16,
    INT: 12,
    WIS: 14,
    CHA: 16
};

const LOW_STATS: AbilityScores = {
    STR: 8,
    DEX: 10,
    CON: 10,
    INT: 8,
    WIS: 8,
    CHA: 8
};

// ============================================================================
// getLevelScalingFactor
// ============================================================================

describe('getLevelScalingFactor', () => {
    it('returns 1.0 at level 1', () => {
        expect(getLevelScalingFactor(1)).toBe(1.0);
    });

    it('returns 1.0 for levels below 1', () => {
        expect(getLevelScalingFactor(0)).toBe(1.0);
        expect(getLevelScalingFactor(-1)).toBe(1.0);
    });

    it('increases monotonically with level', () => {
        let prev = getLevelScalingFactor(1);
        for (let level = 2; level <= 20; level++) {
            const current = getLevelScalingFactor(level);
            expect(current).toBeGreaterThan(prev);
            prev = current;
        }
    });

    it('produces reasonable scaling at level 5', () => {
        // At level 5: 1 + 4 * 0.035 = 1.14
        const factor = getLevelScalingFactor(5);
        expect(factor).toBeCloseTo(1.14, 1);
        expect(factor).toBeGreaterThan(1.0);
        expect(factor).toBeLessThan(1.5);
    });

    it('produces reasonable scaling at level 10', () => {
        // At level 10: 1 + 9 * 0.035 = 1.315
        const factor = getLevelScalingFactor(10);
        expect(factor).toBeCloseTo(1.315, 1);
    });

    it('produces reasonable scaling at level 20', () => {
        // At level 20: 1 + 19 * 0.035 = 1.665
        const factor = getLevelScalingFactor(20);
        expect(factor).toBeCloseTo(1.665, 1);
        expect(factor).toBeLessThan(2.0); // Not exponential
    });

    it('supports fractional levels', () => {
        const factor = getLevelScalingFactor(2.5);
        expect(factor).toBeGreaterThan(getLevelScalingFactor(2));
        expect(factor).toBeLessThan(getLevelScalingFactor(3));
    });

    it('scales linearly (by design)', () => {
        // The formula is linear: 1 + (level - 1) * 0.035
        const f1 = getLevelScalingFactor(1);
        const f2 = getLevelScalingFactor(5);
        const f3 = getLevelScalingFactor(10);
        // Each level adds exactly 0.035
        expect(f2 - f1).toBeCloseTo(4 * 0.035, 3);
        expect(f3 - f1).toBeCloseTo(9 * 0.035, 3);
    });
});

// ============================================================================
// getHPAtLevel
// ============================================================================

describe('getHPAtLevel', () => {
    const BASE_HP = 15; // orc base HP

    it('returns base HP at level 1 for common rarity', () => {
        // Level 1 common: 15 * (1 + 0) * 1.0 * 1.0 = 15
        expect(getHPAtLevel(BASE_HP, 1, 'common')).toBe(15);
    });

    it('applies rarity multiplier at level 1', () => {
        // Level 1 uncommon: 15 * 1.0 * 1.03 = 15.45 → 15
        const uncommonHP = getHPAtLevel(BASE_HP, 1, 'uncommon');
        expect(uncommonHP).toBe(Math.round(BASE_HP * 1.03));

        // Level 1 elite: 15 * 1.0 * 1.07 = 16.05 → 16
        const eliteHP = getHPAtLevel(BASE_HP, 1, 'elite');
        expect(eliteHP).toBe(Math.round(BASE_HP * 1.07));

        // Level 1 boss: 15 * 1.0 * 1.12 = 16.8 → 17
        const bossHP = getHPAtLevel(BASE_HP, 1, 'boss');
        expect(bossHP).toBe(Math.round(BASE_HP * 1.12));
    });

    it('scales HP with level', () => {
        const hp1 = getHPAtLevel(BASE_HP, 1, 'common');
        const hp5 = getHPAtLevel(BASE_HP, 5, 'common');
        const hp10 = getHPAtLevel(BASE_HP, 10, 'common');
        const hp20 = getHPAtLevel(BASE_HP, 20, 'common');

        expect(hp5).toBeGreaterThan(hp1);
        expect(hp10).toBeGreaterThan(hp5);
        expect(hp20).toBeGreaterThan(hp10);
    });

    it('scales HP proportionally', () => {
        // At level 5 common: 15 * (1 + 0.06 * 4) * 1.0 = 15 * 1.24 = 18.6 → 19
        expect(getHPAtLevel(BASE_HP, 5, 'common')).toBe(19);

        // At level 10 common: 15 * (1 + 0.06 * 9) * 1.0 = 15 * 1.54 = 23.1 → 23
        expect(getHPAtLevel(BASE_HP, 10, 'common')).toBe(23);

        // At level 20 common: 15 * (1 + 0.06 * 19) * 1.0 = 15 * 2.14 = 32.1 → 32
        expect(getHPAtLevel(BASE_HP, 20, 'common')).toBe(32);
    });

    it('applies fractional CR reduction for sub-level enemies', () => {
        // CR 0.25 = level 0.25: 15 * (1 + 0.06 * -0.75) * 1.0 * 0.75
        // = 15 * 0.955 * 0.75 = 10.746 → 11
        const hp025 = getHPAtLevel(BASE_HP, 0.25, 'common');
        expect(hp025).toBeGreaterThan(0);
        expect(hp025).toBeLessThan(BASE_HP);

        // CR 0.5 = level 0.5: 15 * (1 + 0.06 * -0.5) * 1.0 * 0.85
        // = 15 * 0.97 * 0.85 = 12.3675 → 12
        const hp05 = getHPAtLevel(BASE_HP, 0.5, 'common');
        expect(hp05).toBeGreaterThan(hp025);
        expect(hp05).toBeLessThan(BASE_HP);
    });

    it('combines level scaling with rarity multiplier', () => {
        // Level 10 elite: 15 * 1.54 * 1.07 = 24.717 → 25
        const hp = getHPAtLevel(BASE_HP, 10, 'elite');
        expect(hp).toBe(25);
    });

    it('handles different base HP values', () => {
        const goblinHP = 7;
        const dragonHP = 200;

        expect(getHPAtLevel(goblinHP, 1, 'common')).toBe(7);
        expect(getHPAtLevel(dragonHP, 1, 'common')).toBe(200);
        expect(getHPAtLevel(dragonHP, 20, 'common')).toBeGreaterThan(400);
    });

    it('HP at level 1 common matches current system exactly', () => {
        // Current system: baseHP * rarityMultiplier (for CR >= 1)
        // New system at level 1: baseHP * (1 + 0) * rarityMultiplier * 1.0
        // These should be identical
        const baseHPs = [7, 10, 11, 15, 20, 50, 100];
        const rarities = ['common', 'uncommon', 'elite', 'boss'] as const;

        for (const hp of baseHPs) {
            for (const rarity of rarities) {
                const currentSystem = Math.round(hp * { common: 1.0, uncommon: 1.03, elite: 1.07, boss: 1.12 }[rarity]);
                const newSystem = getHPAtLevel(hp, 1, rarity);
                expect(newSystem).toBe(currentSystem);
            }
        }
    });

    it('never returns negative HP', () => {
        expect(getHPAtLevel(1, 0, 'common')).toBeGreaterThan(0);
        expect(getHPAtLevel(1, 0.25, 'common')).toBeGreaterThan(0);
    });

    it('boss at level 20 has substantially more HP than level 1', () => {
        const hp1 = getHPAtLevel(BASE_HP, 1, 'boss');
        const hp20 = getHPAtLevel(BASE_HP, 20, 'boss');
        // Should be roughly 2x+ due to level scaling + rarity
        expect(hp20).toBeGreaterThan(hp1 * 1.8);
    });
});

// ============================================================================
// getAttackAtLevel
// ============================================================================

describe('getAttackAtLevel', () => {
    it('returns valid structure', () => {
        const result = getAttackAtLevel(BASE_STATS, 1, 'common', 'brute');
        expect(result).toHaveProperty('damageDie');
        expect(result).toHaveProperty('damageModifier');
        expect(result).toHaveProperty('attackBonus');
        expect(typeof result.damageDie).toBe('string');
        expect(typeof result.damageModifier).toBe('number');
        expect(typeof result.attackBonus).toBe('number');
    });

    // Damage die tests
    describe('damage die scaling', () => {
        it('level 1-2 gets d6', () => {
            expect(getAttackAtLevel(BASE_STATS, 1, 'common', 'brute').damageDie).toBe('d6');
            expect(getAttackAtLevel(BASE_STATS, 2, 'common', 'brute').damageDie).toBe('d6');
        });

        it('level 3-5 gets d8', () => {
            expect(getAttackAtLevel(BASE_STATS, 3, 'common', 'brute').damageDie).toBe('d8');
            expect(getAttackAtLevel(BASE_STATS, 5, 'common', 'brute').damageDie).toBe('d8');
        });

        it('level 6-9 gets d10', () => {
            expect(getAttackAtLevel(BASE_STATS, 6, 'common', 'brute').damageDie).toBe('d10');
            expect(getAttackAtLevel(BASE_STATS, 9, 'common', 'brute').damageDie).toBe('d10');
        });

        it('level 10-14 gets d12', () => {
            expect(getAttackAtLevel(BASE_STATS, 10, 'common', 'brute').damageDie).toBe('d12');
            expect(getAttackAtLevel(BASE_STATS, 14, 'common', 'brute').damageDie).toBe('d12');
        });

        it('level 15-19 gets 2d6', () => {
            expect(getAttackAtLevel(BASE_STATS, 15, 'common', 'brute').damageDie).toBe('2d6');
            expect(getAttackAtLevel(BASE_STATS, 19, 'common', 'brute').damageDie).toBe('2d6');
        });

        it('level 20 gets 2d8', () => {
            expect(getAttackAtLevel(BASE_STATS, 20, 'common', 'brute').damageDie).toBe('2d8');
        });
    });

    // Damage modifier tests
    describe('damage modifier', () => {
        it('uses STR modifier for brute archetype', () => {
            // STR 16 → +3 modifier
            const result = getAttackAtLevel(BASE_STATS, 1, 'common', 'brute');
            expect(result.damageModifier).toBe(3); // +3 STR, +0 base at level 1
        });

        it('uses DEX modifier for archer archetype', () => {
            // DEX 12 → +1 modifier
            const result = getAttackAtLevel(BASE_STATS, 1, 'common', 'archer');
            expect(result.damageModifier).toBe(1); // +1 DEX, +0 base at level 1
        });

        it('uses CHA modifier for support archetype', () => {
            // CHA 8 → -1 modifier
            const result = getAttackAtLevel(BASE_STATS, 1, 'common', 'support');
            expect(result.damageModifier).toBe(-1); // -1 CHA, +0 base at level 1
        });

        it('scales with level via base modifier', () => {
            const level1 = getAttackAtLevel(BASE_STATS, 1, 'common', 'brute').damageModifier;
            const level10 = getAttackAtLevel(BASE_STATS, 10, 'common', 'brute').damageModifier;
            const level20 = getAttackAtLevel(BASE_STATS, 20, 'common', 'brute').damageModifier;

            expect(level10).toBeGreaterThan(level1);
            expect(level20).toBeGreaterThan(level10);
        });

        it('high stats produce higher modifier than low stats at same level', () => {
            const high = getAttackAtLevel(HIGH_STATS, 5, 'common', 'brute').damageModifier;
            const low = getAttackAtLevel(LOW_STATS, 5, 'common', 'brute').damageModifier;

            expect(high).toBeGreaterThan(low);
        });

        it('brute with high STR at level 20 has very high modifier', () => {
            // STR 20 → +5, base at level 20: floor(0.2 * 19) = 3
            const result = getAttackAtLevel(HIGH_STATS, 20, 'common', 'brute');
            expect(result.damageModifier).toBe(8); // +5 + 3
        });
    });

    // Attack bonus tests
    describe('attack bonus', () => {
        it('includes proficiency at level 1', () => {
            // Level 1 proficiency: ceil(1 + 0/4) = 1
            // STR 16 → +3, extra: floor(0.2 * 0) = 0
            const result = getAttackAtLevel(BASE_STATS, 1, 'common', 'brute');
            expect(result.attackBonus).toBe(4); // 1 + 3 + 0
        });

        it('increases with level', () => {
            const level1 = getAttackAtLevel(BASE_STATS, 1, 'common', 'brute').attackBonus;
            const level5 = getAttackAtLevel(BASE_STATS, 5, 'common', 'brute').attackBonus;
            const level10 = getAttackAtLevel(BASE_STATS, 10, 'common', 'brute').attackBonus;
            const level20 = getAttackAtLevel(BASE_STATS, 20, 'common', 'brute').attackBonus;

            expect(level5).toBeGreaterThan(level1);
            expect(level10).toBeGreaterThan(level5);
            expect(level20).toBeGreaterThan(level10);
        });

        it('level 5 brute: prof 2 + STR 3 + extra 0 = 5', () => {
            // Prof at 5: ceil(1 + 4/4) = ceil(2) = 2
            // Extra: floor(0.2 * 4) = 0
            const result = getAttackAtLevel(BASE_STATS, 5, 'common', 'brute');
            expect(result.attackBonus).toBe(5); // 2 + 3 + 0
        });

        it('level 10 brute: prof 4 + STR 3 + extra 1 = 8', () => {
            // Prof at 10: ceil(1 + 9/4) = ceil(3.25) = 4
            // Extra: floor(0.2 * 9) = floor(1.8) = 1
            const result = getAttackAtLevel(BASE_STATS, 10, 'common', 'brute');
            expect(result.attackBonus).toBe(8); // 4 + 3 + 1
        });

        it('level 20 brute with high STR: prof 6 + STR 5 + extra 3 = 14', () => {
            // Prof at 20: ceil(1 + 19/4) = ceil(5.75) = 6
            // Extra: floor(0.2 * 19) = floor(3.8) = 3
            const result = getAttackAtLevel(HIGH_STATS, 20, 'common', 'brute');
            expect(result.attackBonus).toBe(14); // 6 + 5 + 3
        });

        it('archer uses DEX for attack bonus', () => {
            const brute = getAttackAtLevel(BASE_STATS, 5, 'common', 'brute').attackBonus;
            const archer = getAttackAtLevel(BASE_STATS, 5, 'common', 'archer').attackBonus;

            // STR 16 → +3, DEX 12 → +1
            // Archer should have lower attack bonus with these stats
            expect(archer).toBeLessThan(brute);
        });
    });

    // Independence from rarity
    it('attack stats do not depend on rarity', () => {
        const common = getAttackAtLevel(BASE_STATS, 5, 'common', 'brute');
        const boss = getAttackAtLevel(BASE_STATS, 5, 'boss', 'brute');

        // Attack scaling is level-based, not rarity-based
        expect(common.damageDie).toBe(boss.damageDie);
        expect(common.damageModifier).toBe(boss.damageModifier);
        expect(common.attackBonus).toBe(boss.attackBonus);
    });
});

// ============================================================================
// getDefenseAtLevel
// ============================================================================

describe('getDefenseAtLevel', () => {
    const BASE_AC = 13; // orc base AC

    it('computes AC from base + DEX + equipment + level', () => {
        // DEX 12 → +1, no equipment, level 1: 13 + 1 + 0 + 0 = 14
        const result = getDefenseAtLevel(BASE_STATS, 1, BASE_AC, {});
        expect(result).toBe(14);
    });

    it('adds level-based AC bonus', () => {
        const ac1 = getDefenseAtLevel(BASE_STATS, 1, BASE_AC, {});
        const ac10 = getDefenseAtLevel(BASE_STATS, 10, BASE_AC, {});
        const ac20 = getDefenseAtLevel(BASE_STATS, 20, BASE_AC, {});

        expect(ac10).toBeGreaterThan(ac1);
        expect(ac20).toBeGreaterThan(ac10);
    });

    it('level 10: base 13 + DEX 1 + level 1 = 15', () => {
        // Level bonus: floor(0.2 * 9) = 1
        expect(getDefenseAtLevel(BASE_STATS, 10, BASE_AC, {})).toBe(15);
    });

    it('level 20: base 13 + DEX 1 + level 3 = 17', () => {
        // Level bonus: floor(0.2 * 19) = 3
        expect(getDefenseAtLevel(BASE_STATS, 20, BASE_AC, {})).toBe(17);
    });

    it('includes armor AC bonus', () => {
        const result = getDefenseAtLevel(BASE_STATS, 1, BASE_AC, {
            armor: { acBonus: 5 } as any
        });
        expect(result).toBe(19); // 13 + 1 + 5 + 0
    });

    it('includes shield AC bonus', () => {
        const result = getDefenseAtLevel(BASE_STATS, 1, BASE_AC, {
            shield: { acBonus: 2 } as any
        });
        expect(result).toBe(16); // 13 + 1 + 2 + 0
    });

    it('includes both armor and shield', () => {
        const result = getDefenseAtLevel(BASE_STATS, 1, BASE_AC, {
            armor: { acBonus: 5 } as any,
            shield: { acBonus: 2 } as any
        });
        expect(result).toBe(21); // 13 + 1 + 5 + 2 + 0
    });

    it('uses DEX modifier for AC', () => {
        const lowDex: AbilityScores = { ...BASE_STATS, DEX: 8 };
        // DEX 8 → -1
        const result = getDefenseAtLevel(lowDex, 1, BASE_AC, {});
        expect(result).toBe(12); // 13 + (-1) + 0
    });

    it('high DEX gives higher AC', () => {
        const highDex: AbilityScores = { ...BASE_STATS, DEX: 20 };
        const lowDex: AbilityScores = { ...BASE_STATS, DEX: 8 };

        const highAC = getDefenseAtLevel(highDex, 1, BASE_AC, {});
        const lowAC = getDefenseAtLevel(lowDex, 1, BASE_AC, {});

        expect(highAC).toBeGreaterThan(lowAC);
    });

    it('level 1 with no equipment matches current system', () => {
        // Current: baseAC + DEX modifier
        // New at level 1: baseAC + DEX modifier + 0 (no level bonus)
        const currentSystem = BASE_AC + Math.floor((BASE_STATS.DEX - 10) / 2);
        const newSystem = getDefenseAtLevel(BASE_STATS, 1, BASE_AC, {});
        expect(newSystem).toBe(currentSystem);
    });
});

// ============================================================================
// getDamageModifierForStats
// ============================================================================

describe('getDamageModifierForStats', () => {
    it('returns STR modifier for brute', () => {
        // STR 16 → +3
        expect(getDamageModifierForStats(BASE_STATS, 1, 'brute')).toBe(3);
    });

    it('returns DEX modifier for archer', () => {
        // DEX 12 → +1
        expect(getDamageModifierForStats(BASE_STATS, 1, 'archer')).toBe(1);
    });

    it('returns CHA modifier for support', () => {
        // CHA 8 → -1
        expect(getDamageModifierForStats(BASE_STATS, 1, 'support')).toBe(-1);
    });

    it('scales with level', () => {
        const level1 = getDamageModifierForStats(BASE_STATS, 1, 'brute');
        const level10 = getDamageModifierForStats(BASE_STATS, 10, 'brute');
        const level20 = getDamageModifierForStats(BASE_STATS, 20, 'brute');

        expect(level10).toBeGreaterThan(level1);
        expect(level20).toBeGreaterThan(level10);
    });

    it('uses actual ability scores not hardcoded values', () => {
        // High STR brute should have much higher modifier than low STR brute
        const high = getDamageModifierForStats(HIGH_STATS, 1, 'brute');
        const low = getDamageModifierForStats(LOW_STATS, 1, 'brute');

        expect(high).toBe(5);  // STR 20 → +5
        expect(low).toBe(-1);  // STR 8 → -1
        expect(high - low).toBe(6);
    });

    it('matches getAttackAtLevel damageModifier', () => {
        for (let level = 1; level <= 20; level++) {
            const direct = getDamageModifierForStats(BASE_STATS, level, 'brute');
            const fromAttack = getAttackAtLevel(BASE_STATS, level, 'common', 'brute').damageModifier;
            expect(direct).toBe(fromAttack);
        }
    });
});

// ============================================================================
// Integration: Stat level separation scenarios
// ============================================================================

describe('stat level separation scenarios', () => {
    const orcHP = 15;
    const orcAC = 13;

    it('tank: high HP level, normal attack, high defense', () => {
        // Tank has hpLevel=15, attackLevel=5, defenseLevel=15
        const tankHP = getHPAtLevel(orcHP, 15, 'elite');
        const tankAttack = getAttackAtLevel(BASE_STATS, 5, 'elite', 'brute');
        const tankDefense = getDefenseAtLevel(BASE_STATS, 15, orcAC, {});

        // HP should be high (level 15 scaling)
        expect(tankHP).toBeGreaterThan(25);
        // Attack should be moderate (level 5)
        expect(tankAttack.damageDie).toBe('d8');
        // Defense should be high (level 15): 13 + 1 + floor(0.2 * 14) = 13 + 1 + 2 = 16
        expect(tankDefense).toBeGreaterThanOrEqual(16);
    });

    it('glass cannon: low HP, high attack, low defense', () => {
        // Glass cannon has hpLevel=3, attackLevel=15, defenseLevel=3
        const glassHP = getHPAtLevel(orcHP, 3, 'uncommon');
        const glassAttack = getAttackAtLevel(BASE_STATS, 15, 'uncommon', 'archer');
        const glassDefense = getDefenseAtLevel(BASE_STATS, 3, orcAC, {});

        // HP should be relatively low
        expect(glassHP).toBeLessThan(20);
        // Attack should be high (2d6 at level 15)
        expect(glassAttack.damageDie).toBe('2d6');
        // Defense should be low
        expect(glassDefense).toBeLessThan(15);
    });

    it('brute: high HP, high attack, low defense', () => {
        // Brute has hpLevel=15, attackLevel=15, defenseLevel=5
        const bruteHP = getHPAtLevel(orcHP, 15, 'common');
        const bruteAttack = getAttackAtLevel(BASE_STATS, 15, 'common', 'brute');
        const bruteDefense = getDefenseAtLevel(BASE_STATS, 5, orcAC, {});

        // HP should be high
        expect(bruteHP).toBeGreaterThan(25);
        // Attack should be high
        expect(bruteAttack.damageDie).toBe('2d6');
        // Level 15: STR 16 → +3, base: floor(0.2 * 14) = 2 → total 5
        expect(bruteAttack.damageModifier).toBeGreaterThanOrEqual(5);
        // Defense should be moderate
        expect(bruteDefense).toBeLessThanOrEqual(15);
    });

    it('standard: all at same level produces coherent stats', () => {
        // All at level 10
        const hp = getHPAtLevel(orcHP, 10, 'common');
        const attack = getAttackAtLevel(BASE_STATS, 10, 'common', 'brute');
        const defense = getDefenseAtLevel(BASE_STATS, 10, orcAC, {});

        // All stats should reflect level 10
        expect(hp).toBe(23);
        expect(attack.damageDie).toBe('d12');
        expect(attack.attackBonus).toBe(8);
        expect(defense).toBe(15);
    });
});
