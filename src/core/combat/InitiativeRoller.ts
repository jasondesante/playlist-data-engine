/**
 * InitiativeRoller - Handles initiative rolling and turn order sorting
 * D&D 5e: Initiative = d20 + DEX modifier
 */

import type { Combatant, DiceRollerAPI } from '../types/Combat';
import { DiceRoller } from './DiceRoller.js';

/**
 * Result of initiative rolling
 */
export interface InitiativeResult {
  combatant: Combatant;
  d20Roll: number;
  dexModifier: number;
  initiativeTotal: number;
}

/**
 * InitiativeRoller - Manages initiative system for D&D combat
 */
export class InitiativeRoller {
  private diceRoller?: DiceRollerAPI;

  constructor(diceRoller?: DiceRollerAPI) {
    this.diceRoller = diceRoller;
  }

  /**
   * Roll initiative for a single combatant
   * Initiative = d20 + DEX modifier
   */
  rollInitiativeForCombatant(combatant: Combatant): InitiativeResult {
    const dexModifier = combatant.character.ability_modifiers.dexterity ?? 0;
    const d20Roll = this.diceRoller
      ? this.diceRoller.rollD20()
      : DiceRoller.rollD20();
    const initiativeTotal = d20Roll + dexModifier;

    // Update combatant's initiative
    combatant.initiative = initiativeTotal;

    return {
      combatant,
      d20Roll,
      dexModifier,
      initiativeTotal
    };
  }

  /**
   * Roll initiative for all combatants and sort by descending initiative
   * Higher initiative acts first
   */
  rollInitiativeForAll(combatants: Combatant[]): {
    results: InitiativeResult[];
    sortedCombatants: Combatant[];
  } {
    const results: InitiativeResult[] = [];

    // Roll for each combatant
    for (const combatant of combatants) {
      const result = this.rollInitiativeForCombatant(combatant);
      results.push(result);
    }

    // Sort by initiative (descending), then by DEX if tied
    const sortedCombatants = [...combatants].sort((a, b) => {
      if (a.initiative !== b.initiative) {
        return b.initiative - a.initiative;
      }
      // Tiebreaker: higher DEX modifier
      const aDexMod = a.character.ability_modifiers.dexterity ?? 0;
      const bDexMod = b.character.ability_modifiers.dexterity ?? 0;
      return bDexMod - aDexMod;
    });

    return {
      results,
      sortedCombatants
    };
  }

  /**
   * Get the next combatant in turn order
   * Wraps around to beginning when reaching end of list
   */
  getNextCombatant(combatants: Combatant[], currentIndex: number): {
    combatant: Combatant;
    index: number;
    isNewRound: boolean;
  } {
    const nextIndex = (currentIndex + 1) % combatants.length;
    const isNewRound = nextIndex === 0;

    return {
      combatant: combatants[nextIndex],
      index: nextIndex,
      isNewRound
    };
  }

  /**
   * Get initiative order as a formatted string for display
   */
  getInitiativeOrder(combatants: Combatant[]): string[] {
    return combatants.map((c, index) => {
      const dexMod = c.character.ability_modifiers.dexterity ?? 0;
      return `${index + 1}. ${c.character.name} (Initiative: ${c.initiative}, DEX: ${dexMod})`;
    });
  }

  /**
   * Re-roll initiative for a specific combatant (e.g., if an effect changes DEX)
   */
  rerollInitiativeForCombatant(combatant: Combatant): number {
    const dexModifier = combatant.character.ability_modifiers.dexterity ?? 0;
    const d20Roll = this.diceRoller
      ? this.diceRoller.rollD20()
      : DiceRoller.rollD20();
    combatant.initiative = d20Roll + dexModifier;
    return combatant.initiative;
  }

  /**
   * Delay a combatant's turn (move them later in initiative order)
   * Used when a combatant takes the "Ready" action
   */
  delayTurn(combatants: Combatant[], combatantId: string): Combatant[] {
    const combatantIndex = combatants.findIndex(c => c.id === combatantId);
    if (combatantIndex === -1) {
      return combatants;
    }

    // Move combatant to next position
    const sorted = [...combatants];
    const [combatant] = sorted.splice(combatantIndex, 1);
    sorted.splice(combatantIndex + 1, 0, combatant);

    return sorted;
  }

  /**
   * Shuffle combatants back into position by exact initiative value
   * Used if new combatants join mid-combat
   */
  resortByInitiative(combatants: Combatant[]): Combatant[] {
    return [...combatants].sort((a, b) => {
      if (a.initiative !== b.initiative) {
        return b.initiative - a.initiative;
      }
      // Tiebreaker: higher DEX modifier
      const aDexMod = a.character.ability_modifiers.dexterity ?? 0;
      const bDexMod = b.character.ability_modifiers.dexterity ?? 0;
      return bDexMod - aDexMod;
    });
  }
}
