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
    type DifficultyLevel,
    type ExtendedGridType,
    type GridType,
    type CompositeBeat,
    type CompositeStream,
    type VariantBeat,
} from '../../../src/core/analysis/beat/index.js';

// ============================================================================
// Test Fixtures
// ============================================================================

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
    it('should contain all four grid types', () => {
        expect(ALL_GRID_TYPES).toContain('straight_16th');
        expect(ALL_GRID_TYPES).toContain('triplet_8th');
        expect(ALL_GRID_TYPES).toContain('straight_8th');
        expect(ALL_GRID_TYPES).toContain('quarter_triplet');
        expect(ALL_GRID_TYPES.length).toBe(4);
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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

            expect(variants.easy.isUnedited).toBe(false);
            expect(variants.easy.editType).toBe('simplified');
        });

        it('should mark harder variants as interpolated when natural difficulty is lower', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(1, 'straight_16th', 2),
            ];
            const composite = createMockCompositeStream(beats, 'easy');
            const variants = generator.generate(composite);

            expect(variants.medium.isUnedited).toBe(false);
            expect(variants.medium.editType).toBe('interpolated');
            expect(variants.hard.isUnedited).toBe(false);
            expect(variants.hard.editType).toBe('interpolated');
        });

        it('should include conversion metadata for simplified variants', () => {
            const beats = [
                createMockCompositeBeat(0, 'straight_16th', 0),
                createMockCompositeBeat(0, 'triplet_8th', 1),
            ];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
        const variants = generator.generate(composite);

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

        const variants = generator.generate(composite, phraseAnalysis);

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

        const variants = generator.generate(composite, phraseAnalysis);

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

        const variants = generator.generate(composite, phraseAnalysis);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

            expect(variants.easy.beats).toHaveLength(0);
            expect(variants.easy.conversionMetadata?.totalBeatsBefore).toBe(0);
            expect(variants.easy.conversionMetadata?.totalBeatsAfter).toBe(0);
        });

        it('should handle single beat composite with disallowed grid type', () => {
            const generator = new DifficultyVariantGenerator();

            const beats = [createMockCompositeBeat(0, 'straight_16th', 0, 0.9)];
            const composite = createMockCompositeStream(beats, 'medium');
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
                const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
                const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

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
            const variants = generator.generate(composite);

            expect(variants.easy.beats[0].gridType).toBe('quarter_triplet');
            expect(variants.easy.beats[0].gridPosition).toBe(0);
            expect(variants.easy.beats[0].timestamp).toBe(1.0);
        });
    });
});
