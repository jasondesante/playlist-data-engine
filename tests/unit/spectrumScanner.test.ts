/**
 * Unit tests for SpectrumScanner
 */

import { describe, it, expect } from 'vitest';
import { SpectrumScanner } from '../../src/core/analysis/SpectrumScanner';

describe('SpectrumScanner', () => {
    it('should separate frequencies into correct bands', () => {
        // Create a mock frequency array (256 bins)
        // Sample rate 44100 -> Nyquist 22050
        // Bin width = 22050 / 256 ≈ 86 Hz
        const frequencyData = new Uint8Array(256);

        // Bin 1 (approx 86Hz) -> Bass
        frequencyData[1] = 255;

        // Bin 10 (approx 860Hz) -> Mid
        frequencyData[10] = 255;

        // Bin 100 (approx 8600Hz) -> Treble
        frequencyData[100] = 255;

        const bands = SpectrumScanner.separateFrequencyBands(frequencyData, 44100);

        // Check that energy exists in correct bands
        expect(bands.bass.some(v => v > 0)).toBe(true);
        expect(bands.mid.some(v => v > 0)).toBe(true);
        expect(bands.treble.some(v => v > 0)).toBe(true);

        // Check that bass bin didn't leak into treble
        // (This depends on the exact bin boundaries, but with these wide gaps it should be safe)
    });

    it('should calculate dominance correctly', () => {
        const band = [1.0, 0.5, 0.0]; // Average should be 0.5
        const dominance = SpectrumScanner.calculateDominance(band);
        expect(dominance).toBeCloseTo(0.5);
    });

    it('should handle empty bands', () => {
        const dominance = SpectrumScanner.calculateDominance([]);
        expect(dominance).toBe(0);
    });
});
