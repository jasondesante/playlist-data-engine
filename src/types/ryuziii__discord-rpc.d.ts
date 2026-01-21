declare module '@ryuziii/discord-rpc' {
    interface RPCClientOptions {
        clientId: string;
        transport: 'ipc';
    }

    interface Activity {
        details?: string;
        state?: string;
        startTimestamp?: number;
        party?: {
            size?: [number, number];
        };
        [key: string]: any;
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

    export { DiscordRPCClient };
}
