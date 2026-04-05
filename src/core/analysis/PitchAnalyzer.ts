/**
 * PitchAnalyzer - Standalone full-track pitch detection
 *
 * Provides per-frame pitch detection and melody contour analysis directly from
 * raw audio, with zero dependency on beat detection or rhythm generation.
 *
 * ## Key Design Decisions
 *
 * - **No `PitchBeatLinker` dependency.** Uses `PitchDetector`/`EssentiaPitchDetector`
 *   directly on the audio signal and does not align pitch frames to beats.
 *
 * - **Contour analysis on `PitchResult[]`.** Provides its own contour analysis that
 *   works directly on the `PitchResult[]` output from the detectors.
 *
 * - **Same analyzer pattern as `AudioAnalyzer` / `MusicClassifier`.** Accepts a URL,
 *   fetches/decodes audio internally, returns a typed profile with metadata.
 *
 * @example
 * ```typescript
 * const analyzer = new PitchAnalyzer({
 *   algorithm: 'pitch_melodia',
 *   includeContour: true
 * });
 *
 * const profile = await analyzer.analyze('https://example.com/audio.mp3');
 *
 * console.log(`Voicing ratio: ${(profile.voicingRatio * 100).toFixed(1)}%`);
 * console.log(`Range: ${profile.lowestNote} - ${profile.highestNote}`);
 * console.log(`Contour direction: ${profile.contour?.direction}`);
 * ```
 */

import type { PitchResult } from './PitchDetector.js';
import type { PitchAlgorithm, EssentiaPitchAlgorithm } from './EssentiaPitchDetector.js';
import { PitchDetector } from './PitchDetector.js';
import { EssentiaPitchDetector, DEFAULT_CREPE_MODEL_URL } from './EssentiaPitchDetector.js';
import type { DirectionStats, IntervalStats } from './MelodyContourAnalyzer.js';
import { categorizeInterval } from './MelodyContourAnalyzer.js';
import { arweaveGatewayManager } from '../../utils/arweaveGatewayManager.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for the PitchAnalyzer
 */
export interface PitchAnalyzerConfig {
    /**
     * Which pitch detection algorithm to use.
     * @default 'pitch_melodia'
     */
    algorithm?: PitchAlgorithm;

    /**
     * Minimum frequency to detect in Hz.
     * @default 80
     */
    minFrequency?: number;

    /**
     * Maximum frequency to detect in Hz.
     * Default varies by algorithm: 1000 for pyin_legacy, 20000 for others.
     */
    maxFrequency?: number;

    /**
     * Target sample rate for analysis.
     * @default 44100
     */
    sampleRate?: number;

    /**
     * Hop size in samples between consecutive frames.
     * Larger values = fewer frames = faster analysis, lower time resolution.
     * Default is 1024 (~23ms at 44.1kHz, ~43 frames/sec) for the standalone
     * analyzer. The beat-aligned path (PitchBeatLinker) uses smaller hops
     * internally since it only evaluates at beat positions.
     * @default 1024
     */
    hopSize?: number;

    /**
     * CREPE model URL (only for 'pitch_crepe' algorithm).
     */
    crepeModelUrl?: string;

    /**
     * URL resolver for Arweave URLs.
     */
    resolveUrl?: (url: string) => Promise<string>;

    /**
     * Whether to include melody contour analysis.
     * @default true
     */
    includeContour?: boolean;

    /**
     * Optional progress callback.
     * Reports phase name and progress (0-1).
     */
    onProgress?: (phase: string, progress: number) => void;
}

/**
 * Direction of a pitch contour segment
 */
export type PitchContourSegmentDirection = 'up' | 'down' | 'stable';

/**
 * Overall direction of a pitch contour
 */
export type PitchContourDirection = 'ascending' | 'descending' | 'stable' | 'mixed';

/**
 * A segment of a pitch contour with consistent direction
 */
export interface PitchContourSegment {
    /** Start time in seconds */
    startTime: number;
    /** End time in seconds */
    endTime: number;
    /** Starting note name (e.g., "C4") */
    startNote: string;
    /** Ending note name (e.g., "G5") */
    endNote: string;
    /** Direction of this segment */
    direction: PitchContourSegmentDirection;
    /** Interval in semitones between start and end */
    interval: number;
}

/**
 * Pitch contour representing the overall melodic shape
 *
 * Populated by pitch contour analysis when `includeContour !== false`.
 * Provides the same depth of analysis as `MelodyContour` from `MelodyContourAnalyzer`.
 */
export interface PitchContour {
    /** Overall melody direction */
    direction: PitchContourDirection;
    /** Pitch range information */
    range: {
        /** Lowest note (e.g., "C4") */
        minNote: string;
        /** Highest note (e.g., "F#5") */
        maxNote: string;
        /** Total span in semitones */
        semitones: number;
    };
    /** Melody segments (groups of consecutive frames with same direction) */
    segments: PitchContourSegment[];
    /** Time-window direction analysis */
    shortTermDirection: PitchContourDirection;
    mediumTermDirection: PitchContourDirection;
    longTermDirection: PitchContourDirection;
}

/**
 * Result of full-track pitch analysis
 *
 * Contains per-frame pitch detection results, optional melody contour analysis,
 * and summary statistics. Flat structure mirrors `AudioProfile` pattern.
 */
export interface PitchAnalysisProfile {
    /** Per-frame pitch detection results */
    pitchResults: PitchResult[];

    /** Melody contour analysis (only populated when includeContour !== false) */
    contour?: PitchContour;

    // === Flat summary stats (same pattern as AudioProfile) ===

    /** Ratio of voiced to total frames (0.0 - 1.0) */
    voicingRatio: number;
    /** Average frequency of voiced frames in Hz */
    averageFrequency: number;
    /** Median frequency of voiced frames in Hz */
    medianFrequency: number;
    /** Minimum detected frequency in Hz */
    minFrequency: number;
    /** Maximum detected frequency in Hz */
    maxFrequency: number;
    /** Pitch range in semitones */
    pitchRangeSemitones: number;
    /** Lowest detected note name (e.g., "C3"), null if no voiced frames */
    lowestNote: string | null;
    /** Highest detected note name (e.g., "G5"), null if no voiced frames */
    highestNote: string | null;
    /** Most common note names, sorted by frequency */
    noteDistribution: { note: string; count: number; percentage: number }[];
    /** Total frames analyzed */
    totalFrames: number;
    /** Number of voiced frames */
    voicedFrames: number;

    /** Direction statistics from contour analysis (when contour enabled) */
    directionStats?: DirectionStats;
    /** Interval statistics from contour analysis (when contour enabled) */
    intervalStats?: IntervalStats;

    /** Analysis metadata (pipeline info only) */
    analysis_metadata: {
        algorithm_used: string;
        analyzed_at: string;
        duration_analyzed: number;
    };
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for PitchAnalyzer
 */
const DEFAULT_CONFIG: Required<Omit<PitchAnalyzerConfig, 'onProgress'>> & { onProgress?: (phase: string, progress: number) => void } = {
    algorithm: 'pitch_melodia',
    minFrequency: 80,
    maxFrequency: 20000,
    sampleRate: 44100,
    hopSize: 1024,
    crepeModelUrl: DEFAULT_CREPE_MODEL_URL,
    resolveUrl: arweaveGatewayManager.resolveUrl.bind(arweaveGatewayManager),
    includeContour: true,
    onProgress: undefined,
};

/** MIDI note number for A4 (440 Hz) */
const A4_MIDI = 69;

/** Frequency of A4 in Hz */
const A4_FREQUENCY = 440;

/** Note names for MIDI to note name conversion */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ============================================================================
// PitchAnalyzer Class
// ============================================================================

/**
 * Standalone full-track pitch analyzer
 *
 * Provides per-frame pitch detection and melody contour analysis directly from
 * raw audio, with zero dependency on beat detection or rhythm generation.
 *
 * Uses the same analyzer pattern as `AudioAnalyzer` and `MusicClassifier`:
 * accepts a URL, fetches/decodes audio internally, returns a typed profile.
 */
export class PitchAnalyzer {
    private config: Required<Omit<PitchAnalyzerConfig, 'onProgress'>> & { onProgress?: (phase: string, progress: number) => void };

    /**
     * Create a new PitchAnalyzer
     *
     * @param config - Configuration options
     */
    constructor(config: PitchAnalyzerConfig = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
        };
    }

    /**
     * Get the current configuration
     */
    getConfig(): Required<Omit<PitchAnalyzerConfig, 'onProgress'>> & { onProgress?: (phase: string, progress: number) => void } {
        return { ...this.config };
    }

    /**
     * Analyze audio from a URL
     *
     * Fetches and decodes the audio, performs pitch detection, computes summary
     * statistics, and optionally computes melody contour analysis.
     *
     * @param audioUrl - URL of the audio file to analyze
     * @returns Promise resolving to the pitch analysis profile
     */
    async analyze(audioUrl: string): Promise<PitchAnalysisProfile> {
        const { onProgress } = this.config;

        // Phase 1: Fetch and decode audio
        onProgress?.('fetching', 0);
        const { signal, sampleRate, duration } = await this.fetchAndDecodeAudio(audioUrl);
        onProgress?.('fetching', 1);

        // Phase 2: Run pitch detection
        onProgress?.('detecting', 0);
        const resolvedConfig = this.resolveDefaults(this.config);
        const pitchResults = await this.detectPitch(signal, sampleRate, resolvedConfig);
        onProgress?.('detecting', 1);

        // Phase 3: Compute summary statistics
        const summary = this.computeSummary(pitchResults);

        // Phase 4: Compute contour analysis (if enabled)
        let contour: PitchContour | undefined;
        let directionStats: DirectionStats | undefined;
        let intervalStats: IntervalStats | undefined;

        if (this.config.includeContour !== false) {
            const contourResult = this.computeContour(pitchResults);
            contour = contourResult.contour;
            directionStats = contourResult.directionStats;
            intervalStats = contourResult.intervalStats;
        }

        // Build and return the profile
        return {
            pitchResults,
            contour,
            voicingRatio: summary.voicingRatio,
            averageFrequency: summary.averageFrequency,
            medianFrequency: summary.medianFrequency,
            minFrequency: summary.minFrequency,
            maxFrequency: summary.maxFrequency,
            pitchRangeSemitones: summary.pitchRangeSemitones,
            lowestNote: summary.lowestNote,
            highestNote: summary.highestNote,
            noteDistribution: summary.noteDistribution,
            totalFrames: summary.totalFrames,
            voicedFrames: summary.voicedFrames,
            directionStats,
            intervalStats,
            analysis_metadata: {
                algorithm_used: this.config.algorithm,
                analyzed_at: new Date().toISOString(),
                duration_analyzed: duration,
            },
        };
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    /**
     * Fetch and decode audio from a URL
     *
     * @param url - URL of the audio file
     * @returns Promise resolving to mono signal, sample rate, and duration
     */
    private async fetchAndDecodeAudio(url: string): Promise<{
        signal: Float32Array;
        sampleRate: number;
        duration: number;
    }> {
        // Resolve URL if resolver is provided (e.g., for Arweave URLs)
        const resolvedUrl = this.config.resolveUrl
            ? await this.config.resolveUrl(url)
            : url;

        const response = await fetch(resolvedUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).window?.AudioContext;

        if (!AudioContextClass) {
            throw new Error('AudioContext not available in this environment');
        }

        const audioContext = new AudioContextClass();
        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });

        // Mix down to mono
        const monoSignal = new Float32Array(audioBuffer.length);
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < audioBuffer.length; i++) {
                monoSignal[i] += channelData[i] / audioBuffer.numberOfChannels;
            }
        }

        return {
            signal: monoSignal,
            sampleRate: audioBuffer.sampleRate,
            duration: audioBuffer.duration,
        };
    }

    /**
     * Resolve algorithm-specific defaults
     *
     * When `algorithm === 'pyin_legacy'` and `maxFrequency` is not explicitly
     * provided, defaults to 1000 Hz (the YIN algorithm's practical ceiling).
     * All other algorithms default to 20000 Hz.
     */
    private resolveDefaults(config: PitchAnalyzerConfig): PitchAnalyzerConfig {
        const resolved = { ...config };

        // If maxFrequency is not explicitly provided
        if (config.maxFrequency === undefined) {
            if (config.algorithm === 'pyin_legacy') {
                resolved.maxFrequency = 1000;
            } else {
                resolved.maxFrequency = 20000;
            }
        }

        return resolved;
    }

    /**
     * Run pitch detection on the audio signal
     */
    private async detectPitch(
        signal: Float32Array,
        sampleRate: number,
        config: PitchAnalyzerConfig
    ): Promise<PitchResult[]> {
        const algorithm = config.algorithm ?? 'pitch_melodia';

        if (algorithm === 'pyin_legacy') {
            // Use built-in PitchDetector
            const detector = new PitchDetector({
                minFrequency: config.minFrequency ?? 80,
                maxFrequency: config.maxFrequency ?? 1000,
                targetSampleRate: config.sampleRate ?? 44100,
                hopSize: config.hopSize ?? 1024,
            });
            return detector.detectSignal(signal, sampleRate);
        } else {
            // Use EssentiaPitchDetector
            const detector = await EssentiaPitchDetector.create({
                algorithm: algorithm as EssentiaPitchAlgorithm,
                minFrequency: config.minFrequency ?? 80,
                maxFrequency: config.maxFrequency ?? 20000,
                targetSampleRate: config.sampleRate ?? 44100,
                hopSize: config.hopSize ?? 1024,
                crepeModelUrl: config.crepeModelUrl,
                resolveUrl: config.resolveUrl,
            });
            return detector.detectSignal(signal, sampleRate);
        }
    }

    /**
     * Compute summary statistics from pitch results
     */
    private computeSummary(results: PitchResult[]): {
        voicingRatio: number;
        averageFrequency: number;
        medianFrequency: number;
        minFrequency: number;
        maxFrequency: number;
        pitchRangeSemitones: number;
        lowestNote: string | null;
        highestNote: string | null;
        noteDistribution: { note: string; count: number; percentage: number }[];
        totalFrames: number;
        voicedFrames: number;
    } {
        const totalFrames = results.length;
        const voicedResults = results.filter(r => r.isVoiced && r.frequency > 0);
        const voicedFrames = voicedResults.length;

        if (voicedFrames === 0) {
            return {
                voicingRatio: 0,
                averageFrequency: 0,
                medianFrequency: 0,
                minFrequency: 0,
                maxFrequency: 0,
                pitchRangeSemitones: 0,
                lowestNote: null,
                highestNote: null,
                noteDistribution: [],
                totalFrames,
                voicedFrames: 0,
            };
        }

        const frequencies = voicedResults.map(r => r.frequency);
        const sortedFrequencies = [...frequencies].sort((a, b) => a - b);

        // Average frequency
        const averageFrequency = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;

        // Median frequency
        const midIndex = Math.floor(sortedFrequencies.length / 2);
        const medianFrequency = sortedFrequencies.length % 2 !== 0
            ? sortedFrequencies[midIndex]
            : (sortedFrequencies[midIndex - 1] + sortedFrequencies[midIndex]) / 2;

        // Min/max frequency
        const minFrequency = sortedFrequencies[0];
        const maxFrequency = sortedFrequencies[sortedFrequencies.length - 1];

        // Pitch range in semitones
        const minMidi = this.frequencyToMidi(minFrequency);
        const maxMidi = this.frequencyToMidi(maxFrequency);
        const pitchRangeSemitones = Math.abs(maxMidi - minMidi);

        // Note names
        const lowestNote = this.midiToNoteName(Math.round(minMidi));
        const highestNote = this.midiToNoteName(Math.round(maxMidi));

        // Note distribution
        const noteCounts = new Map<string, number>();
        for (const result of voicedResults) {
            if (result.noteName) {
                noteCounts.set(result.noteName, (noteCounts.get(result.noteName) ?? 0) + 1);
            }
        }

        const noteDistribution = Array.from(noteCounts.entries())
            .map(([note, count]) => ({
                note,
                count,
                percentage: (count / voicedFrames) * 100,
            }))
            .sort((a, b) => b.count - a.count);

        return {
            voicingRatio: voicedFrames / totalFrames,
            averageFrequency,
            medianFrequency,
            minFrequency,
            maxFrequency,
            pitchRangeSemitones,
            lowestNote,
            highestNote,
            noteDistribution,
            totalFrames,
            voicedFrames,
        };
    }

    /**
     * Compute melody contour from pitch results
     */
    private computeContour(results: PitchResult[]): {
        contour: PitchContour;
        directionStats: DirectionStats;
        intervalStats: IntervalStats;
    } {
        const voicedResults = results.filter(r => r.isVoiced && r.midiNote !== null);

        if (voicedResults.length === 0) {
            return {
                contour: {
                    direction: 'stable',
                    range: { minNote: 'N/A', maxNote: 'N/A', semitones: 0 },
                    segments: [],
                    shortTermDirection: 'stable',
                    mediumTermDirection: 'stable',
                    longTermDirection: 'stable',
                },
                directionStats: { up: 0, down: 0, stable: 0, none: results.length },
                intervalStats: { unison: 0, small: 0, medium: 0, large: 0, very_large: 0 },
            };
        }

        // Calculate range
        const midiNotes = voicedResults
            .map(r => r.midiNote)
            .filter((m): m is number => m !== null);

        const minMidi = Math.min(...midiNotes);
        const maxMidi = Math.max(...midiNotes);
        const minNote = this.midiToNoteName(minMidi);
        const maxNote = this.midiToNoteName(maxMidi);

        // Calculate direction and interval between consecutive frames
        const directionStats: DirectionStats = { up: 0, down: 0, stable: 0, none: 0 };
        const intervalStats: IntervalStats = { unison: 0, small: 0, medium: 0, large: 0, very_large: 0 };

        // Build segments
        const segments: PitchContourSegment[] = [];
        let currentSegment: {
            startTime: number;
            endTime: number;
            startNote: string;
            endNote: string;
            direction: PitchContourSegmentDirection;
            startMidi: number;
            endMidi: number;
        } | null = null;

        let prevMidi: number | null = null;

        for (const result of voicedResults) {
            const currentMidi = result.midiNote;

            if (currentMidi === null) {
                directionStats.none++;
                continue;
            }

            if (prevMidi === null) {
                prevMidi = currentMidi;
                continue;
            }

            // Determine direction and interval
            let direction: PitchContourSegmentDirection;
            const intervalSemitones = Math.abs(currentMidi - prevMidi);

            if (currentMidi > prevMidi) {
                direction = 'up';
                directionStats.up++;
            } else if (currentMidi < prevMidi) {
                direction = 'down';
                directionStats.down++;
            } else {
                direction = 'stable';
                directionStats.stable++;
            }

            // Categorize interval
            const intervalCategory = categorizeInterval(intervalSemitones);
            intervalStats[intervalCategory]++;

            // Build segments
            if (!currentSegment || currentSegment.direction !== direction) {
                // Finalize previous segment
                if (currentSegment) {
                    segments.push({
                        startTime: currentSegment.startTime,
                        endTime: currentSegment.endTime,
                        startNote: currentSegment.startNote,
                        endNote: currentSegment.endNote,
                        direction: currentSegment.direction,
                        interval: Math.abs(currentSegment.endMidi - currentSegment.startMidi),
                    });
                }

                // Start new segment
                currentSegment = {
                    startTime: result.timestamp,
                    endTime: result.timestamp,
                    startNote: this.midiToNoteName(prevMidi),
                    endNote: this.midiToNoteName(currentMidi),
                    direction,
                    startMidi: prevMidi,
                    endMidi: currentMidi,
                };
            } else {
                // Continue current segment
                currentSegment.endTime = result.timestamp;
                currentSegment.endNote = this.midiToNoteName(currentMidi);
                currentSegment.endMidi = currentMidi;
            }

            prevMidi = currentMidi;
        }

        // Finalize last segment
        if (currentSegment) {
            segments.push({
                startTime: currentSegment.startTime,
                endTime: currentSegment.endTime,
                startNote: currentSegment.startNote,
                endNote: currentSegment.endNote,
                direction: currentSegment.direction,
                interval: Math.abs(currentSegment.endMidi - currentSegment.startMidi),
            });
        }

        // Determine overall direction from segments
        const overallDirection = this.determineOverallDirection(segments);

        // Calculate time-window directions
        const shortTermDirection = this.calculateTimeWindowDirection(results, 1, 2);
        const mediumTermDirection = this.calculateTimeWindowDirection(results, 4, 8);
        const longTermDirection = this.calculateTimeWindowDirection(results, 16, Infinity);

        return {
            contour: {
                direction: overallDirection,
                range: {
                    minNote,
                    maxNote,
                    semitones: maxMidi - minMidi,
                },
                segments,
                shortTermDirection,
                mediumTermDirection,
                longTermDirection,
            },
            directionStats,
            intervalStats,
        };
    }

    /**
     * Determine overall contour direction from segments
     */
    private determineOverallDirection(segments: PitchContourSegment[]): PitchContourDirection {
        if (segments.length === 0) {
            return 'stable';
        }

        let upCount = 0;
        let downCount = 0;
        let stableCount = 0;

        for (const segment of segments) {
            if (segment.direction === 'up') upCount++;
            else if (segment.direction === 'down') downCount++;
            else stableCount++;
        }

        // If there are no up or down segments, return stable
        if (upCount === 0 && downCount === 0) {
            return 'stable';
        }

        // Calculate net direction
        const netDirection = upCount - downCount;

        // Threshold for "mixed" - if up and down are within 20% of each other
        const total = upCount + downCount + stableCount;
        const threshold = total * 0.2;

        if (Math.abs(netDirection) <= threshold) {
            return 'mixed';
        }

        if (upCount > downCount) {
            return 'ascending';
        } else if (downCount > upCount) {
            return 'descending';
        } else {
            return 'stable';
        }
    }

    /**
     * Calculate direction over a specific time window
     */
    private calculateTimeWindowDirection(
        results: PitchResult[],
        minFrames: number,
        maxFrames: number
    ): PitchContourDirection {
        const voicedResults = results.filter(r => r.isVoiced && r.midiNote !== null);

        if (voicedResults.length === 0 || minFrames < 1) {
            return 'stable';
        }

        // Calculate window size
        const windowSize = Math.min(maxFrames, Math.max(minFrames, voicedResults.length));
        const windowResults = voicedResults.slice(-windowSize);

        if (windowResults.length === 0) {
            return 'stable';
        }

        // Count directions in window
        let upCount = 0;
        let downCount = 0;
        let stableCount = 0;
        let prevMidi: number | null = null;

        for (const result of windowResults) {
            const currentMidi = result.midiNote;

            if (currentMidi === null) continue;

            if (prevMidi !== null) {
                if (currentMidi > prevMidi) upCount++;
                else if (currentMidi < prevMidi) downCount++;
                else stableCount++;
            }

            prevMidi = currentMidi;
        }

        return this.determineOverallDirectionFromCounts(upCount, downCount, stableCount);
    }

    /**
     * Determine overall direction from direction counts
     */
    private determineOverallDirectionFromCounts(
        upCount: number,
        downCount: number,
        stableCount: number
    ): PitchContourDirection {
        const total = upCount + downCount + stableCount;

        if (total === 0) {
            return 'stable';
        }

        // Threshold for "mixed"
        const threshold = total * 0.2;
        const netDirection = upCount - downCount;

        if (Math.abs(netDirection) <= threshold) {
            return 'mixed';
        }

        if (upCount > downCount) {
            return 'ascending';
        } else if (downCount > upCount) {
            return 'descending';
        } else {
            return 'stable';
        }
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Convert frequency in Hz to MIDI note number
     */
    private frequencyToMidi(frequency: number): number {
        return A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY);
    }

    /**
     * Convert MIDI note number to note name (e.g., "C4", "F#5")
     */
    private midiToNoteName(midi: number): string {
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = Math.round(midi) % 12;
        return `${NOTE_NAMES[noteIndex]}${octave}`;
    }
}
