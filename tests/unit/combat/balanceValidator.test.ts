/**
 * BalanceValidator Tests
 *
 * Tests the balance analysis system that validates encounter difficulty
 * by comparing simulation results against expected win rates per tier.
 */

import { describe, it, expect } from 'vitest';
import { BalanceValidator, EXPECTED_WIN_RATES } from '../../../src/core/combat/Analysis/BalanceValidator.js';
import type { BalanceReport, BalanceRecommendation, DifficultyVariance } from '../../../src/core/combat/Analysis/BalanceValidator.js';
import type { SimulationResults, SimulationSummary, PartyConfig, EncounterConfig } from '../../../src/core/combat/Simulation/CombatSimulator.js';
import type { AIConfig } from '../../../src/core/types/CombatAI.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

/**
 * Create a mock SimulationSummary with the given win rate.
 */
function makeSummary(overrides: Partial<SimulationSummary> = {}): SimulationSummary {
  return {
    totalRuns: 1000,
    playerWins: 750,
    enemyWins: 200,
    draws: 50,
    playerWinRate: 0.75,
    averageRounds: 5.2,
    medianRounds: 5,
    averageRoundsOnWin: 4.8,
    averageRoundsOnLoss: 6.1,
    averagePlayerHPPercentRemaining: 45.0,
    totalPlayerDeaths: 300,
    averageRoundsPerPlayerDeath: 3.5,
    totalEnemyDeaths: 800,
    averageRoundsPerEnemyDeath: 4.0,
    ...overrides,
  };
}

/**
 * Create a mock SimulationResults with the given summary.
 */
function makeResults(summary: SimulationSummary): SimulationResults {
  return {
    config: {
      runCount: summary.totalRuns,
      baseSeed: 'test-seed',
      aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
    },
    summary,
    party: {
      memberCount: 4,
      averageLevel: 5,
      memberNames: ['A', 'B', 'C', 'D'],
    },
    encounter: {
      enemyCount: 1,
      averageCR: 3,
      enemyNames: ['Boss'],
    },
    perCombatantMetrics: new Map(),
    wasCancelled: false,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BalanceValidator', () => {
  const validator = new BalanceValidator();

  // ─── Expected Win Rates ──────────────────────────────────────────────────

  describe('EXPECTED_WIN_RATES constants', () => {
    it('defines win rates for all four difficulty tiers', () => {
      expect(EXPECTED_WIN_RATES.easy).toBeDefined();
      expect(EXPECTED_WIN_RATES.medium).toBeDefined();
      expect(EXPECTED_WIN_RATES.hard).toBeDefined();
      expect(EXPECTED_WIN_RATES.deadly).toBeDefined();
    });

    it('easy has highest expected win rate', () => {
      expect(EXPECTED_WIN_RATES.easy.min).toBe(0.90);
      expect(EXPECTED_WIN_RATES.easy.max).toBe(1.00);
    });

    it('deadly has lowest expected win rate', () => {
      expect(EXPECTED_WIN_RATES.deadly.min).toBe(0.30);
      expect(EXPECTED_WIN_RATES.deadly.max).toBe(0.40);
    });

    it('tiers are in descending order', () => {
      expect(EXPECTED_WIN_RATES.easy.min).toBeGreaterThan(EXPECTED_WIN_RATES.medium.min);
      expect(EXPECTED_WIN_RATES.medium.min).toBeGreaterThan(EXPECTED_WIN_RATES.hard.min);
      expect(EXPECTED_WIN_RATES.hard.min).toBeGreaterThan(EXPECTED_WIN_RATES.deadly.min);
    });

    it('each tier has min < max', () => {
      for (const [tier, range] of Object.entries(EXPECTED_WIN_RATES)) {
        expect(range.min).toBeLessThan(range.max);
      }
    });
  });

  // ─── Difficulty Classification ───────────────────────────────────────────

  describe('difficulty classification', () => {
    function classify(winRate: number): string {
      const results = makeResults(makeSummary({
        playerWinRate: winRate,
        playerWins: Math.round(winRate * 1000),
        enemyWins: Math.round((1 - winRate) * 900),
        draws: 1000 - Math.round(winRate * 1000) - Math.round((1 - winRate) * 900),
      }));
      return validator.analyze(results, 'medium').actualDifficulty;
    }

    it('95% win rate → easy', () => {
      expect(classify(0.95)).toBe('easy');
    });

    it('90% win rate → easy', () => {
      expect(classify(0.90)).toBe('easy');
    });

    it('85% win rate → medium', () => {
      expect(classify(0.85)).toBe('medium');
    });

    it('75% win rate → medium', () => {
      expect(classify(0.75)).toBe('medium');
    });

    it('70% win rate → medium', () => {
      expect(classify(0.70)).toBe('medium');
    });

    it('60% win rate → hard', () => {
      expect(classify(0.60)).toBe('hard');
    });

    it('50% win rate → hard', () => {
      expect(classify(0.50)).toBe('hard');
    });

    it('40% win rate → deadly', () => {
      expect(classify(0.40)).toBe('deadly');
    });

    it('20% win rate → deadly', () => {
      expect(classify(0.20)).toBe('deadly');
    });

    it('0% win rate → deadly', () => {
      expect(classify(0.00)).toBe('deadly');
    });

    it('100% win rate → easy', () => {
      expect(classify(1.00)).toBe('easy');
    });
  });

  // ─── Balance Score ───────────────────────────────────────────────────────

  describe('balance score calculation', () => {
    function getScore(winRate: number, intendedDifficulty: 'easy' | 'medium' | 'hard' | 'deadly' = 'medium'): number {
      const results = makeResults(makeSummary({
        playerWinRate: winRate,
        playerWins: Math.round(winRate * 1000),
        enemyWins: Math.round((1 - winRate) * 900),
        draws: 1000 - Math.round(winRate * 1000) - Math.round((1 - winRate) * 900),
      }));
      return validator.analyze(results, intendedDifficulty).balanceScore;
    }

    it('perfect score at midpoint of expected range', () => {
      // Medium midpoint is 0.75
      const score = getScore(0.75, 'medium');
      expect(score).toBe(100);
    });

    it('high score within expected range', () => {
      // Medium range is 0.70-0.80, 0.72 is within range
      const score = getScore(0.72, 'medium');
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('score decreases at edge of expected range', () => {
      // Medium range is 0.70-0.80, edge should be ~70
      const score = getScore(0.70, 'medium');
      expect(score).toBeGreaterThanOrEqual(65);
      expect(score).toBeLessThanOrEqual(75);
    });

    it('low score when way above expected range', () => {
      // Medium expected max is 0.80, 1.0 is way above
      const score = getScore(1.0, 'medium');
      expect(score).toBeLessThan(70);
    });

    it('low score when way below expected range', () => {
      // Medium expected min is 0.70, 0.0 is way below
      const score = getScore(0.0, 'medium');
      expect(score).toBeLessThan(70);
    });

    it('score is 0-100 for all inputs', () => {
      for (const rate of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
        for (const diff of ['easy', 'medium', 'hard', 'deadly'] as const) {
          const score = getScore(rate, diff);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      }
    });

    it('deadly midpoint gives 100', () => {
      // Deadly midpoint is 0.35
      const score = getScore(0.35, 'deadly');
      expect(score).toBe(100);
    });

    it('easy midpoint gives 100', () => {
      // Easy midpoint is 0.95
      const score = getScore(0.95, 'easy');
      expect(score).toBe(100);
    });

    it('symmetric scores around midpoint', () => {
      // Medium midpoint is 0.75, halfRange is 0.05
      const scoreAbove = getScore(0.77, 'medium');
      const scoreBelow = getScore(0.73, 'medium');
      expect(scoreAbove).toBe(scoreBelow);
    });
  });

  // ─── Difficulty Variance ─────────────────────────────────────────────────

  describe('difficulty variance classification', () => {
    function getVariance(winRate: number, intendedDifficulty: 'easy' | 'medium' | 'hard' | 'deadly' = 'medium'): DifficultyVariance {
      const results = makeResults(makeSummary({
        playerWinRate: winRate,
        playerWins: Math.round(winRate * 1000),
        enemyWins: Math.round((1 - winRate) * 900),
        draws: 1000 - Math.round(winRate * 1000) - Math.round((1 - winRate) * 900),
      }));
      return validator.analyze(results, intendedDifficulty).difficultyVariance;
    }

    it('within range → balanced', () => {
      expect(getVariance(0.75, 'medium')).toBe('balanced');
      expect(getVariance(0.70, 'medium')).toBe('balanced');
      expect(getVariance(0.80, 'medium')).toBe('balanced');
    });

    it('above range → underpowered', () => {
      expect(getVariance(0.85, 'medium')).toBe('underpowered');
      expect(getVariance(0.95, 'medium')).toBe('underpowered');
      expect(getVariance(1.0, 'medium')).toBe('underpowered');
    });

    it('below range → overpowered', () => {
      expect(getVariance(0.60, 'medium')).toBe('overpowered');
      expect(getVariance(0.30, 'medium')).toBe('overpowered');
      expect(getVariance(0.0, 'medium')).toBe('overpowered');
    });

    it('easy: 100% → balanced (within easy range)', () => {
      expect(getVariance(1.0, 'easy')).toBe('balanced');
    });

    it('easy: 85% → overpowered', () => {
      expect(getVariance(0.85, 'easy')).toBe('overpowered');
    });

    it('deadly: 35% → balanced', () => {
      expect(getVariance(0.35, 'deadly')).toBe('balanced');
    });

    it('deadly: 50% → underpowered', () => {
      expect(getVariance(0.50, 'deadly')).toBe('underpowered');
    });

    it('deadly: 20% → overpowered', () => {
      expect(getVariance(0.20, 'deadly')).toBe('overpowered');
    });
  });

  // ─── Confidence Calculation ──────────────────────────────────────────────

  describe('confidence calculation', () => {
    it('0 runs → 0 confidence', () => {
      const results = makeResults(makeSummary({ totalRuns: 0 }));
      const report = validator.analyze(results, 'medium');
      expect(report.confidence).toBe(0);
    });

    it('confidence increases with more runs', () => {
      const c100 = validator.analyze(makeResults(makeSummary({ totalRuns: 100 })), 'medium').confidence;
      const c500 = validator.analyze(makeResults(makeSummary({ totalRuns: 500 })), 'medium').confidence;
      const c2000 = validator.analyze(makeResults(makeSummary({ totalRuns: 2000 })), 'medium').confidence;
      expect(c500).toBeGreaterThan(c100);
      expect(c2000).toBeGreaterThan(c500);
    });

    it('confidence is 0-1', () => {
      for (const runs of [1, 10, 100, 500, 1000, 5000]) {
        const results = makeResults(makeSummary({ totalRuns: runs }));
        const report = validator.analyze(results, 'medium');
        expect(report.confidence).toBeGreaterThanOrEqual(0);
        expect(report.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('high run counts give high confidence', () => {
      const results = makeResults(makeSummary({ totalRuns: 5000 }));
      const report = validator.analyze(results, 'medium');
      expect(report.confidence).toBeGreaterThan(0.95);
    });
  });

  // ─── BalanceReport Structure ─────────────────────────────────────────────

  describe('BalanceReport structure', () => {
    it('returns a complete BalanceReport', () => {
      const results = makeResults(makeSummary());
      const report = validator.analyze(results, 'medium');

      expect(report.intendedDifficulty).toBe('medium');
      expect(report.actualDifficulty).toBeDefined();
      expect(typeof report.balanceScore).toBe('number');
      expect(typeof report.playerWinRate).toBe('number');
      expect(report.expectedWinRate).toEqual({ min: 0.70, max: 0.80 });
      expect(['underpowered', 'balanced', 'overpowered']).toContain(report.difficultyVariance);
      expect(typeof report.confidence).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(typeof report.averagePlayerHPPercentRemaining).toBe('number');
      expect(typeof report.totalRuns).toBe('number');
    });

    it('preserves intended difficulty', () => {
      for (const diff of ['easy', 'medium', 'hard', 'deadly'] as const) {
        const results = makeResults(makeSummary());
        const report = validator.analyze(results, diff);
        expect(report.intendedDifficulty).toBe(diff);
      }
    });

    it('totalRuns matches simulation results', () => {
      const results = makeResults(makeSummary({ totalRuns: 500 }));
      const report = validator.analyze(results, 'medium');
      expect(report.totalRuns).toBe(500);
    });

    it('playerWinRate matches simulation summary', () => {
      const results = makeResults(makeSummary({ playerWinRate: 0.62 }));
      const report = validator.analyze(results, 'medium');
      expect(report.playerWinRate).toBe(0.62);
    });
  });

  // ─── Recommendations ────────────────────────────────────────────────────

  describe('recommendations', () => {
    it('balanced encounter has at least one recommendation', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.75,
        playerWins: 750,
        enemyWins: 200,
        draws: 50,
        averagePlayerHPPercentRemaining: 50,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);
    });

    it('overpowered encounter recommends reducing difficulty', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.30,
        playerWins: 300,
        enemyWins: 650,
        draws: 50,
        totalPlayerDeaths: 2000,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);

      // Should recommend reducing enemy CR
      const hasReduceCR = report.recommendations.some(r =>
        r.description.toLowerCase().includes('reduce') && r.description.toLowerCase().includes('cr')
      );
      expect(hasReduceCR).toBe(true);
    });

    it('very overpowered encounter has multiple recommendations', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.10,
        playerWins: 100,
        enemyWins: 850,
        draws: 50,
        totalPlayerDeaths: 3500,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    it('underpowered encounter recommends increasing difficulty', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.95,
        playerWins: 950,
        enemyWins: 30,
        draws: 20,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);

      // Should recommend increasing enemy CR or adding enemies
      const hasIncrease = report.recommendations.some(r =>
        r.description.toLowerCase().includes('increase') ||
        r.description.toLowerCase().includes('add')
      );
      expect(hasIncrease).toBe(true);
    });

    it('very underpowered encounter has multiple recommendations', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 1.0,
        playerWins: 1000,
        enemyWins: 0,
        draws: 0,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.recommendations.length).toBeGreaterThanOrEqual(2);
    });

    it('balanced encounter with high HP remaining suggests slight increase', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.76,
        playerWins: 760,
        enemyWins: 190,
        draws: 50,
        averagePlayerHPPercentRemaining: 85,
      }));
      const report = validator.analyze(results, 'medium');
      const hasSuggestion = report.recommendations.some(r =>
        r.description.toLowerCase().includes('increasing difficulty')
      );
      expect(hasSuggestion).toBe(true);
    });

    it('balanced encounter with low HP remaining suggests damage reduction', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.72,
        playerWins: 720,
        enemyWins: 230,
        draws: 50,
        averagePlayerHPPercentRemaining: 20,
      }));
      const report = validator.analyze(results, 'medium');
      const hasSuggestion = report.recommendations.some(r =>
        r.description.toLowerCase().includes('punishing') ||
        r.description.toLowerCase().includes('reduction')
      );
      expect(hasSuggestion).toBe(true);
    });

    it('each recommendation has expected fields', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.30,
        playerWins: 300,
        enemyWins: 650,
        draws: 50,
      }));
      const report = validator.analyze(results, 'medium');
      for (const rec of report.recommendations) {
        expect(typeof rec.description).toBe('string');
        expect(rec.description.length).toBeGreaterThan(0);
        expect(typeof rec.expectedImpact).toBe('string');
        expect(rec.expectedImpact.length).toBeGreaterThan(0);
        expect(typeof rec.confidence).toBe('number');
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('high death count suggests legendary action removal', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.20,
        playerWins: 200,
        enemyWins: 750,
        draws: 50,
        totalPlayerDeaths: 3000,
      }));
      const report = validator.analyze(results, 'medium');
      const hasLegendary = report.recommendations.some(r =>
        r.description.toLowerCase().includes('legendary')
      );
      expect(hasLegendary).toBe(true);
    });
  });

  // ─── validate() Full Pipeline ────────────────────────────────────────────

  describe('validate() method — full pipeline', () => {
    it('runs simulations and returns a BalanceReport', () => {
      const players = [
        createMockPartyCharacter(5, { name: 'Player 0' }),
        createMockPartyCharacter(5, { name: 'Player 1' }),
        createMockPartyCharacter(5, { name: 'Player 2' }),
        createMockPartyCharacter(5, { name: 'Player 3' }),
      ];
      const enemies = [EnemyGenerator.generate({ seed: 'boss-enemy', cr: 3, rarity: 'elite' })];

      const report = validator.validate(
        players,
        enemies,
        'medium',
        {
          runCount: 50,
          baseSeed: 'balance-test',
          aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
        },
      );

      // Should return a valid report
      expect(report.intendedDifficulty).toBe('medium');
      expect(typeof report.actualDifficulty).toBe('string');
      expect(typeof report.balanceScore).toBe('number');
      expect(report.balanceScore).toBeGreaterThanOrEqual(0);
      expect(report.balanceScore).toBeLessThanOrEqual(100);
      expect(typeof report.playerWinRate).toBe('number');
      expect(typeof report.confidence).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.totalRuns).toBe(50);
    });

    it('deterministic with same seed', () => {
      const players = [
        createMockPartyCharacter(3, { name: 'Player 0' }),
        createMockPartyCharacter(3, { name: 'Player 1' }),
      ];
      const enemies = [EnemyGenerator.generate({ seed: 'enemy-det', cr: 3, rarity: 'common' })];

      const config = {
        runCount: 50,
        baseSeed: 'determinism-test',
        aiConfig: { playerStyle: 'normal', enemyStyle: 'normal' } as AIConfig,
      };

      const report1 = validator.validate(players, enemies, 'medium', config);
      const report2 = validator.validate(players, enemies, 'medium', config);

      expect(report1.playerWinRate).toBe(report2.playerWinRate);
      expect(report1.balanceScore).toBe(report2.balanceScore);
      expect(report1.actualDifficulty).toBe(report2.actualDifficulty);
      expect(report1.difficultyVariance).toBe(report2.difficultyVariance);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('0 runs returns valid report with 0 confidence', () => {
      const results = makeResults(makeSummary({
        totalRuns: 0,
        playerWins: 0,
        enemyWins: 0,
        draws: 0,
        playerWinRate: 0,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.confidence).toBe(0);
      expect(report.totalRuns).toBe(0);
      expect(typeof report.balanceScore).toBe('number');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('100% player win rate for deadly intent → underpowered', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 1.0,
        playerWins: 1000,
        enemyWins: 0,
        draws: 0,
      }));
      const report = validator.analyze(results, 'deadly');
      expect(report.difficultyVariance).toBe('underpowered');
      expect(report.balanceScore).toBeLessThan(70);
    });

    it('0% player win rate for easy intent → overpowered', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.0,
        playerWins: 0,
        enemyWins: 1000,
        draws: 0,
      }));
      const report = validator.analyze(results, 'easy');
      expect(report.difficultyVariance).toBe('overpowered');
      expect(report.balanceScore).toBeLessThan(70);
    });

    it('cancelled simulation still produces valid report', () => {
      const results = makeResults(makeSummary({
        totalRuns: 50,
        playerWins: 30,
        enemyWins: 15,
        draws: 5,
        playerWinRate: 0.6,
      }));
      (results as any).wasCancelled = true;
      const report = validator.analyze(results, 'medium');
      expect(report.totalRuns).toBe(50);
      expect(typeof report.balanceScore).toBe('number');
    });

    it('all draws returns valid report', () => {
      const results = makeResults(makeSummary({
        totalRuns: 100,
        playerWins: 0,
        enemyWins: 0,
        draws: 100,
        playerWinRate: 0,
      }));
      const report = validator.analyze(results, 'medium');
      expect(report.difficultyVariance).toBe('overpowered');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('handles all four intended difficulties', () => {
      const results = makeResults(makeSummary({
        playerWinRate: 0.75,
        playerWins: 750,
        enemyWins: 200,
        draws: 50,
      }));

      for (const diff of ['easy', 'medium', 'hard', 'deadly'] as const) {
        const report = validator.analyze(results, diff);
        expect(report.intendedDifficulty).toBe(diff);
        expect(typeof report.balanceScore).toBe('number');
        expect(typeof report.difficultyVariance).toBe('string');
      }
    });
  });

  // ─── Integration: Full Simulation + Analysis ────────────────────────────

  describe('integration scenarios', () => {
    it('trivially easy fight reports underpowered', () => {
      // Level 10 party vs level 1 enemy — should be near-100% win rate
      const weaponOverride = {
        equipment: {
          weapons: [{
            name: 'Longsword',
            damage: { dice: '1d8+5', damageType: 'slashing' },
            equipped: true,
            weaponProperties: ['versatile'],
            type: 'weapon',
          }],
          armor: [],
          items: [],
          totalWeight: 0,
          equippedWeight: 0,
        },
      };
      const players = [
        createMockPartyCharacter(10, { name: 'Hero 0', ...weaponOverride }),
        createMockPartyCharacter(10, { name: 'Hero 1', ...weaponOverride }),
        createMockPartyCharacter(10, { name: 'Hero 2', ...weaponOverride }),
        createMockPartyCharacter(10, { name: 'Hero 3', ...weaponOverride }),
      ];
      const enemies = [EnemyGenerator.generate({ seed: 'goblin-weak', cr: 1, rarity: 'common' })];

      const report = validator.validate(
        players,
        enemies,
        'medium',
        {
          runCount: 100,
          baseSeed: 'easy-fight',
          aiConfig: { playerStyle: 'normal', enemyStyle: 'normal' },
        },
      );

      // Should be nearly 100% win rate → underpowered for medium
      expect(report.playerWinRate).toBeGreaterThan(0.9);
      expect(report.difficultyVariance).toBe('underpowered');
      expect(report.actualDifficulty).toBe('easy');
    });

    it('very hard fight reports overpowered', () => {
      // Level 1 party vs level 10 boss — should be near-0% win rate
      const players = [
        createMockPartyCharacter(1, { name: 'Hero 0' }),
      ];
      const enemies = [EnemyGenerator.generate({ seed: 'dragon-boss', cr: 10, rarity: 'boss' })];

      const report = validator.validate(
        players,
        enemies,
        'medium',
        {
          runCount: 100,
          baseSeed: 'hard-fight',
          aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
        },
      );

      // Should be near-0% win rate → overpowered for medium
      expect(report.playerWinRate).toBeLessThan(0.3);
      expect(report.difficultyVariance).toBe('overpowered');
      expect(report.actualDifficulty).toBe('deadly');
    });
  });
});
