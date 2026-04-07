/**
 * ParameterSweep — Systematically vary a single encounter parameter and
 * collect simulation results at each data point.
 *
 * Answers questions like: "What CR makes this a Medium encounter?" or
 * "How does adding more enemies change the win rate curve?"
 *
 * Usage:
 * ```ts
 * const sweeper = new ParameterSweep();
 * const results = sweeper.sweep(
 *   party,
 *   { cr: 3, rarity: 'elite', category: 'humanoid', archetype: 'brute' },
 *   {
 *     variable: 'cr',
 *     range: { min: 1, max: 10, step: 1 },
 *     simulationsPerPoint: 200,
 *     aiConfig: { playerStyle: 'normal', enemyStyle: 'aggressive' },
 *   },
 *   (point, total) => console.log(`Sweep ${point}/${total}`)
 * );
 * // results.dataPoints[i].parameterValue → CR value
 * // results.dataPoints[i].playerWinRate → win rate at that CR
 * ```
 */

import type { CharacterSheet } from '../../types/Character.js';
import type { AIConfig } from '../../types/CombatAI.js';
import type { EnemyRarity, EnemyArchetype, EnemyCategory, StatLevelOverrides } from '../../types/Enemy.js';
import type { SimulationConfig, SimulationSummary } from '../Simulation/CombatSimulator.js';
import { CombatSimulator } from '../Simulation/CombatSimulator.js';
import { EnemyGenerator } from '../../generation/EnemyGenerator.js';

// ─── Sweep Parameter Types ──────────────────────────────────────────────────

/**
 * Which encounter parameter to vary across the sweep.
 *
 * Each variable modifies either the enemy generation options or the party
 * configuration before running simulations at that data point.
 */
export type SweepVariable =
  | 'cr'
  | 'enemyCount'
  | 'partyLevel'
  | 'difficultyMultiplier'
  | 'rarity'
  | 'hpLevel'
  | 'attackLevel'
  | 'defenseLevel';

/**
 * Range configuration for the sweep variable.
 *
 * Generates data points from `min` to `max` (inclusive) at `step` intervals.
 * For example: `{ min: 1, max: 10, step: 1 }` produces 10 data points.
 */
export interface SweepRange {
  /** Starting value of the parameter */
  min: number;
  /** Ending value of the parameter (inclusive) */
  max: number;
  /** Step size between data points */
  step: number;
}

/**
 * Configuration for a parameter sweep.
 *
 * Defines which parameter to vary, over what range, and with how many
 * simulations per data point.
 */
export interface SweepParams {
  /** Which parameter to vary */
  variable: SweepVariable;

  /** Range of values to sweep across */
  range: SweepRange;

  /** Number of simulations to run at each data point */
  simulationsPerPoint: number;

  /** AI configuration for all simulations */
  aiConfig: AIConfig;

  /** Optional combat engine configuration */
  combatConfig?: import('../../types/Combat.js').CombatConfig;

  /** Base seed — each data point gets baseSeed + '-' + parameterValue */
  baseSeed?: string;

  /** AbortSignal for cancelling the sweep */
  abortSignal?: AbortSignal;
}

// ─── Sweep Result Types ─────────────────────────────────────────────────────

/**
 * A single data point in the sweep results.
 *
 * Maps a parameter value to the simulation summary at that value.
 */
export interface SweepDataPoint {
  /** The value of the sweep parameter at this data point */
  parameterValue: number;

  /** Player win rate (0.0–1.0) at this parameter value */
  playerWinRate: number;

  /** Average number of rounds to combat resolution */
  averageRounds: number;

  /** Average player HP remaining percent on winning runs */
  averageHPRemaining: number;

  /** Total player deaths across all simulations at this point */
  totalPlayerDeaths: number;

  /** Total enemy deaths across all simulations at this point */
  totalEnemyDeaths: number;

  /** Median rounds to combat resolution */
  medianRounds: number;
}

/**
 * Complete results from a parameter sweep.
 *
 * Contains one `SweepDataPoint` per value in the sweep range, ordered
 * from lowest parameter value to highest.
 */
export interface SweepResults {
  /** Which parameter was swept */
  variable: SweepVariable;

  /** The range that was swept */
  range: SweepRange;

  /** Number of simulations run at each data point */
  simulationsPerPoint: number;

  /** Data points mapping parameter value → simulation summary */
  dataPoints: SweepDataPoint[];

  /** Whether the sweep was cancelled before completing all data points */
  wasCancelled: boolean;
}

// ─── Enemy Generation Config (for sweep) ────────────────────────────────────

/**
 * Base enemy configuration for the sweep.
 *
 * Defines the "template" enemy that gets modified by the sweep variable.
 */
export interface SweepEnemyConfig {
  /** Challenge Rating (used as default, overridden when variable='cr') */
  cr?: number;
  /** Rarity tier */
  rarity?: EnemyRarity;
  /** Enemy category */
  category?: EnemyCategory;
  /** Combat archetype */
  archetype?: EnemyArchetype;
  /** Template ID for deterministic generation */
  templateId?: string;
  /** Stat level overrides */
  statLevels?: StatLevelOverrides;
  /** Difficulty multiplier */
  difficultyMultiplier?: number;
}

// ─── ParameterSweep Class ───────────────────────────────────────────────────

/**
 * ParameterSweep — Varies a single encounter parameter across a range
 * and runs simulations at each data point.
 *
 * Stateless between `sweep()` calls. Each sweep produces an independent
 * set of results.
 */
export class ParameterSweep {
  /**
   * Run a parameter sweep.
   *
   * For each value in the sweep range, generates enemies (or modifies party)
   * with that parameter value, runs simulations, and collects the summary.
   *
   * @param players - Player character sheets (original, unmodified)
   * @param baseEncounter - Base enemy configuration (modified per data point)
   * @param params - Sweep configuration (variable, range, simulations per point)
   * @param onProgress - Optional callback: (completedPoints, totalPoints)
   * @returns SweepResults with one data point per value in the range
   */
  sweep(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    params: SweepParams,
    onProgress?: (completed: number, total: number) => void,
  ): SweepResults {
    const values = this.generateValues(params.range);
    const totalPoints = values.length;
    const dataPoints: SweepDataPoint[] = [];
    let wasCancelled = false;

    for (let i = 0; i < totalPoints; i++) {
      // Check for cancellation
      if (params.abortSignal?.aborted) {
        wasCancelled = true;
        break;
      }

      const value = values[i];

      try {
        // Generate the modified party and enemies for this data point
        const { modifiedPlayers, modifiedEnemies } = this.applyParameter(
          players,
          baseEncounter,
          params.variable,
          value,
        );

        // Skip data points that would produce empty combat
        if (modifiedPlayers.length === 0 || modifiedEnemies.length === 0) {
          dataPoints.push({
            parameterValue: value,
            playerWinRate: 0,
            averageRounds: 0,
            averageHPRemaining: 0,
            totalPlayerDeaths: 0,
            totalEnemyDeaths: 0,
            medianRounds: 0,
          });
          onProgress?.(i + 1, totalPoints);
          continue;
        }

        // Run simulations at this data point
        const seed = `${params.baseSeed ?? 'sweep'}-${value}`;
        const simulator = new CombatSimulator();
        const results = simulator.run(
          modifiedPlayers,
          modifiedEnemies,
          {
            runCount: params.simulationsPerPoint,
            baseSeed: seed,
            aiConfig: params.aiConfig,
            combatConfig: params.combatConfig,
            collectDetailedLogs: false,
            abortSignal: params.abortSignal,
          },
        );

        if (results.wasCancelled) {
          wasCancelled = true;
          // Still add partial results for this point
          dataPoints.push(this.summarizeToPoint(value, results.summary));
        } else {
          dataPoints.push(this.summarizeToPoint(value, results.summary));
        }
      } catch {
        // If simulations fail at a data point, record zeros
        dataPoints.push({
          parameterValue: value,
          playerWinRate: 0,
          averageRounds: 0,
          averageHPRemaining: 0,
          totalPlayerDeaths: 0,
          totalEnemyDeaths: 0,
          medianRounds: 0,
        });
      }

      onProgress?.(i + 1, totalPoints);
    }

    return {
      variable: params.variable,
      range: params.range,
      simulationsPerPoint: params.simulationsPerPoint,
      dataPoints,
      wasCancelled,
    };
  }

  /**
   * Generate the list of parameter values from a range.
   */
  private generateValues(range: SweepRange): number[] {
    const values: number[] = [];
    for (let v = range.min; v <= range.max + range.step * 0.5; v += range.step) {
      // Round to avoid floating-point drift (e.g., 0.25, 0.5, 0.75, 1.0)
      const rounded = Math.round(v * 1000) / 1000;
      if (rounded > range.max + range.step * 0.01) break;
      values.push(rounded);
    }
    return values;
  }

  /**
   * Apply a parameter value to the base party/encounter configuration.
   *
   * Returns modified copies — the originals are never mutated.
   */
  private applyParameter(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    variable: SweepVariable,
    value: number,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    switch (variable) {
      case 'cr':
        return this.applyCR(players, baseEncounter, value);

      case 'enemyCount':
        return this.applyEnemyCount(players, baseEncounter, value);

      case 'partyLevel':
        return this.applyPartyLevel(players, baseEncounter, value);

      case 'difficultyMultiplier':
        return this.applyDifficultyMultiplier(players, baseEncounter, value);

      case 'rarity':
        return this.applyRarity(players, baseEncounter, value);

      case 'hpLevel':
        return this.applyStatLevel(players, baseEncounter, { hpLevel: value });

      case 'attackLevel':
        return this.applyStatLevel(players, baseEncounter, { attackLevel: value });

      case 'defenseLevel':
        return this.applyStatLevel(players, baseEncounter, { defenseLevel: value });

      default:
        return { modifiedPlayers: players, modifiedEnemies: this.generateEnemies(baseEncounter, 1) };
    }
  }

  /**
   * Sweep CR: generate enemies at the given CR.
   */
  private applyCR(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    cr: number,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    const encounter = { ...baseEncounter, cr };
    return { modifiedPlayers: players, modifiedEnemies: this.generateEnemies(encounter, 1) };
  }

  /**
   * Sweep enemy count: generate N enemies with the base config.
   */
  private applyEnemyCount(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    count: number,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    const intCount = Math.max(1, Math.round(count));
    return { modifiedPlayers: players, modifiedEnemies: this.generateEnemies(baseEncounter, intCount) };
  }

  /**
   * Sweep party level: scale all player character levels to the given value.
   *
   * Creates shallow copies with adjusted level and derives reasonable stat changes.
   * Note: this is a simplified scaling — real level-up involves class-specific features.
   */
  private applyPartyLevel(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    level: number,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    const intLevel = Math.max(1, Math.round(level));
    const modifiedPlayers = players.map((player, i) => ({
      ...player,
      level: intLevel,
      // Adjust HP proportionally to level change
      hp: {
        ...player.hp,
        current: Math.round(
          (player.hp.current / Math.max(1, player.level)) * intLevel
        ),
        max: Math.round(
          (player.hp.max / Math.max(1, player.level)) * intLevel
        ),
      },
    }));
    return { modifiedPlayers, modifiedEnemies: this.generateEnemies(baseEncounter, 1) };
  }

  /**
   * Sweep difficulty multiplier: generate enemies with the given multiplier.
   */
  private applyDifficultyMultiplier(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    multiplier: number,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    const encounter = { ...baseEncounter, difficultyMultiplier: multiplier };
    return { modifiedPlayers: players, modifiedEnemies: this.generateEnemies(encounter, 1) };
  }

  /**
   * Sweep rarity: map numeric value to rarity tier (0=common, 1=uncommon, 2=elite, 3=boss).
   */
  private applyRarity(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    rarityIndex: number,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    const rarities: EnemyRarity[] = ['common', 'uncommon', 'elite', 'boss'];
    const idx = Math.max(0, Math.min(rarities.length - 1, Math.round(rarityIndex)));
    const encounter = { ...baseEncounter, rarity: rarities[idx] };
    return { modifiedPlayers: players, modifiedEnemies: this.generateEnemies(encounter, 1) };
  }

  /**
   * Sweep a stat level override (hpLevel, attackLevel, or defenseLevel).
   */
  private applyStatLevel(
    players: CharacterSheet[],
    baseEncounter: SweepEnemyConfig,
    overrides: StatLevelOverrides,
  ): { modifiedPlayers: CharacterSheet[]; modifiedEnemies: CharacterSheet[] } {
    const encounter = {
      ...baseEncounter,
      statLevels: { ...baseEncounter.statLevels, ...overrides },
    };
    return { modifiedPlayers: players, modifiedEnemies: this.generateEnemies(encounter, 1) };
  }

  /**
   * Generate enemies from the encounter config.
   *
   * Generates `count` enemies, each with a unique seed derived from the config.
   */
  private generateEnemies(encounter: SweepEnemyConfig, count: number): CharacterSheet[] {
    const enemies: CharacterSheet[] = [];
    const baseSeed = encounter.templateId ?? encounter.category ?? 'enemy';

    for (let i = 0; i < count; i++) {
      const seed = `${baseSeed}-sweep-${i}`;
      const enemy = EnemyGenerator.generate({
        seed,
        cr: encounter.cr,
        rarity: encounter.rarity,
        category: encounter.category,
        archetype: encounter.archetype,
        templateId: encounter.templateId,
        statLevels: encounter.statLevels,
        difficultyMultiplier: encounter.difficultyMultiplier,
      });
      enemies.push(enemy);
    }

    return enemies;
  }

  /**
   * Extract a SweepDataPoint from a SimulationSummary.
   */
  private summarizeToPoint(parameterValue: number, summary: SimulationSummary): SweepDataPoint {
    return {
      parameterValue,
      playerWinRate: summary.playerWinRate,
      averageRounds: summary.averageRounds,
      averageHPRemaining: summary.averagePlayerHPPercentRemaining,
      totalPlayerDeaths: summary.totalPlayerDeaths,
      totalEnemyDeaths: summary.totalEnemyDeaths,
      medianRounds: summary.medianRounds,
    };
  }
}
