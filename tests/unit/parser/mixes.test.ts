/**
 * Unit tests for alternate-mix lookup, resolution, and playlist-level extraction
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { PlaylistParser } from '../../../src/core/parser/PlaylistParser';
import {
    getTrackExtras,
    findMixByName,
    getPreferredMixByQuality,
    getUniqueMixes,
    resolveMixUrl,
    selectMix,
    type MixInfo,
    type PlaylistTrack,
} from '../../../src/core/parser/TrackExtras';
import {
    getMixes,
    getMixTracks,
    getTracks,
    getFullTracks,
} from '../../../src/utils/playlistUtils';
import { MixInfoSchema } from '../../../src/utils/validators';
import type { RawArweavePlaylist } from '../../../src/core/types/Playlist';

// ─── Fixtures ────────────────────────────────────────────────────────────

const metadataWithMixes = JSON.stringify({
    name: 'Track 1',
    artist: 'Artist 1',
    mp3_url: 'https://example.com/track1.mp3',
    image: 'https://example.com/image1.jpg',
    mixes: [
        { name: 'Instrumental', uri: 'https://example.com/instr.mp3', mime_type: 'audio/mpeg', conditions: [] },
        { name: 'Instrumental', uri: 'https://example.com/instr.wav', mime_type: 'audio/wav', conditions: [] },
        {
            name: 'Night Mix',
            uri: 'https://example.com/night.mp3',
            mime_type: 'audio/mpeg',
            conditions: [{ type: 'start_time', value: '22:00' }],
        },
    ],
});

const rawPlaylist = (trackOverrides: Record<string, unknown> = {}): RawArweavePlaylist => ({
    name: 'Test Playlist',
    image: 'https://example.com/playlist.jpg',
    creator: '0xCreator',
    tracks: [{
        chain_name: 'ethereum',
        token_address: '0xabc',
        token_id: '1',
        platform: 'sound',
        metadata: metadataWithMixes,
        ...trackOverrides,
    }],
});

const parsedTrack = async (): Promise<PlaylistTrack> => {
    const parser = new PlaylistParser();
    const playlist = await parser.parse(rawPlaylist());
    return playlist.tracks[0];
};

// ─── Condition extraction (numeric/boolean values) ──────────────────────

describe('getTrackExtras conditions', () => {
    it('should coerce numeric condition values to strings instead of dropping them', () => {
        const extras = getTrackExtras({
            mixes: [
                { name: 'Bonus', uri: 'https://example.com/b.mp3', conditions: [{ type: 'min_plays', value: 10 }] },
            ],
        });

        expect(extras.mixes).toHaveLength(1);
        expect(extras.mixes![0].conditions).toEqual([{ type: 'min_plays', value: '10' }]);
    });

    it('should coerce boolean condition values to strings', () => {
        const extras = getTrackExtras({
            mixes: [
                { name: 'Fans Only', conditions: [{ type: 'favorite', value: true }] },
            ],
        });

        expect(extras.mixes![0].conditions).toEqual([{ type: 'favorite', value: 'true' }]);
    });

    it('should still drop conditions with object values', () => {
        const extras = getTrackExtras({
            mixes: [
                { name: 'Broken', conditions: [{ type: 'weird', value: { nested: true } }] },
            ],
        });

        expect(extras.mixes![0].conditions).toEqual([]);
    });
});

// ─── findMixByName ───────────────────────────────────────────────────────

describe('findMixByName', () => {
    it('should match names case-insensitively and ignoring surrounding whitespace', async () => {
        const track = await parsedTrack();

        expect(findMixByName(track.extras?.mixes, 'instrumental')?.uri).toBe('https://example.com/instr.mp3');
        expect(findMixByName(track.extras?.mixes, ' Instrumental ')?.uri).toBe('https://example.com/instr.mp3');
    });

    it('should prefer the lossy master of a same-named pair by default', async () => {
        const track = await parsedTrack();
        const mix = findMixByName(track.extras?.mixes, 'Instrumental');

        expect(mix?.mime_type).toBe('audio/mpeg');
    });

    it('should return the lossless master when prefer is lossless', async () => {
        const track = await parsedTrack();
        const mix = findMixByName(track.extras?.mixes, 'Instrumental', { prefer: 'lossless' });

        expect(mix?.mime_type).toBe('audio/wav');
    });

    it('should support exact case-sensitive matching', async () => {
        const track = await parsedTrack();

        expect(findMixByName(track.extras?.mixes, 'instrumental', { caseInsensitive: false })).toBeNull();
        expect(findMixByName(track.extras?.mixes, 'Instrumental', { caseInsensitive: false })).not.toBeNull();
    });

    it('should return null for unknown names and missing mixes', async () => {
        const track = await parsedTrack();

        expect(findMixByName(track.extras?.mixes, 'Radio Edit')).toBeNull();
        expect(findMixByName(undefined, 'Instrumental')).toBeNull();
        expect(findMixByName(track.extras?.mixes, '')).toBeNull();
    });

    it('should match alias spellings onto the canonical concept', async () => {
        const acapellaMixes: MixInfo[] = [
            { name: 'Acapella', uri: 'a.mp3', mime_type: 'audio/mpeg', conditions: [] },
            { name: 'A Cappella', uri: 'a.wav', mime_type: 'audio/wav', conditions: [] },
        ];

        expect(findMixByName(acapellaMixes, 'aca')?.uri).toBe('a.mp3');
        expect(findMixByName(acapellaMixes, 'ACAP')?.uri).toBe('a.mp3');
        expect(findMixByName(acapellaMixes, 'vox')?.uri).toBe('a.mp3');
        expect(findMixByName([{ name: 'Vocals Only', uri: 'v.mp3', conditions: [] }], 'vocals')?.uri).toBe('v.mp3');
        expect(findMixByName([{ name: 'No Vocals', uri: 'n.mp3', conditions: [] }], 'instrumental')?.uri).toBe('n.mp3');
        expect(findMixByName([{ name: 'Club RMX', uri: 'r.mp3', conditions: [] }], 'remix')?.uri).toBe('r.mp3');
    });

    it('should treat karaoke as its own concept with tv-mix aliases', () => {
        expect(findMixByName([{ name: 'Karaoke', uri: 'k.mp3', conditions: [] }], 'karaoke')?.uri).toBe('k.mp3');
        expect(findMixByName([{ name: 'Karaoke', uri: 'k.mp3', conditions: [] }], 'KARAOKE')?.uri).toBe('k.mp3');
        expect(findMixByName([{ name: 'Karaoke', uri: 'k.mp3', conditions: [] }], 'TV Mix')?.uri).toBe('k.mp3');
        expect(findMixByName([{ name: 'TV Mix', uri: 'k.mp3', conditions: [] }], 'karaoke')?.uri).toBe('k.mp3');
        expect(findMixByName([{ name: 'TV Mix', uri: 'k.mp3', conditions: [] }], 'tvmix')?.uri).toBe('k.mp3');
    });

    it('should match every karaoke/tv-mix spelling, as query and as mix name', () => {
        const spellings = [
            'karaoke', 'Karaoke', 'KARAOKE', 'Karaoke Version', 'Karaoke Mix', 'karoake',
            'tv mix', 'TV mix', 'TV Mix', 'tvmix', 'TVMix', 'tv-mix', 'tv', 'TV', 'tv version', 'TV Version',
        ];
        const karaokeMix: MixInfo[] = [{ name: 'Karaoke', uri: 'k.mp3', conditions: [] }];

        for (const spelling of spellings) {
            expect(findMixByName(karaokeMix, spelling)?.uri, `query "${spelling}"`).toBe('k.mp3');
            expect(
                findMixByName([{ name: spelling, uri: 'k.mp3', conditions: [] }], 'karaoke')?.uri,
                `name "${spelling}"`
            ).toBe('k.mp3');
        }
    });

    it('should never match karaoke mixes as instrumentals or vice versa', () => {
        const karaoke: MixInfo[] = [{ name: 'Karaoke Version', uri: 'k.mp3', conditions: [] }];
        const instrumental: MixInfo[] = [{ name: 'Instrumental', uri: 'i.mp3', conditions: [] }];

        expect(findMixByName(karaoke, 'inst')).toBeNull();
        expect(findMixByName(karaoke, 'instrumental')).toBeNull();
        expect(findMixByName(karaoke, 'no vocals')).toBeNull();
        expect(findMixByName(instrumental, 'karaoke')).toBeNull();
        expect(findMixByName(instrumental, 'tv mix')).toBeNull();
    });

    it('should match a concept query against names that contain it', () => {
        const mixes: MixInfo[] = [{ name: 'Instrumental Version', uri: 'i.mp3', conditions: [] }];

        expect(findMixByName(mixes, 'instrumental')?.uri).toBe('i.mp3');
        expect(findMixByName(mixes, 'inst')?.uri).toBe('i.mp3');
    });

    it('should not match unrelated names that merely look similar', () => {
        const mixes: MixInfo[] = [{ name: 'Industrial Mix', uri: 'x.mp3', conditions: [] }];

        expect(findMixByName(mixes, 'instrumental')).toBeNull();
        expect(findMixByName(mixes, 'inst')).toBeNull();
    });

    it('should disable alias matching with aliases: false', async () => {
        const track = await parsedTrack();

        expect(findMixByName(track.extras?.mixes, 'inst')?.uri).toBe('https://example.com/instr.mp3');
        expect(findMixByName(track.extras?.mixes, 'inst', { aliases: false })).toBeNull();
        expect(findMixByName(track.extras?.mixes, 'Instrumental', { aliases: false })?.uri).toBe('https://example.com/instr.mp3');
    });
});

// ─── getPreferredMixByQuality ────────────────────────────────────────────

describe('getPreferredMixByQuality', () => {
    const lossy: MixInfo = { name: 'X', uri: 'x.mp3', mime_type: 'audio/mpeg', conditions: [] };
    const wav: MixInfo = { name: 'X', uri: 'x.wav', mime_type: 'audio/x-wav', conditions: [] };
    const flac: MixInfo = { name: 'X', uri: 'x.flac', mime_type: 'audio/flac', conditions: [] };

    it('should prefer mp3 in lossy mode, folding mime aliases', () => {
        expect(getPreferredMixByQuality([wav, flac, lossy], 'lossy')?.uri).toBe('x.mp3');
    });

    it('should prefer wav over flac in lossless mode, treating audio/x-wav as wav', () => {
        expect(getPreferredMixByQuality([flac, lossy, wav], 'lossless')?.uri).toBe('x.wav');
        expect(getPreferredMixByQuality([lossy, flac], 'lossless')?.uri).toBe('x.flac');
    });

    it('should fall back to the first mix when no mime is recognized', () => {
        const ogg: MixInfo = { name: 'X', uri: 'x.ogg', mime_type: 'audio/ogg', conditions: [] };
        const aac: MixInfo = { name: 'X', uri: 'x.aac', mime_type: 'audio/aac', conditions: [] };
        expect(getPreferredMixByQuality([ogg, aac], 'lossless')?.uri).toBe('x.ogg');
    });

    it('should return the single mix or null for empty input', () => {
        expect(getPreferredMixByQuality([lossy])?.uri).toBe('x.mp3');
        expect(getPreferredMixByQuality([])).toBeNull();
        expect(getPreferredMixByQuality(null)).toBeNull();
    });
});

// ─── getUniqueMixes ──────────────────────────────────────────────────────

describe('getUniqueMixes', () => {
    it('should group same-named mixes, ignoring case and whitespace in the key', () => {
        const mixes: MixInfo[] = [
            { name: 'Instrumental', uri: 'i.mp3', conditions: [] },
            { name: 'instrumental ', uri: 'i.wav', conditions: [] },
            { name: 'Night Mix', uri: 'n.mp3', conditions: [] },
        ];

        const groups = getUniqueMixes(mixes);

        expect(groups).toHaveLength(2);
        expect(groups[0].name).toBe('Instrumental');
        expect(groups[0].mixes).toHaveLength(2);
        expect(groups[1].name).toBe('Night Mix');
    });

    it('should return empty for missing input', () => {
        expect(getUniqueMixes(null)).toEqual([]);
        expect(getUniqueMixes([])).toEqual([]);
    });
});

// ─── resolveMixUrl ───────────────────────────────────────────────────────

describe('resolveMixUrl', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should return the uri unchanged when resolution is disabled', async () => {
        const url = await resolveMixUrl(
            { name: 'X', uri: 'https://example.com/x.mp3', conditions: [] },
            { resolveUrl: false }
        );

        expect(url).toBe('https://example.com/x.mp3');
    });

    it('should return null when the mix has no uri', async () => {
        expect(await resolveMixUrl({ name: 'X', conditions: [] }, { resolveUrl: false })).toBeNull();
        expect(await resolveMixUrl(null)).toBeNull();
    });

    it('should follow a metadata-JSON indirection to the audio url it names', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            text: async () => JSON.stringify({ mp3_url: 'https://example.com/real-song.mp3' }),
        }));
        vi.stubGlobal('fetch', fetchMock);

        const url = await resolveMixUrl(
            { name: 'Alt Outro', uri: 'https://example.com/outro.json', mime_type: 'application/json', conditions: [] },
            { resolveUrl: false }
        );

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(url).toBe('https://example.com/real-song.mp3');
    });

    it('should detect metadata-JSON by .json extension when no mime_type is set', async () => {
        const fetchMock = vi.fn(async () => ({
            ok: true,
            text: async () => JSON.stringify({ audio_url: 'https://example.com/song.flac' }),
        }));
        vi.stubGlobal('fetch', fetchMock);

        const url = await resolveMixUrl(
            { name: 'Alt', uri: 'https://example.com/alt.json', conditions: [] },
            { resolveUrl: false }
        );

        expect(url).toBe('https://example.com/song.flac');
    });

    it('should skip the indirection when followMetadata is false', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const url = await resolveMixUrl(
            { name: 'Alt', uri: 'https://example.com/alt.json', mime_type: 'application/json', conditions: [] },
            { resolveUrl: false, followMetadata: false }
        );

        expect(fetchMock).not.toHaveBeenCalled();
        expect(url).toBe('https://example.com/alt.json');
    });
});

// ─── selectMix ───────────────────────────────────────────────────────────

describe('selectMix', () => {
    it('should swap the audio URLs to the chosen mix and record the selection', async () => {
        const track = await parsedTrack();
        const mixed = await selectMix(track, 'instrumental', { resolveUrl: false });

        expect(mixed).not.toBeNull();
        expect(mixed!.selected_mix).toBe('Instrumental');
        expect(mixed!.audio_url).toBe('https://example.com/instr.mp3');
        expect(mixed!.audio_url_lossless).toBe('https://example.com/instr.wav');
        // The input track is never mutated
        expect(track.audio_url).toBe('https://example.com/track1.mp3');
        expect(track.selected_mix).toBeUndefined();
    });

    it('should prefer the lossless master when asked', async () => {
        const track = await parsedTrack();
        const mixed = await selectMix(track, 'Instrumental', { resolveUrl: false, prefer: 'lossless' });

        expect(mixed!.audio_url).toBe('https://example.com/instr.wav');
        expect(mixed!.audio_url_lossless).toBeUndefined();
    });

    it('should return null when no mix matches or the track has no extras', async () => {
        const track = await parsedTrack();

        expect(await selectMix(track, 'Radio Edit', { resolveUrl: false })).toBeNull();
        expect(await selectMix({ ...track, extras: undefined }, 'Instrumental', { resolveUrl: false })).toBeNull();
    });

    it('should find mixes through alias spellings', async () => {
        const track = await parsedTrack();
        const mixed = await selectMix(track, 'inst', { resolveUrl: false });

        expect(mixed!.selected_mix).toBe('Instrumental');
        expect(mixed!.audio_url).toBe('https://example.com/instr.mp3');

        const strict = await selectMix(track, 'inst', { resolveUrl: false, aliases: false });
        expect(strict).toBeNull();
    });

    it('should return null when the mix conditions are unmet under the given context', async () => {
        const track = await parsedTrack();

        const unavailable = await selectMix(track, 'Night Mix', {
            resolveUrl: false,
            conditionsContext: { appState: {} },
        });
        expect(unavailable).toBeNull();

        // After 22:00 the Night Mix passes — evaluate against a fake clock-free
        // condition instead: weight always passes.
        const weightTrack = await parsedTrack();
        weightTrack.extras!.mixes!.push({
            name: 'Weighted', uri: 'https://example.com/w.mp3', mime_type: 'audio/mpeg',
            conditions: [{ type: 'weight', value: '3' }],
        });
        const available = await selectMix(weightTrack, 'Weighted', {
            resolveUrl: false,
            conditionsContext: { appState: {} },
        });
        expect(available!.audio_url).toBe('https://example.com/w.mp3');
    });
});

// ─── Playlist-level extraction ───────────────────────────────────────────

describe('getMixes', () => {
    it('should flatten mixes across tracks from parsed playlists', async () => {
        const parser = new PlaylistParser();
        const playlist = await parser.parse(rawPlaylist());

        const mixes = getMixes(playlist);

        expect(mixes).toHaveLength(3);
        expect(mixes.map(m => m.name)).toEqual(['Instrumental', 'Instrumental', 'Night Mix']);
    });

    it('should work on raw playlists', () => {
        const mixes = getMixes(rawPlaylist());
        expect(mixes).toHaveLength(3);
    });
});

describe('getMixTracks', () => {
    it('should list tracks with mixes and their pin from parsed playlists', async () => {
        const parser = new PlaylistParser();
        const playlist = await parser.parse(rawPlaylist({ selected_mix: 'Instrumental' }));

        const [entry] = getMixTracks(playlist);

        expect(entry.title).toBe('Track 1');
        expect(entry.selected_mix).toBe('Instrumental');
        expect(entry.audio_url).toBe('https://example.com/instr.mp3');
        expect(entry.audio_url_lossless).toBe('https://example.com/instr.wav');
        expect(entry.mixes).toHaveLength(3);
    });

    it('should apply the entry pin to raw playlists the way the parser would', () => {
        const [entry] = getMixTracks(rawPlaylist({ selected_mix: 'Instrumental' }));

        expect(entry.selected_mix).toBe('Instrumental');
        expect(entry.audio_url).toBe('https://example.com/instr.mp3');
        expect(entry.audio_url_lossless).toBe('https://example.com/instr.wav');
    });

    it('should not apply a pin whose casing differs — pin matching stays exact', () => {
        const [entry] = getMixTracks(rawPlaylist({ selected_mix: 'instrumental' }));

        expect(entry.selected_mix).toBeUndefined();
        expect(entry.audio_url).toBe('https://example.com/track1.mp3');
    });

    it('should drop the legacy default placeholder and unmatched pins on raw input', () => {
        const defaulted = getMixTracks(rawPlaylist({ selected_mix: 'default' }));
        expect(defaulted[0].selected_mix).toBeUndefined();
        expect(defaulted[0].audio_url).toBe('https://example.com/track1.mp3');

        const unmatched = getMixTracks(rawPlaylist({ selected_mix: 'Radio Edit' }));
        expect(unmatched[0].selected_mix).toBeUndefined();
        expect(unmatched[0].audio_url).toBe('https://example.com/track1.mp3');
    });

    it('should skip tracks without mixes', () => {
        const playlist = rawPlaylist();
        playlist.tracks[0].metadata = JSON.stringify({ name: 'Plain', artist: 'A', mp3_url: 'https://example.com/p.mp3' });

        expect(getMixTracks(playlist)).toEqual([]);
    });
});

describe('getTracks / getFullTracks raw-input parity', () => {
    it('should repoint raw-track audio at the pinned mix in getTracks', () => {
        const tracks = getTracks(rawPlaylist({ selected_mix: 'Instrumental' }));

        expect(tracks[0].audio_url).toBe('https://example.com/instr.mp3');
        expect(tracks[0].audio_url_lossless).toBe('https://example.com/instr.wav');
        expect(tracks[0].selected_mix).toBe('Instrumental');
    });

    it('should keep primary audio when no pin is present', () => {
        const tracks = getTracks(rawPlaylist());

        expect(tracks[0].audio_url).toBe('https://example.com/track1.mp3');
        expect(tracks[0].selected_mix).toBeUndefined();
    });

    it('should carry extras and the pin on raw input in getFullTracks', () => {
        const tracks = getFullTracks(rawPlaylist({ selected_mix: 'Instrumental' })) as Array<Record<string, any>>;

        expect(tracks[0].audio_url).toBe('https://example.com/instr.mp3');
        expect(tracks[0].selected_mix).toBe('Instrumental');
        expect(tracks[0].extras?.mixes).toHaveLength(3);
    });
});

// ─── Validation schemas ──────────────────────────────────────────────────

describe('MixInfoSchema', () => {
    it('should accept a valid mix', () => {
        const result = MixInfoSchema.safeParse({
            name: 'Instrumental',
            uri: 'https://example.com/i.mp3',
            mime_type: 'audio/mpeg',
            conditions: [{ type: 'min_plays', value: '5' }],
        });

        expect(result.success).toBe(true);
    });

    it('should reject a numeric condition value, matching the wire spec', () => {
        const result = MixInfoSchema.safeParse({
            name: 'Instrumental',
            conditions: [{ type: 'min_plays', value: 5 }],
        });

        expect(result.success).toBe(false);
    });

    it('should accept a minimal mix with only a name', () => {
        const result = MixInfoSchema.safeParse({ name: 'X', conditions: [] });
        expect(result.success).toBe(true);
    });
});
