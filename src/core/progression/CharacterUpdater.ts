import type { CharacterSheet, Ability } from '../types/Character.js';
import type { ListeningSession, LevelUpDetail, ApplyPendingStatIncreaseResult } from '../types/Progression.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import type { PrestigeLevel, PrestigeResult } from '../types/Prestige.js';
import type { AudioProfile } from '../types/AudioProfile.js';
import { XPCalculator } from './XPCalculator.js';
import { LevelUpProcessor } from './LevelUpProcessor.js';
import { StatManager } from './stat/StatManager.js';
import { PrestigeSystem } from './PrestigeSystem.js';
import { SessionTracker } from './SessionTracker.js';
import { CharacterGenerator } from '../generation/CharacterGenerator.js';

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
    private statManager?: StatManager;

    constructor(statManager?: StatManager) {
        this.xpCalculator = new XPCalculator();

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
     * @param options - Optional parameters for mastery calculation
     * @param options.previousListenCount - Listen count before this session (defaults to 0)
     * @param options.previousXP - Total track XP before this session (defaults to 0)
     * @param options.prestigeLevel - Character's prestige level (defaults to character's prestige_level or 0)
     * @returns Result object containing updated character and event details
     */
    public updateCharacterFromSession(
        character: CharacterSheet,
        session: ListeningSession,
        track?: PlaylistTrack,
        options?: {
            previousListenCount?: number;
            previousXP?: number;
            prestigeLevel?: PrestigeLevel;
        }
    ): CharacterUpdateResult {
        // Extract options with defaults
        const previousListenCount = options?.previousListenCount ?? 0;
        const previousXP = options?.previousXP ?? 0;
        const prestigeLevel: PrestigeLevel = options?.prestigeLevel ?? character.prestige_level ?? 0;

        // 1. Calculate XP earned
        const sessionXP = this.xpCalculator.calculateSessionXP(session, track);

        // 2. Check for Mastery (dual requirement: plays AND XP)
        let masteredTrack = false;
        let masteryBonusXP = 0;

        if (track) {
            const currentListenCount = previousListenCount + 1;
            const currentXP = previousXP + sessionXP;

            if (PrestigeSystem.isJustMastered(
                previousListenCount,
                currentListenCount,
                previousXP,
                currentXP,
                prestigeLevel
            )) {
                masteredTrack = true;
                masteryBonusXP = PrestigeSystem.calculateMasteryBonus(true);
            }
        }

        // 3. Total XP to add (session + mastery bonus)
        const xpEarned = sessionXP + masteryBonusXP;

        // 4. Use the generic addXP method for level-up processing
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

    /**
     * Reset a character for prestige after mastering a track.
     *
     * This is the main prestige execution function that handles the full prestige operation:
     * 1. Validates: Check can prestige (not at max, meets thresholds)
     * 2. Preserves equipment
     * 3. Clears track sessions (calls sessionTracker.clearTrackSessions(trackUuid))
     * 4. Regenerates base level 1 character from seed
     * 5. Restores equipment
     * 6. Re-applies equipment effects
     * 7. Increments prestige_level
     * 8. Returns result with success/failure info
     *
     * @param character - The character to prestige
     * @param sessionTracker - SessionTracker instance to clear track sessions
     * @param trackUuid - UUID of the track being prestiged
     * @param audioProfile - Audio profile for character regeneration
     * @param track - Track metadata for character regeneration
     * @returns PrestigeResult indicating success/failure and new prestige level
     *
     * @example
     * ```typescript
     * const result = updater.resetCharacterForPrestige(
     *   character,
     *   sessionTracker,
     *   trackUuid,
     *   audioProfile,
     *   track
     * );
     *
     * if (result.success) {
     *   console.log(result.message); // "Successfully prestiged to level I! ..."
     * } else {
     *   console.log(result.message); // "Prestige failed: ..."
     * }
     * ```
     */
    public resetCharacterForPrestige(
        character: CharacterSheet,
        sessionTracker: SessionTracker,
        trackUuid: string,
        audioProfile: AudioProfile,
        track: PlaylistTrack
    ): PrestigeResult {
        const currentPrestigeLevel: PrestigeLevel = character.prestige_level ?? 0;

        // 1. Check if already at max prestige
        if (currentPrestigeLevel >= 10) {
            return PrestigeSystem.createFailureResult(
                'Already at maximum prestige level',
                currentPrestigeLevel
            );
        }

        // 2. Get current track progress
        const listenCount = sessionTracker.getTrackListenCount(trackUuid);
        const totalXP = sessionTracker.getTrackXPTotal(trackUuid);

        // 3. Check if track is mastered (meets BOTH plays AND XP thresholds)
        if (!PrestigeSystem.canPrestige(currentPrestigeLevel, listenCount, totalXP)) {
            const playsThreshold = PrestigeSystem.getPlaysThreshold(currentPrestigeLevel);
            const xpThreshold = PrestigeSystem.getXPThreshold(currentPrestigeLevel);

            if (listenCount < playsThreshold && totalXP < xpThreshold) {
                return PrestigeSystem.createFailureResult(
                    `Need ${playsThreshold - listenCount} more plays and ${(xpThreshold - totalXP).toLocaleString()} more XP to prestige`,
                    currentPrestigeLevel
                );
            } else if (listenCount < playsThreshold) {
                return PrestigeSystem.createFailureResult(
                    `Need ${playsThreshold - listenCount} more plays to prestige (XP requirement met)`,
                    currentPrestigeLevel
                );
            } else {
                return PrestigeSystem.createFailureResult(
                    `Need ${(xpThreshold - totalXP).toLocaleString()} more XP to prestige (plays requirement met)`,
                    currentPrestigeLevel
                );
            }
        }

        // 4. Preserve equipment
        const preservedEquipment = character.equipment ? {
            weapons: [...character.equipment.weapons],
            armor: [...character.equipment.armor],
            items: [...character.equipment.items],
            totalWeight: character.equipment.totalWeight,
            equippedWeight: character.equipment.equippedWeight,
        } : null;

        // 5. Clear track sessions
        sessionTracker.clearTrackSessions(trackUuid);

        // 6. Regenerate base level 1 character from seed
        const newPrestigeLevel = PrestigeSystem.getNextPrestigeLevel(currentPrestigeLevel);
        if (newPrestigeLevel === null) {
            return PrestigeSystem.createFailureResult(
                'Cannot prestige beyond maximum level',
                currentPrestigeLevel
            );
        }

        // Regenerate character using original seed
        const regeneratedCharacter = CharacterGenerator.generate(
            character.seed,
            audioProfile,
            track,
            {
                level: 1,
                gameMode: character.gameMode,
                forceName: character.name, // Keep the same name
            }
        );

        // 7. Restore equipment
        if (preservedEquipment) {
            regeneratedCharacter.equipment = preservedEquipment;
        }

        // 8. Set new prestige level
        regeneratedCharacter.prestige_level = newPrestigeLevel;

        // 9. Create success result
        const result = PrestigeSystem.createSuccessResult(currentPrestigeLevel, newPrestigeLevel);

        // Return result with the regenerated character
        return {
            ...result,
            character: regeneratedCharacter,
        } as PrestigeResult & { character: CharacterSheet };
    }

    /**
     * Check if a character can prestige for a specific track.
     *
     * @param character - The character to check
     * @param sessionTracker - SessionTracker instance for getting track stats
     * @param trackUuid - UUID of the track to check
     * @returns True if the character can prestige
     */
    public canPrestige(
        character: CharacterSheet,
        sessionTracker: SessionTracker,
        trackUuid: string
    ): boolean {
        const prestigeLevel: PrestigeLevel = character.prestige_level ?? 0;
        const listenCount = sessionTracker.getTrackListenCount(trackUuid);
        const totalXP = sessionTracker.getTrackXPTotal(trackUuid);

        return PrestigeSystem.canPrestige(prestigeLevel, listenCount, totalXP);
    }

    /**
     * Get prestige info for a character and track combination.
     *
     * @param character - The character to get info for
     * @param sessionTracker - SessionTracker instance for getting track stats
     * @param trackUuid - UUID of the track
     * @returns PrestigeInfo object with current progress
     */
    public getPrestigeInfo(
        character: CharacterSheet,
        sessionTracker: SessionTracker,
        trackUuid: string
    ): ReturnType<typeof PrestigeSystem.getPrestigeInfo> {
        const prestigeLevel: PrestigeLevel = character.prestige_level ?? 0;
        const listenCount = sessionTracker.getTrackListenCount(trackUuid);
        const totalXP = sessionTracker.getTrackXPTotal(trackUuid);

        return PrestigeSystem.getPrestigeInfo(prestigeLevel, listenCount, totalXP);
    }
}
