/**
 * Concentration Tracking Tests (Task 1.3.6)
 *
 * Tests for D&D 5e concentration mechanics:
 * - applyStatusEffect() tracks concentratingOn for concentration effects
 * - New concentration spell drops previous concentration effect
 * - Concentration save: DC 10 or half damage (whichever higher), CON save
 * - Attack damage can break concentration
 * - Spell damage can break concentration
 * - Start-of-turn damage (Burning, Poison) can break concentration
 * - Defeated combatants automatically lose concentration
 * - Incapacitated (Stunned) combatants lose concentration
 * - Concentration clears when the effect expires naturally
 * - dropConcentration() and checkConcentration() methods
 * - Non-concentration effects don't interfere with concentration tracking
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { SeededDiceRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { StatusEffect, CombatInstance, Attack, Spell } from '../../../src/core/types/Combat.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEffect(name: string, duration: number, overrides?: Partial<StatusEffect>): StatusEffect {
  return {
    name,
    description: `${name} effect`,
    duration,
    ...overrides,
  };
}

function basicAttack(): Attack {
  return {
    name: 'Longsword',
    damage_dice: '1d8',
    damage_type: 'slashing',
    type: 'melee',
    attack_bonus: 5,
    properties: [],
  };
}

function startSimpleCombat(): { engine: CombatEngine; combat: CombatInstance; player: any; enemy: any } {
  const engine = new CombatEngine();
  const player = createMockPartyCharacter(1, { name: 'Hero' });
  const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
  const combat = engine.startCombat([player], [enemy]);

  const p = combat.combatants.find(c => c.id.startsWith('player'))!;
  const e = combat.combatants.find(c => c.id.startsWith('enemy'))!;

  return { engine, combat, player: p, enemy: e };
}

function concentrationSpell(): Spell {
  return {
    name: 'Charm Person',
    level: 1,
    damage_dice: '',
    damage_type: '',
    description: 'charm',
    range: 30,
  };
}

function damageSpell(): Spell {
  return {
    name: 'Fireball',
    level: 3,
    damage_dice: '8d6',
    damage_type: 'fire',
    description: 'A fireball explodes',
    range: 60,
    saving_throw: 'dexterity',
  };
}

// ─── applyStatusEffect concentration tracking ──────────────────────────────

describe('Concentration Tracking', () => {
  describe('applyStatusEffect — tracking', () => {
    it('sets concentratingOn when a concentration effect is applied', () => {
      const engine = new CombatEngine();
      const combatant = createTestCombatant();
      const effect = makeEffect('Blessed', 10, { hasConcentration: true });

      engine.applyStatusEffect(combatant, effect);

      expect(combatant.concentratingOn).toBe('Blessed');
      expect(combatant.statusEffects).toHaveLength(1);
    });

    it('does not set concentratingOn for non-concentration effects', () => {
      const engine = new CombatEngine();
      const combatant = createTestCombatant();
      const effect = makeEffect('Raging', 10);

      engine.applyStatusEffect(combatant, effect);

      expect(combatant.concentratingOn).toBeUndefined();
    });

    it('updates concentratingOn when stacking a concentration effect', () => {
      const engine = new CombatEngine();
      const combatant = createTestCombatant();

      engine.applyStatusEffect(combatant, makeEffect('Blessed', 3, { hasConcentration: true }));
      expect(combatant.concentratingOn).toBe('Blessed');

      // Re-apply same effect with longer duration
      engine.applyStatusEffect(combatant, makeEffect('Blessed', 10, { hasConcentration: true }));
      expect(combatant.concentratingOn).toBe('Blessed');
      expect(combatant.statusEffects).toHaveLength(1);
      expect(combatant.statusEffects[0].duration).toBe(10);
    });
  });

  describe('applyStatusEffect — one concentration at a time', () => {
    it('drops previous concentration effect when a new one is applied', () => {
      const engine = new CombatEngine();
      const combatant = createTestCombatant();

      engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, {
        hasConcentration: true,
        source: 'enemy_0',
      }));
      expect(combatant.concentratingOn).toBe('Charmed');
      expect(combatant.statusEffects).toHaveLength(1);

      // Apply new concentration effect — should drop Charmed
      engine.applyStatusEffect(combatant, makeEffect('Frightened', 5, {
        hasConcentration: true,
        source: 'enemy_0',
      }));

      expect(combatant.concentratingOn).toBe('Frightened');
      expect(combatant.statusEffects).toHaveLength(1);
      expect(combatant.statusEffects[0].name).toBe('Frightened');
    });

    it('does not drop non-concentration effects when applying concentration', () => {
      const engine = new CombatEngine();
      const combatant = createTestCombatant();

      // Apply a non-concentration effect first
      engine.applyStatusEffect(combatant, makeEffect('Raging', 5));
      expect(combatant.statusEffects).toHaveLength(1);

      // Apply concentration effect — Rage should persist
      engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

      expect(combatant.concentratingOn).toBe('Charmed');
      expect(combatant.statusEffects).toHaveLength(2);
      expect(combatant.statusEffects.map(e => e.name)).toContain('Raging');
      expect(combatant.statusEffects.map(e => e.name)).toContain('Charmed');
    });

    it('can re-apply the same concentration effect without dropping it', () => {
      const engine = new CombatEngine();
      const combatant = createTestCombatant();

      engine.applyStatusEffect(combatant, makeEffect('Charmed', 2, { hasConcentration: true }));
      engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

      // Same-name effect refreshes duration, doesn't drop
      expect(combatant.concentratingOn).toBe('Charmed');
      expect(combatant.statusEffects).toHaveLength(1);
      expect(combatant.statusEffects[0].duration).toBe(5);
    });
  });
});

// ─── dropConcentration ─────────────────────────────────────────────────────

describe('dropConcentration', () => {
  it('removes the concentrated effect from the combatant', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));
    expect(combatant.concentratingOn).toBe('Charmed');

    const dropped = engine.dropConcentration(combatant);

    expect(dropped).toBeDefined();
    expect(dropped!.name).toBe('Charmed');
    expect(combatant.concentratingOn).toBeUndefined();
    expect(combatant.statusEffects).toHaveLength(0);
  });

  it('returns undefined when not concentrating', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    const result = engine.dropConcentration(combatant);

    expect(result).toBeUndefined();
  });

  it('clears concentratingOn even if the effect was already removed', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));
    // Manually remove the effect (simulating expiration)
    combatant.statusEffects = [];

    const dropped = engine.dropConcentration(combatant);

    expect(dropped).toBeUndefined();
    expect(combatant.concentratingOn).toBeUndefined();
  });

  it('does not remove non-concentration effects', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Raging', 5));
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

    engine.dropConcentration(combatant);

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Raging');
  });
});

// ─── checkConcentration via damage ─────────────────────────────────────────

describe('Concentration save on damage', () => {
  it('does not trigger for non-concentrating combatants', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Target is not concentrating
    const broken = engine.checkConcentration(combat, target, 20);

    expect(broken).toBe(false);
    expect(combat.history).toHaveLength(0);
  });

  it('concentration breaks when damage is high enough (DC 10 minimum)', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      { ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
      { currentHP: 50 }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [combatant],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

    // With CON +0 and no proficiency, need to roll 10+ on d20 to maintain
    // Over many tries, some should fail
    let brokenAtLeastOnce = false;
    for (let i = 0; i < 200; i++) {
      combatant.concentratingOn = 'Charmed';
      combatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];

      const broken = engine.checkConcentration(combat, combatant, 5);
      if (broken) {
        brokenAtLeastOnce = true;
        break;
      }
    }

    expect(brokenAtLeastOnce).toBe(true);
  });

  it('concentration DC increases with damage (DC 10 or half damage)', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      { ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [combatant],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

    // With 50 damage, DC = max(10, 25) = 25. Very hard to make with CON +0.
    // Should break nearly every time.
    let breaks = 0;
    const trials = 100;
    for (let i = 0; i < trials; i++) {
      combatant.concentratingOn = 'Charmed';
      combatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];

      const broken = engine.checkConcentration(combat, combatant, 50);
      if (broken) breaks++;
    }

    // With DC 25 and +0 CON mod, only natural 20 succeeds (5%). So ~95% break rate.
    expect(breaks).toBeGreaterThan(trials * 0.8);
  });

  it('high CON modifier makes concentration more likely to hold', () => {
    const engine = new CombatEngine();
    // CON 20 = +5 modifier
    const weakCombatant = createTestCombatant(
      { ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } }
    );
    const strongCombatant = createTestCombatant(
      { ability_scores: { STR: 10, DEX: 10, CON: 20, INT: 10, WIS: 10, CHA: 10 } }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [weakCombatant, strongCombatant],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    // DC 10 damage: weak needs 10+, strong needs 5+
    let weakBreaks = 0;
    let strongBreaks = 0;
    const trials = 200;

    for (let i = 0; i < trials; i++) {
      weakCombatant.concentratingOn = 'Charmed';
      weakCombatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      if (engine.checkConcentration(combat, weakCombatant, 10)) weakBreaks++;

      strongCombatant.concentratingOn = 'Charmed';
      strongCombatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      if (engine.checkConcentration(combat, strongCombatant, 10)) strongBreaks++;
    }

    // Strong CON should break less often than weak CON
    expect(strongBreaks).toBeLessThan(weakBreaks);
  });

  it('logs concentration break in combat history', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      { name: 'Concentrator' },
      { currentHP: 50 }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [combatant],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

    // Try many times until we get a break
    for (let i = 0; i < 200; i++) {
      combatant.concentratingOn = 'Charmed';
      combatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      combat.history = [];

      const broken = engine.checkConcentration(combat, combatant, 15);
      if (broken) {
        expect(combat.history.length).toBeGreaterThan(0);
        const log = combat.history.find(h => h.result?.description?.includes('lost concentration'));
        expect(log).toBeDefined();
        expect(log!.result!.description).toContain('Charmed');
        expect(log!.result!.description).toContain('Concentrator');
        expect(log!.result!.description).toContain('15');
        break;
      }
    }
  });
});

// ─── Concentration in executeAttack ────────────────────────────────────────

describe('Concentration during attacks', () => {
  it('checks concentration on hit targets that are concentrating', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);
    const attacker = combat.combatants.find(c => c.id.startsWith('player'))!;
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Give target a concentration effect
    engine.applyStatusEffect(target, makeEffect('Charmed', 5, { hasConcentration: true }));
    expect(target.concentratingOn).toBe('Charmed');

    // Attack many times — at least one should hit and potentially break concentration
    let concentrationBroken = false;
    for (let i = 0; i < 200; i++) {
      target.concentratingOn = 'Charmed';
      target.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      target.currentHP = target.character.hp.max;
      combat.history = [];

      engine.executeAttack(combat, attacker, target, basicAttack());

      if (!target.concentratingOn) {
        concentrationBroken = true;
        break;
      }
    }

    expect(concentrationBroken).toBe(true);
  });

  it('defeated combatants automatically lose concentration', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, {
      name: 'Glass Goblin',
      hp: { current: 1, max: 1, temp: 0 },
    });
    const combat = engine.startCombat([player], [enemy]);
    const attacker = combat.combatants.find(c => c.id.startsWith('player'))!;
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Give target a concentration effect
    engine.applyStatusEffect(target, makeEffect('Charmed', 5, { hasConcentration: true }));
    expect(target.concentratingOn).toBe('Charmed');

    // Set up for a guaranteed kill: set target to 1 HP, use a high-damage attack
    target.currentHP = 1;
    const bigAttack: Attack = {
      name: 'Greatsword',
      damage_dice: '100d8',
      damage_type: 'slashing',
      type: 'melee',
      attack_bonus: 20,
      properties: [],
    };

    engine.executeAttack(combat, attacker, target, bigAttack);

    // Even if concentration save would have passed, defeat clears it
    expect(target.isDefeated).toBe(true);
    expect(target.concentratingOn).toBeUndefined();
  });

  it('does not check concentration on miss', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
    const combat = engine.startCombat([player], [enemy]);
    const attacker = combat.combatants.find(c => c.id.startsWith('player'))!;
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    const maxHP = target.character.hp.max;

    engine.applyStatusEffect(target, makeEffect('Charmed', 5, { hasConcentration: true }));

    // Attack with very low bonus vs high AC — should miss most of the time
    // (natural 20 still hits)
    let missesWithConcentration = 0;
    let missesThatBrokeConcentration = 0;
    for (let i = 0; i < 100; i++) {
      // Reset all state each iteration
      target.concentratingOn = 'Charmed';
      target.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      target.currentHP = maxHP;
      target.isDefeated = false;
      combat.history = [];

      const missAttack: Attack = {
        name: 'Fist',
        damage_dice: '1d4',
        damage_type: 'bludgeoning',
        type: 'melee',
        attack_bonus: -10,
        properties: [],
      };

      engine.executeAttack(combat, attacker, target, missAttack);

      // Check the attack action (first history entry)
      const attackAction = combat.history[0];
      if (!attackAction.result?.success) {
        missesWithConcentration++;
        // On a miss, concentration should still be active
        // (it's only checked on hit)
        if (!target.concentratingOn) {
          missesThatBrokeConcentration++;
        }
      }
    }

    // Should have some misses, and none of them should have broken concentration
    expect(missesWithConcentration).toBeGreaterThan(0);
    expect(missesThatBrokeConcentration).toBe(0);
  });
});

// ─── Concentration in executeCastSpell ─────────────────────────────────────

describe('Concentration during spell casting', () => {
  it('sets concentratingOn on target for concentration spells via SpellCaster', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, {
      name: 'Caster',
      class: 'Wizard' as any,
    });
    const enemy = createMockPartyCharacter(1, { name: 'Target' });
    const combat = engine.startCombat([player], [enemy]);
    const caster = combat.combatants.find(c => c.id.startsWith('player'))!;
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Give caster a spell slot
    caster.spellSlots = { 1: 2 };

    engine.executeCastSpell(combat, caster, concentrationSpell(), [target]);

    // The target should have the concentration effect
    expect(target.concentratingOn).toBe('Charmed');
    expect(target.statusEffects.some(e => e.name === 'Charmed')).toBe(true);
  });

  it('new concentration spell drops old concentration effect on same target', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, {
      name: 'Caster',
      class: 'Wizard' as any,
    });
    const enemy = createMockPartyCharacter(1, { name: 'Target' });
    const combat = engine.startCombat([player], [enemy]);
    const caster = combat.combatants.find(c => c.id.startsWith('player'))!;
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    caster.spellSlots = { 1: 4 };

    // First concentration spell
    engine.executeCastSpell(combat, caster, concentrationSpell(), [target]);
    expect(target.concentratingOn).toBe('Charmed');
    expect(target.statusEffects.some(e => e.name === 'Charmed')).toBe(true);

    // Second concentration spell on same target
    const frightenSpell: Spell = {
      name: 'Cause Fear',
      level: 1,
      damage_dice: '',
      damage_type: '',
      description: 'frighten',
      range: 30,
    };

    engine.executeCastSpell(combat, caster, frightenSpell, [target]);

    // Old Charmed should be dropped, Frightened should be active
    expect(target.concentratingOn).toBe('Frightened');
    expect(target.statusEffects.some(e => e.name === 'Charmed')).toBe(false);
    expect(target.statusEffects.some(e => e.name === 'Frightened')).toBe(true);
  });

  it('spell damage checks concentration on target', () => {
    const engine = new CombatEngine();
    const caster = createTestCombatant(
      {
        name: 'Caster',
        class: 'Wizard' as any,
        ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 18, WIS: 10, CHA: 10 },
      },
      { spellSlots: { 3: 1 }, id: 'player_0' }
    );
    const target = createTestCombatant(
      { name: 'Target' },
      { currentHP: 100, id: 'enemy_0' }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [caster, target],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    // First, apply a concentration effect to the target
    engine.applyStatusEffect(target, makeEffect('Charmed', 5, { hasConcentration: true }));

    // Cast a damage spell at the target
    let concentrationBroken = false;
    for (let i = 0; i < 200; i++) {
      target.concentratingOn = 'Charmed';
      target.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      target.currentHP = 100;
      target.isDefeated = false;
      caster.spellSlots = { 3: 1 };
      combat.history = [];

      engine.executeCastSpell(combat, caster, damageSpell(), [target]);

      if (!target.concentratingOn && !target.isDefeated) {
        concentrationBroken = true;
        break;
      }
    }

    expect(concentrationBroken).toBe(true);
  });
});

// ─── Concentration during start-of-turn damage ─────────────────────────────

describe('Concentration during start-of-turn damage', () => {
  it('Burning damage can break concentration', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Burning Target' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Give target a concentration effect AND a burning effect
    engine.applyStatusEffect(target, makeEffect('Charmed', 10, { hasConcentration: true }));
    engine.applyStatusEffect(target, makeEffect('Burning', 10, {
      damage: 20,
      damageType: 'fire',
    }));

    // Advance turns multiple times — burning damage should eventually break concentration
    let concentrationBroken = false;
    for (let round = 0; round < 50; round++) {
      if (!target.concentratingOn) {
        concentrationBroken = true;
        break;
      }

      // Ensure target is alive and has HP
      target.currentHP = 100;
      target.isDefeated = false;

      engine.nextTurn(combat);
    }

    expect(concentrationBroken).toBe(true);
  });

  it('start-of-turn damage that kills also clears concentration', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Fragile Target' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Give target 1 HP, concentration, and lethal burning
    target.currentHP = 1;
    engine.applyStatusEffect(target, makeEffect('Charmed', 10, { hasConcentration: true }));
    engine.applyStatusEffect(target, makeEffect('Burning', 10, {
      damage: 100,
      damageType: 'fire',
    }));

    // nextTurn() advances to the next combatant and processes their effects.
    // We need to keep advancing until the target is the one being processed.
    // Since there are 2 combatants, at most 2 calls will cycle through both.
    for (let i = 0; i < combat.combatants.length; i++) {
      engine.nextTurn(combat);
      if (!target.concentratingOn || target.isDefeated) {
        break;
      }
    }

    // Target should be dead and concentration cleared
    expect(target.isDefeated).toBe(true);
    expect(target.concentratingOn).toBeUndefined();
  });
});

// ─── Incapacitated breaks concentration ────────────────────────────────────

describe('Concentration and incapacitation', () => {
  it('stunned combatant loses concentration', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Stunable Target' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Give target a concentration effect
    engine.applyStatusEffect(target, makeEffect('Charmed', 10, { hasConcentration: true }));
    expect(target.concentratingOn).toBe('Charmed');

    // Apply Stunned effect
    engine.applyStatusEffect(target, makeEffect('Stunned', 2, {
      mechanicalEffects: { skipTurn: true },
    }));

    // Advance turns until the stunned target's turn is processed
    for (let i = 0; i < combat.combatants.length; i++) {
      engine.nextTurn(combat);
      if (!target.concentratingOn) {
        break;
      }
    }

    expect(target.concentratingOn).toBeUndefined();
  });

  it('history logs concentration lost due to incapacitation', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Stunable Target' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    engine.applyStatusEffect(target, makeEffect('Charmed', 10, { hasConcentration: true }));
    engine.applyStatusEffect(target, makeEffect('Stunned', 2, {
      mechanicalEffects: { skipTurn: true },
    }));

    // Advance until the stunned target's turn is processed
    for (let i = 0; i < combat.combatants.length; i++) {
      engine.nextTurn(combat);
      if (!target.concentratingOn) break;
    }

    const incapacitatedLog = combat.history.find(
      h => h.result?.description?.includes('incapacitated')
    );
    expect(incapacitatedLog).toBeDefined();
    expect(incapacitatedLog!.result!.description).toContain('Charmed');
  });
});

// ─── Concentration and natural expiration ──────────────────────────────────

describe('Concentration and effect expiration', () => {
  it('concentratingOn clears when concentrated effect expires naturally', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Target' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Apply concentration effect with duration 1
    engine.applyStatusEffect(target, makeEffect('Charmed', 1, { hasConcentration: true }));
    expect(target.concentratingOn).toBe('Charmed');

    // Advance turns until the target's effects tick down
    for (let i = 0; i < combat.combatants.length; i++) {
      engine.nextTurn(combat);
      if (!target.concentratingOn) break;
    }

    expect(target.concentratingOn).toBeUndefined();
  });

  it('concentratingOn persists when non-concentrated effects expire', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Target' });
    const combat = engine.startCombat([player], [enemy]);
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Apply concentration + non-concentration effects
    engine.applyStatusEffect(target, makeEffect('Charmed', 10, { hasConcentration: true }));
    engine.applyStatusEffect(target, makeEffect('Raging', 1)); // expires next turn

    // Advance until target's turn is processed
    for (let i = 0; i < combat.combatants.length; i++) {
      engine.nextTurn(combat);
      // After the target's turn, Rage should have expired
      if (!target.statusEffects.some(e => e.name === 'Raging')) break;
    }

    // Rage expired, Charmed should still be tracked
    expect(target.concentratingOn).toBe('Charmed');
    expect(target.statusEffects.some(e => e.name === 'Raging')).toBe(false);
    expect(target.statusEffects.some(e => e.name === 'Charmed')).toBe(true);
  });
});

// ─── Concentration with seeded roller ─────────────────────────────────────

describe('Concentration determinism', () => {
  it('same seed produces same concentration outcomes', () => {
    const seed = 'concentration-test-seed';

    function runTrial(): { breaks: number } {
      const engine = new CombatEngine({}, new SeededDiceRoller(seed));
      const combatant = createTestCombatant(
        { ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } },
        { currentHP: 100 }
      );
      const combat: CombatInstance = {
        id: 'test',
        combatants: [combatant],
        currentTurnIndex: 0,
        roundNumber: 1,
        history: [],
        isActive: true,
        startTime: Date.now(),
        lastUpdated: Date.now(),
      };

      let breaks = 0;
      for (let i = 0; i < 50; i++) {
        combatant.concentratingOn = 'Charmed';
        combatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];

        if (engine.checkConcentration(combat, combatant, 15)) breaks++;
      }
      return { breaks };
    }

    const result1 = runTrial();
    const result2 = runTrial();

    expect(result1.breaks).toBe(result2.breaks);
  });

  it('different seeds produce different concentration outcomes', () => {
    function runTrial(seed: string): { breaks: number } {
      const engine = new CombatEngine({}, new SeededDiceRoller(seed));
      const combatant = createTestCombatant(
        { ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } }
      );
      const combat: CombatInstance = {
        id: 'test',
        combatants: [combatant],
        currentTurnIndex: 0,
        roundNumber: 1,
        history: [],
        isActive: true,
        startTime: Date.now(),
        lastUpdated: Date.now(),
      };

      let breaks = 0;
      for (let i = 0; i < 50; i++) {
        combatant.concentratingOn = 'Charmed';
        combatant.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];

        if (engine.checkConcentration(combat, combatant, 15)) breaks++;
      }
      return { breaks };
    }

    const result1 = runTrial('seed-alpha');
    const result2 = runTrial('seed-beta');

    // Very unlikely to get the same number of breaks with different seeds
    // (but possible, so we just check they're not always identical across many pairs)
    let same = 0;
    for (let i = 0; i < 10; i++) {
      const a = runTrial(`seed-a-${i}`);
      const b = runTrial(`seed-b-${i}`);
      if (a.breaks === b.breaks) same++;
    }

    // With 10 pairs, getting all identical is astronomically unlikely
    expect(same).toBeLessThan(10);
  });
});

// ─── CON save proficiency ──────────────────────────────────────────────────

describe('Concentration save proficiency', () => {
  it('CON save proficiency improves concentration maintenance', () => {
    const engine = new CombatEngine();
    const noProf = createTestCombatant(
      {
        name: 'NoProf',
        ability_scores: { STR: 10, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
        saving_throws: {} as any,
      }
    );
    const withProf = createTestCombatant(
      {
        name: 'WithProf',
        ability_scores: { STR: 10, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
        saving_throws: { CON: true } as any,
      }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [noProf, withProf],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    // Both have CON +2, but withProf also has +2 proficiency = +4 total
    // noProf has just +2. DC 10: noProf needs 8+, withProf needs 6+
    const trials = 200;
    let noProfBreaks = 0;
    let withProfBreaks = 0;

    for (let i = 0; i < trials; i++) {
      noProf.concentratingOn = 'Charmed';
      noProf.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      if (engine.checkConcentration(combat, noProf, 10)) noProfBreaks++;

      withProf.concentratingOn = 'Charmed';
      withProf.statusEffects = [makeEffect('Charmed', 5, { hasConcentration: true })];
      if (engine.checkConcentration(combat, withProf, 10)) withProfBreaks++;
    }

    expect(withProfBreaks).toBeLessThan(noProfBreaks);
  });
});

// ─── Integration: full combat with concentration ───────────────────────────

describe('Concentration integration', () => {
  it('full combat cycle: apply concentration → take damage → concentration breaks', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Hero' });
    const enemy = createMockPartyCharacter(1, { name: 'Enemy' });
    const combat = engine.startCombat([player], [enemy]);
    const attacker = combat.combatants.find(c => c.id.startsWith('player'))!;
    const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Apply concentration effect to target
    engine.applyStatusEffect(target, makeEffect('Charmed', 10, { hasConcentration: true }));
    expect(target.concentratingOn).toBe('Charmed');

    // Attack target many times until concentration breaks
    let broke = false;
    for (let i = 0; i < 300; i++) {
      target.currentHP = target.character.hp.max;
      target.isDefeated = false;
      target.concentratingOn = 'Charmed';
      target.statusEffects = [makeEffect('Charmed', 10, { hasConcentration: true })];
      combat.history = [];

      engine.executeAttack(combat, attacker, target, basicAttack());

      if (!target.concentratingOn && !target.isDefeated) {
        broke = true;
        break;
      }
    }

    expect(broke).toBe(true);
  });

  it('concentration effect is properly removed when dropped via checkConcentration', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant(
      { name: 'Target' },
      { currentHP: 100 }
    );
    const combat: CombatInstance = {
      id: 'test',
      combatants: [combatant],
      currentTurnIndex: 0,
      roundNumber: 1,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now(),
    };

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 10, { hasConcentration: true }));
    engine.applyStatusEffect(combatant, makeEffect('Raging', 10));

    // Try until concentration breaks
    for (let i = 0; i < 200; i++) {
      combatant.concentratingOn = 'Charmed';
      combatant.statusEffects = [
        makeEffect('Charmed', 10, { hasConcentration: true }),
        makeEffect('Raging', 10),
      ];
      combat.history = [];

      if (engine.checkConcentration(combat, combatant, 20)) {
        // Charmed should be gone, Rage should remain
        expect(combatant.concentratingOn).toBeUndefined();
        expect(combatant.statusEffects).toHaveLength(1);
        expect(combatant.statusEffects[0].name).toBe('Raging');
        break;
      }
    }
  });
});
