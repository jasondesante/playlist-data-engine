/**
 * Subdivision Playback Controller
 *
 * Real-time subdivision controller for practice mode. Enables instant
 * switching between subdivision types during playback.
 *
 * Key features:
 * - Real-time beat generation based on current subdivision type
 * - Instant subdivision switching with configurable transition modes
 * - Continuity across subdivision changes
 * - Integration with Web Audio API for precise timing
 *
 * @example
 * ```typescript
 * const controller = new SubdivisionPlaybackController(unifiedMap, audioContext, {
 *   initialSubdivision: 'quarter',
 *   transitionMode: 'next-downbeat',
 *   onSubdivisionChange: (oldType, newType) => {
 *     console.log(`Switched from ${oldType} to ${newType}`);
 *   },
 * });
 *
 * // Subscribe to beat events
 * controller.subscribe((event) => {
 *   if (event.type === 'exact') {
 *     playBeatSound(event.beat);
 *   }
 * });
 *
 * controller.play();
 *
 * // User clicks "Eighth Notes" button in practice mode
 * controller.setSubdivision('eighth');  // Switches in real-time!
 * ```
 */

import type {
    UnifiedBeatMap,
    SubdividedBeat,
    SubdivisionType,
    SubdivisionConfig,
    SubdivisionPlaybackOptions,
    SubdivisionBeatEvent,
    SubdivisionCallback,
    BeatEventType,
} from '../types/BeatMap.js';
import {
    DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
    isValidSubdivisionType,
} from '../types/BeatMap.js';
import { BeatSubdivider, type BeatSubdividerOptions } from '../analysis/beat/BeatSubdivider.js';
import { Logger } from '../../utils/logger.js';

const logger = Logger.for('SubdivisionPlaybackController');

/**
 * Internal state for the playback controller
 */
interface PlaybackState {
    /** Whether the controller is currently running */
    isRunning: boolean;
    /** Whether playback is paused */
    isPaused: boolean;
    /** Current playback position in seconds */
    currentTime: number;
    /** Time when playback started (audio context time) */
    startTime: number;
    /** Pause time for resuming */
    pauseTime: number;
    /** Request animation frame ID for cleanup */
    rafId: number | null;
    /** Current subdivision type */
    currentSubdivision: SubdivisionType;
    /** Pending subdivision change (for deferred transitions) */
    pendingSubdivision: SubdivisionType | null;
    /** Scheduled beats for current subdivision */
    scheduledBeats: Map<string, { beat: SubdividedBeat; upcomingEmitted: boolean; exactEmitted: boolean; passedEmitted: boolean }>;
}

/**
 * Subdivision Playback Controller
 *
 * Provides real-time subdivision switching for practice mode.
 * Wraps a UnifiedBeatMap and generates beats on-the-fly based on
 * the current subdivision type.
 */
export class SubdivisionPlaybackController {
    private unifiedMap: UnifiedBeatMap;
    private audioContext: AudioContext;
    private options: Required<SubdivisionPlaybackOptions>;
    private state: PlaybackState;
    private subscribers: Set<SubdivisionCallback>;
    private subdivider: BeatSubdivider;

    /**
     * Create a new SubdivisionPlaybackController
     *
     * @param unifiedMap - The unified beat map to use for subdivision
     * @param audioContext - The Web Audio API AudioContext for timing
     * @param options - Configuration options
     *
     * @example
     * ```typescript
     * const beatMap = await generator.generateBeatMap('song.mp3', 'track-1');
     * const interpolatedMap = interpolator.interpolate(beatMap);
     * const unifiedMap = unifyBeatMap(interpolatedMap);
     *
     * const controller = new SubdivisionPlaybackController(
     *   unifiedMap,
     *   audioContext,
     *   {
     *     initialSubdivision: 'quarter',
     *     transitionMode: 'next-downbeat',
     *   }
     * );
     * ```
     */
    constructor(
        unifiedMap: UnifiedBeatMap,
        audioContext: AudioContext,
        options: SubdivisionPlaybackOptions = {}
    ) {
        this.unifiedMap = unifiedMap;
        this.audioContext = audioContext;
        this.options = {
            ...DEFAULT_SUBDIVISION_PLAYBACK_OPTIONS,
            ...options,
        };

        // Create subdivider for generating beats
        const subdividerOptions: BeatSubdividerOptions = {
            tolerance: 0.02,
            defaultIntensity: 0.5,
            defaultConfidence: 0.7,
        };
        this.subdivider = new BeatSubdivider(subdividerOptions);

        this.state = {
            isRunning: false,
            isPaused: false,
            currentTime: 0,
            startTime: 0,
            pauseTime: 0,
            rafId: null,
            currentSubdivision: this.options.initialSubdivision,
            pendingSubdivision: null,
            scheduledBeats: new Map(),
        };

        this.subscribers = new Set();

        // Initialize beats for the initial subdivision
        this.regenerateBeats();

        logger.debug('SubdivisionPlaybackController initialized', {
            audioId: unifiedMap.audioId,
            duration: unifiedMap.duration,
            initialSubdivision: this.state.currentSubdivision,
            beatCount: unifiedMap.beats.length,
        });
    }

    // ==================== Properties ====================

    /**
     * Get the current subdivision type
     */
    get subdivision(): SubdivisionType {
        return this.state.currentSubdivision;
    }

    /**
     * Get the unified beat map
     */
    get beatMap(): UnifiedBeatMap {
        return this.unifiedMap;
    }

    /**
     * Get the current playback options
     */
    getOptions(): Required<SubdivisionPlaybackOptions> {
        return { ...this.options };
    }

    // ==================== Core Methods ====================

    /**
     * Subscribe to beat events
     *
     * @param callback - Function to call when beat events occur
     * @returns Unsubscribe function
     *
     * @example
     * ```typescript
     * const unsubscribe = controller.subscribe((event) => {
     *   if (event.type === 'upcoming') {
     *     // Pre-render beat visual
     *   } else if (event.type === 'exact') {
     *     // Beat is happening now
     *   }
     * });
     *
     * // Later, to unsubscribe
     * unsubscribe();
     * ```
     */
    subscribe(callback: SubdivisionCallback): () => void {
        this.subscribers.add(callback);

        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Change subdivision type in real-time
     *
     * The transition behavior depends on the transitionMode option:
     * - 'immediate': Switch instantly at the current position
     * - 'next-downbeat': Wait for the next downbeat before switching
     * - 'next-measure': Wait for the next measure before switching
     *
     * @param type - The new subdivision type
     *
     * @example
     * ```typescript
     * // Switch to eighth notes immediately
     * controller.setSubdivision('eighth');
     *
     * // Switch to half notes
     * controller.setSubdivision('half');
     * ```
     */
    setSubdivision(type: SubdivisionType): void {
        if (!isValidSubdivisionType(type)) {
            throw new Error(`Invalid subdivision type: ${type}`);
        }

        if (this.state.currentSubdivision === type) {
            return; // No change needed
        }

        const oldType = this.state.currentSubdivision;

        logger.debug('Subdivision change requested', {
            from: oldType,
            to: type,
            transitionMode: this.options.transitionMode,
        });

        switch (this.options.transitionMode) {
            case 'immediate':
                this.applySubdivisionChange(type, oldType);
                break;

            case 'next-downbeat':
            case 'next-measure':
                // Defer the change until the next downbeat/measure
                this.state.pendingSubdivision = type;
                logger.debug('Subdivision change deferred', {
                    pendingType: type,
                    transitionMode: this.options.transitionMode,
                });
                break;

            default:
                // Fallback to immediate
                this.applySubdivisionChange(type, oldType);
        }
    }

    /**
     * Apply the subdivision change immediately
     */
    private applySubdivisionChange(newType: SubdivisionType, oldType: SubdivisionType): void {
        this.state.currentSubdivision = newType;
        this.state.pendingSubdivision = null;

        // Regenerate beats for the new subdivision
        this.regenerateBeats();

        // Notify callback
        if (this.options.onSubdivisionChange) {
            try {
                this.options.onSubdivisionChange(oldType, newType);
            } catch (error) {
                logger.error('Error in onSubdivisionChange callback', error);
            }
        }

        logger.debug('Subdivision changed', { from: oldType, to: newType });
    }

    /**
     * Regenerate beats for the current subdivision
     */
    private regenerateBeats(): void {
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),  // empty = all use default
            defaultSubdivision: this.state.currentSubdivision,
        };

        const subdividedMap = this.subdivider.subdivide(this.unifiedMap, config);

        // Rebuild scheduled beats map
        this.state.scheduledBeats.clear();

        for (const beat of subdividedMap.beats) {
            const key = this.getBeatKey(beat);
            this.state.scheduledBeats.set(key, {
                beat,
                upcomingEmitted: false,
                exactEmitted: false,
                passedEmitted: false,
            });
        }

        logger.debug('Beats regenerated', {
            subdivision: this.state.currentSubdivision,
            beatCount: subdividedMap.beats.length,
        });
    }

    /**
     * Get a unique key for a beat
     */
    private getBeatKey(beat: SubdividedBeat): string {
        return `${beat.timestamp.toFixed(6)}-${beat.subdivisionType}`;
    }

    // ==================== Playback Control ====================

    /**
     * Start streaming beat events
     *
     * Begins emitting events synchronized with audio playback.
     * Should be called when audio starts playing.
     */
    play(): void {
        if (this.state.isRunning) {
            return;
        }

        this.state.isRunning = true;
        this.state.startTime = this.audioContext.currentTime - this.state.pauseTime;
        this.state.isPaused = false;

        // Start the update loop
        this.scheduleUpdate();

        logger.debug('Playback started', {
            startTime: this.state.startTime,
            pauseTime: this.state.pauseTime,
        });
    }

    /**
     * Stop streaming beat events
     *
     * Stops all event emission and resets state.
     */
    stop(): void {
        if (this.state.rafId !== null) {
            cancelAnimationFrame(this.state.rafId);
            this.state.rafId = null;
        }

        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.pauseTime = 0;

        // Reset all scheduled beats
        this.regenerateBeats();

        logger.debug('Playback stopped');
    }

    /**
     * Pause the playback
     *
     * Temporarily stops event emission but preserves position.
     */
    pause(): void {
        if (!this.state.isRunning || this.state.isPaused) {
            return;
        }

        this.state.isPaused = true;
        this.state.pauseTime = this.getCurrentAudioTime();

        if (this.state.rafId !== null) {
            cancelAnimationFrame(this.state.rafId);
            this.state.rafId = null;
        }

        logger.debug('Playback paused', { pauseTime: this.state.pauseTime });
    }

    /**
     * Resume a paused playback
     */
    resume(): void {
        if (!this.state.isPaused) {
            return;
        }

        this.state.isPaused = false;
        this.state.startTime = this.audioContext.currentTime - this.state.pauseTime;
        this.scheduleUpdate();

        logger.debug('Playback resumed', { startTime: this.state.startTime });
    }

    /**
     * Seek to a specific time position
     *
     * @param time - Time in seconds to seek to
     */
    seek(time: number): void {
        // Clamp time to valid range
        const clampedTime = Math.max(0, Math.min(time, this.unifiedMap.duration));

        this.state.pauseTime = clampedTime;

        if (this.state.isRunning && !this.state.isPaused) {
            this.state.startTime = this.audioContext.currentTime - clampedTime;
        }

        // Reset scheduled beats for the new position
        this.regenerateBeats();

        logger.debug('Seeked to time', { time: clampedTime });
    }

    // ==================== Beat Query Methods ====================

    /**
     * Get beats for a time range (generated on-the-fly)
     *
     * This method generates beats based on the current subdivision type
     * within the specified time range.
     *
     * @param startTime - Start time in seconds
     * @param endTime - End time in seconds
     * @returns Array of subdivided beats in the range
     *
     * @example
     * ```typescript
     * // Get beats for the next 5 seconds
     * const beats = controller.getBeatsInRange(currentTime, currentTime + 5);
     * ```
     */
    getBeatsInRange(startTime: number, endTime: number): SubdividedBeat[] {
        const result: SubdividedBeat[] = [];

        for (const [, scheduled] of this.state.scheduledBeats) {
            const beat = scheduled.beat;
            if (beat.timestamp >= startTime && beat.timestamp <= endTime) {
                result.push(beat);
            }
        }

        // Sort by timestamp
        result.sort((a, b) => a.timestamp - b.timestamp);

        return result;
    }

    /**
     * Get upcoming beats for pre-rendering
     *
     * Returns beats that will occur within the anticipation window.
     *
     * @param count - Maximum number of beats to return
     * @returns Array of upcoming beats
     */
    getUpcomingBeats(count: number): SubdividedBeat[] {
        const currentTime = this.getCurrentAudioTime();
        const upcomingBeats: SubdividedBeat[] = [];

        for (const [, scheduled] of this.state.scheduledBeats) {
            const beat = scheduled.beat;
            const timeUntilBeat = beat.timestamp - currentTime;

            if (
                timeUntilBeat >= 0 &&
                timeUntilBeat <= this.options.anticipationTime
            ) {
                upcomingBeats.push(beat);

                if (upcomingBeats.length >= count) {
                    break;
                }
            }
        }

        // Sort by timestamp
        upcomingBeats.sort((a, b) => a.timestamp - b.timestamp);

        return upcomingBeats;
    }

    /**
     * Get the beat at a specific time
     *
     * Returns the beat closest to the given time within the timing tolerance.
     *
     * @param time - Time in seconds
     * @returns Beat at the time, or null if no beat is near
     */
    getBeatAtTime(time: number): SubdividedBeat | null {
        const tolerance = this.options.timingTolerance;

        for (const [, scheduled] of this.state.scheduledBeats) {
            if (Math.abs(scheduled.beat.timestamp - time) <= tolerance) {
                return scheduled.beat;
            }
        }

        return null;
    }

    /**
     * Get the current beat (the beat that is currently playing or most recently passed)
     *
     * @returns Current beat, or null if before first beat
     */
    getCurrentBeat(): SubdividedBeat | null {
        const currentTime = this.getCurrentAudioTime();
        let currentBeat: SubdividedBeat | null = null;

        for (const [, scheduled] of this.state.scheduledBeats) {
            if (scheduled.beat.timestamp <= currentTime) {
                currentBeat = scheduled.beat;
            } else {
                break;
            }
        }

        return currentBeat;
    }

    /**
     * Get the next beat (the beat that will occur next)
     *
     * @returns Next beat, or null if after last beat
     */
    getNextBeat(): SubdividedBeat | null {
        const currentTime = this.getCurrentAudioTime();

        const sortedBeats = Array.from(this.state.scheduledBeats.values())
            .map(s => s.beat)
            .sort((a, b) => a.timestamp - b.timestamp);

        for (const beat of sortedBeats) {
            if (beat.timestamp > currentTime) {
                return beat;
            }
        }

        return null;
    }

    // ==================== Audio Synchronization ====================

    /**
     * Get the current audio time with latency compensation
     *
     * @returns Current audio time in seconds
     */
    private getCurrentAudioTime(): number {
        // If not running, return the pause position
        if (!this.state.isRunning) {
            return this.state.pauseTime;
        }

        // If paused, return the pause time
        if (this.state.isPaused) {
            return this.state.pauseTime;
        }

        return this.audioContext.currentTime - this.state.startTime + this.getTotalLatencyCompensation();
    }

    /**
     * Get total latency compensation in seconds
     *
     * Combines output latency, base latency, and user offset
     */
    private getTotalLatencyCompensation(): number {
        let compensation = 0;

        // Apply output latency compensation if enabled
        if (this.options.compensateOutputLatency) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outputLatency = (this.audioContext as any).outputLatency ?? 0;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const baseLatency = (this.audioContext as any).baseLatency ?? 0;
            compensation += outputLatency + baseLatency;
        }

        // Apply user-calibrated offset (convert ms to seconds)
        compensation += this.options.userOffsetMs / 1000;

        return compensation;
    }

    // ==================== Update Loop ====================

    /**
     * Schedule the next update frame
     */
    private scheduleUpdate(): void {
        if (!this.state.isRunning || this.state.isPaused) {
            return;
        }

        this.state.rafId = requestAnimationFrame(() => {
            this.update();
            this.scheduleUpdate();
        });
    }

    /**
     * Main update loop - checks for beat events to emit
     */
    private update(): void {
        if (!this.state.isRunning || this.state.isPaused) {
            return;
        }

        const currentTime = this.getCurrentAudioTime();

        // Check for pending subdivision changes (next-downbeat or next-measure)
        this.checkPendingSubdivisionChange(currentTime);

        // Process each beat
        for (const scheduled of this.state.scheduledBeats.values()) {
            const beatTime = scheduled.beat.timestamp;
            const timeUntilBeat = beatTime - currentTime;

            // Emit 'upcoming' event if within anticipation window
            if (
                !scheduled.upcomingEmitted &&
                timeUntilBeat <= this.options.anticipationTime &&
                timeUntilBeat > 0
            ) {
                this.emitEvent(scheduled.beat, 'upcoming', currentTime, timeUntilBeat);
                scheduled.upcomingEmitted = true;
            }

            // Emit 'exact' event when beat time is reached (within tolerance)
            if (
                !scheduled.exactEmitted &&
                Math.abs(timeUntilBeat) <= this.options.timingTolerance
            ) {
                this.emitEvent(scheduled.beat, 'exact', currentTime, timeUntilBeat);
                scheduled.exactEmitted = true;
            }

            // Emit 'passed' event if beat was missed
            if (
                !scheduled.passedEmitted &&
                timeUntilBeat < -this.options.timingTolerance
            ) {
                this.emitEvent(scheduled.beat, 'passed', currentTime, timeUntilBeat);
                scheduled.passedEmitted = true;
            }
        }
    }

    /**
     * Check for pending subdivision changes
     */
    private checkPendingSubdivisionChange(_currentTime: number): void {
        if (!this.state.pendingSubdivision) {
            return;
        }

        const currentBeat = this.getCurrentBeat();
        if (!currentBeat) {
            return;
        }

        const shouldChange = this.options.transitionMode === 'next-downbeat'
            ? currentBeat.isDownbeat
            : this.options.transitionMode === 'next-measure'
                ? currentBeat.beatInMeasure === 0
                : false;

        if (shouldChange) {
            this.applySubdivisionChange(
                this.state.pendingSubdivision,
                this.state.currentSubdivision
            );
        }
    }

    /**
     * Emit a beat event to all subscribers
     */
    private emitEvent(
        beat: SubdividedBeat,
        type: BeatEventType,
        audioTime: number,
        timeUntilBeat: number
    ): void {
        const event: SubdivisionBeatEvent = {
            beat,
            currentSubdivision: this.state.currentSubdivision,
            audioTime,
            timeUntilBeat,
            type,
        };

        for (const callback of this.subscribers) {
            try {
                callback(event);
            } catch (error) {
                logger.error('SubdivisionPlaybackController callback error:', error);
            }
        }
    }

    // ==================== Utility Methods ====================

    /**
     * Check if the controller is currently running
     */
    isRunning(): boolean {
        return this.state.isRunning && !this.state.isPaused;
    }

    /**
     * Check if the controller is paused
     */
    isPaused(): boolean {
        return this.state.isPaused;
    }

    /**
     * Get the current playback position
     *
     * @returns Current time in seconds
     */
    getCurrentTime(): number {
        return this.getCurrentAudioTime();
    }

    /**
     * Get the beat map duration
     */
    getDuration(): number {
        return this.unifiedMap.duration;
    }

    /**
     * Update the unified beat map (e.g., after re-analysis)
     *
     * @param unifiedMap - New unified beat map to use
     */
    setBeatMap(unifiedMap: UnifiedBeatMap): void {
        this.unifiedMap = unifiedMap;
        this.regenerateBeats();

        logger.debug('Beat map updated', {
            audioId: unifiedMap.audioId,
            beatCount: unifiedMap.beats.length,
        });
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.stop();
        this.subscribers.clear();
        this.state.scheduledBeats.clear();

        logger.debug('SubdivisionPlaybackController disposed');
    }
}
