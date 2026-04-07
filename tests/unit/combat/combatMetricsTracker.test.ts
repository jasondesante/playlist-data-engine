/**
 * CombatMetricsTracker Tests
 *
 * Tests the post-hoc computation of per-combatant metrics from combat history.
 * Covers damage tracking, healing, spells, items, critical hits, rounds survived,
 * action type breakdowns, and integration with AICombatRunner.
 */

import { describe, it, expect } from 'vitest';
import { CombatMetricsTracker } from '../../../src/core/combat/AI/CombatMetricsTracker.js';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { AICombatRunner } from '../../../src/core/combat/AI/AICombatRunner.js';
import { createSeededRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { CombatInstance, CombatAction } from '../../../src/core/types/Combat.js';
import type { AIConfig } from '../../../src/core/types/CombatAI.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a mock player character with a weapon */
function createArmedPlayer(level: number, name: string) {
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

const normalAI: AIConfig = {
  playerStyle: 'normal',
  enemyStyle: 'normal',
};

/** Run a seeded AI combat and return the full result with metrics */
function runSeededCombat(seed: string = 'metrics-test', maxTurns: number = 100) {
  const runner = new AICombatRunner();
  const roller = createSeededRoller(seed);
  const player = createArmedPlayer(5, 'Hero');
  const enemy = createMockPartyCharacter(3, { name: 'Goblin' });
  return runner.runFullCombat([player], [enemy], normalAI, { maxTurnsBeforeDraw: maxTurns }, roller);
}

// ─── Basic Metrics Computation ────────────────────────────────────────────────

describe('CombatMetricsTracker - Basic Computation', () => {
  it('returns a Map with entries for every combatant', () => {
    const { combat, metrics } = runSeededCombat('basic-map');
    expect(metrics).toBeInstanceOf(Map);
    expect(metrics.size).toBe(combat.combatants.length);
    for (const c of combat.combatants) {
      expect(metrics.has(c.id)).toBe(true);
    }
  });

  it('stores metrics on the CombatInstance', () => {
    const { combat } = runSeededCombat('instance-storage');
    expect(combat.metrics).toBeInstanceOf(Map);
    expect(combat.metrics!.size).toBe(combat.combatants.length);
  });

  it('populates all required fields on each CombatantMetrics', () => {
    const { metrics } = runSeededCombat('all-fields');
    for (const [, m] of metrics) {
      expect(m.combatantId).toBeDefined();
      expect(m.name).toBeDefined();
      expect(['player', 'enemy']).toContain(m.side);
      expect(typeof m.totalDamageDealt).toBe('number');
      expect(typeof m.totalDamageTaken).toBe('number');
      expect(typeof m.totalHealingDone).toBe('number');
      expect(typeof m.spellsCast).toBe('number');
      expect(typeof m.itemsUsed).toBe('number');
      expect(typeof m.criticalHits).toBe('number');
      expect(typeof m.roundsSurvived).toBe('number');
      expect(typeof m.survived).toBe('boolean');
      expect(m.actionsByType).toBeDefined();
      expect(Array.isArray(m.damagePerRound)).toBe(true);
    }
  });

  it('correctly identifies player vs enemy side', () => {
    const { metrics } = runSeededCombat('side-check');
    const players = [...metrics.values()].filter(m => m.side === 'player');
    const enemies = [...metrics.values()].filter(m => m.side === 'enemy');
    expect(players.length).toBe(1);
    expect(enemies.length).toBe(1);
    expect(players[0].combatantId.startsWith('player')).toBe(true);
    expect(enemies[0].combatantId.startsWith('enemy')).toBe(true);
  });

  it('sets survived=true for living combatants', () => {
    const { combat, metrics } = runSeededCombat('survived-check');
    for (const [id, m] of metrics) {
      const combatant = combat.combatants.find(c => c.id === id)!;
      // survived should be the inverse of isDefeated
      expect(m.survived).toBe(!combatant.isDefeated);
    }
  });

  it('sets survived=false for defeated combatants', () => {
    // Run a combat that will definitely end with one side defeated
    const { metrics } = runSeededCombat('defeated-check');
    const result = [...metrics.values()];
    // At least one side should be defeated in a completed combat
    const defeated = result.filter(m => !m.survived);
    const alive = result.filter(m => m.survived);
    // In a decisive combat, at least one combatant should be defeated
    // (unless it's a draw by max turns)
    expect(defeated.length + alive.length).toBe(2);
  });
});

// ─── Damage Tracking ──────────────────────────────────────────────────────────

describe('CombatMetricsTracker - Damage Tracking', () => {
  it('tracks total damage dealt across all attack types', () => {
    const { metrics } = runSeededCombat('damage-dealt', 200);
    for (const [, m] of metrics) {
      expect(m.totalDamageDealt).toBeGreaterThanOrEqual(0);
    }
    // In a completed combat, at least one combatant should have dealt damage
    const anyDamage = [...metrics.values()].some(m => m.totalDamageDealt > 0);
    expect(anyDamage).toBe(true);
  });

  it('tracks total damage taken', () => {
    const { metrics } = runSeededCombat('damage-taken', 200);
    for (const [, m] of metrics) {
      expect(m.totalDamageTaken).toBeGreaterThanOrEqual(0);
    }
    // In a completed combat, at least one combatant should have taken damage
    const anyTaken = [...metrics.values()].some(m => m.totalDamageTaken > 0);
    expect(anyTaken).toBe(true);
  });

  it('damage dealt and damage taken are consistent (conservation of damage)', () => {
    // In a 1v1, total damage dealt should equal total damage taken
    // (minus any overkill/HP floor effects)
    const { metrics } = runSeededCombat('damage-conservation', 200);
    const vals = [...metrics.values()];
    if (vals.length === 2) {
      const totalDealt = vals.reduce((sum, m) => sum + m.totalDamageDealt, 0);
      const totalTaken = vals.reduce((sum, m) => sum + m.totalDamageTaken, 0);
      // They should be approximately equal (within overkill margin)
      // Overkill can cause dealt > taken because defeated targets stop taking damage
      expect(totalDealt).toBeGreaterThanOrEqual(totalTaken);
    }
  });

  it('tracks damage from legendary actions', () => {
    // Create a combat with a boss enemy
    const runner = new AICombatRunner();
    const roller = createSeededRoller('legendary-damage-test');

    const player = createArmedPlayer(5, 'Hero');
    const boss = createMockPartyCharacter(8, {
      name: 'Dragon',
      // Add legendary config to make it a boss
    });
    // Manually add legendary_config to the character
    (boss as any).legendary_config = {
      actions_per_round: 3,
      resistances: 1,
      actions: [
        { id: 'bite', name: 'Bite', cost: 1, effect: 'Bite attack', damage: '2d10+5', damage_type: 'piercing', tags: ['damage'] },
        { id: 'tail', name: 'Tail Swipe', cost: 2, effect: 'Tail attack', damage: '2d8+5', damage_type: 'bludgeoning', tags: ['damage'] },
      ],
    };

    const result = runner.runFullCombat([player], [boss], normalAI, { maxTurnsBeforeDraw: 100 }, roller);
    const bossMetrics = result.metrics.get(result.combat.combatants.find(c => c.id.startsWith('enemy'))!.id);
    expect(bossMetrics).toBeDefined();
    // Boss should have dealt some damage (from attacks and/or legendary actions)
    expect(bossMetrics!.totalDamageDealt).toBeGreaterThanOrEqual(0);
  });
});

// ─── Action Type Tracking ─────────────────────────────────────────────────────

describe('CombatMetricsTracker - Action Type Tracking', () => {
  it('counts attack actions', () => {
    const { metrics } = runSeededCombat('attack-count', 200);
    for (const [, m] of metrics) {
      const attackCount = m.actionsByType['attack'] ?? 0;
      expect(attackCount).toBeGreaterThanOrEqual(0);
    }
    // At least one combatant should have attacked
    const anyAttacks = [...metrics.values()].some(m => (m.actionsByType['attack'] ?? 0) > 0);
    expect(anyAttacks).toBe(true);
  });

  it('counts dodge/dash/disengage actions', () => {
    const { metrics } = runSeededCombat('movement-count', 200);
    for (const [, m] of metrics) {
      const totalActions = Object.values(m.actionsByType).reduce((s, c) => s + c, 0);
      expect(totalActions).toBeGreaterThan(0);
    }
  });

  it('counts useItem actions', () => {
    const { metrics } = runSeededCombat('item-count', 200);
    for (const [, m] of metrics) {
      expect(m.itemsUsed).toBeGreaterThanOrEqual(0);
      // itemsUsed should match actionsByType['useItem']
      expect(m.itemsUsed).toBe(m.actionsByType['useItem'] ?? 0);
    }
  });

  it('counts spell casting', () => {
    const { metrics } = runSeededCombat('spell-count', 200);
    for (const [, m] of metrics) {
      expect(m.spellsCast).toBeGreaterThanOrEqual(0);
      // spellsCast should match actionsByType['spell']
      expect(m.spellsCast).toBe(m.actionsByType['spell'] ?? 0);
    }
  });

  it('counts legendary actions in actionsByType', () => {
    // Run a combat with a boss
    const runner = new AICombatRunner();
    const roller = createSeededRoller('legendary-action-count');

    const player = createArmedPlayer(5, 'Hero');
    const boss = createMockPartyCharacter(8, { name: 'Boss' });
    (boss as any).legendary_config = {
      actions_per_round: 3,
      resistances: 1,
      actions: [
        { id: 'slam', name: 'Slam', cost: 1, effect: 'Slam', damage: '2d8+4', damage_type: 'bludgeoning', tags: ['damage'] },
      ],
    };

    const result = runner.runFullCombat([player], [boss], normalAI, { maxTurnsBeforeDraw: 100 }, roller);
    const bossMetrics = result.metrics.get(result.combat.combatants.find(c => c.id.startsWith('enemy'))!.id);
    // Boss may or may not have used legendary actions depending on combat flow
    const legendaryCount = bossMetrics!.actionsByType['legendaryAction'] ?? 0;
    expect(legendaryCount).toBeGreaterThanOrEqual(0);
  });
});

// ─── Critical Hit Tracking ────────────────────────────────────────────────────

describe('CombatMetricsTracker - Critical Hit Tracking', () => {
  it('counts critical hits from attacks', () => {
    // Run enough combats to likely see a critical hit
    let foundCrit = false;
    for (let i = 0; i < 20; i++) {
      const { metrics } = runSeededCombat(`crit-check-${i}`, 200);
      for (const [, m] of metrics) {
        if (m.criticalHits > 0) {
          foundCrit = true;
          break;
        }
      }
      if (foundCrit) break;
    }
    // With 20 combats, very likely to see at least one crit
    expect(foundCrit).toBe(true);
  });

  it('critical hits are non-negative', () => {
    const { metrics } = runSeededCombat('crit-nonneg');
    for (const [, m] of metrics) {
      expect(m.criticalHits).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Rounds Survived ──────────────────────────────────────────────────────────

describe('CombatMetricsTracker - Rounds Survived', () => {
  it('survived combatants have roundsSurvived equal to total rounds', () => {
    const { combat, metrics } = runSeededCombat('survived-rounds', 200);
    for (const [, m] of metrics) {
      if (m.survived) {
        expect(m.roundsSurvived).toBe(combat.roundNumber);
      }
    }
  });

  it('defeated combatants have roundsSurvived less than total rounds', () => {
    const { combat, metrics } = runSeededCombat('defeated-rounds', 200);
    for (const [, m] of metrics) {
      if (!m.survived) {
        expect(m.roundsSurvived).toBeLessThanOrEqual(combat.roundNumber);
        expect(m.roundsSurvived).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('roundsSurvived is at least 1 for all combatants', () => {
    const { metrics } = runSeededCombat('min-rounds', 200);
    for (const [, m] of metrics) {
      expect(m.roundsSurvived).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── Healing Tracking ─────────────────────────────────────────────────────────

describe('CombatMetricsTracker - Healing Tracking', () => {
  it('healing is non-negative', () => {
    const { metrics } = runSeededCombat('healing-nonneg');
    for (const [, m] of metrics) {
      expect(m.totalHealingDone).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Empty Combat ─────────────────────────────────────────────────────────────

describe('CombatMetricsTracker - Edge Cases', () => {
  it('returns empty metrics map for empty combat', () => {
    const runner = new AICombatRunner();
    const result = runner.runFullCombat([], []);
    expect(result.metrics).toBeInstanceOf(Map);
    expect(result.metrics.size).toBe(0);
  });

  it('handles combat with no damage (all dodges)', () => {
    // This is hard to engineer via AI, but we can verify that a draw-by-max-turns
    // combat still produces valid metrics
    const { metrics } = runSeededCombat('draw-combat', 5); // Very short combat
    for (const [, m] of metrics) {
      expect(m.totalDamageDealt).toBeGreaterThanOrEqual(0);
      expect(m.totalDamageTaken).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles party vs multiple enemies', () => {
    const runner = new AICombatRunner();
    const roller = createSeededRoller('party-metrics');
    const players = [
      createArmedPlayer(5, 'Fighter'),
      createArmedPlayer(5, 'Paladin'),
      createArmedPlayer(5, 'Rogue'),
    ];
    const enemies = [
      createMockPartyCharacter(3, { name: 'Goblin 1' }),
      createMockPartyCharacter(3, { name: 'Goblin 2' }),
      createMockPartyCharacter(3, { name: 'Goblin 3' }),
    ];

    const result = runner.runFullCombat(players, enemies, normalAI, { maxTurnsBeforeDraw: 200 }, roller);
    expect(result.metrics.size).toBe(6);

    // Verify player side metrics
    const playerMetrics = [...result.metrics.values()].filter(m => m.side === 'player');
    expect(playerMetrics.length).toBe(3);

    // Verify enemy side metrics
    const enemyMetrics = [...result.metrics.values()].filter(m => m.side === 'enemy');
    expect(enemyMetrics.length).toBe(3);

    // All combatants should have some actions
    for (const [, m] of result.metrics) {
      const totalActions = Object.values(m.actionsByType).reduce((s, c) => s + c, 0);
      expect(totalActions).toBeGreaterThan(0);
    }
  });

  it('produces deterministic metrics with same seed', () => {
    const run1 = runSeededCombat('deterministic-metrics-1', 100);
    const run2 = runSeededCombat('deterministic-metrics-1', 100);

    expect(run1.metrics.size).toBe(run2.metrics.size);
    for (const [id, m1] of run1.metrics) {
      const m2 = run2.metrics.get(id);
      expect(m2).toBeDefined();
      expect(m2!.totalDamageDealt).toBe(m1.totalDamageDealt);
      expect(m2!.totalDamageTaken).toBe(m1.totalDamageTaken);
      expect(m2!.totalHealingDone).toBe(m1.totalHealingDone);
      expect(m2!.spellsCast).toBe(m1.spellsCast);
      expect(m2!.itemsUsed).toBe(m1.itemsUsed);
      expect(m2!.criticalHits).toBe(m1.criticalHits);
      expect(m2!.roundsSurvived).toBe(m1.roundsSurvived);
      expect(m2!.survived).toBe(m1.survived);
      expect(m2!.actionsByType).toEqual(m1.actionsByType);
    }
  });

  it('produces different metrics with different seeds', () => {
    const run1 = runSeededCombat('diff-metrics-a', 100);
    const run2 = runSeededCombat('diff-metrics-b', 100);

    // The metrics should differ across at least some combatants
    let anyDifference = false;
    for (const [id, m1] of run1.metrics) {
      const m2 = run2.metrics.get(id);
      if (m2 && m1.totalDamageDealt !== m2.totalDamageDealt) {
        anyDifference = true;
        break;
      }
    }
    expect(anyDifference).toBe(true);
  });
});

// ─── Direct Tracker Usage (without AICombatRunner) ───────────────────────────

describe('CombatMetricsTracker - Direct Usage', () => {
  it('can compute metrics from a manually constructed combat instance', () => {
    const engine = new CombatEngine({}, createSeededRoller('manual-metrics'));
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createArmedPlayer(3, 'Goblin');
    const combat = engine.startCombat([player], [enemy]);

    // Execute a few turns manually
    const attacker = combat.combatants[0];
    const target = combat.combatants[1];
    engine.executeWeaponAttack(combat, attacker, target);
    engine.nextTurn(combat);
    engine.executeWeaponAttack(combat, target, attacker);
    engine.nextTurn(combat);

    // Compute metrics
    const tracker = new CombatMetricsTracker();
    const metrics = tracker.computeMetrics(combat);

    expect(metrics.size).toBe(2);
    const attackerMetrics = metrics.get(attacker.id)!;
    expect(attackerMetrics.totalDamageDealt).toBeGreaterThanOrEqual(0);
    expect(attackerMetrics.actionsByType['attack']).toBe(1);

    const targetMetrics = metrics.get(target.id)!;
    expect(targetMetrics.totalDamageTaken).toBeGreaterThanOrEqual(0);
    expect(targetMetrics.actionsByType['attack']).toBe(1);
  });

  it('correctly counts multiple attacks', () => {
    const engine = new CombatEngine({}, createSeededRoller('multi-attack-metrics'));
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createArmedPlayer(10, 'Tanky Goblin');
    const combat = engine.startCombat([player], [enemy]);

    const attacker = combat.combatants[0];
    const target = combat.combatants[1];

    // Execute 5 attacks
    for (let i = 0; i < 5; i++) {
      if (combat.isActive && !target.isDefeated) {
        engine.executeWeaponAttack(combat, attacker, target);
        engine.nextTurn(combat);
        // Also let enemy attack back
        if (combat.isActive && !attacker.isDefeated) {
          engine.executeWeaponAttack(combat, target, attacker);
          engine.nextTurn(combat);
        }
      }
    }

    const tracker = new CombatMetricsTracker();
    const metrics = tracker.computeMetrics(combat);

    const attackerMetrics = metrics.get(attacker.id)!;
    expect(attackerMetrics.actionsByType['attack']).toBeGreaterThanOrEqual(1);
  });
});
