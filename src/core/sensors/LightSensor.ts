import type { LightData } from '../types/Environmental';

export class LightSensor {
    private isListening: boolean = false;
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
                    console.warn('Light sensor error:', event.error.name, event.error.message);
                });

                this.sensor.start();
                this.isListening = true;
                this.callback = callback;
            } catch (error) {
                console.warn('Failed to initialize AmbientLightSensor:', error);
                this.isListening = false;
            }
        } else {
            console.warn('AmbientLightSensor not supported');
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
        this.isListening = false;
        this.callback = null;
    }

    /**
     * Get last reading
     */
    getLastReading(): LightData | null {
        return this.lastReading;
    }
}
