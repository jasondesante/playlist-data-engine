/**
 * Interface for session tracking operations required by the prestige system.
 * Allows consumers to provide adapters for their own state management.
 *
 * @example
 * ```typescript
 * // Using with Zustand adapter
 * const zustandAdapter: ISessionTracker = {
 *     getTrackListenCount: (id) => useSessionStore.getState().getTrackListenCount(id),
 *     getTrackXPTotal: (id) => useSessionStore.getState().getTrackXPTotal(id),
 *     clearTrackSessions: (id) => useSessionStore.getState().clearTrackSessions(id),
 * };
 *
 * const result = updater.resetCharacterForPrestige(character, zustandAdapter, trackUuid, audioProfile, track);
 * ```
 *
 * @example
 * ```typescript
 * // Using with mock for testing
 * const mockTracker: ISessionTracker = {
 *     getTrackListenCount: () => 15,
 *     getTrackXPTotal: () => 2000,
 *     clearTrackSessions: () => 10,
 * };
 * ```
 */
export interface ISessionTracker {
    /**
     * Get the number of listening sessions for a specific track.
     * @param trackUuid - The track UUID to check
     * @returns Number of completed sessions for this track
     */
    getTrackListenCount(trackUuid: string): number;

    /**
     * Get the total XP earned for a specific track.
     * @param trackUuid - The track UUID to check
     * @returns Total XP earned from all sessions for this track
     */
    getTrackXPTotal(trackUuid: string): number;

    /**
     * Clear all listening sessions for a specific track.
     * Used by the prestige system to reset track progress after prestiging.
     * @param trackUuid - The track UUID to clear sessions for
     * @returns Number of sessions that were removed
     */
    clearTrackSessions(trackUuid: string): number;
}
