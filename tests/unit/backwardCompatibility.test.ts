/**
 * Backward Compatibility Tests
 *
 * Tests to ensure that old character data (from before Phase 11)
 * can still be loaded and used correctly with the new system.
 *
 * Phase 10.3: Ensure old characters load correctly
 */

import { describe, it, expect } from 'vitest';
import type { CharacterSheet, AbilityScores } from '../../src/core/types/Character';
import { CharacterUpdater } from '../../src/core/progression/CharacterUpdater';
import { FeatureEffectApplier } from '../../src/core/features/FeatureEffectApplier';

describe('Backward Compatibility', () => {
    /**
     * Represents an old character sheet format from before Phase 11
     * Missing the new `feature_effects` field that was added
     */
    const createOldFormatCharacter = (): CharacterSheet => {
        const baseScores: AbilityScores = {
            STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10
        };

        return {
            name: 'Old Format Character',
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
            racial_traits: ['Human Versatility'],
            class_features: ['Fighting Style', 'Second Wind'],
            xp: { current: 0, next_level: 300 },
            seed: 'test-seed',
            generated_at: new Date().toISOString(),
            // Note: NO feature_effects field - this is the old format
        };
    };

    describe('Old Character Format Loading', () => {
        it('should accept old format character without feature_effects', () => {
            // This should not throw any TypeScript or runtime errors
            const oldCharacter = createOldFormatCharacter();

            // Verify the character was created successfully
            expect(oldCharacter.name).toBe('Old Format Character');
            expect(oldCharacter.level).toBe(1);
            expect(oldCharacter.class).toBe('Fighter');

            // Verify feature_effects is undefined (old format)
            expect(oldCharacter.feature_effects).toBeUndefined();
        });

        it('should handle old format character in CharacterUpdater', () => {
            const oldCharacter = createOldFormatCharacter();
            const updater = new CharacterUpdater();

            // Create a mock session
            const mockSession = {
                track_uuid: 'track-123',
                start_time: Date.now() - 180000,
                end_time: Date.now(),
                duration_seconds: 180,
                base_xp_earned: 180,
                bonus_xp: 0,
                total_xp_earned: 180,
            };

            const mockTrack = {
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

            // Should not throw when updating old format character
            const result = updater.updateCharacterFromSession(oldCharacter, mockSession, mockTrack);

            expect(result).toBeDefined();
            expect(result.xpEarned).toBeGreaterThan(0);
            // feature_effects should still be undefined after update
            // because no new features were added
            expect(result.character.feature_effects).toBeUndefined();
        });

        it('should initialize feature_effects when applying effects to old character', () => {
            const oldCharacter = createOldFormatCharacter();

            // Create a mock feature with effects
            // Note: Standard ability bonuses (STR, DEX, etc.) are applied directly and NOT stored in feature_effects
            // Custom stat bonuses ARE stored in feature_effects
            const mockFeature = {
                id: 'test_feature',
                name: 'Test Feature',
                description: 'A test feature',
                type: 'passive' as const,
                class: 'Fighter' as const,
                level: 1,
                source: 'default' as const,
                effects: [
                    {
                        type: 'stat_bonus' as const,
                        target: 'melee_damage',  // Custom stat, stored in feature_effects
                        value: 2,
                    },
                    {
                        type: 'ability_unlock' as const,
                        target: 'darkvision',
                        value: 60,  // 60 feet
                    }
                ]
            };

            // Apply effects to old character
            const result = FeatureEffectApplier.applyFeatureEffects(oldCharacter, mockFeature);

            expect(result.applied).toBe(true);
            expect(result.count).toBe(2);
            // feature_effects should now be initialized with custom effects
            expect(oldCharacter.feature_effects).toBeDefined();
            expect(oldCharacter.feature_effects?.length).toBe(2);
        });
    });

    describe('Old Format Character with Ammunition', () => {
        it('should handle old ammunition format gracefully', () => {
            const oldCharacter = createOldFormatCharacter();

            // Add old format ammunition
            oldCharacter.equipment = {
                weapons: [],
                armor: [],
                items: [
                    { name: 'Arrows (20)', quantity: 1, equipped: false },
                    { name: 'Sword', quantity: 1, equipped: true },
                ],
                totalWeight: 0,
                equippedWeight: 0,
            };

            // Character should still load without errors
            expect(oldCharacter.equipment).toBeDefined();
            expect(oldCharacter.equipment.items).toHaveLength(2);

            // Old format ammunition should be present
            const oldAmmo = oldCharacter.equipment.items.find(item => item.name === 'Arrows (20)');
            expect(oldAmmo).toBeDefined();
            expect(oldAmmo?.quantity).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle old character with all optional fields missing', () => {
            const minimalCharacter: CharacterSheet = {
                name: 'Minimal Character',
                race: 'Human',
                class: 'Wizard',
                level: 1,
                ability_scores: { STR: 8, DEX: 14, CON: 12, INT: 16, WIS: 12, CHA: 10 },
                ability_modifiers: { STR: -1, DEX: 2, CON: 1, INT: 3, WIS: 1, CHA: 0 },
                proficiency_bonus: 2,
                hp: { current: 8, max: 8, temp: 0 },
                armor_class: 10,
                initiative: 2,
                speed: 30,
                skills: {
                    athletics: 'none', acrobatics: 'none', sleight_of_hand: 'none', stealth: 'none',
                    arcana: 'none', history: 'none', investigation: 'none', nature: 'none', religion: 'none',
                    animal_handling: 'none', insight: 'none', medicine: 'none', perception: 'none', survival: 'none',
                    deception: 'none', intimidation: 'none', performance: 'none', persuasion: 'none'
                },
                saving_throws: { STR: false, DEX: false, CON: false, INT: true, WIS: false, CHA: false },
                racial_traits: [],
                class_features: [],
                xp: { current: 0, next_level: 300 },
                seed: 'minimal-seed',
                generated_at: new Date().toISOString(),
                // No optional fields
            };

            // Should load without errors
            expect(minimalCharacter.name).toBe('Minimal Character');
            expect(minimalCharacter.feature_effects).toBeUndefined();
            expect(minimalCharacter.equipment).toBeUndefined();
            expect(minimalCharacter.appearance).toBeUndefined();
            expect(minimalCharacter.spells).toBeUndefined();
            expect(minimalCharacter.gameMode).toBeUndefined();
            expect(minimalCharacter.pendingStatIncreases).toBeUndefined();
        });

        it('should handle mixed old/new format characters', () => {
            const newFormatCharacter = createOldFormatCharacter();
            // Add new field to simulate partially migrated character
            newFormatCharacter.feature_effects = [
                {
                    type: 'stat_bonus',
                    target: 'speed',
                    value: 5,
                    condition: 'while raging'
                }
            ];

            expect(newFormatCharacter.feature_effects).toBeDefined();
            expect(newFormatCharacter.feature_effects?.length).toBe(1);
        });
    });

    describe('TypeScript Type Compatibility', () => {
        it('should satisfy CharacterSheet type without feature_effects', () => {
            const oldCharacter: CharacterSheet = createOldFormatCharacter();

            // This is a type check - if it compiles, the test passes
            expect(oldCharacter).toBeDefined();
            expect(oldCharacter.feature_effects).toBeUndefined();

            // Should be able to access all required fields
            expect(oldCharacter.name).toBeDefined();
            expect(oldCharacter.race).toBeDefined();
            expect(oldCharacter.class).toBeDefined();
            expect(oldCharacter.level).toBeDefined();
        });
    });
});
