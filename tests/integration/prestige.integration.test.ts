/**
 * Prestige System Integration Tests
 * Tests the full prestige flow: track mastery → prestige → character reset → equipment preservation
 *
 * Phase 6 of the Prestige System Plan
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { SessionTracker } from '../../src/core/progression/SessionTracker';
import { CharacterUpdater } from '../../src/core/progression/CharacterUpdater';
import { PrestigeSystem } from '../../src/core/progression/PrestigeSystem';
import { sampleAudioProfile, sampleTrack } from '../fixtures/sampleData';
import type { CharacterSheet } from '../../src/core/types/Character';
import type { PlaylistTrack } from '../../src/core/types/Playlist';
import type { PrestigeLevel } from '../../src/core/types/Prestige';

// Helper to create a mock track with a specific UUID
function createMockTrack(uuid: string, title: string = 'Test Track'): PlaylistTrack {
    return {
        ...sampleTrack,
        uuid,
        id: uuid,
        title
    };
}

// Helper to create a character with equipment
function createCharacterWithEquipment(seed: string): CharacterSheet {
    const track = createMockTrack(`${seed}-track`);
    const character = CharacterGenerator.generate(seed, sampleAudioProfile, track);

    // Add some equipment
    character.equipment = {
        weapons: [{ name: 'Test Sword', damage: '1d8', type: 'melee', weight: 3 }],
        armor: [{ name: 'Leather Armor', type: 'light', ac: 11, weight: 10 }],
        items: [{ name: 'Health Potion', type: 'consumable', weight: 0.5 }],
        totalWeight: 13.5,
        equippedWeight: 13
    };

    return character;
}

// Helper to simulate listening sessions and return total XP earned
function simulateListeningSessions(
    sessionTracker: SessionTracker,
    trackUuid: string,
    track: PlaylistTrack,
    sessionCount: number,
    xpPerSession: number = 100
): number {
    let totalXP = 0;

    for (let i = 0; i < sessionCount; i++) {
        const sessionId = sessionTracker.startSession(trackUuid, track);
        const session = sessionTracker.endSession(sessionId, xpPerSession / 1); // Duration in seconds
        if (session) {
            totalXP += session.total_xp_earned;
        }
    }

    return totalXP;
}

describe('Prestige System Integration Tests', () => {
    let sessionTracker: SessionTracker;
    let characterUpdater: CharacterUpdater;

    beforeEach(() => {
        sessionTracker = new SessionTracker();
        characterUpdater = new CharacterUpdater();
        PrestigeSystem.clearCustomThresholds();
    });

    afterEach(() => {
        PrestigeSystem.clearCustomThresholds();
    });

    // =========================================================================
    // INTEGRATION TEST 1: Full Prestige Flow
    // =========================================================================

    describe('Full Prestige Flow', () => {
        it('should complete full prestige flow: master track → prestige → verify reset', () => {
            // 1. Create character with equipment
            const seed = 'prestige-test-1';
            const track = createMockTrack('track-uuid-1', 'Epic Battle Theme');
            let character = createCharacterWithEquipment(seed);

            // Store original equipment for comparison
            const originalEquipment = character.equipment ? {
                weapons: [...character.equipment.weapons],
                armor: [...character.equipment.armor],
                items: [...character.equipment.items],
                totalWeight: character.equipment.totalWeight,
                equippedWeight: character.equipment.equippedWeight,
            } : null;

            // Verify initial state
            expect(character.prestige_level).toBeUndefined();
            expect(character.level).toBe(1);

            // 2. Simulate enough sessions to master (10 plays + 1000 XP)
            // Each session gives ~100 XP base, so we need 10 sessions
            const trackUuid = track.uuid;
            for (let i = 0; i < 10; i++) {
                const sessionId = sessionTracker.startSession(trackUuid, track);
                sessionTracker.endSession(sessionId, 100); // 100 seconds = ~100 XP
            }

            // 3. Verify track is mastered
            const listenCount = sessionTracker.getTrackListenCount(trackUuid);
            const totalXP = sessionTracker.getTrackXPTotal(trackUuid);

            expect(listenCount).toBeGreaterThanOrEqual(10);
            expect(totalXP).toBeGreaterThanOrEqual(1000);
            expect(PrestigeSystem.isMastered(listenCount, totalXP, 0)).toBe(true);
            expect(PrestigeSystem.canPrestige(0, listenCount, totalXP)).toBe(true);

            // 4. Execute prestige
            const result = characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                trackUuid,
                sampleAudioProfile,
                track
            );

            // 5. Verify prestige result
            expect(result.success).toBe(true);
            expect(result.newPrestigeLevel).toBe(1);
            expect(result.previousPrestigeLevel).toBe(0);
            expect(result.message).toContain('I');

            // 6. Get the regenerated character from result
            const regeneratedCharacter = (result as any).character as CharacterSheet;
            expect(regeneratedCharacter).toBeDefined();

            // 7. Verify character was reset to level 1
            expect(regeneratedCharacter.level).toBe(1);
            expect(regeneratedCharacter.xp.current).toBe(0);
            expect(regeneratedCharacter.prestige_level).toBe(1);

            // 8. Verify equipment was preserved
            expect(regeneratedCharacter.equipment).toEqual(originalEquipment);

            // 9. Verify track sessions were cleared
            const newListenCount = sessionTracker.getTrackListenCount(trackUuid);
            const newTotalXP = sessionTracker.getTrackXPTotal(trackUuid);
            expect(newListenCount).toBe(0);
            expect(newTotalXP).toBe(0);

            // 10. Verify new thresholds are higher
            const newPlaysThreshold = PrestigeSystem.getPlaysThreshold(1);
            const newXpThreshold = PrestigeSystem.getXPThreshold(1);
            expect(newPlaysThreshold).toBeGreaterThan(10);
            expect(newXpThreshold).toBeGreaterThan(1000);
        });

        it('should handle multiple prestige levels', () => {
            const seed = 'multi-prestige-test';
            const track = createMockTrack('track-uuid-multi', 'Progressive Track');
            let character = createCharacterWithEquipment(seed);

            // Simulate prestige from 0 to 3
            for (let prestigeLevel = 0; prestigeLevel < 3; prestigeLevel++) {
                const trackUuid = track.uuid;
                const playsThreshold = PrestigeSystem.getPlaysThreshold(prestigeLevel as PrestigeLevel);
                const xpThreshold = PrestigeSystem.getXPThreshold(prestigeLevel as PrestigeLevel);

                // Clear any previous sessions for this track
                sessionTracker.clearTrackSessions(trackUuid);

                // Simulate enough sessions
                const sessionsNeeded = Math.ceil(playsThreshold);
                for (let i = 0; i < sessionsNeeded; i++) {
                    const sessionId = sessionTracker.startSession(trackUuid, track);
                    // Each session: enough seconds to meet XP threshold
                    const secondsPerSession = Math.ceil(xpThreshold / sessionsNeeded);
                    sessionTracker.endSession(sessionId, secondsPerSession);
                }

                // Verify can prestige
                const listenCount = sessionTracker.getTrackListenCount(trackUuid);
                const totalXP = sessionTracker.getTrackXPTotal(trackUuid);
                expect(PrestigeSystem.canPrestige(prestigeLevel as PrestigeLevel, listenCount, totalXP)).toBe(true);

                // Execute prestige
                const result = characterUpdater.resetCharacterForPrestige(
                    character,
                    sessionTracker,
                    trackUuid,
                    sampleAudioProfile,
                    track
                );

                expect(result.success).toBe(true);
                expect(result.newPrestigeLevel).toBe(prestigeLevel + 1);

                // Update character for next iteration
                character = (result as any).character;
                expect(character.prestige_level).toBe(prestigeLevel + 1);
            }

            // Final verification: character should be prestige level 3
            expect(character.prestige_level).toBe(3);
        });
    });

    // =========================================================================
    // INTEGRATION TEST 2: Listen Count Reset Verification
    // =========================================================================

    describe('Listen Count Reset After Prestige', () => {
        it('should reset listen count to 0 after prestige', () => {
            const track = createMockTrack('listen-reset-track', 'Reset Test');
            const trackUuid = track.uuid;
            const seed = 'listen-reset-test';
            const character = createCharacterWithEquipment(seed);

            // Simulate 15 listening sessions
            for (let i = 0; i < 15; i++) {
                const sessionId = sessionTracker.startSession(trackUuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            // Verify listen count before prestige
            const listenCountBefore = sessionTracker.getTrackListenCount(trackUuid);
            expect(listenCountBefore).toBe(15);

            // Execute prestige
            characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                trackUuid,
                sampleAudioProfile,
                track
            );

            // Verify listen count after prestige
            const listenCountAfter = sessionTracker.getTrackListenCount(trackUuid);
            expect(listenCountAfter).toBe(0);
        });

        it('should only clear sessions for the prestiged track', () => {
            const track1 = createMockTrack('track-1', 'Track One');
            const track2 = createMockTrack('track-2', 'Track Two');
            const seed = 'selective-clear-test';
            const character = createCharacterWithEquipment(seed);

            // Add sessions to both tracks
            for (let i = 0; i < 10; i++) {
                const s1 = sessionTracker.startSession(track1.uuid, track1);
                const s2 = sessionTracker.startSession(track2.uuid, track2);
                sessionTracker.endSession(s1, 100);
                sessionTracker.endSession(s2, 100);
            }

            // Verify both have sessions
            expect(sessionTracker.getTrackListenCount(track1.uuid)).toBe(10);
            expect(sessionTracker.getTrackListenCount(track2.uuid)).toBe(10);

            // Prestige track 1 only
            characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                track1.uuid,
                sampleAudioProfile,
                track1
            );

            // Verify track 1 is cleared, track 2 is not
            expect(sessionTracker.getTrackListenCount(track1.uuid)).toBe(0);
            expect(sessionTracker.getTrackListenCount(track2.uuid)).toBe(10);
        });
    });

    // =========================================================================
    // INTEGRATION TEST 3: XP Reset Verification
    // =========================================================================

    describe('XP Reset After Prestige', () => {
        it('should reset track XP to 0 after prestige', () => {
            const track = createMockTrack('xp-reset-track', 'XP Reset Test');
            const trackUuid = track.uuid;
            const seed = 'xp-reset-test';
            const character = createCharacterWithEquipment(seed);

            // Simulate sessions with varying XP
            for (let i = 0; i < 12; i++) {
                const sessionId = sessionTracker.startSession(trackUuid, track);
                sessionTracker.endSession(sessionId, 120); // 120 seconds per session
            }

            // Verify XP before prestige
            const xpBefore = sessionTracker.getTrackXPTotal(trackUuid);
            expect(xpBefore).toBeGreaterThan(1000);

            // Execute prestige
            characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                trackUuid,
                sampleAudioProfile,
                track
            );

            // Verify XP after prestige
            const xpAfter = sessionTracker.getTrackXPTotal(trackUuid);
            expect(xpAfter).toBe(0);
        });

        it('should correctly sum XP from multiple sessions', () => {
            const track = createMockTrack('xp-sum-track', 'XP Sum Test');
            const trackUuid = track.uuid;

            // Create sessions with different durations
            const durations = [50, 100, 150, 200, 250];
            for (const duration of durations) {
                const sessionId = sessionTracker.startSession(trackUuid, track);
                sessionTracker.endSession(sessionId, duration);
            }

            const totalXP = sessionTracker.getTrackXPTotal(trackUuid);
            const listenCount = sessionTracker.getTrackListenCount(trackUuid);

            expect(listenCount).toBe(5);
            expect(totalXP).toBeGreaterThan(0);
            // Total duration = 750 seconds, at ~1 XP per second base
            expect(totalXP).toBeGreaterThanOrEqual(700);
        });
    });

    // =========================================================================
    // INTEGRATION TEST 4: Equipment Preservation
    // =========================================================================

    describe('Equipment Preservation After Prestige', () => {
        it('should preserve all equipment slots after prestige', () => {
            const seed = 'equipment-preserve-test';
            const track = createMockTrack('equipment-track', 'Equipment Test');
            const character = createCharacterWithEquipment(seed);

            const originalEquipment = {
                weapons: [...character.equipment!.weapons],
                armor: [...character.equipment!.armor],
                items: [...character.equipment!.items],
                totalWeight: character.equipment!.totalWeight,
                equippedWeight: character.equipment!.equippedWeight,
            };

            // Master and prestige
            for (let i = 0; i < 10; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            const result = characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            const newCharacter = (result as any).character;

            // Verify equipment is exactly preserved
            expect(newCharacter.equipment).toEqual(originalEquipment);
        });

        it('should handle character without equipment gracefully', () => {
            const seed = 'no-equipment-test';
            const track = createMockTrack('no-eq-track', 'No Equipment Test');
            const character = CharacterGenerator.generate(seed, sampleAudioProfile, track);

            // Store the original equipment to verify it's preserved
            const originalEquipment = character.equipment ? {
                weapons: [...character.equipment.weapons],
                armor: [...character.equipment.armor],
                items: [...character.equipment.items],
            } : null;

            // Remove equipment to simulate a character without equipment
            delete character.equipment;

            // Master and prestige
            for (let i = 0; i < 10; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            const result = characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            expect(result.success).toBe(true);
            const newCharacter = (result as any).character;
            // When the original character had no equipment, the regenerated character
            // gets its own default equipment from CharacterGenerator (which is expected)
            // The key point is the prestige operation succeeds without error
            expect(newCharacter).toBeDefined();
            expect(newCharacter.prestige_level).toBe(1);
        });
    });

    // =========================================================================
    // INTEGRATION TEST 5: Dual Requirement Edge Cases
    // =========================================================================

    describe('Dual Requirements (Plays AND XP)', () => {
        it('should not allow prestige with enough plays but insufficient XP', () => {
            const track = createMockTrack('plays-only-track', 'Plays Only');
            const seed = 'plays-only-test';
            const character = createCharacterWithEquipment(seed);

            // Create 15 sessions but with very short duration (low XP)
            for (let i = 0; i < 15; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 1); // Only 1 second each
            }

            const listenCount = sessionTracker.getTrackListenCount(track.uuid);
            const totalXP = sessionTracker.getTrackXPTotal(track.uuid);

            // Has enough plays (15 >= 10) but not enough XP
            expect(listenCount).toBeGreaterThanOrEqual(10);
            expect(totalXP).toBeLessThan(1000);
            expect(PrestigeSystem.isMastered(listenCount, totalXP, 0)).toBe(false);

            // Attempt prestige should fail
            const result = characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('XP');
        });

        it('should not allow prestige with enough XP but insufficient plays', () => {
            const track = createMockTrack('xp-only-track', 'XP Only');
            const seed = 'xp-only-test';
            const character = createCharacterWithEquipment(seed);

            // Create 5 sessions with long duration (high XP)
            for (let i = 0; i < 5; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 500); // 500 seconds each = lots of XP
            }

            const listenCount = sessionTracker.getTrackListenCount(track.uuid);
            const totalXP = sessionTracker.getTrackXPTotal(track.uuid);

            // Has enough XP (2500 >= 1000) but not enough plays
            expect(totalXP).toBeGreaterThanOrEqual(1000);
            expect(listenCount).toBeLessThan(10);
            expect(PrestigeSystem.isMastered(listenCount, totalXP, 0)).toBe(false);

            // Attempt prestige should fail
            const result = characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('plays');
        });

        it('should prevent cheesing via play/pause spam', () => {
            const track = createMockTrack('cheese-track', 'Cheese Prevention');
            const seed = 'cheese-test';
            const character = createCharacterWithEquipment(seed);

            // Simulate "cheesing": 100 quick play/pause cycles (1 second each)
            for (let i = 0; i < 100; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 1); // Minimal duration
            }

            const listenCount = sessionTracker.getTrackListenCount(track.uuid);
            const totalXP = sessionTracker.getTrackXPTotal(track.uuid);

            // Even with 100 plays, XP is too low for mastery
            expect(listenCount).toBe(100);
            expect(totalXP).toBeLessThan(1000);
            expect(PrestigeSystem.isMastered(listenCount, totalXP, 0)).toBe(false);
        });
    });

    // =========================================================================
    // INTEGRATION TEST 6: Max Prestige Level
    // =========================================================================

    describe('Max Prestige Level', () => {
        it('should not allow prestige beyond level 10', () => {
            const track = createMockTrack('max-prestige-track', 'Max Prestige');
            const seed = 'max-prestige-test';
            let character = createCharacterWithEquipment(seed);
            character.prestige_level = 10; // Already at max

            // Add sessions
            for (let i = 0; i < 100; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 1000);
            }

            const listenCount = sessionTracker.getTrackListenCount(track.uuid);
            const totalXP = sessionTracker.getTrackXPTotal(track.uuid);

            // Even with maxed stats, can't prestige
            expect(PrestigeSystem.canPrestige(10, listenCount, totalXP)).toBe(false);

            const result = characterUpdater.resetCharacterForPrestige(
                character,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('maximum');
        });
    });

    // =========================================================================
    // INTEGRATION TEST 7: CharacterUpdater Methods
    // =========================================================================

    describe('CharacterUpdater Prestige Methods', () => {
        it('should correctly check if character can prestige via canPrestige()', () => {
            const track = createMockTrack('can-prestige-track', 'Can Prestige Test');
            const seed = 'can-prestige-test';
            const character = createCharacterWithEquipment(seed);

            // Initially can't prestige
            expect(characterUpdater.canPrestige(character, sessionTracker, track.uuid)).toBe(false);

            // Add enough sessions
            for (let i = 0; i < 10; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            // Now can prestige
            expect(characterUpdater.canPrestige(character, sessionTracker, track.uuid)).toBe(true);
        });

        it('should return correct prestige info via getPrestigeInfo()', () => {
            const track = createMockTrack('info-track', 'Info Test');
            const seed = 'info-test';
            const character = createCharacterWithEquipment(seed);

            // Add sessions
            for (let i = 0; i < 5; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            const info = characterUpdater.getPrestigeInfo(character, sessionTracker, track.uuid);

            expect(info.prestigeLevel).toBe(0);
            expect(info.currentPlays).toBe(5);
            expect(info.currentXP).toBeGreaterThan(0);
            expect(info.playsThreshold).toBe(10);
            expect(info.xpThreshold).toBe(1000);
            expect(info.isMastered).toBe(false);
            expect(info.canPrestige).toBe(false);
            expect(info.isMaxPrestige).toBe(false);
        });
    });

    // =========================================================================
    // INTEGRATION TEST 8: Character Regeneration Consistency
    // =========================================================================

    describe('Character Regeneration Consistency', () => {
        it('should regenerate the same character class and race from seed', () => {
            const seed = 'regen-consistency-test';
            const track = createMockTrack('regen-track', 'Regen Test');
            const originalCharacter = CharacterGenerator.generate(seed, sampleAudioProfile, track);

            // Get original class and race
            const originalClass = originalCharacter.class;
            const originalRace = originalCharacter.race;

            // Master and prestige
            for (let i = 0; i < 10; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            const result = characterUpdater.resetCharacterForPrestige(
                originalCharacter,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            const regeneratedCharacter = (result as any).character;

            // Class and race should be the same (deterministic from seed)
            expect(regeneratedCharacter.class).toBe(originalClass);
            expect(regeneratedCharacter.race).toBe(originalRace);
            expect(regeneratedCharacter.seed).toBe(seed);
        });

        it('should preserve character name after prestige', () => {
            const seed = 'name-preserve-test';
            const track = createMockTrack('name-track', 'Name Test');
            const originalCharacter = CharacterGenerator.generate(seed, sampleAudioProfile, track);
            const originalName = originalCharacter.name;

            // Master and prestige
            for (let i = 0; i < 10; i++) {
                const sessionId = sessionTracker.startSession(track.uuid, track);
                sessionTracker.endSession(sessionId, 100);
            }

            const result = characterUpdater.resetCharacterForPrestige(
                originalCharacter,
                sessionTracker,
                track.uuid,
                sampleAudioProfile,
                track
            );

            const regeneratedCharacter = (result as any).character;

            // Name should be preserved
            expect(regeneratedCharacter.name).toBe(originalName);
        });
    });
});
