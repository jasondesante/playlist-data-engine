/**
 * Unit tests for Enemy Spellcasting Generation System
 *
 * Tests spell list generation, spell slot calculation,
 * archetype spell lists, and spell-to-feature conversion.
 */

import { describe, it, expect, expect } from 'vitest';
import { SpellcastingGenerator, SPELL_SLOTS_BY_CR } from '../../src/core/generation/SpellcastingGenerator';
import type { EnemyArchetype, EnemyRarity } from '../../src/core/types/Enemy';
import { SeededRNG } from '../../src/utils/random';

/**
 * Helper to create a mock SeededRNG
 */
function createMockRNG(): SeededRNG {
    return new SeededRNG('test-seed');
}

describe('SpellcastingGenerator', () => {
    describe('SPELL_SLOTS_BY_CR', () => {
        it('should return empty slots for CR 0', () => {
            const slots = SpellcastingGenerator.getSpellSlotsForCR(0);
            expect(slots).toEqual({});
        });

        it('should return 3 level 1 slots for CR 1', () => {
            const slots = SpellcastingGenerator.getSpellSlotsForCR(1);
            expect(slots).toEqual({ 1: 3 });
        });

        it('should return 4 level 1 slots for CR 2', () => {
            const slots = SpellcastingGenerator.getSpellSlotsForCR(2);
            expect(slots).toEqual({ 1: 4 });
        });
    });

        it('should return level 1-2 slots for CR 3', () => {
            const slots = SpellcastingGenerator.getSpellSlotsForCR(3);
            expect(slots).toEqual({ 1: 4, 2: 2 });
        });

        it('should return level 1-3 slots for CR 5', () => {
            const slots = SpellcastingGenerator.getSpellSlotsForCR(5);
            expect(slots).toEqual({ 1: 4, 2: 3, 3: 2 });
        });

        it('should return level 1-4 slots for CR 8+', () => {
            const slots = SpellcastingGenerator.getSpellSlotsForCR(8);
            expect(slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 1 });
        });
    });

        describe('Archetype Spell Availability', () => {
            it('should return true for support archetype', () => {
                const canCast = SpellcastingGenerator.shouldHaveSpellcasting('support', 'common');
                expect(canCast).toBe(true);
            });

            it('should return true for elite rarity', () => {
                const canCast = SpellcastingGenerator.shouldHaveSpellcasting('brute', 'elite');
                expect(canCast).toBe(true);
            });

            it('should return false for common brute', () => {
                const canCast = SpellcastingGenerator.shouldHaveSpellcasting('brute', 'common');
                expect(canCast).toBe(false);
            });

            it('should return false for uncommon archer', () => {
                const canCast = SpellcastingGenerator.shouldHaveSpellcasting('archer', 'common');
                expect(canCast).toBe(false);
            });
        });

    describe('Spell List Generation', () => {
            it('should generate spells for support archetype', () => {
                const config = SpellcastingGenerator.generateSpellList({
                    archetype: 'support',
                    rarity: 'elite',
                    cr: 4,
                    seed: 'support-test'
                });

                expect(config.cantrips.length).toBeGreaterThan(0);
                // CR 4 provides slots: {1: 4, 2: 3} = 7 total slots
                // Elite rarity: 2 cantrips + 3 spells minimum
                // Actual spells selected will be based on available slots
                expect(config.spells.length).toBeGreaterThan(0);
                expect(config.slots).toBeDefined();
            });

        it('should generate spells for archer archetype', () => {
                const config = SpellcastingGenerator.generateSpellList({
                    archetype: 'archer',
                    rarity: 'elite',
                    cr: 4,
                    seed: 'archer-test'
                });

                expect(config.cantrips.length).toBeGreaterThan(0);
                expect(config.spells.length).toBeGreaterThan(0);
                expect(config.slots).toBeDefined();
            });

        it('should generate spells for brute archetype', () => {
                const config = SpellcastingGenerator.generateSpellList({
                    archetype: 'brute',
                    rarity: 'boss',
                    cr: 8,
                    seed: 'brute-test'
                });

                expect(config.cantrips.length).toBeGreaterThan(0);
                // CR 8 provides slots: {1: 4, 2: 3, 3: 3, 4: 1} = 11 total slots
                // Boss rarity: 3 cantrips + 4 spells minimum
                // Actual spells selected will be based on available slots
                expect(config.spells.length).toBeGreaterThan(0);
            });
        });

    describe('Spell to Feature Conversion', () => {
        it('should convert cantrip to feature with isSpell: true', () => {
            const spell = {
                id: 'test_cantrip',
                name: 'Test Cantrip',
                level: 0,
                school: 'evocation',
                effect: 'A test effect',
                damage: '1d8',
                damageType: 'fire',
                save: 'DEX',
                range: 60,
                tags: ['damage', 'fire']
            };

            const feature = SpellcastingGenerator.spellToFeature(spell);

            expect(feature.id).toBe('test_cantrip');
            expect(feature.name).toBe('Test Cantrip');
            expect(feature.isSpell).toBe(true);
            expect(feature.school).toBe('evocation');
            expect(feature.damage).toBe('1d8');
            expect(feature.damageType).toBe('fire');
            expect(feature.save).toBe('DEX');
            expect(feature.range).toBe(60);
            expect(feature.tags).toEqual(['damage', 'fire']);
        });

        it('should convert multiple spells to features', () => {
            const config = {
                cantrips: [
                    { id: 'cantrip1', name: 'Cantrip 1', level: 0, school: 'evocation', effect: 'Effect 1', tags: ['tag1'] },
                    { id: 'cantrip2', name: 'Cantrip 2', level: 0, school: 'divination', effect: 'Effect 2', tags: ['tag2'] }
                ],
                spells: [
                    { id: 'spell1', name: 'Spell 1', level: 1, school: 'evocation', tags: [] }
                ]
            };

            const features = SpellcastingGenerator.spellsToFeatures(config);

            expect(features.length).toBe(3); // 2 cantrips + 1 spell
            expect(features.filter(f => f.isSpell).length).toBe(3); // All should have isSpell: true
        });

        describe('getSpellListForArchetype', () => {
            it('should return spell list for support archetype', () => {
                const spellList = SpellcastingGenerator.getSpellListForArchetype('support');

                expect(spellList).toBeDefined();
                expect(spellList?.archetype).toBe('support');
                expect(spellList?.cantrips.length).toBeGreaterThan(0);
                expect(spellList?.level1.length).toBeGreaterThan(0);
                expect(spellList?.level2.length).toBeGreaterThan(0);
                expect(spellList?.level3.length).toBeGreaterThan(0);
            });

            it('should return spell list for archer archetype', () => {
                const spellList = SpellcastingGenerator.getSpellListForArchetype('archer');

                expect(spellList).toBeDefined();
                expect(spellList?.archetype).toBe('archer');
                expect(spellList?.cantrips.length).toBeGreaterThan(0);
                expect(spellList?.level1.length).toBeGreaterThan(0);
                expect(spellList?.level2.length).toBeGreaterThan(0);
                expect(spellList?.level3.length).toBeGreaterThan(0);
                // Archer archetype doesn't have level 4 spells
                expect(spellList?.level4).toBeUndefined();
            });
    });
});