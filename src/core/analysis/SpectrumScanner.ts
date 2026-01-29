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
     *
     * **Phase 8.2 Update**: Added bandwidth-aware normalization to prevent
     * wider frequency bands from dominating the dominance calculation.
     *
     * Previously, wider bands had more frequency bins, so their averages were
     * naturally higher even if music wasn't louder in those ranges. This version
     * normalizes by bandwidth (per kHz) to create fair comparisons across bands.
     *
     * @param band - Array of amplitude values for a frequency band
     * @param bandWidthHz - Width of the frequency band in Hz (e.g., 380 for bass: 400-20)
     * @returns Normalized dominance value (typically 0-1, may exceed 1 for very loud bands)
     */
    static calculateDominance(band: number[], bandWidthHz?: number): number {
        if (band.length === 0) return 0;
        const sum = band.reduce((a, b) => a + b, 0);
        const average = sum / band.length;

        // Phase 8.2: Normalize by bandwidth (per kHz) to prevent wider bands from dominating
        // If no bandwidth provided, use legacy behavior (backward compatibility)
        if (bandWidthHz === undefined) {
            return average;
        }

        // Normalize by bandwidth (per kHz) - wider bands get divided by larger values
        // This prevents bands with more frequency bins from having artificially high averages
        return average / (bandWidthHz / 1000);
    }
}
