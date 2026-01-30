/**
 * SpellManager - Manages spell assignment, spell slots, and cantrips for spellcasting classes
 *
 * Part of Phase 4.2: Update SpellManager for prerequisite filtering.
 */

import type { Class, CharacterSheet } from '../types/Character.js';
// import type { SeededRNG } from '../../utils/random.js';
import { CLASS_SPELL_LISTS, SPELL_SLOTS_BY_CLASS, SPELL_DATABASE } from '../../utils/constants.js';
import { ExtensionManager } from '../extensions/ExtensionManager.js';
import { ensureSpellDefaultsInitialized } from '../extensions/initializeDefaults.js';
import { SpellValidator } from '../spells/SpellValidator.js';

/**
 * Interface for class spell list data (used for extensibility)
 */
interface ClassSpellListData {
    class: Class;
    cantrips: string[];
    spells_by_level: Record<number, string[]>;
}

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
    const spellcasters: Class[] = ['Bard' as Class, 'Cleric' as Class, 'Druid' as Class, 'Paladin' as Class, 'Ranger' as Class, 'Sorcerer' as Class, 'Warlock' as Class, 'Wizard' as Class];
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
   * Uses the ExtensionManager to get extended spell data (defaults + custom).
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @returns Array of cantrip names
   */
  static getCantrips(
    characterClass: Class
  ): string[] {
    if (!this.isSpellcaster(characterClass)) {
      return [];
    }

    // Ensure spell defaults are initialized
    ensureSpellDefaultsInitialized();

    const manager = ExtensionManager.getInstance();
    const category = `spells.${characterClass}` as const;
    const classSpellData = manager.get(category);

    // Start with default cantrips
    const defaultList = CLASS_SPELL_LISTS[characterClass];
    const mergedCantrips = defaultList ? [...defaultList.cantrips] : [];

    // Merge in custom cantrips from all extended spell lists
    for (const spellData of classSpellData) {
      const list = spellData as ClassSpellListData;
      if (list.cantrips && list.cantrips.length > 0) {
        for (const cantrip of list.cantrips) {
          if (!mergedCantrips.includes(cantrip)) {
            mergedCantrips.push(cantrip);
          }
        }
      }
    }

    return mergedCantrips;
  }

  /**
   * Get spells known by a spellcaster at a given level
   *
   * Uses the ExtensionManager to get extended spell data (defaults + custom).
   * Filters spells by prerequisites when a character is provided.
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @param character - Optional character sheet for prerequisite validation
   * @returns Array of spell names that the character knows
   */
  static getKnownSpells(
    characterClass: Class,
    characterLevel: number,
    character?: CharacterSheet
  ): string[] {
    if (!this.isSpellcaster(characterClass)) {
      return [];
    }

    // Ensure spell defaults are initialized
    ensureSpellDefaultsInitialized();

    const manager = ExtensionManager.getInstance();
    const category = `spells.${characterClass}` as const;
    const classSpellData = manager.get(category);

    let spellList: { cantrips: string[]; spells_by_level: Record<number, string[]> };

    if (classSpellData.length === 0) {
      // Fall back to default data if no extended data
      const defaultList = CLASS_SPELL_LISTS[characterClass];
      if (!defaultList || !defaultList.spells_by_level) {
        return [];
      }
      spellList = defaultList;
    } else {
      // Merge spell lists from all extended data sources (defaults + custom)
      // Start with defaults from CLASS_SPELL_LISTS
      const defaultList = CLASS_SPELL_LISTS[characterClass];
      const mergedCantrips = defaultList ? [...defaultList.cantrips] : [];
      const mergedSpellsByLevel: Record<number, string[]> = {};

      // Initialize with default spells
      if (defaultList && defaultList.spells_by_level) {
        for (const [level, spells] of Object.entries(defaultList.spells_by_level)) {
          mergedSpellsByLevel[Number(level)] = [...spells];
        }
      }

      // Merge in custom spells from all extended spell lists
      for (const spellData of classSpellData) {
        const list = spellData as ClassSpellListData;
        // Merge cantrips
        if (list.cantrips && list.cantrips.length > 0) {
          for (const cantrip of list.cantrips) {
            if (!mergedCantrips.includes(cantrip)) {
              mergedCantrips.push(cantrip);
            }
          }
        }
        // Merge spells by level
        if (list.spells_by_level) {
          for (const [level, spells] of Object.entries(list.spells_by_level)) {
            const levelNum = Number(level);
            if (!mergedSpellsByLevel[levelNum]) {
              mergedSpellsByLevel[levelNum] = [];
            }
            for (const spell of spells) {
              if (!mergedSpellsByLevel[levelNum].includes(spell)) {
                mergedSpellsByLevel[levelNum].push(spell);
              }
            }
          }
        }
      }

      spellList = {
        cantrips: mergedCantrips,
        spells_by_level: mergedSpellsByLevel
      };
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

    // Filter by prerequisites if character provided
    return character
      ? this.filterSpellsByPrerequisites(knownSpells, character)
      : knownSpells;
  }

  /**
   * Filter spells by prerequisites
   *
   * Removes spells that have unmet prerequisites for the given character.
   * Spells without prerequisites are always included.
   *
   * @param spellNames - Array of spell names to filter
   * @param character - Character sheet to validate prerequisites against
   * @returns Array of spell names whose prerequisites are met
   */
  private static filterSpellsByPrerequisites(
    spellNames: string[],
    character: CharacterSheet
  ): string[] {
    const validSpells: string[] = [];

    for (const spellName of spellNames) {
      const spell = SPELL_DATABASE[spellName];
      if (!spell) {
        // If spell is not in database, include it (for custom spells)
        validSpells.push(spellName);
        continue;
      }

      // Skip spells with unmet prerequisites
      if (spell.prerequisites) {
        const result = SpellValidator.validateSpellPrerequisites(spell.prerequisites, character);
        if (!result.valid) {
          // Spell has prerequisites that are not met - skip it
          continue;
        }
      }

      validSpells.push(spellName);
    }

    return validSpells;
  }

  /**
   * Initialize complete spell configuration for a spellcaster
   *
   * @param characterClass - The character's class
   * @param characterLevel - The character's level (1-20)
   * @param character - Optional character sheet for prerequisite validation
   * @returns SpellSlots object with spell slots, known spells, and cantrips
   */
  static initializeSpells(
    characterClass: Class,
    characterLevel: number,
    character?: CharacterSheet
  ): SpellSlots {
    return {
      spell_slots: this.getSpellSlots(characterClass, characterLevel),
      known_spells: this.getKnownSpells(characterClass, characterLevel, character),
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

  /**
   * Filter character's spells by prerequisites
   *
   * Updates a character's known_spells array to only include spells whose
   * prerequisites are met by the character. Used during character generation
   * and when validating characters with custom spells.
   *
   * @param character - The character sheet whose spells should be filtered
   * @returns Updated character with filtered spells
   */
  static filterCharacterSpells(character: CharacterSheet): CharacterSheet {
    if (!character.spells) {
      return character;
    }

    const filteredKnownSpells = this.filterSpellsByPrerequisites(
      character.spells.known_spells || [],
      character
    );

    const filteredCantrips = this.filterSpellsByPrerequisites(
      character.spells.cantrips || [],
      character
    );

    return {
      ...character,
      spells: {
        ...character.spells,
        known_spells: filteredKnownSpells,
        cantrips: filteredCantrips
      }
    };
  }
}
