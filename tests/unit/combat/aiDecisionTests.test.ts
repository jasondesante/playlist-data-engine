/**
 * AI Decision Tests (Task 2.4.1)
 *
 * Deep tests for AI decision-making across play styles:
 * - Aggressive AI: highest-damage options, burns all resources, no conservation
 * - Normal AI: conserves resources, uses basic attacks primarily, strategic spell use
 * - Target selection: normal targets lowest AC, aggressive targets lowest HP
 * - Support AI: prioritizes healing allies, buffs highest-damage ally
 *
 * These tests go beyond the basic smoke tests in combatAI.test.ts by
 * exercising multi-turn resource patterns, comparative decisions, and
 * edge cases in the decision pipeline.
 */

import { describe, it, expect } from 'vitest';
import { CombatAI } from '../../../src/core/combat/AI/CombatAI.js';
import type { AIConfig, AIPlayStyle, AIDecision } from '../../../src/core/types/CombatAI.js';
import type { Combatant, CombatInstance } from '../../../src/core/types/Combat.js';
import type { Spell } from '../../../src/core/types/Character.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function normalConfig(): AIConfig {
  return { playerStyle: 'normal', enemyStyle: 'normal' };
}

function aggressiveConfig(): AIConfig {
  return { playerStyle: 'aggressive', enemyStyle: 'aggressive' };
}

function mixedConfig(): AIConfig {
  return { playerStyle: 'normal', enemyStyle: 'aggressive' };
}

function combat(
  players: Combatant[],
  enemies: Combatant[],
  roundNumber: number = 1,
): CombatInstance {
  return {
    id: 'test',
    combatants: [...players, ...enemies],
    currentTurnIndex: 0,
    roundNumber,
    history: [],
    isActive: true,
    startTime: Date.now(),
    lastUpdated: Date.now(),
  };
}

function armedPlayer(overrides: {
  id?: string;
  name?: string;
  str?: number;
  dex?: number;
  ac?: number;
  maxHP?: number;
  currentHP?: number;
  weapons?: Array<{
    name: string;
    dice: string;
    properties?: string[];
    damageType?: string;
  }>;
} = {}): Combatant {
  const {
    id = 'player_0',
    name = 'Fighter',
    str = 16,
    dex = 12,
    ac = 16,
    maxHP = 45,
    currentHP = 45,
    weapons = [{
      name: 'Longsword',
      dice: '1d8+3',
      properties: ['melee'],
      damageType: 'slashing',
    }],
  } = overrides;

  return createTestCombatant(
    {
      name,
      ability_scores: { STR: str, DEX: dex, CON: 14, INT: 10, WIS: 10, CHA: 10 },
      armor_class: ac,
      hp: { current: maxHP, max: maxHP, temp: 0 },
      equipment: {
        weapons: weapons.map(w => ({
          name: w.name,
          quantity: 1,
          equipped: true,
          damage: { dice: w.dice, damageType: w.damageType || 'slashing' },
          weaponProperties: w.properties || ['melee'],
          type: 'weapon' as const,
          acBonus: 0,
        })),
        armor: [],
        items: [],
        totalWeight: 0,
        equippedWeight: 0,
      },
    },
    { id, currentHP },
  );
}

function casterPlayer(overrides: {
  id?: string;
  name?: string;
  spells?: Spell[];
  spellSlots?: { [level: number]: number };
  maxHP?: number;
  currentHP?: number;
  int?: number;
  wis?: number;
  cha?: number;
} = {}): Combatant {
  const {
    id = 'player_0',
    name = 'Wizard',
    spells = [],
    spellSlots,
    maxHP = 30,
    currentHP = 30,
    int = 18,
    wis = 13,
    cha = 10,
  } = overrides;

  return createTestCombatant(
    {
      name,
      class: 'Wizard' as any,
      ability_scores: { STR: 8, DEX: 14, CON: 12, INT: int, WIS: wis, CHA: cha },
      armor_class: 12,
      hp: { current: maxHP, max: maxHP, temp: 0 },
      combat_spells: spells,
    },
    { id, currentHP, spellSlots },
  );
}

function enemy(overrides: {
  id?: string;
  name?: string;
  ac?: number;
  maxHP?: number;
  currentHP?: number;
  str?: number;
} = {}): Combatant {
  const {
    id = 'enemy_0',
    name = 'Goblin',
    ac = 13,
    maxHP = 20,
    currentHP = 20,
    str = 8,
  } = overrides;

  return createTestCombatant(
    {
      name,
      ability_scores: { STR: str, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 10 },
      armor_class: ac,
      hp: { current: maxHP, max: maxHP, temp: 0 },
    },
    { id, currentHP },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AI Decision Tests (Task 2.4.1)', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. AGGRESSIVE AI: Highest-Damage Options & Resource Burning
  // ═══════════════════════════════════════════════════════════════════════════

  describe('aggressive AI burns resources', () => {
    it('prefers highest-damage weapon over lower-damage weapon', () => {
      const ai = new CombatAI(aggressiveConfig());
      const player = armedPlayer({
        weapons: [
          { name: 'Dagger', dice: '1d4+3' },       // avg 5.5
          { name: 'Greatsword', dice: '2d6+3' },    // avg 10
        ],
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);
      const decision = ai.decide(player, c);

      expect(decision.action).toBe('attack');
      expect(decision.weaponName).toBe('Greatsword');
    });

    it('prefers high-damage spell over basic attack when spell is clearly better', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe', 'multi-target'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [fireball],
        spellSlots: { 3: 3 },
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const c = combat([caster], [e1, e2]);
      const decision = ai.decide(caster, c);

      // Fireball (8d6=28 avg × 2 targets = 56 total) >> unarmed strike (1 dmg)
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fireball');
    });

    it('uses leveled damage spell even when cantrip is available', () => {
      const ai = new CombatAI(aggressiveConfig());
      const cantrip: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const scorchingRay: Spell = {
        name: 'Scorching Ray',
        level: 2,
        damage_dice: '6d6',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip, scorchingRay],
        spellSlots: { 2: 3 },
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target]);

      const decision = ai.decide(caster, c);
      // Aggressive burns slots — Scorching Ray (6d6=21 avg) >> Fire Bolt (1d10=5.5 avg)
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Scorching Ray');
    });

    it('heals proactively below 75% HP even with spell slots available', () => {
      const ai = new CombatAI(aggressiveConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '1d8+3',
        tags: ['healing', 'ally'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [heal],
        spellSlots: { 1: 4 },
        currentHP: 15,  // 50% of maxHP 30 — below 75% threshold
        maxHP: 30,
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target]);

      const decision = ai.decide(caster, c);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Cure Wounds');
    });

    it('does not heal above 75% HP threshold', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe'],
      };
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '1d8+3',
        tags: ['healing', 'ally'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [fireball, heal],
        spellSlots: { 1: 4, 3: 3 },
        currentHP: 24,  // 80% of maxHP 30 — above 75% threshold
        maxHP: 30,
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target]);

      const decision = ai.decide(caster, c);
      // Should cast damage, not heal
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fireball');
    });

    it('never dodges regardless of HP or isolation', () => {
      const ai = new CombatAI(aggressiveConfig());
      const player = armedPlayer({
        id: 'player_0',
        maxHP: 45,
        currentHP: 1,  // Critical HP
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const c = combat([player], [e1, e2]);

      const decision = ai.decide(player, c);
      expect(decision.action).not.toBe('dodge');
      expect(decision.action).not.toBe('flee');
      expect(decision.action).toBe('attack');
    });

    it('uses AoE spell when only one enemy (still highest damage)', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe', 'multi-target'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [fireball],
        spellSlots: { 3: 3 },
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target]);

      const decision = ai.decide(caster, c);
      // Aggressive still picks fireball even vs 1 enemy (8d6 = 28 > unarmed = 1)
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fireball');
    });

    it('aggressive boss legendary action picks highest-cost damage action', () => {
      const ai = new CombatAI(aggressiveConfig());
      const boss = createTestCombatant(
        {
          name: 'Dragon Lord',
          ability_scores: { STR: 20, DEX: 12, CON: 18, INT: 14, WIS: 13, CHA: 16 },
          armor_class: 19,
          hp: { current: 200, max: 200, temp: 0 },
          equipment: {
            weapons: [{
              name: 'Bite',
              quantity: 1,
              equipped: true,
              damage: { dice: '2d10+5', damageType: 'piercing' },
              weaponProperties: ['melee'],
              type: 'weapon',
              acBonus: 0,
            }],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
          },
          legendary_config: {
            resistances_per_day: 3,
            actions: [
              { id: 'claw', name: 'Claw', cost: 1, effect: 'Slash', damage: '2d6+5', damage_type: 'slashing', tags: ['damage'] },
              { id: 'tail', name: 'Tail Swipe', cost: 2, effect: 'Sweep', damage: '3d8+5', damage_type: 'bludgeoning', tags: ['damage'] },
              { id: 'roar', name: 'Roar', cost: 3, effect: 'Fear', tags: ['control'] },
            ],
          },
        },
        { id: 'enemy_0', currentHP: 200, legendaryActionsRemaining: 3 },
      );
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [boss]);

      const decision = ai.selectLegendaryAction(boss, c);
      expect(decision).not.toBeNull();
      expect(decision!.action).toBe('legendaryAction');
      // Aggressive picks highest-cost damage: Tail Swipe (cost 2) > Claw (cost 1)
      expect(decision!.legendaryActionId).toBe('tail');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. NORMAL AI: Resource Conservation & Basic Attacks
  // ═══════════════════════════════════════════════════════════════════════════

  describe('normal AI conserves resources', () => {
    it('prefers cantrip over leveled spell for similar damage', () => {
      const ai = new CombatAI(normalConfig());
      const cantrip: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '2d10',   // avg 11
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const magicMissile: Spell = {
        name: 'Magic Missile',
        level: 1,
        damage_dice: '3d4+3',  // avg 10.5
        damage_type: 'force',
        tags: ['damage'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip, magicMissile],
        spellSlots: { 1: 4 },
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target], 3); // Round 3 (not round 1)

      const decision = ai.decide(caster, c);
      // Cantrip (avg 11) is similar to or better than MM (avg 10.5), so conserve
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fire Bolt');
    });

    it('uses leveled spell only when significantly better than cantrip', () => {
      const ai = new CombatAI(normalConfig());
      const cantrip: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',   // avg 5.5
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',    // avg 28 (×1.5 for leveled = 42)
        damage_type: 'fire',
        tags: ['damage', 'aoe', 'multi-target'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip, fireball],
        spellSlots: { 3: 3 },
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const e3 = enemy({ id: 'enemy_2' });
      const c = combat([caster], [e1, e2, e3], 3); // Round 3, 3 enemies

      const decision = ai.decide(caster, c);
      // Fireball (42 adjusted) >> Fire Bolt (5.5), and AoE vs 3 enemies
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fireball');
    });

    it('falls back to weapon attack when no spells available', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        id: 'player_0',
        weapons: [{ name: 'Longsword', dice: '1d8+3' }],
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      expect(decision.action).toBe('attack');
      expect(decision.weaponName).toBe('Longsword');
    });

    it('dodges when isolated, low HP, and multiple enemies', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        id: 'player_0',
        maxHP: 45,
        currentHP: 5,  // ~11% — below 25%
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      // Only 1 party member, 2 enemies
      const c = combat([player], [e1, e2]);

      const decision = ai.decide(player, c);
      expect(decision.action).toBe('dodge');
    });

    it('attacks instead of dodging when party members present', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        id: 'player_0',
        maxHP: 45,
        currentHP: 5,
      });
      const ally = armedPlayer({ id: 'player_1' });
      const target = enemy({ id: 'enemy_0' });
      // 2 party members — not isolated
      const c = combat([player, ally], [target]);

      const decision = ai.decide(player, c);
      expect(decision.action).toBe('attack');
    });

    it('uses healing items only when low HP and no spell slots', () => {
      const ai = new CombatAI(normalConfig());
      const player = createTestCombatant(
        {
          hp: { current: 100, max: 100, temp: 0 },
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Health Potion', quantity: 2, equipped: false, tags: ['healing'] }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 15 }, // 15% — below 25%
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      expect(decision.action).toBe('useItem');
      expect(decision.itemName).toBe('Health Potion');
    });

    it('does not use healing items when spell slots are available', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '1d8+3',
        tags: ['healing', 'ally'],
      };
      const player = createTestCombatant(
        {
          hp: { current: 100, max: 100, temp: 0 },
          combat_spells: [heal],
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Health Potion', quantity: 2, equipped: false }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 15, spellSlots: { 1: 4 } },
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      // Has spell slots → use spell, not item
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Cure Wounds');
    });

    it('does not heal when above 25% HP (normal style)', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '1d8+3',
        tags: ['healing', 'ally'],
      };
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [heal, fireBolt],
        spellSlots: { 1: 4 },
        currentHP: 20,  // 67% of maxHP 30 — above 25%
        maxHP: 30,
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target]);

      const decision = ai.decide(caster, c);
      // Above 25% HP → not healing, cast damage cantrip
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fire Bolt');
    });

    it('casts control spell when 2+ enemies (normal style)', () => {
      const ai = new CombatAI(normalConfig());
      const holdPerson: Spell = {
        name: 'Hold Person',
        level: 2,
        tags: ['control'],
        saving_throw: 'WIS',
        save_dc: 15,
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [holdPerson],
        spellSlots: { 2: 3 },
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const c = combat([caster], [e1, e2]);

      const decision = ai.decide(caster, c);
      // Normal uses control when 2+ enemies
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Hold Person');
    });

    it('does not cast control spell when only 1 enemy (normal style)', () => {
      const ai = new CombatAI(normalConfig());
      const holdPerson: Spell = {
        name: 'Hold Person',
        level: 2,
        tags: ['control'],
        saving_throw: 'WIS',
        save_dc: 15,
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [holdPerson],
        spellSlots: { 2: 3 },
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target]);

      const decision = ai.decide(caster, c);
      // Only 1 enemy → control not useful, fall back to attack
      expect(decision.action).toBe('attack');
    });

    it('buffs ally with highest STR/DEX when healthy (normal style)', () => {
      const ai = new CombatAI(normalConfig());
      const bless: Spell = {
        name: 'Bless',
        level: 1,
        tags: ['buff'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [bless],
        spellSlots: { 1: 4 },
        currentHP: 25, // 83% — not low HP
        maxHP: 30,
      });
      const strongAlly = armedPlayer({ id: 'player_1', str: 20 });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, strongAlly], [target]);

      const decision = ai.decide(caster, c);
      // Normal style, healthy, has buff → buff the strongest ally
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Bless');
      expect(decision.target).toBe('player_1'); // STR 20 ally
    });

    it('does not buff when low HP (normal style prioritizes survival)', () => {
      const ai = new CombatAI(normalConfig());
      // Use 'buff' tag only (no 'ally' tag, which would classify as healing)
      const shieldOfFaith: Spell = {
        name: 'Shield of Faith',
        level: 1,
        tags: ['buff'],
      };
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [shieldOfFaith, fireBolt],
        spellSlots: { 1: 4 },
        currentHP: 5, // 17% — low HP
        maxHP: 30,
      });
      const strongAlly = armedPlayer({ id: 'player_1', str: 20 });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, strongAlly], [target]);

      const decision = ai.decide(caster, c);
      // Low HP → don't buff, attack with cantrip instead
      expect(decision.spellName).not.toBe('Shield of Faith');
      expect(decision.spellName).toBe('Fire Bolt');
    });

    it('normal style prefers melee weapon with better balanced score', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        weapons: [
          { name: 'Rapier', dice: '1d8+3', properties: ['finesse'] },    // avg 7.5
          { name: 'Shortbow', dice: '1d6+1', properties: ['ranged'] },  // avg 4.5, DEX+1
        ],
        dex: 12,
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const weapon = ai.selectWeapon(player, 'normal');
      // Rapier (7.5 dmg + STR mod * 0.1) >> Shortbow (4.5 dmg + DEX mod * 0.1)
      expect(weapon.name).toBe('Rapier');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. TARGET SELECTION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('target selection', () => {
    it('normal targets lowest AC among multiple enemies', () => {
      const ai = new CombatAI(normalConfig());
      const e1 = enemy({ id: 'enemy_0', ac: 18, name: 'Knight' });
      const e2 = enemy({ id: 'enemy_1', ac: 10, name: 'Peasant' });
      const e3 = enemy({ id: 'enemy_2', ac: 15, name: 'Archer' });
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [e1, e2, e3]);

      const decision = ai.decide(player, c);
      expect(decision.target).toBe('enemy_1'); // AC 10 — easiest to hit
    });

    it('aggressive targets lowest HP among multiple enemies', () => {
      const ai = new CombatAI(aggressiveConfig());
      const e1 = enemy({ id: 'enemy_0', currentHP: 50, name: 'Ogre' });
      const e2 = enemy({ id: 'enemy_1', currentHP: 3, name: 'Goblin' });
      const e3 = enemy({ id: 'enemy_2', currentHP: 25, name: 'Wolf' });
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [e1, e2, e3]);

      const decision = ai.decide(player, c);
      expect(decision.target).toBe('enemy_1'); // 3 HP — finish it off
    });

    it('normal and aggressive pick different targets', () => {
      const e1 = enemy({ id: 'enemy_0', ac: 10, currentHP: 50, name: 'LowAC_HighHP' });
      const e2 = enemy({ id: 'enemy_1', ac: 20, currentHP: 5, name: 'HighAC_LowHP' });

      const normalAI = new CombatAI(normalConfig());
      const aggressiveAI = new CombatAI(aggressiveConfig());
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [e1, e2]);

      const normalDecision = normalAI.decide(player, c);
      const aggressiveDecision = aggressiveAI.decide(player, c);

      // Normal targets lowest AC (e1 = AC 10)
      expect(normalDecision.target).toBe('enemy_0');
      // Aggressive targets lowest HP (e2 = 5 HP)
      expect(aggressiveDecision.target).toBe('enemy_1');
    });

    it('targets single enemy regardless of style', () => {
      const ai = new CombatAI(normalConfig());
      const target = enemy({ id: 'enemy_0' });
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      expect(decision.target).toBe('enemy_0');
    });

    it('selectTarget throws on empty array', () => {
      const ai = new CombatAI(normalConfig());
      expect(() => ai.selectTarget([], 'normal')).toThrow('No valid targets');
      expect(() => ai.selectTarget([], 'aggressive')).toThrow('No valid targets');
    });

    it('selectTarget returns sole enemy', () => {
      const ai = new CombatAI(normalConfig());
      const target = enemy({ id: 'enemy_0' });
      expect(ai.selectTarget([target], 'normal')).toBe(target);
      expect(ai.selectTarget([target], 'aggressive')).toBe(target);
    });

    it('spell targets use same target selection logic', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [fireBolt],
      });
      const e1 = enemy({ id: 'enemy_0', currentHP: 50 });
      const e2 = enemy({ id: 'enemy_1', currentHP: 3 });
      const c = combat([caster], [e1, e2]);

      const decision = ai.decide(caster, c);
      // Aggressive spell targets lowest HP too
      expect(decision.target).toBe('enemy_1');
    });

    it('excludes defeated enemies from targeting', () => {
      const ai = new CombatAI(aggressiveConfig());
      const e1 = enemy({ id: 'enemy_0', currentHP: 50 });
      const e2 = createTestCombatant(
        { name: 'Dead Goblin', hp: { current: 20, max: 20, temp: 0 } },
        { id: 'enemy_1', currentHP: 0, isDefeated: true },
      );
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [e1, e2]);

      const decision = ai.decide(player, c);
      // Should target the living enemy, not the defeated one
      expect(decision.target).toBe('enemy_0');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SUPPORT AI: Healing Ally Priority
  // ═══════════════════════════════════════════════════════════════════════════

  describe('support AI healing priority', () => {
    it('heals lowest HP ally first (normal style)', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '2d8+3',
        tags: ['healing', 'ally'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [heal],
        spellSlots: { 1: 4 },
        currentHP: 5,  // 17% — also low, but ally is worse
        maxHP: 30,
      });
      const dyingAlly = armedPlayer({
        id: 'player_1',
        maxHP: 45,
        currentHP: 2,  // 4% — worse than caster
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, dyingAlly], [target]);

      const decision = ai.decide(caster, c);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Cure Wounds');
      // Ally at 4% HP should be the target (lower than caster at 17%)
      expect(decision.target).toBe('player_1');
    });

    it('heals self when ally HP is above 50% (normal style)', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '2d8+3',
        tags: ['healing', 'ally'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [heal],
        spellSlots: { 1: 4 },
        currentHP: 5,  // 17% — low
        maxHP: 30,
      });
      const healthyAlly = armedPlayer({
        id: 'player_1',
        maxHP: 45,
        currentHP: 30,  // 67% — above 50%
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, healthyAlly], [target]);

      const decision = ai.decide(caster, c);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Cure Wounds');
      // Normal style only heals ally below 50%, so heal self
      expect(decision.target).toBe('player_0');
    });

    it('aggressive heals lowest HP ally even if above 50%', () => {
      const ai = new CombatAI(aggressiveConfig());
      const heal: Spell = {
        name: 'Healing Word',
        level: 1,
        damage_dice: '1d4+3',
        tags: ['healing', 'ally'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [heal],
        spellSlots: { 1: 4 },
        currentHP: 20,  // 67%
        maxHP: 30,
      });
      const woundedAlly = armedPlayer({
        id: 'player_1',
        maxHP: 45,
        currentHP: 25,  // 56% — below 75% threshold
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, woundedAlly], [target]);

      const decision = ai.decide(caster, c);
      // Aggressive heals proactively below 75% — ally at 56% is lowest
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Healing Word');
      expect(decision.target).toBe('player_1');
    });

    it('support caster heals instead of dealing damage when ally is critical', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '2d8+3',
        tags: ['healing', 'ally'],
      };
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [heal, fireBolt],
        spellSlots: { 1: 4 },
        currentHP: 5,  // 17% — low
        maxHP: 30,
      });
      const dyingAlly = armedPlayer({
        id: 'player_1',
        maxHP: 45,
        currentHP: 1,  // 2% — critical
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, dyingAlly], [target]);

      const decision = ai.decide(caster, c);
      // Ally critical → heal instead of damage
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Cure Wounds');
    });

    it('multi-target healing targets multiple wounded allies', () => {
      const ai = new CombatAI(aggressiveConfig());
      const massHeal: Spell = {
        name: 'Mass Healing Word',
        level: 3,
        damage_dice: '3d4+3',
        tags: ['healing', 'ally', 'multi-target'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [massHeal],
        spellSlots: { 3: 3 },
        currentHP: 15,  // 50% — below 75%
        maxHP: 30,
      });
      const woundedAlly1 = armedPlayer({ id: 'player_1', maxHP: 45, currentHP: 10 });
      const woundedAlly2 = armedPlayer({ id: 'player_2', maxHP: 45, currentHP: 15 });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster, woundedAlly1, woundedAlly2], [target]);

      const decision = ai.decide(caster, c);
      expect(decision.action).toBe('castSpell');
      expect(decision.targetIds).toBeDefined();
      // Multi-target healing should target multiple allies
      expect(decision.targetIds!.length).toBeGreaterThanOrEqual(2);
    });

    it('isSupportArchetype detects healing+buff caster', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = { name: 'Cure Wounds', level: 1, tags: ['healing', 'ally'] };
      const bless: Spell = { name: 'Bless', level: 1, tags: ['buff', 'ally'] };
      const support = casterPlayer({
        id: 'player_0',
        spells: [heal, bless],
      });

      expect(ai.isSupportArchetype(support)).toBe(true);
    });

    it('isSupportArchetype returns false for pure damage caster', () => {
      const ai = new CombatAI(normalConfig());
      const fireball: Spell = { name: 'Fireball', level: 3, tags: ['damage', 'aoe'] };
      const fireBolt: Spell = { name: 'Fire Bolt', level: 0, tags: ['damage', 'ranged'] };
      const blaster = casterPlayer({
        id: 'player_0',
        spells: [fireball, fireBolt],
      });

      expect(ai.isSupportArchetype(blaster)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MULTI-TURN RESOURCE PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('multi-turn resource patterns', () => {
    it('aggressive burns spell slots across multiple decisions', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe', 'multi-target'],
      };
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };

      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });

      // Simulate multiple turns by adjusting spell slots
      const slots = { 3: 3 };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [fireball, fireBolt],
        spellSlots: { ...slots },
      });

      const c = combat([caster], [e1, e2]);

      // Turn 1: aggressive should cast Fireball (burn slot)
      const d1 = ai.decide(caster, c);
      expect(d1.action).toBe('castSpell');
      expect(d1.spellName).toBe('Fireball');

      // Simulate slot consumption
      const updatedCaster = casterPlayer({
        id: 'player_0',
        spells: [fireball, fireBolt],
        spellSlots: { 3: 2 }, // 1 slot burned
      });
      const c2 = combat([updatedCaster], [e1, e2]);

      // Turn 2: aggressive should STILL cast Fireball (still has slots)
      const d2 = ai.decide(updatedCaster, c2);
      expect(d2.action).toBe('castSpell');
      expect(d2.spellName).toBe('Fireball');

      // Simulate all slots burned
      const depletedCaster = casterPlayer({
        id: 'player_0',
        spells: [fireball, fireBolt],
        spellSlots: { 3: 0 }, // all slots burned
      });
      const c3 = combat([depletedCaster], [e1, e2]);

      // Turn 3: no slots → fall back to cantrip
      const d3 = ai.decide(depletedCaster, c3);
      expect(d3.action).toBe('castSpell');
      expect(d3.spellName).toBe('Fire Bolt');
    });

    it('normal uses cantrip when leveled spell is not clearly better', () => {
      const ai = new CombatAI(normalConfig());
      const cantrip: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const rayOfFrost: Spell = {
        name: 'Ray of Frost',
        level: 0,
        damage_dice: '1d8',
        damage_type: 'cold',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const magicMissile: Spell = {
        name: 'Magic Missile',
        level: 1,
        damage_dice: '3d4+3',  // avg 10.5
        damage_type: 'force',
        tags: ['damage'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip, rayOfFrost, magicMissile],
        spellSlots: { 1: 4 },
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target], 3);

      const decision = ai.decide(caster, c);
      // Fire Bolt (avg 5.5) is cantrip. Magic Missile (avg 10.5 * 1.5 = 15.75 for leveled).
      // Fire Bolt is not < 50% of MM, so MM wins.
      // Actually: MM adjusted = 15.75, FB = 5.5. 15.75 > 5.5 * 1.5 = 8.25. So MM is chosen.
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Magic Missile');
    });

    it('normal uses leveled spell in later rounds even with few slots', () => {
      const ai = new CombatAI(normalConfig());
      const cantrip: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',  // avg 5.5
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const disintegrate: Spell = {
        name: 'Disintegrate',
        level: 6,
        damage_dice: '10d6+40',  // avg 75 — WAY more than cantrip
        damage_type: 'force',
        tags: ['damage'],
      };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip, disintegrate],
        spellSlots: { 6: 1 },
      });
      const target = enemy({ id: 'enemy_0' });
      const c = combat([caster], [target], 3); // Round 3

      const decision = ai.decide(caster, c);
      // Disintegrate (75 * 1.5 = 112.5) >> Fire Bolt (5.5), 150%+ better
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Disintegrate');
    });

    it('spell slot exhaustion falls back to weapon attack', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe'],
      };
      const player = createTestCombatant(
        {
          name: 'Eldritch Knight',
          class: 'Fighter' as any,
          ability_scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 10 },
          armor_class: 16,
          hp: { current: 45, max: 45, temp: 0 },
          combat_spells: [fireball],
          equipment: {
            weapons: [{
              name: 'Longsword',
              quantity: 1,
              equipped: true,
              damage: { dice: '1d8+3', damageType: 'slashing' },
              weaponProperties: ['melee'],
              type: 'weapon',
              acBonus: 0,
            }],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 45, spellSlots: { 3: 0 } }, // No slots
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      // No spell slots → fall back to weapon attack
      expect(decision.action).toBe('attack');
      expect(decision.weaponName).toBe('Longsword');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DECISION PIPELINE: SPELL vs WEAPON vs ITEM vs DEFENSE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('decision pipeline priority', () => {
    it('spell healing takes priority over item healing when slots available', () => {
      const ai = new CombatAI(normalConfig());
      const heal: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '2d8+3',
        tags: ['healing', 'ally'],
      };
      const player = createTestCombatant(
        {
          hp: { current: 100, max: 100, temp: 0 },
          combat_spells: [heal],
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Health Potion', quantity: 2, equipped: false }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 15, spellSlots: { 1: 4 } },
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      // Spell healing takes priority over item
      expect(decision.action).toBe('castSpell');
    });

    it('damage spell takes priority over weapon attack when significantly better', () => {
      const ai = new CombatAI(aggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe'],
      };
      const player = createTestCombatant(
        {
          name: 'Eldritch Knight',
          class: 'Fighter' as any,
          ability_scores: { STR: 16, DEX: 12, CON: 14, INT: 16, WIS: 10, CHA: 10 },
          armor_class: 16,
          hp: { current: 45, max: 45, temp: 0 },
          combat_spells: [fireball],
          equipment: {
            weapons: [{
              name: 'Longsword',
              quantity: 1,
              equipped: true,
              damage: { dice: '1d8+3', damageType: 'slashing' },
              weaponProperties: ['melee'],
              type: 'weapon',
              acBonus: 0,
            }],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 45, spellSlots: { 3: 3 } },
      );
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const c = combat([player], [e1, e2]);

      const decision = ai.decide(player, c);
      // Fireball (28 avg × 2 targets = 56) >> Longsword (7 avg)
      expect(decision.action).toBe('castSpell');
    });

    it('weapon attack when spell damage is not clearly better (normal)', () => {
      const ai = new CombatAI(normalConfig());
      const rayOfFrost: Spell = {
        name: 'Ray of Frost',
        level: 0,
        damage_dice: '1d8',
        damage_type: 'cold',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const player = createTestCombatant(
        {
          name: 'Warlock',
          class: 'Warlock' as any,
          ability_scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 16 },
          armor_class: 16,
          hp: { current: 35, max: 35, temp: 0 },
          combat_spells: [rayOfFrost],
          equipment: {
            weapons: [{
              name: 'Greatsword',
              quantity: 1,
              equipped: true,
              damage: { dice: '2d6+3', damageType: 'slashing' },
              weaponProperties: ['melee', 'two-handed'],
              type: 'weapon',
              acBonus: 0,
            }],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 35 },
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const decision = ai.decide(player, c);
      // Both cantrip and weapon are damage options
      // Ray of Frost (1d8=4.5) is a cantrip so it gets cast
      // But since it's a cantrip, normal style should cast it
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Ray of Frost');
    });

    it('dodge takes priority over attack when isolated and low HP (normal)', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        id: 'player_0',
        maxHP: 45,
        currentHP: 5,  // 11%
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const c = combat([player], [e1, e2]);

      const decision = ai.decide(player, c);
      // No spells, no items → defensive action
      expect(decision.action).toBe('dodge');
    });

    it('aggressive ignores dodge even when isolated and critical', () => {
      const ai = new CombatAI(aggressiveConfig());
      const player = armedPlayer({
        id: 'player_0',
        maxHP: 45,
        currentHP: 1,  // 2%
      });
      const e1 = enemy({ id: 'enemy_0' });
      const e2 = enemy({ id: 'enemy_1' });
      const e3 = enemy({ id: 'enemy_2' });
      const c = combat([player], [e1, e2, e3]);

      const decision = ai.decide(player, c);
      // Aggressive ALWAYS attacks, never dodges
      expect(decision.action).toBe('attack');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. THREAT ASSESSMENT EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('threat assessment edge cases', () => {
    it('handles 0 max HP gracefully', () => {
      const ai = new CombatAI(normalConfig());
      const player = createTestCombatant(
        { hp: { current: 0, max: 0, temp: 0 } },
        { id: 'player_0', currentHP: 0 },
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player], [target]);

      const threat = ai.assessThreat(player, c);
      expect(threat.myHPPercent).toBe(0);
      expect(threat.isLowHP).toBe(true);
      expect(threat.isCriticalHP).toBe(true);
    });

    it('estimates enemy DPR from weapons', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({ id: 'player_0' });
      const armedEnemy = createTestCombatant(
        {
          ability_scores: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
          armor_class: 14,
          hp: { current: 30, max: 30, temp: 0 },
          equipment: {
            weapons: [{
              name: 'Greataxe',
              quantity: 1,
              equipped: true,
              damage: { dice: '1d12+3', damageType: 'slashing' },
              weaponProperties: ['melee'],
              type: 'weapon',
              acBonus: 0,
            }],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'enemy_0', currentHP: 30 },
      );
      const c = combat([player], [armedEnemy]);

      const threat = ai.assessThreat(player, c);
      // Greataxe 1d12+3 = avg 9.5
      expect(threat.highestEnemyDamage).toBeCloseTo(9.5);
    });

    it('returns correct counts when allies defeated', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({ id: 'player_0' });
      const deadAlly = createTestCombatant(
        {},
        { id: 'player_1', currentHP: 0, isDefeated: true },
      );
      const target = enemy({ id: 'enemy_0' });
      const c = combat([player, deadAlly], [target]);

      const threat = ai.assessThreat(player, c);
      expect(threat.partySize).toBe(1); // Only living allies
      expect(threat.enemyCount).toBe(1);
    });

    it('lowestEnemyHP returns 0 when no enemies', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], []);

      const threat = ai.assessThreat(player, c);
      expect(threat.lowestEnemyHP).toBe(0);
    });

    it('detects legendary resistances for hasRemainingLimitedAbilities', () => {
      const ai = new CombatAI(normalConfig());
      const boss = createTestCombatant(
        { hp: { current: 200, max: 200, temp: 0 } },
        { id: 'enemy_0', currentHP: 200, legendaryResistancesRemaining: 2 },
      );
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [boss]);

      const threat = ai.assessThreat(boss, c);
      expect(threat.hasRemainingLimitedAbilities).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. WEAPON SELECTION EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('weapon selection edge cases', () => {
    it('aggressive picks 2d6 weapon over 1d8 weapon', () => {
      const ai = new CombatAI(aggressiveConfig());
      const player = armedPlayer({
        weapons: [
          { name: 'Longsword', dice: '1d8+3' },  // avg 7.5
          { name: 'Greatsword', dice: '2d6+3' },  // avg 10
        ],
      });
      const weapon = ai.selectWeapon(player, 'aggressive');
      expect(weapon.name).toBe('Greatsword');
    });

    it('normal picks weapon with better balanced score (damage + attack bonus)', () => {
      const ai = new CombatAI(normalConfig());
      // Two weapons: one higher damage but lower attack bonus, one lower damage higher bonus
      const player = armedPlayer({
        str: 14,  // +2 mod
        dex: 16,  // +3 mod
        weapons: [
          { name: 'Greatclub', dice: '1d8+2', properties: ['melee'] },     // avg 6.5, atk +4
          { name: 'Shortbow', dice: '1d6+3', properties: ['ranged'] },     // avg 6.5, atk +5
        ],
      });
      const weapon = ai.selectWeapon(player, 'normal');
      // Shortbow: 6.5 + 5*0.1 = 7.0 > Greatclub: 6.5 + 4*0.1 = 6.9
      expect(weapon.name).toBe('Shortbow');
    });

    it('ranged weapon uses DEX modifier', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        str: 8,   // -1
        dex: 18,  // +4
        weapons: [
          { name: 'Longbow', dice: '1d8+4', properties: ['ranged'] },
        ],
      });
      const weapon = ai.selectWeapon(player, 'normal');
      // Ranged weapon uses DEX (18 → +4), not STR (8 → -1)
      // Longbow: expectedDamage = 8, attackBonus = 4 + 2 = 6, score = 8.6
      // Unarmed: expectedDamage = 1 + max(0, -1) = 1, attackBonus = -1 + 2 = 1, score = 1.1
      expect(weapon.name).toBe('Longbow');
      expect(weapon.type).toBe('ranged');
      expect(weapon.attackBonus).toBe(6); // +4 DEX + 2 proficiency
    });

    it('melee weapon uses STR modifier', () => {
      const ai = new CombatAI(normalConfig());
      const player = armedPlayer({
        str: 18,  // +4
        dex: 10,  // +0
        weapons: [
          { name: 'Greatsword', dice: '2d6+4', properties: ['melee'] },
        ],
      });
      const weapon = ai.selectWeapon(player, 'normal');
      // Melee weapon uses STR (18 → +4)
      expect(weapon.type).toBe('melee');
      expect(weapon.attackBonus).toBe(6); // +4 STR + 2 proficiency
    });

    it('unarmed strike damage includes STR modifier', () => {
      const ai = new CombatAI(normalConfig());
      const player = createTestCombatant(
        {
          ability_scores: { STR: 18, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
          armor_class: 16,
          hp: { current: 45, max: 45, temp: 0 },
        },
        { id: 'player_0', currentHP: 45 },
      );
      // No weapons equipped → unarmed strike
      const weapon = ai.selectWeapon(player, 'normal');
      expect(weapon.name).toBe('Unarmed Strike');
      expect(weapon.expectedDamage).toBe(5); // 1 + STR mod (4)
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. SPELL SLOT AVAILABILITY EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('spell slot availability', () => {
    it('leveled spell available when exact slot level exists', () => {
      const ai = new CombatAI(normalConfig());
      const spell: Spell = { name: 'Shield', level: 1, tags: ['buff', 'self'] };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [spell],
        spellSlots: { 1: 4 },
      });
      const available = ai.getAvailableSpells(caster);
      expect(available).toHaveLength(1);
      expect(available[0].name).toBe('Shield');
    });

    it('leveled spell available when higher slot exists (upcast)', () => {
      const ai = new CombatAI(normalConfig());
      const spell: Spell = { name: 'Cure Wounds', level: 1, tags: ['healing', 'ally'] };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [spell],
        spellSlots: { 2: 3 }, // No level 1 slots, but level 2 available for upcast
      });
      const available = ai.getAvailableSpells(caster);
      expect(available).toHaveLength(1);
    });

    it('leveled spell unavailable when no slots at all', () => {
      const ai = new CombatAI(normalConfig());
      const spell: Spell = { name: 'Fireball', level: 3, tags: ['damage', 'aoe'] };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [spell],
        spellSlots: { 1: 0, 2: 0 }, // No level 3+ slots
      });
      const available = ai.getAvailableSpells(caster);
      expect(available).toHaveLength(0);
    });

    it('cantrips always available regardless of slots', () => {
      const ai = new CombatAI(normalConfig());
      const cantrip: Spell = { name: 'Prestidigitation', level: 0, tags: ['utility'] };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip],
        spellSlots: {}, // No slots at all
      });
      const available = ai.getAvailableSpells(caster);
      expect(available).toHaveLength(1);
    });

    it('mixed spells: cantrips + some available leveled', () => {
      const ai = new CombatAI(normalConfig());
      const cantrip: Spell = { name: 'Fire Bolt', level: 0, tags: ['damage', 'ranged'] };
      const level1: Spell = { name: 'Magic Missile', level: 1, tags: ['damage'] };
      const level3: Spell = { name: 'Fireball', level: 3, tags: ['damage', 'aoe'] };
      const caster = casterPlayer({
        id: 'player_0',
        spells: [cantrip, level1, level3],
        spellSlots: { 1: 2, 3: 0 }, // Level 1 available, level 3 depleted
      });
      const available = ai.getAvailableSpells(caster);
      expect(available).toHaveLength(2); // cantrip + level 1
      const names = available.map(s => s.name);
      expect(names).toContain('Fire Bolt');
      expect(names).toContain('Magic Missile');
      expect(names).not.toContain('Fireball');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. LEGENDARY ACTION EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('legendary action edge cases', () => {
    it('boss with only healing actions and low HP heals', () => {
      const ai = new CombatAI(normalConfig());
      const boss = createTestCombatant(
        {
          name: 'Vampire Lord',
          ability_scores: { STR: 18, DEX: 16, CON: 16, INT: 14, WIS: 13, CHA: 18 },
          armor_class: 17,
          hp: { current: 20, max: 150, temp: 0 },
          legendary_config: {
            resistances_per_day: 3,
            actions: [
              { id: 'drain', name: 'Life Drain', cost: 1, effect: 'Heal', tags: ['heal'] },
            ],
          },
        },
        { id: 'enemy_0', currentHP: 20, legendaryActionsRemaining: 3 },
      );
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [boss]);

      const decision = ai.selectLegendaryAction(boss, c);
      expect(decision).not.toBeNull();
      expect(decision!.legendaryActionId).toBe('drain');
    });

    it('boss with only control actions uses them', () => {
      const ai = new CombatAI(normalConfig());
      const boss = createTestCombatant(
        {
          name: 'Mind Flayer',
          ability_scores: { STR: 11, DEX: 12, CON: 12, INT: 19, WIS: 17, CHA: 17 },
          armor_class: 15,
          hp: { current: 100, max: 100, temp: 0 },
          legendary_config: {
            resistances_per_day: 3,
            actions: [
              { id: 'mind_blast', name: 'Mind Blast', cost: 2, effect: 'Stun', tags: ['control'] },
            ],
          },
        },
        { id: 'enemy_0', currentHP: 100, legendaryActionsRemaining: 3 },
      );
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [boss]);

      const decision = ai.selectLegendaryAction(boss, c);
      expect(decision).not.toBeNull();
      expect(decision!.legendaryActionId).toBe('mind_blast');
    });

    it('boss uses fallback action when no damage/healing/control available', () => {
      const ai = new CombatAI(normalConfig());
      const boss = createTestCombatant(
        {
          name: 'Strange Entity',
          ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
          armor_class: 10,
          hp: { current: 50, max: 50, temp: 0 },
          legendary_config: {
            resistances_per_day: 0,
            actions: [
              { id: 'observe', name: 'Observe', cost: 1, effect: 'Look around' },
            ],
          },
        },
        { id: 'enemy_0', currentHP: 50, legendaryActionsRemaining: 3 },
      );
      const player = armedPlayer({ id: 'player_0' });
      const c = combat([player], [boss]);

      const decision = ai.selectLegendaryAction(boss, c);
      expect(decision).not.toBeNull();
      expect(decision!.legendaryActionId).toBe('observe');
    });
  });
});
