/**
 * Status Effect Tick-Down Tests (Task 1.3.4)
 *
 * Tests that status effects are properly decremented and removed
 * during the nextTurn() lifecycle, and that expirations are logged
 * in combat history.
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import { createMockPartyCharacter } from '../../helpers/enemyTestHelpers.js';
import type { StatusEffect, CombatInstance } from '../../../src/core/types/Combat.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeEffect(name: string, duration: number, overrides?: Partial<StatusEffect>): StatusEffect {
  return {
    name,
    description: `${name} effect`,
    duration,
    ...overrides,
  };
}

function startCombatWithEffects(
  engine: CombatEngine,
  playerEffects: StatusEffect[],
  enemyEffects?: StatusEffect[],
): CombatInstance {
  const player = createMockPartyCharacter(1, { name: 'Hero' });
  const enemy = createMockPartyCharacter(1, { name: 'Goblin' });
  const combat = engine.startCombat([player], [enemy]);

  const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
  const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;

  // Apply effects to player
  for (const effect of playerEffects) {
    playerC.statusEffects.push({ ...effect });
  }

  // Apply effects to enemy
  if (enemyEffects) {
    for (const effect of enemyEffects) {
      enemyC.statusEffects.push({ ...effect });
    }
  }

  return combat;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Status Effect Tick-Down in nextTurn()', () => {
  it('decrements duration of all effects on the next combatant by 1', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Blessed', 3),
      makeEffect('Shielded', 2),
    ]);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // After first nextTurn: the next combatant gets their effects ticked.
    // Player has effects, enemy doesn't — so we check that player's effects
    // only decrement when it's their turn, not the enemy's.
    engine.nextTurn(combat);

    // The combatant whose turn it is now was just ticked.
    // If it's the enemy's turn (no effects), player is unchanged.
    // If it's the player's turn (effects), player was ticked.
    const currentC = combat.combatants[combat.currentTurnIndex];
    if (currentC.id.startsWith('player')) {
      // Player's turn: effects were decremented
      expect(playerC.statusEffects[0].duration).toBe(2);
      expect(playerC.statusEffects[1].duration).toBe(1);
    } else {
      // Enemy's turn: player effects unchanged
      expect(playerC.statusEffects[0].duration).toBe(3);
      expect(playerC.statusEffects[1].duration).toBe(2);
    }

    // After second nextTurn: the other combatant gets ticked.
    // Player effects should have been decremented exactly once total.
    engine.nextTurn(combat);
    expect(playerC.statusEffects[0].duration).toBe(2);
    expect(playerC.statusEffects[1].duration).toBe(1);
  });

  it('removes effects when duration reaches 0', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Blessed', 1),
      makeEffect('Shielded', 2),
    ]);

    // Advance to enemy turn (no effects to tick)
    engine.nextTurn(combat);

    // Advance back to player turn — tick effects
    // Blessed: 1 → 0 → removed; Shielded: 2 → 1 → stays
    engine.nextTurn(combat);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    expect(playerC.statusEffects.length).toBe(1);
    expect(playerC.statusEffects[0].name).toBe('Shielded');
    expect(playerC.statusEffects[0].duration).toBe(1);

    // Advance to enemy and back to player again
    // Shielded: 1 → 0 → removed
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    expect(playerC.statusEffects.length).toBe(0);
  });

  it('removes effects with duration 0 after tick', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Frightened', 1),
    ]);

    // Advance to enemy, then back to player
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    expect(playerC.statusEffects.length).toBe(0);
  });

  it('logs expired effects in combat history', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Blessed', 1),
      makeEffect('Shielded', 1),
    ]);

    const historyBefore = combat.history.length;

    // Advance to enemy, then to player (triggers tick + expiration)
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    // Should have a new history entry for the expiration
    expect(combat.history.length).toBe(historyBefore + 1);

    const tickEntry = combat.history[combat.history.length - 1];
    expect(tickEntry.type).toBe('statusEffectTick');
    expect(tickEntry.result).toBeDefined();
    expect(tickEntry.result!.description).toContain('Blessed');
    expect(tickEntry.result!.description).toContain('Shielded');
    expect(tickEntry.result!.description).toContain('expired');
  });

  it('does not add history entry when no effects expire', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Blessed', 5),
    ]);

    const historyBefore = combat.history.length;

    // Advance to enemy, then to player (tick but no expiration)
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    // No expiration should have occurred
    expect(combat.history.length).toBe(historyBefore);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    expect(playerC.statusEffects[0].duration).toBe(4);
  });

  it('does not add history entry when combatant has no effects', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, []);

    const historyBefore = combat.history.length;

    engine.nextTurn(combat);
    engine.nextTurn(combat);

    expect(combat.history.length).toBe(historyBefore);
  });

  it('skips tick-down for defeated combatants', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Blessed', 1),
    ]);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    playerC.isDefeated = true;
    playerC.currentHP = 0;

    const historyBefore = combat.history.length;

    // Advance to enemy and back — player is defeated, effects not ticked
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    // Player's effects should NOT have been decremented
    expect(playerC.statusEffects[0].duration).toBe(1);
    expect(combat.history.length).toBe(historyBefore);
  });

  it('handles effects with duration already at 0 (pre-expired)', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('AlreadyDone', 0),
      makeEffect('StillGoing', 3),
    ]);

    // Advance to player's turn
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    // duration 0 decremented to -1, then removed
    // duration 3 decremented to 2
    expect(playerC.statusEffects.length).toBe(1);
    expect(playerC.statusEffects[0].name).toBe('StillGoing');
    expect(playerC.statusEffects[0].duration).toBe(2);

    // History should record the expiration
    const tickEntries = combat.history.filter(h => h.type === 'statusEffectTick');
    expect(tickEntries.length).toBe(1);
    expect(tickEntries[0].result!.description).toContain('AlreadyDone');
  });

  it('correctly ticks effects across multiple rounds', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('LongBuff', 4),
    ]);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;

    // Round 1: advance to player's turn — tick
    engine.nextTurn(combat);
    engine.nextTurn(combat);
    expect(playerC.statusEffects[0].duration).toBe(3);

    // Round 2: advance to player's turn again — tick
    engine.nextTurn(combat);
    engine.nextTurn(combat);
    expect(playerC.statusEffects[0].duration).toBe(2);

    // Round 3
    engine.nextTurn(combat);
    engine.nextTurn(combat);
    expect(playerC.statusEffects[0].duration).toBe(1);

    // Round 4 — should expire
    engine.nextTurn(combat);
    engine.nextTurn(combat);
    expect(playerC.statusEffects.length).toBe(0);
  });

  it('ticks effects for each combatant independently', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(
      engine,
      [makeEffect('PlayerBuff', 2)],  // player effects
      [makeEffect('EnemyDebuff', 2)], // enemy effects
    );

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // First nextTurn: whoever is NOT first in turn order gets ticked
    engine.nextTurn(combat);
    const firstTick = combat.combatants[combat.currentTurnIndex];
    const otherC = firstTick.id.startsWith('player') ? enemyC : playerC;

    // The current combatant (firstTick) was ticked
    expect(firstTick.statusEffects[0].duration).toBe(1);
    // The other combatant was NOT ticked yet
    expect(otherC.statusEffects[0].duration).toBe(2);

    // Second nextTurn: the other combatant gets ticked
    engine.nextTurn(combat);
    expect(otherC.statusEffects[0].duration).toBe(1);
    // firstTick not ticked again
    expect(firstTick.statusEffects[0].duration).toBe(1);

    // Third nextTurn: firstTick ticks to 0 and expires
    engine.nextTurn(combat);
    expect(firstTick.statusEffects.length).toBe(0);

    // Fourth nextTurn: otherC ticks to 0 and expires
    engine.nextTurn(combat);
    expect(otherC.statusEffects.length).toBe(0);
  });

  it('logs separate history entries for different combatants expiring effects', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(
      engine,
      [makeEffect('PlayerBuff', 1)],
      [makeEffect('EnemyDebuff', 1)],
    );

    // First nextTurn: whoever is second in turn order gets ticked
    engine.nextTurn(combat);
    const firstTicked = combat.combatants[combat.currentTurnIndex];
    const tickEntries1 = combat.history.filter(h => h.type === 'statusEffectTick');
    expect(tickEntries1.length).toBe(1);
    expect(tickEntries1[0].actor).toBe(firstTicked);
    const firstName = firstTicked.id.startsWith('player') ? 'PlayerBuff' : 'EnemyDebuff';
    expect(tickEntries1[0].result!.description).toContain(firstName);

    // Second nextTurn: the other combatant gets ticked
    engine.nextTurn(combat);
    const secondTicked = combat.combatants[combat.currentTurnIndex];
    const tickEntries2 = combat.history.filter(h => h.type === 'statusEffectTick');
    expect(tickEntries2.length).toBe(2);
    expect(tickEntries2[1].actor).toBe(secondTicked);
    const secondName = secondTicked.id.startsWith('player') ? 'PlayerBuff' : 'EnemyDebuff';
    expect(tickEntries2[1].result!.description).toContain(secondName);
  });

  it('preserves all other effect fields during tick-down', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Burning', 3, {
        damage: 6,
        damageType: 'fire',
        source: 'player_0',
        mechanicalEffects: { damageResistance: 'fire' },
      }),
    ]);

    // Tick the effect
    engine.nextTurn(combat);
    engine.nextTurn(combat);

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    const effect = playerC.statusEffects[0];

    expect(effect.name).toBe('Burning');
    expect(effect.description).toBe('Burning effect');
    expect(effect.duration).toBe(2);
    expect(effect.damage).toBe(6);
    expect(effect.damageType).toBe('fire');
    expect(effect.source).toBe('player_0');
    expect(effect.mechanicalEffects?.damageResistance).toBe('fire');
  });

  it('history entry references the correct combatant as actor', () => {
    const engine = new CombatEngine();
    const player = createMockPartyCharacter(1, { name: 'Alice' });
    const combat = engine.startCombat([player], []);

    const playerC = combat.combatants[0];
    playerC.statusEffects.push(makeEffect('TestEffect', 1));

    // In a 1-combatant combat, advancing wraps back to the same combatant
    engine.nextTurn(combat);

    const tickEntry = combat.history.find(h => h.type === 'statusEffectTick');
    expect(tickEntry).toBeDefined();
    expect(tickEntry!.actor).toBe(playerC);
    expect(tickEntry!.actor.character.name).toBe('Alice');
  });

  it('works correctly when combat ends after nextTurn', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('Blessed', 1),
    ]);

    const enemyC = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    enemyC.isDefeated = true;
    enemyC.currentHP = 0;

    // Even though combat will end, the tick should still process
    // before checkCombatStatus runs
    engine.nextTurn(combat); // moves to enemy, enemy has no effects
    engine.nextTurn(combat); // moves back to player, effects tick

    const playerC = combat.combatants.find(c => c.id.startsWith('player'))!;
    expect(playerC.statusEffects.length).toBe(0);
  });

  it('multiple effects expiring on same turn are logged in single entry', () => {
    const engine = new CombatEngine();
    const combat = startCombatWithEffects(engine, [
      makeEffect('EffectA', 1),
      makeEffect('EffectB', 1),
      makeEffect('EffectC', 1),
    ]);

    engine.nextTurn(combat);
    engine.nextTurn(combat);

    const tickEntries = combat.history.filter(h => h.type === 'statusEffectTick');
    expect(tickEntries.length).toBe(1);
    expect(tickEntries[0].result!.description).toContain('EffectA');
    expect(tickEntries[0].result!.description).toContain('EffectB');
    expect(tickEntries[0].result!.description).toContain('EffectC');
  });
});
