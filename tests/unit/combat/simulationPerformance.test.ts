/**
 * Combat Simulator Performance Benchmarks
 *
 * Task 3.3.3: Measures simulation throughput and identifies bottlenecks.
 * Target: 100+ runs/second for standard party vs encounter.
 *
 * These tests use real wall-clock timing to measure actual performance.
 * They are not flaky because they use generous tolerances and measure
 * aggregate throughput rather than individual operations.
 */

import { describe, it, expect } from 'vitest';
import { CombatSimulator } from '../../../src/core/combat/Simulation/CombatSimulator.js';
import { AICombatRunner } from '../../../src/core/combat/AI/AICombatRunner.js';
import { CombatAI } from '../../../src/core/combat/AI/CombatAI.js';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createSeededRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import { CombatMetricsTracker } from '../../../src/core/combat/AI/CombatMetricsTracker.js';
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

/**
 * Run a simulation and return throughput (runs/second) and elapsed time.
 */
function measureThroughput(
  players: CharacterSheet[],
  enemies: CharacterSheet[],
  runCount: number,
  aiConfig: AIConfig = normalAI,
): { runsPerSecond: number; elapsedMs: number; runCount: number } {
  const simulator = new CombatSimulator();
  const start = performance.now();

  simulator.run(players, enemies, {
    runCount,
    baseSeed: 'perf-benchmark',
    aiConfig,
  });

  const elapsedMs = performance.now() - start;
  return {
    runsPerSecond: (runCount / elapsedMs) * 1000,
    elapsedMs,
    runCount,
  };
}

/**
 * Measure throughput of a single AICombatRunner run loop (no aggregation).
 * This isolates the combat engine + AI overhead from the aggregator.
 */
function measureRunnerThroughput(
  players: CharacterSheet[],
  enemies: CharacterSheet[],
  runCount: number,
  aiConfig: AIConfig = normalAI,
): { runsPerSecond: number; elapsedMs: number; avgRoundsPerRun: number } {
  const runner = new AICombatRunner();
  let totalRounds = 0;
  const start = performance.now();

  for (let i = 0; i < runCount; i++) {
    const roller = createSeededRoller(`perf-runner-${i}`);
    const result = runner.runFullCombat(players, enemies, aiConfig, undefined, roller);
    totalRounds += result.result.roundsElapsed;
  }

  const elapsedMs = performance.now() - start;
  return {
    runsPerSecond: (runCount / elapsedMs) * 1000,
    elapsedMs,
    avgRoundsPerRun: totalRounds / runCount,
  };
}

/**
 * Measure time for a specific component in isolation.
 */
function measureComponentTime(
  label: string,
  fn: () => void,
  iterations: number,
): { label: string; totalMs: number; avgUs: number; iterationsPerSecond: number } {
  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const totalMs = performance.now() - start;

  return {
    label,
    totalMs,
    avgUs: (totalMs / iterations) * 1000,
    iterationsPerSecond: (iterations / totalMs) * 1000,
  };
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

describe('Simulation Performance Benchmarks', () => {

  describe('Standard Party vs Encounter', () => {
    // Standard scenario: 4 level-5 players vs 1 CR 5 common enemy
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];
    const enemies = [createEnemy(5, 'common', 'perf-enemy-5')];

    it('achieves 100+ runs/second for 100-run simulation (standard party vs encounter)', () => {
      const result = measureThroughput(players, enemies, 100);

      expect(result.runCount).toBe(100);
      expect(result.runsPerSecond).toBeGreaterThan(100);

      // Log for visibility
      console.log(
        `[Perf] Standard 4v1 (100 runs): ${result.runsPerSecond.toFixed(1)} runs/s ` +
        `(${result.elapsedMs.toFixed(0)}ms total)`
      );
    });

    it('achieves 100+ runs/second for 500-run simulation', () => {
      const result = measureThroughput(players, enemies, 500);

      expect(result.runCount).toBe(500);
      expect(result.runsPerSecond).toBeGreaterThan(100);

      console.log(
        `[Perf] Standard 4v1 (500 runs): ${result.runsPerSecond.toFixed(1)} runs/s ` +
        `(${result.elapsedMs.toFixed(0)}ms total)`
      );
    });
  });

  describe('Scaling with encounter size', () => {
    const party = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];

    it('1v1: single player vs single enemy throughput', () => {
      const solo = [createArmedPlayer(5, 'Solo Hero')];
      const enemy = [createEnemy(3, 'common', 'perf-1v1')];
      const result = measureThroughput(solo, enemy, 100);

      expect(result.runsPerSecond).toBeGreaterThan(100);

      console.log(
        `[Perf] 1v1 (100 runs): ${result.runsPerSecond.toFixed(1)} runs/s ` +
        `(${result.elapsedMs.toFixed(0)}ms total)`
      );
    });

    it('4v4: party vs group throughput', () => {
      const enemies = [
        createEnemy(3, 'common', 'perf-4v4-a'),
        createEnemy(3, 'common', 'perf-4v4-b'),
        createEnemy(3, 'common', 'perf-4v4-c'),
        createEnemy(3, 'common', 'perf-4v4-d'),
      ];
      const result = measureThroughput(party, enemies, 100);

      expect(result.runsPerSecond).toBeGreaterThan(50); // More combatants = slower, but still usable

      console.log(
        `[Perf] 4v4 (100 runs): ${result.runsPerSecond.toFixed(1)} runs/s ` +
        `(${result.elapsedMs.toFixed(0)}ms total)`
      );
    });

    it('4v1 boss: party vs boss with legendary actions throughput', () => {
      const boss = [createEnemy(8, 'boss', 'perf-boss')];
      const result = measureThroughput(party, boss, 50);

      // Boss fights have legendary actions so they're slower, but should still be reasonable
      expect(result.runsPerSecond).toBeGreaterThan(20);

      console.log(
        `[Perf] 4v1 Boss (50 runs): ${result.runsPerSecond.toFixed(1)} runs/s ` +
        `(${result.elapsedMs.toFixed(0)}ms total)`
      );
    });
  });

  describe('AI style comparison', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];
    const enemies = [createEnemy(5, 'common', 'perf-ai-style')];

    it('aggressive AI is comparable speed to normal AI', () => {
      const normalResult = measureThroughput(players, enemies, 100, normalAI);
      const aggressiveResult = measureThroughput(players, enemies, 100, aggressiveAI);

      expect(normalResult.runsPerSecond).toBeGreaterThan(100);
      expect(aggressiveResult.runsPerSecond).toBeGreaterThan(100);

      // Aggressive shouldn't be dramatically slower (within 3x)
      const ratio = normalResult.runsPerSecond / aggressiveResult.runsPerSecond;
      expect(ratio).toBeLessThan(3);

      console.log(
        `[Perf] Normal AI: ${normalResult.runsPerSecond.toFixed(1)} runs/s, ` +
        `Aggressive AI: ${aggressiveResult.runsPerSecond.toFixed(1)} runs/s, ` +
        `Ratio: ${ratio.toFixed(2)}x`
      );
    });
  });

  describe('Component-level benchmarks', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [createEnemy(3, 'common', 'perf-component')];

    it('measures individual component overhead', () => {
      const runner = new AICombatRunner();
      const ai = new CombatAI(normalAI);
      const iterations = 50;

      // Measure roller creation
      const rollerTiming = measureComponentTime('SeededDiceRoller creation', () => {
        createSeededRoller(`bench-${Math.random()}`);
      }, 1000);

      // Measure single combat run (includes engine + AI + metrics)
      let totalRounds = 0;
      const runTiming = measureComponentTime('Single AICombatRunner run', () => {
        const roller = createSeededRoller(`comp-${Math.random()}`);
        const result = runner.runFullCombat(players, enemies, normalAI, undefined, roller);
        totalRounds += result.result.roundsElapsed;
      }, iterations);

      const avgRounds = totalRounds / iterations;

      // Measure metrics computation alone (no combat)
      const engine = new CombatEngine();
      const combat = engine.startCombat(players, enemies);
      const tracker = new CombatMetricsTracker();
      // Run a few turns to generate some history
      for (let i = 0; i < 5; i++) {
        const current = engine.getCurrentCombatant(combat);
        if (!current.isDefeated) {
          const decision = ai.decide(current, combat);
          if (decision.action === 'attack' && decision.target) {
            const target = combat.combatants.find(c => c.id === decision.target);
            if (target) {
              try { engine.executeWeaponAttack(combat, current, target, decision.weaponName); } catch { /* unarmed fallback */ }
            }
          }
        }
        if (combat.isActive) engine.nextTurn(combat);
      }
      const metricsTiming = measureComponentTime('CombatMetricsTracker.computeMetrics', () => {
        tracker.computeMetrics(combat);
      }, 1000);

      // Log all component timings
      console.log('\n[Perf] Component Breakdown:');
      console.log(`  SeededDiceRoller creation: ${rollerTiming.avgUs.toFixed(1)}µs (${rollerTiming.iterationsPerSecond.toFixed(0)} ops/s)`);
      console.log(`  Single combat run (avg ${avgRounds.toFixed(1)} rounds): ${runTiming.avgUs.toFixed(0)}µs (${runTiming.iterationsPerSecond.toFixed(1)} runs/s)`);
      console.log(`  CombatMetricsTracker.computeMetrics: ${metricsTiming.avgUs.toFixed(1)}µs (${metricsTiming.iterationsPerSecond.toFixed(0)} ops/s)`);
      console.log(`  Implied combat engine + AI per round: ${((runTiming.avgUs / avgRounds)).toFixed(0)}µs`);

      // Sanity: roller creation should be fast
      expect(rollerTiming.avgUs).toBeLessThan(500); // < 0.5ms
      // Single combat run should complete in reasonable time
      expect(runTiming.avgUs).toBeLessThan(500000); // < 500ms per run
    });
  });

  describe('Aggregation overhead', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];
    const enemies = [createEnemy(5, 'common', 'perf-agg')];

    it('aggregation overhead is small relative to simulation', () => {
      // Use enough runs to get stable timing (avoid sub-ms noise)
      const runCount = 200;
      const simulator = new CombatSimulator();

      // Measure with detailed logs (more aggregation work)
      const startWithLogs = performance.now();
      simulator.run(players, enemies, {
        runCount,
        baseSeed: 'perf-with-logs',
        aiConfig: normalAI,
        collectDetailedLogs: true,
      });
      const elapsedWithLogs = performance.now() - startWithLogs;

      const startWithoutLogs = performance.now();
      simulator.run(players, enemies, {
        runCount,
        baseSeed: 'perf-without-logs',
        aiConfig: normalAI,
        collectDetailedLogs: false,
      });
      const elapsedWithoutLogs = performance.now() - startWithoutLogs;

      // Detailed logs add overhead from storing full combat instances per run.
      // At 200 runs this should be measurable but not catastrophic (< 10x).
      const logOverheadRatio = elapsedWithLogs / elapsedWithoutLogs;

      console.log(
        `[Perf] Without logs: ${elapsedWithoutLogs.toFixed(0)}ms, ` +
        `With logs: ${elapsedWithLogs.toFixed(0)}ms, ` +
        `Log overhead: ${((logOverheadRatio - 1) * 100).toFixed(1)}%`
      );

      expect(logOverheadRatio).toBeLessThan(10);
    });
  });

  describe('Determinism under load', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
    ];
    const enemies = [createEnemy(3, 'common', 'perf-determinism')];

    it('produces identical results across repeated runs', () => {
      const simulator = new CombatSimulator();
      const config = {
        runCount: 50,
        baseSeed: 'determinism-load-test',
        aiConfig: normalAI,
      };

      const results1 = simulator.run(players, enemies, config);
      const results2 = simulator.run(players, enemies, config);

      expect(results1.summary.totalRuns).toBe(results2.summary.totalRuns);
      expect(results1.summary.playerWins).toBe(results2.summary.playerWins);
      expect(results1.summary.enemyWins).toBe(results2.summary.enemyWins);
      expect(results1.summary.draws).toBe(results2.summary.draws);
      expect(results1.summary.playerWinRate).toBe(results2.summary.playerWinRate);
      expect(results1.summary.averageRounds).toBe(results2.summary.averageRounds);
    });
  });

  describe('Memory efficiency', () => {
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Cleric'),
      createArmedPlayer(5, 'Rogue'),
      createArmedPlayer(5, 'Wizard'),
    ];
    const enemies = [createEnemy(5, 'common', 'perf-memory')];

    it('simulation without detailed logs has bounded memory', () => {
      // This is more of a sanity check — we can't directly measure memory
      // in a test environment, but we can verify the structure doesn't
      // accumulate unnecessary references.
      const simulator = new CombatSimulator();
      const results = simulator.run(players, enemies, {
        runCount: 200,
        baseSeed: 'memory-test',
        aiConfig: normalAI,
        collectDetailedLogs: false,
      });

      // Without detailed logs, runDetails should be undefined
      expect(results.runDetails).toBeUndefined();

      // Per-combatant metrics should have reasonable-sized distributions
      for (const [, metrics] of results.perCombatantMetrics) {
        // Histogram buckets should be bounded (max 20 per histogram)
        expect(metrics.damageDistribution.length).toBeLessThanOrEqual(20);
        expect(metrics.hpRemainingDistribution.length).toBeLessThanOrEqual(20);
      }

      console.log(
        `[Perf] 200 runs without logs: runDetails is ${results.runDetails}, ` +
        `${results.perCombatantMetrics.size} combatant metric entries`
      );
    });
  });
});
