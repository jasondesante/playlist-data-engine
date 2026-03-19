/**
 * Phrase Analyzer for Procedural Rhythm Generation
 *
 * Analyzes quantized rhythm streams to detect duplicate multi-beat phrases.
 * These detected phrases form a song-specific pattern library used for:
 * - Density enhancement (prefer inserting detected patterns over interpolation)
 * - Pitch detection integration (via sourceBand and timestamps)
 *
 * Part of the Procedural Rhythm Generation pipeline - Phase 2.1
 */

import type { GeneratedBeat, GeneratedRhythmMap, GridType } from './RhythmQuantizer.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A single occurrence of a rhythmic phrase within the song
 */
export interface PhraseOccurrence {
    /** Index into UnifiedBeatMap.beats[] where this occurrence starts */
    beatIndex: number;

    /** Start time in seconds (for pitch analysis reference) */
    startTimestamp: number;

    /** End time in seconds (for pitch analysis reference) */
    endTimestamp: number;
}

/**
 * A detected rhythmic phrase with all its occurrences
 */
export interface RhythmicPhrase {
    /** Unique identifier for this phrase (hash of pattern) */
    id: string;

    /** The actual rhythm pattern (array of GeneratedBeat, relative to phrase start) */
    pattern: GeneratedBeat[];

    /** Size in beats: 1, 2, 4, or 8 */
    sizeInBeats: number;

    /** Which frequency band this phrase was detected in */
    sourceBand: 'low' | 'mid' | 'high';

    /** All locations where this pattern occurs */
    occurrences: PhraseOccurrence[];

    /** Weighted significance score (larger size + more occurrences = higher) */
    significance: number;

    /** Whether the pattern has rhythmic variation (excludes straight quarters/eighths) */
    hasVariation: boolean;

    /** Whether this phrase can be inserted elsewhere for density enhancement */
    availableForReuse: boolean;
}

/**
 * Result of phrase analysis for a single band
 */
export interface BandPhraseAnalysis {
    /** Band name */
    band: 'low' | 'mid' | 'high';

    /** All phrases detected in this band */
    phrases: RhythmicPhrase[];

    /** Phrases grouped by size (1, 2, 4, 8 beats) */
    phrasesBySize: Map<number, RhythmicPhrase[]>;

    /** Phrases that have variation (excludes straight quarters/eighths) */
    phrasesWithVariation: RhythmicPhrase[];
}

/**
 * Complete phrase analysis result for all bands
 */
export interface PhraseAnalysisResult {
    /** All phrases across all bands */
    phrases: RhythmicPhrase[];

    /** Phrases grouped by source band */
    phrasesByBand: Map<'low' | 'mid' | 'high', RhythmicPhrase[]>;

    /** Top N phrases by significance score */
    mostSignificantPhrases: RhythmicPhrase[];

    /** Phrases grouped by size (1, 2, 4, 8 beats) */
    phrasesBySize: Map<number, RhythmicPhrase[]>;

    /** Phrases available for density enhancement (hasVariation && availableForReuse) */
    patternLibrary: RhythmicPhrase[];

    /** Per-band analysis details */
    bandAnalysis: {
        low: BandPhraseAnalysis;
        mid: BandPhraseAnalysis;
        high: BandPhraseAnalysis;
    };
}

/**
 * Configuration for phrase analysis
 */
export interface PhraseAnalyzerConfig {
    /** Phrase sizes to check (in beats). Default: [1, 2, 4, 8] */
    phraseSizes: number[];

    /** Minimum number of occurrences for a phrase to be considered significant. Default: 2 */
    minOccurrences: number;

    /** Number of top significant phrases to include in mostSignificantPhrases. Default: 10 */
    topSignificantCount: number;

    /** Whether to include phrases without variation in results. Default: false */
    includePhrasesWithoutVariation: boolean;
}

/**
 * Internal structure for tracking phrase candidates during detection
 */
interface PhraseCandidate {
    /** Hash of the pattern */
    hash: string;

    /** The normalized pattern (beatIndex reset to 0) */
    pattern: GeneratedBeat[];

    /** Size in beats */
    sizeInBeats: number;

    /** Starting beat index of this occurrence */
    startBeatIndex: number;

    /** Start timestamp */
    startTimestamp: number;

    /** End timestamp */
    endTimestamp: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_PHRASE_ANALYZER_CONFIG: PhraseAnalyzerConfig = {
    phraseSizes: [1, 2, 4, 8],
    minOccurrences: 2,
    topSignificantCount: 10,
    includePhrasesWithoutVariation: false,
};

// ============================================================================
// PhraseAnalyzer Class
// ============================================================================

/**
 * Analyzes quantized rhythm streams to detect duplicate multi-beat phrases.
 *
 * ## Algorithm Overview
 *
 * 1. For each band (low/mid/high) and each phrase size (1/2/4/8 beats):
 *    - Extract all phrases of that size from the stream
 *    - Normalize the phrases (reset beatIndex to 0, preserve gridPosition)
 *    - Create a hash of each normalized pattern
 *    - Group identical patterns by hash
 *
 * 2. Filter out uninteresting patterns:
 *    - Straight quarter notes (single note at gridPosition 0, straight_16th)
 *    - Straight eighth notes (notes at gridPosition 0 and 2 only, straight_16th)
 *
 * 3. Calculate significance scores:
 *    - Larger phrases are more significant (8-beat > 1-beat)
 *    - More occurrences increases significance
 *    - Significance = sizeWeight * occurrenceWeight
 *
 * 4. Build pattern library for density enhancement
 *
 * ## Usage
 *
 * ```typescript
 * const analyzer = new PhraseAnalyzer();
 * const result = analyzer.analyze(quantizedStreams);
 *
 * // Access pattern library for density enhancement
 * const patterns = result.patternLibrary;
 *
 * // Find phrases for a specific band
 * const lowBandPhrases = result.phrasesByBand.get('low');
 *
 * // Get top significant phrases
 * const topPhrases = result.mostSignificantPhrases;
 * ```
 */
export class PhraseAnalyzer {
    private config: PhraseAnalyzerConfig;

    constructor(config: Partial<PhraseAnalyzerConfig> = {}) {
        this.config = { ...DEFAULT_PHRASE_ANALYZER_CONFIG, ...config };
    }

    /**
     * Analyze quantized band streams for rhythmic phrases
     *
     * @param streams - Quantized band streams from RhythmQuantizer
     * @returns Complete phrase analysis result
     */
    analyze(streams: {
        low: GeneratedRhythmMap;
        mid: GeneratedRhythmMap;
        high: GeneratedRhythmMap;
    }): PhraseAnalysisResult {
        const bandAnalysis = {
            low: this.analyzeBand(streams.low, 'low'),
            mid: this.analyzeBand(streams.mid, 'mid'),
            high: this.analyzeBand(streams.high, 'high'),
        };

        // Combine all phrases
        const allPhrases: RhythmicPhrase[] = [
            ...bandAnalysis.low.phrases,
            ...bandAnalysis.mid.phrases,
            ...bandAnalysis.high.phrases,
        ];

        // Build phrasesByBand map
        const phrasesByBand = new Map<'low' | 'mid' | 'high', RhythmicPhrase[]>();
        phrasesByBand.set('low', bandAnalysis.low.phrases);
        phrasesByBand.set('mid', bandAnalysis.mid.phrases);
        phrasesByBand.set('high', bandAnalysis.high.phrases);

        // Build phrasesBySize map (across all bands)
        const phrasesBySize = new Map<number, RhythmicPhrase[]>();
        for (const size of this.config.phraseSizes) {
            const phrasesOfSize = allPhrases.filter(p => p.sizeInBeats === size);
            if (phrasesOfSize.length > 0) {
                phrasesBySize.set(size, phrasesOfSize);
            }
        }

        // Get most significant phrases (sorted by significance, take top N)
        const sortedBySignificance = [...allPhrases].sort((a, b) => b.significance - a.significance);
        const mostSignificantPhrases = sortedBySignificance.slice(0, this.config.topSignificantCount);

        // Build pattern library (phrases with variation, available for reuse)
        const patternLibrary = allPhrases.filter(p => p.hasVariation && p.availableForReuse);

        return {
            phrases: allPhrases,
            phrasesByBand,
            mostSignificantPhrases,
            phrasesBySize,
            patternLibrary,
            bandAnalysis,
        };
    }

    /**
     * Analyze a single band for phrases
     */
    private analyzeBand(rhythmMap: GeneratedRhythmMap, band: 'low' | 'mid' | 'high'): BandPhraseAnalysis {
        // Find the maximum beat index
        const maxBeatIndex = Math.max(...rhythmMap.beats.map(b => b.beatIndex), 0);

        // Collect all phrase candidates
        const candidatesByHash = new Map<string, PhraseCandidate[]>();

        for (const sizeInBeats of this.config.phraseSizes) {
            // For each possible starting position
            for (let startBeat = 0; startBeat <= maxBeatIndex - sizeInBeats + 1; startBeat++) {
                const candidate = this.extractPhraseCandidate(rhythmMap, startBeat, sizeInBeats, band);
                if (candidate) {
                    const existing = candidatesByHash.get(candidate.hash);
                    if (existing) {
                        existing.push(candidate);
                    } else {
                        candidatesByHash.set(candidate.hash, [candidate]);
                    }
                }
            }
        }

        // Convert candidates to RhythmicPhrase objects
        const phrases: RhythmicPhrase[] = [];

        for (const [hash, candidates] of candidatesByHash) {
            // Skip phrases with fewer than minimum occurrences
            if (candidates.length < this.config.minOccurrences) {
                continue;
            }

            // Use the first candidate as the pattern template
            const template = candidates[0];

            // Check if the pattern has variation
            const hasVariation = this.hasPatternVariation(template.pattern, template.sizeInBeats);

            // Skip uninteresting patterns unless configured to include them
            if (!hasVariation && !this.config.includePhrasesWithoutVariation) {
                continue;
            }

            // Build occurrences list
            const occurrences: PhraseOccurrence[] = candidates.map(c => ({
                beatIndex: c.startBeatIndex,
                startTimestamp: c.startTimestamp,
                endTimestamp: c.endTimestamp,
            }));

            // Calculate significance score
            const significance = this.calculateSignificance(template.sizeInBeats, candidates.length);

            // Determine if available for reuse (has variation and enough occurrences)
            const availableForReuse = hasVariation && candidates.length >= this.config.minOccurrences;

            phrases.push({
                id: hash,
                pattern: template.pattern,
                sizeInBeats: template.sizeInBeats,
                sourceBand: band,
                occurrences,
                significance,
                hasVariation,
                availableForReuse,
            });
        }

        // Sort phrases by significance
        phrases.sort((a, b) => b.significance - a.significance);

        // Build phrasesBySize map
        const phrasesBySize = new Map<number, RhythmicPhrase[]>();
        for (const size of this.config.phraseSizes) {
            const phrasesOfSize = phrases.filter(p => p.sizeInBeats === size);
            if (phrasesOfSize.length > 0) {
                phrasesBySize.set(size, phrasesOfSize);
            }
        }

        // Get phrases with variation
        const phrasesWithVariation = phrases.filter(p => p.hasVariation);

        return {
            band,
            phrases,
            phrasesBySize,
            phrasesWithVariation,
        };
    }

    /**
     * Extract a phrase candidate starting at a given beat index
     */
    private extractPhraseCandidate(
        rhythmMap: GeneratedRhythmMap,
        startBeatIndex: number,
        sizeInBeats: number,
        band: 'low' | 'mid' | 'high'
    ): PhraseCandidate | null {
        const endBeatIndex = startBeatIndex + sizeInBeats - 1;

        // Find all beats within this phrase range
        const phraseBeats = rhythmMap.beats.filter(
            b => b.beatIndex >= startBeatIndex && b.beatIndex <= endBeatIndex
        );

        // If no beats in this range, skip
        if (phraseBeats.length === 0) {
            return null;
        }

        // Normalize the pattern (reset beatIndex to be relative to start)
        const normalizedPattern: GeneratedBeat[] = phraseBeats.map(b => ({
            ...b,
            beatIndex: b.beatIndex - startBeatIndex,
        }));

        // Create hash of the normalized pattern
        const hash = this.hashPattern(normalizedPattern, sizeInBeats);

        // Calculate timestamps
        const startTimestamp = Math.min(...phraseBeats.map(b => b.timestamp));
        const endTimestamp = Math.max(...phraseBeats.map(b => b.timestamp));

        return {
            hash,
            pattern: normalizedPattern,
            sizeInBeats,
            startBeatIndex,
            startTimestamp,
            endTimestamp,
        };
    }

    /**
     * Create a hash of a pattern for comparison
     *
     * The hash includes:
     * - Beat indices (relative to phrase start)
     * - Grid positions
     * - Grid types
     *
     * NOTE: Intensity is deliberately excluded from the hash. Identical rhythms
     * with different intensities should be recognized as the same pattern.
     * Intensity varies naturally between occurrences of the same rhythm.
     */
    private hashPattern(pattern: GeneratedBeat[], sizeInBeats: number): string {
        // Sort by beatIndex, then gridPosition for consistent hashing
        const sorted = [...pattern].sort((a, b) => {
            if (a.beatIndex !== b.beatIndex) return a.beatIndex - b.beatIndex;
            return a.gridPosition - b.gridPosition;
        });

        // Create a string representation (intensity excluded - same rhythm = same pattern)
        const parts = sorted.map(b =>
            `${b.beatIndex}:${b.gridPosition}:${b.gridType}`
        );

        return `phrase_${sizeInBeats}_${parts.join('|')}`;
    }

    /**
     * Check if a pattern has rhythmic variation
     *
     * Uninteresting patterns (excluded):
     * - Straight quarter notes: single note at beat 0, gridPosition 0, straight_16th
     * - Straight eighth notes: notes at gridPosition 0 and 2 only, straight_16th
     *
     * Interesting patterns (included):
     * - Any pattern with gridPosition 1 or 3 (16th note subdivisions)
     * - Any pattern with triplet grid
     * - Any pattern with varying intensity
     * - Any syncopated pattern
     */
    private hasPatternVariation(pattern: GeneratedBeat[], sizeInBeats: number): boolean {
        if (pattern.length === 0) {
            return false;
        }

        // Check for triplet grid - always interesting
        if (pattern.some(b => b.gridType === 'triplet_8th')) {
            return true;
        }

        // Check for 16th note subdivisions (gridPosition 1 or 3)
        if (pattern.some(b => b.gridPosition === 1 || b.gridPosition === 3)) {
            return true;
        }

        // Check for intensity variation (more than 10% difference)
        const intensities = pattern.map(b => b.intensity);
        const maxIntensity = Math.max(...intensities);
        const minIntensity = Math.min(...intensities);
        if (maxIntensity - minIntensity > 0.1) {
            return true;
        }

        // Check if pattern is "straight quarter notes"
        // This means: exactly one note per beat, always at gridPosition 0
        if (pattern.length === sizeInBeats) {
            const allOnBeat = pattern.every(b => b.gridPosition === 0);
            if (allOnBeat) {
                // This is straight quarter notes - NOT interesting
                return false;
            }
        }

        // Check if pattern is "straight eighth notes"
        // This means: notes only at gridPosition 0 and 2, in a regular pattern
        const gridPositions = new Set(pattern.map(b => b.gridPosition));
        if (gridPositions.size === 2 && gridPositions.has(0) && gridPositions.has(2)) {
            // Check if it's a regular pattern (every beat has 2 notes)
            const beatsWithTwoNotes = this.countBeatsWithNoteCount(pattern, 2);
            if (beatsWithTwoNotes === sizeInBeats) {
                // This is straight eighth notes - NOT interesting
                return false;
            }
        }

        // Any other pattern is considered to have variation
        return true;
    }

    /**
     * Count how many beats have exactly the specified note count
     */
    private countBeatsWithNoteCount(pattern: GeneratedBeat[], noteCount: number): number {
        const beatCounts = new Map<number, number>();

        for (const beat of pattern) {
            const count = beatCounts.get(beat.beatIndex) ?? 0;
            beatCounts.set(beat.beatIndex, count + 1);
        }

        let beatsWithCount = 0;
        for (const count of beatCounts.values()) {
            if (count === noteCount) {
                beatsWithCount++;
            }
        }

        return beatsWithCount;
    }

    /**
     * Calculate significance score for a phrase
     *
     * Significance is weighted by:
     * - Size: Larger phrases are more significant (8-beat > 1-beat)
     * - Occurrences: More occurrences increases significance
     *
     * Formula: significance = sizeWeight * occurrenceWeight
     * - sizeWeight = sizeInBeats (linear weight)
     * - occurrenceWeight = log2(occurrences) (logarithmic to avoid over-weighting)
     */
    private calculateSignificance(sizeInBeats: number, occurrences: number): number {
        const sizeWeight = sizeInBeats;
        const occurrenceWeight = Math.log2(occurrences + 1); // +1 to handle single occurrence
        return sizeWeight * occurrenceWeight;
    }
}
