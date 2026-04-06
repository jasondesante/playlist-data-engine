/**
 * Unit tests for spell slot initialization (Task 1.1.4)
 *
 * Verifies that CombatEngine.initializeSpellSlots() correctly converts
 * character spell slot data into combatant-ready spell slots through
 * the startCombat() → createCombatant() path.
 *
 * Test configurations:
 * - Character with spells.spell_slots (generated enemy)
 * - Character without spells.spell_slots (fallback to table)
 * - Character with partially used slots
 * - Edge cases (level 1, level 20, multiple classes, missing fields)
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';
import type { Combatant } from '../../../src/core/types/Combat.js';

/**
 * Minimal mock character with sensible defaults.
 * The `spells` field defaults to an empty spell_slots object,
 * so override `spells` to test different configurations.
 */
function createMockCharacter(overrides?: Partial<CharacterSheet>): CharacterSheet {
  return {
    name: 'Test Wizard',
    level: 5,
    race: 'Human' as any,
    class: 'Wizard' as any,
    ability_scores: {
      STR: 8,
      DEX: 14,
      CON: 12,
      INT: 18,
      WIS: 13,
      CHA: 10
    },
    ability_modifiers: {
      STR: -1,
      DEX: 2,
      CON: 1,
      INT: 4,
      WIS: 1,
      CHA: 0
    },
    proficiency_bonus: 3,
    hp: { current: 28, max: 28, temp: 0 },
    armor_class: 12,
    initiative: 2,
    speed: 30,
    skills: {},
    saving_throws: {},
    racial_traits: [],
    class_features: [],
    xp: { current: 6500, next_level: 14000 },
    seed: 'test-seed',
    generated_at: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

/**
 * Start a combat with the given character to get a fully initialized combatant.
 * The engine creates the combatant internally via createCombatant() → initializeSpellSlots().
 */
function getCombatant(character: CharacterSheet): Combatant {
  const engine = new CombatEngine();
  const combat = engine.startCombat([character], []);
  return combat.combatants[0];
}

// ─── Configuration 1: Character with spells.spell_slots (generated enemy) ───

describe('Spell slot initialization — character with spells.spell_slots (generated enemy)', () => {
  it('converts source spell_slots to combatant slots (total - used)', () => {
    const character = createMockCharacter({
      name: 'Shadow Mage',
      class: 'Wizard' as any,
      spells: {
        spell_slots: {
          1: { total: 4, used: 0 },
          2: { total: 3, used: 1 },
          3: { total: 2, used: 0 }
        },
        known_spells: ['Fireball', 'Shield', 'Magic Missile'],
        cantrips: ['Fire Bolt']
      }
    });

    const combatant = getCombatant(character);

    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4); // 4 - 0
    expect(combatant.spellSlots![2]).toBe(2); // 3 - 1
    expect(combatant.spellSlots![3]).toBe(2); // 2 - 0
  });

  it('handles a realistic generated enemy with slots at levels 1-5', () => {
    const character = createMockCharacter({
      name: 'Elder Lich',
      class: 'Wizard' as any,
      level: 11,
      spells: {
        spell_slots: {
          1: { total: 4, used: 0 },
          2: { total: 3, used: 0 },
          3: { total: 3, used: 1 },
          4: { total: 3, used: 2 },
          5: { total: 1, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);

    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(2); // 3 - 1
    expect(combatant.spellSlots![4]).toBe(1); // 3 - 2
    expect(combatant.spellSlots![5]).toBe(1);
    // Levels 6-9 should not exist
    expect(combatant.spellSlots![6]).toBeUndefined();
    expect(combatant.spellSlots![7]).toBeUndefined();
    expect(combatant.spellSlots![8]).toBeUndefined();
    expect(combatant.spellSlots![9]).toBeUndefined();
  });

  it('omits spell levels where all slots are used', () => {
    const character = createMockCharacter({
      name: 'Weary Necromancer',
      class: 'Wizard' as any,
      spells: {
        spell_slots: {
          1: { total: 4, used: 4 }, // all used
          2: { total: 3, used: 1 }, // 2 remaining
          3: { total: 2, used: 2 }  // all used
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);

    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBeUndefined(); // all used, omitted
    expect(combatant.spellSlots![2]).toBe(2); // 3 - 1
    expect(combatant.spellSlots![3]).toBeUndefined(); // all used, omitted
  });

  it('returns undefined when all spell levels are fully used', () => {
    const character = createMockCharacter({
      name: 'Exhausted Sorcerer',
      class: 'Sorcerer' as any,
      spells: {
        spell_slots: {
          1: { total: 4, used: 4 },
          2: { total: 3, used: 3 },
          3: { total: 2, used: 2 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeUndefined();
  });

  it('uses source data even when class is not in the spellcasting list', () => {
    const character = createMockCharacter({
      name: 'Custom Spellcaster',
      class: 'Spellblade' as any, // not in spellcastingClasses list
      spells: {
        spell_slots: {
          1: { total: 2, used: 0 },
          2: { total: 1, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // Source data takes priority over class-based fallback
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(2);
    expect(combatant.spellSlots![2]).toBe(1);
  });
});

// ─── Configuration 2: Character without spells.spell_slots (fallback to table) ───

describe('Spell slot initialization — character without spells.spell_slots (fallback to table)', () => {
  it('returns undefined for non-spellcaster class with no spell data', () => {
    const character = createMockCharacter({
      name: 'Fighter Bob',
      class: 'Fighter' as any,
      spells: undefined
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeUndefined();
  });

  it('returns undefined for Fighter with empty spells object', () => {
    const character = createMockCharacter({
      name: 'Fighter Alice',
      class: 'Fighter' as any,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeUndefined();
  });

  it('uses full-caster table for Wizard level 5', () => {
    const character = createMockCharacter({
      name: 'Wizard Lv5',
      class: 'Wizard' as any,
      level: 5,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // Level 5 full caster: 4/3/2
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(2);
    expect(combatant.spellSlots![4]).toBeUndefined();
  });

  it('uses full-caster table for Cleric level 5 (same as Wizard)', () => {
    const character = createMockCharacter({
      name: 'Cleric Lv5',
      class: 'Cleric' as any,
      level: 5,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(2);
  });

  it('uses full-caster table for all recognized spellcasting classes at the same level', () => {
    const spellcastingClasses = ['Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'];

    for (const cls of spellcastingClasses) {
      const character = createMockCharacter({
        name: `${cls} Lv3`,
        class: cls as any,
        level: 3,
        spells: {
          spell_slots: {},
          known_spells: [],
          cantrips: []
        }
      });

      const combatant = getCombatant(character);
      // Level 3 full caster: 4 level-1, 2 level-2
      expect(combatant.spellSlots).toBeDefined();
      expect(combatant.spellSlots![1]).toBe(4);
      expect(combatant.spellSlots![2]).toBe(2);
    }
  });

  it('handles level 1 character correctly (only level 1 slots)', () => {
    const character = createMockCharacter({
      name: 'Apprentice Mage',
      class: 'Wizard' as any,
      level: 1,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // Level 1 full caster: 2 level-1 slots
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(2);
    expect(combatant.spellSlots![2]).toBeUndefined();
    expect(Object.keys(combatant.spellSlots!).length).toBe(1);
  });

  it('handles level 20 character correctly (all slot levels)', () => {
    const character = createMockCharacter({
      name: 'Archmage',
      class: 'Wizard' as any,
      level: 20,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // Level 20 full caster: 4/3/3/3/3/2/2/1/1
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(3);
    expect(combatant.spellSlots![4]).toBe(3);
    expect(combatant.spellSlots![5]).toBe(3);
    expect(combatant.spellSlots![6]).toBe(2);
    expect(combatant.spellSlots![7]).toBe(2);
    expect(combatant.spellSlots![8]).toBe(1);
    expect(combatant.spellSlots![9]).toBe(1);
  });

  it('returns empty object for spellcaster at level outside table range (level 0)', () => {
    const character = createMockCharacter({
      name: 'Level Zero',
      class: 'Wizard' as any,
      level: 0,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // Level 0 not in FULL_CASTER_SLOTS table → getFullCasterSlotsForLevel returns {}
    expect(combatant.spellSlots).toBeDefined();
    expect(Object.keys(combatant.spellSlots!)).toHaveLength(0);
  });

  it('returns empty object for spellcaster at level 21 (above table)', () => {
    const character = createMockCharacter({
      name: 'Level 21',
      class: 'Wizard' as any,
      level: 21,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // Level 21 not in FULL_CASTER_SLOTS table
    expect(combatant.spellSlots).toBeDefined();
    expect(Object.keys(combatant.spellSlots!)).toHaveLength(0);
  });
});

// ─── Configuration 3: Character with partially used slots ───

describe('Spell slot initialization — character with partially used slots', () => {
  it('computes remaining = total - used for each level', () => {
    const character = createMockCharacter({
      name: 'Battle Mage',
      class: 'Wizard' as any,
      spells: {
        spell_slots: {
          1: { total: 4, used: 2 },
          2: { total: 3, used: 1 },
          3: { total: 2, used: 0 },
          4: { total: 1, used: 1 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);

    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(2); // 4 - 2
    expect(combatant.spellSlots![2]).toBe(2); // 3 - 1
    expect(combatant.spellSlots![3]).toBe(2); // 2 - 0
    // Level 4: 1 - 1 = 0 → omitted
    expect(combatant.spellSlots![4]).toBeUndefined();
  });

  it('handles single remaining slot at a level', () => {
    const character = createMockCharacter({
      name: 'Conservative Caster',
      class: 'Cleric' as any,
      spells: {
        spell_slots: {
          3: { total: 2, used: 1 } // 1 remaining
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![3]).toBe(1);
  });

  it('handles mixed used/unused across many levels realistically', () => {
    // Simulates a mid-combat enemy that has cast some spells
    const character = createMockCharacter({
      name: 'Mid-Combat Lich',
      class: 'Wizard' as any,
      level: 13,
      spells: {
        spell_slots: {
          1: { total: 4, used: 3 }, // 1 remaining
          2: { total: 3, used: 3 }, // 0 remaining → omitted
          3: { total: 3, used: 1 }, // 2 remaining
          4: { total: 3, used: 0 }, // 3 remaining
          5: { total: 2, used: 2 }, // 0 remaining → omitted
          6: { total: 1, used: 0 }, // 1 remaining
          7: { total: 1, used: 1 }  // 0 remaining → omitted
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);

    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(1);
    expect(combatant.spellSlots![2]).toBeUndefined(); // all used
    expect(combatant.spellSlots![3]).toBe(2);
    expect(combatant.spellSlots![4]).toBe(3);
    expect(combatant.spellSlots![5]).toBeUndefined(); // all used
    expect(combatant.spellSlots![6]).toBe(1);
    expect(combatant.spellSlots![7]).toBeUndefined(); // all used

    // Only 4 levels should have remaining slots
    expect(Object.keys(combatant.spellSlots!)).toHaveLength(4);
  });

  it('handles character with used=0 at every level (fresh character)', () => {
    const character = createMockCharacter({
      name: 'Fresh Wizard',
      class: 'Wizard' as any,
      level: 9,
      spells: {
        spell_slots: {
          1: { total: 4, used: 0 },
          2: { total: 3, used: 0 },
          3: { total: 3, used: 0 },
          4: { total: 3, used: 0 },
          5: { total: 1, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);

    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(3);
    expect(combatant.spellSlots![4]).toBe(3);
    expect(combatant.spellSlots![5]).toBe(1);
    expect(Object.keys(combatant.spellSlots!)).toHaveLength(5);
  });

  it('prioritizes source spell_slots over fallback table even when partially used', () => {
    // A level 5 Wizard with source data that differs from the table
    // Table would give 4/3/2, but source says 2/1/0 (partially used from a custom set)
    const character = createMockCharacter({
      name: 'Custom Slots Wizard',
      class: 'Wizard' as any,
      level: 5,
      spells: {
        spell_slots: {
          1: { total: 6, used: 4 }, // 2 remaining (not table value of 4)
          2: { total: 2, used: 1 }, // 1 remaining (not table value of 3)
          3: { total: 1, used: 1 }  // 0 remaining
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);

    // Should use source data, NOT the level 5 table
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(2); // 6 - 4 from source
    expect(combatant.spellSlots![2]).toBe(1); // 2 - 1 from source
    expect(combatant.spellSlots![3]).toBeUndefined(); // 1 - 1 = 0
  });
});

// ─── Edge cases ───

describe('Spell slot initialization — edge cases', () => {
  it('handles character with spells property but spell_slots undefined', () => {
    const character = createMockCharacter({
      name: 'Incomplete Data',
      class: 'Wizard' as any,
      level: 5,
      spells: {
        spell_slots: undefined as any,
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    // spell_slots is undefined → falls back to table for Wizard
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(2);
  });

  it('creates combatants for both players and enemies in the same combat', () => {
    const playerCharacter = createMockCharacter({
      name: 'Player Wizard',
      class: 'Wizard' as any,
      level: 5,
      spells: {
        spell_slots: {
          1: { total: 4, used: 1 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const enemyCharacter = createMockCharacter({
      name: 'Enemy Cleric',
      class: 'Cleric' as any,
      level: 4,
      spells: {
        spell_slots: {
          1: { total: 4, used: 2 },
          2: { total: 3, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const engine = new CombatEngine();
    const combat = engine.startCombat([playerCharacter], [enemyCharacter]);

    const player = combat.combatants.find(c => c.id.startsWith('player'))!;
    const enemy = combat.combatants.find(c => c.id.startsWith('enemy'))!;

    // Player: 4 - 1 = 3 level-1 slots
    expect(player.spellSlots).toBeDefined();
    expect(player.spellSlots![1]).toBe(3);

    // Enemy: 4 - 2 = 2 level-1, 3 - 0 = 3 level-2
    expect(enemy.spellSlots).toBeDefined();
    expect(enemy.spellSlots![1]).toBe(2);
    expect(enemy.spellSlots![2]).toBe(3);
  });

  it('non-spellcaster Rogue with no spells field gets undefined spellSlots', () => {
    const character = createMockCharacter({
      name: 'Rogue',
      class: 'Rogue' as any,
      spells: undefined
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeUndefined();
  });

  it('non-spellcaster Barbarian with empty spells object gets undefined', () => {
    const character = createMockCharacter({
      name: 'Barbarian',
      class: 'Barbarian' as any,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = getCombatant(character);
    expect(combatant.spellSlots).toBeUndefined();
  });
});
