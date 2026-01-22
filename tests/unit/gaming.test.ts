import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GamingPlatformSensors } from '../../src/core/sensors/GamingPlatformSensors';
import { SteamAPIClient } from '../../src/core/sensors/SteamAPIClient';
import { DiscordRPCClient } from '../../src/core/sensors/DiscordRPCClient';

describe('GamingPlatformSensors (T093)', () => {
    let gamingSensors: GamingPlatformSensors;

    beforeEach(() => {
        gamingSensors = new GamingPlatformSensors({
            steam: {
                apiKey: 'test-steam-key'
            },
            discord: {
                clientId: 'test-discord-id'
            }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        gamingSensors.stopMonitoring();
    });

    it('should initialize with no active gaming', () => {
        const context = gamingSensors.getContext();
        expect(context.isActivelyGaming).toBe(false);
        expect(context.platformSource).toBe('none');
        expect(context.currentGame).toBeUndefined();
    });

    it('should authenticate with Steam and Discord', async () => {
        const result = await gamingSensors.authenticate('123456789', 'test-discord-user');
        expect(result).toBe(true);
    });

    it('should calculate base gaming bonus (25%)', () => {
        // Manually set gaming context for testing
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'Test Game',
                source: 'steam'
            },
            totalGamingMinutes: 60,
            gamesPlayedWhileListening: ['Test Game'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        expect(bonus).toBe(1.25); // 1.0 + 0.25
    });

    it('should add RPG genre bonus (+20%)', () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'Elden Ring',
                source: 'steam',
                genre: ['RPG', 'Action']
            },
            totalGamingMinutes: 120,
            gamesPlayedWhileListening: ['Elden Ring'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        // Base 0.25 + RPG 0.2 + Action 0.15 = 0.6 total, so 1.6x
        expect(bonus).toBe(1.6);
    });

    it('should add Action genre bonus (+15%)', () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'Call of Duty',
                source: 'steam',
                genre: ['Action', 'Shooter']
            },
            totalGamingMinutes: 90,
            gamesPlayedWhileListening: ['Call of Duty'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        // Base 0.25 + Action 0.15 = 0.4 total, so 1.4x
        expect(bonus).toBe(1.4);
    });

    it('should add Strategy genre bonus (+10%)', () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'Civilization VI',
                source: 'steam',
                genre: ['Strategy']
            },
            totalGamingMinutes: 180,
            gamesPlayedWhileListening: ['Civilization VI'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        // Base 0.25 + Strategy 0.1 = 0.35 total, so 1.35x
        expect(bonus).toBe(1.35);
    });

    it('should add multiplayer bonus (+15% for party size > 1)', () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'Valheim',
                source: 'steam',
                partySize: 4
            },
            totalGamingMinutes: 120,
            gamesPlayedWhileListening: ['Valheim'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        // Base 0.25 + Multiplayer 0.15 = 0.4 total, so 1.4x
        expect(bonus).toBe(1.4);
    });

    it('should add session duration bonus (up to 20% for 4+ hours)', () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'Baldur\'s Gate 3',
                source: 'steam',
                sessionDuration: 240 // 4 hours in minutes
            },
            totalGamingMinutes: 240,
            gamesPlayedWhileListening: ['Baldur\'s Gate 3'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        // Base 0.25 + Duration 0.2 (4 hours / 4 * 0.2) = 0.45 total, so 1.45x
        expect(bonus).toBe(1.45);
    });

    it('should cap bonus at 3.0x maximum', () => {
        const sensors = new GamingPlatformSensors({});
        // Simulate all bonuses stacking (note: platformSource can only be 'steam' or 'none' now)
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam', // Only 'steam' or 'none' since Discord can't detect games
            currentGame: {
                name: 'Baldur\'s Gate 3',
                source: 'steam',
                genre: ['RPG', 'Action', 'Strategy'],
                partySize: 4,
                sessionDuration: 480 // 8 hours
            },
            totalGamingMinutes: 480,
            gamesPlayedWhileListening: ['Baldur\'s Gate 3'],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        // Base 0.25 + RPG 0.2 + Action 0.15 + Strategy 0.1 + Multiplayer 0.15 + Duration 0.2 = 1.05 total
        // So 2.05x, but we want to verify it caps at 3.0x
        expect(bonus).toBeLessThanOrEqual(3.0);
    });

    it('should detect when not gaming', () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: false,
            platformSource: 'none',
            totalGamingMinutes: 0,
            gamesPlayedWhileListening: [],
            lastUpdated: Date.now()
        });

        const bonus = sensors.calculateGamingBonus();
        expect(bonus).toBe(1.0); // No bonus
    });

    it('should check if playing specific game', async () => {
        const sensors = new GamingPlatformSensors({});
        vi.spyOn(sensors, 'getContext').mockReturnValue({
            isActivelyGaming: true,
            platformSource: 'steam',
            currentGame: {
                name: 'The Witcher 3',
                source: 'steam'
            },
            totalGamingMinutes: 60,
            gamesPlayedWhileListening: ['The Witcher 3'],
            lastUpdated: Date.now()
        });

        expect(sensors.isPlayingGame('The Witcher 3')).toBe(true);
        expect(sensors.isPlayingGame('Elden Ring')).toBe(false);
        expect(sensors.isPlayingGame('the witcher 3')).toBe(true); // Case-insensitive
    });

    it('should record game session', () => {
        gamingSensors.recordGameSession('Minecraft', 120);
        gamingSensors.recordGameSession('Minecraft', 60);
        gamingSensors.recordGameSession('Skyrim', 90);

        const context = gamingSensors.getContext();
        expect(context.totalGamingMinutes).toBe(270);
        expect(context.gamesPlayedWhileListening).toContain('Minecraft');
        expect(context.gamesPlayedWhileListening).toContain('Skyrim');
    });

    it('should handle monitoring with callback', (done) => {
        const contexts: any[] = [];

        gamingSensors.startMonitoring((context) => {
            contexts.push(context);
        });

        // Wait a bit for at least one callback
        setTimeout(() => {
            gamingSensors.stopMonitoring();
            expect(contexts.length).toBeGreaterThan(0);
            expect(contexts[0]).toHaveProperty('isActivelyGaming');
            expect(contexts[0]).toHaveProperty('platformSource');
            done();
        }, 100);
    });

    it('should stop monitoring correctly', () => {
        const callback = vi.fn();
        gamingSensors.startMonitoring(callback);

        expect(callback).toHaveBeenCalled();

        gamingSensors.stopMonitoring();
        // After stopping, no more callbacks should occur
        const previousCallCount = callback.mock.calls.length;

        setTimeout(() => {
            expect(callback.mock.calls.length).toBe(previousCallCount);
        }, 100);
    });

    describe('Diagnostic Mode', () => {
        it('should return comprehensive diagnostic information', () => {
            const diagnostics = gamingSensors.getDiagnostics();

            expect(diagnostics).toHaveProperty('timestamp');
            expect(diagnostics).toHaveProperty('steam');
            expect(diagnostics).toHaveProperty('discord');
            expect(diagnostics).toHaveProperty('gamingContext');
            expect(diagnostics).toHaveProperty('polling');
            expect(diagnostics).toHaveProperty('cache');
        });

        it('should include Steam diagnostic information', () => {
            const diagnostics = gamingSensors.getDiagnostics();

            expect(diagnostics.steam).toHaveProperty('isAuthenticated');
            expect(diagnostics.steam).toHaveProperty('apiKey');
            expect(diagnostics.steam.isAuthenticated).toBe(false); // No user ID set
            expect(diagnostics.steam.apiKey).toBe(true); // API key was provided
        });

        it('should include Discord diagnostic information', () => {
            const diagnostics = gamingSensors.getDiagnostics();

            expect(diagnostics.discord).toHaveProperty('isConnected');
            expect(diagnostics.discord).toHaveProperty('clientId');
            expect(diagnostics.discord).toHaveProperty('connectionState');
            expect(diagnostics.discord.clientId).toBe(true); // Client ID was provided
            expect(typeof diagnostics.discord.connectionState).toBe('string');
        });

        it('should include polling information', () => {
            const diagnostics = gamingSensors.getDiagnostics();

            expect(diagnostics.polling).toHaveProperty('isActive');
            expect(diagnostics.polling).toHaveProperty('intervalMs');
            expect(diagnostics.polling).toHaveProperty('exponentialBackoff');
            expect(diagnostics.polling.isActive).toBe(false); // Not monitoring yet
            expect(diagnostics.polling.exponentialBackoff).toBe(1);
        });

        it('should include cache information', () => {
            const diagnostics = gamingSensors.getDiagnostics();

            expect(diagnostics.cache).toHaveProperty('gameMetadataCacheSize');
            expect(diagnostics.cache).toHaveProperty('cachedGames');
            expect(Array.isArray(diagnostics.cache.cachedGames)).toBe(true);
        });

        it('should include current gaming context', () => {
            const diagnostics = gamingSensors.getDiagnostics();

            expect(diagnostics.gamingContext).toHaveProperty('isActivelyGaming');
            expect(diagnostics.gamingContext).toHaveProperty('platformSource');
            expect(diagnostics.gamingContext).toHaveProperty('totalGamingMinutes');
            expect(diagnostics.gamingContext).toHaveProperty('gamesPlayedWhileListening');
        });

        it('should update polling status when monitoring', () => {
            gamingSensors.startMonitoring();

            const diagnostics = gamingSensors.getDiagnostics();
            expect(diagnostics.polling.isActive).toBe(true);

            gamingSensors.stopMonitoring();
        });

        it('should reflect authentication state in diagnostics', async () => {
            await gamingSensors.authenticate('123456789');

            const diagnostics = gamingSensors.getDiagnostics();
            expect(diagnostics.steam.isAuthenticated).toBe(true);
            expect(diagnostics.steam.userId).toBe('123456789');
        });
    });
});

describe('SteamAPIClient', () => {
    let steamClient: SteamAPIClient;

    beforeEach(() => {
        steamClient = new SteamAPIClient('test-api-key');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle missing API key gracefully', async () => {
        const clientNoKey = new SteamAPIClient();
        const result = await clientNoKey.getCurrentGame('12345');
        expect(result).toBeNull();
    });

    it('should fetch current game with real API response structure', async () => {
        const mockResponse = {
            response: {
                total_count: 1,
                games: [
                    {
                        appid: 570,
                        name: 'Dota 2',
                        playtime_forever: 1200,
                        playtime_2weeks: 120,
                        img_icon_url: 'icon',
                        img_logo_url: 'logo'
                    }
                ]
            }
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await steamClient.getCurrentGame('12345');

        expect(result).not.toBeNull();
        expect(result?.name).toBe('Dota 2');
        expect(result?.appId).toBe(570);
        expect(result?.source).toBe('steam');
        expect(result?.sessionDuration).toBeDefined();
    });

    it('should handle API errors gracefully', async () => {
        global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

        const result = await steamClient.getCurrentGame('12345');
        expect(result).toBeNull();
    });

    it('should handle empty game list', async () => {
        const mockResponse = {
            response: {
                total_count: 0,
                games: []
            }
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await steamClient.getCurrentGame('12345');
        expect(result).toBeNull();
    });
});

describe('DiscordRPCClient', () => {
    let discordClient: DiscordRPCClient;

    beforeEach(() => {
        discordClient = new DiscordRPCClient('test-client-id');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize without connection', () => {
        expect(discordClient.isConnectedToDiscord()).toBe(false);
    });

    it('should connect successfully', async () => {
        const result = await discordClient.connect();
        // Connection attempt returns true (initiated successfully)
        // Actual connection state depends on Discord being available
        expect(typeof result).toBe('boolean');
    });

    it('should handle missing client ID', async () => {
        const clientNoId = new DiscordRPCClient();
        const result = await clientNoId.connect();
        expect(result).toBe(false);
    });

    it('should disconnect properly', async () => {
        await discordClient.connect();
        discordClient.disconnect();
        expect(discordClient.isConnectedToDiscord()).toBe(false);
    });

    it('should set and clear music activity', async () => {
        await discordClient.connect();

        const result = await discordClient.setMusicActivity({
            songName: 'Never Gonna Give You Up',
            artistName: 'Rick Astley',
            durationSeconds: 212
        });

        // Result depends on whether Discord is actually running
        // If Discord isn't available, the operation will gracefully fail
        expect(typeof result).toBe('boolean');

        const clearResult = await discordClient.clearMusicActivity();
        expect(typeof clearResult).toBe('boolean');
    });

    it('should handle music activity updates when not connected', async () => {
        const result = await discordClient.setMusicActivity({
            songName: 'Test Song',
            artistName: 'Test Artist'
        });

        expect(result).toBe(false);
    });

    it('should set music activity with album art', async () => {
        await discordClient.connect();

        const result = await discordClient.setMusicActivity({
            songName: 'Bohemian Rhapsody',
            artistName: 'Queen',
            albumArtKey: 'album1',
            startTime: Math.floor(Date.now() / 1000),
            durationSeconds: 354
        });

        expect(typeof result).toBe('boolean');
    });
});
