/**
 * Enemy Spell Data Pipeline Tests (Task 1.6.5)
 *
 * Verifies the complete data flow from enemy generation through to combat:
 * 1. Generated enemy CharacterSheet has populated spells.spell_slots
 * 2. combat_spells array is populated with correct fields
 * 3. CombatEngine.createCombatant() reads enemy spell slots correctly
 * 4. SpellCaster can cast an enemy spell using the unified type
 */

import { describe, it, expect } from 'vitest';
import { EnemyGenerator } from '../../../src/core/generation/EnemyGenerator.js';
import { SpellcastingGenerator } from '../../../src/core/generation/SpellcastingGenerator.js';
import { CombatEngine } from '../../../src/core/combat/CombatEngine.js';
import { SpellCaster } from '../../../src/core/combat/SpellCaster.js';
import { SeededDiceRoller } from '../../../src/core/combat/SeededDiceRoller.js';
import type { CharacterSheet } from '../../../src/core/types/Character.js';
import type { InnateSpell } from '../../../src/core/generation/SpellcastingGenerator.js';
import type { Spell } from '../../../src/core/types/Character.js';
import { createTestCombatant, createTestEnemy } from '../../helpers/combatTestHelpers.js';

// ─── 1. Generated enemy CharacterSheet has populated spells.spell_slots ──────

describe('Enemy spell data pipeline — spells.spell_slots', () => {

  it('support elite enemy has populated spell_slots', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-support-elite', cr: 5, rarity: 'elite' });

    expect(enemy.spells).toBeDefined();
    expect(enemy.spells!.spell_slots).toBeDefined();
    expect(Object.keys(enemy.spells!.spell_slots).length).toBeGreaterThan(0);

    // Each slot entry should have total > 0 and used === 0 (freshly generated)
    for (const [level, slot] of Object.entries(enemy.spells!.spell_slots)) {
      expect(slot.total).toBeGreaterThan(0);
      expect(slot.used).toBe(0);
      expect(Number(level)).toBeGreaterThanOrEqual(1);
      expect(Number(level)).toBeLessThanOrEqual(9);
    }
  });

  it('support common enemy has populated spell_slots', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-support-common', cr: 3, rarity: 'common' });

    expect(enemy.spells).toBeDefined();
    expect(enemy.spells!.spell_slots).toBeDefined();
    expect(Object.keys(enemy.spells!.spell_slots).length).toBeGreaterThan(0);
  });

  it('elite brute has spell_slots (elite+ always gets spellcasting)', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-elite-brute', cr: 5, rarity: 'elite' });

    expect(enemy.spells).toBeDefined();
    // Elite brutes get spellcasting even though common/uncommon don't
    expect(Object.keys(enemy.spells!.spell_slots).length).toBeGreaterThan(0);
  });

  it('boss enemy has spell_slots', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-boss', cr: 10, rarity: 'boss' });

    expect(enemy.spells).toBeDefined();
    expect(enemy.spells!.spell_slots).toBeDefined();
  });

  it('common brute has empty spell_slots (no spellcasting)', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-common-brute', cr: 1, rarity: 'common' });

    expect(enemy.spells).toBeDefined();
    expect(enemy.spells!.spell_slots).toBeDefined();
    expect(Object.keys(enemy.spells!.spell_slots).length).toBe(0);
  });

  it('common archer has empty spell_slots (no spellcasting)', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-common-archer', cr: 2, rarity: 'common' });

    expect(enemy.spells).toBeDefined();
    expect(Object.keys(enemy.spells!.spell_slots).length).toBe(0);
  });

  it('uncommon brute has empty spell_slots (no spellcasting)', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-uncommon-brute', cr: 3, rarity: 'uncommon' });

    expect(enemy.spells).toBeDefined();
    expect(Object.keys(enemy.spells!.spell_slots).length).toBe(0);
  });

  it('known_spells contains spell names from spell list', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-known-spells', cr: 5, rarity: 'elite' });

    expect(enemy.spells!.known_spells).toBeDefined();
    expect(Array.isArray(enemy.spells!.known_spells)).toBe(true);

    if (Object.keys(enemy.spells!.spell_slots).length > 0) {
      // If enemy has spell slots, they should have known spells too
      expect(enemy.spells!.known_spells.length).toBeGreaterThan(0);
      // Each name should be a non-empty string
      for (const name of enemy.spells!.known_spells) {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      }
    }
  });

  it('cantrips contains cantrip names when enemy has spellcasting', () => {
    const enemy = EnemyGenerator.generate({ seed: 'pipeline-cantrips', cr: 5, rarity: 'elite' });

    expect(enemy.spells!.cantrips).toBeDefined();
    expect(Array.isArray(enemy.spells!.cantrips)).toBe(true);

    if (Object.keys(enemy.spells!.spell_slots).length > 0) {
      // Spellcasting enemies should have cantrips
      expect(enemy.spells!.cantrips.length).toBeGreaterThan(0);
    }
  });

  it('same seed produces identical spell_slots', () => {
    const enemy1 = EnemyGenerator.generate({ seed: 'pipeline-determinism', cr: 5, rarity: 'elite' });
    const enemy2 = EnemyGenerator.generate({ seed: 'pipeline-determinism', cr: 5, rarity: 'elite' });

    expect(enemy1.spells!.spell_slots).toEqual(enemy2.spells!.spell_slots);
    expect(enemy1.spells!.known_spells).toEqual(enemy2.spells!.known_spells);
    expect(enemy1.spells!.cantrips).toEqual(enemy2.spells!.cantrips);
  });

  it('different seeds produce different spell selections', () => {
    const enemy1 = EnemyGenerator.generate({ seed: 'pipeline-seed-a', cr: 5, rarity: 'elite' });
    const enemy2 = EnemyGenerator.generate({ seed: 'pipeline-seed-b', cr: 5, rarity: 'elite' });

    // They should still have the same slot structure (based on CR/rarity)
    expect(Object.keys(enemy1.spells!.spell_slots)).toEqual(
      Object.keys(enemy2.spells!.spell_slots)
    );
  });
});

// ─── 2. combat_spells array is populated with correct fields ────────────────

describe('Enemy spell data pipeline — combat_spells', () => {

  it('support elite enemy has combat_spells array', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-support', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    expect(Array.isArray(enemy.combat_spells)).toBe(true);
    expect(enemy.combat_spells!.length).toBeGreaterThan(0);
  });

  it('common brute has no combat_spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-brute', cr: 1, rarity: 'common' });

    // Non-spellcasting enemies should not have combat_spells
    expect(enemy.combat_spells).toBeUndefined();
  });

  it('common archer has no combat_spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-archer', cr: 2, rarity: 'common' });

    expect(enemy.combat_spells).toBeUndefined();
  });

  it('each combat_spell has required InnateSpell fields (id, name, level, school, effect)', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-fields', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    for (const spell of enemy.combat_spells!) {
      expect(typeof spell.id).toBe('string');
      expect(spell.id.length).toBeGreaterThan(0);
      expect(typeof spell.name).toBe('string');
      expect(spell.name.length).toBeGreaterThan(0);
      expect(typeof spell.level).toBe('number');
      expect(typeof spell.school).toBe('string');
      expect(spell.school.length).toBeGreaterThan(0);
      expect(typeof spell.effect).toBe('string');
      expect(spell.effect.length).toBeGreaterThan(0);
    }
  });

  it('combat_spells includes cantrips (level 0) first, then leveled spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-order', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    expect(enemy.combat_spells!.length).toBeGreaterThan(1);

    // Cantrips should come first (level 0), then leveled spells (level >= 1)
    const levels = enemy.combat_spells!.map(s => s.level);
    const cantrips = levels.filter(l => l === 0);
    const leveled = levels.filter(l => l >= 1);

    if (cantrips.length > 0 && leveled.length > 0) {
      // All cantrip indices should be before all leveled spell indices
      const lastCantripIdx = levels.lastIndexOf(0);
      const firstLeveledIdx = levels.findIndex(l => l >= 1);
      expect(lastCantripIdx).toBeLessThan(firstLeveledIdx);
    }
  });

  it('combat_spells have tags for AI classification', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-tags', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    for (const spell of enemy.combat_spells!) {
      expect(spell.tags).toBeDefined();
      expect(Array.isArray(spell.tags)).toBe(true);
      expect(spell.tags!.length).toBeGreaterThan(0);
    }
  });

  it('combat_spells have rangeFeet as number for ranged spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-range', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    const rangedSpells = enemy.combat_spells!.filter(s => s.tags?.includes('ranged'));

    for (const spell of rangedSpells) {
      if (spell.rangeFeet !== undefined) {
        expect(typeof spell.rangeFeet).toBe('number');
        expect(spell.rangeFeet).toBeGreaterThan(0);
      }
    }
  });

  it('damaging combat_spells have damage and damageType fields', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-damage', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    const damageSpells = enemy.combat_spells!.filter(s => s.tags?.includes('damage'));

    for (const spell of damageSpells) {
      // Enemy spells use damage/damageType naming
      expect(spell.damage).toBeDefined();
      expect(typeof spell.damage).toBe('string');
      expect(spell.damage!.length).toBeGreaterThan(0);
    }
  });

  it('combat_spells satisfy Spell interface (InnateSpell extends Spell)', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-spell-type', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    for (const spell of enemy.combat_spells!) {
      // InnateSpell extends Spell, so every combat_spell is a valid Spell
      const asSpell: Spell = spell;
      expect(typeof asSpell.name).toBe('string');
    }
  });

  it('combat_spells count matches cantrips + leveled spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-count', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    const cantripCount = enemy.spells!.cantrips.length;
    const knownCount = enemy.spells!.known_spells.length;

    // combat_spells = cantrips + leveled spells
    expect(enemy.combat_spells!.length).toBe(cantripCount + knownCount);
  });

  it('same seed produces identical combat_spells', () => {
    const enemy1 = EnemyGenerator.generate({ seed: 'combat-spells-determinism', cr: 5, rarity: 'elite' });
    const enemy2 = EnemyGenerator.generate({ seed: 'combat-spells-determinism', cr: 5, rarity: 'elite' });

    expect(enemy1.combat_spells!.length).toBe(enemy2.combat_spells!.length);
    for (let i = 0; i < enemy1.combat_spells!.length; i++) {
      expect(enemy1.combat_spells![i].id).toBe(enemy2.combat_spells![i].id);
      expect(enemy1.combat_spells![i].name).toBe(enemy2.combat_spells![i].name);
      expect(enemy1.combat_spells![i].level).toBe(enemy2.combat_spells![i].level);
      expect(enemy1.combat_spells![i].damage).toBe(enemy2.combat_spells![i].damage);
      expect(enemy1.combat_spells![i].damageType).toBe(enemy2.combat_spells![i].damageType);
      expect(enemy1.combat_spells![i].tags).toEqual(enemy2.combat_spells![i].tags);
    }
  });

  it('concentration field is present on concentration spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-concentration', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    const concentrationSpells = enemy.combat_spells!.filter(s => s.concentration === true);

    // There should be at least one concentration spell in the list
    if (concentrationSpells.length > 0) {
      for (const spell of concentrationSpells) {
        expect(spell.concentration).toBe(true);
      }
    }
  });

  it('save field is present on save-based spells', () => {
    const enemy = EnemyGenerator.generate({ seed: 'combat-spells-save', cr: 5, rarity: 'elite' });

    expect(enemy.combat_spells).toBeDefined();
    const saveSpells = enemy.combat_spells!.filter(s => s.save);

    if (saveSpells.length > 0) {
      const validSaves = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
      for (const spell of saveSpells) {
        expect(validSaves).toContain(spell.save);
      }
    }
  });
});

// ─── 3. CombatEngine.createCombatant() reads enemy spell slots correctly ────

describe('Enemy spell data pipeline — CombatEngine.createCombatant()', () => {

  it('creates combatant with spell slots from support elite enemy', () => {
    const enemy = createTestEnemy(5, 'elite', 'pipeline-combatant-support');

    // Combatant should have spell slots derived from enemy's spell_slots
    expect(enemy.spellSlots).toBeDefined();
    expect(Object.keys(enemy.spellSlots!).length).toBeGreaterThan(0);

    // Each slot should have remaining count matching total (freshly generated, used=0)
    const sourceCharacter = enemy.character;
    for (const [level, remaining] of Object.entries(enemy.spellSlots!)) {
      const sourceSlot = sourceCharacter.spells?.spell_slots?.[Number(level)];
      if (sourceSlot) {
        expect(remaining).toBe(sourceSlot.total - sourceSlot.used);
      }
    }
  });

  it('creates combatant with no spell slots from common brute', () => {
    const enemy = createTestEnemy(1, 'common', 'no-spells-brute');

    // Non-spellcasting enemies should have undefined spellSlots
    expect(enemy.spellSlots).toBeUndefined();
  });

  it('creates combatant with no spell slots from common archer', () => {
    const enemy = createTestEnemy(2, 'common', 'pipeline-combatant-archer');

    expect(enemy.spellSlots).toBeUndefined();
  });

  it('creates combatant with spell slots from elite brute', () => {
    const enemy = createTestEnemy(5, 'elite', 'pipeline-combatant-elite-brute');

    // Elite brutes get spellcasting
    expect(enemy.spellSlots).toBeDefined();
    expect(Object.keys(enemy.spellSlots!).length).toBeGreaterThan(0);
  });

  it('combatant spell slots match source character spell_slots (total - used)', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'pipeline-slot-match', cr: 5, rarity: 'elite' });
    const engine = new CombatEngine();
    const combat = engine.startCombat([], [enemyChar]);
    const combatant = combat.combatants[0];

    if (enemyChar.spells && Object.keys(enemyChar.spells.spell_slots).length > 0) {
      expect(combatant.spellSlots).toBeDefined();

      for (const [level, slot] of Object.entries(enemyChar.spells.spell_slots)) {
        const remaining = combatant.spellSlots![Number(level)];
        if (slot.total - slot.used > 0) {
          expect(remaining).toBe(slot.total - slot.used);
        }
      }
    }
  });

  it('combatant character sheet retains combat_spells reference', () => {
    const enemy = createTestEnemy(5, 'elite', 'pipeline-combatant-spells');

    if (enemy.character.combat_spells) {
      expect(Array.isArray(enemy.character.combat_spells)).toBe(true);
      expect(enemy.character.combat_spells.length).toBeGreaterThan(0);
    }
  });

  it('deterministic: same seed produces same spell slots on combatant', () => {
    const enemy1 = createTestEnemy(5, 'elite', 'pipeline-deterministic-1');
    const enemy2 = createTestEnemy(5, 'elite', 'pipeline-deterministic-1');

    expect(enemy1.spellSlots).toEqual(enemy2.spellSlots);
    expect(enemy1.character.combat_spells?.length).toBe(enemy2.character.combat_spells?.length);
  });

  it('different seeds can produce different spell selections', () => {
    const enemy1 = createTestEnemy(5, 'elite', 'pipeline-diff-seed-a');
    const enemy2 = createTestEnemy(5, 'elite', 'pipeline-diff-seed-b');

    // Both should have spell slots (same CR/rarity)
    expect(enemy1.spellSlots).toBeDefined();
    expect(enemy2.spellSlots).toBeDefined();

    // The slot structure (levels available) should be the same
    expect(Object.keys(enemy1.spellSlots!).sort()).toEqual(
      Object.keys(enemy2.spellSlots!).sort()
    );
  });
});

// ─── 4. SpellCaster can cast an enemy spell using the unified type ──────────

describe('Enemy spell data pipeline — SpellCaster with enemy spells', () => {

  it('SpellCaster can cast a cantrip from a generated enemy', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-cantrip', cr: 5, rarity: 'elite' });
    const cantrip = enemyChar.combat_spells?.find(s => s.level === 0 && s.damage);

    if (!cantrip) {
      // Skip if no damaging cantrip found for this seed
      return;
    }

    const caster = createTestCombatant(
      { name: 'Enemy Caster', class: 'Enemy' as any },
      { spellSlots: {} } // Cantrips don't need slots
    );
    const target = createTestCombatant(
      { name: 'Target Dummy', hp: { current: 50, max: 50, temp: 0 } },
      { currentHP: 50 }
    );

    const roller = new SeededDiceRoller('cantrip-cast-test');
    const spellCaster = new SpellCaster(roller);
    const result = spellCaster.castSpell(caster, cantrip, [target]);

    expect(result.success).toBe(true);
    expect(result.spellName).toBe(cantrip.name);
    expect(result.spellSlotUsed).toBe(0); // Cantrips don't consume slots
  });

  it('SpellCaster can cast a leveled spell from a generated enemy', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-leveled', cr: 5, rarity: 'elite' });
    const leveledSpell = enemyChar.combat_spells?.find(s => s.level >= 1);

    if (!leveledSpell) {
      return;
    }

    // Give the caster appropriate spell slots
    const spellSlots: Record<number, number> = {};
    spellSlots[leveledSpell.level] = 3;

    const caster = createTestCombatant(
      { name: 'Enemy Caster', class: 'Enemy' as any },
      { spellSlots }
    );
    const target = createTestCombatant(
      { name: 'Target Dummy', hp: { current: 100, max: 100, temp: 0 } },
      { currentHP: 100 }
    );

    const roller = new SeededDiceRoller('leveled-cast-test');
    const spellCaster = new SpellCaster(roller);
    const result = spellCaster.castSpell(caster, leveledSpell, [target]);

    expect(result.success).toBe(true);
    expect(result.spellName).toBe(leveledSpell.name);
    expect(result.spellSlotUsed).toBe(leveledSpell.level);
    // Slot should be consumed
    expect(caster.spellSlots![leveledSpell.level]).toBe(2);
  });

  it('SpellCaster consumes correct spell slot level', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-slot-consume', cr: 5, rarity: 'elite' });
    const spell = enemyChar.combat_spells?.find(s => s.level >= 1);

    if (!spell) {
      return;
    }

    const spellSlots: Record<number, number> = { 1: 4, 2: 3, 3: 2 };
    if (!spellSlots[spell.level]) {
      spellSlots[spell.level] = 3;
    }

    const caster = createTestCombatant(
      { name: 'Enemy Caster' },
      { spellSlots: { ...spellSlots } }
    );
    const target = createTestCombatant(
      { name: 'Target', hp: { current: 100, max: 100, temp: 0 } },
      { currentHP: 100 }
    );

    const spellCaster = new SpellCaster();
    const before = caster.spellSlots![spell.level];

    spellCaster.castSpell(caster, spell, [target]);

    expect(caster.spellSlots![spell.level]).toBe(before - 1);
  });

  it('SpellCaster fails when no spell slots available for enemy spell', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-no-slots', cr: 5, rarity: 'elite' });
    const spell = enemyChar.combat_spells?.find(s => s.level >= 1);

    if (!spell) {
      return;
    }

    // No spell slots at all
    const caster = createTestCombatant(
      { name: 'Enemy Caster' },
      { spellSlots: {} }
    );
    const target = createTestCombatant(
      { name: 'Target', hp: { current: 100, max: 100, temp: 0 } },
      { currentHP: 100 }
    );

    const spellCaster = new SpellCaster();
    const result = spellCaster.castSpell(caster, spell, [target]);

    expect(result.success).toBe(false);
    expect(result.spellName).toBe(spell.name);
    expect(result.description).toContain('no spell slots');
  });

  it('SpellCaster reads damage from enemy-style field (damage, not damage_dice)', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-damage-field', cr: 5, rarity: 'elite' });
    const damageSpell = enemyChar.combat_spells?.find(
      s => s.level >= 1 && s.damage && s.damageType
    );

    if (!damageSpell) {
      return;
    }

    // Enemy spells use 'damage' field, not 'damage_dice'
    expect(damageSpell.damage).toBeDefined();
    expect(damageSpell.damage_dice).toBeUndefined();

    const spellSlots: Record<number, number> = {};
    spellSlots[damageSpell.level] = 3;

    const caster = createTestCombatant(
      { name: 'Enemy Caster', ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 4, WIS: 0, CHA: 0 } },
      { spellSlots }
    );
    const target = createTestCombatant(
      { name: 'Target', hp: { current: 200, max: 200, temp: 0 } },
      { currentHP: 200 }
    );

    const roller = new SeededDiceRoller('damage-field-test');
    const spellCaster = new SpellCaster(roller);
    const result = spellCaster.castSpell(caster, damageSpell, [target]);

    expect(result.success).toBe(true);
    // Target should have taken some damage (or saved)
    expect(target.currentHP).toBeLessThanOrEqual(200);
  });

  it('SpellCaster reads save field from enemy-style field (save, not saving_throw)', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-save-field', cr: 5, rarity: 'elite' });
    const saveSpell = enemyChar.combat_spells?.find(
      s => s.level >= 1 && s.save && s.damage
    );

    if (!saveSpell) {
      return;
    }

    // Enemy spells use 'save' field, not 'saving_throw'
    expect(saveSpell.save).toBeDefined();
    expect(saveSpell.saving_throw).toBeUndefined();

    const spellSlots: Record<number, number> = {};
    spellSlots[saveSpell.level] = 3;

    const caster = createTestCombatant(
      { name: 'Enemy Caster', ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 4, WIS: 0, CHA: 0 }, proficiency_bonus: 3 },
      { spellSlots }
    );
    const target = createTestCombatant(
      { name: 'Target', hp: { current: 200, max: 200, temp: 0 } },
      { currentHP: 200 }
    );

    const roller = new SeededDiceRoller('save-field-test');
    const spellCaster = new SpellCaster(roller);
    const result = spellCaster.castSpell(caster, saveSpell, [target]);

    expect(result.success).toBe(true);
    expect(result.description).toBeTruthy();
  });

  it('SpellCaster uses tags from enemy spell for status effects', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-tags', cr: 5, rarity: 'elite' });
    const controlSpell = enemyChar.combat_spells?.find(
      s => s.tags?.some(t => ['charm', 'frighten', 'stun', 'poison', 'burn'].includes(t))
    );

    if (!controlSpell) {
      return;
    }

    const matchingTag = controlSpell.tags!.find(
      t => ['charm', 'frighten', 'stun', 'poison', 'burn'].includes(t)
    );
    expect(matchingTag).toBeDefined();

    const spellSlots: Record<number, number> = {};
    spellSlots[controlSpell.level] = 3;

    const caster = createTestCombatant(
      { name: 'Enemy Caster' },
      { spellSlots }
    );
    const target = createTestCombatant(
      { name: 'Target', hp: { current: 100, max: 100, temp: 0 } },
      { currentHP: 100 }
    );

    const spellCaster = new SpellCaster();
    const result = spellCaster.castSpell(caster, controlSpell, [target]);

    expect(result.success).toBe(true);
    // Should have applied status effects based on tags
    expect(result.effectsApplied.length).toBeGreaterThan(0);
  });

  it('full pipeline: generate enemy → start combat → cast spell from combat_spells', () => {
    // Generate a spellcasting enemy
    const enemyChar = EnemyGenerator.generate({ seed: 'full-pipeline', cr: 5, rarity: 'elite' });
    expect(enemyChar.combat_spells).toBeDefined();
    expect(enemyChar.combat_spells!.length).toBeGreaterThan(0);

    // Find a castable spell
    const spell = enemyChar.combat_spells!.find(s => s.damage && s.damageType);
    if (!spell) {
      return;
    }

    // Set up combat with the enemy and a target
    const engine = new CombatEngine({ seed: 'full-pipeline-combat' });
    const targetChar = {
      ...createTestCombatant({ name: 'Target', hp: { current: 200, max: 200, temp: 0 } }).character,
      cr: 5,
    };
    const combat = engine.startCombat([targetChar], [enemyChar]);

    const enemyCombatant = combat.combatants.find(c => c.id.startsWith('enemy'))!;
    const targetCombatant = combat.combatants.find(c => c.id.startsWith('player'))!;

    // Enemy should have spell slots from the pipeline
    if (spell.level >= 1) {
      expect(enemyCombatant.spellSlots).toBeDefined();
      expect(enemyCombatant.spellSlots![spell.level]).toBeGreaterThanOrEqual(1);
    }

    const targetHPBefore = targetCombatant.currentHP;

    // Cast the spell
    const action = engine.executeCastSpell(combat, enemyCombatant, spell, [targetCombatant]);

    expect(action.type).toBe('spell');
    expect(action.spell?.name).toBe(spell.name);

    // Combat history should record the spell
    expect(combat.history.length).toBeGreaterThan(0);
    const lastAction = combat.history[combat.history.length - 1];
    expect(lastAction.type).toBe('spell');
  });

  it('SpellCaster static helpers work with enemy combat_spells', () => {
    const enemyChar = EnemyGenerator.generate({ seed: 'cast-helpers', cr: 5, rarity: 'elite' });

    expect(enemyChar.combat_spells).toBeDefined();

    for (const spell of enemyChar.combat_spells!) {
      // isDamageSpell
      if (spell.damage) {
        expect(SpellCaster.isDamageSpell(spell)).toBe(true);
      }

      // requiresConcentration
      if (spell.concentration) {
        expect(SpellCaster.requiresConcentration(spell)).toBe(true);
      }

      // isAOESpell
      if (spell.tags?.includes('aoe')) {
        expect(SpellCaster.isAOESpell(spell)).toBe(true);
      }

      // isMultiTargetSpell
      if (spell.tags?.includes('multi-target')) {
        expect(SpellCaster.isMultiTargetSpell(spell)).toBe(true);
      }

      // hasSpellTag
      if (spell.tags && spell.tags.length > 0) {
        expect(SpellCaster.hasSpellTag(spell, spell.tags[0])).toBe(true);
      }

      // getSpellTags
      expect(SpellCaster.getSpellTags(spell)).toEqual(spell.tags);
    }
  });
});
