import type {
    SensorType,
    SensorPermission,
    EnvironmentalContext,
    SensorHealthStatus,
    SensorStatus,
    SensorFailureLog,
    SensorRetryConfig,
    SensorRecoveryNotification,
    GeolocationData,
    WeatherData,
    MotionData,
    LightData,
    XPBonusSource,
    XpModifierBreakdown
} from '../types/Environmental';
import type { GeolocationSensorConfig, WeatherSensorConfig, XPModifierConfig, RetryConfig } from '../config/sensorConfig.js';
import { GeolocationProvider } from './GeolocationProvider';
import { MotionDetector } from './MotionDetector';
import { WeatherAPIClient, type SevereWeatherAlert } from './WeatherAPIClient';
import { LightSensor } from './LightSensor';
import { Logger } from '../../utils/logger.js';
import { SensorDashboard, type DashboardConfig } from '../../utils/sensorDashboard.js';

/**
 * Environmental sensor integration with error recovery
 *
 * Aggregates data from:
 * - GPS/Geolocation (latitude, longitude, altitude)
 * - Motion sensors (accelerometer, gyroscope, activity detection)
 * - Weather API (temperature, humidity, conditions)
 * - Light sensor (illuminance, environment classification)
 *
 * Calculates environmental XP modifiers (1.0x - 3.0x) based on activity
 * type, weather conditions, altitude, and time of day.
 *
 * Error Recovery Features:
 * - Retry logic with exponential backoff for failed sensor reads
 * - Sensor health monitoring and status tracking
 * - "Last known good" fallback values when sensors fail
 * - Graceful degradation when individual sensors fail
 * - Failure logging with timestamps
 * - Recovery notifications
 */
export class EnvironmentalSensors {
    private permissions: Map<SensorType, boolean> = new Map();
    private geolocation: GeolocationProvider;
    private motion: MotionDetector;
    private weather: WeatherAPIClient;
    private light: LightSensor;
    private logger = Logger.for('EnvironmentalSensors');

    private context: EnvironmentalContext = {
        timestamp: Date.now()
    };

    // Error recovery state
    private sensorStatuses: Map<SensorType, SensorStatus> = new Map();
    private failureLog: SensorFailureLog[] = [];
    private lastKnownGood: Map<SensorType, {
        geolocation?: GeolocationData;
        weather?: WeatherData;
        motion?: MotionData;
        light?: LightData;
    }> = new Map();
    private recoveryCallbacks: Set<(notification: SensorRecoveryNotification) => void> = new Set();

    // Default retry configuration
    private retryConfig: SensorRetryConfig & { enabled: boolean } = {
        enabled: true,
        maxRetries: 3,
        initialDelayMs: 1000, // 1 second
        maxDelayMs: 10000, // 10 seconds
        backoffMultiplier: 2
    };

    // XP modifier configuration
    private xpConfig: Required<XPModifierConfig> = {
        maxModifier: 3.0,
        maxGamingModifier: 1.75,
        runningBonus: 0.5,
        walkingBonus: 0.2,
        stormBonus: 0.4,
        snowBonus: 0.3,
        nightBonus: 0.25,
        altitudeThreshold: 1000,
        altitudeBonus: 0.3,
        gamingBaseBonus: 0.25,
        gamingRPGBonus: 0.2,
        gamingMultiplayerBonus: 0.15,
    };

    /**
     * Initialize environmental sensors with optional weather API key, retry config, or full config
     *
     * Supports multiple constructor signatures for backward compatibility:
     * - new EnvironmentalSensors(apiKey)
     * - new EnvironmentalSensors(apiKey, retryConfig)
     * - new EnvironmentalSensors({ weather: { apiKey }, retry: {...} })
     *
     * @param {string | { weather?: Partial<WeatherSensorConfig>, geolocation?: Partial<GeolocationSensorConfig>, retry?: Partial<RetryConfig>, xpModifier?: Partial<XPModifierConfig> }} [weatherApiKeyOrConfig] - Weather API key or configuration object
     * @param {Partial<SensorRetryConfig>} [retryConfig] - Optional custom retry configuration
     *
     * @example
     * const sensors = new EnvironmentalSensors(process.env.WEATHER_API_KEY);
     * const sensors2 = new EnvironmentalSensors({ weather: { apiKey }, retry: { maxRetries: 5 } });
     */
    constructor(weatherApiKeyOrConfig?: string | { weather?: Partial<WeatherSensorConfig>; geolocation?: Partial<GeolocationSensorConfig>; retry?: Partial<RetryConfig>; xpModifier?: Partial<XPModifierConfig> }, retryConfig?: Partial<SensorRetryConfig>) {
        this.permissions.set('geolocation', false);
        this.permissions.set('motion', false);
        this.permissions.set('weather', false);
        this.permissions.set('light', false);

        // Handle both legacy signature and new config object
        let weatherApiKey = '';
        let geoConfig: Partial<GeolocationSensorConfig> | undefined;
        let xpModifierConfig: Partial<XPModifierConfig> | undefined;

        if (typeof weatherApiKeyOrConfig === 'string' || weatherApiKeyOrConfig === undefined) {
            weatherApiKey = weatherApiKeyOrConfig ?? '';
            // Apply legacy retry config if provided
            if (retryConfig) {
                this.retryConfig = { ...this.retryConfig, ...retryConfig };
            }
        } else {
            const config = weatherApiKeyOrConfig;
            weatherApiKey = config.weather?.apiKey ?? '';
            geoConfig = config.geolocation;
            if (config.retry) {
                this.retryConfig = { ...this.retryConfig, ...config.retry };
            }
            if (config.xpModifier) {
                this.xpConfig = { ...this.xpConfig, ...config.xpModifier };
            }
        }

        this.geolocation = geoConfig ? new GeolocationProvider(geoConfig as GeolocationSensorConfig) : new GeolocationProvider();
        this.motion = new MotionDetector();
        this.weather = new WeatherAPIClient(weatherApiKey);
        this.light = new LightSensor();

        // Initialize sensor statuses
        this.initializeSensorStatuses();
    }

    /**
     * Initialize sensor statuses to 'unknown' state
     */
    private initializeSensorStatuses(): void {
        const sensorTypes: SensorType[] = ['geolocation', 'motion', 'weather', 'light'];
        const now = Date.now();

        for (const type of sensorTypes) {
            this.sensorStatuses.set(type, {
                type,
                health: 'unknown',
                lastSuccessTimestamp: null,
                lastFailureTimestamp: null,
                consecutiveFailures: 0,
                totalFailures: 0,
                lastError: null,
                isRetrying: false
            });
        }
    }

    /**
     * Update sensor health status after a success or failure
     */
    private updateSensorStatus(
        sensorType: SensorType,
        success: boolean,
        error?: string
    ): void {
        const status = this.sensorStatuses.get(sensorType);
        if (!status) return;

        const now = Date.now();
        const previousHealth = status.health;

        if (success) {
            status.lastSuccessTimestamp = now;
            status.consecutiveFailures = 0;
            status.lastError = null;
            status.isRetrying = false;

            // Update health based on recovery
            if (status.health === 'failed' || status.health === 'unknown') {
                status.health = 'healthy';
                this.notifyRecovery(sensorType, previousHealth, 'healthy', 'Sensor recovered successfully');
            } else if (status.health === 'degraded') {
                status.health = 'healthy';
                this.notifyRecovery(sensorType, previousHealth, 'healthy', 'Sensor returned to healthy state');
            }
        } else {
            status.lastFailureTimestamp = now;
            status.consecutiveFailures++;
            status.totalFailures++;
            status.lastError = error || 'Unknown error';

            // Update health based on failure count
            if (status.consecutiveFailures >= 3) {
                if (status.health !== 'failed') {
                    const previousHealth = status.health;
                    status.health = 'failed';
                    this.notifyRecovery(sensorType, previousHealth, 'failed', `Sensor failed after ${status.consecutiveFailures} consecutive failures`);
                }
            } else if (status.consecutiveFailures >= 1) {
                if (status.health === 'healthy' || status.health === 'unknown') {
                    status.health = 'degraded';
                    this.notifyRecovery(sensorType, previousHealth, 'degraded', `Sensor degraded after ${status.consecutiveFailures} consecutive failures`);
                }
            }
        }

        this.sensorStatuses.set(sensorType, status);
    }

    /**
     * Notify registered callbacks of sensor recovery events
     */
    private notifyRecovery(
        sensorType: SensorType,
        previousStatus: SensorHealthStatus,
        newStatus: SensorHealthStatus,
        message: string
    ): void {
        const notification: SensorRecoveryNotification = {
            sensorType,
            previousStatus,
            newStatus,
            timestamp: Date.now(),
            message
        };

        this.recoveryCallbacks.forEach(callback => {
            try {
                callback(notification);
            } catch (e) {
                // Don't let callback errors break the sensor logic
                this.logger.error('Recovery callback error', { error: e });
            }
        });
    }

    /**
     * Log a sensor failure event
     */
    private logFailure(
        sensorType: SensorType,
        error: string,
        retryAttempt: number,
        willRetry: boolean
    ): void {
        const logEntry: SensorFailureLog = {
            sensorType,
            timestamp: Date.now(),
            error,
            retryAttempt,
            willRetry
        };

        this.failureLog.push(logEntry);

        // Keep only last 100 failure logs to prevent memory bloat
        if (this.failureLog.length > 100) {
            this.failureLog = this.failureLog.slice(-100);
        }
    }

    /**
     * Store last known good value for a sensor
     */
    private storeLastKnownGood(sensorType: SensorType, data: any): void {
        this.lastKnownGood.set(sensorType, {
            ...this.lastKnownGood.get(sensorType),
            ...data
        });
    }

    /**
     * Execute a sensor operation with retry logic and exponential backoff
     */
    private async retrySensorOperation<T>(
        sensorType: SensorType,
        operation: () => Promise<T>,
        operationName: string = 'sensor operation'
    ): Promise<T | null> {
        let lastError: Error | null = null;
        let delay = this.retryConfig.initialDelayMs;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                // Set retrying status if this is a retry attempt
                if (attempt > 0) {
                    const status = this.sensorStatuses.get(sensorType);
                    if (status) {
                        status.isRetrying = true;
                        this.sensorStatuses.set(sensorType, status);
                    }
                }

                const result = await operation();

                // Operation succeeded
                this.updateSensorStatus(sensorType, true);

                return result;
            } catch (error) {
                lastError = error as Error;
                const errorMessage = lastError.message || String(error);
                const willRetry = attempt < this.retryConfig.maxRetries;

                // Log the failure
                this.logFailure(sensorType, errorMessage, attempt, willRetry);

                // Update sensor status
                this.updateSensorStatus(sensorType, false, errorMessage);

                // If we have more retries, wait with exponential backoff
                if (willRetry) {
                    await this.delay(delay);
                    delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
                }
            }
        }

        // All retries exhausted
        const status = this.sensorStatuses.get(sensorType);
        if (status) {
            status.isRetrying = false;
            this.sensorStatuses.set(sensorType, status);
        }

        return null;
    }

    /**
     * Delay helper for retry backoff
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Register a callback for sensor recovery notifications
     *
     * @param callback - Function to call when sensor status changes
     * @returns Unsubscribe function
     */
    onSensorRecovery(callback: (notification: SensorRecoveryNotification) => void): () => void {
        this.recoveryCallbacks.add(callback);
        return () => this.recoveryCallbacks.delete(callback);
    }

    /**
     * Get current status of a specific sensor
     */
    getSensorStatus(sensorType: SensorType): SensorStatus | null {
        return this.sensorStatuses.get(sensorType) || null;
    }

    /**
     * Get status of all sensors
     */
    getAllSensorStatuses(): SensorStatus[] {
        return Array.from(this.sensorStatuses.values());
    }

    /**
     * Get failure log entries
     *
     * @param sensorType - Optional filter by sensor type
     * @param limit - Maximum number of entries to return (default: all)
     */
    getFailureLog(sensorType?: SensorType, limit?: number): SensorFailureLog[] {
        let logs = [...this.failureLog];

        if (sensorType) {
            logs = logs.filter(log => log.sensorType === sensorType);
        }

        // Return most recent first
        logs.reverse();

        if (limit) {
            logs = logs.slice(0, limit);
        }

        return logs;
    }

    /**
     * Get last known good value for a sensor
     */
    getLastKnownGood(sensorType: SensorType): any {
        return this.lastKnownGood.get(sensorType) || null;
    }

    /**
     * Clear failure log
     */
    clearFailureLog(): void {
        this.failureLog = [];
    }

    /**
     * Update retry configuration
     */
    updateRetryConfig(config: Partial<SensorRetryConfig>): void {
        this.retryConfig = { ...this.retryConfig, ...config };
    }

    /**
     * Request user permissions for specific sensor types
     *
     * Requests browser/device permissions for GPS, motion, weather, and light sensors.
     * User must explicitly grant permissions before data can be accessed.
     *
     * @param {SensorType[]} types - Array of sensor types to request ('geolocation' | 'motion' | 'weather' | 'light')
     * @returns {Promise<SensorPermission[]>} Array of permission results (granted/denied)
     *
     * @example
     * const permissions = await sensors.requestPermissions(['geolocation', 'motion']);
     */
    async requestPermissions(types: SensorType[]): Promise<SensorPermission[]> {
        const results: SensorPermission[] = [];

        for (const type of types) {
            let granted = false;

            switch (type) {
                case 'geolocation':
                    granted = await this.requestGeolocationPermission();
                    break;
                case 'motion':
                    granted = await this.requestMotionPermission();
                    break;
                case 'weather':
                    granted = true;
                    break;
                case 'light':
                    granted = await this.requestLightPermission();
                    break;
            }

            this.permissions.set(type, granted);
            results.push({
                type,
                granted,
                timestamp: Date.now()
            });
        }

        return results;
    }

    /**
     * Start monitoring enabled sensors
     */
    startMonitoring(callback?: (context: EnvironmentalContext) => void): void {
        if (this.permissions.get('motion')) {
            this.motion.startMonitoring((data) => {
                this.context.motion = data;
                this.context.timestamp = Date.now();

                // Store last known good
                this.storeLastKnownGood('motion', { motion: data });

                // Update sensor status on successful read
                this.updateSensorStatus('motion', true);

                if (callback) callback(this.context);
            });
        }

        if (this.permissions.get('light')) {
            this.light.startMonitoring((data) => {
                this.context.light = data;
                this.context.timestamp = Date.now();

                // Store last known good
                this.storeLastKnownGood('light', { light: data });

                // Update sensor status on successful read
                this.updateSensorStatus('light', true);

                if (callback) callback(this.context);
            });
        }

        // Poll geolocation and weather if enabled
        this.updateSnapshot();
    }

    /**
     * Stop all monitoring
     */
    stopMonitoring(): void {
        this.motion.stopMonitoring();
        this.light.stopMonitoring();
    }

    /**
     * Manually update snapshot of pull-based sensors (Geo, Weather) with retry logic
     */
    async updateSnapshot(): Promise<EnvironmentalContext> {
        // Update geolocation with retry
        if (this.permissions.get('geolocation')) {
            const geo = await this.retrySensorOperation(
                'geolocation',
                () => this.geolocation.getCurrentPosition(),
                'getCurrentPosition'
            );

            if (geo) {
                this.context.geolocation = geo;

                // Store last known good
                this.storeLastKnownGood('geolocation', { geolocation: geo });

                // Calculate biome from coordinates (with elevation if available)
                const biome = this.geolocation.getBiome(geo.latitude, geo.longitude, geo.altitude);
                this.context.biome = biome as any;
            } else {
                // Geolocation failed, use last known good if available
                const lastKnown = this.getLastKnownGood('geolocation');
                if (lastKnown?.geolocation) {
                    this.context.geolocation = lastKnown.geolocation;
                }
            }

            // Update weather with retry (only if we have geo location)
            if ((this.context.geolocation || this.getLastKnownGood('geolocation')?.geolocation) && this.permissions.get('weather')) {
                const geoForWeather = this.context.geolocation || this.getLastKnownGood('geolocation')?.geolocation;

                if (geoForWeather) {
                    const weather = await this.retrySensorOperation(
                        'weather',
                        () => this.weather.getWeather(geoForWeather!.latitude, geoForWeather!.longitude),
                        'getWeather'
                    );

                    if (weather) {
                        this.context.weather = weather;

                        // Store last known good
                        this.storeLastKnownGood('weather', { weather });
                    } else {
                        // Weather failed, use last known good if available
                        const lastKnown = this.getLastKnownGood('weather');
                        if (lastKnown?.weather) {
                            this.context.weather = lastKnown.weather;
                        }
                    }
                }
            }
        }

        this.context.timestamp = Date.now();
        return this.context;
    }

    /**
     * Calculate XP modifier based on environmental factors
     * Uses last known good values if current readings are unavailable
     * Uses configured max modifier cap (default: 3.0x)
     */
    calculateXPModifier(): number {
        let modifier = 1.0;

        // Motion bonuses - check current or last known good
        const motionData = this.context.motion || this.getLastKnownGood('motion')?.motion;
        if (motionData) {
            const activity = this.motion.detectActivity(motionData);
            if (activity === 'running') modifier += this.xpConfig.runningBonus;
            else if (activity === 'walking') modifier += this.xpConfig.walkingBonus;
        }

        // Weather bonuses - check current or last known good
        const weatherData = this.context.weather || this.getLastKnownGood('weather')?.weather;
        if (weatherData) {
            const type = weatherData.weatherType.toLowerCase();
            if (type.includes('rain') || type.includes('storm')) modifier += this.xpConfig.stormBonus;
            if (type.includes('snow')) modifier += this.xpConfig.snowBonus;

            if (weatherData.isNight) modifier += this.xpConfig.nightBonus;
        }

        // Geolocation bonuses - check current or last known good
        const geoData = this.context.geolocation || this.getLastKnownGood('geolocation')?.geolocation;
        if (geoData && geoData.altitude && geoData.altitude > this.xpConfig.altitudeThreshold) {
            modifier += this.xpConfig.altitudeBonus;
        }

        return Math.min(modifier, this.xpConfig.maxModifier);
    }

    /**
     * Get detailed breakdown of XP modifier with active bonus sources
     * Uses last known good values if current readings are unavailable
     * @returns XpModifierBreakdown with total, sources, and active bonuses
     */
    getXpModifierBreakdown(): XpModifierBreakdown {
        const sources: XPBonusSource[] = [];

        // Motion bonuses - check current or last known good
        const motionData = this.context.motion || this.getLastKnownGood('motion')?.motion;
        const activity = motionData ? this.motion.detectActivity(motionData) : null;

        sources.push({
            id: 'running',
            label: 'Running',
            icon: '\u{1F3C3}',
            bonus: this.xpConfig.runningBonus,
            active: activity === 'running'
        });

        sources.push({
            id: 'walking',
            label: 'Walking',
            icon: '\u{1F6B6}',
            bonus: this.xpConfig.walkingBonus,
            active: activity === 'walking'
        });

        // Weather bonuses - check current or last known good
        const weatherData = this.context.weather || this.getLastKnownGood('weather')?.weather;
        const weatherType = weatherData?.weatherType?.toLowerCase() || '';

        sources.push({
            id: 'storm',
            label: 'Stormy Weather',
            icon: '\u{1F327}\u{FE0F}',
            bonus: this.xpConfig.stormBonus,
            active: weatherType.includes('rain') || weatherType.includes('storm')
        });

        sources.push({
            id: 'snow',
            label: 'Snowy Weather',
            icon: '\u{2744}\u{FE0F}',
            bonus: this.xpConfig.snowBonus,
            active: weatherType.includes('snow')
        });

        sources.push({
            id: 'night',
            label: 'Night Time',
            icon: '\u{1F319}',
            bonus: this.xpConfig.nightBonus,
            active: weatherData?.isNight ?? false
        });

        // Geolocation bonuses - check current or last known good
        const geoData = this.context.geolocation || this.getLastKnownGood('geolocation')?.geolocation;
        const isHighAltitude = geoData?.altitude && geoData.altitude > this.xpConfig.altitudeThreshold;

        sources.push({
            id: 'altitude',
            label: 'High Altitude',
            icon: '\u{26F0}\u{FE0F}',
            bonus: this.xpConfig.altitudeBonus,
            active: !!isHighAltitude
        });

        const activeBonuses = sources.filter(s => s.active);
        const total = Math.min(
            1.0 + activeBonuses.reduce((sum, s) => sum + s.bonus, 0),
            this.xpConfig.maxModifier
        );

        return {
            total,
            baseValue: 1.0,
            sources,
            activeBonuses
        };
    }

    /**
     * Calculate XP modifier based on environmental factors including forecast
     * Considers incoming weather for bonus XP
     * Uses configured max modifier cap (default: 3.0x)
     * @param forecastHours Hours ahead to check for incoming weather (default: 12)
     * @returns Promise resolving to XP modifier value
     */
    async calculateXPModifierWithForecast(forecastHours: number = 12): Promise<number> {
        let modifier = this.calculateXPModifier();

        // Get upcoming weather for forecast bonus
        const geoData = this.context.geolocation || this.getLastKnownGood('geolocation')?.geolocation;
        if (geoData && this.permissions.get('weather')) {
            const upcoming = await this.retrySensorOperation(
                'weather',
                () => this.weather.getUpcomingWeather(geoData!.latitude, geoData!.longitude, forecastHours),
                'getUpcomingWeather'
            );

            if (upcoming) {
                // Add small bonus for incoming severe weather (anticipation bonus)
                const worstType = upcoming.worstWeatherType.toLowerCase();
                if (worstType.includes('thunderstorm') || worstType.includes('tornado')) {
                    modifier += 0.15; // +15% for playing before storm
                } else if (worstType.includes('snow') && upcoming.snowProbability > 0.5) {
                    modifier += 0.1; // +10% for playing before snow
                } else if (worstType.includes('rain') && upcoming.rainProbability > 0.7) {
                    modifier += 0.1; // +10% for playing before heavy rain
                }

                // Small bonus for clear skies ahead (optimism bonus)
                if (worstType === 'clear' && !upcoming.willRain && !upcoming.willSnow) {
                    modifier += 0.05; // +5% for clear outlook
                }
            }
        }

        return Math.min(modifier, this.xpConfig.maxModifier);
    }

    /**
     * Calculate XP modifier based on environmental factors including severe weather detection
     * Considers current severe weather conditions for maximum XP bonus
     * Uses configured max modifier cap (default: 3.0x)
     * @returns Promise resolving to XP modifier value and any severe weather alert
     */
    async calculateXPModifierWithSevereWeather(): Promise<{
        modifier: number;
        severeWeatherAlert: SevereWeatherAlert | null;
        safetyWarning: string | null;
    }> {
        let modifier = this.calculateXPModifier();

        // Check for severe weather conditions in current weather
        let severeWeatherAlert: SevereWeatherAlert | null = null;

        const weatherData = this.context.weather || this.getLastKnownGood('weather')?.weather;
        if (weatherData) {
            severeWeatherAlert = this.weather.detectSevereWeather(weatherData);

            if (severeWeatherAlert) {
                // Add severe weather XP bonus
                modifier += severeWeatherAlert.xpBonus;
            }
        }

        // Cap at configured max modifier
        const cappedModifier = Math.min(modifier, this.xpConfig.maxModifier);

        // Get safety warning if severe weather detected
        const safetyWarning = severeWeatherAlert
            ? this.weather.getSafetyWarning(severeWeatherAlert)
            : null;

        return {
            modifier: cappedModifier,
            severeWeatherAlert,
            safetyWarning
        };
    }

    /**
     * Detect severe weather from current environmental conditions
     * Falls back to last known good weather if current is unavailable
     * @returns Severe weather alert or null if conditions are normal
     */
    detectSevereWeather(): SevereWeatherAlert | null {
        const weatherData = this.context.weather || this.getLastKnownGood('weather')?.weather;
        if (!weatherData) {
            return null;
        }

        return this.weather.detectSevereWeather(weatherData);
    }

    /**
     * Get safety warning for current severe weather conditions
     * @returns Safety warning message or null if no severe weather
     */
    getSevereWeatherWarning(): string | null {
        const alert = this.detectSevereWeather();
        if (!alert) {
            return null;
        }

        return this.weather.getSafetyWarning(alert);
    }

    getPermissions(): SensorPermission[] {
        return Array.from(this.permissions.entries()).map(([type, granted]) => ({
            type,
            granted,
            timestamp: Date.now()
        }));
    }

    checkAvailability(type: SensorType): boolean {
        if (typeof window === 'undefined') return false;

        switch (type) {
            case 'geolocation':
                return 'geolocation' in navigator;
            case 'motion':
                return 'DeviceMotionEvent' in window;
            case 'weather':
                return true;
            case 'light':
                return 'AmbientLightSensor' in window;
            default:
                return false;
        }
    }

    private async requestGeolocationPermission(): Promise<boolean> {
        if (!this.checkAvailability('geolocation')) return false;
        try {
            // Trigger a request by calling getCurrentPosition
            await this.geolocation.getCurrentPosition();
            return true;
        } catch (e) {
            return false;
        }
    }

    private async requestMotionPermission(): Promise<boolean> {
        if (!this.checkAvailability('motion')) return false;
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                return response === 'granted';
            } catch (e) {
                return false;
            }
        }
        return true;
    }

    private async requestLightPermission(): Promise<boolean> {
        if (!this.checkAvailability('light')) return false;
        try {
            const result = await navigator.permissions.query({ name: 'ambient-light-sensor' as any });
            return result.state === 'granted' || result.state === 'prompt';
        } catch (e) {
            return false;
        }
    }

    /**
     * Get current activity type with fallback to last known good
     */
    public getCurrentActivity(): 'stationary' | 'walking' | 'running' | 'driving' | 'unknown' {
        if (!this.permissions.get('motion')) {
            return 'unknown';
        }

        const motionData = this.context.motion || this.getLastKnownGood('motion')?.motion;
        if (!motionData) {
            return 'unknown';
        }

        return this.motion.detectActivity(motionData);
    }

    /**
     * Get comprehensive diagnostic information for troubleshooting
     * Returns structured data about all sensor states, cache statistics, and recent failures
     *
     * @returns Diagnostic report containing sensor statuses, cache stats, performance metrics, and recent errors
     */
    getDiagnostics(): {
        timestamp: number;
        diagnosticMode: boolean;
        sensors: {
            type: SensorType;
            status: SensorStatus;
            permission: boolean;
            availability: boolean;
            lastKnownGood: any;
        }[];
        cache: {
            geolocation: {
                age: number | null;
                isExpired: boolean;
                stats: { hits: number; misses: number };
            };
            weather: {
                size: number;
                stats: { hits: number; misses: number };
                ttl: number;
            };
        };
        performance: {
            weatherApi: {
                average: number;
                min: number;
                max: number;
                totalCalls: number;
                successRate: number;
                p95: number;
                p99: number;
            };
            forecastApi: {
                average: number;
                min: number;
                max: number;
                totalCalls: number;
                successRate: number;
                p95: number;
                p99: number;
            };
        };
        recentFailures: SensorFailureLog[];
        permissions: SensorPermission[];
        context: {
            hasGeolocation: boolean;
            hasMotion: boolean;
            hasWeather: boolean;
            hasLight: boolean;
            hasBiome: boolean;
            timestamp: number;
        };
    } {
        const isDiagnostic = Logger.isDiagnosticMode();

        return {
            timestamp: Date.now(),
            diagnosticMode: isDiagnostic,
            sensors: Array.from(this.sensorStatuses.values()).map(status => ({
                type: status.type,
                status,
                permission: this.permissions.get(status.type) || false,
                availability: this.checkAvailability(status.type),
                lastKnownGood: this.getLastKnownGood(status.type),
            })),
            cache: {
                geolocation: {
                    age: this.geolocation.getCacheAge(),
                    isExpired: this.geolocation.isCacheExpired(),
                    stats: this.geolocation.getCacheStats(),
                },
                weather: {
                    size: this.weather.getCacheSize(),
                    stats: this.weather.getCacheStats(),
                    ttl: 720, // 12 minutes in seconds (for reference)
                },
            },
            performance: {
                weatherApi: this.weather.getWeatherApiStatistics(),
                forecastApi: this.weather.getForecastApiStatistics(),
            },
            recentFailures: this.getFailureLog(undefined, 10),
            permissions: this.getPermissions(),
            context: {
                hasGeolocation: !!this.context.geolocation,
                hasMotion: !!this.context.motion,
                hasWeather: !!this.context.weather,
                hasLight: !!this.context.light,
                hasBiome: !!this.context.biome,
                timestamp: this.context.timestamp,
            },
        };
    }

    /**
     * Enable diagnostic mode for enhanced logging and debugging
     * Sets global logger to DEBUG level
     */
    enableDiagnosticMode(): void {
        Logger.enableDiagnosticMode();
        this.logger.info('Diagnostic mode enabled');
    }

    /**
     * Disable diagnostic mode and reset to normal logging
     * Resets global logger to INFO level
     */
    disableDiagnosticMode(): void {
        Logger.disableDiagnosticMode();
        this.logger.info('Diagnostic mode disabled');
    }

    /**
     * Print a formatted dashboard to the console with sensor status information
     * Useful for debugging and monitoring during development
     *
     * @param config Optional dashboard configuration (colors, compact mode, etc.)
     *
     * @example
     * sensors.printDashboard();
     * sensors.printDashboard({ useColors: false, compact: true });
     */
    printDashboard(config?: DashboardConfig): void {
        SensorDashboard.displayEnvironmentalDiagnostics(this.getDiagnostics(), config);
    }
}
