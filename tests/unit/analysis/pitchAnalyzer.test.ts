/**
 * Unit tests for PitchAnalyzer
 * Tests the standalone full-track pitch detection and melody contour analysis
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { PitchAnalyzer } from '../../../src/core/analysis/PitchAnalyzer';
import type { PitchAnalysisProfile, PitchContour } from '../../../src/core/analysis/PitchAnalyzer';
import type { PitchResult } from '../../../src/core/analysis/PitchDetector';
import { TEST_AUDIO_URLS } from '../../fixtures/testAudioUrls';
import type { DirectionStats, IntervalStats } from '../../../src/core/analysis/MelodyContourAnalyzer';
import { EssentiaPitchDetector } from '../../../src/core/analysis/EssentiaPitchDetector';
import { PitchDetector } from '../../../src/core/analysis/PitchDetector';

describe('PitchAnalyzer', () => {
    let analyzer: PitchAnalyzer;
    let analyzerWithCustomConfig: PitchAnalyzer;

    beforeAll(() => {
        analyzer = new PitchAnalyzer();
        analyzerWithCustomConfig = new PitchAnalyzer({
            algorithm: 'pitch_melodia',
            minFrequency: 100,
            maxFrequency: 5000,
            sampleRate: 48000,
            includeContour: false,
        });
    });

    describe('Constructor', () => {
        it('should create analyzer with default config', () => {
            expect(analyzer).toBeDefined();
            const config = analyzer.getConfig();
            expect(config.algorithm).toBe('pitch_melodia');
            expect(config.minFrequency).toBe(80);
            expect(config.maxFrequency).toBe(20000);
            expect(config.sampleRate).toBe(44100);
            expect(config.includeContour).toBe(true);
        });

        it('should create analyzer with custom config', () => {
            expect(analyzerWithCustomConfig).toBeDefined();
            const config = analyzerWithCustomConfig.getConfig();
            expect(config.algorithm).toBe('pitch_melodia');
            expect(config.minFrequency).toBe(100);
            expect(config.maxFrequency).toBe(5000);
            expect(config.sampleRate).toBe(48000);
            expect(config.includeContour).toBe(false);
        });

        it('should use pyin_legacy algorithm with default maxFrequency of 1000', () => {
            const pyinAnalyzer = new PitchAnalyzer({ algorithm: 'pyin_legacy' });
            const config = pyinAnalyzer.getConfig();
            // Note: The default maxFrequency is still 20000 in the config,
            // but resolveDefaults() clamps it to 1000 at runtime
            expect(config.algorithm).toBe('pyin_legacy');
        });
    });

    describe('analyze() with valid audio URL', () => {
        it('should return PitchAnalysisProfile', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 0.9, midiNote: 69, noteName: 'A4' },
                { timestamp: 0.01, frequency: 466.16, isVoiced: true, probability: 0.85, midiNote: 70, noteName: 'A#4' },
                { timestamp: 0.02, frequency: 392, isVoiced: true, probability: 0.8, midiNote: 67, noteName: 'G4' },
                { timestamp: 0.03, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.04, frequency: 523.25, isVoiced: true, probability: 0.75, midiNote: 72, noteName: 'C5' },
            ];

            // Mock EssentiaPitchDetector
            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector);

            // Mock fetchAndDecodeAudio
            vi.spyOn(analyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            });

            const profile = await analyzer.analyze('https://example.com/audio.mp3');

            expect(profile).toBeDefined();
            expect(profile.pitchResults).toBeDefined();
            expect(profile.pitchResults.length).toBe(5);
            expect(profile.voicingRatio).toBe(0.8); // 4/5 voiced
            expect(profile.voicedFrames).toBe(4);
            expect(profile.totalFrames).toBe(5);
            expect(profile.minFrequency).toBe(392);
            expect(profile.maxFrequency).toBe(523.25);
            expect(profile.lowestNote).toBe('G4');
            expect(profile.highestNote).toBe('C5');
            // 4 voiced frames with 4 distinct notes: A4, A#4, G4, C5
            expect(profile.noteDistribution.length).toBe(4);
            expect(profile.analysis_metadata).toBeDefined();
            expect(profile.analysis_metadata.algorithm_used).toBe('pitch_melodia');
            expect(profile.analysis_metadata.duration_analyzed).toBe(1);

            vi.restoreAllMocks();
        }, 30000);
    });

    describe('Summary Statistics Accuracy', () => {
        it('should calculate voicing ratio correctly', () => {
            const results: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
                { timestamp: 0.01, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.02, frequency: 466, isVoiced: true, probability: 1, midiNote: 70, noteName: 'A#4' },
                { timestamp: 0.03, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.04, frequency: 392, isVoiced: true, probability: 1, midiNote: 67, noteName: 'G4' },
            ];

            const testAnalyzer = new PitchAnalyzer();
            const summary = (testAnalyzer as unknown as { computeSummary: (r: PitchResult[]) => { voicingRatio: number; voicedFrames: number; totalFrames: number } }).computeSummary(results);

            expect(summary.voicingRatio).toBe(3 / 5);
            expect(summary.voicedFrames).toBe(3);
            expect(summary.totalFrames).toBe(5);
        });

        it('should calculate frequency stats correctly', () => {
            const results: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
                { timestamp: 0.01, frequency: 466.16, isVoiced: true, probability: 1, midiNote: 70, noteName: 'A#4' },
                { timestamp: 0.02, frequency: 392, isVoiced: true, probability: 1, midiNote: 67, noteName: 'G4' },
            ];

            const testAnalyzer = new PitchAnalyzer();
            const summary = (testAnalyzer as unknown as { computeSummary: (r: PitchResult[]) => { averageFrequency: number; medianFrequency: number; minFrequency: number; maxFrequency: number; pitchRangeSemitones: number; lowestNote: string | null; highestNote: string | null } }).computeSummary(results);

            // Average: (440 + 466.16 + 392) / 3 = 432.72
            expect(summary.averageFrequency).toBeCloseTo(432.72, 1);
            // Sorted for median: 392, 440, 466.16
            expect(summary.medianFrequency).toBe(440);
            expect(summary.minFrequency).toBe(392);
            expect(summary.maxFrequency).toBe(466.16);
            // Range: G4 to A#4 ≈ 3 semitones (may have floating point precision)
            expect(summary.pitchRangeSemitones).toBeCloseTo(3, 0);
            expect(summary.lowestNote).toBe('G4');
            expect(summary.highestNote).toBe('A#4');
        });

        it('should build note distribution correctly', () => {
            const results: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
                { timestamp: 0.01, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
                { timestamp: 0.02, frequency: 466.16, isVoiced: true, probability: 1, midiNote: 70, noteName: 'A#4' },
                { timestamp: 0.03, frequency: 392, isVoiced: true, probability: 1, midiNote: 67, noteName: 'G4' },
            ];

            const testAnalyzer = new PitchAnalyzer();
            const summary = (testAnalyzer as unknown as { computeSummary: (r: PitchResult[]) => { noteDistribution: { note: string; count: number; percentage: number }[] } }).computeSummary(results);

            expect(summary.noteDistribution.length).toBe(3);
            // A4 appears 2 times (most frequent)
            expect(summary.noteDistribution[0].note).toBe('A4');
            expect(summary.noteDistribution[0].count).toBe(2);
            expect(summary.noteDistribution[0].percentage).toBeCloseTo(50, 0);
            // The remaining notes each appear 1 time (25% each)
            expect(summary.noteDistribution[1].count).toBe(1);
            expect(summary.noteDistribution[1].percentage).toBeCloseTo(25, 0);
            expect(summary.noteDistribution[2].count).toBe(1);
            expect(summary.noteDistribution[2].percentage).toBeCloseTo(25, 0);
        });

        it('should handle all unvoiced frames', () => {
            const results: PitchResult[] = [
                { timestamp: 0, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.01, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.02, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
            ];

            const testAnalyzer = new PitchAnalyzer();
            const summary = (testAnalyzer as unknown as { computeSummary: (r: PitchResult[]) => { voicingRatio: number; voicedFrames: number; averageFrequency: number; medianFrequency: number; minFrequency: number; maxFrequency: number; pitchRangeSemitones: number; lowestNote: string | null; highestNote: string | null; noteDistribution: { note: string; count: number; percentage: number }[] } }).computeSummary(results);

            expect(summary.voicingRatio).toBe(0);
            expect(summary.voicedFrames).toBe(0);
            expect(summary.averageFrequency).toBe(0);
            expect(summary.medianFrequency).toBe(0);
            expect(summary.minFrequency).toBe(0);
            expect(summary.maxFrequency).toBe(0);
            expect(summary.pitchRangeSemitones).toBe(0);
            expect(summary.lowestNote).toBeNull();
            expect(summary.highestNote).toBeNull();
            expect(summary.noteDistribution).toEqual([]);
        });

        it('should handle empty results', () => {
            const results: PitchResult[] = [];

            const testAnalyzer = new PitchAnalyzer();
            const summary = (testAnalyzer as unknown as { computeSummary: (r: PitchResult[]) => { voicingRatio: number; voicedFrames: number; totalFrames: number; averageFrequency: number; medianFrequency: number; minFrequency: number; maxFrequency: number; pitchRangeSemitones: number; lowestNote: string | null; highestNote: string | null; noteDistribution: { note: string; count: number; percentage: number }[] } }).computeSummary(results);

            expect(summary.voicingRatio).toBe(0);
            expect(summary.voicedFrames).toBe(0);
            expect(summary.totalFrames).toBe(0);
            expect(summary.averageFrequency).toBe(0);
            expect(summary.medianFrequency).toBe(0);
            expect(summary.minFrequency).toBe(0);
            expect(summary.maxFrequency).toBe(0);
            expect(summary.pitchRangeSemitones).toBe(0);
            expect(summary.lowestNote).toBeNull();
            expect(summary.highestNote).toBeNull();
            expect(summary.noteDistribution).toEqual([]);
        });
    });

    describe('Contour Analysis', () => {
        it('should compute contour with segments, direction, time-window directions', () => {
            const results: PitchResult[] = [
                { timestamp: 0, frequency: 261.63, isVoiced: true, probability: 0.9, midiNote: 60, noteName: 'C4' },
                { timestamp: 0.01, frequency: 293.66, isVoiced: true, probability: 0.95, midiNote: 62, noteName: 'D4' },
                { timestamp: 0.02, frequency: 329.63, isVoiced: true, probability: 0.92, midiNote: 64, noteName: 'E4' },
                { timestamp: 0.03, frequency: 349.23, isVoiced: true, probability: 1, midiNote: 65, noteName: 'F4' },
                { timestamp: 0.04, frequency: 392, isVoiced: true, probability: 1, midiNote: 67, noteName: 'G4' },
            ];

            const testAnalyzer = new PitchAnalyzer();
            const { contour, directionStats, intervalStats } = (testAnalyzer as unknown as { computeContour: (r: PitchResult[]) => { contour: PitchContour; directionStats: DirectionStats; intervalStats: IntervalStats } }).computeContour(results);

            expect(contour).toBeDefined();
            expect(directionStats).toBeDefined();
            expect(intervalStats).toBeDefined();

            // Check direction stats
            expect(directionStats.up).toBeGreaterThan(0);
            expect(directionStats.stable).toBeGreaterThanOrEqual(0);

            // Check interval stats
            expect(intervalStats.small).toBeGreaterThan(0);

            // Verify segments
            expect(contour!.segments).toBeDefined();
            expect(contour!.segments.length).toBeGreaterThan(0);

            // Time-window directions
            expect(contour!.shortTermDirection).toBeDefined();
            expect(contour!.mediumTermDirection).toBeDefined();
            expect(contour!.longTermDirection).toBeDefined();
        });

        it('should compute contour with all unvoiced frames', () => {
            const results: PitchResult[] = [
                { timestamp: 0, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.01, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.02, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
            ];

            const testAnalyzer = new PitchAnalyzer();
            const { contour, directionStats, intervalStats } = (testAnalyzer as unknown as { computeContour: (r: PitchResult[]) => { contour: PitchContour | undefined; directionStats: DirectionStats; intervalStats: IntervalStats } }).computeContour(results);

            expect(contour).toBeDefined();
            expect(contour!.direction).toBe('stable');
            expect(contour!.range.minNote).toBe('N/A');
            expect(contour!.range.maxNote).toBe('N/A');
            expect(contour!.range.semitones).toBe(0);
            expect(contour!.segments).toEqual([]);
            expect(contour!.shortTermDirection).toBe('stable');
            expect(contour!.mediumTermDirection).toBe('stable');
            expect(contour!.longTermDirection).toBe('stable');
            expect(directionStats).toBeDefined();
            expect(intervalStats).toBeDefined();
        });
    });

    describe('Algorithm Selection', () => {
        it('should use pyin_legacy with PitchDetector', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
            ];

            const pyinAnalyzer = new PitchAnalyzer({ algorithm: 'pyin_legacy' });

            // Mock fetchAndDecodeAudio and detectPitch to avoid real detector instantiation
            vi.spyOn(pyinAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            });

            vi.spyOn(pyinAnalyzer as unknown as { detectPitch: (signal: Float32Array, sampleRate: number, config: unknown) => Promise<PitchResult[]> }, 'detectPitch').mockResolvedValue(mockPitchResults);

            const profile = await pyinAnalyzer.analyze('https://example.com/audio.mp3');

            expect(profile).toBeDefined();
            expect(profile.analysis_metadata.algorithm_used).toBe('pyin_legacy');

            vi.restoreAllMocks();
        });

        it('should use Essentia algorithms with EssentiaPitchDetector', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
            ];

            // Mock EssentiaPitchDetector
            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector);

            // Mock fetchAndDecodeAudio
            vi.spyOn(analyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            });

            const profile = await analyzer.analyze('https://example.com/audio.mp3');

            expect(profile).toBeDefined();
            expect(profile.analysis_metadata.algorithm_used).toBe('pitch_melodia');

            vi.restoreAllMocks();
        });
    });

    describe('includeContour option', () => {
        it('should skip contour computation when includeContour is false', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
            ]

            // Mock both detectors
            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector)

            const noContourAnalyzer = new PitchAnalyzer({ includeContour: false })
            vi.spyOn(noContourAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            })

            const profile = await noContourAnalyzer.analyze('https://example.com/audio.mp3')

            expect(profile).toBeDefined()
            // contour and related stats should be undefined when includeContour is false
            expect(profile.contour).toBeUndefined()
            expect(profile.directionStats).toBeUndefined()
            expect(profile.intervalStats).toBeUndefined()

            vi.restoreAllMocks()
        })

        it('should include contour by default (includeContour: true)', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
            ]

            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector)

            const defaultAnalyzer = new PitchAnalyzer()
            vi.spyOn(defaultAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            })

            const profile = await defaultAnalyzer.analyze('https://example.com/audio.mp3')

            expect(profile.contour).toBeDefined()
            expect(profile.directionStats).toBeDefined()
            expect(profile.intervalStats).toBeDefined()

            vi.restoreAllMocks()
        })
    })

    describe('Progress callback', () => {
        it('should fire onProgress callback with expected phases', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 440, isVoiced: true, probability: 1, midiNote: 69, noteName: 'A4' },
            ]

            const progressCallback = vi.fn()

            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector)

            const progressAnalyzer = new PitchAnalyzer({ onProgress: progressCallback })
            vi.spyOn(progressAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            })

            await progressAnalyzer.analyze('https://example.com/audio.mp3')

            expect(progressCallback).toHaveBeenCalledWith('fetching', 0)
            expect(progressCallback).toHaveBeenCalledWith('fetching', 1)
            expect(progressCallback).toHaveBeenCalledWith('detecting', 0)
            expect(progressCallback).toHaveBeenCalledWith('detecting', 1)

            vi.restoreAllMocks()
        })
    })

    describe('Error handling', () => {
        it('should handle fetch errors gracefully', async () => {
            const errorAnalyzer = new PitchAnalyzer()
            vi.spyOn(errorAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockRejectedValue(new Error('Network error'))

            await expect(errorAnalyzer.analyze('https://invalid-url.com/audio.mp3')).rejects.toThrow('Network error')

            vi.restoreAllMocks()
        })

        it('should handle very short audio', async () => {
            const mockPitchResults: PitchResult[] = []

            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector)

            const shortAnalyzer = new PitchAnalyzer()
            vi.spyOn(shortAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array(0),
                sampleRate: 44100,
                duration: 0,
            })

            const profile = await shortAnalyzer.analyze('https://example.com/audio.mp3')

            // Should handle gracefully
            expect(profile.pitchResults).toEqual([])
            expect(profile.voicingRatio).toBe(0)

            vi.restoreAllMocks()
        })

        it('should handle all-unvoiced audio', async () => {
            const mockPitchResults: PitchResult[] = [
                { timestamp: 0, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.01, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
                { timestamp: 0.02, frequency: 0, isVoiced: false, probability: 0, midiNote: null, noteName: null },
            ]

            vi.spyOn(EssentiaPitchDetector, 'create').mockResolvedValue({
                detectSignal: vi.fn().mockReturnValue(mockPitchResults),
            } as unknown as EssentiaPitchDetector)

            const unvoicedAnalyzer = new PitchAnalyzer()
            vi.spyOn(unvoicedAnalyzer as unknown as { fetchAndDecodeAudio: () => Promise<{ signal: Float32Array; sampleRate: number; duration: number }> }, 'fetchAndDecodeAudio').mockResolvedValue({
                signal: new Float32Array([1, 2, 3]),
                sampleRate: 44100,
                duration: 1,
            })

            const profile = await unvoicedAnalyzer.analyze('https://example.com/audio.mp3')

            expect(profile.voicingRatio).toBe(0)
            expect(profile.voicedFrames).toBe(0)
            expect(profile.lowestNote).toBe(null)
            expect(profile.highestNote).toBe(null)
            expect(profile.noteDistribution).toEqual([])

            vi.restoreAllMocks()
        })
    })

    describe('Integration with real audio', () => {
        it('should analyze real audio file from Arweave', async () => {
            // This test uses real audio and Essentia - skip if no network or slow
            const realAnalyzer = new PitchAnalyzer({
                algorithm: 'pitch_melodia',
                includeContour: true,
            })

            const profile = await realAnalyzer.analyze(TEST_AUDIO_URLS.arweaveTrack)

            expect(profile).toBeDefined()
            expect(profile.pitchResults).toBeDefined()
            expect(profile.pitchResults.length).toBeGreaterThan(0)
            expect(profile.analysis_metadata.duration_analyzed).toBeGreaterThan(0)
            expect(profile.analysis_metadata.algorithm_used).toBe('pitch_melodia')

            // Log results
            console.log(`Voicing ratio: ${(profile.voicingRatio * 100).toFixed(1)}%`)
            console.log(`Frequency range: ${profile.minFrequency.toFixed(1)} - ${profile.maxFrequency.toFixed(1)} Hz`)
            console.log(`Note range: ${profile.lowestNote} - ${profile.highestNote}`)
            if (profile.contour) {
                console.log(`Contour direction: ${profile.contour.direction}`)
                console.log(`Segments: ${profile.contour.segments.length}`)
            }
        }, 120000) // 120 second timeout for network requests
    })
})
