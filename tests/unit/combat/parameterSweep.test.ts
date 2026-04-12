/**
 * ParameterSweep Tests
 *
 * Task 4.2.3: Tests for the parameter sweep execution system.
 * Verifies that sweeping a parameter across a range correctly:
 * - Generates modified enemies at each data point
 * - Runs simulations and collects summaries
 * - Returns properly structured SweepResults
 * - Handles cancellation, progress, edge cases
 * - Produces reasonable win rate curves (decreasing with CR, etc.)
 */

import { describe, it, expect, vi } from 'vitest';
import { ParameterSweep } from '../../../src/core/combat/Analysis/ParameterSweep.js';
import type {
  SweepVariable,
  SweepRange,
  SweepParams,
  SweepResults,
  SweepDataPoint,
  SweepEnemyConfig,
} from '../../../src/core/combat/Analysis/ParameterSweep.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';
import type { AIConfig } from '../../../src/core/types/CombatAI.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createArmedPlayer(level: number, name: string): CharacterSheet {
  return createMockPartyCharacter(level, {
    name,
    equipment: {
      weapons: [{
        name: 'Longsword',
        damage: { dice: '1d8+3', damageType: 'slashing' },
        equipped: true,
        weaponProperties: ['versatile'],
        type: 'weapon',
      }],
      armor: [],
      items: [],
      totalWeight: 0,
      equippedWeight: 0,
    },
  });
}

function makePlayers(count: number = 4, level: number = 5): CharacterSheet[] {
  return Array.from({ length: count }, (_, i) => createArmedPlayer(level, `Player_${i}`));
}

const normalAI: AIConfig = { playerStyle: 'normal', enemyStyle: 'normal' };
const aggressiveAI: AIConfig = { playerStyle: 'aggressive', enemyStyle: 'aggressive' };

function makeSweepParams(
  variable: SweepVariable,
  range: SweepRange,
  overrides: Partial<SweepParams> = {},
): SweepParams {
  return {
    variable,
    range,
    simulationsPerPoint: 50,
    aiConfig: normalAI,
    baseSeed: 'sweep-test',
    ...overrides,
  };
}

function makeEnemyConfig(overrides: Partial<SweepEnemyConfig> = {}): SweepEnemyConfig {
  return {
    cr: 3,
    rarity: 'elite',
    category: 'humanoid',
    archetype: 'brute',
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ParameterSweep', () => {
  const sweeper = new ParameterSweep();

  // ─── Value Generation ────────────────────────────────────────────────────

  describe('generateValues (via sweep execution)', () => {
    it('produces correct number of data points for integer range', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 1 }),
        makeSweepParams('cr', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 5 }),
      );
      expect(results.dataPoints).toHaveLength(5);
    });

    it('produces correct data points for fractional CR range', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 0.25, max: 1, step: 0.25 }, { simulationsPerPoint: 5 }),
      );
      expect(results.dataPoints).toHaveLength(4);
      // Verify the parameter values match expected fractional CRs
      const values = results.dataPoints.map(dp => dp.parameterValue);
      expect(values).toEqual([0.25, 0.5, 0.75, 1]);
    });

    it('produces single data point when min === max', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 3, max: 3, step: 1 }, { simulationsPerPoint: 5 }),
      );
      expect(results.dataPoints).toHaveLength(1);
      expect(results.dataPoints[0].parameterValue).toBe(3);
    });

    it('produces correct count for step > 1', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 10, step: 2 }, { simulationsPerPoint: 5 }),
      );
      expect(results.dataPoints).toHaveLength(5);
      const values = results.dataPoints.map(dp => dp.parameterValue);
      expect(values).toEqual([1, 3, 5, 7, 9]);
    });
  });

  // ─── SweepResults Structure ──────────────────────────────────────────────

  describe('SweepResults structure', () => {
    it('returns correct metadata fields', () => {
      const players = makePlayers(1, 5);
      const params = makeSweepParams('cr', { min: 1, max: 3, step: 1 }, { simulationsPerPoint: 10 });
      const results = sweeper.sweep(players, makeEnemyConfig(), params);

      expect(results.variable).toBe('cr');
      expect(results.range).toEqual({ min: 1, max: 3, step: 1 });
      expect(results.simulationsPerPoint).toBe(10);
      expect(results.wasCancelled).toBe(false);
    });

    it('returns data points in ascending parameter order', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 5 }),
      );
      const values = results.dataPoints.map(dp => dp.parameterValue);
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });

    it('each data point has all required fields', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 2, step: 1 }, { simulationsPerPoint: 10 }),
      );

      for (const dp of results.dataPoints) {
        expect(dp).toHaveProperty('parameterValue');
        expect(dp).toHaveProperty('playerWinRate');
        expect(dp).toHaveProperty('averageRounds');
        expect(dp).toHaveProperty('averageHPRemaining');
        expect(dp).toHaveProperty('totalPlayerDeaths');
        expect(dp).toHaveProperty('totalEnemyDeaths');
        expect(dp).toHaveProperty('medianRounds');
      }
    });

    it('data point values are in valid ranges', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 50 }),
      );

      for (const dp of results.dataPoints) {
        expect(dp.playerWinRate).toBeGreaterThanOrEqual(0);
        expect(dp.playerWinRate).toBeLessThanOrEqual(1);
        expect(dp.averageRounds).toBeGreaterThanOrEqual(0);
        expect(dp.averageHPRemaining).toBeGreaterThanOrEqual(0);
        expect(dp.medianRounds).toBeGreaterThanOrEqual(0);
        expect(dp.totalPlayerDeaths).toBeGreaterThanOrEqual(0);
        expect(dp.totalEnemyDeaths).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── Determinism ────────────────────────────────────────────────────────

  describe('determinism', () => {
    it('same seed + same config produces identical results', () => {
      const players = makePlayers(1, 5);
      const params = makeSweepParams('cr', { min: 1, max: 3, step: 1 }, { simulationsPerPoint: 20 });

      const resultsA = sweeper.sweep(players, makeEnemyConfig(), params);
      const resultsB = sweeper.sweep(players, makeEnemyConfig(), params);

      expect(resultsA.dataPoints).toHaveLength(resultsB.dataPoints.length);
      for (let i = 0; i < resultsA.dataPoints.length; i++) {
        expect(resultsA.dataPoints[i].playerWinRate).toBe(resultsB.dataPoints[i].playerWinRate);
        expect(resultsA.dataPoints[i].averageRounds).toBe(resultsB.dataPoints[i].averageRounds);
        expect(resultsA.dataPoints[i].medianRounds).toBe(resultsB.dataPoints[i].medianRounds);
        expect(resultsA.dataPoints[i].averageHPRemaining).toBe(resultsB.dataPoints[i].averageHPRemaining);
        expect(resultsA.dataPoints[i].totalPlayerDeaths).toBe(resultsB.dataPoints[i].totalPlayerDeaths);
        expect(resultsA.dataPoints[i].totalEnemyDeaths).toBe(resultsB.dataPoints[i].totalEnemyDeaths);
      }
    });

    it('different seeds produce different results', () => {
      const players = makePlayers(1, 5);
      const baseParams = makeSweepParams('cr', { min: 1, max: 3, step: 1 }, { simulationsPerPoint: 50 });

      const resultsA = sweeper.sweep(players, makeEnemyConfig(), { ...baseParams, baseSeed: 'seed-a' });
      const resultsB = sweeper.sweep(players, makeEnemyConfig(), { ...baseParams, baseSeed: 'seed-b' });

      // At least one data point should differ between different seeds.
      // Check multiple metrics since binary outcomes (win rate) may be identical
      // when combat is one-sided, but continuous stats (rounds, HP) will vary.
      let hasDifference = false;
      for (let i = 0; i < resultsA.dataPoints.length; i++) {
        const a = resultsA.dataPoints[i];
        const b = resultsB.dataPoints[i];
        if (
          a.playerWinRate !== b.playerWinRate ||
          a.averageRounds !== b.averageRounds ||
          a.averageHPRemaining !== b.averageHPRemaining ||
          a.totalPlayerDeaths !== b.totalPlayerDeaths ||
          a.totalEnemyDeaths !== b.totalEnemyDeaths ||
          a.medianRounds !== b.medianRounds
        ) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });
  });

  // ─── CR Sweep ───────────────────────────────────────────────────────────

  describe('CR sweep', () => {
    it('win rate generally decreases as CR increases', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ rarity: 'common', category: 'humanoid', archetype: 'brute' }),
        makeSweepParams('cr', { min: 1, max: 10, step: 1 }, { simulationsPerPoint: 100 }),
      );

      // Win rate should trend downward. Check that the last point
      // (highest CR) has a lower or equal win rate than the first (lowest CR)
      // on average. We allow some noise, so check that the high-CR end
      // is generally lower than the low-CR end.
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;

      // With 100 runs per point, the trend should be clear for 1v1 level 5 vs CR 1-10
      expect(lastWinRate).toBeLessThanOrEqual(firstWinRate);
    });

    it('generates different enemies at each CR value', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 5 }),
      );

      // Different CRs should produce different average rounds (different enemy stats)
      const rounds = results.dataPoints.map(dp => dp.averageRounds);
      const uniqueRounds = new Set(rounds.map(r => Math.round(r * 10)));
      // With 5 different CRs, at least some should differ
      expect(uniqueRounds.size).toBeGreaterThan(1);
    });
  });

  // ─── Enemy Count Sweep ─────────────────────────────────────────────────

  describe('enemy count sweep', () => {
    it('win rate generally decreases as enemy count increases', () => {
      const players = makePlayers(4, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 1, rarity: 'common' }),
        makeSweepParams('enemyCount', { min: 1, max: 8, step: 1 }, { simulationsPerPoint: 100 }),
      );

      // More enemies should generally be harder
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;
      expect(lastWinRate).toBeLessThanOrEqual(firstWinRate);
    });

    it('generates the correct number of enemies per data point', () => {
      const players = makePlayers(4, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 1, rarity: 'common' }),
        makeSweepParams('enemyCount', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 5 }),
      );

      // We can't directly count enemies from SweepDataPoint, but we can verify
      // the sweep runs without error for each count and produces results
      expect(results.dataPoints).toHaveLength(5);
      for (const dp of results.dataPoints) {
        expect(dp.playerWinRate).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ─── Party Level Sweep ─────────────────────────────────────────────────

  describe('party level sweep', () => {
    it('win rate generally increases as party level increases', () => {
      const players = makePlayers(1, 1); // Start at level 1
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, rarity: 'common' }),
        makeSweepParams('partyLevel', { min: 1, max: 10, step: 1 }, { simulationsPerPoint: 100 }),
      );

      // Higher party level should mean easier fight
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;
      expect(lastWinRate).toBeGreaterThanOrEqual(firstWinRate);
    });
  });

  // ─── Rarity Sweep ──────────────────────────────────────────────────────

  describe('rarity sweep', () => {
    it('sweeps across all 4 rarity tiers', () => {
      const players = makePlayers(4, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, category: 'humanoid', archetype: 'brute' }),
        makeSweepParams('rarity', { min: 0, max: 3, step: 1 }, { simulationsPerPoint: 50 }),
      );

      // Should produce 4 data points: common(0), uncommon(1), elite(2), boss(3)
      expect(results.dataPoints).toHaveLength(4);

      // Boss should be harder than common
      const commonWinRate = results.dataPoints[0].playerWinRate;
      const bossWinRate = results.dataPoints[3].playerWinRate;
      expect(bossWinRate).toBeLessThanOrEqual(commonWinRate);
    });
  });

  // ─── Stat Level Sweeps ─────────────────────────────────────────────────

  describe('hpLevel sweep', () => {
    it('win rate decreases as enemy HP level increases', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, rarity: 'common' }),
        makeSweepParams('hpLevel', { min: 1, max: 15, step: 2 }, { simulationsPerPoint: 50 }),
      );

      // Higher HP level → tankier enemy → harder for player
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;
      expect(lastWinRate).toBeLessThanOrEqual(firstWinRate);
    });
  });

  describe('attackLevel sweep', () => {
    it('win rate decreases as enemy attack level increases', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, rarity: 'common' }),
        makeSweepParams('attackLevel', { min: 1, max: 15, step: 2 }, { simulationsPerPoint: 50 }),
      );

      // Higher attack level → more damage → harder for player
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;
      expect(lastWinRate).toBeLessThanOrEqual(firstWinRate);
    });
  });

  describe('defenseLevel sweep', () => {
    it('win rate decreases as enemy defense level increases', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, rarity: 'common' }),
        makeSweepParams('defenseLevel', { min: 1, max: 15, step: 2 }, { simulationsPerPoint: 50 }),
      );

      // Higher defense level → higher AC → harder to hit → harder for player
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;
      expect(lastWinRate).toBeLessThanOrEqual(firstWinRate);
    });
  });

  // ─── Difficulty Multiplier Sweep ────────────────────────────────────────

  describe('difficultyMultiplier sweep', () => {
    it('win rate decreases as difficulty multiplier increases', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, rarity: 'common' }),
        makeSweepParams('difficultyMultiplier', { min: 0.5, max: 3.0, step: 0.5 }, { simulationsPerPoint: 50 }),
      );

      // Higher multiplier → stronger enemy → harder
      const firstWinRate = results.dataPoints[0].playerWinRate;
      const lastWinRate = results.dataPoints[results.dataPoints.length - 1].playerWinRate;
      expect(lastWinRate).toBeLessThanOrEqual(firstWinRate);
    });
  });

  // ─── Progress Callback ─────────────────────────────────────────────────

  describe('progress callback', () => {
    it('calls onProgress for each data point', () => {
      const players = makePlayers(1, 5);
      const progress = vi.fn();

      sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 5 }),
        progress,
      );

      expect(progress).toHaveBeenCalledTimes(5);
      // First call: (1, 5), second: (2, 5), ..., fifth: (5, 5)
      expect(progress).toHaveBeenNthCalledWith(1, 1, 5);
      expect(progress).toHaveBeenNthCalledWith(5, 5, 5);
    });

    it('progress total matches data point count', () => {
      const players = makePlayers(1, 5);
      const progress = vi.fn();

      sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 10, step: 2 }, { simulationsPerPoint: 5 }),
        progress,
      );

      // 5 data points: 1, 3, 5, 7, 9
      expect(progress).toHaveBeenCalledTimes(5);
      for (let i = 0; i < 5; i++) {
        expect(progress).toHaveBeenNthCalledWith(i + 1, i + 1, 5);
      }
    });
  });

  // ─── Cancellation ──────────────────────────────────────────────────────

  describe('cancellation', () => {
    it('returns partial results when cancelled via AbortSignal', () => {
      const players = makePlayers(1, 5);
      const controller = new AbortController();

      // Abort immediately
      controller.abort();

      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 10, step: 1 }, {
          simulationsPerPoint: 10,
          abortSignal: controller.signal,
        }),
      );

      expect(results.wasCancelled).toBe(true);
      // Should have 0 data points since we aborted before any started
      expect(results.dataPoints.length).toBeLessThan(10);
    });

    it('returns wasCancelled=false when signal not aborted', () => {
      const players = makePlayers(1, 5);
      const controller = new AbortController();

      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 2, step: 1 }, {
          simulationsPerPoint: 5,
          abortSignal: controller.signal,
        }),
      );

      expect(results.wasCancelled).toBe(false);
      expect(results.dataPoints).toHaveLength(2);
    });
  });

  // ─── AI Config Variations ──────────────────────────────────────────────

  describe('AI config variations', () => {
    it('normal vs aggressive AI produce different results', () => {
      const players = makePlayers(1, 5);
      const params = makeSweepParams('cr', { min: 1, max: 5, step: 1 }, { simulationsPerPoint: 50 });

      const normalResults = sweeper.sweep(
        players,
        makeEnemyConfig(),
        { ...params, aiConfig: normalAI },
      );
      const aggressiveResults = sweeper.sweep(
        players,
        makeEnemyConfig(),
        { ...params, aiConfig: aggressiveAI, baseSeed: 'aggressive-sweep' },
      );

      // Different AI strategies should produce at least some different data points
      let hasDifference = false;
      for (let i = 0; i < normalResults.dataPoints.length; i++) {
        if (normalResults.dataPoints[i].playerWinRate !== aggressiveResults.dataPoints[i].playerWinRate) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles single data point sweep', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 3, max: 3, step: 1 }, { simulationsPerPoint: 20 }),
      );

      expect(results.dataPoints).toHaveLength(1);
      expect(results.dataPoints[0].parameterValue).toBe(3);
      expect(results.dataPoints[0].playerWinRate).toBeGreaterThanOrEqual(0);
      expect(results.dataPoints[0].playerWinRate).toBeLessThanOrEqual(1);
    });

    it('handles very low simulations per point', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 3, step: 1 }, { simulationsPerPoint: 1 }),
      );

      expect(results.dataPoints).toHaveLength(3);
      for (const dp of results.dataPoints) {
        // With 1 run, win rate is either 0 or 1
        expect([0, 1]).toContain(dp.playerWinRate);
      }
    });

    it('handles missing base seed (uses default)', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 1, max: 2, step: 1 }, {
          simulationsPerPoint: 10,
          baseSeed: undefined,
        }),
      );

      expect(results.dataPoints).toHaveLength(2);
      // Should still produce valid results with default seed
      for (const dp of results.dataPoints) {
        expect(dp.playerWinRate).toBeGreaterThanOrEqual(0);
        expect(dp.playerWinRate).toBeLessThanOrEqual(1);
      }
    });

    it('handles fractional step sizes', () => {
      const players = makePlayers(1, 5);
      const results = sweeper.sweep(
        players,
        makeEnemyConfig(),
        makeSweepParams('cr', { min: 0.5, max: 2.0, step: 0.5 }, { simulationsPerPoint: 5 }),
      );

      const values = results.dataPoints.map(dp => dp.parameterValue);
      expect(values).toEqual([0.5, 1.0, 1.5, 2.0]);
    });
  });

  // ─── Performance Sanity ────────────────────────────────────────────────

  describe('performance', () => {
    it('completes a 10-point sweep with 100 simulations per point in reasonable time', () => {
      const players = makePlayers(4, 5);
      const start = performance.now();

      sweeper.sweep(
        players,
        makeEnemyConfig({ cr: 3, rarity: 'common' }),
        makeSweepParams('cr', { min: 1, max: 10, step: 1 }, { simulationsPerPoint: 100 }),
      );

      const elapsed = performance.now() - start;
      // 10 data points × 100 simulations = 1000 total combat runs
      // Should complete in under 5 seconds
      expect(elapsed).toBeLessThan(5000);
    });
  });
});
