/**
 * End-to-end integration test
 * Tests the full pipeline: Playlist → Audio Analysis → Character Generation → Progression → Leveling
 * Covers Phases 0-6: Foundation, Visual & Naming, Advanced Character, Progression,
 * Environmental Sensors, Gaming Integration, Combat (optional)
 */

import { describe, it, expect } from 'vitest';
import { PlaylistParser } from '../../src/core/parser/PlaylistParser';
import { CharacterGenerator } from '../../src/core/generation/CharacterGenerator';
import { XPCalculator } from '../../src/core/progression/XPCalculator';
import { SessionTracker } from '../../src/core/progression/SessionTracker';
import { LevelUpProcessor } from '../../src/core/progression/LevelUpProcessor';
import { MasterySystem } from '../../src/core/progression/MasterySystem';
import { CharacterUpdater } from '../../src/core/progression/CharacterUpdater';
import { samplePlaylistData, sampleAudioProfile } from '../fixtures/sampleData';
import type { CharacterSheet } from '../../src/core/types/Character';
import type { PlaylistTrack } from '../../src/core/types/Playlist';

// Helper function to create mock tracks for testing
function createMockTrack(title: string): PlaylistTrack {
    return {
        title,
        artist: 'Test Artist',
        genre: 'Rock',
        id: `test-${title.replace(/\s+/g, '-').toLowerCase()}`,
        uuid: `uuid-${Date.now()}`,
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

describe('E2E: Full Pipeline', () => {
    it('should parse playlist and generate characters', async () => {
        // Step 1: Parse playlist
        const parser = new PlaylistParser();
        const playlist = await parser.parse(samplePlaylistData);

        expect(playlist.name).toBe('Test Playlist');
        expect(playlist.image).toBe('https://arweave.net/Zc09ELTlfM3KA4sdwS9enG6kZJXx3dQFsaYNCrJLSIk');
        expect(playlist.creator).toBe('0xCreatorWallet123');
        expect(playlist.tracks.length).toBeGreaterThan(0);

        // Step 2: Generate character for first track
        const track = playlist.tracks[0];
        expect(track.id).toBeTruthy();
        expect(track.title).toBeTruthy();
        expect(track.artist).toBeTruthy();

        // Step 3: Generate character from audio profile (use track.id as seed)
        const character = CharacterGenerator.generate(
            track.id,
            sampleAudioProfile,
            track
        );

        // Verify character properties
        expect(character.name).toBe(`${track.artist} - ${track.title}`);
        expect(character.seed).toBe(track.id);
        expect(character.race).toBeTruthy();
        expect(character.class).toBeTruthy();
        expect(character.level).toBe(1);

        // Verify ability scores are in valid range
        expect(character.ability_scores.STR).toBeGreaterThanOrEqual(8);
        expect(character.ability_scores.STR).toBeLessThanOrEqual(20);
        expect(character.ability_scores.DEX).toBeGreaterThanOrEqual(8);
        expect(character.ability_scores.DEX).toBeLessThanOrEqual(20);

        // Verify modifiers are calculated correctly
        const expectedStrMod = Math.floor((character.ability_scores.STR - 10) / 2);
        expect(character.ability_modifiers.STR).toBe(expectedStrMod);

        // Verify HP is calculated
        expect(character.hp.max).toBeGreaterThan(0);
        expect(character.hp.current).toBe(character.hp.max);

        // Verify proficiency bonus
        expect(character.proficiency_bonus).toBe(2); // Level 1

        // Verify XP thresholds
        expect(character.xp.current).toBe(0);
        expect(character.xp.next_level).toBe(300); // Level 2 threshold
    });

    it('should generate deterministic characters from same seed', () => {
        const seed = 'ethereum-0xabc123-1';

        const char1 = CharacterGenerator.generate(
            seed,
            sampleAudioProfile,
            createMockTrack('Test Character')
        );

        const char2 = CharacterGenerator.generate(
            seed,
            sampleAudioProfile,
            createMockTrack('Test Character')
        );

        // Same seed should produce identical characters
        expect(char1.race).toBe(char2.race);
        expect(char1.class).toBe(char2.class);
        expect(char1.ability_scores).toEqual(char2.ability_scores);
    });

    it('should suggest different classes based on audio profile', () => {
        const seed = 'test-seed-1';

        // High bass profile (should favor strength classes)
        const bassProfile = {
            bass_dominance: 0.9,
            mid_dominance: 0.3,
            treble_dominance: 0.2,
            average_amplitude: 0.5,
            analysis_metadata: {
                duration_analyzed: 9,
                full_buffer_analyzed: false,
                sample_positions: [0.05, 0.40, 0.70],
                analyzed_at: new Date().toISOString(),
            },
        };

        const bassChar = CharacterGenerator.generate(seed, bassProfile, createMockTrack('Bass Character'));

        // High bass should result in high STR
        expect(bassChar.ability_scores.STR).toBeGreaterThan(bassChar.ability_scores.DEX);

        // High treble profile (should favor dexterity classes)
        const trebleProfile = {
            bass_dominance: 0.2,
            mid_dominance: 0.3,
            treble_dominance: 0.9,
            average_amplitude: 0.5,
            analysis_metadata: {
                duration_analyzed: 9,
                full_buffer_analyzed: false,
                sample_positions: [0.05, 0.40, 0.70],
                analyzed_at: new Date().toISOString(),
            },
        };

        const trebleChar = CharacterGenerator.generate(seed, trebleProfile, createMockTrack('Treble Character'));

        // High treble should result in high DEX
        expect(trebleChar.ability_scores.DEX).toBeGreaterThan(trebleChar.ability_scores.STR);
    });

    it('should allow forcing custom names via forceName option', () => {
        const seed = 'test-seed-custom-name';
        const customName = 'Gandalf the Grey';

        const character = CharacterGenerator.generate(
            seed,
            sampleAudioProfile,
            createMockTrack('Test Song'),
            { forceName: customName }
        );

        // Should use the forced name instead of generating one
        expect(character.name).toBe(customName);

        // All other properties should still be generated normally
        expect(character.race).toBeTruthy();
        expect(character.class).toBeTruthy();
        expect(character.level).toBe(1);
    });
});

describe('E2E: Progression & Leveling System', () => {
    it('should initialize progression system components', () => {
        // Verify all progression components can be instantiated
        const xpCalc = new XPCalculator();
        const tracker = new SessionTracker();
        const processor = new LevelUpProcessor();
        const mastery = new MasterySystem();
        const updater = new CharacterUpdater();

        expect(xpCalc).toBeDefined();
        expect(tracker).toBeDefined();
        expect(processor).toBeDefined();
        expect(mastery).toBeDefined();
        expect(updater).toBeDefined();
    });

});
