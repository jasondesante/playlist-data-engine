/**
 * Beat Interpolator
 *
 * Post-processing pass that runs AFTER BeatMap generation to fill gaps
 * where detected beats are missing. Uses dense section priority to determine
 * the quarter note interval, then generates interpolated beats using the
 * Adaptive Phase-Locked Grid algorithm.
 *
 * The Adaptive Phase-Locked approach uses anchor points (detected beats) to
 * track tempo drift and maintain phase alignment throughout the track.
 *
 * @example
 * ```typescript
 * const interpolator = new BeatInterpolator({
 *   minAnchorConfidence: 0.3,
 *   gridSnapTolerance: 0.05,
 * });
 *
 * const interpolatedBeatMap = interpolator.interpolate(beatMap);
 *
 * // Access original detected beats
 * console.log(interpolatedBeatMap.detectedBeats.length);
 *
 * // Access merged beats (interpolated + detected override)
 * console.log(interpolatedBeatMap.mergedBeats.length);
 * ```
 */

import type {
    Beat,
    BeatMap,
    BeatWithSource,
    BeatInterpolationOptions,
    InterpolatedBeatMap,
    QuarterNoteDetection,
    GapAnalysis,
    InterpolationMetadata,
    InterpolatedBeatMapJSON,
    BeatWithSourceJSON,
    QuarterNoteDetectionJSON,
    GapAnalysisJSON,
    InterpolationMetadataJSON,
    DownbeatConfig,
    DownbeatSegment,
} from '../../types/BeatMap.js';
import {
    DEFAULT_BEAT_INTERPOLATION_OPTIONS,
    DEFAULT_DOWNBEAT_CONFIG,
} from '../../types/BeatMap.js';
import { Logger } from '../../../utils/logger.js';

const logger = Logger.for('BeatInterpolator');

/**
 * Internal structure for dense section information
 */
interface DenseSection {
    startIndex: number;
    endIndex: number;
    beatCount: number;
    avgInterval: number;
    intervalVariance: number;
}

/**
 * Internal structure for interval with metadata
 */
interface WeightedInterval {
    intervalSeconds: number;
    weight: number;
    beatIndex: number;
    isFromDenseSection: boolean;
    confidence: number;
}

/**
 * Internal structure for grid beat during generation
 */
interface GridBeat {
    timestamp: number;
    isDetected: boolean;
    detectedBeat?: Beat;
    confidence: number;
}

/**
 * Result of drift-based interpolation
 *
 * Used by the crossing paths strategy to measure how tempo evolves
 * when interpolating through connecting beats between clusters.
 */
interface DriftInterpolationResult {
    /** Tempo (interval in seconds) at the end of interpolation */
    finalInterval: number;

    /** Generated beat timestamps */
    beatPositions: number[];

    /** Accumulated phase offset from the original grid */
    phaseError: number;

    /** The timestamp where interpolation ended */
    endTimestamp: number;
}

/**
 * Beat Interpolator
 *
 * Generates interpolated beats to fill gaps in detected beat maps using
 * the Pace + Anchors model with dense section priority.
 */
export class BeatInterpolator {
    private options: Required<BeatInterpolationOptions>;

    /**
     * Create a new BeatInterpolator
     *
     * @param options - Configuration options (all optional, defaults provided)
     */
    constructor(options: BeatInterpolationOptions = {}) {
        this.options = { ...DEFAULT_BEAT_INTERPOLATION_OPTIONS, ...options };
    }

    /**
     * Get the current configuration
     *
     * @returns The current configuration
     */
    getConfig(): Required<BeatInterpolationOptions> {
        return { ...this.options };
    }

    /**
     * Interpolate beats in a BeatMap
     *
     * Main entry point that orchestrates the interpolation process:
     * 1. Detect quarter note interval using dense section priority
     * 2. Analyze gaps between detected beats
     * 3. Generate beat grid using selected algorithm
     * 4. Merge detected beats with interpolated beats
     *
     * @param beatMap - The beat map to interpolate
     * @returns Interpolated beat map with two output streams
     */
    interpolate(beatMap: BeatMap): InterpolatedBeatMap {
        const { beats, audioId, duration, metadata, bpm, downbeatConfig } = beatMap;

        logger.debug('Starting beat interpolation', {
            audioId,
            detectedBeats: beats.length,
            duration,
            originalBpm: bpm,
        });

        // Edge case: no beats
        if (beats.length === 0) {
            logger.warn('No beats to interpolate');
            return this.createEmptyInterpolatedBeatMap(beatMap);
        }

        // Edge case: single beat
        if (beats.length === 1) {
            logger.warn('Only one beat, cannot determine quarter note');
            return this.createSingleBeatInterpolatedBeatMap(beatMap);
        }

        // Step 1: Detect quarter note using dense section priority
        const quarterNote = this.detectQuarterNote(beats);

        logger.debug('Quarter note detected', {
            intervalSeconds: quarterNote.intervalSeconds,
            bpm: quarterNote.bpm,
            confidence: quarterNote.confidence,
            method: quarterNote.method,
            denseSectionCount: quarterNote.denseSectionCount,
        });

        // Step 2: Analyze gaps between beats
        const gapAnalysis = this.analyzeGaps(beats, quarterNote.intervalSeconds);

        logger.debug('Gap analysis complete', {
            totalGaps: gapAnalysis.totalGaps,
            halfNoteGaps: gapAnalysis.halfNoteGaps,
            anomalies: gapAnalysis.anomalies.length,
            gridAlignmentScore: gapAnalysis.gridAlignmentScore,
        });

        // Step 3: Generate beat grid using selected algorithm
        const gridBeats = this.generateGrid(beatMap, quarterNote, gapAnalysis);

        // Step 4: Merge detected beats with grid
        const mergedBeats = this.mergeBeats(beats, gridBeats, downbeatConfig);

        // Calculate statistics
        const interpolatedCount = mergedBeats.filter(b => b.source === 'interpolated').length;
        const avgInterpolatedConfidence = interpolatedCount > 0
            ? mergedBeats
                .filter(b => b.source === 'interpolated')
                .reduce((sum, b) => sum + b.confidence, 0) / interpolatedCount
            : 0;

        // Calculate tempo drift ratio
        const tempoDriftRatio = this.calculateTempoDriftRatio(mergedBeats);

        // Assemble interpolation metadata
        const interpolationMetadata: InterpolationMetadata = {
            quarterNoteDetection: quarterNote,
            gapAnalysis,
            detectedBeatCount: beats.length,
            interpolatedBeatCount: interpolatedCount,
            totalBeatCount: mergedBeats.length,
            interpolationRatio: mergedBeats.length > 0
                ? interpolatedCount / mergedBeats.length
                : 0,
            avgInterpolatedConfidence,
            tempoDriftRatio,
        };

        logger.debug('Interpolation complete', {
            detectedBeats: beats.length,
            interpolatedBeats: interpolatedCount,
            totalBeats: mergedBeats.length,
            interpolationRatio: interpolationMetadata.interpolationRatio.toFixed(2),
        });

        return {
            audioId,
            duration,
            detectedBeats: [...beats], // Original beats unchanged
            mergedBeats,
            quarterNoteInterval: quarterNote.intervalSeconds,
            quarterNoteBpm: quarterNote.bpm,
            quarterNoteConfidence: quarterNote.confidence,
            originalMetadata: metadata,
            interpolationMetadata,
        };
    }

    // ==================== Step 1: Quarter Note Detection ====================

    /**
     * Detect quarter note interval using dense section priority
     *
     * Algorithm:
     * 1. Identify dense sections (consecutive beats at similar intervals)
     * 2. Build weighted histogram of intervals
     * 3. Find primary peak (most weighted interval = quarter note)
     * 4. Calculate confidence based on peak prominence and dense section contribution
     *
     * @param beats - Detected beats to analyze
     * @returns Quarter note detection result
     */
    private detectQuarterNote(beats: Beat[]): QuarterNoteDetection {
        // Step 1: Identify dense sections
        const denseSections = this.identifyDenseSections(beats);

        logger.debug('Identified dense sections', {
            count: denseSections.length,
            totalBeats: denseSections.reduce((sum, s) => sum + s.beatCount, 0),
        });

        // Step 2: Calculate all intervals with weights
        const weightedIntervals = this.calculateWeightedIntervals(beats, denseSections);

        // Step 3: Build histogram and find peaks
        const histogram = this.buildIntervalHistogram(weightedIntervals);
        const peaks = this.findHistogramPeaks(histogram);

        if (peaks.length === 0) {
            // Fallback: use simple average
            const avgInterval = this.calculateAverageInterval(beats);
            return {
                intervalSeconds: avgInterval,
                bpm: 60 / avgInterval,
                confidence: 0.3,
                histogramPeak: 0,
                secondaryPeaks: [],
                method: 'tempo-detector-fallback',
                denseSectionCount: denseSections.length,
                denseSectionBeats: denseSections.reduce((sum, s) => sum + s.beatCount, 0),
            };
        }

        // Primary peak is quarter note
        const primaryPeak = peaks[0];
        const secondaryPeaks = peaks.slice(1, 4).map(p => p.interval);

        // Calculate confidence
        const totalWeight = weightedIntervals.reduce((sum, wi) => sum + wi.weight, 0);
        const peakProminence = totalWeight > 0 ? primaryPeak.weight / totalWeight : 0;
        const denseSectionContribution = denseSections.reduce((sum, s) => sum + s.beatCount, 0) / beats.length;

        // Confidence factors:
        // - Peak prominence (how clear is the winner)
        // - Dense section contribution (how much reliable data we have)
        const confidence = Math.min(1, (peakProminence * 0.6) + (denseSectionContribution * 0.4));

        return {
            intervalSeconds: primaryPeak.interval,
            bpm: 60 / primaryPeak.interval,
            confidence,
            histogramPeak: primaryPeak.weight,
            secondaryPeaks,
            method: 'histogram',
            denseSectionCount: denseSections.length,
            denseSectionBeats: denseSections.reduce((sum, s) => sum + s.beatCount, 0),
        };
    }

    /**
     * Identify dense sections in the beat sequence
     *
     * A dense section is a sequence of consecutive beats (3+ by default)
     * where the intervals between beats are consistent (low variance).
     *
     * @param beats - Beats to analyze
     * @returns Array of dense sections
     */
    private identifyDenseSections(beats: Beat[]): DenseSection[] {
        const minBeats = this.options.denseSectionMinBeats;
        const sections: DenseSection[] = [];

        if (beats.length < minBeats) {
            return sections;
        }

        // Calculate all intervals
        const intervals: number[] = [];
        for (let i = 1; i < beats.length; i++) {
            intervals.push(beats[i].timestamp - beats[i - 1].timestamp);
        }

        // Find consistent sequences
        let sectionStart = 0;
        let currentVariance = 0;

        for (let i = 1; i < intervals.length; i++) {
            // Check if this interval is consistent with the running average
            const sectionIntervals = intervals.slice(sectionStart, i + 1);
            const avg = sectionIntervals.reduce((a, b) => a + b, 0) / sectionIntervals.length;
            const variance = sectionIntervals.reduce((sum, int) => sum + Math.pow(int - avg, 2), 0) / sectionIntervals.length;

            // If variance is too high, end the current section
            // Tolerance: 20% of average interval
            const maxVariance = Math.pow(avg * 0.2, 2);

            if (variance > maxVariance) {
                // Check if we have enough beats for a dense section
                const beatCount = i - sectionStart + 1;
                if (beatCount >= minBeats) {
                    const sectionInts = intervals.slice(sectionStart, i);
                    const sectionAvg = sectionInts.reduce((a, b) => a + b, 0) / sectionInts.length;
                    const sectionVar = sectionInts.reduce((sum, int) => sum + Math.pow(int - sectionAvg, 2), 0) / sectionInts.length;

                    sections.push({
                        startIndex: sectionStart,
                        endIndex: i - 1,
                        beatCount: beatCount,
                        avgInterval: sectionAvg,
                        intervalVariance: sectionVar,
                    });
                }
                sectionStart = i;
                currentVariance = 0;
            } else {
                currentVariance = variance;
            }
        }

        // Handle the last section
        const beatCount = intervals.length - sectionStart + 1;
        if (beatCount >= minBeats) {
            const sectionInts = intervals.slice(sectionStart);
            const sectionAvg = sectionInts.reduce((a, b) => a + b, 0) / sectionInts.length;
            const sectionVar = sectionInts.reduce((sum, int) => sum + Math.pow(int - sectionAvg, 2), 0) / sectionInts.length;

            sections.push({
                startIndex: sectionStart,
                endIndex: intervals.length - 1,
                beatCount,
                avgInterval: sectionAvg,
                intervalVariance: sectionVar,
            });
        }

        return sections;
    }

    /**
     * Calculate weighted intervals between beats
     *
     * Weight factors:
     * - Is the interval from a dense section? (higher weight)
     * - Is the interval consistent with neighbors? (higher weight)
     * - Are the bounding beats high-confidence? (higher weight)
     *
     * @param beats - Beats to analyze
     * @param denseSections - Identified dense sections
     * @returns Array of weighted intervals
     */
    private calculateWeightedIntervals(
        beats: Beat[],
        denseSections: DenseSection[]
    ): WeightedInterval[] {
        const intervals: WeightedInterval[] = [];

        for (let i = 1; i < beats.length; i++) {
            const interval = beats[i].timestamp - beats[i - 1].timestamp;

            // Check if this interval is in a dense section
            const inDenseSection = denseSections.some(
                s => i > s.startIndex && i <= s.endIndex
            );

            // Base weight from beat confidence
            const confidenceWeight = (beats[i - 1].confidence + beats[i].confidence) / 2;

            // Dense section bonus (2x weight)
            const densityWeight = inDenseSection ? 2.0 : 1.0;

            // Consistency weight: check if interval matches neighbors
            let consistencyWeight = 1.0;
            if (i > 1) {
                const prevInterval = beats[i - 1].timestamp - beats[i - 2].timestamp;
                const ratio = Math.min(interval, prevInterval) / Math.max(interval, prevInterval);
                consistencyWeight = 0.5 + (ratio * 0.5); // 0.5 to 1.0
            }
            if (i < beats.length - 1) {
                const nextInterval = beats[i + 1].timestamp - beats[i].timestamp;
                const ratio = Math.min(interval, nextInterval) / Math.max(interval, nextInterval);
                consistencyWeight = Math.max(consistencyWeight, 0.5 + (ratio * 0.5));
            }

            const totalWeight = confidenceWeight * densityWeight * consistencyWeight;

            intervals.push({
                intervalSeconds: interval,
                weight: totalWeight,
                beatIndex: i,
                isFromDenseSection: inDenseSection,
                confidence: confidenceWeight,
            });
        }

        return intervals;
    }

    /**
     * Build a histogram of intervals
     *
     * Uses bucketing to group similar intervals together.
     *
     * @param weightedIntervals - Weighted intervals to histogram
     * @returns Map of interval buckets to total weights
     */
    private buildIntervalHistogram(
        weightedIntervals: WeightedInterval[]
    ): Map<number, number> {
        const histogram = new Map<number, number>();

        // Bucket size: 5ms (0.005 seconds)
        const bucketSize = 0.005;

        for (const wi of weightedIntervals) {
            const bucket = Math.round(wi.intervalSeconds / bucketSize) * bucketSize;
            const current = histogram.get(bucket) || 0;
            histogram.set(bucket, current + wi.weight);
        }

        return histogram;
    }

    /**
     * Find peaks in the interval histogram
     *
     * Returns peaks sorted by weight (descending).
     *
     * @param histogram - Interval histogram
     * @returns Array of peaks with interval and weight
     */
    private findHistogramPeaks(
        histogram: Map<number, number>
    ): Array<{ interval: number; weight: number }> {
        const peaks: Array<{ interval: number; weight: number }> = [];

        // Sort buckets by interval
        const sortedBuckets = Array.from(histogram.entries()).sort((a, b) => a[0] - b[0]);

        // Find local maxima
        for (let i = 0; i < sortedBuckets.length; i++) {
            const [interval, weight] = sortedBuckets[i];

            // Check if this is a local maximum
            const prevWeight = i > 0 ? sortedBuckets[i - 1][1] : 0;
            const nextWeight = i < sortedBuckets.length - 1 ? sortedBuckets[i + 1][1] : 0;

            if (weight >= prevWeight && weight >= nextWeight && weight > 0) {
                peaks.push({ interval, weight });
            }
        }

        // Sort by weight descending
        peaks.sort((a, b) => b.weight - a.weight);

        // Filter out peaks that are too close together (keep the stronger one)
        const minSeparation = 0.05; // 50ms minimum separation
        const filteredPeaks: Array<{ interval: number; weight: number }> = [];

        for (const peak of peaks) {
            const tooClose = filteredPeaks.some(
                p => Math.abs(p.interval - peak.interval) < minSeparation
            );
            if (!tooClose) {
                filteredPeaks.push(peak);
            }
        }

        return filteredPeaks;
    }

    /**
     * Calculate simple average interval (fallback method)
     *
     * @param beats - Beats to analyze
     * @returns Average interval in seconds
     */
    private calculateAverageInterval(beats: Beat[]): number {
        if (beats.length < 2) return 0.5; // Default to 120 BPM

        let totalInterval = 0;
        for (let i = 1; i < beats.length; i++) {
            totalInterval += beats[i].timestamp - beats[i - 1].timestamp;
        }
        return totalInterval / (beats.length - 1);
    }

    // ==================== Step 2: Gap Analysis ====================

    /**
     * Analyze gaps between detected beats
     *
     * Identifies:
     * - Half-note gaps (exactly 2x quarter note)
     * - Anomalies (single unusual intervals)
     * - Grid alignment score
     *
     * @param beats - Beats to analyze
     * @param quarterNote - Detected quarter note interval
     * @returns Gap analysis result
     */
    private analyzeGaps(beats: Beat[], quarterNote: number): GapAnalysis {
        const anomalyThreshold = this.options.anomalyThreshold;

        let halfNoteGaps = 0;
        const anomalies: number[] = [];
        const gapSizes: number[] = [];
        let totalAlignmentError = 0;

        for (let i = 1; i < beats.length; i++) {
            const interval = beats[i].timestamp - beats[i - 1].timestamp;
            const ratio = interval / quarterNote;

            // Track gap sizes in units of quarter notes
            const gapSize = Math.round(ratio);
            if (gapSize > 1) {
                gapSizes.push(gapSize);
            }

            // Check for half-note gap (ratio ≈ 2.0)
            if (Math.abs(ratio - 2.0) < 0.2) {
                halfNoteGaps++;
            }

            // Check for anomaly (unusual single interval)
            // Anomaly if ratio is far from 1.0 and not close to 2.0 or 3.0
            const isAnomaly = ratio < (1 - anomalyThreshold) ||
                (ratio > (1 + anomalyThreshold) &&
                    Math.abs(ratio - 2.0) > 0.3 &&
                    Math.abs(ratio - 3.0) > 0.3 &&
                    Math.abs(ratio - 4.0) > 0.3);

            if (isAnomaly) {
                anomalies.push(i);
            }

            // Calculate grid alignment error
            // How far is this beat from the expected grid position?
            const expectedPosition = Math.round(beats[i].timestamp / quarterNote) * quarterNote;
            const alignmentError = Math.abs(beats[i].timestamp - expectedPosition) / quarterNote;
            totalAlignmentError += alignmentError;
        }

        // Grid alignment score: 1.0 = perfect alignment, 0.0 = no alignment
        const avgAlignmentError = beats.length > 1 ? totalAlignmentError / (beats.length - 1) : 0;
        const gridAlignmentScore = Math.max(0, 1 - (avgAlignmentError * 2));

        const avgGapSize = gapSizes.length > 0
            ? gapSizes.reduce((a, b) => a + b, 0) / gapSizes.length
            : 1.0;

        return {
            totalGaps: gapSizes.length,
            halfNoteGaps,
            anomalies,
            avgGapSize,
            gridAlignmentScore,
        };
    }

    // ==================== Step 3: Grid Generation ====================

    /**
     * Generate beat grid using the selected algorithm
     *
     * Delegates to the appropriate algorithm implementation based on options.
     *
     * @param beatMap - Original beat map
     * @param quarterNote - Quarter note detection
     * @param gapAnalysis - Gap analysis result
     * @returns Array of beats with source information
     */
    private generateGrid(
        beatMap: BeatMap,
        quarterNote: QuarterNoteDetection,
        gapAnalysis: GapAnalysis
    ): BeatWithSource[] {
        // Use adaptive phase-locked approach (sole algorithm after simplification)
        return this.interpolateAdaptivePhaseLocked(beatMap, quarterNote);
    }

    // ==================== Drift Interpolation Helpers ====================

    /**
     * Interpolate forwards from a start anchor through connecting beats with drift
     *
     * Used by the crossing paths strategy to determine how tempo evolves when
     * interpolating from one cluster towards another. Each detected beat encountered
     * can push/pull the tempo based on phase alignment.
     *
     * @param startAnchor - Starting beat timestamp (anchor point)
     * @param initialInterval - Initial tempo as interval in seconds
     * @param connectingBeats - Beats to interpolate through (sorted by timestamp)
     * @param adaptationRate - How quickly tempo adapts (0-1)
     * @param stopAtTimestamp - Optional timestamp to stop interpolation at
     * @returns Drift interpolation result with final tempo and beat positions
     */
    private interpolateForwardsWithDrift(
        startAnchor: number,
        initialInterval: number,
        connectingBeats: Beat[],
        adaptationRate: number,
        stopAtTimestamp?: number
    ): DriftInterpolationResult {
        const beatPositions: number[] = [];
        let currentInterval = initialInterval;
        let currentPhase = startAnchor;

        // Filter beats that are after start anchor and before stop point
        const relevantBeats = connectingBeats.filter(beat => {
            if (beat.timestamp <= startAnchor) return false;
            if (stopAtTimestamp !== undefined && beat.timestamp > stopAtTimestamp) return false;
            return true;
        });

        let lastAnchorTime = startAnchor;

        for (let i = 0; i < relevantBeats.length; i++) {
            const nextAnchor = relevantBeats[i];
            const gapDuration = nextAnchor.timestamp - lastAnchorTime;

            // Calculate expected beats in gap
            const expectedBeats = Math.round(gapDuration / currentInterval);

            if (expectedBeats > 0) {
                // Calculate phase error
                const expectedNextTime = currentPhase + (expectedBeats * currentInterval);
                const phaseError = nextAnchor.timestamp - expectedNextTime;

                // Distribute error across beats with adaptation rate
                const tempoAdjustment = (phaseError / expectedBeats) * adaptationRate;
                currentInterval = currentInterval + tempoAdjustment;

                // Generate interpolated beats
                for (let j = 1; j < expectedBeats; j++) {
                    const time = lastAnchorTime + (j * currentInterval);
                    if (stopAtTimestamp !== undefined && time > stopAtTimestamp) break;
                    beatPositions.push(time);
                }
            }

            // Update phase and anchor for next iteration
            currentPhase = nextAnchor.timestamp;
            lastAnchorTime = nextAnchor.timestamp;
        }

        // Calculate final phase error (difference from ideal grid)
        const idealBeats = beatPositions.length;
        const expectedFinalTime = startAnchor + (idealBeats * initialInterval);
        const phaseError = (beatPositions.length > 0)
            ? beatPositions[beatPositions.length - 1] - expectedFinalTime
            : 0;

        return {
            finalInterval: currentInterval,
            beatPositions,
            phaseError,
            endTimestamp: lastAnchorTime,
        };
    }

    /**
     * Interpolate backwards from an end anchor through connecting beats with drift
     *
     * Used by the crossing paths strategy to determine how tempo evolves when
     * interpolating from one cluster backwards towards another. Each detected beat
     * encountered can push/pull the tempo (in reverse time direction).
     *
     * @param endAnchor - Ending beat timestamp (anchor point)
     * @param initialInterval - Initial tempo as interval in seconds
     * @param connectingBeats - Beats to interpolate through (sorted by timestamp)
     * @param adaptationRate - How quickly tempo adapts (0-1)
     * @param stopAtTimestamp - Optional timestamp to stop interpolation at
     * @returns Drift interpolation result with final tempo and beat positions
     */
    private interpolateBackwardsWithDrift(
        endAnchor: number,
        initialInterval: number,
        connectingBeats: Beat[],
        adaptationRate: number,
        stopAtTimestamp?: number
    ): DriftInterpolationResult {
        const beatPositions: number[] = [];
        let currentInterval = initialInterval;
        let currentPhase = endAnchor;

        // Filter beats that are before end anchor and after stop point
        const relevantBeats = connectingBeats.filter(beat => {
            if (beat.timestamp >= endAnchor) return false;
            if (stopAtTimestamp !== undefined && beat.timestamp < stopAtTimestamp) return false;
            return true;
        }).reverse(); // Process in reverse order

        let lastAnchorTime = endAnchor;

        for (let i = 0; i < relevantBeats.length; i++) {
            const prevAnchor = relevantBeats[i];
            const gapDuration = lastAnchorTime - prevAnchor.timestamp;

            // Calculate expected beats in gap
            const expectedBeats = Math.round(gapDuration / currentInterval);

            if (expectedBeats > 0) {
                // Calculate phase error (working backwards)
                const expectedPrevTime = currentPhase - (expectedBeats * currentInterval);
                const phaseError = prevAnchor.timestamp - expectedPrevTime;

                // Distribute error across beats with adaptation rate
                const tempoAdjustment = (phaseError / expectedBeats) * adaptationRate;
                currentInterval = currentInterval + tempoAdjustment;

                // Generate interpolated beats (backwards)
                for (let j = 1; j < expectedBeats; j++) {
                    const time = lastAnchorTime - (j * currentInterval);
                    if (stopAtTimestamp !== undefined && time < stopAtTimestamp) break;
                    beatPositions.unshift(time); // Add to front since going backwards
                }
            }

            // Update phase and anchor for next iteration
            currentPhase = prevAnchor.timestamp;
            lastAnchorTime = prevAnchor.timestamp;
        }

        // Calculate final phase error (difference from ideal grid)
        const idealBeats = beatPositions.length;
        const expectedStartTime = endAnchor - (idealBeats * initialInterval);
        const phaseError = (beatPositions.length > 0)
            ? beatPositions[0] - expectedStartTime
            : 0;

        return {
            finalInterval: currentInterval,
            beatPositions,
            phaseError,
            endTimestamp: lastAnchorTime,
        };
    }

    /**
     * Approach 2: Adaptive Phase-Locked Grid
     *
     * Handles tempo drift by:
     * 1. Starting with quarter note interval
     * 2. Phase tracking at each detected beat anchor
     * 3. Allowing tempo to drift slightly between anchors
     *
     * @param beatMap - Original beat map
     * @param quarterNote - Quarter note detection
     * @returns Grid beats with source information
     */
    private interpolateAdaptivePhaseLocked(
        beatMap: BeatMap,
        quarterNote: QuarterNoteDetection
    ): BeatWithSource[] {
        const { beats, duration } = beatMap;
        const qn = quarterNote.intervalSeconds;
        const tolerance = this.options.gridSnapTolerance;
        const adaptationRate = this.options.tempoAdaptationRate;

        const gridBeats: BeatWithSource[] = [];

        // Confidence weights
        const gridWeight = this.options.gridAlignmentWeight;
        const anchorWeight = this.options.anchorConfidenceWeight;
        const paceWeight = this.options.paceConfidenceWeight;

        // Extrapolate before first beat
        if (this.options.extrapolateStart) {
            let time = beats[0].timestamp - qn;
            while (time >= 0) {
                const confidence = this.calculateConfidence(gridWeight, anchorWeight * 0.5, paceWeight * quarterNote.confidence);
                gridBeats.unshift(this.createInterpolatedBeat(time, confidence, beats[0].timestamp));
                time -= qn;
            }
        }

        // Process each gap between detected beats
        let currentPhase = beats[0].timestamp;
        let currentTempo = qn;

        for (let i = 0; i < beats.length; i++) {
            const anchor = beats[i];

            // Add the detected beat
            gridBeats.push(this.createDetectedBeat(anchor));

            // If there's a next beat, interpolate to it
            if (i < beats.length - 1) {
                const nextAnchor = beats[i + 1];
                const gapDuration = nextAnchor.timestamp - anchor.timestamp;

                // Calculate expected beats in gap
                const expectedBeats = Math.round(gapDuration / currentTempo);

                // Calculate phase error and adjust tempo
                const expectedNextTime = currentPhase + (expectedBeats * currentTempo);
                const phaseError = nextAnchor.timestamp - expectedNextTime;

                // Distribute error across beats with adaptation rate
                if (expectedBeats > 0) {
                    const tempoAdjustment = (phaseError / expectedBeats) * adaptationRate;
                    currentTempo = currentTempo + tempoAdjustment;
                }

                // Generate interpolated beats
                for (let j = 1; j < expectedBeats; j++) {
                    const time = anchor.timestamp + (j * currentTempo);

                    // Skip if too close to next anchor
                    if (time >= nextAnchor.timestamp - tolerance) break;

                    const confidence = this.calculateConfidence(
                        gridWeight,
                        anchorWeight * ((anchor.confidence + nextAnchor.confidence) / 2),
                        paceWeight * quarterNote.confidence
                    );
                    gridBeats.push(this.createInterpolatedBeat(time, confidence, anchor.timestamp));
                }

                // Update phase for next iteration
                currentPhase = nextAnchor.timestamp;
            }
        }

        // Extrapolate after last beat
        if (this.options.extrapolateEnd) {
            let time = beats[beats.length - 1].timestamp + currentTempo;
            while (time <= duration) {
                const confidence = this.calculateConfidence(gridWeight, anchorWeight * 0.5, paceWeight * quarterNote.confidence);
                gridBeats.push(this.createInterpolatedBeat(time, confidence, beats[beats.length - 1].timestamp));
                time += currentTempo;
            }
        }

        // Sort by timestamp
        gridBeats.sort((a, b) => a.timestamp - b.timestamp);

        return gridBeats;
    }

    // ==================== Step 4: Merge & Output ====================

    /**
     * Merge detected beats with grid beats
     *
     * Detected beats override interpolated beats at the same position.
     *
     * @param detectedBeats - Original detected beats
     * @param gridBeats - Grid beats (interpolated)
     * @param downbeatConfig - Downbeat configuration from the BeatMap
     * @returns Merged beats with source information
     */
    private mergeBeats(
        detectedBeats: Beat[],
        gridBeats: BeatWithSource[],
        downbeatConfig?: DownbeatConfig
    ): BeatWithSource[] {
        const tolerance = this.options.gridSnapTolerance;
        const merged: BeatWithSource[] = [];

        // Sort both by timestamp
        const sortedGrid = [...gridBeats].sort((a, b) => a.timestamp - b.timestamp);
        const sortedDetected = [...detectedBeats].sort((a, b) => a.timestamp - b.timestamp);

        // Build map of detected beats for quick lookup
        const detectedByTime = new Map<number, Beat>();
        for (const beat of sortedDetected) {
            detectedByTime.set(beat.timestamp, beat);
        }

        // Track which detected beats have been used
        const usedDetected = new Set<number>();

        for (const gridBeat of sortedGrid) {
            // Check for detected beat near this position
            const detected = this.findBeatNear(detectedByTime, gridBeat.timestamp, tolerance);

            if (detected && !usedDetected.has(detected.timestamp)) {
                // Use detected beat (override)
                merged.push(this.createDetectedBeat(detected));
                usedDetected.add(detected.timestamp);
            } else if (gridBeat.source === 'interpolated') {
                // Use interpolated beat
                merged.push(gridBeat);
            }
        }

        // Add any detected beats that weren't near any grid position
        for (const detected of sortedDetected) {
            if (!usedDetected.has(detected.timestamp)) {
                merged.push(this.createDetectedBeat(detected));
            }
        }

        // Sort final result
        merged.sort((a, b) => a.timestamp - b.timestamp);

        // Reassign beat positions (beatInMeasure, measureNumber) based on merged sequence
        this.reassignBeatPositions(merged, downbeatConfig);

        return merged;
    }

    /**
     * Reassign beat positions (beatInMeasure, isDownbeat, measureNumber)
     * based on the merged beat sequence using the provided downbeat configuration.
     *
     * Supports multiple segments for time signature changes within a track.
     *
     * IMPORTANT: Measure numbers CONTINUE across segment boundaries.
     * When time signature changes, measure number doesn't reset - it keeps
     * incrementing. Only the beatsPerMeasure changes.
     *
     * @param beats - Merged beats to update
     * @param downbeatConfig - Downbeat configuration from BeatMap (undefined = default)
     */
    private reassignBeatPositions(
        beats: BeatWithSource[],
        downbeatConfig?: DownbeatConfig
    ): void {
        // Use provided config or default
        const config = downbeatConfig ?? DEFAULT_DOWNBEAT_CONFIG;

        // Pre-compute measure offsets for each segment to continue numbering across boundaries
        const measureOffsets = this.computeMeasureOffsets(config.segments, beats.length);

        for (let i = 0; i < beats.length; i++) {
            const beat = beats[i];

            // Find the active segment for this beat
            const segmentIndex = this.findActiveSegmentIndex(config.segments, i);
            const segment = config.segments[segmentIndex];
            const { downbeatBeatIndex, timeSignature } = segment;
            const { beatsPerMeasure } = timeSignature;

            // Calculate position relative to the anchor downbeat
            // Using modulo arithmetic that works bidirectionally
            const distanceFromAnchor = i - downbeatBeatIndex;

            // Calculate position in measure (0 to beatsPerMeasure-1)
            // Handle negative distances correctly for pickup beats
            const beatInMeasure = ((distanceFromAnchor % beatsPerMeasure) + beatsPerMeasure) % beatsPerMeasure;

            // This beat is a downbeat if it's at position 0 in the measure
            const isDownbeat = beatInMeasure === 0;

            // Calculate measure number within this segment
            // Measures before the anchor downbeat will have negative numbers,
            // but we floor to 0 for practical purposes
            const measureInSegment = Math.max(0, Math.floor(distanceFromAnchor / beatsPerMeasure));

            // Add the offset from previous segments to continue numbering
            const measureNumber = measureInSegment + measureOffsets[segmentIndex];

            // Assign calculated values
            beat.beatInMeasure = beatInMeasure;
            beat.isDownbeat = isDownbeat;
            beat.measureNumber = measureNumber;
        }
    }

    /**
     * Compute measure offsets for each segment to continue numbering across boundaries
     *
     * @param segments - Array of downbeat segments (must be ordered by startBeat)
     * @param totalBeats - Total number of beats
     * @returns Array of measure offsets for each segment
     */
    private computeMeasureOffsets(segments: DownbeatSegment[], totalBeats: number): number[] {
        const offsets: number[] = [];

        for (let i = 0; i < segments.length; i++) {
            if (i === 0) {
                offsets.push(0);
            } else {
                // Calculate what measure the previous segment ended at
                const prevSegment = segments[i - 1];
                const { downbeatBeatIndex: prevAnchor, timeSignature: prevTimeSig } = prevSegment;
                const prevBeatsPerMeasure = prevTimeSig.beatsPerMeasure;

                // The previous segment ends at the beat just before this segment starts
                const lastBeatOfPrevSegment = segments[i].startBeat - 1;

                // Calculate the measure number at the end of the previous segment
                const distanceFromAnchor = lastBeatOfPrevSegment - prevAnchor;
                const lastMeasureOfPrevSegment = Math.max(0, Math.floor(distanceFromAnchor / prevBeatsPerMeasure));

                // This segment starts at the next measure number
                offsets.push(lastMeasureOfPrevSegment + 1);
            }
        }

        return offsets;
    }

    /**
     * Find the index of the active segment for a given beat index
     * Segments are contiguous - each covers beats until the next segment starts
     *
     * @param segments - Array of downbeat segments (must be ordered by startBeat)
     * @param beatIndex - The beat index to find the active segment for
     * @returns The index of the active segment
     */
    private findActiveSegmentIndex(
        segments: DownbeatSegment[],
        beatIndex: number
    ): number {
        let activeIndex = 0;
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].startBeat <= beatIndex) {
                activeIndex = i;
            } else {
                break;
            }
        }
        return activeIndex;
    }

    // ==================== Helper Methods ====================

    /**
     * Calculate confidence score from components
     */
    private calculateConfidence(
        gridComponent: number,
        anchorComponent: number,
        paceComponent: number
    ): number {
        return Math.max(0, Math.min(1, gridComponent + anchorComponent + paceComponent));
    }

    /**
     * Create an interpolated beat
     */
    private createInterpolatedBeat(
        timestamp: number,
        confidence: number,
        nearestAnchorTimestamp: number
    ): BeatWithSource {
        return {
            timestamp,
            beatInMeasure: 0, // Will be reassigned in merge
            isDownbeat: false, // Will be reassigned in merge
            measureNumber: 0, // Will be reassigned in merge
            intensity: 0.5, // Default intensity for interpolated beats
            confidence,
            source: 'interpolated',
            distanceToAnchor: Math.abs(timestamp - nearestAnchorTimestamp),
            nearestAnchorTimestamp,
        };
    }

    /**
     * Create a detected beat with source info
     */
    private createDetectedBeat(beat: Beat): BeatWithSource {
        return {
            ...beat,
            source: 'detected',
            distanceToAnchor: 0,
            nearestAnchorTimestamp: beat.timestamp,
        };
    }

    /**
     * Find a beat near a given timestamp within tolerance
     */
    private findBeatNear(
        beatMap: Map<number, Beat>,
        timestamp: number,
        tolerance: number
    ): Beat | null {
        // Check exact match first
        const exact = beatMap.get(timestamp);
        if (exact) return exact;

        // Search within tolerance
        for (const [time, beat] of beatMap) {
            if (Math.abs(time - timestamp) <= tolerance) {
                return beat;
            }
        }

        return null;
    }

    /**
     * Find the nearest anchor beat to a given time
     */
    private findNearestAnchor(
        beats: Beat[],
        time: number,
        startIndex: number
    ): { timestamp: number; confidence: number } {
        // Look at beats before and after
        const before = startIndex >= 0 && startIndex < beats.length
            ? beats[startIndex]
            : beats[0];
        const after = startIndex + 1 < beats.length
            ? beats[startIndex + 1]
            : beats[beats.length - 1];

        const distBefore = Math.abs(time - before.timestamp);
        const distAfter = Math.abs(time - after.timestamp);

        if (distBefore <= distAfter) {
            return { timestamp: before.timestamp, confidence: before.confidence };
        } else {
            return { timestamp: after.timestamp, confidence: after.confidence };
        }
    }

    /**
     * Calculate tempo drift ratio (max local tempo / min local tempo)
     */
    private calculateTempoDriftRatio(beats: BeatWithSource[]): number {
        if (beats.length < 3) return 1.0;

        const localTempos: number[] = [];

        // Calculate local tempo between consecutive beats
        for (let i = 1; i < beats.length; i++) {
            const interval = beats[i].timestamp - beats[i - 1].timestamp;
            if (interval > 0) {
                localTempos.push(60 / interval);
            }
        }

        if (localTempos.length === 0) return 1.0;

        const minTempo = Math.min(...localTempos);
        const maxTempo = Math.max(...localTempos);

        return minTempo > 0 ? maxTempo / minTempo : 1.0;
    }

    /**
     * Create an empty interpolated beat map (edge case)
     */
    private createEmptyInterpolatedBeatMap(beatMap: BeatMap): InterpolatedBeatMap {
        return {
            audioId: beatMap.audioId,
            duration: beatMap.duration,
            detectedBeats: [],
            mergedBeats: [],
            quarterNoteInterval: 0.5, // Default 120 BPM
            quarterNoteBpm: 120,
            quarterNoteConfidence: 0,
            originalMetadata: beatMap.metadata,
            interpolationMetadata: {
                quarterNoteDetection: {
                    intervalSeconds: 0.5,
                    bpm: 120,
                    confidence: 0,
                    histogramPeak: 0,
                    secondaryPeaks: [],
                    method: 'tempo-detector-fallback',
                    denseSectionCount: 0,
                    denseSectionBeats: 0,
                },
                gapAnalysis: {
                    totalGaps: 0,
                    halfNoteGaps: 0,
                    anomalies: [],
                    avgGapSize: 1,
                    gridAlignmentScore: 0,
                },
                detectedBeatCount: 0,
                interpolatedBeatCount: 0,
                totalBeatCount: 0,
                interpolationRatio: 0,
                avgInterpolatedConfidence: 0,
                tempoDriftRatio: 1,
            },
        };
    }

    /**
     * Create a single-beat interpolated beat map (edge case)
     */
    private createSingleBeatInterpolatedBeatMap(beatMap: BeatMap): InterpolatedBeatMap {
        const beat = beatMap.beats[0];
        const detectedBeat: BeatWithSource = {
            ...beat,
            source: 'detected',
            distanceToAnchor: 0,
            nearestAnchorTimestamp: beat.timestamp,
        };

        return {
            audioId: beatMap.audioId,
            duration: beatMap.duration,
            detectedBeats: [beat],
            mergedBeats: [detectedBeat],
            quarterNoteInterval: 0.5, // Default 120 BPM
            quarterNoteBpm: 120,
            quarterNoteConfidence: 0.1,
            originalMetadata: beatMap.metadata,
            interpolationMetadata: {
                quarterNoteDetection: {
                    intervalSeconds: 0.5,
                    bpm: 120,
                    confidence: 0.1,
                    histogramPeak: 0,
                    secondaryPeaks: [],
                    method: 'tempo-detector-fallback',
                    denseSectionCount: 0,
                    denseSectionBeats: 0,
                },
                gapAnalysis: {
                    totalGaps: 0,
                    halfNoteGaps: 0,
                    anomalies: [],
                    avgGapSize: 1,
                    gridAlignmentScore: 0,
                },
                detectedBeatCount: 1,
                interpolatedBeatCount: 0,
                totalBeatCount: 1,
                interpolationRatio: 0,
                avgInterpolatedConfidence: 0,
                tempoDriftRatio: 1,
            },
        };
    }

    // ==================== Static Methods ====================

    /**
     * Convert an InterpolatedBeatMap to JSON string
     *
     * @param interpolatedBeatMap - Interpolated beat map to serialize
     * @returns JSON string
     *
     * @example
     * ```typescript
     * const interpolator = new BeatInterpolator();
     * const interpolatedBeatMap = interpolator.interpolate(beatMap);
     *
     * // Serialize to JSON for storage
     * const json = BeatInterpolator.toJSON(interpolatedBeatMap);
     * localStorage.setItem('beatmap', json);
     * ```
     */
    static toJSON(interpolatedBeatMap: InterpolatedBeatMap): string {
        const json: InterpolatedBeatMapJSON = {
            audioId: interpolatedBeatMap.audioId,
            duration: interpolatedBeatMap.duration,
            detectedBeats: interpolatedBeatMap.detectedBeats.map(beat => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
            })),
            mergedBeats: interpolatedBeatMap.mergedBeats.map(beat => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
                source: beat.source,
                distanceToAnchor: beat.distanceToAnchor,
                nearestAnchorTimestamp: beat.nearestAnchorTimestamp,
            })),
            quarterNoteInterval: interpolatedBeatMap.quarterNoteInterval,
            quarterNoteBpm: interpolatedBeatMap.quarterNoteBpm,
            quarterNoteConfidence: interpolatedBeatMap.quarterNoteConfidence,
            originalMetadata: interpolatedBeatMap.originalMetadata,
            interpolationMetadata: {
                quarterNoteDetection: {
                    intervalSeconds: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.intervalSeconds,
                    bpm: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.bpm,
                    confidence: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.confidence,
                    histogramPeak: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.histogramPeak,
                    secondaryPeaks: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.secondaryPeaks,
                    method: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.method,
                    denseSectionCount: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.denseSectionCount,
                    denseSectionBeats: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.denseSectionBeats,
                },
                gapAnalysis: {
                    totalGaps: interpolatedBeatMap.interpolationMetadata.gapAnalysis.totalGaps,
                    halfNoteGaps: interpolatedBeatMap.interpolationMetadata.gapAnalysis.halfNoteGaps,
                    anomalies: interpolatedBeatMap.interpolationMetadata.gapAnalysis.anomalies,
                    avgGapSize: interpolatedBeatMap.interpolationMetadata.gapAnalysis.avgGapSize,
                    gridAlignmentScore: interpolatedBeatMap.interpolationMetadata.gapAnalysis.gridAlignmentScore,
                },
                detectedBeatCount: interpolatedBeatMap.interpolationMetadata.detectedBeatCount,
                interpolatedBeatCount: interpolatedBeatMap.interpolationMetadata.interpolatedBeatCount,
                totalBeatCount: interpolatedBeatMap.interpolationMetadata.totalBeatCount,
                interpolationRatio: interpolatedBeatMap.interpolationMetadata.interpolationRatio,
                avgInterpolatedConfidence: interpolatedBeatMap.interpolationMetadata.avgInterpolatedConfidence,
                tempoDriftRatio: interpolatedBeatMap.interpolationMetadata.tempoDriftRatio,
            },
        };

        return JSON.stringify(json, null, 2);
    }

    /**
     * Parse an InterpolatedBeatMap from JSON string
     *
     * @param jsonString - JSON string to parse
     * @returns Interpolated beat map
     *
     * @example
     * ```typescript
     * // Load from storage
     * const json = localStorage.getItem('beatmap');
     * const interpolatedBeatMap = BeatInterpolator.fromJSON(json);
     *
     * // Use the loaded beat map
     * console.log(interpolatedBeatMap.mergedBeats.length);
     * ```
     */
    static fromJSON(jsonString: string): InterpolatedBeatMap {
        const json: InterpolatedBeatMapJSON = JSON.parse(jsonString);

        return {
            audioId: json.audioId,
            duration: json.duration,
            detectedBeats: json.detectedBeats.map(beat => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
            })),
            mergedBeats: json.mergedBeats.map(beat => ({
                timestamp: beat.timestamp,
                beatInMeasure: beat.beatInMeasure,
                isDownbeat: beat.isDownbeat,
                measureNumber: beat.measureNumber,
                intensity: beat.intensity,
                confidence: beat.confidence,
                source: beat.source,
                distanceToAnchor: beat.distanceToAnchor,
                nearestAnchorTimestamp: beat.nearestAnchorTimestamp,
            })),
            quarterNoteInterval: json.quarterNoteInterval,
            quarterNoteBpm: json.quarterNoteBpm,
            quarterNoteConfidence: json.quarterNoteConfidence,
            originalMetadata: json.originalMetadata,
            interpolationMetadata: {
                // Note: algorithm field is ignored for backward compatibility
                quarterNoteDetection: {
                    intervalSeconds: json.interpolationMetadata.quarterNoteDetection.intervalSeconds,
                    bpm: json.interpolationMetadata.quarterNoteDetection.bpm,
                    confidence: json.interpolationMetadata.quarterNoteDetection.confidence,
                    histogramPeak: json.interpolationMetadata.quarterNoteDetection.histogramPeak,
                    secondaryPeaks: json.interpolationMetadata.quarterNoteDetection.secondaryPeaks,
                    method: json.interpolationMetadata.quarterNoteDetection.method,
                    denseSectionCount: json.interpolationMetadata.quarterNoteDetection.denseSectionCount,
                    denseSectionBeats: json.interpolationMetadata.quarterNoteDetection.denseSectionBeats,
                },
                gapAnalysis: {
                    totalGaps: json.interpolationMetadata.gapAnalysis.totalGaps,
                    halfNoteGaps: json.interpolationMetadata.gapAnalysis.halfNoteGaps,
                    anomalies: json.interpolationMetadata.gapAnalysis.anomalies,
                    avgGapSize: json.interpolationMetadata.gapAnalysis.avgGapSize,
                    gridAlignmentScore: json.interpolationMetadata.gapAnalysis.gridAlignmentScore,
                },
                detectedBeatCount: json.interpolationMetadata.detectedBeatCount,
                interpolatedBeatCount: json.interpolationMetadata.interpolatedBeatCount,
                totalBeatCount: json.interpolationMetadata.totalBeatCount,
                interpolationRatio: json.interpolationMetadata.interpolationRatio,
                avgInterpolatedConfidence: json.interpolationMetadata.avgInterpolatedConfidence,
                tempoDriftRatio: json.interpolationMetadata.tempoDriftRatio,
            },
        };
    }

    /**
     * Save an InterpolatedBeatMap to a file (Node.js only)
     *
     * @param interpolatedBeatMap - Interpolated beat map to save
     * @param filePath - Path to save to
     *
     * @example
     * ```typescript
     * const interpolator = new BeatInterpolator();
     * const interpolatedBeatMap = interpolator.interpolate(beatMap);
     * await BeatInterpolator.saveToFile(interpolatedBeatMap, './beatmap.json');
     * ```
     */
    static async saveToFile(interpolatedBeatMap: InterpolatedBeatMap, filePath: string): Promise<void> {
        // Check if we're in a Node.js environment
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('saveToFile is only available in Node.js environment');
        }

        // Dynamic import for Node.js fs/promises
        const { writeFile } = await import('fs/promises');
        const json = BeatInterpolator.toJSON(interpolatedBeatMap);
        await writeFile(filePath, json, 'utf-8');
    }

    /**
     * Load an InterpolatedBeatMap from a file (Node.js only)
     *
     * @param filePath - Path to load from
     * @returns Interpolated beat map
     *
     * @example
     * ```typescript
     * const interpolatedBeatMap = await BeatInterpolator.loadFromFile('./beatmap.json');
     * console.log(interpolatedBeatMap.mergedBeats.length);
     * ```
     */
    static async loadFromFile(filePath: string): Promise<InterpolatedBeatMap> {
        // Check if we're in a Node.js environment
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('loadFromFile is only available in Node.js environment');
        }

        // Dynamic import for Node.js fs/promises
        const { readFile } = await import('fs/promises');
        const jsonString = await readFile(filePath, 'utf-8');
        return BeatInterpolator.fromJSON(jsonString);
    }
}
