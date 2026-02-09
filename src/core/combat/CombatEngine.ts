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
  CombatResult
} from '../types/Combat';
import type { EnvironmentalContext } from '../types/Progression';
import { InitiativeRoller } from './InitiativeRoller';
import { AttackResolver } from './AttackResolver';
import { SpellCaster } from './SpellCaster';
import { DEFAULT_EQUIPMENT } from '../../utils/equipmentConstants.js';
import { SeededRNG } from '../../utils/random.js';

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
   *
   * @example
   * const combat = new CombatEngine({ tacticalMode: true, seed: 'my-seed' });
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
    let items: any[] = [];

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
    return {
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
  }

  /**
   * Initialize spell slots for a character based on their class
   */
  private initializeSpellSlots(character: CharacterSheet): {
    [level: number]: number;
  } | undefined {
    const spellcastingClasses = ['Wizard', 'Cleric', 'Sorcerer', 'Bard', 'Druid', 'Warlock', 'Paladin', 'Ranger'];

    if (!spellcastingClasses.includes(character.class)) {
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
