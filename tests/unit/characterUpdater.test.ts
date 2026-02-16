import { describe, it, expect, beforeEach } from 'vitest';
import { CharacterUpdater } from '../../src/core/progression/CharacterUpdater';
import type { CharacterSheet, AbilityScores } from '../../src/core/types/Character';
import type { ListeningSession } from '../../src/core/types/Progression';
import type { PlaylistTrack } from '../../src/core/types/Playlist';
import { MASTERY_THRESHOLD, MASTERY_BONUS_XP } from '../../src/utils/constants';

describe('CharacterUpdater', () => {
    let updater: CharacterUpdater;
    let mockCharacter: CharacterSheet;
    let mockSession: ListeningSession;
    let mockTrack: PlaylistTrack;

    beforeEach(() => {
        updater = new CharacterUpdater();

        const baseScores: AbilityScores = {
            STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
        };

        mockCharacter = {
            name: 'Test Character',
            race: 'Human',
            class: 'Fighter',
            level: 1,
            ability_scores: baseScores,
            ability_modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
            proficiency_bonus: 2,
            hp: { current: 10, max: 10, temp: 0 },
            armor_class: 10,
            initiative: 0,
            speed: 30,
            skills: {
                athletics: 'none', acrobatics: 'none', sleight_of_hand: 'none', stealth: 'none',
                arcana: 'none', history: 'none', investigation: 'none', nature: 'none', religion: 'none',
                animal_handling: 'none', insight: 'none', medicine: 'none', perception: 'none', survival: 'none',
                deception: 'none', intimidation: 'none', performance: 'none', persuasion: 'none'
            },
            saving_throws: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: false },
            racial_traits: [],
            class_features: [],
            xp: { current: 0, next_level: 300 },
            seed: 'test-seed',
            generated_at: new Date().toISOString(),
        };

        mockSession = {
            track_uuid: 'track-123',
            start_time: Date.now() - 180000,
            end_time: Date.now(),
            duration_seconds: 180,
            base_xp_earned: 180,
            bonus_xp: 0,
            total_xp_earned: 180,
        };

        mockTrack = {
            id: 'track-1',
            uuid: 'track-123',
            playlist_index: 0,
            chain_name: 'eth',
            token_address: '0x123',
            token_id: '1',
            platform: 'sound',
            title: 'Test Track',
            artist: 'Test Artist',
            image_url: '',
            audio_url: '',
            duration: 180,
            genre: 'rock',
            tags: [],
        };
    });

    describe('updateCharacterFromSession', () => {
        it('should add XP to character', () => {
            const result = updater.updateCharacterFromSession(mockCharacter, mockSession, mockTrack);

            expect(result.xpEarned).toBeGreaterThan(0);
            expect(result.character.xp.current).toBe(mockCharacter.xp.current + result.xpEarned);
        });

        it('should handle level up', () => {
            // Give enough XP to level up (needs 300)
            mockSession.duration_seconds = 300; // 300 XP
            mockSession.total_xp_earned = 300;

            const result = updater.updateCharacterFromSession(mockCharacter, mockSession, mockTrack);

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(2);
            expect(result.character.level).toBe(2);
            expect(result.character.hp.max).toBeGreaterThan(10); // HP should increase
            expect(result.character.xp.next_level).toBe(900); // Level 3 threshold
        });

        it('should handle multi-level jump', () => {
            // Give enough XP to jump to level 3 (needs 900)
            mockSession.duration_seconds = 1000;
            mockSession.total_xp_earned = 1000;

            const result = updater.updateCharacterFromSession(mockCharacter, mockSession, mockTrack);

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(3);
            expect(result.character.level).toBe(3);
        });

        it('should award mastery bonus when BOTH thresholds are crossed', () => {
            // Previous: 9 plays, 900 XP (both just under threshold)
            // Current: 10 plays, 900 + 180 = 1080 XP (both thresholds crossed)
            const result = updater.updateCharacterFromSession(
                mockCharacter,
                mockSession,
                mockTrack,
                {
                    previousListenCount: MASTERY_THRESHOLD - 1, // 9 plays
                    previousXP: 900, // Just under 1000 XP threshold
                    prestigeLevel: 0
                }
            );

            expect(result.masteredTrack).toBe(true);
            expect(result.masteryBonusXP).toBe(MASTERY_BONUS_XP);
            // XP earned should include session XP + mastery bonus
            expect(result.xpEarned).toBeGreaterThan(mockSession.duration_seconds + MASTERY_BONUS_XP);
        });

        it('should NOT award mastery if only plays threshold is crossed (need both)', () => {
            // Previous: 9 plays, 500 XP (plays threshold will be crossed, but not XP)
            const result = updater.updateCharacterFromSession(
                mockCharacter,
                mockSession,
                mockTrack,
                {
                    previousListenCount: 9,
                    previousXP: 500, // Not enough - with 180 XP will only be 680
                    prestigeLevel: 0
                }
            );

            expect(result.masteredTrack).toBe(false);
            expect(result.masteryBonusXP).toBe(0);
        });

        it('should NOT award mastery if only XP threshold is crossed (need both)', () => {
            // Previous: 5 plays, 950 XP (XP threshold will be crossed, but not plays)
            const result = updater.updateCharacterFromSession(
                mockCharacter,
                mockSession,
                mockTrack,
                {
                    previousListenCount: 5, // Not enough - will be 6
                    previousXP: 950, // With 180 XP will cross threshold
                    prestigeLevel: 0
                }
            );

            expect(result.masteredTrack).toBe(false);
            expect(result.masteryBonusXP).toBe(0);
        });

        it('should NOT award mastery bonus if already mastered', () => {
            // Previous: 10 plays, 1000 XP (already mastered)
            const result = updater.updateCharacterFromSession(
                mockCharacter,
                mockSession,
                mockTrack,
                {
                    previousListenCount: MASTERY_THRESHOLD, // 10 plays - already mastered
                    previousXP: 1000, // Already has enough XP
                    prestigeLevel: 0
                }
            );

            expect(result.masteredTrack).toBe(false);
            expect(result.masteryBonusXP).toBe(0);
        });
    });

    describe('addXP', () => {
        it('should create pending stat increases for standard mode (default manual behavior)', () => {
            // Standard mode defaults to manual stat selection (dnD5e strategy)
            // Level 1 -> Level 5 crosses level 4 which has a stat increase
            const result = updater.addXP(mockCharacter, 6500, 'quest'); // Enough to reach level 5

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(5);

            // Check that stats are PENDING at level 4 (not applied)
            const level4Detail = result.levelUpDetails!.find(d => d.toLevel === 4);
            expect(level4Detail).toBeDefined();
            expect(level4Detail!.statIncreases).toBeUndefined(); // Stats are pending!

            // But HP should still increase
            expect(level4Detail!.hpIncrease).toBeGreaterThan(0);

            // Counter should be incremented
            expect(result.character.pendingStatIncreases).toBe(1);
        });

        it('should automatically increase stats for uncapped mode (default auto behavior)', () => {
            // Uncapped mode defaults to automatic stat selection (dnD5e_smart strategy)
            const uncappedCharacter = { ...mockCharacter, gameMode: 'uncapped' as const };

            const result = updater.addXP(uncappedCharacter, 6500, 'quest'); // Enough to reach level 5

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(5);

            // Check that stats ARE applied automatically for uncapped mode
            const level2Detail = result.levelUpDetails!.find(d => d.toLevel === 2);
            expect(level2Detail).toBeDefined();
            expect(level2Detail!.statIncreases).toBeDefined();
            expect(level2Detail!.statIncreases!.length).toBeGreaterThan(0);

            // Counter should NOT be incremented (auto mode)
            expect(result.character.pendingStatIncreases).toBeUndefined();
        });

        it('should handle level up from combat XP', () => {
            // Give enough XP to level up (needs 300)
            const result = updater.addXP(mockCharacter, 300, 'combat');

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(2);
            expect(result.character.level).toBe(2);
            expect(result.character.hp.max).toBeGreaterThan(10); // HP should increase
            expect(result.character.xp.next_level).toBe(900); // Level 3 threshold
        });

        it('should handle multi-level jump from quest XP', () => {
            // Give enough XP to jump to level 3 (needs 900)
            const result = updater.addXP(mockCharacter, 900, 'quest');

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(3);
            expect(result.character.level).toBe(3);
        });

        it('should include detailed level-up information', () => {
            const result = updater.addXP(mockCharacter, 300, 'exploration');

            expect(result.levelUpDetails).toBeDefined();
            expect(result.levelUpDetails!.length).toBeGreaterThan(0);

            const detail = result.levelUpDetails![0];
            expect(detail.fromLevel).toBe(1);
            expect(detail.toLevel).toBe(2);
            expect(detail.hpIncrease).toBeGreaterThan(0);
            expect(detail.newMaxHP).toBeGreaterThan(10);
        });

        it('should handle multiple level-ups with detailed breakdowns', () => {
            // Give enough XP to jump multiple levels
            const result = updater.addXP(mockCharacter, 6500, 'custom'); // Should reach level 5

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(5);
            expect(result.levelUpDetails).toBeDefined();
            expect(result.levelUpDetails!.length).toBe(4); // Levels 2, 3, 4, 5

            // Check each level-up detail
            result.levelUpDetails!.forEach((detail, index) => {
                expect(detail.fromLevel).toBe(index + 1);
                expect(detail.toLevel).toBe(index + 2);
                expect(detail.hpIncrease).toBeGreaterThan(0);
            });
        });

        it('should not level up if insufficient XP', () => {
            const result = updater.addXP(mockCharacter, 100, 'custom');

            expect(result.leveledUp).toBe(false);
            expect(result.newLevel).toBeUndefined();
            expect(result.character.level).toBe(1);
        });

        it('should respect gameMode for uncapped characters', () => {
            const uncappedCharacter = { ...mockCharacter, gameMode: 'uncapped' as const };

            // Add enough XP to exceed level 20
            // Level 21 requires 565,000 XP (355,000 for level 20 + 20*21*500 = 210,000 more)
            const result = updater.addXP(uncappedCharacter, 600000, 'custom');

            expect(result.leveledUp).toBe(true);
            expect(result.character.level).toBeGreaterThan(20);
        });

        it('should cap level at 20 for standard mode', () => {
            // Add massive XP
            const result = updater.addXP(mockCharacter, 1000000, 'custom');

            expect(result.character.level).toBe(20); // Max level
            expect(result.character.xp.next_level).toBe(0); // No next level
        });
    });
});
