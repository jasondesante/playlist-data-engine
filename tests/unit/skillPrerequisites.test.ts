/**
 * Unit tests for Skill Prerequisites
 *
 * Tests the SkillValidator.validateSkillPrerequisites() method
 * and SkillAssigner filtering of skills by prerequisites.
 *
 * Part of Phase 9.1: Write unit tests for skill prerequisites.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SkillValidator } from '../../src/core/skills/SkillValidator.js';
import { SkillQuery } from '../../src/core/skills/SkillQuery.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SkillAssigner } from '../../src/core/generation/SkillAssigner.js';
import { SeededRNG } from '../../src/utils/random.js';
import { DEFAULT_SKILLS } from '../../src/constants/DefaultSkills.js';
import { registerTestSkill } from '../helpers/registrationHelpers.js';
import type { CustomSkill, SkillPrerequisite } from '../../src/core/skills/SkillTypes.js';
import type { CharacterSheet } from '../../src/core/types/Character.js';

describe('Skill Prerequisites', () => {
    // Initialize ExtensionManager with default skills before each test
    beforeEach(() => {
        const em = ExtensionManager.getInstance();
        em.resetAll();
        em.initializeDefaults('skills', [...DEFAULT_SKILLS]);
    });

    afterEach(() => {
        const em = ExtensionManager.getInstance();
        em.resetAll();
    });

    describe('SkillValidator.validateSkillPrerequisites', () => {
        // Helper function to create a minimal character sheet
        function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
            return {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
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

        describe('No prerequisites', () => {
            it('should validate when no prerequisites are defined', () => {
                const character = createMockCharacter();
                const result = SkillValidator.validateSkillPrerequisites(undefined, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate when prerequisites is an empty object', () => {
                const character = createMockCharacter();
                const result = SkillValidator.validateSkillPrerequisites({}, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('Level prerequisite', () => {
            it('should validate when character meets level requirement', () => {
                const character = createMockCharacter({ level: 5 });
                const prerequisites: SkillPrerequisite = { level: 3 };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate when character exactly meets level requirement', () => {
                const character = createMockCharacter({ level: 5 });
                const prerequisites: SkillPrerequisite = { level: 5 };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character is below required level', () => {
                const character = createMockCharacter({ level: 2 });
                const prerequisites: SkillPrerequisite = { level: 5 };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires level 5 (current: 2)');
            });

            it('should fail when character is level 1 and requires level 10', () => {
                const character = createMockCharacter({ level: 1 });
                const prerequisites: SkillPrerequisite = { level: 10 };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires level 10 (current: 1)');
            });
        });

        describe('Ability score prerequisites', () => {
            it('should validate when character meets single ability requirement', () => {
                const character = createMockCharacter({
                    ability_scores: { STR: 16, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                const prerequisites: SkillPrerequisite = { abilities: { STR: 14 } };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate when character exactly meets ability requirement', () => {
                const character = createMockCharacter({
                    ability_scores: { STR: 14, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                const prerequisites: SkillPrerequisite = { abilities: { STR: 14 } };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character has lower ability score', () => {
                const character = createMockCharacter({
                    ability_scores: { STR: 12, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                const prerequisites: SkillPrerequisite = { abilities: { STR: 14 } };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires STR 14+ (current: 12)');
            });

            it('should validate when character meets all multiple ability requirements', () => {
                const character = createMockCharacter({
                    ability_scores: { STR: 14, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                const prerequisites: SkillPrerequisite = { abilities: { STR: 13, DEX: 13 } };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character fails one of multiple ability requirements', () => {
                const character = createMockCharacter({
                    ability_scores: { STR: 14, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                const prerequisites: SkillPrerequisite = { abilities: { STR: 13, DEX: 13 } };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });

            it('should fail when character has undefined ability score', () => {
                const character = createMockCharacter({
                    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                // Remove STR to test undefined handling
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (character.ability_scores as any).STR;
                const prerequisites: SkillPrerequisite = { abilities: { STR: 14 } };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires STR 14+ (current: 0)');
            });
        });

        describe('Class prerequisite', () => {
            it('should validate when character is required class', () => {
                const character = createMockCharacter({ class: 'Wizard' });
                const prerequisites: SkillPrerequisite = { class: 'Wizard' };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character is not the required class', () => {
                const character = createMockCharacter({ class: 'Fighter' });
                const prerequisites: SkillPrerequisite = { class: 'Wizard' };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires Wizard class (current: Fighter)');
            });

            it('should validate for all D&D 5e classes', () => {
                const classes = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];

                for (const characterClass of classes) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const character = createMockCharacter({ class: characterClass as any });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prerequisites: SkillPrerequisite = { class: characterClass as any };

                    const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                    expect(result.valid).toBe(true);
                    expect(result.errors).toEqual([]);
                }
            });
        });

        describe('Race prerequisite', () => {
            it('should validate when character is required race', () => {
                const character = createMockCharacter({ race: 'Elf' });
                const prerequisites: SkillPrerequisite = { race: 'Elf' };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character is not the required race', () => {
                const character = createMockCharacter({ race: 'Human' });
                const prerequisites: SkillPrerequisite = { race: 'Elf' };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires Elf race (current: Human)');
            });

            it('should validate for all D&D 5e races', () => {
                const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Dragonborn', 'Gnome', 'Half-Elf', 'Half-Orc', 'Tiefling'];

                for (const race of races) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const character = createMockCharacter({ race: race as any });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const prerequisites: SkillPrerequisite = { race: race as any };

                    const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                    expect(result.valid).toBe(true);
                    expect(result.errors).toEqual([]);
                }
            });
        });

        describe('Skill prerequisites', () => {
            it('should validate when character has required skill proficiency', () => {
                const character = createMockCharacter({
                    skills: { arcana: 'proficient' }
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate when character has required skill expertise', () => {
                const character = createMockCharacter({
                    skills: { arcana: 'expertise' }
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character does not have required skill', () => {
                const character = createMockCharacter({
                    skills: { arcana: 'none' }
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires proficiency in arcana (current: none)');
            });

            it('should fail when character skill is undefined', () => {
                const character = createMockCharacter({
                    skills: {}
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                // When skill is undefined in the skills object, it shows as undefined
                // The actual message depends on how the validator handles undefined values
                expect(result.errors.length).toBeGreaterThan(0);
            });

            it('should validate when character has all required skills', () => {
                const character = createMockCharacter({
                    skills: { arcana: 'proficient', history: 'proficient' }
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana', 'history'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character lacks one of multiple required skills', () => {
                const character = createMockCharacter({
                    skills: { arcana: 'proficient', history: 'none' }
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana', 'history'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors.length).toBeGreaterThan(0);
            });

            it('should accept expertise for proficiency requirements', () => {
                const character = createMockCharacter({
                    skills: { arcana: 'expertise', stealth: 'expertise' }
                });
                const prerequisites: SkillPrerequisite = { skills: ['arcana', 'stealth'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('Feature prerequisites', () => {
            it('should validate when character has required feature', () => {
                const character = createMockCharacter({
                    class_features: ['draconic_bloodline']
                });
                const prerequisites: SkillPrerequisite = { features: ['draconic_bloodline'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character lacks required feature', () => {
                const character = createMockCharacter({
                    class_features: ['spellcasting']
                });
                const prerequisites: SkillPrerequisite = { features: ['draconic_bloodline'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires feature: draconic_bloodline');
            });

            it('should fail when character has no features', () => {
                const character = createMockCharacter({
                    class_features: []
                });
                const prerequisites: SkillPrerequisite = { features: ['draconic_bloodline'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires feature: draconic_bloodline');
            });

            it('should validate when character has all required features', () => {
                const character = createMockCharacter({
                    class_features: ['draconic_bloodline', 'elemental_affinity']
                });
                const prerequisites: SkillPrerequisite = { features: ['draconic_bloodline', 'elemental_affinity'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character lacks one of multiple required features', () => {
                const character = createMockCharacter({
                    class_features: ['draconic_bloodline']
                });
                const prerequisites: SkillPrerequisite = { features: ['draconic_bloodline', 'dragon_wings'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires feature: dragon_wings');
            });
        });

        describe('Spell prerequisites', () => {
            it('should validate when character knows required spell (in known_spells)', () => {
                const character = createMockCharacter({
                    spells: {
                        spell_slots: {},
                        known_spells: ['fireball'],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = { spells: ['fireball'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate when character knows required spell (in cantrips)', () => {
                const character = createMockCharacter({
                    spells: {
                        spell_slots: {},
                        known_spells: [],
                        cantrips: ['firebolt']
                    }
                });
                const prerequisites: SkillPrerequisite = { spells: ['firebolt'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character does not know required spell', () => {
                const character = createMockCharacter({
                    spells: {
                        spell_slots: {},
                        known_spells: ['magic_missile'],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = { spells: ['fireball'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires spell: fireball');
            });

            it('should fail when character has no spells', () => {
                const character = createMockCharacter();
                const prerequisites: SkillPrerequisite = { spells: ['fireball'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires spell: fireball');
            });

            it('should validate when character knows all required spells', () => {
                const character = createMockCharacter({
                    spells: {
                        spell_slots: {},
                        known_spells: ['fireball', 'lightning_bolt'],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = { spells: ['fireball', 'lightning_bolt'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should validate when spells are split between known_spells and cantrips', () => {
                const character = createMockCharacter({
                    spells: {
                        spell_slots: {},
                        known_spells: ['fireball'],
                        cantrips: ['firebolt']
                    }
                });
                const prerequisites: SkillPrerequisite = { spells: ['fireball', 'firebolt'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when character lacks one of multiple required spells', () => {
                const character = createMockCharacter({
                    spells: {
                        spell_slots: {},
                        known_spells: ['fireball'],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = { spells: ['fireball', 'lightning_bolt'] };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires spell: lightning_bolt');
            });
        });

        describe('Custom prerequisite', () => {
            it('should validate with custom prerequisite (notes custom but does not fail)', () => {
                const character = createMockCharacter();
                const prerequisites: SkillPrerequisite = { custom: 'Must have slain a dragon' };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                // Custom prerequisites cannot be automatically validated
                // They should be checked by the calling code
                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });

        describe('Combined prerequisites (AND logic)', () => {
            it('should validate when all prerequisites are met', () => {
                const character = createMockCharacter({
                    level: 5,
                    class: 'Sorcerer',
                    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 16 },
                    skills: { arcana: 'proficient' },
                    class_features: ['draconic_bloodline'],
                    spells: {
                        spell_slots: {},
                        known_spells: ['fireball'],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = {
                    level: 5,
                    class: 'Sorcerer',
                    abilities: { CHA: 14 },
                    skills: ['arcana'],
                    features: ['draconic_bloodline'],
                    spells: ['fireball']
                };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });

            it('should fail when one prerequisite is not met', () => {
                const character = createMockCharacter({
                    level: 3, // Too low
                    class: 'Sorcerer',
                    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 16 },
                    skills: { arcana: 'proficient' },
                    class_features: ['draconic_bloodline'],
                    spells: {
                        spell_slots: {},
                        known_spells: ['fireball'],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = {
                    level: 5,
                    class: 'Sorcerer',
                    abilities: { CHA: 14 }
                };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                expect(result.errors).toContain('Requires level 5 (current: 3)');
            });

            it('should report all unmet prerequisites', () => {
                const character = createMockCharacter({
                    level: 2,
                    class: 'Fighter',
                    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
                    skills: {},
                    class_features: [],
                    spells: {
                        spell_slots: {},
                        known_spells: [],
                        cantrips: []
                    }
                });
                const prerequisites: SkillPrerequisite = {
                    level: 5,
                    class: 'Sorcerer',
                    abilities: { CHA: 14 },
                    skills: ['arcana'],
                    features: ['draconic_bloodline'],
                    spells: ['fireball']
                };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(false);
                // Should have multiple errors
                expect(result.errors.length).toBeGreaterThan(3);
                expect(result.errors).toContain('Requires level 5 (current: 2)');
                expect(result.errors).toContain('Requires Sorcerer class (current: Fighter)');
                expect(result.errors).toContain('Requires CHA 14+ (current: 10)');
            });

            it('should handle race + class + level combination', () => {
                const character = createMockCharacter({
                    level: 10,
                    race: 'Elf',
                    class: 'Wizard',
                    ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
                });
                const prerequisites: SkillPrerequisite = {
                    level: 10,
                    race: 'Elf',
                    class: 'Wizard'
                };

                const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

                expect(result.valid).toBe(true);
                expect(result.errors).toEqual([]);
            });
        });
    });

    describe('SkillQuery.validatePrerequisites', () => {
        function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
            return {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
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

        it('should delegate to SkillValidator.validateSkillPrerequisites', () => {
            const registry = SkillQuery.getInstance();
            const character = createMockCharacter({ level: 5 });

            const skill: CustomSkill = {
                id: 'test_skill',
                name: 'Test Skill',
                ability: 'INT',
                prerequisites: { level: 3 },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(skill, character);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should return unmet prerequisites through registry', () => {
            const registry = SkillQuery.getInstance();
            const character = createMockCharacter({ level: 2 });

            const skill: CustomSkill = {
                id: 'test_skill',
                name: 'Test Skill',
                ability: 'INT',
                prerequisites: { level: 5 },
                source: 'custom'
            };

            const result = registry.validatePrerequisites(skill, character);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires level 5 (current: 2)');
        });

        it('should handle skill with no prerequisites', () => {
            const registry = SkillQuery.getInstance();
            const character = createMockCharacter();

            const skill: CustomSkill = {
                id: 'test_skill',
                name: 'Test Skill',
                ability: 'INT',
                source: 'custom'
            };

            const result = registry.validatePrerequisites(skill, character);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    });

    describe('SkillAssigner filtering by prerequisites', () => {
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
                    INT: 14,
                    WIS: 10,
                    CHA: 10
                },
                ability_modifiers: {
                    STR: 0,
                    DEX: 0,
                    CON: 0,
                    INT: 2,
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

        it('should assign skills with no prerequisites when character is provided', () => {
            const registry = SkillQuery.getInstance();

            // Register a custom skill with no prerequisites
            const customSkill: CustomSkill = {
                id: 'basic_skill',
                name: 'Basic Skill',
                ability: 'INT',
                source: 'custom'
            };
            registerTestSkill(customSkill);

            const character = createMockCharacter();
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // All default skills should be present
            expect(skills).toHaveProperty('arcana');
            expect(skills).toHaveProperty('history');
        });

        it('should filter out skills with unmet level prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a high-level skill
            const advancedSkill: CustomSkill = {
                id: 'advanced_arcana',
                name: 'Advanced Arcana',
                ability: 'INT',
                prerequisites: { level: 10 },
                source: 'custom'
            };
            registerTestSkill(advancedSkill);

            // Create a level 1 Wizard
            const character = createMockCharacter({ level: 1 });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The advanced skill should be present but not proficient (prerequisites not met)
            expect(skills).toHaveProperty('advanced_arcana');
            expect(skills['advanced_arcana']).toBe('none');
        });

        it('should allow skills with met level prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill that requires level 5
            const midLevelSkill: CustomSkill = {
                id: 'mid_level_skill',
                name: 'Mid Level Skill',
                ability: 'INT',
                prerequisites: { level: 5 },
                source: 'custom'
            };
            registerTestSkill(midLevelSkill);

            // Create a level 10 Wizard
            const character = createMockCharacter({ level: 10 });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The skill should be present
            expect(skills).toHaveProperty('mid_level_skill');
        });

        it('should filter out skills with unmet ability prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill that requires high INT
            const highIntSkill: CustomSkill = {
                id: 'high_int_skill',
                name: 'High INT Skill',
                ability: 'INT',
                prerequisites: { abilities: { INT: 18 } },
                source: 'custom'
            };
            registerTestSkill(highIntSkill);

            // Create a character with INT 14
            const character = createMockCharacter({
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 14, WIS: 10, CHA: 10 },
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 2, WIS: 0, CHA: 0 }
            });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The skill should be present but not proficient (prerequisites not met)
            expect(skills).toHaveProperty('high_int_skill');
            expect(skills['high_int_skill']).toBe('none');
        });

        it('should filter out skills with unmet class prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a Sorcerer-only skill
            const sorcererSkill: CustomSkill = {
                id: 'sorcerer_only',
                name: 'Sorcerer Only',
                ability: 'CHA',
                prerequisites: { class: 'Sorcerer' },
                source: 'custom'
            };
            registerTestSkill(sorcererSkill);

            // Create a Wizard
            const character = createMockCharacter({ class: 'Wizard' });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The skill should be present but not proficient (wrong class)
            expect(skills).toHaveProperty('sorcerer_only');
            expect(skills['sorcerer_only']).toBe('none');
        });

        it('should filter out skills with unmet race prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register an Elf-only skill
            const elfSkill: CustomSkill = {
                id: 'elf_skill',
                name: 'Elf Skill',
                ability: 'DEX',
                prerequisites: { race: 'Elf' },
                source: 'custom'
            };
            registerTestSkill(elfSkill);

            // Create a Human character
            const character = createMockCharacter({ race: 'Human' });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The skill should be present but not proficient (wrong race)
            expect(skills).toHaveProperty('elf_skill');
            expect(skills['elf_skill']).toBe('none');
        });

        it('should filter out skills with unmet skill prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill that requires arcana proficiency
            const advancedSkill: CustomSkill = {
                id: 'advanced_arcana_research',
                name: 'Advanced Arcana Research',
                ability: 'INT',
                prerequisites: { skills: ['arcana'] },
                source: 'custom'
            };
            registerTestSkill(advancedSkill);

            // Create a character without arcana proficiency
            const character = createMockCharacter({ skills: {} });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The skill should be present but not proficient (missing prerequisite skill)
            expect(skills).toHaveProperty('advanced_arcana_research');
            expect(skills['advanced_arcana_research']).toBe('none');
        });

        it('should filter out skills with unmet feature prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill that requires a specific feature
            const dragonSkill: CustomSkill = {
                id: 'dragon_blood_mastery',
                name: 'Dragon Blood Mastery',
                ability: 'CHA',
                prerequisites: { features: ['draconic_bloodline'] },
                source: 'custom'
            };
            registerTestSkill(dragonSkill);

            // Create a character without the feature
            const character = createMockCharacter({ class_features: [] });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Sorcerer', rng, character);

            // The skill should be present but not proficient (missing feature)
            expect(skills).toHaveProperty('dragon_blood_mastery');
            expect(skills['dragon_blood_mastery']).toBe('none');
        });

        it('should filter out skills with unmet spell prerequisites', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill that requires knowing fireball
            const pyromancySkill: CustomSkill = {
                id: 'pyromancy_mastery',
                name: 'Pyromancy Mastery',
                ability: 'INT',
                prerequisites: { spells: ['fireball'] },
                source: 'custom'
            };
            registerTestSkill(pyromancySkill);

            // Create a character without fireball
            const character = createMockCharacter({
                spells: {
                    spell_slots: {},
                    known_spells: ['magic_missile'],
                    cantrips: []
                }
            });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng, character);

            // The skill should be present but not proficient (missing spell)
            expect(skills).toHaveProperty('pyromancy_mastery');
            expect(skills['pyromancy_mastery']).toBe('none');
        });

        it('should work without character parameter (backward compatibility)', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill with prerequisites
            const skillWithPrereqs: CustomSkill = {
                id: 'prereq_skill',
                name: 'Prerequisite Skill',
                ability: 'INT',
                prerequisites: { level: 10 },
                source: 'custom'
            };
            registerTestSkill(skillWithPrereqs);

            // Call without character parameter (backward compatibility)
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Wizard', rng);

            // Should still work and include the skill
            expect(skills).toHaveProperty('prereq_skill');
        });

        it('should handle combined prerequisites correctly', () => {
            const registry = SkillQuery.getInstance();

            // Register a skill with multiple prerequisites
            const dragonSmithing: CustomSkill = {
                id: 'dragon_smithing',
                name: 'Dragon Smithing',
                ability: 'INT',
                prerequisites: {
                    features: ['draconic_bloodline'],
                    level: 5,
                    class: 'Sorcerer'
                },
                source: 'custom'
            };
            registerTestSkill(dragonSmithing);

            // Create a character that meets all prerequisites
            const character = createMockCharacter({
                class: 'Sorcerer',
                level: 5,
                class_features: ['draconic_bloodline'],
                ability_scores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 14 },
                ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 2 }
            });
            const rng = new SeededRNG('test-seed');
            const skills = SkillAssigner.assignSkills('Sorcerer', rng, character);

            // The skill should be present (all prerequisites met)
            expect(skills).toHaveProperty('dragon_smithing');
        });
    });

    describe('Dragon-only skills (feature-based)', () => {
        function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
            return {
                name: 'Test Character',
                race: 'Human',
                class: 'Sorcerer',
                level: 5,
                ability_scores: {
                    STR: 10,
                    DEX: 10,
                    CON: 10,
                    INT: 10,
                    WIS: 10,
                    CHA: 16
                },
                ability_modifiers: {
                    STR: 0,
                    DEX: 0,
                    CON: 0,
                    INT: 0,
                    WIS: 0,
                    CHA: 3
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
                class_features: ['draconic_bloodline'],
                xp: { current: 0, next_level: 1000 },
                seed: 'test-seed',
                generated_at: new Date().toISOString(),
                ...overrides
            };
        }

        it('should allow dragon skill for character with draconic bloodline', () => {
            const registry = SkillQuery.getInstance();

            const dragonSkill: CustomSkill = {
                id: 'dragon_scalesmithing',
                name: 'Dragon Scalesmithing',
                ability: 'INT',
                prerequisites: {
                    features: ['draconic_bloodline'],
                    level: 5,
                    class: 'Sorcerer'
                },
                source: 'custom'
            };
            registerTestSkill(dragonSkill);

            const character = createMockCharacter();
            const result = SkillValidator.validateSkillPrerequisites(dragonSkill.prerequisites, character);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should deny dragon skill for character without draconic bloodline', () => {
            const registry = SkillQuery.getInstance();

            const dragonSkill: CustomSkill = {
                id: 'dragon_scalesmithing',
                name: 'Dragon Scalesmithing',
                ability: 'INT',
                prerequisites: {
                    features: ['draconic_bloodline'],
                    level: 5,
                    class: 'Sorcerer'
                },
                source: 'custom'
            };
            registerTestSkill(dragonSkill);

            const character = createMockCharacter({
                class_features: ['wild_magic'] // Wrong feature
            });
            const result = SkillValidator.validateSkillPrerequisites(dragonSkill.prerequisites, character);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires feature: draconic_bloodline');
        });
    });

    describe('Edge cases', () => {
        function createMockCharacter(overrides: Partial<CharacterSheet> = {}): CharacterSheet {
            return {
                name: 'Test Character',
                race: 'Human',
                class: 'Fighter',
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

        it('should handle empty skill proficiency object', () => {
            const character = createMockCharacter({ skills: {} });
            const prerequisites: SkillPrerequisite = { skills: ['arcana'] };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(false);
        });

        it('should handle undefined class_features', () => {
            const character = createMockCharacter();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (character as any).class_features;
            const prerequisites: SkillPrerequisite = { features: ['test_feature'] };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(false);
        });

        it('should handle undefined spells object', () => {
            const character = createMockCharacter();
            const prerequisites: SkillPrerequisite = { spells: ['fireball'] };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(false);
        });

        it('should handle zero as valid ability score', () => {
            const character = createMockCharacter({
                ability_scores: { STR: 0, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            const prerequisites: SkillPrerequisite = { abilities: { STR: 1 } };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Requires STR 1+ (current: 0)');
        });

        it('should handle level 20 character', () => {
            const character = createMockCharacter({ level: 20 });
            const prerequisites: SkillPrerequisite = { level: 20 };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should handle very high ability scores (20+)', () => {
            const character = createMockCharacter({
                ability_scores: { STR: 20, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
            });
            const prerequisites: SkillPrerequisite = { abilities: { STR: 18 } };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should handle expertise level for skill prerequisites', () => {
            const character = createMockCharacter({
                skills: { stealth: 'expertise' }
            });
            const prerequisites: SkillPrerequisite = { skills: ['stealth'] };

            const result = SkillValidator.validateSkillPrerequisites(prerequisites, character);

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });
    });
});
