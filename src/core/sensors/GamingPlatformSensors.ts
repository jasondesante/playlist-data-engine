import type { GamingContext } from '../types/Progression';
import { SteamAPIClient } from './SteamAPIClient';
import { DiscordRPCClient, DiscordConnectionState } from './DiscordRPCClient';
import { Logger } from '../../utils/logger.js';
import { SensorDashboard, type DashboardConfig } from '../../utils/sensorDashboard.js';

/**
 * GamingPlatformSensors - Unified interface for gaming detection
 * Monitors active games and calculates gaming-based XP bonuses
 *
 * Note: Discord RPC CANNOT read game activity due to platform limitations.
 * Discord RPC is only used for SETTING music presence ("Listening to" status).
 * Game detection uses Steam API only.
 */
export class GamingPlatformSensors {
    private steam: SteamAPIClient;
    private discord: DiscordRPCClient;
    private steamUserId?: string;
    private steamApiKey?: string;
    private discordClientId?: string;
    private pollIntervalMs: number = 60000; // 60 seconds default
    private pollingInterval: NodeJS.Timeout | null = null;
    private exponentialBackoff: number = 1;
    private maxBackoffMs: number = 600000; // 10 minutes max backoff
    private logger = Logger.for('GamingPlatformSensors');
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
     * Initialize GamingPlatformSensors with optional Steam and Discord configuration
     * Matches specification from specs/001-core-engine/SPEC.md
     */
    constructor(config: {
        steam?: {
            apiKey: string;
            steamId?: string;
            pollInterval?: number;
        };
        discord?: {
            clientId: string;
            enableRichPresence?: boolean;
            pollInterval?: number;
        };
    } = {}) {
        // Steam configuration
        if (config.steam) {
            this.steamApiKey = config.steam.apiKey;
            this.steamUserId = config.steam.steamId;
            if (config.steam.pollInterval) {
                this.pollIntervalMs = config.steam.pollInterval;
            }
        }

        // Discord configuration
        if (config.discord) {
            this.discordClientId = config.discord.clientId;
            if (config.discord.pollInterval) {
                this.pollIntervalMs = config.discord.pollInterval;
            }
        }

        // Initialize clients with their respective API keys
        this.steam = new SteamAPIClient(this.steamApiKey);
        this.discord = new DiscordRPCClient(this.discordClientId);
    }

    /**
     * Authenticate with Steam and Discord
     */
    async authenticate(steamUserId?: string, discordUserId?: string): Promise<boolean> {
        let steamAuth = false;
        let discordAuth = false;

        if (steamUserId) {
            this.steamUserId = steamUserId;
            steamAuth = true;
        }

        if (discordUserId) {
            // Future: store discordUserId for Discord API calls
            discordAuth = await this.discord.connect();
        }

        return steamAuth || discordAuth;
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
     * Note: Discord RPC cannot read game activity (platform limitation)
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
     * Capped at 3.0x total
     */
    calculateGamingBonus(): number {
        const context = this.getContext();
        if (!context.isActivelyGaming) {
            return 1.0;
        }

        let bonus = 0.25; // Base +25%

        const game = context.currentGame;
        if (game) {
            // Genre bonuses
            if (game.genre) {
                for (const g of game.genre) {
                    const genreLower = g.toLowerCase();
                    if (genreLower.includes('rpg')) bonus += 0.2;
                    else if (genreLower.includes('action')) bonus += 0.15;
                    else if (genreLower.includes('strategy')) bonus += 0.1;
                }
            }

            // Multiplayer bonus
            if (game.partySize && game.partySize > 1) {
                bonus += 0.15;
            }

            // Session duration bonus (up to 20% for 4+ hours)
            if (game.sessionDuration) {
                const hours = game.sessionDuration / 60;
                const durationBonus = Math.min(hours / 4 * 0.2, 0.2);
                bonus += durationBonus;
            }
        }

        return Math.min(1.0 + bonus, 3.0);
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
     * Returns structured data about gaming platform connection states and cache
     *
     * @returns Diagnostic report containing Steam and Discord connection states
     */
    getDiagnostics(): {
        timestamp: number;
        steam: {
            isAuthenticated: boolean;
            userId?: string;
            apiKey: boolean;
        };
        discord: {
            isConnected: boolean;
            clientId: boolean;
            connectionState: string;
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
    } {
        return {
            timestamp: Date.now(),
            steam: {
                isAuthenticated: !!this.steamUserId,
                userId: this.steamUserId,
                apiKey: !!this.steamApiKey,
            },
            discord: {
                isConnected: this.discord.getConnectionState() === DiscordConnectionState?.Connected,
                clientId: !!this.discordClientId,
                connectionState: this.discord.getConnectionState()?.toString() || 'unknown',
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
        };
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
