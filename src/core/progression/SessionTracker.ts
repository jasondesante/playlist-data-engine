/**
 * SessionTracker - Manages listening sessions with timestamps and XP calculation
 * Based on specs/001-core-engine/SPEC.md
 */

import type {
    ListeningSession,
    EnvironmentalContext,
    GamingContext,
} from '../types/Progression.js';
import type { PlaylistTrack } from '../types/Playlist.js';
import { XPCalculator } from './XPCalculator.js';

/**
 * ActiveSession tracks a currently-playing listening session
 */
interface ActiveSession {
    track_uuid: string;
    start_time: number;
    track?: PlaylistTrack;
    environmental_context?: EnvironmentalContext;
    gaming_context?: GamingContext;
}

/**
 * SessionTracker class - Records and manages listening sessions
 * Tracks active sessions and calculates XP earned
 */
export class SessionTracker {
    private activeSessions: Map<string, ActiveSession> = new Map();
    private sessionHistory: ListeningSession[] = [];
    private xpCalculator: XPCalculator;
    private sessionCounter: number = 0;

    /**
     * Create a new SessionTracker
     * @param xpCalculator - Optional custom XPCalculator instance
     */
    constructor(xpCalculator?: XPCalculator) {
        this.xpCalculator = xpCalculator || new XPCalculator();
    }

    /**
     * Start a new listening session
     * @param trackUuid - UUID of the track being listened to
     * @param track - Optional PlaylistTrack object for metadata
     * @param context - Optional environmental and gaming context
     * @returns Session ID for tracking
     */
    startSession(
        trackUuid: string,
        track?: PlaylistTrack,
        context?: {
            environmental_context?: EnvironmentalContext;
            gaming_context?: GamingContext;
        }
    ): string {
        // Use counter to ensure unique IDs even if sessions start in the same millisecond
        const sessionId = `session-${this.sessionCounter++}-${trackUuid}-${Date.now()}`;

        this.activeSessions.set(sessionId, {
            track_uuid: trackUuid,
            start_time: Date.now(),
            track,
            environmental_context: context?.environmental_context,
            gaming_context: context?.gaming_context,
        });

        return sessionId;
    }

    /**
     * End a listening session and record it
     * @param sessionId - The session ID returned from startSession
     * @param durationOverride - Optional override for session duration (in seconds)
     * @param activityType - Optional activity type (stationary, walking, running, driving)
     * @returns The completed ListeningSession or null if session not found
     */
    endSession(
        sessionId: string,
        durationOverride?: number,
        activityType?: string
    ): ListeningSession | null {
        const activeSession = this.activeSessions.get(sessionId);
        if (!activeSession) {
            return null;
        }

        const endTime = Date.now();
        const durationSeconds = durationOverride || Math.max(1, Math.ceil((endTime - activeSession.start_time) / 1000));

        // Create the session record
        const session: ListeningSession = {
            track_uuid: activeSession.track_uuid,
            start_time: activeSession.start_time,
            end_time: endTime,
            duration_seconds: Math.round(durationSeconds),
            base_xp_earned: 0,
            bonus_xp: 0,
            activity_type: activityType,
            environmental_context: activeSession.environmental_context,
            gaming_context: activeSession.gaming_context,
            total_xp_earned: 0,
        };

        // Calculate XP
        session.base_xp_earned = Math.floor(
            session.duration_seconds * this.xpCalculator.getConfig().xp_per_second
        );

        // Apply all bonuses (activity, environmental, gaming, completion)
        session.total_xp_earned = this.xpCalculator.calculateSessionXP(session, activeSession.track);

        // Calculate bonus XP as the difference
        session.bonus_xp = session.total_xp_earned - session.base_xp_earned;

        // Record in history
        this.sessionHistory.push(session);

        // Clean up active session
        this.activeSessions.delete(sessionId);

        return session;
    }

    /**
     * Get an active session without ending it
     * Useful for tracking real-time progress
     * @param sessionId - The session ID
     * @returns The active session or null
     */
    getActiveSession(sessionId: string): ActiveSession | null {
        return this.activeSessions.get(sessionId) || null;
    }

    /**
     * Get duration of active session in seconds
     * @param sessionId - The session ID
     * @returns Duration in seconds or null if session not found
     */
    getActiveSessionDuration(sessionId: string): number | null {
        const session = this.activeSessions.get(sessionId);
        if (!session) return null;
        return (Date.now() - session.start_time) / 1000;
    }

    /**
     * Update context for an active session
     * @param sessionId - The session ID
     * @param context - New context data
     * @returns True if updated, false if session not found
     */
    updateSessionContext(
        sessionId: string,
        context: {
            environmental_context?: EnvironmentalContext;
            gaming_context?: GamingContext;
        }
    ): boolean {
        const session = this.activeSessions.get(sessionId);
        if (!session) return false;

        if (context.environmental_context) {
            session.environmental_context = context.environmental_context;
        }
        if (context.gaming_context) {
            session.gaming_context = context.gaming_context;
        }

        return true;
    }

    /**
     * Get all recorded sessions
     * @returns Array of all completed listening sessions
     */
    getSessionHistory(): ListeningSession[] {
        return [...this.sessionHistory];
    }

    /**
     * Get sessions for a specific track
     * @param trackUuid - The track UUID to filter by
     * @returns Array of sessions for that track
     */
    getSessionsForTrack(trackUuid: string): ListeningSession[] {
        return this.sessionHistory.filter((s) => s.track_uuid === trackUuid);
    }

    /**
     * Get total listening time across all sessions
     * @returns Total time in seconds
     */
    getTotalListeningTime(): number {
        return this.sessionHistory.reduce((total, session) => total + session.duration_seconds, 0);
    }

    /**
     * Get total XP earned across all sessions
     * @returns Total XP
     */
    getTotalXPEarned(): number {
        return this.sessionHistory.reduce((total, session) => total + session.total_xp_earned, 0);
    }

    /**
     * Get total listening time for a specific track
     * @param trackUuid - The track UUID
     * @returns Total time in seconds for that track
     */
    getTrackListeningTime(trackUuid: string): number {
        return this.getSessionsForTrack(trackUuid).reduce(
            (total, session) => total + session.duration_seconds,
            0
        );
    }

    /**
     * Get listen count for a track (number of sessions)
     * @param trackUuid - The track UUID
     * @returns Number of times the track has been listened to
     */
    getTrackListenCount(trackUuid: string): number {
        return this.getSessionsForTrack(trackUuid).length;
    }

    /**
     * Check if a track has been mastered
     * @param trackUuid - The track UUID
     * @param masteryThreshold - Minimum listen count to master (default 10)
     * @returns True if track is mastered
     */
    isTrackMastered(trackUuid: string, masteryThreshold: number = 10): boolean {
        return this.getTrackListenCount(trackUuid) >= masteryThreshold;
    }

    /**
     * Get sessions within a time range
     * @param startTime - Start timestamp (Unix ms)
     * @param endTime - End timestamp (Unix ms)
     * @returns Array of sessions within the range
     */
    getSessionsInRange(startTime: number, endTime: number): ListeningSession[] {
        return this.sessionHistory.filter(
            (s) => s.start_time >= startTime && s.end_time <= endTime
        );
    }

    /**
     * Get average session length
     * @returns Average duration in seconds
     */
    getAverageSessionLength(): number {
        if (this.sessionHistory.length === 0) return 0;
        return this.getTotalListeningTime() / this.sessionHistory.length;
    }

    /**
     * Get the longest session
     * @returns ListeningSession with longest duration or null
     */
    getLongestSession(): ListeningSession | null {
        if (this.sessionHistory.length === 0) return null;
        return this.sessionHistory.reduce((max, session) =>
            session.duration_seconds > max.duration_seconds ? session : max
        );
    }

    /**
     * Clear all session history
     * Useful for testing or resetting
     */
    clearHistory(): void {
        this.sessionHistory = [];
    }

    /**
     * Clear active sessions
     * Use with caution - active sessions will be lost
     */
    clearActiveSessions(): void {
        this.activeSessions.clear();
    }

    /**
     * Get count of active sessions
     * @returns Number of currently active sessions
     */
    getActiveSessionCount(): number {
        return this.activeSessions.size;
    }

    /**
     * Get all active session IDs
     * @returns Array of active session IDs
     */
    getActiveSessionIds(): string[] {
        return Array.from(this.activeSessions.keys());
    }
}
