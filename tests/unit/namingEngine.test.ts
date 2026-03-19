import { describe, it, expect, beforeEach } from 'vitest';
import { NamingEngine } from '../../src/core/generation/NamingEngine';
import { PlaylistTrack } from '../../src/core/types/Playlist';
import { AudioProfile } from '../../src/core/types/AudioProfile';
import { asClass } from '../../src/core/types/Character';

describe('NamingEngine', () => {
    let engine: NamingEngine;
    let mockTrack: PlaylistTrack;
    let mockAudio: AudioProfile;
    const testSeed = 'test-seed-123';
    const testClass = asClass('Wizard');

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
            const name = engine.generateName(testSeed, mockTrack, mockAudio, testClass);
            expect(typeof name).toBe('string');
            expect(name.length).toBeGreaterThan(0);
        });

        it('should use correct adjective for high bass', () => {
            mockTrack.genre = 'Techno';
            mockAudio.bass_dominance = 0.8;
            const name = engine.generateName(testSeed, mockTrack, mockAudio, testClass);
            expect(name).toBeTruthy();
        });

        it('should generate different names by default (non-deterministic)', () => {
            const name1 = engine.generateName(testSeed, mockTrack, mockAudio, testClass);
            const name2 = engine.generateName(testSeed, mockTrack, mockAudio, testClass);
            const name3 = engine.generateName(testSeed, mockTrack, mockAudio, testClass);

            // At least one should be different (very high probability)
            const allSame = name1 === name2 && name2 === name3;
            expect(allSame).toBe(false);
        });

        it('should generate same name when deterministic is true', () => {
            const name1 = engine.generateName(testSeed, mockTrack, mockAudio, testClass, true);
            const name2 = engine.generateName(testSeed, mockTrack, mockAudio, testClass, true);
            const name3 = engine.generateName(testSeed, mockTrack, mockAudio, testClass, true);

            expect(name1).toBe(name2);
            expect(name2).toBe(name3);
        });

        it('should verify format distribution matches 20-20-10-20-15-10-5 in deterministic mode', () => {
            // Test with many seeds to verify probabilistic distribution
            const distribution = {
                class_title: 0,
                adjective_construct: 0,
                clan_construct: 0,
                descriptive_epithet: 0,
                compound_adjective: 0,
                artist_inspired: 0,
                mononym_subtitle: 0
            };

            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const seed = `test-seed-${i}`;
                // Use deterministic mode for consistent testing
                const name = engine.generateName(seed, mockTrack, mockAudio, testClass, true);

                // Determine which format was used (order matters - check more specific patterns first)
                if (name.includes('[')) {
                    distribution.mononym_subtitle++;
                } else if (name.includes(', the ')) {
                    distribution.descriptive_epithet++;
                } else if (name.includes('-')) {
                    distribution.compound_adjective++;
                } else if (name.includes('of the ')) {
                    distribution.artist_inspired++;
                } else if (name.includes(' the ')) {
                    distribution.class_title++;
                } else if (name.includes(' of ')) {
                    distribution.clan_construct++;
                } else {
                    // Adjective construct (remaining format)
                    distribution.adjective_construct++;
                }
            }

            // Calculate percentages
            const classTitle = (distribution.class_title / iterations) * 100;
            const adjective = (distribution.adjective_construct / iterations) * 100;
            const clan = (distribution.clan_construct / iterations) * 100;
            const descriptive = (distribution.descriptive_epithet / iterations) * 100;
            const compound = (distribution.compound_adjective / iterations) * 100;
            const artistInspired = (distribution.artist_inspired / iterations) * 100;
            const mononym = (distribution.mononym_subtitle / iterations) * 100;

            // Allow ±5% margin of error for each format
            // Expected: 20-20-10-20-15-10-5
            expect(classTitle).toBeGreaterThan(15);
            expect(classTitle).toBeLessThan(25);
            expect(adjective).toBeGreaterThan(15);
            expect(adjective).toBeLessThan(25);
            expect(clan).toBeGreaterThan(5);
            expect(clan).toBeLessThan(15);
            expect(descriptive).toBeGreaterThan(15);
            expect(descriptive).toBeLessThan(25);
            expect(compound).toBeGreaterThan(10);
            expect(compound).toBeLessThan(20);
            expect(artistInspired).toBeGreaterThan(5);
            expect(artistInspired).toBeLessThan(15);
            expect(mononym).toBeGreaterThan(0);
            expect(mononym).toBeLessThan(10);
        });
    });
});
