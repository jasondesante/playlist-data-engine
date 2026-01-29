/**
 * Spectrum Scanner - Separates frequency data into bands
 * Based on specs/001-core-engine/SPEC.md
 *
 * **Phase 8.1 Update**: Frequency bands rebalanced to fix treble dominance
 *
 * Previous bands (severely imbalanced):
 * - Bass: 20Hz - 250Hz (230 Hz range, only 3% of spectrum)
 * - Mid: 250Hz - 4kHz (3,750 Hz range, 47% of spectrum)
 * - Treble: 4kHz - 20kHz (16,000 Hz range, 200% of spectrum!)
 *
 * New bands (Phase 8.1 - v2):
 * - Bass: 20Hz - 400Hz (380 Hz range, 11% of spectrum) - Expanded from 20-250Hz
 * - Mid: 400Hz - 4kHz (3,600 Hz range, 52% of spectrum) - Expanded from 250-4kHz
 * - Treble: 4kHz - 14kHz (10,000 Hz range, 37% of spectrum) - Narrowed from 4kHz-20kHz
 *
 * This creates a more balanced distribution that prevents treble from dominating
 * class selection (which caused over-representation of Rogues/Rangers/Monks).
 */

import type { FrequencyBands } from '../types/AudioProfile.js';

/** Current frequency band version (used for tracking audio profile format changes) */
export const CURRENT_BAND_VERSION = 2;

export class SpectrumScanner {
    /**
     * Separate frequency data into bass, mid, and treble bands
     *
     * **Band v2 ranges (Phase 8.1)**:
     * - Bass: 20Hz - 400Hz (expanded from 20-250Hz)
     * - Mid: 400Hz - 4kHz (expanded from 250-4kHz)
     * - Treble: 4kHz - 14kHz (narrowed from 4kHz-20kHz)
     *
     * These rebalanced ranges prevent treble dominance that caused over-representation
     * of dexterity-based classes (Rogue, Ranger, Monk).
     *
     * @param frequencyData - Raw FFT frequency data from audio analysis
     * @param sampleRate - Audio sample rate in Hz (typically 44100 or 48000)
     * @returns Frequency bands with normalized amplitude values (0-1)
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

            // Phase 8.1: Rebalanced frequency bands (v2)
            // Bass expanded: 20-400Hz (was 20-250Hz)
            // Mid expanded: 400-4000Hz (was 250-4000Hz)
            // Treble narrowed: 4000-14000Hz (was 4000-20000Hz)
            if (frequency >= 20 && frequency < 400) {
                bass.push(amplitude);
            } else if (frequency >= 400 && frequency < 4000) {
                mid.push(amplitude);
            } else if (frequency >= 4000 && frequency <= 14000) {
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
