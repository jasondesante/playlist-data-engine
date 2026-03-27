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
import type { EssentiaPitchAlgorithm } from '../analysis/EssentiaPitchDetector.js';
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

    /** Use Essentia.js pitch detection instead of the built-in pYIN detector */
    useEssentiaPitch?: boolean;

    /** Which Essentia pitch algorithm to use (default: 'predominant_melodia') */
    essentiaPitchAlgorithm?: EssentiaPitchAlgorithm;

    /** URL to the CREPE TFJS model (only required when essentiaPitchAlgorithm is 'pitch_crepe') */
    crepeModelUrl?: string;
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
    private fullSpectrumDetector: PitchDetector;

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

        // Run pitch detection on the FULL unfiltered signal.
        // Band-pass filtering (8th order Butterworth) removes too many harmonics
        // for YIN to find periodicity, so all bands share one full-spectrum analysis.
        const fullSpectrumResults = this.fullSpectrumDetector.detectSignalRaw(signal, sampleRate);
        const hopTime = this.fullSpectrumDetector.getConfig().hopSize / sampleRate;

        // DEBUG: pitch detection diagnostics
        const voicedFrames = fullSpectrumResults.filter(r => r.isVoiced);
        const maxProb = Math.max(...fullSpectrumResults.map(r => r.probability));
        const probsAbove03 = fullSpectrumResults.filter(r => r.probability > 0.3 && !r.isVoiced);
        console.log('[PitchBeatLinker] Full-spectrum analysis:', {
            totalFrames: fullSpectrumResults.length,
            voicedFrames: voicedFrames.length,
            voicedPct: ((voicedFrames.length / fullSpectrumResults.length) * 100).toFixed(1) + '%',
            maxProbability: maxProb.toFixed(3),
            voicingThreshold: this.fullSpectrumDetector.getConfig().voicingThreshold,
            nearMissFrames: probsAbove03.length, // frames with prob 0.3-0.5 that didn't pass threshold
            signalLength: signal.length,
            signalSampleRate: sampleRate,
            detectorFreqRange: `${this.fullSpectrumDetector.getConfig().minFrequency}-${this.fullSpectrumDetector.getConfig().maxFrequency} Hz`,
        });
        if (voicedFrames.length > 0) {
            console.log('[PitchBeatLinker] Sample voiced frames:', voicedFrames.slice(0, 5).map(r => ({
                t: r.timestamp.toFixed(3) + 's',
                freq: r.frequency.toFixed(1) + ' Hz',
                prob: r.probability.toFixed(3),
                note: r.noteName,
            })));
        }
        if (probsAbove03.length > 0) {
            console.log('[PitchBeatLinker] Near-miss frames (prob 0.3-0.5, below threshold):', probsAbove03.slice(0, 5).map(r => ({
                t: r.timestamp.toFixed(3) + 's',
                prob: r.probability.toFixed(3),
            })));
        }

        // Create pre-filtered band signals (still needed for linkPreFiltered interface,
        // but pitch detection uses fullSpectrumResults instead)
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

        return this.linkPreFiltered(bandStreams, preFilteredBands, { duration }, phrases, fullSpectrumResults, hopTime);
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
     * @param sharedPitchResults - Optional pre-computed pitch results from full-spectrum analysis
     * @param hopTime - Hop time in seconds (required if sharedPitchResults provided)
     * @returns Linked pitch analysis result
     */
    linkPreFiltered(
        bandStreams: { low: GeneratedRhythmMap; mid: GeneratedRhythmMap; high: GeneratedRhythmMap },
        preFilteredBands: PreFilteredBandAudio[],
        config: PreFilteredLinkConfig,
        phrases?: RhythmicPhrase[],
        sharedPitchResults?: PitchResult[],
        hopTime?: number
    ): LinkedPitchAnalysis {
        const duration = config.duration;
        const bandPitches = new Map<PitchBandName, BandPitchAtBeat>();

        // Process each band stream independently
        for (const bandName of ['low', 'mid', 'high'] as const) {
            const bandStream = bandStreams[bandName];

            if (sharedPitchResults && hopTime) {
                // Use shared full-spectrum pitch results for all bands
                const bandResult = this.analyzeBandStreamWithResults(bandStream, sharedPitchResults, hopTime, bandName);
                bandPitches.set(bandName, bandResult);
            } else {
                // Fallback: run per-band pitch detection (less accurate)
                const preFiltered = preFilteredBands.find(b => b.band === bandName);

                if (!preFiltered) {
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

        for (const [bandName, bandResult] of bandPitches) {
            totalBeatsAnalyzed += bandResult.totalBeatCount;
            totalVoicedBeats += bandResult.voicedBeatCount;
            for (const pitchAtBeat of bandResult.pitches) {
                if (pitchAtBeat.pitch?.isVoiced) {
                    totalProbability += pitchAtBeat.pitch.probability;
                }
            }
        }

        // DEBUG: per-band pitch results + timing diagnostics
        const allBeatTimestamps = Array.from(bandPitches.values()).flatMap(b => b.pitches.map(p => p.timestamp));
        const voicedTimestamps = sharedPitchResults?.filter(r => r.isVoiced).map(r => r.timestamp) ?? [];
        console.log('[PitchBeatLinker] Per-band results:', {
            low: { total: bandPitches.get('low')?.totalBeatCount, voiced: bandPitches.get('low')?.voicedBeatCount },
            mid: { total: bandPitches.get('mid')?.totalBeatCount, voiced: bandPitches.get('mid')?.voicedBeatCount },
            high: { total: bandPitches.get('high')?.totalBeatCount, voiced: bandPitches.get('high')?.voicedBeatCount },
        });
        console.log('[PitchBeatLinker] Timing ranges:', {
            beats: allBeatTimestamps.length > 0 ? {
                min: Math.min(...allBeatTimestamps).toFixed(3) + 's',
                max: Math.max(...allBeatTimestamps).toFixed(3) + 's',
            } : 'none',
            voicedFrames: voicedTimestamps.length > 0 ? {
                count: voicedTimestamps.length,
                min: Math.min(...voicedTimestamps).toFixed(3) + 's',
                max: Math.max(...voicedTimestamps).toFixed(3) + 's',
            } : 'none',
        });

        // DEBUG: distance stats from lookup
        if (this._distanceStats.low?.distances.length) {
            for (const [bandName, stats] of Object.entries(this._distanceStats)) {
                const sorted = [...stats.distances].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                console.log(`[PitchBeatLinker] Distance stats for '${bandName}':`, {
                    totalBeats: sorted.length,
                    minDist: sorted[0] + ' frames',
                    medianDist: median + ' frames',
                    maxDist: sorted[sorted.length - 1] + ' frames',
                    within5: sorted.filter(d => d <= 5).length,
                    within50: sorted.filter(d => d <= 50).length,
                    within500: sorted.filter(d => d <= 500).length,
                    sampleBeats: stats.sampleBeats,
                });
            }
            // Reset for next call
            this._distanceStats = {};
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
     * Analyze pitch for a single band stream using continuous pYIN with HMM tracking
     *
     * Runs full continuous pitch detection on the entire signal, then looks up
     * the nearest frame result for each beat timestamp. This is dramatically more
     * accurate than single-frame detectAt() because the HMM Viterbi decoder finds
     * the most probable smooth pitch trajectory across all frames.
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

        // Run continuous YIN detection without HMM (raw voicing decisions)
        // HMM is too conservative for band-pass filtered polyphonic music
        const continuousResults = detector.detectSignalRaw(signal, sampleRate);
        const hopTime = detector.getConfig().hopSize / sampleRate;

        const pitches: PitchAtBeat[] = [];
        let voicedCount = 0;
        let totalProbability = 0;

        // Look up the nearest frame for each beat timestamp
        for (const beat of bandStream.beats) {
            const pitch = this.lookupPitchAtTimestamp(continuousResults, hopTime, beat, band);
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
     * Searches the ENTIRE voiced frame array for the nearest voiced frame to
     * the beat timestamp and logs the distance. This is a diagnostic version
     * to understand timing misalignment between beats and pitch detection.
     */
    private lookupPitchAtTimestamp(
        continuousResults: PitchResult[],
        hopTime: number,
        beat: GeneratedBeat,
        band: PitchBandName
    ): PitchAtBeat {
        const lookupTimestamp = beat.detectedTimestamp ?? beat.timestamp;
        const centerFrame = Math.round(lookupTimestamp / hopTime);

        // Find nearest voiced frame across ALL results (not just a window)
        let bestResult: PitchResult | null = null;
        let bestDist = Infinity;
        let bestProb = 0;

        for (let i = 0; i < continuousResults.length; i++) {
            const result = continuousResults[i];
            if (!result.isVoiced) continue;

            const dist = Math.abs(i - centerFrame);
            // Prefer closer frames; among equal distance, prefer higher probability
            if (dist < bestDist || (dist === bestDist && result.probability > bestProb)) {
                bestDist = dist;
                bestProb = result.probability;
                bestResult = result;
            }
        }

        // Collect distance stats for logging (only on first call per band)
        if (!this._distanceStats[band]) {
            this._distanceStats[band] = { distances: [], sampleBeats: [] };
        }
        const stats = this._distanceStats[band];
        stats.distances.push(bestDist);
        if (stats.sampleBeats.length < 3) {
            stats.sampleBeats.push({
                beatTime: lookupTimestamp.toFixed(3),
                nearestVoicedDist: bestDist,
                nearestVoicedTime: bestResult?.timestamp.toFixed(3) ?? 'none',
                nearestVoicedNote: bestResult?.noteName ?? 'none',
            });
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

    private _distanceStats: Record<string, { distances: number[]; sampleBeats: object[] }> = {};

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
