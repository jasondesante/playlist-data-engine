import type { LightData } from '../types/Environmental';
import { Logger } from '../../utils/logger.js';

/**
 * AmbientLightSensor is an experimental Web API.
 * This interface provides type safety for the experimental API.
 *
 * @see https://wicg.github.io/generic-sensor/
 */
interface AmbientLightSensorConstructor {
    new (): AmbientLightSensor;
}

interface AmbientLightSensor extends EventTarget {
    readonly illuminance: number | null;
    start(): void;
    stop(): void;
    addEventListener(type: 'reading', listener: (this: AmbientLightSensor, event: Event) => void): void;
    addEventListener(type: 'error', listener: (this: AmbientLightSensor, event: ErrorEvent) => void): void;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
}

interface AmbientLightSensorWindow extends Window {
    AmbientLightSensor?: AmbientLightSensorConstructor;
}

export class LightSensor {
    private logger = Logger.for('LightSensor');
    private lastReading: LightData | null = null;
    private callback: ((data: LightData) => void) | null = null;
    private sensor: AmbientLightSensor | null = null;

    /**
     * Start monitoring ambient light
     * @param callback Callback for light data
     */
    startMonitoring(callback: (data: LightData) => void): void {
        if (typeof window === 'undefined') return;

        const ambientWindow = window as AmbientLightSensorWindow;
        if (ambientWindow.AmbientLightSensor) {
            try {
                const SensorClass = ambientWindow.AmbientLightSensor;
                this.sensor = new SensorClass();

                this.sensor.addEventListener('reading', () => {
                    if (this.sensor && this.sensor.illuminance !== null) {
                        const data: LightData = {
                            illuminance: this.sensor.illuminance,
                            timestamp: Date.now()
                        };
                        this.lastReading = data;
                        if (this.callback) this.callback(data);
                    }
                });

                this.sensor.addEventListener('error', (event: Event | ErrorEvent) => {
                    if ('error' in event) {
                        this.logger.warn('Light sensor error', {
                            name: (event as ErrorEvent).error.name,
                            message: (event as ErrorEvent).error.message
                        });
                    }
                });

                this.sensor.start();
                this.callback = callback;
            } catch (error) {
                this.logger.warn('Failed to initialize AmbientLightSensor', { error });
            }
        } else {
            this.logger.warn('AmbientLightSensor not supported');
        }
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.sensor) {
            this.sensor.stop();
            this.sensor = null;
        }
        this.callback = null;
    }

    /**
     * Get last reading
     */
    getLastReading(): LightData | null {
        return this.lastReading;
    }
}
