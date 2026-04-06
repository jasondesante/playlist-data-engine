import type { GamingContext } from '../types/Progression';
import type { GamingSensorConfig, XPModifierConfig } from '../config/sensorConfig.js';
import { SteamAPIClient } from './SteamAPIClient';
import { Logger } from '../../utils/logger.js';
import { SensorDashboard, type DashboardConfig } from '../../utils/sensorDashboard.js';

/**
 * GamingPlatformSensors - Unified interface for gaming detection
 * Monitors active games and calculates gaming-based XP bonuses
 *
 * Game detection uses Steam API only.
 */
export class GamingPlatformSensors {
    private steam: SteamAPIClient;
    private steamUserId?: string;
    private steamApiKey?: string;
    private pollIntervalMs: number = 60000; // 60 seconds default
    private pollingInterval: NodeJS.Timeout | null = null;
    private exponentialBackoff: number = 1;
    private maxBackoffMs: number = 600000; // 10 minutes max backoff
    private logger = Logger.for('GamingPlatformSensors');

    // XP modifier configuration (default values)
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
    private gamingContext: GamingContext = {
        isActivelyGaming: false,
        platformSource: 'none',
        totalGamingMinutes: 0,
        gamesPlayedWhileListening: [],
        lastUpdated: Date.now()
    };
    private contextCallback: ((context: GamingContext) => void) | null = null;

    // Game metadata cache: gameName -> { genre, lastUpdated }
    private gameMetadataCache: Map<string, { genre?: string[]; lastUpdated: number }> = new Map();
    private cacheExpiryMs: number = 86400000; // 24 hours

    /**
     * Initialize GamingPlatformSensors with optional Steam configuration
     * Matches specification from specs/001-core-engine/SPEC.md
     *
     * Supports both legacy config format and new GamingSensorConfig format
     */
    constructor(config: {
        steam?: {
            apiKey: string;
            steamId?: string;
            pollInterval?: number;
        };
    } | GamingSensorConfig = {}) {
        // Steam configuration
        if ('steam' in config && config.steam) {
            this.steamApiKey = config.steam.apiKey;
            this.steamUserId = config.steam.steamId;
            if (config.steam.pollInterval) {
                this.pollIntervalMs = config.steam.pollInterval;
            }
        }

        // New GamingSensorConfig format support
        if ('metadataCacheExpiry' in config && config.metadataCacheExpiry) {
            this.cacheExpiryMs = config.metadataCacheExpiry;
        }
        if ('maxBackoffMs' in config && config.maxBackoffMs) {
            this.maxBackoffMs = config.maxBackoffMs;
        }
        if ('xpModifier' in config && config.xpModifier) {
            this.xpConfig = { ...this.xpConfig, ...config.xpModifier };
        }

        // Initialize Steam client
        this.steam = new SteamAPIClient(this.steamApiKey);
    }

    /**
     * Authenticate with Steam
     */
    async authenticate(steamUserId?: string): Promise<boolean> {
        if (steamUserId) {
            this.steamUserId = steamUserId;
            return true;
        }

        return !!this.steamUserId;
    }

    /**
     * Start polling for gaming activity
     */
    startMonitoring(callback?: (context: GamingContext) => void): void {
        if (this.pollingInterval) {
            return; // Already monitoring
        }

        this.contextCallback = callback || null;

        // Initial poll
        this.updateGamingStatus();

        // Set up recurring polls with exponential backoff on failure
        this.pollingInterval = setInterval(() => {
            this.updateGamingStatus();
        }, this.pollIntervalMs);
    }

    /**
     * Stop monitoring gaming activity
     */
    stopMonitoring(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.contextCallback = null;
    }

    /**
     * Update gaming status from Steam
     * Note: Only Steam API is used for game activity detection.
     */
    private async updateGamingStatus(): Promise<void> {
        try {
            const steamGame = this.steamUserId ? await this.steam.getCurrentGame(this.steamUserId) : null;

            // Update gaming context
            this.gamingContext = {
                isActivelyGaming: !!steamGame,
                platformSource: steamGame ? 'steam' : 'none',
                currentGame: steamGame ? {
                    name: steamGame.name,
                    source: steamGame.source,
                    genre: await this.getGameMetadata(steamGame.name).then(m => m?.genre),
                    sessionDuration: steamGame.sessionDuration,
                    partySize: ('partySize' in steamGame && typeof steamGame.partySize === 'number') ? steamGame.partySize : undefined
                } : undefined,
                totalGamingMinutes: this.gamingContext.totalGamingMinutes,
                gamesPlayedWhileListening: this.gamingContext.gamesPlayedWhileListening,
                lastUpdated: Date.now()
            };

            // Reset exponential backoff on success
            this.exponentialBackoff = 1;

            // Callback if provided
            if (this.contextCallback) {
                this.contextCallback(this.gamingContext);
            }
        } catch (error) {
            this.logger.warn('Error updating gaming status', { error });
            // Exponential backoff on error
            this.applyExponentialBackoff();
        }
    }

    /**
     * Apply exponential backoff for polling on errors
     */
    private applyExponentialBackoff(): void {
        this.exponentialBackoff = Math.min(
            this.exponentialBackoff * 2,
            this.maxBackoffMs / this.pollIntervalMs
        );

        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = setInterval(
                () => this.updateGamingStatus(),
                this.pollIntervalMs * this.exponentialBackoff
            );
        }
    }

    /**
     * Get cached game metadata or fetch it
     */
    private async getGameMetadata(gameName: string): Promise<{ genre?: string[] } | null> {
        const cached = this.gameMetadataCache.get(gameName);
        if (cached && Date.now() - cached.lastUpdated < this.cacheExpiryMs) {
            return cached;
        }

        try {
            const metadata = await this.steam.getGameMetadata(gameName);
            this.gameMetadataCache.set(gameName, {
                genre: metadata?.genre,
                lastUpdated: Date.now()
            });
            return metadata;
        } catch (error) {
            this.logger.warn(`Failed to fetch metadata for game: ${gameName}`, { error });
            return null;
        }
    }

    /**
     * Check if currently playing a specific game
     */
    isPlayingGame(gameName: string): boolean {
        const context = this.getContext();
        if (!context.currentGame) return false;
        return context.currentGame.name.toLowerCase() === gameName.toLowerCase();
    }

    /**
     * Calculate gaming XP bonus multiplier
     * Base: +25% for any gaming
     * Genre bonuses: RPG +20%, Action +15%, Strategy +10%
     * Multiplayer: +15% for party size > 1
     * Session duration: up to +20% for 4+ hours
     * Capped at configured max gaming modifier (default: 1.75x)
     */
    calculateGamingBonus(): number {
        const context = this.getContext();
        if (!context.isActivelyGaming) {
            return 1.0;
        }

        let bonus = this.xpConfig.gamingBaseBonus;

        const game = context.currentGame;
        if (game) {
            // Genre bonuses
            if (game.genre) {
                for (const g of game.genre) {
                    const genreLower = g.toLowerCase();
                    if (genreLower.includes('rpg')) bonus += this.xpConfig.gamingRPGBonus;
                    else if (genreLower.includes('action')) bonus += 0.15;
                    else if (genreLower.includes('strategy')) bonus += 0.1;
                }
            }

            // Multiplayer bonus
            if (game.partySize && game.partySize > 1) {
                bonus += this.xpConfig.gamingMultiplayerBonus;
            }

            // Session duration bonus (up to 20% for 4+ hours)
            if (game.sessionDuration) {
                const hours = game.sessionDuration / 60;
                const durationBonus = Math.min(hours / 4 * 0.2, 0.2);
                bonus += durationBonus;
            }
        }

        return Math.min(1.0 + bonus, this.xpConfig.maxGamingModifier);
    }

    /**
     * Get current gaming context
     */
    getContext(): GamingContext {
        return { ...this.gamingContext };
    }

    /**
     * Add game to list of games played while listening
     */
    recordGameSession(gameName: string, durationMinutes: number): void {
        if (!this.gamingContext.gamesPlayedWhileListening.includes(gameName)) {
            this.gamingContext.gamesPlayedWhileListening.push(gameName);
        }
        this.gamingContext.totalGamingMinutes += durationMinutes;
    }

    /**
     * Get comprehensive diagnostic information for troubleshooting
     * Returns structured data about gaming platform connection states, cache, and performance metrics
     *
     * @returns Diagnostic report containing Steam connection state, cache, and API performance
     */
    getDiagnostics(): {
        timestamp: number;
        steam: {
            isAuthenticated: boolean;
            userId?: string;
            apiKey: boolean;
        };
        gamingContext: GamingContext;
        polling: {
            isActive: boolean;
            intervalMs: number;
            exponentialBackoff: number;
        };
        cache: {
            gameMetadataCacheSize: number;
            cachedGames: string[];
        };
        performance: {
            currentGameApi: {
                average: number;
                min: number;
                max: number;
                totalCalls: number;
                successRate: number;
                p95: number;
                p99: number;
            };
            metadataApi: {
                average: number;
                min: number;
                max: number;
                totalCalls: number;
                successRate: number;
                p95: number;
                p99: number;
            };
        };
    } {
        return {
            timestamp: Date.now(),
            steam: {
                isAuthenticated: !!this.steamUserId,
                userId: this.steamUserId,
                apiKey: !!this.steamApiKey,
            },
            gamingContext: this.getContext(),
            polling: {
                isActive: this.pollingInterval !== null,
                intervalMs: this.pollIntervalMs,
                exponentialBackoff: this.exponentialBackoff,
            },
            cache: {
                gameMetadataCacheSize: this.gameMetadataCache.size,
                cachedGames: Array.from(this.gameMetadataCache.keys()),
            },
            performance: {
                currentGameApi: this.steam.getCurrentGameApiStatistics(),
                metadataApi: this.steam.getMetadataApiStatistics(),
            },
        };
    }

    /**
     * Get game schema (achievements, stats) for a Steam app
     * @param appId Steam app ID
     * @returns Game schema containing achievements and player stats, or null if unavailable
     */
    async fetchGameSchema(appId: number): Promise<{
        gameName?: string;
        gameVersion?: string;
        availableGameStats?: {
            achievements?: Array<{
                name: string;
                displayName: string;
                description?: string;
                icon?: string;
                hidden?: number;
            }>;
            stats?: Array<{
                name: string;
                displayName?: string;
                value: number;
            }>;
        };
    } | null> {
        return this.steam.getGameSchema(appId);
    }

    /**
     * Print a formatted dashboard to the console with gaming sensor status information
     * Useful for debugging and monitoring during development
     *
     * @param config Optional dashboard configuration (colors, compact mode, etc.)
     *
     * @example
     * gamingSensors.printDashboard();
     * gamingSensors.printDashboard({ useColors: false, compact: true });
     */
    printDashboard(config?: DashboardConfig): void {
        SensorDashboard.displayGamingDiagnostics(this.getDiagnostics(), config);
    }
}
