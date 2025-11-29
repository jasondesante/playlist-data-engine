/**
 * Test setup file for vitest
 */

// Add any global test setup here
// For example, mocking browser APIs that aren't available in jsdom

// Mock Web Audio API for testing
if (typeof window !== 'undefined' && !window.AudioContext) {
    // @ts-ignore
    window.AudioContext = class MockAudioContext {
        createOscillator() {
            return {
                connect: () => { },
                start: () => { },
                stop: () => { },
            };
        }

        createGain() {
            return {
                connect: () => { },
                gain: { value: 1 },
            };
        }

        destination = {};
    };

    // @ts-ignore
    window.OfflineAudioContext = class MockOfflineAudioContext {
        constructor(public numberOfChannels: number, public length: number, public sampleRate: number) { }

        createBufferSource() {
            return {
                buffer: null,
                connect: () => { },
                start: () => { },
            };
        }

        createAnalyser() {
            return {
                fftSize: 2048,
                frequencyBinCount: 1024,
                connect: () => { },
                getByteFrequencyData: () => { },
            };
        }

        startRendering() {
            return Promise.resolve({
                getChannelData: () => new Float32Array(this.length),
                numberOfChannels: this.numberOfChannels,
                length: this.length,
                sampleRate: this.sampleRate,
            });
        }

        destination = {};
    };
}
