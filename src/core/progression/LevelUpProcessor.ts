/**
 * LevelUpProcessor - Handles character leveling mechanics
 * Based on specs/001-core-engine/SPEC.md and D&D 5e rules
 */

import type { CharacterSheet, Class as CharacterClass, Ability, GameMode } from '../types/Character.js';
import { CLASS_DATA, PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';
import { SeededRNG } from '../../utils/random.js';
import type { StatManager } from './stat/StatManager.js';

/**
 * Level-up benefits returned after processing a level-up
 */
export interface LevelUpBenefits {
    newLevel: number;
    hitPointIncrease: number;
    newHitPointsTotal: number;
    proficiencyBonusIncrease: number;
    newProficiencyBonus: number;

    /** New: Support multiple stat increases */
    abilityScoreIncreases?: Array<{
        ability: Ability;
        increase: number;
    }>;

    /** Deprecated: Kept for backward compatibility */
    abilityScoreIncrease?: {
        ability: Ability;
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
 * Configuration for uncapped mode progression
 * Provide formulas that work for ALL levels (1-infinity), not just beyond 20
 */
export interface UncappedProgressionConfig {
    /** Custom formula for calculating XP threshold for ANY level */
    xpFormula?: (level: number) => number;
    /** Custom formula for calculating proficiency bonus for ANY level */
    proficiencyBonusFormula?: (level: number) => number;
}

/**
 * LevelUpProcessor class - Processes character level-ups
 * Handles HP increases, ability score improvements, spell slots, and features
 */
export class LevelUpProcessor {
    /** Optional StatManager for advanced stat increase handling */
    private static statManager?: StatManager;
    /** Optional configuration for uncapped mode progression */
    private static uncappedConfig?: UncappedProgressionConfig;

    /**
     * Set configuration for uncapped mode progression
     * @param config - Configuration with optional custom formulas
     */
    static setUncappedConfig(config: UncappedProgressionConfig): void {
        this.uncappedConfig = config;
    }

    /**
     * Get the current uncapped configuration
     */
    static getUncappedConfig(): UncappedProgressionConfig | undefined {
        return this.uncappedConfig;
    }

    /**
     * Set the StatManager instance for stat increase handling
     * Call this before processing level-ups to enable smart stat selection
     *
     * @param statManager - The StatManager instance to use
     */
    static setStatManager(statManager: StatManager): void {
        this.statManager = statManager;
    }

    /**
     * Get the current StatManager instance
     */
    static getStatManager(): StatManager | undefined {
        return this.statManager;
    }
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
        // Read gameMode from character (defaults to 'standard' for backward compatibility)
        const gameMode: GameMode = character.gameMode || 'standard';
        const isUncapped = gameMode === 'uncapped';
        const maxLevel = isUncapped ? Infinity : 20;

        if (newLevel < 1 || newLevel > maxLevel) {
            throw new Error(`Level must be between 1 and ${maxLevel}`);
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

        // Get new proficiency bonus (use custom formula for uncapped mode)
        const newProficiencyBonus = this.getProficiencyBonus(newLevel, isUncapped);
        const proficiencyBonusIncrease = newProficiencyBonus - character.proficiency_bonus;

        // Create benefits object
        const benefits: LevelUpBenefits = {
            newLevel,
            hitPointIncrease,
            newHitPointsTotal,
            proficiencyBonusIncrease,
            newProficiencyBonus,
        };

        // Check for ability score increase
        // - Standard mode: levels 4, 8, 12, 16, 19
        // - Uncapped mode: every level
        const isStatIncreaseLevel = isUncapped || ABILITY_SCORE_INCREASE_LEVELS.includes(newLevel);

        if (this.statManager && isStatIncreaseLevel) {
            // Use StatManager for advanced stat increase handling
            const statResult = this.statManager.processLevelUp(character, newLevel);

            if (statResult && statResult.increases.length > 0) {
                benefits.abilityScoreIncreases = statResult.increases.map(inc => ({
                    ability: inc.ability,
                    increase: inc.delta
                }));

                // Also populate deprecated field for backward compatibility
                if (statResult.increases.length === 1) {
                    benefits.abilityScoreIncrease = {
                        ability: statResult.increases[0].ability,
                        increase: statResult.increases[0].delta
                    };
                }
            }
        } else if (ABILITY_SCORE_INCREASE_LEVELS.includes(newLevel)) {
            // Backward compatibility: use old hardcoded behavior
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

        // Apply ability score increases if applicable
        // Determine stat cap based on game mode
        const statCap = updated.gameMode === 'uncapped' ? Infinity : 20;

        if (benefits.abilityScoreIncreases && benefits.abilityScoreIncreases.length > 0) {
            // New: Handle multiple stat increases
            for (const increase of benefits.abilityScoreIncreases) {
                const ability = increase.ability;
                updated.ability_scores[ability] = Math.min(
                    statCap,
                    updated.ability_scores[ability] + increase.increase
                );

                // Recalculate modifier
                const newScore = updated.ability_scores[ability];
                updated.ability_modifiers[ability] = Math.floor((newScore - 10) / 2);
            }
        } else if (benefits.abilityScoreIncrease) {
            // Backward compatibility: Handle single stat increase
            const ability = benefits.abilityScoreIncrease.ability;
            updated.ability_scores[ability] = Math.min(
                statCap,
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
     * - Standard mode: Uses D&D 5e tables (levels 1-20 only)
     * - Uncapped mode with custom formula: Uses your formula for ALL levels
     * - Uncapped mode without custom formula: Continues D&D 5e pattern naturally
     * @param level - The level
     * @param isUncapped - Whether this is for uncapped mode
     * @returns XP required to reach that level
     */
    static getXPThreshold(level: number, isUncapped: boolean = false): number {
        if (level < 1) {
            throw new Error('Level must be at least 1');
        }

        // Standard mode: use D&D 5e tables (cap at level 20)
        if (!isUncapped) {
            if (level > 20) {
                throw new Error('Standard mode only supports levels 1-20');
            }
            return XP_THRESHOLDS[level];
        }

        // Uncapped mode: use custom formula if provided (for ALL levels)
        if (this.uncappedConfig?.xpFormula) {
            return this.uncappedConfig.xpFormula(level);
        }

        // Uncapped mode default: Continue D&D 5e pattern naturally
        // The pattern is: XP(n) = XP(n-1) + (n-1) × n × 500
        // This exactly matches D&D 5e for levels 1-20 and continues naturally
        if (level <= 20) {
            return XP_THRESHOLDS[level];
        }

        // For levels beyond 20, continue the pattern
        // Level 21: 355000 + 20*21*500 = 355000 + 210000 = 565000
        // Level 25: ~735000
        // Level 30: ~1,120,000
        let xp = 355000; // Start from level 20
        for (let lvl = 21; lvl <= level; lvl++) {
            xp += (lvl - 1) * lvl * 500;
        }
        return xp;
    }

    /**
     * Get the proficiency bonus for a specific level
     * - Standard mode: Uses D&D 5e tables (levels 1-20 only)
     * - Uncapped mode with custom formula: Uses your formula for ALL levels
     * - Uncapped mode without custom formula: Continues D&D 5e pattern (+1 every 4 levels)
     * @param level - The level
     * @param isUncapped - Whether this is for uncapped mode
     * @returns Proficiency bonus for that level
     */
    static getProficiencyBonus(level: number, isUncapped: boolean = false): number {
        // Standard mode: use D&D 5e tables (cap at level 20)
        if (!isUncapped) {
            if (level < 1 || level > 20) {
                throw new Error('Standard proficiency bonus only defined for levels 1-20');
            }
            return PROFICIENCY_BONUS[level];
        }

        // Uncapped mode: use custom formula if provided (for ALL levels)
        if (this.uncappedConfig?.proficiencyBonusFormula) {
            return this.uncappedConfig.proficiencyBonusFormula(level);
        }

        // Uncapped mode default: Continue D&D 5e pattern (+1 every 4 levels)
        // Level 1-4: 2, Level 5-8: 3, Level 9-12: 4, Level 13-16: 5, Level 17-20: 6
        // Level 21-24: 6, Level 25-28: 7, Level 29-32: 8, etc.
        if (level <= 4) return 2;
        if (level <= 8) return 3;
        if (level <= 12) return 4;
        if (level <= 16) return 5;
        return 2 + Math.floor((level - 1) / 4);
    }

    /**
     * Calculate level from total XP
     * @param totalXP - Total experience points
     * @param isUncapped - Whether this is for uncapped mode (allows infinite levels)
     * @returns Character level
     */
    static calculateLevel(totalXP: number, isUncapped: boolean = false): number {
        if (!isUncapped) {
            // Standard mode: cap at 20
            for (let level = 20; level >= 1; level--) {
                if (totalXP >= this.getXPThreshold(level, false)) {
                    return level;
                }
            }
            return 1;
        }

        // Uncapped mode: search upward from 1
        let level = 1;
        while (totalXP >= this.getXPThreshold(level + 1, true)) {
            level++;
        }
        return level;
    }

    /**
     * Get XP needed to reach next level
     * @param currentLevel - Current character level
     * @param isUncapped - Whether this is for uncapped mode
     * @returns XP needed to advance to next level, or 0 if at max (or if uncapped, always returns next threshold)
     */
    static getXPToNextLevel(currentLevel: number, isUncapped: boolean = false): number {
        if (!isUncapped && currentLevel >= 20) {
            return 0; // At max level in standard mode
        }

        const currentThreshold = this.getXPThreshold(currentLevel, isUncapped);
        const nextThreshold = this.getXPThreshold(currentLevel + 1, isUncapped);

        return nextThreshold - currentThreshold;
    }

    /**
     * Get progress to next level as a percentage
     * @param currentLevel - Current level
     * @param currentXP - Total XP within level thresholds
     * @param isUncapped - Whether this is for uncapped mode
     * @returns Percentage (0-100) towards next level
     */
    static getProgressPercentage(currentLevel: number, currentXP: number, isUncapped: boolean = false): number {
        if (!isUncapped && currentLevel >= 20) {
            return 100;
        }

        const currentThreshold = this.getXPThreshold(currentLevel, isUncapped);
        const nextThreshold = this.getXPThreshold(currentLevel + 1, isUncapped);

        const progressXP = currentXP - currentThreshold;
        const totalXP = nextThreshold - currentThreshold;

        return Math.floor((progressXP / totalXP) * 100);
    }

    /**
     * Process level-up without stat increases
     * Used for pending level-up system where stats are applied later
     *
     * @param character - The character to level up
     * @param newLevel - The new level
     * @param seed - Optional seed for deterministic HP rolls
     * @returns Benefits without stat increases
     */
    static processLevelUpWithoutStats(
        character: CharacterSheet,
        newLevel: number,
        seed?: string
    ): Omit<LevelUpBenefits, 'abilityScoreIncreases' | 'abilityScoreIncrease'> {
        // Read gameMode from character (defaults to 'standard' for backward compatibility)
        const gameMode: GameMode = character.gameMode || 'standard';
        const isUncapped = gameMode === 'uncapped';
        const maxLevel = isUncapped ? Infinity : 20;

        if (newLevel < 1 || newLevel > maxLevel) {
            throw new Error(`Level must be between 1 and ${maxLevel}`);
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
        const newProficiencyBonus = this.getProficiencyBonus(newLevel, isUncapped);
        const proficiencyBonusIncrease = newProficiencyBonus - character.proficiency_bonus;

        // Create benefits object (without stats)
        const benefits: Omit<LevelUpBenefits, 'abilityScoreIncreases' | 'abilityScoreIncrease'> = {
            newLevel,
            hitPointIncrease,
            newHitPointsTotal,
            proficiencyBonusIncrease,
            newProficiencyBonus,
        };

        // Calculate new spell slots if spellcaster
        if (this.isSpellcaster(character.class)) {
            benefits.newSpellSlots = this.calculateSpellSlots(newLevel);
        }

        // Get class features for this level
        benefits.classFeatures = this.getClassFeaturesForLevel(character.class, newLevel);

        return benefits;
    }

    /**
     * Apply automatic level-up benefits (HP, proficiency, features, spell slots)
     * Does NOT apply stat increases
     *
     * @param character - The character to update
     * @param benefits - Benefits without stat increases
     * @returns Updated character
     */
    static applyAutomaticBenefitsOnly(
        character: CharacterSheet,
        benefits: Omit<LevelUpBenefits, 'abilityScoreIncreases' | 'abilityScoreIncrease'>
    ): CharacterSheet {
        const updated = { ...character };

        // Update level and HP
        updated.level = benefits.newLevel;
        updated.hp.max = benefits.newHitPointsTotal;
        updated.hp.current = Math.min(updated.hp.current + benefits.hitPointIncrease, updated.hp.max);
        updated.proficiency_bonus = benefits.newProficiencyBonus;

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
     * Apply ONLY stat increases to a character
     * Used when completing a pending level-up
     *
     * @param character - The character to update
     * @param statIncreases - Array of stat increases to apply
     * @returns Updated character
     */
    static applyStatIncreasesOnly(
        character: CharacterSheet,
        statIncreases: Array<{ ability: Ability; amount: number }>
    ): CharacterSheet {
        const updated = { ...character };

        // Deep copy ability scores and modifiers
        updated.ability_scores = { ...updated.ability_scores };
        updated.ability_modifiers = { ...updated.ability_modifiers };

        // Determine stat cap based on game mode
        const gameMode: GameMode = updated.gameMode || 'standard';
        const statCap = gameMode === 'uncapped' ? Infinity : 20;

        for (const increase of statIncreases) {
            const ability = increase.ability;
            updated.ability_scores[ability] = Math.min(
                statCap,
                updated.ability_scores[ability] + increase.amount
            );

            // Recalculate modifier
            updated.ability_modifiers[ability] = Math.floor((updated.ability_scores[ability] - 10) / 2);
        }

        return updated;
    }
}
