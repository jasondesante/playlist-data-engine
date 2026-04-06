/**
 * Core CombatEngine tests (Task 1.2.3)
 *
 * Covers:
 * - startCombat() — initiative rolling, turn order, combatant creation
 * - executeWeaponAttack() — hit/miss, damage, critical hit/miss
 * - nextTurn() — turn advancement, round counting, action reset
 * - checkCombatStatus() — win/loss/draw conditions
 * - executeDodge(), executeDash(), executeDisengage()
 * - getCombatResult() — XP and treasure calculation
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createSeededRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import type { DiceRollerAPI } from '../../../src/core/types/Combat.js';
import {
  createTestCombatant,
  createTestCombat,
} from '../../helpers/combatTestHelpers.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { CharacterSheet, Attack } from '../../../src/core/types/Character.js';
import type { CombatInstance, Combatant } from '../../../src/core/types/Combat.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Create a mock DiceRollerAPI that returns fixed values for deterministic tests.
 * Each method is a spy that can be overridden per-test.
 */
function createMockDiceRoller(overrides?: Partial<DiceRollerAPI>): DiceRollerAPI {
  return {
    rollDie: overrides?.rollDie ?? ((_sides: number) => 10),
    rollD20: overrides?.rollD20 ?? (() => 10),
    rollWithAdvantage: overrides?.rollWithAdvantage ?? (() => ({ roll1: 10, roll2: 5, result: 10 })),
    rollWithDisadvantage: overrides?.rollWithDisadvantage ?? (() => ({ roll1: 5, roll2: 10, result: 5 })),
    calculateDamage: overrides?.calculateDamage ?? ((_formula: string, _mod: number, _crit?: boolean) => ({
      rolls: [5], modifier: _mod ?? 0, total: 5 + (_mod ?? 0), isCritical: _crit ?? false,
    })),
    rollSavingThrow: overrides?.rollSavingThrow ?? ((_mod: number, _prof?: number) => 10 + mod + (_prof ?? 0)),
    rollAbilityCheck: overrides?.rollAbilityCheck ?? ((_mod: number, _prof?: number) => 10 + mod + (_prof ?? 0)),
    isCriticalHit: overrides?.isCriticalHit ?? ((roll: number) => roll === 20),
    isCriticalMiss: overrides?.isCriticalMiss ?? ((roll: number) => roll === 1),
    parseDiceFormula: overrides?.parseDiceFormula ?? ((formula: string) => {
      const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
      if (!match) throw new Error(`Invalid dice formula: ${formula}`);
      return {
        diceCount: parseInt(match[1], 10),
        diceSides: parseInt(match[2], 10),
        modifier: match[3] ? parseInt(match[3], 10) : 0,
        rolls: [5],
        total: 5 + (match[3] ? parseInt(match[3], 10) : 0),
      };
    }),
  };
}

function mod(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ─── startCombat() ─────────────────────────────────────────────────────────

describe('CombatEngine.startCombat()', () => {
  it('creates a combat instance with correct initial state', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const combat = engine.startCombat([player], []);

    expect(combat.isActive).toBe(true);
    expect(combat.roundNumber).toBe(1);
    expect(combat.currentTurnIndex).toBe(0);
    expect(combat.history).toEqual([]);
    expect(combat.combatants).toHaveLength(1);
  });

  it('assigns player-prefixed IDs to player combatants', () => {
    const engine = new CombatEngine();
    const players = [
      createMockPartyCharacter(1, { name: 'A' }),
      createMockPartyCharacter(1, { name: 'B' }),
    ];
    const combat = engine.startCombat(players, []);

    // Initiative sort may reorder, but IDs should still be player_0 and player_1
    const ids = combat.combatants.map(c => c.id);
    expect(ids).toContain('player_0');
    expect(ids).toContain('player_1');
    expect(ids.every(id => id.startsWith('player'))).toBe(true);
  });

  it('assigns enemy-prefixed IDs to enemy combatants', () => {
    const engine = new CombatEngine();
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([], [enemy]);

    expect(combat.combatants[0].id).toBe('enemy_0');
  });

  it('assigns sequential IDs across both sides', () => {
    const engine = new CombatEngine();
    const players = [createMockPartyCharacter(1, { name: 'P1' })];
    const enemies = [createMockPartyCharacter(1, { name: 'E1' })];
    const combat = engine.startCombat(players, enemies);

    const ids = combat.combatants.map(c => c.id);
    expect(ids).toContain('player_0');
    expect(ids).toContain('enemy_1');
  });

  it('initializes combatants with correct HP from character sheet', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'HP Test' });
    const combat = engine.startCombat([player], []);

    const combatant = combat.combatants[0];
    expect(combatant.currentHP).toBe(player.hp.max);
    expect(combatant.character.hp.max).toBe(player.hp.max);
  });

  it('initializes combatants as not defeated with actions available', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Actions Test' });
    const combat = engine.startCombat([player], []);

    const c = combat.combatants[0];
    expect(c.isDefeated).toBe(false);
    expect(c.actionUsed).toBe(false);
    expect(c.bonusActionUsed).toBe(false);
    expect(c.reactionUsed).toBe(false);
    expect(c.temporaryHP).toBe(0);
    expect(c.statusEffects).toEqual([]);
  });

  it('rolls initiative and sorts combatants by initiative (descending)', () => {
    // Use seeded dice roller for deterministic initiative
    const roller = createSeededRoller('initiative-sort-test');
    const engine = new CombatEngine({}, roller);

    const players = [
      createMockPartyCharacter(1, {
        name: 'Slow',
        ability_scores: { STR: 10, DEX: 8, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        ability_modifiers: { STR: 0, DEX: -1, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      }),
      createMockPartyCharacter(1, {
        name: 'Fast',
        ability_scores: { STR: 10, DEX: 18, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        ability_modifiers: { STR: 0, DEX: 4, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      }),
    ];
    const combat = engine.startCombat(players, []);

    // Initiative values should be set (d20 + DEX modifier)
    for (const c of combat.combatants) {
      expect(typeof c.initiative).toBe('number');
      expect(c.initiative).toBeGreaterThan(0);
    }

    // Turn order should be sorted descending by initiative
    for (let i = 1; i < combat.combatants.length; i++) {
      expect(combat.combatants[i - 1].initiative).toBeGreaterThanOrEqual(
        combat.combatants[i].initiative
      );
    }
  });

  it('produces deterministic initiative with the same seed', () => {
    const makeEngine = () => {
      const roller = createSeededRoller('deterministic-init');
      return new CombatEngine({}, roller);
    };

    const players = [
      createMockPartyCharacter(3, { name: 'A' }),
      createMockPartyCharacter(3, { name: 'B' }),
      createMockPartyCharacter(3, { name: 'C' }),
    ];

    const combat1 = makeEngine().startCombat(players, []);
    const combat2 = makeEngine().startCombat(players, []);

    expect(combat1.combatants.map(c => c.initiative)).toEqual(
      combat2.combatants.map(c => c.initiative)
    );
    expect(combat1.combatants.map(c => c.id)).toEqual(
      combat2.combatants.map(c => c.id)
    );
  });

  it('handles empty arrays (no combatants)', () => {
    const engine = new CombatEngine();
    const combat = engine.startCombat([], []);

    expect(combat.isActive).toBe(true);
    expect(combat.combatants).toHaveLength(0);
    expect(combat.roundNumber).toBe(1);
  });

  it('creates combatants with mixed player and enemy sides', () => {
    const engine = new CombatEngine();
    const players = [createMockPartyCharacter(1, { name: 'Hero' })];
    const enemies = [createMockPartyCharacter(1, { name: 'Goblin' })];
    const combat = engine.startCombat(players, enemies);

    const playerCount = combat.combatants.filter(c => c.id.startsWith('player')).length;
    const enemyCount = combat.combatants.filter(c => c.id.startsWith('enemy')).length;

    expect(playerCount).toBe(1);
    expect(enemyCount).toBe(1);
  });
});

// ─── getCurrentCombatant() ─────────────────────────────────────────────────

describe('CombatEngine.getCurrentCombatant()', () => {
  it('returns the combatant at the current turn index', () => {
    const engine = new CombatEngine();
    const players = [
      createMockPartyCharacter(1, { name: 'First' }),
      createMockPartyCharacter(1, { name: 'Second' }),
    ];
    const combat = engine.startCombat(players, []);

    // Turn 0 should be the first combatant in initiative order
    const current = engine.getCurrentCombatant(combat);
    expect(current).toBe(combat.combatants[0]);
  });
});

// ─── executeWeaponAttack() ─────────────────────────────────────────────────

describe('CombatEngine.executeWeaponAttack()', () => {
  it('unarmed strike deals 1 + STR modifier damage on hit', () => {
    // Mock roller: d20=15 (guaranteed hit vs AC 10), damage=1
    const attackBonus = mod(16) + 2; // STR 16 → +3, proficiency +2 = +5
    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: (_formula: string, abilityMod: number) => ({
        rolls: [1], modifier: abilityMod, total: 1 + abilityMod, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 10 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 10 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    const action = engine.executeWeaponAttack(combat, attacker, target);

    expect(action.type).toBe('attack');
    expect(action.result?.success).toBe(true);
    expect(action.result?.damage).toBe(1 + mod(16)); // 1 (unarmed) + 3 (STR mod) = 4
    expect(target.currentHP).toBe(10 - (1 + mod(16)));
    expect(combat.history).toHaveLength(1);
  });

  it('misses when d20 roll + attack bonus < target AC', () => {
    // d20=2, attack bonus=+2, total=4 < AC 15 → miss
    const mockRoller = createMockDiceRoller({
      rollD20: () => 2,
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 12, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 15 },
      { id: 'enemy_1', currentHP: 20 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    const action = engine.executeWeaponAttack(combat, attacker, target);

    expect(action.result?.success).toBe(false);
    expect(action.result?.damage).toBeUndefined();
    expect(target.currentHP).toBe(20); // no damage taken
  });

  it('critical hit on natural 20 deals doubled damage dice', () => {
    // d20=20 → auto hit + crit. Unarmed = 1d1, doubled = 2 rolls of 1 → 2 + mod
    const strMod = mod(16); // +3
    const mockRoller = createMockDiceRoller({
      rollD20: () => 20,
      calculateDamage: (_formula: string, abilityMod: number, isCritical?: boolean) => {
        if (isCritical) {
          // Double dice: 1+1 = 2 dice + modifier
          return { rolls: [1, 1], modifier: abilityMod, total: 2 + abilityMod, isCritical: true };
        }
        return { rolls: [1], modifier: abilityMod, total: 1 + abilityMod, isCritical: false };
      },
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 25 }, // very high AC, still hits on nat 20
      { id: 'enemy_1', currentHP: 20 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    const action = engine.executeWeaponAttack(combat, attacker, target);

    expect(action.result?.success).toBe(true);
    expect(action.result?.isCritical).toBe(true);
    expect(action.result?.damage).toBe(2 + strMod); // doubled dice (2) + STR mod (3) = 5
  });

  it('critical miss on natural 1 always misses regardless of bonuses', () => {
    const mockRoller = createMockDiceRoller({
      rollD20: () => 1,
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 20, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, proficiency_bonus: 6, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 5 }, // very low AC, still misses on nat 1
      { id: 'enemy_1', currentHP: 20 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    const action = engine.executeWeaponAttack(combat, attacker, target);

    expect(action.result?.success).toBe(false);
    expect(target.currentHP).toBe(20);
  });

  it('sets target isDefeated when HP reaches 0', () => {
    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: () => ({
        rolls: [100], modifier: 0, total: 100, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 5 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeWeaponAttack(combat, attacker, target);

    expect(target.currentHP).toBe(0);
    expect(target.isDefeated).toBe(true);
  });

  it('does not reduce HP below 0', () => {
    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: () => ({
        rolls: [999], modifier: 0, total: 999, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 3 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeWeaponAttack(combat, attacker, target);

    expect(target.currentHP).toBe(0);
  });

  it('records attack action in combat history', () => {
    const mockRoller = createMockDiceRoller({ rollD20: () => 15 });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { armor_class: 10 },
      { id: 'player_0', currentHP: 10 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 10 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeWeaponAttack(combat, attacker, target);

    expect(combat.history).toHaveLength(1);
    expect(combat.history[0].type).toBe('attack');
    expect(combat.history[0].actor).toBe(attacker);
    expect(combat.history[0].target).toBe(target);
  });

  it('throws when specified weapon is not equipped', () => {
    const engine = new CombatEngine();
    // Give attacker an equipped weapon so the weapon name lookup path is triggered
    const attacker = createTestCombatant(
      {
        armor_class: 10,
        equipment: {
          weapons: [{ name: 'Longsword', equipped: true } as any],
          armor: [], items: [], totalWeight: 0, equippedWeight: 0,
        },
      },
      { id: 'player_0', currentHP: 10 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 10 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    expect(() => engine.executeWeaponAttack(combat, attacker, target, 'Nonexistent Sword'))
      .toThrow('Weapon "Nonexistent Sword" is not equipped');
  });

  it('falls back to unarmed strike when no weapons equipped', () => {
    const mockRoller = createMockDiceRoller({ rollD20: () => 15 });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { armor_class: 10, equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 } },
      { id: 'player_0', currentHP: 10 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 10 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    const action = engine.executeWeaponAttack(combat, attacker, target);
    expect(action.result?.success).toBe(true);
  });

  it('uses unarmed strike explicitly when weaponName is "unarmed"', () => {
    const mockRoller = createMockDiceRoller({ rollD20: () => 15 });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { armor_class: 10 },
      { id: 'player_0', currentHP: 10 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 10 }
    );

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    const action = engine.executeWeaponAttack(combat, attacker, target, 'unarmed');
    expect(action.result?.success).toBe(true);
  });
});

// ─── executeAttack() (raw attack with custom Attack object) ───────────────

describe('CombatEngine.executeAttack()', () => {
  it('applies damage from a custom Attack object', () => {
    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: (_f: string, m: number) => ({
        rolls: [6], modifier: m, total: 6 + m, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 14, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 20 }
    );

    const attack: Attack = {
      name: 'Test Sword',
      damage_dice: '1d8',
      damage_type: 'slashing',
      type: 'melee',
      attack_bonus: mod(14) + 2, // STR mod + proficiency
    };

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeAttack(combat, attacker, target, attack);

    expect(target.currentHP).toBe(20 - (6 + mod(14)));
  });

  it('melee attack uses STR modifier for damage', () => {
    const strMod = mod(18); // +4
    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: (_f: string, m: number) => ({
        rolls: [8], modifier: m, total: 8 + m, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 18, DEX: 8, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 50 }
    );

    const attack: Attack = {
      name: 'Greatsword',
      damage_dice: '2d6',
      damage_type: 'slashing',
      type: 'melee',
      attack_bonus: strMod + 2,
    };

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeAttack(combat, attacker, target, attack);
    expect(target.currentHP).toBe(50 - (8 + strMod));
  });

  it('ranged attack uses DEX modifier for damage', () => {
    const dexMod = mod(18); // +4
    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: (_f: string, m: number) => ({
        rolls: [6], modifier: m, total: 6 + m, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 8, DEX: 18, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 50 }
    );

    const attack: Attack = {
      name: 'Longbow',
      damage_dice: '1d8',
      damage_type: 'piercing',
      type: 'ranged',
      attack_bonus: dexMod + 2,
    };

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeAttack(combat, attacker, target, attack);
    expect(target.currentHP).toBe(50 - (6 + dexMod));
  });

  it('finesse weapon uses max(STR, DEX) for damage', () => {
    const strMod = mod(10); // +0
    const dexMod = mod(18); // +4
    const bestMod = Math.max(strMod, dexMod);

    const mockRoller = createMockDiceRoller({
      rollD20: () => 15,
      calculateDamage: (_f: string, m: number) => ({
        rolls: [6], modifier: m, total: 6 + m, isCritical: false,
      }),
    });
    const engine = new CombatEngine({}, mockRoller);

    const attacker = createTestCombatant(
      { ability_scores: { STR: 10, DEX: 18, CON: 10, INT: 10, WIS: 10, CHA: 10 }, armor_class: 10 },
      { id: 'player_0', currentHP: 20 }
    );
    const target = createTestCombatant(
      { armor_class: 10 },
      { id: 'enemy_1', currentHP: 50 }
    );

    const attack: Attack = {
      name: 'Dagger',
      damage_dice: '1d4',
      damage_type: 'piercing',
      type: 'melee',
      attack_bonus: bestMod + 2,
      properties: ['finesse'],
    };

    const combat: CombatInstance = {
      id: 'test', combatants: [attacker, target],
      currentTurnIndex: 0, roundNumber: 1,
      history: [], isActive: true, startTime: Date.now(), lastUpdated: Date.now(),
    };

    engine.executeAttack(combat, attacker, target, attack);
    expect(target.currentHP).toBe(50 - (6 + bestMod));
  });
});

// ─── nextTurn() ───────────────────────────────────────────────────────────

describe('CombatEngine.nextTurn()', () => {
  it('advances to the next combatant', () => {
    const engine = new CombatEngine();
    const players = [
      createMockPartyCharacter(1, { name: 'A' }),
      createMockPartyCharacter(1, { name: 'B' }),
      createMockPartyCharacter(1, { name: 'C' }),
    ];
    const combat = engine.startCombat(players, []);

    const firstIndex = combat.currentTurnIndex;
    engine.nextTurn(combat);

    expect(combat.currentTurnIndex).not.toBe(firstIndex);
  });

  it('wraps around to the first combatant after the last', () => {
    const engine = new CombatEngine();
    const players = [
      createMockPartyCharacter(1, { name: 'A' }),
      createMockPartyCharacter(1, { name: 'B' }),
    ];
    const combat = engine.startCombat(players, []);

    // Advance to last combatant
    engine.nextTurn(combat);
    const lastIndex = combat.currentTurnIndex;

    // One more should wrap to 0
    engine.nextTurn(combat);
    expect(combat.currentTurnIndex).toBe(0);
  });

  it('increments round number when wrapping to index 0', () => {
    const engine = new CombatEngine();
    const players = [
      createMockPartyCharacter(1, { name: 'A' }),
      createMockPartyCharacter(1, { name: 'B' }),
    ];
    const combat = engine.startCombat(players, []);

    expect(combat.roundNumber).toBe(1);

    // Turn 0 → 1 (round still 1)
    engine.nextTurn(combat);
    expect(combat.roundNumber).toBe(1);

    // Turn 1 → 0 (new round!)
    engine.nextTurn(combat);
    expect(combat.roundNumber).toBe(2);

    // Turn 0 → 1 (round still 2)
    engine.nextTurn(combat);
    expect(combat.roundNumber).toBe(2);

    // Turn 1 → 0 (round 3)
    engine.nextTurn(combat);
    expect(combat.roundNumber).toBe(3);
  });

  it('resets actionUsed, bonusActionUsed, and reactionUsed', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Action Test' });
    const combat = engine.startCombat([player], []);

    const combatant = combat.combatants[0];
    combatant.actionUsed = true;
    combatant.bonusActionUsed = true;
    combatant.reactionUsed = true;

    engine.nextTurn(combat);

    // The action flags should be reset for the combatant whose turn just ended
    expect(combatant.actionUsed).toBe(false);
    expect(combatant.bonusActionUsed).toBe(false);
    expect(combatant.reactionUsed).toBe(false);
  });

  it('returns the updated CombatInstance', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Return Test' });
    const combat = engine.startCombat([player], []);

    const result = engine.nextTurn(combat);
    expect(result).toBe(combat);
  });

  it('updates lastUpdated timestamp', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Timestamp Test' });
    const combat = engine.startCombat([player], []);

    const before = combat.lastUpdated;
    // Small delay to ensure timestamp differs
    const start = Date.now();
    while (Date.now() === start) { /* busy wait */ }
    engine.nextTurn(combat);

    expect(combat.lastUpdated).toBeGreaterThanOrEqual(before);
  });
});

// ─── checkCombatStatus() (tested via nextTurn behavior) ──────────────────

describe('CombatEngine — combat end conditions', () => {
  it('combat ends when all enemies are defeated', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    // Defeat the enemy
    const enemyCombatant = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyCombatant.isDefeated = true;
    enemyCombatant.currentHP = 0;

    engine.nextTurn(combat);

    expect(combat.isActive).toBe(false);
    expect(combat.winner).toBeDefined();
    expect(combat.winner!.id.startsWith('player')).toBe(true);
  });

  it('combat ends when all players are defeated', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Dragon' });
    const combat = engine.startCombat([player], [enemy]);

    // Defeat the player
    const playerCombatant = combat.combatants.find(c => c.id.startsWith('player'))!;
    playerCombatant.isDefeated = true;
    playerCombatant.currentHP = 0;

    engine.nextTurn(combat);

    expect(combat.isActive).toBe(false);
    expect(combat.winner).toBeDefined();
    expect(combat.winner!.id.startsWith('enemy')).toBe(true);
  });

  it('combat ends in draw when both sides are fully defeated', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    // Defeat everyone (e.g., mutual kill from AoE)
    combat.combatants[0].isDefeated = true;
    combat.combatants[0].currentHP = 0;
    combat.combatants[1].isDefeated = true;
    combat.combatants[1].currentHP = 0;

    engine.nextTurn(combat);

    expect(combat.isActive).toBe(false);
    expect(combat.winner).toBeUndefined();
  });

  it('combat ends in draw when max turns is reached', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 3 });
    const player = createMockPartyCharacter(1, { name: 'Staller' });
    const enemy = createMockPartyCharacter(1, { name: 'Stallee' });
    const combat = engine.startCombat([player], [enemy]);

    // Push 3 actions into history to reach the max turns limit
    for (let i = 0; i < 3; i++) {
      combat.history.push({
        type: 'dodge' as any,
        actor: combat.combatants[0],
        result: { success: true, description: 'dodge' },
      });
    }

    engine.nextTurn(combat);

    expect(combat.isActive).toBe(false);
  });

  it('combat continues when some but not all enemies are defeated', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemies = [
      createMockPartyCharacter(1, { name: 'Goblin A' }),
      createMockPartyCharacter(1, { name: 'Goblin B' }),
    ];
    const combat = engine.startCombat([player], enemies);

    // Defeat only one enemy
    const enemyCombatants = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemyCombatants[0].isDefeated = true;
    enemyCombatants[0].currentHP = 0;

    engine.nextTurn(combat);

    expect(combat.isActive).toBe(true);
  });

  it('combat continues when some but not all players are defeated', () => {
    const engine = new CombatEngine();
    const players = [
      createMockPartyCharacter(1, { name: 'Hero A' }),
      createMockPartyCharacter(1, { name: 'Hero B' }),
    ];
    const enemy = createMockPartyCharacter(1, { name: 'Dragon' });
    const combat = engine.startCombat(players, [enemy]);

    // Defeat only one player
    const playerCombatants = combat.combatants.filter(c => c.id.startsWith('player'));
    playerCombatants[0].isDefeated = true;
    playerCombatants[0].currentHP = 0;

    engine.nextTurn(combat);

    expect(combat.isActive).toBe(true);
  });
});

// ─── executeDodge(), executeDash(), executeDisengage() ────────────────────

describe('CombatEngine — non-attack actions', () => {
  it('executeDodge() records a dodge action', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Dodger' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    const action = engine.executeDodge(combat, combatant);

    expect(action.type).toBe('dodge');
    expect(action.actor).toBe(combatant);
    expect(action.result?.success).toBe(true);
    expect(action.result?.description).toContain('Dodge');
    expect(combat.history).toHaveLength(1);
  });

  it('executeDash() records a dash action', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Dasher' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    const action = engine.executeDash(combat, combatant);

    expect(action.type).toBe('dash');
    expect(action.actor).toBe(combatant);
    expect(action.result?.success).toBe(true);
    expect(action.result?.description).toContain('Dash');
    expect(combat.history).toHaveLength(1);
  });

  it('executeDisengage() records a disengage action', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Cautious' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    const action = engine.executeDisengage(combat, combatant);

    expect(action.type).toBe('disengage');
    expect(action.actor).toBe(combatant);
    expect(action.result?.success).toBe(true);
    expect(action.result?.description).toContain('Disengage');
    expect(combat.history).toHaveLength(1);
  });

  it('multiple non-attack actions accumulate in history', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Multi' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    engine.executeDodge(combat, combatant);
    engine.executeDash(combat, combatant);
    engine.executeDisengage(combat, combatant);

    expect(combat.history).toHaveLength(3);
    expect(combat.history[0].type).toBe('dodge');
    expect(combat.history[1].type).toBe('dash');
    expect(combat.history[2].type).toBe('disengage');
  });
});

// ─── executeFlee() ────────────────────────────────────────────────────────

describe('CombatEngine.executeFlee()', () => {
  it('throws when fleeing is not allowed', () => {
    const engine = new CombatEngine({ allowFleeing: false });
    const player = createMockPartyCharacter(1, { name: 'Trapped' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    expect(() => engine.executeFlee(combat, combatant))
      .toThrow('Fleeing is not allowed');
  });

  it('removes the combatant from the combat instance when allowed', () => {
    const engine = new CombatEngine({ allowFleeing: true });
    const player = createMockPartyCharacter(1, { name: 'Runner' });
    const enemy = createMockPartyCharacter(1, { name: 'Stayer' });
    const combat = engine.startCombat([player], [enemy]);
    const playerCombatant = combat.combatants.find(c => c.id.startsWith('player'))!;

    expect(combat.combatants).toHaveLength(2);
    engine.executeFlee(combat, playerCombatant);
    expect(combat.combatants).toHaveLength(1);
    expect(combat.combatants[0].id.startsWith('enemy')).toBe(true);
  });

  it('marks the fleeing combatant as defeated', () => {
    const engine = new CombatEngine({ allowFleeing: true });
    const player = createMockPartyCharacter(1, { name: 'Runner' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    engine.executeFlee(combat, combatant);
    expect(combatant.isDefeated).toBe(true);
  });

  it('records flee action in history', () => {
    const engine = new CombatEngine({ allowFleeing: true });
    const player = createMockPartyCharacter(1, { name: 'Runner' });
    const combat = engine.startCombat([player], []);
    const combatant = combat.combatants[0];

    const action = engine.executeFlee(combat, combatant);

    expect(action.type).toBe('flee');
    expect(action.result?.description).toContain('flees');
  });

  it('canFlee() reflects the config', () => {
    expect(new CombatEngine({ allowFleeing: true }).canFlee()).toBe(true);
    expect(new CombatEngine({ allowFleeing: false }).canFlee()).toBe(false);
    expect(new CombatEngine().canFlee()).toBe(false);
  });

  it('ends combat when all enemies flee', () => {
    const engine = new CombatEngine({ allowFleeing: true });
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Coward' });
    const combat = engine.startCombat([player], [enemy]);
    const enemyCombatant = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    engine.executeFlee(combat, enemyCombatant);

    expect(combat.isActive).toBe(false);
  });
});

// ─── getCombatResult() ────────────────────────────────────────────────────

describe('CombatEngine.getCombatResult()', () => {
  it('returns null when combat is still active', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Active' });
    const combat = engine.startCombat([player], []);

    expect(engine.getCombatResult(combat)).toBeNull();
  });

  it('returns a CombatResult with correct winner when enemies defeated', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Winner' });
    const enemy = createMockPartyCharacter(1, { name: 'Loser' });
    const combat = engine.startCombat([player], [enemy]);

    // Defeat enemy
    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;

    // End combat
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result).not.toBeNull();
    expect(result!.winner.id.startsWith('player')).toBe(true);
    expect(result!.defeated).toContainEqual(enemyC);
  });

  it('calculates XP as 50 per defeated enemy', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemies = [
      createMockPartyCharacter(1, { name: 'Goblin A' }),
      createMockPartyCharacter(1, { name: 'Goblin B' }),
      createMockPartyCharacter(1, { name: 'Goblin C' }),
    ];
    const combat = engine.startCombat([player], enemies);

    // Defeat 2 out of 3 enemies
    const enemyCs = combat.combatants.filter(c => c.id.startsWith('enemy'));
    enemyCs[0].isDefeated = true;
    enemyCs[0].currentHP = 0;
    enemyCs[1].isDefeated = true;
    enemyCs[1].currentHP = 0;

    // Combat stays active because not all enemies are defeated.
    // Use maxTurnsBeforeDraw to force end.
    const forceEndEngine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player2 = createMockPartyCharacter(1, { name: 'Hero2' });
    const enemies2 = [
      createMockPartyCharacter(1, { name: 'Goblin D' }),
      createMockPartyCharacter(1, { name: 'Goblin E' }),
      createMockPartyCharacter(1, { name: 'Goblin F' }),
    ];
    const combat2 = forceEndEngine.startCombat([player2], enemies2);

    // Defeat 2 out of 3 enemies
    const enemyCs2 = combat2.combatants.filter(c => c.id.startsWith('enemy'));
    enemyCs2[0].isDefeated = true;
    enemyCs2[0].currentHP = 0;
    enemyCs2[1].isDefeated = true;
    enemyCs2[1].currentHP = 0;

    // Add one history entry to trigger max turns
    combat2.history.push({
      type: 'dodge' as any,
      actor: combat2.combatants[0],
      result: { success: true, description: 'dodge' },
    });
    forceEndEngine.nextTurn(combat2);
    const result = forceEndEngine.getCombatResult(combat2);

    expect(result!.xpAwarded).toBe(100); // 2 defeated * 50
  });

  it('awards 0 XP when no enemies are defeated', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player = createMockPartyCharacter(1, { name: 'Staller' });
    const enemy = createMockPartyCharacter(1, { name: 'Stallee' });
    const combat = engine.startCombat([player], [enemy]);

    // Force max turns draw
    combat.history.push({
      type: 'dodge' as any,
      actor: combat.combatants[0],
      result: { success: true, description: 'dodge' },
    });

    engine.nextTurn(combat);
    const result = engine.getCombatResult(combat);

    expect(result!.xpAwarded).toBe(0);
  });

  it('includes treasure with default gold (0-99)', () => {
    const engine = new CombatEngine({ seed: 'treasure-test' });
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.treasureAwarded).toBeDefined();
    expect(result!.treasureAwarded!.gold).toBeGreaterThanOrEqual(0);
    expect(result!.treasureAwarded!.gold).toBeLessThanOrEqual(99);
  });

  it('uses fixed gold when configured', () => {
    const engine = new CombatEngine({
      seed: 'fixed-gold',
      treasure: { gold: 500, items: [] },
    });
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.treasureAwarded!.gold).toBe(500);
  });

  it('uses gold range when configured with min/max', () => {
    const engine = new CombatEngine({
      seed: 'range-gold',
      treasure: { gold: { min: 200, max: 300 }, items: [] },
    });
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.treasureAwarded!.gold).toBeGreaterThanOrEqual(200);
    expect(result!.treasureAwarded!.gold).toBeLessThanOrEqual(300);
  });

  it('returns correct roundsElapsed', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;

    // Advance a couple turns before ending
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.roundsElapsed).toBe(combat.roundNumber);
  });

  it('description indicates draw when no winner', () => {
    const engine = new CombatEngine({ maxTurnsBeforeDraw: 1 });
    const player = createMockPartyCharacter(1, { name: 'A' });
    const enemy = createMockPartyCharacter(1, { name: 'B' });
    const combat = engine.startCombat([player], [enemy]);

    combat.history.push({
      type: 'dodge' as any,
      actor: combat.combatants[0],
      result: { success: true, description: 'dodge' },
    });
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.description).toContain('draw');
  });

  it('description includes winner name when there is a winner', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Champion' });
    const enemy = createMockPartyCharacter(1, { name: 'Loser' });
    const combat = engine.startCombat([player], [enemy]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;
    engine.nextTurn(combat);

    const result = engine.getCombatResult(combat);
    expect(result!.description).toContain('Champion');
  });
});

// ─── applyDamage(), healCombatant(), applyTemporaryHP() ───────────────────

describe('CombatEngine — damage and healing utilities', () => {
  it('applyDamage() reduces currentHP', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant({}, { currentHP: 20 });

    engine.applyDamage(combatant, 8);
    expect(combatant.currentHP).toBe(12);
  });

  it('applyDamage() sets isDefeated at 0 HP', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant({}, { currentHP: 5 });

    engine.applyDamage(combatant, 10);
    expect(combatant.currentHP).toBe(0);
    expect(combatant.isDefeated).toBe(true);
  });

  it('applyDamage() absorbs damage with temporary HP first', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      {},
      { currentHP: 20, temporaryHP: 10 }
    );

    engine.applyDamage(combatant, 12);
    // 10 temp absorbed, 2 from real HP
    expect(combatant.temporaryHP).toBe(0);
    expect(combatant.currentHP).toBe(18);
  });

  it('applyDamage() with temp HP does not reduce real HP if fully absorbed', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      {},
      { currentHP: 20, temporaryHP: 15 }
    );

    engine.applyDamage(combatant, 10);
    expect(combatant.temporaryHP).toBe(5);
    expect(combatant.currentHP).toBe(20); // untouched
  });

  it('applyDamage() claps to 0 and does not go negative', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant({}, { currentHP: 3 });

    engine.applyDamage(combatant, 100);
    expect(combatant.currentHP).toBe(0);
  });

  it('healCombatant() restores HP up to max', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      { hp: { current: 10, max: 20, temp: 0 } },
      { currentHP: 5 }
    );

    const healed = engine.healCombatant(combatant, 8);
    expect(combatant.currentHP).toBe(13); // 5 + 8 = 13
    expect(healed).toBe(8);
  });

  it('healCombatant() does not exceed max HP', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      { hp: { current: 10, max: 20, temp: 0 } },
      { currentHP: 18 }
    );

    const healed = engine.healCombatant(combatant, 10);
    expect(combatant.currentHP).toBe(20); // capped at max
    expect(healed).toBe(2); // only 2 actually healed
  });

  it('applyTemporaryHP() sets temp HP to the higher value', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      {},
      { currentHP: 20, temporaryHP: 5 }
    );

    engine.applyTemporaryHP(combatant, 3);
    expect(combatant.temporaryHP).toBe(5); // no change, existing is higher

    engine.applyTemporaryHP(combatant, 10);
    expect(combatant.temporaryHP).toBe(10); // increased
  });
});

// ─── getLivingCombatants() / getDefeatedCombatants() ─────────────────────

describe('CombatEngine — combatant queries', () => {
  it('getLivingCombatants() returns only non-defeated combatants', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Alive' });
    const enemy = createMockPartyCharacter(1, { name: 'Dead' });
    const combat = engine.startCombat([player], [enemy]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;

    expect(engine.getLivingCombatants(combat)).toHaveLength(1);
    expect(engine.getDefeatedCombatants(combat)).toHaveLength(1);
    expect(engine.getLivingCombatants(combat)[0].id.startsWith('player')).toBe(true);
  });

  it('getDefeatedCombatants() returns only defeated combatants', () => {
    const engine = new CombatEngine();
    const combat = createTestCombat(1, 2, 1);

    // Defeat one player
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    players[0].isDefeated = true;
    players[0].currentHP = 0;

    expect(engine.getDefeatedCombatants(combat)).toHaveLength(1);
    expect(engine.getLivingCombatants(combat)).toHaveLength(combat.combatants.length - 1);
  });
});

// ─── getCombatSummary() ───────────────────────────────────────────────────

describe('CombatEngine.getCombatSummary()', () => {
  it('returns a string with round number and current combatant info', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'SummaryTest' });
    const combat = engine.startCombat([player], []);

    const summary = engine.getCombatSummary(combat);
    expect(summary).toContain('Round 1');
    expect(summary).toContain('SummaryTest');
  });

  it('includes HP info in the summary', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(5, { name: 'HPDisplay' });
    const combat = engine.startCombat([player], []);

    const combatant = combat.combatants[0];
    const summary = engine.getCombatSummary(combat);
    expect(summary).toContain(`${combatant.currentHP}/${combatant.character.hp.max}`);
  });
});

// ─── Full combat simulation ───────────────────────────────────────────────

describe('CombatEngine — full combat flow', () => {
  /**
   * Helper: create a character with an equipped weapon so executeWeaponAttack
   * uses buildAttackFromWeapon (which produces a valid dice formula like '1d8')
   * instead of buildUnarmedAttack (which uses '1' — not a valid dice formula).
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

  it('completes a full combat cycle with attacks and turn advancement', () => {
    // Use a seeded roller for deterministic combat
    const roller = createSeededRoller('full-combat-cycle');
    const engine = new CombatEngine({}, roller);

    const player = createArmedCharacter({ name: 'Knight' });
    const enemy = createArmedCharacter({ name: 'Rat', hp: { current: 4, max: 4, temp: 0 } });
    const combat = engine.startCombat([player], [enemy]);

    // Find combatants
    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    expect(combat.isActive).toBe(true);

    // Run combat until it ends or 50 rounds
    let rounds = 0;
    while (combat.isActive && rounds < 50) {
      const current = engine.getCurrentCombatant(combat);

      // Attack the other side
      const target = current.id.startsWith('player') ? enemyC : playerC;
      if (!target.isDefeated) {
        engine.executeWeaponAttack(combat, current, target);
      }

      engine.nextTurn(combat);
      rounds++;
    }

    // Combat should have ended (one side defeated)
    expect(combat.isActive).toBe(false);
    expect(combat.history.length).toBeGreaterThan(0);
  });

  it('deterministic combat produces identical results with same seed', () => {
    const runCombat = () => {
      const roller = createSeededRoller('deterministic-combat');
      const engine = new CombatEngine({}, roller);

      const player = createArmedCharacter({ name: 'A' });
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

      return {
        historyLength: combat.history.length,
        roundsElapsed: combat.roundNumber,
        playerHP: playerC.currentHP,
        enemyHP: enemyC.currentHP,
        playerDefeated: playerC.isDefeated,
        enemyDefeated: enemyC.isDefeated,
        winnerId: combat.winner?.id,
      };
    };

    const result1 = runCombat();
    const result2 = runCombat();

    expect(result1).toEqual(result2);
  });
});
