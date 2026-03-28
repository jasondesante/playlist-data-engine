/**
 * Pitch Beat Linker - Links pitch detection to rhythm beat timestamps
 *
 * Performs full-spectrum pitch detection on the unfiltered audio signal,
 * then matches pitch frames to beat timestamps.
 *
 * All bands share the same full-spectrum analysis because band-pass filtering
 * (8th order Butterworth) removes too many harmonics for YIN/Essentia to
 * find periodicity reliably.
 *
 * Part of the Pitch Detection & Button Mapping pipeline - Phase 1.3
 *
 * @example
 * ```typescript
 * const linker = new PitchBeatLinker();
 *
 * // Analyze pitch and link to composite beats
 * const compositePitches = await linker.linkWithComposite(compositeStream, audioBuffer);
 *
 * // Access pitch at each beat
 * for (const pitchAtBeat of compositePitches) {
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
} from '../analysis/beat/utils/audioUtils.js';
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

    /** Which band stream this beat originated from (rhythm origin, not pitch detection band) */
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
 * Configuration for PitchBeatLinker
 */
export interface PitchBeatLinkerConfig {
    /** Pitch detector configuration (passed through to PitchDetector) */
    pitchDetector?: Partial<PitchDetectorConfig>;

    /** Target sample rate for analysis (default: 44100) */
    targetSampleRate?: number;

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
     * Link pitch detection to composite stream beats.
     *
     * Runs pitch detection on the full unfiltered signal, then matches each composite
     * beat's timestamp directly against pitch frames.
     *
     * When an Essentia algorithm is selected via `pitchAlgorithm`, the Essentia.js WASM
     * module is loaded lazily on first call (async) and cached for reuse.
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

        console.debug('[PitchBeatLinker] Full-spectrum analysis:', {
            detector: this.config.pitchAlgorithm === 'pyin_legacy' ? 'pYIN' : `essentia/${this.config.pitchAlgorithm}`,
            totalFrames: fullSpectrumResults.length,
            voicedFrames: fullSpectrumResults.filter(r => r.isVoiced).length,
            signalLength: signal.length,
            signalSampleRate: sampleRate,
        });

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

    // ============================================================================
    // Variant Pitch Derivation (Phase 1.4)
    // ============================================================================

    /**
     * Derive pitches for a difficulty variant from composite pitches
     *
     * Since difficulty variants are derived from the composite stream,
     * we can look up pitches by matching timestamps. Simplified variants
     * (e.g., easy) may have fewer beats, so we filter pitches accordingly.
     *
     * @param variant - The difficulty variant from GeneratedRhythm.difficultyVariants
     * @param compositePitches - Pitches from linkWithComposite()
     * @returns Array of pitch-at-beat for variant beats
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
     * @param compositePitches - Pitches from linkWithComposite()
     * @returns Object with pitches for each difficulty level
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
