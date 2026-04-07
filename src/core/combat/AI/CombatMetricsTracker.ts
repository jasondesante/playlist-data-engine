/**
 * CombatMetricsTracker — Computes per-combatant statistics from combat history
 *
 * Analyzes the action log of a completed CombatInstance to produce
 * CombatantMetrics for every combatant. This is a post-hoc analysis
 * — it reads the existing history without modifying the engine.
 *
 * Used by AICombatRunner after combat completes, and by the Monte Carlo
 * simulator to aggregate per-combatant performance across many runs.
 */

import type { CombatInstance, CombatAction } from '../../types/Combat.js';
import type { CombatantMetrics } from '../../types/CombatAI.js';

export class CombatMetricsTracker {
  /**
   * Compute per-combatant metrics from a completed combat instance.
   *
   * Iterates the full action history and tallies damage dealt/taken,
   * healing, spells, items, criticals, and action counts per combatant.
   *
   * @param combat - A completed CombatInstance (isActive should be false)
   * @returns Map of combatant ID → CombatantMetrics
   */
  computeMetrics(combat: CombatInstance): Map<string, CombatantMetrics> {
    const metrics = new Map<string, CombatantMetrics>();

    // Initialize metrics for every combatant
    for (const c of combat.combatants) {
      const side = c.id.startsWith('player') ? 'player' as const : 'enemy' as const;
      metrics.set(c.id, {
        combatantId: c.id,
        name: c.character.name,
        side,
        totalDamageDealt: 0,
        totalDamageTaken: 0,
        totalHealingDone: 0,
        spellsCast: 0,
        itemsUsed: 0,
        criticalHits: 0,
        roundsSurvived: 0,
        survived: !c.isDefeated,
        actionsByType: {},
        damagePerRound: [],
      });
    }

    // Current round tracker for damage-per-round tracking
    let currentRound = 1;
    // Damage dealt this round per combatant
    const roundDamage = new Map<string, number>();

    // Reset round damage tracking at the start
    for (const c of combat.combatants) {
      roundDamage.set(c.id, 0);
    }

    // Process each action in history
    for (const action of combat.history) {
      const actorId = action.actor.id;
      const actorMetrics = metrics.get(actorId);

      // Count action type
      if (actorMetrics) {
        actorMetrics.actionsByType[action.type] = (actorMetrics.actionsByType[action.type] || 0) + 1;
      }

      switch (action.type) {
        case 'attack': {
          const damage = action.result?.damage ?? 0;
          const isCrit = action.result?.isCritical === true;

          // Actor dealt damage
          if (actorMetrics && damage > 0) {
            actorMetrics.totalDamageDealt += damage;
            actorMetrics.criticalHits += isCrit ? 1 : 0;
            roundDamage.set(actorId, (roundDamage.get(actorId) ?? 0) + damage);
          }

          // Target took damage
          if (action.target) {
            const targetMetrics = metrics.get(action.target.id);
            if (targetMetrics && damage > 0) {
              targetMetrics.totalDamageTaken += damage;
            }
          }
          break;
        }

        case 'spell': {
          const damage = action.result?.damage ?? 0;
          const isCrit = action.result?.isCritical === true;
          const isHealingSpell = this.isHealingSpell(action);

          // Actor cast a spell
          if (actorMetrics) {
            actorMetrics.spellsCast += 1;

            if (isHealingSpell) {
              // Track healing spells cast on allies
              const healTargets = action.targets ?? (action.target ? [action.target] : []);
              for (const t of healTargets) {
                // For healing, count the damage value as healing done
                // (healing spells in the current engine use the damage field for heal amount)
                const healAmount = action.result?.damage ?? 0;
                if (healAmount > 0) {
                  actorMetrics.totalHealingDone += healAmount;
                }
              }
            } else if (damage > 0) {
              actorMetrics.totalDamageDealt += damage;
              actorMetrics.criticalHits += isCrit ? 1 : 0;
              roundDamage.set(actorId, (roundDamage.get(actorId) ?? 0) + damage);
            }
          }

          // Targets took spell damage (only for damage spells, not healing)
          if (!isHealingSpell && damage > 0) {
            const targets = action.targets ?? (action.target ? [action.target] : []);
            for (const t of targets) {
              const targetMetrics = metrics.get(t.id);
              if (targetMetrics) {
                targetMetrics.totalDamageTaken += damage;
              }
            }
          }
          break;
        }

        case 'legendaryAction': {
          const damage = action.result?.damage ?? 0;

          if (actorMetrics && damage > 0) {
            actorMetrics.totalDamageDealt += damage;
            roundDamage.set(actorId, (roundDamage.get(actorId) ?? 0) + damage);
          }

          // Target took legendary action damage
          if (action.target && damage > 0) {
            const targetMetrics = metrics.get(action.target.id);
            if (targetMetrics) {
              targetMetrics.totalDamageTaken += damage;
            }
          }
          break;
        }

        case 'useItem': {
          if (actorMetrics) {
            actorMetrics.itemsUsed += 1;
          }
          break;
        }
      }
    }

    // Compute rounds survived for each combatant
    // A combatant survives N rounds if they were alive for N rounds of combat.
    // We determine this by finding the round in which each combatant was defeated
    // from the history. If never defeated, they survived all rounds.
    const totalRounds = combat.roundNumber;
    const defeatRound = new Map<string, number>();

    for (const action of combat.history) {
      // Track when combatants are defeated by checking if target HP hits 0
      if (action.target?.isDefeated && action.result?.damage) {
        const existing = defeatRound.get(action.target.id);
        if (existing === undefined) {
          defeatRound.set(action.target.id, currentRound);
        }
      }
      // Also check multi-target spell defeats
      if (action.targets) {
        for (const t of action.targets) {
          if (t.isDefeated && action.result?.damage) {
            const existing = defeatRound.get(t.id);
            if (existing === undefined) {
              defeatRound.set(t.id, currentRound);
            }
          }
        }
      }
    }

    // Assign rounds survived
    for (const [id, m] of metrics) {
      if (m.survived) {
        m.roundsSurvived = totalRounds;
      } else {
        m.roundsSurvived = defeatRound.get(id) ?? 1;
      }
    }

    // Store the metrics on the combat instance
    combat.metrics = metrics;

    return metrics;
  }

  /**
   * Check if a spell action is a healing spell.
   * Healing spells target allies and have the 'healing' tag.
   */
  private isHealingSpell(action: CombatAction): boolean {
    if (!action.spell) return false;
    const tags = action.spell.tags ?? [];
    return tags.includes('healing') || tags.includes('heal');
  }
}
