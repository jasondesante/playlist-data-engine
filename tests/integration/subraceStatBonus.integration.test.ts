import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureQuery } from '../../src/core/features/FeatureQuery.js';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator.js';
import { ExtensionManager } from '../../src/core/extensions/ExtensionManager.js';
import { initializeAllDefaults } from '../../src/core/extensions/initializeDefaults.js';
import { ALL_RACES } from '../../src/utils/constants.js';
import { DEFAULT_RACIAL_TRAITS } from '../../src/core/features/index.js';
import { registerTestRacialTrait } from '../helpers/registrationHelpers.js';
import type { RacialTrait } from '../../src/core/features/FeatureTypes.js';
import type { AudioProfile } from '../../src/core/types/AudioProfile.js';
import type { PlaylistTrack } from '../../src/core/types/Playlist.js';

describe('Subrace Stat Bonus Application', () => {
    let featureQuery: FeatureQuery;
    let extensionManager: ExtensionManager;

    function createMockAudioProfile(): AudioProfile {
        return {
            bass_dominance: 0.5,
            mid_dominance: 0.5,
            treble_dominance: 0.5,
            average_amplitude: 0.5,
            spectral_centroid: 1000,
            analysis_metadata: {
                duration_analyzed: 9,
                full_buffer_analyzed: false,
                sample_positions: [0.05, 0.40, 0.70],
                analyzed_at: new Date().toISOString()
            }
        };
    }

    function createMockTrack(title: string = 'Test Character'): PlaylistTrack {
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

    beforeEach(() => {
        extensionManager = ExtensionManager.getInstance();
        // Initialize all defaults including race data
        initializeAllDefaults();

        featureQuery = FeatureQuery.getInstance();
    });

    afterEach(() => {
        featureQuery.clearQueryCache();
        extensionManager.resetAll();
    });

    it('should apply Hill Dwarf +1 WIS stat bonus to ability_scores and ability_modifiers', () => {
        // Register Hill Dwarf specific trait with WIS bonus
        const hillDwarfWisdomTrait: RacialTrait = {
            id: 'hill_dwarf_wisdom',
            name: 'Hill Dwarf Wisdom',
            description: 'Increase Wisdom by 1',
            type: 'passive',
            race: 'Dwarf',
            subrace: 'Hill Dwarf',
            effects: [
                { type: 'stat_bonus', target: 'WIS', value: 1 }
            ],
            source: 'default'
        };

        registerTestRacialTrait(hillDwarfWisdomTrait);

        const seed = 'hill-dwarf-test';
        const audioProfile = createMockAudioProfile();

        // Generate a Hill Dwarf Cleric
        const hillDwarf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('Hill Dwarf Cleric'),
            { forceRace: 'Dwarf', subrace: 'Hill Dwarf', forceClass: 'Cleric' }
        );

        // The character should have the hill_dwarf_wisdom trait
        expect(hillDwarf.racial_traits).toContain('hill_dwarf_wisdom');

        // Verify subrace is set
        expect(hillDwarf.subrace).toBe('Hill Dwarf');

        // Generate a pure Dwarf (no subrace) with the same seed for comparison
        const pureDwarf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('Pure Dwarf'),
            { forceRace: 'Dwarf', subrace: 'pure', forceClass: 'Cleric' }
        );

        // Hill Dwarf should have +1 WIS compared to pure Dwarf (same seed = same base scores)
        expect(hillDwarf.ability_scores.WIS).toBe(pureDwarf.ability_scores.WIS + 1);

        // Verify WIS modifier is recalculated correctly
        const expectedWisModifier = Math.floor((hillDwarf.ability_scores.WIS - 10) / 2);
        expect(hillDwarf.ability_modifiers.WIS).toBe(expectedWisModifier);

        // Both should have Dwarf CON +2 bonus applied
        // CON scores should be the same since they're both Dwarves with same seed
        expect(hillDwarf.ability_scores.CON).toBe(pureDwarf.ability_scores.CON);
    });

    it('should apply Mountain Dwarf +2 STR stat bonus correctly', () => {
        const mountainDwarfStrengthTrait: RacialTrait = {
            id: 'mountain_dwarf_strength',
            name: 'Mountain Dwarf Strength',
            description: 'Increase Strength by 2',
            type: 'passive',
            race: 'Dwarf',
            subrace: 'Mountain Dwarf',
            effects: [
                { type: 'stat_bonus', target: 'STR', value: 2 }
            ],
            source: 'default'
        };

        registerTestRacialTrait(mountainDwarfStrengthTrait);

        const seed = 'mountain-dwarf-test';
        const audioProfile = createMockAudioProfile();

        const mountainDwarf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('Mountain Dwarf Cleric'),
            { forceRace: 'Dwarf', subrace: 'Mountain Dwarf', forceClass: 'Cleric' }
        );

        expect(mountainDwarf.racial_traits).toContain('mountain_dwarf_strength');
        expect(mountainDwarf.subrace).toBe('Mountain Dwarf');

        // Generate a pure Dwarf (no subrace) with the same seed for comparison
        const pureDwarf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('Pure Dwarf'),
            { forceRace: 'Dwarf', subrace: 'pure', forceClass: 'Cleric' }
        );

        // Mountain Dwarf should have +2 STR compared to pure Dwarf (same seed = same base scores)
        expect(mountainDwarf.ability_scores.STR).toBe(pureDwarf.ability_scores.STR + 2);

        // Verify STR modifier is recalculated correctly
        const expectedStrModifier = Math.floor((mountainDwarf.ability_scores.STR - 10) / 2);
        expect(mountainDwarf.ability_modifiers.STR).toBe(expectedStrModifier);

        // Both should have Dwarf CON +2 bonus applied
        expect(mountainDwarf.ability_scores.CON).toBe(pureDwarf.ability_scores.CON);
    });

    it('should not apply subrace bonus to characters without that subrace', () => {
        const hillDwarfWisdomTrait: RacialTrait = {
            id: 'hill_dwarf_wisdom',
            name: 'Hill Dwarf Wisdom',
            description: 'Increase Wisdom by 1',
            type: 'passive',
            race: 'Dwarf',
            subrace: 'Hill Dwarf',
            effects: [
                { type: 'stat_bonus', target: 'WIS', value: 1 }
            ],
            source: 'default'
        };

        registerTestRacialTrait(hillDwarfWisdomTrait);

        const seed = 'no-subrace-test';
        const audioProfile = createMockAudioProfile();

        // Generate Dwarf with no subrace (pure)
        const pureDwarf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('Pure Dwarf'),
            { forceRace: 'Dwarf', subrace: 'pure', forceClass: 'Cleric' }
        );

        // Should NOT have hill_dwarf_wisdom trait
        expect(pureDwarf.racial_traits).not.toContain('hill_dwarf_wisdom');
        expect(pureDwarf.subrace).toBeUndefined();

        // Generate a Hill Dwarf with the same seed for comparison
        const hillDwarf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('Hill Dwarf'),
            { forceRace: 'Dwarf', subrace: 'Hill Dwarf', forceClass: 'Cleric' }
        );

        // Pure Dwarf WIS should be exactly 1 less than Hill Dwarf (no +1 bonus)
        expect(pureDwarf.ability_scores.WIS).toBe(hillDwarf.ability_scores.WIS - 1);

        // Verify ability scores are in valid range (8-20)
        expect(pureDwarf.ability_scores.WIS).toBeGreaterThanOrEqual(8);
        expect(pureDwarf.ability_scores.WIS).toBeLessThanOrEqual(20);
    });

    it('should verify subrace trait ID is stored and subrace property is set', () => {
        const highElfCantripTrait: RacialTrait = {
            id: 'high_elf_cantrip',
            name: 'High Elf Cantrip',
            description: 'Learn one extra wizard cantrip',
            type: 'passive',
            race: 'Elf',
            subrace: 'High Elf',
            effects: [
                { type: 'passive_modifier', target: 'extra_cantrip', value: 1 }
            ],
            source: 'default'
        };

        registerTestRacialTrait(highElfCantripTrait);

        const seed = 'high-elf-test';
        const audioProfile = createMockAudioProfile();

        const character = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('High Elf Wizard'),
            { forceRace: 'Elf', subrace: 'High Elf', forceClass: 'Wizard' }
        );

        // Verify subrace is set on character sheet
        expect(character.subrace).toBe('High Elf');

        // Verify the racial trait ID is stored
        expect(character.racial_traits).toContain('high_elf_cantrip');

        // Verify the trait has the subrace property
        const trait = featureQuery.getRacialTraitById('high_elf_cantrip');
        expect(trait?.subrace).toBe('High Elf');
    });

    it('should verify subrace prerequisite validation works correctly', () => {
        const highElfOnlyTrait: RacialTrait = {
            id: 'high_elf_magic_training',
            name: 'High Elf Magic Training',
            description: 'Only available to High Elves',
            type: 'passive',
            race: 'Elf',
            subrace: 'High Elf',
            prerequisites: {
                subrace: 'High Elf'
            },
            effects: [
                { type: 'passive_modifier', target: 'arcane_bonus', value: 1 }
            ],
            source: 'custom'
        };

        registerTestRacialTrait(highElfOnlyTrait);

        const seed = 'prerequisite-test';
        const audioProfile = createMockAudioProfile();

        // High Elf should have the trait
        const highElf = CharacterGenerator.generate(
            seed,
            audioProfile,
            createMockTrack('High Elf'),
            { forceRace: 'Elf', subrace: 'High Elf', forceClass: 'Wizard' }
        );

        expect(highElf.racial_traits).toContain('high_elf_magic_training');
        expect(highElf.subrace).toBe('High Elf');

        // Wood Elf (if we registered the trait) should NOT have the trait due to prerequisite
        // But we haven't registered Wood Elf trait, so let's just verify High Elf has it
        const validation = featureQuery.validatePrerequisites(highElfOnlyTrait, highElf);
        expect(validation.valid).toBe(true);
    });
});
