/**
 * Sensor Dashboard - Visual console output for sensor diagnostics
 *
 * Provides formatted console output for sensor status, health, cache statistics,
 * and recent failures. Designed for debugging and monitoring during development.
 *
 * Usage:
 * ```typescript
 * import { SensorDashboard } from '../utils/sensorDashboard.js';
 *
 * // Display environmental sensors dashboard
 * SensorDashboard.displayEnvironmentalDiagnostics(sensors.getDiagnostics());
 *
 * // Display gaming sensors dashboard
 * SensorDashboard.displayGamingDiagnostics(gamingSensors.getDiagnostics());
 *
 * // Display a combined system dashboard
 * SensorDashboard.displaySystemDashboard({
 *     environmental: sensors.getDiagnostics(),
 *     gaming: gamingSensors.getDiagnostics()
 * });
 * ```
 */

import type {
    SensorStatus,
    SensorFailureLog,
    SensorPermission
} from '../core/types/Environmental';
import type { GamingContext } from '../core/types/Progression';

/**
 * ANSI color codes for terminal output
 */
const Colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
};

/**
 * Dashboard configuration options
 */
export interface DashboardConfig {
    /** Use colors in output (default: true) */
    useColors?: boolean;
    /** Compact mode for smaller output (default: false) */
    compact?: boolean;
    /** Show timestamp (default: true) */
    showTimestamp?: boolean;
    /** Maximum number of recent failures to show (default: 5) */
    maxFailures?: number;
}

/**
 * Default configuration
 */
const defaultConfig: Required<DashboardConfig> = {
    useColors: true,
    compact: false,
    showTimestamp: true,
    maxFailures: 5,
};

/**
 * Check if colors should be used (disable in CI/non-TTY environments)
 */
function shouldUseColors(config: DashboardConfig): boolean {
    if (config.useColors === false) return false;
    // Check if we're in a TTY
    return typeof process !== 'undefined' && process.stdout?.isTTY === true;
}

/**
 * Apply color to text if colors are enabled
 */
function colorize(text: string, color: string, useColors: boolean): string {
    return useColors ? `${color}${text}${Colors.reset}` : text;
}

/**
 * Get health status color
 */
function getHealthColor(health: string, useColors: boolean): string {
    switch (health) {
        case 'healthy': return colorize('●', Colors.green, useColors);
        case 'degraded': return colorize('●', Colors.yellow, useColors);
        case 'failed': return colorize('●', Colors.red, useColors);
        default: return colorize('○', Colors.dim, useColors);
    }
}

/**
 * Get permission status text
 */
function getPermissionText(granted: boolean, useColors: boolean): string {
    return granted
        ? colorize('✓ Granted', Colors.green, useColors)
        : colorize('✗ Denied', Colors.red, useColors);
}

/**
 * Get availability status text
 */
function getAvailabilityText(available: boolean, useColors: boolean): string {
    return available
        ? colorize('Available', Colors.green, useColors)
        : colorize('Unavailable', Colors.red, useColors);
}

/**
 * Format a timestamp as HH:MM:SS
 */
function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Format cache hit rate as percentage
 */
function formatHitRate(hits: number, misses: number): string {
    const total = hits + misses;
    if (total === 0) return 'N/A';
    const rate = (hits / total * 100).toFixed(1);
    return `${rate}%`;
}

/**
 * Format performance statistics for display
 */
function formatPerformanceStats(
    stats: { average: number; min: number; max: number; totalCalls: number; successRate: number; p95: number; p99: number },
    useColors: boolean
): string[] {
    const lines: string[] = [];
    const hasCalls = stats.totalCalls > 0;

    lines.push(`   Calls:       ${stats.totalCalls}`);
    lines.push(`   Success:     ${hasCalls ? `${stats.successRate.toFixed(1)}%` : 'N/A'}`);
    if (hasCalls) {
        const avgColor = stats.average < 500 ? Colors.green : stats.average < 1500 ? Colors.yellow : Colors.red;
        lines.push(`   Avg Time:    ${colorize(`${stats.average}ms`, avgColor, useColors)}`);
        lines.push(`   Min/Avg/Max: ${stats.min}/${stats.average}/${stats.max}ms`);
        lines.push(`   P95/P99:     ${stats.p95}/${stats.p99}ms`);
    } else {
        lines.push(`   Avg Time:    N/A`);
    }

    return lines;
}

/**
 * Draw a horizontal line
 */
function drawLine(width: number, char: string = '─'): string {
    return char.repeat(width);
}

/**
 * Draw a section header
 */
function drawHeader(title: string, width: number, useColors: boolean): string {
    const padding = Math.max(0, width - title.length - 2);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    const line = drawLine(width);
    const coloredTitle = useColors ? Colors.bright + Colors.cyan + title + Colors.reset : title;
    return `\n${line}\n${' '.repeat(leftPad)}${coloredTitle}${' '.repeat(rightPad)}\n${line}\n`;
}

/**
 * Display environmental sensor diagnostics
 */
export function displayEnvironmentalDiagnostics(
    diagnostics: ReturnType<typeof import('../core/sensors/EnvironmentalSensors').EnvironmentalSensors.prototype.getDiagnostics>,
    config: DashboardConfig = {}
): void {
    const mergedConfig = { ...defaultConfig, ...config };
    const useColors = shouldUseColors(mergedConfig);
    const width = 60;

    // Main title
    console.log(drawHeader('ENVIRONMENTAL SENSORS', width, useColors));

    // Timestamp
    if (mergedConfig.showTimestamp) {
        console.log(`${colorize('Timestamp:', Colors.dim, useColors)} ${formatTimestamp(diagnostics.timestamp)}`);
        console.log(`${colorize('Diagnostic Mode:', Colors.dim, useColors)} ${diagnostics.diagnosticMode ? colorize('ENABLED', Colors.yellow, useColors) : 'Disabled'}`);
        console.log('');
    }

    // Sensor Status Section
    console.log(colorize('┌─ SENSOR STATUS', Colors.cyan, useColors));
    console.log(drawLine(22) + (useColors ? Colors.reset : ''));

    for (const sensor of diagnostics.sensors) {
        const healthIndicator = getHealthColor(sensor.status.health, useColors);
        const healthLabel = colorize(
            sensor.status.health.toUpperCase().padEnd(8),
            sensor.status.health === 'healthy' ? Colors.green :
            sensor.status.health === 'failed' ? Colors.red : Colors.yellow,
            useColors
        );

        console.log(`\n ${colorize(sensor.type.toUpperCase().padEnd(12), Colors.bright, useColors)}`);
        console.log(`   Health:      ${healthIndicator} ${healthLabel}`);
        console.log(`   Permission:  ${getPermissionText(sensor.permission, useColors)}`);
        console.log(`   Availability:${getAvailabilityText(sensor.availability, useColors)}`);

        if (sensor.status.consecutiveFailures > 0) {
            console.log(`   Failures:    ${colorize(sensor.status.consecutiveFailures.toString(), Colors.red, useColors)} consecutive`);
        }

        if (sensor.status.lastError) {
            const errorPreview = sensor.status.lastError.length > 40
                ? sensor.status.lastError.substring(0, 37) + '...'
                : sensor.status.lastError;
            console.log(`   Last Error:  ${colorize(errorPreview, Colors.red, useColors)}`);
        }

        // Show last success/failure timestamps
        if (sensor.status.lastSuccessTimestamp) {
            const age = Date.now() - sensor.status.lastSuccessTimestamp;
            console.log(`   Last Read:   ${formatDuration(age)} ago`);
        }
    }

    // Cache Statistics Section
    console.log(`\n${colorize('┌─ CACHE STATISTICS', Colors.cyan, useColors)}`);
    console.log(drawLine(22) + (useColors ? Colors.reset : ''));

    console.log(`\n ${colorize('GEOLOCATION', Colors.bright, useColors)}`);
    console.log(`   Cache Age:   ${diagnostics.cache.geolocation.age !== null ? formatDuration(diagnostics.cache.geolocation.age) : 'N/A'}`);
    console.log(`   Expired:     ${diagnostics.cache.geolocation.isExpired ? colorize('Yes', Colors.red, useColors) : colorize('No', Colors.green, useColors)}`);
    console.log(`   Hit Rate:    ${formatHitRate(diagnostics.cache.geolocation.stats.hits, diagnostics.cache.geolocation.stats.misses)} (${diagnostics.cache.geolocation.stats.hits}h/${diagnostics.cache.geolocation.stats.misses}m)`);

    console.log(`\n ${colorize('WEATHER API', Colors.bright, useColors)}`);
    console.log(`   Cache Size:  ${diagnostics.cache.weather.size} entries`);
    console.log(`   TTL:         12 minutes`);
    console.log(`   Hit Rate:    ${formatHitRate(diagnostics.cache.weather.stats.hits, diagnostics.cache.weather.stats.misses)} (${diagnostics.cache.weather.stats.hits}h/${diagnostics.cache.weather.stats.misses}m)`);

    // Performance Metrics Section
    console.log(`\n${colorize('┌─ API PERFORMANCE', Colors.cyan, useColors)}`);
    console.log(drawLine(20) + (useColors ? Colors.reset : ''));

    console.log(`\n ${colorize('WEATHER API', Colors.bright, useColors)}`);
    const weatherPerfLines = formatPerformanceStats(diagnostics.performance.weatherApi, useColors);
    for (const line of weatherPerfLines) {
        console.log(line);
    }

    console.log(`\n ${colorize('FORECAST API', Colors.bright, useColors)}`);
    const forecastPerfLines = formatPerformanceStats(diagnostics.performance.forecastApi, useColors);
    for (const line of forecastPerfLines) {
        console.log(line);
    }

    // Recent Failures Section
    if (diagnostics.recentFailures.length > 0) {
        const failures = diagnostics.recentFailures.slice(0, mergedConfig.maxFailures);
        console.log(`\n${colorize('┌─ RECENT FAILURES', Colors.red, useColors)}`);
        console.log(drawLine(22) + (useColors ? Colors.reset : ''));

        for (const failure of failures) {
            const timeAgo = formatDuration(Date.now() - failure.timestamp);
            console.log(`\n ${colorize(failure.sensorType.toUpperCase(), Colors.bright, useColors)} - ${colorize(timeAgo, Colors.dim, useColors)} ago`);
            console.log(`   Error: ${colorize(failure.error, Colors.red, useColors)}`);
            console.log(`   Retry: ${failure.retryAttempt}${failure.willRetry ? ' (will retry)' : ' (final)'}`);
        }
    }

    // Context Availability
    console.log(`\n${colorize('┌─ CONTEXT DATA', Colors.cyan, useColors)}`);
    console.log(drawLine(17) + (useColors ? Colors.reset : ''));
    console.log(`\n Geolocation: ${diagnostics.context.hasGeolocation ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.red, useColors)}`);
    console.log(` Motion:      ${diagnostics.context.hasMotion ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.red, useColors)}`);
    console.log(` Weather:     ${diagnostics.context.hasWeather ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.red, useColors)}`);
    console.log(` Light:       ${diagnostics.context.hasLight ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.red, useColors)}`);
    console.log(` Biome:       ${diagnostics.context.hasBiome ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.red, useColors)}`);

    console.log(`\n${drawLine(width)}\n`);
}

/**
 * Display gaming platform sensor diagnostics
 */
export function displayGamingDiagnostics(
    diagnostics: ReturnType<typeof import('../core/sensors/GamingPlatformSensors').GamingPlatformSensors.prototype.getDiagnostics>,
    config: DashboardConfig = {}
): void {
    const mergedConfig = { ...defaultConfig, ...config };
    const useColors = shouldUseColors(mergedConfig);
    const width = 60;

    // Main title
    console.log(drawHeader('GAMING PLATFORM SENSORS', width, useColors));

    // Timestamp
    if (mergedConfig.showTimestamp) {
        console.log(`${colorize('Timestamp:', Colors.dim, useColors)} ${formatTimestamp(diagnostics.timestamp)}\n`);
    }

    // Platform Connection Status
    console.log(colorize('┌─ PLATFORM STATUS', Colors.cyan, useColors));
    console.log(drawLine(22) + (useColors ? Colors.reset : ''));

    console.log(`\n ${colorize('STEAM', Colors.bright, useColors)}`);
    console.log(`   Authenticated: ${diagnostics.steam.isAuthenticated ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.red, useColors)}`);
    console.log(`   API Key:       ${diagnostics.steam.apiKey ? colorize('✓ Configured', Colors.green, useColors) : colorize('✗ Missing', Colors.red, useColors)}`);
    if (diagnostics.steam.userId) {
        console.log(`   User ID:       ${diagnostics.steam.userId}`);
    }

    // Current Gaming Context
    console.log(`\n${colorize('┌─ GAMING CONTEXT', Colors.cyan, useColors)}`);
    console.log(drawLine(20) + (useColors ? Colors.reset : ''));

    const isGaming = diagnostics.gamingContext.isActivelyGaming;
    console.log(`\n Active Gaming: ${isGaming ? colorize('✓ Yes', Colors.green, useColors) : colorize('✗ No', Colors.dim, useColors)}`);
    console.log(` Platform:      ${colorize(diagnostics.gamingContext.platformSource.toUpperCase(), isGaming ? Colors.green : Colors.dim, useColors)}`);

    if (diagnostics.gamingContext.currentGame) {
        const game = diagnostics.gamingContext.currentGame;
        console.log(`\n ${colorize('Current Game:', Colors.bright, useColors)}`);
        console.log(`   Name:     ${colorize(game.name, Colors.cyan, useColors)}`);
        console.log(`   Source:   ${game.source}`);
        if (game.genre && game.genre.length > 0) {
            console.log(`   Genre:    ${game.genre.join(', ')}`);
        }
        if (game.sessionDuration) {
            console.log(`   Session:  ${formatDuration(game.sessionDuration * 1000 * 60)}`);
        }
        if (game.partySize) {
            console.log(`   Party:    ${game.partySize} player${game.partySize > 1 ? 's' : ''}`);
        }
    }

    if (diagnostics.gamingContext.gamesPlayedWhileListening.length > 0) {
        console.log(`\n ${colorize('Games While Listening:', Colors.bright, useColors)}`);
        for (const gameName of diagnostics.gamingContext.gamesPlayedWhileListening) {
            console.log(`   • ${gameName}`);
        }
    }

    // Polling Status
    console.log(`\n${colorize('┌─ POLLING STATUS', Colors.cyan, useColors)}`);
    console.log(drawLine(19) + (useColors ? Colors.reset : ''));

    console.log(`\n Active:        ${diagnostics.polling.isActive ? colorize('✓', Colors.green, useColors) : colorize('✗', Colors.dim, useColors)}`);
    console.log(` Interval:      ${formatDuration(diagnostics.polling.intervalMs)}`);
    if (diagnostics.polling.exponentialBackoff > 1) {
        console.log(` Backoff:       ${colorize(`${diagnostics.polling.exponentialBackoff}x`, Colors.yellow, useColors)}`);
    }

    // Cache Information
    console.log(`\n${colorize('┌─ CACHE', Colors.cyan, useColors)}`);
    console.log(drawLine(10) + (useColors ? Colors.reset : ''));

    console.log(`\n Game Metadata: ${diagnostics.cache.gameMetadataCacheSize} entries`);
    if (diagnostics.cache.cachedGames.length > 0) {
        console.log(` Cached Games:`);
        for (const game of diagnostics.cache.cachedGames.slice(0, 5)) {
            console.log(`   • ${game}`);
        }
        if (diagnostics.cache.cachedGames.length > 5) {
            console.log(`   ... and ${diagnostics.cache.cachedGames.length - 5} more`);
        }
    }

    // API Performance Section
    console.log(`\n${colorize('┌─ API PERFORMANCE', Colors.cyan, useColors)}`);
    console.log(drawLine(20) + (useColors ? Colors.reset : ''));

    console.log(`\n ${colorize('CURRENT GAME API', Colors.bright, useColors)}`);
    const currentGamePerfLines = formatPerformanceStats(diagnostics.performance.currentGameApi, useColors);
    for (const line of currentGamePerfLines) {
        console.log(line);
    }

    console.log(`\n ${colorize('METADATA API', Colors.bright, useColors)}`);
    const metadataPerfLines = formatPerformanceStats(diagnostics.performance.metadataApi, useColors);
    for (const line of metadataPerfLines) {
        console.log(line);
    }

    console.log(`\n${drawLine(width)}\n`);
}

/**
 * Display a combined system dashboard
 */
export function displaySystemDashboard(data: {
    environmental?: ReturnType<typeof import('../core/sensors/EnvironmentalSensors').EnvironmentalSensors.prototype.getDiagnostics>;
    gaming?: ReturnType<typeof import('../core/sensors/GamingPlatformSensors').GamingPlatformSensors.prototype.getDiagnostics>;
}, config: DashboardConfig = {}): void {
    const mergedConfig = { ...defaultConfig, ...config };
    const useColors = shouldUseColors(mergedConfig);
    const width = 70;

    // System title
    console.log(drawHeader('SENSOR SYSTEM DASHBOARD', width, useColors));

    if (mergedConfig.showTimestamp) {
        const timestamp = data.environmental?.timestamp || data.gaming?.timestamp || Date.now();
        console.log(`${colorize('Generated:', Colors.dim, useColors)} ${formatTimestamp(timestamp)}\n`);
    }

    // Quick Health Summary
    console.log(colorize('┌─ QUICK HEALTH SUMMARY', Colors.cyan, useColors));
    console.log(drawLine(26) + (useColors ? Colors.reset : ''));

    if (data.environmental) {
        let healthyCount = 0;
        for (const sensor of data.environmental.sensors) {
            if (sensor.status.health === 'healthy') healthyCount++;
        }
        const allHealthy = healthyCount === data.environmental.sensors.length;
        console.log(`\n Environmental: ${allHealthy ? colorize(`✓ ${healthyCount}/${healthyCount} Healthy`, Colors.green, useColors) : colorize(`⚠ ${healthyCount}/${data.environmental.sensors.length} Healthy`, Colors.yellow, useColors)}`);
    }

    if (data.gaming) {
        const steamConnected = data.gaming.steam.isAuthenticated;
        console.log(` Gaming:        ${steamConnected ? colorize('✓ Connected', Colors.green, useColors) : colorize('✗ Disconnected', Colors.dim, useColors)}`);
    }

    // Detailed sections
    console.log('');
    if (data.environmental) {
        displayEnvironmentalDiagnostics(data.environmental, mergedConfig);
    }

    if (data.gaming) {
        displayGamingDiagnostics(data.gaming, mergedConfig);
    }
}

/**
 * Export as a named export object for convenient importing
 */
export const SensorDashboard = {
    displayEnvironmentalDiagnostics,
    displayGamingDiagnostics,
    displaySystemDashboard,
};
