/**
 * CombatEngine - Main orchestrator for D&D 5e turn-based combat
 * Manages combat lifecycle, turn order, and action resolution
 */

import type { CharacterSheet, Attack, Spell } from '../types/Character';
import type {
  CombatInstance,
  Combatant,
  CombatAction,
  CombatConfig,
  CombatResult,
  DiceRollerAPI,
  StatusEffect
} from '../types/Combat';
import type { EnvironmentalContext } from '../types/Progression';
import type { Equipment } from '../../utils/constants.js';
import { InitiativeRoller } from './InitiativeRoller';
import { AttackResolver } from './AttackResolver';
import { SpellCaster } from './SpellCaster';
import { DiceRoller } from './DiceRoller';
import { DEFAULT_EQUIPMENT } from '../../constants/DefaultEquipment.js';
import { SeededRNG } from '../../utils/random.js';
import { getFullCasterSlotsForLevel } from '../../constants/SpellSlots.js';

/**
 * Describes a single validation issue found in spell slot data.
 */
export interface SpellSlotValidationIssue {
  /** Human-readable description of the issue */
  message: string;
  /** Which spell level is affected (1-9), or undefined if structural */
  level?: number;
  /** Severity: 'error' means data is unusable, 'warn' means data is questionable but usable */
  severity: 'error' | 'warn';
}

/**
 * D&D 5e turn-based combat engine
 *
 * Fully implements D&D 5e combat rules:
 * - Initiative rolls (d20 + DEX modifier)
 * - Attack rolls (d20 + attack bonus vs AC)
 * - Damage calculation with dice rolling
 * - Critical hits (natural 20 = double damage dice)
 * - Spell casting with spell slots and saving throws
 * - Environmental modifiers and music bonuses
 * - Deterministic treasure generation using seeded RNG
 */
export class CombatEngine {
  private initiativeRoller: InitiativeRoller;
  private attackResolver: AttackResolver;
  private spellCaster: SpellCaster;
  private config: CombatConfig;
  private rng: SeededRNG;
  private diceRoller?: DiceRollerAPI;

  /**
   * Initialize the combat engine with configuration options
   *
   * @param {CombatConfig} [config] - Combat configuration
   * @param {boolean} [config.useEnvironment=true] - Apply environmental bonuses
   * @param {boolean} [config.useMusic=false] - Apply music bonuses to combat
   * @param {boolean} [config.tacticalMode=false] - Enable advanced tactical rules
   * @param {number} [config.maxTurnsBeforeDraw=100] - Max turns before combat draws
   * @param {boolean} [config.allowFleeing=false] - Allow combatants to flee
   * @param {string} [config.seed] - Seed for deterministic treasure generation
   * @param {DiceRollerAPI} [diceRoller] - Optional dice roller for deterministic simulations
   *
   * @example
   * const combat = new CombatEngine({ tacticalMode: true, seed: 'my-seed' });
   * const seeded = new CombatEngine({}, createSeededRoller('sim-42'));
   */
  constructor(config: CombatConfig = {}, diceRoller?: DiceRollerAPI) {
    this.diceRoller = diceRoller;
    this.initiativeRoller = new InitiativeRoller(diceRoller);
    this.attackResolver = new AttackResolver(diceRoller);
    this.spellCaster = new SpellCaster(diceRoller);
    this.config = {
      useEnvironment: true,
      useMusic: false,
      tacticalMode: false,
      maxTurnsBeforeDraw: 100,
      allowFleeing: false,
      seed: config.seed || `combat_${Date.now()}`,
      ...config
    };
    // Initialize seeded RNG for deterministic treasure generation
    this.rng = new SeededRNG(this.config.seed!);
  }

  /**
   * Initialize a combat encounter with players vs enemies
   *
   * Sets up the combat instance, creates combatant objects, rolls initiative,
   * and establishes turn order based on DEX modifiers and initiative rolls.
   *
   * @param {CharacterSheet[]} playerCharacters - Playable characters
   * @param {CharacterSheet[]} enemies - Non-player characters/enemies
   * @param {EnvironmentalContext} [environment] - Environmental modifiers (optional)
   * @returns {CombatInstance} Active combat instance with established turn order
   *
   * @example
   * const combat = combatEngine.startCombat(
   *   [playerCharacter],
   *   [enemy1, enemy2],
   *   environmentalContext
   * );
   * console.log(`Combat started! Turn order: ${combat.combatants.map(c => c.character.name).join(' → ')}`);
   */
  startCombat(
    playerCharacters: CharacterSheet[],
    enemies: CharacterSheet[],
    environment?: EnvironmentalContext
  ): CombatInstance {
    const combatants: Combatant[] = [];
    let combatantId = 0;

    // Create combatants from player characters
    for (const character of playerCharacters) {
      combatants.push(this.createCombatant(character, `player_${combatantId++}`));
    }

    // Create combatants from enemies
    for (const character of enemies) {
      combatants.push(this.createCombatant(character, `enemy_${combatantId++}`));
    }

    // Roll initiative
    const initiativeResult = this.initiativeRoller.rollInitiativeForAll(combatants);

    // Create combat instance
    const combat: CombatInstance = {
      id: `combat_${Date.now()}`,
      combatants: initiativeResult.sortedCombatants,
      currentTurnIndex: 0,
      roundNumber: 1,
      environment,
      history: [],
      isActive: true,
      startTime: Date.now(),
      lastUpdated: Date.now()
    };

    return combat;
  }

  /**
   * Get the current active combatant
   */
  getCurrentCombatant(combat: CombatInstance): Combatant {
    return combat.combatants[combat.currentTurnIndex];
  }

  /**
   * Execute an attack action
   *
   * Checks attacker and target status effects for advantage/disadvantage
   * (e.g., Charmed → disadvantage vs non-source, Frightened → disadvantage,
   * Prone target → advantage on melee/ranged).
   */
  executeAttack(
    combat: CombatInstance,
    attacker: Combatant,
    target: Combatant,
    attack: Attack
  ): CombatAction {
    const advDisadv = this.getAttackAdvantageDisadvantage(attacker, target, attack);

    let result;
    if (advDisadv === 'advantage') {
      result = this.attackResolver.attackWithAdvantage(attacker, target, attack);
    } else if (advDisadv === 'disadvantage') {
      result = this.attackResolver.attackWithDisadvantage(attacker, target, attack);
    } else {
      result = this.attackResolver.resolveAttack(attacker, target, attack);
    }

    const action: CombatAction = {
      type: 'attack',
      actor: attacker,
      target,
      attack,
      result: {
        success: result.attackRoll.hit,
        roll: result.attackRoll.d20Roll,
        isCritical: result.attackRoll.isCritical,
        damage: result.damageRoll?.total,
        damageType: attack.damage_type,
        targetHP: result.hpAfterDamage,
        description: result.description
      }
    };

    // Add to history
    combat.history.push(action);

    // Check if target is defeated
    if (target.currentHP <= 0) {
      target.isDefeated = true;
      // Defeated combatants automatically lose concentration
      if (target.concentratingOn) {
        target.concentratingOn = undefined;
      }
    } else if (result.attackRoll.hit && result.damageRoll?.total && target.concentratingOn) {
      // Check concentration for hit targets that took damage
      this.checkConcentration(combat, target, result.damageRoll.total);
    }

    return action;
  }

  /**
   * Execute an attack using equipped weapon(s) or unarmed strike
   *
   * Automatically builds Attack object from equipped weapons or unarmed combat.
   * Uses the first equipped weapon by default, or a specific weapon if named.
   * If no weapon equipped or weaponName is "unarmed", uses unarmed strike.
   *
   * @param combat - Combat instance
   * @param attacker - Attacking combatant
   * @param target - Target combatant
   * @param weaponName - Optional specific weapon name (if multiple equipped), or "unarmed" for unarmed strike
   * @returns Combat action with result
   *
   * @example
   * // Attack with first equipped weapon (or unarmed if none)
   * combat.executeWeaponAttack(combat, attacker, target);
   *
   * // Attack with specific weapon
   * combat.executeWeaponAttack(combat, attacker, target, 'Longsword');
   *
   * // Unarmed strike explicitly
   * combat.executeWeaponAttack(combat, attacker, target, 'unarmed');
   */
  executeWeaponAttack(
    combat: CombatInstance,
    attacker: Combatant,
    target: Combatant,
    weaponName?: string
  ): CombatAction {
    const equippedWeapons = attacker.character.equipment?.weapons.filter(w => w.equipped) || [];

    // Explicit unarmed request or no weapons equipped
    if (weaponName === 'unarmed' || equippedWeapons.length === 0) {
      const attack = this.buildUnarmedAttack(attacker.character);
      return this.executeAttack(combat, attacker, target, attack);
    }

    // Find the specific weapon or use the first equipped one
    const selectedWeapon = weaponName
      ? equippedWeapons.find(w => w.name === weaponName)
      : equippedWeapons[0];

    if (!selectedWeapon) {
      throw new Error(`Weapon "${weaponName}" is not equipped`);
    }

    // Build Attack object from weapon data
    const attack = this.buildAttackFromWeapon(selectedWeapon.name, attacker.character);

    return this.executeAttack(combat, attacker, target, attack);
  }

  /**
   * Build an Attack object from a weapon name
   * Looks up weapon data from DEFAULT_EQUIPMENT and constructs proper Attack
   * Uses character's stats to calculate attack bonus
   */
  private buildAttackFromWeapon(weaponName: string, character: CharacterSheet): Attack {
    const weaponData = DEFAULT_EQUIPMENT[weaponName];

    if (!weaponData) {
      throw new Error(`Weapon "${weaponName}" not found in equipment database`);
    }

    // Check if it's a ranged weapon
    const isRanged = weaponData.weaponProperties?.includes('ranged') || false;
    const isFinesse = weaponData.weaponProperties?.includes('finesse') || false;

    // Calculate ability modifier based on weapon type
    // Melee/unarmed: STR, Ranged/finesse: DEX
    const ability = isRanged || isFinesse ? 'DEX' : 'STR';
    const abilityMod = Math.floor((character.ability_scores[ability] - 10) / 2);

    // Check proficiency (proficient if weapon is simple or character is proficient with weapon type)
    // Simplified: assume proficiency with simple weapons for now
    const profBonus = character.proficiency_bonus;

    return {
      name: weaponName,
      damage_dice: weaponData.damage?.dice || '1d6',
      damage_type: weaponData.damage?.damageType || 'bludgeoning',
      type: isRanged ? 'ranged' : 'melee',
      attack_bonus: abilityMod + profBonus,
      properties: weaponData.weaponProperties || []
    };
  }

  /**
   * Build an unarmed strike Attack object
   * D&D 5e: 1 + STR modifier damage, proficiency bonus applies to attack
   */
  private buildUnarmedAttack(character: CharacterSheet): Attack {
    const strMod = Math.floor((character.ability_scores.STR - 10) / 2);
    const profBonus = character.proficiency_bonus;

    return {
      name: 'Unarmed Strike',
      damage_dice: '1',
      damage_type: 'bludgeoning',
      type: 'melee',
      attack_bonus: strMod + profBonus,
      properties: []
    };
  }

  /**
   * Execute a spell casting action
   */
  executeCastSpell(
    combat: CombatInstance,
    caster: Combatant,
    spell: Spell,
    targets: Combatant[]
  ): CombatAction {
    const result = this.spellCaster.castSpell(caster, spell, targets);

    const action: CombatAction = {
      type: 'spell',
      actor: caster,
      targets,
      spell,
      result: {
        success: result.success,
        damage: result.damage?.total,
        damageType: spell.damage_type,
        description: result.description
      }
    };

    // Add to history
    combat.history.push(action);

    // Apply status effects from the spell via applyStatusEffect(), which handles
    // stacking rules, concentration tracking, and one-concentration-per-target.
    if (result.success) {
      for (const target of targets) {
        for (const effect of result.effectsApplied) {
          this.applyStatusEffect(target, effect);
        }
      }
    }

    // Check for defeated targets and concentration
    for (const target of targets) {
      if (target.currentHP <= 0) {
        target.isDefeated = true;
        // Defeated combatants automatically lose concentration
        if (target.concentratingOn) {
          target.concentratingOn = undefined;
        }
      } else if (result.success && result.damage?.total && target.concentratingOn) {
        // Check concentration for targets that took spell damage
        this.checkConcentration(combat, target, result.damage.total);
      }
    }

    return action;
  }

  /**
   * Execute a legendary action for a boss combatant.
   *
   * Legendary actions are special abilities that boss enemies can use at the end
   * of another creature's turn, spending legendary action points (3 per round).
   *
   * Validates that the action exists on the boss's `legendary_config`, checks
   * that enough action points remain, resolves damage if applicable, and records
   * the action in combat history.
   *
   * @param combat - Combat instance
   * @param bossCombatant - The boss combatant executing the legendary action
   * @param action - The legendary action to execute (from `legendary_config.actions`)
   * @param target - Optional target combatant for damaging/controlling actions
   * @returns Combat action with result
   * @throws {Error} If the combatant has no legendary config, the action doesn't
   *                  belong to this boss, or not enough action points remain
   */
  executeLegendaryAction(
    combat: CombatInstance,
    bossCombatant: Combatant,
    action: { id: string; name: string; cost: number; effect: string; damage?: string; damage_type?: string },
    target?: Combatant
  ): CombatAction {
    const config = bossCombatant.character.legendary_config;
    if (!config) {
      throw new Error(`${bossCombatant.character.name} has no legendary actions (not a boss)`);
    }

    // Validate that the action belongs to this boss
    const knownAction = config.actions.find(a => a.id === action.id);
    if (!knownAction) {
      throw new Error(`Legendary action "${action.id}" not found on ${bossCombatant.character.name}`);
    }

    // Check action point budget
    const pointsNeeded = knownAction.cost;
    const pointsAvailable = bossCombatant.legendaryActionsRemaining ?? 0;

    if (pointsAvailable < pointsNeeded) {
      throw new Error(
        `${bossCombatant.character.name} needs ${pointsNeeded} legendary action points but only has ${pointsAvailable} remaining`
      );
    }

    // Spend the action points
    bossCombatant.legendaryActionsRemaining = pointsAvailable - pointsNeeded;

    // Resolve damage if the action has a damage formula
    let damageTotal: number | undefined;
    let targetHP: number | undefined;

    if (knownAction.damage && target) {
      // Strip spaces from dice formula (e.g., "2d8 + 5" → "2d8+5")
      const formula = knownAction.damage.replace(/\s/g, '');
      const roller = this.diceRoller;
      if (roller) {
        const parsed = roller.parseDiceFormula(formula);
        damageTotal = parsed.total;
      } else {
        damageTotal = DiceRoller.parseDiceFormula(formula).total;
      }

      const actualDamage = this.applyDamage(target, damageTotal);
      targetHP = target.currentHP;

      // Check if target is defeated
      if (target.currentHP <= 0) {
        target.isDefeated = true;
        if (target.concentratingOn) {
          target.concentratingOn = undefined;
        }
      } else if (target.concentratingOn && actualDamage > 0) {
        this.checkConcentration(combat, target, actualDamage);
      }
    }

    const description = target
      ? `${bossCombatant.character.name} uses ${knownAction.name} on ${target.character.name}${damageTotal ? ` for ${damageTotal} ${knownAction.damage_type ?? ''} damage` : ''} (${pointsNeeded} action point${pointsNeeded !== 1 ? 's' : ''} spent, ${bossCombatant.legendaryActionsRemaining} remaining)`
      : `${bossCombatant.character.name} uses ${knownAction.name} (${pointsNeeded} action point${pointsNeeded !== 1 ? 's' : ''} spent, ${bossCombatant.legendaryActionsRemaining} remaining)`;

    const combatAction: CombatAction = {
      type: 'legendaryAction',
      actor: bossCombatant,
      target,
      legendaryAction: {
        id: knownAction.id,
        name: knownAction.name,
        description: knownAction.effect,
        cost: knownAction.cost,
        effect: knownAction.effect,
        damage: knownAction.damage,
        damageType: knownAction.damage_type,
        archetypes: [],
      },
      result: {
        success: true,
        damage: damageTotal,
        damageType: knownAction.damage_type,
        targetHP,
        description,
      }
    };

    combat.history.push(combatAction);

    // Check for combat end if target was defeated
    if (target?.isDefeated) {
      this.checkCombatStatus(combat);
    }

    return combatAction;
  }

  /**
   * Execute a dodge action (increase AC by 2)
   */
  executeDodge(combat: CombatInstance, combatant: Combatant): CombatAction {
    const action: CombatAction = {
      type: 'dodge',
      actor: combatant,
      result: {
        success: true,
        description: `${combatant.character.name} takes the Dodge action (AC increased until next turn)`
      }
    };

    combat.history.push(action);
    return action;
  }

  /**
   * Execute a dash action (increase movement speed)
   */
  executeDash(combat: CombatInstance, combatant: Combatant): CombatAction {
    const action: CombatAction = {
      type: 'dash',
      actor: combatant,
      result: {
        success: true,
        description: `${combatant.character.name} takes the Dash action (double movement)`
      }
    };

    combat.history.push(action);
    return action;
  }

  /**
   * Execute a disengage action (avoid opportunity attacks)
   */
  executeDisengage(combat: CombatInstance, combatant: Combatant): CombatAction {
    const action: CombatAction = {
      type: 'disengage',
      actor: combatant,
      result: {
        success: true,
        description: `${combatant.character.name} takes the Disengage action (no opportunity attacks provoked)`
      }
    };

    combat.history.push(action);
    return action;
  }

  /**
   * Check if fleeing is allowed by configuration
   */
  canFlee(): boolean {
    return this.config.allowFleeing === true;
  }

  /**
   * Execute a flee action (combatant flees from combat)
   *
   * Removes the combatant from the active combat instance and records
   * the flee action in combat history. Only available when allowFleeing
   * configuration is enabled.
   *
   * @param combat - Combat instance
   * @param combatant - Combatant attempting to flee
   * @returns Combat action with result
   * @throws {Error} If fleeing is not allowed by configuration
   *
   * @example
   * const combat = combatEngine.startCombat([player], [enemy]);
   * const current = combatEngine.getCurrentCombatant(combat);
   *
   * if (combatEngine.canFlee()) {
   *   combatEngine.executeFlee(combat, current);
   *   // current is now removed from combat.combatants
   * }
   */
  executeFlee(combat: CombatInstance, combatant: Combatant): CombatAction {
    if (!this.canFlee()) {
      throw new Error('Fleeing is not allowed in this combat. Enable with allowFleeing: true in CombatConfig.');
    }

    const action: CombatAction = {
      type: 'flee',
      actor: combatant,
      result: {
        success: true,
        description: `${combatant.character.name} flees from combat!`
      }
    };

    // Add to history before removing combatant
    combat.history.push(action);

    // Remove combatant from the active combat instance
    const combatantIndex = combat.combatants.findIndex(c => c.id === combatant.id);
    if (combatantIndex !== -1) {
      combat.combatants.splice(combatantIndex, 1);

      // Adjust current turn index if needed
      if (combatantIndex < combat.currentTurnIndex) {
        combat.currentTurnIndex--;
      } else if (combatantIndex === combat.currentTurnIndex) {
        // If current combatant fled, move to next combatant
        combat.currentTurnIndex = Math.min(combat.currentTurnIndex, combat.combatants.length - 1);
      }
    }

    // Mark combatant as defeated (fled counts as leaving combat)
    combatant.isDefeated = true;

    // Update timestamp
    combat.lastUpdated = Date.now();

    // Check for combat end conditions (may end if all enemies or players fled)
    this.checkCombatStatus(combat);

    return action;
  }

  /**
   * Advance to the next turn
   * Resets action trackers and moves to next combatant.
   *
   * Handles skipTurn effects (Stunned, Unconscious): the combatant's
   * actions are marked as used and the turn auto-advances. Damage
   * effects (Burning, Poison) are processed before the skip.
   *
   * Uses a loop instead of recursion to avoid resetting stunned
   * combatants' action flags when advancing past them.
   */
  nextTurn(combat: CombatInstance): CombatInstance {
    // Reset action trackers for the combatant whose turn is ending
    // (done once before the loop, not per-iteration)
    const turnEnding = combat.combatants[combat.currentTurnIndex];
    turnEnding.actionUsed = false;
    turnEnding.bonusActionUsed = false;
    turnEnding.reactionUsed = false;

    // Advance to next valid combatant, skipping stunned/defeated ones
    const maxIterations = (this.config.maxTurnsBeforeDraw || 100) + combat.combatants.length;

    for (let i = 0; i < maxIterations; i++) {
      // Move to next combatant
      const nextIndex = (combat.currentTurnIndex + 1) % combat.combatants.length;
      const isNewRound = nextIndex === 0;

      if (isNewRound) {
        combat.roundNumber++;

        // Reset legendary action points for all boss combatants at the start of each round
        for (const c of combat.combatants) {
          if (c.character.legendary_config && !c.isDefeated) {
            c.legendaryActionsRemaining = 3;
          }
        }
      }

      combat.currentTurnIndex = nextIndex;
      combat.lastUpdated = Date.now();

      const nextCombatant = combat.combatants[nextIndex];

      // Skip defeated combatants
      if (nextCombatant.isDefeated) {
        continue;
      }

      // Process start-of-turn damage effects (Burning, Poison)
      this.processStartOfTurnDamage(combat, nextCombatant);

      // If damage killed the combatant, check combat status and move on
      if (nextCombatant.isDefeated) {
        this.checkCombatStatus(combat);
        if (!combat.isActive) return combat;
        continue;
      }

      // Check for skipTurn BEFORE decrementing durations
      // (so a duration-1 stun still causes the turn to be skipped)
      if (this.shouldSkipTurn(nextCombatant)) {
        nextCombatant.actionUsed = true;
        nextCombatant.bonusActionUsed = true;
        nextCombatant.reactionUsed = true;

        // Being incapacitated (Stunned, Unconscious) breaks concentration
        if (nextCombatant.concentratingOn) {
          const dropped = this.dropConcentration(nextCombatant, 'Incapacitated');
          if (dropped) {
            combat.history.push({
              type: 'statusEffectTick',
              actor: nextCombatant,
              result: {
                success: true,
                description: `${nextCombatant.character.name} lost concentration on ${dropped.name} (incapacitated)`,
              },
            });
          }
        }

        const skipEffects = nextCombatant.statusEffects
          .filter(e => e.mechanicalEffects?.skipTurn)
          .map(e => e.name);

        combat.history.push({
          type: 'statusEffectTick',
          actor: nextCombatant,
          result: {
            success: true,
            description: `${nextCombatant.character.name}'s turn is skipped (${skipEffects.join(', ')})`,
          },
        });

        // Decrement durations after skip (stun of duration 1: skip, then expire)
        this.tickStatusEffects(combat, nextCombatant);

        this.checkCombatStatus(combat);
        if (!combat.isActive) return combat;

        // Continue the loop to advance past this stunned combatant
        continue;
      }

      // Normal turn: tick status effects (decrement durations)
      this.tickStatusEffects(combat, nextCombatant);

      // Found a valid combatant — stop advancing
      break;
    }

    // Check for combat end conditions
    this.checkCombatStatus(combat);

    return combat;
  }

  /**
   * Process start-of-turn damage effects (Burning, Poison, etc.).
   *
   * Deals damage equal to each effect's `damage` value and logs it
   * in combat history. Called before the skip-turn check so that
   * stunned combatants still take damage from burning/poison.
   */
  private processStartOfTurnDamage(combat: CombatInstance, combatant: Combatant): void {
    for (const effect of combatant.statusEffects) {
      if (effect.damage && effect.damage > 0) {
        const actualDamage = this.applyDamage(combatant, effect.damage);
        combat.history.push({
          type: 'statusEffectTick',
          actor: combatant,
          result: {
            success: true,
            damage: actualDamage,
            damageType: effect.damageType,
            description: `${combatant.character.name} takes ${actualDamage} ${effect.damageType ?? ''} damage from ${effect.name}`,
          },
        });

        // Start-of-turn damage can break concentration
        if (combatant.concentratingOn) {
          if (combatant.isDefeated) {
            // Dead combatants lose concentration automatically
            combatant.concentratingOn = undefined;
          } else {
            this.checkConcentration(combat, combatant, actualDamage);
          }
        }
      }
    }
  }

  /**
   * Process status effect tick-down at the start of a combatant's turn.
   *
   * Decrements duration by 1 for all active status effects, then removes
   * any that have expired (duration <= 0). If effects expired, a
   * 'statusEffectTick' entry is added to combat history for logging.
   */
  private tickStatusEffects(combat: CombatInstance, combatant: Combatant): void {
    if (combatant.statusEffects.length === 0) return;

    // Decrement duration for all effects
    for (const effect of combatant.statusEffects) {
      effect.duration--;
    }

    // Remove expired effects
    const expired = this.removeExpiredStatusEffects(combatant);

    // Log expirations in combat history
    if (expired.length > 0) {
      const effectNames = expired.map(e => e.name).join(', ');
      combat.history.push({
        type: 'statusEffectTick',
        actor: combatant,
        result: {
          success: true,
          description: `${combatant.character.name}: ${effectNames} expired`,
        },
      });
    }
  }

  /**
   * Determine whether an attack should be rolled with advantage, disadvantage,
   * or normally, based on the attacker's and target's active status effects.
   *
   * Advantage and disadvantage cancel each other out per D&D 5e rules.
   *
   * Sources of advantage:
   * - Target has `advantageOnMeleeAttackAgainst` and attack is melee (Prone)
   * - Target has `advantageOnRangedAttackAgainst` and attack is ranged (Prone)
   *
   * Sources of disadvantage:
   * - Attacker has `disadvantageOnAttack` (Frightened, Prone attacker)
   * - Attacker has `disadvantageOnAttackNonSource` and target is not the source (Charmed)
   */
  private getAttackAdvantageDisadvantage(
    attacker: Combatant,
    target: Combatant,
    attack: Attack,
  ): 'advantage' | 'disadvantage' | 'normal' {
    let hasAdvantage = false;
    let hasDisadvantage = false;
    const attackType = attack.type ?? 'melee';

    // Check attacker's effects for disadvantage
    for (const effect of attacker.statusEffects) {
      if (!effect.mechanicalEffects) continue;

      if (effect.mechanicalEffects.disadvantageOnAttack) {
        hasDisadvantage = true;
      }

      if (effect.mechanicalEffects.disadvantageOnAttackNonSource && effect.source !== target.id) {
        hasDisadvantage = true;
      }
    }

    // Check target's effects for advantage against them
    for (const effect of target.statusEffects) {
      if (!effect.mechanicalEffects) continue;

      if (effect.mechanicalEffects.advantageOnMeleeAttackAgainst && attackType === 'melee') {
        hasAdvantage = true;
      }

      if (effect.mechanicalEffects.advantageOnRangedAttackAgainst && attackType === 'ranged') {
        hasAdvantage = true;
      }
    }

    // Advantage and disadvantage cancel out (D&D 5e)
    if (hasAdvantage && hasDisadvantage) return 'normal';
    if (hasAdvantage) return 'advantage';
    if (hasDisadvantage) return 'disadvantage';
    return 'normal';
  }

  /**
   * Check if a combatant has any status effect that causes them to skip
   * their turn (e.g., Stunned, Unconscious).
   */
  private shouldSkipTurn(combatant: Combatant): boolean {
    return combatant.statusEffects.some(
      e => e.mechanicalEffects?.skipTurn
    );
  }

  /**
   * Check if combat should end
   * Ends when:
   * - All enemies defeated
   * - All players defeated
   * - Max turns reached
   * - Player surrender
   */
  private checkCombatStatus(combat: CombatInstance): void {
    const players = combat.combatants.filter(c => c.id.startsWith('player'));
    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));

    const allEnemiesDefeated = enemies.every(c => c.isDefeated);
    const allPlayersDefeated = players.every(c => c.isDefeated);
    const maxTurnsReached = combat.history.length >= (this.config.maxTurnsBeforeDraw || 100);

    if (allEnemiesDefeated || allPlayersDefeated || maxTurnsReached) {
      combat.isActive = false;

      // Determine winner
      if (allEnemiesDefeated && !allPlayersDefeated) {
        combat.winner = players.find(c => !c.isDefeated);
      } else if (allPlayersDefeated && !allEnemiesDefeated) {
        combat.winner = enemies.find(c => !c.isDefeated);
      }
    }
  }

  /**
   * Get combat result when combat ends
   */
  getCombatResult(combat: CombatInstance): CombatResult | null {
    if (combat.isActive) {
      return null; // Combat still ongoing
    }

    const enemies = combat.combatants.filter(c => c.id.startsWith('enemy'));

    const defeated = combat.combatants.filter(c => c.isDefeated);
    let totalTurns = 0;

    // Count turns (each full round of combat = 1 round)
    totalTurns = Math.ceil(combat.history.length / Math.max(1, combat.combatants.length));

    // Calculate XP awarded (simple formula: 50 XP per defeated enemy)
    const xpAwarded = enemies.filter(e => e.isDefeated).length * 50;

    const description = combat.winner
      ? `${combat.winner.character.name} won the combat!`
      : 'Combat ended in a draw.';

    // Calculate treasure based on config
    let gold = 0;
    let items: Equipment[] = [];

    if (this.config.treasure) {
      // Custom treasure config
      if (typeof this.config.treasure.gold === 'number') {
        // Fixed amount
        gold = this.config.treasure.gold;
      } else if (typeof this.config.treasure.gold === 'object' && this.config.treasure.gold !== null) {
        // Range: { min, max }
        const { min, max } = this.config.treasure.gold;
        gold = min + Math.floor(this.rng.random() * (max - min + 1));
      }
      // Default gold is 0 if not specified
      items = this.config.treasure.items || [];
    } else {
      // Default: 0-99 gold
      gold = Math.floor(this.rng.random() * 100);
    }

    return {
      winner: combat.winner!,
      defeated,
      roundsElapsed: combat.roundNumber,
      totalTurns,
      xpAwarded,
      treasureAwarded: {
        gold,
        items
      },
      description
    };
  }

  /**
   * Create a combatant from a character
   */
  private createCombatant(character: CharacterSheet, id: string): Combatant {
    const combatant: Combatant = {
      id,
      character,
      initiative: 0,
      currentHP: character.hp.max,
      temporaryHP: 0,
      statusEffects: [],
      isDefeated: false,
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      spellSlots: this.initializeSpellSlots(character)
    };

    // Initialize legendary action tracking for boss enemies
    if (character.legendary_config) {
      combatant.legendaryActionsRemaining = 3;
      combatant.legendaryResistancesRemaining = character.legendary_config.resistances_per_day;
    }

    return combatant;
  }

  /**
   * Validate spell slot data on a character sheet.
   *
   * Checks for common issues:
   * - Negative `total` or `used` values
   * - `used` exceeding `total` (more slots consumed than exist)
   * - Non-integer spell level keys
   * - Spell levels outside the 1-9 range
   * - `total` of 0 with non-zero `used`
   *
   * Returns an array of issues (empty = valid). Does not throw — callers
   * decide how to handle issues (log, warn, fall back to table).
   */
  validateSpellSlots(character: CharacterSheet): SpellSlotValidationIssue[] {
    const issues: SpellSlotValidationIssue[] = [];
    const sourceSlots = character.spells?.spell_slots;

    if (!sourceSlots) {
      return issues;
    }

    if (Object.keys(sourceSlots).length === 0) {
      return issues;
    }

    for (const [levelStr, slot] of Object.entries(sourceSlots)) {
      const level = Number(levelStr);

      if (!Number.isInteger(level) || level < 1 || level > 9) {
        issues.push({
          message: `Invalid spell level key "${levelStr}" — must be an integer 1-9`,
          level: Number.isNaN(level) ? undefined : level,
          severity: 'error'
        });
        continue;
      }

      if (typeof slot !== 'object' || slot === null) {
        issues.push({
          message: `Spell level ${level} has invalid slot data (expected { total, used }, got ${typeof slot})`,
          level,
          severity: 'error'
        });
        continue;
      }

      const { total, used } = slot as { total: number; used: number };

      if (typeof total !== 'number' || typeof used !== 'number') {
        issues.push({
          message: `Spell level ${level} has non-numeric total (${typeof total}) or used (${typeof used})`,
          level,
          severity: 'error'
        });
        continue;
      }

      if (total < 0) {
        issues.push({
          message: `Spell level ${level} has negative total (${total})`,
          level,
          severity: 'error'
        });
      }

      if (used < 0) {
        issues.push({
          message: `Spell level ${level} has negative used (${used})`,
          level,
          severity: 'error'
        });
      }

      if (total === 0 && used !== 0) {
        issues.push({
          message: `Spell level ${level} has total=0 but used=${used} — no slots exist to consume`,
          level,
          severity: 'warn'
        });
      }

      if (used > total) {
        issues.push({
          message: `Spell level ${level} has used (${used}) exceeding total (${total})`,
          level,
          severity: 'error'
        });
      }
    }

    return issues;
  }

  /**
   * Validate that combatant spell slots are consistent with the source character.
   *
   * After `createCombatant()` runs, this checks that the combatant's remaining
   * spell slots match what the character's `spells.spell_slots` would produce.
   * Useful for catching regressions in the initialization pipeline.
   *
   * Returns an array of issues (empty = consistent).
   */
  validateCombatantSpellSlots(combatant: Combatant): SpellSlotValidationIssue[] {
    const issues: SpellSlotValidationIssue[] = [];
    const character = combatant.character;
    const sourceSlots = character.spells?.spell_slots;
    const combatantSlots = combatant.spellSlots;

    // Both undefined — consistent (non-spellcaster or no slot data)
    if (!sourceSlots || Object.keys(sourceSlots).length === 0) {
      if (combatantSlots && Object.keys(combatantSlots).length > 0) {
        // Combatant has slots but character source doesn't — could be from fallback table
        const expected = getFullCasterSlotsForLevel(character.level);
        const expectedKeys = Object.keys(expected).sort();
        const actualKeys = Object.keys(combatantSlots).sort();
        if (expectedKeys.join(',') !== actualKeys.join(',')) {
          issues.push({
            message: `Combatant has spell slots ${actualKeys.join(', ')} but fallback table for ${character.class} level ${character.level} expects ${expectedKeys.join(', ')}`,
            severity: 'warn'
          });
        } else {
          for (const levelStr of expectedKeys) {
            const level = Number(levelStr);
            if (combatantSlots[level] !== expected[level]) {
              issues.push({
                message: `Spell level ${level}: combatant has ${combatantSlots[level]} but fallback table expects ${expected[level]}`,
                level,
                severity: 'warn'
              });
            }
          }
        }
      }
      return issues;
    }

    // Source exists — check conversion correctness
    if (!combatantSlots) {
      // Source has slots but combatant has none — all slots were fully used
      const allUsed = Object.values(sourceSlots).every(s => s.total - s.used <= 0);
      if (!allUsed) {
        issues.push({
          message: `Character has spell slot data but combatant has no spell slots — expected some remaining`,
          severity: 'error'
        });
      }
      return issues;
    }

    // Both exist — verify each level
    for (const [levelStr, slot] of Object.entries(sourceSlots)) {
      const level = Number(levelStr);
      const expectedRemaining = Math.max(0, slot.total - slot.used);

      if (expectedRemaining === 0) {
        // Level should not appear in combatant slots
        if (combatantSlots[level] !== undefined && combatantSlots[level] > 0) {
          issues.push({
            message: `Spell level ${level}: combatant has ${combatantSlots[level]} slots but source indicates all used (total=${slot.total}, used=${slot.used})`,
            level,
            severity: 'error'
          });
        }
      } else {
        const actual = combatantSlots[level] ?? 0;
        if (actual !== expectedRemaining) {
          issues.push({
            message: `Spell level ${level}: combatant has ${actual} but source expects ${expectedRemaining} (total=${slot.total}, used=${slot.used})`,
            level,
            severity: 'error'
          });
        }
      }
    }

    // Check for combatant slot levels that don't exist in source
    for (const levelStr of Object.keys(combatantSlots)) {
      const level = Number(levelStr);
      if (!(level in sourceSlots)) {
        issues.push({
          message: `Combatant has spell level ${level} with ${combatantSlots[level]} slots but no source data for that level`,
          level,
          severity: 'warn'
        });
      }
    }

    return issues;
  }

  /**
   * Initialize spell slots for a character.
   *
   * Priority:
   * 1. If `character.spells.spell_slots` is populated (e.g. generated enemies),
   *    convert `{ [level]: { total, used } }` → `{ [level]: total - used }`.
   * 2. Fall back to the D&D 5e full-caster table for known spellcasting classes.
   * 3. Return undefined for non-spellcasters with no spell slot data.
   *
   * If validation errors are found in source spell slot data, the problematic
   * levels are skipped (treated as if they don't exist) and the method falls
   * through to the fallback table for known classes.
   */
  private initializeSpellSlots(character: CharacterSheet): {
    [level: number]: number;
  } | undefined {
    // 1. Use character's spell_slots if available (generated enemies, custom chars)
    const sourceSlots = character.spells?.spell_slots;
    if (sourceSlots && Object.keys(sourceSlots).length > 0) {
      const validationIssues = this.validateSpellSlots(character);
      const errors = validationIssues.filter(i => i.severity === 'error');

      if (errors.length > 0) {
        // Source data has errors — skip it and fall through to fallback table
        // so combat doesn't crash with bad data. Warn-level issues are tolerated.
        console.warn(
          `[CombatEngine] Spell slot validation failed for ${character.name} (${character.class}): ` +
          errors.map(e => e.message).join('; ') +
          '. Falling back to class table.'
        );
      } else {
        const result: { [level: number]: number } = {};
        for (const [level, slot] of Object.entries(sourceSlots)) {
          const remaining = slot.total - slot.used;
          if (remaining > 0) {
            result[Number(level)] = remaining;
          }
        }
        return Object.keys(result).length > 0 ? result : undefined;
      }
    }

    // 2. Fall back to hardcoded table for known spellcasting classes
    const spellcastingClasses = ['Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'];

    if (!spellcastingClasses.includes(character.class)) {
      return undefined;
    }

    return getFullCasterSlotsForLevel(character.level);
  }

  /**
   * Get combat status summary
   */
  getCombatSummary(combat: CombatInstance): string {
    const current = this.getCurrentCombatant(combat);
    const summary = `Round ${combat.roundNumber}, Turn: ${current.character.name} (${current.currentHP}/${current.character.hp.max} HP)`;
    return summary;
  }

  /**
   * Apply damage to a combatant (accounting for armor class)
   */
  applyDamage(combatant: Combatant, damage: number): number {
    const actualDamage = Math.max(0, damage);

    // Temporary HP is reduced first
    if (combatant.temporaryHP) {
      const tempDamage = Math.min(combatant.temporaryHP, actualDamage);
      combatant.temporaryHP -= tempDamage;
      const remainingDamage = actualDamage - tempDamage;

      combatant.currentHP -= remainingDamage;
    } else {
      combatant.currentHP -= actualDamage;
    }

    if (combatant.currentHP <= 0) {
      combatant.currentHP = 0;
      combatant.isDefeated = true;
    }

    return actualDamage;
  }

  /**
   * Heal a combatant
   */
  healCombatant(combatant: Combatant, healing: number): number {
    const actualHealing = Math.min(healing, combatant.character.hp.max - combatant.currentHP);
    combatant.currentHP += actualHealing;
    return actualHealing;
  }

  /**
   * Apply temporary hit points
   */
  applyTemporaryHP(combatant: Combatant, tempHP: number): void {
    combatant.temporaryHP = Math.max(combatant.temporaryHP || 0, tempHP);
  }

  /**
   * Apply a status effect to a combatant.
   *
   * Handles stacking rules:
   * - If an effect with the same name already exists on the combatant,
   *   the duration is refreshed to the new effect's duration (take the higher).
   * - If the new effect has `damage`, keep the higher damage value.
   * - Otherwise, the new effect is pushed onto the combatant's statusEffects array.
   *
   * Returns the effect that is now active on the combatant (either the existing
   * refreshed effect or the newly pushed one).
   */
  applyStatusEffect(combatant: Combatant, effect: StatusEffect): StatusEffect {
    // If the new effect requires concentration, drop any existing concentration effect
    if (effect.hasConcentration && combatant.concentratingOn) {
      this.dropConcentration(combatant, 'New concentration spell cast');
    }

    const existingIndex = combatant.statusEffects.findIndex(
      e => e.name === effect.name
    );

    if (existingIndex !== -1) {
      const existing = combatant.statusEffects[existingIndex];

      // Refresh duration — take the higher value
      existing.duration = Math.max(existing.duration, effect.duration);

      // Take higher damage if both have damage values
      if (effect.damage !== undefined) {
        existing.damage = Math.max(existing.damage ?? 0, effect.damage);
      }

      // Carry over source if the new effect specifies one
      if (effect.source !== undefined) {
        existing.source = effect.source;
      }

      // Carry over mechanical effects if the new effect specifies them
      if (effect.mechanicalEffects) {
        existing.mechanicalEffects = {
          ...existing.mechanicalEffects,
          ...effect.mechanicalEffects,
        };
      }

      // Carry over concentration flag
      if (effect.hasConcentration) {
        existing.hasConcentration = true;
      }

      // Carry over damage type if the new effect specifies one
      if (effect.damageType) {
        existing.damageType = effect.damageType;
      }

      // Track concentration on the combatant
      if (effect.hasConcentration) {
        combatant.concentratingOn = effect.name;
      }

      return existing;
    }

    combatant.statusEffects.push(effect);

    // Track concentration on the combatant
    if (effect.hasConcentration) {
      combatant.concentratingOn = effect.name;
    }

    return effect;
  }

  /**
   * Drop a combatant's concentration, removing the concentrated effect.
   *
   * Per D&D 5e: a combatant can only maintain concentration on one effect
   * at a time. When concentration ends (new concentration spell, failed save,
   * incapacitated, or dead), the effect is removed immediately.
   *
   * @param combatant - The concentrating combatant
   * @param reason - Why concentration was dropped (for logging)
   * @returns The dropped StatusEffect, or undefined if not concentrating
   */
  dropConcentration(combatant: Combatant, reason: string = 'Concentration ended'): StatusEffect | undefined {
    if (!combatant.concentratingOn) {
      return undefined;
    }

    const effectName = combatant.concentratingOn;
    const effectIndex = combatant.statusEffects.findIndex(e => e.name === effectName);

    if (effectIndex !== -1) {
      const [dropped] = combatant.statusEffects.splice(effectIndex, 1);
      combatant.concentratingOn = undefined;
      return dropped;
    }

    // Effect was already removed (e.g., expired), just clear the tracking
    combatant.concentratingOn = undefined;
    return undefined;
  }

  /**
   * Make a concentration saving throw when a concentrating combatant takes damage.
   *
   * Per D&D 5e: DC = 10 or half the damage taken (rounded down), whichever is higher.
   * The save is a CON saving throw.
   *
   * @param combatant - The concentrating combatant
   * @param damage - The total damage taken in the triggering event
   * @returns true if concentration maintained, false if broken
   */
  private rollConcentrationSave(combatant: Combatant, damage: number): boolean {
    if (!combatant.concentratingOn) {
      return true; // Not concentrating, nothing to check
    }

    // DC = 10 or half damage, whichever is higher
    const dc = Math.max(10, Math.floor(damage / 2));

    // CON modifier + proficiency bonus (if proficient in CON saves)
    const conModifier = combatant.character.ability_modifiers.CON ?? 0;
    const conSaveProficiency = combatant.character.saving_throws.CON ?? false;
    const proficiencyBonus = conSaveProficiency ? combatant.character.proficiency_bonus : 0;

    const roll = this.diceRoller
      ? this.diceRoller.rollSavingThrow(conModifier, proficiencyBonus)
      : DiceRoller.rollSavingThrow(conModifier, proficiencyBonus);

    // Natural 1 always fails, natural 20 always succeeds
    const d20Result = roll - conModifier - proficiencyBonus;
    if (d20Result === 1) return false;
    if (d20Result === 20) return true;

    return roll >= dc;
  }

  /**
   * Check and potentially break concentration when a combatant takes damage.
   *
   * Should be called whenever a concentrating combatant takes damage.
   * If the concentration save fails, the concentrated effect is dropped.
   *
   * @param combat - Combat instance (for history logging)
   * @param combatant - The combatant who took damage
   * @param damage - The amount of damage taken
   * @returns true if concentration was broken, false if maintained or not concentrating
   */
  checkConcentration(combat: CombatInstance, combatant: Combatant, damage: number): boolean {
    if (!combatant.concentratingOn) {
      return false; // Not concentrating
    }

    const maintained = this.rollConcentrationSave(combatant, damage);

    if (!maintained) {
      const dropped = this.dropConcentration(combatant, 'Took damage and failed concentration save');
      if (dropped) {
        combat.history.push({
          type: 'statusEffectTick',
          actor: combatant,
          result: {
            success: true,
            description: `${combatant.character.name} lost concentration on ${dropped.name} (took ${damage} damage)`,
          },
        });
      }
      return true; // Concentration was broken
    }

    return false; // Concentration maintained
  }

  /**
   * Remove expired status effects from a combatant.
   *
   * Filters out all effects where `duration <= 0`.
   * Returns the array of removed effects for logging purposes.
   */
  removeExpiredStatusEffects(combatant: Combatant): StatusEffect[] {
    const expired: StatusEffect[] = combatant.statusEffects.filter(
      e => e.duration <= 0
    );

    combatant.statusEffects = combatant.statusEffects.filter(
      e => e.duration > 0
    );

    // If the concentrated effect expired, clear the concentration tracking
    if (combatant.concentratingOn) {
      const stillActive = combatant.statusEffects.some(
        e => e.name === combatant.concentratingOn
      );
      if (!stillActive) {
        combatant.concentratingOn = undefined;
      }
    }

    return expired;
  }

  /**
   * Get all living combatants
   */
  getLivingCombatants(combat: CombatInstance): Combatant[] {
    return combat.combatants.filter(c => !c.isDefeated);
  }

  /**
   * Get all defeated combatants
   */
  getDefeatedCombatants(combat: CombatInstance): Combatant[] {
    return combat.combatants.filter(c => c.isDefeated);
  }
}
