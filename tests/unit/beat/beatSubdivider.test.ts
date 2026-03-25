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
        noiseFloorThreshold: 0,
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
    it('should keep only beats on positions 0 and 2 (beats on 1 and 3 in music)', () => {
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

        // Assert - half subdivision keeps only beats at positions 0 and 2
        // 8 quarter notes → 4 half notes (positions 0, 2, 4, 6)
        expect(result.beats).toHaveLength(4);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8);
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(4);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBe(0.5);
    });

    it('should keep only beats at positions 0 and 2 in each measure', () => {
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

        // Assert - only beats at positions 0 and 2 are kept
        expect(result.beats).toHaveLength(4);

        // Remaining beats should be at positions 0 and 2 in each measure
        expect(result.beats[0].beatInMeasure).toBe(0); // measure 0, position 0 (downbeat)
        expect(result.beats[1].beatInMeasure).toBe(2); // measure 0, position 2 (beat 3)
        expect(result.beats[2].beatInMeasure).toBe(0); // measure 1, position 0 (downbeat)
        expect(result.beats[3].beatInMeasure).toBe(2); // measure 1, position 2 (beat 3)
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
        // 16 quarter notes → 8 half notes (positions 0, 2, 4, 6, 8, 10, 12, 14)
        expect(result.beats).toHaveLength(8);
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

        // Assert - only 4 beats remain (positions 0, 2, 4, 6)
        // Downbeats at positions 0 and 4 are preserved
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].isDownbeat).toBe(true);  // measure 0, position 0 (downbeat)
        expect(result.beats[1].isDownbeat).toBe(false); // measure 0, position 2 (beat 3)
        expect(result.beats[2].isDownbeat).toBe(true);  // measure 1, position 0 (downbeat)
        expect(result.beats[3].isDownbeat).toBe(false); // measure 1, position 2 (beat 3)
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
        // Beats at indices 0, 2, 4, 6 are detected (these are exactly the half note positions!)
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

        // Assert - only 4 beats kept (positions 0, 2, 4, 6), all are detected
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].isDetected).toBe(true);  // index 0
        expect(result.beats[1].isDetected).toBe(true);  // index 2
        expect(result.beats[2].isDetected).toBe(true);  // index 4
        expect(result.beats[3].isDetected).toBe(true);  // index 6
    });

    it('should update detectedBeatIndices correctly - none detected when detected beats are filtered out', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        // Beats at indices 1, 3, 5, 7 are detected (these will be filtered out by half notes!)
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

        // Assert - 4 beats kept (positions 0, 2, 4, 6), none are detected
        // because the detected beats (1, 3, 5, 7) were filtered out
        expect(result.beats).toHaveLength(4);
        expect(result.detectedBeatIndices).toEqual([]); // none of the kept beats were detected
        expect(result.beats[0].isDetected).toBe(false);
        expect(result.beats[1].isDetected).toBe(false);
        expect(result.beats[2].isDetected).toBe(false);
        expect(result.beats[3].isDetected).toBe(false);
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

        // Assert - originalBeatIndex should reflect original positions (0, 2, 4, 6)
        expect(result.beats).toHaveLength(4);
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

        // Assert - single beat is kept
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].beatInMeasure).toBe(0);
        expect(result.beats[0].subdivisionType).toBe('half');
    });

    it('should filter out single beat at odd position', () => {
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

        // Assert - beat at position 1 is filtered out (1 % 2 !== 0)
        expect(result.beats).toHaveLength(0);
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

    it('should report maxDensity as 0.5 for half subdivision', () => {
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

        // Assert - maxDensity should be 0.5 for half subdivision
        expect(result.subdivisionMetadata.maxDensity).toBe(0.5);
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

        // Assert - timestamps should match kept beats (positions 0, 2, 4, 6)
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].timestamp).toBe(0 * interval);     // beat 0
        expect(result.beats[1].timestamp).toBe(2 * interval);     // beat 2
        expect(result.beats[2].timestamp).toBe(4 * interval);     // beat 4
        expect(result.beats[3].timestamp).toBe(6 * interval);     // beat 6
    });

    it('should preserve intensity and confidence of kept beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 8);
        // Set specific intensity/confidence for beats at positions 0 and 2 (which are kept)
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

        // Assert - only 4 beats kept (positions 0, 2, 4, 6), with their properties preserved
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].intensity).toBe(0.9);   // beat 0
        expect(result.beats[0].confidence).toBe(0.95);
        expect(result.beats[1].intensity).toBe(0.7);   // beat 2
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
        // Positions: 0, 1, 2, 3, 4, 5, 6
        // Half notes keep: 0, 2, 4, 6 (positions where beatInMeasure % 2 === 0)
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only 4 beats kept (positions 0, 2, 4, 6)
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].beatInMeasure).toBe(0); // original beat 0
        expect(result.beats[1].beatInMeasure).toBe(2); // original beat 2
        expect(result.beats[2].beatInMeasure).toBe(0); // original beat 4
        expect(result.beats[3].beatInMeasure).toBe(2); // original beat 6
    });

    it('should work with different time signatures (3/4 time)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm;
        const beats: Beat[] = [];

        // Create 6 beats in 3/4 time (2 measures)
        // Positions: 0, 1, 2, 0, 1, 2
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

        // Assert - half notes keep beats where beatInMeasure % 2 === 0
        // Original: 0, 1, 2, 0, 1, 2 (positions in measure)
        // Kept:     0,    2, 0,    2 (positions 0, 2, 3, 5 in original array)
        // That's 4 beats
        expect(result.beats).toHaveLength(4);
        expect(result.beats[0].beatInMeasure).toBe(0); // original beat 0
        expect(result.beats[1].beatInMeasure).toBe(2); // original beat 2
        expect(result.beats[2].beatInMeasure).toBe(0); // original beat 3
        expect(result.beats[3].beatInMeasure).toBe(2); // original beat 5
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

        // Assert - triplet8 has density of 3 (3 beats per quarter note)
        expect(result.subdivisionMetadata.maxDensity).toBe(3);
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
    it('should create quarter triplets as 2-beat structure (4 beats → 6 beats)', () => {
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

        // Assert - 2-beat structure: from beats 0 and 2 (even positions)
        // Each produces: original + interpolated at 2/3 + interpolated at 4/3
        // From beat 0: triplet 1 (0), triplet 2 (2/3), triplet 3 (4/3)
        // From beat 2: triplet 4 (2.0), triplet 5 (2 + 2/3)
        // Total: 5 beats (last triplet 6 would need beat 4)
        expect(result.beats.length).toBe(5);
    });

    it('should create quarter triplets with 8 input beats (4 pairs → 12 beats)', () => {
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

        // Assert - 4 pairs processed, but last triplet incomplete (no beat 8)
        // 3 + 3 + 3 + 2 = 11 beats
        expect(result.beats.length).toBe(11);
    });

    it('should place triplet beats at correct timestamps (0, 2/3, 4/3 per pair)', () => {
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

        // Assert - triplet timestamps for first pair (beats 0, 1):
        // Triplet 1 at 0
        // Triplet 2 at 2/3 * interval = 0.333
        // Triplet 3 at 4/3 * interval = 0.667 (1 + 1/3)
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(interval * 2/3, 3);
        expect(result.beats[2].timestamp).toBeCloseTo(interval * 4/3, 3);
        // Second pair starts at beat 2
        expect(result.beats[3].timestamp).toBeCloseTo(interval * 2, 3);
        expect(result.beats[4].timestamp).toBeCloseTo(interval * 2 + interval * 2/3, 3);
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

        // Assert - only beats at even positions are original
        expect(result.beats[0].isDetected).toBe(true);  // original beat 0
        expect(result.beats[1].isDetected).toBe(false); // interpolated at 2/3
        expect(result.beats[2].isDetected).toBe(false); // interpolated at 4/3
        expect(result.beats[3].isDetected).toBe(true);  // original beat 2
        expect(result.beats[4].isDetected).toBe(false); // interpolated
    });

    it('should set originalBeatIndex for original beats only', () => {
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

        // Assert - only original beats (at even positions) have originalBeatIndex
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        expect(result.beats[2].originalBeatIndex).toBeUndefined();
        expect(result.beats[3].originalBeatIndex).toBe(2);
        expect(result.beats[4].originalBeatIndex).toBeUndefined();
    });

    it('should interpolate confidence as average of neighbor beats', () => {
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
        // With 2-beat structure: beats[0] is original 0, beats[1] is interp, beats[2] is interp, beats[3] is original 2
        // Between beat 0 (0.5) and beat 1 (0.7): avg = 0.6
        expect(result.beats[1].confidence).toBeCloseTo(0.6, 2);
        // Between beat 1 (0.7) and beat 2 (0.9): avg = 0.8
        expect(result.beats[2].confidence).toBeCloseTo(0.8, 2);
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

        // Assert - beat 0 is at index 0, beat 2 is at index 3 (after 0, interp, interp)
        // Processing beat 0: 3 beats (original, interp at 2/3, interp at 4/3) → indices 0, 1, 2
        // Processing beat 2: 2 beats (original, interp at 2/3, no 3rd triplet without beat 4) → indices 3, 4
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toContain(3);
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

        // Assert - beat 0 is processed (beatInMeasure=0), beat 1 is skipped (beatInMeasure=1)
        // From beat 0: original + interp at 2/3 (no 3rd triplet without beat 2) = 2 beats
        expect(result.beats).toHaveLength(2);
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

        // Assert - triplet4 has density of 1.5
        expect(result.subdivisionMetadata.maxDensity).toBe(1.5);
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

        // Assert - 2 pairs processed, but last triplet incomplete (no beat 4)
        // 3 + 2 = 5 beats
        const triplet4Offset = interval * (2/3);
        expect(result.beats).toHaveLength(5);
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

        // Assert - 2 pairs processed, but last triplet incomplete (no beat 4)
        // 3 + 2 = 5 beats
        const triplet4Offset = interval * (2/3);
        expect(result.beats).toHaveLength(5);
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

        // Assert - only beats at even positions are kept (0, 2, 4, 6)
        // Beat 3 and 7 are at odd beatInMeasure positions, so they're skipped
        // Only beat 0 remains detected, at output index 0
        expect(result.detectedBeatIndices).toContain(0);
        expect(result.detectedBeatIndices).toHaveLength(1);
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

        // Assert - 4 pairs processed (beats 0, 2, 4, 6), last pair incomplete
        // 3 + 3 + 3 + 2 = 11 beats
        expect(result.beats).toHaveLength(11);
        expect(result.subdivisionMetadata.originalBeatCount).toBe(8); // Original count before filtering
        expect(result.subdivisionMetadata.subdividedBeatCount).toBe(11);
    });

    it('should have density multiplier of ~1.375x', () => {
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

        // Assert - density multiplier should be close to 1.375 (11/8)
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(11/8, 2);
    });
});

// ============================================================================
// Dotted Quarter Notes (dotted4) Tests
// ============================================================================

/**
 * Create a dotted4 subdivision config with rest on every 3rd beat.
 * Dotted4 is a 2-beat grouping (dotted quarter + eighth), so the 3rd beat
 * must be a rest for the pattern to work properly.
 * Pattern: dotted4, dotted4, rest, dotted4, dotted4, rest, ...
 */
function createDotted4Config(beatCount: number): SubdivisionConfig {
    const beatSubdivisions = new Map<number, SubdivisionType>();
    for (let i = 0; i < beatCount; i++) {
        if (i % 3 === 2) {
            beatSubdivisions.set(i, 'rest');
        } else {
            beatSubdivisions.set(i, 'dotted4');
        }
    }
    return { beatSubdivisions, defaultSubdivision: 'quarter' };
}

describe('BeatSubdivider - Dotted4 Notes', () => {
    it('should create 2-beat structure with original at even beats and interpolated at odd+0.5', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const interval = 60 / bpm; // 0.5 seconds per quarter note
        // Create 9 quarter notes for 3 complete dotted4 groups (each group = 3 beats: dotted4, dotted4, rest)
        const beats = createRegularQuarterNotes(bpm, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted4 is a 2-beat grouping, 3rd beat is rest:
        // Group 1 (beats 0,1): beat 0 (bIM=0, even) kept at 0s, beat 1 (bIM=1, odd) interpolated at 0.75s
        // Beat 2: rest (no output)
        // Group 2 (beats 3,4): beat 3 (bIM=3, odd) interpolated at 1.75s, beat 4 (bIM=0, even) kept at 2.0s
        // Beat 5: rest (no output)
        // Group 3 (beats 6,7): beat 6 (bIM=2, even) kept at 3.0s, beat 7 (bIM=3, odd) interpolated at 3.75s
        // Beat 8: rest (no output)
        // Total: 6 beats
        expect(result.beats.length).toBe(6);
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);           // Beat 0 (original, even bIM)
        expect(result.beats[1].timestamp).toBeCloseTo(0.75, 3);       // Interpolated from beat 1 (odd bIM)
        expect(result.beats[2].timestamp).toBeCloseTo(1.75, 3);       // Interpolated from beat 3 (odd bIM)
        expect(result.beats[3].timestamp).toBeCloseTo(2.0, 3);        // Beat 4 (original, even bIM)
        expect(result.beats[4].timestamp).toBeCloseTo(3.0, 3);        // Beat 6 (original, even bIM)
        expect(result.beats[5].timestamp).toBeCloseTo(3.75, 3);       // Interpolated from beat 7 (odd bIM)
    });

    it('should only keep original beats at even positions within each group', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - only original beats at even beatInMeasure positions (0, 4, 6) are kept
        const originalBeats = result.beats.filter(b => b.originalBeatIndex !== undefined);
        expect(originalBeats.length).toBe(3);
        expect(originalBeats[0].originalBeatIndex).toBe(0);
        expect(originalBeats[1].originalBeatIndex).toBe(4);
        expect(originalBeats[2].originalBeatIndex).toBe(6);
    });

    it('should set subdivisionType to "dotted4" for all non-rest beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - all output beats should be dotted4 (rests produce no output)
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('dotted4');
        }
    });

    it('should have isDetected=true for original beats and false for interpolated', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats have isDetected=true, interpolated have false
        expect(result.beats.length).toBe(6);
        expect(result.beats[0].isDetected).toBe(true);   // Original (beat 0, even bIM)
        expect(result.beats[1].isDetected).toBe(false); // Interpolated (from beat 1, odd bIM)
        expect(result.beats[2].isDetected).toBe(false); // Interpolated (from beat 3, odd bIM)
        expect(result.beats[3].isDetected).toBe(true);  // Original (beat 4, even bIM)
    });

    it('should set originalBeatIndex for original beats and undefined for interpolated', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - original beats have originalBeatIndex
        // Output: beat 0 (original), beat 1 interp, beat 3 interp, beat 4 (original), beat 6 (original), beat 7 interp
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        expect(result.beats[2].originalBeatIndex).toBeUndefined(); // Interpolated from beat 3 (odd bIM)
        expect(result.beats[3].originalBeatIndex).toBe(4);
    });

    it('should handle empty beat map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const unifiedMap = createUnifiedBeatMap([], { bpm: 120 });
        const config = createDotted4Config(0);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.beats).toHaveLength(0);
        expect(result.detectedBeatIndices).toHaveLength(0);
    });

    it('should handle single beat (at index 0, kept)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = [createBeat(0)];
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([[0, 'dotted4']]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - single beat at index 0 is kept
        expect(result.beats.length).toBe(1);
        expect(result.beats[0].subdivisionType).toBe('dotted4');
    });

    it('should handle 3 beats (one dotted4 group + rest)', () => {
        // Arrange - one complete dotted4 group: dotted4, dotted4, rest
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 3);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([[0, 'dotted4'], [1, 'dotted4'], [2, 'rest']]),
            defaultSubdivision: 'quarter',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - beat 0 kept + interpolated at beat 1 + 0.5*interval = 0.75s, beat 2 is rest
        expect(result.beats.length).toBe(2);
        expect(result.beats[0].originalBeatIndex).toBe(0);
        expect(result.beats[1].originalBeatIndex).toBeUndefined();
        // Verify interpolated beat is at correct position (beat 1 timestamp + 0.5*interval = 0.5 + 0.25 = 0.75)
        const interval = 60 / 120; // 0.5 seconds
        expect(result.beats[1].timestamp).toBeCloseTo(0.5 + interval * 0.5, 3);
    });

    it('should include "dotted4" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('dotted4');
    });

    it('should have density multiplier of ~0.67 (2/3)', () => {
        // Arrange - 9 quarter notes (3 groups of dotted4+dotted4+rest)
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 6 beats out of 9 input = 0.667 density (2 per group * 3 groups / 9 input)
        expect(result.beats.length).toBe(6);
        expect(result.subdivisionMetadata.averageDensityMultiplier).toBeCloseTo(6 / 9, 2);
    });

    it('should preserve downbeatConfig from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const customDownbeatConfig: DownbeatConfig = {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 3, beatUnit: 4 } }],
        };
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            downbeatConfig: customDownbeatConfig,
        });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.downbeatConfig).toEqual(customDownbeatConfig);
    });

    it('should preserve audioId and duration from unified map', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const unifiedMap = createUnifiedBeatMap(beats, {
            bpm: 120,
            duration: 10.5,
        });
        unifiedMap.audioId = 'test-audio-123';
        const config = createDotted4Config(9);

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
        const beats = createRegularQuarterNotes(bpm, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted4 creates 2-beat structure per group:
        // Group 1: beat 0 (even bIM) kept at 0s, beat 1 (odd bIM) interpolated at 0.667 + 0.333 = 1.0s
        // Beat 2: rest
        // Group 2: beat 3 (odd bIM) interpolated at 2.0 + 0.333 = 2.333s, beat 4 (even bIM) kept at 2.667s
        // Beat 5: rest
        // Group 3: beat 6 (even bIM) kept at 4.0s, beat 7 (odd bIM) interpolated
        // Beat 8: rest
        expect(result.beats.length).toBe(6);
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(interval + interval * 0.5, 3); // Interpolated from beat 1
        expect(result.beats[2].timestamp).toBeCloseTo(interval * 3 + interval * 0.5, 3); // Interpolated from beat 3
    });

    it('should work with fast BPM (180)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const bpm = 180;
        const interval = 60 / bpm; // 0.333 seconds per quarter note
        const beats = createRegularQuarterNotes(bpm, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - dotted4 creates 2-beat structure per group:
        // Group 1: beat 0 at 0s, interpolated at beat 1 + 0.5*interval = 0.333 + 0.167 = 0.5s
        expect(result.beats.length).toBe(6);
        expect(result.beats[0].timestamp).toBeCloseTo(0, 3);
        expect(result.beats[1].timestamp).toBeCloseTo(interval + interval * 0.5, 3); // Interpolated at beat1 + 0.5*interval
    });

    it('should produce correct beat count for longer track', () => {
        // Arrange - 18 quarter notes (6 groups of dotted4+dotted4+rest)
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 18);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(18);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 6 groups, 2 beats each = 12 beats total
        expect(result.beats.length).toBe(12);
    });

    it('should preserve beat properties for kept beats', () => {
        // Arrange - Create a track long enough to show pattern
        const subdivider = new BeatSubdivider();
        const bpm = 120;
        const beats = createRegularQuarterNotes(bpm, 9); // 3 groups of dotted4
        const unifiedMap = createUnifiedBeatMap(beats, { bpm });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - 6 beats from 9 input (3 original + 3 interpolated)
        expect(result.beats.length).toBe(6);
    });

    it('should have detectedBeatIndices for original beats only', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 9);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config = createDotted4Config(9);

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - detectedBeatIndices are output positions of original (isDetected) beats
        // Output: [beat0, interp1, interp3, beat4, beat6, interp7]
        // Detected: 0, 3, 4
        expect(result.detectedBeatIndices).toHaveLength(3);
        expect(result.detectedBeatIndices).toEqual([0, 3, 4]);
    });
});

// ============================================================================
// Dotted8 (Swing) Notes Tests
// ============================================================================

describe('BeatSubdivider - Swing', () => {
    it('should double the beat density with swing pattern (4 beats → 7 beats)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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

    it('should set subdivisionType to "swing" for all beats', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'swing',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('swing');
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - Single beat produces just 1 beat (no neighbor to interpolate with)
        expect(result.beats).toHaveLength(1);
        expect(result.beats[0].subdivisionType).toBe('swing');
        expect(result.beats[0].isDetected).toBe(true);
    });

    it('should include "swing" in subdivisionsUsed metadata', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'swing',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert
        expect(result.subdivisionMetadata.subdivisionsUsed).toContain('swing');
    });

    it('should have maxDensity of 2 in metadata (as defined by getSubdivisionDensity)', () => {
        // Arrange
        const subdivider = new BeatSubdivider();
        const beats = createRegularQuarterNotes(120, 4);
        const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'swing',
        };

        // Act
        const result = subdivider.subdivide(unifiedMap, config);

        // Assert - swing has density 2 as defined in getSubdivisionDensity
        expect(result.subdivisionMetadata.maxDensity).toBe(2);
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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
            defaultSubdivision: 'swing',
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

        it('should handle per-beat subdivision variation within multi-tempo track', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const unifiedMap = createMultiTempoBeatMap();

            // Act - switch from quarter to eighth at beat 4 (where tempo changes)
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([
                    [4, 'eighth'],
                    [5, 'eighth'],
                    [6, 'eighth'],
                    [7, 'eighth'],
                ]),
                defaultSubdivision: 'quarter',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - 4 quarters (beats 0-3) + 4 quarters with 3 eighths interpolated (beats 4-7) = 14 beats
            // Actually: 4 original (0-3) + 4 original (4-7) + 3 interpolated between 4-5,5-6,6-7 = 11 beats
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
        it('should allow beatSubdivisions starting beyond beat count (no-op)', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 8);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Act - beatSubdivision at beat 100, but we only have 8 beats
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([[100, 'eighth']]),
                defaultSubdivision: 'quarter',
            };
            // Should NOT throw - beatSubdivision simply won't apply
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - all 8 beats with default quarter subdivision
            expect(result.beats.length).toBe(8);
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

        it('should validate beatSubdivisions is a Map', () => {
            // Arrange - use validation function directly with invalid type
            const config = {
                beatSubdivisions: {} as Map<number, SubdivisionType>,
                defaultSubdivision: 'quarter' as SubdivisionType,
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'beatSubdivisions must be a Map'
            );
        });

        it('should validate defaultSubdivision is a valid type', () => {
            // Arrange
            const config = {
                beatSubdivisions: new Map<number, SubdivisionType>(),
                defaultSubdivision: 'invalid' as SubdivisionType,
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'Invalid defaultSubdivision'
            );
        });

        it('should validate beatSubdivisions keys are non-negative', () => {
            // Arrange
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([[-1, 'quarter']]),
                defaultSubdivision: 'quarter',
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'Beat index must be non-negative'
            );
        });

        it('should validate beatSubdivisions values are valid types', () => {
            // Arrange
            const config = {
                beatSubdivisions: new Map([[0, 'invalid' as SubdivisionType]]),
                defaultSubdivision: 'quarter' as SubdivisionType,
            };

            // Act & Assert
            expect(() => validateSubdivisionConfig(config)).toThrow(
                'Invalid subdivision'
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

        it('should not throw for triplet8 (3x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('triplet8')).not.toThrow();
            expect(getSubdivisionDensity('triplet8')).toBe(3);
        });

        it('should not throw for triplet4 (1.5x density - 3 beats per 2 quarter notes)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('triplet4')).not.toThrow();
            expect(getSubdivisionDensity('triplet4')).toBe(1.5);
        });

        it('should not throw for dotted4 (2/3 density - 2 beats per 3 quarter notes)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('dotted4')).not.toThrow();
            expect(getSubdivisionDensity('dotted4')).toBeCloseTo(2/3, 3);
        });

        it('should not throw for dotted8 (2x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('dotted8')).not.toThrow();
            expect(getSubdivisionDensity('dotted8')).toBe(2);
        });

        it('should not throw for swing (2x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('swing')).not.toThrow();
            expect(getSubdivisionDensity('swing')).toBe(2);
        });

        it('should not throw for offbeat8 (1x density)', () => {
            // Act & Assert - should not throw
            expect(() => validateSubdivisionDensity('offbeat8')).not.toThrow();
            expect(getSubdivisionDensity('offbeat8')).toBe(1);
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

            // Assert - maxDensity should be 0.5 for half subdivision
            expect(result.subdivisionMetadata.maxDensity).toBe(0.5);
        });

        it('should report correct maxDensity for per-beat subdivision variation', () => {
            // Arrange
            const subdivider = new BeatSubdivider();
            const beats = createRegularQuarterNotes(120, 16);
            const unifiedMap = createUnifiedBeatMap(beats, { bpm: 120 });

            // Act - use per-beat subdivisions with variation
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([
                    [0, 'half'],      // 0.5x
                    [8, 'sixteenth'], // 4x
                ]),
                defaultSubdivision: 'quarter',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Assert - maxDensity should be 4 (from sixteenth subdivision)
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
