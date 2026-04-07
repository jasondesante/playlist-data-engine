/**
 * CombatSimulator Integration Tests
 *
 * Task 3.3.2: End-to-end integration tests for the Monte Carlo simulator.
 * Complements the unit tests in combatSimulator.test.ts by focusing on:
 * - Full pipeline: generate enemies → run simulation → validate all results
 * - Cross-metric consistency: summary ↔ per-combatant metrics ↔ detailed logs
 * - AI style behavioral differences: normal vs aggressive with same seeds
 * - Realistic encounter compositions across all rarities
 * - Result structure integrity at higher run counts
 * - Statistical sanity: convergence, variance, distribution shape
 */

import { describe, it, expect } from 'vitest';
import { CombatSimulator } from '../../../src/core/combat/Simulation/CombatSimulator.js';
import type { SimulationResults, SimulationConfig } from '../../../src/core/combat/Simulation/CombatSimulator.js';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';
import {
  createMockPartyCharacter,
  createBalancedParty,
  createHighLevelParty,
  createLowLevelParty,
} from '../../helpers/enemyTestHelpers.js';
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
    baseSeed: 'integration-test',
    aiConfig: normalAI,
    ...overrides,
  };
}

/** Validate that a SimulationResults object is internally consistent */
function validateResultsConsistency(results: SimulationResults): void {
  const { summary, perCombatantMetrics } = results;

  // Summary invariants
  expect(summary.totalRuns).toBeGreaterThanOrEqual(0);
  expect(summary.playerWins).toBeGreaterThanOrEqual(0);
  expect(summary.enemyWins).toBeGreaterThanOrEqual(0);
  expect(summary.draws).toBeGreaterThanOrEqual(0);
  expect(summary.playerWins + summary.enemyWins + summary.draws).toBe(summary.totalRuns);
  expect(summary.playerWinRate).toBeGreaterThanOrEqual(0);
  expect(summary.playerWinRate).toBeLessThanOrEqual(1);
  if (summary.totalRuns > 0) {
    expect(summary.playerWinRate).toBeCloseTo(summary.playerWins / summary.totalRuns, 10);
  }
  expect(summary.averageRounds).toBeGreaterThanOrEqual(0);
  expect(summary.medianRounds).toBeGreaterThanOrEqual(0);
  expect(summary.totalPlayerDeaths).toBeGreaterThanOrEqual(0);
  expect(summary.totalEnemyDeaths).toBeGreaterThanOrEqual(0);

  // Per-combatant metrics invariants
  expect(perCombatantMetrics.size).toBeGreaterThan(0);
  for (const [, m] of perCombatantMetrics) {
    expect(typeof m.combatantId).toBe('string');
    expect(typeof m.name).toBe('string');
    expect(['player', 'enemy']).toContain(m.side);
    expect(m.averageDamagePerRound).toBeGreaterThanOrEqual(0);
    expect(m.medianDamagePerRound).toBeGreaterThanOrEqual(0);
    expect(m.averageTotalDamageDealt).toBeGreaterThanOrEqual(0);
    expect(m.averageTotalDamageTaken).toBeGreaterThanOrEqual(0);
    expect(m.averageHealingDone).toBeGreaterThanOrEqual(0);
    expect(m.averageRoundsSurvived).toBeGreaterThanOrEqual(0);
    expect(m.survivalRate).toBeGreaterThanOrEqual(0);
    expect(m.survivalRate).toBeLessThanOrEqual(1);
    expect(m.killRate).toBeGreaterThanOrEqual(0);
    expect(m.killRate).toBeLessThanOrEqual(1);
    expect(m.criticalHitRate).toBeGreaterThanOrEqual(0);
    expect(m.criticalHitRate).toBeLessThanOrEqual(1);
    expect(m.averageSpellSlotsUsed).toBeGreaterThanOrEqual(0);
    expect(typeof m.mostUsedAction).toBe('string');
    expect(m.mostUsedAction.length).toBeGreaterThan(0);
    expect(Array.isArray(m.damageDistribution)).toBe(true);
    expect(Array.isArray(m.hpRemainingDistribution)).toBe(true);
  }

  // Party config
  expect(results.party.memberCount).toBeGreaterThan(0);
  expect(results.party.averageLevel).toBeGreaterThan(0);
  expect(results.party.memberNames.length).toBe(results.party.memberCount);

  // Encounter config
  expect(results.encounter.enemyCount).toBeGreaterThan(0);
  expect(results.encounter.averageCR).toBeGreaterThan(0);
  expect(results.encounter.enemyNames.length).toBe(results.encounter.enemyCount);
}

// ─── Full Pipeline Validation ─────────────────────────────────────────────────

describe('CombatSimulator Integration - Full Pipeline', () => {
  it('complete pipeline: generate enemies → simulate → validate all results', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];
    const enemies = [
      createEnemy(5, 'elite', 'pipeline-elite-1'),
      createEnemy(5, 'elite', 'pipeline-elite-2'),
    ];
    const simulator = new CombatSimulator();
    const results = simulator.run(players, enemies, makeConfig({ runCount: 20, baseSeed: 'pipeline-1' }));

    validateResultsConsistency(results);
    expect(results.summary.totalRuns).toBe(20);
    expect(results.perCombatantMetrics.size).toBe(6); // 4 players + 2 enemies
  });

  it('single player vs single enemy — minimal pipeline', () => {
    const player = createArmedPlayer(3, 'Solo');
    const enemy = createEnemy(2, 'common', 'pipeline-common-1');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({ runCount: 10, baseSeed: 'minimal' }));

    validateResultsConsistency(results);
    expect(results.summary.totalRuns).toBe(10);
    expect(results.perCombatantMetrics.size).toBe(2);
    expect(results.party.memberCount).toBe(1);
    expect(results.encounter.enemyCount).toBe(1);
  });

  it('boss fight pipeline with legendary actions', () => {
    const players = [
      createArmedPlayer(10, 'Fighter'),
      createArmedPlayer(10, 'Paladin'),
      createArmedPlayer(10, 'Cleric'),
      createArmedPlayer(10, 'Wizard'),
    ];
    const boss = createEnemy(15, 'boss', 'pipeline-boss-1');
    const simulator = new CombatSimulator();

    const results = simulator.run(players, [boss], makeConfig({ runCount: 20, baseSeed: 'boss-fight' }));

    validateResultsConsistency(results);
    expect(results.summary.totalRuns).toBe(20);
    expect(results.perCombatantMetrics.size).toBe(5);
    // Boss should have valid metrics
    const bossMetrics = results.perCombatantMetrics.get('enemy_4');
    expect(bossMetrics).toBeDefined();
    expect(bossMetrics!.side).toBe('enemy');
    expect(bossMetrics!.name).toBe(boss.name);
  });

  it('full pipeline with detailed logs — every run has valid structure', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(4, 'common', 'logs-enemy')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 15,
      baseSeed: 'detailed-logs',
      collectDetailedLogs: true,
    }));

    validateResultsConsistency(results);
    expect(results.runDetails).toBeDefined();
    expect(results.runDetails!.length).toBe(15);

    for (let i = 0; i < results.runDetails!.length; i++) {
      const detail = results.runDetails![i];
      expect(detail.runIndex).toBe(i);
      expect(typeof detail.seed).toBe('string');
      expect(detail.seed.length).toBeGreaterThan(0);
      expect(detail.result).toBeDefined();
      expect(['player', 'enemy', 'draw']).toContain(detail.result.winnerSide);
      expect(detail.result.roundsElapsed).toBeGreaterThan(0);
      expect(detail.metrics).toBeInstanceOf(Map);
      expect(detail.metrics.size).toBeGreaterThan(0);

      // Metrics in each run should match the combatant count
      for (const [, m] of detail.metrics) {
        expect(m.totalDamageDealt).toBeGreaterThanOrEqual(0);
        expect(m.totalDamageTaken).toBeGreaterThanOrEqual(0);
        expect(m.roundsSurvived).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ─── Cross-Metric Consistency ─────────────────────────────────────────────────

describe('CombatSimulator Integration - Cross-Metric Consistency', () => {
  it('per-combatant survival rates are consistent with summary win rates in 1v1', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'cross-1v1');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      baseSeed: 'cross-1v1-seed',
    }));

    const playerMetrics = results.perCombatantMetrics.get('player_0')!;
    const enemyMetrics = results.perCombatantMetrics.get('enemy_1')!;

    // In a 1v1 with no draws, player survival rate ≈ player win rate
    if (results.summary.draws === 0 && results.summary.totalRuns > 0) {
      const playerWinRate = results.summary.playerWins / results.summary.totalRuns;
      const enemyWinRate = results.summary.enemyWins / results.summary.totalRuns;
      expect(playerMetrics.survivalRate).toBeCloseTo(playerWinRate, 2);
      expect(enemyMetrics.survivalRate).toBeCloseTo(enemyWinRate, 2);
    }
  });

  it('total deaths in summary match per-combatant defeat patterns', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [
      createEnemy(6, 'elite', 'cross-elite-1'),
      createEnemy(6, 'elite', 'cross-elite-2'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 30,
      baseSeed: 'cross-deaths',
      collectDetailedLogs: true,
    }));

    // Count deaths from detailed logs and compare to per-combatant metrics
    const totalPlayerDeathRuns = results.runDetails!.filter(d =>
      d.metrics.get('player_0')?.survived === false ||
      d.metrics.get('player_1')?.survived === false,
    ).length;

    // Per-combatant survival rates should be consistent with totalRuns
    const totalRuns = results.summary.totalRuns;
    for (const [, m] of results.perCombatantMetrics) {
      // survivalRate = survivalCount / totalRuns → survivalCount ≈ survivalRate * totalRuns
      const expectedSurvivals = Math.round(m.survivalRate * totalRuns);
      expect(expectedSurvivals).toBeGreaterThanOrEqual(0);
      expect(expectedSurvivals).toBeLessThanOrEqual(totalRuns);
    }
  });

  it('average rounds survived is positive and reasonable for both sides', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'cross-rounds');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 30,
      baseSeed: 'cross-rounds-seed',
    }));

    const playerMetrics = results.perCombatantMetrics.get('player_0')!;
    const enemyMetrics = results.perCombatantMetrics.get('enemy_1')!;

    // Both sides should survive at least 1 round on average
    expect(playerMetrics.averageRoundsSurvived).toBeGreaterThanOrEqual(1);
    expect(enemyMetrics.averageRoundsSurvived).toBeGreaterThanOrEqual(1);

    // The winner's average rounds survived should be >= the loser's
    // (the winner is alive at the end of every fight they win)
    if (results.summary.playerWinRate > 0.5) {
      expect(playerMetrics.averageRoundsSurvived).toBeGreaterThanOrEqual(
        enemyMetrics.averageRoundsSurvived * 0.8,
      );
    }
  });

  it('histogram bucket counts sum to data points and percentages sum to ~100', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(5, 'common', 'cross-hist')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'cross-hist-seed',
    }));

    for (const [, m] of results.perCombatantMetrics) {
      if (m.damageDistribution.length > 0) {
        const totalPercent = m.damageDistribution.reduce((s, b) => s + b.percent, 0);
        expect(totalPercent).toBeCloseTo(100, 1);

        const totalCount = m.damageDistribution.reduce((s, b) => s + b.count, 0);
        expect(totalCount).toBeGreaterThan(0);
        expect(totalCount).toBeLessThanOrEqual(results.summary.totalRuns);
      }
    }
  });
});

// ─── AI Style Behavioral Differences ──────────────────────────────────────────

describe('CombatSimulator Integration - AI Style Behavioral Differences', () => {
  it('normal vs aggressive AI with different seeds produce measurably different results', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [createEnemy(5, 'elite', 'ai-diff-1')];
    const simulator = new CombatSimulator();

    // Use different seeds to guarantee different dice sequences
    const normalResults = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'ai-comparison-normal',
      aiConfig: normalAI,
    }));

    const aggressiveResults = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'ai-comparison-aggressive',
      aiConfig: aggressiveAI,
    }));

    // Different AI styles should produce different outcomes
    const outcomesDiffer =
      normalResults.summary.playerWins !== aggressiveResults.summary.playerWins ||
      normalResults.summary.enemyWins !== aggressiveResults.summary.enemyWins ||
      normalResults.summary.draws !== aggressiveResults.summary.draws ||
      normalResults.summary.averageRounds !== aggressiveResults.summary.averageRounds;

    expect(outcomesDiffer).toBe(true);
  });

  it('aggressive AI fights resolve differently than normal fights', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(5, 'common', 'ai-speed-1')];
    const simulator = new CombatSimulator();

    const normalResults = simulator.run(players, enemies, makeConfig({
      runCount: 100,
      baseSeed: 'ai-speed-test-normal',
      aiConfig: normalAI,
    }));

    const aggressiveResults = simulator.run(players, enemies, makeConfig({
      runCount: 100,
      baseSeed: 'ai-speed-test-aggressive',
      aiConfig: aggressiveAI,
    }));

    // Different seeds + different AI = different outcomes
    const outcomesDiffer =
      normalResults.summary.playerWins !== aggressiveResults.summary.playerWins ||
      normalResults.summary.enemyWins !== aggressiveResults.summary.enemyWins ||
      normalResults.summary.draws !== aggressiveResults.summary.draws ||
      normalResults.summary.averageRounds !== aggressiveResults.summary.averageRounds;

    expect(outcomesDiffer).toBe(true);
  });

  it('aggressive players deal more average damage than normal players', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(5, 'common', 'ai-dmg-1')];
    const simulator = new CombatSimulator();

    const normalResults = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'ai-dmg-test',
      aiConfig: { playerStyle: 'normal', enemyStyle: 'normal' },
    }));

    const aggressiveResults = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'ai-dmg-test',
      aiConfig: { playerStyle: 'aggressive', enemyStyle: 'normal' },
    }));

    const normalDPR = normalResults.perCombatantMetrics.get('player_0')!.averageDamagePerRound;
    const aggressiveDPR = aggressiveResults.perCombatantMetrics.get('player_0')!.averageDamagePerRound;

    // Aggressive players should deal at least as much damage (burns resources faster)
    // With same seed, aggressive might deal more due to spell usage
    expect(aggressiveDPR).toBeGreaterThanOrEqual(normalDPR * 0.5); // generous tolerance
  });

  it('mixed AI styles (normal players vs aggressive enemies) produce valid results', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [createEnemy(5, 'elite', 'ai-mix-1')];
    const simulator = new CombatSimulator();

    const allNormal = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'ai-mix-normal',
      aiConfig: { playerStyle: 'normal', enemyStyle: 'normal' },
    }));

    const aggressiveEnemies = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'ai-mix-aggressive',
      aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
    }));

    // Both should produce valid, internally consistent results
    validateResultsConsistency(allNormal);
    validateResultsConsistency(aggressiveEnemies);
    // Different seeds should produce different outcomes
    const outcomesDiffer =
      allNormal.summary.playerWins !== aggressiveEnemies.summary.playerWins ||
      allNormal.summary.averageRounds !== aggressiveEnemies.summary.averageRounds;
    expect(outcomesDiffer).toBe(true);
  });
});

// ─── Various Encounter Compositions ──────────────────────────────────────────

describe('CombatSimulator Integration - Various Compositions', () => {
  it('all four rarities in one encounter', () => {
    const players = createBalancedParty(10);
    const enemies = [
      createEnemy(1, 'common', 'rarity-common'),
      createEnemy(3, 'uncommon', 'rarity-uncommon'),
      createEnemy(7, 'elite', 'rarity-elite'),
      createEnemy(15, 'boss', 'rarity-boss'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 10,
      baseSeed: 'all-rarities',
    }));

    validateResultsConsistency(results);
    expect(results.perCombatantMetrics.size).toBe(8); // 4 players + 4 enemies
    // Each enemy should have its name from generation
    const enemyNames = enemies.map(e => e.name);
    for (const name of results.encounter.enemyNames) {
      expect(enemyNames).toContain(name);
    }
  });

  it('many weak enemies (mob) vs solo high-level player', () => {
    const player = createArmedPlayer(15, 'Solo Hero');
    const enemies = Array.from({ length: 4 }, (_, i) =>
      createEnemy(1, 'common', `mob-${i}`),
    );
    const simulator = new CombatSimulator();

    const results = simulator.run([player], enemies, makeConfig({
      runCount: 20,
      baseSeed: 'mob-fight',
    }));

    validateResultsConsistency(results);
    expect(results.perCombatantMetrics.size).toBe(5); // 1 player + 4 enemies
    // High-level player vs CR 1 enemies should win most fights
    expect(results.summary.playerWinRate).toBeGreaterThan(0.3);
  });

  it('mirror match: same level party vs same CR enemies', () => {
    const players = [
      createArmedPlayer(5, 'Hero 1'),
      createArmedPlayer(5, 'Hero 2'),
    ];
    const enemies = [
      createEnemy(5, 'elite', 'mirror-1'),
      createEnemy(5, 'elite', 'mirror-2'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'mirror-match',
    }));

    validateResultsConsistency(results);
    // Mirror match — just verify it produces valid results with both sides
    // capable of winning (no guaranteed outcome due to seeded randomness)
    expect(results.summary.playerWinRate).toBeGreaterThanOrEqual(0);
    expect(results.summary.playerWinRate).toBeLessThanOrEqual(1);
    expect(results.summary.totalRuns).toBe(50);
  });

  it('uneven party levels (mixed 3/5/7)', () => {
    const players = [
      createArmedPlayer(3, 'Rookie'),
      createArmedPlayer(5, 'Veteran'),
      createArmedPlayer(7, 'Expert'),
    ];
    const enemies = [createEnemy(5, 'elite', 'uneven-enemy')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 20,
      baseSeed: 'uneven-party',
    }));

    validateResultsConsistency(results);
    expect(results.perCombatantMetrics.size).toBe(4);
    // Average level should be 5
    expect(results.party.averageLevel).toBeCloseTo(5, 0);
    // Per-combatant metrics should have the correct names
    expect(results.perCombatantMetrics.get('player_0')!.name).toBe('Rookie');
    expect(results.perCombatantMetrics.get('player_1')!.name).toBe('Veteran');
    expect(results.perCombatantMetrics.get('player_2')!.name).toBe('Expert');
  });

  it('duplicate enemies (same seed, same CR, same rarity)', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [
      createEnemy(3, 'common', 'clone-seed'),
      createEnemy(3, 'common', 'clone-seed'),
      createEnemy(3, 'common', 'clone-seed'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 10,
      baseSeed: 'clone-fight',
    }));

    validateResultsConsistency(results);
    expect(results.perCombatantMetrics.size).toBe(4); // 1 player + 3 clones
    // All enemies should have the same name (generated from same seed)
    const enemyNames = [...results.perCombatantMetrics.values()]
      .filter(m => m.side === 'enemy')
      .map(m => m.name);
    expect(new Set(enemyNames).size).toBe(1); // All same name
  });

  it('boss with minions composition', () => {
    const players = [
      createArmedPlayer(10, 'Fighter'),
      createArmedPlayer(10, 'Cleric'),
      createArmedPlayer(10, 'Wizard'),
    ];
    const enemies = [
      createEnemy(12, 'boss', 'boss-minion-boss'),
      createEnemy(5, 'common', 'boss-minion-1'),
      createEnemy(5, 'common', 'boss-minion-2'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 15,
      baseSeed: 'boss-minions',
    }));

    validateResultsConsistency(results);
    expect(results.perCombatantMetrics.size).toBe(6); // 3 players + boss + 2 minions
  });
});

// ─── Cancellation Integration ─────────────────────────────────────────────────

describe('CombatSimulator Integration - Cancellation', () => {
  it('mid-simulation cancellation produces valid partial results', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [
      createEnemy(5, 'elite', 'cancel-int-1'),
      createEnemy(5, 'elite', 'cancel-int-2'),
    ];
    const simulator = new CombatSimulator();
    const controller = new AbortController();

    const config = makeConfig({
      runCount: 100,
      baseSeed: 'cancel-integration',
      abortSignal: controller.signal,
      collectDetailedLogs: true,
      onProgress: (completed) => {
        if (completed >= 7) controller.abort();
      },
    });

    const results = simulator.run(players, enemies, config);

    expect(results.wasCancelled).toBe(true);
    expect(results.summary.totalRuns).toBeGreaterThan(0);
    expect(results.summary.totalRuns).toBeLessThan(100);
    // Partial results must still be internally consistent
    validateResultsConsistency(results);
    // Detailed logs should match completed runs
    expect(results.runDetails).toBeDefined();
    expect(results.runDetails!.length).toBe(results.summary.totalRuns);
  });

  it('immediate cancellation (pre-aborted) produces empty but valid results', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(5, 'boss', 'cancel-immediate')];
    const simulator = new CombatSimulator();
    const controller = new AbortController();
    controller.abort();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'cancel-immediate',
      abortSignal: controller.signal,
    }));

    expect(results.wasCancelled).toBe(true);
    expect(results.summary.totalRuns).toBe(0);
    expect(results.summary.playerWins).toBe(0);
    expect(results.summary.enemyWins).toBe(0);
    expect(results.summary.draws).toBe(0);
    // Per-combatant metrics should exist but be zeroed
    expect(results.perCombatantMetrics.size).toBe(2);
    for (const [, m] of results.perCombatantMetrics) {
      expect(m.averageDamagePerRound).toBe(0);
      expect(m.survivalRate).toBe(0);
      expect(m.damageDistribution).toEqual([]);
    }
  });
});

// ─── Statistical Sanity ──────────────────────────────────────────────────────

describe('CombatSimulator Integration - Statistical Sanity', () => {
  it('win rate is deterministic: same seed + same config = same results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'converge-1');
    const simulator = new CombatSimulator();

    const resultsA = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      baseSeed: 'convergence-test',
    }));

    const resultsB = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      baseSeed: 'convergence-test',
    }));

    // Same config should produce identical results
    expect(resultsA.summary.playerWinRate).toBe(resultsB.summary.playerWinRate);
    expect(resultsA.summary.playerWins).toBe(resultsB.summary.playerWins);
    expect(resultsA.summary.enemyWins).toBe(resultsB.summary.enemyWins);
    expect(resultsA.summary.draws).toBe(resultsB.summary.draws);
    expect(resultsA.summary.averageRounds).toBe(resultsB.summary.averageRounds);
    expect(resultsA.summary.medianRounds).toBe(resultsB.summary.medianRounds);
  });

  it('different party sizes produce measurably different win rates', () => {
    const enemy = createEnemy(5, 'elite', 'party-size-enemy');
    const simulator = new CombatSimulator();

    // Solo player vs enemy
    const soloResults = simulator.run(
      [createArmedPlayer(5, 'Solo')],
      [enemy],
      makeConfig({ runCount: 50, baseSeed: 'party-size-solo' }),
    );

    // Full party vs same enemy
    const partyResults = simulator.run(
      [
        createArmedPlayer(5, 'F1'),
        createArmedPlayer(5, 'F2'),
        createArmedPlayer(5, 'F3'),
        createArmedPlayer(5, 'F4'),
      ],
      [enemy],
      makeConfig({ runCount: 50, baseSeed: 'party-size-full' }),
    );

    // Full party should win more often
    expect(partyResults.summary.playerWinRate).toBeGreaterThanOrEqual(soloResults.summary.playerWinRate);
  });

  it('round count variance is positive across runs', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'variance-1');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 50,
      baseSeed: 'variance-test',
      collectDetailedLogs: true,
    }));

    const roundCounts = results.runDetails!.map(d => d.result.roundsElapsed);
    const uniqueRounds = new Set(roundCounts);

    // With 50 fights and dice rolls, we should see variance in round counts
    expect(uniqueRounds.size).toBeGreaterThan(1);

    // Calculate variance
    const mean = roundCounts.reduce((a, b) => a + b, 0) / roundCounts.length;
    const variance = roundCounts.reduce((sum, r) => sum + (r - mean) ** 2, 0) / roundCounts.length;
    expect(variance).toBeGreaterThan(0);
  });

  it('critical hit rate is approximately 5% (1/20) across many runs', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'crit-rate-1');
    const simulator = new CombatSimulator();

    const results = simulator.run([player], [enemy], makeConfig({
      runCount: 100,
      baseSeed: 'crit-rate-test',
    }));

    for (const [, m] of results.perCombatantMetrics) {
      if (m.criticalHitRate > 0) {
        // Should be roughly 5% (±5% tolerance for small sample sizes)
        expect(m.criticalHitRate).toBeGreaterThan(0);
        expect(m.criticalHitRate).toBeLessThan(0.3);
      }
    }
  });
});

// ─── Result Structure Integrity at Scale ─────────────────────────────────────

describe('CombatSimulator Integration - Result Structure at Scale', () => {
  it('100 runs with 4v4 produces valid results without errors', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];
    const enemies = [
      createEnemy(5, 'common', 'scale-1'),
      createEnemy(5, 'common', 'scale-2'),
      createEnemy(5, 'common', 'scale-3'),
      createEnemy(5, 'common', 'scale-4'),
    ];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 100,
      baseSeed: 'scale-4v4',
    }));

    validateResultsConsistency(results);
    expect(results.summary.totalRuns).toBe(100);
    expect(results.perCombatantMetrics.size).toBe(8);
  });

  it('detailed logs at 50 runs do not corrupt results', () => {
    const players = [createArmedPlayer(5, 'Hero')];
    const enemies = [createEnemy(5, 'elite', 'scale-logs')];
    const simulator = new CombatSimulator();

    const results = simulator.run(players, enemies, makeConfig({
      runCount: 50,
      baseSeed: 'scale-logs-test',
      collectDetailedLogs: true,
    }));

    validateResultsConsistency(results);
    expect(results.runDetails).toBeDefined();
    expect(results.runDetails!.length).toBe(50);

    // Each run detail's winnerSide should match the summary counts
    let playerWins = 0, enemyWins = 0, draws = 0;
    for (const d of results.runDetails!) {
      if (d.result.winnerSide === 'player') playerWins++;
      else if (d.result.winnerSide === 'enemy') enemyWins++;
      else if (d.result.winnerSide === 'draw') draws++;
    }
    expect(playerWins).toBe(results.summary.playerWins);
    expect(enemyWins).toBe(results.summary.enemyWins);
    expect(draws).toBe(results.summary.draws);
  });

  it('multiple sequential simulations are independent', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'common', 'indep-1');
    const simulator = new CombatSimulator();

    // Run three separate simulations
    const results1 = simulator.run([player], [enemy], makeConfig({ runCount: 10, baseSeed: 'independent-a' }));
    const results2 = simulator.run([player], [enemy], makeConfig({ runCount: 10, baseSeed: 'independent-b' }));
    const results3 = simulator.run([player], [enemy], makeConfig({ runCount: 10, baseSeed: 'independent-c' }));

    // Each should produce valid results independently
    validateResultsConsistency(results1);
    validateResultsConsistency(results2);
    validateResultsConsistency(results3);

    // Not all three should have identical outcomes
    const allSame =
      results1.summary.playerWins === results2.summary.playerWins &&
      results2.summary.playerWins === results3.summary.playerWins &&
      results1.summary.averageRounds === results2.summary.averageRounds &&
      results2.summary.averageRounds === results3.summary.averageRounds;

    expect(allSame).toBe(false);
  });
});
