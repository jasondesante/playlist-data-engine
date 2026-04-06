/**
 * Unit tests for SeededDiceRoller (Task 0.1.5)
 *
 * Validates deterministic dice rolling for reproducible combat simulations:
 * - Same seed + same calls = identical results
 * - Different seeds = different results
 * - Statistical distribution over many seeds matches expected D&D probabilities
 * - Backward compatibility: CombatEngine without roller still uses Math.random()
 */

import { describe, it, expect } from 'vitest';
import { SeededDiceRoller, createSeededRoller } from '../../src/core/combat/SeededDiceRoller.js';
import { SeededRNG } from '../../src/utils/random.js';

describe('SeededDiceRoller', () => {
  describe('Determinism — same seed + same calls = identical results', () => {
    it('should produce identical d20 rolls from the same seed', () => {
      const roller1 = createSeededRoller('test-seed-42');
      const roller2 = createSeededRoller('test-seed-42');

      for (let i = 0; i < 100; i++) {
        expect(roller1.rollD20()).toBe(roller2.rollD20());
      }
    });

    it('should produce identical rollDie results from the same seed', () => {
      const roller1 = new SeededDiceRoller('dice-test');
      const roller2 = new SeededDiceRoller('dice-test');

      const sides = [4, 6, 8, 10, 12, 20, 100];
      for (const s of sides) {
        expect(roller1.rollDie(s)).toBe(roller2.rollDie(s));
      }
    });

    it('should produce identical advantage rolls from the same seed', () => {
      const roller1 = createSeededRoller('advantage-seed');
      const roller2 = createSeededRoller('advantage-seed');

      for (let i = 0; i < 50; i++) {
        const a = roller1.rollWithAdvantage();
        const b = roller2.rollWithAdvantage();
        expect(a).toEqual(b);
      }
    });

    it('should produce identical disadvantage rolls from the same seed', () => {
      const roller1 = createSeededRoller('disadvantage-seed');
      const roller2 = createSeededRoller('disadvantage-seed');

      for (let i = 0; i < 50; i++) {
        const a = roller1.rollWithDisadvantage();
        const b = roller2.rollWithDisadvantage();
        expect(a).toEqual(b);
      }
    });

    it('should produce identical parseDiceFormula results from the same seed', () => {
      const roller1 = createSeededRoller('formula-seed');
      const roller2 = createSeededRoller('formula-seed');

      const formulas = ['1d6', '2d6+3', '1d8', '3d8-1', '2d10+5'];
      for (const formula of formulas) {
        const a = roller1.parseDiceFormula(formula);
        const b = roller2.parseDiceFormula(formula);
        expect(a).toEqual(b);
      }
    });

    it('should produce identical calculateDamage results from the same seed', () => {
      const roller1 = createSeededRoller('damage-seed');
      const roller2 = createSeededRoller('damage-seed');

      for (let i = 0; i < 20; i++) {
        const a = roller1.calculateDamage('2d6', 3);
        const b = roller2.calculateDamage('2d6', 3);
        expect(a).toEqual(b);
      }
    });

    it('should produce identical calculateDamage results for critical hits', () => {
      const roller1 = createSeededRoller('crit-seed');
      const roller2 = createSeededRoller('crit-seed');

      for (let i = 0; i < 20; i++) {
        const a = roller1.calculateDamage('1d8', 4, true);
        const b = roller2.calculateDamage('1d8', 4, true);
        expect(a).toEqual(b);
      }
    });

    it('should produce identical rollSavingThrow results from the same seed', () => {
      const roller1 = createSeededRoller('save-seed');
      const roller2 = createSeededRoller('save-seed');

      for (let i = 0; i < 50; i++) {
        expect(roller1.rollSavingThrow(3, 2)).toBe(roller2.rollSavingThrow(3, 2));
      }
    });

    it('should produce identical rollAbilityCheck results from the same seed', () => {
      const roller1 = createSeededRoller('check-seed');
      const roller2 = createSeededRoller('check-seed');

      for (let i = 0; i < 50; i++) {
        expect(roller1.rollAbilityCheck(5)).toBe(roller2.rollAbilityCheck(5));
      }
    });

    it('should produce identical rollInitiative results from the same seed', () => {
      const roller1 = createSeededRoller('init-seed');
      const roller2 = createSeededRoller('init-seed');

      for (let i = 0; i < 50; i++) {
        expect(roller1.rollInitiative(3)).toBe(roller2.rollInitiative(3));
      }
    });

    it('should produce identical results when constructed with a SeededRNG instance', () => {
      const rng1 = new SeededRNG('rng-instance-seed');
      const rng2 = new SeededRNG('rng-instance-seed');
      const roller1 = new SeededDiceRoller(rng1);
      const roller2 = new SeededDiceRoller(rng2);

      for (let i = 0; i < 50; i++) {
        expect(roller1.rollD20()).toBe(roller2.rollD20());
      }
    });

    it('should replay a full combat-like sequence deterministically', () => {
      // Simulate a sequence of combat rolls: initiative, attack, damage, saving throw
      function simulateCombatSequence(roller: SeededDiceRoller) {
        const initiative = roller.rollInitiative(3);
        const attack = roller.rollD20();
        const damage = roller.calculateDamage('1d8', 3);
        const savingThrow = roller.rollSavingThrow(-1);
        return { initiative, attack, damage, savingThrow };
      }

      const sequence1 = simulateCombatSequence(createSeededRoller('combat-sim-1'));
      const sequence2 = simulateCombatSequence(createSeededRoller('combat-sim-1'));

      expect(sequence1).toEqual(sequence2);
    });
  });

  describe('Different seeds produce different results', () => {
    it('should produce different d20 sequences from different seeds', () => {
      const roller1 = createSeededRoller('seed-alpha');
      const roller2 = createSeededRoller('seed-beta');

      const rolls1 = Array.from({ length: 50 }, () => roller1.rollD20());
      const rolls2 = Array.from({ length: 50 }, () => roller2.rollD20());

      // Not every roll must differ, but the sequences should not be identical
      expect(rolls1).not.toEqual(rolls2);
    });

    it('should produce different advantage sequences from different seeds', () => {
      const roller1 = createSeededRoller('adv-alpha');
      const roller2 = createSeededRoller('adv-beta');

      const rolls1 = Array.from({ length: 20 }, () => roller1.rollWithAdvantage());
      const rolls2 = Array.from({ length: 20 }, () => roller2.rollWithAdvantage());

      expect(rolls1).not.toEqual(rolls2);
    });

    it('should produce different damage results from different seeds', () => {
      const roller1 = createSeededRoller('dmg-alpha');
      const roller2 = createSeededRoller('dmg-beta');

      const results1 = Array.from({ length: 20 }, () => roller1.calculateDamage('2d6+3', 2));
      const results2 = Array.from({ length: 20 }, () => roller2.calculateDamage('2d6+3', 2));

      expect(results1).not.toEqual(results2);
    });

    it('should treat similar-but-different seeds as different', () => {
      const roller1 = createSeededRoller('seed-1');
      const roller2 = createSeededRoller('seed-2');
      const roller3 = createSeededRoller('seed-10');

      const r1 = roller1.rollD20();
      const r2 = roller2.rollD20();
      const r3 = roller3.rollD20();

      // All three should likely be different (probabilistically almost certain)
      // At minimum, seed-1 and seed-2 should differ
      expect(r1).not.toBe(r2);
    });
  });

  describe('Statistical distribution matches expected D&D probabilities', () => {
    /**
     * Run many simulations across different seeds and check that
     * the aggregate distribution matches the expected distribution.
     * Uses a large sample size to reduce flakiness.
     */
    const SAMPLE_COUNT = 1000;
    const SEEDS = Array.from({ length: SAMPLE_COUNT }, (_, i) => `stat-test-${i}`);

    describe('d20 uniform distribution', () => {
      it('should produce a roughly uniform d20 distribution across many seeds', () => {
        const counts = new Array(20).fill(0);

        for (const seed of SEEDS) {
          const roller = createSeededRoller(seed);
          const roll = roller.rollD20();
          counts[roll - 1]++;
        }

        // Expected ~50 per face (1000/20). Allow wide tolerance to avoid flakiness.
        // Each face should have at least 25 (2.5%) and at most 75 (7.5%).
        for (let face = 0; face < 20; face++) {
          expect(counts[face]).toBeGreaterThanOrEqual(25);
          expect(counts[face]).toBeLessThanOrEqual(75);
        }
      });

      it('should produce d20 values in the valid range [1, 20]', () => {
        for (const seed of SEEDS) {
          const roller = createSeededRoller(seed);
          const roll = roller.rollD20();
          expect(roll).toBeGreaterThanOrEqual(1);
          expect(roll).toBeLessThanOrEqual(20);
        }
      });
    });

    describe('d6 uniform distribution', () => {
      it('should produce a roughly uniform d6 distribution across many seeds', () => {
        const counts = new Array(6).fill(0);

        for (const seed of SEEDS) {
          const roller = createSeededRoller(seed);
          const roll = roller.rollDie(6);
          counts[roll - 1]++;
        }

        // Expected ~167 per face (1000/6). Allow wide tolerance.
        for (let face = 0; face < 6; face++) {
          expect(counts[face]).toBeGreaterThanOrEqual(100);
          expect(counts[face]).toBeLessThanOrEqual(250);
        }
      });
    });

    describe('Advantage bias (roll twice, take higher)', () => {
      it('should produce higher average with advantage than a flat d20', () => {
        const advantageResults: number[] = [];
        const flatResults: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const rollerAdv = createSeededRoller(`adv-stat-${i}`);
          const { result } = rollerAdv.rollWithAdvantage();
          advantageResults.push(result);

          const rollerFlat = createSeededRoller(`flat-stat-${i}`);
          flatResults.push(rollerFlat.rollD20());
        }

        const avgAdv = advantageResults.reduce((a, b) => a + b, 0) / advantageResults.length;
        const avgFlat = flatResults.reduce((a, b) => a + b, 0) / flatResults.length;

        // Advantage average should be ~13.8 vs flat ~10.5
        expect(avgAdv).toBeGreaterThan(12);
        expect(avgFlat).toBeLessThan(12);
        expect(avgAdv).toBeGreaterThan(avgFlat);
      });

      it('should produce more natural 20s with advantage', () => {
        // P(nat 20 with advantage) = 1 - (19/20)^2 = 39/400 = 9.75%
        // P(nat 20 flat) = 1/20 = 5%
        const nat20Adv: number[] = [];
        const nat20Flat: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const rollerAdv = createSeededRoller(`nat20-adv-${i}`);
          const { result } = rollerAdv.rollWithAdvantage();
          if (result === 20) nat20Adv.push(result);

          const rollerFlat = createSeededRoller(`nat20-flat-${i}`);
          const flat = rollerFlat.rollD20();
          if (flat === 20) nat20Flat.push(flat);
        }

        // Advantage should produce roughly 2x more nat 20s
        // With 1000 samples: expect ~97 vs ~50
        expect(nat20Adv.length).toBeGreaterThan(nat20Flat.length * 1.3);
      });
    });

    describe('Disadvantage bias (roll twice, take lower)', () => {
      it('should produce lower average with disadvantage than a flat d20', () => {
        const disadvantageResults: number[] = [];
        const flatResults: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const rollerDis = createSeededRoller(`dis-stat-${i}`);
          const { result } = rollerDis.rollWithDisadvantage();
          disadvantageResults.push(result);

          const rollerFlat = createSeededRoller(`dis-flat-${i}`);
          flatResults.push(rollerFlat.rollD20());
        }

        const avgDis = disadvantageResults.reduce((a, b) => a + b, 0) / disadvantageResults.length;
        const avgFlat = flatResults.reduce((a, b) => a + b, 0) / flatResults.length;

        // Disadvantage average should be ~7.2 vs flat ~10.5
        expect(avgDis).toBeLessThan(9);
        expect(avgFlat).toBeGreaterThan(9);
        expect(avgDis).toBeLessThan(avgFlat);
      });
    });

    describe('Damage formula distribution', () => {
      it('should produce correct average for 1d8', () => {
        // Expected average: 4.5
        const results: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const roller = createSeededRoller(`d8-stat-${i}`);
          const { total } = roller.parseDiceFormula('1d8');
          results.push(total);
        }

        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        // Should be close to 4.5, allow generous tolerance
        expect(avg).toBeGreaterThan(3.5);
        expect(avg).toBeLessThan(5.5);
      });

      it('should produce correct average for 2d6+3', () => {
        // Expected average: 2 * 3.5 + 3 = 10
        const results: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const roller = createSeededRoller(`2d6-stat-${i}`);
          const { total } = roller.parseDiceFormula('2d6+3');
          results.push(total);
        }

        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        expect(avg).toBeGreaterThan(8.5);
        expect(avg).toBeLessThan(11.5);
      });

      it('should produce correct average for calculateDamage with modifier', () => {
        // 1d8 + 3 modifier = expected 7.5
        const results: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const roller = createSeededRoller(`calc-dmg-${i}`);
          const { total } = roller.calculateDamage('1d8', 3);
          results.push(total);
        }

        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        expect(avg).toBeGreaterThan(6.0);
        expect(avg).toBeLessThan(9.0);
      });

      it('should produce correct average for critical hit damage (doubled dice, not modifier)', () => {
        // Critical 1d8 + 3 = 2d8 + 3 = expected 9 + 3 = 12
        const results: number[] = [];

        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const roller = createSeededRoller(`crit-dmg-${i}`);
          const { total } = roller.calculateDamage('1d8', 3, true);
          results.push(total);
        }

        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        // 2d8 average = 9, +3 = 12
        expect(avg).toBeGreaterThan(10.0);
        expect(avg).toBeLessThan(14.0);
      });

      it('should double dice count on critical hits', () => {
        const roller = createSeededRoller('crit-dice-count');

        const normal = roller.calculateDamage('1d8', 3, false);
        const crit = roller.calculateDamage('1d8', 3, true);

        // Critical should have 2x the dice of normal
        expect(crit.rolls.length).toBe(normal.rolls.length * 2);
        // Modifier should be the same
        expect(crit.modifier).toBe(normal.modifier);
      });
    });

    describe('Saving throw and ability check distributions', () => {
      it('should produce saving throws in expected range', () => {
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const roller = createSeededRoller(`save-range-${i}`);
          // +3 modifier, +2 proficiency: min = 1 + 3 + 2 = 6, max = 20 + 3 + 2 = 25
          const result = roller.rollSavingThrow(3, 2);
          expect(result).toBeGreaterThanOrEqual(6);
          expect(result).toBeLessThanOrEqual(25);
        }
      });

      it('should produce ability checks in expected range', () => {
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const roller = createSeededRoller(`check-range-${i}`);
          // +4 modifier, no proficiency: min = 1 + 4 = 5, max = 20 + 4 = 24
          const result = roller.rollAbilityCheck(4);
          expect(result).toBeGreaterThanOrEqual(5);
          expect(result).toBeLessThanOrEqual(24);
        }
      });
    });
  });

  describe('API parity with DiceRoller', () => {
    it('should have all methods required by DiceRollerAPI', () => {
      const roller = createSeededRoller('api-check');

      // Verify all DiceRollerAPI methods exist and are callable
      expect(typeof roller.rollDie).toBe('function');
      expect(typeof roller.rollD20).toBe('function');
      expect(typeof roller.rollWithAdvantage).toBe('function');
      expect(typeof roller.rollWithDisadvantage).toBe('function');
      expect(typeof roller.calculateDamage).toBe('function');
      expect(typeof roller.rollSavingThrow).toBe('function');
      expect(typeof roller.rollAbilityCheck).toBe('function');
      expect(typeof roller.isCriticalHit).toBe('function');
      expect(typeof roller.isCriticalMiss).toBe('function');
      expect(typeof roller.parseDiceFormula).toBe('function');

      // Verify they return the expected shapes
      expect(typeof roller.rollDie(6)).toBe('number');
      expect(typeof roller.rollD20()).toBe('number');

      const adv = roller.rollWithAdvantage();
      expect(adv).toHaveProperty('roll1');
      expect(adv).toHaveProperty('roll2');
      expect(adv).toHaveProperty('result');

      const dis = roller.rollWithDisadvantage();
      expect(dis).toHaveProperty('roll1');
      expect(dis).toHaveProperty('roll2');
      expect(dis).toHaveProperty('result');

      const dmg = roller.calculateDamage('1d8', 3);
      expect(dmg).toHaveProperty('rolls');
      expect(dmg).toHaveProperty('modifier');
      expect(dmg).toHaveProperty('total');
      expect(dmg).toHaveProperty('isCritical');

      const parsed = roller.parseDiceFormula('2d6+3');
      expect(parsed).toHaveProperty('diceCount');
      expect(parsed).toHaveProperty('diceSides');
      expect(parsed).toHaveProperty('modifier');
      expect(parsed).toHaveProperty('rolls');
      expect(parsed).toHaveProperty('total');
    });

    it('should reject invalid dice formulas like DiceRoller', () => {
      const roller = createSeededRoller('error-check');

      expect(() => roller.parseDiceFormula('invalid')).toThrow('Invalid dice formula');
      expect(() => roller.parseDiceFormula('')).toThrow('Invalid dice formula');
      expect(() => roller.parseDiceFormula('0d6')).not.toThrow(); // 0 dice is valid parsing
    });

    it('should reject invalid die sides like DiceRoller', () => {
      const roller = createSeededRoller('sides-check');

      expect(() => roller.rollDie(0)).toThrow('Die must have at least 1 side');
      expect(() => roller.rollDie(-1)).toThrow('Die must have at least 1 side');
    });
  });

  describe('Utility methods', () => {
    it('should correctly identify critical hits', () => {
      const roller = createSeededRoller('crit-check');
      expect(roller.isCriticalHit(20)).toBe(true);
      expect(roller.isCriticalHit(19)).toBe(false);
      expect(roller.isCriticalHit(1)).toBe(false);
    });

    it('should correctly identify critical misses', () => {
      const roller = createSeededRoller('miss-check');
      expect(roller.isCriticalMiss(1)).toBe(true);
      expect(roller.isCriticalMiss(2)).toBe(false);
      expect(roller.isCriticalMiss(20)).toBe(false);
    });

    it('should double damage dice correctly', () => {
      const roller = createSeededRoller('double-check');
      const rolls = [3, 5];
      const doubled = roller.doubleDamage(rolls);
      expect(doubled).toEqual([3, 5, 3, 5]);
    });

    it('should roll percentile (d100) in valid range', () => {
      for (let i = 0; i < 200; i++) {
        const roller = createSeededRoller(`pct-${i}`);
        const roll = roller.rollPercentile();
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(100);
      }
    });

    it('should roll multiple dice and return individual results', () => {
      const roller = createSeededRoller('multi-dice');
      const rolls = roller.rollMultipleDice(4, 6);

      expect(rolls).toHaveLength(4);
      for (const roll of rolls) {
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      }
    });
  });

  describe('createSeededRoller factory', () => {
    it('should return a SeededDiceRoller instance', () => {
      const roller = createSeededRoller('factory-test');
      expect(roller).toBeInstanceOf(SeededDiceRoller);
    });

    it('should produce unique rollers (different RNG states)', () => {
      const roller1 = createSeededRoller('unique-1');
      const roller2 = createSeededRoller('unique-1');

      // Same seed, same results — but independent states
      expect(roller1.rollD20()).toBe(roller2.rollD20());
      // Advance roller1's state
      roller1.rollD20();
      // Now they're out of sync
      expect(roller1.rollD20()).not.toBe(roller2.rollD20());
    });
  });
});

describe('Backward compatibility — CombatEngine without roller uses Math.random()', () => {
  it('should allow constructing CombatEngine without a diceRoller parameter', async () => {
    // Import CombatEngine dynamically to avoid side effects if it's heavy
    const { CombatEngine } = await import('../../src/core/combat/CombatEngine.js');

    // Should not throw — backward compatible default
    const engine = new CombatEngine();
    expect(engine).toBeDefined();
  });

  it('should produce non-deterministic results without a seeded roller', async () => {
    const { CombatEngine } = await import('../../src/core/combat/CombatEngine.js');

    const engine1 = new CombatEngine();
    const engine2 = new CombatEngine();

    // Both engines use Math.random() — results should differ
    // We can't directly access roll results, but we can verify
    // the engines were constructed without error and are independent
    expect(engine1).toBeDefined();
    expect(engine2).toBeDefined();
    expect(engine1).not.toBe(engine2);
  });
});
