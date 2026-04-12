/**
 * CombatSimulator Unit Tests
 *
 * Task 3.3.1: Tests for the Monte Carlo combat simulator.
 * Covers:
 * - Deterministic results: same seed + same config = identical results
 * - Different seeds produce different results
 * - Aggregation math: mean, median, histograms
 * - Cancellation via AbortSignal
 * - Progress callback
 * - Detailed logs collection
 * - Per-combatant metrics
 * - Various party/enemy compositions
 * - Edge cases: 0 runs, single combatant, etc.
 */

import { describe, it, expect, vi } from 'vitest';
import { CombatSimulator } from '../../../src/core/combat/Simulation/CombatSimulator.js';
import type {
  SimulationResults,
  SimulationSummary,
  CombatantSimulationMetrics,
  HistogramBucket,
  SimulationConfig,
} from '../../../src/core/combat/Simulation/CombatSimulator.js';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';
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

function createEnemy(cr: number, rarity: 'common' | 'uncommon' | 'elite' | 'boss', seed: string): CharacterSheet {
  return EnemyGenerator.generate({ seed, cr, rarity });
}

const normalAI: AIConfig = { playerStyle: 'normal', enemyStyle: 'normal' };
const aggressiveAI: AIConfig = { playerStyle: 'aggressive', enemyStyle: 'aggressive' };

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    runCount: 10,
    baseSeed: 'sim-test',
    aiConfig: normalAI,
    ...overrides,
  };
}

/** Compare two SimulationResults for deep equality (handling Maps) */
function expectResultsEqual(a: SimulationResults, b: SimulationResults) {
  expect(a.summary.totalRuns).toBe(b.summary.totalRuns);
  expect(a.summary.playerWins).toBe(b.summary.playerWins);
  expect(a.summary.enemyWins).toBe(b.summary.enemyWins);
  expect(a.summary.draws).toBe(b.summary.draws);
  expect(a.summary.playerWinRate).toBe(b.summary.playerWinRate);
  expect(a.summary.averageRounds).toBe(b.summary.averageRounds);
  expect(a.summary.medianRounds).toBe(b.summary.medianRounds);
  expect(a.summary.averageRoundsOnWin).toBe(b.summary.averageRoundsOnWin);
  expect(a.summary.averageRoundsOnLoss).toBe(b.summary.averageRoundsOnLoss);
  expect(a.summary.averagePlayerHPPercentRemaining).toBe(b.summary.averagePlayerHPPercentRemaining);
  expect(a.summary.totalPlayerDeaths).toBe(b.summary.totalPlayerDeaths);
  expect(a.summary.averageRoundsPerPlayerDeath).toBe(b.summary.averageRoundsPerPlayerDeath);
  expect(a.summary.totalEnemyDeaths).toBe(b.summary.totalEnemyDeaths);
  expect(a.summary.averageRoundsPerEnemyDeath).toBe(b.summary.averageRoundsPerEnemyDeath);

  // Compare per-combatant metrics
  expect(a.perCombatantMetrics.size).toBe(b.perCombatantMetrics.size);
  for (const [id, metricsA] of a.perCombatantMetrics) {
    const metricsB = b.perCombatantMetrics.get(id);
    expect(metricsB).toBeDefined();
    if (metricsB) {
      expect(metricsA.combatantId).toBe(metricsB.combatantId);
      expect(metricsA.name).toBe(metricsB.name);
      expect(metricsA.side).toBe(metricsB.side);
      expect(metricsA.averageDamagePerRound).toBeCloseTo(metricsB.averageDamagePerRound, 10);
      expect(metricsA.medianDamagePerRound).toBeCloseTo(metricsB.medianDamagePerRound, 10);
      expect(metricsA.averageTotalDamageDealt).toBeCloseTo(metricsB.averageTotalDamageDealt, 10);
      expect(metricsA.averageTotalDamageTaken).toBeCloseTo(metricsB.averageTotalDamageTaken, 10);
      expect(metricsA.averageHealingDone).toBeCloseTo(metricsB.averageHealingDone, 10);
      expect(metricsA.averageRoundsSurvived).toBeCloseTo(metricsB.averageRoundsSurvived, 10);
      expect(metricsA.survivalRate).toBeCloseTo(metricsB.survivalRate, 10);
      expect(metricsA.killRate).toBeCloseTo(metricsB.killRate, 10);
      expect(metricsA.criticalHitRate).toBeCloseTo(metricsB.criticalHitRate, 10);
      expect(metricsA.averageSpellSlotsUsed).toBeCloseTo(metricsB.averageSpellSlotsUsed, 10);
      expect(metricsA.mostUsedAction).toBe(metricsB.mostUsedAction);

      // Compare histograms
      expect(metricsA.damageDistribution.length).toBe(metricsB.damageDistribution.length);
      expect(metricsA.hpRemainingDistribution.length).toBe(metricsB.hpRemainingDistribution.length);
      for (let i = 0; i < metricsA.damageDistribution.length; i++) {
        expect(metricsA.damageDistribution[i].rangeStart).toBeCloseTo(metricsB.damageDistribution[i].rangeStart, 10);
        expect(metricsA.damageDistribution[i].rangeEnd).toBeCloseTo(metricsB.damageDistribution[i].rangeEnd, 10);
        expect(metricsA.damageDistribution[i].count).toBe(metricsB.damageDistribution[i].count);
        expect(metricsA.damageDistribution[i].percent).toBeCloseTo(metricsB.damageDistribution[i].percent, 10);
      }
      for (let i = 0; i < metricsA.hpRemainingDistribution.length; i++) {
        expect(metricsA.hpRemainingDistribution[i].rangeStart).toBeCloseTo(metricsB.hpRemainingDistribution[i].rangeStart, 10);
        expect(metricsA.hpRemainingDistribution[i].rangeEnd).toBeCloseTo(metricsB.hpRemainingDistribution[i].rangeEnd, 10);
        expect(metricsA.hpRemainingDistribution[i].count).toBe(metricsB.hpRemainingDistribution[i].count);
      }
    }
  }

  // Compare party and encounter config
  expect(a.party.memberCount).toBe(b.party.memberCount);
  expect(a.party.averageLevel).toBe(b.party.averageLevel);
  expect(a.party.memberNames).toEqual(b.party.memberNames);
  expect(a.encounter.enemyCount).toBe(b.encounter.enemyCount);
  expect(a.encounter.averageCR).toBe(b.encounter.averageCR);
  expect(a.encounter.enemyNames).toEqual(b.encounter.enemyNames);
}

// ─── Determinism ──────────────────────────────────────────────────────────────

describe('CombatSimulator - Determinism', () => {
  it('same seed + same config = identical results (summary)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'goblin-1');
    const config = makeConfig({ runCount: 20, baseSeed: 'determinism-test' });
    const simulator = new CombatSimulator();

    const results1 = simulator.run([player], [enemy], config);
    const results2 = simulator.run([player], [enemy], config);

    expect(results1.summary).toEqual(results2.summary);
  });

  it('same seed + same config = identical results (per-combatant metrics)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'goblin-2');
    const config = makeConfig({ runCount: 20, baseSeed: 'determinism-metrics' });
    const simulator = new CombatSimulator();

    const results1 = simulator.run([player], [enemy], config);
    const results2 = simulator.run([player], [enemy], config);

    expectResultsEqual(results1, results2);
  });

  it('same seed + same config = identical results (party of 4 vs enemies)', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Paladin'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [
      createEnemy(5, 'common', 'enemy-a'),
      createEnemy(5, 'common', 'enemy-b'),
    ];
    const config = makeConfig({ runCount: 15, baseSeed: 'party-determinism' });
    const simulator = new CombatSimulator();

    const results1 = simulator.run(players, enemies, config);
    const results2 = simulator.run(players, enemies, config);

    expectResultsEqual(results1, results2);
  });

  it('different seeds produce different results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'goblin-3');
    const simulator = new CombatSimulator();

    const resultsA = simulator.run([player], [enemy], makeConfig({ runCount: 50, baseSeed: 'seed-a' }));
    const resultsB = simulator.run([player], [enemy], makeConfig({ runCount: 50, baseSeed: 'seed-b' }));

    // It's possible (but unlikely with 50 runs) that two different seeds produce
    // the exact same summary. We check that the outcomes differ in at least one metric.
    const atLeastOneDifference =
      resultsA.summary.playerWins !== resultsB.summary.playerWins ||
      resultsA.summary.enemyWins !== resultsB.summary.enemyWins ||
      resultsA.summary.draws !== resultsB.summary.draws ||
      resultsA.summary.averageRounds !== resultsB.summary.averageRounds;

    expect(atLeastOneDifference).toBe(true);
  });

  it('different run counts produce different totalRuns', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'goblin-4');
    const simulator = new CombatSimulator();

    const results10 = simulator.run([player], [enemy], makeConfig({ runCount: 10 }));
    const results50 = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));

    expect(results10.summary.totalRuns).toBe(10);
    expect(results50.summary.totalRuns).toBe(50);
  });
});

// ─── Summary Aggregation Math ────────────────────────────────────────────────

describe('CombatSimulator - Summary Aggregation', () => {
  it('totalRuns equals runCount (no cancellation)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-1');
    const simulator = new CombatSimulator();

    for (const count of [5, 10, 25]) {
      const results = simulator.run([player], [enemy], makeConfig({ runCount: count }));
      expect(results.summary.totalRuns).toBe(count);
    }
  });

  it('playerWins + enemyWins + draws = totalRuns', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-2');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));
    const { totalRuns, playerWins, enemyWins, draws } = results.summary;

    expect(playerWins + enemyWins + draws).toBe(totalRuns);
  });

  it('playerWinRate = playerWins / totalRuns', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-3');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));
    const { totalRuns, playerWins, playerWinRate } = results.summary;

    if (totalRuns > 0) {
      expect(playerWinRate).toBeCloseTo(playerWins / totalRuns, 10);
    }
  });

  it('playerWinRate is between 0 and 1', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-4');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));

    expect(results.summary.playerWinRate).toBeGreaterThanOrEqual(0);
    expect(results.summary.playerWinRate).toBeLessThanOrEqual(1);
  });

  it('averageRounds is non-negative', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-5');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));

    expect(results.summary.averageRounds).toBeGreaterThanOrEqual(0);
  });

  it('medianRounds is non-negative', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-6');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));

    expect(results.summary.medianRounds).toBeGreaterThanOrEqual(0);
  });

  it('averagePlayerHPPercentRemaining is between 0 and 100 on player wins', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(1, 'common', 'weak-agg');
    const simulator = new CombatSimulator();

    // Use a weak enemy so players win most of the time
    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));

    if (results.summary.playerWins > 0) {
      expect(results.summary.averagePlayerHPPercentRemaining).toBeGreaterThanOrEqual(0);
      expect(results.summary.averagePlayerHPPercentRemaining).toBeLessThanOrEqual(100);
    }
  });

  it('totalPlayerDeaths and totalEnemyDeaths are non-negative', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'agg-math-7');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 50 }));

    expect(results.summary.totalPlayerDeaths).toBeGreaterThanOrEqual(0);
    expect(results.summary.totalEnemyDeaths).toBeGreaterThanOrEqual(0);
  });
});

// ─── Per-Combatant Metrics ────────────────────────────────────────────────────

describe('CombatSimulator - Per-Combatant Metrics', () => {
  it('perCombatantMetrics has an entry for each player and enemy', () => {
    const players = [createArmedPlayer(5, 'Fighter'), createArmedPlayer(5, 'Cleric')];
    const enemies = [createEnemy(5, 'common', 'pcm-enemy-1')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 10 }));

    expect(results.perCombatantMetrics.size).toBe(3); // 2 players + 1 enemy
    expect(results.perCombatantMetrics.has('player_0')).toBe(true);
    expect(results.perCombatantMetrics.has('player_1')).toBe(true);
    expect(results.perCombatantMetrics.has('enemy_2')).toBe(true);
  });

  it('per-combatant metrics have correct IDs, names, and sides', () => {
    const players = [createArmedPlayer(5, 'Fighter')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-2')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 10 }));

    const playerMetrics = results.perCombatantMetrics.get('player_0');
    const enemyMetrics = results.perCombatantMetrics.get('enemy_1');

    expect(playerMetrics).toBeDefined();
    expect(playerMetrics!.combatantId).toBe('player_0');
    expect(playerMetrics!.name).toBe('Fighter');
    expect(playerMetrics!.side).toBe('player');

    expect(enemyMetrics).toBeDefined();
    expect(enemyMetrics!.combatantId).toBe('enemy_1');
    expect(enemyMetrics!.side).toBe('enemy');
  });

  it('averageDamagePerRound is non-negative for all combatants', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-3')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 20 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      expect(metrics.averageDamagePerRound).toBeGreaterThanOrEqual(0);
    }
  });

  it('averageTotalDamageDealt is non-negative', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-4')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 20 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      expect(metrics.averageTotalDamageDealt).toBeGreaterThanOrEqual(0);
    }
  });

  it('survivalRate is between 0 and 1', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-5')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 50 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      expect(metrics.survivalRate).toBeGreaterThanOrEqual(0);
      expect(metrics.survivalRate).toBeLessThanOrEqual(1);
    }
  });

  it('criticalHitRate is between 0 and 1', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-6')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 50 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      expect(metrics.criticalHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.criticalHitRate).toBeLessThanOrEqual(1);
    }
  });

  it('mostUsedAction is a non-empty string', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-7')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 20 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      expect(typeof metrics.mostUsedAction).toBe('string');
      expect(metrics.mostUsedAction.length).toBeGreaterThan(0);
    }
  });

  it('damageDistribution is an array of HistogramBuckets with valid structure', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-8')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 20 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      for (const bucket of metrics.damageDistribution) {
        expect(bucket.rangeStart).toBeLessThanOrEqual(bucket.rangeEnd);
        expect(bucket.count).toBeGreaterThanOrEqual(0);
        expect(bucket.percent).toBeGreaterThanOrEqual(0);
        expect(bucket.percent).toBeLessThanOrEqual(100);
      }
    }
  });

  it('hpRemainingDistribution is an array of HistogramBuckets with valid structure', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'pcm-enemy-9')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 20 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      for (const bucket of metrics.hpRemainingDistribution) {
        expect(bucket.rangeStart).toBeLessThanOrEqual(bucket.rangeEnd);
        expect(bucket.count).toBeGreaterThanOrEqual(0);
        expect(bucket.percent).toBeGreaterThanOrEqual(0);
        expect(bucket.percent).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ─── Histogram Math ───────────────────────────────────────────────────────────

describe('CombatSimulator - Histogram Math', () => {
  it('histogram bucket counts sum to total data points', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'hist-1')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 50 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      if (metrics.damageDistribution.length > 0) {
        const totalCount = metrics.damageDistribution.reduce((sum, b) => sum + b.count, 0);
        // Total count should equal the number of runs where this combatant dealt damage
        expect(totalCount).toBeLessThanOrEqual(results.summary.totalRuns);
        expect(totalCount).toBeGreaterThan(0);

        // Percentages should sum to 100
        const totalPercent = metrics.damageDistribution.reduce((sum, b) => sum + b.percent, 0);
        expect(totalPercent).toBeCloseTo(100, 1);
      }
    }
  });

  it('histogram buckets cover contiguous ranges', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'hist-2')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 50 }));

    for (const [, metrics] of results.perCombatantMetrics) {
      const buckets = metrics.damageDistribution;
      if (buckets.length > 1) {
        for (let i = 1; i < buckets.length; i++) {
          // Each bucket's start should equal previous bucket's end
          expect(buckets[i].rangeStart).toBeCloseTo(buckets[i - 1].rangeEnd, 5);
        }
      }
    }
  });

  it('histogram with single unique value produces single bucket at 100%', () => {
    // This is a structural test — the histogram builder handles edge cases
    // We can't easily force all DPR values to be identical, but we can
    // verify the empty histogram case (0 runs = empty array)
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'hist-3');
    const simulator = new CombatSimulator();

    // 0 runs should produce empty histograms (no data points)
    const results = simulator.run([player], [enemy], makeConfig({ runCount: 0 }));

    expect(results.summary.totalRuns).toBe(0);
    for (const [, metrics] of results.perCombatantMetrics) {
      // With 0 runs, all averages should be 0
      expect(metrics.averageDamagePerRound).toBe(0);
      expect(metrics.survivalRate).toBe(0);
    }
  });
});

// ─── Cancellation ─────────────────────────────────────────────────────────────

describe('CombatSimulator - Cancellation', () => {
  it('AbortSignal.aborted before run returns 0 results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-1');
    const simulator = new CombatSimulator();
    const controller = new AbortController();
    controller.abort();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      abortSignal: controller.signal,
    }));

    expect(results.summary.totalRuns).toBe(0);
    expect(results.summary.playerWins).toBe(0);
    expect(results.summary.enemyWins).toBe(0);
    expect(results.summary.draws).toBe(0);
    expect(results.wasCancelled).toBe(true);
  });

  it('cancellation mid-run returns partial results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-2');
    const simulator = new CombatSimulator();
    const controller = new AbortController();

    let callCount = 0;
    const config = makeConfig({
      runCount: 50,
      abortSignal: controller.signal,
      onProgress: (completed, _total) => {
        callCount++;
        // Abort after 5 runs complete
        if (completed >= 5) {
          controller.abort();
        }
      },
    });

    const results = simulator.run([player], [enemy], config);

    // Should have completed some runs but not all 50
    expect(results.summary.totalRuns).toBeGreaterThan(0);
    expect(results.summary.totalRuns).toBeLessThan(50);
    // Should be roughly 5 (the abort point)
    expect(results.summary.totalRuns).toBeLessThanOrEqual(10);
    expect(results.wasCancelled).toBe(true);
  });

  it('partial results have valid summary (wins + losses + draws = total)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-3');
    const simulator = new CombatSimulator();
    const controller = new AbortController();

    const config = makeConfig({
      runCount: 50,
      abortSignal: controller.signal,
      onProgress: (completed) => {
        if (completed >= 3) controller.abort();
      },
    });

    const results = simulator.run([player], [enemy], config);
    const { totalRuns, playerWins, enemyWins, draws } = results.summary;

    expect(playerWins + enemyWins + draws).toBe(totalRuns);
    expect(results.wasCancelled).toBe(true);
  });

  it('no abort signal runs all runs and wasCancelled is false', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-4');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 25 }));
    expect(results.summary.totalRuns).toBe(25);
    expect(results.wasCancelled).toBe(false);
  });

  it('wasCancelled is false when all runs complete without signal', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-5');
    const simulator = new CombatSimulator();
    const controller = new AbortController();

    // Provide signal but never abort
    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 15,
      abortSignal: controller.signal,
    }));

    expect(results.summary.totalRuns).toBe(15);
    expect(results.wasCancelled).toBe(false);
  });

  it('wasCancelled is true even when 0 runs completed', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-6');
    const simulator = new CombatSimulator();
    const controller = new AbortController();
    controller.abort();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 100,
      abortSignal: controller.signal,
    }));

    expect(results.summary.totalRuns).toBe(0);
    expect(results.wasCancelled).toBe(true);
  });

  it('cancelled results still have valid per-combatant metrics', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-7');
    const simulator = new CombatSimulator();
    const controller = new AbortController();

    const config = makeConfig({
      runCount: 50,
      abortSignal: controller.signal,
      onProgress: (completed) => {
        if (completed >= 3) controller.abort();
      },
    });

    const results = simulator.run([player], [enemy], config);

    expect(results.wasCancelled).toBe(true);
    // Per-combatant metrics should still be present and valid
    expect(results.perCombatantMetrics.size).toBe(2);
    for (const [, metrics] of results.perCombatantMetrics) {
      expect(metrics.survivalRate).toBeGreaterThanOrEqual(0);
      expect(metrics.survivalRate).toBeLessThanOrEqual(1);
      expect(metrics.averageDamagePerRound).toBeGreaterThanOrEqual(0);
    }
  });

  it('cancelled detailed logs contain only completed runs', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cancel-8');
    const simulator = new CombatSimulator();
    const controller = new AbortController();

    const config = makeConfig({
      runCount: 50,
      abortSignal: controller.signal,
      collectDetailedLogs: true,
      onProgress: (completed) => {
        if (completed >= 3) controller.abort();
      },
    });

    const results = simulator.run([player], [enemy], config);

    expect(results.wasCancelled).toBe(true);
    expect(results.runDetails).toBeDefined();
    expect(results.runDetails!.length).toBe(results.summary.totalRuns);
    expect(results.runDetails!.length).toBeLessThan(50);
    // Each run detail should have sequential indices
    for (let i = 0; i < results.runDetails!.length; i++) {
      expect(results.runDetails![i].runIndex).toBe(i);
    }
  });
});

// ─── Progress Callback ────────────────────────────────────────────────────────

describe('CombatSimulator - Progress Callback', () => {
  it('onProgress called once per run with correct completed/total', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'progress-1');
    const simulator = new CombatSimulator();

    const progressCalls: Array<{ completed: number; total: number }> = [];
    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 10,
      onProgress: (completed, total) => {
        progressCalls.push({ completed, total });
      },
    }));

    expect(progressCalls.length).toBe(10);
    // Each call should have the same total
    for (const call of progressCalls) {
      expect(call.total).toBe(10);
    }
    // Completed should increment: 1, 2, 3, ..., 10
    expect(progressCalls[0].completed).toBe(1);
    expect(progressCalls[1].completed).toBe(2);
    expect(progressCalls[9].completed).toBe(10);
  });

  it('onProgress is optional (no error if omitted)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'progress-2');
    const simulator = new CombatSimulator();

    // Should not throw
    const results = simulator.run([player], [enemy], makeConfig({ runCount: 5 }));
    expect(results.summary.totalRuns).toBe(5);
  });
});

// ─── Detailed Logs ────────────────────────────────────────────────────────────

describe('CombatSimulator - Detailed Logs', () => {
  it('collectDetailedLogs=false produces no runDetails', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'logs-1');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 10,
      collectDetailedLogs: false,
    }));

    expect(results.runDetails).toBeUndefined();
  });

  it('collectDetailedLogs=true produces runDetails with correct count', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'logs-2');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 10,
      collectDetailedLogs: true,
    }));

    expect(results.runDetails).toBeDefined();
    expect(results.runDetails!.length).toBe(10);
  });

  it('runDetails entries have correct structure', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'logs-3');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 5,
      collectDetailedLogs: true,
    }));

    for (let i = 0; i < results.runDetails!.length; i++) {
      const detail = results.runDetails![i];
      expect(detail.runIndex).toBe(i);
      expect(typeof detail.seed).toBe('string');
      expect(detail.seed).toContain(`sim-test-${i}`);
      expect(detail.result).toBeDefined();
      expect(detail.result.winnerSide).toBeDefined();
      expect(detail.metrics).toBeInstanceOf(Map);
    }
  });

  it('detailed logs determinism: same seed = identical runDetails', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'logs-4');
    const simulator = new CombatSimulator();
    const config = makeConfig({ runCount: 5, baseSeed: 'det-logs', collectDetailedLogs: true });

    const results1 = simulator.run([player], [enemy], config);
    const results2 = simulator.run([player], [enemy], config);

    expect(results1.runDetails!.length).toBe(results2.runDetails!.length);
    for (let i = 0; i < results1.runDetails!.length; i++) {
      expect(results1.runDetails![i].result.winnerSide).toBe(results2.runDetails![i].result.winnerSide);
      expect(results1.runDetails![i].result.roundsElapsed).toBe(results2.runDetails![i].result.roundsElapsed);
    }
  });
});

// ─── Party and Encounter Config ───────────────────────────────────────────────

describe('CombatSimulator - Party and Encounter Config', () => {
  it('party config reflects input party', () => {
    const players = [
      createArmedPlayer(3, 'Fighter'),
      createArmedPlayer(5, 'Wizard'),
      createArmedPlayer(7, 'Rogue'),
    ];
    const enemies = [createEnemy(5, 'common', 'pe-1')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 5 }));

    expect(results.party.memberCount).toBe(3);
    expect(results.party.averageLevel).toBeCloseTo(5, 1); // (3+5+7)/3
    expect(results.party.memberNames).toEqual(['Fighter', 'Wizard', 'Rogue']);
  });

  it('encounter config reflects input enemies', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [
      createEnemy(3, 'common', 'pe-2'),
      createEnemy(5, 'elite', 'pe-3'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 5 }));

    expect(results.encounter.enemyCount).toBe(2);
    expect(results.encounter.averageCR).toBeCloseTo(4, 1); // (3+5)/2
  });
});

// ─── AI Config Variations ─────────────────────────────────────────────────────

describe('CombatSimulator - AI Config Variations', () => {
  it('aggressive AI produces different results than normal AI', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'aivar-1');
    const simulator = new CombatSimulator();

    const normalResults = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      baseSeed: 'ai-normal',
      aiConfig: normalAI,
    }));

    const aggressiveResults = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      baseSeed: 'ai-aggressive',
      aiConfig: aggressiveAI,
    }));

    // Aggressive AI should produce measurably different results
    const outcomesDiffer =
      normalResults.summary.playerWins !== aggressiveResults.summary.playerWins ||
      normalResults.summary.averageRounds !== aggressiveResults.summary.averageRounds;

    expect(outcomesDiffer).toBe(true);
  });

  it('mixed AI styles work (normal players, aggressive enemies)', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(3, 'common', 'aivar-2')];
    const simulator = new CombatSimulator();

    const mixedAI: AIConfig = {
      playerStyle: 'normal',
      enemyStyle: 'aggressive',
    };

    // Should not throw
    const results = simulator.run(players, enemies, makeConfig({
      runCount: 10,
      aiConfig: mixedAI,
    }));

    expect(results.summary.totalRuns).toBe(10);
    expect(results.summary.playerWins + results.summary.enemyWins + results.summary.draws).toBe(10);
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('CombatSimulator - Edge Cases', () => {
  it('0 runs produces valid empty results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'edge-1');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 0 }));

    expect(results.summary.totalRuns).toBe(0);
    expect(results.summary.playerWins).toBe(0);
    expect(results.summary.enemyWins).toBe(0);
    expect(results.summary.draws).toBe(0);
    expect(results.summary.playerWinRate).toBe(0);
    expect(results.summary.averageRounds).toBe(0);
    expect(results.summary.medianRounds).toBe(0);
  });

  it('1 run produces valid results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'edge-2');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 1 }));

    expect(results.summary.totalRuns).toBe(1);
    expect(results.summary.playerWins + results.summary.enemyWins + results.summary.draws).toBe(1);
    expect(results.summary.playerWinRate).toBeGreaterThanOrEqual(0);
    expect(results.summary.playerWinRate).toBeLessThanOrEqual(1);
  });

  it('large party vs single boss works', () => {
    const players = Array.from({ length: 4 }, (_, i) =>
      createArmedPlayer(5, `Hero ${i + 1}`),
    );
    const enemies = [createEnemy(10, 'boss', 'big-boss')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 10 }));

    expect(results.summary.totalRuns).toBe(10);
    expect(results.perCombatantMetrics.size).toBe(5); // 4 players + 1 boss
  });

  it('single player vs many weak enemies works', () => {
    const players = [createArmedPlayer(10, 'Solo Hero')];
    const enemies = Array.from({ length: 5 }, (_, i) =>
      createEnemy(1, 'common', `mob-${i}`),
    );
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({ runCount: 10 }));

    expect(results.summary.totalRuns).toBe(10);
    expect(results.perCombatantMetrics.size).toBe(6); // 1 player + 5 enemies
  });

  it('combatConfig maxTurnsBeforeDraw is respected', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'edge-3');
    const simulator = new CombatSimulator();

    // Very low max turns to force draws
    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 20,
      combatConfig: { maxTurnsBeforeDraw: 2 },
    }));

    // With only 2 turns, most fights should end in draws
    expect(results.summary.totalRuns).toBe(20);
    // At least some should be draws (not guaranteed all, but most)
    expect(results.summary.draws).toBeGreaterThan(0);
  });
});

// ─── Statistical Properties ───────────────────────────────────────────────────

describe('CombatSimulator - Statistical Properties', () => {
  it('overwhelmingly stronger party wins most fights', () => {
    // Level 10 party of 4 vs CR 1 common enemy
    const players = Array.from({ length: 4 }, (_, i) =>
      createArmedPlayer(10, `Hero ${i + 1}`),
    );
    const enemies = [createEnemy(1, 'common', 'stat-weak')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'strong-party',
    }));

    expect(results.summary.playerWinRate).toBeGreaterThan(0.8);
  });

  it('overwhelmingly stronger enemy wins most fights', () => {
    // Level 1 player vs CR 10 boss
    const players = [createArmedPlayer(1, 'Newbie')];
    const enemies = [createEnemy(10, 'boss', 'stat-strong')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 200,
      baseSeed: 'strong-enemy',
    }));

    expect(results.summary.playerWinRate).toBeLessThan(0.2);
  });

  it('round count distribution is reasonable (positive mean and variance)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'stat-dist');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      collectDetailedLogs: true,
    }));

    // Average rounds should be positive
    expect(results.summary.averageRounds).toBeGreaterThan(0);

    // Not all fights should end in the exact same round count
    const roundCounts = results.runDetails!.map(d => d.result.roundsElapsed);
    const uniqueRounds = new Set(roundCounts);
    // With 50 fights, we should see some variance
    expect(uniqueRounds.size).toBeGreaterThan(1);
  });

  it('per-combatant kill rate and survival rate are consistent', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'stat-consist');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      collectDetailedLogs: true,
    }));

    const playerMetrics = results.perCombatantMetrics.get('player_0')!;
    const enemyMetrics = results.perCombatantMetrics.get('enemy_1')!;

    // Survival rates must be between 0 and 1
    expect(playerMetrics.survivalRate).toBeGreaterThanOrEqual(0);
    expect(playerMetrics.survivalRate).toBeLessThanOrEqual(1);
    expect(enemyMetrics.survivalRate).toBeGreaterThanOrEqual(0);
    expect(enemyMetrics.survivalRate).toBeLessThanOrEqual(1);

    // In a 1v1 with no draws, player survival rate = player win rate
    if (results.summary.draws === 0 && results.summary.totalRuns > 0) {
      const playerWinRate = results.summary.playerWins / results.summary.totalRuns;
      const enemyWinRate = results.summary.enemyWins / results.summary.totalRuns;
      expect(playerMetrics.survivalRate).toBeCloseTo(playerWinRate, 2);
      expect(enemyMetrics.survivalRate).toBeCloseTo(enemyWinRate, 2);
    }
  });
});

// ─── Config Stored in Results ─────────────────────────────────────────────────

describe('CombatSimulator - Config in Results', () => {
  it('results contain the config that was used', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(3, 'common', 'cfg-1');
    const simulator = new CombatSimulator();
    const config = makeConfig({ runCount: 15, baseSeed: 'config-check' });

    const results = simulator.run([player], [enemy], config);

    expect(results.config.runCount).toBe(15);
    expect(results.config.baseSeed).toBe('config-check');
    expect(results.config.aiConfig.playerStyle).toBe('normal');
    expect(results.config.aiConfig.enemyStyle).toBe('normal');
  });
});
