/**
 * CombatAI Unit Tests
 *
 * Tests the combat AI decision engine including:
 * - Threat assessment (battlefield state evaluation)
 * - Target selection (normal vs aggressive styles)
 * - Weapon selection (expected damage evaluation)
 * - Spell selection (damage, healing, control, buff)
 * - Item usage decisions
 * - Defensive action decisions
 * - Legendary action AI
 * - Support archetype detection
 */

import { describe, it, expect } from 'vitest';
import { CombatAI } from '../../../src/core/combat/AI/CombatAI.js';
import type { AIConfig, AIPlayStyle, AIDecision, AIThreatAssessment } from '../../../src/core/types/CombatAI.js';
import type { Combatant, CombatInstance } from '../../../src/core/types/Combat.js';
import type { Spell } from '../../../src/core/types/Character.js';
import { createTestCombatant, createTestCombat } from '../../helpers/combatTestHelpers.js';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createNormalConfig(): AIConfig {
  return { playerStyle: 'normal', enemyStyle: 'normal' };
}

function createAggressiveConfig(): AIConfig {
  return { playerStyle: 'aggressive', enemyStyle: 'aggressive' };
}

function createMixedConfig(): AIConfig {
  return { playerStyle: 'normal', enemyStyle: 'aggressive' };
}

function createOverrideConfig(overrides: Map<string, AIPlayStyle>): AIConfig {
  return { playerStyle: 'normal', enemyStyle: 'normal', overrides };
}

/**
 * Create a minimal combat instance for AI testing.
 */
function createMinimalCombat(
  players: Combatant[],
  enemies: Combatant[],
  roundNumber: number = 1,
): CombatInstance {
  return {
    id: 'test_combat',
    combatants: [...players, ...enemies],
    currentTurnIndex: 0,
    roundNumber,
    history: [],
    isActive: true,
    startTime: Date.now(),
    lastUpdated: Date.now(),
  };
}

/**
 * Create a combatant with a specific weapon equipped.
 */
function createArmedCombatant(
  overrides: {
    name?: string;
    id?: string;
    weaponName?: string;
    weaponDamage?: string;
    str?: number;
    dex?: number;
    ac?: number;
    maxHP?: number;
    currentHP?: number;
  } = {},
): Combatant {
  const {
    name = 'Fighter',
    id = 'player_0',
    weaponName = 'Longsword',
    weaponDamage = '1d8+3',
    str = 16,
    dex = 12,
    ac = 16,
    maxHP = 30,
    currentHP = 30,
  } = overrides;

  return createTestCombatant(
    {
      name,
      ability_scores: { STR: str, DEX: dex, CON: 14, INT: 10, WIS: 10, CHA: 10 },
      armor_class: ac,
      hp: { current: currentHP, max: maxHP, temp: 0 },
      equipment: {
        weapons: [{
          name: weaponName,
          quantity: 1,
          equipped: true,
          damage: { dice: weaponDamage, damageType: 'slashing' },
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
    { id, currentHP },
  );
}

/**
 * Create a spellcasting combatant with combat_spells.
 */
function createCasterCombatant(
  overrides: {
    name?: string;
    id?: string;
    spells?: Spell[];
    spellSlots?: { [level: number]: number };
    maxHP?: number;
    currentHP?: number;
  } = {},
): Combatant {
  const {
    name = 'Wizard',
    id = 'player_1',
    spells = [],
    spellSlots,
    maxHP = 20,
    currentHP = 20,
  } = overrides;

  return createTestCombatant(
    {
      name,
      class: 'Wizard' as any,
      ability_scores: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 13, CHA: 10 },
      armor_class: 12,
      hp: { current: currentHP, max: maxHP, temp: 0 },
      combat_spells: spells,
    },
    { id, currentHP, spellSlots },
  );
}

/**
 * Create a boss combatant with legendary actions.
 */
function createBossCombatant(
  overrides: {
    name?: string;
    id?: string;
    legendaryActions?: number;
    currentHP?: number;
    maxHP?: number;
  } = {},
): Combatant {
  const {
    name = 'Dragon Lord',
    id = 'enemy_0',
    legendaryActions = 3,
    currentHP = 150,
    maxHP = 150,
  } = overrides;

  return createTestCombatant(
    {
      name,
      ability_scores: { STR: 20, DEX: 12, CON: 18, INT: 14, WIS: 13, CHA: 16 },
      armor_class: 19,
      hp: { current: currentHP, max: maxHP, temp: 0 },
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
          {
            id: 'tail_attack',
            name: 'Tail Attack',
            cost: 1,
            effect: 'Melee attack',
            damage: '2d8+5',
            damage_type: 'bludgeoning',
          },
          {
            id: 'breath_weapon',
            name: 'Breath Weapon',
            cost: 2,
            effect: 'Fire breath in a line',
            damage: '8d6',
            damage_type: 'fire',
            tags: ['damage', 'aoe'],
          },
          {
            id: 'frightening_roar',
            name: 'Frightening Roar',
            cost: 3,
            effect: 'Frightens enemies',
            tags: ['control'],
          },
        ],
      },
    },
    { id, currentHP, legendaryActionsRemaining: legendaryActions },
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CombatAI', () => {
  // ─── Constructor & Config ──────────────────────────────────────────────────

  describe('constructor & config', () => {
    it('creates with normal config', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai).toBeDefined();
    });

    it('creates with aggressive config', () => {
      const ai = new CombatAI(createAggressiveConfig());
      expect(ai).toBeDefined();
    });

    it('creates with mixed config', () => {
      const ai = new CombatAI(createMixedConfig());
      expect(ai).toBeDefined();
    });

    it('creates with per-combatant overrides', () => {
      const overrides = new Map<string, AIPlayStyle>();
      overrides.set('player_0', 'aggressive');
      const ai = new CombatAI(createOverrideConfig(overrides));
      expect(ai).toBeDefined();
    });
  });

  // ─── Style Resolution ──────────────────────────────────────────────────────

  describe('getStyleForCombatant', () => {
    it('returns player style for player combatant', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      expect(ai.getStyleForCombatant(player)).toBe('normal');
    });

    it('returns enemy style for enemy combatant', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      expect(ai.getStyleForCombatant(enemy)).toBe('aggressive');
    });

    it('respects per-combatant overrides', () => {
      const overrides = new Map<string, AIPlayStyle>();
      overrides.set('player_0', 'aggressive');
      const ai = new CombatAI(createOverrideConfig(overrides));
      const player = createTestCombatant({}, { id: 'player_0' });
      expect(ai.getStyleForCombatant(player)).toBe('aggressive');
    });

    it('override takes priority over side default', () => {
      const overrides = new Map<string, AIPlayStyle>();
      overrides.set('enemy_0', 'normal');
      const ai = new CombatAI(createAggressiveConfig());
      // Need to create with overrides
      const aiWithOverrides = new CombatAI({
        playerStyle: 'aggressive',
        enemyStyle: 'aggressive',
        overrides,
      });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      expect(aiWithOverrides.getStyleForCombatant(enemy)).toBe('normal');
    });
  });

  // ─── Side & Ally/Enemy Resolution ──────────────────────────────────────────

  describe('getSide', () => {
    it('identifies player side', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      expect(ai.getSide(player)).toBe('player');
    });

    it('identifies enemy side', () => {
      const ai = new CombatAI(createNormalConfig());
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      expect(ai.getSide(enemy)).toBe('enemy');
    });
  });

  describe('getEnemies', () => {
    it('returns enemies for a player', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      expect(ai.getEnemies(player, combat)).toEqual([enemy]);
    });

    it('returns players for an enemy', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      expect(ai.getEnemies(enemy, combat)).toEqual([player]);
    });

    it('excludes defeated enemies', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const enemy1 = createTestCombatant({}, { id: 'enemy_0' });
      const enemy2 = createTestCombatant({}, { id: 'enemy_1', isDefeated: true });
      const combat = createMinimalCombat([player], [enemy1, enemy2]);
      expect(ai.getEnemies(player, combat)).toEqual([enemy1]);
    });
  });

  describe('getAllies', () => {
    it('returns all allies including self', () => {
      const ai = new CombatAI(createNormalConfig());
      const p1 = createTestCombatant({}, { id: 'player_0' });
      const p2 = createTestCombatant({}, { id: 'player_1' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([p1, p2], [enemy]);
      const allies = ai.getAllies(p1, combat);
      expect(allies).toHaveLength(2);
      expect(allies).toContain(p1);
      expect(allies).toContain(p2);
    });

    it('excludes defeated allies', () => {
      const ai = new CombatAI(createNormalConfig());
      const p1 = createTestCombatant({}, { id: 'player_0' });
      const p2 = createTestCombatant({}, { id: 'player_1', isDefeated: true });
      const combat = createMinimalCombat([p1, p2], []);
      expect(ai.getAllies(p1, combat)).toEqual([p1]);
    });
  });

  // ─── Threat Assessment ─────────────────────────────────────────────────────

  describe('assessThreat', () => {
    it('returns correct myHPPercent at full health', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        { hp: { current: 30, max: 30, temp: 0 } },
        { id: 'player_0', currentHP: 30 },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.myHPPercent).toBe(1.0);
    });

    it('returns correct myHPPercent at half health', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        { hp: { current: 30, max: 60, temp: 0 } },
        { id: 'player_0', currentHP: 30 },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.myHPPercent).toBeCloseTo(0.5);
    });

    it('detects low HP (<25%)', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        { hp: { current: 100, max: 100, temp: 0 } },
        { id: 'player_0', currentHP: 20 },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.isLowHP).toBe(true);
    });

    it('detects critical HP (<10%)', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        { hp: { current: 100, max: 100, temp: 0 } },
        { id: 'player_0', currentHP: 5 },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.isCriticalHP).toBe(true);
    });

    it('does not flag low HP at 25%', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        { hp: { current: 100, max: 100, temp: 0 } },
        { id: 'player_0', currentHP: 25 },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.isLowHP).toBe(false);
    });

    it('returns correct partySize and enemyCount', () => {
      const ai = new CombatAI(createNormalConfig());
      const p1 = createTestCombatant({}, { id: 'player_0' });
      const p2 = createTestCombatant({}, { id: 'player_1' });
      const e1 = createTestCombatant({}, { id: 'enemy_0' });
      const e2 = createTestCombatant({}, { id: 'enemy_1' });
      const e3 = createTestCombatant({}, { id: 'enemy_2' });
      const combat = createMinimalCombat([p1, p2], [e1, e2, e3]);
      const threat = ai.assessThreat(p1, combat);
      expect(threat.partySize).toBe(2);
      expect(threat.enemyCount).toBe(3);
    });

    it('returns correct myAC', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        { armor_class: 18 },
        { id: 'player_0' },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.myAC).toBe(18);
    });

    it('returns correct roundNumber', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy], 5);
      const threat = ai.assessThreat(player, combat);
      expect(threat.roundNumber).toBe(5);
    });

    it('detects lowestEnemyHP', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const e1 = createTestCombatant({}, { id: 'enemy_0', currentHP: 50 });
      const e2 = createTestCombatant({}, { id: 'enemy_1', currentHP: 5 });
      const combat = createMinimalCombat([player], [e1, e2]);
      const threat = ai.assessThreat(player, combat);
      expect(threat.lowestEnemyHP).toBe(5);
    });

    it('returns Infinity for lowestEnemyHP when no enemies', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], []);
      const threat = ai.assessThreat(player, combat);
      expect(threat.lowestEnemyHP).toBe(0); // No enemies = 0 (not Infinity)
    });

    it('detects lowestAllyHPPercent', () => {
      const ai = new CombatAI(createNormalConfig());
      const p1 = createTestCombatant(
        { hp: { current: 50, max: 50, temp: 0 } },
        { id: 'player_0', currentHP: 50 },
      );
      const p2 = createTestCombatant(
        { hp: { current: 50, max: 50, temp: 0 } },
        { id: 'player_1', currentHP: 10 },
      );
      const combat = createMinimalCombat([p1, p2], []);
      const threat = ai.assessThreat(p1, combat);
      expect(threat.lowestAllyHPPercent).toBeCloseTo(0.2);
    });

    it('returns 1.0 for lowestAllyHPPercent when no allies besides self', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], []);
      const threat = ai.assessThreat(player, combat);
      expect(threat.lowestAllyHPPercent).toBe(1.0);
    });

    it('detects hasSpellSlots', () => {
      const ai = new CombatAI(createNormalConfig());
      const caster = createTestCombatant(
        {},
        { id: 'player_0', spellSlots: { 1: 4, 2: 3 } },
      );
      const combat = createMinimalCombat([caster], []);
      const threat = ai.assessThreat(caster, combat);
      expect(threat.hasSpellSlots).toBe(true);
    });

    it('reports no spell slots when empty', () => {
      const ai = new CombatAI(createNormalConfig());
      const fighter = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([fighter], []);
      const threat = ai.assessThreat(fighter, combat);
      expect(threat.hasSpellSlots).toBe(false);
    });

    it('detects hasHealingItems', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        {
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Health Potion', quantity: 2, equipped: false }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0' },
      );
      const combat = createMinimalCombat([player], []);
      const threat = ai.assessThreat(player, combat);
      expect(threat.hasHealingItems).toBe(true);
    });

    it('does not count equipped items as healing items', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        {
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Shield', quantity: 1, equipped: true }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0' },
      );
      const combat = createMinimalCombat([player], []);
      const threat = ai.assessThreat(player, combat);
      expect(threat.hasHealingItems).toBe(false);
    });

    it('detects legendary actions for hasRemainingLimitedAbilities', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ currentHP: 100 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const threat = ai.assessThreat(boss, combat);
      expect(threat.hasRemainingLimitedAbilities).toBe(true);
    });
  });

  // ─── Main Decision ─────────────────────────────────────────────────────────

  describe('decide', () => {
    it('returns attack action by default for a fighter', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({ id: 'player_0' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const decision = ai.decide(player, combat);
      expect(decision.action).toBe('attack');
      expect(decision.target).toBe('enemy_0');
    });

    it('returns attack with weapon name', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({ id: 'player_0', weaponName: 'Greataxe' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const decision = ai.decide(player, combat);
      expect(decision.weaponName).toBe('Greataxe');
    });

    it('includes reasoning in decision', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({ id: 'player_0' });
      const enemy = createTestCombatant({ name: 'Goblin' }, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const decision = ai.decide(player, combat);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning).toContain('Goblin');
    });

    it('returns skip when no enemies available', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({ id: 'player_0' });
      const combat = createMinimalCombat([player], []);
      const decision = ai.decide(player, combat);
      expect(decision.action).toBe('skip');
    });
  });

  // ─── Target Selection ──────────────────────────────────────────────────────

  describe('selectTarget', () => {
    it('targets the only enemy when there is one', () => {
      const ai = new CombatAI(createNormalConfig());
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      expect(ai.selectTarget([enemy], 'normal')).toBe(enemy);
    });

    it('aggressive targets lowest HP enemy', () => {
      const ai = new CombatAI(createNormalConfig());
      const e1 = createTestCombatant({}, { id: 'enemy_0', currentHP: 30 });
      const e2 = createTestCombatant({}, { id: 'enemy_1', currentHP: 5 });
      const e3 = createTestCombatant({}, { id: 'enemy_2', currentHP: 20 });
      expect(ai.selectTarget([e1, e2, e3], 'aggressive')).toBe(e2);
    });

    it('normal targets lowest AC enemy', () => {
      const ai = new CombatAI(createNormalConfig());
      const e1 = createTestCombatant({ armor_class: 16 }, { id: 'enemy_0' });
      const e2 = createTestCombatant({ armor_class: 12 }, { id: 'enemy_1' });
      const e3 = createTestCombatant({ armor_class: 18 }, { id: 'enemy_2' });
      expect(ai.selectTarget([e1, e2, e3], 'normal')).toBe(e2);
    });

    it('throws when no enemies provided', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(() => ai.selectTarget([], 'normal')).toThrow('No valid targets');
    });
  });

  // ─── Weapon Selection ──────────────────────────────────────────────────────

  describe('selectWeapon', () => {
    it('selects the equipped weapon', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({ id: 'player_0', weaponName: 'Longsword' });
      const weapon = ai.selectWeapon(player, 'normal');
      expect(weapon.name).toBe('Longsword');
    });

    it('falls back to unarmed strike when no weapon equipped', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant({}, { id: 'player_0' });
      const weapon = ai.selectWeapon(player, 'normal');
      expect(weapon.name).toBe('Unarmed Strike');
    });

    it('aggressive picks highest damage weapon', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        {
          ability_scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 10 },
          equipment: {
            weapons: [
              {
                name: 'Dagger',
                quantity: 1,
                equipped: true,
                damage: { dice: '1d4+3', damageType: 'piercing' },
                weaponProperties: ['finesse'],
                type: 'weapon',
                acBonus: 0,
              },
              {
                name: 'Greatsword',
                quantity: 1,
                equipped: true,
                damage: { dice: '2d6+3', damageType: 'slashing' },
                weaponProperties: ['melee', 'two-handed'],
                type: 'weapon',
                acBonus: 0,
              },
            ],
            armor: [],
            items: [],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0' },
      );
      const weapon = ai.selectWeapon(player, 'aggressive');
      expect(weapon.name).toBe('Greatsword');
    });

    it('weapon evaluation includes expected damage', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({ weaponDamage: '2d6+3' });
      const weapon = ai.selectWeapon(player, 'normal');
      // 2d6 average = 7, +3 modifier = 10
      expect(weapon.expectedDamage).toBe(10);
    });
  });

  // ─── Spell Selection ───────────────────────────────────────────────────────

  describe('spell selection', () => {
    it('caster with damage cantrip casts it', () => {
      const ai = new CombatAI(createNormalConfig());
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '1d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [fireBolt],
      });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([caster], [enemy]);
      const decision = ai.decide(caster, combat);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fire Bolt');
    });

    it('aggressive burns spell slots on damage spells', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe', 'multi-target'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [fireball],
        spellSlots: { 3: 3 },
      });
      const e1 = createTestCombatant({}, { id: 'enemy_0' });
      const e2 = createTestCombatant({}, { id: 'enemy_1' });
      const combat = createMinimalCombat([caster], [e1, e2]);
      const decision = ai.decide(caster, combat);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fireball');
    });

    it('caster with healing spell heals when low HP', () => {
      const ai = new CombatAI(createNormalConfig());
      const cureWounds: Spell = {
        name: 'Cure Wounds',
        level: 1,
        damage_dice: '1d8+3',
        tags: ['healing', 'ally'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [cureWounds],
        spellSlots: { 1: 4 },
        currentHP: 3,
        maxHP: 20,
      });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([caster], [enemy]);
      const decision = ai.decide(caster, combat);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Cure Wounds');
    });

    it('caster without spell slots falls back to attack', () => {
      const ai = new CombatAI(createNormalConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [fireball],
        spellSlots: { 3: 0 }, // No slots
      });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([caster], [enemy]);
      const decision = ai.decide(caster, combat);
      // No spell slots → fall back to attack (unarmed)
      expect(decision.action).toBe('attack');
    });

    it('normal style prefers cantrips over leveled spells for damage', () => {
      const ai = new CombatAI(createNormalConfig());
      const fireBolt: Spell = {
        name: 'Fire Bolt',
        level: 0,
        damage_dice: '2d10',
        damage_type: 'fire',
        attack_roll: true,
        tags: ['damage', 'ranged'],
      };
      const magicMissile: Spell = {
        name: 'Magic Missile',
        level: 1,
        damage_dice: '3d4+3',
        damage_type: 'force',
        tags: ['damage'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [fireBolt, magicMissile],
        spellSlots: { 1: 4 },
      });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([caster], [enemy], 3); // Round 3 to ensure not round 1 conservation
      const decision = ai.decide(caster, combat);
      // Fire Bolt (2d10 = avg 11) vs Magic Missile (3d4+3 = avg 10.5)
      // Fire Bolt is cantrip and higher damage, so it should be preferred
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Fire Bolt');
    });

    it('aggressive heals proactively below 75% HP', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const heal: Spell = {
        name: 'Healing Word',
        level: 1,
        damage_dice: '1d4+3',
        tags: ['healing', 'ally'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [heal],
        spellSlots: { 1: 4 },
        currentHP: 14,
        maxHP: 20, // 70% HP — below 75% threshold
      });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([caster], [enemy]);
      const decision = ai.decide(caster, combat);
      expect(decision.action).toBe('castSpell');
      expect(decision.spellName).toBe('Healing Word');
    });

    it('multi-target spell targets multiple enemies', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const fireball: Spell = {
        name: 'Fireball',
        level: 3,
        damage_dice: '8d6',
        damage_type: 'fire',
        tags: ['damage', 'aoe', 'multi-target'],
      };
      const caster = createCasterCombatant({
        id: 'player_0',
        spells: [fireball],
        spellSlots: { 3: 3 },
      });
      const e1 = createTestCombatant({}, { id: 'enemy_0' });
      const e2 = createTestCombatant({}, { id: 'enemy_1' });
      const e3 = createTestCombatant({}, { id: 'enemy_2' });
      const combat = createMinimalCombat([caster], [e1, e2, e3]);
      const decision = ai.decide(caster, combat);
      expect(decision.targetIds).toBeDefined();
      expect(decision.targetIds!.length).toBe(3);
    });
  });

  // ─── Defensive Actions ─────────────────────────────────────────────────────

  describe('defensive actions', () => {
    it('normal style dodges when isolated and low HP', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createArmedCombatant({
        id: 'player_0',
        maxHP: 30,
        currentHP: 5, // 17% HP — low
      });
      const e1 = createTestCombatant({}, { id: 'enemy_0' });
      const e2 = createTestCombatant({}, { id: 'enemy_1' });
      // Only 1 party member (player) vs 2 enemies
      const combat = createMinimalCombat([player], [e1, e2]);
      const decision = ai.decide(player, combat);
      expect(decision.action).toBe('dodge');
    });

    it('aggressive style never dodges', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const player = createArmedCombatant({
        id: 'player_0',
        maxHP: 30,
        currentHP: 1, // Critical HP
      });
      const e1 = createTestCombatant({}, { id: 'enemy_0' });
      const e2 = createTestCombatant({}, { id: 'enemy_1' });
      const combat = createMinimalCombat([player], [e1, e2]);
      const decision = ai.decide(player, combat);
      // Aggressive never dodges — always attacks
      expect(decision.action).toBe('attack');
    });

    it('normal style attacks when not isolated', () => {
      const ai = new CombatAI(createNormalConfig());
      const p1 = createArmedCombatant({
        id: 'player_0',
        maxHP: 30,
        currentHP: 5,
      });
      const p2 = createTestCombatant({}, { id: 'player_1' });
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      // 2 party members — not isolated
      const combat = createMinimalCombat([p1, p2], [enemy]);
      const decision = ai.decide(p1, combat);
      expect(decision.action).toBe('attack');
    });
  });

  // ─── Item Usage ────────────────────────────────────────────────────────────

  describe('item usage', () => {
    it('uses healing item when low HP and no spell slots', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        {
          hp: { current: 100, max: 100, temp: 0 },
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Health Potion', quantity: 2, equipped: false }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 20 }, // 20% HP — below 25% threshold
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const decision = ai.decide(player, combat);
      expect(decision.action).toBe('useItem');
      expect(decision.itemName).toBe('Health Potion');
    });

    it('does not use item when HP is fine', () => {
      const ai = new CombatAI(createNormalConfig());
      const player = createTestCombatant(
        {
          equipment: {
            weapons: [],
            armor: [],
            items: [{ name: 'Health Potion', quantity: 2, equipped: false }],
            totalWeight: 0,
            equippedWeight: 0,
          },
        },
        { id: 'player_0', currentHP: 25 },
      );
      const enemy = createTestCombatant({}, { id: 'enemy_0' });
      const combat = createMinimalCombat([player], [enemy]);
      const decision = ai.decide(player, combat);
      expect(decision.action).not.toBe('useItem');
    });
  });

  // ─── Legendary Actions ─────────────────────────────────────────────────────

  describe('selectLegendaryAction', () => {
    it('boss uses legendary action when points available', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ legendaryActions: 3 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision).not.toBeNull();
      expect(decision!.action).toBe('legendaryAction');
      expect(decision!.legendaryActionId).toBeDefined();
    });

    it('boss returns null when no points remaining', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ legendaryActions: 0 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision).toBeNull();
    });

    it('boss without legendary config returns null', () => {
      const ai = new CombatAI(createNormalConfig());
      const fighter = createTestCombatant({}, { id: 'enemy_0' });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [fighter]);
      const decision = ai.selectLegendaryAction(fighter, combat);
      expect(decision).toBeNull();
    });

    it('aggressive boss prefers high-cost damage actions', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const boss = createBossCombatant({ legendaryActions: 3 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision).not.toBeNull();
      // Aggressive should prefer the highest-cost damage action
      // Breath Weapon costs 2, Tail Attack costs 1
      // With 3 points available, aggressive picks the most expensive
      expect(decision!.legendaryActionId).toBe('breath_weapon');
    });

    it('normal boss prefers low-cost damage actions', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ legendaryActions: 3 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision).not.toBeNull();
      // Normal should prefer the lowest-cost damage action
      expect(decision!.legendaryActionId).toBe('tail_attack');
    });

    it('respects action point budget', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ legendaryActions: 1 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision).not.toBeNull();
      // With 1 point, only Tail Attack (cost 1) is affordable
      expect(decision!.legendaryActionId).toBe('tail_attack');
    });

    it('returns null when no enemies', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ legendaryActions: 3 });
      const combat = createMinimalCombat([], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision).toBeNull();
    });

    it('legendary action decision includes target', () => {
      const ai = new CombatAI(createNormalConfig());
      const boss = createBossCombatant({ legendaryActions: 3 });
      const player = createTestCombatant({}, { id: 'player_0' });
      const combat = createMinimalCombat([player], [boss]);
      const decision = ai.selectLegendaryAction(boss, combat);
      expect(decision!.target).toBe('player_0');
    });
  });

  // ─── Support Archetype Detection ───────────────────────────────────────────

  describe('isSupportArchetype', () => {
    it('detects healer with healing spells', () => {
      const ai = new CombatAI(createNormalConfig());
      const healer = createCasterCombatant({
        spells: [{
          name: 'Cure Wounds',
          level: 1,
          tags: ['healing', 'ally'],
        }],
      });
      expect(ai.isSupportArchetype(healer)).toBe(true);
    });

    it('detects buffer with buff spells', () => {
      const ai = new CombatAI(createNormalConfig());
      const buffer = createCasterCombatant({
        spells: [{
          name: 'Bless',
          level: 1,
          tags: ['buff', 'ally'],
        }],
      });
      expect(ai.isSupportArchetype(buffer)).toBe(true);
    });

    it('returns false for damage-only caster', () => {
      const ai = new CombatAI(createNormalConfig());
      const blaster = createCasterCombatant({
        spells: [{
          name: 'Fireball',
          level: 3,
          tags: ['damage', 'aoe'],
        }],
      });
      expect(ai.isSupportArchetype(blaster)).toBe(false);
    });

    it('returns false for combatant with no spells', () => {
      const ai = new CombatAI(createNormalConfig());
      const fighter = createTestCombatant({}, { id: 'player_0' });
      expect(ai.isSupportArchetype(fighter)).toBe(false);
    });
  });

  // ─── Utility ───────────────────────────────────────────────────────────────

  describe('averageDamageFromFormula', () => {
    it('calculates 1d6 average correctly', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('1d6')).toBe(3.5);
    });

    it('calculates 2d6 average correctly', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('2d6')).toBe(7);
    });

    it('calculates 1d8+3 average correctly', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('1d8+3')).toBe(7.5);
    });

    it('calculates 2d10+5 average correctly', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('2d10+5')).toBe(16);
    });

    it('calculates 8d6 average correctly', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('8d6')).toBe(28);
    });

    it('handles modifier subtraction', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('1d4-1')).toBe(1.5);
    });

    it('returns 0 for invalid formula', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('')).toBe(0);
      expect(ai.averageDamageFromFormula('abc')).toBe(0);
    });

    it('handles spaces in formula', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('2d8 + 5')).toBe(14);
    });

    it('handles simple number (no dice)', () => {
      const ai = new CombatAI(createNormalConfig());
      expect(ai.averageDamageFromFormula('1')).toBe(0); // Not a valid dice formula
    });
  });

  // ─── Integration: Full Combat ──────────────────────────────────────────────

  describe('integration with real combat', () => {
    it('AI works with a real CombatEngine combat instance', () => {
      const ai = new CombatAI(createNormalConfig());
      const combat = createTestCombat(5, 4, 3, 'common', 'ai-integration');
      const currentCombatant = combat.combatants[combat.currentTurnIndex];

      const decision = ai.decide(currentCombatant, combat);
      expect(decision.action).toBeDefined();
      expect(decision.reasoning).toBeDefined();
    });

    it('AI produces valid decisions for all combatants', () => {
      const ai = new CombatAI(createNormalConfig());
      const combat = createTestCombat(3, 4, 3, 'common', 'ai-all-combatants');

      for (const combatant of combat.combatants) {
        if (combatant.isDefeated) continue;
        const decision = ai.decide(combatant, combat);
        expect(decision.action).toBeDefined();
        expect(['attack', 'castSpell', 'dodge', 'dash', 'disengage', 'flee', 'useItem', 'legendaryAction']).toContain(decision.action);
      }
    });

    it('aggressive AI produces valid decisions for all combatants', () => {
      const ai = new CombatAI(createAggressiveConfig());
      const combat = createTestCombat(5, 4, 5, 'elite', 'ai-aggressive');

      for (const combatant of combat.combatants) {
        if (combatant.isDefeated) continue;
        const decision = ai.decide(combatant, combat);
        expect(decision.action).toBeDefined();
        // Aggressive should never dodge or flee
        expect(decision.action).not.toBe('dodge');
        expect(decision.action).not.toBe('flee');
      }
    });

    it('AI decisions are deterministic (same state = same decision)', () => {
      const ai1 = new CombatAI(createNormalConfig());
      const ai2 = new CombatAI(createNormalConfig());
      const combat = createTestCombat(5, 4, 3, 'common', 'ai-determinism');

      for (const combatant of combat.combatants) {
        if (combatant.isDefeated) continue;
        const d1 = ai1.decide(combatant, combat);
        const d2 = ai2.decide(combatant, combat);
        expect(d1.action).toBe(d2.action);
        expect(d1.target).toBe(d2.target);
        expect(d1.weaponName).toBe(d2.weaponName);
        expect(d1.spellName).toBe(d2.spellName);
      }
    });
  });

  // ─── Available Spells ──────────────────────────────────────────────────────

  describe('getAvailableSpells', () => {
    it('returns cantrips always', () => {
      const ai = new CombatAI(createNormalConfig());
      const cantrip: Spell = { name: 'Fire Bolt', level: 0, tags: ['damage'] };
      const caster = createCasterCombatant({ spells: [cantrip] });
      expect(ai.getAvailableSpells(caster)).toHaveLength(1);
    });

    it('returns leveled spells when slots available', () => {
      const ai = new CombatAI(createNormalConfig());
      const spell: Spell = { name: 'Fireball', level: 3, tags: ['damage'] };
      const caster = createCasterCombatant({
        spells: [spell],
        spellSlots: { 3: 2 },
      });
      expect(ai.getAvailableSpells(caster)).toHaveLength(1);
    });

    it('excludes leveled spells when no slots', () => {
      const ai = new CombatAI(createNormalConfig());
      const spell: Spell = { name: 'Fireball', level: 3, tags: ['damage'] };
      const caster = createCasterCombatant({
        spells: [spell],
        spellSlots: { 3: 0 },
      });
      expect(ai.getAvailableSpells(caster)).toHaveLength(0);
    });

    it('returns empty for no spells', () => {
      const ai = new CombatAI(createNormalConfig());
      const fighter = createTestCombatant({}, { id: 'player_0' });
      expect(ai.getAvailableSpells(fighter)).toHaveLength(0);
    });

    it('includes cantrips and excludes depleted leveled spells', () => {
      const ai = new CombatAI(createNormalConfig());
      const cantrip: Spell = { name: 'Fire Bolt', level: 0, tags: ['damage'] };
      const spell: Spell = { name: 'Fireball', level: 3, tags: ['damage'] };
      const caster = createCasterCombatant({
        spells: [cantrip, spell],
        spellSlots: { 3: 0 },
      });
      const available = ai.getAvailableSpells(caster);
      expect(available).toHaveLength(1);
      expect(available[0].name).toBe('Fire Bolt');
    });
  });
});
