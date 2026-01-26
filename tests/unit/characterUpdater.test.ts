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

        it('should award mastery bonus', () => {
            // Previous count 9, current will be 10 -> Mastery!
            const result = updater.updateCharacterFromSession(mockCharacter, mockSession, mockTrack, MASTERY_THRESHOLD - 1);

            expect(result.masteredTrack).toBe(true);
            expect(result.masteryBonusXP).toBe(MASTERY_BONUS_XP);
            // XP earned should include session XP + mastery bonus
            expect(result.xpEarned).toBeGreaterThan(mockSession.duration_seconds + MASTERY_BONUS_XP);
        });

        it('should NOT award mastery bonus if not crossing threshold', () => {
            // Previous count 5, current 6
            const result = updater.updateCharacterFromSession(mockCharacter, mockSession, mockTrack, 5);

            expect(result.masteredTrack).toBe(false);
            expect(result.masteryBonusXP).toBe(0);
        });

        it('should NOT award mastery bonus if already mastered', () => {
            // Previous count 10, current 11
            const result = updater.updateCharacterFromSession(mockCharacter, mockSession, mockTrack, MASTERY_THRESHOLD);

            expect(result.masteredTrack).toBe(false);
            expect(result.masteryBonusXP).toBe(0);
        });
    });

    describe('addXP', () => {
        it('should automatically increase stats when leveling up (default behavior)', () => {
            // Level 1 Fighter with 10 STR -> Level 4 (stat increase level)
            // With dnD5e_smart strategy, should auto-boost STR (Fighter's primary stat)
            const result = updater.addXP(mockCharacter, 6500, 'quest'); // Enough to reach level 5

            expect(result.leveledUp).toBe(true);
            expect(result.newLevel).toBe(5);

            // Check that stats actually increased at level 4
            const level4Detail = result.levelUpDetails!.find(d => d.toLevel === 4);
            expect(level4Detail).toBeDefined();
            expect(level4Detail!.statIncreases).toBeDefined();
            expect(level4Detail!.statIncreases!.length).toBeGreaterThan(0);
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
