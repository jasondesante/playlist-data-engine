/**
 * Tests for legendary action execution in CombatEngine
 *
 * Covers task 1.4.1:
 * - executeLegendaryAction method
 * - Action validation (exists on boss, not enough points)
 * - Point tracking (spend points, no overspend)
 * - Damage resolution from legendary actions
 * - History recording
 * - Point reset on new round via nextTurn()
 * - Initialization in createCombatant for boss enemies
 * - No legendary config for non-bosses
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';
import type { CombatInstance, CombatAction } from '../../../src/core/types/Combat.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a boss CharacterSheet with legendary_config for testing.
 */
function createBossCharacter(overrides?: Partial<CharacterSheet>): CharacterSheet {
  return {
    name: 'Test Boss',
    race: 'Dragon' as any,
    class: 'Fighter' as any,
    level: 10,
    ability_scores: { STR: 20, DEX: 12, CON: 18, INT: 14, WIS: 14, CHA: 16 },
    ability_modifiers: { STR: 5, DEX: 1, CON: 4, INT: 2, WIS: 2, CHA: 3 },
    proficiency_bonus: 4,
    hp: { current: 200, max: 200, temp: 0 },
    armor_class: 18,
    initiative: 1,
    speed: 40,
    skills: {},
    saving_throws: {} as any,
    racial_traits: [],
    class_features: [],
    spells: { spell_slots: {}, known_spells: [], cantrips: [] },
    equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 },
    xp: { current: 0, next_level: 0 },
    seed: 'test-boss',
    generated_at: new Date().toISOString(),
    legendary_config: {
      resistances_per_day: 3,
      actions: [
        {
          id: 'tail_attack',
          name: 'Tail Attack',
          cost: 1,
          effect: 'Melee attack with bonus damage',
          damage: '2d8 + 5',
          damage_type: 'bludgeoning',
        },
        {
          id: 'devour',
          name: 'Devour',
          cost: 3,
          effect: 'Massive damage + self heal',
          damage: '4d12 + 5',
          damage_type: 'necrotic',
        },
        {
          id: 'teleport',
          name: 'Teleport',
          cost: 2,
          effect: 'Instant movement without opportunity attacks',
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Start a minimal combat with one boss and one player target.
 */
function startBossCombat(bossChar: CharacterSheet, targetChar?: CharacterSheet): CombatInstance {
  const engine = new CombatEngine();
  const target = targetChar ?? {
    name: 'Adventurer',
    race: 'Human' as any,
    class: 'Fighter' as any,
    level: 5,
    ability_scores: { STR: 14, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 10 },
    ability_modifiers: { STR: 2, DEX: 1, CON: 1, INT: 0, WIS: 0, CHA: 0 },
    proficiency_bonus: 3,
    hp: { current: 50, max: 50, temp: 0 },
    armor_class: 16,
    initiative: 0,
    speed: 30,
    skills: {},
    saving_throws: {} as any,
    racial_traits: [],
    class_features: [],
    spells: { spell_slots: {}, known_spells: [], cantrips: [] },
    equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 },
    xp: { current: 0, next_level: 0 },
    seed: 'test-target',
    generated_at: new Date().toISOString(),
  };
  return engine.startCombat([target], [bossChar]);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('executeLegendaryAction', () => {
  // ── Initialization ──

  describe('createCombatant initialization', () => {
    it('initializes legendary action points to 3 for boss enemies', () => {
      const boss = createTestCombatant(createBossCharacter());
      expect(boss.legendaryActionsRemaining).toBe(3);
    });

    it('initializes legendary resistances from config', () => {
      const boss = createTestCombatant(createBossCharacter());
      expect(boss.legendaryResistancesRemaining).toBe(3);
    });

    it('initializes legendary resistances for high-CR bosses', () => {
      const boss = createTestCombatant(
        createBossCharacter({
          legendary_config: {
            resistances_per_day: 5,
            actions: [{ id: 'roar', name: 'Roar', cost: 1, effect: 'Fear' }],
          },
        })
      );
      expect(boss.legendaryResistancesRemaining).toBe(5);
    });

    it('does not initialize legendary fields for non-boss combatants', () => {
      const fighter = createTestCombatant();
      expect(fighter.legendaryActionsRemaining).toBeUndefined();
      expect(fighter.legendaryResistancesRemaining).toBeUndefined();
    });

    it('initializes via CombatEngine.startCombat for boss enemies', () => {
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      expect(boss.legendaryActionsRemaining).toBe(3);
      expect(boss.legendaryResistancesRemaining).toBe(3);
    });
  });

  // ── Validation ──

  describe('validation', () => {
    it('throws if combatant has no legendary config', () => {
      const engine = new CombatEngine();
      const combat = engine.startCombat([], [
        {
          name: 'Goblin',
          race: 'Humanoid' as any,
          class: 'Fighter' as any,
          level: 1,
          ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
          ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
          proficiency_bonus: 2,
          hp: { current: 10, max: 10, temp: 0 },
          armor_class: 10,
          initiative: 0,
          speed: 30,
          skills: {},
          saving_throws: {} as any,
          racial_traits: [],
          class_features: [],
          spells: { spell_slots: {}, known_spells: [], cantrips: [] },
          equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 },
          xp: { current: 0, next_level: 0 },
          seed: 'goblin',
          generated_at: new Date().toISOString(),
        },
      ]);
      const goblin = combat.combatants[0];

      expect(() =>
        engine.executeLegendaryAction(combat, goblin, { id: 'tail_attack', name: 'Tail Attack', cost: 1, effect: 'attack' })
      ).toThrow('has no legendary actions');
    });

    it('throws if action ID is not found on the boss', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

      expect(() =>
        engine.executeLegendaryAction(combat, boss, { id: 'nonexistent', name: 'Fake', cost: 1, effect: 'none' })
      ).toThrow('not found on');
    });

    it('throws if not enough legendary action points remain', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const devour = boss.character.legendary_config!.actions.find(a => a.id === 'devour')!;

      // Spend 2 points first
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;
      engine.executeLegendaryAction(combat, boss, teleport);
      expect(boss.legendaryActionsRemaining).toBe(1);

      // Devour costs 3, only 1 remaining
      expect(() =>
        engine.executeLegendaryAction(combat, boss, devour)
      ).toThrow('needs 3 legendary action points but only has 1 remaining');
    });
  });

  // ── Point tracking ──

  describe('action point tracking', () => {
    it('spends 1 point for a cost-1 action', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(2);
    });

    it('spends 2 points for a cost-2 action', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;

      engine.executeLegendaryAction(combat, boss, teleport);
      expect(boss.legendaryActionsRemaining).toBe(1);
    });

    it('spends 3 points for a cost-3 action', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const devour = boss.character.legendary_config!.actions.find(a => a.id === 'devour')!;

      engine.executeLegendaryAction(combat, boss, devour);
      expect(boss.legendaryActionsRemaining).toBe(0);
    });

    it('can spend 1+2 = 3 points in one round', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;

      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(2);

      engine.executeLegendaryAction(combat, boss, teleport);
      expect(boss.legendaryActionsRemaining).toBe(0);
    });

    it('cannot spend beyond available points', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      // Use all 3 points with three cost-1 actions
      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(0);

      // 4th should fail
      expect(() =>
        engine.executeLegendaryAction(combat, boss, tailAttack)
      ).toThrow('needs 1 legendary action points but only has 0 remaining');
    });

    it('point tracking persists across calls (no reset until new round)', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);

      // Still 1 remaining, hasn't reset
      expect(boss.legendaryActionsRemaining).toBe(1);
    });
  });

  // ── Damage resolution ──

  describe('damage resolution', () => {
    it('deals damage when action has damage formula and target is provided', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const initialHP = target.currentHP;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack, target);

      expect(action.result?.damage).toBeDefined();
      expect(action.result?.damage).toBeGreaterThan(0);
      expect(target.currentHP).toBeLessThan(initialHP);
    });

    it('no damage when action has no damage formula', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const initialHP = target.currentHP;
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;

      const action = engine.executeLegendaryAction(combat, boss, teleport, target);

      expect(action.result?.damage).toBeUndefined();
      expect(target.currentHP).toBe(initialHP);
    });

    it('no damage when action has damage but no target', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack);

      expect(action.result?.damage).toBeUndefined();
    });

    it('defeats target if damage reduces HP to 0', () => {
      const engine = new CombatEngine();
      const oneHPCharacter = {
        name: 'Wounded Adventurer',
        race: 'Human' as any,
        class: 'Fighter' as any,
        level: 1,
        ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
        ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
        proficiency_bonus: 2,
        hp: { current: 1, max: 10, temp: 0 },
        armor_class: 10,
        initiative: 0,
        speed: 30,
        skills: {},
        saving_throws: {} as any,
        racial_traits: [],
        class_features: [],
        spells: { spell_slots: {}, known_spells: [], cantrips: [] },
        equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 },
        xp: { current: 0, next_level: 0 },
        seed: 'wounded',
        generated_at: new Date().toISOString(),
      };
      const combat = startBossCombat(createBossCharacter(), oneHPCharacter);
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const devour = boss.character.legendary_config!.actions.find(a => a.id === 'devour')!;

      engine.executeLegendaryAction(combat, boss, devour, target);

      expect(target.isDefeated).toBe(true);
      expect(target.currentHP).toBe(0);
      expect(combat.isActive).toBe(false); // All players defeated
    });

    it('records correct damage type from legendary action', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const devour = boss.character.legendary_config!.actions.find(a => a.id === 'devour')!;

      const action = engine.executeLegendaryAction(combat, boss, devour, target);

      expect(action.result?.damageType).toBe('necrotic');
    });

    it('records target HP after damage in result', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack, target);

      expect(action.result?.targetHP).toBe(target.currentHP);
    });

    it('defeated targets lose concentration', () => {
      const engine = new CombatEngine();
      const concentratingTarget = {
        name: 'Concentrating Wizard',
        race: 'Human' as any,
        class: 'Wizard' as any,
        level: 5,
        ability_scores: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 13, CHA: 10 },
        ability_modifiers: { STR: -1, DEX: 2, CON: 1, INT: 4, WIS: 1, CHA: 0 },
        proficiency_bonus: 3,
        hp: { current: 1, max: 1, temp: 0 },
        armor_class: 12,
        initiative: 2,
        speed: 30,
        skills: {},
        saving_throws: {} as any,
        racial_traits: [],
        class_features: [],
        spells: { spell_slots: {}, known_spells: [], cantrips: [] },
        equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 },
        xp: { current: 0, next_level: 0 },
        seed: 'concentrating-wizard',
        generated_at: new Date().toISOString(),
      };
      const combat = startBossCombat(createBossCharacter(), concentratingTarget);
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      target.concentratingOn = 'Shield of Faith';
      const devour = boss.character.legendary_config!.actions.find(a => a.id === 'devour')!;

      engine.executeLegendaryAction(combat, boss, devour, target);

      expect(target.isDefeated).toBe(true);
      expect(target.concentratingOn).toBeUndefined();
    });
  });

  // ── History recording ──

  describe('history recording', () => {
    it('records legendary action in combat history', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      expect(combat.history.length).toBe(0);

      engine.executeLegendaryAction(combat, boss, tailAttack);

      expect(combat.history.length).toBe(1);
      expect(combat.history[0].type).toBe('legendaryAction');
    });

    it('records correct actor in history', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack);

      expect(action.actor.id).toBe(boss.id);
    });

    it('records target when provided', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack, target);

      expect(action.target).toBe(target);
    });

    it('records legendaryAction data on the action', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack);

      expect(action.legendaryAction).toBeDefined();
      expect(action.legendaryAction!.id).toBe('tail_attack');
      expect(action.legendaryAction!.name).toBe('Tail Attack');
      expect(action.legendaryAction!.cost).toBe(1);
    });

    it('description includes action name and points spent', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack, target);

      expect(action.result?.description).toContain('Tail Attack');
      expect(action.result?.description).toContain('Test Boss');
      expect(action.result?.description).toContain('Adventurer');
      expect(action.result?.description).toContain('2 remaining');
    });

    it('description uses singular "point" for cost-1 actions', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack);

      expect(action.result?.description).toContain('1 action point spent');
    });

    it('description uses plural "points" for cost-2+ actions', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;

      const action = engine.executeLegendaryAction(combat, boss, teleport);

      expect(action.result?.description).toContain('2 action points spent');
    });

    it('no-target description omits target name', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;

      const action = engine.executeLegendaryAction(combat, boss, teleport);

      expect(action.result?.description).toContain('Test Boss');
      expect(action.result?.description).toContain('Teleport');
      expect(action.target).toBeUndefined();
    });

    it('result.success is always true for legendary actions', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      const action = engine.executeLegendaryAction(combat, boss, tailAttack);

      expect(action.result?.success).toBe(true);
    });

    it('accumulates multiple actions in history', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;
      const teleport = boss.character.legendary_config!.actions.find(a => a.id === 'teleport')!;

      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, teleport);

      expect(combat.history.length).toBe(2);
      expect(combat.history[0].type).toBe('legendaryAction');
      expect(combat.history[1].type).toBe('legendaryAction');
    });
  });

  // ── Point reset on new round ──

  describe('legendary action point reset', () => {
    it('resets legendary action points to 3 at the start of a new round', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      // Spend all 3 points in round 1
      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(0);

      // Advance through turns until a new round starts
      // With 2 combatants, nextTurn twice = new round
      engine.nextTurn(combat);
      engine.nextTurn(combat);
      expect(combat.roundNumber).toBe(2);

      // Boss should have 3 points again
      expect(boss.legendaryActionsRemaining).toBe(3);
    });

    it('does not reset points mid-round', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      // Spend 1 point
      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(2);

      // Advance one turn (not a new round)
      engine.nextTurn(combat);
      expect(combat.roundNumber).toBe(1);

      // Points should NOT have reset
      expect(boss.legendaryActionsRemaining).toBe(2);
    });

    it('resets points for all boss combatants (multi-boss)', () => {
      const engine = new CombatEngine();
      const boss1 = createBossCharacter({ name: 'Boss 1' });
      const boss2 = createBossCharacter({
        name: 'Boss 2',
        legendary_config: {
          resistances_per_day: 4,
          actions: [{ id: 'roar', name: 'Roar', cost: 1, effect: 'Fear' }],
        },
      });
      const combat = engine.startCombat([], [boss1, boss2]);

      const b1 = combat.combatants.find(c => c.character.name === 'Boss 1')!;
      const b2 = combat.combatants.find(c => c.character.name === 'Boss 2')!;

      // Both should start at 3
      expect(b1.legendaryActionsRemaining).toBe(3);
      expect(b2.legendaryActionsRemaining).toBe(3);

      // Spend boss 1's points
      const action1 = b1.character.legendary_config!.actions[0]!;
      engine.executeLegendaryAction(combat, b1, action1);
      engine.executeLegendaryAction(combat, b1, action1);
      engine.executeLegendaryAction(combat, b1, action1);
      expect(b1.legendaryActionsRemaining).toBe(0);

      // Spend boss 2's points
      const action2 = b2.character.legendary_config!.actions[0]!;
      engine.executeLegendaryAction(combat, b2, action2);
      expect(b2.legendaryActionsRemaining).toBe(2);

      // Advance to new round (2 combatants)
      engine.nextTurn(combat);
      engine.nextTurn(combat);
      expect(combat.roundNumber).toBe(2);

      // Both should be reset
      expect(b1.legendaryActionsRemaining).toBe(3);
      expect(b2.legendaryActionsRemaining).toBe(3);
    });

    it('legendary resistances are NOT reset per round (per-day resource)', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

      expect(boss.legendaryResistancesRemaining).toBe(3);

      // Advance to round 2
      engine.nextTurn(combat);
      engine.nextTurn(combat);
      expect(combat.roundNumber).toBe(2);

      // Resistances should still be 3 (not consumed or reset)
      expect(boss.legendaryResistancesRemaining).toBe(3);
    });

    it('does not reset points for defeated boss combatants', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;

      // Defeat the boss
      boss.currentHP = 0;
      boss.isDefeated = true;
      boss.legendaryActionsRemaining = 0;

      // Advance to new round
      engine.nextTurn(combat);
      engine.nextTurn(combat);

      // Defeated boss should NOT get points reset
      expect(boss.legendaryActionsRemaining).toBe(0);
    });
  });

  // ── Full combat integration ──

  describe('full combat integration', () => {
    it('legendary actions work within a full combat cycle', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const target = combat.combatants.find(c => c.id.startsWith('player'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      // Boss uses a legendary action on player's turn (D&D timing)
      const action = engine.executeLegendaryAction(combat, boss, tailAttack, target);

      expect(action.type).toBe('legendaryAction');
      expect(action.result?.success).toBe(true);
      expect(boss.legendaryActionsRemaining).toBe(2);
      expect(combat.history).toHaveLength(1);
    });

    it('can use legendary actions across multiple rounds with reset', () => {
      const engine = new CombatEngine();
      const combat = startBossCombat(createBossCharacter());
      const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
      const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

      // Round 1: spend all 3 points
      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(0);

      // Advance to round 2
      engine.nextTurn(combat);
      engine.nextTurn(combat);

      // Round 2: should have 3 points again
      expect(boss.legendaryActionsRemaining).toBe(3);
      engine.executeLegendaryAction(combat, boss, tailAttack);
      expect(boss.legendaryActionsRemaining).toBe(2);

      // Advance to round 3
      engine.nextTurn(combat);
      engine.nextTurn(combat);

      // Round 3: should have 3 points again (not 2 from previous)
      expect(boss.legendaryActionsRemaining).toBe(3);
    });
  });
});

// ─── Task 1.4.4: useLegendaryResistance ──────────────────────────────────────

describe('useLegendaryResistance', () => {
  // ── Basic usage ──

  it('returns true when resistances are available', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    expect(boss.legendaryResistancesRemaining).toBe(3);
    const used = engine.useLegendaryResistance(combat, boss);
    expect(used).toBe(true);
    expect(boss.legendaryResistancesRemaining).toBe(2);
  });

  it('returns false when no resistances remain', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Use all 3 resistances
    engine.useLegendaryResistance(combat, boss);
    engine.useLegendaryResistance(combat, boss);
    engine.useLegendaryResistance(combat, boss);
    expect(boss.legendaryResistancesRemaining).toBe(0);

    // 4th should return false
    const used = engine.useLegendaryResistance(combat, boss);
    expect(used).toBe(false);
    expect(boss.legendaryResistancesRemaining).toBe(0);
  });

  it('returns false for non-boss combatants (no legendary config)', () => {
    const engine = new CombatEngine();
    const target = {
      name: 'Adventurer',
      race: 'Human' as any,
      class: 'Fighter' as any,
      level: 5,
      ability_scores: { STR: 14, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 10 },
      ability_modifiers: { STR: 2, DEX: 1, CON: 1, INT: 0, WIS: 0, CHA: 0 },
      proficiency_bonus: 3,
      hp: { current: 50, max: 50, temp: 0 },
      armor_class: 16,
      initiative: 0,
      speed: 30,
      skills: {},
      saving_throws: {} as any,
      racial_traits: [],
      class_features: [],
      spells: { spell_slots: {}, known_spells: [], cantrips: [] },
      equipment: { weapons: [], armor: [], items: [], totalWeight: 0, equippedWeight: 0 },
      xp: { current: 0, next_level: 0 },
      seed: 'test-target',
      generated_at: new Date().toISOString(),
    };
    const combat = engine.startCombat([target], []);
    const adventurer = combat.combatants[0]!;

    expect(adventurer.legendaryResistancesRemaining).toBeUndefined();
    const used = engine.useLegendaryResistance(combat, adventurer);
    expect(used).toBe(false);
  });

  // ── Resource tracking ──

  it('decrements resistance count by 1 each use', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    expect(boss.legendaryResistancesRemaining).toBe(3);
    engine.useLegendaryResistance(combat, boss);
    expect(boss.legendaryResistancesRemaining).toBe(2);
    engine.useLegendaryResistance(combat, boss);
    expect(boss.legendaryResistancesRemaining).toBe(1);
    engine.useLegendaryResistance(combat, boss);
    expect(boss.legendaryResistancesRemaining).toBe(0);
  });

  it('respects different resistance counts from config', () => {
    const engine = new CombatEngine();
    const bossChar = createBossCharacter({
      legendary_config: {
        resistances_per_day: 1,
        actions: [{ id: 'roar', name: 'Roar', cost: 1, effect: 'Fear' }],
      },
    });
    const combat = startBossCombat(bossChar);
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    expect(boss.legendaryResistancesRemaining).toBe(1);
    const used = engine.useLegendaryResistance(combat, boss);
    expect(used).toBe(true);
    expect(boss.legendaryResistancesRemaining).toBe(0);

    const usedAgain = engine.useLegendaryResistance(combat, boss);
    expect(usedAgain).toBe(false);
  });

  // ── History recording ──

  it('records usage in combat history', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    const historyBefore = combat.history.length;
    engine.useLegendaryResistance(combat, boss);

    expect(combat.history.length).toBe(historyBefore + 1);
    expect(combat.history[historyBefore]!.type).toBe('statusEffectTick');
    expect(combat.history[historyBefore]!.actor.id).toBe(boss.id);
  });

  it('does not record history when no resistances remain', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Use all resistances
    engine.useLegendaryResistance(combat, boss);
    engine.useLegendaryResistance(combat, boss);
    engine.useLegendaryResistance(combat, boss);

    const historyBefore = combat.history.length;
    engine.useLegendaryResistance(combat, boss);

    // No new history entry for failed use
    expect(combat.history.length).toBe(historyBefore);
  });

  it('description includes boss name and remaining count', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    engine.useLegendaryResistance(combat, boss);
    const lastEntry = combat.history[combat.history.length - 1]!;

    expect(lastEntry.result?.description).toContain('Test Boss');
    expect(lastEntry.result?.description).toContain('legendary resistance');
    expect(lastEntry.result?.description).toContain('2 remaining');
  });

  // ── Per-day resource (not reset per round) ──

  it('resistances are NOT reset by nextTurn (per-day resource)', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Use a resistance
    engine.useLegendaryResistance(combat, boss);
    expect(boss.legendaryResistancesRemaining).toBe(2);

    // Advance through turns to round 2
    engine.nextTurn(combat);
    engine.nextTurn(combat);
    expect(combat.roundNumber).toBe(2);

    // Resistances should still be 2 (not reset)
    expect(boss.legendaryResistancesRemaining).toBe(2);
  });

  // ── Combat integration ──

  it('works alongside legendary actions in the same combat', () => {
    const engine = new CombatEngine();
    const combat = startBossCombat(createBossCharacter());
    const boss = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    const target = combat.combatants.find(c => c.id.startsWith('player'))!;
    const tailAttack = boss.character.legendary_config!.actions.find(a => a.id === 'tail_attack')!;

    // Use legendary action
    engine.executeLegendaryAction(combat, boss, tailAttack, target);
    expect(boss.legendaryActionsRemaining).toBe(2);

    // Use legendary resistance
    const used = engine.useLegendaryResistance(combat, boss);
    expect(used).toBe(true);
    expect(boss.legendaryResistancesRemaining).toBe(2);

    // Both tracked independently
    expect(boss.legendaryActionsRemaining).toBe(2);
    expect(boss.legendaryResistancesRemaining).toBe(2);
  });
});
