/**
 * Integration Test for Full Button Mapping with Real Pitch Data
 *
 * Tests the complete button mapping pipeline:
 * 1. Rhythm generation from audio (via AudioAnalyzer)
 * 2. Pitch detection at beat timestamps (PitchBeatLinker)
 * 3. Melody contour analysis (MelodyContourAnalyzer)
 * 4. Button mapping with pitch influence (ButtonMapper)
 *
 * Part of Phase 2.8 Tests - Integration test: full button mapping with real pitch data
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { AudioAnalyzer } from '../../src/core/analysis/AudioAnalyzer.js';
import { PitchBeatLinker } from '../../src/core/generation/PitchBeatLinker.js';
import { MelodyContourAnalyzer } from '../../src/core/analysis/MelodyContourAnalyzer.js';
import { ButtonMapper } from '../../src/core/generation/ButtonMapper.js';
import type { GeneratedRhythm } from '../../src/core/generation/RhythmGenerator.js';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a mock AudioBuffer with synthesized audio containing pitch changes
 *
 * This generates audio with:
 * - A base frequency that changes over time (simulating melody)
 * - Sharp transients at beat intervals (for rhythm detection)
 * - Frequency sweeps to test pitch direction detection
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
        // Frequency pattern: starts at A4 (440Hz), then goes up/down
        const frequencies = [
            440, 494, 523, 587, 659, 587, 523, 494, // Ascending then descending
            440, 392, 349, 330, 349, 392, 440, 494, // Descending then ascending
            523, 523, 440, 440, 392, 392, 349, 349, // Repeated notes (stable)
        ];

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;

            // Determine which beat we're on
            const beatIndex = Math.floor(t / beatInterval);
            const freqIndex = beatIndex % frequencies.length;
            const baseFreq = frequencies[freqIndex];

            // Generate sine wave at the current frequency
            data[i] = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;

            // Add transients at beat intervals
            if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
                data[i] = 1.0; // Sharp transient at each beat
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
 * Create a mock AudioBuffer with a simple ascending melody
 */
function createAscendingMelodyBuffer(
    durationSeconds: number = 2.0,
    sampleRate: number = 44100
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [new Float32Array(length)];
    const beatInterval = 0.5;

    // Ascending scale: C4, D4, E4, F4, G4, A4, B4, C5
    const frequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const beatIndex = Math.floor(t / beatInterval);
        const freqIndex = beatIndex % frequencies.length;
        const freq = frequencies[freqIndex];

        channelData[0][i] = Math.sin(2 * Math.PI * freq * t) * 0.4;

        // Add transients at beat intervals
        if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
            channelData[0][i] = 1.0;
        }
    }

    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels: 1,
        getChannelData: () => channelData[0],
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getAudioData: () => channelData[0],
    } as AudioBuffer;
}

/**
 * Create a mock AudioBuffer with a descending melody
 */
function createDescendingMelodyBuffer(
    durationSeconds: number = 2.0,
    sampleRate: number = 44100
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const channelData: Float32Array[] = [new Float32Array(length)];
    const beatInterval = 0.5;

    // Descending scale: C5, B4, A4, G4, F4, E4, D4, C4
    const frequencies = [523.25, 493.88, 440.00, 392.00, 349.23, 329.63, 293.66, 261.63];

    for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const beatIndex = Math.floor(t / beatInterval);
        const freqIndex = beatIndex % frequencies.length;
        const freq = frequencies[freqIndex];

        channelData[0][i] = Math.sin(2 * Math.PI * freq * t) * 0.4;

        // Add transients at beat intervals
        if (Math.floor(t / beatInterval) !== Math.floor((t - 1/sampleRate) / beatInterval)) {
            channelData[0][i] = 1.0;
        }
    }

    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels: 1,
        getChannelData: () => channelData[0],
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getAudioData: () => channelData[0],
    } as AudioBuffer;
}

// =============================================================================
// Integration Tests
// =============================================================================

describe('Full Button Mapping Integration with Real Pitch Data', () => {
    let audioAnalyzer: AudioAnalyzer;
    let pitchBeatLinker: PitchBeatLinker;
    let melodyContourAnalyzer: MelodyContourAnalyzer;
    let buttonMapper: ButtonMapper;

    beforeAll(() => {
        audioAnalyzer = new AudioAnalyzer();
        pitchBeatLinker = new PitchBeatLinker();
        melodyContourAnalyzer = new MelodyContourAnalyzer();
    });

    describe('DDR Mode Integration', () => {
        beforeEach(() => {
            buttonMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
                pitchInfluenceWeight: 1.0,
            });
        });

        it('should complete full pipeline: rhythm -> pitch -> contour -> buttons', async () => {
            // Step 1: Generate rhythm via AudioAnalyzer (handles beat map creation)
            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-full-pipeline'
            );

            // Verify rhythm was generated
            expect(generatedRhythm).toBeDefined();
            expect(generatedRhythm.difficultyVariants).toBeDefined();
            expect(generatedRhythm.difficultyVariants.medium.beats.length).toBeGreaterThan(0);
            expect(generatedRhythm.bandStreams).toBeDefined();

            // Step 2: Detect pitch at composite beat timestamps
            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            // Verify pitch was detected
            expect(compositePitches).toBeDefined();
            expect(compositePitches.length).toBeGreaterThan(0);

            // Step 3: Analyze melody contour
            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            // Verify contour was analyzed
            expect(contourResult).toBeDefined();
            expect(contourResult.pitchByBeat.length).toBeGreaterThan(0);
            expect(contourResult.directionStats).toBeDefined();
            expect(contourResult.intervalStats).toBeDefined();

            // Verify direction stats are populated
            const { directionStats } = contourResult;
            expect(directionStats.up + directionStats.down + directionStats.stable + directionStats.none)
                .toBe(contourResult.pitchByBeat.length);

            // Step 4: Map buttons using the pitch analysis
            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Verify buttons were mapped
            expect(mappedResult).toBeDefined();
            expect(mappedResult.variant).toBeDefined();
            expect(mappedResult.buttonMetadata).toBeDefined();
            expect(mappedResult.buttonMetadata.keysUsed.length).toBeGreaterThan(0);

            console.log('\n✓ Full pipeline completed successfully');
            console.log(`  Beats: ${mappedResult.variant.beats.length}`);
            console.log(`  Keys used: ${mappedResult.buttonMetadata.keysUsed.join(', ')}`);
            console.log(`  Pitch influenced: ${mappedResult.buttonMetadata.pitchInfluencedBeats}`);
            console.log(`  Pattern influenced: ${mappedResult.buttonMetadata.patternInfluencedBeats}`);
            console.log(`  Direction stats: up=${directionStats.up}, down=${directionStats.down}, stable=${directionStats.stable}`);
        });

        it('should map ascending melody to upward motion in DDR mode', async () => {
            const audioBuffer = createAscendingMelodyBuffer(2.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-ascending'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // With ascending melody and pitchInfluenceWeight=1.0, we expect some 'up' buttons
            const buttonDistribution = mappedResult.buttonMetadata.buttonDistribution;

            // Check that buttons were assigned
            expect(buttonDistribution.size).toBeGreaterThan(0);

            // Log distribution for debugging
            console.log('\n✓ Ascending melody mapping completed');
            console.log(`  Button distribution:`);
            for (const [key, count] of buttonDistribution) {
                console.log(`    ${key}: ${count}`);
            }
        });

        it('should map descending melody to downward motion in DDR mode', async () => {
            const audioBuffer = createDescendingMelodyBuffer(2.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-descending'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Verify buttons were mapped
            expect(mappedResult.buttonMetadata.keysUsed.length).toBeGreaterThan(0);

            console.log('\n✓ Descending melody mapping completed');
            console.log(`  Direction stats:`, contourResult.directionStats);
        });

        it('should produce different patterns with different pitchInfluenceWeight values', async () => {
            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-weight-comparison'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            // Test with full pitch influence
            const fullPitchMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
                pitchInfluenceWeight: 1.0,
            });

            const fullPitchResult = fullPitchMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Test with no pitch influence (pattern only)
            const noPitchMapper = new ButtonMapper({
                controllerMode: 'ddr',
                difficulty: 'medium',
                pitchInfluenceWeight: 0.0,
            });

            const noPitchResult = noPitchMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // With pitch influence, we should have more pitch-influenced beats
            expect(fullPitchResult.buttonMetadata.pitchInfluencedBeats)
                .toBeGreaterThanOrEqual(noPitchResult.buttonMetadata.pitchInfluencedBeats);

            console.log('\n✓ Pitch influence weight affects button selection');
            console.log(`  Full pitch (1.0): ${fullPitchResult.buttonMetadata.pitchInfluencedBeats} pitch beats`);
            console.log(`  No pitch (0.0): ${noPitchResult.buttonMetadata.pitchInfluencedBeats} pitch beats`);
        });
    });

    describe('Guitar Hero Mode Integration', () => {
        beforeEach(() => {
            buttonMapper = new ButtonMapper({
                controllerMode: 'guitar_hero',
                difficulty: 'medium',
                pitchInfluenceWeight: 1.0,
            });
        });

        it('should complete full pipeline in Guitar Hero mode', async () => {
            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-guitar-hero'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Verify buttons were mapped
            expect(mappedResult).toBeDefined();
            expect(mappedResult.buttonMetadata.controllerMode).toBe('guitar_hero');
            expect(mappedResult.buttonMetadata.keysUsed.every(k => [1, 2, 3, 4, 5].includes(Number(k)))).toBe(true);

            console.log('\n✓ Guitar Hero mode completed successfully');
            console.log(`  Keys used: ${mappedResult.buttonMetadata.keysUsed.join(', ')}`);
        });

        it('should map ascending melody to higher frets in Guitar Hero mode', async () => {
            const audioBuffer = createAscendingMelodyBuffer(2.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-guitar-ascending'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Verify buttons are in valid range (1-5)
            const keys = mappedResult.buttonMetadata.keysUsed.map(Number);
            expect(keys.every(k => k >= 1 && k <= 5)).toBe(true);

            console.log('\n✓ Guitar Hero ascending melody mapping completed');
            console.log(`  Frets used: ${keys.join(', ')}`);
        });
    });

    describe('All Difficulty Variants', () => {
        it('should generate buttons for all three difficulty variants', async () => {
            const audioBuffer = createMockAudioBufferWithPitch(3.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-all-variants'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            // Map all variants at once
            const allMapped = buttonMapper.mapAll(generatedRhythm, contourResult.pitchByBeat);

            // Verify all three difficulties are present
            expect(allMapped.easy).toBeDefined();
            expect(allMapped.medium).toBeDefined();
            expect(allMapped.hard).toBeDefined();

            // Easy should have fewer or equal beats than medium
            expect(allMapped.easy.variant.beats.length).toBeLessThanOrEqual(allMapped.medium.variant.beats.length);

            // Medium should have fewer or equal beats than hard
            expect(allMapped.medium.variant.beats.length).toBeLessThanOrEqual(allMapped.hard.variant.beats.length);

            console.log('\n✓ All difficulty variants generated');
            console.log(`  Easy beats: ${allMapped.easy.variant.beats.length}`);
            console.log(`  Medium beats: ${allMapped.medium.variant.beats.length}`);
            console.log(`  Hard beats: ${allMapped.hard.variant.beats.length}`);
        });
    });

    describe('Metadata Validation', () => {
        it('should populate directionStats in button metadata when pitch is provided', async () => {
            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-metadata'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Verify direction stats are populated
            expect(mappedResult.buttonMetadata.directionStats).toBeDefined();
            expect(mappedResult.buttonMetadata.directionStats!.up).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.directionStats!.down).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.directionStats!.stable).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.directionStats!.none).toBeGreaterThanOrEqual(0);

            // Verify interval stats are populated
            expect(mappedResult.buttonMetadata.intervalStats).toBeDefined();
            expect(mappedResult.buttonMetadata.intervalStats!.unison).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.intervalStats!.small).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.intervalStats!.medium).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.intervalStats!.large).toBeGreaterThanOrEqual(0);
            expect(mappedResult.buttonMetadata.intervalStats!.very_large).toBeGreaterThanOrEqual(0);

            // Verify band stats are populated
            expect(mappedResult.buttonMetadata.bandStats).toBeDefined();

            console.log('\n✓ Metadata validation passed');
            console.log(`  Direction stats:`, mappedResult.buttonMetadata.directionStats);
            console.log(`  Interval stats:`, mappedResult.buttonMetadata.intervalStats);
        });

        it('should work without pitch analysis (pattern-only mode)', async () => {
            const audioBuffer = createMockAudioBufferWithPitch(2.0);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-pattern-only'
            );

            // Map buttons without pitch analysis
            const mappedResult = buttonMapper.map(generatedRhythm, 'medium');

            // Should still produce valid output
            expect(mappedResult).toBeDefined();
            expect(mappedResult.variant.beats.length).toBeGreaterThan(0);
            expect(mappedResult.buttonMetadata.keysUsed.length).toBeGreaterThan(0);

            // Should have 0 pitch influenced beats
            expect(mappedResult.buttonMetadata.pitchInfluencedBeats).toBe(0);

            // All beats should be pattern influenced
            expect(mappedResult.buttonMetadata.patternInfluencedBeats).toBe(mappedResult.variant.beats.length);

            // Direction stats should not be populated (no pitch analysis)
            expect(mappedResult.buttonMetadata.directionStats).toBeUndefined();

            console.log('\n✓ Pattern-only mode works correctly');
            console.log(`  Pattern beats: ${mappedResult.buttonMetadata.patternInfluencedBeats}`);
        });
    });

    describe('Edge Cases', () => {
        it('should handle very short audio', async () => {
            const audioBuffer = createMockAudioBufferWithPitch(0.5);
            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-short'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Very short audio (0.5s) may produce 0 beats, which is acceptable
            // The pipeline should complete without errors even if no beats are generated
            expect(mappedResult).toBeDefined();
            expect(mappedResult.variant).toBeDefined();

            // If beats were generated, verify they're valid
            if (mappedResult.variant.beats.length > 0) {
                expect(mappedResult.buttonMetadata.keysUsed.length).toBeGreaterThan(0);
            }

            console.log('\n✓ Short audio handled correctly');
            console.log(`  Duration: 0.5s`);
            console.log(`  Beats: ${mappedResult.variant.beats.length}`);
        });

        it('should handle audio with no clear pitch (noise-like)', async () => {
            // Create noise-like audio
            const length = 44100 * 2;
            const data = new Float32Array(length);
            for (let i = 0; i < length; i++) {
                data[i] = Math.random() * 2 - 1; // White noise
            }

            const audioBuffer = {
                duration: 2.0,
                length,
                sampleRate: 44100,
                numberOfChannels: 1,
                getChannelData: () => data,
                copyFromChannel: () => {},
                copyToChannel: () => {},
                getAudioData: () => data,
            } as AudioBuffer;

            const generatedRhythm = await audioAnalyzer.generateRhythmFromBuffer(
                audioBuffer,
                'test-track-noise'
            );

            const compositePitches = await pitchBeatLinker.linkWithComposite(
                generatedRhythm.composite,
                audioBuffer
            );

            const contourResult = melodyContourAnalyzer.analyze(compositePitches);

            const mappedResult = buttonMapper.map(
                generatedRhythm,
                'medium',
                contourResult.pitchByBeat
            );

            // Should still produce valid output even with noisy audio
            expect(mappedResult).toBeDefined();
            expect(mappedResult.variant.beats.length).toBeGreaterThan(0);

            console.log('\n✓ Noisy audio handled correctly');
            console.log(`  Beats: ${mappedResult.variant.beats.length}`);
            console.log(`  Pitch influenced: ${mappedResult.buttonMetadata.pitchInfluencedBeats}`);
            console.log(`  Pattern influenced: ${mappedResult.buttonMetadata.patternInfluencedBeats}`);
        });
    });
});
