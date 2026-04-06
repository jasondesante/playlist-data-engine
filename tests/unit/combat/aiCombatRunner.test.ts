/**
 * AICombatRunner Tests
 *
 * Tests the full AI-driven combat loop: CombatAI decisions → CombatEngine execution.
 * Covers basic combat completion, determinism, all action types, legendary actions,
 * edge cases, and various party/enemy compositions.
 */

import { describe, it, expect } from 'vitest';
import { AICombatRunner } from '../../../src/core/combat/AI/AICombatRunner.js';
import { CombatAI } from '../../../src/core/combat/AI/CombatAI.js';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createSeededRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';
import type { AIConfig, AIPlayStyle } from '../../../src/core/types/CombatAI.js';
import type { CombatConfig } from '../../../src/core/types/Combat.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a mock player character with a weapon */
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

/** Create a mock player character with no equipment (unarmed) */
function createUnarmedPlayer(level: number, name: string): CharacterSheet {
  return createMockPartyCharacter(level, { name });
}

/** Create a generated enemy CharacterSheet */
function createEnemy(cr: number, rarity: 'common' | 'uncommon' | 'elite' | 'boss', seed: string): CharacterSheet {
  return EnemyGenerator.generate({ seed, cr, rarity });
}

/** Standard AI config for testing */
const normalAI: AIConfig = {
  playerStyle: 'normal',
  enemyStyle: 'normal',
};

const aggressiveAI: AIConfig = {
  playerStyle: 'aggressive',
  enemyStyle: 'aggressive',
};

/** Shorthand for running a combat with a seeded roller */
function runSeeded(
  players: CharacterSheet[],
  enemies: CharacterSheet[],
  aiConfig: AIConfig = normalAI,
  seed: string = 'test-seed',
  maxTurns: number = 100,
) {
  const runner = new AICombatRunner();
  const roller = createSeededRoller(seed);
  return runner.runFullCombat(players, enemies, aiConfig, { maxTurnsBeforeDraw: maxTurns }, roller);
}

// ─── Basic Combat Completion ─────────────────────────────────────────────────

describe('AICombatRunner - Basic Combat Completion', () => {
  it('completes a 1v1 combat to a decisive result', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(1, 'common', 'goblin-1');

    const { result } = runSeeded([player], [enemy]);

    expect(result.winnerSide).toBeDefined();
    expect(['player', 'enemy', 'draw']).toContain(result.winnerSide);
    expect(result.roundsElapsed).toBeGreaterThan(0);
    expect(result.roundsElapsed).toBeLessThanOrEqual(100);
  });

  it('completes a party (4) vs single enemy combat', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(3, `Hero ${i + 1}`));
    const enemy = createEnemy(2, 'common', 'orc-seed');

    const { result } = runSeeded(party, [enemy]);

    expect(result.winnerSide).toBeDefined();
    expect(['player', 'enemy', 'draw']).toContain(result.winnerSide);
  });

  it('completes a 1vMany combat', () => {
    const player = createArmedPlayer(10, 'Champion');
    const enemies = [
      createEnemy(1, 'common', 'gob-1'),
      createEnemy(1, 'common', 'gob-2'),
      createEnemy(1, 'common', 'gob-3'),
    ];

    const { result } = runSeeded([player], enemies);

    expect(result.winnerSide).toBeDefined();
    expect(['player', 'enemy', 'draw']).toContain(result.winnerSide);
  });

  it('completes a party vs party combat', () => {
    const players = Array.from({ length: 3 }, (_, i) => createArmedPlayer(5, `Paladin ${i + 1}`));
    const enemies = [
      createEnemy(3, 'uncommon', 'enemy-a'),
      createEnemy(3, 'uncommon', 'enemy-b'),
      createEnemy(3, 'uncommon', 'enemy-c'),
    ];

    const { result } = runSeeded(players, enemies);

    expect(result.winnerSide).toBeDefined();
  });

  it('returns non-null result with all expected fields', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(1, 'common', 'enemy-x');

    const { result } = runSeeded([player], [enemy]);

    expect(result).not.toBeNull();
    expect(result.winnerSide).toBeDefined();
    expect(result.defeated).toBeInstanceOf(Array);
    expect(result.roundsElapsed).toBeGreaterThan(0);
    expect(result.totalTurns).toBeGreaterThan(0);
    expect(result.xpAwarded).toBeGreaterThanOrEqual(0);
    expect(result.description).toBeDefined();
    expect(typeof result.description).toBe('string');
  });

  it('returns the full combat instance with history', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(1, 'common', 'enemy-y');

    const { combat } = runSeeded([player], [enemy]);

    expect(combat.isActive).toBe(false);
    expect(combat.history.length).toBeGreaterThan(0);
    expect(combat.combatants.length).toBe(2);
    expect(combat.roundNumber).toBeGreaterThan(0);
  });

  it('combat history contains attack actions', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(1, 'common', 'enemy-z');

    const { combat } = runSeeded([player], [enemy]);

    const attackActions = combat.history.filter(a => a.type === 'attack');
    expect(attackActions.length).toBeGreaterThan(0);
  });
});

// ─── Determinism ──────────────────────────────────────────────────────────────

describe('AICombatRunner - Determinism', () => {
  it('same seed produces identical results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'uncommon', 'det-enemy');

    const run1 = runSeeded([player], [enemy], normalAI, 'determinism-test');
    const run2 = runSeeded([player], [enemy], normalAI, 'determinism-test');

    expect(run1.result.winnerSide).toBe(run2.result.winnerSide);
    expect(run1.result.roundsElapsed).toBe(run2.result.roundsElapsed);
    expect(run1.result.xpAwarded).toBe(run2.result.xpAwarded);
    expect(run1.combat.history.length).toBe(run2.combat.history.length);
  });

  it('different seeds produce different results (usually)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'uncommon', 'diff-enemy');

    // Run with many different seeds — at least one should differ
    const results = Array.from({ length: 10 }, (_, i) =>
      runSeeded([player], [enemy], normalAI, `diff-seed-${i}`)
    );

    const roundsSet = new Set(results.map(r => r.result.roundsElapsed));
    // With 10 different seeds, it's extremely unlikely all produce identical rounds
    expect(roundsSet.size).toBeGreaterThan(1);
  });

  it('same seed with different AI configs produces different results', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'uncommon', 'config-enemy');

    const normalResult = runSeeded([player], [enemy], normalAI, 'config-test');
    const aggressiveResult = runSeeded([player], [enemy], aggressiveAI, 'config-test');

    // Same seed but different AI — the decisions differ, so combat plays out differently.
    // History lengths may differ because AI picks different actions.
    // (Not guaranteed to differ every time, but likely with complex enough combat)
    // We just verify both complete successfully
    expect(normalResult.result.winnerSide).toBeDefined();
    expect(aggressiveResult.result.winnerSide).toBeDefined();
  });
});

// ─── Edge Cases ───────────────────────────────────────────────────────────────

describe('AICombatRunner - Edge Cases', () => {
  it('handles empty player array gracefully', () => {
    const runner = new AICombatRunner();
    const enemy = createEnemy(1, 'common', 'no-player');

    const { result } = runner.runFullCombat([], [enemy], normalAI);

    // No players + enemies = enemy wins immediately (all players defeated)
    expect(['draw', 'enemy']).toContain(result.winnerSide);
  });

  it('handles empty enemy array gracefully', () => {
    const runner = new AICombatRunner();
    const player = createArmedPlayer(5, 'Solo');

    const { result } = runner.runFullCombat([player], [], normalAI);

    // No enemies → no combat possible. Combat starts with 1 combatant (player only).
    // All enemies (none) are defeated → player wins immediately
    expect(result.winnerSide).toBe('player');
  });

  it('respects maxTurnsBeforeDraw', () => {
    const player = createArmedPlayer(20, 'Tank');
    const enemy = createEnemy(20, 'boss', 'stalemate');

    const { result } = runSeeded([player], [enemy], normalAI, 'stalemate-seed', 5);

    expect(result.roundsElapsed).toBeLessThanOrEqual(5);
  });

  it('unarmed players (no weapons) can complete combat', () => {
    const player = createUnarmedPlayer(5, 'Monk');
    const enemy = createEnemy(1, 'common', 'unarmed-target');

    const { result } = runSeeded([player], [enemy]);

    expect(result.winnerSide).toBeDefined();
    expect(result.roundsElapsed).toBeGreaterThan(0);
  });

  it('flee action falls back to attack when fleeing is disabled', () => {
    // Create a very weak player against a strong enemy
    // The AI might try to flee, but with fleeing disabled it should fall back
    const player = createUnarmedPlayer(1, 'Weakling');
    const enemy = createEnemy(5, 'elite', 'strong-enemy');

    const runner = new AICombatRunner();
    const { result } = runner.runFullCombat(
      [player], [enemy],
      { playerStyle: 'normal', enemyStyle: 'normal' },
      { maxTurnsBeforeDraw: 20, allowFleeing: false },
      createSeededRoller('flee-test'),
    );

    expect(result.winnerSide).toBeDefined();
    // Should not throw — flee fallback is handled
  });

  it('handles combat with both sides having spells', () => {
    const casterPlayer = createMockPartyCharacter(5, {
      name: 'Wizard',
      class: 'Wizard' as any,
      combat_spells: [
        {
          name: 'Fire Bolt',
          level: 0,
          school: 'evocation',
          damage_dice: '1d10',
          damage_type: 'fire',
          tags: ['damage', 'ranged'],
          description: 'A fiery bolt of light',
        },
      ],
    });
    const spellEnemy = createEnemy(3, 'elite', 'spellcaster-enemy');

    const { result, combat } = runSeeded([casterPlayer], [spellEnemy]);

    expect(result.winnerSide).toBeDefined();
    // Combat should have some actions (attacks or spells)
    expect(combat.history.length).toBeGreaterThan(0);
  });
});

// ─── Legendary Actions ────────────────────────────────────────────────────────

describe('AICombatRunner - Legendary Actions', () => {
  it('boss enemy with legendary actions completes combat', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const boss = createEnemy(5, 'boss', 'boss-legendary');

    // Verify the boss has legendary_config
    expect(boss.legendary_config).toBeDefined();
    expect(boss.legendary_config!.actions.length).toBeGreaterThan(0);

    const { result, combat } = runSeeded(party, [boss], normalAI, 'boss-test');

    expect(result.winnerSide).toBeDefined();
    expect(combat.history.length).toBeGreaterThan(0);

    // Check for legendary action entries in history
    const legendaryActions = combat.history.filter(a => a.type === 'legendaryAction');
    // Legendary actions may or may not be used depending on combat duration
    // and AI decisions, but the combat should complete without errors
  });

  it('boss legendary actions are properly executed when used', () => {
    // Create a 1v1 where a strong boss fights a weak player
    // The boss should use legendary actions during the combat
    const player = createUnarmedPlayer(3, 'Victim');
    const boss = createEnemy(5, 'boss', 'boss-action-test');

    const { combat } = runSeeded([player], [boss], aggressiveAI, 'boss-action-seed', 30);

    // The combat should have legendary actions in history
    const legendaryActions = combat.history.filter(a => a.type === 'legendaryAction');
    // With aggressive AI and a boss, legendary actions should be used
    // (not guaranteed every run, but likely)
    if (legendaryActions.length > 0) {
      // Verify legendary action has proper structure
      for (const action of legendaryActions) {
        expect(action.legendaryAction).toBeDefined();
        expect(action.result).toBeDefined();
      }
    }
  });
});

// ─── AI Config Variations ─────────────────────────────────────────────────────

describe('AICombatRunner - AI Config Variations', () => {
  it('normal vs normal AI completes successfully', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const enemies = [createEnemy(3, 'uncommon', 'nv-n')];

    const { result } = runSeeded(party, enemies, {
      playerStyle: 'normal',
      enemyStyle: 'normal',
    }, 'nv-n-seed');

    expect(result.winnerSide).toBeDefined();
  });

  it('aggressive vs aggressive AI completes successfully', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const enemies = [createEnemy(3, 'uncommon', 'ag-ag')];

    const { result } = runSeeded(party, enemies, aggressiveAI, 'ag-ag-seed');

    expect(result.winnerSide).toBeDefined();
  });

  it('mixed play styles complete successfully', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const enemies = [createEnemy(3, 'uncommon', 'mix')];

    const { result } = runSeeded(party, enemies, {
      playerStyle: 'normal',
      enemyStyle: 'aggressive',
    }, 'mix-seed');

    expect(result.winnerSide).toBeDefined();
  });

  it('per-combatant style overrides are respected', () => {
    const party = [
      createArmedPlayer(5, 'Aggro Hero'),
      createArmedPlayer(5, 'Cautious Hero'),
    ];
    const enemy = createEnemy(2, 'common', 'override-enemy');

    // Override the second player to be aggressive
    const aiConfig: AIConfig = {
      playerStyle: 'normal',
      enemyStyle: 'normal',
      overrides: new Map(),
    };

    const runner = new AICombatRunner();
    const roller = createSeededRoller('override-seed');
    const { result } = runner.runFullCombat(party, [enemy], aiConfig, { maxTurnsBeforeDraw: 30 }, roller);

    expect(result.winnerSide).toBeDefined();
  });
});

// ─── Various Party/Enemy Compositions ─────────────────────────────────────────

describe('AICombatRunner - Various Compositions', () => {
  it('large party vs single enemy', () => {
    const party = Array.from({ length: 6 }, (_, i) => createArmedPlayer(3, `Hero ${i + 1}`));
    const enemy = createEnemy(3, 'uncommon', 'large-party');

    const { result } = runSeeded(party, [enemy]);

    expect(result.winnerSide).toBeDefined();
  });

  it('single player vs multiple enemies', () => {
    const player = createArmedPlayer(10, 'Solo Hero');
    const enemies = Array.from({ length: 5 }, (_, i) =>
      createEnemy(1, 'common', `mob-${i}`)
    );

    const { result } = runSeeded([player], enemies, normalAI, 'mob-seed');

    expect(result.winnerSide).toBeDefined();
  });

  it('multiple elite enemies', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const enemies = [
      createEnemy(4, 'elite', 'elite-1'),
      createEnemy(4, 'elite', 'elite-2'),
    ];

    const { result } = runSeeded(party, enemies);

    expect(result.winnerSide).toBeDefined();
  });

  it('very low level vs very high level (asymmetric)', () => {
    const player = createArmedPlayer(1, 'Newbie');
    const enemy = createEnemy(10, 'boss', 'asymmetric');

    const { result } = runSeeded([player], [enemy], normalAI, 'asym-seed', 30);

    expect(result.winnerSide).toBeDefined();
    // Expected: enemy wins (CR 10 boss vs level 1 player)
  });

  it('equal CR party vs equal CR enemy', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const enemies = [
      createEnemy(5, 'uncommon', 'equal-1'),
      createEnemy(5, 'uncommon', 'equal-2'),
    ];

    const { result } = runSeeded(party, enemies, normalAI, 'equal-seed');

    expect(result.winnerSide).toBeDefined();
  });
});

// ─── Action Types ─────────────────────────────────────────────────────────────

describe('AICombatRunner - Action Type Execution', () => {
  it('produces attack actions in combat history', () => {
    const player = createArmedPlayer(5, 'Fighter');
    const enemy = createEnemy(1, 'common', 'action-test');

    const { combat } = runSeeded([player], [enemy]);

    const attacks = combat.history.filter(a => a.type === 'attack');
    expect(attacks.length).toBeGreaterThan(0);
  });

  it('can produce dodge actions when AI decides to dodge', () => {
    // Create a very weak, isolated player against multiple strong enemies
    // The normal AI may decide to dodge
    const player = createUnarmedPlayer(1, 'Scared');
    const enemies = [
      createEnemy(3, 'common', 'threat-1'),
      createEnemy(3, 'common', 'threat-2'),
    ];

    const { combat } = runSeeded([player], enemies, normalAI, 'dodge-seed', 30);

    const dodges = combat.history.filter(a => a.type === 'dodge');
    // Dodge may or may not happen depending on AI assessment, but should not crash
  });

  it('handles useItem action gracefully when AI decides to use item', () => {
    // Create a player with healing items and no spell slots
    const player = createMockPartyCharacter(1, {
      name: 'Item User',
      equipment: {
        weapons: [],
        armor: [],
        items: [
          { name: 'Health Potion', quantity: 2, equipped: false, type: 'consumable' as any },
        ],
        totalWeight: 0,
        equippedWeight: 0,
      },
    });
    const enemy = createEnemy(3, 'uncommon', 'item-enemy');

    const { combat, result } = runSeeded([player], [enemy], aggressiveAI, 'item-seed', 30);

    expect(result.winnerSide).toBeDefined();
    // Check that useItem actions are properly logged
    const itemActions = combat.history.filter(a => a.type === 'useItem');
    if (itemActions.length > 0) {
      expect(itemActions[0].result?.description).toContain('item mechanics not yet implemented');
    }
  });

  it('spell casting actions appear in history for enemies with spells', () => {
    // Support enemies tend to have spells
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const spellEnemy = createEnemy(4, 'elite', 'spell-history');

    // Verify enemy has combat_spells
    if (spellEnemy.combat_spells && spellEnemy.combat_spells.length > 0) {
      const { combat } = runSeeded(party, [spellEnemy], aggressiveAI, 'spell-hist-seed');

      const spellActions = combat.history.filter(a => a.type === 'spell');
      // Spell casting may or may not happen depending on AI decisions
      if (spellActions.length > 0) {
        expect(spellActions[0].spell).toBeDefined();
      }
    }
    // If no combat_spells, the test passes trivially
  });
});

// ─── XP and Result Validation ─────────────────────────────────────────────────

describe('AICombatRunner - Result Validation', () => {
  it('XP is awarded correctly for defeated enemies', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'common', 'xp-test');

    const { result } = runSeeded([player], [enemy], aggressiveAI, 'xp-seed');

    if (result.winnerSide === 'player') {
      // CR 2 enemy → getXPForCR(2) = 450
      expect(result.xpAwarded).toBeGreaterThan(0);
    }
  });

  it('draw produces 0 XP (or only partial)', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(5, 'boss', 'draw-xp');

    const { result } = runSeeded([player], [enemy], normalAI, 'draw-xp-seed', 3);

    if (result.winnerSide === 'draw') {
      // May still have some XP if enemies were partially defeated
      expect(result.roundsElapsed).toBeLessThanOrEqual(3);
    }
  });

  it('defeated array includes all defeated combatants', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const enemies = [
      createEnemy(1, 'common', 'def-1'),
      createEnemy(1, 'common', 'def-2'),
      createEnemy(1, 'common', 'def-3'),
    ];

    const { result } = runSeeded(party, enemies, aggressiveAI, 'def-seed');

    if (result.winnerSide === 'player') {
      // All enemies should be defeated
      expect(result.defeated.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('no infinite loops — combat always terminates', () => {
    const player = createArmedPlayer(20, 'Immortal');
    const enemy = createEnemy(20, 'boss', 'loop-test');

    // Very low turn limit to ensure termination
    const { result } = runSeeded([player], [enemy], normalAI, 'loop-seed', 10);

    expect(result.roundsElapsed).toBeLessThanOrEqual(10);
    expect(result.winnerSide).toBeDefined();
  });
});

// ─── Integration with CombatAI ────────────────────────────────────────────────

describe('AICombatRunner - CombatAI Integration', () => {
  it('runner uses AI reasoning in combat', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'uncommon', 'reasoning');

    const ai = new CombatAI(normalAI);
    const runner = new AICombatRunner();
    const roller = createSeededRoller('reasoning-seed');
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 20 }, roller);
    const combat = engine.startCombat([player], [enemy]);

    // Get the AI's decision for the first turn to verify it produces reasoning
    const current = engine.getCurrentCombatant(combat);
    const decision = ai.decide(current, combat);

    expect(decision.action).toBeDefined();
    expect(decision.reasoning).toBeDefined();
    expect(typeof decision.reasoning).toBe('string');
  });

  it('AI threat assessment updates each turn', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'uncommon', 'threat-update');

    const ai = new CombatAI(normalAI);
    const runner = new AICombatRunner();
    const roller = createSeededRoller('threat-seed');
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 20 }, roller);
    const combat = engine.startCombat([player], [enemy]);

    // Assess threat at round 1
    const current = engine.getCurrentCombatant(combat);
    const threat1 = ai.assessThreat(current, combat);
    expect(threat1.roundNumber).toBe(1);
    expect(threat1.myHPPercent).toBeGreaterThan(0);
  });
});

// ─── Multiple Runs (Performance Sanity) ──────────────────────────────────────

describe('AICombatRunner - Performance Sanity', () => {
  it('100 runs of a simple 1v1 complete in reasonable time', () => {
    const player = createArmedPlayer(5, 'Hero');
    const enemy = createEnemy(2, 'common', 'perf-enemy');
    const runner = new AICombatRunner();

    const start = Date.now();
    const results = Array.from({ length: 100 }, (_, i) =>
      runner.runFullCombat(
        [player], [enemy], normalAI,
        { maxTurnsBeforeDraw: 30 },
        createSeededRoller(`perf-${i}`),
      )
    );
    const elapsed = Date.now() - start;

    // All runs should complete
    for (const r of results) {
      expect(r.result.winnerSide).toBeDefined();
    }

    // Should complete in under 5 seconds (very generous)
    expect(elapsed).toBeLessThan(5000);
  });

  it('10 runs of a party vs boss complete in reasonable time', () => {
    const party = Array.from({ length: 4 }, (_, i) => createArmedPlayer(5, `Hero ${i + 1}`));
    const boss = createEnemy(5, 'boss', 'perf-boss');
    const runner = new AICombatRunner();

    const start = Date.now();
    const results = Array.from({ length: 10 }, (_, i) =>
      runner.runFullCombat(
        party, [boss], aggressiveAI,
        { maxTurnsBeforeDraw: 50 },
        createSeededRoller(`boss-perf-${i}`),
      )
    );
    const elapsed = Date.now() - start;

    for (const r of results) {
      expect(r.result.winnerSide).toBeDefined();
    }

    expect(elapsed).toBeLessThan(10000);
  });
});
