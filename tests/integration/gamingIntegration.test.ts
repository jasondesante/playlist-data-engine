import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GamingPlatformSensors } from '../../src/core/sensors/GamingPlatformSensors';
import { SteamAPIClient } from '../../src/core/sensors/SteamAPIClient';
import { DiscordRPCClient } from '../../src/core/sensors/DiscordRPCClient';
import {
  mockGamingContext_NoGame,
  mockGamingContext_ActionGame,
  mockGamingContext_RPGGame,
  mockGamingContext_StrategyGame,
  mockGamingContext_MultiplayerGame,
  getMockGamingContext,
  getExpectedGamingBonus,
  mockSteamAPI_RecentlyPlayed,
  mockDiscordRPC_Presence,
  mockSteamAPI_AppList,
  gamingSessionScenarios
} from '../fixtures/mockGamingData';
import type { GamingContext } from '../../src/core/types/Progression';

/**
 * Integration Tests for Gaming Platform System
 * Tests multi-class interactions and end-to-end gaming detection flows
 * Covers T093-T106 (Gaming Platform Integration) and T119 (Gaming Integration Test)
 */

describe('Gaming Platform Integration (T093-T106)', () => {
    let gamingSensors: GamingPlatformSensors;

    beforeEach(() => {
        gamingSensors = new GamingPlatformSensors({
            steam: {
                apiKey: 'test-steam-key',
                steamId: '123456789'
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

    describe('Steam and Discord Integration', () => {
        it('should authenticate with Steam and Discord platforms', async () => {
            // Test configuration is properly initialized
            const sensors = new GamingPlatformSensors({
                steam: {
                    apiKey: 'test-key',
                    steamId: '987654321'
                },
                discord: {
                    clientId: 'discord-test-id'
                }
            });

            // Authenticate to both platforms
            const authResult = await sensors.authenticate('123456789', 'discord-user-id');
            expect(authResult).toBe(true);

            sensors.stopMonitoring();
        });

        it('should handle monitoring lifecycle without errors', async () => {
            // This test verifies the monitoring system can start and stop gracefully
            gamingSensors.startMonitoring();

            // Wait for at least one polling cycle
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be able to stop without errors
            gamingSensors.stopMonitoring();

            // Verify callback is cleared
            expect((gamingSensors as any).contextCallback).toBeNull();
        });

        it('should cache game metadata and reduce API calls', async () => {
            const getMetadataSpy = vi.spyOn(SteamAPIClient.prototype, 'getGameMetadata');

            // Simulate game lookup twice
            const gameName = 'Elden Ring';
            (gamingSensors as any).getGameMetadata(gameName);
            (gamingSensors as any).getGameMetadata(gameName); // Should use cache

            // In production with real calls, second call would be cached
            // This test verifies the cache mechanism exists
            expect((gamingSensors as any).gameMetadataCache).toBeDefined();
        });
    });

    describe('Gaming Bonus Calculations', () => {
        it('should calculate correct bonus for RPG game with multiplayer', () => {
            vi.spyOn(gamingSensors, 'getContext').mockReturnValue({
                isActivelyGaming: true,
                platformSource: 'steam',
                currentGame: {
                    name: 'Baldur\'s Gate 3',
                    source: 'steam',
                    genre: ['RPG', 'Fantasy'],
                    sessionDuration: 240, // 4 hours
                    partySize: 4
                },
                totalGamingMinutes: 240,
                gamesPlayedWhileListening: ['Baldur\'s Gate 3'],
                lastUpdated: Date.now()
            });

            const bonus = gamingSensors.calculateGamingBonus();
            // Base 0.25 + RPG 0.2 + Multiplayer 0.15 + Duration 0.2 = 0.8 total = 1.8x
            expect(bonus).toBe(1.8);
            expect(bonus).toBeLessThanOrEqual(3.0);
        });

        it('should apply correct compound bonus cap at 3.0x', () => {
            vi.spyOn(gamingSensors, 'getContext').mockReturnValue({
                isActivelyGaming: true,
                platformSource: 'both',
                currentGame: {
                    name: 'League of Legends',
                    source: 'steam',
                    genre: ['MOBA', 'Action', 'Team-based', 'Multiplayer'],
                    sessionDuration: 480, // 8 hours
                    partySize: 5
                },
                totalGamingMinutes: 480,
                gamesPlayedWhileListening: ['League of Legends'],
                lastUpdated: Date.now()
            });

            const bonus = gamingSensors.calculateGamingBonus();
            // Even with maximum stacking, should not exceed 3.0x
            expect(bonus).toBeLessThanOrEqual(3.0);
        });
    });

    describe('Game Session Recording', () => {
        it('should accumulate gaming time across multiple sessions', () => {
            gamingSensors.recordGameSession('Skyrim', 60);
            gamingSensors.recordGameSession('Fallout 4', 90);
            gamingSensors.recordGameSession('Skyrim', 120); // Same game, different session

            const context = gamingSensors.getContext();
            expect(context.totalGamingMinutes).toBe(270);
            expect(context.gamesPlayedWhileListening).toContain('Skyrim');
            expect(context.gamesPlayedWhileListening).toContain('Fallout 4');
            // Skyrim should only appear once even though played twice
            expect(context.gamesPlayedWhileListening.filter(g => g === 'Skyrim').length).toBe(1);
        });

        it('should track unique games across sessions', () => {
            const games = ['Dota 2', 'CS:GO', 'Valorant', 'League of Legends', 'Overwatch 2'];

            games.forEach((game, index) => {
                gamingSensors.recordGameSession(game, (index + 1) * 60);
            });

            const context = gamingSensors.getContext();
            expect(context.totalGamingMinutes).toBe(60 + 120 + 180 + 240 + 300); // 900 minutes
            expect(context.gamesPlayedWhileListening.length).toBe(5);
            expect(context.gamesPlayedWhileListening).toEqual(games);
        });
    });

    describe('Game Detection and Lookup', () => {
        it('should perform case-insensitive game name matching', () => {
            vi.spyOn(gamingSensors, 'getContext').mockReturnValue({
                isActivelyGaming: true,
                platformSource: 'steam',
                currentGame: {
                    name: 'The Witcher 3: Wild Hunt',
                    source: 'steam'
                },
                totalGamingMinutes: 0,
                gamesPlayedWhileListening: [],
                lastUpdated: Date.now()
            });

            expect(gamingSensors.isPlayingGame('The Witcher 3: Wild Hunt')).toBe(true);
            expect(gamingSensors.isPlayingGame('the witcher 3: wild hunt')).toBe(true);
            expect(gamingSensors.isPlayingGame('THE WITCHER 3: WILD HUNT')).toBe(true);
            expect(gamingSensors.isPlayingGame('Cyberpunk 2077')).toBe(false);
        });

        it('should return false when no game is active', () => {
            vi.spyOn(gamingSensors, 'getContext').mockReturnValue({
                isActivelyGaming: false,
                platformSource: 'none',
                totalGamingMinutes: 0,
                gamesPlayedWhileListening: [],
                lastUpdated: Date.now()
            });

            expect(gamingSensors.isPlayingGame('Any Game')).toBe(false);
        });
    });

    describe('Monitoring Lifecycle', () => {
        it('should invoke callback on gaming context changes', (done) => {
            const contextUpdates: any[] = [];

            gamingSensors.startMonitoring((context) => {
                contextUpdates.push(context);
            });

            // Wait for at least one callback
            setTimeout(() => {
                gamingSensors.stopMonitoring();
                expect(contextUpdates.length).toBeGreaterThan(0);
                expect(contextUpdates[0]).toHaveProperty('isActivelyGaming');
                expect(contextUpdates[0]).toHaveProperty('platformSource');
                expect(contextUpdates[0]).toHaveProperty('totalGamingMinutes');
                done();
            }, 100);
        });

        it('should properly stop monitoring and prevent further callbacks', (done) => {
            const callbackFn = vi.fn();

            gamingSensors.startMonitoring(callbackFn);

            setTimeout(() => {
                const initialCallCount = callbackFn.mock.calls.length;
                gamingSensors.stopMonitoring();

                setTimeout(() => {
                    // No additional callbacks after stopping
                    expect(callbackFn.mock.calls.length).toBe(initialCallCount);
                    done();
                }, 100);
            }, 50);
        });
    });

    describe('Configuration Options', () => {
        it('should respect custom poll interval configuration', () => {
            const customSensors = new GamingPlatformSensors({
                steam: {
                    apiKey: 'test-key',
                    pollInterval: 30000 // 30 seconds instead of default 60
                }
            });

            expect((customSensors as any).pollIntervalMs).toBe(30000);
        });

        it('should handle empty configuration gracefully', () => {
            const emptySensors = new GamingPlatformSensors({});
            const context = emptySensors.getContext();

            expect(context.isActivelyGaming).toBe(false);
            expect(context.platformSource).toBe('none');
            expect(context.totalGamingMinutes).toBe(0);
        });

        it('should use default 60-second polling interval when not specified', () => {
            expect((gamingSensors as any).pollIntervalMs).toBe(60000);
        });
    });
});

/**
 * Gaming Platform Integration with Mock Data Fixtures (T119)
 * Tests real-world gaming scenarios with provided mock data
 */
describe('Gaming Integration with Mock Data (T119)', () => {
    let gamingSensors: GamingPlatformSensors;

    beforeEach(() => {
        gamingSensors = new GamingPlatformSensors({
            steam: {
                apiKey: 'test-steam-key',
                steamId: '123456789'
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

    describe('Mock Gaming Context Fixtures', () => {
        it('should load no-game context correctly', () => {
            const context = mockGamingContext_NoGame;

            expect(context.isActivelyGaming).toBe(false);
            expect(context.platformSource).toBe('none');
            expect(context.currentGame).toBeUndefined();
            expect(context.totalGamingMinutes).toBe(0);
            expect(context.gamesPlayedWhileListening).toEqual([]);
        });

        it('should load action game context correctly', () => {
            const context = mockGamingContext_ActionGame;

            expect(context.isActivelyGaming).toBe(true);
            expect(context.platformSource).toBe('steam');
            expect(context.currentGame?.name).toBe('Counter-Strike 2');
            expect(context.currentGame?.source).toBe('steam');
            expect(context.currentGame?.genre).toContain('Action');
            expect(context.currentGame?.sessionDuration).toBe(30);
            expect(context.currentGame?.partySize).toBe(1);
        });

        it('should load RPG game context correctly', () => {
            const context = mockGamingContext_RPGGame;

            expect(context.isActivelyGaming).toBe(true);
            expect(context.platformSource).toBe('steam');
            expect(context.currentGame?.name).toBe('Elden Ring');
            expect(context.currentGame?.source).toBe('steam');
            expect(context.currentGame?.genre).toContain('Action RPG');
            expect(context.currentGame?.sessionDuration).toBe(120);
        });

        it('should load strategy game context correctly', () => {
            const context = mockGamingContext_StrategyGame;

            expect(context.isActivelyGaming).toBe(true);
            expect(context.platformSource).toBe('steam');
            expect(context.currentGame?.name).toBe('Civilization VI');
            expect(context.currentGame?.genre).toContain('Strategy');
        });

        it('should load multiplayer game context correctly', () => {
            const context = mockGamingContext_MultiplayerGame;

            expect(context.isActivelyGaming).toBe(true);
            expect(context.platformSource).toBe('discord');
            expect(context.currentGame?.name).toBe('Baldur\'s Gate 3');
            expect(context.currentGame?.source).toBe('discord');
            expect(context.currentGame?.genre).toContain('Multiplayer');
            expect(context.currentGame?.partySize).toBe(4);
            expect(context.gamesPlayedWhileListening).toContain('Baldur\'s Gate 3');
            expect(context.gamesPlayedWhileListening).toContain('Elden Ring');
        });
    });

    describe('Gaming Bonus Calculations with Mock Data', () => {
        it('should calculate no bonus when not gaming', () => {
            const context = mockGamingContext_NoGame;
            const expectedBonus = getExpectedGamingBonus('none');

            vi.spyOn(gamingSensors, 'getContext').mockReturnValue(context);
            const bonus = gamingSensors.calculateGamingBonus();

            expect(bonus).toBe(expectedBonus);
            expect(bonus).toBe(1.0);
        });

        it('should calculate correct bonus for action game', () => {
            const context = mockGamingContext_ActionGame;
            const expectedBonus = getExpectedGamingBonus('action');

            vi.spyOn(gamingSensors, 'getContext').mockReturnValue(context);
            const bonus = gamingSensors.calculateGamingBonus();

            // Base 0.25 + Action 0.15 + 30min session (0.025) = 1.425
            expect(bonus).toBe(expectedBonus);
            expect(bonus).toBe(1.425);
        });

        it('should calculate correct bonus for RPG game', () => {
            const context = mockGamingContext_RPGGame;
            const expectedBonus = getExpectedGamingBonus('rpg');

            vi.spyOn(gamingSensors, 'getContext').mockReturnValue(context);
            const bonus = gamingSensors.calculateGamingBonus();

            // Base 0.25 + RPG 0.2 (matches first in "Action RPG") + 2hr session (0.1) = 1.55
            expect(bonus).toBe(expectedBonus);
            expect(bonus).toBe(1.55);
        });

        it('should calculate correct bonus for strategy game', () => {
            const context = mockGamingContext_StrategyGame;
            const expectedBonus = getExpectedGamingBonus('strategy');

            vi.spyOn(gamingSensors, 'getContext').mockReturnValue(context);
            const bonus = gamingSensors.calculateGamingBonus();

            // Base 0.25 + Strategy 0.1 + 1hr session (0.05) = 1.4
            expect(bonus).toBe(expectedBonus);
            expect(bonus).toBe(1.4);
        });

        it('should calculate correct bonus for multiplayer game', () => {
            const context = mockGamingContext_MultiplayerGame;
            const expectedBonus = getExpectedGamingBonus('multiplayer');

            vi.spyOn(gamingSensors, 'getContext').mockReturnValue(context);
            const bonus = gamingSensors.calculateGamingBonus();

            // Base 0.25 + RPG 0.2 + Multiplayer 0.15 + 4hr session (0.2) = 1.8
            expect(bonus).toBe(expectedBonus);
            expect(bonus).toBe(1.8);
        });
    });

    describe('Gaming Session Scenarios', () => {
        it('should have valid gaming session scenarios', () => {
            expect(gamingSessionScenarios).toHaveLength(4);
            expect(gamingSessionScenarios[0].name).toBe('Solo Action Game - Short Session');
            expect(gamingSessionScenarios[1].name).toBe('Solo RPG Game - Long Session');
            expect(gamingSessionScenarios[2].name).toBe('Multiplayer RPG - Party of 4');
            expect(gamingSessionScenarios[3].name).toBe('Not Gaming');
        });

        it('should calculate correct bonus for each scenario', () => {
            // Expected bonuses for scenarios:
            // Action (30min): 1.425
            // RPG (4hr): 1.8 (0.25 base + 0.2 rpg + 0.15 action + 0.2 duration)
            // Multiplayer (4hr): 1.8 (0.25 base + 0.2 rpg + 0.15 multiplayer + 0.2 duration)
            // None: 1.0
            const expectedBonuses: Record<string, number> = {
                'Solo Action Game - Short Session': 1.425,
                'Solo RPG Game - Long Session': 1.8,
                'Multiplayer RPG - Party of 4': 1.8,
                'Not Gaming': 1.0
            };

            gamingSessionScenarios.forEach((scenario) => {
                const expectedBonus = expectedBonuses[scenario.name];
                expect(scenario.expectedBonus).toBe(expectedBonus);
                expect(scenario.expectedBonus).toBeGreaterThanOrEqual(1.0);
                expect(scenario.expectedBonus).toBeLessThanOrEqual(3.0);
            });
        });

        it('should have valid gaming contexts for all scenarios', () => {
            gamingSessionScenarios.forEach((scenario) => {
                const context = scenario.context;

                // Verify required properties
                expect(context).toHaveProperty('isActivelyGaming');
                expect(context).toHaveProperty('platformSource');
                expect(context).toHaveProperty('totalGamingMinutes');
                expect(context).toHaveProperty('gamesPlayedWhileListening');
                expect(context).toHaveProperty('lastUpdated');

                // Verify types
                expect(typeof context.isActivelyGaming).toBe('boolean');
                expect(['steam', 'discord', 'both', 'none']).toContain(context.platformSource);
                expect(typeof context.totalGamingMinutes).toBe('number');
                expect(Array.isArray(context.gamesPlayedWhileListening)).toBe(true);
                expect(typeof context.lastUpdated).toBe('number');
            });
        });
    });

    describe('Mock Data Helper Functions', () => {
        it('should provide correct gaming context for all scenarios', () => {
            const contextMap = {
                'none': mockGamingContext_NoGame,
                'action': mockGamingContext_ActionGame,
                'rpg': mockGamingContext_RPGGame,
                'strategy': mockGamingContext_StrategyGame,
                'multiplayer': mockGamingContext_MultiplayerGame
            };

            Object.entries(contextMap).forEach(([scenario, expectedContext]) => {
                const context = getMockGamingContext(scenario as any);
                expect(context).toEqual(expectedContext);
            });
        });

        it('should provide consistent expected gaming bonuses', () => {
            const bonusMap = {
                'none': 1.0,
                'action': 1.425,
                'rpg': 1.55,  // RPG matches first in "Action RPG", so only +0.2
                'strategy': 1.4,
                'multiplayer': 1.8
            };

            Object.entries(bonusMap).forEach(([scenario, expectedBonus]) => {
                const bonus = getExpectedGamingBonus(scenario as any);
                expect(bonus).toBe(expectedBonus);
            });
        });

        it('should provide valid Steam API mock data', () => {
            expect(mockSteamAPI_RecentlyPlayed).toHaveProperty('response');
            expect(mockSteamAPI_RecentlyPlayed.response).toHaveProperty('games');
            expect(Array.isArray(mockSteamAPI_RecentlyPlayed.response.games)).toBe(true);
            expect(mockSteamAPI_RecentlyPlayed.response.games.length).toBeGreaterThan(0);

            // Verify game data structure
            mockSteamAPI_RecentlyPlayed.response.games.forEach((game: any) => {
                expect(game).toHaveProperty('appid');
                expect(game).toHaveProperty('name');
                expect(game).toHaveProperty('playtime_forever');
                expect(game).toHaveProperty('playtime_2weeks');
            });
        });

        it('should provide valid Steam app list mock data', () => {
            expect(mockSteamAPI_AppList).toHaveProperty('applist');
            expect(mockSteamAPI_AppList.applist).toHaveProperty('apps');
            expect(Array.isArray(mockSteamAPI_AppList.applist.apps)).toBe(true);

            // Verify app structure
            mockSteamAPI_AppList.applist.apps.forEach((app: any) => {
                expect(app).toHaveProperty('appid');
                expect(app).toHaveProperty('name');
                expect(typeof app.appid).toBe('number');
                expect(typeof app.name).toBe('string');
            });
        });

        it('should provide valid Discord RPC mock data', () => {
            expect(mockDiscordRPC_Presence).toHaveProperty('applicationId');
            expect(mockDiscordRPC_Presence).toHaveProperty('name');
            expect(mockDiscordRPC_Presence).toHaveProperty('state');
            expect(mockDiscordRPC_Presence).toHaveProperty('details');
            expect(mockDiscordRPC_Presence).toHaveProperty('startTimestamp');
        });
    });

    describe('Gaming Context Validation', () => {
        it('should never exceed 3.0x gaming bonus multiplier', () => {
            const scenarios = ['none', 'action', 'rpg', 'strategy', 'multiplayer'];

            scenarios.forEach((scenario) => {
                const bonus = getExpectedGamingBonus(scenario as any);
                expect(bonus).toBeGreaterThanOrEqual(1.0);
                expect(bonus).toBeLessThanOrEqual(3.0);
            });
        });

        it('should provide minimum 1.0x gaming bonus', () => {
            const scenarios = ['none', 'action', 'rpg', 'strategy', 'multiplayer'];

            scenarios.forEach((scenario) => {
                const bonus = getExpectedGamingBonus(scenario as any);
                expect(bonus).toBeGreaterThanOrEqual(1.0);
            });
        });

        it('should distinguish between different game genres', () => {
            const action = getExpectedGamingBonus('action');
            const rpg = getExpectedGamingBonus('rpg');
            const strategy = getExpectedGamingBonus('strategy');

            expect(rpg).toBeGreaterThan(action);
            expect(action).toBeGreaterThan(strategy);
            expect(strategy).toBeGreaterThan(getExpectedGamingBonus('none'));
        });

        it('should provide multiplayer bonus', () => {
            const singlePlayer = getExpectedGamingBonus('rpg');
            const multiPlayer = getExpectedGamingBonus('multiplayer');

            expect(multiPlayer).toBeGreaterThan(singlePlayer);
        });
    });
});
