/**
 * Sample playlist data for testing
 * Based on specs/001-core-engine/SPEC.md
 */

import type { RawArweavePlaylist, PlaylistTrack } from '../../src/core/types/Playlist';
import { TEST_AUDIO_URLS } from './testAudioUrls';

export const TEST_URLS = {
    // Arweave-hosted test track
    arweaveTrack: 'https://arweave.net/G9lus_CuOViy1M-sLbQXGXnV2wYGPodYAcGP5akM8EU',
    arweaveImage: 'https://arweave.net/Zc09ELTlfM3KA4sdwS9enG6kZJXx3dQFsaYNCrJLSIk',
};

export const samplePlaylistData: RawArweavePlaylist = {
    name: 'Test Playlist',
    image: 'https://arweave.net/Zc09ELTlfM3KA4sdwS9enG6kZJXx3dQFsaYNCrJLSIk',
    creator: '0xCreatorWallet123',
    description: 'A sample playlist for testing the data engine',
    genre: 'Electronic',
    tags: ['test', 'sample', 'electronic'],
    tracks: [
        {
            // Outer Blockchain Data
            chain_name: 'ethereum',
            token_address: '0xabc123',
            token_id: '1',
            platform: 'sound',
            id: 'ethereum-0xabc123-1',

            // Stringified metadata
            metadata: JSON.stringify({
                name: 'Epic Battle Theme',
                artist: 'Composer One',
                mp3_url: TEST_URLS.arweaveTrack,
                image_small: TEST_URLS.arweaveImage,
                duration: 180,
                genre: 'Electronic',
                tags: ['epic', 'battle', 'electronic'],
                bpm: 140,
                key: 'Am',
            }),
        },
        {
            chain_name: 'polygon',
            token_address: '0xdef456',
            token_id: '2',
            platform: 'catalog',

            metadata: JSON.stringify({
                title: 'Peaceful Melody',
                created_by: 'Composer Two',
                lossy_audio: TEST_URLS.arweaveTrack,
                image: TEST_URLS.arweaveImage,
                duration: 240,
                genre: 'Ambient',
                tags: ['peaceful', 'ambient'],
            }),
        },
        {
            chain_name: 'ethereum',
            token_address: '0xghi789',
            token_id: '3',
            platform: 'contract-wizard',

            metadata: JSON.stringify({
                name: 'Energetic Dance',
                artist: 'Composer Three',
                audio_url: TEST_URLS.arweaveTrack,
                image_large: TEST_URLS.arweaveImage,
                duration: 200,
                genre: 'Dance',
                tags: ['energetic', 'dance', 'upbeat'],
                attributes: [
                    { trait_type: 'BPM', value: 128 },
                    { trait_type: 'Key', value: 'C Major' },
                ],
            }),
        },
    ],
};

export const sampleAudioProfile = {
    bass_dominance: 0.7,
    mid_dominance: 0.5,
    treble_dominance: 0.3,
    average_amplitude: 0.6,
    duration: 180,
    analysis_metadata: {
        duration_analyzed: 9,
        full_buffer_analyzed: false,
        sample_positions: [0.05, 0.40, 0.70],
        analyzed_at: new Date().toISOString(),
    },
};

// Sample track for character generation tests
export const sampleTrack: PlaylistTrack = {
    title: 'Test Song',
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
