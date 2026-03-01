/**
 * Beat Map Test Utilities
 *
 * Provides helper functions and generators for creating synthetic beat maps
 * for testing the beat interpolation system.
 *
 * Reference: "Beat Tracking by Dynamic Programming" (Ellis, 2007)
 */

import type {
    Beat,
    BeatMap,
    BeatMapMetadata,
    BeatSource,
    BeatWithSource,
    InterpolatedBeatMap,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
} from '../../src/core/types/BeatMap.js';
import {
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
} from '../../src/core/types/BeatMap.js';

// ============================================================================
// Basic Helper Functions
// ============================================================================

/**
 * Create a beat with default values
 *
 * @param timestamp - Timestamp in seconds
 * @param options - Partial beat properties to override defaults
 * @returns A Beat object
 */
export function createBeat(
    timestamp: number,
    options: Partial<Beat> = {}
): Beat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.8,
        confidence: 0.9,
        ...options,
    };
}

/**
 * Create a beat map for testing
 *
 * @param beats - Array of beats
 * @param duration - Duration in seconds
 * @param bpm - BPM value (default: 120)
 * @param audioId - Audio identifier (default: 'test-audio-id')
 * @returns A BeatMap object
 */
export function createBeatMap(
    beats: Beat[],
    duration: number,
    bpm: number = 120,
    audioId: string = 'test-audio-id'
): BeatMap {
    const metadata: BeatMapMetadata = {
        version: BEAT_DETECTION_VERSION,
        algorithm: BEAT_DETECTION_ALGORITHM,
        minBpm: 60,
        maxBpm: 180,
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
        audioId,
        duration,
        beats,
        bpm,
        metadata,
    };
}

/**
 * Create beats at regular intervals (simulating perfect detection)
 *
 * @param bpm - BPM for the beats
 * @param durationSeconds - Total duration in seconds
 * @param startOffset - Starting time offset (default: 0)
 * @returns Array of beats at regular intervals
 */
export function createRegularBeats(
    bpm: number,
    durationSeconds: number,
    startOffset: number = 0
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let time = startOffset; time < durationSeconds; time += interval) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

/**
 * Create beats with gaps at specific indices
 *
 * Useful for testing interpolation algorithms.
 *
 * @param bpm - BPM for the beats
 * @param durationSeconds - Total duration in seconds
 * @param gapIndices - Array of beat indices to skip (0-indexed)
 * @returns Array of beats with specified gaps
 */
export function createBeatsWithGaps(
    bpm: number,
    durationSeconds: number,
    gapIndices: number[]
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;
    let beatIndex = 0;

    for (let time = 0; time < durationSeconds; time += interval) {
        if (gapIndices.includes(beatIndex)) {
            beatIndex++;
            continue;
        }

        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
        beatIndex++;
    }

    return beats;
}

/**
 * Create beats with tempo drift (gradual BPM change)
 *
 * Useful for testing adaptive interpolation algorithms.
 *
 * @param startBpm - Starting BPM
 * @param endBpm - Ending BPM
 * @param durationSeconds - Total duration in seconds
 * @returns Array of beats with gradual tempo drift
 */
export function createBeatsWithTempoDrift(
    startBpm: number,
    endBpm: number,
    durationSeconds: number
): Beat[] {
    const beats: Beat[] = [];
    const bpmChangePerBeat = (endBpm - startBpm) / (durationSeconds * startBpm / 60);

    let time = 0;
    let currentBpm = startBpm;

    while (time < durationSeconds) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));

        const interval = 60 / currentBpm;
        time += interval;
        currentBpm += bpmChangePerBeat;
    }

    return beats;
}

/**
 * Create beats with known anomalies (false positives)
 *
 * Anomalies are beats that don't fit the regular grid pattern,
 * simulating false positives from the beat detection algorithm.
 *
 * @param bpm - Base BPM for regular beats
 * @param durationSeconds - Total duration in seconds
 * @param anomalyPositions - Array of timestamps for anomalous beats
 * @returns Array of beats with anomalies included
 */
export function createBeatsWithAnomalies(
    bpm: number,
    durationSeconds: number,
    anomalyPositions: number[]
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    // First, create regular beats
    for (let time = 0; time < durationSeconds; time += interval) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    // Add anomalous beats at specified positions
    for (const anomalyTime of anomalyPositions) {
        // Check if there's already a beat near this position
        const nearbyBeat = beats.find(b => Math.abs(b.timestamp - anomalyTime) < interval * 0.3);

        if (!nearbyBeat) {
            beats.push(createBeat(anomalyTime, {
                // Anomalies typically have lower confidence
                confidence: 0.5,
                intensity: 0.5,
                beatInMeasure: 0,
                isDownbeat: false,
                measureNumber: 0,
            }));
        }
    }

    // Sort by timestamp
    beats.sort((a, b) => a.timestamp - b.timestamp);

    return beats;
}

/**
 * Create a mock AudioContext for testing
 *
 * @returns A minimal mock AudioContext
 */
export function createMockAudioContext(): AudioContext {
    let currentTime = 0;

    return {
        get currentTime() { return currentTime; },
        set currentTime(value: number) { currentTime = value; },
        sampleRate: 44100,
        state: 'running' as AudioContextState,
        baseLatency: 0.01,
        outputLatency: 0.02,
    } as unknown as AudioContext;
}

// ============================================================================
// Synthetic Beat Map Generator Class
// ============================================================================

/**
 * Options for the SyntheticBeatMapGenerator
 */
export interface SyntheticBeatMapGeneratorOptions {
    /** Base BPM for the generated beats */
    bpm?: number;
    /** Duration in seconds */
    duration?: number;
    /** Starting time offset */
    startOffset?: number;
    /** Beats per measure (default: 4) */
    beatsPerMeasure?: number;
    /** Base confidence for beats (default: 0.9) */
    baseConfidence?: number;
    /** Base intensity for beats (default: 0.8) */
    baseIntensity?: number;
    /** Audio ID for the generated beat map */
    audioId?: string;
}

/**
 * Configuration for a gap section
 */
export interface GapConfig {
    /** Start time of the gap in seconds */
    startTime: number;
    /** Duration of the gap in seconds */
    duration: number;
}

/**
 * Configuration for an anomaly
 */
export interface AnomalyConfig {
    /** Timestamp of the anomalous beat */
    timestamp: number;
    /** Confidence for the anomalous beat (default: 0.5) */
    confidence?: number;
    /** Intensity for the anomalous beat (default: 0.5) */
    intensity?: number;
}

/**
 * Configuration for a tempo change section
 */
export interface TempoChangeConfig {
    /** Start time of the tempo change */
    startTime: number;
    /** End time of the tempo change */
    endTime: number;
    /** Starting BPM for this section */
    startBpm: number;
    /** Ending BPM for this section */
    endBpm: number;
}

/**
 * Configuration for a silent section
 */
export interface SilentSectionConfig {
    /** Start time of the silent section */
    startTime: number;
    /** End time of the silent section */
    endTime: number;
}

/**
 * Synthetic Beat Map Generator
 *
 * A fluent builder for creating complex beat maps for testing.
 *
 * @example
 * ```typescript
 * const beatMap = new SyntheticBeatMapGenerator()
 *     .withBpm(120)
 *     .withDuration(30)
 *     .withGaps([{ startTime: 10, duration: 2 }])
 *     .withAnomalies([{ timestamp: 5.25, confidence: 0.4 }])
 *     .build();
 * ```
 */
export class SyntheticBeatMapGenerator {
    private options: Required<SyntheticBeatMapGeneratorOptions>;
    private gaps: GapConfig[] = [];
    private anomalies: AnomalyConfig[] = [];
    private tempoChanges: TempoChangeConfig[] = [];
    private silentSections: SilentSectionConfig[] = [];
    private customBeats: Beat[] = [];

    constructor(options: SyntheticBeatMapGeneratorOptions = {}) {
        this.options = {
            bpm: options.bpm ?? 120,
            duration: options.duration ?? 60,
            startOffset: options.startOffset ?? 0,
            beatsPerMeasure: options.beatsPerMeasure ?? 4,
            baseConfidence: options.baseConfidence ?? 0.9,
            baseIntensity: options.baseIntensity ?? 0.8,
            audioId: options.audioId ?? 'synthetic-beatmap',
        };
    }

    /**
     * Set the base BPM
     */
    withBpm(bpm: number): this {
        this.options.bpm = bpm;
        return this;
    }

    /**
     * Set the duration in seconds
     */
    withDuration(duration: number): this {
        this.options.duration = duration;
        return this;
    }

    /**
     * Set the starting time offset
     */
    withStartOffset(offset: number): this {
        this.options.startOffset = offset;
        return this;
    }

    /**
     * Set the beats per measure
     */
    withBeatsPerMeasure(beats: number): this {
        this.options.beatsPerMeasure = beats;
        return this;
    }

    /**
     * Set the base confidence for beats
     */
    withBaseConfidence(confidence: number): this {
        this.options.baseConfidence = confidence;
        return this;
    }

    /**
     * Set the base intensity for beats
     */
    withBaseIntensity(intensity: number): this {
        this.options.baseIntensity = intensity;
        return this;
    }

    /**
     * Set the audio ID
     */
    withAudioId(id: string): this {
        this.options.audioId = id;
        return this;
    }

    /**
     * Add gap sections where no beats will be generated
     */
    withGaps(gaps: GapConfig[]): this {
        this.gaps = gaps;
        return this;
    }

    /**
     * Add anomalous beats at specific positions
     */
    withAnomalies(anomalies: AnomalyConfig[]): this {
        this.anomalies = anomalies;
        return this;
    }

    /**
     * Add tempo change sections with gradual BPM drift
     */
    withTempoChanges(changes: TempoChangeConfig[]): this {
        this.tempoChanges = changes;
        return this;
    }

    /**
     * Add silent sections where no beats will be detected
     * (same as gaps but semantically different for test clarity)
     */
    withSilentSections(sections: SilentSectionConfig[]): this {
        this.silentSections = sections;
        return this;
    }

    /**
     * Add custom beats to the output
     */
    withCustomBeats(beats: Beat[]): this {
        this.customBeats = beats;
        return this;
    }

    /**
     * Check if a time is within any gap
     */
    private isInGap(time: number): boolean {
        return this.gaps.some(gap =>
            time >= gap.startTime && time < gap.startTime + gap.duration
        );
    }

    /**
     * Check if a time is within a silent section
     */
    private isInSilentSection(time: number): boolean {
        return this.silentSections.some(section =>
            time >= section.startTime && time < section.endTime
        );
    }

    /**
     * Get the BPM at a specific time (accounting for tempo changes)
     */
    private getBpmAtTime(time: number): number {
        for (const change of this.tempoChanges) {
            if (time >= change.startTime && time < change.endTime) {
                const progress = (time - change.startTime) / (change.endTime - change.startTime);
                return change.startBpm + (change.endBpm - change.startBpm) * progress;
            }
        }
        return this.options.bpm;
    }

    /**
     * Build the beat map
     */
    build(): BeatMap {
        const beats: Beat[] = [];
        const baseInterval = 60 / this.options.bpm;
        let beatIndex = 0;

        // Generate beats based on tempo
        let time = this.options.startOffset;

        while (time < this.options.duration) {
            // Skip if in gap or silent section
            if (!this.isInGap(time) && !this.isInSilentSection(time)) {
                const currentBpm = this.getBpmAtTime(time);

                beats.push(createBeat(time, {
                    beatInMeasure: beatIndex % this.options.beatsPerMeasure,
                    isDownbeat: beatIndex % this.options.beatsPerMeasure === 0,
                    measureNumber: Math.floor(beatIndex / this.options.beatsPerMeasure),
                    confidence: this.options.baseConfidence,
                    intensity: this.options.baseIntensity,
                }));

                beatIndex++;
                time += 60 / currentBpm;
            } else {
                time += baseInterval;
            }
        }

        // Add anomalous beats
        for (const anomaly of this.anomalies) {
            if (anomaly.timestamp >= 0 && anomaly.timestamp < this.options.duration) {
                beats.push(createBeat(anomaly.timestamp, {
                    confidence: anomaly.confidence ?? 0.5,
                    intensity: anomaly.intensity ?? 0.5,
                    beatInMeasure: 0,
                    isDownbeat: false,
                    measureNumber: 0,
                }));
            }
        }

        // Add custom beats
        beats.push(...this.customBeats);

        // Sort by timestamp
        beats.sort((a, b) => a.timestamp - b.timestamp);

        return createBeatMap(beats, this.options.duration, this.options.bpm, this.options.audioId);
    }

    /**
     * Build and return just the beats array
     */
    buildBeats(): Beat[] {
        return this.build().beats;
    }
}

// ============================================================================
// Pre-built Test Scenarios
// ============================================================================

/**
 * Common test scenarios for beat interpolation
 */
export const BeatMapScenarios = {
    /**
     * Perfect 120 BPM beat map with no gaps
     */
    perfect120Bpm: (duration: number = 30): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(120)
            .withDuration(duration)
            .withAudioId('perfect-120bpm')
            .build(),

    /**
     * Beat map with a single gap in the middle
     */
    singleGap: (duration: number = 30, gapStart: number = 10, gapDuration: number = 2): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(120)
            .withDuration(duration)
            .withGaps([{ startTime: gapStart, duration: gapDuration }])
            .withAudioId('single-gap')
            .build(),

    /**
     * Beat map with multiple gaps
     */
    multipleGaps: (duration: number = 30): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(120)
            .withDuration(duration)
            .withGaps([
                { startTime: 5, duration: 1 },
                { startTime: 15, duration: 2 },
                { startTime: 25, duration: 1.5 },
            ])
            .withAudioId('multiple-gaps')
            .build(),

    /**
     * Beat map with anomalous beats
     */
    withAnomalies: (duration: number = 30): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(120)
            .withDuration(duration)
            .withAnomalies([
                { timestamp: 5.25, confidence: 0.4 },
                { timestamp: 12.17, confidence: 0.35 },
                { timestamp: 20.38, confidence: 0.45 },
            ])
            .withAudioId('with-anomalies')
            .build(),

    /**
     * Beat map with gradual tempo drift
     */
    tempoDrift: (duration: number = 30, startBpm: number = 115, endBpm: number = 125): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(startBpm)
            .withDuration(duration)
            .withTempoChanges([{
                startTime: 0,
                endTime: duration,
                startBpm,
                endBpm,
            }])
            .withAudioId('tempo-drift')
            .build(),

    /**
     * Beat map with a silent section
     */
    silentSection: (duration: number = 30, silentStart: number = 10, silentEnd: number = 15): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(120)
            .withDuration(duration)
            .withSilentSections([{ startTime: silentStart, endTime: silentEnd }])
            .withAudioId('silent-section')
            .build(),

    /**
     * Complex beat map with gaps, anomalies, and tempo changes
     */
    complex: (duration: number = 60): BeatMap =>
        new SyntheticBeatMapGenerator()
            .withBpm(120)
            .withDuration(duration)
            .withGaps([
                { startTime: 15, duration: 2 },
                { startTime: 40, duration: 3 },
            ])
            .withAnomalies([
                { timestamp: 8.23, confidence: 0.3 },
                { timestamp: 32.15, confidence: 0.4 },
            ])
            .withTempoChanges([{
                startTime: 25,
                endTime: 35,
                startBpm: 120,
                endBpm: 128,
            }])
            .withAudioId('complex-scenario')
            .build(),

    /**
     * Sparse beat detection (half-note detection)
     */
    sparseHalfNotes: (duration: number = 30): BeatMap => {
        // Create beats at half-note intervals (2x the quarter note duration)
        const beats: Beat[] = [];
        const interval = 60 / 120 * 2; // Half note at 120 BPM = 1 second

        for (let time = 0; time < duration; time += interval) {
            beats.push(createBeat(time, {
                beatInMeasure: (beats.length * 2) % 4,
                isDownbeat: (beats.length * 2) % 4 === 0,
                measureNumber: Math.floor(beats.length / 2),
            }));
        }

        return createBeatMap(beats, duration, 120, 'sparse-half-notes');
    },

    /**
     * Dense section followed by sparse section
     */
    denseThenSparse: (duration: number = 30, transitionTime: number = 15): BeatMap => {
        const beats: Beat[] = [];
        const qn = 60 / 120; // Quarter note at 120 BPM

        // Dense section: all quarter notes
        for (let time = 0; time < transitionTime; time += qn) {
            beats.push(createBeat(time, {
                beatInMeasure: beats.length % 4,
                isDownbeat: beats.length % 4 === 0,
                measureNumber: Math.floor(beats.length / 4),
            }));
        }

        // Sparse section: half notes only
        let sparseIndex = 0;
        for (let time = transitionTime; time < duration; time += qn * 2) {
            beats.push(createBeat(time, {
                beatInMeasure: (Math.floor(transitionTime / qn) + sparseIndex * 2) % 4,
                isDownbeat: false,
                measureNumber: Math.floor((Math.floor(transitionTime / qn) + sparseIndex * 2) / 4),
            }));
            sparseIndex++;
        }

        return createBeatMap(beats, duration, 120, 'dense-then-sparse');
    },

    /**
     * Edge case: empty beat map
     */
    empty: (duration: number = 30): BeatMap =>
        createBeatMap([], duration, 120, 'empty-beatmap'),

    /**
     * Edge case: single beat
     */
    singleBeat: (duration: number = 30, beatTime: number = 5): BeatMap =>
        createBeatMap([createBeat(beatTime)], duration, 120, 'single-beat'),

    /**
     * Edge case: two beats
     */
    twoBeats: (duration: number = 30): BeatMap =>
        createBeatMap([
            createBeat(5.0),
            createBeat(5.5),
        ], duration, 120, 'two-beats'),

    /**
     * Large beat map for performance testing
     */
    largeForPerformance: (duration: number = 300, gapRatio: number = 0.1): BeatMap => {
        const beats: Beat[] = [];
        const interval = 60 / 120;
        const totalBeats = Math.floor(duration / interval);

        for (let i = 0; i < totalBeats; i++) {
            // Randomly skip some beats based on gap ratio
            if (Math.random() < gapRatio) {
                continue;
            }

            beats.push(createBeat(i * interval, {
                beatInMeasure: i % 4,
                isDownbeat: i % 4 === 0,
                measureNumber: Math.floor(i / 4),
                confidence: 0.7 + Math.random() * 0.3,
            }));
        }

        return createBeatMap(beats, duration, 120, 'large-performance');
    },
};

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a beat map has expected properties
 */
export function validateBeatMap(
    beatMap: BeatMap,
    expectations: {
        minBeats?: number;
        maxBeats?: number;
        minDuration?: number;
        maxDuration?: number;
        minBpm?: number;
        maxBpm?: number;
    }
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (expectations.minBeats !== undefined && beatMap.beats.length < expectations.minBeats) {
        errors.push(`Expected at least ${expectations.minBeats} beats, got ${beatMap.beats.length}`);
    }

    if (expectations.maxBeats !== undefined && beatMap.beats.length > expectations.maxBeats) {
        errors.push(`Expected at most ${expectations.maxBeats} beats, got ${beatMap.beats.length}`);
    }

    if (expectations.minDuration !== undefined && beatMap.duration < expectations.minDuration) {
        errors.push(`Expected duration >= ${expectations.minDuration}s, got ${beatMap.duration}s`);
    }

    if (expectations.maxDuration !== undefined && beatMap.duration > expectations.maxDuration) {
        errors.push(`Expected duration <= ${expectations.maxDuration}s, got ${beatMap.duration}s`);
    }

    if (expectations.minBpm !== undefined && beatMap.bpm < expectations.minBpm) {
        errors.push(`Expected BPM >= ${expectations.minBpm}, got ${beatMap.bpm}`);
    }

    if (expectations.maxBpm !== undefined && beatMap.bpm > expectations.maxBpm) {
        errors.push(`Expected BPM <= ${expectations.maxBpm}, got ${beatMap.bpm}`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate that beats are sorted by timestamp
 */
export function validateBeatsSorted(beats: Beat[]): boolean {
    for (let i = 1; i < beats.length; i++) {
        if (beats[i].timestamp < beats[i - 1].timestamp) {
            return false;
        }
    }
    return true;
}

/**
 * Calculate the average interval between beats
 */
export function calculateAverageInterval(beats: Beat[]): number {
    if (beats.length < 2) return 0;

    let totalInterval = 0;
    for (let i = 1; i < beats.length; i++) {
        totalInterval += beats[i].timestamp - beats[i - 1].timestamp;
    }

    return totalInterval / (beats.length - 1);
}

/**
 * Find gaps in a beat map (intervals larger than expected)
 */
export function findGaps(beats: Beat[], expectedInterval: number, tolerance: number = 0.1): {
    index: number;
    startTime: number;
    gapDuration: number;
    expectedBeats: number;
}[] {
    const gaps: { index: number; startTime: number; gapDuration: number; expectedBeats: number }[] = [];

    for (let i = 1; i < beats.length; i++) {
        const interval = beats[i].timestamp - beats[i - 1].timestamp;
        if (interval > expectedInterval * (1 + tolerance)) {
            gaps.push({
                index: i,
                startTime: beats[i - 1].timestamp,
                gapDuration: interval,
                expectedBeats: Math.round(interval / expectedInterval) - 1,
            });
        }
    }

    return gaps;
}
