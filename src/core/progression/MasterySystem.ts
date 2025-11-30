import { MASTERY_THRESHOLD, MASTERY_BONUS_XP } from '../../utils/constants.js';

/**
 * MasterySystem handles track mastery logic.
 * Tracks how many times a user has listened to a track and awards mastery status.
 */
export class MasterySystem {
    /**
     * Checks if a track has reached mastery status based on listen count.
     * @param listenCount - The number of times the track has been listened to.
     * @returns True if the track is mastered, false otherwise.
     */
    public checkMastery(listenCount: number): boolean {
        return listenCount >= MASTERY_THRESHOLD;
    }

    /**
     * Calculates the bonus XP awarded for mastery.
     * @param isMastered - Whether the track is currently mastered.
     * @returns The bonus XP amount if mastered, 0 otherwise.
     */
    public calculateMasteryBonus(isMastered: boolean): number {
        return isMastered ? MASTERY_BONUS_XP : 0;
    }

    /**
     * Determines if a track just reached mastery status in this session.
     * @param previousListenCount - The listen count before the current session.
     * @param currentListenCount - The listen count including the current session.
     * @returns True if mastery was achieved exactly in this session.
     */
    public isJustMastered(previousListenCount: number, currentListenCount: number): boolean {
        return previousListenCount < MASTERY_THRESHOLD && currentListenCount >= MASTERY_THRESHOLD;
    }
}
