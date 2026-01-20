/**
 * LevelUpProcessor - Handles character leveling mechanics
 * Based on specs/001-core-engine/SPEC.md and D&D 5e rules
 */

import type { CharacterSheet, Class as CharacterClass } from '../types/Character.js';
import { CLASS_DATA, PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';
import { SeededRNG } from '../../utils/random.js';

/**
 * Level-up benefits returned after processing a level-up
 */
export interface LevelUpBenefits {
    newLevel: number;
    hitPointIncrease: number;
    newHitPointsTotal: number;
    proficiencyBonusIncrease: number;
    newProficiencyBonus: number;
    abilityScoreIncrease?: {
        ability: 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
        increase: number;
    };
    newSpellSlots?: Record<number, number>;
    classFeatures?: string[];
}

/**
 * Ability score increase levels in D&D 5e
 * Characters get +2 to one ability, or +1 to two abilities
 */
const ABILITY_SCORE_INCREASE_LEVELS = [4, 8, 12, 16, 19];

/**
 * LevelUpProcessor class - Processes character level-ups
 * Handles HP increases, ability score improvements, spell slots, and features
 */
export class LevelUpProcessor {
    /**
     * Process a character level-up
     * @param character - The character to level up
     * @param newLevel - The new level (should be previous level + 1 for normal progression)
     * @param seed - Optional seed for deterministic HP rolls
     * @returns Benefits granted by leveling up
     */
    static processLevelUp(
        character: CharacterSheet,
        newLevel: number,
        seed?: string
    ): LevelUpBenefits {
        if (newLevel < 1 || newLevel > 20) {
            throw new Error('Level must be between 1 and 20');
        }

        const classData = CLASS_DATA[character.class];
        if (!classData) {
            throw new Error(`Unknown class: ${character.class}`);
        }

        // Calculate hit points
        const hitPointIncrease = this.calculateHPIncrease(
            classData.hit_die,
            character.ability_modifiers.CON,
            seed
        );

        const newHitPointsTotal = character.hp.max + hitPointIncrease;

        // Get new proficiency bonus
        const newProficiencyBonus = PROFICIENCY_BONUS[newLevel];
        const proficiencyBonusIncrease = newProficiencyBonus - character.proficiency_bonus;

        // Create benefits object
        const benefits: LevelUpBenefits = {
            newLevel,
            hitPointIncrease,
            newHitPointsTotal,
            proficiencyBonusIncrease,
            newProficiencyBonus,
        };

        // Check for ability score increase (levels 4, 8, 12, 16, 19)
        if (ABILITY_SCORE_INCREASE_LEVELS.includes(newLevel)) {
            benefits.abilityScoreIncrease = {
                ability: 'STR', // Default, can be customized by caller
                increase: 2,
            };
        }

        // Calculate new spell slots if spellcaster
        if (this.isSpellcaster(character.class)) {
            benefits.newSpellSlots = this.calculateSpellSlots(newLevel);
        }

        // Get class features for this level
        benefits.classFeatures = this.getClassFeaturesForLevel(character.class, newLevel);

        return benefits;
    }

    /**
     * Apply a level-up to a character
     * @param character - The character to level up
     * @param benefits - Benefits from processLevelUp
     * @returns Updated character
     */
    static applyLevelUp(character: CharacterSheet, benefits: LevelUpBenefits): CharacterSheet {
        const updated = { ...character };

        // Update level and HP
        updated.level = benefits.newLevel;
        updated.hp.max = benefits.newHitPointsTotal;
        updated.hp.current = Math.min(updated.hp.current + benefits.hitPointIncrease, updated.hp.max);
        updated.proficiency_bonus = benefits.newProficiencyBonus;

        // Apply ability score increase if applicable
        if (benefits.abilityScoreIncrease) {
            const ability = benefits.abilityScoreIncrease.ability;
            updated.ability_scores[ability] = Math.min(
                20,
                updated.ability_scores[ability] + benefits.abilityScoreIncrease.increase
            );

            // Recalculate modifier
            const newScore = updated.ability_scores[ability];
            updated.ability_modifiers[ability] = Math.floor((newScore - 10) / 2);
        }

        // Update spell slots if applicable
        if (benefits.newSpellSlots && updated.spells) {
            updated.spells.spell_slots = benefits.newSpellSlots as any;
        }

        // Add class features
        if (benefits.classFeatures) {
            updated.class_features = [
                ...new Set([...updated.class_features, ...benefits.classFeatures]),
            ];
        }

        return updated;
    }

    /**
     * Calculate HP increase for a level
     * @param hitDie - The hit die size (d6, d8, d10, d12)
     * @param conModifier - Constitution modifier
     * @param seed - Optional seed for deterministic rolling
     * @returns HP increase
     */
    private static calculateHPIncrease(
        hitDie: number,
        conModifier: number,
        seed?: string
    ): number {
        let roll: number;

        if (seed) {
            // Deterministic roll using seed
            const rng = new SeededRNG(seed);
            roll = rng.randomInt(1, hitDie + 1);
        } else {
            // Random roll
            roll = Math.floor(Math.random() * hitDie) + 1;
        }

        // Minimum of 1 HP per level
        return Math.max(1, roll + conModifier);
    }

    /**
     * Check if a class is a spellcaster
     * @param characterClass - The character class
     * @returns True if the class can cast spells
     */
    private static isSpellcaster(characterClass: CharacterClass): boolean {
        const spellcasters = [
            'Bard',
            'Cleric',
            'Druid',
            'Paladin',
            'Ranger',
            'Sorcerer',
            'Warlock',
            'Wizard',
        ];
        return spellcasters.includes(characterClass);
    }

    /**
     * Calculate spell slots for a level
     * Based on D&D 5e spell slot progression
     * @param characterClass - The character class
     * @param level - The character level
     * @returns Record of spell slots by level
     */
    private static calculateSpellSlots(
        level: number
    ): Record<number, number> {
        // Spell slot progression varies by class
        // This is a simplified version - fuller implementation would use CLASS_SPELL_LISTS
        // For now, return a basic progression

        const slots: Record<number, number> = {
            1: 0, // Cantrips don't use slots
        };

        // Based on character level, populate slot counts
        // This is simplified; full implementation would reference D&D 5e tables
        for (let slotLevel = 1; slotLevel <= 9; slotLevel++) {
            slots[slotLevel] = this.getSpellSlotCount(level, slotLevel);
        }

        return slots;
    }

    /**
     * Get spell slot count for a specific slot level
     * Simplified version - would be expanded in full implementation
     * @param characterLevel - The character level
     * @param slotLevel - The spell slot level (1-9)
     * @returns Number of slots available
     */
    private static getSpellSlotCount(
        characterLevel: number,
        slotLevel: number
    ): number {
        // Simplified spell slot progression
        // In a full implementation, this would use actual D&D 5e tables
        if (slotLevel > Math.ceil(characterLevel / 2)) {
            return 0; // Can't cast spells of this level yet
        }

        if (characterLevel < 1) return 0;
        if (characterLevel < 3) return slotLevel === 1 ? 2 : 0;
        if (characterLevel < 5) return slotLevel === 1 ? 3 : slotLevel === 2 ? 2 : 0;
        if (characterLevel < 7) return slotLevel === 1 ? 4 : slotLevel === 2 ? 3 : 0;
        if (characterLevel < 9) return slotLevel === 1 ? 4 : slotLevel === 2 ? 4 : slotLevel === 3 ? 2 : 0;

        // Higher levels get more slots - simplified progression
        return Math.min(5, Math.ceil(characterLevel / 2));
    }

    /**
     * Get class features gained at a specific level
     * @param characterClass - The character class
     * @param level - The level
     * @returns Array of feature names
     */
    private static getClassFeaturesForLevel(characterClass: CharacterClass, level: number): string[] {
        const features: string[] = [];

        // Level 1 features are granted during character creation
        // This handles features gained at higher levels

        if (level === 2) {
            if (characterClass === 'Barbarian') features.push('Reckless Attack');
            if (characterClass === 'Bard') features.push('Jack of All Trades');
            if (characterClass === 'Cleric') features.push('Channel Divinity');
            if (characterClass === 'Druid') features.push('Wild Shape');
            if (characterClass === 'Fighter') features.push('Fighting Style');
            if (characterClass === 'Monk') features.push('Martial Arts');
            if (characterClass === 'Paladin') features.push('Lay on Hands');
            if (characterClass === 'Ranger') features.push('Fighting Style');
            if (characterClass === 'Rogue') features.push('Cunning Action');
            if (characterClass === 'Sorcerer') features.push('Font of Magic');
            if (characterClass === 'Warlock') features.push('Eldritch Invocations');
            if (characterClass === 'Wizard') features.push('Arcane Recovery');
        }

        if (level === 3) {
            if (characterClass === 'Barbarian') features.push('Primal Path');
            if (characterClass === 'Bard') features.push('Bard College');
            if (characterClass === 'Fighter') features.push('Fighting Archetype');
            if (characterClass === 'Monk') features.push('Monastic Tradition');
            if (characterClass === 'Ranger') features.push('Ranger Archetype');
            if (characterClass === 'Rogue') features.push('Roguish Archetype');
            if (characterClass === 'Sorcerer') features.push('Sorcerous Origin');
            if (characterClass === 'Wizard') features.push('Arcane Tradition');
        }

        if (level === 5) {
            features.push('Extra Attack'); // Most martial classes
        }

        if (level === 11) {
            if (characterClass === 'Bard') features.push('Magical Secrets');
            if (characterClass === 'Warlock') features.push('Mystic Arcanum');
        }

        if (level === 20) {
            features.push('Epic Boon'); // All classes
        }

        return features;
    }

    /**
     * Get the XP threshold for a specific level
     * Using D&D 5e standard progression from constants
     * @param level - The level (1-20)
     * @returns XP required to reach that level
     */
    static getXPThreshold(level: number): number {
        if (level < 1 || level > 20) {
            throw new Error('Level must be between 1 and 20');
        }

        return XP_THRESHOLDS[level];
    }

    /**
     * Calculate level from total XP
     * @param totalXP - Total experience points
     * @returns Character level (1-20)
     */
    static calculateLevel(totalXP: number): number {
        for (let level = 20; level >= 1; level--) {
            if (totalXP >= this.getXPThreshold(level)) {
                return level;
            }
        }
        return 1;
    }

    /**
     * Get XP needed to reach next level
     * @param currentLevel - Current character level
     * @returns XP needed to advance to next level
     */
    static getXPToNextLevel(currentLevel: number): number {
        if (currentLevel >= 20) {
            return 0; // Already at max level
        }

        const currentThreshold = this.getXPThreshold(currentLevel);
        const nextThreshold = this.getXPThreshold(currentLevel + 1);

        return nextThreshold - currentThreshold;
    }

    /**
     * Get progress to next level as a percentage
     * @param currentLevel - Current level
     * @param currentXP - Total XP within level thresholds
     * @returns Percentage (0-100) towards next level
     */
    static getProgressPercentage(currentLevel: number, currentXP: number): number {
        if (currentLevel >= 20) {
            return 100;
        }

        const currentThreshold = this.getXPThreshold(currentLevel);
        const nextThreshold = this.getXPThreshold(currentLevel + 1);

        const progressXP = currentXP - currentThreshold;
        const totalXP = nextThreshold - currentThreshold;

        return Math.floor((progressXP / totalXP) * 100);
    }
}
