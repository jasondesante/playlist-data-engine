/**
 * Test setup file for vitest
 * Uses real Web Audio API via web-audio-api package for authentic audio analysis
 */

// @ts-ignore - web-audio-api has no type definitions
import { AudioContext, OfflineAudioContext } from 'web-audio-api';

// Provide real Web Audio API to global scope (works in both browser and Node.js)
// @ts-ignore
globalThis.AudioContext = AudioContext;
// @ts-ignore
globalThis.OfflineAudioContext = OfflineAudioContext;

// Also set on window if it exists (for browser compatibility)
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.AudioContext = AudioContext;
    // @ts-ignore
    window.OfflineAudioContext = OfflineAudioContext;
}

// Also export for direct use if needed
export { AudioContext, OfflineAudioContext };
