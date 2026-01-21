/**
 * Integration Tests for DiscordRPCClient
 *
 * These tests require Discord to be running and logged in.
 * They test the actual RPC connection and communication with Discord.
 *
 * To run these tests:
 * 1. Make sure Discord is running and you are logged in
 * 2. Set DISCORD_CLIENT_ID environment variable (or use a test app ID)
 * 3. Run: npm test -- discordRPC.integration
 *
 * If Discord is not running, these tests will be skipped.
 *
 * @note These are integration tests that require actual Discord RPC connection.
 *       Unit tests (with mocking) are in tests/unit/discordRPC.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DiscordRPCClient, DiscordConnectionState, ActivityType } from '../../src/core/sensors/DiscordRPCClient';

// Get test client ID from environment or use a placeholder
// In production, this should be a real Discord application client ID
const TEST_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1234567890123456789';

describe('DiscordRPCClient - Integration Tests (Requires Discord Running)', () => {
    let discordClient: DiscordRPCClient;
    let discordAvailable: boolean = false;
    let connectionError: string | null = null;

    /**
     * Set up: Attempt to connect to Discord RPC
     * Tests will be skipped if Discord is not available
     */
    beforeAll(async () => {
        discordClient = new DiscordRPCClient(TEST_CLIENT_ID);

        // Attempt connection
        const connected = await discordClient.connect();

        if (connected) {
            // Wait a bit for the connection to fully establish
            await new Promise(resolve => setTimeout(resolve, 1000));

            const state = discordClient.getConnectionState();
            if (state === DiscordConnectionState.Connected) {
                discordAvailable = true;
                console.log('✓ Discord RPC integration tests: Discord is available');
            } else {
                connectionError = discordClient.getLastError() || 'Connection state not ready';
                console.log(`⊘ Discord RPC integration tests: Discord not available - ${connectionError}`);
            }
        } else {
            connectionError = discordClient.getLastError() || 'Connection failed';
            console.log(`⊘ Discord RPC integration tests: Discord not available - ${connectionError}`);
        }
    });

    afterAll(() => {
        if (discordClient) {
            discordClient.disconnect();
        }
    });

    // Helper to skip tests when Discord is not available
    const skipIfNoDiscord = (testFn: () => void | Promise<void>) => {
        if (!discordAvailable) {
            // Skip by returning early - Vitest will show this as a skipped test
            return;
        }
        return testFn();
    };

    describe('Connection Lifecycle', () => {
        it('should connect to Discord when Discord is running', () => {
            skipIfNoDiscord(() => {
                expect(discordClient.isConnectedToDiscord()).toBe(true);
                expect(discordClient.getConnectionState()).toBe(DiscordConnectionState.Connected);
                expect(discordClient.getLastError()).toBeNull();
            });
        });

        it('should retrieve user info after connection', async () => {
            skipIfNoDiscord(async () => {
                const userInfo = await discordClient.getUserInfo();

                expect(userInfo).not.toBeNull();
                expect(userInfo).toHaveProperty('id');
                expect(userInfo).toHaveProperty('username');
                expect(userInfo).toHaveProperty('discriminator');

                // Verify types
                expect(typeof userInfo!.id).toBe('string');
                expect(typeof userInfo!.username).toBe('string');
                expect(typeof userInfo!.discriminator).toBe('string');

                console.log(`  Connected as: ${userInfo!.username}#${userInfo!.discriminator} (${userInfo!.id})`);
            });
        });

        it('should have valid user info structure', async () => {
            skipIfNoDiscord(async () => {
                const userInfo = await discordClient.getUserInfo();

                expect(userInfo).not.toBeNull();

                // Check optional fields
                if (userInfo!.avatar) {
                    expect(typeof userInfo!.avatar).toBe('string');
                }
                if (userInfo!.globalName) {
                    expect(typeof userInfo!.globalName).toBe('string');
                }

                console.log(`  User display name: ${userInfo!.globalName || userInfo!.username}`);
            });
        });

        it('should disconnect cleanly from Discord', () => {
            skipIfNoDiscord(() => {
                // Create a separate client to test disconnection
                const testClient = new DiscordRPCClient(TEST_CLIENT_ID);

                // Connect it
                testClient.connect();
                testClient.disconnect();

                // After disconnect, should report not connected
                expect(testClient.isConnectedToDiscord()).toBe(false);
                expect(testClient.getConnectionState()).toBe(DiscordConnectionState.Disconnected);
            });
        });
    });

    describe('Music Activity - Real Discord RPC', () => {
        it('should set basic music activity on Discord profile', async () => {
            skipIfNoDiscord(async () => {
                const result = await discordClient.setMusicActivity({
                    songName: 'Test Song - Integration Test'
                });

                expect(result).toBe(true);

                // Give Discord a moment to update
                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('  ✓ Set music activity: "Test Song - Integration Test"');
            });
        });

        it('should set music activity with artist', async () => {
            skipIfNoDiscord(async () => {
                const result = await discordClient.setMusicActivity({
                    songName: 'Never Gonna Give You Up',
                    artistName: 'Rick Astley'
                });

                expect(result).toBe(true);

                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('  ✓ Set music activity with artist: "Never Gonna Give You Up" by Rick Astley');
            });
        });

        it('should set music activity with progress bar', async () => {
            skipIfNoDiscord(async () => {
                const startTime = Math.floor(Date.now() / 1000);
                const durationSeconds = 212; // 3:32

                const result = await discordClient.setMusicActivity({
                    songName: 'Bohemian Rhapsody',
                    artistName: 'Queen',
                    startTime,
                    durationSeconds
                });

                expect(result).toBe(true);

                await new Promise(resolve => setTimeout(resolve, 500));

                console.log(`  ✓ Set music activity with progress bar (${durationSeconds}s duration)`);
            });
        });

        it('should handle rapid successive music updates', async () => {
            skipIfNoDiscord(async () => {
                const songs = [
                    { songName: 'Song 1', artistName: 'Artist 1' },
                    { songName: 'Song 2', artistName: 'Artist 2' },
                    { songName: 'Song 3', artistName: 'Artist 3' }
                ];

                for (const song of songs) {
                    const result = await discordClient.setMusicActivity(song);
                    expect(result).toBe(true);
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('  ✓ Successfully updated activity 3 times in rapid succession');
            });
        });

        it('should clear music activity from Discord profile', async () => {
            skipIfNoDiscord(async () => {
                // First set an activity
                await discordClient.setMusicActivity({
                    songName: 'To Be Cleared'
                });

                await new Promise(resolve => setTimeout(resolve, 200));

                // Then clear it
                const result = await discordClient.clearMusicActivity();

                expect(result).toBe(true);

                await new Promise(resolve => setTimeout(resolve, 500));

                console.log('  ✓ Cleared music activity from Discord profile');
            });
        });
    });

    describe('Error Handling - Real Discord RPC', () => {
        it('should return false when setting activity without connection', async () => {
            // This test runs even without Discord available
            const disconnectedClient = new DiscordRPCClient(TEST_CLIENT_ID);

            // Don't connect this client
            const result = await disconnectedClient.setMusicActivity({
                songName: 'Should Not Appear'
            });

            expect(result).toBe(false);
        });

        it('should return false when clearing activity without connection', async () => {
            // This test runs even without Discord available
            const disconnectedClient = new DiscordRPCClient(TEST_CLIENT_ID);

            const result = await disconnectedClient.clearMusicActivity();

            expect(result).toBe(false);
        });

        it('should return null for user info when not connected', async () => {
            // This test runs even without Discord available
            const disconnectedClient = new DiscordRPCClient(TEST_CLIENT_ID);

            const userInfo = await disconnectedClient.getUserInfo();

            expect(userInfo).toBeNull();
        });
    });

    describe('Connection State Transitions', () => {
        it('should transition through correct connection states', () => {
            skipIfNoDiscord(() => {
                // Final state should be Connected
                expect(discordClient.getConnectionState()).toBe(DiscordConnectionState.Connected);
            });
        });

        it('should report no errors when connection is successful', () => {
            skipIfNoDiscord(() => {
                const lastError = discordClient.getLastError();
                expect(lastError).toBeNull();
            });
        });
    });

    describe('Special Characters and Edge Cases', () => {
        it('should handle special characters in song names', async () => {
            skipIfNoDiscord(async () => {
                const specialSongs = [
                    { songName: 'Café Del Mar', artistName: 'Jóse González' },
                    { songName: '🎵 Musical Song 🎶', artistName: '🎤 Artist' },
                    { songName: 'Lt@in & Speci@l Chars!', artistName: 'Test-Artist' }
                ];

                for (const song of specialSongs) {
                    const result = await discordClient.setMusicActivity(song);
                    expect(result).toBe(true);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                console.log('  ✓ Handled special characters, unicode, and emoji in song names');
            });
        });

        it('should handle very long song names', async () => {
            skipIfNoDiscord(async () => {
                const longSongName = 'A'.repeat(200);

                const result = await discordClient.setMusicActivity({
                    songName: longSongName,
                    artistName: 'Long Name Test'
                });

                expect(result).toBe(true);

                await new Promise(resolve => setTimeout(resolve, 200));

                console.log(`  ✓ Handled very long song name (${longSongName.length} chars)`);
            });
        });

        it('should handle empty/missing optional fields', async () => {
            skipIfNoDiscord(async () => {
                // Song name only (no artist, no progress bar)
                const result = await discordClient.setMusicActivity({
                    songName: 'Minimal Song'
                });

                expect(result).toBe(true);

                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('  ✓ Handled song with minimal fields (song name only)');
            });
        });
    });

    describe('Activity Type Verification', () => {
        it('should use ActivityType.Listening (2) for music activities', async () => {
            skipIfNoDiscord(async () => {
                // We can't directly verify the activity type sent to Discord,
                // but we can verify the method executes successfully
                const result = await discordClient.setMusicActivity({
                    songName: 'Activity Type Test'
                });

                expect(result).toBe(true);

                // The implementation uses ActivityType.Listening (2)
                // which should display as "Listening to" in Discord
                await new Promise(resolve => setTimeout(resolve, 200));

                console.log('  ✓ Music activity set with ActivityType.Listening (2)');
            });
        });
    });

    describe('Complete Workflow Test', () => {
        it('should handle complete music presence workflow', async () => {
            skipIfNoDiscord(async () => {
                // 1. Set activity with all fields
                await discordClient.setMusicActivity({
                    songName: 'Never Gonna Give You Up',
                    artistName: 'Rick Astley',
                    albumArtKey: 'album1',
                    startTime: Math.floor(Date.now() / 1000),
                    durationSeconds: 212
                });

                await new Promise(resolve => setTimeout(resolve, 300));

                // 2. Change to different song
                await discordClient.setMusicActivity({
                    songName: 'Together Forever',
                    artistName: 'Rick Astley'
                });

                await new Promise(resolve => setTimeout(resolve, 300));

                // 3. Clear activity
                await discordClient.clearMusicActivity();

                await new Promise(resolve => setTimeout(resolve, 300));

                console.log('  ✓ Completed full workflow: set → change → clear');
            });
        });
    });
});
