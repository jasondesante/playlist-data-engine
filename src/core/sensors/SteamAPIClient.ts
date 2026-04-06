import { Logger } from '../../utils/logger.js';

/**
 * Performance metrics for API calls
 */
interface PerformanceMetrics {
    successCount: number;
    errorCount: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    lastCallTimestamp: number | null;
}

/**
 * SteamAPIClient - Handles integration with Steam Web API
 * Fetches currently played games and game metadata
 */
export class SteamAPIClient {
    private apiKey: string;
    private baseUrl: string = 'https://api.steampowered.com';
    private logger = Logger.for('SteamAPIClient');

    // Performance metrics for current game API
    private currentGameApiMetrics: PerformanceMetrics = {
        successCount: 0,
        errorCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastCallTimestamp: null
    };

    // Performance metrics for game metadata API
    private metadataApiMetrics: PerformanceMetrics = {
        successCount: 0,
        errorCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        lastCallTimestamp: null
    };

    // Store recent API call times for percentile calculations (last 100 calls)
    private recentCurrentGameTimes: number[] = [];
    private recentMetadataTimes: number[] = [];
    private readonly maxRecentSamples = 100;

    constructor(apiKey: string = '') {
        this.apiKey = apiKey;
    }

    /**
     * Calculate percentile from an array of numbers
     */
    private calculatePercentile(values: number[], percentile: number): number {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Record performance metrics for current game API call
     */
    private recordCurrentGameApiCall(elapsedMs: number, success: boolean): void {
        const now = Date.now();

        if (success) {
            this.currentGameApiMetrics.successCount++;
            this.currentGameApiMetrics.totalTime += elapsedMs;
            this.currentGameApiMetrics.minTime = Math.min(this.currentGameApiMetrics.minTime, elapsedMs);
            this.currentGameApiMetrics.maxTime = Math.max(this.currentGameApiMetrics.maxTime, elapsedMs);

            // Store recent times for percentile calculation
            this.recentCurrentGameTimes.push(elapsedMs);
            if (this.recentCurrentGameTimes.length > this.maxRecentSamples) {
                this.recentCurrentGameTimes.shift();
            }
        } else {
            this.currentGameApiMetrics.errorCount++;
        }

        this.currentGameApiMetrics.lastCallTimestamp = now;
    }

    /**
     * Record performance metrics for metadata API call
     */
    private recordMetadataApiCall(elapsedMs: number, success: boolean): void {
        const now = Date.now();

        if (success) {
            this.metadataApiMetrics.successCount++;
            this.metadataApiMetrics.totalTime += elapsedMs;
            this.metadataApiMetrics.minTime = Math.min(this.metadataApiMetrics.minTime, elapsedMs);
            this.metadataApiMetrics.maxTime = Math.max(this.metadataApiMetrics.maxTime, elapsedMs);

            // Store recent times for percentile calculation
            this.recentMetadataTimes.push(elapsedMs);
            if (this.recentMetadataTimes.length > this.maxRecentSamples) {
                this.recentMetadataTimes.shift();
            }
        } else {
            this.metadataApiMetrics.errorCount++;
        }

        this.metadataApiMetrics.lastCallTimestamp = now;
    }

    /**
     * Get performance metrics for current game API
     */
    getCurrentGameApiMetrics(): PerformanceMetrics {
        return { ...this.currentGameApiMetrics };
    }

    /**
     * Get performance statistics for current game API
     */
    getCurrentGameApiStatistics(): {
        average: number;
        min: number;
        max: number;
        totalCalls: number;
        successRate: number;
        p95: number;
        p99: number;
    } {
        const totalCalls = this.currentGameApiMetrics.successCount + this.currentGameApiMetrics.errorCount;
        const average = this.currentGameApiMetrics.successCount > 0
            ? this.currentGameApiMetrics.totalTime / this.currentGameApiMetrics.successCount
            : 0;
        const successRate = totalCalls > 0
            ? (this.currentGameApiMetrics.successCount / totalCalls) * 100
            : 0;

        return {
            average: Math.round(average),
            min: this.currentGameApiMetrics.minTime === Infinity ? 0 : Math.round(this.currentGameApiMetrics.minTime),
            max: Math.round(this.currentGameApiMetrics.maxTime),
            totalCalls,
            successRate: Math.round(successRate * 10) / 10,
            p95: Math.round(this.calculatePercentile(this.recentCurrentGameTimes, 95)),
            p99: Math.round(this.calculatePercentile(this.recentCurrentGameTimes, 99))
        };
    }

    /**
     * Get performance metrics for metadata API
     */
    getMetadataApiMetrics(): PerformanceMetrics {
        return { ...this.metadataApiMetrics };
    }

    /**
     * Get performance statistics for metadata API
     */
    getMetadataApiStatistics(): {
        average: number;
        min: number;
        max: number;
        totalCalls: number;
        successRate: number;
        p95: number;
        p99: number;
    } {
        const totalCalls = this.metadataApiMetrics.successCount + this.metadataApiMetrics.errorCount;
        const average = this.metadataApiMetrics.successCount > 0
            ? this.metadataApiMetrics.totalTime / this.metadataApiMetrics.successCount
            : 0;
        const successRate = totalCalls > 0
            ? (this.metadataApiMetrics.successCount / totalCalls) * 100
            : 0;

        return {
            average: Math.round(average),
            min: this.metadataApiMetrics.minTime === Infinity ? 0 : Math.round(this.metadataApiMetrics.minTime),
            max: Math.round(this.metadataApiMetrics.maxTime),
            totalCalls,
            successRate: Math.round(successRate * 10) / 10,
            p95: Math.round(this.calculatePercentile(this.recentMetadataTimes, 95)),
            p99: Math.round(this.calculatePercentile(this.recentMetadataTimes, 99))
        };
    }

    /**
     * Reset all performance metrics
     */
    resetPerformanceMetrics(): void {
        this.currentGameApiMetrics = {
            successCount: 0,
            errorCount: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            lastCallTimestamp: null
        };
        this.metadataApiMetrics = {
            successCount: 0,
            errorCount: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            lastCallTimestamp: null
        };
        this.recentCurrentGameTimes = [];
        this.recentMetadataTimes = [];
    }

    /**
     * Get currently played game for a Steam user
     * Uses ISteamUser/GetPlayerSummaries to detect real-time "in-game" status.
     * GetPlayerSummaries returns `gameextrainfo` and `gameid` only when the user
     * is actively in a game right now — unlike GetRecentlyPlayedGames which only
     * shows games played in the last 2 weeks with no "currently playing" indicator.
     */
    async getCurrentGame(steamUserId: string): Promise<{
        name: string;
        appId: number;
        source: 'steam';
        sessionDuration?: number;
    } | null> {
        if (!this.apiKey) {
            this.logger.warn('Steam API key not provided');
            return null;
        }

        const startTime = performance.now();
        let success = false;

        try {
            const url = `${this.baseUrl}/ISteamUser/GetPlayerSummaries/v2/?` +
                `key=${this.apiKey}&steamids=${steamUserId}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Steam API error: ${response.statusText}`);
            }

            const data = await response.json();
            const player = data.response?.players?.[0];

            if (!player?.gameextrainfo) {
                // Player exists but is not currently in a game
                return null;
            }

            success = true;
            return {
                name: player.gameextrainfo,
                appId: parseInt(player.gameid, 10),
                source: 'steam',
            };
        } catch (error) {
            this.logger.error('Failed to fetch current Steam game', { error });
            return null;
        } finally {
            const elapsed = performance.now() - startTime;
            this.recordCurrentGameApiCall(elapsed, success);
        }
    }

    /**
     * Get game metadata (genre, description, etc.)
     * Uses ISteamApps/GetAppList and store API to fetch game details
     */
    async getGameMetadata(gameName: string): Promise<{
        appId?: number;
        name: string;
        genre?: string[];
        description?: string;
    } | null> {
        const startTime = performance.now();
        let success = false;

        try {
            // First, find the app ID using GetAppList
            const appId = await this.findAppId(gameName);

            if (!appId) {
                return { name: gameName };
            }

            // Then fetch game details from Steam store API
            const storeUrl = `https://steamcommunity.com/api/appdetails?appids=${appId}`;
            const response = await fetch(storeUrl);

            if (!response.ok) {
                return { name: gameName, appId };
            }

            const data = await response.json();
            const gameData = data[appId]?.data;

            if (!gameData) {
                return { name: gameName, appId };
            }

            success = true;
            return {
                appId,
                name: gameData.name || gameName,
                genre: gameData.genres?.map((g: any) => g.description) || [],
                description: gameData.short_description
            };
        } catch (error) {
            this.logger.error(`Failed to fetch Steam metadata for ${gameName}`, { error });
            return { name: gameName };
        } finally {
            const elapsed = performance.now() - startTime;
            this.recordMetadataApiCall(elapsed, success);
        }
    }

    /**
     * Find Steam app ID by game name
     */
    private async findAppId(gameName: string): Promise<number | null> {
        if (!this.apiKey) return null;

        try {
            const url = `${this.baseUrl}/ISteamApps/GetAppList/v2/`;
            const response = await fetch(url);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const apps = data.applist?.apps || [];

            // Find app by name (case-insensitive)
            const gameNameLower = gameName.toLowerCase();
            const found = apps.find((app: any) =>
                app.name.toLowerCase() === gameNameLower
            );

            return found?.appid || null;
        } catch (error) {
            this.logger.error('Failed to find Steam app ID', { error });
            return null;
        }
    }

    /**
     * Get game schema/stats for a game
     * Uses ISteamUserStats/GetSchemaForGame
     */
    async getGameSchema(appId: number): Promise<any> {
        if (!this.apiKey) return null;

        try {
            const url = `${this.baseUrl}/ISteamUserStats/GetSchemaForGame/v2/` +
                `?appid=${appId}&key=${this.apiKey}`;

            const response = await fetch(url);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.game || null;
        } catch (error) {
            this.logger.error('Failed to fetch game schema', { error });
            return null;
        }
    }
}
