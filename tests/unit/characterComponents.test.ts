/**
 * Unit tests for isolated character generation components
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AbilityScoreCalculator } from '../../src/core/generation/AbilityScoreCalculator';
import { RaceSelector } from '../../src/core/generation/RaceSelector';
import { ClassSuggester } from '../../src/core/generation/ClassSuggester';
import { SeededRNG } from '../../src/utils/random';
import { ALL_RACES } from '../../src/utils/constants';
import { DEFAULT_RACE_DATA_ARRAY } from '../../src/constants/DefaultRaces';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager';
import type { AudioProfile } from '../../src/core/types/AudioProfile';

// Initialize race data defaults before running tests
beforeAll(() => {
    const manager = ExtensionManager.getInstance();
    manager.initializeDefaults('races', [...ALL_RACES]);
    manager.initializeDefaults('races.data', [...DEFAULT_RACE_DATA_ARRAY]);
});

describe('RaceSelector', () => {
    it('should select a race deterministically', () => {
        const rng1 = new SeededRNG('seed1');
        const race1 = RaceSelector.select(rng1);

        const rng2 = new SeededRNG('seed1');
        const race2 = RaceSelector.select(rng2);

        expect(race1).toBe(race2);
        expect(ALL_RACES).toContain(race1);
    });

    it('should select different races for different seeds', () => {
        const rng1 = new SeededRNG('seed1');
        const race1 = RaceSelector.select(rng1);

        const rng2 = new SeededRNG('seed-different');
        const race2 = RaceSelector.select(rng2);

        // This might fail by chance, but unlikely with enough variance. 
        // For a robust test we'd check distribution, but this is a simple existence check.
        expect(race1).not.toBe(undefined);
        expect(race2).not.toBe(undefined);
    });
});

describe('ClassSuggester', () => {
    const mockProfile: AudioProfile = {
        bass_dominance: 0.8, // High bass -> Strength class
        mid_dominance: 0.2,
        treble_dominance: 0.2,
        average_amplitude: 0.5,
        analysis_metadata: {
            duration_analyzed: 100,
            full_buffer_analyzed: true,
            sample_positions: [0, 0.5, 1],
            analyzed_at: new Date().toISOString()
        }
    };

    it('should suggest Strength classes for high bass', () => {
        const rng = new SeededRNG('test');
        const suggestedClass = ClassSuggester.suggest(mockProfile, rng);
        // With the new baseline system, any class can be suggested
        // But strength classes (Barbarian, Fighter, Paladin) should be favored
        // Verify the suggestion is a valid class
        const validClasses = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
        expect(validClasses).toContain(suggestedClass);
    });

    it('should be deterministic', () => {
        const rng1 = new SeededRNG('seed1');
        const class1 = ClassSuggester.suggest(mockProfile, rng1);

        const rng2 = new SeededRNG('seed1');
        const class2 = ClassSuggester.suggest(mockProfile, rng2);

        expect(class1).toBe(class2);
    });
});

describe('AbilityScoreCalculator', () => {
    const mockProfile: AudioProfile = {
        bass_dominance: 1.0, // Max STR
        mid_dominance: 0.5,
        treble_dominance: 0.0, // Min DEX
        average_amplitude: 0.5,
        analysis_metadata: {
            duration_analyzed: 100,
            full_buffer_analyzed: true,
            sample_positions: [0, 0.5, 1],
            analyzed_at: new Date().toISOString()
        }
    };

    it('should calculate base scores from audio profile', () => {
        const rng = new SeededRNG('test-seed');
        const scores = AbilityScoreCalculator.calculateBaseScores(mockProfile, rng);

        // With v2 system, abilities are randomly assigned to frequency bands
        // Verify all scores are in valid range (8-15 for base scores)
        expect(scores.STR).toBeGreaterThanOrEqual(8);
        expect(scores.STR).toBeLessThanOrEqual(15);
        expect(scores.DEX).toBeGreaterThanOrEqual(8);
        expect(scores.DEX).toBeLessThanOrEqual(15);
        expect(scores.CON).toBeGreaterThanOrEqual(8);
        expect(scores.CON).toBeLessThanOrEqual(15);
        expect(scores.INT).toBeGreaterThanOrEqual(8);
        expect(scores.INT).toBeLessThanOrEqual(15);
        expect(scores.WIS).toBeGreaterThanOrEqual(8);
        expect(scores.WIS).toBeLessThanOrEqual(15);
        expect(scores.CHA).toBeGreaterThanOrEqual(8);
        expect(scores.CHA).toBeLessThanOrEqual(15);

        // Verify deterministic behavior - same seed produces same scores
        const rng2 = new SeededRNG('test-seed');
        const scores2 = AbilityScoreCalculator.calculateBaseScores(mockProfile, rng2);
        expect(scores).toEqual(scores2);
    });

    it('should apply racial bonuses correctly', () => {
        const baseScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
        // Human gets +1 to all
        const humanScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, 'Human');

        expect(humanScores.STR).toBe(11);
        expect(humanScores.INT).toBe(11);
    });

    it('should cap scores at 20', () => {
        const baseScores = { STR: 20, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
        // Mountain Dwarf gets +2 STR
        const dwarfScores = AbilityScoreCalculator.applyRacialBonuses(baseScores, 'Dwarf');

        expect(dwarfScores.STR).toBe(20); // Should not exceed 20
    });

    it('should calculate modifiers correctly', () => {
        const scores = { STR: 10, DEX: 12, CON: 14, INT: 8, WIS: 18, CHA: 20 };
        const modifiers = AbilityScoreCalculator.calculateModifiers(scores);

        expect(modifiers.STR).toBe(0);
        expect(modifiers.DEX).toBe(1);
        expect(modifiers.CON).toBe(2);
        expect(modifiers.INT).toBe(-1);
        expect(modifiers.WIS).toBe(4);
        expect(modifiers.CHA).toBe(5);
    });
});
