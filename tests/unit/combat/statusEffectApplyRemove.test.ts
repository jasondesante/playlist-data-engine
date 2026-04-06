/**
 * Status Effect Apply & Remove Tests (Task 1.3.8)
 *
 * Direct tests for CombatEngine.applyStatusEffect() and
 * CombatEngine.removeExpiredStatusEffects(), covering:
 * - Basic application (no existing effect)
 * - Stacking rules (same name): duration refresh, damage merge,
 *   mechanicalEffects merge, source/damageType/concentration carry-over
 * - Different-name effects (no stacking)
 * - Concentration dropping on new concentration
 * - removeExpiredStatusEffects: removal, concentration tracking cleanup,
 *   mixed expired/active, no-op when nothing expired
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import type { StatusEffect } from '../../../src/core/types/Combat.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEffect(name: string, duration: number, overrides?: Partial<StatusEffect>): StatusEffect {
  return {
    name,
    description: `${name} effect`,
    duration,
    ...overrides,
  };
}

// ─── applyStatusEffect — basic application ──────────────────────────────────

describe('applyStatusEffect — basic application', () => {
  it('adds a new effect to a combatant with no existing effects', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    const effect = makeEffect('Blessed', 5);
    const result = engine.applyStatusEffect(combatant, effect);

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Blessed');
    expect(combatant.statusEffects[0].duration).toBe(5);
    expect(result).toBe(effect);
  });

  it('adds multiple different-named effects without stacking', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Blessed', 3));
    engine.applyStatusEffect(combatant, makeEffect('Shielded', 2));
    engine.applyStatusEffect(combatant, makeEffect('Raging', 4));

    expect(combatant.statusEffects).toHaveLength(3);
    expect(combatant.statusEffects.map(e => e.name)).toEqual(['Blessed', 'Shielded', 'Raging']);
  });

  it('does not set concentratingOn for non-concentration effects', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Raging', 5));

    expect(combatant.concentratingOn).toBeUndefined();
  });

  it('sets concentratingOn for concentration effects', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

    expect(combatant.concentratingOn).toBe('Charmed');
  });

  it('preserves all effect fields on application', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    const effect = makeEffect('Burning', 3, {
      damage: 6,
      damageType: 'fire',
      source: 'enemy_0',
      mechanicalEffects: { damageResistance: 'fire' },
    });

    engine.applyStatusEffect(combatant, effect);

    expect(combatant.statusEffects[0]).toEqual(effect);
  });
});

// ─── applyStatusEffect — stacking rules ─────────────────────────────────────

describe('applyStatusEffect — stacking (same name)', () => {
  it('refreshes duration to the higher value', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Blessed', 3));
    engine.applyStatusEffect(combatant, makeEffect('Blessed', 7));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].duration).toBe(7);
  });

  it('keeps existing duration when new duration is lower', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Blessed', 10));
    engine.applyStatusEffect(combatant, makeEffect('Blessed', 3));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].duration).toBe(10);
  });

  it('keeps same duration when equal', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Blessed', 5));
    engine.applyStatusEffect(combatant, makeEffect('Blessed', 5));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].duration).toBe(5);
  });

  it('takes higher damage when both effects have damage', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Burning', 3, { damage: 6, damageType: 'fire' }));
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5, { damage: 10, damageType: 'fire' }));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].damage).toBe(10);
  });

  it('keeps existing damage when new damage is lower', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Burning', 3, { damage: 10 }));
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5, { damage: 4 }));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].damage).toBe(10);
  });

  it('sets damage when existing effect has no damage', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Burning', 3));
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5, { damage: 8 }));

    expect(combatant.statusEffects[0].damage).toBe(8);
  });

  it('does not reduce existing damage when new effect has no damage', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Burning', 3, { damage: 6 }));
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5));

    expect(combatant.statusEffects[0].damage).toBe(6);
  });

  it('carries over source when new effect specifies one', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { source: 'enemy_0' }));
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 3, { source: 'enemy_1' }));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].source).toBe('enemy_1');
  });

  it('preserves existing source when new effect has no source', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { source: 'enemy_0' }));
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 3));

    expect(combatant.statusEffects[0].source).toBe('enemy_0');
  });

  it('merges mechanicalEffects from both effects', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Paralyzed', 5, {
      mechanicalEffects: { skipTurn: true, disadvantageOnDexSaves: true },
    }));
    engine.applyStatusEffect(combatant, makeEffect('Paralyzed', 3, {
      mechanicalEffects: { speedZero: true },
    }));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].mechanicalEffects).toEqual({
      skipTurn: true,
      disadvantageOnDexSaves: true,
      speedZero: true,
    });
  });

  it('new mechanicalEffects overwrite existing keys', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Custom', 5, {
      mechanicalEffects: { disadvantageOnAttack: true, skipTurn: false },
    }));
    engine.applyStatusEffect(combatant, makeEffect('Custom', 3, {
      mechanicalEffects: { skipTurn: true, speedZero: true },
    }));

    expect(combatant.statusEffects[0].mechanicalEffects).toEqual({
      disadvantageOnAttack: true,
      skipTurn: true,
      speedZero: true,
    });
  });

  it('carries over damageType when new effect specifies one', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Burning', 3, { damageType: 'fire' }));
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5, { damageType: 'acid' }));

    expect(combatant.statusEffects[0].damageType).toBe('acid');
  });

  it('preserves existing damageType when new effect has none', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Burning', 3, { damageType: 'fire' }));
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5));

    expect(combatant.statusEffects[0].damageType).toBe('fire');
  });

  it('sets hasConcentration when new effect is concentration', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 3));
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));

    expect(combatant.statusEffects[0].hasConcentration).toBe(true);
    expect(combatant.concentratingOn).toBe('Charmed');
  });

  it('returns the existing (modified) effect when stacking', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    const original = makeEffect('Blessed', 3);
    engine.applyStatusEffect(combatant, original);

    const stacked = engine.applyStatusEffect(combatant, makeEffect('Blessed', 7));

    // Should return the existing effect reference (the one in the array)
    // The first push stored `original` in the array, so stacked IS original
    expect(stacked).toBe(combatant.statusEffects[0]);
    expect(stacked).toBe(original);
    expect(stacked.duration).toBe(7); // duration was updated in-place
  });
});

// ─── applyStatusEffect — concentration dropping ─────────────────────────────

describe('applyStatusEffect — concentration replaces old', () => {
  it('drops old concentration effect when new concentration is applied', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, {
      hasConcentration: true,
      source: 'enemy_0',
    }));
    expect(combatant.concentratingOn).toBe('Charmed');
    expect(combatant.statusEffects).toHaveLength(1);

    engine.applyStatusEffect(combatant, makeEffect('Frightened', 5, {
      hasConcentration: true,
      source: 'enemy_1',
    }));

    expect(combatant.concentratingOn).toBe('Frightened');
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Frightened');
  });

  it('preserves non-concentration effects when dropping old concentration', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Raging', 5));
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 5, { hasConcentration: true }));
    expect(combatant.statusEffects).toHaveLength(2);

    engine.applyStatusEffect(combatant, makeEffect('Frightened', 5, { hasConcentration: true }));

    expect(combatant.concentratingOn).toBe('Frightened');
    expect(combatant.statusEffects).toHaveLength(2);
    expect(combatant.statusEffects.map(e => e.name)).toContain('Raging');
    expect(combatant.statusEffects.map(e => e.name)).toContain('Frightened');
    expect(combatant.statusEffects.map(e => e.name)).not.toContain('Charmed');
  });

  it('same-name concentration effect refreshes without dropping', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    engine.applyStatusEffect(combatant, makeEffect('Charmed', 2, { hasConcentration: true }));
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 8, { hasConcentration: true }));

    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].duration).toBe(8);
    expect(combatant.concentratingOn).toBe('Charmed');
  });
});

// ─── removeExpiredStatusEffects ─────────────────────────────────────────────

describe('removeExpiredStatusEffects', () => {
  it('removes effects with duration <= 0', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    combatant.statusEffects = [
      makeEffect('Expired', 0),
      makeEffect('Negative', -1),
      makeEffect('Active', 3),
    ];

    const removed = engine.removeExpiredStatusEffects(combatant);

    expect(removed).toHaveLength(2);
    expect(removed.map(e => e.name)).toEqual(['Expired', 'Negative']);
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Active');
  });

  it('returns empty array when no effects are expired', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    combatant.statusEffects = [
      makeEffect('Active1', 3),
      makeEffect('Active2', 5),
    ];

    const removed = engine.removeExpiredStatusEffects(combatant);

    expect(removed).toHaveLength(0);
    expect(combatant.statusEffects).toHaveLength(2);
  });

  it('returns empty array when combatant has no effects', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    const removed = engine.removeExpiredStatusEffects(combatant);

    expect(removed).toHaveLength(0);
    expect(combatant.statusEffects).toHaveLength(0);
  });

  it('clears concentratingOn when the concentrated effect expires', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant({ name: 'Concentrator' });

    combatant.statusEffects = [
      makeEffect('Charmed', 0, { hasConcentration: true }),
      makeEffect('Raging', 3),
    ];
    combatant.concentratingOn = 'Charmed';

    engine.removeExpiredStatusEffects(combatant);

    expect(combatant.concentratingOn).toBeUndefined();
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Raging');
  });

  it('preserves concentratingOn when a non-concentrated effect expires', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    combatant.statusEffects = [
      makeEffect('Charmed', 5, { hasConcentration: true }),
      makeEffect('Raging', 0),
    ];
    combatant.concentratingOn = 'Charmed';

    engine.removeExpiredStatusEffects(combatant);

    expect(combatant.concentratingOn).toBe('Charmed');
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Charmed');
  });

  it('preserves concentratingOn when concentrated effect is still active', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    combatant.statusEffects = [
      makeEffect('Charmed', 3, { hasConcentration: true }),
      makeEffect('ExpiredBuff', 0),
    ];
    combatant.concentratingOn = 'Charmed';

    engine.removeExpiredStatusEffects(combatant);

    expect(combatant.concentratingOn).toBe('Charmed');
    expect(combatant.statusEffects).toHaveLength(1);
  });

  it('handles all effects expired at once', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    combatant.statusEffects = [
      makeEffect('A', 0),
      makeEffect('B', -1),
      makeEffect('C', 0),
    ];

    const removed = engine.removeExpiredStatusEffects(combatant);

    expect(removed).toHaveLength(3);
    expect(combatant.statusEffects).toHaveLength(0);
  });

  it('clears concentratingOn when all effects expire including concentration', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    combatant.statusEffects = [
      makeEffect('Charmed', 0, { hasConcentration: true }),
    ];
    combatant.concentratingOn = 'Charmed';

    engine.removeExpiredStatusEffects(combatant);

    expect(combatant.concentratingOn).toBeUndefined();
    expect(combatant.statusEffects).toHaveLength(0);
  });

  it('does not mutate the returned expired effects array', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    const expiredEffect = makeEffect('Gone', 0);
    combatant.statusEffects = [expiredEffect, makeEffect('Stay', 5)];

    const removed = engine.removeExpiredStatusEffects(combatant);

    // The removed effect should be the same object that was in the array
    expect(removed[0]).toBe(expiredEffect);
    // Modifying the returned array should not affect the combatant
    removed.push(makeEffect('Fake', 1));
    expect(combatant.statusEffects).toHaveLength(1);
  });
});

// ─── Integration: apply + remove lifecycle ──────────────────────────────────

describe('applyStatusEffect + removeExpiredStatusEffects integration', () => {
  it('full lifecycle: apply → stack → expire → remove', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    // Apply burning
    engine.applyStatusEffect(combatant, makeEffect('Burning', 2, {
      damage: 6,
      damageType: 'fire',
    }));
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].damage).toBe(6);

    // Re-apply with higher damage and longer duration (stack)
    engine.applyStatusEffect(combatant, makeEffect('Burning', 5, {
      damage: 10,
      damageType: 'fire',
    }));
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].duration).toBe(5);
    expect(combatant.statusEffects[0].damage).toBe(10);

    // Simulate tick-down to 0
    combatant.statusEffects[0].duration = 0;

    // Remove expired
    const removed = engine.removeExpiredStatusEffects(combatant);
    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe('Burning');
    expect(combatant.statusEffects).toHaveLength(0);
  });

  it('stacking with concentration then natural expiration clears tracking', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    // Apply concentration effect
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 3, { hasConcentration: true }));
    expect(combatant.concentratingOn).toBe('Charmed');

    // Re-apply same concentration (stack duration)
    engine.applyStatusEffect(combatant, makeEffect('Charmed', 6, { hasConcentration: true }));
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].duration).toBe(6);

    // Simulate tick-down to 0
    combatant.statusEffects[0].duration = 0;

    // Remove expired
    engine.removeExpiredStatusEffects(combatant);

    expect(combatant.statusEffects).toHaveLength(0);
    expect(combatant.concentratingOn).toBeUndefined();
  });

  it('multiple effects: some expire, some stack, some stay', () => {
    const engine = new CombatEngine();
    const combatant = createTestCombatant();

    // Apply three different effects
    engine.applyStatusEffect(combatant, makeEffect('Blessed', 1)); // will expire
    engine.applyStatusEffect(combatant, makeEffect('Burning', 3, { damage: 4, damageType: 'fire' }));
    engine.applyStatusEffect(combatant, makeEffect('Raging', 5));

    // Stack burning with higher damage
    engine.applyStatusEffect(combatant, makeEffect('Burning', 4, { damage: 8, damageType: 'fire' }));
    expect(combatant.statusEffects).toHaveLength(3);

    // Tick down: Blessed expires, Burning 4→0, Raging stays
    combatant.statusEffects[0].duration = 0; // Blessed
    combatant.statusEffects[1].duration = 0; // Burning
    combatant.statusEffects[2].duration = 3; // Raging

    const removed = engine.removeExpiredStatusEffects(combatant);

    expect(removed).toHaveLength(2);
    expect(removed.map(e => e.name)).toContain('Blessed');
    expect(removed.map(e => e.name)).toContain('Burning');
    expect(combatant.statusEffects).toHaveLength(1);
    expect(combatant.statusEffects[0].name).toBe('Raging');
    expect(combatant.statusEffects[0].duration).toBe(3);
  });
});
