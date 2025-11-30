/**
 * SpellManager - Manages spell assignment, spell slots, and cantrips for spellcasting classes
 */

import type { Class } from '../types/Character.js';
// import type { SeededRNG } from '../../utils/random.js';
import { CLASS_SPELL_LISTS, SPELL_SLOTS_BY_CLASS } from '../../utils/constants.js';

export interface SpellSlots {
  /** Record of spell slots by spell level (0-9) */
  spell_slots: Record<number, { total: number; used: number }>;
  /** Array of known spell names */
  known_spells: string[];
  /** Array of cantrip names */
  cantrips: string[];
}

export class SpellManager {
  /**
   * Check if a class is a spellcaster
   *
   * @param characterClass - The character's class
   * @returns true if the class can cast spells
   */
  static isSpellcaster(characterClass: Class): boolean {
    const spellcasters: Class[] = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];
    return spellcasters.includes(characterClass);
  }

  /**
   * Get spell slots for a class at a given level
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @returns Record of spell slots by spell level with total and used counts
   */
  static getSpellSlots(
    characterClass: Class,
    characterLevel: number
  ): Record<number, { total: number; used: number }> {
    if (!this.isSpellcaster(characterClass)) {
      return {};
    }

    // Initialize all spell levels with 0 slots
    const slots: Record<number, { total: number; used: number }> = {};
    for (let i = 0; i <= 9; i++) {
      slots[i] = { total: 0, used: 0 };
    }

    // Get spell slots from constant data
    const classSlots = SPELL_SLOTS_BY_CLASS[characterClass];
    if (!classSlots) {
      return slots;
    }

    const levelSlots = classSlots[characterLevel];
    if (!levelSlots) {
      return slots;
    }

    // Update slots with the class's progression
    for (const [spellLevel, count] of Object.entries(levelSlots)) {
      const level = parseInt(spellLevel, 10);
      slots[level] = { total: count, used: 0 };
    }

    return slots;
  }

  /**
   * Get cantrips known by a spellcaster at a given level
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @param rng - Seeded random number generator for deterministic selection
   * @returns Array of cantrip names
   */
  static getCantrips(
    characterClass: Class
  ): string[] {
    if (!this.isSpellcaster(characterClass)) {
      return [];
    }

    const spellList = CLASS_SPELL_LISTS[characterClass];
    if (!spellList || !spellList.cantrips || spellList.cantrips.length === 0) {
      return [];
    }

    // Return all available cantrips for the class
    // (Cantrips are typically all known by a spellcaster and scale with level)
    return [...spellList.cantrips];
  }

  /**
   * Get spells known by a spellcaster at a given level
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @param rng - Seeded random number generator for deterministic selection
   * @returns Array of spell names that the character knows
   */
  static getKnownSpells(
    characterClass: Class,
    characterLevel: number
  ): string[] {
    if (!this.isSpellcaster(characterClass)) {
      return [];
    }

    const spellList = CLASS_SPELL_LISTS[characterClass];
    if (!spellList || !spellList.spells_by_level) {
      return [];
    }

    const knownSpells: string[] = [];

    // Collect all spells available up to the character's level
    for (let level = 1; level <= characterLevel && level <= 9; level++) {
      const spellsAtLevel = spellList.spells_by_level[level];
      if (spellsAtLevel && spellsAtLevel.length > 0) {
        // Add spells from this level (deterministically selected based on class progression)
        knownSpells.push(...spellsAtLevel);
      }
    }

    return knownSpells;
  }

  /**
   * Initialize complete spell configuration for a spellcaster
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @param rng - Seeded random number generator for deterministic selection
   * @returns SpellSlots object with spell slots, known spells, and cantrips
   */
  static initializeSpells(
    characterClass: Class,
    characterLevel: number
  ): SpellSlots {
    return {
      spell_slots: this.getSpellSlots(characterClass, characterLevel),
      known_spells: this.getKnownSpells(characterClass, characterLevel),
      cantrips: this.getCantrips(characterClass),
    };
  }

  /**
   * Get spell count at a given spell level that a character knows
   *
   * @param spellLevel - The spell level (0-9)
   * @param spellSlots - The spell slots record from a character
   * @returns Number of spells known at that level
   */
  static getSpellCountAtLevel(
    spellLevel: number,
    spellSlots: Record<number, { total: number; used: number }>
  ): number {
    return spellSlots[spellLevel]?.total || 0;
  }

  /**
   * Use a spell slot at a given level
   *
   * @param spellSlots - The spell slots record from a character
   * @param spellLevel - The spell level (1-9, not 0 for cantrips)
   * @returns Updated spell slots with one slot used
   */
  static useSpellSlot(
    spellSlots: Record<number, { total: number; used: number }>,
    spellLevel: number
  ): Record<number, { total: number; used: number }> {
    if (spellLevel < 1 || spellLevel > 9) {
      throw new Error(`Invalid spell level: ${spellLevel}. Must be between 1 and 9.`);
    }

    const updated = { ...spellSlots };
    const slot = updated[spellLevel];

    if (slot && slot.used < slot.total) {
      updated[spellLevel] = { ...slot, used: slot.used + 1 };
    }

    return updated;
  }

  /**
   * Restore all spell slots at a given level
   *
   * @param spellSlots - The spell slots record from a character
   * @param spellLevel - The spell level (1-9) or undefined to restore all
   * @returns Updated spell slots with slots restored
   */
  static restoreSpellSlots(
    spellSlots: Record<number, { total: number; used: number }>,
    spellLevel?: number
  ): Record<number, { total: number; used: number }> {
    const updated = { ...spellSlots };

    if (spellLevel !== undefined) {
      const slot = updated[spellLevel];
      if (slot) {
        updated[spellLevel] = { ...slot, used: 0 };
      }
    } else {
      // Restore all levels
      for (let i = 1; i <= 9; i++) {
        const slot = updated[i];
        if (slot) {
          updated[i] = { ...slot, used: 0 };
        }
      }
    }

    return updated;
  }
}
