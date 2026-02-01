import type { CharacterSheet, Ability } from '../types/Character.js';
import type { ListeningSession, LevelUpDetail, ApplyPendingStatIncreaseResult } from '../types/Progression.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import { XPCalculator } from './XPCalculator.js';
import { LevelUpProcessor } from './LevelUpProcessor.js';
import { MasterySystem } from './MasterySystem.js';
import { StatManager } from './stat/StatManager.js';

export type { ApplyPendingStatIncreaseResult } from '../types/Progression.js';

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

        // StatManager is optional - will be auto-detected based on gameMode when addXP() is called
        this.statManager = statManager;

        // Pass StatManager to LevelUpProcessor for stat increase handling (if provided)
        if (this.statManager) {
            LevelUpProcessor.setStatManager(this.statManager);
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
        _source: string = 'custom'
    ): Omit<CharacterUpdateResult, 'masteredTrack' | 'masteryBonusXP'> {
        // 1. Update Character XP
        const updatedCharacter = {
            ...character,
            xp: { ...character.xp }
        };
        updatedCharacter.xp.current += xpAmount;

        // 2. Auto-detect strategy based on gameMode if no StatManager provided
        if (!this.statManager) {
            const gameMode = updatedCharacter.gameMode || 'standard';
            const defaultStrategy = gameMode === 'standard' ? 'dnD5e' : 'dnD5e_smart';
            this.statManager = new StatManager({ strategy: defaultStrategy });
            LevelUpProcessor.setStatManager(this.statManager);
        }

        // 3. Check for Level Up
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
                const isStatIncreaseLevel = this.isStatIncreaseLevel(lvl, isUncapped);

                // Check if strategy requires manual input
                const requiresManualInput = isStatIncreaseLevel &&
                    this.statManager!.getConfig().strategy === 'dnD5e';

                if (requiresManualInput) {
                    // Increment the counter
                    updatedCharacter.pendingStatIncreases = (updatedCharacter.pendingStatIncreases || 0) + 1;

                    // Apply automatic benefits only (HP, proficiency, etc.)
                    const benefits = LevelUpProcessor.processLevelUpWithoutStats(updatedCharacter, lvl);
                    const leveledChar = LevelUpProcessor.applyAutomaticBenefitsOnly(updatedCharacter, benefits);

                    // Build detail without stat increases
                    const detail: LevelUpDetail = {
                        fromLevel: lvl - 1,
                        toLevel: lvl,
                        hpIncrease: benefits.hitPointIncrease,
                        newMaxHP: benefits.newHitPointsTotal,
                        proficiencyIncrease: benefits.proficiencyBonusIncrease,
                        newProficiency: benefits.newProficiencyBonus,
                        statIncreases: undefined, // Pending!
                        featuresGained: benefits.classFeatures,
                        newSpellSlots: benefits.newSpellSlots
                    };

                    levelUpDetails.push(detail);
                    updatedCharacter.level = lvl;
                    updatedCharacter.hp = leveledChar.hp;
                    updatedCharacter.proficiency_bonus = leveledChar.proficiency_bonus;
                    updatedCharacter.class_features = leveledChar.class_features;
                    if (leveledChar.spells) {
                        updatedCharacter.spells = leveledChar.spells;
                    }
                } else {
                    // Auto-apply everything (current behavior)
                    const prevAbilityScores = { ...updatedCharacter.ability_scores };
                    const prevClassFeatures = [...updatedCharacter.class_features];

                    const benefits = LevelUpProcessor.processLevelUp(updatedCharacter, lvl);
                    const leveledChar = LevelUpProcessor.applyLevelUp(updatedCharacter, benefits);

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
     * Helper method to check if a level grants stat increases
     */
    private isStatIncreaseLevel(level: number, isUncapped: boolean): boolean {
        if (isUncapped) return true;
        return [4, 8, 12, 16, 19].includes(level);
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

    /**
     * Apply pending stat increase with user-selected stats
     * Only works if pendingStatIncreases counter > 0
     *
     * @param character - Character with pending stat increases
     * @param primaryStat - The stat to get +2 (or one of the +1s if using two stats)
     * @param secondaryStats - Optional array of 1 additional stat for +1/+1 distribution
     * @returns Result with updated character
     *
     * @example
     * ```typescript
     * // +2 to STR only
     * const result = updater.applyPendingStatIncrease(character, 'STR');
     *
     * // +1 to STR and +1 to DEX
     * const result = updater.applyPendingStatIncrease(character, 'STR', ['DEX']);
     * ```
     */
    public applyPendingStatIncrease(
        character: CharacterSheet,
        primaryStat: Ability,
        secondaryStats?: Ability[]
    ): ApplyPendingStatIncreaseResult {
        const pendingCount = character.pendingStatIncreases || 0;

        if (pendingCount === 0) {
            throw new Error('No pending stat increases to apply');
        }

        // Build stat selection based on parameters
        let statSelections: Array<{ ability: Ability; amount: number }>;

        if (secondaryStats && secondaryStats.length > 0) {
            // +1 to primary, +1 to first secondary
            if (secondaryStats.length > 1) {
                throw new Error('Only one secondary stat allowed for +1/+1 distribution');
            }
            statSelections = [
                { ability: primaryStat, amount: 1 },
                { ability: secondaryStats[0], amount: 1 }
            ];
        } else {
            // +2 to primary only
            statSelections = [
                { ability: primaryStat, amount: 2 }
            ];
        }

        // Validate selection
        const validation = this.statManager!.validateDnD5eStatSelection(character, statSelections);
        if ('error' in validation) {
            throw new Error(validation.error);
        }

        // Apply stats using LevelUpProcessor
        const updatedCharacter = LevelUpProcessor.applyStatIncreasesOnly(character, statSelections);

        // Decrement the counter
        updatedCharacter.pendingStatIncreases = pendingCount - 1;
        if (updatedCharacter.pendingStatIncreases === 0) {
            delete updatedCharacter.pendingStatIncreases;
        }

        // Build stat increases array for result
        const statIncreases = statSelections.map(selection => ({
            ability: selection.ability,
            oldValue: character.ability_scores[selection.ability],
            newValue: updatedCharacter.ability_scores[selection.ability],
            delta: selection.amount
        }));

        return {
            character: updatedCharacter,
            statIncreases,
            remainingPending: updatedCharacter.pendingStatIncreases || 0,
            timestamp: Date.now()
        };
    }

    /**
     * Check if character has pending stat increases
     *
     * @param character - Character to check
     * @returns true if character has pending stat increases
     */
    public hasPendingStatIncreases(character: CharacterSheet): boolean {
        return !!(character.pendingStatIncreases && character.pendingStatIncreases > 0);
    }

    /**
     * Get the count of pending stat increases
     *
     * @param character - Character to check
     * @returns Number of pending stat increases
     */
    public getPendingStatIncreaseCount(character: CharacterSheet): number {
        return character.pendingStatIncreases || 0;
    }
}
