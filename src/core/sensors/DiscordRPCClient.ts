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
 *
 * Discord Availability States:
 * - Discord not running: IPC pipes don't exist (connection fails immediately)
 * - Discord running but no user logged in: Same as "not running" (no IPC pipes)
 * - Discord running with user logged in: IPC pipes available, connection succeeds
 *
 * @note Discord RPC requires Node.js environment. Cannot work in browsers due to IPC requirements.
 */
import { DiscordRPCClient as RPCClient } from '@ryuziii/discord-rpc';
import { Logger } from '../../utils/logger.js';

/**
 * Discord RPC connection states for better error handling
 */
export enum DiscordConnectionState {
    /** Not connected, connection not attempted */
    Disconnected = 'disconnected',
    /** Connection in progress */
    Connecting = 'connecting',
    /** Connected and ready */
    Connected = 'connected',
    /** Discord not running or user not logged in */
    DiscordUnavailable = 'discord_unavailable',
    /** Connection error */
    Error = 'error',
}

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

/**
 * Activity types for Discord Rich Presence
 * Based on Discord RPC protocol specification
 */
export enum ActivityType {
    Playing = 0,
    Streaming = 1,
    Listening = 2,
    Watching = 3,
    Competing = 5,
}

/**
 * Discord button for activity
 */
export interface DiscordActivityButton {
    label: string;
    url: string;
}

/**
 * Assets for activity (images)
 */
export interface DiscordActivityAssets {
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
}

/**
 * Timestamps for activity progress bar
 */
export interface DiscordActivityTimestamps {
    startTimestamp?: number; // Unix timestamp in seconds
    endTimestamp?: number; // Unix timestamp in seconds
}

/**
 * Party information for multiplayer games
 */
export interface DiscordActivityParty {
    id?: string;
    size?: [current: number, max: number];
}

/**
 * Discord Rich Presence activity structure
 * Based on Discord RPC SET_ACTIVITY command specification
 */
export interface DiscordActivity {
    /** Activity type (Playing, Streaming, Listening, etc.) */
    type?: ActivityType;
    /** Main activity text (max 128 chars) */
    details?: string;
    /** Secondary activity text (max 128 chars) */
    state?: string;
    /** Timestamps for progress bar */
    startTimestamp?: number;
    endTimestamp?: number;
    /** Image assets */
    largeImageKey?: string;
    largeImageText?: string;
    smallImageKey?: string;
    smallImageText?: string;
    /** Party info for multiplayer */
    party?: DiscordActivityParty;
    /** Buttons for action links */
    buttons?: DiscordActivityButton[];
    /** Join secret for multiplayer */
    secret?: string;
    /** Match ID for spectate */
    matchSecret?: string;
    /** Spectate secret */
    spectateSecret?: string;
}

/**
 * Music activity details - specific interface for music presence
 */
export interface MusicActivityDetails {
    songName: string;
    artistName?: string;
    albumArtKey?: string;
    startTime?: number; // Unix timestamp in seconds
    durationSeconds?: number;
}

/**
 * Voice state information (placeholder - Discord RPC cannot access voice state)
 * Note: Discord RPC does not support voice state detection.
 * This interface exists for type compatibility only.
 */
export interface VoiceStateInfo {
    channelId?: string;
    guildId?: string;
    participantCount?: number;
}

/**
 * Discord RPC error codes from protocol specification
 * Reference: https://discord.com/developers/docs/topics/rpc#errors
 */
export enum DiscordRPCErrorCode {
    /** An invalid opcode was sent */
    InvalidOpcode = 4000,
    /** An invalid payload was sent */
    InvalidPayload = 4001,
    /** A frame was sent before the handshake completed */
    InvalidFrameBeforeHandshake = 4002,
    /** An invalid frame was sent */
    InvalidFrame = 4003,
    /** The client is not connected */
    NotConnected = 4004,
    /** The client is already connected */
    AlreadyConnected = 4005,
    /** The authentication failed */
    InvalidPermissions = 4006,
    /** Invalid client ID */
    InvalidClientId = 4007,
}

/**
 * Discord RPC error response structure
 */
export interface DiscordRPCErrorResponse {
    code: DiscordRPCErrorCode;
    message: string;
    evt?: string; // Event name if this is an error event
}

/**
 * Raw Discord RPC event data
 * Used in onRawEvent handler for parsing low-level events
 */
export interface DiscordRPCRawEvent {
    cmd?: string;
    evt?: string;
    nonce?: string;
    data?: {
        user?: {
            id: string;
            username: string;
            discriminator: string;
            avatar?: string;
            global_name?: string;
        };
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export class DiscordRPCClient {
    private clientId: string;
    private rpcClient: RPCClient | null = null;
    private isConnected: boolean = false;
    private disconnectRequested: boolean = false;
    private userInfo: DiscordUserInfo | null = null;
    private connectionState: DiscordConnectionState = DiscordConnectionState.Disconnected;
    private lastError: string | null = null;
    private logger = Logger.for('DiscordRPCClient');

    constructor(clientId: string = '') {
        this.clientId = clientId;
    }

    /**
     * Connect to Discord RPC
     * Uses @ryuziii/discord-rpc library for real connection
     *
     * @returns true if connection attempt initiated successfully, false otherwise
     *
     * Error scenarios:
     * - No client ID provided: Returns false with warning
     * - Discord not running: Returns false (IPC pipe unavailable)
     * - Discord running but user not logged in: Returns false (same as not running)
     * - Network/connection error: Returns false with error details
     */
    async connect(): Promise<boolean> {
        if (!this.clientId) {
            this.logger.warn('Discord client ID not provided');
            this.connectionState = DiscordConnectionState.Error;
            this.lastError = 'Discord client ID not provided';
            return false;
        }

        this.disconnectRequested = false;
        this.connectionState = DiscordConnectionState.Connecting;
        this.lastError = null;

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

            // Determine if this is a "Discord not available" error
            // Common errors when Discord is not running or user not logged in:
            // - ECONNREFUSED: IPC pipe doesn't exist or can't connect
            // - ENOENT: Pipe/socket file not found
            const isDiscordUnavailable = errorMessage.includes('ECONNREFUSED') ||
                                         errorMessage.includes('ENOENT') ||
                                         errorMessage.includes('connect') ||
                                         errorMessage.includes('pipe');

            if (isDiscordUnavailable) {
                this.connectionState = DiscordConnectionState.DiscordUnavailable;
                this.lastError = 'Discord is not running or no user is logged in';
                this.logger.warn('Discord RPC unavailable - Please ensure Discord is running and you are logged in', { error: this.lastError });
            } else {
                this.connectionState = DiscordConnectionState.Error;
                this.lastError = errorMessage;
                this.logger.warn('Failed to connect to Discord RPC', { error: errorMessage });
            }

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
        const clientWithRawEvent = this.rpcClient as unknown as {
            onRawEvent: (handler: (op: number, data: DiscordRPCRawEvent) => void) => void;
        };
        clientWithRawEvent.onRawEvent((op: number, data: DiscordRPCRawEvent) => {
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
                    this.logger.info('Discord RPC connected', { username: this.userInfo.username });
                }
            }
        });

        // Connection ready
        this.rpcClient.on('ready', () => {
            this.isConnected = true;
            this.connectionState = DiscordConnectionState.Connected;
            this.lastError = null;
        });

        // Disconnection
        this.rpcClient.on('disconnected', () => {
            if (!this.disconnectRequested) {
                // Unexpected disconnection
                this.logger.warn('Discord RPC disconnected unexpectedly');
                this.connectionState = DiscordConnectionState.DiscordUnavailable;
                this.lastError = 'Unexpectedly disconnected from Discord';
            } else {
                this.connectionState = DiscordConnectionState.Disconnected;
            }
            this.isConnected = false;
            // Clear cached user info on disconnect
            this.userInfo = null;
        });

        // Error handling
        this.rpcClient.on('error', (error: Error) => {
            this.logger.error('Discord RPC error', { error: error.message });
            this.isConnected = false;
            this.connectionState = DiscordConnectionState.Error;
            this.lastError = error.message;
        });
    }

    /**
     * Disconnect from Discord RPC
     */
    disconnect(): void {
        this.disconnectRequested = true;
        this.connectionState = DiscordConnectionState.Disconnected;
        if (this.rpcClient) {
            try {
                this.rpcClient.disconnect();
            } catch (error) {
                this.logger.warn('Error disconnecting Discord RPC', { error });
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
     * Get the current connection state
     *
     * @returns The current DiscordConnectionState
     *
     * @example
     * const state = discordClient.getConnectionState();
     * if (state === DiscordConnectionState.DiscordUnavailable) {
     *   console.log('Please open Discord and log in');
     * }
     */
    getConnectionState(): DiscordConnectionState {
        return this.connectionState;
    }

    /**
     * Get the last error message
     *
     * @returns The last error message, or null if no error occurred
     */
    getLastError(): string | null {
        return this.lastError;
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
    async setMusicActivity(musicDetails: MusicActivityDetails): Promise<boolean> {
        if (!this.isConnected || !this.rpcClient) {
            return false;
        }

        try {
            // Build activity object for Discord RPC with type 2 (Listening)
            const activity: DiscordActivity = {
                type: ActivityType.Listening,
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
            this.logger.warn('Failed to update Discord music activity', { error: errorMessage });
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
            this.logger.warn('Failed to clear Discord music activity', { error: errorMessage });
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
     *
     * @note Discord RPC CANNOT access voice state data.
     * This method is a placeholder that returns false.
     * Voice state detection requires Discord API Gateway with bot permissions.
     */
    async subscribeToVoiceUpdates(_callback: (voiceState: VoiceStateInfo) => void): Promise<boolean> {
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
            this.logger.warn('Failed to subscribe to voice updates', { error });
            return false;
        }
    }

    /**
     * Get current voice channel info (for party size detection)
     *
     * @note Discord RPC CANNOT access voice state data.
     * This method returns null as voice state is not available via RPC.
     */
    async getVoiceChannelInfo(): Promise<VoiceStateInfo | null> {
        try {
            // In real implementation, would fetch actual voice channel data
            // For now return null
            return null;
        } catch (error) {
            this.logger.warn('Failed to fetch voice channel info', { error });
            return null;
        }
    }
}
