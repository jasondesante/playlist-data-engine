import type { MotionData } from '../types/Environmental';
import { Logger } from '../../utils/logger.js';

export class MotionDetector {
    private logger = Logger.for('MotionDetector');
    private isListening: boolean = false;
    private lastMotion: MotionData | null = null;
    private motionCallback: ((data: MotionData) => void) | null = null;

    // Sampling throttle — processes only every ~5th event (~12Hz instead of ~60Hz)
    // Reduces CPU work by ~80% with no meaningful loss in activity detection accuracy.
    private lastProcessedTime: number = 0;
    private readonly minSampleIntervalMs = 83; // ~12Hz

    // Activity smoothing state
    // Accumulates acceleration deltas in handleMotion, read by detectActivity.
    // This prevents jittery state changes when walking causes acceleration to
    // oscillate between stationary and walking thresholds on each step.
    private deltaBuffer: number[] = [];
    private readonly bufferSize = 24; // ~2 seconds at 12Hz
    private confirmedActivity: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown' = 'unknown';
    private candidateActivity: 'stationary' | 'walking' | 'running' | 'driving' | 'unknown' | null = null;
    private candidateStartTime: number = 0;
    private readonly confirmationMs = 1500; // new state must persist this long before confirming

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

        // Reset smoothing state on each monitoring session
        this.deltaBuffer = [];
        this.confirmedActivity = 'unknown';
        this.candidateActivity = null;

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

        // Reset smoothing state
        this.deltaBuffer = [];
        this.confirmedActivity = 'unknown';
        this.candidateActivity = null;
    }

    /**
     * Get the last recorded motion data
     */
    getLastMotion(): MotionData | null {
        return this.lastMotion;
    }

    /**
     * Detect activity type based on smoothed motion data
     * @param data MotionData to analyze
     * @returns 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'
     *
     * @remarks
     * When the smoothing buffer has enough samples (from live monitoring),
     * returns the confirmed activity state which only changes after the new
     * state has been sustained for `confirmationMs`. This prevents rapid
     * flickering between stationary/walking when the accelerometer oscillates
     * during each footfall.
     *
     * Falls back to instantaneous classification when the buffer is empty
     * (e.g. before monitoring starts or on devices without real accelerometers).
     */
    detectActivity(data: MotionData): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown' {
        const acc = data.accelerationIncludingGravity;
        // Check for null/undefined explicitly - 0 is a valid acceleration value
        if (acc.x == null || acc.y == null || acc.z == null) return 'unknown';

        // Check for all-zero values - this typically means the device doesn't have
        // a real accelerometer (e.g., desktop browser) and we can't detect activity
        if (acc.x === 0 && acc.y === 0 && acc.z === 0) return 'unknown';

        // When we have a populated smoothing buffer, use the confirmed state
        // which requires sustained evidence before changing in either direction
        if (this.deltaBuffer.length >= 10) {
            return this.confirmedActivity;
        }

        // Fallback to instantaneous classification when buffer is empty
        const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
        const delta = Math.abs(magnitude - 9.8);

        if (delta < 0.5) return 'stationary';
        if (delta < 2.0) return 'walking';
        if (delta < 5.0) return 'running';
        return 'driving';
    }

    /**
     * Feed a new acceleration delta into the smoothing buffer and update
     * the confirmed activity state.
     *
     * The smoothing works bidirectionally:
     * - stationary → walking requires sustained motion above the threshold
     * - walking → stationary requires sustained stillness below the threshold
     *
     * Both directions require the new state to persist for `confirmationMs`
     * before the confirmed state changes, preventing UI jitter.
     */
    private updateSmoothing(delta: number): void {
        this.deltaBuffer.push(delta);
        if (this.deltaBuffer.length > this.bufferSize) {
            this.deltaBuffer.shift();
        }

        // Classify the mean delta over the window
        const mean = this.deltaBuffer.reduce((a, b) => a + b, 0) / this.deltaBuffer.length;

        let current: 'stationary' | 'walking' | 'running' | 'driving';
        if (mean < 0.5) current = 'stationary';
        else if (mean < 2.0) current = 'walking';
        else if (mean < 5.0) current = 'running';
        else current = 'driving';

        // Already in this state — clear any pending candidate
        if (current === this.confirmedActivity) {
            this.candidateActivity = null;
            return;
        }

        // New state detected — start or continue the candidate timer
        if (current !== this.candidateActivity) {
            this.candidateActivity = current;
            this.candidateStartTime = Date.now();
            return;
        }

        // Candidate has been sustained long enough — confirm the transition
        if (Date.now() - this.candidateStartTime >= this.confirmationMs) {
            this.confirmedActivity = current;
            this.candidateActivity = null;
        }
    }

    private handleMotion = (event: DeviceMotionEvent) => {
        if (!this.isListening || !this.motionCallback) return;

        const now = Date.now();

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
            timestamp: now
        };

        // Always store latest reading (trivial cost)
        this.lastMotion = data;

        // Throttle smoothing, logging, and callback to ~12Hz
        if (now - this.lastProcessedTime < this.minSampleIntervalMs) return;
        this.lastProcessedTime = now;

        // Feed into the smoothing buffer
        const acc = data.accelerationIncludingGravity;
        if (acc.x != null && acc.y != null && acc.z != null) {
            if (!(acc.x === 0 && acc.y === 0 && acc.z === 0)) {
                const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
                const delta = Math.abs(magnitude - 9.8);
                this.updateSmoothing(delta);
            }
        }

        // Debug logging for motion data (conditional on log level)
        this.logger.debug('Motion event received', {
            acceleration: data.accelerationIncludingGravity,
            rotation: data.rotationRate,
            activity: this.detectActivity(data)
        });

        this.motionCallback(data);
    };
}
