/**
 * SpellCaster - Handles spell casting mechanics
 * Manages spell slots, saving throws, and spell damage
 */

import type { Combatant, SpellCastResult, StatusEffect } from '../types/Combat';
import type { Spell } from '../types/Character';
import { calculateDamage } from './DiceRoller';

/**
 * SpellCaster - D&D 5e spell casting system
 */
export class SpellCaster {
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
    // Check if caster has spell slots available
    if (!this.hasSpellSlot(caster, spell.level)) {
      return {
        success: false,
        spellName: spell.name,
        caster,
        targets,
        effectsApplied: [],
        spellSlotUsed: spell.level,
        description: `${caster.character.name} tried to cast ${spell.name} but has no spell slots available!`
      };
    }

    // Consume spell slot
    this.consumeSpellSlot(caster, spell.level);

    // Determine spell effects
    const effectsApplied: StatusEffect[] = [];
    let damage: any;
    let saveDC: number | undefined;

    // If spell deals damage
    if (spell.damage_dice && spell.damage_type) {
      // Check if this is an attack roll or saving throw
      if (spell.attack_roll) {
        // Attack roll spell (like Fire Bolt)
        damage = calculateDamage(spell.damage_dice, 0, false);
      } else if (spell.saving_throw) {
        // Saving throw spell (like Fireball)
        saveDC = this.calculateSaveDC(caster, spell.saving_throw);

        // Apply effects to targets based on saving throw
        for (const target of targets) {
          const saveResult = this.makeSavingThrow(target, spell.saving_throw, saveDC);
          if (!saveResult) {
            damage = calculateDamage(spell.damage_dice, 0, false);
            target.currentHP -= damage.total;
            if (target.currentHP < 0) {
              target.currentHP = 0;
              target.isDefeated = true;
            }
          }
        }
      }
    }

    // Apply spell effects (status effects, buffs, debuffs)
    if (spell.description.toLowerCase().includes('charm')) {
      const charmed: StatusEffect = {
        name: 'Charmed',
        description: `Charmed by ${caster.character.name}`,
        duration: 1,
        source: caster.id,
        hasConcentration: true
      };
      for (const target of targets) {
        target.statusEffects.push(charmed);
        effectsApplied.push(charmed);
      }
    }

    if (spell.description.toLowerCase().includes('frighten')) {
      const frightened: StatusEffect = {
        name: 'Frightened',
        description: `Frightened of ${caster.character.name}`,
        duration: 1,
        source: caster.id,
        hasConcentration: true
      };
      for (const target of targets) {
        target.statusEffects.push(frightened);
        effectsApplied.push(frightened);
      }
    }

    const description = `${caster.character.name} casts ${spell.name} (Level ${spell.level}) at ${targets.map(t => t.character.name).join(', ')}`;

    return {
      success: true,
      spellName: spell.name,
      caster,
      targets,
      saveDC,
      damage,
      effectsApplied,
      spellSlotUsed: spell.level,
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
    const characterClass = caster.character.character_class.name.toLowerCase();

    // D&D 5e spell slot progression by class and level
    // This is simplified - in full implementation, would use actual class progression
    const maxSlots: { [key: number]: number[] } = {
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

    const slots = maxSlots[caster.character.level] || [0];
    caster.spellSlots = {};

    for (let i = 1; i < slots.length; i++) {
      caster.spellSlots[i] = slots[i];
    }
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
   */
  makeSavingThrow(target: Combatant, saveAbility: string, saveDC: number): boolean {
    const abilityKey = saveAbility.toLowerCase() as keyof typeof target.character.ability_modifiers;
    const abilityModifier = target.character.ability_modifiers[abilityKey] || 0;

    // Check if target has proficiency in this save (if implemented)
    const savingThrows = target.character.saving_throws;
    const hasProficiency = savingThrows[abilityKey as keyof typeof savingThrows];

    const proficiencyBonus = hasProficiency ? target.character.proficiency_bonus : 0;

    const roll = Math.floor(Math.random() * 20) + 1;
    const saveRoll = roll + abilityModifier + proficiencyBonus;

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
    if (targetSlotLevel < spell.level) {
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
    if (slotLevelUsed < spell.level) {
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
}
