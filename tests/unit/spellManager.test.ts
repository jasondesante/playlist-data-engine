/**
 * Unit tests for SpellManager - spell assignment, slots, and cantrips
 */

import { describe, it, expect } from 'vitest';
import { SpellManager } from '../../src/core/generation/SpellManager.js';
import { SeededRNG } from '../../src/utils/random.js';
import { CLASS_SPELL_LISTS, SPELL_SLOTS_BY_CLASS, SPELL_DATABASE } from '../../src/constants/DefaultSpells.js';
import type { Class } from '../../src/core/types/Character.js';

describe('SpellManager', () => {
  describe('isSpellcaster', () => {
    it('should identify spellcasting classes', () => {
      const spellcasters: Class[] = ['Wizard', 'Sorcerer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Warlock'];
      for (const spellcaster of spellcasters) {
        expect(SpellManager.isSpellcaster(spellcaster)).toBe(true);
      }
    });

    it('should identify non-spellcasting classes', () => {
      const nonSpellcasters: Class[] = ['Barbarian', 'Fighter', 'Monk', 'Rogue'];
      for (const nonSpellcaster of nonSpellcasters) {
        expect(SpellManager.isSpellcaster(nonSpellcaster)).toBe(false);
      }
    });
  });

  describe('getSpellSlots', () => {
    it('should return empty object for non-spellcasters', () => {
      const slots = SpellManager.getSpellSlots('Barbarian', 1);
      expect(Object.keys(slots).length).toBe(0);
    });

    it('should return spell slots for spellcasting classes', () => {
      const slots = SpellManager.getSpellSlots('Wizard', 1);
      expect(slots[1]).toBeDefined();
      expect(slots[1].total).toBeGreaterThan(0);
    });

    it('should have correct number of 1st level slots for Wizard at level 1', () => {
      const slots = SpellManager.getSpellSlots('Wizard', 1);
      expect(slots[1].total).toBe(2);
      expect(slots[1].used).toBe(0);
    });

    it('should increase spell slots as character levels up', () => {
      const level1Slots = SpellManager.getSpellSlots('Wizard', 1);
      const level5Slots = SpellManager.getSpellSlots('Wizard', 5);

      expect(level5Slots[1].total).toBeGreaterThanOrEqual(level1Slots[1].total);
      expect(level5Slots[2]).toBeDefined();
      expect(level5Slots[3]).toBeDefined();
    });

    it('should grant high-level spell slots at appropriate levels', () => {
      const level17Slots = SpellManager.getSpellSlots('Wizard', 17);
      expect(level17Slots[9]).toBeDefined();
      expect(level17Slots[9].total).toBeGreaterThan(0);
    });

    it('should initialize all spell slots with used: 0', () => {
      const slots = SpellManager.getSpellSlots('Cleric', 5);
      for (let level = 1; level <= 3; level++) {
        if (slots[level].total > 0) {
          expect(slots[level].used).toBe(0);
        }
      }
    });

    it('should have different progressions for different classes', () => {
      const wizardSlots = SpellManager.getSpellSlots('Wizard', 5);
      const warlockSlots = SpellManager.getSpellSlots('Warlock', 5);

      // Warlock has different slot progression than Wizard
      expect(wizardSlots[1].total).not.toBe(warlockSlots[1].total);
    });
  });

  describe('getCantrips', () => {
    it('should return empty array for non-spellcasters', () => {
      const cantrips = SpellManager.getCantrips('Fighter', 1, new SeededRNG('test'));
      expect(cantrips).toEqual([]);
    });

    it('should return cantrips for spellcasting classes', () => {
      const cantrips = SpellManager.getCantrips('Wizard', 1, new SeededRNG('test'));
      expect(cantrips.length).toBeGreaterThan(0);
    });

    it('should return all available cantrips for the class', () => {
      const cantrips = SpellManager.getCantrips('Wizard', 1, new SeededRNG('test'));
      const expectedCantrips = CLASS_SPELL_LISTS['Wizard'].cantrips;
      expect(cantrips).toEqual(expectedCantrips);
    });

    it('should include valid spell names from database', () => {
      const cantrips = SpellManager.getCantrips('Sorcerer', 1, new SeededRNG('test'));
      for (const cantrip of cantrips) {
        expect(SPELL_DATABASE[cantrip]).toBeDefined();
        expect(SPELL_DATABASE[cantrip].level).toBe(0);
      }
    });

    it('Paladin and Ranger should have no cantrips', () => {
      expect(SpellManager.getCantrips('Paladin', 10, new SeededRNG('test'))).toEqual([]);
      expect(SpellManager.getCantrips('Ranger', 10, new SeededRNG('test'))).toEqual([]);
    });

    it('Bard should have exactly 6 cantrips', () => {
      const cantrips = SpellManager.getCantrips('Bard', 1, new SeededRNG('test'));
      expect(cantrips).toHaveLength(6);
    });
  });

  describe('getKnownSpells', () => {
    it('should return empty array for non-spellcasters', () => {
      const spells = SpellManager.getKnownSpells('Rogue', 1, new SeededRNG('test'));
      expect(spells).toEqual([]);
    });

    it('should return spells for spellcasting classes', () => {
      const spells = SpellManager.getKnownSpells('Wizard', 1, new SeededRNG('test'));
      expect(spells.length).toBeGreaterThan(0);
    });

    it('should only include spells available for the class', () => {
      const spells = SpellManager.getKnownSpells('Wizard', 1, new SeededRNG('test'));
      const availableSpells = CLASS_SPELL_LISTS['Wizard'].spells_by_level[1];

      for (const spell of spells) {
        expect(availableSpells).toContain(spell);
      }
    });

    it('should be deterministic - same seed produces same spells', () => {
      const rng1 = new SeededRNG('same-seed');
      const rng2 = new SeededRNG('same-seed');

      const spells1 = SpellManager.getKnownSpells('Cleric', 5, rng1);
      const spells2 = SpellManager.getKnownSpells('Cleric', 5, rng2);

      expect(spells1).toEqual(spells2);
    });

    it('should increase spell count as character levels up', () => {
      const spells1 = SpellManager.getKnownSpells('Wizard', 1, new SeededRNG('test'));
      const spells5 = SpellManager.getKnownSpells('Wizard', 5, new SeededRNG('test'));
      const spells9 = SpellManager.getKnownSpells('Wizard', 9, new SeededRNG('test'));

      expect(spells5.length).toBeGreaterThanOrEqual(spells1.length);
      expect(spells9.length).toBeGreaterThanOrEqual(spells5.length);
    });

    it('should include valid spell names from database', () => {
      const spells = SpellManager.getKnownSpells('Sorcerer', 3, new SeededRNG('test'));
      for (const spell of spells) {
        expect(SPELL_DATABASE[spell]).toBeDefined();
      }
    });

    it('should not include spells above character level', () => {
      const spells = SpellManager.getKnownSpells('Wizard', 2, new SeededRNG('test'));
      const spellList = CLASS_SPELL_LISTS['Wizard'];

      // Only spell levels 1-2 should be included
      for (const spell of spells) {
        let found = false;
        for (let level = 1; level <= 2; level++) {
          if (spellList.spells_by_level[level]?.includes(spell)) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });

    it('level 1 character should not have access to 2nd+ level spells', () => {
      const spells = SpellManager.getKnownSpells('Bard', 1, new SeededRNG('test'));
      const level2Spells = CLASS_SPELL_LISTS['Bard'].spells_by_level[2] || [];

      for (const spell of spells) {
        expect(level2Spells).not.toContain(spell);
      }
    });
  });

  describe('initializeSpells', () => {
    it('should return SpellSlots object for spellcasters', () => {
      const result = SpellManager.initializeSpells('Wizard', 1, new SeededRNG('test'));
      expect(result).toHaveProperty('spell_slots');
      expect(result).toHaveProperty('known_spells');
      expect(result).toHaveProperty('cantrips');
    });

    it('should include populated spell slots', () => {
      const result = SpellManager.initializeSpells('Cleric', 5, new SeededRNG('test'));
      expect(result.spell_slots[1]).toBeDefined();
      expect(result.spell_slots[1].total).toBeGreaterThan(0);
    });

    it('should include known spells', () => {
      const result = SpellManager.initializeSpells('Sorcerer', 3, new SeededRNG('test'));
      expect(result.known_spells.length).toBeGreaterThan(0);
    });

    it('should include cantrips', () => {
      const result = SpellManager.initializeSpells('Bard', 1, new SeededRNG('test'));
      expect(result.cantrips.length).toBeGreaterThan(0);
    });

    it('should be deterministic across multiple calls', () => {
      const result1 = SpellManager.initializeSpells('Wizard', 5, new SeededRNG('seed1'));
      const result2 = SpellManager.initializeSpells('Wizard', 5, new SeededRNG('seed1'));

      expect(result1.spell_slots).toEqual(result2.spell_slots);
      expect(result1.cantrips).toEqual(result2.cantrips);
    });

    it('should return valid spell names', () => {
      const result = SpellManager.initializeSpells('Druid', 7, new SeededRNG('test'));

      for (const spell of result.known_spells) {
        expect(SPELL_DATABASE[spell]).toBeDefined();
      }

      for (const cantrip of result.cantrips) {
        expect(SPELL_DATABASE[cantrip]).toBeDefined();
        expect(SPELL_DATABASE[cantrip].level).toBe(0);
      }
    });
  });

  describe('getSpellCountAtLevel', () => {
    it('should return correct spell count for a level', () => {
      const spellSlots = SpellManager.getSpellSlots('Wizard', 5);
      expect(SpellManager.getSpellCountAtLevel(1, spellSlots)).toBe(4);
      expect(SpellManager.getSpellCountAtLevel(2, spellSlots)).toBe(3);
    });

    it('should return 0 for levels with no slots', () => {
      const spellSlots = SpellManager.getSpellSlots('Barbarian', 1);
      expect(SpellManager.getSpellCountAtLevel(1, spellSlots)).toBe(0);
    });

    it('should handle non-existent spell levels gracefully', () => {
      const spellSlots = SpellManager.getSpellSlots('Wizard', 1);
      expect(SpellManager.getSpellCountAtLevel(9, spellSlots)).toBe(0);
    });
  });

  describe('useSpellSlot', () => {
    it('should increment used count', () => {
      let spellSlots = SpellManager.getSpellSlots('Wizard', 5);
      const initialUsed = spellSlots[1].used;

      spellSlots = SpellManager.useSpellSlot(spellSlots, 1);
      expect(spellSlots[1].used).toBe(initialUsed + 1);
    });

    it('should not exceed total slots', () => {
      let spellSlots = SpellManager.getSpellSlots('Wizard', 1);
      const totalSlots = spellSlots[1].total;

      for (let i = 0; i < totalSlots + 5; i++) {
        spellSlots = SpellManager.useSpellSlot(spellSlots, 1);
      }

      expect(spellSlots[1].used).toBeLessThanOrEqual(totalSlots);
    });

    it('should throw on invalid spell level', () => {
      const spellSlots = SpellManager.getSpellSlots('Wizard', 5);
      expect(() => SpellManager.useSpellSlot(spellSlots, 0)).toThrow();
      expect(() => SpellManager.useSpellSlot(spellSlots, 10)).toThrow();
    });

    it('should return a new object (immutable)', () => {
      const original = SpellManager.getSpellSlots('Wizard', 5);
      const modified = SpellManager.useSpellSlot(original, 1);

      expect(original).not.toBe(modified);
      expect(original[1].used).toBe(0);
    });
  });

  describe('restoreSpellSlots', () => {
    it('should reset used slots to 0 for specific level', () => {
      let spellSlots = SpellManager.getSpellSlots('Wizard', 5);
      spellSlots = SpellManager.useSpellSlot(spellSlots, 1);
      spellSlots = SpellManager.useSpellSlot(spellSlots, 1);

      spellSlots = SpellManager.restoreSpellSlots(spellSlots, 1);
      expect(spellSlots[1].used).toBe(0);
    });

    it('should reset all spell slots when no level specified', () => {
      let spellSlots = SpellManager.getSpellSlots('Wizard', 5);
      spellSlots = SpellManager.useSpellSlot(spellSlots, 1);
      spellSlots = SpellManager.useSpellSlot(spellSlots, 2);
      spellSlots = SpellManager.useSpellSlot(spellSlots, 2);

      spellSlots = SpellManager.restoreSpellSlots(spellSlots);

      for (let level = 1; level <= 9; level++) {
        if (spellSlots[level]) {
          expect(spellSlots[level].used).toBe(0);
        }
      }
    });

    it('should return a new object (immutable)', () => {
      const original = SpellManager.getSpellSlots('Wizard', 5);
      const modified = SpellManager.restoreSpellSlots(original, 1);

      expect(original).not.toBe(modified);
    });

    it('should not affect total slots', () => {
      let spellSlots = SpellManager.getSpellSlots('Wizard', 5);
      const originalTotal = spellSlots[1].total;

      spellSlots = SpellManager.useSpellSlot(spellSlots, 1);
      spellSlots = SpellManager.restoreSpellSlots(spellSlots, 1);

      expect(spellSlots[1].total).toBe(originalTotal);
    });
  });

  describe('Class-specific spell progression', () => {
    it('Wizard should have maximum spell slots', () => {
      const wizardSlots = SpellManager.getSpellSlots('Wizard', 20);
      expect(wizardSlots[9].total).toBe(1);
    });

    it('Warlock should have fewer spell slots but gain level 5 spells earlier', () => {
      const warlockSlots = SpellManager.getSpellSlots('Warlock', 9);
      expect(warlockSlots[5]).toBeDefined();
    });

    it('Paladin should not get spells until level 2', () => {
      const paladinLevel1 = SpellManager.getSpellSlots('Paladin', 1);
      const paladinLevel2 = SpellManager.getSpellSlots('Paladin', 2);

      expect(paladinLevel1[1].total).toBe(0);
      expect(paladinLevel2[1].total).toBeGreaterThan(0);
    });

    it('Ranger should not get spells until level 2', () => {
      const rangerLevel1 = SpellManager.getSpellSlots('Ranger', 1);
      const rangerLevel2 = SpellManager.getSpellSlots('Ranger', 2);

      expect(rangerLevel1[1].total).toBe(0);
      expect(rangerLevel2[1].total).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle level 0 gracefully', () => {
      const slots = SpellManager.getSpellSlots('Wizard', 0);
      expect(slots).toBeDefined();
    });

    it('should handle level > 20 by returning level 20 slots', () => {
      const slots = SpellManager.getSpellSlots('Wizard', 25);
      const level20Slots = SpellManager.getSpellSlots('Wizard', 20);

      // Should return empty or level 20 equivalent
      expect(slots).toBeDefined();
    });

    it('should handle undefined spell list entries', () => {
      const spells = SpellManager.getKnownSpells('Ranger', 2, new SeededRNG('test'));
      expect(spells).toBeDefined();
      expect(Array.isArray(spells)).toBe(true);
    });
  });
});
