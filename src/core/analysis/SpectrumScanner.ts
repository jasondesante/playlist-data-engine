/**
 * Spectrum Scanner - Separates frequency data into bands
 * Based on ENGINE_DESIGN_DOCUMENT.md Section 4.B
 */

import type { FrequencyBands } from '../types/AudioProfile.js';

export class SpectrumScanner {
    /**
     * Separate frequency data into bass, mid, and treble bands
     */
    static separateFrequencyBands(
        frequencyData: Uint8Array,
        sampleRate: number
    ): FrequencyBands {
        const binCount = frequencyData.length;
        const frequencyPerBin = sampleRate / 2 / binCount;

        const bass: number[] = [];
        const mid: number[] = [];
        const treble: number[] = [];

        for (let i = 0; i < binCount; i++) {
            const frequency = i * frequencyPerBin;
            const amplitude = frequencyData[i] / 255; // Normalize to 0-1

            if (frequency >= 20 && frequency < 250) {
                bass.push(amplitude);
            } else if (frequency >= 250 && frequency < 4000) {
                mid.push(amplitude);
            } else if (frequency >= 4000 && frequency <= 20000) {
                treble.push(amplitude);
            }
        }

        return { bass, mid, treble };
    }

    /**
     * Calculate dominance (average amplitude) for a frequency band
     */
    static calculateDominance(band: number[]): number {
        if (band.length === 0) return 0;
        const sum = band.reduce((a, b) => a + b, 0);
        return sum / band.length;
    }
}
