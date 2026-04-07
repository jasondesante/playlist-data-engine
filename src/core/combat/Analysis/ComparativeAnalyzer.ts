/**
 * ComparativeAnalyzer — Compare two encounter configurations using
 * identical-seed simulation to isolate the effect of a single variable.
 *
 * Answers questions like: "How much does +2 AC improve win rate?" or
 * "Is adding a 5th party member statistically significant?"
 *
 * Both configurations are simulated with the same sequence of seeds,
 * enabling pair-wise comparison where each seed-pair isolates the
 * variable being tested (dice rolls are identical, only the config differs).
 *
 * Usage:
 * ```ts
 * const analyzer = new ComparativeAnalyzer();
 * const comparison = analyzer.compare(
 *   { players, enemies: enemiesA, ... },
 *   { players, enemies: enemiesB, ... },
 *   { runCount: 500, baseSeed: 'ac-comparison', aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' } }
 * );
 * console.log(comparison.winRateDelta);       // e.g., +0.15
 * console.log(comparison.isStatisticallySignificant); // true
 * ```
 */

import type { CharacterSheet } from '../../types/Character.js';
import type { AIConfig } from '../../types/CombatAI.js';
import type { SimulationConfig, SimulationResults, SimulationSummary, CombatantSimulationMetrics } from '../Simulation/CombatSimulator.js';
import { CombatSimulator } from '../Simulation/CombatSimulator.js';

// ─── Comparison Configuration ─────────────────────────────────────────────────

/**
 * Configuration for one side of a comparative analysis.
 *
 * Defines the party, enemies, and any simulation overrides for one
 * of the two configurations being compared.
 */
export interface ComparisonConfig {
  /** Player character sheets */
  players: CharacterSheet[];

  /** Enemy character sheets */
  enemies: CharacterSheet[];

  /** Optional label for this configuration (e.g., "Base", "+2 AC") */
  label?: string;

  /** Optional combat config override (max turns, flee, etc.) */
  combatConfig?: import('../../types/Combat.js').CombatConfig;
}

/**
 * Options for the comparative analysis.
 */
export interface ComparisonOptions {
  /** Number of simulations per configuration */
  runCount: number;

  /** Base seed — both configs use the same seed sequence for fair comparison */
  baseSeed: string;

  /** AI configuration for all simulations */
  aiConfig: AIConfig;

  /** Optional combat engine configuration */
  combatConfig?: import('../../types/Combat.js').CombatConfig;

  /**
   * Significance threshold (alpha) for statistical tests.
   * Default: 0.05 (95% confidence).
   */
  significanceThreshold?: number;

  /** AbortSignal for cancellation */
  abortSignal?: AbortSignal;

  /** Progress callback: (completedPerSide, totalPerSide, sideLabel) */
  onProgress?: (completed: number, total: number, side: string) => void;
}

// ─── Comparison Result Types ──────────────────────────────────────────────────

/**
 * Delta metrics between two configurations.
 *
 * Positive values favor config A (A is better for players).
 * Negative values favor config B (B is better for players).
 */
export interface DeltaMetrics {
  /** Win rate difference: A.winRate - B.winRate (e.g., +0.15 means A wins 15% more) */
  winRateDelta: number;

  /** Average rounds difference: A.avgRounds - B.avgRounds */
  averageRoundsDelta: number;

  /** Average player HP remaining difference: A.hpRemaining - B.hpRemaining */
  averageHPRemainingDelta: number;

  /** Total player deaths difference: A.deaths - B.deaths (negative = fewer deaths in A) */
  totalPlayerDeathsDelta: number;

  /** Total enemy deaths difference: A.enemyDeaths - B.enemyDeaths */
  totalEnemyDeathsDelta: number;

  /** Median rounds difference */
  medianRoundsDelta: number;
}

/**
 * Per-combatant delta between two configurations.
 */
export interface CombatantDelta {
  /** Combatant name (from config A) */
  name: string;

  /** Which side this combatant is on */
  side: 'player' | 'enemy';

  /** DPR difference: A.DPR - B.DPR */
  dprDelta: number;

  /** Average total damage dealt difference */
  damageDealtDelta: number;

  /** Average total damage taken difference */
  damageTakenDelta: number;

  /** Survival rate difference */
  survivalRateDelta: number;

  /** Kill rate difference */
  killRateDelta: number;

  /** Critical hit rate difference */
  criticalHitRateDelta: number;

  /** Average healing done difference */
  healingDoneDelta: number;
}

/**
 * Result of a statistical significance test.
 */
export interface SignificanceResult {
  /** Whether the difference is statistically significant at the given threshold */
  isSignificant: boolean;

  /** The p-value from the test (approximation) */
  pValue: number;

  /** The significance threshold used (alpha) */
  threshold: number;

  /** Human-readable interpretation */
  interpretation: string;
}

/**
 * Complete comparison result between two encounter configurations.
 */
export interface ComparisonResult {
  /** Label for configuration A (or "Config A" if not provided) */
  labelA: string;

  /** Label for configuration B (or "Config B" if not provided) */
  labelB: string;

  /** Full simulation results for configuration A */
  resultsA: SimulationResults;

  /** Full simulation results for configuration B */
  resultsB: SimulationResults;

  /** Summary for configuration A */
  summaryA: SimulationSummary;

  /** Summary for configuration B */
  summaryB: SimulationSummary;

  /** Delta metrics (positive = A is better for players) */
  deltas: DeltaMetrics;

  /** Per-combatant deltas (matched by combatant index, not ID) */
  combatantDeltas: CombatantDelta[];

  /** Statistical significance of the win rate difference */
  winRateSignificance: SignificanceResult;

  /** Was the comparison cancelled before completion? */
  wasCancelled: boolean;
}

// ─── ComparativeAnalyzer Class ────────────────────────────────────────────────

/**
 * ComparativeAnalyzer — Compares two encounter configurations using
 * identical-seed simulation.
 *
 * Both configurations are simulated with the same sequence of seeds,
 * ensuring that dice roll variance is eliminated. The only difference
 * in outcomes comes from the configuration change itself.
 *
 * This enables pair-wise comparison: for each seed, config A and config B
 * experience the exact same dice rolls, so any outcome difference is
 * attributable to the config change.
 *
 * Stateless between `compare()` calls.
 */
export class ComparativeAnalyzer {
  /**
   * Compare two encounter configurations using identical-seed simulation.
   *
   * @param configA - First configuration (baseline)
   * @param configB - Second configuration (modified)
   * @param options - Simulation and comparison options
   * @returns Full comparison result with deltas and significance
   */
  compare(
    configA: ComparisonConfig,
    configB: ComparisonConfig,
    options: ComparisonOptions,
  ): ComparisonResult {
    const labelA = configA.label ?? 'Config A';
    const labelB = configB.label ?? 'Config B';

    // Run simulations for both configs with identical seed sequence
    const resultsA = this.runSimulations(
      configA,
      options,
      `${options.baseSeed}-A`,
      labelA,
      options.onProgress,
    );

    const resultsB = this.runSimulations(
      configB,
      options,
      `${options.baseSeed}-B`,
      labelB,
      options.onProgress,
    );

    // Calculate deltas
    const deltas = this.calculateDeltas(resultsA.summary, resultsB.summary);

    // Calculate per-combatant deltas
    const combatantDeltas = this.calculateCombatantDeltas(
      resultsA.perCombatantMetrics,
      resultsB.perCombatantMetrics,
    );

    // Statistical significance test
    const significanceThreshold = options.significanceThreshold ?? 0.05;
    const winRateSignificance = this.testSignificance(
      resultsA.summary,
      resultsB.summary,
      significanceThreshold,
    );

    const wasCancelled = resultsA.wasCancelled || resultsB.wasCancelled;

    return {
      labelA,
      labelB,
      resultsA,
      resultsB,
      summaryA: resultsA.summary,
      summaryB: resultsB.summary,
      deltas,
      combatantDeltas,
      winRateSignificance,
      wasCancelled,
    };
  }

  /**
   * Run simulations for a single configuration.
   */
  private runSimulations(
    config: ComparisonConfig,
    options: ComparisonOptions,
    seedPrefix: string,
    sideLabel: string,
    onProgress?: (completed: number, total: number, side: string) => void,
  ): SimulationResults {
    const simulator = new CombatSimulator();
    return simulator.run(
      config.players,
      config.enemies,
      {
        runCount: options.runCount,
        baseSeed: seedPrefix,
        aiConfig: options.aiConfig,
        combatConfig: config.combatConfig ?? options.combatConfig,
        collectDetailedLogs: false,
        abortSignal: options.abortSignal,
        onProgress: onProgress
          ? (completed, total) => onProgress(completed, total, sideLabel)
          : undefined,
      },
    );
  }

  /**
   * Calculate delta metrics between two simulation summaries.
   *
   * Positive delta = config A is better for players (higher win rate,
   * fewer deaths, more HP remaining).
   */
  private calculateDeltas(
    summaryA: SimulationSummary,
    summaryB: SimulationSummary,
  ): DeltaMetrics {
    return {
      winRateDelta: this.round(summaryA.playerWinRate - summaryB.playerWinRate),
      averageRoundsDelta: this.round(summaryA.averageRounds - summaryB.averageRounds),
      averageHPRemainingDelta: this.round(
        summaryA.averagePlayerHPPercentRemaining - summaryB.averagePlayerHPPercentRemaining,
      ),
      totalPlayerDeathsDelta: summaryA.totalPlayerDeaths - summaryB.totalPlayerDeaths,
      totalEnemyDeathsDelta: summaryA.totalEnemyDeaths - summaryB.totalEnemyDeaths,
      medianRoundsDelta: summaryA.medianRounds - summaryB.medianRounds,
    };
  }

  /**
   * Calculate per-combatant deltas between two simulation results.
   *
   * Matches combatants by side and index position (not ID), since
   * the two configs may have different combatant IDs.
   */
  private calculateCombatantDeltas(
    metricsA: Map<string, CombatantSimulationMetrics>,
    metricsB: Map<string, CombatantSimulationMetrics>,
  ): CombatantDelta[] {
    const deltas: CombatantDelta[] = [];

    // Group by side, then match by order of appearance
    const playersA = this.getMetricsBySide(metricsA, 'player');
    const playersB = this.getMetricsBySide(metricsB, 'player');
    const enemiesA = this.getMetricsBySide(metricsA, 'enemy');
    const enemiesB = this.getMetricsBySide(metricsB, 'enemy');

    // Match player combatants by index
    const playerCount = Math.min(playersA.length, playersB.length);
    for (let i = 0; i < playerCount; i++) {
      deltas.push(this.makeCombatantDelta(playersA[i], playersB[i]));
    }

    // If A has more players, show them as unmatched (B metrics are zero)
    for (let i = playerCount; i < playersA.length; i++) {
      deltas.push(this.makeCombatantDelta(playersA[i], null));
    }

    // If B has more players, show them as unmatched (A metrics are zero)
    for (let i = playerCount; i < playersB.length; i++) {
      deltas.push(this.makeCombatantDelta(null, playersB[i]));
    }

    // Match enemy combatants by index
    const enemyCount = Math.min(enemiesA.length, enemiesB.length);
    for (let i = 0; i < enemyCount; i++) {
      deltas.push(this.makeCombatantDelta(enemiesA[i], enemiesB[i]));
    }

    // Unmatched enemies from A
    for (let i = enemyCount; i < enemiesA.length; i++) {
      deltas.push(this.makeCombatantDelta(enemiesA[i], null));
    }

    // Unmatched enemies from B
    for (let i = enemyCount; i < enemiesB.length; i++) {
      deltas.push(this.makeCombatantDelta(null, enemiesB[i]));
    }

    return deltas;
  }

  /**
   * Get metrics sorted by side, preserving insertion order.
   */
  private getMetricsBySide(
    metrics: Map<string, CombatantSimulationMetrics>,
    side: 'player' | 'enemy',
  ): CombatantSimulationMetrics[] {
    const result: CombatantSimulationMetrics[] = [];
    for (const m of metrics.values()) {
      if (m.side === side) {
        result.push(m);
      }
    }
    return result;
  }

  /**
   * Create a CombatantDelta from two metrics entries (either may be null).
   */
  private makeCombatantDelta(
    a: CombatantSimulationMetrics | null,
    b: CombatantSimulationMetrics | null,
  ): CombatantDelta {
    if (a && b) {
      return {
        name: a.name,
        side: a.side,
        dprDelta: this.round(a.averageDamagePerRound - b.averageDamagePerRound),
        damageDealtDelta: this.round(a.averageTotalDamageDealt - b.averageTotalDamageDealt),
        damageTakenDelta: this.round(a.averageTotalDamageTaken - b.averageTotalDamageTaken),
        survivalRateDelta: this.round(a.survivalRate - b.survivalRate),
        killRateDelta: this.round(a.killRate - b.killRate),
        criticalHitRateDelta: this.round(a.criticalHitRate - b.criticalHitRate),
        healingDoneDelta: this.round(a.averageHealingDone - b.averageHealingDone),
      };
    }

    if (a) {
      // A has this combatant but B doesn't — delta is A's value
      return {
        name: `${a.name} (only in A)`,
        side: a.side,
        dprDelta: a.averageDamagePerRound,
        damageDealtDelta: a.averageTotalDamageDealt,
        damageTakenDelta: a.averageTotalDamageTaken,
        survivalRateDelta: a.survivalRate,
        killRateDelta: a.killRate,
        criticalHitRateDelta: a.criticalHitRate,
        healingDoneDelta: a.averageHealingDone,
      };
    }

    // B has this combatant but A doesn't — delta is negative B's value
    return {
      name: `${b!.name} (only in B)`,
      side: b!.side,
      dprDelta: -b!.averageDamagePerRound,
      damageDealtDelta: -b!.averageTotalDamageDealt,
      damageTakenDelta: -b!.averageTotalDamageTaken,
      survivalRateDelta: -b!.survivalRate,
      killRateDelta: -b!.killRate,
      criticalHitRateDelta: -b!.criticalHitRate,
      healingDoneDelta: -b!.averageHealingDone,
    };
  }

  /**
   * Test whether the win rate difference between two configurations is
   * statistically significant.
   *
   * Uses a normal approximation for the difference of two proportions:
   * - pA = win rate of config A (proportion of wins)
   * - pB = win rate of config B
   * - n = number of runs per config (assumed equal)
   *
   * Standard error of the difference: SE = sqrt(pA*(1-pA)/n + pB*(1-pB)/n)
   * Z-score: Z = (pA - pB) / SE
   * P-value: 2 * (1 - Φ(|Z|)) for two-tailed test
   *
   * For small samples (n < 30), falls back to a conservative check:
   * the difference must exceed a minimum detectable effect threshold.
   */
  private testSignificance(
    summaryA: SimulationSummary,
    summaryB: SimulationSummary,
    threshold: number,
  ): SignificanceResult {
    const n = Math.min(summaryA.totalRuns, summaryB.totalRuns);

    if (n === 0) {
      return {
        isSignificant: false,
        pValue: 1,
        threshold,
        interpretation: 'No simulation data available',
      };
    }

    const pA = summaryA.playerWinRate;
    const pB = summaryB.playerWinRate;
    const diff = Math.abs(pA - pB);

    // If the difference is zero, it's trivially not significant
    if (diff === 0) {
      return {
        isSignificant: false,
        pValue: 1,
        threshold,
        interpretation: 'No difference in win rates between configurations',
      };
    }

    // Normal approximation for difference of proportions
    const seA = pA * (1 - pA) / n;
    const seB = pB * (1 - pB) / n;
    const se = Math.sqrt(seA + seB);

    // If SE is zero (perfect win/loss), use a conservative estimate
    if (se === 0) {
      return {
        isSignificant: diff > 0,
        pValue: diff > 0 ? 0 : 1,
        threshold,
        interpretation: diff > 0
          ? 'One configuration wins all runs — difference is definitive'
          : 'Both configurations have identical outcomes',
      };
    }

    const zScore = diff / se;

    // Approximate p-value using error function approximation
    // P(Z > z) ≈ 0.5 * (1 + erf(z / sqrt(2)))
    const pValue = this.twoTailedPValue(zScore);

    const isSignificant = pValue < threshold;

    let interpretation: string;
    if (isSignificant) {
      const direction = pA > pB ? 'A' : 'B';
      const pctDiff = (diff * 100).toFixed(1);
      interpretation = `Config ${direction} has a statistically significant ${pctDiff}% higher win rate (p=${pValue.toFixed(4)}, n=${n})`;
    } else {
      const pctDiff = (diff * 100).toFixed(1);
      interpretation = `The ${pctDiff}% win rate difference is not statistically significant (p=${pValue.toFixed(4)}, n=${n}). More runs may be needed to detect a real difference.`;
    }

    return {
      isSignificant,
      pValue,
      threshold,
      interpretation,
    };
  }

  /**
   * Calculate two-tailed p-value from a Z-score using an approximation
   * of the standard normal cumulative distribution.
   *
   * Uses the Abramowitz and Stegun approximation (maximum error: 7.5e-8).
   */
  private twoTailedPValue(z: number): number {
    // Standard normal CDF approximation
    const cdf = this.normalCDF(Math.abs(z));
    // Two-tailed: P(|Z| > z) = 2 * (1 - CDF(z))
    return Math.max(0, 2 * (1 - cdf));
  }

  /**
   * Standard normal CDF using the Abramowitz and Stegun approximation.
   *
   * Maximum error: 7.5e-8. Valid for z >= 0.
   */
  private normalCDF(z: number): number {
    // Constants for the approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.SQRT2;

    const t = 1.0 / (1.0 + p * z);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Round to 4 decimal places for clean output.
   */
  private round(value: number): number {
    return Math.round(value * 10000) / 10000;
  }
}
