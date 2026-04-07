/**
 * DifficultyCalculator — Suggests enemy configurations for a target difficulty
 * using simulation-driven binary search.
 *
 * Given a party and a desired difficulty, this class iteratively runs
 * simulations at different CR values, adjusting up or down until the
 * player win rate converges on the expected win rate range for the
 * target difficulty.
 *
 * The search uses a two-phase approach:
 * 1. **XP Budget Estimate** — `getCRFromXP()` provides the initial CR guess
 *    based on D&D 5e encounter building math.
 * 2. **Simulation-Driven Refinement** — binary search over CR values, running
 *    simulations at each step to measure actual win rate, adjusting until
 *    the win rate falls within the target range.
 *
 * Returns a `DifficultySuggestion` with the recommended CR, confidence
 * interval, and the simulation data backing the recommendation.
 *
 * Usage:
 * ```ts
 * const calculator = new DifficultyCalculator();
 * const suggestion = calculator.suggest(
 *   party,
 *   { rarity: 'elite', category: 'humanoid', archetype: 'brute' },
 *   'medium',
 *   { aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' }, baseSeed: 'my-search' },
 * );
 * console.log(suggestion.recommendedCR);        // e.g., 3
 * console.log(suggestion.winRate);              // e.g., 0.73
 * console.log(suggestion.confidenceInterval);   // e.g., '72% ± 5%'
 * ```
 */

import type { CharacterSheet } from '../../types/Character.js';
import type { AIConfig } from '../../types/CombatAI.js';
import type { CombatConfig } from '../../types/Combat.js';
import type { EncounterDifficulty, EnemyRarity, EnemyCategory, EnemyArchetype, StatLevelOverrides } from '../../types/Enemy.js';
import type { SimulationConfig, SimulationSummary } from '../Simulation/CombatSimulator.js';
import { CombatSimulator } from '../Simulation/CombatSimulator.js';
import { EnemyGenerator } from '../../generation/EnemyGenerator.js';
import {
  getXPBudgetForParty,
  getXPForCR,
  getCRFromXP,
  getEncounterMultiplier,
  calculateAdjustedXP,
} from '../../../constants/EncounterBalance.js';
import { EXPECTED_WIN_RATES } from './BalanceValidator.js';

// ─── Difficulty Calculator Types ──────────────────────────────────────────────

/**
 * Configuration for the difficulty calculation search.
 */
export interface DifficultyCalculatorOptions {
  /** AI configuration for all simulations */
  aiConfig: AIConfig;

  /** Optional combat engine configuration */
  combatConfig?: CombatConfig;

  /** Base seed — each simulation iteration gets a derived seed */
  baseSeed?: string;

  /** Number of simulations to run per CR probe (default: 200) */
  simulationsPerProbe?: number;

  /**
   * Maximum number of binary search iterations (default: 10).
   * Each iteration runs a full simulation at one CR value.
   */
  maxIterations?: number;

  /** Number of enemies in the encounter (default: 1) */
  enemyCount?: number;

  /** AbortSignal for cancellation */
  abortSignal?: AbortSignal;

  /** Progress callback: (iteration, maxIterations, currentCR) */
  onProgress?: (iteration: number, maxIterations: number, currentCR: number) => void;
}

/**
 * Enemy template configuration for generating enemies during the search.
 *
 * The CR field is set automatically by the search — all other fields
 * define the "template" enemy that gets generated at each CR level.
 */
export interface DifficultyEnemyTemplate {
  /** Rarity tier (default: 'elite') */
  rarity?: EnemyRarity;

  /** Enemy category (default: 'humanoid') */
  category?: EnemyCategory;

  /** Combat archetype (default: 'brute') */
  archetype?: EnemyArchetype;

  /** Template ID for deterministic generation */
  templateId?: string;

  /** Stat level overrides */
  statLevels?: StatLevelOverrides;

  /** Difficulty multiplier */
  difficultyMultiplier?: number;
}

/**
 * A single probe point from the binary search.
 * Records the CR tested and the simulation outcome.
 */
export interface DifficultyProbe {
  /** CR value tested */
  cr: number;

  /** Player win rate from simulation */
  winRate: number;

  /** Total simulation runs */
  totalRuns: number;

  /** Average rounds to combat resolution */
  averageRounds: number;

  /** Average player HP remaining percent on winning runs */
  averageHPRemaining: number;
}

/**
 * Complete difficulty suggestion result.
 *
 * Contains the recommended CR, the simulation data backing it,
 * confidence information, and the search history.
 */
export interface DifficultySuggestion {
  /** The target difficulty */
  targetDifficulty: EncounterDifficulty;

  /**
   * Recommended CR for a single enemy.
   * For multi-enemy encounters, divide this by enemy count (approximately).
   */
  recommendedCR: number;

  /** Player win rate at the recommended CR */
  winRate: number;

  /** Expected win rate range for the target difficulty */
  expectedWinRateRange: { min: number; max: number };

  /** Human-readable confidence interval string, e.g., "72% ± 5%" */
  confidenceInterval: string;

  /** Statistical margin of error (±) for the win rate */
  marginOfError: number;

  /** Whether the search converged on the target range */
  converged: boolean;

  /** Total simulations run across all probes */
  totalSimulationsRun: number;

  /** Number of search iterations performed */
  iterationsUsed: number;

  /** All probe points from the search (CR, winRate, etc.) */
  probes: DifficultyProbe[];

  /** XP-budget-based initial CR estimate (before simulation refinement) */
  initialCREstimate: number;

  /** The generated enemy CharacterSheet at the recommended CR */
  suggestedEnemy: CharacterSheet;

  /** Was the search cancelled before convergence? */
  wasCancelled: boolean;
}

// ─── DifficultyCalculator Class ───────────────────────────────────────────────

/**
 * DifficultyCalculator — Suggests enemy CR for a target difficulty using
 * simulation-driven binary search.
 *
 * Stateless between `suggest()` calls. Each call produces an independent
 * `DifficultySuggestion`.
 *
 * The search works as follows:
 * 1. Calculate XP budget for the party at the target difficulty
 * 2. Adjust for encounter multiplier (enemy count)
 * 3. Convert to CR estimate via `getCRFromXP()`
 * 4. Run simulations at the estimated CR
 * 5. If win rate is too high → increase CR; too low → decrease CR
 * 6. Repeat until win rate is within target range or max iterations reached
 */
export class DifficultyCalculator {
  private static readonly DEFAULT_SIMULATIONS_PER_PROBE = 200;
  private static readonly DEFAULT_MAX_ITERATIONS = 10;
  private static readonly CR_STEP_MIN = 0.25;
  private static readonly CR_FLOOR = 0.125;
  private static readonly CR_CEILING = 30;

  /**
   * Suggest an enemy CR for the given party and target difficulty.
   *
   * @param players - Player character sheets
   * @param enemyTemplate - Template for generating enemies (rarity, category, etc.)
   * @param targetDifficulty - The desired encounter difficulty
   * @param options - Calculator options (AI config, seed, probe count, etc.)
   * @returns Complete difficulty suggestion with recommended CR and simulation data
   */
  suggest(
    players: CharacterSheet[],
    enemyTemplate: DifficultyEnemyTemplate,
    targetDifficulty: EncounterDifficulty,
    options: DifficultyCalculatorOptions,
  ): DifficultySuggestion {
    const {
      aiConfig,
      combatConfig,
      baseSeed = 'difficulty-calc',
      simulationsPerProbe = DifficultyCalculator.DEFAULT_SIMULATIONS_PER_PROBE,
      maxIterations = DifficultyCalculator.DEFAULT_MAX_ITERATIONS,
      enemyCount = 1,
      abortSignal,
      onProgress,
    } = options;

    const probes: DifficultyProbe[] = [];
    let totalSimulationsRun = 0;

    // Step 1: XP-budget-based initial CR estimate
    const partyLevels = players.map(p => p.level);
    const xpBudget = getXPBudgetForParty(partyLevels, targetDifficulty);
    const multiplier = getEncounterMultiplier(enemyCount);
    const adjustedBudget = xpBudget / multiplier;
    const initialCREstimate = getCRFromXP(adjustedBudget);

    // Clamp to valid CR range
    let lowCR = DifficultyCalculator.CR_FLOOR;
    let highCR = DifficultyCalculator.CR_CEILING;
    let currentCR = Math.max(lowCR, Math.min(highCR, initialCREstimate));

    const targetRange = EXPECTED_WIN_RATES[targetDifficulty];
    let converged = false;
    let bestProbe: DifficultyProbe | null = null;
    let wasCancelled = false;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Check cancellation
      if (abortSignal?.aborted) {
        wasCancelled = true;
        break;
      }

      onProgress?.(iteration + 1, maxIterations, currentCR);

      // Run simulation at current CR
      const summary = this.runProbe(
        players,
        enemyTemplate,
        currentCR,
        enemyCount,
        aiConfig,
        combatConfig,
        simulationsPerProbe,
        baseSeed,
        iteration,
      );

      totalSimulationsRun += simulationsPerProbe;

      const probe: DifficultyProbe = {
        cr: currentCR,
        winRate: summary.playerWinRate,
        totalRuns: summary.totalRuns,
        averageRounds: summary.averageRounds,
        averageHPRemaining: summary.averagePlayerHPPercentRemaining,
      };
      probes.push(probe);

      // Track best probe (closest to target midpoint)
      const targetMid = (targetRange.min + targetRange.max) / 2;
      if (!bestProbe || Math.abs(probe.winRate - targetMid) < Math.abs(bestProbe.winRate - targetMid)) {
        bestProbe = probe;
      }

      // Check convergence: is win rate within target range?
      if (probe.winRate >= targetRange.min && probe.winRate <= targetRange.max) {
        converged = true;
        break;
      }

      // Adjust CR via binary search
      if (probe.winRate > targetRange.max) {
        // Win rate too high → encounter too easy → increase CR
        lowCR = currentCR;
      } else {
        // Win rate too low → encounter too hard → decrease CR
        highCR = currentCR;
      }

      // Calculate next CR as midpoint, with minimum step
      const nextCR = (lowCR + highCR) / 2;

      // Stop if CR range is too narrow to meaningfully continue
      if (Math.abs(nextCR - currentCR) < DifficultyCalculator.CR_STEP_MIN) {
        // Try one more step of CR_STEP_MIN in the right direction
        if (probe.winRate > targetRange.max) {
          currentCR = Math.min(DifficultyCalculator.CR_CEILING, currentCR + DifficultyCalculator.CR_STEP_MIN);
        } else {
          currentCR = Math.max(DifficultyCalculator.CR_FLOOR, currentCR - DifficultyCalculator.CR_STEP_MIN);
        }
        if (currentCR === probes[probes.length - 1].cr) {
          break; // Can't adjust further
        }
      } else {
        currentCR = nextCR;
      }
    }

    // Generate the suggested enemy at the best CR found
    const finalCR = bestProbe?.cr ?? currentCR;
    const suggestedEnemy = this.generateEnemy(enemyTemplate, finalCR, baseSeed);

    // Calculate confidence interval
    const marginOfError = this.calculateMarginOfError(bestProbe?.totalRuns ?? simulationsPerProbe);
    const confidenceInterval = this.formatConfidenceInterval(
      bestProbe?.winRate ?? 0,
      marginOfError,
    );

    return {
      targetDifficulty,
      recommendedCR: this.roundCR(finalCR),
      winRate: bestProbe?.winRate ?? 0,
      expectedWinRateRange: targetRange,
      confidenceInterval,
      marginOfError,
      converged,
      totalSimulationsRun,
      iterationsUsed: probes.length,
      probes,
      initialCREstimate: this.roundCR(initialCREstimate),
      suggestedEnemy,
      wasCancelled,
    };
  }

  /**
   * Run a simulation probe at a given CR and return the summary.
   */
  private runProbe(
    players: CharacterSheet[],
    enemyTemplate: DifficultyEnemyTemplate,
    cr: number,
    enemyCount: number,
    aiConfig: AIConfig,
    combatConfig: CombatConfig | undefined,
    runCount: number,
    baseSeed: string,
    iteration: number,
  ): SimulationSummary {
    const enemies = this.generateEnemies(enemyTemplate, cr, enemyCount, baseSeed);
    const simulator = new CombatSimulator();

    try {
      const results = simulator.run(players, enemies, {
        runCount,
        baseSeed: `${baseSeed}-probe-${iteration}`,
        aiConfig,
        combatConfig,
        collectDetailedLogs: false,
      });
      return results.summary;
    } catch {
      // If simulation fails, return a zeroed summary
      return {
        totalRuns: runCount,
        playerWins: 0,
        enemyWins: runCount,
        draws: 0,
        playerWinRate: 0,
        averageRounds: 0,
        medianRounds: 0,
        averageRoundsOnWin: 0,
        averageRoundsOnLoss: 0,
        averagePlayerHPPercentRemaining: 0,
        totalPlayerDeaths: runCount * players.length,
        averageRoundsPerPlayerDeath: 0,
        totalEnemyDeaths: 0,
        averageRoundsPerEnemyDeath: 0,
      };
    }
  }

  /**
   * Generate enemies from the template at the given CR.
   */
  private generateEnemies(
    template: DifficultyEnemyTemplate,
    cr: number,
    count: number,
    baseSeed: string,
  ): CharacterSheet[] {
    const enemies: CharacterSheet[] = [];
    for (let i = 0; i < count; i++) {
      enemies.push(this.generateEnemy(template, cr, `${baseSeed}-enemy-${i}`));
    }
    return enemies;
  }

  /**
   * Generate a single enemy from the template at the given CR.
   */
  private generateEnemy(
    template: DifficultyEnemyTemplate,
    cr: number,
    seed: string,
  ): CharacterSheet {
    return EnemyGenerator.generate({
      seed,
      cr,
      rarity: template.rarity ?? 'elite',
      category: template.category ?? 'humanoid',
      archetype: template.archetype ?? 'brute',
      templateId: template.templateId,
      statLevels: template.statLevels,
      difficultyMultiplier: template.difficultyMultiplier,
    });
  }

  /**
   * Calculate margin of error for a proportion using the normal approximation.
   *
   * MOE = z * sqrt(p * (1 - p) / n) at 95% confidence (z = 1.96)
   */
  private calculateMarginOfError(totalRuns: number): number {
    if (totalRuns <= 0) return 1;
    // Use worst-case p=0.5 for conservative estimate
    const z = 1.96;
    return z * Math.sqrt(0.5 * 0.5 / totalRuns);
  }

  /**
   * Format a confidence interval as a human-readable string.
   *
   * Example: "72% ± 5%"
   */
  private formatConfidenceInterval(winRate: number, marginOfError: number): string {
    const pct = Math.round(winRate * 100);
    const moe = Math.round(marginOfError * 100);
    return `${pct}% ± ${moe}%`;
  }

  /**
   * Round CR to a standard D&D value (0.125, 0.25, 0.5, or integer).
   *
   * Maps fractional CRs to the nearest standard step:
   * - < 0.25 → 0.125
   * - < 0.75 → 0.5
   * - otherwise → nearest integer
   */
  private roundCR(cr: number): number {
    if (cr <= 0) return 0;
    if (cr < 0.25) return 0.125;
    if (cr < 0.375) return 0.25;
    if (cr < 0.75) return 0.5;
    return Math.round(cr);
  }
}
