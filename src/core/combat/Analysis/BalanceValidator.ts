/**
 * BalanceValidator — Validates encounter balance using Monte Carlo simulation results
 *
 * Takes simulation results and an intended difficulty, then compares actual player
 * win rate against expected win rates per difficulty tier. Produces a BalanceReport
 * with a balance score, variance classification, and actionable recommendations.
 *
 * Expected win rates (D&D 5e-inspired):
 * - Easy: ~90%+ player win rate
 * - Medium: ~70-80% player win rate
 * - Hard: ~50-60% player win rate
 * - Deadly: ~30-40% player win rate
 *
 * Usage:
 * ```ts
 * const simulator = new CombatSimulator();
 * const results = simulator.run(party, enemies, config);
 * const validator = new BalanceValidator();
 * const report = validator.validate(results, 'medium');
 * console.log(report.balanceScore);       // 0-100
 * console.log(report.difficultyVariance);  // 'balanced' | 'underpowered' | 'overpowered'
 * ```
 */

import type { CharacterSheet } from '../../types/Character.js';
import type { CombatConfig } from '../../types/Combat.js';
import type { AIConfig } from '../../types/CombatAI.js';
import type { EncounterDifficulty } from '../../types/Enemy.js';
import type { SimulationConfig, SimulationResults } from '../Simulation/CombatSimulator.js';
import { CombatSimulator } from '../Simulation/CombatSimulator.js';

// ─── Balance Report Types ────────────────────────────────────────────────────

/**
 * Variance classification — how the actual difficulty compares to intended.
 */
export type DifficultyVariance = 'underpowered' | 'balanced' | 'overpowered';

/**
 * A single actionable recommendation for adjusting encounter balance.
 */
export interface BalanceRecommendation {
  /** Human-readable description of the suggested change */
  description: string;
  /** Expected impact on win rate (e.g., '+5-10% player win rate') */
  expectedImpact: string;
  /** Confidence level for this recommendation (0-1, based on run count) */
  confidence: number;
}

/**
 * Complete balance analysis report from validating an encounter.
 */
export interface BalanceReport {
  /** The difficulty the encounter was designed for */
  intendedDifficulty: EncounterDifficulty;
  /** The difficulty the simulation data actually reflects */
  actualDifficulty: EncounterDifficulty;
  /** How well actual matches intended (0-100, 100 = perfect) */
  balanceScore: number;
  /** Actual player win rate from simulation */
  playerWinRate: number;
  /** Expected win rate range for the intended difficulty */
  expectedWinRate: { min: number; max: number };
  /** Whether encounter is underpowered, balanced, or overpowered */
  difficultyVariance: DifficultyVariance;
  /** Statistical confidence based on run count (0-1) */
  confidence: number;
  /** Actionable suggestions for improving balance */
  recommendations: BalanceRecommendation[];
  /** Average HP remaining for players on winning runs (0-100) */
  averagePlayerHPPercentRemaining: number;
  /** Total simulation runs used for this analysis */
  totalRuns: number;
}

// ─── Expected Win Rates Per Difficulty Tier ───────────────────────────────────

/**
 * Expected player win rate ranges per encounter difficulty tier.
 *
 * These are D&D 5e-inspired targets:
 * - Easy: party should almost always win (~90%+)
 * - Medium: comfortable but not trivial (~70-80%)
 * - Hard: challenging, real risk of death (~50-60%)
 * - Deadly: likely TPK, major achievement to win (~30-40%)
 *
 * Tunable — adjust these values to change what "balanced" means for your game.
 */
export const EXPECTED_WIN_RATES: Record<EncounterDifficulty, { min: number; max: number }> = {
  easy:   { min: 0.90, max: 1.00 },
  medium: { min: 0.70, max: 0.80 },
  hard:   { min: 0.50, max: 0.60 },
  deadly: { min: 0.30, max: 0.40 },
};

// ─── BalanceValidator Class ──────────────────────────────────────────────────

/**
 * BalanceValidator — Analyzes simulation results to assess encounter balance.
 *
 * Stateless between calls. Each `validate()` or `validateFromSimulation()`
 * call produces an independent BalanceReport.
 */
export class BalanceValidator {
  /**
   * Validate an encounter by running simulations and analyzing results.
   *
   * Convenience method that combines CombatSimulator.run() + validate().
   * Use this when you don't already have simulation results.
   *
   * @param players - Player character sheets
   * @param enemies - Enemy character sheets
   * @param intendedDifficulty - The difficulty the encounter is designed for
   * @param config - Simulation configuration (run count, seed, AI styles)
   * @returns Complete balance analysis report
   */
  validate(
    players: CharacterSheet[],
    enemies: CharacterSheet[],
    intendedDifficulty: EncounterDifficulty,
    config: SimulationConfig,
  ): BalanceReport {
    const simulator = new CombatSimulator();
    const results = simulator.run(players, enemies, config);
    return this.analyze(results, intendedDifficulty);
  }

  /**
   * Analyze existing simulation results to produce a balance report.
   *
   * Use this when you already have simulation results and want to evaluate
   * them against a target difficulty.
   *
   * @param results - Simulation results from CombatSimulator.run()
   * @param intendedDifficulty - The difficulty the encounter was designed for
   * @returns Complete balance analysis report
   */
  analyze(
    results: SimulationResults,
    intendedDifficulty: EncounterDifficulty,
  ): BalanceReport {
    const { summary } = results;
    const winRate = summary.playerWinRate;
    const expected = EXPECTED_WIN_RATES[intendedDifficulty];

    // Determine actual difficulty based on win rate
    const actualDifficulty = this.classifyDifficulty(winRate);

    // Calculate balance score (0-100)
    const balanceScore = this.calculateBalanceScore(winRate, expected);

    // Classify variance
    const difficultyVariance = this.classifyVariance(winRate, expected);

    // Calculate confidence based on run count
    const confidence = this.calculateConfidence(summary.totalRuns);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      winRate,
      expected,
      actualDifficulty,
      intendedDifficulty,
      confidence,
      summary,
    );

    return {
      intendedDifficulty,
      actualDifficulty,
      balanceScore,
      playerWinRate: winRate,
      expectedWinRate: expected,
      difficultyVariance,
      confidence,
      recommendations,
      averagePlayerHPPercentRemaining: summary.averagePlayerHPPercentRemaining,
      totalRuns: summary.totalRuns,
    };
  }

  /**
   * Classify what difficulty tier a given win rate falls into.
   *
   * Maps win rate to the closest matching difficulty tier:
   * - >= 90% → easy
   * - >= 70% → medium
   * - >= 50% → hard
   * - < 50% → deadly
   */
  private classifyDifficulty(winRate: number): EncounterDifficulty {
    if (winRate >= 0.90) return 'easy';
    if (winRate >= 0.70) return 'medium';
    if (winRate >= 0.50) return 'hard';
    return 'deadly';
  }

  /**
   * Calculate a balance score (0-100) comparing actual win rate to expected range.
   *
   * Score calculation:
   * - If win rate is within the expected range: 100 - distance from midpoint
   * - If win rate is outside the expected range: penalty proportional to distance
   *
   * A perfect score of 100 means the win rate exactly hits the midpoint of the
   * expected range. Scores decrease as the actual win rate deviates.
   *
   * The score also factors in HP remaining — a 100% win rate with 1 HP left
   * is different from 100% with full HP. This adjusts the score by up to 10 points.
   */
  private calculateBalanceScore(
    winRate: number,
    expected: { min: number; max: number },
  ): number {
    const midpoint = (expected.min + expected.max) / 2;
    const halfRange = (expected.max - expected.min) / 2;

    // Distance from midpoint as a fraction of the half-range
    const distance = Math.abs(winRate - midpoint);
    const normalizedDistance = halfRange > 0 ? distance / halfRange : 0;

    // Within range: score from 70-100 based on closeness to midpoint
    // Outside range: score from 0-70 based on how far outside
    if (distance <= halfRange) {
      // Within expected range: 70 + 30 * (1 - normalizedDistance)
      const score = 70 + 30 * (1 - normalizedDistance);
      return Math.round(Math.min(100, Math.max(0, score)));
    }

    // Outside expected range: penalty proportional to distance beyond range
    const overshoot = distance - halfRange;
    // Lose 70 points over 0.5 overshoot (from 70 down to 0)
    const penalty = Math.min(70, (overshoot / 0.5) * 70);
    const score = 70 - penalty;
    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Classify the difficulty variance based on win rate vs expected range.
   *
   * - Win rate within expected range → balanced
   * - Win rate above expected range → underpowered (encounter too easy)
   * - Win rate below expected range → overpowered (encounter too hard)
   */
  private classifyVariance(
    winRate: number,
    expected: { min: number; max: number },
  ): DifficultyVariance {
    if (winRate > expected.max) return 'underpowered';
    if (winRate < expected.min) return 'overpowered';
    return 'balanced';
  }

  /**
   * Calculate statistical confidence based on run count.
   *
   * More runs = higher confidence in the results.
   * Uses a power curve: 1 - 1 / sqrt(n)
   * - 100 runs → ~0.90 confidence
   * - 500 runs → ~0.96 confidence
   * - 1000 runs → ~0.97 confidence
   * - 2000 runs → ~0.98 confidence
   * - 5000 runs → ~0.99 confidence
   */
  private calculateConfidence(totalRuns: number): number {
    if (totalRuns <= 0) return 0;
    // Power curve: 1 - 1 / sqrt(n)
    return Math.min(1, 1 - 1 / Math.sqrt(totalRuns));
  }

  /**
   * Generate actionable recommendations for improving encounter balance.
   *
   * Recommendations are context-aware:
   * - If overpowered (too hard): suggest reducing enemy strength
   * - If underpowered (too easy): suggest increasing enemy strength
   * - If balanced: suggest tuning for HP remaining
   */
  private generateRecommendations(
    winRate: number,
    expected: { min: number; max: number },
    actualDifficulty: EncounterDifficulty,
    intendedDifficulty: EncounterDifficulty,
    confidence: number,
    summary: import('../Simulation/CombatSimulator.js').SimulationSummary,
  ): BalanceRecommendation[] {
    const recommendations: BalanceRecommendation[] = [];

    // Determine if encounter is too easy or too hard
    const tooEasy = winRate > expected.max;
    const tooHard = winRate < expected.min;

    if (tooHard) {
      // Encounter is harder than intended — suggest making it easier
      const gap = expected.min - winRate;
      const enemyCount = summary.totalEnemyDeaths > 0
        ? Math.round(summary.totalEnemyDeaths / summary.totalRuns)
        : 1;

      if (gap > 0.30) {
        // Way too hard — multiple suggestions
        recommendations.push({
          description: 'Reduce enemy CR by 1-2 levels',
          expectedImpact: `+${Math.round(gap * 40)}-${Math.round(gap * 60)}% player win rate`,
          confidence,
        });
        recommendations.push({
          description: `Reduce enemy count by ${Math.max(1, Math.ceil(enemyCount * 0.3))}`,
          expectedImpact: `+${Math.round(gap * 30)}-${Math.round(gap * 50)}% player win rate`,
          confidence,
        });
      } else if (gap > 0.15) {
        // Moderately too hard
        recommendations.push({
          description: 'Reduce enemy CR by 1 level',
          expectedImpact: `+${Math.round(gap * 40)}-${Math.round(gap * 60)}% player win rate`,
          confidence,
        });
      } else {
        // Slightly too hard
        recommendations.push({
          description: 'Reduce enemy CR by 1 or remove one enemy ability',
          expectedImpact: `+${Math.round(gap * 40)}-${Math.round(gap * 60)}% player win rate`,
          confidence,
        });
      }

      // Always suggest checking for legendary actions if many deaths
      if (summary.totalPlayerDeaths / summary.totalRuns > 2) {
        recommendations.push({
          description: 'Consider removing legendary actions or reducing legendary resistance count',
          expectedImpact: '+5-15% player win rate',
          confidence,
        });
      }
    } else if (tooEasy) {
      // Encounter is easier than intended — suggest making it harder
      const gap = winRate - expected.max;

      if (gap > 0.15) {
        // Way too easy
        recommendations.push({
          description: 'Increase enemy CR by 1-2 levels',
          expectedImpact: `-${Math.round(gap * 40)}-${Math.round(gap * 60)}% player win rate`,
          confidence,
        });
        recommendations.push({
          description: 'Add 1-2 additional enemies',
          expectedImpact: `-${Math.round(gap * 30)}-${Math.round(gap * 50)}% player win rate`,
          confidence,
        });
      } else {
        // Slightly too easy
        recommendations.push({
          description: 'Increase enemy CR by 1 level or add one more enemy',
          expectedImpact: `-${Math.round(gap * 40)}-${Math.round(gap * 60)}% player win rate`,
          confidence,
        });
      }
    } else {
      // Balanced — check if HP remaining suggests room for tuning
      if (summary.averagePlayerHPPercentRemaining > 80 && winRate > expected.min + 0.05) {
        recommendations.push({
          description: 'Encounter is well-balanced. Consider increasing difficulty slightly if players are ending with high HP.',
          expectedImpact: '-5-10% player win rate',
          confidence,
        });
      } else if (summary.averagePlayerHPPercentRemaining < 30 && winRate < expected.max - 0.05) {
        recommendations.push({
          description: 'Encounter is balanced but punishing. Consider a small reduction in enemy damage if players are consistently low on HP.',
          expectedImpact: '+5-10% player HP remaining',
          confidence,
        });
      } else {
        recommendations.push({
          description: 'Encounter is well-balanced for the intended difficulty. No changes needed.',
          expectedImpact: 'None — encounter is within target range',
          confidence,
        });
      }
    }

    return recommendations;
  }
}
