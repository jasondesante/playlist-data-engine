/**
 * API Integration Tests for Level Generation
 *
 * Tests the complete public API workflow for level generation:
 * 1. LevelGenerator generates levels
 * 2. LevelSerializer exports to FullBeatMapExportData format
 * 3. LevelSerializer imports back to GeneratedLevel
 * 4. Data is preserved through round-trip
 *
 * Part of Phase 4.3 - API Integration Tests
 *
 * Note: Backward compatibility tests are covered in LevelSerializer.compatibility.test.ts
 */

import { describe, it, expect } from 'vitest';
import { LevelGenerator } from '../../src/core/generation/LevelGenerator.js';
import { LevelSerializer } from '../../src/core/analysis/LevelSerializer.js';
import type { UnifiedBeatMap, Beat } from '../../src/core/types/BeatMap.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock AudioBuffer with synthesized audio containing pitch changes
 */
function createMockAudioBufferWithPitch(
    durationSeconds: number = 3.0,
    sampleRate: number = 44100,
    numberOfChannels: number = 1
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [];

    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        const beatInterval = 0.5; // 120 BPM

        // Create frequency-swept audio with transients
        const frequencies = [
            440, 494, 523, 587, 659, 587, 523, 494,
            440, 392, 349, 330, 349, 392, 440, 494,
            523, 523, 440, 440, 392, 392, 349, 349,
        ];

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const beatIndex = Math.floor(t / beatInterval);
            const freqIndex = beatIndex % frequencies.length;
            const baseFreq = frequencies[freqIndex];

            data[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;

            if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
                data[i] = 1.0;
            }
        }
        channelData.push(data);
    }

    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels,
        getChannelData: (channel: number) => channelData[channel] ?? channelData[0],
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getAudioData: () => channelData[0],
    } as AudioBuffer;
}

/**
 * Create a mock UnifiedBeatMap for testing
 */
function createMockUnifiedBeatMap(
    duration: number = 3.0,
    bpm: number = 120
): UnifiedBeatMap {
    const quarterNoteInterval = 60 / bpm;
    const numBeats = Math.floor(duration / quarterNoteInterval);
    const beats: Beat[] = [];

    for (let i = 0; i < numBeats; i++) {
        const timestamp = i * quarterNoteInterval;
        beats.push({
            timestamp,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            intensity: 0.8,
            confidence: 0.9,
        });
    }

    return {
        audioId: 'test-audio-id-api',
        duration,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        quarterNoteInterval,
        quarterNoteBpm: bpm,
        downbeatConfig: {
            segments: [{ startBeat: 0, timeSignature: { beatsPerMeasure: 4, beatUnit: 4 } }],
        },
        originalMetadata: {
            version: '1.0.0',
            algorithm: 'test',
            minBpm: bpm,
            maxBpm: bpm,
            sensitivity: 1.0,
            filter: 0.5,
            noiseFloorThreshold: 0.01,
            hopSizeMs: 10,
            fftSize: 2048,
            dpAlpha: 0.5,
            melBands: 40,
            highPassCutoff: 80,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 0.5,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        },
    };
}

// =============================================================================
// API Integration Tests
// =============================================================================

describe('Level Generation API Integration Tests', () => {
    describe('Full API Workflow: Generate → Serialize → Deserialize', () => {
        it('should complete the full workflow for DDR mode', async () => {
            // Step 1: Generate level
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0.8 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const generatedLevel = await generator.generate(audioBuffer, unifiedBeatMap);

            // Verify generation succeeded
            expect(generatedLevel).toBeDefined();
            expect(generatedLevel.chart.beats.length).toBeGreaterThan(0);

            // Step 2: Serialize to export format
            const exportData = LevelSerializer.toExportData(generatedLevel);

            // Verify export data structure
            expect(exportData).toBeDefined();
            expect(exportData.audioId).toBe('test-audio-id-api');
            expect(exportData.duration).toBe(3.0);
            expect(exportData.detectedBeats).toBeDefined();
            expect(exportData.mergedBeats).toBeDefined();
            expect(exportData.chart).toBeDefined();
            expect(exportData.generationSource).toBe('procedural');

            // Step 3: Serialize to JSON
            const json = LevelSerializer.toJSON(generatedLevel);
            expect(json).toBeDefined();
            expect(typeof json).toBe('string');

            // Step 4: Deserialize from JSON
            const parsed = JSON.parse(json);
            const validationResult = LevelSerializer.validate(parsed);
            expect(validationResult.success).toBe(true);

            const importedLevel = LevelSerializer.fromJSON(json);
            expect(importedLevel).toBeDefined();
            expect(importedLevel.chart.beats.length).toBe(generatedLevel.chart.beats.length);

            console.log('\n✓ Full DDR workflow completed');
            console.log(`  Generated: ${generatedLevel.chart.beats.length} beats`);
            console.log(`  Export data audioId: ${exportData.audioId}`);
            console.log(`  Import success: ${importedLevel.chart.beats.length} beats`);
        });

        it('should complete the full workflow for Guitar Hero mode', async () => {
            const generator = new LevelGenerator({
                difficulty: 'hard',
                controllerMode: 'guitar_hero',
                buttons: { pitchInfluenceWeight: 1.0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const generatedLevel = await generator.generate(audioBuffer, unifiedBeatMap);

            // Serialize and deserialize
            const exportData = LevelSerializer.toExportData(generatedLevel);
            const json = LevelSerializer.toJSON(generatedLevel);
            const importedLevel = LevelSerializer.fromJSON(json);

            // Verify Guitar Hero specific data
            expect(importedLevel.metadata.controllerMode).toBe('guitar_hero');
            expect(importedLevel.metadata.buttonMetadata.keysUsed.every(k => [1, 2, 3, 4, 5].includes(Number(k)))).toBe(true);

            console.log('\n✓ Full Guitar Hero workflow completed');
            console.log(`  Keys used: ${importedLevel.metadata.buttonMetadata.keysUsed.join(', ')}`);
        });

        it('should handle all three difficulties via generateAllDifficulties', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const allLevels = await generator.generateAllDifficulties(audioBuffer, unifiedBeatMap);

            // Verify all difficulties were generated
            expect(allLevels.easy).toBeDefined();
            expect(allLevels.medium).toBeDefined();
            expect(allLevels.hard).toBeDefined();

            // Serialize each
            for (const [difficulty, level] of Object.entries(allLevels)) {
                const exportData = LevelSerializer.toExportData(level);
                expect(exportData).toBeDefined();
                expect(exportData.generationSource).toBe('procedural');

                const json = LevelSerializer.toJSON(level);
                const imported = LevelSerializer.fromJSON(json);
                expect(imported.metadata.difficulty).toBe(difficulty);
            }

            console.log('\n✓ All difficulties workflow completed');
            console.log(`  Easy: ${allLevels.easy.chart.beats.length} beats`);
            console.log(`  Medium: ${allLevels.medium.chart.beats.length} beats`);
            console.log(`  Hard: ${allLevels.hard.chart.beats.length} beats`);
        });
    });

    describe('Serialization Round-Trip Tests', () => {
        it('should preserve beat timestamps through round-trip', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const json = LevelSerializer.toJSON(original);
            const restored = LevelSerializer.fromJSON(json);

            // Compare timestamps
            expect(restored.chart.beats.length).toBe(original.chart.beats.length);

            for (let i = 0; i < original.chart.beats.length; i++) {
                expect(restored.chart.beats[i].timestamp).toBeCloseTo(
                    original.chart.beats[i].timestamp,
                    0.001,
                    `Beat ${i} timestamp mismatch`
                );
            }

            console.log('\n✓ Beat timestamps preserved through round-trip');
        });

        it('should preserve key assignments through round-trip', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const json = LevelSerializer.toJSON(original);
            const restored = LevelSerializer.fromJSON(json);

            // Compare key assignments
            const originalKeys = original.chart.beats
                .filter(b => b.requiredKey !== undefined)
                .map(b => b.requiredKey);
            const restoredKeys = restored.chart.beats
                .filter(b => b.requiredKey !== undefined)
                .map(b => b.requiredKey);

            expect(restoredKeys.length).toBe(originalKeys.length);

            console.log('\n✓ Key assignments preserved through round-trip');
            console.log(`  Original keys: ${originalKeys.length}`);
            console.log(`  Restored keys: ${restoredKeys.length}`);
        });

        it('should preserve metadata through round-trip', async () => {
            const generator = new LevelGenerator({
                difficulty: 'hard',
                controllerMode: 'guitar_hero',
                buttons: { pitchInfluenceWeight: 0.9 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const json = LevelSerializer.toJSON(original);
            const restored = LevelSerializer.fromJSON(json);

            // Compare metadata
            expect(restored.metadata.difficulty).toBe(original.metadata.difficulty);
            expect(restored.metadata.controllerMode).toBe(original.metadata.controllerMode);
            expect(restored.metadata.buttonMetadata.keysUsed.sort()).toEqual(
                original.metadata.buttonMetadata.keysUsed.sort()
            );

            console.log('\n✓ Metadata preserved through round-trip');
        });

        it('should preserve rhythm data through round-trip', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const json = LevelSerializer.toJSON(original);
            const restored = LevelSerializer.fromJSON(json);

            // Compare rhythm metadata - check variant beats are preserved
            expect(restored.rhythm.difficultyVariants.medium.beats.length).toBe(
                original.rhythm.difficultyVariants.medium.beats.length
            );

            // Check that composite stream is preserved
            expect(restored.rhythm.composite.beats.length).toBe(
                original.rhythm.composite.beats.length
            );

            console.log('\n✓ Rhythm data preserved through round-trip');
            console.log(`  Medium variant beats: ${restored.rhythm.difficultyVariants.medium.beats.length}`);
        });

        it('should preserve pitch metadata when pitchInfluenceWeight > 0', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 1.0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(3.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const json = LevelSerializer.toJSON(original);
            const restored = LevelSerializer.fromJSON(json);

            // If original had pitch metadata, restored should too
            if (original.metadata.pitchMetadata) {
                expect(restored.metadata.pitchMetadata).toBeDefined();
                expect(restored.metadata.pitchMetadata?.directionStats).toEqual(
                    original.metadata.pitchMetadata?.directionStats
                );
            }

            console.log('\n✓ Pitch metadata preserved through round-trip');
        });

        it('should preserve null pitch metadata when pitchInfluenceWeight = 0', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
                buttons: { pitchInfluenceWeight: 0 },
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);
            const json = LevelSerializer.toJSON(original);
            const restored = LevelSerializer.fromJSON(json);

            // Both should have null pitch metadata
            expect(original.metadata.pitchMetadata).toBeNull();
            expect(restored.metadata.pitchMetadata).toBeNull();

            console.log('\n✓ Null pitch metadata preserved through round-trip');
        });

        it('should preserve export data through export → import → export cycle', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const original = await generator.generate(audioBuffer, unifiedBeatMap);

            // Export → Import → Export
            const export1 = LevelSerializer.toExportData(original);
            const imported = LevelSerializer.fromExportData(export1);
            const export2 = LevelSerializer.toExportData(imported);

            // Key fields should be identical
            expect(export2.audioId).toBe(export1.audioId);
            expect(export2.duration).toBe(export1.duration);
            expect(export2.generationSource).toBe(export1.generationSource);
            expect(export2.chart?.usedKeys.sort()).toEqual(export1.chart?.usedKeys.sort());

            console.log('\n✓ Export data preserved through export → import → export cycle');
        });
    });

    describe('Error Handling', () => {
        it('should reject invalid JSON with clear error', () => {
            const invalidJson = '{"audioId": "test", invalid}';

            expect(() => LevelSerializer.fromJSON(invalidJson)).toThrow();
        });

        it('should validate and reject data with missing required fields', () => {
            const invalidData = {
                audioId: 'test',
                // Missing version, format, duration, detectedBeats, etc.
            };

            const result = LevelSerializer.validate(invalidData);
            expect(result.success).toBe(false);
        });

        it('should validate correct data successfully', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(2.0);

            const level = await generator.generate(audioBuffer, unifiedBeatMap);
            const exportData = LevelSerializer.toExportData(level);

            const result = LevelSerializer.validate(exportData);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });
    });

    describe('Performance', () => {
        it('should serialize and deserialize efficiently for longer audio', async () => {
            const generator = new LevelGenerator({
                difficulty: 'medium',
                controllerMode: 'ddr',
            });

            const audioBuffer = createMockAudioBufferWithPitch(10.0);
            const unifiedBeatMap = createMockUnifiedBeatMap(10.0);

            const startGenerate = Date.now();
            const level = await generator.generate(audioBuffer, unifiedBeatMap);
            const generateTime = Date.now() - startGenerate;

            const startSerialize = Date.now();
            const json = LevelSerializer.toJSON(level);
            const serializeTime = Date.now() - startSerialize;

            const startDeserialize = Date.now();
            const restored = LevelSerializer.fromJSON(json);
            const deserializeTime = Date.now() - startDeserialize;

            // Should complete in reasonable time
            expect(serializeTime).toBeLessThan(1000); // < 1 second
            expect(deserializeTime).toBeLessThan(1000); // < 1 second

            // Data should be preserved
            expect(restored.chart.beats.length).toBe(level.chart.beats.length);

            console.log('\n✓ Performance test passed');
            console.log(`  10s audio: ${level.chart.beats.length} beats`);
            console.log(`  Generate: ${generateTime}ms`);
            console.log(`  Serialize: ${serializeTime}ms`);
            console.log(`  Deserialize: ${deserializeTime}ms`);
        });
    });
});
