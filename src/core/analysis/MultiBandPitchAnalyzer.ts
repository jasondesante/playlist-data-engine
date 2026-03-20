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
            bandsUsed: [...this.config.bands],
            metadata: {
                duration,
                effectiveSampleRate: sampleRate,
                framesPerBand: bandAnalyses.get('low')?.results.length ?? 0,
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
}
