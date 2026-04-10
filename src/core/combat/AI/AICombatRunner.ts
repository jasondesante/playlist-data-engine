/**
 * AICombatRunner — Orchestrates full combat encounters with AI decision-making
 *
 * Bridges the gap between CombatAI (decisions) and CombatEngine (execution).
 * For each combatant's turn, the runner:
 * 1. Asks CombatAI for a decision
 * 2. Executes the decision via CombatEngine
 * 3. Processes legendary actions for bosses
 * 4. Advances to the next turn
 *
 * The runner is designed for both live combat (random dice) and simulation
 * (seeded dice). Pass a SeededDiceRoller for deterministic results.
 */

import type { CharacterSheet, Spell } from '../../types/Character.js';
import type {
  CombatInstance,
  Combatant,
  CombatConfig,
  CombatResult,
  DiceRollerAPI,
} from '../../types/Combat.js';
import type { AIConfig, AIDecision, CombatantMetrics } from '../../types/CombatAI.js';
import { CombatEngine } from '../CombatEngine.js';
import { CombatAI } from './CombatAI.js';
import { CombatMetricsTracker } from './CombatMetricsTracker.js';

/**
 * Result of an AI-driven combat simulation.
 * Contains both the full combat instance (with history) and the final result.
 */
export interface AICombatResult {
  /** Full combat instance with complete action history */
  combat: CombatInstance;
  /** Final combat result (winner, XP, rounds, etc.) */
  result: CombatResult;
  /** Per-combatant metrics computed from combat history */
  metrics: Map<string, CombatantMetrics>;
}

/**
 * AICombatRunner — Runs a full combat encounter with AI-controlled combatants.
 *
 * Usage:
 * ```ts
 * const runner = new AICombatRunner();
 * const { combat, result } = runner.runFullCombat(
 *   players, enemies,
 *   { playerStyle: 'normal', enemyStyle: 'aggressive' },
 *   { maxTurnsBeforeDraw: 50 },
 *   createSeededRoller('sim-seed-42')
 * );
 * console.log(result.winnerSide); // 'player' | 'enemy' | 'draw'
 * console.log(result.roundsElapsed);
 * ```
 */
export class AICombatRunner {
  /**
   * Run a complete combat encounter with AI-controlled combatants.
   *
   * @param players - Player character sheets
   * @param enemies - Enemy character sheets
   * @param aiConfig - AI configuration (play styles per side)
   * @param combatConfig - Optional combat engine configuration
   * @param diceRoller - Optional dice roller for deterministic simulation
   * @returns The full combat instance and final result
   */
  runFullCombat(
    players: CharacterSheet[],
    enemies: CharacterSheet[],
    aiConfig: AIConfig,
    combatConfig?: CombatConfig,
    diceRoller?: DiceRollerAPI,
  ): AICombatResult {
    const engine = new CombatEngine(combatConfig ?? {}, diceRoller);
    const ai = new CombatAI(aiConfig);
    const combat = engine.startCombat(players, enemies);

    // Edge case: no combatants
    if (combat.combatants.length === 0) {
      const emptyMetrics = new Map<string, CombatantMetrics>();
      return {
        combat,
        result: {
          winnerSide: 'draw',
          defeated: [],
          roundsElapsed: 0,
          totalTurns: 0,
          xpAwarded: 0,
          description: 'No combatants — combat could not start.',
        },
        metrics: emptyMetrics,
      };
    }

    // Main combat loop
    while (combat.isActive) {
      const current = engine.getCurrentCombatant(combat);

      // Safety: skip defeated combatants (shouldn't happen after nextTurn)
      if (current.isDefeated) {
        engine.nextTurn(combat);
        continue;
      }

      // Safety: skip combatants with skipTurn effects (Stunned, Unconscious).
      // nextTurn() handles this when advancing TO a combatant, but on the very
      // first turn (turn 0), nextTurn hasn't been called yet.
      if (this.hasSkipTurnEffect(current)) {
        combat.history.push({
          type: 'statusEffectTick',
          actor: current,
          result: {
            success: true,
            description: `${current.character.name}'s turn is skipped (${current.statusEffects.filter(e => e.mechanicalEffects?.skipTurn).map(e => e.name).join(', ')})`,
          },
        });
        engine.nextTurn(combat);
        continue;
      }

      // Get AI decision for this combatant
      const decision = ai.decide(current, combat);

      // Execute the decision
      this.executeDecision(engine, combat, current, decision);

      if (!combat.isActive) break;

      // Process legendary actions for bosses after this turn
      this.processLegendaryActions(engine, ai, combat, current);

      if (!combat.isActive) break;

      // Advance to next turn
      engine.nextTurn(combat);
    }

    const result = engine.getCombatResult(combat);
    if (!result) {
      throw new Error('AICombatRunner: combat ended but getCombatResult returned null');
    }

    // Compute per-combatant metrics from combat history
    const tracker = new CombatMetricsTracker();
    const metrics = tracker.computeMetrics(combat);

    return { combat, result, metrics };
  }

  /**
   * Execute an AI decision on the combat engine.
   *
   * Maps each AIDecision action type to the corresponding CombatEngine method.
   * Unhandled actions (e.g., useItem) are logged in history without mechanical effect.
   */
  private executeDecision(
    engine: CombatEngine,
    combat: CombatInstance,
    combatant: Combatant,
    decision: AIDecision,
  ): void {
    switch (decision.action) {
      case 'attack': {
        const target = this.findCombatant(combat, decision.target);
        if (target) {
          this.executeWeaponAttack(engine, combat, combatant, target, decision.weaponName);
        }
        break;
      }

      case 'castSpell': {
        const spell = this.findSpell(combatant, decision.spellName);
        if (spell) {
          const targets = this.resolveTargets(combat, decision.target, decision.targetIds);
          if (targets.length > 0) {
            engine.executeCastSpell(combat, combatant, spell, targets);
          }
        }
        break;
      }

      case 'dodge':
        engine.executeDodge(combat, combatant);
        break;

      case 'dash':
        engine.executeDash(combat, combatant);
        break;

      case 'disengage':
        engine.executeDisengage(combat, combatant);
        break;

      case 'flee': {
        if (engine.canFlee()) {
          engine.executeFlee(combat, combatant);
        } else {
          // Fleeing not allowed — fall back to basic attack
          this.fallbackAttack(engine, combat, combatant);
        }
        break;
      }

      case 'useItem': {
        // Consume the item from inventory. Item-specific effects (healing, buffs, etc.)
        // are not yet implemented — only the consumption happens for now.
        const items = combatant.character.equipment?.items || [];
        const item = decision.itemName
          ? items.find(i => i.name === decision.itemName && i.quantity > 0)
          : undefined;
        if (item) {
          item.quantity -= 1;
          // Remove from array if fully consumed
          if (item.quantity <= 0) {
            const idx = items.indexOf(item);
            if (idx !== -1) items.splice(idx, 1);
          }
        }
        combat.history.push({
          type: 'useItem',
          actor: combatant,
          result: {
            success: !!item,
            description: item
              ? `${combatant.character.name} uses ${decision.itemName}`
              : `${combatant.character.name} tries to use ${decision.itemName ?? 'an item'} — item not found`,
          },
        });
        break;
      }

      case 'legendaryAction': {
        // Legendary actions can also be the main turn decision (e.g., boss's own turn)
        this.executeLegendaryDecision(engine, combat, combatant, decision);
        break;
      }

      case 'skip':
        // AI decided to skip (e.g., no valid targets). Log and do nothing.
        combat.history.push({
          type: 'statusEffectTick',
          actor: combatant,
          result: {
            success: true,
            description: `${combatant.character.name} skips their turn (${decision.reasoning ?? 'no action'})`,
          },
        });
        break;
    }
  }

  /**
   * Process legendary actions for boss enemies after a regular combatant's turn.
   *
   * In D&D 5e, legendary actions are taken at the end of another creature's turn.
   * Each boss can spend up to 3 legendary action points per round. The AI
   * decides whether to act and which action to use, potentially chaining
   * multiple actions in a single turn.
   */
  private processLegendaryActions(
    engine: CombatEngine,
    ai: CombatAI,
    combat: CombatInstance,
    lastActor: Combatant,
  ): void {
    for (const combatant of combat.combatants) {
      if (!combatant.character.legendary_config) continue;
      if (combatant.isDefeated) continue;
      if (combatant.id === lastActor.id) continue; // Boss doesn't react to own turn

      // Let the boss chain legendary actions until AI stops or points run out
      while (combat.isActive && (combatant.legendaryActionsRemaining ?? 0) > 0) {
        const decision = ai.selectLegendaryAction(combatant, combat);
        if (!decision) break;

        this.executeLegendaryDecision(engine, combat, combatant, decision);
        if (!combat.isActive) break;
      }

      if (!combat.isActive) break;
    }
  }

  /**
   * Execute a legendary action decision from the AI.
   */
  private executeLegendaryDecision(
    engine: CombatEngine,
    combat: CombatInstance,
    boss: Combatant,
    decision: AIDecision,
  ): void {
    const config = boss.character.legendary_config;
    if (!config || !decision.legendaryActionId) return;

    const action = config.actions.find(a => a.id === decision.legendaryActionId);
    if (!action) return;

    const target = decision.target
      ? this.findCombatant(combat, decision.target)
      : undefined;

    try {
      engine.executeLegendaryAction(combat, boss, {
        id: action.id,
        name: action.name,
        cost: action.cost,
        effect: action.effect,
        damage: action.damage,
        damage_type: action.damage_type,
      }, target);
    } catch {
      // Can throw if points are insufficient (AI assessment may be stale).
      // Silently skip — next turn refreshes legendary action points.
    }
  }

  /**
   * Execute a weapon attack with resilience to weapon data issues.
   *
   * Handles the name mismatch between CombatAI's 'Unarmed Strike' and
   * CombatEngine's 'unarmed' trigger. Falls back to unarmed strike if
   * the named weapon causes an error (e.g., not in DEFAULT_EQUIPMENT).
   */
  private executeWeaponAttack(
    engine: CombatEngine,
    combat: CombatInstance,
    combatant: Combatant,
    target: Combatant,
    weaponName: string | undefined,
  ): void {
    // CombatAI returns 'Unarmed Strike' but CombatEngine expects 'unarmed'
    const engineWeaponName = weaponName === 'Unarmed Strike' ? 'unarmed' : weaponName;

    try {
      engine.executeWeaponAttack(combat, combatant, target, engineWeaponName);
    } catch {
      // Weapon execution failed (not in DEFAULT_EQUIPMENT, bad damage data, etc.)
      // Fall back to unarmed strike
      try {
        engine.executeWeaponAttack(combat, combatant, target, 'unarmed');
      } catch {
        // If even unarmed fails, skip the turn (shouldn't happen)
      }
    }
  }

  /**
   * Find a combatant by ID in the combat instance.
   */
  private findCombatant(combat: CombatInstance, id: string | undefined): Combatant | undefined {
    if (!id) return undefined;
    return combat.combatants.find(c => c.id === id);
  }

  /**
   * Find a spell by name from a combatant's combat_spells array.
   */
  private findSpell(combatant: Combatant, name: string | undefined): Spell | undefined {
    if (!name) return undefined;
    return combatant.character.combat_spells?.find(s => s.name === name);
  }

  /**
   * Resolve target combatants from a decision's target and targetIds fields.
   */
  private resolveTargets(
    combat: CombatInstance,
    targetId: string | undefined,
    targetIds: string[] | undefined,
  ): Combatant[] {
    if (targetIds && targetIds.length > 0) {
      return targetIds
        .map(id => combat.combatants.find(c => c.id === id))
        .filter((c): c is Combatant => c !== undefined);
    }

    if (targetId) {
      const target = combat.combatants.find(c => c.id === targetId);
      return target ? [target] : [];
    }

    return [];
  }

  /**
   * Fallback: basic attack the first living enemy when the preferred action
   * can't be executed (e.g., flee not allowed).
   */
  private fallbackAttack(
    engine: CombatEngine,
    combat: CombatInstance,
    combatant: Combatant,
  ): void {
    const side = combatant.id.startsWith('player') ? 'enemy' : 'player';
    const enemies = combat.combatants.filter(c => c.id.startsWith(side) && !c.isDefeated);
    if (enemies.length > 0) {
      this.executeWeaponAttack(engine, combat, combatant, enemies[0], undefined);
    }
  }

  /**
   * Check if a combatant has any status effect that forces turn skipping
   * (e.g., Stunned, Unconscious).
   */
  private hasSkipTurnEffect(combatant: Combatant): boolean {
    return combatant.statusEffects.some(
      e => e.mechanicalEffects?.skipTurn
    );
  }
}
