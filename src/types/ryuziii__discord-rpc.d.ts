declare module '@ryuziii/discord-rpc' {
    interface RPCClientOptions {
        clientId: string;
        transport: 'ipc';
    }

    interface Activity {
        details?: string;
        state?: string;
        startTimestamp?: number;
        endTimestamp?: number;
        type?: number; // 0 = Playing, 1 = Streaming, 2 = Listening, 5 = Competing
        largeImageKey?: string;
        largeImageText?: string;
        smallImageKey?: string;
        smallImageText?: string;
        party?: {
            size?: [number, number];
        };
        buttons?: Array<{ label: string; url: string }>;
        [key: string]: any;
    }

    enum ActivityType {
        Playing = 0,
        Streaming = 1,
        Listening = 2,
        Competing = 5,
    }

    interface ActivityUpdateData {
        activity?: Activity;
        [key: string]: any;
    }

    class DiscordRPCClient {
        constructor(options: RPCClientOptions);

        connect(): Promise<void>;
        disconnect(): void;

        setActivity(activity: Activity): void;
        clearActivity(): void;

        on(event: 'ready', callback: () => void): void;
        on(event: 'disconnected', callback: () => void): void;
        on(event: 'error', callback: (error: Error) => void): void;
        on(event: 'activityUpdate', callback: (data: ActivityUpdateData) => void): void;
    }

    export { DiscordRPCClient, ActivityType };
}
