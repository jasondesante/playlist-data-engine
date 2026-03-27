/**
 * Pitch Beat Linker - Links pitch detection to rhythm beat timestamps
 *
 * Performs full-spectrum pitch detection on the unfiltered audio signal,
 * then matches pitch frames to beat timestamps across all band streams.
 *
 * All bands share the same full-spectrum analysis because band-pass filtering
 * (8th order Butterworth) removes too many harmonics for YIN/Essentia to
 * find periodicity reliably. Band streams are used only for beat iteration,
 * not for filtered audio analysis.
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 1.3
 *
 * @example
 * ```typescript
 * const linker = new PitchBeatLinker();
 *
 * // Analyze pitch and link to beats
 * const result = await linker.linkWithBands(generatedRhythm, audioBuffer);
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
import { EssentiaPitchDetector, type EssentiaPitchAlgorithm, type PitchAlgorithm } from '../analysis/EssentiaPitchDetector.js';
import {
    resampleAudio,
    FREQUENCY_BANDS,
    type FrequencyBand,
} from '../analysis/beat/utils/audioUtils.js';
import type { GeneratedRhythmMap, GeneratedBeat } from '../analysis/beat/RhythmQuantizer.js';
import type { RhythmicPhrase } from '../analysis/beat/PhraseAnalyzer.js';
import type { CompositeStream } from '../analysis/beat/CompositeStreamGenerator.js';
import type { DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';
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

    /** Average probability of voiced frames */
    avgProbability: number;

    /** Number of beats with detected pitch */
    voicedBeatCount: number;

    /** Total number of beats analyzed */
    totalBeatCount: number;
}

/**
 * Result of linking pitch to rhythm beats
 */
export interface LinkedPitchAnalysis {
    /** Pitch at each beat across all band streams, keyed by band name */
    bandPitches: Map<PitchBandName, BandPitchAtBeat>;

    /** All pitches flattened and sorted by timestamp */
    pitchByBeat: PitchAtBeat[];

    /** Phrase-level pitch correlation (phrase ID → pitches) */
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

    /** Which pitch detection algorithm to use. 'pyin_legacy' uses the built-in detector; all others use Essentia.js. (default: 'pitch_melodia') */
    pitchAlgorithm?: PitchAlgorithm;

    /** URL to the CREPE TFJS model (only required when pitchAlgorithm is 'pitch_crepe') */
    crepeModelUrl?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default configuration for PitchBeatLinker */
const DEFAULT_CONFIG: Required<Omit<PitchBeatLinkerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> } = {
    targetSampleRate: 44100,
    pitchDetector: {},
    bands: FREQUENCY_BANDS,
    pitchAlgorithm: 'pitch_melodia',
    crepeModelUrl: 'https://arweave.net/PLACEHOLDER_CREPE_TINY',
};

// ============================================================================
// PitchBeatLinker Class
// ============================================================================

/**
 * Links pitch detection to rhythm beat timestamps
 *
 * Performs full-spectrum pitch detection on the unfiltered audio signal,
 * then matches pitch frames to beat timestamps.
 */
export class PitchBeatLinker {
    private config: Required<Omit<PitchBeatLinkerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> };
    private fullSpectrumDetector: PitchDetector;
    private essentiaDetector: EssentiaPitchDetector | null = null;

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

        // Initialize a full-spectrum detector for pitch detection on unfiltered audio.
        // Band-pass filtered audio (8th order Butterworth) removes too many harmonics
        // for YIN to find periodicity reliably, so we detect pitch on the full signal.
        // Use a relaxed YIN threshold (0.4 vs default 0.1) for polyphonic music where
        // CMNDF rarely drops below 0.1 due to competing periodicities.
        this.fullSpectrumDetector = new PitchDetector({
            ...this.config.pitchDetector,
            minFrequency: this.config.pitchDetector.minFrequency ?? 80,
            maxFrequency: this.config.pitchDetector.maxFrequency ?? 1000,
            targetSampleRate: this.config.targetSampleRate,
            yinThreshold: this.config.pitchDetector.yinThreshold ?? 0.4,
        });
    }

    /**
     * Get the current configuration
     */
    getConfig(): Required<Omit<PitchBeatLinkerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> } {
        return { ...this.config };
    }

    /**
     * Link pitch detection to rhythm beats
     *
     * Runs full-spectrum pitch detection on the unfiltered audio, then matches
     * pitch frames to beat timestamps across all band streams.
     *
     * When an Essentia algorithm is selected via `pitchAlgorithm`, the Essentia.js WASM
     * module is loaded lazily on first call (async) and cached for reuse.
     * @param bandStreams - The band streams from GeneratedRhythm
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @param phrases - Optional rhythmic phrases for phrase-level correlation
     * @returns Promise resolving to linked pitch analysis result
     */
    async linkWithBands(
        bandStreams: { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap },
        audioBuffer: AudioBuffer,
        phrases?: RhythmicPhrase[]
    ): Promise<LinkedPitchAnalysis> {
        const duration = audioBuffer.duration;
        const sampleRate = this.config.targetSampleRate;

        // Resample audio to target sample rate
        const resampled = resampleAudio(audioBuffer, sampleRate);
        const signal = resampled.data;

        // Run pitch detection on the FULL unfiltered signal.
        // Band-pass filtering (8th order Butterworth) removes too many harmonics
        // for YIN to find periodicity, so all bands share one full-spectrum analysis.
        let fullSpectrumResults: PitchResult[];
        let hopTime: number;

        if (this.config.pitchAlgorithm === 'pyin_legacy') {
            fullSpectrumResults = this.fullSpectrumDetector.detectSignalRaw(signal, sampleRate);
            hopTime = this.fullSpectrumDetector.getConfig().hopSize / sampleRate;
        } else {
            // Lazily instantiate Essentia detector (WASM loading is async)
            if (!this.essentiaDetector) {
                this.essentiaDetector = await EssentiaPitchDetector.create({
                    algorithm: this.config.pitchAlgorithm as EssentiaPitchAlgorithm,
                    minFrequency: this.config.pitchDetector.minFrequency ?? 80,
                    maxFrequency: this.config.pitchDetector.maxFrequency ?? 20000,
                    crepeModelUrl: this.config.crepeModelUrl,
                });
                console.log(`[PitchBeatLinker] Essentia detector initialized: ${this.config.pitchAlgorithm}`);
            }

            fullSpectrumResults = this.essentiaDetector.detectSignal(signal, sampleRate);
            hopTime = this.essentiaDetector.getConfig().hopSize / sampleRate;
        }

        console.debug('[PitchBeatLinker] Full-spectrum analysis:', {
            detector: this.config.pitchAlgorithm === 'pyin_legacy' ? 'pYIN' : `essentia/${this.config.pitchAlgorithm}`,
            totalFrames: fullSpectrumResults.length,
            voicedFrames: fullSpectrumResults.filter(r => r.isVoiced).length,
            signalLength: signal.length,
            signalSampleRate: sampleRate,
        });

        return this.linkWithResults(bandStreams, duration, fullSpectrumResults, hopTime, phrases);
    }

    /**
     * Link pitch detection to composite stream beats only.
     *
     * Runs pitch detection on the full unfiltered signal, then matches each composite
     * beat's timestamp directly against pitch frames. This is the fast path for gameplay
     * — it returns only the composite pitches (the beats the player will interact with)
     * without running the full band-level analysis.
     *
     * @param compositeStream - The composite stream from GeneratedRhythm
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @returns Promise resolving to pitch at each composite beat
     */
    async linkWithComposite(
        compositeStream: CompositeStream,
        audioBuffer: AudioBuffer
    ): Promise<PitchAtBeat[]> {
        const sampleRate = this.config.targetSampleRate;

        // Resample audio to target sample rate
        const resampled = resampleAudio(audioBuffer, sampleRate);
        const signal = resampled.data;

        // Run pitch detection on the full unfiltered signal
        let fullSpectrumResults: PitchResult[];
        let hopTime: number;

        if (this.config.pitchAlgorithm === 'pyin_legacy') {
            fullSpectrumResults = this.fullSpectrumDetector.detectSignalRaw(signal, sampleRate);
            hopTime = this.fullSpectrumDetector.getConfig().hopSize / sampleRate;
        } else {
            if (!this.essentiaDetector) {
                this.essentiaDetector = await EssentiaPitchDetector.create({
                    algorithm: this.config.pitchAlgorithm as EssentiaPitchAlgorithm,
                    minFrequency: this.config.pitchDetector.minFrequency ?? 80,
                    maxFrequency: this.config.pitchDetector.maxFrequency ?? 20000,
                    crepeModelUrl: this.config.crepeModelUrl,
                });
                console.log(`[PitchBeatLinker] Essentia detector initialized: ${this.config.pitchAlgorithm}`);
            }

            fullSpectrumResults = this.essentiaDetector.detectSignal(signal, sampleRate);
            hopTime = this.essentiaDetector.getConfig().hopSize / sampleRate;
        }

        // Match pitch directly to composite beat timestamps
        const compositePitches: PitchAtBeat[] = [];
        for (const beat of compositeStream.beats) {
            const lookupTimestamp = beat.detectedTimestamp ?? beat.timestamp;
            const centerFrame = Math.round(lookupTimestamp / hopTime);

            let bestResult: PitchResult | null = null;
            let bestDist = Infinity;
            let bestProb = 0;

            for (let i = 0; i < fullSpectrumResults.length; i++) {
                const result = fullSpectrumResults[i];
                if (!result.isVoiced) continue;

                const dist = Math.abs(i - centerFrame);
                if (dist < bestDist || (dist === bestDist && result.probability > bestProb)) {
                    bestDist = dist;
                    bestProb = result.probability;
                    bestResult = result;
                }
            }

            compositePitches.push({
                beatIndex: beat.beatIndex,
                timestamp: beat.timestamp,
                band: beat.sourceBand,
                pitch: bestResult,
                direction: 'none', // Populated in melody contour analysis
                intervalFromPrevious: 0, // Populated in melody contour analysis
            });
        }

        return compositePitches;
    }

    /**
     * Link pre-computed pitch results to rhythm beats
     *
     * Use this when you already have pitch detection results (e.g., from an
     * external detector) and want to match them to beat timestamps.
     *
     * @param bandStreams - The band streams from GeneratedRhythm
     * @param duration - Duration of the audio in seconds
     * @param pitchResults - Pre-computed pitch results
     * @param hopTime - Hop time in seconds between pitch frames
     * @returns Linked pitch analysis result
     */
    linkPreFiltered(
        bandStreams: { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap },
        duration: number,
        pitchResults: PitchResult[],
        hopTime: number
    ): LinkedPitchAnalysis {
        return this.linkWithResults(bandStreams, duration, pitchResults, hopTime);
    }

    /**
     * Core linking logic: match pitch results to beat timestamps for all bands
     *
     * When compositeStream is provided, also produces compositePitches by matching
     * each composite beat's sourceBand + beatIndex directly against the band-level
     * pitch data (exact match, no timestamp tolerance).
     */
    private linkWithResults(
        bandStreams: { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap },
        duration: number,
        pitchResults: PitchResult[],
        hopTime: number,
        phrases?: RhythmicPhrase[]
    ): LinkedPitchAnalysis {
        const bandPitches = new Map<PitchBandName, BandPitchAtBeat>();

        // All bands share the same full-spectrum pitch results.
        // Band streams are used only for beat iteration, not for filtered audio.
        for (const bandName of ['low', 'mid', 'high'] as const) {
            const bandResult = this.analyzeBandStreamWithResults(
                bandStreams[bandName], pitchResults, hopTime, bandName
            );
            bandPitches.set(bandName, bandResult);
        }

        // Flatten all pitches into a single array sorted by timestamp
        const pitchByBeat = this.flattenPitches(bandPitches);

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
     * Analyze pitch for a band stream using pre-computed full-spectrum pitch results
     *
     * All bands share the same pitch analysis from the unfiltered audio.
     * This is more accurate than per-band filtered analysis because the full
     * harmonic series is preserved, giving YIN better periodicity detection.
     */
    private analyzeBandStreamWithResults(
        bandStream: GeneratedRhythmMap,
        pitchResults: PitchResult[],
        hopTime: number,
        band: PitchBandName
    ): BandPitchAtBeat {
        const pitches: PitchAtBeat[] = [];
        let voicedCount = 0;
        let totalProbability = 0;

        for (const beat of bandStream.beats) {
            const pitch = this.lookupPitchAtTimestamp(pitchResults, hopTime, beat, band);
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
     * Look up the best pitch result near a beat timestamp
     *
     * Searches the voiced frame array for the nearest voiced frame to
     * the beat timestamp.
     */
    private lookupPitchAtTimestamp(
        pitchResults: PitchResult[],
        hopTime: number,
        beat: GeneratedBeat,
        band: PitchBandName
    ): PitchAtBeat {
        const lookupTimestamp = beat.detectedTimestamp ?? beat.timestamp;
        const centerFrame = Math.round(lookupTimestamp / hopTime);

        let bestResult: PitchResult | null = null;
        let bestDist = Infinity;
        let bestProb = 0;

        for (let i = 0; i < pitchResults.length; i++) {
            const result = pitchResults[i];
            if (!result.isVoiced) continue;

            const dist = Math.abs(i - centerFrame);
            if (dist < bestDist || (dist === bestDist && result.probability > bestProb)) {
                bestDist = dist;
                bestProb = result.probability;
                bestResult = result;
            }
        }

        return {
            beatIndex: beat.beatIndex,
            timestamp: beat.timestamp,
            band,
            pitch: bestResult,
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

        allPitches.sort((a, b) => a.timestamp - b.timestamp);
        return allPitches;
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
                for (const pitch of bandResult.pitches) {
                    if (pitch.timestamp >= startTime && pitch.timestamp <= endTime && pitch.pitch) {
                        phrasePitches.push(pitch.pitch);
                    }
                }
            }

            // Store correlation using phrase.id as the unique key
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
     * const linkedAnalysis = await linker.linkWithBands(bandStreams, audioBuffer);
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
