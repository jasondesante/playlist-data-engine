/**
 * Unit tests for MelodyContourAnalyzer
 *
 * Tests the melody contour analysis functionality including:
 * - Pitch-to-pitch comparison
 * - Direction calculation (up/down/stable/none)
 * - Interval calculation and categorization
 * - Segment detection
 * - Overall contour determination
 */

import { describe, it, expect } from 'vitest';
import {
    MelodyContourAnalyzer,
    categorizeInterval,
    calculateIntervalSemitones,
    determineDirection,
    determineOverallDirection,
    midiToNoteName,
    type MelodyContourAnalyzerConfig,
} from './MelodyContourAnalyzer.js';
import type { PitchAtBeat } from '../generation/PitchBeatLinker.js';
import type { PitchResult } from './PitchDetector.js';

describe('MelodyContourAnalyzer', () => {
    // Helper to create a mock pitch result
    function createMockPitchResult(
        frequency: number,
        midiNote: number | null,
        noteName: string | null,
        isVoiced: boolean = true,
        probability: number = 0.9
    ): PitchResult {
        return {
            timestamp: 0,
            frequency,
            probability,
            isVoiced,
            midiNote,
            noteName,
        };
    }

    // Helper to create a mock pitch-at-beat
    function createMockPitchAtBeat(
        beatIndex: number,
        timestamp: number,
        band: string,
        midiNote: number | null,
        noteName: string | null,
        isVoiced: boolean = true
    ): PitchAtBeat {
        return {
            beatIndex,
            timestamp,
            band,
            pitch: isVoiced ? createMockPitchResult(440, midiNote, noteName, isVoiced) : null,
            direction: 'none',
            intervalFromPrevious: 0,
        };
    }

    describe('Helper Functions', () => {
        describe('categorizeInterval', () => {
            it('should categorize 0 semitones as unison', () => {
                expect(categorizeInterval(0)).toBe('unison');
            });

            it('should categorize 1-2 semitones as small', () => {
                expect(categorizeInterval(1)).toBe('small');
                expect(categorizeInterval(2)).toBe('small');
            });

            it('should categorize 3-4 semitones as medium', () => {
                expect(categorizeInterval(3)).toBe('medium');
                expect(categorizeInterval(4)).toBe('medium');
            });

            it('should categorize 5-7 semitones as large', () => {
                expect(categorizeInterval(5)).toBe('large');
                expect(categorizeInterval(6)).toBe('large');
                expect(categorizeInterval(7)).toBe('large');
            });

            it('should categorize 8+ semitones as very_large', () => {
                expect(categorizeInterval(8)).toBe('very_large');
                expect(categorizeInterval(12)).toBe('very_large');
                expect(categorizeInterval(24)).toBe('very_large');
            });
        });

        describe('calculateIntervalSemitones', () => {
            it('should calculate absolute difference between MIDI notes', () => {
                expect(calculateIntervalSemitones(60, 62)).toBe(2); // C4 to D4
                expect(calculateIntervalSemitones(62, 60)).toBe(2); // D4 to C4
                expect(calculateIntervalSemitones(60, 60)).toBe(0); // Same note
                expect(calculateIntervalSemitones(60, 72)).toBe(12); // Octave
            });
        });

        describe('determineDirection', () => {
            it('should return "up" when current > previous', () => {
                expect(determineDirection(62, 60)).toBe('up');
            });

            it('should return "down" when current < previous', () => {
                expect(determineDirection(60, 62)).toBe('down');
            });

            it('should return "stable" when current === previous', () => {
                expect(determineDirection(60, 60)).toBe('stable');
            });

            it('should return "none" when either note is null', () => {
                expect(determineDirection(null, 60)).toBe('none');
                expect(determineDirection(60, null)).toBe('none');
                expect(determineDirection(null, null)).toBe('none');
            });
        });

        describe('determineOverallDirection', () => {
            it('should return "stable" for empty segments', () => {
                expect(determineOverallDirection([])).toBe('stable');
            });

            it('should return "ascending" when mostly up segments', () => {
                const segments = [
                    { startTime: 0, endTime: 1, startPitch: 'C4', endPitch: 'E4', direction: 'up' as const, interval: 4 },
                    { startTime: 1, endTime: 2, startPitch: 'E4', endPitch: 'G4', direction: 'up' as const, interval: 3 },
                    { startTime: 2, endTime: 3, startPitch: 'G4', endPitch: 'A4', direction: 'down' as const, interval: 2 },
                ];
                expect(determineOverallDirection(segments)).toBe('ascending');
            });

            it('should return "descending" when mostly down segments', () => {
                const segments = [
                    { startTime: 0, endTime: 1, startPitch: 'G4', endPitch: 'E4', direction: 'down' as const, interval: 3 },
                    { startTime: 1, endTime: 2, startPitch: 'E4', endPitch: 'C4', direction: 'down' as const, interval: 4 },
                    { startTime: 2, endTime: 3, startPitch: 'C4', endPitch: 'D4', direction: 'up' as const, interval: 2 },
                ];
                expect(determineOverallDirection(segments)).toBe('descending');
            });

            it('should return "mixed" when up and down are balanced', () => {
                const segments = [
                    { startTime: 0, endTime: 1, startPitch: 'C4', endPitch: 'D4', direction: 'up' as const, interval: 2 },
                    { startTime: 1, endTime: 2, startPitch: 'D4', endPitch: 'C4', direction: 'down' as const, interval: 2 },
                    { startTime: 2, endTime: 3, startPitch: 'C4', endPitch: 'C4', direction: 'stable' as const, interval: 0 },
                ];
                expect(determineOverallDirection(segments)).toBe('mixed');
            });
        });

        describe('midiToNoteName', () => {
            it('should convert MIDI note 60 to C4', () => {
                expect(midiToNoteName(60)).toBe('C4');
            });

            it('should convert MIDI note 61 to C#4', () => {
                expect(midiToNoteName(61)).toBe('C#4');
            });

            it('should convert MIDI note 69 to A4', () => {
                expect(midiToNoteName(69)).toBe('A4');
            });

            it('should convert MIDI note 48 to C3', () => {
                expect(midiToNoteName(48)).toBe('C3');
            });

            it('should convert MIDI note 72 to C5', () => {
                expect(midiToNoteName(72)).toBe('C5');
            });
        });
    });

    describe('Constructor and Configuration', () => {
        it('should create analyzer with default configuration', () => {
            const analyzer = new MelodyContourAnalyzer();
            const config = analyzer.getConfig();

            expect(config.maxTimeGapForConsecutive).toBe(0.5);
        });

        it('should allow custom configuration', () => {
            const config: MelodyContourAnalyzerConfig = {
                maxTimeGapForConsecutive: 1.0,
            };

            const analyzer = new MelodyContourAnalyzer(config);
            const resultConfig = analyzer.getConfig();

            expect(resultConfig.maxTimeGapForConsecutive).toBe(1.0);
        });
    });

    describe('Pitch-to-Pitch Comparison', () => {
        it('should calculate direction for consecutive pitches', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Create ascending melody: C4, D4, E4
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 62, 'D4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 64, 'E4'),
            ];

            const result = analyzer.analyze(pitches);

            // First pitch has no previous
            expect(result.pitchByBeat[0].direction).toBe('none');
            // Second pitch is higher than first
            expect(result.pitchByBeat[1].direction).toBe('up');
            // Third pitch is higher than second
            expect(result.pitchByBeat[2].direction).toBe('up');
        });

        it('should calculate direction for descending melody', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Create descending melody: E4, D4, C4
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 64, 'E4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 62, 'D4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 60, 'C4'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.pitchByBeat[0].direction).toBe('none');
            expect(result.pitchByBeat[1].direction).toBe('down');
            expect(result.pitchByBeat[2].direction).toBe('down');
        });

        it('should detect stable direction for repeated notes', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Create stable melody: C4, C4, C4
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 60, 'C4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 60, 'C4'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.pitchByBeat[0].direction).toBe('none');
            expect(result.pitchByBeat[1].direction).toBe('stable');
            expect(result.pitchByBeat[2].direction).toBe('stable');
        });

        it('should return "none" for non-consecutive beats', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Create beats with large time gap
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 2.0, 'mid', 64, 'E4'), // 2 second gap > 0.5 default
            ];

            const result = analyzer.analyze(pitches);

            // Second beat should be "none" because time gap exceeds threshold
            expect(result.pitchByBeat[1].direction).toBe('none');
        });

        it('should respect custom maxTimeGapForConsecutive', () => {
            const analyzer = new MelodyContourAnalyzer({
                maxTimeGapForConsecutive: 3.0, // Allow 3 second gaps
            });

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 2.0, 'mid', 64, 'E4'), // 2 second gap < 3.0
            ];

            const result = analyzer.analyze(pitches);

            // Now direction should be calculated because gap is within threshold
            expect(result.pitchByBeat[1].direction).toBe('up');
        });
    });

    describe('Interval Calculation', () => {
        it('should calculate interval in semitones', () => {
            const analyzer = new MelodyContourAnalyzer();

            // C4 to D4 = 2 semitones
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 62, 'D4'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.pitchByBeat[1].intervalFromPrevious).toBe(2);
        });

        it('should categorize intervals correctly', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Test various intervals (intervals calculated from PREVIOUS note)
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),    // reference (none)
                createMockPitchAtBeat(1, 0.25, 'mid', 61, 'C#4'),  // 1 semitone from 60 (small)
                createMockPitchAtBeat(2, 0.5, 'mid', 63, 'D#4'),   // 2 semitones from 61 (small)
                createMockPitchAtBeat(3, 0.75, 'mid', 66, 'F#4'),  // 3 semitones from 63 (medium)
                createMockPitchAtBeat(4, 1.0, 'mid', 74, 'A#4'),   // 8 semitones from 66 (very_large)
            ];

            const result = analyzer.analyze(pitches);

            expect(result.pitchByBeat[0].intervalCategory).toBe('unison');    // First beat
            expect(result.pitchByBeat[1].intervalCategory).toBe('small');    // 1 semitone
            expect(result.pitchByBeat[2].intervalCategory).toBe('small');    // 2 semitones
            expect(result.pitchByBeat[3].intervalCategory).toBe('medium');   // 3 semitones
            expect(result.pitchByBeat[4].intervalCategory).toBe('very_large'); // 8 semitones
        });
    });

    describe('Statistics', () => {
        it('should calculate direction statistics', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),   // none (first)
                createMockPitchAtBeat(1, 0.25, 'mid', 64, 'E4'),  // up
                createMockPitchAtBeat(2, 0.5, 'mid', 62, 'D4'),   // down
                createMockPitchAtBeat(3, 0.75, 'mid', 62, 'D4'),  // stable
            ];

            const result = analyzer.analyze(pitches);

            expect(result.directionStats.none).toBe(1);
            expect(result.directionStats.up).toBe(1);
            expect(result.directionStats.down).toBe(1);
            expect(result.directionStats.stable).toBe(1);
        });

        it('should calculate interval statistics', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),   // unison (no previous)
                createMockPitchAtBeat(1, 0.25, 'mid', 61, 'C#4'), // small (1 semitone)
                createMockPitchAtBeat(2, 0.5, 'mid', 64, 'E4'),   // small (3 semitones = medium)
                createMockPitchAtBeat(3, 0.75, 'mid', 70, 'A#4'), // large (6 semitones)
            ];

            const result = analyzer.analyze(pitches);

            expect(result.intervalStats.unison).toBe(1);  // First pitch
            expect(result.intervalStats.small).toBe(1);   // 1 semitone
            expect(result.intervalStats.medium).toBe(1);  // 3 semitones
            expect(result.intervalStats.large).toBe(1);   // 6 semitones
        });

        it('should calculate metadata correctly', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 64, 'E4'),
                createMockPitchAtBeat(2, 0.5, 'mid', null, null, false), // Unvoiced
            ];

            const result = analyzer.analyze(pitches);

            expect(result.metadata.totalBeats).toBe(3);
            expect(result.metadata.voicedBeats).toBe(2);
            expect(result.metadata.directionCalculatedBeats).toBe(1); // Only one with previous
        });
    });

    describe('Melody Contour', () => {
        it('should build melody contour with correct range', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 64, 'E4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 67, 'G4'),
                createMockPitchAtBeat(3, 0.75, 'mid', 72, 'C5'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.melodyContour.range.minNote).toBe('C4');
            expect(result.melodyContour.range.maxNote).toBe('C5');
            expect(result.melodyContour.range.semitones).toBe(12);
        });

        it('should determine ascending contour direction', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Ascending melody: C4, D4, E4, F4, G4
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 62, 'D4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 64, 'E4'),
                createMockPitchAtBeat(3, 0.75, 'mid', 65, 'F4'),
                createMockPitchAtBeat(4, 1.0, 'mid', 67, 'G4'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.melodyContour.direction).toBe('ascending');
        });

        it('should determine descending contour direction', () => {
            const analyzer = new MelodyContourAnalyzer();

            // Descending melody: G4, F4, E4, D4, C4
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 67, 'G4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 65, 'F4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 64, 'E4'),
                createMockPitchAtBeat(3, 0.75, 'mid', 62, 'D4'),
                createMockPitchAtBeat(4, 1.0, 'mid', 60, 'C4'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.melodyContour.direction).toBe('descending');
        });

        it('should create segments from consecutive same-direction beats', () => {
            const analyzer = new MelodyContourAnalyzer();

            // C4 -> D4 -> E4 -> F4 (all ascending)
            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', 62, 'D4'),
                createMockPitchAtBeat(2, 0.5, 'mid', 64, 'E4'),
                createMockPitchAtBeat(3, 0.75, 'mid', 65, 'F4'),
            ];

            const result = analyzer.analyze(pitches);

            // Should have one ascending segment (beats 1-3, all 'up')
            const upSegments = result.melodyContour.segments.filter(s => s.direction === 'up');
            expect(upSegments.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty input', () => {
            const analyzer = new MelodyContourAnalyzer();

            const result = analyzer.analyze([]);

            expect(result.pitchByBeat).toHaveLength(0);
            expect(result.melodyContour.segments).toHaveLength(0);
            expect(result.melodyContour.direction).toBe('stable');
        });

        it('should handle single beat', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.pitchByBeat).toHaveLength(1);
            expect(result.pitchByBeat[0].direction).toBe('none'); // No previous
            expect(result.pitchByBeat[0].intervalFromPrevious).toBe(0);
        });

        it('should handle unvoiced beats', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', 60, 'C4'),
                createMockPitchAtBeat(1, 0.25, 'mid', null, null, false), // Unvoiced
                createMockPitchAtBeat(2, 0.5, 'mid', 64, 'E4'),
            ];

            const result = analyzer.analyze(pitches);

            // First: none (no previous)
            // Second: none (no pitch)
            // Third: none (previous was unvoiced, gap would be 0.5 but previous.pitch is null)
            expect(result.pitchByBeat[0].direction).toBe('none');
            expect(result.pitchByBeat[1].direction).toBe('none');
            expect(result.pitchByBeat[2].direction).toBe('none'); // Previous has no pitch
        });

        it('should handle melody with no voiced pitches', () => {
            const analyzer = new MelodyContourAnalyzer();

            const pitches: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid', null, null, false),
                createMockPitchAtBeat(1, 0.25, 'mid', null, null, false),
            ];

            const result = analyzer.analyze(pitches);

            expect(result.melodyContour.range.minNote).toBe('N/A');
            expect(result.melodyContour.range.maxNote).toBe('N/A');
            expect(result.melodyContour.range.semitones).toBe(0);
        });
    });
});
