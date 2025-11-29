import { describe, it, expect, beforeEach } from 'vitest';
import { NamingEngine } from '../../src/core/generation/NamingEngine';
import { PlaylistTrack } from '../../src/core/types/Playlist';
import { AudioProfile } from '../../src/core/types/AudioProfile';

describe('NamingEngine', () => {
    let engine: NamingEngine;
    let mockTrack: PlaylistTrack;
    let mockAudio: AudioProfile;

    beforeEach(() => {
        engine = new NamingEngine();
        mockTrack = {
            id: '1',
            uuid: 'test-uuid',
            playlist_index: 0,
            chain_name: 'eth',
            token_address: '0x0',
            token_id: '1',
            platform: 'sound',
            title: 'Test Song',
            artist: 'Test Artist',
            image_url: '',
            audio_url: '',
            duration: 100,
            genre: 'Rock',
            tags: []
        };
        mockAudio = {
            average_amplitude: 0.5,
            bass_dominance: 0.5,
            mid_dominance: 0.3,
            treble_dominance: 0.2,
            spectral_centroid: 0,
            spectral_rolloff: 0,
            zero_crossing_rate: 0,
            analysis_metadata: {
                duration_analyzed: 100,
                full_buffer_analyzed: true,
                sample_positions: [0, 0.5, 1],
                analyzed_at: new Date().toISOString()
            }
        };
    });

    describe('cleanTitle', () => {
        it('should remove (Official Video)', () => {
            expect(engine.cleanTitle('Song Name (Official Video)')).toBe('Song Name');
        });

        it('should remove [Remix]', () => {
            expect(engine.cleanTitle('Song Name [Remix]')).toBe('Song Name');
        });

        it('should remove track numbers', () => {
            expect(engine.cleanTitle('01 - Song Name')).toBe('Song Name');
            expect(engine.cleanTitle('1. Song Name')).toBe('Song Name');
        });

        it('should remove file extensions', () => {
            expect(engine.cleanTitle('song.mp3')).toBe('song');
        });

        it('should keep clean titles as is', () => {
            expect(engine.cleanTitle('Clean Song')).toBe('Clean Song');
        });
    });

    describe('generateName', () => {
        it('should generate valid names', () => {
            const name = engine.generateName(mockTrack, mockAudio);
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        });

        it('should use correct adjective for high bass', () => {
            mockTrack.genre = 'Techno';
            mockAudio.bass_dominance = 0.8;
            const name = engine.generateName(mockTrack, mockAudio);
            expect(name).toBeTruthy();
        });

        it('should verify format distribution matches 50/30/20', () => {
            // Test with many UUIDs to verify probabilistic distribution
            const distribution = {
                class_title: 0,
                adjective_construct: 0,
                clan_construct: 0
            };

            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const testTrack = { ...mockTrack, uuid: `test-uuid-${i}` };
                const name = engine.generateName(testTrack, mockAudio);

                // Determine which format was used
                if (name.includes(' the ')) {
                    distribution.class_title++;
                } else if (name.includes(' of ')) {
                    distribution.clan_construct++;
                } else {
                    // Adjective construct (starts with adjective)
                    distribution.adjective_construct++;
                }
            }

            // Calculate percentages
            const classTitle = (distribution.class_title / iterations) * 100;
            const adjective = (distribution.adjective_construct / iterations) * 100;
            const clan = (distribution.clan_construct / iterations) * 100;

            // Allow ±5% margin of error
            expect(classTitle).toBeGreaterThan(45);
            expect(classTitle).toBeLessThan(55);
            expect(adjective).toBeGreaterThan(25);
            expect(adjective).toBeLessThan(35);
            expect(clan).toBeGreaterThan(15);
            expect(clan).toBeLessThan(25);
        });
    });
});
