/**
 * Test setup file for vitest
 * Uses real Web Audio API via web-audio-api package for authentic audio analysis
 * Uses node-canvas for Canvas API support in Node.js environment
 * Provides comprehensive browser API mocks for headless testing
 */

// @ts-ignore - web-audio-api has no type definitions
import { AudioContext, OfflineAudioContext } from 'web-audio-api';
// @ts-ignore - canvas has type definitions but we're using it in a special way
import { createCanvas, Image as CanvasImage } from 'canvas';
import { setupBrowserAPIMocks, teardownBrowserAPIMocks } from './mocks/browserAPIs';

// Provide real Web Audio API to global scope (works in both browser and Node.js)
// @ts-ignore
globalThis.AudioContext = AudioContext;
// @ts-ignore
globalThis.OfflineAudioContext = OfflineAudioContext;

// Provide Canvas API to global scope for ColorExtractor tests
// @ts-ignore
globalThis.HTMLCanvasElement = class HTMLCanvasElement {
    width: number = 0;
    height: number = 0;
    private _canvas: any;

    constructor() {
        this._canvas = createCanvas(0, 0);
    }

    getContext(contextId: string, options?: any) {
        if (contextId === '2d') {
            // Update the internal canvas size when getContext is called
            this._canvas.width = this.width;
            this._canvas.height = this.height;
            return this._canvas.getContext('2d', options);
        }
        return null;
    }
};

// Provide Image API to global scope
// @ts-ignore
globalThis.Image = CanvasImage;

// Also set on window/document if it exists (for browser compatibility)
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.AudioContext = AudioContext;
    // @ts-ignore
    window.OfflineAudioContext = OfflineAudioContext;
}

// Mock document.createElement for canvas
if (typeof document !== 'undefined') {
    const originalCreateElement = document.createElement.bind(document);
    // @ts-ignore
    document.createElement = function (tagName: string) {
        if (tagName === 'canvas') {
            // @ts-ignore
            return new globalThis.HTMLCanvasElement();
        }
        return originalCreateElement(tagName);
    };
}

// Setup browser API mocks for headless testing
// This provides mock implementations of:
// - navigator.geolocation (Geolocation API)
// - DeviceMotionEvent (motion detection)
// - DeviceOrientationEvent (orientation detection)
// - AmbientLightSensor (ambient light detection)
// - localStorage (storage API)
setupBrowserAPIMocks();

// Setup hooks for vitest to cleanup mocks after each test
if (typeof afterEach !== 'undefined') {
    afterEach(() => {
        teardownBrowserAPIMocks();
        // Re-setup mocks for next test
        setupBrowserAPIMocks();
    });
}

// Also export for direct use if needed
export { AudioContext, OfflineAudioContext };
export * from './mocks/browserAPIs';
