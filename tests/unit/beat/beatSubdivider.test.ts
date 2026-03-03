/**
 * Tests for Beat Subdivision Algorithms
 *
 * Tests the subdivision system that transforms quarter-note beat grids
 * into various rhythmic subdivisions (half, eighth, sixteenth, triplets, dotted).
 */

import { describe, it, expect } from 'vitest';
import { BeatSubdivider } from '../../../src/core/analysis/beat/BeatSubdivider.js';
import type {
    Beat,
    UnifiedBeatMap,
    SubdividedBeatMap,
    SubdividedBeat,
    SubdivisionConfig,
    SubdivisionType,
    BeatMapMetadata,
    DownbeatConfig,
    TempoSection,
} from '../../../src/core/types/BeatMap.js';
import {
    DEFAULT_DOWNBEAT_CONFIG,
    DEFAULT_SUBDIVISION_CONFIG,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
    validateSubdivisionConfig,
    validateSubdivisionConfigAgainstBeats,
    validateSubdivisionDensity,
    MAX_SUBDIVISION_DENSITY,
    getSubdivisionDensity,
} from '../../../src/core/types/BeatMap.js';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a beat with default values
 */
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

/**
 * Helper to create a unified beat map from beats
 */
function createUnifiedBeatMap(
    beats: Beat[],
    options: {
        duration?: number;
        bpm?: number;
        detectedBeatIndices?: number[];
        downbeatConfig?: DownbeatConfig;
    } = {}
): UnifiedBeatMap {
    const bpm = options.bpm ?? 120;
    const quarterNoteInterval = 60 / bpm;

    return {
        audioId: 'test-audio-id',
        duration: options.duration ?? (beats.length > 0 ? beats[beats.length - 1].timestamp + quarterNoteInterval : 0),
        beats,
        detectedBeatIndices: options.detectedBeatIndices ?? beats.map((_, i) => i), // All detected by default
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: options.downbeatConfig ?? DEFAULT_DOWNBEAT_CONFIG,
        originalMetadata: createDefaultMetadata(),
    };
}

/**
 * Helper to create default beat map metadata
 */
function createDefaultMetadata(): BeatMapMetadata {
    return {
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
}

/**
 * Helper to create beats at regular quarter note intervals
 */
function createRegularQuarterNotes(
    bpm: number,
    count: number,
    startOffset: number = 0
): Beat[] {
    const beats: Beat[] = [];
    const interval = 60 / bpm;

    for (let i = 0; i < count; i++) {
        const timestamp = startOffset + i * interval;
        beats.push(createBeat(timestamp, {
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
        }));
    }

    return beats;
}

// ============================================================================
// Quarter Notes (No-op) Tests
// ============================================================================

describe('BeatSubdivider - Quarter Notes (no-op)', () => {
    it('should pass through beats unchanged with default config', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 8 beats at 120 BPM
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.beats).toHaveLength(8);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(8);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBe(1);
    });

    it('should preserve beat properties when subdividing as quarter notes', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert - each beat should have identical properties to the original
        for (let i = 0; i < beats.length; i++) {
            const original = beats[i];
            const subdivided = result.beats[i];

            expect(subdivided.timestamp).toBe(original.timestamp);
            expect(subdivided.beatInMeasure).toBe(original.beatInMeasure);
            expect(subdivided.isDownbeat).toBe(original.isDownbeat);
            expect(subdivided.measureNumber).toBe(original.measureNumber);
            expect(subdivided.intensity).toBe(original.intensity);
            expect(subdivided.confidence).toBe(original.confidence);
        }
    });

    it('should set subdivisionType to "quarter" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('quarter');
        }
    });

    it('should set isDetected flag correctly based on detectedBeatIndices', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        // Only beats at indices 0, 4 are detected (downbeats)
        const detectedIndices = [0, 4];
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        for (let i = 0; i < result.beats.length; i++) {
            expect(result.beats[i].isDetected).toBe(detectedIndices.includes(i));
        }
    });

    it('should set originalBeatIndex for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        for (let i = 0; i < result.beats.length; i++) {
            expect(result.beats[i].originalBeatIndex).toBe(i);
        }
    });

    it('should preserve detectedBeatIndices in result', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const detectedIndices = [0, 2, 4, 6];
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.detectedBeatIndices).toEqual(detectedIndices);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 3 }, // 3/4 time
            }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should use quarter subdivision when explicitly specified in config', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(4);
        expect(result.subdivisionConfig).toEqual(config);
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(0);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(0);
    });

    it('should handle single beat', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 0 })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('quarter');
        expect(result.beats[0].isDetected).toBe(true);
    });

    it('should include "quarter" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('quarter');
    });

    it('should set maxDensity to 1 in metadata (quarter = 1x density)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.subdivisionMetadata.maxDensity).toBe(1);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 10 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.audioId).toBe(unifiedMap.audioId);
        expect(result.duration).toBe(unifiedMap.duration);
    });

    it('should handle very short track with only 2 beats', () => {
        // Arrange - very short track with only 2 beats
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

        // Act
        const result = subdivider.subdivide(unifiedMap);

        // Assert
        expect(result.beats).toHaveLength(2);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(2);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(2);
        expect(result.beats[0].isDetected).toBe(true);
        expect(result.beats[1].isDetected).toBe(true);
    });

    it('should handle very short track with eighth note subdivision', () => {
        // Arrange - 2 beats, subdivide to eighth notes
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 2 beats → 3 beats (original + 1 interpolated between them)
        expect(result.beats).toHaveLength(3);
        expect(result.beats[0].isDetected).toBe(true);  // original
        expect(result.beats[1].isDetected).toBe(false); // interpolated
        expect(result.beats[2].isDetected).toBe(true);  // original
    });
});

// ============================================================================
// Half Notes Tests
// ============================================================================

describe('BeatSubdivider - Half Notes', () => {
    it('should halve the beat density (8 beats → 4 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 8 beats (2 measures)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(4);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(4);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBe(0.5);
    });

    it('should keep beats at positions 0 and 2 (downbeats and beat 3s)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 8 beats (2 measures)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - should have beats from positions 0 and 2 of each measure
        // Original positions: 0, 1, 2, 3, 0, 1, 2, 3
        // Kept positions:     ✓        ✓        ✓        ✓
        expect(result.beats).toHaveLength(4);

        // First measure: kept beats 0 and 2
        expect(result.beats[0].beatInMeasure).toBe(0);
        expect(result.beats[1].beatInMeasure).toBe(2);

        // Second measure: kept beats 0 and 2
        expect(result.beats[2].beatInMeasure).toBe(0);
        expect(result.beats[3].beatInMeasure).toBe(2);
    });

    it('should preserve measure numbers from original grid', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 16); // 16 beats (4 measures)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - measure numbers should be preserved from original
        // Original: measure 0 (beats 0-3), measure 1 (beats 4-7), etc.
        // After half subdivision:
        // - beats 0, 2 from measure 0
        // - beats 4, 6 from measure 1 (originally beats 0, 2 of measure 1)
        // - etc.
        expect(result.beats[0].measureNumber).toBe(0); // original beat 0
        expect(result.beats[1].measureNumber).toBe(0); // original beat 2
        expect(result.beats[2].measureNumber).toBe(1); // original beat 4
        expect(result.beats[3].measureNumber).toBe(1); // original beat 6
        expect(result.beats[4].measureNumber).toBe(2); // original beat 8
        expect(result.beats[5].measureNumber).toBe(2); // original beat 10
        expect(result.beats[6].measureNumber).toBe(3); // original beat 12
        expect(result.beats[7].measureNumber).toBe(3); // original beat 14
    });

    it('should preserve isDownbeat flag for downbeats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 8 beats (2 measures)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - downbeats (position 0) should still be marked as downbeats
        expect(result.beats[0].isDownbeat).toBe(true);  // measure 0, position 0
        expect(result.beats[1].isDownbeat).toBe(false); // measure 0, position 2
        expect(result.beats[2].isDownbeat).toBe(true);  // measure 1, position 0
        expect(result.beats[3].isDownbeat).toBe(false); // measure 1, position 2
    });

    it('should set subdivisionType to "half" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('half');
        }
    });

    it('should set isDetected flag correctly based on original indices', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        // Only beats at indices 0, 2, 4, 6 are detected (the ones we keep)
        const detectedIndices = [0, 2, 4, 6];
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - all kept beats should be detected
        expect(result.beats).toHaveLength(4);
        for (const beat of result.beats) {
            expect(beat.isDetected).toBe(true);
        }
    });

    it('should update detectedBeatIndices correctly when some detected beats are removed', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        // Beats at positions 1 and 3 (indices 1, 3, 5, 7) are detected, but they get removed
        const detectedIndices = [1, 3, 5, 7];
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - no beats should be detected since all detected beats were removed
        expect(result.beats).toHaveLength(4);
        expect(result.detectedBeatIndices).toHaveLength(0);
        for (const beat of result.beats) {
            expect(beat.isDetected).toBe(false);
        }
    });

    it('should set originalBeatIndex correctly for kept beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - originalBeatIndex should reference the original beat positions
        // We keep beats at indices 0, 2, 4, 6
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBe(2);
        expect(result.beats[2].originalBeatIndex).toBe(4);
        expect(result.beats[3].originalBeatIndex).toBe(6);
    });

    it('should handle single beat (keep it)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 0 })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat at position 0 should be kept
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].beatInMeasure).toBe(0);
        expect(result.beats[0].subdivisionType).toBe('half');
    });

    it('should handle single beat at position 1 (remove it)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0.5, { beatInMeasure: 1, isDownbeat: false, measureNumber: 0 })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat at position 1 should be removed
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(0);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(0);
    });

    it('should include "half" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('half');
    });

    it('should keep maxDensity at 1 in metadata (0.5 < 1, so max stays at baseline)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - maxDensity tracks the MAXIMUM density encountered
        // Since 0.5 < 1 (baseline), maxDensity stays at 1
        expect(result.subdivisionMetadata.maxDensity).toBe(1);
    });

    it('should preserve timestamp integrity of kept beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - timestamps should match original beats at indices 0, 2, 4, 6
        expect(result.beats[0].timestamp).toBe(0 * interval);        // beat 0
        expect(result.beats[1].timestamp).toBe(2 * interval);        // beat 2
        expect(result.beats[2].timestamp).toBe(4 * interval);        // beat 4
        expect(result.beats[3].timestamp).toBe(6 * interval);        // beat 6
    });

    it('should preserve intensity and confidence of kept beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        // Set specific intensity/confidence for beats we'll keep
        beats[0].intensity = 0.9;
        beats[0].confidence = 0.95;
        beats[2].intensity = 0.7;
        beats[2].confidence = 0.85;

        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats[0].intensity).toBe(0.9);
        expect(result.beats[0].confidence).toBe(0.95);
        expect(result.beats[1].intensity).toBe(0.7);
        expect(result.beats[1].confidence).toBe(0.85);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 3 }, // 3/4 time
            }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 10 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe(unifiedMap.audioId);
        expect(result.duration).toBe(unifiedMap.duration);
    });

    it('should handle odd number of beats correctly', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 7); // 7 beats (not a full measure)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - beats at positions 0, 2, 4, 6 should be kept (4 beats)
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].beatInMeasure).toBe(0);
        expect(result.beats[1].beatInMeasure).toBe(2);
        expect(result.beats[2].beatInMeasure).toBe(0);
        expect(result.beats[3].beatInMeasure).toBe(2);
    });

    it('should work with different time signatures (3/4 time)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm;
        const beats: Beat[] = [];

        // Create 6 beats in 3/4 time (2 measures)
        for (let i = 0; i < 6; i++) {
            beats.push(createBeat(i * interval, {
                beatInMeasure: i % 3, // 0, 1, 2, 0, 1, 2
                isDownbeat: i % 3 === 0,
                measureNumber: Math.floor(i / 3),
            }));
        }

        const customDownbeatConfig: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 3 },
            }],
        };

        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - should keep beats at positions 0 and 2 (since 0 % 2 === 0 and 2 % 2 === 0)
        // Position 1 is removed (1 % 2 === 1)
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].beatInMeasure).toBe(0); // kept (0 % 2 === 0)
        expect(result.beats[1].beatInMeasure).toBe(2); // kept (2 % 2 === 0)
        expect(result.beats[2].beatInMeasure).toBe(0); // kept (0 % 2 === 0)
        expect(result.beats[3].beatInMeasure).toBe(2); // kept (2 % 2 === 0)
    });
});

// ============================================================================
// Eighth Notes Tests
// ============================================================================

describe('BeatSubdivider - Eighth Notes', () => {
    it('should double the beat density (4 beats → 7 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4); // 4 beats (1 measure)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 original beats + 3 interpolated = 7 beats
        // (no interpolation after the last beat)
        expect(result.beats).toHaveLength(7);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(4);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(7);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(1.75, 2);
    });

    it('should double the beat density (8 beats → 15 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 8 beats (2 measures)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 original beats + 7 interpolated = 15 beats
        expect(result.beats).toHaveLength(15);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(1.875, 3);
    });

    it('should insert beats at correct decimal positions (0, 0.5, 1, 1.5...)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check beatInMeasure values
        expect(result.beats[0].beatInMeasure).toBe(0);    // original
        expect(result.beats[1].beatInMeasure).toBe(0.5);  // interpolated
        expect(result.beats[2].beatInMeasure).toBe(1);    // original
        expect(result.beats[3].beatInMeasure).toBe(1.5);  // interpolated
        expect(result.beats[4].beatInMeasure).toBe(2);    // original
        expect(result.beats[5].beatInMeasure).toBe(2.5);  // interpolated
        expect(result.beats[6].beatInMeasure).toBe(3);    // original
    });

    it('should insert beats at correct timestamps', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check timestamps
        // Original beats at 0, 0.5, 1.0, 1.5 seconds
        // Interpolated beats at 0.25, 0.75, 1.25 seconds
        expect(result.beats[0].timestamp).toBe(0);           // original
        expect(result.beats[1].timestamp).toBe(interval * 0.5);  // interpolated (0.25s)
        expect(result.beats[2].timestamp).toBe(interval);        // original (0.5s)
        expect(result.beats[3].timestamp).toBe(interval * 1.5);  // interpolated (0.75s)
        expect(result.beats[4].timestamp).toBe(interval * 2);    // original (1.0s)
        expect(result.beats[5].timestamp).toBe(interval * 2.5);  // interpolated (1.25s)
        expect(result.beats[6].timestamp).toBe(interval * 3);    // original (1.5s)
    });

    it('should set subdivisionType to "eighth" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('eighth');
        }
    });

    it('should mark original beats as isDetected=true and interpolated as isDetected=false', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const detectedIndices = [0, 1, 2, 3]; // All original beats are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats at even indices (0, 2, 4, 6), interpolated at odd (1, 3, 5)
        expect(result.beats[0].isDetected).toBe(true);  // original beat 0
        expect(result.beats[1].isDetected).toBe(false); // interpolated
        expect(result.beats[2].isDetected).toBe(true);  // original beat 1
        expect(result.beats[3].isDetected).toBe(false); // interpolated
        expect(result.beats[4].isDetected).toBe(true);  // original beat 2
        expect(result.beats[5].isDetected).toBe(false); // interpolated
        expect(result.beats[6].isDetected).toBe(true);  // original beat 3
    });

    it('should set originalBeatIndex for original beats and undefined for interpolated', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats have originalBeatIndex, interpolated do not
        expect(result.beats[0].originalBeatIndex).toBe(0);  // original beat 0
        expect(result.beats[1].originalBeatIndex).toBeUndefined(); // interpolated
        expect(result.beats[2].originalBeatIndex).toBe(1);  // original beat 1
        expect(result.beats[3].originalBeatIndex).toBeUndefined(); // interpolated
        expect(result.beats[4].originalBeatIndex).toBe(2);  // original beat 2
        expect(result.beats[5].originalBeatIndex).toBeUndefined(); // interpolated
        expect(result.beats[6].originalBeatIndex).toBe(3);  // original beat 3
    });

    it('should interpolate intensity as linear average of neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        // Set specific intensities
        beats[0].intensity = 0.6;
        beats[1].intensity = 0.8;
        beats[2].intensity = 1.0;
        beats[3].intensity = 0.4;

        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats have average intensity
        expect(result.beats[0].intensity).toBe(0.6);  // original
        expect(result.beats[1].intensity).toBe((0.6 + 0.8) / 2); // avg of 0,1
        expect(result.beats[2].intensity).toBe(0.8);  // original
        expect(result.beats[3].intensity).toBe((0.8 + 1.0) / 2); // avg of 1,2
        expect(result.beats[4].intensity).toBe(1.0);  // original
        expect(result.beats[5].intensity).toBe((1.0 + 0.4) / 2); // avg of 2,3
        expect(result.beats[6].intensity).toBe(0.4);  // original
    });

    it('should interpolate confidence as linear average of neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        // Set specific confidences
        beats[0].confidence = 0.7;
        beats[1].confidence = 0.9;
        beats[2].confidence = 0.5;
        beats[3].confidence = 0.8;

        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats have average confidence
        expect(result.beats[0].confidence).toBe(0.7);  // original
        expect(result.beats[1].confidence).toBe((0.7 + 0.9) / 2); // avg of 0,1
        expect(result.beats[2].confidence).toBe(0.9);  // original
        expect(result.beats[3].confidence).toBe((0.9 + 0.5) / 2); // avg of 1,2
        expect(result.beats[4].confidence).toBe(0.5);  // original
        expect(result.beats[5].confidence).toBe((0.5 + 0.8) / 2); // avg of 2,3
        expect(result.beats[6].confidence).toBe(0.8);  // original
    });

    it('should preserve isDownbeat flag only for original downbeats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only original downbeats (at beat 0 and beat 4) are marked
        // Result beats: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7
        // Indices:      0,  1,  2,   3,  4,   5,  6,   7,  8,   9, 10,  11, 12,  13, 14
        expect(result.beats[0].isDownbeat).toBe(true);   // original beat 0 (downbeat)
        expect(result.beats[1].isDownbeat).toBe(false);  // interpolated
        expect(result.beats[8].isDownbeat).toBe(true);   // original beat 4 (downbeat)
        expect(result.beats[9].isDownbeat).toBe(false);  // interpolated
    });

    it('should preserve measure number from the original beat', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats inherit measure from preceding original
        // Measure 0: beats 0-3 (indices 0-7 in result)
        // Measure 1: beats 4-7 (indices 8-14 in result)
        expect(result.beats[0].measureNumber).toBe(0);  // original beat 0
        expect(result.beats[1].measureNumber).toBe(0);  // interpolated after beat 0
        expect(result.beats[2].measureNumber).toBe(0);  // original beat 1
        expect(result.beats[3].measureNumber).toBe(0);  // interpolated after beat 1
        expect(result.beats[4].measureNumber).toBe(0);  // original beat 2
        expect(result.beats[5].measureNumber).toBe(0);  // interpolated after beat 2
        expect(result.beats[6].measureNumber).toBe(0);  // original beat 3
        expect(result.beats[7].measureNumber).toBe(0);  // interpolated after beat 3
        expect(result.beats[8].measureNumber).toBe(1);  // original beat 4 (measure 1)
        expect(result.beats[9].measureNumber).toBe(1);  // interpolated after beat 4
    });

    it('should update detectedBeatIndices correctly', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const detectedIndices = [0, 2]; // Only beats 0 and 2 are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detected indices in result should be 0 and 4 (positions of original beats 0 and 2)
        expect(result.detectedBeatIndices).toEqual([0, 4]);
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(0);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(0);
    });

    it('should handle single beat (no interpolation possible)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 0 })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat stays as is (no next beat to interpolate with)
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('eighth');
        expect(result.beats[0].isDetected).toBe(true);
        expect(result.beats[0].beatInMeasure).toBe(0);
    });

    it('should handle two beats (one interpolation)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 2 original + 1 interpolated = 3 beats
        expect(result.beats).toHaveLength(3);
        expect(result.beats[0].beatInMeasure).toBe(0);
        expect(result.beats[1].beatInMeasure).toBe(0.5);
        expect(result.beats[2].beatInMeasure).toBe(1);
    });

    it('should include "eighth" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('eighth');
    });

    it('should set maxDensity to 2 in metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - eighth notes are 2x density
        expect(result.subdivisionMetadata.maxDensity).toBe(2);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 3 }, // 3/4 time
            }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 10 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe(unifiedMap.audioId);
        expect(result.duration).toBe(unifiedMap.duration);
    });

    it('should work with different BPM values', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 90; // Slower tempo
        const interval = 60 / bpm; // ~0.667 seconds per quarter
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check timestamps are correct for this BPM
        expect(result.beats).toHaveLength(7);
        expect(result.beats[0].timestamp).toBe(0);
        expect(result.beats[1].timestamp).toBeCloseTo(interval * 0.5, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(interval, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(interval * 1.5, 3);
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180; // Fast tempo
        const interval = 60 / bpm; // ~0.333 seconds per quarter
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(7);
        expect(result.beats[1].timestamp).toBeCloseTo(interval * 0.5, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(interval * 1.5, 3);
    });
});

// ============================================================================
// Sixteenth Notes Tests
// ============================================================================

describe('BeatSubdivider - Sixteenth Notes', () => {
    it('should quadruple the beat density (4 beats → 13 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4); // 4 beats
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 original + 3 interpolated between each = 4 + (3 * 3) = 13
        expect(result.beats).toHaveLength(13);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(4);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(13);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(3.25, 2);
    });

    it('should place beats at correct decimal positions (0, 0.25, 0.5, 0.75)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2); // 2 beats
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 2 original + 3 interpolated = 5 beats
        expect(result.beats).toHaveLength(5);

        // Check beatInMeasure positions
        expect(result.beats[0].beatInMeasure).toBe(0);     // original
        expect(result.beats[1].beatInMeasure).toBe(0.25);  // interpolated
        expect(result.beats[2].beatInMeasure).toBe(0.5);   // interpolated
        expect(result.beats[3].beatInMeasure).toBe(0.75);  // interpolated
        expect(result.beats[4].beatInMeasure).toBe(1);     // original
    });

    it('should place beats at correct timestamps', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter
        const beats = createRegularQuarterNotes(bpm, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check timestamps
        expect(result.beats[0].timestamp).toBe(0);                        // 0.0
        expect(result.beats[1].timestamp).toBeCloseTo(interval * 0.25, 3); // 0.125
        expect(result.beats[2].timestamp).toBeCloseTo(interval * 0.5, 3);  // 0.25
        expect(result.beats[3].timestamp).toBeCloseTo(interval * 0.75, 3); // 0.375
        expect(result.beats[4].timestamp).toBeCloseTo(interval, 3);        // 0.5
    });

    it('should set subdivisionType to "sixteenth" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('sixteenth');
        }
    });

    it('should set isDetected flag correctly - original beats are detected, interpolated are not', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const detectedIndices = [0, 1, 2, 3]; // All original beats are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - beats at indices 0, 4, 8, 12 are original (detected)
        // beats at indices 1, 2, 3, 5, 6, 7, 9, 10, 11 are interpolated (not detected)
        expect(result.beats[0].isDetected).toBe(true);   // original beat 0
        expect(result.beats[1].isDetected).toBe(false);  // interpolated
        expect(result.beats[2].isDetected).toBe(false);  // interpolated
        expect(result.beats[3].isDetected).toBe(false);  // interpolated
        expect(result.beats[4].isDetected).toBe(true);   // original beat 1
        expect(result.beats[5].isDetected).toBe(false);  // interpolated
        expect(result.beats[6].isDetected).toBe(false);  // interpolated
        expect(result.beats[7].isDetected).toBe(false);  // interpolated
        expect(result.beats[8].isDetected).toBe(true);   // original beat 2
        expect(result.beats[12].isDetected).toBe(true);  // original beat 3
    });

    it('should set originalBeatIndex for original beats only', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats have originalBeatIndex, interpolated beats don't
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        expect(result.beats[4].originalBeatIndex).toBe(1);
        expect(result.beats[8].originalBeatIndex).toBe(2);
        expect(result.beats[12].originalBeatIndex).toBe(3);
    });

    it('should interpolate intensity and confidence from neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [
            createBeat(0, { beatInMeasure: 0, intensity: 0.6, confidence: 0.8 }),
            createBeat(0.5, { beatInMeasure: 1, intensity: 1.0, confidence: 1.0 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats should have averaged values
        const expectedIntensity = (0.6 + 1.0) / 2; // 0.8
        const expectedConfidence = (0.8 + 1.0) / 2; // 0.9

        // Interpolated beats at indices 1, 2, 3
        expect(result.beats[1].intensity).toBeCloseTo(expectedIntensity, 3);
        expect(result.beats[1].confidence).toBeCloseTo(expectedConfidence, 3);
        expect(result.beats[2].intensity).toBeCloseTo(expectedIntensity, 3);
        expect(result.beats[2].confidence).toBeCloseTo(expectedConfidence, 3);
        expect(result.beats[3].intensity).toBeCloseTo(expectedIntensity, 3);
        expect(result.beats[3].confidence).toBeCloseTo(expectedConfidence, 3);
    });

    it('should preserve isDownbeat flag for original downbeats only', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures, 8 beats
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only beats at measure starts (original indices 0, 4) should be downbeats
        // Result indices: 0, 4*4=16 for original beats
        expect(result.beats[0].isDownbeat).toBe(true);   // measure 0 start
        expect(result.beats[1].isDownbeat).toBe(false);  // interpolated
        expect(result.beats[16].isDownbeat).toBe(true);  // measure 1 start (original beat 4)
    });

    it('should preserve measure numbers from original beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats should have same measure as the preceding original beat
        // First 4 original beats are in measure 0, next 4 in measure 1
        // Each original beat produces 4 output beats (1 original + 3 interpolated)
        // Total: 8 original + 7*3 interpolated = 29 beats

        // Beats 0-15 are in measure 0 (original beats 0-3 plus their interpolations)
        // Beats 16-28 are in measure 1 (original beats 4-7 plus interpolations)
        expect(result.beats[0].measureNumber).toBe(0);  // original beat 0
        expect(result.beats[3].measureNumber).toBe(0);  // interpolated after beat 0
        expect(result.beats[4].measureNumber).toBe(0);  // original beat 1
        expect(result.beats[15].measureNumber).toBe(0); // last interpolated after beat 3
        expect(result.beats[16].measureNumber).toBe(1); // original beat 4 (measure 1)
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(0);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(0);
    });

    it('should handle single beat (no interpolation possible)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 0 })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat stays as is (no next beat to interpolate with)
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('sixteenth');
        expect(result.beats[0].isDetected).toBe(true);
        expect(result.beats[0].beatInMeasure).toBe(0);
    });

    it('should handle two beats (3 interpolations between)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 2 original + 3 interpolated = 5 beats
        expect(result.beats).toHaveLength(5);
        expect(result.beats[0].beatInMeasure).toBe(0);
        expect(result.beats[1].beatInMeasure).toBe(0.25);
        expect(result.beats[2].beatInMeasure).toBe(0.5);
        expect(result.beats[3].beatInMeasure).toBe(0.75);
        expect(result.beats[4].beatInMeasure).toBe(1);
    });

    it('should include "sixteenth" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('sixteenth');
    });

    it('should set maxDensity to 4 in metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - sixteenth notes are 4x density (maximum supported)
        expect(result.subdivisionMetadata.maxDensity).toBe(4);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 3 }, // 3/4 time
            }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120, duration: 10 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe(unifiedMap.audioId);
        expect(result.duration).toBe(unifiedMap.duration);
    });

    it('should work with different BPM values', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 90; // Slower tempo
        const interval = 60 / bpm; // ~0.667 seconds per quarter
        const beats = createRegularQuarterNotes(bpm, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check timestamps are correct for this BPM
        expect(result.beats).toHaveLength(5);
        expect(result.beats[0].timestamp).toBe(0);
        expect(result.beats[1].timestamp).toBeCloseTo(interval * 0.25, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(interval * 0.5, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(interval * 0.75, 3);
        expect(result.beats[4].timestamp).toBeCloseTo(interval, 3);
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180; // Fast tempo
        const interval = 60 / bpm; // ~0.333 seconds per quarter
        const beats = createRegularQuarterNotes(bpm, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(5);
        expect(result.beats[1].timestamp).toBeCloseTo(interval * 0.25, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(interval * 0.5, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(interval * 0.75, 3);
    });

    it('should correctly update detectedBeatIndices array', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const detectedIndices = [0, 2]; // Only beats 0 and 2 are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detected indices should now be at positions 0 (beat 0) and 8 (beat 2)
        // 4 beats per original beat, so beat 2 is at index 4*2 = 8
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toContain(8);
        expect(result.detectedBeatIndices).toHaveLength(2);
    });

    it('should produce correct beat count for 8 beats (2 measures)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 original + 7*3 interpolated = 29 beats
        // (7 gaps between 8 beats, each gap gets 3 interpolated beats)
        expect(result.beats).toHaveLength(29);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(29);
    });
});

// ============================================================================
// Triplet8 Subdivision Tests (Eighth Triplets - 3 beats per quarter)
// ============================================================================

describe('BeatSubdivider - Triplet8 Notes', () => {
    it('should triple the beat density (4 beats → 10 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 original + 3*2 interpolated = 10 beats
        // (3 gaps between 4 beats, each gap gets 2 interpolated triplet beats)
        expect(result.beats).toHaveLength(10);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(4);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(10);
    });

    it('should triple the beat density (8 beats → 22 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 original + 7*2 interpolated = 22 beats
        expect(result.beats).toHaveLength(22);
    });

    it('should place beats at correct decimal positions (0, 0.33, 0.66, 1, 1.33...)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check beatInMeasure values
        // Beat 0: position 0
        expect(result.beats[0].beatInMeasure).toBeCloseTo(0, 2);
        // Beat 1: position 0.33 (1/3)
        expect(result.beats[1].beatInMeasure).toBeCloseTo(1/3, 2);
        // Beat 2: position 0.66 (2/3)
        expect(result.beats[2].beatInMeasure).toBeCloseTo(2/3, 2);
        // Beat 3: position 1
        expect(result.beats[3].beatInMeasure).toBeCloseTo(1, 2);
        // Beat 4: position 1.33 (1 + 1/3)
        expect(result.beats[4].beatInMeasure).toBeCloseTo(1 + 1/3, 2);
        // Beat 5: position 1.66 (1 + 2/3)
        expect(result.beats[5].beatInMeasure).toBeCloseTo(1 + 2/3, 2);
        // Beat 6: position 2
        expect(result.beats[6].beatInMeasure).toBeCloseTo(2, 2);
    });

    it('should place beats at correct timestamps', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check timestamps
        // Triplet interval = quarterInterval / 3
        const tripletInterval = interval / 3;

        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(tripletInterval, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(tripletInterval * 2, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(interval, 3);
        expect(result.beats[4].timestamp).toBeCloseTo(interval + tripletInterval, 3);
        expect(result.beats[5].timestamp).toBeCloseTo(interval + tripletInterval * 2, 3);
    });

    it('should set subdivisionType to "triplet8" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('triplet8');
        }
    });

    it('should mark original beats as isDetected=true and interpolated as isDetected=false', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        // All beats are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: [0, 1, 2, 3],
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 10 beats: indices 0, 3, 6, 9 are original
        expect(result.beats[0].isDetected).toBe(true);  // original beat 0
        expect(result.beats[1].isDetected).toBe(false); // interpolated
        expect(result.beats[2].isDetected).toBe(false); // interpolated
        expect(result.beats[3].isDetected).toBe(true);  // original beat 1
        expect(result.beats[4].isDetected).toBe(false); // interpolated
        expect(result.beats[5].isDetected).toBe(false); // interpolated
        expect(result.beats[6].isDetected).toBe(true);  // original beat 2
        expect(result.beats[7].isDetected).toBe(false); // interpolated
        expect(result.beats[8].isDetected).toBe(false); // interpolated
        expect(result.beats[9].isDetected).toBe(true);  // original beat 3
    });

    it('should set originalBeatIndex for original beats and undefined for interpolated', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats have originalBeatIndex, interpolated don't
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        expect(result.beats[2].originalBeatIndex).toBeUndefined();
        expect(result.beats[3].originalBeatIndex).toBe(1);
        expect(result.beats[4].originalBeatIndex).toBeUndefined();
        expect(result.beats[5].originalBeatIndex).toBeUndefined();
        expect(result.beats[6].originalBeatIndex).toBe(2);
        expect(result.beats[7].originalBeatIndex).toBeUndefined();
        expect(result.beats[8].originalBeatIndex).toBeUndefined();
        expect(result.beats[9].originalBeatIndex).toBe(3);
    });

    it('should interpolate intensity as linear average of neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { intensity: 0.6 }),
            createBeat(0.5, { intensity: 0.8 }),
            createBeat(1.0, { intensity: 1.0 }),
            createBeat(1.5, { intensity: 0.4 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated intensity should be average of neighbors
        // Between beat 0 (0.6) and beat 1 (0.8): avg = 0.7
        expect(result.beats[1].intensity).toBeCloseTo(0.7, 2);
        expect(result.beats[2].intensity).toBeCloseTo(0.7, 2);
        // Between beat 1 (0.8) and beat 2 (1.0): avg = 0.9
        expect(result.beats[4].intensity).toBeCloseTo(0.9, 2);
        expect(result.beats[5].intensity).toBeCloseTo(0.9, 2);
    });

    it('should interpolate confidence as linear average of neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { confidence: 0.5 }),
            createBeat(0.5, { confidence: 0.7 }),
            createBeat(1.0, { confidence: 0.9 }),
            createBeat(1.5, { confidence: 0.3 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated confidence should be average of neighbors
        // Between beat 0 (0.5) and beat 1 (0.7): avg = 0.6
        expect(result.beats[1].confidence).toBeCloseTo(0.6, 2);
        expect(result.beats[2].confidence).toBeCloseTo(0.6, 2);
        // Between beat 1 (0.7) and beat 2 (0.9): avg = 0.8
        expect(result.beats[4].confidence).toBeCloseTo(0.8, 2);
        expect(result.beats[5].confidence).toBeCloseTo(0.8, 2);
    });

    it('should preserve isDownbeat flag only for original downbeats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { isDownbeat: true, beatInMeasure: 0 }),
            createBeat(0.5, { isDownbeat: false, beatInMeasure: 1 }),
            createBeat(1.0, { isDownbeat: false, beatInMeasure: 2 }),
            createBeat(1.5, { isDownbeat: false, beatInMeasure: 3 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only original beat 0 is downbeat, interpolated are not
        expect(result.beats[0].isDownbeat).toBe(true);
        expect(result.beats[1].isDownbeat).toBe(false);
        expect(result.beats[2].isDownbeat).toBe(false);
        expect(result.beats[3].isDownbeat).toBe(false);
    });

    it('should preserve measure number from the original beat', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { measureNumber: 0 }),
            createBeat(0.5, { measureNumber: 0 }),
            createBeat(1.0, { measureNumber: 0 }),
            createBeat(1.5, { measureNumber: 0 }),
            createBeat(2.0, { measureNumber: 1 }),
            createBeat(2.5, { measureNumber: 1 }),
            createBeat(3.0, { measureNumber: 1 }),
            createBeat(3.5, { measureNumber: 1 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats have same measure number as starting beat
        // First 6 beats (2 original + 4 interpolated) are in measure 0
        expect(result.beats[0].measureNumber).toBe(0);
        expect(result.beats[1].measureNumber).toBe(0);
        expect(result.beats[2].measureNumber).toBe(0);
        expect(result.beats[3].measureNumber).toBe(0);
        expect(result.beats[4].measureNumber).toBe(0);
        expect(result.beats[5].measureNumber).toBe(0);
    });

    it('should update detectedBeatIndices correctly', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const detectedIndices = [0, 2]; // Only beats 0 and 2 are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detected indices should now be at positions 0 (beat 0) and 6 (beat 2)
        // 3 beats per original beat, so beat 2 is at index 3*2 = 6
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toContain(6);
        expect(result.detectedBeatIndices).toHaveLength(2);
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
    });

    it('should handle single beat (no interpolation possible)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0)];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat, no interpolation possible
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('triplet8');
    });

    it('should handle two beats (2 interpolations between)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 2 original + 2 interpolated = 4 beats
        expect(result.beats).toHaveLength(4);
    });

    it('should include "triplet8" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('triplet8');
    });

    it('should set maxDensity to 2 in metadata (triplet8 has density of 2)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - triplet8 has density of 2 (same as eighth notes)
        expect(result.subdivisionMetadata.maxDensity).toBe(2);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 3, beatUnit: 4 } }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            duration: 30,
        });
        unifiedMap.audioId = 'test-audio-id';
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe('test-audio-id');
        expect(result.duration).toBe(30);
    });

    it('should work with different BPM values', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 90;
        const interval = 60 / bpm; // ~0.667 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        const tripletInterval = interval / 3;
        expect(result.beats).toHaveLength(10);
        expect(result.beats[1].timestamp).toBeCloseTo(tripletInterval, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(tripletInterval * 2, 3);
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180;
        const interval = 60 / bpm; // 0.333 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        const tripletInterval = interval / 3;
        expect(result.beats).toHaveLength(10);
        expect(result.beats[1].timestamp).toBeCloseTo(tripletInterval, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(tripletInterval * 2, 3);
    });

    it('should correctly update detectedBeatIndices array', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const detectedIndices = [0, 3, 7]; // Beats 0, 3, and 7 are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detected indices should now be at positions 0, 9, and 21
        // 3 beats per original beat, so beat 3 is at index 3*3 = 9
        // and beat 7 is at index 7*3 = 21
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toContain(9);
        expect(result.detectedBeatIndices).toContain(21);
        expect(result.detectedBeatIndices).toHaveLength(3);
    });

    it('should produce correct beat count for 8 beats (2 measures)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 original + 7*2 interpolated = 22 beats
        // (7 gaps between 8 beats, each gap gets 2 interpolated triplet beats)
        expect(result.beats).toHaveLength(22);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(22);
    });

    it('should have density multiplier of 3x', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - density multiplier should be close to 2.75 (22/8)
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(22/8, 2);
    });
});

// ============================================================================
// Triplet4 Subdivision Tests (Quarter Triplets - 3 beats per half note)
// ============================================================================

describe('BeatSubdivider - Triplet4 Notes', () => {
    it('should increase beat density by adding 1 interpolated beat between each pair (4 beats → 7 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 original + 3 interpolated = 7 beats
        // (3 gaps between 4 beats, each gap gets 1 interpolated triplet beat)
        expect(result.beats).toHaveLength(7);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(4);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(7);
    });

    it('should increase beat density (8 beats → 15 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 original + 7 interpolated = 15 beats
        expect(result.beats).toHaveLength(15);
    });

    it('should place beats at correct decimal positions (0, 0.66, 1, 1.66, 2...)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check beatInMeasure values
        // Beat 0: position 0
        expect(result.beats[0].beatInMeasure).toBeCloseTo(0, 2);
        // Beat 1: position 0.66 (2/3)
        expect(result.beats[1].beatInMeasure).toBeCloseTo(2/3, 2);
        // Beat 2: position 1
        expect(result.beats[2].beatInMeasure).toBeCloseTo(1, 2);
        // Beat 3: position 1.66 (1 + 2/3)
        expect(result.beats[3].beatInMeasure).toBeCloseTo(1 + 2/3, 2);
        // Beat 4: position 2
        expect(result.beats[4].beatInMeasure).toBeCloseTo(2, 2);
        // Beat 5: position 2.66 (2 + 2/3)
        expect(result.beats[5].beatInMeasure).toBeCloseTo(2 + 2/3, 2);
        // Beat 6: position 3
        expect(result.beats[6].beatInMeasure).toBeCloseTo(3, 2);
    });

    it('should place beats at correct timestamps', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - check timestamps
        // Triplet4 interpolated beat is at 2/3 of the quarter interval
        const triplet4Offset = interval * (2/3);

        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(triplet4Offset, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(interval, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(interval + triplet4Offset, 3);
        expect(result.beats[4].timestamp).toBeCloseTo(interval * 2, 3);
        expect(result.beats[5].timestamp).toBeCloseTo(interval * 2 + triplet4Offset, 3);
        expect(result.beats[6].timestamp).toBeCloseTo(interval * 3, 3);
    });

    it('should set subdivisionType to "triplet4" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('triplet4');
        }
    });

    it('should mark original beats as isDetected=true and interpolated as isDetected=false', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        // All beats are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: [0, 1, 2, 3],
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 7 beats: indices 0, 2, 4, 6 are original
        expect(result.beats[0].isDetected).toBe(true);  // original beat 0
        expect(result.beats[1].isDetected).toBe(false); // interpolated
        expect(result.beats[2].isDetected).toBe(true);  // original beat 1
        expect(result.beats[3].isDetected).toBe(false); // interpolated
        expect(result.beats[4].isDetected).toBe(true);  // original beat 2
        expect(result.beats[5].isDetected).toBe(false); // interpolated
        expect(result.beats[6].isDetected).toBe(true);  // original beat 3
    });

    it('should set originalBeatIndex for original beats and undefined for interpolated', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats have originalBeatIndex, interpolated don't
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        expect(result.beats[2].originalBeatIndex).toBe(1);
        expect(result.beats[3].originalBeatIndex).toBeUndefined();
        expect(result.beats[4].originalBeatIndex).toBe(2);
        expect(result.beats[5].originalBeatIndex).toBeUndefined();
        expect(result.beats[6].originalBeatIndex).toBe(3);
    });

    it('should interpolate intensity as linear average of neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { intensity: 0.6 }),
            createBeat(0.5, { intensity: 0.8 }),
            createBeat(1.0, { intensity: 1.0 }),
            createBeat(1.5, { intensity: 0.4 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated intensity should be average of neighbors
        // Between beat 0 (0.6) and beat 1 (0.8): avg = 0.7
        expect(result.beats[1].intensity).toBeCloseTo(0.7, 2);
        // Between beat 1 (0.8) and beat 2 (1.0): avg = 0.9
        expect(result.beats[3].intensity).toBeCloseTo(0.9, 2);
        // Between beat 2 (1.0) and beat 3 (0.4): avg = 0.7
        expect(result.beats[5].intensity).toBeCloseTo(0.7, 2);
    });

    it('should interpolate confidence as linear average of neighbors', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { confidence: 0.5 }),
            createBeat(0.5, { confidence: 0.7 }),
            createBeat(1.0, { confidence: 0.9 }),
            createBeat(1.5, { confidence: 0.3 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated confidence should be average of neighbors
        // Between beat 0 (0.5) and beat 1 (0.7): avg = 0.6
        expect(result.beats[1].confidence).toBeCloseTo(0.6, 2);
        // Between beat 1 (0.7) and beat 2 (0.9): avg = 0.8
        expect(result.beats[3].confidence).toBeCloseTo(0.8, 2);
        // Between beat 2 (0.9) and beat 3 (0.3): avg = 0.6
        expect(result.beats[5].confidence).toBeCloseTo(0.6, 2);
    });

    it('should preserve isDownbeat flag only for original downbeats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { isDownbeat: true, beatInMeasure: 0 }),
            createBeat(0.5, { isDownbeat: false, beatInMeasure: 1 }),
            createBeat(1.0, { isDownbeat: false, beatInMeasure: 2 }),
            createBeat(1.5, { isDownbeat: false, beatInMeasure: 3 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only original beat 0 is downbeat, interpolated are not
        expect(result.beats[0].isDownbeat).toBe(true);
        expect(result.beats[1].isDownbeat).toBe(false);
        expect(result.beats[2].isDownbeat).toBe(false);
        expect(result.beats[3].isDownbeat).toBe(false);
    });

    it('should preserve measure number from the original beat', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { measureNumber: 0 }),
            createBeat(0.5, { measureNumber: 0 }),
            createBeat(1.0, { measureNumber: 0 }),
            createBeat(1.5, { measureNumber: 0 }),
            createBeat(2.0, { measureNumber: 1 }),
            createBeat(2.5, { measureNumber: 1 }),
            createBeat(3.0, { measureNumber: 1 }),
            createBeat(3.5, { measureNumber: 1 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - interpolated beats have same measure number as starting beat
        // First 3 beats (2 original + 1 interpolated) are in measure 0
        expect(result.beats[0].measureNumber).toBe(0);
        expect(result.beats[1].measureNumber).toBe(0);
        expect(result.beats[2].measureNumber).toBe(0);
        expect(result.beats[3].measureNumber).toBe(0);
    });

    it('should update detectedBeatIndices correctly', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const detectedIndices = [0, 2]; // Only beats 0 and 2 are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detected indices should now be at positions 0 (beat 0) and 4 (beat 2)
        // 2 beats per original beat (original + interpolated), so beat 2 is at index 2*2 = 4
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toContain(4);
        expect(result.detectedBeatIndices).toHaveLength(2);
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
    });

    it('should handle single beat (no interpolation possible)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0)];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat, no interpolation possible
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('triplet4');
    });

    it('should handle two beats (1 interpolation between)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 2);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 2 original + 1 interpolated = 3 beats
        expect(result.beats).toHaveLength(3);
    });

    it('should include "triplet4" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('triplet4');
    });

    it('should set maxDensity to 2 in metadata (triplet4 has density of ~1.75)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - triplet4 has density of 1.75 (7/4)
        expect(result.subdivisionMetadata.maxDensity).toBe(2);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 3, beatUnit: 4 } }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            duration: 10.5,
        });
        unifiedMap.audioId = 'test-audio-123';
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe('test-audio-123');
        expect(result.duration).toBe(10.5);
    });

    it('should work with different BPM (90)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 90;
        const interval = 60 / bpm; // ~0.667 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        const triplet4Offset = interval * (2/3);
        expect(result.beats).toHaveLength(7);
        expect(result.beats[1].timestamp).toBeCloseTo(triplet4Offset, 3);
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180;
        const interval = 60 / bpm; // 0.333 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        const triplet4Offset = interval * (2/3);
        expect(result.beats).toHaveLength(7);
        expect(result.beats[1].timestamp).toBeCloseTo(triplet4Offset, 3);
    });

    it('should correctly update detectedBeatIndices array', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const detectedIndices = [0, 3, 7]; // Beats 0, 3, and 7 are detected
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: detectedIndices,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detected indices should now be at positions 0, 6, and 14
        // 2 beats per original beat (original + interpolated), so beat 3 is at index 3*2 = 6
        // and beat 7 is at index 7*2 = 14
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toContain(6);
        expect(result.detectedBeatIndices).toContain(14);
        expect(result.detectedBeatIndices).toHaveLength(3);
    });

    it('should produce correct beat count for 8 beats (2 measures)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 original + 7 interpolated = 15 beats
        // (7 gaps between 8 beats, each gap gets 1 interpolated triplet beat)
        expect(result.beats).toHaveLength(15);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(15);
    });

    it('should have density multiplier of ~1.875x', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - density multiplier should be close to 1.875 (15/8)
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(15/8, 2);
    });
});

// ============================================================================
// Dotted Quarter Notes (dotted4) Tests
// ============================================================================

describe('BeatSubdivider - Dotted4 Notes', () => {
    it('should generate beats at 1.5x quarter note intervals (phase-independent)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        // Create 8 quarter notes (0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5 seconds)
        const beats = createRegularQuarterNotes(bpm, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Dotted quarter interval = 0.5 * 1.5 = 0.75 seconds
        // Starting at 0, beats at: 0, 0.75, 1.5, 2.25, 3.0 seconds (5 beats within 3.5 seconds)
        expect(result.beats.length).toBeGreaterThanOrEqual(5);
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(0.75, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(1.5, 3);
        expect(result.beats[3].timestamp).toBeCloseTo(2.25, 3);
        expect(result.beats[4].timestamp).toBeCloseTo(3.0, 3);
    });

    it('should be phase-independent (not aligned to measure boundaries)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - beatInMeasure values are phase-independent (0, 1.5, 3, 4.5 mod 4)
        // Beat at 0: beatInMeasure = 0
        // Beat at 0.75s: beatInMeasure = 0.75 / 0.5 = 1.5
        // Beat at 1.5s: beatInMeasure = 1.5 / 0.5 = 3
        // Beat at 2.25s: beatInMeasure = 2.25 / 0.5 = 4.5 mod 4 = 0.5
        expect(result.beats[0].beatInMeasure).toBeCloseTo(0, 2);
        expect(result.beats[1].beatInMeasure).toBeCloseTo(1.5, 2);
        expect(result.beats[2].beatInMeasure).toBeCloseTo(3, 2);
        expect(result.beats[3].beatInMeasure).toBeCloseTo(0.5, 2); // 4.5 mod 4 = 0.5
    });

    it('should set subdivisionType to "dotted4" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('dotted4');
        }
    });

    it('should mark all beats as isDetected=false (generated beats, not original)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted4 generates new beats at different positions, all are generated
        for (const beat of result.beats) {
            expect(beat.isDetected).toBe(false);
        }
    });

    it('should not set originalBeatIndex (all beats are generated)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - no beats should have originalBeatIndex since they're all generated
        for (const beat of result.beats) {
            expect(beat.originalBeatIndex).toBeUndefined();
        }
    });

    it('should use intensity from closest original beat', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { intensity: 0.6 }),
            createBeat(0.5, { intensity: 0.8 }),
            createBeat(1.0, { intensity: 1.0 }),
            createBeat(1.5, { intensity: 0.4 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - first beat at timestamp 0 should have intensity from closest beat (0.6)
        expect(result.beats[0].intensity).toBeCloseTo(0.6, 2);
        // Beat at 0.75s should have intensity from closest beat (either 0.5s or 1.0s beat)
        // 0.5s beat has intensity 0.8, 1.0s beat has intensity 1.0
        // Distance to 0.5s: 0.25s, distance to 1.0s: 0.25s (tie, picks first found)
        expect(result.beats[1].intensity).toBeGreaterThan(0);
    });

    it('should reduce confidence slightly for generated beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { confidence: 0.9 }),
            createBeat(0.5, { confidence: 0.8 }),
            createBeat(1.0, { confidence: 0.7 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - confidence should be 0.9 * closest confidence
        // Generated beats have slightly lower confidence
        expect(result.beats[0].confidence).toBeLessThan(0.9);
    });

    it('should set isDownbeat to false for all beats (cross-rhythm)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { isDownbeat: true, beatInMeasure: 0 }),
            createBeat(0.5, { isDownbeat: false, beatInMeasure: 1 }),
            createBeat(1.0, { isDownbeat: false, beatInMeasure: 2 }),
            createBeat(1.5, { isDownbeat: false, beatInMeasure: 3 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted pattern doesn't align with downbeats
        for (const beat of result.beats) {
            expect(beat.isDownbeat).toBe(false);
        }
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
    });

    it('should handle single beat', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0)];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - at least one beat should be generated
        expect(result.beats.length).toBeGreaterThanOrEqual(1);
        expect(result.beats[0].subdivisionType).toBe('dotted4');
    });

    it('should include "dotted4" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('dotted4');
    });

    it('should have density multiplier of ~0.67x (2/3)', () => {
        // Arrange - 8 quarter notes spanning 3.5 seconds
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted4 produces fewer beats than quarter notes
        // With 8 quarter notes, we get approximately 5-6 dotted beats
        // Density multiplier should be less than 1
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeLessThan(1);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 3, beatUnit: 4 } }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            duration: 10.5,
        });
        unifiedMap.audioId = 'test-audio-123';
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe('test-audio-123');
        expect(result.duration).toBe(10.5);
    });

    it('should work with different BPM (90)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 90;
        const interval = 60 / bpm; // ~0.667 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted interval = 0.667 * 1.5 = 1.0 second
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(1.0, 2);
        expect(result.beats[2].timestamp).toBeCloseTo(2.0, 2);
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180;
        const interval = 60 / bpm; // 0.333 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted interval = 0.333 * 1.5 = 0.5 second
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(0.5, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(1.0, 3);
    });

    it('should produce correct beat count for longer track', () => {
        // Arrange - 16 quarter notes = 4 measures at 120 BPM
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds
        const beats = createRegularQuarterNotes(bpm, 16);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 16 quarter notes = 8 seconds
        // Dotted interval = 0.75s, so 8 / 0.75 = ~10.67 beats (10 full beats + partial)
        expect(result.beats.length).toBeGreaterThanOrEqual(10);
        expect(result.beats.length).toBeLessThanOrEqual(12);
    });

    it('should create cross-rhythm pattern (3-beat groups in 4/4)', () => {
        // Arrange - Create a track long enough to show the cross-rhythm
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 12); // 3 measures
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Cross-rhythm means the dotted beats don't align with measure boundaries
        // After 3 dotted beats (0, 1.5, 3 quarters), we're at beat 3, not a downbeat
        // After 6 dotted beats (0, 1.5, 3, 4.5, 6, 7.5 quarters), we're at beat 7.5, not a downbeat
        // This creates a 3-against-4 polyrhythm feel
        expect(result.beats.length).toBeGreaterThan(0);

        // Verify no beats align with downbeat positions (0, 4, 8 quarters)
        // except the very first beat
        const downbeatTimestamps = [0, 2.0, 4.0]; // 0s, 2s, 4s (at 120 BPM, 4 quarters = 2 seconds)
        const beatsAtDownbeats = result.beats.filter(b =>
            downbeatTimestamps.some(d => Math.abs(b.timestamp - d) < 0.01)
        );
        // Only the first beat should be at a downbeat position
        expect(beatsAtDownbeats.length).toBe(1);
    });

    it('should have empty detectedBeatIndices (all generated beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - no beats should be marked as detected
        expect(result.detectedBeatIndices).toHaveLength(0);
    });
});

// ============================================================================
// Dotted8 (Swing) Notes Tests
// ============================================================================

describe('BeatSubdivider - Dotted8 Notes (Swing)', () => {
    it('should double the beat density with swing pattern (4 beats → 7 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 quarter notes produce 7 beats (4 original + 3 interpolated)
        // The last quarter note doesn't get an interpolated beat after it
        expect(result.beats).toHaveLength(7);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(4);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(7);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(1.75, 2);
    });

    it('should create swing pattern with 2/3 long and 1/3 short intervals', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Swing pattern: 0, 0.667, 1, 1.667, 2, 2.667, 3
        // The interpolated beat is at 2/3 between quarter notes
        // Quarter at 0s, interpolated at 0.333s (2/3 of 0.5s), Quarter at 0.5s
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);        // Quarter 0
        expect(result.beats[1].timestamp).toBeCloseTo(0.333, 3);    // Swing beat (2/3 of 0.5)
        expect(result.beats[2].timestamp).toBeCloseTo(0.5, 3);      // Quarter 1
        expect(result.beats[3].timestamp).toBeCloseTo(0.833, 3);    // Swing beat
        expect(result.beats[4].timestamp).toBeCloseTo(1.0, 3);      // Quarter 2
        expect(result.beats[5].timestamp).toBeCloseTo(1.333, 3);    // Swing beat
        expect(result.beats[6].timestamp).toBeCloseTo(1.5, 3);      // Quarter 3
    });

    it('should set correct beatInMeasure values for swing pattern', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - beatInMeasure should follow swing pattern
        // 0, 0.667, 1, 1.667, 2, 2.667, 3
        expect(result.beats[0].beatInMeasure).toBeCloseTo(0, 2);      // Quarter at position 0
        expect(result.beats[1].beatInMeasure).toBeCloseTo(0.667, 2);  // Swing at 2/3
        expect(result.beats[2].beatInMeasure).toBeCloseTo(1, 2);      // Quarter at position 1
        expect(result.beats[3].beatInMeasure).toBeCloseTo(1.667, 2);  // Swing at 1 + 2/3
        expect(result.beats[4].beatInMeasure).toBeCloseTo(2, 2);      // Quarter at position 2
        expect(result.beats[5].beatInMeasure).toBeCloseTo(2.667, 2);  // Swing at 2 + 2/3
        expect(result.beats[6].beatInMeasure).toBeCloseTo(3, 2);      // Quarter at position 3
    });

    it('should set subdivisionType to "dotted8" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('dotted8');
        }
    });

    it('should set isDetected=true for original beats and isDetected=false for interpolated beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: [0, 1, 2, 3], // All original beats are detected
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Original beats (indices 0, 2, 4, 6) should be detected
        // Interpolated beats (indices 1, 3, 5) should NOT be detected
        expect(result.beats[0].isDetected).toBe(true);  // Original quarter
        expect(result.beats[1].isDetected).toBe(false); // Interpolated swing
        expect(result.beats[2].isDetected).toBe(true);  // Original quarter
        expect(result.beats[3].isDetected).toBe(false); // Interpolated swing
        expect(result.beats[4].isDetected).toBe(true);  // Original quarter
        expect(result.beats[5].isDetected).toBe(false); // Interpolated swing
        expect(result.beats[6].isDetected).toBe(true);  // Original quarter
    });

    it('should set originalBeatIndex for original beats and undefined for interpolated', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Original beats should have originalBeatIndex
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        expect(result.beats[2].originalBeatIndex).toBe(1);
        expect(result.beats[3].originalBeatIndex).toBeUndefined();
        expect(result.beats[4].originalBeatIndex).toBe(2);
        expect(result.beats[5].originalBeatIndex).toBeUndefined();
        expect(result.beats[6].originalBeatIndex).toBe(3);
    });

    it('should interpolate intensity and confidence from neighboring beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { intensity: 0.6, confidence: 0.8 }),
            createBeat(0.5, { intensity: 1.0, confidence: 0.9 }),
            createBeat(1.0, { intensity: 0.4, confidence: 0.7 }),
            createBeat(1.5, { intensity: 0.8, confidence: 0.85 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Interpolated beats should have averaged intensity/confidence
        // Beat at index 1 is between beats 0 and 1: intensity = (0.6 + 1.0) / 2 = 0.8
        expect(result.beats[1].intensity).toBeCloseTo(0.8, 2);
        expect(result.beats[1].confidence).toBeCloseTo(0.85, 2);
    });

    it('should set isDownbeat=false for interpolated beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats: Beat[] = [
            createBeat(0, { isDownbeat: true, beatInMeasure: 0 }),
            createBeat(0.5, { isDownbeat: false, beatInMeasure: 1 }),
            createBeat(1.0, { isDownbeat: false, beatInMeasure: 2 }),
            createBeat(1.5, { isDownbeat: false, beatInMeasure: 3 }),
        ];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Original beats keep their isDownbeat, interpolated are always false
        expect(result.beats[0].isDownbeat).toBe(true);  // Original downbeat
        expect(result.beats[1].isDownbeat).toBe(false); // Interpolated (never downbeat)
        expect(result.beats[2].isDownbeat).toBe(false); // Original non-downbeat
        expect(result.beats[3].isDownbeat).toBe(false); // Interpolated
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(0);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(0);
    });

    it('should handle single beat (no interpolated beat added)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0, { beatInMeasure: 0, isDownbeat: true, measureNumber: 0 })];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Single beat produces just 1 beat (no neighbor to interpolate with)
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('dotted8');
        expect(result.beats[0].isDetected).toBe(true);
    });

    it('should include "dotted8" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('dotted8');
    });

    it('should have maxDensity of 4 in metadata (as defined by getSubdivisionDensity)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted8 has density 4 as defined in getSubdivisionDensity
        // (Note: This is the classification density, actual beat count is 2x)
        expect(result.subdivisionMetadata.maxDensity).toBe(4);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{
                startBeat: 0,
                timeSignature: { beatsPerMeasure: 3, beatUnit: 4 },
            }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            duration: 10.5,
        });
        unifiedMap.audioId = 'test-audio-123';
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.audioId).toBe('test-audio-123');
        expect(result.duration).toBe(10.5);
    });

    it('should work with different BPM (90)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 90;
        const interval = 60 / bpm; // ~0.667 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Swing interval at 90 BPM: 2/3 of 0.667 = ~0.444 seconds
        expect(result.beats).toHaveLength(7);
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(0.444, 2);    // 2/3 of 0.667
        expect(result.beats[2].timestamp).toBeCloseTo(0.667, 2);
        expect(result.beats[3].timestamp).toBeCloseTo(1.111, 2);    // 0.667 + 0.444
        expect(result.beats[4].timestamp).toBeCloseTo(1.333, 2);
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180;
        const interval = 60 / bpm; // 0.333 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 quarter notes → 15 beats (8 original + 7 interpolated)
        // Swing interval at 180 BPM: 2/3 of 0.333 = ~0.222 seconds
        expect(result.beats).toHaveLength(15);
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(0.222, 2);
        expect(result.beats[2].timestamp).toBeCloseTo(0.333, 2);
    });

    it('should produce correct beat count for longer track', () => {
        // Arrange - 16 quarter notes = 4 measures at 120 BPM
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 16);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 16 quarter notes → 31 beats (16 original + 15 interpolated)
        expect(result.beats).toHaveLength(31);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(1.9375, 2);
    });

    it('should update detectedBeatIndices correctly in result', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: [0, 1, 2, 3], // All original beats detected
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detectedBeatIndices should point to original beats (0, 2, 4, 6)
        expect(result.detectedBeatIndices).toEqual([0, 2, 4, 6]);
    });

    it('should preserve measure numbers from original beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8); // 2 measures (beats 0-3 in m0, 4-7 in m1)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 8 quarter notes → 15 subdivided beats
        // Original beats at indices 0, 2, 4, 6, 8, 10, 12, 14
        // Interpolated beats at indices 1, 3, 5, 7, 9, 11, 13
        // Q0-Q3 are in measure 0, Q4-Q7 are in measure 1
        expect(result.beats[0].measureNumber).toBe(0); // Original Q0
        expect(result.beats[1].measureNumber).toBe(0); // Interpolated (same measure as Q0)
        expect(result.beats[2].measureNumber).toBe(0); // Original Q1
        expect(result.beats[3].measureNumber).toBe(0); // Interpolated
        expect(result.beats[4].measureNumber).toBe(0); // Original Q2
        expect(result.beats[5].measureNumber).toBe(0); // Interpolated
        expect(result.beats[6].measureNumber).toBe(0); // Original Q3
        expect(result.beats[7].measureNumber).toBe(0); // Interpolated (still before measure 1)
        expect(result.beats[8].measureNumber).toBe(1); // Original Q4 (first beat of measure 1)
    });

    it('should create classic swing feel (long-short pattern)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted8',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Verify the long-short intervals
        // Long interval: from quarter to swing beat (2/3 of quarter = 0.333s)
        // Short interval: from swing beat to next quarter (1/3 of quarter = 0.167s)
        const longInterval = result.beats[1].timestamp - result.beats[0].timestamp;
        const shortInterval = result.beats[2].timestamp - result.beats[1].timestamp;

        expect(longInterval).toBeCloseTo(0.333, 2); // 2/3 of 0.5s
        expect(shortInterval).toBeCloseTo(0.167, 2); // 1/3 of 0.5s
        expect(longInterval / shortInterval).toBeCloseTo(2, 1); // Long is ~2x short
    });
});


// ============================================================================
// Rest Subdivision Tests
// ============================================================================

describe('BeatSubdivider - Rest Subdivision', () => {
    it('should skip a beat when marked as rest', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [1, 'rest'], // Beat at index 1 should be skipped
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 3 beats (beat 1 is skipped)
        expect(result.beats).toHaveLength(3);
        expect(result.beats[0].beatInMeasure).toBe(0); // Beat 0 kept
        expect(result.beats[1].beatInMeasure).toBe(2); // Beat 2 (beat 1 skipped)
        expect(result.beats[2].beatInMeasure).toBe(3); // Beat 3 kept
    });

    it('should produce no beats when all beats are rests', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'rest'],
                [1, 'rest'],
                [2, 'rest'],
                [3, 'rest'],
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - no beats produced
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
    });

    it('should include rest in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [1, 'rest'],
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('rest');
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('quarter');
    });

    it('should track explicitBeatCount correctly with rests', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'eighth'], // explicit
                [1, 'rest'],   // explicit
                [2, 'quarter'], // explicit (same as default but still explicit)
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 3 explicit assignments (beats 0, 1, 2)
        expect(result.subdivisionMetadata.explicitBeatCount).toBe(3);
    });

    it('should create rhythm pattern with alternating rests', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [1, 'rest'],
                [3, 'rest'],
                [5, 'rest'],
                [7, 'rest'],
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 beats (odd beats skipped)
        expect(result.beats).toHaveLength(4);
        // Verify timestamps - only beats 0, 2, 4, 6 remain
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(1.0, 3); // beat 2 at 2 * 0.5s
        expect(result.beats[2].timestamp).toBeCloseTo(2.0, 3); // beat 4 at 4 * 0.5s
        expect(result.beats[3].timestamp).toBeCloseTo(3.0, 3); // beat 6 at 6 * 0.5s
    });

    it('should work with rest as default subdivision', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'quarter'], // Only beat 0 is kept
            ]),
            defaultSubdivision: 'rest', // All other beats are rests
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only beat 0
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].beatInMeasure).toBe(0);
    });

    it('should skip rest beats with no interpolated beats generated', () => {
        // Arrange - rest beats should not produce any interpolated beats
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [1, 'rest'],
                [2, 'eighth'], // Beat 2 with eighth should produce 1 interpolated beat
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert:
        // Beat 0 (quarter): 1 beat
        // Beat 1 (rest): 0 beats
        // Beat 2 (eighth): 1 beat + 1 interpolated = 2 beats
        // Beat 3 (quarter): 1 beat
        // Total: 1 + 0 + 2 + 1 = 4 beats
        expect(result.beats).toHaveLength(4);
    });

    it('should preserve downbeatConfig and other map properties with rests', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 4 } }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [2, 'rest'],
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
        expect(result.audioId).toBe('test-audio-id');
    });

    it('should update detectedBeatIndices correctly when beats are skipped', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            detectedBeatIndices: [0, 1, 2, 3], // All beats detected
        });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [1, 'rest'], // Beat 1 is skipped
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 3 beats remain, all detected
        // Beat 0 → index 0 (detected)
        // Beat 1 → skipped
        // Beat 2 → index 1 (detected)
        // Beat 3 → index 2 (detected)
        expect(result.detectedBeatIndices).toEqual([0, 1, 2]);
    });

    it('should handle single beat marked as rest', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 1);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'rest'],
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - no beats
        expect(result.beats).toHaveLength(0);
    });

    it('should handle empty beatSubdivisions map with rest default', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(), // Empty map
            defaultSubdivision: 'rest',  // All beats are rests
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - no beats
        expect(result.beats).toHaveLength(0);
        expect(result.subdivisionMetadata.explicitBeatCount).toBe(0);
    });

    it('should create syncopated rhythm pattern with rests', () => {
        // Arrange - Create a syncopated pattern: play, rest, rest, play
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [1, 'rest'],
                [2, 'rest'],
                [5, 'rest'],
                [6, 'rest'],
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 4 beats remain (0, 3, 4, 7)
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].beatInMeasure).toBe(0); // Beat 0
        expect(result.beats[1].beatInMeasure).toBe(3); // Beat 3
        expect(result.beats[2].beatInMeasure).toBe(0); // Beat 4 (new measure)
        expect(result.beats[3].beatInMeasure).toBe(3); // Beat 7
    });

    it('should set maxDensity to 0 when all beats are rests', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'rest',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - maxDensity should be 0 for rest
        expect(result.subdivisionMetadata.maxDensity).toBe(0);
    });

    it('should work with mixed subdivision types including rest', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'eighth'],  // 1 beat + 1 interpolated = 2
                [1, 'rest'],    // 0 beats
                [2, 'sixteenth'], // 1 beat + 3 interpolated = 4
                // Beat 3 uses default (quarter) = 1 beat
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert: 2 + 0 + 4 + 1 = 7 beats
        expect(result.beats).toHaveLength(7);
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('eighth');
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('rest');
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('sixteenth');
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('quarter');
    });

    it('should handle rest at the beginning of the beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'rest'], // First beat is rest
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 3 beats, starting from beat 1
        expect(result.beats).toHaveLength(3);
        expect(result.beats[0].beatInMeasure).toBe(1); // Was beat 1
    });

    it('should handle rest at the end of the beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [3, 'rest'], // Last beat is rest
            ]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 3 beats
        expect(result.beats).toHaveLength(3);
        expect(result.beats[2].beatInMeasure).toBe(2); // Last beat is beat 2
    });
});


// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('BeatSubdivider - Edge Cases', () => {
    // ========================================================================
    // Tempo Changes (Multi-Tempo Tracks)
    // ========================================================================

    describe('Tempo changes (multi-tempo tracks)', () => {
        /**
         * Helper to create a unified beat map with multiple tempo sections
         */
        function createMultiTempoBeatMap(): UnifiedBeatMap {
            const bpm1 = 120; // First section: 120 BPM
            const bpm2 = 90;  // Second section: 90 BPM
            const interval1 = 60 / bpm1; // 0.5 seconds
            const interval2 = 60 / bpm2; // ~0.667 seconds

            // Create 4 beats at 120 BPM, then 4 beats at 90 BPM
            const beats: Beat[] = [];

            // Section 1: beats 0-3 at 120 BPM (timestamps: 0, 0.5, 1.0, 1.5)
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(i * interval1, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: Math.floor(i / 4),
                }));
            }

            // Section 2: beats 4-7 at 90 BPM (starting from 2.0)
            const section2Start = beats[3].timestamp + interval1; // 2.0
            for (let i = 0; i < 4; i++) {
                beats.push(createBeat(section2Start + i * interval2, {
                    beatInMeasure: i % 4,
                    isDownbeat: i % 4 === 0,
                    measureNumber: 1 + Math.floor(i / 4),
                }));
            }

            // Create tempo sections
            const tempoSections: TempoSection[] = [
                {
                    start: 0,
                    end: section2Start,
                    bpm: bpm1,
                    intervalSeconds: interval1,
                    beatCount: 4,
                    startBeatIndex: 0,
                    endBeatIndex: 3,
                },
                {
                    start: section2Start,
                    end: section2Start + 4 * interval2,
                    bpm: bpm2,
                    intervalSeconds: interval2,
                    beatCount: 4,
                    startBeatIndex: 4,
                    endBeatIndex: 7,
                },
            ];

            return {
                audioId: 'multi-tempo-test',
                duration: section2Start + 4 * interval2,
                beats,
                detectedBeatIndices: beats.map((_, i) => i),
                quarterNoteInterval: interval1, // Primary tempo
                quarterNoteBpm: bpm1,
                downbeatConfig: DEFAULT_DOWNBEAT_CONFIG,
                tempoSections,
                originalMetadata: createDefaultMetadata(),
            };
        }

        it('should detect multiple tempos in metadata', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act
            const result = subdivider.subdivide(unifiedMap);

            // Assert
            expect(result.subdivisionMetadata.hasMultipleTempos).toBe(true);
            expect(result.tempoSections).toBeDefined();
            expect(result.tempoSections?.length).toBe(2);
        });

        it('should handle eighth notes with multi-tempo track', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - 8 original beats + 7 interpolated = 15 beats
            expect(result.beats.length).toBe(15);
            expect(result.subdivisionMetadata.hasMultipleTempos).toBe(true);
        });

        it('should handle sixteenth notes with multi-tempo track', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'sixteenth',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - 8 original beats + 7*3 interpolated = 29 beats
            expect(result.beats.length).toBe(29);
        });

        it('should handle segment transition within multi-tempo track', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act - switch from quarter to eighth at beat 4 (where tempo changes)
            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' },
                    { startBeat: 4, subdivision: 'eighth' },
                ],
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - 4 quarters + 4 quarters with 3 eighths interpolated = 11 beats
            expect(result.beats.length).toBe(11);
            expect(result.subdivisionMetadata.subdivisionsUsed).toEqual(
                expect.arrayContaining(['quarter', 'eighth'])
            );
        });

        it('should preserve tempo sections in output', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act
            const result = subdivider.subdivide(unifiedMap);

            // Assert
            expect(result.tempoSections).toEqual(unifiedMap.tempoSections);
        });

        it('should handle triplet8 with multi-tempo track', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'triplet8',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - 8 original beats + 7*2 triplet beats = 22 beats
            expect(result.beats.length).toBe(22);
        });

        it('should handle dotted4 with multi-tempo track', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'dotted4',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - dotted4 is phase-independent, generates beats at 1.5x intervals
            expect(result.beats.length).toBeGreaterThan(0);
            expect(result.subdivisionMetadata.hasMultipleTempos).toBe(true);
        });

        it('should handle single tempo (no tempoSections) without issues', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            // unifiedMap does NOT have tempoSections defined

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - should work normally without tempoSections
            expect(result.beats.length).toBe(15);
            expect(result.subdivisionMetadata.hasMultipleTempos).toBe(false);
        });
    });

    // ========================================================================
    // Subdivision Config Validation
    // ========================================================================

    describe('Subdivision config with startBeat exceeding beat count (validation)', () => {
        it('should allow segment starting beyond beat count (no-op)', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Act - segment starts at beat 100, but we only have 8 beats
            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' },
                    { startBeat: 100, subdivision: 'eighth' }, // Beyond beat count
                ],
            };
            // Should NOT throw - segment simply won't apply
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - only first segment applies
            expect(result.beats.length).toBe(8);
        });

        it('should throw error for empty beat map with non-zero startBeat', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });

            // Act & Assert
            const config: SubdivisionConfig = {
                segments: [{ startBeat: 5, subdivision: 'quarter' }],
            };
            expect(() => subdivider.subdivide(unifiedMap, config)).toThrow(
                'Cannot apply subdivision config with multiple segments or non-zero startBeat to empty beat map'
            );
        });

        it('should throw error for empty beat map with multiple segments', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });

            // Act & Assert
            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' },
                    { startBeat: 4, subdivision: 'eighth' },
                ],
            };
            expect(() => subdivider.subdivide(unifiedMap, config)).toThrow(
                'Cannot apply subdivision config with multiple segments or non-zero startBeat to empty beat map'
            );
        });

        it('should allow default config on empty beat map', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });

            // Act - should not throw
            const result = subdivider.subdivide(unifiedMap);

            // Assert
            expect(result.beats.length).toBe(0);
        });

        it('should validate startBeat is non-negative', () => {
            // Arrange - use validation function directly
            const config: SubdivisionConfig = {
                segments: [{ startBeat: -1, subdivision: 'quarter' }],
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'startBeat must be non-negative'
            );
        });

        it('should validate segments are ordered by startBeat', () => {
            // Arrange - segments out of order
            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 4, subdivision: 'eighth' },
                    { startBeat: 0, subdivision: 'quarter' }, // Should be first
                ],
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'Segments must be ordered by startBeat'
            );
        });

        it('should validate subdivision type is valid', () => {
            // Arrange
            const config: SubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'invalid' as SubdivisionType }],
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'Invalid subdivision type'
            );
        });

        it('should validate config has at least one segment', () => {
            // Arrange
            const config: SubdivisionConfig = {
                segments: [],
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'must have at least one segment'
            );
        });
    });

    // ========================================================================
    // Density Limit Enforcement
    // ========================================================================

    describe('Density limit enforcement', () => {
        it('should have MAX_SUBDIVISION_DENSITY constant set to 4', () => {
            // Assert - sixteenth notes (4x) are the maximum
            expect(MAX_SUBDIVISION_DENSITY).toBe(4);
        });

        it('should not throw for half notes (0.5x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('half')).not.toThrow();
            expect(getSubdivisionDensity('half')).toBe(0.5);
        });

        it('should not throw for quarter notes (1x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('quarter')).not.toThrow();
            expect(getSubdivisionDensity('quarter')).toBe(1);
        });

        it('should not throw for eighth notes (2x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('eighth')).not.toThrow();
            expect(getSubdivisionDensity('eighth')).toBe(2);
        });

        it('should not throw for triplet8 (2x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('triplet8')).not.toThrow();
            expect(getSubdivisionDensity('triplet8')).toBe(2);
        });

        it('should not throw for triplet4 (2x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('triplet4')).not.toThrow();
            expect(getSubdivisionDensity('triplet4')).toBe(2);
        });

        it('should not throw for dotted4 (4x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('dotted4')).not.toThrow();
            expect(getSubdivisionDensity('dotted4')).toBe(4);
        });

        it('should not throw for dotted8 (4x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('dotted8')).not.toThrow();
            expect(getSubdivisionDensity('dotted8')).toBe(4);
        });

        it('should not throw for sixteenth notes (4x density - maximum)', () => {
            // Act & Assert - should not throw (at the limit)
            expect(() => validateSubdivisionDensity('sixteenth')).not.toThrow();
            expect(getSubdivisionDensity('sixteenth')).toBe(4);
        });

        it('should report correct maxDensity for sixteenth subdivision', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'sixteenth',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - maxDensity should be 4 (at the limit)
            expect(result.subdivisionMetadata.maxDensity).toBe(4);
        });

        it('should report correct maxDensity for half subdivision (below limit)', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Act
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'half',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - maxDensity should be 1 (0.5 rounds up to baseline 1)
            expect(result.subdivisionMetadata.maxDensity).toBe(1);
        });

        it('should report correct maxDensity for segment transition to maximum density', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 16);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Act - transition from half to sixteenth
            const config: SubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'half' },        // 0.5x
                    { startBeat: 8, subdivision: 'sixteenth' },   // 4x
                ],
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - maxDensity should be 4 (from sixteenth segment)
            expect(result.subdivisionMetadata.maxDensity).toBe(4);
        });
    });

    // ========================================================================
    // Serialization Tests
    // ========================================================================

    describe('Serialization (toJSON/fromJSON)', () => {
        it('should serialize and deserialize a SubdividedBeatMap', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Act
            const json = BeatSubdivider.toJSON(original);
            const restored = BeatSubdivider.fromJSON(json);

            // Assert
            expect(restored.audioId).toBe(original.audioId);
            expect(restored.duration).toBe(original.duration);
            expect(restored.beats.length).toBe(original.beats.length);
            expect(restored.detectedBeatIndices).toEqual(original.detectedBeatIndices);
            expect(restored.subdivisionConfig).toEqual(original.subdivisionConfig);
            expect(restored.subdivisionMetadata).toEqual(original.subdivisionMetadata);
        });

        it('should preserve requiredKey on beats during serialization', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 4);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Add requiredKey to beats
            original.beats[0].requiredKey = 'left';
            original.beats[1].requiredKey = 'down';
            original.beats[2].requiredKey = 'up';
            // beat 3 has no requiredKey

            // Act
            const json = BeatSubdivider.toJSON(original);
            const restored = BeatSubdivider.fromJSON(json);

            // Assert
            expect(restored.beats[0].requiredKey).toBe('left');
            expect(restored.beats[1].requiredKey).toBe('down');
            expect(restored.beats[2].requiredKey).toBe('up');
            expect(restored.beats[3].requiredKey).toBeUndefined();
        });

        it('should preserve SubdividedBeat-specific fields during serialization', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 4);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Act
            const json = BeatSubdivider.toJSON(original);
            const restored = BeatSubdivider.fromJSON(json);

            // Assert - check SubdividedBeat-specific fields
            for (let i = 0; i < original.beats.length; i++) {
                expect(restored.beats[i].isDetected).toBe(original.beats[i].isDetected);
                expect(restored.beats[i].subdivisionType).toBe(original.beats[i].subdivisionType);
                expect(restored.beats[i].originalBeatIndex).toBe(original.beats[i].originalBeatIndex);
            }
        });

        it('should preserve downbeatConfig during serialization', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const customDownbeatConfig: DownbeatConfig = {
                segments: [{
                    startBeat: 0,
                    downbeatBeatIndex: 4,
                    timeSignature: { beatsPerMeasure: 4 },
                }],
            };
            const unifiedMap = createUnifiedBeatMap(beats, {
                bpm: 120,
                downbeatConfig: customDownbeatConfig,
            });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Act
            const json = BeatSubdivider.toJSON(original);
            const restored = BeatSubdivider.fromJSON(json);

            // Assert
            expect(restored.downbeatConfig).toEqual(customDownbeatConfig);
        });

        it('should preserve tempo sections during serialization', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Add tempo sections
            unifiedMap.tempoSections = [
                {
                    start: 0,
                    end: 1.0,
                    bpm: 120,
                    intervalSeconds: 0.5,
                    beatCount: 4,
                    startBeatIndex: 0,
                    endBeatIndex: 3,
                },
                {
                    start: 1.0,
                    end: 2.0,
                    bpm: 140,
                    intervalSeconds: 0.428,
                    beatCount: 4,
                    startBeatIndex: 4,
                    endBeatIndex: 7,
                },
            ];

            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Act
            const json = BeatSubdivider.toJSON(original);
            const restored = BeatSubdivider.fromJSON(json);

            // Assert
            expect(restored.tempoSections).toBeDefined();
            expect(restored.tempoSections?.length).toBe(2);
            expect(restored.tempoSections?.[0].bpm).toBe(120);
            expect(restored.tempoSections?.[1].bpm).toBe(140);
        });

        it('should produce valid JSON string', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 4);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Act
            const json = BeatSubdivider.toJSON(original);

            // Assert - should be parseable JSON
            expect(() => JSON.parse(json)).not.toThrow();
            const parsed = JSON.parse(json);
            expect(parsed.audioId).toBe(original.audioId);
        });

        it('should handle empty SubdividedBeatMap', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createUnifiedBeatMap([], { bpm: 120, duration: 10 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Act
            const json = BeatSubdivider.toJSON(original);
            const restored = BeatSubdivider.fromJSON(json);

            // Assert
            expect(restored.beats.length).toBe(0);
            expect(restored.detectedBeatIndices.length).toBe(0);
            expect(restored.subdivisionMetadata.originalBeatCount).toBe(0);
            expect(restored.subdivisionMetadata.subdividedBeatCount).toBe(0);
        });
    });

    // ========================================================================
    // File I/O Tests (saveToFile/loadFromFile)
    // ========================================================================

    describe('File I/O (saveToFile/loadFromFile)', () => {
        it('should preserve requiredKey when saving and loading SubdividedBeatMap from file', async () => {
            // This test runs in Node.js environment (vitest/node)
            const { unlink } = await import('fs/promises');
            const { tmpdir } = await import('os');
            const { join } = await import('path');

            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 4);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Add requiredKey to some beats
            original.beats[0].requiredKey = 'left';
            original.beats[1].requiredKey = 'down';
            original.beats[2].requiredKey = 'up';
            // beats 3+ have no requiredKey

            const tempFile = join(tmpdir(), `subdivided-beatmap-keys-test-${Date.now()}.json`);

            try {
                // Act - save to file
                await BeatSubdivider.saveToFile(original, tempFile);

                // Act - load from file
                const loaded = await BeatSubdivider.loadFromFile(tempFile);

                // Assert - requiredKey should be preserved
                expect(loaded.beats[0].requiredKey).toBe('left');
                expect(loaded.beats[1].requiredKey).toBe('down');
                expect(loaded.beats[2].requiredKey).toBe('up');
                expect(loaded.beats[3].requiredKey).toBeUndefined();

                // Assert - other SubdividedBeatMap properties should be preserved
                expect(loaded.audioId).toBe(original.audioId);
                expect(loaded.duration).toBe(original.duration);
                expect(loaded.beats.length).toBe(original.beats.length);
                expect(loaded.subdivisionConfig).toEqual(original.subdivisionConfig);
                expect(loaded.detectedBeatIndices).toEqual(original.detectedBeatIndices);

                // Assert - SubdividedBeat-specific fields should be preserved
                for (let i = 0; i < original.beats.length; i++) {
                    expect(loaded.beats[i].isDetected).toBe(original.beats[i].isDetected);
                    expect(loaded.beats[i].subdivisionType).toBe(original.beats[i].subdivisionType);
                    expect(loaded.beats[i].originalBeatIndex).toBe(original.beats[i].originalBeatIndex);
                }
            } finally {
                // Clean up temp file
                try {
                    await unlink(tempFile);
                } catch {
                    // Ignore cleanup errors
                }
            }
        });

        it('should handle round-trip file I/O with mixed beats (some with keys, some without)', async () => {
            const { unlink } = await import('fs/promises');
            const { tmpdir } = await import('os');
            const { join } = await import('path');

            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const original = subdivider.subdivide(unifiedMap, config);

            // Add requiredKey to every other beat
            for (let i = 0; i < original.beats.length; i++) {
                if (i % 2 === 0) {
                    original.beats[i].requiredKey = `key-${i}`;
                }
            }

            const tempFile = join(tmpdir(), `subdivided-mixed-keys-${Date.now()}.json`);

            try {
                // First save/load cycle
                await BeatSubdivider.saveToFile(original, tempFile);
                const loaded1 = await BeatSubdivider.loadFromFile(tempFile);

                // Second save/load cycle (stability test)
                const tempFile2 = join(tmpdir(), `subdivided-mixed-keys-2-${Date.now()}.json`);
                await BeatSubdivider.saveToFile(loaded1, tempFile2);
                const loaded2 = await BeatSubdivider.loadFromFile(tempFile2);

                // Assert - keys should be preserved through multiple cycles
                for (let i = 0; i < original.beats.length; i++) {
                    if (i % 2 === 0) {
                        expect(loaded2.beats[i].requiredKey).toBe(`key-${i}`);
                    } else {
                        expect(loaded2.beats[i].requiredKey).toBeUndefined();
                    }
                }

                // Clean up second temp file
                try {
                    await unlink(tempFile2);
                } catch {
                    // Ignore cleanup errors
                }
            } finally {
                // Clean up temp file
                try {
                    await unlink(tempFile);
                } catch {
                    // Ignore cleanup errors
                }
            }
        });
    });
});
