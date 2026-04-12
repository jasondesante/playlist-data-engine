/**
 * Unit tests for PlaylistParser
 * Based on specs/001-core-engine/SPEC.md
 */

import { describe, it, expect, vi } from 'vitest';
import { PlaylistParser } from '../../src/core/parser/PlaylistParser';
import { MetadataExtractor } from '../../src/core/parser/MetadataExtractor';

describe('MetadataExtractor', () => {
    describe('extractAudioUrl', () => {
        it('should prioritize mp3_url over other formats', () => {
            const data = {
                mp3_url: 'https://example.com/track.mp3',
                lossy_audio: 'https://example.com/track.ogg',
                audio_url: 'https://example.com/track.wav',
            };
            expect(MetadataExtractor.extractAudioUrl(data)).toBe('https://example.com/track.mp3');
        });

        it('should fall back to lossy_audio if mp3_url is missing', () => {
            const data = {
                lossy_audio: 'https://example.com/track.ogg',
                audio_url: 'https://example.com/track.wav',
            };
            expect(MetadataExtractor.extractAudioUrl(data)).toBe('https://example.com/track.ogg');
        });

        it('should return null if no audio URL is found', () => {
            const data = { image: 'https://example.com/image.jpg' };
            expect(MetadataExtractor.extractAudioUrl(data)).toBeNull();
        });
    });

    describe('extractAudioUrlLossless', () => {
        it('should extract lossless_audio when present', () => {
            const data = {
                mp3_url: 'https://example.com/track.mp3',
                lossless_audio: 'https://example.com/track.wav',
            };
            expect(MetadataExtractor.extractAudioUrlLossless(data)).toBe('https://example.com/track.wav');
        });

        it('should prioritize lossless_audio over wav_url and flac_url', () => {
            const data = {
                lossless_audio: 'https://example.com/track.wav',
                wav_url: 'https://example.com/track-alt.wav',
                flac_url: 'https://example.com/track.flac',
            };
            expect(MetadataExtractor.extractAudioUrlLossless(data)).toBe('https://example.com/track.wav');
        });

        it('should fall back to wav_url when lossless_audio is missing', () => {
            const data = {
                wav_url: 'https://example.com/track.wav',
            };
            expect(MetadataExtractor.extractAudioUrlLossless(data)).toBe('https://example.com/track.wav');
        });

        it('should fall back to flac_url when lossless_audio and wav_url are missing', () => {
            const data = {
                flac_url: 'https://example.com/track.flac',
            };
            expect(MetadataExtractor.extractAudioUrlLossless(data)).toBe('https://example.com/track.flac');
        });

        it('should return null when no lossless field is present', () => {
            const data = {
                mp3_url: 'https://example.com/track.mp3',
                audio_url: 'https://example.com/track.wav',
            };
            expect(MetadataExtractor.extractAudioUrlLossless(data)).toBeNull();
        });

        it('should return null for empty string values', () => {
            const data = {
                lossless_audio: '',
            };
            expect(MetadataExtractor.extractAudioUrlLossless(data)).toBeNull();
        });
    });

    describe('extractImageUrl', () => {
        it('should prioritize image_small over other formats', () => {
            const data = {
                image_small: 'https://example.com/small.jpg',
                image: 'https://example.com/image.jpg',
                image_large: 'https://example.com/large.jpg',
            };
            expect(MetadataExtractor.extractImageUrl(data)).toBe('https://example.com/small.jpg');
        });
    });

    describe('extractTitle', () => {
        it('should prioritize name over title', () => {
            const data = {
                name: 'Track Name',
                title: 'Track Title',
            };
            expect(MetadataExtractor.extractTitle(data)).toBe('Track Name');
        });

        it('should fall back to title if name is missing', () => {
            const data = { title: 'Track Title' };
            expect(MetadataExtractor.extractTitle(data)).toBe('Track Title');
        });
    });

    describe('extractArtist', () => {
        it('should prioritize artist over created_by and minter', () => {
            const data = {
                artist: 'Artist Name',
                created_by: 'Creator',
                minter: '0x123',
            };
            expect(MetadataExtractor.extractArtist(data)).toBe('Artist Name');
        });

        it('should fall back to created_by if artist is missing', () => {
            const data = {
                created_by: 'Creator',
                minter: '0x123',
            };
            expect(MetadataExtractor.extractArtist(data)).toBe('Creator');
        });
    });

    describe('parseMetadata', () => {
        it('should parse stringified JSON', () => {
            const metadata = JSON.stringify({ key: 'value', nested: { data: 123 } });
            const result = MetadataExtractor.parseMetadata(metadata);
            expect(result).toEqual({ key: 'value', nested: { data: 123 } });
        });

        it('should return object as-is if already parsed', () => {
            const metadata = { key: 'value' };
            const result = MetadataExtractor.parseMetadata(metadata);
            expect(result).toEqual({ key: 'value' });
        });

        it('should return null for invalid JSON', () => {
            const metadata = 'invalid json {';
            const result = MetadataExtractor.parseMetadata(metadata);
            expect(result).toBeNull();
        });
    });

    describe('convertAttributes', () => {
        it('should convert OpenSea-style attributes array', () => {
            const attributes = [
                { trait_type: 'BPM', value: 120 },
                { trait_type: 'Key', value: 'C Major' },
            ];
            const result = MetadataExtractor.convertAttributes(attributes);
            expect(result).toEqual({ BPM: 120, Key: 'C Major' });
        });

        it('should return null for non-array input', () => {
            const result = MetadataExtractor.convertAttributes({ not: 'array' });
            expect(result).toBeNull();
        });
    });

    describe('extractGenre', () => {
        it('should extract genre as string', () => {
            const data = { genre: 'House' };
            expect(MetadataExtractor.extractGenre(data)).toBe('House');
        });

        it('should extract first genre from array', () => {
            const data = { genre: ['House', 'Electronic', 'Dance'] };
            expect(MetadataExtractor.extractGenre(data)).toBe('House');
        });

        it('should return empty string for empty genre array', () => {
            const data = { genre: [] };
            expect(MetadataExtractor.extractGenre(data)).toBe('');
        });

        it('should extract genre from OpenSea attributes array', () => {
            const data = {
                attributes: [
                    { trait_type: 'Genre', value: 'Techno' },
                    { trait_type: 'BPM', value: 128 },
                ],
            };
            expect(MetadataExtractor.extractGenre(data)).toBe('Techno');
        });

        it('should extract first genre from attributes array value', () => {
            const data = {
                attributes: [
                    { trait_type: 'genre', value: ['Ambient', 'Chillout'] },
                ],
            };
            expect(MetadataExtractor.extractGenre(data)).toBe('Ambient');
        });

        it('should prioritize direct genre field over attributes', () => {
            const data = {
                genre: 'Direct Genre',
                attributes: [{ trait_type: 'Genre', value: 'Attribute Genre' }],
            };
            expect(MetadataExtractor.extractGenre(data)).toBe('Direct Genre');
        });

        it('should return empty string when genre is missing', () => {
            const data = { title: 'Track' };
            expect(MetadataExtractor.extractGenre(data)).toBe('');
        });

        it('should handle case-insensitive genre trait_type', () => {
            const data = {
                attributes: [{ trait_type: 'GENRE', value: 'Trance' }],
            };
            expect(MetadataExtractor.extractGenre(data)).toBe('Trance');
        });
    });
});

describe('PlaylistParser', () => {
    describe('parse', () => {
        it('should parse a valid RawArweavePlaylist', async () => {
            const parser = new PlaylistParser();
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Track 1',
                            artist: 'Artist 1',
                            mp3_url: 'https://example.com/track1.mp3',
                            image_small: 'https://example.com/image1.jpg',
                            duration: 180,
                            genre: 'Electronic',
                            tags: ['test'],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.name).toBe('Test Playlist');
            expect(result.image).toBe('https://example.com/playlist.jpg');
            expect(result.creator).toBe('0xCreator');
            expect(result.tracks).toHaveLength(1);
            expect(result.tracks[0].title).toBe('Track 1');
            expect(result.tracks[0].artist).toBe('Artist 1');
            expect(result.tracks[0].audio_url).toBe('https://example.com/track1.mp3');
            expect(result.tracks[0].id).toBe('ethereum-0xabc-1');
            expect(result.tracks[0].playlist_index).toBe(0);
        });

        it('should handle stringified metadata', async () => {
            const parser = new PlaylistParser();
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Track from Metadata',
                            artist: 'Artist from Metadata',
                            mp3_url: 'https://example.com/track.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 200,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks[0].title).toBe('Track from Metadata');
            expect(result.tracks[0].artist).toBe('Artist from Metadata');
        });

        it('should skip tracks with missing audio URL', async () => {
            const parser = new PlaylistParser({ strict: false });
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Valid Track',
                            artist: 'Artist',
                            mp3_url: 'https://example.com/track.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                    {
                        chain_name: 'ethereum',
                        token_address: '0xdef',
                        token_id: '2',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Invalid Track',
                            artist: 'Artist',
                            image: 'https://example.com/image.jpg',
                            // Missing audio URL
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks).toHaveLength(1);
            expect(result.tracks[0].title).toBe('Valid Track');
        });

        it('should populate audio_url_lossless when lossless audio differs from primary', async () => {
            const parser = new PlaylistParser();
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Track 1',
                            artist: 'Artist 1',
                            mp3_url: 'https://example.com/track1.mp3',
                            lossless_audio: 'https://example.com/track1.wav',
                            image_small: 'https://example.com/image1.jpg',
                            duration: 180,
                            genre: 'Electronic',
                            tags: ['test'],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks[0].audio_url).toBe('https://example.com/track1.mp3');
            expect(result.tracks[0].audio_url_lossless).toBe('https://example.com/track1.wav');
        });

        it('should omit audio_url_lossless when lossless is the same as primary', async () => {
            const parser = new PlaylistParser();
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Track 1',
                            artist: 'Artist 1',
                            audio_url: 'https://example.com/track1.wav',
                            lossless_audio: 'https://example.com/track1.wav',
                            image_small: 'https://example.com/image1.jpg',
                            duration: 180,
                            genre: 'Electronic',
                            tags: [],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks[0].audio_url).toBe('https://example.com/track1.wav');
            expect(result.tracks[0].audio_url_lossless).toBeUndefined();
        });

        it('should omit audio_url_lossless when no lossless field exists', async () => {
            const parser = new PlaylistParser();
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Track 1',
                            artist: 'Artist 1',
                            mp3_url: 'https://example.com/track1.mp3',
                            image_small: 'https://example.com/image1.jpg',
                            duration: 180,
                            genre: 'Electronic',
                            tags: [],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks[0].audio_url).toBe('https://example.com/track1.mp3');
            expect(result.tracks[0].audio_url_lossless).toBeUndefined();
        });

        it('should convert OpenSea attributes', async () => {
            const parser = new PlaylistParser();
            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Track 1',
                            artist: 'Artist 1',
                            mp3_url: 'https://example.com/track1.mp3',
                            image: 'https://example.com/image1.jpg',
                            duration: 180,
                            genre: 'Electronic',
                            tags: [],
                            attributes: [
                                { trait_type: 'BPM', value: 128 },
                                { trait_type: 'Key', value: 'C Major' },
                            ],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks[0].attributes).toEqual({
                BPM: 128,
                Key: 'C Major',
            });
        });

        it('should skip tracks with 404 audio URLs when validateAudioUrls is true', async () => {
            // Mock fetch to simulate 404 response
            global.fetch = vi.fn(() =>
                Promise.resolve({
                    ok: false,
                    status: 404,
                } as Response)
            );

            const parser = new PlaylistParser({
                validateAudioUrls: true,
                strict: false,
            });

            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Valid Track',
                            artist: 'Artist',
                            mp3_url: 'https://example.com/valid.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                    {
                        chain_name: 'ethereum',
                        token_address: '0xdef',
                        token_id: '2',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Invalid Track (404)',
                            artist: 'Artist',
                            mp3_url: 'https://example.com/404.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            // Both tracks should be skipped since fetch returns 404 for all
            expect(result.tracks).toHaveLength(0);

            // Restore original fetch
            vi.restoreAllMocks();
        });

        it('should include tracks with valid audio URLs when validateAudioUrls is true', async () => {
            // Mock fetch to return ok for valid URL, 404 for invalid
            global.fetch = vi.fn((url: string) =>
                Promise.resolve({
                    ok: url.includes('valid'),
                    status: url.includes('valid') ? 200 : 404,
                } as Response)
            );

            const parser = new PlaylistParser({
                validateAudioUrls: true,
                strict: false,
            });

            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Valid Track',
                            artist: 'Artist',
                            mp3_url: 'https://example.com/valid.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                ],
            };

            const result = await parser.parse(rawData);

            expect(result.tracks).toHaveLength(1);
            expect(result.tracks[0].title).toBe('Valid Track');

            // Restore original fetch
            vi.restoreAllMocks();
        });

        it('should timeout audio URL validation when request takes too long', async () => {
            // Mock fetch to simulate a hanging request that gets aborted
            let fetchSignal: AbortSignal | null = null;
            global.fetch = vi.fn((_, options) => {
                // Store the signal for the test to use
                if (options?.signal instanceof AbortSignal) {
                    fetchSignal = options.signal as AbortSignal;
                }
                // Return a promise that never resolves but can observe abort
                return new Promise((_, reject) => {
                    if (fetchSignal) {
                        fetchSignal.addEventListener('abort', () => {
                            const error = new Error('The operation was aborted');
                            error.name = 'AbortError';
                            reject(error);
                        });
                    }
                });
            });

            const parser = new PlaylistParser({
                validateAudioUrls: true,
                strict: false,
                audioUrlValidationTimeout: 100, // Short timeout for test
            });

            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Slow Track',
                            artist: 'Artist',
                            mp3_url: 'https://example.com/slow.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                ],
            };

            const startTime = Date.now();
            const result = await parser.parse(rawData);
            const elapsed = Date.now() - startTime;

            // Should timeout and skip the track (no valid tracks)
            expect(result.tracks).toHaveLength(0);

            // Should complete within reasonable time (timeout + some margin)
            // With 100ms timeout, should be well under 1 second
            expect(elapsed).toBeLessThan(1000);

            // Verify the abort signal was triggered
            expect(fetchSignal).toBeDefined();
            expect(fetchSignal?.aborted).toBe(true);

            // Restore original fetch
            vi.restoreAllMocks();
        });

        it('should use custom timeout value when specified', async () => {
            const customTimeout = 500; // Use a shorter timeout for tests
            const parser = new PlaylistParser({
                validateAudioUrls: true,
                strict: false,
                audioUrlValidationTimeout: customTimeout,
            });

            // Mock fetch that simulates hanging but responds to abort
            let fetchSignal: AbortSignal | null = null;
            global.fetch = vi.fn((_, options) => {
                if (options?.signal instanceof AbortSignal) {
                    fetchSignal = options.signal as AbortSignal;
                }
                return new Promise((_, reject) => {
                    if (fetchSignal) {
                        fetchSignal.addEventListener('abort', () => {
                            const error = new Error('The operation was aborted');
                            error.name = 'AbortError';
                            reject(error);
                        });
                    }
                });
            });

            const rawData = {
                name: 'Test Playlist',
                image: 'https://example.com/playlist.jpg',
                creator: '0xCreator',
                tracks: [
                    {
                        chain_name: 'ethereum',
                        token_address: '0xabc',
                        token_id: '1',
                        platform: 'sound',
                        metadata: JSON.stringify({
                            name: 'Test Track',
                            artist: 'Artist',
                            mp3_url: 'https://example.com/test.mp3',
                            image: 'https://example.com/image.jpg',
                            duration: 180,
                            genre: 'Test',
                            tags: [],
                        }),
                    },
                ],
            };

            const startTime = Date.now();
            await parser.parse(rawData);
            const elapsed = Date.now() - startTime;

            // Should use the custom timeout (500ms + some margin)
            expect(elapsed).toBeGreaterThanOrEqual(customTimeout - 50);
            expect(elapsed).toBeLessThan(customTimeout + 200);

            // Restore original fetch
            vi.restoreAllMocks();
        });
    });
});
