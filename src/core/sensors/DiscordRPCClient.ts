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
 * ⚠️ IMPORTANT LIMITATIONS:
 * - Discord RPC CANNOT retrieve the user's current game activity (platform limitation)
 * - Discord RPC CANNOT set game activity - use Steam API for game detection
 * - Discord RPC is ONLY for SETTING music presence (what song is playing)
 *
 * What it CANNOT do:
 * - Detect what game the user is playing (use Steam API instead)
 * - Read other users' activities
 * - Query Discord's game detection (not exposed via RPC)
 * - Set game activity status (not the purpose of this integration)
 */
import { DiscordRPCClient as RPCClient } from '@ryuziii/discord-rpc';

/**
 * Discord user information from READY event
 */
export interface DiscordUserInfo {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string; // Avatar hash
    globalName?: string; // Display name
}

export class DiscordRPCClient {
    private clientId: string;
    private rpcClient: RPCClient | null = null;
    private isConnected: boolean = false;
    private disconnectRequested: boolean = false;
    private userInfo: DiscordUserInfo | null = null;

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

        // Use raw event handler to capture the READY event with user data
        // Note: onRawEvent exists in the JS library but may not be in TS declarations
        (this.rpcClient as any).onRawEvent((op: number, data: any) => {
            // Opcode 1 is FRAME, which contains commands/events
            if (op === 1 && data && data.evt === 'READY') {
                // Extract user information from READY event
                if (data.data && data.data.user) {
                    const user = data.data.user;
                    this.userInfo = {
                        id: user.id || '',
                        username: user.username || '',
                        discriminator: user.discriminator || '',
                        avatar: user.avatar,
                        globalName: user.global_name
                    };
                    console.log('Discord RPC connected - User:', this.userInfo.username);
                }
            }
        });

        // Connection ready
        this.rpcClient.on('ready', () => {
            this.isConnected = true;
        });

        // Disconnection
        this.rpcClient.on('disconnected', () => {
            if (!this.disconnectRequested) {
                // Unexpected disconnection
                console.warn('Discord RPC disconnected unexpectedly');
            }
            this.isConnected = false;
            // Clear cached user info on disconnect
            this.userInfo = null;
        });

        // Error handling
        this.rpcClient.on('error', (error: Error) => {
            console.error('Discord RPC error:', error.message);
            this.isConnected = false;
        });
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
    }

    /**
     * Check if connected to Discord
     */
    isConnectedToDiscord(): boolean {
        return this.isConnected && this.rpcClient !== null;
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
     * Clear music activity from Discord Rich Presence
     */
    async clearMusicActivity(): Promise<boolean> {
        if (!this.isConnected || !this.rpcClient) {
            return false;
        }

        try {
            // Clear activity using the real RPC client
            this.rpcClient.clearActivity();
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('Failed to clear Discord music activity:', errorMessage);
            return false;
        }
    }

    /**
     * Get Discord user info
     *
     * Returns cached user information from the READY event.
     * The user info is automatically captured when connecting to Discord.
     *
     * @returns User information if connected and available, null otherwise
     *
     * @example
     * const userInfo = await discordClient.getUserInfo();
     * if (userInfo) {
     *   console.log(`Connected as ${userInfo.username}#${userInfo.discriminator}`);
     * }
     *
     * @note Returns null if:
     * - Not connected to Discord
     * - Connection failed or not yet established
     * - READY event has not been received yet
     * - User info was malformed in READY event
     */
    async getUserInfo(): Promise<DiscordUserInfo | null> {
        // Return null if not connected
        if (!this.isConnected) {
            return null;
        }

        // Return null if user info not yet available from READY event
        // (it may take a moment after connection before READY is received)
        if (!this.userInfo) {
            return null;
        }

        // Return cached user info
        return { ...this.userInfo };
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
