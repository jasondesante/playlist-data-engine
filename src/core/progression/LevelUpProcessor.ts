/**
 * LevelUpProcessor - Handles character leveling mechanics
 * Based on specs/001-core-engine/SPEC.md and D&D 5e rules
 *
 * Uses FeatureQuery for class feature lookup.
 * - Replaces hardcoded getClassFeaturesForLevel() with FeatureQuery lookup
 * - Validates prerequisite chains on level up
 * - Applies new feature effects when leveling up
 * - Handles conditional features (player choice)
 * - Returns feature IDs instead of display strings
 */

import type { CharacterSheet, Class as CharacterClass, Ability, GameMode } from '../types/Character.js';
import { PROFICIENCY_BONUS, XP_THRESHOLDS } from '../../utils/constants.js';
import { CLASS_DATA } from '../../constants/DefaultClasses.js';
import { SeededRNG } from '../../utils/random.js';
import type { StatManager } from './stat/StatManager.js';
import { FeatureQuery } from '../features/FeatureQuery.js';
import { FeatureEffectApplier } from '../features/FeatureEffectApplier.js';
import { EquipmentEffectApplier } from '../equipment/EquipmentEffectApplier.js';
import type { ClassFeature } from '../features/FeatureTypes.js';

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

    newSpellSlots?: Record<number, { total: number; used: number }>;

    /**
     * Class features gained at this level
     * Returns feature IDs instead of display strings
     * OLD: ['Barbarian Level 2', 'Reckless Attack']
     * NEW: ['reckless_attack', 'danger_sense']
     */
    classFeatures?: string[];

    /**
     * Feature effects applied during level-up
     * Stores effects that were applied to the character
     */
    featureEffects?: Array<{
        featureId: string;
        featureName: string;
        effectsApplied: number;
    }>;
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
            const slotCounts = this.calculateSpellSlots(newLevel);
            // Convert slot counts to { total, used } format
            const spellSlots: Record<number, { total: number; used: number }> = {};
            for (const [level, count] of Object.entries(slotCounts)) {
                spellSlots[Number(level)] = { total: count, used: 0 };
            }
            benefits.newSpellSlots = spellSlots;
        }

        // Get class features for this level using FeatureQuery
        const featuresGained = this.getClassFeaturesForLevel(character, character.class, newLevel);
        if (featuresGained.length > 0) {
            benefits.classFeatures = featuresGained.map(f => f.id);

            // Apply feature effects and store summary
            benefits.featureEffects = [];
            for (const feature of featuresGained) {
                if (feature.effects && feature.effects.length > 0) {
                    // Create a temporary updated character for effect application
                    const updatedForEffects = { ...character, level: newLevel };
                    const result = FeatureEffectApplier.applyFeatureEffects(updatedForEffects, feature);

                    if (result.applied) {
                        benefits.featureEffects.push({
                            featureId: feature.id,
                            featureName: feature.name,
                            effectsApplied: result.count
                        });
                    }
                }
            }
        }

        return benefits;
    }

    /**
     * Get class features gained at a specific level for a character
     * Uses FeatureQuery to look up features and validates prerequisites
     *
     * @param character - The character to check features for
     * @param characterClass - The character class
     * @param level - The level to get features for
     * @returns Array of ClassFeature objects gained at this level
     */
    private static getClassFeaturesForLevel(
        character: CharacterSheet,
        characterClass: CharacterClass,
        level: number
    ): ClassFeature[] {
        const registry = FeatureQuery.getInstance();

        // Get features for this class at this level from FeatureQuery
        const features = registry.getFeaturesForLevel(characterClass, level);

        // Validate prerequisites for each feature
        // Create a preview character at the new level for validation
        const previewCharacter = { ...character, level };

        const validFeatures: ClassFeature[] = [];
        for (const feature of features) {
            const validation = registry.validatePrerequisites(feature, previewCharacter);

            if (validation.valid) {
                validFeatures.push(feature);
            } else {
                // Log warning for features that fail prerequisite validation
                console.warn(
                    `Feature "${feature.name}" (level ${feature.level}) ` +
                    `failed prerequisite validation at level ${level}:`,
                    validation.errors
                );

                // For default features, we include them anyway (they should always pass)
                // For custom features with prerequisites, this prevents invalid features
                // from being granted when prerequisites aren't met
                if (feature.source === 'default') {
                    validFeatures.push(feature);
                }
            }
        }

        return validFeatures;
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
            updated.spells.spell_slots = benefits.newSpellSlots;
        }

        // Add class features
        if (benefits.classFeatures) {
            updated.class_features = [
                ...new Set([...updated.class_features, ...benefits.classFeatures]),
            ];
        }

        // Re-apply equipment effects after level-up
        // This ensures equipment bonuses (like stat bonuses from items) persist
        // after the character's stats have changed
        this.reapplyEquipmentEffects(updated);

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
            const slotCounts = this.calculateSpellSlots(newLevel);
            // Convert slot counts to { total, used } format
            const spellSlots: Record<number, { total: number; used: number }> = {};
            for (const [level, count] of Object.entries(slotCounts)) {
                spellSlots[Number(level)] = { total: count, used: 0 };
            }
            benefits.newSpellSlots = spellSlots;
        }

        // Get class features for this level using FeatureQuery
        const featuresGained = this.getClassFeaturesForLevel(character, character.class, newLevel);
        if (featuresGained.length > 0) {
            benefits.classFeatures = featuresGained.map(f => f.id);

            // Apply feature effects and store summary
            benefits.featureEffects = [];
            for (const feature of featuresGained) {
                if (feature.effects && feature.effects.length > 0) {
                    // Create a temporary updated character for effect application
                    const updatedForEffects = { ...character, level: newLevel };
                    const result = FeatureEffectApplier.applyFeatureEffects(updatedForEffects, feature);

                    if (result.applied) {
                        benefits.featureEffects.push({
                            featureId: feature.id,
                            featureName: feature.name,
                            effectsApplied: result.count
                        });
                    }
                }
            }
        }

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
            updated.spells.spell_slots = benefits.newSpellSlots;
        }

        // Add class features
        if (benefits.classFeatures) {
            updated.class_features = [
                ...new Set([...updated.class_features, ...benefits.classFeatures]),
            ];
        }

        // Re-apply equipment effects after automatic benefits
        // This ensures equipment bonuses persist when level increases
        this.reapplyEquipmentEffects(updated);

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

    /**
     * Re-apply all equipment effects after a level-up
     * Ensures equipment effects persist when character stats change
     *
     * This method uses EquipmentEffectApplier's reapplyEquipmentEffects which:
     * - Clears the equipment_effects array
     * - Re-applies all properties, features, skills, and spells
     * - Rebuilds the equipment_effects tracking array
     *
     * @param character - The character to reapply equipment effects to
     */
    private static reapplyEquipmentEffects(character: CharacterSheet): void {
        if (!character.equipment) return;

        // Use EquipmentEffectApplier's reapplyEquipmentEffects method
        // This handles the full reapplication including properties, features, skills, and spells
        EquipmentEffectApplier.reapplyEquipmentEffects(character);
    }
}
