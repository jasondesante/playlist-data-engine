/**
 * Centralized logging utility with consistent log levels
 *
 * Log Levels (in order of verbosity):
 * - DEBUG: Detailed debugging information
 * - INFO: General operational information
 * - WARN: Warning conditions that should be addressed
 * - ERROR: Error conditions that need attention
 *
 * Usage:
 * ```typescript
 * import { Logger, LogLevel } from '../utils/logger.js';
 *
 * // Create a named logger
 * const logger = Logger.for('WeatherAPIClient');
 *
 * // Log at different levels
 * logger.debug('Fetching weather data', { lat: 45.5, lon: -122.6 });
 * logger.info('Weather data cached');
 * logger.warn('API rate limit approaching');
 * logger.error('Failed to fetch weather', error);
 *
 * // Control verbosity
 * Logger.setLevel(LogLevel.WARN);        // Only show WARN and ERROR
 * Logger.enableVerbose();                // Enable all debug output
 * Logger.setVerbose(true);               // Same as enableVerbose()
 * Logger.isVerbose();                    // Check verbose state
 * Logger.disableVerbose();               // Reset to default (INFO)
 *
 * // Diagnostic mode (for troubleshooting)
 * Logger.enableDiagnosticMode();         // Maximum verbosity for debugging
 * Logger.isDiagnosticMode();             // Check diagnostic state
 * Logger.disableDiagnosticMode();        // Reset to default
 * ```
 */

/**
 * Log level enum - determines which messages are displayed
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 4, // Disable all logging
}

/**
 * Log level names for display
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.NONE]: 'NONE',
};

/**
 * Log entry structure
 */
export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    context: string;
    message: string;
    data?: unknown;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
    /** Minimum log level to display (default: INFO in production, DEBUG in development) */
    level?: LogLevel;
    /** Include timestamp in output (default: true) */
    includeTimestamp?: boolean;
    /** Include context prefix [ClassName] (default: true) */
    includeContext?: boolean;
    /** Custom log handler for testing or external logging systems */
    customHandler?: (entry: LogEntry) => void;
}

/**
 * Global logger state
 */
let globalLevel: LogLevel = LogLevel.INFO;
let includeTimestamp = true;
let includeContext = true;
let customHandler: ((entry: LogEntry) => void) | null = null;

/**
 * Global diagnostic mode flag
 * When enabled, sets log level to DEBUG and enables verbose output
 */
let diagnosticMode = false;

/**
 * Global verbose mode flag
 * When enabled, sets log level to DEBUG for increased output verbosity
 * This is a user-friendly alternative to Logger.setLevel(LogLevel.DEBUG)
 */
let verboseMode = false;

/**
 * Logger class providing consistent logging across all modules
 */
export class Logger {
    private context: string;

    /**
     * Create a logger instance with a specific context (usually the class/module name)
     * @param context - The context name to prefix log messages (e.g., 'WeatherAPIClient')
     */
    private constructor(context: string) {
        this.context = context;
    }

    /**
     * Create a named logger for a specific class or module
     * @param context - The context name (e.g., 'WeatherAPIClient', 'EnvironmentalSensors')
     * @returns A Logger instance configured with the given context
     */
    static for(context: string): Logger {
        return new Logger(context);
    }

    /**
     * Enable diagnostic mode
     * Sets log level to DEBUG for maximum verbosity
     */
    static enableDiagnosticMode(): void {
        diagnosticMode = true;
        globalLevel = LogLevel.DEBUG;
    }

    /**
     * Disable diagnostic mode
     * Resets log level to INFO
     */
    static disableDiagnosticMode(): void {
        diagnosticMode = false;
        globalLevel = LogLevel.INFO;
    }

    /**
     * Check if diagnostic mode is enabled
     * @returns True if diagnostic mode is active
     */
    static isDiagnosticMode(): boolean {
        return diagnosticMode;
    }

    /**
     * Enable verbose logging mode
     * Sets log level to DEBUG for increased output verbosity
     * This is a convenience method equivalent to Logger.setLevel(LogLevel.DEBUG)
     * @example
     * Logger.enableVerbose();
     * // All debug messages will now be logged
     */
    static enableVerbose(): void {
        verboseMode = true;
        globalLevel = LogLevel.DEBUG;
    }

    /**
     * Disable verbose logging mode
     * Resets log level to INFO (default)
     * @example
     * Logger.disableVerbose();
     * // Only INFO and above will be logged
     */
    static disableVerbose(): void {
        verboseMode = false;
        globalLevel = LogLevel.INFO;
    }

    /**
     * Check if verbose mode is enabled
     * @returns True if verbose mode is active
     */
    static isVerbose(): boolean {
        return verboseMode;
    }

    /**
     * Set verbose mode on or off
     * @param enabled - Whether to enable verbose logging
     * @example
     * Logger.setVerbose(true);  // Enable verbose logging
     * Logger.setVerbose(false); // Disable verbose logging
     */
    static setVerbose(enabled: boolean): void {
        verboseMode = enabled;
        globalLevel = enabled ? LogLevel.DEBUG : LogLevel.INFO;
    }

    /**
     * Set the global log level
     * @param level - The minimum log level to display
     */
    static setLevel(level: LogLevel): void {
        globalLevel = level;
    }

    /**
     * Get the current global log level
     * @returns The current log level
     */
    static getLevel(): LogLevel {
        return globalLevel;
    }

    /**
     * Configure the logger globally
     * @param config - Logger configuration options
     */
    static configure(config: LoggerConfig): void {
        if (config.level !== undefined) {
            globalLevel = config.level;
        }
        if (config.includeTimestamp !== undefined) {
            includeTimestamp = config.includeTimestamp;
        }
        if (config.includeContext !== undefined) {
            includeContext = config.includeContext;
        }
        if (config.customHandler !== undefined) {
            customHandler = config.customHandler;
        }
    }

    /**
     * Reset logger to default configuration
     */
    static reset(): void {
        globalLevel = LogLevel.INFO;
        includeTimestamp = true;
        includeContext = true;
        customHandler = null;
        diagnosticMode = false;
        verboseMode = false;
    }

    /**
     * Log a debug message (most verbose)
     * @param message - The log message
     * @param data - Optional data to include
     */
    debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    /**
     * Log an info message (general operational info)
     * @param message - The log message
     * @param data - Optional data to include
     */
    info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    /**
     * Log a warning message (potential issues)
     * @param message - The log message
     * @param data - Optional data to include
     */
    warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARN, message, data);
    }

    /**
     * Log an error message (errors that need attention)
     * @param message - The log message
     * @param data - Optional error or data to include
     */
    error(message: string, data?: unknown): void {
        this.log(LogLevel.ERROR, message, data);
    }

    /**
     * Internal logging method
     */
    private log(level: LogLevel, message: string, data?: unknown): void {
        // Check if this level should be logged
        if (level < globalLevel) {
            return;
        }

        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            context: this.context,
            message,
            data,
        };

        // Use custom handler if provided
        if (customHandler) {
            customHandler(entry);
            return;
        }

        // Format the log message
        const formattedMessage = this.formatMessage(entry);

        // Use appropriate console method based on level
        switch (level) {
            case LogLevel.DEBUG:
                if (data !== undefined) {
                    console.debug(formattedMessage, data);
                } else {
                    console.debug(formattedMessage);
                }
                break;
            case LogLevel.INFO:
                if (data !== undefined) {
                    console.info(formattedMessage, data);
                } else {
                    console.info(formattedMessage);
                }
                break;
            case LogLevel.WARN:
                if (data !== undefined) {
                    console.warn(formattedMessage, data);
                } else {
                    console.warn(formattedMessage);
                }
                break;
            case LogLevel.ERROR:
                if (data !== undefined) {
                    console.error(formattedMessage, data);
                } else {
                    console.error(formattedMessage);
                }
                break;
        }
    }

    /**
     * Format a log entry into a string
     */
    private formatMessage(entry: LogEntry): string {
        const parts: string[] = [];

        // Add timestamp if enabled
        if (includeTimestamp) {
            parts.push(this.formatTimestamp(entry.timestamp));
        }

        // Add log level
        parts.push(`[${LOG_LEVEL_NAMES[entry.level]}]`);

        // Add context if enabled
        if (includeContext && entry.context) {
            parts.push(`[${entry.context}]`);
        }

        // Add message
        parts.push(entry.message);

        return parts.join(' ');
    }

    /**
     * Format a timestamp for log output
     */
    private formatTimestamp(date: Date): string {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ms = date.getMilliseconds().toString().padStart(3, '0');
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }
}

/**
 * Convenience function to create a logger without calling Logger.for()
 * @param context - The context name
 * @returns A Logger instance
 */
export function createLogger(context: string): Logger {
    return Logger.for(context);
}
