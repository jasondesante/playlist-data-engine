/**
 * SeededDiceRoller - Deterministic D&D-style dice rolling for reproducible combat simulations
 *
 * Implements the same API as DiceRoller but uses SeededRNG internally,
 * producing deterministic results given the same seed and call sequence.
 *
 * Instance-based (not static) so each simulation run gets its own roller
 * with its own RNG state.
 */

import { SeededRNG } from '../../utils/random.js';

/**
 * Factory: create a SeededDiceRoller from a seed string.
 * Each call produces a fresh roller with its own RNG state —
 * this is what CombatSimulator will call per simulation run.
 */
export function createSeededRoller(seed: string): SeededDiceRoller {
  return new SeededDiceRoller(seed);
}

export class SeededDiceRoller {
  private rng: SeededRNG;

  constructor(seedOrRng: string | SeededRNG) {
    this.rng = typeof seedOrRng === 'string' ? new SeededRNG(seedOrRng) : seedOrRng;
  }

  /**
   * Roll a single die
   * @param sides Number of sides on the die (4, 6, 8, 10, 12, 20, 100)
   * @returns Roll result (1 to sides)
   */
  rollDie(sides: number): number {
    if (sides < 1) throw new Error('Die must have at least 1 side');
    return this.rng.randomInt(1, sides + 1);
  }

  /**
   * Roll multiple dice and sum results
   * @param count Number of dice to roll
   * @param sides Sides per die
   * @returns Array of individual rolls
   */
  rollMultipleDice(count: number, sides: number): number[] {
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(this.rollDie(sides));
    }
    return rolls;
  }

  /**
   * Parse and roll a dice formula like "2d6+3"
   * @param formula Dice formula (e.g., "1d20", "2d6+3", "3d8-1")
   * @returns Object with parsed formula and results
   */
  parseDiceFormula(formula: string): {
    diceCount: number;
    diceSides: number;
    modifier: number;
    rolls: number[];
    total: number;
  } {
    const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
      throw new Error(`Invalid dice formula: ${formula}`);
    }

    const diceCount = parseInt(match[1], 10);
    const diceSides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    const rolls = this.rollMultipleDice(diceCount, diceSides);
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    return { diceCount, diceSides, modifier, rolls, total };
  }

  /**
   * Roll a d20 (common for attacks and ability checks)
   * @returns Roll result (1-20)
   */
  rollD20(): number {
    return this.rollDie(20);
  }

  /**
   * Roll with advantage (roll twice, take higher)
   * @returns Object with both rolls and final result
   */
  rollWithAdvantage(): {
    roll1: number;
    roll2: number;
    result: number;
  } {
    const roll1 = this.rollD20();
    const roll2 = this.rollD20();
    return { roll1, roll2, result: Math.max(roll1, roll2) };
  }

  /**
   * Roll with disadvantage (roll twice, take lower)
   * @returns Object with both rolls and final result
   */
  rollWithDisadvantage(): {
    roll1: number;
    roll2: number;
    result: number;
  } {
    const roll1 = this.rollD20();
    const roll2 = this.rollD20();
    return { roll1, roll2, result: Math.min(roll1, roll2) };
  }

  /**
   * Roll initiative (d20 + DEX modifier)
   * @param dexModifier Character's dexterity modifier
   * @returns Initiative value
   */
  rollInitiative(dexModifier: number): number {
    return this.rollD20() + dexModifier;
  }

  /**
   * Check if a roll is a critical hit (natural 20)
   */
  isCriticalHit(d20Roll: number): boolean {
    return d20Roll === 20;
  }

  /**
   * Check if a roll is a critical miss (natural 1)
   */
  isCriticalMiss(d20Roll: number): boolean {
    return d20Roll === 1;
  }

  /**
   * Double the damage from a critical hit
   */
  doubleDamage(rolls: number[]): number[] {
    return [...rolls, ...rolls];
  }

  /**
   * Calculate total damage from a damage formula with modifier
   * @param formula Dice formula (e.g., "1d8")
   * @param modifier Ability modifier to add
   * @param isCritical Whether this is a critical hit
   * @returns Total damage
   */
  calculateDamage(formula: string, modifier: number, isCritical: boolean = false): {
    diceFormula: string;
    rolls: number[];
    modifier: number;
    total: number;
    isCritical: boolean;
  } {
    const parsed = this.parseDiceFormula(formula);
    let rolls = parsed.rolls;

    if (isCritical) {
      rolls = this.doubleDamage(rolls);
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    return { diceFormula: formula, rolls, modifier, total, isCritical };
  }

  /**
   * Roll a saving throw (d20 + ability modifier + proficiency bonus)
   * @param abilityModifier Modifier from the ability being saved
   * @param proficiencyBonus Optional proficiency bonus if character is proficient
   * @returns Save result
   */
  rollSavingThrow(abilityModifier: number, proficiencyBonus: number = 0): number {
    return this.rollD20() + abilityModifier + proficiencyBonus;
  }

  /**
   * Roll an ability check (d20 + ability modifier + proficiency if applicable)
   * @param abilityModifier The ability modifier
   * @param proficiencyBonus Proficiency bonus if character is proficient (default 0)
   * @returns Check result
   */
  rollAbilityCheck(abilityModifier: number, proficiencyBonus: number = 0): number {
    return this.rollD20() + abilityModifier + proficiencyBonus;
  }

  /**
   * Roll percentiles (d100)
   * @returns Roll result (1-100)
   */
  rollPercentile(): number {
    return this.rollDie(100);
  }
}
