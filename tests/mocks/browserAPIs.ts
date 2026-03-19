/**
 * Browser API Mocks for Headless Testing
 *
 * This module provides comprehensive mocks for browser APIs that are not available
 * in Node.js/headless CI environments. These mocks enable tests to run without
 * requiring a real browser environment.
 *
 * Mocked APIs:
 * - Geolocation API (navigator.geolocation)
 * - DeviceMotionEvent (window.addEventListener('devicemotion'))
 * - DeviceOrientationEvent (window.addEventListener('deviceorientation'))
 * - AmbientLightSensor (Experimental Web Generic Sensor API)
 * - localStorage (for browser environments that don't have it)
 */

/**
 * Extend global types for browser API mocks
 * This allows TypeScript to recognize the mocked APIs we add to globalThis
 */
declare global {
    interface Navigator {
        geolocation?: Geolocation;
    }

    interface Window {
        addEventListener?: (
            type: string,
            listener: (event: DeviceMotionEvent | DeviceOrientationEvent) => void
        ) => void;
        removeEventListener?: (
            type: string,
            listener: (event: DeviceMotionEvent | DeviceOrientationEvent) => void
        ) => void;
    }

    // Extend globalThis directly for Node.js environments
    var globalThis: {
        navigator?: {
            geolocation?: Geolocation;
        };
        addEventListener?: (
            type: string,
            listener: (event: DeviceMotionEvent | DeviceOrientationEvent) => void
        ) => void;
        removeEventListener?: (
            type: string,
            listener: (event: DeviceMotionEvent | DeviceOrientationEvent) => void
        ) => void;
        AmbientLightSensor?: new () => MockAmbientLightSensor;
        localStorage?: Storage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    } & typeof globalThis;
}

export {}; // Ensure this is treated as a module

/**
 * Geolocation API Mock
 *
 * Provides mock implementation of navigator.geolocation.getCurrentPosition()
 * and navigator.geolocation.watchPosition() with controllable behavior.
 */

export interface MockGeolocationPosition {
    coords: {
        latitude: number;
        longitude: number;
        altitude: number | null;
        accuracy: number;
        altitudeAccuracy: number | null;
        heading: number | null;
        speed: number | null;
    };
    timestamp: number;
}

export interface MockGeolocationError {
    code: number;
    message: string;
    PERMISSION_DENIED: number;
    POSITION_UNAVAILABLE: number;
    TIMEOUT: number;
}

export type GeolocationResultCallback = (
    success: MockGeolocationPosition | null,
    error: MockGeolocationError | null
) => void;

let mockGeolocationPosition: MockGeolocationPosition | null = null;
let mockGeolocationError: MockGeolocationError | null = null;
let geolocationWatchIds: Map<number, GeolocationResultCallback> = new Map();
let nextWatchId = 1;

/**
 * Set the mock geolocation position to be returned
 */
export function setMockGeolocationPosition(position: MockGeolocationPosition | null): void {
    mockGeolocationPosition = position;
    mockGeolocationError = null;
}

/**
 * Set the mock geolocation error to be returned
 */
export function setMockGeolocationError(error: MockGeolocationError | null): void {
    mockGeolocationError = error;
    mockGeolocationPosition = null;
}

/**
 * Reset geolocation mock state
 */
export function resetGeolocationMock(): void {
    mockGeolocationPosition = null;
    mockGeolocationError = null;
    geolocationWatchIds.clear();
    nextWatchId = 1;
}

/**
 * Trigger callbacks for all active geolocation watches
 */
export function triggerGeolocationWatches(): void {
    geolocationWatchIds.forEach((callback) => {
        callback(mockGeolocationPosition, mockGeolocationError);
    });
}

/**
 * Create a mock Geolocation API implementation
 */
export function createMockGeolocation() {
    const mockError = {
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
    };

    return {
        getCurrentPosition: (
            success: (position: GeolocationPosition) => void,
            error?: (error: GeolocationPositionError) => void,
            _options?: PositionOptions
        ) => {
            // Use setImmediate to simulate async behavior
            setTimeout(() => {
                if (mockGeolocationError) {
                    error?.({
                        code: mockGeolocationError.code,
                        message: mockGeolocationError.message,
                        PERMISSION_DENIED: mockError.PERMISSION_DENIED,
                        POSITION_UNAVAILABLE: mockError.POSITION_UNAVAILABLE,
                        TIMEOUT: mockError.TIMEOUT
                    } as GeolocationPositionError);
                } else if (mockGeolocationPosition) {
                    success(mockGeolocationPosition as unknown as GeolocationPosition);
                } else {
                    // Default fallback position if none set
                    success({
                        coords: {
                            latitude: 51.5074,
                            longitude: -0.1278,
                            altitude: null,
                            accuracy: 10,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null
                        },
                        timestamp: Date.now()
                    } as GeolocationPosition);
                }
            }, 0);
        },

        watchPosition: (
            success: (position: GeolocationPosition) => void,
            error?: (error: GeolocationPositionError) => void,
            _options?: PositionOptions
        ): number => {
            const watchId = nextWatchId++;

            const callback: GeolocationResultCallback = (pos, err) => {
                if (err) {
                    error?.({
                        code: err.code,
                        message: err.message,
                        PERMISSION_DENIED: mockError.PERMISSION_DENIED,
                        POSITION_UNAVAILABLE: mockError.POSITION_UNAVAILABLE,
                        TIMEOUT: mockError.TIMEOUT
                    } as GeolocationPositionError);
                } else if (pos) {
                    success(pos as unknown as GeolocationPosition);
                }
            };

            geolocationWatchIds.set(watchId, callback);

            // Trigger initial position
            setTimeout(() => callback(mockGeolocationPosition, mockGeolocationError), 0);

            return watchId;
        },

        clearWatch: (watchId: number) => {
            geolocationWatchIds.delete(watchId);
        }
    };
}

/**
 * Device Motion API Mock
 *
 * Provides mock implementation of DeviceMotionEvent for motion detection.
 * Allows simulating different activity types (stationary, walking, running, driving).
 */

export interface DeviceAcceleration {
    x: number | null;
    y: number | null;
    z: number | null;
}

export interface DeviceRotationRate {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
}

export interface MockDeviceMotionData {
    acceleration: DeviceAcceleration | null;
    accelerationIncludingGravity: DeviceAcceleration;
    rotationRate: DeviceRotationRate;
    interval: number;
}

export type ActivityType = 'stationary' | 'walking' | 'running' | 'driving';

let mockMotionActivity: ActivityType = 'stationary';
let motionListeners: Array<(event: DeviceMotionEvent) => void> = [];

/**
 * Set the mock motion activity type
 * This will generate appropriate DeviceMotionEvent data
 */
export function setMockMotionActivity(activity: ActivityType): void {
    mockMotionActivity = activity;
}

/**
 * Get motion data for a specific activity type
 */
function getMotionDataForActivity(activity: ActivityType): MockDeviceMotionData {
    // Base gravity vector (approximately 9.8 m/s²)
    const gravity = 9.8;

    switch (activity) {
        case 'stationary':
            return {
                acceleration: { x: 0.1, y: -0.1, z: 0.05 },
                accelerationIncludingGravity: { x: 0.1, y: 0.2, z: gravity },
                rotationRate: { alpha: 0.5, beta: 0.3, gamma: -0.2 },
                interval: 16
            };

        case 'walking':
            return {
                acceleration: { x: 0.5, y: 0.8, z: 0.3 },
                accelerationIncludingGravity: { x: 0.5, y: 1.2, z: gravity + 0.5 },
                rotationRate: { alpha: 5.0, beta: 3.0, gamma: -2.0 },
                interval: 16
            };

        case 'running':
            return {
                acceleration: { x: 1.5, y: 2.5, z: 0.8 },
                accelerationIncludingGravity: { x: 1.5, y: 3.2, z: gravity + 2.0 },
                rotationRate: { alpha: 15.0, beta: 8.0, gamma: -6.0 },
                interval: 16
            };

        case 'driving':
            return {
                acceleration: { x: 0.2, y: 0.5, z: 0.1 },
                accelerationIncludingGravity: { x: 0.2, y: 0.8, z: gravity + 5.0 },
                rotationRate: { alpha: 2.0, beta: 1.0, gamma: -0.5 },
                interval: 16
            };

        default:
            return {
                acceleration: { x: null, y: null, z: null },
                accelerationIncludingGravity: { x: 0, y: 0, z: gravity },
                rotationRate: { alpha: null, beta: null, gamma: null },
                interval: 16
            };
    }
}

/**
 * Reset motion mock state
 */
export function resetMotionMock(): void {
    mockMotionActivity = 'stationary';
    motionListeners = [];
}

/**
 * Trigger a motion event to all registered listeners
 */
export function triggerMotionEvent(activity?: ActivityType): void {
    const data = getMotionDataForActivity(activity ?? mockMotionActivity);

    const event = {
        acceleration: data.acceleration,
        accelerationIncludingGravity: data.accelerationIncludingGravity,
        rotationRate: data.rotationRate,
        interval: data.interval,
        type: 'devicemotion'
    } as DeviceMotionEvent;

    motionListeners.forEach(listener => listener(event));
}

/**
 * Create a mock DeviceMotionEvent implementation
 */
export function createMockDeviceMotionAPI() {
    return {
        addEventListener: (
            _type: string,
            listener: (event: DeviceMotionEvent) => void
        ) => {
            motionListeners.push(listener);
        },

        removeEventListener: (
            _type: string,
            listener: (event: DeviceMotionEvent) => void
        ) => {
            const index = motionListeners.indexOf(listener);
            if (index > -1) {
                motionListeners.splice(index, 1);
            }
        }
    };
}

/**
 * Device Orientation API Mock
 *
 * Provides mock implementation of DeviceOrientationEvent.
 */

export interface MockDeviceOrientationData {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
}

let mockOrientationData: MockDeviceOrientationData = {
    alpha: 0,
    beta: 0,
    gamma: 0,
    absolute: false
};

let orientationListeners: Array<(event: DeviceOrientationEvent) => void> = [];

/**
 * Set the mock device orientation data
 */
export function setMockOrientationData(data: MockDeviceOrientationData): void {
    mockOrientationData = data;
}

/**
 * Reset orientation mock state
 */
export function resetOrientationMock(): void {
    mockOrientationData = {
        alpha: 0,
        beta: 0,
        gamma: 0,
        absolute: false
    };
    orientationListeners = [];
}

/**
 * Trigger an orientation event to all registered listeners
 */
export function triggerOrientationEvent(data?: MockDeviceOrientationData): void {
    const orientation = data ?? mockOrientationData;

    const event = {
        alpha: orientation.alpha,
        beta: orientation.beta,
        gamma: orientation.gamma,
        absolute: orientation.absolute,
        type: 'deviceorientation'
    } as DeviceOrientationEvent;

    orientationListeners.forEach(listener => listener(event));
}

/**
 * Create a mock DeviceOrientationEvent implementation
 */
export function createMockDeviceOrientationAPI() {
    return {
        addEventListener: (
            _type: string,
            listener: (event: DeviceOrientationEvent) => void
        ) => {
            orientationListeners.push(listener);
        },

        removeEventListener: (
            _type: string,
            listener: (event: DeviceOrientationEvent) => void
        ) => {
            const index = orientationListeners.indexOf(listener);
            if (index > -1) {
                orientationListeners.splice(index, 1);
            }
        }
    };
}

/**
 * Ambient Light Sensor Mock
 *
 * Provides mock implementation of the Generic Sensor API's AmbientLightSensor.
 * This is an experimental API not available in most browsers.
 */

export interface MockAmbientLightSensor {
    illuminance: number | null;
    reading?: { illuminance: number };
    start: () => void;
    stop: () => void;
    addEventListener: (type: string, listener: (event: any) => void) => void;
    removeEventListener: (type: string, listener: (event: any) => void) => void;
}

let mockIlluminance: number | null = 500; // Default: typical indoor lighting
let lightSensorStarted = false;
let lightSensorListeners: Array<(event: { illuminance: number }) => void> = [];

/**
 * Set the mock illuminance value in lux
 */
export function setMockIlluminance(lux: number | null): void {
    mockIlluminance = lux;
    // Update reading if sensor is started
    if (lightSensorStarted && mockIlluminance !== null) {
        triggerLightReading();
    }
}

/**
 * Reset light sensor mock state
 */
export function resetLightSensorMock(): void {
    mockIlluminance = 500;
    lightSensorStarted = false;
    lightSensorListeners = [];
}

/**
 * Trigger a light reading event to all registered listeners
 */
export function triggerLightReading(): void {
    if (mockIlluminance === null) return;

    const event = { illuminance: mockIlluminance };
    lightSensorListeners.forEach(listener => listener(event));
}

/**
 * Create a mock AmbientLightSensor implementation
 */
export function createMockAmbientLightSensor(): MockAmbientLightSensor {
    return {
        illuminance: mockIlluminance,

        start() {
            lightSensorStarted = true;
            // Trigger initial reading after a short delay
            setTimeout(() => {
                if (mockIlluminance !== null) {
                    this.reading = { illuminance: mockIlluminance };
                    triggerLightReading();
                }
            }, 10);
        },

        stop() {
            lightSensorStarted = false;
        },

        addEventListener(_type: string, listener: (event: any) => void) {
            lightSensorListeners.push(listener);
        },

        removeEventListener(_type: string, listener: (event: any) => void) {
            const index = lightSensorListeners.indexOf(listener);
            if (index > -1) {
                lightSensorListeners.splice(index, 1);
            }
        }
    };
}

/**
 * Check if AmbientLightSensor is "supported" (can be controlled)
 */
export function setMockLightSensorSupported(supported: boolean): void {
    if (supported) {
        globalThis.AmbientLightSensor = createMockAmbientLightSensor();
    } else {
        delete globalThis.AmbientLightSensor;
    }
}

/**
 * localStorage Mock
 *
 * Provides a mock localStorage implementation for Node.js environments.
 * Note: jsdom already provides localStorage, but this can be useful
 * for pure Node.js testing environments.
 */

export class MockStorage implements Storage {
    private store: Record<string, string> = {};

    get length(): number {
        return Object.keys(this.store).length;
    }

    clear(): void {
        this.store = {};
    }

    getItem(key: string): string | null {
        return this.store[key] ?? null;
    }

    setItem(key: string, value: string): void {
        this.store[key] = String(value);
    }

    removeItem(key: string): void {
        delete this.store[key];
    }

    key(index: number): string | null {
        const keys = Object.keys(this.store);
        return keys[index] ?? null;
    }

    /**
     * Get all stored items (useful for testing)
     */
    getAll(): Record<string, string> {
        return { ...this.store };
    }
}

/**
 * Setup all browser API mocks
 *
 * Call this function in test setup files to enable all browser API mocks.
 */
export function setupBrowserAPIMocks(): void {
    // Setup Geolocation API
    if (typeof globalThis.navigator === 'undefined') {
        globalThis.navigator = {};
    }
    globalThis.navigator.geolocation = createMockGeolocation();

    // Setup DeviceMotionEvent via window.addEventListener
    if (typeof globalThis.addEventListener === 'undefined') {
        globalThis.addEventListener = createMockDeviceMotionAPI().addEventListener;
        globalThis.removeEventListener = createMockDeviceMotionAPI().removeEventListener;
    }

    // Setup AmbientLightSensor
    setMockLightSensorSupported(true);

    // Setup localStorage if not available
    if (typeof globalThis.localStorage === 'undefined') {
        const mockStorage = new MockStorage();
        globalThis.localStorage = mockStorage;
    }
}

/**
 * Teardown all browser API mocks
 *
 * Call this function in test teardown to reset all mock states.
 */
export function teardownBrowserAPIMocks(): void {
    resetGeolocationMock();
    resetMotionMock();
    resetOrientationMock();
    resetLightSensorMock();
}

/**
 * Export all mock types and utilities
 */
export default {
    // Geolocation
    setMockGeolocationPosition,
    setMockGeolocationError,
    resetGeolocationMock,
    triggerGeolocationWatches,

    // Motion
    setMockMotionActivity,
    resetMotionMock,
    triggerMotionEvent,

    // Orientation
    setMockOrientationData,
    resetOrientationMock,
    triggerOrientationEvent,

    // Light
    setMockIlluminance,
    resetLightSensorMock,
    triggerLightReading,
    setMockLightSensorSupported,

    // Setup/teardown
    setupBrowserAPIMocks,
    teardownBrowserAPIMocks
};
