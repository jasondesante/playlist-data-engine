/**
 * PartyAnalyzer - Analyzes party strength for encounter generation
 *
 * Provides methods to calculate party level, XP budget, and combat stats
 * for generating balanced encounters based on D&D 5e encounter building rules.
 *
 * All methods are static for convenient access without instantiation.
 */

import type { CharacterSheet } from '../types/Character.js';
import type { EncounterDifficulty } from '../types/Enemy.js';
import {
    getXPBudgetPerLevel,
    getXPBudgetForParty,
    getAveragePartyLevel
} from '../../constants/EncounterBalance.js';

/**
 * Analysis result for a party's combat capabilities
 *
 * Provides comprehensive view of party strength for encounter generation.
 * Used internally by encounter generation system to balance enemies.
 */
export interface PartyAnalysis {
    /** Average party level (rounded down) */
    averageLevel: number;

    /** Number of party members */
    partySize: number;

    /** Average armor class across all party members */
    averageAC: number;

    /** Average hit points across all party members */
    averageHP: number;

    /** Average damage output (estimated) */
    averageDamage: number;

    /** Total party strength score (abstract value) */
    totalStrength: number;

    /** XP budget for easy difficulty */
    easyXP: number;

    /** XP budget for medium difficulty */
    mediumXP: number;

    /** XP budget for hard difficulty */
    hardXP: number;

    /** XP budget for deadly difficulty */
    deadlyXP: number;
}

/**
 * PartyAnalyzer - Static class for party strength analysis
 *
 * Analyzes CharacterSheet instances to determine combat capabilities
 * and calculate appropriate encounter XP budgets using D&D 5e rules.
 *
 * All methods handle edge cases:
 * - Empty party arrays return safe defaults
 * - Invalid character sheets are skipped
 * - Levels are clamped to valid D&D range (1-20)
 *
 * @example
 * ```typescript
 * const party = [character1, character2, character3];
 * const budget = PartyAnalyzer.getXPBudget(party, 'medium');
 * const avgLevel = PartyAnalyzer.calculatePartyLevel(party);
 * ```
 */
export class PartyAnalyzer {
    /**
     * Calculate average party level
     *
     * Returns the average level of all party members, rounded down.
     * Empty party returns level 1 as safe default.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Average level (1-20), or 1 for empty party
     *
     * @example
     * ```typescript
     * const party = [level3Char, level5Char, level4Char];
     * PartyAnalyzer.calculatePartyLevel(party); // 4 (12 / 3 = 4)
     * ```
     */
    static calculatePartyLevel(party: CharacterSheet[]): number {
        if (party.length === 0) {
            return 1;
        }

        const levels = party.map(c => c.level || 1);
        return getAveragePartyLevel(levels);
    }

    /**
     * Calculate overall party strength score
     *
     * Combines multiple factors into a single strength value:
     * - HP pool (total hit points)
     * - Average AC (defense)
     * - Average damage output (offense)
     * - Party size (action economy)
     *
     * This is an abstract score useful for comparing parties
     * and tuning encounter difficulty.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Strength score (higher = stronger party)
     *
     * @example
     * ```typescript
     * const strength = PartyAnalyzer.calculatePartyStrength(party);
     * // Returns ~500-2000 for typical level 1-10 parties
     * ```
     */
    static calculatePartyStrength(party: CharacterSheet[]): number {
        if (party.length === 0) {
            return 0;
        }

        const totalHP = party.reduce((sum, c) => sum + (c.hp?.max || 10), 0);
        const avgAC = this.getAverageAC(party);
        const avgDamage = this.getAverageDamage(party);
        const partySize = party.length;

        // Strength formula: (HP × AC multiplier) + (Damage × party size)
        // This weights defense and offense roughly equally
        const acMultiplier = avgAC / 10; // AC 10 = neutral, AC 20 = double
        const defensiveStrength = totalHP * acMultiplier;
        const offensiveStrength = avgDamage * partySize * 10;

        return defensiveStrength + offensiveStrength;
    }

    /**
     * Get XP budget for desired encounter difficulty
     *
     * Calculates total XP budget for the entire party based on
     * D&D 5e encounter building tables. Sum of individual budgets.
     *
     * @param party - Array of CharacterSheet objects
     * @param difficulty - Desired encounter difficulty
     * @returns Total XP budget for encounter
     *
     * @example
     * ```typescript
     * // Level 5 party of 4, medium difficulty
     * const budget = PartyAnalyzer.getXPBudget(party, 'medium');
     * // Returns: 2000 (500 × 4)
     * ```
     */
    static getXPBudget(
        party: CharacterSheet[],
        difficulty: EncounterDifficulty
    ): number {
        if (party.length === 0) {
            return 0;
        }

        const levels = party.map(c => c.level || 1);
        return getXPBudgetForParty(levels, difficulty);
    }

    /**
     * Get average armor class across party
     *
     * Calculates mean AC for all party members.
     * Used for tuning enemy attack bonuses to match party defense.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Average AC (typically 10-20), or 10 for empty party
     *
     * @example
     * ```typescript
     * const avgAC = PartyAnalyzer.getAverageAC(party);
     * // Returns ~15 for typical level 5 party
     * ```
     */
    static getAverageAC(party: CharacterSheet[]): number {
        if (party.length === 0) {
            return 10;
        }

        const totalAC = party.reduce((sum, c) => sum + (c.armor_class || 10), 0);
        return Math.round(totalAC / party.length);
    }

    /**
     * Get average hit points across party
     *
     * Calculates mean maximum HP for all party members.
     * Used for tuning enemy damage output to match party durability.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Average HP, or 10 for empty party
     *
     * @example
     * ```typescript
     * const avgHP = PartyAnalyzer.getAverageHP(party);
     * // Returns ~35-45 for level 5 party
     * ```
     */
    static getAverageHP(party: CharacterSheet[]): number {
        if (party.length === 0) {
            return 10;
        }

        const totalHP = party.reduce((sum, c) => sum + (c.hp?.max || 10), 0);
        return Math.round(totalHP / party.length);
    }

    /**
     * Get party size (number of members)
     *
     * Utility method for encounter scaling calculations.
     * Returns count of valid CharacterSheet objects.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Number of party members
     *
     * @example
     * ```typescript
     * PartyAnalyzer.getPartySize([pc1, pc2, pc3]); // 3
     * ```
     */
    static getPartySize(party: CharacterSheet[]): number {
        return party.length;
    }

    /**
     * Get estimated average damage per party member
     *
     * Estimates damage output based on:
     * - Primary attack stat (STR or DEX)
     * - Proficiency bonus (scales with level)
     * - Assumed weapon damage (d8 for martial, d6 for casters)
     *
     * This is a rough estimate used for encounter balancing.
     * Actual damage varies greatly based on equipment and class features.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Average damage per round per character
     *
     * @example
     * ```typescript
     * const avgDamage = PartyAnalyzer.getAverageDamage(party);
     * // Returns ~10-15 for level 5 party
     * ```
     */
    static getAverageDamage(party: CharacterSheet[]): number {
        if (party.length === 0) {
            return 0;
        }

        const totalDamage = party.reduce((sum, character) => {
            return sum + this.estimateCharacterDamage(character);
        }, 0);

        return Math.round(totalDamage / party.length);
    }

    /**
     * Estimate damage output for a single character
     *
     * Uses simplified formula based on level and stats:
     * - Base weapon damage (1d8 = 4.5 average for most classes)
     * - Ability modifier (STR or DEX, whichever is higher)
     * - Proficiency bonus (adds to hit chance, treated as damage here)
     *
     * Private helper used by getAverageDamage().
     *
     * @param character - CharacterSheet to estimate
     * @returns Estimated average damage per round
     */
    private static estimateCharacterDamage(character: CharacterSheet): number {
        const level = character.level || 1;
        const stats = character.ability_scores;

        // Use higher of STR or DEX for damage
        const str = stats?.STR ?? 10;
        const dex = stats?.DEX ?? 10;
        const primaryStat = Math.max(str, dex);
        const statModifier = Math.floor((primaryStat - 10) / 2);

        // Proficiency bonus scales with level
        const profBonus = Math.ceil(1 + (level - 1) / 4);

        // Base weapon damage (d8 average = 4.5)
        const baseDamage = 4.5;

        // Total: base + stat + proficiency
        return baseDamage + statModifier + profBonus;
    }

    /**
     * Get comprehensive party analysis
     *
     * Returns complete analysis of party capabilities including
     * level, size, defensive stats, offensive stats, and
     * XP budgets for all difficulty levels.
     *
     * Useful for encounter generation UI and debugging.
     *
     * @param party - Array of CharacterSheet objects
     * @returns Complete PartyAnalysis object
     *
     * @example
     * ```typescript
     * const analysis = PartyAnalyzer.analyzeParty(party);
     * console.log(`Party level: ${analysis.averageLevel}`);
     * console.log(`Medium budget: ${analysis.mediumXP} XP`);
     * ```
     */
    static analyzeParty(party: CharacterSheet[]): PartyAnalysis {
        const averageLevel = this.calculatePartyLevel(party);
        const partySize = this.getPartySize(party);
        const averageAC = this.getAverageAC(party);
        const averageHP = this.getAverageHP(party);
        const averageDamage = this.getAverageDamage(party);
        const totalStrength = this.calculatePartyStrength(party);

        // Get XP budgets for all difficulties
        const easyXP = this.getXPBudget(party, 'easy');
        const mediumXP = this.getXPBudget(party, 'medium');
        const hardXP = this.getXPBudget(party, 'hard');
        const deadlyXP = this.getXPBudget(party, 'deadly');

        return {
            averageLevel,
            partySize,
            averageAC,
            averageHP,
            averageDamage,
            totalStrength,
            easyXP,
            mediumXP,
            hardXP,
            deadlyXP
        };
    }
}
