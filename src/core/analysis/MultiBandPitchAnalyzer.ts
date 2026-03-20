/**
 * Multi-Band Pitch Analyzer
 *
 * Analyzes pitch across multiple frequency bands, reusing the same band definitions
 * and filtering infrastructure from rhythm generation (MultiBandAnalyzer).
 *
 * This ensures consistent frequency band analysis across both pitch detection and
 * rhythm generation systems.
 *
 * ## Usage
 *
 * ```typescript
 * const analyzer = new MultiBandPitchAnalyzer();
 * const result = analyzer.analyze(audioBuffer);
 *
 * // Check which band has the best pitch results
 * console.log('Primary band:', result.primaryBand);
 *
 * // Access pitch results per band
 * for (const [band, analysis] of result.bandAnalyses) {
 *   console.log(`${band}: ${analysis.results.length} pitch frames, avg probability: ${analysis.avgProbability}`);
 * }
 * ```
 *
 * @module MultiBandPitchAnalyzer
 */

import {
    resampleAudio,
    applyFrequencyBand,
    FREQUENCY_BANDS,
    type FrequencyBand,
} from './beat/utils/audioUtils.js';
import { PitchDetector, type PitchResult, type PitchDetectorConfig } from './PitchDetector.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Band name type matching FREQUENCY_BANDS
 */
export type BandName = 'low' | 'mid' | 'high';

/**
 * Direction of a melody segment
 */
export type MelodySegmentDirection = 'up' | 'down' | 'stable';

/**
 * Overall direction of a melody contour
 */
export type MelodyContourDirection = 'ascending' | 'descending' | 'stable' | 'mixed';

/**
 * A segment of a melody with consistent direction
 *
 * Part of Phase 1.5 (Melody Contour Analysis)
 */
export interface MelodySegment {
    /** Start time in seconds */
    startTime: number;
    /** End time in seconds */
    endTime: number;
    /** Starting pitch (note name, e.g., "C4") */
    startPitch: string;
    /** Ending pitch (note name, e.g., "F#5") */
    endPitch: string;
    /** Direction of this segment */
    direction: MelodySegmentDirection;
    /** Interval in semitones between start and end */
    interval: number;
}

/**
 * Melody contour representing the overall melodic shape
 *
 * Populated by melody contour analysis (Phase 1.5).
 * Used by button mapping (Phase 2) to generate patterns that follow the melody.
 *
 * @example
 * ```typescript
 * const result = analyzer.analyze(audioBuffer);
 * if (result.combinedMelody) {
 *   console.log('Overall direction:', result.combinedMelody.direction);
 *   console.log('Melody range:', result.combinedMelody.range.minNote, '-', result.combinedMelody.range.maxNote);
 * }
 * ```
 */
export interface MelodyContour {
    /** Melody segments grouped by direction */
    segments: MelodySegment[];
    /** Overall direction of the melody */
    direction: MelodyContourDirection;
    /** Pitch range of the melody */
    range: {
        /** Lowest note (e.g., "C4") */
        minNote: string;
        /** Highest note (e.g., "F#5") */
        maxNote: string;
        /** Total span in semitones */
        semitones: number;
    };
    /** Time-window direction analysis (Phase 1.5.3) */
    /** Direction over the last 1-2 beats */
    shortTermDirection: MelodyContourDirection;
    /** Direction over the last 4-8 beats */
    mediumTermDirection: MelodyContourDirection;
    /** Direction over the last 16+ beats */
    longTermDirection: MelodyContourDirection;
}

/**
 * Pitch analysis result for a single frequency band
 */
export interface BandPitchAnalysis {
    /** Band name identifier */
    band: BandName;
    /** Frequency range of this band */
    frequencyRange: {
        lowHz: number;
        highHz: number;
    };
    /** Pitch detection results for this band */
    results: PitchResult[];
    /** Average probability across all voiced frames (0-1) */
    avgProbability: number;
    /** Number of voiced frames (frames where pitch was detected) */
    voicedFrameCount: number;
    /** Total number of frames analyzed */
    totalFrameCount: number;
}

/**
 * Configuration for MultiBandPitchAnalyzer
 */
export interface MultiBandPitchAnalyzerConfig {
    /** Pitch detector configuration (passed through to PitchDetector) */
    pitchDetector?: Partial<PitchDetectorConfig>;
    /** Target sample rate for analysis (default: 44100) */
    targetSampleRate?: number;
    /** Custom frequency bands (default: FREQUENCY_BANDS from audioUtils) */
    bands?: FrequencyBand[];
}

/**
 * Result of multi-band pitch analysis
 */
export interface MultiBandPitchAnalysis {
    /** Band with the highest average pitch probability */
    primaryBand: BandName;
    /** Pitch analysis results per band, keyed by band name */
    bandAnalyses: Map<BandName, BandPitchAnalysis>;
    /**
     * Combined melody contour from the primary band
     *
     * Populated by melody contour analysis (Phase 1.5).
     * This field is null until melody contour analysis is performed.
     *
     * Use `primaryBand` to know which band's pitches to use for button mapping.
     */
    combinedMelody: MelodyContour | null;
    /** The frequency bands that were used for analysis */
    bandsUsed: FrequencyBand[];
    /** Analysis metadata */
    metadata: {
        /** Duration of the audio in seconds */
        duration: number;
        /** Effective sample rate after resampling */
        effectiveSampleRate: number;
        /** Number of frames analyzed per band */
        framesPerBand: number;
    };
}

/**
 * Pre-filtered audio input for a single band
 *
 * Use this when you have already applied band-pass filtering (e.g., from MultiBandAnalyzer)
 * and want to avoid redundant filtering operations.
 */
export interface PreFilteredBandInput {
    /** Band name identifier */
    band: BandName;
    /** Pre-filtered audio signal (already band-pass filtered) */
    signal: Float32Array;
    /** Sample rate of the signal */
    sampleRate: number;
}

/**
 * Configuration for pre-filtered analysis
 */
export interface PreFilteredAnalysisConfig {
    /** Duration of the audio in seconds (required for metadata) */
    duration: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default configuration for MultiBandPitchAnalyzer */
const DEFAULT_CONFIG: Required<Omit<MultiBandPitchAnalyzerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> } = {
    targetSampleRate: 44100,
    pitchDetector: {},
    bands: FREQUENCY_BANDS,
};

// ============================================================================
// MultiBandPitchAnalyzer Class
// ============================================================================

/**
 * Multi-Band Pitch Analyzer
 *
 * Analyzes pitch across multiple frequency bands using the same band definitions
 * and filtering infrastructure as rhythm generation.
 */
export class MultiBandPitchAnalyzer {
    private config: Required<Omit<MultiBandPitchAnalyzerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> };
    private pitchDetectors: Map<BandName, PitchDetector> = new Map();

    /**
     * Create a new MultiBandPitchAnalyzer
     *
     * @param config - Configuration options (partial, defaults applied)
     */
    constructor(config: MultiBandPitchAnalyzerConfig = {}) {
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

        // Initialize pitch detectors for each band with appropriate frequency ranges
        for (const band of this.config.bands) {
            const bandName = band.name as BandName;
            // Adjust pitch detector frequency range to match the band
            const detectorConfig: Partial<PitchDetectorConfig> = {
                ...this.config.pitchDetector,
                // Ensure min/max frequency is within the band's range
                // But also respect sensible defaults for pitch detection
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
    getConfig(): Required<Omit<MultiBandPitchAnalyzerConfig, 'pitchDetector'>> & { pitchDetector: Partial<PitchDetectorConfig> } {
        return { ...this.config };
    }

    /**
     * Get the frequency bands being used
     */
    getBands(): FrequencyBand[] {
        return [...this.config.bands];
    }

    /**
     * Analyze pitch across all frequency bands
     *
     * @param audioBuffer - Web Audio API AudioBuffer to analyze
     * @returns Multi-band pitch analysis result
     */
    analyze(audioBuffer: AudioBuffer): MultiBandPitchAnalysis {
        const duration = audioBuffer.duration;
        const sampleRate = this.config.targetSampleRate;

        // Step 1: Resample audio to target sample rate
        const resampled = resampleAudio(audioBuffer, sampleRate);
        const signal = resampled.data;

        // Step 2: Process each frequency band
        const bandAnalyses = new Map<BandName, BandPitchAnalysis>();

        for (const band of this.config.bands) {
            const bandName = band.name as BandName;
            const analysis = this.analyzeBand(signal, bandName, band, sampleRate, duration);
            bandAnalyses.set(bandName, analysis);
        }

        // Step 3: Determine primary band (highest average probability on voiced frames)
        const primaryBand = this.determinePrimaryBand(bandAnalyses);

        return {
            primaryBand,
            bandAnalyses,
            combinedMelody: null, // Populated by melody contour analysis (Phase 1.5)
            bandsUsed: [...this.config.bands],
            metadata: {
                duration,
                effectiveSampleRate: sampleRate,
                framesPerBand: bandAnalyses.get('low')?.results.length ?? 0,
            },
        };
    }

    /**
     * Analyze pitch using pre-filtered band signals
     *
     * Use this method when you have already applied band-pass filtering (e.g., from
     * a previous MultiBandAnalyzer run) to avoid redundant filtering operations.
     *
     * This is more efficient than `analyze()` when the filtering has already been done
     * for rhythm generation or other analysis purposes.
     *
     * @param preFilteredBands - Array of pre-filtered band signals with their sample rates
     * @param config - Configuration including duration (required for metadata)
     * @returns Multi-band pitch analysis result
     *
     * @example
     * ```typescript
     * // After running MultiBandAnalyzer for rhythm generation
     * const rhythmAnalyzer = new MultiBandAnalyzer();
     * const rhythmResult = rhythmAnalyzer.analyze(audioBuffer);
     *
     * // Get pre-filtered signals from the rhythm analyzer
     * const preFilteredBands = rhythmAnalyzer.getFilteredSignals();
     *
     * // Use pre-filtered signals for pitch analysis (avoids redundant filtering)
     * const pitchAnalyzer = new MultiBandPitchAnalyzer();
     * const pitchResult = pitchAnalyzer.analyzePreFiltered(preFilteredBands, {
     *   duration: audioBuffer.duration,
     * });
     * ```
     */
    analyzePreFiltered(
        preFilteredBands: PreFilteredBandInput[],
        config: PreFilteredAnalysisConfig
    ): MultiBandPitchAnalysis {
        if (preFilteredBands.length === 0) {
            throw new Error('At least one pre-filtered band must be provided');
        }

        const duration = config.duration;
        const bandAnalyses = new Map<BandName, BandPitchAnalysis>();
        let effectiveSampleRate = 44100;

        for (const preFiltered of preFilteredBands) {
            const bandName = preFiltered.band;
            const band = this.config.bands.find(b => b.name === bandName);

            if (!band) {
                throw new Error(`Unknown band: ${bandName}. Expected one of: ${this.config.bands.map(b => b.name).join(', ')}`);
            }

            effectiveSampleRate = preFiltered.sampleRate;
            const analysis = this.analyzePreFilteredBand(preFiltered, band, duration);
            bandAnalyses.set(bandName, analysis);
        }

        // Determine primary band (highest average probability on voiced frames)
        const primaryBand = this.determinePrimaryBand(bandAnalyses);

        return {
            primaryBand,
            bandAnalyses,
            combinedMelody: null, // Populated by melody contour analysis (Phase 1.5)
            bandsUsed: [...this.config.bands],
            metadata: {
                duration,
                effectiveSampleRate,
                framesPerBand: bandAnalyses.values().next().value?.results.length ?? 0,
            },
        };
    }

    /**
     * Analyze a single frequency band
     *
     * Applies band-pass filter and runs pitch detection.
     */
    private analyzeBand(
        signal: Float32Array,
        bandName: BandName,
        band: FrequencyBand,
        sampleRate: number,
        duration: number
    ): BandPitchAnalysis {
        // Apply band-pass filter for this band using the same infrastructure as rhythm generation
        const filteredSignal = applyFrequencyBand(signal, bandName, sampleRate);

        // Get the pitch detector for this band
        const detector = this.pitchDetectors.get(bandName);
        if (!detector) {
            throw new Error(`No pitch detector found for band: ${bandName}`);
        }

        // Create a mock AudioBuffer from the filtered signal
        // PitchDetector expects an AudioBuffer, so we create a compatible object
        const filteredBuffer = this.createAudioBuffer(filteredSignal, sampleRate);

        // Run pitch detection on the filtered signal
        const results = detector.detect(filteredBuffer);

        // Calculate statistics
        const voicedResults = results.filter(r => r.isVoiced);
        const avgProbability = voicedResults.length > 0
            ? voicedResults.reduce((sum, r) => sum + r.probability, 0) / voicedResults.length
            : 0;

        return {
            band: bandName,
            frequencyRange: {
                lowHz: band.lowHz,
                highHz: band.highHz,
            },
            results,
            avgProbability,
            voicedFrameCount: voicedResults.length,
            totalFrameCount: results.length,
        };
    }

    /**
     * Analyze a single pre-filtered frequency band
     *
     * Runs pitch detection on a signal that has already been band-pass filtered.
     * This avoids redundant filtering when the filtering has already been done
     * (e.g., by MultiBandAnalyzer for rhythm generation).
     */
    private analyzePreFilteredBand(
        preFiltered: PreFilteredBandInput,
        band: FrequencyBand,
        duration: number
    ): BandPitchAnalysis {
        const { signal, sampleRate, band: bandName } = preFiltered;

        // Get the pitch detector for this band
        const detector = this.pitchDetectors.get(bandName);
        if (!detector) {
            throw new Error(`No pitch detector found for band: ${bandName}`);
        }

        // Create a mock AudioBuffer from the pre-filtered signal
        // PitchDetector expects an AudioBuffer, so we create a compatible object
        const filteredBuffer = this.createAudioBuffer(signal, sampleRate);

        // Run pitch detection on the pre-filtered signal
        const results = detector.detect(filteredBuffer);

        // Calculate statistics
        const voicedResults = results.filter(r => r.isVoiced);
        const avgProbability = voicedResults.length > 0
            ? voicedResults.reduce((sum, r) => sum + r.probability, 0) / voicedResults.length
            : 0;

        return {
            band: bandName,
            frequencyRange: {
                lowHz: band.lowHz,
                highHz: band.highHz,
            },
            results,
            avgProbability,
            voicedFrameCount: voicedResults.length,
            totalFrameCount: results.length,
        };
    }

    /**
     * Create a mock AudioBuffer from a Float32Array
     *
     * This allows us to use PitchDetector with filtered signals.
     */
    private createAudioBuffer(data: Float32Array, sampleRate: number): AudioBuffer {
        return {
            length: data.length,
            duration: data.length / sampleRate,
            sampleRate,
            numberOfChannels: 1,
            getChannelData: (channel: number) => data,
        } as unknown as AudioBuffer;
    }

    /**
     * Determine which band has the best pitch results
     *
     * Primary band is determined by:
     * 1. Highest average probability on voiced frames
     * 2. If no voiced frames, prefer the band with the most potential (mid range)
     */
    private determinePrimaryBand(bandAnalyses: Map<BandName, BandPitchAnalysis>): BandName {
        let bestBand: BandName = 'mid'; // Default to mid (vocals, melody)
        let bestScore = -1;

        for (const [bandName, analysis] of bandAnalyses) {
            // Score combines average probability and voiced frame ratio
            // This ensures bands with consistent pitch detection score higher
            const voicedRatio = analysis.totalFrameCount > 0
                ? analysis.voicedFrameCount / analysis.totalFrameCount
                : 0;

            // Weighted score: probability is primary, but voiced ratio helps break ties
            const score = analysis.avgProbability * 0.7 + voicedRatio * 0.3;

            if (score > bestScore) {
                bestScore = score;
                bestBand = bandName;
            }
        }

        return bestBand;
    }

    /**
     * Get pitch results for a specific band
     *
     * Convenience method for accessing results by band name.
     *
     * @param analysis - The multi-band analysis result
     * @param band - Band name to get results for
     * @returns Band pitch analysis for the specified band, or undefined if not found
     */
    getBandResults(analysis: MultiBandPitchAnalysis, band: BandName): BandPitchAnalysis | undefined {
        return analysis.bandAnalyses.get(band);
    }

    /**
     * Get all voiced pitch results across all bands
     *
     * Returns a combined array of all voiced pitch results, tagged with their band.
     *
     * @param analysis - The multi-band analysis result
     * @returns Array of voiced pitch results with band information
     */
    getAllVoicedResults(analysis: MultiBandPitchAnalysis): Array<PitchResult & { band: BandName }> {
        const results: Array<PitchResult & { band: BandName }> = [];

        for (const [bandName, bandAnalysis] of analysis.bandAnalyses) {
            for (const result of bandAnalysis.results) {
                if (result.isVoiced) {
                    results.push({ ...result, band: bandName });
                }
            }
        }

        // Sort by timestamp
        results.sort((a, b) => a.timestamp - b.timestamp);

        return results;
    }

    /**
     * Get pitch results from the primary band only
     *
     * The primary band is the one with the highest average pitch probability.
     * Use this method when button generation needs the most reliable pitch data.
     *
     * This is the recommended method for button mapping as it provides the
     * highest-quality pitch information.
     *
     * @param analysis - The multi-band analysis result
     * @returns Array of voiced pitch results from the primary band, or empty array if none
     *
     * @example
     * ```typescript
     * const result = analyzer.analyze(audioBuffer);
     *
     * // Get pitches from the best band for button mapping
     * const primaryPitches = analyzer.getPrimaryBandPitches(result);
     * console.log(`Using ${result.primaryBand} band with ${primaryPitches.length} voiced pitches`);
     * ```
     */
    getPrimaryBandPitches(analysis: MultiBandPitchAnalysis): Array<PitchResult & { band: BandName }> {
        const primaryAnalysis = analysis.bandAnalyses.get(analysis.primaryBand);

        if (!primaryAnalysis) {
            return [];
        }

        return primaryAnalysis.results
            .filter(r => r.isVoiced)
            .map(r => ({ ...r, band: analysis.primaryBand }));
    }

    /**
     * Get all pitch results from the primary band (including unvoiced)
     *
     * Unlike `getPrimaryBandPitches()`, this returns ALL pitch frames from the
     * primary band, including frames where no pitch was detected (unvoiced).
     * Useful when you need to know about silence/gaps in the melody.
     *
     * @param analysis - The multi-band analysis result
     * @returns Array of all pitch results from the primary band
     */
    getPrimaryBandAllResults(analysis: MultiBandPitchAnalysis): Array<PitchResult & { band: BandName }> {
        const primaryAnalysis = analysis.bandAnalyses.get(analysis.primaryBand);

        if (!primaryAnalysis) {
            return [];
        }

        return primaryAnalysis.results.map(r => ({ ...r, band: analysis.primaryBand }));
    }
}
