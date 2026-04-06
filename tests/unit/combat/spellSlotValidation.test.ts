/**
 * Unit tests for spell slot validation (Task 1.1.3)
 *
 * Validates that CombatEngine correctly validates spell slot data
 * and ensures consistency between source character and combatant.
 */

import { describe, it, expect } from 'vitest';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';
import type { Combatant } from '../../../src/core/types/Combat.js';

/** Minimal mock character with defaults for spell slot testing */
function createMockCharacter(overrides?: Partial<CharacterSheet>): CharacterSheet {
  return {
    name: 'Test Wizard',
    title: 'Arcane Scholar',
    level: 5,
    experience_points: 6500,
    race: 'Human',
    class: 'Wizard',
    background: undefined,
    alignment: undefined,
    ability_scores: {
      strength: 8,
      dexterity: 14,
      constitution: 12,
      intelligence: 18,
      wisdom: 13,
      charisma: 10
    },
    ability_modifiers: {
      strength: -1,
      dexterity: 2,
      constitution: 1,
      intelligence: 4,
      wisdom: 1,
      charisma: 0
    },
    hp: { current: 28, max: 28 },
    ac: 12,
    proficiency_bonus: 3,
    equipment: { weapons: [], armor: [] },
    spells: {
      spell_slots: {},
      known_spells: [],
      cantrips: []
    },
    class_features: [],
    saving_throws: {},
    skills: {},
    ...overrides
  };
}

/** Create a mock combatant from a character (simulates what CombatEngine.createCombatant does) */
function createMockCombatant(character: CharacterSheet, engine: CombatEngine): Combatant {
  // We start a combat to let the engine create combatants internally,
  // then extract one for validation.
  const combat = engine.startCombat([character], []);
  return combat.combatants[0];
}

describe('CombatEngine.validateSpellSlots', () => {
  it('returns empty array when character has no spell data', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({ spells: undefined });
    expect(engine.validateSpellSlots(character)).toEqual([]);
  });

  it('returns empty array when spell_slots is empty object', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: { spell_slots: {}, known_spells: [], cantrips: [] }
    });
    expect(engine.validateSpellSlots(character)).toEqual([]);
  });

  it('returns empty array for valid spell slot data', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: {
          1: { total: 4, used: 1 },
          2: { total: 3, used: 0 },
          3: { total: 2, used: 2 }
        },
        known_spells: ['Fireball'],
        cantrips: ['Fire Bolt']
      }
    });
    expect(engine.validateSpellSlots(character)).toEqual([]);
  });

  it('detects negative total', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: { 1: { total: -2, used: 0 } },
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const negTotal = issues.find(i => i.message.includes('negative total'));
    expect(negTotal).toBeDefined();
    expect(negTotal!.severity).toBe('error');
    expect(negTotal!.level).toBe(1);
  });

  it('detects negative used', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: { 2: { total: 3, used: -1 } },
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('negative used');
  });

  it('detects used exceeding total', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: { 3: { total: 2, used: 5 } },
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('used (5) exceeding total (2)');
  });

  it('detects non-integer spell level key', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: {
          'abc': { total: 4, used: 0 }
        } as any,
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Invalid spell level key');
  });

  it('detects spell level 0 (invalid)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: {
          0: { total: 99, used: 0 }
        } as any,
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Invalid spell level key');
  });

  it('detects spell level 10 (out of range)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: {
          10: { total: 1, used: 0 }
        } as any,
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('Invalid spell level key');
  });

  it('warns when total is 0 but used is non-zero', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: { 4: { total: 0, used: 1 } },
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    // Both "total=0 but used" and "used exceeding total" are valid signals
    expect(issues.length).toBeGreaterThanOrEqual(1);
    const warnIssue = issues.find(i => i.severity === 'warn');
    expect(warnIssue).toBeDefined();
    expect(warnIssue!.message).toContain('total=0 but used=1');
  });

  it('detects multiple issues at once', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: {
          1: { total: -1, used: 0 },
          2: { total: 3, used: 5 },
          3: { total: 0, used: 2 }
        },
        known_spells: [],
        cantrips: []
      }
    });
    const issues = engine.validateSpellSlots(character);
    expect(issues.length).toBeGreaterThanOrEqual(3);
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warn');
    expect(errors.length).toBeGreaterThanOrEqual(2); // negative total + used > total
    expect(warnings.length).toBeGreaterThanOrEqual(1); // total=0 with used
  });

  it('allows used === total (all slots consumed)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: { 1: { total: 4, used: 4 } },
        known_spells: [],
        cantrips: []
      }
    });
    expect(engine.validateSpellSlots(character)).toEqual([]);
  });

  it('allows used === 0 (fresh slots)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      spells: {
        spell_slots: { 1: { total: 4, used: 0 } },
        known_spells: [],
        cantrips: []
      }
    });
    expect(engine.validateSpellSlots(character)).toEqual([]);
  });
});

describe('CombatEngine.initializeSpellSlots — validation integration', () => {
  it('uses source spell_slots when valid', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 1 },
          3: { total: 2, used: 0 }
        },
        known_spells: ['Fireball'],
        cantrips: ['Fire Bolt']
      }
    });

    const combatant = createMockCombatant(character, engine);
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(3); // 4 - 1 = 3
    expect(combatant.spellSlots![3]).toBe(2); // 2 - 0 = 2
  });

  it('falls back to table when source has errors (negative total)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      level: 5,
      spells: {
        spell_slots: {
          1: { total: -1, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    // Suppress console.warn for this test
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const combatant = createMockCombatant(character, engine);

    // Should fall back to Wizard level 5 table: 4 level-1 slots, 3 level-2, 2 level-3
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(2);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Spell slot validation failed')
    );

    warnSpy.mockRestore();
  });

  it('falls back to table when source has errors (used > total)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Cleric',
      level: 3,
      spells: {
        spell_slots: {
          1: { total: 2, used: 10 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const combatant = createMockCombatant(character, engine);

    // Should fall back to Cleric level 3 table: 4 level-1, 2 level-2
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(2);

    warnSpy.mockRestore();
  });

  it('falls back to table when total=0 with used>0 (triggers both warn and error)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      level: 5,
      spells: {
        spell_slots: {
          1: { total: 4, used: 0 },
          4: { total: 0, used: 1 }  // used > total → error, plus total=0 warn
        },
        known_spells: [],
        cantrips: []
      }
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const combatant = createMockCombatant(character, engine);
    // Falls back to table because used (1) > total (0) is an error
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4); // from fallback table

    warnSpy.mockRestore();
  });

  it('returns undefined for non-spellcaster with no spell data', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Fighter',
      spells: undefined
    });

    const combatant = createMockCombatant(character, engine);
    expect(combatant.spellSlots).toBeUndefined();
  });

  it('returns undefined when all source slots are fully used', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 4 },
          2: { total: 3, used: 3 }
        },
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = createMockCombatant(character, engine);
    expect(combatant.spellSlots).toBeUndefined();
  });

  it('uses fallback table for spellcasting class with no source slots', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Sorcerer',
      level: 7,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });

    const combatant = createMockCombatant(character, engine);
    // Sorcerer level 7 (full caster): 4/3/3/1
    expect(combatant.spellSlots).toBeDefined();
    expect(combatant.spellSlots![1]).toBe(4);
    expect(combatant.spellSlots![2]).toBe(3);
    expect(combatant.spellSlots![3]).toBe(3);
    expect(combatant.spellSlots![4]).toBe(1);
  });
});

describe('CombatEngine.validateCombatantSpellSlots', () => {
  it('returns empty when both source and combatant have no slots (non-spellcaster)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({ class: 'Fighter', spells: undefined });
    const combatant = createMockCombatant(character, engine);

    expect(engine.validateCombatantSpellSlots(combatant)).toEqual([]);
  });

  it('returns empty when combatant slots match source', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 1 },
          3: { total: 2, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });
    const combatant = createMockCombatant(character, engine);

    expect(engine.validateCombatantSpellSlots(combatant)).toEqual([]);
  });

  it('detects mismatch between combatant and source slots', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });
    const combatant = createMockCombatant(character, engine);

    // Manually tamper with combatant slots to simulate a bug
    combatant.spellSlots![1] = 2;

    const issues = engine.validateCombatantSpellSlots(combatant);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('combatant has 2 but source expects 4');
  });

  it('detects combatant slot level not in source', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 0 }
        },
        known_spells: [],
        cantrips: []
      }
    });
    const combatant = createMockCombatant(character, engine);

    // Add a slot level that doesn't exist in source
    combatant.spellSlots![5] = 1;

    const issues = engine.validateCombatantSpellSlots(combatant);
    const warns = issues.filter(i => i.severity === 'warn');
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns.some(w => w.message.includes('no source data for that level'))).toBe(true);
  });

  it('passes when all source slots are fully used and combatant has no slots', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 4 },
          2: { total: 3, used: 3 }
        },
        known_spells: [],
        cantrips: []
      }
    });
    const combatant = createMockCombatant(character, engine);

    expect(engine.validateCombatantSpellSlots(combatant)).toEqual([]);
  });

  it('detects combatant with slots but source all used (inconsistency)', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Wizard',
      spells: {
        spell_slots: {
          1: { total: 4, used: 4 }
        },
        known_spells: [],
        cantrips: []
      }
    });
    const combatant = createMockCombatant(character, engine);

    // Source says all used, but manually set combatant to have slots (simulating a bug)
    combatant.spellSlots = { 1: 4 };

    const issues = engine.validateCombatantSpellSlots(combatant);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('all used');
  });

  it('tolerates fallback table slots when source is empty for known class', () => {
    const engine = new CombatEngine();
    const character = createMockCharacter({
      class: 'Cleric',
      level: 5,
      spells: {
        spell_slots: {},
        known_spells: [],
        cantrips: []
      }
    });
    const combatant = createMockCombatant(character, engine);

    // No errors — combatant has fallback table slots, no source slots, which is fine
    expect(engine.validateCombatantSpellSlots(combatant)).toEqual([]);
  });
});

// vi is needed for spy mocking
import { vi } from 'vitest';
