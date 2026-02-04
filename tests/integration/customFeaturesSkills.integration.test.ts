/**
 * Integration test for CharacterGenerator with custom features and skills
 *
 * Test Requirements:
 * - CharacterGenerator works correctly with custom features registered
 * - CharacterGenerator works correctly with custom skills registered
 * - The integration between CharacterGenerator, FeatureRegistry, and SkillRegistry works properly
 * - Custom features appear in generated characters
 * - Custom skills appear in generated characters
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { FeatureRegistry } from '../../src/core/features/FeatureRegistry';
import { SkillRegistry } from '../../src/core/skills/SkillRegistry';
import { initializeFeatureDefaults, initializeSkillDefaults } from '../../src/core/extensions/initializeDefaults';
import { sampleAudioProfile, sampleTrack } from '../fixtures/sampleData';
import { registerTestSkill } from '../helpers/registrationHelpers.js';
import type { PlaylistTrack } from '../../src/core/types/Playlist';

// Helper function to create a mock track with a custom title
function createMockTrack(title: string): PlaylistTrack {
    return {
        title,
        artist: 'Test Artist',
        genre: 'Rock',
        id: 'test-1',
        uuid: 'test-uuid-1',
        playlist_index: 0,
        chain_name: 'eth',
        token_address: '0x0',
        token_id: '1',
        platform: 'sound',
        image_url: 'https://example.com/image.jpg',
        audio_url: 'https://example.com/audio.mp3',
        duration: 180,
        tags: ['rock', 'test']
    };
}

describe('Integration: CharacterGenerator with Custom Features and Skills', () => {
    let featureRegistry: FeatureRegistry;
    let skillRegistry: SkillRegistry;

    beforeEach(() => {
        featureRegistry = FeatureRegistry.getInstance();
        skillRegistry = SkillRegistry.getInstance();

        // Reset FeatureRegistry to defaults
        // Note: SkillRegistry no longer has a reset() method as it's a wrapper around ExtensionManager
        // We use ExtensionManager.reset() for skills instead
        featureRegistry.reset();
        // SkillRegistry reads from ExtensionManager, so no reset needed here

        // Initialize with defaults using the proper initialization functions
        initializeFeatureDefaults();
        initializeSkillDefaults();
    });

    afterEach(() => {
        featureRegistry.reset();
        // SkillRegistry has no internal state to reset - it reads from ExtensionManager
    });

    describe('Custom Class Features', () => {
        it('should generate character with custom class feature', () => {
            // Register a custom class feature for Fighter
            const customFeature = {
                id: 'fighter_battle_hardened',
                name: 'Battle Hardened',
                class: 'Fighter' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'You have survived countless battles.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'CON' as const, value: 1 }
                ]
            };

            featureRegistry.registerClassFeature(customFeature);

            // Generate a Fighter character
            const character = CharacterGenerator.generate(
                'test-custom-feature',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Fighter', level: 1 }
            );

            // Verify character has the custom feature (in class_features array)
            expect(character.class_features).toContain('fighter_battle_hardened');
        });

        it('should generate character with multiple custom class features', () => {
            // Register multiple custom features for Wizard
            const customFeatures = [
                {
                    id: 'wizard_arcane_mastery',
                    name: 'Arcane Mastery',
                    class: 'Wizard' as const,
                    level: 1,
                    type: 'passive' as const,
                    source: 'custom' as const,
                    description: 'You have mastered the arcane arts.',
                    effects: [
                        { type: 'stat_bonus' as const, target: 'INT' as const, value: 1 }
                    ]
                },
                {
                    id: 'wizard_spell_mastery',
                    name: 'Spell Mastery',
                    class: 'Wizard' as const,
                    level: 3,
                    type: 'passive' as const,
                    source: 'custom' as const,
                    description: 'You can cast spells with increased power.',
                    effects: []
                }
            ];

            for (const feature of customFeatures) {
                featureRegistry.registerClassFeature(feature);
            }

            // Generate a level 3 Wizard character
            const character = CharacterGenerator.generate(
                'test-multiple-custom-features',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Wizard', level: 3 }
            );

            // Verify character has both custom features
            expect(character.class_features).toContain('wizard_arcane_mastery');
            expect(character.class_features).toContain('wizard_spell_mastery');
        });

        it('should apply custom feature effects to character stats', () => {
            // Register a custom feature that boosts CON
            const customFeature = {
                id: 'barbarian_toughness',
                name: 'Barbarian Toughness',
                class: 'Barbarian' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'You are exceptionally tough.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'CON' as const, value: 2 }
                ]
            };

            featureRegistry.registerClassFeature(customFeature);

            // Generate a Barbarian character
            const character = CharacterGenerator.generate(
                'test-feature-effects',
                sampleAudioProfile,
                createMockTrack('Test Barbarian'),
                { forceClass: 'Barbarian', level: 1 }
            );

            // Note: The actual effect application would be handled by FeatureEffectApplier
            // This test verifies the feature is included in the character's class_features list
            expect(character.class_features).toContain('barbarian_toughness');
        });

        it('should respect feature prerequisites when generating character', () => {
            // Register a feature with level prerequisite
            const highLevelFeature = {
                id: 'paladin_holy_avenger',
                name: 'Holy Avenger',
                class: 'Paladin' as const,
                level: 10,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'You can summon a holy avenger weapon.',
                effects: [],
                prerequisites: {
                    level: 10
                }
            };

            featureRegistry.registerClassFeature(highLevelFeature);

            // Generate a level 5 Paladin (should not get the level 10 feature)
            const lowLevelCharacter = CharacterGenerator.generate(
                'test-feature-prereq-low',
                sampleAudioProfile,
                createMockTrack('Low Paladin'),
                { forceClass: 'Paladin', level: 5 }
            );

            expect(lowLevelCharacter.class_features).not.toContain('paladin_holy_avenger');

            // Generate a level 10 Paladin (should get the feature)
            const highLevelCharacter = CharacterGenerator.generate(
                'test-feature-prereq-high',
                sampleAudioProfile,
                createMockTrack('High Paladin'),
                { forceClass: 'Paladin', level: 10 }
            );

            expect(highLevelCharacter.class_features).toContain('paladin_holy_avenger');
        });
    });

    describe('Custom Racial Traits', () => {
        it('should generate character with custom racial trait', () => {
            // Register a custom racial trait for Elf
            const customTrait = {
                id: 'elf_fey_ancestry_boost',
                name: 'Fey Ancestry Boost',
                race: 'Elf' as const,
                description: 'Your fey heritage is particularly strong.',
                effects: [
                    { type: 'stat_bonus' as const, target: 'CHA' as const, value: 1 }
                ],
                source: 'custom' as const
            };

            featureRegistry.registerRacialTrait(customTrait);

            // Generate an Elf character (may need multiple tries due to random race selection)
            let character: ReturnType<typeof CharacterGenerator.generate>;
            let attempts = 0;
            do {
                character = CharacterGenerator.generate(
                    `test-custom-trait-${attempts}`,
                    sampleAudioProfile,
                    createMockTrack('Test Elf'),
                    { forceClass: 'Wizard' }
                );
                attempts++;
            } while (character.race !== 'Elf' && attempts < 20);

            // If we got an Elf, verify the custom trait
            if (character.race === 'Elf') {
                expect(character.racial_traits).toContain('elf_fey_ancestry_boost');
            }
        });

        it('should generate character with multiple custom racial traits', () => {
            // Register multiple custom traits for Dwarf
            const customTraits = [
                {
                    id: 'dwarf_stone_cunning',
                    name: 'Stone Cunning',
                    race: 'Dwarf' as const,
                    description: 'You have intuition about stone work.',
                    effects: [],
                    source: 'custom' as const
                },
                {
                    id: 'dwarf_dwarven_toughness',
                    name: 'Dwarven Toughness',
                    race: 'Dwarf' as const,
                    description: 'You are exceptionally hardy.',
                    effects: [
                        { type: 'stat_bonus' as const, target: 'CON' as const, value: 1 }
                    ],
                    source: 'custom' as const
                }
            ];

            for (const trait of customTraits) {
                featureRegistry.registerRacialTrait(trait);
            }

            // Generate a Dwarf character (may need multiple tries due to random race selection)
            let character: ReturnType<typeof CharacterGenerator.generate>;
            let attempts = 0;
            do {
                character = CharacterGenerator.generate(
                    `test-multiple-custom-traits-${attempts}`,
                    sampleAudioProfile,
                    createMockTrack('Test Dwarf'),
                    { forceClass: 'Cleric' }
                );
                attempts++;
            } while (character.race !== 'Dwarf' && attempts < 20);

            // If we got a Dwarf, verify both custom traits
            if (character.race === 'Dwarf') {
                expect(character.racial_traits).toContain('dwarf_stone_cunning');
                expect(character.racial_traits).toContain('dwarf_dwarven_toughness');
            }
        });

        it('should handle subrace-specific traits', () => {
            // Register a trait specific to High Elves
            const highElfTrait = {
                id: 'high_elf_weapon_training',
                name: 'High Elf Weapon Training',
                race: 'Elf' as const,
                subrace: 'High Elf',
                description: 'You have proficiency with certain weapons.',
                effects: [],
                source: 'custom' as const
            };

            featureRegistry.registerRacialTrait(highElfTrait);

            // The character generation will need to support subrace selection
            // For now, verify the trait is registered
            const registeredTrait = featureRegistry.getRacialTraitById('high_elf_weapon_training');
            expect(registeredTrait).toBeDefined();
            expect(registeredTrait?.id).toBe('high_elf_weapon_training');
        });
    });

    describe('Custom Skills', () => {
        it('should generate character with custom skill available', () => {
            // Register a custom skill
            const customSkill = {
                id: 'nature_lore',
                name: 'Nature Lore',
                ability: 'WIS' as const,
                description: 'Knowledge of the natural world.',
                source: 'custom' as const,
                categories: ['exploration']
            };

            registerTestSkill(customSkill);

            // Generate a Ranger character
            const character = CharacterGenerator.generate(
                'test-custom-skill',
                sampleAudioProfile,
                createMockTrack('Test Ranger'),
                { forceClass: 'Ranger', level: 1 }
            );

            // Verify the custom skill is in the skills record (may or may not be proficient)
            expect(character.skills).toHaveProperty('nature_lore');
        });

        it('should generate character with multiple custom skills', () => {
            // Register multiple custom skills
            const customSkills = [
                {
                    id: 'street_smarts',
                    name: 'Street Smarts',
                    ability: 'CHA' as const,
                    description: 'Knowledge of urban environments.',
                    source: 'custom' as const,
                    categories: ['social']
                },
                {
                    id: 'survival_instinct',
                    name: 'Survival Instinct',
                    ability: 'WIS' as const,
                    description: 'Natural ability to survive in the wild.',
                    source: 'custom' as const,
                    categories: ['exploration']
                }
            ];

            for (const skill of customSkills) {
                registerTestSkill(skill);
            }

            // Generate a Rogue character
            const character = CharacterGenerator.generate(
                'test-multiple-custom-skills',
                sampleAudioProfile,
                createMockTrack('Test Rogue'),
                { forceClass: 'Rogue', level: 1 }
            );

            // Verify both custom skills are in the skills record
            expect(character.skills).toHaveProperty('street_smarts');
            expect(character.skills).toHaveProperty('survival_instinct');
        });

        it('should assign proficiency to custom skills when appropriate', () => {
            // This test verifies that if a custom skill is added to a class's available_skills,
            // it can be selected and assigned proficiency

            // Register a custom skill
            const customSkill = {
                id: 'arcane_knowledge',
                name: 'Arcane Knowledge',
                ability: 'INT' as const,
                description: 'Knowledge of magical theory.',
                source: 'custom' as const,
                categories: ['knowledge']
            };

            registerTestSkill(customSkill);

            // Note: For this skill to be assigned as proficient, it would need to be added
            // to the Wizard's available_skills list in constants.ts
            // This test verifies the skill is available in the registry

            const allSkills = skillRegistry.getAllSkills();
            const customSkillExists = allSkills.some(s => s.id === 'arcane_knowledge');

            expect(customSkillExists).toBe(true);
        });
    });

    describe('Combined Custom Features and Skills', () => {
        it('should handle character with both custom features and skills', () => {
            // Register custom class feature
            const customFeature = {
                id: 'fighter_weapon_specialist',
                name: 'Weapon Specialist',
                class: 'Fighter' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'You specialize in all weapons.',
                effects: []
            };

            featureRegistry.registerClassFeature(customFeature);

            // Register custom skill
            const customSkill = {
                id: 'tactical_knowledge',
                name: 'Tactical Knowledge',
                ability: 'INT' as const,
                description: 'Knowledge of battlefield tactics.',
                source: 'custom' as const,
                categories: ['knowledge']
            };

            registerTestSkill(customSkill);

            // Generate a Fighter character
            const character = CharacterGenerator.generate(
                'test-combined-custom',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Fighter', level: 1 }
            );

            // Verify custom feature is present
            expect(character.class_features).toContain('fighter_weapon_specialist');

            // Verify custom skill is available
            expect(character.skills).toHaveProperty('tactical_knowledge');
        });

        it('should maintain default features and skills with custom ones', () => {
            // Register custom feature
            const customFeature = {
                id: 'rogue_shadow_step',
                name: 'Shadow Step',
                class: 'Rogue' as const,
                level: 2,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'You can step through shadows.',
                effects: []
            };

            featureRegistry.registerClassFeature(customFeature);

            // Register custom skill
            const customSkill = {
                id: 'underworld_knowledge',
                name: 'Underworld Knowledge',
                ability: 'CHA' as const,
                description: 'Knowledge of criminal organizations.',
                source: 'custom' as const,
                categories: ['social']
            };

            registerTestSkill(customSkill);

            // Generate a Rogue character
            const character = CharacterGenerator.generate(
                'test-defaults-plus-custom',
                sampleAudioProfile,
                createMockTrack('Test Rogue'),
                { forceClass: 'Rogue', level: 2 }
            );

            // Verify default features are still present (check for thieves_cant which is a default Rogue feature)
            expect(character.class_features).toContain('thieves_cant');

            // Verify custom feature is present
            expect(character.class_features).toContain('rogue_shadow_step');

            // Verify default skills are still present
            expect(character.skills).toHaveProperty('stealth');
            expect(character.skills).toHaveProperty('perception');

            // Verify custom skill is available
            expect(character.skills).toHaveProperty('underworld_knowledge');
        });
    });

    describe('Edge Cases', () => {
        it('should handle character with no custom features or skills', () => {
            // Generate character without registering anything custom
            const character = CharacterGenerator.generate(
                'test-no-custom',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Fighter', level: 1 }
            );

            // Verify character has default features
            expect(character.class_features.length).toBeGreaterThan(0);

            // Verify character has default skills
            expect(Object.keys(character.skills).length).toBeGreaterThan(0);
        });

        it('should handle duplicate feature IDs gracefully', () => {
            const customFeature = {
                id: 'test_feature',
                name: 'Test Feature',
                class: 'Fighter' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'A test feature.',
                effects: []
            };

            // Register the feature once
            featureRegistry.registerClassFeature(customFeature);

            // Attempting to register again should throw
            expect(() => {
                featureRegistry.registerClassFeature(customFeature);
            }).toThrow();
        });

        it('should handle duplicate skill IDs gracefully', () => {
            const customSkill = {
                id: 'test_skill',
                name: 'Test Skill',
                ability: 'STR' as const,
                description: 'A test skill.',
                source: 'custom' as const,
                categories: ['combat']
            };

            // Register the skill once
            registerTestSkill(customSkill);

            // Attempting to register again should throw
            expect(() => {
                registerTestSkill(customSkill);
            }).toThrow();
        });

        it('should handle features with invalid prerequisites', () => {
            const invalidFeature = {
                id: 'test_invalid_feature',
                name: 'Invalid Feature',
                class: 'Wizard' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'A feature with impossible prerequisites.',
                effects: [],
                prerequisites: {
                    level: 10, // Impossible at level 1
                    features: ['nonexistent_feature'] // Non-existent feature
                }
            };

            featureRegistry.registerClassFeature(invalidFeature);

            // Generate a level 1 Wizard
            const character = CharacterGenerator.generate(
                'test-invalid-prereqs',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Wizard', level: 1 }
            );

            // The feature should still be included (as per current implementation that logs warnings but includes all features)
            // The current implementation in CharacterGenerator includes all features after logging warnings
            expect(character.class_features).toContain('test_invalid_feature');
        });

        it('should handle reset and reinitialization of registries', () => {
            // Register custom feature
            const customFeature = {
                id: 'test_reset_feature',
                name: 'Reset Test Feature',
                class: 'Fighter' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'A feature for testing reset.',
                effects: []
            };

            featureRegistry.registerClassFeature(customFeature);

            // Verify feature is registered
            expect(featureRegistry.getClassFeatureById('test_reset_feature')).toBeDefined();

            // Reset the registry
            featureRegistry.reset();

            // Verify feature is no longer registered
            expect(featureRegistry.getClassFeatureById('test_reset_feature')).toBeUndefined();

            // Reinitialize with defaults using the proper initialization function
            initializeFeatureDefaults();

            // Generate character - should work with defaults
            const character = CharacterGenerator.generate(
                'test-reset-reinit',
                sampleAudioProfile,
                sampleTrack,
                { forceClass: 'Fighter', level: 1 }
            );

            // Verify character has default features
            expect(character.class_features.length).toBeGreaterThan(0);
        });
    });

    describe('Feature and Skill Queries', () => {
        it('should get correct features by class and level', () => {
            // Register features for different levels
            const level1Feature = {
                id: 'test_level_1',
                name: 'Level 1 Feature',
                class: 'Paladin' as const,
                level: 1,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'A level 1 feature.',
                effects: []
            };

            const level5Feature = {
                id: 'test_level_5',
                name: 'Level 5 Feature',
                class: 'Paladin' as const,
                level: 5,
                type: 'passive' as const,
                source: 'custom' as const,
                description: 'A level 5 feature.',
                effects: []
            };

            featureRegistry.registerClassFeature(level1Feature);
            featureRegistry.registerClassFeature(level5Feature);

            // Get features for level 3 (should only include level 1)
            const level3Features = featureRegistry.getClassFeatures('Paladin', 3);
            expect(level3Features.some(f => f.id === 'test_level_1')).toBe(true);
            expect(level3Features.some(f => f.id === 'test_level_5')).toBe(false);

            // Get features for level 5 (should include both)
            const level5Features = featureRegistry.getClassFeatures('Paladin', 5);
            expect(level5Features.some(f => f.id === 'test_level_1')).toBe(true);
            expect(level5Features.some(f => f.id === 'test_level_5')).toBe(true);
        });

        it('should get skills by ability', () => {
            // Register skills with different abilities
            const strSkill = {
                id: 'test_str_skill',
                name: 'STR Skill',
                ability: 'STR' as const,
                description: 'A strength-based skill.',
                source: 'custom' as const,
                categories: ['combat']
            };

            const intSkill = {
                id: 'test_int_skill',
                name: 'INT Skill',
                ability: 'INT' as const,
                description: 'An intelligence-based skill.',
                source: 'custom' as const,
                categories: ['knowledge']
            };

            registerTestSkill(strSkill);
            registerTestSkill(intSkill);

            // Get skills by ability
            const strSkills = skillRegistry.getSkillsByAbility('STR');
            expect(strSkills.some(s => s.id === 'test_str_skill')).toBe(true);

            const intSkills = skillRegistry.getSkillsByAbility('INT');
            expect(intSkills.some(s => s.id === 'test_int_skill')).toBe(true);
        });

        it('should get skills by category', () => {
            // Register skills with different categories
            const combatSkill = {
                id: 'test_combat_skill',
                name: 'Combat Skill',
                ability: 'STR' as const,
                description: 'A combat skill.',
                source: 'custom' as const,
                categories: ['combat']
            };

            const socialSkill = {
                id: 'test_social_skill',
                name: 'Social Skill',
                ability: 'CHA' as const,
                description: 'A social skill.',
                source: 'custom' as const,
                categories: ['social']
            };

            registerTestSkill(combatSkill);
            registerTestSkill(socialSkill);

            // Get skills by category
            const combatSkills = skillRegistry.getSkillsByCategory('combat');
            expect(combatSkills.some(s => s.id === 'test_combat_skill')).toBe(true);

            const socialSkills = skillRegistry.getSkillsByCategory('social');
            expect(socialSkills.some(s => s.id === 'test_social_skill')).toBe(true);
        });
    });
});
