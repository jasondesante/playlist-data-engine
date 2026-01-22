import type { LightData } from '../types/Environmental';
import { Logger } from '../../utils/logger.js';

export class LightSensor {
    private logger = Logger.for('LightSensor');
    private lastReading: LightData | null = null;
    private callback: ((data: LightData) => void) | null = null;
    private sensor: any | null = null; // AmbientLightSensor type is experimental

    /**
     * Start monitoring ambient light
     * @param callback Callback for light data
     */
    startMonitoring(callback: (data: LightData) => void): void {
        if (typeof window === 'undefined') return;

        if ('AmbientLightSensor' in window) {
            try {
                // @ts-ignore - AmbientLightSensor is experimental
                const SensorClass: any = (window as any).AmbientLightSensor;
                this.sensor = new SensorClass();

                this.sensor.addEventListener('reading', () => {
                    if (this.sensor.illuminance !== null) {
                        const data: LightData = {
                            illuminance: this.sensor.illuminance,
                            timestamp: Date.now()
                        };
                        this.lastReading = data;
                        if (this.callback) this.callback(data);
                    }
                });

                this.sensor.addEventListener('error', (event: any) => {
                    this.logger.warn('Light sensor error', { name: event.error.name, message: event.error.message });
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
