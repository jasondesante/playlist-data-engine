/**
 * Pitch Beat Linker - Links pitch detection to rhythm beat timestamps
 *
 * Performs pitch detection at specific timestamps from generated rhythm patterns,
 * iterating over each band stream independently and analyzing the corresponding
 * filtered audio.
 *
 * This approach is more efficient than continuous pitch analysis because:
 * - We only analyze audio at beat timestamps (not the entire audio)
 * - Each band stream uses its corresponding filtered audio
 * - Results are directly aligned with the rhythm chart
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 1.3
 *
 * @example
 * ```typescript
 * const linker = new PitchBeatLinker();
 *
 * // Option 1: Analyze with automatic band filtering
 * const result = linker.link(generatedRhythm, audioBuffer);
 *
 * // Option 2: Analyze with pre-filtered audio (more efficient)
 * const result = linker.linkPreFiltered(generatedRhythm, preFilteredBands, {
 *   duration: audioBuffer.duration,
 * });
 *
 * // Access pitch at each beat
 * for (const pitchAtBeat of result.pitchByBeat) {
 *   if (pitchAtBeat.pitch?.isVoiced) {
 *     console.log(`Beat ${pitchAtBeat.beatIndex}: ${pitchAtBeat.pitch.noteName}`);
 *   }
 * }
 * ```
 */

import { PitchDetector, type PitchResult, type PitchDetectorConfig } from '../analysis/PitchDetector.js';
import {
    resampleAudio,
    applyFrequencyBand,
    FREQUENCY_BANDS,
    type FrequencyBand,
} from '../analysis/beat/utils/audioUtils.js';
import type { GeneratedRhythmMap, GeneratedBeat } from '../analysis/beat/RhythmQuantizer.js';
import type { RhythmicPhrase } from '../analysis/beat/PhraseAnalyzer.js';
import type { CompositeStream } from '../analysis/beat/CompositeStreamGenerator.js';
import type { DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';
import type { MelodyContour } from '../analysis/MultiBandPitchAnalyzer.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Band name type matching FREQUENCY_BANDS
 */
export type PitchBandName = 'low' | 'mid' | 'high';

/**
 * Interval category for button mapping
 */
export type IntervalCategory = 'unison' | 'small' | 'medium' | 'large' | 'very_large';

/**
 * Direction of pitch change from previous beat
 */
export type PitchDirection = 'up' | 'down' | 'stable' | 'none';

/**
 * Pitch information linked to a single rhythm beat
 */
export interface PitchAtBeat {
    /** Index into the beat stream */
    beatIndex: number;

    /** Timestamp in seconds */
    timestamp: number;

    /** Which band stream this beat belongs to */
    band: PitchBandName;

    /** Detected pitch (null if no pitch detected) */
    pitch: PitchResult | null;

    /** Direction of pitch change from previous beat (populated in melody contour analysis) */
    direction: PitchDirection;

    /** Interval in semitones from previous beat (0 if none, populated in melody contour analysis) */
    intervalFromPrevious: number;

    /** Categorized interval (populated in melody contour analysis) */
    intervalCategory?: IntervalCategory;
}

/**
 * Pitch results for a single band stream
 */
export interface BandPitchAtBeat {
    /** Band name */
    band: PitchBandName;

    /** Pitch at each beat in this band stream */
    pitches: PitchAtBeat[];

    /** Melody contour for this band (populated by MelodyContourAnalyzer) */
    melodyContour?: MelodyContour;

    /** Average probability of voiced frames */
    avgProbability: number;

    /** Number of beats with detected pitch */
    voicedBeatCount: number;

    /** Total number of beats analyzed */
    totalBeatCount: number;
}

/**
 * Pre-filtered audio input for a single band
 */
export interface PreFilteredBandAudio {
    /** Band name identifier */
    band: PitchBandName;

    /** Pre-filtered audio signal (already band-pass filtered) */
    signal: Float32Array;

    /** Sample rate of the signal */
    sampleRate: number;
}

/**
 * Result of linking pitch to rhythm beats
 */
export interface LinkedPitchAnalysis {
    /** Pitch at each beat across all band streams, keyed by band name */
    bandPitches: Map<PitchBandName, BandPitchAtBeat>;

    /** All pitches flattened and sorted by timestamp */
    pitchByBeat: PitchAtBeat[];

    /** Band with the highest average pitch probability */
    dominantBand: PitchBandName;

    /** Phrase-level pitch correlation (phrase ID -> pitches) */
    phrasePitchCorrelation: Map<string, PitchResult[]>;

    /** Analysis metadata */
    metadata: {
        /** Duration of the audio in seconds */
        duration: number;

        /** Total beats analyzed across all bands */
        totalBeatsAnalyzed: number;

        /** Beats with detected pitch across all bands */
        totalVoicedBeats: number;

        /** Average probability across all voiced beats */
        overallAvgProbability: number;
    };
}

/**
 * Configuration for PitchBeatLinker
 */
export interface PitchBeatLinkerConfig {
    /** Pitch detector configuration (passed through to PitchDetector) */
    pitchDetector?: Partial<PitchDetectorConfig>;

    /** Target sample rate for analysis (default: 44100) */
    targetSampleRate?: number;

    /** Custom frequency bands (default: FREQUENCY_BANDS from audioUtils) */
    bands?: FrequencyBand[];
}

/**
 * Configuration for pre-filtered analysis
 */
export interface PreFilteredLinkConfig {
    /** Duration of the audio in seconds (required for metadata) */
    duration: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default configuration for PitchBeatLinker */
const DEFAULT_CONFIG: Required<Omit<PitchBeatLinkerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> } = {
    targetSampleRate: 44100,
    pitchDetector: {},
    bands: FREQUENCY_BANDS,
};

// ============================================================================
// PitchBeatLinker Class
// ============================================================================

/**
 * Links pitch detection to rhythm beat timestamps
 *
 * Performs timestamp-based pitch detection on rhythm patterns, analyzing
 * each band stream independently with its corresponding filtered audio.
 */
export class PitchBeatLinker {
    private config: Required<Omit<PitchBeatLinkerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> };
    private pitchDetectors: Map<PitchBandName, PitchDetector> = new Map();

    /**
     * Create a new PitchBeatLinker
     *
     * @param config - Configuration options (partial, defaults applied)
     */
    constructor(config: PitchBeatLinkerConfig = {}) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...config,
            pitchDetector: {
                ...DEFAULT_CONFIG.pitchDetector,
                ...config.pitchDetector,
            },
        };

        if (this.config.bands.length === 0) {
            throw new Error('At least one frequency band must be specified');
        }

        // Initialize pitch detectors for each band
        for (const band of this.config.bands) {
            const bandName = band.name as PitchBandName;
            const detectorConfig: Partial<PitchDetectorConfig> = {
                ...this.config.pitchDetector,
                // Adjust frequency range to match the band
                minFrequency: this.config.pitchDetector.minFrequency ?? Math.max(40, band.lowHz * 0.5),
                maxFrequency: this.config.pitchDetector.maxFrequency ?? Math.min(band.highHz, 2000),
                targetSampleRate: this.config.targetSampleRate,
            };

            this.pitchDetectors.set(bandName, new PitchDetector(detectorConfig));
        }
    }

    /**
     * Get the current configuration
     */
    getConfig(): Required<Omit<PitchBeatLinkerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> } {
        return { ...this.config };
    }

    /**
     * Link pitch detection to rhythm beats with automatic band filtering
     *
     * This method applies band-pass filtering internally. For better performance
     * when filtering has already been done (e.g., by MultiBandAnalyzer), use
     * `linkPreFiltered()` instead.
     *
     * @param bandStreams - The band streams from GeneratedRhythm
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @param phrases - Optional rhythmic phrases for phrase-level correlation
     * @returns Linked pitch analysis result
     */
    link(
        bandStreams: { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap },
        audioBuffer: AudioBuffer,
        phrases?: RhythmicPhrase[]
    ): LinkedPitchAnalysis {
        const duration = audioBuffer.duration;
        const sampleRate = this.config.targetSampleRate;

        // Resample audio to target sample rate
        const resampled = resampleAudio(audioBuffer, sampleRate);
        const signal = resampled.data;

        // Create pre-filtered band signals
        const preFilteredBands: PreFilteredBandAudio[] = [];
        for (const band of this.config.bands) {
            const bandName = band.name as PitchBandName;
            const filteredSignal = applyFrequencyBand(signal, bandName, sampleRate);
            preFilteredBands.push({
                band: bandName,
                signal: filteredSignal,
                sampleRate,
            });
        }

        return this.linkPreFiltered(bandStreams, preFilteredBands, { duration }, phrases);
    }

    /**
     * Link pitch detection to rhythm beats using pre-filtered audio
     *
     * Use this method when band-pass filtering has already been applied
     * (e.g., by MultiBandAnalyzer) to avoid redundant filtering.
     *
     * @param bandStreams - The band streams from GeneratedRhythm
     * @param preFilteredBands - Pre-filtered audio signals for each band
     * @param config - Configuration including duration
     * @param phrases - Optional rhythmic phrases for phrase-level correlation
     * @returns Linked pitch analysis result
     */
    linkPreFiltered(
        bandStreams: { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap },
        preFilteredBands: PreFilteredBandAudio[],
        config: PreFilteredLinkConfig,
        phrases?: RhythmicPhrase[]
    ): LinkedPitchAnalysis {
        const duration = config.duration;
        const bandPitches = new Map<PitchBandName, BandPitchAtBeat>();

        // Create a map for quick band signal lookup
        const bandSignalMap = new Map<PitchBandName, PreFilteredBandAudio>();
        for (const preFiltered of preFilteredBands) {
            bandSignalMap.set(preFiltered.band, preFiltered);
        }

        // Process each band stream independently
        for (const bandName of ['low', 'mid', 'high'] as const) {
            const bandStream = bandStreams[bandName];
            const preFiltered = bandSignalMap.get(bandName);

            if (!preFiltered) {
                // No pre-filtered signal for this band, create empty result
                bandPitches.set(bandName, {
                    band: bandName,
                    pitches: [],
                    avgProbability: 0,
                    voicedBeatCount: 0,
                    totalBeatCount: bandStream.beats.length,
                });
                continue;
            }

            const bandResult = this.analyzeBandStream(bandStream, preFiltered);
            bandPitches.set(bandName, bandResult);
        }

        // Flatten all pitches into a single array sorted by timestamp
        const pitchByBeat = this.flattenPitches(bandPitches);

        // Determine dominant band
        const dominantBand = this.determineDominantBand(bandPitches);

        // Build phrase-pitch correlation if phrases provided
        const phrasePitchCorrelation = phrases
            ? this.buildPhraseCorrelation(phrases, bandPitches)
            : new Map<string, PitchResult[]>();

        // Calculate metadata
        let totalVoicedBeats = 0;
        let totalProbability = 0;
        let totalBeatsAnalyzed = 0;

        for (const [, bandResult] of bandPitches) {
            totalBeatsAnalyzed += bandResult.totalBeatCount;
            totalVoicedBeats += bandResult.voicedBeatCount;
            for (const pitchAtBeat of bandResult.pitches) {
                if (pitchAtBeat.pitch?.isVoiced) {
                    totalProbability += pitchAtBeat.pitch.probability;
                }
            }
        }

        return {
            bandPitches,
            pitchByBeat,
            dominantBand,
            phrasePitchCorrelation,
            metadata: {
                duration,
                totalBeatsAnalyzed,
                totalVoicedBeats,
                overallAvgProbability: totalVoicedBeats > 0 ? totalProbability / totalVoicedBeats : 0,
            },
        };
    }

    /**
     * Analyze pitch for a single band stream
     */
    private analyzeBandStream(
        bandStream: GeneratedRhythmMap,
        preFiltered: PreFilteredBandAudio
    ): BandPitchAtBeat {
        const { signal, sampleRate, band } = preFiltered;
        const detector = this.pitchDetectors.get(band);

        if (!detector) {
            throw new Error(`No pitch detector found for band: ${band}`);
        }

        const pitches: PitchAtBeat[] = [];
        let voicedCount = 0;
        let totalProbability = 0;

        // Iterate over each beat in this band stream
        for (const beat of bandStream.beats) {
            const pitch = this.detectPitchAtBeat(detector, signal, sampleRate, beat, band);
            pitches.push(pitch);

            if (pitch.pitch?.isVoiced) {
                voicedCount++;
                totalProbability += pitch.pitch.probability;
            }
        }

        return {
            band,
            pitches,
            avgProbability: voicedCount > 0 ? totalProbability / voicedCount : 0,
            voicedBeatCount: voicedCount,
            totalBeatCount: bandStream.beats.length,
        };
    }

    /**
     * Detect pitch at a specific beat timestamp
     */
    private detectPitchAtBeat(
        detector: PitchDetector,
        signal: Float32Array,
        sampleRate: number,
        beat: GeneratedBeat,
        band: PitchBandName
    ): PitchAtBeat {
        // Use original transient timestamp for pitch detection (more accurate)
        // Falls back to quantized timestamp if unavailable
        const analysisTimestamp = beat.detectedTimestamp ?? beat.timestamp;
        const pitch = detector.detectAt(signal, sampleRate, analysisTimestamp);

        return {
            beatIndex: beat.beatIndex,
            timestamp: beat.timestamp,
            band,
            pitch: pitch.isVoiced ? pitch : null,
            direction: 'none', // Populated in melody contour analysis
            intervalFromPrevious: 0, // Populated in melody contour analysis
        };
    }

    /**
     * Flatten all band pitches into a single sorted array
     */
    private flattenPitches(bandPitches: Map<PitchBandName, BandPitchAtBeat>): PitchAtBeat[] {
        const allPitches: PitchAtBeat[] = [];

        for (const [, bandResult] of bandPitches) {
            allPitches.push(...bandResult.pitches);
        }

        // Sort by timestamp
        allPitches.sort((a, b) => a.timestamp - b.timestamp);

        return allPitches;
    }

    /**
     * Determine which band has the best pitch results
     */
    private determineDominantBand(bandPitches: Map<PitchBandName, BandPitchAtBeat>): PitchBandName {
        let bestBand: PitchBandName = 'mid'; // Default to mid (vocals, melody)
        let bestScore = -1;

        for (const [bandName, bandResult] of bandPitches) {
            // Score combines average probability and voiced ratio
            const voicedRatio = bandResult.totalBeatCount > 0
                ? bandResult.voicedBeatCount / bandResult.totalBeatCount
                : 0;

            const score = bandResult.avgProbability * 0.7 + voicedRatio * 0.3;

            if (score > bestScore) {
                bestScore = score;
                bestBand = bandName;
            }
        }

        return bestBand;
    }

    /**
     * Build phrase-level pitch correlation
     *
     * Maps each phrase to the pitches detected within its occurrences.
     * Uses the phrase's unique `id` field as the map key for reliable lookups.
     *
     * This integration enables:
     * - Identifying which pitches are associated with which rhythmic phrases
     * - Tracking pitch patterns across repeated phrase occurrences
     * - Using phrase-level pitch data for button mapping decisions
     */
    private buildPhraseCorrelation(
        phrases: RhythmicPhrase[],
        bandPitches: Map<PitchBandName, BandPitchAtBeat>
    ): Map<string, PitchResult[]> {
        const correlation = new Map<string, PitchResult[]>();

        for (const phrase of phrases) {
            const phrasePitches: PitchResult[] = [];
            const bandResult = bandPitches.get(phrase.sourceBand);

            if (!bandResult) continue;

            // Find pitches within each phrase occurrence using timestamps
            for (const occurrence of phrase.occurrences) {
                const startTime = occurrence.startTimestamp;
                const endTime = occurrence.endTimestamp;

                // Find all pitches within this occurrence's time range
                // Uses RhythmicPhrase.sourceBand to get the correct pre-filtered band
                for (const pitch of bandResult.pitches) {
                    if (pitch.timestamp >= startTime && pitch.timestamp <= endTime && pitch.pitch) {
                        phrasePitches.push(pitch.pitch);
                    }
                }
            }

            // Store correlation using phrase.id as the unique key
            // This enables reliable lookups since id is a hash of the pattern
            if (phrasePitches.length > 0) {
                if (!correlation.has(phrase.id)) {
                    correlation.set(phrase.id, []);
                }
                correlation.get(phrase.id)!.push(...phrasePitches);
            }
        }

        return correlation;
    }

    /**
     * Get pitch results for a specific band
     *
     * Convenience method for accessing results by band name.
     *
     * @param analysis - The linked pitch analysis result
     * @param band - Band name to get results for
     * @returns Band pitch results for the specified band, or undefined if not found
     */
    getBandPitches(analysis: LinkedPitchAnalysis, band: PitchBandName): BandPitchAtBeat | undefined {
        return analysis.bandPitches.get(band);
    }

    /**
     * Get all voiced pitches across all bands
     *
     * Returns a combined array of all voiced pitch results, tagged with their band.
     *
     * @param analysis - The linked pitch analysis result
     * @returns Array of voiced pitch-at-beat results
     */
    getAllVoicedPitches(analysis: LinkedPitchAnalysis): PitchAtBeat[] {
        return analysis.pitchByBeat.filter(p => p.pitch?.isVoiced);
    }

    /**
     * Get pitches for a specific time range
     *
     * @param analysis - The linked pitch analysis result
     * @param startTime - Start time in seconds
     * @param endTime - End time in seconds
     * @returns Array of pitches within the time range
     */
    getPitchesInRange(
        analysis: LinkedPitchAnalysis,
        startTime: number,
        endTime: number
    ): PitchAtBeat[] {
        return analysis.pitchByBeat.filter(
            p => p.timestamp >= startTime && p.timestamp <= endTime
        );
    }

    // ============================================================================
    // Composite Stream Pitch Derivation (Phase 1.4)
    // ============================================================================

    /**
     * Derive pitches for composite stream beats from band stream pitches
     *
     * Since the composite stream is assembled from sections of band streams,
     * we can look up pitches without re-analyzing audio. Each composite beat
     * has a `sourceBand` field that tells us which band it came from.
     *
     * This is more efficient than running pitch detection again, and ensures
     * the pitch data is consistent with the band stream analysis.
     *
     * @param compositeStream - The composite stream from GeneratedRhythm.composite
     * @param linkedAnalysis - The linked pitch analysis from link() or linkPreFiltered()
     * @returns Array of pitch-at-beat for composite stream beats
     *
     * @example
     * ```typescript
     * const linker = new PitchBeatLinker();
     *
     * // First, analyze band streams
     * const linkedAnalysis = linker.link(bandStreams, audioBuffer);
     *
     * // Then derive composite pitches from band stream pitches
     * const compositePitches = linker.deriveCompositePitches(
     *   generatedRhythm.composite,
     *   linkedAnalysis
     * );
     *
     * // Access pitches for composite beats
     * for (const pitchAtBeat of compositePitches) {
     *   console.log(`Beat ${pitchAtBeat.beatIndex}: band=${pitchAtBeat.band}, pitch=${pitchAtBeat.pitch?.noteName}`);
     * }
     * ```
     */
    deriveCompositePitches(
        compositeStream: CompositeStream,
        linkedAnalysis: LinkedPitchAnalysis
    ): PitchAtBeat[] {
        const compositePitches: PitchAtBeat[] = [];

        // Build a lookup map for each band: timestamp -> PitchAtBeat
        const bandPitchesByTimestamp = new Map<PitchBandName, Map<number, PitchAtBeat>>();

        for (const [bandName, bandResult] of linkedAnalysis.bandPitches) {
            const timestampMap = new Map<number, PitchAtBeat>();
            for (const pitch of bandResult.pitches) {
                // Use rounded timestamp (to nearest ms) as key for matching
                const key = Math.round(pitch.timestamp * 1000);
                timestampMap.set(key, pitch);
            }
            bandPitchesByTimestamp.set(bandName, timestampMap);
        }

        // For each composite beat, look up the pitch from its source band
        for (const compositeBeat of compositeStream.beats) {
            const sourceBand = compositeBeat.sourceBand;
            const timestampMap = bandPitchesByTimestamp.get(sourceBand);

            if (!timestampMap) {
                // No pitches for this band, create a null entry
                compositePitches.push({
                    beatIndex: compositeBeat.beatIndex,
                    timestamp: compositeBeat.timestamp,
                    band: sourceBand,
                    pitch: null,
                    direction: 'none',
                    intervalFromPrevious: 0,
                });
                continue;
            }

            // Look up by timestamp (with millisecond tolerance)
            const key = Math.round(compositeBeat.timestamp * 1000);
            let matchingPitch = timestampMap.get(key);

            // If no exact match, try nearby timestamps (±2ms tolerance)
            if (!matchingPitch) {
                for (let offset = -2; offset <= 2; offset++) {
                    matchingPitch = timestampMap.get(key + offset);
                    if (matchingPitch) break;
                }
            }

            if (matchingPitch) {
                // Found matching pitch from band stream
                compositePitches.push({
                    beatIndex: compositeBeat.beatIndex,
                    timestamp: compositeBeat.timestamp,
                    band: sourceBand,
                    pitch: matchingPitch.pitch,
                    direction: matchingPitch.direction,
                    intervalFromPrevious: matchingPitch.intervalFromPrevious,
                    intervalCategory: matchingPitch.intervalCategory,
                });
            } else {
                // No matching pitch found
                compositePitches.push({
                    beatIndex: compositeBeat.beatIndex,
                    timestamp: compositeBeat.timestamp,
                    band: sourceBand,
                    pitch: null,
                    direction: 'none',
                    intervalFromPrevious: 0,
                });
            }
        }

        return compositePitches;
    }

    /**
     * Derive pitches for a difficulty variant from composite pitches
     *
     * Since difficulty variants are derived from the composite stream,
     * we can look up pitches by matching timestamps. Simplified variants
     * (e.g., easy) may have fewer beats, so we filter pitches accordingly.
     *
     * @param variant - The difficulty variant from GeneratedRhythm.difficultyVariants
     * @param compositePitches - Pitches derived from deriveCompositePitches()
     * @returns Array of pitch-at-beat for variant beats
     *
     * @example
     * ```typescript
     * const linker = new PitchBeatLinker();
     *
     * // Get composite pitches
     * const compositePitches = linker.deriveCompositePitches(
     *   generatedRhythm.composite,
     *   linkedAnalysis
     * );
     *
     * // Derive pitches for each difficulty variant
     * const easyPitches = linker.deriveVariantPitches(
     *   generatedRhythm.difficultyVariants.easy,
     *   compositePitches
     * );
     * const mediumPitches = linker.deriveVariantPitches(
     *   generatedRhythm.difficultyVariants.medium,
     *   compositePitches
     * );
     * const hardPitches = linker.deriveVariantPitches(
     *   generatedRhythm.difficultyVariants.hard,
     *   compositePitches
     * );
     * ```
     */
    deriveVariantPitches(
        variant: DifficultyVariant,
        compositePitches: PitchAtBeat[]
    ): PitchAtBeat[] {
        const variantPitches: PitchAtBeat[] = [];

        // Build a lookup map: timestamp -> PitchAtBeat from composite
        const compositeByTimestamp = new Map<number, PitchAtBeat>();
        for (const pitch of compositePitches) {
            const key = Math.round(pitch.timestamp * 1000);
            compositeByTimestamp.set(key, pitch);
        }

        // For each variant beat, look up the pitch from composite
        for (const variantBeat of variant.beats) {
            const key = Math.round(variantBeat.timestamp * 1000);
            let matchingPitch = compositeByTimestamp.get(key);

            // If no exact match, try nearby timestamps (±2ms tolerance)
            if (!matchingPitch) {
                for (let offset = -2; offset <= 2; offset++) {
                    matchingPitch = compositeByTimestamp.get(key + offset);
                    if (matchingPitch) break;
                }
            }

            if (matchingPitch) {
                // Found matching pitch from composite
                variantPitches.push({
                    beatIndex: variantBeat.beatIndex,
                    timestamp: variantBeat.timestamp,
                    band: variantBeat.sourceBand,
                    pitch: matchingPitch.pitch,
                    direction: matchingPitch.direction,
                    intervalFromPrevious: matchingPitch.intervalFromPrevious,
                    intervalCategory: matchingPitch.intervalCategory,
                });
            } else {
                // No matching pitch found
                variantPitches.push({
                    beatIndex: variantBeat.beatIndex,
                    timestamp: variantBeat.timestamp,
                    band: variantBeat.sourceBand,
                    pitch: null,
                    direction: 'none',
                    intervalFromPrevious: 0,
                });
            }
        }

        return variantPitches;
    }

    /**
     * Derive pitches for all difficulty variants at once
     *
     * Convenience method that derives pitches for easy, medium, and hard
     * variants in a single call.
     *
     * @param difficultyVariants - The difficulty variants from GeneratedRhythm
     * @param compositePitches - Pitches derived from deriveCompositePitches()
     * @returns Object with pitches for each difficulty level
     *
     * @example
     * ```typescript
     * const linker = new PitchBeatLinker();
     *
     * // Get composite pitches
     * const compositePitches = linker.deriveCompositePitches(
     *   generatedRhythm.composite,
     *   linkedAnalysis
     * );
     *
     * // Derive pitches for all variants
     * const allVariantPitches = linker.deriveAllVariantPitches(
     *   generatedRhythm.difficultyVariants,
     *   compositePitches
     * );
     *
     * console.log('Easy beats:', allVariantPitches.easy.length);
     * console.log('Medium beats:', allVariantPitches.medium.length);
     * console.log('Hard beats:', allVariantPitches.hard.length);
     * ```
     */
    deriveAllVariantPitches(
        difficultyVariants: {
            easy: DifficultyVariant;
            medium: DifficultyVariant;
            hard: DifficultyVariant;
        },
        compositePitches: PitchAtBeat[]
    ): {
        easy: PitchAtBeat[];
        medium: PitchAtBeat[];
        hard: PitchAtBeat[];
    } {
        return {
            easy: this.deriveVariantPitches(difficultyVariants.easy, compositePitches),
            medium: this.deriveVariantPitches(difficultyVariants.medium, compositePitches),
            hard: this.deriveVariantPitches(difficultyVariants.hard, compositePitches),
        };
    }
}
