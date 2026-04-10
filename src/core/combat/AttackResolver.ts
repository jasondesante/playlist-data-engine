/**
 * AttackResolver - Handles melee and ranged attack resolution
 * D&D 5e: d20 + attack bonus vs target AC
 * Critical hits (natural 20) double damage dice
 * Critical misses (natural 1) always miss
 */

import type { Combatant, AttackRoll, DamageRoll, DiceRollerAPI, HitMode } from '../types/Combat';
import type { Attack, CharacterSheet } from '../types/Character';
import { DiceRoller } from './DiceRoller';

/**
 * Result of a complete attack action
 */
export interface AttackResult {
  attacker: Combatant;
  target: Combatant;
  attack: Attack;
  attackRoll: AttackRoll;
  damageRoll?: DamageRoll;
  hpAfterDamage?: number;
  description: string;
}

/**
 * Result of simulating multiple attack rolls
 */
export interface AttackSimulationResult {
  iterations: number;
  totalHits: number;
  totalMisses: number;
  totalCrits: number;
  hitRate: number;
  critRate: number;
  missRate: number;
  averageDamage: number;
  maxDamage: number;
  /** Sorted array of { damage, count, percentage } from 0 (misses) upward */
  distribution: Array<{ damage: number; count: number; percentage: number }>;
}

/**
 * AttackResolver - D&D 5e attack and damage calculation
 */
export class AttackResolver {
  private diceRoller?: DiceRollerAPI;
  private hitMode: HitMode;

  constructor(diceRoller?: DiceRollerAPI, hitMode: HitMode = 'scaled') {
    this.diceRoller = diceRoller;
    this.hitMode = hitMode;
  }

  /**
   * Resolve an attack action
   * 1. Roll d20 + attack bonus
   * 2. Compare to target AC
   * 3. If hit, roll damage
   */
  resolveAttack(attacker: Combatant, target: Combatant, attack: Attack): AttackResult {
    const attackRoll = this.rollAttack(attacker, target, attack);

    let damageRoll: DamageRoll | undefined;
    let hpAfterDamage: number | undefined;
    let description = '';

    if (attackRoll.isMiss) {
      description = `${attacker.character.name} uses ${attack.name} against ${target.character.name} - CRITICAL MISS (natural 1)!`;
    } else if (!attackRoll.hit) {
      description = `${attacker.character.name} uses ${attack.name} against ${target.character.name} - Miss (rolled ${attackRoll.d20Roll}, needed ${attackRoll.targetAC})`;
    } else {
      // Attack hit - roll damage
      damageRoll = this.rollDamage(attacker, attack, attackRoll.isCritical);

      // Apply damage scaling (scaled hit mode)
      if (attackRoll.damageScale !== undefined && attackRoll.damageScale < 1) {
        const scaledTotal = Math.max(1, Math.floor(damageRoll.total * attackRoll.damageScale));
        damageRoll = { ...damageRoll, total: scaledTotal };
      }

      // Apply damage
      hpAfterDamage = target.currentHP - damageRoll.total;

      // Cannot go below 0 HP (for combat purposes)
      if (hpAfterDamage < 0) {
        hpAfterDamage = 0;
        target.currentHP = 0;
        target.isDefeated = true;
      } else {
        target.currentHP = hpAfterDamage;
      }

      if (attackRoll.isCritical) {
        description = `${attacker.character.name} uses ${attack.name} against ${target.character.name} - CRITICAL HIT! (natural 20, doubled damage: ${damageRoll.total})`;
      } else {
        description = `${attacker.character.name} uses ${attack.name} against ${target.character.name} - Hit! (rolled ${attackRoll.d20Roll}, damage: ${damageRoll.total})`;
      }
    }

    return {
      attacker,
      target,
      attack,
      attackRoll,
      damageRoll,
      hpAfterDamage,
      description
    };
  }

  /**
   * Roll an attack (d20 + attack bonus vs AC)
   * Attack bonus = ability modifier + proficiency bonus (if proficient)
   *
   * Hit modes:
   * - 'dnd': Classic — totalRoll >= AC to hit. Nat 1 miss, nat 20 crit.
   * - 'scaled': AC reduces damage. Only nat 1 misses, nat 20 crits.
   *   Each point below AC reduces damage by 5% (min 1 damage).
   */
  private rollAttack(_attacker: Combatant, target: Combatant, attack: Attack): AttackRoll {
    const d20Roll = this.diceRoller
      ? this.diceRoller.rollD20()
      : DiceRoller.rollD20();
    const attackBonus = attack.attack_bonus ?? 0;
    const totalRoll = d20Roll + attackBonus;
    const targetAC = target.character.armor_class;

    const isCritical = this.diceRoller
      ? this.diceRoller.isCriticalHit(d20Roll)
      : DiceRoller.isCriticalHit(d20Roll);
    const isMiss = this.diceRoller
      ? this.diceRoller.isCriticalMiss(d20Roll)
      : DiceRoller.isCriticalMiss(d20Roll);

    let hit: boolean;
    let damageScale: number | undefined;

    if (this.hitMode === 'scaled') {
      // Scaled mode: only nat 1 misses, nat 20 crits, everything else hits
      // with damage scaled by how far below AC the roll fell
      hit = !isMiss;
      if (!isMiss && !isCritical && totalRoll < targetAC) {
        const deficit = targetAC - totalRoll;
        damageScale = Math.max(0.05, 1 - deficit * 0.05);
      } else {
        damageScale = 1.0;
      }
    } else {
      // Classic D&D: totalRoll >= AC to hit
      hit = !isMiss && (isCritical || totalRoll >= targetAC);
    }

    return {
      d20Roll,
      attackBonus,
      totalRoll,
      targetAC,
      hit,
      isCritical,
      isMiss,
      damageScale
    };
  }

  /**
   * Extract ability modifier for damage based on attack type
   * Melee attacks → STR modifier
   * Ranged attacks → DEX modifier
   * Finesse weapons → max(STR, DEX)
   * Spells → typically no modifier (added to spell DC, not damage dice)
   */
  private getDamageModifier(attacker: Combatant, attack: Attack): number {
    const attackType = attack.type ?? 'melee';
    const abilityMods = attacker.character.ability_modifiers;

    if (attackType === 'ranged') {
      return abilityMods.DEX ?? 0;
    }

    if (attackType === 'spell') {
      // Spells typically don't add ability modifier to damage dice
      // The modifier is usually accounted for in the spell's damage formula
      return 0;
    }

    // Melee attacks - check for finesse property
    const properties = attack.properties ?? [];
    if (properties.includes('finesse')) {
      // Finesse weapons use the better of STR or DEX
      const strMod = abilityMods.STR ?? 0;
      const dexMod = abilityMods.DEX ?? 0;
      return Math.max(strMod, dexMod);
    }

    // Default to STR for non-finesse melee attacks
    return abilityMods.STR ?? 0;
  }

  /**
   * Roll damage for an attack
   * If critical hit, double the damage dice (not the modifier)
   */
  private rollDamage(attacker: Combatant, attack: Attack, isCritical: boolean): DamageRoll {
    // Parse attack damage formula (e.g., "1d8", "2d6+3")
    const abilityModifier = this.getDamageModifier(attacker, attack);
    const damageDice = attack.damage_dice ?? '';

    const damageResult = this.diceRoller
      ? this.diceRoller.calculateDamage(damageDice, abilityModifier, isCritical)
      : DiceRoller.calculateDamage(damageDice, abilityModifier, isCritical);

    return {
      diceFormula: damageDice,
      rolls: damageResult.rolls,
      modifier: damageResult.modifier ?? 0,
      total: damageResult.total,
      isCritical: damageResult.isCritical
    };
  }

  /**
   * Check if an attack is within range
   * Melee attacks: must be adjacent (5 ft)
   * Ranged attacks: must be within attack range
   */
  isInRange(attacker: Combatant, target: Combatant, attack: Attack): boolean {
    // If tactical mode not enabled, assume all attacks are in range
    if (!attacker.position || !target.position) {
      return true;
    }

    const distance = Math.sqrt(
      Math.pow(attacker.position.x - target.position.x, 2) +
      Math.pow(attacker.position.y - target.position.y, 2)
    );

    // Melee attacks: 5 feet
    if (!attack.range) {
      return distance <= 5;
    }

    // Ranged attacks: within specified range
    return distance <= attack.range;
  }

  /**
   * Calculate attack bonus for a character
   * Ability modifier + proficiency bonus (if proficient with weapon)
   */
  calculateAttackBonus(character: CharacterSheet, _attackName: string, abilityModifier: number, isProficient: boolean = false): number {
    let bonus = abilityModifier;

    if (isProficient) {
      bonus += character.proficiency_bonus;
    }

    return bonus;
  }

  /**
   * Check if attack hits with advantage or disadvantage
   * D&D 5e rules: With advantage, critical if EITHER die is a 20
   */
  attackWithAdvantage(attacker: Combatant, target: Combatant, attack: Attack): AttackResult {
    // Roll twice, take higher using DiceRoller
    const advantageRoll = this.diceRoller
      ? this.diceRoller.rollWithAdvantage()
      : DiceRoller.rollWithAdvantage();
    const roll1 = advantageRoll.roll1;
    const roll2 = advantageRoll.roll2;
    const d20Roll = advantageRoll.result;

    const attackBonus = attack.attack_bonus ?? 0;
    const totalRoll = d20Roll + attackBonus;
    const targetAC = target.character.armor_class;

    // D&D 5e Sage Advice: With advantage, if either die is a 20, it's a critical hit
    // Only check for fumble on the selected roll with advantage
    const isCritical = (this.diceRoller
      ? this.diceRoller.isCriticalHit(roll1)
      : DiceRoller.isCriticalHit(roll1)) || (this.diceRoller
      ? this.diceRoller.isCriticalHit(roll2)
      : DiceRoller.isCriticalHit(roll2));
    const isMiss = this.diceRoller
      ? this.diceRoller.isCriticalMiss(d20Roll)
      : DiceRoller.isCriticalMiss(d20Roll);

    let hit: boolean;
    let damageScale: number | undefined;
    if (this.hitMode === 'scaled') {
      hit = !isMiss;
      if (!isMiss && !isCritical && totalRoll < targetAC) {
        const deficit = targetAC - totalRoll;
        damageScale = Math.max(0.05, 1 - deficit * 0.05);
      } else {
        damageScale = 1.0;
      }
    } else {
      hit = !isMiss && (isCritical || totalRoll >= targetAC);
    }

    const description = `${attacker.character.name} attacks with advantage (rolled ${roll1} and ${roll2}, using ${d20Roll})`;

    // Construct result (same as normal attack if hit)
    if (hit && !isMiss) {
      let damageRoll = this.rollDamage(attacker, attack, isCritical);
      if (damageScale !== undefined && damageScale < 1) {
        const scaledTotal = Math.max(1, Math.floor(damageRoll.total * damageScale));
        damageRoll = { ...damageRoll, total: scaledTotal };
      }
      const hpAfterDamage = target.currentHP - damageRoll.total;

      if (hpAfterDamage < 0) {
        target.currentHP = 0;
        target.isDefeated = true;
      } else {
        target.currentHP = hpAfterDamage;
      }

      return {
        attacker,
        target,
        attack,
        attackRoll: {
          d20Roll,
          attackBonus,
          totalRoll,
          targetAC,
          hit,
          isCritical,
          isMiss,
          damageScale
        },
        damageRoll,
        hpAfterDamage: target.currentHP,
        description
      };
    }

    return {
      attacker,
      target,
      attack,
      attackRoll: {
        d20Roll,
        attackBonus,
        totalRoll,
        targetAC,
        hit,
        isCritical,
        isMiss,
        damageScale
      },
      description
    };
  }

  /**
   * Attack with disadvantage
   * D&D 5e rules: Roll twice, take lower. If EITHER die is a 1, it's a critical miss
   */
  attackWithDisadvantage(attacker: Combatant, target: Combatant, attack: Attack): AttackResult {
    // Roll twice, take lower using DiceRoller
    const disadvantageRoll = this.diceRoller
      ? this.diceRoller.rollWithDisadvantage()
      : DiceRoller.rollWithDisadvantage();
    const roll1 = disadvantageRoll.roll1;
    const roll2 = disadvantageRoll.roll2;
    const d20Roll = disadvantageRoll.result;

    const attackBonus = attack.attack_bonus ?? 0;
    const totalRoll = d20Roll + attackBonus;
    const targetAC = target.character.armor_class;

    // D&D 5e Sage Advice: With disadvantage, if either die is a 1, it's a critical miss
    // Only check for crit on the selected roll with disadvantage
    const isCritical = this.diceRoller
      ? this.diceRoller.isCriticalHit(d20Roll)
      : DiceRoller.isCriticalHit(d20Roll);
    const isMiss = (this.diceRoller
      ? this.diceRoller.isCriticalMiss(roll1)
      : DiceRoller.isCriticalMiss(roll1)) || (this.diceRoller
      ? this.diceRoller.isCriticalMiss(roll2)
      : DiceRoller.isCriticalMiss(roll2));

    let hit: boolean;
    let damageScale: number | undefined;
    if (this.hitMode === 'scaled') {
      hit = !isMiss;
      if (!isMiss && !isCritical && totalRoll < targetAC) {
        const deficit = targetAC - totalRoll;
        damageScale = Math.max(0.05, 1 - deficit * 0.05);
      } else {
        damageScale = 1.0;
      }
    } else {
      hit = !isMiss && (isCritical || totalRoll >= targetAC);
    }

    const description = `${attacker.character.name} attacks with disadvantage (rolled ${roll1} and ${roll2}, using ${d20Roll})`;

    // Construct result
    if (hit && !isMiss) {
      let damageRoll = this.rollDamage(attacker, attack, isCritical);
      if (damageScale !== undefined && damageScale < 1) {
        const scaledTotal = Math.max(1, Math.floor(damageRoll.total * damageScale));
        damageRoll = { ...damageRoll, total: scaledTotal };
      }
      const hpAfterDamage = target.currentHP - damageRoll.total;

      if (hpAfterDamage < 0) {
        target.currentHP = 0;
        target.isDefeated = true;
      } else {
        target.currentHP = hpAfterDamage;
      }

      return {
        attacker,
        target,
        attack,
        attackRoll: {
          d20Roll,
          attackBonus,
          totalRoll,
          targetAC,
          hit,
          isCritical,
          isMiss,
          damageScale
        },
        damageRoll,
        hpAfterDamage: target.currentHP,
        description
      };
    }

    return {
      attacker,
      target,
      attack,
      attackRoll: {
        d20Roll,
        attackBonus,
        totalRoll,
        targetAC,
        hit,
        isCritical,
        isMiss,
        damageScale
      },
      description
    };
  }

  /**
   * Simulate N attack rolls using the full engine attack resolution pipeline.
   *
   * Creates fresh Combatant wrappers each iteration so the target's HP is never
   * permanently mutated. Uses the same resolveAttack logic as live combat
   * (d20 + attack bonus vs AC, crit on nat 20, fumble on nat 1, doubled dice
   * on crits, ability-modifier-based damage calculation).
   *
   * @param attacker  Character sheet of the attacking hero/enemy
   * @param target    Character sheet of the defender
   * @param attack    Attack object (weapon or spell) with damage_dice and attack_bonus
   * @param iterations  Number of attacks to simulate (default 1000)
   * @param diceRoller  Optional seeded/custom dice roller
   */
  static simulateAttacks(
    attacker: CharacterSheet,
    target: CharacterSheet,
    attack: Attack,
    iterations: number = 1000,
    diceRoller?: DiceRollerAPI,
    hitMode?: HitMode,
  ): AttackSimulationResult {
    const resolver = new AttackResolver(diceRoller, hitMode);
    const buckets = new Map<number, number>();
    let totalHits = 0;
    let totalCrits = 0;
    let totalMisses = 0;

    for (let i = 0; i < iterations; i++) {
      // Fresh combatants each iteration — resolveAttack mutates HP/defeated state
      const atkCombatant: Combatant = {
        id: `sim-atk-${i}`,
        character: attacker,
        initiative: 0,
        currentHP: attacker.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
      };

      const tgtCombatant: Combatant = {
        id: `sim-tgt-${i}`,
        character: target,
        initiative: 0,
        currentHP: target.hp.max,
        statusEffects: [],
        isDefeated: false,
        actionUsed: false,
        bonusActionUsed: false,
        reactionUsed: false,
      };

      const result = resolver.resolveAttack(atkCombatant, tgtCombatant, attack);
      const damage = result.damageRoll?.total ?? 0;
      buckets.set(damage, (buckets.get(damage) ?? 0) + 1);

      if (result.attackRoll.isMiss || !result.attackRoll.hit) {
        totalMisses++;
      } else {
        totalHits++;
        if (result.attackRoll.isCritical) totalCrits++;
      }
    }

    const distribution = Array.from(buckets.entries())
      .map(([damage, count]) => ({
        damage,
        count,
        percentage: (count / iterations) * 100,
      }))
      .sort((a, b) => a.damage - b.damage);

    const averageDamage =
      distribution.reduce((sum, b) => sum + b.damage * b.count, 0) / iterations;

    return {
      iterations,
      totalHits,
      totalMisses,
      totalCrits,
      hitRate: (totalHits / iterations) * 100,
      critRate: (totalCrits / iterations) * 100,
      missRate: (totalMisses / iterations) * 100,
      averageDamage,
      maxDamage: Math.max(...buckets.keys()),
      distribution,
    };
  }
}
