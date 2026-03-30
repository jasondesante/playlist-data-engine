/**
 * Backward compatibility tests for all ButtonMappingConfig options.
 *
 * Verifies that every config option accepted by ButtonMapper still works
 * correctly with the run-based pattern placement pipeline. Each config
 * option is exercised through the public ButtonMapper.map() API to ensure
 * the new pipeline doesn't break any existing configuration paths.
 *
 * Config options tested:
 * - difficulty (easy / medium / hard)
 * - controllerMode (ddr / guitar_hero)
 * - pitchInfluenceWeight (0.0 → 1.0)
 * - emphasizeDownbeats (true / false)
 * - emphasizeSyncopation (true / false)
 * - consecutiveSameKeyLimit (various limits)
 * - patternMemory (various values)
 * - useRhythmBand (true / false)
 *
 * Task 2.5 - Pattern Placement Rewrite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ButtonMapper } from './ButtonMapper.js';
import type {
    DDRButton,
    GuitarHeroButton,
    ButtonMappingConfig,
    MappedLevelResult,
} from './ButtonMapping.js';
import type { PitchAtBeat, PitchBandName } from './PitchBeatLinker.js';
import type { PitchResult } from '../analysis/PitchDetector.js';
import type { GeneratedRhythm, RhythmMetadata } from './RhythmGenerator.js';
import type { DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';

// =============================================================================
// Test Utilities (shared with bandAware and blendPitchAndPattern tests)
// =============================================================================

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

function createMockPitchAtBeat(
    beatIndex: number,
    timestamp: number,
    band: PitchBandName = 'mid',
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

/** 8-beat mock rhythm with pitch (enough for run-based pipeline to exercise) */
const STANDARD_BEATS = Array.from({ length: 8 }, (_, i) => ({
    beatIndex: i,
    timestamp: i * 0.5,
}));

/** 8-beat pitch analysis with variety of directions */
const STANDARD_PITCH: PitchAtBeat[] = Array.from({ length: 8 }, (_, i) =>
    createMockPitchAtBeat(i, i * 0.5, 'mid', {
        frequency: 220 + i * 50,
        probability: 0.8,
        direction: i % 2 === 0 ? 'up' : 'down',
        intervalCategory: 'small',
    })
);

// =============================================================================
// Helpers
// =============================================================================

/** Assert the result shape is a valid MappedLevelResult */
function expectValidResultShape(result: MappedLevelResult, beatCount: number): void {
    // Core fields exist
    expect(result.variant).toBeDefined();
    expect(result.rhythmMetadata).toBeDefined();
    expect(result.buttonMetadata).toBeDefined();
    expect(result.keyAssignments).toBeInstanceOf(Map);
    expect(result.mappingSources).toBeInstanceOf(Map);
    expect(result.mappingPatternIds).toBeInstanceOf(Map);

    // Per-beat maps are populated
    expect(result.keyAssignments.size).toBe(beatCount);
    expect(result.mappingSources.size).toBe(beatCount);
    expect(result.mappingPatternIds.size).toBe(beatCount);

    // Every key assignment is a non-empty string
    for (const [idx, key] of result.keyAssignments) {
        expect(typeof key).toBe('string');
        expect(key.length).toBeGreaterThan(0);
    }

    // Every mapping source is valid
    for (const [, source] of result.mappingSources) {
        expect(['pitch', 'pattern']).toContain(source);
    }

    // Metadata fields
    expect(result.buttonMetadata.controllerMode).toBeDefined();
    expect(Array.isArray(result.buttonMetadata.keysUsed)).toBe(true);
    expect(typeof result.buttonMetadata.pitchInfluencedBeats).toBe('number');
    expect(typeof result.buttonMetadata.patternInfluencedBeats).toBe('number');
    expect(Array.isArray(result.buttonMetadata.patternsUsed)).toBe(true);
    expect(result.buttonMetadata.buttonDistribution).toBeInstanceOf(Map);

    // Beat counts add up
    expect(
        result.buttonMetadata.pitchInfluencedBeats + result.buttonMetadata.patternInfluencedBeats
    ).toBe(beatCount);
}

// =============================================================================
// Tests
// =============================================================================

describe('ButtonMappingConfig backward compatibility', () => {
    // -------------------------------------------------------------------------
    // difficulty option
    // -------------------------------------------------------------------------
    describe('difficulty option', () => {
        it('should accept easy difficulty and produce valid output', () => {
            const mapper = new ButtonMapper({
                difficulty: 'easy',
                controllerMode: 'ddr',
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'easy', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            expect(mapper.getConfig().difficulty).toBe('easy');
        });

        it('should accept medium difficulty and produce valid output', () => {
            const mapper = new ButtonMapper({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            expect(mapper.getConfig().difficulty).toBe('medium');
        });

        it('should accept hard difficulty and produce valid output', () => {
            const mapper = new ButtonMapper({
                difficulty: 'hard',
                controllerMode: 'ddr',
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'hard', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            expect(mapper.getConfig().difficulty).toBe('hard');
        });

        it('should accept natural difficulty and produce valid output', () => {
            const mapper = new ButtonMapper({
                difficulty: 'natural',
                controllerMode: 'ddr',
            });

            // natural is a valid DifficultyLevel but not in our standard 3-variant mock.
            // Create a rhythm with a natural variant explicitly.
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            (rhythm.difficultyVariants as any).natural = rhythm.difficultyVariants.medium;
            const result = mapper.map(rhythm, 'natural', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            expect(mapper.getConfig().difficulty).toBe('natural');
        });

        it('should map different difficulties through mapAll', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                pitchInfluenceWeight: 0, // pattern-only for simplicity
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const results = mapper.mapAll(rhythm, STANDARD_PITCH);

            for (const [level, result] of Object.entries(results)) {
                expectValidResultShape(result, 8);
            }
        });
    });

    // -------------------------------------------------------------------------
    // controllerMode option
    // -------------------------------------------------------------------------
    describe('controllerMode option', () => {
        it('should produce DDR buttons when controllerMode is ddr', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            const validDDR: DDRButton[] = ['up', 'down', 'left', 'right'];
            for (const [, key] of result.keyAssignments) {
                expect(validDDR).toContain(key as DDRButton);
            }
            expect(result.buttonMetadata.controllerMode).toBe('ddr');
        });

        it('should produce Guitar Hero buttons when controllerMode is guitar_hero', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'medium',
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            const validGH: number[] = [1, 2, 3, 4, 5];
            for (const [, key] of result.keyAssignments) {
                expect(validGH).toContain(Number(key));
            }
            expect(result.buttonMetadata.controllerMode).toBe('guitar_hero');
        });
    });

    // -------------------------------------------------------------------------
    // pitchInfluenceWeight option
    // -------------------------------------------------------------------------
    describe('pitchInfluenceWeight option', () => {
        it('should accept pitchInfluenceWeight: 0.0 without errors', () => {
            const mapper = new ButtonMapper({
                pitchInfluenceWeight: 0.0,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().pitchInfluenceWeight).toBe(0.0);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            // With weight=0, all beats should be pattern-derived
            expect(result.buttonMetadata.patternInfluencedBeats).toBe(8);
            expect(result.buttonMetadata.pitchInfluencedBeats).toBe(0);
        });

        it('should accept pitchInfluenceWeight: 0.5 without errors', () => {
            const mapper = new ButtonMapper({
                pitchInfluenceWeight: 0.5,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().pitchInfluenceWeight).toBe(0.5);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            // With weight=0.5, roughly half should be pitch, half pattern
            // (exact split depends on probability ordering)
            expect(result.buttonMetadata.pitchInfluencedBeats).toBeGreaterThan(0);
            expect(result.buttonMetadata.patternInfluencedBeats).toBeGreaterThan(0);
        });

        it('should accept pitchInfluenceWeight: 1.0 without errors', () => {
            const mapper = new ButtonMapper({
                pitchInfluenceWeight: 1.0,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().pitchInfluenceWeight).toBe(1.0);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            // With weight=1.0, all pitch beats should be kept as pitch
            // (only beats with no pitch data should be pattern-derived)
            expect(result.buttonMetadata.pitchInfluencedBeats).toBe(8);
        });

        it('should accept edge values (0 and 1) without validation errors', () => {
            expect(() => new ButtonMapper({ pitchInfluenceWeight: 0 })).not.toThrow();
            expect(() => new ButtonMapper({ pitchInfluenceWeight: 1 })).not.toThrow();
            expect(() => new ButtonMapper({ pitchInfluenceWeight: -0.01 })).toThrow();
            expect(() => new ButtonMapper({ pitchInfluenceWeight: 1.01 })).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    // emphasizeDownbeats option
    // -------------------------------------------------------------------------
    describe('emphasizeDownbeats option', () => {
        it('should accept emphasizeDownbeats: true without errors', () => {
            const mapper = new ButtonMapper({
                emphasizeDownbeats: true,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().emphasizeDownbeats).toBe(true);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });

        it('should accept emphasizeDownbeats: false without errors', () => {
            const mapper = new ButtonMapper({
                emphasizeDownbeats: false,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().emphasizeDownbeats).toBe(false);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });
    });

    // -------------------------------------------------------------------------
    // emphasizeSyncopation option
    // -------------------------------------------------------------------------
    describe('emphasizeSyncopation option', () => {
        it('should accept emphasizeSyncopation: true without errors', () => {
            const mapper = new ButtonMapper({
                emphasizeSyncopation: true,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().emphasizeSyncopation).toBe(true);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });

        it('should accept emphasizeSyncopation: false without errors', () => {
            const mapper = new ButtonMapper({
                emphasizeSyncopation: false,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().emphasizeSyncopation).toBe(false);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });
    });

    // -------------------------------------------------------------------------
    // consecutiveSameKeyLimit option
    // -------------------------------------------------------------------------
    describe('consecutiveSameKeyLimit option', () => {
        it('should accept consecutiveSameKeyLimit: 12 (easy default)', () => {
            const mapper = new ButtonMapper({
                consecutiveSameKeyLimit: 12,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(12);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
        });

        it('should accept consecutiveSameKeyLimit: 8 (medium default)', () => {
            const mapper = new ButtonMapper({
                consecutiveSameKeyLimit: 8,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(8);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
        });

        it('should accept consecutiveSameKeyLimit: 6 (hard default)', () => {
            const mapper = new ButtonMapper({
                consecutiveSameKeyLimit: 6,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().consecutiveSameKeyLimit).toBe(6);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
        });

        it('should enforce consecutiveSameKeyLimit and fix violations', () => {
            // Create a mapper with a very tight limit
            const mapper = new ButtonMapper({
                consecutiveSameKeyLimit: 2,
                controllerMode: 'ddr',
                pitchInfluenceWeight: 0, // pattern-only for predictable behavior
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const spy = vi.spyOn(Math, 'random').mockReturnValue(0);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);

            // Verify no sequence of same key exceeds the limit of 2
            const keys = Array.from(result.keyAssignments.values());
            let consecutiveCount = 1;
            for (let i = 1; i < keys.length; i++) {
                if (keys[i] === keys[i - 1]) {
                    consecutiveCount++;
                    expect(consecutiveCount).toBeLessThanOrEqual(2);
                } else {
                    consecutiveCount = 1;
                }
            }

            spy.mockRestore();
        });

        it('should reject consecutiveSameKeyLimit < 1', () => {
            expect(() => new ButtonMapper({ consecutiveSameKeyLimit: 0 })).toThrow();
            expect(() => new ButtonMapper({ consecutiveSameKeyLimit: -1 })).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    // patternMemory option
    // -------------------------------------------------------------------------
    describe('patternMemory option', () => {
        it('should accept patternMemory: 0 without errors', () => {
            const mapper = new ButtonMapper({
                patternMemory: 0,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().patternMemory).toBe(0);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
        });

        it('should accept patternMemory: 4 (default) without errors', () => {
            const mapper = new ButtonMapper({
                patternMemory: 4,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().patternMemory).toBe(4);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
        });

        it('should accept large patternMemory values without errors', () => {
            const mapper = new ButtonMapper({
                patternMemory: 100,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().patternMemory).toBe(100);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
        });

        it('should reject negative patternMemory', () => {
            expect(() => new ButtonMapper({ patternMemory: -1 })).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    // useRhythmBand option
    // -------------------------------------------------------------------------
    describe('useRhythmBand option', () => {
        it('should accept useRhythmBand: true without errors', () => {
            const mapper = new ButtonMapper({
                useRhythmBand: true,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().useRhythmBand).toBe(true);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });

        it('should accept useRhythmBand: false without errors', () => {
            const mapper = new ButtonMapper({
                useRhythmBand: false,
                controllerMode: 'ddr',
            });

            expect(mapper.getConfig().useRhythmBand).toBe(false);
            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });
    });

    // -------------------------------------------------------------------------
    // Config merging and defaults
    // -------------------------------------------------------------------------
    describe('config merging and defaults', () => {
        it('should use defaults when no config is provided', () => {
            const mapper = new ButtonMapper();

            const config = mapper.getConfig();
            expect(config.controllerMode).toBe('ddr');
            expect(config.difficulty).toBe('medium');
            expect(config.pitchInfluenceWeight).toBe(1.0);
            expect(config.emphasizeDownbeats).toBe(true);
            expect(config.emphasizeSyncopation).toBe(false);
            expect(config.consecutiveSameKeyLimit).toBe(8);
            expect(config.patternMemory).toBe(4);
            expect(config.useRhythmBand).toBe(true);

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'medium', STANDARD_PITCH);

            expectValidResultShape(result, 8);
        });

        it('should merge partial config with defaults', () => {
            const mapper = new ButtonMapper({ controllerMode: 'guitar_hero' });

            const config = mapper.getConfig();
            // Provided
            expect(config.controllerMode).toBe('guitar_hero');
            // Defaults
            expect(config.difficulty).toBe('medium');
            expect(config.pitchInfluenceWeight).toBe(1.0);
            expect(config.emphasizeDownbeats).toBe(true);
            expect(config.patternMemory).toBe(4);
        });

        it('should reject invalid controllerMode', () => {
            expect(() => new ButtonMapper({ controllerMode: 'invalid' as any })).toThrow();
        });
    });

    // -------------------------------------------------------------------------
    // Combined config options
    // -------------------------------------------------------------------------
    describe('combined config options', () => {
        it('should work with Guitar Hero + easy + pitchInfluenceWeight 0', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'easy',
                pitchInfluenceWeight: 0,
                emphasizeDownbeats: false,
                emphasizeSyncopation: true,
                consecutiveSameKeyLimit: 12,
                patternMemory: 0,
                useRhythmBand: false,
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'easy', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            // Should use GH buttons
            const validGH = [1, 2, 3, 4, 5];
            for (const [, key] of result.keyAssignments) {
                expect(validGH).toContain(Number(key));
            }
        });

        it('should work with DDR + hard + pitchInfluenceWeight 1', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'hard',
                pitchInfluenceWeight: 1,
                emphasizeDownbeats: true,
                emphasizeSyncopation: false,
                consecutiveSameKeyLimit: 6,
                patternMemory: 8,
                useRhythmBand: true,
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            const result = mapper.map(rhythm, 'hard', STANDARD_PITCH);

            expectValidResultShape(result, 8);
            // Should use DDR buttons
            const validDDR: DDRButton[] = ['up', 'down', 'left', 'right'];
            for (const [, key] of result.keyAssignments) {
                expect(validDDR).toContain(key as DDRButton);
            }
        });

        it('should work with no pitch analysis (pattern-only fallback)', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
                pitchInfluenceWeight: 0.5,
            });

            const rhythm = createMockGeneratedRhythm(STANDARD_BEATS);
            // No pitch analysis provided
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 8);
            // Without pitch, all beats should be pattern-derived
            expect(result.buttonMetadata.patternInfluencedBeats).toBe(8);
            expect(result.buttonMetadata.pitchInfluencedBeats).toBe(0);
        });

        it('should work with empty beats array', () => {
            const mapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
            });

            const rhythm = createMockGeneratedRhythm([]);
            const result = mapper.map(rhythm, 'medium');

            expectValidResultShape(result, 0);
            expect(result.buttonMetadata.pitchInfluencedBeats).toBe(0);
            expect(result.buttonMetadata.patternInfluencedBeats).toBe(0);
        });
    });
});
