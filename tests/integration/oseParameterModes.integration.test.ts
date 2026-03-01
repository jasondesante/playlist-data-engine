/**
 * Integration Tests for OSE Parameter Modes
 *
 * Tests the integration of mode-based parameter configuration with
 * OnsetStrengthEnvelope and BeatMapGenerator classes.
 *
 * This tests Phase 9.2 of the OSE Parameter Modes implementation plan:
 * - Test OnsetStrengthEnvelope with mode configs
 * - Test BeatMapGenerator with mode configs
 * - Test backward compatibility with direct numeric values
 */

import { describe, it, expect } from 'vitest';
import { OnsetStrengthEnvelope } from '../../src/core/analysis/beat/OnsetStrengthEnvelope.js';
import { BeatMapGenerator } from '../../src/core/analysis/beat/BeatMapGenerator.js';
import type {
    OSEConfig,
    BeatMapGeneratorOptions,
    HopSizeConfig,
    MelBandsConfig,
    GaussianSmoothConfig,
} from '../../src/core/types/BeatMap.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a mock AudioBuffer with specific characteristics
 */
function createMockAudioBuffer(
    durationSeconds: number,
    sampleRate: number = 44100,
    numberOfChannels: number = 2
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);

    // Create channel data with some rhythmic content
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numberOfChannels; ch++) {
        const data = new Float32Array(length);
        // Create synthetic audio with periodic "beats" (clicks)
        const beatInterval = Math.floor(sampleRate * 0.5); // 120 BPM = 0.5s interval

        for (let i = 0; i < length; i++) {
            // Add click at beat positions
            const beatPosition = i % beatInterval;
            if (beatPosition < 100) {
                // Short click
                data[i] = Math.sin(2 * Math.PI * 1000 * (i / sampleRate)) *
                    Math.exp(-beatPosition / 20) * 0.8;
            } else {
                // Low-level noise
                data[i] = (Math.random() - 0.5) * 0.1;
            }
        }
        channels.push(data);
    }

    // Create mock AudioBuffer
    return {
        duration: durationSeconds,
        length,
        sampleRate,
        numberOfChannels,
        getChannelData: (channel: number) => channels[channel],
        copyFromChannel: () => {},
        copyToChannel: () => {},
    } as AudioBuffer;
}

/**
 * Create a click track AudioBuffer for precise testing
 */
function createClickTrackBuffer(
    bpm: number,
    durationSeconds: number,
    sampleRate: number = 44100
): AudioBuffer {
    const length = Math.floor(durationSeconds * sampleRate);
    const data = new Float32Array(length);
    const beatInterval = 60 / bpm; // seconds per beat
    const clickDuration = 0.01; // 10ms clicks

    for (let beat = 0; beat < durationSeconds / beatInterval; beat++) {
        const clickStart = Math.floor(beat * beatInterval * sampleRate);
        const clickEnd = Math.min(clickStart + Math.floor(clickDuration * sampleRate), length);

        for (let i = clickStart; i < clickEnd; i++) {
            // Generate a short burst (attack)
            const t = (i - clickStart) / sampleRate;
            data[i] = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-t * 500);
        }
    }

    const buffer = {
        length,
        duration: durationSeconds,
        sampleRate,
        numberOfChannels: 1,
        getChannelData: () => data,
        copyFromChannel: () => {},
        copyToChannel: () => {},
    } as AudioBuffer;

    return buffer;
}

// ============================================================================
// OnsetStrengthEnvelope Integration Tests
// ============================================================================

describe('OnsetStrengthEnvelope with mode configs', () => {
    describe('hopSizeMode configuration', () => {
        it('should use 4ms for standard mode (Ellis 2007 paper spec)', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'standard' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(4);
        });

        it('should use 10ms for efficient mode', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'efficient' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(10);
        });

        it('should use 2ms for hq mode', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'hq' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(2);
        });

        it('should use custom value for custom mode', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'custom', customValue: 7 },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(7);
        });

        it('should clamp custom value to valid range', () => {
            const configBelowMin: OSEConfig = {
                hopSizeMode: { mode: 'custom', customValue: 0 },
            };
            const oseBelowMin = new OnsetStrengthEnvelope(configBelowMin);
            expect(oseBelowMin.getConfig().hopSizeMs).toBe(1); // Clamped to min

            const configAboveMax: OSEConfig = {
                hopSizeMode: { mode: 'custom', customValue: 100 },
            };
            const oseAboveMax = new OnsetStrengthEnvelope(configAboveMax);
            expect(oseAboveMax.getConfig().hopSizeMs).toBe(50); // Clamped to max
        });

        it('should produce different frame counts for different hop sizes', () => {
            const buffer = createClickTrackBuffer(120, 2);

            const oseStandard = new OnsetStrengthEnvelope({ hopSizeMode: { mode: 'standard' } });
            const oseEfficient = new OnsetStrengthEnvelope({ hopSizeMode: { mode: 'efficient' } });

            const resultStandard = oseStandard.calculate(buffer);
            const resultEfficient = oseEfficient.calculate(buffer);

            // Standard (4ms) should have more frames than efficient (10ms)
            expect(resultStandard.numFrames).toBeGreaterThan(resultEfficient.numFrames);

            // Verify the ratio is approximately correct (10/4 = 2.5x more frames)
            const ratio = resultStandard.numFrames / resultEfficient.numFrames;
            expect(ratio).toBeGreaterThan(2);
            expect(ratio).toBeLessThan(3);
        });
    });

    describe('melBandsMode configuration', () => {
        it('should use 40 bands for standard mode', () => {
            const config: OSEConfig = {
                melBandsMode: { mode: 'standard' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.melBands).toBe(40);
        });

        it('should use 64 bands for detailed mode', () => {
            const config: OSEConfig = {
                melBandsMode: { mode: 'detailed' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.melBands).toBe(64);
        });

        it('should use 80 bands for maximum mode', () => {
            const config: OSEConfig = {
                melBandsMode: { mode: 'maximum' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.melBands).toBe(80);
        });
    });

    describe('gaussianSmoothMode configuration', () => {
        it('should use 10ms for minimal mode', () => {
            const config: OSEConfig = {
                gaussianSmoothMode: { mode: 'minimal' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.gaussianSmoothMs).toBe(10);
        });

        it('should use 20ms for standard mode', () => {
            const config: OSEConfig = {
                gaussianSmoothMode: { mode: 'standard' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.gaussianSmoothMs).toBe(20);
        });

        it('should use 40ms for smooth mode', () => {
            const config: OSEConfig = {
                gaussianSmoothMode: { mode: 'smooth' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.gaussianSmoothMs).toBe(40);
        });
    });

    describe('combined mode configuration', () => {
        it('should apply all mode configs together', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'hq' },
                melBandsMode: { mode: 'detailed' },
                gaussianSmoothMode: { mode: 'smooth' },
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(2);
            expect(resolvedConfig.melBands).toBe(64);
            expect(resolvedConfig.gaussianSmoothMs).toBe(40);
        });

        it('should work with partial mode configs (others use defaults)', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'efficient' },
                // melBandsMode and gaussianSmoothMode use defaults
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(10);
            expect(resolvedConfig.melBands).toBe(40); // Default
            expect(resolvedConfig.gaussianSmoothMs).toBe(20); // Default
        });

        it('should produce valid envelopes with all mode combinations', () => {
            const buffer = createClickTrackBuffer(120, 2);

            const hopModes: HopSizeConfig[] = [
                { mode: 'efficient' },
                { mode: 'standard' },
                { mode: 'hq' },
            ];

            const melModes: MelBandsConfig[] = [
                { mode: 'standard' },
                { mode: 'detailed' },
            ];

            const smoothModes: GaussianSmoothConfig[] = [
                { mode: 'minimal' },
                { mode: 'standard' },
            ];

            for (const hopMode of hopModes) {
                for (const melMode of melModes) {
                    for (const smoothMode of smoothModes) {
                        const ose = new OnsetStrengthEnvelope({
                            hopSizeMode: hopMode,
                            melBandsMode: melMode,
                            gaussianSmoothMode: smoothMode,
                        });

                        const result = ose.calculate(buffer);

                        // Verify result structure
                        expect(result.envelope).toBeInstanceOf(Float32Array);
                        expect(result.numFrames).toBeGreaterThan(0);
                        expect(result.hopSizeSeconds).toBeGreaterThan(0);
                        expect(result.duration).toBe(2);
                    }
                }
            }
        });
    });
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

describe('OnsetStrengthEnvelope backward compatibility', () => {
    describe('direct numeric values', () => {
        it('should accept direct hopSizeMs value', () => {
            const config: OSEConfig = {
                hopSizeMs: 8,
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(8);
        });

        it('should accept direct melBands value', () => {
            const config: OSEConfig = {
                melBands: 50,
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.melBands).toBe(50);
        });

        it('should accept direct gaussianSmoothMs value', () => {
            const config: OSEConfig = {
                gaussianSmoothMs: 30,
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.gaussianSmoothMs).toBe(30);
        });

        it('should accept all direct numeric values together', () => {
            const config: OSEConfig = {
                hopSizeMs: 5,
                melBands: 48,
                gaussianSmoothMs: 25,
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(5);
            expect(resolvedConfig.melBands).toBe(48);
            expect(resolvedConfig.gaussianSmoothMs).toBe(25);
        });

        it('should use default values when no config provided', () => {
            const ose = new OnsetStrengthEnvelope();
            const config = ose.getConfig();

            expect(config.hopSizeMs).toBe(4); // Ellis 2007 paper spec
            expect(config.melBands).toBe(40);
            expect(config.gaussianSmoothMs).toBe(20);
        });
    });

    describe('precedence: mode vs direct value', () => {
        it('should prefer hopSizeMode over hopSizeMs', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'hq' }, // 2ms
                hopSizeMs: 10, // Should be ignored
            };
            const ose = new OnsetStrengthEnvelope(config);

            expect(ose.getConfig().hopSizeMs).toBe(2);
        });

        it('should prefer melBandsMode over melBands', () => {
            const config: OSEConfig = {
                melBandsMode: { mode: 'detailed' }, // 64
                melBands: 30, // Should be ignored
            };
            const ose = new OnsetStrengthEnvelope(config);

            expect(ose.getConfig().melBands).toBe(64);
        });

        it('should prefer gaussianSmoothMode over gaussianSmoothMs', () => {
            const config: OSEConfig = {
                gaussianSmoothMode: { mode: 'smooth' }, // 40ms
                gaussianSmoothMs: 15, // Should be ignored
            };
            const ose = new OnsetStrengthEnvelope(config);

            expect(ose.getConfig().gaussianSmoothMs).toBe(40);
        });

        it('should prefer all modes over direct values', () => {
            const config: OSEConfig = {
                hopSizeMode: { mode: 'efficient' }, // 10ms
                hopSizeMs: 4, // Ignored
                melBandsMode: { mode: 'maximum' }, // 80
                melBands: 40, // Ignored
                gaussianSmoothMode: { mode: 'minimal' }, // 10ms
                gaussianSmoothMs: 20, // Ignored
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(10);
            expect(resolvedConfig.melBands).toBe(80);
            expect(resolvedConfig.gaussianSmoothMs).toBe(10);
        });

        it('should use direct value when mode is not provided', () => {
            const config: OSEConfig = {
                hopSizeMs: 6,
                // No hopSizeMode
                melBandsMode: { mode: 'detailed' }, // Mode provided
                // No gaussianSmoothMs or gaussianSmoothMode
            };
            const ose = new OnsetStrengthEnvelope(config);
            const resolvedConfig = ose.getConfig();

            expect(resolvedConfig.hopSizeMs).toBe(6); // Direct value used
            expect(resolvedConfig.melBands).toBe(64); // Mode used
            expect(resolvedConfig.gaussianSmoothMs).toBe(20); // Default used
        });
    });
});

// ============================================================================
// BeatMapGenerator Integration Tests
// ============================================================================

describe('BeatMapGenerator with mode configs', () => {
    describe('hopSizeMode configuration', () => {
        it('should pass hopSizeMode to OSE and use correct value', async () => {
            const options: BeatMapGeneratorOptions = {
                hopSizeMode: { mode: 'efficient' },
            };
            const generator = new BeatMapGenerator(options);
            const config = generator.getConfig();

            expect(config.hopSizeMode).toEqual({ mode: 'efficient' });
            expect(config.hopSizeMs).toBe(10); // Resolved from mode
        });

        it('should generate beat map with standard hop size mode', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMode: { mode: 'standard' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'standard-mode');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.hopSizeMs).toBe(4);
        });

        it('should generate beat map with hq hop size mode', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMode: { mode: 'hq' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'hq-mode');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.hopSizeMs).toBe(2);
        });

        it('should generate beat map with custom hop size mode', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMode: { mode: 'custom', customValue: 6 },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'custom-mode');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.hopSizeMs).toBe(6);
        });
    });

    describe('melBandsMode configuration', () => {
        it('should pass melBandsMode to OSE and use correct value', async () => {
            const generator = new BeatMapGenerator({
                melBandsMode: { mode: 'detailed' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'detailed-bands');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.melBands).toBe(64);
        });

        it('should use maximum mel bands mode', async () => {
            const generator = new BeatMapGenerator({
                melBandsMode: { mode: 'maximum' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'max-bands');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.melBands).toBe(80);
        });
    });

    describe('gaussianSmoothMode configuration', () => {
        it('should pass gaussianSmoothMode to OSE and use correct value', async () => {
            const generator = new BeatMapGenerator({
                gaussianSmoothMode: { mode: 'smooth' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'smooth-mode');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.gaussianSmoothMs).toBe(40);
        });

        it('should use minimal gaussian smooth mode', async () => {
            const generator = new BeatMapGenerator({
                gaussianSmoothMode: { mode: 'minimal' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'minimal-smooth');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.gaussianSmoothMs).toBe(10);
        });
    });

    describe('combined mode configuration', () => {
        it('should apply all mode configs in beat map generation', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMode: { mode: 'standard' },
                melBandsMode: { mode: 'detailed' },
                gaussianSmoothMode: { mode: 'smooth' },
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'all-modes');

            expect(beatMap.metadata.hopSizeMs).toBe(4);
            expect(beatMap.metadata.melBands).toBe(64);
            expect(beatMap.metadata.gaussianSmoothMs).toBe(40);
        });

        it('should produce valid beat maps with all mode combinations', async () => {
            const hopModes: HopSizeConfig[] = [
                { mode: 'efficient' },
                { mode: 'standard' },
            ];

            for (const hopMode of hopModes) {
                const generator = new BeatMapGenerator({
                    hopSizeMode: hopMode,
                    melBandsMode: { mode: 'standard' },
                    gaussianSmoothMode: { mode: 'standard' },
                });
                const audioBuffer = createMockAudioBuffer(2);

                const beatMap = await generator.generateBeatMapFromBuffer(
                    audioBuffer,
                    `combo-${hopMode.mode}`
                );

                expect(beatMap).toBeDefined();
                expect(beatMap.beats).toBeInstanceOf(Array);
                expect(beatMap.bpm).toBeGreaterThan(0);
            }
        });
    });

    describe('default configuration', () => {
        it('should use standard modes by default', () => {
            const generator = new BeatMapGenerator();
            const config = generator.getConfig();

            expect(config.hopSizeMode).toEqual({ mode: 'standard' });
            expect(config.melBandsMode).toEqual({ mode: 'standard' });
            expect(config.gaussianSmoothMode).toEqual({ mode: 'standard' });

            // Corresponding numeric values
            expect(config.hopSizeMs).toBe(4);
            expect(config.melBands).toBe(40);
            expect(config.gaussianSmoothMs).toBe(20);
        });
    });
});

// ============================================================================
// BeatMapGenerator Backward Compatibility Tests
// ============================================================================

describe('BeatMapGenerator backward compatibility', () => {
    describe('direct numeric values', () => {
        it('should accept direct hopSizeMs value', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMs: 8,
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'direct-hop');

            expect(beatMap.metadata.hopSizeMs).toBe(8);
        });

        it('should accept direct melBands value', async () => {
            const generator = new BeatMapGenerator({
                melBands: 50,
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'direct-mel');

            expect(beatMap.metadata.melBands).toBe(50);
        });

        it('should accept direct gaussianSmoothMs value', async () => {
            const generator = new BeatMapGenerator({
                gaussianSmoothMs: 30,
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'direct-smooth');

            expect(beatMap.metadata.gaussianSmoothMs).toBe(30);
        });

        it('should accept all direct numeric values together', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMs: 6,
                melBands: 48,
                gaussianSmoothMs: 25,
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'all-direct');

            expect(beatMap.metadata.hopSizeMs).toBe(6);
            expect(beatMap.metadata.melBands).toBe(48);
            expect(beatMap.metadata.gaussianSmoothMs).toBe(25);
        });
    });

    describe('precedence: mode vs direct value', () => {
        it('should prefer hopSizeMode over hopSizeMs in BeatMapGenerator', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMode: { mode: 'hq' }, // 2ms
                hopSizeMs: 10, // Should be ignored
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'hop-precedence');

            expect(beatMap.metadata.hopSizeMs).toBe(2);
        });

        it('should prefer melBandsMode over melBands in BeatMapGenerator', async () => {
            const generator = new BeatMapGenerator({
                melBandsMode: { mode: 'maximum' }, // 80
                melBands: 40, // Should be ignored
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'mel-precedence');

            expect(beatMap.metadata.melBands).toBe(80);
        });

        it('should prefer gaussianSmoothMode over gaussianSmoothMs', async () => {
            const generator = new BeatMapGenerator({
                gaussianSmoothMode: { mode: 'minimal' }, // 10ms
                gaussianSmoothMs: 20, // Should be ignored
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'smooth-precedence');

            expect(beatMap.metadata.gaussianSmoothMs).toBe(10);
        });

        it('should prefer all modes over direct values in BeatMapGenerator', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMode: { mode: 'standard' }, // 4ms
                hopSizeMs: 10, // Ignored
                melBandsMode: { mode: 'detailed' }, // 64
                melBands: 40, // Ignored
                gaussianSmoothMode: { mode: 'smooth' }, // 40ms
                gaussianSmoothMs: 20, // Ignored
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'all-precedence');

            expect(beatMap.metadata.hopSizeMs).toBe(4);
            expect(beatMap.metadata.melBands).toBe(64);
            expect(beatMap.metadata.gaussianSmoothMs).toBe(40);
        });

        it('should use direct value when mode is not provided in BeatMapGenerator', async () => {
            const generator = new BeatMapGenerator({
                hopSizeMs: 8,
                // No hopSizeMode
                melBandsMode: { mode: 'detailed' }, // Mode provided
                // No gaussianSmoothMs or gaussianSmoothMode
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'mixed-config');

            expect(beatMap.metadata.hopSizeMs).toBe(8); // Direct value used
            expect(beatMap.metadata.melBands).toBe(64); // Mode used
            expect(beatMap.metadata.gaussianSmoothMs).toBe(20); // Default used
        });
    });

    describe('legacy code compatibility', () => {
        it('should work with code that only provides hopSizeMs (legacy pattern)', async () => {
            // This simulates legacy code that was using the old API
            const generator = new BeatMapGenerator({
                hopSizeMs: 10, // Old default
                minBpm: 80,
                maxBpm: 160,
            });
            const audioBuffer = createMockAudioBuffer(2);

            const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'legacy');

            expect(beatMap).toBeDefined();
            expect(beatMap.metadata.hopSizeMs).toBe(10);
            expect(beatMap.metadata.minBpm).toBe(80);
            expect(beatMap.metadata.maxBpm).toBe(160);
        });

        it('should produce consistent results with same parameters via different config styles', async () => {
            const audioBuffer = createClickTrackBuffer(120, 4);

            // Mode-based config
            const generatorMode = new BeatMapGenerator({
                hopSizeMode: { mode: 'efficient' },
                melBandsMode: { mode: 'standard' },
                gaussianSmoothMode: { mode: 'standard' },
            });

            // Direct value config
            const generatorDirect = new BeatMapGenerator({
                hopSizeMs: 10,
                melBands: 40,
                gaussianSmoothMs: 20,
            });

            const beatMapMode = await generatorMode.generateBeatMapFromBuffer(audioBuffer, 'mode-style');
            const beatMapDirect = await generatorDirect.generateBeatMapFromBuffer(audioBuffer, 'direct-style');

            // Both should have the same OSE parameters
            expect(beatMapMode.metadata.hopSizeMs).toBe(beatMapDirect.metadata.hopSizeMs);
            expect(beatMapMode.metadata.melBands).toBe(beatMapDirect.metadata.melBands);
            expect(beatMapMode.metadata.gaussianSmoothMs).toBe(beatMapDirect.metadata.gaussianSmoothMs);

            // Both should detect beats
            expect(beatMapMode.beats.length).toBeGreaterThan(0);
            expect(beatMapDirect.beats.length).toBeGreaterThan(0);

            // The beat counts should be similar (same parameters = similar results)
            // Allow some tolerance for floating point differences
            const beatCountDiff = Math.abs(beatMapMode.beats.length - beatMapDirect.beats.length);
            expect(beatCountDiff).toBeLessThan(3);
        });
    });
});

// ============================================================================
// End-to-End Integration Tests
// ============================================================================

describe('End-to-end OSE parameter modes integration', () => {
    it('should complete full beat detection pipeline with mode configs', async () => {
        const generator = new BeatMapGenerator({
            hopSizeMode: { mode: 'standard' },
            melBandsMode: { mode: 'detailed' },
            gaussianSmoothMode: { mode: 'standard' },
            minBpm: 60,
            maxBpm: 180,
        });

        const audioBuffer = createClickTrackBuffer(120, 5);
        const beatMap = await generator.generateBeatMapFromBuffer(audioBuffer, 'e2e-test');

        // Verify beat map structure
        expect(beatMap.audioId).toBe('e2e-test');
        expect(beatMap.duration).toBe(5);
        expect(beatMap.beats).toBeInstanceOf(Array);
        expect(beatMap.beats.length).toBeGreaterThan(0);
        expect(beatMap.bpm).toBeGreaterThan(60);
        expect(beatMap.bpm).toBeLessThan(180);

        // Verify metadata reflects the mode configs
        expect(beatMap.metadata.hopSizeMs).toBe(4);
        expect(beatMap.metadata.melBands).toBe(64);
        expect(beatMap.metadata.gaussianSmoothMs).toBe(20);

        // Verify beat properties
        for (const beat of beatMap.beats) {
            expect(beat.timestamp).toBeGreaterThanOrEqual(0);
            expect(beat.timestamp).toBeLessThanOrEqual(5);
            expect(beat.intensity).toBeGreaterThanOrEqual(0);
            expect(beat.intensity).toBeLessThanOrEqual(1);
            expect(beat.confidence).toBeGreaterThanOrEqual(0);
            expect(beat.confidence).toBeLessThanOrEqual(1);
        }
    });

    it('should produce higher quality results with hq mode', async () => {
        const audioBuffer = createClickTrackBuffer(120, 3);

        // HQ mode
        const generatorHQ = new BeatMapGenerator({
            hopSizeMode: { mode: 'hq' },
        });

        // Efficient mode
        const generatorEfficient = new BeatMapGenerator({
            hopSizeMode: { mode: 'efficient' },
        });

        const beatMapHQ = await generatorHQ.generateBeatMapFromBuffer(audioBuffer, 'hq-e2e');
        const beatMapEfficient = await generatorEfficient.generateBeatMapFromBuffer(
            audioBuffer,
            'efficient-e2e'
        );

        // Both should produce valid beat maps
        expect(beatMapHQ.beats.length).toBeGreaterThan(0);
        expect(beatMapEfficient.beats.length).toBeGreaterThan(0);

        // HQ mode has smaller hop size, so potentially more precise beat positions
        expect(beatMapHQ.metadata.hopSizeMs).toBe(2);
        expect(beatMapEfficient.metadata.hopSizeMs).toBe(10);
    });

    it('should handle progress callbacks with mode configs', async () => {
        const progressCalls: any[] = [];
        const onProgress = (progress: any) => {
            progressCalls.push({ ...progress });
        };

        const generator = new BeatMapGenerator({
            hopSizeMode: { mode: 'standard' },
            melBandsMode: { mode: 'detailed' },
        });

        const audioBuffer = createMockAudioBuffer(3);
        await generator.generateBeatMapFromBuffer(audioBuffer, 'progress-test', undefined, onProgress);

        // Should have received progress updates
        expect(progressCalls.length).toBeGreaterThan(0);

        // Check that phases progress
        const phases = progressCalls.map((p) => p.phase);
        expect(phases).toContain('complete');
    });
});
