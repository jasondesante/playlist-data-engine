/**
 * DiceRoller - Utility for D&D-style dice rolling
 * Supports standard polyhedral dice and dice formulas
 */

/**
 * Roll a single die
 * @param sides Number of sides on the die (4, 6, 8, 10, 12, 20, 100)
 * @returns Roll result (1 to sides)
 */
export function rollDie(sides: number): number {
  if (sides < 1) throw new Error('Die must have at least 1 side');
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and sum results
 * @param count Number of dice to roll
 * @param sides Sides per die
 * @returns Array of individual rolls
 */
export function rollMultipleDice(count: number, sides: number): number[] {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(sides));
  }
  return rolls;
}

/**
 * Parse and roll a dice formula like "2d6+3"
 * @param formula Dice formula (e.g., "1d20", "2d6+3", "3d8-1")
 * @returns Object with parsed formula and results
 */
export function parseDiceFormula(formula: string): {
  diceCount: number;
  diceSides: number;
  modifier: number;
  rolls: number[];
  total: number;
} {
  // Parse formula like "2d6+3" or "1d20-2"
  const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!match) {
    throw new Error(`Invalid dice formula: ${formula}`);
  }

  const diceCount = parseInt(match[1], 10);
  const diceSides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  const rolls = rollMultipleDice(diceCount, diceSides);
  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return {
    diceCount,
    diceSides,
    modifier,
    rolls,
    total
  };
}

/**
 * Roll a d20 (common for attacks and ability checks)
 * @returns Roll result (1-20)
 */
export function rollD20(): number {
  return rollDie(20);
}

/**
 * Roll with advantage (roll twice, take higher)
 * @returns Object with both rolls and final result
 */
export function rollWithAdvantage(): {
  roll1: number;
  roll2: number;
  result: number;
} {
  const roll1 = rollD20();
  const roll2 = rollD20();
  return {
    roll1,
    roll2,
    result: Math.max(roll1, roll2)
  };
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * @returns Object with both rolls and final result
 */
export function rollWithDisadvantage(): {
  roll1: number;
  roll2: number;
  result: number;
} {
  const roll1 = rollD20();
  const roll2 = rollD20();
  return {
    roll1,
    roll2,
    result: Math.min(roll1, roll2)
  };
}

/**
 * Roll initiative (d20 + DEX modifier)
 * @param dexModifier Character's dexterity modifier
 * @returns Initiative value
 */
export function rollInitiative(dexModifier: number): number {
  return rollD20() + dexModifier;
}

/**
 * Check if a roll is a critical hit (natural 20)
 */
export function isCriticalHit(d20Roll: number): boolean {
  return d20Roll === 20;
}

/**
 * Check if a roll is a critical miss (natural 1)
 */
export function isCriticalMiss(d20Roll: number): boolean {
  return d20Roll === 1;
}

/**
 * Double the damage from a critical hit
 */
export function doubleDamage(rolls: number[]): number[] {
  return [...rolls, ...rolls];
}

/**
 * Calculate total damage from a damage formula with modifier
 * @param formula Dice formula (e.g., "1d8")
 * @param modifier Ability modifier to add
 * @param isCritical Whether this is a critical hit
 * @returns Total damage
 */
export function calculateDamage(formula: string, modifier: number, isCritical: boolean = false): {
  rolls: number[];
  modifier: number;
  total: number;
  isCritical: boolean;
} {
  const parsed = parseDiceFormula(formula);
  let rolls = parsed.rolls;

  // For critical hits, double the dice (not the modifier)
  if (isCritical) {
    rolls = doubleDamage(rolls);
  }

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

  return {
    rolls,
    modifier,
    total,
    isCritical
  };
}

/**
 * Roll a saving throw (d20 + ability modifier)
 * @param abilityModifier Modifier from the ability being saved
 * @param proficiencyBonus Optional proficiency bonus if character is proficient
 * @returns Save result
 */
export function rollSavingThrow(abilityModifier: number, proficiencyBonus: number = 0): number {
  return rollD20() + abilityModifier + proficiencyBonus;
}

/**
 * Roll an ability check (d20 + ability modifier + proficiency if applicable)
 * @param abilityModifier The ability modifier
 * @param proficiencyBonus Proficiency bonus if character is proficient (default 0)
 * @returns Check result
 */
export function rollAbilityCheck(abilityModifier: number, proficiencyBonus: number = 0): number {
  return rollD20() + abilityModifier + proficiencyBonus;
}

/**
 * Generate a deterministic "seeded" roll for reproducibility
 * @param seed Seed value for RNG
 * @returns Roll result (1-20)
 */
export function seededRoll(seed: number): number {
  // Simple seeded RNG using LCG (Linear Congruential Generator)
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * 20) + 1;
}

/**
 * Roll percentiles (d100)
 * @returns Roll result (1-100)
 */
export function rollPercentile(): number {
  return rollDie(100);
}
