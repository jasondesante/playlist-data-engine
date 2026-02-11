/**
 * Unit tests for PartyAnalyzer
 *
 * Tests party strength analysis and XP budget calculations
 * for D&D 5e encounter generation.
 */

import { describe, it, expect } from 'vitest';
import { PartyAnalyzer } from '../../src/core/combat/PartyAnalyzer';
import type { CharacterSheet } from '../../src/core/types/Character';
import type { Race } from '../../src/core/types/Character';

/**
 * Helper function to create a mock character with minimal required fields
 */
function createMockCharacter(overrides?: Partial<CharacterSheet>): CharacterSheet {
    // Create a valid Race type
    const race = 'Human' as Race;

    return {
        name: 'Test Character',
        race,
        class: 'Fighter' as any,
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
        hp: {
            current: 10,
            max: 10,
            temp: 0
        },
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
        seed: 'test-seed',
        generated_at: new Date().toISOString(),
        xp: {
            current: 0,
            next_level: 1000
        },
        ...overrides
    };
}

describe('PartyAnalyzer', () => {
    describe('calculatePartyLevel', () => {
        it('should return 1 for empty party', () => {
            const party: CharacterSheet[] = [];
            const level = PartyAnalyzer.calculatePartyLevel(party);
            expect(level).toBe(1);
        });

        it('should calculate average level for uniform party', () => {
            const party = [
                createMockCharacter({ level: 3 }),
                createMockCharacter({ level: 3 }),
                createMockCharacter({ level: 3 })
            ];
            const level = PartyAnalyzer.calculatePartyLevel(party);
            expect(level).toBe(3);
        });

        it('should calculate average level for mixed party (rounds down)', () => {
            const party = [
                createMockCharacter({ level: 1 }),
                createMockCharacter({ level: 2 }),
                createMockCharacter({ level: 5 }),
                createMockCharacter({ level: 10 })
            ];
            const level = PartyAnalyzer.calculatePartyLevel(party);
            // (1 + 2 + 5 + 10) / 4 = 4.5, rounded down = 4
            expect(level).toBe(4);
        });

        it('should handle single character party', () => {
            const party = [
                createMockCharacter({ level: 7 })
            ];
            const level = PartyAnalyzer.calculatePartyLevel(party);
            expect(level).toBe(7);
        });
    });

    describe('calculatePartyStrength', () => {
        it('should return 0 for empty party', () => {
            const party: CharacterSheet[] = [];
            const strength = PartyAnalyzer.calculatePartyStrength(party);
            expect(strength).toBe(0);
        });

        it('should calculate higher strength for party with more HP', () => {
            const lowHPParty = [
                createMockCharacter({ hp: { current: 10, max: 10, temp: 0 } }),
                createMockCharacter({ hp: { current: 10, max: 10, temp: 0 } })
            ];
            const highHPParty = [
                createMockCharacter({ hp: { current: 50, max: 50, temp: 0 } }),
                createMockCharacter({ hp: { current: 50, max: 50, temp: 0 } })
            ];

            const lowStrength = PartyAnalyzer.calculatePartyStrength(lowHPParty);
            const highStrength = PartyAnalyzer.calculatePartyStrength(highHPParty);

            expect(highStrength).toBeGreaterThan(lowStrength);
        });

        it('should calculate higher strength for party with higher AC', () => {
            const lowACParty = [
                createMockCharacter({ armor_class: 10 })
            ];
            const highACParty = [
                createMockCharacter({ armor_class: 20 })
            ];

            const lowStrength = PartyAnalyzer.calculatePartyStrength(lowACParty);
            const highStrength = PartyAnalyzer.calculatePartyStrength(highACParty);

            expect(highStrength).toBeGreaterThan(lowStrength);
        });

        it('should calculate higher strength for party with higher damage output', () => {
            const weakParty = [
                createMockCharacter({
                    ability_scores: { STR: 8, DEX: 8, CON: 8, INT: 10, WIS: 10, CHA: 10 },
                    ability_modifiers: { STR: -1, DEX: -1, CON: -1, INT: 0, WIS: 0, CHA: 0 }
                })
            ];
            const strongParty = [
                createMockCharacter({
                    ability_scores: { STR: 18, DEX: 18, CON: 18, INT: 10, WIS: 10, CHA: 10 },
                    ability_modifiers: { STR: 4, DEX: 4, CON: 4, INT: 0, WIS: 0, CHA: 0 }
                })
            ];

            const weakStrength = PartyAnalyzer.calculatePartyStrength(weakParty);
            const strongStrength = PartyAnalyzer.calculatePartyStrength(strongParty);

            expect(strongStrength).toBeGreaterThan(weakStrength);
        });

        it('should scale with party size (action economy)', () => {
            const smallParty = [
                createMockCharacter()
            ];
            const largeParty = [
                createMockCharacter(),
                createMockCharacter(),
                createMockCharacter(),
                createMockCharacter()
            ];

            const smallStrength = PartyAnalyzer.calculatePartyStrength(smallParty);
            const largeStrength = PartyAnalyzer.calculatePartyStrength(largeParty);

            expect(largeStrength).toBeGreaterThan(smallStrength);
        });
    });

    describe('getXPBudget', () => {
        it('should return 0 for empty party', () => {
            const party: CharacterSheet[] = [];
            const budget = PartyAnalyzer.getXPBudget(party, 'medium');
            expect(budget).toBe(0);
        });

        it('should calculate easy XP budget for level 1 party of 4', () => {
            const party = [
                createMockCharacter({ level: 1 }),
                createMockCharacter({ level: 1 }),
                createMockCharacter({ level: 1 }),
                createMockCharacter({ level: 1 })
            ];
            const budget = PartyAnalyzer.getXPBudget(party, 'easy');
            // Easy for level 1 = 25 XP per character
            // 25 × 4 = 100
            expect(budget).toBe(100);
        });

        it('should calculate medium XP budget for level 5 party of 4', () => {
            const party = [
                createMockCharacter({ level: 5 }),
                createMockCharacter({ level: 5 }),
                createMockCharacter({ level: 5 }),
                createMockCharacter({ level: 5 })
            ];
            const budget = PartyAnalyzer.getXPBudget(party, 'medium');
            // Medium for level 5 = 500 XP per character
            // 500 × 4 = 2000
            expect(budget).toBe(2000);
        });

        it('should calculate hard XP budget correctly', () => {
            const party = [
                createMockCharacter({ level: 3 }),
                createMockCharacter({ level: 3 })
            ];
            const budget = PartyAnalyzer.getXPBudget(party, 'hard');
            // Hard for level 3 = 225 XP per character
            // 225 × 2 = 450
            expect(budget).toBe(450);
        });

        it('should calculate deadly XP budget correctly', () => {
            const party = [
                createMockCharacter({ level: 10 })
            ];
            const budget = PartyAnalyzer.getXPBudget(party, 'deadly');
            // Deadly for level 10 = 2400 XP
            expect(budget).toBe(2400);
        });

        it('should scale with mixed level parties', () => {
            const party = [
                createMockCharacter({ level: 1 }),  // 50 XP (medium)
                createMockCharacter({ level: 5 }),  // 500 XP (medium)
                createMockCharacter({ level: 10 })  // 1200 XP (medium)
            ];
            const budget = PartyAnalyzer.getXPBudget(party, 'medium');
            // 50 + 500 + 1200 = 1750
            expect(budget).toBe(1750);
        });
    });

    describe('getAverageAC', () => {
        it('should return 10 for empty party', () => {
            const party: CharacterSheet[] = [];
            const ac = PartyAnalyzer.getAverageAC(party);
            expect(ac).toBe(10);
        });

        it('should calculate average AC for uniform party', () => {
            const party = [
                createMockCharacter({ armor_class: 15 }),
                createMockCharacter({ armor_class: 15 })
            ];
            const ac = PartyAnalyzer.getAverageAC(party);
            expect(ac).toBe(15);
        });

        it('should calculate average AC for mixed party (rounds)', () => {
            const party = [
                createMockCharacter({ armor_class: 10 }),
                createMockCharacter({ armor_class: 15 }),
                createMockCharacter({ armor_class: 20 })
            ];
            const ac = PartyAnalyzer.getAverageAC(party);
            // (10 + 15 + 20) / 3 = 15
            expect(ac).toBe(15);
        });

        it('should round down for non-integer averages', () => {
            const party = [
                createMockCharacter({ armor_class: 10 }),
                createMockCharacter({ armor_class: 15 })
            ];
            const ac = PartyAnalyzer.getAverageAC(party);
            // (10 + 15) / 2 = 12.5, rounds to 12 or 13
            expect(ac).toBeGreaterThanOrEqual(12);
            expect(ac).toBeLessThanOrEqual(13);
        });
    });

    describe('getAverageHP', () => {
        it('should return 10 for empty party', () => {
            const party: CharacterSheet[] = [];
            const hp = PartyAnalyzer.getAverageHP(party);
            expect(hp).toBe(10);
        });

        it('should calculate average HP for uniform party', () => {
            const party = [
                createMockCharacter({ hp: { current: 30, max: 30, temp: 0 } }),
                createMockCharacter({ hp: { current: 30, max: 30, temp: 0 } })
            ];
            const hp = PartyAnalyzer.getAverageHP(party);
            expect(hp).toBe(30);
        });

        it('should calculate average HP for mixed party', () => {
            const party = [
                createMockCharacter({ hp: { current: 10, max: 10, temp: 0 } }),
                createMockCharacter({ hp: { current: 20, max: 20, temp: 0 } }),
                createMockCharacter({ hp: { current: 50, max: 50, temp: 0 } })
            ];
            const hp = PartyAnalyzer.getAverageHP(party);
            // (10 + 20 + 50) / 3 = 26.67, rounds to 27
            expect(hp).toBeGreaterThanOrEqual(26);
            expect(hp).toBeLessThanOrEqual(27);
        });

        it('should use max HP for calculations', () => {
            const party = [
                createMockCharacter({
                    hp: { current: 5, max: 50, temp: 0 }
                })
            ];
            const hp = PartyAnalyzer.getAverageHP(party);
            // Should use max (50), not current (5)
            expect(hp).toBe(50);
        });
    });

    describe('getPartySize', () => {
        it('should return 0 for empty party', () => {
            const party: CharacterSheet[] = [];
            const size = PartyAnalyzer.getPartySize(party);
            expect(size).toBe(0);
        });

        it('should return correct party size', () => {
            const party = [
                createMockCharacter(),
                createMockCharacter(),
                createMockCharacter(),
                createMockCharacter()
            ];
            const size = PartyAnalyzer.getPartySize(party);
            expect(size).toBe(4);
        });

        it('should handle single character party', () => {
            const party = [
                createMockCharacter()
            ];
            const size = PartyAnalyzer.getPartySize(party);
            expect(size).toBe(1);
        });
    });

    describe('getAverageDamage', () => {
        it('should return 0 for empty party', () => {
            const party: CharacterSheet[] = [];
            const damage = PartyAnalyzer.getAverageDamage(party);
            expect(damage).toBe(0);
        });

        it('should estimate higher damage for high stat characters', () => {
            const weakParty = [
                createMockCharacter({
                    level: 1,
                    ability_scores: { STR: 8, DEX: 8, CON: 8, INT: 10, WIS: 10, CHA: 10 },
                    ability_modifiers: { STR: -1, DEX: -1, CON: -1, INT: 0, WIS: 0, CHA: 0 },
                    proficiency_bonus: 2
                })
            ];
            const strongParty = [
                createMockCharacter({
                    level: 5,
                    ability_scores: { STR: 18, DEX: 18, CON: 18, INT: 10, WIS: 10, CHA: 10 },
                    ability_modifiers: { STR: 4, DEX: 4, CON: 4, INT: 0, WIS: 0, CHA: 0 },
                    proficiency_bonus: 3
                })
            ];

            const weakDamage = PartyAnalyzer.getAverageDamage(weakParty);
            const strongDamage = PartyAnalyzer.getAverageDamage(strongParty);

            expect(strongDamage).toBeGreaterThan(weakDamage);
        });

        it('should scale with level (proficiency bonus)', () => {
            const lowLevelParty = [
                createMockCharacter({
                    level: 1,
                    ability_scores: { STR: 14, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
                    ability_modifiers: { STR: 2, DEX: 2, CON: 2, INT: 0, WIS: 0, CHA: 0 },
                    proficiency_bonus: 2
                })
            ];
            const highLevelParty = [
                createMockCharacter({
                    level: 10,
                    ability_scores: { STR: 14, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 10 },
                    ability_modifiers: { STR: 2, DEX: 2, CON: 2, INT: 0, WIS: 0, CHA: 0 },
                    proficiency_bonus: 4
                })
            ];

            const lowLevelDamage = PartyAnalyzer.getAverageDamage(lowLevelParty);
            const highLevelDamage = PartyAnalyzer.getAverageDamage(highLevelParty);

            expect(highLevelDamage).toBeGreaterThan(lowLevelDamage);
        });
    });

    describe('analyzeParty', () => {
        it('should return complete analysis for party', () => {
            const party = [
                createMockCharacter({
                    name: 'Fighter',
                    level: 5,
                    armor_class: 18,
                    hp: { current: 45, max: 45, temp: 0 },
                    ability_scores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 8 },
                    ability_modifiers: { STR: 3, DEX: 1, CON: 2, INT: 0, WIS: 0, CHA: -1 }
                }),
                createMockCharacter({
                    name: 'Cleric',
                    level: 5,
                    armor_class: 16,
                    hp: { current: 30, max: 30, temp: 0 },
                    ability_scores: { STR: 10, DEX: 8, CON: 12, INT: 10, WIS: 16, CHA: 14 },
                    ability_modifiers: { STR: 0, DEX: -1, CON: 1, INT: 0, WIS: 3, CHA: 2 }
                }),
                createMockCharacter({
                    name: 'Wizard',
                    level: 5,
                    armor_class: 12,
                    hp: { current: 25, max: 25, temp: 0 },
                    ability_scores: { STR: 8, DEX: 14, CON: 12, INT: 18, WIS: 14, CHA: 10 },
                    ability_modifiers: { STR: -1, DEX: 2, CON: 1, INT: 4, WIS: 2, CHA: 0 }
                }),
                createMockCharacter({
                    name: 'Rogue',
                    level: 5,
                    armor_class: 15,
                    hp: { current: 35, max: 35, temp: 0 },
                    ability_scores: { STR: 10, DEX: 16, CON: 12, INT: 12, WIS: 12, CHA: 14 },
                    ability_modifiers: { STR: 0, DEX: 3, CON: 1, INT: 1, WIS: 1, CHA: 2 }
                })
            ];

            const analysis = PartyAnalyzer.analyzeParty(party);

            expect(analysis.partySize).toBe(4);
            expect(analysis.averageLevel).toBe(5);
            expect(analysis.averageAC).toBe((18 + 16 + 12 + 15) / 4);
            expect(analysis.averageHP).toBe((45 + 30 + 25 + 35) / 4);
            expect(analysis.averageDamage).toBeGreaterThan(0);
            expect(analysis.totalStrength).toBeGreaterThan(0);

            // XP budgets from D&D 5e for level 5, party of 4
            expect(analysis.easyXP).toBe(250 * 4);   // 250 × 4 = 1000
            expect(analysis.mediumXP).toBe(500 * 4);  // 500 × 4 = 2000
            expect(analysis.hardXP).toBe(750 * 4);    // 750 × 4 = 3000
            expect(analysis.deadlyXP).toBe(1000 * 4); // 1000 × 4 = 4000
        });

        it('should handle single character party', () => {
            const party = [
                createMockCharacter({
                    name: 'Solo Hero',
                    level: 10,
                    armor_class: 20,
                    hp: { current: 100, max: 100, temp: 0 }
                })
            ];

            const analysis = PartyAnalyzer.analyzeParty(party);

            expect(analysis.partySize).toBe(1);
            expect(analysis.averageLevel).toBe(10);
            expect(analysis.averageAC).toBe(20);
            expect(analysis.averageHP).toBe(100);
            expect(analysis.easyXP).toBe(600);
            expect(analysis.mediumXP).toBe(1200);
            expect(analysis.hardXP).toBe(1800);
            expect(analysis.deadlyXP).toBe(2400);
        });

        it('should handle empty party gracefully', () => {
            const party: CharacterSheet[] = [];
            const analysis = PartyAnalyzer.analyzeParty(party);

            expect(analysis.partySize).toBe(0);
            expect(analysis.averageLevel).toBe(1);
            expect(analysis.averageAC).toBe(10);
            expect(analysis.averageHP).toBe(10);
            expect(analysis.averageDamage).toBe(0);
            expect(analysis.totalStrength).toBe(0);
            expect(analysis.easyXP).toBe(0);
            expect(analysis.mediumXP).toBe(0);
            expect(analysis.hardXP).toBe(0);
            expect(analysis.deadlyXP).toBe(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing hp object gracefully', () => {
            const party = [
                createMockCharacter({ hp: undefined as any })
            ];
            const hp = PartyAnalyzer.getAverageHP(party);
            expect(hp).toBeGreaterThanOrEqual(0);
        });

        it('should handle missing armor_class gracefully', () => {
            const party = [
                createMockCharacter({ armor_class: undefined as any })
            ];
            const ac = PartyAnalyzer.getAverageAC(party);
            expect(ac).toBeGreaterThanOrEqual(0);
        });

        it('should handle missing level gracefully', () => {
            const party = [
                createMockCharacter({ level: undefined as any })
            ];
            const level = PartyAnalyzer.calculatePartyLevel(party);
            expect(level).toBeGreaterThanOrEqual(0);
        });

        it('should handle missing ability_scores gracefully', () => {
            const party = [
                createMockCharacter({
                    ability_scores: undefined as any,
                    ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }
                })
            ];
            const damage = PartyAnalyzer.getAverageDamage(party);
            expect(damage).toBeGreaterThanOrEqual(0);
        });
    });
});
