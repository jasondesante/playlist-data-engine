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
});
