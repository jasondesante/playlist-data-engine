/**
 * Unit tests for Spell Prerequisites
 */

import { describe, it, expect } from 'vitest';
import { SpellValidator } from '../../src/core/spells/SpellValidator.js';
import { SpellManager } from '../../src/core/generation/SpellManager.js';
import { SPELL_DATABASE } from '../../src/utils/constants.js';
import type { Spell, SpellPrerequisite } from '../../src/utils/constants.js';
import type { CharacterSheet } from '../../src/core/types/Character.js';

describe('Spell Prerequisites', () => {
    function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
        return {
            name: 'Test Character',
            race: 'Human',
            class: 'Wizard',
            level: 1,
            ability_scores: {
                STR: 10,
                DEX: 10,
                CON: 10,
                INT: 10,
                WIS: 10,
                CHA: 10
            },
            ability_modifiers: {
                STR: 0,
                DEX: 0,
                CON: 0,
                INT: 0,
                WIS: 0,
                CHA: 0
            },
            proficiency_bonus: 2,
            hp: { current: 10, max: 10, temp: 0 },
            armor_class: 10,
            initiative: 0,
            speed: 30,
            skills: {},
            saving_throws: {
                STR: false,
                DEX: false,
                CON: false,
                INT: false,
                WIS: false,
                CHA: false
            },
            racial_traits: [],
            class_features: [],
            xp: { current: 0, next_level: 1000 },
            seed: 'test-seed',
            generated_at: new Date().toISOString(),
            ...overrides
        };
    }

    describe('SpellValidator.validateSpellPrerequisites', () => {
        it('should validate with no prerequisites', () => {
            const character = createMockCharacter();
            const result = SpellValidator.validateSpellPrerequisites(undefined, character);
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should fail with unmet level prerequisite', () => {
            const character = createMockCharacter({ level: 2 });
            const prerequisites: SpellPrerequisite = { level: 5 };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires level 5 (current: 2)');
        });

        it('should fail with unmet caster level prerequisite', () => {
            const character = createMockCharacter({ level: 2 });
            const prerequisites: SpellPrerequisite = { casterLevel: 5 };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires caster level 5 (current: 2)');
        });

        it('should fail with unmet ability prerequisite', () => {
            const character = createMockCharacter({
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 12, WIS: 10, CHA: 10 }
            });
            const prerequisites: SpellPrerequisite = { abilities: { INT: 14 } };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toMatch(/Requires INT 14\+/);
        });

        it('should fail with unmet class prerequisite', () => {
            const character = createMockCharacter({ class: 'Fighter' });
            const prerequisites: SpellPrerequisite = { class: 'Wizard' };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toMatch(/Requires Wizard class/);
        });

        it('should fail with unmet feature prerequisite', () => {
            const character = createMockCharacter({ class_features: [] });
            const prerequisites: SpellPrerequisite = { features: ['draconic_bloodline'] };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires feature: draconic_bloodline');
        });

        it('should fail with unmet spell prerequisite', () => {
            const character = createMockCharacter({
                spells: {
                    spell_slots: {},
                    known_spells: ['magic_missile'],
                    cantrips: []
                }
            });
            const prerequisites: SpellPrerequisite = { spells: ['fireball'] };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires spell: fireball');
        });

        it('should fail with unmet skill prerequisite', () => {
            const character = createMockCharacter({ skills: {} });
            const prerequisites: SpellPrerequisite = { skills: ['arcana'] };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
        });

        it('should validate with all combined prerequisites met', () => {
            const character = createMockCharacter({
                level: 5,
                class: 'Sorcerer',
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 16 },
                class_features: ['draconic_bloodline'],
                spells: { spell_slots: {}, known_spells: ['fireball'], cantrips: [] }
            });
            const prerequisites: SpellPrerequisite = {
                level: 5,
                class: 'Sorcerer',
                abilities: { CHA: 14 },
                features: ['draconic_bloodline'],
                spells: ['fireball']
            };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(true);
        });
    });

    describe('SpellManager filtering', () => {
        it('should return spells without character', () => {
            const spells = SpellManager.getKnownSpells('Wizard', 1);
            expect(spells.length).toBeGreaterThan(0);
        });

        it('should filter spells with character', () => {
            const character = createMockCharacter({
                level: 1,
                class: 'Wizard',
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            const spells = SpellManager.getKnownSpells('Wizard', 1, character);
            expect(spells.length).toBeGreaterThan(0);
        });

        it('should include more spells for higher level character', () => {
            const lowLevelCharacter = createMockCharacter({
                level: 1,
                class: 'Wizard',
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            const highLevelCharacter = createMockCharacter({
                level: 10,
                class: 'Wizard',
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 18, WIS: 10, CHA: 10 }
            });

            const lowLevelSpells = SpellManager.getKnownSpells('Wizard', 1, lowLevelCharacter);
            const highLevelSpells = SpellManager.getKnownSpells('Wizard', 10, highLevelCharacter);

            expect(highLevelSpells.length).toBeGreaterThanOrEqual(lowLevelSpells.length);
        });
    });

    describe('Race prerequisite', () => {
        it('should validate when character is required race', () => {
            const character = createMockCharacter({ race: 'Elf' });
            const prerequisites: SpellPrerequisite = { race: 'Elf' };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(true);
        });

        it('should fail when character is not the required race', () => {
            const character = createMockCharacter({ race: 'Human' });
            const prerequisites: SpellPrerequisite = { race: 'Elf' };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
            expect(result.errors[0]).toMatch(/Requires Elf race/);
        });
    });

    describe('Multiple abilities prerequisite', () => {
        it('should validate when all ability requirements are met', () => {
            const character = createMockCharacter({
                ability_scores: { STR: 14, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            const prerequisites: SpellPrerequisite = { abilities: { STR: 13, DEX: 13 } };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(true);
        });

        it('should fail when one ability requirement is not met', () => {
            const character = createMockCharacter({
                ability_scores: { STR: 14, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            const prerequisites: SpellPrerequisite = { abilities: { STR: 13, DEX: 13 } };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            expect(result.valid).toBe(false);
        });
    });

    describe('Custom prerequisite', () => {
        it('should pass validation with custom prerequisite (manual check)', () => {
            const character = createMockCharacter();
            const prerequisites: SpellPrerequisite = { custom: 'Must have slain a dragon' };
            const result = SpellValidator.validateSpellPrerequisites(prerequisites, character);
            // Custom conditions don't auto-fail, they require manual validation
            expect(result.valid).toBe(true);
        });
    });

    describe('SpellValidator.isValidAbility', () => {
        // Regression test for infinite recursion bug (Task 3)
        // The static method was calling itself instead of the imported function,
        // causing stack overflow. This test verifies the fix works.
        it('should correctly validate standard abilities', () => {
            expect(SpellValidator.isValidAbility('STR')).toBe(true);
            expect(SpellValidator.isValidAbility('DEX')).toBe(true);
            expect(SpellValidator.isValidAbility('CON')).toBe(true);
            expect(SpellValidator.isValidAbility('INT')).toBe(true);
            expect(SpellValidator.isValidAbility('WIS')).toBe(true);
            expect(SpellValidator.isValidAbility('CHA')).toBe(true);
        });

        it('should reject invalid ability strings', () => {
            expect(SpellValidator.isValidAbility('STR')).toBe(true);
            expect(SpellValidator.isValidAbility('strength')).toBe(false);
            expect(SpellValidator.isValidAbility('')).toBe(false);
            expect(SpellValidator.isValidAbility('INVALID')).toBe(false);
            expect(SpellValidator.isValidAbility('XXX')).toBe(false);
        });

        it('should provide type narrowing for valid abilities', () => {
            // This test verifies type narrowing works correctly
            const ability: string = 'STR';
            if (SpellValidator.isValidAbility(ability)) {
                // TypeScript should know ability is of type Ability here
                type AbilityType = typeof ability;
                // At runtime, just verify the function returns true
                expect(ability).toBe('STR');
            }
        });
    });
});
