/**
 * SpellCaster - Handles spell casting mechanics
 * Manages spell slots, saving throws, and spell damage
 */

import type { Combatant, SpellCastResult, StatusEffect, StatusEffectMechanics, DiceRollerAPI } from '../types/Combat';
import type { Spell } from '../types/Character';
import { DiceRoller } from './DiceRoller';
import { getFullCasterSlotsForLevel } from '../../constants/SpellSlots.js';

/**
 * Maps spell tags to status effect configurations.
 * Used by castSpell() to apply status effects based on tags (preferred)
 * with fallback to string matching on description/effect text.
 *
 * To add a new status-effect-producing tag, add an entry here and
 * tag the relevant spells in SpellcastingGenerator.ts.
 */
const TAG_STATUS_EFFECTS: Readonly<Record<string, {
  name: string;
  requiresConcentration: boolean;
  mechanicalEffects?: StatusEffectMechanics;
}>> = {
  charm: {
    name: 'Charmed',
    requiresConcentration: true,
    mechanicalEffects: {
      disadvantageOnAttackNonSource: true,
    },
  },
  frighten: {
    name: 'Frightened',
    requiresConcentration: true,
    mechanicalEffects: {
      disadvantageOnAttack: true,
      disadvantageOnAbilityChecks: true,
    },
  },
  stun: {
    name: 'Stunned',
    requiresConcentration: false,
    mechanicalEffects: {
      disadvantageOnDexSaves: true,
      speedZero: true,
      skipTurn: true,
    },
  },
  paralyze: {
    name: 'Paralyzed',
    requiresConcentration: false,
    mechanicalEffects: {
      disadvantageOnDexSaves: true,
      speedZero: true,
      skipTurn: true,
    },
  },
  restrain: {
    name: 'Restrained',
    requiresConcentration: true,
    mechanicalEffects: {
      disadvantageOnDexSaves: true,
      speedZero: true,
    },
  },
  poison: {
    name: 'Poisoned',
    requiresConcentration: false,
    mechanicalEffects: {
      disadvantageOnAttack: true,
      disadvantageOnAbilityChecks: true,
    },
  },
  blind: {
    name: 'Blinded',
    requiresConcentration: false,
    mechanicalEffects: {
      disadvantageOnAttack: true,
      disadvantageOnAbilityChecks: true,
    },
  },
  deafen: {
    name: 'Deafened',
    requiresConcentration: false,
  },
  burn: {
    name: 'Burning',
    requiresConcentration: false,
  },
};

/**
 * SpellCaster - D&D 5e spell casting system
 */
export class SpellCaster {
  private diceRoller?: DiceRollerAPI;

  constructor(diceRoller?: DiceRollerAPI) {
    this.diceRoller = diceRoller;
  }
  /**
   * Cast a spell at one or more targets
   * Handles:
   * - Spell slot consumption
   * - Spell attack rolls (if applicable)
   * - Saving throws (if applicable)
   * - Damage calculation
   */
  castSpell(
    caster: Combatant,
    spell: Spell,
    targets: Combatant[]
  ): SpellCastResult {
    const spellLevel = spell.level ?? 0;

    // Check if caster has spell slots available
    if (!this.hasSpellSlot(caster, spellLevel)) {
      return {
        success: false,
        spellName: spell.name,
        caster,
        targets,
        effectsApplied: [],
        spellSlotUsed: spellLevel,
        description: `${caster.character.name} tried to cast ${spell.name} but has no spell slots available!`
      };
    }

    // Consume spell slot
    this.consumeSpellSlot(caster, spellLevel);

    // Determine spell effects
    const effectsApplied: StatusEffect[] = [];
    let damage: any;
    let saveDC: number | undefined;

    // Resolve damage dice and damage type from either naming convention
    // Player spells use damage_dice/damage_type, enemy InnateSpell uses damage/damageType
    const damageDice = spell.damage_dice ?? spell.damage;
    const damageType = spell.damage_type ?? spell.damageType;
    const saveAbility = spell.saving_throw ?? spell.save;

    // If spell deals damage
    if (damageDice && damageType) {
      // Check if this is an attack roll or saving throw
      if (spell.attack_roll) {
        // Attack roll spell (like Fire Bolt)
        damage = this.diceRoller
          ? this.diceRoller.calculateDamage(damageDice, 0, false)
          : DiceRoller.calculateDamage(damageDice, 0, false);
      } else if (saveAbility) {
        // Saving throw spell (like Fireball)
        saveDC = this.calculateSaveDC(caster, saveAbility);

        // Apply effects to targets based on saving throw
        for (const target of targets) {
          // Check for disadvantage on the save ability (e.g., Stunned → disadvantage on DEX saves)
          const disadvantagedAbility = saveAbility.toLowerCase();
          const hasDisadvantage = disadvantagedAbility === 'dexterity' &&
            target.statusEffects.some(e => e.mechanicalEffects?.disadvantageOnDexSaves);

          const saveResult = this.makeSavingThrow(target, saveAbility, saveDC, hasDisadvantage);
          if (!saveResult) {
            damage = this.diceRoller
              ? this.diceRoller.calculateDamage(damageDice, 0, false)
              : DiceRoller.calculateDamage(damageDice, 0, false);
            target.currentHP -= damage.total;
            if (target.currentHP < 0) {
              target.currentHP = 0;
              target.isDefeated = true;
            }
          }
        }
      }
    }

    // Build spell effects (status effects, buffs, debuffs).
    // These are returned in effectsApplied for the caller (e.g. CombatEngine)
    // to apply via applyStatusEffect() which handles stacking and concentration.
    //
    // Priority: tags (structured, reliable) > description/effect text (fallback for player spells).
    const tags = spell.tags ?? [];
    const matchedEffectNames = new Set<string>();

    // Check tags first for status effects
    for (const tag of tags) {
      const tagConfig = TAG_STATUS_EFFECTS[tag];
      if (tagConfig) {
        matchedEffectNames.add(tagConfig.name);
        const effect: StatusEffect = {
          name: tagConfig.name,
          description: `${tagConfig.name} by ${caster.character.name}`,
          duration: 1,
          source: caster.id,
          hasConcentration: tagConfig.requiresConcentration,
          mechanicalEffects: tagConfig.mechanicalEffects,
        };
        for (const target of targets) {
          effectsApplied.push({ ...effect });
        }
      }
    }

    // Fallback: check description/effect text for status effect keywords.
    // Only applies effects that weren't already matched by tags.
    const effectText = [spell.description, spell.effect].filter(Boolean).join(' ').toLowerCase();
    if (!matchedEffectNames.has('Charmed') && effectText.includes('charm')) {
      const charmed: StatusEffect = {
        name: 'Charmed',
        description: `Charmed by ${caster.character.name}`,
        duration: 1,
        source: caster.id,
        hasConcentration: true,
      };
      for (const target of targets) {
        effectsApplied.push({ ...charmed });
      }
    }

    if (!matchedEffectNames.has('Frightened') && effectText.includes('frighten')) {
      const frightened: StatusEffect = {
        name: 'Frightened',
        description: `Frightened of ${caster.character.name}`,
        duration: 1,
        source: caster.id,
        hasConcentration: true,
      };
      for (const target of targets) {
        effectsApplied.push({ ...frightened });
      }
    }

    const description = `${caster.character.name} casts ${spell.name} (Level ${spellLevel}) at ${targets.map(t => t.character.name).join(', ')}`;

    return {
      success: true,
      spellName: spell.name,
      caster,
      targets,
      saveDC,
      damage,
      effectsApplied,
      spellSlotUsed: spellLevel,
      description
    };
  }

  /**
   * Check if caster has a spell slot of the given level
   */
  hasSpellSlot(caster: Combatant, spellLevel: number): boolean {
    if (spellLevel === 0) {
      return true; // Cantrips don't require slots
    }

    if (!caster.spellSlots || !caster.spellSlots[spellLevel]) {
      return false;
    }

    return caster.spellSlots[spellLevel] > 0;
  }

  /**
   * Consume a spell slot
   */
  consumeSpellSlot(caster: Combatant, spellLevel: number): void {
    if (spellLevel === 0) {
      return; // Cantrips don't consume slots
    }

    if (!caster.spellSlots) {
      caster.spellSlots = {};
    }

    if (!caster.spellSlots[spellLevel]) {
      caster.spellSlots[spellLevel] = 0;
    }

    caster.spellSlots[spellLevel]--;
  }

  /**
   * Restore spell slots (e.g., after long rest)
   * For simplicity, restores ALL spell slots to maximum
   */
  restoreSpellSlots(caster: Combatant): void {
    caster.spellSlots = getFullCasterSlotsForLevel(caster.character.level);
  }

  /**
   * Calculate spell save DC
   * DC = 8 + spellcasting ability modifier + proficiency bonus
   */
  calculateSaveDC(caster: Combatant, ability: string): number {
    const abilityKey = ability.toLowerCase() as keyof typeof caster.character.ability_modifiers;
    const abilityModifier = caster.character.ability_modifiers[abilityKey] || 0;
    const proficiencyBonus = caster.character.proficiency_bonus;

    return 8 + abilityModifier + proficiencyBonus;
  }

  /**
   * Make a saving throw against a spell
   * Returns true if save succeeds, false if fails
   *
   * @param target - The combatant making the save
   * @param saveAbility - The ability score used for the save (e.g., 'dexterity')
   * @param saveDC - The difficulty class to meet or exceed
   * @param disadvantage - If true, roll with disadvantage (roll twice, take lower)
   */
  makeSavingThrow(target: Combatant, saveAbility: string, saveDC: number, disadvantage: boolean = false): boolean {
    const abilityKey = saveAbility.toLowerCase() as keyof typeof target.character.ability_modifiers;
    const abilityModifier = target.character.ability_modifiers[abilityKey] || 0;

    // Check if target has proficiency in this save (if implemented)
    const savingThrows = target.character.saving_throws;
    const hasProficiency = savingThrows[abilityKey as keyof typeof savingThrows];

    const proficiencyBonus = hasProficiency ? target.character.proficiency_bonus : 0;

    let saveRoll: number;

    if (disadvantage) {
      // Roll with disadvantage: roll twice, take the lower
      const disadvantageResult = this.diceRoller
        ? this.diceRoller.rollWithDisadvantage()
        : DiceRoller.rollWithDisadvantage();
      saveRoll = disadvantageResult.result + abilityModifier + proficiencyBonus;
    } else {
      saveRoll = this.diceRoller
        ? this.diceRoller.rollSavingThrow(abilityModifier, proficiencyBonus)
        : DiceRoller.rollSavingThrow(abilityModifier, proficiencyBonus);
    }

    return saveRoll >= saveDC;
  }

  /**
   * Get spell slot information for a caster
   */
  getSpellSlotInfo(caster: Combatant): string {
    if (!caster.spellSlots) {
      return 'No spell slots available';
    }

    const slots: string[] = [];
    for (let i = 1; i <= 9; i++) {
      const count = caster.spellSlots[i] || 0;
      if (count > 0) {
        slots.push(`Level ${i}: ${count} slots`);
      }
    }

    return slots.length > 0 ? slots.join(', ') : 'No spell slots available';
  }

  /**
   * Check if a spell can be upcast
   * Upcasting is when a spell is cast using a higher-level spell slot
   */
  canUpcast(caster: Combatant, spell: Spell, targetSlotLevel: number): boolean {
    const spellLevel = spell.level ?? 0;
    if (targetSlotLevel < spellLevel) {
      return false; // Cannot downcast
    }

    return this.hasSpellSlot(caster, targetSlotLevel);
  }

  /**
   * Upcast a spell (cast it using a higher spell slot)
   */
  upcastSpell(
    caster: Combatant,
    spell: Spell,
    targets: Combatant[],
    slotLevelUsed: number
  ): SpellCastResult {
    const spellLevel = spell.level ?? 0;
    if (slotLevelUsed < spellLevel) {
      return {
        success: false,
        spellName: spell.name,
        caster,
        targets,
        effectsApplied: [],
        spellSlotUsed: slotLevelUsed,
        description: `Cannot cast ${spell.name} with a lower-level slot`
      };
    }

    // Temporarily modify spell level for slot consumption
    const originalLevel = spell.level;
    (spell as any).level = slotLevelUsed;

    const result = this.castSpell(caster, spell, targets);

    // Restore original spell level
    (spell as any).level = originalLevel;

    return result;
  }

  // ─── Static helpers for AI decision-making ───────────────────────────────

  /**
   * Check if a spell has a specific tag.
   * Tags are set on enemy InnateSpell objects and used by the AI
   * for spell classification and decision-making.
   */
  static hasSpellTag(spell: Spell, tag: string): boolean {
    return Array.isArray(spell.tags) && spell.tags.includes(tag);
  }

  /**
   * Get all tags for a spell.
   * Returns an empty array if the spell has no tags.
   */
  static getSpellTags(spell: Spell): string[] {
    return Array.isArray(spell.tags) ? [...spell.tags] : [];
  }

  /**
   * Check if a spell deals damage.
   * Uses tags (preferred) or falls back to checking damage dice fields.
   */
  static isDamageSpell(spell: Spell): boolean {
    return SpellCaster.hasSpellTag(spell, 'damage') ||
      !!(spell.damage_dice || spell.damage);
  }

  /**
   * Check if a spell requires concentration.
   */
  static requiresConcentration(spell: Spell): boolean {
    return spell.concentration === true;
  }

  /**
   * Check if a spell has an area-of-effect component.
   */
  static isAOESpell(spell: Spell): boolean {
    return SpellCaster.hasSpellTag(spell, 'aoe');
  }

  /**
   * Check if a spell targets multiple creatures.
   */
  static isMultiTargetSpell(spell: Spell): boolean {
    return SpellCaster.hasSpellTag(spell, 'multi-target');
  }

  /**
   * Check if a spell can be used as a bonus action.
   */
  static isBonusActionSpell(spell: Spell): boolean {
    return SpellCaster.hasSpellTag(spell, 'bonus-action');
  }

  /**
   * Check if a spell can only target allies (healing, buffs).
   */
  static isAllySpell(spell: Spell): boolean {
    return SpellCaster.hasSpellTag(spell, 'ally');
  }

  /**
   * Check if a spell only targets the caster.
   */
  static isSelfSpell(spell: Spell): boolean {
    return SpellCaster.hasSpellTag(spell, 'self');
  }

  /**
   * Get the tag-to-status-effect mapping.
   * Used by tests and the AI to understand which tags produce which effects.
   */
  static getStatusEffectTags(): Readonly<Record<string, {
    name: string;
    requiresConcentration: boolean;
    mechanicalEffects?: StatusEffectMechanics;
  }>> {
    return TAG_STATUS_EFFECTS;
  }
}
