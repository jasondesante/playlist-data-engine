/**
 * Beat Stream
 *
 * Real-time beat event streaming synchronized with audio playback.
 * Provides precise beat timing with latency compensation and anticipation.
 *
 * Key features:
 * - Sample-accurate timing via AudioContext synchronization
 * - Configurable anticipation time for pre-rendering (default 2.0s)
 * - Latency compensation (output + base + user offset)
 * - Rolling BPM calculation from actual beat intervals
 * - Button press accuracy detection for rhythm games
 *
 * @example
 * ```typescript
 * const beatStream = new BeatStream(beatMap, audioContext, {
 *   anticipationTime: 2.0,
 *   userOffsetMs: 0,
 *   compensateOutputLatency: true,
 * });
 *
 * const unsubscribe = beatStream.subscribe((event) => {
 *   if (event.type === 'upcoming') {
 *     // Pre-render beat visual
 *   } else if (event.type === 'exact') {
 *     // Beat is happening now
 *   }
 * });
 *
 * beatStream.start();
 * ```
 */

import type {
    Beat,
    BeatMap,
    BeatStreamOptions,
    BeatStreamCallback,
    BeatEvent,
    BeatEventType,
    AudioSyncState,
    ButtonPressResult,
    BeatAccuracy,
    InterpolatedBeatMap,
    BeatWithSource,
    SubdividedBeatMap,
} from '../../types/BeatMap.js';
import {
    DEFAULT_BEATSTREAM_OPTIONS,
    getAccuracyThresholdsForPreset,
} from '../../types/BeatMap.js';
import type { AccuracyThresholds } from '../../types/BeatMap.js';

/**
 * Type guard to check if an object is an InterpolatedBeatMap
 */
function isInterpolatedBeatMap(map: BeatMap | InterpolatedBeatMap | SubdividedBeatMap): map is InterpolatedBeatMap {
    return 'mergedBeats' in map && 'detectedBeats' in map;
}

/**
 * Type guard to check if an object is a SubdividedBeatMap
 */
function isSubdividedBeatMap(map: BeatMap | InterpolatedBeatMap | SubdividedBeatMap): map is SubdividedBeatMap {
    return 'subdivisionConfig' in map && 'subdivisionMetadata' in map;
}

/**
 * Internal state for a beat event that has been scheduled
 */
interface ScheduledBeat {
    /** The beat being scheduled */
    beat: Beat;
    /** Index of the beat in the beat map */
    index: number;
    /** Whether the 'upcoming' event has been emitted */
    upcomingEmitted: boolean;
    /** Whether the 'exact' event has been emitted */
    exactEmitted: boolean;
    /** Whether the 'passed' event has been emitted */
    passedEmitted: boolean;
}

/**
 * Internal state for BeatStream
 */
interface StreamState {
    /** Whether the stream is currently running */
    isRunning: boolean;
    /** Current playback position in seconds (audio context time) */
    currentTime: number;
    /** Time when playback started (for calculating position) */
    startTime: number;
    /** Whether the stream is paused */
    isPaused: boolean;
    /** Pause time for resuming */
    pauseTime: number;
    /** Request animation frame ID for cleanup */
    rafId: number | null;
    /** Last button press result */
    lastButtonPress: ButtonPressResult | null;
    /** Resolved accuracy thresholds based on difficulty preset and custom thresholds */
    thresholds: AccuracyThresholds;
}

/**
 * Beat Stream - Real-time beat event streaming synchronized with audio playback
 *
 * Emits beat events ('upcoming', 'exact', 'passed') synchronized with audio
 * playback using the Web Audio API for precise timing.
 *
 * Supports BeatMap, InterpolatedBeatMap, and SubdividedBeatMap:
 * - When given a BeatMap, uses the beats array directly
 * - When given an InterpolatedBeatMap with useInterpolatedBeats: true, uses mergedBeats
 * - When given an InterpolatedBeatMap with useInterpolatedBeats: false, uses detectedBeats
 * - When given a SubdividedBeatMap, uses the subdivided beats array directly
 */
export class BeatStream {
    private beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap;
    private normalizedBeatMap: BeatMap;
    private audioContext: AudioContext;
    private options: Required<BeatStreamOptions>;
    private state: StreamState;
    private subscribers: Set<BeatStreamCallback>;
    private scheduledBeats: ScheduledBeat[];
    private rollingBpmWindowSize: number;

    /**
     * Create a new BeatStream
     *
     * @param beatMap - The beat map containing beat data (BeatMap, InterpolatedBeatMap, or SubdividedBeatMap)
     * @param audioContext - The Web Audio API AudioContext for timing
     * @param options - Configuration options
     * @param rollingBpmWindowSize - Number of beats for rolling BPM calculation (default: 8)
     *
     * @example
     * ```typescript
     * // With a regular BeatMap
     * const beatStream = new BeatStream(beatMap, audioContext);
     *
     * // With an InterpolatedBeatMap using interpolated beats
     * const interpolatedMap = interpolator.interpolate(beatMap);
     * const beatStream = new BeatStream(interpolatedMap, audioContext, {
     *     useInterpolatedBeats: true
     * });
     *
     * // With a SubdividedBeatMap (e.g., eighth notes)
     * const unifiedMap = unifyBeatMap(interpolatedMap);
     * const subdividedMap = subdivider.subdivide(unifiedMap, {
     *     beatSubdivisions: new Map(),
     *     defaultSubdivision: 'eighth',
     * });
     * const beatStream = new BeatStream(subdividedMap, audioContext);
     * ```
     */
    constructor(
        beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap,
        audioContext: AudioContext,
        options: BeatStreamOptions = {},
        rollingBpmWindowSize: number = 8
    ) {
        this.beatMap = beatMap;
        this.audioContext = audioContext;
        this.options = { ...DEFAULT_BEATSTREAM_OPTIONS, ...options };
        this.rollingBpmWindowSize = rollingBpmWindowSize;

        // Normalize the beat map for internal use
        this.normalizedBeatMap = this.createNormalizedBeatMap(beatMap);

        this.state = {
            isRunning: false,
            currentTime: 0,
            startTime: 0,
            isPaused: false,
            pauseTime: 0,
            rafId: null,
            lastButtonPress: null,
            thresholds: this.resolveThresholds(),
        };

        this.subscribers = new Set();
        this.scheduledBeats = this.initializeScheduledBeats();
    }

    /**
     * Create a normalized BeatMap for internal use
     *
     * Handles BeatMap, InterpolatedBeatMap, and SubdividedBeatMap inputs,
     * selecting the appropriate beat array based on the map type and options.
     */
    private createNormalizedBeatMap(map: BeatMap | InterpolatedBeatMap | SubdividedBeatMap): BeatMap {
        if (isSubdividedBeatMap(map)) {
            // It's a SubdividedBeatMap - use the subdivided beats
            // Calculate BPM from beat intervals if available, otherwise use a default
            let bpm = 120; // Default BPM
            if (map.beats.length >= 2) {
                // Calculate BPM from the first two beats
                const interval = map.beats[1].timestamp - map.beats[0].timestamp;
                if (interval > 0) {
                    bpm = 60 / interval;
                }
            }

            // Create metadata from subdivision metadata
            const metadata = {
                version: '1.0.0',
                algorithm: 'subdivision',
                minBpm: bpm,
                maxBpm: bpm,
                sensitivity: 1.0,
                filter: 0.0,
                noiseFloorThreshold: 0.1,
                hopSizeMs: 4,
                fftSize: 2048,
                dpAlpha: 680,
                melBands: 40,
                highPassCutoff: 0.4,
                gaussianSmoothMs: 20,
                tempoCenter: 0.5,
                tempoWidth: 1.4,
                generatedAt: new Date().toISOString(),
            };

            return {
                audioId: map.audioId,
                duration: map.duration,
                beats: map.beats,
                bpm,
                metadata,
                downbeatConfig: map.downbeatConfig,
            };
        } else if (isInterpolatedBeatMap(map)) {
            // It's an InterpolatedBeatMap
            if (this.options.useInterpolatedBeats) {
                // Use merged beats (interpolated + detected)
                return {
                    audioId: map.audioId,
                    duration: map.duration,
                    beats: map.mergedBeats,
                    bpm: map.quarterNoteBpm,
                    metadata: map.originalMetadata,
                };
            } else {
                // Use detected beats only
                return {
                    audioId: map.audioId,
                    duration: map.duration,
                    beats: map.detectedBeats,
                    bpm: map.quarterNoteBpm,
                    metadata: map.originalMetadata,
                };
            }
        } else {
            // It's a regular BeatMap, use as-is
            return map;
        }
    }

    /**
     * Initialize scheduled beats array
     */
    private initializeScheduledBeats(): ScheduledBeat[] {
        return this.normalizedBeatMap.beats.map((beat, index) => ({
            beat,
            index,
            upcomingEmitted: false,
            exactEmitted: false,
            passedEmitted: false,
        }));
    }

    /**
     * Get the current configuration
     */
    getOptions(): Required<BeatStreamOptions> {
        return { ...this.options };
    }

    /**
     * Get the current accuracy thresholds being used
     *
     * Returns the resolved thresholds based on the difficulty preset
     * and any custom threshold overrides.
     *
     * @returns The current accuracy thresholds
     */
    getAccuracyThresholds(): AccuracyThresholds {
        return { ...this.state.thresholds };
    }

    /**
     * Change difficulty settings mid-stream
     *
     * Allows changing the difficulty preset and/or custom thresholds without
     * recreating the BeatStream. Useful for:
     * - Adaptive difficulty (adjust based on player performance)
     * - Practice mode (try different difficulties without restarting)
     * - Accessibility (let players adjust on the fly)
     *
     * @param options - Difficulty options
     * @param options.preset - New difficulty preset ('easy', 'medium', 'hard')
     * @param options.customThresholds - Custom threshold overrides (merged with preset)
     *
     * @example
     * ```typescript
     * // Switch to easy mode
     * beatStream.setDifficulty({ preset: 'easy' });
     *
     * // Use custom thresholds
     * beatStream.setDifficulty({
     *     preset: 'medium',
     *     customThresholds: { perfect: 0.060 }  // Looser perfect window
     * });
     *
     * // Clear custom thresholds and use preset only
     * beatStream.setDifficulty({ preset: 'hard', customThresholds: {} });
     * ```
     */
    setDifficulty(options: {
        preset?: import('../../types/BeatMap.js').DifficultyPreset;
        customThresholds?: Partial<AccuracyThresholds>;
    }): void {
        // Update options
        if (options.preset !== undefined) {
            this.options.difficultyPreset = options.preset;
        }
        if (options.customThresholds !== undefined) {
            this.options.customThresholds = options.customThresholds;
        }

        // Re-resolve thresholds with new options
        this.state.thresholds = this.resolveThresholds();
    }

    // ==================== Core Methods ====================

    /**
     * Subscribe to beat events
     *
     * @param callback - Function to call when beat events occur
     * @returns Unsubscribe function
     */
    subscribe(callback: BeatStreamCallback): () => void {
        this.subscribers.add(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Start streaming beat events
     *
     * Begins emitting events synchronized with audio playback.
     * Should be called when audio starts playing.
     */
    start(): void {
        if (this.state.isRunning) {
            return;
        }

        this.state.isRunning = true;
        this.state.startTime = this.audioContext.currentTime - this.state.pauseTime;
        this.state.isPaused = false;

        // Start the update loop
        this.scheduleUpdate();
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
        this.scheduledBeats = this.initializeScheduledBeats();
    }

    /**
     * Pause the beat stream
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
    }

    /**
     * Resume a paused beat stream
     */
    resume(): void {
        if (!this.state.isPaused) {
            return;
        }

        this.state.isPaused = false;
        this.state.startTime = this.audioContext.currentTime - this.state.pauseTime;
        this.scheduleUpdate();
    }

    /**
     * Seek to a specific time position
     *
     * @param time - Time in seconds to seek to
     */
    seek(time: number): void {
        // Clamp time to valid range
        const clampedTime = Math.max(0, Math.min(time, this.normalizedBeatMap.duration));

        this.state.pauseTime = clampedTime;

        if (this.state.isRunning && !this.state.isPaused) {
            this.state.startTime = this.audioContext.currentTime - clampedTime;
        }

        // Reset scheduled beats for the new position
        this.scheduledBeats = this.initializeScheduledBeats();
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
            // outputLatency may not be available in all browsers
            const outputLatency = (this.audioContext as any).outputLatency ?? 0;
            const baseLatency = (this.audioContext as any).baseLatency ?? 0;
            compensation += outputLatency + baseLatency;
        }

        // Apply user-calibrated offset (convert ms to seconds)
        compensation += this.options.userOffsetMs / 1000;

        return compensation;
    }

    /**
     * Get the current synchronization state for debugging
     *
     * @returns Current audio sync state
     */
    getSyncState(): AudioSyncState {
        const audioContextTime = this.audioContext.currentTime;
        const audioElementTime = this.getCurrentAudioTime();
        const outputLatency = (this.audioContext as any).outputLatency ?? 0;
        const baseLatency = (this.audioContext as any).baseLatency ?? 0;

        const expectedTime = audioContextTime - this.state.startTime;
        const drift = audioElementTime - expectedTime - this.getTotalLatencyCompensation();

        return {
            audioContextTime,
            audioElementTime,
            drift,
            isSynchronized: Math.abs(drift) <= this.options.timingTolerance,
            outputLatency,
            baseLatency,
            userOffsetMs: this.options.userOffsetMs,
            totalCompensation: this.getTotalLatencyCompensation(),
        };
    }

    // ==================== Beat Event Emission ====================

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
        const currentBpm = this.getCurrentBpm();

        // Process each beat
        for (const scheduledBeat of this.scheduledBeats) {
            const beatTime = scheduledBeat.beat.timestamp;
            const timeUntilBeat = beatTime - currentTime;

            // Emit 'upcoming' event if within anticipation window
            if (
                !scheduledBeat.upcomingEmitted &&
                timeUntilBeat <= this.options.anticipationTime &&
                timeUntilBeat > 0
            ) {
                this.emitEvent(scheduledBeat, 'upcoming', currentTime, currentBpm, timeUntilBeat);
                scheduledBeat.upcomingEmitted = true;
            }

            // Emit 'exact' event when beat time is reached (within tolerance)
            if (
                !scheduledBeat.exactEmitted &&
                Math.abs(timeUntilBeat) <= this.options.timingTolerance
            ) {
                this.emitEvent(scheduledBeat, 'exact', currentTime, currentBpm, timeUntilBeat);
                scheduledBeat.exactEmitted = true;
            }

            // Emit 'passed' event if beat was missed
            if (
                !scheduledBeat.passedEmitted &&
                timeUntilBeat < -this.options.timingTolerance
            ) {
                this.emitEvent(scheduledBeat, 'passed', currentTime, currentBpm, timeUntilBeat);
                scheduledBeat.passedEmitted = true;
            }
        }
    }

    /**
     * Emit a beat event to all subscribers
     */
    private emitEvent(
        scheduledBeat: ScheduledBeat,
        type: BeatEventType,
        audioTime: number,
        currentBpm: number,
        timeUntilBeat: number
    ): void {
        const event: BeatEvent = {
            beat: scheduledBeat.beat,
            currentBpm,
            audioTime,
            timeUntilBeat,
            type,
        };

        for (const callback of this.subscribers) {
            try {
                callback(event);
            } catch (error) {
                console.error('BeatStream callback error:', error);
            }
        }
    }

    // ==================== Query Methods ====================

    /**
     * Get upcoming beats for pre-rendering
     *
     * Returns beats that will occur within the anticipation window.
     *
     * @param count - Maximum number of beats to return
     * @returns Array of upcoming beats
     */
    getUpcomingBeats(count: number): Beat[] {
        const currentTime = this.getCurrentAudioTime();
        const upcomingBeats: Beat[] = [];

        for (const beat of this.normalizedBeatMap.beats) {
            const timeUntilBeat = beat.timestamp - currentTime;

            // Include beats at current position and in the future within anticipation window
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
    getBeatAtTime(time: number): Beat | null {
        const tolerance = this.options.timingTolerance;

        for (const beat of this.normalizedBeatMap.beats) {
            if (Math.abs(beat.timestamp - time) <= tolerance) {
                return beat;
            }
        }

        return null;
    }

    /**
     * Get the current beat (the beat that is currently playing or most recently passed)
     *
     * @returns Current beat, or null if before first beat
     */
    getCurrentBeat(): Beat | null {
        const currentTime = this.getCurrentAudioTime();
        let currentBeat: Beat | null = null;

        for (const beat of this.normalizedBeatMap.beats) {
            if (beat.timestamp <= currentTime) {
                currentBeat = beat;
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
    getNextBeat(): Beat | null {
        const currentTime = this.getCurrentAudioTime();

        for (const beat of this.normalizedBeatMap.beats) {
            if (beat.timestamp > currentTime) {
                return beat;
            }
        }

        return null;
    }

    // ==================== BPM Calculation ====================

    /**
     * Get the current BPM calculated from recent beat intervals
     *
     * Uses a rolling window of beat intervals to calculate the
     * current tempo, which handles gradual tempo drift.
     *
     * @returns Current BPM, or the beat map's initial BPM if not enough beats
     */
    getCurrentBpm(): number {
        const currentTime = this.getCurrentAudioTime();
        const recentBeats: Beat[] = [];

        // Collect beats that have passed or are near
        for (const beat of this.normalizedBeatMap.beats) {
            if (beat.timestamp <= currentTime + 0.1) {
                recentBeats.push(beat);
            }
        }

        // Need at least 2 beats to calculate interval
        if (recentBeats.length < 2) {
            return this.normalizedBeatMap.bpm;
        }

        // Get the last N beats (up to window size)
        const windowSize = Math.min(this.rollingBpmWindowSize, recentBeats.length);
        const windowBeats = recentBeats.slice(-windowSize);

        // Calculate average interval
        let totalInterval = 0;
        for (let i = 1; i < windowBeats.length; i++) {
            totalInterval += windowBeats[i].timestamp - windowBeats[i - 1].timestamp;
        }

        const averageInterval = totalInterval / (windowBeats.length - 1);

        // Convert to BPM (60 seconds / interval)
        const bpm = 60 / averageInterval;

        // Clamp to reasonable range
        return Math.max(30, Math.min(300, bpm));
    }

    // ==================== Button Press Detection ====================

    /**
     * Resolve the effective accuracy thresholds based on options
     *
     * If custom thresholds are provided, they are merged with the base preset.
     * Otherwise, the preset thresholds are used directly.
     *
     * @returns The effective accuracy thresholds
     */
    private resolveThresholds(): AccuracyThresholds {
        // If custom thresholds provided, merge with defaults from preset
        if (this.options.customThresholds && Object.keys(this.options.customThresholds).length > 0) {
            const base = getAccuracyThresholdsForPreset(this.options.difficultyPreset || 'medium');
            return {
                ...base,
                ...this.options.customThresholds,
            };
        }

        // Otherwise use preset
        return getAccuracyThresholdsForPreset(this.options.difficultyPreset || 'medium');
    }

    /**
     * Check the accuracy of a button press
     *
     * Determines how close the button press was to the nearest beat.
     * If the beat has a requiredKey, validates that the pressedKey matches.
     *
     * @param timestamp - The time of the button press (use audioContext.currentTime)
     * @param pressedKey - Optional key that was pressed (for key-matching beats)
     * @returns Button press result with accuracy level and key match info
     */
    checkButtonPress(timestamp: number, pressedKey?: string): ButtonPressResult {
        // Find the nearest beat to the press time
        let nearestBeat: Beat | null = null;
        let smallestOffset = Infinity;

        for (const beat of this.normalizedBeatMap.beats) {
            const offset = timestamp - beat.timestamp;
            const absoluteOffset = Math.abs(offset);

            if (absoluteOffset < smallestOffset) {
                smallestOffset = absoluteOffset;
                nearestBeat = beat;
            }
        }

        // If no beats found, return miss
        if (!nearestBeat) {
            const result: ButtonPressResult = {
                accuracy: 'miss',
                offset: timestamp,
                matchedBeat: null as any,
                absoluteOffset: timestamp,
                keyMatch: true, // No beat to match against, so technically "matched"
                pressedKey,
                requiredKey: undefined,
            };
            this.state.lastButtonPress = result;
            return result;
        }

        const offset = timestamp - nearestBeat.timestamp;
        const absoluteOffset = Math.abs(offset);

        // Determine accuracy level using configured thresholds
        let accuracy: BeatAccuracy;
        const thresholds = this.state.thresholds;

        if (absoluteOffset <= thresholds.perfect) {
            accuracy = 'perfect';
        } else if (absoluteOffset <= thresholds.great) {
            accuracy = 'great';
        } else if (absoluteOffset <= thresholds.good) {
            accuracy = 'good';
        } else if (absoluteOffset <= thresholds.ok) {
            accuracy = 'ok';
        } else {
            accuracy = 'miss';
        }

        // Check key matching if the beat has a required key
        const ignoreKeyRequirements = this.options.ignoreKeyRequirements ?? false;
        const hasRequiredKey = nearestBeat.requiredKey !== undefined;
        let keyMatch = true;

        // Only check key matching if:
        // 1. Key requirements are not being ignored
        // 2. The beat has a required key
        if (!ignoreKeyRequirements && hasRequiredKey) {
            if (pressedKey === undefined) {
                // No key provided but beat requires one - treat as miss
                accuracy = 'miss';
                keyMatch = false;
            } else if (pressedKey !== nearestBeat.requiredKey) {
                // Wrong key pressed
                accuracy = 'wrongKey';
                keyMatch = false;
            }
            // else: correct key pressed, keep timing-based accuracy
        }

        const result: ButtonPressResult = {
            accuracy,
            offset,
            matchedBeat: nearestBeat,
            absoluteOffset,
            keyMatch,
            pressedKey,
            requiredKey: nearestBeat.requiredKey,
        };

        this.state.lastButtonPress = result;
        return result;
    }

    /**
     * Get the accuracy of the last button press
     *
     * @returns Last button press result, or null if no button has been pressed
     */
    getLastBeatAccuracy(): ButtonPressResult | null {
        return this.state.lastButtonPress;
    }

    // ==================== Utility Methods ====================

    /**
     * Check if the stream is currently running
     */
    isRunning(): boolean {
        return this.state.isRunning && !this.state.isPaused;
    }

    /**
     * Check if the stream is paused
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
        return this.normalizedBeatMap.duration;
    }

    /**
     * Get the original beat map (may be BeatMap, InterpolatedBeatMap, or SubdividedBeatMap)
     *
     * @returns The original beat map passed to the constructor
     */
    getBeatMap(): BeatMap | InterpolatedBeatMap | SubdividedBeatMap {
        return this.beatMap;
    }

    /**
     * Get the normalized beat map used internally
     *
     * This is always a BeatMap, regardless of whether the original was
     * a BeatMap or InterpolatedBeatMap.
     *
     * @returns The normalized beat map
     */
    getNormalizedBeatMap(): BeatMap {
        return this.normalizedBeatMap;
    }

    /**
     * Update the beat map (e.g., after manual editing)
     *
     * @param beatMap - New beat map to use (BeatMap, InterpolatedBeatMap, or SubdividedBeatMap)
     */
    setBeatMap(beatMap: BeatMap | InterpolatedBeatMap | SubdividedBeatMap): void {
        this.beatMap = beatMap;
        this.normalizedBeatMap = this.createNormalizedBeatMap(beatMap);
        this.scheduledBeats = this.initializeScheduledBeats();
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.stop();
        this.subscribers.clear();
    }
}
