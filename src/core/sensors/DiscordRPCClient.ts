/**
 * DiscordRPCClient - Handles Discord Rich Presence integration
 *
 * Purpose: Display serverless playlist music information on the user's Discord profile
 * via Rich Presence ("Listening to {song}" status).
 *
 * Discord RPC Capabilities:
 * ✅ SET Rich Presence - Tell Discord what song/music you're listening to
 * ✅ Activity types: Playing (0), Streaming (1), Listening (2), Competing (5)
 * ✅ Show song name, artist, progress bar, album art
 *
 * ⚠️ IMPORTANT LIMITATION: Discord RPC cannot retrieve the user's current game activity.
 * Discord RPC is designed only for SETTING presence (what your app displays), not READING
 * what games Discord detects. For game detection, use Steam API or other platform APIs.
 *
 * What it CANNOT do:
 * - Detect what game the user is playing (platform limitation)
 * - Read other users' activities
 * - Query Discord's game detection (not exposed via RPC)
 */
import { DiscordRPCClient as RPCClient } from '@ryuziii/discord-rpc';

export class DiscordRPCClient {
    private clientId: string;
    private rpcClient: RPCClient | null = null;
    private isConnected: boolean = false;
    private currentGame: {
        name: string;
        source: 'discord';
        sessionDuration?: number;
        partySize?: number;
    } | null = null;
    private connectionAttempts: number = 0;
    private maxReconnectTries: number = 5;
    private reconnectDelay: number = 2000; // ms
    private disconnectRequested: boolean = false;

    constructor(clientId: string = '') {
        this.clientId = clientId;
    }

    /**
     * Connect to Discord RPC
     * Uses @ryuziii/discord-rpc library for real connection
     */
    async connect(): Promise<boolean> {
        if (!this.clientId) {
            console.warn('Discord client ID not provided');
            return false;
        }

        this.disconnectRequested = false;

        try {
            // Create the RPC client with IPC transport
            this.rpcClient = new RPCClient({
                clientId: this.clientId,
                transport: 'ipc'
            });

            // Set up event handlers for connection state
            this.setupEventHandlers();

            // Attempt connection (the library handles auto-reconnect internally)
            await this.rpcClient.connect();

            // The 'ready' event will set isConnected to true when connection is established
            // For now, return true to indicate connection attempt was initiated
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to connect to Discord RPC:', errorMessage);
            this.connectionAttempts++;
            this.isConnected = false;
            this.rpcClient = null;

            // Don't auto-retry here - the library handles reconnection internally
            // We just report the initial connection failure
            return false;
        }
    }

    /**
     * Set up event handlers for the RPC client
     */
    private setupEventHandlers(): void {
        if (!this.rpcClient) return;

        // Connection ready
        this.rpcClient.on('ready', () => {
            this.isConnected = true;
            this.connectionAttempts = 0;
            console.log('Discord RPC connected successfully');
        });

        // Disconnection
        this.rpcClient.on('disconnected', () => {
            if (!this.disconnectRequested) {
                // Unexpected disconnection
                console.warn('Discord RPC disconnected unexpectedly');
            }
            this.isConnected = false;
        });

        // Error handling
        this.rpcClient.on('error', (error: Error) => {
            console.error('Discord RPC error:', error.message);
            this.isConnected = false;
        });

        // Activity updates (for detecting game changes from Discord)
        this.rpcClient.on('activityUpdate', (data: any) => {
            // This could be used to detect when the user's activity changes
            // For now, we'll just log it for debugging
            if (data && data.activity) {
                this.updateCurrentGameFromActivity(data.activity);
            }
        });
    }

    /**
     * Update current game from Discord activity data
     */
    private updateCurrentGameFromActivity(activity: any): void {
        if (!activity) {
            this.currentGame = null;
            return;
        }

        // Extract game info from Discord activity
        this.currentGame = {
            name: activity.name || activity.details || 'Unknown Game',
            source: 'discord',
            sessionDuration: activity.timestamps ? this.calculateSessionDuration(activity.timestamps) : undefined,
            partySize: activity.party?.size?.[1] || activity.party?.size?.[0] || undefined
        };
    }

    /**
     * Calculate session duration from Discord timestamps
     */
    private calculateSessionDuration(timestamps: { start?: number; end?: number }): number | undefined {
        if (timestamps.start) {
            const start = timestamps.start; // Unix timestamp in seconds
            const now = Math.floor(Date.now() / 1000);
            const durationSeconds = now - start;
            return Math.floor(durationSeconds / 60); // Convert to minutes
        }
        return undefined;
    }

    /**
     * Disconnect from Discord RPC
     */
    disconnect(): void {
        this.disconnectRequested = true;
        if (this.rpcClient) {
            try {
                this.rpcClient.disconnect();
            } catch (error) {
                console.warn('Error disconnecting Discord RPC:', error);
            }
            this.rpcClient = null;
        }
        this.isConnected = false;
        this.currentGame = null;
    }

    /**
     * Check if connected to Discord
     */
    isConnectedToDiscord(): boolean {
        return this.isConnected && this.rpcClient !== null;
    }

    /**
     * Get currently played game from Discord Rich Presence
     *
     * ⚠️ PLATFORM LIMITATION: Discord RPC cannot retrieve the user's current game activity.
     * Discord RPC is designed only for SETTING Rich Presence (what your app displays on Discord),
     * not READING what games Discord detects the user playing.
     *
     * Discord detects games via:
     * 1. Process scanning (desktop client only, not exposed via RPC)
     * 2. Game SDK Rich Presence updates (games actively broadcasting their presence)
     *
     * The RPC protocol has no command to query "what game is the user playing".
     *
     * Current behavior: Returns cached game data only when WE set it via setGameActivity().
     * For actual game detection, use Steam API or other platform-specific APIs.
     *
     * @returns Cached game if set via setGameActivity(), otherwise null
     */
    async getCurrentGame(): Promise<{
        name: string;
        source: 'discord';
        sessionDuration?: number;
        partySize?: number;
    } | null> {
        if (!this.isConnected) {
            return null;
        }

        try {
            // Return cached game (only populated when WE set it via setGameActivity)
            // Discord RPC cannot fetch the user's actual current game activity
            return this.currentGame;
        } catch (error) {
            console.warn('Failed to fetch Discord game activity:', error);
            return null;
        }
    }

    /**
     * Update game activity in Discord Rich Presence
     */
    async setGameActivity(gameDetails: {
        gameName: string;
        details?: string;
        state?: string;
        partySize?: number;
        startTime?: number;
    }): Promise<boolean> {
        if (!this.isConnected || !this.rpcClient) {
            return false;
        }

        try {
            // Build activity object for Discord RPC
            const activity: any = {
                details: gameDetails.details || gameDetails.gameName,
                state: gameDetails.state,
            };

            // Add timestamps if startTime provided
            if (gameDetails.startTime) {
                activity.startTimestamp = gameDetails.startTime;
            } else {
                // Use current time if no start time provided
                activity.startTimestamp = Math.floor(Date.now() / 1000);
            }

            // Add party size if provided
            if (gameDetails.partySize && gameDetails.partySize > 0) {
                activity.party = {
                    size: [gameDetails.partySize, gameDetails.partySize]
                };
            }

            // Set activity using the real RPC client
            this.rpcClient.setActivity(activity);

            // Update local cache
            this.currentGame = {
                name: gameDetails.gameName,
                source: 'discord',
                partySize: gameDetails.partySize,
                sessionDuration: activity.startTimestamp ? this.calculateSessionDuration({ start: activity.startTimestamp }) : undefined
            };

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to update Discord game activity:', errorMessage);
            return false;
        }
    }

    /**
     * Clear activity from Discord Rich Presence
     */
    async clearActivity(): Promise<boolean> {
        if (!this.isConnected || !this.rpcClient) {
            return false;
        }

        try {
            // Clear activity using the real RPC client
            this.rpcClient.clearActivity();
            this.currentGame = null;
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to clear Discord activity:', errorMessage);
            return false;
        }
    }

    /**
     * Clear game activity from Discord Rich Presence
     * @deprecated Use clearActivity() instead
     */
    async clearGameActivity(): Promise<boolean> {
        return this.clearActivity();
    }

    /**
     * Set music activity on Discord Rich Presence
     *
     * Displays "Listening to {song}" on the user's Discord profile with:
     * - Activity type 2 (Listening to) for proper music display
     * - Song name in details field
     * - Artist name in state field (optional)
     * - Progress bar showing song position/duration (optional)
     * - Album art (optional, requires Discord application upload)
     *
     * @param musicDetails - Music information to display
     * @returns true if successful, false otherwise
     *
     * @example
     * await discordClient.setMusicActivity({
     *     songName: "Never Gonna Give You Up",
     *     artistName: "Rick Astley",
     *     albumArtKey: "album1", // optional
     *     startTime: Date.now() / 1000, // optional, for progress bar
     *     durationSeconds: 212 // optional, for progress bar
     * });
     */
    async setMusicActivity(musicDetails: {
        songName: string;
        artistName?: string;
        albumArtKey?: string;
        startTime?: number; // Unix timestamp in seconds
        durationSeconds?: number;
    }): Promise<boolean> {
        if (!this.isConnected || !this.rpcClient) {
            return false;
        }

        try {
            // Build activity object for Discord RPC with type 2 (Listening)
            const activity: any = {
                type: 2, // ActivityType.Listening
                details: musicDetails.songName,
            };

            // Add artist name if provided
            if (musicDetails.artistName) {
                activity.state = `by ${musicDetails.artistName}`;
            }

            // Add timestamps for progress bar if duration provided
            if (musicDetails.durationSeconds && musicDetails.startTime) {
                activity.startTimestamp = musicDetails.startTime;
                activity.endTimestamp = musicDetails.startTime + musicDetails.durationSeconds;
            } else if (musicDetails.durationSeconds) {
                // If only duration provided, start from now
                const now = Math.floor(Date.now() / 1000);
                activity.startTimestamp = now;
                activity.endTimestamp = now + musicDetails.durationSeconds;
            }

            // Add album art if provided
            if (musicDetails.albumArtKey) {
                activity.largeImageKey = musicDetails.albumArtKey;
                activity.largeImageText = musicDetails.songName;
            }

            // Set activity using the real RPC client
            this.rpcClient.setActivity(activity);

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to update Discord music activity:', errorMessage);
            return false;
        }
    }

    /**
     * Get Discord user info (if available)
     */
    async getUserInfo(): Promise<{
        id: string;
        username: string;
        discriminator: string;
    } | null> {
        if (!this.isConnected) {
            return null;
        }

        try {
            // In real implementation:
            // const user = await this.client.request('AUTHENTICATE', { access_token });
            // return user;

            return null;
        } catch (error) {
            console.warn('Failed to fetch Discord user info:', error);
            return null;
        }
    }

    /**
     * Subscribe to Discord voice updates (to detect multiplayer)
     */
    async subscribeToVoiceUpdates(_callback: (voiceState: any) => void): Promise<boolean> {
        if (!this.isConnected) {
            return false;
        }

        try {
            // In real implementation:
            // this.client.subscribe('VOICE_SETTINGS_UPDATE', (data) => {
            //   callback(data);
            // });

            return true;
        } catch (error) {
            console.warn('Failed to subscribe to voice updates:', error);
            return false;
        }
    }

    /**
     * Get current voice channel info (for party size detection)
     */
    async getVoiceChannelInfo(): Promise<{
        channelId?: string;
        guild?: string;
        participantCount?: number;
    } | null> {
        try {
            // In real implementation, would fetch actual voice channel data
            // For now return null
            return null;
        } catch (error) {
            console.warn('Failed to fetch voice channel info:', error);
            return null;
        }
    }
}
