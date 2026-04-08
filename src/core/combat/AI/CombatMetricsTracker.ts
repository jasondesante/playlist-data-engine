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
        hits: 0,
        misses: 0,
        kills: 0,
        roundsSurvived: 0,
        survived: !c.isDefeated,
        actionsByType: {},
        damagePerRound: [],
        hpRemainingPercent: 0,
      });
    }

    // Action types that represent a combatant's actual turn (not supplementary actions)
    const TURN_ACTION_TYPES = new Set([
      'attack', 'spell', 'dodge', 'dash', 'disengage', 'flee',
      'help', 'hide', 'ready', 'useItem', 'skip',
    ]);

    // Track actions per combatant for round estimation
    const actionCounts = new Map<string, number>();

    // Process each action in history
    for (const action of combat.history) {
      const actorId = action.actor.id;
      const actorMetrics = metrics.get(actorId);

      // Count action type
      if (actorMetrics) {
        actorMetrics.actionsByType[action.type] = (actorMetrics.actionsByType[action.type] || 0) + 1;
      }

      // Count real turns for round estimation
      if (TURN_ACTION_TYPES.has(action.type)) {
        actionCounts.set(actorId, (actionCounts.get(actorId) ?? 0) + 1);
      }

      switch (action.type) {
        case 'attack': {
          const damage = action.result?.damage ?? 0;
          const isCrit = action.result?.isCritical === true;
          const isHit = action.result?.success === true;

          // Track hit/miss
          if (actorMetrics) {
            if (isHit) {
              actorMetrics.hits += 1;
            } else {
              actorMetrics.misses += 1;
            }
          }

          // Actor dealt damage
          if (actorMetrics && damage > 0) {
            actorMetrics.totalDamageDealt += damage;
            actorMetrics.criticalHits += isCrit ? 1 : 0;
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
              if (action.result?.success === true) {
                actorMetrics.hits += 1;
              } else {
                actorMetrics.misses += 1;
              }
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

    // Attribute kills: for each defeated combatant, find the last actor
    // who dealt damage to them before their final action.
    const lastDamager = new Map<string, string>(); // targetId → actorId
    for (const action of combat.history) {
      if ((action.type === 'attack' || action.type === 'spell' || action.type === 'legendaryAction') && action.target) {
        const damage = action.result?.damage ?? 0;
        if (damage > 0) {
          lastDamager.set(action.target.id, action.actor.id);
        }
        // For multi-target spells, also track
        if (action.targets) {
          for (const t of action.targets) {
            if (damage > 0) {
              lastDamager.set(t.id, action.actor.id);
            }
          }
        }
      }
    }
    for (const c of combat.combatants) {
      if (c.isDefeated) {
        const killerId = lastDamager.get(c.id);
        if (killerId) {
          const killerMetrics = metrics.get(killerId);
          if (killerMetrics) {
            killerMetrics.kills += 1;
          }
        }
      }
    }

    // Compute rounds survived and damage-per-round for each combatant.
    //
    // The combat history is a flat list with no round markers, so we estimate
    // rounds survived from action counts: each combatant gets one turn per
    // round, so rounds ≈ turn count / combatant count.
    //
    // For damage-per-round, we compute the single average DPR value
    // (totalDamage / roundsSurvived) since per-round breakdown isn't
    // available from the flat history.
    const totalRounds = combat.roundNumber;
    const combatantCount = combat.combatants.length;

    for (const [id, m] of metrics) {
      if (m.survived) {
        m.roundsSurvived = totalRounds;
      } else {
        // Defeated: estimate rounds from turn count
        const turns = actionCounts.get(id) ?? 0;
        m.roundsSurvived = combatantCount > 0
          ? Math.max(1, Math.round(turns / combatantCount))
          : 1;
      }

      // Compute damage per round from aggregate data
      if (m.roundsSurvived > 0 && m.totalDamageDealt > 0) {
        m.damagePerRound = [m.totalDamageDealt / m.roundsSurvived];
      }

      // Compute HP remaining percent from combatant state
      const combatant = combat.combatants.find(c => c.id === id);
      if (combatant && combatant.character.hp.max > 0) {
        m.hpRemainingPercent = m.survived
          ? Math.round((combatant.currentHP / combatant.character.hp.max) * 100)
          : 0;
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
