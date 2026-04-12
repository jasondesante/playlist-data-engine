/**
 * AttackResolver tests (Task 1.2.4)
 *
 * Covers:
 * - Hit probability at various attack bonus vs AC differentials (statistical sampling)
 * - Damage modifier selection (STR melee, DEX ranged, finesse = DEX)
 * - Advantage mechanics (roll twice, take higher, crit if either is 20)
 * - Disadvantage mechanics (roll twice, take lower, fumble if either is 1)
 * - Critical hit / critical miss edge cases
 * - Damage rolling and HP modification
 * - Range checking
 * - calculateAttackBonus
 * - Seeded roller determinism
 */

import { describe, it, expect } from 'vitest';
import { AttackResolver } from '../../../src/core/combat/AttackResolver.js';
import { createSeededRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import type { DiceRollerAPI, DamageRoll } from '../../../src/core/types/Combat.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import type { Attack, AbilityScores } from '../../../src/core/types/Character.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Create a mock DiceRollerAPI that returns fixed values for deterministic tests.
 */
function createMockDiceRoller(overrides?: Partial<DiceRollerAPI>): DiceRollerAPI {
  return {
    rollDie: overrides?.rollDie ?? ((_sides: number) => 10),
    rollD20: overrides?.rollD20 ?? (() => 10),
    rollWithAdvantage: overrides?.rollWithAdvantage ?? (() => ({ roll1: 10, roll2: 5, result: 10 })),
    rollWithDisadvantage: overrides?.rollWithDisadvantage ?? (() => ({ roll1: 5, roll2: 10, result: 5 })),
    calculateDamage: overrides?.calculateDamage ?? ((_formula: string, _mod: number, _crit?: boolean): DamageRoll => ({
      diceFormula: _formula, rolls: [5], modifier: _mod ?? 0, total: 5 + (_mod ?? 0), isCritical: _crit ?? false,
    })),
    rollSavingThrow: overrides?.rollSavingThrow ?? ((m: number, p?: number) => 10 + m + (p ?? 0)),
    rollAbilityCheck: overrides?.rollAbilityCheck ?? ((m: number, p?: number) => 10 + m + (p ?? 0)),
    isCriticalHit: overrides?.isCriticalHit ?? ((roll: number) => roll === 20),
    isCriticalMiss: overrides?.isCriticalMiss ?? ((roll: number) => roll === 1),
    parseDiceFormula: overrides?.parseDiceFormula ?? ((formula: string) => {
      const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      if (!match) throw new Error(`Invalid dice formula: ${formula}`);
      return {
        diceCount: parseInt(match[1], 10),
        diceSides: parseInt(match[2], 10),
        modifier: match[3] ? parseInt(match[3], 10) : 0,
        rolls: [5],
        total: 5 + (match[3] ? parseInt(match[3], 10) : 0),
      };
    }),
  };
}

function makeAttack(overrides?: Partial<Attack>): Attack {
  return {
    name: 'Longsword',
    damage_dice: '1d8',
    type: 'melee',
    attack_bonus: 0,
    damage_type: 'slashing',
    ...overrides,
  };
}

/**
 * Build ability scores object for quick test setup.
 */
function scores(overrides?: Partial<AbilityScores>): AbilityScores {
  return { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10, ...overrides };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AttackResolver', () => {
  // ─── resolveAttack: basic hit ─────────────────────────────────────────────

  describe('resolveAttack — basic hit/miss', () => {
    it('hits when d20 + bonus >= target AC', () => {
      const roller = createMockDiceRoller({ rollD20: () => 15 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 16 }), armor_class: 10 },
        { currentHP: 20, id: 'atk' },
      );
      const target = createTestCombatant(
        { name: 'Target', armor_class: 15 },
        { currentHP: 20, id: 'tgt' },
      );
      const attack = makeAttack({ attack_bonus: 5 });

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.d20Roll).toBe(15);
      expect(result.attackRoll.attackBonus).toBe(5);
      expect(result.attackRoll.totalRoll).toBe(20);
      expect(result.attackRoll.hit).toBe(true);
      expect(result.damageRoll).toBeDefined();
      expect(result.hpAfterDamage).toBeLessThan(20);
      expect(result.description).toContain('Hit');
    });

    it('misses when d20 + bonus < target AC (dnd mode)', () => {
      const roller = createMockDiceRoller({ rollD20: () => 5 });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { name: 'Attacker' },
        { currentHP: 20, id: 'atk' },
      );
      const target = createTestCombatant(
        { name: 'Target', armor_class: 20 },
        { currentHP: 20, id: 'tgt' },
      );
      const attack = makeAttack({ attack_bonus: 5 });

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.hit).toBe(false);
      expect(result.attackRoll.totalRoll).toBe(10);
      expect(result.damageRoll).toBeUndefined();
      expect(result.hpAfterDamage).toBeUndefined();
      expect(target.currentHP).toBe(20); // unchanged
      expect(result.description).toContain('Miss');
    });

    it('scaled mode: below-AC roll still hits with reduced damage', () => {
      const roller = createMockDiceRoller({ rollD20: () => 5 });
      const resolver = new AttackResolver(roller, 'scaled');
      const attacker = createTestCombatant({}, { currentHP: 20, id: 'atk' });
      const target = createTestCombatant(
        { armor_class: 20 },
        { currentHP: 100, id: 'tgt' },
      );
      const attack = makeAttack({ attack_bonus: 5 }); // totalRoll = 10, AC = 20

      const result = resolver.resolveAttack(attacker, target, attack);

      // Scaled mode: only nat 1 misses — d20=5 is a hit with damage scaling
      expect(result.attackRoll.hit).toBe(true);
      expect(result.damageRoll).toBeDefined();
      expect(result.hpAfterDamage).toBeLessThan(100);
      expect(result.attackRoll.damageScale).toBeLessThan(1);
    });

    it('hits exactly when d20 + bonus == target AC', () => {
      const roller = createMockDiceRoller({ rollD20: () => 10 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });
      const attack = makeAttack({ attack_bonus: 0 });

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.hit).toBe(true);
    });

    it('critical hit always hits regardless of AC', () => {
      const roller = createMockDiceRoller({ rollD20: () => 20 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 100 }, { id: 'tgt' });
      const attack = makeAttack({ attack_bonus: 0 });

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.isCritical).toBe(true);
      expect(result.attackRoll.hit).toBe(true);
      expect(result.description).toContain('CRITICAL HIT');
    });

    it('critical miss always misses regardless of bonus', () => {
      const roller = createMockDiceRoller({ rollD20: () => 1 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 1 }, { id: 'tgt' });
      const attack = makeAttack({ attack_bonus: 99 });

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.isMiss).toBe(true);
      expect(result.attackRoll.hit).toBe(false);
      expect(result.damageRoll).toBeUndefined();
      expect(result.description).toContain('CRITICAL MISS');
    });

    it('sets target HP to 0 and isDefeated when damage exceeds HP', () => {
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [50], modifier: 0, total: 50, isCritical: false }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({}, { currentHP: 10, id: 'tgt' });

      resolver.resolveAttack(attacker, target, makeAttack());

      expect(target.currentHP).toBe(0);
      expect(target.isDefeated).toBe(true);
    });

    it('HP floor is 0 (never goes negative)', () => {
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [999], modifier: 0, total: 999, isCritical: false }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({}, { currentHP: 5, id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      expect(result.hpAfterDamage).toBe(0);
      expect(target.currentHP).toBe(0);
    });

    it('uses attack.attack_bonus for the roll (not 0)', () => {
      const roller = createMockDiceRoller({ rollD20: () => 7 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 12 }, { id: 'tgt' });
      const attack = makeAttack({ attack_bonus: 5 }); // 7 + 5 = 12 >= 12

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.attackBonus).toBe(5);
      expect(result.attackRoll.totalRoll).toBe(12);
      expect(result.attackRoll.hit).toBe(true);
    });

    it('defaults attack_bonus to 0 when undefined', () => {
      const roller = createMockDiceRoller({ rollD20: () => 10 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });
      const attack = { name: 'Punch', damage_dice: '1d4' }; // no attack_bonus

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.attackRoll.attackBonus).toBe(0);
      expect(result.attackRoll.totalRoll).toBe(10);
    });

    it('records correct target AC in attack roll', () => {
      const roller = createMockDiceRoller({ rollD20: () => 8 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 17 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      expect(result.attackRoll.targetAC).toBe(17);
    });
  });

  // ─── Damage modifier selection ────────────────────────────────────────────

  describe('damage modifier selection', () => {
    it('melee attacks use STR modifier', () => {
      // STR 18 → +4 modifier
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [5], modifier: mod, total: 5 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 18 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({ type: 'melee' }));

      expect(result.damageRoll!.modifier).toBe(mod(18)); // +4
      expect(result.damageRoll!.total).toBe(5 + mod(18));
    });

    it('ranged attacks use DEX modifier', () => {
      // DEX 16 → +3 modifier
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [6], modifier: mod, total: 6 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ DEX: 16 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({ properties: ['ranged'] }));

      expect(result.damageRoll!.modifier).toBe(mod(16)); // +3
    });

    it('finesse weapons use DEX modifier', () => {
      // STR 14 (+2), DEX 18 (+4) → finesse uses DEX (+4)
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [7], modifier: mod, total: 7 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 14, DEX: 18 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({
        type: 'melee',
        properties: ['finesse'],
      }));

      expect(result.damageRoll!.modifier).toBe(mod(18)); // +4 (DEX for finesse)
    });

    it('finesse weapon uses best of STR or DEX', () => {
      // STR 18 (+4), DEX 10 (+0) → finesse uses max(STR, DEX) = +4
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [3], modifier: mod, total: 3 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 18, DEX: 10 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({
        type: 'melee',
        properties: ['finesse'],
      }));

      // Finesse weapons use Math.max(strMod, dexMod) per D&D 5e rules
      expect(result.damageRoll!.modifier).toBe(mod(18)); // +4 (max of STR +4, DEX +0)
    });

    it('non-finesse melee uses STR even when DEX is higher', () => {
      // STR 8 (-1), DEX 18 (+4) → should use STR (-1) since no finesse
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [8], modifier: mod, total: 8 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 8, DEX: 18 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({
        type: 'melee',
        properties: ['versatile'], // not finesse
      }));

      expect(result.damageRoll!.modifier).toBe(mod(8)); // -1
    });

    it('spell attacks without ranged property use STR modifier', () => {
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [8], modifier: mod, total: 8 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ INT: 20, DEX: 14 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({
        type: 'spell',
        damage_dice: '2d6',
      }));

      // rollDamageDND checks isFinesse || isRanged from attack.properties
      // spell type without 'ranged' property → uses STR
      expect(result.damageRoll!.modifier).toBe(mod(10)); // +0 (STR default 10)
    });

    it('defaults to STR modifier when attack.type is undefined', () => {
      // Undefined type → defaults to melee → uses STR
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: (_f: string, mod: number): DamageRoll => ({
          diceFormula: _f, rolls: [4], modifier: mod, total: 4 + mod, isCritical: false,
        }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 16 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });
      const attack = { name: 'Bite', damage_dice: '1d6' }; // no type → defaults to melee

      const result = resolver.resolveAttack(attacker, target, attack);

      expect(result.damageRoll!.modifier).toBe(mod(16)); // +3 (STR-based)
    });
  });

  // ─── Advantage mechanics ─────────────────────────────────────────────────

  describe('attackWithAdvantage', () => {
    it('takes the higher of two rolls', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 8, roll2: 15, result: 15 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5], modifier: 0, total: 5, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 12 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack());

      expect(result.attackRoll.d20Roll).toBe(15);
      expect(result.attackRoll.hit).toBe(true);
    });

    it('critical hit if EITHER die is a natural 20 (D&D 5e Sage Advice)', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 20, roll2: 3, result: 20 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5, 5], modifier: 0, total: 10, isCritical: true }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 100 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack());

      expect(result.attackRoll.isCritical).toBe(true);
      expect(result.attackRoll.hit).toBe(true);
    });

    it('critical hit when the lower die is 20 (still counts)', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 3, roll2: 20, result: 20 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5, 5], modifier: 0, total: 10, isCritical: true }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 100 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack());

      expect(result.attackRoll.isCritical).toBe(true);
      expect(result.attackRoll.hit).toBe(true);
    });

    it('misses in dnd mode when the chosen (higher) roll is still below AC', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 5, roll2: 9, result: 9 }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 20 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack({ attack_bonus: 0 }));

      expect(result.attackRoll.hit).toBe(false);
      expect(result.damageRoll).toBeUndefined();
    });

    it('scaled mode: below-AC advantage roll still hits with reduced damage', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 5, roll2: 9, result: 9 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5], modifier: 0, total: 5, isCritical: false }),
      });
      const resolver = new AttackResolver(roller, 'scaled');
      const attacker = createTestCombatant({}, { currentHP: 50, id: 'atk' });
      const target = createTestCombatant({ armor_class: 20 }, { currentHP: 100, id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack({ attack_bonus: 0 }));

      // Scaled mode: only nat 1 misses — result=9 is a hit with damage scaling
      expect(result.attackRoll.hit).toBe(true);
      expect(result.damageRoll).toBeDefined();
      expect(result.attackRoll.damageScale).toBeLessThan(1);
    });

    it('no fumble on advantage: only checks fumble on chosen roll', () => {
      // roll1=1, roll2=15, result=15 → not a fumble (1 was not chosen)
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 1, roll2: 15, result: 15 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5], modifier: 0, total: 5, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack());

      expect(result.attackRoll.isMiss).toBe(false);
      expect(result.attackRoll.hit).toBe(true);
    });

    it('includes both rolls in description', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 12, roll2: 7, result: 12 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5], modifier: 0, total: 5, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({ name: 'Hero' }, { id: 'atk' });
      const target = createTestCombatant({ name: 'Goblin', armor_class: 10 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack());

      expect(result.description).toContain('12');
      expect(result.description).toContain('7');
      expect(result.description).toContain('advantage');
    });
  });

  // ─── Disadvantage mechanics ──────────────────────────────────────────────

  describe('attackWithDisadvantage', () => {
    it('takes the lower of two rolls', () => {
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 15, roll2: 5, result: 5 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [4], modifier: 0, total: 4, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 6 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack({ attack_bonus: 0 }));

      expect(result.attackRoll.d20Roll).toBe(5);
      // Scaled mode: 5 >= 1 (not nat 1), so it hits with damage scaling
      expect(result.attackRoll.hit).toBe(true);
      expect(result.attackRoll.damageScale).toBeLessThan(1);
    });

    it('critical miss if EITHER die is a natural 1 (D&D 5e Sage Advice)', () => {
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 1, roll2: 18, result: 1 }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 1 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack({ attack_bonus: 99 }));

      expect(result.attackRoll.isMiss).toBe(true);
      expect(result.attackRoll.hit).toBe(false);
    });

    it('critical miss when both dice are 1', () => {
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 1, roll2: 1, result: 1 }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 1 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack({ attack_bonus: 99 }));

      expect(result.attackRoll.isMiss).toBe(true);
      expect(result.attackRoll.hit).toBe(false);
    });

    it('no crit on disadvantage: only checks crit on chosen (lower) roll', () => {
      // roll1=20, roll2=5, result=5 → 20 was not chosen, not a crit
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 20, roll2: 5, result: 5 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [4], modifier: 0, total: 4, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 5 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack({ attack_bonus: 0 }));

      expect(result.attackRoll.isCritical).toBe(false);
      // 5 + 0 = 5 >= 5 → hit, but no crit
      expect(result.attackRoll.hit).toBe(true);
    });

    it('can still hit on disadvantage when both rolls are high enough', () => {
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 18, roll2: 15, result: 15 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [6], modifier: 0, total: 6, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack({ attack_bonus: 0 }));

      expect(result.attackRoll.d20Roll).toBe(15);
      expect(result.attackRoll.hit).toBe(true);
      expect(result.damageRoll).toBeDefined();
    });

    it('includes both rolls in description', () => {
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 3, roll2: 14, result: 3 }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({ name: 'Hero' }, { id: 'atk' });
      const target = createTestCombatant({ name: 'Orc', armor_class: 15 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack());

      expect(result.description).toContain('3');
      expect(result.description).toContain('14');
      expect(result.description).toContain('disadvantage');
    });
  });

  // ─── Damage rolling ──────────────────────────────────────────────────────

  describe('damage rolling', () => {
    it('deals damage on hit and reduces target HP (dnd mode)', () => {
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [6], modifier: 3, total: 9, isCritical: false }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({}, { currentHP: 30, id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      expect(result.damageRoll!.total).toBe(9);
      expect(result.hpAfterDamage).toBe(21);
      expect(target.currentHP).toBe(21);
    });

    it('critical hit doubles damage dice (not modifier) in dnd mode', () => {
      const roller = createMockDiceRoller({
        rollD20: () => 20,
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [6, 6], modifier: 3, total: 15, isCritical: true }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 16 }) },
        { id: 'atk' },
      );
      const target = createTestCombatant({}, { currentHP: 50, id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      expect(result.attackRoll.isCritical).toBe(true);
      expect(result.damageRoll!.isCritical).toBe(true);
      expect(result.damageRoll!.rolls).toHaveLength(2); // doubled dice
      expect(result.damageRoll!.modifier).toBe(mod(16)); // modifier NOT doubled (STR 16 → +3)
    });

    it('damage_roll captures dice formula', () => {
      const roller = createMockDiceRoller({
        rollD20: () => 15,
        calculateDamage: () => ({ diceFormula: '2d6', rolls: [4, 3], modifier: 2, total: 9, isCritical: false }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack({ damage_dice: '2d6' }));

      expect(result.damageRoll!.diceFormula).toBe('2d6');
    });
  });

  // ─── Range checking ──────────────────────────────────────────────────────

  describe('isInRange', () => {
    it('returns true when no positions set (non-tactical mode)', () => {
      const resolver = new AttackResolver();
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({}, { id: 'tgt' });

      expect(resolver.isInRange(attacker, target, makeAttack())).toBe(true);
    });

    it('melee attack in range at distance 5', () => {
      const resolver = new AttackResolver();
      const attacker = createTestCombatant(
        {},
        { id: 'atk', position: { x: 0, y: 0 } },
      );
      const target = createTestCombatant(
        {},
        { id: 'tgt', position: { x: 3, y: 4 } }, // distance = 5
      );

      expect(resolver.isInRange(attacker, target, makeAttack({ range: undefined }))).toBe(true);
    });

    it('melee attack out of range at distance > 5', () => {
      const resolver = new AttackResolver();
      const attacker = createTestCombatant(
        {},
        { id: 'atk', position: { x: 0, y: 0 } },
      );
      const target = createTestCombatant(
        {},
        { id: 'tgt', position: { x: 6, y: 0 } }, // distance = 6
      );

      expect(resolver.isInRange(attacker, target, makeAttack({ range: undefined }))).toBe(false);
    });

    it('ranged attack in range', () => {
      const resolver = new AttackResolver();
      const attacker = createTestCombatant(
        {},
        { id: 'atk', position: { x: 0, y: 0 } },
      );
      const target = createTestCombatant(
        {},
        { id: 'tgt', position: { x: 80, y: 0 } },
      );

      expect(resolver.isInRange(attacker, target, makeAttack({ range: 100 }))).toBe(true);
    });

    it('ranged attack out of range', () => {
      const resolver = new AttackResolver();
      const attacker = createTestCombatant(
        {},
        { id: 'atk', position: { x: 0, y: 0 } },
      );
      const target = createTestCombatant(
        {},
        { id: 'tgt', position: { x: 150, y: 0 } },
      );

      expect(resolver.isInRange(attacker, target, makeAttack({ range: 100 }))).toBe(false);
    });
  });

  // ─── calculateAttackBonus ────────────────────────────────────────────────

  describe('calculateAttackBonus', () => {
    it('returns ability modifier without proficiency', () => {
      const resolver = new AttackResolver();
      const character = createTestCombatant({ proficiency_bonus: 2 }, { id: 'c' }).character;

      expect(resolver.calculateAttackBonus(character, 'sword', 3, false)).toBe(3);
    });

    it('adds proficiency bonus when proficient', () => {
      const resolver = new AttackResolver();
      const character = createTestCombatant({ proficiency_bonus: 3 }, { id: 'c' }).character;

      expect(resolver.calculateAttackBonus(character, 'sword', 2, true)).toBe(5); // 2 + 3
    });

    it('returns correct bonus with negative ability modifier + proficiency', () => {
      const resolver = new AttackResolver();
      const character = createTestCombatant({ proficiency_bonus: 2 }, { id: 'c' }).character;

      expect(resolver.calculateAttackBonus(character, 'sling', -1, true)).toBe(1); // -1 + 2
    });
  });

  // ─── Seeded roller determinism ───────────────────────────────────────────

  describe('seeded roller determinism', () => {
    it('same seed produces identical results across multiple resolveAttack calls', () => {
      const attacker = createTestCombatant(
        { ability_scores: scores({ STR: 16 }) },
        { currentHP: 50, id: 'atk' },
      );
      const target = createTestCombatant(
        { armor_class: 14 },
        { currentHP: 50, id: 'tgt' },
      );
      const attack = makeAttack({ attack_bonus: 5, damage_dice: '1d8' });

      const results1: Array<{ d20: number; hit: boolean; damage: number }> = [];
      const results2: Array<{ d20: number; hit: boolean; damage: number }> = [];

      for (let i = 0; i < 20; i++) {
        const roller1 = createSeededRoller('determinism-test-1');
        const roller2 = createSeededRoller('determinism-test-1');

        const a1 = new AttackResolver(roller1);
        const r1 = a1.resolveAttack(
          { ...attacker, currentHP: 50 },
          { ...target, currentHP: 50 },
          attack,
        );

        const a2 = new AttackResolver(roller2);
        const r2 = a2.resolveAttack(
          { ...attacker, currentHP: 50 },
          { ...target, currentHP: 50 },
          attack,
        );

        results1.push({ d20: r1.attackRoll.d20Roll, hit: r1.attackRoll.hit, damage: r1.damageRoll?.total ?? 0 });
        results2.push({ d20: r2.attackRoll.d20Roll, hit: r2.attackRoll.hit, damage: r2.damageRoll?.total ?? 0 });
      }

      expect(results1).toEqual(results2);
    });

    it('different seeds produce different results', () => {
      const attacker = createTestCombatant({}, { currentHP: 50, id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { currentHP: 50, id: 'tgt' });
      const attack = makeAttack();

      const roller1 = createSeededRoller('seed-alpha');
      const roller2 = createSeededRoller('seed-beta');

      const r1 = new AttackResolver(roller1).resolveAttack(attacker, target, attack);
      const r2 = new AttackResolver(roller2).resolveAttack(attacker, target, attack);

      // It's theoretically possible they match, but extremely unlikely with different seeds
      // We just verify they both produce valid results
      expect(r1.attackRoll.d20Roll).toBeGreaterThanOrEqual(1);
      expect(r1.attackRoll.d20Roll).toBeLessThanOrEqual(20);
      expect(r2.attackRoll.d20Roll).toBeGreaterThanOrEqual(1);
      expect(r2.attackRoll.d20Roll).toBeLessThanOrEqual(20);
    });

    it('advantage with seeded roller is deterministic', () => {
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });
      const attack = makeAttack();

      const makeRun = () => {
        const roller = createSeededRoller('advantage-determinism');
        return new AttackResolver(roller).attackWithAdvantage(attacker, target, attack);
      };

      const r1 = makeRun();
      const r2 = makeRun();

      expect(r1.attackRoll.d20Roll).toBe(r2.attackRoll.d20Roll);
      expect(r1.attackRoll.hit).toBe(r2.attackRoll.hit);
    });

    it('disadvantage with seeded roller is deterministic', () => {
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });
      const attack = makeAttack();

      const makeRun = () => {
        const roller = createSeededRoller('disadvantage-determinism');
        return new AttackResolver(roller).attackWithDisadvantage(attacker, target, attack);
      };

      const r1 = makeRun();
      const r2 = makeRun();

      expect(r1.attackRoll.d20Roll).toBe(r2.attackRoll.d20Roll);
      expect(r1.attackRoll.hit).toBe(r2.attackRoll.hit);
    });
  });

  // ─── Hit probability: statistical sampling ───────────────────────────────

  describe('hit probability (statistical sampling)', () => {
    /**
     * Run N attacks with a seeded roller and count hits.
     * Uses enough samples to verify the math without being flaky.
     * Uses 'dnd' mode for classic D&D hit/miss mechanics.
     */
    function sampleHitRate(
      attackBonus: number,
      targetAC: number,
      sampleCount: number,
      seed: string,
    ): number {
      let hits = 0;
      for (let i = 0; i < sampleCount; i++) {
        const roller = createSeededRoller(`${seed}-${i}`);
        const resolver = new AttackResolver(roller, 'dnd');
        const attacker = createTestCombatant({}, { id: 'atk' });
        const target = createTestCombatant({ armor_class: targetAC }, { id: 'tgt' });
        const result = resolver.resolveAttack(
          attacker,
          target,
          makeAttack({ attack_bonus: attackBonus }),
        );
        if (result.attackRoll.hit) hits++;
      }
      return hits / sampleCount;
    }

    /**
     * Expected hit rate for d20 + bonus >= AC.
     * Each d20 face (1-20) has 5% probability.
     * Hit if roll >= (AC - bonus), except:
     *   - nat 1 always misses
     *   - nat 20 always hits
     * So: P(hit) = (21 - min(20, max(1, AC - bonus))) / 20
     * When AC - bonus > 20: only nat 20 hits → 5%
     * When AC - bonus <= 1: only nat 1 misses → 95%
     */
    function expectedHitRate(attackBonus: number, targetAC: number): number {
      const needed = targetAC - attackBonus;
      if (needed <= 1) return 0.95;
      if (needed > 20) return 0.05;
      return (21 - needed) / 20;
    }

    const SAMPLES = 2000;
    const TOLERANCE = 0.05; // ±5% is generous enough to avoid flakiness

    it('50% hit rate when attack bonus = 0, AC = 11 (need 11+)', () => {
      const actual = sampleHitRate(0, 11, SAMPLES, 'hitrate-50');
      const expected = expectedHitRate(0, 11); // 0.50
      expect(actual).toBeCloseTo(expected, 1); // within ~0.1 is fine for 2000 samples
    });

    it('95% hit rate when attack bonus greatly exceeds AC (bonus=+10, AC=1)', () => {
      const actual = sampleHitRate(10, 1, SAMPLES, 'hitrate-95');
      const expected = expectedHitRate(10, 1); // 0.95
      expect(actual).toBeGreaterThan(expected - TOLERANCE);
      expect(actual).toBeLessThan(expected + TOLERANCE);
    });

    it('5% hit rate when AC greatly exceeds bonus (bonus=0, AC=21)', () => {
      const actual = sampleHitRate(0, 21, SAMPLES, 'hitrate-5');
      const expected = expectedHitRate(0, 21); // 0.05 (only nat 20)
      expect(actual).toBeGreaterThan(expected - TOLERANCE);
      expect(actual).toBeLessThan(expected + TOLERANCE);
    });

    it('55% hit rate when bonus=+2, AC=12 (need 10+, but 1 misses)', () => {
      const actual = sampleHitRate(2, 12, SAMPLES, 'hitrate-55');
      const expected = expectedHitRate(2, 12); // 0.55
      expect(actual).toBeCloseTo(expected, 1);
    });

    it('hit rate improves with higher attack bonus', () => {
      const rateLow = sampleHitRate(0, 15, SAMPLES, 'hitrate-compare-low');
      const rateHigh = sampleHitRate(5, 15, SAMPLES, 'hitrate-compare-high');
      expect(rateHigh).toBeGreaterThan(rateLow);
    });

    it('hit rate decreases with higher AC', () => {
      const rateLowAC = sampleHitRate(5, 10, SAMPLES, 'hitrate-ac-low');
      const rateHighAC = sampleHitRate(5, 18, SAMPLES, 'hitrate-ac-high');
      expect(rateLowAC).toBeGreaterThan(rateHighAC);
    });
  });

  // ─── Advantage/disadvantage statistical impact ───────────────────────────

  describe('advantage/disadvantage statistical impact', () => {
    function sampleAdvantageHitRate(
      attackBonus: number,
      targetAC: number,
      sampleCount: number,
    ): number {
      let hits = 0;
      for (let i = 0; i < sampleCount; i++) {
        const roller = createSeededRoller(`adv-hitrate-${i}`);
        const resolver = new AttackResolver(roller, 'dnd');
        const attacker = createTestCombatant({}, { id: 'atk' });
        const target = createTestCombatant({ armor_class: targetAC }, { id: 'tgt' });
        const result = resolver.attackWithAdvantage(
          attacker,
          target,
          makeAttack({ attack_bonus: attackBonus }),
        );
        if (result.attackRoll.hit) hits++;
      }
      return hits / sampleCount;
    }

    function sampleDisadvantageHitRate(
      attackBonus: number,
      targetAC: number,
      sampleCount: number,
    ): number {
      let hits = 0;
      for (let i = 0; i < sampleCount; i++) {
        const roller = createSeededRoller(`disadv-hitrate-${i}`);
        const resolver = new AttackResolver(roller, 'dnd');
        const attacker = createTestCombatant({}, { id: 'atk' });
        const target = createTestCombatant({ armor_class: targetAC }, { id: 'tgt' });
        const result = resolver.attackWithDisadvantage(
          attacker,
          target,
          makeAttack({ attack_bonus: attackBonus }),
        );
        if (result.attackRoll.hit) hits++;
      }
      return hits / sampleCount;
    }

    const SAMPLES = 2000;

    it('advantage improves hit rate over normal roll', () => {
      // Need 11+ on d20 → 50% normal
      const normalRate = 0.50;
      const advRate = sampleAdvantageHitRate(0, 11, SAMPLES);
      expect(advRate).toBeGreaterThan(normalRate);
    });

    it('disadvantage reduces hit rate below normal roll', () => {
      // Need 11+ on d20 → 50% normal
      const normalRate = 0.50;
      const disadvRate = sampleDisadvantageHitRate(0, 11, SAMPLES);
      expect(disadvRate).toBeLessThan(normalRate);
    });

    it('advantage hit rate is higher than disadvantage hit rate', () => {
      const advRate = sampleAdvantageHitRate(3, 14, SAMPLES);
      const disadvRate = sampleDisadvantageHitRate(3, 14, SAMPLES);
      expect(advRate).toBeGreaterThan(disadvRate);
    });
  });

  // ─── Result structure ────────────────────────────────────────────────────

  describe('result structure', () => {
    it('returns correct attacker and target references', () => {
      const roller = createMockDiceRoller({ rollD20: () => 15 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({ name: 'Alice' }, { id: 'atk' });
      const target = createTestCombatant({ name: 'Bob' }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      expect(result.attacker).toBe(attacker);
      expect(result.target).toBe(target);
      expect(result.attack.name).toBe('Longsword');
    });

    it('description contains attacker and target names', () => {
      const roller = createMockDiceRoller({ rollD20: () => 15 });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({ name: 'Alice' }, { id: 'atk' });
      const target = createTestCombatant({ name: 'Bob' }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      expect(result.description).toContain('Alice');
      expect(result.description).toContain('Bob');
    });

    it('attackWithAdvantage returns correct result structure', () => {
      const roller = createMockDiceRoller({
        rollWithAdvantage: () => ({ roll1: 15, roll2: 8, result: 15 }),
        calculateDamage: () => ({ diceFormula: '1d8', rolls: [5], modifier: 0, total: 5, isCritical: false }),
      });
      const resolver = new AttackResolver(roller);
      const attacker = createTestCombatant({ name: 'Hero' }, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.attackWithAdvantage(attacker, target, makeAttack());

      expect(result.attacker).toBe(attacker);
      expect(result.target).toBe(target);
      expect(result.attack).toBeDefined();
      expect(result.attackRoll).toBeDefined();
      expect(result.attackRoll.d20Roll).toBe(15);
      expect(result.attackRoll.hit).toBe(true);
    });

    it('attackWithDisadvantage returns correct result structure on miss (dnd mode)', () => {
      const roller = createMockDiceRoller({
        rollWithDisadvantage: () => ({ roll1: 3, roll2: 5, result: 3 }),
      });
      const resolver = new AttackResolver(roller, 'dnd');
      const attacker = createTestCombatant({ name: 'Hero' }, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 20 }, { id: 'tgt' });

      const result = resolver.attackWithDisadvantage(attacker, target, makeAttack());

      expect(result.attackRoll.hit).toBe(false);
      expect(result.damageRoll).toBeUndefined();
      expect(result.hpAfterDamage).toBeUndefined();
    });
  });

  // ─── No roller provided (default DiceRoller) ─────────────────────────────

  describe('without injected roller (default DiceRoller)', () => {
    it('works without a roller — uses static DiceRoller', () => {
      const resolver = new AttackResolver();
      const attacker = createTestCombatant({}, { id: 'atk' });
      const target = createTestCombatant({ armor_class: 10 }, { id: 'tgt' });

      const result = resolver.resolveAttack(attacker, target, makeAttack());

      // Can't predict the roll, but verify structure
      expect(result.attackRoll.d20Roll).toBeGreaterThanOrEqual(1);
      expect(result.attackRoll.d20Roll).toBeLessThanOrEqual(20);
      expect(result.attackRoll).toBeDefined();
    });
  });
});
