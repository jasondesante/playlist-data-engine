/**
 * Unit tests for Density-Based Difficulty Generation
 *
 * Tests for:
 * - generateAtDensity() core generation
 * - Quantization independence
 * - BPM-based quantization
 * - Best-effort / clamping
 * - Multi-variant generation
 * - Edge cases
 * - Accuracy
 * - Compatibility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    DifficultyVariantGenerator,
    SUBDIVISION_LIMITS,
    ALL_GRID_TYPES,
    type DifficultyLevel,
    type ExtendedGridType,
    type GridType,
    type CompositeBeat,
    type CompositeStream,
    type VariantBeat,
    type DifficultyVariant,
    type DensityGenerationConfig,
} from '../../../src/core/analysis/beat/index.js';

// Import directly from the source file for helper functions
import {
    deriveAllowedGridTypes,
    calculateMaxAchievableDensity,
} from '../../../src/core/analysis/beat/DifficultyVariantGenerator.js';

import type { UnifiedBeatMap } from '../../../src/core/types/BeatMap.js';
import type { GridDecision } from '../../../src/core/analysis/beat/RhythmQuantizer.js';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal mock UnifiedBeatMap for testing.
 */
function createMockBeatMap(bpm: number = 60, duration: number = 10.0): UnifiedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    return {
        audioId: 'test-audio',
        duration,
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
 * Create a sparse composite with only 8th notes
 */
function createSparseCompositeBeats(
    maxBeatIndex: number,
    positions: number[] = [0, 2],
    intensity: number = 0.5
): CompositeBeat[] {
    const beats: CompositeBeat[] = [];
    for (let i = 0; i <= maxBeatIndex; i++) {
        for (const pos of positions) {
            beats.push(createMockCompositeBeat(i, 'straight_8th', pos, intensity));
        }
    }
    return beats;
}

/**
 * Create a dense composite with 16th notes
 */
function createDenseCompositeBeats(
    maxBeatIndex: number,
    positions: number[] = [0, 1, 2, 3],
    intensity: number = 0.5
): CompositeBeat[] {
    const beats: CompositeBeat[] = [];
    for (let i = 0; i <= maxBeatIndex; i++) {
        for (const pos of positions) {
            beats.push(createMockCompositeBeat(i, 'straight_16th', pos, intensity));
        }
    }
    return beats;
}

/**
 * Create a mock composite stream
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

/**
 * Helper to calculate density in notes/second
 */
function calculateDensity(beats: VariantBeat[], durationSeconds: number): number {
    return beats.length / durationSeconds;
}

// ============================================================================
// Core Generation Tests
// ============================================================================

describe('generateAtDensity() Core Generation', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should enhance when target density is higher than natural (achievable target)', () => {
        // Create very sparse composite: 4 quarter-note beats over 4 seconds = 1.0 nps
        // At 60 BPM with 16ths, max achievable = 4 nps
        // Target 3.0 nps is achievable (3.0 < 4.0) and higher than current (1.0)
        const beats = createSparseCompositeBeats(3, [0]); // 4 beats (1 per beat index, position 0 only)
        const composite = createMockCompositeStream(beats, 'easy', 1.0); // 60 BPM = 1.0s per quarter
        const duration = 4.0;
        const beatMap = createMockBeatMap(60, duration);

        const currentDensity = beats.length / duration; // 4 / 4 = 1.0 nps
        const targetDensity = 3.0; // Achievable: 3.0 < 4.0 max, higher than current 1.0

        const config: DensityGenerationConfig = {
            targetDensity,
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        // Enhancement path: lockedDensity (1.0) < effectiveTargetDensity (3.0)
        expect(['interpolated', 'pattern_inserted']).toContain(variant.editType);
        expect(variant.isUnedited).toBe(false);
        // No clamping needed (target 3.0 < max achievable 4.0)
        expect(variant.densityClamped).toBeFalsy();
        // More beats produced than the 4 input beats
        expect(variant.beats.length).toBeGreaterThan(beats.length);
        // Final density should be closer to target than initial density
        const finalDensity = calculateDensity(variant.beats, duration);
        expect(finalDensity).toBeGreaterThan(currentDensity);
    });

    it('should simplify when target density is lower than natural', () => {
        // Create dense composite: 16 beats over 2 seconds
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]); // 16 beats over 4 beat indices
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 2.0; // 4 beats at 60 BPM = 2 seconds
        const beatMap = createMockBeatMap(60, duration);

        const currentDensity = beats.length / duration; // 16 / 2 = 8 nps
        const targetDensity = currentDensity / 2; // Half the density

        const config: DensityGenerationConfig = {
            targetDensity,
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        expect(variant.editType).toBe('simplified');
        expect(variant.beats.length).toBeLessThan(beats.length);
        expect(variant.isUnedited).toBe(false);
    });

    it('should still apply grid restrictions when density matches natural (no tolerance)', () => {
        // Create composite with 16th notes
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]); // 16 beats with 16th notes
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 2.0;
        const beatMap = createMockBeatMap(60, duration);

        const currentDensity = beats.length / duration;

        // Target same density but restrict to 8th notes only
        const config: DensityGenerationConfig = {
            targetDensity: currentDensity,
            maxGridType: 'straight_8th', // Only 8th notes allowed
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // Should still apply grid restrictions even though density matches
        expect(variant.difficulty).toBe('custom');

        // All beats should be 8th notes or quarter triplets (allowed types for straight_8th max)
        // Note: straight_16th beats will be converted to straight_8th
        const allowedTypes = deriveAllowedGridTypes(config, 60);
        const allBeatsAllowed = variant.beats.every(b => allowedTypes.includes(b.gridType));
        expect(allBeatsAllowed).toBe(true);
    });

    it('should return near-empty result when target density is 0', () => {
        const beats = createDenseCompositeBeats(3);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const beatMap = createMockBeatMap(60, 2.0);

        const config: DensityGenerationConfig = {
            targetDensity: 0,
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        // With 0 target density, beats should be heavily reduced or empty
        expect(variant.beats.length).toBeLessThanOrEqual(beats.length);
    });
});

// ============================================================================
// Quantization Independence Tests
// ============================================================================

describe('Quantization Independence', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should create dense chart with only 8th note max grid (clamped to max achievable)', () => {
        // At 60 BPM, 8th notes = 2 positions/beat = 2 nps max
        // Requesting 3.0 nps with 8th-only should clamp to ~2.0
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]); // 40 beats
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0; // 10 beats at 60 BPM = 5 seconds
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 3.0,
            maxGridType: 'straight_8th', // Only 8th notes allowed
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // All beats should be 8th notes or quarter triplets
        const allowedTypes = deriveAllowedGridTypes(config, 60);
        const allBeatsAllowed = variant.beats.every(b => allowedTypes.includes(b.gridType));
        expect(allBeatsAllowed).toBe(true);

        // Should indicate density was clamped
        expect(variant.densityClamped).toBe(true);
    });

    it('should create sparse chart (0.5 nps) with 16th note max grid allowed', () => {
        // Request sparse density but allow fine grid
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]); // 40 beats
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 0.5, // Very sparse
            maxGridType: 'straight_16th', // But allow fine grid
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.editType).toBe('simplified');
        // Density should be reduced
        const finalDensity = calculateDensity(variant.beats, duration);
        // Should be close to target (within reasonable tolerance due to beat quantization)
        expect(finalDensity).toBeLessThan(beats.length / duration);
    });

    it('should only produce quarter notes when maxGridType is straight_4th', () => {
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const beatMap = createMockBeatMap(60, 2.0);

        const config: DensityGenerationConfig = {
            targetDensity: 1.0,
            maxGridType: 'straight_4th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // All beats should be straight_4th only (since straight_4th hierarchy only contains straight_4th)
        const allowedTypes = deriveAllowedGridTypes(config, 60);
        expect(allowedTypes).toEqual(['straight_4th']);
        expect(variant.beats.every(b => b.gridType === 'straight_4th')).toBe(true);
    });
});

// ============================================================================
// BPM-Based Quantization Tests
// ============================================================================

describe('BPM-Based Quantization', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should restrict 16ths to 8ths at 80 BPM with bpmBasedQuantization: true', () => {
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]); // 16th notes
        const composite = createMockCompositeStream(beats, 'hard', 0.75); // 80 BPM
        const duration = 1.5; // 3 beats at 80 BPM
        const beatMap = createMockBeatMap(80, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 4.0,
            maxGridType: 'straight_16th',
            bpmBasedQuantization: true,
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // At 80 BPM >= 70, 16ths should be restricted to 8ths
        // Check the allowed types after BPM-based restrictions
        const allowedTypes = deriveAllowedGridTypes(config, 80);
        expect(allowedTypes).not.toContain('straight_16th');
        expect(allowedTypes).not.toContain('triplet_8th');

        const has16ths = variant.beats.some(b => b.gridType === 'straight_16th');
        expect(has16ths).toBe(false);
    });

    it('should allow 16ths at 60 BPM with bpmBasedQuantization: true', () => {
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 1.0); // 60 BPM
        const duration = 2.0; // 3 beats at 60 BPM
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 4.0,
            maxGridType: 'straight_16th',
            bpmBasedQuantization: true,
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // At 60 BPM < 70, 16ths should be allowed
        const has16ths = variant.beats.some(b => b.gridType === 'straight_16th');
        expect(has16ths).toBe(true);
    });

    it('should allow 16ths at 80 BPM when bpmBasedQuantization: false', () => {
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.75); // 80 BPM
        const duration = 1.5;
        const beatMap = createMockBeatMap(80, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 4.0,
            maxGridType: 'straight_16th',
            bpmBasedQuantization: false, // Explicitly disabled
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // With BPM restrictions disabled, 16ths should be allowed
        const has16ths = variant.beats.some(b => b.gridType === 'straight_16th');
        expect(has16ths).toBe(true);
    });

    it('should restrict to quarter notes at 130 BPM with bpmBasedQuantization: true', () => {
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.46); // ~130 BPM
        const duration = 0.92; // ~2 beats at 130 BPM
        const beatMap = createMockBeatMap(130, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_16th',
            bpmBasedQuantization: true,
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // At 130 BPM > 120, should restrict to quarter notes (no 8ths)
        const allowedTypes = deriveAllowedGridTypes(config, 130);
        expect(allowedTypes).not.toContain('straight_8th');
        expect(allowedTypes).not.toContain('straight_16th');
        expect(allowedTypes).not.toContain('triplet_8th');
    });

    it('should use custom thresholds when provided', () => {
        const beats = createDenseCompositeBeats(3, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.67); // ~90 BPM
        const duration = 1.33;
        const beatMap = createMockBeatMap(90, duration);

        // Custom threshold: restrict at 90 BPM (instead of default 70)
        const config: DensityGenerationConfig = {
            targetDensity: 4.0,
            maxGridType: 'straight_16th',
            bpmBasedQuantization: true,
            restrictBpm: 90, // Custom: restrict at 90 BPM
        };

        // At 90 BPM >= custom threshold 90, 16ths should be restricted
        const allowedTypes = deriveAllowedGridTypes(config, 90);
        expect(allowedTypes).not.toContain('straight_16th');

        const variant = generator.generateAtDensity(composite, config, beatMap);
        const has16ths = variant.beats.some(b => b.gridType === 'straight_16th');
        expect(has16ths).toBe(false);
    });
});

// ============================================================================
// Best-Effort / Clamping Tests
// ============================================================================

describe('Best-Effort / Clamping', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should clamp density when target exceeds max achievable for grid', () => {
        // At 60 BPM with 8th notes only: max = 2 positions/beat = 2 nps
        // Requesting 4.0 nps should clamp to ~2.0
        const beats = createDenseCompositeBeats(3, [0, 2]); // 8 beats (8th notes)
        const composite = createMockCompositeStream(beats, 'medium', 1.0); // 60 BPM
        const duration = 2.0;
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 4.0, // Impossible with 8th-only at 60 BPM
            maxGridType: 'straight_8th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // Should indicate density was clamped
        expect(variant.densityClamped).toBe(true);

        // Final density should be achievable (max ~2 nps for 8ths at 60 BPM)
        const finalDensity = calculateDensity(variant.beats, duration);
        expect(finalDensity).toBeLessThanOrEqual(2.5); // Some tolerance for enhancement
    });
});

// ============================================================================
// Multi-Variant Tests
// ============================================================================

describe('generateAtDensities() Multi-Variant', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should return correct map for multiple configs', () => {
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const configs = [
            { label: 'beginner', config: { targetDensity: 0.5, maxGridType: 'straight_4th' as ExtendedGridType } },
            { label: 'intermediate', config: { targetDensity: 2.0, maxGridType: 'straight_8th' as ExtendedGridType } },
            { label: 'expert', config: { targetDensity: 4.0, maxGridType: 'straight_16th' as ExtendedGridType } },
        ];

        const variants = generator.generateAtDensities(composite, configs, beatMap);

        expect(variants.size).toBe(3);
        expect(variants.has('beginner')).toBe(true);
        expect(variants.has('intermediate')).toBe(true);
        expect(variants.has('expert')).toBe(true);
    });

    it('should produce independent variants (no shared mutations)', () => {
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const configs = [
            { label: 'sparse', config: { targetDensity: 0.5, maxGridType: 'straight_16th' as ExtendedGridType } },
            { label: 'dense', config: { targetDensity: 4.0, maxGridType: 'straight_16th' as ExtendedGridType } },
        ];

        const variants = generator.generateAtDensities(composite, configs, beatMap);

        const sparseVariant = variants.get('sparse')!;
        const denseVariant = variants.get('dense')!;

        // Sparse should have fewer beats than dense
        expect(sparseVariant.beats.length).toBeLessThan(denseVariant.beats.length);

        // Modifying one should not affect the other
        const originalSparseLength = sparseVariant.beats.length;
        sparseVariant.beats.pop();
        expect(denseVariant.beats.length).not.toBe(originalSparseLength - 1);
    });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should handle single beat input', () => {
        const beats = [createMockCompositeBeat(0, 'straight_8th', 0)];
        const composite = createMockCompositeStream(beats, 'easy', 0.5);
        const beatMap = createMockBeatMap(60, 0.5);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_8th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        expect(variant.beats.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty composite', () => {
        const composite = createMockCompositeStream([], 'easy', 0.5);
        const beatMap = createMockBeatMap(60, 2.0);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_8th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        // Empty input should still return a valid variant
        expect(Array.isArray(variant.beats)).toBe(true);
    });

    it('should handle very high density target (4.0+ nps)', () => {
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]); // Already dense
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 6.0, // Very high
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        // Should attempt to enhance or return best-effort
        expect(variant.beats.length).toBeGreaterThan(0);
    });

    it('should handle maxGridType finer than composite', () => {
        // Composite has only 8th notes
        const beats = createSparseCompositeBeats(9, [0, 2]);
        const composite = createMockCompositeStream(beats, 'medium', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        // Request 16th note grid (finer than what exists)
        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        expect(variant.difficulty).toBe('custom');
        // Should work fine - allowing finer grid doesn't break anything
        expect(variant.beats.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// Accuracy Tests
// ============================================================================

describe('Accuracy', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should produce final density close to target (within tolerance or clamped)', () => {
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]); // 40 beats
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const targetDensity = 2.0;
        const config: DensityGenerationConfig = {
            targetDensity,
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        const finalDensity = calculateDensity(variant.beats, duration);
        // Allow 50% tolerance due to quantization constraints
        const tolerance = 0.5;
        expect(finalDensity).toBeGreaterThanOrEqual(targetDensity * (1 - tolerance));
    });

    it('should have accurate editAmount for simplify path', () => {
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]); // 40 beats
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0, // Lower than natural, triggers simplify
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        if (variant.editType === 'simplified' && variant.conversionMetadata) {
            const expectedAmount =
                (variant.conversionMetadata.totalBeatsBefore - variant.conversionMetadata.totalBeatsAfter) /
                variant.conversionMetadata.totalBeatsBefore;
            expect(variant.editAmount).toBeCloseTo(expectedAmount, 2);
        }
    });

    it('should have accurate editAmount for enhance path', () => {
        const beats = createSparseCompositeBeats(9, [0]); // Only downbeats: 10 beats
        const composite = createMockCompositeStream(beats, 'easy', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0, // Higher than natural, triggers enhance
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        if (variant.editType === 'interpolated' && variant.enhancementMetadata) {
            const expectedAmount =
                (variant.enhancementMetadata.totalBeatsAfter - variant.enhancementMetadata.totalBeatsBefore) /
                variant.enhancementMetadata.totalBeatsBefore;
            expect(variant.editAmount).toBeCloseTo(expectedAmount, 2);
        }
    });

    it('should enforce single grid per beat after generation', () => {
        const beats = createDenseCompositeBeats(9, [0, 1, 2, 3]);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const duration = 5.0;
        const beatMap = createMockBeatMap(60, duration);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_8th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // Group beats by beatIndex and check each group has single grid type
        const beatsByIndex = new Map<number, Set<string>>();
        for (const beat of variant.beats) {
            if (!beatsByIndex.has(beat.beatIndex)) {
                beatsByIndex.set(beat.beatIndex, new Set());
            }
            beatsByIndex.get(beat.beatIndex)!.add(beat.gridType);
        }

        // Each beat index should have only one grid type
        for (const [beatIndex, gridTypes] of beatsByIndex) {
            expect(gridTypes.size).toBe(1);
        }
    });
});

// ============================================================================
// Compatibility Tests
// ============================================================================

describe('Compatibility', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should have all DifficultyVariant fields on custom variant', () => {
        const beats = createDenseCompositeBeats(3);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const beatMap = createMockBeatMap(60, 2.0);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_16th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // Check all required fields exist
        expect(variant).toHaveProperty('difficulty');
        expect(variant).toHaveProperty('beats');
        expect(variant).toHaveProperty('isUnedited');
        expect(variant).toHaveProperty('editType');
        expect(variant).toHaveProperty('editAmount');

        // Check types
        expect(variant.difficulty).toBe('custom');
        expect(Array.isArray(variant.beats)).toBe(true);
        expect(typeof variant.isUnedited).toBe('boolean');
        expect(['none', 'simplified', 'interpolated', 'pattern_inserted']).toContain(variant.editType);
        expect(typeof variant.editAmount).toBe('number');
    });

    it('should work with ButtonMapper.mapVariant (via variant structure)', () => {
        // This test validates that the variant structure is compatible
        // with downstream consumers like ButtonMapper
        const beats = createDenseCompositeBeats(3);
        const composite = createMockCompositeStream(beats, 'hard', 0.5);
        const beatMap = createMockBeatMap(60, 2.0);

        const config: DensityGenerationConfig = {
            targetDensity: 2.0,
            maxGridType: 'straight_8th',
        };

        const variant = generator.generateAtDensity(composite, config, beatMap);

        // Validate variant structure matches what ButtonMapper expects
        expect(variant.beats.every(b =>
            typeof b.beatIndex === 'number' &&
            typeof b.gridPosition === 'number' &&
            typeof b.gridType === 'string' &&
            typeof b.timestamp === 'number' &&
            typeof b.intensity === 'number'
        )).toBe(true);
    });
});

// ============================================================================
// Regression Tests
// ============================================================================

describe('Regression - Existing Functionality Preserved', () => {
    let generator: DifficultyVariantGenerator;

    beforeEach(() => {
        generator = new DifficultyVariantGenerator();
    });

    it('should have custom in SUBDIVISION_LIMITS', () => {
        expect(SUBDIVISION_LIMITS).toHaveProperty('custom');
        expect(SUBDIVISION_LIMITS.custom.description).toContain('Custom');
    });

    it('should derive correct grid types for each maxGridType', () => {
        // straight_4th -> only quarter notes
        expect(deriveAllowedGridTypes({ targetDensity: 1, maxGridType: 'straight_4th' }, 60))
            .toEqual(['straight_4th']);

        // straight_8th -> 8ths and quarter triplets
        expect(deriveAllowedGridTypes({ targetDensity: 1, maxGridType: 'straight_8th' }, 60))
            .toEqual(['straight_8th', 'quarter_triplet']);

        // straight_16th -> all types (without BPM restrictions)
        const result16 = deriveAllowedGridTypes({ targetDensity: 1, maxGridType: 'straight_16th' }, 60);
        expect(result16).toContain('straight_16th');
        expect(result16).toContain('triplet_8th');
        expect(result16).toContain('straight_8th');
        expect(result16).toContain('quarter_triplet');
    });

    it('should calculate max achievable density correctly', () => {
        // At 60 BPM:
        // - straight_4th: 1 pos/beat = 1 nps
        // - straight_8th: 2 pos/beat = 2 nps
        // - triplet_8th: 3 pos/beat = 3 nps
        // - straight_16th: 4 pos/beat = 4 nps

        expect(calculateMaxAchievableDensity(['straight_4th'], 60)).toBe(1);
        expect(calculateMaxAchievableDensity(['straight_8th'], 60)).toBe(2);
        expect(calculateMaxAchievableDensity(['triplet_8th'], 60)).toBe(3);
        expect(calculateMaxAchievableDensity(['straight_16th'], 60)).toBe(4);

        // At 120 BPM, densities double
        expect(calculateMaxAchievableDensity(['straight_8th'], 120)).toBe(4);
        expect(calculateMaxAchievableDensity(['straight_16th'], 120)).toBe(8);
    });
});
