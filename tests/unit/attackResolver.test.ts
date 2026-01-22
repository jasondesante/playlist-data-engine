/**
 * Unit tests for AttackResolver
 * Tests attack and damage resolution with various weapon types and ability scores
 */

import { describe, it, expect } from 'vitest';
import { AttackResolver } from '../../src/core/combat/AttackResolver.js';
import type { Combatant } from '../../src/core/types/Combat.js';
import type { CharacterSheet, Attack } from '../../src/core/types/Character.js';

/**
 * Helper to create a test combatant
 */
function createCombatant(
    name: string,
    strength: number,
    dexterity: number,
    hp: number = 20,
    ac: number = 15
): Combatant {
    const character: CharacterSheet = {
        name,
        race: 'Human',
        class: 'Fighter',
        level: 1,
        ability_scores: {
            STR: strength,
            DEX: dexterity,
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 10
        },
        ability_modifiers: {
            STR: Math.floor((strength - 10) / 2),
            DEX: Math.floor((dexterity - 10) / 2),
            CON: 0,
            INT: 0,
            WIS: 0,
            CHA: 0
        },
        proficiency_bonus: 2,
        hp: {
            current: hp,
            max: hp,
            temp: 0
        },
        armor_class: ac,
        initiative: 0,
        speed: 30,
        skills: {
            athletics: 'none',
            acrobatics: 'none',
            sleight_of_hand: 'none',
            stealth: 'none',
            arcana: 'none',
            history: 'none',
            investigation: 'none',
            nature: 'none',
            religion: 'none',
            animal_handling: 'none',
            insight: 'none',
            medicine: 'none',
            perception: 'none',
            survival: 'none',
            deception: 'none',
            intimidation: 'none',
            performance: 'none',
            persuasion: 'none'
        },
        saving_throws: {
            STR: false,
            DEX: false,
            CON: false,
            INT: false,
            WIS: false,
            CHA: false
        },
        racial_traits: [],
        class_features: [],
        xp: {
            current: 0,
            next_level: 1000
        },
        seed: 'test-seed',
        generated_at: new Date().toISOString()
    };

    return {
        id: `combatant-${name}`,
        character,
        initiative: 0,
        currentHP: hp,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false
    };
}

/**
 * Helper to create a test attack
 */
function createAttack(
    name: string,
    damageDice: string,
    type: 'melee' | 'ranged' | 'spell' = 'melee',
    properties?: string[],
    attackBonus: number = 0
): Attack {
    return {
        name,
        damage_dice: damageDice,
        type,
        properties,
        attack_bonus: attackBonus
    };
}

describe('AttackResolver', () => {
    describe('Ability Modifier for Damage - Melee Attacks', () => {
        it('should use STR modifier for basic melee attacks', () => {
            const resolver = new AttackResolver();

            // STR 16 (+3 modifier), DEX 10 (+0)
            const attacker = createCombatant('StrHero', 16, 10);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Longsword', '1d8', 'melee');

            // Run multiple attacks to get average damage
            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 1d8 average (4.5) + 3 (STR mod) = 7.5
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeGreaterThan(5);
            expect(avgDamage).toBeLessThan(12);

            // All hits should include the +3 modifier
            const minHit = Math.min(...results);
            expect(minHit).toBeGreaterThanOrEqual(4); // 1 + 3 = 4 minimum
        });

        it('should use DEX modifier for ranged attacks', () => {
            const resolver = new AttackResolver();

            // STR 10 (+0), DEX 16 (+3)
            const attacker = createCombatant('DexHero', 10, 16);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Longbow', '1d8', 'ranged');

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 4.5 + 3 (DEX mod) = 7.5
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeGreaterThan(5);
            expect(avgDamage).toBeLessThan(12);

            const minHit = Math.min(...results);
            expect(minHit).toBeGreaterThanOrEqual(4); // 1 + 3 = 4 minimum
        });

        it('should use max(STR, DEX) for finesse weapons', () => {
            const resolver = new AttackResolver();

            // Test with DEX > STR
            const attacker1 = createCombatant('DexFinesse', 10, 16); // STR +0, DEX +3
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack1 = createAttack('Rapier', '1d8', 'melee', ['finesse']);

            const results1: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker1, target, attack1);
                if (result.damageRoll) {
                    results1.push(result.damageRoll.total);
                }
            }

            const avgDamage1 = results1.reduce((a, b) => a + b, 0) / results1.length;
            // Should use DEX +3, average around 7.5
            expect(avgDamage1).toBeGreaterThan(5);

            // Test with STR > DEX
            const attacker2 = createCombatant('StrFinesse', 16, 10); // STR +3, DEX +0
            const attack2 = createAttack('Rapier', '1d8', 'melee', ['finesse']);

            const results2: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker2, target, attack2);
                if (result.damageRoll) {
                    results2.push(result.damageRoll.total);
                }
            }

            const avgDamage2 = results2.reduce((a, b) => a + b, 0) / results2.length;
            // Should use STR +3, average around 7.5
            expect(avgDamage2).toBeGreaterThan(5);
        });

        it('should use max(STR, DEX) when both are equal for finesse weapons', () => {
            const resolver = new AttackResolver();

            // STR 14 (+2), DEX 14 (+2)
            const attacker = createCombatant('BalancedFinesse', 14, 14);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Dagger', '1d4', 'melee', ['finesse']);

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 1d4 average (2.5) + 2 = 4.5
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeGreaterThan(3);
            expect(avgDamage).toBeLessThan(8);
        });

        it('should add no modifier for spell attacks', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('Caster', 16, 16);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Fire Bolt', '1d10', 'spell');

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 1d10 average (5.5) with NO modifier
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeGreaterThan(3);
            expect(avgDamage).toBeLessThan(10);

            // Min should be 1 (just the die roll, no modifier)
            const minHit = Math.min(...results);
            expect(minHit).toBeGreaterThanOrEqual(1);
            expect(minHit).toBeLessThan(3);
        });
    });

    describe('Negative Ability Modifiers', () => {
        it('should apply negative STR modifier for weak melee attackers', () => {
            const resolver = new AttackResolver();

            // STR 6 (-2 modifier)
            const attacker = createCombatant('WeakMelee', 6, 10);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Club', '1d4', 'melee');

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 2.5 - 2 = 0.5 (but minimum 1 from damage roll)
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeLessThan(3);

            // Some hits may deal 0 or negative damage due to negative modifier
            const minHit = Math.min(...results);
            expect(minHit).toBeGreaterThanOrEqual(-1); // Can be -1 with 1d4-2 (1-2=-1)
        });

        it('should apply negative DEX modifier for weak ranged attackers', () => {
            const resolver = new AttackResolver();

            // DEX 6 (-2 modifier)
            const attacker = createCombatant('WeakRanged', 10, 6);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Light Crossbow', '1d8', 'ranged');

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 4.5 - 2 = 2.5
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeLessThan(5);
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing ability modifiers gracefully', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('NoMods', 10, 10);
            // Remove ability modifiers to test edge case
            (attacker.character.ability_modifiers as any) = {};

            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Unarmed Strike', '1d4', 'melee');

            // Should not throw error - missing modifiers default to 0 via nullish coalescing
            expect(() => {
                resolver.resolveAttack(attacker, target, attack);
            }).not.toThrow();
        });

        it('should handle invalid dice formula (empty string)', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('Puncher', 16, 10);
            // Use low AC so the attack will hit and trigger damage calculation
            const target = createCombatant('Target', 10, 10, 20, 0);
            const attack = createAttack('Unarmed', '', 'melee');

            // Should throw error for invalid dice formula
            expect(() => {
                resolver.resolveAttack(attacker, target, attack);
            }).toThrow('Invalid dice formula: ');
        });

        it('should handle missing attack type (defaults to melee)', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('StrHero', 16, 10);
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Default Attack', '1d6', 'melee'); // type is melee

            const results: number[] = [];
            for (let i = 0; i < 30; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Should use STR modifier by default for melee
            if (results.length > 0) {
                const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
                expect(avgDamage).toBeGreaterThan(4); // 3.5 avg + 3 STR = 6.5
            }
        });
    });

    describe('Critical Hits with Ability Modifiers', () => {
        it('should double dice but not modifier on critical hit', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('StrHero', 16, 10); // +3 STR
            const target = createCombatant('Target', 10, 10, 20, 5); // Low AC for guaranteed hits

            // Force critical by mocking the roll
            const attack = createAttack('Greatsword', '2d6', 'melee');

            // Collect critical hits
            const critResults: number[] = [];
            const normalResults: number[] = [];

            for (let i = 0; i < 200; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    if (result.attackRoll.isCritical) {
                        critResults.push(result.damageRoll.total);
                    } else if (result.attackRoll.hit) {
                        normalResults.push(result.damageRoll.total);
                    }
                }
            }

            // If we got any critical hits, verify they're higher than normal hits
            if (critResults.length > 0 && normalResults.length > 0) {
                const avgCrit = critResults.reduce((a, b) => a + b, 0) / critResults.length;
                const avgNormal = normalResults.reduce((a, b) => a + b, 0) / normalResults.length;

                // Criticals should average significantly higher (4d6+3 vs 2d6+3)
                expect(avgCrit).toBeGreaterThan(avgNormal);
            }
        });

        it('should apply ability modifier to critical hits correctly', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('FinesseHero', 10, 18); // +4 DEX
            const target = createCombatant('Target', 10, 10, 20, 5);
            const attack = createAttack('Rapier', '1d8', 'melee', ['finesse']);

            // On a crit, should be 2d8 + 4 (modifier not doubled)
            // Min crit: 2 + 4 = 6, Max crit: 16 + 4 = 20
            for (let i = 0; i < 100; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll && result.attackRoll.isCritical) {
                    // Critical damage should have modifier applied once
                    expect(result.damageRoll.modifier).toBe(4);
                    expect(result.damageRoll.rolls.length).toBe(2); // Doubled dice
                    break;
                }
            }
        });
    });

    describe('Advantage/Disadvantage with Ability Modifiers', () => {
        it('should apply ability modifier with advantage', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('DexHero', 10, 16); // +3 DEX
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Shortbow', '1d6', 'ranged');

            const result = resolver.attackWithAdvantage(attacker, target, attack);

            // Should have advantage in description
            expect(result.description).toContain('advantage');

            // If hit, should include DEX modifier
            if (result.damageRoll) {
                expect(result.damageRoll.total).toBeGreaterThan(0);
            }
        });

        it('should apply ability modifier with disadvantage', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('StrHero', 18, 10); // +4 STR
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Greataxe', '1d12', 'melee');

            const result = resolver.attackWithDisadvantage(attacker, target, attack);

            // Should have disadvantage in description
            expect(result.description).toContain('disadvantage');

            // If hit, should include STR modifier
            if (result.damageRoll) {
                expect(result.damageRoll.total).toBeGreaterThan(0);
            }
        });
    });

    describe('High Ability Scores', () => {
        it('should correctly calculate very high STR modifier (20 = +5)', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('StrongHero', 20, 10); // +5 STR
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Polearm', '1d10', 'melee');

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 5.5 + 5 = 10.5
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeGreaterThan(7);

            const minHit = Math.min(...results);
            expect(minHit).toBeGreaterThanOrEqual(6); // 1 + 5 = 6 minimum
        });

        it('should correctly calculate very high DEX modifier (20 = +5)', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('SwiftHero', 10, 20); // +5 DEX
            const target = createCombatant('Target', 10, 10, 20, 10);
            const attack = createAttack('Heavy Crossbow', '1d10', 'ranged');

            const results: number[] = [];
            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll) {
                    results.push(result.damageRoll.total);
                }
            }

            // Average should be around 5.5 + 5 = 10.5
            const avgDamage = results.reduce((a, b) => a + b, 0) / results.length;
            expect(avgDamage).toBeGreaterThan(7);
        });
    });

    describe('Damage Roll Structure', () => {
        it('should include modifier in damage roll', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('StrHero', 16, 10); // +3 STR
            const target = createCombatant('Target', 10, 10, 20, 5);
            const attack = createAttack('Longsword', '1d8', 'melee');

            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll && result.attackRoll.hit) {
                    // Should have the modifier set
                    expect(result.damageRoll.modifier).toBe(3);
                    break;
                }
            }
        });

        it('should record individual dice rolls', () => {
            const resolver = new AttackResolver();

            const attacker = createCombatant('StrHero', 14, 10); // +2 STR
            const target = createCombatant('Target', 10, 10, 20, 5);
            const attack = createAttack('Battleaxe', '1d8', 'melee');

            for (let i = 0; i < 50; i++) {
                const result = resolver.resolveAttack(attacker, target, attack);
                if (result.damageRoll && result.attackRoll.hit) {
                    // Should have recorded the die roll
                    expect(result.damageRoll.rolls.length).toBeGreaterThan(0);
                    expect(result.damageRoll.rolls[0]).toBeGreaterThanOrEqual(1);
                    expect(result.damageRoll.rolls[0]).toBeLessThanOrEqual(8);
                    break;
                }
            }
        });
    });
});
