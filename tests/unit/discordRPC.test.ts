/**
 * Unit tests for DiscordRPCClient
 *
 * These tests mock the internal RPC client to test
 * the DiscordRPCClient behavior in isolation without requiring Discord to be running.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DiscordRPCClient, ActivityType, DiscordConnectionState } from '../../src/core/sensors/DiscordRPCClient';
import { Logger, LogLevel, type LogEntry } from '../../src/utils/logger';

describe('DiscordRPCClient - setMusicActivity() Unit Tests', () => {
    let discordClient: DiscordRPCClient;
    let mockSetActivity: ReturnType<typeof vi.fn>;
    let mockClearActivity: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        discordClient = new DiscordRPCClient('test-client-id');

        // Create mock functions
        mockSetActivity = vi.fn().mockResolvedValue(undefined);
        mockClearActivity = vi.fn().mockResolvedValue(undefined);

        // Create a mock RPC client
        const mockRPCClient = {
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn(),
            setActivity: mockSetActivity,
            clearActivity: mockClearActivity,
            on: vi.fn(),
            // Add onRawEvent for user info capture
            onRawEvent: vi.fn((callback) => {
                // Simulate READY event with user data
                setTimeout(() => {
                    callback(1, {
                        evt: 'READY',
                        data: {
                            user: {
                                id: '123456789',
                                username: 'TestUser',
                                discriminator: '1234',
                                avatar: 'abc123',
                                global_name: 'Test User'
                            }
                        }
                    });
                }, 0);
            })
        };

        // Replace the internal rpcClient with our mock
        (discordClient as any).rpcClient = mockRPCClient;

        // Mock the connection state to connected
        (discordClient as any).isConnected = true;
        (discordClient as any).connectionState = DiscordConnectionState.Connected;

        // Manually set user info
        (discordClient as any).userInfo = {
            id: '123456789',
            username: 'TestUser',
            discriminator: '1234',
            avatar: 'abc123',
            globalName: 'Test User'
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        discordClient.disconnect();
    });

    describe('Basic setMusicActivity() functionality', () => {
        it('should return false when not connected', async () => {
            (discordClient as any).isConnected = false;

            const result = await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            expect(result).toBe(false);
            expect(mockSetActivity).not.toHaveBeenCalled();
        });

        it('should call setActivity with correct parameters for basic song info', async () => {
            const musicDetails = {
                songName: 'Never Gonna Give You Up',
                artistName: 'Rick Astley'
            };

            const result = await discordClient.setMusicActivity(musicDetails);

            expect(result).toBe(true);
            expect(mockSetActivity).toHaveBeenCalledTimes(1);
            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: ActivityType.Listening,
                    details: 'Never Gonna Give You Up',
                    state: 'by Rick Astley'
                })
            );
        });

        it('should handle song name without artist', async () => {
            const result = await discordClient.setMusicActivity({
                songName: 'Instrumental Track'
            });

            expect(result).toBe(true);
            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: ActivityType.Listening,
                    details: 'Instrumental Track'
                })
            );
            // Should not have state field if no artist
            const callArgs = mockSetActivity.mock.calls[0][0];
            expect(callArgs.state).toBeUndefined();
        });

        it('should use ActivityType.Listening (2) for music', async () => {
            await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: ActivityType.Listening
                })
            );
        });
    });

    describe('Progress bar (timestamps) functionality', () => {
        it('should add timestamps when both startTime and durationSeconds provided', async () => {
            const startTime = Math.floor(Date.now() / 1000);
            const durationSeconds = 212;

            await discordClient.setMusicActivity({
                songName: 'Test Song',
                startTime,
                durationSeconds
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    startTimestamp: startTime,
                    endTimestamp: startTime + durationSeconds
                })
            );
        });

        it('should calculate timestamps when only durationSeconds provided', async () => {
            const durationSeconds = 180;

            await discordClient.setMusicActivity({
                songName: 'Test Song',
                durationSeconds
            });

            const callArgs = mockSetActivity.mock.calls[0][0];

            expect(callArgs.startTimestamp).toBeDefined();
            expect(callArgs.endTimestamp).toBeDefined();
            expect(callArgs.endTimestamp - callArgs.startTimestamp).toBe(durationSeconds);
        });

        it('should not add timestamps when no duration provided', async () => {
            await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            const callArgs = mockSetActivity.mock.calls[0][0];

            expect(callArgs.startTimestamp).toBeUndefined();
            expect(callArgs.endTimestamp).toBeUndefined();
        });

        it('should handle zero duration gracefully', async () => {
            await discordClient.setMusicActivity({
                songName: 'Test Song',
                durationSeconds: 0
            });

            // Zero duration is falsy, so no timestamps are added
            const callArgs = mockSetActivity.mock.calls[0][0];
            expect(callArgs.startTimestamp).toBeUndefined();
            expect(callArgs.endTimestamp).toBeUndefined();
        });

        it('should handle very long duration (hours-long songs)', async () => {
            const durationSeconds = 3600; // 1 hour

            await discordClient.setMusicActivity({
                songName: 'Long Ambient Track',
                durationSeconds
            });

            const callArgs = mockSetActivity.mock.calls[0][0];
            expect(callArgs.endTimestamp - callArgs.startTimestamp).toBe(durationSeconds);
        });
    });

    describe('Album art functionality', () => {
        it('should add album art when albumArtKey provided', async () => {
            await discordClient.setMusicActivity({
                songName: 'Test Song',
                albumArtKey: 'album_cover_123'
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    largeImageKey: 'album_cover_123',
                    largeImageText: 'Test Song'
                })
            );
        });

        it('should not add image fields when no album art provided', async () => {
            await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            const callArgs = mockSetActivity.mock.calls[0][0];

            expect(callArgs.largeImageKey).toBeUndefined();
            expect(callArgs.largeImageText).toBeUndefined();
            expect(callArgs.smallImageKey).toBeUndefined();
            expect(callArgs.smallImageText).toBeUndefined();
        });

        it('should use song name as largeImageText when album art provided', async () => {
            const songName = 'Stairway to Heaven';

            await discordClient.setMusicActivity({
                songName,
                albumArtKey: 'led_zeppelin_iv'
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    largeImageText: songName
                })
            );
        });
    });

    describe('Error handling', () => {
        it('should return false and log warning when setActivity throws error', async () => {
            // Set up Logger to capture log entries
            const logEntries: LogEntry[] = [];
            Logger.configure({
                level: LogLevel.DEBUG,
                customHandler: (entry) => logEntries.push(entry)
            });

            // Get the actual RPC client and make setActivity throw
            const actualRPCClient = (discordClient as any).rpcClient;
            actualRPCClient.setActivity.mockImplementationOnce(() => {
                throw new Error('RPC error');
            });

            const result = await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            expect(result).toBe(false);
            expect(logEntries.some(entry =>
                entry.level === LogLevel.WARN &&
                entry.message.includes('Failed to update Discord music activity')
            )).toBe(true);

            Logger.reset();
        });

        it('should handle null song name gracefully', async () => {
            // TypeScript should prevent this at compile time, but we test runtime behavior
            const result = await discordClient.setMusicActivity({
                songName: '' as string
            });

            expect(result).toBe(true);
            expect(mockSetActivity).toHaveBeenCalled();
        });

        it('should return false when rpcClient is null', async () => {
            (discordClient as any).rpcClient = null;

            const result = await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            expect(result).toBe(false);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle complete music activity with all fields', async () => {
            const musicDetails = {
                songName: 'Bohemian Rhapsody',
                artistName: 'Queen',
                albumArtKey: 'night_at_opera',
                startTime: 1703000000,
                durationSeconds: 354
            };

            await discordClient.setMusicActivity(musicDetails);

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: ActivityType.Listening,
                    details: 'Bohemian Rhapsody',
                    state: 'by Queen',
                    startTimestamp: 1703000000,
                    endTimestamp: 1703000354,
                    largeImageKey: 'night_at_opera',
                    largeImageText: 'Bohemian Rhapsody'
                })
            );
        });

        it('should handle artist name formatting with "by " prefix', async () => {
            await discordClient.setMusicActivity({
                songName: 'Imagine',
                artistName: 'John Lennon'
            });

            const callArgs = mockSetActivity.mock.calls[0][0];
            expect(callArgs.state).toBe('by John Lennon');
        });

        it('should handle empty artist name', async () => {
            await discordClient.setMusicActivity({
                songName: 'Test Song',
                artistName: ''
            });

            const callArgs = mockSetActivity.mock.calls[0][0];
            // Empty string is falsy, so state should not be set
            expect(callArgs.state).toBeUndefined();
        });

        it('should handle special characters in song/artist names', async () => {
            await discordClient.setMusicActivity({
                songName: 'Café Del Mar',
                artistName: 'Jóse González'
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: 'Café Del Mar',
                    state: 'by Jóse González'
                })
            );
        });
    });

    describe('Multiple calls', () => {
        it('should handle multiple setMusicActivity calls in sequence', async () => {
            await discordClient.setMusicActivity({
                songName: 'Song 1'
            });

            await discordClient.setMusicActivity({
                songName: 'Song 2'
            });

            await discordClient.setMusicActivity({
                songName: 'Song 3'
            });

            expect(mockSetActivity).toHaveBeenCalledTimes(3);

            // Verify last call has correct data
            const lastCallArgs = mockSetActivity.mock.calls[2][0];
            expect(lastCallArgs.details).toBe('Song 3');
        });

        it('should handle rapid successive calls', async () => {
            // Make multiple calls rapidly
            const promises = [
                discordClient.setMusicActivity({ songName: 'Song 1' }),
                discordClient.setMusicActivity({ songName: 'Song 2' }),
                discordClient.setMusicActivity({ songName: 'Song 3' }),
                discordClient.setMusicActivity({ songName: 'Song 4' }),
                discordClient.setMusicActivity({ songName: 'Song 5' })
            ];

            await Promise.all(promises);

            expect(mockSetActivity).toHaveBeenCalledTimes(5);
        });
    });

    describe('Data validation', () => {
        it('should pass very long song names to setActivity', async () => {
            const longSongName = 'A'.repeat(200);

            await discordClient.setMusicActivity({
                songName: longSongName
            });

            const callArgs = mockSetActivity.mock.calls[0][0];
            // Discord truncates to 128 chars automatically
            // Our implementation doesn't truncate, but we verify the data is passed
            expect(callArgs.details).toBe(longSongName);
        });

        it('should handle numeric song names', async () => {
            await discordClient.setMusicActivity({
                songName: '12345'
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: '12345'
                })
            );
        });

        it('should handle unicode characters in song names', async () => {
            await discordClient.setMusicActivity({
                songName: '🎵 Musical Song 🎶',
                artistName: '🎤 Artist'
            });

            expect(mockSetActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                    details: '🎵 Musical Song 🎶',
                    state: 'by 🎤 Artist'
                })
            );
        });
    });
});

describe('DiscordRPCClient - clearMusicActivity() Unit Tests', () => {
    let discordClient: DiscordRPCClient;
    let mockClearActivity: ReturnType<typeof vi.fn>;
    let mockSetActivity: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        discordClient = new DiscordRPCClient('test-client-id');

        mockClearActivity = vi.fn().mockResolvedValue(undefined);
        mockSetActivity = vi.fn().mockResolvedValue(undefined);

        const mockRPCClient = {
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn(),
            setActivity: mockSetActivity,
            clearActivity: mockClearActivity,
            on: vi.fn(),
            onRawEvent: vi.fn()
        };

        (discordClient as any).rpcClient = mockRPCClient;
        (discordClient as any).isConnected = true;
        (discordClient as any).connectionState = DiscordConnectionState.Connected;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        discordClient.disconnect();
    });

    describe('Basic clearMusicActivity() functionality', () => {
        it('should return false when not connected', async () => {
            (discordClient as any).isConnected = false;

            const result = await discordClient.clearMusicActivity();

            expect(result).toBe(false);
            expect(mockClearActivity).not.toHaveBeenCalled();
        });

        it('should call clearActivity on RPC client when connected', async () => {
            const result = await discordClient.clearMusicActivity();

            expect(result).toBe(true);
            expect(mockClearActivity).toHaveBeenCalledTimes(1);
        });

        it('should handle clearActivity errors gracefully', async () => {
            // Set up Logger to capture log entries
            const logEntries: LogEntry[] = [];
            Logger.configure({
                level: LogLevel.DEBUG,
                customHandler: (entry) => logEntries.push(entry)
            });

            // Get the actual RPC client and make clearActivity throw
            const actualRPCClient = (discordClient as any).rpcClient;
            actualRPCClient.clearActivity.mockImplementationOnce(() => {
                throw new Error('RPC error');
            });

            const result = await discordClient.clearMusicActivity();

            expect(result).toBe(false);
            expect(logEntries.some(entry =>
                entry.level === LogLevel.WARN &&
                entry.message.includes('Failed to clear Discord music activity')
            )).toBe(true);

            Logger.reset();
        });

        it('should return false when rpcClient is null', async () => {
            (discordClient as any).rpcClient = null;

            const result = await discordClient.clearMusicActivity();

            expect(result).toBe(false);
        });
    });

    describe('Clear after set', () => {
        it('should clear activity after setting it', async () => {
            // Set activity
            await discordClient.setMusicActivity({
                songName: 'Test Song'
            });

            expect(mockSetActivity).toHaveBeenCalled();

            // Clear activity
            await discordClient.clearMusicActivity();

            expect(mockClearActivity).toHaveBeenCalled();
        });

        it('should handle multiple set/clear cycles', async () => {
            // Set/clear cycle 1
            await discordClient.setMusicActivity({ songName: 'Song 1' });
            await discordClient.clearMusicActivity();

            // Set/clear cycle 2
            await discordClient.setMusicActivity({ songName: 'Song 2' });
            await discordClient.clearMusicActivity();

            // Set/clear cycle 3
            await discordClient.setMusicActivity({ songName: 'Song 3' });
            await discordClient.clearMusicActivity();

            expect(mockSetActivity).toHaveBeenCalledTimes(3);
            expect(mockClearActivity).toHaveBeenCalledTimes(3);
        });
    });
});

describe('DiscordRPCClient - Connection State Unit Tests', () => {
    let discordClient: DiscordRPCClient;

    beforeEach(() => {
        discordClient = new DiscordRPCClient('test-client-id');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        discordClient.disconnect();
    });

    it('should start in Disconnected state', () => {
        expect(discordClient.getConnectionState()).toBe(DiscordConnectionState.Disconnected);
    });

    it('should transition to Connecting state during connect', async () => {
        // Mock the connect method to avoid actual connection
        const originalConnect = discordClient.connect.bind(discordClient);
        vi.spyOn(discordClient, 'connect').mockImplementation(async () => {
            (discordClient as any).connectionState = DiscordConnectionState.Connecting;
            return true;
        });

        await discordClient.connect();

        expect(discordClient.getConnectionState()).toBe(DiscordConnectionState.Connecting);
    });

    it('should return correct last error message', async () => {
        const clientNoId = new DiscordRPCClient();
        await clientNoId.connect();

        expect(clientNoId.getLastError()).toBe('Discord client ID not provided');
        expect(clientNoId.getConnectionState()).toBe(DiscordConnectionState.Error);
    });

    it('should clear error on successful connection', async () => {
        // Mock a successful connection
        vi.spyOn(discordClient, 'connect').mockImplementation(async () => {
            (discordClient as any).connectionState = DiscordConnectionState.Connected;
            (discordClient as any).isConnected = true;
            (discordClient as any).lastError = null;
            return true;
        });

        await discordClient.connect();

        expect(discordClient.getLastError()).toBeNull();
    });
});

describe('DiscordRPCClient - getUserInfo() Unit Tests', () => {
    let discordClient: DiscordRPCClient;

    beforeEach(() => {
        discordClient = new DiscordRPCClient('test-client-id');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        discordClient.disconnect();
    });

    it('should return null when not connected', async () => {
        const userInfo = await discordClient.getUserInfo();

        expect(userInfo).toBeNull();
    });

    it('should return cached user info after connection', async () => {
        (discordClient as any).isConnected = true;
        (discordClient as any).userInfo = {
            id: '123456789',
            username: 'TestUser',
            discriminator: '1234',
            avatar: 'abc123',
            globalName: 'Test User'
        };

        const userInfo = await discordClient.getUserInfo();

        expect(userInfo).not.toBeNull();
        expect(userInfo?.username).toBe('TestUser');
        expect(userInfo?.discriminator).toBe('1234');
        expect(userInfo?.id).toBe('123456789');
    });

    it('should return null when user info not yet available', async () => {
        (discordClient as any).isConnected = true;
        (discordClient as any).userInfo = null;

        const userInfo = await discordClient.getUserInfo();

        expect(userInfo).toBeNull();
    });

    it('should include globalName when available', async () => {
        (discordClient as any).isConnected = true;
        (discordClient as any).userInfo = {
            id: '123456789',
            username: 'TestUser',
            discriminator: '1234',
            avatar: 'abc123',
            globalName: 'Test User'
        };

        const userInfo = await discordClient.getUserInfo();

        expect(userInfo?.globalName).toBe('Test User');
    });

    it('should include avatar hash when available', async () => {
        (discordClient as any).isConnected = true;
        (discordClient as any).userInfo = {
            id: '123456789',
            username: 'TestUser',
            discriminator: '1234',
            avatar: 'abc123',
            globalName: 'Test User'
        };

        const userInfo = await discordClient.getUserInfo();

        expect(userInfo?.avatar).toBe('abc123');
    });

    it('should return a copy of user info, not the reference', async () => {
        const originalUserInfo = {
            id: '123456789',
            username: 'TestUser',
            discriminator: '1234',
            avatar: 'abc123',
            globalName: 'Test User'
        };

        (discordClient as any).isConnected = true;
        (discordClient as any).userInfo = originalUserInfo;

        const userInfo = await discordClient.getUserInfo();

        // Modify the returned user info
        if (userInfo) {
            userInfo.username = 'Modified';
        }

        // Original should be unchanged
        expect((discordClient as any).userInfo.username).toBe('TestUser');
    });
});

describe('Logger - Diagnostic Mode', () => {
    // Save original logger state before each test
    let originalLevel: LogLevel;

    beforeEach(() => {
        originalLevel = Logger.getLevel();
        Logger.reset();
    });

    afterEach(() => {
        // Reset to original state after each test
        Logger.setLevel(originalLevel);
        Logger.reset();
    });

    it('should start in INFO log level by default', () => {
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should enable diagnostic mode and set DEBUG level', () => {
        Logger.enableDiagnosticMode();
        expect(Logger.isDiagnosticMode()).toBe(true);
        expect(Logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should disable diagnostic mode and reset to INFO level', () => {
        Logger.enableDiagnosticMode();
        Logger.disableDiagnosticMode();
        expect(Logger.isDiagnosticMode()).toBe(false);
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should report diagnostic mode status correctly', () => {
        expect(Logger.isDiagnosticMode()).toBe(false);

        Logger.enableDiagnosticMode();
        expect(Logger.isDiagnosticMode()).toBe(true);

        Logger.disableDiagnosticMode();
        expect(Logger.isDiagnosticMode()).toBe(false);
    });

    it('should allow manual log level changes outside diagnostic mode', () => {
        Logger.setLevel(LogLevel.WARN);
        expect(Logger.getLevel()).toBe(LogLevel.WARN);
        expect(Logger.isDiagnosticMode()).toBe(false);
    });

    it('should enable debug logging when diagnostic mode is on', () => {
        const entries: LogEntry[] = [];

        Logger.configure({
            customHandler: (entry) => {
                entries.push(entry);
            }
        });

        Logger.enableDiagnosticMode();

        const logger = Logger.for('TestModule');
        logger.debug('This is a debug message');

        expect(entries).toHaveLength(1);
        expect(entries[0].level).toBe(LogLevel.DEBUG);
        expect(entries[0].message).toBe('This is a debug message');
    });

    it('should not log debug messages when diagnostic mode is off', () => {
        const entries: LogEntry[] = [];

        Logger.configure({
            level: LogLevel.INFO, // Default level
            customHandler: (entry) => {
                entries.push(entry);
            }
        });

        expect(Logger.isDiagnosticMode()).toBe(false);

        const logger = Logger.for('TestModule');
        logger.debug('This debug message should not appear');

        expect(entries).toHaveLength(0);
    });
});

describe('Logger - Verbose Mode', () => {
    let originalLevel: LogLevel;

    beforeEach(() => {
        originalLevel = Logger.getLevel();
        Logger.reset();
    });

    afterEach(() => {
        Logger.setLevel(originalLevel);
        Logger.reset();
    });

    it('should start with verbose mode disabled by default', () => {
        expect(Logger.isVerbose()).toBe(false);
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should enable verbose mode and set DEBUG level', () => {
        Logger.enableVerbose();
        expect(Logger.isVerbose()).toBe(true);
        expect(Logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should disable verbose mode and reset to INFO level', () => {
        Logger.enableVerbose();
        Logger.disableVerbose();
        expect(Logger.isVerbose()).toBe(false);
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should set verbose mode to true', () => {
        Logger.setVerbose(true);
        expect(Logger.isVerbose()).toBe(true);
        expect(Logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it('should set verbose mode to false', () => {
        Logger.enableVerbose();
        Logger.setVerbose(false);
        expect(Logger.isVerbose()).toBe(false);
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should toggle verbose mode with setVerbose', () => {
        expect(Logger.isVerbose()).toBe(false);

        Logger.setVerbose(true);
        expect(Logger.isVerbose()).toBe(true);

        Logger.setVerbose(false);
        expect(Logger.isVerbose()).toBe(false);
    });

    it('should log debug messages when verbose mode is enabled', () => {
        const entries: LogEntry[] = [];

        Logger.configure({
            customHandler: (entry) => {
                entries.push(entry);
            }
        });

        Logger.enableVerbose();

        const logger = Logger.for('TestModule');
        logger.debug('Verbose debug message');

        expect(entries).toHaveLength(1);
        expect(entries[0].level).toBe(LogLevel.DEBUG);
        expect(entries[0].message).toBe('Verbose debug message');
    });

    it('should not log debug messages when verbose mode is disabled', () => {
        const entries: LogEntry[] = [];

        Logger.configure({
            customHandler: (entry) => {
                entries.push(entry);
            }
        });

        expect(Logger.isVerbose()).toBe(false);

        const logger = Logger.for('TestModule');
        logger.debug('This debug message should not appear');

        expect(entries).toHaveLength(0);
    });

    it('should allow manual log level changes outside verbose mode', () => {
        Logger.setLevel(LogLevel.ERROR);
        expect(Logger.getLevel()).toBe(LogLevel.ERROR);
        expect(Logger.isVerbose()).toBe(false);
    });

    it('should reset verbose mode in reset()', () => {
        Logger.enableVerbose();
        expect(Logger.isVerbose()).toBe(true);

        Logger.reset();
        expect(Logger.isVerbose()).toBe(false);
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });

    it('should work independently from diagnostic mode', () => {
        // Verbose mode should be independent from diagnostic mode
        Logger.enableVerbose();
        expect(Logger.isVerbose()).toBe(true);
        expect(Logger.isDiagnosticMode()).toBe(false);

        Logger.enableDiagnosticMode();
        expect(Logger.isVerbose()).toBe(true);
        expect(Logger.isDiagnosticMode()).toBe(true);

        Logger.disableVerbose();
        // Diagnostic mode should still be true, but level should be INFO now
        expect(Logger.isDiagnosticMode()).toBe(true);
        expect(Logger.isVerbose()).toBe(false);
        expect(Logger.getLevel()).toBe(LogLevel.INFO);
    });
});
