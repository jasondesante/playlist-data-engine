/**
 * Combat System Types
 * D&D 5e-inspired turn-based combat mechanics
 */

import type { CharacterSheet, Attack, Spell } from './Character';
import type { EnvironmentalContext } from './Progression';
import type { Equipment } from '../../utils/constants.ts';
import type { LegendaryAction } from './Enemy';
import type { CombatantMetrics } from './CombatAI';

/**
 * DiceRollerAPI - Common interface for dice rolling implementations.
 * Both the static DiceRoller (via adapter) and instance-based SeededDiceRoller
 * satisfy this interface, allowing CombatEngine to work in both live (random)
 * and simulation (seeded) modes.
 */
export interface DiceRollerAPI {
  rollDie(sides: number): number;
  rollD20(): number;
  rollWithAdvantage(): { roll1: number; roll2: number; result: number };
  rollWithDisadvantage(): { roll1: number; roll2: number; result: number };
  calculateDamage(formula: string, modifier: number, isCritical?: boolean): DamageRoll;
  rollSavingThrow(abilityModifier: number, proficiencyBonus?: number): number;
  rollAbilityCheck(abilityModifier: number, proficiencyBonus?: number): number;
  isCriticalHit(d20Roll: number): boolean;
  isCriticalMiss(d20Roll: number): boolean;
  parseDiceFormula(formula: string): {
    diceCount: number;
    diceSides: number;
    modifier: number;
    rolls: number[];
    total: number;
  };
}

/**
 * StatusEffectMechanics - Mechanical impact of a status effect on combat
 *
 * Used by CombatEngine to enforce combat rules for conditions like
 * Charmed (disadvantage on attacks vs non-source), Frightened (disadvantage
 * on attacks/checks while source visible), Stunned (skip turn), etc.
 */
export interface StatusEffectMechanics {
  /** Combatant has disadvantage on attack rolls against targets other than source */
  disadvantageOnAttackNonSource?: boolean;
  /** Combatant has disadvantage on attack rolls (unconditional) */
  disadvantageOnAttack?: boolean;
  /** Combatant has disadvantage on ability checks */
  disadvantageOnAbilityChecks?: boolean;
  /** Melee attacks against this combatant have advantage */
  advantageOnMeleeAttackAgainst?: boolean;
  /** Ranged attacks against this combatant have advantage */
  advantageOnRangedAttackAgainst?: boolean;
  /** Combatant has disadvantage on DEX saving throws */
  disadvantageOnDexSaves?: boolean;
  /** Combatant's speed is set to 0 */
  speedZero?: boolean;
  /** Combatant skips their turn entirely */
  skipTurn?: boolean;
  /** Combatant is immune to a specific damage type while this effect is active */
  damageImmunity?: DamageType;
  /** Combatant has resistance to a specific damage type while this effect is active */
  damageResistance?: DamageType;
  /** Combatant has vulnerability to a specific damage type while this effect is active */
  damageVulnerability?: DamageType;
}

/**
 * StatusEffect - Temporary condition affecting a combatant
 */
export interface StatusEffect {
  name: string;           // e.g., "Charmed", "Frightened", "Prone"
  description: string;
  duration: number;       // Rounds remaining
  source?: string;        // Which combatant applied this
  hasConcentration?: boolean;  // Some effects require concentration

  /** Optional icon URL for small UI display */
  icon?: string;

  /** Optional image URL for larger display */
  image?: string;

  /** Damage dealt at the start of each of the affected combatant's turns (e.g., Burning) */
  damage?: number;

  /** Damage type for the effect's damage (e.g., 'fire' for Burning) */
  damageType?: DamageType;

  /** Mechanical effects that CombatEngine enforces during combat */
  mechanicalEffects?: StatusEffectMechanics;
}

/**
 * Combatant - A character participating in combat
 */
export interface Combatant {
  id: string;             // Unique ID within combat instance
  character: CharacterSheet;
  initiative: number;     // Initiative roll result
  currentHP: number;      // Current hit points
  temporaryHP?: number;   // Temporary hit points (damage is taken from these first)
  statusEffects: StatusEffect[];
  position?: {
    x: number;
    y: number;
  };                      // Optional tactical position
  isDefeated: boolean;    // Whether combatant is unconscious/defeated
  actionUsed: boolean;    // Has action been used this turn
  bonusActionUsed: boolean;
  reactionUsed: boolean;
  spellSlots?: {          // Remaining spell slots by level (if applicable)
    [level: number]: number;
  };
  /** Name of the status effect this combatant is concentrating on, if any */
  concentratingOn?: string;
  /** Legendary action points remaining this round (3 per round for bosses, 0 for non-bosses) */
  legendaryActionsRemaining?: number;
  /** Legendary resistances remaining (per-day resource for bosses) */
  legendaryResistancesRemaining?: number;
}

/**
 * CombatAction - An action taken during combat
 */
export interface CombatAction {
  type: 'attack' | 'spell' | 'dodge' | 'dash' | 'disengage' | 'help' | 'hide' | 'ready' | 'flee' | 'useItem' | 'legendaryAction' | 'statusEffectTick';
  actor: Combatant;
  target?: Combatant;
  targets?: Combatant[];
  attack?: Attack;
  spell?: Spell;
  item?: Equipment;
  legendaryAction?: LegendaryAction;
  result?: CombatActionResult;
}

/**
 * CombatActionResult - Outcome of a combat action
 */
export interface CombatActionResult {
  success: boolean;
  roll?: number;          // d20 roll result
  isCritical?: boolean;
  damage?: number;
  damageType?: string;
  targetHP?: number;
  description: string;
}

/**
 * HitMode - Determines how attack rolls resolve hits and misses
 *
 * - 'dnd': Classic D&D 5e — d20 + bonus vs target AC. Below AC = miss.
 * - 'scaled': AC reduces damage instead of determining hit/miss.
 *   Only natural 1 misses. Natural 20 is always a critical hit.
 *   For each point the total roll falls below AC, damage is reduced by 5%,
 *   down to a minimum of 1 damage.
 */
export type HitMode = 'dnd' | 'scaled';

/**
 * AttackRoll - Result of an attack roll
 */
export interface AttackRoll {
  d20Roll: number;        // The d20 roll (1-20)
  attackBonus: number;    // Modifier added (ability mod + proficiency)
  totalRoll: number;      // d20 + attackBonus
  targetAC: number;       // Defense of target
  hit: boolean;           // Whether attack hit
  isCritical: boolean;    // Natural 20
  isMiss: boolean;        // Natural 1
  damageScale?: number;   // Damage multiplier (1.0 = full, used in 'scaled' mode)
}

/**
 * DamageRoll - Result of a damage roll
 */
export interface DamageRoll {
  diceFormula: string;    // e.g., "2d6", "1d8+3"
  rolls: number[];        // Individual die rolls
  modifier?: number;      // Ability modifier added
  total: number;          // Sum of rolls + modifier
  isCritical: boolean;    // If critical hit, dice are doubled
}

/**
 * SpellCastResult - Outcome of casting a spell
 */
export interface SpellCastResult {
  success: boolean;
  spellName: string;
  caster: Combatant;
  targets: Combatant[];
  saveDC?: number;        // Difficulty class for saving throw
  damage?: DamageRoll;
  effectsApplied: StatusEffect[];
  spellSlotUsed: number;  // Spell level
  description: string;
}

/**
 * CombatInstance - Represents an active combat encounter
 */
export interface CombatInstance {
  id: string;
  combatants: Combatant[];
  currentTurnIndex: number;  // Index into combatants array
  roundNumber: number;
  environment?: EnvironmentalContext;
  history: CombatAction[];   // Log of all actions taken
  isActive: boolean;
  winner?: Combatant;        // Set when combat ends (first surviving combatant on winning side)
  winnerSide?: 'player' | 'enemy' | 'draw';  // Set when combat ends
  startTime: number;
  lastUpdated: number;
  /** Per-combatant metrics computed from combat history (populated by CombatMetricsTracker) */
  metrics?: Map<string, CombatantMetrics>;
}

/**
 * CombatResult - Final outcome of a combat encounter
 */
export interface CombatResult {
  winner?: Combatant;
  winnerSide: 'player' | 'enemy' | 'draw';
  defeated: Combatant[];
  roundsElapsed: number;
  totalTurns: number;
  xpAwarded: number;
  treasureAwarded?: {
    gold: number;
    items: Equipment[];
  };
  description: string;
}

/**
 * D&D Damage Type Classification
 */
export type DamageType =
  | 'slashing' | 'piercing' | 'bludgeoning'  // Physical
  | 'fire' | 'cold' | 'lightning' | 'thunder' | 'poison' | 'acid'  // Elemental
  | 'necrotic' | 'radiant' | 'psychic' | 'force';  // Magical

/**
 * D&D Ability Saving Throw
 */
export type SavingThrowAbility = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

/**
 * Treasure Configuration Options
 * - Fixed amount: `{ gold: 500 }` - always rewards exactly 500 gold
 * - Range: `{ gold: { min: 100, max: 200 } }` - random amount between 100-200 (uses seed if provided)
 * - Items: Optional array of items to award (supports any Equipment type including boxes)
 */
export interface TreasureConfig {
  gold?: number | { min: number; max: number };
  items?: Equipment[];
}

/**
 * Combat Configuration Options
 */
export interface CombatConfig {
  useEnvironment?: boolean;     // Apply environmental context to combat (weather, altitude, etc.)
  useMusic?: boolean;           // Apply music-based buffs to character stats
  tacticalMode?: boolean;       // Enable position-based distance mechanics
  maxTurnsBeforeDraw?: number;  // Turn limit before combat is a draw (default: 100)
  allowFleeing?: boolean;       // Can combatants attempt to flee
  seed?: string;                // Seed for deterministic RNG (treasure generation, etc.)
  treasure?: TreasureConfig;    // Custom treasure rewards (overrides default 0-99 gold)
  hitMode?: HitMode;            // How attack rolls resolve: 'scaled' (default) or 'dnd'
}
