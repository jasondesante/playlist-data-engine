/**
 * Sample playlist data for testing
 * Based on ENGINE_DESIGN_DOCUMENT.md RawArweavePlaylist structure
 */

import type { RawArweavePlaylist } from '../../src/core/types/Playlist';

export const samplePlaylistData: RawArweavePlaylist = {
    name: 'Test Playlist',
    image: 'https://example.com/playlist-cover.jpg',
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
                mp3_url: 'https://example.com/track1.mp3',
                image_small: 'https://example.com/artwork1-small.jpg',
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
                lossy_audio: 'https://example.com/track2.ogg',
                image: 'https://example.com/artwork2.jpg',
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
                audio_url: 'https://example.com/track3.mp3',
                image_large: 'https://example.com/artwork3-large.jpg',
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
