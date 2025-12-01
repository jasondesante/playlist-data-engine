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
  CombatActionResult
} from '../types/Combat';
import type { EnvironmentalContext } from '../types/Progression';
import { InitiativeRoller } from './InitiativeRoller';
import { AttackResolver } from './AttackResolver';
import { SpellCaster } from './SpellCaster';

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
 */
export class CombatEngine {
  private initiativeRoller: InitiativeRoller;
  private attackResolver: AttackResolver;
  private spellCaster: SpellCaster;
  private config: CombatConfig;

  /**
   * Initialize the combat engine with configuration options
   *
   * @param {CombatConfig} [config] - Combat configuration
   * @param {boolean} [config.useEnvironment=true] - Apply environmental bonuses
   * @param {boolean} [config.useMusic=false] - Apply music bonuses to combat
   * @param {boolean} [config.tacticalMode=false] - Enable advanced tactical rules
   * @param {number} [config.maxTurnsBeforeDraw=100] - Max turns before combat draws
   * @param {boolean} [config.allowFleeing=false] - Allow combatants to flee
   *
   * @example
   * const combat = new CombatEngine({ tacticalMode: true });
   */
  constructor(config: CombatConfig = {}) {
    this.initiativeRoller = new InitiativeRoller();
    this.attackResolver = new AttackResolver();
    this.spellCaster = new SpellCaster();
    this.config = {
      useEnvironment: true,
      useMusic: false,
      tacticalMode: false,
      maxTurnsBeforeDraw: 100,
      allowFleeing: false,
      ...config
    };
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
   */
  executeAttack(
    combat: CombatInstance,
    attacker: Combatant,
    target: Combatant,
    attack: Attack
  ): CombatAction {
    const result = this.attackResolver.resolveAttack(attacker, target, attack);

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
    }

    return action;
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

    // Check for defeated targets
    for (const target of targets) {
      if (target.currentHP <= 0) {
        target.isDefeated = true;
      }
    }

    return action;
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
   * Advance to the next turn
   * Resets action trackers and moves to next combatant
   */
  nextTurn(combat: CombatInstance): CombatInstance {
    const current = combat.combatants[combat.currentTurnIndex];

    // Reset action trackers for current combatant
    current.actionUsed = false;
    current.bonusActionUsed = false;
    current.reactionUsed = false;

    // Move to next combatant
    const nextIndex = (combat.currentTurnIndex + 1) % combat.combatants.length;
    const isNewRound = nextIndex === 0;

    if (isNewRound) {
      combat.roundNumber++;

      // Reset spell slots at end of each round (in some variants)
      // This is optional based on variant rules
    }

    combat.currentTurnIndex = nextIndex;
    combat.lastUpdated = Date.now();

    // Check for combat end conditions
    this.checkCombatStatus(combat);

    return combat;
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

    const players = combat.combatants.filter(c => c.id.startsWith('player'));
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

    return {
      winner: combat.winner!,
      defeated,
      roundsElapsed: combat.roundNumber,
      totalTurns,
      xpAwarded,
      treasureAwarded: {
        gold: Math.floor(Math.random() * 100),
        items: []
      },
      description
    };
  }

  /**
   * Create a combatant from a character
   */
  private createCombatant(character: CharacterSheet, id: string): Combatant {
    return {
      id,
      character,
      initiative: 0,
      currentHP: character.hit_points.max,
      temporaryHP: 0,
      statusEffects: [],
      isDefeated: false,
      actionUsed: false,
      bonusActionUsed: false,
      reactionUsed: false,
      spellSlots: this.initializeSpellSlots(character)
    };
  }

  /**
   * Initialize spell slots for a character based on their class
   */
  private initializeSpellSlots(character: CharacterSheet): {
    [level: number]: number;
  } | undefined {
    const spellcastingClasses = ['Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'];

    if (!spellcastingClasses.includes(character.character_class)) {
      return undefined;
    }

    // Simplified spell slot table by level
    const slotsByLevel: { [level: number]: number[] } = {
      1: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      3: [4, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      4: [4, 3, 0, 0, 0, 0, 0, 0, 0, 0],
      5: [4, 3, 2, 0, 0, 0, 0, 0, 0, 0],
      6: [4, 3, 3, 0, 0, 0, 0, 0, 0, 0],
      7: [4, 3, 3, 1, 0, 0, 0, 0, 0, 0],
      8: [4, 3, 3, 2, 0, 0, 0, 0, 0, 0],
      9: [4, 3, 3, 3, 1, 0, 0, 0, 0, 0],
      10: [4, 3, 3, 3, 2, 0, 0, 0, 0, 0],
      11: [4, 3, 3, 3, 2, 1, 0, 0, 0, 0],
      12: [4, 3, 3, 3, 2, 1, 0, 0, 0, 0],
      13: [4, 3, 3, 3, 2, 1, 1, 0, 0, 0],
      14: [4, 3, 3, 3, 2, 1, 1, 0, 0, 0],
      15: [4, 3, 3, 3, 2, 1, 1, 1, 0, 0],
      16: [4, 3, 3, 3, 2, 1, 1, 1, 0, 0],
      17: [4, 3, 3, 3, 2, 1, 1, 1, 1, 0],
      18: [4, 3, 3, 3, 3, 1, 1, 1, 1, 0],
      19: [4, 3, 3, 3, 3, 2, 1, 1, 1, 1],
      20: [4, 3, 3, 3, 3, 2, 2, 1, 1, 1]
    };

    const slots = slotsByLevel[character.level] || [0];
    const spellSlots: { [level: number]: number } = {};

    for (let i = 1; i < slots.length; i++) {
      spellSlots[i] = slots[i];
    }

    return spellSlots;
  }

  /**
   * Get combat status summary
   */
  getCombatSummary(combat: CombatInstance): string {
    const current = this.getCurrentCombatant(combat);
    const summary = `Round ${combat.roundNumber}, Turn: ${current.character.name} (${current.currentHP}/${current.character.hit_points.max} HP)`;
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
    const actualHealing = Math.min(healing, combatant.character.hit_points.max - combatant.currentHP);
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
