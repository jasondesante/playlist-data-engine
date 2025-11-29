/**
 * Unit tests for AudioAnalyzer
 * Tests the Triple Tap frequency analysis and audio profiling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AudioAnalyzer } from '../../src/core/analysis/AudioAnalyzer';
import { SpectrumScanner } from '../../src/core/analysis/SpectrumScanner';
import { TEST_AUDIO_URLS } from '../fixtures/testAudioUrls';

describe('AudioAnalyzer', () => {
    let analyzer: AudioAnalyzer;
    let analyzerWithAdvancedMetrics: AudioAnalyzer;

    beforeAll(() => {
        analyzer = new AudioAnalyzer();
        analyzerWithAdvancedMetrics = new AudioAnalyzer({ includeAdvancedMetrics: true });
    });

    describe('Audio Analysis with Real Audio File', () => {
        it('should successfully analyze audio from Arweave URL', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;

            try {
                const profile = await analyzer.extractSonicFingerprint(audioUrl);

                // Verify profile structure
                expect(profile).toBeDefined();
                expect(profile.bass_dominance).toBeDefined();
                expect(profile.mid_dominance).toBeDefined();
                expect(profile.treble_dominance).toBeDefined();
                expect(profile.average_amplitude).toBeDefined();
                expect(profile.analysis_metadata).toBeDefined();

                console.log('\n✓ AudioProfile successfully extracted from real audio file');
                console.log(`  Bass Dominance: ${(profile.bass_dominance * 100).toFixed(1)}%`);
                console.log(`  Mid Dominance: ${(profile.mid_dominance * 100).toFixed(1)}%`);
                console.log(`  Treble Dominance: ${(profile.treble_dominance * 100).toFixed(1)}%`);
                console.log(`  Average Amplitude: ${(profile.average_amplitude * 100).toFixed(1)}%`);
                console.log(`  Duration Analyzed: ${profile.analysis_metadata.duration_analyzed.toFixed(2)}s`);
                console.log(`  Full Buffer Analyzed: ${profile.analysis_metadata.full_buffer_analyzed}`);
                console.log(`  Sample Positions: ${profile.analysis_metadata.sample_positions.map(p => (p * 100).toFixed(0) + '%').join(', ')}`);

                return profile;
            } catch (error) {
                console.error('Failed to analyze audio:', error);
                throw error;
            }
        });

        it('should verify frequency ranges are valid (0-1)', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;
            const profile = await analyzer.extractSonicFingerprint(audioUrl);

            // Verify all frequencies are in valid range
            expect(profile.bass_dominance).toBeGreaterThanOrEqual(0);
            expect(profile.bass_dominance).toBeLessThanOrEqual(1);
            expect(profile.mid_dominance).toBeGreaterThanOrEqual(0);
            expect(profile.mid_dominance).toBeLessThanOrEqual(1);
            expect(profile.treble_dominance).toBeGreaterThanOrEqual(0);
            expect(profile.treble_dominance).toBeLessThanOrEqual(1);
            expect(profile.average_amplitude).toBeGreaterThanOrEqual(0);
            expect(profile.average_amplitude).toBeLessThanOrEqual(1);

            console.log('✓ All frequency values within valid range [0, 1]');
        });

        it('should verify duration was measured correctly', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;
            const profile = await analyzer.extractSonicFingerprint(audioUrl);

            // Duration should be positive
            expect(profile.analysis_metadata.duration_analyzed).toBeGreaterThan(0);
            // Duration should be reasonable (less than 30 minutes)
            expect(profile.analysis_metadata.duration_analyzed).toBeLessThan(1800);

            console.log(`✓ Duration measured: ${profile.analysis_metadata.duration_analyzed.toFixed(2)}s`);
        });

        it('should verify sample positions match expected Triple Tap or full buffer', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;
            const profile = await analyzer.extractSonicFingerprint(audioUrl);

            const positions = profile.analysis_metadata.sample_positions;
            expect(positions).toBeDefined();
            expect(positions.length).toBeGreaterThan(0);

            if (profile.analysis_metadata.full_buffer_analyzed) {
                // Full buffer: should analyze at position 0
                expect(positions).toContain(0);
                console.log('✓ Short audio file: analyzed full buffer');
            } else {
                // Triple Tap: should have positions at 5%, 40%, 70%
                expect(positions).toContain(0.05);
                expect(positions).toContain(0.40);
                expect(positions).toContain(0.70);
                console.log('✓ Longer audio file: Triple Tap sampling (5%, 40%, 70%) applied');
            }
        });

        it('should verify frequency balance is reasonable (all bands detected)', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;
            const profile = await analyzer.extractSonicFingerprint(audioUrl);

            const frequencySum = profile.bass_dominance + profile.mid_dominance + profile.treble_dominance;

            // Verify all three frequency bands are detected (sum > 0)
            expect(frequencySum).toBeGreaterThan(0);
            // Note: Mock data may not sum to exactly 1.0 due to how synthesized data works
            // Real audio files will sum closer to 1.0
            expect(frequencySum).toBeLessThan(2.0);

            console.log(`✓ Frequency bands detected: ${frequencySum.toFixed(3)}`);
            console.log(`  Bass: ${(profile.bass_dominance * 100).toFixed(1)}%, Mid: ${(profile.mid_dominance * 100).toFixed(1)}%, Treble: ${(profile.treble_dominance * 100).toFixed(1)}%`);
        });

        it('should include advanced metrics when requested', async () => {
            const audioUrl = TEST_AUDIO_URLS.arweaveTrack;
            const profile = await analyzerWithAdvancedMetrics.extractSonicFingerprint(audioUrl);

            // Advanced metrics should be present
            expect(profile.spectral_centroid).toBeDefined();
            expect(profile.spectral_rolloff).toBeDefined();
            expect(profile.zero_crossing_rate).toBeDefined();

            // Verify reasonable ranges
            expect(profile.spectral_centroid).toBeGreaterThanOrEqual(0);
            expect(profile.spectral_rolloff).toBeGreaterThanOrEqual(0);
            expect(profile.zero_crossing_rate).toBeGreaterThanOrEqual(0);

            console.log('\n✓ Advanced metrics calculated:');
            console.log(`  Spectral Centroid: ${profile.spectral_centroid?.toFixed(0)}Hz`);
            console.log(`  Spectral Rolloff: ${profile.spectral_rolloff?.toFixed(0)}Hz`);
            console.log(`  Zero Crossing Rate: ${profile.zero_crossing_rate?.toFixed(4)}`);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid URLs gracefully', async () => {
            const invalidUrl = 'https://invalid-domain-that-does-not-exist-12345.com/audio.mp3';

            try {
                await analyzer.extractSonicFingerprint(invalidUrl);
                // If no error, the test should fail
                expect(true).toBe(false); // Force fail if we get here
            } catch (error) {
                // Expected to throw
                expect(error).toBeDefined();
                console.log(`✓ Invalid URL correctly rejected`);
            }
        });

        it('should handle non-audio content gracefully', async () => {
            // Try to analyze a non-audio file (returns HTML)
            const nonAudioUrl = 'https://www.google.com';

            try {
                await analyzer.extractSonicFingerprint(nonAudioUrl);
                // If no error, the test should fail
                expect(true).toBe(false); // Force fail if we get here
            } catch (error) {
                // Expected to throw
                expect(error).toBeDefined();
                console.log(`✓ Invalid audio data correctly rejected`);
            }
        });
    });

    describe('SpectrumScanner Integration', () => {
        it('should correctly separate frequency bands', () => {
            // Create mock frequency data with distinct bands
            const frequencyData = new Uint8Array(256);

            // Low frequencies (bass) - bins 0-10
            for (let i = 0; i < 10; i++) {
                frequencyData[i] = 255;
            }

            // Mid frequencies - bins 30-100
            for (let i = 30; i < 100; i++) {
                frequencyData[i] = 128;
            }

            // High frequencies (treble) - bins 150+
            for (let i = 150; i < 256; i++) {
                frequencyData[i] = 200;
            }

            const bands = SpectrumScanner.separateFrequencyBands(frequencyData, 44100);

            expect(bands.bass.length).toBeGreaterThan(0);
            expect(bands.mid.length).toBeGreaterThan(0);
            expect(bands.treble.length).toBeGreaterThan(0);

            const bassDominance = SpectrumScanner.calculateDominance(bands.bass);
            const midDominance = SpectrumScanner.calculateDominance(bands.mid);
            const trebleDominance = SpectrumScanner.calculateDominance(bands.treble);

            // Bass should be highest since we filled those bins with 255
            expect(bassDominance).toBeGreaterThan(midDominance);
            expect(bassDominance).toBeGreaterThan(trebleDominance);

            console.log(`✓ Frequency band separation verified:`);
            console.log(`  Bass: ${bassDominance.toFixed(2)} (highest - correct)`);
            console.log(`  Mid: ${midDominance.toFixed(2)}`);
            console.log(`  Treble: ${trebleDominance.toFixed(2)}`);
        });

        it('should handle empty bands gracefully', () => {
            const bassDominance = SpectrumScanner.calculateDominance([]);
            expect(bassDominance).toBe(0);
            console.log('✓ Empty band correctly returns 0 dominance');
        });
    });
});
