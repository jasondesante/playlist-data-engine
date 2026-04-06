/**
 * Winner Side Logic & XP Calculation Tests (Task 1.5.3)
 *
 * Comprehensive tests for:
 * - winnerSide determination across all edge cases
 * - XP calculation using getXPForCR for various CR values
 * - XP fallback to level when cr is undefined
 * - Mixed CR encounters
 * - Partial kill scenarios
 * - Full combat integration
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createSeededRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import { getXPForCR } from '../../../src/constants/EncounterBalance.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create an enemy character with a specific CR for XP testing.
 */
function createEnemy(cr: number, name: string): CharacterSheet {
  return createMockPartyCharacter(Math.round(cr), { name, cr });
}

/**
 * Create an enemy character without a CR field (falls back to level).
 */
function createEnemyNoCR(level: number, name: string): CharacterSheet {
  // cr is not set — XP should fall back to level
  const char = createMockPartyCharacter(level, { name });
  // Explicitly delete cr if it was set by the helper
  delete (char as any).cr;
  return char;
}

/**
 * Helper: start a combat, defeat specified enemies, end combat, and return result.
 */
function defeatEnemiesAndEnd(
  engine: CombatEngine,
  combat: Awaited<ReturnType<CombatEngine['startCombat']>>,
  enemyIndices: number[]
) {
  const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
  for (const idx of enemyIndices) {
    enemies[idx].isDefeated = true;
    enemies[idx].currentHP = 0;
  }
  engine.nextTurn(combat);
  return engine.getCombatResult(combat);
}

/**
 * Helper: start a combat, defeat specified players, end combat, and return result.
 */
function defeatPlayersAndEnd(
  engine: CombatEngine,
  combat: Awaited<ReturnType<CombatEngine['startCombat']>>,
  playerIndices: number[]
) {
  const players = combat.combatants.filter(c => c.id.startsWith('player'));
  for (const idx of playerIndices) {
    players[idx].isDefeated = true;
    players[idx].currentHP = 0;
  }
  engine.nextTurn(combat);
  return engine.getCombatResult(combat);
}

/**
 * Helper: force a draw via max turns.
 */
function forceMaxTurnsDraw(
  engine: CombatEngine,
  combat: Awaited<ReturnType<CombatEngine['startCombat']>>
) {
  // Add enough history entries to hit maxTurnsBeforeDraw
  const maxTurns = 1; // engine created with maxTurnsBeforeDraw: 1
  while (combat.history.length < maxTurns) {
    combat.history.push({
      type: 'dodge' as any,
      actor: combat.combatants[0],
      result: { success: true, description: 'dodge' },
    });
  }
  engine.nextTurn(combat);
  return engine.getCombatResult(combat);
}

// ─── Winner Side: Active Combat ────────────────────────────────────────────

describe('Winner side — active combat state', () => {
  it('winnerSide is undefined during active combat', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    expect(combat.isActive).toBe(true);
    expect(combat.winnerSide).toBeUndefined();
    expect(combat.winner).toBeUndefined();
  });

  it('winnerSide remains undefined even after some turns but before combat ends', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    // Advance several turns without defeating anyone
    engine.nextTurn(combat);
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    expect(combat.isActive).toBe(true);
    expect(combat.winnerSide).toBeUndefined();
  });
});

// ─── Winner Side: Player Victory ───────────────────────────────────────────

describe('Winner side — player victory', () => {
  it('sets winnerSide to "player" when all enemies defeated with single player', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);

    expect(result).not.toBeNull();
    expect(result!.winnerSide).toBe('player');
    expect(combat.winnerSide).toBe('player');
  });

  it('sets winnerSide to "player" with party of 4 vs single enemy', () => {
    const engine = new CombatEngine();
    const players = createMockPartyCharacter(5, { name: 'A' });
    const player2 = createMockPartyCharacter(5, { name: 'B' });
    const player3 = createMockPartyCharacter(5, { name: 'C' });
    const player4 = createMockPartyCharacter(5, { name: 'D' });
    const enemy = createMockPartyCharacter(1, { name: 'Boss' });
    const combat = engine.startCombat([players, player2, player3, player4], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);

    expect(result!.winnerSide).toBe('player');
    expect(combat.winnerSide).toBe('player');
  });

  it('sets winnerSide to "player" when party has casualties but enemies all defeated', () => {
    const engine = new CombatEngine();
    const player1 = createMockPartyCharacter(5, { name: 'Survivor' });
    const player2 = createMockPartyCharacter(5, { name: 'Fallen' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player1, player2], [enemy]);

    // Kill one player and all enemies
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    players[1].isDefeated = true;
    players[1].currentHP = 0;
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemies[0].isDefeated = true;
    enemies[0].currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.winnerSide).toBe('player');
    expect(combat.winnerSide).toBe('player');
    // Winner should be a surviving player
    expect(result!.winner).toBeDefined();
    expect(result!.winner!.id.startsWith('player')).toBe(true);
    expect(result!.winner!.isDefeated).toBe(false);
  });

  it('winner is the first surviving player, not necessarily the first player', () => {
    const engine = new CombatEngine();
    const player1 = createMockPartyCharacter(5, { name: 'Dead Hero' });
    const player2 = createMockPartyCharacter(5, { name: 'Living Hero' });
    const player3 = createMockPartyCharacter(5, { name: 'Also Living' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player1, player2, player3], [enemy]);

    // Kill first player, keep others alive, kill enemy
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    players[0].isDefeated = true;
    players[0].currentHP = 0;
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemies[0].isDefeated = true;
    enemies[0].currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.winnerSide).toBe('player');
    // Winner should be a surviving player (not player1 who is dead)
    expect(result!.winner).toBeDefined();
    expect(result!.winner!.isDefeated).toBe(false);
  });
});

// ─── Winner Side: Enemy Victory ────────────────────────────────────────────

describe('Winner side — enemy victory', () => {
  it('sets winnerSide to "enemy" when all players defeated', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(5, { name: 'Dragon' });
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatPlayersAndEnd(engine, combat, [0]);

    expect(result!.winnerSide).toBe('enemy');
    expect(combat.winnerSide).toBe('enemy');
  });

  it('sets winnerSide to "enemy" with multiple enemies when all players defeated', () => {
    const engine = new CombatEngine();
    const player1 = createMockPartyCharacter(1, { name: 'Hero A' });
    const player2 = createMockPartyCharacter(1, { name: 'Hero B' });
    const enemy1 = createMockPartyCharacter(5, { name: 'Orc A' });
    const enemy2 = createMockPartyCharacter(5, { name: 'Orc B' });
    const combat = engine.startCombat([player1, player2], [enemy1, enemy2]);

    const result = defeatPlayersAndEnd(engine, combat, [0, 1]);

    expect(result!.winnerSide).toBe('enemy');
    // Winner should be a surviving enemy
    expect(result!.winner).toBeDefined();
    expect(result!.winner!.id.startsWith('enemy')).toBe(true);
  });

  it('sets winnerSide to "enemy" when enemies have casualties but all players defeated', () => {
    const engine = new CombatEngine();
    const player1 = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy1 = createMockPartyCharacter(5, { name: 'Surviving Orc' });
    const enemy2 = createMockPartyCharacter(1, { name: 'Dead Orc' });
    const combat = engine.startCombat([player1], [enemy1, enemy2]);

    // Kill one enemy and the player
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemies[1].isDefeated = true;
    enemies[1].currentHP = 0;
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    players[0].isDefeated = true;
    players[0].currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.winnerSide).toBe('enemy');
    expect(result!.winner).toBeDefined();
    expect(result!.winner!.isDefeated).toBe(false);
  });
});

// ─── Winner Side: Draw ─────────────────────────────────────────────────────

describe('Winner side — draw scenarios', () => {
  it('draw when both sides fully defeated (mutual kill)', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    // Kill everyone
    combat.combatants[0].isDefeated = true;
    combat.combatants[0].currentHP = 0;
    combat.combatants[1].isDefeated = true;
    combat.combatants[1].currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.winnerSide).toBe('draw');
    expect(result!.winner).toBeUndefined();
  });

  it('draw when max turns reached with no casualties', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player = createMockPartyCharacter(1, { name: 'Staller' });
    const enemy = createMockPartyCharacter(1, { name: 'Stallee' });
    const combat = engine.startCombat([player], [enemy]);

    const result = forceMaxTurnsDraw(engine, combat);
    expect(result!.winnerSide).toBe('draw');
    expect(result!.winner).toBeUndefined();
  });

  it('draw when max turns reached with partial kills on both sides', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player1 = createMockPartyCharacter(1, { name: 'Hero A' });
    const player2 = createMockPartyCharacter(1, { name: 'Hero B' });
    const enemy1 = createMockPartyCharacter(1, { name: 'Orc A' });
    const enemy2 = createMockPartyCharacter(1, { name: 'Orc B' });
    const combat = engine.startCombat([player1, player2], [enemy1, enemy2]);

    // Kill one player and one enemy
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    players[0].isDefeated = true;
    players[0].currentHP = 0;
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemies[0].isDefeated = true;
    enemies[0].currentHP = 0;

    const result = forceMaxTurnsDraw(engine, combat);
    expect(result!.winnerSide).toBe('draw');
  });

  it('draw description says "draw"', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player = createMockPartyCharacter(1, { name: 'A' });
    const enemy = createMockPartyCharacter(1, { name: 'B' });
    const combat = engine.startCombat([player], [enemy]);

    const result = forceMaxTurnsDraw(engine, combat);
    expect(result!.description.toLowerCase()).toContain('draw');
  });
});

// ─── Winner Side: Full Combat Integration ──────────────────────────────────

describe('Winner side — full combat integration', () => {
  /**
   * Helper: create a character with an equipped weapon for executeWeaponAttack
   */
  function createArmedCharacter(overrides?: Partial<CharacterSheet>): CharacterSheet {
    return createMockPartyCharacter(5, {
      ...overrides,
      equipment: {
        weapons: [{ name: 'Longsword', equipped: true } as any],
        armor: [], items: [], totalWeight: 0, equippedWeight: 0,
      },
    });
  }

  it('full combat to completion produces valid winnerSide', () => {
    const roller = createSeededRoller('winner-side-integration');
    const engine = new CombatEngine({}, roller);

    const player = createArmedCharacter({ name: 'Knight', hp: { current: 20, max: 20, temp: 0 } });
    const enemy = createArmedCharacter({ name: 'Rat', hp: { current: 4, max: 4, temp: 0 } });
    const combat = engine.startCombat([player], [enemy]);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    let rounds = 0;
    while (combat.isActive && rounds < 50) {
      const current = engine.getCurrentCombatant(combat);
      const target = current.id.startsWith('player') ? enemyC : playerC;
      if (!target.isDefeated) {
        engine.executeWeaponAttack(combat, current, target);
      }
      engine.nextTurn(combat);
      rounds++;
    }

    expect(combat.isActive).toBe(false);
    expect(combat.winnerSide).toBeDefined();
    expect(['player', 'enemy', 'draw']).toContain(combat.winnerSide);

    const result = engine.getCombatResult(combat);
    expect(result!.winnerSide).toBe(combat.winnerSide);
  });

  it('full combat with seeded roller produces consistent winnerSide across runs', () => {
    const runCombat = () => {
      const roller = createSeededRoller('consistent-winner-side');
      const engine = new CombatEngine({}, roller);

      const player = createArmedCharacter({ name: 'A', hp: { current: 20, max: 20, temp: 0 } });
      const enemy = createArmedCharacter({ name: 'B', hp: { current: 4, max: 4, temp: 0 } });
      const combat = engine.startCombat([player], [enemy]);

      const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
      const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;

      let rounds = 0;
      while (combat.isActive && rounds < 50) {
        const current = engine.getCurrentCombatant(combat);
        const target = current.id.startsWith('player') ? enemyC : playerC;
        if (!target.isDefeated) {
          engine.executeWeaponAttack(combat, current, target);
        }
        engine.nextTurn(combat);
        rounds++;
      }

      return combat.winnerSide;
    };

    expect(runCombat()).toEqual(runCombat());
  });
});

// ─── XP Calculation: CR-based XP ──────────────────────────────────────────

describe('XP calculation — CR-based values', () => {
  it('CR 0 = 10 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemy(0, 'Commoner');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(10); // getXPForCR(0) = 10
  });

  it('CR 0.125 = 25 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemy(0.125, 'Rat');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(25); // getXPForCR(0.125) = 25
  });

  it('CR 0.25 = 50 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemy(0.25, 'Goblin');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(50); // getXPForCR(0.25) = 50
  });

  it('CR 0.5 = 100 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemy(0.5, 'Guard');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(100); // getXPForCR(0.5) = 100
  });

  it('CR 1 = 200 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemy(1, 'Bandit');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(200); // getXPForCR(1) = 200
  });

  it('CR 3 = 700 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemy = createEnemy(3, 'Ogre');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(700); // getXPForCR(3) = 700
  });

  it('CR 5 = 1800 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemy = createEnemy(5, 'Wyvern');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(1800); // getXPForCR(5) = 1800
  });

  it('CR 10 = 5900 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(10, { name: 'Hero' });
    const enemy = createEnemy(10, 'Young Dragon');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(5900); // getXPForCR(10) = 5900
  });

  it('CR 20 = 25000 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(20, { name: 'Hero' });
    const enemy = createEnemy(20, 'Ancient Dragon');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(25000); // getXPForCR(20) = 25000
  });
});

// ─── XP Calculation: Fallback to Level ─────────────────────────────────────

describe('XP calculation — fallback to level when cr is undefined', () => {
  it('enemy without cr falls back to level for XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    // Enemy at level 3 but no cr field → XP should use level 3
    const enemy = createEnemyNoCR(3, 'Custom Monster');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    // getXPForCR(3) = 700
    expect(result!.xpAwarded).toBe(700);
  });

  it('enemy at level 1 without cr gives CR 1 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemyNoCR(1, 'Level 1 Monster');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    // getXPForCR(1) = 200
    expect(result!.xpAwarded).toBe(200);
  });

  it('enemy at level 10 without cr gives CR 10 XP', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(10, { name: 'Hero' });
    const enemy = createEnemyNoCR(10, 'Level 10 Monster');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    // getXPForCR(10) = 5900
    expect(result!.xpAwarded).toBe(5900);
  });

  it('cr takes priority over level when both are set', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    // Level 5 but CR 1 — XP should use CR 1 (200), not level 5 (1800)
    const enemy = createEnemy(1, 'Weak Boss');
    const combat = engine.startCombat([player], [enemy]);

    const result = defeatEnemiesAndEnd(engine, combat, [0]);
    expect(result!.xpAwarded).toBe(200); // getXPForCR(1) = 200, NOT getXPForCR(5) = 1800
  });
});

// ─── XP Calculation: Mixed CR Enemies ─────────────────────────────────────

describe('XP calculation — mixed CR enemies', () => {
  it('sums XP from multiple defeated enemies with different CRs', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemy1 = createEnemy(1, 'Goblin');     // 200 XP
    const enemy2 = createEnemy(3, 'Ogre');       // 700 XP
    const enemy3 = createEnemy(0.5, 'Wolf');     // 100 XP
    const combat = engine.startCombat([player], [enemy1, enemy2, enemy3]);

    const result = defeatEnemiesAndEnd(engine, combat, [0, 1, 2]);
    expect(result!.xpAwarded).toBe(200 + 700 + 100); // 1000 total
  });

  it('only counts defeated enemies, not surviving ones', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemy1 = createEnemy(3, 'Dead Ogre');    // 700 XP
    const enemy2 = createEnemy(3, 'Living Ogre');  // 700 XP — NOT defeated
    const combat = engine.startCombat([player], [enemy1, enemy2]);

    // Only defeat first enemy, force draw via max turns
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemies[0].isDefeated = true;
    enemies[0].currentHP = 0;
    // Force end — create a new engine with maxTurnsBeforeDraw
    const forceEngine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player2 = createMockPartyCharacter(5, { name: 'Hero2' });
    const enemy1b = createEnemy(3, 'Dead Ogre B');
    const enemy2b = createEnemy(3, 'Living Ogre B');
    const combat2 = forceEngine.startCombat([player2], [enemy1b, enemy2b]);

    const enemies2 = combat2.combatants.filter(c => c.id.startsWith('enemy'));
    enemies2[0].isDefeated = true;
    enemies2[0].currentHP = 0;

    const result = forceMaxTurnsDraw(forceEngine, combat2);
    expect(result!.xpAwarded).toBe(700); // Only one CR 3 defeated
    expect(result!.xpAwarded).not.toBe(1400); // NOT both
  });

  it('correctly sums XP with fractional CRs', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemies = [
      createEnemy(0.125, 'Rat'),      // 25 XP
      createEnemy(0.125, 'Bat'),      // 25 XP
      createEnemy(0.25, 'Cat'),       // 50 XP
      createEnemy(0.5, 'Guard Dog'),  // 100 XP
    ];
    const combat = engine.startCombat([player], enemies);

    const result = defeatEnemiesAndEnd(engine, combat, [0, 1, 2, 3]);
    expect(result!.xpAwarded).toBe(25 + 25 + 50 + 100); // 200 total
  });
});

// ─── XP Calculation: Edge Cases ────────────────────────────────────────────

describe('XP calculation — edge cases', () => {
  it('0 XP when no enemies defeated (max turns draw)', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemy = createEnemy(10, 'Dragon');
    const combat = engine.startCombat([player], [enemy]);

    const result = forceMaxTurnsDraw(engine, combat);
    expect(result!.xpAwarded).toBe(0);
  });

  it('0 XP when no enemies defeated (mutual kill with player-only enemies)', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createEnemy(1, 'Goblin');
    const combat = engine.startCombat([player], [enemy]);

    // Kill only the player, not the enemy → enemies win, but no enemies defeated
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    players[0].isDefeated = true;
    players[0].currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.xpAwarded).toBe(0);
  });

  it('awards XP for defeated enemies even when enemies win overall', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy1 = createEnemy(1, 'Dead Goblin');   // 200 XP
    const enemy2 = createEnemy(5, 'Living Boss');    // 1800 XP — NOT defeated
    const combat = engine.startCombat([player], [enemy1, enemy2]);

    // Kill one enemy (find by name, not index — initiative shuffles order) and the player
    const deadGoblin = combat.combatants.find(c => c.character.name === 'Dead Goblin')!;
    deadGoblin.isDefeated = true;
    deadGoblin.currentHP = 0;
    const hero = combat.combatants.find(c => c.id.startsWith('player'))!;
    hero.isDefeated = true;
    hero.currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.winnerSide).toBe('enemy');
    expect(result!.xpAwarded).toBe(200); // Still awards XP for the defeated goblin
  });

  it('awards XP for partial kills on draw', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemy1 = createEnemy(3, 'Orc A');    // 700 XP
    const enemy2 = createEnemy(3, 'Orc B');    // 700 XP
    const combat = engine.startCombat([player], [enemy1, enemy2]);

    // Defeat one enemy
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemies[0].isDefeated = true;
    enemies[0].currentHP = 0;

    const result = forceMaxTurnsDraw(engine, combat);
    expect(result!.winnerSide).toBe('draw');
    expect(result!.xpAwarded).toBe(700); // Only the defeated enemy counts
  });

  it('XP matches getXPForCR for all standard CR values 0-20', () => {
    // Verify the XP calculation is consistent with the lookup table
    const standardCRs = [0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

    for (const cr of standardCRs) {
      const engine = new CombatEngine();
      const player = createMockPartyCharacter(Math.round(cr) || 1, { name: 'Hero' });
      const enemy = createEnemy(cr, `CR ${cr}`);
      const combat = engine.startCombat([player], [enemy]);

      const result = defeatEnemiesAndEnd(engine, combat, [0]);
      expect(result!.xpAwarded).toBe(getXPForCR(cr));
    }
  });
});

// ─── XP Calculation: Large Encounters ─────────────────────────────────────

describe('XP calculation — large encounters', () => {
  it('sums XP correctly for 10 enemies of same CR', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemies = Array.from({ length: 10 }, (_, i) =>
      createEnemy(0.25, `Goblin ${i}`)
    );
    const combat = engine.startCombat([player], enemies);

    const result = defeatEnemiesAndEnd(engine, combat, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result!.xpAwarded).toBe(10 * 50); // 500 total
  });

  it('sums XP for varied encounter (mix of CR 0.5 through CR 5)', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'Hero' });
    const enemies = [
      createEnemy(0.5, 'Wolf'),      // 100
      createEnemy(0.5, 'Spider'),    // 100
      createEnemy(1, 'Goblin'),      // 200
      createEnemy(2, 'Skeleton'),    // 450
      createEnemy(3, 'Ogre'),        // 700
      createEnemy(5, 'Wyvern'),      // 1800
    ];
    const combat = engine.startCombat([player], enemies);

    const result = defeatEnemiesAndEnd(engine, combat, [0, 1, 2, 3, 4, 5]);
    expect(result!.xpAwarded).toBe(100 + 100 + 200 + 450 + 700 + 1800); // 3350
  });
});
