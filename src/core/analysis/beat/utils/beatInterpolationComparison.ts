/**
 * Beat Interpolation Comparison Utility
 *
 * Utility for comparing outputs of different interpolation approaches.
 * This tool is designed for research and experimentation to determine
 * which algorithm works best for different types of audio.
 *
 * @example
 * ```typescript
 * import { compareInterpolationApproaches } from './beatInterpolationComparison.js';
 *
 * const beatMap = await beatMapGenerator.generateBeatMap(audioUrl, 'test');
 * const comparison = compareInterpolationApproaches(beatMap);
 *
 * console.log(comparison.summary);
 * console.log(comparison.recommendation);
 * ```
 */

import { BeatInterpolator } from '../BeatInterpolator.js';
import type {
    Beat,
    BeatMap,
    BeatWithSource,
    InterpolatedBeatMap,
    InterpolationAlgorithm,
    InterpolationMetadata,
} from '../../../types/BeatMap.js';

/**
 * All available interpolation algorithms
 */
export const ALL_ALGORITHMS: InterpolationAlgorithm[] = [
    'histogram-grid',
    'adaptive-phase-locked',
    'dual-pass',
];

/**
 * Result of comparing a single metric across algorithms
 */
export interface MetricComparison {
    /** Name of the metric */
    name: string;

    /** Description of what this metric measures */
    description: string;

    /** Unit of measurement (e.g., 'beats', 'ms', 'ratio') */
    unit: string;

    /** Values by algorithm */
    values: Record<InterpolationAlgorithm, number>;

    /** Which algorithm performed best for this metric */
    bestAlgorithm: InterpolationAlgorithm;

    /** Whether higher is better for this metric */
    higherIsBetter: boolean;
}

/**
 * Detailed comparison between two algorithms
 */
export interface AlgorithmPairComparison {
    /** First algorithm */
    algorithm1: InterpolationAlgorithm;

    /** Second algorithm */
    algorithm2: InterpolationAlgorithm;

    /** Difference in total beat count */
    beatCountDifference: number;

    /** Average timestamp difference for beats at same positions (ms) */
    avgTimestampDifference: number;

    /** Maximum timestamp difference for beats at same positions (ms) */
    maxTimestampDifference: number;

    /** Number of beats that exist in both algorithms */
    sharedBeats: number;

    /** Beats only in algorithm1 */
    uniqueToAlgorithm1: number;

    /** Beats only in algorithm2 */
    uniqueToAlgorithm2: number;

    /** Correlation coefficient between beat positions */
    positionCorrelation: number;
}

/**
 * Result of comparing all interpolation approaches
 */
export interface InterpolationComparisonResult {
    /** Original beat map that was compared */
    originalBeatMap: {
        audioId: string;
        duration: number;
        beatCount: number;
        bpm: number;
    };

    /** Results from each algorithm */
    results: Record<InterpolationAlgorithm, InterpolatedBeatMap>;

    /** Comparison metrics across all algorithms */
    metrics: MetricComparison[];

    /** Pairwise comparisons between algorithms */
    pairwiseComparisons: AlgorithmPairComparison[];

    /** Summary text for quick review */
    summary: string;

    /** Recommended algorithm based on the comparison */
    recommendation: {
        algorithm: InterpolationAlgorithm;
        reason: string;
        confidence: 'high' | 'medium' | 'low';
    };

    /** Timestamp when comparison was performed */
    comparedAt: string;

    /** Time taken to perform comparison (ms) */
    processingTimeMs: number;
}

/**
 * Options for comparison
 */
export interface ComparisonOptions {
    /** Tolerance for considering beats at same position (seconds, default: 0.05) */
    beatTolerance?: number;

    /** Whether to include detailed pairwise comparisons (default: true) */
    includePairwise?: boolean;

    /** Custom interpolation options to use for all algorithms */
    interpolationOptions?: {
        minAnchorConfidence?: number;
        gridSnapTolerance?: number;
        tempoAdaptationRate?: number;
        extrapolateStart?: boolean;
        extrapolateEnd?: boolean;
    };
}

const DEFAULT_COMPARISON_OPTIONS: Required<ComparisonOptions> = {
    beatTolerance: 0.05,
    includePairwise: true,
    interpolationOptions: {},
};

/**
 * Compare all interpolation approaches on a single beat map
 *
 * @param beatMap - Beat map to compare approaches on
 * @param options - Comparison options
 * @returns Detailed comparison result
 *
 * @example
 * ```typescript
 * const comparison = compareInterpolationApproaches(beatMap);
 *
 * // View summary
 * console.log(comparison.summary);
 *
 * // Get recommendation
 * console.log(`Recommended: ${comparison.recommendation.algorithm}`);
 * console.log(`Reason: ${comparison.recommendation.reason}`);
 *
 * // Access individual results
 * const dualPassResult = comparison.results['dual-pass'];
 * console.log(`Dual-pass beats: ${dualPassResult.mergedBeats.length}`);
 * ```
 */
export function compareInterpolationApproaches(
    beatMap: BeatMap,
    options: ComparisonOptions = {}
): InterpolationComparisonResult {
    const startTime = performance.now();
    const opts = { ...DEFAULT_COMPARISON_OPTIONS, ...options };

    // Run all algorithms
    const results: Record<InterpolationAlgorithm, InterpolatedBeatMap> = {} as Record<InterpolationAlgorithm, InterpolatedBeatMap>;

    for (const algorithm of ALL_ALGORITHMS) {
        const interpolator = new BeatInterpolator({
            algorithm,
            ...opts.interpolationOptions,
        });
        results[algorithm] = interpolator.interpolate(beatMap);
    }

    // Calculate metrics
    const metrics = calculateMetrics(results);

    // Calculate pairwise comparisons
    const pairwiseComparisons: AlgorithmPairComparison[] = [];
    if (opts.includePairwise) {
        for (let i = 0; i < ALL_ALGORITHMS.length; i++) {
            for (let j = i + 1; j < ALL_ALGORITHMS.length; j++) {
                pairwiseComparisons.push(
                    compareAlgorithmPair(
                        results[ALL_ALGORITHMS[i]],
                        results[ALL_ALGORITHMS[j]],
                        ALL_ALGORITHMS[i],
                        ALL_ALGORITHMS[j],
                        opts.beatTolerance
                    )
                );
            }
        }
    }

    // Generate summary and recommendation
    const summary = generateSummary(results, metrics, beatMap);
    const recommendation = generateRecommendation(results, metrics);

    const processingTimeMs = performance.now() - startTime;

    return {
        originalBeatMap: {
            audioId: beatMap.audioId,
            duration: beatMap.duration,
            beatCount: beatMap.beats.length,
            bpm: beatMap.bpm,
        },
        results,
        metrics,
        pairwiseComparisons,
        summary,
        recommendation,
        comparedAt: new Date().toISOString(),
        processingTimeMs,
    };
}

/**
 * Calculate comparison metrics across all algorithms
 */
function calculateMetrics(
    results: Record<InterpolationAlgorithm, InterpolatedBeatMap>
): MetricComparison[] {
    const metrics: MetricComparison[] = [];

    // Total beat count
    metrics.push({
        name: 'Total Beat Count',
        description: 'Total number of beats in merged output',
        unit: 'beats',
        values: {
            'histogram-grid': results['histogram-grid'].mergedBeats.length,
            'adaptive-phase-locked': results['adaptive-phase-locked'].mergedBeats.length,
            'dual-pass': results['dual-pass'].mergedBeats.length,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].mergedBeats.length,
                'adaptive-phase-locked': results['adaptive-phase-locked'].mergedBeats.length,
                'dual-pass': results['dual-pass'].mergedBeats.length,
            },
            false // Closer to expected is better, not necessarily higher
        ),
        higherIsBetter: false,
    });

    // Interpolated beat count
    metrics.push({
        name: 'Interpolated Beat Count',
        description: 'Number of beats added by interpolation',
        unit: 'beats',
        values: {
            'histogram-grid': results['histogram-grid'].interpolationMetadata.interpolatedBeatCount,
            'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.interpolatedBeatCount,
            'dual-pass': results['dual-pass'].interpolationMetadata.interpolatedBeatCount,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].interpolationMetadata.interpolatedBeatCount,
                'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.interpolatedBeatCount,
                'dual-pass': results['dual-pass'].interpolationMetadata.interpolatedBeatCount,
            },
            false
        ),
        higherIsBetter: false,
    });

    // Interpolation ratio
    metrics.push({
        name: 'Interpolation Ratio',
        description: 'Percentage of beats that are interpolated',
        unit: '%',
        values: {
            'histogram-grid': results['histogram-grid'].interpolationMetadata.interpolationRatio * 100,
            'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.interpolationRatio * 100,
            'dual-pass': results['dual-pass'].interpolationMetadata.interpolationRatio * 100,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].interpolationMetadata.interpolationRatio,
                'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.interpolationRatio,
                'dual-pass': results['dual-pass'].interpolationMetadata.interpolationRatio,
            },
            false
        ),
        higherIsBetter: false,
    });

    // Quarter note confidence
    metrics.push({
        name: 'Quarter Note Confidence',
        description: 'Confidence in the detected quarter note interval',
        unit: '0-1',
        values: {
            'histogram-grid': results['histogram-grid'].quarterNoteConfidence,
            'adaptive-phase-locked': results['adaptive-phase-locked'].quarterNoteConfidence,
            'dual-pass': results['dual-pass'].quarterNoteConfidence,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].quarterNoteConfidence,
                'adaptive-phase-locked': results['adaptive-phase-locked'].quarterNoteConfidence,
                'dual-pass': results['dual-pass'].quarterNoteConfidence,
            },
            true
        ),
        higherIsBetter: true,
    });

    // Average interpolated confidence
    metrics.push({
        name: 'Avg Interpolated Confidence',
        description: 'Average confidence of interpolated beats',
        unit: '0-1',
        values: {
            'histogram-grid': results['histogram-grid'].interpolationMetadata.avgInterpolatedConfidence,
            'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.avgInterpolatedConfidence,
            'dual-pass': results['dual-pass'].interpolationMetadata.avgInterpolatedConfidence,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].interpolationMetadata.avgInterpolatedConfidence,
                'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.avgInterpolatedConfidence,
                'dual-pass': results['dual-pass'].interpolationMetadata.avgInterpolatedConfidence,
            },
            true
        ),
        higherIsBetter: true,
    });

    // Grid alignment score
    metrics.push({
        name: 'Grid Alignment Score',
        description: 'How well detected beats align to the grid',
        unit: '0-1',
        values: {
            'histogram-grid': results['histogram-grid'].interpolationMetadata.gapAnalysis.gridAlignmentScore,
            'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.gapAnalysis.gridAlignmentScore,
            'dual-pass': results['dual-pass'].interpolationMetadata.gapAnalysis.gridAlignmentScore,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].interpolationMetadata.gapAnalysis.gridAlignmentScore,
                'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.gapAnalysis.gridAlignmentScore,
                'dual-pass': results['dual-pass'].interpolationMetadata.gapAnalysis.gridAlignmentScore,
            },
            true
        ),
        higherIsBetter: true,
    });

    // Tempo drift ratio
    metrics.push({
        name: 'Tempo Drift Ratio',
        description: 'Ratio of max local tempo to min local tempo (closer to 1 is better)',
        unit: 'ratio',
        values: {
            'histogram-grid': results['histogram-grid'].interpolationMetadata.tempoDriftRatio,
            'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.tempoDriftRatio,
            'dual-pass': results['dual-pass'].interpolationMetadata.tempoDriftRatio,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': 1 / results['histogram-grid'].interpolationMetadata.tempoDriftRatio,
                'adaptive-phase-locked': 1 / results['adaptive-phase-locked'].interpolationMetadata.tempoDriftRatio,
                'dual-pass': 1 / results['dual-pass'].interpolationMetadata.tempoDriftRatio,
            },
            true
        ),
        higherIsBetter: false,
    });

    // Total gaps found
    metrics.push({
        name: 'Total Gaps',
        description: 'Number of gaps detected between beats',
        unit: 'count',
        values: {
            'histogram-grid': results['histogram-grid'].interpolationMetadata.gapAnalysis.totalGaps,
            'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.gapAnalysis.totalGaps,
            'dual-pass': results['dual-pass'].interpolationMetadata.gapAnalysis.totalGaps,
        },
        bestAlgorithm: findBest(
            {
                'histogram-grid': results['histogram-grid'].interpolationMetadata.gapAnalysis.totalGaps,
                'adaptive-phase-locked': results['adaptive-phase-locked'].interpolationMetadata.gapAnalysis.totalGaps,
                'dual-pass': results['dual-pass'].interpolationMetadata.gapAnalysis.totalGaps,
            },
            false
        ),
        higherIsBetter: false,
    });

    return metrics;
}

/**
 * Compare two algorithms in detail
 */
function compareAlgorithmPair(
    result1: InterpolatedBeatMap,
    result2: InterpolatedBeatMap,
    algo1: InterpolationAlgorithm,
    algo2: InterpolationAlgorithm,
    tolerance: number
): AlgorithmPairComparison {
    const beats1 = result1.mergedBeats;
    const beats2 = result2.mergedBeats;

    // Find matching beats
    const matchedBeats: { b1: BeatWithSource; b2: BeatWithSource; diff: number }[] = [];
    const uniqueTo1: BeatWithSource[] = [];
    const uniqueTo2: BeatWithSource[] = [];

    const used2 = new Set<number>();

    for (const b1 of beats1) {
        let bestMatch: { b2: BeatWithSource; diff: number } | null = null;

        for (let i = 0; i < beats2.length; i++) {
            if (used2.has(i)) continue;

            const b2 = beats2[i];
            const diff = Math.abs(b1.timestamp - b2.timestamp);

            if (diff <= tolerance) {
                if (!bestMatch || diff < bestMatch.diff) {
                    bestMatch = { b2, diff };
                }
            }
        }

        if (bestMatch) {
            matchedBeats.push({ b1, b2: bestMatch.b2, diff: bestMatch.diff });
            used2.add(beats2.indexOf(bestMatch.b2));
        } else {
            uniqueTo1.push(b1);
        }
    }

    for (let i = 0; i < beats2.length; i++) {
        if (!used2.has(i)) {
            uniqueTo2.push(beats2[i]);
        }
    }

    // Calculate statistics
    const timestampDiffs = matchedBeats.map(m => m.diff);
    const avgTimestampDifference = timestampDiffs.length > 0
        ? (timestampDiffs.reduce((a, b) => a + b, 0) / timestampDiffs.length) * 1000 // Convert to ms
        : 0;

    const maxTimestampDifference = timestampDiffs.length > 0
        ? Math.max(...timestampDiffs) * 1000
        : 0;

    // Calculate position correlation
    const positionCorrelation = calculateCorrelation(
        matchedBeats.map(m => m.b1.timestamp),
        matchedBeats.map(m => m.b2.timestamp)
    );

    return {
        algorithm1: algo1,
        algorithm2: algo2,
        beatCountDifference: Math.abs(beats1.length - beats2.length),
        avgTimestampDifference,
        maxTimestampDifference,
        sharedBeats: matchedBeats.length,
        uniqueToAlgorithm1: uniqueTo1.length,
        uniqueToAlgorithm2: uniqueTo2.length,
        positionCorrelation,
    };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
}

/**
 * Find the best algorithm for a metric
 */
function findBest(
    values: Record<InterpolationAlgorithm, number>,
    higherIsBetter: boolean
): InterpolationAlgorithm {
    let best = ALL_ALGORITHMS[0];
    let bestValue = values[best];

    for (const algo of ALL_ALGORITHMS.slice(1)) {
        const value = values[algo];
        if (higherIsBetter ? value > bestValue : value < bestValue) {
            best = algo;
            bestValue = value;
        }
    }

    return best;
}

/**
 * Generate a summary text
 */
function generateSummary(
    results: Record<InterpolationAlgorithm, InterpolatedBeatMap>,
    metrics: MetricComparison[],
    beatMap: BeatMap
): string {
    const lines: string[] = [];

    lines.push('=== Beat Interpolation Comparison ===');
    lines.push('');
    lines.push(`Audio ID: ${beatMap.audioId}`);
    lines.push(`Duration: ${beatMap.duration.toFixed(2)}s`);
    lines.push(`Original detected beats: ${beatMap.beats.length}`);
    lines.push(`Original BPM estimate: ${beatMap.bpm.toFixed(1)}`);
    lines.push('');

    lines.push('--- Algorithm Results ---');
    for (const algo of ALL_ALGORITHMS) {
        const r = results[algo];
        lines.push(`  ${algo}:`);
        lines.push(`    Total beats: ${r.mergedBeats.length}`);
        lines.push(`    Interpolated: ${r.interpolationMetadata.interpolatedBeatCount}`);
        lines.push(`    Quarter note BPM: ${r.quarterNoteBpm.toFixed(1)}`);
        lines.push(`    Confidence: ${(r.quarterNoteConfidence * 100).toFixed(1)}%`);
    }
    lines.push('');

    lines.push('--- Key Metrics ---');
    for (const metric of metrics) {
        lines.push(`  ${metric.name}:`);
        for (const algo of ALL_ALGORITHMS) {
            const value = metric.values[algo];
            const marker = algo === metric.bestAlgorithm ? ' *' : '';
            lines.push(`    ${algo}: ${value.toFixed(2)}${metric.unit}${marker}`);
        }
    }

    return lines.join('\n');
}

/**
 * Generate a recommendation based on the comparison
 */
function generateRecommendation(
    results: Record<InterpolationAlgorithm, InterpolatedBeatMap>,
    metrics: MetricComparison[]
): { algorithm: InterpolationAlgorithm; reason: string; confidence: 'high' | 'medium' | 'low' } {
    // Score each algorithm
    const scores: Record<InterpolationAlgorithm, number> = {
        'histogram-grid': 0,
        'adaptive-phase-locked': 0,
        'dual-pass': 0,
    };

    // Count wins for each algorithm
    for (const metric of metrics) {
        scores[metric.bestAlgorithm] += metric.higherIsBetter ? 1 : 1;
    }

    // Find the winner
    let winner: InterpolationAlgorithm = 'dual-pass';
    let highestScore = 0;

    for (const algo of ALL_ALGORITHMS) {
        if (scores[algo] > highestScore) {
            highestScore = scores[algo];
            winner = algo;
        }
    }

    // Determine confidence based on how clear the winner is
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const gap = sortedScores[0] - sortedScores[1];

    let confidence: 'high' | 'medium' | 'low';
    if (gap >= 3) {
        confidence = 'high';
    } else if (gap >= 1) {
        confidence = 'medium';
    } else {
        confidence = 'low';
    }

    // Generate reason
    const reasons: string[] = [];
    for (const metric of metrics) {
        if (metric.bestAlgorithm === winner) {
            reasons.push(`best ${metric.name.toLowerCase()}`);
        }
    }

    const reason = reasons.length > 0
        ? `Winner on ${reasons.slice(0, 3).join(', ')}`
        : 'Balanced performance across metrics';

    return {
        algorithm: winner,
        reason,
        confidence,
    };
}

/**
 * Calculate accuracy against ground truth beats
 *
 * @param interpolatedMap - Interpolated beat map to evaluate
 * @param groundTruthBeats - Known correct beat timestamps
 * @param tolerance - Tolerance for matching (seconds, default: 0.05)
 * @returns Accuracy metrics
 *
 * @example
 * ```typescript
 * const groundTruth = [0.0, 0.5, 1.0, 1.5, 2.0]; // Known beats at 120 BPM
 * const accuracy = calculateAccuracyAgainstGroundTruth(result, groundTruth);
 * console.log(`Precision: ${(accuracy.precision * 100).toFixed(1)}%`);
 * console.log(`Recall: ${(accuracy.recall * 100).toFixed(1)}%`);
 * ```
 */
export function calculateAccuracyAgainstGroundTruth(
    interpolatedMap: InterpolatedBeatMap,
    groundTruthBeats: number[],
    tolerance: number = 0.05
): {
    /** True positives: beats correctly identified */
    truePositives: number;

    /** False positives: extra beats that shouldn't be there */
    falsePositives: number;

    /** False negatives: beats that were missed */
    falseNegatives: number;

    /** Precision: TP / (TP + FP) */
    precision: number;

    /** Recall: TP / (TP + FN) */
    recall: number;

    /** F1 score: harmonic mean of precision and recall */
    f1Score: number;

    /** Average timing error for matched beats (ms) */
    avgTimingErrorMs: number;

    /** Maximum timing error for matched beats (ms) */
    maxTimingErrorMs: number;
} {
    const mergedBeats = interpolatedMap.mergedBeats;
    const usedGroundTruth = new Set<number>();
    const usedPredicted = new Set<number>();
    const timingErrors: number[] = [];

    // Find matches
    for (const predicted of mergedBeats) {
        for (let i = 0; i < groundTruthBeats.length; i++) {
            if (usedGroundTruth.has(i)) continue;

            const error = Math.abs(predicted.timestamp - groundTruthBeats[i]);
            if (error <= tolerance) {
                usedGroundTruth.add(i);
                usedPredicted.add(predicted.timestamp);
                timingErrors.push(error);
                break;
            }
        }
    }

    const truePositives = usedGroundTruth.size;
    const falsePositives = mergedBeats.length - truePositives;
    const falseNegatives = groundTruthBeats.length - truePositives;

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    const avgTimingErrorMs = timingErrors.length > 0
        ? (timingErrors.reduce((a, b) => a + b, 0) / timingErrors.length) * 1000
        : 0;

    const maxTimingErrorMs = timingErrors.length > 0
        ? Math.max(...timingErrors) * 1000
        : 0;

    return {
        truePositives,
        falsePositives,
        falseNegatives,
        precision,
        recall,
        f1Score,
        avgTimingErrorMs,
        maxTimingErrorMs,
    };
}

/**
 * Create a simple text table comparing algorithms
 *
 * @param comparison - Comparison result
 * @returns Formatted table string
 */
export function formatComparisonTable(comparison: InterpolationComparisonResult): string {
    const lines: string[] = [];

    // Header
    lines.push('| Metric | histogram-grid | adaptive-phase-locked | dual-pass | Best |');
    lines.push('|--------|----------------|------------------------|-----------|------|');

    // Metrics
    for (const metric of comparison.metrics) {
        const row = [
            metric.name,
            metric.values['histogram-grid'].toFixed(2),
            metric.values['adaptive-phase-locked'].toFixed(2),
            metric.values['dual-pass'].toFixed(2),
            metric.bestAlgorithm,
        ];
        lines.push(`| ${row.join(' | ')} |`);
    }

    return lines.join('\n');
}

/**
 * Export comparison results to JSON
 *
 * @param comparison - Comparison result
 * @returns JSON string
 */
export function comparisonToJSON(comparison: InterpolationComparisonResult): string {
    return JSON.stringify({
        originalBeatMap: comparison.originalBeatMap,
        metrics: comparison.metrics,
        pairwiseComparisons: comparison.pairwiseComparisons,
        recommendation: comparison.recommendation,
        comparedAt: comparison.comparedAt,
        processingTimeMs: comparison.processingTimeMs,
        // Store beat counts only to reduce size
        beatCounts: {
            'histogram-grid': comparison.results['histogram-grid'].mergedBeats.length,
            'adaptive-phase-locked': comparison.results['adaptive-phase-locked'].mergedBeats.length,
            'dual-pass': comparison.results['dual-pass'].mergedBeats.length,
        },
    }, null, 2);
}

// ============================================================================
// Visualization Utilities
// ============================================================================

/**
 * Options for beat visualization
 */
export interface VisualizationOptions {
    /** Width of the visualization in characters (for ASCII) or pixels (for HTML) */
    width?: number;

    /** Height of the visualization in characters (for ASCII) or pixels (for HTML) */
    height?: number;

    /** Time range to visualize [start, end] in seconds (default: full duration) */
    timeRange?: [number, number];

    /** Whether to show confidence as height/intensity (default: true) */
    showConfidence?: boolean;

    /** Whether to show beat numbers (default: false) */
    showBeatNumbers?: boolean;

    /** Character for detected beats in ASCII (default: '|') */
    detectedChar?: string;

    /** Character for interpolated beats in ASCII (default: '·') */
    interpolatedChar?: string;

    /** Character for downbeats in ASCII (default: '‖') */
    downbeatChar?: string;

    /** Whether to show the grid lines (default: true) */
    showGrid?: boolean;

    /** Title for the visualization (default: auto-generated) */
    title?: string;
}

const DEFAULT_VISUALIZATION_OPTIONS: Required<VisualizationOptions> = {
    width: 80,
    height: 20,
    timeRange: [0, Infinity],
    showConfidence: true,
    showBeatNumbers: false,
    detectedChar: '|',
    interpolatedChar: '·',
    downbeatChar: '‖',
    showGrid: true,
    title: '',
};

/**
 * Result of ASCII visualization
 */
export interface ASCIIVisualizationResult {
    /** The ASCII art visualization */
    visualization: string;

    /** Legend explaining the symbols */
    legend: string;

    /** Statistics about the visualized section */
    stats: {
        detectedCount: number;
        interpolatedCount: number;
        timeRange: [number, number];
        beatsPerSecond: number;
    };
}

/**
 * Generate an ASCII visualization of detected vs interpolated beats
 *
 * Creates a text-based timeline visualization showing beat positions,
 * with different markers for detected and interpolated beats.
 *
 * @param interpolatedMap - The interpolated beat map to visualize
 * @param options - Visualization options
 * @returns ASCII visualization result with legend and stats
 *
 * @example
 * ```typescript
 * const interpolator = new BeatInterpolator();
 * const result = interpolator.interpolate(beatMap);
 *
 * const viz = generateASCIIVisualization(result, {
 *     width: 100,
 *     timeRange: [5, 15], // Visualize seconds 5-15
 * });
 *
 * console.log(viz.visualization);
 * console.log(viz.legend);
 * ```
 */
export function generateASCIIVisualization(
    interpolatedMap: InterpolatedBeatMap,
    options: VisualizationOptions = {}
): ASCIIVisualizationResult {
    const opts = { ...DEFAULT_VISUALIZATION_OPTIONS, ...options };

    // Determine time range
    const startTime = opts.timeRange[0];
    const endTime = Math.min(opts.timeRange[1], interpolatedMap.duration);
    const duration = endTime - startTime;

    if (duration <= 0) {
        return {
            visualization: '(Empty time range)',
            legend: '',
            stats: {
                detectedCount: 0,
                interpolatedCount: 0,
                timeRange: [startTime, endTime],
                beatsPerSecond: 0,
            },
        };
    }

    // Filter beats within range
    const beatsInRange = interpolatedMap.mergedBeats.filter(
        b => b.timestamp >= startTime && b.timestamp <= endTime
    );

    const detectedBeats = beatsInRange.filter(b => b.source === 'detected');
    const interpolatedBeats = beatsInRange.filter(b => b.source === 'interpolated');

    // Build visualization lines
    const lines: string[] = [];

    // Title
    const title = opts.title || `Beat Visualization: ${interpolatedMap.audioId}`;
    lines.push(`═`.repeat(opts.width));
    lines.push(`  ${title}`);
    lines.push(`  Time: ${startTime.toFixed(2)}s - ${endTime.toFixed(2)}s (${duration.toFixed(2)}s)`);
    lines.push(`═`.repeat(opts.width));
    lines.push('');

    // Time axis
    const timeAxis = buildTimeAxis(startTime, endTime, opts.width);
    lines.push(timeAxis);
    lines.push('');

    // Main beat visualization
    const beatLine = buildBeatLine(
        beatsInRange,
        startTime,
        endTime,
        opts.width,
        opts.detectedChar,
        opts.interpolatedChar,
        opts.downbeatChar
    );
    lines.push('Beats:  ' + beatLine);

    // Confidence visualization (if enabled)
    if (opts.showConfidence) {
        const confidenceLine = buildConfidenceLine(
            beatsInRange,
            startTime,
            endTime,
            opts.width
        );
        lines.push('Conf:   ' + confidenceLine);
    }

    // Source indicator line
    const sourceLine = buildSourceLine(
        beatsInRange,
        startTime,
        endTime,
        opts.width
    );
    lines.push('Source: ' + sourceLine);

    lines.push('');

    // Beat numbers (if enabled)
    if (opts.showBeatNumbers && beatsInRange.length <= 50) {
        const numberLines = buildBeatNumberLines(
            beatsInRange,
            startTime,
            endTime,
            opts.width
        );
        lines.push(...numberLines);
        lines.push('');
    }

    // Statistics
    lines.push('─'.repeat(opts.width));
    lines.push(`  Detected beats: ${detectedBeats.length}`);
    lines.push(`  Interpolated:   ${interpolatedBeats.length}`);
    lines.push(`  Total:          ${beatsInRange.length}`);
    lines.push(`  Density:        ${(beatsInRange.length / duration).toFixed(2)} beats/sec`);
    lines.push('─'.repeat(opts.width));

    // Legend
    const legend = [
        'Legend:',
        `  ${opts.downbeatChar} = Downbeat (detected)`,
        `  ${opts.detectedChar} = Detected beat`,
        `  ${opts.interpolatedChar} = Interpolated beat`,
        '  D = Detected region, I = Interpolated region',
        '',
        'Confidence bar: ▁▂▃▄▅▆▇█ (low to high)',
    ].join('\n');

    return {
        visualization: lines.join('\n'),
        legend,
        stats: {
            detectedCount: detectedBeats.length,
            interpolatedCount: interpolatedBeats.length,
            timeRange: [startTime, endTime],
            beatsPerSecond: beatsInRange.length / duration,
        },
    };
}

/**
 * Build time axis line
 */
function buildTimeAxis(startTime: number, endTime: number, width: number): string {
    const chars: string[] = [];
    const duration = endTime - startTime;
    const tickInterval = calculateTickInterval(duration, 5);

    for (let i = 0; i < width; i++) {
        const time = startTime + (i / width) * duration;

        if (i === 0) {
            chars.push('0');
        } else if (Math.abs(time % tickInterval) < (duration / width)) {
            // Tick mark
            const label = time.toFixed(1);
            if (i + label.length < width) {
                chars.push(label);
                i += label.length - 1;
            } else {
                chars.push('+');
            }
        } else {
            chars.push(' ');
        }
    }

    return 'Time:   ' + chars.join('').substring(0, width);
}

/**
 * Calculate appropriate tick interval for time axis
 */
function calculateTickInterval(duration: number, targetTicks: number): number {
    const rawInterval = duration / targetTicks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalized = rawInterval / magnitude;

    let interval: number;
    if (normalized < 1.5) interval = magnitude;
    else if (normalized < 3.5) interval = 2 * magnitude;
    else if (normalized < 7.5) interval = 5 * magnitude;
    else interval = 10 * magnitude;

    return Math.max(0.1, interval);
}

/**
 * Build beat marker line
 */
function buildBeatLine(
    beats: BeatWithSource[],
    startTime: number,
    endTime: number,
    width: number,
    detectedChar: string,
    interpolatedChar: string,
    downbeatChar: string
): string {
    const duration = endTime - startTime;
    const chars: string[] = new Array(width).fill(' ');

    for (const beat of beats) {
        const position = Math.round(((beat.timestamp - startTime) / duration) * (width - 1));
        if (position >= 0 && position < width) {
            // Choose character based on beat type
            let char: string;
            if (beat.isDownbeat && beat.source === 'detected') {
                char = downbeatChar;
            } else if (beat.source === 'detected') {
                char = detectedChar;
            } else {
                char = interpolatedChar;
            }
            chars[position] = char;
        }
    }

    return chars.join('');
}

/**
 * Build confidence visualization line
 */
function buildConfidenceLine(
    beats: BeatWithSource[],
    startTime: number,
    endTime: number,
    width: number
): string {
    const duration = endTime - startTime;
    const confidenceBars = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const chars: string[] = new Array(width).fill(' ');

    for (const beat of beats) {
        const position = Math.round(((beat.timestamp - startTime) / duration) * (width - 1));
        if (position >= 0 && position < width) {
            const confidenceIndex = Math.min(
                confidenceBars.length - 1,
                Math.floor(beat.confidence * (confidenceBars.length - 1))
            );
            chars[position] = confidenceBars[confidenceIndex];
        }
    }

    return chars.join('');
}

/**
 * Build source indicator line (D for detected, I for interpolated regions)
 */
function buildSourceLine(
    beats: BeatWithSource[],
    startTime: number,
    endTime: number,
    width: number
): string {
    const duration = endTime - startTime;
    const chars: string[] = new Array(width).fill(' ');

    // Sort beats by timestamp
    const sortedBeats = [...beats].sort((a, b) => a.timestamp - b.timestamp);

    // Fill in regions
    let lastPosition = 0;
    for (const beat of sortedBeats) {
        const position = Math.round(((beat.timestamp - startTime) / duration) * (width - 1));
        if (position >= 0 && position < width) {
            const char = beat.source === 'detected' ? 'D' : 'I';
            // Fill from last position to this position
            for (let i = lastPosition; i <= position; i++) {
                if (chars[i] === ' ' || (chars[i] === 'I' && char === 'D')) {
                    chars[i] = char;
                }
            }
            lastPosition = position;
        }
    }

    return chars.join('');
}

/**
 * Build beat number lines (for sparse visualizations)
 */
function buildBeatNumberLines(
    beats: BeatWithSource[],
    startTime: number,
    endTime: number,
    width: number
): string[] {
    const duration = endTime - startTime;
    const lines: string[] = [];
    const numberLine1: string[] = new Array(width).fill(' ');
    const numberLine2: string[] = new Array(width).fill(' ');

    beats.forEach((beat, index) => {
        const position = Math.round(((beat.timestamp - startTime) / duration) * (width - 1));
        if (position >= 0 && position < width) {
            const numStr = index.toString();
            // Split number across two lines if needed
            for (let i = 0; i < numStr.length && position + i < width; i++) {
                if (i < Math.ceil(numStr.length / 2)) {
                    numberLine1[position + i] = numStr[i];
                } else {
                    numberLine2[position + i - Math.ceil(numStr.length / 2)] = numStr[i];
                }
            }
        }
    });

    lines.push('Index:  ' + numberLine1.join(''));
    if (numberLine2.some(c => c !== ' ')) {
        lines.push('        ' + numberLine2.join(''));
    }

    return lines;
}

/**
 * Result of HTML visualization
 */
export interface HTMLVisualizationResult {
    /** Complete HTML document string */
    html: string;

    /** SVG content (can be embedded in other documents) */
    svg: string;

    /** Suggested filename for saving */
    suggestedFilename: string;
}

/**
 * Generate an HTML visualization with SVG graphics
 *
 * Creates a self-contained HTML document with an SVG visualization
 * showing detected vs interpolated beats with interactive features.
 *
 * @param interpolatedMap - The interpolated beat map to visualize
 * @param options - Visualization options
 * @returns HTML visualization result
 *
 * @example
 * ```typescript
 * const result = generateHTMLVisualization(interpolatedMap, {
 *     width: 800,
 *     height: 300,
 * });
 *
 * // Save to file
 * fs.writeFileSync('beat-visualization.html', result.html);
 * ```
 */
export function generateHTMLVisualization(
    interpolatedMap: InterpolatedBeatMap,
    options: VisualizationOptions = {}
): HTMLVisualizationResult {
    const opts = { ...DEFAULT_VISUALIZATION_OPTIONS, ...options };
    const width = opts.width * 10; // Scale up for HTML
    const height = opts.height * 12;

    const startTime = opts.timeRange[0];
    const endTime = Math.min(opts.timeRange[1], interpolatedMap.duration);
    const duration = endTime - startTime;

    const beatsInRange = interpolatedMap.mergedBeats.filter(
        b => b.timestamp >= startTime && b.timestamp <= endTime
    );

    // Generate SVG content
    const svg = generateSVGContent(
        beatsInRange,
        startTime,
        endTime,
        width,
        height,
        interpolatedMap.audioId,
        opts
    );

    // Wrap in HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Beat Visualization: ${interpolatedMap.audioId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #1a1a2e;
            color: #eee;
        }
        .container {
            max-width: ${width + 40}px;
            margin: 0 auto;
        }
        h1 {
            font-size: 1.5em;
            margin-bottom: 0.5em;
        }
        .meta {
            font-size: 0.9em;
            color: #888;
            margin-bottom: 1em;
        }
        svg {
            background: #16213e;
            border-radius: 8px;
        }
        .legend {
            margin-top: 1em;
            padding: 1em;
            background: #16213e;
            border-radius: 8px;
        }
        .legend-item {
            display: inline-flex;
            align-items: center;
            margin-right: 1.5em;
            margin-bottom: 0.5em;
        }
        .legend-color {
            width: 12px;
            height: 12px;
            margin-right: 0.5em;
            border-radius: 2px;
        }
        .detected { background: #4ade80; }
        .interpolated { background: #60a5fa; }
        .downbeat { background: #f472b6; }
        .stats {
            margin-top: 1em;
            padding: 1em;
            background: #16213e;
            border-radius: 8px;
            font-family: monospace;
            font-size: 0.85em;
        }
        .stats-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.3em;
        }
        .stats-label { color: #888; }
        .stats-value { color: #4ade80; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Beat Visualization</h1>
        <div class="meta">
            <span>Audio: ${interpolatedMap.audioId}</span> ·
            <span>Duration: ${interpolatedMap.duration.toFixed(2)}s</span> ·
            <span>Quarter Note: ${interpolatedMap.quarterNoteBpm.toFixed(1)} BPM</span>
        </div>

        ${svg}

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color downbeat"></div>
                <span>Downbeat (detected)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color detected"></div>
                <span>Detected beat</span>
            </div>
            <div class="legend-item">
                <div class="legend-color interpolated"></div>
                <span>Interpolated beat</span>
            </div>
        </div>

        <div class="stats">
            <div class="stats-row">
                <span class="stats-label">Detected beats:</span>
                <span class="stats-value">${beatsInRange.filter(b => b.source === 'detected').length}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Interpolated beats:</span>
                <span class="stats-value">${beatsInRange.filter(b => b.source === 'interpolated').length}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Total beats:</span>
                <span class="stats-value">${beatsInRange.length}</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Beat density:</span>
                <span class="stats-value">${(beatsInRange.length / duration).toFixed(2)} beats/sec</span>
            </div>
            <div class="stats-row">
                <span class="stats-label">Avg confidence:</span>
                <span class="stats-value">${(beatsInRange.reduce((sum, b) => sum + b.confidence, 0) / beatsInRange.length).toFixed(2)}</span>
            </div>
        </div>
    </div>
</body>
</html>`;

    const suggestedFilename = `beat-viz-${interpolatedMap.audioId.replace(/[^a-z0-9]/gi, '-')}.html`;

    return { html, svg, suggestedFilename };
}

/**
 * Generate SVG content for visualization
 */
function generateSVGContent(
    beats: BeatWithSource[],
    startTime: number,
    endTime: number,
    width: number,
    height: number,
    audioId: string,
    opts: Required<VisualizationOptions>
): string {
    const duration = endTime - startTime;
    const padding = { top: 40, right: 40, bottom: 50, left: 60 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Scale function
    const scaleX = (time: number) => padding.left + ((time - startTime) / duration) * plotWidth;
    const scaleY = (conf: number) => padding.top + plotHeight - (conf * plotHeight * 0.8);

    // Generate beat markers
    const beatMarkers = beats.map(beat => {
        const x = scaleX(beat.timestamp);
        const y = scaleY(beat.confidence);
        const isDownbeat = beat.isDownbeat;
        const isDetected = beat.source === 'detected';

        const color = isDownbeat ? '#f472b6' : (isDetected ? '#4ade80' : '#60a5fa');
        const height = 10 + beat.confidence * 20;

        return `<rect
            x="${x - 2}"
            y="${y - height}"
            width="4"
            height="${height}"
            fill="${color}"
            opacity="${0.7 + beat.confidence * 0.3}"
            rx="1"
        >
            <title>${isDetected ? 'Detected' : 'Interpolated'} beat at ${beat.timestamp.toFixed(3)}s
Confidence: ${(beat.confidence * 100).toFixed(1)}%
${isDownbeat ? 'Downbeat' : ''}</title>
        </rect>`;
    }).join('\n        ');

    // Generate grid lines
    const gridLines: string[] = [];
    if (opts.showGrid) {
        // Vertical grid lines (time)
        const tickInterval = calculateTickInterval(duration, 8);
        for (let t = Math.ceil(startTime / tickInterval) * tickInterval; t <= endTime; t += tickInterval) {
            const x = scaleX(t);
            gridLines.push(`<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + plotHeight}" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>`);
            gridLines.push(`<text x="${x}" y="${padding.top + plotHeight + 20}" text-anchor="middle" fill="#64748b" font-size="11">${t.toFixed(1)}s</text>`);
        }

        // Horizontal grid lines (confidence)
        for (let c = 0; c <= 1; c += 0.25) {
            const y = scaleY(c);
            gridLines.push(`<line x1="${padding.left}" y1="${y}" x2="${padding.left + plotWidth}" y2="${y}" stroke="#334155" stroke-width="1" stroke-dasharray="4,4"/>`);
            gridLines.push(`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="10">${(c * 100).toFixed(0)}%</text>`);
        }
    }

    // Axis labels
    const axisLabels = `
        <text x="${padding.left + plotWidth / 2}" y="${height - 10}" text-anchor="middle" fill="#94a3b8" font-size="12">Time (seconds)</text>
        <text x="${15}" y="${padding.top + plotHeight / 2}" text-anchor="middle" fill="#94a3b8" font-size="12" transform="rotate(-90, 15, ${padding.top + plotHeight / 2})">Confidence</text>
    `;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <!-- Background -->
    <rect width="${width}" height="${height}" fill="#16213e"/>

    <!-- Title -->
    <text x="${width / 2}" y="25" text-anchor="middle" fill="#e2e8f0" font-size="14" font-weight="bold">${opts.title || `Beat Visualization: ${audioId}`}</text>

    <!-- Grid -->
    ${gridLines.join('\n        ')}

    <!-- Beat markers -->
    ${beatMarkers}

    <!-- Axis labels -->
    ${axisLabels}

    <!-- Plot border -->
    <rect x="${padding.left}" y="${padding.top}" width="${plotWidth}" height="${plotHeight}" fill="none" stroke="#475569" stroke-width="1" rx="4"/>
</svg>`;
}

/**
 * Generate a multi-algorithm comparison visualization
 *
 * Creates a side-by-side ASCII visualization comparing all three algorithms.
 *
 * @param comparison - The comparison result from compareInterpolationApproaches
 * @param options - Visualization options
 * @returns ASCII visualization comparing all algorithms
 *
 * @example
 * ```typescript
 * const comparison = compareInterpolationApproaches(beatMap);
 * const viz = generateAlgorithmComparisonVisualization(comparison);
 * console.log(viz);
 * ```
 */
export function generateAlgorithmComparisonVisualization(
    comparison: InterpolationComparisonResult,
    options: VisualizationOptions = {}
): string {
    const opts = { ...DEFAULT_VISUALIZATION_OPTIONS, ...options };
    const lines: string[] = [];

    lines.push('╔' + '═'.repeat(opts.width - 2) + '╗');
    lines.push('║' + centerText('Algorithm Comparison Visualization', opts.width - 2) + '║');
    lines.push('║' + centerText(`Audio: ${comparison.originalBeatMap.audioId}`, opts.width - 2) + '║');
    lines.push('╠' + '═'.repeat(opts.width - 2) + '╣');

    for (const algo of ALL_ALGORITHMS) {
        const result = comparison.results[algo];
        const detected = result.mergedBeats.filter(b => b.source === 'detected').length;
        const interpolated = result.mergedBeats.filter(b => b.source === 'interpolated').length;

        lines.push('║' + centerText(`--- ${algo} ---`, opts.width - 2) + '║');

        // Mini visualization for this algorithm
        const miniViz = buildMiniBeatLine(
            result.mergedBeats,
            opts.timeRange[0],
            Math.min(opts.timeRange[1], result.duration),
            opts.width - 4
        );
        lines.push('║ ' + miniViz + ' ║');

        lines.push('║' + ' '.repeat(opts.width - 2) + '║');
        lines.push('║' + `  Detected: ${detected.toString().padStart(4)}  Interpolated: ${interpolated.toString().padStart(4)}  Total: ${result.mergedBeats.length.toString().padStart(4)}`.padEnd(opts.width - 2) + '║');
        lines.push('║' + ' '.repeat(opts.width - 2) + '║');
    }

    // Recommendation
    lines.push('╠' + '═'.repeat(opts.width - 2) + '╣');
    lines.push('║' + centerText(`Recommended: ${comparison.recommendation.algorithm}`, opts.width - 2) + '║');
    lines.push('║' + centerText(`(${comparison.recommendation.confidence} confidence)`, opts.width - 2) + '║');
    lines.push('║' + centerText(comparison.recommendation.reason, opts.width - 2) + '║');
    lines.push('╚' + '═'.repeat(opts.width - 2) + '╝');

    return lines.join('\n');
}

/**
 * Build a mini beat line for comparison view
 */
function buildMiniBeatLine(
    beats: BeatWithSource[],
    startTime: number,
    endTime: number,
    width: number
): string {
    const duration = endTime - startTime;
    if (duration <= 0) return ' '.repeat(width);

    const chars: string[] = new Array(width).fill(' ');

    for (const beat of beats) {
        const position = Math.round(((beat.timestamp - startTime) / duration) * (width - 1));
        if (position >= 0 && position < width) {
            if (beat.isDownbeat && beat.source === 'detected') {
                chars[position] = '║';
            } else if (beat.source === 'detected') {
                chars[position] = '│';
            } else {
                chars[position] = '·';
            }
        }
    }

    return chars.join('');
}

/**
 * Center text within a given width
 */
function centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

/**
 * Generate visualization data for external plotting tools
 *
 * Exports beat data in a format suitable for plotting libraries like D3, Plotly, etc.
 *
 * @param interpolatedMap - The interpolated beat map
 * @returns Data structure suitable for plotting
 */
export function generateVisualizationData(
    interpolatedMap: InterpolatedBeatMap
): {
    /** Beat positions with metadata */
    beats: Array<{
        timestamp: number;
        confidence: number;
        source: 'detected' | 'interpolated';
        isDownbeat: boolean;
        intensity: number;
    }>;

    /** Detected beats only */
    detectedBeats: Array<{
        timestamp: number;
        confidence: number;
    }>;

    /** Interpolated beats only */
    interpolatedBeats: Array<{
        timestamp: number;
        confidence: number;
    }>;

    /** Metadata */
    metadata: {
        audioId: string;
        duration: number;
        quarterNoteBpm: number;
        quarterNoteConfidence: number;
        totalBeats: number;
        detectedCount: number;
        interpolatedCount: number;
    };
} {
    const detectedBeats = interpolatedMap.mergedBeats
        .filter(b => b.source === 'detected')
        .map(b => ({ timestamp: b.timestamp, confidence: b.confidence }));

    const interpolatedBeats = interpolatedMap.mergedBeats
        .filter(b => b.source === 'interpolated')
        .map(b => ({ timestamp: b.timestamp, confidence: b.confidence }));

    return {
        beats: interpolatedMap.mergedBeats.map(b => ({
            timestamp: b.timestamp,
            confidence: b.confidence,
            source: b.source,
            isDownbeat: b.isDownbeat,
            intensity: b.intensity,
        })),
        detectedBeats,
        interpolatedBeats,
        metadata: {
            audioId: interpolatedMap.audioId,
            duration: interpolatedMap.duration,
            quarterNoteBpm: interpolatedMap.quarterNoteBpm,
            quarterNoteConfidence: interpolatedMap.quarterNoteConfidence,
            totalBeats: interpolatedMap.mergedBeats.length,
            detectedCount: detectedBeats.length,
            interpolatedCount: interpolatedBeats.length,
        },
    };
}
