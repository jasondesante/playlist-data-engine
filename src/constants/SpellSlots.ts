/**
 * Spell Slot Constants
 *
 * D&D 5e spell slot progression tables for combat use.
 * Based on Player's Handbook (2014) full caster progression.
 *
 * The FULL_CASTER_SLOTS table maps character level (1-20) to an array
 * of spell slot counts per spell level (index 0 unused, indices 1-9
 * represent spell levels 1-9).
 *
 * This table is the canonical source used by CombatEngine and SpellCaster.
 * For per-class spell slot data (including half-casters like Paladin/Ranger
 * and pact-magic casters like Warlock), see SPELL_SLOTS_BY_CLASS in
 * DefaultSpells.ts.
 */

/**
 * D&D 5e full caster spell slot progression by character level.
 *
 * Each entry maps character level → [_, level1, level2, ..., level9].
 * Index 0 is unused padding to align array indices with spell levels.
 */
export const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  2:  [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  3:  [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  4:  [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  5:  [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  6:  [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  7:  [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  8:  [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  9:  [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/**
 * Convert FULL_CASTER_SLOTS entry into the flat `{ [level]: number }` format
 * used by Combatant.spellSlots.
 */
export function getFullCasterSlotsForLevel(
  characterLevel: number
): { [level: number]: number } {
  const slots = FULL_CASTER_SLOTS[characterLevel];
  if (!slots) {
    return {};
  }

  const result: { [level: number]: number } = {};
  for (let i = 1; i < slots.length; i++) {
    if (slots[i] > 0) {
      result[i] = slots[i];
    }
  }
  return result;
}
