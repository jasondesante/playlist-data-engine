/**
 * Unit tests for XPCalculator
 * Based on ENGINE_DESIGN_DOCUMENT.md v2.0 Section 7.G
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { XPCalculator } from '../../src/core/progression/XPCalculator';
import type { ListeningSession, EnvironmentalContext, GamingContext } from '../../src/core/types/Progression';
import type { PlaylistTrack } from '../../src/core/types/Playlist';

describe('XPCalculator', () => {
    let calculator: XPCalculator;
    let mockTrack: PlaylistTrack;
    let mockSession: ListeningSession;

    beforeEach(() => {
        calculator = new XPCalculator();

        // Create mock playlist track
        mockTrack = {
            id: 'ethereum-0xContract-1',
            uuid: 'track-uuid-123',
            playlist_index: 0,
            chain_name: 'ethereum',
            token_address: '0xContract',
            token_id: '1',
            platform: 'sound',
            title: 'Test Track',
            artist: 'Test Artist',
            image_url: 'https://example.com/image.jpg',
            audio_url: 'https://example.com/audio.mp3',
            duration: 180, // 3 minutes
            genre: 'electronic',
            tags: ['test'],
        };

        // Create mock listening session (180 seconds = 3 minutes)
        mockSession = {
            track_uuid: 'track-uuid-123',
            start_time: Date.now(),
            end_time: Date.now() + 180000,
            duration_seconds: 180,
            base_xp_earned: 0,
            bonus_xp: 0,
            total_xp_earned: 0,
        };
    });

    describe('Base XP Calculation (T065-T066)', () => {
        it('should calculate base XP at 1 per second', () => {
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // 180 seconds * 1 XP/sec = 180 XP (plus 50 for completion) = 230
            expect(xp).toBe(230); // 180 base + 50 completion bonus
        });

        it('should handle short sessions', () => {
            mockSession.duration_seconds = 30;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            expect(xp).toBe(30); // No completion bonus (< 95% of 180s duration)
        });

        it('should handle long sessions', () => {
            mockSession.duration_seconds = 300;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // 300 * 1 + 50 (completion) = 350
            expect(xp).toBe(350);
        });

        it('should apply track completion bonus at 95%+ completion', () => {
            mockSession.duration_seconds = 171; // 95% of 180
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            expect(xp).toBe(221); // 171 + 50
        });

        it('should not apply completion bonus below 95%', () => {
            mockSession.duration_seconds = 170; // 94.4% of 180
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            expect(xp).toBe(170); // No completion bonus
        });

        it('should apply completion bonus without track reference', () => {
            const xp = calculator.calculateSessionXP(mockSession);
            expect(xp).toBe(180); // No completion bonus without track
        });
    });

    describe('Activity Multipliers (T065)', () => {
        it('should apply running multiplier (1.5x)', () => {
            mockSession.activity_type = 'running';
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.5) + 50 = 270 + 50 = 320
            expect(xp).toBe(320);
        });

        it('should apply walking multiplier (1.2x)', () => {
            mockSession.activity_type = 'walking';
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.2) + 50 = 216 + 50 = 266
            expect(xp).toBe(266);
        });

        it('should apply driving multiplier (1.3x)', () => {
            mockSession.activity_type = 'driving';
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.3) + 50 = 234 + 50 = 284
            expect(xp).toBe(284);
        });

        it('should apply stationary multiplier (1.0x)', () => {
            mockSession.activity_type = 'stationary';
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.0) + 50 = 180 + 50 = 230
            expect(xp).toBe(230);
        });

        it('should handle invalid activity type', () => {
            mockSession.activity_type = 'invalid_type';
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Should default to no multiplier
            expect(xp).toBe(230);
        });

        it('should handle missing activity type', () => {
            mockSession.activity_type = undefined;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            expect(xp).toBe(230);
        });
    });

    describe('Environmental Bonuses', () => {
        it('should apply night time bonus (1.25x)', () => {
            const envContext: EnvironmentalContext = {
                time_of_day: 'night',
                environmental_xp_modifier: 1.25,
            };
            mockSession.environmental_context = envContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.25) + 50 = 225 + 50 = 275
            expect(xp).toBe(275);
        });

        it('should apply thunderstorm bonus (1.4x)', () => {
            const envContext: EnvironmentalContext = {
                weather: {
                    temperature: 15,
                    feels_like: 12,
                    humidity: 80,
                    pressure: 1000,
                    weather_type: 'thunderstorm',
                    wind_speed: 10,
                    wind_direction: 180,
                    visibility: 5000,
                    is_night: false,
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 1.4,
            };
            mockSession.environmental_context = envContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.4) + 50 = 252 + 50 = 302
            expect(xp).toBe(302);
        });

        it('should apply rain bonus (1.4x)', () => {
            const envContext: EnvironmentalContext = {
                weather: {
                    temperature: 15,
                    feels_like: 14,
                    humidity: 90,
                    pressure: 1000,
                    weather_type: 'rain',
                    wind_speed: 5,
                    wind_direction: 180,
                    visibility: 5000,
                    is_night: false,
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 1.4,
            };
            mockSession.environmental_context = envContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.4) + 50 = 252 + 50 = 302
            expect(xp).toBe(302);
        });

        it('should apply high altitude bonus (1.3x) at 2000m+', () => {
            const envContext: EnvironmentalContext = {
                location: {
                    latitude: 40.7128,
                    longitude: -74.006,
                    altitude: 2500,
                    accuracy: 10,
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 1.3,
            };
            mockSession.environmental_context = envContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.3) + 50 = 234 + 50 = 284
            expect(xp).toBe(284);
        });

        it('should not apply altitude bonus below 2000m', () => {
            const envContext: EnvironmentalContext = {
                location: {
                    latitude: 40.7128,
                    longitude: -74.006,
                    altitude: 1500,
                    accuracy: 10,
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 1.0,
            };
            mockSession.environmental_context = envContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.0) + 50 = 230
            expect(xp).toBe(230);
        });

        it('should stack multiple environmental bonuses', () => {
            const envContext: EnvironmentalContext = {
                time_of_day: 'night', // 1.25x
                weather: {
                    temperature: 15,
                    feels_like: 12,
                    humidity: 80,
                    pressure: 1000,
                    weather_type: 'thunderstorm', // 1.4x
                    wind_speed: 10,
                    wind_direction: 180,
                    visibility: 5000,
                    is_night: true,
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 1.75, // 1.25 * 1.4
            };
            mockSession.environmental_context = envContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.25 * 1.4) + 50 = 315 + 50 = 365
            expect(xp).toBe(365);
        });
    });

    describe('Gaming Bonuses', () => {
        it('should apply base gaming bonus (+25%)', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['Elden Ring'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Elden Ring',
                    source: 'steam',
                    sessionDuration: 120, // 2 hours = +10% session bonus
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Base: 25% + Session: 10% (2 hours * 0.05) = 35% bonus
            // (180 * 1.35) + 50 = 243 + 50 = 293
            expect(xp).toBe(293);
        });

        it('should apply RPG genre bonus (+20% on top of base)', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['Baldur\'s Gate 3'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Baldur\'s Gate 3',
                    source: 'steam',
                    genre: ['RPG'],
                    sessionDuration: 120,
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Base: 25% + RPG: 20% + Session: 10% = 55% bonus
            // (180 * 1.55) + 50 = 279 + 50 = 329
            expect(xp).toBe(329);
        });

        it('should apply Action genre bonus (+15%)', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['Call of Duty'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Call of Duty',
                    source: 'steam',
                    genre: ['Action', 'FPS'],
                    sessionDuration: 120,
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Base: 25% + Action: 15% + Session: 10% = 50% bonus
            // (180 * 1.50) + 50 = 270 + 50 = 320
            expect(xp).toBe(320);
        });

        it('should apply Strategy genre bonus (+10%)', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['StarCraft II'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'StarCraft II',
                    source: 'steam',
                    genre: ['Strategy'],
                    sessionDuration: 120,
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Base: 25% + Strategy: 10% + Session: 10% = 45% bonus
            // (180 * 1.45) + 50 = 261 + 50 = 311
            expect(xp).toBe(311);
        });

        it('should apply multiplayer bonus (+15% for party size > 1)', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'discord',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['Valheim'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Valheim',
                    source: 'discord',
                    partySize: 4,
                    sessionDuration: 120,
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Base: 25% + Multiplayer: 15% + Session: 10% = 50% bonus
            // (180 * 1.50) + 50 = 270 + 50 = 320
            expect(xp).toBe(320);
        });

        it('should apply session duration bonus (up to +20%)', () => {
            // 4 hours = +20%
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 240,
                gamesPlayedWhileListening: ['Skyrim'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Skyrim',
                    source: 'steam',
                    sessionDuration: 240, // 4 hours
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * (1.0 + 0.25 + 0.20)) + 50 = (180 * 1.45) + 50 = 261 + 50 = 311
            expect(xp).toBe(311);
        });

        it('should cap gaming bonus at reasonable levels', () => {
            // RPG + Multiplayer + Long session
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 300,
                gamesPlayedWhileListening: ['World of Warcraft'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'World of Warcraft',
                    source: 'steam',
                    genre: ['RPG', 'Multiplayer'],
                    partySize: 8,
                    sessionDuration: 300, // 5 hours
                },
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // Base: 180 * 1.0 = 180
            // +25% base: 180 * 0.25 = 45
            // +20% RPG: 180 * 0.20 = 36
            // +15% multiplayer: 180 * 0.15 = 27
            // +20% session (5 hours, capped): 180 * 0.20 = 36
            // = 180 + 45 + 36 + 27 + 36 = 324, plus 50 completion = 374
            expect(xp).toBeGreaterThan(300);
        });

        it('should not apply bonus when not actively gaming', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: false,
                platformSource: 'none',
                totalGamingMinutes: 0,
                gamesPlayedWhileListening: [],
                lastUpdated: Date.now(),
            };
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // (180 * 1.0) + 50 = 230
            expect(xp).toBe(230);
        });
    });

    describe('Combined Multipliers', () => {
        it('should stack activity + environmental + gaming bonuses', () => {
            mockSession.activity_type = 'running'; // 1.5x
            const envContext: EnvironmentalContext = {
                time_of_day: 'night', // 1.25x
                environmental_xp_modifier: 1.25,
            };
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['Elden Ring'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Elden Ring',
                    source: 'steam',
                    genre: ['RPG'],
                    sessionDuration: 120,
                },
            };
            mockSession.environmental_context = envContext;
            mockSession.gaming_context = gamingContext;
            const xp = calculator.calculateSessionXP(mockSession, mockTrack);
            // 180 * 1.5 (running) * 1.25 (night) * 1.45 (gaming) + 50
            // = 180 * 2.73 + 50 = 491 + 50 = 541
            expect(xp).toBeGreaterThan(500);
        });
    });

    describe('XP Thresholds & Leveling', () => {
        it('should return correct XP threshold for level 1', () => {
            expect(calculator.getXPThresholdForLevel(1)).toBe(0);
        });

        it('should return correct XP threshold for level 2', () => {
            expect(calculator.getXPThresholdForLevel(2)).toBe(300);
        });

        it('should return correct XP threshold for level 20', () => {
            expect(calculator.getXPThresholdForLevel(20)).toBe(355000);
        });

        it('should throw error for invalid level', () => {
            expect(() => calculator.getXPThresholdForLevel(0)).toThrow();
            expect(() => calculator.getXPThresholdForLevel(21)).toThrow();
        });

        it('should calculate XP needed to next level', () => {
            expect(calculator.getXPToNextLevel(1)).toBe(300);
            expect(calculator.getXPToNextLevel(2)).toBe(600);
        });

        it('should determine correct level from total XP', () => {
            expect(calculator.getLevelFromXP(0)).toBe(1);
            expect(calculator.getLevelFromXP(300)).toBe(2);
            expect(calculator.getLevelFromXP(900)).toBe(3);
            expect(calculator.getLevelFromXP(355000)).toBe(20);
        });

        it('should cap level at 20', () => {
            expect(calculator.getLevelFromXP(999999)).toBe(20);
        });
    });

    describe('Mastery System', () => {
        it('should check track mastery threshold', () => {
            expect(calculator.isTrackMastered(9)).toBe(false);
            expect(calculator.isTrackMastered(10)).toBe(true);
            expect(calculator.isTrackMastered(15)).toBe(true);
        });

        it('should return mastery bonus XP', () => {
            expect(calculator.getMasteryBonusXP()).toBe(100);
        });
    });

    describe('Configuration', () => {
        it('should allow custom configuration', () => {
            const customCalc = new XPCalculator({
                xp_per_second: 2,
                xp_per_track_completion: 100,
                track_mastery_threshold: 5,
            });

            mockSession.duration_seconds = 171; // 95% of 180 second track
            const xp = customCalc.calculateSessionXP(mockSession, mockTrack);
            // 171 * 2 (xp_per_second) + 100 (track completion) = 342 + 100 = 442
            expect(xp).toBe(442);
        });

        it('should return current configuration', () => {
            const config = calculator.getConfig();
            expect(config.xp_per_second).toBe(1);
            expect(config.xp_per_track_completion).toBe(50);
            expect(config.track_mastery_threshold).toBe(10);
        });
    });

    describe('Total Modifier Calculation', () => {
        it('should calculate environmental modifier correctly', () => {
            const envContext: EnvironmentalContext = {
                motion: {
                    acceleration: { x: 0, y: 0, z: 0 },
                    acceleration_with_gravity: { x: 0, y: 0, z: 9.8 },
                    rotation_rate: { alpha: 0, beta: 0, gamma: 0 },
                    movement_intensity: 0.6,
                    activity_type: 'running',
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 1.5,
            };
            const modifier = calculator.calculateTotalModifier(envContext);
            expect(modifier).toBe(1.5);
        });

        it('should calculate gaming modifier correctly', () => {
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 60,
                gamesPlayedWhileListening: ['Elden Ring'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'Elden Ring',
                    source: 'steam',
                    genre: ['RPG'],
                    sessionDuration: 120,
                },
            };
            const modifier = calculator.calculateTotalModifier(undefined, gamingContext);
            expect(modifier).toBeGreaterThan(1.4);
        });

        it('should cap total modifier at 3.0x', () => {
            const envContext: EnvironmentalContext = {
                time_of_day: 'night',
                motion: {
                    acceleration: { x: 0, y: 0, z: 0 },
                    acceleration_with_gravity: { x: 0, y: 0, z: 9.8 },
                    rotation_rate: { alpha: 0, beta: 0, gamma: 0 },
                    movement_intensity: 0.8,
                    activity_type: 'running',
                    timestamp: Date.now(),
                },
                environmental_xp_modifier: 2.0,
            };
            const gamingContext: GamingContext = {
                isActivelyGaming: true,
                platformSource: 'steam',
                totalGamingMinutes: 600,
                gamesPlayedWhileListening: ['World of Warcraft'],
                lastUpdated: Date.now(),
                currentGame: {
                    name: 'World of Warcraft',
                    source: 'steam',
                    genre: ['RPG', 'Multiplayer'],
                    partySize: 10,
                    sessionDuration: 600,
                },
            };
            const modifier = calculator.calculateTotalModifier(envContext, gamingContext);
            expect(modifier).toBeLessThanOrEqual(3.0);
        });
    });
});
