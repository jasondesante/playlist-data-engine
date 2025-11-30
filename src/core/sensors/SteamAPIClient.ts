/**
 * SteamAPIClient - Handles integration with Steam Web API
 * Fetches currently played games and game metadata
 */
export class SteamAPIClient {
    private apiKey: string;
    private baseUrl: string = 'https://api.steampowered.com';

    constructor(apiKey: string = '') {
        this.apiKey = apiKey;
    }

    /**
     * Get currently played game for a Steam user
     * Uses IPlayerService/GetRecentlyPlayedGames to determine active game
     */
    async getCurrentGame(steamUserId: string): Promise<{
        name: string;
        appId: number;
        source: 'steam';
        sessionDuration?: number;
    } | null> {
        if (!this.apiKey) {
            console.warn('Steam API key not provided');
            return null;
        }

        try {
            const url = `${this.baseUrl}/IPlayerService/GetRecentlyPlayedGames/v1/?` +
                `steamid=${steamUserId}&count=1&appid_only=false&key=${this.apiKey}`;

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Steam API error: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.response?.games || data.response.games.length === 0) {
                return null;
            }

            const game = data.response.games[0];

            return {
                name: game.name,
                appId: game.appid,
                source: 'steam',
                sessionDuration: game.playtime_2weeks ?? game.playtime_forever
            };
        } catch (error) {
            console.error('Failed to fetch current Steam game:', error);
            return null;
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

            return {
                appId,
                name: gameData.name || gameName,
                genre: gameData.genres?.map((g: any) => g.description) || [],
                description: gameData.short_description
            };
        } catch (error) {
            console.error(`Failed to fetch Steam metadata for ${gameName}:`, error);
            return { name: gameName };
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
            console.error('Failed to find Steam app ID:', error);
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
            console.error('Failed to fetch game schema:', error);
            return null;
        }
    }
}
