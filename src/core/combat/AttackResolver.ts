/**
 * AttackResolver - Handles melee and ranged attack resolution
 * D&D 5e: d20 + attack bonus vs target AC
 * Critical hits (natural 20) double damage dice
 * Critical misses (natural 1) always miss
 */

import type { Combatant, AttackRoll, DamageRoll } from '../types/Combat';
import type { Attack } from '../types/Character';
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
 * AttackResolver - D&D 5e attack and damage calculation
 */
export class AttackResolver {
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
   */
  private rollAttack(_attacker: Combatant, target: Combatant, attack: Attack): AttackRoll {
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const attackBonus = attack.attack_bonus ?? 0;
    const totalRoll = d20Roll + attackBonus;
    const targetAC = target.character.armor_class;

    const isCritical = d20Roll === 20;
    const isMiss = d20Roll === 1;
    const hit = !isMiss && (isCritical || totalRoll >= targetAC);

    return {
      d20Roll,
      attackBonus,
      totalRoll,
      targetAC,
      hit,
      isCritical,
      isMiss
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

    const damageResult = DiceRoller.calculateDamage(damageDice, abilityModifier, isCritical);

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
  calculateAttackBonus(character: any, _attackName: string, abilityModifier: number, isProficient: boolean = false): number {
    let bonus = abilityModifier;

    if (isProficient) {
      bonus += character.proficiency_bonus;
    }

    return bonus;
  }

  /**
   * Check if attack hits with advantage or disadvantage
   */
  attackWithAdvantage(attacker: Combatant, target: Combatant, attack: Attack): AttackResult {
    // Roll twice, take higher
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;
    const d20Roll = Math.max(roll1, roll2);

    const attackBonus = attack.attack_bonus ?? 0;
    const totalRoll = d20Roll + attackBonus;
    const targetAC = target.character.armor_class;

    const isCritical = d20Roll === 20;
    const isMiss = d20Roll === 1;
    const hit = !isMiss && (isCritical || totalRoll >= targetAC);

    const description = `${attacker.character.name} attacks with advantage (rolled ${roll1} and ${roll2}, using ${d20Roll})`;

    // Construct result (same as normal attack if hit)
    if (hit && !isMiss) {
      const damageRoll = this.rollDamage(attacker, attack, isCritical);
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
          isMiss
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
        isMiss
      },
      description
    };
  }

  /**
   * Attack with disadvantage
   * Roll twice, take lower
   */
  attackWithDisadvantage(attacker: Combatant, target: Combatant, attack: Attack): AttackResult {
    // Roll twice, take lower
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;
    const d20Roll = Math.min(roll1, roll2);

    const attackBonus = attack.attack_bonus ?? 0;
    const totalRoll = d20Roll + attackBonus;
    const targetAC = target.character.armor_class;

    const isCritical = d20Roll === 20;
    const isMiss = d20Roll === 1;
    const hit = !isMiss && (isCritical || totalRoll >= targetAC);

    const description = `${attacker.character.name} attacks with disadvantage (rolled ${roll1} and ${roll2}, using ${d20Roll})`;

    // Construct result
    if (hit && !isMiss) {
      const damageRoll = this.rollDamage(attacker, attack, isCritical);
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
          isMiss
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
        isMiss
      },
      description
    };
  }
}
