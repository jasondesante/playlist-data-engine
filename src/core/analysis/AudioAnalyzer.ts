/**
 * Audio analysis using Web Audio API with "Triple Tap" strategy
 */

import type { AudioProfile, FrequencyBands } from '../types/AudioProfile.js';

export interface AudioAnalyzerOptions {
    /** Include advanced metrics (spectral_centroid, spectral_rolloff, zero_crossing_rate) */
    includeAdvancedMetrics?: boolean;

    /** Sample rate for analysis */
    sampleRate?: number;

    /** FFT size (must be power of 2) */
    fftSize?: number;
}

export class AudioAnalyzer {
    private options: AudioAnalyzerOptions;

    constructor(options: AudioAnalyzerOptions = {}) {
        this.options = {
            includeAdvancedMetrics: false,
            sampleRate: 44100,
            fftSize: 2048,
            ...options,
        };
    }

    /**
     * Extract sonic fingerprint from audio URL
     * Uses "Triple Tap" strategy: analyze at 5%, 40%, and 70% positions
     */
    async extractSonicFingerprint(audioUrl: string): Promise<AudioProfile> {
        // Fetch audio data
        const response = await fetch(audioUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        // Decode audio data
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const duration = audioBuffer.duration;
        const sampleRate = audioBuffer.sampleRate;

        // Determine if we should analyze the full buffer (< 3 seconds)
        const fullBufferAnalyzed = duration < 3;

        let samplePositions: number[];
        if (fullBufferAnalyzed) {
            // Analyze entire buffer
            samplePositions = [0];
        } else {
            // Triple Tap: 5%, 40%, 70%
            samplePositions = [0.05, 0.40, 0.70];
        }

        // Analyze each sample position
        const frequencyDataSamples: FrequencyBands[] = [];

        for (const position of samplePositions) {
            const frequencyData = await this.analyzeAtPosition(
                audioBuffer,
                position,
                fullBufferAnalyzed
            );
            frequencyDataSamples.push(frequencyData);
        }

        // Average the frequency data across all samples
        const averagedBands = this.averageFrequencyBands(frequencyDataSamples);

        // Calculate dominance metrics
        const bassDominance = this.calculateDominance(averagedBands.bass);
        const midDominance = this.calculateDominance(averagedBands.mid);
        const trebleDominance = this.calculateDominance(averagedBands.treble);

        // Calculate average amplitude
        const averageAmplitude = this.calculateAverageAmplitude(audioBuffer);

        // Build audio profile
        const profile: AudioProfile = {
            bass_dominance: bassDominance,
            mid_dominance: midDominance,
            treble_dominance: trebleDominance,
            average_amplitude: averageAmplitude,
            analysis_metadata: {
                duration_analyzed: fullBufferAnalyzed ? duration : duration * samplePositions.length * 0.01,
                full_buffer_analyzed: fullBufferAnalyzed,
                sample_positions: samplePositions,
                analyzed_at: new Date().toISOString(),
            },
        };

        // Add advanced metrics if requested
        if (this.options.includeAdvancedMetrics) {
            const allFrequencies = [
                ...averagedBands.bass,
                ...averagedBands.mid,
                ...averagedBands.treble,
            ];

            profile.spectral_centroid = this.calculateSpectralCentroid(allFrequencies);
            profile.spectral_rolloff = this.calculateSpectralRolloff(allFrequencies);
            profile.zero_crossing_rate = this.calculateZeroCrossingRate(audioBuffer);
        }

        return profile;
    }

    /**
     * Analyze audio at a specific position
     */
    private async analyzeAtPosition(
        audioBuffer: AudioBuffer,
        position: number,
        analyzeFullBuffer: boolean
    ): Promise<FrequencyBands> {
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        // Calculate start and end samples
        let startSample: number;
        let endSample: number;

        if (analyzeFullBuffer) {
            startSample = 0;
            endSample = audioBuffer.length;
        } else {
            // Analyze 1 second at the given position
            const positionInSeconds = duration * position;
            startSample = Math.floor(positionInSeconds * sampleRate);
            endSample = Math.min(startSample + sampleRate, audioBuffer.length);
        }

        // Extract the audio segment
        const segmentLength = endSample - startSample;
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            segmentLength,
            sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        const analyser = offlineContext.createAnalyser();
        analyser.fftSize = this.options.fftSize!;

        source.connect(analyser);
        analyser.connect(offlineContext.destination);

        source.start(0, startSample / sampleRate, segmentLength / sampleRate);

        await offlineContext.startRendering();

        // Get frequency data
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);

        // Separate into frequency bands
        return this.separateFrequencyBands(frequencyData, sampleRate);
    }

    /**
     * Separate frequency data into bass, mid, and treble bands
     */
    private separateFrequencyBands(
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
     * Average frequency bands across multiple samples
     */
    private averageFrequencyBands(samples: FrequencyBands[]): FrequencyBands {
        if (samples.length === 0) {
            return { bass: [], mid: [], treble: [] };
        }

        if (samples.length === 1) {
            return samples[0];
        }

        // Average each band
        const maxLength = Math.max(
            ...samples.map(s => Math.max(s.bass.length, s.mid.length, s.treble.length))
        );

        const bass: number[] = [];
        const mid: number[] = [];
        const treble: number[] = [];

        for (let i = 0; i < maxLength; i++) {
            const bassValues = samples.map(s => s.bass[i] || 0);
            const midValues = samples.map(s => s.mid[i] || 0);
            const trebleValues = samples.map(s => s.treble[i] || 0);

            bass.push(bassValues.reduce((a, b) => a + b, 0) / bassValues.length);
            mid.push(midValues.reduce((a, b) => a + b, 0) / midValues.length);
            treble.push(trebleValues.reduce((a, b) => a + b, 0) / trebleValues.length);
        }

        return { bass, mid, treble };
    }

    /**
     * Calculate dominance (average amplitude) for a frequency band
     */
    private calculateDominance(band: number[]): number {
        if (band.length === 0) return 0;
        const sum = band.reduce((a, b) => a + b, 0);
        return sum / band.length;
    }

    /**
     * Calculate average amplitude across all channels
     */
    private calculateAverageAmplitude(audioBuffer: AudioBuffer): number {
        let sum = 0;
        let count = 0;

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                sum += Math.abs(data[i]);
                count++;
            }
        }

        return count > 0 ? sum / count : 0;
    }

    /**
     * Calculate spectral centroid (brightness)
     */
    private calculateSpectralCentroid(frequencies: number[]): number {
        let weightedSum = 0;
        let sum = 0;

        for (let i = 0; i < frequencies.length; i++) {
            weightedSum += i * frequencies[i];
            sum += frequencies[i];
        }

        return sum > 0 ? weightedSum / sum : 0;
    }

    /**
     * Calculate spectral rolloff (frequency below which 85% of energy is contained)
     */
    private calculateSpectralRolloff(frequencies: number[]): number {
        const totalEnergy = frequencies.reduce((a, b) => a + b, 0);
        const threshold = totalEnergy * 0.85;

        let cumulativeEnergy = 0;
        for (let i = 0; i < frequencies.length; i++) {
            cumulativeEnergy += frequencies[i];
            if (cumulativeEnergy >= threshold) {
                return i / frequencies.length;
            }
        }

        return 1.0;
    }

    /**
     * Calculate zero crossing rate (measure of noisiness/percussiveness)
     */
    private calculateZeroCrossingRate(audioBuffer: AudioBuffer): number {
        let crossings = 0;
        let totalSamples = 0;

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const data = audioBuffer.getChannelData(channel);
            for (let i = 1; i < data.length; i++) {
                if ((data[i - 1] >= 0 && data[i] < 0) || (data[i - 1] < 0 && data[i] >= 0)) {
                    crossings++;
                }
                totalSamples++;
            }
        }

        return totalSamples > 0 ? crossings / totalSamples : 0;
    }
}
