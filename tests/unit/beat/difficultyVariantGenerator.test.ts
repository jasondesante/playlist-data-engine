/**
 * Unit tests for DifficultyVariantGenerator
 *
 * Tests for:
 * - SUBDIVISION_LIMITS constant
 * - Grid type validation and conversion
 * - Difficulty variant generation structure
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    DifficultyVariantGenerator,
    SUBDIVISION_LIMITS,
    ALL_GRID_TYPES,
    isGridTypeAllowed,
    getAllowedGridTypes,
    convertToAllowedGridType,
    naturalDifficultyToLevel,
    validateSubdivisionLimits,
    getTempoAwareAllowedGridTypes,
    MEDIUM_RESTRICT_BPM,
    HARD_RESTRICT_BPM,
    EASY_QUARTER_NOTE_BPM,
    type DifficultyLevel,
    type ExtendedGridType,
    type GridType,
    type CompositeBeat,
    type CompositeStream,
    type VariantBeat,
    type GridLockResult,
} from '../../../src/core/analysis/beat/index.js';

import type { UnifiedBeatMap } from '../../../src/core/types/BeatMap.js';
import type { GridDecision } from '../../../src/core/analysis/beat/RhythmQuantizer.js';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal mock UnifiedBeatMap for testing.
 * Only provides the fields used by DifficultyVariantGenerator (quarterNoteBpm).
 */
function createMockBeatMap(bpm: number = 60): UnifiedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    return {
        audioId: 'test-audio',
        duration: 10.0,
        beats: [],
        detectedBeatIndices: [],
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        originalMetadata: {
            algorithm: 'test',
            version: '1.0.0',
            minBpm: 40,
            maxBpm: 200,
            sensitivity: 1.0,
            filter: 0.0,
            noiseFloorThreshold: 0,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 80,
            gaussianSmoothMs: 50,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        },
    };
}

/**
 * Create a mock composite beat
 */
function createMockCompositeBeat(
    beatIndex: number,
    gridType: GridType,
    gridPosition: number,
    intensity: number = 0.5
): CompositeBeat {
    return {
        timestamp: beatIndex * 0.5 + gridPosition * 0.125,
        beatIndex,
        gridPosition,
        gridType,
        intensity,
        band: 'mid',
        sourceBand: 'mid',
    };
}

/**
 * Create a mock composite stream with specific grid types
 */
function createMockCompositeStream(
    beats: CompositeBeat[],
    naturalDifficulty: 'easy' | 'medium' | 'hard' = 'medium',
    quarterNoteInterval: number = 0.5
): CompositeStream {
    return {
        beats,
        sections: [],
        naturalDifficulty,
        quarterNoteInterval,
        metadata: {
            totalBeats: beats.length,
            sectionCount: 0,
            beatsPerBand: { low: 0, mid: beats.length, high: 0 },
            sectionsPerBand: { low: 0, mid: 1, high: 0 },
        },
    };
}

// ============================================================================
// SUBDIVISION_LIMITS Constant Tests
// ============================================================================

describe('SUBDIVISION_LIMITS', () => {
    it('should define limits for all three difficulty levels', () => {
        expect(SUBDIVISION_LIMITS).toHaveProperty('easy');
        expect(SUBDIVISION_LIMITS).toHaveProperty('medium');
        expect(SUBDIVISION_LIMITS).toHaveProperty('hard');
    });

    it('should have correct maxSubdivision for each difficulty', () => {
        expect(SUBDIVISION_LIMITS.easy.maxSubdivision).toBe('eighth');
        expect(SUBDIVISION_LIMITS.medium.maxSubdivision).toBe('sixteenth');
        expect(SUBDIVISION_LIMITS.hard.maxSubdivision).toBe('sixteenth');
    });

    it('should limit Easy to straight_8th and quarter_triplet only', () => {
        const easyTypes = SUBDIVISION_LIMITS.easy.allowedGridTypes;
        expect(easyTypes).toContain('straight_8th');
        expect(easyTypes).toContain('quarter_triplet');
        expect(easyTypes).not.toContain('straight_16th');
        expect(easyTypes).not.toContain('triplet_8th');
        expect(easyTypes.length).toBe(2);
    });

    it('should allow all grid types for Medium difficulty', () => {
        const mediumTypes = SUBDIVISION_LIMITS.medium.allowedGridTypes;
        expect(mediumTypes).toContain('straight_16th');
        expect(mediumTypes).toContain('triplet_8th');
        expect(mediumTypes).toContain('straight_8th');
        expect(mediumTypes).toContain('quarter_triplet');
        expect(mediumTypes.length).toBe(4);
    });

    it('should allow all grid types for Hard difficulty', () => {
        const hardTypes = SUBDIVISION_LIMITS.hard.allowedGridTypes;
        expect(hardTypes).toContain('straight_16th');
        expect(hardTypes).toContain('triplet_8th');
        expect(hardTypes).toContain('straight_8th');
        expect(hardTypes).toContain('quarter_triplet');
        expect(hardTypes.length).toBe(4);
    });

    it('should have descriptions for each difficulty', () => {
        expect(SUBDIVISION_LIMITS.easy.description).toBeTruthy();
        expect(SUBDIVISION_LIMITS.medium.description).toBeTruthy();
        expect(SUBDIVISION_LIMITS.hard.description).toBeTruthy();
    });
});

// ============================================================================
// ALL_GRID_TYPES Constant Tests
// ============================================================================

describe('ALL_GRID_TYPES', () => {
    it('should contain all five grid types', () => {
        expect(ALL_GRID_TYPES).toContain('straight_16th');
        expect(ALL_GRID_TYPES).toContain('triplet_8th');
        expect(ALL_GRID_TYPES).toContain('straight_8th');
        expect(ALL_GRID_TYPES).toContain('quarter_triplet');
        expect(ALL_GRID_TYPES).toContain('straight_4th');
        expect(ALL_GRID_TYPES.length).toBe(5);
    });
});

// ============================================================================
// isGridTypeAllowed Function Tests
// ============================================================================

describe('isGridTypeAllowed', () => {
    it('should return false for 16th notes on Easy', () => {
        expect(isGridTypeAllowed('straight_16th', 'easy')).toBe(false);
    });

    it('should return false for 8th triplets on Easy', () => {
        expect(isGridTypeAllowed('triplet_8th', 'easy')).toBe(false);
    });

    it('should return true for straight 8th on Easy', () => {
        // straight_8th is an ExtendedGridType, cast for testing purposes
        expect(isGridTypeAllowed('straight_8th' as GridType, 'easy')).toBe(true);
    });

    it('should return true for quarter triplet on Easy', () => {
        // quarter_triplet is an ExtendedGridType, cast for testing purposes
        expect(isGridTypeAllowed('quarter_triplet' as GridType, 'easy')).toBe(true);
    });

    it('should return true for all types on Medium', () => {
        const types: GridType[] = ['straight_16th', 'triplet_8th'];
        types.forEach(type => {
            expect(isGridTypeAllowed(type, 'medium')).toBe(true);
        });
    });

    it('should return true for all types on Hard', () => {
        const types: GridType[] = ['straight_16th', 'triplet_8th'];
        types.forEach(type => {
            expect(isGridTypeAllowed(type, 'hard')).toBe(true);
        });
    });
});

// ============================================================================
// getAllowedGridTypes Function Tests
// ============================================================================

describe('getAllowedGridTypes', () => {
    it('should return a copy of the allowed types array', () => {
        const easyTypes = getAllowedGridTypes('easy');
        const easyTypes2 = getAllowedGridTypes('easy');
        expect(easyTypes).not.toBe(easyTypes2); // Different array references
        expect(easyTypes).toEqual(easyTypes2); // Same contents
    });

    it('should return correct types for Easy', () => {
        const types = getAllowedGridTypes('easy');
        expect(types).toEqual(['straight_8th', 'quarter_triplet']);
    });

    it('should return all types for Medium', () => {
        const types = getAllowedGridTypes('medium');
        expect(types.length).toBe(4);
    });
});

// ============================================================================
// convertToAllowedGridType Function Tests
// ============================================================================

describe('convertToAllowedGridType', () => {
    describe('Easy difficulty conversions', () => {
        it('should convert straight_16th to straight_8th', () => {
            const result = convertToAllowedGridType('straight_16th', 'easy');
            expect(result).toBe('straight_8th');
        });

        it('should convert triplet_8th to quarter_triplet', () => {
            const result = convertToAllowedGridType('triplet_8th', 'easy');
            expect(result).toBe('quarter_triplet');
        });

        it('should return straight_8th unchanged', () => {
            const result = convertToAllowedGridType('straight_8th', 'easy');
            expect(result).toBe('straight_8th');
        });

        it('should return quarter_triplet unchanged', () => {
            const result = convertToAllowedGridType('quarter_triplet', 'easy');
            expect(result).toBe('quarter_triplet');
        });
    });

    describe('Medium difficulty', () => {
        it('should return all types unchanged', () => {
            const types: GridType[] = ['straight_16th', 'triplet_8th'];
            types.forEach(type => {
                expect(convertToAllowedGridType(type, 'medium')).toBe(type);
            });
        });
    });

    describe('Hard difficulty', () => {
        it('should return all types unchanged', () => {
            const types: GridType[] = ['straight_16th', 'triplet_8th'];
            types.forEach(type => {
                expect(convertToAllowedGridType(type, 'hard')).toBe(type);
            });
        });
    });
});

// ============================================================================
// naturalDifficultyToLevel Function Tests
// ============================================================================

describe('naturalDifficultyToLevel', () => {
    it('should convert easy to easy', () => {
        expect(naturalDifficultyToLevel('easy')).toBe('easy');
    });

    it('should convert medium to medium', () => {
        expect(naturalDifficultyToLevel('medium')).toBe('medium');
    });

    it('should convert hard to hard', () => {
        expect(naturalDifficultyToLevel('hard')).toBe('hard');
    });
});

// ============================================================================
// getTempoAwareAllowedGridTypes Tests
// ============================================================================

describe('getTempoAwareAllowedGridTypes', () => {
    describe('Natural difficulty', () => {
        it('should always allow all types regardless of BPM', () => {
            expect(getTempoAwareAllowedGridTypes('natural', 60)).toContain('straight_16th');
            expect(getTempoAwareAllowedGridTypes('natural', 120)).toContain('straight_16th');
            expect(getTempoAwareAllowedGridTypes('natural', 200)).toContain('straight_16th');
        });
    });

    describe('Easy difficulty', () => {
        it('should use straight_8th + quarter_triplet at BPM <= 120', () => {
            const types = getTempoAwareAllowedGridTypes('easy', 120);
            expect(types).toContain('straight_8th');
            expect(types).toContain('quarter_triplet');
            expect(types).not.toContain('straight_16th');
            expect(types).not.toContain('straight_4th');
        });

        it('should use straight_4th + quarter_triplet at BPM > 120', () => {
            const types = getTempoAwareAllowedGridTypes('easy', 121);
            expect(types).toContain('straight_4th');
            expect(types).toContain('quarter_triplet');
            expect(types).not.toContain('straight_8th');
            expect(types).not.toContain('straight_16th');
        });
    });

    describe('Medium difficulty', () => {
        it('should allow all types at BPM < 70', () => {
            const types = getTempoAwareAllowedGridTypes('medium', 69);
            expect(types).toContain('straight_16th');
            expect(types).toContain('triplet_8th');
            expect(types).toContain('straight_8th');
            expect(types).toContain('quarter_triplet');
        });

        it('should restrict to straight_8th + quarter_triplet at BPM >= 70', () => {
            const types = getTempoAwareAllowedGridTypes('medium', 70);
            expect(types).toContain('straight_8th');
            expect(types).toContain('quarter_triplet');
            expect(types).not.toContain('straight_16th');
            expect(types).not.toContain('triplet_8th');
        });

        it('should remain restricted at high BPM', () => {
            const types = getTempoAwareAllowedGridTypes('medium', 200);
            expect(types).toContain('straight_8th');
            expect(types).toContain('quarter_triplet');
            expect(types).not.toContain('straight_16th');
        });
    });

    describe('Hard difficulty', () => {
        it('should allow all types at BPM <= 120', () => {
            const types = getTempoAwareAllowedGridTypes('hard', 120);
            expect(types).toContain('straight_16th');
            expect(types).toContain('triplet_8th');
            expect(types).toContain('straight_8th');
            expect(types).toContain('quarter_triplet');
        });

        it('should restrict to straight_8th + quarter_triplet at BPM > 120', () => {
            const types = getTempoAwareAllowedGridTypes('hard', 121);
            expect(types).toContain('straight_8th');
            expect(types).toContain('quarter_triplet');
            expect(types).not.toContain('straight_16th');
            expect(types).not.toContain('triplet_8th');
        });
    });
});

// ============================================================================
// BPM Threshold Constants Tests
// ============================================================================

describe('BPM threshold constants', () => {
    it('should have MEDIUM_RESTRICT_BPM = 70', () => {
        expect(MEDIUM_RESTRICT_BPM).toBe(70);
    });

    it('should have HARD_RESTRICT_BPM = 120', () => {
        expect(HARD_RESTRICT_BPM).toBe(120);
    });

    it('should have EASY_QUARTER_NOTE_BPM = 120', () => {
        expect(EASY_QUARTER_NOTE_BPM).toBe(120);
    });
});

// ============================================================================
// isGridTypeAllowed with BPM Tests
// ============================================================================

describe('isGridTypeAllowed with BPM', () => {
    it('should use static limits when BPM is omitted', () => {
        expect(isGridTypeAllowed('straight_16th', 'medium')).toBe(true);
    });

    it('should restrict 16th notes for medium at BPM >= 70', () => {
        expect(isGridTypeAllowed('straight_16th', 'medium', 70)).toBe(false);
        expect(isGridTypeAllowed('straight_16th', 'medium', 69)).toBe(true);
    });

    it('should restrict 16th notes for hard at BPM > 120', () => {
        expect(isGridTypeAllowed('straight_16th', 'hard', 121)).toBe(false);
        expect(isGridTypeAllowed('straight_16th', 'hard', 120)).toBe(true);
    });

    it('should restrict 8th notes for easy at BPM > 120', () => {
        expect(isGridTypeAllowed('straight_8th' as GridType, 'easy', 121)).toBe(false);
        expect(isGridTypeAllowed('straight_8th' as GridType, 'easy', 120)).toBe(true);
    });
});

// ============================================================================
// convertToAllowedGridType with BPM Tests
// ============================================================================

describe('convertToAllowedGridType with BPM', () => {
    describe('Medium at BPM >= 70', () => {
        it('should convert straight_16th to straight_8th', () => {
            expect(convertToAllowedGridType('straight_16th', 'medium', 70)).toBe('straight_8th');
        });

        it('should convert triplet_8th to quarter_triplet', () => {
            expect(convertToAllowedGridType('triplet_8th', 'medium', 70)).toBe('quarter_triplet');
        });

        it('should keep straight_8th unchanged', () => {
            expect(convertToAllowedGridType('straight_8th', 'medium', 70)).toBe('straight_8th');
        });
    });

    describe('Easy at BPM > 120', () => {
        it('should convert straight_16th to straight_4th', () => {
            expect(convertToAllowedGridType('straight_16th', 'easy', 121)).toBe('straight_4th');
        });

        it('should convert straight_8th to straight_4th', () => {
            expect(convertToAllowedGridType('straight_8th', 'easy', 121)).toBe('straight_4th');
        });

        it('should convert triplet_8th to quarter_triplet', () => {
            expect(convertToAllowedGridType('triplet_8th', 'easy', 121)).toBe('quarter_triplet');
        });

        it('should keep quarter_triplet unchanged', () => {
            expect(convertToAllowedGridType('quarter_triplet', 'easy', 121)).toBe('quarter_triplet');
        });
    });

    describe('Hard at BPM > 120', () => {
        it('should convert straight_16th to straight_8th', () => {
            expect(convertToAllowedGridType('straight_16th', 'hard', 121)).toBe('straight_8th');
        });

        it('should convert triplet_8th to quarter_triplet', () => {
            expect(convertToAllowedGridType('triplet_8th', 'hard', 121)).toBe('quarter_triplet');
        });
    });
});

// ============================================================================
// BPM-Dependent DifficultyVariantGenerator Integration Tests
// ============================================================================

describe('BPM-dependent variant generation', () => {
    describe('Medium at BPM >= 70', () => {
        it('should restrict medium variant to straight_8th and quarter_triplet at BPM 100', () => {
            const generator = new DifficultyVariantGenerator();

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap(100));

            // Medium variant should NOT have straight_16th or triplet_8th
            for (const beat of variants.medium.beats) {
                expect(beat.gridType).not.toBe('straight_16th');
                expect(beat.gridType).not.toBe('triplet_8th');
            }
        });

        it('should allow all types for medium at BPM 60', () => {
            const generator = new DifficultyVariantGenerator();

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap(60));

            // At BPM 60, medium is unedited (natural difficulty = medium, all types allowed)
            expect(variants.medium.isUnedited).toBe(true);
        });
    });

    describe('Easy at BPM > 120', () => {
        it('should restrict easy variant to straight_4th and quarter_triplet at BPM 140', () => {
            const generator = new DifficultyVariantGenerator();

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
                createMockCompositeBeat(1, 'straight_8th' as GridType, 0, 0.8),
                createMockCompositeBeat(2, 'triplet_8th', 0, 0.9),
            ];
            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap(140));

            // Easy variant should only have straight_4th and quarter_triplet
            for (const beat of variants.easy.beats) {
                expect(['straight_4th', 'quarter_triplet']).toContain(beat.gridType);
            }
        });

        it('should use straight_8th for easy at BPM 120', () => {
            const generator = new DifficultyVariantGenerator();

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            ];
            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap(120));

            // At BPM 120, easy uses straight_8th (not straight_4th)
            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
        });
    });

    describe('Hard at BPM > 120', () => {
        it('should restrict hard variant to straight_8th and quarter_triplet at BPM 140', () => {
            const generator = new DifficultyVariantGenerator();

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 1, 0.7),
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
                createMockCompositeBeat(1, 'triplet_8th', 1, 0.6),
            ];
            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap(140));

            // Hard variant at BPM 140 should NOT have straight_16th or triplet_8th
            for (const beat of variants.hard.beats) {
                expect(beat.gridType).not.toBe('straight_16th');
                expect(beat.gridType).not.toBe('triplet_8th');
            }
        });

        it('should allow all types for hard at BPM 120', () => {
            const generator = new DifficultyVariantGenerator();

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'triplet_8th', 1, 0.7),
            ];
            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap(120));

            // At BPM 120, hard is unedited (natural = hard, all types allowed)
            expect(variants.hard.isUnedited).toBe(true);
        });
    });
});

// ============================================================================
// validateSubdivisionLimits Function Tests
// ============================================================================

describe('validateSubdivisionLimits', () => {
    it('should return valid for beats that meet Easy limits', () => {
        const beats = [
            createMockCompositeBeat(0, 'straight_16th', 0), // Position 0 = valid for 8th
            createMockCompositeBeat(1, 'straight_16th', 2), // Position 2 = valid for 8th
        ];
        // Note: The validation checks gridType, not position
        // These will fail because gridType is 'straight_16th'
        const result = validateSubdivisionLimits(beats, 'easy');
        expect(result.isValid).toBe(false);
        expect(result.violationCount).toBe(2);
    });

    it('should return invalid for 16th notes on Easy', () => {
        const beats = [
            createMockCompositeBeat(0, 'straight_16th', 0),
            createMockCompositeBeat(0, 'straight_16th', 1), // 16th note
            createMockCompositeBeat(0, 'straight_16th', 2),
            createMockCompositeBeat(0, 'straight_16th', 3), // 16th note
        ];
        const result = validateSubdivisionLimits(beats, 'easy');
        expect(result.isValid).toBe(false);
        expect(result.violationCount).toBe(4);
    });

    it('should return valid for all beats on Medium', () => {
        const beats = [
            createMockCompositeBeat(0, 'straight_16th', 0),
            createMockCompositeBeat(0, 'triplet_8th', 1),
        ];
        const result = validateSubdivisionLimits(beats, 'medium');
        expect(result.isValid).toBe(true);
        expect(result.violationCount).toBe(0);
    });

    it('should return valid for all beats on Hard', () => {
        const beats = [
            createMockCompositeBeat(0, 'straight_16th', 0),
            createMockCompositeBeat(0, 'triplet_8th', 1),
        ];
        const result = validateSubdivisionLimits(beats, 'hard');
        expect(result.isValid).toBe(true);
        expect(result.violationCount).toBe(0);
    });

    it('should include suggested conversion in violations', () => {
        const beats = [createMockCompositeBeat(0, 'straight_16th', 1)];
        const result = validateSubdivisionLimits(beats, 'easy');
        expect(result.isValid).toBe(false);
        expect(result.violations[0].suggestedConversion).toBe('straight_8th');
    });

    it('should handle empty beat arrays', () => {
        const result = validateSubdivisionLimits([], 'easy');
        expect(result.isValid).toBe(true);
        expect(result.totalBeats).toBe(0);
        expect(result.violationCount).toBe(0);
    });
});

// ============================================================================
// DifficultyVariantGenerator Class Tests
// ============================================================================

describe('DifficultyVariantGenerator', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    describe('constructor', () => {
        it('should use default configuration', () => {
            const config = generator.getConfig();
            expect(config.logConversions).toBe(false);
            expect(config.preservePhraseBoundaries).toBe(true);
            expect(config.simplificationIntensityThreshold).toBe(0.3);
        });

        it('should accept custom configuration', () => {
            const customGenerator = new DifficultyVariantGenerator({
                logConversions: true,
                simplificationIntensityThreshold: 0.5,
            });
            const config = customGenerator.getConfig();
            expect(config.logConversions).toBe(true);
            expect(config.simplificationIntensityThreshold).toBe(0.5);
        });
    });

    describe('generate', () => {
        it('should return all three difficulty variants', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(1, 'straight_16th', 2),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants).toHaveProperty('easy');
            expect(variants).toHaveProperty('medium');
            expect(variants).toHaveProperty('hard');
        });

        it('should mark the natural difficulty variant as unedited', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(1, 'straight_16th', 2),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.medium.isUnedited).toBe(true);
            expect(variants.medium.editType).toBe('none');
            expect(variants.medium.editAmount).toBe(0);
        });

        it('should mark easier variants as simplified when natural difficulty is higher', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(0, 'straight_16th', 1),
                createMockCompositeBeat(0, 'straight_16th', 2),
                createMockCompositeBeat(0, 'straight_16th', 3),
            ];
            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.isUnedited).toBe(false);
            expect(variants.easy.editType).toBe('simplified');
        });

        it('should mark harder variants as interpolated when natural difficulty is lower', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(1, 'straight_16th', 2),
            ];
            const composite = createMockCompositeStream(beats, 'easy');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.medium.isUnedited).toBe(false);
            expect(variants.medium.editType).toBe('interpolated');
            expect(variants.hard.isUnedited).toBe(false);
            expect(variants.hard.editType).toBe('interpolated');
        });

        it('should include conversion metadata for simplified variants', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(1, 'triplet_8th', 1),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.conversionMetadata).toBeDefined();
            expect(variants.easy.conversionMetadata?.sixteenthToEighth).toBe(1);
            expect(variants.easy.conversionMetadata?.tripletToQuarterTriplet).toBe(1);
        });

        it('should copy beats from composite', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(1, 'straight_16th', 2),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            // Should be a copy, not the same reference
            expect(variants.medium.beats).not.toBe(composite.beats);
            expect(variants.medium.beats.length).toBe(composite.beats.length);
        });
    });

    describe('getConfig', () => {
        it('should return a copy of the configuration', () => {
            const config1 = generator.getConfig();
            const config2 = generator.getConfig();
            expect(config1).not.toBe(config2);
            expect(config1).toEqual(config2);
        });
    });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('DifficultyVariantGenerator Integration', () => {
    it('should handle a realistic composite stream', () => {
        const generator = new DifficultyVariantGenerator({ logConversions: true });

        // Create a composite with mixed grid types
        const beats: CompositeBeat[] = [
            // Beat 0: 16th note pattern
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            createMockCompositeBeat(0, 'straight_16th', 1, 0.5),
            createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
            createMockCompositeBeat(0, 'straight_16th', 3, 0.4),
            // Beat 1: triplet pattern
            createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
            createMockCompositeBeat(1, 'triplet_8th', 1, 0.6),
            createMockCompositeBeat(1, 'triplet_8th', 2, 0.5),
            // Beat 2: sparse
            createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
        ];

        const composite = createMockCompositeStream(beats, 'hard');
        const variants = generator.generate(composite, createMockBeatMap());

        // Verify all variants exist
        expect(variants.easy).toBeDefined();
        expect(variants.medium).toBeDefined();
        expect(variants.hard).toBeDefined();

        // Verify natural difficulty variant is unedited
        expect(variants.hard.isUnedited).toBe(true);

        // Verify Easy variant has conversion metadata
        expect(variants.easy.editType).toBe('simplified');
        expect(variants.easy.conversionMetadata?.totalBeatsBefore).toBe(8);
    });
});

// ============================================================================
// Phrase Boundary Preservation Tests
// ============================================================================

describe('Phrase Boundary Preservation', () => {
    /**
     * Create a mock phrase analysis result with phrases at specific beat indices
     */
    function createMockPhraseAnalysis(
        phraseBeats: { startBeatIndex: number; sizeInBeats: number; significance: number }[]
    ): import('../../../src/core/analysis/beat/PhraseAnalyzer.js').PhraseAnalysisResult {
        const phrases: import('../../../src/core/analysis/beat/PhraseAnalyzer.js').RhythmicPhrase[] =
            phraseBeats.map((p, i) => ({
                id: `phrase-${i}`,
                pattern: [],
                sizeInBeats: p.sizeInBeats,
                sourceBand: 'mid' as const,
                occurrences: [
                    {
                        beatIndex: p.startBeatIndex,
                        startTimestamp: p.startBeatIndex * 0.5,
                        endTimestamp: (p.startBeatIndex + p.sizeInBeats) * 0.5,
                    },
                ],
                significance: p.significance,
                hasVariation: true,
                availableForReuse: true,
            }));

        return {
            phrases,
            phrasesByBand: new Map([['mid', phrases]]),
            mostSignificantPhrases: phrases.filter(p => p.significance > 2),
            phrasesBySize: new Map([[2, phrases.filter(p => p.sizeInBeats === 2)]]),
            patternLibrary: phrases.filter(p => p.hasVariation && p.availableForReuse),
            bandAnalysis: {
                low: { band: 'low', phrases: [], phrasesBySize: new Map(), phrasesWithVariation: [] },
                mid: { band: 'mid', phrases, phrasesBySize: new Map(), phrasesWithVariation: phrases },
                high: { band: 'high', phrases: [], phrasesBySize: new Map(), phrasesWithVariation: [] },
            },
        };
    }

    it('should preserve beats that are part of significant phrases during heavy simplification', () => {
        // Create a generator with phrase preservation enabled
        const generator = new DifficultyVariantGenerator({
            preservePhraseBoundaries: true,
            heavySimplificationIntensityThreshold: 0.5,
            logConversions: true,
        });

        // Create beats where beat 1 is part of a significant phrase
        // Beat 1 is NOT a strong beat (0 and 2 are strong in 0-indexed), so it would normally be removed
        // But if it's part of a phrase with high significance, it should be preserved
        const beats = [
            // Beat 0 (strong) - will always be kept
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            createMockCompositeBeat(0, 'straight_16th', 1, 0.4), // Low intensity offbeat
            createMockCompositeBeat(0, 'straight_16th', 2, 0.4), // Low intensity
            createMockCompositeBeat(0, 'straight_16th', 3, 0.4), // Low intensity offbeat
            // Beat 1 (weak) - would normally be removed during heavy simplification
            // Intensity 0.36 is below threshold * 0.7 = 0.35 for downbeats (would be removed)
            // But intensity - threshold = 0.36 - 0.5 = -0.14, which is >= -0.15 (close to threshold)
            // And it's part of a significant phrase (significance: 3.0), so it should be preserved
            createMockCompositeBeat(1, 'straight_16th', 0, 0.36), // Close to threshold, in phrase
            createMockCompositeBeat(1, 'straight_16th', 1, 0.36),
            createMockCompositeBeat(1, 'straight_16th', 2, 0.36),
            createMockCompositeBeat(1, 'straight_16th', 3, 0.36),
            // Beat 2 (strong)
            createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
        ];

        const composite = createMockCompositeStream(beats, 'hard');

        // Create phrase analysis where beat 1 is part of a significant 1-beat phrase
        const phraseAnalysis = createMockPhraseAnalysis([
            { startBeatIndex: 1, sizeInBeats: 1, significance: 3.0 }, // High significance phrase at beat 1
        ]);

        const variants = generator.generate(composite, createMockBeatMap(), phraseAnalysis);

        // Easy variant should be simplified
        expect(variants.easy.editType).toBe('simplified');

        // Without phrase preservation, beat 1 would be completely removed (it's a weak beat with low intensity)
        // With phrase preservation, some beats from beat 1 should be kept
        const beatsAtBeat1 = variants.easy.beats.filter(b => b.beatIndex === 1);
        expect(beatsAtBeat1.length).toBeGreaterThan(0);
    });

    it('should not affect simplification when preservePhraseBoundaries is disabled', () => {
        // Create a generator with phrase preservation DISABLED
        const generator = new DifficultyVariantGenerator({
            preservePhraseBoundaries: false,
            heavySimplificationIntensityThreshold: 0.5,
        });

        const beats = [
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            createMockCompositeBeat(0, 'straight_16th', 1, 0.4),
            // Beat 1 has intensity 0.2, which is below threshold * 0.7 = 0.35
            // So it should be removed without phrase preservation
            createMockCompositeBeat(1, 'straight_16th', 0, 0.2),
            createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
        ];

        const composite = createMockCompositeStream(beats, 'hard');

        // Create phrase analysis (but it won't be used since preservation is disabled)
        const phraseAnalysis = createMockPhraseAnalysis([
            { startBeatIndex: 1, sizeInBeats: 1, significance: 3.0 },
        ]);

        const variants = generator.generate(composite, createMockBeatMap(), phraseAnalysis);

        // Beat 1 should be completely removed since preservation is disabled
        const beatsAtBeat1 = variants.easy.beats.filter(b => b.beatIndex === 1);
        expect(beatsAtBeat1.length).toBe(0);
    });

    it('should not preserve beats from low-significance phrases', () => {
        const generator = new DifficultyVariantGenerator({
            preservePhraseBoundaries: true,
            heavySimplificationIntensityThreshold: 0.5,
        });

        const beats = [
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            // Beat 1 has intensity 0.2, which is below threshold * 0.7 = 0.35
            // It would only be kept if phrase preservation kicks in
            createMockCompositeBeat(1, 'straight_16th', 0, 0.2),
            createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
        ];

        const composite = createMockCompositeStream(beats, 'hard');

        // Create phrase analysis with LOW significance (below 1.5 threshold)
        const phraseAnalysis = createMockPhraseAnalysis([
            { startBeatIndex: 1, sizeInBeats: 1, significance: 0.5 }, // Low significance
        ]);

        const variants = generator.generate(composite, createMockBeatMap(), phraseAnalysis);

        // Beat 1 should be removed since the phrase significance is too low
        const beatsAtBeat1 = variants.easy.beats.filter(b => b.beatIndex === 1);
        expect(beatsAtBeat1.length).toBe(0);
    });
});

// ============================================================================
// Easy Variant Grid Type Enforcement Tests
// ============================================================================

describe('Easy Variant Grid Type Enforcement', () => {
    /**
     * Helper to verify that an Easy variant contains ONLY allowed grid types
     */
    function assertEasyVariantHasOnlyAllowedGridTypes(variant: import('../../../src/core/analysis/beat/index.js').DifficultyVariant) {
        const allowedGridTypes = ['straight_8th', 'quarter_triplet'] as const;
        const disallowedGridTypes = ['straight_16th', 'triplet_8th'] as const;

        for (const beat of variant.beats) {
            expect(allowedGridTypes).toContain(beat.gridType);
            expect(disallowedGridTypes).not.toContain(beat.gridType);
        }
    }

    describe('when composite has ONLY straight_16th notes', () => {
        it('should convert ALL beats to straight_8th for Easy variant', () => {
            const generator = new DifficultyVariantGenerator();

            // Create a composite with ONLY 16th notes
            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 1, 0.7),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.8),
                createMockCompositeBeat(0, 'straight_16th', 3, 0.6),
                createMockCompositeBeat(1, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(1, 'straight_16th', 1, 0.5),
                createMockCompositeBeat(1, 'straight_16th', 2, 0.7),
                createMockCompositeBeat(1, 'straight_16th', 3, 0.4),
                createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(2, 'straight_16th', 2, 0.6),
            ];

            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            // Verify Easy variant has only allowed grid types
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);

            // Verify ALL beats are straight_8th (since we only had 16th notes)
            for (const beat of variants.easy.beats) {
                expect(beat.gridType).toBe('straight_8th');
            }

            // Verify conversion metadata
            expect(variants.easy.conversionMetadata?.sixteenthToEighth).toBeGreaterThan(0);
        });

        it('should deduplicate 16th notes that snap to the same 8th position', () => {
            const generator = new DifficultyVariantGenerator();

            // Create beats where position 0 and 1 both snap to position 0
            // and position 2 and 3 both snap to position 2
            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9), // Position 0
                createMockCompositeBeat(0, 'straight_16th', 1, 0.7), // Snaps to 0
                createMockCompositeBeat(0, 'straight_16th', 2, 0.8), // Position 2
                createMockCompositeBeat(0, 'straight_16th', 3, 0.6), // Snaps to 2
            ];

            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            // After deduplication, we should have at most 2 beats per beat index
            const beatsPerIndex = new Map<number, number>();
            for (const beat of variants.easy.beats) {
                const count = beatsPerIndex.get(beat.beatIndex) ?? 0;
                beatsPerIndex.set(beat.beatIndex, count + 1);
            }

            for (const [, count] of beatsPerIndex) {
                expect(count).toBeLessThanOrEqual(2); // Max 2 positions in 8th grid (0 and 2)
            }

            // Verify all beats are straight_8th
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);
        });
    });

    describe('when composite has ONLY triplet_8th notes', () => {
        it('should convert ALL beats to quarter_triplet for Easy variant', () => {
            const generator = new DifficultyVariantGenerator();

            // Create a composite with ONLY 8th triplet notes
            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'triplet_8th', 0, 0.9),
                createMockCompositeBeat(0, 'triplet_8th', 1, 0.7),
                createMockCompositeBeat(0, 'triplet_8th', 2, 0.8),
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.9),
                createMockCompositeBeat(1, 'triplet_8th', 1, 0.5),
                createMockCompositeBeat(1, 'triplet_8th', 2, 0.7),
                createMockCompositeBeat(2, 'triplet_8th', 0, 0.9),
            ];

            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            // Verify Easy variant has only allowed grid types
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);

            // Verify ALL beats are quarter_triplet (since we only had triplet_8th)
            for (const beat of variants.easy.beats) {
                expect(beat.gridType).toBe('quarter_triplet');
            }

            // Verify conversion metadata
            expect(variants.easy.conversionMetadata?.tripletToQuarterTriplet).toBeGreaterThan(0);
        });

        it('should deduplicate triplet positions to single quarter_triplet per beat', () => {
            const generator = new DifficultyVariantGenerator();

            // All triplet positions snap to position 0
            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'triplet_8th', 0, 0.9),
                createMockCompositeBeat(0, 'triplet_8th', 1, 0.7),
                createMockCompositeBeat(0, 'triplet_8th', 2, 0.8),
            ];

            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            // All should deduplicate to a single beat
            const beatsAtBeat0 = variants.easy.beats.filter(b => b.beatIndex === 0);
            expect(beatsAtBeat0.length).toBe(1);
            expect(beatsAtBeat0[0].gridType).toBe('quarter_triplet');
            expect(beatsAtBeat0[0].gridPosition).toBe(0);
        });
    });

    describe('heavy simplification (hard → easy)', () => {
        it('should NEVER produce disallowed grid types', () => {
            const generator = new DifficultyVariantGenerator({
                heavySimplificationIntensityThreshold: 0.5,
            });

            // Create a complex hard composite with all grid types
            const beats: CompositeBeat[] = [
                // Beat 0 (strong): 16th notes
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 1, 0.6),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
                createMockCompositeBeat(0, 'straight_16th', 3, 0.5),
                // Beat 1 (weak): triplets - most should be removed
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.4),
                createMockCompositeBeat(1, 'triplet_8th', 1, 0.3),
                createMockCompositeBeat(1, 'triplet_8th', 2, 0.35),
                // Beat 2 (strong): mixed
                createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(2, 'triplet_8th', 1, 0.7),
                // Beat 3 (weak): mostly low intensity
                createMockCompositeBeat(3, 'straight_16th', 0, 0.3),
                createMockCompositeBeat(3, 'triplet_8th', 1, 0.25),
            ];

            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            // CRITICAL: Easy variant must NEVER have disallowed types
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);

            // Verify edit type is simplified
            expect(variants.easy.editType).toBe('simplified');
            expect(variants.easy.isUnedited).toBe(false);
        });

        it('should preserve strong beats with high intensity during heavy simplification', () => {
            const generator = new DifficultyVariantGenerator({
                heavySimplificationIntensityThreshold: 0.5,
            });

            const beats: CompositeBeat[] = [
                // Beat 0 (strong): high intensity - should be kept
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.8),
                // Beat 1 (weak): low intensity - should be removed
                createMockCompositeBeat(1, 'straight_16th', 0, 0.2),
                // Beat 2 (strong): high intensity - should be kept
                createMockCompositeBeat(2, 'straight_16th', 0, 0.95),
            ];

            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            // Easy should have beats from beat 0 and 2, but not beat 1
            const hasBeat0 = variants.easy.beats.some(b => b.beatIndex === 0);
            const hasBeat2 = variants.easy.beats.some(b => b.beatIndex === 2);

            expect(hasBeat0).toBe(true);
            expect(hasBeat2).toBe(true);

            // All remaining beats should have allowed grid types
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);
        });
    });

    describe('mixed grid types conversion', () => {
        it('should correctly convert both 16th and triplet_8th to allowed types', () => {
            const generator = new DifficultyVariantGenerator();

            // Mix of 16th notes and triplets
            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
                createMockCompositeBeat(1, 'triplet_8th', 2, 0.6),
                createMockCompositeBeat(2, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(3, 'triplet_8th', 0, 0.7),
            ];

            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            // All Easy beats must be allowed types
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);

            // Verify we have both straight_8th and quarter_triplet
            const gridTypes = new Set(variants.easy.beats.map(b => b.gridType));
            expect(gridTypes.has('straight_8th')).toBe(true);
            expect(gridTypes.has('quarter_triplet')).toBe(true);
        });

        it('should handle composite that is already Easy-compatible', () => {
            const generator = new DifficultyVariantGenerator();

            // Beats that are already in Easy-allowed types
            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_8th' as GridType, 0, 0.9),
                createMockCompositeBeat(0, 'straight_8th' as GridType, 2, 0.7),
                createMockCompositeBeat(1, 'straight_8th' as GridType, 0, 0.8),
            ];

            const composite = createMockCompositeStream(beats, 'easy');
            const variants = generator.generate(composite, createMockBeatMap());

            // Easy variant should be unedited
            expect(variants.easy.isUnedited).toBe(true);
            expect(variants.easy.editType).toBe('none');

            // All beats should remain straight_8th
            for (const beat of variants.easy.beats) {
                expect(beat.gridType).toBe('straight_8th');
            }
        });
    });

    describe('empty and minimal composites', () => {
        it('should handle empty composite stream', () => {
            const generator = new DifficultyVariantGenerator();

            const composite = createMockCompositeStream([], 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats).toHaveLength(0);
            expect(variants.easy.conversionMetadata?.totalBeatsBefore).toBe(0);
            expect(variants.easy.conversionMetadata?.totalBeatsAfter).toBe(0);
        });

        it('should handle single beat composite with disallowed grid type', () => {
            const generator = new DifficultyVariantGenerator();

            const beats = [createMockCompositeBeat(0, 'straight_16th', 0, 0.9)];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats).toHaveLength(1);
            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
        });

        it('should handle composite where ALL beats are on weak indices with low intensity during heavy simplification', () => {
            // Edge case: all beats are on weak beat indices (1, 3) with intensity below threshold
            // During heavy simplification (hard -> easy), these should all be filtered out
            const generator = new DifficultyVariantGenerator({
                heavySimplificationIntensityThreshold: 0.5,
            });

            const beats: CompositeBeat[] = [
                // Beat 1 (weak) - low intensity, should be removed
                createMockCompositeBeat(1, 'straight_16th', 0, 0.2),
                createMockCompositeBeat(1, 'straight_16th', 2, 0.15),
                // Beat 3 (weak) - low intensity, should be removed
                createMockCompositeBeat(3, 'straight_16th', 0, 0.1),
                createMockCompositeBeat(3, 'triplet_8th', 1, 0.2),
            ];

            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            // Easy variant should be empty since all beats were on weak indices with low intensity
            expect(variants.easy.beats).toHaveLength(0);

            // Verify the edit type is still simplified
            expect(variants.easy.editType).toBe('simplified');

            // CRITICAL: Even empty result must not have disallowed grid types (trivially true)
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);
        });

        it('should preserve strong beats even when all other beats are filtered out', () => {
            // Strong beats (0, 2, 4, etc.) should ALWAYS be kept regardless of intensity
            const generator = new DifficultyVariantGenerator({
                heavySimplificationIntensityThreshold: 0.5,
            });

            const beats: CompositeBeat[] = [
                // Beat 0 (strong) - even low intensity should be kept
                createMockCompositeBeat(0, 'straight_16th', 0, 0.1),
                // Beat 1 (weak) - low intensity, should be removed
                createMockCompositeBeat(1, 'straight_16th', 0, 0.2),
                // Beat 2 (strong) - even low intensity should be kept
                createMockCompositeBeat(2, 'straight_16th', 0, 0.15),
            ];

            const composite = createMockCompositeStream(beats, 'hard');
            const variants = generator.generate(composite, createMockBeatMap());

            // Easy variant should have beats from beat 0 and 2 (strong beats)
            expect(variants.easy.beats.length).toBeGreaterThan(0);

            // All beats should be from strong beat indices
            for (const beat of variants.easy.beats) {
                expect([0, 2, 4, 6, 8]).toContain(beat.beatIndex % 4);
            }

            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);
        });
    });

    describe('invariant verification', () => {
        it('should NEVER produce straight_16th in Easy variant regardless of input', () => {
            const generator = new DifficultyVariantGenerator();

            // Try various combinations
            const testCases: CompositeBeat[][] = [
                // All 16th
                [
                    createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                    createMockCompositeBeat(0, 'straight_16th', 1, 0.8),
                    createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
                    createMockCompositeBeat(0, 'straight_16th', 3, 0.6),
                ],
                // Mixed
                [
                    createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                    createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
                ],
                // Heavy pattern
                Array.from({ length: 20 }, (_, i) =>
                    createMockCompositeBeat(
                        Math.floor(i / 4),
                        i % 2 === 0 ? 'straight_16th' : 'triplet_8th',
                        i % 4,
                        0.5 + Math.random() * 0.5
                    )
                ),
            ];

            for (const beats of testCases) {
                const composite = createMockCompositeStream(beats, 'hard');
                const variants = generator.generate(composite, createMockBeatMap());

                // CRITICAL INVARIANT: Easy must never have straight_16th
                const has16th = variants.easy.beats.some(b => b.gridType === 'straight_16th');
                expect(has16th).toBe(false);
            }
        });

        it('should NEVER produce disallowed grid types even when natural difficulty is easy but composite has them', () => {
            // Edge case: natural difficulty is marked as 'easy' but composite contains disallowed grid types
            // This could happen if DensityAnalyzer incorrectly classifies a composite
            // The generator should STILL ensure Easy variant only has allowed types
            const generator = new DifficultyVariantGenerator({ logConversions: true });

            const beats: CompositeBeat[] = [
                createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
                createMockCompositeBeat(0, 'straight_16th', 2, 0.7),
                createMockCompositeBeat(1, 'triplet_8th', 0, 0.8),
            ];

            // Simulate incorrect natural difficulty classification
            const composite = createMockCompositeStream(beats, 'easy');
            const variants = generator.generate(composite, createMockBeatMap());

            // CRITICAL INVARIANT: Even though natural difficulty is 'easy',
            // the Easy variant must NEVER have disallowed grid types
            assertEasyVariantHasOnlyAllowedGridTypes(variants.easy);
        });

        it('should NEVER produce triplet_8th in Easy variant regardless of input', () => {
            const generator = new DifficultyVariantGenerator();

            const testCases: CompositeBeat[][] = [
                // All triplets
                [
                    createMockCompositeBeat(0, 'triplet_8th', 0, 0.9),
                    createMockCompositeBeat(0, 'triplet_8th', 1, 0.8),
                    createMockCompositeBeat(0, 'triplet_8th', 2, 0.7),
                ],
                // Mixed
                [
                    createMockCompositeBeat(0, 'triplet_8th', 0, 0.9),
                    createMockCompositeBeat(1, 'straight_16th', 0, 0.8),
                ],
            ];

            for (const beats of testCases) {
                const composite = createMockCompositeStream(beats, 'medium');
                const variants = generator.generate(composite, createMockBeatMap());

                // CRITICAL INVARIANT: Easy must never have triplet_8th
                const hasTriplet8th = variants.easy.beats.some(b => b.gridType === 'triplet_8th');
                expect(hasTriplet8th).toBe(false);
            }
        });
    });
});

// ============================================================================
// Timestamp Recalculation Tests
// ============================================================================

describe('Timestamp Recalculation After Grid Type Conversion', () => {
    /**
     * Helper to create a beat with explicit timestamp for testing
     */
    function createBeatWithTimestamp(
        beatIndex: number,
        gridType: GridType,
        gridPosition: number,
        timestamp: number,
        intensity: number = 0.5
    ): CompositeBeat {
        return {
            timestamp,
            beatIndex,
            gridPosition,
            gridType,
            intensity,
            band: 'mid',
            sourceBand: 'mid',
        };
    }

    /**
     * Helper to create a composite stream with explicit quarterNoteInterval
     */
    function createCompositeStreamWithInterval(
        beats: CompositeBeat[],
        naturalDifficulty: 'easy' | 'medium' | 'hard' = 'medium',
        quarterNoteInterval: number = 0.5
    ): CompositeStream {
        return {
            beats,
            sections: [],
            naturalDifficulty,
            quarterNoteInterval,
            metadata: {
                totalBeats: beats.length,
                sectionCount: 0,
                beatsPerBand: { low: 0, mid: beats.length, high: 0 },
                sectionsPerBand: { low: 0, mid: 1, high: 0 },
            },
        };
    }

    describe('16th to 8th conversion timestamps', () => {
        it('should recalculate timestamp for position 0 (quarter note)', () => {
            const generator = new DifficultyVariantGenerator();
            // 16th note at beat 0, position 0 should have timestamp 0.0
            const beats = [
                createBeatWithTimestamp(0, 'straight_16th', 0, 0.0, 0.9),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            // After conversion to 8th, position 0 should still have timestamp 0.0
            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            expect(variants.easy.beats[0].timestamp).toBe(0.0);
        });

        it('should recalculate timestamp for position 1 snapped to 0', () => {
            const generator = new DifficultyVariantGenerator();
            // 16th note at beat 0, position 1 has timestamp 0.125
            // After conversion to 8th, it snaps to position 0 with timestamp 0.0
            const beats = [
                createBeatWithTimestamp(0, 'straight_16th', 1, 0.125, 0.9),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            expect(variants.easy.beats[0].timestamp).toBe(0.0);
        });

        it('should recalculate timestamp for position 2 (8th note)', () => {
            const generator = new DifficultyVariantGenerator();
            // 16th note at beat 0, position 2 has timestamp 0.25
            // After conversion to 8th, it stays at position 2 with timestamp 0.25
            const beats = [
                createBeatWithTimestamp(0, 'straight_16th', 2, 0.25, 0.9),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
            expect(variants.easy.beats[0].gridPosition).toBe(2);
            expect(variants.easy.beats[0].timestamp).toBe(0.25);
        });

        it('should recalculate timestamp for position 3 snapped to 2', () => {
            const generator = new DifficultyVariantGenerator();
            // 16th note at beat 0, position 3 has timestamp 0.375
            // After conversion to 8th, it snaps to position 2 with timestamp 0.25
            const beats = [
                createBeatWithTimestamp(0, 'straight_16th', 3, 0.375, 0.9),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
            expect(variants.easy.beats[0].gridPosition).toBe(2);
            expect(variants.easy.beats[0].timestamp).toBe(0.25);
        });

        it('should correctly calculate timestamps at beat 1 with different quarterNoteInterval', () => {
            const generator = new DifficultyVariantGenerator();
            // Using quarterNoteInterval = 0.4 (150 BPM)
            // 16th note at beat 1, position 1
            // Original timestamp = 1 * 0.4 + 1 * 0.1 = 0.5
            // After conversion: timestamp = 1 * 0.4 = 0.4
            const beats = [
                createBeatWithTimestamp(1, 'straight_16th', 1, 0.5, 0.9),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.4);
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats[0].gridType).toBe('straight_8th');
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            expect(variants.easy.beats[0].timestamp).toBe(0.4);
        });

        it('should handle multiple beats with deduplication and correct timestamps', () => {
            const generator = new DifficultyVariantGenerator();
            // Two 16th notes that both snap to position 0
            // Beat 0, position 0 (intensity 0.9) -> stays at 0
            // Beat 0, position 1 (intensity 0.5) -> snaps to 0, gets deduplicated
            const beats = [
                createBeatWithTimestamp(0, 'straight_16th', 0, 0.0, 0.9),
                createBeatWithTimestamp(0, 'straight_16th', 1, 0.125, 0.5),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            // Only one beat should remain (higher intensity wins)
            expect(variants.easy.beats.length).toBe(1);
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            expect(variants.easy.beats[0].timestamp).toBe(0.0);
            expect(variants.easy.beats[0].intensity).toBe(0.9);
        });
    });

    describe('8th triplet to quarter triplet conversion timestamps', () => {
        it('should recalculate timestamp for all triplet positions to beat start', () => {
            const generator = new DifficultyVariantGenerator();
            // Triplet positions 0, 1, 2 should all snap to position 0
            const beats = [
                createBeatWithTimestamp(0, 'triplet_8th', 0, 0.0, 0.9),
                createBeatWithTimestamp(0, 'triplet_8th', 1, 0.167, 0.5),
                createBeatWithTimestamp(0, 'triplet_8th', 2, 0.333, 0.6),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            // All should be quarter triplets at position 0
            // But they get deduplicated to just one beat
            expect(variants.easy.beats.length).toBe(1);
            expect(variants.easy.beats[0].gridType).toBe('quarter_triplet');
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            expect(variants.easy.beats[0].timestamp).toBe(0.0);
        });

        it('should correctly recalculate triplet timestamp at beat 2', () => {
            const generator = new DifficultyVariantGenerator();
            // Triplet at beat 2, position 1
            // Original timestamp would be 2 * 0.5 + 1 * (0.5/3) = 1.167
            // After conversion: timestamp = 2 * 0.5 = 1.0
            const beats = [
                createBeatWithTimestamp(2, 'triplet_8th', 1, 1.167, 0.9),
            ];
            const composite = createCompositeStreamWithInterval(beats, 'hard', 0.5);
            const variants = generator.generate(composite, createMockBeatMap());

            expect(variants.easy.beats[0].gridType).toBe('quarter_triplet');
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            // Use toBeCloseTo for floating point comparison due to precision in test setup
            expect(variants.easy.beats[0].timestamp).toBeCloseTo(1.0, 3);
        });
    });
});

// ============================================================================
// Probabilistic Density Scaling Tests
// ============================================================================

describe('Probabilistic density scaling', () => {
    /**
     * Helper: count total beats across all variants from generate.
     * Tests the probabilistic density through the public API (enhanceBeats is private).
     */
    function countBeatsInVariant(
        generator: DifficultyVariantGenerator,
        stream: CompositeStream,
        difficulty: DifficultyLevel
    ): number {
        const variants = generator.generate(stream, createMockBeatMap());
        return (variants as Record<string, { beats: VariantBeat[] }>)[difficulty].beats.length;
    }

    /**
     * Helper: create a simple stream with 1 beat per beat index across many indices.
     * This makes density changes easy to observe since every index has the same base count.
     */
    function createUniformStream(
        beatCount: number,
        naturalDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
    ): CompositeStream {
        const beats: CompositeBeat[] = [];
        for (let i = 0; i < beatCount; i++) {
            beats.push(createMockCompositeBeat(i, 'straight_16th', 0, 0.7));
        }
        return createMockCompositeStream(beats, naturalDifficulty);
    }

    it('should produce deterministic results with the same seed', () => {
        const config = { seed: 'test-seed-determinism', enhancementDensityMultiplier: 1.5 };
        const stream = createUniformStream(20, 'easy');

        const gen1 = new DifficultyVariantGenerator(config);
        const gen2 = new DifficultyVariantGenerator(config);

        const result1 = gen1.generate(stream, createMockBeatMap());
        const result2 = gen2.generate(stream, createMockBeatMap());

        expect(result1.medium.beats.length).toBe(result2.medium.beats.length);
        expect(result1.hard.beats.length).toBe(result2.hard.beats.length);
    });

    it('should produce different results with different seeds', () => {
        const stream = createUniformStream(50, 'easy');

        const gen1 = new DifficultyVariantGenerator({ seed: 'seed-A', enhancementDensityMultiplier: 1.5 });
        const gen2 = new DifficultyVariantGenerator({ seed: 'seed-B', enhancementDensityMultiplier: 1.5 });

        const result1 = gen1.generate(stream, createMockBeatMap());
        const result2 = gen2.generate(stream, createMockBeatMap());

        // With 50 beat indices and 50% probability, the odds of identical results by chance are astronomically low
        expect(result1.medium.beats.length).not.toBe(result2.medium.beats.length);
    });

    it('should increase density gradually with multiplier (no dramatic jumps)', () => {
        const stream = createUniformStream(40, 'easy');

        const counts: number[] = [];
        for (const mult of [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9]) {
            const gen = new DifficultyVariantGenerator({
                seed: 'gradual-test',
                enhancementDensityMultiplier: mult,
            });
            counts.push(countBeatsInVariant(gen, stream, 'medium'));
        }

        // Each step should add a roughly similar number of beats (no huge jumps)
        for (let i = 1; i < counts.length; i++) {
            const diff = counts[i] - counts[i - 1];
            // No single 0.1 multiplier step should add more than 15 beats (out of 40 indices)
            // The old deterministic approach would add ~40 beats at once at a threshold
            expect(diff).toBeLessThan(16);
        }

        // Overall trend: density should increase (total beats should be higher at higher multipliers)
        // Allow for minor statistical noise but the general trend should be upward
        expect(counts[counts.length - 1]).toBeGreaterThan(counts[0]);
    });

    it('should produce natural variation (not all indices get same target)', () => {
        const stream = createUniformStream(40, 'easy');

        const gen = new DifficultyVariantGenerator({
            seed: 'variation-test',
            enhancementDensityMultiplier: 1.5, // 50% probability for each index
        });

        const result = gen.generate(stream, createMockBeatMap());
        const mediumBeats = result.medium.beats;

        // With 40 indices and 50% probability, we should NOT get all 40 extra beats
        // (which deterministic ceil would give us). We should get roughly 20.
        // Allow generous bounds to avoid flaky tests.
        expect(mediumBeats.length).toBeGreaterThan(30); // base 40 + some extras
        expect(mediumBeats.length).toBeLessThan(70); // base 40 + far fewer than 40 extras
    });

    it('should produce no change at multiplier 1.0', () => {
        const stream = createUniformStream(20, 'medium'); // natural = medium, so medium is unedited

        const gen = new DifficultyVariantGenerator({
            seed: 'no-change-test',
            enhancementDensityMultiplier: 1.0,
        });

        const result = gen.generate(stream, createMockBeatMap());
        // Medium should be unedited since it's the natural difficulty
        expect(result.medium.isUnedited).toBe(true);
        expect(result.medium.beats.length).toBe(20);
    });

    it('should respect the cap of 4 beats per index at high multipliers', () => {
        // Create stream with 2 beats per index (grid positions 0 and 2)
        const beats: CompositeBeat[] = [];
        for (let i = 0; i < 20; i++) {
            beats.push(createMockCompositeBeat(i, 'straight_16th', 0, 0.7));
            beats.push(createMockCompositeBeat(i, 'straight_16th', 2, 0.7));
        }
        const stream = createMockCompositeStream(beats, 'easy');

        const gen = new DifficultyVariantGenerator({
            seed: 'cap-test',
            enhancementDensityMultiplier: 3.0, // Very high - would try for 6 beats per index
        });

        const result = gen.generate(stream, createMockBeatMap());

        // Count beats per beat index in the hard variant
        const beatsByIndex = new Map<number, number>();
        for (const beat of result.hard.beats) {
            const count = beatsByIndex.get(beat.beatIndex) ?? 0;
            beatsByIndex.set(beat.beatIndex, count + 1);
        }

        for (const [index, count] of beatsByIndex) {
            expect(count).toBeLessThanOrEqual(4);
        }
    });

    it('should fill empty beat indices gradually, not all at once', () => {
        // Create a sparse stream with beats on every other index.
        // Using odd indices so gaps are at even positions (avoiding beat 0 edge case).
        const beats: CompositeBeat[] = [];
        for (let i = 1; i < 21; i += 2) {
            beats.push(createMockCompositeBeat(i, 'straight_16th', 0, 0.7));
        }
        const stream = createMockCompositeStream(beats, 'medium');

        // Test across multiple seeds to verify probabilistic behavior on average
        let totalNewIndices = 0;
        const seedCount = 10;
        for (let s = 0; s < seedCount; s++) {
            const gen = new DifficultyVariantGenerator({
                seed: `sparse-fill-${s}`,
                enhancementDensityMultiplier: 1.5,
            });

            const result = gen.generate(stream, createMockBeatMap());
            const hardBeats = result.hard.beats;

            const filledIndices = new Set(hardBeats.map(b => b.beatIndex));
            const originalIndices = new Set(beats.map(b => b.beatIndex));
            const newIndices = [...filledIndices].filter(i => !originalIndices.has(i));
            totalNewIndices += newIndices.length;
        }

        const avgNewIndices = totalNewIndices / seedCount;

        // With 10 empty slots and ~5% probability per slot, average should be around 0.5.
        // The old deterministic approach would fill all 10 or none.
        // Average should be well under 10 — this proves gradual filling.
        expect(avgNewIndices).toBeLessThan(8);
    });
});

// ============================================================================
// lockGridPerBeatIndex Tests
// ============================================================================

describe('lockGridPerBeatIndex', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should resolve mixed grids and return correct map', () => {
        // Create beats with mixed grids at the same beat index
        const beats: CompositeBeat[] = [
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            createMockCompositeBeat(0, 'straight_16th', 1, 0.7),
            createMockCompositeBeat(0, 'triplet_8th', 0, 0.5), // Lower intensity triplet
            createMockCompositeBeat(1, 'triplet_8th', 1, 0.8),
            createMockCompositeBeat(2, 'straight_16th', 2, 0.6),
        ];

        const result = generator.lockGridPerBeatIndex(beats);

        // Should have cleaned beats with single grid per index
        expect(result.beats.length).toBeLessThan(beats.length);

        // Should have grid lock map
        expect(result.gridLock).toBeInstanceOf(Map);
        expect(result.gridLock.size).toBeGreaterThan(0);

        // Beat index 0 should be locked to straight_16th (higher intensity)
        expect(result.gridLock.get(0)).toBe('straight_16th');

        // Beat index 1 should be locked to triplet_8th
        expect(result.gridLock.get(1)).toBe('triplet_8th');

        // Beat index 2 should be locked to straight_16th
        expect(result.gridLock.get(2)).toBe('straight_16th');
    });

    it('should use gridDecisions for empty beat indices', () => {
        const beats: CompositeBeat[] = [
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            // Beat index 1 is empty
            createMockCompositeBeat(2, 'straight_16th', 0, 0.7),
        ];

        const gridDecisions = new Map<number, GridDecision>();
        gridDecisions.set(1, {
            beatIndex: 1,
            selectedGrid: 'triplet_8th',
            transientCount: 2,
            confidence: 0.8,
        });

        const result = generator.lockGridPerBeatIndex(beats, gridDecisions, 'medium', 120);

        // Beat index 1 should get grid from gridDecisions
        expect(result.gridLock.get(1)).toBe('triplet_8th');
    });

    it('should use nearest-neighbor fallback when no gridDecisions for empty index', () => {
        const beats: CompositeBeat[] = [
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            // Beat index 1 is empty
            createMockCompositeBeat(2, 'triplet_8th', 0, 0.7),
            // Beat index 3 is empty
            createMockCompositeBeat(4, 'straight_16th', 0, 0.8),
        ];

        const result = generator.lockGridPerBeatIndex(beats, undefined, 'medium', 120);

        // Beat index 1 should get grid from nearest neighbor (offset 1 = beat 2)
        expect(result.gridLock.get(1)).toBe('triplet_8th');

        // Beat index 3 should get grid from nearest neighbor (offset -1 = beat 2 or +1 = beat 4)
        expect(result.gridLock.has(3)).toBe(true);
    });

    it('should default to allowed grid type when no neighbors available', () => {
        const beats: CompositeBeat[] = [
            createMockCompositeBeat(5, 'straight_16th', 0, 0.9),
        ];

        // With no neighbors for beat index 0-4, they should get allowed grid type
        const result = generator.lockGridPerBeatIndex(beats, undefined, 'medium', 120);

        // All indices 0-5 should have a grid lock
        for (let i = 0; i <= 5; i++) {
            expect(result.gridLock.has(i)).toBe(true);
            // For medium at 120 BPM, only 8th notes and quarter triple are allowed
            const grid = result.gridLock.get(i);
            expect(['straight_8th', 'quarter_triplet']).toContain(grid!);
        }
    });

    it('should respect maxBeatIndex for grid lock range', () => {
        const beats: CompositeBeat[] = [
            createMockCompositeBeat(0, 'straight_16th', 0, 0.9),
            createMockCompositeBeat(5, 'straight_16th', 0, 0.8),
        ];

        const result = generator.lockGridPerBeatIndex(beats, undefined, 'medium', 120, 5);

        // Grid lock should cover indices 0-5
        expect(result.gridLock.has(0)).toBe(true);
        expect(result.gridLock.has(5)).toBe(true);
        // Should not have index 6
        expect(result.gridLock.has(6)).toBe(false);
    });

    it('should handle empty input beats', () => {
        const result = generator.lockGridPerBeatIndex([], undefined, 'medium', 120);

        expect(result.beats).toEqual([]);
        expect(result.gridLock.size).toBe(0);
    });
});
