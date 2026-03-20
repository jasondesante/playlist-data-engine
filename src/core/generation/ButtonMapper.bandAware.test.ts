/**
 * Unit tests for ButtonMapper band-aware mapping logic
 *
 * Tests band-aware button mapping functionality:
 * - Band statistics are correctly calculated in output metadata
 * - Different band assignments result in correct metadata
 * - Band field is preserved through the mapping process
 *
 * Phase 2.8 - Test band-aware mapping logic (using `PitchAtBeat.band`)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ButtonMapper } from './ButtonMapper.js';
import type {
    ButtonMappingMetadata,
    MappedLevelResult,
} from './ButtonMapper.js';
import type { PitchAtBeat, PitchBandName } from './PitchBeatLinker.js';
import type { PitchResult } from '../analysis/PitchDetector.js';
import type { GeneratedRhythm, RhythmMetadata } from './RhythmGenerator.js';
import type { DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock PitchResult
 */
function createMockPitchResult(
    frequency: number,
    probability: number = 0.8,
    isVoiced: boolean = true
): PitchResult {
    const midiNote = Math.round(69 + 12 * Math.log2(frequency / 440));
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12] + octave;

    return {
        timestamp: 0,
        frequency,
        probability,
        isVoiced,
        midiNote,
        noteName,
    };
}

/**
 * Create a mock PitchAtBeat
 */
function createMockPitchAtBeat(
    beatIndex: number,
    timestamp: number,
    band: PitchBandName,
    options: {
        frequency?: number;
        probability?: number;
        isVoiced?: boolean;
        direction?: 'up' | 'down' | 'stable' | 'none';
        intervalFromPrevious?: number;
        intervalCategory?: 'unison' | 'small' | 'medium' | 'large' | 'very_large';
    } = {}
): PitchAtBeat {
    const {
        frequency = 440,
        probability = 0.8,
        isVoiced = true,
        direction = 'stable',
        intervalFromPrevious = 0,
        intervalCategory = 'unison',
    } = options;

    return {
        beatIndex,
        timestamp,
        band,
        pitch: isVoiced ? createMockPitchResult(frequency, probability, isVoiced) : null,
        direction,
        intervalFromPrevious,
        intervalCategory,
    };
}

/**
 * Create a mock GeneratedBeat
 */
function createMockGeneratedBeat(
    beatIndex: number,
    timestamp: number,
    band: PitchBandName = 'mid'
) {
    return {
        timestamp,
        beatIndex,
        gridPosition: beatIndex % 4,
        gridType: 'straight_16th' as const,
        intensity: 0.7,
        band,
        quantizationError: 0,
        sourceBand: band,
    };
}

/**
 * Create a mock DifficultyVariant
 */
function createMockDifficultyVariant(
    beats: Array<{ beatIndex: number; timestamp: number; band?: PitchBandName }>,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): DifficultyVariant {
    return {
        difficulty,
        beats: beats.map(b => createMockGeneratedBeat(b.beatIndex, b.timestamp, b.band)),
        isUnedited: true,
        editType: 'none',
        editAmount: 0,
    };
}

/**
 * Create a mock GeneratedRhythm
 */
function createMockGeneratedRhythm(
    variantBeats: Array<{ beatIndex: number; timestamp: number; band?: PitchBandName }> = []
): GeneratedRhythm {
    const variant = createMockDifficultyVariant(variantBeats);

    return {
        difficultyVariants: {
            easy: variant,
            medium: variant,
            hard: variant,
        },
        bandStreams: {
            low: { beats: [], metadata: { band: 'low', averageIntensity: 0.5, beatCount: 0 } },
            mid: { beats: [], metadata: { band: 'mid', averageIntensity: 0.5, beatCount: 0 } },
            high: { beats: [], metadata: { band: 'high', averageIntensity: 0.5, beatCount: 0 } },
        },
        composite: {
            beats: variantBeats.map(b => createMockGeneratedBeat(b.beatIndex, b.timestamp, b.band)),
            sections: [],
            metadata: { totalBeats: variantBeats.length },
        },
        transientAnalysis: {
            transients: [],
            bandTransients: new Map(),
            metadata: { totalTransients: 0 },
        },
        quantizationResult: {
            streams: {
                low: { beats: [], metadata: { band: 'low', averageIntensity: 0.5, beatCount: 0 } },
                mid: { beats: [], metadata: { band: 'mid', averageIntensity: 0.5, beatCount: 0 } },
                high: { beats: [], metadata: { band: 'high', averageIntensity: 0.5, beatCount: 0 } },
            },
            metadata: {},
        },
        phraseAnalysis: {
            phrases: [],
            metadata: { totalPhrases: 0 },
        },
        metadata: {
            totalBeats: variantBeats.length,
            duration: 10,
            bpm: 120,
            difficulty: 'medium',
        } as RhythmMetadata,
    };
}

// =============================================================================
// BAND-AWARE MAPPING TESTS - DDR MODE
// =============================================================================

describe('ButtonMapper Band-Aware Mapping - DDR Mode', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1, // Full pitch influence for testing
        });
    });

    describe('Band Statistics in Metadata', () => {
        it('should include bandStats when pitch analysis is provided', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
                { beatIndex: 2, timestamp: 1.0, band: 'high' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low', { frequency: 220, direction: 'stable' }),
                createMockPitchAtBeat(1, 0.5, 'mid', { frequency: 440, direction: 'up' }),
                createMockPitchAtBeat(2, 1.0, 'high', { frequency: 880, direction: 'up' }),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats).toBeDefined();
            expect(result.buttonMetadata.bandStats?.low).toBe(1);
            expect(result.buttonMetadata.bandStats?.mid).toBe(1);
            expect(result.buttonMetadata.bandStats?.high).toBe(1);
        });

        it('should count beats from each band correctly', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'low' as PitchBandName },
                { beatIndex: 2, timestamp: 1.0, band: 'low' as PitchBandName },
                { beatIndex: 3, timestamp: 1.5, band: 'mid' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low'),
                createMockPitchAtBeat(1, 0.5, 'low'),
                createMockPitchAtBeat(2, 1.0, 'low'),
                createMockPitchAtBeat(3, 1.5, 'mid'),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats?.low).toBe(3);
            expect(result.buttonMetadata.bandStats?.mid).toBe(1);
            expect(result.buttonMetadata.bandStats?.high).toBe(0);
        });

        it('should handle all beats from a single band', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'mid' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
                { beatIndex: 2, timestamp: 1.0, band: 'mid' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'mid'),
                createMockPitchAtBeat(1, 0.5, 'mid'),
                createMockPitchAtBeat(2, 1.0, 'mid'),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats?.low).toBe(0);
            expect(result.buttonMetadata.bandStats?.mid).toBe(3);
            expect(result.buttonMetadata.bandStats?.high).toBe(0);
        });

        it('should handle mixed band distribution', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
                { beatIndex: 2, timestamp: 1.0, band: 'high' as PitchBandName },
                { beatIndex: 3, timestamp: 1.5, band: 'low' as PitchBandName },
                { beatIndex: 4, timestamp: 2.0, band: 'mid' as PitchBandName },
                { beatIndex: 5, timestamp: 2.5, band: 'high' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low'),
                createMockPitchAtBeat(1, 0.5, 'mid'),
                createMockPitchAtBeat(2, 1.0, 'high'),
                createMockPitchAtBeat(3, 1.5, 'low'),
                createMockPitchAtBeat(4, 2.0, 'mid'),
                createMockPitchAtBeat(5, 2.5, 'high'),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats?.low).toBe(2);
            expect(result.buttonMetadata.bandStats?.mid).toBe(2);
            expect(result.buttonMetadata.bandStats?.high).toBe(2);
        });
    });

    describe('Band Field Preservation', () => {
        it('should preserve band information through mapping', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low', { frequency: 220 }),
                createMockPitchAtBeat(1, 0.5, 'mid', { frequency: 440 }),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            // Verify that the variant beats have the correct sourceBand
            expect(result.variant.beats[0].sourceBand).toBe('low');
            expect(result.variant.beats[1].sourceBand).toBe('mid');
        });
    });

    describe('No Pitch Analysis', () => {
        it('should not include bandStats when no pitch analysis is provided', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);

            const result = mapper.map(rhythm, 'medium');

            expect(result.buttonMetadata.bandStats).toBeUndefined();
        });

        it('should not include bandStats when pitch analysis is empty', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats).toBeUndefined();
        });
    });

    describe('Band Statistics with No Voiced Pitch', () => {
        it('should still count band even when pitch is null', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low', { isVoiced: false }),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            // Band stats should count the band regardless of voiced status
            expect(result.buttonMetadata.bandStats?.low).toBe(1);
        });
    });
});

// =============================================================================
// BAND-AWARE MAPPING TESTS - GUITAR HERO MODE
// =============================================================================

describe('ButtonMapper Band-Aware Mapping - Guitar Hero Mode', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'guitar_hero',
            difficulty: 'medium',
            pitchInfluenceWeight: 1,
        });
    });

    describe('Band Statistics in Metadata', () => {
        it('should include bandStats when pitch analysis is provided', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
                { beatIndex: 2, timestamp: 1.0, band: 'high' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low', { frequency: 220, direction: 'stable' }),
                createMockPitchAtBeat(1, 0.5, 'mid', { frequency: 440, direction: 'up' }),
                createMockPitchAtBeat(2, 1.0, 'high', { frequency: 880, direction: 'up' }),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats).toBeDefined();
            expect(result.buttonMetadata.bandStats?.low).toBe(1);
            expect(result.buttonMetadata.bandStats?.mid).toBe(1);
            expect(result.buttonMetadata.bandStats?.high).toBe(1);
        });

        it('should count beats from each band correctly in Guitar Hero mode', () => {
            const beats = [
                { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
                { beatIndex: 1, timestamp: 0.5, band: 'low' as PitchBandName },
                { beatIndex: 2, timestamp: 1.0, band: 'high' as PitchBandName },
            ];

            const rhythm = createMockGeneratedRhythm(beats);
            const pitchAnalysis: PitchAtBeat[] = [
                createMockPitchAtBeat(0, 0.0, 'low'),
                createMockPitchAtBeat(1, 0.5, 'low'),
                createMockPitchAtBeat(2, 1.0, 'high'),
            ];

            const result = mapper.map(rhythm, 'medium', pitchAnalysis);

            expect(result.buttonMetadata.bandStats?.low).toBe(2);
            expect(result.buttonMetadata.bandStats?.mid).toBe(0);
            expect(result.buttonMetadata.bandStats?.high).toBe(1);
        });
    });
});

// =============================================================================
// BAND-AWARE MAPPING TESTS - DIFFICULTY VARIATIONS
// =============================================================================

describe('ButtonMapper Band-Aware Mapping - Difficulty Variations', () => {
    it('should track band stats correctly for easy difficulty', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'easy',
            pitchInfluenceWeight: 1,
        });

        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low', { direction: 'up' }),
            createMockPitchAtBeat(1, 0.5, 'mid', { direction: 'down' }),
        ];

        const result = mapper.map(rhythm, 'easy', pitchAnalysis);

        expect(result.buttonMetadata.bandStats?.low).toBe(1);
        expect(result.buttonMetadata.bandStats?.mid).toBe(1);
    });

    it('should track band stats correctly for hard difficulty', () => {
        const mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'hard',
            pitchInfluenceWeight: 1,
        });

        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'high' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low', { direction: 'up', intervalCategory: 'large' }),
            createMockPitchAtBeat(1, 0.5, 'high', { direction: 'down', intervalCategory: 'very_large' }),
        ];

        const result = mapper.map(rhythm, 'hard', pitchAnalysis);

        expect(result.buttonMetadata.bandStats?.low).toBe(1);
        expect(result.buttonMetadata.bandStats?.high).toBe(1);
    });
});

// =============================================================================
// BAND-AWARE MAPPING TESTS - EDGE CASES
// =============================================================================

describe('ButtonMapper Band-Aware Mapping - Edge Cases', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1,
        });
    });

    it('should handle empty beats array', () => {
        const rhythm = createMockGeneratedRhythm([]);
        const pitchAnalysis: PitchAtBeat[] = [];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        expect(result.buttonMetadata.bandStats).toBeUndefined();
    });

    it('should handle single beat with band info', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'mid' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'mid'),
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        expect(result.buttonMetadata.bandStats?.mid).toBe(1);
    });

    it('should handle pitch analysis with more entries than beats', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low'),
            createMockPitchAtBeat(1, 0.5, 'mid'), // Extra pitch that doesn't match any beat
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // Only the matching pitch should be counted
        expect(result.buttonMetadata.bandStats?.low).toBe(1);
    });

    it('should handle pitch analysis with fewer entries than beats', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low'),
            // Missing pitch for beat 1
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // Only the first pitch should be counted
        expect(result.buttonMetadata.bandStats?.low).toBe(1);
        // The second beat doesn't have a matching pitch, so mid might not be counted
        // depending on implementation
    });

    it('should handle all three bands in sequence', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
            { beatIndex: 2, timestamp: 1.0, band: 'high' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low', { frequency: 110 }),
            createMockPitchAtBeat(1, 0.5, 'mid', { frequency: 440 }),
            createMockPitchAtBeat(2, 1.0, 'high', { frequency: 1760 }),
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        expect(result.buttonMetadata.bandStats?.low).toBe(1);
        expect(result.buttonMetadata.bandStats?.mid).toBe(1);
        expect(result.buttonMetadata.bandStats?.high).toBe(1);
    });
});

// =============================================================================
// BAND-AWARE MAPPING TESTS - METADATA COMPLETENESS
// =============================================================================

describe('ButtonMapper Band-Aware Mapping - Metadata Completeness', () => {
    let mapper: ButtonMapper;

    beforeEach(() => {
        mapper = new ButtonMapper({
            controllerMode: 'ddr',
            difficulty: 'medium',
            pitchInfluenceWeight: 1,
        });
    });

    it('should include all expected metadata fields when pitch analysis is provided', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'mid' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'mid', { direction: 'up', intervalCategory: 'small' }),
            createMockPitchAtBeat(1, 0.5, 'mid', { direction: 'down', intervalCategory: 'medium' }),
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // Verify all metadata fields are present
        expect(result.buttonMetadata.controllerMode).toBe('ddr');
        expect(result.buttonMetadata.keysUsed).toBeDefined();
        expect(result.buttonMetadata.pitchInfluencedBeats).toBeDefined();
        expect(result.buttonMetadata.patternInfluencedBeats).toBeDefined();
        expect(result.buttonMetadata.patternsUsed).toBeDefined();
        expect(result.buttonMetadata.buttonDistribution).toBeDefined();
        expect(result.buttonMetadata.directionStats).toBeDefined();
        expect(result.buttonMetadata.intervalStats).toBeDefined();
        expect(result.buttonMetadata.bandStats).toBeDefined();
    });

    it('should have correct direction statistics along with band stats', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
            { beatIndex: 2, timestamp: 1.0, band: 'high' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low', { direction: 'up' }),
            createMockPitchAtBeat(1, 0.5, 'mid', { direction: 'down' }),
            createMockPitchAtBeat(2, 1.0, 'high', { direction: 'stable' }),
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // Verify direction stats
        expect(result.buttonMetadata.directionStats?.up).toBe(1);
        expect(result.buttonMetadata.directionStats?.down).toBe(1);
        expect(result.buttonMetadata.directionStats?.stable).toBe(1);

        // Verify band stats
        expect(result.buttonMetadata.bandStats?.low).toBe(1);
        expect(result.buttonMetadata.bandStats?.mid).toBe(1);
        expect(result.buttonMetadata.bandStats?.high).toBe(1);
    });

    it('should have correct interval statistics along with band stats', () => {
        const beats = [
            { beatIndex: 0, timestamp: 0.0, band: 'low' as PitchBandName },
            { beatIndex: 1, timestamp: 0.5, band: 'mid' as PitchBandName },
        ];

        const rhythm = createMockGeneratedRhythm(beats);
        const pitchAnalysis: PitchAtBeat[] = [
            createMockPitchAtBeat(0, 0.0, 'low', { intervalCategory: 'small' }),
            createMockPitchAtBeat(1, 0.5, 'mid', { intervalCategory: 'large' }),
        ];

        const result = mapper.map(rhythm, 'medium', pitchAnalysis);

        // Verify interval stats
        expect(result.buttonMetadata.intervalStats?.small).toBe(1);
        expect(result.buttonMetadata.intervalStats?.large).toBe(1);

        // Verify band stats
        expect(result.buttonMetadata.bandStats?.low).toBe(1);
        expect(result.buttonMetadata.bandStats?.mid).toBe(1);
    });
});
