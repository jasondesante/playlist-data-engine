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
    BeatMapMetadata,
    DownbeatConfig,
} from '../../../src/core/types/BeatMap.js';
import {
    DEFAULT_DOWNBEAT_CONFIG,
    DEFAULT_SUBDIVISION_CONFIG,
    BEAT_DETECTION_VERSION,
    BEAT_DETECTION_ALGORITHM,
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
            segments: [{ startBeat: 0, subdivision: 'quarter' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
            segments: [{ startBeat: 0, subdivision: 'half' }],
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
