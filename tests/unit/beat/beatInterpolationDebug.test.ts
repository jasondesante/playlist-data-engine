/**
 * Tests for Beat Interpolation Debug Utility
 *
 * Tests the debug output functions including:
 * - Histogram data collection
 * - Gap detail collection
 * - Beat debug info collection
 * - Tempo drift data collection
 * - Debug report generation
 * - Output formatters
 */

import { describe, it, expect } from 'vitest';
import { BeatInterpolator } from '../../../src/core/analysis/beat/BeatInterpolator.js';
import type { Beat, BeatMap, BeatMapMetadata, BeatWithSource, InterpolatedBeatMap } from '../../../src/core/types/BeatMap.js';
import { BEAT_DETECTION_VERSION, BEAT_DETECTION_ALGORITHM } from '../../../src/core/types/BeatMap.js';
import {
    generateDebugReport,
    collectHistogramData,
    collectGapDetails,
    collectBeatDebugInfo,
    collectTempoDriftData,
    formatDebugReportToConsole,
    formatDebugReportToJSON,
    generateTempoDriftVisualization,
    generateConfidenceVisualization,
    BeatInterpolationDebug,
    DEFAULT_DEBUG_OUTPUT_OPTIONS,
} from '../../../src/core/analysis/beat/utils/beatInterpolationDebug.js';
import type {
    InterpolationDebugReport,
    HistogramEntry,
    GapDetail,
    BeatDebugInfo,
    TempoDriftPoint,
} from '../../../src/core/analysis/beat/utils/beatInterpolationDebug.js';

// Helper to create a beat with default values
function createBeat(
    timestamp: number,
    options: Partial<Beat> = {}
): Beat {
    return {
        timestamp,
        beatInMeasure: 0,
        isDownbeat: false,
        measureNumber: 0,
        intensity: 0.8,
        confidence: 0.9,
        ...options,
    };
}

// Helper to create a beat map
function createBeatMap(
    beats: Beat[],
    duration: number,
    bpm: number = 120
): BeatMap {
    const metadata: BeatMapMetadata = {
        version: BEAT_DETECTION_VERSION,
        algorithm: BEAT_DETECTION_ALGORITHM,
        minBpm: 60,
        maxBpm: 180,
        sensitivity: 1.0,
        filter: 0.0,
        noiseFloorThreshold: 0.1,
        hopSizeMs: 4,
        fftSize: 2048,
        dpAlpha: 680,
        melBands: 40,
        highPassCutoff: 0.4,
        gaussianSmoothMs: 20,
        tempoCenter: 0.5,
        tempoWidth: 1.4,
        generatedAt: new Date().toISOString(),
    };

    return {
        audioId: 'test-audio-id',
        duration,
        beats,
        bpm,
        metadata,
    };
}

// Helper to create beats at regular intervals
function createRegularBeats(
    bpm: number,
    durationSeconds: number,
    startOffset: number = 0
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let time = startOffset; time < durationSeconds; time += interval) {
        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
    }

    return beats;
}

// Helper to create beats with gaps
function createBeatsWithGaps(
    bpm: number,
    durationSeconds: number,
    gapIndices: number[]
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;
    let beatIndex = 0;

    for (let time = 0; time < durationSeconds; time += interval) {
        if (gapIndices.includes(beatIndex)) {
            beatIndex++;
            continue;
        }

        beats.push(createBeat(time, {
            beatInMeasure: beats.length % 4,
            isDownbeat: beats.length % 4 === 0,
            measureNumber: Math.floor(beats.length / 4),
        }));
        beatIndex++;
    }

    return beats;
}

describe('Beat Interpolation Debug Utility', () => {
    describe('collectHistogramData', () => {
        it('should return empty array for less than 2 beats', () => {
            const beats = [createBeat(0)];
            const histogram = collectHistogramData(beats, 0.5);

            expect(histogram).toEqual([]);
        });

        it('should create histogram entries for intervals', () => {
            const beats = createRegularBeats(120, 2); // 0.5s intervals
            const histogram = collectHistogramData(beats, 0.5);

            expect(histogram.length).toBeGreaterThan(0);

            // Should have a primary peak
            const primaryPeak = histogram.find(h => h.isPrimaryPeak);
            expect(primaryPeak).toBeDefined();
            expect(primaryPeak!.intervalSeconds).toBeCloseTo(0.5, 2);
        });

        it('should calculate BPM for each interval', () => {
            const beats = createRegularBeats(120, 2);
            const histogram = collectHistogramData(beats, 0.5);

            for (const entry of histogram) {
                if (entry.intervalSeconds > 0) {
                    expect(entry.bpm).toBeCloseTo(60 / entry.intervalSeconds, 1);
                }
            }
        });

        it('should identify primary peak near quarter note', () => {
            const beats = createRegularBeats(120, 5);
            const histogram = collectHistogramData(beats, 0.5);

            const primaryPeak = histogram.find(h => h.isPrimaryPeak);
            expect(primaryPeak).toBeDefined();
            expect(primaryPeak!.intervalSeconds).toBeCloseTo(0.5, 1);
        });

        it('should identify secondary peaks for different intervals', () => {
            // Create beats with some 2x intervals (half-note gaps)
            const beats = [
                createBeat(0),
                createBeat(0.5),
                createBeat(1.0),
                createBeat(2.0), // Gap
                createBeat(2.5),
                createBeat(3.0),
                createBeat(4.0), // Another gap
                createBeat(4.5),
            ];

            const histogram = collectHistogramData(beats, 0.5);

            // Should have primary peak at 0.5s
            const primaryPeak = histogram.find(h => h.isPrimaryPeak);
            expect(primaryPeak).toBeDefined();
        });
    });

    describe('collectGapDetails', () => {
        it('should return empty array when no gaps', () => {
            const detectedBeats = createRegularBeats(120, 2);
            const mergedBeats: BeatWithSource[] = detectedBeats.map(b => ({
                ...b,
                source: 'detected' as const,
                distanceToAnchor: 0,
                nearestAnchorTimestamp: b.timestamp,
            }));

            const gaps = collectGapDetails(detectedBeats, mergedBeats, 0.5, []);

            // Regular beats shouldn't create gaps > 1.2 quarter notes
            expect(gaps.every(g => g.quarterNotesInGap <= 1.2)).toBe(true);
        });

        it('should identify gaps between beats', () => {
            const detectedBeats = [
                createBeat(0),
                createBeat(0.5),
                createBeat(1.0),
                createBeat(2.0), // Gap - 1.0s = 2 quarter notes
                createBeat(2.5),
            ];
            const mergedBeats: BeatWithSource[] = [
                ...detectedBeats.map(b => ({
                    ...b,
                    source: 'detected' as const,
                    distanceToAnchor: 0,
                    nearestAnchorTimestamp: b.timestamp,
                })),
                {
                    ...createBeat(1.5),
                    source: 'interpolated' as const,
                    distanceToAnchor: 0.5,
                    nearestAnchorTimestamp: 1.0,
                },
            ];

            const gaps = collectGapDetails(detectedBeats, mergedBeats, 0.5, []);

            // Should find the gap between 1.0 and 2.0
            const largeGap = gaps.find(g => g.duration > 0.8);
            expect(largeGap).toBeDefined();
            expect(largeGap!.startTime).toBeCloseTo(1.0, 2);
            expect(largeGap!.endTime).toBeCloseTo(2.0, 2);
        });

        it('should identify half-note gaps', () => {
            const detectedBeats = [
                createBeat(0),
                createBeat(0.5),
                createBeat(1.0),
                createBeat(2.0), // 1.0s gap = exactly 2 quarter notes
                createBeat(2.5),
            ];
            const mergedBeats: BeatWithSource[] = detectedBeats.map(b => ({
                ...b,
                source: 'detected' as const,
                distanceToAnchor: 0,
                nearestAnchorTimestamp: b.timestamp,
            }));

            const gaps = collectGapDetails(detectedBeats, mergedBeats, 0.5, []);

            const halfNoteGap = gaps.find(g => g.isHalfNoteGap);
            expect(halfNoteGap).toBeDefined();
        });

        it('should mark gaps with anomalies', () => {
            const detectedBeats = [
                createBeat(0),
                createBeat(0.5),
                createBeat(1.0),
                createBeat(2.0),
                createBeat(2.5),
            ];
            const mergedBeats: BeatWithSource[] = detectedBeats.map(b => ({
                ...b,
                source: 'detected' as const,
                distanceToAnchor: 0,
                nearestAnchorTimestamp: b.timestamp,
            }));

            // Mark beat at index 3 (timestamp 2.0) as anomaly
            const gaps = collectGapDetails(detectedBeats, mergedBeats, 0.5, [3]);

            const gapWithAnomaly = gaps.find(g => g.hasAnomalies);
            expect(gapWithAnomaly).toBeDefined();
        });
    });

    describe('collectBeatDebugInfo', () => {
        it('should collect info for each beat', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.5), source: 'interpolated', distanceToAnchor: 0.5, nearestAnchorTimestamp: 0 },
                { ...createBeat(1.0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 1.0 },
            ];

            const beatInfos = collectBeatDebugInfo(mergedBeats, 0.5);

            expect(beatInfos.length).toBe(3);
            expect(beatInfos[0].source).toBe('detected');
            expect(beatInfos[1].source).toBe('interpolated');
        });

        it('should calculate local tempo', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.5), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.5 },
            ];

            const beatInfos = collectBeatDebugInfo(mergedBeats, 0.5);

            // 0.5s interval = 120 BPM
            expect(beatInfos[1].localTempo).toBeCloseTo(120, 0);
        });

        it('should calculate grid alignment error', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.52), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.52 },
            ];

            const beatInfos = collectBeatDebugInfo(mergedBeats, 0.5);

            // 0.52 should have ~0.02s grid alignment error (expected 0.5)
            expect(beatInfos[1].gridAlignmentError).toBeCloseTo(0.02, 2);
        });

        it('should calculate interval from previous beat', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.5), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.5 },
            ];

            const beatInfos = collectBeatDebugInfo(mergedBeats, 0.5);

            expect(beatInfos[0].intervalFromPrevious).toBeNull();
            expect(beatInfos[1].intervalFromPrevious).toBeCloseTo(0.5, 2);
        });
    });

    describe('collectTempoDriftData', () => {
        it('should return base tempo when only one beat', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
            ];

            const driftData = collectTempoDriftData(mergedBeats, 120);

            expect(driftData.minTempo).toBe(120);
            expect(driftData.maxTempo).toBe(120);
            expect(driftData.driftRatio).toBeCloseTo(1.0, 2);
        });

        it('should calculate tempo drift ratio', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.5), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.5 },
                { ...createBeat(0.9), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.9 }, // Faster tempo
            ];

            const driftData = collectTempoDriftData(mergedBeats, 120);

            expect(driftData.minTempo).toBeLessThan(driftData.maxTempo);
            expect(driftData.driftRatio).toBeGreaterThan(1.0);
        });

        it('should create data points for each beat', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.5), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.5 },
                { ...createBeat(1.0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 1.0 },
            ];

            const driftData = collectTempoDriftData(mergedBeats, 120);

            expect(driftData.dataPoints.length).toBe(3);
        });

        it('should calculate deviation percent from base tempo', () => {
            const mergedBeats: BeatWithSource[] = [
                { ...createBeat(0), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0 },
                { ...createBeat(0.4), source: 'detected', distanceToAnchor: 0, nearestAnchorTimestamp: 0.4 }, // 150 BPM
            ];

            const driftData = collectTempoDriftData(mergedBeats, 120);
            const lastPoint = driftData.dataPoints[1];

            // 150 BPM is +25% from 120 BPM
            expect(lastPoint.deviationPercent).toBeCloseTo(25, 0);
        });
    });

    describe('generateDebugReport', () => {
        it('should generate a complete debug report', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);

            expect(report.audioId).toBe('test-audio-id');
            expect(report.duration).toBe(5);
            expect(report.generatedAt).toBeDefined();
        });

        it('should include quarter note detection info', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);

            expect(report.quarterNoteDetection.intervalSeconds).toBeCloseTo(0.5, 2);
            expect(report.quarterNoteDetection.bpm).toBeCloseTo(120, 0);
            expect(report.quarterNoteDetection.confidence).toBeGreaterThan(0);
            expect(report.quarterNoteDetection.method).toBeDefined();
        });

        it('should include gap analysis info', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);

            expect(report.gapAnalysis.gridAlignmentScore).toBeGreaterThanOrEqual(0);
            expect(report.gapAnalysis.gridAlignmentScore).toBeLessThanOrEqual(1);
        });

        it('should include summary statistics', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);

            expect(report.summary.detectedBeatCount).toBe(beats.length);
            expect(report.summary.totalBeatCount).toBeGreaterThan(0);
            expect(report.summary.beatsPerSecond).toBeGreaterThan(0);
        });

        it('should respect maxBeats option', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 10); // ~20 beats
            const beatMap = createBeatMap(beats, 10, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap, { maxBeats: 5 });

            expect(report.beats.length).toBeLessThanOrEqual(5);
        });

        it('should skip histogram when disabled', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap, { includeHistogram: false });

            expect(report.quarterNoteDetection.histogram).toEqual([]);
        });

        it('should skip beat details when disabled', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap, { includeBeatDetails: false });

            expect(report.beats).toEqual([]);
        });

        it('should skip tempo drift when disabled', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap, { includeTempoDrift: false });

            expect(report.tempoDrift.dataPoints).toEqual([]);
        });
    });

    describe('formatDebugReportToConsole', () => {
        it('should generate human-readable output', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const consoleOutput = formatDebugReportToConsole(report);

            expect(consoleOutput).toContain('BEAT INTERPOLATION DEBUG REPORT');
            expect(consoleOutput).toContain('Audio ID: test-audio-id');
            expect(consoleOutput).toContain('SUMMARY');
            expect(consoleOutput).toContain('QUARTER NOTE DETECTION');
            expect(consoleOutput).toContain('GAP ANALYSIS');
            expect(consoleOutput).toContain('TEMPO DRIFT');
        });

        it('should include BPM in output', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const consoleOutput = formatDebugReportToConsole(report);

            expect(consoleOutput).toContain('BPM:');
        });

        it('should include beat details table header', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const consoleOutput = formatDebugReportToConsole(report);

            expect(consoleOutput).toContain('BEAT DETAILS');
            expect(consoleOutput).toContain('Index');
            expect(consoleOutput).toContain('Time');
            expect(consoleOutput).toContain('Source');
        });
    });

    describe('formatDebugReportToJSON', () => {
        it('should generate valid JSON', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const jsonOutput = formatDebugReportToJSON(report);

            // Should not throw
            const parsed = JSON.parse(jsonOutput);
            expect(parsed.audioId).toBe('test-audio-id');
        });

        it('should include all sections', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const jsonOutput = formatDebugReportToJSON(report);
            const parsed = JSON.parse(jsonOutput);

            expect(parsed.quarterNoteDetection).toBeDefined();
            expect(parsed.gapAnalysis).toBeDefined();
            expect(parsed.tempoDrift).toBeDefined();
            expect(parsed.summary).toBeDefined();
        });
    });

    describe('generateTempoDriftVisualization', () => {
        it('should generate visualization for multiple beats', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const viz = generateTempoDriftVisualization(report);

            expect(viz).toContain('TEMPO DRIFT VISUALIZATION');
            expect(viz).toContain('Base tempo');
        });

        it('should return message for insufficient data', () => {
            const report: InterpolationDebugReport = {
                audioId: 'test',
                duration: 1,
                algorithm: 'dual-pass',
                generatedAt: new Date().toISOString(),
                quarterNoteDetection: {
                    intervalSeconds: 0.5,
                    bpm: 120,
                    confidence: 0.8,
                    method: 'histogram',
                    denseSectionCount: 1,
                    denseSectionBeats: 1,
                    histogram: [],
                },
                gapAnalysis: {
                    totalGaps: 0,
                    halfNoteGaps: 0,
                    anomalyCount: 0,
                    anomalyIndices: [],
                    avgGapSize: 1,
                    gridAlignmentScore: 1,
                    gaps: [],
                },
                beats: [],
                tempoDrift: {
                    baseTempo: 120,
                    minTempo: 120,
                    maxTempo: 120,
                    driftRatio: 1,
                    dataPoints: [],
                },
                summary: {
                    detectedBeatCount: 0,
                    interpolatedBeatCount: 0,
                    totalBeatCount: 0,
                    interpolationRatio: 0,
                    avgInterpolatedConfidence: 0,
                    avgDetectedConfidence: 0,
                    beatsPerSecond: 0,
                },
            };

            const viz = generateTempoDriftVisualization(report);
            expect(viz).toContain('Not enough data points');
        });
    });

    describe('generateConfidenceVisualization', () => {
        it('should generate visualization for multiple beats', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);
            const viz = generateConfidenceVisualization(report);

            expect(viz).toContain('CONFIDENCE VISUALIZATION');
            expect(viz).toContain('Legend');
        });
    });

    describe('BeatInterpolationDebug class', () => {
        it('should create instance from interpolated beat map', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const debug = new BeatInterpolationDebug(interpolatedBeatMap);

            expect(debug.getReport()).toBeDefined();
            expect(debug.toConsole()).toContain('BEAT INTERPOLATION DEBUG REPORT');
            expect(debug.toJSON()).toBeDefined();
        });

        it('should return tempo drift visualization', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const debug = new BeatInterpolationDebug(interpolatedBeatMap);
            const viz = debug.getTempoDriftVisualization();

            expect(viz).toContain('TEMPO DRIFT VISUALIZATION');
        });

        it('should return confidence visualization', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const debug = new BeatInterpolationDebug(interpolatedBeatMap);
            const viz = debug.getConfidenceVisualization();

            expect(viz).toContain('CONFIDENCE VISUALIZATION');
        });

        it('should accept options', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const debug = new BeatInterpolationDebug(interpolatedBeatMap, {
                maxBeats: 3,
                includeHistogram: false,
            });

            const report = debug.getReport();
            expect(report.beats.length).toBeLessThanOrEqual(3);
            expect(report.quarterNoteDetection.histogram).toEqual([]);
        });
    });

    describe('DEFAULT_DEBUG_OUTPUT_OPTIONS', () => {
        it('should have expected default values', () => {
            expect(DEFAULT_DEBUG_OUTPUT_OPTIONS.maxBeats).toBe(0);
            expect(DEFAULT_DEBUG_OUTPUT_OPTIONS.includeHistogram).toBe(true);
            expect(DEFAULT_DEBUG_OUTPUT_OPTIONS.includeGapDetails).toBe(true);
            expect(DEFAULT_DEBUG_OUTPUT_OPTIONS.includeBeatDetails).toBe(true);
            expect(DEFAULT_DEBUG_OUTPUT_OPTIONS.includeTempoDrift).toBe(true);
            expect(DEFAULT_DEBUG_OUTPUT_OPTIONS.histogramBucketSize).toBe(0.005);
        });
    });

    describe('Integration: Debug with interpolation approaches', () => {
        it('should work with default algorithm (adaptive-phase-locked)', () => {
            const interpolator = new BeatInterpolator();
            const beats = createRegularBeats(120, 5);
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);

            // Verify the report was generated successfully
            expect(report.audioId).toBe('test-audio-id');
            expect(report.summary.totalBeatCount).toBeGreaterThan(0);
        });

        it('should show gaps in beat map with missing beats', () => {
            const interpolator = new BeatInterpolator();
            const beats = createBeatsWithGaps(120, 5, [5, 10, 15]); // Remove some beats
            const beatMap = createBeatMap(beats, 5, 120);
            const interpolatedBeatMap = interpolator.interpolate(beatMap);

            const report = generateDebugReport(interpolatedBeatMap);

            // Should have interpolated beats to fill gaps
            expect(report.summary.interpolatedBeatCount).toBeGreaterThan(0);
            expect(report.summary.interpolationRatio).toBeGreaterThan(0);
        });
    });
});
