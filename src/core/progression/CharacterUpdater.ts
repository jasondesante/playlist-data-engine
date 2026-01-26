import type { CharacterSheet } from '../types/Character.js';
import type { ListeningSession } from '../types/Progression.js';
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

        // 3. Update Character XP
        const updatedCharacter = {
            ...character,
            xp: { ...character.xp }
        };
        updatedCharacter.xp.current += xpEarned;

        // 4. Check for Level Up
        let leveledUp = false;
        let newLevel: number | undefined;

        // Determine expected level based on total XP
        const expectedLevel = LevelUpProcessor.calculateLevel(updatedCharacter.xp.current);

        if (expectedLevel > updatedCharacter.level) {
            leveledUp = true;
            newLevel = expectedLevel;

            // Process level up(s) - handle multiple levels if massive XP gain
            // We loop from current level + 1 up to expected level
            for (let lvl = updatedCharacter.level + 1; lvl <= expectedLevel; lvl++) {
                const benefits = LevelUpProcessor.processLevelUp(updatedCharacter, lvl, updatedCharacter.seed);
                const leveledChar = LevelUpProcessor.applyLevelUp(updatedCharacter, benefits);

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

        // Update next level XP threshold
        if (updatedCharacter.level < 20) {
            updatedCharacter.xp.next_level = LevelUpProcessor.getXPThreshold(updatedCharacter.level + 1);
        } else {
            updatedCharacter.xp.next_level = 0; // Max level
        }

        return {
            character: updatedCharacter,
            xpEarned,
            leveledUp,
            newLevel,
            masteredTrack,
            masteryBonusXP
        };
    }
}
