/**
 * Unit tests for progression system
 * Tests SessionTracker (T068-T069) and LevelUpProcessor (T070)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTracker } from '../../src/core/progression/SessionTracker';
import { LevelUpProcessor } from '../../src/core/progression/LevelUpProcessor';
import { XPCalculator } from '../../src/core/progression/XPCalculator';
import type { CharacterSheet, AbilityScores } from '../../src/core/types/Character';
import type { PlaylistTrack } from '../../src/core/types/Playlist';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry.js';
import { DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS } from '../../src/core/features/DefaultFeatures.js';

describe('SessionTracker (T068-T069)', () => {
    let tracker: SessionTracker;
    let mockTrack: PlaylistTrack;

    beforeEach(() => {
        tracker = new SessionTracker();
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
    });

    describe('Basic Session Management', () => {
        it('should start a listening session', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            // Session ID format: session-{counter}-{trackUuid}-{timestamp}
            expect(sessionId).toMatch(/^session-\d+-track-uuid-123-\d+$/);
        });

        it('should return active session count', () => {
            expect(tracker.getActiveSessionCount()).toBe(0);
            tracker.startSession('track-uuid-123', mockTrack);
            expect(tracker.getActiveSessionCount()).toBe(1);
        });

        it('should get active session IDs', () => {
            const id1 = tracker.startSession('track-uuid-123', mockTrack);
            const id2 = tracker.startSession('track-uuid-456', mockTrack);
            const ids = tracker.getActiveSessionIds();
            expect(ids).toContain(id1);
            expect(ids).toContain(id2);
            expect(ids.length).toBe(2);
        });
    });

    describe('Session Recording with Timestamps (T069)', () => {
        it('should end a session and record it', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId);

            expect(session).not.toBeNull();
            expect(session?.track_uuid).toBe('track-uuid-123');
            expect(session?.start_time).toBeLessThanOrEqual(Date.now());
            expect(session?.end_time).toBeGreaterThanOrEqual(session?.start_time!);
            expect(session?.duration_seconds).toBeGreaterThan(0);
        });

        it('should record timestamps correctly', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const startTime = Date.now();

            // Simulate delay
            const session = tracker.endSession(sessionId);

            expect(session?.start_time).toBeLessThanOrEqual(startTime);
            expect(session?.end_time).toBeGreaterThanOrEqual(startTime);
        });

        it('should calculate duration from timestamps', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId);

            // Duration should be at least 1 second (enforced minimum)
            expect(session!.duration_seconds).toBeGreaterThanOrEqual(1);

            const timeDiff = session!.end_time - session!.start_time;
            const expectedDuration = Math.max(1, Math.ceil(timeDiff / 1000));
            // Should match the expected duration (accounting for millisecond rounding)
            expect(session!.duration_seconds).toBe(expectedDuration);
        });

        it('should allow duration override', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId, 300); // Override to 300 seconds

            expect(session?.duration_seconds).toBe(300);
        });

        it('should record activity type', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId, 180, 'running');

            expect(session?.activity_type).toBe('running');
        });

        it('should not find non-existent session', () => {
            const session = tracker.endSession('invalid-session-id');
            expect(session).toBeNull();
        });
    });

    describe('XP Calculation in Sessions', () => {
        it('should calculate base XP earned', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId, 180); // 180 seconds

            expect(session?.base_xp_earned).toBe(180);
            expect(session?.total_xp_earned).toBeGreaterThanOrEqual(180);
        });

        it('should apply track completion bonus', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId, 171); // 95% of 180

            expect(session?.base_xp_earned).toBe(171);
            expect(session?.total_xp_earned).toBe(221); // 171 + 50 completion bonus
        });

        it('should not apply completion bonus below 95%', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId, 170);

            expect(session?.base_xp_earned).toBe(170);
            expect(session?.total_xp_earned).toBe(170); // No bonus
        });

        it('should apply activity multipliers', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);
            const session = tracker.endSession(sessionId, 180, 'running');

            // 180 * 1.5 (running) + 50 (completion) = 320
            expect(session?.total_xp_earned).toBe(320);
        });
    });

    describe('Session Context', () => {
        it('should store environmental context', () => {
            const context = {
                environmental_context: {
                    time_of_day: 'night' as const,
                    environmental_xp_modifier: 1.25,
                },
            };
            const sessionId = tracker.startSession('track-uuid-123', mockTrack, context);
            const session = tracker.endSession(sessionId, 180);

            expect(session?.environmental_context?.time_of_day).toBe('night');
        });

        it('should store gaming context', () => {
            const context = {
                gaming_context: {
                    isActivelyGaming: true,
                    platformSource: 'steam' as const,
                    totalGamingMinutes: 60,
                    gamesPlayedWhileListening: ['Elden Ring'],
                    lastUpdated: Date.now(),
                    currentGame: {
                        name: 'Elden Ring',
                        source: 'steam' as const,
                        sessionDuration: 120,
                    },
                },
            };
            const sessionId = tracker.startSession('track-uuid-123', mockTrack, context);
            const session = tracker.endSession(sessionId, 180);

            expect(session?.gaming_context?.currentGame?.name).toBe('Elden Ring');
        });

        it('should update context for active session', () => {
            const sessionId = tracker.startSession('track-uuid-123', mockTrack);

            const updated = tracker.updateSessionContext(sessionId, {
                environmental_context: {
                    time_of_day: 'night',
                    environmental_xp_modifier: 1.25,
                },
            });

            expect(updated).toBe(true);

            const session = tracker.endSession(sessionId, 180);
            expect(session?.environmental_context?.time_of_day).toBe('night');
        });
    });

    describe('Session History', () => {
        it('should maintain session history', () => {
            tracker.startSession('track-1', mockTrack);
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);

            tracker.endSession(id1, 180);
            tracker.endSession(id2, 200);

            const history = tracker.getSessionHistory();
            expect(history.length).toBe(2);
        });

        it('should filter sessions by track', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-1', mockTrack);
            const id3 = tracker.startSession('track-2', mockTrack);

            const s1 = tracker.endSession(id1, 180);
            const s2 = tracker.endSession(id2, 200);
            const s3 = tracker.endSession(id3, 150);

            expect(s1).not.toBeNull();
            expect(s2).not.toBeNull();
            expect(s3).not.toBeNull();

            const allHistory = tracker.getSessionHistory();
            expect(allHistory.length).toBe(3);

            const track1Sessions = tracker.getSessionsForTrack('track-1');
            expect(track1Sessions.length).toBe(2);
            expect(track1Sessions.every((s) => s.track_uuid === 'track-1')).toBe(true);
        });

        it('should calculate total listening time', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);
            const id3 = tracker.startSession('track-3', mockTrack);

            tracker.endSession(id1, 100);
            tracker.endSession(id2, 200);
            tracker.endSession(id3, 150);

            const totalTime = tracker.getTotalListeningTime();
            expect(totalTime).toBe(450);
        });

        it('should calculate total XP earned', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);

            tracker.endSession(id1, 180); // 180 + 50 = 230
            tracker.endSession(id2, 170); // 170 = 170

            const totalXP = tracker.getTotalXPEarned();
            expect(totalXP).toBe(400);
        });

        it('should get average session length', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);

            tracker.endSession(id1, 100);
            tracker.endSession(id2, 200);

            const avg = tracker.getAverageSessionLength();
            expect(avg).toBe(150);
        });

        it('should find longest session', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);
            const id3 = tracker.startSession('track-3', mockTrack);

            tracker.endSession(id1, 100);
            tracker.endSession(id2, 300);
            tracker.endSession(id3, 200);

            const longest = tracker.getLongestSession();
            expect(longest?.duration_seconds).toBe(300);
        });
    });

    describe('Track Mastery', () => {
        it('should track listen count', () => {
            for (let i = 0; i < 5; i++) {
                const id = tracker.startSession('track-1', mockTrack);
                tracker.endSession(id, 180);
            }

            const count = tracker.getTrackListenCount('track-1');
            expect(count).toBe(5);
        });

        it('should check track mastery', () => {
            for (let i = 0; i < 9; i++) {
                const id = tracker.startSession('track-1', mockTrack);
                tracker.endSession(id, 180);
            }

            expect(tracker.isTrackMastered('track-1')).toBe(false);

            const id = tracker.startSession('track-1', mockTrack);
            tracker.endSession(id, 180);

            expect(tracker.isTrackMastered('track-1')).toBe(true);
        });

        it('should check mastery with custom threshold', () => {
            for (let i = 0; i < 5; i++) {
                const id = tracker.startSession('track-1', mockTrack);
                tracker.endSession(id, 180);
            }

            expect(tracker.isTrackMastered('track-1', 10)).toBe(false);
            expect(tracker.isTrackMastered('track-1', 5)).toBe(true);
        });

        it('should get total listening time for track', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-1', mockTrack);
            const id3 = tracker.startSession('track-2', mockTrack);

            tracker.endSession(id1, 100);
            tracker.endSession(id2, 200);
            tracker.endSession(id3, 150);

            expect(tracker.getTrackListeningTime('track-1')).toBe(300);
            expect(tracker.getTrackListeningTime('track-2')).toBe(150);
        });
    });

    describe('Session Queries', () => {
        it('should get sessions in time range', () => {
            const now = Date.now();
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);
            const id3 = tracker.startSession('track-3', mockTrack);

            tracker.endSession(id1, 100);
            tracker.endSession(id2, 200);
            tracker.endSession(id3, 150);

            const sessions = tracker.getSessionsInRange(now - 10000, Date.now() + 10000);
            expect(sessions.length).toBeGreaterThan(0);
        });

        it('should get active session duration', () => {
            const sessionId = tracker.startSession('track-1', mockTrack);
            const duration = tracker.getActiveSessionDuration(sessionId);

            expect(duration).toBeGreaterThanOrEqual(0);
            expect(duration).toBeLessThan(1); // Should be nearly instant
        });
    });

    describe('Session Cleanup', () => {
        it('should clear history', () => {
            const id1 = tracker.startSession('track-1', mockTrack);
            const id2 = tracker.startSession('track-2', mockTrack);

            tracker.endSession(id1, 180);
            tracker.endSession(id2, 180);

            expect(tracker.getSessionHistory().length).toBe(2);

            tracker.clearHistory();
            expect(tracker.getSessionHistory().length).toBe(0);
        });

        it('should clear active sessions', () => {
            tracker.startSession('track-1', mockTrack);
            tracker.startSession('track-2', mockTrack);

            expect(tracker.getActiveSessionCount()).toBe(2);

            tracker.clearActiveSessions();
            expect(tracker.getActiveSessionCount()).toBe(0);
        });
    });
});

describe('LevelUpProcessor (T070)', () => {
    let mockCharacter: CharacterSheet;

    beforeEach(() => {
        // Initialize FeatureRegistry with default features for tests
        const registry = FeatureRegistry.getInstance();
        if (!registry.isInitialized()) {
            registry.initializeDefaults(DEFAULT_CLASS_FEATURES, DEFAULT_RACIAL_TRAITS);
        }

        const baseScores: AbilityScores = {
            STR: 10,
            DEX: 10,
            CON: 10,
            INT: 10,
            WIS: 10,
            CHA: 10,
        };

        mockCharacter = {
            name: 'Test Character',
            race: 'Human',
            class: 'Fighter',
            level: 1,
            ability_scores: baseScores,
            ability_modifiers: {
                STR: 0,
                DEX: 0,
                CON: 0,
                INT: 0,
                WIS: 0,
                CHA: 0,
            },
            proficiency_bonus: 2,
            hp: {
                current: 10,
                max: 10,
                temp: 0,
            },
            armor_class: 10,
            initiative: 0,
            speed: 30,
            skills: {
                athletics: 'none',
                acrobatics: 'none',
                sleight_of_hand: 'none',
                stealth: 'none',
                arcana: 'none',
                history: 'none',
                investigation: 'none',
                nature: 'none',
                religion: 'none',
                animal_handling: 'none',
                insight: 'none',
                medicine: 'none',
                perception: 'none',
                survival: 'none',
                deception: 'none',
                intimidation: 'none',
                performance: 'none',
                persuasion: 'none',
            },
            saving_throws: {
                STR: false,
                DEX: false,
                CON: false,
                INT: false,
                WIS: false,
                CHA: false,
            },
            racial_traits: [],
            class_features: [],
            seed: 'test-seed',
            generated_at: new Date().toISOString(),
        };
    });

    describe('Level Up Benefits Calculation', () => {
        it('should process level up from 1 to 2', () => {
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);

            expect(benefits.newLevel).toBe(2);
            expect(benefits.hitPointIncrease).toBeGreaterThan(0);
            expect(benefits.newHitPointsTotal).toBeGreaterThan(10);
            expect(benefits.proficiencyBonusIncrease).toBe(0); // Still +2 at level 2
        });

        it('should process level up from 2 to 3', () => {
            mockCharacter.level = 2;
            mockCharacter.proficiency_bonus = 2;

            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 3);

            expect(benefits.newLevel).toBe(3);
            expect(benefits.hitPointIncrease).toBeGreaterThan(0);
        });

        it('should increase proficiency bonus at level 5', () => {
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 5);

            expect(benefits.proficiencyBonusIncrease).toBe(1); // From +2 to +3
            expect(benefits.newProficiencyBonus).toBe(3);
        });

        it('should grant ability score increase at level 4', () => {
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 4);

            expect(benefits.abilityScoreIncrease).toBeDefined();
            expect(benefits.abilityScoreIncrease?.increase).toBe(2);
        });

        it('should grant ability score increase at levels 8, 12, 16, 19', () => {
            [8, 12, 16, 19].forEach((level) => {
                const benefits = LevelUpProcessor.processLevelUp(mockCharacter, level);
                expect(benefits.abilityScoreIncrease).toBeDefined();
            });
        });

        it('should not grant ability score increase at other levels', () => {
            [2, 3, 5, 6, 7, 9].forEach((level) => {
                const benefits = LevelUpProcessor.processLevelUp(mockCharacter, level);
                expect(benefits.abilityScoreIncrease).toBeUndefined();
            });
        });

        it('should grant spell slots for spellcasters', () => {
            mockCharacter.class = 'Wizard';
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);

            expect(benefits.newSpellSlots).toBeDefined();
        });

        it('should not grant spell slots for non-spellcasters', () => {
            mockCharacter.class = 'Fighter';
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);

            expect(benefits.newSpellSlots).toBeUndefined();
        });
    });

    describe('Apply Level Up', () => {
        it('should apply level up to character', () => {
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);
            const updated = LevelUpProcessor.applyLevelUp(mockCharacter, benefits);

            expect(updated.level).toBe(2);
            expect(updated.hp.max).toBeGreaterThan(10);
        });

        it('should not exceed ability score of 20', () => {
            mockCharacter.ability_scores.STR = 19;
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 4, 'test-seed');
            benefits.abilityScoreIncrease = { ability: 'STR', increase: 2 };

            const updated = LevelUpProcessor.applyLevelUp(mockCharacter, benefits);

            expect(updated.ability_scores.STR).toBe(20);
        });

        it('should recalculate ability modifiers after increase', () => {
            mockCharacter.ability_scores.STR = 10; // Modifier: 0
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 4);
            benefits.abilityScoreIncrease = { ability: 'STR', increase: 2 };

            const updated = LevelUpProcessor.applyLevelUp(mockCharacter, benefits);

            expect(updated.ability_scores.STR).toBe(12);
            expect(updated.ability_modifiers.STR).toBe(1); // (12-10)/2 = 1
        });
    });

    describe('HP Calculation', () => {
        it('should calculate HP increase with positive CON modifier', () => {
            mockCharacter.ability_modifiers.CON = 2;
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            // With Fighter (d10 hit die) and +2 CON
            expect(benefits.hitPointIncrease).toBeGreaterThanOrEqual(3); // Minimum 1 + CON mod
        });

        it('should maintain minimum 1 HP per level with negative CON', () => {
            mockCharacter.ability_modifiers.CON = -3;
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2, 'test-seed');

            expect(benefits.hitPointIncrease).toBeGreaterThanOrEqual(1);
        });
    });

    describe('XP Thresholds', () => {
        it('should return correct XP threshold for level 1', () => {
            expect(LevelUpProcessor.getXPThreshold(1)).toBe(0);
        });

        it('should return correct XP threshold for level 2', () => {
            expect(LevelUpProcessor.getXPThreshold(2)).toBe(300);
        });

        it('should return correct XP threshold for level 20', () => {
            expect(LevelUpProcessor.getXPThreshold(20)).toBe(355000);
        });

        it('should throw error for invalid level', () => {
            expect(() => LevelUpProcessor.getXPThreshold(0)).toThrow();
            // Levels beyond 20 are now supported for uncapped mode
        });
    });

    describe('Level Calculation', () => {
        it('should calculate level from total XP', () => {
            expect(LevelUpProcessor.calculateLevel(0)).toBe(1);
            expect(LevelUpProcessor.calculateLevel(300)).toBe(2);
            expect(LevelUpProcessor.calculateLevel(900)).toBe(3);
            expect(LevelUpProcessor.calculateLevel(355000)).toBe(20);
        });

        it('should cap level at 20', () => {
            expect(LevelUpProcessor.calculateLevel(999999)).toBe(20);
        });

        it('should get XP to next level', () => {
            expect(LevelUpProcessor.getXPToNextLevel(1)).toBe(300);
            expect(LevelUpProcessor.getXPToNextLevel(2)).toBe(600);
            expect(LevelUpProcessor.getXPToNextLevel(19)).toBe(50000);
        });

        it('should return 0 XP for max level', () => {
            expect(LevelUpProcessor.getXPToNextLevel(20)).toBe(0);
        });
    });

    describe('Progress Percentage', () => {
        it('should calculate progress to next level', () => {
            const currentXP = 450; // 300 into level 2, halfway to level 3 (which needs 900)
            const progress = LevelUpProcessor.getProgressPercentage(2, currentXP);

            expect(progress).toBeGreaterThan(0);
            expect(progress).toBeLessThanOrEqual(100);
        });

        it('should return 100% at max level', () => {
            const progress = LevelUpProcessor.getProgressPercentage(20, 355000);
            expect(progress).toBe(100);
        });
    });

    describe('Class Features', () => {
        it('should grant class features at appropriate levels', () => {
            mockCharacter.class = 'Fighter';
            const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);

            expect(benefits.classFeatures).toBeDefined();
            expect(benefits.classFeatures?.length).toBeGreaterThanOrEqual(0);
        });

        it('should grant features for different classes', () => {
            const classes = ['Barbarian', 'Wizard', 'Rogue', 'Bard'];

            classes.forEach((className) => {
                mockCharacter.class = className as any;
                mockCharacter.level = 1; // Reset level
                const benefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);
                expect(benefits.classFeatures).toBeDefined();
                expect(benefits.classFeatures!.length).toBeGreaterThan(0);
            });

            // Cleric's level 2 features are domain-specific and not in DEFAULT_CLASS_FEATURES
            // So Cleric at level 2 should not have classFeatures
            mockCharacter.class = 'Cleric' as any;
            mockCharacter.level = 1; // Reset level
            const clericBenefits = LevelUpProcessor.processLevelUp(mockCharacter, 2);
            expect(clericBenefits.classFeatures).toBeUndefined();
        });
    });
});
