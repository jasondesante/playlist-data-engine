/**
 * Smoke tests for combat test helpers (Task 1.2.2)
 *
 * Verifies that createTestCombatant, createTestParty, createTestEnemy,
 * and createTestCombat produce valid output with correct structure.
 */

import { describe, it, expect } from 'vitest';
import {
  createTestCombatant,
  createTestParty,
  createTestEnemy,
  createTestCombat,
} from '../../helpers/combatTestHelpers.js';

describe('combat test helpers — smoke tests', () => {
  describe('createTestCombatant', () => {
    it('returns a combatant with sensible defaults', () => {
      const c = createTestCombatant();
      expect(c.id).toBe('test_combatant_0');
      expect(c.character.name).toBe('Test Combatant');
      expect(c.currentHP).toBe(c.character.hp.max);
      expect(c.isDefeated).toBe(false);
      expect(c.actionUsed).toBe(false);
      expect(c.statusEffects).toEqual([]);
      expect(c.temporaryHP).toBe(0);
    });

    it('allows overriding character fields', () => {
      const c = createTestCombatant({
        name: 'Tank',
        hp: { current: 45, max: 45, temp: 0 },
        armor_class: 18,
      });
      expect(c.character.name).toBe('Tank');
      expect(c.character.hp.max).toBe(45);
      expect(c.character.armor_class).toBe(18);
    });

    it('allows overriding combatant fields', () => {
      const c = createTestCombatant(undefined, {
        id: 'goblin_1',
        currentHP: 7,
        isDefeated: true,
        spellSlots: { 1: 4, 2: 3 },
      });
      expect(c.id).toBe('goblin_1');
      expect(c.currentHP).toBe(7);
      expect(c.isDefeated).toBe(true);
      expect(c.spellSlots).toEqual({ 1: 4, 2: 3 });
    });

    it('re-derives ability modifiers when ability_scores are overridden', () => {
      const c = createTestCombatant({
        ability_scores: { STR: 18, DEX: 10, CON: 14, INT: 8, WIS: 10, CHA: 10 },
      });
      // STR 18 → +4, CON 14 → +2, DEX 10 → +0
      expect(c.character.ability_modifiers.STR).toBe(4);
      expect(c.character.ability_modifiers.CON).toBe(2);
      expect(c.character.ability_modifiers.DEX).toBe(0);
    });

    it('defaults currentHP to character max HP', () => {
      const c = createTestCombatant({
        hp: { current: 30, max: 30, temp: 0 },
      });
      expect(c.currentHP).toBe(30);
    });

    it('allows currentHP override to differ from max HP', () => {
      const c = createTestCombatant(
        { hp: { current: 50, max: 50, temp: 0 } },
        { currentHP: 25 },
      );
      expect(c.currentHP).toBe(25);
      expect(c.character.hp.max).toBe(50);
    });
  });

  describe('createTestParty', () => {
    it('returns the correct number of combatants', () => {
      const party = createTestParty(5, 3);
      expect(party).toHaveLength(3);
    });

    it('all combatants are at the specified level', () => {
      const party = createTestParty(10, 4);
      for (const c of party) {
        expect(c.character.level).toBe(10);
      }
    });

    it('all combatant IDs start with "player"', () => {
      const party = createTestParty(3, 2);
      for (const c of party) {
        expect(c.id).toMatch(/^player_\d+$/);
      }
    });

    it('combatants have unique names', () => {
      const party = createTestParty(1, 4);
      const names = party.map(c => c.character.name);
      expect(new Set(names).size).toBe(4);
    });

    it('defaults to 4 members at level 1', () => {
      const party = createTestParty();
      expect(party).toHaveLength(4);
      expect(party[0].character.level).toBe(1);
    });
  });

  describe('createTestEnemy', () => {
    it('returns a combatant with an enemy-prefixed ID', () => {
      const enemy = createTestEnemy(3);
      expect(enemy.id).toMatch(/^enemy_\d+$/);
    });

    it('has HP greater than 0', () => {
      const enemy = createTestEnemy(5, 'elite');
      expect(enemy.currentHP).toBeGreaterThan(0);
    });

    it('has the CR set on the character sheet', () => {
      const enemy = createTestEnemy(7, 'elite', 'cr7-seed');
      expect(enemy.character.cr).toBe(7);
    });

    it('is not defeated', () => {
      const enemy = createTestEnemy(1);
      expect(enemy.isDefeated).toBe(false);
    });

    it('produces deterministic results with the same seed', () => {
      const a = createTestEnemy(3, 'uncommon', 'deterministic');
      const b = createTestEnemy(3, 'uncommon', 'deterministic');
      expect(a.character.name).toBe(b.character.name);
      expect(a.character.hp.max).toBe(b.character.hp.max);
      expect(a.character.armor_class).toBe(b.character.armor_class);
    });

    it('produces different results with different seeds', () => {
      const a = createTestEnemy(3, 'uncommon', 'seed-a');
      const b = createTestEnemy(3, 'uncommon', 'seed-b');
      // With high probability, different seeds produce different enemies
      expect(a.character.name !== b.character.name || a.character.hp.max !== b.character.hp.max).toBe(true);
    });
  });

  describe('createTestCombat', () => {
    it('returns a combat instance with players and enemies', () => {
      const combat = createTestCombat(5, 4, 5);
      const players = combat.combatants.filter(c => c.id.startsWith('player'));
      const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));
      expect(players).toHaveLength(4);
      expect(enemies).toHaveLength(1);
    });

    it('combat is active', () => {
      const combat = createTestCombat(3);
      expect(combat.isActive).toBe(true);
    });

    it('round number starts at 1', () => {
      const combat = createTestCombat(3);
      expect(combat.roundNumber).toBe(1);
    });

    it('all combatants have HP', () => {
      const combat = createTestCombat(5, 3, 7, 'elite');
      for (const c of combat.combatants) {
        expect(c.currentHP).toBeGreaterThan(0);
      }
    });

    it('is deterministic with the same seed', () => {
      const a = createTestCombat(5, 4, 5, 'common', 'det-combat');
      const b = createTestCombat(5, 4, 5, 'common', 'det-combat');
      expect(a.combatants).toHaveLength(b.combatants.length);
      // Player and enemy names should match (order may differ due to initiative sorting)
      const namesA = a.combatants.map(c => c.character.name).sort();
      const namesB = b.combatants.map(c => c.character.name).sort();
      expect(namesA).toEqual(namesB);
    });
  });
});
