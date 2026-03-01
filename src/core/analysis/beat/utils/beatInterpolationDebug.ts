/**
 * Beat Interpolation Debug Utility
 *
 * Provides detailed debug output for the beat interpolation process.
 * This tool is designed for research, development, and troubleshooting
 * to understand how the interpolation algorithms work.
 *
 * @example
 * ```typescript
 * import { BeatInterpolator, generateDebugReport } from './beat/index.js';
 *
 * const interpolator = new BeatInterpolator({ algorithm: 'dual-pass' });
 * const interpolatedBeatMap = interpolator.interpolate(beatMap);
 *
 * // Generate a complete debug report
 * const debugReport = generateDebugReport(interpolatedBeatMap);
 * console.log(debugReport.toConsole());
 *
 * // Or save to JSON for later analysis
 * const json = debugReport.toJSON();
 * ```
 */

import type {
    Beat,
    BeatMap,
    BeatWithSource,
    InterpolatedBeatMap,
    InterpolationAlgorithm,
    QuarterNoteDetection,
    GapAnalysis,
} from '../../../types/BeatMap.js';

// ============================================================================
// Debug Types
// ============================================================================

/**
 * A single entry in the quarter note detection histogram
 */
export interface HistogramEntry {
    /** Interval bucket in seconds */
    intervalSeconds: number;

    /** Weight value for this bucket */
    weight: number;

    /** Whether this is the detected quarter note peak */
    isPrimaryPeak: boolean;

    /** Whether this is a secondary peak */
    isSecondaryPeak: boolean;

    /** Equivalent BPM for this interval */
    bpm: number;
}

/**
 * Information about a single gap between detected beats
 */
export interface GapDetail {
    /** Index of the beat starting this gap */
    startBeatIndex: number;

    /** Index of the beat ending this gap */
    endBeatIndex: number;

    /** Timestamp of the start beat */
    startTime: number;

    /** Timestamp of the end beat */
    endTime: number;

    /** Duration of the gap in seconds */
    duration: number;

    /** Number of quarter notes that fit in this gap */
    quarterNotesInGap: number;

    /** Number of beats that were interpolated in this gap */
    interpolatedBeats: number;

    /** Whether this is a half-note gap (2x quarter note) */
    isHalfNoteGap: boolean;

    /** Whether this gap contains anomalies */
    hasAnomalies: boolean;
}

/**
 * Tempo drift data point
 */
export interface TempoDriftPoint {
    /** Timestamp in seconds */
    timestamp: number;

    /** Local tempo in BPM at this point */
    localTempo: number;

    /** Beat index */
    beatIndex: number;

    /** Whether this is a detected or interpolated beat */
    source: 'detected' | 'interpolated';

    /** Deviation from the base tempo (percentage) */
    deviationPercent: number;
}

/**
 * Per-beat debug information
 */
export interface BeatDebugInfo {
    /** Timestamp in seconds */
    timestamp: number;

    /** Beat index in the merged array */
    index: number;

    /** Source of this beat */
    source: 'detected' | 'interpolated';

    /** Confidence score (0-1) */
    confidence: number;

    /** Intensity value */
    intensity: number;

    /** Distance to nearest anchor (for interpolated beats) */
    distanceToAnchor: number | null;

    /** Timestamp of nearest anchor (for interpolated beats) */
    nearestAnchorTimestamp: number | null;

    /** Local tempo at this beat (BPM) */
    localTempo: number;

    /** Interval from previous beat (seconds) */
    intervalFromPrevious: number | null;

    /** Grid alignment error (seconds) */
    gridAlignmentError: number;
}

/**
 * Complete debug report for beat interpolation
 */
export interface InterpolationDebugReport {
    /** Audio ID */
    audioId: string;

    /** Audio duration in seconds */
    duration: number;

    /** Algorithm used */
    algorithm: InterpolationAlgorithm;

    /** When this report was generated */
    generatedAt: string;

    /** Quarter note detection debug info */
    quarterNoteDetection: {
        /** Detected interval in seconds */
        intervalSeconds: number;

        /** Equivalent BPM */
        bpm: number;

        /** Detection confidence */
        confidence: number;

        /** Method used for detection */
        method: QuarterNoteDetection['method'];

        /** Number of dense sections found */
        denseSectionCount: number;

        /** Total beats from dense sections */
        denseSectionBeats: number;

        /** Histogram data */
        histogram: HistogramEntry[];
    };

    /** Gap analysis debug info */
    gapAnalysis: {
        /** Total number of gaps */
        totalGaps: number;

        /** Number of half-note gaps */
        halfNoteGaps: number;

        /** Number of anomalies detected */
        anomalyCount: number;

        /** Indices of anomalous beats */
        anomalyIndices: number[];

        /** Average gap size in quarter notes */
        avgGapSize: number;

        /** Grid alignment score (0-1) */
        gridAlignmentScore: number;

        /** Detailed gap information */
        gaps: GapDetail[];
    };

    /** Per-beat debug information */
    beats: BeatDebugInfo[];

    /** Tempo drift over time */
    tempoDrift: {
        /** Base tempo in BPM */
        baseTempo: number;

        /** Minimum local tempo observed */
        minTempo: number;

        /** Maximum local tempo observed */
        maxTempo: number;

        /** Tempo drift ratio (max/min) */
        driftRatio: number;

        /** Data points for drift visualization */
        dataPoints: TempoDriftPoint[];
    };

    /** Summary statistics */
    summary: {
        /** Total detected beats */
        detectedBeatCount: number;

        /** Total interpolated beats */
        interpolatedBeatCount: number;

        /** Total beats in merged output */
        totalBeatCount: number;

        /** Ratio of interpolated to total beats */
        interpolationRatio: number;

        /** Average confidence of interpolated beats */
        avgInterpolatedConfidence: number;

        /** Average confidence of detected beats */
        avgDetectedConfidence: number;

        /** Beats per second (overall density) */
        beatsPerSecond: number;
    };
}

/**
 * Options for debug output formatting
 */
export interface DebugOutputOptions {
    /** Maximum number of beats to include in detailed output (0 = all) */
    maxBeats?: number;

    /** Whether to include histogram data */
    includeHistogram?: boolean;

    /** Whether to include gap details */
    includeGapDetails?: boolean;

    /** Whether to include per-beat debug info */
    includeBeatDetails?: boolean;

    /** Whether to include tempo drift data */
    includeTempoDrift?: boolean;

    /** Histogram bucket size in seconds */
    histogramBucketSize?: number;
}

/**
 * Default debug output options
 */
export const DEFAULT_DEBUG_OUTPUT_OPTIONS: Required<DebugOutputOptions> = {
    maxBeats: 0, // Include all beats by default
    includeHistogram: true,
    includeGapDetails: true,
    includeBeatDetails: true,
    includeTempoDrift: true,
    histogramBucketSize: 0.005, // 5ms buckets
};

// ============================================================================
// Debug Data Collection
// ============================================================================

/**
 * Collect histogram data from a beat map
 *
 * Reconstructs the interval histogram used for quarter note detection.
 *
 * @param beats - Detected beats to analyze
 * @param quarterNoteInterval - The detected quarter note interval
 * @param bucketSize - Histogram bucket size in seconds
 * @returns Array of histogram entries
 */
export function collectHistogramData(
    beats: Beat[],
    quarterNoteInterval: number,
    bucketSize: number = 0.005
): HistogramEntry[] {
    if (beats.length < 2) {
        return [];
    }

    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i].timestamp - beats[i - 1].timestamp);
    }

    // Build histogram
    const histogram = new Map<number, number>();
    for (const interval of intervals) {
        const bucket = Math.round(interval / bucketSize) * bucketSize;
        histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    }

    // Find peaks (primary = quarter note, secondary = others)
    const entries: HistogramEntry[] = [];
    const sortedBuckets = Array.from(histogram.entries()).sort((a, b) => a[0] - b[0]);

    // Find primary peak (closest to quarter note)
    let primaryPeakBucket = 0;
    let maxCount = 0;
    for (const [bucket, count] of sortedBuckets) {
        if (count > maxCount) {
            maxCount = count;
            primaryPeakBucket = bucket;
        }
    }

    // Find secondary peaks (local maxima that aren't primary)
    const secondaryPeaks = new Set<number>();
    for (let i = 1; i < sortedBuckets.length - 1; i++) {
        const [bucket, count] = sortedBuckets[i];
        const prevCount = sortedBuckets[i - 1][1];
        const nextCount = sortedBuckets[i + 1][1];

        if (count > prevCount && count > nextCount && bucket !== primaryPeakBucket) {
            secondaryPeaks.add(bucket);
        }
    }

    // Build entries
    for (const [bucket, count] of sortedBuckets) {
        entries.push({
            intervalSeconds: bucket,
            weight: count,
            isPrimaryPeak: bucket === primaryPeakBucket,
            isSecondaryPeak: secondaryPeaks.has(bucket),
            bpm: bucket > 0 ? 60 / bucket : 0,
        });
    }

    return entries;
}

/**
 * Collect detailed gap information
 *
 * @param detectedBeats - Original detected beats
 * @param mergedBeats - Merged beats (interpolated + detected)
 * @param quarterNoteInterval - Detected quarter note interval
 * @param anomalies - Array of anomaly indices
 * @returns Array of gap details
 */
export function collectGapDetails(
    detectedBeats: Beat[],
    mergedBeats: BeatWithSource[],
    quarterNoteInterval: number,
    anomalies: number[]
): GapDetail[] {
    const gaps: GapDetail[] = [];
    const anomalySet = new Set(anomalies);

    for (let i = 0; i < detectedBeats.length - 1; i++) {
        const startBeat = detectedBeats[i];
        const endBeat = detectedBeats[i + 1];
        const duration = endBeat.timestamp - startBeat.timestamp;
        const quarterNotesInGap = duration / quarterNoteInterval;
        const interpolatedBeats = Math.max(0, Math.round(quarterNotesInGap) - 1);

        // Only include actual gaps (more than 1 quarter note)
        if (quarterNotesInGap > 1.2) {
            gaps.push({
                startBeatIndex: i,
                endBeatIndex: i + 1,
                startTime: startBeat.timestamp,
                endTime: endBeat.timestamp,
                duration,
                quarterNotesInGap,
                interpolatedBeats,
                isHalfNoteGap: Math.abs(quarterNotesInGap - 2) < 0.2,
                hasAnomalies: anomalySet.has(i) || anomalySet.has(i + 1),
            });
        }
    }

    return gaps;
}

/**
 * Collect per-beat debug information
 *
 * @param mergedBeats - Merged beats array
 * @param quarterNoteInterval - Detected quarter note interval
 * @returns Array of beat debug info
 */
export function collectBeatDebugInfo(
    mergedBeats: BeatWithSource[],
    quarterNoteInterval: number
): BeatDebugInfo[] {
    const beatInfos: BeatDebugInfo[] = [];

    for (let i = 0; i < mergedBeats.length; i++) {
        const beat = mergedBeats[i];
        const prevBeat = i > 0 ? mergedBeats[i - 1] : null;

        // Calculate local tempo
        let localTempo = 60 / quarterNoteInterval; // Default to base tempo
        if (prevBeat) {
            const interval = beat.timestamp - prevBeat.timestamp;
            if (interval > 0) {
                localTempo = 60 / interval;
            }
        }

        // Calculate grid alignment error
        const expectedPosition = Math.round(beat.timestamp / quarterNoteInterval) * quarterNoteInterval;
        const gridAlignmentError = Math.abs(beat.timestamp - expectedPosition);

        beatInfos.push({
            timestamp: beat.timestamp,
            index: i,
            source: beat.source,
            confidence: beat.confidence,
            intensity: beat.intensity,
            distanceToAnchor: beat.distanceToAnchor ?? null,
            nearestAnchorTimestamp: beat.nearestAnchorTimestamp ?? null,
            localTempo,
            intervalFromPrevious: prevBeat ? beat.timestamp - prevBeat.timestamp : null,
            gridAlignmentError,
        });
    }

    return beatInfos;
}

/**
 * Collect tempo drift data
 *
 * @param mergedBeats - Merged beats array
 * @param baseTempo - Base tempo in BPM
 * @returns Tempo drift data points and statistics
 */
export function collectTempoDriftData(
    mergedBeats: BeatWithSource[],
    baseTempo: number
): {
    minTempo: number;
    maxTempo: number;
    driftRatio: number;
    dataPoints: TempoDriftPoint[];
} {
    const dataPoints: TempoDriftPoint[] = [];
    const localTempos: number[] = [];

    for (let i = 0; i < mergedBeats.length; i++) {
        const beat = mergedBeats[i];
        let localTempo = baseTempo;

        if (i > 0) {
            const interval = beat.timestamp - mergedBeats[i - 1].timestamp;
            if (interval > 0) {
                localTempo = 60 / interval;
                localTempos.push(localTempo);
            }
        }

        const deviationPercent = baseTempo > 0
            ? ((localTempo - baseTempo) / baseTempo) * 100
            : 0;

        dataPoints.push({
            timestamp: beat.timestamp,
            localTempo,
            beatIndex: i,
            source: beat.source,
            deviationPercent,
        });
    }

    const minTempo = localTempos.length > 0 ? Math.min(...localTempos) : baseTempo;
    const maxTempo = localTempos.length > 0 ? Math.max(...localTempos) : baseTempo;
    const driftRatio = minTempo > 0 ? maxTempo / minTempo : 1.0;

    return {
        minTempo,
        maxTempo,
        driftRatio,
        dataPoints,
    };
}

// ============================================================================
// Main Debug Report Generator
// ============================================================================

/**
 * Generate a comprehensive debug report for an interpolated beat map
 *
 * @param interpolatedBeatMap - The interpolated beat map to analyze
 * @param options - Debug output options
 * @returns Complete debug report
 */
export function generateDebugReport(
    interpolatedBeatMap: InterpolatedBeatMap,
    options: DebugOutputOptions = {}
): InterpolationDebugReport {
    const opts = { ...DEFAULT_DEBUG_OUTPUT_OPTIONS, ...options };
    const { detectedBeats, mergedBeats, quarterNoteInterval, interpolationMetadata } = interpolatedBeatMap;

    // Collect histogram data
    const histogram = opts.includeHistogram
        ? collectHistogramData(detectedBeats, quarterNoteInterval, opts.histogramBucketSize)
        : [];

    // Collect gap details
    const gaps = opts.includeGapDetails
        ? collectGapDetails(
            detectedBeats,
            mergedBeats,
            quarterNoteInterval,
            interpolationMetadata.gapAnalysis.anomalies
        )
        : [];

    // Collect beat debug info
    let beatInfos = opts.includeBeatDetails
        ? collectBeatDebugInfo(mergedBeats, quarterNoteInterval)
        : [];

    // Limit beats if specified
    if (opts.maxBeats > 0 && beatInfos.length > opts.maxBeats) {
        beatInfos = beatInfos.slice(0, opts.maxBeats);
    }

    // Collect tempo drift data
    const tempoDrift = opts.includeTempoDrift
        ? collectTempoDriftData(mergedBeats, interpolationMetadata.quarterNoteDetection.bpm)
        : {
            minTempo: interpolationMetadata.quarterNoteDetection.bpm,
            maxTempo: interpolationMetadata.quarterNoteDetection.bpm,
            driftRatio: 1.0,
            dataPoints: [],
        };

    // Calculate summary statistics
    const detectedBeatCount = detectedBeats.length;
    const interpolatedCount = mergedBeats.filter(b => b.source === 'interpolated').length;
    const avgInterpolatedConfidence = interpolatedCount > 0
        ? mergedBeats
            .filter(b => b.source === 'interpolated')
            .reduce((sum, b) => sum + b.confidence, 0) / interpolatedCount
        : 0;
    const avgDetectedConfidence = detectedBeatCount > 0
        ? detectedBeats.reduce((sum, b) => sum + b.confidence, 0) / detectedBeatCount
        : 0;

    return {
        audioId: interpolatedBeatMap.audioId,
        duration: interpolatedBeatMap.duration,
        algorithm: interpolationMetadata.algorithm,
        generatedAt: new Date().toISOString(),
        quarterNoteDetection: {
            intervalSeconds: quarterNoteInterval,
            bpm: interpolationMetadata.quarterNoteDetection.bpm,
            confidence: interpolationMetadata.quarterNoteDetection.confidence,
            method: interpolationMetadata.quarterNoteDetection.method,
            denseSectionCount: interpolationMetadata.quarterNoteDetection.denseSectionCount,
            denseSectionBeats: interpolationMetadata.quarterNoteDetection.denseSectionBeats,
            histogram,
        },
        gapAnalysis: {
            totalGaps: interpolationMetadata.gapAnalysis.totalGaps,
            halfNoteGaps: interpolationMetadata.gapAnalysis.halfNoteGaps,
            anomalyCount: interpolationMetadata.gapAnalysis.anomalies.length,
            anomalyIndices: interpolationMetadata.gapAnalysis.anomalies,
            avgGapSize: interpolationMetadata.gapAnalysis.avgGapSize,
            gridAlignmentScore: interpolationMetadata.gapAnalysis.gridAlignmentScore,
            gaps,
        },
        beats: beatInfos,
        tempoDrift: {
            baseTempo: interpolationMetadata.quarterNoteDetection.bpm,
            ...tempoDrift,
        },
        summary: {
            detectedBeatCount,
            interpolatedBeatCount: interpolatedCount,
            totalBeatCount: mergedBeats.length,
            interpolationRatio: mergedBeats.length > 0
                ? interpolatedCount / mergedBeats.length
                : 0,
            avgInterpolatedConfidence,
            avgDetectedConfidence,
            beatsPerSecond: interpolatedBeatMap.duration > 0
                ? mergedBeats.length / interpolatedBeatMap.duration
                : 0,
        },
    };
}

// ============================================================================
// Output Formatters
// ============================================================================

/**
 * Format a debug report as a human-readable console string
 *
 * @param report - Debug report to format
 * @returns Formatted string for console output
 */
export function formatDebugReportToConsole(report: InterpolationDebugReport): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('BEAT INTERPOLATION DEBUG REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    // Basic info
    lines.push(`Audio ID: ${report.audioId}`);
    lines.push(`Duration: ${report.duration.toFixed(2)}s`);
    lines.push(`Algorithm: ${report.algorithm}`);
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push('');

    // Summary
    lines.push('-'.repeat(40));
    lines.push('SUMMARY');
    lines.push('-'.repeat(40));
    lines.push(`Detected beats:    ${report.summary.detectedBeatCount}`);
    lines.push(`Interpolated beats: ${report.summary.interpolatedBeatCount}`);
    lines.push(`Total beats:       ${report.summary.totalBeatCount}`);
    lines.push(`Interpolation ratio: ${(report.summary.interpolationRatio * 100).toFixed(1)}%`);
    lines.push(`Avg detected confidence: ${(report.summary.avgDetectedConfidence * 100).toFixed(1)}%`);
    lines.push(`Avg interpolated confidence: ${(report.summary.avgInterpolatedConfidence * 100).toFixed(1)}%`);
    lines.push(`Beats per second: ${report.summary.beatsPerSecond.toFixed(2)}`);
    lines.push('');

    // Quarter note detection
    lines.push('-'.repeat(40));
    lines.push('QUARTER NOTE DETECTION');
    lines.push('-'.repeat(40));
    lines.push(`Interval: ${report.quarterNoteDetection.intervalSeconds.toFixed(4)}s`);
    lines.push(`BPM: ${report.quarterNoteDetection.bpm.toFixed(1)}`);
    lines.push(`Confidence: ${(report.quarterNoteDetection.confidence * 100).toFixed(1)}%`);
    lines.push(`Method: ${report.quarterNoteDetection.method}`);
    lines.push(`Dense sections: ${report.quarterNoteDetection.denseSectionCount}`);
    lines.push(`Dense section beats: ${report.quarterNoteDetection.denseSectionBeats}`);
    lines.push('');

    // Histogram (top 10 peaks)
    if (report.quarterNoteDetection.histogram.length > 0) {
        lines.push('Histogram (top peaks):');
        const sortedHistogram = [...report.quarterNoteDetection.histogram]
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 10);

        for (const entry of sortedHistogram) {
            const marker = entry.isPrimaryPeak ? ' [PRIMARY]' :
                entry.isSecondaryPeak ? ' [SECONDARY]' : '';
            const bar = '█'.repeat(Math.min(20, Math.round(entry.weight)));
            lines.push(`  ${entry.intervalSeconds.toFixed(3)}s (${entry.bpm.toFixed(1)} BPM) ${bar}${marker}`);
        }
        lines.push('');
    }

    // Gap analysis
    lines.push('-'.repeat(40));
    lines.push('GAP ANALYSIS');
    lines.push('-'.repeat(40));
    lines.push(`Total gaps: ${report.gapAnalysis.totalGaps}`);
    lines.push(`Half-note gaps: ${report.gapAnalysis.halfNoteGaps}`);
    lines.push(`Anomalies: ${report.gapAnalysis.anomalyCount}`);
    lines.push(`Avg gap size: ${report.gapAnalysis.avgGapSize.toFixed(2)} quarter notes`);
    lines.push(`Grid alignment score: ${(report.gapAnalysis.gridAlignmentScore * 100).toFixed(1)}%`);
    lines.push('');

    // Gap details (first 5)
    if (report.gapAnalysis.gaps.length > 0) {
        lines.push('Gap details (first 5):');
        for (let i = 0; i < Math.min(5, report.gapAnalysis.gaps.length); i++) {
            const gap = report.gapAnalysis.gaps[i];
            const flags = [
                gap.isHalfNoteGap ? 'half-note' : null,
                gap.hasAnomalies ? 'anomaly' : null,
            ].filter(Boolean).join(', ');
            lines.push(`  Gap ${i + 1}: ${gap.startTime.toFixed(2)}s - ${gap.endTime.toFixed(2)}s ` +
                `(${gap.duration.toFixed(2)}s, ${gap.interpolatedBeats} interpolated)${flags ? ` [${flags}]` : ''}`);
        }
        lines.push('');
    }

    // Tempo drift
    lines.push('-'.repeat(40));
    lines.push('TEMPO DRIFT');
    lines.push('-'.repeat(40));
    lines.push(`Base tempo: ${report.tempoDrift.baseTempo.toFixed(1)} BPM`);
    lines.push(`Min tempo: ${report.tempoDrift.minTempo.toFixed(1)} BPM`);
    lines.push(`Max tempo: ${report.tempoDrift.maxTempo.toFixed(1)} BPM`);
    lines.push(`Drift ratio: ${report.tempoDrift.driftRatio.toFixed(3)}`);
    lines.push('');

    // Tempo drift visualization (if data available)
    if (report.tempoDrift.dataPoints.length > 0) {
        lines.push('Tempo over time (sampled):');
        const sampledPoints = report.tempoDrift.dataPoints.filter((_, i) =>
            i % Math.max(1, Math.floor(report.tempoDrift.dataPoints.length / 10)) === 0
        ).slice(0, 10);

        for (const point of sampledPoints) {
            const deviation = point.deviationPercent >= 0 ? `+${point.deviationPercent.toFixed(1)}%` :
                `${point.deviationPercent.toFixed(1)}%`;
            const source = point.source === 'detected' ? 'D' : 'I';
            lines.push(`  ${point.timestamp.toFixed(2)}s: ${point.localTempo.toFixed(1)} BPM (${deviation}) [${source}]`);
        }
        lines.push('');
    }

    // Per-beat details (first 10)
    if (report.beats.length > 0) {
        lines.push('-'.repeat(40));
        lines.push('BEAT DETAILS (first 10)');
        lines.push('-'.repeat(40));
        lines.push('Index | Time    | Source      | Conf  | Tempo  | Grid Err');
        lines.push('-'.repeat(60));

        for (let i = 0; i < Math.min(10, report.beats.length); i++) {
            const beat = report.beats[i];
            lines.push(
                `${String(beat.index).padStart(5)} | ` +
                `${beat.timestamp.toFixed(3).padStart(7)}s | ` +
                `${beat.source.padEnd(11)} | ` +
                `${(beat.confidence * 100).toFixed(0).padStart(3)}% | ` +
                `${beat.localTempo.toFixed(1).padStart(5)} | ` +
                `${beat.gridAlignmentError.toFixed(3).padStart(8)}s`
            );
        }
        lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
}

/**
 * Format a debug report as JSON
 *
 * @param report - Debug report to format
 * @returns JSON string
 */
export function formatDebugReportToJSON(report: InterpolationDebugReport): string {
    return JSON.stringify(report, null, 2);
}

/**
 * Generate an ASCII visualization of tempo drift
 *
 * @param report - Debug report
 * @param width - Width of the visualization in characters
 * @returns ASCII visualization string
 */
export function generateTempoDriftVisualization(
    report: InterpolationDebugReport,
    width: number = 60
): string {
    const lines: string[] = [];
    const dataPoints = report.tempoDrift.dataPoints;

    if (dataPoints.length < 2) {
        return 'Not enough data points for visualization';
    }

    const minTempo = report.tempoDrift.minTempo;
    const maxTempo = report.tempoDrift.maxTempo;
    const tempoRange = maxTempo - minTempo;

    lines.push('TEMPO DRIFT VISUALIZATION');
    lines.push(`Base tempo: ${report.tempoDrift.baseTempo.toFixed(1)} BPM`);
    lines.push(`Range: ${minTempo.toFixed(1)} - ${maxTempo.toFixed(1)} BPM`);
    lines.push('');

    // Sample data points to fit width
    const sampledPoints: TempoDriftPoint[] = [];
    const step = Math.max(1, Math.floor(dataPoints.length / width));
    for (let i = 0; i < dataPoints.length; i += step) {
        sampledPoints.push(dataPoints[i]);
    }

    // Create visualization
    const height = 10;
    const grid: string[][] = Array(height).fill(null).map(() => Array(sampledPoints.length).fill(' '));

    // Plot points
    for (let x = 0; x < sampledPoints.length; x++) {
        const point = sampledPoints[x];
        const normalizedTempo = tempoRange > 0
            ? (point.localTempo - minTempo) / tempoRange
            : 0.5;
        const y = Math.floor((1 - normalizedTempo) * (height - 1));
        const clampedY = Math.max(0, Math.min(height - 1, y));

        const char = point.source === 'detected' ? '●' : '○';
        grid[clampedY][x] = char;
    }

    // Add base tempo line
    const baseTempoY = tempoRange > 0
        ? Math.floor((1 - (report.tempoDrift.baseTempo - minTempo) / tempoRange) * (height - 1))
        : Math.floor(height / 2);
    for (let x = 0; x < sampledPoints.length; x++) {
        if (grid[baseTempoY][x] === ' ') {
            grid[baseTempoY][x] = '-';
        }
    }

    // Render grid
    lines.push(`    ${maxTempo.toFixed(0)} BPM ┌${'─'.repeat(sampledPoints.length)}┐`);
    for (let y = 0; y < height; y++) {
        const row = grid[y].join('');
        lines.push(`           │${row}│`);
    }
    lines.push(`    ${minTempo.toFixed(0)} BPM └${'─'.repeat(sampledPoints.length)}┘`);
    lines.push(`           0s${' '.repeat(sampledPoints.length - 6)}${report.duration.toFixed(0)}s`);
    lines.push('');
    lines.push('Legend: ● = detected beat, ○ = interpolated beat, - = base tempo');

    return lines.join('\n');
}

/**
 * Generate an ASCII visualization of confidence scores over time
 *
 * @param report - Debug report
 * @param width - Width of the visualization in characters
 * @returns ASCII visualization string
 */
export function generateConfidenceVisualization(
    report: InterpolationDebugReport,
    width: number = 60
): string {
    const lines: string[] = [];
    const beats = report.beats;

    if (beats.length < 2) {
        return 'Not enough data points for visualization';
    }

    lines.push('CONFIDENCE VISUALIZATION');
    lines.push('');

    // Sample beats to fit width
    const sampledBeats: BeatDebugInfo[] = [];
    const step = Math.max(1, Math.floor(beats.length / width));
    for (let i = 0; i < beats.length; i += step) {
        sampledBeats.push(beats[i]);
    }

    // Create visualization
    const height = 10;
    const grid: string[][] = Array(height).fill(null).map(() => Array(sampledBeats.length).fill(' '));

    // Plot points
    for (let x = 0; x < sampledBeats.length; x++) {
        const beat = sampledBeats[x];
        const y = Math.floor((1 - beat.confidence) * (height - 1));
        const clampedY = Math.max(0, Math.min(height - 1, y));

        const char = beat.source === 'detected' ? '●' : '○';
        grid[clampedY][x] = char;
    }

    // Add 50% line
    const fiftyPercentY = Math.floor((1 - 0.5) * (height - 1));
    for (let x = 0; x < sampledBeats.length; x++) {
        if (grid[fiftyPercentY][x] === ' ') {
            grid[fiftyPercentY][x] = '-';
        }
    }

    // Render grid
    lines.push(`    100% ┌${'─'.repeat(sampledBeats.length)}┐`);
    for (let y = 0; y < height; y++) {
        const row = grid[y].join('');
        const label = y === 0 ? '100%' :
            y === Math.floor(height / 2) ? ' 50%' :
                y === height - 1 ? '  0%' : '    ';
        lines.push(`    ${label === '    ' ? '    ' : label} │${row}│`);
    }
    lines.push(`      0% └${'─'.repeat(sampledBeats.length)}┘`);
    lines.push(`         0s${' '.repeat(sampledBeats.length - 6)}${report.duration.toFixed(0)}s`);
    lines.push('');
    lines.push('Legend: ● = detected beat, ○ = interpolated beat, - = 50% line');

    return lines.join('\n');
}

// ============================================================================
// Convenience Class
// ============================================================================

/**
 * Debug helper class for beat interpolation
 *
 * Provides methods for generating and formatting debug output.
 *
 * @example
 * ```typescript
 * const interpolator = new BeatInterpolator();
 * const interpolatedBeatMap = interpolator.interpolate(beatMap);
 *
 * const debug = new BeatInterpolationDebug(interpolatedBeatMap);
 * console.log(debug.toConsole());
 * debug.saveToFile('./debug-report.json');
 * ```
 */
export class BeatInterpolationDebug {
    private report: InterpolationDebugReport;

    constructor(
        interpolatedBeatMap: InterpolatedBeatMap,
        options: DebugOutputOptions = {}
    ) {
        this.report = generateDebugReport(interpolatedBeatMap, options);
    }

    /**
     * Get the raw debug report data
     */
    getReport(): InterpolationDebugReport {
        return this.report;
    }

    /**
     * Format as human-readable console output
     */
    toConsole(): string {
        return formatDebugReportToConsole(this.report);
    }

    /**
     * Format as JSON string
     */
    toJSON(): string {
        return formatDebugReportToJSON(this.report);
    }

    /**
     * Get tempo drift visualization
     */
    getTempoDriftVisualization(width?: number): string {
        return generateTempoDriftVisualization(this.report, width);
    }

    /**
     * Get confidence visualization
     */
    getConfidenceVisualization(width?: number): string {
        return generateConfidenceVisualization(this.report, width);
    }

    /**
     * Print debug info to console
     */
    print(): void {
        console.log(this.toConsole());
    }

    /**
     * Save debug report to JSON file (Node.js only)
     */
    async saveToFile(filePath: string): Promise<void> {
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('saveToFile is only available in Node.js environment');
        }

        const { writeFile } = await import('fs/promises');
        await writeFile(filePath, this.toJSON(), 'utf-8');
    }

    /**
     * Load debug report from JSON file (Node.js only)
     */
    static async loadFromFile(filePath: string): Promise<BeatInterpolationDebug> {
        if (typeof process === 'undefined' || !process.versions?.node) {
            throw new Error('loadFromFile is only available in Node.js environment');
        }

        const { readFile } = await import('fs/promises');
        const jsonString = await readFile(filePath, 'utf-8');
        const report = JSON.parse(jsonString) as InterpolationDebugReport;

        const debug = Object.create(BeatInterpolationDebug.prototype);
        debug.report = report;
        return debug;
    }
}
