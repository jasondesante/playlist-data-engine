/**
 * DiscordRPCClient - Dual-Mode Implementation (Server + Browser)
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
 * ────────────────────────────────────────────────────────────────────────────────
 * DUAL-MODE SUPPORT
 * ────────────────────────────────────────────────────────────────────────────────
 *
 * SERVER MODE (Node.js): Full Discord Rich Presence functionality using @ryuziii/discord-rpc
 * BROWSER MODE: Graceful degradation with clear error messages
 *
 * The client auto-detects the environment and switches modes automatically.
 * No configuration required - it just works in both environments.
 *
 * In browser mode, all methods return appropriate defaults (false, null) and log
 * console warnings explaining that Discord Rich Presence requires a server environment.
 */
import { Logger } from '../../utils/logger.js';

// Dynamic import placeholder for server-only dependency
// This will be loaded lazily only in server environments
let RPCClientModule: any = null;

/**
 * Check if the current environment is Node.js (server mode)
 */
function isServerEnvironment(): boolean {
    return typeof globalThis.process !== 'undefined' &&
           globalThis.process.versions != null &&
           globalThis.process.versions.node != null;
}

/**
 * Asynchronously initialize the RPC client module in server environments
 * This is called lazily when needed to avoid breaking browser builds
 */
async function initializeRPCModule(): Promise<boolean> {
    if (!isServerEnvironment()) {
        return false;
    }

    if (RPCClientModule !== null) {
        return RPCClientModule !== false;
    }

    try {
        const module = await import('@ryuziii/discord-rpc');
        RPCClientModule = module.DiscordRPCClient;
        return true;
    } catch (error) {
        // Package not installed or import failed - fall back to browser mode
        RPCClientModule = false;
        const logger = Logger.for('DiscordRPCClient');
        logger.warn('Failed to load @ryuziii/discord-rpc package - Discord RPC features will be unavailable', {
            error: error instanceof Error ? error.message : String(error)
        });
        return false;
    }
}

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
    albumName?: string;
    startTime?: number; // Unix timestamp in seconds
    endTime?: number; // Unix timestamp in seconds
    durationSeconds?: number; // Deprecated: Use endTime instead (for backward compatibility)
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
    private rpcClient: any = null;
    private isConnected: boolean = false;
    private disconnectRequested: boolean = false;
    private userInfo: DiscordUserInfo | null = null;
    private connectionState: DiscordConnectionState;
    private lastError: string | null = null;
    private isServerMode: boolean;
    private logger = Logger.for('DiscordRPCClient');

    // Testing-only: Force browser mode for tests
    private static _forceBrowserMode: boolean = false;

    /**
     * Testing utility: Force browser mode for testing purposes
     * @internal
     */
    static _setForceBrowserMode(force: boolean): void {
        this._forceBrowserMode = force;
    }

    constructor(clientId: string = '') {
        this.clientId = clientId;

        // Detect environment and set initial state
        const isBrowser = !isServerEnvironment() || DiscordRPCClient._forceBrowserMode;

        if (isBrowser) {
            // Browser mode
            this.isServerMode = false;
            this.connectionState = DiscordConnectionState.DiscordUnavailable;
            this.lastError = 'Discord Rich Presence requires a server environment (Node.js). Browser mode is not supported by Discord.';
            this.logger.warn('DiscordRPCClient running in browser mode - Rich Presence features are unavailable. Use server mode for Discord integration.');
        } else {
            // Server mode (Node.js)
            this.isServerMode = true;
            this.connectionState = DiscordConnectionState.Disconnected;
            this.lastError = null;
        }
    }

    /**
     * Connect to Discord RPC
     *
     * In server mode: Uses @ryuziii/discord-rpc library for real connection
     * In browser mode: Returns false with appropriate warning
     *
     * @returns true if connection attempt initiated successfully, false otherwise
     */
    async connect(): Promise<boolean> {
        // Browser mode - not supported
        if (!this.isServerMode) {
            this.logger.warn('Discord RPC connect() called in browser mode - Discord Rich Presence requires server environment');
            return false;
        }

        // Server mode validation
        if (!this.clientId) {
            this.logger.warn('Discord client ID not provided');
            this.connectionState = DiscordConnectionState.Error;
            this.lastError = 'Discord client ID not provided';
            return false;
        }

        // Initialize RPC module (lazy load)
        const moduleLoaded = await initializeRPCModule();
        if (!moduleLoaded || !RPCClientModule) {
            this.connectionState = DiscordConnectionState.DiscordUnavailable;
            this.lastError = 'Discord RPC module not available - ensure @ryuziii/discord-rpc is installed';
            this.logger.warn('Discord RPC module not available');
            return false;
        }

        this.disconnectRequested = false;
        this.connectionState = DiscordConnectionState.Connecting;
        this.lastError = null;

        try {
            // Create the RPC client with IPC transport
            this.rpcClient = new RPCClientModule({
                clientId: this.clientId,
                transport: 'ipc'
            });

            // Set up event handlers for connection state
            this.setupEventHandlers();

            // Attempt connection
            await this.rpcClient.connect();

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            const isDiscordUnavailable = errorMessage.includes('ECONNREFUSED') ||
                                         errorMessage.includes('ENOENT') ||
                                         errorMessage.includes('connect') ||
                                         errorMessage.includes('pipe');

            if (isDiscordUnavailable) {
                this.connectionState = DiscordConnectionState.DiscordUnavailable;
                this.lastError = 'Discord is not running or no user is logged in';
                this.logger.warn('Discord RPC unavailable - Please ensure Discord is running and you are logged in');
            } else {
                this.connectionState = DiscordConnectionState.Error;
                this.lastError = errorMessage;
                this.logger.warn('Failed to connect to Discord RPC', { error: errorMessage });
            }

            this.isConnected = false;
            this.rpcClient = null;

            return false;
        }
    }

    /**
     * Set up event handlers for the RPC client
     */
    private setupEventHandlers(): void {
        if (!this.rpcClient) return;

        // Use raw event handler to capture the READY event with user data
        const clientWithRawEvent = this.rpcClient as unknown as {
            onRawEvent: (handler: (op: number, data: DiscordRPCRawEvent) => void) => void;
        };
        clientWithRawEvent.onRawEvent((op: number, data: DiscordRPCRawEvent) => {
            if (op === 1 && data && data.evt === 'READY') {
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
                this.logger.warn('Discord RPC disconnected unexpectedly');
                this.connectionState = DiscordConnectionState.DiscordUnavailable;
                this.lastError = 'Unexpectedly disconnected from Discord';
            } else {
                this.connectionState = DiscordConnectionState.Disconnected;
            }
            this.isConnected = false;
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
        if (!this.isServerMode) {
            this.connectionState = DiscordConnectionState.Disconnected;
            return;
        }

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
        if (!this.isServerMode) return false;
        return this.isConnected && this.rpcClient !== null;
    }

    /**
     * Get the current connection state
     */
    getConnectionState(): DiscordConnectionState {
        return this.connectionState;
    }

    /**
     * Get the last error message
     */
    getLastError(): string | null {
        if (!this.isServerMode) {
            return 'Discord Rich Presence requires a server environment (Node.js)';
        }
        return this.lastError;
    }

    /**
     * Set music activity on Discord Rich Presence
     *
     * @param musicDetails - Music information to display
     * @returns true if successful, false otherwise
     */
    async setMusicActivity(musicDetails: MusicActivityDetails): Promise<boolean> {
        if (!this.isServerMode) {
            this.logger.warn('Discord RPC setMusicActivity() called in browser mode - Discord Rich Presence requires server environment', {
                songName: musicDetails.songName
            });
            return false;
        }

        if (!this.isConnected || !this.rpcClient) {
            this.logger.warn('Cannot set music activity - not connected to Discord');
            return false;
        }

        try {
            const activity: DiscordActivity = {
                type: ActivityType.Listening,
                details: musicDetails.songName,
            };

            if (musicDetails.artistName) {
                activity.state = `by ${musicDetails.artistName}`;
            }

            // Handle timestamps (support both endTime and durationSeconds for backward compatibility)
            if (musicDetails.endTime && musicDetails.startTime) {
                activity.startTimestamp = musicDetails.startTime;
                activity.endTimestamp = musicDetails.endTime;
            } else if (musicDetails.durationSeconds && musicDetails.startTime) {
                activity.startTimestamp = musicDetails.startTime;
                activity.endTimestamp = musicDetails.startTime + musicDetails.durationSeconds;
            } else if (musicDetails.durationSeconds) {
                // If only duration provided, start from now
                const now = Math.floor(Date.now() / 1000);
                activity.startTimestamp = now;
                activity.endTimestamp = now + musicDetails.durationSeconds;
            }

            if (musicDetails.albumArtKey) {
                activity.largeImageKey = musicDetails.albumArtKey;
                activity.largeImageText = musicDetails.albumName || musicDetails.songName;
            }

            this.rpcClient.setActivity(activity);

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.lastError = `Failed to set activity: ${errorMessage}`;
            this.logger.warn('Failed to update Discord music activity', { error: errorMessage });
            return false;
        }
    }

    /**
     * Clear music activity from Discord Rich Presence
     */
    async clearMusicActivity(): Promise<boolean> {
        if (!this.isServerMode) {
            this.logger.warn('Discord RPC clearMusicActivity() called in browser mode - Discord Rich Presence requires server environment');
            return false;
        }

        if (!this.isConnected || !this.rpcClient) {
            return false;
        }

        try {
            this.rpcClient.clearActivity();
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.lastError = `Failed to clear activity: ${errorMessage}`;
            this.logger.warn('Failed to clear Discord music activity', { error: errorMessage });
            return false;
        }
    }

    /**
     * Get Discord user info
     */
    async getUserInfo(): Promise<DiscordUserInfo | null> {
        if (!this.isServerMode) {
            this.logger.warn('Discord RPC getUserInfo() called in browser mode - Discord Rich Presence requires server environment');
            return null;
        }

        if (!this.isConnected) {
            return null;
        }

        if (!this.userInfo) {
            return null;
        }

        return { ...this.userInfo };
    }
}
