import type { CharacterSheet, Ability } from '../types/Character.js';
import type { ListeningSession, LevelUpDetail } from '../types/Progression.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import { XPCalculator } from './XPCalculator.js';
import { LevelUpProcessor } from './LevelUpProcessor.js';
import { MasterySystem } from './MasterySystem.js';
import type { StatManager } from './stat/StatManager.js';

export interface CharacterUpdateResult {
    character: CharacterSheet;
    xpEarned: number;
    leveledUp: boolean;
    newLevel?: number;
    masteredTrack: boolean;
    masteryBonusXP: number;
    /** Detailed breakdown of each level-up (NEW) */
    levelUpDetails?: LevelUpDetail[];
}

/**
 * CharacterUpdater - Orchestrates character updates from listening sessions
 */
export class CharacterUpdater {
    private xpCalculator: XPCalculator;
    private masterySystem: MasterySystem;
    private statManager?: StatManager;

    constructor(statManager?: StatManager) {
        this.xpCalculator = new XPCalculator();
        this.masterySystem = new MasterySystem();
        this.statManager = statManager;

        // Pass StatManager to LevelUpProcessor if provided
        if (statManager) {
            LevelUpProcessor.setStatManager(statManager);
        }
    }

    /**
     * Add XP from any source (combat, quests, custom activities)
     * Triggers level-up system with detailed breakdowns
     *
     * @param character - The character to update
     * @param xpAmount - Amount of XP to add
     * @param source - Source of the XP (for tracking)
     * @returns Result object containing updated character and level-up details
     *
     * @example
     * ```typescript
     * // Combat victory XP
     * const result = updater.addXP(character, 500, 'combat');
     *
     * // Quest completion XP
     * const questResult = updater.addXP(character, 1000, 'quest');
     *
     * // Custom activity XP
     * const customResult = updater.addXP(character, 250, 'exploration');
     *
     * if (result.leveledUp) {
     *   console.log(`🎉 LEVELED UP to ${result.newLevel}!`);
     *   for (const detail of result.levelUpDetails) {
     *     console.log(`HP: +${detail.hpIncrease}`);
     *     console.log(`Stats:`, detail.statIncreases);
     *   }
     * }
     * ```
     */
    public addXP(
        character: CharacterSheet,
        xpAmount: number,
        source: string = 'custom'
    ): Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'> {
        // 1. Update Character XP
        const updatedCharacter = {
            ...character,
            xp: { ...character.xp }
        };
        updatedCharacter.xp.current += xpAmount;

        // 2. Check for Level Up
        let leveledUp = false;
        let newLevel: number | undefined;
        const levelUpDetails: LevelUpDetail[] = [];

        // Determine expected level based on total XP (respect game mode)
        const isUncapped = updatedCharacter.gameMode === 'uncapped';
        const expectedLevel = LevelUpProcessor.calculateLevel(updatedCharacter.xp.current, isUncapped);

        if (expectedLevel > updatedCharacter.level) {
            leveledUp = true;
            newLevel = expectedLevel;

            // Process level up(s) - handle multiple levels if massive XP gain
            // We loop from current level + 1 up to expected level
            for (let lvl = updatedCharacter.level + 1; lvl <= expectedLevel; lvl++) {
                // Capture state BEFORE level-up for diff
                const prevHP = updatedCharacter.hp.max;
                const prevProficiency = updatedCharacter.proficiency_bonus;
                const prevAbilityScores = { ...updatedCharacter.ability_scores };
                const prevClassFeatures = [...updatedCharacter.class_features];
                const prevSpellSlots = updatedCharacter.spells?.spell_slots;

                const benefits = LevelUpProcessor.processLevelUp(updatedCharacter, lvl, updatedCharacter.seed);
                const leveledChar = LevelUpProcessor.applyLevelUp(updatedCharacter, benefits);

                // Build LevelUpDetail with all the juicy info!
                const detail: LevelUpDetail = {
                    fromLevel: lvl - 1,
                    toLevel: lvl,
                    hpIncrease: benefits.hitPointIncrease,
                    newMaxHP: benefits.newHitPointsTotal,
                    proficiencyIncrease: benefits.proficiencyBonusIncrease,
                    newProficiency: benefits.newProficiencyBonus,
                    statIncreases: benefits.abilityScoreIncreases?.map(inc => ({
                        ability: inc.ability,
                        oldValue: prevAbilityScores[inc.ability],
                        newValue: prevAbilityScores[inc.ability] + inc.increase,
                        delta: inc.increase
                    })),
                    featuresGained: benefits.classFeatures?.filter(
                        f => !prevClassFeatures.includes(f)
                    ),
                    newSpellSlots: benefits.newSpellSlots
                };

                levelUpDetails.push(detail);

                // Update properties on our working copy
                updatedCharacter.level = leveledChar.level;
                updatedCharacter.hp = leveledChar.hp;
                updatedCharacter.ability_scores = leveledChar.ability_scores;
                updatedCharacter.ability_modifiers = leveledChar.ability_modifiers;
                updatedCharacter.proficiency_bonus = leveledChar.proficiency_bonus;
                updatedCharacter.class_features = leveledChar.class_features;

                if (leveledChar.spells) {
                    updatedCharacter.spells = leveledChar.spells;
                }
            }
        }

        // Update next level XP threshold (respect game mode)
        if (!isUncapped && updatedCharacter.level >= 20) {
            updatedCharacter.xp.next_level = 0; // Max level in standard mode
        } else {
            updatedCharacter.xp.next_level = LevelUpProcessor.getXPThreshold(updatedCharacter.level + 1, isUncapped);
        }

        return {
            character: updatedCharacter,
            xpEarned: xpAmount,
            leveledUp,
            newLevel,
            levelUpDetails: levelUpDetails.length > 0 ? levelUpDetails : undefined
        };
    }

    /**
     * Updates a character based on a completed listening session
     * Calculates XP, checks for level ups, and handles track mastery
     *
     * @param character - The character to update
     * @param session - The completed listening session
     * @param track - The track that was listened to (optional, but needed for mastery/completion bonus)
     * @returns Result object containing updated character and event details
     */
    public updateCharacterFromSession(
        character: CharacterSheet,
        session: ListeningSession,
        track?: PlaylistTrack,
        previousListenCount: number = 0
    ): CharacterUpdateResult {
        // 1. Calculate XP earned
        let xpEarned = this.xpCalculator.calculateSessionXP(session, track);

        // 2. Check for Mastery
        let masteredTrack = false;
        let masteryBonusXP = 0;

        if (track) {
            // Check if mastery threshold was JUST crossed
            // We assume the session has already been recorded in the tracker, so current count includes this session
            // But here we might need the caller to provide the counts.
            // For simplicity, let's assume the caller passes the *previous* count, and we know this session adds 1.
            const currentListenCount = previousListenCount + 1;

            if (this.masterySystem.isJustMastered(previousListenCount, currentListenCount)) {
                masteredTrack = true;
                masteryBonusXP = this.masterySystem.calculateMasteryBonus(true);
                xpEarned += masteryBonusXP;
            }
        }

        // 3. Use the generic addXP method for level-up processing
        const result = this.addXP(character, xpEarned, 'listening');

        return {
            ...result,
            masteredTrack,
            masteryBonusXP
        };
    }
}
