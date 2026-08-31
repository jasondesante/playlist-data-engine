/**
 * Unit tests for the playlist extraction utilities (getVRMs / getVRMTracks)
 */

import { describe, it, expect } from 'vitest';
import { getVRMs, getVRMTracks } from '../../src/utils/playlistUtils';
import type { RawArweavePlaylist, ServerlessPlaylist } from '../../src/core/types/Playlist';

const VRM_URL = 'https://arweave.net/avatar.vrm';

describe('getVRMs / getVRMTracks', () => {
    it('extracts vrm from raw track metadata, with track attribution', () => {
        const playlist = {
            name: 'P', image: 'i', creator: '0xC',
            tracks: [{
                chain_name: 'AR', platform: 'catalog', tx_id: 'abc123',
                metadata: JSON.stringify({
                    name: 'Song A', artist: 'Artist A',
                    audio_url: 'https://arweave.net/a.mp3',
                    image: 'https://arweave.net/a.jpg',
                    vrm: VRM_URL,
                }),
            }],
        } as RawArweavePlaylist;

        expect(getVRMs(playlist)).toEqual([VRM_URL]);
        expect(getVRMTracks(playlist)).toEqual([{
            title: 'Song A', artist: 'Artist A',
            audio_url: 'https://arweave.net/a.mp3',
            image_url: 'https://arweave.net/a.jpg',
            vrm: VRM_URL,
        }]);
    });

    it('still finds vrm when a raw track also carries the v0.4 wrapper audio_url', () => {
        const playlist = {
            name: 'P', image: 'i', creator: '0xC',
            tracks: [{
                chain_name: 'AR', platform: 'catalog', tx_id: 'abc123',
                audio_url: 'https://arweave.net/resolved-a.mp3',
                metadata: { vrm: VRM_URL },
            }],
        } as RawArweavePlaylist;

        expect(getVRMs(playlist)).toEqual([VRM_URL]);
    });

    it('reads vrm from extras on parsed playlists', () => {
        const playlist = {
            name: 'P', image: 'i', creator: '0xC',
            tracks: [{
                id: 'AR-1', uuid: 'u1', playlist_index: 0, chain_name: 'AR', platform: 'catalog',
                title: 'Song B', artist: 'Artist B',
                image_url: 'https://arweave.net/b.jpg',
                audio_url: 'https://arweave.net/b.mp3', duration: 100,
                genre: 'Electronic', tags: [],
                extras: { hasExtras: true, vrm: VRM_URL },
            }],
        } as unknown as ServerlessPlaylist;

        expect(getVRMs(playlist)).toEqual([VRM_URL]);
        expect(getVRMTracks(playlist)[0].title).toBe('Song B');
    });

    it('skips tracks without a vrm and ignores non-string vrm values', () => {
        const playlist = {
            name: 'P', image: 'i', creator: '0xC',
            tracks: [
                { chain_name: 'AR', platform: 'catalog', metadata: { vrm: 12345 } },
                { chain_name: 'AR', platform: 'catalog', metadata: { name: 'No vrm' } },
                { chain_name: 'AR', platform: 'catalog', metadata: { vrm: '' } },
            ],
        } as RawArweavePlaylist;

        expect(getVRMs(playlist)).toEqual([]);
        expect(getVRMTracks(playlist)).toEqual([]);
    });
});
