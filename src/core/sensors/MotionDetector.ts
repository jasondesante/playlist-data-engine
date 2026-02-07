import type { MotionData } from '../types/Environmental';
import { Logger } from '../../utils/logger.js';

export class MotionDetector {
    private logger = Logger.for('MotionDetector');
    private isListening: boolean = false;
    private lastMotion: MotionData | null = null;
    private motionCallback: ((data: MotionData) => void) | null = null;

    /**
     * Start listening for motion events
     * @param callback Callback function to receive motion data
     */
    startMonitoring(callback: (data: MotionData) => void): void {
        if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
            this.logger.warn('DeviceMotionEvent not supported');
            return;
        }

        this.motionCallback = callback;
        this.isListening = true;
        window.addEventListener('devicemotion', this.handleMotion);
    }

    /**
     * Stop listening for motion events
     */
    stopMonitoring(): void {
        if (typeof window !== 'undefined') {
            window.removeEventListener('devicemotion', this.handleMotion);
        }
        this.isListening = false;
        this.motionCallback = null;
    }

    /**
     * Get the last recorded motion data
     */
    getLastMotion(): MotionData | null {
        return this.lastMotion;
    }

    /**
     * Detect activity type based on motion intensity
     * @param data MotionData to analyze
     * @returns 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
     *
     * @remarks
     * Valid acceleration range: Any number (including 0) is valid.
     * A value of 0 represents no acceleration in that axis.
     * Only null or undefined values indicate missing sensor data.
     */
    detectActivity(data: MotionData): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown' {
        const acc = data.accelerationIncludingGravity;
        // Check for null/undefined explicitly - 0 is a valid acceleration value
        if (acc.x == null || acc.y == null || acc.z == null) return 'unknown';

        // Calculate magnitude of acceleration vector (minus gravity approx 9.8)
        // This is a very rough heuristic
        const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
        const delta = Math.abs(magnitude - 9.8);

        if (delta < 0.5) return 'stationary';
        if (delta < 2.0) return 'walking';
        if (delta < 5.0) return 'running';
        return 'driving'; // High sustained forces or very smooth high speed (GPS needed for real driving detection)
    }

    private handleMotion = (event: DeviceMotionEvent) => {
        if (!this.isListening || !this.motionCallback) return;

        const data: MotionData = {
            acceleration: {
                x: event.acceleration?.x ?? null,
                y: event.acceleration?.y ?? null,
                z: event.acceleration?.z ?? null,
            },
            accelerationIncludingGravity: {
                x: event.accelerationIncludingGravity?.x ?? 0,
                y: event.accelerationIncludingGravity?.y ?? 0,
                z: event.accelerationIncludingGravity?.z ?? 0,
            },
            rotationRate: {
                alpha: event.rotationRate?.alpha ?? null,
                beta: event.rotationRate?.beta ?? null,
                gamma: event.rotationRate?.gamma ?? null,
            },
            interval: event.interval,
            timestamp: Date.now()
        };

        this.lastMotion = data;

        // Debug logging for motion data (conditional on log level)
        this.logger.debug('Motion event received', {
            acceleration: data.accelerationIncludingGravity,
            rotation: data.rotationRate,
            activity: this.detectActivity(data)
        });

        this.motionCallback(data);
    };
}
