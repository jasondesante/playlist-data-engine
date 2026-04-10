/**
 * CombatAI — Decision engine for AI-controlled combatants
 *
 * Produces an `AIDecision` for each combatant's turn based on:
 * 1. Threat assessment (current battlefield state)
 * 2. Play style (normal vs aggressive)
 * 3. Available actions (weapons, spells, items, legendary actions)
 *
 * The AI is designed to be **deterministic given the same combat state** —
 * it uses no randomness internally. All randomness comes from the dice roller
 * when the AICombatRunner executes the decision.
 */

import type {
  Combatant,
  CombatInstance,
} from '../../types/Combat';
import type {
  AIConfig,
  AIPlayStyle,
  AIDecision,
  AIThreatAssessment,
} from '../../types/CombatAI';
import type { Spell } from '../../types/Character';
import type { LegendaryAction } from '../../types/Enemy';
import { DEFAULT_EQUIPMENT } from '../../../constants/DefaultEquipment.js';
import { SpellCaster } from '../SpellCaster';

/**
 * Weapon evaluation — internal representation used to compare weapons.
 */
interface WeaponEvaluation {
  name: string;
  expectedDamage: number;
  attackBonus: number;
  type: 'melee' | 'ranged';
  properties: string[];
}

/**
 * Spell evaluation — internal representation used to compare spells.
 */
interface SpellEvaluation {
  spell: Spell;
  expectedDamage: number;
  isHealing: boolean;
  isBuff: boolean;
  isControl: boolean;
  isAOE: boolean;
  isMultiTarget: boolean;
  isAllySpell: boolean;
  isSelfSpell: boolean;
  isBonusAction: boolean;
  requiresConcentration: boolean;
  slotLevel: number;
  isCantrip: boolean;
}

export class CombatAI {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * Get the effective play style for a combatant.
   * Per-combatant overrides take priority over side defaults.
   */
  getStyleForCombatant(combatant: Combatant): AIPlayStyle {
    if (this.config.overrides?.has(combatant.id)) {
      return this.config.overrides.get(combatant.id)!;
    }
    return combatant.id.startsWith('player')
      ? this.config.playerStyle
      : this.config.enemyStyle;
  }

  /**
   * Determine which side a combatant belongs to.
   */
  getSide(combatant: Combatant): 'player' | 'enemy' {
    return combatant.id.startsWith('player') ? 'player' : 'enemy';
  }

  /**
   * Get all living enemies of a given combatant.
   */
  getEnemies(combatant: Combatant, combat: CombatInstance): Combatant[] {
    const side = this.getSide(combatant);
    const prefix = side === 'player' ? 'enemy' : 'player';
    return combat.combatants.filter(
      c => c.id.startsWith(prefix) && !c.isDefeated
    );
  }

  /**
   * Get all living allies of a given combatant (including self).
   */
  getAllies(combatant: Combatant, combat: CombatInstance): Combatant[] {
    const side = this.getSide(combatant);
    const prefix = side === 'player' ? 'player' : 'enemy';
    return combat.combatants.filter(
      c => c.id.startsWith(prefix) && !c.isDefeated
    );
  }

  /**
   * Assess the current battlefield state from a combatant's perspective.
   *
   * Provides a snapshot of tactical conditions that drive style-dependent
   * decision-making. Called at the start of each turn.
   */
  assessThreat(combatant: Combatant, combat: CombatInstance): AIThreatAssessment {
    const maxHP = combatant.character.hp.max;
    const myHPPercent = maxHP > 0 ? combatant.currentHP / maxHP : 0;

    const allies = this.getAllies(combatant, combat);
    const enemies = this.getEnemies(combatant, combat);

    // Lowest ally HP percent (1.0 if no allies besides self)
    const lowestAllyHPPercent = allies.reduce((min, ally) => {
      if (ally.id === combatant.id) return min;
      const allyMaxHP = ally.character.hp.max;
      const allyPercent = allyMaxHP > 0 ? ally.currentHP / allyMaxHP : 0;
      return Math.min(min, allyPercent);
    }, 1.0);

    // Lowest enemy absolute HP
    const lowestEnemyHP = enemies.reduce(
      (min, enemy) => Math.min(min, enemy.currentHP),
      enemies.length > 0 ? Infinity : 0
    );

    // Estimate highest enemy DPR (rough estimate from weapon damage dice)
    const highestEnemyDamage = enemies.reduce((max, enemy) => {
      const weapons = enemy.character.equipment?.weapons.filter(w => w.equipped) || [];
      let bestDamage = 5; // minimum expected damage (unarmed)
      for (const weapon of weapons) {
        const weaponData = DEFAULT_EQUIPMENT[weapon.name];
        const dice = weapon.damage?.dice || weaponData?.damage?.dice || '1d6';
        const avg = this.averageDamageFromFormula(dice);
        if (avg > bestDamage) bestDamage = avg;
      }
      return Math.max(max, bestDamage);
    }, 0);

    // Check for healing items in inventory (tagged as 'healing' or 'consumable')
    // Items without combat functionality should never be considered for use.
    const items = combatant.character.equipment?.items || [];
    const hasHealingItems = items.some(
      item => item.quantity > 0 && !item.equipped &&
        item.tags?.some(tag => tag === 'healing' || tag === 'consumable')
    );

    // Check for remaining spell slots
    const slots = combatant.spellSlots;
    const hasSpellSlots = slots !== undefined &&
      Object.values(slots).some(count => count > 0);

    // Check for remaining limited-use abilities
    const hasLegendaryActions = (combatant.legendaryActionsRemaining ?? 0) > 0;
    const hasLegendaryResistances = (combatant.legendaryResistancesRemaining ?? 0) > 0;
    const hasRemainingLimitedAbilities = hasLegendaryActions || hasLegendaryResistances;

    return {
      myHPPercent,
      myAC: combatant.character.armor_class,
      lowestAllyHPPercent,
      lowestEnemyHP,
      highestEnemyDamage,
      partySize: allies.length,
      enemyCount: enemies.length,
      roundNumber: combat.roundNumber,
      isLowHP: myHPPercent < 0.25,
      isCriticalHP: myHPPercent < 0.10,
      hasHealingItems,
      hasSpellSlots,
      hasRemainingLimitedAbilities,
    };
  }

  /**
   * Main decision entry point.
   *
   * Evaluates the battlefield, selects the best action based on play style,
   * and returns an `AIDecision` for the AICombatRunner to execute.
   */
  decide(combatant: Combatant, combat: CombatInstance): AIDecision {
    const style = this.getStyleForCombatant(combatant);
    const threat = this.assessThreat(combatant, combat);
    const enemies = this.getEnemies(combatant, combat);

    // No valid targets — skip turn (shouldn't happen if combat is active)
    if (enemies.length === 0) {
      return { action: 'skip', reasoning: 'No valid targets remaining' };
    }

    // Consider spell casting first (spells can be more impactful than attacks)
    const spellDecision = this.selectSpellAction(combatant, combat, threat, style);
    if (spellDecision) return spellDecision;

    // Consider item usage
    const itemDecision = this.selectItemAction(combatant, threat, style);
    if (itemDecision) return itemDecision;

    // Consider dodge/flee
    const defensiveDecision = this.selectDefensiveAction(combatant, combat, threat, style);
    if (defensiveDecision) return defensiveDecision;

    // Default: weapon attack
    return this.selectAttackAction(combatant, combat, threat, style);
  }

  // ─── Spell Selection ───────────────────────────────────────────────────────

  /**
   * Decide whether to cast a spell and which one.
   * Returns null if no spell is worth casting.
   */
  private selectSpellAction(
    combatant: Combatant,
    combat: CombatInstance,
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): AIDecision | null {
    const spells = this.getAvailableSpells(combatant);
    if (spells.length === 0) return null;

    // Evaluate each spell
    const evaluations = spells.map(s => this.evaluateSpell(s, combatant, combat, threat));

    // Separate by category
    const damageSpells = evaluations.filter(e => e.expectedDamage > 0 && !e.isHealing);
    const healingSpells = evaluations.filter(e => e.isHealing);
    const controlSpells = evaluations.filter(e => e.isControl && !e.isHealing);
    const buffSpells = evaluations.filter(e => e.isBuff && !e.isHealing);

    // Check if we should heal
    if (healingSpells.length > 0 && this.shouldHeal(combatant, threat, style)) {
      const spell = this.pickHealingSpell(healingSpells, combatant, combat, threat, style);
      if (spell) {
        const target = this.pickHealingTarget(combatant, combat, style);
        return {
          action: 'castSpell',
          spellName: spell.spell.name,
          target: target?.id,
          targetIds: spell.isMultiTarget ? this.getHealingTargets(combatant, combat, style).map(t => t.id) : undefined,
          reasoning: `Cast ${spell.spell.name} to heal ${target?.character.name ?? 'self'} (${style} style)`,
        };
      }
    }

    // Check if we should cast a damage spell
    if (damageSpells.length > 0 && this.shouldCastDamageSpell(damageSpells, threat, style)) {
      const spell = this.pickDamageSpell(damageSpells, threat, style);
      const targets = this.pickSpellTargets(spell, combatant, combat, style);
      if (targets.length > 0) {
        return {
          action: 'castSpell',
          spellName: spell.spell.name,
          target: targets.length === 1 ? targets[0].id : undefined,
          targetIds: targets.length > 1 ? targets.map(t => t.id) : undefined,
          reasoning: `Cast ${spell.spell.name} on ${targets.map(t => t.character.name).join(', ')} (${style} style, ~${spell.expectedDamage.toFixed(1)} expected damage)`,
        };
      }
    }

    // Check if we should cast a control spell (normal style only, and only when tactically useful)
    if (controlSpells.length > 0 && style === 'normal' && this.shouldCastControlSpell(threat)) {
      const spell = controlSpells[0]; // Pick the first control spell
      const targets = this.pickSpellTargets(spell, combatant, combat, style);
      if (targets.length > 0) {
        return {
          action: 'castSpell',
          spellName: spell.spell.name,
          target: targets[0].id,
          reasoning: `Cast ${spell.spell.name} for crowd control (${style} style)`,
        };
      }
    }

    // Buff spells — normal style buffs when health is good, aggressive never wastes turns buffing
    if (buffSpells.length > 0 && style === 'normal' && !threat.isLowHP && !threat.isCriticalHP) {
      const spell = buffSpells[0];
      const target = this.pickBuffTarget(combatant, combat);
      return {
        action: 'castSpell',
        spellName: spell.spell.name,
        target: target?.id,
        reasoning: `Cast ${spell.spell.name} on ${target?.character.name ?? 'self'} (buff, normal style)`,
      };
    }

    return null;
  }

  /**
   * Get all spells available to a combatant (cantrips + slotted spells).
   */
  getAvailableSpells(combatant: Combatant): Spell[] {
    const combatSpells = combatant.character.combat_spells;
    if (!combatSpells || combatSpells.length === 0) return [];

    return combatSpells.filter(spell => {
      // Cantrips are always available
      if (!spell.level || spell.level === 0) return true;

      // Leveled spells require available slots
      const slots = combatant.spellSlots;
      if (!slots) return false;

      // Check if there's a slot available at this spell's level or higher
      return this.hasSlotForLevel(slots, spell.level);
    });
  }

  /**
   * Check if spell slots are available for a given spell level.
   */
  private hasSlotForLevel(
    slots: { [level: number]: number },
    spellLevel: number,
  ): boolean {
    // Exact level slot
    if ((slots[spellLevel] ?? 0) > 0) return true;

    // Can upcast to a higher slot if one exists
    for (let level = spellLevel + 1; level <= 9; level++) {
      if ((slots[level] ?? 0) > 0) return true;
    }

    return false;
  }

  /**
   * Evaluate a spell for decision-making.
   */
  private evaluateSpell(
    spell: Spell,
    combatant: Combatant,
    combat: CombatInstance,
    threat: AIThreatAssessment,
  ): SpellEvaluation {
    const isCantrip = !spell.level || spell.level === 0;
    const slotLevel = isCantrip ? 0 : this.getBestAvailableSlot(combatant.spellSlots, spell.level ?? 0);

    // Estimate expected damage from damage dice
    const damageFormula = spell.damage_dice || spell.damage;
    let expectedDamage = damageFormula ? this.averageDamageFromFormula(damageFormula) : 0;

    // AoE and multi-target spells get a multiplier for their expected total damage
    const isAOE = SpellCaster.isAOESpell(spell);
    const isMultiTarget = SpellCaster.isMultiTargetSpell(spell);
    const isHealing = SpellCaster.isAllySpell(spell) || SpellCaster.isSelfSpell(spell) ||
      spell.tags?.includes('healing');
    const isBuff = SpellCaster.hasSpellTag(spell, 'buff');
    const isControl = SpellCaster.hasSpellTag(spell, 'control') || SpellCaster.hasSpellTag(spell, 'debuff');

    if ((isAOE || isMultiTarget) && expectedDamage > 0) {
      // Multiply by expected number of targets
      const enemyCount = threat.enemyCount;
      if (enemyCount > 1) {
        expectedDamage *= Math.min(enemyCount, 4); // Cap at 4 targets for estimate
      }
    }

    // Leveled spells get a bonus over cantrips (they cost a resource)
    if (!isCantrip && expectedDamage > 0) {
      expectedDamage *= 1.5; // Leveled spells are generally more efficient
    }

    return {
      spell,
      expectedDamage,
      isHealing: !!isHealing,
      isBuff: !!isBuff,
      isControl: !!isControl,
      isAOE,
      isMultiTarget,
      isAllySpell: SpellCaster.isAllySpell(spell),
      isSelfSpell: SpellCaster.isSelfSpell(spell),
      isBonusAction: SpellCaster.isBonusActionSpell(spell),
      requiresConcentration: SpellCaster.requiresConcentration(spell),
      slotLevel,
      isCantrip,
    };
  }

  /**
   * Get the best available spell slot level for a spell.
   */
  private getBestAvailableSlot(
    slots: { [level: number]: number } | undefined,
    minLevel: number,
  ): number {
    if (!slots) return 0;

    // Use the exact level if available
    if ((slots[minLevel] ?? 0) > 0) return minLevel;

    // Use the lowest higher-level slot (conservative upcast)
    for (let level = minLevel + 1; level <= 9; level++) {
      if ((slots[level] ?? 0) > 0) return level;
    }

    return 0;
  }

  // ─── Healing Logic ──────────────────────────────────────────────────────────

  /**
   * Decide whether the AI should heal this turn.
   */
  private shouldHeal(combatant: Combatant, threat: AIThreatAssessment, style: AIPlayStyle): boolean {
    if (style === 'aggressive') {
      // Aggressive: heal proactively to maintain max HP for max damage output
      // Heal if below 75% HP and healing is available
      return threat.myHPPercent < 0.75;
    }
    // Normal: heal when clearly needed
    return threat.isLowHP || threat.isCriticalHP;
  }

  /**
   * Pick the best healing spell from available options.
   */
  private pickHealingSpell(
    healingSpells: SpellEvaluation[],
    combatant: Combatant,
    combat: CombatInstance,
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): SpellEvaluation | null {
    if (healingSpells.length === 0) return null;

    // Sort by expected healing (damage value represents healing for healing spells)
    const sorted = [...healingSpells].sort((a, b) => b.expectedDamage - a.expectedDamage);

    // Aggressive: always pick the strongest heal
    if (style === 'aggressive') return sorted[0];

    // Normal: prefer cantrips if HP isn't critical (save spell slots)
    if (!threat.isCriticalHP) {
      const cantrip = sorted.find(s => s.isCantrip);
      if (cantrip) return cantrip;
    }

    return sorted[0];
  }

  /**
   * Pick the best target for a healing spell.
   */
  private pickHealingTarget(
    combatant: Combatant,
    combat: CombatInstance,
    style: AIPlayStyle,
  ): Combatant | null {
    const allies = this.getAllies(combatant, combat);
    if (allies.length === 0) return null;

    // Find the ally with the lowest HP percent (most in need)
    const sorted = [...allies].sort((a, b) => {
      const aPercent = a.currentHP / a.character.hp.max;
      const bPercent = b.currentHP / b.character.hp.max;
      return aPercent - bPercent;
    });

    // Normal: only heal an ally if they're below 50%
    if (style === 'normal' && sorted[0].id !== combatant.id) {
      const allyPercent = sorted[0].currentHP / sorted[0].character.hp.max;
      if (allyPercent < 0.50) return sorted[0];
      return combatant; // Heal self if allies are fine
    }

    return sorted[0];
  }

  /**
   * Get all allies that would benefit from a healing spell.
   */
  private getHealingTargets(combatant: Combatant, combat: CombatInstance, style: AIPlayStyle): Combatant[] {
    const allies = this.getAllies(combatant, combat);
    const threshold = style === 'aggressive' ? 1.0 : 0.75; // Aggressive heals everyone, normal only below 75%

    return allies.filter(ally => {
      const percent = ally.currentHP / ally.character.hp.max;
      return percent < threshold;
    });
  }

  // ─── Damage Spell Logic ────────────────────────────────────────────────────

  /**
   * Decide whether to cast a damage spell instead of attacking.
   */
  private shouldCastDamageSpell(
    damageSpells: SpellEvaluation[],
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): boolean {
    if (damageSpells.length === 0) return false;

    if (style === 'aggressive') {
      // Aggressive: always cast the highest damage spell available
      return true;
    }

    // Normal: cast damage spells when there's a clear advantage
    // - AoE with 3+ enemies
    // - High-level spell that significantly outperforms basic attack
    const bestSpell = damageSpells[0];
    const hasAOE = damageSpells.some(s => s.isAOE || s.isMultiTarget);

    if (hasAOE && threat.enemyCount >= 3) return true;

    // Cantrips are fine to cast anytime (no resource cost)
    if (bestSpell.isCantrip) return true;

    // Leveled spells: only if expected damage is notably higher than basic attack (~10 damage)
    // Normal style conserves resources
    if (bestSpell.expectedDamage > 15 && !bestSpell.isCantrip) return true;

    return false;
  }

  /**
   * Pick the best damage spell.
   */
  private pickDamageSpell(
    damageSpells: SpellEvaluation[],
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): SpellEvaluation {
    const sorted = [...damageSpells].sort((a, b) => b.expectedDamage - a.expectedDamage);

    if (style === 'aggressive') {
      // Aggressive: always pick the highest damage spell (burn resources)
      return sorted[0];
    }

    // Normal: prefer cantrips to conserve spell slots
    // Only use leveled spells if they significantly outdamage cantrips
    const cantrips = sorted.filter(s => s.isCantrip);
    const leveled = sorted.filter(s => !s.isCantrip);

    if (cantrips.length > 0) {
      const bestCantrip = cantrips[0];

      // Use a leveled spell only if it does at least 50% more damage
      if (leveled.length > 0 && leveled[0].expectedDamage > bestCantrip.expectedDamage * 1.5) {
        // But not if it's round 1 and we have few spell slots (save for later)
        if (threat.roundNumber > 1 || this.totalSlotsRemaining(threat) > 3) {
          return leveled[0];
        }
      }

      return bestCantrip;
    }

    return sorted[0];
  }

  /**
   * Calculate total remaining spell slots across all levels.
   */
  private totalSlotsRemaining(threat: AIThreatAssessment): number {
    // This is an approximation — the actual slot count comes from combatant.spellSlots
    // but we only have the threat assessment here
    return threat.hasSpellSlots ? 5 : 0; // Rough estimate
  }

  /**
   * Pick targets for a spell.
   */
  private pickSpellTargets(
    spellEval: SpellEvaluation,
    combatant: Combatant,
    combat: CombatInstance,
    style: AIPlayStyle,
  ): Combatant[] {
    const enemies = this.getEnemies(combatant, combat);
    const allies = this.getAllies(combatant, combat);

    // Ally spells target allies
    if (spellEval.isAllySpell || spellEval.isHealing) {
      return allies.length > 0 ? [this.pickHealingTarget(combatant, combat, style) ?? allies[0]] : [];
    }

    // Self spells target self
    if (spellEval.isSelfSpell) {
      return [combatant];
    }

    // Multi-target and AoE spells target all enemies
    if (spellEval.isMultiTarget || spellEval.isAOE) {
      return enemies;
    }

    // Single-target damage spell
    return [this.selectTarget(enemies, style)];
  }

  // ─── Control Spell Logic ───────────────────────────────────────────────────

  /**
   * Decide whether to cast a control spell.
   */
  private shouldCastControlSpell(threat: AIThreatAssessment): boolean {
    // Normal style uses control when there are multiple enemies
    return threat.enemyCount >= 2;
  }

  // ─── Buff Spell Logic ──────────────────────────────────────────────────────

  /**
   * Pick the best target for a buff spell.
   */
  private pickBuffTarget(combatant: Combatant, combat: CombatInstance): Combatant {
    const allies = this.getAllies(combatant, combat);
    // Buff the ally who can deal the most damage (approximate: highest STR or DEX)
    return allies.reduce((best, ally) => {
      const bestStat = Math.max(best.character.ability_scores.STR, best.character.ability_scores.DEX);
      const allyStat = Math.max(ally.character.ability_scores.STR, ally.character.ability_scores.DEX);
      return allyStat > bestStat ? ally : best;
    });
  }

  // ─── Item Usage ────────────────────────────────────────────────────────────

  /**
   * Decide whether to use an item this turn.
   * Returns null if no item usage is warranted.
   */
  private selectItemAction(
    combatant: Combatant,
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): AIDecision | null {
    if (!threat.hasHealingItems) return null;

    const items = combatant.character.equipment?.items || [];
    const healingItems = items.filter(item => item.quantity > 0 && !item.equipped);
    if (healingItems.length === 0) return null;

    // Only use items when healing is needed
    if (style === 'aggressive') {
      // Aggressive: use healing items to stay at high HP
      if (threat.myHPPercent < 0.75 && !threat.hasSpellSlots) {
        return {
          action: 'useItem',
          itemName: healingItems[0].name,
          target: combatant.id,
          reasoning: `Use ${healingItems[0].name} to heal (aggressive: maintain HP for damage output)`,
        };
      }
    } else {
      // Normal: use items when low HP and no spell slots for healing
      if (threat.isLowHP && !threat.hasSpellSlots) {
        return {
          action: 'useItem',
          itemName: healingItems[0].name,
          target: combatant.id,
          reasoning: `Use ${healingItems[0].name} to heal (no spell slots available)`,
        };
      }
    }

    return null;
  }

  // ─── Defensive Actions ─────────────────────────────────────────────────────

  /**
   * Decide whether to take a defensive action (dodge/flee).
   * Returns null if an offensive action is better.
   */
  private selectDefensiveAction(
    combatant: Combatant,
    combat: CombatInstance,
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): AIDecision | null {
    // Aggressive never dodges or flees
    if (style === 'aggressive') return null;

    // Normal: consider dodge when isolated and low HP
    if (threat.isLowHP && threat.partySize <= 1 && threat.enemyCount > 1) {
      return {
        action: 'dodge',
        reasoning: 'Dodge — isolated and low HP, improving survivability',
      };
    }

    return null;
  }

  // ─── Attack Selection ──────────────────────────────────────────────────────

  /**
   * Select a weapon attack action.
   */
  private selectAttackAction(
    combatant: Combatant,
    combat: CombatInstance,
    threat: AIThreatAssessment,
    style: AIPlayStyle,
  ): AIDecision {
    const enemies = this.getEnemies(combatant, combat);
    const target = this.selectTarget(enemies, style);
    const weapon = this.selectWeapon(combatant, style);

    return {
      action: 'attack',
      target: target.id,
      weaponName: weapon.name,
      reasoning: `Attack ${target.character.name} with ${weapon.name} (${style} style, expected ~${weapon.expectedDamage.toFixed(1)} damage)`,
    };
  }

  // ─── Target Selection ──────────────────────────────────────────────────────

  /**
   * Select the best target from available enemies.
   *
   * **Normal**: target the enemy with the lowest AC (balanced — easiest to hit).
   * **Aggressive**: target the enemy with the lowest HP (finish them off for action economy).
   */
  selectTarget(enemies: Combatant[], style: AIPlayStyle): Combatant {
    if (enemies.length === 0) {
      throw new Error('No valid targets to select from');
    }

    if (enemies.length === 1) return enemies[0];

    if (style === 'aggressive') {
      // Target lowest HP enemy (finish them off)
      return enemies.reduce((weakest, enemy) =>
        enemy.currentHP < weakest.currentHP ? enemy : weakest
      );
    }

    // Normal: target lowest AC (easiest to hit)
    return enemies.reduce((easiest, enemy) =>
      enemy.character.armor_class < easiest.character.armor_class ? enemy : easiest
    );
  }

  // ─── Weapon Selection ──────────────────────────────────────────────────────

  /**
   * Select the best weapon to attack with.
   *
   * Evaluates all equipped weapons + unarmed strike.
   * **Normal**: balanced (highest expected damage with reasonable hit chance).
   * **Aggressive**: highest expected damage regardless of hit chance.
   */
  selectWeapon(combatant: Combatant, style: AIPlayStyle): WeaponEvaluation {
    const evaluations = this.evaluateWeapons(combatant);

    if (evaluations.length === 0) {
      return { name: 'Unarmed Strike', expectedDamage: 1, attackBonus: 0, type: 'melee', properties: [] };
    }

    if (evaluations.length === 1) return evaluations[0];

    if (style === 'aggressive') {
      // Aggressive: pick highest raw expected damage
      return evaluations.reduce((best, weapon) =>
        weapon.expectedDamage > best.expectedDamage ? weapon : best
      );
    }

    // Normal: balanced — prefer weapons with good damage AND attack bonus
    // Score = expected damage * hit probability
    // For simplicity, weight expected damage with a small bonus for attack bonus
    return evaluations.reduce((best, weapon) => {
      const bestScore = best.expectedDamage + best.attackBonus * 0.1;
      const weaponScore = weapon.expectedDamage + weapon.attackBonus * 0.1;
      return weaponScore > bestScore ? weapon : best;
    });
  }

  /**
   * Evaluate all available weapons for a combatant.
   */
  private evaluateWeapons(combatant: Combatant): WeaponEvaluation[] {
    const evaluations: WeaponEvaluation[] = [];
    const equippedWeapons = combatant.character.equipment?.weapons.filter(w => w.equipped) || [];

    for (const weapon of equippedWeapons) {
      const weaponData = DEFAULT_EQUIPMENT[weapon.name];
      const dice = weapon.damage?.dice || weaponData?.damage?.dice || '1d6';
      const expectedDamage = this.averageDamageFromFormula(dice);
      const isRanged = weapon.weaponProperties?.includes('ranged') || weaponData?.weaponProperties?.includes('ranged') || false;

      // Estimate attack bonus from character stats
      const ability = isRanged ? 'DEX' : 'STR';
      const abilityMod = Math.floor((combatant.character.ability_scores[ability] - 10) / 2);
      const attackBonus = abilityMod + combatant.character.proficiency_bonus;

      evaluations.push({
        name: weapon.name,
        expectedDamage,
        attackBonus,
        type: isRanged ? 'ranged' : 'melee',
        properties: weapon.weaponProperties || weaponData?.weaponProperties || [],
      });
    }

    // Always add unarmed strike as a fallback
    const strMod = Math.floor((combatant.character.ability_scores.STR - 10) / 2);
    evaluations.push({
      name: 'Unarmed Strike',
      expectedDamage: 1 + Math.max(0, strMod),
      attackBonus: strMod + combatant.character.proficiency_bonus,
      type: 'melee',
      properties: [],
    });

    return evaluations;
  }

  // ─── Legendary Action AI ───────────────────────────────────────────────────

  /**
   * Select a legendary action for a boss combatant.
   *
   * Called by AICombatRunner between other combatants' turns.
   * **Normal**: spread actions across the round, prefer damage actions.
   * **Aggressive**: use highest-cost damage actions immediately.
   *
   * @param boss - The boss combatant with legendary actions
   * @param combat - The combat instance
   * @returns An AIDecision with action='legendaryAction', or null if no action should be taken
   */
  selectLegendaryAction(
    boss: Combatant,
    combat: CombatInstance,
  ): AIDecision | null {
    const config = boss.character.legendary_config;
    if (!config) return null;

    const pointsRemaining = boss.legendaryActionsRemaining ?? 0;
    if (pointsRemaining <= 0) return null;

    const style = this.getStyleForCombatant(boss);
    const availableActions = config.actions.filter(a => a.cost <= pointsRemaining);
    if (availableActions.length === 0) return null;

    const enemies = this.getEnemies(boss, combat);
    if (enemies.length === 0) return null;

    // Separate actions by type
    const damageActions = availableActions.filter(a => a.damage || a.tags?.includes('damage'));
    const healingActions = availableActions.filter(a => a.tags?.includes('heal'));
    const controlActions = availableActions.filter(a => a.tags?.includes('control'));

    const threat = this.assessThreat(boss, combat);

    // Aggressive: always use the highest-cost damage action available
    if (style === 'aggressive') {
      if (damageActions.length > 0) {
        // Sort by cost descending (spend points aggressively)
        const sorted = [...damageActions].sort((a, b) => b.cost - a.cost);
        const action = sorted[0];
        const target = this.selectTarget(enemies, style);
        return {
          action: 'legendaryAction',
          legendaryActionId: action.id,
          target: target.id,
          reasoning: `Legendary action: ${action.name} (cost: ${action.cost}, aggressive: max damage)`,
        };
      }
    }

    // Normal: use damage actions but be more conservative with points
    if (damageActions.length > 0) {
      // Prefer lower-cost actions to spread across the round
      const sorted = [...damageActions].sort((a, b) => a.cost - b.cost);
      const action = sorted[0];
      const target = this.selectTarget(enemies, style);
      return {
        action: 'legendaryAction',
        legendaryActionId: action.id,
        target: target.id,
        reasoning: `Legendary action: ${action.name} (cost: ${action.cost}, normal: conserve points)`,
      };
    }

    // Healing actions for boss when low HP
    if (healingActions.length > 0 && threat.isLowHP) {
      return {
        action: 'legendaryAction',
        legendaryActionId: healingActions[0].id,
        reasoning: `Legendary action: ${healingActions[0].name} (healing, low HP)`,
      };
    }

    // Control actions
    if (controlActions.length > 0) {
      const target = this.selectTarget(enemies, style);
      return {
        action: 'legendaryAction',
        legendaryActionId: controlActions[0].id,
        target: target.id,
        reasoning: `Legendary action: ${controlActions[0].name} (control)`,
      };
    }

    // Fallback: use any available action
    const target = this.selectTarget(enemies, style);
    return {
      action: 'legendaryAction',
      legendaryActionId: availableActions[0].id,
      target: target.id,
      reasoning: `Legendary action: ${availableActions[0].name} (fallback)`,
    };
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  /**
   * Calculate the average (expected) damage from a dice formula string.
   *
   * Handles simple formulas like "2d6", "2d6+5", "1d8+3", "3d10".
   * Returns the mathematical expectation.
   */
  averageDamageFromFormula(formula: string): number {
    if (!formula) return 0;

    // Strip spaces
    const clean = formula.replace(/\s/g, '');

    // Match pattern: NdS or NdS+M or NdS-M
    const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) return 0;

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    // Average of a single die = (sides + 1) / 2
    const avgDie = (sides + 1) / 2;
    return count * avgDie + modifier;
  }

  /**
   * Check if a combatant is a support archetype (healer/buffer).
   */
  isSupportArchetype(combatant: Combatant): boolean {
    const combatSpells = combatant.character.combat_spells;
    if (!combatSpells || combatSpells.length === 0) return false;

    const hasHealing = combatSpells.some(s =>
      SpellCaster.isAllySpell(s) || s.tags?.includes('healing')
    );
    const hasBuff = combatSpells.some(s => SpellCaster.hasSpellTag(s, 'buff'));

    return hasHealing || hasBuff;
  }
}
