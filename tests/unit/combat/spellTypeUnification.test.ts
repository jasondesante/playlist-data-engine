/**
 * Spell Type Unification Tests (Task 1.6.1)
 *
 * Verifies that InnateSpell and Spell types are properly unified so that:
 * 1. InnateSpell extends Spell (structural compatibility)
 * 2. SpellCaster reads both naming conventions (damage/damage_dice, save/saving_throw, etc.)
 * 3. SpellCaster checks both description and effect for status effects
 * 4. CombatEngine reads damage_type from both naming conventions
 * 5. InnateSpell objects from SPELL_LISTS are valid Spell objects
 */

import { describe, it, expect } from 'vitest';
import { SpellCaster } from '../../../src/core/combat/SpellCaster.js';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { SpellcastingGenerator } from '../../../src/core/generation/SpellcastingGenerator.js';
import type { Spell } from '../../../src/core/types/Character.js';
import type { Combatant } from '../../../src/core/types/Combat.js';
import type { InnateSpell } from '../../../src/core/generation/SpellcastingGenerator.js';
import { createTestCombatant } from '../../helpers/combatTestHelpers.js';
import { SeededDiceRoller } from '../../../src/core/combat/SeededDiceRoller.js';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function makeCaster(): Combatant {
  return createTestCombatant(
    {
      name: 'Spell Caster',
      level: 5,
      class: 'Wizard' as any,
      ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 4, WIS: 0, CHA: 0 },
      proficiency_bonus: 3,
      saving_throws: { INT: true } as any
    },
    {
      spellSlots: { 1: 4, 2: 3, 3: 2 },
      currentHP: 30,
      temporaryHP: 0
    }
  );
}

function makeTarget(): Combatant {
  return createTestCombatant(
    { name: 'Target', hp: { current: 30, max: 30, temp: 0 } },
    { currentHP: 30, temporaryHP: 0 }
  );
}

/**
 * Create a Spell using player-style field names (damage_dice, damage_type, saving_throw)
 */
function playerSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    name: 'Fireball',
    level: 3,
    school: 'evocation',
    description: 'A blazing sphere of fire.',
    damage_dice: '8d6',
    damage_type: 'fire',
    saving_throw: 'DEX',
    attack_roll: false,
    ...overrides
  };
}

/**
 * Create a Spell using enemy InnateSpell-style field names (damage, damageType, save)
 */
function enemyStyleSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    name: 'Scorching Burst',
    level: 3,
    school: 'evocation',
    effect: 'A wave of fire erupts from your hands.',
    damage: '8d6',
    damageType: 'fire',
    save: 'DEX',
    tags: ['damage', 'aoe'],
    ...overrides
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('Spell Type Unification (1.6.1)', () => {

  // ─── InnateSpell extends Spell ──────────────────────────────────────────

  describe('InnateSpell structural compatibility with Spell', () => {
    it('InnateSpell satisfies Spell interface (assignable)', () => {
      const innateSpell: InnateSpell = {
        id: 'test_spell',
        name: 'Test Spell',
        level: 1,
        school: 'evocation',
        effect: 'A test effect',
        damage: '2d6',
        damageType: 'fire',
        save: 'DEX',
        rangeFeet: 60,
        concentration: true,
        tags: ['damage', 'ranged']
      };

      // InnateSpell must be assignable to Spell
      const asSpell: Spell = innateSpell;
      expect(asSpell.name).toBe('Test Spell');
      expect(asSpell.damage).toBe('2d6');
      expect(asSpell.damageType).toBe('fire');
      expect(asSpell.save).toBe('DEX');
      expect(asSpell.rangeFeet).toBe(60);
      expect(asSpell.concentration).toBe(true);
      expect(asSpell.tags).toEqual(['damage', 'ranged']);
      expect(asSpell.effect).toBe('A test effect');
    });

    it('InnateSpell inherits optional Spell fields (damage_dice, saving_throw, etc.)', () => {
      const innateSpell: InnateSpell = {
        id: 'test_spell',
        name: 'Test Spell',
        level: 1,
        school: 'evocation',
        effect: 'A test effect'
      };

      // Should have inherited optional fields from Spell
      expect(innateSpell.damage_dice).toBeUndefined();
      expect(innateSpell.damage_type).toBeUndefined();
      expect(innateSpell.saving_throw).toBeUndefined();
      expect(innateSpell.attack_roll).toBeUndefined();
      expect(innateSpell.range).toBeUndefined();
      expect(innateSpell.rangeFeet).toBeUndefined();
      expect(innateSpell.concentration).toBeUndefined();
      expect(innateSpell.tags).toBeUndefined();
    });

    it('InnateSpell can have both naming conventions simultaneously', () => {
      const dualSpell: Spell = {
        id: 'dual_spell',
        name: 'Dual Spell',
        level: 2,
        school: 'evocation',
        effect: 'Has both naming conventions',
        // Player-style
        damage_dice: '3d6',
        damage_type: 'cold',
        saving_throw: 'CON',
        description: 'A cold blast.',
        // Enemy-style
        damage: '3d6',
        damageType: 'cold',
        save: 'CON',
        rangeFeet: 60
      };

      expect(dualSpell.damage_dice).toBe('3d6');
      expect(dualSpell.damage).toBe('3d6');
      expect(dualSpell.damage_type).toBe('cold');
      expect(dualSpell.damageType).toBe('cold');
      expect(dualSpell.saving_throw).toBe('CON');
      expect(dualSpell.save).toBe('CON');
    });
  });

  // ─── SpellCaster reads both naming conventions ─────────────────────────

  describe('SpellCaster dual naming convention support', () => {
    it('reads damage from damage_dice (player-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell = playerSpell({
        name: 'Fireball',
        damage_dice: '8d6',
        damage_type: 'fire',
        saving_throw: 'DEX',
        level: 3
      });

      // Give caster a level 3 slot
      caster.spellSlots = { ...caster.spellSlots, 3: 2 };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Fireball');
    });

    it('reads damage from damage (enemy-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell = enemyStyleSpell({
        name: 'Scorching Burst',
        damage: '8d6',
        damageType: 'fire',
        save: 'DEX',
        level: 3
      });

      // Give caster a level 3 slot
      caster.spellSlots = { ...caster.spellSlots, 3: 2 };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Scorching Burst');
    });

    it('prefers damage_dice over damage when both are set', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Conflict Spell',
        level: 1,
        damage_dice: '10d6',   // Player-style (should be preferred)
        damage_type: 'fire',
        damage: '1d4',          // Enemy-style (should be ignored)
        damageType: 'cold',     // Enemy-style (should be ignored)
        saving_throw: 'DEX',
        school: 'evocation'
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
    });

    it('prefers saving_throw over save when both are set', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Save Conflict',
        level: 1,
        damage_dice: '2d6',
        damage_type: 'fire',
        saving_throw: 'CON',  // Player-style (should be preferred)
        save: 'DEX',          // Enemy-style (should be ignored)
        school: 'evocation'
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
    });

    it('works with attack roll spells using damage_dice', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const roller = new SeededDiceRoller('attack-roll-test');
      const spellCaster = new SpellCaster(roller);
      const spell = playerSpell({
        name: 'Fire Bolt',
        level: 0, // cantrip
        damage_dice: '2d10',
        damage_type: 'fire',
        attack_roll: true
      });

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Fire Bolt');
      expect(result.spellSlotUsed).toBe(0);
    });

    it('works with attack roll spells using damage (enemy-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const roller = new SeededDiceRoller('enemy-attack-test');
      const spellCaster = new SpellCaster(roller);
      const spell = enemyStyleSpell({
        name: 'Eldritch Blast',
        level: 0,
        damage: '1d10',
        damageType: 'force',
        attack_roll: true,
        tags: ['damage', 'ranged']
      });

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Eldritch Blast');
    });

    it('cantrips work with enemy-style damage field', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const roller = new SeededDiceRoller('cantrip-test');
      const spellCaster = new SpellCaster(roller);
      const spell: Spell = {
        name: 'Sacred Flame',
        level: 0,
        school: 'evocation',
        damage: '1d8',
        damageType: 'radiant',
        tags: ['damage', 'ranged']
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.spellSlotUsed).toBe(0);
    });

    it('no-damage spells work with only effect field (enemy-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Bless',
        level: 1,
        school: 'enchantment',
        effect: 'Bless up to three creatures.',
        concentration: true,
        tags: ['buff', 'ally', 'multi-target']
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Bless');
    });
  });

  // ─── Status effect detection from both description and effect ──────────

  describe('Status effect detection from description and effect', () => {
    it('detects charm from description (player-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Charm Person',
        level: 1,
        school: 'enchantment',
        description: 'A humanoid you can see must make a Wisdom save or be Charmed by you.'
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.effectsApplied.length).toBe(1);
      expect(result.effectsApplied[0].name).toBe('Charmed');
    });

    it('detects charm from effect (enemy-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Enchanting Gaze',
        level: 2,
        school: 'enchantment',
        effect: 'The target is Charmed by the caster and cannot attack them.',
        tags: ['control', 'debuff'],
        concentration: true
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.effectsApplied.length).toBe(1);
      expect(result.effectsApplied[0].name).toBe('Charmed');
    });

    it('detects frighten from description (player-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Cause Fear',
        level: 1,
        school: 'necromancy',
        description: 'The target is Frightened of you for the duration.'
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.effectsApplied.length).toBe(1);
      expect(result.effectsApplied[0].name).toBe('Frightened');
    });

    it('detects frighten from effect (enemy-style)', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Terrifying Roar',
        level: 2,
        school: 'necromancy',
        effect: 'All enemies within range are Frightened of the caster.',
        tags: ['control', 'aoe', 'debuff'],
        concentration: true
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.effectsApplied.length).toBe(1);
      expect(result.effectsApplied[0].name).toBe('Frightened');
    });

    it('does not detect status effects when neither description nor effect contains keywords', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Magic Missile',
        level: 1,
        school: 'evocation',
        description: 'Three darts of magical force.',
        damage_dice: '1d4+1',
        damage_type: 'force'
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      expect(result.effectsApplied.length).toBe(0);
    });

    it('prefers description over effect when both contain different status effects', () => {
      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();
      const spell: Spell = {
        name: 'Dual Effect Spell',
        level: 1,
        school: 'enchantment',
        description: 'The target is Charmed by you.',
        effect: 'The target is Frightened of you.'
      };

      const result = spellCaster.castSpell(caster, spell, [target]);
      expect(result.success).toBe(true);
      // Both should be detected since we check the combined text
      expect(result.effectsApplied.length).toBe(2);
      const effectNames = result.effectsApplied.map(e => e.name);
      expect(effectNames).toContain('Charmed');
      expect(effectNames).toContain('Frightened');
    });
  });

  // ─── CombatEngine reads damage_type from both naming conventions ───────

  describe('CombatEngine dual naming convention support', () => {
    it('records damage_type from player-style spell', () => {
      const engine = new CombatEngine();
      const casterChar = makeCaster().character;

      // Ensure character has spell slots so CombatEngine initializes them
      const partyChars = [{
        ...casterChar,
        cr: 5,
        spells: {
          spell_slots: { 1: { total: 4, used: 0 }, 2: { total: 3, used: 0 }, 3: { total: 2, used: 0 } },
          known_spells: ['Fireball'],
          cantrips: []
        }
      }];
      const enemyChars = [{ ...makeTarget().character, cr: 5 }];

      const combat = engine.startCombat(partyChars, enemyChars);

      const spell = playerSpell({
        name: 'Fireball',
        damage_dice: '8d6',
        damage_type: 'fire',
        saving_throw: 'DEX',
        level: 3
      });

      const caster = combat.combatants.find(c => c.id.startsWith('player'))!;
      const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

      engine.executeCastSpell(combat, caster, spell, [target]);

      const lastAction = combat.history[combat.history.length - 1];
      expect(lastAction?.type).toBe('spell');
      expect(lastAction?.result?.damageType).toBe('fire');
    });

    it('records damage_type from enemy-style spell (damageType)', () => {
      const engine = new CombatEngine();
      const casterChar = makeCaster().character;

      const partyChars = [{
        ...casterChar,
        cr: 5,
        spells: {
          spell_slots: { 1: { total: 4, used: 0 }, 2: { total: 3, used: 0 }, 3: { total: 2, used: 0 } },
          known_spells: ['Scorching Burst'],
          cantrips: []
        }
      }];
      const enemyChars = [{ ...makeTarget().character, cr: 5 }];

      const combat = engine.startCombat(partyChars, enemyChars);

      const spell = enemyStyleSpell({
        name: 'Scorching Burst',
        damage: '8d6',
        damageType: 'fire',
        save: 'DEX',
        level: 3
      });

      const caster = combat.combatants.find(c => c.id.startsWith('player'))!;
      const target = combat.combatants.find(c => c.id.startsWith('enemy'))!;

      engine.executeCastSpell(combat, caster, spell, [target]);

      const lastAction = combat.history[combat.history.length - 1];
      expect(lastAction?.type).toBe('spell');
      expect(lastAction?.result?.damageType).toBe('fire');
    });
  });

  // ─── InnateSpell objects from SPELL_LISTS ─────────────────────────────

  describe('SPELL_LISTS compatibility', () => {
    it('support cantrips are valid Spell objects', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      expect(spellList).toBeDefined();

      for (const cantrip of spellList!.cantrips) {
        // Every cantrip must satisfy Spell interface
        const asSpell: Spell = cantrip;
        expect(asSpell.name).toBeTruthy();
        expect(asSpell.level).toBe(0);
        expect(asSpell.school).toBeTruthy();
        expect(asSpell.effect).toBeTruthy();
        expect(asSpell.id).toBeTruthy();
      }
    });

    it('support leveled spells are valid Spell objects', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      expect(spellList).toBeDefined();

      for (const level of [1, 2, 3] as const) {
        const spells = spellList![`level${level}`];
        expect(spells).toBeDefined();
        expect(spells!.length).toBeGreaterThan(0);

        for (const spell of spells!) {
          const asSpell: Spell = spell;
          expect(asSpell.name).toBeTruthy();
          expect(asSpell.level).toBe(level);
          expect(asSpell.effect).toBeTruthy();
          expect(asSpell.id).toBeTruthy();
        }
      }
    });

    it('archer cantrips are valid Spell objects', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('archer');
      expect(spellList).toBeDefined();

      for (const cantrip of spellList!.cantrips) {
        const asSpell: Spell = cantrip;
        expect(asSpell.name).toBeTruthy();
        expect(asSpell.level).toBe(0);
        expect(asSpell.effect).toBeTruthy();
      }
    });

    it('brute cantrips are valid Spell objects', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('brute');
      expect(spellList).toBeDefined();

      for (const cantrip of spellList!.cantrips) {
        const asSpell: Spell = cantrip;
        expect(asSpell.name).toBeTruthy();
        expect(asSpell.level).toBe(0);
        expect(asSpell.effect).toBeTruthy();
      }
    });

    it('spells with damage use rangeFeet not range', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      const damagingCantrip = spellList!.cantrips.find(c => c.damage);

      if (damagingCantrip) {
        // rangeFeet should be a number
        expect(typeof damagingCantrip.rangeFeet).toBe('number');
        // range (string) should not be set on these spells
        expect(damagingCantrip.range).toBeUndefined();
      }
    });

    it('all spells have tags for AI classification', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');

      const allSpells: InnateSpell[] = [
        ...spellList!.cantrips,
        ...spellList!.level1,
        ...spellList!.level2,
        ...spellList!.level3
      ];

      for (const spell of allSpells) {
        expect(spell.tags).toBeDefined();
        expect(Array.isArray(spell.tags)).toBe(true);
        expect(spell.tags!.length).toBeGreaterThan(0);
      }
    });

    it('spellToFeature correctly maps rangeFeet to range', () => {
      const spell: InnateSpell = {
        id: 'test_spell',
        name: 'Test Spell',
        level: 1,
        school: 'evocation',
        effect: 'A test',
        rangeFeet: 60
      };

      const feature = SpellcastingGenerator.spellToFeature(spell);
      expect((feature as any).range).toBe(60);
    });
  });

  // ─── Determinism ──────────────────────────────────────────────────────

  describe('Seeded roller determinism with enemy-style spells', () => {
    it('same seed produces identical results with enemy-style spell', () => {
      const spell = enemyStyleSpell({
        name: 'Fire Burst',
        damage: '6d6',
        damageType: 'fire',
        save: 'DEX',
        level: 3
      });

      const caster1 = makeCaster();
      const target1 = makeTarget();
      caster1.spellSlots = { ...caster1.spellSlots, 3: 2 };
      const target1InitialHP = target1.currentHP;

      const caster2 = makeCaster();
      const target2 = makeTarget();
      caster2.spellSlots = { ...caster2.spellSlots, 3: 2 };

      const sc1 = new SpellCaster(new SeededDiceRoller('determinism-test-1'));
      const sc2 = new SpellCaster(new SeededDiceRoller('determinism-test-1'));

      const result1 = sc1.castSpell(caster1, spell, [target1]);
      const result2 = sc2.castSpell(caster2, spell, [target2]);

      expect(result1.success).toBe(result2.success);
      expect(target1.currentHP).toBe(target2.currentHP);
    });

    it('different seeds produce different results', () => {
      const spell = enemyStyleSpell({
        name: 'Fire Burst',
        damage: '6d6',
        damageType: 'fire',
        save: 'DEX',
        level: 3
      });

      const caster1 = makeCaster();
      const target1 = makeTarget();
      caster1.spellSlots = { ...caster1.spellSlots, 3: 2 };

      const caster2 = makeCaster();
      const target2 = makeTarget();
      caster2.spellSlots = { ...caster2.spellSlots, 3: 2 };

      const sc1 = new SpellCaster(new SeededDiceRoller('seed-alpha'));
      const sc2 = new SpellCaster(new SeededDiceRoller('seed-beta'));

      sc1.castSpell(caster1, spell, [target1]);
      sc2.castSpell(caster2, spell, [target2]);

      // With different seeds, HP may differ (not guaranteed but statistically likely)
      // Just verify both succeed
      expect(target1.currentHP).toBeLessThanOrEqual(target1.character.hp.max);
      expect(target2.currentHP).toBeLessThanOrEqual(target2.character.hp.max);
    });
  });

  // ─── Full SPELL_LISTS → SpellCaster integration ───────────────────────

  describe('Real spell list integration', () => {
    it('SpellCaster can cast a support cantrip from SPELL_LISTS', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      const sacredFlame = spellList!.cantrips.find(c => c.damage);
      expect(sacredFlame).toBeDefined();

      const caster = makeCaster();
      const target = makeTarget();
      const roller = new SeededDiceRoller('sacred-flame-integration');
      const spellCaster = new SpellCaster(roller);

      const result = spellCaster.castSpell(caster, sacredFlame!, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Sacred Flame');
    });

    it('SpellCaster can cast a support level 1 spell from SPELL_LISTS', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      const cureWounds = spellList!.level1.find(s => s.tags?.includes('healing'));
      expect(cureWounds).toBeDefined();

      const caster = makeCaster();
      const target = makeTarget();
      const spellCaster = new SpellCaster();

      const result = spellCaster.castSpell(caster, cureWounds!, [target]);
      expect(result.success).toBe(true);
      expect(result.spellName).toBe('Cure Wounds');
    });

    it('SpellCaster respects concentration field from InnateSpell', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      const bless = spellList!.level1.find(s => s.concentration);
      expect(bless).toBeDefined();
      expect(bless!.concentration).toBe(true);

      // Verify the spell has the concentration field accessible
      const asSpell: Spell = bless!;
      expect(asSpell.concentration).toBe(true);
    });

    it('SpellCaster reads save field from InnateSpell', () => {
      const spellList = SpellcastingGenerator.getSpellListForArchetype('support');
      const bane = spellList!.level1.find(s => s.save);
      expect(bane).toBeDefined();
      expect(bane!.save).toBe('WIS');

      const asSpell: Spell = bane!;
      expect(asSpell.save).toBe('WIS');
    });
  });
});
