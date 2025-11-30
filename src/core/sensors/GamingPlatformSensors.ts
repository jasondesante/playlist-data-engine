import type { GamingContext } from '../types/Progression';
import { SteamAPIClient } from './SteamAPIClient';
import { DiscordRPCClient } from './DiscordRPCClient';

/**
 * GamingPlatformSensors - Unified interface for Steam and Discord gaming detection
 * Monitors active games and calculates gaming-based XP bonuses
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
     * Matches specification from ENGINE_DESIGN_DOCUMENT.md Section 7.C
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
            this.discordUserId = discordUserId;
            discordAuth = this.discord.connect();
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
     * Update gaming status from Steam and Discord
     */
    private async updateGamingStatus(): Promise<void> {
        try {
            const steamGame = this.steamUserId ? await this.steam.getCurrentGame(this.steamUserId) : null;
            const discordGame = this.discord.isConnectedToDiscord() ? await this.discord.getCurrentGame() : null;

            // Merge Steam and Discord data
            const currentGame = steamGame || discordGame;

            // Update gaming context
            this.gamingContext = {
                isActivelyGaming: !!currentGame,
                platformSource: steamGame && discordGame ? 'both' : steamGame ? 'steam' : discordGame ? 'discord' : 'none',
                currentGame: currentGame ? {
                    name: currentGame.name,
                    source: currentGame.source,
                    genre: await this.getGameMetadata(currentGame.name).then(m => m?.genre),
                    sessionDuration: currentGame.sessionDuration,
                    partySize: currentGame.partySize
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
            console.warn('Error updating gaming status:', error);
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
            console.warn(`Failed to fetch metadata for game: ${gameName}`, error);
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
}
