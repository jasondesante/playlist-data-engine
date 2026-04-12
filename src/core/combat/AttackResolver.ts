/**
 * AttackResolver - Handles melee and ranged attack resolution
 * D&D 5e: d20 + attack bonus vs target AC
 * Critical hits (natural 20) double damage dice
 * Critical misses (natural 1) always miss
 */

import type { Combatant, AttackRoll, DamageRoll, DiceRollerAPI, HitMode } from '../types/Combat';
import type { Attack, CharacterSheet, AbilityScores } from '../types/Character';
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

  // ─── Shared formula helpers ──────────────────────────────────────────────
  //
  // These static methods contain the core damage/hit formulas.
  // Both the combat methods (rollDamageScaled, rollAttack) and the
  // estimation methods (estimateDPR) call these, so changing a formula
  // here updates both combat and estimates in one place.

  /**
   * Compute scaled mode damage from raw stats.
   *
   * Formula: max(1, levelBase + weaponBonus)
   * - levelBase = max(1, floor(level * 2 + (STR - AC) * 0.3))
   * - weaponBonus = getWeaponBonus(damageDice)
   * - Crits multiply levelBase by 1.5x (weapon bonus unaffected).
   *
   * NOTE: Always uses STR, even for finesse weapons (by design).
   */
  static computeScaledDamage(level: number, str: number, targetAC: number, damageDice: string, isCritical: boolean): number {
    const levelBase = Math.max(1, Math.floor(level * 2 + (str - targetAC) * 0.3));
    const weaponBonus = AttackResolver.getWeaponBonus(damageDice);
    if (isCritical) return Math.max(1, Math.floor(levelBase * 1.5)) + weaponBonus;
    return Math.max(1, levelBase + weaponBonus);
  }

  /**
   * Compute the damage scale factor for a below-AC roll in scaled mode.
   *
   * Returns 1.0 if totalRoll >= targetAC (full damage).
   * Otherwise returns max(0.10, 1 - deficit * 0.10).
   */
  static computeDamageScale(totalRoll: number, targetAC: number): number {
    if (totalRoll >= targetAC) return 1.0;
    const deficit = targetAC - totalRoll;
    return Math.max(0.10, 1 - deficit * 0.10);
  }

  /**
   * Compute the attack bonus for a weapon.
   *
   * DEX for ranged or finesse weapons, STR otherwise.
   * Matches CombatEngine.buildWeaponAttack.
   */
  static computeAttackBonus(
    abilityScores: AbilityScores,
    weaponProperties: string[],
    proficiency: number,
  ): number {
    const isRanged = weaponProperties.includes('ranged');
    const isFinesse = weaponProperties.includes('finesse');
    const ability = (isRanged || isFinesse) ? 'DEX' : 'STR';
    const abilityMod = Math.floor(((abilityScores[ability] ?? 10) - 10) / 2);
    return abilityMod + proficiency;
  }

  // ─── Combat methods (use shared helpers above) ─────────────────────────

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
      damageRoll = this.rollDamage(attacker, target, attack, attackRoll.isCritical);

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
   *   Each point below AC reduces damage by 10% (min 10%).
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
      if (!isMiss && !isCritical) {
        damageScale = AttackResolver.computeDamageScale(totalRoll, targetAC);
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
   * Roll damage for an attack.
   *
   * Hit mode determines the damage system:
   *
   * 'dnd' — Traditional dice-based damage (D&D 5e style).
   *   Rolls weapon dice + ability modifier. Crits double the dice.
   *
   * 'scaled' — Formula-based damage (Pokemon/Earthbound style).
   *   No dice rolls. Damage = max(1, floor(attackerLevel * 2 + (STR - AC) * 0.3)).
   *   Crits multiply by 1.5x. Scales smoothly with level — starts low (1-2 at
   *   level 1) and grows with stat gaps at higher levels.
   */
  private rollDamage(attacker: Combatant, target: Combatant, attack: Attack, isCritical: boolean): DamageRoll {
    if (this.hitMode === 'dnd') {
      return this.rollDamageDND(attacker, target, attack, isCritical);
    }
    return this.rollDamageScaled(attacker, target, attack, isCritical);
  }

  /**
   * Extracts the ability modifier to apply to damage rolls.
   *
   * - Ranged attacks use DEX modifier.
   * - Finesse melee weapons use max(STR, DEX).
   * - Other melee attacks use STR modifier.
   * - Spells return 0 (ability mod not added to damage dice).
   */
  private getDamageModifier(attacker: Combatant, attack: Attack): number {
    const mods = attacker.character.ability_modifiers;
    const strMod = mods.STR ?? 0;
    const dexMod = mods.DEX ?? 0;

    if (attack.type === 'spell') return 0;
    if (attack.type === 'ranged') return dexMod;
    if (attack.properties?.includes('finesse')) return Math.max(strMod, dexMod);
    return strMod;
  }

  /**
   * DND mode: traditional dice-based damage.
   * Rolls weapon dice + ability modifier (STR for melee, DEX for finesse/ranged).
   * Crits double the dice (not the modifier).
   */
  private rollDamageDND(attacker: Combatant, _target: Combatant, attack: Attack, isCritical: boolean): DamageRoll {
    const attackerSTR = attacker.character.ability_scores.STR ?? 10;
    const attackerDEX = attacker.character.ability_scores.DEX ?? 10;

    // Determine ability modifier from weapon properties
    const isFinesse = attack.properties?.includes('finesse') ?? false;
    const isRanged = attack.properties?.includes('ranged') ?? false;
    const strMod = Math.floor((attackerSTR - 10) / 2);
    const dexMod = Math.floor((attackerDEX - 10) / 2);
    const abilityMod = isFinesse
      ? Math.max(strMod, dexMod)
      : isRanged
        ? dexMod
        : strMod;

    const damageDice = attack.damage_dice ?? '';
    const damageResult = this.diceRoller
      ? this.diceRoller.calculateDamage(damageDice, abilityMod, isCritical)
      : DiceRoller.calculateDamage(damageDice, abilityMod, isCritical);

    const total = Math.max(1, damageResult.total);

    return {
      diceFormula: damageDice,
      rolls: damageResult.rolls,
      modifier: abilityMod,
      total,
      isCritical: damageResult.isCritical,
      baseDamage: 0,
      weaponRoll: damageResult.total - abilityMod,
    };
  }

  /**
   * Scaled mode: formula-based damage (no dice rolls).
   *
   * Formula: max(1, levelBase + weaponBonus)
   * - levelBase = max(1, floor(attackerLevel * 2 + (STR - AC) * 0.3))
   * - weaponBonus = round(avgDiceRoll / 2.5)
   *
   * Level is the primary driver. The weapon's die size provides a flat bonus
   * based on its tier (d4→1, d6→1, d8→2, d10→2, d12→3) so weapon choice
   * matters without dice variance. Crits multiply levelBase by 1.5x.
   */
  private rollDamageScaled(attacker: Combatant, target: Combatant, attack: Attack, isCritical: boolean): DamageRoll {
    const attackerLevel = attacker.character.level ?? 1;
    const attackerSTR = attacker.character.ability_scores.STR ?? 10;
    const defenderAC = target.character.armor_class;

    const levelBase = Math.max(1, Math.floor(attackerLevel * 2 + (attackerSTR - defenderAC) * 0.3));
    const weaponBonus = AttackResolver.getWeaponBonus(attack.damage_dice);
    const total = AttackResolver.computeScaledDamage(attackerLevel, attackerSTR, defenderAC, attack.damage_dice ?? '', isCritical);

    return {
      diceFormula: attack.damage_dice ?? '',
      rolls: [],
      modifier: 0,
      total,
      isCritical,
      baseDamage: levelBase,
      weaponRoll: weaponBonus,
    };
  }

  /**
   * Convert a damage dice string to a flat weapon bonus.
   * Uses the dice average divided by 2.5, giving clean tiers:
   * d4→1, d6→1, d8→2, d10→2, d12→3, 2d6→3, 2d8→4
   */
  static getWeaponBonus(damageDice?: string): number {
    if (!damageDice) return 0;
    try {
      const parsed = DiceRoller.parseDiceFormula(damageDice);
      const avg = parsed.diceCount * (parsed.diceSides + 1) / 2;
      return Math.round(avg / 2.5);
    } catch {
      return 0;
    }
  }

  /**
   * Format weapon damage for display based on the damage display mode.
   *
   * 'scaled': Shows flat damage bonus derived from the dice (e.g. "+2 piercing")
   * 'dnd':    Shows the raw dice string (e.g. "1d8 piercing")
   */
  static formatWeaponDamage(
    dice: string,
    damageType: string,
    damageDisplay: 'dnd' | 'scaled',
  ): string {
    if (damageDisplay === 'scaled') {
      const bonus = AttackResolver.getWeaponBonus(dice);
      return bonus > 0 ? `+${bonus} ${damageType}` : damageType;
    }
    return `${dice} ${damageType}`;
  }

  /**
   * Estimate average damage per hit for a given hitMode.
   *
   * This mirrors the actual combat damage formulas so pre-simulation
   * estimates match what the simulator produces.
   *
   * - 'scaled': `max(1, floor(level * 2 + (STR - targetAC) * 0.3)) + weaponBonus`
   *   NOTE: Scaled mode always uses STR (matches rollDamageScaled).
   * - 'dnd':    dice average + ability modifier (caller picks STR or DEX)
   */
  static estimateDamagePerHit(opts: {
    hitMode: HitMode;
    level: number;
    abilityScore: number;
    targetAC: number;
    damageDice: string;
    proficiencyBonus?: number;
  }): number {
    if (opts.hitMode === 'scaled') {
      return AttackResolver.computeScaledDamage(opts.level, opts.abilityScore, opts.targetAC, opts.damageDice, false);
    }
    // DND mode: dice average + ability modifier
    const abilityMod = Math.floor((opts.abilityScore - 10) / 2);
    try {
      const parsed = DiceRoller.parseDiceFormula(opts.damageDice);
      const diceAvg = parsed.diceCount * (parsed.diceSides + 1) / 2;
      return diceAvg + parsed.modifier + abilityMod;
    } catch {
      return abilityMod + 1;
    }
  }

  /**
   * Estimate Damage Per Round including hit rate.
   *
   * Iterates over all 20 d20 outcomes to compute the true average,
   * matching the actual combat mechanics exactly:
   *
   * - 'scaled': Only nat 1 misses. Rolls below AC deal scaled damage
   *   (max(10%, 1 - deficit * 10%)). Always uses STR for the damage
   *   formula (matches rollDamageScaled).
   * - 'dnd':    `max(5%, (21 - (targetAC - attackBonus)) / 20)` hit rate.
   */
  static estimateDPR(opts: {
    hitMode: HitMode;
    level: number;
    abilityScore: number;
    targetAC: number;
    damageDice: string;
    proficiencyBonus?: number;
    attackBonus?: number;
    attackCount?: number;
  }): number {
    const attackCount = opts.attackCount ?? 1;

    if (opts.hitMode === 'scaled') {
      const baseDamage = AttackResolver.computeScaledDamage(opts.level, opts.abilityScore, opts.targetAC, opts.damageDice, false);
      const critDamage = AttackResolver.computeScaledDamage(opts.level, opts.abilityScore, opts.targetAC, opts.damageDice, true);

      // Attack bonus for damage scaling on low rolls
      const proficiency = opts.proficiencyBonus ?? Math.ceil(1 + ((opts.level || 1) - 1) / 4);
      const ab = opts.attackBonus ?? (Math.floor((opts.abilityScore - 10) / 2) + proficiency);

      // Compute true average over all 20 d20 outcomes
      let totalDamage = 0;
      for (let d20 = 1; d20 <= 20; d20++) {
        if (d20 === 1) continue; // Natural 1 = miss (0 damage)
        if (d20 === 20) {
          totalDamage += critDamage;
          continue;
        }
        const totalRoll = d20 + ab;
        const scale = AttackResolver.computeDamageScale(totalRoll, opts.targetAC);
        totalDamage += Math.max(1, Math.floor(baseDamage * scale));
      }
      return (totalDamage / 20) * attackCount;
    }

    // DND mode
    const damagePerHit = AttackResolver.estimateDamagePerHit(opts);
    const proficiency = opts.proficiencyBonus ?? Math.ceil(1 + ((opts.level || 1) - 1) / 4);
    const abilityMod = Math.floor((opts.abilityScore - 10) / 2);
    const atkBonus = opts.attackBonus ?? (abilityMod + proficiency);
    const hitRate = Math.max(0.05, Math.min(0.95, (21 - (opts.targetAC - atkBonus)) / 20));
    return damagePerHit * hitRate * attackCount;
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
        damageScale = Math.max(0.10, 1 - deficit * 0.10);
      } else {
        damageScale = 1.0;
      }
    } else {
      hit = !isMiss && (isCritical || totalRoll >= targetAC);
    }

    const description = `${attacker.character.name} attacks with advantage (rolled ${roll1} and ${roll2}, using ${d20Roll})`;

    // Construct result (same as normal attack if hit)
    if (hit && !isMiss) {
      let damageRoll = this.rollDamage(attacker, target, attack, isCritical);
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
        damageScale = Math.max(0.10, 1 - deficit * 0.10);
      } else {
        damageScale = 1.0;
      }
    } else {
      hit = !isMiss && (isCritical || totalRoll >= targetAC);
    }

    const description = `${attacker.character.name} attacks with disadvantage (rolled ${roll1} and ${roll2}, using ${d20Roll})`;

    // Construct result
    if (hit && !isMiss) {
      let damageRoll = this.rollDamage(attacker, target, attack, isCritical);
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
