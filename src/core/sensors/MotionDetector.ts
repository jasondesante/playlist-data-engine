import type { MotionData } from '../types/Environmental';

export class MotionDetector {
    private isListening: boolean = false;
    private lastMotion: MotionData | null = null;
    private motionCallback: ((data: MotionData) => void) | null = null;

    /**
     * Start listening for motion events
     * @param callback Callback function to receive motion data
     */
    startMonitoring(callback: (data: MotionData) => void): void {
        if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
            console.warn('DeviceMotionEvent not supported');
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
     * @returns 'stationary' | 'walking' | 'running' | 'driving'
     */
    detectActivity(data: MotionData): 'stationary' | 'walking' | 'running' | 'driving' {
        const acc = data.accelerationIncludingGravity;
        if (!acc.x || !acc.y || !acc.z) return 'stationary';

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
                x: event.accelerationIncludingGravity?.x ?? null,
                y: event.accelerationIncludingGravity?.y ?? null,
                z: event.accelerationIncludingGravity?.z ?? null,
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

        // ADD THIS FOR DEBUGGING
        console.log('[MotionDetector] Live data actually no bullshit →', { data });
        console.log('[MotionDetector] Live data →', {
            acc: data.accelerationIncludingGravity,
            rot: data.rotationRate,
            activity: this.detectActivity(data)
        });

        this.motionCallback(data);
    };
}
