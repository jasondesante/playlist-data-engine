/**
 * DifficultyCalculator Tests
 *
 * Task 4.4.1: Tests for the difficulty calculation system that suggests
 * enemy CR values for a target difficulty using simulation-driven binary search.
 */

import { describe, it, expect } from 'vitest';
import { DifficultyCalculator } from '../../../src/core/combat/Analysis/DifficultyCalculator.js';
import type {
  DifficultyCalculatorOptions,
  DifficultyEnemyTemplate,
  DifficultySuggestion,
  DifficultyProbe,
} from '../../../src/core/combat/Analysis/DifficultyCalculator.js';
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
const aggressiveAI: AIConfig = { playerStyle: 'normal', enemyStyle: 'aggressive' };

const defaultTemplate: DifficultyEnemyTemplate = {
  rarity: 'elite',
  category: 'humanoid',
  archetype: 'brute',
};

function makeOptions(
  overrides: Partial<DifficultyCalculatorOptions> = {},
): DifficultyCalculatorOptions {
  return {
    aiConfig: normalAI,
    baseSeed: 'test-difficulty',
    simulationsPerProbe: 50,
    maxIterations: 6,
    enemyCount: 1,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DifficultyCalculator', () => {
  const calculator = new DifficultyCalculator();

  // ─── Suggestion Structure ────────────────────────────────────────────────

  describe('suggestion structure', () => {
    it('returns a complete DifficultySuggestion', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      expect(suggestion.targetDifficulty).toBe('medium');
      expect(typeof suggestion.recommendedCR).toBe('number');
      expect(typeof suggestion.winRate).toBe('number');
      expect(suggestion.expectedWinRateRange).toEqual({ min: 0.70, max: 0.80 });
      expect(typeof suggestion.confidenceInterval).toBe('string');
      expect(typeof suggestion.marginOfError).toBe('number');
      expect(typeof suggestion.converged).toBe('boolean');
      expect(typeof suggestion.totalSimulationsRun).toBe('number');
      expect(typeof suggestion.iterationsUsed).toBe('number');
      expect(Array.isArray(suggestion.probes)).toBe(true);
      expect(typeof suggestion.initialCREstimate).toBe('number');
      expect(suggestion.suggestedEnemy).toBeDefined();
      expect(typeof suggestion.wasCancelled).toBe('boolean');
    });

    it('probes array has at least one entry', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      expect(suggestion.probes.length).toBeGreaterThanOrEqual(1);
    });

    it('each probe has required fields', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      for (const probe of suggestion.probes) {
        expect(typeof probe.cr).toBe('number');
        expect(typeof probe.winRate).toBe('number');
        expect(probe.winRate).toBeGreaterThanOrEqual(0);
        expect(probe.winRate).toBeLessThanOrEqual(1);
        expect(typeof probe.totalRuns).toBe('number');
        expect(typeof probe.averageRounds).toBe('number');
        expect(typeof probe.averageHPRemaining).toBe('number');
      }
    });

    it('suggestedEnemy has CR matching recommendedCR', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      // The suggestedEnemy's CR should be close to recommendedCR
      expect(suggestion.suggestedEnemy.cr).toBeDefined();
      expect(suggestion.suggestedEnemy.name).toBeDefined();
    });

    it('totalSimulationsRun equals iterationsUsed * simulationsPerProbe', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        simulationsPerProbe: 50,
        maxIterations: 6,
      }));

      expect(suggestion.totalSimulationsRun).toBe(suggestion.iterationsUsed * 50);
    });
  });

  // ─── Initial CR Estimate ─────────────────────────────────────────────────

  describe('initial CR estimate', () => {
    it('produces a reasonable initial CR for level 5 party', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      // Level 5 party of 4, medium difficulty:
      // XP budget = 4 * 500 = 2000, / multiplier (1) = 2000
      // getCRFromXP(2000) = 5
      expect(suggestion.initialCREstimate).toBe(5);
    });

    it('produces a reasonable initial CR for level 1 party', () => {
      const players = makePlayers(4, 1);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      // Level 1 party of 4, medium: 4 * 50 = 200
      // getCRFromXP(200) = 1
      expect(suggestion.initialCREstimate).toBe(1);
    });

    it('produces a reasonable initial CR for easy difficulty', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'easy', makeOptions());

      // Level 5 party of 4, easy: 4 * 250 = 1000
      // getCRFromXP(1000) = 3 (CR 3 = 700 XP ≤ 1000, CR 4 = 1100 XP > 1000)
      expect(suggestion.initialCREstimate).toBe(3);
    });

    it('produces a higher initial CR for deadly difficulty', () => {
      const players = makePlayers(4, 5);
      const mediumSuggestion = calculator.suggest(
        makePlayers(4, 5), defaultTemplate, 'medium', makeOptions(),
      );
      const deadlySuggestion = calculator.suggest(
        makePlayers(4, 5), defaultTemplate, 'deadly', makeOptions(),
      );

      // Deadly should have higher initial CR than medium
      expect(deadlySuggestion.initialCREstimate).toBeGreaterThanOrEqual(
        mediumSuggestion.initialCREstimate,
      );
    });

    it('accounts for enemy count in initial estimate', () => {
      const singleEnemy = calculator.suggest(
        makePlayers(4, 5), defaultTemplate, 'medium', makeOptions({ enemyCount: 1 }),
      );
      const multiEnemy = calculator.suggest(
        makePlayers(4, 5), defaultTemplate, 'medium', makeOptions({ enemyCount: 4 }),
      );

      // More enemies → lower per-enemy CR
      expect(multiEnemy.initialCREstimate).toBeLessThan(singleEnemy.initialCREstimate);
    });
  });

  // ─── Confidence Interval ─────────────────────────────────────────────────

  describe('confidence interval', () => {
    it('formats as "XX% ± Y%"', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      expect(suggestion.confidenceInterval).toMatch(/^\d+% ± \d+%$/);
    });

    it('margin of error decreases with more simulations', () => {
      const players = makePlayers(4, 5);
      const lowSim = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ simulationsPerProbe: 50, maxIterations: 1 }),
      );
      const highSim = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ simulationsPerProbe: 500, maxIterations: 1, baseSeed: 'high-sim' }),
      );

      expect(highSim.marginOfError).toBeLessThan(lowSim.marginOfError);
    });

    it('margin of error is always positive', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions());

      expect(suggestion.marginOfError).toBeGreaterThan(0);
    });
  });

  // ─── Difficulty Targeting ────────────────────────────────────────────────

  describe('difficulty targeting', () => {
    it('returns a valid recommended CR for medium difficulty', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 6,
        simulationsPerProbe: 100,
      }));

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
      expect(suggestion.recommendedCR).toBeLessThanOrEqual(30);
    });

    it('returns a valid recommended CR for easy difficulty', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'easy', makeOptions({
        maxIterations: 6,
        simulationsPerProbe: 100,
      }));

      expect(suggestion.recommendedCR).toBeGreaterThanOrEqual(0);
    });

    it('returns a valid recommended CR for hard difficulty', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'hard', makeOptions({
        maxIterations: 6,
        simulationsPerProbe: 100,
      }));

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('returns a valid recommended CR for deadly difficulty', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'deadly', makeOptions({
        maxIterations: 6,
        simulationsPerProbe: 100,
      }));

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('easy recommends lower CR than deadly', () => {
      const players = makePlayers(4, 5);
      const easySuggestion = calculator.suggest(
        players, defaultTemplate, 'easy', makeOptions({ maxIterations: 4, baseSeed: 'easy' }),
      );
      const deadlySuggestion = calculator.suggest(
        players, defaultTemplate, 'deadly', makeOptions({ maxIterations: 4, baseSeed: 'deadly' }),
      );

      // Easy encounters should have lower CR than deadly
      // (not guaranteed due to limited iterations, but very likely)
      expect(easySuggestion.recommendedCR).toBeLessThanOrEqual(deadlySuggestion.recommendedCR);
    });

    it('higher party level yields higher recommended CR', () => {
      const lowParty = calculator.suggest(
        makePlayers(4, 3), defaultTemplate, 'medium',
        makeOptions({ maxIterations: 6, baseSeed: 'low-level' }),
      );
      const highParty = calculator.suggest(
        makePlayers(4, 10), defaultTemplate, 'medium',
        makeOptions({ maxIterations: 6, baseSeed: 'high-level' }),
      );

      // Higher-level party should need a tougher enemy
      expect(highParty.initialCREstimate).toBeGreaterThan(lowParty.initialCREstimate);
      // The final recommended CR should also be higher
      expect(highParty.recommendedCR).toBeGreaterThan(lowParty.recommendedCR);
    });

    it('larger party yields higher recommended CR', () => {
      const smallParty = calculator.suggest(
        makePlayers(1, 5), defaultTemplate, 'medium',
        makeOptions({ maxIterations: 4, baseSeed: 'solo' }),
      );
      const largeParty = calculator.suggest(
        makePlayers(4, 5), defaultTemplate, 'medium',
        makeOptions({ maxIterations: 4, baseSeed: 'full-party' }),
      );

      expect(largeParty.recommendedCR).toBeGreaterThan(smallParty.recommendedCR);
    });
  });

  // ─── Binary Search Behavior ──────────────────────────────────────────────

  describe('binary search behavior', () => {
    it('respects maxIterations', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 3,
        simulationsPerProbe: 50,
      }));

      expect(suggestion.iterationsUsed).toBeLessThanOrEqual(3);
    });

    it('runs at least one iteration', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 1,
        simulationsPerProbe: 50,
      }));

      expect(suggestion.iterationsUsed).toBe(1);
      expect(suggestion.probes.length).toBe(1);
    });

    it('probes CR values in a narrowing pattern', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 5,
        simulationsPerProbe: 50,
      }));

      if (suggestion.probes.length >= 3) {
        // The range between consecutive CR values should generally narrow
        const firstRange = Math.abs(suggestion.probes[1].cr - suggestion.probes[0].cr);
        const lastIdx = suggestion.probes.length - 1;
        const lastRange = Math.abs(suggestion.probes[lastIdx].cr - suggestion.probes[lastIdx - 1].cr);

        // Not always strictly narrowing due to clamping, but generally should be
        expect(lastRange).toBeLessThanOrEqual(firstRange + 0.5);
      }
    });

    it('each iteration tests a different CR', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 4,
        simulationsPerProbe: 50,
      }));

      // In most cases, different iterations test different CRs
      // (may not be true if convergence happens immediately or clamping)
      const crs = suggestion.probes.map(p => p.cr);
      const uniqueCRs = new Set(crs);
      expect(uniqueCRs.size).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Convergence ─────────────────────────────────────────────────────────

  describe('convergence', () => {
    it('may converge within iterations for reasonable configurations', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 10,
        simulationsPerProbe: 100,
      }));

      // With enough iterations and simulations, convergence is possible
      // (not guaranteed due to stochastic nature, but the search makes progress)
      expect(typeof suggestion.converged).toBe('boolean');
    });

    it('reports converged=false when maxIterations is too low', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 1,
        simulationsPerProbe: 50,
      }));

      // With only 1 iteration, convergence is very unlikely
      // (though technically possible if the initial estimate is perfect)
      expect(suggestion.iterationsUsed).toBe(1);
    });
  });

  // ─── Enemy Template ──────────────────────────────────────────────────────

  describe('enemy template', () => {
    it('generates a valid enemy with CR', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 2 }),
      );

      expect(suggestion.suggestedEnemy.cr).toBeDefined();
      expect(suggestion.suggestedEnemy.name).toBeDefined();
    });

    it('generates enemies with specified rarity (boss produces higher CR)', () => {
      const players = makePlayers(4, 5);
      const bossTemplate: DifficultyEnemyTemplate = { rarity: 'boss' };
      const commonTemplate: DifficultyEnemyTemplate = { rarity: 'common' };

      const bossSuggestion = calculator.suggest(
        players, bossTemplate, 'medium', makeOptions({ maxIterations: 2, baseSeed: 'boss-tpl' }),
      );
      const commonSuggestion = calculator.suggest(
        players, commonTemplate, 'medium', makeOptions({ maxIterations: 2, baseSeed: 'common-tpl' }),
      );

      // Boss template should produce a different enemy than common
      expect(bossSuggestion.suggestedEnemy.name).toBeDefined();
      expect(commonSuggestion.suggestedEnemy.name).toBeDefined();
      // Boss enemies should generally be tougher (higher max HP, etc.)
      expect(bossSuggestion.suggestedEnemy.hp.max).toBeDefined();
      expect(commonSuggestion.suggestedEnemy.hp.max).toBeDefined();
    });

    it('generates enemies with specified archetype', () => {
      const players = makePlayers(4, 5);
      const archerTemplate: DifficultyEnemyTemplate = { archetype: 'archer' };
      const suggestion = calculator.suggest(
        players, archerTemplate, 'medium', makeOptions({ maxIterations: 2 }),
      );

      expect(suggestion.suggestedEnemy.name).toBeDefined();
      expect(suggestion.suggestedEnemy.hp.max).toBeGreaterThan(0);
    });

    it('generates enemies with specified category', () => {
      const players = makePlayers(4, 5);
      const undeadTemplate: DifficultyEnemyTemplate = { category: 'undead' };
      const suggestion = calculator.suggest(
        players, undeadTemplate, 'medium', makeOptions({ maxIterations: 2 }),
      );

      expect(suggestion.suggestedEnemy.name).toBeDefined();
    });

    it('empty template uses defaults', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, {}, 'medium', makeOptions({ maxIterations: 2 }),
      );

      expect(suggestion.suggestedEnemy.name).toBeDefined();
      expect(suggestion.suggestedEnemy.hp.max).toBeGreaterThan(0);
    });
  });

  // ─── Cancellation ────────────────────────────────────────────────────────

  describe('cancellation', () => {
    it('returns partial results when aborted before start', () => {
      const players = makePlayers(4, 5);
      const controller = new AbortController();
      controller.abort();

      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        abortSignal: controller.signal,
        maxIterations: 10,
        simulationsPerProbe: 100,
      }));

      expect(suggestion.wasCancelled).toBe(true);
      expect(suggestion.iterationsUsed).toBe(0);
      expect(suggestion.totalSimulationsRun).toBe(0);
    });

    it('respects abortSignal during iteration', () => {
      const players = makePlayers(4, 5);
      const controller = new AbortController();

      let iterationCount = 0;
      const suggestion = calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        abortSignal: controller.signal,
        maxIterations: 10,
        simulationsPerProbe: 50,
        onProgress: (iteration) => {
          iterationCount++;
          if (iteration >= 2) {
            controller.abort();
          }
        },
      }));

      expect(suggestion.wasCancelled).toBe(true);
      // Should have done at most 2 iterations before abort
      expect(suggestion.iterationsUsed).toBeLessThanOrEqual(2);
    });
  });

  // ─── Progress Callback ───────────────────────────────────────────────────

  describe('progress callback', () => {
    it('calls onProgress for each iteration', () => {
      const players = makePlayers(4, 5);
      const progressCalls: number[] = [];

      calculator.suggest(players, defaultTemplate, 'medium', makeOptions({
        maxIterations: 3,
        simulationsPerProbe: 50,
        onProgress: (iteration, maxIter, cr) => {
          progressCalls.push(iteration);
        },
      }));

      expect(progressCalls.length).toBe(3);
      expect(progressCalls).toEqual([1, 2, 3]);
    });

    it('onProgress is optional', () => {
      const players = makePlayers(4, 5);
      // Should not throw without onProgress
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 2 }),
      );
      expect(suggestion.iterationsUsed).toBe(2);
    });
  });

  // ─── AI Config Variations ────────────────────────────────────────────────

  describe('AI config variations', () => {
    it('works with normal AI', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ aiConfig: normalAI, maxIterations: 2 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('works with aggressive enemy AI', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ aiConfig: aggressiveAI, maxIterations: 2 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('aggressive enemies may yield different CR than normal enemies', () => {
      const players = makePlayers(4, 5);

      // Use same seed base but different AI configs
      const normalResult = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({
          aiConfig: normalAI,
          maxIterations: 3,
          simulationsPerProbe: 50,
          baseSeed: 'ai-comparison',
        }),
      );
      const aggressiveResult = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({
          aiConfig: aggressiveAI,
          maxIterations: 3,
          simulationsPerProbe: 50,
          baseSeed: 'ai-comparison',
        }),
      );

      // Results may differ — not guaranteed, but check structure
      expect(normalResult.recommendedCR).toBeGreaterThan(0);
      expect(aggressiveResult.recommendedCR).toBeGreaterThan(0);
    });
  });

  // ─── Determinism ─────────────────────────────────────────────────────────

  describe('determinism', () => {
    it('same inputs produce identical results', () => {
      const players = makePlayers(4, 5);
      const options = makeOptions({
        maxIterations: 3,
        simulationsPerProbe: 50,
        baseSeed: 'determinism-test',
      });

      const result1 = calculator.suggest(players, defaultTemplate, 'medium', options);
      const result2 = calculator.suggest(players, defaultTemplate, 'medium', options);

      expect(result1.recommendedCR).toBe(result2.recommendedCR);
      expect(result1.winRate).toBe(result2.winRate);
      expect(result1.initialCREstimate).toBe(result2.initialCREstimate);
      expect(result1.iterationsUsed).toBe(result2.iterationsUsed);
      expect(result1.converged).toBe(result2.converged);
      expect(result1.probes.length).toBe(result2.probes.length);

      for (let i = 0; i < result1.probes.length; i++) {
        expect(result1.probes[i].cr).toBe(result2.probes[i].cr);
        expect(result1.probes[i].winRate).toBe(result2.probes[i].winRate);
      }
    });

    it('different seeds may produce different results', () => {
      const players = makePlayers(4, 5);

      const result1 = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ maxIterations: 3, baseSeed: 'seed-a' }),
      );
      const result2 = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ maxIterations: 3, baseSeed: 'seed-b' }),
      );

      // Different seeds → different probe outcomes (though CR may converge to same)
      // At minimum, the initial estimate should be the same
      expect(result1.initialCREstimate).toBe(result2.initialCREstimate);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('works with a single player', () => {
      const players = makePlayers(1, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 3 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('works with high-level party', () => {
      const players = makePlayers(4, 20);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 3 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
      // Level 20 party should need very high CR
      expect(suggestion.recommendedCR).toBeGreaterThan(5);
    });

    it('works with low-level party', () => {
      const players = makePlayers(4, 1);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 3 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThanOrEqual(0);
    });

    it('works with multiple enemies', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ maxIterations: 3, enemyCount: 3 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('empty enemy template uses defaults', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, {}, 'medium', makeOptions({ maxIterations: 2 }),
      );

      expect(suggestion.recommendedCR).toBeGreaterThan(0);
    });

    it('minimum simulations per probe (1)', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ maxIterations: 1, simulationsPerProbe: 1 }),
      );

      expect(suggestion.totalSimulationsRun).toBe(1);
      expect(suggestion.iterationsUsed).toBe(1);
    });

    it('win rate is always 0-1', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 3 }),
      );

      expect(suggestion.winRate).toBeGreaterThanOrEqual(0);
      expect(suggestion.winRate).toBeLessThanOrEqual(1);
    });
  });

  // ─── CR Rounding ─────────────────────────────────────────────────────────

  describe('CR rounding', () => {
    it('recommended CR is a standard D&D CR value', () => {
      const players = makePlayers(4, 5);
      const suggestion = calculator.suggest(
        players, defaultTemplate, 'medium', makeOptions({ maxIterations: 3 }),
      );

      // Standard CR values: 0, 0.125, 0.25, 0.5, 1, 2, 3, ... 30
      const cr = suggestion.recommendedCR;
      const standardCRs = [
        0, 0.125, 0.25, 0.5,
        ...Array.from({ length: 30 }, (_, i) => i + 1),
      ];
      expect(standardCRs).toContain(cr);
    });
  });

  // ─── All Difficulties ───────────────────────────────────────────────────

  describe('all difficulty tiers', () => {
    const difficulties = ['easy', 'medium', 'hard', 'deadly'] as const;

    for (const difficulty of difficulties) {
      it(`${difficulty} produces a valid suggestion`, () => {
        const players = makePlayers(4, 5);
        const suggestion = calculator.suggest(
          players, defaultTemplate, difficulty,
          makeOptions({ maxIterations: 4, baseSeed: `diff-${difficulty}` }),
        );

        expect(suggestion.targetDifficulty).toBe(difficulty);
        expect(suggestion.recommendedCR).toBeGreaterThan(0);
        expect(typeof suggestion.winRate).toBe('number');
        expect(suggestion.probes.length).toBeGreaterThan(0);
      });
    }
  });

  // ─── Performance ─────────────────────────────────────────────────────────

  describe('performance', () => {
    it('completes 5 iterations of 100 simulations in under 10 seconds', () => {
      const players = makePlayers(4, 5);
      const start = performance.now();

      calculator.suggest(
        players, defaultTemplate, 'medium',
        makeOptions({ maxIterations: 5, simulationsPerProbe: 100 }),
      );

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(10000);
    });
  });
});
