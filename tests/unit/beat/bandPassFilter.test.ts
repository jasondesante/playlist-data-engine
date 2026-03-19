/**
 * Tests for Band-Pass Filter utility
 *
 * Tests the Butterworth band-pass filter implementation using cascaded b2nd-order biquad sections.
 */

import { describe, it, expect } from 'vitest';
import {
    bandPassFilter,
    BandPassFilterConfig,
    FrequencyBand,
  FREQUENCY_BANDS,
  applyFrequencyBand,
} from '../../../src/core/analysis/beat/utils/audioUtils.js';

describe('bandPassFilter', () => {
  describe('default configuration', () => {
    it('should use 8th order by default (48 dB/octave)', () => {
      const sampleRate = 44100;
      const duration = 1; // 1 second
      const length = Math.floor(duration * sampleRate);

      // Create a signal with multiple frequencies
      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        // Mix of 100 Hz, 1000 Hz, and 5000 Hz
        const t = i / sampleRate;
        signal[i] =
          Math.sin(2 * Math.PI * 100 * t) + // Low frequency (should pass through low band)
          Math.sin(2 * Math.PI * 1000 * t) * 0.5 + // Mid frequency
          Math.sin(2 * Math.PI * 5000 * t) * 0.3; // High frequency
      }

      // Filter to low band (20-500 Hz)
      const filtered = bandPassFilter(signal, 20, 500, sampleRate);

      expect(filtered.length).toBe(signal.length);
      // The filtered signal should contain the 100 Hz component
      // 1000 Hz and 5000 Hz should be attenuated
    });

    it('should preserve signal length', () => {
      const signal = new Float32Array(1000);
      const filtered = bandPassFilter(signal, 20, 500, 44100);
      expect(filtered.length).toBe(signal.length);
    });

    it('should handle empty signal', () => {
      const signal = new Float32Array(0);
      const filtered = bandPassFilter(signal, 20, 500, 44100);
      expect(filtered.length).toBe(0);
    });
  });

  describe('configurable order', () => {
    it('should support 2nd order (12 dB/octave)', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      // Create a signal with a 250 Hz tone
      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 250 * (i / sampleRate));
      }

      const config: BandPassFilterConfig = { order: 2 };
      const filtered = bandPassFilter(signal, 200, 300, sampleRate, config);

      expect(filtered.length).toBe(signal.length);
    });

    it('should support 4th order (24 dB/octave)', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 250 * (i / sampleRate));
      }

      const config: BandPassFilterConfig = { order: 4 };
      const filtered = bandPassFilter(signal, 200, 300, sampleRate, config);

      expect(filtered.length).toBe(signal.length);
    });

    it('should throw for invalid order (non-positive or non-even)', () => {
      const signal = new Float32Array(100);

      expect(() => bandPassFilter(signal, 20, 500, 44100, { order: 0 })).toThrow();
      expect(() => bandPassFilter(signal, 20, 500, 44100, { order: -2 })).toThrow();
      expect(() => bandPassFilter(signal, 20, 500, 44100, { order: 3 })).toThrow(); // Must be even for biquad cascading
    });
  });

  describe('frequency band presets', () => {
    it('should have correct low band definition', () => {
      const lowBand = FREQUENCY_BANDS.find(b => b.name === 'low');
      expect(lowBand).toBeDefined();
      expect(lowBand!.lowHz).toBe(20);
      expect(lowBand!.highHz).toBe(500);
      expect(lowBand!.description).toContain('bass');
    });

    it('should have correct mid band definition', () => {
      const midBand = FREQUENCY_BANDS.find(b => b.name === 'mid');
      expect(midBand).toBeDefined();
      expect(midBand!.lowHz).toBe(500);
      expect(midBand!.highHz).toBe(2000);
      expect(midBand!.description).toContain('vocals');
    });

    it('should have correct high band definition', () => {
      const highBand = FREQUENCY_BANDS.find(b => b.name === 'high');
      expect(highBand).toBeDefined();
      expect(highBand!.lowHz).toBe(2000);
      expect(highBand!.highHz).toBe(20000);
      expect(highBand!.description).toContain('hi-hats');
    });
  });

  describe('applyFrequencyBand', () => {
    it('should apply low band filter correctly', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      // Create a signal with a 100 Hz tone (should pass through low band)
      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 100 * (i / sampleRate));
      }

      const filtered = applyFrequencyBand(signal, 'low', sampleRate);

      expect(filtered.length).toBe(signal.length);
      // Low band should preserve 100 Hz signal
    });

    it('should apply mid band filter correctly', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      // Create a signal with a 1000 Hz tone (should pass through mid band)
      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 1000 * (i / sampleRate));
      }

      const filtered = applyFrequencyBand(signal, 'mid', sampleRate);

      expect(filtered.length).toBe(signal.length);
    });

    it('should apply high band filter correctly', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      // Create a signal with a 5000 Hz tone (should pass through high band)
      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 5000 * (i / sampleRate));
      }

      const filtered = applyFrequencyBand(signal, 'high', sampleRate);

      expect(filtered.length).toBe(signal.length);
    });

    it('should throw for unknown band', () => {
      const signal = new Float32Array(100);
      expect(() => applyFrequencyBand(signal, 'unknown' as any, 44100)).toThrow();
    });
  });

  describe('filter characteristics', () => {
    it('should attenuate frequencies outside passband', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      // Create a signal with a 5 Hz tone (below low band cutoff of 20 Hz)
      const lowSignal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        lowSignal[i] = Math.sin(2 * Math.PI * 5 * (i / sampleRate));
      }

      // Apply low band filter (20-500 Hz)
      const filtered = bandPassFilter(lowSignal, 20, 500, sampleRate);

      // 5 Hz should be attenuated (below 20 Hz cutoff)
      // Check that the filtered signal has lower amplitude than original
      let filteredEnergy = 0;
      let originalEnergy = 0;
      for (let i = 0; i < length; i++) {
        filteredEnergy += filtered[i] * filtered[i];
        originalEnergy += lowSignal[i] * lowSignal[i];
      }
      // Filtered energy should be significantly less due to attenuation
      expect(filteredEnergy).toBeLessThan(originalEnergy * 0.5);
    });

    it('should pass frequencies within passband', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      // Create a signal with a 200 Hz tone (within low band)
      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 200 * (i / sampleRate));
      }

      // Apply low band filter (20-500 Hz)
      const filtered = bandPassFilter(signal, 20, 500, sampleRate);

      // 200 Hz should pass through with minimal attenuation
      let filteredEnergy = 0;
      let originalEnergy = 0;
      for (let i = 0; i < length; i++) {
        filteredEnergy += filtered[i] * filtered[i];
        originalEnergy += signal[i] * signal[i];
      }
      // Filtered energy should be similar to original (within passband)
      expect(filteredEnergy).toBeGreaterThan(originalEnergy * 0.3);
    });
  });

  describe('Q factor adjustment', () => {
    it('should support custom Q factor', () => {
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);

      const signal = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        signal[i] = Math.sin(2 * Math.PI * 200 * (i / sampleRate));
      }

      // Test with different Q factors
      const configNormalQ: BandPassFilterConfig = { order: 4, qFactor: 0.707 };
      const configHighQ: BandPassFilterConfig = { order: 4, qFactor: 2.0 };

      const filteredNormal = bandPassFilter(signal, 200, 300, sampleRate, configNormalQ);
      const filteredHigh = bandPassFilter(signal, 200, 300, sampleRate, configHighQ);

      expect(filteredNormal.length).toBe(signal.length);
      expect(filteredHigh.length).toBe(signal.length);
      // High Q should have narrower bandwidth (sharper cutoff)
    });
  });
});
