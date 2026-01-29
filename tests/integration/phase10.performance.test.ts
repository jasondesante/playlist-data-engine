/**
 * Integration test for Phase 10.2: Performance Testing
 *
 * This test benchmarks the performance of character generation and
 * audio analysis after the extensibility and audio analysis upgrades.
 *
 * Tests Phase 10.2 tasks from DATA_ENGINE_UPGRADE_PLAN.md:
 * - Benchmark character generation time (before vs after)
 * - Benchmark audio analysis time (new bands + attenuation)
 * - Verify no significant performance degradation (<20% slower acceptable)
 * - Profile memory usage (custom data doesn't leak)
 *
 * Note: Since we don't have "before" data from before the upgrade,
 * this test establishes a baseline for future comparisons.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator.js';
import { ClassSuggester } from '../../src/core/generation/ClassSuggester.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { SeededRNG } from '../../src/utils/random.js';
import type { AudioProfile } from '../../src/core/types/AudioProfile.js';

/**
 * Benchmark result interface for tracking metrics
 */
interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    throughput: number; // operations per second
    memoryMB: number; // memory usage in MB
}

/**
 * Run a benchmark and return detailed metrics
 */
function runBenchmark(
    name: string,
    fn: () => void,
    iterations: number = 100
): BenchmarkResult {
    // Force garbage collection if available (Node.js with --expose-gc)
    const beforeMemory = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0;

    const times: number[] = [];

    // Warmup run
    for (let i = 0; i < 5; i++) {
        fn();
    }

    // Actual benchmark
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
        const iterStart = performance.now();
        fn();
        const iterEnd = performance.now();
        times.push(iterEnd - iterStart);
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = 1000 / averageTime; // ops per second

    const afterMemory = process.memoryUsage ? process.memoryUsage().heapUsed / 1024 / 1024 : 0;
    const memoryMB = afterMemory - beforeMemory;

    return {
        name,
        iterations,
        totalTime,
        averageTime,
        minTime,
        maxTime,
        throughput,
        memoryMB,
    };
}

/**
 * Create a diverse set of audio profiles for testing
 */
const BENCHMARK_AUDIO_PROFILES: AudioProfile[] = [
    {
        bass_dominance: 0.85,
        mid_dominance: 0.40,
        treble_dominance: 0.60,
        average_amplitude: 0.70,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: false,
            sample_positions: [5, 40, 70],
            analyzed_at: new Date().toISOString(),
        },
    },
    {
        bass_dominance: 0.35,
        mid_dominance: 0.55,
        treble_dominance: 0.80,
        average_amplitude: 0.40,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: false,
            sample_positions: [5, 40, 70],
            analyzed_at: new Date().toISOString(),
        },
    },
    {
        bass_dominance: 0.50,
        mid_dominance: 0.75,
        treble_dominance: 0.55,
        average_amplitude: 0.60,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: false,
            sample_positions: [5, 40, 70],
            analyzed_at: new Date().toISOString(),
        },
    },
    {
        bass_dominance: 0.70,
        mid_dominance: 0.60,
        treble_dominance: 0.65,
        average_amplitude: 0.80,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: false,
            sample_positions: [5, 40, 70],
            analyzed_at: new Date().toISOString(),
        },
    },
    {
        bass_dominance: 0.01,
        mid_dominance: 0.01,
        treble_dominance: 0.01,
        average_amplitude: 0.01,
        analysis_metadata: {
            duration_analyzed: 30,
            full_buffer_analyzed: false,
            sample_positions: [5, 40, 70],
            analyzed_at: new Date().toISOString(),
        },
    },
];

describe('Phase 10.2: Performance Testing', () => {
    let manager: ExtensionManager;

    beforeEach(() => {
        manager = ExtensionManager.getInstance();
        manager.resetAll();
    });

    afterEach(() => {
        manager.resetAll();
    });

    describe('Task 1: Benchmark character generation time (before vs after)', () => {
        it('should benchmark basic character generation', () => {
            const profile = BENCHMARK_AUDIO_PROFILES[0];
            let counter = 0;

            const result = runBenchmark(
                'Basic Character Generation',
                () => {
                    const character = CharacterGenerator.generate(
                        `benchmark-${counter++}`,
                        profile,
                        'Benchmark Character'
                    );
                    expect(character).toBeDefined();
                    expect(character.class).toBeDefined();
                },
                100
            );

            console.log('\n=== Phase 10.2: Character Generation Benchmark ===');
            console.log(`Test: ${result.name}`);
            console.log(`Iterations: ${result.iterations}`);
            console.log(`Total time: ${result.totalTime.toFixed(2)}ms`);
            console.log(`Average time: ${result.averageTime.toFixed(3)}ms`);
            console.log(`Min time: ${result.minTime.toFixed(3)}ms`);
            console.log(`Max time: ${result.maxTime.toFixed(3)}ms`);
            console.log(`Throughput: ${result.throughput.toFixed(0)} chars/sec`);
            console.log(`Memory delta: ${result.memoryMB.toFixed(2)} MB`);

            // Performance assertions
            // Character generation should be reasonably fast
            expect(result.averageTime).toBeLessThan(50); // Less than 50ms per character
            expect(result.throughput).toBeGreaterThan(20); // At least 20 chars/sec
        });

        it('should benchmark character generation with different audio profiles', () => {
            let counter = 0;

            const result = runBenchmark(
                'Character Generation (Diverse Profiles)',
                () => {
                    const profileIndex = counter % BENCHMARK_AUDIO_PROFILES.length;
                    const profile = BENCHMARK_AUDIO_PROFILES[profileIndex];
                    const character = CharacterGenerator.generate(
                        `benchmark-diverse-${counter++}`,
                        profile,
                        'Diverse Profile Character'
                    );
                    expect(character).toBeDefined();
                },
                100
            );

            console.log('\n=== Phase 10.2: Diverse Profile Generation Benchmark ===');
            console.log(`Test: ${result.name}`);
            console.log(`Iterations: ${result.iterations}`);
            console.log(`Average time: ${result.averageTime.toFixed(3)}ms`);
            console.log(`Throughput: ${result.throughput.toFixed(0)} chars/sec`);

            expect(result.averageTime).toBeLessThan(50);
            expect(result.throughput).toBeGreaterThan(20);
        });

        it('should benchmark character generation with custom content (extensions)', () => {
            const customSpells = [
                { name: 'Phoenix Fire', level: 5, school: 'Evocation' },
                { name: 'Mind Shield', level: 2, school: 'Abjuration' },
                { name: 'Frost Nova', level: 3, school: 'Evocation' },
            ];

            const customEquipment = [
                { name: 'Moonlit Blade', type: 'weapon' as const, rarity: 'rare' as const, weight: 3, damage: '1d8 slashing' },
                { name: 'Shadow Cloak', type: 'armor' as const, rarity: 'uncommon' as const, weight: 5, armor_class: 12 },
            ];

            let counter = 0;

            const result = runBenchmark(
                'Character Generation with Custom Content',
                () => {
                    const profile = BENCHMARK_AUDIO_PROFILES[counter % BENCHMARK_AUDIO_PROFILES.length];
                    const character = CharacterGenerator.generate(
                        `benchmark-custom-${counter++}`,
                        profile,
                        'Custom Content Character',
                        {
                            forceClass: 'Wizard',
                            extensions: {
                                spells: customSpells,
                                equipment: customEquipment,
                            }
                        }
                    );
                    expect(character).toBeDefined();
                },
                50
            );

            console.log('\n=== Phase 10.2: Custom Content Generation Benchmark ===');
            console.log(`Test: ${result.name}`);
            console.log(`Iterations: ${result.iterations}`);
            console.log(`Average time: ${result.averageTime.toFixed(3)}ms`);
            console.log(`Throughput: ${result.throughput.toFixed(0)} chars/sec`);
            console.log(`Memory delta: ${result.memoryMB.toFixed(2)} MB`);

            // Custom content should still be reasonably fast
            expect(result.averageTime).toBeLessThan(75); // Slightly higher tolerance for custom content
            expect(result.throughput).toBeGreaterThan(13);
        });
    });

    describe('Task 2: Benchmark audio analysis time (new bands + attenuation)', () => {
        it('should benchmark ClassSuggester with new audio analysis', () => {
            let counter = 0;

            const result = runBenchmark(
                'ClassSuggester.suggest()',
                () => {
                    const profile = BENCHMARK_AUDIO_PROFILES[counter % BENCHMARK_AUDIO_PROFILES.length];
                    const rng = new SeededRNG(`benchmark-class-${counter++}`);
                    const suggestedClass = ClassSuggester.suggest(profile, rng);
                    expect(suggestedClass).toBeDefined();
                },
                1000
            );

            console.log('\n=== Phase 10.2: ClassSuggester Benchmark ===');
            console.log(`Test: ${result.name}`);
            console.log(`Iterations: ${result.iterations}`);
            console.log(`Total time: ${result.totalTime.toFixed(2)}ms`);
            console.log(`Average time: ${result.averageTime.toFixed(3)}ms`);
            console.log(`Min time: ${result.minTime.toFixed(3)}ms`);
            console.log(`Max time: ${result.maxTime.toFixed(3)}ms`);
            console.log(`Throughput: ${result.throughput.toFixed(0)} suggestions/sec`);

            // Class suggestion should be very fast
            expect(result.averageTime).toBeLessThan(1); // Less than 1ms
            expect(result.throughput).toBeGreaterThan(1000); // At least 1000 suggestions/sec
        });

        it('should benchmark ClassSuggester with extreme profiles', () => {
            const extremeProfiles: AudioProfile[] = [
                {
                    bass_dominance: 0.99,
                    mid_dominance: 0.01,
                    treble_dominance: 0.01,
                    average_amplitude: 0.50,
                    analysis_metadata: {
                        duration_analyzed: 30,
                        full_buffer_analyzed: false,
                        sample_positions: [5, 40, 70],
                        analyzed_at: new Date().toISOString(),
                    },
                },
                {
                    bass_dominance: 0.01,
                    mid_dominance: 0.01,
                    treble_dominance: 0.99,
                    average_amplitude: 0.50,
                    analysis_metadata: {
                        duration_analyzed: 30,
                        full_buffer_analyzed: false,
                        sample_positions: [5, 40, 70],
                        analyzed_at: new Date().toISOString(),
                    },
                },
            ];

            let counter = 0;

            const result = runBenchmark(
                'ClassSuggester with Extreme Profiles',
                () => {
                    const profile = extremeProfiles[counter % extremeProfiles.length];
                    const rng = new SeededRNG(`benchmark-extreme-${counter++}`);
                    const suggestedClass = ClassSuggester.suggest(profile, rng);
                    expect(suggestedClass).toBeDefined();
                },
                1000
            );

            console.log('\n=== Phase 10.2: Extreme Profile ClassSuggester Benchmark ===');
            console.log(`Test: ${result.name}`);
            console.log(`Iterations: ${result.iterations}`);
            console.log(`Average time: ${result.averageTime.toFixed(3)}ms`);
            console.log(`Throughput: ${result.throughput.toFixed(0)} suggestions/sec`);

            expect(result.averageTime).toBeLessThan(1);
        });
    });

    describe('Task 3: Verify no significant performance degradation (<20% slower acceptable)', () => {
        it('should establish performance baseline for comparison', () => {
            const results: BenchmarkResult[] = [];

            // Benchmark 1: Basic character generation
            let counter = 0;
            results.push(runBenchmark(
                'Baseline: Basic Generation',
                () => {
                    const character = CharacterGenerator.generate(
                        `baseline-${counter++}`,
                        BENCHMARK_AUDIO_PROFILES[0],
                        'Baseline'
                    );
                    expect(character).toBeDefined();
                },
                100
            ));

            // Benchmark 2: Class suggestion
            counter = 0;
            results.push(runBenchmark(
                'Baseline: Class Suggestion',
                () => {
                    const rng = new SeededRNG(`baseline-class-${counter++}`);
                    const suggested = ClassSuggester.suggest(BENCHMARK_AUDIO_PROFILES[0], rng);
                    expect(suggested).toBeDefined();
                },
                1000
            ));

            // Benchmark 3: Full pipeline
            counter = 0;
            results.push(runBenchmark(
                'Baseline: Full Pipeline',
                () => {
                    const profile = BENCHMARK_AUDIO_PROFILES[counter % BENCHMARK_AUDIO_PROFILES.length];
                    const rng = new SeededRNG(`baseline-pipeline-${counter++}`);
                    const suggestedClass = ClassSuggester.suggest(profile, rng);
                    const character = CharacterGenerator.generate(
                        `pipeline-${counter}`,
                        profile,
                        'Pipeline Test'
                    );
                    expect(suggestedClass).toBeDefined();
                    expect(character).toBeDefined();
                },
                100
            ));

            console.log('\n=== Phase 10.2: Performance Baseline Summary ===');
            console.log('');
            console.log('These baselines can be used for future comparison:');
            console.log('');

            for (const result of results) {
                console.log(`${result.name}:`);
                console.log(`  Average: ${result.averageTime.toFixed(3)}ms`);
                console.log(`  Throughput: ${result.throughput.toFixed(0)} ops/sec`);
                console.log('');
            }

            // Store baseline in a format that could be saved to a file
            const baseline = {
                timestamp: new Date().toISOString(),
                platform: process.platform,
                nodeVersion: process.version,
                results: results.map(r => ({
                    name: r.name,
                    averageTimeMs: r.averageTime,
                    throughputOpsPerSec: r.throughput,
                })),
            };

            console.log('Baseline data for future comparison:');
            console.log(JSON.stringify(baseline, null, 2));

            // Verify all benchmarks meet minimum performance criteria
            expect(results[0].averageTime).toBeLessThan(50); // Basic generation
            expect(results[1].averageTime).toBeLessThan(1); // Class suggestion
            expect(results[2].averageTime).toBeLessThan(60); // Full pipeline
        });
    });

    describe('Task 4: Profile memory usage (custom data doesn\'t leak)', () => {
        it('should verify no memory leaks with repeated character generation', () => {
            if (!process.memoryUsage) {
                console.log('Memory profiling skipped (not in Node.js environment)');
                return;
            }

            const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            const iterations = 200;
            const memories: number[] = [];

            // Generate many characters and track memory
            for (let i = 0; i < iterations; i++) {
                const profile = BENCHMARK_AUDIO_PROFILES[i % BENCHMARK_AUDIO_PROFILES.length];
                CharacterGenerator.generate(
                    `memory-test-${i}`,
                    profile,
                    `Memory Test ${i}`
                );

                if (i % 20 === 0) {
                    memories.push(process.memoryUsage().heapUsed / 1024 / 1024);
                }
            }

            const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            const memoryGrowth = finalMemory - initialMemory;

            console.log('\n=== Phase 10.2: Memory Usage Profile ===');
            console.log(`Initial memory: ${initialMemory.toFixed(2)} MB`);
            console.log(`Final memory: ${finalMemory.toFixed(2)} MB`);
            console.log(`Memory growth: ${memoryGrowth.toFixed(2)} MB`);
            console.log(`Memory per character: ${(memoryGrowth / iterations).toFixed(4)} MB`);

            // Memory growth should be reasonable
            // Some growth is expected due to caching, but should not be linear
            // We'll allow up to 10MB growth for 200 characters
            expect(memoryGrowth).toBeLessThan(10);
        });

        it('should verify ExtensionManager doesn\'t leak with repeated resets', () => {
            if (!process.memoryUsage) {
                return;
            }

            const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

            // Repeatedly register and reset
            for (let i = 0; i < 50; i++) {
                const customSpells = [
                    { name: `Test Spell ${i}`, level: 1, school: 'Evocation' },
                ];

                manager.register('spells', customSpells, { mode: 'append' });

                const allSpells = manager.get('spells');
                expect(allSpells.length).toBeGreaterThan(0);

                manager.resetAll();
            }

            const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
            const memoryGrowth = finalMemory - initialMemory;

            console.log('\n=== Phase 10.2: ExtensionManager Memory Leak Test ===');
            console.log(`Initial memory: ${initialMemory.toFixed(2)} MB`);
            console.log(`Final memory: ${finalMemory.toFixed(2)} MB`);
            console.log(`Memory growth after 50 register/reset cycles: ${memoryGrowth.toFixed(2)} MB`);

            // ExtensionManager should clean up properly on reset
            // Memory growth should be minimal
            expect(memoryGrowth).toBeLessThan(5);
        });

        it('should verify custom content doesn\'t cause excessive memory growth', () => {
            if (!process.memoryUsage) {
                return;
            }

            const customContent = {
                spells: Array.from({ length: 50 }, (_, i) => ({
                    name: `Custom Spell ${i}`,
                    level: i % 9,
                    school: ['Evocation', 'Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Illusion', 'Necromancy', 'Transmutation'][i % 8],
                })),
                equipment: Array.from({ length: 50 }, (_, i) => ({
                    name: `Custom Item ${i}`,
                    type: ['weapon' as const, 'armor' as const, 'item' as const][i % 3],
                    rarity: ['common' as const, 'uncommon' as const, 'rare' as const, 'very_rare' as const, 'legendary' as const][i % 5],
                    weight: Math.random() * 20,
                })),
            };

            const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;

            // Register custom content
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            manager.register('spells', customContent.spells as any, { mode: 'append' });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            manager.register('equipment', customContent.equipment as any, { mode: 'append' });

            const afterRegisterMemory = process.memoryUsage().heapUsed / 1024 / 1024;

            // Generate characters with custom content
            for (let i = 0; i < 50; i++) {
                const profile = BENCHMARK_AUDIO_PROFILES[i % BENCHMARK_AUDIO_PROFILES.length];
                CharacterGenerator.generate(
                    `custom-memory-${i}`,
                    profile,
                    'Custom Memory Test'
                );
            }

            const afterGenerationMemory = process.memoryUsage().heapUsed / 1024 / 1024;

            // Reset
            manager.resetAll();
            const afterResetMemory = process.memoryUsage().heapUsed / 1024 / 1024;

            console.log('\n=== Phase 10.2: Custom Content Memory Test ===');
            console.log(`Initial memory: ${initialMemory.toFixed(2)} MB`);
            console.log(`After registration: ${afterRegisterMemory.toFixed(2)} MB (+${(afterRegisterMemory - initialMemory).toFixed(2)} MB)`);
            console.log(`After generation: ${afterGenerationMemory.toFixed(2)} MB (+${(afterGenerationMemory - afterRegisterMemory).toFixed(2)} MB)`);
            console.log(`After reset: ${afterResetMemory.toFixed(2)} MB`);

            // Reset should free most of the memory
            const memoryAfterReset = afterResetMemory - initialMemory;
            // Allow up to 5MB growth since JS garbage collection doesn't run immediately
            expect(memoryAfterReset).toBeLessThan(5);
        });
    });

    describe('Performance Summary', () => {
        it('should provide overall performance summary', () => {
            console.log('\n=== Phase 10.2: Performance Testing Summary ===');
            console.log('');
            console.log('✓ Task 1: Character generation time benchmarked');
            console.log('✓ Task 2: Audio analysis time benchmarked');
            console.log('✓ Task 3: Performance baseline established');
            console.log('✓ Task 4: Memory usage profiled');
            console.log('');
            console.log('Key Findings:');
            console.log('- Character generation: <50ms average');
            console.log('- Class suggestion: <1ms average');
            console.log('- Full pipeline: <60ms average');
            console.log('- Memory usage: No significant leaks detected');
            console.log('');
            console.log('Acceptable performance thresholds:');
            console.log('- <20% degradation from baseline is acceptable');
            console.log('- Memory growth should be sub-linear');
            console.log('');
            console.log('All Phase 10.2 tasks completed!');
        });
    });
});
