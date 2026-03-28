/**
 * Unit tests for PitchBeatLinker
 *
 * Tests the pitch beat linking functionality including:
 * - Configuration validation
 * - Composite stream pitch detection
 * - Variant pitch derivation
 */

import { describe, it, expect } from 'vitest';
import {
    PitchBeatLinker,
    type PitchBandName,
} from './PitchBeatLinker.js';
import type { DifficultyVariant } from '../analysis/beat/DifficultyVariantGenerator.js';
import type { CompositeStream } from '../analysis/beat/CompositeStreamGenerator.js';

describe('PitchBeatLinker', () => {
    // Helper to create a sine wave at a specific frequency
    function createSineWave(
        frequency: number,
        durationSeconds: number,
        sampleRate: number = 44100
    ): Float32Array {
        const length = Math.floor(durationSeconds * sampleRate);
        const data = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            data[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate);
        }
        return data;
    }

    // Helper to create a mock AudioBuffer
    function createMockAudioBuffer(
        data: Float32Array,
        sampleRate: number = 44100
    ): AudioBuffer {
        return {
            length: data.length,
            duration: data.length / sampleRate,
            sampleRate,
            numberOfChannels: 1,
            getChannelData: (_channel: number) => data,
        } as unknown as AudioBuffer;
    }

    // Helper to create mock composite stream
    function createMockCompositeStream(
        beats: Array<{ beatIndex: number; timestamp: number; sourceBand: PitchBandName }>
    ): CompositeStream {
        return {
            beats: beats.map(b => ({
                ...b,
                gridPosition: 0,
                gridType: 'straight_16th' as const,
                intensity: 0.8,
                band: b.sourceBand,
                sourceBand: b.sourceBand,
            })),
            sections: [
                {
                    beatRange: { start: beats[0]?.beatIndex ?? 0, end: beats[beats.length - 1]?.beatIndex ?? 0 },
                    sourceBand: beats[0]?.sourceBand ?? 'mid',
                    score: 1,
                    margin: 0.5,
                },
            ],
            naturalDifficulty: 'medium',
            quarterNoteInterval: 0.5,
            metadata: {
                totalBeats: beats.length,
                sectionCount: 1,
                beatsPerBand: { low: 0, mid: 0, high: 0 },
                sectionsPerBand: { low: 0, mid: 0, high: 0 },
            },
        };
    }

    // Helper to create mock difficulty variant
    function createMockDifficultyVariant(
        difficulty: 'easy' | 'medium' | 'hard',
        beats: Array<{ beatIndex: number; timestamp: number; sourceBand: PitchBandName }>
    ): DifficultyVariant {
        return {
            difficulty,
            beats: beats.map(b => ({
                ...b,
                beatIndex: b.beatIndex,
                timestamp: b.timestamp,
                gridPosition: 0,
                gridType: 'straight_16th' as const,
                intensity: 0.8,
                band: b.sourceBand,
                sourceBand: b.sourceBand,
            })),
            isUnedited: true,
            editType: 'none',
            editAmount: 0,
        };
    }

    describe('Constructor and Configuration', () => {
        it('should create linker with default configuration', async () => {
            const linker = new PitchBeatLinker();
            const config = linker.getConfig();

            expect(config.targetSampleRate).toBe(44100);
            expect(config.pitchDetector).toBeDefined();
        });

        it('should use pitch_melodia as default algorithm', async () => {
            const linker = new PitchBeatLinker();
            const config = linker.getConfig();

            expect(config.pitchAlgorithm).toBe('pitch_melodia');
        });

        it('should allow custom configuration', async () => {
            const linker = new PitchBeatLinker({
                targetSampleRate: 22050,
                pitchAlgorithm: 'pyin_legacy',
            });

            const config = linker.getConfig();
            expect(config.targetSampleRate).toBe(22050);
            expect(config.pitchAlgorithm).toBe('pyin_legacy');
        });

        it('should pass pitch detector config through', async () => {
            const linker = new PitchBeatLinker({
                pitchDetector: {
                    voicingThreshold: 0.7,
                    frameSize: 4096,
                },
            });

            const config = linker.getConfig();
            expect(config.pitchDetector.voicingThreshold).toBe(0.7);
            expect(config.pitchDetector.frameSize).toBe(4096);
        });
    });

    describe('linkWithComposite', () => {
        it('should return PitchAtBeat[] for composite stream beats', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(compositeStream, audioBuffer);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
        });

        it('should preserve sourceBand in band field', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(compositeStream, audioBuffer);

            expect(result[0].band).toBe('mid');
            expect(result[1].band).toBe('low');
        });

        it('should detect pitch directly from audio for each composite beat timestamp', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'high' },
            ]);

            const signal = createSineWave(440, 2.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(compositeStream, audioBuffer);

            expect(result).toHaveLength(2);
            expect(result[0].pitch).toBeDefined();
            expect(result[0].beatIndex).toBe(0);
            expect(result[1].pitch).toBeDefined();
            expect(result[1].beatIndex).toBe(1);
        });

        it('should initialize direction as "none" and intervalFromPrevious as 0', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(compositeStream, audioBuffer);

            expect(result[0].direction).toBe('none');
            expect(result[0].intervalFromPrevious).toBe(0);
            expect(result[0].intervalCategory).toBeUndefined();
        });

        it('should handle empty composite stream', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([]);
            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);

            const result = await linker.linkWithComposite(compositeStream, audioBuffer);

            expect(result).toHaveLength(0);
        });
    });

    describe('Variant Pitch Derivation', () => {
        it('should derive variant pitches from composite pitches', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const compositePitches = await linker.linkWithComposite(compositeStream, audioBuffer);

            const easyVariant = createMockDifficultyVariant('easy', [
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
            ]);

            const easyPitches = linker.deriveVariantPitches(easyVariant, compositePitches);

            expect(easyPitches).toHaveLength(1);
            expect(easyPitches[0].timestamp).toBe(0.5);
            expect(easyPitches[0].band).toBe('mid');
            expect(easyPitches[0].pitch).toBeDefined();
        });

        it('should derive variant pitches for hard variant (all beats)', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const compositePitches = await linker.linkWithComposite(compositeStream, audioBuffer);

            const hardVariant = createMockDifficultyVariant('hard', compositeStream.beats);
            const hardPitches = linker.deriveVariantPitches(hardVariant, compositePitches);

            expect(hardPitches).toHaveLength(3);
            expect(hardPitches[0].timestamp).toBe(0.5);
            expect(hardPitches[0].band).toBe('mid');
            expect(hardPitches[0].pitch).toBeDefined();
        });

        it('should derive all variant pitches at once', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
                { beatIndex: 1, timestamp: 1.0, sourceBand: 'mid' },
                { beatIndex: 2, timestamp: 1.5, sourceBand: 'low' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const compositePitches = await linker.linkWithComposite(compositeStream, audioBuffer);

            const allVariantPitches = linker.deriveAllVariantPitches(
                {
                    easy: createMockDifficultyVariant('easy', [compositeStream.beats[0]]),
                    medium: createMockDifficultyVariant('medium', compositeStream.beats),
                    hard: createMockDifficultyVariant('hard', compositeStream.beats),
                },
                compositePitches
            );

            expect(allVariantPitches.easy).toHaveLength(1);
            expect(allVariantPitches.medium).toHaveLength(3);
            expect(allVariantPitches.hard).toHaveLength(3);
            expect(allVariantPitches.easy[0].band).toBe('mid');
            expect(allVariantPitches.hard[2].band).toBe('low');
        });

        it('should return null pitch for variant beat with no matching composite timestamp', async () => {
            const linker = new PitchBeatLinker({ pitchAlgorithm: 'pyin_legacy' });

            const compositeStream = createMockCompositeStream([
                { beatIndex: 0, timestamp: 0.5, sourceBand: 'mid' },
            ]);

            const signal = createSineWave(440, 5.0);
            const audioBuffer = createMockAudioBuffer(signal);
            const compositePitches = await linker.linkWithComposite(compositeStream, audioBuffer);

            const variant = createMockDifficultyVariant('easy', [
                { beatIndex: 0, timestamp: 2.0, sourceBand: 'mid' },
            ]);

            const variantPitches = linker.deriveVariantPitches(variant, compositePitches);

            expect(variantPitches).toHaveLength(1);
            expect(variantPitches[0].pitch).toBeNull();
            expect(variantPitches[0].direction).toBe('none');
            expect(variantPitches[0].intervalFromPrevious).toBe(0);
        });
    });
});
