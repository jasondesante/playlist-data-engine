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
